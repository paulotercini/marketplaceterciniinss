// As regras de leitura do e-SAJ TJSP (esaj-regras.js), contra HTML com a
// MESMA estrutura vista ao vivo em 15.09.2026 na consulta por OAB (1º e 2º
// grau) e em carregarMovimentacoesAjax.do — classes e formatos idênticos;
// nomes e números, fictícios.
const test = require('node:test');
const assert = require('node:assert');
const R = require('../esaj-regras.js');

const LINHA_PG = `<div class="row unj-ai-c home__lista-de-processos"><div class="nuProcesso col-md-3"><!-- Atributos --><a href="/cpopg/show.do?processo.codigo=A8Z05033C0000&amp;processo.foro=398&amp;conversationId=&amp;cbPesquisa=NUMOAB&amp;dadosConsulta.valorConsulta=331110SP&amp;cdForo=-1&amp;paginaConsulta=1" class="linkProcesso">0004008-13.2005.8.26.0368</a><span class=""></span></div>
<div class="col-md-3"><label class="unj-label tipoDeParticipacao">Advogado(a):</label><div class="unj-base-alt nomeParte">Paulo Roberto Tercini Filho</div></div>
<div class="col-md-4"><div class="classeProcesso">Execu&ccedil;&atilde;o Fiscal</div><div class="assuntoPrincipalProcesso">D&iacute;vida Ativa</div></div>
<div class="col-md-3"><label class="unj-label labelRecebidoEm">Recebido em:</label><div class="dataLocalDistribuicaoProcesso">09/09/2005 - Unidade 2 - N&uacute;cleo 4.0 Execu&ccedil;&otilde;es Fiscais Estaduais</div></div>
<div class="col-md-3"><label class="unj-label">N&uacute;mero antigo:</label><div>368.01.2005.004008</div><div></div></div></div>`;
const LINHA_SG = `<div class="row unj-ai-c"><div class="nuProcesso col-md-3"><!-- Atributos --><a href="/cposg/show.do?processo.codigo=RI0030I6Y0000&amp;conversationId=&amp;paginaConsulta=1&amp;cbPesquisa=NUMOAB&amp;dePesquisa=331110SP&amp;localPesquisa.cdLocal=-1" class="linkProcesso">0002364-89.2009.8.26.0531</a><span class=""></span></div>
<div class="col-md-3"><label class="unj-label tipoDeParticipacao">Apelante:</label><div class="unj-base-alt nomeParticipante">Fulano de Tal<br>OAB 123456/SP</div></div>
<div class="col-md-4"><div class="classeProcesso">Apela&ccedil;&atilde;o C&iacute;vel</div><div class="assuntoProcesso">REGISTROS P&Uacute;BLICOS</div></div>
<div class="col-md-3"><label class="unj-label">Recebido em:</label><div class="dataLocalDistribuicao">06/10/2015 - 28ª C&acirc;mara Extraordin&aacute;ria de Direito Privado</div></div></div>`;
const PAGINA = `<html><body>68 Processos encontrados<ul class="unj-pagination"><li><a href="/cpopg/search.do?paginaConsulta=2&amp;cbPesquisa=NUMOAB">2</a></li><li><a href="/cpopg/search.do?paginaConsulta=3&amp;cbPesquisa=NUMOAB">3</a></li></ul>${LINHA_PG}${LINHA_PG.replace('0004008-13', '0004009-13')}${LINHA_SG}</body></html>`;

test('a linha do 1º grau: número, código, foro, classe, assunto, órgão e distribuição; a OAB não é parte', () => {
  const [p] = R.lerListaHtml(LINHA_PG);
  assert.equal(p.numero, '0004008-13.2005.8.26.0368');
  assert.equal(p.codigo, 'A8Z05033C0000');
  assert.equal(p.grau, '1º grau');
  assert.equal(p.classe, 'Execução Fiscal');
  assert.equal(p.assunto, 'Dívida Ativa');
  assert.equal(p.partes, null, 'a participação da própria OAB não é parte');
  assert.equal(p.orgao, 'Unidade 2 - Núcleo 4.0 Execuções Fiscais Estaduais');
  assert.equal(p.distribuido, '2005-09-09');
  assert.equal(p.link, 'https://esaj.tjsp.jus.br/cpopg/show.do?processo.codigo=A8Z05033C0000&processo.foro=398');
  assert.equal(p.movimento, null);
});

