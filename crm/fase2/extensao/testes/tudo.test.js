// 1.25 · o "atualizar tudo" leva o completar, confere as sessões antes e
// avisa no fim; o CRM abre no 📥 Importar pelo ?ir=patinss do aviso.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const ler = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const src = ler('fundo.js');

test('1.28 · rodarTudo: o completar não espera o e-SAJ e os prazos saíram', () => {
  const f = src.slice(src.indexOf('async function rodarTudo()')).split('\n}')[0];
  assert.ok(!/rodarPrazos|prazos: true/.test(src), 'sem a busca dos prazos');
  assert.match(f, /tarefas\.push\(judicialAoMesmoTempo\(antes\)\)/);
  assert.ok(!/completarPje|completarEproc/.test(f), 'o completar vem de cada tribunal, não do fim da rodada');
  assert.ok(!/b-prazos/.test(ler('popup.html') + ler('popup.js')));
});

test('sessaoCaida reconhece o login e deixa passar a página logada', async () => {
  const { sessaoCaida } = await import(pathToFileURL(path.join(__dirname, '..', 'sessao.js')).href);
  assert.ok(sessaoCaida('https://sso.cloud.pje.jus.br/auth/realms/pje/protocol/openid-connect/auth?x'));
  assert.ok(sessaoCaida('https://esaj.tjsp.jus.br/sajcas/login?service=x'));
  assert.ok(sessaoCaida('https://eproc1g.tjsp.jus.br/eproc/', '<input type="password" name="pwdSenha">'));
  assert.ok(!sessaoCaida('https://pje1g.trf3.jus.br/pje/Painel/painel_usuario/advogado.seam', '<div>Painel do advogado</div>'));
});

test('aviso de conclusão: permissão, clique abre o Importar, e o CRM entende o ?ir', () => {
  assert.ok(JSON.parse(ler('manifest.json')).permissions.includes('notifications'));
  assert.match(src, /avisarFim\(titulo, r\)/);
  assert.match(src, /\?ir=patinss/);
  const app = fs.readFileSync(path.join(__dirname, '..', '..', 'app.html'), 'utf8');
  assert.match(app, /get\("ir"\)==="patinss"/);
});

test('o popup confere as sessões antes de rodar tudo', () => {
  assert.match(ler('popup.js'), /tipo: 'sessoes'/);
  assert.match(src, /msg\.tipo !== 'sessoes'/);
});

test('as rodadas longas correm com o pulso que mantém o worker vivo', () => {
  for (const t of ['Atualizar tudo', 'PJe e eproc', 'Completar processos'])
    assert.match(src, new RegExp(`responderComAviso\\('${t}'`));
  assert.match(src, /const comPulso = async f =>[\s\S]*getPlatformInfo/);
});

test('e-SAJ: com a ficha aberta, o clique lê só aquele processo', () => {
  const esaj = ler('esaj.js');
  assert.match(esaj, /async function coletarFichaAberta\(oab\)/);
  assert.match(esaj, /show\\\.do\/\.test\(location\.pathname\)[^\n]*!\(opts && opts\.acervo\)\)\n\s*return await coletarFichaAberta\(oab\)/);
  assert.match(esaj, /parcial: true, pulados: 0, processos: \[paraEntrega\(x\)\]/);
});

