// cd crm/fase2/ponte && npm test
// Sem rede, sem WhatsApp, sem banco: só a tradução do que o Baileys entrega.
const t = require("node:test");
const a = require("node:assert");
const N = require("../normalizar");

const msg = (conteudo, extra = {}) => ({
  key: { remoteJid: "5516999990000@s.whatsapp.net", id: "WA1", fromMe: false },
  pushName: "Maria", messageTimestamp: 1785000000,
  message: conteudo, ...extra,
});

t.test("telefone: formatos diferentes, mesma pessoa", () => {
  a.equal(N.chaveFone("+55 (16) 99999-0000"), "99990000");
  a.equal(N.chaveFone("5516999990000"), "99990000");
  a.equal(N.chaveFone("16999990000"), "99990000");
  a.equal(N.jidParaFone("5516999990000@s.whatsapp.net"), "5516999990000");
  a.equal(N.jidParaFone("5516999990000:12@s.whatsapp.net"), "5516999990000");
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
  a.equal(N.deveIgnorar({ key: { remoteJid: "5516999990000@s.whatsapp.net" } }), true, "vazia");
});

t.test("mensagem de gente passa", () => {
  a.equal(N.deveIgnorar(msg({ conversation: "oi" })), false);
});

t.test("nome de arquivo não quebra o Storage", () => {
  // ": " vira UM traço só, não dois: nome de arquivo com buraco duplo é feio
  a.equal(N.nomeSeguro("laudo do médico: 12/03.pdf"), "laudo_do_médico_12_03.pdf");
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
