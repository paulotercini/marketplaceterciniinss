// F329 · o PDF integral do processo administrativo do PAT ("Baixar Processo")
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const vm = require('vm');

function carregar(respostas) {
  const pedidos = [];
  const jwt = 'x.' + Buffer.from(JSON.stringify({ sub: '12345678900', name: 'PAULO R' })).toString('base64') + '.y';
  const ctx = {
    window: { addEventListener() {}, __crmPontePat: true }, console,
    localStorage: { getItem: k => (k === 'ifs_auth' ? jwt : null) },
    atob: s => Buffer.from(s, 'base64').toString('binary'), Uint8Array, Response, URLSearchParams,
    encodeURIComponent, JSON, String, Object,
    fetch: async (url, o) => { pedidos.push({ url, o }); return respostas.shift(); },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(__dirname + '/../ponte-pat.js', 'utf8'), ctx);
  return { ctx, pedidos };
}
const json = (st, b) => new Response(JSON.stringify(b), { status: st });

test('baixa o PDF do relatorio, tentando o perfil de entidade e depois o de servidor', async () => {
  const pdf = Buffer.from('%PDF-1.4 teste').toString('base64');
  const { ctx, pedidos } = carregar([json(403, {}), json(200, { relatorio: pdf, permitidoEmissaoSemConfirmacao: false })]);
  const r = await ctx.baixarPapPat('123456', null);
  assert.ok(r.ok);
  assert.equal(Buffer.from(await r.arrayBuffer()).toString().slice(0, 5), '%PDF-');
  assert.match(pedidos[0].url, /consolidadorECApi\/pap\/metadados\?protocolo=123456&sistema=PAT&cpf=12345678900&nome=PAULO%20R&async=false/);
  assert.match(pedidos[1].url, /\/apis\/consolidadorApi\/pap\/metadados/);
  assert.equal(pedidos[1].o.headers.Authorization.slice(0, 7), 'Bearer ');
});

test('emissão assíncrona não grava nada', async () => {
  const { ctx } = carregar([json(200, { emissaoAssincrona: true, mensagem: 'será gerado' })]);
  assert.equal((await ctx.baixarPapPat('1', null)).ok, false);
});

test('o concluído tem nome fixo; o que corre leva a situação', () => {
  const { ctx } = carregar([]);
  assert.equal(ctx.docDoProcessoInteiro({ status: 'CONCLUÍDA' }).id, 'processo-integral');
  const d = ctx.docDoProcessoInteiro({ status: 'Em análise' });
  assert.equal(d.id, 'processo-integral-em-an-lise');
  assert.equal(d.nome, 'Cópia parcial (Em análise).pdf');
});

test('401 com o crachá da lista: tenta uma vez com o token de agora; mesmo token não repete', async () => {
  const pdf = Buffer.from('%PDF-1.4').toString('base64');
  const a = carregar([json(401, {}), new Response(JSON.stringify(pdf))]);
  const r = await a.ctx.baixarAnexoPat('1', { id: '9', arquivo: 'a.pdf' }, { authorization: 'Bearer velho', x: '1' });
  assert.ok(r.ok);
  assert.equal(a.pedidos.length, 2);
  assert.match(a.pedidos[1].o.headers.Authorization, /^Bearer x\./);
  assert.equal(a.pedidos[1].o.headers.authorization, undefined);
  assert.equal(a.pedidos[1].o.headers.x, '1');
  const b = carregar([json(401, {})]);
  assert.equal((await b.ctx.baixarAnexoPat('1', { id: '9' }, null)).status, 401);
  assert.equal(b.pedidos.length, 1);
});

test('anexos: lista a pasta uma vez, conta o que faltou (menos o PDF enfileirado) e para na recusa', async () => {
  const { ctx } = carregar([]);
  const chamadas = [];
  ctx.faixa = () => {};
  ctx.CRM = {
    pedir: async m => { chamadas.push(m); return { nomes: [] }; },
    guardarDocs: async (origem, p, docs, o) => {
      chamadas.push({ p, o });
      o.falhas.push({ id: docs[0].id, status: 409 }, { id: 'a1', status: 500 });
      if (p === '2') o.falhas.parou = 429;
      return 0;
    },
  };
  const det = [{ protocolo: '1', anexos: [{ id: 'a1' }] }, { protocolo: '2' }, { protocolo: '3' }];
  const r = await ctx.guardarAnexosPat(det, null);
  assert.deepEqual({ ...r }, { n: 0, faltam: 2, parou: 429 });
  assert.deepEqual(chamadas.filter(c => c.acao).map(c => c.prefixo), ['pat/1/', 'pat/2/']);   // o 3 nem começa
  const o = chamadas.find(c => c.o).o;
  assert.equal(typeof o.existentes.has, 'function');
  assert.equal(o.pausaMs, 3000);
  assert.equal(o.pararEm, 3);
});

test('só a falha transitória e inédita segura a data da última coleta', () => {
  const { ctx } = carregar([]);
  const f = [{ protocolo: '1', status: 404 }, { protocolo: '2', status: 500 }, { protocolo: '3', erro: 'rede' }, { protocolo: 4, status: 429 }];
  assert.deepEqual([...ctx.falhasQueSeguramPat(f, [])], ['2', '3', '4']);
  // a mesma falha na rodada seguinte já não segura
  assert.deepEqual([...ctx.falhasQueSeguramPat(f, ['2', '3', 4])], []);
  assert.deepEqual([...ctx.falhasQueSeguramPat(undefined, null)], []);
});

test('F590: depois do 401 o crachá da rodada guarda o token novo e o pedido seguinte sai uma vez só', async () => {
  const pdf = Buffer.from('%PDF-1.4').toString('base64');
  const cracha = { authorization: 'Bearer velho' };
  const a = carregar([json(401, {}), new Response(JSON.stringify(pdf)), new Response(JSON.stringify(pdf))]);
  await a.ctx.baixarAnexoPat('1', { id: '9', arquivo: 'a.pdf' }, cracha);
  assert.match(cracha.Authorization, /^Bearer x\./);
  assert.equal(cracha.authorization, undefined);
  assert.ok((await a.ctx.baixarAnexoPat('1', { id: '10', arquivo: 'b.pdf' }, cracha)).ok);
  assert.equal(a.pedidos.length, 3);
  // o PDF do processo usa uma cópia do cabeçalho: o token novo tem de voltar ao crachá da rodada
  const c2 = { authorization: 'Bearer velho' };
  const b = carregar([json(401, {}), json(200, { relatorio: pdf })]);
  assert.ok((await b.ctx.baixarPapPat('1', c2)).ok);
  assert.match(c2.Authorization, /^Bearer x\./);
  assert.equal(c2.authorization, undefined);
});
