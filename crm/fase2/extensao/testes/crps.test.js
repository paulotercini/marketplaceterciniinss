// [03.10.2026] O e-Recursos, com o portal fingido: cada recurso vive num
// sistema só, então a consulta vai primeiro ao sistema que listou o acervo e
// para no primeiro acerto — antes eram duas consultas por recurso, sempre.
const test = require('node:test');
const assert = require('node:assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const NUP1 = '123456789012345678', NUP2 = '223456789012345678';
function rodada({ sistemaQueLista = 'esisrec', nupsDoCrm = [] } = {}) {
  const pedidos = [], enviados = [];
  const resp = (status, corpo) => ({ ok: status === 200, status, json: async () => corpo });
  const fetch = async (u, o = {}) => {
    pedidos.push(u);
    const lista = new RegExp(`^/api/v1/${sistemaQueLista}/$`);
    if (lista.test(u)) return resp(200, [{ proc: NUP1, nb: '123' }, { proc: NUP2, nb: '456' }]);
    if (/^\/api\/v1\/[a-z]+\/$/.test(u)) return resp(404, {});
    const m = u.match(/^\/api\/v1\/([a-z]+)\/(\d+)$/);
    if (m) return m[1] === sistemaQueLista && [NUP1, NUP2].includes(m[2]) ? resp(200, { nup: m[2], andamento: 'x',
      eventos: [{ status: 'Julgado', documentos: [{ id: 7, nome: 'Acórdão.pdf', path: '/doc/7' }, { id: 8, nome: 'CNIS.pdf', path: '/doc/8' }] }] }) : resp(404, {});
    throw new Error('pedido inesperado ' + u);
  };
  const nada = () => {};
  const ctx = { location: { host: 'consultaprocessos.inss.gov.br' }, fetch, Date, Promise, Object, Array, String, Set, JSON,
    setTimeout: f => { f(); return 0; }, faixa: nada, faixaOk: nada, faixaErr: nada, someFaixa: nada, pausa: async () => {},
    localStorage: { getItem: k => k === 'ifs_auth' ? 'token-cru' : null },
    chrome: { storage: { local: { get: async () => ({}), set: async () => {} } } },
    CRM: { nupsDoCrm: async () => ({ nups: nupsDoCrm, arquivados: [], fichas: 10 }),
           // F184 · só o acórdão desce; o caminho volta marcado no documento
           guardarDocs: async (origem, nup, docs) => { docs.forEach(d => { d.caminho = `${origem}/${nup}/${d.id}`; }); return docs.length; },
           enviar: async (fonte, dados) => { enviados.push(dados); return true; } } };
  ctx.window = ctx; ctx.top = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'crps.js'), 'utf8'), ctx);
  return ctx.window.crmRodar().then(r => JSON.parse(JSON.stringify({ r, pedidos, enviados })));
}

test('o acervo vem do portal e cada recurso é consultado uma vez só, no sistema que o listou', async () => {
  const { r, pedidos, enviados } = await rodada();
  assert.deepStrictEqual(r, { ok: 2, falhas: 0 });
  const consultas = pedidos.filter(u => /\/\d+$/.test(u));
  assert.deepStrictEqual(consultas, [`/api/v1/esisrec/${NUP1}`, `/api/v1/esisrec/${NUP2}`], 'consultou o outro sistema sem precisar');
  assert.deepStrictEqual(Object.keys(enviados[0].itens), [`${NUP1}_esisrec`, `${NUP2}_esisrec`]);
  assert.deepStrictEqual(enviados[0].portal, { total: 2, sistema: 'esisrec', novos: [NUP1, NUP2] });
});

test('recurso que o portal não lista mas o CRM conhece ainda é procurado nos dois sistemas', async () => {
  const NUP3 = '323456789012345678';
  const { pedidos, enviados } = await rodada({ sistemaQueLista: 'recben', nupsDoCrm: [NUP3] });
  const doTerceiro = pedidos.filter(u => u.endsWith('/' + NUP3));
  assert.deepStrictEqual(doTerceiro, [`/api/v1/recben/${NUP3}`, `/api/v1/esisrec/${NUP3}`], 'o sistema que listou vem primeiro; o outro só depois do 404');
  assert.equal(enviados[0].falhas.length, 0, '404 não é falha');
});

test('F184 · o acórdão desce junto e volta com o caminho; o CNIS não', async () => {
  const { enviados } = await rodada();
  const docs = enviados[0].itens[`${NUP1}_esisrec`].eventos[0].documentos;
  assert.equal(docs[0].caminho, `crps/${NUP1}/7`);
  assert.equal(docs[1].caminho, undefined);
});
