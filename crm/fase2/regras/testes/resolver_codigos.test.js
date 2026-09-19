// as partes puras do resolvedor de códigos do e-SAJ
//
// O DEFEITO QUE ESTE TESTE TRANCA é o mesmo que já aconteceu de verdade duas
// vezes nesta pasta: dado de cliente atravessando um arquivo feito para sair
// da máquina. Primeiro foi o número de processo cru na sonda da ficha;
// depois o CPF de duas partes numa sondagem real do eproc. Nas duas vezes a
// causa foi a mesma — o autor (eu) achou que sabia o que estava passando.
//
// Aqui o resolvedor produz DOIS arquivos, e só um pode sair: o cru fica na
// máquina, o resumo vai para o chat. `montarResumo` é a fronteira entre os
// dois, e existe como função com nome justamente para caber num teste. A
// pergunta que a bateria faz é uma só, e por força bruta: pego um lote de
// registros com nome, CPF, número e rótulo dentro, monto o resumo, e exijo
// que NADA daquilo apareça no JSON resultante.
//
// A segunda metade cobre `extrairPartes`, que é por onde o processo vai casar
// com o cliente do CRM — no e-SAJ do 1º grau não há CPF na capa, então o nome
// da parte é a única ponte que existe, e lê-lo errado é perder o casamento.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ARQ = path.join(__dirname, "..", "..", "sonda-tribunais", "resolver-codigos.js");
const fonte = fs.readFileSync(ARQ, "utf8");

function extrairFuncao(nome) {
  const i = fonte.indexOf(`function ${nome}(`);
  assert.ok(i >= 0, `função ${nome} não achada em resolver-codigos.js`);
  let n = 0, dentro = false;
  for (let j = i; j < fonte.length; j++) {
    if (fonte[j] === "{") { n++; dentro = true; }
    else if (fonte[j] === "}") { n--; if (dentro && n === 0) return fonte.slice(i, j + 1); }
  }
  assert.fail(`não consegui delimitar ${nome}`);
}

function extrairConst(nome) {
  const i = fonte.indexOf(`const ${nome} = `);
  assert.ok(i >= 0, `const ${nome} não achada em resolver-codigos.js`);
  let d = 0;
  for (let j = i; j < fonte.length; j++) {
    const c = fonte[j];
    if ("([{".includes(c)) d++;
    else if (")]}".includes(c)) d--;
    else if (c === ";" && d === 0) return "var " + fonte.slice(i + 6, j + 1);
  }
  assert.fail(`não consegui delimitar const ${nome}`);
}

const ctx = { console, TextDecoder };
vm.createContext(ctx);
// txt e semMarcacao são dependências de extrairPartes. No navegador as duas
// saem do DOM; aqui bastam equivalentes — o que este teste julga é a REGRA de
// separação de papéis, não o decodificador de entidade do Chrome.
vm.runInContext(
  "var txt = el => (el ? (el.textContent || '').replace(/\\s+/g, ' ').trim() : null);", ctx);
vm.runInContext(
  "var semMarcacao = h => String(h).replace(/<[^>]+>/g, '')" +
  ".replace(/&nbsp;|\\u00a0/gi, ' ').replace(/&amp;/gi, '&')" +
  ".replace(/\\s+/g, ' ').trim();", ctx);
vm.runInContext(extrairConst("RE_PAPEL"), ctx);
vm.runInContext(extrairFuncao("decodificar"), ctx);
vm.runInContext(extrairFuncao("montarResumo"), ctx);
vm.runInContext(extrairFuncao("extrairPartes"), ctx);
const { montarResumo, extrairPartes, decodificar } = ctx;

// ── o lote de prova: tudo o que NÃO pode vazar, junto ──────────────────────
const NOME = "MARIA APARECIDA DA CONCEIÇÃO";
const ADVOGADO = "Paulo Roberto Tercini Filho";
const CPF = "258.266.798-67";
const NUM1 = "0001234-56.2019.8.26.0100";
const NUM2 = "5001111-22.2021.4.03.6183";
const ROTULO = "Fulano de Tal - Aposentadoria";
const CODIGO = "A99999AAA9999";

