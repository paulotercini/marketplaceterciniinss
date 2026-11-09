// F457 · o Meu Dia no celular sem nada por cima (pedido do Paulo, 08.11.2026): os flutuantes não cobrem o Reagendar nem a data, o aviso
// F463 · a linha vai até a borda e o filtro por pessoa fica no ⋯ (pedido do Paulo, 09.11.2026)
// fica à esquerda da coluna e o ⋯ das listas na linha do título. Banco simulado e dados fictícios. Uso: node f457.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f457";
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




// o último dia útil antes de hoje, como o CRM conta
const dUtil = (() => { let n = -1; for (;;) { const d = new Date(iso(n) + "T12:00:00"); if (d.getDay() % 6) return n; n--; } })();
const cA = cli("Luciana Aparecida Fictícia Mendes de Oliveira"); cA.telefone="17996186303"; cA.cpf = "52998224725";
cA.campos = { notas_todo: [{ tipo: "cnpj", texto: "12.345.678/0001-90" }, { tipo: "aposentadoria", texto: "Possível aposentadoria especial em 22/10/2027" }] };
const kA = caso(cA, { beneficio: "Aux. Incapacidade Temporária", especie: "B31", fase: "inss", importante: true, urgente: true, prazo: iso(10),
  ronda: { despacho: { em: ts(dUtil, "15:00"), por: PAULO, prazo: iso(10) } } });
