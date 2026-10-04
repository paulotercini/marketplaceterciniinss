// F161 — ✦ CLAUDE NO CASO. O botão do cabeçalho do caso abre o Claude com o
// pedido escrito. O link leva só os ids do caso e do cliente; nome, CPF e
// texto do cliente nunca passam pelo endereço. Dados fictícios.
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
  await p.waitForSelector(".lc-cab .lc-claude");
  conf("o cabeçalho do caso tem o botão ✦ Claude", (await p.textContent(".lc-cab .lc-claude")).includes("Claude"));
  await p.click(".lc-cab .lc-claude");
  await p.waitForSelector("#modal .esp-lista .esp-it");
  const menu = await p.evaluate(() => ({ acoes: [...document.querySelectorAll("#modal .esp-it")].map(b => b.textContent.trim()),
    ajuda: document.querySelector("#modal .cl-ajuda").textContent, web: document.querySelector('input[name="cl-onde"][value="web"]').checked }));
  conf("o menu traz as cinco ações", menu.acoes.length === 5 && menu.acoes[0] === "Situação do caso" && menu.acoes.includes("Registrar o atendimento de hoje"));
  conf("a ajuda mostra o endereço do conector", /ficticio\.supabase\.co\/functions\/v1\/mcp-crm/.test(menu.ajuda) && menu.web);
  await p.click("#modal .esp-it >> nth=0");
  const aberto = await p.evaluate(() => window.__abertos[0] || "");
  const caso = await p.evaluate(cli => D.casos.find(k => k.cliente_id === cli), CLI_CHEIO);
  const q = decodeURIComponent((aberto.split("?q=")[1] || ""));
  conf("abre o Claude no navegador com o pedido escrito, os ids e o estilo", aberto.startsWith("https://claude.ai/new?q=") && q.includes(caso.id) && q.includes(caso.cliente_id)
    && q.includes("anotacoes_caso") && q.includes("português formal") && !(await p.$("#modal .esp-it")));
  const links = await p.evaluate(id => { const k = D.casoPorId.get(id); return CLAUDE_ACOES.map(a => linkClaude(k, a[0], "app")); }, caso.id);
  const cli = FIX.clientes.find(c => c.id === CLI_CHEIO);
  const tudo = links.map(decodeURIComponent).join(" ");
  conf("no aplicativo de mesa o link usa claude://", links.every(l => l.startsWith("claude://claude.ai/new?q=")));
  conf("nenhum link leva nome, CPF ou telefone do cliente", !tudo.includes(cli.nome) && !tudo.includes(cli.nome.split(" ")[0]) && !(cli.cpf && tudo.includes(cli.cpf)) && !(cli.telefone && tudo.includes(cli.telefone)));
  await p.click(".lc-cab .lc-claude");
  await p.check('input[name="cl-onde"][value="app"]');
  conf("a escolha do aplicativo fica guardada", await p.evaluate(() => ler("crm_claude_onde") === "app"));
  await p.evaluate(() => fecharCaixa());
  const via = await p.evaluate(() => comentario({ id: "x", caso_id: "c", autor_id: null, texto: "Anotação fictícia", origem: "app", origem_id: "mcp:1", criado_em: new Date().toISOString() }, "", []));
  const sem = await p.evaluate(() => comentario({ id: "y", caso_id: "c", autor_id: null, texto: "Anotação fictícia", origem: "app", origem_id: null, criado_em: new Date().toISOString() }, "", []));
  conf("a anotação que veio do conector leva “via assistente” e a comum não", /via assistente/.test(via) && !/via assistente/.test(sem));

  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
