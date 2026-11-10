// F335 · node --experimental-strip-types --test crm/fase2/testes/funcoes/zap_push.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
const { aviso, avisoMencao, avisoLembrete, destinatarios, mascarar } = await import("../../zap_push/index.ts");

test("aviso: nome do cliente, texto curto e sem número longo", () => {
  const a = aviso({ id: "m", conversa_id: "c", tipo: "texto", texto: "Meu CPF é 123.456.789-00, saiu a perícia?" },
    { id: "c", atendente_id: null, automatica: false, nome_perfil: "Zé", telefone: "5516999" }, "José da Silva");
  assert.equal(a.title, "José da Silva");
  assert.equal(a.body, "Meu CPF é [número], saiu a perícia?");
  assert.deepEqual(a.data, { crm: "zap", conversa: "c", mensagem: "m" });
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

test("F389 · a foto de quem escreve vai como ícone do aviso; sem foto, fica o do CRM", () => {
  const c = { id: "c", atendente_id: null, automatica: false, nome_perfil: "Maria", telefone: null };
  const m = { id: "m", conversa_id: "c", tipo: "texto", texto: "oi" };
  assert.equal(aviso(m, c, null, "https://x/foto.jpg").icon, "https://x/foto.jpg");
  assert.equal("icon" in aviso(m, c, null), false);
});

test("F395 · o áudio mostra a transcrição; a que falhou volta a dizer Áudio", () => {
  const c = { id: "c", atendente_id: null, automatica: false, nome_perfil: "Maria", telefone: null };
  assert.equal(aviso({ id: "m", conversa_id: "c", tipo: "audio", texto: "Bom dia, saiu a perícia?" }, c, null).body, "🎤 Bom dia, saiu a perícia?");
  assert.equal(aviso({ id: "m", conversa_id: "c", tipo: "audio", texto: "[áudio não transcrito]" }, c, null).body, "🎤 Áudio");
});

test("F396 · a conversa diz quantas chegaram, tem Responder, e o áudio tem Ouvir", () => {
  const c = { id: "c", atendente_id: null, automatica: false, nome_perfil: "Maria", telefone: null, nao_lidas: 3 };
  const a = aviso({ id: "m", conversa_id: "c", tipo: "audio", texto: "oi", midia_url: "zap/a.ogg" }, c, null);
  assert.equal(a.title, "Maria · 3 mensagens");
  assert.deepEqual(a.actions.map((x) => x.action), ["responder", "ouvir"]);
  assert.equal(a.data.mensagem, "m");
  const t = aviso({ id: "m", conversa_id: "c", tipo: "texto", texto: "oi" }, { ...c, nao_lidas: 1 }, null);
  assert.equal(t.title, "Maria"); assert.deepEqual(t.actions.map((x) => x.action), ["responder"]);
});
test("F396 · a menção: quem citou, sem número longo; a de conversa abre a conversa", () => {
  const m = avisoMencao({ id: "x", texto: "Ver o NB 123.456.789-0 hoje", conversa_id: null }, "Amanda");
  assert.equal(m.title, "Menção de Amanda"); assert.equal(m.body, "Ver o NB [número] hoje"); assert.equal(m.data.crm, "mencao");
  assert.equal(avisoMencao({ id: "x", texto: "oi", conversa_id: "c" }, null).data.conversa, "c");
});

test("F452 · o lembrete antes do compromisso mascara o número e abre o CRM", () => {
  const a = avisoLembrete({ titulo: "Perícia em 2 h (09:30)", corpo: "Maria · Ligar sobre o NB 123.456.789-0", tag: "crm-lem-ev:1", cliente_id: "c1" });
  assert.equal(a.title, "Perícia em 2 h (09:30)");
  assert.ok(!/123/.test(a.body) && /\[número\]/.test(a.body));
  assert.equal(a.tag, "crm-lem-ev:1");
  assert.equal(a.data.crm, "lembrete");
  assert.equal(a.data.cliente, "c1");
});

test("F515 · a senha não aparece na tela do celular e o segredo do cabeçalho confere a origem", async () => {
  const a = aviso({ id: "m", conversa_id: "c", tipo: "texto", texto: "minha senha do gov é Teste@123" },
    { id: "c", atendente_id: null, automatica: false, nome_perfil: "Cliente Teste", telefone: "550000000001" }, null);
  assert.equal(a.body, "minha senha do gov é [senha]");
  const { conferirSegredo } = await import("../../zap_push/index.ts");
  assert.equal(conferirSegredo(null, "abc", false).ok, true);
  assert.equal(conferirSegredo("abc", "abc", true).ok, true);
  assert.equal(conferirSegredo("abx", "abc", true).ok, false);
});
