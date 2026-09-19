// as partes puras da sonda da FICHA (e-SAJ, um processo só)
//
// O DEFEITO QUE ESTE TESTE TRANCA é o mesmo do sonda_acervo.test.js, mas a
// armadilha mudou de lugar. Na LISTA dava para separar rótulo de dado pela
// repetição entre linhas: texto que aparece em 2+ linhas é rótulo do sistema,
// texto único é o nome do seu cliente. Numa FICHA há UMA linha só — a
// repetição não existe, e a regra teve de virar outra: é rótulo o texto que
// termina em ':' ou que mora em elemento de rótulo (label, th, dt, class
// com "label"). Todo o resto é dado e vira forma.
//
// Regra nova = risco novo. Se `ehRotulo` disser "é rótulo" para o que é dado,
// o nome do cliente atravessa a máscara inteira e vai parar num arquivo feito
// para ser colado no chat. Por isso a bateria abaixo ataca pelos dois lados:
// exige que o dado SUMA e que o rótulo FIQUE — porque uma máscara que apaga
// tudo também quebra a sonda (sem rótulo eu não descubro seletor nenhum).
//
// As funções vivem dentro de um IIFE em sonda-ficha.js, que só roda no
// navegador. Mesmo truque do sonda_acervo.test.js: extrai as puras e roda no
// node, com elemento de mentira no lugar do DOM.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ARQ = path.join(__dirname, "..", "..", "sonda-tribunais", "sonda-ficha.js");
const fonte = fs.readFileSync(ARQ, "utf8");

// "const nome = ...;" — para no primeiro ; com parênteses/chaves fechados.
// Sai como `var` pelo mesmo motivo do teste irmão: `const` de topo no vm é
// binding léxico do script e morre quando ele termina; `var` vira propriedade
// do contexto e a extração seguinte enxerga a anterior.
function extrairConst(nome) {
  const i = fonte.indexOf(`const ${nome} = `);
  assert.ok(i >= 0, `const ${nome} não achada em sonda-ficha.js`);
  let d = 0;
  for (let j = i; j < fonte.length; j++) {
    const c = fonte[j];
    if ("([{".includes(c)) d++;
    else if (")]}".includes(c)) d--;
    else if (c === ";" && d === 0) return "var " + fonte.slice(i + 6, j + 1);
  }
  assert.fail(`não consegui delimitar const ${nome}`);
}

function extrairFuncao(nome) {
  const i = fonte.indexOf(`function ${nome}(`);
  assert.ok(i >= 0, `função ${nome} não achada em sonda-ficha.js`);
  let n = 0, dentro = false;
  for (let j = i; j < fonte.length; j++) {
    if (fonte[j] === "{") { n++; dentro = true; }
    else if (fonte[j] === "}") { n--; if (dentro && n === 0) return fonte.slice(i, j + 1); }
  }
  assert.fail(`não consegui delimitar ${nome}`);
}

const ctx = { console };
vm.createContext(ctx);
for (const c of ["RE_CNJ", "RE_CNJ_G", "cnjDe", "forma", "cnjMascarado", "ehRotulo",
                 "RE_DATA", "RE_HORA"])
  vm.runInContext(extrairConst(c), ctx);
vm.runInContext(extrairFuncao("ehFormatoSeguro"), ctx);
vm.runInContext(extrairFuncao("mascararTexto"), ctx);
const { forma, cnjMascarado, ehRotulo, mascararTexto } = ctx;

// elemento de mentira: a sonda só pergunta tagName e className
const el = (tagName = "SPAN", className = "") => ({ tagName, className });

const P1 = "0001234-56.2019.8.26.0100";   // TJSP 1º grau, 2019
const P3 = "5001111-22.2021.4.03.6183";   // TRF3, 2021

// ── 1. o dado tem de sumir ─────────────────────────────────────────────────
test("nome de cliente em span comum não sobrevive", () => {
  const m = mascararTexto("João da Silva Conceição", el());
  assert.ok(!/Jo[aã]o|Silva|Concei/.test(m), "sobrou nome: " + m);
  assert.match(m, /^[Aa]+ [a]+ [Aa]+ [Aa]+$/);
});

test("acentuada não escapa — é onde o nome brasileiro mora", () => {
  assert.ok(!/[çãéíóúÇÃÉ]/.test(mascararTexto("Conceição José Antônio", el())),
            "letra acentuada escapou da máscara");
});

test("valor em <td> de tabela de partes é dado, não rótulo", () => {
  const m = mascararTexto("MARIA APARECIDA DOS SANTOS", el("TD"));
  assert.ok(!/MARIA|SANTOS/.test(m), "parte vazou de um <td>: " + m);
});

// ── 2. o rótulo tem de ficar ───────────────────────────────────────────────
// Máscara que apaga tudo é segura e INÚTIL: sem rótulo não há seletor a
// descobrir, e a sonda deixa de responder a pergunta que a fez existir.
test("texto terminado em ':' é rótulo e fica inteiro", () => {
  assert.equal(mascararTexto("Classe:", el()), "Classe:");
  assert.equal(mascararTexto("Distribuição:", el()), "Distribuição:");
});

test("rótulo dentro de label/th/dt fica mesmo sem os dois pontos", () => {
  assert.equal(mascararTexto("Área", el("LABEL")), "Área");
  assert.equal(mascararTexto("Situação", el("TH")), "Situação");
  assert.equal(mascararTexto("Foro", el("DT")), "Foro");
});

