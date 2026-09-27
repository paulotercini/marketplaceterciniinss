// F150 · o CRM mais rápido de abrir: (1) a primeira leva mostra a lista antes
// da segunda chegar; (2) a sessão guardada abre a tela sem esperar o banco e
// sai no "Sair"; (3) o mouse parado sobre o cliente já busca a ficha, e o
// clique não repete a busca; (4) o programa guardado pelo sw.js abre e, com
// versão nova no site, aparece o aviso de recarregar.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

(async () => {
  let marca = "";   // muda o HTML servido, para simular versão nova
  const s = http.createServer((q, r) => {
    const u = q.url.split("?")[0];
    // o sw.js é servido direto da fonte, ao lado do app.html, como no site
    const a = u === "/sw.js" ? path.join(__dirname, "..", "..", "sw.js") : path.join(__dirname, u === "/" ? "app.html" : u);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    const tipo = a.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8";
    r.writeHead(200, { "Content-Type": tipo, "Cache-Control": "no-cache" });
    let corpo = fs.readFileSync(a, "utf8");
    if (a.endsWith("app.html") && marca) corpo = corpo.replace("</body>", `<!-- ${marca} --></body>`);
    r.end(corpo);
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const base = `http://127.0.0.1:${s.address().port}/app.html`;
  const nav = await chromium.launch();
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const erros = [];
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
    localStorage.setItem("crm_sw", "1");
  }, [SUPA, SESSAO]);
  let atraso = {}, pedidosAnd = 0;
  await ctx.route(SUPA + "/**", async rota => {
    const u = rota.request().url();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (rota.request().method() !== "GET") return rota.fulfill({ status: 204, body: "" });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (t === "andamentos" && /caso_id=in/.test(u)) pedidosAnd++;
    if (atraso[t]) await new Promise(r => setTimeout(r, atraso[t]));
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  const p = await ctx.newPage();
  p.on("pageerror", e => erros.push("pageerror: " + e.message));

  // (1) a segunda leva atrasada não segura a lista
  atraso = { modelos_mensagem: 2500 };
  await p.goto(base);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0, null, { timeout: 2000 });
  const cedo = await p.evaluate(() => ({ modelos: D._completo ? 1 : 0, lista: !!document.querySelector("#conteudo-meio h1, #titulo-lista") && /Meu Dia/.test(document.getElementById("titulo-lista").textContent) }));
  conf("F150 · a lista aparece antes da segunda leva chegar", cedo.lista && cedo.modelos === 0);
  await p.waitForFunction(() => D._completo === true, null, { timeout: 5000 });
  conf("F150 · a segunda leva completa D sem refazer a tela", await p.evaluate(() => Array.isArray(D.modelos) && D.cliPorId.size > 0));
  await p.waitForTimeout(400);

  // (2) sessão guardada: com o banco lento, a tela abre com ela
  atraso = { clientes: 2500 };
  await p.reload();
  await p.waitForSelector("#app.logado");
  await p.waitForTimeout(600);
  const guard = await p.evaluate(() => ({ d: typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0,
    classe: document.getElementById("app").classList.contains("dados-guardados"), cache: dadosDoCache }));
  conf("F150 · com o banco lento, a tela abre com a sessão guardada, marcada 'atualizando'", guard.d && guard.classe && guard.cache);
  await p.waitForFunction(() => !document.getElementById("app").classList.contains("dados-guardados"), null, { timeout: 6000 });
  conf("F150 · quando o banco responde, a marca 'atualizando' sai", await p.evaluate(() => !dadosDoCache));
  atraso = {};

  // (3) pré-carregamento da ficha
  await p.evaluate(() => { visao = "fase:inss"; render(); });
  await p.waitForTimeout(300);
  const antes = pedidosAnd;
  const alvo = p.locator(`#conteudo-meio .cartao[data-cli="${CLI_CHEIO}"]`).first();
  await alvo.hover(); await p.waitForTimeout(250);
  const buscou = pedidosAnd - antes;
  await alvo.click(); await p.waitForTimeout(700);
  conf(`F150 · o mouse parado já busca a ficha, e o clique não repete (${buscou} antes, ${pedidosAnd - antes} no total)`, buscou === 1 && pedidosAnd - antes === 1
    && await p.evaluate(() => !!document.querySelector("#detalhe .det-principal, #detalhe .linha-caso")));

  // (4) o programa guardado e o aviso de versão nova
  await p.evaluate(() => navigator.serviceWorker.ready);
  const controla = await p.evaluate(async () => { if (!navigator.serviceWorker.controller) await new Promise(r => navigator.serviceWorker.addEventListener("controllerchange", r, { once: true })); return !!navigator.serviceWorker.controller; });
  conf("F150 · o sw.js assume a página", controla);
  await p.reload(); await p.waitForSelector("#app.logado"); await p.waitForTimeout(600);
  marca = "versao-nova-" + Date.now();
  await p.reload(); await p.waitForSelector("#app.logado");
  const html = await p.content();
  conf("F150 · a abertura usa o programa guardado (a versão nova ainda não entrou)", !html.includes(marca));
  await p.waitForSelector("#nova-versao", { timeout: 5000 }).catch(() => {});
  conf("F150 · com versão nova no site, aparece o aviso de recarregar", await p.evaluate(() => !!document.getElementById("nova-versao")));

  // (5) o Sair apaga a sessão guardada
  conf("F150 · o Sair apaga a sessão guardada", await p.evaluate(async () => { await cacheApagar(); return (await cacheLer()) === null; }));

  console.log("=== F150 · o CRM mais rápido de abrir ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length + erros.length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
