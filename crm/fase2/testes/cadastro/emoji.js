// Varre as CINCO divisões do Cadastro e conta pictograma na tela.
// O que conta como emoji aqui: os blocos de pictograma do Unicode, os
// dingbats (✔ ✕ ➕), setas decorativas, o sinal de aviso e o mais de largura
// cheia (＋). Ficam de fora: • do menu, •••• da senha mascarada, · e — que
// são pontuação, e os ícones em SVG do CAD_IC, que são desenho, não texto.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CLI_VAZIO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const DIVISOES = ["identificacao", "anotacoes", "documentos", "consulta", "mensagens"];

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
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (rota.request().method() !== "GET") return rota.fulfill({ status: 204, body: "" });
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error" && !/favicon/.test(m.text())) erros.push("console: " + m.text()); });
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");

  let total = 0;
  for (const quem of [["cheio", CLI_CHEIO], ["sem-caso", CLI_VAZIO]]) {
    await p.evaluate(x => abrirFicha(x), quem[1]);
    await p.waitForSelector('button.mt[data-vv="0"]');
    await p.click('button.mt[data-vv="0"]');
    for (const div of DIVISOES) {
      await p.evaluate(d => irSubCad(d), div);
      await p.waitForTimeout(350);
      const r = await p.evaluate(() => {
        const pn = document.querySelector('.painel[data-p="0"].ativo');
        const txt = pn ? pn.innerText : "";
        const RE = /[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2460}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{FF0B}]/gu;
        return { emojis: txt.match(RE) || [], vazio: !txt.trim() };
      });
      total += r.emojis.length;
      console.log(`${quem[0]} · ${div}: ${r.emojis.length ? "EMOJI " + JSON.stringify(r.emojis) : "limpo"}${r.vazio ? " (painel vazio)" : ""}`);
      if (quem[0] === "cheio")
        await (await p.$(".det-rolagem")).screenshot({ path: path.join(__dirname, `emoji-${div}.png`) });
    }
  }
  console.log("erros de console:", erros.length ? erros : "nenhum");
  console.log(total ? `${total} pictograma(s) ainda na aba Cadastro` : "zero pictograma nas cinco divisões");
  await nav.close(); s.close();
  process.exit(total || erros.length ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
