// Caso-ouro do bug real: os 67 acórdãos entraram no CRM com 0 byte porque o
// coletor pedia o documento em /esisrec/... (rota da tela) em vez de
// /api/v1/esisrec/... (rota da API). O servidor respondia 200 com a própria
// página do site, e ninguém conferia se o que chegou era mesmo um PDF.
const { test } = require('node:test');
const assert = require('node:assert');
const P = require('../preparar.js');
const I = require('../ingerir.js');

test('a URL do documento leva o prefixo da API', () => {
  assert.equal(P.urlDoc('/esisrec/44234156897202017/64874126'),
    '/api/v1/esisrec/44234156897202017/64874126');
});

test('o ?arquivo= é cortado — é só o nome sugerido para salvar', () => {
  assert.equal(P.urlDoc('/esisrec/442341568/64874126?arquivo=ACORDAO_3080.pdf'),
    '/api/v1/esisrec/442341568/64874126');
});

test('ehPDF aceita o PDF de verdade e recusa página e vazio', () => {
  const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);      // %PDF-1
  const html = new Uint8Array([0x3c, 0x21, 0x44, 0x4f, 0x43]);           // <!DOC
  assert.equal(P.ehPDF(pdf), true);
  assert.equal(P.ehPDF(html), false);
  assert.equal(P.ehPDF(new Uint8Array(0)), false);
  assert.equal(P.ehPDF(null), false);
});

test('o tamanho não arredonda para 0 KB — foi o que escondeu o problema', () => {
  assert.equal(P.tamanho(312), '312 bytes');
  assert.equal(P.tamanho(78_643), '76.8 KB');
});

test('os ajudantes viajam mesmo para dentro do coletor', () => {
  const s = P.montarColetor(['44234156897202017'], 3000);
  assert.ok(!s.includes('{{'), 'sobrou marcador sem trocar no coletor');
  assert.match(s, /const urlDoc =/);
  assert.match(s, /\/api\/v1/);
  assert.match(s, /const ehPDF =/);
  assert.match(s, /44234156897202017/);
  assert.match(s, /3000/);
  new Function(s);   // tem que ser JavaScript válido
});

test('o coletor pede o documento como PDF e com o crachá do site', () => {
  const s = P.montarColetor(['1'], 100);
  assert.match(s, /Accept: 'application\/pdf'/);
  assert.match(s, /localStorage\.getItem\('ifs_auth'\)/);
});

test('conferirPDF barra o arquivo vazio e o que não é PDF', () => {
  const bom = Buffer.concat([Buffer.from('%PDF-1.4'), Buffer.alloc(2000, 0x20)]);
  assert.equal(I.conferirPDF(bom), null);
  assert.match(I.conferirPDF(Buffer.alloc(0)), /0 bytes/);
  assert.match(I.conferirPDF(Buffer.from('%PDF-1.4')), /8 bytes/);
  assert.match(I.conferirPDF(Buffer.alloc(3000, 0x41)), /não é PDF/);
});

test('nome de arquivo do Storage sai sem acento, sem barra e sem espaço', () => {
  const n = I.nomeSeguro('DECISÃO MONOCRÁTICA_1ªCA 2ª JR/2413/2026.pdf');
  assert.ok(!/[\/ ÃÁª]/.test(n), 'sobrou caractere que o Storage recusa: ' + n);
  assert.match(n, /\.pdf$/);
});

test('o caminho do acórdão já guardado sobrevive a uma coleta sem PDF', () => {
  const bloco = { eventos: [{ arquivos: [{ id: '73189593', nome: 'ACÓRDÃO.pdf' }] }] };
  const jaTinha = new Map([['73189593', { storage: 'crps/1/73189593_ACORDAO.pdf', bytes: 78643 }]]);
  I.restaurarGuardados(bloco, jaTinha);
  assert.equal(bloco.eventos[0].arquivos[0].storage, 'crps/1/73189593_ACORDAO.pdf');
});

test('a cópia vazia da coleta antiga NÃO volta — o botão some até vir a boa', () => {
  const bloco = { eventos: [{ arquivos: [{ id: '73189593', nome: 'ACÓRDÃO.pdf' }] }] };
  const jaTinha = new Map([['73189593', { storage: 'crps/1/73189593_ACORDAO.pdf' }]]);  // sem bytes
  I.restaurarGuardados(bloco, jaTinha);
  assert.equal(bloco.eventos[0].arquivos[0].storage, undefined);
});
