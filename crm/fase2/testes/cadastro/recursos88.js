// F88 — o RECURSO SEM CASO passa a ter dono. A coleta do e-Recursos traz o
// nome do recorrente; até aqui ele morria numa contagem ("46 número de
// recurso não tem caso — esses não entram") e os movimentos ficavam de fora
// em toda coleta. Agora cada órfão aparece com nome e NB, com três saídas:
// vincular ao caso sugerido pelo nome, escolher à mão, ou ignorar de vez.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CLI_VAZIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

// o caso da cliente cheia fica SEM nup: é o alvo da sugestão pelo nome
Object.assign(FIX.casos[0], { fase: "conselho", origem_lista: "🖥 Conselho de Recursos", crps_nups: [] });
const COLETA = "cc000000-0000-0000-0000-0000000000f8";
const NUP_A = "44233100482202611";   // recorrente = a cliente cheia (casa pelo nome)
const NUP_B = "44233100999202622";   // recorrente desconhecido: só na mão
const ev = { status: "Recurso recebido na Junta", data: "01/09/2026 10:00" };
FIX.coletas = [{ id: COLETA, fonte: "crps", criado_em: new Date().toISOString(), aplicada_em: null,
  dados: { itens: {
    [NUP_A + "_1"]: { proc: NUP_A, numProc: "41210334552", orgaoAtual: "25ª JR",
      recorrentes: [{ nome: "Aurelia Ficta de Souza" }, { nome: "Paulo Roberto Tercini" }], eventos: [ev] },
    [NUP_B + "_1"]: { proc: NUP_B, numProc: "41999888777", orgaoAtual: "3ª CaJ",
      recorrentes: [{ nome: "Nao Existe No Crm" }], eventos: [ev] } } } }];

(async () => {
  const escritos = [];
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
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") { escritos.push({ t, m, corpo: rota.request().postData() || "", url: u });
      return rota.fulfill({ status: 200, contentType: "application/json", body: "[]" }); }
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    const g = u.match(/coletas\?select=\*&id=eq\.([0-9a-f-]+)/);
    if (g) corpo = (FIX.coletas || []).filter(x => x.id === g[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error" && !/ERR_FAILED/.test(m.text())) erros.push("console: " + m.text()); });
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await p.evaluate(async (id) => { visao = "patinss"; render(); await conferirCrps(id); }, COLETA);
  await p.waitForTimeout(400);

  const tela = () => p.evaluate(() => {
    const t = document.getElementById("conteudo-meio").textContent.replace(/\s+/g, " ");
    return { txt: t,
      linhas: [...document.querySelectorAll(".exig .meio-sub")].map(e => e.textContent.replace(/\s+/g, " ").trim()).filter(x => /\d{5}\./.test(x)),
      vincular: [...document.querySelectorAll("button")].filter(b => /^vincular ao caso de/.test(b.textContent.trim())).length,
      escolher: [...document.querySelectorAll("button")].filter(b => /escolher/.test(b.textContent)).length,
      lote: !![...document.querySelectorAll("button")].find(b => /vincular os \d/.test(b.textContent)) };
  });
  let t = await tela();
  conf("os dois recursos órfãos aparecem na tela, e não só na contagem", t.linhas.length === 2);
  conf("cada um mostra o NUP formatado e o nome do recorrente", /44233\.100482\/2026-11 — Aurelia Ficta de Souza/.test(t.linhas.join(" | ")));
  conf("e o NB que veio junto", /NB 41210334552/.test(t.linhas.join(" | ")));
  conf("o que casou pelo nome ganha 'vincular ao caso de …'", t.vincular === 1 && /vincular ao caso de Aurélia/.test(t.txt));
  conf("o que não casou tem só 'escolher' e '🚫'", t.escolher === 2);
  conf("e existe o vincular em lote", t.lote);
  conf("o rótulo diz que sem dono os movimentos não entram", /sem caso com esse NUP no CRM/.test(t.txt));

  // vincular pelo nome grava o NUP no caso certo
  await p.evaluate(n => vincularRecursoCrps(n), NUP_A);
  await p.waitForTimeout(500);
  const patch = escritos.filter(e => e.t === "casos" && e.m === "PATCH").map(e => JSON.parse(e.corpo)).find(b => b.crps_nups);
  conf("vincular grava o NUP em crps_nups do caso", patch && patch.crps_nups.join() === NUP_A);
  conf("o caso passou a ter o NUP na memória", await p.evaluate(id => (D.casoPorId.get(id).crps_nups || []).length === 1, CASO1));
  t = await tela();
  conf("e o recurso vinculado sai da lista de órfãos", t.linhas.length === 1 && !/Aurelia Ficta/.test(t.linhas.join(" ")));

  // escolher à mão: busca por nome e vincula
  await p.evaluate(n => escolherCasoCrps(n), NUP_B);
  await p.waitForSelector("#esc-crps-busca");
  conf("a caixa de escolher mostra o NUP e o recorrente", await p.evaluate(() => /44233\.100999\/2026-22/.test(document.getElementById("modal").textContent) && /Nao Existe No Crm/.test(document.getElementById("modal").textContent)));
  await p.evaluate(() => { const i = document.getElementById("esc-crps-busca"); i.value = "Belmiro"; i.dispatchEvent(new Event("input")); });
  await p.waitForTimeout(200);
  conf("a busca encontra o cliente pelo nome", await p.evaluate(() => /Belmiro Inventado Nogueira/.test(document.getElementById("esc-crps-lista").textContent)));
  conf("cliente sem caso ativo oferece criar caso no Conselho", await p.evaluate(() => /caso no Conselho novo p\/ Belmiro/.test(document.getElementById("esc-crps-lista").textContent)));

  // ignorar tira da lista e guarda a decisão
  await p.evaluate(() => fecharCaixa());
  await p.evaluate(n => ignorarRecursoCrps(n), NUP_B);
  await p.waitForTimeout(500);
  const cfg = escritos.filter(e => e.t === "config_app").map(e => e.corpo).join(" ");
  conf("ignorar guarda o NUP em config_app (crps_ignorar)", /crps_ignorar/.test(cfg) && cfg.includes(NUP_B));
  t = await tela();
  conf("e a lista de órfãos fica vazia", t.linhas.length === 0);
  conf("com o aviso de que há ignorados, e como voltar atrás", /ignorados de vez/.test(t.txt) && /limpar e voltar a perguntar/.test(t.txt));

  for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
