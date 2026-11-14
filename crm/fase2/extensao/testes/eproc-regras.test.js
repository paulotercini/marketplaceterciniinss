// As regras de leitura do eproc TJSP (eproc-regras.js), contra HTML com a
// MESMA estrutura vista ao vivo em 14.09.2026 na Relação de Processos e na
// tela do processo — classes, ids e formatos idênticos; nomes, fictícios.
const test = require('node:test');
const assert = require('node:assert');
const R = require('../eproc-regras.js');

const LINHA = n => `<tr class="infraTrClara" data-classe="000229"><td valign="top"><a id="lnkInfraID-6117|1|NAO"></a><input class="infraCheckbox" type="checkbox" value="6117|1|NAO"></td><td> <a href="controlador.php?acao=processo_selecionar&amp;num_processo=x&amp;hash=abc">${n}</a><br>MATJCC01<br></td><td>CUMPRIMENTO DE SENTENÇA<br></td><td>FULANA DE TAL<br><br></td><td>BANCO TAL S.A.<br>OUTRO REU<br></td><td>Matão</td><td>Bancários</td><td>Decorrido prazo</td><td>12/09/2026 06:01:25</td><td>15/09/2025 00:15:04</td><td>R$ 7.657,71</td></tr>`;
// o cabeçalho tem tabelas ANINHADAS (as setas de ordenação) — é o que
// derruba um recorte ingênuo de <table>…</table>
const CABECALHO = '<table class="infraTable"><tr><th class="infraTh"><a></a></th><th class="infraTh"><table class="infraTableOrdenacao"><tr><td class="infraTdSetaOrdenacao"><a></a></td><td rowspan="2" class="infraTdRotuloOrdenacao">Número Processo</td></tr></table></th><th class="infraTh"><table><tr><td class="infraTdRotuloOrdenacao">Classe</td></tr></table></th><th class="infraTh">Autores Principais</th><th class="infraTh">Réu(s)</th><th class="infraTh">Localidade Judicial</th><th class="infraTh">Assunto</th><th class="infraTh">Último Evento</th><th class="infraTh">Data/Hora Ult. Evento</th><th class="infraTh">Data/Hora Autuação</th><th class="infraTh">Valor da Causa</th></tr>';
const pagina = linhas => `<html><body><form id="frmProcessoLista"><div>Lista de Processos (7 registros)</div>${CABECALHO}${linhas}</table></form></body></html>`;

test('lê a linha da relação pelo cabeçalho: número, sigla, classe, partes, órgão, datas e último evento', () => {
  const [p] = R.lerAcervoHtml(pagina(LINHA('0002454-08.2025.8.26.0347')));
  assert.equal(p.numero, '0002454-08.2025.8.26.0347');
  assert.equal(p.sigla, 'MATJCC01');
  assert.equal(p.classe, 'CUMPRIMENTO DE SENTENÇA');
  assert.equal(p.partes, 'FULANA DE TAL X BANCO TAL S.A. | OUTRO REU');
  assert.equal(p.orgao, 'Matão · MATJCC01');
  assert.equal(p.distribuido, '2025-09-15');
  assert.deepStrictEqual(p.movimento, { data: '2026-09-12', hora: '06:01', texto: 'Decorrido prazo' });
  assert.equal(p.id, null); assert.equal(p.ca, null);
  // F95 · o endereço do processo aberto sai do <a> do número, com as
  // entidades desfeitas (&amp; → &), relativo ao host da relação
  assert.equal(p.link_rel, 'controlador.php?acao=processo_selecionar&num_processo=x&hash=abc');
});

test('a coluna "Último Evento" não é confundida com a da data do evento, em qualquer ordem', () => {
  const trocado = CABECALHO.replace('<th class="infraTh">Último Evento</th><th class="infraTh">Data/Hora Ult. Evento</th>',
                                    '<th class="infraTh">Data do Último Evento</th><th class="infraTh">Último Evento</th>');
  const linha = LINHA('0002454-08.2025.8.26.0347').replace('<td>Decorrido prazo</td><td>12/09/2026 06:01:25</td>',
                                                           '<td>12/09/2026 06:01:25</td><td>Decorrido prazo</td>');
  const [p] = R.lerAcervoHtml(`<html><body>${trocado}${linha}</table></body></html>`);
  assert.deepStrictEqual(p.movimento, { data: '2026-09-12', hora: '06:01', texto: 'Decorrido prazo' });
});

test('a página deduplica o processo repetido, ficando o movimento mais novo', () => {
  const novo = LINHA('0002454-08.2025.8.26.0347').replace('12/09/2026 06:01:25', '13/09/2026 08:00:00');
  const lista = R.lerAcervoHtml(pagina(LINHA('0002454-08.2025.8.26.0347') + novo + LINHA('0000542-39.2026.8.26.0347')));
  assert.equal(lista.length, 2);
  assert.equal(lista[0].movimento.data, '2026-09-13');
});

test('total de registros: número, "Nenhum registro" e página sem relação', () => {
  assert.equal(R.totalRegistros(pagina('')), 7);
  assert.equal(R.totalRegistros('<p>Nenhum registro encontrado.</p>'), 0);
  assert.equal(R.totalRegistros('<p>login</p>'), null);
});

