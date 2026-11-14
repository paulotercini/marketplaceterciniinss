// [03.10.2026] O e-Recursos, com o portal fingido: cada recurso vive num
// sistema só, então a consulta vai primeiro ao sistema que listou o acervo e
// para no primeiro acerto — antes eram duas consultas por recurso, sempre.
const test = require('node:test');
const assert = require('node:assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const NUP1 = '123456789012345678', NUP2 = '223456789012345678';
const final = e => e[e.length - 1];
const itensDe = e => Object.assign({}, ...e.map(x => x.itens));
// `guardado`: o chrome.storage da rodada; `arquivados`: os 🗄 do CRM; `cai`: a consulta por
// recurso lança (rede caída); `semDoc`: id do documento que o portal recusa; `dupla`: dois cliques
function rodada({ sistemaQueLista = 'esisrec', nupsDoCrm = [], listas = null, opts,
                  guardado = {}, arquivados = [], cai = false, semDoc = null, dupla = false, recusa = null } = {}) {
  const pedidos = [], enviados = [], gravados = {}, listagens = [], passados = [];
  const resp = (status, corpo) => ({ ok: status === 200, status, json: async () => corpo });
  const fetch = async (u, o = {}) => {
    pedidos.push(u);
    const base = listas || { [sistemaQueLista]: [NUP1, NUP2] };
    const l = u.match(/^\/api\/v1\/([a-z]+)\/$/);
    if (l) return base[l[1]] ? resp(200, base[l[1]].map(n => ({ proc: n, nb: '1' }))) : resp(404, {});
    const m = u.match(/^\/api\/v1\/([a-z]+)\/(\d+)$/);
    if (m && cai) throw new Error('Failed to fetch');
    if (m && m[2] === recusa) return resp(403, {});
    if (m) return (base[m[1]] || []).includes(m[2]) ? resp(200, { nup: m[2], andamento: 'x',
      eventos: [{ status: 'Julgado', documentos: [{ id: 7, nome: 'Acórdão.pdf', path: '/doc/7' }, { id: 8, nome: 'CNIS.pdf', path: '/doc/8' }] }] }) : resp(404, {});
    throw new Error('pedido inesperado ' + u);
  };
  const nada = () => {};
  const ctx = { location: { host: 'consultaprocessos.inss.gov.br' }, fetch, Date, Promise, Object, Array, String, Set, JSON,
    setTimeout: f => { f(); return 0; }, faixa: nada, faixaOk: nada, faixaErr: nada, someFaixa: nada, pausa: async () => {},
    localStorage: { getItem: k => k === 'ifs_auth' ? 'token-cru' : null },
    chrome: { storage: { local: { get: async () => guardado, set: async o => { Object.assign(gravados, o); } } } },
    CRM: { nupsDoCrm: async () => ({ nups: nupsDoCrm, arquivados, fichas: 10 }),
           pedir: async m => { listagens.push(m); return { nomes: [`${m.prefixo}7`] }; },
           // F184 · só o acórdão desce; o caminho volta marcado no documento
           guardarDocs: async (origem, nup, docs, o) => { passados.push(o.existentes);
             docs.forEach(d => { if (d.id !== semDoc) d.caminho = `${origem}/${nup}/${d.id}`; }); return docs.length; },
           enviar: async (fonte, dados) => { enviados.push(dados); return true; } } };
  ctx.window = ctx; ctx.top = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'crps.js'), 'utf8'), ctx);
  const segunda = dupla ? (ctx.window.crmRodar(null, opts), ctx.window.crmRodar(null, opts)) : null;
  if (dupla) return segunda.then(r => JSON.parse(JSON.stringify(r)));
  return ctx.window.crmRodar(null, opts).then(r => ({ ...JSON.parse(JSON.stringify({ r, pedidos, enviados, gravados, listagens })),
    existentes: passados }));
}

