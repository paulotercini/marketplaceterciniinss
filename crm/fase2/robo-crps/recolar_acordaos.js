#!/usr/bin/env node
// Religa os acórdãos guardados às fichas, sem baixar nada de novo.
//
// POR QUE EXISTE. A tela do CRM passou a aplicar a coleta do e-Recursos e,
// numa versão, ela reescrevia o bloco do recurso INTEIRO com o que a consulta
// tinha trazido. O portal devolve a lista de movimentos e mais nada: o
// caminho do PDF guardado (`storage`) e o resumo lido dele não vêm de lá.
// Resultado: 47 recursos ficaram só com a linha do tempo.
//
// O ARQUIVO NÃO SE PERDEU. Ele continua no balde do Supabase, e o caminho é
// previsível — `crps/<nup>/<marca>_<nome>.pdf`, escrito assim pelo ingerir.js.
// Então dá para reencontrar cada PDF listando o balde e recolá-lo ao evento a
// que pertence, pela mesma marca (o id do arquivo no e-Recursos) que os dois
// lados sempre usaram.
//
// O QUE ELE NÃO FAZ: não devolve o resumo. Esse morava no bloco e se foi.
// Depois de recolar, `node resumir.js` lê os PDFs de novo e reescreve os
// automáticos; os escritos à mão voltam com `aplicar_resumos.js`, se você
// ainda tiver o JSON deles.
//
// Uso:
//   node recolar_acordaos.js             → SECO: mostra o que religaria
//   node recolar_acordaos.js --aplicar   → grava

const fs = require('fs');
const path = require('path');

for (const linha of (fs.existsSync(path.join(__dirname, '.env'))
    ? fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n') : [])) {
  const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const BASE = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const CHAVE = process.env.SUPABASE_SERVICE_KEY || '';
const BALDE = process.env.BUCKET || 'anexos';

async function sb(caminho, opts = {}) {
  const r = await fetch(BASE + caminho, { ...opts,
    headers: { apikey: CHAVE, Authorization: `Bearer ${CHAVE}`,
      'Content-Type': 'application/json', ...(opts.headers || {}) } });
  if (!r.ok) throw new Error(`${opts.method || 'GET'} ${caminho} -> ${r.status} ${await r.text()}`);
  const t = await r.text(); return t ? JSON.parse(t) : null;
}

const soDig = x => String(x || '').replace(/\D/g, '');

// o que está guardado para um processo, marca -> { caminho, bytes }
async function guardadosDoNup(nup) {
  const itens = await sb(`/storage/v1/object/list/${BALDE}`, {
    method: 'POST',
    body: JSON.stringify({ prefix: `crps/${nup}`, limit: 200,
                           sortBy: { column: 'name', order: 'asc' } }),
  }) || [];
  const mapa = new Map();
  for (const it of itens) {
    if (!it.name || it.name.endsWith('/')) continue;      // pasta, não arquivo
    // o ingerir.js grava `<marca>_<nome seguro>`: a marca é o que vem antes
    // do primeiro sublinhado, e é o id do arquivo lá no e-Recursos
    const marca = it.name.split('_')[0];
    if (!marca) continue;
    mapa.set(marca, { caminho: `crps/${nup}/${it.name}`,
                      bytes: (it.metadata && it.metadata.size) || null });
  }
  return mapa;
}

async function main() {
  const aplicar = process.argv.includes('--aplicar');
  if (!BASE || !CHAVE) {
    console.error('faltam SUPABASE_URL e SUPABASE_SERVICE_KEY no .env'); process.exit(1);
  }

  const casos = await sb('/rest/v1/casos?select=id,titulo,crps&crps=not.is.null');
  let religados = 0, semArquivo = 0, jaTinham = 0;
  const mudados = [];

  for (const k of casos) {
    const blocos = Array.isArray(k.crps) ? k.crps : (k.crps ? [k.crps] : []);
    let n = 0;
    for (const bloco of blocos) {
      const nup = soDig(bloco.nup);
      if (!nup) continue;
      // só vale a pena listar o balde se falta algum caminho neste processo
      const faltando = (bloco.eventos || []).some(e =>
        (e.arquivos || []).some(a => !a.storage));
      if (!faltando) continue;

      const guardados = await guardadosDoNup(nup);
      if (!guardados.size) continue;

      for (const e of (bloco.eventos || []))
        for (const a of (e.arquivos || [])) {
          if (a.storage) { jaTinham++; continue; }
          const g = guardados.get(String(a.id || a.nome));
          if (!g) { semArquivo++; continue; }
          a.storage = g.caminho;
          if (g.bytes) a.bytes = g.bytes;
          religados++; n++;
        }
    }
    if (n) mudados.push({ k, n });
  }

  for (const { k, n } of mudados)
    console.log(`  ${k.titulo || k.id}: ${n} acórdão(s) religado(s)`);

  console.log(`\n${religados} arquivo(s) para religar em ${mudados.length} caso(s)`
    + ` · ${jaTinham} já tinham caminho · ${semArquivo} sem cópia no balde`);

  if (!aplicar) {
    console.log('\nSECO — nada foi gravado. Para valer:  node recolar_acordaos.js --aplicar');
    return;
  }
  for (const { k } of mudados)
    await sb(`/rest/v1/casos?id=eq.${k.id}`, { method: 'PATCH',
      headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ crps: k.crps }) });
  console.log(`\n✔ ${mudados.length} ficha(s) atualizada(s).`);
  console.log('Agora os resumos:  node resumir.js        (seco)');
  console.log('                   node resumir.js --aplicar');
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });
module.exports = { guardadosDoNup };
