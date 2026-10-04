// F163 — o ＋ do representante legal ao lado do nome e a parceria no canto direito.
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
  await p.evaluate(cli => { const c = D.cliPorId.get(cli); if (c.campos) delete c.campos.representante; return abrirFicha(cli).then(() => { abaAtiva = 0; subCad = "identificacao"; repintarFicha(); }); }, CLI_CHEIO);
  await p.waitForSelector("#campo-nome");
  await p.waitForSelector("#campo-nome button.cad-mini", { state: "attached" });
  const g = await p.evaluate(() => {
    const nome = document.getElementById("campo-nome"), parc = nome.querySelector(".cad-parc");
    const rn = nome.getBoundingClientRect(), rp = parc.getBoundingClientRect();
    return { mais: /representante legal/.test(nome.querySelector("button.cad-mini").textContent),
      direita: rn.width === 0 || Math.abs(rn.right - rp.right) < 4, temSel: !!parc.querySelector("#parc-sel-id"),
      sozinho: !![...document.querySelectorAll(".cad-campo label")].find(l => /^Representante legal/.test(l.textContent.trim())),
      escondido: document.getElementById("campo-representante").hidden };
  });
  conf("ao lado do nome há o ＋ representante legal e o campo antigo saiu da grade", g.mais && !g.sozinho && g.escondido);
  conf("a parceria fica no canto direito do cartão do nome", g.direita && g.temSel);
  await p.click("#campo-nome button.cad-mini");
  conf("o ＋ abre os campos do representante sob o nome, sem editar o nome", !!(await p.$("#campo-representante #rep-nome")) && !(await p.$("#ed-campo")));

  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