test("rótulo por classe — é assim que o e-SAJ marca os dele (unj-label)", () => {
  assert.equal(mascararTexto("Assunto", el("SPAN", "unj-label")), "Assunto");
  assert.equal(mascararTexto("Juiz", el("DIV", "col-md-3 unj-label")), "Juiz");
});

// ── 3. formato fica, identidade some ───────────────────────────────────────
test("data pura passa inteira — é formato, não identidade", () => {
  assert.equal(mascararTexto("12/03/2019", el()), "12/03/2019");
  assert.equal(mascararTexto("10/03/2026 12:00:49", el()), "10/03/2026 12:00:49");
});

test("CNJ guarda ano/justiça/tribunal e apaga sequencial e origem", () => {
  const m = mascararTexto(P1, el());
  assert.equal(m, "9999999-99.2019.8.26.9999");
  assert.ok(!m.includes("0001234"), "sequencial vazou");
  assert.ok(!m.includes("0100"), "código de origem vazou");
  assert.equal(mascararTexto(P3, el()), "9999999-99.2021.4.03.9999");
});

// ── 4. o caso que junta os dois: nome COLADO no número ─────────────────────
// É o texto real do favorito ("Fulano de Tal - 0001234-56.2019.8.26.0100").
// Se a máscara tratar a linha inteira como "tem CNJ, deixa passar", o nome
// sai junto — vazamento que nenhum dos testes acima pegaria sozinho.
test("nome ao lado do número: número mascarado E nome apagado", () => {
  const m = mascararTexto(`Aposentadoria João da Silva ${P1}`, el());
  assert.ok(m.includes("9999999-99.2019.8.26.9999"), "número perdeu o miolo útil: " + m);
  assert.ok(!/Jo[aã]o|Silva|Aposentadoria/.test(m), "nome vazou ao lado do número: " + m);
  assert.ok(!m.includes("0001234"), "sequencial vazou: " + m);
});

// ── 4b. CORRIDA DE DÍGITO: o vazamento que aconteceu de verdade ────────────
// Numa sondagem real do eproc a máscara devolveu CRUS os CPFs de duas partes
// (#spnCpfParteAutor0, #spnCpfParteReu0), porque a regra antiga era "só dígito
// e pontuação = data/hora, deixa passar" — e CPF é só dígito e pontuação.
// Toda a família cabia nessa fresta: CNPJ, NB, RG, telefone, e os números
// antigos de processo do e-SAJ. Estes testes existem por causa daquele
// arquivo, e a regra que eles trancam é a inversa: passa cru só o que se
// consegue NOMEAR como data, hora ou número curto.
test("CPF de parte não atravessa a máscara", () => {
  const m = mascararTexto("258.266.798-67", el());
  assert.equal(m, "999.999.999-99");
  assert.ok(!/258|266|798|67/.test(m), "CPF vazou: " + m);
});

test("CNPJ, NB e RG também não", () => {
  assert.equal(mascararTexto("12.345.678/0001-95", el()), "99.999.999/9999-99");
  assert.equal(mascararTexto("123.456.789-0", el()), "999.999.999-9");
  assert.equal(mascararTexto("28.311.234-5", el()), "99.999.999-9");
});

test("número antigo de processo do e-SAJ não atravessa", () => {
  // "Outros números" do cpopg: 368.01.2005.004008 e 053.97.401615-9 saíram
  // crus nos JSONs do acervo antes deste conserto
  assert.equal(mascararTexto("368.01.2005.004008", el()), "999.99.9999.999999");
  assert.equal(mascararTexto("053.97.401615-9", el()), "999.99.999999-9");
});

test("telefone não atravessa", () => {
  assert.ok(!/98765/.test(mascararTexto("(11) 98765-4321", el())));
});

test("mas a data continua passando — sem ela a sonda fica cega ao formato", () => {
  assert.equal(mascararTexto("02/03/2026", el()), "02/03/2026");
  assert.equal(mascararTexto("10/03/2026 12:00:49", el()), "10/03/2026 12:00:49");
  assert.equal(mascararTexto("12/03/2019 às 15:30", el()), "12/03/2019 às 15:30");
  assert.equal(mascararTexto("14:25", el()), "14:25");
});

test("número curto passa (ano, vara, contador); longo não", () => {
  assert.equal(mascararTexto("2019", el()), "2019");
  assert.equal(mascararTexto("1", el()), "1");
  assert.equal(mascararTexto("1.243", el()), "1.243");
  assert.equal(mascararTexto("12345678901", el()), "99999999999", "5+ dígitos tem de virar forma");
});

// ── 5. ehRotulo não pode ser generoso ──────────────────────────────────────
test("ehRotulo diz NÃO para dado em elemento comum", () => {
  assert.equal(ehRotulo(el(), "João da Silva"), false);
  assert.equal(ehRotulo(el("TD"), "MARIA APARECIDA"), false);
  assert.equal(ehRotulo(el("DIV", "unj-base-alt nomeParte"), "PAULO ROBERTO"), false);
});

test("ehRotulo aguenta className que não é string (svg tem SVGAnimatedString)", () => {
  assert.doesNotThrow(() => ehRotulo({ tagName: "SPAN", className: {} }, "qualquer"));
});

// ── 6. entradas degeneradas não podem derrubar a sonda ─────────────────────
test("vazio e nulo atravessam sem estourar", () => {
  assert.equal(mascararTexto("", el()), "");
  assert.equal(mascararTexto(null, el()), null);
  assert.doesNotThrow(() => forma(undefined));
});