test('1.27 · o eproc da Fazenda Pública entra sempre na rodada, com ou sem aba', () => {
  const f = fs.readFileSync(path.join(__dirname, '..', 'fundo.js'), 'utf8');
  assert.match(f, /SEMPRE = \{ eproc: \['https:\/\/eproc1g-ef\.tjsp\.jus\.br\//);
  for (const uso of [/acervoECompletar[\s\S]*?alvosPorHost\(fonte/, /completarEproc[\s\S]*?alvosPorHost\('eproc'/])
    assert.match(f, uso);
  // com url, a rodada abre aquele host e não pega a aba do cível
  assert.match(f, /if \(!aba && !url\) aba = abaPreferida/);
});

// ── onda 1 e 2 da revisão: a espera do "retomando" e a trava de rodada ──────
test('uma rodada por vez, e a espera do "retomando" é por host e por condição', async () => {
  assert.match(src, /if \(rodadaEmCurso\) return responder\(\{ erro:/);
  assert.match(src, /\.finally\(\(\) => \{ rodadaEmCurso = null; \}\)/);
  const tolo = new Proxy(function () {}, { get: (_, k) => (k === 'then' ? undefined : tolo), apply: () => tolo });
  const guardado = {};
  let aba = { url: 'https://pje1g.trf3.jus.br/pje/Painel/painel_usuario/advogado.seam' }, faixa = null;
  globalThis.chrome = new Proxy({
    storage: { local: { get: async ks => Object.fromEntries(ks.map(k => [k, guardado[k]])) } },
    tabs: { get: async () => { if (!aba) throw new Error('No tab'); return aba; } },
    scripting: { executeScript: async () => [{ result: faixa }] },
  }, { get: (o, k) => o[k] || tolo });
  const { esperarConclusao, chavesDoHost } = await import(pathToFileURL(path.join(__dirname, '..', 'fundo.js')).href);
  const chaves = chavesDoHost('pje', 'pje2g.trf3.jus.br');
  assert.deepStrictEqual(chaves, ['ultima_pje_2g', 'fim_pje_pje2g.trf3.jus.br']);
  assert.deepStrictEqual(chavesDoHost('eproc', 'eproc1g-ef.tjsp.jus.br'), ['ultima_eproc_eproc1g-ef.tjsp.jus.br']);
  const espera = () => esperarConclusao(chaves, {}, 7, 30, 1);
  // o carimbo do OUTRO grau e o `ultima_pje` da entrega parcial não encerram
  Object.assign(guardado, { ultima_pje: 'x', ultima_pje_1g: 'x' });
  assert.match((await espera()).erro, /não terminou/);
  faixa = { cor: 'rgb(179, 38, 30)', texto: 'o PJe caiu 3 vezes seguidas' };
  assert.deepStrictEqual(await espera(), { erro: 'o PJe caiu 3 vezes seguidas' }, 'faixa vermelha: desistiu, não espera o teto');
  faixa = { cor: 'rgb(30, 111, 80)', texto: 'nenhum processo ativo' };
  assert.deepStrictEqual(await espera(), { ok: 'retomado' }, 'faixa verde: terminou mesmo sem gravar data');
  aba = { url: 'https://sso.cloud.pje.jus.br/auth/realms/pje/protocol/openid-connect/auth?x' };
  assert.match((await espera()).erro, /sessão caiu/);
  aba = null;
  assert.match((await espera()).erro, /aba foi fechada/);
  guardado.ultima_pje_2g = 'y';
  assert.deepStrictEqual(await espera(), { ok: 'retomado' });
});

test('completar do PJe: o lote só sai da fila depois de entregue, e o eproc espera o "retomando"', () => {
  const f = src.slice(src.indexOf('async function completarPje()')).split('\n}')[0];
  assert.ok(f.indexOf('lote.slice(0, 5)') < f.indexOf('API.enviar(') && f.indexOf('API.enviar(') < f.lastIndexOf('lote.splice(0, l.length)'));
  assert.match(f, /API\.gastarTentativas\(/);
  // a recusa 4xx tira o pedaço da fila (sem gastar tentativa); rede e 5xx o mantêm
  const rec = f.slice(f.indexOf('catch (e)'), f.indexOf('continue;'));
  assert.match(rec, /recusou \\\(4/);
  assert.match(rec, /throw e;[\s\S]*lote\.splice\(0, l\.length\); falhos\.push\(\.\.\.doLote\.splice\(0, l\.length\)\)/);
  assert.match(f, /gastarTentativas\(falhos\.map/, 'F590 · a falha conta pela chave do processo');
  assert.match(f, /if \(leu\) await API\.gastarTentativas\(falhos/, 'F590 · rodada sem nenhum processo lido não gasta tentativa');
  assert.ok(!/gastarTentativas/.test(rec));
  assert.match(f, /await entregar\(true\)/);
  const e = src.slice(src.indexOf('async function completarEproc()')).split('\n}')[0];
  assert.match(e, /r\.erro === 'retomando' \|\| r\.emCurso\)\) r = await esperarConclusao\(\['ultima_eproc_completo'\]/);
});
