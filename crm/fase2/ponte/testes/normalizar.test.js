// cd crm/fase2/ponte && npm test
// Sem rede, sem WhatsApp, sem banco: só a tradução do que o Baileys entrega.
const t = require("node:test");
const a = require("node:assert");
const N = require("../normalizar");

t.test("variantes do celular: com e sem o 9; o fixo fica como está", () => {
  a.deepEqual(N.variantesFone("(00) 9000-0004"), ["550090000004", "5500990000004"]);
  a.deepEqual(N.variantesFone("00990000004"), ["5500990000004", "550090000004"]);
  a.deepEqual(N.variantesFone("0030000005"), ["550030000005"]);
});

t.test("ligação: número do jid, do mapa do @lid, e nada fora do toque inicial", () => {
  a.equal(N.foneDaLigacao({ status: "offer", from: "5500990000004@s.whatsapp.net" }), "5500990000004");
  a.equal(N.foneDaLigacao({ status: "offer", from: "5500990000004:12@s.whatsapp.net" }), "5500990000004");
  const mapa = new Map([["1199@lid", "5500900000006@s.whatsapp.net"]]);
  a.equal(N.foneDaLigacao({ status: "offer", from: "1199:3@lid" }, mapa), "5500900000006");
  a.equal(N.foneDaLigacao({ status: "offer", from: "7777@lid" }, mapa), "");
  a.equal(N.foneDaLigacao({ status: "ringing", from: "5500990000004@s.whatsapp.net" }), "");
  a.equal(N.foneDaLigacao({ status: "offer", isGroup: true, from: "5500990000004@s.whatsapp.net" }), "");
});

const msg = (conteudo, extra = {}) => ({
  key: { remoteJid: "5500900000001@s.whatsapp.net", id: "WA1", fromMe: false },
  pushName: "Cliente Teste", messageTimestamp: 1785000000,
  message: conteudo, ...extra,
});

t.test("telefone: formatos diferentes, mesma pessoa", () => {
  a.equal(N.chaveFone("+55 (00) 90000-0001"), "00000001");
  a.equal(N.chaveFone("5500900000001"), "00000001");
  a.equal(N.chaveFone("00900000001"), "00000001");
  a.equal(N.jidParaFone("5500900000001@s.whatsapp.net"), "5500900000001");
  a.equal(N.jidParaFone("5500900000001:12@s.whatsapp.net"), "5500900000001");
});

t.test("contato com id de privacidade (@lid): vale o número de verdade", () => {
  a.equal(N.foneDaMensagem(msg({ conversation: "oi" }, { key: { remoteJid: "100000000000001@lid", senderPn: "5500900000001@s.whatsapp.net", id: "WA2" } })), "5500900000001");
  a.equal(N.foneDaMensagem(msg({ conversation: "oi" })), "5500900000001");
  a.equal(N.foneDaMensagem(msg({ conversation: "oi" }, { key: { remoteJid: "100000000000001@lid", id: "WA3" } })), "100000000000001");
});

t.test("o que sai do escritório numa conversa @lid: o número vem do mapa aprendido", () => {
  const mapa = new Map();
  const entra = msg({ conversation: "oi" }, { key: { remoteJid: "2222@lid", senderPn: "5500900000001@s.whatsapp.net", id: "E1" } });
  const sai = msg({ conversation: "bom dia" }, { key: { remoteJid: "2222@lid", senderPn: "5500900000007@s.whatsapp.net", fromMe: true, id: "S1" } });
  a.equal(N.foneDaMensagem(sai, mapa), "");                 // sem mapa: não se sabe de quem é
  a.equal(N.foneDaMensagem(entra, mapa), "5500900000001");  // o cliente ensina o mapa
  a.equal(N.foneDaMensagem(sai, mapa), "5500900000001");    // nunca o nosso próprio número
  a.equal(N.foneDaMensagem(msg({ conversation: "x" }, { key: { remoteJid: "5500900000008@s.whatsapp.net", fromMe: true, id: "S2" } })), "5500900000008");
});

t.test("Baileys 7: o número vem em key.remoteJidAlt, também no que sai do escritório", () => {
  const mapa = new Map();
  const sai = msg({ conversation: "bom dia" }, { key: { remoteJid: "3333@lid", remoteJidAlt: "5500900000009@s.whatsapp.net", fromMe: true, id: "S7" } });
  a.equal(N.foneDaMensagem(sai, mapa), "5500900000009");
  a.equal(mapa.get("3333@lid"), "5500900000009@s.whatsapp.net");
  const h = { key: { remoteJid: "4444@lid", remoteJidAlt: "5500900000000@s.whatsapp.net", id: "H7", fromMe: true },
    messageTimestamp: 1785000000, message: { conversation: "x" } };
  const g = N.agruparHistorico([], [h], new Set([N.chaveFone("5500900000000")]));
  a.equal(g.get("5500900000000").length, 1);
});