test('o acervo vem do portal e cada recurso é consultado uma vez só, no sistema que o listou', async () => {
  const { r, pedidos, enviados } = await rodada();
  assert.deepStrictEqual(r, { ok: 2, falhas: 0 });
  const consultas = pedidos.filter(u => /\/\d+$/.test(u));
  assert.deepStrictEqual(consultas, [`/api/v1/esisrec/${NUP1}`, `/api/v1/esisrec/${NUP2}`], 'consultou o outro sistema sem precisar');
  assert.deepStrictEqual(Object.keys(itensDe(enviados)), [`${NUP1}_esisrec`, `${NUP2}_esisrec`]);
  assert.deepStrictEqual(final(enviados).portal, { total: 2, sistema: 'esisrec', por_sistema: { esisrec: 2 }, novos: [NUP1, NUP2] });
});

test('1.30.0 · a lista do RecBen também é lida, e cada recurso vai direto à base que o listou', async () => {
  const { r, pedidos, enviados } = await rodada({ listas: { esisrec: [NUP1], recben: [NUP2] } });
  assert.deepStrictEqual(r, { ok: 2, falhas: 0 });
  assert.ok(pedidos.includes('/api/v1/recben/'), 'não pediu a lista do RecBen');
  const consultas = pedidos.filter(u => /\/\d+$/.test(u));
  assert.deepStrictEqual(consultas, [`/api/v1/esisrec/${NUP1}`, `/api/v1/recben/${NUP2}`]);
  assert.deepStrictEqual(final(enviados).portal, { total: 2, sistema: 'esisrec+recben',
    por_sistema: { esisrec: 1, recben: 1 }, novos: [NUP1, NUP2] });
});

test('recurso que o portal não lista mas o CRM conhece ainda é procurado nos dois sistemas', async () => {
  const NUP3 = '323456789012345678';
  const { pedidos, enviados } = await rodada({ sistemaQueLista: 'recben', nupsDoCrm: [NUP3] });
  const doTerceiro = pedidos.filter(u => u.endsWith('/' + NUP3));
  assert.deepStrictEqual(doTerceiro, [`/api/v1/recben/${NUP3}`, `/api/v1/esisrec/${NUP3}`], 'o sistema que listou vem primeiro; o outro só depois do 404');
  assert.equal(final(enviados).falhas.length, 0, '404 não é falha');
});

test('1.32.0 · todos os documentos descem e voltam com o caminho, o CNIS inclusive', async () => {
  const { enviados } = await rodada();
  const docs = enviados[0].itens[`${NUP1}_esisrec`].eventos[0].documentos;
  assert.equal(docs[0].caminho, `crps/${NUP1}/7`);
  assert.equal(docs[1].caminho, `crps/${NUP1}/8`);
});

test('1.34.0 · com o login do cliente, a fila é só a lista do portal: o NUP do CRM não é consultado', async () => {
  const NUP3 = '323456789012345678';
  const { r, pedidos, enviados } = await rodada({ nupsDoCrm: [NUP3], opts: { cliente: true } });
  assert.deepStrictEqual(r, { ok: 2, falhas: 0 });
  assert.ok(!pedidos.some(u => u.endsWith('/' + NUP3)), 'consultou recurso de outro cliente');
  assert.equal(enviados[0].login, 'cliente');
});

test('1.34.0 · login do cliente sem recurso na lista não consulta o CRM inteiro', async () => {
  const { r, pedidos } = await rodada({ nupsDoCrm: ['323456789012345678'], listas: {}, opts: { cliente: true } });
  assert.equal(r.erro, 'sem recurso no login do cliente');
  assert.ok(!pedidos.some(u => /\/\d+$/.test(u)));
});

const NUP3 = '323456789012345678', NUP4 = '423456789012345678';
const consultasDe = pedidos => pedidos.filter(u => /\/\d+$/.test(u));

test('a pasta do recurso é listada uma vez e vai em `existentes` ao guardarDocs', async () => {
  const { listagens, existentes } = await rodada();
  assert.deepStrictEqual(listagens, [NUP1, NUP2].map(n => ({ tipo: 'crm', acao: 'docs-existentes', prefixo: `crps/${n}/` })));
  assert.ok(existentes[0].has(`crps/${NUP1}/7`));
});

test('segundo clique na mesma aba é recusado enquanto a rodada corre', async () => {
  assert.deepStrictEqual(await rodada({ dupla: true }), { erro: 'já está rodando nesta aba' });
});

