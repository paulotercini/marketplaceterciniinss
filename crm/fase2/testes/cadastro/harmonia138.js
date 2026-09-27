// F138 · Planejado e ficha em harmonia (tema v10): a lista vira um grupo só,
// a data abre a linha, o nome da lista usa letra de texto, o período cabe
// numa linha, e na linha do tempo os dias perdem a zebra e os botões ganham
// uma coluna própria. Datas RELATIVAS, nunca fixas.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const dia = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
FIX.casos[0].prazo = dia(-3);
for (let i = 0; i < 3; i++) {
  const cid = `c2000000-0000-0000-0000-00000000000${i}`;
  FIX.clientes.push({ id: cid, nome: `Cliente Fictício Número ${i} da Silva`, cpf: String(20000000000 + i), dn: "01011960", campos: {} });
  FIX.casos.push({ id: `b2000000-0000-0000-0000-00000000000${i}`, cliente_id: cid, titulo: "Pensão", beneficio: "Pensão por morte",
    especie: "B21", fase: "judicial", origem_lista: "👪 Judicial", prazo: dia(-5 - i), criado_em: "2026-01-01T00:00:00Z" });
}
FIX.andamentos = [1, 2, 3].map(i => ({ id: `a3000000-0000-0000-0000-00000000000${i}`, caso_id: CASO1,
  autor_id: FIX.colaboradores[0].id, origem: "escritorio", texto: `Registro fictício ${i}`, criado_em: dia(-i) + "T15:00:00Z" }));

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const erros = [];
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (rota.request().method() !== "GET") return rota.fulfill({ status: 204, body: "" });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  const p = await ctx.newPage();
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await p.locator('[data-v="planejado"]').first().click(); await p.waitForTimeout(400);

  const plan = await p.evaluate(() => {
    const cs = [...document.querySelectorAll("#conteudo-meio .cartao")];
    const seg = document.querySelector(".seg-per");
    const meta = cs[0] && cs[0].querySelector(".meta");
    const orig = cs[0] && cs[0].querySelector(".orig");
    return { n: cs.length, colados: cs.slice(1).every(c => getComputedStyle(c).marginTop === "-1px"),
      dataPrimeiro: !!(meta && meta.firstElementChild && meta.firstElementChild.classList.contains("chip")),
      origTexto: !!(orig && !/mono/i.test(getComputedStyle(orig).fontFamily) && orig.querySelector("svg")),
      segLinha: !!(seg && new Set([...seg.children].map(b => Math.round(b.getBoundingClientRect().top))).size === 1),
      sub: document.getElementById("conteudo-meio").textContent };
  });
  conf(`a lista é um grupo só, com os cartões colados por um fio (${plan.n})`, plan.n >= 4 && plan.colados);
  conf("a data abre a segunda linha do cartão", plan.dataPrimeiro);
  conf("o nome da lista usa letra de texto e o ícone desenhado", plan.origTexto);
  conf("o período cabe numa linha só", plan.segLinha);
  conf("a contagem diz datas, no plural certo", /\d+ datas neste filtro/.test(plan.sub) && !/data\(s\)/.test(plan.sub));

  await p.evaluate(c => abrirFicha(c), CLI_CHEIO); await p.waitForTimeout(1000);
  const tl = await p.evaluate(() => {
    const bl = [...document.querySelectorAll('.painel[data-p="2"] .timeline li.dia-bloco')];
    const lis = [...document.querySelectorAll('.painel[data-p="2"] .timeline li.tl-of')];
    return { blocos: bl.length, semZebra: bl.every(b => getComputedStyle(b).backgroundColor === "rgba(0, 0, 0, 0)"),
      coluna: lis.length > 0 && lis.every(li => li.lastElementChild && li.lastElementChild.classList.contains("tl-fim")) };
  });
  conf(`os dias do Caso completo não alternam fundo (${tl.blocos} dias)`, tl.blocos >= 2 && tl.semZebra);
  conf("os botões de cada registro ficam numa coluna própria, no fim da linha", tl.coluna);

  console.log("=== F138 · Planejado e ficha em harmonia ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
