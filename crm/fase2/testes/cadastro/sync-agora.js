// F47 — o botão "🔄 agora": dispara a sincronização To Do → CRM pelo GitHub
// (workflow_dispatch), token recusado é esquecido e pedido de novo, e a rodada
// concluída é percebida pelo carimbo todo_sync_em e recarrega os dados.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

// carimbo velho no banco + token já guardado (o caminho feliz não pede prompt)
const CARIMBO_VELHO = "2026-08-18T09:00:00Z";
const CARIMBO_NOVO  = "2026-08-18T09:47:00Z";
FIX.config_app = [
  { chave: "todo_sync_em", valor: CARIMBO_VELHO },
  { chave: "gh_token", valor: "github_pat_ficticio_valido" },
];

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
  let rodadaTerminou = false;               // vira true depois do disparo aceito
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      const corpo = JSON.parse(rota.request().postData() || "{}");
      escritos.push({ m, t, corpo });
      if (t === "config_app") (FIX.config_app.find(x => x.chave === corpo.chave) || {}).valor = corpo.valor;
      const rep = /return=representation/.test(JSON.stringify(rota.request().headers()));
      return rota.fulfill({ status: rep ? 201 : 204, contentType: "application/json",
        body: rep ? JSON.stringify([{ id: "n" + escritos.length, ...corpo }]) : "" });
    }
    let corpo = FIX[t] || [];
    // depois da rodada, TODO GET de config_app já vê o carimbo avançado
    // (tanto o espião filtrado quanto o select=* do carregar)
    if (t === "config_app" && rodadaTerminou)
      corpo = corpo.map(x => x.chave === "todo_sync_em" ? { ...x, valor: CARIMBO_NOVO } : x);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });

  // GitHub de mentira: primeiro clique recusa (401), depois aceita (204)
  const github = [];
  let ghRecusa = true;
  await ctx.route("https://api.github.com/**", rota => {
    github.push({ url: rota.request().url(),
      auth: rota.request().headers()["authorization"] || "" });
    if (ghRecusa) return rota.fulfill({ status: 401, contentType: "application/json", body: "{}" });
    rodadaTerminou = true;
    return rota.fulfill({ status: 204, body: "" });
  });

  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error" && !/401/.test(m.text()))
    erros.push("console: " + m.text()); });   // o 401 do cenário 2 é proposital
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);

  // 1) o botão está ao lado do carimbo do To Do
  conf("o botão 🔄 agora aparece no rodapé da barra",
    await p.evaluate(() => !!document.getElementById("btn-sync-todo")));

  await p.evaluate(() => { SYNC_POLL_MS = 1500; });   // dá tempo de ver o ⏳

  // 2) token recusado: o GitHub responde 401, o token guardado é esquecido
  await p.click("#btn-sync-todo");
  await p.waitForTimeout(600);
  conf("o disparo foi para o workflow certo com o token guardado",
    github.length === 1 && /crm-sync\.yml\/dispatches/.test(github[0].url) &&
    /Bearer github_pat_ficticio_valido/.test(github[0].auth));
  conf("token recusado é apagado do config_app (vai pedir outro)",
    escritos.some(x => x.t === "config_app" && x.corpo.chave === "gh_token" && x.corpo.valor === ""));
  conf("a recusa não trava o botão (dá para tentar de novo)",
    await p.evaluate(() => !syncRodando && !!document.getElementById("btn-sync-todo")));

  // 3) caminho feliz: com token válido de volta, 204 + carimbo novo = recarrega
  ghRecusa = false;
  escritos.length = 0;
  await p.evaluate(() => guardarCfgApp("gh_token", "github_pat_ficticio_novo"));
  await p.waitForTimeout(200);
  await p.click("#btn-sync-todo");
  await p.waitForTimeout(300);
  conf("enquanto roda, o botão vira ⏳ sincronizando…",
    await p.evaluate(() => syncRodando &&
      /sincronizando/.test((document.getElementById("sync-todo") || {}).textContent || "")));
  await p.waitForFunction(() => !syncRodando, null, { timeout: 8000 });
  conf("a rodada concluída devolve o botão e guarda o carimbo novo",
    await p.evaluate(c => cfgApp("todo_sync_em") === c && !!document.getElementById("btn-sync-todo"),
      CARIMBO_NOVO));
  conf("o aviso de concluído aparece",
    await p.evaluate(() => /To Do sincronizado/.test((document.getElementById("aviso") || {}).textContent || "")));

  console.log("=== o botão 🔄 agora (F47) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
