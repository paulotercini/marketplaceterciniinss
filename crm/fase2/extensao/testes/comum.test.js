// A extensão pergunta ao CRM quais recursos consultar. Perguntar pela coluna
// errada não dá erro nenhum: devolve lista vazia, e a extensão anuncia que
// não há recurso nenhum com o escritório inteiro cadastrado. Foi o que
// aconteceu — `crps` é o RESULTADO da consulta, `crps_nups` é o número a
// consultar. Este teste existe para a troca não voltar.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const FONTE = fs.readFileSync(path.join(__dirname, '..', 'comum.js'), 'utf8');

function carregar(linhas, { ok = true, status = 200 } = {}) {
  const pedidos = [];
  const ctx = {
    chrome: { storage: { local: { get: async () => ({ url: 'https://x.supabase.co/', chave: 'k' }) } } },
    fetch: async (u) => { pedidos.push(String(u)); return { ok, status, json: async () => linhas }; },
    document: { getElementById: () => null, body: { appendChild() {} },
                createElement: () => ({ style: {} }) },
    setTimeout,
  };
  vm.createContext(ctx);
  // `const CRM` fica no escopo do script, não no global do contexto — daí a
  // linha extra, que só devolve o objeto para o teste alcançar
  vm.runInContext(FONTE + '\nglobalThis.CRM = CRM;', ctx);
  return { ctx, pedidos };
}

test('pergunta pelo número a consultar, não pelo resultado da última consulta', async () => {
  const { ctx, pedidos } = carregar([]);
  await ctx.CRM.nupsDoCrm();
  assert.equal(pedidos.length, 1);
  assert.match(pedidos[0], /select=crps_nups,crps_nup/, `coluna errada: ${pedidos[0]}`);
  assert.ok(!/crps=not\.is\.null/.test(pedidos[0]),
    'voltou a filtrar pelo resultado — quem nunca consultou ficaria de fora');
});

test('junta os números das duas colunas, sem pontuação e sem repetir', async () => {
  const { ctx } = carregar([
    { crps_nups: ['12345678901234567'], crps_nup: null },
    { crps_nups: [], crps_nup: '123.456.789/0123-45' },
    { crps_nups: ['123.456.789.012.345.67'], crps_nup: null },   // o mesmo do primeiro
    { crps_nups: null, crps_nup: null },
  ]);
  assert.deepEqual(await ctx.CRM.nupsDoCrm(), ['12345678901234567', '123456789012345']);
});

test('número curto demais não é NUP e fica de fora', async () => {
  const { ctx } = carregar([{ crps_nups: ['12345678901'], crps_nup: '1234' }]);   // CPF, protocolo
  assert.deepEqual(await ctx.CRM.nupsDoCrm(), []);
});

test('caso encerrado não entra na consulta', async () => {
  const { pedidos, ctx } = carregar([]);
  await ctx.CRM.nupsDoCrm();
  assert.match(pedidos[0], /encerrado_em=is\.null/, 'ia consultar recurso de caso já encerrado');
});

test('recusa do CRM vira erro explicado, não lista vazia', async () => {
  const { ctx } = carregar([], { ok: false, status: 400 });
  await assert.rejects(() => ctx.CRM.nupsDoCrm(), /400/);
});
