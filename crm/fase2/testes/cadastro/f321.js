// F321 · Etapas em lote (E1 e E2 do Claude Doc "Etapas dos casos pelos andamentos"): o 🧹 Cuidar do acervo
// lê os andamentos oficiais de todos os casos abertos, roda a mesma proposta da placa e separa em quatro
// grupos; o grupo A grava de uma vez, com o andamento curto, e o lote se desfaz. Banco simulado, dados fictícios.
// Uso: node f321.js
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
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: [], casos: [], atribuicoes: [],
  documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;

let n = 0;
function cliente(nome, caso) {
  n++;
  const cli = `c3210000-0000-4000-8000-${String(n).padStart(12, "0")}`, id = `b3210000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  T.clientes.push({ id: cli, nome, cpf: null, dn: null, telefone: null, telefones: [], campos: {}, criado_em: ts(-300) });
  T.casos.push({ id, cliente_id: cli, titulo: nome, fase: "inss", etapa: null, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [],
    marcadores: [], arquivados: {}, ronda: {}, pje_links: {}, prazos_tribunal: [], encerrado_em: null, criado_em: ts(-300), ...caso });
  return { cli, id, nome };
}
let na = 0;
const and = (caso, o) => T.andamentos.push({ id: `e3210000-0000-4000-8000-${String(++na).padStart(12, "0")}`, caso_id: caso, autor_id: EU,
  origem: "app", publico: false, excluir: false, ...o });
const situacao = (caso, proto, nova, n) => and(caso.id, { origem: "pat", origem_id: `situacao:${proto}:${nova}`,
  texto: `INSS · Situação registrada: ${nova}`, criado_em: ts(n, "07:40") });
const pje = (caso, numero, texto, n) => and(caso.id, { origem: "pje", origem_id: `hist:${n}:${texto.length}`,
  texto: `PJe (1º grau): ${texto} — em ${pt(n)} 10:00 — PJEC ${numero}`, criado_em: ts(n, "10:00") });

// A · prontos: exigência no PAT, conclusos para sentença e o recurso que o e-Recursos registra como "Requerimento protocolado - Tarefa"
const A1 = cliente("Abel Ficto Prado", { fase: "inss", especie: "B41", der: dia(-60), protocolos: ["1700000001"] });
situacao(A1, "1700000001", "Em análise", -59); situacao(A1, "1700000001", "Em exigência", -5);
const P2 = "5000001-11.2026.4.03.6302";
const A2 = cliente("Adélia Ficta Souza", { fase: "judicial", especie: "B31", processo: P2, processos: [{ numero: P2, nosso: true }], ajuizado_em: dia(-200) });
pje(A2, P2, "Distribuído por sorteio", -200); pje(A2, P2, "Conclusos para sentença", -10);
const A3 = cliente("Amaro Ficto Lins", { fase: "conselho", especie: "B31", crps_nups: ["44000000000000001"],
  crps: [{ nup: "44000000000000001", eventos: [{ data: `${barra(-20)} 09:00:00`, tipo: "andamento", bruto: "Requerimento protocolado - Tarefa: 1234567" }] }] });
// B · a conferir: etapa contrariada, perícia sem confirmação, recurso arquivado e fato antigo
const B1 = cliente("Bruna Ficta Melo", { fase: "inss", especie: "B31", der: dia(-80), protocolos: ["1700000002"], etapa: "aguardando perícia" });
situacao(B1, "1700000002", "Concluída - Indeferida", -3);
const B2 = cliente("Bento Ficto Paiva", { fase: "inss", especie: "B31", der: dia(-60), protocolos: ["1700000003"] });
T.eventos.push({ id: "d3210000-0000-4000-8000-000000000001", caso_id: B2.id, tipo: "Perícia médica", status: "agendada",
  data_hora: ts(-6, "14:00"), local: "AGÊNCIA DA PREVIDÊNCIA SOCIAL CATANDUVA", criado_em: ts(-40) });
const B3 = cliente("Berta Ficta Gomes", { fase: "conselho", especie: "B41", crps_nups: ["44000000000000002"],
  crps: [{ nup: "44000000000000002", eventos: [
    { data: `${barra(-90)} 09:00:00`, tipo: "andamento", bruto: "Requerimento protocolado - Tarefa: 7654321" },
    { data: `${barra(-4)} 09:00:00`, tipo: "andamento", bruto: "Arquivar" }] }] });
const P4 = "5000004-44.2025.4.03.6302";
const B4 = cliente("Brás Ficto Costa", { fase: "judicial", especie: "B87", processo: P4, processos: [{ numero: P4, nosso: true }] });
pje(B4, P4, "Distribuído por sorteio", -300);
// C · pede outra fase: a RPV no caso ainda no Judicial
const P5 = "5000005-55.2024.4.03.6302";
const C1 = cliente("Célia Ficta Rocha", { fase: "judicial", especie: "B41", processo: P5, processos: [{ numero: P5, nosso: true }] });
pje(C1, P5, "Expedição de Requisição de Pequeno Valor.", -7);
// D · sem fato: o pagamento sem andamento oficial
const D1 = cliente("Dario Ficto Neves", { fase: "pagamento", especie: "B41" });
// fora do lote: a etapa já de acordo, o encerrado, o pré-caso e a tarefa pessoal
const P6 = "5000006-66.2026.4.03.6302";
const X1 = cliente("Xisto Ficto Leal", { fase: "judicial", especie: "B31", processo: P6, processos: [{ numero: P6, nosso: true }], etapa: "aguardando sentença" });
pje(X1, P6, "Conclusos para sentença", -12);
const X2 = cliente("Xênia Ficta Dias", { fase: "encerrado", especie: "B31", encerrado_em: ts(-30) });
const X3 = cliente("Xavier Ficto Luz", { fase: "escritorio", pre_caso: true, precaso: { id: "pc_x3" } });
const X4 = cliente("Xandra Ficta Reis", { fase: "outro", origem_lista: "☕ Pessoal", titulo: "Renovar seguro do carro" });

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

  // ── o bloco no acervo e a leitura (E1): nada grava ──
  await p.evaluate(() => { visao = "acervo"; render(); });
  await p.waitForTimeout(300);
  const bloco = await p.evaluate(() => ((document.getElementById("acervo-etapas") || {}).textContent || "").replace(/\s+/g, " "));
  conf("E1.1 o 🧹 Cuidar do acervo mostra quantos casos abertos estão sem etapa (pré-caso, encerrado e tarefa pessoal fora)",
    /Etapas dos casos \(8 de 10 casos abertos sem etapa\)/.test(bloco) && /Etapas em lote/.test(bloco));
  banco.escritas.length = 0;
  await p.evaluate(() => document.querySelector("#acervo-etapas button").click());
  await p.waitForFunction(() => /prontos/.test((document.getElementById("et-lote-st") || {}).textContent || ""), null, { timeout: 30000 });
  const grupos = await p.evaluate(() => {
    const nomes = sel => [...document.querySelectorAll(sel)].map(li => li.querySelector("b").textContent);
    return { st: document.getElementById("et-lote-st").textContent,
      A: nomes(".org-plano .org-lote-lista li"), B: nomes(".org-sug:nth-of-type(1) .org-lote-lista li"),
      todos: [...document.querySelectorAll("#et-lote-res li")].map(li => li.textContent.replace(/\s+/g, " ").trim()) };
  });
  const linha = nome => grupos.todos.find(t => t.startsWith(nome)) || "";
  conf("E1.2 a contagem diz 3 prontos, 4 a conferir, 1 em outra fase e 1 sem fato",
    /3 prontos, 4 a conferir, 1 pedem outra fase e 1 sem fato/.test(grupos.st));
  conf("E1.3 o grupo A tem a exigência do PAT, os conclusos para sentença e o recurso do e-Recursos",
    grupos.A.length === 3 && ["Abel", "Adélia", "Amaro"].every(x => grupos.A.some(a => a.startsWith(x))));
  conf("E1.4 a regra nova: 'Requerimento protocolado - Tarefa' do e-Recursos propõe 'recurso protocolado'",
    /recurso protocolado.*pelo recurso protocolado no e-Recursos/.test(linha("Amaro")));
  conf("E1.5 a etapa contrariada vai à conferência com a atual e a proposta",
    /aguardando perícia → decidido · indeferido/.test(linha("Bruna")) && /contrariada/.test(linha("Bruna")));
  conf("E1.6 a perícia passada sem confirmação, o recurso arquivado e o fato com mais de 180 dias vão à conferência",
    /perícia sem confirmação/.test(linha("Bento")) && /recurso arquivado/.test(linha("Berta")) && /sem nada mais novo/.test(linha("Brás")));
  conf("E1.7 a RPV no caso do Judicial pede o Pagamento, e o pagamento sem andamento fica sem fato",
    /Pagamento · RPV expedida/.test(linha("Célia")) && /pedem outra fase|fase Pagamentos?/.test(linha("Célia") + grupos.st) && /nenhum andamento oficial/.test(linha("Dario")));
  conf("E1.8 a etapa já de acordo, o encerrado, o pré-caso e a tarefa pessoal não aparecem",
    !["Xisto", "Xênia", "Xavier", "Xandra"].some(x => grupos.todos.some(t => t.startsWith(x))));
  conf("E1.9 ler o lote não grava nada no banco",
    !banco.escritas.some(e => e.m !== "GET"));

  // ── E2: o grupo A grava de uma vez e o lote se desfaz ──
  await p.evaluate(() => document.getElementById("et-lote-ok").click());
  await p.waitForFunction(() => /etapas gravadas/.test((document.getElementById("et-lote-st") || {}).textContent || ""), null, { timeout: 30000 });
  conf("E2.1 grava a etapa dos três prontos e nenhuma outra",
    casoDe(A1.id).etapa === "em exigência" && casoDe(A2.id).etapa === "aguardando sentença" && casoDe(A3.id).etapa === "recurso protocolado"
    && casoDe(B1.id).etapa === "aguardando perícia" && !casoDe(B2.id).etapa && !casoDe(C1.id).etapa && casoDe(C1.id).fase === "judicial");
  const ands = T.andamentos.filter(a => /^Etapa: /.test(a.texto || ""));
  conf("E2.2 cada caso gravado ganha o andamento curto com o fato que sustenta a etapa",
    ands.length === 3 && ands.some(a => a.caso_id === A1.id && /^Etapa: em exigência \(pela situação do PAT “Em exigência” de /.test(a.texto)));
  const st2 = await p.evaluate(() => document.getElementById("et-lote-st").textContent);
  conf("E2.3 a janela diz quantas gravou e oferece desfazer o lote",
    /^3 etapas gravadas/.test(st2) && await p.evaluate(() => !!document.getElementById("et-lote-desf")));
  await p.evaluate(() => document.getElementById("et-lote-desf").click());
  await p.waitForTimeout(800);
  conf("E2.4 desfazer o lote devolve as etapas e apaga os andamentos",
    !casoDe(A1.id).etapa && !casoDe(A2.id).etapa && !casoDe(A3.id).etapa && !T.andamentos.some(a => /^Etapa: /.test(a.texto || "")));
  conf("E2.5 nenhum erro de página", !erros.length || (console.log(erros), false));

  await nav.close(); s.close();
  const falhas = ok.filter(([, v]) => !v).length;
  console.log(`\n${ok.length - falhas}/${ok.length} provas`);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
