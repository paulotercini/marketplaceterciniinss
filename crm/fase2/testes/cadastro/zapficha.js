// WHATSAPP NA FICHA. A aba Mensagens (e o Cadastro, junto dos telefones) mostra a última mensagem da conversa da ponte e
// leva direto a ela; conversa sem cliente ganha "vincular a cliente", que liga
// a conversa à ficha escolhida. Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const ZAP_CLI = "d1000000-0000-0000-0000-000000000001", ZAP_SOLTA = "d1000000-0000-0000-0000-000000000002";
const ZAPS = [
  { id: ZAP_CLI, telefone: "5516999990001", nome_perfil: "Cliente Ficta", cliente_id: CLI_CHEIO, lead_id: null, atendente_id: null,
    status: "aberta", nao_lidas: 2, ultima_em: "2026-10-01T13:00:00Z", ultimo_texto: "Chegou carta do INSS", bot_ativo: true },
  { id: ZAP_SOLTA, telefone: "5511988887777", nome_perfil: "Filha da cliente", cliente_id: null, lead_id: null, atendente_id: null,
    status: "aberta", nao_lidas: 0, ultima_em: "2026-10-02T13:00:00Z", ultimo_texto: "Sou a filha dela", bot_ativo: true },
];

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  const patches = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (m === "PATCH") {
      patches.push({ u, b: JSON.parse(rota.request().postData() || "{}") });
      const id = (u.match(/id=eq\.([0-9a-f-]+)/) || [])[1], z = ZAPS.find(x => x.id === id);
      if (z && /zap_conversas/.test(u)) Object.assign(z, patches.at(-1).b);
      return rota.fulfill({ status: 204, body: "" });
    }
    if (m !== "GET") return rota.fulfill({ status: 204, body: "" });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    let corpo = t === "zap_conversas" ? ZAPS : t === "zap_mensagens" ? [] : (FIX[t] || []);
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
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

  // a ficha mostra a conversa da ponte e leva a ela
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForSelector('button.mt[data-vv="0"]');
  await p.click('button.mt[data-vv="0"]');
  await p.evaluate(() => irSubCad("mensagens"));
  await p.waitForSelector('.painel[data-p="0"].ativo .zap-ping');
  const ping = await p.textContent('.painel[data-p="0"].ativo .zap-ping');
  conf("a ficha mostra a última mensagem do WhatsApp e as não lidas", ping.includes("Chegou carta do INSS") && ping.includes("2 não lidas"));
  await p.click('.painel[data-p="0"].ativo .zap-ping button');
  await p.waitForSelector(".zap-topo");
  conf("“abrir conversa” leva à tela do WhatsApp com a conversa aberta",
    await p.evaluate(id => visao === "whatsapp" && zapAberta === id, ZAP_CLI));
  conf("conversa de cliente mostra “abrir ficha” e não “vincular”",
    (await p.textContent(".zap-topo")).includes("abrir ficha") && !(await p.textContent(".zap-topo")).includes("vincular"));

  // a conversa solta ganha o vincular, que liga à ficha escolhida
  await p.evaluate(id => abrirConversa(id), ZAP_SOLTA);
  conf("conversa sem cliente mostra “vincular a cliente”", (await p.textContent(".zap-topo")).includes("vincular a cliente"));
  const nome = await p.evaluate(id => D.cliPorId.get(id).nome, CLI_CHEIO);
  await p.evaluate(() => vincularConversa());
  await p.fill("#zv-busca", nome.split(" ")[0]);
  await p.waitForSelector(`[data-zv="${CLI_CHEIO}"]`);
  await p.click(`[data-zv="${CLI_CHEIO}"]`);
  await p.waitForFunction(id => (zapConvs.find(c => c.id === id) || {}).cliente_id, ZAP_SOLTA);
  const pt = patches.find(x => x.u.includes(`zap_conversas?id=eq.${ZAP_SOLTA}`));
  conf("vincular grava o cliente na conversa e limpa o prospecto", pt && pt.b.cliente_id === CLI_CHEIO && pt.b.lead_id === null);
  conf("depois de vincular o cabeçalho passa a “abrir ficha”", (await p.textContent(".zap-topo")).includes("abrir ficha"));

  for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
