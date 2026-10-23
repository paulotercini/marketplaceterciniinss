// O arquivo que o cliente manda pelo WhatsApp tem de chegar ao Storage e à
// linha de zap_mensagens com o caminho certo. Sem rede: fetch e Baileys falsos.
process.env.SUPABASE_URL = "https://falso.supabase.co";
process.env.SUPABASE_SERVICE_KEY = "chave-de-teste";

const t = require("node:test");
const a = require("node:assert");
const P = require("../ponte");

let chamadas, jaExiste;
global.fetch = async (url, o = {}) => {
  chamadas.push({ url: String(url), metodo: o.method || "GET", corpo: o.body, cab: o.headers || {} });
  const ok = (corpo) => ({ ok: true, status: 200, text: async () => corpo });
  if (String(url).includes("/rest/v1/zap_mensagens?externo_id")) return ok(JSON.stringify(jaExiste));
  return ok("");
};
const ARQ = Buffer.from("%PDF-1.4 laudo");
const msgDoc = (id, fileName) => ({
  key: { id, remoteJid: "5516999990000@s.whatsapp.net", fromMe: false },
  messageTimestamp: 1761177600,
  message: { documentMessage: { fileName, mimetype: "application/pdf", caption: "segue o laudo" } },
});
const subidas = () => chamadas.filter(c => c.url.includes("/storage/v1/object/") && c.metodo === "POST");
const insercao = () => JSON.parse(chamadas.find(c => c.url.endsWith("/rest/v1/zap_mensagens") && c.metodo === "POST").corpo);

t.beforeEach(() => { chamadas = []; jaExiste = []; P._usarSocket({ updateMediaMessage: async m => m }); });

t.test("documento do cliente vai ao Storage e a linha guarda o caminho", async () => {
  const linha = await P.gravar(msgDoc("ABC1", "Laudo médico ortopedista.pdf"), async () => ARQ, "conv-1", "entrada", "entregue");
  const [up] = subidas();
  a.ok(up, "o arquivo não foi enviado ao Storage");
  a.equal(up.url, "https://falso.supabase.co/storage/v1/object/anexos/zap/conv-1/ABC1-Laudo_medico_ortopedista.pdf");
  a.equal(up.corpo, ARQ, "o conteúdo enviado não é o recebido");
  a.equal(up.cab["Content-Type"], "application/pdf");
  const ins = insercao();
  a.equal(ins.midia_url, "zap/conv-1/ABC1-Laudo_medico_ortopedista.pdf");
  a.equal(ins.midia_nome, "Laudo médico ortopedista.pdf", "o nome que o cliente mandou se perdeu");
  a.equal(ins.midia_mime, "application/pdf");
  a.equal(ins.texto, "segue o laudo");
  a.equal(linha.repetida, undefined);
});

t.test("foto sem nome ganha nome pelo tipo e também é salva", async () => {
  const m = { key: { id: "F1", remoteJid: "5516999990000@s.whatsapp.net" },
              message: { imageMessage: { mimetype: "image/jpeg" } } };
  await P.gravar(m, async () => Buffer.from("jpg"), "conv-1", "entrada", "entregue");
  a.match(subidas()[0].url, /zap\/conv-1\/F1-imagem\.jpeg$/);
  a.equal(insercao().midia_url, "zap/conv-1/F1-imagem.jpeg");
});

t.test("link vencido (403): pede reenvio ao celular e salva na segunda tentativa", async () => {
  let n = 0, pediu = false;
  P._usarSocket({ updateMediaMessage: async m => { pediu = true; return m; } });
  await P.gravar(msgDoc("V1", "rg.pdf"), async () => { if (n++ === 0) throw new Error("status code 403"); return ARQ; },
                 "conv-1", "entrada", "entregue");
  a.ok(pediu);
  a.equal(insercao().midia_url, "zap/conv-1/V1-rg.pdf");
});

t.test("falha no download não perde a mensagem: fica marcada para recuperar", async () => {
  await P.gravar(msgDoc("X1", "cnis.pdf"), async () => { throw new Error("timeout"); }, "conv-1", "entrada", "entregue");
  a.equal(subidas().length, 0);
  const ins = insercao();
  a.equal(ins.midia_url, undefined);
  a.match(ins.texto, /\[mídia não baixada\]/);
});

t.test("mensagem já gravada sem mídia: o --recuperar-midia completa a mesma linha", async () => {
  jaExiste = [{ id: 77, texto: "segue o laudo [mídia não baixada]", midia_url: null }];
  const linha = await P.gravar(msgDoc("ABC1", "laudo.pdf"), async () => ARQ, "conv-1", "entrada", "entregue");
  a.equal(linha.repetida, true);
  const patch = chamadas.find(c => c.metodo === "PATCH");
  a.ok(patch.url.endsWith("/rest/v1/zap_mensagens?id=eq.77"));
  const corpo = JSON.parse(patch.corpo);
  a.equal(corpo.midia_url, "zap/conv-1/ABC1-laudo.pdf");
  a.equal(corpo.texto, "segue o laudo");
});
