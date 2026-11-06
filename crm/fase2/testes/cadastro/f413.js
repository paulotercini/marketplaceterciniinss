// F413 — o quadro Contato: "Conversa" abre o WhatsApp do CRM (sem wa.me), o telefone se edita e o mesmo número
// gravado em dois formatos aparece uma vez só. Dados fictícios.
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const { FIX, SESSAO, CLI_CHEIO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co", CONV = "11111111-2222-3333-4444-555555555555";

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 1100 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  const pedidos = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (m !== "GET") pedidos.push([m, u, rota.request().postData() || ""]);
    if (/rpc\/zap_abrir/.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CONV) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") return rota.fulfill({ status: 204, body: "" });
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = []; p.on("pageerror", e => erros.push(e.message));
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await p.evaluate(cli => { D.cliPorId.get(cli).telefones = [
    { numero: "16) 99368-1262", obs: "principal", zap: false }, { numero: "16993681262", obs: "", zap: true },
    { numero: "(16) 3333-4444", obs: "recado" }]; }, CLI_CHEIO);
  await p.evaluate(x => abrirFicha(x).then(() => { abaAtiva = 0; subCad = "identificacao"; repintarFicha(); }), CLI_CHEIO);
  await p.waitForSelector(".idf .cad-tel");
  const linhas = await p.$$eval(".idf-card .cad-tel", ls => ls.map(l => l.querySelector(".cad-tel-n").textContent));
  conf(`o mesmo número em dois formatos vira uma linha (${linhas})`, linhas.length === 2 && linhas[0] === "(16) 99368-1262" && linhas[1] === "(16) 3333-4444");
  conf("a linha junta a marca WhatsApp e a observação", await p.evaluate(() => { const t = document.querySelector(".idf-card .cad-tel");
    return /WhatsApp/.test(t.textContent) && /principal/.test(t.textContent); }));
  conf("nenhum link do WhatsApp Web no quadro Contato", !(await p.$('.idf-card a[href*="wa.me"]')));

  await p.click('.idf-card .cad-tel:nth-of-type(1) button[onclick^="editarTelefone"]').catch(() => p.click('.idf-card button[onclick^="editarTelefone"]'));
  await p.waitForSelector("#et-num");
  conf("o editor abre com o número formatado", (await p.inputValue("#et-num")) === "(16) 99368-1262");
  await p.fill("#et-num", "(16) 98888-7777"); await p.fill("#et-obs", "filha");
  await p.click("#et-ok"); await p.waitForTimeout(400);
  const patch = pedidos.find(([m, u, b]) => m === "PATCH" && /clientes\?id=eq/.test(u) && /telefones/.test(b));
  conf("editar grava a lista sem a duplicata", patch && (() => { const l = JSON.parse(patch[2]).telefones;
    return l.length === 2 && l[0].numero === "(16) 98888-7777" && l[0].obs === "filha" && l[0].zap === true; })());

  await p.evaluate(cli => { D.cliPorId.get(cli).telefones = [{ numero: "(16) 99368-1262", obs: "", zap: true }]; abaAtiva = 0; repintarFicha(); }, CLI_CHEIO);
  await p.waitForSelector('.idf-card button[onclick^="zapDoTelefone"]');
  await p.click('.idf-card button[onclick^="zapDoTelefone"]');
  await p.waitForFunction(() => visao === "whatsapp", null, { timeout: 5000 }).catch(() => {});
  const rpc = pedidos.find(([m, u]) => /rpc\/zap_abrir/.test(u));
  conf("Conversa chama o zap_abrir com o número completo", rpc && JSON.parse(rpc[2]).p_telefone === "5516993681262");
  conf("e abre a tela do WhatsApp do CRM nessa conversa", await p.evaluate(c => visao === "whatsapp" && zapAberta === c, CONV));
  conf("sem erro na página", erros.length === 0);

  let pontos = 0; for (const [n, v] of ok) { console.log((v ? "✔ " : "✘ ") + n); if (v) pontos++; }
  if (erros.length) console.log(erros.join("\n"));
  console.log(`${pontos}/${ok.length}`);
  await nav.close(); s.close();
  process.exit(pontos === ok.length ? 0 : 1);
})();
