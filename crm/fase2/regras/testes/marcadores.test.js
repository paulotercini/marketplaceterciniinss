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
  assert.deepStrictEqual(M.marcadoresDe(caso(['pcd', 'rural', 'especial'])), ['rural', 'especial', 'pcd']);
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
  const todos = M.docsDosMarcadores(caso(['rural', 'idade_rural', 'especial', 'pcd']));
  assert.equal(new Set(todos.map(d => d.toLowerCase())).size, todos.length);
});

test('sem marcador, nada é acrescentado', () => {
  assert.deepStrictEqual(M.docsDosMarcadores(caso([])), []);
});

test('todo marcador do catálogo tem rótulo, ícone, cor e documentos', () => {
  for (const m of M.MARCADORES) {
    assert.ok(m.slug && /^[a-z_]+$/.test(m.slug), `slug ruim: ${m.slug}`);
    assert.ok(m.rot && m.icone && m.dica, `falta rótulo/ícone/dica em ${m.slug}`);
    assert.match(m.cor, /^#[0-9A-Fa-f]{6}$/, `cor ruim em ${m.slug}`);
    assert.ok(m.docs.length >= 2, `${m.slug} precisa de documentos no checklist`);
    assert.ok(m.especies.length, `${m.slug} precisa dizer em que espécies aparece`);
  }
  assert.equal(new Set(M.MARCADORES.map(m => m.slug)).size, M.MARCADORES.length, 'slug repetido');
});

// ── o app.html é arquivo único e não faz require ──────────────────────────
test('a cópia dentro do app.html é idêntica à testada aqui', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', '..', 'app.html'), 'utf8');
  const nu = s => s.replace(/\s+/g, ' ').trim();
  for (const fn of ['marcadoresDe', 'alternar', 'rotuloDoPedido', 'docsDosMarcadores',
                    'doCatalogo', 'dicaDoMarcador', 'pedidosIguais']) {
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
  assert.deepStrictEqual((m[1].match(/slug: '([a-z_]+)'/g) || []).map(x => x.slice(7, -1)),
                         M.MARCADORES.map(x => x.slug));
});

// ── marcador não repete o que a espécie já diz ────────────────────────────
// Professor tem espécie própria (B57) e aposentadoria especial também (B46).
// Nesses casos o código do INSS já é a resposta; oferecer o marcador seria
// pedir que se diga duas vezes a mesma coisa — e abrir espaço para as duas
// discordarem.
test('B57 (professor) não oferece marcador: a espécie já é a resposta', () => {
  assert.deepStrictEqual(M.doCatalogo('B57').map(m => m.slug), []);
  assert.ok(!M.MARCADORES.some(m => m.slug === 'professor'), 'professor virou espécie, não marcador');
});

test('B46 não oferece "especial" — a espécie É a aposentadoria especial', () => {
  assert.ok(!M.doCatalogo('B46').map(m => m.slug).includes('especial'));
  // mas tempo rural pode entrar num pedido de aposentadoria especial
  assert.ok(M.doCatalogo('B46').map(m => m.slug).includes('rural'));
});

test('B42 oferece rural, especial e deficiência — não idade rural', () => {
  assert.deepStrictEqual(M.doCatalogo('B42').map(m => m.slug), ['rural', 'especial', 'pcd']);
});

// na aposentadoria por idade cabem as duas coisas, e elas são diferentes:
// somar tempo rural a um pedido urbano ≠ ser o benefício do segurado especial
test('B41 separa "tempo rural somado" de "idade rural do segurado especial"', () => {
  const slugs = M.doCatalogo('B41').map(m => m.slug);
  assert.deepStrictEqual(slugs, ['rural', 'idade_rural', 'especial', 'pcd']);
  assert.notEqual(M.POR_SLUG.get('rural').dica, M.POR_SLUG.get('idade_rural').dica);
  assert.match(M.POR_SLUG.get('idade_rural').dica, /55|60/);
});

test('sem espécie definida, mostra todos — melhor oferecer demais que esconder', () => {
  assert.equal(M.doCatalogo('').length, M.MARCADORES.length);
  assert.equal(M.doCatalogo(null).length, M.MARCADORES.length);
  assert.equal(M.doCatalogo('b42').length, 3, 'a espécie em minúscula tem de valer igual');
});

// ── o mesmo cliente com dois pedidos ──────────────────────────────────────
// Um B42 por deficiência e outro B42 por tempo especial são pedidos
// diferentes, cada um com protocolo e decisão próprios. O CRM não pode tratar
// isso como duplicidade — mas o MESMO pedido cadastrado duas vezes, sim.
const b42 = (marcadores) => ({ especie: 'B42', marcadores });
test('mesma espécie com marcadores diferentes NÃO é o mesmo pedido', () => {
  assert.equal(M.pedidosIguais(b42(['pcd']), b42(['especial'])), false);
  assert.equal(M.pedidosIguais(b42(['rural', 'especial']), b42(['especial'])), false);
});
test('mesma espécie e mesmos marcadores é o mesmo pedido, em qualquer ordem', () => {
  assert.equal(M.pedidosIguais(b42(['rural', 'especial']), b42(['especial', 'rural'])), true);
  assert.equal(M.pedidosIguais(b42([]), b42([])), true);
});
test('espécies diferentes nunca são o mesmo pedido', () => {
  assert.equal(M.pedidosIguais(b42(['pcd']), { especie: 'B41', marcadores: ['pcd'] }), false);
});
test('sem espécie não acusa duplicidade — seria chute', () => {
  assert.equal(M.pedidosIguais({ marcadores: ['rural'] }, { marcadores: ['rural'] }), false);
});

// ── o mesmo marcador pede coisas diferentes conforme a espécie ────────────
// A deficiência reduz o TEMPO de contribuição exigido no B42 e reduz a IDADE
// no B41. Um checklist só, igual nos dois, mandaria a equipe levantar a coisa
// errada — e a idade reduzida da aposentadoria por idade passaria batida.
test('deficiência no B41 fala de idade; no B42, de tempo', () => {
  assert.match(M.dicaDoMarcador('pcd', 'B41'), /idade reduzida/i);
  assert.match(M.dicaDoMarcador('pcd', 'B42'), /tempo de contribuição/i);
  const b41 = M.docsDosMarcadores({ especie: 'B41', marcadores: ['pcd'] });
  const b42 = M.docsDosMarcadores({ especie: 'B42', marcadores: ['pcd'] });
  assert.ok(b41.some(d => /55|60/.test(d)), 'B41 tem de lembrar a idade reduzida');
  assert.ok(!b42.some(d => /55|60/.test(d)), 'B42 não tem idade reduzida');
  assert.ok(b42.some(d => /grau/i.test(d)), 'B42 tem de levantar o grau');
  // o que é comum aos dois continua vindo nos dois
  for (const lista of [b41, b42]) assert.ok(lista.some(d => /biopsicossocial/i.test(d)));
});

test('sem espécie, o marcador cai na dica geral e nos documentos comuns', () => {
  assert.equal(M.dicaDoMarcador('pcd', ''), M.POR_SLUG.get('pcd').dica);
  const sem = M.docsDosMarcadores({ marcadores: ['pcd'] });
  assert.ok(!sem.some(d => /55|60|grau/i.test(d)), 'sem espécie não dá para saber qual regra vale');
});

// ── incapacidade não recebe marcador ──────────────────────────────────────
// Perguntado a quem trabalha com isso: tempo especial ou rural para aumentar
// valor não vale a marcação nesses casos.
test('B31 e B32 não oferecem marcador nenhum', () => {
  assert.deepStrictEqual(M.doCatalogo('B31'), []);
  assert.deepStrictEqual(M.doCatalogo('B32'), []);
});

// ── pensão por morte ──────────────────────────────────────────────────────
test('B21 distingue dependente inválido e união estável', () => {
  assert.deepStrictEqual(M.doCatalogo('B21').map(m => m.slug),
    ['dependente_invalido', 'uniao_estavel']);
});

// o óbito acidentário é espécie (B93), não marcador — mas a pensão
// acidentária também pode ter dependente inválido e união estável a provar
test('B93 recebe os mesmos dois marcadores da pensão comum', () => {
  assert.deepStrictEqual(M.doCatalogo('B93').map(m => m.slug),
    ['dependente_invalido', 'uniao_estavel']);
  assert.ok(!M.MARCADORES.some(m => /acident/i.test(m.rot)), 'acidentário é espécie, não marcador');
});

test('os documentos da pensão apontam o que decide o caso', () => {
  const inv = M.docsDosMarcadores({ especie: 'B21', marcadores: ['dependente_invalido'] });
  assert.ok(inv.some(d => /ANTERIOR ao óbito/i.test(d)), 'a preexistência é o que garante a vitaliciedade');
  const un = M.docsDosMarcadores({ especie: 'B21', marcadores: ['uniao_estavel'] });
  assert.ok(un.some(d => /NA DATA do óbito/i.test(d)));
  assert.ok(un.some(d => /testemunhas/i.test(d)));
});

test('os dois marcadores da pensão se somam', () => {
  const k = { especie: 'B21', beneficio: 'Pensão por morte',
              marcadores: ['uniao_estavel', 'dependente_invalido'] };
  assert.equal(M.rotuloDoPedido(k), 'Pensão por morte · Dependente inválido/PcD + União estável');
  assert.equal(new Set(M.docsDosMarcadores(k)).size, M.docsDosMarcadores(k).length);
});

// renomear um marcador não pode apagar a marcação que alguém já fez
test('o slug antigo continua valendo depois do rename', () => {
  assert.deepStrictEqual(M.marcadoresDe({ marcadores: ['idaderural'] }), ['idade_rural']);
  assert.deepStrictEqual(M.marcadoresDe({ marcadores: ['idaderural', 'idade_rural'] }), ['idade_rural']);
});
