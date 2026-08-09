// Dois defeitos reais moram aqui, e os dois eram MUDOS:
//
// 1. Perguntar pela coluna errada. `crps` é o RESULTADO da consulta;
//    `crps_nups` é o número A consultar. Pedir o resultado devolve lista
//    vazia, não erro.
// 2. Perguntar sem ter entrado. `casos` tem RLS com política só para quem
//    entrou, então a chave anônima recebe 200 com lista VAZIA. Ficava
//    idêntico a "não há recurso nenhum cadastrado".
//
// Nos dois casos a extensão anunciava com convicção que o escritório não
// tinha recurso nenhum. Estes testes existem para nenhum dos dois voltar.
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { pathToFileURL } = require('url');

const MOD = pathToFileURL(path.join(__dirname, '..', 'crm-api.js')).href;

// cada teste quer o módulo com estado limpo (o crachá fica em memória)
let n = 0;
async function carregar({ guardado = {}, respostas = [] } = {}) {
  const pedidos = [];
  const memoria = { url: 'https://x.supabase.co/', chave: 'anon', ...guardado };
  globalThis.chrome = {
    storage: {
      local: {
        get: async ks => Object.fromEntries(
          (Array.isArray(ks) ? ks : [ks]).map(k => [k, memoria[k]])),
        set: async o => Object.assign(memoria, o),
        remove: async ks => (Array.isArray(ks) ? ks : [ks]).forEach(k => delete memoria[k]),
      },
    },
  };
  globalThis.fetch = async (u, o = {}) => {
    pedidos.push({ url: String(u), opcoes: o });
    const r = respostas.shift() || { ok: true, status: 200, corpo: [] };
    return { ok: r.ok !== false, status: r.status || 200,
             json: async () => r.corpo, text: async () => JSON.stringify(r.corpo || '') };
  };
  const api = await import(`${MOD}?${++n}`);      // ?n força um módulo novo
  return { api, pedidos, memoria };
}

const CRACHA_OK = { ok: true, status: 200,
                    corpo: { access_token: 'jwt-novo', refresh_token: 'r2', expires_in: 3600 } };

test('sem ter entrado, a consulta não sai — e diz o que fazer', async () => {
  const { api, pedidos } = await carregar();
  await assert.rejects(() => api.nups(), /entre no CRM/i);
  assert.equal(pedidos.length, 0, 'chegou a perguntar ao banco sem crachá');
});

test('a consulta vai com o crachá de quem entrou, não com a chave anônima', async () => {
  const { api, pedidos } = await carregar({
    guardado: { refresh: 'r1' },
    respostas: [CRACHA_OK, { corpo: [] }],
  });
  await api.nups();
  const consulta = pedidos[1];
  assert.equal(consulta.opcoes.headers.Authorization, 'Bearer jwt-novo',
    'voltou a consultar com a chave anônima — o banco devolveria lista vazia');
  assert.equal(consulta.opcoes.headers.apikey, 'anon');
});

test('pergunta pelo número a consultar, não pelo resultado da última consulta', async () => {
  const { api, pedidos } = await carregar({
    guardado: { refresh: 'r1' }, respostas: [CRACHA_OK, { corpo: [] }],
  });
  await api.nups();
  assert.match(pedidos[1].url, /select=crps_nups,crps_nup/, `coluna errada: ${pedidos[1].url}`);
  assert.ok(!/crps=not\.is\.null/.test(pedidos[1].url),
    'voltou a filtrar pelo resultado — quem nunca consultou ficaria de fora');
  assert.match(pedidos[1].url, /encerrado_em=is\.null/, 'ia consultar caso já encerrado');
});

test('junta os números das duas colunas, sem pontuação e sem repetir', async () => {
  const { api } = await carregar({
    guardado: { refresh: 'r1' },
    respostas: [CRACHA_OK, { corpo: [
      { crps_nups: ['12345678901234567'], crps_nup: null },
      { crps_nups: [], crps_nup: '123.456.789/0123-45' },
      { crps_nups: ['123.456.789.012.345.67'], crps_nup: null },   // o mesmo do primeiro
      { crps_nups: null, crps_nup: null },
      { crps_nups: ['12345678901'], crps_nup: '1234' },            // CPF e protocolo: não são NUP
    ] }],
  });
  assert.deepEqual(await api.nups(), ['12345678901234567', '123456789012345']);
});

test('o refresh_token novo substitui o usado; a senha nunca é guardada', async () => {
  const { api, memoria } = await carregar({
    guardado: { refresh: 'r1' }, respostas: [CRACHA_OK, { corpo: [] }],
  });
  await api.nups();
  assert.equal(memoria.refresh, 'r2', 'o Supabase troca o refresh a cada uso e o novo se perdeu');
  assert.ok(!Object.values(memoria).includes('minha-senha'));
});

test('entrar guarda só o crachá e o e-mail', async () => {
  const { api, memoria, pedidos } = await carregar({
    respostas: [{ corpo: { access_token: 'a', refresh_token: 'r9', expires_in: 3600,
                           user: { email: 'paulo@exemplo.com' } } }],
  });
  assert.equal(await api.entrar('paulo@exemplo.com', 'minha-senha'), 'paulo@exemplo.com');
  assert.match(pedidos[0].url, /grant_type=password/);
  assert.equal(memoria.refresh, 'r9');
  assert.equal(memoria.quem, 'paulo@exemplo.com');
  assert.ok(!JSON.stringify(memoria).includes('minha-senha'), 'a senha ficou guardada');
});

test('senha errada é dita como senha errada', async () => {
  const { api } = await carregar({ respostas: [{ ok: false, status: 400, corpo: {} }] });
  await assert.rejects(() => api.entrar('a@b.c', 'x'), /não conferem/i);
});

test('queda de rede não custa o login; crachá recusado, sim', async () => {
  const caiu = await carregar({ guardado: { refresh: 'r1' },
                                respostas: [{ ok: false, status: 503, corpo: {} }] });
  await assert.rejects(() => caiu.api.nups(), /renovar/i);
  assert.equal(caiu.memoria.refresh, 'r1', 'apagou o login por causa de uma queda de rede');

  const venceu = await carregar({ guardado: { refresh: 'r1' },
                                  respostas: [{ ok: false, status: 401, corpo: {} }] });
  await assert.rejects(() => venceu.api.nups(), /venceu/i);
  assert.equal(venceu.memoria.refresh, undefined, 'guardou um crachá que o servidor recusou');
});

test('uma rodada renova o crachá uma vez só', async () => {
  const { api, pedidos } = await carregar({
    guardado: { refresh: 'r1' },
    respostas: [CRACHA_OK, { corpo: [] }, { corpo: null }],
  });
  await api.nups();
  await api.enviar('crps', { a: 1 });
  assert.equal(pedidos.filter(p => /grant_type/.test(p.url)).length, 1,
    'renovou o crachá de novo dentro da mesma rodada');
  assert.match(pedidos[2].url, /\/rest\/v1\/coletas$/);
  assert.equal(pedidos[2].opcoes.headers.Authorization, 'Bearer jwt-novo');
});
