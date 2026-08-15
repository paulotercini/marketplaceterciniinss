// A troca que este módulo faz: CONFERÊNCIA não é ANDAMENTO. No To Do, cada
// olhada que não achava nada virava mais um "não houve andamento" na ficha —
// vinte linhas dizendo que nada aconteceu, e ainda assim ninguém sabia se a
// consulta desta semana tinha sido feita. Aqui a olhada vira carimbo.
const { test } = require('node:test');
const assert = require('node:assert');
const M = require('../manual.js');

const HOJE = '2026-08-09';

test('marcar como manual cria o bloco quando o número ainda não tem histórico', () => {
  const crps = M.marcarManual([], '44233.139765/2025-37', { responsavel_id: 'and', hoje: HOJE });
  assert.equal(crps.length, 1);
  assert.equal(crps[0].manual, true);
  assert.equal(crps[0].consulta.responsavel_id, 'and');
  assert.equal(crps[0].consulta.cada_dias, 7, 'a cadência padrão é a semanal que o escritório já usa');
  assert.deepStrictEqual(crps[0].eventos, []);
});

test('marcar como manual não apaga o histórico que o robô já trouxe', () => {
  const crps = [{ nup: '44233139765202537', eventos: [{ resumo: 'Recurso negado' }], status: '⛔ Recurso negado' }];
  M.marcarManual(crps, '44233139765202537', { responsavel_id: 'and', hoje: HOJE });
  assert.equal(crps.length, 1, 'criou um bloco repetido para o mesmo número');
  assert.equal(crps[0].eventos.length, 1);
  assert.equal(crps[0].status, '⛔ Recurso negado');
});

test('a conferência sem novidade NÃO vira andamento — vira contador', () => {
  const crps = M.marcarManual([], '4423', { responsavel_id: 'and', hoje: HOJE });
  const b = crps[0];
  M.registrarConsulta(b, { por: 'and', hoje: HOJE });
  M.registrarConsulta(b, { por: 'and', hoje: '2026-08-16' });
  assert.equal(b.consulta.total, 2);
  assert.equal(b.consulta.checagens.length, 2);
  assert.equal(b.consulta.checagens[0].novidade, false);
  assert.equal((b.eventos || []).length, 0, 'conferir criou evento no histórico do processo');
});

// quem conferiu com três dias de atraso não pode ser cobrado de novo amanhã
test('a próxima consulta conta a partir do dia em que se conferiu', () => {
  const crps = M.marcarManual([], '4423', { proxima: '2026-08-01', hoje: HOJE });
  M.registrarConsulta(crps[0], { por: 'and', hoje: HOJE });   // conferiu 8 dias depois
  assert.equal(crps[0].consulta.proxima, '2026-08-16');
});

test('o histórico não cresce para sempre, mas o total continua contando', () => {
  const crps = M.marcarManual([], '4423', { hoje: HOJE });
  for (let i = 0; i < 30; i++) M.registrarConsulta(crps[0], { por: 'and', hoje: HOJE });
  assert.equal(crps[0].consulta.checagens.length, M.HISTORICO_MAX);
  assert.equal(crps[0].consulta.total, 30);
});

test('maisDias não escorrega de dia por causa de fuso', () => {
  assert.equal(M.maisDias('2026-08-09', 7), '2026-08-16');
  assert.equal(M.maisDias('2026-12-28', 7), '2027-01-04');
  assert.equal(M.maisDias('2026-02-28', 1), '2026-03-01');   // 2026 não é bissexto
});

// ── o que aparece no Meu Dia ───────────────────────────────────────────────
const caso = (id, bloco) => ({ id, crps: [bloco] });

test('vencidas: pega o que passou da data e o que nunca foi conferido', () => {
  const casos = [
    caso('k1', { nup: '1', manual: true, consulta: { responsavel_id: 'and', proxima: '2026-08-02' } }),
    caso('k2', { nup: '2', manual: true, consulta: { responsavel_id: 'and', proxima: '2026-09-30' } }),
    caso('k3', { nup: '3', manual: true, consulta: { responsavel_id: 'and' } }),   // sem data
    caso('k4', { nup: '4', eventos: [] }),                                          // automático
  ];
  const v = M.vencidas(casos, HOJE);
  assert.deepStrictEqual(v.map(x => x.caso.id), ['k1', 'k3']);
});

test('vencidas filtra por quem confere — cada um vê a sua lista', () => {
  const casos = [
    caso('k1', { nup: '1', manual: true, consulta: { responsavel_id: 'and', proxima: '2026-08-02' } }),
    caso('k2', { nup: '2', manual: true, consulta: { responsavel_id: 'amanda', proxima: '2026-08-02' } }),
  ];
  assert.deepStrictEqual(M.vencidas(casos, HOJE, { colaboradorId: 'and' }).map(x => x.caso.id), ['k1']);
});

// pedir ao e-Recursos um processo não vinculado dá erro toda rodada, e ainda
// gasta a pausa de 3 segundos entre as chamadas
test('o coletor deixa de fora os números de consulta manual', () => {
  const casos = [
    caso('k1', { nup: '44233.139765/2025-37', manual: true, consulta: {} }),
    caso('k2', { nup: '44234156897202017', eventos: [] }),
  ];
  const fora = M.nupsManuais(casos);
  assert.ok(fora.has('44233139765202537'), 'o número manual precisa sair com só os dígitos');
  assert.equal(fora.size, 1);
});

test('voltar ao automático tira a marca mas guarda o trabalho já feito', () => {
  const crps = M.marcarManual([], '4423', { responsavel_id: 'and', hoje: HOJE });
  M.registrarConsulta(crps[0], { por: 'and', hoje: HOJE });
  M.desmarcarManual(crps, '4423');
  assert.equal(crps[0].manual, undefined);
  assert.equal(M.nupsManuais([{ crps }]).size, 0);
});
