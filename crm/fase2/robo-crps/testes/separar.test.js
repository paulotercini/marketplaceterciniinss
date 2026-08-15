// Separar recursos mexe em ficha de cliente e cria caso novo: é a operação
// mais destrutiva que o CRM faz. Estes testes travam o que não pode acontecer
// — recurso sumir, histórico ficar para trás, ou os irmãos nascerem com o
// mesmo nome na lista.
const { test } = require('node:test');
const assert = require('node:assert');
const S = require('../separar.js');

const caso = (extra = {}) => ({
  id: 'k1', cliente_id: 'c1', titulo: 'Maria da Silva #12345678900',
  beneficio: 'Aposentadoria por tempo de contribuição', fase: 'conselho',
  especie: 'B42', der: '2024-03-10', urgente: false,
  crps_nups: ['44233.139765/2025-37', '44234.156897/2020-17'],
  crps: [
    { nup: '44233139765202537', status: '⛔ Recurso negado', eventos: [{ resumo: 'Recurso negado' }] },
    { nup: '44234156897202017', status: '📝 Embargos acolhidos', eventos: [{ resumo: 'Embargos' }] },
  ],
  ...extra,
});

test('com um recurso só não há o que separar', () => {
  const p = S.planoDeSeparacao(caso({ crps_nups: ['44233.139765/2025-37'], crps: [] }));
  assert.equal(p.precisa, false);
  assert.deepStrictEqual(p.novos, []);
  assert.equal(S.planoDeSeparacao(caso({ crps_nups: [], crps_nup: null, crps: [] })).precisa, false);
});

test('dois recursos viram dois casos, um número em cada', () => {
  const p = S.planoDeSeparacao(caso());
  assert.equal(p.precisa, true);
  assert.deepStrictEqual(p.fica.crps_nups, ['44233139765202537']);
  assert.equal(p.novos.length, 1);
  assert.deepStrictEqual(p.novos[0].crps_nups, ['44234156897202017']);
  assert.equal(p.novos[0].crps_nup, null, 'o campo antigo tem de ser limpo, senão o robô lê dois números');
});

test('cada caso leva o histórico DO SEU recurso, e só dele', () => {
  const p = S.planoDeSeparacao(caso());
  assert.equal(p.fica.crps.length, 1);
  assert.equal(p.fica.crps[0].status, '⛔ Recurso negado');
  assert.equal(p.novos[0].crps.length, 1);
  assert.equal(p.novos[0].crps[0].status, '📝 Embargos acolhidos');
});

test('o caso novo herda o cliente e o benefício, não o histórico do escritório', () => {
  const p = S.planoDeSeparacao(caso());
  const n = p.novos[0];
  assert.equal(n.cliente_id, 'c1');
  assert.equal(n.beneficio, 'Aposentadoria por tempo de contribuição');
  assert.equal(n.fase, 'conselho');
  assert.equal(n.especie, 'B42');
  assert.equal(n.der, '2024-03-10');
  // um comentário pertence ao momento em que foi escrito; adivinhar de qual
  // recurso ele falava seria inventar
  assert.equal(n.andamentos, undefined);
  assert.equal(n.id, undefined, 'caso novo não pode nascer com o id do antigo');
});

// sem título distinto o cliente aparece três vezes com o mesmo nome na lista
test('os irmãos nascem com título que os distingue', () => {
  const p = S.planoDeSeparacao(caso());
  assert.match(p.fica.titulo, /recurso 1\/44233\.139765\/2025-37/);
  assert.match(p.novos[0].titulo, /recurso 2\/44234\.156897\/2020-17/);
  assert.ok(p.fica.titulo.startsWith('Maria da Silva #12345678900'));
});

test('separar duas vezes não empilha o sufixo', () => {
  const k = caso({ titulo: 'Maria da Silva #12345678900 — recurso 1/44233.139765/2025-37' });
  const p = S.planoDeSeparacao(k);
  assert.equal((p.fica.titulo.match(/recurso/g) || []).length, 1);
});

