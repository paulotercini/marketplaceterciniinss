// Gerar procurações (botão da Identificação). Confere que o modal oferece a
// declaração de não recebimento de benefício e o termo de representação, e
// que a folha impressa sai com o padrão do escritório. Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO } = require("./fixturas");
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
    localStorage.setItem("crm_tema", "v10");
    window.print = () => {};
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const q = rota.request(), u = q.url();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (q.method() !== "GET") return rota.fulfill({ status: 204, body: "" });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    let corpo = FIX[t] || [];
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

  await p.evaluate(cli => modalProcuracoes(cli), CLI_CHEIO);
  const ofertas = await p.evaluate(() => [...document.querySelectorAll(".proc-ck")].map(x => [x.value, x.checked]));
  const tem = v => ofertas.find(o => o[0] === v);
  conf("o modal oferece o termo de representação, marcado", tem("termo") && tem("termo")[1]);
  conf("o modal oferece a declaração de não recebimento de benefício, marcada", tem("beneficiario") && tem("beneficiario")[1]);

  const [pop] = await Promise.all([ctx.waitForEvent("page"), p.evaluate(cli => {
    document.querySelectorAll(".proc-ck").forEach(x => x.checked = true); imprimirProcuracoes(cli);
    if (document.querySelector("button[onclick^='seguirComLacunas']")) seguirComLacunas();
  }, CLI_CHEIO)]);
  await pop.waitForLoadState();
  const folhas = await pop.evaluate(() => [...document.querySelectorAll("section h1")].map(h => h.textContent));
  conf("saem as seis folhas, uma por documento", folhas.length === 6);
  conf("o termo de representação sai impresso", folhas.some(t => /TERMO DE REPRESENTA/.test(t)));
  conf("a declaração de não recebimento sai impressa", folhas.some(t => /RECEBIMENTO DE PENS/.test(t)));
  const estilo = await pop.evaluate(() => {
    const pp = document.querySelector("section p"), cs = getComputedStyle(pp), h = getComputedStyle(document.querySelector("h1"));
    return { fonte: cs.fontFamily, alinha: cs.textAlign, tam: cs.fontSize, h1: h.textAlign,
      negritos: document.querySelectorAll("section p b, section p strong").length };
  });
  conf("o corpo sai em Bookman 12, justificado", /Bookman/.test(estilo.fonte) && estilo.alinha === "justify" && estilo.tam === "16px");
  conf("o título sai centralizado", estilo.h1 === "center");
  conf("rótulos e nomes saem em negrito", estilo.negritos >= 6);
  await pop.screenshot({ path: path.join(__dirname, "procuracoes.png"), fullPage: true });

  console.log("=== Gerar procurações ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("estilo:", JSON.stringify(estilo));
  console.log("erros de página:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
