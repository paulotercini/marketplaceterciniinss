// A aba Honorários do cliente, enxuta. Dados fictícios.
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
  const PG = (i, st, v, d, desc) => ({ id: "e0000000-0000-0000-0000-00000000000" + i, cliente_id: CLI_CHEIO, caso_id: CASO1, status: st, valor: v, vencimento: d, pago_em: st === "aberto" ? null : d, descricao: desc, conferencias: [] });
  const DADOS = { ...FIX, pagamentos: [PG(1,"pago",1500,"2026-08-10","1ª parcela"), PG(2,"pago",1500,"2026-09-10","2ª parcela"), PG(3,"aberto",1500,"2026-11-10","3ª parcela"), PG(4,"aberto",4200,"2026-12-15","RPV")], casos: [caso({ processo: "5000850-63.2023.4.03.6136", crps_nups: ["44233139765202537"], processo_link: "https://atendimento.inss.gov.br/tarefas/detalhar_tarefa/1234567890", pje_links: { "1º grau": "https://pje1g.trf3.jus.br/x1", "2º grau": "https://pje2g.trf3.jus.br/x2" }, gratuidade: "negada" })] };
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
  await p.evaluate(([cli, id]) => { abrirFicha(cli); casoSel = id; abaAtiva = 4; repintarFicha(); }, [CLI_CHEIO, CASO1]);
  await p.waitForSelector(".hon");
  const tit = () => p.evaluate(() => document.querySelector(".tr-cab h3").textContent);

  await p.screenshot({ path: require("path").join(__dirname, "honorarios.png"), fullPage: true });
  conf("a aba abre", true);
  console.log("=== Honorários ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de página:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
