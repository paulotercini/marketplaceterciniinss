// O acórdão sumiu da ficha, mas não do balde: o caminho é previsível
// (`crps/<nup>/<marca>_<nome>.pdf`), e é por ele que o arquivo volta ao
// evento a que pertence. Foi assim que 47 recursos foram recuperados depois
// que a tela reescreveu os blocos por cima.
const { test } = require('node:test');
const assert = require('node:assert');

const { guardadosDoNup } = require('../recolar_acordaos.js');

test('lê a marca do nome do arquivo e monta o caminho completo', async () => {
  const antes = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    text: async () => JSON.stringify([
      { name: '73189593_acordao-25a-junta.pdf', metadata: { size: 184320 } },
      { name: '73189600_monocratica.pdf', metadata: { size: 51200 } },
      { name: 'sub/', metadata: null },                     // pasta: ignora
    ]),
  });
  try {
    const m = await guardadosDoNup('44234156897202017');
    assert.equal(m.size, 2, 'a pasta entrou como se fosse arquivo');
    assert.deepEqual(m.get('73189593'), {
      caminho: 'crps/44234156897202017/73189593_acordao-25a-junta.pdf', bytes: 184320 });
    assert.equal(m.get('73189600').bytes, 51200);
  } finally { globalThis.fetch = antes; }
});

test('balde vazio não inventa caminho', async () => {
  const antes = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, text: async () => '[]' });
  try {
    assert.equal((await guardadosDoNup('123')).size, 0);
  } finally { globalThis.fetch = antes; }
});
