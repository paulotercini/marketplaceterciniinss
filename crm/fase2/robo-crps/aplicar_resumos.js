#!/usr/bin/env node
// Grava nas fichas os resumos escritos à mão (pelo Claude da conversa, ou
// por você) a partir de um arquivo JSON.
//
// Formato do arquivo (resumos_claude.json):
//   [ { "id": "44234156897202017|73189593",
//       "linhas": ["Reformou em parte a decisão do INSS (recurso provido em parte)",
//                  "Reconheceu como especiais os períodos de 01/01/2000 a 10/03/2002"] } ]
//
// O "id" é o mesmo #ID que aparece no acordaos_N.txt exportado.
//
// Uso:
//   node aplicar_resumos.js resumos_claude.json            → SECO: só confere
//   node aplicar_resumos.js resumos_claude.json --aplicar   → grava

const fs = require('fs');
const path = require('path');
const { alvos, validarResumo, aplicarResumo } = require('./resumir.js');

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
  const arq = process.argv[2];
  const aplicar = process.argv.includes('--aplicar');
  if (!arq || !fs.existsSync(arq)) { console.log('Uso: node aplicar_resumos.js resumos_claude.json [--aplicar]'); process.exit(1); }
  if (!BASE || !CHAVE) { console.error('faltam SUPABASE_URL e SUPABASE_SERVICE_KEY no .env'); process.exit(1); }

  const lista = JSON.parse(fs.readFileSync(arq, 'utf8'));
  const casos = await sb('/rest/v1/casos?select=id,crps&crps=not.is.null');
  const porChave = new Map();
  for (const a of alvos(casos, { refazer: true }))
    porChave.set(`${String(a.nup).replace(/\D/g, '')}|${a.marca}`, a);

  let ok = 0, ruins = 0, semDono = 0;
  const porCaso = new Map(), casoPorId = new Map(casos.map(k => [k.id, k]));

  for (const item of lista) {
    const chave = String(item.id || '').replace(/\s/g, '');
    const [nup, marca] = chave.split('|');
    const alvo = porChave.get(`${String(nup).replace(/\D/g, '')}|${marca}`);
    if (!alvo) { console.log(`  ⚠ ${chave}: não achei este acórdão nas fichas`); semDono++; continue; }
    // mesma barreira dos motores automáticos: verbo, tamanho, e nada de saúde
    const v = validarResumo({ conseguiu: true, linhas: item.linhas || [], motivo: '' });
    if (!v.ok) { console.log(`  ⚠ ${chave}: ${v.motivo}`); ruins++; continue; }
    ok++;
    if (aplicar) {
      const k = casoPorId.get(alvo.casoId);
      if (!porCaso.has(k.id)) porCaso.set(k.id, k.crps);
      aplicarResumo(porCaso.get(k.id), alvo.nup, alvo.marca,
        { linhas: v.linhas, origem: 'auto', motor: 'leitura', gerado_em: new Date().toISOString() });
    }
  }

  console.log(`\n${ok} resumo(s) válidos, ${ruins} recusados, ${semDono} sem dono.`);
  if (!aplicar) return console.log('Modo SECO. Para gravar:  node aplicar_resumos.js ' + arq + ' --aplicar');
  for (const [casoId, crps] of porCaso)
    await sb(`/rest/v1/casos?id=eq.${casoId}`, { method: 'PATCH',
      headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ crps }) });
  console.log(`✔ gravados em ${porCaso.size} caso(s). Recarregue o CRM.`);
}

if (require.main === module) main().catch(e => { console.error('falhou:', e.message); process.exitCode = 1; });
