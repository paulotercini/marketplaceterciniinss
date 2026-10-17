// F236 · rodada final, frente "docs": a exigência cumprida é fato "aguardando análise" (a placa não volta a "em exigência");
// a linha das listas por fase avisa a etapa desatualizada; "Para o cliente providenciar" não passa da perícia, do prazo do
// caso nem do prazo do tribunal, cai em dia útil, não pede o laudo que não houve ou que está nos autos e diz de onde vem a
// lista; Pagamentos não monta pedido novo; a guia do pedido feito diz o que decide; o B31 da petição inicial fala do pedido
// negado, e não do auxílio antigo; o quadro "Do atendimento" vale no clássico; a pílula do clássico lê "Lembretes e datas";
// a trilha não destaca passo atrás de um cumprido; "Gerar os N" só com o que falta; a petição inicial propõe "a redigir".
// Banco simulado, dados fictícios. Uso: node f236-final-docs.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, EU } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";

const HOJE = new Date().toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });
const dia = n => { const d = new Date(HOJE + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const pt = n => dia(n).split("-").reverse().join(".");
const barra = n => dia(n).split("-").reverse().join("/");
const ts = (n, h = "12:00") => new Date(`${dia(n)}T${h}:00-03:00`).toISOString();

const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
// o catálogo mínimo das duas espécies (a lista "para o cliente providenciar" só aparece com catálogo)
const MARCOS = "22222222-2222-4222-8222-222222222222";
Object.assign(dados, { colaboradores: [...FIX.colaboradores, { id: MARCOS, auth_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", nome: "Marcos Fictício Amorim", inicial: "M",
    cor: "#7a5c2e", papel: "usuario", ativo: true, atende_zap: false, cargo: "advogado", setor: null }], clientes: [], casos: [], atribuicoes: [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app,
  documentos_beneficio: [
    { id: "e2369000-0000-4000-8000-000000000001", beneficio: "Aux. Incapacidade Temporária", itens: "RG, CNH ou CIN\nCPF\nBiometria — Verifique se está atualizada na Justiça Eleitoral",
      extras: "Atestado médico — com CID, período de afastamento e assinatura com CRM", observacoes: "" },
    { id: "e2369000-0000-4000-8000-000000000002", beneficio: "Apos. por Idade", itens: "RG, CNH ou CIN\nCPF\nComprovante de residência — conta de luz, água ou telefone",
      extras: "Carteira de Trabalho (CTPS) — todas as páginas", observacoes: "" }] });
const banco = new Banco(dados);
const T = banco.t;

let n = 0;
function cliente(nome, caso, extra) {
  n++;
  const cli = `c2369000-0000-4000-8000-${String(n).padStart(12, "0")}`, id = `b2369000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  T.clientes.push({ id: cli, nome, cpf: null, dn: null, telefone: null, telefones: [], campos: {}, criado_em: ts(-300), ...(extra || {}) });
  T.casos.push({ id, cliente_id: cli, titulo: nome, fase: "inss", etapa: null, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [],
    marcadores: [], arquivados: {}, ronda: {}, pje_links: {}, prazos_tribunal: [], encerrado_em: null, criado_em: ts(-300), ...caso });
  return { cli, id };
}
let na = 0;
const and = (caso, o) => T.andamentos.push({ id: `e2369100-0000-4000-8000-${String(++na).padStart(12, "0")}`, caso_id: caso, autor_id: EU,
  origem: "app", publico: false, excluir: false, ...o });
const situacao = (caso, proto, nova, antes, n, h = "07:40") => and(caso.id, { origem: "pat", origem_id: `situacao:${proto}:${nova}`,
  texto: antes ? `INSS: ${antes} → ${nova}` : `INSS · Situação registrada: ${nova}`, criado_em: ts(n, h) });
const pje = (caso, numero, texto, n, grau = "1º grau") => and(caso.id, { origem: "pje", origem_id: `hist:${n}:${texto.length}`,
  texto: `PJe (${grau}): ${texto} — em ${pt(n)} 10:00 — PJEC ${numero}`, criado_em: ts(n, "10:00") });
let ne = 0;
const evento = (caso, tipo, n, o) => T.eventos.push({ id: `d2369000-0000-4000-8000-${String(++ne).padStart(12, "0")}`, caso_id: caso.id, tipo, status: "agendada",
  data_hora: ts(n, "08:40"), local: "AGÊNCIA DA PREVIDÊNCIA SOCIAL RIBEIRÃO PRETO - CENTRO", criado_em: ts(-10), ...(o || {}) });

// A · B41 em exigência no PAT, etapa vazia; A2 · a mesma com a etapa "em exigência" aceita
const EXIG = `Apresentar a CTPS original do vínculo com a Tecelagem Fictícia São José Ltda (03/02/1986 a 31/07/1991) e declaração do empregador · prazo estimado: 30 dias do ato de ${pt(-3)} no PAT (a ciência não vem do portal)`;
const A = cliente("Ana Ficta Prado", { especie: "B41", beneficio: "Apos. por Idade", der: dia(-50), protocolos: ["1902117650"], exigencia_prazo: dia(27), exigencia_descricao: EXIG });
situacao(A, "1902117650", "Em análise", null, -49);
situacao(A, "1902117650", "Em exigência", "Em análise", -3);
// A3 · a mesma exigência, ainda aberta, com o contrato assinado (Documentos e guias)
const A3 = cliente("Aurora Ficta Pinto", { especie: "B41", beneficio: "Apos. por Idade", der: dia(-50), protocolos: ["1902117652"], exigencia_prazo: dia(27), exigencia_descricao: EXIG });
situacao(A3, "1902117652", "Em exigência", "Em análise", -3);
T.anexos.push({ id: "a2369000-0000-4000-8000-000000000001", cliente_id: A3.cli, caso_id: A3.id, origem: "assinado", nome: "Assinado · contrato.pdf", caminho: "assinados/x.pdf", criado_em: ts(-60) });
T.anexos.push({ id: "a2369000-0000-4000-8000-000000000002", cliente_id: A3.cli, caso_id: A3.id, origem: "gerado", nome: "Gerado · Declaração de Residência", caminho: "gerados/x.html", criado_em: ts(-55) });
const A2 = cliente("Abel Ficto Mendes", { especie: "B41", beneficio: "Apos. por Idade", der: dia(-50), protocolos: ["1902117651"], etapa: "em exigência", exigencia_prazo: dia(27), exigencia_descricao: EXIG });
situacao(A2, "1902117651", "Em análise", null, -49);
situacao(A2, "1902117651", "Em exigência", "Em análise", -3);
// B · a lista: a etapa marcada velha pela coleta (sem a ficha aberta) e a desmentida pelo PAT
const B = cliente("Beatriz Ficta Lopes", { especie: "B31", beneficio: "Aux. Incapacidade Temporária", der: dia(-45), protocolos: ["1798803100"], etapa: "aguardando perícia",
  trilha: { velha: { etapa: "aguardando perícia", proposta: "decidido", data: dia(-8), em: dia(-8) } } });
const B2 = cliente("Bruno Ficto Lemos", { especie: "B31", beneficio: "Aux. Incapacidade Temporária", der: dia(-45), protocolos: ["1798803101"], etapa: "aguardando perícia" });
situacao(B2, "1798803101", "Em análise", null, -44);
situacao(B2, "1798803101", "Concluída - Indeferida", "Em análise", -8);
// C · Documentos: B31 com perícia marcada e prazo do caso; B31 sem perícia (controle); B31 no JEF com prazo do PJe; B41 em Pagamentos
const C1 = cliente("Carlos Ficto Nunes", { especie: "B31", beneficio: "Aux. Incapacidade Temporária", der: dia(-20), protocolos: ["1790031245"], prazo: dia(10) });
evento(C1, "Perícia médica", 9);
const C2 = cliente("Cecília Ficta Rocha", { especie: "B31", beneficio: "Aux. Incapacidade Temporária", der: dia(-20), protocolos: ["1790031246"] });
const PJ = "5003456-46.2026.4.03.6302";
const C3 = cliente("Cláudio Ficto Dias", { fase: "judicial", especie: "B31", beneficio: "Aux. Incapacidade Temporária", der: dia(-200), processo: PJ,
  processos: [{ numero: PJ, nosso: true }], ajuizado_em: dia(-150), prazos_tribunal: [{ sistema: "pje", numero: PJ, ato: "Ato Ordinatório", dias: 10, fim: dia(13), lido_em: ts(-3) }] });
const C4 = cliente("Celso Ficto Paiva", { fase: "pagamento", especie: "B41", beneficio: "Apos. por Idade", der: dia(-900), processo: "5000851-31.2025.4.03.6302",
  processos: [{ numero: "5000851-31.2025.4.03.6302", nosso: true }], etapa: "recebido" });
// D · B31 em Petições Iniciais: o pedido de 2026 foi negado; o auxílio antigo cessou em janeiro e a pessoa voltou a trabalhar
const D1 = cliente("Diva Ficta Teles", { fase: "peticao_inicial", especie: "B31", beneficio: "Aux. Incapacidade Temporária", der: dia(-100), protocolos: ["1784456199"] },
  { triagem: { pdf: { cnis: { vinculos: [{ tipo: "Benefício", especie: "31", nb: "6421183050", inicio: barra(-300), fim: barra(-262), aberto: false }] } } } });
situacao(D1, "1784456199", "Concluída - Indeferida", "Em análise", -50);
// E · o caso que nasceu de um pré-caso (antes da F236: sem natureza na coluna)
const E = cliente("Elza Ficta Moraes", { especie: "B41", beneficio: "Apos. por Idade", der: dia(-2), protocolos: ["1977008841"], natureza: null,
  precaso: { id: "pc_e236", especie: "Apos. por Idade", natureza: "concessao", hon: { nben: 3, pct: 30 },
    etapas: { identificacao: { em: ts(-9), quem: EU }, documentos: { em: ts(-5), quem: EU } },
    desfecho: { tipo: "caso", em: dia(-5), quem: EU, beneficio: "Apos. por Idade", via: "adm", data_direito: dia(-69) } } });
// F · a pílula do clássico (só uma parcela de honorários com data); a trilha com a RPV; a trilha em recurso
const F1 = cliente("Fábio Ficto Torres", { especie: "B41", beneficio: "Apos. por Idade" });
T.pagamentos.push({ id: "f2369000-0000-4000-8000-000000000001", cliente_id: F1.cli, caso_id: F1.id, status: "aberto", valor: 1621, vencimento: dia(26),
  descricao: "Honorários · 1º benefício", criado_em: ts(-5) });
const PROC = "5000851-31.2025.4.03.6302";
const F2 = cliente("Flávia Ficta Duarte", { fase: "judicial", especie: "B41", beneficio: "Apos. por Idade", der: dia(-420), processo: PROC,
  processos: [{ numero: PROC, nosso: true }], etapa: "sentença publicada" });
pje(F2, PROC, "Distribuído por sorteio", -380);
pje(F2, PROC, "Julgado procedente o pedido", -100);
pje(F2, PROC, `Transitado em Julgado em ${barra(-60)}`, -60);
pje(F2, PROC, "Expedição de Requisição de Pequeno Valor.", -15);
const PV = "5009813-11.2024.4.03.6102";
const F3 = cliente("Fausto Ficto Lima", { fase: "judicial", especie: "B46", beneficio: "Apos. Especial", der: dia(-700), processo: PV,
  processos: [{ numero: PV, nosso: true }], etapa: "em recurso" });
pje(F3, PV, "Distribuído por sorteio", -600);
pje(F3, PV, "Julgado procedente o pedido", -400);
pje(F3, PV, "Juntada de Apelação", -380);
// G · Petições Iniciais sem etapa
const G = cliente("Gilda Ficta Antunes", { fase: "peticao_inicial", especie: "B31", beneficio: "Aux. Incapacidade Temporária" });
// H · os pendentes de pré-caso, card, cadastro e linha do caso
const H1 = cliente("Hélio Ficto Barros", { especie: "B41", beneficio: "Apos. por Idade", der: dia(-30), protocolos: ["1999000001"] });
const H2 = cliente("Hilda Ficta Souto", { especie: "B31", beneficio: "Aux. Incapacidade Temporária", der: dia(-60), protocolos: ["1999000002"] });
and(H2.id, { origem: "todo", texto: `Indeferido em ${pt(-8)}: não constatação de incapacidade laborativa.`, criado_em: ts(-7) });
const H3 = cliente("Horácio Ficto Neves", { fase: "escritorio", pre_caso: true, beneficio: "Aposentadoria por idade", precaso: { id: "pc_h3", cod: "B41", especie: "Aposentadoria por idade", em: ts(-10) } });
T.analises_direito.push({ id: "f3369000-0000-4000-8000-000000000001", cliente_id: H3.cli, data_analise: dia(-1), cenarios: [],
  detalhes: { servico: { nome: "Aposentadoria por tempo de contribuição", cod: "B42" }, precaso_id: "pc_h3" }, criado_em: ts(-1) });
const H4a = cliente("Hugo Ficto Ramos", { especie: "B41", beneficio: "Apos. por Idade", der: dia(-1), protocolos: ["1999000004"] });
T.analises_direito.push({ id: "f3369000-0000-4000-8000-000000000002", cliente_id: H4a.cli, data_analise: dia(-40), cenarios: [{ regra: "Idade (art. 18)", data: dia(-20), melhor: true }], detalhes: {}, criado_em: ts(-40) });
const H4b = cliente("Hortênsia Ficta Paz", { fase: "aposentadoria_futura", especie: "B41", beneficio: "Apos. por Idade" });
T.analises_direito.push({ id: "f3369000-0000-4000-8000-000000000003", cliente_id: H4b.cli, data_analise: dia(-40), cenarios: [{ regra: "Idade (art. 18)", data: dia(-20), melhor: true }], detalhes: {}, criado_em: ts(-40) });
const H7 = cliente("Heitor Ficto Lins", { fase: "encerrado", especie: "B31", beneficio: "Aux. Incapacidade Temporária", encerrado_em: ts(-30) });
const H10 = cliente("Hebe Ficta Prates", { especie: "B31", beneficio: "Aux. Incapacidade Temporária", der: dia(-20), dii: dia(-25), protocolos: ["1999000010"] });
// I · as datas da trilha, a sugestão do e-Recursos, a diligência em Pendências e a DCB do negado no clássico
const I1 = cliente("Ivo Ficto Campos", { especie: "B31", beneficio: "Aux. Incapacidade Temporária", der: dia(-40), protocolos: ["1999000011"] });
evento(I1, "Perícia médica", -10, { status: "realizada", criado_em: ts(-30) });
const NUPI = "44233512904202656";
const I2 = cliente("Iara Ficta Mota", { fase: "conselho", especie: "B87", beneficio: "BPC/LOAS", crps_nups: [NUPI],
  crps: [{ nup: NUPI, eventos: [{ data: `${barra(-19)} 10:00:00`, tipo: "andamento", bruto: "Aguardando distribuição" }] }],
  exigencia_prazo: dia(18), exigencia_descricao: `Em cumprimento à diligência da 16ª Junta de Recursos, apresentar documentos da atividade rural · prazo estimado: 30 dias do ato de ${pt(-12)} no PAT (a ciência não vem do portal)` });
const I3 = cliente("Inês Ficta Brito", { especie: "B31", beneficio: "Aux. Incapacidade Temporária", der: dia(-40), protocolos: ["1999000013"], situacao_inss: "Concluída - Indeferida", resultado: "indeferido" });
const I4 = cliente("Isaías Ficto Leal", { especie: "B31", beneficio: "Aux. Incapacidade Temporária", der: dia(-40), protocolos: ["1999000014"], dib: dia(-30) });

const ok = [];
const conf = (nome, v) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); };
const casoDe = id => T.casos.find(k => k.id === id);

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
  }, [SUPA, SESSAO]);
  await instalarBanco(ctx, { SUPA, SESSAO, banco });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D._completo === true && D.cliPorId && D.cliPorId.size > 0);
  const abrir = async (x, tema = "v10") => {
    await p.evaluate(async ([cli, id, tema]) => {
      if (tema === "v10") document.documentElement.setAttribute("data-tema", "v10"); else document.documentElement.removeAttribute("data-tema");
      await abrirFicha(cli); const m = document.getElementById("modal"); if (m) m.style.display = "none";
      casoSel = id; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); }, [x.cli, x.id, tema]);
    await p.waitForTimeout(400);
  };
  const docs = async x => { await abrir(x); await p.evaluate(() => { abaAtiva = 0; irSubCad("documentos"); }); await p.waitForTimeout(500); };
  const txt = sel => p.evaluate(s => ((document.querySelector(s) || {}).textContent || "").replace(/\s+/g, " ").trim(), sel);
  const placa = () => p.evaluate(() => {
    const t = s => ((document.querySelector(s) || {}).textContent || "").replace(/\s+/g, " ").trim();
    return { etapa: t(".lc-placa .lc-etapa"), velha: t(".lc-placa .et-velha"), sug: t(".lc-placa .et-sug"), agora: t(".tr-agora") }; });
  // a véspera útil de uma data (pelo calendário do app: fim de semana e feriado nacional)
  const vesperaUtil = iso => p.evaluate(d => { let e = somaDias(d, -1); while (e > hoje() && !ehDiaUtil(e)) e = somaDias(e, -1); return e < hoje() ? hoje() : e; }, iso);

  // ── A · a exigência cumprida é fato "aguardando análise", com a data da entrega ──
  await abrir(A);
  let v = await placa();
  conf("A1 antes da entrega, a placa propõe 'em exigência' pela situação do PAT", /^Sugestão: em exigência \(pela situação do PAT/.test(v.sug));
  banco.escritas.length = 0;
  await p.evaluate(id => cumprirExigencia(id), A.id); await p.waitForTimeout(700);
  const nota = T.andamentos.find(a => a.caso_id === A.id && /^Exigência cumprida/.test(a.texto || ""));
  conf("A2 o '✔ cumprida' grava a nota com a data da entrega", nota && nota.texto === `Exigência cumprida e protocolada em ${barra(0)} no INSS.`);
  v = await placa();
  conf("A3 entregue, a placa não acusa 'desatualizada' nem propõe voltar a 'em exigência': propõe 'aguardando análise' pela entrega",
    !v.velha && v.sug.startsWith(`Sugestão: aguardando análise (pela exigência cumprida de ${barra(0).slice(0, 5)})`));
  conf("A4 a trilha marca 'Exigência cumprida' com a data da entrega",
    await p.evaluate(dt => [...document.querySelectorAll(".tr-l .tr-et")].some(b => /Exigência cumprida/.test(b.textContent) && b.textContent.includes(dt)), barra(0)));
  await abrir(A2);
  await p.evaluate(id => cumprirExigencia(id), A2.id); await p.waitForTimeout(700);
  v = await placa();
  conf("A5 com a etapa 'em exigência' aceita, o '✔ cumprida' leva a 'aguardando análise' e a placa fica sem aviso nem sugestão",
    casoDe(A2.id).etapa === "aguardando análise" && !v.velha && !v.sug && !(casoDe(A2.id).trilha || {}).velha);
  banco.escritas.length = 0;
  const marcou = await p.evaluate(id => marcarEtapasVelhas([id]), A2.id); await p.waitForTimeout(300);
  conf("A5b a coleta seguinte (que lê só o PAT) não marca a etapa como velha: o '✔ cumprida' fica no caso (ronda.exig_cumprida)",
    marcou === 0 && (casoDe(A2.id).ronda || {}).exig_cumprida === dia(0) && !(casoDe(A2.id).trilha || {}).velha);
  const lidas = await p.evaluate(() => [
    entregaDaExigencia({ texto: "Cliente trouxe a CTPS; a exigência foi cumprida em 15/10 pelo Meu INSS.", criado_em: "2026-10-16T15:00:00Z" }),
    entregaDaExigencia({ texto: "A exigência foi cumprida? Conferir no PAT.", criado_em: "2026-10-16T15:00:00Z" }),
    entregaDaExigencia({ texto: "@André, peça a CTPS para cumprir a exigência até sexta.", criado_em: "2026-10-16T15:00:00Z" }),
    entregaDaExigencia({ texto: "Cumprimos a exigência hoje.", criado_em: "2026-10-16T15:00:00Z" })]);
  conf("A6 a anotação conta como entrega (com a data escrita nela); a pergunta e o pedido de providência não contam",
    lidas[0] === "2026-10-15" && lidas[1] === null && lidas[2] === null && lidas[3] === "2026-10-16");

  // ── B · a linha das listas por fase avisa a etapa desatualizada ──
  const linhaB = await p.evaluate(([cli, id]) => { const vis = visao; visao = "fase:inss"; D._andsFicha = [];
    try{ return cartaoCliente(D.cliPorId.get(cli), [D.casoPorId.get(id)]); } finally { visao = vis; } }, [B.cli, B.id]);
  conf("B1 fora da ficha, a marca da coleta (trilha.velha) faz a linha dizer '(desatualizada)', com o que os fatos dizem no title",
    /aguardando perícia \(desatualizada\)/.test(linhaB) && /os fatos dizem decidido/.test(linhaB) && /ag-velha/.test(linhaB));
  await abrir(B2);
  const linhaB2 = await p.evaluate(([cli, id]) => { const vis = visao; visao = "fase:inss";
    try{ return cartaoCliente(D.cliPorId.get(cli), [D.casoPorId.get(id)]); } finally { visao = vis; } }, [B2.cli, B2.id]);
  conf("B2 com os andamentos na memória, a proposta faz o mesmo: 'aguardando perícia (desatualizada)' e 'decidido · indeferido' no title",
    /aguardando perícia \(desatualizada\)/.test(linhaB2) && /decidido · indeferido/.test(linhaB2));
  conf("B3 a etapa de acordo com os fatos não ganha aviso",
    await p.evaluate(([cli, id]) => { const k = D.casoPorId.get(id), e = k.etapa; k.etapa = "decidido"; const vis = visao; visao = "fase:inss";
      try{ const h = cartaoCliente(D.cliPorId.get(cli), [k]); return /decidido/.test(h) && !/desatualizada/.test(h); } finally { k.etapa = e; visao = vis; } }, [B2.cli, B2.id]));

  // ── C · "Para o cliente providenciar" ──
  await docs(C1);
  const c1 = await p.evaluate(() => ({ ate: (document.getElementById("at-doc-ate") || {}).value, prov: (document.getElementById("dq-prov") || {}).textContent || "" }));
  conf("C1 a entrega sugerida cai na véspera útil da perícia marcada (antes do prazo do caso), e o quadro diz por quê",
    c1.ate === await vesperaUtil(dia(9)) && /A perícia é em/.test(c1.prov));
  conf("C2 sem análise registrada, a lista diz que vem dos requisitos da espécie do caso, e não 'pelo que a análise viu'",
    /Pedir ao cliente, pelos requisitos da espécie do caso \(B31\); nenhuma análise registrada/.test(c1.prov) && !/pelo que a análise viu/.test(c1.prov));
  conf("C3 antes da perícia, não pede o laudo dela", !/laudo da per[íi]cia/i.test(c1.prov));
  await docs(C2);
  const c2 = await p.evaluate(() => ({ ate: (document.getElementById("at-doc-ate") || {}).value, prov: (document.getElementById("dq-prov") || {}).textContent || "" }));
  const util15 = await p.evaluate(() => { let e = somaDias(hoje(), 15); while (!ehDiaUtil(e)) e = somaDias(e, -1); return e; });
  conf("C4 sem perícia nem prazo, a entrega fica em até 15 dias, num dia útil (e o laudo do INSS ainda se pede)",
    c2.ate === util15 && /laudo da per[íi]cia/i.test(c2.prov));
  await docs(C3);
  const c3 = await p.evaluate(() => ({ ate: (document.getElementById("at-doc-ate") || {}).value, prov: (document.getElementById("dq-prov") || {}).textContent || "",
    assinar: (document.getElementById("dq-assinar") || {}).textContent || "" }));
  conf("C5 no JEF, a entrega não passa do prazo do PJe e o laudo (que está nos autos) não é pedido",
    c3.ate === await vesperaUtil(dia(13)) && /prazo do PJe vence em/.test(c3.prov) && !/laudo da per[íi]cia/i.test(c3.prov));
  conf("C6 a ação já distribuída não oferece 'Gerar os 3'", !/Gerar os/.test(c3.assinar) && /A ação já foi distribuída/.test(c3.assinar));
  await docs(C4);
  const c4 = await p.evaluate(() => ({ prov: (document.getElementById("dq-prov") || {}).textContent || "", guias: (document.getElementById("dq-guias") || {}).textContent || "",
    assinar: (document.getElementById("dq-assinar") || {}).textContent || "", lista: !!document.getElementById("at-docs") }));
  conf("C7 em Pagamentos não há lista de pedido novo nem guias de pedido", /está em Pagamentos/.test(c4.prov) && !c4.lista && /Pagamentos: as guias de pedido não servem/.test(c4.guias));
  conf("C8 e o quadro de assinar mostra só o contrato, sem 'Gerar os 4'", /Para esta fase \(Pagamentos\)/.test(c4.assinar) && !/Gerar os/.test(c4.assinar));
  await docs(A3);
  const a1 = await p.evaluate(() => ({ assinar: (document.getElementById("dq-assinar") || {}).textContent || "", prov: (document.getElementById("dq-prov") || {}).textContent || "",
    ate: (document.getElementById("at-doc-ate") || {}).value }));
  conf("C9 'Gerar os N' deixa de fora o contrato já assinado ('Gerar os 3', não 4)", /Gerar os 3/.test(a1.assinar) && !/Gerar os 4/.test(a1.assinar));
  conf("C10 a entrega não passa do prazo da exigência, e o quadro diz qual é", a1.ate <= dia(27) && /A exigência tem de ser cumprida até/.test(a1.prov));
  const exA = await p.evaluate(() => ({ marcados: [...document.querySelectorAll("#at-docs .at-doc:checked")].map(x => x.value),
    todos: [...document.querySelectorAll("#at-docs .at-doc")].map(x => x.value) }));
  conf("C11 no pedido já feito e em exigência, o que a carta pede vai no alto, marcado, com a declaração do art. 566, e a lista de base vem desmarcada",
    exA.marcados.length === 1 && /^Exigência do INSS: Apresentar a CTPS original/.test(exA.marcados[0])
    && exA.todos.some(v => /não tem outros documentos/.test(v)) && /O pedido já foi feito em/.test(a1.prov) && /art\. 566, §§ 3º e 5º/.test(a1.prov));

  // ── D · as guias ──
  const guiaA = await p.evaluate(cli => { const v0 = vereditoReq;
    vereditoReq = () => ({ tom: "ainda", txt: "Ainda não. Tem pelo menos 180 contribuições? tem 166 das 180." });
    try{ return quadroGuias(D.cliPorId.get(cli)).replace(/<[^>]+>/g, " ").replace(/\s+/g, " "); } finally { vereditoReq = v0; } }, A3.cli);
  conf("D1 no pedido já feito e em exigência, a guia não diz 'Ainda não pedir': diz o que decide o pedido",
    !/Ainda não pedir/.test(guiaA) && /Pedido feito em .* em exigência; o que decide:/.test(guiaA));
  const conta = await p.evaluate(ex => decideDoPedido({ der: "2026-08-28", exigencia_prazo: "2026-11-13", exigencia_descricao: ex },
    "Ainda não. tem 166 das 180 contribuições.", { ct: { carencia: 166, periodos: [["1981-03", "1985-12"], ["1998-06", "2004-05"], ["2015-01", "2017-12"]] } }), EXIG);
  conf("D2 a conta com o período que a exigência discute: 66 meses fora do CNIS, 232 contribuições",
    /03\/02\/1986 a 31\/07\/1991, 66 meses que o CNIS não traz\), são 232 contribuições/.test(conta) && /até 13\/11\/2026/.test(conta));
  await docs(D1);
  const d1 = await p.evaluate(cli => { const c = D.cliPorId.get(cli), ks = D.casosDoCliente.get(cli) || [], x = reqCtx(c, ks, "b31");
    return { agora: REQ_EXTRA.b31.agora(x, avaliarReq("b31", x)), der: x.der, guias: ((document.getElementById("dq-guias") || {}).textContent || "").replace(/\s+/g, " ") }; }, D1.cli);
  conf("D3 o B31 da petição inicial fala do pedido negado e da ação, e não do auxílio antigo como corte",
    d1.agora.length === 1 && /O pedido de .* foi negado em .*, e a via escolhida é a ação na Justiça Federal/.test(d1.agora[0])
    && !/devolver o auxílio|restabelece|desistir do recurso/.test(d1.guias) && /foi negado/.test(d1.guias));
  conf("D4 sem pré-caso, o motor mede o caso na DER dele, e não na data de hoje", d1.der === dia(-100));
  await docs(C1);
  const guiaC1 = (await txt("#dq-guias"));
  conf("D5 o B31 ainda em análise não recebe 'pedir já': diz que o pedido está em análise", /está em análise no INSS/.test(guiaC1) && !/Pedir já/.test(guiaC1));

  // ── E · o quadro "Do atendimento" no clássico, o combinado e os passos na jornada; a natureza reparada ──
  banco.escritas.length = 0;
  await abrir(E, "classico");
  await p.waitForTimeout(500);
  const e1 = await p.evaluate(() => { const q = document.querySelector("#detalhe .do-atend");
    return { quadro: ((q || {}).textContent || "").replace(/\s+/g, " "), resumo: ((q && q.querySelector("summary")) || {}).textContent || "" }; });
  conf("E1 no visual clássico o caso mostra o quadro 'Do atendimento' (recolhido, com o desfecho no resumo) e o combinado estruturado",
    /Do atendimento/.test(e1.quadro) && /3 primeiros benefícios \+ 30% dos atrasados/.test(e1.quadro) && /Apos\. por Idade · via administrativa · Concessão/.test(e1.resumo));
  conf("E2 o caso gerado antes da F236 recebe a natureza do atendimento ao abrir a ficha",
    banco.escritas.some(x => x.m === "PATCH" && x.t === "casos" && (x.ids || []).includes(E.id) && x.corpo.natureza === "concessao"));
  await abrir(E);
  const jn = await p.evaluate(() => [...document.querySelectorAll(".jn-l .jn-b")].map(b => b.textContent.replace(/\s+/g, " ").trim()));
  conf("E3 a jornada do Escritório diz o último passo do atendimento, com a data e quem", jn.some(t => new RegExp(`Escritório.*${barra(-5).slice(0, 5)} · documentos \\(Paulo\\)`).test(t)));

  // ── F · a pílula do clássico, a trilha e o atalho de honorários ──
  await abrir(F1, "classico");
  const pil = await txt(".volta-pilula");
  conf("F1 a pílula do clássico lê as linhas de 'Lembretes e datas' (a parcela de honorários), e não diz 'sem próxima data'",
    /volta/.test(pil) && new RegExp(pt(26)).test(pil) && /Honorários/.test(pil) && !/sem próxima data/.test(pil));
  await abrir(F2);
  const tr2 = await p.evaluate(id => { const k = D.casoPorId.get(id), r = ritoDe(k, "judicial"), ets = TRILHAS[r].e.map(lerEtapaTrilha), ms = marcasDaTrilha(k, "judicial", "judicial", r, ets);
    const i = ms.findIndex(m => m.s === "a"); return { atual: i >= 0 ? ets[i].n : "", agora: ((document.querySelector(".tr-agora") || {}).textContent || "").replace(/\s+/g, " ") }; }, F2.id);
  conf("F2 com a RPV expedida, o destaque da trilha não fica na sentença: vai ao passo cumprido mais adiantado, e o 'Agora:' avisa",
    tr2.atual === "RPV ou precatório expedido" && /Agora: sentença publicada \(desatualizada\)/.test(tr2.agora));
  await abrir(F3);
  const tr3 = await p.evaluate(() => ({ agora: ((document.querySelector(".tr-agora") || {}).textContent || "").replace(/\s+/g, " "),
    passo: [...document.querySelectorAll(".tr-l .tr-et.tr-sa")].map(b => b.textContent.replace(/\s+/g, " ").trim()) }));
  conf("F3 o passo por vir tem a mesma palavra no título e no passo ('aguardando Acórdão do TRF3'), e não 'agora'",
    /Agora: em recurso · aguardando Acórdão do TRF3/.test(tr3.agora) && tr3.passo.some(t => /Acórdão do TRF3\s*aguardando/.test(t)));
  conf("F4 o topo da revisão do acervo diz o critério da linha (30 dias de anotação, 90 de revisão)",
    await p.evaluate(() => /sem anotação da equipe nos últimos 30 dias e sem revisão nos últimos 90/.test(blocoRevisao())));
  conf("F5 o atalho de honorários põe o ano na data que não é deste ano",
    await p.evaluate(() => dCurta("2025-08-23") === "23/08/2025" && dCurta(hoje()).length === 5));

  // ── G · a petição inicial propõe "a redigir" ──
  await abrir(G);
  v = await placa();
  conf("G1 o caso em Petições Iniciais sem etapa recebe a sugestão 'a redigir'", /^Sugestão: a redigir \(pela fase Petições Iniciais/.test(v.sug));

  // ── H · os pendentes de pré-caso, card, cadastro, honorários e linha do caso ──
  const quadroE = await p.evaluate(id => quadroDoAtendimento(D.casoPorId.get(id)).replace(/<[^>]+>/g, " ").replace(/\s+/g, " "), E.id);
  conf("H1 o quadro 'Do atendimento' diz o custo da demora: direito 67 dias antes do pedido, com a base",
    /Custo da demora: direito desde .*: 67 dias sem benefício, cerca de R\$/.test(quadroE) && /arts\. 49 e 54/.test(quadroE));
  const msgs = []; p.on("dialog", d => msgs.push(d.message()));
  await abrir(H1);
  await p.evaluate(id => naoEhCaso(id), H1.id); await p.waitForTimeout(600);
  conf("H2 '↩ não é caso' num caso com protocolo e DER avisa que pedido feito é caso antes de voltar a pré-caso",
    msgs.some(m => /ATENÇÃO: este caso já tem protocolo 1999000001, DER/.test(m) && /use "Encerrar caso"/.test(m)));
  await abrir(H2);
  conf("H3 a decisão do INSS anotada leva a data escrita na nota, e não o dia da anotação",
    await p.evaluate(([id, d]) => { const r = decisaoDoInss(D.casoPorId.get(id)); return !!r && r.data === d && r.resultado === "indeferido"; }, [H2.id, dia(-8)]));
  await abrir(D1);
  const jnD = await p.evaluate(() => [...document.querySelectorAll(".jn-l .jn-b")].map(b => b.textContent.replace(/\s+/g, " ").trim()));
  conf("H4 na petição inicial, o Conselho que não houve diz 'não houve', e não 'a vir'", jnD.some(t => /^Conselho\s*não houve/.test(t)) && jnD.some(t => /^Judicial\s*a vir/.test(t)));
  await p.evaluate(async cli => { await abrirFicha(cli); const m = document.getElementById("modal"); if (m) m.style.display = "none"; _atendAberto.add(cli); }, H3.cli);
  await p.waitForTimeout(300);
  await p.evaluate(cli => desfechoCaso(cli, true, true), H3.cli); await p.waitForTimeout(500);
  const caixaH3 = await txt("#modal");
  conf("H5 no Desfecho, a espécie do pré-caso (B41) diverge da análise (B42): o CRM pergunta qual vale antes de gerar o caso",
    /Qual espécie vale para o caso\?/.test(caixaH3) && /Aposentadoria por idade \(o pré-caso\)/.test(caixaH3) && /tempo de contribuição \(a análise\)/.test(caixaH3)
    && !T.casos.some(k => k.id === H3.id && k.pre_caso === false));
  await p.evaluate(() => { fecharCaixa(); _atendAberto.clear(); });
  const alc = await p.evaluate(() => direitoAlcancado().map(x => x.cliente.id));
  conf("H6 a Análise de direito não conta quem já virou caso (só quem ainda espera o pedido)", !alc.includes(H4a.cli) && alc.includes(H4b.cli));
  await p.evaluate(() => { fecharFicha(false); visao = "direito"; subDireito = "analises"; render(); }); await p.waitForTimeout(400);
  const cartoes = await p.evaluate(() => [...document.querySelectorAll("#conteudo-meio .cartao")].map(c => c.textContent.replace(/\s+/g, " ")));
  conf("H6b a lista das análises diz há quantos dias o direito espera o pedido, ou quando o pedido foi feito",
    cartoes.some(t => /Hortênsia/.test(t) && /direito alcançado em .* · 20 dias sem pedido/.test(t)) && cartoes.some(t => /Hugo/.test(t) && /direito alcançado · pedido em/.test(t)));
  const q = await p.evaluate(() => lerQualificacao("MARIA FICTA DE TAL, viúva, auxiliar de limpeza, 64 anos, residente em Monte Alto/SP, vem propor ação"));
  conf("H7 a qualificação da inicial aceita a idade entre os campos: viúva, auxiliar de limpeza", q.estado_civil === "viuvo" && q.profissao === "auxiliar de limpeza");
  conf("H8 o caso na Justiça sem o CNIS no CRM avisa em 'Nas outras abas'", /o CNIS não está no CRM/.test(await p.evaluate(id => painelOutrasAbas(D.casoPorId.get(id)), C3.id)));
  const placaH7 = await p.evaluate(id => linhaCaso(D.casoPorId.get(id)).replace(/<[^>]+>/g, " ").replace(/\s+/g, " "), H7.id);
  conf("H9 o caso encerrado mostra na placa só o que tem valor (sem 'DER não informada', DII nem Verificação)",
    !/DER não informada/.test(placaH7) && !/Verificação/.test(placaH7) && !/DII a informar/.test(placaH7));
  await abrir(F1); await p.evaluate(() => { abaAtiva = 4; repintarFicha(); }); await p.waitForTimeout(300);
  conf("H10 a aba Honorários avisa o cadastro sem CPF e nascimento", /Sem CPF e nascimento no cadastro/.test(await txt(".hon-cad")));
  await abrir(A3); await p.evaluate(() => { abaAtiva = 0; adVisivel.add(clienteAberto); irSubCad("direito"); }); await p.waitForTimeout(700);
  banco.escritas.length = 0;
  await p.evaluate(cli => { const ta = document.getElementById("ad-anot"); ta.value = "Cliente pediu retorno do @Marcos sobre a exigência."; return anotarNoDireito(cli); }, A3.cli);
  await p.waitForTimeout(600);
  conf("H11 o andamento da Análise de Direito com @Marcos vira menção para ele",
    banco.escritas.some(x => x.m === "POST" && x.t === "mencoes" && x.corpo.para_id === MARCOS && x.corpo.caso_id === A3.id));
  conf("H12 sem pré-caso, a DII gravada no caso responde à análise do B31",
    await p.evaluate(([cli, d]) => { const c = D.cliPorId.get(cli); return reqCtx(c, D.casosDoCliente.get(cli) || [], "b31").v.inc_dii === d; }, [H10.cli, dia(-25)]));
  await docs(A3);
  const temosA3 = await txt("#dq-temos"), provA3 = await txt("#dq-prov");
  conf("H13 a Declaração de Residência gerada no CRM responde pelo comprovante: ele vai a 'Já temos' e sai da lista do cliente",
    /Comprovante de residência/.test(temosA3) && /Declaração de Residência gerada no CRM/.test(temosA3) && !/Comprovante de residência/.test(provA3));

  // ── I · as datas da trilha, a sugestão do e-Recursos, a diligência em Pendências e a DCB do negado no clássico ──
  await abrir(I1);
  conf("I1 na trilha, 'Perícia agendada' leva a data do agendamento, e não a da perícia",
    await p.evaluate(([id, d]) => { const k = D.casoPorId.get(id), r = ritoDe(k, "inss"), ets = TRILHAS[r].e.map(lerEtapaTrilha), ms = marcasDaTrilha(k, "inss", "inss", r, ets);
      const i = ets.findIndex(e => e.n === "Perícia agendada"), j = ets.findIndex(e => e.n === "Perícia realizada");
      return i >= 0 && ms[i].d === d && j >= 0 && ms[j].s === "f"; }, [I1.id, dia(-30)]));
  await abrir(I2);
  v = await placa();
  conf("I2 a sugestão do e-Recursos não repete a etapa", /^Sugestão: aguardando distribuição \(pelo e-Recursos de /.test(v.sug) && !/\(aguardando distribuição\)/.test(v.sug));
  const pendI2 = await p.evaluate(cli => quadroPendCaso(D.cliPorId.get(cli), D.casosDoCliente.get(cli) || []).replace(/<[^>]+>/g, " ").replace(/\s+/g, " "), I2.cli);
  conf("I3 em Pendências do caso, a diligência do CRPS tem o nome dela, com 'estimado' ao lado da data e sem a nota interna",
    /Diligência do CRPS \(até .*, estimado\):/.test(pendI2) && !/prazo estimado:/.test(pendI2) && !/Exigência do INSS/.test(pendI2));
  const dcbs = await p.evaluate(([a, b]) => [blocoFatos(D.casoPorId.get(a)), blocoFatos(D.casoPorId.get(b))].map(h => /data-fato="dcb"/.test(h)), [I3.id, I4.id]);
  conf("I4 no clássico, o B31 negado e sem DCB não pede a DCB; o concedido continua pedindo", dcbs[0] === false && dcbs[1] === true);

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros.join("\n"));
  const bons = ok.filter(x => x[1]).length;
  console.log(`\n${bons}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(bons === ok.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
