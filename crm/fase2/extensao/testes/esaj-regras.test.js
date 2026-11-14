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

// [02.10.2026] OS RECURSOS DENTRO DO RECURSO NO 2º GRAU. A consulta por número
// de um processo com embargos de declaração na apelação não cai na ficha:
// devolve a caixa "Selecione o processo", com o recurso principal e, dentro
// dele, os incidentes. Estrutura igual à vista ao vivo; número e códigos fictícios.
const SELECAO = `<section class="modal__lista-processos__item"> <div class="modal__lista-processos__item__header"> <div class="modal__lista-processos__item__header modal__process-choice"> <input class="custom-radio" type="radio" name="processoSelecionado" id="processoSelecionado" value="RI00ABCDE0000"> <div> <em class="modal__lista-processos__item__header modal__process-choice__number">0001234-56.2025.8.26.0368</em> <em class="modal__process-choice__instancia d-ib">2º Grau</em> <em class="modal__process-choice__instancia d-ib ml-10">Julgado</em> </div> </div> <div class="modal__lista-processos__item__header__process-info"> <div class="modal__lista-processos__item__header__process-info__content"> <div class="modal__lista-processos__item__header__process-info__content__item">Apela&ccedil;&atilde;o C&iacute;vel</div> <div class="modal__lista-processos__item__header__process-info__content__item data">20/05/2026</div> </div> </div> </div> <!-- FILHOS --> <div class="modal__lista-processos__item__body"> <div> <button class="modal__lista-processos__item__body__expand" id="btnExpand"> <span class="icon glyph glyph-chevron-down" id="toggleIcon"></span> <span class="text">Incidentes, a&ccedil;&otilde;es acidentais, recursos e execu&ccedil;&otilde;es de senten&ccedil;as(1)</span> </button> </div> <div class="list__hierarquia-dependentes" id="exibindoDependentes"> <div class="list__hierarquia-dependentes__item mt-0"> <label class="list__dependentes_row"> <input class="custom-radio" type="radio" name="processoSelecionado" id="processoSelecionado" value="RI00ABCDF12KW"> <div class="list__hierarquia-dependentes__item__label__info"> <em class="list__hierarquia-dependentes__item__label__info__title"> 50000 - Embargos de Declara&ccedil;&atilde;o C&iacute;vel (Julgado) </em> <em class="list__hierarquia-dependentes__item__label__info__data ">04/08/2026</em> </div> </label> </div> </div> </div> </section>`;

test('a caixa "Selecione o processo": o recurso principal e os embargos dentro dele, cada um com o seu código', () => {
  assert.deepStrictEqual(R.lerSelecaoHtml(SELECAO), [
    { codigo: 'RI00ABCDE0000', classe: 'Apelação Cível', incidente: false },
    { codigo: 'RI00ABCDF12KW', classe: 'Embargos de Declaração Cível', incidente: true }]);
  assert.deepStrictEqual(R.lerSelecaoHtml(PAGINA), [], 'a lista da OAB não é a caixa');
  assert.equal(R.lerFichaHtml(SELECAO), null, 'a caixa não é ficha');
});

