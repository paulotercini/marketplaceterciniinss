// F39 — a pesquisa não prende o menu. Com uma busca ativa, clicar em qualquer
// lista da barra lateral navega direto e apaga a pesquisa sozinho (campo e ✕).
// Antes, o clique trocava a `visao` mas o render() via buscaTxt e repintava a
// pesquisa por cima — parecia que o menu não funcionava.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
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
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (m !== "GET")
      return rota.fulfill({ status: 204, contentType: "application/json", body: "" });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FIX[t] || []) });
  });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error") erros.push("console: " + m.text()); });
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const titulo = () => p.evaluate(() => document.getElementById("titulo-lista").textContent);

  // 1) pesquisar de verdade, pelo campo (com o debounce de 200ms)
  await p.fill("#busca", "Aurelia");
  await p.waitForTimeout(500);
  conf("digitar no campo abre a tela de pesquisa", /Pesquisa/.test(await titulo()));
  conf("o ✕ da pesquisa aparece",
    await p.evaluate(() => document.getElementById("busca-x").style.display === "block"));
  conf("a pesquisa acha a cliente fictícia",
    (await p.evaluate(() => document.querySelectorAll("#conteudo-meio .cartao[data-cli]").length)) >= 1);

  // 2) o miolo da F39: clicar numa lista do menu COM a pesquisa ativa
  await p.click('.lista-item[data-v="fase:inss"]');
  await p.waitForTimeout(400);
  conf("o clique no menu NAVEGA (a tela deixa de ser a pesquisa)", !/Pesquisa/.test(await titulo()));
  conf("a visão é a da lista clicada", (await p.evaluate(() => visao)) === "fase:inss");
  conf("buscaTxt foi limpo", (await p.evaluate(() => buscaTxt)) === "");
  conf("o campo da pesquisa esvaziou",
    (await p.evaluate(() => document.getElementById("busca").value)) === "");
  conf("o ✕ da pesquisa sumiu",
    await p.evaluate(() => document.getElementById("busca-x").style.display === "none"));
  conf("o campo do celular esvaziou junto",
    (await p.evaluate(() => document.getElementById("busca-cel").value)) === "");
  await (await p.$("#app")).screenshot({ path: path.join(__dirname, "f39-menu-livre.png") });

  // 3) as visões também soltam a pesquisa (Meu Dia) e o ＋ Novo cliente idem
  await p.fill("#busca", "Aurelia");
  await p.waitForTimeout(500);
  await p.click('.lista-item[data-v="meudia"]');
  await p.waitForTimeout(400);
  conf("visão do menu (Meu Dia) também solta a pesquisa",
    (await p.evaluate(() => visao === "meudia" && buscaTxt === "")));
  await p.fill("#busca", "Aurelia");
  await p.waitForTimeout(500);
  await p.click("#btn-novo-cli");
  await p.waitForTimeout(400);
  conf("＋ Novo cliente também solta a pesquisa",
    (await p.evaluate(() => visao === "novocliente" && buscaTxt === "")));

  // 4) o caminho antigo continua vivo: o ✕ limpa e devolve a lista
  await p.fill("#busca", "Aurelia");
  await p.waitForTimeout(500);
  conf("(regressão) a pesquisa volta a abrir", /Pesquisa/.test(await titulo()));
  await p.click("#busca-x");
  await p.waitForTimeout(400);
  conf("(regressão) o ✕ continua limpando a pesquisa",
    (await p.evaluate(() => buscaTxt)) === "" && !/Pesquisa/.test(await titulo()));

  console.log("=== pesquisa não prende o menu (F39) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
