// F74 — as datas do Recurso (CRPS) vêm da API em dd/mm/aaaa; passadas cruas
// ao formatador saíam "20./2.26/0" e pílula ", 20/2" (print do Paulo). Agora
// isoCrps() normaliza na aba Recurso, no Caso completo e no menu dos NUPs.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

Object.assign(FIX.casos[0], { fase: "conselho",
  crps_nups: ["35123456789012345"],
  crps: [{ nup: "35123456789012345", num_proc: "NUP fictício",
    eventos: [
      { data: "20/02/2026 10:00", tipo: "movimento", icone: "🖥",
        resumo: "Protocolo recebido no INSS (fictício)", bruto: "Protocolo recebido" },
      { data: "25/02/2022 09:00", tipo: "decisao", icone: "⚖️",
        resumo: "Recurso provido EM PARTE (fictício)", bruto: "provido em parte" }] }] });

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

  // ── aba Recurso (CRPS) ──
  await p.evaluate(([cli, caso]) => { abrirFicha(cli).then(() => {
    const m = document.getElementById("modal"); if (m) { m.style.display = "none"; m.innerHTML = ""; }
    casoSel = caso; abaAtiva = 2; subAba = "crps"; pintarFicha(); }); }, [CLI_CHEIO, CASO1]);
  await p.waitForTimeout(1400);
  const txtCrps = await p.evaluate(() =>
    (document.querySelector('.painel[data-p="2"].ativo')||{textContent:
      "SEM-PAINEL erros:"+JSON.stringify((window.__errs||[]))}).textContent);
  if(/SEM-PAINEL/.test(txtCrps)) console.log("DEBUG:", txtCrps.slice(0,300), erros);
  conf("aba Recurso: a data sai inteira (20.02.2026), sem '20./2'",
    /20\.02\.2026/.test(txtCrps) && !/\d{2}\.\/\d/.test(txtCrps) && !/, 2\d\/2/.test(txtCrps));
  conf("aba Recurso: o evento antigo (25/02/2022) também formata certo",
    /25\.02\.2022|2022/.test(txtCrps) && !/22\.\/2/.test(txtCrps));

  // ── Caso completo ──
  await p.evaluate(caso => { casoSel = caso; subAba = "tudo"; pintarFicha(); }, CASO1);
  await p.waitForTimeout(700);
  conf("Caso completo: os registros do Recurso entram com data ISO ordenável",
    await p.evaluate(caso => { const k = D.casoPorId.get(caso);
      const itens = fatosDoCasoTodo(k, []);
      const rec = itens.filter(x => /Recurso/.test(x.chip));
      return rec.length === 2 && rec.every(x => /^\d{4}-\d{2}-\d{2}/.test(x.q)) &&
        rec[0].q > rec[1].q; }, CASO1));
  conf("Caso completo: a tela mostra 20.02.2026 e nenhuma pílula quebrada",
    await p.evaluate(() => { const t = document.querySelector('.painel[data-p="2"].ativo').textContent;
      return /20\.02\.2026/.test(t) && !/\d\.\/\d/.test(t); }));

  // ── a trilha (➕) com DECISÃO no recurso: o chip "decidido em" quebrava
  // o render inteiro (dataParaISO sem prefixo não existia — ReferenceError)
  await p.evaluate(() => document.querySelector(".fatos-processo .fx-mais-bt").click());
  await p.waitForTimeout(500);
  conf("o ➕ abre com a trilha e o chip 'decidido em 25.02.2022' (sem quebrar)",
    await p.evaluate(() => { const c = document.querySelector(".fx-mais-corpo");
      return c && /decidido em 25\.02\.2022/.test(c.textContent); }));
  conf("nenhum erro de página no caminho todo", erros.length === 0);

  console.log("=== F74 · as datas do CRPS no formato certo ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
