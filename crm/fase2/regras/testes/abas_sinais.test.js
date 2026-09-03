// F49 · quais sub-abas o caso tem, e a chave do ⭐/⚡ no CNJ
//
// O que este teste tranca:
//  · aba INSS/Recurso/CNJ aparecendo vazia em toda ficha (era o estado antigo);
//  · aba SUMINDO quando a fase foi encerrada — encerrar não apaga história,
//    a aba tem de continuar de pé, só que em cinza;
//  · a aba não nascer quando o número é digitado em ➕ mais informações;
//  · a chave do sinal do CNJ mudar sozinha e o ⭐ "sumir" do movimento.
//
// As funções vivem dentro do app.html (arquivo único, sem require): o teste
// extrai as que precisa do próprio arquivo e roda.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const APP = path.join(__dirname, "..", "..", "app.html");
const fonte = fs.readFileSync(APP, "utf8");

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
// as const-arrow saem por linha
function extrairConst(nome) {
  const m = new RegExp(`^const ${nome} = .*$`, "m").exec(fonte);
  assert.ok(m, `const ${nome} não achada`);
  return m[0];
}

const ctx = { console };
vm.createContext(ctx);
vm.runInContext(extrairConst("dsa"), ctx);
for (const f of ["arqInfo", "faseEncerrada", "ehComentarioPat", "comentariosPat",
                 "crpsNups", "crpsBlocos", "crpsTotalEventos", "andamentosPje",
                 "abasVisiveis", "hashDjb", "chaveSinalCnj"])
  vm.runInContext(extrair(f), ctx);
const { abasVisiveis, faseEncerrada, chaveSinalCnj } = ctx;

const comentarioInss = { origem: "pat", origem_id: "c123", texto: "INSS · algo" };
const movPje = { origem: "pje", texto: "PJe (1º grau): juntada" };
const encerrada = qual => ({ arquivados: { ["aba:" + qual]: { por: "p", em: "2026-09-01" } } });

test("caso pelado: só Escritório e Caso completo", () => {
  const v = abasVisiveis({}, []);
  assert.equal(v.escritorio, true);
  assert.equal(v.tudo, true);
  assert.equal(v.inss, false, "aba INSS vazia não pode aparecer");
  assert.equal(v.crps, false, "aba Recurso vazia não pode aparecer");
  assert.equal(v.cnj, false, "aba CNJ vazia não pode aparecer");
});

test("o INSS abre com comentário do portal", () => {
  assert.equal(abasVisiveis({}, [comentarioInss]).inss, true);
  // mudança de situação NÃO é comentário: mora na linha do tempo do Escritório
  assert.equal(abasVisiveis({}, [{ origem: "pat", origem_id: "situacao:x", texto: "INSS: A → B" }]).inss, false);
});

test("o Recurso abre só com o número — antes de existir evento", () => {
  assert.equal(abasVisiveis({ crps_nups: ["44233139765202537"] }, []).crps, true,
    "digitou o NUP em ➕ mais informações, a aba tem de nascer");
  assert.equal(abasVisiveis({ crps_nup: "44233139765202537" }, []).crps, true, "formato antigo também vale");
  assert.equal(abasVisiveis({ crps: [{ nup: "1", eventos: [{ data: "01/09/2026" }] }] }, []).crps, true);
});

test("o CNJ abre com o número do processo, com o datajud ou com coleta do PJe", () => {
  assert.equal(abasVisiveis({ processo: "5001234-55.2026.4.03.6106" }, []).cnj, true);
  assert.equal(abasVisiveis({ datajud: { ultimo: { data: "2026-09-01" } } }, []).cnj, true);
  assert.equal(abasVisiveis({}, [movPje]).cnj, true);
  // fase judicial SEM número não basta: o campo de digitar mora no Escritório
  assert.equal(abasVisiveis({ fase: "judicial" }, []).cnj, false);
});

test("fase encerrada mantém a aba de pé — encerrar não apaga história", () => {
  assert.equal(abasVisiveis(encerrada("pat"), []).inss, true);
  assert.equal(abasVisiveis(encerrada("crps"), []).crps, true);
  assert.equal(abasVisiveis(encerrada("cnj"), []).cnj, true);
});

test("encerrar e reabrir vale nas três, sem contaminar as outras", () => {
  const k = encerrada("crps");
  assert.equal(faseEncerrada(k, "crps"), true);
  assert.equal(faseEncerrada(k, "pat"), false);
  assert.equal(faseEncerrada(k, "cnj"), false);
  assert.equal(faseEncerrada({}, "crps"), false, "sem marca, fase em andamento");
});

test("a chave do sinal do CNJ é estável e separa instância, data e movimento", () => {
  const m = { data: "2026-09-01", nome: "Conclusos ao relator" };
  assert.equal(chaveSinalCnj("2º grau", m), chaveSinalCnj("2º grau", { ...m }),
    "mesma entrada tem de dar a mesma chave, senão o ⭐ some na repintura");
  assert.notEqual(chaveSinalCnj("1º grau", m), chaveSinalCnj("2º grau", m),
    "o mesmo movimento em instâncias diferentes não pode compartilhar a marca");
  assert.notEqual(chaveSinalCnj("2º grau", m),
    chaveSinalCnj("2º grau", { ...m, nome: "Julgado" }));
  assert.notEqual(chaveSinalCnj("2º grau", m),
    chaveSinalCnj("2º grau", { ...m, data: "2026-09-02" }));
  // o complemento distingue dois movimentos de mesmo nome no mesmo dia
  assert.notEqual(chaveSinalCnj("2º grau", m),
    chaveSinalCnj("2º grau", { ...m, complemento: "petição 12" }));
});
