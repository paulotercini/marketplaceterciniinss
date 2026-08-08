#!/usr/bin/env node
// Mostra o TEXTO REAL do fim de alguns acórdãos, para calibrar as regras.
//
// Por que existe: as regras de leitura foram escritas contra um acórdão que
// eu inventei, e a primeira rodada de verdade mostrou que a redação real é
// outra — nenhum período reconhecido apareceu em 63 resumos. Calibrar sem
// ver o texto é chutar duas vezes.
//
// Uso:  node diagnostico_acordao.js [quantos]     (padrão: 6)
//   → escreve dispositivos_para_calibrar.txt
//
// ⚠ O arquivo tem trecho de acórdão, com nome de segurado. Confira antes de
//   mandar para alguém, e apague depois. Ele não vai para o git.

const fs = require('fs');
const path = require('path');
const { alvos, textoDoPDF } = require('./resumir.js');
const { dispositivo } = require('./regras_acordao.js');

for (const linha of (fs.existsSync(path.join(__dirname, '.env'))
    ? fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n') : [])) {
  const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const BASE = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const CHAVE = process.env.SUPABASE_SERVICE_KEY || '';
const BALDE = process.env.BUCKET || 'anexos';

async function sb(caminho) {
  const r = await fetch(BASE + caminho,
    { headers: { apikey: CHAVE, Authorization: `Bearer ${CHAVE}` } });
  if (!r.ok) throw new Error(`${caminho} -> ${r.status}`);
  return JSON.parse(await r.text());
}
async function baixarPDF(caminho) {
  const r = await fetch(`${BASE}/storage/v1/object/${BALDE}/${caminho}`,
    { headers: { apikey: CHAVE, Authorization: `Bearer ${CHAVE}` } });
  if (!r.ok) throw new Error(`storage ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function main() {
  if (!BASE || !CHAVE) { console.error('faltam SUPABASE_URL e SUPABASE_SERVICE_KEY no .env'); process.exit(1); }
  const quantos = Number(process.argv[2] || 6);
  const casos = await sb('/rest/v1/casos?select=id,crps&crps=not.is.null');
  const fila = alvos(casos, { refazer: true });

  // escolhe variado: uns providos, uns negados, uns parciais — é onde as
  // redações mudam. Sem variedade, calibro para um tipo só.
  const porTipo = new Map();
  for (const a of fila) {
    const t = /EM PARTE|parcial/i.test(a.resultado) ? 'parcial'
      : /PROVIDO|provido/i.test(a.resultado) ? 'provido'
      : /negad|improv/i.test(a.resultado) ? 'negado' : 'outro';
    if (!porTipo.has(t)) porTipo.set(t, []);
    porTipo.get(t).push(a);
  }
  const escolhidos = [];
  for (let i = 0; escolhidos.length < quantos && i < 20; i++)
    for (const lista of porTipo.values()) if (lista[i] && escolhidos.length < quantos) escolhidos.push(lista[i]);

  const saida = [];
  for (const [i, a] of escolhidos.entries()) {
    process.stdout.write(`${i + 1}/${escolhidos.length}  ${a.nome.slice(0, 45)} ... `);
    try {
      const texto = (await textoDoPDF(await baixarPDF(a.storage))).replace(/\s+/g, ' ');
      const disp = dispositivo(texto);
      saida.push(`\n${'='.repeat(70)}\n### ${a.nome}\nO e-Recursos diz: ${a.resultado}`
        + `\nPáginas de texto: ${texto.length} caracteres`
        + `\n\n--- o que a regra achou como DISPOSITIVO ---\n${disp || '(nada — não achou abertura)'}`
        + `\n\n--- os últimos 2000 caracteres do PDF ---\n${texto.slice(-2000)}`);
      console.log('ok');
    } catch (e) { console.log(`falhou (${e.message})`); }
  }
  const arq = path.join(__dirname, 'dispositivos_para_calibrar.txt');
  fs.writeFileSync(arq, saida.join('\n') + '\n');
  console.log(`\nEscrevi em  dispositivos_para_calibrar.txt`);
  console.log('⚠ Tem trecho de acórdão com nome de segurado — confira antes de mandar, e apague depois.');
}

if (require.main === module) main().catch(e => { console.error('falhou:', e.message); process.exit(1); });
