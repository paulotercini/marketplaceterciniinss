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
  assert.equal(d.nome, 'Processo administrativo integral (Em análise).pdf');
});
