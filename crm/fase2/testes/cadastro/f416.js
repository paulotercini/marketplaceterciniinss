// F416 · o caso suspenso por tema do STF, do STJ ou da TNU: o chip no cartão, o selo do cliente, a pesquisa e o bloco do Cuidar do acervo
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, EU, CLI_CHEIO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const dia = n => new Date(Date.now() + n * 864e5).toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });
const TUDO = FIX;

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
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (rota.request().method() !== "GET")
      return rota.fulfill({ status: 201, contentType: "application/json", body: "[]" });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    let corpo = TUDO[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error") erros.push("console: " + m.text()); });
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const cli = await p.evaluate(c => D.casoPorId.get(c).cliente_id, CASO1);
  await p.evaluate(c => abrirFicha(c), cli);
  await p.waitForSelector(".linha-caso");
  await p.evaluate(c => irAoCaso(c), CASO1);
  await p.waitForTimeout(300);
  conf("o ⋯ do cartão oferece Suspender", await p.$$eval(".lc-suspender", b => b.length) === 1);
  await p.evaluate(c => suspenderCaso(c), CASO1);
  await p.fill("#su-tema", "1124"); await p.selectOption("#su-trib", "STJ"); await p.fill("#su-assunto", "termo inicial dos efeitos");
  await p.click('button:has-text("Gravar a suspensão")');
  await p.waitForSelector(".chip.lc-susp");
  const r = await p.evaluate(([c, cliId]) => {
    const k = D.casoPorId.get(c), cli = D.cliPorId.get(cliId);
    return { ronda: k.ronda.suspensao, chip: document.querySelector(".chip.lc-susp").textContent,
      selo: (document.querySelector(".cli-st.susp, .cli-st.ativo") || {}).textContent || "",
      ix: cli._ix.includes("tema 1124"), bloco: (visao = "acervo", render(), (document.getElementById("acervo-suspensos") || {}).textContent || "") };
  }, [CASO1, cli]);
  conf("grava trib, tema e assunto em ronda.suspensao", r.ronda && r.ronda.trib === "STJ" && r.ronda.tema === "1124" && r.ronda.assunto === "termo inicial dos efeitos");
  conf("o cartão mostra o chip Suspenso · Tema 1124/STJ", /Suspenso · Tema 1124\/STJ/.test(r.chip));
  conf("o selo do cliente cita a suspensão", /suspenso/.test(r.selo));
  conf("a pesquisa acha por 'tema 1124'", r.ix);
  conf("o Cuidar do acervo junta os suspensos por tema", /Casos suspensos por tema/.test(r.bloco) && /Tema 1124\/STJ/.test(r.bloco));
  const r2 = await p.evaluate(async c => { const k = D.casoPorId.get(c); await retomarCaso(c); return !!suspensaoDe(k); }, CASO1);
  conf("Retomar tira a suspensão", r2 === false);
  conf("caso encerrado não conta como suspenso", await p.evaluate(() => suspensaoDe({ fase: "encerrado", ronda: { suspensao: { trib: "STF", tema: "1" } } })) === null);
  conf("sem erro na página", !erros.length);
  await nav.close(); s.close();
  const n = ok.filter(x => x[1]).length;
  ok.forEach(([t, v]) => console.log(`${v ? "✓" : "✗"} ${t}`));
  if (erros.length) console.log(erros.join("\n"));
  console.log(`${n}/${ok.length}`);
  process.exit(n === ok.length ? 0 : 1);
})();