// a capa: id ora com aspas simples, ora sem; a busca do topo repete o id num
// <input> vazio; o órgão carrega um onmouseover com HTML dentro do atributo
const CAPA = `<input type="search" id='txtNumProcesso' placeholder="Nº de processo"><span id=\'txtNumProcesso\' class="">0002454-08.2025.8.26.0347</span>`
  + `<span id=txtClasse tabindex="0"> CUMPRIMENTO DE SENTENÇA</span>`
  + `<span id="txtOrgaoJulgador" class="x" onmouseover="return infraTooltipMostrar(\'<div>Fone: (16) 3221</div>\',\'Órgão\');">Juízo Titular I - Vara do Juizado Especial Cível e Criminal da Comarca de Matão</span>`
  + `<table id="tblEventos"><tr><th>Evento</th></tr><tr id="trEvento73" class="infraTrClara"><td><span>73</span></td><td>12/09/2026 06:01:25</td><td><label class="infraEventoDescricao">Decorrido prazo - Refer. ao Evento: 70</label></td><td>SECFP</td><td>Evento não gerou documento</td></tr>`
  + `<tr id="trEvento69"><td>69</td><td>08/09/2026 13:31:54</td><td><label class="infraEventoDescricao">Despacho</label></td><td>J12796</td><td><a class="infraLinkDocumento" href="controlador.php?acao=acessar_documento&amp;doc=731&amp;evento=69&amp;key=ab">DESPADEC1</a> <a class="infraLinkDocumento" href="y">PLANILHA2</a></td></tr></table>`;

test('a capa do processo: número, classe e órgão julgador, apesar do id repetido e do tooltip no atributo', () => {
  assert.deepStrictEqual(R.lerCabecalhoProcesso(CAPA), {
    numero: '0002454-08.2025.8.26.0347', classe: 'CUMPRIMENTO DE SENTENÇA',
    orgao: 'Juízo Titular I - Vara do Juizado Especial Cível e Criminal da Comarca de Matão', situacao: null });
});

test('a lista de eventos: um item por trEvento, com data, hora, descrição e documentos', () => {
  const ev = R.lerEventosHtml(CAPA);
  assert.equal(ev.length, 2);
  assert.deepStrictEqual(ev[0], { evento: 73, data: '2026-09-12', hora: '06:01', textos: ['Decorrido prazo - Refer. ao Evento: 70'], docs: [] });
  assert.deepStrictEqual(ev[1].docs, [
    { id: '731', nome: 'DESPADEC1', url: 'controlador.php?acao=acessar_documento&doc=731&evento=69&key=ab' },
    { id: '69:PLANILHA2', nome: 'PLANILHA2', url: 'y' }]);
});

// A RODADA com o eproc fingido: o eproc.js roda num contexto à parte.
const vm = require('vm');
const fs = require('fs');
const path = require('path');
function rodadaEproc({ html, tela = {}, busca = '', vezes = 1 }) {
  const gravado = {}, pedidos = [], guardar = [];
  const nada = () => {};
  const ids = { frmProcessoLista: { action: '/lista' }, selInfraUnidades: {}, ...tela };
  const ctx = { EPROC_REGRAS: R, Date, Promise, AbortSignal, TextDecoder, URLSearchParams, URL, pausa: async () => {},
    location: { host: 'eproc1g-crim.tjsp.jus.br', search: busca, href: 'https://eproc1g-crim.tjsp.jus.br/x' },
    document: { getElementById: id => ids[id] || null, querySelector: () => null, documentElement: { outerHTML: html } },
    FormData: class { delete() {} set() {} }, sessionStorage: { getItem: () => null, setItem: nada, removeItem: nada },
    DOCS_REGRAS: { vaiBaixar: () => true },
    fetch: async u => { pedidos.push(u); return { ok: true, status: 200, headers: { get: () => '' }, arrayBuffer: async () => Buffer.from(html, 'latin1'), text: async () => html }; },
    setTimeout: f => { f(); return 0; }, faixa: nada, faixaOk: nada, faixaErr: nada, someFaixa: nada,
    chrome: { storage: { local: { get: async () => ({}), set: async o => { Object.assign(gravado, o); } } } },
    CRM: { enviar: async () => true, pedir: async m => { pedidos.push(m.acao + ':' + m.prefixo); return { nomes: [] }; },
           guardarDocs: async (o, n, d, x) => { guardar.push(x); return 0; } } };
  ctx.window = ctx; ctx.top = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'eproc.js'), 'utf8'), ctx);
  return Promise.all(Array.from({ length: vezes }, () => ctx.window.crmRodar()))
    .then(rs => JSON.parse(JSON.stringify({ rs, gravado, pedidos, guardar: guardar.map(x => !!(x && x.existentes)) })));
}
const VAZIA = '<form id="frmProcessoLista"><p>Nenhum registro encontrado.</p></form>';

test('rodada: o host sem processo grava a data da coleta', async () => {
  const { rs, gravado } = await rodadaEproc({ html: VAZIA });
  assert.deepStrictEqual(rs, [{ ok: 0 }]);
  assert.ok(gravado.ultima_eproc && gravado['ultima_eproc_eproc1g-crim.tjsp.jus.br']);
});

test('rodada: o segundo clique com a rodada em curso não abre outro laço', async () => {
  const { rs, pedidos } = await rodadaEproc({ html: VAZIA, vezes: 2 });
  assert.deepStrictEqual(rs, [{ ok: 0 }, { ok: 'já em curso nesta aba', emCurso: true }]);
  assert.equal(pedidos.length, 1);
});

test('processo aberto: o "já tenho?" vai numa listagem só, entregue ao guardarDocs', async () => {
  const { pedidos, guardar } = await rodadaEproc({ html: CAPA, tela: { tblEventos: {} }, busca: '?acao=processo_selecionar' });
  assert.deepStrictEqual(pedidos, ['docs-existentes:eproc/00024540820258260347/']);
  assert.deepStrictEqual(guardar, [true]);
});
