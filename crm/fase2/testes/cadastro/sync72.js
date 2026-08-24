// F72 — o 🩺 da sincronização: as últimas rodadas da Action do GitHub numa
// caixa do CRM (verde/vermelha), com "qual passo falhou?" na vermelha.
// F73 — o prazo fatal honesto: data solta no comentário vira tarefa de
// lembrete; casos.prazo só pelo ⏰, pelo quadro ou pelo To Do (a prova do
// composer vive em extracoes.js — aqui fica a da caixa do 🩺).
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

FIX.config_app = [{ chave: "gh_token", valor: "ghp_ficticio" },
  { chave: "todo_sync_em", valor: "2026-08-24T09:00:00Z" }];

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
  // o GitHub de mentira: 3 rodadas (uma falha) e os jobs da falha
  await ctx.route("https://api.github.com/**", rota => {
    const u = rota.request().url();
    if (/\/runs\/9902\/jobs/.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ jobs: [{ name: "sincronizar", steps: [
          { name: "Checkout repositório", conclusion: "success" },
          { name: "Renova token Microsoft Graph", conclusion: "failure" },
          { name: "Espelho -> banco (idempotente)", conclusion: "skipped" }] }] }) });
    if (/workflows\/crm-sync\.yml\/runs/.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ workflow_runs: [
          { id: 9903, status: "completed", conclusion: "success", event: "schedule",
            created_at: "2026-08-24T12:00:00Z", html_url: "https://github.com/x/1" },
          { id: 9902, status: "completed", conclusion: "failure", event: "schedule",
            created_at: "2026-08-24T11:00:00Z", html_url: "https://github.com/x/2" },
          { id: 9901, status: "completed", conclusion: "success", event: "workflow_dispatch",
            created_at: "2026-08-24T10:00:00Z", html_url: "https://github.com/x/3" }] }) });
    return rota.fulfill({ status: 404, body: "?" });
  });
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (rota.request().method() !== "GET")
      return rota.fulfill({ status: 201, contentType: "application/json", body: "[]" });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
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

  conf("o rodapé do To Do tem o botão 🩺 ao lado do 🔄",
    await p.evaluate(() => { const st = document.getElementById("sync-todo");
      return st && /🩺/.test(st.innerHTML) && /sincronizarToDoAgora/.test(st.innerHTML); }));

  await p.evaluate(() => saudeSync());
  await p.waitForTimeout(600);
  conf("a caixa lista as rodadas com verde e vermelha",
    await p.evaluate(() => { const c = document.querySelector(".modal-cx") || document.body;
      const t = c.textContent; return /Rodadas da sincronização/.test(t) &&
        /🟢/.test(t) && /🔴/.test(t) && /rodada de hora em hora/.test(t) &&
        /disparo manual/.test(t); }));
  conf("a falha oferece o 'qual passo falhou?' e a dica do token do Graph",
    await p.evaluate(() => { const t = document.body.textContent;
      return /qual passo falhou\?/.test(t) && /GRAPH_REFRESH_TOKEN/.test(t); }));

  await p.evaluate(() => [...document.querySelectorAll("button")]
    .find(b => /qual passo falhou/.test(b.textContent)).click());
  await p.waitForTimeout(500);
  conf("o clique aponta o passo exato: Renova token Microsoft Graph",
    await p.evaluate(() => /falhou em: Renova token Microsoft Graph/.test(
      document.body.textContent)));

  console.log("=== F72 · o 🩺 da sincronização ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