const LOTE = [
  { codigo: CODIGO, grau: "1G", rotulo: ROTULO, numero: NUM1, via: "seletor",
    confere_codigo: true, classe: "Procedimento Comum Cível", situacao: "Em andamento",
    seletores_falharam: [], erro: null,
    partes: [{ tipo: "Reqte", nome: NOME, advogados: [ADVOGADO], cpf: CPF }] },
  { codigo: "B1", grau: "2G", rotulo: "Outro Cliente", numero: NUM2, via: "regex",
    confere_codigo: false, classe: "Apelação Cível", situacao: "Extinto",
    seletores_falharam: ["situacao"], erro: null, partes: [] },
  { codigo: "C1", grau: "1G", rotulo: "Terceiro", numero: null, erro: "sem-numero", partes: [] },
];

// ── 1. a fronteira ─────────────────────────────────────────────────────────
test("o resumo não carrega nome, advogado nem CPF", () => {
  const s = JSON.stringify(montarResumo(180, LOTE));
  for (const proibido of [NOME, ADVOGADO, CPF, "Conceição", "Tercini", "258"])
    assert.ok(!s.includes(proibido), `vazou "${proibido}" no resumo`);
});

test("o resumo não carrega número de processo nem código", () => {
  const s = JSON.stringify(montarResumo(180, LOTE));
  for (const proibido of [NUM1, NUM2, "0001234", "5001111", "0100", "6183", CODIGO])
    assert.ok(!s.includes(proibido), `vazou "${proibido}" no resumo`);
});

test("o resumo não carrega o rótulo do favorito", () => {
  const s = JSON.stringify(montarResumo(180, LOTE));
  assert.ok(!/Fulano|Outro Cliente|Terceiro/.test(s), "rótulo de favorito vazou: " + s);
});

// Máscara que apaga tudo é segura e inútil — o resumo existe para eu conseguir
// ler o acervo do outro lado do chat.
test("mas o resumo entrega o que ele existe para entregar", () => {
  const r = montarResumo(180, LOTE);
  assert.equal(r.total_alvos, 180);
  assert.equal(r.resolvidos, 2);
  assert.equal(r.falharam, 1);
  assert.equal(r.nao_tentados, 177);
  assert.deepEqual(r.por_ano, { 2019: 1, 2021: 1 });
  assert.deepEqual(r.por_tribunal, { "8.26": 1, "4.03": 1 });
  assert.deepEqual(r.por_grau, { "1G": 1, "2G": 1 });
  assert.deepEqual(r.erros, { "sem-numero": 1 });
});

// ── 2. os sinais de integridade ────────────────────────────────────────────
// "Li do seletor certo" e "achei um CNJ no meio da página" não podem virar a
// mesma coisa: o 2º grau nunca foi sondado, e é justamente lá que a regex vai
// pescar número de processo APENSO achando que é o do processo.
test("separa o que veio por seletor do que veio por regex", () => {
  const r = montarResumo(180, LOTE);
  assert.equal(r.integridade.por_seletor, 1);
  assert.equal(r.integridade.por_regex, 1);
});

test("conta a capa cujo código não confere — é ficha trocada", () => {
  assert.equal(montarResumo(180, LOTE).integridade.codigo_nao_confere, 1);
});

test("por_ano sai ordenado (senão a leitura do acervo velho fica ilegível)", () => {
  const lote = [2024, 1997, 2015].map((a, i) => ({
    codigo: "x" + i, numero: `0001234-56.${a}.8.26.0100`, via: "seletor", erro: null,
  }));
  assert.deepEqual(Object.keys(montarResumo(3, lote).por_ano), ["1997", "2015", "2024"]);
});

// A conta que decide o cruzamento com o CRM: código infla, controle não.
// Caso real da primeira varredura — Jean Gustavo: 4 códigos (principal,
// cumprimento, RPV do principal, RPV dos honorários), 2 números, 1 caso.
test("conta casos pelo número de controle, não por código", () => {
  const lote = [
    { codigo: "c1", numero: "1003924-62.2023.8.26.0368", controle: "2023/001234", via: "seletor", erro: null },
    { codigo: "c2", numero: "0002040-78.2024.8.26.0368", controle: "2023/001234", via: "regex", erro: null },
    { codigo: "c3", numero: "0002040-78.2024.8.26.0368", controle: "2023/001234", via: "regex", erro: null },
    { codigo: "c4", numero: "0002040-78.2024.8.26.0368", controle: "2023/001234", via: "regex", erro: null },
  ];
  const r = montarResumo(180, lote);
  assert.equal(r.resolvidos, 4, "quatro códigos foram resolvidos");
  assert.equal(r.numeros_distintos, 2, "mas são dois números");
  assert.equal(r.casos_distintos, 1, "e UM caso só");
});

