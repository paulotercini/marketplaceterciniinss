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

// CASO-OURO tirado do PDF real (01ª JR/1228/2026): o e-Recursos dizia
// "dar provimento" ao embargo, e o CRM mostrava "✅ Recurso PROVIDO" — mas o
// acórdão dizia "acolher os Embargos com efeito integrativo ... mantendo-se a
// decisão proferida no Acórdão objurgado". O cliente continuava perdido.
test('embargo acolhido NÃO é recurso provido', () => {
  const r = T.traduzirEvento({ status: 'Conhecer do Embargo do Segurado e dar provimento por unanimidade - Acórdão: 01ª JR/1228/2026', data: '' });
  assert.equal(r.tipo, 'decisao');
  assert.match(r.resumo, /Embargos acolhidos/);
  assert.ok(!/PROVIDO/.test(r.resumo), 'voltou a chamar embargo de recurso provido');
  assert.equal(r.icone !== '✅', true, 'embargo não pode sair com o visto verde de vitória');
});

test('embargo rejeitado sai como rejeitado, não como recurso negado', () => {
  const r = T.traduzirEvento({ status: 'Conhecer do Embargo do Segurado e negar-lhe provimento, por unanimidade - Acórdão: 10ª JR/10166/2026', data: '' });
  assert.match(r.resumo, /Embargos rejeitados/);
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
  assert.match(p.status, /Embargos acolhidos/);   // não "Encaminhamento automático"
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

// ── documentos das decisões (nível 2: guardar o acórdão no CRM) ─────────────
test('o evento guarda a lista de documentos, não só a contagem', () => {
  const e = T.traduzirEvento({ status: 'Conhecer do Recurso e dar-lhe provimento parcial - Acórdão: 25ª JR/3080/2025',
    data: '25/03/2025 08:16:09',
    documentos: [{ id: '64874126', nome: 'ACÓRDÃO_3080/2025_2025-03-25-08-16-09.pdf',
                   path: '/esisrec/44234156897202017/64874126?arquivo=ACORDAO_30802025.pdf' }] });
  assert.equal(e.docs, 1);
  assert.equal(e.arquivos.length, 1);
  assert.equal(e.arquivos[0].id, '64874126');
  assert.match(e.arquivos[0].path, /esisrec/);
});

test('marca como "decide" só acórdão e decisão monocrática', () => {
  assert.equal(T.ehArquivoDeDecisao('ACÓRDÃO_3325/2026_2026-03-18.pdf'), true);
  assert.equal(T.ehArquivoDeDecisao('DECISÃO MONOCRÁTICA_23ª JR/0729/2026.pdf'), true);
  assert.equal(T.ehArquivoDeDecisao('Remuneracoes_14432411805.pdf'), false);
  assert.equal(T.ehArquivoDeDecisao('Recibo de Protocolo.pdf'), false);
  assert.equal(T.ehArquivoDeDecisao(''), false);
});

test('o acórdão do processo real vem marcado para cópia', () => {
  const p = T.traduzirProcesso({ proc:'1', numProc:'1', recorrentes:[], eventos:[
    { status:'Conhecer do Embargo do Segurado e dar provimento por unanimidade - Acórdão: 25ª JR/3325/2026',
      data:'18/03/2026 08:44:54',
      documentos:[{id:'73189593',nome:'ACÓRDÃO_3325/2026_2026-03-18-08-44-54.pdf',path:'/esisrec/x/73189593'}] },
    { status:'Juntada de informações previdenciárias - FULANO', data:'10/03/2026 14:52:20',
      documentos:[{id:'72965226',nome:'Remuneracoes_14432411805.pdf',path:'/esisrec/x/72965226'}] },
  ]});
  const decide = p.eventos.flatMap(e=>e.arquivos).filter(a=>a.decide);
  assert.equal(decide.length, 1);
  assert.match(decide[0].nome, /ACÓRDÃO/);
});
