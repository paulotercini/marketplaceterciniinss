// F49 · o link do PJe segue o GRAU do andamento
//
// O defeito que este teste tranca: o número do CNJ é o MESMO no 1º e no 2º
// grau, então as duas coletas casavam com o mesmo caso e as duas escreviam no
// mesmo `casos.pje_link`. A última a rodar (o acervo do 1º grau, que tem muito
// mais processo) sobrescrevia a do 2º — e a novidade que dizia "PJe (2º grau)"
// abria os autos do 1º.
//
// As funções vivem dentro do app.html (arquivo único, sem require): o teste
// extrai as quatro do próprio arquivo e roda. Se alguém mexer nelas e quebrar
// a escolha por grau, este teste cai.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const APP = path.join(__dirname, "..", "..", "app.html");
const fonte = fs.readFileSync(APP, "utf8");

// pega "function nome(...){ ... }" até a chave que fecha, contando as chaves
function extrair(nome) {
  const i = fonte.indexOf(`function ${nome}(`);
  assert.ok(i >= 0, `função ${nome} não achada no app.html`);
  let n = 0, dentro = false;
  for (let j = i; j < fonte.length; j++) {
    if (fonte[j] === "{") { n++; dentro = true; }
    else if (fonte[j] === "}") { n--; if (dentro && n === 0) return fonte.slice(i, j + 1); }
  }
  assert.fail(`não consegui delimitar ${nome}`);
}

const ctx = { console };
vm.createContext(ctx);
for (const f of ["linksPjeDoCaso", "linkPjeDoCaso", "grauDoAndamentoPje",
                 "linkPjeDoAndamento", "camposLinkPje"])
  vm.runInContext(extrair(f), ctx);
const { linkPjeDoCaso, grauDoAndamentoPje, linkPjeDoAndamento, camposLinkPje } = ctx;

const L1 = "https://pje1g.trf3.jus.br/pje/x?id=11&ca=aaa";
const L2 = "https://pje2g.trf3.jus.br/pje/x?id=22&ca=bbb";

test("o grau sai do texto do andamento", () => {
  assert.equal(grauDoAndamentoPje({ texto: "PJe (2º grau): Conclusos ao relator — em 01/09/2026" }), "2º grau");
  assert.equal(grauDoAndamentoPje({ texto: "PJe (1º grau): Juntada de petição" }), "1º grau");
  assert.equal(grauDoAndamentoPje({ texto: "PJe: sem grau na coleta antiga" }), null);
  assert.equal(grauDoAndamentoPje({ texto: "INSS: exigência" }), null);
  assert.equal(grauDoAndamentoPje(null), null);
});

test("cada grau abre o SEU endereço", () => {
  const k = { pje_link: L1, pje_links: { "1º grau": L1, "2º grau": L2 } };
  assert.equal(linkPjeDoAndamento({ texto: "PJe (2º grau): acórdão" }, k), L2, "o 2º grau não pode abrir o 1º");
  assert.equal(linkPjeDoAndamento({ texto: "PJe (1º grau): sentença" }, k), L1);
});

test("sem o grau no mapa, cai no pje_link — banco antigo continua funcionando", () => {
  const k = { pje_link: L1 };
  assert.equal(linkPjeDoCaso(k, "2º grau"), L1);
  assert.equal(linkPjeDoCaso(k, null), L1);
  assert.equal(linkPjeDoCaso({}, "1º grau"), null);
});

test("gravar o link de um grau não derruba o do outro", () => {
  const k = { pje_link: L2, pje_links: { "2º grau": L2 } };
  const campos = camposLinkPje(k, "1º grau", L1);
  assert.equal(campos.pje_links["2º grau"], L2, "o 2º grau foi perdido — é exatamente o defeito");
  assert.equal(campos.pje_links["1º grau"], L1);
  assert.equal(campos.pje_link, L1, "pje_link segue sendo o retrato do mais recente");
});

test("link ausente não escreve nada", () => {
  assert.deepEqual(camposLinkPje({ pje_link: L1 }, "2º grau", null), {});
});

test("nada a gravar quando já está igual", () => {
  const k = { pje_link: L1, pje_links: { "1º grau": L1 } };
  assert.deepEqual(camposLinkPje(k, "1º grau", L1), {});
});
