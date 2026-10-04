// F162 — o NB principal se troca na linha do caso (o + só acrescenta outro).
// Dados fictícios.
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
    window.__abertos = []; window.open = (u) => { window.__abertos.push(u); return null; };
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (rota.request().method() !== "GET") return rota.fulfill({ status: 204, body: "" });
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
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  const caso = await p.evaluate(cli => D.casos.find(k => k.cliente_id === cli), CLI_CHEIO);
  await p.evaluate(id => { const k = D.casoPorId.get(id); k.nb = "1111111111"; k.nbs = ["2222222222"]; lcAbrir(id, 1); }, caso.id);
  const sel = `#lcnb-nb-${caso.id}`;
  await p.waitForSelector(sel + " .lapis");
  conf("a linha do NB mostra o principal com o lápis e o secundário à parte",
    (await p.textContent(sel)).includes("111.111.111-1") && (await p.textContent(`#lc-numeros-${caso.id}`)).includes("222.222.222-2"));
  await p.click(sel + " .lapis");
  await p.fill(sel + " input", "734.747.019-7");
  const req = p.waitForRequest(r => r.method() === "PATCH" && /casos/.test(r.url()));
  await p.press(sel + " input", "Enter");
  const corpo = JSON.parse((await req).postData() || "{}");
  conf("o lápis troca o NB principal (PATCH só do nb)", corpo.nb === "734.747.019-7" && !("nbs" in corpo));
  conf("o NB novo fica no caso e o secundário continua", await p.evaluate(id => { const k = D.casoPorId.get(id); return k.nb === "734.747.019-7" && k.nbs[0] === "2222222222"; }, caso.id));

  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
