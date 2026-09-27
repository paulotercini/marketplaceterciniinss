// F149 · o esqueleto nas esperas de rede: com o banco lento, a abertura do
// CRM mostra a lista e a barra em cinza, e a ficha mostra o desenho dela até
// os andamentos chegarem; quando chegam, não sobra pedaço de esqueleto.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const dia = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString("sv"); };
const K = FIX.casos;

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const erros = [];
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  let lento = true;
  await ctx.route(SUPA + "/**", async rota => {
    const u = rota.request().url();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (rota.request().method() !== "GET") return rota.fulfill({ status: 204, body: "" });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    // a lista de clientes (abertura) e os andamentos da ficha demoram 1,2 s
    if (lento && (t === "clientes" || (t === "andamentos" && /caso_id=in/.test(u)))) await new Promise(r => setTimeout(r, 1200));
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  const p = await ctx.newPage();
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForTimeout(500);
  if (process.env.FOTO) await p.screenshot({ path: process.env.FOTO + "-abertura.png" });
  const boot = await p.evaluate(() => ({ lista: document.querySelectorAll("#conteudo-meio .sk-ag").length,
    lat: document.querySelectorAll("#grupo-fases .sk-lat-item").length,
    vis: getComputedStyle(document.querySelector(".sk-caixa")).opacity }));
  conf(`F149 · na abertura, a lista e a barra aparecem em cinza (${boot.lista} linhas, ${boot.lat} itens)`, boot.lista === 9 && boot.lat === 6 && boot.vis === "1");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await p.waitForTimeout(400);
  conf("F149 · com os dados na mão, nenhum pedaço de esqueleto fica na tela", await p.evaluate(() => !document.querySelector(".sk")));
  const cli = CLI_CHEIO;
  await p.evaluate(c => { abrirFicha(c); }, cli);
  await p.waitForTimeout(400);
  const fi = await p.evaluate(() => { const f = document.querySelector("#detalhe .sk-ficha");
    return { tem: !!f, busy: f && f.getAttribute("aria-busy"), blocos: f ? f.querySelectorAll(".sk-f-esq, .sk-f-dir, .sk-tl").length : 0 }; });
  conf(`F149 · a ficha abre com o desenho dela em cinza (${fi.blocos} blocos)`, fi.tem && fi.busy === "true" && fi.blocos >= 6);
  if (process.env.FOTO) await p.screenshot({ path: process.env.FOTO + "-ficha.png" });
  await p.waitForFunction(() => !document.querySelector("#detalhe .sk-ficha"), null, { timeout: 9000 });
  conf("F149 · quando os andamentos chegam, a ficha real entra no lugar", await p.evaluate(() =>
    !document.querySelector("#detalhe .sk") && document.getElementById("detalhe").textContent.length > 200));

  console.log("=== F149 · esqueleto nas esperas de rede ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length + erros.length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
