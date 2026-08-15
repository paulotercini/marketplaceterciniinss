// Ajudantes do robô que dá para testar sem rede: números por caso, blocos por
// número, validade do crachá e a retomada ("já feito hoje").
const { test } = require('node:test');
const assert = require('node:assert');
const R = require('../robo.js');

test('numerosDe junta a lista e o número único antigo, sem repetir', () => {
  assert.deepEqual(R.numerosDe({ crps_nups: ['111', '222'], crps_nup: '333' }), ['111', '222', '333']);
  assert.deepEqual(R.numerosDe({ crps_nups: ['44234.156897/2020-17'] }), ['44234156897202017']);
  assert.deepEqual(R.numerosDe({ crps_nup: '111', crps_nups: ['111'] }), ['111']);
  assert.deepEqual(R.numerosDe({ crps_nups: [], crps_nup: null }), []);
});

test('blocosPorNup aceita lista nova e o objeto único antigo', () => {
  const lista = R.blocosPorNup([{ nup: '111', status: 'a' }, { nup: '222', status: 'b' }]);
  assert.equal(lista.get('111').status, 'a');
  assert.equal(lista.get('222').status, 'b');
  const antigo = R.blocosPorNup({ nup: '333', status: 'c' });   // formato antigo (objeto)
  assert.equal(antigo.get('333').status, 'c');
  assert.equal(R.blocosPorNup(null).size, 0);
});

test('validadeToken lê o exp de dentro do JWT', () => {
  const daquiA10min = Math.floor(Date.now() / 1000) + 600;
  const payload = Buffer.from(JSON.stringify({ exp: daquiA10min })).toString('base64')
    .replace(/=+$/, '');
  const jwt = `cabecalho.${payload}.assinatura`;
  const exp = R.validadeToken(jwt);
  assert.ok(exp > Date.now());
  assert.ok(Math.abs(exp - (daquiA10min * 1000)) < 1000);
});

test('validadeToken devolve null se não for um JWT legível', () => {
  assert.equal(R.validadeToken('não-é-jwt'), null);
  assert.equal(R.validadeToken(''), null);
  assert.equal(R.validadeToken(null), null);
});

test('consultadoHoje reconhece um bloco consultado hoje e ignora o de ontem', () => {
  const hojeISO = new Date().toISOString();
  const ontem = new Date(Date.now() - 36 * 3600e3).toISOString();
  assert.equal(R.consultadoHoje({ consultado_em: hojeISO }), true);
  assert.equal(R.consultadoHoje({ consultado_em: ontem }), false);
  assert.equal(R.consultadoHoje({}), false);
  assert.equal(R.consultadoHoje(null), false);
});
