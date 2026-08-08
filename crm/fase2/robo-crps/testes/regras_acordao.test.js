// Motor de regras: lê o dispositivo do acórdão sem IA e sem custo.
// O que estes testes protegem, em ordem: não classificar o VOTO (que discute
// teses recusadas), não transformar data solta em período reconhecido, e
// calar quando o texto foge do padrão.
const { test } = require('node:test');
const assert = require('node:assert');
const G = require('../regras_acordao.js');
const { validarResumo } = require('../resumir.js');

const ACORDAO = `CONSELHO DE RECURSOS DA PREVIDÊNCIA SOCIAL — 25ª JUNTA DE RECURSOS
ACÓRDÃO Nº 3080/2025. RELATÓRIO: Trata-se de recurso contra decisão que indeferiu
aposentadoria por tempo de contribuição, com DER em 12/03/2023 a 15/03/2023.
VOTO: o PPP indica exposição a ruído. Entendo que assiste razão parcial.
ACORDAM os membros da 25ª Junta de Recursos do CRPS, por unanimidade, em conhecer
do recurso e dar-lhe provimento parcial, para reconhecer como especial o período de
01/01/2000 a 10/03/2002 e o período de 15/05/2005 a 20/08/2009, determinando a
averbação do tempo reconhecido, mantendo o indeferimento da aposentadoria.`;

test('acha o dispositivo e ignora relatório e voto', () => {
  const d = G.dispositivo(ACORDAO);
  assert.match(d, /^ACORDAM/);
  assert.ok(!/RELAT[ÓO]RIO/.test(d), 'o relatório entrou no dispositivo');
  assert.ok(!/assiste raz[ãa]o parcial/.test(d), 'o voto entrou no dispositivo');
});

test('lê o resultado do recurso', () => {
  assert.match(G.resultado(G.dispositivo(ACORDAO)), /provimento parcial/i);
});

test('provimento parcial não é lido como provimento total', () => {
  const d = 'ACORDAM em conhecer do recurso e dar-lhe provimento parcial.';
  assert.match(G.resultado(d), /em parte/i);
  assert.ok(!/\(recurso provido\)/.test(G.resultado(d)));
});

test('cada resultado tem a sua frase', () => {
  const casos = [
    ['ACORDAM em não conhecer do recurso.', /não conhecido/i],
    ['ACORDAM em negar provimento ao recurso.', /negado/i],
    ['ACORDAM em dar provimento ao recurso.', /provido/i],
    ['ACORDAM em converter o julgamento em diligência.', /nova análise/i],
  ];
  for (const [txt, esperado] of casos) assert.match(G.resultado(G.dispositivo(txt)), esperado);
});

test('CASO-OURO: data solta não vira período reconhecido', () => {
  // a DER "12/03/2023 a 15/03/2023" está no RELATÓRIO, não no dispositivo,
  // e nem sequer perto de um verbo de reconhecimento
  const r = G.resumirPorRegras(ACORDAO);
  assert.ok(!r.linhas.some(l => l.includes('12/03/2023')), 'a DER virou período reconhecido');
  assert.ok(r.linhas.some(l => l.includes('01/01/2000') && l.includes('20/08/2009')));
});

test('data no dispositivo, mas longe de verbo de reconhecimento, também não conta', () => {
  const d = 'ACORDAM em negar provimento ao recurso, tendo em vista o benefício pago '
    + 'no interregno de 01/02/2019 a 03/03/2020 sem qualquer irregularidade apurada.';
  assert.equal(G.periodos(G.dispositivo(d)), null);
});

test('distingue especial de rural, e singular de plural', () => {
  const esp = G.periodos('reconhecer como especial o período de 01/01/2000 a 10/03/2002');
  assert.match(esp, /como especial o período de 01\/01\/2000 a 10\/03\/2002/);
  const rur = G.periodos('averbar como tempo rural o período de 01/01/1980 a 31/12/1985');
  assert.match(rur, /como rural o período/);
  const dois = G.periodos('reconhecer como especial o período de 01/01/2000 a 10/03/2002 '
    + 'e reconhecer como especial o período de 15/05/2005 a 20/08/2009');
  assert.match(dois, /como especiais os períodos .* e de /);
});

test('mistura de tipos não arrisca — devolve nada', () => {
  const m = G.periodos('reconhecer como especial o período de 01/01/2000 a 10/03/2002 '
    + 'e averbar como rural o período de 01/01/1980 a 31/12/1985');
  assert.equal(m, null);
});

test('lê as determinações do dispositivo', () => {
  const o = G.ordens(G.dispositivo(ACORDAO));
  assert.ok(o.some(x => /averba[çc][ãa]o/.test(x)));
  assert.ok(o.some(x => /Não reconheceu o direito/.test(x)));
});

test('o resumo inteiro sai no formato que a ficha espera', () => {
  const r = G.resumirPorRegras(ACORDAO);
  assert.equal(r.conseguiu, true);
  const v = validarResumo(r);
  assert.equal(v.ok, true, v.motivo);          // passa pela mesma barreira do motor com IA
  assert.ok(v.linhas.length <= 4);
});

test('nunca passa de 4 linhas, mesmo com muitas determinações', () => {
  const d = 'ACORDAM em dar provimento ao recurso, para reconhecer como especial o período de '
    + '01/01/2000 a 10/03/2002, determinando a averbação, o restabelecimento do benefício, '
    + 'nova perícia médica e a concessão do benefício.';
  const r = G.resumirPorRegras(d);
  assert.equal(r.linhas.length, 4);
  assert.match(r.linhas[0], /provido/i);       // o resultado nunca é cortado
  assert.match(r.linhas[1], /01\/01\/2000/);   // nem os períodos
});

test('CALA quando não acha o dispositivo', () => {
  const r = G.resumirPorRegras('Documento digitalizado sem camada de texto.');
  assert.equal(r.conseguiu, false);
  assert.match(r.motivo, /dispositivo/);
});

test('CALA quando o dispositivo foge do padrão', () => {
  const r = G.resumirPorRegras('ACORDAM os membros da Junta, na forma do relatório e voto que integram este acórdão.');
  assert.equal(r.conseguiu, false);
  assert.match(r.motivo, /padr[ãa]o/);
});

test('pega a ÚLTIMA abertura: o voto às vezes ensaia o dispositivo antes', () => {
  const d = 'VOTO: Ante o exposto, entendo que o pedido deve ser negado. '
    + 'ACORDAM os membros da Junta em dar provimento ao recurso.';
  assert.match(G.resultado(G.dispositivo(d)), /provido/i);
});
