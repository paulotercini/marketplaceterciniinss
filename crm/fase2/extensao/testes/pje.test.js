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
