// node --experimental-strip-types testes/funcoes/zap_agenda.test.mjs
import assert from "node:assert/strict";
import { rotuloDaVaga, escolherVagas, foneAgenda } from "../../zap_agenda/index.ts";

assert.equal(rotuloDaVaga("2026-10-27", "09:00", "Marcos"), "terça, 27/10, às 9h00, com Marcos");
assert.equal(foneAgenda("5516999990000"), "16999990000");
assert.equal(foneAgenda("551699990000"), "1699990000");
assert.equal(foneAgenda("16999990000"), "16999990000");
const v = escolherVagas([
  { id: "marcos", nome: "Marcos", dias: [
    { data: "2026-10-28", livres: { "001": [{ inicio: "10:00", eventoId: "m2" }] } },
    { data: "2026-10-27", bloqueado: true, livres: { "001": [{ inicio: "08:00", eventoId: "x" }] } },
  ] },
  { id: "amanda", nome: "Amanda", dias: [
    { data: "2026-10-27", livres: { "001": [{ inicio: "14:00", eventoId: "a1" }, { inicio: "15:00" }], "002": [{ inicio: "09:00", eventoId: "a9" }] } },
  ] },
], "001");
assert.deepEqual(v.map((x) => x.eventoId), ["a1", "m2"], "só vaga com evento, dia bloqueado fora, do tipo pedido, em ordem");
assert.equal(v[0].profissional, "amanda");
console.log("zap_agenda: ok");