// a ficha do recurso dentro do recurso: sem id=numeroProcesso e sem
// containerDadosPrincipaisProcesso; cabeçalho "Recurso" + unj-larger, a
// situação em span.unj-tag e o órgão em #orgaoJulgadorProcesso
const FICHA_REC = `<div class="row"> <div class="col-md-13"> <!--principal --> <!-- incidente --> <span class="unj-label">Recurso</span> <div> <span class="unj-larger"> Embargos de Declara&ccedil;&atilde;o C&iacute;vel (0001234-56.2025.8.26.0368)&nbsp; </span> </div> <span class="unj-tag">Julgado</span> </div> </div>
<div class="row"><div class="col-md-4"><span class="unj-label"> Assunto </span><div><span id="assuntoProcesso">Servidor P&uacute;blico</span></div></div>
<div class="col-md-3"><span class="unj-label">Se&ccedil;&atilde;o</span><div><span id="secaoProcesso">Direito P&uacute;blico</span></div></div>
<div class="col-md-3"><span class="unj-label">&Oacute;rg&atilde;o Julgador</span><div><span id="orgaoJulgadorProcesso">3&ordf; C&acirc;mara de Direito P&uacute;blico</span></div></div>
<div class="col-md-3"><span class="unj-label">Processo Principal</span><div><a class="processoPrinc" href="/cposg/show.do?processo.codigo=RI00ABCDE0000">0001234-56.2025.8.26.0368</a></div></div></div>
<table id="tablePartesPrincipais"><tr><td class="label"><span class="tipoDeParticipacao">Embargte:</span></td><td class="nomeParteEAdvogado">Fulana Fict&iacute;cia<br><span>Advogado:</span> Paulo Roberto Tercini Filho</td></tr>
<tr><td class="label"><span class="tipoDeParticipacao">Embargdo:</span></td><td class="nomeParteEAdvogado">Munic&iacute;pio Fict&iacute;cio</td></tr></table>
<div id="containerMovimentacoesAjax"></div>`;

test('a ficha do recurso dentro do recurso (embargos na apelação): reconhecida, com situação, órgão e o processo principal', () => {
  assert.ok(R.ehFicha(FICHA_REC), 'sem isto a coleta descartava os embargos');
  const f = R.lerFichaHtml(FICHA_REC);
  assert.equal(f.numero, '0001234-56.2025.8.26.0368');
  assert.equal(f.classe, 'Embargos de Declaração Cível');
  assert.equal(f.tipo, 'Recurso');
  assert.equal(f.situacao, 'Julgado');
  assert.equal(f.principal, '0001234-56.2025.8.26.0368');
  assert.equal(f.orgao, '3ª Câmara de Direito Público');
  assert.equal(f.partes, 'Embargte Fulana Fictícia X Embargdo Município Fictício');
});

// [02.10.2026] A RODADA INTEIRA, com o e-SAJ fingido: o esaj.js roda num
// contexto à parte, com fetch, favoritos e a fila do CRM de mentira. Prova que
// o número com apelação vai à consulta por número no 2º grau, que os embargos
// da caixa "Selecione o processo" entram na coleta com código, processo
// principal e as cinco movimentações, e que a apelação não é lida duas vezes.
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const NUM = '0001234-56.2025.8.26.0368', AP = 'RI00ABCDE0000', ED = 'RI00ABCDF12KW', PG = 'PG00ABCDE0000', CS = 'PG00ABCDE0001';
// o bloco de incidentes da ficha do 1º grau, como visto ao vivo em 03.10.2026
const BLOCO_INC = `<h2 class="subtitle tituloDoBloco">Incidentes, a&ccedil;&otilde;es incidentais, recursos e execu&ccedil;&otilde;es de senten&ccedil;as</h2>
<table><tr class="label"><th>Recebido em</th><th class="label">Classe</th></tr><tr class="fundoClaro"><td>05/01/2026</td>
<td><a class="incidente" href="/cpopg/show.do?processo.codigo=${CS}&amp;processo.foro=368" target="_top"> Cumprimento de Senten&ccedil;a contra a Fazenda P&uacute;blica &nbsp;(${NUM}) </a></td></tr></table>`;

