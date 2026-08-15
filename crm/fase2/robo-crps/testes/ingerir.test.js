// Ingestão do arquivo coletado no navegador: leitura dos itens e o casamento
// número → caso.
const { test } = require('node:test');
const assert = require('node:assert');
const I = require('../ingerir.js');

const CORPO = JSON.stringify({
  proc: '44234156897202017', numProc: '44234.156897/2020-17', orgaoAtual: 'CRPS',
  recorrentes: [{ nome: 'ALESSANDRO' }, { nome: 'PAULO ROBERTO TERCINI FILHO' }],
  eventos: [{ status: 'Conhecer do Recurso e dar-lhe provimento parcial - Acórdão: 25ª JR/1/2025', data: '10/03/2025 10:00:00', documentos: [] }],
});

test('processosColetados fica só com os HTTP 200 que dão JSON válido', () => {
  const m = I.processosColetados({ itens: {
    '44234156897202017': { status: 200, body: CORPO },
    '44233474809202068': { status: 403, body: '' },       // sem acesso: fora
    '44236149572202301': { status: -1, body: 'timeout' },  // travou: fora
    '99999999999999999': { status: 200, body: 'não-é-json' }, // corpo ruim: fora
  } });
  assert.equal(m.size, 1);
  assert.ok(m.has('44234156897202017'));
});

test('aceita também o formato antigo da sonda (nup_esisrec)', () => {
  const m = I.processosColetados({ itens: { '44234156897202017_esisrec': { status: 200, body: CORPO } } });
  assert.ok(m.has('44234156897202017'));
});

test('numerosDe e blocosPorNup lêem lista e formato antigo', () => {
  assert.deepEqual(I.numerosDe({ crps_nups: ['111', '222'], crps_nup: '333' }), ['111', '222', '333']);
  const m = I.blocosPorNup([{ nup: '111', status: 'a' }]);
  assert.equal(m.get('111').status, 'a');
  assert.equal(I.blocosPorNup({ nup: '222', status: 'b' }).get('222').status, 'b');
});