test('a linha do 2º grau: outras classes, parte com OAB embaixo do nome, sem foro', () => {
  const [p] = R.lerListaHtml(LINHA_SG);
  assert.equal(p.grau, '2º grau');
  assert.equal(p.codigo, 'RI0030I6Y0000');
  assert.equal(p.partes, 'Apelante Fulano de Tal');
  assert.equal(p.assunto, 'REGISTROS PÚBLICOS');
  assert.equal(p.orgao, '28ª Câmara Extraordinária de Direito Privado');
  assert.equal(p.link, 'https://esaj.tjsp.jus.br/cposg/show.do?processo.codigo=RI0030I6Y0000');
});

test('a página: total, número de páginas, dedupe por número', () => {
  assert.equal(R.totalRegistros(PAGINA), 68);
  assert.equal(R.totalPaginas(PAGINA), 3);
  assert.equal(R.lerListaHtml(PAGINA).length, 3);
  assert.equal(R.totalRegistros('<p>Não existem informações disponíveis para os parâmetros informados.</p>'), 0);
  assert.equal(R.totalRegistros('<p>login</p>'), null);
});

test('a trava do e-SAJ e o login caído são reconhecidos', () => {
  assert.ok(R.bloqueado('<div>Atenção Foram identificadas multiplas consultas simultâneas.</div>'));
  assert.ok(!R.bloqueado(PAGINA));
  assert.ok(R.pedeLogin('<form action="/sajcas/login?service=x">'));
  assert.ok(!R.pedeLogin(PAGINA));
});

const MOVS_PG = `<tbody id="tabelaPrimeiraPaginaMovimentacoes"><tr class="fundoClaro containerMovimentacao"><td class="dataMovimentacao">14/05/2026</td><td> <a class="linkMovVincProc"><img></a></td><td class="descricaoMovimentacao"><a class="linkMovVincProc">Certid&atilde;o de Publica&ccedil;&atilde;o Expedida</a><br><span>Rela&ccedil;&atilde;o: 0123/2026 Data da Publica&ccedil;&atilde;o: 15/05/2026</span></td></tr>
<tr class="fundoEscuro"><td></td><td></td><td></td></tr>
<tr class="fundoEscuro containerMovimentacao"><td class="dataMovimentacao">13/05/2026</td><td></td><td class="descricaoMovimentacao">Remetido ao DJE<br><span>Rela&ccedil;&atilde;o: 0123/2026</span></td></tr></tbody>`;
const MOVS_SG = `<tbody id="tabelaMovimentacoesAjax"><tr class="fundoClaro movimentacaoProcesso"><td class="dataMovimentacaoProcesso">09/08/2021</td><td><a class="linkMovVincProc"><img></a></td><td class="descricaoMovimentacaoProcesso"><a class="linkMovVincProc">Processo Baixado</a><br><span>Nos termos da Resolu&ccedil;&atilde;o 123/2020</span></td></tr></tbody>`;

test('as movimentações do 1º grau: data, título e detalhe, a mais recente primeiro, sem as linhas vazias', () => {
  const mv = R.lerMovimentacoesHtml(MOVS_PG);
  assert.equal(mv.length, 2);
  assert.deepStrictEqual(mv[0], { data: '2026-05-14', hora: null, texto: 'Certidão de Publicação Expedida', detalhe: 'Relação: 0123/2026 Data da Publicação: 15/05/2026' });
  assert.equal(mv[1].texto, 'Remetido ao DJE');
});

const FICHA = `<input type="search" id="numeroProcesso-busca"><span id="numeroProcesso" class="unj-larger-1">0004008-13.2005.8.26.0368</span> <span id="labelSituacaoProcesso" class="unj-tag">Suspenso</span>
<span id="classeProcesso" class="unj-label">Execu&ccedil;&atilde;o Fiscal</span><span id="foroProcesso">Foro 2 - N&uacute;cleo 4.0</span><span id="varaProcesso">Unidade 2 - N&uacute;cleo 4.0 Execu&ccedil;&otilde;es Fiscais Estaduais</span>
<table id="tablePartesPrincipais"><tr class="fundoClaro"><td class="label"><span class="mensagemExibindo tipoDeParticipacao">Exeqte</span></td><td class="nomeParteEAdvogado">Uni&atilde;o Federal - PRFN</td></tr>
<tr class="fundoClaro"><td class="label"><span class="mensagemExibindo tipoDeParticipacao">Exectdo</span></td><td class="nomeParteEAdvogado">Italo S/A - Ind&uacute;strias<br> <span class="mensagemExibindo">Advogado:</span>Ernesto Rossi</td></tr></table>
<table id="tableTodasPartes"><tr><td class="label"><span class="mensagemExibindo tipoDeParticipacao">Terceiro</span></td><td class="nomeParteEAdvogado">Ningu&eacute;m</td></tr></table>`;

