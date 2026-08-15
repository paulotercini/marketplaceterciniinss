// A parte da sonda que dá para testar sem gov.br: ler o nups.txt e
// entender o crachá do login.
const { test } = require('node:test');
const assert = require('node:assert');
const { lerNups, candidatosDeToken } = require('../sonda.js');

test('lê a URL inteira do favorito', () => {
  assert.deepStrictEqual(
    lerNups('https://consultaprocessos.inss.gov.br/e/p/44233139765202537'),
    ['44233139765202537']);
});

test('lê o número puro', () => {
  assert.deepStrictEqual(lerNups('44233139765202537'), ['44233139765202537']);
});

test('mistura de linhas, comentários e repetição', () => {
  const txt = ['# comentário', '', 'https://consultaprocessos.inss.gov.br/e/p/44233139765202537',
    '44233139765202537', '44236480569202434', 'linha sem nada'].join('\n');
  assert.deepStrictEqual(lerNups(txt), ['44233139765202537', '44236480569202434']);
});

test('não confunde telefone ou data com processo', () => {
  assert.deepStrictEqual(lerNups('ligar 16999990001 dia 10/03/2026'), []);
});

test('crachá cru vira candidato, e cookie-só vem primeiro', () => {
  assert.deepStrictEqual(candidatosDeToken('abc.def.ghi'), [null, 'abc.def.ghi']);
});

test('crachá em JSON solta o campo de dentro', () => {
  const c = candidatosDeToken('{"access_token":"tk1","outra":"x"}');
  assert.ok(c.includes('tk1') && c[0] === null);
});

test('sem crachá nenhum, ainda tenta o cookie', () => {
  assert.deepStrictEqual(candidatosDeToken(null), [null]);
});