t.test("histórico: só cliente entra, @lid acha o número, ordem por data", () => {
  const h = (jid, ts, extra = {}) => ({ key: { remoteJid: jid, id: "H" + ts, fromMe: false, ...extra },
    messageTimestamp: ts, message: { conversation: "msg " + ts } });
  const chats = [{ id: "2222@lid", pnJid: "5500900000000@s.whatsapp.net" }];
  const msgs = [
    h("5500900000001@s.whatsapp.net", 1785000300),
    h("5500900000001@s.whatsapp.net", 1785000100, { fromMe: true }),
    h("2222@lid", 1785000200, { fromMe: true, senderPn: "5500900000007@s.whatsapp.net" }),
    h("5500900000012@s.whatsapp.net", 1785000400),
    h("1203630@g.us", 1785000500),
    h("3333@lid", 1785000600),
  ];
  const g = N.agruparHistorico(chats, msgs, new Set(["00000001", "00000000"]));
  a.deepEqual([...g.keys()].sort(), ["5500900000000", "5500900000001"]);
  a.deepEqual(g.get("5500900000001").map(m => m.messageTimestamp), [1785000100, 1785000300]);
  a.equal(g.get("5500900000000").length, 1);
});

t.test("citação e reação do cliente, e a chave para citar ou reagir", () => {
  const citando = msg({ extendedTextMessage: { text: "isso mesmo", contextInfo: { stanzaId: "ORIG1" } } });
  a.equal(N.citacaoDe(citando), "ORIG1");
  a.equal(N.citacaoDe(msg({ conversation: "oi" })), null);
  const reage = { key: { remoteJid: "5500900000001@s.whatsapp.net", id: "R1" }, message: { reactionMessage: { key: { id: "ORIG1" }, text: "👍" } } };
  a.deepEqual(N.reacaoDe(reage), { id: "ORIG1", emoji: "👍" });
  a.deepEqual(N.reacaoDe({ key: {}, message: { reactionMessage: { key: { id: "ORIG1" }, text: "" } } }), { id: "ORIG1", emoji: "" });
  a.equal(N.reacaoDe(msg({ conversation: "oi" })), null);
  a.deepEqual(N.chaveDaMensagem("x@s.whatsapp.net", { externo_id: "E", direcao: "entrada" }), { remoteJid: "x@s.whatsapp.net", id: "E", fromMe: false });
  a.equal(N.chaveDaMensagem("x", { externo_id: "E", direcao: "saida" }).fromMe, true);
});

t.test("texto simples e texto com citação", () => {
  a.equal(N.textoDaMensagem(msg({ conversation: "Doutor, saiu a perícia?" })),
          "Doutor, saiu a perícia?");
  a.equal(N.textoDaMensagem(msg({ extendedTextMessage: { text: "respondendo isso" } })),
          "respondendo isso");
});

t.test("legenda de foto é texto, não se perde", () => {
  const m = msg({ imageMessage: { mimetype: "image/jpeg", caption: "segue o laudo" } });
  a.equal(N.tipoDaMensagem(m), "imagem");
  a.equal(N.textoDaMensagem(m), "segue o laudo");
});

t.test("documento sem legenda usa o nome do arquivo", () => {
  const m = msg({ documentMessage: { mimetype: "application/pdf", fileName: "CNIS.pdf" } });
  a.equal(N.tipoDaMensagem(m), "documento");
  a.equal(N.textoDaMensagem(m), "CNIS.pdf");
});

t.test("áudio e figurinha são reconhecidos", () => {
  a.equal(N.tipoDaMensagem(msg({ audioMessage: { mimetype: "audio/ogg" } })), "audio");
  a.equal(N.tipoDaMensagem(msg({ stickerMessage: {} })), "figurinha");
});

t.test("mensagem some-depois vem embrulhada e mesmo assim é lida", () => {
  const m = msg({ viewOnceMessageV2: { message: { imageMessage: { caption: "olha" } } } });
  a.equal(N.tipoDaMensagem(m), "imagem");
  a.equal(N.textoDaMensagem(m), "olha");
});

t.test("mensagem temporária (ephemeral) idem", () => {
  const m = msg({ ephemeralMessage: { message: { conversation: "some em 24h" } } });
  a.equal(N.textoDaMensagem(m), "some em 24h");
  a.equal(N.deveIgnorar(m), false);
});

