// F236 · rodada final, frente agenda: o aviso ao cliente que vale (feito e depois do agendamento, a mesma regra dentro e
// fora da ficha), a pauta que vale no CRPS (a superada não se propõe em lugar nenhum), o aviso com um dono só, a
// confirmação da perícia numa linha só (sem "venceu"), a sustentação oral nos Prazos e no Meu Dia, a alçada da Junta no
// recurso especial, o prazo fatal no Calendário e no Planejado, o resumo da DCB, o prazo respondido, o MS decidido, a
// diligência do CRPS e a prorrogação propostas num clique. Banco simulado, dados fictícios. Uso: node f236-final-agenda.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";

// o tradutor do e-Recursos do próprio app
const CRPS = (() => {
  const src = fs.readFileSync(path.join(__dirname, "app.html"), "utf8"), i = src.indexOf("const CRPS = (() => {"), j = src.indexOf("\n})();", i);
  return new Function(src.slice(i, j + 6) + "\nreturn CRPS;")();
})();

const HOJE = new Date().toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });
const dia = n => { const d = new Date(HOJE + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const mais = (s, n) => { const d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const util = s => { let d = s; while ([0, 6].includes(new Date(d + "T12:00:00Z").getUTCDay())) d = mais(d, 1); return d; };
const br = s => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
const brA = s => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(2, 4)}`;
const pt = s => `${s.slice(8, 10)}.${s.slice(5, 7)}.${s.slice(0, 4)}`;
const ts = (n, h = "10:00") => `${dia(n)}T${h}:00-03:00`;

const EU = FIX.colaboradores[0].id;
const AUTH = { paulo: SESSAO.user.id, rita: "a4444444-4444-4444-4444-444444444444" };
const AM = "22222222-2222-2222-2222-222222222222", MA = "33333333-3333-3333-3333-333333333333", RI = "44444444-4444-4444-4444-444444444444",
  AN = "55555555-5555-5555-5555-555555555555", IN = "66666666-6666-6666-6666-666666666666";
const equipe = [{ ...FIX.colaboradores[0] },
  { id: AM, auth_id: "a2222222-2222-2222-2222-222222222222", nome: "Amanda Fictícia Garcez", inicial: "A", cor: "#1B6E38", papel: "colaborador", ativo: true, cargo: "advogado", setor: null },
  { id: MA, auth_id: "a3333333-3333-3333-3333-333333333333", nome: "Marcos Fictício Amorim", inicial: "M", cor: "#8F5400", papel: "colaborador", ativo: true, cargo: "advogado", setor: null },
  { id: RI, auth_id: AUTH.rita, nome: "Rita Fictícia Recepção", inicial: "R", cor: "#3A6491", papel: "colaborador", ativo: true, cargo: "recepcao", setor: null },
  { id: AN, auth_id: "a5555555-5555-5555-5555-555555555555", nome: "André Fictício Lopes", inicial: "D", cor: "#6B3FA0", papel: "colaborador", ativo: true, cargo: "estagiario", setor: null },
  { id: IN, auth_id: "a6666666-6666-6666-6666-666666666666", nome: "Ingrid Fictícia Prado", inicial: "I", cor: "#7A2E5A", papel: "colaborador", ativo: true, cargo: "estagiario", setor: null }];

const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais",
  "atribuicoes", "clientes", "casos"]) dados[t] = [];
Object.assign(dados, { colaboradores: equipe, documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;
let seq = 0;
const id = p => `${p}0000000-0000-0000-0000-${String(236900000000 + (++seq))}`;
function cliente(nome, caso, atr) {
  const c = { id: id("c"), nome, cpf: null, telefone: "(16) 99000-" + String(1000 + seq), telefones: [], campos: {}, criado_em: "2026-01-10T12:00:00Z" };
  const k = { id: id("b"), cliente_id: c.id, titulo: nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {}, marcadores: [],
    prazos_tribunal: [], ronda: {}, criado_em: "2026-01-10T12:00:00Z", importante: false, urgente: false, dcb_prorrogacao_pedida: false, ...caso };
  T.clientes.push(c); T.casos.push(k);
  for (const co of atr) T.atribuicoes.push({ caso_id: k.id, colaborador_id: co });
  return { c, k };
}
const ev = (k, o) => { const e = { id: id("d"), caso_id: k.id, status: "agendada", local: null, obs: null, ...o }; T.eventos.push(e); return e; };
const and = (k, o) => { const a = { id: id("e"), caso_id: k.id, origem: "app", autor_id: EU, excluir: false, publico: false, ...o }; T.andamentos.push(a); return a; };
const tarefa = (a, quem, lembrar, extra = {}) => { const t = { id: id("f"), andamento_id: a.id, caso_id: a.caso_id, colaborador_id: quem, atribuido_por: EU,
  lembrar_em: lembrar, concluida_em: null, natureza: "compromisso", papel: "executa", ...extra }; T.andamento_tarefas.push(t); return t; };
const evC = (s, hora, status) => ({ status, data: `${br(s)} ${hora}:00`, documentos: [] });
const nupF = n => `${n.slice(0, 5)}.${n.slice(5, 11)}/${n.slice(11, 15)}-${n.slice(15)}`;
const bloco = (nup, orgao, eventos) => ({ ...CRPS.traduzirProcesso({ proc: nup, numProc: nupF(nup), orgaoAtual: orgao, recorrentes: [], eventos }),
  nup, consultado_em: new Date().toISOString() });
const andsCrps = (k, b) => b.eventos.filter(e => !CRPS.TIPOS_SILENCIOSOS.has(e.tipo)).map(e => and(k, { origem: "crps", origem_id: `${b.nup}|${CRPS.chaveEvento(e)}`,
  texto: CRPS.comentarioDoEvento(e), criado_em: `${(CRPS.dataParaISO(e.data) || "").slice(0, 10)}T12:00:00Z` }));

// ── 1 e 3 · os avisos ─────────────────────────────────────────────────────────────────────────────────────────────
// L · a recepção prometeu ("avisamos quando marcar") antes do agendamento; depois dele, a promessa de novo; o 📞 Avisar
// do seguimento está aberto para a Ingrid: a perícia NÃO foi avisada, e a recepção não ganha um segundo "Avisar"
const L = cliente("Luciana Ficta Mendes", { fase: "inss", especie: "B31", beneficio: "Aux. Incapacidade Temporária", der: dia(-20), protocolos: ["1983002217"] }, [AM, IN]);
const EL = ev(L.k, { tipo: "Perícia médica", data_hora: ts(5, "08:20"), local: "APS Centro" });
and(L.k, { autor_id: RI, criado_em: ts(-6, "11:15"), texto: "Luciana ligou: está sem salário e perguntou se precisa ir à agência. Expliquei que o pedido está em análise e que avisamos quando marcar a perícia. Pediu retorno da advogada." });
and(L.k, { origem: "pat", origem_id: `evento:1983002217:pericia medica:${dia(5)}`, criado_em: ts(-2, "07:45"), texto: `📅 Perícia médica agendada no INSS para ${pt(dia(5))} às 08:20 — APS CENTRO.` });
and(L.k, { origem: "pat", origem_id: "48983002", criado_em: `${dia(-2)}T12:00:00+00:00`, texto: `INSS · Agendada perícia médica para ${br(dia(5))} às 08:20 na APS Ribeirão Preto - Centro.` });
and(L.k, { autor_id: AM, criado_em: ts(-1, "09:00"), texto: "Vamos avisar a cliente da perícia amanhã." });
const AV_L = and(L.k, { criado_em: ts(0, "08:05"), texto: `📞 Avisar Luciana que a perícia médica foi agendada para ${pt(dia(5))} às 08:20 — oferecer atendimento de preparação antes. @Ingrid` });
const TF_L = tarefa(AV_L, IN, HOJE);
// J · o aviso feito, anotado no To Do um dia depois do agendamento do PAT
const J = cliente("Joaquim Ficto Barbosa", { fase: "inss", especie: "B31", beneficio: "Aux. Incapacidade Temporária", der: dia(-20), protocolos: ["1790031245"] }, [AM, AN]);
const EJ = ev(J.k, { tipo: "Perícia médica", data_hora: ts(9, "08:40"), local: "APS Centro" });
and(J.k, { origem: "pat", origem_id: `evento:1790031245:pericia medica:${dia(9)}`, criado_em: ts(-12, "07:45"), texto: `📅 Perícia médica agendada no INSS para ${pt(dia(9))} às 08:40 — APS CENTRO.` });
and(J.k, { origem: "todo", autor_id: AM, criado_em: ts(-11, "12:00"), texto: "Avisei o cliente por WhatsApp sobre a perícia marcada pelo INSS; ele confirmou presença e vai levar atestados, exames e receitas." });
const CNIS_J = and(J.k, { autor_id: MA, criado_em: ts(-5, "10:00"), texto: `Conferi o CNIS: vínculo ativo desde 04/02/2019; qualidade e carência em ordem. @André, ligue para o cliente na véspera da perícia (${br(dia(8))}) e confirme que ele vai levar a indicação de cirurgia.` });
tarefa(CNIS_J, AN, dia(8));
// J2 · "avisei" ANTES do agendamento não vale para a perícia marcada depois
const J2 = cliente("Jair Ficto Pontes", { fase: "inss", especie: "B31", beneficio: "Aux. Incapacidade Temporária", der: dia(-25), protocolos: ["1790031299"] }, [AM]);
const EJ2 = ev(J2.k, { tipo: "Perícia médica", data_hora: ts(8, "09:00"), local: "APS Centro" });
and(J2.k, { origem: "todo", autor_id: AM, criado_em: ts(-9, "12:00"), texto: "Avisei o cliente de que a perícia ainda será marcada pelo INSS." });
and(J2.k, { origem: "pat", origem_id: `evento:1790031299:pericia medica:${dia(8)}`, criado_em: ts(-5, "07:45"), texto: `📅 Perícia médica agendada no INSS para ${pt(dia(8))} às 09:00.` });
// M · sem aviso nem tarefa: a recepção avisa
const M = cliente("Marta Ficta Lima", { fase: "inss", especie: "B31", beneficio: "Aux. Incapacidade Temporária", der: dia(-30) }, [AM]);
const EM = ev(M.k, { tipo: "Perícia médica", data_hora: ts(3, "10:00"), local: "APS Centro" });
// N · o 📞 Avisar aberto para a Ingrid; quem avisa é a recepção, fora da ficha: os dois baixam
const N = cliente("Nair Ficta Souto", { fase: "inss", especie: "B31", beneficio: "Aux. Incapacidade Temporária", der: dia(-30) }, [AM, IN]);
const EN = ev(N.k, { tipo: "Perícia médica", data_hora: ts(4, "10:00"), local: "APS Centro" });
const AV_N = and(N.k, { criado_em: ts(-1, "08:00"), texto: `📞 Avisar Nair que a perícia médica foi agendada para ${pt(dia(4))} às 10:00 — oferecer atendimento de preparação antes. @Ingrid` });
const TF_N = tarefa(AV_N, IN, HOJE);

// ── 2 e 5 · a pauta do CRPS remarcada ─────────────────────────────────────────────────────────────────────────────
const NUP_P = "44233498877202631", S0 = util(dia(5)), S1 = util(mais(S0, 2));
const blP = bloco(NUP_P, "10ª Junta de Recursos", [
  evC(dia(-130), "10:32", "Requerimento protocolado - Tarefa de Recurso Ordinário - 997812340"),
  evC(dia(-107), "00:09", "Encaminhamento automático - 21031080 para CRPS"),
  evC(dia(-41), "15:27", "Distribuído ao Conselheiro Relator - Conselheiro: MARIA FICTICIA DUTRA"),
  evC(dia(-5), "17:02", "Para inclusão em pauta"),
  evC(dia(-4), "08:15", `Sessão de Julgamento Ordinária - Nº 0187/2026 - ${brA(S0)} 09:00`),
  evC(dia(-1), "18:40", `Alterada a Data/Hora da Sessão de Julgamento - De: ${brA(S0)} 09:00 - Para: ${brA(S1)} 09:00`)]);
const P = cliente("Aparecida Ficta Nogueira", { fase: "conselho", origem_lista: "🖥 Conselho de Recursos", especie: "B88", beneficio: "BPC/LOAS — idoso",
  der: dia(-200), decisao_em: dia(-150), resultado: "indeferido", ro_protocolado_em: dia(-130), crps_nups: [NUP_P], crps: [blP] }, [AM, EU]);
const ANDS_P = andsCrps(P.k, blP);
const A_S0 = ANDS_P.find(a => new RegExp(`Pautado para julgamento em ${br(S0)}`).test(a.texto)), A_S1 = ANDS_P.find(a => /remarcada/.test(a.texto));

// ── 6 · a alçada da Junta: a PMF ouvida faz o acórdão definitivo, mesmo sem o resumo dizer "alçada" ─────────────────
const negativa = (pmf) => [evC(dia(-180), "17:21", "Requerimento protocolado - Tarefa de Recurso Ordinário - 998765102"),
  ...(pmf ? [evC(dia(-99), "10:05", "Solicitação de parecer do Perito Médico Federal"), evC(dia(-99), "10:06", "Encaminhamento - (7ª JR para PMF)"),
    evC(dia(-56), "16:13", "Informações obtidas PMF")] : []),
  evC(dia(-10), "11:47", "Conhecer do Recurso e negar-lhe provimento, por unanimidade - Acórdão: 7ª JR/6120/2026")];
const R = cliente("Reinaldo Ficto Bastos", { fase: "conselho", origem_lista: "🖥 Conselho de Recursos", especie: "B31", beneficio: "Aux. Incapacidade Temporária",
  decisao_em: dia(-10), resultado: "indeferido", ro_protocolado_em: dia(-180), crps_nups: ["44233476201202611"], crps: [bloco("44233476201202611", "7ª Junta de Recursos", negativa(true))] }, [AM]);
const R2 = cliente("Rosa Ficta Bastos", { fase: "conselho", origem_lista: "🖥 Conselho de Recursos", especie: "B31", beneficio: "Aux. Incapacidade Temporária",
  decisao_em: dia(-10), resultado: "indeferido", ro_protocolado_em: dia(-180), crps_nups: ["44233476201202612"], crps: [bloco("44233476201202612", "7ª Junta de Recursos", negativa(false))] }, [AM]);

// ── r12 · o "Concluir em" do To Do no dia do recurso especial (U) e o prazo fatal sozinho (V) ───────────────────────
const NUP_U = "44233487310202622";
const U = cliente("Luzia Ficta Ramalho", { fase: "conselho", origem_lista: "🖥 Conselho de Recursos", especie: "B21", beneficio: "Pensão por Morte",
  decisao_em: dia(-20), resultado: "indeferido", ro_protocolado_em: dia(-185), crps_nups: [NUP_U], crps: [bloco(NUP_U, "12ª Junta de Recursos", [
    evC(dia(-185), "14:06", "Requerimento protocolado - Tarefa de Recurso Ordinário - 997654321"),
    evC(dia(-20), "10:58", "Conhecer do Recurso e negar-lhe provimento, por unanimidade - Acórdão: 12ª JR/5873/2026")])] }, [AM, EU]);
const V = cliente("Valdir Ficto Nogueira", { fase: "judicial", origem_lista: "👪 Judicial", especie: "B31", beneficio: "Aux. Incapacidade Temporária", prazo: dia(6), lembrar_motivo: "Redigir as razões" }, [AM, EU]);

// ── r12 · a DCB: o prazo fatal do resumo é a janela da prorrogação (W); com a janela aberta, tarefa e mensagem (W2) ───
const W = cliente("Wilson Ficto Prado", { fase: "inss", especie: "B31", beneficio: "Aux. Incapacidade Temporária", der: dia(-90), dib: dia(-80), dcb: dia(60), situacao_inss: "Concluída - Deferida" }, [AM]);
tarefa(and(W.k, { autor_id: AM, criado_em: ts(-3, "10:00"), texto: "Conferir o extrato de pagamento no Meu INSS." }), AM, dia(5));   // o próximo é outro: o resumo mostra o prazo fatal à parte
const W2 = cliente("Edson Ficto Rezende", { fase: "inss", especie: "B31", beneficio: "Aux. Incapacidade Temporária", der: dia(-90), dib: dia(-80), dcb: dia(10), situacao_inss: "Concluída - Deferida" }, [AM]);

// ── 4 · a perícia que passou sem confirmação (S); o laudo já no processo cala o Meu Dia (K) ─────────────────────────
const S = cliente("Sueli Ficta Bernardes", { fase: "inss", especie: "B31", beneficio: "Aux. Incapacidade Temporária", der: dia(-40), protocolos: ["1781200001"] }, [AM, IN]);
const ES = ev(S.k, { tipo: "Perícia médica", data_hora: ts(-12, "09:20"), local: "APS Sertãozinho" });
const PROC_K = "5003456-46.2026.4.03.6302";
const K = cliente("Marlene Ficta Duarte", { fase: "judicial", origem_lista: "👪 Judicial", especie: "B31", beneficio: "Aux. Incapacidade Temporária", processo: PROC_K }, [AM]);
const EK = ev(K.k, { tipo: "Perícia", data_hora: ts(-10, "13:00"), local: "JEF" });
and(K.k, { origem: "pje", origem_id: "mov:k1", criado_em: ts(-3, "18:10"), texto: `PJe (1º grau): Juntada de Laudo Pericial — em ${pt(dia(-3))} 13:40 — PJEC ${PROC_K}` });

// ── extras · o prazo do tribunal respondido (X) e a pergunta que não é resposta (X2) ────────────────────────────────
const prazoAto = (proc) => [{ numero: proc, ato: "Ato Ordinatório", ato_id: "9780550", dias: 10, expedido_em: dia(-12), ciencia_em: dia(-10), fim: dia(4),
  situacao: "aberto", sistema: "pje", origem: "pje:pje1g", lido_em: ts(-9, "07:20") }];
const X = cliente("Rosângela Ficta Albuquerque", { fase: "judicial", origem_lista: "👪 Judicial", especie: "B31", beneficio: "Aux. Incapacidade Temporária",
  processo: "5009781-11.2026.4.03.6302", prazos_tribunal: prazoAto("5009781-11.2026.4.03.6302") }, [MA]);
and(X.k, { autor_id: MA, criado_em: ts(-6, "17:30"), texto: "Manifestação sobre o laudo protocolada: concordância com a conclusão e pedido de julgamento." });
const X2 = cliente("Claudinei Ficto Prates", { fase: "judicial", origem_lista: "👪 Judicial", especie: "B31", beneficio: "Aux. Incapacidade Temporária",
  processo: "5009204-59.2026.4.03.6302", prazos_tribunal: prazoAto("5009204-59.2026.4.03.6302") }, [MA]);
and(X2.k, { autor_id: AN, criado_em: ts(-6, "11:00"), texto: "@Marcos, apresentamos quesitos complementares e indicamos assistente técnico?" });
// ── extras · a mora com o mandado de segurança já decidido (Y) e sem ele (Y2) ───────────────────────────────────────
const Y = cliente("Antônio Ficto Calixto", { fase: "inss", especie: "B41", beneficio: "Apos. por Idade", der: dia(-130), protocolos: ["1655409821"] }, [MA]);
T.tarefas.push({ id: id("t"), cliente_id: Y.c.id, caso_id: Y.k.id, titulo: "Redigir o mandado de segurança por mora (B41 parado desde a DER)", prazo: dia(3), concluida: false, particular_de: null });
const Y2 = cliente("Benedito Ficto Calixto", { fase: "inss", especie: "B41", beneficio: "Apos. por Idade", der: dia(-130), protocolos: ["1655409822"] }, [MA]);
// ── extras · a diligência do CRPS (Z) ───────────────────────────────────────────────────────────────────────────────
const NUP_Z = "44233512904202656";
const PEDIDO_Z = `Em cumprimento à diligência da 1ª Composição Adjunta da 16ª Junta de Recursos (recurso ${nupF(NUP_Z)}), apresentar no prazo de 30 (trinta) dias, pelo Meu INSS: 1) documentos em nome da requerente ou do cônjuge que indiquem a atividade rural de 11/2010 até a DER (notas fiscais de produtor, contrato de arrendamento ou comodato com firma reconhecida, ITR/CCIR, declaração de aptidão ao PRONAF ou CAF, comprovantes de mensalidade do sindicato); 2) autodeclaração do segurado especial atualizada; 3) nome, endereço e CPF das testemunhas, para eventual Justificação Administrativa.`;
const Z = cliente("Benedita Ficta Carvalho", { fase: "conselho", origem_lista: "🖥 Conselho de Recursos", especie: "B41", beneficio: "Apos. por Idade Rural",
  der: dia(-330), ro_protocolado_em: dia(-232), crps_nups: [NUP_Z], exigencia_prazo: dia(18),
  exigencia_descricao: `${PEDIDO_Z.slice(0, 240)} · prazo estimado: 30 dias do ato de ${pt(dia(-12))} no PAT (a ciência não vem do portal)`,
  crps: [bloco(NUP_Z, "AGÊNCIA DA PREVIDÊNCIA SOCIAL CEAB RECONHECIMENTO DE DIREITO DA SRI", [
    evC(dia(-232), "15:11", "Requerimento protocolado - Tarefa de Recurso Ordinário - 998431207"),
    evC(dia(-204), "00:12", "Encaminhamento automático - 21031080 para CRPS"),
    evC(dia(-14), "11:25", "Solicitação de Diligência"),
    evC(dia(-12), "17:15", "Solicitação de Providências Complementares (via canais remotos) - Alterado o status da tarefa: 998431207")])] }, [AM]);
and(Z.k, { origem: "pat", origem_id: "48931104", criado_em: `${dia(-12)}T12:00:00+00:00`, texto: `INSS · ${PEDIDO_Z}` });
// ── extras · o prazo fatal diz a frase da data (Q) ──────────────────────────────────────────────────────────────────
const Q = cliente("Valdir Ficto Teixeira", { fase: "peticao_inicial", origem_lista: "⚖️ Petições Iniciais", especie: "B31", beneficio: "Aux. Incapacidade Temporária", prazo: dia(6) }, [AM, EU]);
const ORDEM_Q = and(Q.k, { criado_em: ts(-10, "09:00"), texto: `@Amanda, redija a inicial até ${br(dia(3))}; @Paulo revisa até ${br(dia(5))}; protocolamos até ${br(dia(6))}.` });
tarefa(ORDEM_Q, AM, dia(3));
tarefa(ORDEM_Q, EU, dia(5), { papel: "revisa" });
// ── extras · a RPV expedida e não paga (G), o prazo de manifestar sobre o laudo (H), a sentença favorável com a apelação do INSS (F) ──
const G = cliente("Maria Aparecida Ficta Lemes", { fase: "pagamento", origem_lista: "💵 Pagamentos", especie: "B41", beneficio: "Apos. por Idade",
  processo: "5001111-22.2025.4.03.6302", datajud: { marcos: { requisitorio: { data: dia(-15) } } } }, [AM]);
const PROC_H = "5003456-46.2026.4.03.6309", DIG_H = PROC_H.replace(/\D/g, "");
const H = cliente("Marlene Ficta Duarte Segunda", { fase: "judicial", origem_lista: "👪 Judicial", especie: "B31", beneficio: "Aux. Incapacidade Temporária", processo: PROC_H,
  prazos_tribunal: [{ numero: PROC_H, ato: "Ato Ordinatório", ato_id: "41029911", dias: 10, expedido_em: dia(-3), ciencia_em: dia(-1), fim: dia(12), situacao: "aberto", sistema: "pje", origem: "pje:pje1g", lido_em: ts(-1, "07:20") }] }, [AM]);
T.anexos.push({ id: id("a"), caso_id: H.k.id, cliente_id: H.c.id, andamento_id: null, origem: "pje", nome: "Laudo Pericial", caminho: `pje/${DIG_H}/41029876`, tipo: "application/pdf", paginas: 3,
  criado_em: ts(-3, "13:00"), texto: "LAUDO MÉDICO PERICIAL\n4. CONCLUSÃO: a autora tem síndrome do túnel do carpo bilateral (CID G56.0), tratada cirurgicamente à direita com boa evolução. Não foi constatada incapacidade para a atividade habitual de costureira na data do exame.\nQUESITOS DO JUÍZO: 1. Há doença? Sim." },
  { id: id("a"), caso_id: H.k.id, cliente_id: H.c.id, andamento_id: null, origem: "pje", nome: "Ato Ordinatório", caminho: `pje/${DIG_H}/41029911`, tipo: "application/pdf", paginas: 1,
  criado_em: ts(-2, "08:05"), texto: "ATO ORDINATÓRIO\nNos termos da portaria deste Juizado, ficam as partes intimadas a se manifestarem sobre o laudo pericial anexado, no prazo de 10 (dez) dias." });
and(H.k, { origem: "pje", origem_id: `prazo:${PROC_H}|41029911|${dia(-3)}`, criado_em: ts(-1, "07:20"), texto: `⏰ Prazo no PJe: Ato Ordinatório (10 dias) — vence em ${pt(dia(12))}.` });
const PROC_F = "5002781-11.2025.4.03.6302";
const F = cliente("Rosângela Ficta Siqueira", { fase: "judicial", origem_lista: "👪 Judicial", especie: "B31", beneficio: "Aux. Incapacidade Temporária", processo: PROC_F }, [AM]);
const SENT_F = and(F.k, { origem: "pje", origem_id: "mov:f1", criado_em: ts(-60, "18:00"), texto: `PJe (1º grau): Julgado procedente o pedido — em ${pt(dia(-60))} 14:10 — PJEC ${PROC_F}` });
and(F.k, { origem: "pje", origem_id: "mov:f2", criado_em: ts(-40, "18:00"), texto: `PJe (1º grau): Juntada de Petição de apelação — em ${pt(dia(-40))} 10:00 — PJEC ${PROC_F}` });

const ok = [];
const conf = (nome, v, extra) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome + (!v && extra !== undefined ? `  → ${JSON.stringify(extra).slice(0, 500)}` : "")); };

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const erros = [];
  async function entrar(quem) {
    const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
    const sess = { ...SESSAO, user: { ...SESSAO.user, id: AUTH[quem] } };
    await ctx.addInitScript(([u, ss]) => {
      localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
      localStorage.setItem("crm_sessao", JSON.stringify(ss));
      localStorage.setItem("crm_tema", "v10");
      window.open = () => null;
    }, [SUPA, sess]);
    await instalarBanco(ctx, { SUPA, SESSAO: sess, banco });
    const p = await ctx.newPage();
    p.on("pageerror", e => erros.push(`${quem}: ${e.message}`));
    p.on("dialog", d => d.accept());
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
    await p.waitForSelector("#app.logado", { timeout: 15000 });
    await p.waitForFunction(() => typeof D !== "undefined" && D._completo === true && D.cliPorId && D.cliPorId.size > 0);
    await p.waitForTimeout(400);
    return p;
  }
  const espera = (p, ms) => p.waitForTimeout(ms);
  const ficha = async (p, cli, caso) => { await p.evaluate(async ([c, k]) => { await abrirFicha(c); casoSel = k; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); }, [cli, caso]); await espera(p, 300); };
  const linhas = (p, k) => p.evaluate(kid => linhasDeDatas(D.casoPorId.get(kid).cliente_id).linhas.filter(x => x.casoId === kid)
    .map(x => ({ rotulo: x.rotulo || "", curto: x.curto || "", data: x.data, nat: x.natureza || "", resumo: x.resumo || "", acao: x.acao || "", conf: !!x.aConfirmar,
      rot: String(x.rot || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") })), k.id);
  const cartoes = p => p.evaluate(() => [...document.querySelectorAll(".caso-esq .faixa-prazos .pz")].map(c => ({ tipo: c.dataset.tipo, data: c.dataset.data.split("-").reverse().join("/"),
    rel: (c.querySelector(".pz-rel") || {}).textContent || "", cls: c.className, txt: c.textContent.replace(/\s+/g, " ").trim() })));
  const resumo = p => p.evaluate(() => (document.querySelector(".caso-esq .faixa-prazos") || {}).textContent || "");
  const itens = (p, col) => p.evaluate(c => itensAgenda(c).map(i => ({ cli: (i.cli || {}).id || null, data: i.data, selo: i.selo || "", resumo: i.resumo || "",
    fatal: !!i.fatal, prazo: !!i.prazo, conf: !!i.evPassado, avisar: i.avisar ? i.avisar.id : null })), col);

  // ══ PAULO ═════════════════════════════════════════════════════════════════════════════════════════════════════
  const paulo = await entrar("paulo");
  // as anotações dos casos que a agenda lê fora da ficha chegam numa busca: a primeira passada pede, a segunda lê
  await paulo.evaluate(() => { itensAgenda(null); renderAgenda(); itensDoCalendario(); }); await espera(paulo, 900);

  // ── 1 · o aviso que vale ──────────────────────────────────────────────────────────────────────────────────────
  const fe = await paulo.evaluate(() => typeof avisoFeito !== "function" ? { feito: [], promessa: [true] } : ({
    promessa: ["Expliquei que o pedido está em análise e que avisamos quando marcar a perícia.", "Vamos avisar a cliente da perícia.", "Avisaremos a cliente da perícia.",
      "A cliente será avisada da perícia.", "A cliente não foi avisada da perícia.", "Precisa avisar o cliente da perícia."].map(t => avisoFeito(dsa(t))),
    feito: ["Avisei o cliente da perícia.", "Cliente avisada da perícia por WhatsApp.", "Ele confirmou presença na perícia.", "Avisamos a cliente da perícia hoje."].map(t => avisoFeito(dsa(t))) }));
  conf("o aviso FEITO conta ('avisei', 'cliente avisada', 'confirmou presença'); a promessa e a negação, não",
    fe.feito.every(Boolean) && !fe.promessa.some(Boolean), fe);
  await ficha(paulo, L.c.id, L.k.id);
  const lL = await linhas(paulo, L.k);
  conf("a promessa da recepção, anterior ao agendamento, não dá a perícia por avisada: 'Perícia · avisar'",
    lL.some(x => x.rotulo === "Perícia · avisar" && x.data === dia(5)) && await paulo.evaluate(id => avisoDoEvento(D.eventos.find(e => e.id === id)) === null, EL.id), lL.map(x => x.rotulo));
  await paulo.evaluate(() => { abaAtiva = 3; repintarFicha(); }); await espera(paulo, 200);
  const cardL = await paulo.evaluate(id => { const l = document.querySelector(`li.tl-pericia[data-ev="${id}"]`); return l ? l.querySelector(".per-est").textContent : null; }, EL.id);
  conf("o cartão da perícia pede o aviso (não diz 'cliente avisado · Rita')", cardL === "avisar o cliente", cardL);
  await ficha(paulo, J.c.id, J.k.id);
  const lJ = await linhas(paulo, J.k);
  const avJ = await paulo.evaluate(id => avisoDoEvento(D.eventos.find(e => e.id === id)), EJ.id);
  conf("o aviso feito depois do agendamento vale: 'Perícia · avisado' por Amanda", lJ.some(x => x.rotulo === "Perícia · avisado") && avJ && avJ.quem === "Amanda", { avJ, r: lJ.map(x => x.rotulo) });
  conf("a tarefa diz o pedido feito à pessoa, e não o começo da anotação (André: ligue… véspera)",
    lJ.some(x => /^André: ligue para o cliente na véspera da perícia/.test(x.resumo)), lJ.map(x => x.resumo));
  const rJul = await paulo.evaluate(() => [resumoAgenda("⚖️ Julgamento agendado para 04.11.2026 às 08:00. Verificar o resultado no dia seguinte."),
    resumoAgenda("Perícia agendada para 23.10.2026 às 08:20. Cliente avisada por WhatsApp.")]);
  conf("a tarefa do 'Julgamento agendado… Verificar o resultado' diz a ordem (o registro vem depois); a nota só de registro fica igual",
    /^verificar o resultado no dia seguinte — julgamento agendado para 04\.11\.2026/.test(rJul[0]) && /^perícia agendada para 23\.10\.2026/.test(rJul[1]), rJul);
  await ficha(paulo, J2.c.id, J2.k.id);   // com as anotações dele na ficha
  const avJ2 = await paulo.evaluate(id => avisoDoEvento(D.eventos.find(e => e.id === id)), EJ2.id);
  conf("o 'avisei' anterior ao agendamento não vale para a perícia marcada depois", avJ2 === null, avJ2);
  // uma regra só: com a ficha de outro cliente aberta, o aviso do Joaquim sai igual (das anotações buscadas pela agenda)
  await ficha(paulo, M.c.id, M.k.id);
  const fora = await paulo.evaluate(([j, l]) => ({ j: !!avisoDoEvento(D.eventos.find(e => e.id === j)), l: !!avisoDoEvento(D.eventos.find(e => e.id === l)) }), [EJ.id, EL.id]);
  conf("a mesma regra fora da ficha: Joaquim avisado, Luciana não, com a ficha de outra cliente aberta", fora.j && !fora.l, fora);
  await paulo.evaluate(() => { visao = "agenda"; fecharFicha(false); render(); }); await espera(paulo, 300);
  const ag = await paulo.evaluate(() => [...document.querySelectorAll("#conteudo-meio .evento")].map(e => e.textContent.replace(/\s+/g, " ")));
  conf("a lista 🩺 lê o aviso anotado (Joaquim: '📞 avisado ✓') e diz quantos dias faltam",
    ag.some(t => /Joaquim/.test(t) && /📞 avisado ✓/.test(t) && /faltam 9 dias/.test(t)) && ag.some(t => /Luciana/.test(t) && !/avisado ✓/.test(t)), ag.filter(t => /Joaquim|Luciana/.test(t)));

  // ── 2 · a pauta que vale ──────────────────────────────────────────────────────────────────────────────────────
  const proc = await paulo.evaluate(k => periciasDoProcesso(D.novid || []).filter(x => x.k.id === k).map(x => x.ev.data), P.k.id);
  conf("a perícia/julgamento do processo propõe só a sessão que vale (a remarcada), nunca a pauta superada", proc.length === 1 && proc[0] === S1, { proc, S0, S1 });
  const marc = await paulo.evaluate(() => [...document.querySelectorAll("#conteudo-meio .evento.confirmar")].map(e => e.textContent.replace(/\s+/g, " ")).filter(t => /Aparecida/.test(t)));
  conf("na lista 🩺, 'Marcadas nos processos' tem a Aparecida uma vez só, na data nova", marc.length === 1 && marc[0].includes(br(S1).slice(0, 5).replace("/", ".")) , marc);
  const nov = await paulo.evaluate(() => { visao = "novidades"; render(); const m = document.getElementById("conteudo-meio");
    const sec = [...m.querySelectorAll("h3.secao")].find(h => /a agendar/.test(h.textContent));
    const lin = []; for (let el = sec && sec.nextElementSibling; el && !el.matches("h3"); el = el.nextElementSibling) lin.push(el.textContent.replace(/\s+/g, " "));
    return { lin, ler: (document.getElementById("ler-tudo") || {}).textContent || "", nPer: (document.getElementById("agendar-tudo") || {}).textContent || "" }; });
  conf("nas Novidades, o 'a agendar' traz a remarcação e não a pauta antiga", nov.lin.filter(t => /Aparecida/.test(t)).length === 1 && nov.lin.some(t => /remarcada/.test(t)) && !nov.lin.some(t => new RegExp(`Pautado para julgamento em ${br(S0)}`).test(t)), nov);
  conf("'marcar como lidas' leva só o informativo (o que pede ação fica)", /marcar as informativas como lidas/.test(nov.ler), nov.ler);
  const ipP = await itens(paulo, EU);
  const pauta = ipP.find(i => i.cli === P.c.id && i.selo === "Pauta");
  const sustAte = await paulo.evaluate(s => uteisAntes(s, 3), S1);
  conf("o Meu Dia traz a pauta na data limite da sustentação oral e diz até quando, sem mandar avisar o cliente do julgamento",
    pauta && pauta.data === sustAte && new RegExp(`pedir a sustentação oral até ${pt(sustAte).slice(0, 5)}`).test(pauta.resumo) && new RegExp(pt(S1).slice(0, 5)).test(pauta.resumo) && !/avisar o cliente/.test(pauta.resumo), pauta);
  await ficha(paulo, P.c.id, P.k.id);
  const lP = await linhas(paulo, P.k);
  conf("Prazos e compromissos: um julgamento a agendar só, na sessão que vale", lP.filter(x => /a agendar/.test(x.rotulo)).length === 1 && lP.some(x => /a agendar/.test(x.rotulo) && x.data === S1), lP.map(x => `${x.rotulo}@${x.data}`));
  const menuP = await paulo.evaluate(() => [...document.querySelectorAll(".menu-topo .mt")].map(b => b.textContent.trim()).join(" | "));
  conf("a aba Perícias não conta o julgamento como perícia a agendar", !/a agendar/.test(menuP), menuP);
  const infos = await paulo.evaluate(([a0, a1]) => { const i0 = infoOficial({ and: D._andsFicha.find(a => a.id === a0) }), i1 = infoOficial({ and: D._andsFicha.find(a => a.id === a1) });
    return { d0: i0.destaque, m0: (i0.menu || []).join(""), d1: i1.destaque }; }, [A_S0.id, A_S1.id]);
  conf("o cartão da pauta antiga não oferece agendar; o da remarcação traz o julgamento e a sustentação oral num clique",
    !infos.d0 && !/Agendar/.test(infos.m0) && /Agendar julgamento com aviso/.test(infos.d1) && /sustentação oral até/.test(infos.d1), infos);

  // ── 5 · a sustentação oral nos Prazos ─────────────────────────────────────────────────────────────────────────
  const sust = lP.find(x => x.rotulo === "Sustentação oral");
  conf("a sustentação oral entra em Prazos e compromissos na data limite do Regimento (art. 81, III), com a proposta num clique",
    sust && sust.data === sustAte && /art\. 81, III/.test(sust.rot) && /propostaSustentacao/.test(sust.acao), sust);
  const cP = await cartoes(paulo);
  // F254 · o próximo é o primeiro da faixa que ainda vem (a ordem é crescente); o título quebra a linha, não é cortado
  const proxP = cP.find(c => !/pz-venceu|pz-confirmar/.test(c.cls));
  // F275 · a linha mostra só a data e o abrir; o título fica no passar do mouse e no painel
  conf("o PRÓXIMO é a sustentação (e não a pauta antiga), com o título no passar do mouse",
    proxP && proxP.tipo === "Sustentação oral" && await paulo.evaluate(() => { const c = [...document.querySelectorAll(".caso-esq .pz")].find(x => x.dataset.tipo === "Sustentação oral");
      return !!c && /Sustentação oral/.test(c.title); }), proxP);
  await paulo.evaluate(k => propostaSustentacao(k), P.k.id); await espera(paulo, 700);
  const tSust = T.andamentos.find(a => a.caso_id === P.k.id && /^🎙 Sustentação oral no julgamento de/.test(a.texto || ""));
  const tfSust = tSust && T.andamento_tarefas.find(t => t.andamento_id === tSust.id);
  const lP2 = await linhas(paulo, P.k);
  conf("o clique cria a tarefa com a data limite e a linha da proposta sai (fica a tarefa)", tfSust && tfSust.lembrar_em === sustAte && !lP2.some(x => x.rotulo === "Sustentação oral"), { tf: tfSust, r: lP2.map(x => x.rotulo) });
  // o agendar em lote agenda só a sessão que vale
  await paulo.evaluate(async () => { fecharFicha(false); await periciasEmLote(); }); await espera(paulo, 800);
  const julgP = T.eventos.filter(e => e.caso_id === P.k.id && e.tipo === "Julgamento").map(e => e.data_hora.slice(0, 10));
  conf("o agendar em lote das Novidades agenda o julgamento só na sessão que vale", julgP.length === 1 && julgP[0] === S1, julgP);
  await ficha(paulo, P.c.id, P.k.id);
  const lP3 = await linhas(paulo, P.k);
  conf("agendado o julgamento, nenhum 'a agendar' fica (nem o da data antiga)", !lP3.some(x => /a agendar/.test(x.rotulo)) && lP3.some(x => x.rotulo === "Julgamento" && x.data === S1), lP3.map(x => `${x.rotulo}@${x.data}`));

  // ── 4 · a confirmação da perícia numa linha só ────────────────────────────────────────────────────────────────
  await ficha(paulo, S.c.id, S.k.id);
  const lS = await linhas(paulo, S.k);
  const cS = await cartoes(paulo), rS = await resumo(paulo);
  conf("a perícia que passou é UMA linha (sem a do prazo parado), na data dela, com a conta de quando o INSS decide",
    lS.filter(x => x.conf).length === 1 && !lS.some(x => x.rotulo === "Prazo de análise parado") && lS.some(x => x.rotulo === "Compareceu?" && x.data === dia(-12) && /o INSS decide até/.test(x.rot) && x.curto === "Confirmar a perícia"), lS.map(x => `${x.rotulo}@${x.data}`));
  conf("ela não 'venceu': diz há quantos dias, pede o clique e não entra na conta dos vencidos",
    cS.some(c => c.tipo === "Compareceu?" && /Confirmar a perícia/.test(c.txt) && !/pz-venceu/.test(c.cls)) && /A confirmar\s*1/.test(rS) && !/Vencidas/.test(rS), { cS, rS });
  const clS = await paulo.evaluate(k => quadroDatas(D.casoPorId.get(k)), S.k.id);
  conf("no clássico também: a linha da perícia não diz 'venceu'", !/venceu/.test(clS) && /aconteceu\? Confirme/.test(clS));

  // ── 6 · a alçada da Junta ─────────────────────────────────────────────────────────────────────────────────────
  const alc = await paulo.evaluate(([r, r2]) => ({ r: recorrerAte(D.casoPorId.get(r)), a: alcadaJunta(D.casoPorId.get(r)), r2: recorrerAte(D.casoPorId.get(r2)), a2: alcadaJunta(D.casoPorId.get(r2)) }), [R.k.id, R2.k.id]);
  conf("acórdão negativo da Junta com a PMF ouvida (alçada certa): sem 'Recorrer até', mesmo sem o resumo dizer alçada", alc.a === "certa" && alc.r === null, alc);
  conf("sem a PMF (alçada só provável), o recurso especial continua armado", alc.a2 !== "certa" && !!alc.r2, alc);

  // ── r12 · o prazo fatal no Calendário e no Planejado ──────────────────────────────────────────────────────────
  const fus = await paulo.evaluate(([u, v]) => { const k = D.casoPorId.get(u); k.prazo = recorrerAte(k); const cu = k.cliente_id, cv = D.casoPorId.get(v).cliente_id;
    const cal = itensDoCalendario(); return { prazo: k.prazo, calU: cal.filter(i => i.cliId === cu && i.dia === k.prazo).map(i => `${i.tipo}:${i.texto}`), calV: cal.filter(i => i.cliId === cv).map(i => i.tipo) }; }, [U.k.id, V.k.id]);
  const ipU = (await itens(paulo, null)).filter(i => i.cli === U.c.id && i.data === fus.prazo);
  conf("o recurso especial e o 'Concluir em' do mesmo dia são UM item no Planejado, com o selo de prazo fatal", ipU.length === 1 && ipU[0].fatal && ipU[0].selo === "Prazo do recurso", ipU);
  conf("e um item no Calendário, na cor de prazo", fus.calU.length === 1 && /^prazo:/.test(fus.calU[0]), fus.calU);
  conf("o prazo fatal sozinho vai ao Calendário na cor de prazo (não no azul do lembrete)", fus.calV.includes("prazo") && !fus.calV.includes("lembre"), fus.calV);

  // ── r12 · a DCB: o resumo dá o prazo fatal à janela da prorrogação ────────────────────────────────────────────
  await ficha(paulo, W.c.id, W.k.id);
  const rW = await resumo(paulo);
  conf("o prazo fatal em destaque é a janela da prorrogação, e não a DCB", /Pedir a prorrogação[^\n]*\s*abrir\s*Prazo fatal: [^\n]*úteis/.test(rW) && !/(DCB|Benefício cessa)[^\n]*\s*abrir\s*Prazo fatal:/.test(rW), rW);
  await ficha(paulo, W2.c.id, W2.k.id);
  const lW2 = await linhas(paulo, W2.k), jan = lW2.find(x => x.rotulo === "Pedir a prorrogação");
  conf("com a janela aberta: o resumo não repete a data, e a linha traz a tarefa e a mensagem num clique",
    jan && jan.nat === "fatal" && /^DCB \d{2}\/\d{2}$/.test(jan.resumo) && /tarefaProrrogacao/.test(jan.acao) && /msgProrrogacao/.test(jan.acao), jan);
  await paulo.evaluate(k => typeof tarefaProrrogacao === "function" && tarefaProrrogacao(k), W2.k.id); await espera(paulo, 600);
  const aPr = T.andamentos.find(a => a.caso_id === W2.k.id && /^🩺 Pedir a prorrogação do benefício até/.test(a.texto || ""));
  conf("a tarefa da prorrogação nasce para quem cuida do caso, hoje", aPr && T.andamento_tarefas.some(t => t.andamento_id === aPr.id && t.colaborador_id === AM && t.lembrar_em === HOJE), aPr && aPr.texto);
  const ipW2 = (await itens(paulo, null)).find(i => i.cli === W2.c.id && /prorrogação/.test(i.resumo) && !i.tc);
  conf("o Meu Dia diz até quando pedir a prorrogação (a véspera da DCB)", ipW2 && new RegExp(`até ${pt(dia(9))}`).test(ipW2.resumo), ipW2);
  conf("com a janela aberta, o item é de hoje: não cai em 'Vencidas' no dia em que a janela abriu", ipW2 && ipW2.data === HOJE, ipW2);

  // ── extras · o prazo respondido, a pergunta, o MS decidido, a diligência, o prazo fatal pela frase da data ───────
  await ficha(paulo, X.c.id, X.k.id);
  const lX = await linhas(paulo, X.k);
  await ficha(paulo, X2.c.id, X2.k.id);
  const lX2 = await linhas(paulo, X2.k);
  conf("o prazo do tribunal com a manifestação protocolada depois da ciência vira 'Respondido', fora dos pendentes",
    lX.some(x => x.rotulo === "Respondido no PJe" && x.nat === "lembrete") && !lX.some(x => x.rotulo === "Prazo no PJe"), lX.map(x => x.rotulo));
  conf("a pergunta ('apresentamos quesitos…?') não é resposta: o prazo continua", lX2.some(x => x.rotulo === "Prazo no PJe" && x.nat === "fatal"), lX2.map(x => x.rotulo));
  await paulo.evaluate(() => fecharFicha(false)); await paulo.evaluate(() => itensAgenda(null)); await espera(paulo, 600);
  const ia = await itens(paulo, null);
  conf("na agenda, o respondido não cobra e o da pergunta cobra", !ia.some(i => i.cli === X.c.id && i.prazo) && ia.some(i => i.cli === X2.c.id && i.prazo && /^Prazo PJe/.test(i.selo)), ia.filter(i => [X.c.id, X2.c.id].includes(i.cli)));
  conf("a mora com a tarefa de redigir o mandado de segurança não pede mais avaliação; sem ela, pede",
    !ia.some(i => i.cli === Y.c.id && i.selo === "Mora do INSS") && ia.some(i => i.cli === Y2.c.id && i.selo === "Mora do INSS"), ia.filter(i => [Y.c.id, Y2.c.id].includes(i.cli)));
  const exZ = ia.find(i => i.cli === Z.c.id && i.selo === "Diligência");
  conf("a descrição da diligência na agenda corta na palavra, com reticências", exZ && /…$/.test(exZ.resumo) && !/prazo estimado/.test(exZ.resumo), exZ);
  const confK = ia.some(i => i.cli === K.c.id && i.conf), confS = ia.some(i => i.cli === S.c.id && i.conf);
  conf("o Meu Dia não pede a confirmação da perícia cujo laudo o processo já trouxe (a outra continua)", !confK && confS, { confK, confS });
  await ficha(paulo, Y.c.id, Y.k.id);
  const lY = await linhas(paulo, Y.k);
  conf("no quadro, a mora com o MS decidido diz para acompanhar a impetração", lY.some(x => x.rotulo === "Prazo de análise do INSS vencido" && /MS decidido/.test(x.resumo)), lY.map(x => x.resumo));
  await ficha(paulo, Z.c.id, Z.k.id);
  const lZ = await linhas(paulo, Z.k), dZ = lZ.find(x => x.rotulo === "Diligência do CRPS");
  conf("a diligência do CRPS segue o Regimento: sem 'estimado', o pedido inteiro, art. 78 e art. 85, § 2º, sem o pedido de prorrogação da IN 128",
    dZ && !/estimado/.test(dZ.resumo) && /3\) nome, endereço e CPF/.test(dZ.rot) && /art\. 78/.test(dZ.rot) && /art\. 85, § 2º/.test(dZ.rot) && !/IN 128/.test(dZ.rot) && !/copiarPedidoProrrogacaoExig/.test(dZ.acao) && /tarefasDaDiligencia/.test(dZ.acao), dZ);
  const pass = await paulo.evaluate(k => passosDoRecurso(D.casoPorId.get(k), crpsBlocos(D.casoPorId.get(k))[0]), Z.k.id);
  conf("o quadro do recurso mostra o que a Junta pediu, inteiro", /O que foi pedido:/.test(pass) && /3\) nome, endereço e CPF/.test(pass));
  const msgZ = await paulo.evaluate(async k => { let t = ""; const ant = window.copiar; window.copiar = x => { t = x; }; await copiarMsgExigencia(k); window.copiar = ant; return t; }, Z.k.id);
  conf("a mensagem da diligência à cliente leva o pedido inteiro e não a nota interna", /diligência/.test(msgZ) && /3\) nome, endereço e CPF/.test(msgZ) && !/prazo estimado|ciência não vem/.test(msgZ), msgZ.slice(0, 200));
  await paulo.evaluate(k => typeof tarefasDaDiligencia === "function" && tarefasDaDiligencia(k), Z.k.id); await espera(paulo, 800);
  const tZ = T.andamentos.filter(a => a.caso_id === Z.k.id && /^(📄|⚠) Diligência do CRPS/.test(a.texto || "")).map(a => ({ a, t: T.andamento_tarefas.find(t => t.andamento_id === a.id) }));
  conf("'＋ tarefas da diligência' cria as duas tarefas para quem cuida: pedir os papéis antes e protocolar até o prazo, na tarefa do Meu INSS",
    tZ.length === 2 && tZ.every(x => x.t && x.t.colaborador_id === AM) && tZ.some(x => /^📄/.test(x.a.texto) && x.t.lembrar_em < dia(18))
    && tZ.some(x => /^⚠/.test(x.a.texto) && x.t.lembrar_em === dia(18) && /tarefa 998431207/.test(x.a.texto)), tZ.map(x => [x.a.texto.slice(0, 80), x.t && x.t.lembrar_em]));
  await ficha(paulo, Q.c.id, Q.k.id);
  const lQ = await linhas(paulo, Q.k), fQ = lQ.find(x => x.rotulo === "Prazo fatal");
  const rQ = await resumo(paulo);
  conf("o prazo fatal diz a frase da anotação que fala da data dele ('protocolamos até…')", fQ && /^protocolamos até/.test(fQ.resumo), fQ);
  conf("o resumo do quadro não repete 'prazo fatal: Prazo fatal'", !/prazo fatal: Prazo fatal/.test(rQ), rQ);
  conf("a revisão diz do que é (o pedido que a anotação faz a quem revisa)", lQ.some(x => /^Paulo revisa: até \d{2}\/\d{2}/.test(x.resumo)), lQ.map(x => x.resumo));
  const prY = await paulo.evaluate(k => proximosDoCaso(D.casoPorId.get(k)).map(x => x.txt), Y.k.id);
  conf("a linha da incapacidade/próximo passo não manda avaliar o MS já decidido", prY.some(t => /MS por mora já foi decidido/.test(t)), prY);
  await ficha(paulo, G.c.id, G.k.id);
  const lG = await linhas(paulo, G.k), rpv = lG.find(x => x.rotulo === "Pagamento da RPV");
  conf("a RPV expedida e não paga ganha a data provável (60 dias, Lei 10.259, art. 17) e o sequestro (§ 2º), sem depender de lançar honorários",
    rpv && rpv.data === dia(45) && /art\. 17/.test(rpv.rot) && /§ 2º/.test(rpv.rot), rpv);
  await ficha(paulo, H.c.id, H.k.id);
  const lH = await linhas(paulo, H.k), lau = lH.find(x => x.rotulo === "Prazo no PJe");
  conf("o prazo que manda manifestar sobre o laudo diz isso e traz a conclusão do laudo e o botão de abrir",
    lau && lau.curto === "Manifestar sobre o laudo" && /Laudo juntado em/.test(lau.rot) && /Não foi constatada incapacidade/.test(lau.rot) && /abrirAnexo/.test(lau.acao), lau);
  // o prazo do recurso contra a sentença que cita o laudo não é "manifestar sobre o laudo" (achado da reconferência)
  const lauSent = await paulo.evaluate(k => laudoDoPrazo({ ato: "Sentença", texto: "Julgo improcedente o pedido; o laudo pericial afastou a incapacidade.", fim: hoje() }, D.casoPorId.get(k)), H.k.id);
  conf("a sentença que cita o laudo abre prazo de recurso, e não de manifestar sobre o laudo", lauSent === null, lauSent);
  await ficha(paulo, F.c.id, F.k.id);
  const sgF = await paulo.evaluate(id => prazoSugeridoHtml(D._andsFicha.find(a => a.id === id), 0), SENT_F.id);
  conf("o cartão da sentença favorável não manda vigiar o recurso do INSS que já veio", /sem recurso nosso/.test(sgF) && /O INSS recorreu em/.test(sgF) && !/pode recorrer até/.test(sgF) && !/vigiar/.test(sgF), sgF);
  // F304 · o prazo do tribunal deixou de ser novidade: o "N ·" à frente só aparece com perícia ou julgamento a agendar
  const contNov = await paulo.evaluate(() => { montarSidebar(); const np = novidades().filter(a => novPede(a)).length;
    return { np, t: (document.querySelector('#grupo-dinamicas [data-v="novidades"] .cont') || {}).textContent || "" }; });
  conf(`a barra das Novidades diz quantas pedem ação à frente do total (${contNov.t})`, contNov.np ? /^\d+ · \d+$/.test(contNov.t.trim()) : /^\d+$/.test(contNov.t.trim()), contNov);

  // ── 3 · o aviso com um dono só: concluir o 📞 Avisar marca a perícia avisada ───────────────────────────────────
  await paulo.evaluate(id => concluirDeVez(id), TF_L.id); await espera(paulo, 600);
  conf("concluir o '📞 Avisar' grava o '📞 avisado' na perícia", /📞 avisado/.test(T.eventos.find(e => e.id === EL.id).obs || ""), T.eventos.find(e => e.id === EL.id).obs);
  await paulo.context().close();

  // ══ RITA (recepção) ═════════════════════════════════════════════════════════════════════════════════════════
  // a Luciana volta a "sem aviso" para conferir a fila; a Nair tem o 📞 Avisar aberto para a Ingrid
  T.eventos.find(e => e.id === EL.id).obs = null;
  T.andamento_tarefas.find(t => t.id === TF_L.id).concluida_em = null;
  const rita = await entrar("rita");
  await rita.evaluate(() => itensAgenda(null)); await espera(rita, 900);
  const ir = await itens(rita, RI);
  const avisar = ir.filter(i => i.avisar).map(i => i.cli);
  conf("a fila da recepção avisa quem não tem aviso nem '📞 Avisar' aberto (Marta), e pula a perícia que já tem o 📞 de alguém (Luciana, Nair)",
    avisar.includes(M.c.id) && !avisar.includes(L.c.id) && !avisar.includes(N.c.id), { avisar, M: M.c.id, L: L.c.id, N: N.c.id });
  // o aviso feito pela recepção, fora da ficha, baixa o 📞 Avisar da Ingrid e marca a perícia
  await rita.evaluate(async id => { janelaAvisado(id); await salvarAvisado(id, false); }, EN.id); await espera(rita, 600);
  conf("o aviso da recepção, fora da ficha, baixa o '📞 Avisar' da Ingrid e marca a perícia avisada",
    !!T.andamento_tarefas.find(t => t.id === TF_N.id).concluida_em && /📞 avisado/.test(T.eventos.find(e => e.id === EN.id).obs || ""),
    { tf: T.andamento_tarefas.find(t => t.id === TF_N.id), obs: T.eventos.find(e => e.id === EN.id).obs });
  await rita.context().close();

  conf("sem erro de página", !erros.length, erros);
  const bons = ok.filter(x => x[1]).length;
  console.log(`\n${bons}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(bons === ok.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
