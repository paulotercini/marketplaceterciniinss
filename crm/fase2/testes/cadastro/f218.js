// F218 · o card da aposentadoria futura: a data provável vem do checklist do
// To Do ou da anotação, a etapa segue o lembrete, a lista lateral lê os cards,
// "Abrir atendimento" liga um pré-caso ao card, "Arquivar" desliga com motivo e
// o que o CRM grava vai só para a coluna crm. Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CLI_VAZIO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const hj = new Date(), iso = d => d.toISOString().slice(0, 10);
const em = n => { const d = new Date(hj); d.setDate(d.getDate() + n); return iso(d); };
const L = (id, cliente_id, extra) => ({ id, cliente_id, tipo: "aposentadoria_futura", titulo: "Apos. por Idade", intervalo_meses: null,
  responsavel_id: null, ativo: true, origem_caso: null, criado_por: null, criado_em: "2026-08-02T00:00:00Z", mudou_em: null, crm: {}, lembrete_avisos: [],
  detalhes: { todo_task_id: "t-" + id, beneficio: "Apos. por Idade", anotacoes: [], checklist: [] }, ...extra });
FIX.lembretes = [
  // 1 · a data está no checklist, com o aniversário antes (que não pode ser lida como data do direito)
  L("l1000000-0000-0000-0000-000000000001", CLI_CHEIO, { proximo_em: em(40), detalhes: { todo_task_id: "t1", beneficio: "Apos. por Idade",
    checklist: [{ texto: "Aniversário 14/03/1962", feito: false }, { texto: "Aposentadoria provável 15/03/2029", feito: false }, { texto: "Pagar GPS trimestral", feito: true }],
    anotacoes: [{ data: "2026-06-10", inicial: "P", texto: "Faltam 8 meses de contribuição." }] } }),
  // 2 · sem checklist: a data sai da anotação mais recente que fala em aposentar
  L("l1000000-0000-0000-0000-000000000002", CLI_VAZIO, { titulo: "Aposentadoria futura", proximo_em: em(-10), detalhes: { todo_task_id: "t2", beneficio: null, checklist: [],
    anotacoes: [{ data: "2024-02-01", inicial: "P", texto: "Só aposenta por idade em 02/2027 se mantiver as contribuições." },
      { data: "2026-05-18", inicial: "P", texto: "Revisto: aposentadoria possível em 10/12/2030 na regra do pedágio." }] } }),
  // 3 · sem data em lugar nenhum, lembrete além de um ano
  L("l1000000-0000-0000-0000-000000000003", CLI_VAZIO, { titulo: "Acerto de CNIS", proximo_em: em(900), detalhes: { todo_task_id: "t3", beneficio: "Acerto de CNIS", checklist: [], anotacoes: [{ data: "2025-01-01", inicial: "A", texto: "Conferir o CNIS em 2027." }] } }),
];
FIX.clientes[1] = { ...FIX.clientes[1], campos: { ...(FIX.clientes[1].campos || {}), triagem: { atendimento: { em: "2026-01-01" } } } };

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
  const patches = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (m === "PATCH") { try { patches.push({ u, corpo: JSON.parse(rota.request().postData() || "{}") }); } catch (e) {} }
    if (m !== "GET") return rota.fulfill(m === "POST" ? { status: 201, contentType: "application/json", body: "[]" } : { status: 204, body: "" });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    let corpo = FIX[t] || [];
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
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0 && (D.lembretes || []).length === 3);
  const texto = sel => p.evaluate(s => [...document.querySelectorAll(s)].map(e => e.textContent.replace(/\s+/g, " ").trim()), sel);

  // ── as leituras puras ──────────────────────────────────────────────────
  const lidas = await p.evaluate(() => (D.lembretes || []).map(l => ({ id: l.id.slice(-1), dd: dataDireitoDoCard(l), et: etapaDoCard(l), h: horizonteDoCard(l) })));
  const l1 = lidas.find(x => x.id === "1"), l2 = lidas.find(x => x.id === "2"), l3 = lidas.find(x => x.id === "3");
  conf("1 a data provável sai do checklist, e o aniversário não é lida como data", l1.dd && l1.dd.data === "2029-03-15" && l1.dd.fonte === "checklist do To Do");
  conf("2 sem checklist, a data vem da anotação mais recente que fala em aposentar", l2.dd && l2.dd.data === "2030-12-10" && /anotação de 18\.05\.2026/.test(l2.dd.fonte));
  conf("3 sem data em lugar nenhum, o card diz que não tem", l3.dd === null);
  conf("4 a etapa: lembrete vencido é pronto para protocolar; o resto, monitorando", l2.et === "pronto" && l1.et === "monitorando" && l3.et === "monitorando");
  conf("5 o horizonte: 40 dias é até 90; vencido; 900 dias é depois", l1.h === "90" && l2.h === "vencido" && l3.h === "depois");

  // ── a lista lateral ────────────────────────────────────────────────────
  const nLateral = await p.evaluate(() => (document.querySelector('[data-v="fase:aposentadoria_futura"] .cont') || {}).textContent || "");
  conf("6 a lista lateral conta os cards, e não os casos da fase", nLateral.trim() === "3");
  await p.evaluate(() => irPara("fase:aposentadoria_futura"));
  await p.waitForSelector(".cartao.card-apos");
  const chips = await texto(".filtros .fchip");
  conf("7 os horizontes com as contagens; o padrão é até 90 dias", chips.join("|") === "Vencidos (1)|Até 90 dias (1)|Até um ano (0)|Depois (1)|Sem data (0)|Todos (3)" && (await p.evaluate(() => document.querySelectorAll(".cartao.card-apos").length)) === 1);
  await p.click(".fchip[data-horiz=todos]");
  await p.waitForFunction(() => document.querySelectorAll(".cartao.card-apos").length === 3);
  const secoes = await texto("h3.secao");
  conf("8 em Todos, os cards agrupados por etapa, com a data provável", /Monitorando \(2\)/.test(secoes[0]) && /Pronto para protocolar \(1\)/.test(secoes[1]) && (await texto(".cartao.card-apos .meta")).some(t => /direito em 15\.03\.2029/.test(t)));
  await p.click(".cartao.card-apos");
  await p.waitForFunction(() => D._ficha && D._ficha.cliId && abaAtiva === 9 && document.querySelector(".card-apos-cab"));
  conf("9 o card abre a ficha na aba Lembretes", true);

  // ── o card na aba Lembretes ────────────────────────────────────────────
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForFunction(cli => D._ficha && D._ficha.cliId === cli, CLI_CHEIO);
  await p.evaluate(() => { abaAtiva = 9; repintarFicha(); });
  await p.waitForSelector(".card-apos-cab");
  const cab = (await texto(".card-apos-cab"))[0];
  conf("10 o cabeçalho do card: etapa, data provável com a fonte e o checklist do To Do", /Monitorando/.test(cab) && /Direito provável em 15\.03\.2029 \(checklist do To Do\)/.test(cab) && /☐ Aposentadoria provável 15\/03\/2029/.test(cab) && /☑ Pagar GPS trimestral/.test(cab));
  await p.screenshot({ path: "/tmp/f218-ficha.png", fullPage: true });
  await p.fill(".card-apos-cab input[type=date]", "2029-06-01");
  await p.waitForFunction(() => /01\.06\.2029 \(informada no CRM\)/.test((document.querySelector(".card-apos-cab") || {}).textContent || ""));
  const pData = patches.find(x => /lembretes\?id=eq\.l1000000-0000-0000-0000-000000000001/.test(x.u) && x.corpo.crm && x.corpo.crm.data_direito);
  conf("11 corrigir a data grava só a coluna crm, com a fonte", pData && pData.corpo.crm.data_direito === "2029-06-01" && pData.corpo.crm.data_fonte === "informada no CRM" && !("detalhes" in pData.corpo));
  await p.click(".card-apos-cab button:has-text('Abrir atendimento')");
  await p.waitForFunction(() => document.getElementById("detalhe").classList.contains("atend-tela") && subCad === "identificacao");
  const lig = await p.evaluate(cli => { const c = D.cliPorId.get(cli), pc = precasosDe(c).find(p => p.lembrete_id); const l = D.lembretes.find(x => x.id.endsWith("1")); return { pc: !!pc, liga: pc && l.crm.precaso_id === pc.id, et: etapaDoCard(l) }; }, CLI_CHEIO);
  conf("12 Abrir atendimento cria o pré-caso ligado ao card, marca a etapa e abre a Identificação em tela cheia", lig.pc && lig.liga && lig.et === "atendimento");
  await p.evaluate(() => { sairModoAtendimento(clienteAberto); abaAtiva = 9; repintarFicha(); });
  await p.waitForSelector(".card-apos-cab");
  conf("13 com o atendimento aberto, o botão vira Continuar o atendimento", (await texto(".card-apos-cab button")).includes("Continuar o atendimento"));
  await p.selectOption(".card-apos-cab .card-arquivar", "Desistiu");
  await p.waitForFunction(() => !document.querySelector(".card-apos-cab"));
  const pArq = patches.find(x => /lembretes\?id=eq\.l1000000-0000-0000-0000-000000000001/.test(x.u) && x.corpo.ativo === false);
  conf("14 Arquivar desliga o card com o motivo na coluna crm", pArq && pArq.corpo.crm.etapa === "arquivado" && pArq.corpo.crm.motivo === "Desistiu" && (await p.evaluate(() => cardsApos().length)) === 2);
  conf("15 sem erro de página", !erros.length);

  await p.evaluate(() => { fecharFicha(false); irPara("fase:aposentadoria_futura"); _cardsFiltro = "todos"; render(); });
  await p.waitForSelector(".cartao.card-apos");
  await p.screenshot({ path: "/tmp/f218-lista.png", fullPage: true });

  for (const [n, v] of ok) console.log(`${v ? "✔" : "✘"} ${n}`);
  if (erros.length) console.log(erros.join("\n"));
  const passou = ok.filter(x => x[1]).length;
  console.log(`erros de console: ${erros.length ? erros.length : "nenhum"}`);
  console.log(`${passou}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(passou === ok.length ? 0 : 1);
})();
