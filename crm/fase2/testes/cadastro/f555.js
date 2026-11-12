// F555 · O CARTÃO DE CONTATO NO WHATSAPP (pedido do Paulo de 12.11.2026): o contato que o cliente envia mostrava apenas o
// nome, sem número nem ação. Confere no celular que o balão mostra o número, os botões Conversar, Salvar, Copiar e Ligar,
// que o Salvar abre o "＋ conversa" já conferido e que o contato gravado sem número manda ver no celular. Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const CONV = "d5550000-0000-0000-0000-000000000001";
const agora = new Date().toISOString();
const T = {
  zap_conversas: [{ id: CONV, telefone: "5500000000010", chave: "00000010", nome_perfil: "Cliente Teste", cliente_id: null,
    atendente_id: null, status: "aberta", nao_lidas: 0, ultima_em: agora, ultimo_texto: "contato" }],
  zap_mensagens: [{ id: "m1", seq: 1, conversa_id: CONV, direcao: "entrada", tipo: "contato",
    texto: "👤 Cliente Teste · 5500000000011\n👤 Sem Numero", status: "entregue", criado_em: agora }],
};
(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const u = decodeURIComponent(rota.request().url()), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (m !== "GET") return rota.fulfill({ status: 204, body: "" });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    let corpo = T[t] || FIX[t] || [];
    const cv = u.match(/conversa_id=eq\.([0-9a-f-]+)/);
    if (cv && t !== "mencoes") corpo = corpo.filter(x => x.conversa_id === cv[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  try {
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
    await p.waitForSelector("#app.logado.celular");
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
    await p.evaluate(() => { zapFiltro = "todas"; irPara("whatsapp"); });
    await p.waitForSelector(".zap-conv");
    await p.tap(".zap-conv");
    await p.waitForSelector("#zb-m1 .zap-ct");
    const txt = await p.$eval("#zb-m1", e => e.textContent);
    conf("o balão mostra o nome e o número do contato", /Cliente Teste/.test(txt) && /00000-0011/.test(txt));
    conf("o contato sem número manda ver no celular", /veja no celular/.test(txt));
    conf("Conversar, Salvar, Copiar e Ligar aparecem", await p.$$eval("#zb-m1 .zap-ct:first-child .zap-ct-bts > *", bs => bs.map(b => b.textContent.trim()).join("|"))
      .then(t => ["Conversar", "Salvar", "Copiar", "Ligar"].every(w => t.includes(w))));
    conf("Ligar disca o número", (await p.$eval('#zb-m1 a[href^="tel:"]', a => a.getAttribute("href"))) === "tel:+5500000000011");
    await p.tap('#zb-m1 button:has-text("Salvar")');
    await p.waitForSelector("#znc-tel", { timeout: 3000 });
    conf("Salvar abre a janela com o número preenchido", /0011/.test(await p.$eval("#znc-tel", e => e.value)) && /Cliente Teste/.test(await p.$eval("#znc-nome", e => e.value)));
    await p.waitForSelector("#znc-conv", { timeout: 3000 }).catch(() => {});
    conf("a janela oferece Conversar e Cliente", !!(await p.$("#znc-conv")) && !!(await p.$("#znc-cli")));
  } catch (e) { conf("FALHA " + e.message.split("\n")[0], false); }
  console.log(erros.length ? "erros de console:\n" + erros.join("\n") : "erros de console: nenhum");
  ok.forEach(([n, v]) => console.log((v ? "✔ " : "✘ ") + n));
  const passou = ok.filter(([, v]) => v).length;
  console.log(`${passou}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(passou === ok.length && !erros.length ? 0 : 1);
})();
