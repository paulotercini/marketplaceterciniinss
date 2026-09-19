#!/usr/bin/env node
// CONFERÊNCIA DO ESTADUAL — acervo do TJSP contra os casos do CRM.
//
// Recebe a lista de números do TJSP que o CRM conhece (um por linha, em
// crm-tjsp.txt) e o acervo curado, e separa os três montes:
//   batem          — o CRM e o tribunal concordam
//   só no tribunal — processo real que o CRM não registra
//   só no CRM      — o CRM tem o número, o acervo não achou
//
// O CLIENTE DE CADA PROCESSO não é "a primeira parte": em vários casos o
// escritório está no polo passivo (executado, réu, embargado). Quem identifica
// é o advogado — a parte cujo rol de advogados inclui Tercini. Errar isso
// jogaria o nome do adversário na lista de clientes a cadastrar.
//
// Uso: node conferir-tjsp.js
const fs = require('fs');

const ADVOGADO = /tercini/i;
const digitos = s => String(s || '').replace(/\D/g, '');

// O e-SAJ cola o estado prisional no fim do nome da parte ("FULANO Réu Preso").
// Isso não é nome: sem tirar, o cliente não casa com o CRM e ainda aparece
// duas vezes na lista de órfãos — com e sem o sufixo. Foi o que aconteceu com
// dois nomes na primeira conferência.
const SUFIXO = /\s+(r[ée]u?\s+preso|r[ée]\s+presa|preso|presa)\s*$/i;

// nome normalizado para casar com o CRM: sem acento, sem pontuação, caixa
// única, espaço colapsado. É o mínimo para "José" casar com "Jose".
const chave = s => String(s || '').replace(SUFIXO, '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

const acervo = JSON.parse(fs.readFileSync('acervo-resolvido.cru.json', 'utf8'));
const noCrm = new Set(
  fs.readFileSync('crm-tjsp.txt', 'utf8').split(/\r?\n/).map(digitos).filter(n => n.length === 20));

// quem é o cliente nesta capa
const clienteDe = r => {
  const p = (r.partes || []).find(x => (x.advogados || []).some(a => ADVOGADO.test(a)));
  return p ? p.nome : null;
};

// agrupa por CASO (número de controle), não por código: cumprimento, RPV e
// custas do mesmo processo são um caso só — contar código infla a lista
const porCaso = new Map();
for (const r of acervo) {
  const num = digitos(r.numero);
  if (num.length !== 20) continue;
  const k = r.controle || ('sem-controle:' + num);
  if (!porCaso.has(k)) porCaso.set(k, { controle: r.controle, numeros: new Set(), itens: [] });
  const c = porCaso.get(k);
  c.numeros.add(num);
  c.itens.push(r);
}

const casos = [...porCaso.values()].map(c => {
  const principal = c.itens.find(x => x.via === 'seletor' && x.classe) || c.itens[0];
  return {
    controle: c.controle,
    numeros: [...c.numeros],
    cliente: c.itens.map(clienteDe).find(Boolean) || null,
    classe: principal.classe,
    assunto: principal.assunto,
    situacao: c.itens.map(x => x.situacao).find(Boolean) || null,
    foro: principal.foro,
    ano: (principal.numero.match(/\.(\d{4})\./) || [])[1],
    pecas: c.itens.length,
    url: 'https://esaj.tjsp.jus.br' + principal.url,
    no_crm: [...c.numeros].some(n => noCrm.has(n)),
  };
});

const soTribunal = casos.filter(c => !c.no_crm);
const batem = casos.filter(c => c.no_crm);

const numerosAcervo = new Set(acervo.map(r => digitos(r.numero)).filter(n => n.length === 20));
const soCrm = [...noCrm].filter(n => !numerosAcervo.has(n));

fs.writeFileSync('conferencia-tjsp.cru.json',
  JSON.stringify({ so_tribunal: soTribunal, batem, so_crm: soCrm }, null, 2), 'utf8');

// só os nomes, normalizados, para o casamento com clientes do CRM
fs.writeFileSync('nomes-so-tribunal.txt',
  [...new Set(soTribunal.map(c => chave(c.cliente)).filter(Boolean))].join('\n'), 'utf8');

console.log('casos no acervo (por controle):', casos.length);
console.log('  batem com o CRM             :', batem.length);
console.log('  SÓ no tribunal              :', soTribunal.length);
console.log('números só no CRM             :', soCrm.length);
console.log('sem cliente identificado      :', soTribunal.filter(c => !c.cliente).length);
console.log('\nsó-no-tribunal por ano:');
const porAno = {};
for (const c of soTribunal) porAno[c.ano] = (porAno[c.ano] || 0) + 1;
Object.entries(porAno).sort().forEach(([a, n]) => console.log('  ', a, '-', n));
console.log('\nnomes distintos para casar com o CRM:',
  new Set(soTribunal.map(c => chave(c.cliente)).filter(Boolean)).size);

// ── a lista de trabalho ────────────────────────────────────────────────────
// CSV para abrir no Excel e trabalhar caso a caso. Tem nome de cliente: é
// DADO, fica na máquina (o .gitignore já pega *.cru.*).
const semCliente = new Set(
  fs.existsSync('clientes-ausentes.txt')
    ? fs.readFileSync('clientes-ausentes.txt', 'utf8').split(/\r?\n/).filter(Boolean)
    : []);
const csv = ['cliente;cliente_ja_no_crm;numeros;ano;classe;assunto;situacao;foro;pecas;controle'];
for (const c of soTribunal.sort((a, b) => (a.cliente || '').localeCompare(b.cliente || ''))) {
  const k = chave(c.cliente);
  csv.push([
    (c.cliente || '(não identificado)').replace(SUFIXO, ''),
    k && !semCliente.has(k) ? 'SIM' : 'NAO',
    c.numeros.join(' | '), c.ano || '', c.classe || '', c.assunto || '',
    c.situacao || '', c.foro || '', c.pecas, c.controle || '',
  ].map(v => String(v).replace(/;/g, ',')).join(';'));
}
fs.writeFileSync('conferencia-tjsp.cru.csv', '﻿' + csv.join('\r\n'), 'utf8');
console.log('\nescrito: conferencia-tjsp.cru.csv (' + soTribunal.length + ' casos)');