test('os incidentes listados na ficha: código e classe, sem o número', () => {
  assert.deepStrictEqual(R.lerIncidentesFicha(BLOCO_INC + BLOCO_INC),
    [{ codigo: CS, classe: 'Cumprimento de Sentença contra a Fazenda Pública' }]);
  assert.deepStrictEqual(R.lerIncidentesFicha(FICHA), []);
});
const movs = (sg, n) => `<tbody>${Array.from({ length: n }, (_, i) => `<tr class="containerMovimentacao"><td class="dataMovimentacao${sg ? 'Processo' : ''}">0${i + 1}/09/2026</td><td></td><td class="descricaoMovimentacao${sg ? 'Processo' : ''}">Movimento ${i + 1}</td></tr>`).join('')}</tbody>`;
const ficha = (situacao, extra = '') => `<span id="numeroProcesso">${NUM}</span><span id="labelSituacaoProcesso" class="unj-tag">${situacao}</span><span id="classeProcesso">Apela&ccedil;&atilde;o C&iacute;vel</span>${extra}`;
// `x`: numeros (os do CRM), antes(u) (resposta que vem na frente das de
// sempre), guardado (o chrome.storage), vezes (cliques seguidos) e
// semCrm (a entrega da coleta falha)
function rodada(favoritos, situacao1g, x = {}) {
  const pedidos = [], enviados = [], gravado = {};
  const responde = (url, html) => ({ ok: true, status: 200, url, text: async () => html, json: async () => JSON.parse(html) });
  const fetch = async u => {
    const url = 'https://esaj.tjsp.jus.br' + u;
    pedidos.push(u);
    const antes = x.antes && x.antes(u);
    if (antes != null) return antes.html ? responde(antes.url, antes.html) : responde(url, antes);
    if (u.startsWith('/tarefas-adv/')) return responde(url, '{"oabs":[{"stringOab":"331110SP"}]}');
    if (/NUMOAB/.test(u)) return responde(url, '<p>Não existem informações disponíveis para os parâmetros informados.</p>');
    if (/^\/cpopg\/search\.do.*NUMPROC/.test(u)) return responde(`https://esaj.tjsp.jus.br/cpopg/show.do?processo.codigo=${PG}`, ficha(situacao1g, BLOCO_INC));
    if (u.startsWith(`/cpopg/show.do?processo.codigo=${CS}`)) return responde(url, FICHA_INC.replace(/0000035-73\.2026\.8\.26\.0381/g, NUM));
    if (/^\/cposg\/search\.do.*NUMPROC/.test(u)) return responde(url, SELECAO.replace(/0001234-56\.2025\.8\.26\.0368/g, NUM));
    if (u.startsWith(`/cposg/show.do?processo.codigo=${AP}`)) return responde(url, ficha('Julgado'));
    if (u.startsWith(`/cposg/show.do?processo.codigo=${ED}`)) return responde(url, FICHA_REC);
    if (u.startsWith('/cposg/carregarMovimentacoesAjax.do')) return responde(url, movs(true, u.endsWith(ED) ? 6 : 2));
    if (u.startsWith('/cpopg/carregarMovimentacoesAjax.do')) return responde(url, movs(false, 1));
    throw new Error('pedido inesperado ' + u);
  };
  const nada = () => {};
  const ctx = { location: { host: 'esaj.tjsp.jus.br' }, fetch, ESAJ_REGRAS: R, DOCS_REGRAS: { vaiBaixar: () => true }, Math, Date, Promise, AbortSignal, pausa: async () => {},
    setTimeout: f => { f(); return 0; }, faixa: nada, faixaOk: nada, faixaErr: nada, someFaixa: nada,
    chrome: { runtime: { id: 'teste' }, storage: { local: { get: async () => x.guardado || {}, set: async o => { Object.assign(gravado, o); } } } },
    CRM: { guardarDocs: async (s, n, docs) => { for (const d of docs) d.caminho = 'esaj/' + d.id; return 0; }, favoritosEsaj: async () => ({ favoritos }), processosTjsp: async () => ({ numeros: x.numeros || [NUM], fichas: 1 }),
           enviar: async (fonte, dados) => { if (x.semCrm) throw new Error('CRM fora do ar'); enviados.push(dados); return true; } } };
  ctx.window = ctx; ctx.top = ctx;           // o quadro de cima: num iframe o coletor não sobe
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'esaj.js'), 'utf8'), ctx);
  // o JSON tira os objetos do outro contexto (outro Object), que o
  // deepStrictEqual não aceita como iguais
  return Promise.all(Array.from({ length: x.vezes || 1 }, () => ctx.window.crmRodar()))
    .then(rs => JSON.parse(JSON.stringify({ r: x.vezes ? rs : rs[0], pedidos, enviados, gravado })));
}

