// F192 · o prazo fatal da exigência do INSS conta da data do ato no PAT
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'app.html'), 'utf8');
function extrair(nome) {
  const i = html.indexOf(`function ${nome}(`);
  let n = 0, j = html.indexOf('{', i);
  for (let k = j; k < html.length; k++) {
    if (html[k] === '{') n++;
    if (html[k] === '}' && --n === 0) return html.slice(i, k + 1);
  }
}
const ctx = {};
// proxDiaUtil pula feriado (teste 11.88): leva junto os feriados nacionais, sem os do escritório
const feriados = html.slice(html.indexOf('const FERIADOS_FIXOS'), html.indexOf('// os locais e forenses do escritório'));
new Function('ctx', `${extrair('atoDaExigencia')}; ${extrair('proxDiaUtil')}; ${extrair('somaDias')};
  ${feriados}; const ehFeriado = iso => feriadosNacionais(+iso.slice(0,4)).has(iso);
  ${html.match(/const ehDiaUtil = [^\n]+/)[0]}
  ${html.match(/const prazoDaExigencia = [^\n]+/)[0]}
  ctx.atoDaExigencia = atoDaExigencia; ctx.prazoDaExigencia = prazoDaExigencia;`)(ctx);

test('o ato é o comentário mais novo do INSS que fala da exigência', () => {
  const det = { comentarios: [
    { quando: '2026-09-20', texto: 'Tarefa redistribuída', do_inss: true },
    { quando: '2026-09-10', texto: 'Apresentar PPP da empresa X', do_inss: true },
    { quando: '2026-09-25', texto: 'Segue o documento', do_inss: false }] };
  assert.deepEqual(ctx.atoDaExigencia(det), { data: '2026-09-10', texto: 'Apresentar PPP da empresa X' });
});

test('sem comentário, a última atualização do protocolo (ISO ou dd/mm/aaaa)', () => {
  assert.equal(ctx.atoDaExigencia({ atualizado_em: '2026-09-10T14:00:00' }).data, '2026-09-10');
  assert.equal(ctx.atoDaExigencia({ atualizado_em: '10/09/2026 14:00' }).data, '2026-09-10');
  assert.equal(ctx.atoDaExigencia({}), null);
});

test('30 dias corridos; vencimento no fim de semana ou feriado vai ao dia útil seguinte', () => {
  assert.equal(ctx.prazoDaExigencia('2026-09-10'), '2026-10-13'); // 10/10 é sábado e 12/10 é feriado
  assert.equal(ctx.prazoDaExigencia('2026-09-09'), '2026-10-09');
  assert.equal(ctx.prazoDaExigencia('2026-09-01'), '2026-10-01');
});
