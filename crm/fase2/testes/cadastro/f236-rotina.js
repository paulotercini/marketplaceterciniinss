// F236 · a rotina de cada pessoa: o Meu Dia traz o que é DELA (vencidas primeiro, hoje e o próximo dia
// útil), com os prazos dos tribunais, o recorrer até, a perícia passada sem confirmação, o honorário
// vencido, o card de aposentadoria com dono e o que só chegava pelas Novidades (perícia a agendar, pauta
// do CRPS, decisão sem comentário); o contador da barra é o da pessoa; Calendário e Planejado com o tipo
// Prazo; as listas abrem na pessoa e na ordem da data que cobra; menções à parte; o recado de retorno
// sugere a menção. Banco simulado, dados fictícios. Uso: node f236-rotina.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";

const hoje = new Date().toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });
const dia = n => { const d = new Date(hoje + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const br = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const pt = iso => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;
const ts = (n, h = "10:00") => `${dia(n)}T${h}:00-03:00`;

const EU = FIX.colaboradores[0].id;
const AUTH = { paulo: SESSAO.user.id, amanda: "a2222222-2222-2222-2222-222222222222", andre: "a5555555-5555-5555-5555-555555555555", rita: "a4444444-4444-4444-4444-444444444444" };
const AM = "22222222-2222-2222-2222-222222222222", AN = "55555555-5555-5555-5555-555555555555", RI = "44444444-4444-4444-4444-444444444444";
const equipe = [
  { ...FIX.colaboradores[0] },
  { id: AM, auth_id: AUTH.amanda, nome: "Amanda Fictícia Garcez", inicial: "A", cor: "#1B6E38", papel: "colaborador", ativo: true, cargo: "advogado", setor: null },
  { id: AN, auth_id: AUTH.andre, nome: "André Fictício Lopes", inicial: "D", cor: "#6B3FA0", papel: "colaborador", ativo: true, cargo: "estagiario", setor: null },
  { id: RI, auth_id: AUTH.rita, nome: "Rita Fictícia Recepção", inicial: "R", cor: "#3A6491", papel: "colaborador", ativo: true, cargo: "recepcao", setor: null },
];

const cli = (id, nome, campos = {}) => ({ id, nome, cpf: null, dn: null, telefone: "(16) 99999-0000", telefones: [], campos, criado_em: "2026-01-10T12:00:00Z" });
const caso = (id, cliente_id, fase, extra = {}) => ({ id, cliente_id, titulo: extra.beneficio || "Auxílio por incapacidade temporária", beneficio: "Auxílio por incapacidade temporária",
  especie: "B31", fase, origem_lista: "👪 Judicial", protocolos: [], processos: [], crps_nups: [], nbs: [], marcadores: [], arquivados: {}, ronda: {}, prazos_tribunal: [],
  importante: false, urgente: false, dcb_prorrogacao_pedida: false, renda_acima_minimo: false, encerrado_em: null, criado_em: "2026-02-01T12:00:00Z", ...extra });
const and = (id, caso_id, autor_id, texto, n, extra = {}) => ({ id, caso_id, autor_id, texto, criado_em: ts(n), origem: "app", publico: false, excluir: false, todo_sync: false, ...extra });

const clientes = [
  cli("c1", "Ana Ficta Prazo"), cli("c2", "Bruno Ficto Recurso"), cli("c3", "Carla Ficta Card"), cli("c4", "Dora Ficta Virou"),
  cli("c5", "Edu Ficto Pessoal"), cli("c6", "Fábio Ficto Cessado"), cli("c7", "Gil Ficto Prorroga"), cli("c8", "Hilda Ficta Avaliação"),
  cli("c9", "Ivo Ficto Honorário"), cli("c10", "Joana Ficta Perícia", { agenda_quarta: { data: dia(1), inicio: "09:00", profissional: "paulo" } }),
  cli("c11", "Kátia Ficta Pauta"), cli("c12", "Lia Ficta Decisão"), cli("c13", "Mara Ficta Comentada"),
];
const casos = [
  caso("k1", "c1", "judicial", { prazos_tribunal: [{ numero: "5000001-11.2026.4.03.6302", sistema: "pje", origem: "pje:x", ato: "Sentença", dias: 10, fim: dia(3), expedido_em: dia(-5), situacao: "aberto" }] }),
  caso("k1b", "c1", "inss", { beneficio: "Aposentadoria por idade", especie: "B41", origem_lista: "🌻 INSS" }),
  caso("k2", "c2", "inss", { decisao_em: dia(-10), origem_lista: "🌻 INSS" }),
  caso("k4", "c4", "inss", { beneficio: "Apos. por Idade", especie: "B41", origem_lista: "🌻 INSS" }),
  caso("k5", "c5", "outro", { origem_lista: "☕ Ficto", prazo: dia(1), beneficio: null, especie: null }),
  caso("k6", "c6", "judicial", { dcb: dia(-100) }),
  caso("k7", "c7", "inss", { dcb: dia(10), origem_lista: "🌻 INSS" }),
  caso("k8", "c8", "inss", { beneficio: "BPC/LOAS — deficiência", especie: "B87", origem_lista: "🌻 INSS" }),
  caso("k9", "c9", "pagamento", { origem_lista: "💵 Pagamentos" }),
  caso("k10", "c10", "judicial"),
  caso("k11", "c11", "conselho", { origem_lista: "🖥 Conselho de Recursos" }),
  caso("k12", "c12", "inss", { origem_lista: "🌻 INSS" }),
  caso("k13", "c13", "inss", { origem_lista: "🌻 INSS" }),
];
const atribuicoes = [["k1", AM], ["k1b", AM], ["k2", AN], ["k7", AM], ["k8", AN], ["k9", AM], ["k10", EU], ["k11", AM], ["k12", AM], ["k13", AM]]
  .map(([caso_id, colaborador_id]) => ({ caso_id, colaborador_id }));
const andamentos = [
  // a linha do tempo do k1: um não lido antigo, um lido no meio e a menção a mim no topo
  and("a-k1-1", "k1", AM, "Juntei o laudo do ortopedista.", -6), and("a-k1-2", "k1", AM, "Cliente ligou pedindo notícias.", -4),
  and("a-k1-3", "k1", AM, "Protocolei a manifestação.", -3), and("a-k1-4", "k1", AM, "Sentença saiu. @Paulo, recorremos?", -1),
  // a tarefa do Paulo, com o pedido dito a ele
  and("a-k10", "k10", AM, "Ligação recebida. @Paulo, confira o laudo antes da audiência.", 0),
  // a tarefa que o Paulo passou ao André, com a menção ainda sem leitura
  and("a-k8", "k8", EU, "@André, ligue para a cliente sobre a avaliação.", -2),
  // o que os robôs trouxeram
  and("n-k10", "k10", EU, `PJe (1º grau): Designada perícia médica (${br(dia(10))} às 13:40 - ORTOPEDIA - sala de perícias) — em ${br(dia(-1))} 14:10`, -1, { origem: "pje" }),
  and("n-k11", "k11", EU, `🖥 CRPS · ${br(dia(-1))} — ⚖️ Pautado para julgamento em ${br(dia(6))} 09:00`, -1, { origem: "crps" }),
  and("n-k12", "k12", EU, "INSS: Em análise → Concluída - Indeferida", -2, { origem: "pat" }),
  and("n-k13", "k13", EU, "INSS: Em análise → Concluída - Indeferida", -3, { origem: "pat" }),
  and("a-k13", "k13", AM, "Indeferido: vamos recorrer à Junta.", -1),
  and("n-k1", "k1", EU, `⏰ Prazo no PJe: Sentença (10 dias) — vence em ${br(dia(3))}.`, -1, { origem: "pje" }),
  // F304 · a mesma mudança vinda do acervo e da leitura dos documentos, e o mesmo movimento em duas RPVs do e-SAJ
  and("r-acervo", "k6", EU, `PJe (1º grau): Disponibilizado no DJ Eletrônico em ${br(dia(-1))} — em ${pt(dia(0))} 01:12 — CumSenFaz 5001644-98.2024.4.03.6314`, 0, { origem: "pje" }),
  and("r-docs", "k6", EU, `PJe (1º grau): Disponibilizado no DJ Eletrônico em ${br(dia(-1))} · Juntada de ato ordinatório · 📎 Ato Ordinatório — em ${pt(dia(-2))} 15:13 — CumSenFaz 5001644-98.2024.4.03.6314`, -2, { origem: "pje" }),
  and("r-rpv1", "k6", EU, `e-SAJ TJSP (1º grau): Suspensão do Prazo — em ${pt(dia(-1))} 00:00 — Requisição de Pequeno Valor (01) 0000035-73.2026.8.26.0381`, -1, { origem: "pje" }),
  and("r-rpv2", "k6", EU, `e-SAJ TJSP (1º grau): Suspensão do Prazo — em ${pt(dia(-1))} 00:00 — Requisição de Pequeno Valor (02) 0000035-73.2026.8.26.0381`, -1, { origem: "pje" }),
  and("r-pet1", "k6", EU, `PJe (1º grau): Juntada de Petição de manifestação — em ${pt(dia(-1))} 10:00 — CumSenFaz 5001644-98.2024.4.03.6314`, -1, { origem: "pje" }),
  and("r-pet2", "k6", EU, `PJe (1º grau): Juntada de Petição de manifestação — em ${pt(dia(-12))} 10:00 — CumSenFaz 5001644-98.2024.4.03.6314`, -12, { origem: "pje" }),
];
const dados = {};
for (const t of ["eventos", "pagamentos", "meu_dia", "sugestoes", "leads", "checklist_modelo", "frases_prontas", "lembrar_motivos", "rotinas_feitas", "aposentadorias",
  "lista_pref", "zap_conversas", "inss_calendario", "vinculos", "anexos", "conversas", "modelos_mensagem", "credencial_vis", "analises_direito", "apagados",
  "lembrete_avisos", "credenciais"]) dados[t] = [];
Object.assign(dados, {
  colaboradores: equipe, clientes, casos, atribuicoes, andamentos, documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento,
  config_app: FIX.config_app,
  andamentos_lidos: [{ andamento_id: "a-k1-1", colaborador_id: EU }, { andamento_id: "a-k1-3", colaborador_id: EU }],
  tarefas: [{ id: "t1", cliente_id: "c1", caso_id: "k1", titulo: "📄 Laudo novo do ortopedista", prazo: dia(-2), concluida: false, particular_de: null }],
  andamento_tarefas: [
    { id: "tp", andamento_id: "a-k10", caso_id: "k10", colaborador_id: EU, atribuido_por: AM, lembrar_em: hoje, concluida_em: null, natureza: "compromisso", papel: "executa" },
    { id: "td", andamento_id: "a-k8", caso_id: "k8", colaborador_id: AN, atribuido_por: EU, lembrar_em: dia(5), concluida_em: null, natureza: "compromisso", papel: "executa" }],
  mencoes: [
    { id: "m1", de_id: AM, para_id: EU, caso_id: "k1", andamento_id: "a-k1-4", texto: "Sentença saiu. @Paulo, recorremos?", criado_em: ts(-1), lida_em: null },
    { id: "m2", de_id: AM, para_id: EU, caso_id: "k10", andamento_id: "a-k10", texto: "Ligação recebida. @Paulo, confira o laudo antes da audiência.", criado_em: ts(0), lida_em: null },
    { id: "m3", de_id: EU, para_id: AN, caso_id: "k8", andamento_id: "a-k8", texto: "@André, ligue para a cliente sobre a avaliação.", criado_em: ts(-2), lida_em: null }],
  eventos: [
    { id: "e1", caso_id: "k8", tipo: "Avaliação social", data_hora: ts(-3, "14:00"), status: "agendada", local: "APS", obs: null },
    { id: "e2", caso_id: "k8", tipo: "Perícia médica", data_hora: ts(2, "08:20"), status: "agendada", local: "APS", obs: null }],
  pagamentos: [{ id: "p1", caso_id: "k9", cliente_id: "c9", descricao: "Honorários 30% dos atrasados", valor: 1000, vencimento: dia(-4), status: "aberto" }],
  lembretes: [
    { id: "l1", cliente_id: "c3", tipo: "aposentadoria_futura", titulo: "Apos. por Idade", proximo_em: dia(-60), ativo: true, responsavel_id: null, crm: { data_direito: dia(-20) }, detalhes: {} },
    { id: "l2", cliente_id: "c4", tipo: "aposentadoria_futura", titulo: "Apos. por Idade", proximo_em: dia(-90), ativo: true, responsavel_id: null, crm: { data_direito: dia(-30) }, detalhes: {} }],
  rotinas: [{ id: "r1", titulo: "Conferir o e-mail do escritório", ativo: true, dias_semana: [], dia_mes: null, responsavel_id: AN, criada_em: "2026-01-01T12:00:00Z" }],
  coletas: [{ id: "col1", fonte: "pat", criado_em: new Date().toISOString(), aplicada_em: null, dados: {} }],
});
const banco = new Banco(dados);

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
  const erros = [];
  async function entrar(quem) {
    const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
    const sess = { ...SESSAO, user: { ...SESSAO.user, id: AUTH[quem] } };
    await ctx.addInitScript(([u, ss]) => {
      localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
      localStorage.setItem("crm_sessao", JSON.stringify(ss));
      localStorage.setItem("crm_tema", "v10");
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
  // os itens da agenda de uma pessoa, resumidos para conferir
  const itens = (p, col) => p.evaluate(c => itensAgenda(c).map(i => ({ cli: (i.cli || {}).id || null, data: i.data, selo: i.selo || "", resumo: i.resumo || "",
    fatal: !!i.fatal, prazo: !!i.prazo, rot: !!i.rotina, conf: !!i.evPassado, avisar: !!i.avisar, tc: i.tc ? i.tc.id : null })), col);

  // ══ 1 · o Paulo (administrador) ═══════════════════════════════════════
  const paulo = await entrar("paulo");
  const f = await paulo.evaluate(() => ({ dia: filtroDia, lista: filtroColab, ordem: document.getElementById("ordem").value,
    meu: [...D.atrDoCaso.values()].some(v=>v.includes(eu.id)) ? eu.id : null }));
  conf("o Meu Dia abre no dia de quem entrou e as listas, na pessoa (decisão do Paulo)", f.dia === EU && f.lista === f.meu);
  conf("as listas abrem pela data que cobra (Data mais próxima)", f.ordem === "prazo");
  const ip = await itens(paulo, EU);
  conf("o card com o direito alcançado e sem caso vai ao Paulo (sem advogado no cliente), com protocolar já",
    ip.some(i => i.cli === "c3" && i.selo === "Aposentadoria" && /protocolar já/.test(i.resumo) && i.data === dia(-20)));
  conf("o card que já virou caso (caso aberto do mesmo benefício) não cobra mais", !ip.some(i => i.cli === "c4") && !(await itens(paulo, null)).some(i => i.cli === "c4"));
  conf("a perícia designada no PJe e fora da agenda chega ao atribuído do caso, para agendar",
    ip.some(i => i.cli === "c10" && i.selo === "Agendar" && /agendar e avisar/.test(i.resumo)));
  conf("a tarefa diz o que a pessoa tem de fazer (a frase que a chama) e do que se trata",
    ip.some(i => i.tc === "tp" && i.data === hoje) && await paulo.evaluate(() => /^confira o laudo antes da audiência — ligação recebida$/.test(
      resumoAgenda("Ligação recebida. @Paulo, confira o laudo antes da audiência.", D.colPorId.get(eu.id)))));
  conf("a tarefa solta do caso da Amanda não cai no Meu Dia do Paulo", !ip.some(i => i.cli === "c1"));
  conf("a lista pessoal do To Do (fase outro, ☕) fica fora da agenda e do Calendário",
    !(await itens(paulo, null)).some(i => i.cli === "c5") && await paulo.evaluate(() => !itensDoCalendario().some(i => i.cliId === "c5")));
  const barra = await paulo.evaluate(() => { const mine = itensAgenda(eu.id), hj = hoje();
    return { venc: quantosVencidos(), hoje: quantosNoMeuDia(), mV: mine.filter(i => i.data < hj).length, mH: mine.filter(i => i.data === hj).length,
      todosV: itensAgenda(null).filter(i => i.data < hj).length, cont: (document.querySelector('#grupo-dinamicas [data-v="meudia"] .cont') || {}).textContent || "" }; });
  conf(`o contador da barra é o da pessoa (${barra.cont}; o escritório tem ${barra.todosV} vencidas)`, barra.venc === barra.mV && barra.hoje === barra.mH
    && barra.venc < barra.todosV && barra.cont.replace(/\s/g, "") === `${barra.venc}·${barra.hoje}`);
  const md = await paulo.evaluate(() => { visao = "meudia"; render();
    return { secoes: [...document.querySelectorAll("#conteudo-meio .pl-grupo h3.secao")].map(h => h.textContent.replace(/\s+/g, " ").trim()),
      deleg: (d => d ? { aberta: d.open, txt: d.textContent } : null)(document.querySelector("details.pl-dobra")),
      sub: document.getElementById("sub-lista").innerHTML, txt: document.getElementById("conteudo-meio").innerText }; });
  // a menção que já está no dia como tarefa minha (a do k10, hoje) não se repete na seção das menções
  conf(`o Meu Dia abre pelas vencidas, depois hoje e as menções (${md.secoes.map(x => x.split(" ")[0]).join(", ")})`,
    /^Vencidas/.test(md.secoes[0]) && /^Hoje/.test(md.secoes[1]) && /^Menções a você 1/.test(md.secoes[2]) && /recorremos/.test(md.txt));
  conf("o próximo dia útil tem seção própria", md.secoes.some(x => /^(Amanhã|Até \S+, \d{2}\/\d{2})/.test(x)));
  conf("Delegadas por mim fica recolhida embaixo e diz que a menção não foi lida",
    md.deleg && md.deleg.aberta === false && /1 sem leitura/.test(md.deleg.txt) && /não lida há 2 d/.test(md.deleg.txt));
  conf("o atalho leva ao Planejado já filtrado na pessoa", /filtroPlanColab=filtroDia;irPara\('planejado'\)/.test(md.sub));
  const cal = await paulo.evaluate(() => { const it = itensDoCalendario(); return { prazo: it.filter(i => i.tipo === "prazo").map(i => i.cliId), atend: it.some(i => i.tipo === "atend" && i.cliId === "c10"),
    leg: TIPOS_CAL.prazo && TIPOS_CAL.prazo.nome }; });
  conf("o Calendário tem o tipo Prazo, com o prazo do tribunal e o recorrer até", cal.prazo.includes("c1") && cal.prazo.includes("c2") && /^Prazo/.test(cal.leg || ""));
  conf("o atendimento presencial entra no Calendário", cal.atend);
  const lst = await paulo.evaluate(() => { visao = "fase:judicial"; filtroColab = null; render();
    const n = document.querySelectorAll("#conteudo-meio .cartao[data-cli]").length, nBarra = casosDaFase("judicial").length;
    const primeiro = (document.querySelector("#conteudo-meio .cartao[data-cli]") || {}).dataset.cli;
    filtroColab = "22222222-2222-2222-2222-222222222222"; render();
    const conta = (document.querySelector(".filtro-conta") || {}).textContent || "";
    filtroColab = null; render();
    const inss = (visao = "fase:inss", render(), document.querySelector('#conteudo-meio .cartao[data-cli="c1"]'));
    return { n, nBarra, primeiro, conta, maisCaso: inss ? inss.textContent : "" }; });
  conf(`a lista da fase em Todos tem o mesmo número da barra (${lst.n} de ${lst.nBarra})`, lst.n === lst.nBarra && lst.n === 3);
  conf("com o filtro por pessoa, a lista diz quantos mostra de quantos", /mostrando 1 de 3/.test(lst.conta));
  conf("a lista começa pela data que cobra (o prazo do PJe de daqui a 3 dias vem antes do caso sem data)", lst.primeiro === "c1");
  conf("o cliente com outro caso aberto avisa na linha", /\+1 caso/.test(lst.maisCaso));
  const nov = await paulo.evaluate(() => { visao = "novidades"; render();
    return [...document.querySelectorAll("#conteudo-meio h3.secao")].map(h => h.textContent.trim()); });
  // a perícia do PJe e o julgamento do CRPS em pauta: os dois pedem agendar (a pauta virou julgamento na frente crps)
  conf(`as Novidades abrem pelo que pede ação, sem os prazos dos tribunais (${nov.slice(0, 2).join(" | ")})`, /^🩺 Perícias, audiências e julgamentos a agendar \(2\)/.test(nov[0]) && !nov.some(t => /Prazos dos tribunais/.test(t)));
  const rep = await paulo.evaluate(() => [...document.querySelectorAll("#conteudo-meio .nov")].map(e => e.dataset.and));
  conf("F304 · o prazo do expediente não é novidade", !rep.includes("n-k1"), rep);
  conf("F304 · o movimento do acervo que a leitura dos documentos já trouxe aparece uma vez, na linha mais completa", rep.includes("r-docs") && !rep.includes("r-acervo"), rep);
  conf("F304 · o mesmo movimento em duas RPVs do e-SAJ aparece uma vez", rep.filter(x => /^r-rpv/.test(x)).length === 1, rep);
  conf("F304 · a mesma petição em semanas diferentes continua duas vezes", rep.includes("r-pet1") && rep.includes("r-pet2"), rep);
  const lidoJunto = await paulo.evaluate(async () => { await marcarLidas(["r-docs"]);
    const li = id => ((D.novid || []).find(a => a.id === id).andamentos_lidos || []).some(l => l.colaborador_id === eu.id);
    return li("r-acervo"); });
  conf("F304 · lida a linha que ficou, a repetida escondida fica lida também", lidoJunto);
  const lat = await paulo.evaluate(() => ({ hoje: [...document.querySelectorAll("#grupo-dinamicas .lista-item")].map(e => e.dataset.v).join(","),
    imp: (document.querySelector('#grupo-visoes [data-v="patinss"] .cont') || {}).textContent || "" }));
  conf("as Novidades saem do Mais e entram na faixa do dia do administrador", /meudia,mencoes,novidades/.test(lat.hoje));
  conf(`o Importar mostra na barra quantas coletas esperam (${lat.imp})`, lat.imp === "1");
  const ult = await paulo.evaluate(async () => { visao = "patinss"; render(); await new Promise(r => setTimeout(r, 500));
    return (document.querySelector(".ult-coletas") || {}).textContent || ""; });
  conf(`o Importar diz quando cada portal foi lido (${ult.replace(/\s+/g, " ").trim()})`, /Última leitura de cada portal: 🌻 INSS \d{2}\.\d{2}/.test(ult));
  const aps = await paulo.evaluate(() => { _cardsFiltro = null; visao = "fase:aposentadoria_futura"; render();
    return (document.querySelector('.fchip.on[data-horiz]') || {}).dataset.horiz; });
  conf("Aposentadorias futuras abre nos vencidos quando há", aps === "vencido");
  const ano = await paulo.evaluate(() => ({ outro: dataRelativa("2025-10-10"), este: dataRelativa(hoje()) === "Hoje" && !/\d{4}/.test(dataRelativa(somaDias(hoje(), 3))) }));
  conf(`a data de outro ano leva o ano (${ano.outro})`, /10\.10\.2025/.test(ano.outro) && ano.este);
  // a linha do tempo do k1: a menção à parte e a fronteira depois do último não lido
  const tl = await paulo.evaluate(async () => { await abrirFicha("c1");
    const m = document.getElementById("modal"); if (m && m.style.display !== "none" && m.querySelector(".proc-op")) m.style.display = "none";
    casoSel = "k1"; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); await new Promise(r => setTimeout(r, 500));
    const lis = [...document.querySelectorAll("ul.timeline li.tl-card, ul.timeline li.tl-fim-novas")].map(l => l.className.includes("tl-fim-novas") ? "|" : (l.textContent.match(/Juntei|ligou|Protocolei|recorremos/) || [""])[0]).filter(Boolean);
    return { banner: [...document.querySelectorAll(".tl-banner-menc")].map(b => b.textContent).join(" "), selo: document.querySelectorAll(".tl-menc").length, ordem: lis.join(">") }; });
  conf("a linha do tempo conta as menções a você à parte, com o selo no cartão", /1 menção a você sem leitura/.test(tl.banner) && tl.selo === 1);
  // (a fronteira do não lido depois do último não lido é correção da frente crps: o teste dela confere)
  // um gesto fecha o aviso: concluir a tarefa baixa a menção dela; marcar lido baixa a do andamento
  await paulo.evaluate(async () => { fecharFicha(false); await concluirDeVez("tp"); await marcarLidas(["a-k1-4"]); });
  conf("concluir a tarefa e marcar o andamento como lido baixam as menções", banco.t.mencoes.filter(m => ["m1", "m2"].includes(m.id)).every(m => m.lida_em));
  await paulo.context().close();

  // ══ 2 · a Amanda (advogada) ═══════════════════════════════════════════
  const amanda = await entrar("amanda");
  const ia = await itens(amanda, AM);
  conf("o prazo do PJe chega à atribuída, como Prazo, na data do fim", ia.some(i => i.cli === "c1" && i.prazo && /^Prazo PJe/.test(i.selo) && i.data === dia(3)));
  conf("a tarefa solta do caso vai a quem responde pelo caso", ia.some(i => i.cli === "c1" && /Laudo novo/.test(i.resumo)));
  conf("o honorário vencido vai à advogada do caso, com o valor", ia.some(i => i.cli === "c9" && i.selo === "Honorários" && /R\$\s?1\.000,00/.test(i.resumo)));
  conf("a pauta do CRPS (ainda não lida) vai à atribuída", ia.some(i => i.cli === "c11" && i.selo === "Pauta" && new RegExp(dia(6).slice(8, 10) + "\\.").test(i.resumo)));
  conf("a decisão do INSS sem comentário da equipe vai à atribuída; a já comentada, não",
    ia.some(i => i.cli === "c12" && i.selo === "Decisão") && !ia.some(i => i.cli === "c13" && i.selo === "Decisão"));
  conf("pedir a prorrogação só enquanto a DCB não passou", ia.some(i => i.cli === "c7" && /prorrogação/.test(i.resumo))
    && !(await itens(amanda, null)).some(i => i.cli === "c6" && /prorrogação/.test(i.resumo)));
  const ba = await amanda.evaluate(() => ({ nov: !!document.querySelector('.sidebar [data-v="novidades"]'), filtro: filtroColab,
    meu: [...D.atrDoCaso.values()].some(v=>v.includes(eu.id)) ? eu.id : null }));
  conf("a barra da advogada continua a do To Do (sem Novidades: decisão do advogado) e a lista abre nela", !ba.nov && ba.filtro === ba.meu);
  await amanda.context().close();

  // ══ 3 · o André (estagiário) ══════════════════════════════════════════
  const andre = await entrar("andre");
  const id = await itens(andre, AN);
  conf("a avaliação social passada sem confirmação cobra o atribuído no dia útil seguinte", id.some(i => i.cli === "c8" && i.conf && /confirmar se compareceu/.test(i.resumo)));
  conf("o recorrer até entra como Prazo para quem responde pelo caso", id.some(i => i.cli === "c2" && i.prazo && i.selo === "Prazo do recurso"));
  conf("a rotina do dia entra no Meu Dia de quem a faz", id.some(i => i.rot && i.data === hoje) && !ia.some(i => i.rot));
  conf("a tarefa solta do caso da Amanda não cai no Meu Dia do estagiário", !id.some(i => i.cli === "c1"));
  const bd = await andre.evaluate(() => ({ venc: quantosVencidos(), hoje: quantosNoMeuDia(), cont: (document.querySelector('.sidebar [data-v="meudia"] .cont') || {}).textContent || "" }));
  conf(`a barra do estagiário diz as vencidas e as de hoje dele (${bd.cont})`, bd.venc + bd.hoje > 0
    && bd.cont.replace(/\s/g, "") === (bd.venc && bd.hoje ? `${bd.venc}·${bd.hoje}` : String(bd.venc || bd.hoje)));
  await andre.context().close();

  // ══ 4 · a Rita (recepção) ═════════════════════════════════════════════
  const rita = await entrar("rita");
  const ir = await itens(rita, RI);
  conf("a recepção avisa o cliente das perícias da semana", ir.some(i => i.cli === "c8" && i.avisar));
  conf("e vê os atendimentos presenciais", ir.some(i => i.cli === "c10" && i.selo === "Atendimento"));
  const mr = await rita.evaluate(() => { visao = "meudia"; render(); return document.getElementById("sub-lista").innerHTML; });
  conf("sem o Planejado na barra, o Meu Dia da recepção não oferece o atalho para ele", !/irPara\('planejado'\)/.test(mr));
  // o recado de retorno sugere a menção, e a anotação rápida passa a criá-la
  await rita.evaluate(() => { anotacaoRapida(""); arEscolher("c3");
    const ta = document.getElementById("ar-texto"); ta.value = "Ligou perguntando da aposentadoria. Pedi para aguardar o retorno do Dr. Paulo.";
    ta.dispatchEvent(new Event("input")); });
  const sug = await rita.evaluate(() => (document.getElementById("ar-sug") || {}).textContent || "");
  conf(`o pedido de retorno sugere a menção a quem foi nomeado (${sug.trim()})`, /@Paulo recebe o recado/.test(sug));
  await rita.evaluate(async () => { document.querySelector("#ar-sug button").click(); await salvarAnotacaoRapida(); });
  conf("a anotação rápida com @ cria a menção, presa ao cliente", banco.t.mencoes.some(m => m.para_id === EU && m.de_id === RI && m.cliente_id === "c3" && /retorno/.test(m.texto)));
  await rita.context().close();

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros.join("\n"));
  const bons = ok.filter(x => x[1]).length;
  console.log(`\n${bons}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(bons === ok.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
