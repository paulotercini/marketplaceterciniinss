// F221 · os clientes de vários casos organizados pelos documentos, o repasse em
// um clique e a linha da incapacidade, com nota de 0 a 100 (exige mais de 95).
// Banco simulado de estado e dados fictícios: os NBs, NUPs e processos têm
// dígito verificador inválido de propósito. Uso: node f221.js [pasta-das-fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f221";
fs.mkdirSync(OUT, { recursive: true });

const PAULO = FIX.colaboradores[0].id;
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: JSON.parse(JSON.stringify(FIX.clientes)), casos: JSON.parse(JSON.stringify(FIX.casos)),
  atribuicoes: FIX.atribuicoes, credenciais: FIX.credenciais, documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;
const iso = n => { const d = new Date(Date.now() + n * 864e5); return d.toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" }); };
const br = s => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;

// ── cliente A: a cadeia do mesmo benefício espalhada por três casos ───────
const A = "c0000000-0000-0000-0000-0000000000a1";
const A1 = "b0000000-0000-0000-0000-0000000000a1", A2 = "b0000000-0000-0000-0000-0000000000a2", A3 = "b0000000-0000-0000-0000-0000000000a3";
const NBX = "6000000001", NBX_F = "600.000.000-1", NUPA = "44233000001202601", PROT = "700000001";
const PROCA = "0001111-22.2026.4.03.6314", PROCA20 = "00011112220264036314";
// ── cliente B: o processo cuja inicial cita dois NBs ──────────────────────
const B = "c0000000-0000-0000-0000-0000000000b1";
const B1 = "b0000000-0000-0000-0000-0000000000b1", B2 = "b0000000-0000-0000-0000-0000000000b2";
const PROCB = "0002222-33.2026.4.03.6314", PROCB20 = "00022223320264036314";
// ── cliente C: três auxílios por incapacidade ─────────────────────────────
const C = "c0000000-0000-0000-0000-0000000000c1";
const C1 = "b0000000-0000-0000-0000-0000000000c1", C2 = "b0000000-0000-0000-0000-0000000000c2", C3 = "b0000000-0000-0000-0000-0000000000c3";
const NUPC = "44233000009202602";
T.clientes.push(
  { id: A, nome: "Ercília Fictícia Tavares", cpf: null, telefone: "(16) 99000-1001", sexo: "F", campos: {}, criado_em: "2024-01-10T12:00:00Z" },
  { id: B, nome: "Gervásio Fictício Paiva", cpf: null, telefone: "(16) 99000-1002", sexo: "M", campos: {}, criado_em: "2024-01-10T12:00:00Z" },
  { id: C, nome: "Herminda Fictícia Prates", cpf: null, telefone: "(16) 99000-1003", sexo: "F", campos: {}, criado_em: "2024-01-10T12:00:00Z" });
const caso = (o) => ({ titulo: "", protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {}, marcadores: [], ...o });
T.casos.push(
  caso({ id: A1, cliente_id: A, titulo: "Ercília Fictícia Tavares", beneficio: "Auxílio-doença", especie: "B31", fase: "inss", origem_lista: "🌻 INSS",
    nb: NBX_F, protocolos: [PROT], der: iso(-200), dcb: iso(-90), criado_em: "2025-01-01T12:00:00Z", todo_task_id: "ta1" }),
  caso({ id: A2, cliente_id: A, titulo: "Ercília Fictícia Tavares", beneficio: "Recurso", fase: "conselho", origem_lista: "🖥 Conselho de Recursos",
    crps_nups: [NUPA], crps: [{ nup: NUPA, status: "Julgado", eventos: [{ data: "10/05/2026", tipo: "doc", resumo: "Documentos juntados",
      bruto: `Histórico de benefícios - SUB - NB:${NBX} Documento juntado pelo INSS` }] }], criado_em: "2025-03-01T12:00:00Z", todo_task_id: "ta2" }),
  caso({ id: A3, cliente_id: A, titulo: "Ercília Fictícia Tavares", beneficio: "Restabelecimento", fase: "judicial", origem_lista: "👪 Judicial",
    processo: PROCA, processos: [{ numero: PROCA, nosso: true }], criado_em: "2025-06-01T12:00:00Z", todo_task_id: "ta3" }),
  caso({ id: B1, cliente_id: B, titulo: "Gervásio Fictício Paiva", beneficio: "Concessão", fase: "judicial", origem_lista: "👪 Judicial",
    processo: PROCB, processos: [{ numero: PROCB, nosso: true }], criado_em: "2025-06-01T12:00:00Z", todo_task_id: "tb1" }),
  caso({ id: B2, cliente_id: B, titulo: "Gervásio Fictício Paiva", beneficio: "Auxílio-doença", especie: "B31", fase: "inss", origem_lista: "🌻 INSS",
    nb: "600.000.000-4", protocolos: ["700000004"], criado_em: "2025-02-01T12:00:00Z", todo_task_id: "tb2" }),
  caso({ id: C1, cliente_id: C, titulo: "Herminda Fictícia Prates", beneficio: "Auxílio-doença", especie: "B31", fase: "inss", origem_lista: "🌻 INSS",
    nb: "600.000.000-5", der: iso(-60), criado_em: "2026-05-01T12:00:00Z", todo_task_id: "tc1" }),
  caso({ id: C2, cliente_id: C, titulo: "Herminda Fictícia Prates", beneficio: "Restabelecimento do auxílio-doença", especie: "B31", fase: "judicial", origem_lista: "👪 Judicial",
    nb: "600.000.000-6", dib: "2024-01-10", dcb: "2024-06-30", processo: "0003333-44.2024.4.03.6314", processos: [{ numero: "0003333-44.2024.4.03.6314", nosso: true }],
    criado_em: "2024-08-01T12:00:00Z", todo_task_id: "tc2" }),
  caso({ id: C3, cliente_id: C, titulo: "Herminda Fictícia Prates", beneficio: "Auxílio-doença", especie: "B31", fase: "inss", origem_lista: "🌻 INSS",
    nb: "600.000.000-7", dib: iso(-200), dcb: iso(10), resultado: "deferido", crps_nups: [NUPC],
    crps: [{ nup: NUPC, status: "Em análise", eventos: [{ data: "01/09/2026", tipo: "doc", resumo: "Documentos", bruto: "Histórico de benefícios - SUB - NB:6000000005 Documento" }] }],
    criado_em: "2025-09-01T12:00:00Z", todo_task_id: "tc3" }));
const AND = { pje: "e0000000-0000-0000-0000-0000000000a1", crps: "e0000000-0000-0000-0000-0000000000a2", pat: "e0000000-0000-0000-0000-0000000000a3",
  nota: "e0000000-0000-0000-0000-0000000000a4", notaC: "e0000000-0000-0000-0000-0000000000c4" };
T.andamentos.push(
  { id: AND.pje, caso_id: A3, origem: "pje", origem_id: `mov:${PROCA20}:1`, texto: `PJe (1º grau): Distribuído — em 01/06/2026 — PJEC ${PROCA}`, criado_em: "2026-06-01T13:00:00Z", autor_id: PAULO },
  { id: AND.crps, caso_id: A2, origem: "crps", origem_id: `${NUPA}|1`, texto: "🖥 CRPS · 10/05/2026 — Documentos juntados", criado_em: "2026-05-10T13:00:00Z", autor_id: PAULO },
  { id: AND.pat, caso_id: A1, origem: "pat", origem_id: `pat:${PROT}:1`, texto: "INSS · Tarefa concluída", criado_em: "2026-03-10T13:00:00Z", autor_id: PAULO },
  { id: AND.nota, caso_id: A1, origem: "app", texto: "Cliente avisada da cessação; vamos ajuizar.", criado_em: "2026-03-12T13:00:00Z", autor_id: PAULO },
  { id: AND.notaC, caso_id: C1, origem: "app", texto: "Cobrar o laudo do ortopedista para o recurso.", criado_em: "2026-09-02T13:00:00Z", autor_id: PAULO });
T.andamento_tarefas.push({ id: "f0000000-0000-0000-0000-0000000000c4", andamento_id: AND.notaC, caso_id: C1, colaborador_id: PAULO, titulo: "Cobrar o laudo", lembrar_em: iso(3), criado_em: "2026-09-02T13:00:00Z" });
const DOC = { esaj: "a0000000-0000-0000-0000-0000000000a1", lista: "a0000000-0000-0000-0000-0000000000a2", pat: "a0000000-0000-0000-0000-0000000000a3",
  iniB: "a0000000-0000-0000-0000-0000000000b1", notaC: "a0000000-0000-0000-0000-0000000000c4" };
T.anexos.push(
  { id: DOC.esaj, cliente_id: A, caso_id: A3, origem: "esaj", nome: "Petição Inicial", caminho: `esaj/${PROCA20}/111`, tipo: "text/plain",
    texto: `Petição inicial. Pede o restabelecimento do benefício NB ${NBX_F}, cessado sem perícia.`, criado_em: "2026-06-01T12:00:00Z" },
  { id: DOC.lista, cliente_id: A, caso_id: A3, origem: "pje", nome: "Laudo Pericial (Quadro Resumo Dossiê Previdenciário)", caminho: `pje/${PROCA20}/222`, tipo: "text/plain",
    texto: "NB 600.000.000-8 NB 600.000.000-8 NB 600.000.000-8 NB 600.000.000-8 NB 600.000.000-8 NB 600.000.000-8 NB 600.000.000-8", criado_em: "2026-07-01T12:00:00Z" },
  { id: DOC.pat, cliente_id: A, caso_id: A1, origem: "pat", nome: "Comunicação de decisão", caminho: `pat/${PROT}/333`, tipo: "text/plain",
    texto: `Comunicação de decisão. Benefício NB ${NBX_F}. Cessação mantida.`, criado_em: "2026-03-10T12:00:00Z" },
  { id: DOC.iniB, cliente_id: B, caso_id: B1, origem: "pje", nome: "Petição inicial", caminho: `pje/${PROCB20}/444`, tipo: "text/plain",
    texto: "Petição inicial. O autor recebeu o NB 600.000.000-3 e depois o NB 600.000.000-4.", criado_em: "2026-06-01T12:00:00Z" },
  { id: DOC.notaC, cliente_id: C, caso_id: C1, andamento_id: AND.notaC, origem: null, nome: "foto do relatório.pdf", caminho: "anexos/x/foto.pdf", tipo: "application/pdf", texto: "", criado_em: "2026-09-02T13:00:00Z" });
T.eventos.push({ id: "d0000000-0000-0000-0000-0000000000c1", caso_id: C1, tipo: "Perícia médica", data_hora: `${iso(-20)}T09:00:00`, status: "agendada", local: "APS fictícia", criado_em: "2026-08-01T12:00:00Z" });

let pontos = 0, total = 0;
const falhas = [];
function conf(peso, nome, ok) {
  total += peso; if (ok) pontos += peso; else falhas.push(`${nome} (${peso})`);
  console.log(`${ok ? "✔" : "✘"} [${peso}] ${nome}`);
}

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  async function entrar(largura = 1440) {
    const ctx = await nav.newContext({ viewport: { width: largura, height: 1000 } });
    await ctx.addInitScript(([u, ss]) => {
      localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
      localStorage.setItem("crm_sessao", JSON.stringify(ss));
      localStorage.setItem("crm_tema", "v10");
    }, [SUPA, SESSAO]);
    await instalarBanco(ctx, { SUPA, SESSAO, banco });
    const p = await ctx.newPage();
    p._erros = [];
    p.on("pageerror", e => p._erros.push(e.message));
    p.on("dialog", d => d.accept());
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
    await p.waitForSelector("#app.logado", { timeout: 15000 });
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
    return p;
  }
  let nf = 0;
  const foto = async (p, nome, cheia = false) => { nf++; await p.screenshot({ path: path.join(OUT, `${String(nf).padStart(2, "0")}-${nome}.png`), fullPage: cheia }); };
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const caseDe = id => T.casos.find(k => k.id === id);
  const p = await entrar();

  // ══ A · O NB DE CADA NÚMERO E O PLANO (30) ═════════════════════════════
  await p.evaluate(id => abrirFicha(id), A);
  await espera(900);
  await p.evaluate(() => fecharEscolha && document.getElementById("modal").style.display !== "none" ? (document.getElementById("modal").style.display = "none") : 0);
  const ev = await p.evaluate(([a3, a2, a1, proc, nup, prot]) => {
    const ks = casosParaOrganizar(clienteAberto), e = evidenciaNbs(ks);
    const r = (t, d) => nbDoNumero(e, t, d) || {};
    return { proc: r("proc", proc), nup: r("nup", nup), prot: r("prot", prot), lista: ((e.get("proc:" + proc) || new Map()).has("6000000008")) };
  }, [A3, A2, A1, PROCA20, NUPA, PROT]);
  conf(5, "A1 a petição inicial do e-SAJ, sem andamento, dá ao processo o NB pelo caminho do arquivo", ev.proc.nb === NBX && ev.proc.conf === "alta");
  conf(4, "A2 o laudo com o dossiê previdenciário, que lista todos os NBs, não conta", !ev.lista);
  conf(5, "A3 o histórico do benefício juntado no e-Recursos dá ao recurso o NB dele", ev.nup.nb === NBX && ev.nup.conf === "alta");
  const plA = await p.evaluate(() => planoOrganizar(clienteAberto).passos.map(x => ({ acao: x.acao, tipo: x.tipo, d: x.d, de: x.de, para: x.para })));
  const levaNb = plA.find(x => x.acao === "mover" && x.tipo === "nb");
  conf(6, "A4 o plano leva NB, protocolo e recurso ao caso judicial e junta os casos do INSS e do Conselho a ele",
    !!levaNb && levaNb.de === A1 && levaNb.para === A3 && plA.some(x => x.tipo === "prot" && x.para === A3) && plA.some(x => x.tipo === "nup" && x.de === A2 && x.para === A3)
    && plA.filter(x => x.acao === "juntar" && x.para === A3).map(x => x.de).sort().join() === [A1, A2].sort().join() && plA[plA.length - 1].acao === "juntar");
  // a dúvida do cliente B: a inicial cita dois NBs com o mesmo peso
  await p.evaluate(id => abrirFicha(id), B);
  await espera(800);
  await p.evaluate(() => { document.getElementById("modal").style.display = "none"; });
  const duvB = await p.evaluate(() => { const pl = planoOrganizar(clienteAberto); return { passos: pl.passos.length, duv: pl.duvidas.map(x => ({ tipo: x.tipo, nbs: x.ranking.map(r => r.nb) })) }; });
  conf(5, "A5 a inicial que cita dois NBs sem folga vira dúvida com os dois NBs, e não passo automático",
    duvB.passos === 0 && duvB.duv.length === 1 && duvB.duv[0].tipo === "proc" && duvB.duv[0].nbs.sort().join() === "6000000003,6000000004");
  await p.evaluate(id => organizarCasos(id), B);
  await espera(300);
  const orgB = await p.evaluate(() => ({ duv: document.querySelectorAll(".org-duv .org-s").length, bts: [...document.querySelectorAll(".org-duv .adr-bt")].map(b => b.textContent.replace(/\s+/g, " ").trim()) }));
  conf(5, "A6 a janela de organizar mostra a dúvida com um botão por NB", orgB.duv === 1 && orgB.bts.some(t => /é do NB 600\.000\.000-3/.test(t)) && orgB.bts.some(t => /é do NB 600\.000\.000-4/.test(t)));
  await p.evaluate(() => fecharCaixa());

  // ══ B · EM LOTE, COM DESFAZER (24) ═════════════════════════════════════
  await p.evaluate(() => { visao = "acervo"; render(); });
  await espera(400);
  const temBotao = await p.evaluate(() => /Organizar todos pelos documentos/.test((document.getElementById("acervo-varios") || {}).textContent || ""));
  await p.evaluate(() => organizarTodos());
  await p.waitForFunction(() => !!document.querySelector("#org-lote-ok") || /sem pista|dúvidas/.test((document.getElementById("org-lote-st") || {}).textContent || ""), null, { timeout: 30000 });
  const lote = await p.evaluate(() => ({ st: document.getElementById("org-lote-st").textContent,
    prontos: [...document.querySelectorAll(".org-lote-lista .org-lote-ck")].map(x => x.closest("li").querySelector("b").textContent),
    duv: [...document.querySelectorAll(".org-sug .org-lote-lista li b")].map(x => x.textContent) }));
  await foto(p, "lote-resumo", true);
  // só o cliente A fica marcado
  await p.evaluate(() => document.querySelectorAll(".org-lote-ck").forEach(x => { x.checked = /Ercília/.test(x.closest("li").textContent); }));
  await p.evaluate(() => aplicarLoteOrg());
  await p.waitForFunction(() => /passos aplicados/.test((document.getElementById("org-lote-st") || {}).textContent || ""), null, { timeout: 30000 });
  await espera(400);
  const a1 = caseDe(A1), a2 = caseDe(A2), a3 = caseDe(A3), cliA = T.clientes.find(c => c.id === A);
  const andA = id => (T.andamentos.find(x => x.id === id) || {}).caso_id;
  const okLote = temBotao && lote.prontos.some(t => /Ercília/.test(t)) && lote.prontos.some(t => /Herminda/.test(t)) && lote.duv.some(t => /Gervásio/.test(t))
    && (a3.nb || "").replace(/\D/g, "") === NBX && (a3.protocolos || []).includes(PROT) && (a3.crps_nups || []).includes(NUPA)
    && a1.fase === "encerrado" && !!(a1.arquivados || {}).fundido && a2.fase === "encerrado" && !!(a2.arquivados || {}).fundido
    && !!(a1.arquivados || {})[`mov:nb:${NBX}`] && !!(a2.arquivados || {})[`mov:nup:${NUPA}`]
    && andA(AND.pat) === A3 && andA(AND.crps) === A3 && andA(AND.nota) === A3
    && T.anexos.find(x => x.id === DOC.pat).caso_id === A3 && caseDe(C3).crps_nups.includes(NUPC)
    && ((cliA.campos || {}).org_auto || []).length === 1;
  conf(8, "B1 em lote: o resumo separa os prontos e os com dúvida, e só o cliente marcado é organizado, com números, andamentos, documentos e cascas no lugar", okLote);
  if (!okLote) console.log("   lote:", JSON.stringify({ temBotao, lote, a3: { nb: a3.nb, prot: a3.protocolos, nups: a3.crps_nups }, a1: { fase: a1.fase, arq: a1.arquivados }, a2: { fase: a2.fase }, pat: andA(AND.pat), crps: andA(AND.crps), nota: andA(AND.nota) }));
  await p.evaluate(() => fecharCaixa());
  // desfazer
  await p.evaluate(id => desfazerOrganizacao(id), A);
  await p.waitForFunction(() => /Organização desfeita/.test(document.getElementById("aviso").textContent || ""), null, { timeout: 30000 }).catch(() => {});
  await espera(600);
  const b1 = caseDe(A1), b2 = caseDe(A2), b3 = caseDe(A3);
  const okDesfaz = b1.fase === "inss" && !(b1.arquivados || {}).fundido && b2.fase === "conselho" && (b1.nb || "").replace(/\D/g, "") === NBX
    && (b1.protocolos || []).includes(PROT) && (b2.crps_nups || []).includes(NUPA) && !(b3.crps_nups || []).includes(NUPA) && !(b3.nb)
    && !b3.especie && !b3.dcb && !b3.der
    && andA(AND.pat) === A1 && andA(AND.crps) === A2 && andA(AND.nota) === A1 && T.anexos.find(x => x.id === DOC.pat).caso_id === A1
    && ((T.clientes.find(c => c.id === A).campos || {}).org_auto || []).length === 0;
  conf(8, "B2 desfazer devolve números, andamentos e documentos aos casos de origem e reabre as cascas na fase em que estavam", okDesfaz);
  if (!okDesfaz) console.log("   desfazer:", JSON.stringify({ b1: { fase: b1.fase, nb: b1.nb, prot: b1.protocolos, arq: b1.arquivados }, b2: { fase: b2.fase, nups: b2.crps_nups }, b3: { nb: b3.nb, nups: b3.crps_nups, esp: b3.especie, dcb: b3.dcb, der: b3.der }, pat: andA(AND.pat), crps: andA(AND.crps), nota: andA(AND.nota) }));
  // aplicar pela janela do cliente
  await p.evaluate(id => abrirOrganizar(id), A);
  await espera(900);
  const temPlano = await p.evaluate(() => ({ li: document.querySelectorAll(".org-plano li").length, bt: !!document.querySelector(".org-plano .adr-primario") }));
  await foto(p, "organizar-plano", true);
  await p.evaluate(() => document.querySelector(".org-plano .adr-primario").click());
  await p.waitForFunction(() => /passo\(s\) aplicados/.test(document.getElementById("aviso").textContent || ""), null, { timeout: 30000 }).catch(() => {});
  await espera(600);
  conf(8, "B3 a janela de organizar do cliente mostra o plano e o aplica num clique",
    temPlano.li >= 5 && temPlano.bt && (caseDe(A3).nb || "").replace(/\D/g, "") === NBX && caseDe(A1).fase === "encerrado" && caseDe(A2).fase === "encerrado"
    && /Desfazer/.test(await p.evaluate(() => (document.querySelector(".org-log") || {}).textContent || "")));
  await p.evaluate(() => fecharCaixa());

  // ══ C · O REPASSE EM UM CLIQUE (16) ════════════════════════════════════
  // o processo do cliente B: a dúvida resolvida leva o processo ao caso do NB escolhido
  await p.evaluate(id => abrirOrganizar(id), B);
  await p.waitForSelector(".org-duv .adr-bt", { timeout: 15000 });
  await p.evaluate(() => [...document.querySelectorAll(".org-duv .adr-bt")].find(b => /600\.000\.000-4/.test(b.textContent)).click());
  await espera(1200);
  conf(5, "C1 \"é do NB\" leva o processo ao caso que tem o NB, com os documentos dele",
    (caseDe(B2).processos || []).some(x => x.numero.replace(/\D/g, "") === PROCB20) && !(caseDe(B1).processos || []).length && T.anexos.find(x => x.id === DOC.iniB).caso_id === B2);
  await p.evaluate(() => fecharCaixa());
  // o recurso do cliente C está no caso errado: a aba Recurso diz o NB e oferece levar
  await p.evaluate(([cli, k]) => { casoSel = k; return abrirFicha(cli).then(() => { document.getElementById("modal").style.display = "none"; casoSel = k; abaAtiva = 2; subAba = "crps"; repintarFicha(); }); }, [C, C3]);
  await espera(800);
  const crpsC = await p.evaluate(() => ({ chip: [...document.querySelectorAll(".nb-num")].map(x => x.textContent), sel: !!document.querySelector(".sel-levar"),
    fora: [...document.querySelectorAll(".num-fora")].map(x => x.textContent.replace(/\s+/g, " ")),
    bt: [...document.querySelectorAll("button.btn-mini")].some(b => /levar ao caso do NB/.test(b.textContent)) }));
  await foto(p, "recurso-nb-de-outro-caso");
  await p.evaluate(nup => { const sel = [...document.querySelectorAll(".sel-levar")].find(x => x.getAttribute("aria-label").includes("Recurso")); sel.value = sel.options[1].value; sel.dispatchEvent(new Event("change")); }, NUPC);
  await espera(1500);
  conf(6, "C2 a aba Recurso avisa no topo que o recurso trata do NB de outro caso, mostra o NB no número e o seletor leva o recurso ao caso certo",
    crpsC.fora.length === 1 && /Recurso CRPS 44233\.000009\/2026-02 trata do NB 600\.000\.000-5, que está no caso INSS/.test(crpsC.fora[0]) && /Levar ao caso do NB/.test(crpsC.fora[0])
    && crpsC.chip.some(t => /600\.000\.000-5 · de outro caso/.test(t)) && crpsC.sel && crpsC.bt && (caseDe(C1).crps_nups || []).includes(NUPC) && !(caseDe(C3).crps_nups || []).includes(NUPC));
  // a anotação da equipe vai a outro caso pelo ⋯
  await p.evaluate(([cli, k]) => abrirFicha(cli).then(() => { document.getElementById("modal").style.display = "none"; casoSel = k; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); }), [C, C1]);
  await espera(700);
  const temItem = await p.evaluate(id => [...document.querySelectorAll(".tl-mais-it")].some(b => /Levar a outro caso/.test(b.textContent) && b.getAttribute("onclick").includes(id)), AND.notaC);
  await p.evaluate(id => moverAndamento(id), AND.notaC);
  await espera(300);
  const opcoes = await p.evaluate(() => [...document.querySelectorAll("#modal .esp-it")].map(b => b.textContent));
  await p.evaluate(() => [...document.querySelectorAll("#modal .esp-it")].find(b => /Judicial/.test(b.textContent)).click());
  await espera(1200);
  conf(5, "C3 o ⋯ da anotação leva-a a outro caso com a tarefa e o documento, e o caso de origem registra para onde foi",
    temItem && opcoes.length === 2 && andA(AND.notaC) === C2 && T.andamento_tarefas.find(x => x.andamento_id === AND.notaC).caso_id === C2
    && T.anexos.find(x => x.id === DOC.notaC).caso_id === C2 && T.andamentos.some(x => x.caso_id === C1 && /foi levada ao caso/.test(x.texto || "")));

  // ══ D · A LINHA DA INCAPACIDADE E O PRAZO DO INSS (20) ═════════════════
  await p.evaluate(([cli, k]) => abrirFicha(cli).then(() => { document.getElementById("modal").style.display = "none"; casoSel = k; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); }), [C, C1]);
  await espera(700);
  await p.evaluate(() => { const d = document.querySelector("details.incap"); if (d && !d.open) d.querySelector("summary").click(); });
  await espera(300);
  const li = await p.evaluate(() => ({ res: (document.querySelector(".incap-res") || {}).textContent || "",
    itens: [...document.querySelectorAll(".incap-it")].map(x => x.textContent.replace(/\s+/g, " ").trim()) }));
  await foto(p, "linha-incapacidade", true);
  conf(6, "D1 a linha mostra um item por NB, em ordem de data, com período, situação, caso e números",
    li.itens.length === 3 && /600\.000\.000-6/.test(li.itens[0]) && /30\/06\/2024\s*cessado/.test(li.itens[0]) && /Judicial/.test(li.itens[0])
    && /600\.000\.000-7/.test(li.itens[1]) && /ativo/.test(li.itens[1]) && /600\.000\.000-5/.test(li.itens[2]) && /Recurso CRPS 44233\.000009\/2026-02/.test(li.itens[2]));
  // a DCB vencida: no pedido ao INSS é aviso; na ação judicial é o motivo do caso e não gera passo
  const passos = await p.evaluate(dcb => ({ a1: proximosDoCaso({ id: "x-dcb1", cliente_id: "x", fase: "inss", especie: "B31", dcb }).map(x => x.txt + (x.alerta ? " !" : "")),
    c2: proximosDoCaso({ id: "x-dcb2", cliente_id: "x", fase: "judicial", especie: "B31", dcb }).map(x => x.txt) }), iso(-90));
  // com a janela aberta (DCB em 10 dias), o quadro de prazos não dá o pedido por vencido: a DCB diz até quando pedir
  const quadro = await p.evaluate(k => linhasDeDatas(D.casoPorId.get(k).cliente_id).soltas.filter(x => x.casoId === k).map(x => (x.rotulo || "") + "|" + (x.rot || "").replace(/<[^>]+>/g, "")), C3);
  conf(4, "D2 o próximo passo do benefício que vai cessar é pedir a prorrogação até a DCB e o resumo o anuncia; a DCB vencida avisa no INSS e some na ação",
    /Pedir a prorrogação até/.test(li.itens[1]) && new RegExp(`próximo: Pedir a prorrogação até ${br(iso(10))}`).test(li.res) && /3 benefícios/.test(li.res)
    && !/Pedir a prorrogação/.test(li.itens[0]) && passos.a1.some(t => /passou sem pedido de prorrogação registrado !/.test(t)) && !passos.c2.some(t => /prorroga/i.test(t))
    && !quadro.some(t => /^Pedir a prorrogação\|/.test(t)) && quadro.some(t => /^DCB, o benefício cessa\|.*peça a prorrogação até este dia/.test(t)));
  if (!/próximo: Pedir/.test(li.res) || process.env.VER) console.log("   linha:", JSON.stringify({ li, passos }));
  const mora = await p.evaluate(([k, der, per]) => {
    const kk = D.casoPorId.get(k), sem = (() => { const ev = D.eventos; D.eventos = []; const r = prazoMora(kk); D.eventos = ev; return r; })();
    return { com: prazoMora(kk), sem };
  }, [C1]);
  conf(5, "D3 o auxílio por incapacidade tem 45 dias contados da perícia feita, e sem perícia o prazo não corre",
    !!mora.com && mora.com.dias === 45 && mora.com.desde === iso(-20) && mora.com.data === iso(25) && mora.com.pericia && mora.sem === null);
  const susp = await p.evaluate(() => {
    const guarda = D._andsFicha, out = {};
    const k = { id: "x-susp", fase: "inss", especie: "B41", der: "2026-06-01" };
    D._andsFicha = [{ id: "s1", caso_id: "x-susp", criado_em: "2026-07-01T12:00:00Z", texto: "[EXIGÊNCIA] O que o INSS exigiu: CTPS\nPrazo para cumprir: 31/07/2026\nDocumento que falta: CTPS\nQuem vai cumprir: —" },
      { id: "s2", caso_id: "x-susp", criado_em: "2026-07-20T12:00:00Z", texto: "[PETIÇÃO] Cumprimento de exigência — INSS, protocolada em 20/07/2026." }];
    out.curta = prazoMora(k);
    const k2 = { id: "x-susp2", fase: "inss", especie: "B41", der: "2026-01-01" };
    D._andsFicha = [{ id: "s3", caso_id: "x-susp2", criado_em: "2026-03-22T12:00:00Z", texto: "⚠ Exigência do INSS: CTPS. Prazo final para cumprimento: 21.04.2026." },
      { id: "s4", caso_id: "x-susp2", criado_em: "2026-04-10T12:00:00Z", texto: "Exigência cumprida e protocolada no INSS." }];
    out.minimo = prazoMora(k2);
    D._andsFicha = guarda;
    return { curta: out.curta && out.curta.data, minimo: out.minimo && out.minimo.data, susp: out.curta && out.curta.suspenso };
  });
  conf(5, "D4 a exigência suspende a contagem, que recomeça na entrega com o restante, e nunca com menos de 30 dias",
    susp.curta === "2026-09-18" && susp.minimo === "2026-05-10" && susp.susp === true);

  // ══ E · DESENHO E ERROS (10) ═══════════════════════════════════════════
  const cel = await entrar(390);
  await cel.evaluate(([cli, k]) => abrirFicha(cli).then(() => { document.getElementById("modal").style.display = "none"; casoSel = k; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); }), [C, C1]);
  await espera(800);
  await cel.evaluate(() => { const d = document.querySelector("details.incap"); if (d && !d.open) d.querySelector("summary").click(); });
  await espera(300);
  const largo = await cel.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2 || [...document.querySelectorAll(".incap *")].some(e => e.getBoundingClientRect().right > window.innerWidth + 2));
  const alvo = await cel.evaluate(() => { const s = document.querySelector(".incap>summary"); return s ? s.getBoundingClientRect().height : 0; });
  await foto(cel, "linha-incapacidade-celular", true);
  conf(3, "E1 a linha cabe no celular, sem rolagem lateral, e o resumo é um alvo de toque de 44 px", !largo && alvo >= 44);
  const css = fs.readFileSync(path.join(__dirname, "app.html"), "utf8");
  const a11y = await p.evaluate(() => [...document.querySelectorAll(".sel-levar")].every(x => (x.getAttribute("aria-label") || "").length > 10));
  conf(3, "E2 os seletores de levar têm rótulo e a seta da linha respeita o movimento reduzido",
    a11y && /prefers-reduced-motion:reduce\)\{\.incap>summary::before\{transition:none\}\}/.test(css));
  conf(4, "E3 sem erro de página", !p._erros.length && !cel._erros.length);
  if (p._erros.length || cel._erros.length) console.log(p._erros.concat(cel._erros).join("\n"));

  console.log(`\nNOTA F221: ${pontos}/${total}${falhas.length ? `\nfaltou: ${falhas.join("; ")}` : ""}`);
  await nav.close(); s.close();
  process.exit(pontos > 95 && total === 100 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
