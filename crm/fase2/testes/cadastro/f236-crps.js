// F236 · frente CRPS. O tradutor do e-Recursos (a negativa "negar-lhe provimento", o que só cita o acórdão, a
// remarcação com a data nova, o cancelamento, o encaminhamento à PMF, a ciência), a importação (só decisão de
// verdade data o caso, o provimento grava deferido, a remarcação leva o julgamento que já estava na agenda), a
// releitura do bloco gravado com as regras velhas, o quadro do recurso (situação, alçada, pauta e sustentação oral
// propostas num clique, diligência, BPC acumulado), o Caso completo sem duplicata, a novidade num critério só e a
// mensagem ao cliente. Banco simulado, dados fictícios. Uso: node f236-crps.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";

// o tradutor do próprio app: o mesmo módulo que a tela usa
const CRPS = (() => {
  const src = fs.readFileSync(path.join(__dirname, "app.html"), "utf8"), i = src.indexOf("const CRPS = (() => {"), j = src.indexOf("\n})();", i);
  return new Function(src.slice(i, j + 6) + "\nreturn CRPS;")();
})();

const PAULO = FIX.colaboradores[0].id;
const iso = n => new Date(Date.now() + n * 864e5).toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });
const mais = (s, n) => { const d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const util = s => { let d = s; while ([0, 6].includes(new Date(d + "T12:00:00Z").getUTCDay())) d = mais(d, 1); return d; };
const brC = s => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;     // dd/mm/aaaa
const brA = s => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(2, 4)}`;     // dd/mm/aa, como o e-Recursos escreve a sessão
const pt = s => `${s.slice(8, 10)}.${s.slice(5, 7)}.${s.slice(0, 4)}`;      // o fmt() do app
const ev = (s, hora, status, docs) => ({ status, data: `${brC(s)} ${hora}:00`, documentos: docs || [] });

const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: [], casos: [], atribuicoes: [],
  documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;

const cli = (id, nome) => ({ id, nome, cpf: null, telefone: "(16) 99000-2360", sexo: "F", campos: {}, criado_em: "2025-01-10T12:00:00Z" });
const caso = o => ({ titulo: "", protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {}, marcadores: [],
  origem_lista: "🖥 Conselho de Recursos", fase: "conselho", criado_em: "2025-02-01T12:00:00Z", ...o });
const nupF = n => `${n.slice(0, 5)}.${n.slice(5, 11)}/${n.slice(11, 15)}-${n.slice(15)}`;
const bloco = (nup, orgao, eventos) => ({ ...CRPS.traduzirProcesso({ proc: nup, numProc: nupF(nup), orgaoAtual: orgao, recorrentes: [], eventos }),
  nup, consultado_em: new Date().toISOString() });
// um andamento origem crps por movimento que não é ruído, como a importação grava (o autor é quem importou)
let nAnd = 0;
const andsDo = (casoId, b) => b.eventos.filter(e => !CRPS.TIPOS_SILENCIOSOS.has(e.tipo)).map(e => ({
  id: `e0000000-0000-0000-0000-${String(236000000000 + (++nAnd))}`, caso_id: casoId, autor_id: PAULO, origem: "crps",
  origem_id: `${b.nup}|${CRPS.chaveEvento(e)}`, texto: CRPS.comentarioDoEvento(e), publico: false,
  criado_em: `${(CRPS.dataParaISO(e.data) || "").slice(0, 10)}T12:00:00Z` }));

// ── A · BPC ao idoso em pauta, sessão remarcada; a mesma pessoa tem um B31 no JEF ────────────────────────────
const PA = "c0000000-0000-0000-0000-000000236001", KA = "b0000000-0000-0000-0000-000000236001", KA2 = "b0000000-0000-0000-0000-000000236002";
const NUPA = "44233498877202631", S0 = util(iso(5)), S1 = util(mais(S0, 2));
const blA = bloco(NUPA, "10ª Junta de Recursos", [
  ev(iso(-130), "10:32", "Requerimento protocolado - Tarefa de Recurso Ordinário - 997812340"),
  ev(iso(-108), "13:44", "Contrarrazões do INSS"),
  ev(iso(-107), "00:09", "Encaminhamento automático - 21031080 para CRPS"),
  ev(iso(-41), "15:27", "Distribuído ao Conselheiro Relator - Conselheiro: MARIA FICTICIA DUTRA"),
  ev(iso(-5), "17:02", "Para inclusão em pauta"),
  ev(iso(-4), "08:15", `Sessão de Julgamento Ordinária - Nº 0187/2026 - ${brA(S0)} 09:00`),
  ev(iso(-1), "18:40", `Alterada a Data/Hora da Sessão de Julgamento - De: ${brA(S0)} 09:00 - Para: ${brA(S1)} 09:00`)]);
T.clientes.push(cli(PA, "Aparecida Ficta Nogueira"));
T.casos.push(caso({ id: KA, cliente_id: PA, titulo: "Aparecida Ficta Nogueira", beneficio: "BPC/LOAS — idoso", especie: "B88", der: iso(-200),
    decisao_em: iso(-150), resultado: "indeferido", ro_protocolado_em: iso(-130), crps_nups: [NUPA], crps: [blA] }),
  caso({ id: KA2, cliente_id: PA, titulo: "Aparecida Ficta Nogueira", beneficio: "Aux. Incapacidade Temporária", especie: "B31", fase: "judicial",
    origem_lista: "👪 Judicial", processo: "0001234-56.2026.4.03.6302" }));
T.andamentos.push(...andsDo(KA, blA), { id: "e0000000-0000-0000-0000-000000236900", caso_id: KA, autor_id: PAULO, origem: "app",
  texto: "Cliente avisada de que o recurso entrou em pauta.", criado_em: `${iso(-3)}T15:00:00Z` });

// ── B, C e D · a coleta do e-Recursos: provimento com envio à APS, negativa com notificação, sessão remarcada ──
const PB = "c0000000-0000-0000-0000-000000236002", KB = "b0000000-0000-0000-0000-000000236003", NUPB = "44233476201202611";
const PC = "c0000000-0000-0000-0000-000000236003", KC = "b0000000-0000-0000-0000-000000236004", NUPC = "44233487310202622";
const PD = "c0000000-0000-0000-0000-000000236004", KD = "b0000000-0000-0000-0000-000000236005", NUPD = "44233411111202633";
const evsB = nup => [
  ev(iso(-180), "17:21", "Requerimento protocolado - Tarefa de Recurso Ordinário - 998765102"),
  ev(iso(-99), "10:05", "Solicitação de parecer do Perito Médico Federal"),
  ev(iso(-99), "10:06", "Encaminhamento - (7ª JR para PMF)"),
  ev(iso(-56), "16:13", "Informações obtidas PMF"),
  ev(iso(-25), "08:30", `Sessão de Julgamento Ordinária - Nº 0151/2026 - ${brA(iso(-12))} 14:00`),
  ev(iso(-10), "11:47", "Conhecer do Recurso e dar-lhe provimento, por unanimidade - Acórdão: 7ª JR/6120/2026",
    [{ id: "9330109", nome: "ACÓRDÃO_6120.pdf", path: "/recursos/documento/9330109" }]),
  ev(iso(-10), "11:48", "Encaminhamento automático - 7ª JR para 21031080"),
  ev(iso(-8), "07:30", "Criação de subtarefa - Número do protocolo GET: 1987654321"),
  ev(iso(-8), "07:31", "Encaminhar para a APS para cumprimento de acordão com implantação de benefício - Número do protocolo GET da subtarefa: 1987654321")];
const S0D = util(iso(9)), S1D = util(mais(S0D, 3));
T.clientes.push(cli(PB, "Reinaldo Ficto Bastos"), cli(PC, "Luzia Ficta Ramalho"), cli(PD, "Odete Ficta Siqueira"));
T.casos.push(
  caso({ id: KB, cliente_id: PB, titulo: "Reinaldo Ficto Bastos", beneficio: "Aux. Incapacidade Temporária", especie: "B31", decisao_em: iso(-195),
    resultado: "indeferido", ro_protocolado_em: iso(-180), crps_nups: [NUPB] }),
  caso({ id: KC, cliente_id: PC, titulo: "Luzia Ficta Ramalho", beneficio: "Pensão por Morte", especie: "B21", decisao_em: iso(-200),
    resultado: "indeferido", ro_protocolado_em: iso(-185), crps_nups: [NUPC] }),
  caso({ id: KD, cliente_id: PD, titulo: "Odete Ficta Siqueira", beneficio: "BPC/LOAS — idoso", especie: "B88", decisao_em: iso(-160),
    resultado: "indeferido", ro_protocolado_em: iso(-140), crps_nups: [NUPD] }));
// D já tinha o julgamento na agenda, com a tarefa de conferir o resultado (o caminho de sempre, F51)
const AND_D = "e0000000-0000-0000-0000-000000236950", TF_D = "f0000000-0000-0000-0000-000000236950";
T.eventos.push({ id: "a0000000-0000-0000-0000-000000236950", caso_id: KD, tipo: "Julgamento", status: "agendada",
  data_hora: `${S0D}T09:00:00-03:00`, local: null, obs: null, criado_em: `${iso(-3)}T12:00:00Z` });
T.andamentos.push({ id: AND_D, caso_id: KD, autor_id: PAULO, origem: "app", criado_em: `${iso(-3)}T13:00:00Z`,
  texto: `⚖️ Julgamento agendado para ${pt(S0D)} às 09:00. Verificar o resultado no dia seguinte.` });
T.andamento_tarefas.push({ id: TF_D, andamento_id: AND_D, caso_id: KD, colaborador_id: PAULO, atribuido_por: PAULO,
  lembrar_em: util(mais(S0D, 1)), concluida_em: null, criado_em: `${iso(-3)}T13:00:00Z` });
const COL = "cc000000-0000-0000-0000-000000236001";
T.coletas.push({ id: COL, fonte: "crps", criado_em: new Date().toISOString(), aplicada_em: null, dados: { itens: {
  [NUPB + "_1"]: { proc: NUPB, numProc: nupF(NUPB), orgaoAtual: "SERVIÇO DE CENTRALIZAÇÃO DA ANÁLISE DE RECONHECIMENTO DE DIREITOS SRSEI",
    recorrentes: [{ nome: "REINALDO FICTO BASTOS" }], eventos: evsB(NUPB) },
  [NUPC + "_1"]: { proc: NUPC, numProc: nupF(NUPC), orgaoAtual: "SERVIÇO DE RECONHECIMENTO DE DIREITOS SR SUDESTE I",
    recorrentes: [{ nome: "LUZIA FICTA RAMALHO" }], eventos: [
      ev(iso(-185), "14:06", "Requerimento protocolado - Tarefa de Recurso Ordinário - 997654321"),
      ev(iso(-35), "08:05", `Sessão de Julgamento Ordinária - Nº 0144/2026 - ${brA(iso(-24))} 09:00`),
      ev(iso(-20), "10:58", "Conhecer do Recurso e negar-lhe provimento, por unanimidade - Acórdão: 12ª JR/5873/2026"),
      ev(iso(-20), "10:59", "Encaminhamento automático - 12ª JR para 21031080"),
      ev(iso(-19), "09:02", "Envio de carta decisória (Gerenciador Correspondência - GERCOR) - N.º Correspondência GERCOR 7712345"),
      ev(iso(-19), "09:03", `Notificação efetuada automaticamente via e-mail e/ou canais remotos do INSS - no dia ${brA(iso(-19))} 09:03:27 (Número do protocolo GET: 997654321)`)] },
  [NUPD + "_1"]: { proc: NUPD, numProc: nupF(NUPD), orgaoAtual: "14ª Junta de Recursos", recorrentes: [{ nome: "ODETE FICTA SIQUEIRA" }], eventos: [
      ev(iso(-3), "08:15", `Sessão de Julgamento Ordinária - Nº 0201/2026 - ${brA(S0D)} 09:00`),
      ev(iso(-1), "18:40", `Alterada a Data/Hora da Sessão de Julgamento - De: ${brA(S0D)} 09:00 - Para: ${brA(S1D)} 10:30`)] } } } });

// ── E e F · blocos gravados com as regras velhas (o envio à APS como decisão; a negativa como "Acórdão publicado") ──
const PE = "c0000000-0000-0000-0000-000000236005", KE = "b0000000-0000-0000-0000-000000236006", NUPE = "44233476299202644";
const PF = "c0000000-0000-0000-0000-000000236006", KF = "b0000000-0000-0000-0000-000000236007", NUPF = "44233487399202655";
const blE = bloco(NUPE, "SERVIÇO DE CENTRALIZAÇÃO DA ANÁLISE DE RECONHECIMENTO DE DIREITOS SRSEI", evsB(NUPE));
const apsE = blE.eventos.find(e => /cumprimento de acord/i.test(e.bruto));
Object.assign(apsE, { tipo: "decisao", icone: "⚖️", resumo: "Acórdão publicado" });
blE.status = "⚖️ Acórdão publicado";
const blF = bloco(NUPF, "SERVIÇO DE RECONHECIMENTO DE DIREITOS SR SUDESTE I", [
  ev(iso(-185), "14:06", "Requerimento protocolado - Tarefa de Recurso Ordinário - 997654999"),
  ev(iso(-20), "10:58", "Conhecer do Recurso e negar-lhe provimento, por unanimidade - Acórdão: 12ª JR/5999/2026"),
  ev(iso(-19), "09:03", `Notificação efetuada automaticamente via e-mail e/ou canais remotos do INSS - no dia ${brA(iso(-19))} 09:03:27 (Número do protocolo GET: 997654999)`)]);
const negF = blF.eventos.find(e => /negar-lhe/.test(e.bruto)), notF = blF.eventos.find(e => /Notifica/.test(e.bruto));
Object.assign(negF, { tipo: "decisao", icone: "⚖️", resumo: "Acórdão publicado (12ª Junta)" });
Object.assign(notF, { tipo: "andamento", icone: "•", resumo: notF.bruto });
blF.status = `• ${notF.bruto}`;
T.clientes.push(cli(PE, "Reinaldo Ficto Segundo"), cli(PF, "Luzia Ficta Segunda"));
T.casos.push(
  caso({ id: KE, cliente_id: PE, titulo: "Reinaldo Ficto Segundo", beneficio: "Aux. Incapacidade Temporária", especie: "B31",
    decisao_em: iso(-8), resultado: "indeferido", ro_protocolado_em: iso(-180), crps_nups: [NUPE], crps: [blE] }),
  caso({ id: KF, cliente_id: PF, titulo: "Luzia Ficta Segunda", beneficio: "Pensão por Morte", especie: "B21",
    decisao_em: iso(-20), resultado: "indeferido", ro_protocolado_em: iso(-185), crps_nups: [NUPF], crps: [blF] }));
const AND_E = "e0000000-0000-0000-0000-000000236960", AND_F = "e0000000-0000-0000-0000-000000236961";
T.andamentos.push(
  { id: AND_E, caso_id: KE, autor_id: PAULO, origem: "crps", origem_id: `${NUPE}|${CRPS.chaveEvento(apsE)}`, criado_em: `${iso(-8)}T12:00:00Z`,
    texto: `🖥 CRPS · ${brC(iso(-8))} — ⚖️ Acórdão publicado\n⚠ Confira o acórdão na aba 🖥 Recurso (CRPS).` },
  { id: AND_F, caso_id: KF, autor_id: PAULO, origem: "crps", origem_id: `${NUPF}|${CRPS.chaveEvento(negF)}`, criado_em: `${iso(-20)}T12:00:00Z`,
    texto: `🖥 CRPS · ${brC(iso(-20))} — ⚖️ Acórdão publicado · 12ª Junta de Recursos\n⚠ Da Junta cabe Recurso Especial em 30 dias da ciência. Confira o acórdão na aba 🖥 Recurso (CRPS).` });

// ── G · B31 negado pela perícia, aguardando distribuição na 12ª Junta (alçada provável) ────────────────────────
const PG = "c0000000-0000-0000-0000-000000236007", KG = "b0000000-0000-0000-0000-000000236008", NUPG = "44233530118202666";
const blG = bloco(NUPG, "12ª Junta de Recursos", [
  ev(iso(-45), "16:43", "Requerimento protocolado - Tarefa de Recurso Ordinário - 998215634"),
  ev(iso(-21), "11:05", "Contrarrazões do INSS"),
  ev(iso(-21), "11:06", "Encaminhamento automático - 21031080 para CRPS"),
  ev(iso(-19), "09:30", "Encaminhamento - (CRPS para 12ª JR)"),
  ev(iso(-19), "09:31", "Aguardando distribuição")]);
T.clientes.push(cli(PG, "Gilberto Ficto Mendonça"));
T.casos.push(caso({ id: KG, cliente_id: PG, titulo: "Gilberto Ficto Mendonça", beneficio: "Aux. Incapacidade Temporária", especie: "B31",
  decisao_em: iso(-72), resultado: "indeferido", ro_protocolado_em: iso(-45), crps_nups: [NUPG], crps: [blG] }));
T.andamentos.push(...andsDo(KG, blG), { id: "e0000000-0000-0000-0000-000000236970", caso_id: KG, autor_id: PAULO, origem: "pat", origem_id: "48931003",
  criado_em: `${iso(-72)}T12:00:00Z`, texto: "INSS · Indeferido o benefício por incapacidade temporária: não constatação de incapacidade laborativa pela Perícia Médica Federal." });

// ── H · aposentadoria rural em diligência, sem a senha do Meu INSS na ficha ──────────────────────────────────
const PH = "c0000000-0000-0000-0000-000000236008", KH = "b0000000-0000-0000-0000-000000236009", NUPH = "44233512904202677";
const blH = bloco(NUPH, "AGÊNCIA DA PREVIDÊNCIA SOCIAL CEAB RECONHECIMENTO DE DIREITO DA SRI", [
  ev(iso(-232), "15:11", "Requerimento protocolado - Tarefa de Recurso Ordinário - 998431207"),
  ev(iso(-95), "16:40", "Distribuído ao Conselheiro Relator - Conselheiro: ANTONIO FICTICIO PRADO"),
  ev(iso(-14), "11:25", "Solicitação de Diligência"),
  ev(iso(-14), "16:40", "Encaminhamento automático - 1ªCA 16ª JR para 21031080"),
  ev(iso(-12), "17:15", "Solicitação de Providências Complementares (via canais remotos) - Alterado o status da tarefa: 998431207"),
  ev(iso(-12), "17:16", `Notificação efetuada automaticamente via e-mail e/ou canais remotos do INSS - no dia ${brA(iso(-12))} 17:16:40 (Número do protocolo GET: 998431207)`)]);
T.clientes.push(cli(PH, "Benedita Ficta Carvalho"));
T.casos.push(caso({ id: KH, cliente_id: PH, titulo: "Benedita Ficta Carvalho", beneficio: "Apos. por Idade Rural", especie: "B41",
  exigencia_prazo: iso(18), exigencia_descricao: "Em cumprimento à diligência da 1ª Composição Adjunta da 16ª Junta", crps_nups: [NUPH], crps: [blH] }));

const ok = [];
const conf = (nome, v) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); };

(async () => {
  // ══ 1 · o tradutor (o módulo do app, sem tela) ═══════════════════════════════════════════════════════════
  const tr = s => CRPS.traduzirEvento({ status: s, data: "27/09/2026 10:58:00" });
  const neg = tr("Conhecer do Recurso e negar-lhe provimento, por unanimidade - Acórdão: 12ª JR/5873/2026");
  conf("1.1 'negar-lhe provimento' é recurso negado (e não 'Acórdão publicado'), decisão desfavorável",
    /^Recurso negado \(12ª Junta\)$/.test(neg.resumo) && neg.tipo === "decisao" && CRPS.efeitoDecisao(neg) === "desfavoravel"
    && ["Nego provimento ao recurso", "Recurso conhecido e negado provimento"].every(s => /negado/.test(tr(s).resumo)));
  const dou = tr("Dou provimento ao recurso - Acórdão: 7ª JR/1/2026"), parc = tr("Conhecer do Recurso e dar-lhe provimento parcial - Acórdão: 25ª JR/3080/2025");
  conf("1.2 'dou provimento' é provido (favorável) e o provimento parcial tem rótulo e efeito próprios",
    /PROVIDO/.test(dou.resumo) && CRPS.efeitoDecisao(dou) === "favoravel" && /EM PARTE/.test(parc.resumo) && CRPS.efeitoDecisao(parc) === "parcial");
  const naoDec = ["Converter o Julgamento em Diligência - Acórdão: 3ª JR/77/2026",
    "Encaminhar para a APS para cumprimento de acordão com implantação de benefício - Número do protocolo GET da subtarefa: 1987654321",
    "Acordão Cumprido", "Solicitação de Análise de Acórdão",
    "Envio de carta decisória (Gerenciador Correspondência - GERCOR) - N.º Correspondência GERCOR 7712345"].map(tr);
  conf("1.3 o que só cita o acórdão (diligência em mesa, cumprir, cumprido, análise, carta) não é decisão",
    naoDec.every(e => e.tipo !== "decisao") && naoDec[0].tipo === "diligencia" && /GET 1987654321/.test(naoDec[1].resumo));
  const rem = tr("Alterada a Data/Hora da Sessão de Julgamento - De: 21/10/26 09:00 - Para: 23/10/26 09:00");
  conf("1.4 a remarcação mostra a data NOVA (e a antiga entre parênteses)",
    /remarcada para 23\/10\/2026 09:00 \(era 21\/10\/2026 09:00\)/.test(rem.resumo)
    && JSON.stringify(CRPS.sessaoDoStatus(rem.bruto)) === JSON.stringify({ acao: "remarcada", data: "2026-10-23", hora: "09:00", de: "2026-10-21" }));
  conf("1.5 o cancelamento de pauta não vira 'Incluído em pauta'; a sessão com o ano de 4 dígitos lê a data",
    ["Cancelamento de pauta", "Sessão de Julgamento Cancelada"].every(s => !/Incluído|Pautado/.test(tr(s).resumo) && CRPS.sessaoDoStatus(s).acao === "cancelada")
    && /04\/11\/2026 08:00/.test(tr("Sessão de Julgamento - 04/11/2026 08:00").resumo));
  conf("1.6 o encaminhamento vai PARA o destino: '(7ª JR para PMF)' é a Perícia Médica Federal",
    tr("Encaminhamento - (7ª JR para PMF)").resumo === "Encaminhado à Perícia Médica Federal"
    && /à 12ª Junta/.test(tr("Encaminhamento - (CRPS para 12ª JR)").resumo) && /à 25ª Junta/.test(tr("Encaminhamento - (21150521 para 25ª JR)").resumo)
    && !/Junta/.test(CRPS.comentarioDoEvento(tr("Encaminhamento - (7ª JR para PMF)"))));
  const crus = ["Solicitação de Diligência", "Converter o Julgamento em Diligência", "Solicitação de Providências Complementares (via canais remotos) - Alterado o status da tarefa: 998431207",
    "Notificação efetuada automaticamente via e-mail e/ou canais remotos do INSS - no dia 05/10/26 17:16:40 (Número do protocolo GET: 998431207)",
    "Envio de carta decisória (GERCOR)", "Aguardando distribuição", "Para inclusão em pauta", "Tarefa concluída PMF"].map(tr);
  conf("1.7 os status reais sem regra ganham rótulo (nenhum sai cru com '•')", crus.every(e => e.icone !== "•" && e.resumo !== e.bruto)
    && /em 05\/10\/2026/.test(crus[3].resumo) && /tarefa 998431207/.test(crus[2].resumo));
  const pNeg = CRPS.traduzirProcesso({ proc: "x", eventos: [
    { status: "Conhecer do Recurso e negar-lhe provimento, por unanimidade - Acórdão: 12ª JR/5873/2026", data: "27/09/2026 10:58:00" },
    { status: "Notificação efetuada automaticamente via e-mail e/ou canais remotos do INSS - no dia 28/09/26 09:03:27", data: "28/09/2026 09:03:00" }] });
  const pFav = CRPS.traduzirProcesso({ proc: "x", eventos: [
    { status: "Conhecer do Recurso e dar-lhe provimento, por unanimidade - Acórdão: 7ª JR/6120/2026", data: "07/10/2026 11:47:00" },
    { status: "Encaminhar para a APS para cumprimento de acordão - Número do protocolo GET da subtarefa: 1987654321", data: "09/10/2026 07:31:00" }] });
  conf("1.8 a situação é o último movimento significativo: a decisão com a data, não a notificação; o cumprimento vem com o resultado",
    pNeg.status === "⛔ Recurso negado (12ª Junta) em 27/09/2026" && /^✅ Recurso PROVIDO \(7ª Junta\) em 07\/10\/2026 · Enviado ao INSS para cumprir/.test(pFav.status));
  const cFav = CRPS.comentarioDoEvento(pFav.eventos.find(e => e.tipo === "decisao"));
  const cAlc = CRPS.comentarioDoEvento(pNeg.eventos.find(e => e.tipo === "decisao"), { alcada: "certa" });
  const cNeg = CRPS.comentarioDoEvento(pNeg.eventos.find(e => e.tipo === "decisao"));
  conf("1.9 'Da Junta cabe Recurso Especial' só na contrária fora da alçada; o provimento diz que o INSS cumpre",
    !/Recurso Especial/.test(cFav) && /INSS deve cumprir/.test(cFav) && !/cabe Recurso Especial/.test(cAlc) && /definitiva/.test(cAlc) && /cabe Recurso Especial/.test(cNeg));

  // ══ 2 · na tela ═══════════════════════════════════════════════════════════════════════════════════════
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
  }, [SUPA, SESSAO]);
  await instalarBanco(ctx, { SUPA, SESSAO, banco });
  const p = await ctx.newPage();
  p._erros = [];
  p.on("pageerror", e => p._erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0 && D._completo);
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const abrir = async (cliId, casoId, sub) => {
    await p.evaluate(([c, k, sb]) => abrirFicha(c).then(() => {
      const m = document.getElementById("modal"); if (m && m.style.display !== "none") m.style.display = "none";
      casoSel = k; abaAtiva = 2; subAba = sb; repintarFicha(); }), [cliId, casoId, sub]);
    await espera(500);
    return p.evaluate(() => (document.querySelector("#detalhe .painel.ativo") || document.getElementById("detalhe")).innerText);
  };
  conf("2.0 dias úteis antes da sessão contam os feriados (23/10 → 20/10; 04/11, com Finados, → 29/10)",
    await p.evaluate(() => uteisAntes("2026-10-23", 3) === "2026-10-20" && uteisAntes("2026-11-04", 3) === "2026-10-29"));

  // ── a releitura do bloco gravado com as regras velhas (E e F) ──
  const nE = await p.evaluate(k => { const x = D.casoPorId.get(k), b = crpsBlocos(x)[0];
    return { dec: x.decisao_em, res: x.resultado, rec: recorrerAte(x), st: b.status,
      aps: b.eventos.find(e => /cumprimento de acord/i.test(e.bruto)).tipo }; }, KE);
  conf("2.1 bloco velho: o envio à APS deixa de ser decisão, a data volta ao acórdão e o provimento vale deferido (sem 'Recorrer até')",
    nE.aps === "cumprimento" && nE.dec === iso(-10) && nE.res === "deferido" && nE.rec === null && /^✅ Recurso PROVIDO/.test(nE.st));
  const nF = await p.evaluate(k => { const b = crpsBlocos(D.casoPorId.get(k))[0]; return { st: b.status, neg: b.eventos.find(e => e.tipo === "decisao").resumo }; }, KF);
  conf("2.2 bloco velho: a negativa gravada como 'Acórdão publicado' vira 'Recurso negado' e a situação deixa a notificação crua",
    nF.neg === "Recurso negado (12ª Junta)" && /^⛔ Recurso negado/.test(nF.st));
  await abrir(PF, KF, "escritorio");
  const tF = await p.evaluate(id => (D._andsFicha.find(a => a.id === id) || {}).texto || "", AND_F);
  conf("2.3 o andamento velho da negativa se lê pelo bloco relido: 'Recurso negado' e o aviso do recurso especial",
    /⛔ Recurso negado · 12ª Junta de Recursos/.test(tF) && /cabe Recurso Especial/.test(tF) && !/Acórdão publicado/.test(tF));
  await abrir(PE, KE, "escritorio");
  const tE = await p.evaluate(id => (D._andsFicha.find(a => a.id === id) || {}).texto || "", AND_E);
  conf("2.4 o andamento velho do envio à APS vira 'Enviado ao INSS para cumprir', sem aviso de decisão", /📤 Enviado ao INSS para cumprir o acórdão/.test(tE) && !/⚠/.test(tE));

  // ── A · o quadro do recurso em pauta, remarcada ──
  const tA = await abrir(PA, KA, "crps");
  const sust = await p.evaluate(d => uteisAntes(d, 3), S1);
  conf("2.5 a situação diz a sessão NOVA, e a antiga só como 'era'",
    tA.includes(`Sessão de julgamento remarcada para ${brC(S1)} 09:00 (era ${brC(S0)} 09:00)`) && !tA.includes(`Pautado para julgamento em ${brC(S0)}`.replace("Pautado", "SITUAÇÃO Pautado")));
  conf("2.6 o quadro propõe o julgamento com aviso num clique e mostra o prazo da sustentação oral (art. 81, III) com a procuração (§ 3º)",
    /Agendar julgamento com aviso/.test(tA) && tA.includes(`até ${brC(sust)}`) && /art\. 81, III/.test(tA) && /§ 3º/.test(tA) && /＋ tarefa da sustentação oral/.test(tA));
  conf("2.7 incluído em pauta, avisa que prova documental e alegações só vão até a pauta (art. 71, § 1º)", /só até a inclusão em pauta \(Regimento do CRPS, art\. 71, § 1º\)/.test(tA));
  conf("2.8 BPC com outro benefício da mesma pessoa: avisa que não se acumula (LOAS, art. 20, § 4º) antes da sessão",
    /não se acumula/.test(tA) && /B31 \(Judicial\)/.test(tA) && /art\. 20, § 4º/.test(tA) && tA.includes(`antes da sessão de ${brC(S1)}`));
  conf("2.9 o número do recurso sai formatado no alto e na lista do pé", (tA.match(new RegExp(nupF(NUPA).replace(/[./]/g, "\\$&"), "g")) || []).length >= 2);
  const copiado = await p.evaluate(k => { let t = ""; const o = copiar; copiar = x => { t = x; }; try { copiarCrps(k); } finally { copiar = o; } return t; }, KA);
  conf("2.10 'Copiar situação para o cliente' manda a data nova, nunca a antiga", copiado.includes(brC(S1)) && !copiado.includes(`marcada para ${brC(S0)}`) && !/Notificação/.test(copiado));
  const tEsc = await abrir(PA, KA, "escritorio");
  const msgPauta = await p.evaluate(([k, s0]) => { const a = D._andsFicha.find(x => x.caso_id === k && x.origem === "crps" && x.texto.includes(`Pautado para julgamento em ${s0}`));
    msgAndamento(a.id); const v = (document.getElementById("msg-and") || {}).value || ""; fecharCaixa(); return v; }, [KA, brC(S0)]);
  conf("2.10b a 'Mensagem ao cliente' do movimento antigo da pauta diz a sessão que vale (a remarcada)", msgPauta.includes(`marcada para ${brC(S1)}`) && !msgPauta.includes(`para ${brC(S0)}`));
  const nBt = await p.evaluate(() => [...document.querySelectorAll("#detalhe .painel.ativo .tl-bt.forte")].filter(b => /Agendar julgamento com aviso/.test(b.textContent)).length);
  conf("2.11 no Escritório, o cartão do movimento da pauta que vale traz 'Agendar julgamento com aviso' em destaque (um só, o da remarcação)", nBt === 1);
  const tl = await p.evaluate(k => linhaDoTempo(D._andsFicha.filter(a => a.caso_id === k && a.origem !== "pje")), KA);
  const iDiv = tl.indexOf("tl-fim-novas"), iUlt = tl.lastIndexOf("Novo · não lido"), nNovo = (tl.match(/Novo · não lido/g) || []).length;
  const ban = +((/🔵 (\d+) nova/.exec(tl) || [])[1] || 0);
  conf("2.12 novidade num critério só: o aviso conta o que veio do e-Recursos e nenhum 'Novo · não lido' fica abaixo da linha 'você já tinha visto'",
    nNovo > 0 && ban === nNovo && (iDiv < 0 || iUlt < iDiv));
  const itensA = await p.evaluate(k => fatosDoCasoTodo(k && D.casoPorId.get(k), D._andsFicha.filter(a => a.caso_id === k))
    .filter(x => /Recurso/.test(x.chip)).map(x => ({ t: x.texto, g: !!x.gemeo, acao: pedeAcao(x), tipo: x.crpsE && x.crpsE.tipo })), KA);
  conf("2.13 Caso completo: um cartão por movimento do e-Recursos (o do bloco, com o andamento gêmeo), sem duplicata",
    itensA.length === 6 && new Set(itensA.map(x => x.t)).size === 6 && itensA.every(x => x.g));
  conf("2.14 'Pede ação' só para pauta, diligência e decisão por ler: as contrarrazões e a distribuição não pedem",
    itensA.filter(x => x.acao).every(x => ["pauta", "diligencia", "decisao"].includes(x.tipo)) && itensA.some(x => x.acao && x.tipo === "pauta")
    && !itensA.find(x => /Contrarrazões/.test(x.t)).acao);
  const tTudo = await abrir(PA, KA, "tudo");
  conf("2.14b no Caso completo o cartão do bloco herda do gêmeo o 'Novo · não lido' (os 6 movimentos por ler)",
    (tTudo.match(/Novo · não lido/g) || []).length === 6 && /Marcar 6 como lidos/.test(tTudo));
  const evT = await p.evaluate(([k, s0]) => { const e = eventoNoTexto(`🖥 CRPS · 13/10/2026 — ⚖️ Pautado para julgamento em ${s0.split("-").reverse().join("/")} 09:00`);
    return { e, v: sessaoVigente(e, k) }; }, [KA, S0]);
  conf("2.15 'Pautado para julgamento em…' é data de agendamento (Julgamento) e vai à sessão que vale (a remarcada)",
    evT.e && evT.e.tipo === "Julgamento" && evT.e.data === S0 && evT.v.data === S1);
  const classico = await p.evaluate(k => { const a = D._andsFicha.find(x => x.caso_id === k && x.origem === "crps");
    document.documentElement.removeAttribute("data-tema"); try { return comentario(a); } finally { document.documentElement.setAttribute("data-tema", "v10"); } }, KA);
  conf("2.16 no visual clássico o movimento do e-Recursos tem a fonte como autor, não quem importou", />Recursos</.test(classico) && !/>Paulo</.test(classico));

  // propor: um clique agenda o julgamento (o caminho de sempre, com a conferência do resultado); a sustentação é outro clique
  await p.evaluate(k => agendarSessaoCrps(k), KA);
  await espera(700);
  const conferir = await p.evaluate(d => proxDiaUtil(somaDias(d, 1)), S1);
  const julg = T.eventos.find(e => e.caso_id === KA && e.tipo === "Julgamento");
  const andConf = T.andamentos.find(a => a.caso_id === KA && String(a.texto || "").startsWith(`⚖️ Julgamento agendado para ${pt(S1)} às 09:00`));
  const tfConf = andConf && T.andamento_tarefas.find(t => t.andamento_id === andConf.id);
  conf("2.17 o clique agenda o julgamento na data da sessão que vale e a tarefa de conferir o resultado no dia útil seguinte",
    julg && julg.data_hora.startsWith(S1) && julg.status === "agendada" && tfConf && tfConf.lembrar_em === conferir);
  conf("2.18 a tarefa da sustentação NÃO nasce sozinha (o escritório decide)", !T.andamentos.some(a => a.caso_id === KA && /^🎙/.test(a.texto || "")));
  await p.evaluate(k => propostaSustentacao(k), KA);
  await espera(700);
  const andS = T.andamentos.find(a => a.caso_id === KA && /^🎙 Sustentação oral/.test(a.texto || ""));
  const tfS = andS && T.andamento_tarefas.find(t => t.andamento_id === andS.id);
  conf("2.19 o '＋ tarefa da sustentação oral' cria a tarefa com a data limite do Regimento (3 dias úteis antes)",
    tfS && tfS.lembrar_em === sust && andS.texto.includes(`até ${pt(sust)}`) && /Fala\.BR/.test(andS.texto));
  const tA2 = await abrir(PA, KA, "crps");
  conf("2.20 depois dos cliques, o quadro diz '✔ Na agenda.' e '✔ Tarefa criada.' (nada se repete)",
    /✔ Na agenda\./.test(tA2) && /✔ Tarefa criada\./.test(tA2) && !/Agendar julgamento com aviso/.test(tA2));

  // ══ 3 · a importação (aplicarCrps) ═════════════════════════════════════════════════════════════════════
  await p.evaluate(c => aplicarCrps(c), COL);
  await espera(800);
  const kB = T.casos.find(k => k.id === KB), kC = T.casos.find(k => k.id === KC);
  conf("3.1 provimento importado: a data da decisão é a do acórdão (o envio à APS não regrava) e o resultado fica deferido",
    kB.decisao_em === iso(-10) && kB.resultado === "deferido");
  conf("3.2 negativa importada: a data da decisão é a do acórdão (a notificação e a carta não são decisão) e o resultado não vira deferido",
    kC.decisao_em === iso(-20) && kC.resultado === "indeferido");
  const imp = await p.evaluate(([b, c]) => ({ recB: recorrerAte(D.casoPorId.get(b)), recC: recorrerAte(D.casoPorId.get(c)),
    stC: crpsBlocos(D.casoPorId.get(c))[0].status, alcB: alcadaJunta(D.casoPorId.get(b)),
    seloB: seloOrgao(crpsBlocos(D.casoPorId.get(b))[0].eventos.find(e => e.tipo === "decisao"), null, D.casoPorId.get(b)),
    seloC: seloOrgao(crpsBlocos(D.casoPorId.get(c))[0].eventos.find(e => e.tipo === "decisao"), null, D.casoPorId.get(c)) }), [KB, KC]);
  conf("3.3 o recurso ganho não arma 'Recorrer até'; o perdido arma, e a situação é a negativa, não a notificação",
    imp.recB === null && !!imp.recC && /^⛔ Recurso negado \(12ª Junta\) em/.test(imp.stC));
  conf("3.4 o selo da Junta segue o resultado: no ganho, 'decisão favorável' (e alçada pela PMF); no perdido fora da alçada, 'cabe recurso especial'",
    imp.alcB === "certa" && /decisão favorável/.test(imp.seloB) && !/cabe recurso especial/.test(imp.seloB) && /cabe recurso especial/.test(imp.seloC));
  const andsB = T.andamentos.filter(a => a.caso_id === KB && a.origem === "crps").map(a => a.texto);
  conf("3.5 o andamento do provimento não diz 'cabe Recurso Especial'; o do envio à APS não é decisão",
    andsB.some(t => /✅ Recurso PROVIDO/.test(t) && /INSS deve cumprir/.test(t)) && !andsB.some(t => /cabe Recurso Especial/.test(t))
    && andsB.some(t => /📤 Enviado ao INSS para cumprir/.test(t)));
  const jD = T.eventos.find(e => e.caso_id === KD && e.tipo === "Julgamento"), aD = T.andamentos.find(a => a.id === AND_D), tD = T.andamento_tarefas.find(t => t.id === TF_D);
  const confD = await p.evaluate(d => proxDiaUtil(somaDias(d, 1)), S1D);
  conf("3.6 a remarcação importada leva o julgamento que já estava na agenda para a data e a hora novas, com a tarefa de conferir",
    jD.data_hora.startsWith(`${S1D}T10:30`) && jD.status === "agendada" && tD.lembrar_em === confD && aD.texto.includes(pt(S1D)) && /era/.test(aD.texto));
  conf("3.7 a importação não cria julgamento sozinha: B e C (sem sessão futura) seguem sem agenda", !T.eventos.some(e => [KB, KC].includes(e.caso_id)));

  // ── a mensagem ao cliente da decisão ──
  const msgs = await p.evaluate(([b, c]) => {
    const dec = k => crpsBlocos(D.casoPorId.get(k))[0].eventos.find(e => e.tipo === "decisao");
    return { b: msgDecisaoCrps(D.casoPorId.get(b), dec(b)), c: msgDecisaoCrps(D.casoPorId.get(c), dec(c)) };
  }, [KB, KC]);
  conf("3.8 a mensagem do recurso ganho explica o resultado e o cumprimento, sem a instrução interna do recurso especial",
    /foi provido pela 7ª Junta de Recursos/.test(msgs.b) && /INSS agora precisa cumprir/.test(msgs.b) && !/Recurso Especial|⚠/.test(msgs.b));
  conf("3.9 a mensagem do recurso negado diz o resultado, as duas vias e a data limite",
    /foi negado pela 12ª Junta de Recursos/.test(msgs.c) && /recorrer à Câmara de Julgamento até \d{2}\/\d{2}\/\d{4}/.test(msgs.c) && /ação na Justiça/.test(msgs.c));
  await abrir(PB, KB, "escritorio");
  const msgB = await p.evaluate(k => { const a = D._andsFicha.find(x => x.caso_id === k && x.origem === "crps" && /Enviado ao INSS/.test(x.texto || ""));
    msgAndamento(a.id); const v = (document.getElementById("msg-and") || {}).value || ""; fecharCaixa(); return v; }, KB);
  conf("3.10 a 'Mensagem ao cliente' do movimento não leva a linha '⚠' da equipe", /Enviado ao INSS para cumprir/.test(msgB) && !/⚠/.test(msgB));
  const tB = await abrir(PB, KB, "crps");
  conf("3.11 o quadro do recurso ganho diz o prazo do INSS para cumprir (30 dias do recebimento, Portaria 996, art. 15; até 60 da disponibilização, art. 117, § 1º)",
    /O INSS deve cumprir o acórdão em 30 dias do recebimento/.test(tB) && /art\. 15/.test(tB) && /art\. 117, § 1º/.test(tB) && /definitiva/.test(tB));

  // ══ 4 · aguardando distribuição (alçada provável) e diligência ═══════════════════════════════════════════
  const tG = await abrir(PG, KG, "crps");
  conf("4.1 aguardando distribuição: o próximo passo, a PMF da matéria médica (art. 89, § 4º) e nada a cumprir agora",
    /Próximo: a distribuição ao relator na 12ª Junta de Recursos/.test(tG) && /art\. 89, § 4º/.test(tG) && /Nada a cumprir agora/.test(tG));
  conf("4.2 avisa antes da decisão que o acórdão da Junta será definitivo em matéria médica (alçada, art. 89, § 3º)",
    /acórdão será definitivo, sem recurso especial/.test(tG) && /art\. 89, § 3º/.test(tG));
  conf("4.3 o prazo do CRPS para julgar: 365 dias da entrada, sem a diligência (art. 77, §§ 5º e 6º)",
    tG.includes(`365 dias da entrada (${brC(iso(-21))})`) && tG.includes(brC(mais(iso(-21), 365))) && /art\. 77, §§ 5º e 6º/.test(tG));
  const tH = await abrir(PH, KH, "crps");
  conf("4.4 em diligência: desde quando, o prazo que chegou pelo PAT como exigência e o que acontece sem resposta",
    tH.includes(`Em diligência desde ${brC(iso(-14))}`) && tH.includes(`A resposta vai até ${brC(iso(18))}`) && /art\. 85, § 2º/.test(tH) && /art\. 75, § 12/.test(tH));
  conf("4.5 a resposta vai pelo Meu INSS e a ficha não tem a senha: o quadro avisa", /não tem a senha do gov\.br/.test(tH));
  conf("4.6 a situação da diligência é a providência traduzida, e não a notificação crua",
    /SITUAÇÃO\s*📋 Providências da diligência pedidas à parte pelo Meu INSS \(tarefa 998431207\)/i.test(tH) && !/Notificação efetuada automaticamente/.test(tH));

  conf("sem erro de página", !p._erros.length);
  if (p._erros.length) console.log(p._erros.join("\n"));
  const bons = ok.filter(x => x[1]).length;
  console.log(`\n${bons}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(bons === ok.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
