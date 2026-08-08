// Tradutor testado contra os eventos REAIS que a sonda trouxe (fichas do
// Alessandro, do Charles e do Paulo Roberto Kuner).
const { test } = require('node:test');
const assert = require('node:assert');
const T = require('../traduzir.js');

const traduz = s => T.traduzirEvento({ status: s, data: '10/03/2026 14:00:00' }).resumo;
const tipo = s => T.traduzirEvento({ status: s, data: '' }).tipo;

test('decisão: provimento parcial vira linguagem clara com a junta', () => {
  const r = traduz('Conhecer do Recurso e dar-lhe provimento parcial, por unanimidade - Acórdão: 25ª JR/3080/2025');
  assert.match(r, /provido EM PARTE/i);
  assert.match(r, /25ª Junta/);
});

test('decisão: embargo com provimento', () => {
  const r = T.traduzirEvento({ status: 'Conhecer do Embargo do Segurado e dar provimento por unanimidade - Acórdão: 01ª JR/1228/2026', data: '' });
  assert.equal(r.tipo, 'decisao');
  assert.match(r.resumo, /PROVIDO/);
});

test('decisão: não conhecer = recurso negado', () => {
  assert.match(traduz('Não conhecer do recurso por decisão monocrática - Decisão Monocrática: 23ª JR/0729/2026'), /negado/i);
});

test('pauta: sessão de julgamento extrai a data e o horário', () => {
  const r = traduz('Sessão de Julgamento Ordinária - Nº 0036/2026 - 18/03/26 08:00');
  assert.match(r, /18\/03\/2026 08:00/);
  assert.equal(tipo('Sessão de Julgamento Ordinária - Nº 0034/2026 - 05/02/26 09:00'), 'pauta');
});

test('partes: recurso especial, embargos, contrarrazões e recurso ordinário', () => {
  assert.match(traduz('Interposição de Recurso Especial - (Por: PAULO ROBERTO KUNER)'), /especial protocolado/i);
  assert.match(traduz('Interposição de Incidente - (Por: CHARLES LUIZ DOS SANTOS)'), /Embargos protocolados/);
  assert.match(traduz('Contrarrazões do recorrido'), /Contrarrazões/);
  assert.match(traduz('Requerimento protocolado - Tarefa de Recurso Ordinário - 997168119'), /ordinário protocolado/i);
});

test('distribuição ao relator', () => {
  assert.match(traduz('Distribuído ao Conselheiro Relator - Conselheiro: JOSE ADILSON DE AZEVEDO'), /relator/i);
});

test('perícia médica', () => {
  assert.match(traduz('Aguardando parecer do Perito Médico Federal - Número do protocolo PMF: 222817936'), /perito médico/i);
  assert.equal(tipo('Solicitação de parecer do Perito Médico Federal'), 'pericia');
});

test('protocolo recebido e requerimento', () => {
  assert.match(traduz('Protocolo Recebido no INSS'), /recebido no INSS/i);
  assert.match(traduz('Requerimento protocolado - Tarefa: 2010319555'), /Requerimento protocolado/);
});

test('ruído: encaminhamento automático e localizador não valem notificação', () => {
  assert.equal(tipo('Encaminhamento automático - 21150513 para 21150521'), 'ruido');
  assert.equal(tipo('Criação de subtarefa - Número do protocolo GET: 1236176721'), 'ruido');
  assert.equal(tipo('Alterar localizador órgão principal do processo - Conselheiro: X'), 'ruido');
  assert.equal(tipo('Alteração da APS Responsável - (De: 21001800 - ... Para: 21150521 ...)'), 'ruido');
});

test('encaminhamento comum diz para onde foi', () => {
  assert.match(traduz('Encaminhamento - (21150521 para 25ª JR)'), /à 25ª Junta/);
});

test('data DD/MM/AAAA HH:MM:SS vira ISO ordenável', () => {
  assert.equal(T.dataParaISO('18/03/2026 08:44:54'), '2026-03-18T08:44:54');
  assert.equal(T.dataParaISO('07/10/2020 12:56:46'), '2020-10-07T12:56:46');
  assert.equal(T.dataParaISO('sem data'), '');
});

// ── o processo inteiro ──────────────────────────────────────────────────────
const AMOSTRA = {
  proc: '44234156897202017', numProc: '44234.156897/2020-17',
  orgaoAtual: 'SERVIÇO DE CENTRALIZAÇÃO DA ANÁLISE DE RECONHECIMENTO DE DIREITOS SRSEI',
  recorrentes: [{ nome: 'ALESSANDRO FRANCISCO RODRIGUES' }, { nome: 'PAULO ROBERTO TERCINI FILHO' }],
  eventos: [
    { status: 'Encaminhamento automático - 21150513 para 21150521', data: '20/03/2026 00:11:19', documentos: [] },
    { status: 'Conhecer do Embargo do Segurado e dar provimento por unanimidade - Acórdão: 25ª JR/3325/2026', data: '18/03/2026 08:44:54', documentos: [{ nome: 'x.pdf' }] },
    { status: 'Protocolo Recebido no INSS', data: '07/10/2020 12:56:46', documentos: [] },
  ],
};

test('processo: separa o cliente do procurador', () => {
  const p = T.traduzirProcesso(AMOSTRA);
  assert.deepStrictEqual(p.recorrentes, ['ALESSANDRO FRANCISCO RODRIGUES']);
});

test('processo: o status atual pula o ruído e pega a decisão real', () => {
  const p = T.traduzirProcesso(AMOSTRA);
  assert.match(p.status, /PROVIDO/);          // não "Encaminhamento automático"
  assert.equal(p.num_proc, '44234.156897/2020-17');
  assert.equal(p.eventos.length, 3);
});

test('processo: eventos saem do mais novo para o mais antigo', () => {
  const p = T.traduzirProcesso(AMOSTRA);
  assert.equal(T.dataParaISO(p.eventos[0].data) > T.dataParaISO(p.eventos[2].data), true);
});

test('chaveEvento distingue eventos por data + texto', () => {
  const a = T.traduzirEvento({ status: 'Protocolo Recebido no INSS', data: '07/10/2020 12:56:46' });
  const b = T.traduzirEvento({ status: 'Protocolo Recebido no INSS', data: '08/10/2020 12:56:46' });
  assert.notEqual(T.chaveEvento(a), T.chaveEvento(b));
});
