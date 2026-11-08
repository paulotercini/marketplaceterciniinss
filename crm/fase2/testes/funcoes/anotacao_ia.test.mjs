// node --experimental-strip-types crm/fase2/testes/funcoes/anotacao_ia.test.mjs
import assert from "node:assert/strict";
const { mascarar, prompt, conferir } = await import("../../anotacao_ia/index.ts");

assert.equal(mascarar("CPF 123.456.789-00, retorno dia 15/11"), "CPF [número], retorno dia 15/11");
const p = prompt("Maria trouxe o laudo, ligar sexta", "2026-11-07", "", [{ id: "k1", rot: "B31 · INSS" }]);
assert.match(p, /sábado, 2026-11-07/);
assert.match(p, /k1: B31 · INSS/);
const casos = [{ id: "k1" }];
assert.equal(conferir({ caso_id: "outro", lembrete_data: "" }, casos, "2026-11-07").caso_id, "");
assert.equal(conferir({ caso_id: "k1", lembrete_data: "2026-11-13" }, casos, "2026-11-07").caso_id, "k1");
const ruim = conferir({ caso_id: "", lembrete_data: "13/11", data_duvidosa: false, motivo_duvida: "" }, casos, "2026-11-07");
assert.equal(ruim.lembrete_data, ""); assert.equal(ruim.data_duvidosa, true);
assert.equal(conferir({ caso_id: "", lembrete_data: "2026-11-01", data_duvidosa: false, motivo_duvida: "" }, casos, "2026-11-07").data_duvidosa, true);
console.log("anotacao_ia: 4 grupos ok");
