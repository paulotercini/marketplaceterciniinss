// Andamentos do processo no mesmo cartão das anotações do escritório, com
// selo da fonte, fundo próprio e sem responder/apagar. Dados fictícios.
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
  const AND = (i, origem, texto, extra) => ({ id: "f0000000-0000-0000-0000-00000000000" + i, caso_id: CASO1, origem, texto,
    criado_em: "2026-10-09T13:00:00Z", autor_id: origem === "app" ? FIX.colaboradores[0].id : null, andamentos_lidos: [], excluir: false, publico: false, ...extra });
  const DADOS = { ...FIX, andamentos: [
    AND(1, "app", "Liguei para a cliente e pedi o laudo médico atualizado."),
    AND(2, "pat", "INSS · Comunicamos que o requerimento foi encaminhado para análise.", { origem_id: "com:1" }),
    AND(3, "pje", "PJe (1º grau): Expedição de Outros documentos. — em 08.10.2026 14:23 — ProceComCiv 5000850-63.2023.4.03.6136", { origem_id: "mov:5000850:2026-10-08T14:23" })], casos: [caso({ processo: "5000850-63.2023.4.03.6136", crps_nups: ["44233139765202537"], processo_link: "https://atendimento.inss.gov.br/tarefas/detalhar_tarefa/1234567890", pje_links: { "1º grau": "https://pje1g.trf3.jus.br/x1", "2º grau": "https://pje2g.trf3.jus.br/x2" }, gratuidade: "negada" })] };
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
  await p.evaluate(([cli, id]) => { abrirFicha(cli); casoSel = id; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); }, [CLI_CHEIO, CASO1]);
  await p.waitForSelector(".linha-caso");
  const tit = () => p.evaluate(() => document.querySelector(".tr-cab h3").textContent);

  const shot = async (aba, nome) => { await p.evaluate(a => { subAba = a; repintarFicha(); }, aba); await p.waitForTimeout(300);
    const el = await p.$('.painel[data-p="2"] .timeline'); if (el) await el.screenshot({ path: require("path").join(__dirname, nome) }); return !!el; };
  await shot("escritorio", "u-escritorio.png");
  await shot("inss", "u-inss.png");
  await shot("cnj", "u-judicial.png");
  await shot("tudo", "u-completo.png");
  const r = await p.evaluate(() => { const ofs = [...document.querySelectorAll('.painel[data-p="2"] li.tl-card.tl-oficial')];
    return { n: ofs.length, resp: ofs.some(l => /Responder|apagar/.test(l.innerHTML)), esc: document.querySelectorAll('.painel[data-p="2"] li.tl-card:not(.tl-oficial)').length,
      fundo: ofs[0] ? getComputedStyle(ofs[0]).backgroundColor : "" }; });
  conf("no Caso completo, os andamentos do INSS e do PJe são cartões oficiais", r.n === 2);
  conf("a anotação do escritório continua cartão do escritório", r.esc >= 1);
  conf("o cartão oficial não tem responder nem apagar", !r.resp);
  conf("o cartão oficial tem fundo próprio", r.fundo === "rgb(246, 247, 244)");

  console.log("=== Andamentos no padrão do escritório ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de página:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
