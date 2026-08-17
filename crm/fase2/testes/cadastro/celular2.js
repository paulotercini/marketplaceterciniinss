// F42 no CELULAR — a conversa do caso em 390px: as ações sempre visíveis
// (sem hover no dedo), a faixa do não lido cabendo, os alvos de toque com
// tamanho de dedo e o composer registrando com a mesma trava.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const EU2 = "22222222-2222-2222-2222-222222222222";
FIX.colaboradores.push({ id: EU2, auth_id: null, nome: "Marcos Fictício", inicial: "M",
  cor: "#7a3ccf", papel: "user", ativo: true, cargo: "advogado", setor: null });
const A_NOVA = "a0000000-0000-0000-0000-00000000f431";
FIX.andamentos = FIX.andamentos || [];
FIX.andamentos.push({ id: A_NOVA, caso_id: CASO1, autor_id: EU2, origem: "app",
  criado_em: new Date().toISOString(), andamentos_lidos: [],
  texto: "@Paulo chegou a intimação, o prazo é curto." });

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 },
    isMobile: true, hasTouch: true });
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
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);

  conf("o app está em modo celular", await p.evaluate(() =>
    document.getElementById("app").classList.contains("celular")));

  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForTimeout(900);

  // 1) a conversa renderiza inteira em 390px, sem estouro horizontal
  conf("a faixa do não lido aparece no celular",
    await p.evaluate(() => !!document.querySelector(".tl-banner")));
  conf("nada estoura a largura da tela",
    await p.evaluate(() => document.documentElement.scrollWidth <= 400));

  // 2) as ações do comentário são visíveis SEM hover (dedo não paira)
  const acoes = await p.evaluate(() => {
    const b = document.querySelector(".timeline li:not(.tl-sys) .tl-acoes");
    return b ? getComputedStyle(b).opacity : null;
  });
  conf(`as ações (👍 ↩) ficam sempre visíveis no celular (opacity ${acoes})`, acoes === "1");

  // 3) alvo de toque: o botão de marcar-todas tem altura de dedo
  const alvo = await p.evaluate(() => {
    const b = document.querySelector(".tl-banner .btn-mini");
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { h: Math.round(r.height), w: Math.round(r.width) };
  });
  conf(`o marcar-todas é tocável (${alvo && alvo.h}px de altura)`, alvo && alvo.h >= 30);

  // 4) marcar todas funciona no toque
  await p.tap(".tl-banner .btn-mini");
  await p.waitForTimeout(800);
  conf("o toque marca todas como lidas e a faixa some",
    await p.evaluate(() => !document.querySelector(".tl-banner")));

  // 5) registrar um andamento pelo celular com a trava de sempre
  await p.fill("#and-texto", "Visto no celular, respondo da mesa.");
  await p.evaluate(() => { tfQuem = []; tfData = null; });
  escritos.length = 0;
  await p.evaluate(caso => novoAndamento(caso), CASO1);
  await p.waitForTimeout(900);
  conf("o composer registra normalmente no celular",
    escritos.some(x => x.m === "POST" && x.t === "andamentos" &&
      /Visto no celular/.test(x.corpo.texto || "")));

  await p.screenshot({ path: path.join(__dirname, "f42-celular.png") });
  console.log("=== a conversa do caso no celular (F42) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
