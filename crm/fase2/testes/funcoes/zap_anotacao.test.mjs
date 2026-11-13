// node --experimental-strip-types crm/fase2/testes/funcoes/zap_anotacao.test.mjs
import assert from "node:assert/strict";
const { mascarar, semAssinatura, soCortesia, prompt, conferir, conferirSegredo } = await import("../../zap_anotacao/index.ts");

// a data da perícia fica, o número longo e a senha saem
assert.equal(mascarar("Perícia em 21/11 às 9h, protocolo 123456789012"), "Perícia em 21/11 às 9h, protocolo [número]");
assert.match(mascarar("a senha: abc123"), /\[senha\]/);
assert.equal(semAssinatura("*Dr. Paulo Tercini:*\n\nAgendei a sua perícia."), "Agendei a sua perícia.");

// cumprimento, ok e agradecimento não geram sugestão
for (const t of ["Bom dia!", "Ok, obrigado 👍", "Fico à disposição."]) assert.equal(soCortesia(t), true, t);
assert.equal(soCortesia("Bom dia! Agendei a sua perícia para 21/11 às 9h."), false);

// o pedido leva só o que foi enviado, os casos e a sugestão anterior para juntar
const casos = [{ id: "k1", beneficio: "B31", fase: "INSS", etapa: "", apelido: "" }];
const p = prompt({ texto: "Agendei a sua perícia para 21/11 às 9h.", data: "2026-11-13", autor: "Amanda", casos, anterior: "Pedi o laudo." });
assert.match(p, /<mensagem>\nAgendei a sua perícia/);
assert.match(p, /k1/);
assert.match(p, /Pedi o laudo\./);

// conferência da saída
const r = conferir({ acao: "anotar", caso_id: "outro", texto: "Agendei a perícia — **21/11** às 9h00min.", evento: { tipo: "Perícia", data: "2026-11-21", hora: "09:00", local: "APS" } }, casos);
assert.equal(r.caso_id, "k1");
assert.doesNotMatch(r.texto, /[—*]/);
assert.equal(r.evento.data, "2026-11-21");
assert.equal(conferir({ acao: "anotar", caso_id: "k1", texto: "x", evento: { data: "21/11" } }, casos).evento, null);
const nada = conferir({ acao: "nada", caso_id: "k1", texto: "algo", evento: { data: "2026-11-21" } }, casos);
assert.equal(nada.texto, ""); assert.equal(nada.evento, null);
assert.equal(conferir({ acao: "anotar", caso_id: "", texto: "  " }, casos).acao, "nada");

// segredo da origem
assert.equal(conferirSegredo(null, "s", false).ok, true);
assert.equal(conferirSegredo(null, "s", true).ok, false);
assert.equal(conferirSegredo("s", "s", true).ok, true);
console.log("zap_anotacao: 6 grupos ok");
