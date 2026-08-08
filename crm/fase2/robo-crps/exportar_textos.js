#!/usr/bin/env node
// Extrai o TEXTO dos acórdãos guardados e escreve em arquivos de leitura,
// para o Claude desta conversa ler e escrever os resumos à mão.
//
// Por que existe: o que a regra não alcança são os PERÍODOS RECONHECIDOS —
// eles moram na fundamentação, em prosa longa, não no dispositivo. Ler prosa
// é trabalho de quem lê prosa. A API cobraria por isso; a conversa não.
//
// Uso:  node exportar_textos.js
//   → acordaos_1.txt, acordaos_2.txt, ... (uns 250 mil caracteres cada)
//
// ⚠ Os arquivos têm o inteiro teor dos acórdãos: nome do segurado, CPF e
//   dado de saúde. Eles não vão para o git. Apague depois de usar.

const fs = require('fs');
const path = require('path');
const { alvos, textoDoPDF } = require('./resumir.js');

for (const linha of (fs.existsSync(path.join(__dirname, '.env'))
    ? fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n') : [])) {
  const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const BASE = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const CHAVE = process.env.SUPABASE_SERVICE_KEY || '';
const BALDE = process.env.BUCKET || 'anexos';
const LOTE = Number(process.env.CRPS_LOTE || 250000);

async function sb(caminho) {
  const r = await fetch(BASE + caminho, { headers: { apikey: CHAVE, Authorization: `Bearer ${CHAVE}` } });
  if (!r.ok) throw new Error(`${caminho} -> ${r.status}`);
  return JSON.parse(await r.text());
}
async function baixarPDF(caminho) {
  const r = await fetch(`${BASE}/storage/v1/object/${BALDE}/${caminho}`,
    { headers: { apikey: CHAVE, Authorization: `Bearer ${CHAVE}` } });
  if (!r.ok) throw new Error(`storage ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

// O PDF do CRPS carrega meia página de lixo por página: hash de assinatura,
// "Assinatura digital do presidente", numeração. Sem limpar, dois terços do
// arquivo são ruído e sobra menos espaço para o que interessa.
function limpar(texto) {
  return String(texto || '')
    .replace(/\s+/g, ' ')
    .replace(/\b[0-9A-F]{40,}\b/g, ' ')                       // hashes
    .replace(/Assinatura (do documento|digital do\(a\)? \w+)\s*:?/gi, ' ')
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, ' ')
    .replace(/Página:\s*\d+/gi, ' ')
    .replace(/Conselheiro\(a\)\s+(Titular|Suplente)\s+Representante[^.]{0,60}/gi, ' ')
    .replace(/Declaração de Voto (Conselheiro\(a\)|Presidente) concorda com o voto do\(a\) Relator\(a\)\.?/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function main() {
  if (!BASE || !CHAVE) { console.error('faltam SUPABASE_URL e SUPABASE_SERVICE_KEY no .env'); process.exit(1); }
  const casos = await sb('/rest/v1/casos?select=id,cliente_id,crps&crps=not.is.null');
  const clientes = await sb('/rest/v1/clientes?select=id,nome').catch(() => []);
  const nomePorId = new Map((clientes || []).map(c => [c.id, c.nome]));
  const casoPorId = new Map(casos.map(k => [k.id, k]));
  const fila = alvos(casos, { refazer: true });
  console.log(`${fila.length} acórdão(s) para exportar.\n`);

  const pedacos = [];
  for (const [i, a] of fila.entries()) {
    const k = casoPorId.get(a.casoId);
    const nome = nomePorId.get(k && k.cliente_id) || '(sem nome)';
    process.stdout.write(`${i + 1}/${fila.length}  ${nome.slice(0, 30)} ... `);
    try {
      const texto = limpar(await textoDoPDF(await baixarPDF(a.storage)));
      // a chave é o que o aplicador usa para achar o arquivo de volta
      pedacos.push(`\n${'='.repeat(70)}\n#ID ${a.nup}|${a.marca}\n`
        + `CLIENTE: ${nome}\nDATA: ${a.data.slice(0, 10)}\n`
        + `O e-RECURSOS DIZ: ${a.resultado}\n\n${texto}\n`);
      console.log(`ok (${Math.round(texto.length / 1000)} mil caracteres)`);
    } catch (e) { console.log(`falhou (${e.message})`); }
  }

  // parte em arquivos de leitura: um acórdão nunca é cortado ao meio
  let n = 0, atual = [], tam = 0;
  const gravar = () => {
    if (!atual.length) return;
    const arq = path.join(__dirname, `acordaos_${++n}.txt`);
    fs.writeFileSync(arq, `ACÓRDÃOS PARA RESUMIR — parte ${n}\n${atual.length} decisões\n${atual.join('')}`);
    console.log(`  escrevi acordaos_${n}.txt (${atual.length} decisões)`);
    atual = []; tam = 0;
  };
  for (const p of pedacos) {
    if (tam + p.length > LOTE) gravar();
    atual.push(p); tam += p.length;
  }
  gravar();

  console.log(`\nPronto: ${n} arquivo(s). Mande um de cada vez no chat.`);
  console.log('⚠ Eles têm o inteiro teor dos acórdãos (nome, CPF, dado de saúde). Apague depois.');
}

if (require.main === module) main().catch(e => { console.error('falhou:', e.message); process.exit(1); });