test('rodada: a apelação dos favoritos leva aos embargos, que entram com código, principal e cinco movimentações', async () => {
  const { r, pedidos, enviados } = await rodada([{ numero: NUM, grau: '2º grau', codigo: AP, foro: null }], null);
  assert.deepStrictEqual(r, { ok: 2, falhas: 0 });
  assert.equal(enviados.length, 1);
  const [sg] = enviados;
  assert.equal(sg.grau, '2º grau');
  const [ap, ed] = sg.processos;
  assert.equal(ap.codigo, AP);
  assert.equal(ed.codigo, ED);
  assert.equal(ed.numero, NUM);
  assert.equal(ed.principal, NUM);
  assert.equal(ed.tipo, 'Recurso');
  assert.equal(ed.classe, 'Embargos de Declaração Cível');
  assert.equal(ed.movimentos.length, 5, 'as cinco mais recentes, não as seis');
  assert.deepStrictEqual(ed.movimento, ed.movimentos[0]);
  assert.deepStrictEqual(ed.movimentos[0], { data: '2026-09-01', hora: '00:00', texto: 'Movimento 1' });
  assert.equal(pedidos.filter(u => u.startsWith(`/cposg/show.do?processo.codigo=${AP}`)).length, 1, 'a apelação não é lida duas vezes');
  assert.equal(pedidos.filter(u => /^\/cposg\/search\.do.*NUMPROC/.test(u)).length, 1);
});

test('rodada: o 1º grau "em grau de recurso" sem favorito no 2º grau leva à apelação e aos embargos', async () => {
  const { r, enviados } = await rodada([], 'Em grau de recurso');
  assert.deepStrictEqual(r, { ok: 4, falhas: 0 });
  assert.deepStrictEqual(enviados.map(e => [e.grau, e.processos.map(p => p.codigo).join(',')]),
    [['1º grau', `${PG},${CS}`], ['2º grau', `${AP},${ED}`]]);
  const cs = enviados[0].processos[1];
  assert.equal(cs.principal, NUM, 'o cumprimento listado na ficha entra com o processo principal');
  assert.equal(cs.tipo, 'Incidente');
  assert.equal(enviados[0].parcial, true, 'F590 · toda entrega é parte: a rodada seguinte não a descarta como velha');
  assert.equal(enviados[0].pulados, 0);
});

test('rodada: o 1º grau que não está em recurso não faz consulta no 2º grau', async () => {
  const { pedidos, enviados } = await rodada([], 'Em andamento');
  assert.equal(pedidos.filter(u => u.startsWith('/cposg/') && /NUMPROC/.test(u)).length, 0);
  assert.deepStrictEqual(enviados.map(e => e.grau), ['1º grau']);
  assert.equal(pedidos.filter(u => u.startsWith(`/cpopg/show.do?processo.codigo=${CS}`)).length, 1, 'o cumprimento da ficha é lido uma vez');
});

test('F184 · a movimentação com documento leva o link para baixar; o ícone sem href não vira documento', () => {
  const html = `<table><tr class="fundoClaro containerMovimentacao"><td class="dataMovimentacao">02/10/2026</td><td><a class="linkMovVincProc" href="/cpopg/abrirDocumentoVinculadoMovimentacao.do?processo.codigo=A8Z05033C0000&amp;cdDocumento=987654&amp;nmRecursoAcessado=Senten%C3%A7a"><img></a></td><td class="descricaoMovimentacao"><a class="linkMovVincProc">Julgada Procedente a A&ccedil;&atilde;o</a></td></tr></table>`;
  const [m] = R.lerMovimentacoesHtml(html);
  assert.equal(m.texto, 'Julgada Procedente a Ação');
  assert.deepStrictEqual(m.docs, [{ id: '987654', nome: 'Julgada Procedente a Ação',
    url: '/cpopg/abrirDocumentoVinculadoMovimentacao.do?processo.codigo=A8Z05033C0000&cdDocumento=987654&nmRecursoAcessado=Senten%C3%A7a' }]);
  assert.equal(R.lerMovimentacoesHtml(MOVS_SG)[0].docs, undefined);
});

