// F137 · os quatro acertos visíveis da revisão impeccable: a barra de baixo
// legível no tema v10, o cabeçalho do usuário sem sobreposição, o tocar e
// segurar no celular (e o Meu Dia vazio que ensina esse gesto) e o selo de
// cliente ativo sem a bolinha repetida.
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
    await p.waitForTimeout(500);
    return { ctx, p };
  };

  // ── computador: cabeçalho do usuário e selo do cliente ativo ────────────
  { const { ctx, p } = await abrir({ viewport: { width: 1440, height: 900 } });
    await p.evaluate(() => { const b = document.getElementById("btn-vercomo"); if (b) b.style.display = ""; });
    const cruza = await p.evaluate(() => {
      const bs = [...document.querySelectorAll(".usuario .sair")].filter(b => b.offsetWidth)
        .map(b => b.getBoundingClientRect());
      return bs.some((a, i) => bs.some((b, j) => i < j && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom));
    });
    conf("os botões do cabeçalho do usuário não se sobrepõem", !cruza);
    await p.evaluate(c => abrirFicha(c), CLI_CHEIO); await p.waitForTimeout(800);
    const st = await p.evaluate(() => (document.querySelector(".cli-st.ativo") || {}).textContent || "");
    conf(`o selo de cliente ativo não repete a bolinha (${st.trim().slice(0, 24)})`, st && !/🟢/.test(st));
    await ctx.close();
  }

  // ── celular: barra de baixo, Meu Dia vazio e tocar e segurar ────────────
  { const { ctx, p } = await abrir({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const barra = await p.evaluate(() => {
      const lum = c => { const [r, g, b] = c.match(/\d+/g).slice(0, 3).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
      const fundo = getComputedStyle(document.getElementById("barra-cel")).backgroundColor;
      return [...document.querySelectorAll("#barra-cel button")].map(b => {
        const a = lum(getComputedStyle(b).color), f = lum(fundo);
        return { svg: !!b.querySelector("b svg"), razao: (Math.max(a, f) + .05) / (Math.min(a, f) + .05) };
      });
    });
    conf(`os quatro rótulos da barra passam do contraste 4,5 (${barra.map(x => x.razao.toFixed(1)).join(", ")})`, barra.length === 4 && barra.every(x => x.razao >= 4.5));
    conf("a barra usa os ícones desenhados, não emoji", barra.every(x => x.svg));
    conf("o Meu Dia vazio ensina a tocar e segurar", await p.evaluate(() =>
      /toque e segure/.test(document.getElementById("conteudo-meio").textContent) &&
      !/botão direito/.test(document.getElementById("conteudo-meio").textContent)));
    await p.locator('[data-v="fase:inss"]').first().evaluate(el => el.click());
    await p.waitForTimeout(500);
    const temCartao = await p.evaluate(cli => !!document.querySelector(`.cartao[data-cli="${cli}"]`), CLI_CHEIO);
    conf("a lista do INSS mostra o cartão do cliente", temCartao);
    await p.evaluate(cli => {
      const el = document.querySelector(`.cartao[data-cli="${cli}"]`), r = el.getBoundingClientRect();
      const t = new Touch({ identifier: 1, target: el, clientX: r.left + 40, clientY: r.top + 10 });
      el.dispatchEvent(new TouchEvent("touchstart", { touches: [t], targetTouches: [t], changedTouches: [t], bubbles: true }));
    }, CLI_CHEIO);
    await p.waitForTimeout(650);
    conf("segurar meio segundo abre o menu com Adicionar ao Meu Dia", await p.evaluate(() =>
      /Meu Dia/.test((document.getElementById("menu-mover") || {}).textContent || "")));
    const soltou = await p.evaluate(cli => {
      const el = document.querySelector(`.cartao[data-cli="${cli}"]`);
      const t = new Touch({ identifier: 1, target: el, clientX: 50, clientY: 50 });
      const ev = new TouchEvent("touchend", { changedTouches: [t], bubbles: true, cancelable: true });
      el.dispatchEvent(ev); return ev.defaultPrevented;
    }, CLI_CHEIO);
    conf("soltar o dedo não vira o clique que abriria a ficha", soltou);
    await ctx.close();
  }

  console.log("=== F137 · os quatro acertos visíveis ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
