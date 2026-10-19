// F236 · frente "etapa" (teste dos clientes ativos): os fatos oficiais PROPÕEM a etapa na placa
// ("Sugestão: <etapa> (pelo <fato> de dd/mm) — Aceitar") e nada grava sozinho; a etapa contrariada
// por fato mais novo avisa "etapa desatualizada" e ganha a marca para o portal; o Aceitar grava pelo
// gravarEtapa/andarEtapa, com andamento curto e desfazer; placa, "Agora:" e jornada leem a mesma etapa;
// a jornada não dá ao INSS a vitória do juízo; mudar de fase limpa a etapa da fase anterior.
// Banco simulado, dados fictícios. Uso: node f236-etapa.js
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
const curta = n => barra(n).slice(0, 5);
const ts = (n, h = "12:00") => new Date(`${dia(n)}T${h}:00-03:00`).toISOString();

const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: [], casos: [], atribuicoes: [],
  documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;

// um cliente com um caso por cenário (a ficha abre direto no caso, sem a janela "qual processo?")
let n = 0;
function cliente(nome, caso) {
  n++;
  const cli = `c2360000-0000-4000-8000-${String(n).padStart(12, "0")}`, id = `b2360000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  T.clientes.push({ id: cli, nome, cpf: null, dn: null, telefone: null, telefones: [], campos: {}, criado_em: ts(-300) });
  T.casos.push({ id, cliente_id: cli, titulo: nome, fase: "inss", etapa: null, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [],
    marcadores: [], arquivados: {}, ronda: {}, pje_links: {}, prazos_tribunal: [], encerrado_em: null, criado_em: ts(-300), ...caso });
  return { cli, id };
}
let na = 0;
const and = (caso, o) => T.andamentos.push({ id: `e2360000-0000-4000-8000-${String(++na).padStart(12, "0")}`, caso_id: caso, autor_id: EU,
  origem: "app", publico: false, excluir: false, ...o });
const situacao = (caso, proto, nova, antes, n, h = "07:40") => and(caso.id, { origem: "pat", origem_id: `situacao:${proto}:${nova}`,
  texto: antes ? `INSS: ${antes} → ${nova}` : `INSS · Situação registrada: ${nova}`, criado_em: ts(n, h) });
const pje = (caso, numero, texto, n, grau = "1º grau") => and(caso.id, { origem: "pje", origem_id: `hist:${n}:${texto.length}`,
  texto: `PJe (${grau}): ${texto} — em ${pt(n)} 10:00 — PJEC ${numero}`, criado_em: ts(n, "10:00") });

// A · B31 indeferido no PAT e a etapa velha "aguardando perícia"
const A = cliente("Aurora Ficta Pinheiro", { fase: "inss", especie: "B31", beneficio: "Aux. Incapacidade Temporária", der: dia(-45),
  protocolos: ["1798803127"], etapa: "aguardando perícia" });
situacao(A, "1798803127", "Em análise", null, -44);
T.eventos.push({ id: "d2360000-0000-4000-8000-000000000001", caso_id: A.id, tipo: "Perícia médica", status: "realizada",
  data_hora: ts(-15, "14:10"), local: "AGÊNCIA DA PREVIDÊNCIA SOCIAL RIBEIRÃO PRETO - CENTRO", criado_em: ts(-35, "07:45") });
situacao(A, "1798803127", "Concluída - Indeferida", "Em análise", -8);
// B · B41 que a importação do PAT vai levar a "Em exigência"
const B = cliente("Bento Ficto Rocha", { fase: "inss", especie: "B41", beneficio: "Apos. por Idade", der: dia(-50),
  protocolos: ["1902117650"], etapa: "requerimento protocolado", situacao_inss: "Em análise" });
situacao(B, "1902117650", "Em análise", null, -49);
// C · judicial ganho, com o INSS que negou, e a RPV expedida
const PROC = "5000851-31.2025.4.03.6302";
const C = cliente("Celina Ficta Duarte", { fase: "judicial", especie: "B41", beneficio: "Apos. por Idade", der: dia(-420), protocolos: ["1655409821"],
  processo: PROC, processos: [{ numero: PROC, nosso: true }], etapa: "sentença publicada", resultado: "deferido", decisao_em: dia(-100) });
situacao(C, "1655409821", "Concluída - Indeferida", "Em análise", -400);
pje(C, PROC, "Distribuído por sorteio", -380);
pje(C, PROC, "Julgado procedente o pedido", -100);
pje(C, PROC, `Transitado em Julgado em ${barra(-60)}`, -60);
pje(C, PROC, "Expedição de Requisição de Pequeno Valor.", -15);
// D · Conselho com a etapa "decidido" do INSS e o acórdão no e-Recursos
const NUP = "44233476201202611";
const D1 = cliente("Dirce Ficta Moura", { fase: "conselho", especie: "B21", beneficio: "Pensão por Morte", etapa: "decidido", crps_nups: [NUP],
  crps: [{ nup: NUP, eventos: [
    { data: `${barra(-150)} 14:06:00`, tipo: "andamento", bruto: "Requerimento protocolado - Tarefa de Recurso Ordinário - 998431207" },
    { data: `${barra(-20)} 10:58:00`, tipo: "decisao", bruto: "Conhecer do Recurso e negar-lhe provimento, por unanimidade - Acórdão: 12ª JR/5873/2026" }] }] });
// E · os gestos que mudam de fase
const E1 = cliente("Elias Ficto Nunes", { fase: "inss", especie: "B31", etapa: "aguardando perícia" });
const E2 = cliente("Eunice Ficta Lara", { fase: "encerrado", origem_lista: "🌻 INSS", especie: "B31", etapa: "sentença publicada", encerrado_em: ts(-30) });
const E3 = cliente("Evaldo Ficto Prado", { fase: "inss", especie: "B41", etapa: "em exigência", exigencia_prazo: dia(10), exigencia_descricao: "CTPS original" });
// F · fase "outro": a lista pessoal e o prazo fatal vindo do Judicial
const F1 = cliente("Filomena Ficta Reis", { fase: "outro", origem_lista: "☕ Pessoal", titulo: "Renegociar empréstimo do banco" });
const F2 = cliente("Fausto Ficto Lemos", { fase: "outro", origem_lista: "👪 Judicial", mover_para: "🗓 Tarefas com Prazo", ronda: { prazo_de: "👪 Judicial" },
  especie: "B46", processo: "5009813-11.2024.4.03.6102", etapa: "em recurso" });
// G · a petição inicial depois do INSS indeferido (com a ação antiga de outro advogado) e o MS paralelo
const ANT = "5004512-85.2024.4.03.6302";
const G1 = cliente("Gilda Ficta Antunes", { fase: "peticao_inicial", especie: "B31", der: dia(-100), protocolos: ["1784456120"],
  processo: ANT, processos: [{ numero: ANT, nosso: false }] });
and(G1.id, { origem: "pat", origem_id: "49450188", texto: "INSS · Benefício indeferido. Motivo: não constatação de incapacidade laborativa.", criado_em: `${dia(-50)}T12:00:00+00:00` });
const MS = "5007720-16.2026.4.03.6102";
const G2 = cliente("Gustavo Ficto Ramos", { fase: "inss", especie: "B41", der: dia(-240), protocolos: ["1823390471"],
  processo: MS, processos: [{ numero: MS, nosso: true, papel: "ms" }] });

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
      await abrirFicha(cli); casoSel = id; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); }, [x.cli, x.id, tema]);
    await p.waitForTimeout(350);
  };
  const tela = () => p.evaluate(() => {
    const t = s => ((document.querySelector(s) || {}).textContent || "").replace(/\s+/g, " ").trim();
    return { etapa: t(".lc-placa .lc-etapa"), velha: t(".lc-placa .et-velha"), sug: t(".lc-placa .et-sug"), agora: t(".tr-agora b"),
      atual: t(".jn-l .jn-a .jn-st"), jornada: [...document.querySelectorAll(".jn-l .jn-b")].map(b => `${b.querySelector(".jn-txt").textContent} ${b.querySelector(".jn-st").textContent}`.replace(/\s+/g, " ").trim()),
      sobre: t(".lc-sobre"), ben: t(".lc-ben") };
  });
  const escritasDe = (id, m, t = "casos") => banco.escritas.filter(e => e.m === m && e.t === t && (e.ids || e.linhas || []).includes(id));

  // ── A · a etapa velha avisa, a sugestão diz o fato e a data, e nada grava sozinho ──
  await abrir(A);
  let v = await tela();
  conf("A1 a placa avisa 'etapa desatualizada' e propõe 'decidido · indeferido' pela situação do PAT, com a data",
    v.etapa === "aguardando perícia" && v.velha === "etapa desatualizada"
    && v.sug === `Sugestão: decidido · indeferido (pela situação do PAT “Concluída - Indeferida” de ${curta(-8)}) — Aceitar`);
  conf("A2 uma etapa só na tela: a placa, o 'Agora:' da trilha e a aba da fase dizem a mesma coisa",
    v.agora === "aguardando perícia" && v.atual.startsWith("aguardando perícia"));   // F243 · a aba da fase atual traz a etapa (e o passo por vir)
  await p.waitForTimeout(400);
  conf("A3 a etapa contrariada ganha a marca para o portal (trilha.velha), e a etapa em si não muda",
    (casoDe(A.id).trilha || {}).velha && casoDe(A.id).trilha.velha.etapa === "aguardando perícia" && casoDe(A.id).trilha.velha.proposta === "decidido"
    && casoDe(A.id).etapa === "aguardando perícia");
  conf("A4 no pedido indeferido a DCB some da linha do caso (só aparece preenchida) e a trilha diz que a prorrogação não houve",
    await p.evaluate(id => camposEssenciais(D.casoPorId.get(id)).includes("?dcb")
      && [...document.querySelectorAll(".tr-l .tr-et")].some(b => /Pedido de prorrogação/.test(b.textContent) && b.classList.contains("tr-sn")), A.id));
  conf("A5 a faixa do caso no alto das outras abas diz que a etapa ficou para trás",
    await p.evaluate(id => /aguardando perícia \(desatualizada\)/.test(faixaDoCaso([D.casoPorId.get(id)])), A.id));
  banco.escritas.length = 0;
  await p.evaluate(() => document.querySelector(".lc-placa .et-aceitar").click());
  await p.waitForTimeout(700);
  const patchesA = escritasDe(A.id, "PATCH").map(e => e.corpo);
  const andA = banco.escritas.find(e => e.m === "POST" && e.t === "andamentos");
  conf("A6 Aceitar grava a etapa pelo gravarEtapa, com o resultado e a data da decisão do INSS",
    patchesA.some(c => c.etapa === "decidido") && patchesA.some(c => c.resultado === "indeferido" && c.decisao_em === dia(-8)));
  conf("A7 e registra o andamento curto 'Etapa: decidido · indeferido (pela situação do PAT … de dd/mm)'",
    andA && andA.corpo.texto === `Etapa: decidido · indeferido (pela situação do PAT “Concluída - Indeferida” de ${curta(-8)})` && andA.corpo.caso_id === A.id);
  v = await tela();
  conf("A8 aceita, a placa e a trilha mostram 'decidido', sem aviso nem sugestão", v.etapa === "decidido" && v.agora === "decidido" && !v.velha && !v.sug);
  await p.evaluate(() => desfazerAgora()); await p.waitForTimeout(700);
  const kA = casoDe(A.id);
  conf("A9 o desfazer devolve etapa, resultado e data e apaga o andamento",
    kA.etapa === "aguardando perícia" && kA.resultado == null && kA.decisao_em == null
    && !T.andamentos.some(a => a.caso_id === A.id && /^Etapa: /.test(a.texto || "")));

  // ── B · a importação do PAT não grava etapa; só marca a etapa contrariada ──
  banco.escritas.length = 0;
  await p.evaluate(([id, proto]) => {
    arquivoPat = { detalhes: [] };
    planoPat = { atualizar: [{ protocolo: proto, caso_id: id, mudancas: {}, situacao: "Em exigência", andamento: "INSS: Em análise → Em exigência" }],
      novos: [], possiveisDuplicados: [], comentarios: [], eventos: [], atualizacoes: [], resumo: {} };
    return aplicarPat(); }, [B.id, "1902117650"]);
  await p.waitForTimeout(900);
  const pB = escritasDe(B.id, "PATCH").map(e => e.corpo);
  conf("B1 a importação do PAT não grava a etapa nem lança andamento de etapa (a etapa é o que o escritório declara)",
    !pB.some(c => "etapa" in c) && casoDe(B.id).etapa === "requerimento protocolado"
    && !banco.escritas.some(e => e.m === "POST" && e.t === "andamentos" && /^Etapa: /.test((e.corpo || {}).texto || "")));
  conf("B2 mas marca a etapa contrariada para o portal (trilha.velha), na hora da coleta",
    pB.some(c => c.trilha && c.trilha.velha && c.trilha.velha.etapa === "requerimento protocolado" && c.trilha.velha.proposta === "em exigência"));
  await abrir(B);
  v = await tela();
  conf("B3 a placa propõe 'em exigência' pela situação que a coleta trouxe",
    v.velha === "etapa desatualizada" && v.sug.startsWith(`Sugestão: em exigência (pela situação do PAT “Em exigência” de ${curta(0)})`));

  // ── C · a jornada não dá ao INSS a vitória do juízo; a RPV propõe Pagamentos e o Aceitar move ──
  await abrir(C);
  v = await tela();
  const inssTab = v.jornada.find(x => /^INSS/.test(x)) || "";
  conf("C1 a aba do INSS diz o que o INSS decidiu (indeferido), não o 'concedido' da sentença",
    /indeferido/.test(inssTab) && !/concedido/.test(inssTab));
  conf("C2 a RPV expedida propõe levar o caso a Pagamento, sem mover sozinho",
    v.velha === "etapa desatualizada" && v.sug.startsWith("Sugestão: Pagamento · RPV expedida (pelo movimento “Expedição de Requisição de Pequeno Valor.” do PJe")
    && casoDe(C.id).fase === "judicial");
  conf("C3 a trilha marca como cumpridas, com a data, as etapas que os movimentos oficiais provam",
    await p.evaluate(dt => { const b = [...document.querySelectorAll(".tr-l .tr-et")].find(x => /Ação distribuída/.test(x.textContent));
      return !!b && b.classList.contains("tr-sf") && b.textContent.includes(dt); }, barra(-380)));
  banco.escritas.length = 0;
  await p.evaluate(() => document.querySelector(".lc-placa .et-aceitar").click());
  await p.waitForTimeout(900);
  const kC = casoDe(C.id);
  conf("C4 Aceitar move pelo andarEtapa: Pagamento, lista 💵 Pagamentos e etapa 'RPV expedida', com o andamento",
    kC.fase === "pagamento" && kC.mover_para === "💵 Pagamentos" && kC.etapa === "RPV expedida"
    && T.andamentos.some(a => a.caso_id === C.id && a.texto === `Etapa: Pagamento · RPV expedida (pelo movimento “Expedição de Requisição de Pequeno Valor.” do PJe de ${curta(-15)})`));
  await p.evaluate(() => desfazerAgora()); await p.waitForTimeout(900);
  conf("C5 o desfazer devolve o caso ao Judicial com a etapa de antes e apaga o andamento",
    casoDe(C.id).fase === "judicial" && casoDe(C.id).etapa === "sentença publicada" && !T.andamentos.some(a => a.caso_id === C.id && /^Etapa: /.test(a.texto || "")));

  // ── D · a etapa de outra fase avisa; o clássico também mostra a etapa; o botão de encerrar fase ──
  await abrir(D1);
  v = await tela();
  conf("D1 'decidido' num caso no Conselho é 'etapa de outra fase', com a sugestão 'julgado' pelo acórdão",
    v.velha === "etapa de outra fase" && v.sug === `Sugestão: julgado (pelo acórdão no e-Recursos de ${curta(-20)}) — Aceitar`);
  conf("D2 o botão da aba diz a ação ('Encerrar esta fase…') e não aparece na fase em que o caso está",
    await p.evaluate(id => { const k = D.casoPorId.get(id); return botaoFaseAba(k, "crps") === "" && /Encerrar esta fase…/.test(botaoFaseAba(k, "pat")) && !/✔ fase encerrada/.test(botaoFaseAba(k, "pat")); }, D1.id));
  await abrir(D1, "classico");
  conf("D3 no visual clássico o cartão do caso mostra a etapa, o aviso e o Aceitar",
    await p.evaluate(() => { const e = document.querySelector(".fatos-processo .fx-etapa"); return !!e && /decidido/.test(e.textContent)
      && /etapa de outra fase/.test(e.textContent) && !!e.querySelector(".et-aceitar"); }));

  // ── E · mudar de fase não deixa etapa de outra fase; exigência cumprida; a palavra dos passos ──
  await abrir(E1);
  banco.escritas.length = 0;
  await p.evaluate(id => moverFase(id, "conselho"), E1.id); await p.waitForTimeout(400);
  conf("E1 mudar de fase pelo cartão limpa a etapa da fase anterior", escritasDe(E1.id, "PATCH").some(e => e.corpo.fase === "conselho" && e.corpo.etapa === null));
  banco.escritas.length = 0;
  await p.evaluate(id => reabrirCaso(id), E2.id); await p.waitForTimeout(500);
  conf("E2 reabrir o caso também não traz a etapa de outra fase", escritasDe(E2.id, "PATCH").some(e => e.corpo.fase === "inss" && e.corpo.etapa === null));
  await abrir(E3);
  banco.escritas.length = 0;
  await p.evaluate(id => cumprirExigencia(id), E3.id); await p.waitForTimeout(500);
  conf("E3 a exigência cumprida leva a etapa a 'aguardando análise'", escritasDe(E3.id, "PATCH").some(e => e.corpo.etapa === "aguardando análise"));
  conf("E4 os passos sem palavra (réplica, citação expedida, conclusos para sentença) já não mantêm a etapa velha",
    await p.evaluate(() => PUB_TRILHA["Réplica"] === "contestação apresentada" && PUB_TRILHA["Citação expedida"] === "aguardando citação"
      && PUB_TRILHA["Conclusos para sentença"] === "aguardando sentença" && TRILHAS.jef_inc.e.includes("*Instrução|Citação expedida")));

  // ── F · a fase "outro": o título e a lista, e a etapa da lista de onde o prazo veio ──
  await abrir(F1);
  v = await tela();
  conf("F1 o caso da lista pessoal mostra o título da tarefa e a lista, não 'OUTROS · definir o pedido'",
    /☕ Pessoal/.test(v.sobre) && v.ben === "Renegociar empréstimo do banco");
  await abrir(F2);
  v = await tela();
  conf("F2 no prazo fatal vindo do Judicial a placa continua com a etapa do Judicial e diz de onde o caso veio",
    v.etapa === "em recurso" && /Tarefas com Prazo · veio de 👪 Judicial/.test(v.sobre));

  // ── G · a jornada: o INSS da petição inicial já houve; o MS paralelo está em curso ──
  await abrir(G1);
  v = await tela();
  conf("G1 na petição inicial o INSS indeferido não aparece 'a vir', e a ação de outro advogado não faz o Judicial ter havido",
    /INSS.*indeferido/.test(v.jornada[1] || "") && /Judicial a vir/.test(v.jornada[3] || ""));
  await abrir(G2);
  v = await tela();
  conf("G2 o mandado de segurança paralelo aparece 'MS em curso', não 'a vir'", /Judicial MS em curso/.test(v.jornada[3] || ""));

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros.join("\n"));
  const bons = ok.filter(x => x[1]).length;
  console.log(`\n${bons}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(bons === ok.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
