// F192 · os prazos das telas do PJe, do eproc e do e-SAJ
const test = require('node:test');
const assert = require('node:assert');
const R = require('../prazos-regras.js');

test('PJe: a linha do expediente vira ato, ciência e data limite', () => {
  const txt = `FULANO DE TAL
Despacho (12345678)
Diário Eletrônico (02/10/2026 10:10)
Prazo:15 dias
O sistema registrou ciência em 08/10/2026 00:00
Data limite prevista para manifestação: 29/10/2026 23:59
PJEC 5000417-26.2025.4.03.6314 Incidência sobre Aposentadoria
FULANO X INSTITUTO NACIONAL DO SEGURO SOCIAL - INSS
Último movimento: 01/10/2026 19:41 - Juntada de Petição intercorrente`;
  assert.deepEqual(R.lerExpedientePje(txt, 'Pendentes de ciência ou de resposta'), {
    numero: '5000417-26.2025.4.03.6314', ato: 'Despacho', ato_id: '12345678', meio: 'Diário Eletrônico',
    dias: 15, expedido_em: '2026-10-02', ciencia_em: '2026-10-08', fim: '2026-10-29', situacao: 'aberto' });
  assert.equal(R.lerExpedientePje(txt, 'Cujo prazo findou nos últimos 10 dias - sem resposta').situacao, 'findo');
  const semCiencia = 'FULANO\nAto Ordinatório (999999)\nExpedição eletrônica (05/10/2026 09:00)\nPrazo:5 dias\nPJEC 5000417-26.2025.4.03.6314 X';
  const s = R.lerExpedientePje(semCiencia, 'Pendentes');
  assert.equal(s.situacao, 'sem_ciencia');
  assert.equal(s.fim, null);
  assert.equal(R.lerExpedientePje('sem número aqui', 'x'), null);
});

test('eproc: a tabela de prazo em aberto e a de decurso, pelas colunas', () => {
  const aberto = `<table class="infraTable"><tr><th></th><th>Processo</th><th>Classe</th><th>Assunto</th><th>Evento e Prazo</th>
    <th>Data envio requisição</th><th>Início Prazo</th><th>Final Prazo</th></tr>
    <tr class="infraTrClara"><td><input type="checkbox"></td><td><a>1000001-02.2026.8.26.0576</a><br>Juízo: X</td><td>Embargos</td><td>Efeito</td>
    <td>Expedida/certificada a intimação eletrônica - Despacho/Decisão<br>15 dias</td><td>01/10/2026 10:00:00</td><td>06/10/2026 00:00:00</td><td>27/10/2026 23:59:59</td></tr></table>`;
  assert.deepEqual(R.lerPrazosEproc(aberto, 'aberto'), [{ numero: '1000001-02.2026.8.26.0576',
    ato: 'Expedida/certificada a intimação eletrônica - Despacho/Decisão', ato_id: null, meio: null, dias: 15,
    expedido_em: '2026-10-01', ciencia_em: null, inicio: '2026-10-06', fim: '2026-10-27', situacao: 'aberto' }]);
  const decurso = `<tr><th>Processo</th><th>Classe</th><th>Assunto</th><th>Evento e Prazo</th><th>Data envio requisição</th><th>Final Prazo</th><th>Conferido ?</th></tr>
    <tr class="infraTrEscura"><td>1000002-03.2025.8.26.0132</td><td>C</td><td>A</td><td>Expedida/certificada a intimação eletrônica5 dias</td><td>10/09/2026 08:00:00</td><td>30/09/2026 23:59:59</td><td></td></tr>`;
  const d = R.lerPrazosEproc(decurso, 'findo')[0];
  assert.equal(d.fim, '2026-09-30');
  assert.equal(d.inicio, null);
  assert.equal(d.dias, 5);
  assert.equal(d.ato, 'Expedida/certificada a intimação eletrônica');
});

test('e-SAJ: o número vem do código; a intimação sem ciência leva a data da disponibilização', () => {
  const r = R.lerIntimacoesEsaj([{ id: 'cdProcesso=AB1,nuSeqIntimacao=7', cdProcesso: 'AB1', ciencia: 'false',
    dataMovimentacao: '2026-10-05T10:00:00', titulo: 'Mero expediente', descricao: 'Vistos. Manifeste-se a parte autora, no prazo de 15 (quinze) dias.' },
    { id: 'x', cdProcesso: 'ZZ9', titulo: 'sem número' }], cd => ({ AB1: '1001234-56.2024.8.26.0576' })[cd]);
  assert.deepEqual(r, [{ numero: '1001234-56.2024.8.26.0576', ato: 'Mero expediente', ato_id: 'cdProcesso=AB1,nuSeqIntimacao=7',
    meio: 'Portal e-SAJ', texto: 'Vistos. Manifeste-se a parte autora, no prazo de 15 (quinze) dias.', dias: 15,
    expedido_em: '2026-10-05', ciencia_em: null, fim: null, situacao: 'sem_ciencia' }]);
});
