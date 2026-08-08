#!/usr/bin/env node
// Grava, em cada decisão já guardada no CRM, QUEM julgou: a Junta de Recursos
// (1ª instância do CRPS) ou a Câmara de Julgamento (2ª instância).
//
// Isso muda o que se pode fazer com o caso. Perdeu na Junta, ainda cabe
// Recurso Especial às Câmaras em 30 dias; perdeu na Câmara, o caminho
// administrativo acabou e o assunto é ação judicial. Ler o número do acórdão
// para descobrir isso, caso a caso, é trabalho que a máquina faz melhor.
//
// De onde sai: do próprio PDF do acórdão, na linha em que o colegiado se
// identifica ("ACORDAM os membros da 2ª Composição Adjunta da 10ª Junta de
// Recursos"). Quando não há PDF guardado, tenta a sigla do e-Recursos
// ("25ª JR/3080/2025"). Não achou nos dois, não inventa: fica sem.
//
// Custo zero: lê os PDFs aqui na máquina, sem IA e sem coletar nada de novo.
//
// Uso:
//   node marcar_orgao.js             → SECO: mostra o que gravaria
//   node marcar_orgao.js --aplicar   → grava
//   node marcar_orgao.js --refazer   → refaz também os que já têm órgão

const fs = require('fs');
const path = require('path');
const T = require('./traduzir.js');
const { textoDoPDF } = require('./resumir.js');

for (const linha of (fs.existsSync(path.join(__dirname, '.env'))
    ? fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n') : [])) {
  const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const BASE = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const CHAVE = process.env.SUPABASE_SERVICE_KEY || '';
const BALDE = process.env.BUCKET || 'anexos';
const DO_PDF = 'acórdão', DO_STATUS = 'e-Recursos';

async function sb(caminho, opts = {}) {
  const r = await fetch(BASE + caminho, { ...opts,
    headers: { apikey: CHAVE, Authorization: `Bearer ${CHAVE}`,
      'Content-Type': 'application/json', ...(opts.headers || {}) } });
  if (!r.ok) throw new Error(`${opts.method || 'GET'} ${caminho} -> ${r.status} ${await r.text()}`);
  const t = await r.text(); return t ? JSON.parse(t) : null;
}
async function baixarPDF(caminho) {
  const r = await fetch(`${BASE}/storage/v1/object/${BALDE}/${caminho}`,
    { headers: { apikey: CHAVE, Authorization: `Bearer ${CHAVE}` } });
  if (!r.ok) throw new Error(`storage ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

// as decisões de cada ficha: o arquivo, o evento que o trouxe e o recurso
function decisoes(casos, { refazer = false } = {}) {
  const fila = [];
  for (const k of casos)
    for (const bloco of (k.crps || []))
      for (const e of (bloco.eventos || []))
        for (const a of (e.arquivos || [])) {
          if (!a.decide) continue;
          // órgão corrigido à mão manda: o robô não reescreve
          if (a.orgao && (a.orgao.origem === 'curado' || !refazer)) continue;
          fila.push({ casoId: k.id, nup: bloco.nup, arquivo: a, bruto: e.bruto || '' });
        }
  return fila;
}

async function main() {
  const aplicar = process.argv.includes('--aplicar');
  const refazer = process.argv.includes('--refazer');
  if (!BASE || !CHAVE) { console.error('faltam SUPABASE_URL e SUPABASE_SERVICE_KEY no .env'); process.exitCode = 1; return; }

  const casos = await sb('/rest/v1/casos?select=id,titulo,crps&crps=not.is.null');
  const casoPorId = new Map(casos.map(k => [k.id, k]));
  const fila = decisoes(casos, { refazer });
  console.log(`${fila.length} decisão(ões) para identificar${aplicar ? '' : '  (modo SECO — não grava nada)'}\n`);
  if (!fila.length) return console.log('Nada a fazer. Rode com --refazer para refazer os automáticos.');

  const porCaso = new Map();
  let doPDF = 0, doStatus = 0, sem = 0;
  const placar = new Map();

  for (const [i, alvo] of fila.entries()) {
    const a = alvo.arquivo;
    let orgao = null, de = DO_PDF;
    if (a.storage) {
      try { orgao = T.orgaoDoAcordao(await textoDoPDF(await baixarPDF(a.storage))); }
      catch (e) { /* PDF ilegível: sobra o status */ }
    }
    // o status do e-Recursos nomeia o acórdão ("25ª JR/3080/2025") e serve de
    // rede: vale para a decisão sem PDF guardado e para o PDF que não abriu
    if (!orgao) { orgao = T.orgaoJulgador(alvo.bruto); de = DO_STATUS; }
    if (!orgao || !orgao.instancia) {
      sem++;
      console.log(`  ${i + 1}/${fila.length}  ${a.nome.slice(0, 45)} — não identificado`);
      continue;
    }
    if (de === DO_PDF) doPDF++; else doStatus++;
    placar.set(orgao.nome, (placar.get(orgao.nome) || 0) + 1);
    const cliente = (casoPorId.get(alvo.casoId) || {}).titulo || '';
    console.log(`  ${i + 1}/${fila.length}  ${cliente.slice(0, 28).padEnd(28)} ${orgao.nome}  (${de})`);
    if (!aplicar) continue;
    a.orgao = { nome: orgao.nome, sigla: orgao.sigla, instancia: orgao.instancia,
                origem: 'auto', fonte: de };
    porCaso.set(alvo.casoId, casoPorId.get(alvo.casoId));
  }

  console.log(`\n${doPDF} lido(s) no acórdão, ${doStatus} pelo status do e-Recursos, ${sem} sem identificação.`);
  for (const [nome, n] of [...placar].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${nome}`);
  if (!aplicar) return console.log('\nModo SECO. Para gravar:  node marcar_orgao.js --aplicar');

  for (const k of porCaso.values())
    await sb(`/rest/v1/casos?id=eq.${k.id}`, { method: 'PATCH',
      headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ crps: k.crps }) });
  console.log(`✔ gravado em ${porCaso.size} caso(s). Recarregue o CRM.`);
}

module.exports = { decisoes };
if (require.main === module) main().catch(e => { console.error('falhou:', e.message); process.exitCode = 1; });
