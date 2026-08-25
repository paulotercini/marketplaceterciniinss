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
    if (/\/jobs\/777\/logs/.test(u))
      return rota.fulfill({ status: 200, contentType: "text/plain",
        body: ["2026-08-24T12:39:00.0000000Z ##[group]Run python crm/fase2/migrar.py",
          "2026-08-24T12:39:41.0000000Z o banco recusou POST em 'eventos' (409): duplicate key fictício",
          "2026-08-24T12:39:41.0000000Z BancoRecusou: linha culpada nomeada acima",
          "2026-08-24T12:39:42.0000000Z ##[error]Process completed with exit code 1."].join("\n") });
    if (/\/runs\/9902\/jobs/.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ jobs: [{ id: 777, name: "sincronizar", steps: [
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
  conf("F75: as últimas linhas do log aparecem com o motivo do banco",
    await p.evaluate(() => { const pre = document.querySelector(".ss-log");
      return pre && /o banco recusou POST em 'eventos'/.test(pre.textContent) &&
        /exit code 1/.test(pre.textContent) && !/##\[group\]/.test(pre.textContent); }));

  // F77 · o testador de chave: válida-service / anon / inválida
  const testar = async chave => { await p.fill("#ss-chave", chave);
    await p.evaluate(() => ssTestarChave()); await p.waitForTimeout(400);
    return p.evaluate(() => document.getElementById("ss-chave-r").textContent); };
  await ctx.route(SUPA + "/rest/v1/config_app*", rota => {
    const h = rota.request().headers(), k = h["apikey"] || "";
    // como o gateway real: chave não-JWT em Authorization = recusa geral
    // (F78 — era isso que derrubava a sync e dava ❌ em sb_secret_ boa)
    if (k.startsWith("sb_") && h["authorization"])
      return rota.fulfill({ status: 401, contentType: "application/json",
        body: JSON.stringify({ message: "Invalid API key" }) });
    if (k === "chave-service" || k === "sb_secret_boa")
      return rota.fulfill({ status: 200,
        contentType: "application/json", body: JSON.stringify([{ chave: "x" }]) });
    if (k === "chave-anon") return rota.fulfill({ status: 200,
      contentType: "application/json", body: "[]" });
    return rota.fulfill({ status: 401, contentType: "application/json",
      body: JSON.stringify({ message: "Invalid API key" }) });
  });
  conf("testador: a service key responde VÁLIDA com força de service",
    /VÁLIDA e com força de service/.test(await testar("chave-service")));
  conf("F78: a sb_secret_ vai SÓ no apikey e responde VÁLIDA (antes dava ❌)",
    /VÁLIDA e com força de service/.test(await testar("sb_secret_boa")));
  conf("testador: a anon é apontada como sem força de service",
    /anon\/publishable/.test(await testar("chave-anon")));
  conf("testador: chave estranha responde INVÁLIDA com a impressão digital",
    /INVÁLIDA/.test(await testar("chave-qualquer")) &&
    await p.evaluate(() => /14 caracteres/.test(
      document.getElementById("ss-chave-r").textContent)) &&
    await p.evaluate(() => document.getElementById("ss-chave").value === ""));

  console.log("=== F72 · o 🩺 da sincronização ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