and(kA, dUtil, "Cliente avisado. Verificar em 10 dias.");
const cB = cli("Bruna Fictícia Urgente");
const kB = caso(cB, { beneficio: "Apos. por Idade", especie: "B41", fase: "inss", urgente: true });
and(kB, dUtil, "Pedido de documento enviado.");
const cC = cli("Carla Fictícia Estrela");
caso(cC, { beneficio: "Pensão por Morte", especie: "B21", fase: "inss", importante: true });
caso(cli("Roseli Maria Fictícia Custodio Schisatti"), { beneficio: "Aux. Incapacidade", especie: "B46", fase: "inss", prazo: iso(-90) });
// F307 · linhas bastantes para rolar o Meu Dia até o fim e ver se os flutuantes cobrem a última
for (let i = 0; i < 12; i++) caso(cli(`Cliente Fictício Número ${i + 1}`), { beneficio: "Apos. por Idade", especie: "B41", fase: "inss", prazo: iso(-5 - i) });

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
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  await instalarBanco(ctx, { SUPA, SESSAO, banco });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();

  // 11.93 · VCE-05: nenhum alvo de toque abaixo de 24 px (mínimo AA)
  const PEQ = async () => p.evaluate(() => [...document.querySelectorAll("button,a[href],[role=button],summary,select,input[type=checkbox],[onclick]")]
    .filter(e => e.offsetParent && getComputedStyle(e).visibility!=="hidden").map(e => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height, d: (e.className||e.tagName)+"|"+(e.textContent||"").trim().slice(0,20) }; })
    .filter(r => r.w && r.h && (r.w < 24 || r.h < 24)));
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await p.evaluate(() => irPara("meudia")); await p.waitForTimeout(1200);
  const FAB = ["#zap-ag .zag-pilula", "#zap-ag", "#fab-sug", "#fab-rapida", "#fab-ajuda"];
  const cobertos = () => p.evaluate(F => {
    const fabs = F.map(s => document.querySelector(s)).filter(e => e && e.getBoundingClientRect().width && getComputedStyle(e).display !== "none").map(e => e.getBoundingClientRect());
    const x = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    // F463 · a linha vai até a borda e passa por baixo dos flutuantes ao rolar (pedido do Paulo); o Reagendar e a data continuam livres
    const alvos = [...document.querySelectorAll("#conteudo-meio :is(.reag-bt,.ag-txt b,.ag-data)")].filter(e => e.offsetParent);
    return alvos.filter(a => fabs.some(f => x(a.getBoundingClientRect(), f))).map(a => (a.className || a.tagName) + "|" + a.textContent.trim().slice(0, 20)); }, FAB);
  const rola = y => p.evaluate(async y => { window.scrollTo(0, y); document.querySelectorAll("*").forEach(e => { if (e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY)) e.scrollTop = y; }); await new Promise(r => setTimeout(r, 250)); }, y);
  let ruins = [];
  for (const y of [0, 150, 300, 450, 600, 900, 1e6]) { await rola(y); const c = await cobertos(); if (c.length) ruins.push([y, c]); }
  conf("em nenhuma rolagem do Meu Dia um flutuante cobre data, nome ou Reagendar", !ruins.length) || console.log(JSON.stringify(ruins));
  await rola(0);
  // F463 · a ⭐ encosta na borda direita da linha (sem a reserva de 60 px) e o filtro por pessoa mora no ⋯
  const borda = await p.evaluate(() => { const l = [...document.querySelectorAll("#conteudo-meio .ag-linha")].find(e => e.querySelector(".acoes .acao-card[data-estrela]")); if (!l) return null;
    const c = l.getBoundingClientRect(), f = l.querySelector(".acoes .acao-card[data-estrela]").getBoundingClientRect();
    const seg = document.querySelector("#lista-opc .lo-pessoa .seg-colab[aria-label='Filtrar por pessoa'] [data-agcol]"), fora = document.querySelector("#topo-extra .seg-colab");
    return { gap: c.right - f.right, noMais: !!seg, fora: !!fora, topoVazio: !document.getElementById("topo-extra").offsetParent }; });
  conf("a estrela fica a menos de 24 px da borda da linha (F463)", borda && borda.gap < 24) || console.log(JSON.stringify(borda));
  // F464 · toda linha tem a ⭐, e a inicial e a ⭐ ficam em linha reta (pedido do Paulo, 09.11.2026)
  const reta = await p.evaluate(() => { const ls = [...document.querySelectorAll("#conteudo-meio .ag-linha")].filter(e => e.offsetParent);
    const xs = sel => [...new Set(ls.map(l => { const e = l.querySelector(sel); return e && e.offsetParent ? Math.round(e.getBoundingClientRect().left) : null; }).filter(x => x !== null))];
    return { n: ls.length, semEstrela: ls.filter(l => !l.querySelector(".acoes .acao-card:not(.fogo)")).length, xEst: xs(".acoes .acao-card:not(.fogo)"), xAv: xs(".avatares .avatar.mini") }; });
  conf("toda linha tem a ⭐ (F464)", reta.n > 3 && reta.semEstrela === 0) || console.log(JSON.stringify(reta));
  conf("a inicial e a ⭐ em linha reta (F464)", reta.xEst.length === 1 && reta.xAv.length <= 1) || console.log(JSON.stringify(reta));
  conf("o filtro por pessoa está no ⋯ e saiu do alto (F463)", borda && borda.noMais && !borda.fora && borda.topoVazio) || console.log(JSON.stringify(borda));
  await p.evaluate(() => document.getElementById("topo-mais").setAttribute("open", "")); await p.waitForTimeout(200);
  const menu = await p.evaluate(() => { const m = document.querySelector("#topo-mais .tl-mais-menu").getBoundingClientRect(); const bs = [...document.querySelectorAll("#lista-opc .lo-pessoa [data-agcol]")].map(b => b.getBoundingClientRect());
    return { dentro: m.left >= 0 && m.right <= innerWidth, n: bs.length, vis: bs.every(b => b.width > 20 && b.left >= m.left && b.right <= m.right + 1) }; });
  conf("aberto, o ⋯ cabe na tela e mostra os botões de pessoa (F463)", menu.dentro && menu.n >= 3 && menu.vis) || console.log(JSON.stringify(menu));
  await p.screenshot({ path: OUT + "/meudia-mais.png" });
  await p.evaluate(() => document.getElementById("topo-mais").removeAttribute("open"));
  // F463 · nas listas de fase os chips de inicial também vão ao ⋯
  await p.evaluate(() => irPara("fase:inss")); await p.waitForTimeout(800);
  const fase = await p.evaluate(() => ({ noMais: document.querySelectorAll("#lista-opc .lo-pessoa [data-fcol]").length, fora: document.querySelectorAll("#conteudo-meio .filtros [data-fcol]").length }));
  conf("na lista INSS, os chips de pessoa estão no ⋯ (F463)", fase.noMais >= 3 && !fase.fora) || console.log(JSON.stringify(fase));
  await p.evaluate(() => irPara("meudia")); await p.waitForTimeout(800);
  await rola(400); await p.screenshot({ path: OUT + "/meudia-meio.png" });
  await rola(0);
  const topo = await p.evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect(); return { h1: r("#titulo-lista"), mais: r("#topo-mais"), seg: r("#topo-extra") }; });
  conf("o ⋯ das listas fica na linha do título, à direita", Math.abs((topo.mais.top + topo.mais.bottom) / 2 - (topo.h1.top + topo.h1.bottom) / 2) < 12 && topo.mais.right > 340 && !topo.seg.height);
  await p.evaluate(() => aviso("Documentos: 1 de 16 (lendo o texto de cada um)…", false)); await p.waitForTimeout(400);
  const av = await p.evaluate(F => { const a = document.getElementById("aviso").getBoundingClientRect(); const b = document.querySelector(".barra-cel, nav.barra-cel, #barra-cel");
    const fabs = F.map(s => document.querySelector(s)).filter(e => e && e.getBoundingClientRect().width && getComputedStyle(e).display !== "none").map(e => e.getBoundingClientRect());
    const x = (p, q) => p.left < q.right && q.left < p.right && p.top < q.bottom && q.top < p.bottom;
    return { cobre: fabs.some(f => x(a, f)), dentro: a.left >= 0 && a.right <= innerWidth, a: JSON.stringify(a) }; }, FAB);
  conf("o aviso não passa por cima dos flutuantes e fica dentro da tela", !av.cobre && av.dentro) || console.log(JSON.stringify(av));
  await p.screenshot({ path: OUT + "/meudia-aviso.png" });
  conf("sem erro de página", !erros.length) || console.log(erros.slice(0, 3));
  console.log(`${ok.filter(x => x[1]).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ok.every(x => x[1]) ? 0 : 1);
})();
