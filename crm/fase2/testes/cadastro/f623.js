// F623 · o prazo de análise do INSS vencido se conclui pelo botão Concluir do painel do prazo: a linha sai,
// ronda.mora_fora guarda a data, o desfazer a devolve, e o prazo com outra data volta. Banco simulado. Uso: node f623.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f623";
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



// O · INSS com o prazo de análise vencido (B41, 90 dias da DER)
const cO = cli("Cliente Teste Mora");
const kO = caso(cO, { beneficio: "Apos. por Idade", especie: "B41", fase: "inss", der: iso(-200), protocolos: ["1700000401"] });
and(kO, -150, "Requerimento protocolado.");

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
  const abrir = async (c, k) => { await p.evaluate(async ([cid, kid]) => { await abrirFicha(cid); casoSel = kid; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); fecharCaixa(); }, [c.id, k.id]); await p.waitForTimeout(500); };
  // F275 · a linha da faixa mostra só a data e o abrir: a Ouvidoria fica no rodapé do painel do prazo
  const painelOuv = async () => { await p.evaluate(() => { const i = faixaAtual.findIndex(x => /ouv-/.test(x.acao || "")); if (i >= 0) abrirPainelPrazo(i); }); await p.waitForTimeout(400); };
  const util = n => p.evaluate(n => proxDiaUtil(somaDias(hoje(), n)), n);
  const br = s => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;




  const temMora = () => p.evaluate(() => faixaAtual.some(x => /mora-fora/.test(x.acao || "")));
  const painelMora = async () => { await p.evaluate(() => { const i = faixaAtual.findIndex(x => /mora-fora/.test(x.acao || "")); if (i >= 0) abrirPainelPrazo(i); }); await p.waitForTimeout(400); };
  await abrir(cO, kO);
  conf("a linha do prazo de análise vencido aparece", await temMora());
  await painelMora();
  conf("o painel do prazo traz Concluir ao lado da Ouvidoria", !!(await p.$("#painel-prazo .mora-fora")) && !!(await p.$("#painel-prazo .ouv-abrir")));
  await p.click("#painel-prazo .mora-fora");
  await p.waitForTimeout(800);
  const r1 = (T.casos.find(k => k.id === kO.id).ronda || {}).mora_fora;
  conf("Concluir grava ronda.mora_fora com a data do prazo", r1 && /^\d{4}-\d{2}-\d{2}$/.test(r1.data) && r1.por === PAULO);
  await abrir(cO, kO);
  conf("concluída, a linha sai do quadro", !(await temMora()));
  conf("aparece o desfazer", await p.evaluate(() => /desfazer/i.test((document.getElementById("aviso") || {}).textContent || "")));
  await p.click("#aviso .aviso-bt"); await p.waitForTimeout(700);
  await abrir(cO, kO);
  conf("desfazer devolve a linha", !(T.casos.find(k => k.id === kO.id).ronda || {}).mora_fora && await temMora());
  // outra data no prazo (registro antigo) não esconde a linha
  T.casos.find(k => k.id === kO.id).ronda = { mora_fora: { data: "2020-01-01" } };
  await p.evaluate(id => { const k = D.casoPorId.get(id); k.ronda = { mora_fora: { data: "2020-01-01" } }; }, kO.id);
  await abrir(cO, kO);
  conf("com o prazo recalculado para outra data, a linha volta", await temMora());

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
