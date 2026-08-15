// Junta de Recursos ou Câmara de Julgamento não é detalhe de catálogo: da
// Junta ainda cabe Recurso Especial em 30 dias; da Câmara acabou a via
// administrativa. Errar isso é perder prazo ou entrar com recurso que não
// existe. Os textos abaixo são recortes dos acórdãos reais das fichas.
const { test } = require('node:test');
const assert = require('node:assert');
const T = require('../traduzir.js');
const { decisoes } = require('../marcar_orgao.js');

test('lê a sigla do e-Recursos, JR e CAJ', () => {
  assert.deepStrictEqual(T.orgaoJulgador('Conhecer do Recurso e negar-lhe provimento - Acórdão: 25ª JR/3080/2025'),
    { nome: '25ª Junta de Recursos', sigla: '25ª JR', instancia: 1 });
  assert.deepStrictEqual(T.orgaoJulgador('Decisão Monocrática Nº: 2ª CAJ/1474/2026'),
    { nome: '2ª Câmara de Julgamento', sigla: '2ª CaJ', instancia: 2 });
  // "01ª JR" e "1ª JR" são a mesma Junta — o zero à esquerda não pode virar
  // um órgão diferente na tela
  assert.equal(T.orgaoJulgador('Acórdão: 01ª JR/1228/2026').nome, '1ª Junta de Recursos');
  assert.equal(T.orgaoJulgador('Distribuído ao conselheiro relator'), null);
});

test('composição adjunta não muda a instância — vale a Junta', () => {
  const o = T.orgaoDoAcordao(
    'Vistos e relatados os presentes autos, em sessão realizada em 12/11/2025, ACORDAM os '
    + 'membros da 2ª Composição Adjunta da 10ª Junta de Recursos, em CONHECER DO RECURSO E '
    + 'DAR-LHE PROVIMENTO, nos termos do voto do(a) Relator(a).');
  assert.deepStrictEqual(o, { nome: '10ª Junta de Recursos', sigla: '10ª JR', instancia: 1 });
});

test('acórdão de Câmara sai como 2ª instância', () => {
  const o = T.orgaoDoAcordao(
    'Vistos e relatados os presentes autos, em sessão realizada em 16/07/2026, ACORDAM os '
    + 'membros da 4ª Câmara de Julgamento, em CONHECER DO RECURSO E DAR-LHE PROVIMENTO.');
  assert.equal(o.nome, '4ª Câmara de Julgamento');
  assert.equal(o.instancia, 2);
});

test('a monocrática se identifica pela homologação do presidente', () => {
  const o = T.orgaoDoAcordao(
    'Decisão Monocrática Nº: 2ª CAJ/1474/2026 O (a) Presidente do(a) 2ª Câmara de Julgamento, '
    + 'HOMOLOGA a decisão monocrática nos termos do art. 60.');
  assert.equal(o.nome, '2ª Câmara de Julgamento');
});

test('sem a assinatura do colegiado, vale o timbre do cabeçalho', () => {
  const o = T.orgaoDoAcordao(
    'MINISTÉRIO DA PREVIDÊNCIA SOCIAL - MPS CONSELHO DE RECURSOS DA PREVIDÊNCIA SOCIAL - CRPS '
    + '23ª Junta de Recursos Data/Hora: 13/02/2026 15:54:46 Número do protocolo ...');
  assert.equal(o.nome, '23ª Junta de Recursos');
});

// TRÊS ARMADILHAS REAIS. O acórdão de JUNTA avisa que cabe recurso "às
// Câmaras de Julgamento", cita a Câmara que uniformizou a jurisprudência, e
// tem conselheiro chamado CUNHA CAMARA. Procurar "câmara" solto no texto
// inteiro promoveria o caso para a 2ª instância e sumiria com o prazo de 30
// dias do recurso especial.
test('acórdão de Junta que FALA de Câmara continua sendo de Junta', () => {
  const texto = 'MPS CONSELHO DE RECURSOS DA PREVIDÊNCIA SOCIAL - CRPS 05ª Junta de Recursos '
    + 'Data/Hora: 17/01/2025 21:38:12 ... Divergência jurisprudencial entre as Câmaras de '
    + 'Julgamento no que tange à conversão de tempo especial. Participaram do julgamento os '
    + 'Conselheiros NEURACY CUNHA CAMARA. Vistos e relatados os presentes autos, em sessão '
    + 'realizada em 16/01/2025, ACORDAM os membros da 05ª Junta de Recursos, em CONHECER DO '
    + 'RECURSO E NEGAR-LHE PROVIMENTO. Caso a recorrente não concorde com esta decisão, poderá '
    + 'interpor Recurso Especial às Câmaras de Julgamento no prazo de 30 dias.';
  const o = T.orgaoDoAcordao(texto);
  assert.equal(o.nome, '5ª Junta de Recursos');
  assert.equal(o.instancia, 1, 'promoveu o caso para a 2ª instância por causa do aviso de prazo');
});

test('texto sem órgão nenhum devolve nulo — não chuta', () => {
  assert.equal(T.orgaoDoAcordao('Relatório e voto. É como voto.'), null);
  assert.equal(T.orgaoDoAcordao(''), null);
});

// ── a fila do marcar_orgao ─────────────────────────────────────────────────
const caso = (arquivos) => ({ id: 'k1', crps: [{ nup: '44234156897202017', eventos: [
  { bruto: 'Conhecer do Recurso e negar-lhe provimento - Acórdão: 25ª JR/3080/2025', arquivos },
] }] });

test('a fila pega só decisão, e o órgão escrito à mão nunca é refeito', () => {
  const k = caso([
    { id: '1', nome: 'ACÓRDÃO.pdf', storage: 's1', decide: true },
    { id: '2', nome: 'Remuneracoes.pdf', storage: 's2', decide: false },
    { id: '3', nome: 'ACÓRDÃO2.pdf', storage: 's3', decide: true,
      orgao: { nome: '4ª Câmara de Julgamento', instancia: 2, origem: 'curado' } },
    { id: '4', nome: 'ACÓRDÃO3.pdf', storage: 's4', decide: true,
      orgao: { nome: '2ª Junta de Recursos', instancia: 1, origem: 'auto' } },
  ]);
  assert.deepStrictEqual(decisoes([k]).map(x => x.arquivo.id), ['1']);
  // --refazer alcança o automático, nunca o curado
  assert.deepStrictEqual(decisoes([k], { refazer: true }).map(x => x.arquivo.id), ['1', '4']);
});

test('a fila leva o status junto — é a rede quando não há PDF', () => {
  const f = decisoes([caso([{ id: '1', nome: 'ACÓRDÃO.pdf', decide: true }])]);
  assert.equal(f.length, 1);
  assert.equal(T.orgaoJulgador(f[0].bruto).nome, '25ª Junta de Recursos');
});
