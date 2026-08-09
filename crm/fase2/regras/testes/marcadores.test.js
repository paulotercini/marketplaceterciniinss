// Os marcadores respondem "o que estou pedindo para este cliente" de relance.
// O que não pode falhar: a combinação (rural + especial + deficiência existe
// de verdade), a ordem estável do rótulo, e o checklist somando sem repetir.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const M = require('../marcadores.js');

const caso = (marcadores, extra = {}) => ({
  id: 'k1', beneficio: 'Aposentadoria por tempo de contribuição',
  especie: 'B42', marcadores, ...extra,
});

test('sem marcador, o rótulo é só o benefício', () => {
  assert.equal(M.rotuloDoPedido(caso([])), 'Aposentadoria por tempo de contribuição');
  assert.equal(M.rotuloDoPedido(caso(null)), 'Aposentadoria por tempo de contribuição');
  assert.deepStrictEqual(M.marcadoresDe(caso(undefined)), []);
});

test('um marcador entra no rótulo', () => {
  assert.equal(M.rotuloDoPedido(caso(['rural'])),
    'Aposentadoria por tempo de contribuição · Rural');
});

// é o caso que motivou tudo: um pedido soma rural, especial e deficiência
test('os marcadores se somam — a combinação é o normal, não a exceção', () => {
  assert.equal(M.rotuloDoPedido(caso(['especial', 'rural', 'pcd'])),
    'Aposentadoria por tempo de contribuição · Rural + Especial + Deficiência');
});

// duas fichas com o mesmo pedido têm de parecer iguais, mesmo que cada uma
// tenha sido marcada numa ordem diferente
test('a ordem do rótulo é a do catálogo, não a de clique', () => {
  assert.equal(M.rotuloDoPedido(caso(['pcd', 'rural'])), M.rotuloDoPedido(caso(['rural', 'pcd'])));
  assert.deepStrictEqual(M.marcadoresDe(caso(['professor', 'rural'])), ['rural', 'professor']);
});

test('lixo na lista não vira marcador nem quebra a tela', () => {
  assert.deepStrictEqual(M.marcadoresDe(caso(['rural', 'rural', 'RURAL', 'inventado', ''])), ['rural']);
  assert.deepStrictEqual(M.marcadoresDe(caso('rural')), ['rural']);
});

test('alternar liga e desliga, e ignora slug que não existe', () => {
  const k = caso(['rural']);
  assert.deepStrictEqual(M.alternar(k, 'especial'), ['rural', 'especial']);
  assert.deepStrictEqual(M.alternar(k, 'rural'), []);
  assert.deepStrictEqual(M.alternar(k, 'chute'), ['rural']);
});

test('o marcador não mexe na espécie — B42 continua B42 no INSS', () => {
  const k = caso(['rural', 'especial']);
  assert.equal(k.especie, 'B42');
  assert.ok(!('especie' in M.alternar(k, 'pcd')), 'alternar devolve só a lista');
});

// ── o checklist ───────────────────────────────────────────────────────────
test('cada marcador acrescenta os documentos dele', () => {
  const docs = M.docsDosMarcadores(caso(['especial']));
  assert.ok(docs.some(d => /PPP/.test(d)));
  assert.ok(docs.some(d => /LTCAT/.test(d)));
  assert.ok(!docs.some(d => /Autodeclaração rural/.test(d)));
});

test('combinação soma os dois conjuntos', () => {
  const docs = M.docsDosMarcadores(caso(['rural', 'especial']));
  assert.ok(docs.some(d => /Autodeclaração rural/.test(d)));
  assert.ok(docs.some(d => /PPP/.test(d)));
});

// o marcador soma ao checklist do benefício; repetir item já pedido faria a
// equipe conferir duas vezes o mesmo documento
test('não repete o que o checklist do benefício já pedia', () => {
  const docs = M.docsDosMarcadores(caso(['rural']),
    ['autodeclaração rural (formulário do inss)', 'Procuração assinada']);
  assert.ok(!docs.some(d => /Autodeclaração rural/i.test(d)));
  assert.ok(docs.length, 'o resto dos documentos do rural continua vindo');
});

test('nem repete entre dois marcadores que pedem a mesma coisa', () => {
  const todos = M.docsDosMarcadores(caso(['rural', 'especial', 'pcd', 'professor']));
  assert.equal(new Set(todos.map(d => d.toLowerCase())).size, todos.length);
});

test('sem marcador, nada é acrescentado', () => {
  assert.deepStrictEqual(M.docsDosMarcadores(caso([])), []);
});

test('todo marcador do catálogo tem rótulo, ícone, cor e documentos', () => {
  for (const m of M.MARCADORES) {
    assert.ok(m.slug && /^[a-z]+$/.test(m.slug), `slug ruim: ${m.slug}`);
    assert.ok(m.rot && m.icone && m.dica, `falta rótulo/ícone/dica em ${m.slug}`);
    assert.match(m.cor, /^#[0-9A-Fa-f]{6}$/, `cor ruim em ${m.slug}`);
    assert.ok(m.docs.length >= 2, `${m.slug} precisa de documentos no checklist`);
  }
  assert.equal(new Set(M.MARCADORES.map(m => m.slug)).size, M.MARCADORES.length, 'slug repetido');
});

// ── o app.html é arquivo único e não faz require ──────────────────────────
test('a cópia dentro do app.html é idêntica à testada aqui', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', '..', 'app.html'), 'utf8');
  const nu = s => s.replace(/\s+/g, ' ').trim();
  for (const fn of ['marcadoresDe', 'alternar', 'rotuloDoPedido', 'docsDosMarcadores']) {
    const i = app.indexOf(`function ${fn}(`);
    assert.notEqual(i, -1, `${fn} sumiu do app.html`);
    let n = 0, j = app.indexOf('{', i);
    const ini = j;
    do { if (app[j] === '{') n++; else if (app[j] === '}') n--; j++; } while (n > 0 && j < app.length);
    assert.equal(nu(`function ${fn}` + app.slice(app.indexOf('(', i), ini) + app.slice(ini, j)),
                 nu(M[fn].toString()), `${fn} divergiu entre marcadores.js e app.html`);
  }
  // o catálogo também: um marcador a menos numa das cópias faria a ficha
  // mostrar um pedido e o checklist pedir outro
  const m = app.match(/const MARCADORES = \[([\s\S]*?)\n\];/);
  assert.ok(m, 'MARCADORES sumiu do app.html');
  assert.deepStrictEqual((m[1].match(/slug: '([a-z]+)'/g) || []).map(x => x.slice(7, -1)),
                         M.MARCADORES.map(x => x.slug));
});