test('F186 · a pasta digital: o endereço da pasta e os documentos com as páginas, a data e o código', () => {
  const curta = `<html><body>https://esaj.tjsp.jus.br/pastadigital/abrirPastaProcessoDigital.do?nuProcesso=1000087-72.2018.8.26.0368&amp;cdProcesso=A8&amp;cdForo=368</body></html>`;
  assert.equal(R.urlDaPasta(curta), 'https://esaj.tjsp.jus.br/pastadigital/abrirPastaProcessoDigital.do?nuProcesso=1000087-72.2018.8.26.0368&cdProcesso=A8&cdForo=368');
  const pasta = `<script>var requestScope = [{"data":{"title":"Petição (Outras)","cdDocumento":"21186678","dtInclusao":"15/01/2018 21:10:14","flPeticaoInicial":"true"},"children":[
    {"data":{"title":"Página 1","parametros":"nuSeqRecurso=00000&cdDocumento=21186678&numInicial=1&numFinal=1"}},
    {"data":{"title":"Página 2","parametros":"nuSeqRecurso=00000&cdDocumento=21186678&numInicial=2&numFinal=2"}}]},
    {"data":{"title":"Volume 1"},"children":[{"data":{"title":"Sentença","cdDocumento":"999","dtInclusao":"02/03/2020 10:00:00"},"children":[
      {"data":{"title":"Página 80","parametros":"cdDocumento=999&numInicial=80&numFinal=80"}}]}]}]; var requestScopeArvoreSigilosos = [];</script>`;
  assert.deepStrictEqual(R.docsDaPasta(pasta), [
    { id: '21186678', nome: 'Petição (Outras)', data: '2018-01-15', hora: '21:10',
      paginas: ['nuSeqRecurso=00000&cdDocumento=21186678&numInicial=1&numFinal=1', 'nuSeqRecurso=00000&cdDocumento=21186678&numInicial=2&numFinal=2'] },
    { id: '999', nome: 'Sentença', data: '2020-03-02', hora: '10:00', paginas: ['cdDocumento=999&numInicial=80&numFinal=80'] }]);
  assert.deepStrictEqual(R.docsDaPasta('<html>sem pasta</html>'), []);
});

test('documentos só de processo não arquivado e com caso aberto no CRM', () => {
  const ativos = new Set(['1000087-72.2018.8.26.0368']);
  assert.ok(R.baixaDocs('Em andamento', '1000087-72.2018.8.26.0368', ativos));
  assert.ok(!R.baixaDocs('Arquivado', '1000087-72.2018.8.26.0368', ativos));          // arquivado
  assert.ok(!R.baixaDocs('Em andamento', '0004008-13.2005.8.26.0368', ativos));       // só da OAB/favoritos
  assert.ok(!R.baixaDocs('Em andamento', '1000087-72.2018.8.26.0368', null));         // CRM não respondeu
});

// ── a revisão de 14.11.2026 ────────────────────────────────────────────────
test('a anotação de arquivado é pelo código: o incidente arquivado não marca o principal', () => {
  assert.equal(R.chaveArq({ numero: NUM, codigo: CS }), 'cod:' + CS);
  assert.equal(R.chaveArq({ numero: NUM, codigo: null }), NUM, 'a entrada do CRM, sem código, segue por número');
  assert.notEqual(R.chaveArq({ numero: NUM, codigo: CS }), R.chaveArq({ numero: NUM, codigo: PG }));
});

