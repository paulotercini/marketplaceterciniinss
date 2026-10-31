// P4 dos prazos (31.10.2026): o pedido de documento ganha data de entrega (15 dias, 30 para o papel de terceiro);
// o 🧹 Cuidar do acervo dá a data aos pedidos antigos sem data. Banco simulado e dados fictícios.
// Uso: node prazos-p4.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/prazos-p4";
fs.mkdirSync(OUT, { recursive: true });

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
const iso = n => new Date(Date.now() - 3 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
const ts = (n, h = "12:00") => `${iso(n)}T${h}:00-03:00`;
let seq = 0;
const id = p => `${p}0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const cli = (nome, campos = {}) => { const c = { id: id("c"), nome, cpf: null, telefone: null, campos, telefones: [], criado_em: ts(-400) }; T.clientes.push(c); return c; };
const caso = (c, o) => { const k = { id: id("b"), cliente_id: c.id, titulo: c.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
  marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, dcb_prorrogacao_pedida: false, origem_lista: "🌻 INSS",
  criado_em: ts(-300), ...o }; T.casos.push(k); T.atribuicoes.push({ caso_id: k.id, colaborador_id: PAULO }); return k; };
const and = (k, n, texto, o = {}) => { const a = { id: id("e"), caso_id: k.id, autor_id: PAULO, texto, origem: "app", origem_id: null, criado_em: ts(n),
  publico: false, excluir: false, importante: false, urgente: false, responde_a: null, ...o }; T.andamentos.push(a); return a; };



const cA = cli("Ana Fictícia Documentos");
const kA = caso(cA, { beneficio: "Apos. Especial", especie: "B46", fase: "inss", protocolos: ["1700000701"] });
T.tarefas.push({ id: "70000000-0000-4000-8000-000000000001", caso_id: kA.id, titulo: "📄 RG e comprovante de endereço", prazo: null, concluida: false, particular_de: null },
  { id: "70000000-0000-4000-8000-000000000002", caso_id: kA.id, titulo: "📄 PPP da empresa Fictícia", prazo: null, concluida: false, particular_de: null },
  { id: "70000000-0000-4000-8000-000000000003", caso_id: kA.id, titulo: "📄 Já com data", prazo: iso(4), concluida: false, particular_de: null });
const kE = caso(cA, { beneficio: "Auxílio", especie: "B31", fase: "encerrado" });
T.tarefas.push({ id: "70000000-0000-4000-8000-000000000004", caso_id: kE.id, titulo: "📄 Do caso encerrado", prazo: null, concluida: false, particular_de: null });

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
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const hj = iso(0);

  const r = await p.evaluate(() => [diasDoDoc("RG e comprovante"), diasDoDoc("PPP da empresa"), ehDiaUtil(prazoDocPadrao("RG"))]);
  conf("15 dias para o papel do cliente, 30 para o de terceiro", r[0] === 15 && r[1] === 30);
  conf("a data sugerida cai em dia útil", r[2]);
  const fila = await p.evaluate(() => docsSemData().map(x => x.nome));
  conf("a fila traz só os pedidos sem data de caso aberto", fila.length === 2 && fila.includes("PPP da empresa Fictícia") && !fila.includes("Do caso encerrado"));
  await p.evaluate(() => { visao = "acervo"; render(); });
  await p.waitForSelector("#acervo-docsdata");
  conf("o Cuidar do acervo mostra o bloco", /Documentos pedidos sem data \(2\)/.test(await p.textContent("#acervo-docsdata summary")));
  await p.evaluate(() => datarDocs());
  await p.waitForTimeout(400);
  const t1 = T.tarefas.find(t => t.id.endsWith("01")), t2 = T.tarefas.find(t => t.id.endsWith("02"));
  conf("o lote grava a data sugerida no banco", t1.prazo && t2.prazo && t2.prazo > t1.prazo);
  conf("a fila esvazia", await p.evaluate(() => docsSemData().length === 0));
  const ln = await p.evaluate(c => linhasDeDatas(c).linhas.filter(x => x.rotulo === "Documento pedido").length, cA.id);
  conf("com data, o pedido entra no quadro Prazos", ln === 3);
  // o documento anotado no atendimento nasce com data
  const ate = await p.evaluate(async c => { const cl = D.cliPorId.get(c); await gravarDocsAnotados(cl, its => its.push({ nome: "Prontuário do hospital", entregue: null }));
    return (cl.campos.docs_pedidos || []).find(x => x.origem === "anotacoes").ate; }, cA.id);
  conf("o documento anotado nasce com a data de 30 dias", ate && ate >= iso(30) && ate <= iso(33));

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
