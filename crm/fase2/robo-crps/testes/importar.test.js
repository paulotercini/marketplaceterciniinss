// Importador dos favoritos: leitura do HTML e o casamento com o cadastro.
const { test } = require('node:test');
const assert = require('node:assert');
const I = require('../importar_favoritos.js');

const HTML = `
<DT><A HREF="https://consultaprocessos.inss.gov.br/e/p/44234156897202017" ADD_DATE="1" ICON="data:image/png;base64,AAAA">ALESSANDRO FRANCISCO RODRIGUES</A>
<DT><A HREF="https://consultaprocessos.inss.gov.br/e/p/44233469639202008" ICON="x">Ana Justina da Silva (Acesso com a senha do cliente)</A>
<DT><A HREF="https://consultaprocessos.inss.gov.br/e/p/44236480569202434">ALEXANDRE FRANCISCO SILVA</A>
<DT><A HREF="https://esaj.tjsp.jus.br/algo">Um processo do TJ</A>
<DT><A HREF="https://consultaprocessos.inss.gov.br/e/p/44236480569202434">ALEXANDRE FRANCISCO SILVA</A>`;

test('lê nup + nome só dos links do e-Recursos', () => {
  const favs = I.parseFavoritos(HTML);
  assert.equal(favs.length, 3);               // ignora o TJ e a repetição
  assert.deepEqual(favs[0], { nup: '44234156897202017', nome: 'ALESSANDRO FRANCISCO RODRIGUES', senhaCliente: false });
});

test('marca "senha do cliente" e tira a observação do nome', () => {
  const fav = I.parseFavoritos(HTML).find(f => f.nup === '44233469639202008');
  assert.equal(fav.senhaCliente, true);
  assert.equal(fav.nome, 'Ana Justina da Silva');   // sem o "(Acesso com...)"
});

test('normalizarNome ignora acento, caixa e pontuação', () => {
  assert.equal(I.normalizarNome('José da Silva-Júnior'), 'JOSE DA SILVA JUNIOR');
  assert.equal(I.normalizarNome('  MARIA   DAS  DORES '), 'MARIA DAS DORES');
});

// ── o casamento ─────────────────────────────────────────────────────────────
const CLIENTES = [
  { id: 'c1', nome: 'Alessandro Francisco Rodrigues' },
  { id: 'c2', nome: 'Alexandre Francisco Silva' },
  { id: 'c3', nome: 'Ana Justina da Silva' },
  { id: 'c4', nome: 'Carlos Multi' },
  { id: 'c5', nome: 'Sem Caso' },
  { id: 'c6a', nome: 'Nome Repetido' }, { id: 'c6b', nome: 'Nome Repetido' },
];
const CASOS = [
  { id: 'k1', cliente_id: 'c1', fase: 'inss', beneficio: 'Aposentadoria', crps_nup: null },
  { id: 'k2', cliente_id: 'c2', fase: 'inss', beneficio: 'Auxílio', crps_nup: '44236480569202434' }, // já tem
  { id: 'k4a', cliente_id: 'c4', fase: 'inss', beneficio: 'A', crps_nup: null },
  { id: 'k4b', cliente_id: 'c4', fase: 'judicial', beneficio: 'B', crps_nup: null },
  { id: 'k5', cliente_id: 'c5', fase: 'encerrado', beneficio: 'Velho', crps_nup: null },
  { id: 'k6', cliente_id: 'c6a', fase: 'inss', beneficio: 'X', crps_nup: null },
];
const FAVS = [
  { nup: '44234156897202017', nome: 'ALESSANDRO FRANCISCO RODRIGUES', senhaCliente: false },
  { nup: '44236480569202434', nome: 'ALEXANDRE FRANCISCO SILVA', senhaCliente: false },
  { nup: '44233469639202008', nome: 'Ana Justina da Silva', senhaCliente: true },
  { nup: '11111111111111111', nome: 'CARLOS MULTI', senhaCliente: false },
  { nup: '22222222222222222', nome: 'SEM CASO', senhaCliente: false },
  { nup: '33333333333333333', nome: 'NOME REPETIDO', senhaCliente: false },
  { nup: '44444444444444444', nome: 'FULANO INEXISTENTE', senhaCliente: false },
];

test('vincula o cliente com um caso ativo só', () => {
  const p = I.planejar(FAVS, CLIENTES, CASOS);
  assert.equal(p.aplicar.length, 1);
  assert.equal(p.aplicar[0].caso.id, 'k1');
  assert.equal(p.aplicar[0].nup, '44234156897202017');
});

test('senha do cliente sai do robô (vai para o André)', () => {
  const p = I.planejar(FAVS, CLIENTES, CASOS);
  assert.equal(p.senhaCliente.length, 1);
  assert.equal(p.senhaCliente[0].nome, 'Ana Justina da Silva');
});

test('não mexe em quem já tem o número', () => {
  const p = I.planejar(FAVS, CLIENTES, CASOS);
  assert.equal(p.jaTem.length, 1);
  assert.equal(p.jaTem[0].nome, 'ALEXANDRE FRANCISCO SILVA');
});

test('vários casos = decisão humana, não chuta', () => {
  const p = I.planejar(FAVS, CLIENTES, CASOS);
  assert.equal(p.multiplosCasos.length, 1);
  assert.equal(p.multiplosCasos[0].casos.length, 2);
});

test('sem caso ativo, nome repetido e cliente inexistente são reportados, não gravados', () => {
  const p = I.planejar(FAVS, CLIENTES, CASOS);
  assert.equal(p.semCaso.length, 1);
  assert.equal(p.nomeDuplicado.length, 1);
  assert.equal(p.semCliente.length, 1);
  assert.equal(p.semCliente[0].nome, 'FULANO INEXISTENTE');
});
