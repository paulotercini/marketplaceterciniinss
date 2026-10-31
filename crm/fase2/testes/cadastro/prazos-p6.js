// P6 dos prazos (31.10.2026): os cards das Aposentadorias futuras vencidos ou sem data vão à fila do Cuidar do
// acervo; o "rever em" do CRM (crm.rever_em) adia o lembrete sem esperar o To Do. Banco simulado e dados fictícios.
// Uso: node prazos-p6.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/prazos-p6";
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



const card = (c, id, o) => { const l = { id, cliente_id: c.id, tipo: "aposentadoria_futura", titulo: "Apos. por Idade", ativo: true,
  detalhes: { checklist: [], anotacoes: [] }, crm: {}, ...o }; T.lembretes.push(l); return l; };
const cA = cli("Ana Fictícia Vencida"); card(cA, "a1000000-0000-4000-8000-000000000001", { proximo_em: iso(-20) });
const cB = cli("Beto Fictício Sem Data"); card(cB, "b1000000-0000-4000-8000-000000000001", { proximo_em: null });
const cC = cli("Caio Fictício Em Dia"); card(cC, "c1000000-0000-4000-8000-000000000001", { proximo_em: iso(40) });
const cD = cli("Dora Fictícia Direito"); card(cD, "d1000000-0000-4000-8000-000000000001", { proximo_em: iso(-5), crm: { data_direito: iso(-3) } });

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

  const fila = await p.evaluate(() => cardsARever().map(x => x.cli.nome + ":" + x.motivo));
  conf("a fila traz o vencido e o sem data", fila.includes("Ana Fictícia Vencida:vencido") && fila.includes("Beto Fictício Sem Data:sem data"));
  conf("fora da fila: o em dia e o que já alcançou o direito", fila.length === 2);
  await p.evaluate(() => { visao = "acervo"; render(); });
  await p.waitForSelector("#acervo-cardsrever");
  conf("o Cuidar do acervo mostra o bloco", /a rever \(2\)/.test(await p.textContent("#acervo-cardsrever summary")));
  await p.evaluate(d => cardReverEm("a1000000-0000-4000-8000-000000000001", d), iso(30));
  await p.waitForTimeout(300);
  conf("o rever em grava em crm.rever_em", T.lembretes.find(l => l.id.startsWith("a1")).crm.rever_em === iso(30));
  conf("o card revisto sai da fila", await p.evaluate(() => cardsARever().length === 1));
  const md = await p.evaluate(c => itensAgenda(null).filter(i => i.cli && i.cli.id === c).map(i => i.data), cA.id);
  conf("o Meu Dia passa a mostrar o card na data nova", md.includes(iso(30)) && !md.includes(iso(-20)));

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
