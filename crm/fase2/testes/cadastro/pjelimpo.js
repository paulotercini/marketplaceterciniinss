// Os movimentos do PJe na aba Judicial: sem "PJe (1º grau):", sem a data
// repetida no texto e sem classe e número do processo. Dados fictícios.
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
  const DADOS = { ...FIX, casos: [caso({ processo: "5000850-63.2023.4.03.6136" })] };
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

  const r = await p.evaluate(() => movPjeLimpo({ texto: "PJe (1º grau): Expedição de Outros documentos. — em 08.10.2026 14:23 — ProceComCiv 5000850-63.2023.4.03.6136", criado_em: "2026-10-10T09:32:00Z" }));
  conf("o texto fica só com o movimento", r.texto === "Expedição de Outros documentos.");
  conf("a data e a hora são as do movimento", r.q === "2026-10-08T14:23");
  conf("o número sai do texto, mas é lembrado", r.numero === "5000850-63.2023.4.03.6136");
  const r2 = await p.evaluate(() => movPjeLimpo({ texto: "PJe (2º grau): Conclusos para decisão — em 01.10.2026 — ApCiv 5000850-63.2023.4.03.6136" }));
  conf("2º grau sem hora", r2.texto === "Conclusos para decisão" && r2.q === "2026-10-01" && r2.grau === "2º grau");
  const html = await p.evaluate(() => caixaPje(D.casoPorId.get(casoSel), [
    { id: "x1", origem: "pje", criado_em: "2026-10-10T09:32:00Z", texto: "PJe (1º grau): Expedição de Outros documentos. — em 08.10.2026 14:23 — ProceComCiv 5000850-63.2023.4.03.6136" },
    { id: "x2", origem: "pje", criado_em: "2026-10-10T09:32:00Z", texto: "PJe (2º grau): Conclusos para decisão — em 01.10.2026 — ApCiv 5000850-63.2023.4.03.6136" }]));
  conf("a tela não repete PJe (1º grau) nem o número", !/1º grau\)|5000850|ProceComCiv/.test(html));
  conf("o 2º grau continua indicado no rótulo", /PJe · 2º grau/.test(html));

  console.log("=== PJe limpo na aba Judicial ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de página:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
