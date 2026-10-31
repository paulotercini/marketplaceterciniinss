// F334 · node --experimental-strip-types --test crm/fase2/testes/funcoes/zap_push.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
const { aviso, destinatarios, mascarar } = await import("../../zap_push/index.ts");

test("aviso: nome do cliente, texto curto e sem número longo", () => {
  const a = aviso({ id: "m", conversa_id: "c", tipo: "texto", texto: "Meu CPF é 123.456.789-00, saiu a perícia?" },
    { id: "c", atendente_id: null, automatica: false, nome_perfil: "Zé", telefone: "5516999" }, "José da Silva");
  assert.equal(a.title, "José da Silva");
  assert.equal(a.body, "Meu CPF é [número], saiu a perícia?");
  assert.deepEqual(a.data, { crm: "zap", conversa: "c" });
  assert.equal(a.tag, "crm-zap-c");
});
test("aviso: mídia sem texto diz o tipo; sem ficha usa o nome do perfil", () => {
  const a = aviso({ id: "m", conversa_id: "c", tipo: "audio", texto: "" }, { id: "c", atendente_id: null, automatica: false, nome_perfil: "Maria", telefone: null }, null);
  assert.equal(a.title, "Maria"); assert.equal(a.body, "🎤 Áudio");
  assert.ok(aviso({ id: "m", conversa_id: "c", tipo: "texto", texto: "x".repeat(300) }, { id: "c", atendente_id: null, automatica: false, nome_perfil: null, telefone: "1" }, null).body.length <= 118);
});
test("destinatários: o atendente, e sem atendente todos", () => {
  const i = [{ colaborador_id: "a" }, { colaborador_id: "b" }, { colaborador_id: "a" }];
  assert.equal(destinatarios({ atendente_id: "a" }, i).length, 2);
  assert.equal(destinatarios({ atendente_id: null }, i).length, 3);
  assert.equal(mascarar("NB 1234567"), "NB 1234567");
});
