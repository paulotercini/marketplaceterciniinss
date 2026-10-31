// Roda o "Etapas em lote…" (F322) do próprio CRM no banco de verdade, como o Paulo, num navegador sem tela.
// O app fala com um endereço fictício; cada pedido é repassado ao Supabase com a chave de serviço.
// Ler é livre; gravar só o que o grupo A grava (PATCH de casos e POST do andamento "Etapa: …"), e só
// durante o clique em "Gravar". O log é público: só contagens, nada de nome ou texto.
// Uso: SUPABASE_URL=… SUPABASE_SERVICE_KEY=… AUTH_ID=… ESCREVER=1 node etapas_lote.js
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const URL0 = process.env.SUPABASE_URL.replace(/\/$/, ""), KEY = process.env.SUPABASE_SERVICE_KEY.trim();
const AUTH = process.env.AUTH_ID, ESCREVER = process.env.ESCREVER === "1";
const FALSO = "https://lote.invalid";
const SESSAO = { access_token: "x", refresh_token: "x", expires_in: 3600, token_type: "bearer", user: { id: AUTH, email: "lote@invalid" } };
const APP = path.join(__dirname, "..", "app.html");
let gravando = false; const barrados = {}, gravados = { patch: 0, post: 0 };

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
    if (!pode && ESCREVER && gravando && rest) {
      const corpo = q.postData() || "";
      if (m === "PATCH" && /^\/rest\/v1\/casos\?id=eq\.[0-9a-f-]{36}$/.test(resto)
        && Object.keys(JSON.parse(corpo)).every(c => ["etapa", "trilha", "resultado", "decisao_em"].includes(c))) { pode = true; gravados.patch++; }
      if (m === "POST" && /^\/rest\/v1\/andamentos$/.test(resto) && /^Etapa: /.test(JSON.parse(corpo).texto || "")) { pode = true; gravados.post++; }
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
  const ini = await p.evaluate(() => ({ eu: eu.nome.split(" ")[0], admin: souAdmin(), casos: casosDoLoteEtapa().length, sem: casosDoLoteEtapa().filter(k => !k.etapa).length }));
  console.log("entrou como", ini.eu, "admin", ini.admin, "· casos no lote", ini.casos, "· sem etapa", ini.sem);
  await p.evaluate(() => etapasEmLote());
  await p.waitForFunction(() => /prontos/.test((document.getElementById("et-lote-st") || {}).textContent || ""), null, { timeout: 300000 });
  const res = await p.evaluate(() => {
    const cont = {}, mot = {}, prop = {};
    for (const it of _loteEt.itens) { cont[it.g] = (cont[it.g] || 0) + 1;
      const mm = it.g + " · " + String(it.motivo || "").replace(/\d{2}\/\d{2}\/\d{4}/g, "dd/mm/aaaa").replace(/“[^”]*”/g, "“…”"); mot[mm] = (mot[mm] || 0) + 1;
      if (it.g === "A") { const e = faseDaEtapa(it.k) + " → " + it.p.etapa; prop[e] = (prop[e] || 0) + 1; } }
    return { st: document.getElementById("et-lote-st").textContent, cont, mot, prop, idsA: _loteEt.itens.filter(i => i.g === "A").map(i => i.k.id) };
  });
  console.log(res.st); console.log("grupos", res.cont); console.log("motivos", res.mot); console.log("A por fase e etapa", res.prop);
  if (ESCREVER && res.idsA.length) {
    gravando = true;
    await p.evaluate(() => gravarLoteEtapa());
    await p.waitForFunction(() => /etapas gravadas|não gravaram/.test((document.getElementById("et-lote-st") || {}).textContent || ""), null, { timeout: 300000 });
    gravando = false;
    console.log((await p.evaluate(() => document.getElementById("et-lote-st").textContent)).split("✔")[0]);
  }
  console.log("gravados", gravados, "· escritas barradas", barrados, "· erros de página", erros.length, erros.slice(0, 5));
  await nav.close(); s.close();
  process.exit(0);
})().catch(e => { console.error(String(e).slice(0, 300)); process.exit(1); });
