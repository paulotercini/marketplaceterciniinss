// F831 · atrasados no caso: prescrição quinquenal, alerta de decadência da revisão (12 meses, no caso e no Meu Dia),
// Tema 1124 deslocando o termo inicial para a citação, a calculadora com índices FICTÍCIOS conferidos à mão, a alçada
// do JEF e a estimativa na proposta de honorários. Banco simulado e dados fictícios. Uso: node f831.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";

const PAULO = FIX.colaboradores[0].id;
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "indices_mensais", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: [...FIX.colaboradores], clientes: [], casos: [], atribuicoes: [],
  documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;
const iso = n => new Date(Date.now() - 3 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
const ts = (n, h = "12:00") => `${iso(n)}T${h}:00-03:00`;
let seq = 0;
const id = p => `${p}0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const cA = { id: id("c"), nome: "Cliente Teste", cpf: null, telefone: null, campos: {}, telefones: [], criado_em: ts(-400) };
T.clientes.push(cA);
const hojeSP = iso(0);
const menosMeses = n => { const [y, m] = hojeSP.split("-").map(Number); const d = new Date(Date.UTC(y, m - 1 - n, 15)); return d.toISOString().slice(0, 10); };
const kA = { id: id("b"), cliente_id: cA.id, titulo: cA.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
  marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, dcb_prorrogacao_pedida: false, origem_lista: "⚖️ Judicial",
  criado_em: ts(-300), beneficio: "Revisão", especie: "REV", fase: "judicial", dib: "2015-03-10", ajuizado_em: "2021-06-15",
  primeiro_pagamento_em: menosMeses(114) };   // decai em cerca de 7 meses
T.casos.push(kA); T.atribuicoes.push({ caso_id: kA.id, colaborador_id: PAULO });
// índices fictícios: o teste não depende da tabela real
for (const [serie, comp, valor] of [["inpc", "2021-11", 1], ["selic", "2021-12", 1], ["selic", "2022-01", 1], ["poup_nova", "2021-11", 0.5], ["tr", "2021-11", 0]])
  T.indices_mensais.push({ serie, competencia: comp, valor, fonte: "fictícia", baixado_em: iso(0) });
const ok = [];
const conf = (nome, v, x) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); if (!v && x !== undefined) console.log(JSON.stringify(x)); };
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
    localStorage.setItem("crm_tema", "v10");
    localStorage.setItem("crm_voltar", "1");
    localStorage.setItem("crm_painel_cli", "1");
  }, [SUPA, SESSAO]);
  await instalarBanco(ctx, { SUPA, SESSAO, banco });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const erros = [];
  const p = await ctx.newPage();
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  const pronto = async () => {
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
    await p.waitForTimeout(900);
  };
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await pronto();
  await p.evaluate(() => irPara("meudia")); await p.waitForTimeout(400);

  // ── 1 · prescrição quinquenal ─────────────────────────────────────────────
  const pr = await p.evaluate(() => termoAtrasados({ dib: "2015-03-10", ajuizado_em: "2021-06-15" }));
  conf("prescrição: parcelas antes de 5 anos do ajuizamento ficam fora (15/06/2016)", pr.termo === "2016-06-15" && pr.motivo === "prescrição quinquenal" && pr.prescreve, pr);
  const sem = await p.evaluate(() => termoAtrasados({ dib: "2019-02-01", ajuizado_em: "2021-06-15" }));
  conf("sem prescrição, o termo é a DIB", sem.termo === "2019-02-01" && !sem.prescreve, sem);

  // ── 2 · Tema 1124 desloca o termo inicial para a citação ──────────────────
  const t1124 = await p.evaluate(() => termoAtrasados({ dib: "2015-03-10", ajuizado_em: "2021-06-15", citado_em: "2021-08-01", calculo: { tema1124: { marcado: true, prova: "laudo particular" } } }));
  conf("Tema 1124 marcado: termo inicial na citação", t1124.termo === "2021-08-01" && /1124/.test(t1124.motivo), t1124);
  const t1124s = await p.evaluate(() => termoAtrasados({ dib: "2015-03-10", ajuizado_em: "2021-06-15", calculo: { tema1124: { marcado: true } } }));
  conf("Tema 1124 sem a data da citação pede a citação", t1124s.semCitacao && t1124s.termo === "2016-06-15", t1124s);

  // ── 3 · decadência: alerta só nos últimos 12 meses ────────────────────────
  const dec = await p.evaluate(([a, b]) => [
    !!alertaDecadencia({ especie: "REV", primeiro_pagamento_em: a }),
    !!alertaDecadencia({ especie: "REV", primeiro_pagamento_em: b }),
    !!alertaDecadencia({ especie: "B41", primeiro_pagamento_em: a }),
    decadenciaCaso({ primeiro_pagamento_em: "2016-03-20" }).ate,
    decadenciaCaso({ primeiro_pagamento_em: "2016-03-20", ciencia_indeferimento_em: "2015-05-04" }).ate], [menosMeses(114), menosMeses(100)]);
  conf("decadência a menos de 12 meses alerta", dec[0]);
  conf("decadência a mais de 12 meses não alerta", !dec[1]);
  conf("fora da revisão não há alerta de decadência", !dec[2]);
  conf("10 anos do dia 1º do mês seguinte ao primeiro pagamento", dec[3] === "2026-04-01", dec);
  conf("vale a base mais cedo (ciência do indeferimento definitivo)", dec[4] === "2025-05-04", dec);

  // ── 4 · cálculo pequeno com índices fictícios, conferido à mão ────────────
  // 10/2021: 1000 × INPC 11/2021 (1,01) × juros da poupança 11/2021 (1,005) × Selic 12/2021+01/2022 (1,02) = 1035,35
  // 11/2021: 1000 × 1,02 = 1020,00 · 12/2021: 1000 × 1,01 = 1010,00 · 13º: 1000 × 3/12 = 250 × 1,01 = 252,50 · total 3317,85
  const calc = await p.evaluate(() => { const r = calcAtrasados({ inicio: "2021-10-01", fim: "2021-12-31", dib: "2021-10-01", rmi: 1000, reajustes: {}, piso: false, decimo: true,
    citado: "2021-11-10", calcEm: "2022-02", sm: () => 1100,
    idx: { inpc: { "2021-11": 1 }, selic: { "2021-12": 1, "2022-01": 1 }, poup_nova: { "2021-11": 0.5 }, tr: { "2021-11": 0 } } });
    return { total: r.total, nominal: r.nominal, n: r.linhas.length, at: r.linhas.map(l => l.atualizado), conferir: r.conferir }; });
  conf("cálculo: total 3.317,85 e nominal 3.250,00", calc.total === 3317.85 && calc.nominal === 3250 && calc.n === 4, calc);
  conf("cálculo: cada linha confere", JSON.stringify(calc.at) === JSON.stringify([1035.35, 1020, 1010, 252.5]) && !calc.conferir.length, calc);
  const parc = await p.evaluate(() => calcAtrasados({ inicio: "2021-12-17", fim: "2021-12-31", dib: "2021-12-17", rmi: 1550, reajustes: {}, piso: false, decimo: false,
    citado: null, calcEm: "2022-03", sm: () => 1100, idx: {} }));
  conf("mês parcial pelos dias (15 de 31) e Selic que falta marca conferir", parc.linhas[0].devido === 750 && parc.conferir.some(x => /Selic de 2022-01/.test(x)), parc);
  const jef = await p.evaluate(() => { const c = calcAtrasados({ inicio: "2020-01-01", fim: "2021-06-30", dib: "2020-01-01", rmi: 4000, reajustes: { 2021: 0 }, piso: false, decimo: false,
    calcEm: "2021-07", sm: () => 1100, idx: {} }); return alcadaJef(c, "2021-07-01", () => 1100); });
  conf("alçada: 18 vencidas + 12 vincendas de 4.000 passam de 60 mínimos", jef.causa === 120000 && jef.limite === 66000 && jef.acima, jef);

  // ── 5 · na tela: o alerta no caso e no Meu Dia, a calculadora grava ───────
  await p.evaluate(() => irPara("meudia")); await p.waitForTimeout(500);
  conf("Meu Dia mostra a revisão com decadência em 12 meses", await p.evaluate(() => /Decadência em até 12 meses/.test(document.getElementById("conteudo-meio").textContent)
    && document.getElementById("conteudo-meio").textContent.includes("Cliente Teste")));
  await p.evaluate(id => abrirFicha(id), cA.id); await p.waitForTimeout(900);
  conf("o caso mostra Decadência, Atrasados desde e o botão Atrasados", await p.evaluate(() => !!document.querySelector(".lc-dec") && /Atrasados desde/.test(document.body.textContent)
    && !!document.querySelector(".lc-atr")));
  await p.evaluate(id => abrirAtrasados(id), kA.id); await p.waitForTimeout(700);
  conf("a caixa diz a prescrição e o início dos atrasados", await p.evaluate(() => /Prescritas as parcelas anteriores a\s*15\/06\/2016/.test(document.getElementById("atr-cx").textContent)));
  await p.fill("#atr-rmi", "1.000,00");
  await p.fill('#atr-cx [data-atr="citado_em"]', "2021-08-01");
  await p.check("#atr-1124");
  await p.evaluate(() => calcularAtrasados(document.querySelector("#atr-cx .adr-primario").getAttribute("onclick").match(/'([^']+)'/)[1]));
  await p.waitForTimeout(500);
  conf("marcar o Tema 1124 sem dizer a prova não grava", !T.casos[0].calculo);
  await p.fill("#atr-prova", "laudo particular");
  await p.click("#atr-cx .adr-primario"); await p.waitForTimeout(1200);
  const k = T.casos.find(x => x.id === kA.id), r = (k.calculo || {}).resultado || {};
  conf("Calcular grava a citação, o Tema 1124 e o resultado", k.citado_em === "2021-08-01" && k.calculo.rmi === 1000 && k.calculo.tema1124.prova === "laudo particular"
    && r.termo === "2021-08-01" && r.total > 0 && r.semTema > r.total, k.calculo);
  conf("a caixa mostra a estimativa e o reflexo do Tema 1124", await p.evaluate(() => /Estimativa para conferência/.test(document.getElementById("atr-cx").textContent)
    && /Sem o Tema 1124 seriam/.test(document.getElementById("atr-cx").textContent) && /honorário de êxito/.test(document.getElementById("atr-cx").textContent)));

  // ── 6 · a estimativa alimenta a proposta de honorários ────────────────────
  const prop = await p.evaluate(([cId, kId]) => { window.concessaoDoCaso = () => ({ em: hoje(), rot: "sentença de procedência", via: "rec", reqs: [], carta: null, paga: null, pagaAdm: false, exped: null });
    const pr = propostaHonorarios(D.cliPorId.get(cId), D.casoPorId.get(kId)); const it = pr && pr.itens.find(x => x.ch === "atr");
    return it && { valor: it.valor, nota: it.nota, total: D.casoPorId.get(kId).calculo.resultado.total }; }, [cA.id, kA.id]);
  conf("proposta de honorários: 30% da estimativa, marcada como estimada", prop && Math.abs(prop.valor - Math.round(prop.total * 30) / 100) < 0.01 && /^≈/.test(prop.nota), prop);

  conf("sem erro de página", !erros.length, erros);
  await nav.close(); s.close();
  console.log(`${ok.filter(x => x[1]).length}/${ok.length} passaram`);
  process.exit(ok.every(x => x[1]) ? 0 : 1);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
