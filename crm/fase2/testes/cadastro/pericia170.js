// F170 — a aba Perícias só aparece com perícia agendada; anotar no caso a
// perícia agendada cria o agendamento e faz a aba aparecer. Dados fictícios.
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
    if (rota.request().method() === "POST" && /\/eventos/.test(u)) { const b = JSON.parse(rota.request().postData() || "{}"); return rota.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify([{ id: "ev-novo", ...b }]) }); }
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
  const abas = () => p.evaluate(() => [...document.querySelectorAll(".menu-topo .mt")].map(b => b.textContent.trim()));
  await p.evaluate(id => { D.eventos = (D.eventos || []).filter(e => e.caso_id !== id);
    D.eventos.push({ id: "ev-velho", caso_id: id, tipo: "Perícia", status: "realizada", data_hora: "2026-01-10T09:00:00-03:00" });
    abaAtiva = 2; casoSel = id; repintarFicha(); }, caso.id);
  await p.waitForSelector(".menu-topo .mt");
  conf("só com perícia já realizada, o menu não mostra Perícias", !(await abas()).some(a => a.startsWith("Perícias")));
  const daqui = await p.evaluate(() => { const d = new Date(Date.now() + 20 * 864e5); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`; });
  const criados = await p.evaluate(([id, dt]) => extrairEvento(`Perícia médica agendada para o dia ${dt} às 9h40 no INSS de Araraquara.`, id), [caso.id, daqui]);
  await p.evaluate(() => repintarFicha());
  const depois = await abas();
  conf("a anotação de perícia agendada no caso cria o agendamento", criados && criados.length === 1 && criados[0].tipo === "Perícia");
  conf("e a aba Perícias aparece com a contagem (1)", depois.includes("Perícias (1)"));

  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
