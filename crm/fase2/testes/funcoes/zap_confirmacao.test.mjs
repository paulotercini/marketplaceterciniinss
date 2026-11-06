// node --experimental-strip-types testes/funcoes/zap_confirmacao.test.mjs
import assert from "node:assert/strict";
import { dataDoEnvio, datasDeHoje, textoConfirmacao, nomeDoTitulo, primeiroNome } from "../../zap_confirmacao/index.ts";

// 2026-11-11 é quarta-feira
assert.equal(dataDoEnvio("2026-11-11"), "2026-11-09", "quarta: segunda");
assert.equal(dataDoEnvio("2026-11-16"), "2026-11-13", "segunda: sexta");
assert.equal(dataDoEnvio("2026-11-17"), "2026-11-16", "terça: segunda (padrão)");
assert.equal(dataDoEnvio("2026-11-17", "sexta"), "2026-11-13");
assert.equal(dataDoEnvio("2026-11-17", "domingo"), "2026-11-15");
assert.deepEqual(datasDeHoje("2026-11-13"), ["2026-11-15", "2026-11-16"], "sexta: domingo e segunda");
assert.deepEqual(datasDeHoje("2026-11-16"), ["2026-11-17", "2026-11-18"], "segunda: terça e quarta");
assert.deepEqual(datasDeHoje("2026-11-13", "sexta"), ["2026-11-15", "2026-11-16", "2026-11-17"]);
assert.deepEqual(datasDeHoje("2026-11-14"), [], "sábado: nada (terça vai na segunda)");
assert.equal(nomeDoTitulo("001 - MARIA DA SILVA - Não confirmado"), "MARIA DA SILVA");
assert.equal(primeiroNome("MARIA DA SILVA"), "Maria");
const modelo = "Olá, {nome}. Seu atendimento está marcado para {dia}, {data}, às {hora}, com {advogado}. Responda SIM.{govbr}";
assert.equal(textoConfirmacao(modelo, "\n\nGov.", { nome: "joão souza", data: "2026-11-11", inicio: "09:30", tratamento: "o Dr. Paulo", profissional: "paulo" }),
  "Olá, João. Seu atendimento está marcado para quarta-feira, 11/11/2026, às 9h30, com o Dr. Paulo. Responda SIM.\n\nGov.");
assert.ok(!textoConfirmacao(modelo, "\n\nGov.", { nome: "a b", data: "2026-11-11", inicio: "14:00", tratamento: "o Dr. Marcos", profissional: "marcos" }).includes("Gov."), "Marcos sem gov.br");
console.log("zap_confirmacao: ok");
