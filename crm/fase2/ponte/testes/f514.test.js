// F514: o resgate da mensagem que não abriu fica no banco, o envio aceito pelo WhatsApp
// nunca volta à fila, o lote órfão é retomado e o tipo desconhecido deixa registro.
process.env.SUPABASE_URL = "https://falso.supabase.co";
process.env.SUPABASE_SERVICE_KEY = "chave-de-teste";
process.env.PAUSA_ENVIO = "0";
process.env.PAUSA_REENVIO = "0";
process.env.TETO_ENVIO = "50";
process.env.PONTE_FILA = require("node:path").join(require("node:os").tmpdir(), "ponte-f514-" + process.pid + ".jsonl");

const t = require("node:test");
const a = require("node:assert");
const fs = require("node:fs");
const P = require("../ponte");
const N = require("../normalizar");

const FONE = "5500900000021";
const ok = c => ({ ok: true, status: 200, text: async () => JSON.stringify(c) });
function banco(extra = () => undefined) {
  const chamadas = [];
  global.fetch = async (url, opts = {}) => {
    const c = { u: String(url), m: opts.method || "GET", corpo: opts.body ? JSON.parse(opts.body) : null };
    chamadas.push(c);
    const r = extra(c);
    if (r !== undefined) return r;
    if (c.u.includes("/rpc/zap_abrir")) return ok("c1");
    if (c.m === "PATCH" && c.u.includes("status=eq.fila")) return ok([{ id: "m1" }]);
    if (c.m === "GET" && c.u.includes("zap_conversas")) return ok([{ telefone: FONE }]);
    if (c.m === "GET") return ok([]);
    return ok(null);
  };
  return chamadas;
}
const zap = {
  onWhatsApp: async () => [{ exists: true, jid: FONE + "@s.whatsapp.net" }],
  sendPresenceUpdate: async () => {},
  sendMessage: async () => ({ key: { id: "WA-NOVA" } }),
};
const estados = ch => ch.filter(c => c.m === "PATCH" && c.u.includes("zap_mensagens?id=eq.m1") && !c.u.includes("status=eq.fila")).map(c => c.corpo.status);

t.test("mensagem que não abriu: o pedido de resgate vai ao banco na hora, com data futura, e conta no dia", async () => {
  const ch = banco();
  await P.entrou({ key: { id: "X1", remoteJid: FONE + "@s.whatsapp.net", fromMe: false }, messageStubType: 2 });
  const pedido = ch.find(c => c.m === "PATCH" && c.u.includes("zap_conversas?id=eq.c1"));
  a.ok(pedido, "grava o pedido na conversa");
  a.ok(Date.parse(pedido.corpo.historico_pedido) > Date.now() + 120000, "para daqui a 3 minutos");
  a.strictEqual(pedido.corpo.historico_feito, null);
  const conta = ch.find(c => c.m === "POST" && c.u.includes("config_app"));
  a.match(JSON.stringify(conta.corpo), /zap_nao_abriu/);
  a.match(JSON.stringify(conta.corpo), /\d{4}-\d\d-\d\d\|1/);
});

t.test("a busca só pega o pedido vencido", async () => {
  const ch = banco();
  P._ligado(true);
  await P.buscarHistoricosPedidos(zap);
  a.ok(ch.some(c => c.u.includes("historico_pedido=lte.")), "filtra pela data");
});

t.test("depois de o WhatsApp aceitar, falha do banco ou da presença não devolve à fila", async () => {
  const ch = banco(c => c.m === "PATCH" && c.corpo && c.corpo.status === "enviada"
    ? { ok: false, status: 500, text: async () => "fora" } : undefined);
  let envios = 0;
  await P.enviar({ id: "m1", conversa_id: "c1", texto: "oi" }, { ...zap,
    sendMessage: async () => { envios++; return { key: { id: "WA-NOVA" } }; },
    sendPresenceUpdate: async tipo => { if (tipo === "paused") throw new Error("caiu"); } });
  a.equal(envios, 1);
  a.deepEqual(estados(ch), ["enviada", "enviada", "enviada"]);   // insiste, nunca "fila"
});

t.test("id do WhatsApp repetido: confirma sem o id em vez de falhar", async () => {
  let n = 0;
  const ch = banco(c => c.m === "PATCH" && c.corpo && c.corpo.status === "enviada" && !n++
    ? { ok: false, status: 409, text: async () => '{"code":"23505"}' } : undefined);
  await P.enviar({ id: "m1", conversa_id: "c1", texto: "oi" }, zap);
  const fim = ch.filter(c => c.corpo && c.corpo.status === "enviada").at(-1);
  a.strictEqual(fim.corpo.externo_id, null);
});

t.test("o WhatsApp não confirma no teto: vai a erro, não à fila, e o retorno tardio confirma", async () => {
  const ch = banco();
  let soltar;
  await P.enviar({ id: "m1", conversa_id: "c1", texto: "oi" },
    { ...zap, sendMessage: () => new Promise(r => { soltar = r; }) });
  a.deepEqual(estados(ch), ["erro"]);
  soltar({ key: { id: "WA-TARDE" } });
  await new Promise(r => setTimeout(r, 20));
  a.deepEqual(estados(ch), ["erro", "enviada"]);
});

t.test("lote órfão de uma queda é retomado e some", async () => {
  const lote = P.FILA_LOCAL + ".lote";
  if (fs.existsSync(lote) || fs.existsSync(P.FILA_LOCAL)) return t.skip("há fila local de verdade nesta pasta");
  const ch = banco();
  fs.writeFileSync(lote, JSON.stringify({ key: { id: "L1", remoteJid: FONE + "@s.whatsapp.net", fromMe: false },
    messageTimestamp: Math.floor(Date.now() / 1000), message: { conversation: "texto de teste" } }) + "\nlinha quebrada\n");
  try {
    P._ligado(true);
    await P.reprocessarPendentes();
    a.ok(ch.some(c => c.m === "POST" && c.u.includes("zap_mensagens") && c.corpo.externo_id === "L1"), "gravou a mensagem do lote");
    a.ok(!fs.existsSync(lote) && !fs.existsSync(P.FILA_LOCAL));
  } finally { for (const f of [lote, P.FILA_LOCAL]) if (fs.existsSync(f)) fs.unlinkSync(f); }
});

t.test("tipo sem tradução deixa registro; vídeo redondo e resposta de botão são lidos", () => {
  const m = c => ({ key: { id: "T", remoteJid: FONE + "@s.whatsapp.net" }, message: c });
  const novo = m({ tipoInventadoMessage: { x: 1 } });
  a.equal(N.deveIgnorar(novo), false);
  a.equal(N.tipoDaMensagem(novo), "texto");
  a.equal(N.tipoSemTraducao(novo), "tipoInventadoMessage");
  a.match(N.textoDaMensagem(novo), /tipoInventado, veja no celular/);
  a.equal(N.tipoSemTraducao(m({ conversation: "oi" })), undefined);
  a.equal(N.deveIgnorar(m({ keepInChatMessage: {} })), true);
  a.equal(N.tipoDaMensagem(m({ ptvMessage: { mimetype: "video/mp4" } })), "video");
  a.equal(N.textoDaMensagem(m({ buttonsResponseMessage: { selectedDisplayText: "Opção 1" } })), "Opção 1");
});

t.test("o log só mostra o fim do número", () => {
  a.equal(P.fim4(FONE + ":3@s.whatsapp.net"), "…0021");
});
