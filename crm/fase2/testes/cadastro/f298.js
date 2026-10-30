// F298 · a ficha no celular (pedido do Paulo, 30.10.2026): o cabeçalho curto, o ⋯ dentro da tela, o campo de
// escrever numa linha e o ✎ Sugestões acima dele. Banco simulado e dados fictícios.
// Uso: node f298.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f298";
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
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);

  await p.evaluate(id => abrirFicha(id), cA.id);
  await p.waitForTimeout(1200);
  const box = sel => p.$eval(sel, e => { const r = e.getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right, h: r.height }; });
  const topo = await box(".det-topo"), voltar = await box(".cel-voltar"), nome = await box(".cli-bloco");
  conf("o voltar e o nome na mesma linha", Math.abs(voltar.t - nome.t) < 30);
  conf("o cabeçalho da ficha ocupa menos de um terço da tela", topo.h < 844 / 3);
  const esc = await box(".escrever"), fab = await box("#fab-sug");
  conf("fechado, o campo de escrever tem uma linha", (await box("#and-texto")).h <= 42);
  conf("o ✎ Sugestões fica acima do campo de escrever", fab.b <= esc.t);
  // F299 · a trilha e a placa do caso fechadas até o toque
  const vis = sel => p.$$eval(sel, a => a.some(e => e.offsetParent));
  conf("a trilha das etapas nasce recolhida", !(await vis(".tr-rol")) && (await vis(".tr-recolhida .tr-alca")));
  conf("a placa do caso nasce fechada", !(await vis(".linha-caso .lc-placa")));
  await p.screenshot({ path: OUT + "/cel-fechada.png" });
  await p.tap(".tr-recolhida .tr-alca"); await p.waitForTimeout(400);
  conf("o toque na alça abre a trilha", await vis(".tr-rol"));
  await p.tap(".linha-caso .lc-mais-pe"); await p.waitForTimeout(400);
  conf("o toque na flecha abre a placa do caso", await vis(".linha-caso .lc-placa"));
  await p.tap(".linha-caso .lc-mais-pe"); await p.waitForTimeout(300);
  await p.tap(".det-mais > summary"); await p.waitForTimeout(200);
  const m = await box(".det-mais .tl-mais-menu");
  conf("o menu do ⋯ abre dentro da tela", m.l >= 0 && m.r <= 390);
  await p.screenshot({ path: OUT + "/cel-ficha.png" });
  await p.tap(".det-mais > summary");
  await p.tap("#and-texto"); await p.waitForTimeout(300);
  conf("tocado, o campo mostra os tipos", (await p.$$eval("#tipo-fila > *", a => a.filter(e => e.offsetParent).length)) > 2);
  // F303 · a linha do Meu Dia no celular: data, nome, espécie e lista, prazo fatal e os botões do lado
  const linha = await p.evaluate(([cid, kid]) => {
    const d = document.createElement("div"); d.id = "f303"; document.body.appendChild(d);
    d.innerHTML = linhaAgenda({ k: D.casoPorId.get(kid), cli: D.cliPorId.get(cid), data: "2020-10-14", quem: [], resumo: "o INSS passou dos 90 dias",
      selo: "Mora do INSS", prazo: true, fatal: true });
    const v = s => [...d.querySelectorAll(s)].some(e => e.offsetParent);
    const r = { res: v(".ag-res"), selo: v(".ag-prazo"), fatal: v(".ag-fatal"), esp: v(".ag-esp"), data: v(".ag-data"), nome: v(".ag-txt b"), botoes: v(".acoes .acao-card[data-estrela]"), fogo: v(".acao-card.fogo") };
    d.remove(); return r; }, [cA.id, kA.id]);
  conf("no Meu Dia do celular, o texto da anotação e as etiquetas somem", !linha.res && !linha.selo);
  conf("ficam data, nome, espécie e lista, prazo fatal e os botões", linha.data && linha.nome && linha.esp && linha.fatal && linha.botoes);
  conf("sem o botão de urgente (F306)", !linha.fogo);
  // F303 · a linha do Meu Dia alinhada e o filtro por pessoa dentro da margem
  await p.evaluate(() => irPara("meudia")); await p.waitForTimeout(1000);
  const al = await p.evaluate(() => { const l = [...document.querySelectorAll("#conteudo-meio .ag-linha")].find(e => e.querySelector(".acoes .acao-card[data-estrela]") && e.querySelector(".avatares .avatar")); if (!l) return null;
    const m = s => { const b = l.querySelector(s).getClientRects()[0]; return (b.top + b.bottom) / 2; };  // a primeira linha do nome
    const seg = document.querySelector(".seg-colab").getBoundingClientRect(), card = l.getBoundingClientRect();
    return { d: m(".ag-data"), n: Math.min(m(".ag-txt b"), 1e9), f: m(".acoes .acao-card[data-estrela]"), a: m(".avatares .avatar"),
      aR: l.querySelector(".avatares .avatar").getBoundingClientRect().right, eL: l.querySelector(".acoes .acao-card[data-estrela]").getBoundingClientRect().left,
      raio: parseFloat(getComputedStyle(l.querySelector(".avatares .avatar")).borderTopLeftRadius), segR: seg.right, cardR: card.right }; });
  conf("data, nome, estrela e responsável na mesma linha", al && [al.d, al.f, al.a].every(y => Math.abs(y - al.n) < 6));
  conf("a inicial do responsável em quadrado, à esquerda da estrela (F306)", al && al.raio <= 8 && al.aR <= al.eL);
  conf("o filtro por pessoa não passa da margem", al && al.segR <= al.cardR + 1);
  await p.screenshot({ path: OUT + "/cel-meudia.png" });
  conf("sem erro de página", !erros.length);
  console.log(`${ok.filter(x => x[1]).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ok.every(x => x[1]) ? 0 : 1);
})();
