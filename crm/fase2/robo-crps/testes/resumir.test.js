// O resumo do acórdão é conteúdo jurídico com o nome do escritório. Estes
// testes travam as três coisas que não podem falhar: não tocar no que foi
// escrito à mão, não deixar passar dado médico, e recusar o que veio torto.
const { test } = require('node:test');
const assert = require('node:assert');
const R = require('../resumir.js');

const caso = (arquivos) => ({ id: 'k1', crps: [{ nup: '44234156897202017', eventos: [
  { data: '2026-03-18T08:44:54', resumo: 'Recurso PROVIDO', arquivos },
] }] });

test('a fila pega só o que decide e já está guardado', () => {
  const k = caso([
    { id: '1', nome: 'ACÓRDÃO.pdf', storage: 'crps/x/1', decide: true },
    { id: '2', nome: 'Remuneracoes.pdf', storage: 'crps/x/2', decide: false },
    { id: '3', nome: 'ACÓRDÃO2.pdf', decide: true },              // sem storage
  ]);
  const f = R.alvos([k]);
  assert.equal(f.length, 1);
  assert.equal(f[0].marca, '1');
  assert.equal(f[0].nup, '44234156897202017');
});

test('resumo escrito à mão nunca entra na fila, nem com --refazer', () => {
  const k = caso([{ id: '1', nome: 'ACÓRDÃO.pdf', storage: 'crps/x/1', decide: true,
    resumo: { linhas: ['Reconheceu o tempo especial'], origem: 'curado' } }]);
  assert.equal(R.alvos([k]).length, 0);
  assert.equal(R.alvos([k], { refazer: true }).length, 0);
});

test('resumo automático fica quieto, mas volta com --refazer', () => {
  const k = caso([{ id: '1', nome: 'ACÓRDÃO.pdf', storage: 'crps/x/1', decide: true,
    resumo: { linhas: ['Negou o recurso'], origem: 'auto' } }]);
  assert.equal(R.alvos([k]).length, 0);
  assert.equal(R.alvos([k], { refazer: true }).length, 1);
});

// ── a barreira ─────────────────────────────────────────────────────────────
test('aceita o resumo bem formado', () => {
  const v = R.validarResumo({ conseguiu: true, motivo: '', linhas: [
    'Reconheceu como especiais os períodos de 01/01/2000 a 10/03/2002 e de 15/05/2005 a 20/08/2009',
    'Não reconheceu o direito à aposentadoria por tempo de contribuição',
    'Determinou a averbação do tempo reconhecido',
  ] });
  assert.equal(v.ok, true);
  assert.equal(v.linhas.length, 3);
});

test('recusa quando a máquina não teve certeza', () => {
  const v = R.validarResumo({ conseguiu: false, linhas: [], motivo: 'dispositivo ilegível' });
  assert.equal(v.ok, false);
  assert.match(v.motivo, /ileg/);
});

test('recusa linha que não começa pelo verbo fechado', () => {
  const v = R.validarResumo({ conseguiu: true, motivo: '', linhas: ['O colegiado entendeu que havia direito'] });
  assert.equal(v.ok, false);
  assert.match(v.motivo, /fora do formato/);
});

test('BARREIRA: dado de saúde não passa, mesmo em linha bem formada', () => {
  for (const l of ['Reconheceu a incapacidade decorrente de hérnia de disco (CID M51)',
                   'Determinou nova perícia por causa do diagnóstico de depressão',
                   'Reconheceu o direito conforme o laudo pericial de 10/03/2026']) {
    const v = R.validarResumo({ conseguiu: true, motivo: '', linhas: [l] });
    assert.equal(v.ok, false, `passou dado médico: ${l}`);
  }
});

test('a versão sem motivo médico é aceita', () => {
  const v = R.validarResumo({ conseguiu: true, motivo: '',
    linhas: ['Reconheceu a incapacidade a partir de 10/03/2026'] });
  assert.equal(v.ok, true);
});

test('recusa quando vem texto demais', () => {
  const l = 'Determinou a averbação';
  const v = R.validarResumo({ conseguiu: true, motivo: '', linhas: [l, l, l, l, l] });
  assert.equal(v.ok, false);
  assert.match(v.motivo, /teto/);
});

test('recusa quando volta sem linha nenhuma', () => {
  assert.equal(R.validarResumo({ conseguiu: true, linhas: [], motivo: '' }).ok, false);
  assert.equal(R.validarResumo(null).ok, false);
});

// ── gravação ───────────────────────────────────────────────────────────────
test('grava o resumo no arquivo certo, sem tocar nos vizinhos', () => {
  const crps = [
    { nup: '44234156897202017', eventos: [{ arquivos: [
      { id: '1', nome: 'A.pdf', storage: 's1' }, { id: '2', nome: 'B.pdf', storage: 's2' }] }] },
    { nup: '44233474809202068', eventos: [{ arquivos: [{ id: '1', nome: 'C.pdf', storage: 's3' }] }] },
  ];
  R.aplicarResumo(crps, '44234.156897/2020-17', '1', { linhas: ['Negou o recurso'], origem: 'auto' });
  assert.deepStrictEqual(crps[0].eventos[0].arquivos[0].resumo.linhas, ['Negou o recurso']);
  assert.equal(crps[0].eventos[0].arquivos[1].resumo, undefined, 'sujou o arquivo vizinho');
  assert.equal(crps[1].eventos[0].arquivos[0].resumo, undefined, 'sujou o outro recurso do caso');
});

test('as regras mandadas ao Claude proíbem dado médico e exigem o dispositivo', () => {
  assert.match(R.REGRAS, /DISPOSITIVO/);
  assert.match(R.REGRAS, /CID/);
  assert.match(R.REGRAS, /conseguiu=false/);
  assert.equal(R.ESQUEMA.additionalProperties, false);
  assert.deepStrictEqual(R.ESQUEMA.required, ['conseguiu', 'linhas', 'motivo']);
});

// "laudo" sozinho barrava linha legítima: no previdenciário, laudo técnico e
// laudo extemporâneo são prova de ruído e agente nocivo, não dado de saúde.
test('laudo TÉCNICO passa; laudo MÉDICO não', () => {
  const passa = R.validarResumo({ conseguiu: true, motivo: '', linhas:
    ['Não reconheceu como especial o período de 14/05/1991 a 16/01/1998 — laudo extemporâneo sem as informações exigidas'] });
  assert.equal(passa.ok, true, passa.motivo);
  for (const l of ['Reconheceu a incapacidade conforme o laudo médico',
                   'Determinou nova análise do laudo pericial',
                   'Manteve a decisão com base no laudo do perito']) {
    assert.equal(R.validarResumo({ conseguiu: true, motivo: '', linhas: [l] }).ok, false, `passou: ${l}`);
  }
});
