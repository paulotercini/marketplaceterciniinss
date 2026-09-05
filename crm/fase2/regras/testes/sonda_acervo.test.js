// F50 · as partes puras da sonda do acervo (e-SAJ / eproc)
//
// DOIS DEFEITOS ESTE TESTE TRANCA, e os dois são do tipo que não aparece
// olhando a tela:
//
// 1. REGEX GLOBAL EM .test() DENTRO DE LAÇO. Uma regex com /g guarda o
//    lastIndex entre chamadas: perguntar "esta linha tem processo?" devolve
//    true, false, true, false para a MESMA pergunta repetida. A sonda
//    varreria metade do acervo e diria que era o acervo inteiro. Por isso
//    existem duas cópias do padrão — a com /g para colher, a sem /g para
//    perguntar — e o teste chama temCNJ várias vezes seguidas de propósito.
//
// 2. MÁSCARA QUE NÃO MASCARA. O relatório da sonda nasce para ser colado no
//    chat, e o acervo tem nome de cliente. Se `forma` deixar passar letra,
//    vaza dado de cliente num arquivo feito para sair da máquina. Aqui se
//    exige que sobre só o esqueleto: letra vira letra-forma, dígito vira 9,
//    e a pontuação (que é estrutura, não dado) fica.
//
// As funções vivem dentro de um IIFE em sonda-acervo.js, que só roda no
// navegador (usa document/location). O teste extrai as puras do arquivo e
// roda no node — mesmo truque do pje_grau.test.js com o app.html.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ARQ = path.join(__dirname, "..", "..", "sonda-tribunais", "sonda-acervo.js");
const fonte = fs.readFileSync(ARQ, "utf8");

// "const nome = ...;" — para no primeiro ; com os parênteses/chaves fechados.
//
// Sai como `var`, e não é estilo: no vm, `const` de topo é binding léxico do
// script e MORRE quando ele termina — a segunda extração não enxergaria a
// primeira e tudo viraria "não é função". `var` vira propriedade do contexto,
// que é como as declarações de função do pje_grau.test.js já se enxergam.
function extrairConst(nome) {
  const i = fonte.indexOf(`const ${nome} = `);
  assert.ok(i >= 0, `const ${nome} não achada em sonda-acervo.js`);
  let d = 0;
  for (let j = i; j < fonte.length; j++) {
    const c = fonte[j];
    if ("([{".includes(c)) d++;
    else if (")]}".includes(c)) d--;
    else if (c === ";" && d === 0) return "var " + fonte.slice(i + 6, j + 1);
  }
  assert.fail(`não consegui delimitar const ${nome}`);
}

// "function nome(...) { ... }" — conta as chaves até fechar a primeira
function extrairFuncao(nome) {
  const i = fonte.indexOf(`function ${nome}(`);
  assert.ok(i >= 0, `função ${nome} não achada em sonda-acervo.js`);
  let n = 0, dentro = false;
  for (let j = i; j < fonte.length; j++) {
    if (fonte[j] === "{") { n++; dentro = true; }
    else if (fonte[j] === "}") { n--; if (dentro && n === 0) return fonte.slice(i, j + 1); }
  }
  assert.fail(`não consegui delimitar ${nome}`);
}

const ctx = { console };
vm.createContext(ctx);
for (const c of ["RE_CNJ", "RE_CNJ_G", "cnjDe", "temCNJ", "forma", "cnjMascarado"])
  vm.runInContext(extrairConst(c), ctx);
vm.runInContext(extrairFuncao("porAno"), ctx);
const { cnjDe, temCNJ, forma, cnjMascarado, porAno } = ctx;

const P1 = "0001234-56.2019.8.26.0100";   // TJSP 1º grau, 2019
const P2 = "2098765-43.2024.8.26.0000";   // TJSP 2º grau, 2024
const P3 = "5001111-22.2021.4.03.6183";   // TRF3, 2021

// ── 1. perguntar não pode ter memória ──────────────────────────────────────
test("temCNJ responde igual na 1ª e na 5ª chamada (regressão do lastIndex)", () => {
  for (let i = 0; i < 5; i++)
    assert.equal(temCNJ(`Apelação ${P1} — em andamento`), true, `chamada ${i + 1}`);
});

test("temCNJ intercalado entre linhas não pula nenhuma", () => {
  const linhas = [P1, P2, P3, P1, P2].map(n => `<td>${n}</td>`);
  assert.equal(linhas.filter(temCNJ).length, 5);
});

test("temCNJ diz não para linha sem processo", () => {
  assert.equal(temCNJ("Resultados 1 a 25 de 1.243"), false);
  assert.equal(temCNJ(""), false);
  assert.equal(temCNJ(null), false);
});

// ── 2. colher devolve os números, não os grupos ────────────────────────────
test("cnjDe devolve TODOS os números e nenhum grupo de captura", () => {
  const achados = cnjDe(`<tr><td>${P1}</td></tr><tr><td>${P2}</td></tr>`);
  assert.deepEqual(achados, [P1, P2]);       // com regex sem /g viriam os 6 grupos
});

test("cnjDe devolve lista vazia quando não há processo", () => {
  assert.deepEqual(cnjDe("nenhum processo aqui"), []);
});

// ── 3. a máscara tem de apagar ─────────────────────────────────────────────
test("forma apaga letra e dígito e preserva o esqueleto", () => {
  const m = forma("João da Silva 123");
  assert.equal(m.length, "João da Silva 123".length);
  assert.match(m, /^[Aa]+ [a]+ [Aa]+ 999$/);
  assert.ok(!/[Jj]o[aã]o|Silva/.test(m), "sobrou nome no texto mascarado");
});

test("forma não deixa passar acentuada — é onde o nome brasileiro mora", () => {
  assert.ok(!/[çãéíóúÇÃÉ]/.test(forma("Conceição José Antônio")),
            "letra acentuada escapou da máscara");
});

test("cnjMascarado guarda ano/justiça/tribunal e apaga o resto", () => {
  assert.equal(cnjMascarado(P1), "9999999-99.2019.8.26.9999");
  assert.equal(cnjMascarado(P3), "9999999-99.2021.4.03.9999");
  assert.ok(!cnjMascarado(P1).includes("0001234"), "sequencial vazou");
  assert.ok(!cnjMascarado(P1).includes("0100"), "código de origem vazou");
});

// ── 4. dimensionar o acervo herdado ────────────────────────────────────────
test("porAno conta por ano e devolve em ordem crescente", () => {
  const h = porAno([P1, P2, P3, P1]);
  assert.deepEqual(h, { 2019: 2, 2021: 1, 2024: 1 });
  assert.deepEqual(Object.keys(h), ["2019", "2021", "2024"]);
});

test("porAno ignora o que não é número de processo", () => {
  assert.deepEqual(porAno(["1.243", "", null, P2]), { 2024: 1 });
});