test("processo sem número de controle é contado, não descartado calado", () => {
  const r = montarResumo(2, [
    { codigo: "a", numero: "0001234-56.2019.8.26.0100", controle: "2019/001", via: "seletor", erro: null },
    { codigo: "b", numero: "0001234-56.2020.8.26.0100", controle: null, via: "regex", erro: null },
  ]);
  assert.equal(r.casos_distintos, 1);
  assert.equal(r.sem_controle, 1, "o sem controle tem de aparecer em algum lugar");
});

test("lote vazio não estoura e não inventa número", () => {
  const r = montarResumo(180, []);
  assert.equal(r.resolvidos, 0);
  assert.equal(r.nao_tentados, 180);
  assert.deepEqual(r.por_ano, {});
});

// ── 3. as partes: a ponte com o CRM ────────────────────────────────────────
// doc de mentira com a forma real do e-SAJ: <td> rótulo, <td> nome<br>Advogado: nome
const docFalso = html => ({
  querySelector: sel => sel === "#tablePartesPrincipais" ? tabela(html) : null,
});
function tabela(linhas) {
  return {
    querySelectorAll: () => linhas.map(([rot, valor]) => ({
      querySelectorAll: () => [
        { textContent: rot },
        { textContent: valor.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, ""), innerHTML: valor },
      ],
    })),
  };
}

test("lê tipo e nome da parte, e separa os advogados", () => {
  const p = extrairPartes(docFalso([
    ["Reqte", `${NOME}<br>Advogado: ${ADVOGADO}`],
    ["Reqdo", "INSTITUTO NACIONAL DO SEGURO SOCIAL<br>Advogada: Fulana de Tal"],
  ]));
  assert.equal(p.length, 2);
  assert.equal(p[0].tipo, "Reqte");
  assert.equal(p[0].nome, NOME);
  assert.deepEqual(p[0].advogados, [ADVOGADO]);
  assert.equal(p[1].nome, "INSTITUTO NACIONAL DO SEGURO SOCIAL");
  assert.deepEqual(p[1].advogados, ["Fulana de Tal"], "Advogada: no feminino tem de ser aparada");
});

test("parte com vários advogados não perde nenhum", () => {
  const p = extrairPartes(docFalso([["Reqte", "CLIENTE X<br>Advogado: A<br>Advogado: B"]]));
  assert.deepEqual(p[0].advogados, ["A", "B"]);
});

test("parte sem advogado devolve lista vazia, não null", () => {
  const p = extrairPartes(docFalso([["Reqte", "CLIENTE SEM CAUSÍDICO"]]));
  assert.deepEqual(p[0].advogados, []);
  assert.equal(p[0].nome, "CLIENTE SEM CAUSÍDICO");
});

test("ficha sem tabela de partes devolve lista vazia, não estoura", () => {
  assert.deepEqual(extrairPartes({ querySelector: () => null }), []);
});

// ── 3b. os defeitos que a primeira varredura real revelou ──────────────────
// Saíram assim do e-SAJ, textualmente: advogado com entidade HTML colada no
// nome, e representante legal de menor catalogado como advogado do processo.
test("entidade HTML não fica colada no nome do advogado", () => {
  const p = extrairPartes(docFalso([["Reqte", `CLIENTE<br>&nbsp; ${ADVOGADO} &nbsp;`]]));
  assert.deepEqual(p[0].advogados, [ADVOGADO], "sobrou &nbsp; no nome: " + p[0].advogados[0]);
});

test("RepreLeg, Curador e Defensoria NÃO são advogados", () => {
  const p = extrairPartes(docFalso([
    ["Reqte", "MENOR X<br>Advogado: A<br>RepreLeg:&nbsp; Anita de Fatima Ferreira&nbsp;"],
    ["Reqda", "IDOSA Y<br>Curador:&nbsp; Izilda Aparecida Quilles Menani&nbsp;"],
  ]));
  assert.deepEqual(p[0].advogados, ["A"], "representante legal entrou como advogado");
  assert.deepEqual(p[0].outros, [{ papel: "RepreLeg", nome: "Anita de Fatima Ferreira" }]);
  assert.deepEqual(p[1].advogados, [], "curador entrou como advogado");
  assert.deepEqual(p[1].outros, [{ papel: "Curador", nome: "Izilda Aparecida Quilles Menani" }]);
});

