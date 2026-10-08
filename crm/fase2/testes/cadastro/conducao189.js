// F189 — o rito pelos dados (casos.conducao, gravado pelo crm/conducao.py).
// A escolha manual prevalece; sem ela vale o rito dos dados; com confiança
// baixa a trilha mostra "provável" e confirma em um clique; lista sem
// processo previdenciário não recebe trilha. Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const caso = extra => ({ ...FIX.casos[0], fase: "judicial", especie: "B42", processo: "0000003-33.2023.8.26.0999", etapa: null, ...extra });

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
  const escritos = [];
  const DADOS = { ...FIX, casos: [caso({ conducao: { v: 1, ritos: { judicial: { r: "delegada", c: "baixa", por: "TJSP (8.26) e benefício comum" } } } })] };
  await ctx.route(SUPA + "/**", rota => {
    const q = rota.request(), u = q.url(), m = q.method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") { escritos.push({ t, m, corpo: q.postData() }); return rota.fulfill({ status: 204, body: "" }); }
    let corpo = DADOS[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await p.evaluate(([cli, id]) => { abrirFicha(cli); casoSel = id; abaAtiva = 2; subAba = "escritorio"; }, [CLI_CHEIO, CASO1]);
  await p.waitForSelector(".tr-faixa .tr-l");
  const tit = () => p.evaluate(() => document.querySelector(".tr-cab h3").textContent);

  // 1) sem escolha manual, vale o rito dos dados, com "provável" e o motivo
  conf("o rito dos dados vence o padrão da espécie (TJSP + B42 = competência delegada)", (await tit()) === "Competência delegada · TJSP");
  conf("confiança baixa mostra 'provável' com o botão confirmar", await p.evaluate(() => !!document.querySelector(".tr-prov button")));
  conf("o seletor diz de onde veio o rito", /pelos dados: TJSP/.test(await p.evaluate(() => document.querySelector(".tr-ritos").title)));

  // 2) confirmar grava a escolha manual (casos.trilha) e some o "provável"
  await p.click(".tr-prov button");
  await p.waitForTimeout(400);
  const gravou = escritos.find(e => e.t === "casos" && e.m === "PATCH" && /"delegada"/.test(e.corpo || ""));
  conf("confirmar grava o rito em casos.trilha", gravou && /"trilha"/.test(gravou.corpo));
  await p.evaluate(() => repintarFicha());
  conf("depois de confirmado, o 'provável' sai", await p.evaluate(() => !document.querySelector(".tr-prov")));

  // 3) a escolha manual prevalece sobre os dados
  await p.evaluate(id => { const k = D.casoPorId.get(id); k.trilha = { ritos: { judicial: "acid" } };
    k.conducao = { v: 1, ritos: { judicial: { r: "delegada", c: "alta", por: "x" } } }; repintarFicha(); }, CASO1);
  conf("a escolha da equipe vence o rito dos dados", (await tit()) === "Acidentário · TJSP");

  // 4) lista sem processo previdenciário não recebe trilha
  conf("caso de lista pessoal sem processo nem benefício fica sem trilha", await p.evaluate(() =>
    faseDaTrilha({ fase: "outro", protocolos: [], origem_lista: "Tarefas" }) === null
    && faseDaTrilha({ fase: "pagamento", processo: null }) === null
    && faseDaTrilha({ fase: "pagamento", processo: "0000001-11.2025.4.03.6314" }) === "judicial"));

  console.log("=== F189 · rito pelos dados ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de página:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
