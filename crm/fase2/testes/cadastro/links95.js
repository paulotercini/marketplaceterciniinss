// F95 — A NOVIDADE ABRE NO SISTEMA CERTO. O eproc passa a entregar o endereço
// do processo na coleta (o <a> do número da relação, com o hash da sessão) e o
// CRM o guarda como faz com o PJe; o e-SAJ sem link guardado ganha a consulta
// por número, que cai na ficha; e o botão diz "eproc" ou "e-SAJ", não "PJe".
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") return rota.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error" && !/ERR_FAILED/.test(m.text())) erros.push("console: " + m.text()); });
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);

  const EPROC = "https://eproc1g.tjsp.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=x&hash=abc";
  const r = await p.evaluate(([caso, eproc]) => {
    const k = D.casoPorId.get(caso);
    const nov = (id, texto) => ({ id, caso_id: caso, origem: "pje", texto, andamentos_lidos: [] });
    const esaj1 = nov("e1", "e-SAJ TJSP (1º grau): Decorrido prazo — em 12.09.2026 06:01 — CUMPRIMENTO DE SENTENÇA 0002454-08.2025.8.26.0347");
    const esaj2 = nov("e2", "e-SAJ TJSP (2º grau): Conclusos — em 12.09.2026 — APELAÇÃO 0002454-08.2025.8.26.0347");
    const epr = nov("p1", "eproc TJSP (1º grau): Decorrido prazo — em 12.09.2026 06:01 — CUMPRIMENTO DE SENTENÇA 0002454-08.2025.8.26.0347");
    const out = { sem: {} };
    k.pje_links = {}; k.pje_link = null;
    out.sem.esaj1 = linkPjeDoAndamento(esaj1, k);
    out.sem.esaj2 = linkPjeDoAndamento(esaj2, k);
    out.sem.eproc = linkPjeDoAndamento(epr, k);
    k.pje_links = { "1º grau": eproc };
    out.comEproc = linkPjeDoAndamento(epr, k);
    // processo migrado: o link guardado do 1º grau é do eproc, mas o
    // andamento é do e-SAJ — não pode abrir o eproc; vale a consulta por número
    out.esajComLinkEproc = linkPjeDoAndamento(esaj1, k);
    out.nome = [nomeSistemaDoLink(eproc), nomeSistemaDoLink(out.sem.esaj1), nomeSistemaDoLink("https://pje1g.trf3.jus.br/pje/x")];
    D.novid = [epr, esaj1];
    visao = "novidades"; render();
    out.botoes = [...document.querySelectorAll(".nov a.btn-mini")].map(a => a.textContent.trim() + " → " + a.getAttribute("href"));
    out.todos = linksDasNovidades();
    return out;
  }, [CASO1, EPROC]);
  conf("e-SAJ 1º grau sem link guardado: a consulta por número, que cai na ficha (cpopg)",
    /^https:\/\/esaj\.tjsp\.jus\.br\/cpopg\/search\.do\?.*cbPesquisa=NUMPROC.*numeroDigitoAnoUnificado=0002454-08\.2025.*foroNumeroUnificado=0347.*valorConsultaNuUnificado=0002454-08\.2025\.8\.26\.0347/.test(r.sem.esaj1));
  conf("e-SAJ 2º grau vai para o cposg", /^https:\/\/esaj\.tjsp\.jus\.br\/cposg\/search\.do\?.*dePesquisaNuUnificado=0002454-08\.2025\.8\.26\.0347/.test(r.sem.esaj2));
  conf("eproc sem link guardado não inventa endereço (o dele leva hash da sessão)", r.sem.eproc === null);
  conf("eproc com o link da coleta abre esse link", r.comEproc === EPROC);
  conf("processo migrado: andamento do e-SAJ não abre o link do eproc guardado no mesmo grau",
    /^https:\/\/esaj\.tjsp\.jus\.br\/cpopg\//.test(r.esajComLinkEproc));
  conf("o nome do sistema sai do endereço: eproc, e-SAJ, PJe", r.nome.join("|") === "eproc|e-SAJ|PJe");
  conf("nas Novidades os botões dizem o sistema certo",
    r.botoes.some(b => b.startsWith("abrir no eproc · 1º grau ↗ → " + EPROC)) && r.botoes.some(b => /^abrir no e-SAJ · 1º grau ↗ → https:\/\/esaj/.test(b)));
  conf("'abrir todos os links' inclui o eproc e o e-SAJ", r.todos.includes(EPROC) && r.todos.some(u => /esaj\.tjsp\.jus\.br\/cpopg/.test(u)));

  for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
