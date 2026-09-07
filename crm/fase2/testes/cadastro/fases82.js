// F82 — o CASO COMPLETO POR FASE do tema v10. O caso da fixtura passou pelo
// INSS (DER) e está no Conselho (RO protocolado): o Caso completo tem de
// sair em duas fases, a atual aberta e a anterior fechada com a contagem;
// abrir a anterior à mão sobrevive à repintura; com o tema desligado a lista
// continua plana, como na 09.75.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

FIX.casos[0] = { ...FIX.casos[0], fase: "conselho", origem_lista: "🖥 Conselho de Recursos",
  der: "2026-02-10", ro_protocolado_em: "2026-06-01", crps_nups: ["35550001112223334"],
  crps: [{ nup: "35550001112223334", status: "Em julgamento",
    eventos: [{ tipo: "andamento", data: "2026-06-20T10:00:00", resumo: "Encaminhado para julgamento na 25ª Junta", bruto: "x" }] }] };
FIX.andamentos = [
  { id: "a0000000-0000-0000-0000-00000000f821", caso_id: CASO1, autor_id: EU, origem: "app",
    criado_em: "2026-02-10T12:00:00Z", andamentos_lidos: [], texto: "Requerimento protocolado no Meu INSS." },
  { id: "a0000000-0000-0000-0000-00000000f822", caso_id: CASO1, autor_id: EU, origem: "pat", origem_id: "c-1",
    criado_em: "2026-04-03T10:30:00Z", andamentos_lidos: [], texto: "INSS · Exigência cadastrada." },
  { id: "a0000000-0000-0000-0000-00000000f823", caso_id: CASO1, autor_id: EU, origem: "app",
    criado_em: "2026-06-01T09:00:00Z", andamentos_lidos: [], texto: "Recurso ordinário protocolado no e-Sisrec." },
  { id: "a0000000-0000-0000-0000-00000000f824", caso_id: CASO1, autor_id: EU, origem: "app",
    criado_em: "2026-07-15T09:00:00Z", andamentos_lidos: [], texto: "Cliente trouxe o relatório do hospital." },
];

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (rota.request().method() !== "GET") return rota.fulfill({ status: 204, body: "" });
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
  const abrir = async (q) => {
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html${q}`);
    await p.waitForSelector("#app.logado");
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
    await p.evaluate(async (a) => { await abrirFicha(a.cli); casoSel = a.id; abaAtiva = 2; subAba = "tudo"; repintarFicha(); }, { cli: CLI_CHEIO, id: CASO1 });
    await p.waitForTimeout(200);
  };
  const ler = () => p.evaluate(() => [...document.querySelectorAll("details.fase-b")].map(d => ({
    nome: d.querySelector(".nm").textContent, per: d.querySelector(".per").textContent, qt: d.querySelector(".qt").textContent,
    aberta: d.open, atual: d.classList.contains("atual"), itens: d.querySelectorAll("li.tl-of").length })));

  await abrir("?tema=v10");
  let fs2 = await ler();
  conf("ligado: o Caso completo sai em DUAS fases", fs2.length === 2);
  conf("a fase atual (Recurso no Conselho) vem primeiro e aberta", fs2[0] && /Fase 2 · Recurso no Conselho/.test(fs2[0].nome) && fs2[0].aberta && fs2[0].atual);
  conf("a fase anterior (Requerimento no INSS) vem fechada", fs2[1] && /Fase 1 · Requerimento no INSS/.test(fs2[1].nome) && !fs2[1].aberta);
  conf("a fase anterior diz o período", fs2[1] && /até 01\.06\.2026/.test(fs2[1].per));
  conf("a contagem bate: 2 registros antes do recurso", fs2[1] && /^2 registros/.test(fs2[1].qt) && fs2[1].itens === 2);
  conf("a atual tem o RO, o e-Sisrec e o relatório", fs2[0] && fs2[0].itens === 3);
  conf("o registro do INSS (sistema) ficou na fase do INSS", await p.evaluate(() => /Exigência cadastrada/.test(document.querySelectorAll("details.fase-b")[1].textContent)));
  // abrir a antiga e repintar: continua aberta
  await p.evaluate(() => { const d = document.querySelectorAll("details.fase-b")[1]; d.open = true; d.dispatchEvent(new Event("toggle")); });
  await p.evaluate(() => repintarFicha()); await p.waitForTimeout(200);
  fs2 = await ler();
  conf("a fase antiga aberta à mão sobrevive à repintura", fs2[1] && fs2[1].aberta);
  conf("os botões do Caso completo continuam (copiar em texto)", await p.evaluate(() => !!document.querySelector('button[onclick^="copiarCasoCompleto"]')));

  await abrir("?tema=");
  const off = await p.evaluate(() => ({ fases: document.querySelectorAll("details.fase-b").length, itens: document.querySelectorAll(".timeline li.tl-of").length }));
  conf("desligado: sem fases, lista plana", off.fases === 0);
  conf("desligado: os 5 registros seguem na lista", off.itens === 5);

  for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
