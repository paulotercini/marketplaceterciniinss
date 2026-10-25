// node --experimental-strip-types testes/funcoes/zap_plantao.test.mjs
import assert from "node:assert/strict";
import { mascarar, transcricao, promptPlantao, ESQUEMA } from "../../zap_plantao/index.ts";

assert.equal(mascarar("CPF 123.456.789-09"), "CPF [número]");
const msgs = [
  { direcao: "saida", por_bot: false, tipo: "texto", texto: "*Dr. Marcos:*\n\nBom dia! Até o momento nada", momento: "2026-10-24T12:00:00Z" },
  { direcao: "entrada", por_bot: false, tipo: "texto", texto: "e o meu processo, NB 1234567890?", momento: "2026-10-24T13:00:00Z" },
  { direcao: "entrada", por_bot: false, tipo: "audio", texto: null, momento: "2026-10-24T13:01:00Z" },
];
const t = transcricao(msgs);
assert.ok(t.includes("*Dr. Marcos:*"), "a assinatura da equipe vai ao modelo");
assert.ok(t.includes("NB [número]") && t.includes("[audio]"));
assert.ok(t.includes("24/10/2026, 09:00"), "hora de Brasília");

const base = { contato: "Maria", advogado: "Dr. Marcos", advogados: ["Dr. Paulo Tercini", "Dr. Marcos", "Dra. Amanda Garcez"],
  modo: "", respostas: 0, horario: true, agenda: true, agora: "24/10/2026 10:20", mensagens: msgs };
const p1 = promptPlantao({ ...base, cliente: { nome: "Maria", mesmo_telefone: true, casos: [{ beneficio: "B31", fase: "inss", etapa: "aguardando perícia" }] } });
assert.ok(p1.includes("etapa: aguardando perícia") && p1.includes("Dr. Marcos vai responder"));
assert.ok(p1.includes("opinião jurídica") && p1.includes("PIX") && p1.includes("assistente virtual"));
const p2 = promptPlantao({ ...base, cliente: { nome: "Maria", mesmo_telefone: false, casos: [] } });
assert.ok(p2.includes("não fale da situação") && !p2.includes("etapa: "), "outro telefone não recebe a etapa");
const p3 = promptPlantao({ ...base, cliente: null, horario: false, modo: "lead", respostas: 5 });
assert.ok(p3.includes("fora do horário") && p3.includes("no próximo dia útil") && p3.includes("depois de 1 respostas"));
assert.deepEqual(ESQUEMA.properties.acao.enum, ["nada", "responder", "lead", "agendar", "equipe"]);
console.log("zap_plantao: ok");
