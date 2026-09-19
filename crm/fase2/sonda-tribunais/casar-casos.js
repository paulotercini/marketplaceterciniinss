#!/usr/bin/env node
// CASAMENTO — processo órfão do TJSP  ↔  caso sem número no CRM.
//
// O achado que justifica isto: 74 dos 97 clientes dos processos órfãos JÁ têm
// cadastro no CRM, e esses clientes somam 245 casos SEM número de processo.
// Ou seja, na maioria não falta cadastrar — falta VINCULAR. Este script
// propõe o vínculo; quem decide é o Paulo.
//
// NÃO ESCREVE NO BANCO. A saída é uma planilha de propostas com grau de
// confiança. Casar processo errado com caso errado é pior que não casar:
// contamina prazo, cliente e histórico de uma vez só.
//
// COMO PONTUA, e por que assim:
//   fase 'judicial'          +3  — o caso se declara judicial e não tem número:
//                                  é exatamente o buraco que estamos preenchendo
//   lista 'Judicial'         +3  — de que lista do To Do o caso migrou
//   lista incompatível       -2  — Aposentadorias Futuras, Marcos, Pagamentos
//   assunto bate             +2  por palavra significativa em comum
//
// A confiança NÃO é só a nota: vários candidatos empatados viram BAIXA mesmo
// com nota boa, porque a dúvida ali é sobre QUAL caso, e nota não resolve isso.
//
// O QUE SAIU, e vale como aviso: a primeira versão pontuava proximidade de ano
// entre a distribuição do processo e `criado_em` do caso. Inútil — TODOS os
// casos foram criados entre 02/08 e 04/09/2026, na migração do To Do. O campo
// parecia informação e era carimbo de importação. Trocado por `origem_lista`,
// as propostas de alta confiança saltaram de 6 para 31 sobre os mesmos dados:
// o problema nunca foi a falta de sinal, foi eu estar lendo o campo errado.
//
// Uso: node casar-casos.js <arquivo-do-supabase.txt>
const fs = require('fs');

