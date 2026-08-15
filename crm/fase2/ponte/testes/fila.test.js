// A fila de saída é onde uma mensagem some ou vai dobrada. Aqui o Supabase e
// o WhatsApp são de mentira: o que se testa é a decisão da ponte.
process.env.SUPABASE_URL = "https://falso.supabase.co";
process.env.SUPABASE_SERVICE_KEY = "chave-de-teste";
process.env.PAUSA_ENVIO = "0";

const t = require("node:test");
const a = require("node:assert");
const { enviar } = require("../ponte");

// ── Supabase de mentira ───────────────────────────────────────────────────
let chamadas = [];
function fingirBanco({ pegaAFila = true, conversa = { telefone: "5516999990000" } } = {}) {
  chamadas = [];
  global.fetch = async (url, opts = {}) => {
    const u = String(url), m = opts.method || "GET";
    chamadas.push({ u, m, corpo: opts.body ? JSON.parse(opts.body) : null });
    const ok = corpo => ({ ok: true, status: 200, text: async () => JSON.stringify(corpo) });
    if (m === "PATCH" && u.includes("status=eq.fila"))
      return ok(pegaAFila ? [{ id: "m1" }] : []);
    if (m === "GET" && u.includes("zap_conversas")) return ok(conversa ? [conversa] : []);
    return ok(null);
  };
}
const patchesFinais = () => chamadas.filter(c =>
  c.m === "PATCH" && !c.u.includes("status=eq.fila")).map(c => c.corpo);

// ── WhatsApp de mentira ───────────────────────────────────────────────────
const zapOk = {
  onWhatsApp: async () => [{ exists: true, jid: "5516999990000@s.whatsapp.net" }],
  sendPresenceUpdate: async () => {},
  sendMessage: async () => ({ key: { id: "WA-NOVA" } }),
};
const zapQuebrado = { ...zapOk, sendMessage: async () => { throw new Error("sem conexão"); } };

t.test("envio feliz: marca enviada e guarda o id do WhatsApp", async () => {
  fingirBanco();
  await enviar({ id: "m1", conversa_id: "c1", texto: "Saiu sim!" }, zapOk);
  const [fim] = patchesFinais();
  a.equal(fim.status, "enviada");
  a.equal(fim.externo_id, "WA-NOVA");
  a.ok(fim.enviada_em, "grava a hora do envio");
});

t.test("a mensagem é reservada ANTES de sair, para não sair duas vezes", async () => {
  fingirBanco();
  await enviar({ id: "m1", conversa_id: "c1", texto: "oi" }, zapOk);
  const reserva = chamadas.find(c => c.u.includes("status=eq.fila"));
  a.ok(reserva, "reserva acontece");
  a.equal(reserva.corpo.status, "enviando");
  a.ok(chamadas.indexOf(reserva) === 0, "e é a primeira coisa que se faz");
});

t.test("se outro já pegou, não manda nada", async () => {
  fingirBanco({ pegaAFila: false });
  await enviar({ id: "m1", conversa_id: "c1", texto: "oi" },
    { ...zapOk, sendMessage: async () => { throw new Error("não podia ter mandado"); } });
  a.equal(patchesFinais().length, 0);
});

t.test("falha volta para a fila e conta a tentativa", async () => {
  fingirBanco();
  await enviar({ id: "m1", conversa_id: "c1", texto: "oi", tentativas: 0 }, zapQuebrado);
  const [fim] = patchesFinais();
  a.equal(fim.status, "fila", "continua para tentar de novo");
  a.equal(fim.tentativas, 1);
  a.match(fim.erro, /sem conexão/);
});

t.test("na terceira falha desiste e marca erro — mensagem não some calada", async () => {
  fingirBanco();
  await enviar({ id: "m1", conversa_id: "c1", texto: "oi", tentativas: 2 }, zapQuebrado);
  const [fim] = patchesFinais();
  a.equal(fim.status, "erro");
  a.equal(fim.tentativas, 3);
});

t.test("número sem WhatsApp vira erro, não some", async () => {
  fingirBanco();
  await enviar({ id: "m1", conversa_id: "c1", texto: "oi", tentativas: 2 },
    { ...zapOk, onWhatsApp: async () => [{ exists: false }] });
  const [fim] = patchesFinais();
  a.equal(fim.status, "erro");
  a.match(fim.erro, /não tem WhatsApp/);
});

t.test("conversa sem telefone não derruba a ponte", async () => {
  fingirBanco({ conversa: null });
  await enviar({ id: "m1", conversa_id: "c1", texto: "oi", tentativas: 0 }, zapOk);
  a.equal(patchesFinais()[0].status, "fila");
});
