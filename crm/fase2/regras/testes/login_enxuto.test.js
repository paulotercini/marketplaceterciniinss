// F49 · a tela de login não pode ser empurrada para fora da tela
//
// O que aconteceu: cada onda vinha colando o seu resumo no rótulo da versão,
// dentro do próprio <h1> da caixa de login. Na 09.75 eram 18.172 caracteres —
// a caixa virou uma parede de texto e os campos de e-mail, senha e Entrar
// foram parar muito abaixo da dobra. Dava para ler o histórico inteiro e não
// dava para entrar no sistema.
//
// O histórico agora mora num <details> no PÉ da caixa. Este teste existe para
// a próxima onda não recolar tudo no <h1> sem perceber.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const APP = path.join(__dirname, "..", "..", "app.html");
const fonte = fs.readFileSync(APP, "utf8");

const caixa = (() => {
  const i = fonte.indexOf('<div class="cx-login">');
  assert.ok(i >= 0, "não achei a caixa de login");
  return fonte.slice(i, fonte.indexOf("</noscript>", i));
})();

test("o <h1> do login leva o nome e o número da versão, nada mais", () => {
  const m = /<h1>CRM Tercini(.*?)<\/h1>/s.exec(caixa);
  assert.ok(m, "não achei o <h1> do login");
  assert.ok(m[1].length < 300,
    `o rótulo da versão está com ${m[1].length} caracteres — o changelog voltou `
    + "para o <h1> e vai empurrar o formulário para fora da tela. O lugar dele "
    + 'é o <details class="novidades">, no pé da caixa.');
  assert.match(m[1], /versão \d+\.\d+/, "o número da versão sumiu do título");
});

test("e-mail e senha vêm antes do Entrar", () => {
  const pos = t => { const i = caixa.indexOf(t); assert.ok(i >= 0, `sumiu: ${t}`); return i; };
  const entrar = pos('id="btn-entrar"');
  assert.ok(pos('id="login-email"') < entrar, "o campo de e-mail tem de vir antes do botão");
  assert.ok(pos('id="login-senha"') < entrar, "o campo de senha tem de vir antes do botão");
});

// 11.92 · teste integral 11.88, ADM-06: o histórico dobrado no pé parou na F160 com 40 mil caracteres;
// saiu da caixa, porque o histórico mora no CLAUDE.md e no git
test("a caixa de login não carrega o histórico das versões", () => {
  assert.ok(!/class="novidades/.test(caixa), "o histórico das versões voltou à caixa de login");
  assert.ok(caixa.length < 6000, `a caixa de login tem ${caixa.length} caracteres`);
});
