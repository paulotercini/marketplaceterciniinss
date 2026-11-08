// F458 · o voltar do iPhone (pedido do Paulo, 08.11.2026): o voltar do navegador e a borda esquerda no CRM instalado
// fecham a camada de cima, sem sair do CRM. Banco simulado e dados fictícios. Uso: node f458.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f458";
fs.mkdirSync(OUT, { recursive: true });

const PAULO = FIX.colaboradores[0].id, MARCOS = "22222222-2222-2222-2222-222222222222", MEISSA = "33333333-3333-3333-3333-333333333333";
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: [...FIX.colaboradores, { id: MARCOS, auth_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", nome: "Marcos Fictício", inicial: "M",
    cor: "#8a4b00", papel: "colaborador", ativo: true, cargo: "advogado" },
    { id: MEISSA, auth_id: "cccccccc-cccc-cccc-cccc-cccccccccccc", nome: "Meissa Fictícia", inicial: "ME", cor: "#2b7a4b", papel: "colaborador", ativo: true, cargo: "recepcao" }],
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





const cA = cli("Luciana Aparecida Fictícia Mendes"); cA.cpf = "52998224725";
caso(cA, { beneficio: "Aux. Incapacidade Temporária", especie: "B31", fase: "inss" });

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
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
    localStorage.setItem("crm_voltar", "1");
    if (location.search.includes("standalone")) Object.defineProperty(navigator, "standalone", { get: () => true });
  }, [SUPA, SESSAO]);
  await instalarBanco(ctx, { SUPA, SESSAO, banco });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const erros = [];
  const abrir = async (q) => {
    const p = await ctx.newPage(); p.on("pageerror", e => erros.push(e.message));
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10${q||""}`);
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
    await p.evaluate(() => irPara("meudia")); await p.waitForTimeout(800);
    return p;
  };
  const estado = p => p.evaluate(() => ({ ficha: !!clienteAberto, visao, modal: modalAberto(), conv: document.getElementById("app").classList.contains("zap-conv-aberta"),
    armado: !!(history.state && history.state.crm==="voltar"), url: location.pathname }));

  // 1 · Safari: a ficha aberta, o voltar a fecha e o CRM continua
  let p = await abrir();
  conf("na lista inicial, nada armado", !(await estado(p)).armado);
  await p.evaluate(id => abrirFicha(id), cA.id); await p.waitForTimeout(600);
  conf("ficha aberta arma o voltar", (await estado(p)).armado);
  await p.goBack(); await p.waitForTimeout(600);
  let e = await estado(p);
  conf("voltar fecha a ficha", !e.ficha);
  conf("voltar não sai do CRM", e.url.endsWith("app.html") && e.visao === "meudia");
  conf("lista inicial sem ficha: desarmado", !e.armado);

  // 2 · janela por cima da ficha: o voltar fecha só a janela
  await p.evaluate(id => abrirFicha(id), cA.id); await p.waitForTimeout(500);
  await p.evaluate(() => caixa("<p>teste</p>")); await p.waitForTimeout(300);
  await p.goBack(); await p.waitForTimeout(500);
  e = await estado(p);
  conf("voltar fecha a janela e mantém a ficha", !e.modal && e.ficha && e.armado);
  await p.goBack(); await p.waitForTimeout(500);
  conf("segundo voltar fecha a ficha", !(await estado(p)).ficha);

  // 3 · fechar pelo ‹ não deixa voltar sobrando
  await p.evaluate(id => abrirFicha(id), cA.id); await p.waitForTimeout(500);
  await p.click(".cel-voltar"); await p.waitForTimeout(600);
  e = await estado(p);
  conf("fechar pelo ‹ desarma o voltar", !e.ficha && !e.armado);

  // 4 · outra lista: o voltar leva à lista inicial
  await p.evaluate(() => irPara("mencoes")); await p.waitForTimeout(500);
  conf("outra lista arma o voltar", (await estado(p)).armado);
  await p.goBack(); await p.waitForTimeout(600);
  conf("voltar leva ao Meu Dia", (await estado(p)).visao === "meudia");
  await p.close();

  // 5 · instalado na tela de início: a borda esquerda desliza e volta
  p = await abrir("&standalone=1");
  conf("standalone simulado", await p.evaluate(() => navigator.standalone === true));
  await p.evaluate(id => abrirFicha(id), cA.id); await p.waitForTimeout(600);
  const cdp = await ctx.newCDPSession(p);
  const toque = async (tipo, x, y) => cdp.send("Input.dispatchTouchEvent", { type: tipo, touchPoints: tipo === "touchEnd" ? [] : [{ x, y }] });
  // deslizar no meio da tela não volta
  await toque("touchStart", 200, 400); await toque("touchMove", 320, 405); await toque("touchEnd"); await p.waitForTimeout(500);
  conf("deslizar no meio não fecha a ficha", (await estado(p)).ficha);
  await toque("touchStart", 6, 400);
  for (const x of [40, 90, 160, 220]) await toque("touchMove", x, 404);
  await toque("touchEnd"); await p.waitForTimeout(700);
  e = await estado(p);
  conf("deslizar da borda esquerda fecha a ficha", !e.ficha && e.visao === "meudia");

  conf("sem erro de página", !erros.length); if (erros.length) console.log(erros);
  await nav.close(); s.close();
  console.log(`${ok.filter(x => x[1]).length}/${ok.length}`);
  process.exit(ok.every(x => x[1]) ? 0 : 1);
})();