// ── 4. o encoding: o defeito que corrompeu 100% dos nomes acentuados ───────
// A primeira varredura trouxe "JosÃ©" e "ConceiÃ§Ã£o" em todo o acervo, porque
// Response.text() obedece o charset do cabeçalho e o e-SAJ anuncia
// ISO-8859-1 servindo UTF-8. Nome corrompido não casa com o CRM — é falha de
// função, não de estética. Aqui a prova é com BYTES de verdade.
const bytes = (texto, cod) => new Uint8Array(Buffer.from(texto, cod)).buffer;

test("página em UTF-8 volta com os acentos inteiros", () => {
  const original = "José da Conceição — Aposentadoria Especial (Art. 57/8)";
  const lido = decodificar(bytes(original, "utf8"));
  assert.equal(lido.texto, original);
  assert.equal(lido.codificacao, "utf-8");
  assert.equal(lido.bytes_invalidos, 0);
});

test("o mojibake das duas rodadas perdidas não se repete", () => {
  const lido = decodificar(bytes("José Antônio Conceição", "utf8")).texto;
  assert.ok(!/JosÃ|Ã©|Ã§Ã£/.test(lido), "mojibake voltou: " + lido);
});

// O FALLBACK MORREU, e este teste guarda o túmulo. Ele disparou duas vezes
// contra páginas cujos bytes eram UTF-8 legítimo e estragou o que estava bom:
// primeiro por UM byte inválido, depois por proporção — nas 180 páginas.
// Byte ruim agora é CONTADO, não vira motivo para trocar de tabela.
test("um byte perdido não muda a tabela — só é contado", () => {
  const bom = Buffer.from("Procedimento Comum Cível ".repeat(400), "utf8");
  const sujo = Buffer.concat([bom, Buffer.from([0xff]), bom]);
  const lido = decodificar(new Uint8Array(sujo).buffer);
  assert.equal(lido.codificacao, "utf-8");
  assert.equal(lido.bytes_invalidos, 1, "o byte ruim tem de aparecer na conta");
  assert.ok(lido.texto.includes("Cível"), "acento se perdeu");
});

test("muitos bytes ruins também NÃO trocam a tabela (foi o erro da 2a rodada)", () => {
  const latin = Buffer.from("Cível Órgão Ação Petição ".repeat(200), "latin1");
  const lido = decodificar(new Uint8Array(latin).buffer);
  assert.equal(lido.codificacao, "utf-8", "voltou a adivinhar tabela");
  assert.ok(lido.bytes_invalidos > 100, "o estrago tem de ficar visível na conta");
});

test("ASCII puro atravessa sem ruído", () => {
  const lido = decodificar(bytes("INSS - Procedimento Comum", "utf8"));
  assert.equal(lido.texto, "INSS - Procedimento Comum");
  assert.equal(lido.bytes_invalidos, 0);
});

// ── 4c. a prova de acento: número não se corrompe em trânsito ─────────────
test("prova_de_acento devolve o código do caractere, não o caractere", () => {
  const r = montarResumo(1, [{
    codigo: "a", numero: "0001234-56.2019.8.26.0100", classe: "Cível",
    via: "seletor", erro: null,
  }]);
  assert.deepEqual(r.prova_de_acento, [67, 237, 118, 101, 108],
                   "í tem de sair como 237; 195 seria mojibake no arquivo");
});

test("prova_de_acento denuncia mojibake no arquivo", () => {
  const r = montarResumo(1, [{
    codigo: "a", numero: "0001234-56.2019.8.26.0100", classe: "CÃ­vel",
    via: "seletor", erro: null,
  }]);
  assert.ok(r.prova_de_acento.includes(195), "não acusou o Ã do mojibake");
});

test("lote sem classe acentuada não inventa prova", () => {
  assert.equal(montarResumo(1, [{
    codigo: "a", numero: "0001234-56.2019.8.26.0100", classe: "Procedimento Comum",
    via: "seletor", erro: null,
  }]).prova_de_acento, null);
});
