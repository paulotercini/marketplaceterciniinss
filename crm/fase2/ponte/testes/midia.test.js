// O que sai pelo WhatsApp quando a mensagem tem arquivo. Errar o tipo aqui
// faz a foto do cliente chegar como "arquivo.bin" para baixar.
process.env.SUPABASE_URL = "https://falso.supabase.co";
process.env.SUPABASE_SERVICE_KEY = "chave-de-teste";

const t = require("node:test");
const a = require("node:assert");
const { conteudoDaMensagem } = require("../ponte");

const CONTEUDO = Buffer.from("conteudo-do-arquivo");
global.fetch = async () => ({ ok: true, status: 200,
  arrayBuffer: async () => CONTEUDO.buffer.slice(CONTEUDO.byteOffset,
                                                 CONTEUDO.byteOffset + CONTEUDO.length) });

t.test("mensagem sem arquivo continua sendo texto", async () => {
  a.deepEqual(await conteudoDaMensagem({texto:"oi"}), {text:"oi"});
  a.deepEqual(await conteudoDaMensagem({texto:null}), {text:""});
});

t.test("foto chega como FOTO, com a legenda junto", async () => {
  const c = await conteudoDaMensagem({tipo:"imagem", midia_url:"zap/x.jpg",
    midia_mime:"image/jpeg", texto:"segue o print do Meu INSS"});
  a.ok(Buffer.isBuffer(c.image));
  a.equal(c.caption, "segue o print do Meu INSS");
  a.equal(c.document, undefined, "não pode virar documento");
});

t.test("documento leva o nome original, senão vira arquivo.bin", async () => {
  const c = await conteudoDaMensagem({tipo:"documento", midia_url:"zap/y.pdf",
    midia_mime:"application/pdf", midia_nome:"Lista de documentos.pdf", texto:""});
  a.ok(Buffer.isBuffer(c.document));
  a.equal(c.fileName, "Lista de documentos.pdf");
  a.equal(c.mimetype, "application/pdf");
  a.equal(c.caption, undefined, "legenda vazia não vira string vazia");
});

t.test("documento sem nome ainda assim tem um nome", async () => {
  const c = await conteudoDaMensagem({tipo:"documento", midia_url:"zap/z", midia_mime:null});
  a.equal(c.fileName, "arquivo");
  a.equal(c.mimetype, "application/octet-stream");
});

t.test("áudio vai como recado de voz, não como música", async () => {
  const c = await conteudoDaMensagem({tipo:"audio", midia_url:"zap/a.ogg",
    midia_mime:"audio/ogg; codecs=opus"});
  a.ok(Buffer.isBuffer(c.audio));
  a.equal(c.ptt, true);
});

t.test("vídeo é vídeo", async () => {
  const c = await conteudoDaMensagem({tipo:"video", midia_url:"zap/v.mp4",
    midia_mime:"video/mp4", texto:"olha"});
  a.ok(Buffer.isBuffer(c.video));
  a.equal(c.caption, "olha");
});

t.test("tipo desconhecido cai para documento, e não some", async () => {
  const c = await conteudoDaMensagem({tipo:"figurinha", midia_url:"zap/s.webp",
    midia_mime:"image/webp"});
  a.ok(Buffer.isBuffer(c.document));
});
