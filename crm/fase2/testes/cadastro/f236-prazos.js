// F236 · frente prazos: alarmes falsos e prazos escondidos nos casos ativos. O prazo de análise para quando o pedido
// foi decidido e só corre da perícia FEITA; o recurso não se arma para o recurso ganho nem para a alçada da Junta; o
// cartão do movimento usa o prazo do tribunal, cala na sentença procedente, nos conclusos e na peça já protocolada;
// a DCB fixada na decisão vira a DCB do caso; a tutela e a liminar viram datas; o visual clássico mostra as mesmas
// datas do v10; o caso no 🗓 Tarefas com Prazo continua sendo o que é (faseEfetiva) e o ✔ feito o devolve.
// Banco simulado e dados fictícios. Uso: node f236-prazos.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";

const PAULO = FIX.colaboradores[0].id, MARCOS = "22222222-2222-2222-2222-222222222222";
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: [...FIX.colaboradores, { id: MARCOS, auth_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", nome: "Marcos Fictício", inicial: "M",
    cor: "#8a4b00", papel: "colaborador", ativo: true, cargo: "advogado" }],
  clientes: [], casos: [], atribuicoes: [], documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;

// datas relativas no fuso do app (São Paulo)
const iso = n => new Date(Date.now() - 3 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
const br = n => { const s = iso(n); return `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`; };
const pt = n => br(n).replace(/\//g, ".");
const ts = (n, h = "12:00") => `${iso(n)}T${h}:00-03:00`;
let seq = 0;
const id = p => `${p}0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const cli = nome => { const c = { id: id("c"), nome, cpf: null, telefone: null, campos: {}, telefones: [], criado_em: ts(-400) }; T.clientes.push(c); return c; };
const caso = (c, o) => { const k = { id: id("b"), cliente_id: c.id, titulo: c.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
  marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, dcb_prorrogacao_pedida: false, origem_lista: "🌻 INSS",
  criado_em: ts(-300), ...o }; T.casos.push(k); T.atribuicoes.push({ caso_id: k.id, colaborador_id: PAULO }); return k; };
const and = (k, n, texto, o = {}) => { const a = { id: id("e"), caso_id: k.id, autor_id: PAULO, texto, origem: "app", origem_id: null, criado_em: ts(n, o.hora || "12:00"),
  publico: false, excluir: false, importante: false, urgente: false, responde_a: null, ...o }; delete a.hora; T.andamentos.push(a); return a; };
const situacao = (k, n, nova, proto = "1700000001") => and(k, n, `INSS: … → ${nova}`, { origem: "pat", origem_id: `situacao:${proto}:${nova}` });
const evento = (k, n, tipo, status) => T.eventos.push({ id: id("d"), caso_id: k.id, tipo, status, data_hora: `${iso(n)}T09:00:00`, local: "APS fictícia", criado_em: ts(n - 20) });
const doc = (k, a, nome, texto, ato) => { const x = { id: id("a"), caso_id: k.id, cliente_id: k.cliente_id, autor_id: PAULO, origem: "pje", nome,
  caminho: `pje/${String(k.processo || "").replace(/\D/g, "")}/${ato || seq}`, tipo: "text/plain", texto, andamento_id: a ? a.id : null, criado_em: a ? a.criado_em : ts(-1) };
  T.anexos.push(x); return x; };
const JEF = "5002781-11.2026.4.03.6302", MS = "5004890-88.2026.4.03.6102", TJ = "1004127-14.2025.8.26.0381";

// A · BPC deferido no PAT, DIB gravada: sem prazo de análise, com o 1º pagamento em 45 dias da concessão
const cA = cli("Aurora Fictícia Concedida");
const kA = caso(cA, { beneficio: "BPC/LOAS — deficiência", especie: "B87", fase: "inss", der: iso(-120), dib: iso(-120), situacao_inss: "Concluída - Deferida", protocolos: ["1700000001"] });
situacao(kA, -119, "Em análise"); situacao(kA, -5, "Concluída - Deferida");
evento(kA, -70, "Perícia médica", "realizada"); evento(kA, -55, "Avaliação social", "realizada");
// B · B31 ativo com a janela da prorrogação aberta
const cB = cli("Bento Fictício Prorroga");
const kB = caso(cB, { beneficio: "Aux. Incapacidade Temporária", especie: "B31", fase: "inss", der: iso(-100), dib: iso(-95), dcb: iso(12), situacao_inss: "Concluída - Deferida", protocolos: ["1700000002"] });
evento(kB, -75, "Perícia médica", "realizada");
// C · BPC: perícia médica feita, avaliação social passada e ainda "agendada"; o atendimento de preparação não conta
const cC = cli("Celina Fictícia Avaliação");
const kC = caso(cC, { beneficio: "BPC/LOAS — deficiência", especie: "B87", fase: "inss", der: iso(-75), protocolos: ["1700000003"] });
evento(kC, -30, "Perícia médica", "realizada"); evento(kC, -6, "Avaliação social", "agendada"); evento(kC, -2, "Atendimento pré-perícia", "agendada");
// D · B41 com a exigência que só o PAT registrou, já cumprida; e a CTPS pedida à cliente com data
const cD = cli("Dirce Fictícia Exigência");
const kD = caso(cD, { beneficio: "Apos. por Idade", especie: "B41", fase: "inss", der: iso(-150), protocolos: ["1700000004"] });
situacao(kD, -149, "Em análise", "1700000004"); situacao(kD, -100, "Em exigência", "1700000004"); situacao(kD, -85, "Cumprimento de exigência", "1700000004");
T.tarefas.push({ id: id("7"), cliente_id: cD.id, caso_id: kD.id, titulo: "📄 CTPS original (tecelagem, 1986 a 1991)", prazo: iso(2), concluida: false, criado_em: ts(-3) });
// E · recurso ordinário PROVIDO pela Junta em matéria médica (alçada), com a DCB nova no resumo do acórdão
const cE = cli("Elói Fictício Provido");
const kE = caso(cE, { beneficio: "Aux. Incapacidade Temporária", especie: "B31", fase: "conselho", origem_lista: "🖥 Conselho de Recursos", der: iso(-415), dib: iso(-400),
  dcb: iso(-190), dcb_prorrogacao_pedida: true, decisao_em: iso(-10), resultado: "indeferido", ro_protocolado_em: iso(-180), crps_nups: ["44233476201202655"],
  crps: [{ nup: "44233476201202655", eventos: [
    { data: `${br(-10)} 07:31:00`, tipo: "decisao", resumo: "Acórdão publicado", bruto: "Encaminhar para a APS para cumprimento de acordão com implantação de benefício - GET 1987654321", arquivos: [] },
    { data: `${br(-12)} 11:47:00`, tipo: "decisao", resumo: "Recurso PROVIDO (7ª Junta)", bruto: "Conhecer do Recurso e dar-lhe provimento, por unanimidade - Acórdão: 7ª JR/6120/2026",
      arquivos: [{ id: "9330109", nome: "ACÓRDÃO_6120.pdf", resumo: { linhas: ["A 7ª Junta deu provimento ao recurso ordinário.", `Parecer da Perícia Médica Federal: incapacidade total e temporária, com DCB fixada em ${br(60)}.`,
        "Matéria exclusivamente médica, de alçada da Junta (art. 89, § 3º, I, do Regimento Interno do CRPS)."], origem: "auto" } }] }] }] });
// F · pensão negada também na Junta (não é alçada): o recurso especial se arma, e o "Concluir em" do To Do no mesmo dia vai junto dele
const cF = cli("Filomena Fictícia Pensão");
const kF = caso(cF, { beneficio: "Pensão por Morte", especie: "B21", fase: "conselho", origem_lista: "🖥 Conselho de Recursos", der: iso(-240), decisao_em: iso(-20),
  resultado: "indeferido", ro_protocolado_em: iso(-185), crps_nups: ["44233487310202655"],
  crps: [{ nup: "44233487310202655", eventos: [{ data: `${br(-20)} 10:58:00`, tipo: "decisao", resumo: "Acórdão publicado (12ª Junta)",
    bruto: "Conhecer do Recurso e negar-lhe provimento, por unanimidade - Acórdão: 12ª JR/5873/2026", arquivos: [] }] }] });
// G · JEF: sentença de procedência com DCB e tutela para implantar; o expediente do PJe; a nota "não recorremos"
const cG = cli("Glória Fictícia Procedente");
const kG = caso(cG, { beneficio: "Aux. Incapacidade Temporária", especie: "B31", fase: "judicial", origem_lista: "👪 Judicial", der: iso(-410), processo: JEF,
  processos: [{ numero: JEF, nosso: true }], classe_judicial: "PJEC" });
const aSentG = and(kG, -6, `PJe (1º grau): Julgado procedente o pedido · 📎 Sentença — em ${pt(-6)} 17:46 — PJEC ${JEF}`, { origem: "pje", origem_id: "mov:g1" });
doc(kG, aSentG, "Sentença", `SENTENÇA\nAnte o exposto, JULGO PROCEDENTE o pedido para condenar o INSS a conceder o auxílio por incapacidade temporária desde a DER, com data de cessação em ${br(237)}, cabendo à autora requerer a prorrogação.\n`
  + "CONCEDO A TUTELA DE URGÊNCIA para que o INSS implante o benefício no prazo de 30 (trinta) dias úteis, a contar da intimação da CEAB/DJ, sob pena de multa diária.\nDefiro a gratuidade.", "48709931");
kG.prazos_tribunal = [{ numero: JEF, ato: "Sentença", ato_id: "48709931", dias: 10, expedido_em: iso(-6), ciencia_em: iso(-4), fim: iso(10), situacao: "aberto", sistema: "pje", origem: "pje:pje1g", lido_em: ts(-1) }];
and(kG, -4, "Sentença de procedência. Não recorremos: o pedido principal foi acolhido por inteiro.");
// H · JEF: sentença de improcedência; o expediente do PJe dá a data, contada da ciência
const cH = cli("Horácio Fictício Improcedente");
const kH = caso(cH, { beneficio: "Aux. Incapacidade Temporária", especie: "B31", fase: "judicial", origem_lista: "👪 Judicial", der: iso(-300), processo: JEF.replace("2781", "2782"),
  processos: [{ numero: JEF.replace("2781", "2782"), nosso: true }] });
const aSentH = and(kH, -4, `PJe (1º grau): Julgado improcedente o pedido · 📎 Sentença — em ${pt(-4)} 16:58 — PJEC ${kH.processo}`, { origem: "pje", origem_id: "mov:h1" });
doc(kH, aSentH, "Sentença", "SENTENÇA\nAnte o exposto, JULGO IMPROCEDENTE o pedido.", "51209966");
kH.prazos_tribunal = [{ numero: kH.processo, ato: "Sentença", ato_id: "51209966", dias: 10, expedido_em: iso(-4), ciencia_em: iso(-3), fim: iso(11), situacao: "aberto", sistema: "pje", origem: "pje:pje1g", lido_em: ts(-1) }];
// I · JEF: laudo juntado, prazo do ato ordinatório, e a manifestação já protocolada (nota da equipe)
const cI = cli("Ismael Fictício Laudo");
const kI = caso(cI, { beneficio: "Aux. Incapacidade Temporária", especie: "B31", fase: "judicial", origem_lista: "👪 Judicial", der: iso(-300), dcb: iso(-330),
  processo: JEF.replace("2781", "2783"), processos: [{ numero: JEF.replace("2781", "2783"), nosso: true }] });
const aLaudoI = and(kI, -12, `PJe (1º grau): Juntada de Laudo Pericial — em ${pt(-12)} 13:40 — PJEC ${kI.processo}`, { origem: "pje", origem_id: "mov:i1" });
kI.prazos_tribunal = [{ numero: kI.processo, ato: "Ato Ordinatório", ato_id: "9780550", dias: 10, expedido_em: iso(-12), ciencia_em: iso(-10), fim: iso(4), situacao: "aberto", sistema: "pje", origem: "pje:pje1g", lido_em: ts(-9) }];
and(kI, -6, "Manifestação sobre o laudo protocolada: concordância com a conclusão.");
// J · o caso no 🗓 Tarefas com Prazo continua judicial: etapa, tramitação e fila do TRF3; o ✔ feito o devolve
const cJ = cli("Jurandir Fictício Prazo");
const kJ = caso(cJ, { beneficio: "Aposentadoria especial", especie: "B46", fase: "outro", mover_para: "🗓 Tarefas com Prazo", origem_lista: "👪 Judicial",
  ronda: { prazo_de: "👪 Judicial" }, der: iso(-1000), processo: "5009813-31.2024.4.03.6102", processos: [{ numero: "5009813-31.2024.4.03.6102", nosso: true }],
  etapa: "em recurso", trf3: { ordem: 214, total: 1320, orgao: "8ª Turma", consultado_em: iso(-1) }, prazo: iso(2) });
const aJ = and(kJ, -3, `⏰ [PRAZO ${pt(2)}] Manifestar sobre a proposta de acordo do INSS.`);
T.andamento_tarefas.push({ id: id("8"), andamento_id: aJ.id, caso_id: kJ.id, colaborador_id: MARCOS, atribuido_por: PAULO, lembrar_em: iso(1), concluida_em: null, natureza: "compromisso", papel: "executa", criado_em: aJ.criado_em },
  { id: id("8"), andamento_id: aJ.id, caso_id: kJ.id, colaborador_id: PAULO, atribuido_por: PAULO, lembrar_em: iso(1), concluida_em: null, natureza: "compromisso", papel: "revisa", criado_em: aJ.criado_em });
// K · mandado de segurança por mora com a liminar deferida e a notificação certificada
const cK = cli("Kátia Fictícia Liminar");
const kK = caso(cK, { beneficio: "Apos. por Idade", especie: "B41", fase: "inss", der: iso(-245), protocolos: ["1700000011"], processo: MS, processos: [{ numero: MS, nosso: true, papel: "ms" }] });
const aLimK = and(kK, -10, `PJe (1º grau): Concedida a Medida Liminar · 📎 Decisão — em ${pt(-10)} 17:20 — MSCiv ${MS}`, { origem: "pje", origem_id: "mov:k1" });
doc(kK, aLimK, "Decisão", "DECISÃO\nDEFIRO A LIMINAR para determinar à autoridade impetrada que conclua a análise do requerimento nº 1700000011, no prazo de 30 (trinta) dias, contados da notificação desta decisão, sob pena de multa diária.", "57700866");
const aCertK = and(kK, -7, `PJe (1º grau): Juntada de Certidão · 📎 Certidão — em ${pt(-7)} 11:40 — MSCiv ${MS}`, { origem: "pje", origem_id: "mov:k2" });
doc(kK, aCertK, "Certidão", `CERTIDÃO\nCertifico que, em ${br(-7)}, notifiquei o GERENTE EXECUTIVO DO INSS do inteiro teor da decisão liminar.`, "57701020");
kK.prazos_tribunal = [{ numero: MS, ato: "Decisão", ato_id: "57700866", dias: 15, expedido_em: iso(-10), ciencia_em: iso(-9), fim: iso(13), situacao: "aberto", sistema: "pje", origem: "pje:pje1g", lido_em: ts(-1) }];
// L · B31 indeferido no INSS: recorrer até à vista no clássico; sem benefício, a DCB não se pede
const cL = cli("Lauro Fictício Indeferido");
const kL = caso(cL, { beneficio: "Aux. Incapacidade Temporária", especie: "B31", fase: "inss", der: iso(-45), decisao_em: iso(-8), resultado: "indeferido", protocolos: ["1700000012"] });

const ok = [];
const conf = (nome, v) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); };

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
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  await instalarBanco(ctx, { SUPA, SESSAO, banco });
  const p = await ctx.newPage();
  p._erros = [];
  p.on("pageerror", e => p._erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const abrir = async (c, k) => { await p.evaluate(async ([cid, kid]) => { await abrirFicha(cid); casoSel = kid; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); }, [c.id, k.id]); await p.waitForTimeout(350); };
  const linhas = k => p.evaluate(kid => linhasDeDatas(D.casoPorId.get(kid).cliente_id).linhas.filter(x => x.casoId === kid)
    .map(x => ({ rotulo: x.rotulo || "", data: x.data, nat: x.natureza || "", resumo: x.resumo || "", acao: x.acao || "", rot: String(x.rot || "").replace(/<[^>]+>/g, "") })), k.id);

  // ── prazo de análise ──────────────────────────────────────────────────
  await abrir(cA, kA);
  const lA = await linhas(kA);
  conf("A · decidido no PAT (Concluída - Deferida, DIB): sem prazo de análise", await p.evaluate(kid => prazoMora(D.casoPorId.get(kid)) === null, kA.id) && !lA.some(x => /Prazo de análise/.test(x.rotulo)));
  conf("A · o 1º pagamento do BPC: 45 dias da concessão, com a base (Decreto 6.214/2007, art. 20)", lA.some(x => x.rotulo === "1º pagamento" && x.data === iso(40) && /Decreto 6\.214\/2007, Anexo, art\. 20/.test(x.rot)));
  await abrir(cB, kB);
  const lB = await linhas(kB), pB = await p.evaluate(kid => proximosDoCaso(D.casoPorId.get(kid)), kB.id);
  conf("B · B31 ativo (DCB à frente): sem mora", await p.evaluate(kid => prazoMora(D.casoPorId.get(kid)) === null, kB.id));
  conf("B · janela aberta: 'Pedir a prorrogação' fica como prazo fatal até a véspera da DCB (IN 128, art. 339, § 3º)",
    lB.some(x => x.rotulo === "Pedir a prorrogação" && x.nat === "fatal" && x.data === iso(11)) && lB.some(x => x.rotulo === "DCB, o benefício cessa" && x.data === iso(12)));
  conf("B · a linha da incapacidade põe o pedido da prorrogação em primeiro", pB[0] && pB[0].urgente && new RegExp(`Pedir a prorrogação até ${br(11)}`).test(pB[0].txt));
  await abrir(cC, kC);
  const mC = await p.evaluate(kid => prazoMora(D.casoPorId.get(kid)), kC.id), lC = await linhas(kC);
  // F236 (rodada final) · a confirmação é uma linha só, a do próprio evento, com a conta do prazo parado (era também a
  // linha "Prazo de análise parado", e o evento ainda contava como vencido)
  conf("C · avaliação social passada e não confirmada: o prazo fica parado (o atendimento pré-perícia não conta)",
    mC && mC.parado && mC.pendente === iso(-6) && /avalia/.test(mC.tipo)
    && lC.some(x => x.rotulo === "Compareceu?" && x.data === iso(-6) && /confirme/i.test(x.rot) && /o INSS decide até/.test(x.rot))
    && !lC.some(x => x.rotulo === "Prazo de análise parado"));
  const mC2 = await p.evaluate(kid => { const ev = D.eventos.find(e => e.caso_id === kid && /social/i.test(e.tipo)); ev.status = "realizada";
    const r = prazoMora(D.casoPorId.get(kid)); ev.status = "agendada"; return r; }, kC.id);
  conf("C · confirmada a avaliação social, o BPC conta 90 dias da última avaliação", mC2 && !mC2.parado && mC2.data === iso(84) && mC2.desde === iso(-6));
  await abrir(cD, kD);
  const mD = await p.evaluate(kid => prazoMora(D.casoPorId.get(kid)), kD.id), lD = await linhas(kD);
  conf("D · a exigência que só o PAT registrou suspende a contagem; cumprida, o prazo retoma com a pausa descontada",
    mD && mD.suspenso && mD.data === iso(-45));
  conf("D · o documento pedido à cliente com data entra nos prazos, com o nome", lD.some(x => x.rotulo === "Documento pedido" && x.data === iso(2) && /CTPS original/.test(x.resumo)));

  // ── recurso no CRPS ───────────────────────────────────────────────────
  await abrir(cE, kE);
  await p.waitForTimeout(300);
  conf("E · recurso ganho na Junta (e de alçada): sem 'Recorrer até'", await p.evaluate(kid => recorrerAte(D.casoPorId.get(kid)) === null, kE.id));
  const kE2 = T.casos.find(k => k.id === kE.id);
  conf("E · a DCB que o acórdão fixou vira a DCB do caso, com a fonte, e religa o lembrete da prorrogação",
    kE2.dcb === iso(60) && kE2.dcb_prorrogacao_pedida === false && /acórdão/.test(((kE2.ronda || {}).dcb_lida || {}).fonte || "")
    && await p.evaluate(kid => prorrogarEm(D.casoPorId.get(kid)), kE.id) === iso(45));
  await p.evaluate(kid => { const k = D.casoPorId.get(kid); k.prazo = recorrerAte(k); }, kF.id);
  await abrir(cF, kF);
  const lF = await linhas(kF);
  conf("F · pensão negada na Junta: o recurso especial se arma", lF.some(x => x.rotulo === "Recurso especial" && x.nat === "fatal"));
  conf("F · o 'Concluir em' do To Do no mesmo dia vai junto do recurso: uma linha só, que diz de que é",
    lF.filter(x => x.data === lF.find(y => y.rotulo === "Recurso especial").data).length === 1 && lF.some(x => x.rotulo === "Recurso especial" && /também no To Do/.test(x.resumo)));

  // ── o cartão do movimento judicial ────────────────────────────────────
  await abrir(cG, kG);
  await p.waitForTimeout(300);
  const g = await p.evaluate(([kid, aid]) => { const a = D._andsFicha.find(x => x.id === aid);
    return { html: prazoSugeridoHtml(a, 0), conta: prazoSugeridoHtml(a, -1), k: D.casoPorId.get(kid) }; }, [kG.id, aSentG.id]);
  conf("G · sentença procedente: sem 'Criar prazo', diz que não há recurso nosso e até quando o INSS pode recorrer",
    /sem recurso nosso/.test(g.html) && !/Criar prazo/.test(g.html) && /O INSS pode recorrer até/.test(g.html) && g.conta === "");
  const lG = await linhas(kG);
  conf("G · o expediente da sentença favorável é só ciência: cinza e sem '⏰ é o prazo do caso'",
    lG.some(x => x.rotulo === "Ciência (decisão favorável)" && x.nat === "lembrete" && !/prazo do caso/.test(x.acao)));
  const implantar = await p.evaluate(d => contarPrazo(cienciaTacita(d), { n: 30, uteis: true }), iso(-6));
  conf("G · a tutela vira data: conferir a implantação em 30 dias úteis da ciência tácita do INSS", lG.some(x => x.rotulo === "Implantação (tutela)" && x.data === implantar));
  conf("G · a DCB da sentença vira a DCB do caso e nasce o pedido da prorrogação",
    T.casos.find(k => k.id === kG.id).dcb === iso(237) && lG.some(x => x.rotulo === "Pedir a prorrogação" && x.data === iso(222)));
  conf("G · vigia do recurso do INSS (lembrete)", lG.some(x => x.rotulo === "Recurso do INSS" && x.nat === "lembrete"));
  await abrir(cH, kH);
  const h = await p.evaluate(aid => prazoSugeridoHtml(D._andsFicha.find(x => x.id === aid), 0), aSentH.id);
  conf("H · sentença improcedente: o prazo sugerido é o do PJe, contado da ciência", /o prazo do PJe/.test(h) && h.includes(pt(11)) && /Criar prazo/.test(h));
  const mv = await p.evaluate(([tj, d]) => ({ concl: proximoPassoDoMovimento(`e-SAJ TJSP (1º grau): Conclusos para Sentença — em ${d} 00:00 — Procedimento Comum Cível ${tj}`),
    contra: proximoPassoDoMovimento(`PJe (1º grau): Juntada de Petição de contrarrazões — em ${d} 10:00 — PJEC 5002781-11.2026.4.03.6302`),
    sentB: proximoPassoDoMovimento(`PJe (1º grau): Sentença Tipo B — em ${d} 14:10 — PJEC 5002781-11.2026.4.03.6302`) }), [TJ, pt(-2)]);
  conf("conclusos para sentença e juntada de contrarrazões não sugerem prazo; a sentença sem resultado no texto continua sugerindo o recurso",
    mv.concl === null && mv.contra === null && mv.sentB && mv.sentB.cat === "ri");
  await abrir(cI, kI);
  const i = await p.evaluate(aid => prazoSugeridoHtml(D._andsFicha.find(x => x.id === aid), 0), aLaudoI.id);
  conf("I · manifestação já protocolada depois do laudo: o cartão não sugere prazo", i === "");
  const lI = await linhas(kI);
  conf("I · na ação, a DCB que já passou é o objeto do caso: sem linha vermelha nem pedido de prorrogação",
    !lI.some(x => /DCB|prorroga/.test(x.rotulo)) && await p.evaluate(kid => prorrogarEm(D.casoPorId.get(kid)) === null && chipDcb(D.casoPorId.get(kid)) === "", kI.id));

  // ── mandado de segurança ──────────────────────────────────────────────
  await abrir(cK, kK);
  const lK = await linhas(kK), fimLim = await p.evaluate(d => { let x = somaDias(d, 30); while (!ehDiaUtil(x)) x = somaDias(x, -1); return x; }, iso(-7));
  conf("K · MS impetrado: sem 'mora do INSS'", await p.evaluate(kid => prazoMora(D.casoPorId.get(kid)) === null, kK.id) && !lK.some(x => /Prazo de análise/.test(x.rotulo)));
  conf("K · a liminar vira data: o INSS conclui a análise em 30 dias da notificação certificada", lK.some(x => x.rotulo === "Ordem ao INSS (liminar)" && x.data === fimLim));
  conf("K · o expediente da liminar favorável é ciência, sem o atalho que tirava o caso do INSS",
    lK.some(x => x.rotulo === "Ciência (decisão favorável)" && !/prazo do caso/.test(x.acao)));

  // ── a fase verdadeira e o ✔ feito do clássico ─────────────────────────
  await abrir(cJ, kJ);
  const j = await p.evaluate(kid => { const k = D.casoPorId.get(kid); const h = linhaCaso(k);
    return { fe: faseEfetiva(k), tram: /Judicial · prazo correndo/.test(h), fila: /214º/.test(h), etapa: /em recurso/.test(faixaTrilha(k)),   /* F287 · a etapa mora na faixa das fases */ rec: recorrerAte(k) }; }, kJ.id);
  conf("J · no 🗓 Tarefas com Prazo o caso continua judicial: tramitação, fila do TRF3 e etapa", j.fe === "judicial" && j.tram && j.fila && j.etapa);
  // a revisão concluída antes do protocolo não baixa o prazo; a conclusão de quem executa, sim
  const tRev = T.andamento_tarefas.find(t => t.caso_id === kJ.id && t.papel === "revisa"), tExe = T.andamento_tarefas.find(t => t.caso_id === kJ.id && t.papel === "executa");
  await p.evaluate(tid => concluirDeVez(tid), tRev.id); await p.waitForTimeout(500);
  conf("J · concluir a revisão não baixa o prazo fatal", T.casos.find(k => k.id === kJ.id).prazo === iso(2));
  await p.evaluate(() => { document.documentElement.removeAttribute("data-tema"); });
  await abrir(cJ, kJ);
  const clas = await p.evaluate(kid => { const q = document.getElementById("quadro-datas"); return q ? q.innerHTML : ""; }, kJ.id);
  conf("J · no clássico, o prazo fatal diz do que é", /PRAZO FATAL — Manifestar sobre a proposta de acordo/.test(clas.replace(/<[^>]+>/g, "")) && /qdMudarPrazo/.test(clas));
  await p.evaluate(kid => qdMudarPrazo(kid, ""), kJ.id); await p.waitForTimeout(600);
  const kJ2 = T.casos.find(k => k.id === kJ.id);
  conf("J · o ✔ feito do clássico devolve o caso ao 👪 Judicial e registra o cumprimento",
    kJ2.prazo === null && kJ2.fase === "judicial" && kJ2.mover_para === "👪 Judicial" && !(kJ2.ronda || {}).prazo_de
    && T.andamentos.some(a => a.caso_id === kJ.id && /\[PRAZO CUMPRIDO\]/.test(a.texto || "")));
  await abrir(cL, kL);
  const l = await p.evaluate(kid => { const k = D.casoPorId.get(kid), q = document.getElementById("quadro-datas"), f = document.querySelector(".fatos-processo");
    // com o ➕ fechado o corpo dele nem é pintado: estar no cartão é estar à vista
    return { quadro: q ? q.textContent : "", visivel: !maisAberto.has(kid) && !!f && /Recorrer até/.test(f.querySelector(".fx-prazo") ? f.querySelector(".fx-prazo").textContent : ""), campos: camposEssenciais(k) }; }, kL.id);
  conf("L · no clássico o 'Recorrer até' fica à vista, fora do ➕, e entra em 'Lembretes e datas'", l.visivel && /Recorrer até/.test(l.quadro));
  conf("L · pedido negado e sem DIB: a linha do caso não pede a DCB", l.campos.includes("?dcb") && !l.campos.includes("dcb"));

  // ── a coluna do v10: a ordem da F145 com o próximo em destaque ─────────
  await p.evaluate(() => { document.documentElement.setAttribute("data-tema", "v10"); });
  await abrir(cB, kB);
  const fx = await p.evaluate(() => { const ds = [...document.querySelectorAll(".caso-esq .pz:not(.fp2-fatal)")].map(b => b.dataset.data);
    const dq = document.querySelector(".caso-esq .pz.fp2-fatal");
    return { asc: ds.every((x, i) => !i || ds[i - 1] <= x), destaque: dq ? dq.textContent.replace(/\s+/g, " ") : "" }; });
  conf("F254 · a coluna abre com o prazo fatal em destaque (a prorrogação) e segue em ordem crescente", fx.asc && /prorroga/i.test(fx.destaque) && /falta|vence|venceu/.test(fx.destaque));
  if (!(fx.asc && /prorroga/i.test(fx.destaque))) console.log("faixa:", JSON.stringify(fx));

  conf("sem erro de página", !p._erros.length);
  if (p._erros.length) console.log(p._erros.join("\n"));
  const bons = ok.filter(x => x[1]).length;
  console.log(`\n${bons}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(bons === ok.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