t.test("o que NÃO pode virar linha na tela", () => {
  a.equal(N.deveIgnorar(msg({ protocolMessage: { type: 0 } })), true, "apagamento");
  a.equal(N.deveIgnorar(msg({ reactionMessage: { text: "👍" } })), true, "reação");
  a.equal(N.deveIgnorar(msg({ senderKeyDistributionMessage: {} })), true, "chave");
  a.equal(N.deveIgnorar({ key: { remoteJid: "x@g.us" }, message: { conversation: "oi" } }),
          true, "grupo");
  a.equal(N.deveIgnorar({ key: { remoteJid: "status@broadcast" },
                          message: { conversation: "meu status" } }), true, "status");
  a.equal(N.deveIgnorar({ key: { remoteJid: "5500900000001@s.whatsapp.net" } }), true, "vazia");
});

t.test("mensagem de gente passa", () => {
  a.equal(N.deveIgnorar(msg({ conversation: "oi" })), false);
});

t.test("nome de arquivo não quebra o Storage", () => {
  // ": " vira UM traço só, não dois: nome de arquivo com buraco duplo é feio
  a.equal(N.nomeSeguro("laudo do médico: 12/03.pdf"), "laudo_do_medico_12_03.pdf");
  a.equal(N.nomeSeguro("Agendamento_Perícia_Médica.pdf"), "Agendamento_Pericia_Medica.pdf");
  a.equal(N.nomeSeguro("", "audio", "audio/ogg; codecs=opus"), "audio.ogg");
  a.equal(N.nomeSeguro(null, "imagem", "image/jpeg"), "imagem.jpeg");
  a.ok(N.nomeSeguro("x".repeat(200)).length <= 80);
});

t.test("o relógio é o do WhatsApp, em segundos", () => {
  a.equal(N.quandoWa(msg({ conversation: "oi" })), new Date(1785000000000).toISOString());
  // algumas versões entregam Long, não número
  a.equal(N.quandoWa({ messageTimestamp: { toNumber: () => 1785000000 } }),
          new Date(1785000000000).toISOString());
  a.equal(N.quandoWa({}), null);
});

t.test("recente: o lote da reconexão entra só com o que chegou nos últimos dias", () => {
  const agora = Date.parse("2026-10-20T12:00:00Z");
  const m = s => ({ messageTimestamp: Math.floor(Date.parse(s) / 1000) });
  a.strictEqual(N.recente(m("2026-10-20T11:59:00Z"), 3 * 864e5, agora), true);
  a.strictEqual(N.recente(m("2026-10-10T11:59:00Z"), 3 * 864e5, agora), false);
  a.strictEqual(N.recente({}, 3 * 864e5, agora), false);
});

t.test("F332: apagada e editada no WhatsApp", () => {
  const pm = p => ({ key: { remoteJid: "5500900000001@s.whatsapp.net" }, message: { protocolMessage: p } });
  a.deepEqual(N.alteracaoDe(pm({ type: 0, key: { id: "X1" } })), { id: "X1", apagada: true });
  a.deepEqual(N.alteracaoDe(pm({ type: 14, key: { id: "X2" }, editedMessage: { conversation: "corrigido" } })), { id: "X2", texto: "corrigido" });
  a.deepEqual(N.alteracaoDe({ message: { editedMessage: { message: { protocolMessage: { type: 14, key: { id: "X3" },
    editedMessage: { extendedTextMessage: { text: "novo" } } } } } } }), { id: "X3", texto: "novo" });
  a.equal(N.alteracaoDe(pm({ type: 3, key: { id: "X4" } })), null);
  a.equal(N.alteracaoDe({ message: { conversation: "oi" } }), null);
  // o messages.update do Baileys 6.7 desembrulha a edição: o id vem da chave do aviso
  a.deepEqual(N.alteracaoDe({ message: { editedMessage: { message: { conversation: "corrigido" } } } }, "X5"), { id: "X5", texto: "corrigido" });
  a.equal(N.alteracaoDe({ message: { conversation: "oi" } }), null);
});

t.test("F491: a mensagem de cliente que não abriu pede o histórico; grupo, enviada e outro stub não", () => {
  const { naoAbriu } = require("../normalizar");
  const k = (j, fromMe = false) => ({ remoteJid: j, fromMe, id: "X" });
  a.equal(naoAbriu({ key: k("5500900000011@s.whatsapp.net"), messageStubType: 2 }), true);
  a.equal(naoAbriu({ key: k("123@lid"), messageStubType: 2 }), true);
  a.equal(naoAbriu({ key: k("1203@g.us"), messageStubType: 2 }), false);
  a.equal(naoAbriu({ key: k("5500900000011@s.whatsapp.net", true), messageStubType: 2 }), false);
  a.equal(naoAbriu({ key: k("5500900000011@s.whatsapp.net"), messageStubType: 1 }), false);
  a.equal(naoAbriu({ key: k("5500900000011@s.whatsapp.net"), messageStubType: 2, message: { conversation: "oi" } }), false);
});