test('rede caída conta para o aborto, e a rodada que parou sai com erro, não como concluída', async () => {
  const { r, pedidos, enviados } = await rodada({ listas: { esisrec: [NUP1, NUP2, NUP3, NUP4] }, cai: true });
  assert.equal(consultasDe(pedidos).length, 6, 'seguiu a fila depois de seis quedas seguidas');
  assert.match(r.erro, /parou no recurso 3 de 4/);
  assert.equal(enviados.length, 1, 'o que foi lido ainda vai ao CRM');
});

test('documento que o portal recusa deixa a rodada parcial', async () => {
  const { r, enviados } = await rodada({ semDoc: 8 });
  assert.deepStrictEqual(r, { ok: 2, falhas: 2, parcial: true });
  assert.deepStrictEqual(final(enviados).falhas[0], { nup: NUP1, sis: 'esisrec', docs_faltando: 1 });
});

test('NUP que as duas bases não acham é lembrado e fica para a rodada completa', async () => {
  const completa = await rodada({ nupsDoCrm: [NUP3] });
  assert.deepStrictEqual(completa.gravados.crps_404, [NUP3]);
  const rapida = await rodada({ nupsDoCrm: [NUP3], guardado: { ultima_crps_full: new Date().toISOString(), crps_404: [NUP3] } });
  assert.ok(!rapida.pedidos.some(u => u.endsWith('/' + NUP3)), 'consultou de novo o que não existe');
  assert.deepStrictEqual(rapida.gravados.crps_404, [NUP3], 'a rodada rápida não esquece');
  assert.ok(!('ultima_crps_full' in rapida.gravados));
});

test('na rodada completa os arquivados ficam para o fim da fila', async () => {
  const { pedidos } = await rodada({ arquivados: [NUP1] });
  assert.deepStrictEqual(consultasDe(pedidos), [`/api/v1/esisrec/${NUP2}`, `/api/v1/esisrec/${NUP1}`]);
});

test('1.39.0 · o recurso que andou vai ao CRM logo depois de lido, e a entrega final diz quantos lotes foram', async () => {
  const { enviados } = await rodada();
  assert.equal(enviados.length, 3);
  assert.deepStrictEqual(enviados.slice(0, 2).map(e => [Object.keys(e.itens), e.parcial]),
    [[[`${NUP1}_esisrec`], true], [[`${NUP2}_esisrec`], true]]);
  assert.equal(final(enviados).lotes, 2);
  assert.deepStrictEqual(final(enviados).itens, {});
});

test('1.39.0 · o recurso que não andou espera a entrega final, e o que movimentou por último vem primeiro', async () => {
  const primeira = await rodada();
  const lido = primeira.gravados.crps_ultimo;
  assert.ok(lido[NUP1] && lido[NUP2], 'não gravou a memória dos recursos');
  const { pedidos, enviados } = await rodada({ guardado: { crps_ultimo: { [NUP1]: { ...lido[NUP1], d: '2026-01-01T00:00:00' }, [NUP2]: { ...lido[NUP2], d: '2026-06-01T00:00:00' } } } });
  assert.deepStrictEqual(consultasDe(pedidos), [`/api/v1/esisrec/${NUP2}`, `/api/v1/esisrec/${NUP1}`]);
  assert.equal(enviados.length, 1, 'sem mudança, tudo na entrega final');
  assert.deepStrictEqual(Object.keys(final(enviados).itens).sort(), [`${NUP1}_esisrec`, `${NUP2}_esisrec`]);
});

test('1.39.0 · o NUP que dá 403 nas duas bases fica para a rodada completa', async () => {
  const completa = await rodada({ nupsDoCrm: [NUP3], recusa: NUP3 });
  assert.deepStrictEqual(completa.gravados.crps_403, [NUP3]);
  const rapida = await rodada({ nupsDoCrm: [NUP3], recusa: NUP3, guardado: { ultima_crps_full: new Date().toISOString(), crps_403: [NUP3] } });
  assert.ok(!rapida.pedidos.some(u => u.endsWith('/' + NUP3)), 'consultou de novo o que dá 403');
  assert.deepStrictEqual(rapida.gravados.crps_403, [NUP3]);
});
