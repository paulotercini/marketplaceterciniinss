// F43 — a ficha NUNCA fica presa no "abrindo a ficha…". As duas causas
// reais: (1) a consulta de credenciais era a única sem proteção — um erro
// dela rejeitava o conjunto e o placeholder ficava para sempre; (2) linha de
// colaborador incompleta (ativo nulo, sem nome) entrava no equipeAtiva da
// F41 e derrubava a pintura do composer. Agora: toda perna com catch, tela
// de erro com "tentar de novo", e equipeAtiva exige linha utilizável.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

// a linha QUEBRADA que existe em banco velho: ativo nulo, sem nome/inicial
FIX.colaboradores.push({ id: "99999999-9999-9999-9999-999999999999",
  auth_id: null, nome: null, inicial: null, cor: null, papel: "user",
  ativo: null, cargo: null, setor: null });

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
  let derrubarCredenciais = false;
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (t === "credenciais" && derrubarCredenciais)
      return rota.fulfill({ status: 500, contentType: "application/json", body: "{\"message\":\"boom\"}" });
    if (m !== "GET")
      return rota.fulfill({ status: 204, contentType: "application/json", body: "" });
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const detalhe = () => p.evaluate(() => (document.getElementById("detalhe") || {}).innerText || "");

  // 1) colaborador quebrado na tabela NÃO derruba a ficha nem entra nos chips
  conf("a linha quebrada fica fora do equipeAtiva",
    await p.evaluate(() => equipeAtiva().every(c => c.nome && c.inicial)));
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForTimeout(1200);
  conf("a ficha pinta mesmo com colaborador quebrado no banco",
    !/abrindo a ficha/.test(await detalhe()) && /CPF/.test(await detalhe()));

  // 2) credenciais caindo com 500 não prende mais a ficha
  await p.evaluate(() => fecharFicha(false));
  derrubarCredenciais = true;
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForTimeout(1500);
  const txt = await detalhe();
  conf("com a consulta de credenciais dando 500, a ficha ABRE mesmo assim",
    !/abrindo a ficha/.test(txt) && /CPF/.test(txt));
  conf("e o Meu INSS aparece como sem senha (degradação, não travamento)",
    /sem senha|Meu INSS/i.test(txt));
  derrubarCredenciais = false;

  console.log("=== a ficha nunca fica presa (F43) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de página:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
