#!/usr/bin/env node
// Reetiqueta os andamentos do CRPS já gravados nas fichas, sem coletar nada
// de novo no e-Recursos.
//
// Serve para quando uma REGRA do traduzir.js é corrigida: o texto cru do
// e-Recursos continua guardado em cada evento (campo `bruto`), então dá para
// recalcular só o rótulo. Os arquivos, o storage e os resumos dos acórdãos
// não são tocados.
//
// Uso:
//   node recolar_rotulos.js             → SECO: mostra o que mudaria
//   node recolar_rotulos.js --aplicar   → grava

const fs = require('fs');
const path = require('path');
const T = require('./traduzir.js');

for (const linha of (fs.existsSync(path.join(__dirname, '.env'))
    ? fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n') : [])) {
  const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const BASE = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const CHAVE = process.env.SUPABASE_SERVICE_KEY || '';

async function sb(caminho, opts = {}) {
  const r = await fetch(BASE + caminho, { ...opts,
    headers: { apikey: CHAVE, Authorization: `Bearer ${CHAVE}`,
      'Content-Type': 'application/json', ...(opts.headers || {}) } });
  if (!r.ok) throw new Error(`${opts.method || 'GET'} ${caminho} -> ${r.status} ${await r.text()}`);
  const t = await r.text(); return t ? JSON.parse(t) : null;
}

async function main() {
  const aplicar = process.argv.includes('--aplicar');
  if (!BASE || !CHAVE) { console.error('faltam SUPABASE_URL e SUPABASE_SERVICE_KEY no .env'); process.exit(1); }

  // a coluna do caso é `titulo` — não existe `nome` em casos (esse é o cliente)
  const casos = await sb('/rest/v1/casos?select=id,titulo,crps&crps=not.is.null');
  const mudados = [];

  for (const k of casos) {
    let n = 0;
    for (const bloco of (k.crps || [])) {
      const antes = (bloco.eventos || []).map(e => `${e.icone} ${e.resumo}`);
      const q = T.rerotular(bloco);
      if (!q) continue;
      n += q;
      (bloco.eventos || []).forEach((e, i) => {
        const agora = `${e.icone} ${e.resumo}`;
        if (antes[i] !== agora)
          console.log(`  ${k.titulo || k.id} — ${bloco.nup}\n    era:  ${antes[i]}\n    fica: ${agora}`);
      });
    }
    if (n) mudados.push(k);
  }

  console.log(`\n${mudados.length} caso(s) com rótulo a corrigir, de ${casos.length} com recurso.`);
  if (!mudados.length) return;
  if (!aplicar) return console.log('Modo SECO. Para gravar:  node recolar_rotulos.js --aplicar');

  for (const k of mudados)
    await sb(`/rest/v1/casos?id=eq.${k.id}`, { method: 'PATCH',
      headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ crps: k.crps }) });
  console.log(`✔ gravado em ${mudados.length} caso(s). Recarregue o CRM.`);
}

if (require.main === module) main().catch(e => { console.error('falhou:', e.message); process.exitCode = 1; });
