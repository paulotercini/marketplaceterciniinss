// o mapeamento CABEÇALHO -> CAMPO do coletor do eproc
//
// POR QUE ISTO MERECE TESTE PRÓPRIO: o coletor lê o Relatório de Processos por
// nome de coluna, não por posição — justamente porque o relatório do eproc é
// configurável. Mas ler por nome só é mais seguro que ler por posição se o
// casamento dos nomes estiver certo. Um mapa errado grava "comarca" no campo
// "assunto" sem erro nenhum na tela, e o defeito só aparece meses depois, num
// cruzamento que não fecha.
//
// A armadilha específica é a ORDEM das regras. "Data do Último Evento" contém
// "Último Evento": se a regra do evento for testada antes, ela captura a
// coluna da data, e a data verdadeira se perde — porque cada campo canônico
// só aceita a PRIMEIRA coluna que casar. Regra mais específica tem de vir
// primeiro, e é isso que a bateria abaixo tranca.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ARQ = path.join(__dirname, "..", "..", "sonda-tribunais", "coletar-eproc.js");
const fonte = fs.readFileSync(ARQ, "utf8");

function extrairConst(nome) {
  const i = fonte.indexOf(`const ${nome} = `);
  assert.ok(i >= 0, `const ${nome} não achada em coletar-eproc.js`);
  let d = 0;
  for (let j = i; j < fonte.length; j++) {
    const c = fonte[j];
    if ("([{".includes(c)) d++;
    else if (")]}".includes(c)) d--;
    else if (c === ";" && d === 0) return "var " + fonte.slice(i + 6, j + 1);
  }
  assert.fail(`não consegui delimitar const ${nome}`);
}

const ctx = { console };
vm.createContext(ctx);
for (const c of ["limpo", "chave", "CANON", "canonDe", "digitos", "forma", "RE_DATA", "seguro"])
  vm.runInContext(extrairConst(c), ctx);
const { canonDe, chave, seguro, digitos } = ctx;

// Como o eproc rotula as colunas de verdade eu ainda não sei — a sonda mascarou
// os <th>. Então testo as variações plausíveis: se o eproc usar qualquer uma
// delas, o coletor acerta.
test("as colunas do relatório caem no campo certo", () => {
  const esperado = [
    ["Nº do Processo", "numero"],
    ["Processo", "numero"],
    ["Classe", "classe"],
    ["Classe da Ação", "classe"],
    ["Autor", "autor"],
    ["Polo Ativo", "autor"],
    ["Exequente", "autor"],
    ["Réu", "reu"],
    ["Polo Passivo", "reu"],
    ["Executado", "reu"],
    ["Comarca", "comarca"],
    ["Assunto", "assunto"],
    ["Valor da Causa", "valor"],
    ["Localizador", "localizador"],
    ["Situação", "situacao"],
  ];
  for (const [rotulo, campo] of esperado)
    assert.equal(canonDe(rotulo), campo, `"${rotulo}" deveria virar ${campo}`);
});

// ── a armadilha da ordem ───────────────────────────────────────────────────
test("'Data do Último Evento' é DATA, não evento", () => {
  assert.equal(canonDe("Data do Último Evento"), "data_evento",
    'a regra do evento capturou a coluna da data — inverta a ordem em CANON');
});

test("'Último Evento' continua sendo o evento", () => {
  assert.equal(canonDe("Último Evento"), "ultimo_evento");
  assert.equal(canonDe("Evento"), "ultimo_evento");
});

test("as duas convivem: evento e data caem em campos diferentes", () => {
  const a = canonDe("Último Evento"), b = canonDe("Data do Último Evento");
  assert.notEqual(a, b, "evento e data da mesma coluna canônica = uma delas se perde");
});

test("'Data de Autuação' não é confundida com Autor", () => {
  assert.equal(canonDe("Data de Autuação"), "data_autuacao");
  assert.equal(canonDe("Autuado em"), "data_autuacao");
});

test("acento e caixa não atrapalham", () => {
  assert.equal(canonDe("SITUAÇÃO"), "situacao");
  assert.equal(canonDe("  réu  "), "reu");
  assert.equal(chave("Nº do Processo"), "N DO PROCESSO");
});

test("coluna desconhecida devolve null — e o coletor a guarda pelo rótulo", () => {
  assert.equal(canonDe("Chave de Acesso"), null);
  assert.equal(canonDe(""), null);
});

// ── a máscara, com a lição do vazamento de CPF ─────────────────────────────
test("data e hora passam; corrida longa de dígito não", () => {
  assert.equal(seguro("07/09/2026 20:44:49"), true);
  assert.equal(seguro("15/09/2025"), true);
  assert.equal(seguro("2026"), true);
  assert.equal(seguro("258.266.798-67"), false, "CPF não pode ser tratado como formato seguro");
  assert.equal(seguro("12345678901"), false);
});

test("digitos extrai só o número do CNJ", () => {
  assert.equal(digitos("1002305-63.2024.8.26.0368"), "10023056320248260368");
  assert.equal(digitos("1002305-63.2024.8.26.0368").length, 20);
});
