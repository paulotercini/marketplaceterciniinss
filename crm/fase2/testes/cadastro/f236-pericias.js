// F236 · frente perícias: a perícia que passou e segue "agendada" pergunta "aconteceu?" no caso, na aba e na
// lista 🩺 (Compareceu grava andamento, etapa e a conferência do resultado; Não compareceu, a tarefa de nova data;
// Remarcada, o evento novo); a perícia que só o PJe conhece é proposta (botão principal no cartão, linha nos
// compromissos, aba e lista); julgamento não é perícia; "Perícia" = "Perícia médica"; o roteiro do INSS sem
// quesitos; o prazo de quesitos com nome e responsável. Banco simulado, dados fictícios. Uso: node f236-pericias.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";

const PAULO = FIX.colaboradores[0].id;
const MARCOS = "33333333-3333-3333-3333-333333333333", ANDRE = "55555555-5555-5555-5555-555555555555", AMANDA = "22222222-2222-2222-2222-222222222222";
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais", "atribuicoes"]) dados[t] = [];
Object.assign(dados, {
  colaboradores: [...FIX.colaboradores,
    { id: AMANDA, nome: "Amanda Fictícia Garcez", inicial: "A", cor: "#1B6E38", papel: "colaborador", cargo: "advogado", ativo: true },
    { id: MARCOS, nome: "Marcos Fictício Amorim", inicial: "M", cor: "#8F5400", papel: "colaborador", cargo: "advogado", ativo: true },
    { id: ANDRE, nome: "André Fictício Lopes", inicial: "D", cor: "#6B3FA0", papel: "colaborador", cargo: "estagiario", ativo: true }],
  clientes: [], casos: [], documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;
const iso = n => new Date(Date.now() + n * 864e5).toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });
const br = s => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`, pt = s => `${s.slice(8, 10)}.${s.slice(5, 7)}.${s.slice(0, 4)}`;
const ts = (dia, hora) => `${dia}T${hora}:00-03:00`;
let seq = 0;
const id = p => `${p}0000000-0000-0000-0000-${String(++seq).padStart(12, "0")}`;
function cliente(nome, caso, atr) {
  const c = { id: id("c"), nome, cpf: null, telefone: "(16) 99000-" + String(1000 + seq), campos: {}, criado_em: "2026-01-10T12:00:00Z" };
  const k = { id: id("b"), cliente_id: c.id, titulo: nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {}, marcadores: [],
    prazos_tribunal: [], criado_em: "2026-01-10T12:00:00Z", ...caso };
  T.clientes.push(c); T.casos.push(k);
  for (const co of atr) T.atribuicoes.push({ caso_id: k.id, colaborador_id: co });
  return { c, k };
}
const ev = (k, o) => { const e = { id: id("d"), caso_id: k.id, status: "agendada", local: null, obs: null, ...o }; T.eventos.push(e); return e; };
const and = (k, o) => { const a = { id: id("e"), caso_id: k.id, origem: "app", autor_id: PAULO, excluir: false, ...o }; T.andamentos.push(a); return a; };

// A · INSS: a perícia passou há 12 dias e segue "agendada"; a anotação do To Do diz que ela foi
const A = cliente("Sueli Ficta Teste", { fase: "inss", especie: "B31", beneficio: "Aux. Incapacidade Temporária", der: iso(-40), protocolos: ["1781200001"] }, [ANDRE, AMANDA]);
const EA = ev(A.k, { tipo: "Perícia médica", data_hora: ts(iso(-12), "09:20"), local: "APS Sertãozinho" });
const NOTA_A = and(A.k, { origem: "todo", autor_id: ANDRE, criado_em: ts(iso(-11), "12:00"), texto: "Liguei para a cliente: foi à perícia ontem com a irmã. Disse que o resultado sai no Meu INSS." });
// B · BPC: a avaliação social passou, sem notícia (vai faltar)
const B = cliente("Benedita Ficta Teste", { fase: "inss", especie: "B87", beneficio: "BPC/LOAS — deficiência", der: iso(-70) }, [ANDRE]);
ev(B.k, { tipo: "Perícia médica", data_hora: ts(iso(-30), "08:00"), status: "realizada" });
const EB = ev(B.k, { tipo: "Avaliação social", data_hora: ts(iso(-6), "14:00"), local: "APS Ipiranga" });
// G · BPC: a avaliação social passou e foi; com a médica já feita, o pedido fica aguardando análise
const G = cliente("Glória Ficta Teste", { fase: "inss", especie: "B87", beneficio: "BPC/LOAS — deficiência", der: iso(-70), etapa: "perícia realizada" }, [ANDRE]);
ev(G.k, { tipo: "Perícia médica", data_hora: ts(iso(-30), "08:00"), status: "realizada" });
const EG = ev(G.k, { tipo: "Avaliação social", data_hora: ts(iso(-5), "14:00") });
// C · JEF: a perícia judicial só está no movimento do PJe; o ato ordinatório dá 10 dias para quesitos e assistente
const PROC = "5009204-59.2026.4.03.6302", PROC20 = "50092045920264036302";
const C = cliente("Claudinei Ficto Teste", { fase: "judicial", especie: "B31", beneficio: "Aux. Incapacidade Temporária", processo: PROC, classe_judicial: "PJEC",
  prazos_tribunal: [{ numero: PROC, ato: "Ato Ordinatório", ato_id: "53101952", meio: "Sistema", dias: 10, expedido_em: iso(-5), ciencia_em: iso(-3), fim: iso(11),
    situacao: "aberto", sistema: "pje", origem: "pje:pje1g.trf3.jus.br", lido_em: ts(iso(-1), "07:20") }] }, [MARCOS, ANDRE]);
ev(C.k, { tipo: "Perícia médica", data_hora: ts(iso(-126), "07:50"), status: "realizada", local: "APS Ipiranga" });
const MOV_C = and(C.k, { origem: "pje", origem_id: `mov:${PROC20}:1`, autor_id: PAULO, criado_em: ts(iso(-5), "18:10"),
  texto: `PJe (1º grau): Designada perícia médica (${br(iso(14))} às 13:40 - ORTOPEDIA - Dr. Fábio Ficto Mendes - sala de perícias do Juizado Especial Federal de Ribeirão Preto, 1º andar) — em ${pt(iso(-5))} 14:10 — PJEC ${PROC}` });
const ATO_C = and(C.k, { origem: "pje", origem_id: `mov:${PROC20}:2`, autor_id: PAULO, criado_em: ts(iso(-5), "18:10"),
  texto: `PJe (1º grau): Ato ordinatório praticado · 📎 Ato Ordinatório — em ${pt(iso(-5))} 14:12 — PJEC ${PROC}` });
T.anexos.push({ id: id("a"), caso_id: C.k.id, cliente_id: C.c.id, andamento_id: ATO_C.id, origem: "pje", nome: "Ato Ordinatório", caminho: `pje/${PROC20}/53101952`,
  tipo: "application/pdf", paginas: 1, criado_em: ts(iso(-5), "18:10"),
  texto: `ATO ORDINATÓRIO\nProcesso nº ${PROC}\nNos termos da portaria deste Juizado, fica designada perícia médica na especialidade de ORTOPEDIA para o dia ${br(iso(14))}, às 13:40.\n`
    + "Ficam as partes intimadas para, no prazo de 10 (dez) dias, apresentarem quesitos e indicarem assistente técnico (art. 12, § 2º, da Lei 10.259/2001).\n"
    + "A parte autora deverá comparecer com documento de identidade com foto e com todos os exames, relatórios e receitas médicas que possuir. A ausência injustificada implicará a extinção do processo." });
// D · INSS: a perícia daqui a 9 dias, gravada duas vezes (PAT e To Do); o aviso ficou anotado no To Do
const DD = cliente("Joaquim Ficto Teste", { fase: "inss", especie: "B31", beneficio: "Aux. Incapacidade Temporária", der: iso(-20), prazo: iso(10) }, [AMANDA, ANDRE]);
const ED = ev(DD.k, { tipo: "Perícia médica", data_hora: ts(iso(9), "08:40"), local: "APS Centro" });
const ED2 = ev(DD.k, { tipo: "Perícia", data_hora: ts(iso(9), "09:00") });
const EAT = ev(DD.k, { tipo: "Atendimento pré-perícia", data_hora: ts(iso(6), "09:00") });
and(DD.k, { origem: "todo", autor_id: AMANDA, criado_em: ts(iso(-11), "12:00"), texto: "Avisei o cliente por WhatsApp sobre a perícia marcada pelo INSS; ele confirmou presença e vai levar atestados." });
const VESP_D = and(DD.k, { origem: "app", autor_id: MARCOS, criado_em: ts(iso(-5), "10:00"), texto: `@André, ligue para o cliente na véspera da perícia (${br(iso(8))}).` });
T.andamento_tarefas.push({ id: id("f"), andamento_id: VESP_D.id, caso_id: DD.k.id, colaborador_id: ANDRE, atribuido_por: MARCOS, lembrar_em: iso(8), concluida_em: null });
// E · CRPS: sessão de julgamento marcada
const E = cliente("Aparecida Ficta Teste", { fase: "conselho", especie: "B87", beneficio: "BPC/LOAS — idoso" }, [PAULO]);
const EE = ev(E.k, { tipo: "Julgamento", data_hora: ts(iso(5), "09:00"), local: "25ª Junta de Recursos" });
// F · INSS: a perícia aconteceu; o laudo veio do PAT como documento, sem andamento
const F = cliente("Gervásio Ficto Teste", { fase: "inss", especie: "B31", beneficio: "Aux. Incapacidade Temporária", der: iso(-30), protocolos: ["1790000006"] }, [AMANDA]);
const EF = ev(F.k, { tipo: "Perícia médica", data_hora: ts(iso(-15), "08:50"), status: "realizada" });
T.anexos.push({ id: id("a"), caso_id: F.k.id, cliente_id: F.c.id, andamento_id: null, origem: "pat", nome: "LAUDO MEDICO PERICIAL.pdf", caminho: "pat/1790000006/9001",
  tipo: "application/pdf", paginas: 3, criado_em: ts(iso(-8), "07:50"),
  texto: ["PERÍCIA MÉDICA FEDERAL", "Perícia Médica de Benefício de Incapacidade", "Avaliação Médico Pericial BI - Perícia Inicial", "Dados Cadastrais",
    "Protocolo INSS: 1790000006 Protocolo PMF: 987654321 Espécie/NB: 31/600.000.000-9", "Nome do Requerente: GERVASIO FICTO TESTE", "História Clínica",
    "Ajudante geral. Dor no ombro direito.", "Diagnóstico", "CIDs", "CID Principal M75.1 - Síndrome do manguito rotador", "Capacidade Laborativa", "SIM X NÃO",
    "Considerações Médico Periciais: Capaz", "Conclusão", "Capacidade Laborativa Não houve comprovação da incapacidade", "Nexo Técnico Não"].join("\n") });
// H · INSS: a perícia passou e foi remarcada
const H = cliente("Herminda Ficta Teste", { fase: "inss", especie: "B31", beneficio: "Aux. Incapacidade Temporária", der: iso(-25) }, [AMANDA]);
const EH = ev(H.k, { tipo: "Perícia médica", data_hora: ts(iso(-3), "10:00"), local: "APS Centro" });

const ok = [];
const conf = (nome, v, extra) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome + (!v && extra !== undefined ? `  → ${JSON.stringify(extra).slice(0, 400)}` : "")); };

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
    window.open = () => null;
  }, [SUPA, SESSAO]);
  await instalarBanco(ctx, { SUPA, SESSAO, banco });
  const p = await ctx.newPage();
  p._erros = [];
  p.on("pageerror", e => p._erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D._completo === true && D.cliPorId && D.cliPorId.size > 0, null, { timeout: 15000 });
  const espera = ms => p.waitForTimeout(ms);
  const ficha = async (cli, caso, aba = 2) => { await p.evaluate(async ([c, k, a]) => { await abrirFicha(c); casoSel = k; abaAtiva = a; subAba = "escritorio"; repintarFicha(); }, [cli, caso, aba]); await espera(250); };
  const cartoes = () => p.evaluate(() => [...document.querySelectorAll(".faixa-prazos .pz")].map(c => ({ tipo: c.dataset.tipo, data: c.querySelector(".pz-data").textContent })));
  const menu = () => p.evaluate(() => [...document.querySelectorAll(".menu-topo .mt")].map(b => b.textContent.trim()).join(" | "));

  // ── a lista 🩺 Perícias & Audiências ──────────────────────────────────────
  await p.evaluate(() => { visao = "agenda"; render(); }); await espera(200);
  const ag = await p.evaluate(() => { const m = document.getElementById("conteudo-meio");
    const secoes = [...m.querySelectorAll("h3.secao")].map(h => h.textContent);
    const conf = [...m.querySelectorAll(".evento.confirmar")].map(e => e.textContent.replace(/\s+/g, " "));
    const pass = [...m.querySelectorAll(".evento.passado:not(.confirmar)")];
    return { secoes, conf, risco: pass.map(e => getComputedStyle(e.querySelector(".oque strong")).textDecorationLine),
      avisarPassado: pass.some(e => /avisar cliente/.test(e.textContent)) }; });
  conf("a lista abre com a perícia marcada só no processo, para agendar", /Marcadas nos processos, sem agendamento \(1\)/.test(ag.secoes[0] || "") && ag.conf.some(t => /Claudinei/.test(t) && /agendar com aviso/.test(t)), ag.secoes);
  conf("as que passaram sem confirmação ficam à parte, com as três respostas", ag.secoes.some(t => /Aconteceu\? Confirme \(4\)/.test(t))
    && ["Sueli", "Benedita", "Glória", "Herminda"].every(n => ag.conf.some(t => t.includes(n) && /não compareceu/.test(t) && /remarcada/.test(t))), ag);
  conf("as passadas não são riscadas e não pedem 'avisar cliente'", ag.risco.length > 0 && ag.risco.every(x => x === "none") && !ag.avisarPassado, ag);

  // ── A · a perícia que passou: o caso pergunta, a aba aparece, o Compareceu deixa rastro ──
  await ficha(A.c.id, A.k.id);
  conf("a aba Perícias aparece só com a que passou, dizendo quantas faltam confirmar", /Perícias · 1 a confirmar/.test(await menu()), await menu());
  const cA = await cartoes();
  conf("Prazos e compromissos pergunta 'Compareceu?' na data da perícia", cA.some(c => c.tipo === "Compareceu?" && c.data === br(iso(-12))), cA);
  const oaA = await p.evaluate(() => (document.querySelector(".outras-abas") || {}).textContent || "");
  conf("Nas outras abas também", /Perícia de .* aconteceu\? confirme/.test(oaA), oaA);
  const lnA = await p.evaluate(() => { const x = faixaAtual.find(l => l.rotulo === "Compareceu?"); return x ? { rot: x.rot, acao: x.acao } : null; });
  conf("o saber mais traz a prova (a anotação do André) e as três respostas", lnA && /André anotou em/.test(lnA.rot) && /foi à perícia ontem/.test(lnA.rot)
    && /compareceuEvento/.test(lnA.acao) && /naoCompareceuEvento/.test(lnA.acao) && /remarcarEvento/.test(lnA.acao), lnA);
  const horaTodo = await p.evaluate(id => { const li = [...document.querySelectorAll(".timeline li")].find(l => /foi à perícia ontem/.test(l.textContent)); return li ? li.querySelector(".tl-hora").textContent : null; }, NOTA_A.id);
  conf("a anotação do To Do não mostra a hora falsa 12:00", horaTodo !== null && !/12:00/.test(horaTodo), horaTodo);
  await p.evaluate(() => { abaAtiva = 3; repintarFicha(); }); await espera(200);
  const cardA = await p.evaluate(id => { const l = document.querySelector(`li.tl-pericia[data-ev="${id}"]`); return l ? { est: l.querySelector(".per-est").textContent,
    prova: (l.querySelector(".per-prova") || {}).textContent || "", bts: [...l.querySelectorAll(".tl-barra .tl-bt")].map(b => b.textContent.trim()), forte: (l.querySelector(".tl-bt.forte") || {}).textContent,
    sec: [...document.querySelectorAll('.painel[data-p="3"] h3.per-sub')].map(h => h.textContent) } : null; }, EA.id);
  conf("na aba, o cartão diz 'aconteceu? confirme', mostra a prova e oferece Compareceu, Não compareceu e Remarcada", cardA && cardA.est === "aconteceu? confirme" && /André anotou/.test(cardA.prova)
    && cardA.forte === "Compareceu" && cardA.bts.includes("Não compareceu") && cardA.bts.includes("Remarcada") && cardA.sec.includes("Aconteceu? Confirme"), cardA);
  await p.evaluate(id => compareceuEvento(id), EA.id); await espera(700);
  const andA = T.andamentos.filter(a => a.caso_id === A.k.id && /compareceu/.test(a.texto || "") && a.origem === "app").pop();
  const proxA = await p.evaluate(() => proxDiaUtil(hoje()));
  const tfA = andA && T.andamento_tarefas.find(t => t.andamento_id === andA.id);
  conf("Compareceu: o evento vira realizado", T.eventos.find(e => e.id === EA.id).status === "realizada");
  conf("e grava o andamento curto com a conferência do resultado no Meu INSS", andA && /^✔ Perícia médica de .* às 09:20: compareceu\. Conferir o resultado \(o laudo no Meu INSS \/ SABI\) em/.test(andA.texto), andA && andA.texto);
  conf("a conferência é tarefa de quem está no caso (André), no próximo dia útil", tfA && tfA.colaborador_id === ANDRE && tfA.lembrar_em === proxA, tfA);
  conf("e a etapa anda para 'perícia realizada'", T.casos.find(k => k.id === A.k.id).etapa === "perícia realizada");

  // ── G · BPC: com a médica feita, a avaliação social confirmada põe o pedido em 'aguardando análise' ──
  await ficha(G.c.id, G.k.id);
  await p.evaluate(id => compareceuEvento(id), EG.id); await espera(600);
  conf("BPC: as duas avaliações feitas, a etapa vai a 'aguardando análise'", T.casos.find(k => k.id === G.k.id).etapa === "aguardando análise", T.casos.find(k => k.id === G.k.id).etapa);

  // ── B · a avaliação social que passou: Meu Dia do atribuído e o Não compareceu ──
  // o item da perícia que passou: ev (este patch) ou evPassado (o itensAgenda reescrito pela frente rotina)
  const itB = await p.evaluate(id => { const i = itensAgenda(null).find(x => (x.ev || x.evPassado || {}).id === id); return i ? { data: i.data, selo: i.selo, res: i.resumo, quem: i.quem.map(c => c.inicial) } : null; }, EB.id);
  const proxB = await p.evaluate(d => proxDiaUtil(somaDias(d, 1)), iso(-6));
  conf("Meu Dia/Planejado: a que passou cobra o atribuído no dia útil seguinte", itB && itB.selo === "Confirmar" && itB.data === proxB && /aconteceu\? confirme|confirmar se compareceu/.test(itB.res) && itB.quem.includes("D"), itB);
  await ficha(B.c.id, B.k.id);
  await p.evaluate(id => naoCompareceuEvento(id), EB.id); await espera(700);
  const eB = T.eventos.find(e => e.id === EB.id), andB = T.andamentos.filter(a => a.caso_id === B.k.id && /não compareceu/.test(a.texto || "")).pop();
  const hj = await p.evaluate(() => hoje());
  conf("Não compareceu: o evento sai da agenda com a marca", eB.status === "cancelada" && /não compareceu/.test(eB.obs || ""), eB);
  conf("e o andamento pede nova data pelo Meu INSS ou pela 135, com a tarefa para hoje", andB && /Meu INSS ou pela Central 135/.test(andB.texto)
    && T.andamento_tarefas.some(t => t.andamento_id === andB.id && t.lembrar_em === hj && t.colaborador_id === ANDRE), andB && andB.texto);
  await p.evaluate(() => { abaAtiva = 3; repintarFicha(); }); await espera(150);
  conf("o cartão diz 'não compareceu'", await p.evaluate(id => ((document.querySelector(`li.tl-pericia[data-ev="${id}"] .per-est`) || {}).textContent || "") === "não compareceu", EB.id));

  // ── H · Remarcada ───────────────────────────────────────────────────────
  await ficha(H.c.id, H.k.id);
  await p.evaluate(id => remarcarEvento(id), EH.id); await espera(150);
  await p.evaluate(d => { document.getElementById("rm-data").value = d; document.getElementById("rm-hora").value = "10:30"; }, iso(20));
  await p.evaluate(id => salvarRemarcacao(id), EH.id); await espera(700);
  const eH = T.eventos.find(e => e.id === EH.id), novoH = T.eventos.find(e => e.caso_id === H.k.id && e.id !== EH.id);
  conf("Remarcada: a antiga fica no histórico como remarcada e a nova entra na agenda", eH.status === "cancelada" && /remarcada para/.test(eH.obs || "")
    && novoH && novoH.status === "agendada" && novoH.data_hora === ts(iso(20), "10:30") && novoH.local === "APS Centro", { eH, novoH });
  conf("e o andamento conta a troca", T.andamentos.some(a => a.caso_id === H.k.id && new RegExp(`remarcada para ${pt(iso(20))} às 10:30`).test(a.texto || "")));

  // ── C · a perícia que só o PJe conhece; o prazo de quesitos com nome e responsável ──
  await ficha(C.c.id, C.k.id);
  conf("a aba Perícias aparece com a perícia do processo a agendar", /Perícias · 1 a agendar/.test(await menu()), await menu());
  const cC = await cartoes();
  conf("Prazos e compromissos: 'Perícia a agendar' na data do movimento", cC.some(c => c.tipo === "Perícia a agendar" && c.data === br(iso(14))), cC);
  conf("o prazo do PJe diz que é de quesitos e que falta atribuir", cC.some(c => c.tipo === "Quesitos · atribuir" && c.data === br(iso(11))), cC);
  await p.evaluate(() => { subAba = "tudo"; filtroTudo = "tudo"; repintarFicha(); }); await espera(250);
  const mov = await p.evaluate(() => { const l = [...document.querySelectorAll('.painel[data-p="2"] li.tl-oficial')].find(x => /Designada perícia médica/.test(x.textContent));
    const ato = [...document.querySelectorAll('.painel[data-p="2"] li.tl-oficial')].find(x => /Ato ordinatório praticado/.test(x.textContent));
    return l ? { forte: [...l.querySelectorAll(".tl-barra .tl-bt.forte")].map(b => b.textContent.trim()), criar: [...l.querySelectorAll(".tl-barra button")].find(b => /Criar tarefa ou prazo/.test(b.textContent)).className,
      menu: [...l.querySelectorAll(".tl-mais-it")].map(b => b.textContent.trim()), ato: ato ? (ato.querySelector(".tl-disp") || {}).textContent || "" : "" } : null; });
  conf("no cartão do movimento, 'Agendar perícia com aviso' é o botão principal (e saiu do ⋯)", mov && mov.forte.join("|") === "Agendar perícia com aviso" && !/forte/.test(mov.criar) && !mov.menu.some(t => /com aviso/.test(t)), mov);
  conf("o ato ordinatório mostra o trecho (quesitos e assistente técnico)", mov && /quesitos e indicarem assistente técnico/.test(mov.ato), mov && mov.ato);
  await p.evaluate(() => { abaAtiva = 3; repintarFicha(); }); await espera(150);
  conf("na aba, o cartão da perícia do processo oferece agendar com aviso", await p.evaluate(() => { const l = document.querySelector('.painel[data-p="3"] li.tl-pericia[data-proc]');
    return !!l && /no processo, sem agendamento/.test(l.textContent) && /Agendar perícia com aviso/.test((l.querySelector(".tl-bt.forte") || {}).textContent || ""); }));
  await p.evaluate(() => document.querySelector('.painel[data-p="3"] li.tl-pericia[data-proc] .tl-bt.forte').click()); await espera(1200);
  const evC = T.eventos.find(e => e.caso_id === C.k.id && e.data_hora === ts(iso(14), "13:40"));
  conf("um clique agenda com o local do movimento", evC && evC.status === "agendada" && evC.local === "ORTOPEDIA - Dr. Fábio Ficto Mendes - sala de perícias do Juizado Especial Federal de Ribeirão Preto, 1º andar", evC);
  const msgC = evC ? await p.evaluate(id => lembreteDoEvento(id).texto, evC.id) : "";
  conf("o recado ao cliente leva o que o juízo pede e o aviso da falta", /O que o juízo pede: .*comparecer com documento de identidade com foto/.test(msgC) && /ausência injustificada/.test(msgC), msgC);
  conf("e cria o aviso de hoje e a véspera", T.andamentos.some(a => a.caso_id === C.k.id && /^📞 Avisar/.test(a.texto || "")) && T.andamentos.some(a => a.caso_id === C.k.id && /^🗓 Véspera/.test(a.texto || "")));
  const quesData = await p.evaluate(d => diasUteisAntes(d, 1), iso(11));
  const rot = await p.evaluate(() => ({ ques: !!document.getElementById("rot-ques"), data: (document.getElementById("rot-ques-data") || {}).value, quem: (document.getElementById("rot-ques-quem") || {}).value,
    vesp: (document.getElementById("rot-vesp") || {}).checked, concl: (document.getElementById("rot-concl") || {}).checked, txt: (document.querySelector(".rot-box") || {}).textContent || "" }));
  conf("o roteiro abre em seguida: quesitos (com o assistente técnico) até a véspera do prazo do PJe, para o Marcos", rot.ques && rot.data === quesData && rot.quem === MARCOS && /assistente técnico · prazo do PJe/.test(rot.txt), rot);
  conf("e a véspera já criada não nasce de novo", rot.vesp === false, rot);
  await p.evaluate(() => salvarSeguimento()); await espera(1200);
  const qC = T.andamentos.find(a => a.caso_id === C.k.id && /Apresentar os quesitos/.test(a.texto || ""));
  conf("o roteiro não repete o aviso que nasceu com o agendamento", T.andamentos.filter(a => a.caso_id === C.k.id && /^📞 Avisar/.test(a.texto || "")).length === 1);
  conf("a tarefa dos quesitos diz o assistente técnico e o prazo do PJe, para o Marcos", qC && new RegExp(`e decidir sobre o assistente técnico — prazo do PJe: ${pt(iso(11)).replace(/\./g, "\\.")} \\[PRAZO`).test(qC.texto)
    && T.andamento_tarefas.some(t => t.andamento_id === qC.id && t.colaborador_id === MARCOS && t.lembrar_em === quesData), qC && qC.texto);
  await ficha(C.c.id, C.k.id);
  const cC2 = await cartoes();
  conf("agora o prazo do PJe diz quem cuida: 'Quesitos · Marcos'", cC2.some(c => c.tipo === "Quesitos · Marcos"), cC2);
  conf("e a perícia do processo virou compromisso marcado ('avisar')", cC2.some(c => c.tipo === "Perícia · avisar" && c.data === br(iso(14))) && !cC2.some(c => /a agendar/.test(c.tipo)), cC2);

  // ── D · a perícia futura: uma só (Perícia = Perícia médica), avisada pelo To Do; o roteiro do INSS sem quesitos ──
  await ficha(DD.c.id, DD.k.id, 3);
  const cardD = await p.evaluate(() => [...document.querySelectorAll('.painel[data-p="3"] li.tl-pericia')].map(l => ({ ev: l.dataset.ev, est: l.querySelector(".per-est").textContent,
    txt: l.textContent.replace(/\s+/g, " "), forte: (l.querySelector(".tl-bt.forte") || {}).textContent })));
  const perD = cardD.filter(c => c.ev === ED.id || c.ev === ED2.id), atD = cardD.find(c => c.ev === EAT.id);
  conf("'Perícia' e 'Perícia médica' do mesmo dia são uma perícia só (a do PAT, com o local)", perD.length === 1 && perD[0].ev === ED.id && /APS Centro/.test(perD[0].txt), cardD);
  conf("o aviso anotado no To Do vale: 'cliente avisado · Amanda', sem o botão Avisar cliente", perD[0] && /^cliente avisado · Amanda, \d\d\/\d\d$/.test(perD[0].est) && !/Avisar cliente/.test(perD[0].txt) && perD[0].forte === "Preparar", perD[0]);
  conf("o atendimento de preparação não pede aviso nem roteiro", atD && atD.est === "marcado" && !/Avisar cliente|Preparar/.test(atD.txt), atD);
  await p.evaluate(() => { abaAtiva = 2; repintarFicha(); }); await espera(150);
  const cD = await cartoes();
  conf("Prazos e compromissos: 'Perícia · avisado' e o atendimento sem 'avisar'", cD.some(c => c.tipo === "Perícia · avisado" && c.data === br(iso(9))) && cD.some(c => c.tipo === "Atendimento pré-perícia" && c.data === br(iso(6))), cD);
  await p.evaluate(id => prepararPericia(id), ED.id); await espera(250);
  const rotD = await p.evaluate(() => ({ ques: !!document.getElementById("rot-ques"), concl: (document.getElementById("rot-concl") || {}).checked, vesp: (document.getElementById("rot-vesp") || {}).checked,
    passos: [...document.querySelectorAll(".rot-li .rot-rot")].map(e => e.textContent.trim()) }));
  conf("o Preparar do INSS não traz quesitos nem troca o prazo do caso", !rotD.ques && rotD.concl === false && rotD.passos[0] === "📅 Atendimento de preparação", rotD);
  conf("e a ligação da véspera que o Marcos já pediu desmarca a mensagem da véspera", rotD.vesp === false, rotD);
  await p.evaluate(() => fecharCaixa());
  const antesD = T.eventos.filter(e => e.caso_id === DD.k.id).length;
  await p.evaluate(([k, d]) => extrairEvento(`Perícia agendada para ${d} às 8h40 na APS Centro.`, k), [DD.k.id, br(iso(9))]); await espera(200);
  conf("a anotação 'perícia agendada para…' não duplica a 'Perícia médica' do PAT", T.eventos.filter(e => e.caso_id === DD.k.id).length === antesD);
  conf("a importação do PAT conta o 'Perícia' como 'Perícia médica'", await p.evaluate(d => {
    const det = { eventos: [{ tipo: "Perícia médica", ativo: true, data: d, hora: "09:00" }] }, ja = [{ tipo: "Perícia", data_hora: d + "T09:00:00-03:00" }];
    return eventosNovos(det, evsComSinonimo(ja), hoje()).length === 0 && eventosNovos(det, ja, hoje()).length === 1; }, iso(30)));

  // ── E · julgamento não é perícia ─────────────────────────────────────────
  await ficha(E.c.id, E.k.id);
  const cE = await cartoes();
  conf("Prazos e compromissos chama o julgamento de julgamento", cE.some(c => c.tipo === "Julgamento" && c.data === br(iso(5))) && !cE.some(c => /Perícia/.test(c.tipo)), cE);
  conf("e Nas outras abas também", /Julgamento \d\d\/\d\d às 09:00/.test(await p.evaluate(() => (document.querySelector(".outras-abas") || {}).textContent || "")));
  await p.evaluate(() => { abaAtiva = 3; repintarFicha(); }); await espera(150);
  const cardE = await p.evaluate(id => { const l = document.querySelector(`li.tl-pericia[data-ev="${id}"]`); return l ? { est: l.querySelector(".per-est").textContent, txt: l.textContent } : null; }, EE.id);
  conf("o cartão do julgamento não pede aviso nem preparação", cardE && cardE.est === "sessão marcada" && !/Avisar cliente|Preparar/.test(cardE.txt), cardE);
  const msgE = await p.evaluate(id => lembreteDoEvento(id).texto, EE.id);
  conf("e o recado ao cliente fala da sessão de julgamento, sem 'leve documento'", /sessão de julgamento do seu recurso/.test(msgE) && !/documento com foto|exames/.test(msgE), msgE);

  // ── F · o laudo do PAT chega como documento: a conclusão e o CID no cartão ──
  await ficha(F.c.id, F.k.id, 3);
  const cardF = await p.evaluate(id => { const l = document.querySelector(`li.tl-pericia[data-ev="${id}"]`); return l ? { txt: l.textContent.replace(/\s+/g, " "), doc: !!l.querySelector(".tl-doc") } : null; }, EF.id);
  conf("o laudo do PAT aparece no cartão da perícia, com a conclusão e o CID", cardF && /Laudo de/.test(cardF.txt) && /sem incapacidade \(capaz\)/.test(cardF.txt) && /CID M75\.1/.test(cardF.txt) && cardF.doc, cardF);

  // ── o catálogo ─────────────────────────────────────────────────────────────
  conf("o catálogo tem os quesitos do JEF em 10 dias úteis (Lei 10.259, art. 12, § 2º)", await p.evaluate(() => { const x = PRAZOS_CATALOGO.find(i => i.id === "quesj"); return !!x && x.n === 10 && x.uteis && /10\.259/.test(x.base); }));

  conf("sem erro de página", !p._erros.length, p._erros);
  const bons = ok.filter(x => x[1]).length;
  console.log(`\n${bons}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(bons === ok.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
