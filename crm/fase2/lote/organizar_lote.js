// Roda o "Organizar todos pelos documentos…" (F221) do próprio CRM no banco de verdade, como o Paulo, num navegador sem tela.
// O app fala com um endereço fictício; cada pedido é repassado ao Supabase com a chave de serviço.
// Ler é livre; gravar só nas tabelas que moverNumero, fundirCasos e aplicarPlano tocam, e só durante o
// "Aplicar nos clientes marcados". O log é público: só contagens, nada de nome ou texto.
// Uso: SUPABASE_URL=… SUPABASE_SERVICE_KEY=… AUTH_ID=… ESCREVER=1 node organizar_lote.js
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const URL0 = process.env.SUPABASE_URL.replace(/\/$/, ""), KEY = process.env.SUPABASE_SERVICE_KEY.trim();
const AUTH = process.env.AUTH_ID, ESCREVER = process.env.ESCREVER === "1";
const FALSO = "https://lote.invalid";
const SESSAO = { access_token: "x", refresh_token: "x", expires_in: 3600, token_type: "bearer", user: { id: AUTH, email: "lote@invalid" } };
const APP = path.join(__dirname, "..", "app.html");
let gravando = false; const barrados = {}, gravados = {};
const TABS = /^\/rest\/v1\/(casos|andamentos|anexos|andamento_tarefas|eventos|atribuicoes|clientes)(\?|$)/;

(async () => {
  const s = http.createServer((q, r) => { r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(APP)); }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss)); localStorage.setItem("crm_tema", "v10");
  }, [FALSO, SESSAO]);
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await ctx.route(FALSO + "/**", async rota => {
    const q = rota.request(), u = q.url(), m = q.method(), resto = u.slice(FALSO.length);
    if (/^\/auth\/v1\//.test(resto)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(/\/user$/.test(resto) ? SESSAO.user : SESSAO) });
    const rest = /^\/rest\/v1\//.test(resto);
    let pode = m === "GET" || m === "HEAD" || (rest && /^\/rest\/v1\/rpc\//.test(resto) && false);
    if (!pode && ESCREVER && gravando && rest && TABS.test(resto) && ["PATCH", "POST", "DELETE"].includes(m)) {
      pode = true; const ch = `${m} ${resto.split("?")[0]}`; gravados[ch] = (gravados[ch] || 0) + 1;
    }
    if (!pode) {
      const ch = `${m} ${resto.split("?")[0]}`; barrados[ch] = (barrados[ch] || 0) + 1;
      return rota.fulfill({ status: m === "POST" ? 201 : 204, contentType: "application/json", body: m === "POST" ? "[]" : "" });
    }
    const h = { ...q.headers(), apikey: KEY, authorization: `Bearer ${KEY}` };
    delete h.host; delete h["content-length"]; delete h.origin; delete h.referer;
    const r = await fetch(URL0 + resto, { method: m, headers: h, body: ["GET", "HEAD"].includes(m) ? undefined : q.postData() });
    const corpo = Buffer.from(await r.arrayBuffer());
    const hs = {}; r.headers.forEach((v, k) => { if (!/^(content-encoding|transfer-encoding|content-length)$/.test(k)) hs[k] = v; });
    hs["access-control-allow-origin"] = "*"; hs["access-control-expose-headers"] = "*";
    return rota.fulfill({ status: r.status, headers: hs, body: corpo });
  });
  const p = await ctx.newPage();
  const erros = []; p.on("pageerror", e => erros.push(e.message.slice(0, 120)));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/`);
  await p.waitForSelector("#app.logado", { timeout: 60000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D._completo === true, null, { timeout: 180000 });
  const ini = await p.evaluate(() => ({ eu: eu.nome.split(" ")[0], admin: souAdmin(), clientes: clientesVariosCasos().length }));
  console.log("entrou como", ini.eu, "admin", ini.admin, "· clientes de vários casos", ini.clientes);
  await p.evaluate(() => { organizarTodos(); });
  await p.waitForFunction(() => /clientes lidos/.test((document.getElementById("org-lote-st") || {}).textContent || ""), null, { timeout: 900000 });
  const res = await p.evaluate(() => {
    const L = _loteOrg, acoes = {};
    for (const pl of L.planos) for (const x of pl.passos) acoes[x.acao] = (acoes[x.acao] || 0) + 1;
    return { st: document.getElementById("org-lote-st").textContent.replace(/[^\d:,.()a-zà-ú ]/gi, ""), acoes,
      duvidas: L.planos.reduce((s, pl) => s + pl.duvidas.length, 0), ids: L.planos.filter(pl => pl.passos.length).map(pl => pl.c.id) };
  });
  console.log(res.st); console.log("passos por ação", res.acoes, "· dúvidas", res.duvidas);
  if (ESCREVER && res.ids.length) {
    gravando = true;
    await p.evaluate(() => { window.confirmar = async () => true; aplicarLoteOrg(); });
    await p.waitForFunction(() => /passos aplicados/.test((document.getElementById("org-lote-st") || {}).textContent || ""), null, { timeout: 1500000 });
    gravando = false;
    console.log(await p.evaluate(() => document.getElementById("org-lote-st").textContent));
  }
  console.log("gravados", gravados, "· escritas barradas", barrados, "· erros de página", erros.length, erros.slice(0, 5));
  await nav.close(); s.close();
  process.exit(0);
})().catch(e => { console.error(String(e).slice(0, 300)); process.exit(1); });
