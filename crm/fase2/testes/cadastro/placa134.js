// F134 · a ficha v11: a placa de dados fixos do caso (tema v10) e a base de
// celular. Prova a estrutura que as outras suítes leem (.lc-topo com os
// campos), a altura da placa no computador (o auto-fit do grid esticava a
// linha para 212 px e foi trocado), e no celular: nada estoura a largura da
// ficha, a placa fica em duas colunas e o campo de escrever deixa folga.
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
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const erros = [];

  const abrir = async (opts) => {
    const ctx = await nav.newContext(opts);
    await ctx.addInitScript(([u, ss]) => {
      localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
      localStorage.setItem("crm_sessao", JSON.stringify(ss));
      localStorage.setItem("crm_tema", "v10");
    }, [SUPA, SESSAO]);
    await ctx.route(SUPA + "/**", rota => {
      const u = rota.request().url();
      if (/\/auth\/v1\//.test(u))
        return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
      if (rota.request().method() !== "GET") return rota.fulfill({ status: 204, body: "" });
      const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
      let corpo = FIX[t] || [];
      const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
      if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
    });
    const p = await ctx.newPage();
    p.on("pageerror", e => erros.push("pageerror: " + e.message));
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
    await p.waitForSelector("#app.logado");
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
    await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
    await p.waitForTimeout(900);
    return { ctx, p };
  };

  // ── computador ─────────────────────────────────────────────────────────
  { const { ctx, p } = await abrir({ viewport: { width: 1440, height: 900 } });
    const r = await p.evaluate(() => {
      const placa = document.querySelector(".lc-topo .lc-placa");
      const cab = document.querySelector(".lc-topo .lc-cab");
      return { placa: !!placa, cab: !!cab,
        benNoCab: !!(cab && cab.querySelector(".lc-ben + .lapis")),
        maisNoCab: !!(cab && cab.querySelector(".lc-mais")),
        rotulos: placa ? [...placa.querySelectorAll(".lc-f > .lc-k")].map(x => x.textContent.trim()) : [],
        altura: placa ? Math.round(placa.getBoundingClientRect().height) : 0,
        colunas: placa ? getComputedStyle(placa).gridTemplateColumns.split(" ").length : 0,
        urgenteSemEmoji: !/🔥/.test((cab && cab.textContent) || "") };
    });
    conf("a faixa do caso tem o cabeçalho e a placa dentro da .lc-topo", r.placa && r.cab);
    conf("o nome do pedido e a canetinha ficam no cabeçalho, com o ➕", r.benNoCab && r.maisNoCab);
    conf("a placa traz DER, Tramitação e Etapa, um quadro por dado", ["DER", "Tramitação", "Etapa"].every(x => r.rotulos.includes(x)));
    conf(`a placa tem a altura de uma linha de quadros no computador (${r.altura}px)`, r.altura > 40 && r.altura < 90);
    conf(`um quadro por coluna, sem colunas vazias (${r.colunas})`, r.colunas === r.rotulos.length);
    conf("o selo de urgente não usa emoji", r.urgenteSemEmoji);
    const meta = await p.evaluate(() => document.querySelector('meta[name="viewport"]').content);
    conf("o viewport cobre o entalhe (viewport-fit=cover)", /viewport-fit=cover/.test(meta));
    conf("o toque não pisca cinza", await p.evaluate(() =>
      /rgba\(0, 0, 0, 0\)|transparent/.test(getComputedStyle(document.documentElement).webkitTapHighlightColor)));
    await ctx.close();
  }

  // ── celular ────────────────────────────────────────────────────────────
  { const { ctx, p } = await abrir({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const r = await p.evaluate(() => {
      const placa = document.querySelector(".lc-placa");
      const det = document.querySelector(".det-rolagem");
      return {
        celular: document.getElementById("app").classList.contains("celular"),
        larga: document.querySelector(".detalhe").scrollWidth <= 392,
        colunas: placa ? getComputedStyle(placa).gridTemplateColumns.split(" ").length : 0,
        folga: det ? parseInt(getComputedStyle(det).paddingBottom, 10) : 0,
        fila: (() => { const f = document.querySelector(".escrever .tipo-fila"); return f ? getComputedStyle(f).flexWrap : ""; })(),
        campo16: (() => { const t = document.querySelector("#and-texto"); return t ? parseFloat(getComputedStyle(t).fontSize) : 0; })() };
    });
    conf("o app está em modo celular", r.celular);
    conf("a ficha não estoura a largura da tela (o SMBot quebra de linha)", r.larga);
    conf("a placa fica em duas colunas no celular", r.colunas === 2);
    conf(`a rolagem da ficha deixa folga para o campo fixo (${r.folga}px)`, r.folga >= 160);
    conf("os tipos de andamento correm numa faixa só", r.fila === "nowrap");
    conf("o campo de escrever tem 16px e não dá zoom no iPhone", r.campo16 >= 16);
    await p.screenshot({ path: path.join(__dirname, "f134-celular.png") });
    await ctx.close();
  }

  console.log("=== F134 · a placa do caso e a base de celular ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
