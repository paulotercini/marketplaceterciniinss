// 28.10.2026 · a vaga marcada no Google vale acima do limite: com 14 atendimentos do Paulo (limite 14) e uma vaga
// "002 - Livre", o dia não é lotado, a vaga é oferecida e a equipe agenda nela; sem vaga, o 15º continua recusado.
const assert = require("assert");
const { criarGoogle, proximo, quando } = require("./google-simulado.js");
const DIA = proximo(3);
const hm = m => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
const atends = Array.from({ length: 14 }, (_, i) => ({ summary: `002 - Cliente Ficticio ${i + 1}`,
  start: quando(DIA, hm(8 * 60 + i * 30)), end: quando(DIA, hm(8 * 60 + i * 30 + 30)) }));
const vaga = { id: "vaga1", summary: "002 - Livre", start: quando(DIA, "19:00"), end: quando(DIA, "19:30") };
const g = criarGoogle({ tokens: { t: { nome: "Ingrid", papel: "equipe" } }, eventos: [...atends, vaga] });
const disp = g.post({ token: "t", acao: "disponibilidade", profissional: "paulo" });
const dia = disp.dias.find(d => d.data === DIA);
assert.strictEqual(dia.atendimentos, 14);
assert.strictEqual(dia.lotado, false, "com vaga marcada o dia não é lotado");
assert.strictEqual(dia.livres["002"].length, 1, "a vaga é oferecida");
const pedido = { token: "t", acao: "agendar", profissional: "paulo", tipo: "002", nome: "Maria Teste Silva", telefone: "16999990000",
  clienteId: "c1", data: DIA, inicio: "19:00", orientacoesConfirmadas: true };
const r = g.post({ ...pedido, eventoId: "vaga1" });
assert.ok(r.ok, "agendar na vaga: " + JSON.stringify(r));
const r2 = g.post({ ...pedido, inicio: "19:30" });
assert.strictEqual(r2.ok, false); assert.strictEqual(r2.codigo, "LOTADO");
console.log("agenda-limite-vaga: ok");
