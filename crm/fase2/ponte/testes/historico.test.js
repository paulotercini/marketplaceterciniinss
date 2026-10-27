// F286: a conversa com historico_pedido recebe do celular as mensagens
// anteriores à mais antiga do CRM, página a página, e o pedido fica feito.
process.env.SUPABASE_URL = "https://falso.supabase.co";
process.env.SUPABASE_SERVICE_KEY = "chave-de-teste";

const t = require("node:test");
const a = require("node:assert");
const P = require("../ponte");

const msg = (id, seg, fromMe = false) => ({ key: { id, remoteJid: "5516993460685@s.whatsapp.net", fromMe },
  messageTimestamp: seg, message: { conversation: "texto " + id } });

t.test("busca o histórico pedido, grava as antigas e marca o pedido feito", async () => {
  const gravadas = [], patches = [];
  global.fetch = async (url, opts = {}) => {
    const u = String(url), m = opts.method || "GET";
    const ok = c => ({ ok: true, status: 200, text: async () => JSON.stringify(c) });
    if (m === "GET" && u.includes("zap_conversas?historico_pedido")) return ok([{ id: "c1", telefone: "5516993460685" }]);
    if (m === "GET" && u.includes("order=quando_wa.asc")) return ok([{ externo_id: "NOVA", direcao: "entrada", quando_wa: "2026-10-26T16:48:00.000Z" }]);
    if (m === "GET" && u.includes("externo_id=eq.")) return ok([]);
    if (m === "POST" && u.includes("zap_mensagens")) { gravadas.push(JSON.parse(opts.body)); return ok(null); }
    if (m === "PATCH") { patches.push(JSON.parse(opts.body)); return ok(null); }
    return ok(null);
  };
  const t0 = Date.parse("2026-10-20T12:00:00Z") / 1000;
  const paginas = [[msg("A2", t0 + 60, true), msg("A1", t0)], []];
  const pedidos = [];
  const zap = {
    onWhatsApp: async () => [{ exists: true, jid: "5516993460685@s.whatsapp.net" }],
    fetchMessageHistory: async (n, chave) => { pedidos.push(chave.id); setTimeout(() => P._pagina(paginas.shift() || []), 5); },
  };
  P._ligado(true);
  await P.buscarHistoricosPedidos(zap);
  a.deepStrictEqual(pedidos, ["NOVA", "A1"]);            // pede antes da mais antiga, depois antes da anterior
  a.deepStrictEqual(gravadas.map(g => [g.externo_id, g.direcao]), [["A2", "saida"], ["A1", "entrada"]]);
  a.ok(patches.at(-1).historico_feito);
  a.match(patches.at(-1).historico_resultado, /^2 mensagem/);
});
