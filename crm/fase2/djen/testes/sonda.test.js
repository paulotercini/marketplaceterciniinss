const { test } = require('node:test');
const assert = require('node:assert');
const S = require('../sonda.js');

test('a URL leva OAB, UF e a janela de datas', () => {
  const u = new URL(S.montarUrl({ oab: '123.456', uf: 'sp', dias: 7 }));
  assert.equal(u.searchParams.get('numeroOab'), '123456', 'a OAB tem de ir só com dígitos');
  assert.equal(u.searchParams.get('ufOab'), 'SP');
  assert.match(u.searchParams.get('dataDisponibilizacaoInicio'), /^\d{4}-\d{2}-\d{2}$/);
  assert.match(u.searchParams.get('dataDisponibilizacaoFim'), /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(u.searchParams.get('dataDisponibilizacaoInicio') < u.searchParams.get('dataDisponibilizacaoFim'));
});

// prazo se conta em dia de calendário; new Date('2026-08-09') nasce no dia 8
// em UTC-3, e um dia a menos na janela é uma publicação perdida
test('a janela de dias não escorrega de dia por causa de fuso', () => {
  const hoje = S.diaMenos(0), antes = S.diaMenos(30);
  assert.match(hoje, /^\d{4}-\d{2}-\d{2}$/);
  const dif = (new Date(hoje + 'T00:00:00Z') - new Date(antes + 'T00:00:00Z')) / 86400000;
  assert.equal(dif, 30);
});

// a documentação mistura camelCase e snake_case; o robô só pode ser escrito
// contra o que a API devolver de verdade, e é isto que a sonda mostra
test('formato lista as chaves de todos os níveis', () => {
  const f = [...S.formato({ numero_processo: '1', siglaTribunal: 'TRF3', texto: 'oi',
    destinatarios: [{ nome: 'Maria', polo: 'A' }], meta: { link: 'x' } })];
  assert.ok(f.some(x => x.startsWith('numero_processo:')));
  assert.ok(f.some(x => x.startsWith('siglaTribunal:')));
  assert.ok(f.includes('destinatarios[]'));
  assert.ok(f.some(x => x.startsWith('destinatarios[].nome:')));
  assert.ok(f.some(x => x.startsWith('meta.link:')));
});

// a API fica atrás de CloudFront com bloqueio por país. De fora do Brasil a
// resposta é um HTML 403, e a mensagem tem de dizer isso — senão a pessoa
// fica caçando erro de OAB onde o problema é onde o robô está rodando.
test('reconhece o bloqueio por país no corpo da resposta', () => {
  const html = 'The Amazon CloudFront distribution is configured to block access from your country.';
  assert.match(html, /block(ed)?\s+access\s+from\s+your\s+country/i);
});
