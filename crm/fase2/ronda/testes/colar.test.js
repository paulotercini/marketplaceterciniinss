// A colagem vem do painel do PJe e do e-SAJ, torta, do jeito que o navegador
// entrega quando se arrasta o mouse por cima da lista. Nenhum destes formatos
// foi inventado: são as três formas que o mesmo painel produz conforme a
// coluna que se seleciona.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const C = require('../colar.js');

test('uma linha por movimentação, com data no fim', () => {
  const r = C.analisarColagem(
    `0000001-14.2015.4.03.6120  Juntada de Petição  09/08/2026
     1000123-45.2024.8.26.0196  Conclusos para despacho  09/08/2026`);
  assert.equal(r.length, 2);
  assert.equal(r[0].numero, '0000001-14.2015.4.03.6120');
  assert.equal(r[0].texto, 'Juntada de Petição');
  assert.equal(r[0].data, '2026-08-09');
  assert.equal(r[1].texto, 'Conclusos para despacho');
});

// o painel quebra a mesma movimentação em duas ou três linhas; casar por
// linha partiria o texto ao meio
test('movimentação quebrada em várias linhas continua inteira', () => {
  const r = C.analisarColagem(
    `0000001-14.2015.4.03.6120
     Expedição de documento
     Certidão de publicação — prazo em 15 dias
     10/08/2026`);
  assert.equal(r.length, 1);
  assert.match(r[0].texto, /Expedição de documento/);
  assert.match(r[0].texto, /prazo em 15 dias/);
  assert.equal(r[0].data, '2026-08-10');
});

test('número sem separadores é reconhecido e sai formatado', () => {
  const r = C.analisarColagem('50123456720244036100 Sentença registrada');
  assert.equal(r.length, 1);
  assert.equal(r[0].numero, '5012345-67.2024.4.03.6100');
  assert.equal(r[0].texto, 'Sentença registrada');
});

// o mesmo processo pode aparecer duas vezes na mesma leitura: são dois fatos,
// e sumir com um deles é perder movimentação
test('o mesmo processo com duas movimentações entra duas vezes', () => {
  const r = C.analisarColagem(
    `0000001-14.2015.4.03.6120 Juntada de petição 09/08/2026
     0000001-14.2015.4.03.6120 Conclusão 09/08/2026`);
  assert.equal(r.length, 2);
  assert.deepStrictEqual(r.map(x => x.texto), ['Juntada de petição', 'Conclusão']);
});

test('mas a linha repetida idêntica (painel duplicando) entra uma vez só', () => {
  const r = C.analisarColagem(
    `0000001-14.2015.4.03.6120 Juntada de petição 09/08/2026
     0000001-14.2015.4.03.6120 Juntada de petição 09/08/2026`);
  assert.equal(r.length, 1);
});

test('tira a sujeira que o painel arrasta junto', () => {
  const r = C.analisarColagem('1. Processo nº 0000001-14.2015.4.03.6120 — Movimentação: Baixa definitiva ;');
  assert.equal(r[0].texto, 'Baixa definitiva');
});

test('colagem sem nenhum número não inventa nada', () => {
  assert.deepStrictEqual(C.analisarColagem('nada aqui'), []);
  assert.deepStrictEqual(C.analisarColagem(''), []);
  assert.deepStrictEqual(C.analisarColagem(null), []);
});

// CPF, protocolo do INSS e telefone não podem virar processo
test('não confunde outros números com processo judicial', () => {
  assert.deepStrictEqual(C.analisarColagem('CPF 123.456.789-00 telefone 16 99999-0000'), []);
  assert.deepStrictEqual(C.analisarColagem('protocolo 44233.139765/2025-37'), []);
});

test('casar liga cada achado ao caso pelo número', () => {
  const achados = C.analisarColagem(
    `0000001-14.2015.4.03.6120 Juntada
     9999999-99.2020.8.26.0100 Sentença`);
  const casos = [{ id: 'k1', processo: '0000001-14.2015.4.03.6120' }, { id: 'k2', processo: '' }];
  const r = C.casar(achados, casos);
  assert.equal(r[0].caso.id, 'k1');
  assert.equal(r[1].caso, null, 'processo que não é do escritório precisa sobrar');
});

test('casar aceita o número do caso guardado sem pontuação', () => {
  const achados = C.analisarColagem('0000001-14.2015.4.03.6120 Juntada');
  assert.equal(C.casar(achados, [{ id: 'k1', processo: '00000011420154036120' }])[0].caso.id, 'k1');
});

// ── o app.html é um arquivo só e não faz require: a mesma função vive lá
// dentro copiada. Este teste é a trava contra as duas cópias divergirem —
// é o mesmo truque do preparar.js, que injeta o código-fonte testado.
test('a cópia dentro do app.html é idêntica à testada aqui', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', '..', 'app.html'), 'utf8');
  const nu = s => s.replace(/\s+/g, ' ').trim();
  for (const fn of ['analisarColagem', 'limparTexto', 'formatarCNJ']) {
    const daqui = nu(C[fn].toString());
    const i = app.indexOf(`function ${fn}(`);
    assert.notEqual(i, -1, `${fn} sumiu do app.html`);
    // recorta a função inteira contando as chaves
    let n = 0, j = app.indexOf('{', i);
    const ini = j;
    do { if (app[j] === '{') n++; else if (app[j] === '}') n--; j++; } while (n > 0 && j < app.length);
    const noApp = nu(`function ${fn}` + app.slice(app.indexOf('(', i), ini) + app.slice(ini, j));
    assert.equal(noApp, daqui, `${fn} divergiu entre colar.js e app.html`);
  }
});

// o último processo da colagem não tem número adiante para limitá-lo: sem
// corte, ele engole o rodapé da tela (contador de páginas, CPF, aviso)
test('o último item não engole o rodapé da tela', () => {
  const r = C.analisarColagem(
    `0000001-14.2015.4.03.6120 Sentença registrada 08/08/2026

     Exibindo 1 a 40 de 312 · CPF do usuário 123.456.789-00`);
  assert.equal(r.length, 1);
  assert.equal(r[0].texto, 'Sentença registrada');
});
