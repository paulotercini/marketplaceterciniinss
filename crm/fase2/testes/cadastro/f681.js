// F681 · O CAMPO DE ESCREVER DO WHATSAPP NO CELULAR (pedido do Paulo, 22.11.2026): dentro do campo ficam apenas emoji e
// anexo; ditar, corrigir, sugerir e aprofundar vão ao +; o campo cresce até duas linhas e rola. Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const CONV = "d3000000-0000-0000-0000-000000000002";
const agora = new Date().toISOString();
const T = { zap_conversas: [{ id: CONV, telefone: "5500000000001", chave: "00000001", nome_perfil: "Cliente Teste",
    atendente_id: null, status: "aberta", nao_lidas: 0, ultima_em: agora, ultimo_texto: "oi" }],
  zap_mensagens: [{ id: "m1", seq: 1, conversa_id: CONV, direcao: "entrada", tipo: "texto", texto: "oi", status: "entregue", criado_em: agora }] };
(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  try {
    for (const cel of [true, false]) {
      const ctx = await nav.newContext(cel ? { viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
      await ctx.addInitScript(([u, ss]) => {
        localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
        localStorage.setItem("crm_sessao", JSON.stringify(ss));
        localStorage.setItem("crm_tema", "v10");
      }, [SUPA, SESSAO]);
      await ctx.route(SUPA + "/**", rota => {
        const u = decodeURIComponent(rota.request().url()), m = rota.request().method();
        if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
        if (m !== "GET") return rota.fulfill({ status: /rpc\/zap_painel/.test(u) ? 200 : 204, contentType: "application/json",
          body: /rpc\/zap_painel/.test(u) ? JSON.stringify({ totais: {}, setores: [], atendentes: [] }) : "" });
        const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
        let corpo = T[t] || FIX[t] || [];
        const cv = u.match(/conversa_id=eq\.([0-9a-f-]+)/);
        if (cv) corpo = corpo.filter(x => x.conversa_id === cv[1]);
        return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
      });
      await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
      const p = await ctx.newPage();
      await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
      await p.waitForSelector("#app.logado");
      await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId);
      await p.evaluate(() => { zapFiltro = "todas"; irPara("whatsapp"); });
      await p.waitForSelector(".zap-conv");
      await p.click(".zap-conv");
      await p.waitForSelector("#zap-txt");
      const icones = await p.$$eval(".ze-caixa .ze-ferr > .zap-icone, .ze-caixa .ze-ferr > details > summary", es =>
        es.filter(e => { const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== "none" && r.width > 0; }).map(e => e.getAttribute("aria-label")));
      if (cel) {
        conf("celular: no campo apenas emoji e anexo", JSON.stringify(icones) === JSON.stringify(["Emojis", "Anexar arquivo"]));
        conf("celular: o placeholder cabe inteiro", await p.$eval("#zap-txt", e => e.clientWidth > 120));
        const menu = await p.$$eval(".ze-mais .zt-menu button", es => es.map(e => e.textContent.trim()));
        conf("celular: o + tem Ditar, Corrigir, Sugerir e Aprofundar", ["Ditar", "Corrigir", "Sugerir", "Aprofundar"].every(n => menu.some(m => m.startsWith(n))));
        await p.fill("#zap-txt", "linha\n".repeat(8)); await p.$eval("#zap-txt", e => e.dispatchEvent(new Event("input")));
        const h = await p.$eval("#zap-txt", e => ({ h: e.getBoundingClientRect().height, o: getComputedStyle(e).overflowY }));
        conf("celular: o campo cresce até duas linhas e rola", h.h > 40 && h.h <= 49 && h.o === "auto");
      } else {
        // F682 · auditoria de 23.11.2026: também no computador o campo fica com emoji e anexo, e o resto vai ao +
        conf("computador: no campo apenas emoji e anexo, e o + à vista", !icones.includes("Ditar a mensagem") && !icones.includes("Corrigir o texto com a IA") && await p.$eval(".ze-mais", e => !!e.offsetParent));
      }
      await ctx.close();
    }
  } catch (e) { conf("FALHA " + e.message.split("\n")[0], false); }
  await nav.close(); s.close();
  for (const [n, v] of ok) console.log((v ? "✔ " : "✘ ") + n);
  const pass = ok.filter(x => x[1]).length; console.log(`${pass}/${ok.length} passaram`);
  process.exit(pass === ok.length ? 0 : 1);
})();
