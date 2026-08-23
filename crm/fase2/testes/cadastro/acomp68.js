// F68 — Acompanhamento Manual/Automático no cartão do caso (INSS e Conselho),
// o ✓ da checagem (cinza → verde, com quem e quando no título) e a lista
// própria 🔎 Checagem manual na barra lateral.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
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
  const escritos = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      const corpo = JSON.parse(rota.request().postData() || "{}");
      escritos.push({ m, t, corpo });
      if (m === "PATCH") {
        const id = (u.match(/id=eq\.([^&]+)/) || [])[1];
        const alvo = (FIX[t] || []).find(x => x.id === id);
        if (alvo) Object.assign(alvo, corpo);
      }
      const rep = /return=representation/.test(JSON.stringify(rota.request().headers()));
      return rota.fulfill({ status: rep ? 201 : 204, contentType: "application/json",
        body: rep ? JSON.stringify([{ id: "n" + escritos.length, ...corpo }]) : "" });
    }
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

  // ── na lista INSS: a pergunta aparece com o ✓ cinza ──
  await p.evaluate(([cli, caso]) => { abrirFicha(cli).then(() => {
    const m = document.getElementById("modal"); if (m) { m.style.display = "none"; m.innerHTML = ""; }
    casoSel = caso; abaAtiva = 2; pintarFicha(); }); }, [CLI_CHEIO, CASO1]);
  await p.waitForTimeout(900);

  conf("caso INSS: a linha Acompanhamento está logo abaixo da espécie",
    await p.evaluate(() => { const f = document.querySelector(".fatos-processo .fx-acomp");
      return f && /Acompanhamento/.test(f.textContent) &&
        /Manual/.test(f.textContent) && /Automático/.test(f.textContent); }));
  conf("o ✓ nasce cinza, com o título 'ninguém checou ainda'",
    await p.evaluate(() => { const c = document.querySelector(".acomp-check");
      return c && !c.classList.contains("ok") && /ninguém checou/.test(c.title); }));

  // ── marcar Manual grava e acende o chip ──
  escritos.length = 0;
  await p.evaluate(() => document.querySelector(".chip-acomp").click());
  await p.waitForTimeout(600);
  conf("clicar em Manual grava casos.acompanhamento='manual'",
    escritos.some(x => x.m === "PATCH" && x.t === "casos" && x.corpo.acompanhamento === "manual"));
  conf("o chip Manual fica aceso",
    await p.evaluate(() => { const b = [...document.querySelectorAll(".chip-acomp")]
      .find(x => x.textContent === "Manual"); return b && b.classList.contains("on"); }));

  // ── o ✓ registra quem e quando ──
  escritos.length = 0;
  await p.evaluate(() => document.querySelector(".acomp-check").click());
  await p.waitForTimeout(600);
  conf("o ✓ grava checado_em + checado_por (eu)",
    escritos.some(x => x.m === "PATCH" && x.t === "casos" &&
      x.corpo.checado_em && x.corpo.checado_por));
  conf("o ✓ fica verde e o título conta quem checou e quando",
    await p.evaluate(() => { const c = document.querySelector(".acomp-check");
      return c && c.classList.contains("ok") &&
        /checado por Paulo Tercini em \d{2}\.\d{2}\.\d{4} às \d{2}:\d{2}/.test(c.title); }));

  // ── a lista própria 🔎 na barra ──
  conf("a barra lateral ganhou 🔎 Checagem manual com o contador",
    await p.evaluate(() => { const li = document.querySelector('.lista-item[data-v="checagem"]');
      return li && /Checagem manual/.test(li.textContent) &&
        (li.querySelector(".cont") || {}).textContent === "1"; }));
  await p.evaluate(() => { fecharFicha(false); visao = "checagem"; render(); });
  await p.waitForTimeout(500);
  conf("a lista abre e mostra o caso manual",
    await p.evaluate(cli => { const meio = document.getElementById("conteudo-meio");
      const c = D.cliPorId.get(cli);
      return /Checagem manual/.test(document.getElementById("titulo-lista").textContent) &&
        meio.textContent.includes(c.nome); }, CLI_CHEIO));

  // ── no Conselho a linha também aparece; no Judicial, não ──
  await p.evaluate(([cli, caso]) => { const k = D.casoPorId.get(caso); k.fase = "conselho";
    abrirFicha(cli).then(() => { const m = document.getElementById("modal");
      if (m) { m.style.display = "none"; m.innerHTML = ""; }
      casoSel = caso; abaAtiva = 2; pintarFicha(); }); }, [CLI_CHEIO, CASO1]);
  await p.waitForTimeout(700);
  conf("caso no Conselho de Recursos também pergunta o Acompanhamento",
    await p.evaluate(() => !!document.querySelector(".fatos-processo .fx-acomp")));
  await p.evaluate(caso => { const k = D.casoPorId.get(caso); k.fase = "judicial";
    repintarFicha(); }, CASO1);
  await p.waitForTimeout(500);
  conf("caso Judicial não carrega a pergunta (acompanhamento é do CNJ)",
    await p.evaluate(() => !document.querySelector(".fatos-processo .fx-acomp")));

  console.log("=== F68 · o acompanhamento e a checagem manual ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
