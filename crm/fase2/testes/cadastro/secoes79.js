// F79 — as seções do ☀️ Meu Dia recolhem pelo título: a flechinha vira ▸ e
// as linhas somem; segundo clique traz de volta. O estado sobrevive ao
// render() (secRecolhida na memória) e o contador do título segue à vista.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

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
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (rota.request().method() !== "GET")
      return rota.fulfill({ status: 201, contentType: "application/json", body: "[]" });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    let corpo = FIX[t] || [];
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

  // o Meu Dia é a visão inicial; "Adicionados ao dia" e "Vencem hoje" sempre existem
  const acha = titulo => p.evaluateHandle(t =>
    [...document.querySelectorAll("#conteudo-meio h3.secao")]
      .find(h => h.textContent.includes(t)), titulo);

  conf("toda seção do Meu Dia ganhou a flechinha e o cursor de clique",
    await p.evaluate(() => {
      const hs = [...document.querySelectorAll("#conteudo-meio h3.secao")];
      return hs.length >= 2 && hs.every(h =>
        h.querySelector(".sec-seta") && h.classList.contains("sec-clic"));
    }));

  const escondido = titulo => p.evaluate(t => {
    const h = [...document.querySelectorAll("#conteudo-meio h3.secao")]
      .find(x => x.textContent.includes(t));
    let el = h.nextElementSibling, tot = 0, fora = 0;
    while (el && !(el.tagName === "H3" && el.classList.contains("secao"))) {
      tot++; if (el.style.display === "none") fora++;
      el = el.nextElementSibling;
    }
    return { tot, fora, seta: h.querySelector(".sec-seta").textContent,
      contador: /\(\d+\)/.test(h.textContent) };
  }, titulo);

  const antes = await escondido("Adicionados ao dia");
  conf("aberta: as linhas aparecem e a flechinha é ▾",
    antes.tot >= 1 && antes.fora === 0 && antes.seta === "▾");

  await (await acha("Adicionados ao dia")).asElement().click();
  const dep = await escondido("Adicionados ao dia");
  conf("1º clique: as linhas somem, a flechinha vira ▸ e o contador fica à vista",
    dep.tot >= 1 && dep.fora === dep.tot && dep.seta === "▸" && dep.contador);

  const viz = await escondido("Vencem hoje");
  conf("a seção vizinha (Vencem hoje) não é afetada", viz.fora === 0 && viz.seta === "▾");

  await p.evaluate(() => render());
  await p.waitForTimeout(400);
  const posRender = await escondido("Adicionados ao dia");
  conf("o recolhimento SOBREVIVE ao render() (repintura da tela)",
    posRender.fora === posRender.tot && posRender.seta === "▸");

  await (await acha("Adicionados ao dia")).asElement().click();
  const volta = await escondido("Adicionados ao dia");
  conf("2º clique: as linhas voltam e a flechinha volta a ▾",
    volta.fora === 0 && volta.seta === "▾");

  conf("nenhum erro de página", erros.length === 0);

  console.log("=== F79 · as seções do Meu Dia recolhem ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
