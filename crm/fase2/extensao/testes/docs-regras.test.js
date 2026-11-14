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

test('1.31.0 · desce tudo, expediente inclusive', () => {
  for (const n of ['Petição inicial', 'Documento Comprobatório (DECLARAÇÃO DE POBREZA)', 'Contestação (CONTESTAÇÃO PADRONIZADA LOAS.pdf)',
                   'Réplica', 'Petição Intercorrente', 'Manifestação', 'Parecer', 'Recurso Inominado', 'Ofício (Ofício de pagamento: 1)',
                   'Sentença tipo B', 'Laudo Pericial', 'INIC1', 'PET1', 'CONT1', 'SENT1', 'Documento de Identificação (RG E CPF)',
                   'Recebimento de Ofício', 'Laudo de Perícia', 'Instrumento de Procuração', 'Ato Ordinatório', 'ATOORD1'])
    assert.ok(R.vaiBaixar(n), n);
  for (const n of ['Certidão', 'Certidão Trânsito em Julgado', 'Intimação', 'Mandado', 'Comprovante de protocolo',
                   'Certidão de Publicação Expedida', 'Remessa', 'Conclusão', 'CERT1', 'INTM2', 'AR1',
                   'Decurso de Prazo', 'DEPRE Ciência de Recebimento no Portal', 'Movimento Processual', 'Aviso de Recebimento (AR) - Positivo', 'Recebimento'])
    assert.ok(R.vaiBaixar(n) && R.ehExpediente(n), n);
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

test('eproc em HTML: segue o $.ajax do visualizador; o charset do HTML é lido do cabeçalho ou do <meta>', () => {
  const pag = `<html><head><meta charset="iso-8859-1"><title>Evento 94 - DESPADEC1</title></head><body><div id="divdochtml"></div>
    <script>function start() { $.ajax({ url: "controlador.php?acao=acessar_documento_implementacao&amp;doc=61&amp;key=ab", success: f }); }</script></body></html>`;
  assert.equal(R.enderecoDoMiolo(pag), 'controlador.php?acao=acessar_documento_implementacao&doc=61&key=ab');
  assert.equal(R.charsetDoHtml(Buffer.from(pag), 'text/html'), 'iso-8859-1');
  assert.equal(R.charsetDoHtml(Buffer.from(pag), 'text/html; charset=windows-1252'), 'windows-1252');
  assert.equal(R.charsetDoHtml(Buffer.from('<html><body>x</body></html>'), 'text/html'), 'utf-8');
});

// guardarDocs (comum.js): pausa também na falha, parada por recusas seguidas,
// registro do que faltou e nova tentativa só do upload
function carregarComum({ portal, storage }) {
  const fs = require('fs'), vm = require('vm');
  const pausas = [], subidas = [];
  const win = { DOCS_REGRAS: R, __crmProvaDeVida: true };
  const ctx = {
    window: win, console: { warn() {}, log() {} }, location: { href: 'https://portal.exemplo/' },
    URL, Uint8Array, TextDecoder, TextEncoder, Response, Promise, String, Math,
    setTimeout: (f, ms) => { pausas.push(ms); f(); },
    fetch: async (u, o) => { subidas.push(String(u)); const r = storage.shift(); if (r instanceof Error) throw r; return r; },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(__dirname + '/../comum.js', 'utf8').replace('window.CRM = window.CRM ||', 'var CRM = window.CRM ='), ctx);
  win.CRM.pedir = async m => m.acao === 'doc-existe' ? { existe: false } : { url: 'https://banco.exemplo', chave: 'k', token: 't' };
  return { CRM: win.CRM, pausas, subidas, baixar: async () => portal.shift() };
}
const pdf = () => new Response(Buffer.from('%PDF-1.4 teste'), { headers: { 'content-type': 'application/pdf' } });

test('guardarDocs: recusa do portal também pausa, fica registrada e para na 3ª seguida (409 não conta)', async () => {
  const no = st => new Response(null, { status: st });
  const a = carregarComum({ portal: [no(409), no(429), no(429), no(429), pdf()], storage: [] });
  const docs = [1, 2, 3, 4, 5].map(i => ({ id: 'd' + i, nome: `d${i}.pdf` }));
  const falhas = [];
  const n = await a.CRM.guardarDocs('pat', '1', docs, { todos: true, baixar: a.baixar, pausaMs: 3000, pararEm: 3, falhas });
  assert.equal(n, 0);
  assert.deepEqual(a.pausas, [3000, 3000, 3000, 3000]);          // uma por pedido ao portal
  assert.deepEqual(falhas.map(f => f.status), [409, 429, 429, 429]);
  assert.equal(falhas.parou, 429);
  assert.equal(docs[4].caminho, undefined);                       // o 5º nem foi pedido
});

test('guardarDocs: 5xx e queda de rede repetem só o upload; sem opções novas nada muda para o chamador', async () => {
  const a = carregarComum({ portal: [pdf(), pdf()],
    storage: [new Response('x', { status: 503 }), new Error('rede'), new Response('{}'), new Response('grande', { status: 413 })] });
  const docs = [{ id: 'a', nome: 'a.pdf' }, { id: 'b', nome: 'b.pdf' }];
  const n = await a.CRM.guardarDocs('pat', '1', docs, { todos: true, baixar: a.baixar, pausaMs: 600 });
  assert.equal(n, 1);
  assert.equal(docs[0].caminho, 'pat/1/a');
  assert.equal(docs[1].caminho, undefined);                       // 4xx não repete
  assert.equal(a.subidas.length, 4);
  assert.deepEqual(a.pausas, [2000, 5000, 600, 600]);
});