test('a ficha: número, situação, classe, órgão e as partes principais sem os advogados', () => {
  assert.deepStrictEqual(R.lerFichaHtml(FICHA), {
    numero: '0004008-13.2005.8.26.0368', situacao: 'Suspenso', classe: 'Execução Fiscal',
    orgao: 'Unidade 2 - Núcleo 4.0 Execuções Fiscais Estaduais', foro: 'Foro 2 - Núcleo 4.0',
    partes: 'Exeqte União Federal - PRFN X Exectdo Italo S/A - Indústrias', principal: null, tipo: null });
  assert.equal(R.lerFichaHtml(PAGINA), null, 'lista não é ficha');
  assert.ok(R.ehFicha(FICHA) && !R.ehFicha(PAGINA));
});

// [22.09.2026] a ficha de INCIDENTE (cumprimento de sentença, requisição de
// pagamento) não tem id=numeroProcesso: o número vem no span.unj-larger, o
// tipo no unj-label do cabeçalho e o processo principal em a.processoPrinc.
// Sem isto, a coleta pulava o cumprimento e as RPVs (caso da Izilda)
const FICHA_INC = `<div id="containerDadosPrincipaisProcesso" class="container"><div class="row"><div class="col-lg-12"><span class="unj-label">Incidente</span><div><span class="unj-larger">Requisi&ccedil;&atilde;o de Pequeno Valor (0000035-73.2026.8.26.0381) (02)</span></div></div></div>
<div class="row"><div class="col-lg-2"><span id="labelAssuntoProcesso" class="unj-label">Assunto</span><div><span id="assuntoProcesso">Aux&iacute;lio-Acidente (Art. 86)</span></div></div>
<div class="col-lg-3"><span id="labelVaraProcesso" class="unj-label">Vara</span><div><span id="varaProcesso">Vara do N&uacute;cleo 4.0</span></div></div>
<div class="col-lg-4"><span class="unj-label">Processo principal</span><div><a class="processoPrinc" href="/cpopg/show.do?processo.codigo=AL0000LWD0000">0000035-73.2026.8.26.0381</a></div></div></div></div>
<table id="tablePartesPrincipais"><tr><td class="label"><span class="tipoDeParticipacao">Reqte</span></td><td class="nomeParteEAdvogado">Paulo Roberto Tercini Filho</td></tr>
<tr><td class="label"><span class="tipoDeParticipacao">Ent. Devedora</span></td><td class="nomeParteEAdvogado">INSS</td></tr></table>`;
test('a ficha de incidente (RPV): reconhecida, com número, classe com a ordem, tipo e o processo principal', () => {
  assert.ok(R.ehFicha(FICHA_INC));
  const f = R.lerFichaHtml(FICHA_INC);
  assert.equal(f.numero, '0000035-73.2026.8.26.0381');
  assert.equal(f.classe, 'Requisição de Pequeno Valor (02)');
  assert.equal(f.tipo, 'Incidente');
  assert.equal(f.principal, '0000035-73.2026.8.26.0381');
  assert.equal(f.orgao, 'Vara do Núcleo 4.0');
  assert.equal(f.partes, 'Reqte Paulo Roberto Tercini Filho X Ent. Devedora INSS');
});

test('a consulta por número, o código na URL da ficha e a situação que dispensa releitura', () => {
  assert.match(R.urlBuscaNumero('1º grau', '0004008-13.2005.8.26.0368'),
    /^\/cpopg\/search\.do\?.*cbPesquisa=NUMPROC.*numeroDigitoAnoUnificado=0004008-13\.2005.*foroNumeroUnificado=0368.*valorConsultaNuUnificado=0004008-13\.2005\.8\.26\.0368/);
  assert.match(R.urlBuscaNumero('2º grau', '0004008-13.2005.8.26.0368'), /^\/cposg\/search\.do\?.*dePesquisaNuUnificado=0004008-13\.2005\.8\.26\.0368/);
  assert.equal(R.codigoDaUrl('https://esaj.tjsp.jus.br/cpopg/show.do?processo.codigo=A8Z05033C0000&processo.foro=398'), 'A8Z05033C0000');
  assert.equal(R.codigoDaUrl('https://esaj.tjsp.jus.br/cpopg/search.do?x=1'), null);
  for (const s of ['Baixado', 'Arquivado', 'Encerrado', 'Extinto']) assert.ok(R.arquivado(s), s);
  for (const s of ['Suspenso', 'Em andamento', null]) assert.ok(!R.arquivado(s), String(s));
});

test('as movimentações do 2º grau: classes com sufixo Processo', () => {
  const mv = R.lerMovimentacoesHtml(MOVS_SG);
  assert.deepStrictEqual(mv, [{ data: '2021-08-09', hora: null, texto: 'Processo Baixado', detalhe: 'Nos termos da Resolução 123/2020' }]);
});