const SUFIXO = /\s+(r[ée]u?\s+preso|r[ée]\s+presa|preso|presa)\s*$/i;
const chave = s => String(s || '').replace(SUFIXO, '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// palavras que aparecem em quase todo assunto previdenciário e por isso não
// distinguem nada — deixá-las pontuando faria tudo casar com tudo
const VAZIAS = new Set(['DE','DA','DO','DAS','DOS','E','A','O','ART','POR','EM',
  'PARA','COM','SEM','NA','NO','CIVEL','PROCEDIMENTO','COMUM','ACAO','PEDIDO',
  'BENEFICIO','BENEFICIOS','ESPECIE','DIREITO','PREVIDENCIARIO','INSS','JUDICIAL',
  'PROCESSO','REVISAO','CONCESSAO','1','2','3','4','5','6','7','8','9','0']);
const fichas = s => new Set(chave(s).split(' ').filter(w => w.length > 2 && !VAZIAS.has(w)));

// ── entradas ───────────────────────────────────────────────────────────────
// O arquivo é o resultado bruto do MCP: texto de aviso em volta e o JSON com
// as aspas ESCAPADAS (\"). Recorto entre os colchetes e desescapo antes de
// ler — sem isso o JSON.parse morre na primeira chave.
const bruto = fs.readFileSync(process.argv[2], 'utf8');
const inicio = bruto.indexOf('[{');
const fim = bruto.lastIndexOf('}]');
if (inicio < 0 || fim < 0) { console.error('não achei o JSON no arquivo'); process.exit(1); }
const semNumero = JSON.parse(bruto.slice(inicio, fim + 2).replace(/\\"/g, '"'));

const conf = JSON.parse(fs.readFileSync('conferencia-tjsp.cru.json', 'utf8'));
const orfaos = conf.so_tribunal.filter(c => c.cliente);

const porCliente = new Map();
for (const k of semNumero) {
  if (!porCliente.has(k.chave)) porCliente.set(k.chave, []);
  porCliente.get(k.chave).push(k);
}

// ── pontuar ────────────────────────────────────────────────────────────────
// O ANO SAIU DA CONTA, e a razão importa: `criado_em` de TODOS os casos está
// entre 02/08 e 04/09/2026 — é a data da migração do To Do, não do processo.
// Pontuar por ano era ruído puro; premiava indistintamente e escondia o
// sinal bom.
//
// O que entrou no lugar foi `origem_lista`, a lista do To Do de onde o caso
// veio ("👪 Judicial", "🖥 Conselho de Recursos", "🌻 INSS"...). Ela é o campo
// mais informativo que sobrou: um processo do TJSP casa com caso da lista
// Judicial, não com um de Aposentadorias Futuras.
function pontuar(orfao, caso) {
  let n = 0;
  const porque = [];
  if (caso.fase === 'judicial') { n += 3; porque.push('fase judicial'); }
  if (/judicial/i.test(caso.origem || '')) { n += 3; porque.push('lista Judicial'); }
  // lista incompatível com processo judicial: penaliza, não elimina — o caso
  // pode ter migrado de fase depois de a tarefa nascer
  if (/aposentadorias futuras|marcos|pagamentos/i.test(caso.origem || '')) {
    n -= 2; porque.push('lista incompatível (' + caso.origem + ')');
  }
  const comuns = [...fichas(orfao.assunto)].filter(w => fichas(caso.beneficio + ' ' + caso.titulo).has(w));
  if (comuns.length) { n += 2 * comuns.length; porque.push('assunto: ' + comuns.join('+')); }
  return { n, porque: porque.join('; ') };
}

const propostas = [];
for (const o of orfaos) {
  const cands = porCliente.get(chave(o.cliente)) || [];
  if (!cands.length) { propostas.push({ o, caso: null, conf: 'SEM CANDIDATO', nota: 0, porque: 'cliente no CRM não tem caso sem número' }); continue; }
  const notas = cands.map(c => ({ caso: c, ...pontuar(o, c) })).sort((a, b) => b.n - a.n);
  const melhor = notas[0];
  const empate = notas.filter(x => x.n === melhor.n).length > 1;
  let confianca;
  if (melhor.n === 0) confianca = 'BAIXA';
  else if (empate) confianca = 'BAIXA';
  else if (cands.length === 1 && melhor.n >= 3) confianca = 'ALTA';
  else if (melhor.n >= 5) confianca = 'ALTA';
  else if (melhor.n >= 3) confianca = 'MEDIA';
  else confianca = 'BAIXA';
  propostas.push({
    o, caso: melhor.caso, conf: confianca, nota: melhor.n,
    porque: melhor.porque + (empate ? ' [EMPATE entre ' + notas.filter(x => x.n === melhor.n).length + ']' : ''),
    candidatos: cands.length,
  });
}

const csv = ['confianca;nota;cliente;processo;ano_processo;assunto_tribunal;situacao;caso_id;caso_titulo;caso_beneficio;caso_fase;caso_origem;candidatos;porque;abrir_no_esaj'];
const ordem = { ALTA: 0, MEDIA: 1, BAIXA: 2, 'SEM CANDIDATO': 3 };
for (const p of propostas.sort((a, b) => ordem[a.conf] - ordem[b.conf] || b.nota - a.nota)) {
  csv.push([
    p.conf, p.nota, String(p.o.cliente).replace(SUFIXO, ''), p.o.numeros[0], p.o.ano,
    p.o.assunto || '', p.o.situacao || '',
    p.caso ? p.caso.id : '', p.caso ? p.caso.titulo : '', p.caso ? p.caso.beneficio : '',
    p.caso ? p.caso.fase : '', p.caso ? p.caso.origem : '', p.candidatos || 0, p.porque, p.o.url || '',
  ].map(v => String(v).replace(/;/g, ',')).join(';'));
}
fs.writeFileSync('propostas-vinculo.cru.csv', '﻿' + csv.join('\r\n'), 'utf8');

const conta = {};
for (const p of propostas) conta[p.conf] = (conta[p.conf] || 0) + 1;
console.log('processos órfãos com cliente identificado:', orfaos.length);
console.log('casos sem número desses clientes         :', semNumero.length);
console.log('\npropostas por confiança:');
for (const k of ['ALTA', 'MEDIA', 'BAIXA', 'SEM CANDIDATO'])
  if (conta[k]) console.log('  ' + k.padEnd(14), conta[k]);
console.log('\nescrito: propostas-vinculo.cru.csv');
