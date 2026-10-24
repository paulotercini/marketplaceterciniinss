// F258 · O ROBÔ CONDUZIDO PELA EQUIPE (ideia do Kapso): a conversa mostra em
// que passo do robô está e desde quando, e o "Levar o robô a um passo…" do ⋯
// chama zap_bot_ir com o passo escolhido. Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const CONV = "d3000000-0000-0000-0000-000000000001";
const agora = new Date().toISOString();
const T = {
  zap_conversas: [{ id: CONV, telefone: "5516999990001", chave: "99990001", nome_perfil: "Cliente do robô", cliente_id: null,
    atendente_id: null, status: "aberta", nao_lidas: 1, ultima_em: agora, ultimo_texto: "1", bot_ativo: true,
    bot_passo: "situacao", bot_desde: agora }],
  zap_mensagens: [{ id: "m1", seq: 1, conversa_id: CONV, direcao: "entrada", tipo: "texto", texto: "1", status: "entregue", criado_em: agora }],
  zap_bot_passos: [{ chave: "inicio", ordem: 1 }, { chave: "processo", ordem: 2 }, { chave: "situacao", ordem: 10 }],
};
const PAINEL = { totais: {}, setores: [], atendentes: [] };

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1600, height: 1000 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  const escritas = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = decodeURIComponent(rota.request().url()), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (m !== "GET") {
      const corpo = rota.request().postData();
      escritas.push({ u, m, b: corpo ? JSON.parse(corpo) : null });
      if (/rpc\/zap_painel/.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PAINEL) });
      return rota.fulfill({ status: 204, body: "" });
    }
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    let corpo = T[t] || FIX[t] || [];
    const cv = u.match(/conversa_id=eq\.([0-9a-f-]+)/);
    if (cv && t !== "mencoes") corpo = corpo.filter(x => x.conversa_id === cv[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);

  await p.evaluate(() => { zapFiltro = "todas"; irPara("whatsapp"); });
  await p.waitForSelector(".zap-conv");
  await p.evaluate(id => abrirConversa(id), CONV);
  await p.waitForSelector(".zap-topo");
  const topo = await p.textContent(".zap-topo");
  conf("a conversa mostra o passo do robô em palavras", topo.includes("Robô: respondeu a situação do processo"));
  conf("e desde quando", /desde .*\d{2}:\d{2}/.test(topo));
  conf("o ⋯ tem Levar o robô a um passo", topo.includes("Levar o robô a um passo"));
  await p.evaluate(() => levarRobo());
  conf("a janela lista os passos ativos pelo nome", (await p.$$eval("[data-zbp]", bs => bs.map(b => b.textContent))).join("|") === "menu inicial|processo|respondeu a situação do processo");
  await p.click('[data-zbp="inicio"]');
  await p.waitForTimeout(300);
  const ir = escritas.find(e => /rpc\/zap_bot_ir/.test(e.u));
  conf("escolher o passo chama zap_bot_ir com a conversa e o passo", ir && ir.b.p_conversa === CONV && ir.b.p_passo === "inicio");

  for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