test('o número do foro 0000 (nascido no tribunal) é consultado no 2º grau', () => {
  assert.equal(R.grauDoNumero('2000001-11.2026.8.26.0000'), '2º grau');
  assert.equal(R.grauDoNumero(NUM), '1º grau');
});

test('os erros que param a rodada casam com as mensagens do esaj.js', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'esaj.js'), 'utf8');
  const msgs = [...src.matchAll(/throw new Error\('([^']+)'\)/g)].map(m => m[1]);
  assert.equal(msgs.filter(R.erroDeSessao).length, 1);
  assert.equal(msgs.filter(R.erroDeTrava).length, 1);
  assert.ok(!R.erroDeSessao('o e-SAJ respondeu 500') && !R.erroDeTrava('o e-SAJ respondeu 500'));
});

test('a marca da pasta: muda com o movimento, e só vale com todo documento baixável guardado', () => {
  const [m] = R.lerMovimentacoesHtml(movs(false, 1));
  assert.notEqual(R.assinaturaMov(m), R.assinaturaMov({ ...m, texto: 'Outro' }));
  assert.equal(R.assinaturaMov(null), '');
  const vai = n => n !== 'Certidão';
  assert.ok(R.pastaInteira([{ nome: 'Sentença', caminho: 'x' }, { nome: 'Certidão' }], vai));
  assert.ok(!R.pastaInteira([{ nome: 'Sentença', caminho: 'x' }, { nome: 'Laudo' }], vai));
});

// cada número do CRM com a sua ficha e o seu código
const nums = n => Array.from({ length: n }, (_, i) => `00000${String(i + 10)}-11.2026.8.26.0368`);
const fichaDe = u => {
  const n = (decodeURIComponent(u).match(/valorConsultaNuUnificado=(\d{7}-\d{2}\.\d{4}\.8\.26\.\d{4})/) || [])[1];
  return n && { n, cod: 'PG' + n.slice(5, 7) };
};

test('rodada: todo processo lido vai em lote de 15; a última entrega leva só o resto, como parte', async () => {
  const antes = u => { const f = /^\/cpopg\/search\.do.*NUMPROC/.test(u) && fichaDe(u);
    return f ? { url: `https://esaj.tjsp.jus.br/cpopg/show.do?processo.codigo=${f.cod}`,
      html: `<span id="numeroProcesso">${f.n}</span><span id="labelSituacaoProcesso" class="unj-tag">Arquivado</span>` } : null; };
  const { r, enviados, gravado } = await rodada([], null, { numeros: nums(16), antes });
  assert.deepStrictEqual(r, { ok: 16, falhas: 0 });
  assert.deepStrictEqual(enviados.map(e => [e.processos.length, e.parcial]), [[15, true], [1, true]]);
  assert.ok(gravado.ultima_esaj, 'a data da última coleta só anda no fim');
});

test('rodada: a sessão caída entrega o que já leu, para e não mexe na data da coleta', async () => {
  let n = 0;
  const antes = u => (/^\/cpopg\/search\.do.*NUMPROC/.test(u) && ++n > 1 ? '<form action="/sajcas/login">Fazer login</form>' : null);
  const { r, pedidos, enviados, gravado } = await rodada([], 'Arquivado', { numeros: nums(4), antes });
  assert.match(r.erro, /sessão do e-SAJ caiu/);
  assert.equal(pedidos.filter(u => /^\/cpopg\/search\.do.*NUMPROC/.test(u)).length, 2, 'não insiste contra a tela de login');
  assert.equal(enviados.reduce((t, e) => t + e.processos.length, 0), 1, 'o processo já lido; o incidente dele ficava para o fim');
  assert.ok(enviados.every(e => e.parcial));
  assert.ok(!('ultima_esaj' in gravado) && !('ultima_esaj_full' in gravado));
});

