// Acessos do caso (PAT, Meu INSS, e-SISREC, PJe por grau) e a gratuidade
// negada em vermelho na linha do caso. Dados fictícios.
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
  const DADOS = { ...FIX, casos: [caso({ processo: "5000850-63.2023.4.03.6136", crps_nups: ["44233139765202537"], processo_link: "https://atendimento.inss.gov.br/tarefas/detalhar_tarefa/1234567890", pje_links: { "1º grau": "https://pje1g.trf3.jus.br/x1", "2º grau": "https://pje2g.trf3.jus.br/x2" }, gratuidade: "negada" })] };
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
  await p.waitForSelector(".linha-caso");
  const tit = () => p.evaluate(() => document.querySelector(".tr-cab h3").textContent);

  const ac = await p.evaluate(id => { const k = D.casoPorId.get(id); const r = {};
    for (const f of ["inss","conselho","judicial"]) { k.fase = f; const a = acessosDoCaso(k); r[f] = { atual: a.atual.join(""), outros: a.outros.join("") }; }
    k.fase = "judicial"; return r; }, CASO1);
  conf("INSS: o PAT à vista", /detalhar_tarefa\/1234567890/.test(ac.inss.atual) && !/e-SISREC/.test(ac.inss.atual));
  conf("Conselho: o e-SISREC à vista e o PAT no +", /consultaprocessos\.inss\.gov\.br\/e\/p\/44233139765202537/.test(ac.conselho.atual) && /PAT/.test(ac.conselho.outros));
  conf("Judicial: o 2º grau à vista; o 1º grau, o Conselho e o PAT no +", /2º grau/.test(ac.judicial.atual) && !/1º grau/.test(ac.judicial.atual)
    && /1º grau/.test(ac.judicial.outros) && /e-SISREC/.test(ac.judicial.outros) && /PAT/.test(ac.judicial.outros));
  const semPat = await p.evaluate(id => { const k = {...D.casoPorId.get(id), processo_link: null, fase: "inss", protocolos: ["9876543210"]}; return acessosDoCaso(k).atual.join(""); }, CASO1);
  conf("sem tarefa no PAT, o botão é o do Meu INSS com o protocolo", /Meu INSS/.test(semPat) && /9876543210/.test(semPat));
  await p.evaluate(() => repintarFicha());
  conf("a linha do caso mostra o acesso da fase e o Sem gratuidade", await p.evaluate(() =>
    !!document.querySelector(".linha-caso .lc-acessos a") && !!document.querySelector(".linha-caso .lc-sem-grat")));
  await p.evaluate(id => { D.casoPorId.get(id).gratuidade = "concedida"; repintarFicha(); }, CASO1);
  conf("concedida não aparece", await p.evaluate(() => !document.querySelector(".lc-sem-grat")));
  await p.evaluate(id => { lcAbrir(id, 2); }, CASO1);
  conf("gestão do caso oferece a gratuidade no judicial", await p.evaluate(() => /Gratuidade/.test(document.querySelector(".lc-gestao").textContent)));
  await p.click(".lc-gestao button[onclick*=\"'negada'\"]");
  await p.waitForTimeout(300);
  conf("Não concedida grava casos.gratuidade", escritos.some(e => e.t === "casos" && /"gratuidade":"negada"/.test(e.corpo || "")));
  await p.evaluate(id => { D.casoPorId.get(id).gratuidade = "negada"; lcAbrir(id, 0); }, CASO1);
  await (await p.$(".linha-caso")).screenshot({ path: require("path").join(__dirname, "acessos.png") });

  console.log("=== Acessos do caso e gratuidade ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de página:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
