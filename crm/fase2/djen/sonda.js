#!/usr/bin/env node
// SONDA do DJEN — a Central de Comunicações Processuais do CNJ.
//
// Por que uma sonda antes do robô: já erramos assim uma vez. As regras do
// resumo do acórdão foram escritas contra um acórdão inventado, e nenhuma
// delas sobreviveu ao texto real. Aqui é a mesma armadilha — a documentação
// da API mistura nomes em camelCase e snake_case, e não dá para saber, sem
// olhar, qual é o de verdade. Então esta sonda faz UMA chamada, guarda o JSON
// cru e mostra a forma. O robô vem depois, escrito contra o que voltou.
//
// O que o DJEN é: desde 2024 todos os tribunais publicam ali as intimações.
// A consulta é pública, aceita a OAB e devolve o TEOR da publicação — que,
// no previdenciário, costuma trazer a sentença ou a decisão inteira. É a
// única fonte nacional que junta as três coisas: acha os processos pela OAB,
// traz o texto, e marca o dia da publicação (de onde corre o prazo).
//
// PRECISA RODAR NO BRASIL. A API fica atrás de CloudFront com bloqueio por
// país: de fora responde 403 "blocked from your country". No GitHub Actions
// (que roda nos EUA) não funciona — este robô mora na máquina do escritório,
// como o coletor do CRPS.
//
// Uso:
//   node sonda.js 123456 SP            → últimos 7 dias
//   node sonda.js 123456 SP 30         → últimos 30 dias
//
// Escreve djen_amostra.json (JSON cru) e resume na tela. O arquivo tem nome
// de cliente e teor de decisão: é dado sensível, não vai para o git.

const fs = require('fs');
const path = require('path');

const BASE = process.env.DJEN_API || 'https://comunicaapi.pje.jus.br/api/v1/comunicacao';

// data de calendário, sem passar por fuso (new Date('2026-08-09') já nasce
// no dia anterior em UTC-3)
function diaMenos(dias) {
  const h = new Date();
  const t = new Date(Date.UTC(h.getFullYear(), h.getMonth(), h.getDate() - Number(dias || 0)));
  return t.toISOString().slice(0, 10);
}

function montarUrl({ oab, uf, dias = 7, pagina = 1, porPagina = 100 }) {
  const q = new URLSearchParams({
    numeroOab: String(oab).replace(/\D/g, ''),
    ufOab: String(uf).toUpperCase(),
    dataDisponibilizacaoInicio: diaMenos(dias),
    dataDisponibilizacaoFim: diaMenos(0),
    pagina: String(pagina),
    itensPorPagina: String(porPagina),
  });
  return `${BASE}?${q}`;
}

// as chaves que vieram, em todos os níveis — é isso que o robô vai usar
function formato(obj, prefixo = '', fora = new Set()) {
  for (const [k, v] of Object.entries(obj || {})) {
    const nome = prefixo ? `${prefixo}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) formato(v, nome, fora);
    else if (Array.isArray(v)) {
      fora.add(`${nome}[]`);
      if (v[0] && typeof v[0] === 'object') formato(v[0], `${nome}[]`, fora);
    } else fora.add(`${nome}: ${v === null ? 'null' : typeof v}`);
  }
  return fora;
}

async function main() {
  const [oab, uf, dias = '7'] = process.argv.slice(2);
  if (!oab || !uf) {
    console.log('Uso: node sonda.js <numero-da-OAB> <UF> [dias]');
    console.log('Ex.: node sonda.js 123456 SP 30');
    process.exitCode = 1; return;
  }
  const url = montarUrl({ oab, uf, dias });
  console.log(`Consultando o DJEN: OAB ${oab}/${uf.toUpperCase()}, últimos ${dias} dias\n${url}\n`);

  let r;
  try { r = await fetch(url, { headers: { Accept: 'application/json' } }); }
  catch (e) { console.error('Não consegui falar com a API:', e.message); process.exitCode = 1; return; }

  const corpo = await r.text();
  if (!r.ok) {
    console.error(`A API respondeu ${r.status}.`);
    if (/block(ed)?\s+access\s+from\s+your\s+country/i.test(corpo))
      console.error('É bloqueio por país: rode esta sonda na máquina do escritório, no Brasil.');
    else console.error(corpo.slice(0, 400));
    process.exitCode = 1; return;
  }
  let json; try { json = JSON.parse(corpo); }
  catch (e) { console.error('A resposta não era JSON:', corpo.slice(0, 300)); process.exitCode = 1; return; }

  const saida = path.join(__dirname, 'djen_amostra.json');
  fs.writeFileSync(saida, JSON.stringify(json, null, 1));

  const itens = json.items || json.content || json.dados || [];
  console.log(`Voltaram ${itens.length} comunicação(ões)${json.count != null ? ` de ${json.count} no período` : ''}.`);
  console.log(`JSON cru guardado em  ${saida}   (dado sensível — não commite)\n`);
  if (!itens.length) return console.log('Sem publicações no período. Tente mais dias: node sonda.js ' + oab + ' ' + uf + ' 60');

  console.log('── CAMPOS QUE VIERAM ─────────────────────────────────────────');
  for (const c of [...formato(itens[0])].sort()) console.log('  ' + c);

  const t = itens[0];
  const texto = t.texto || t.teor || '';
  console.log('\n── PRIMEIRA COMUNICAÇÃO ──────────────────────────────────────');
  console.log('  processo:  ', t.numero_processo || t.numeroProcesso || '—');
  console.log('  tribunal:  ', t.siglaTribunal || t.sigla_tribunal || '—');
  console.log('  órgão:     ', t.nomeOrgao || t.nome_orgao || '—');
  console.log('  tipo:      ', t.tipoComunicacao || t.tipo_comunicacao || '—');
  console.log('  disponib.: ', t.data_disponibilizacao || t.dataDisponibilizacao || '—');
  console.log('  teor:      ', texto ? `${texto.length} caracteres` : '(veio vazio)');
  if (texto) console.log('\n  ' + texto.slice(0, 700).replace(/\s+/g, ' ') + (texto.length > 700 ? ' […]' : ''));

  // quantos processos distintos apareceram: é a resposta para "a OAB acha
  // tudo?" — cada um deles devia ter caso no CRM
  const procs = new Set(itens.map(x => String(x.numero_processo || x.numeroProcesso || '').replace(/\D/g, '')).filter(Boolean));
  console.log(`\n${procs.size} processo(s) distintos nestas ${itens.length} publicações.`);
  console.log('\nMande o resumo acima (sem o JSON) que eu escrevo o robô contra o formato real.');
}

module.exports = { montarUrl, diaMenos, formato };
if (require.main === module) main().catch(e => { console.error('falhou:', e.message); process.exitCode = 1; });
