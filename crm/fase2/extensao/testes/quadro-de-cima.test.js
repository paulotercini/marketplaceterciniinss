// [24.09.2026] Dentro de um iframe o coletor NÃO pode subir. Ao abrir a aba
// Acervo o painel do PJe cria três iframes da mesma origem; o coletor em cada
// um agendava retomada, navegava o iframe ao painel e nascia uma coleta
// inteira ali — três leituras extras de um clique. Este teste roda o script
// como um iframe (window.top ≠ window) e exige que nada seja definido.
const test = require('node:test');
const assert = require('node:assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

for (const arq of ['pje.js', 'eproc.js']) {
  test(`${arq}: num iframe não define crmRodar nem a guarda`, () => {
    const janela = { top: {} };                      // ≠ window: é um iframe
    janela.window = janela;
    const ctx = vm.createContext({ ...janela, location: { host: 'pje1g.trf3.jus.br', pathname: '/x' },
      document: { getElementById: () => null, querySelectorAll: () => [] },
      sessionStorage: { getItem: () => null } });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', arq), 'utf8'), ctx);
    assert.equal(ctx.window.crmRodar, undefined);
    assert.equal(ctx.window.__crmColetorNoAr, undefined);
  });
}

test('fundo.js: a resposta que vale é a do quadro de cima (frameId 0)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'fundo.js'), 'utf8');
  assert.match(src, /res\.find\(r => r && r\.frameId === 0\)/);
});
