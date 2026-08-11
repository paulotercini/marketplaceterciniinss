// As regras de leitura do acervo do PJe (pje-regras.js), contra uma linha com
// a MESMA estrutura vista no HAR real de 11.08.2026 — classes, ordem dos
// divs e formatos idênticos; nomes e números, fictícios.
const test = require('node:test');
const assert = require('node:assert');
const R = require('../pje-regras.js');

const LINHA = `
<td class="rich-table-cell" id="formAcervo:tbProcessos:999001:j_id1370"><div class="col-md-4">
<a href="#" id="formAcervo:tbProcessos:999001:j_id1369"
 onclick="window.open('/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=999001&amp;ca=ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12&amp;aba=tbAnexar','blank','')"
 title="Autos Digitais"><span class="text-bold">ApCiv 5000000-11.2020.4.03.9999</span></a>
<div id="pje-clipboard" class="pje-clipboard"><i class="fa fa-clipboard" title="Copiar para área de transferência"
 onclick="copyToClipboard(event, '5000000-11.2020.4.03.9999');"></i></div></div>
<div class="col-md-8 informacoes-linha-acervo"><div><span class="nome-parte">INSTITUTO NACIONAL DO SEGURO SOCIAL - INSS X FULANA DE TAL</span></div>
<div>7ª Turma/Gab. 22 - DES. FED. BELTRANA</div>
<div>Distribuído em 29/01/2020</div>
<div>Último movimento: 10/08/2026 18:16 - Recebidos os autos</div></div></td>`;

test('lê número, classe, partes, movimento e a chave id/ca da linha', () => {
  const p = R.lerLinhaAcervo(LINHA);
  assert.equal(p.numero, '5000000-11.2020.4.03.9999');
  assert.equal(p.classe, 'ApCiv');
  assert.match(p.partes, /FULANA DE TAL/);
  assert.equal(p.orgao, '7ª Turma/Gab. 22 - DES. FED. BELTRANA');
  assert.equal(p.distribuido, '2020-01-29');
  assert.deepStrictEqual(p.movimento,
    { data: '2026-08-10', hora: '18:16', texto: 'Recebidos os autos' });
  assert.equal(p.id, '999001');
  assert.equal(p.ca, 'ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12');
});

test('linha sem número de processo não vira registro', () => {
  assert.equal(R.lerLinhaAcervo('<td>Selecionar todos</td>'), null);
});

test('a página deduplica o processo repetido, ficando o movimento mais novo', () => {
  const velho = LINHA.replace('10/08/2026 18:16 - Recebidos os autos',
                              '02/05/2026 09:00 - Conclusos para decisão');
  const pagina = `<table><tr>${velho}</tr><tr>${LINHA}</tr></table>`;
  const lidos = R.lerAcervoHtml(pagina);
  assert.equal(lidos.length, 1);
  assert.equal(lidos[0].movimento.texto, 'Recebidos os autos');
});

test('processo ainda sem movimento (só distribuído) entra sem movimento', () => {
  const sem = LINHA.replace(/<div>Último movimento:[^<]+<\/div>/, '');
  const p = R.lerLinhaAcervo(sem);
  assert.equal(p.numero, '5000000-11.2020.4.03.9999');
  assert.equal(p.movimento, null);
});

// ── a página do processo aberto (Cronologia + cabeçalho) ────────────────────
// Estrutura fiel ao HAR real de 11.08.2026 (divTimeLine): grupos por dia,
// itens tipo-M (movimento) e tipo-D (juntada com vários movimentos e anexo).
const TIMELINE = `
<form id="divTimeLine" class="col-sm-3 timeline open">
<div class="media data"><div class="media-body">
  <span class="text-muted data-interna">10 ago. 2026</span></div></div>
<div class="media interno tipo-M"><div class="media-left"></div>
  <div class="media-body box"><div id="divTimeLine:j_id386:0:j_id388:0:j_id390">
    <i class="fa fa-bullhorn mr-10 tip"></i><span class="text-upper texto-movimento">Recebidos os autos</span></div>
  <div class="anexos"></div>
  <div class="col-sm-12"><small class="text-muted pull-right">18:16</small></div></div></div>
<div class="media data"><div class="media-body">
  <span class="text-muted data-interna">03 ago. 2026</span></div></div>
<div class="media interno tipo-D"><div class="media-left"></div>
  <div class="media-body box">
    <div><i class="fa fa-bullhorn mr-10 tip"></i><span class="text-upper texto-movimento">Disponibilizado no DJ Eletrônico em 04/08/2026</span></div>
    <div><i class="fa fa-bullhorn mr-10 tip"></i><span class="text-upper texto-movimento">Negado monocraticamente o provimento do recurso</span></div>
  <div class="anexos"><a href="#" id="divTimeLine:j_id386:1:j_id388:1:j_id399" onclick="A4J.AJAX.Submit('divTimeLine');return false;">
    <i class="fa fa-file-pdf-o mr-10 tip"></i><span class="" title="">900000001 - Decisão Monocrática</span></a>
    <i class="fa fa-clipboard copiar-clipboard" onclick="copyToClipboard(event, '900000001')"></i></div>
  <div class="col-sm-12"><small class="text-muted pull-right">11:46</small></div></div></div>
</form>`;

test('a cronologia sai com data do grupo, hora, textos e anexos de cada item', () => {
  const itens = R.lerTimelineHtml(TIMELINE);
  assert.equal(itens.length, 2);
  assert.deepStrictEqual(itens[0],
    { data: '2026-08-10', hora: '18:16', textos: ['Recebidos os autos'], docs: [] });
  assert.equal(itens[1].data, '2026-08-03');
  assert.equal(itens[1].hora, '11:46');
  assert.equal(itens[1].textos.length, 2);
  assert.match(itens[1].textos[1], /Negado monocraticamente/);
  assert.deepStrictEqual(itens[1].docs,
    [{ id: '900000001', nome: 'Decisão Monocrática' }]);
});

test('o cabeçalho do processo dá número, classe e órgão julgador', () => {
  const CAB = `<a class="titulo-topo dropdown-toggle titulo-topo-desktop" title="Mais detalhes">RecInoCiv 5000000-11.2020.4.03.9999
    <i class="fa fa-clipboard"></i></a><dl><dt>Órgão julgador</dt> <dd>21º Juiz Federal da 7ª TR SP</dd></dl>`;
  assert.deepStrictEqual(R.lerCabecalhoProcesso(CAB),
    { numero: '5000000-11.2020.4.03.9999', classe: 'RecInoCiv',
      orgao: '21º Juiz Federal da 7ª TR SP' });
});

test('página sem número CNJ não vira cabeçalho', () => {
  assert.equal(R.lerCabecalhoProcesso('<h1>login</h1>'), null);
});
