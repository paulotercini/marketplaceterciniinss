// F184 · quais documentos o coletor baixa, onde guarda, e o que é lixo
const test = require('node:test');
const assert = require('node:assert');
const R = require('../docs-regras.js');

test('decide: sentença, decisão, despacho, acórdão, monocrática, laudo — e os códigos do eproc', () => {
  for (const n of ['Sentença', 'Decisão', 'Despacho', 'Acórdão', 'Decisão Monocrática', 'Laudo Pericial',
                   'DESPADEC1', 'SENT1', 'ACOR2', 'LAUDO1', 'Julgada Procedente a Ação', 'Homologada a Transação'])
    assert.ok(R.ehDecisao(n), n);
  for (const n of ['Petição Inicial', 'PET1', 'PROC2', 'Procuração', 'Contestação', 'CERT1', 'INIC1', 'Certidão'])
    assert.ok(!R.ehDecisao(n), n);
});

test('caminho: sempre o mesmo para o mesmo documento; o CRPS mantém o caminho do ingerir.js', () => {
  assert.equal(R.caminhoDoc('pje', '5001168-60.2024.4.03.6314', { id: '12345678' }),
               'pje/50011686020244036314/12345678');
  assert.equal(R.caminhoDoc('eproc', '1000001-02.2026.8.26.0100', { id: '69:DESPADEC1' }),
               'eproc/10000010220268260100/69_DESPADEC1');
  assert.equal(R.caminhoDoc('crps', '44233.123456/2025-11', { id: '77', nome: 'Acórdão 123.pdf' }),
               'crps/44233123456202511/77_Acordao_123.pdf');
});

test('conteúdo: PDF pelos bytes; HTML de login não é documento', () => {
  const pdf = Buffer.from('%PDF-1.7 ...');
  assert.equal(R.tipoDoConteudo(pdf, 'application/octet-stream'), 'application/pdf');
  const login = Buffer.from('<html><form id="kc-form-login"><input type="password"></form>' + ' '.repeat(300));
  assert.equal(R.tipoDoConteudo(login, 'text/html; charset=utf-8'), null);
  const doc = Buffer.from('<html><body>' + 'JULGO PROCEDENTE o pedido. '.repeat(20) + '</body></html>');
  assert.equal(R.tipoDoConteudo(doc, 'text/html'), 'text/html');
  assert.equal(R.tipoDoConteudo(Buffer.from('{"erro":1}'), 'application/json'), null);
});
