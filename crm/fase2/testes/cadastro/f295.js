// F295 · Onda D e F296 · Onda E do fluxo do To Do (29.10.2026): o resumo de ontem no Meu Dia, o aviso das 8h, a matriz
// importante × urgente na ⭐ Importante e as notas das etapas do To Do na Identificação. Banco simulado e dados
// fictícios.
// Uso: node f295.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f295";
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
const cA = cli("Rodrigo Fictício Ontem"); cA.cpf = "52998224725";
cA.campos = { notas_todo: [{ tipo: "cnpj", texto: "12.345.678/0001-90" }, { tipo: "aposentadoria", texto: "Possível aposentadoria especial em 22/10/2027" }] };
const kA = caso(cA, { beneficio: "Aux. Incapacidade Temporária", especie: "B31", fase: "inss", importante: true, urgente: true, prazo: iso(10),
  ronda: { despacho: { em: ts(dUtil, "15:00"), por: PAULO, prazo: iso(10) } } });
and(kA, dUtil, "Cliente avisado. Verificar em 10 dias.");
const cB = cli("Bruna Fictícia Urgente");
const kB = caso(cB, { beneficio: "Apos. por Idade", especie: "B41", fase: "inss", urgente: true });
and(kB, dUtil, "Pedido de documento enviado.");
const cC = cli("Carla Fictícia Estrela");
caso(cC, { beneficio: "Pensão por Morte", especie: "B21", fase: "inss", importante: true });

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

  // 1 · o resumo de ontem no Meu Dia
  await p.evaluate(() => { filtroDia = null; irPara("meudia"); });
  await p.waitForTimeout(400);
  const ont = await p.$eval(".md-ontem summary", e => e.textContent).catch(() => "");
  conf("o Meu Dia traz o resumo do último dia útil", /2 anotações em 2 clientes/.test(ont) && /1 concluído por hoje/.test(ont));
  await p.click(".md-ontem summary");
  conf("aberto, lista quem foi concluído e quando volta", /Rodrigo Fictício Ontem/.test(await p.textContent(".md-ontem")) && /volta à fila em/.test(await p.textContent(".md-ontem")));
  await p.screenshot({ path: path.join(OUT, "01-ontem.png") });

  // 2 · o aviso das 8h, uma vez por dia útil
  const av = await p.evaluate(() => { guardar("crm_aviso8", ""); const d = new Date(hoje() + "T08:05:00");
    const a = avisoDas8(d), b = avisoDas8(d), c0 = (guardar("crm_aviso8", ""), avisoDas8(new Date(hoje() + "T07:50:00")));
    return { a, b, c0, util: ehDiaUtil(hoje()) }; });
  conf("às 8h avisa o Meu Dia uma vez, e antes das 8h não", av.util ? (/para hoje/.test(av.a) && av.b === null && av.c0 === null) : av.a === null);

  // 2b · F297 · a sincronização parada avisa o administrador uma vez por carimbo velho
  const sp = await p.evaluate(() => { const ago = m => new Date(Date.now() - m * 60000).toISOString();
    D.config.set("todo_sync_em", ago(5)); guardar("crm_aviso_sync", ""); const a = avisoSyncParada();
    D.config.set("todo_sync_em", ago(20 * 60)); const b = avisoSyncParada(), c0 = avisoSyncParada();
    return { a, b, c0 }; });
  conf("sincronização parada avisa o administrador uma vez, e em dia não", sp.a === null && /não entra desde/.test(sp.b) && sp.c0 === null);

  // 3 · F306: o urgente saiu da tela, e a matriz importante × urgente com ele
  await p.evaluate(() => { filtroColab = null; irPara("importante"); });
  await p.waitForTimeout(400);
  conf("a ⭐ Importante não oferece a matriz", !(await p.isVisible("#chip-matriz")));
  conf("nenhum botão de urgente à vista", !(await p.$$eval(".acao-card.fogo, .tl-sinal.urg, .esc-ic.urg", bs => bs.some(b => b.offsetParent))));

  // 4 · as notas das etapas do To Do na Identificação
  await p.evaluate(async c => { await abrirFicha(c); }, cA.id);
  await p.waitForTimeout(500);
  await p.evaluate(() => { const b = [...document.querySelectorAll(".menu-cliente button, .det-abas button, button")].find(x => /^Cadastro/.test(x.textContent.trim())); if (b) b.click(); });
  await p.waitForTimeout(500);
  const nt = await p.$eval(".idf-notas-todo", e => e.textContent).catch(() => "");
  conf("a Identificação mostra o que estava nas etapas do To Do", /CNPJ/.test(nt) && /12\.345\.678\/0001-90/.test(nt) && /22\/10\/2027/.test(nt));
  await p.$eval(".idf-notas-todo", e => e.scrollIntoView({ block: "center" })).catch(() => {});
  await p.screenshot({ path: path.join(OUT, "03-notas-todo.png") });

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
