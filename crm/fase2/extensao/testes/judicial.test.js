// 1.23 · o botão "PJe e eproc: acervo e completar" lê o acervo e a relação
// ANTES de completar: o completar escolhe o que baixar pelo último movimento
// que o acervo trouxe, e as coletas do acervo têm de chegar logo ao Importar.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'fundo.js'), 'utf8');

test('rodarJudicial espera o acervo terminar antes de completar', () => {
  const corpo = src.slice(src.indexOf('async function rodarJudicial()'));
  const fim = corpo.indexOf('\n}');
  const f = corpo.slice(0, fim);
  const acervo = f.indexOf('await Promise.all(tarefas)'), completar = f.indexOf('completarPje()');
  assert.ok(f.includes('acervoPorAba('), 'lê o acervo de cada aba');
  assert.ok(acervo > 0 && completar > acervo, 'o completar vem depois do acervo concluído');
});

test('o popup tem o botão e o worker responde a ele', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'popup.html'), 'utf8');
  const js = fs.readFileSync(path.join(__dirname, '..', 'popup.js'), 'utf8');
  assert.match(html, /id="b-judicial"/);
  assert.match(js, /tipo: 'rodar-judicial'/);
  assert.match(src, /msg\.tipo !== 'rodar-judicial'/);
});