test('rodada: o segundo clique com a rodada em curso não abre outro laço', async () => {
  const { r, pedidos } = await rodada([], 'Em andamento', { vezes: 2 });
  assert.deepStrictEqual(r, [{ ok: 2, falhas: 0 }, { ok: 'já em curso nesta aba', emCurso: true }]);
  assert.equal(pedidos.filter(u => u.startsWith('/tarefas-adv/')).length, 1);
});

test('rodada rápida: sem movimento novo a pasta digital não é reaberta; com movimento novo, é', async () => {
  const marca = R.assinaturaMov(R.lerMovimentacoesHtml(movs(false, 1))[0]);
  const pastas = async vista => (await rodada([], 'Em andamento', { guardado: { ultima_esaj_full: new Date().toISOString(), esaj_pasta_vista: vista } }))
    .pedidos.filter(u => u.includes('abrirPastaDigital') && u.includes(PG)).length;
  assert.equal(await pastas({ [PG]: marca }), 0);
  assert.equal(await pastas({ [PG]: 'outra' }), 1);
});

test('a marca da pasta só é gravada depois que a coleta do processo chega ao CRM', async () => {
  const marca = R.assinaturaMov(R.lerMovimentacoesHtml(movs(false, 1))[0]);
  const antes = u => (u.includes('abrirPastaDigital') ? 'https://esaj.tjsp.jus.br/pastadigital/abrirPastaProcessoDigital.do?cdProcesso=X'
    : u.startsWith('/pastadigital/abrirPastaProcessoDigital') ? '<script>var requestScope = [{"data":{"title":"Sentença","cdDocumento":"1","dtInclusao":"02/03/2020 10:00:00"},"children":[{"data":{"title":"Página 1","parametros":"cdDocumento=1"}}]}]; var requestScopeArvoreSigilosos = [];</script>' : null);
  const ok = await rodada([], 'Em andamento', { antes });
  assert.equal(ok.gravado.esaj_pasta_vista[PG], marca);
  assert.ok(!(PG in ok.gravado.esaj_pasta_pendente), 'F590 · entregue, a pasta deixa de estar pendente');
  const falhou = await rodada([], 'Em andamento', { antes, semCrm: true });
  assert.match(falhou.r.erro, /CRM fora do ar/);
  assert.ok(!(PG in falhou.gravado.esaj_pasta_vista), 'sem a entrega, a pasta volta na rodada seguinte');
  assert.equal(falhou.gravado.esaj_pasta_pendente[PG], 1, 'F590 · sem a entrega, a pasta inteira volta na rodada seguinte');
});

test('F590 · a RPV que aponta para o cumprimento vai ao CRM com o processo raiz como principal', async () => {
  const [C] = nums(1), RAIZ = '0009999-11.2020.8.26.0368', RV = 'PG10RPV000001';
  const antes = u => {
    if (u.includes('abrirPastaDigital')) return '<p>sem pasta</p>';
    if (/^\/cpopg\/search\.do.*NUMPROC/.test(u)) return { url: 'https://esaj.tjsp.jus.br/cpopg/show.do?processo.codigo=PG10',
      html: FICHA_INC.replace(/\(0000035-73\.2026\.8\.26\.0381\)/, `(${C})`).replace(/0000035-73\.2026\.8\.26\.0381/g, RAIZ) + BLOCO_INC.replace(CS, RV) };
    if (u.startsWith(`/cpopg/show.do?processo.codigo=${RV}`)) return FICHA_INC.replace(/0000035-73\.2026\.8\.26\.0381/g, C);
    return null;
  };
  const { enviados } = await rodada([], null, { numeros: [C], antes });
  const ps = enviados.flatMap(e => e.processos);
  assert.deepStrictEqual(ps.map(p => [p.codigo, p.principal]), [['PG10', RAIZ], [RV, RAIZ]]);
});
