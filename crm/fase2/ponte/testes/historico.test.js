// F286: a conversa com historico_pedido recebe do celular as mensagens
// anteriores à mais antiga do CRM, página a página, e o pedido fica feito.
process.env.SUPABASE_URL = "https://falso.supabase.co";
process.env.SUPABASE_SERVICE_KEY = "chave-de-teste";

const t = require("node:test");
const a = require("node:assert");
const P = require("../ponte");

const msg = (id, seg, fromMe = false) => ({ key: { id, remoteJid: "5500900000002@s.whatsapp.net", fromMe },
  messageTimestamp: seg, message: { conversation: "texto " + id } });

t.test("busca o histórico pedido, grava as antigas e marca o pedido feito", async () => {
  const gravadas = [], patches = [];
  global.fetch = async (url, opts = {}) => {
    const u = String(url), m = opts.method || "GET";
    const ok = c => ({ ok: true, status: 200, text: async () => JSON.stringify(c) });
    if (m === "GET" && u.includes("zap_conversas?historico_pedido")) return ok([{ id: "c1", telefone: "5500900000002" }]);
    if (m === "GET" && u.includes("order=quando_wa.asc")) return ok([{ externo_id: "NOVA", direcao: "entrada", quando_wa: "2026-10-26T16:48:00.000Z" }]);
    if (m === "GET" && u.includes("externo_id=eq.")) return ok([]);
    if (m === "POST" && u.includes("zap_mensagens")) { gravadas.push(JSON.parse(opts.body)); return ok(null); }
    if (m === "PATCH") { patches.push(JSON.parse(opts.body)); return ok(null); }
    return ok(null);
  };
  const t0 = Date.parse("2026-10-20T12:00:00Z") / 1000;
  const paginas = [[], [msg("A2", t0 + 60, true), msg("A1", t0)], []];
  const pedidos = [];
  const zap = {
    onWhatsApp: async () => [{ exists: true, jid: "5500900000002@s.whatsapp.net" }],
    fetchMessageHistory: async (n, chave) => { pedidos.push(chave.id); setTimeout(() => P._pagina(paginas.shift() || []), 5); },
  };
  P._ligado(true);
  await P.buscarHistoricosPedidos(zap);
  a.deepStrictEqual(pedidos, ["", "NOVA", "A1"]);        // as mais novas, depois antes da mais antiga e antes da anterior
  a.deepStrictEqual(gravadas.map(g => [g.externo_id, g.direcao]), [["A2", "saida"], ["A1", "entrada"]]);
  a.ok(patches.at(-1).historico_feito);
  a.match(patches.at(-1).historico_resultado, /^2 mensagem/);
});

// F474: a conversa sem mensagem gravada pede o histórico a partir de agora, sem partida
function semMensagem(paginas) {
  const gravadas = [], patches = [], pedidos = [];
  global.fetch = async (url, opts = {}) => {
    const u = String(url), m = opts.method || "GET";
    const ok = c => ({ ok: true, status: 200, text: async () => JSON.stringify(c) });
    if (m === "GET" && u.includes("zap_conversas?historico_pedido")) return ok([{ id: "c2", telefone: "5500900000002" }]);
    if (m === "GET" && u.includes("order=quando_wa.asc")) return ok([]);
    if (m === "GET" && u.includes("externo_id=eq.")) return ok([]);
    if (m === "POST" && u.includes("zap_mensagens")) { gravadas.push(JSON.parse(opts.body)); return ok(null); }
    if (m === "PATCH") { patches.push(JSON.parse(opts.body)); return ok(null); }
    return ok(null);
  };
  const zap = {
    onWhatsApp: async () => [{ exists: true, jid: "5500900000002@s.whatsapp.net" }],
    fetchMessageHistory: async (n, chave) => { pedidos.push(chave.id); setTimeout(() => P._pagina(paginas.shift() || []), 5); },
  };
  return { zap, gravadas, patches, pedidos };
}

t.test("sem mensagem gravada, pede sem partida e grava o que o celular devolver", async () => {
  const t0 = Date.parse("2026-11-01T12:00:00Z") / 1000;
  const x = semMensagem([[msg("B1", t0)], []]);
  P._ligado(true);
  await P.buscarHistoricosPedidos(x.zap);
  a.strictEqual(x.pedidos[0], "");
  a.deepStrictEqual(x.gravadas.map(g => g.externo_id), ["B1"]);
  a.match(x.patches.at(-1).historico_resultado, /^1 mensagem/);
});

t.test("sem mensagem gravada e sem resposta, fica para a primeira mensagem", async () => {
  const x = semMensagem([[]]);
  P._ligado(true);
  await P.buscarHistoricosPedidos(x.zap);
  a.strictEqual(x.gravadas.length, 0);
  a.match(x.patches.at(-1).historico_resultado, /^sem mensagem de partida/);
});

// F478: a mensagem que a ponte não abriu é mais nova que todas do CRM e mora no @lid do celular:
// o pedido traz primeiro as mais novas de cada endereço, com o @lid do lidMapping do Baileys 7
t.test("traz a mensagem mais nova que falta, pelo @lid, marcada como vinda do celular", async () => {
  const gravadas = [], patches = [], pedidos = [];
  global.fetch = async (url, opts = {}) => {
    const u = String(url), m = opts.method || "GET";
    const ok = c => ({ ok: true, status: 200, text: async () => JSON.stringify(c) });
    if (m === "GET" && u.includes("zap_conversas?historico_pedido")) return ok([{ id: "c3", telefone: "5500900000003" }]);
    if (m === "GET" && u.includes("order=quando_wa.asc")) return ok([{ externo_id: "VELHA", direcao: "entrada", quando_wa: "2026-01-12T12:48:36.000Z" }]);
    if (m === "GET" && u.includes("externo_id=eq.")) return ok([]);
    if (m === "POST" && u.includes("zap_mensagens")) { gravadas.push(JSON.parse(opts.body)); return ok(null); }
    if (m === "PATCH") { patches.push(JSON.parse(opts.body)); return ok(null); }
    return ok(null);
  };
  const hoje = Date.parse("2026-11-09T14:47:00Z") / 1000;
  const doLid = { key: { id: "HOJE", remoteJid: "99887766554433@lid", fromMe: false }, messageTimestamp: hoje, message: { conversation: "Bom dia" } };
  const paginas = { "99887766554433@lid": [[doLid]], "5500900000003@s.whatsapp.net": [[], []] };
  const zap = {
    onWhatsApp: async () => [{ exists: true, jid: "5500900000003@s.whatsapp.net" }],
    signalRepository: { lidMapping: { getLIDForPN: async pn => pn.startsWith("5500900000003") ? "99887766554433@lid" : null } },
    fetchMessageHistory: async (n, chave) => { pedidos.push([chave.remoteJid, chave.id]);
      setTimeout(() => P._pagina((paginas[chave.remoteJid] || []).shift() || []), 5); },
  };
  P._ligado(true);
  await P.buscarHistoricosPedidos(zap);
  a.deepStrictEqual(pedidos[0], ["99887766554433@lid", ""]);
  a.deepStrictEqual(gravadas.map(g => [g.externo_id, g.bot_ia]), [["HOJE", "celular"]]);
  a.match(patches.at(-1).historico_resultado, /^1 mensagem/);
});