test('três recursos viram três casos', () => {
  const k = caso({ crps_nups: ['44233139765202537', '44234156897202017', '44236135517202325'] });
  const p = S.planoDeSeparacao(k);
  assert.equal(p.novos.length, 2);
  assert.equal(S.conferirPlano(k, p), null);
});

test('o formato antigo (crps_nup único) entra na conta', () => {
  const k = caso({ crps_nups: ['44233139765202537'], crps_nup: '44234.156897/2020-17' });
  const p = S.planoDeSeparacao(k);
  assert.equal(p.precisa, true);
  assert.deepStrictEqual(p.novos[0].crps_nups, ['44234156897202017']);
  assert.equal(S.conferirPlano(k, p), null);
});

test('o número repetido nas duas listas conta uma vez só', () => {
  const k = caso({ crps_nups: ['44233.139765/2025-37'], crps_nup: '44233139765202537' });
  assert.equal(S.planoDeSeparacao(k).precisa, false);
});

// ── a conferência que roda antes de gravar ────────────────────────────────
test('conferirPlano aprova o plano íntegro', () => {
  const k = caso();
  assert.equal(S.conferirPlano(k, S.planoDeSeparacao(k)), null);
});

test('conferirPlano acusa recurso perdido', () => {
  const k = caso();
  const p = S.planoDeSeparacao(k);
  p.novos = [];                                  // alguém comeu um caso novo
  assert.match(S.conferirPlano(k, p), /sem caso|sobrou\/faltou/);
});

test('conferirPlano acusa histórico deixado para trás', () => {
  const k = caso();
  const p = S.planoDeSeparacao(k);
  p.novos[0].crps = [];                          // o bloco do 2º recurso sumiu
  assert.match(S.conferirPlano(k, p), /hist[óo]rico/);
});

test('recurso sem histórico coletado ainda ganha caso', () => {
  const k = caso({ crps: [{ nup: '44233139765202537', eventos: [] }] });   // só o 1º foi consultado
  const p = S.planoDeSeparacao(k);
  assert.equal(p.novos.length, 1);
  assert.deepStrictEqual(p.novos[0].crps, []);
  assert.equal(S.conferirPlano(k, p), null);
});

// ── o app.html é arquivo único e não faz require: a mesma lógica vive lá
// dentro copiada. Se as duas cópias divergirem, a tela separa de um jeito e
// os testes garantem outro — e ninguém percebe até um recurso sumir.
const fs = require('fs');
const path = require('path');
test('a cópia dentro do app.html é idêntica à testada aqui', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', '..', 'app.html'), 'utf8');
  const nu = s => s.replace(/\s+/g, ' ').trim();
  for (const fn of ['planoDeSeparacao', 'conferirPlano', 'nupsDoCaso', 'blocosDoCaso',
                    'formatarNup', 'tituloDoRecurso']) {
    const i = app.indexOf(`function ${fn}(`);
    assert.notEqual(i, -1, `${fn} sumiu do app.html`);
    let n = 0, j = app.indexOf('{', i);
    const ini = j;
    do { if (app[j] === '{') n++; else if (app[j] === '}') n--; j++; } while (n > 0 && j < app.length);
    assert.equal(nu(`function ${fn}` + app.slice(app.indexOf('(', i), ini) + app.slice(ini, j)),
                 nu(S[fn].toString()), `${fn} divergiu entre separar.js e app.html`);
  }
  // a lista de campos herdados também: uma cópia com um campo a menos faria
  // o caso novo nascer sem espécie ou sem DER, e ninguém notaria
  const m = app.match(/const CAMPOS_HERDADOS = \[([\s\S]*?)\];/);
  assert.ok(m, 'CAMPOS_HERDADOS sumiu do app.html');
  assert.deepStrictEqual(m[1].match(/'([a-z_]+)'/g).map(x => x.replace(/'/g, '')), S.CAMPOS_HERDADOS);
});
