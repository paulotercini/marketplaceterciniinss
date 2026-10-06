// F184 · quais documentos o coletor baixa, onde guarda, e o que é lixo
const test = require('node:test');
const assert = require('node:assert');
const R = require('../docs-regras.js');

test('decide: sentença, decisão, despacho, acórdão, monocrática, laudo — e os códigos do eproc', () => {
  for (const n of ['Sentença', 'Decisão', 'Despacho', 'Acórdão', 'Decisão Monocrática', 'Laudo Pericial',
                   'DESPADEC1', 'SENT1', 'ACOR2', 'LAUDO1', 'Julgada Procedente a Ação', 'Homologada a Transação'])
    assert.ok(R.ehDecisao(n), n);
  for (const n of ['Petição Inicial', 'PET1', 'PROC2', 'Procuração', 'Contestação', 'CERT1', 'INIC1', 'Certidão',
                   'Certidão Trânsito em Julgado', 'Certidão de Julgamento — sentença publicada'])
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
  const painel = Buffer.from('<html><head><title>:: eproc  - Painel do Advogado ::</title></head><body>' + 'x'.repeat(500) + '</body></html>');
  assert.equal(R.tipoDoConteudo(painel, 'text/html'), null, 'o painel do eproc não é documento');
});

test('desce tudo, menos o expediente', () => {
  for (const n of ['Petição inicial', 'Documento Comprobatório (DECLARAÇÃO DE POBREZA)', 'Contestação (CONTESTAÇÃO PADRONIZADA LOAS.pdf)',
                   'Réplica', 'Petição Intercorrente', 'Manifestação', 'Parecer', 'Recurso Inominado', 'Ofício (Ofício de pagamento: 1)',
                   'Sentença tipo B', 'Laudo Pericial', 'INIC1', 'PET1', 'CONT1', 'SENT1', 'Documento de Identificação (RG E CPF)'])
    assert.ok(R.vaiBaixar(n), n);
  for (const n of ['Certidão', 'Certidão Trânsito em Julgado', 'Ato Ordinatório', 'Intimação', 'Mandado', 'Comprovante de protocolo',
                   'Certidão de Publicação Expedida', 'Remessa', 'Conclusão', 'CERT1', 'ATOORD1', 'INTM2', 'AR1'])
    assert.ok(!R.vaiBaixar(n), n);
});

test('o visualizador não é o documento: segue o iframe do eproc e monta o getPDF do e-SAJ', () => {
  const eproc = `<html><body><iframe id="conteudoIframe" src="controlador.php?acao=acessar_documento_implementacao&amp;doc=61&amp;key=ab"></iframe></body></html>`;
  assert.equal(R.enderecoDoMiolo(eproc), 'controlador.php?acao=acessar_documento_implementacao&doc=61&key=ab');
  const esaj = `<script>var requestScope = [{"data":{"title":"Sentença"},"children":[
    {"data":{"title":"Página 10","parametros":"nuSeqRecurso=00000&nuProcesso=1&cdDocumento=9&numInicial=10&numFinal=10&nuPagina=0"}},
    {"data":{"title":"Página 11","parametros":"nuSeqRecurso=00000&nuProcesso=1&cdDocumento=9&numInicial=11&numFinal=11&nuPagina=1"}},
    {"data":{"title":"Página 12","parametros":"nuSeqRecurso=00000&nuProcesso=1&cdDocumento=9&numInicial=12&numFinal=12&nuPagina=2"}}]}]; var requestScopeArvoreSigilosos = [];</script><iframe src="processando.html"></iframe>`;
  assert.equal(R.enderecoDoMiolo(esaj),
    '/pastadigital/getPDF.do?nuSeqRecurso=00000&nuProcesso=1&cdDocumento=9&numInicial=10&numFinal=12&nuPagina=0');
  assert.equal(R.enderecoDoMiolo('<html><body>Vistos. JULGO PROCEDENTE.</body></html>'), null, 'documento já é o documento');
  assert.equal(R.enderecoDoMiolo('<iframe src="processando.html"></iframe>'), null);
});
