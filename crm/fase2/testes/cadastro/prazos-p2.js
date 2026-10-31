// P2 dos prazos (31.10.2026): o plano de contribuições ganha a finalidade e o card de origem; o pagamento escrito
// nos cards das Aposentadorias futuras vira fila no Cuidar do acervo; o vencimento entra nos Prazos e no Meu Dia. Banco simulado e dados fictícios.
// Uso: node prazos-p2.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/prazos-p2";
fs.mkdirSync(OUT, { recursive: true });

const PAULO = FIX.colaboradores[0].id, MARCOS = "22222222-2222-2222-2222-222222222222";
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais", "qualidade_planos"]) dados[t] = [];
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




const cA = cli("Ana Fictícia Contribuinte");
const kA = caso(cA, { beneficio: "Apos. por Idade", especie: "B41", fase: "escritorio", origem_lista: "🙋 Escritório" });
const ym = n => { const d = new Date(Date.now() - 3 * 3600e3); d.setDate(1); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 7); };
T.qualidade_planos.push({ id: id("q"), cliente_id: cA.id, modalidade: "mensal", codigo: "1406", valor: 81.05, dia: 15, inicio: ym(0) + "-01",
  pagar_ate: ym(1) + "-15", meses: [], aviso_zap: false, ativo: true, finalidade: "carencia", criado_em: ts(-5) });
const cB = cli("Beto Fictício Futuro");
const lB = { id: "9b000000-0000-4000-8000-000000000001", cliente_id: cB.id, tipo: "aposentadoria_futura", titulo: "Beto Fictício Futuro", ativo: true,
  proximo_em: iso(200), detalhes: { checklist: [{ texto: "Pagar GPS 1406 a partir de 07/2026 para a carência" }], anotacoes: [] }, crm: {} };
const cC = cli("Caio Fictício Sem Pagamento");
const lC = { id: "9c000000-0000-4000-8000-000000000001", cliente_id: cC.id, tipo: "aposentadoria_futura", titulo: "Caio Fictício", ativo: true,
  proximo_em: iso(300), detalhes: { checklist: [{ texto: "Aposentadoria por tempo de contribuição em 2028" }], anotacoes: [] }, crm: {} };
T.lembretes.push(lB, lC);

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

  // 1 · o texto do card
  const tr = await p.evaluate(() => [trechosDePagamento(D.lembretes.find(l => l.titulo === "Beto Fictício Futuro")).length,
    trechosDePagamento(D.lembretes.find(l => l.titulo === "Caio Fictício")).length, sugestaoDoTrecho("Pagar GPS 1406 a partir de 07/2026")]);
  conf("o card que fala em GPS tem trecho de pagamento", tr[0] === 1);
  conf("'tempo de contribuição' não é pagamento", tr[1] === 0);
  conf("a sugestão lê o código e a primeira competência", tr[2].codigo === "1406" && tr[2].inicio === "2026-07");

  // 2 · Prazos e Meu Dia
  const ln = await p.evaluate(c => linhasDeDatas(c).linhas.filter(x => x.rotulo === "Contribuição a pagar"), cA.id);
  conf("o quadro Prazos traz o próximo pagamento do plano", ln.length === 1 && /Completar a carência/.test(ln[0].rot));
  const md = await p.evaluate(c => itensAgenda(null).filter(i => i.cli && i.cli.id === c && i.selo === "Contribuição").length, cA.id);
  conf("o Meu Dia traz o vencimento", md === 1);

  // 3 · a fila do Cuidar do acervo
  const fila = await p.evaluate(() => cardsComPagamento().map(x => x.cli.nome));
  conf("a fila traz só o card com pagamento", fila.length === 1 && fila[0] === "Beto Fictício Futuro");
  await p.evaluate(() => planoDoCard("9b000000-0000-4000-8000-000000000001"));
  await p.waitForSelector("#mq-fim-de");
  const pre = await p.evaluate(() => [document.querySelector("#mq-fim-de").value, document.body.textContent.includes("Do card")]);
  conf("o plano nasce do card com a finalidade aposentadoria e o trecho à vista", pre[0] === "aposentadoria" && pre[1]);
  await p.evaluate(d => { const e = document.getElementById("mq-ate"); e.value = d; }, iso(20));
  await p.click(".adr-modal-bts .adr-primario");
  await p.waitForTimeout(400);
  const gravado = T.qualidade_planos.find(q => q.cliente_id === cB.id);
  conf("o plano grava finalidade e lembrete_id", gravado && gravado.finalidade === "aposentadoria" && gravado.lembrete_id === lB.id && gravado.codigo === "1406");
  conf("o card com plano sai da fila", await p.evaluate(() => cardsComPagamento().length === 0));

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
