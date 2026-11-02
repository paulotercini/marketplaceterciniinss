// F241 · a visão do caso mais curta (docs/ATENDIMENTO-EM-ETAPAS.md, onda 4): a linha do tempo do Escritório
// mostra os dias mais recentes, com ao menos 5 anotações e todas as não lidas, e o resto num botão; Prazos e
// compromissos mostra o próximo, o vencido e o que vence em 7 dias, e o resto num "mais N", sem mexer na ordem
// decrescente (F145); o Caso completo agrupa por mês, com o mês atual, o anterior e o mais recente abertos.
// Banco simulado e dados fictícios. Uso: node f241.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f241";
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
const cli = nome => { const c = { id: id("c"), nome, cpf: null, telefone: null, campos: {}, telefones: [], criado_em: ts(-400) }; T.clientes.push(c); return c; };
const caso = (c, o) => { const k = { id: id("b"), cliente_id: c.id, titulo: c.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
  marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, dcb_prorrogacao_pedida: false, origem_lista: "🌻 INSS",
  criado_em: ts(-300), ...o }; T.casos.push(k); T.atribuicoes.push({ caso_id: k.id, colaborador_id: PAULO }); return k; };
const and = (k, n, texto, o = {}) => { const a = { id: id("e"), caso_id: k.id, autor_id: PAULO, texto, origem: "app", origem_id: null, criado_em: ts(n),
  publico: false, excluir: false, importante: false, urgente: false, responde_a: null, ...o }; T.andamentos.push(a); return a; };
const tarefa = (k, n, titulo) => T.tarefas.push({ id: id("7"), cliente_id: k.cliente_id, caso_id: k.id, titulo, prazo: iso(n), concluida: false, criado_em: ts(-3) });

// A · 14 anotações minhas, uma por dia, e 4 de meses atrás; cinco datas: a vencida, a próxima e três lá adiante
const cA = cli("Amélia Fictícia Longa");
const kA = caso(cA, { beneficio: "Apos. por Idade", especie: "B41", fase: "inss", der: iso(-150), protocolos: ["1700000101"] });
for (let n = 1; n <= 14; n++) and(kA, -n, `Anotação fictícia do dia ${n}`);
for (const n of [-40, -45, -70, -100]) and(kA, n, `Anotação antiga fictícia ${-n}`);
tarefa(kA, -2, "Ligar para a cliente sobre a CTPS"); tarefa(kA, 3, "Conferir o pedido no Meu INSS");
tarefa(kA, 40, "Ver a análise do INSS"); tarefa(kA, 60, "Cobrar a decisão"); tarefa(kA, 90, "Rever o prazo de análise");
// B · a anotação não lida do colega no 8º dia mais antigo fica à vista
const cB = cli("Bruno Fictício Novidade");
const kB = caso(cB, { beneficio: "Apos. por Idade", especie: "B41", fase: "inss", der: iso(-150), protocolos: ["1700000102"] });
for (let n = 1; n <= 12; n++) and(kB, -n, `Nota fictícia ${n}`, n === 8 ? { autor_id: MARCOS, texto: "Nota fictícia do Marcos, não lida" } : {});

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
  const abrir = async (c, k, aba = "escritorio") => { await p.evaluate(async ([cid, kid, ab]) => { await abrirFicha(cid); casoSel = kid; abaAtiva = 2; subAba = ab; repintarFicha(); }, [c.id, k.id, aba]); await p.waitForTimeout(500); };
  const notas = () => p.evaluate(() => { const vis = [], esc = [];
    for (const t of document.querySelectorAll(".timeline .tl-card, .timeline li.tl-nao-lida, .timeline > li:not(.dia-bloco):not(.tl-dia):not(.tl-fim-novas)"))
      (t.offsetParent !== null ? vis : esc).push(t.textContent.replace(/\s+/g, " ").trim());
    return { vis, esc, bt: (document.querySelector(".tl-antigos-bt") || {}).textContent || "" }; });

  // 1 · a linha do tempo mostra as 5 mais recentes e guarda as outras num botão
  await abrir(cA, kA);
  let n = await notas();
  await p.screenshot({ path: path.join(OUT, "01-caso.png") });
  conf(`a linha do tempo mostra as mais recentes (${n.vis.length} à vista, ${n.esc.length} guardadas)`, n.vis.length === 5 && n.esc.length === 13 && n.vis.some(t => /dia 1\b/.test(t)) && !n.vis.some(t => /dia 6\b/.test(t)));
  conf(`o botão diz quantas estão guardadas (${n.bt})`, /as 13 anotações mais antigas/.test(n.bt));
  await p.click(".tl-antigos-bt");
  n = await notas();
  conf("o clique mostra todas, sem repintar", n.vis.length === 18 && !n.bt);
  await p.evaluate(() => repintarFicha()); await p.waitForTimeout(300);
  conf("aberta, continua aberta na repintura", (await notas()).vis.length === 18);

  // 2 · a não lida mais antiga continua à vista
  await abrir(cB, kB);
  n = await notas();
  conf(`a anotação não lida fica à vista mesmo além das 5 (${n.vis.length} à vista)`, n.vis.some(t => /não lida/.test(t)) && n.vis.length === 8 && n.esc.length === 4);

  // 3 · Prazos e compromissos: à vista o vencido e o próximo; o resto num "mais N", na mesma ordem decrescente
  await abrir(cA, kA);
  const pz = () => p.evaluate(() => { const f = document.querySelector(".faixa-prazos"); const cs = [...f.querySelectorAll(".pz")];
    return { vis: cs.filter(c => c.checkVisibility()).map(c => c.dataset.data.split("-").reverse().join("/")), todos: cs.map(c => c.dataset.data.split("-").reverse().join("/")),
      bt: (f.querySelector("details.fp-resto:not([open]) summary") || {}).textContent || "", resumo: f.textContent }; });
  let z = await pz();
  await p.screenshot({ path: path.join(OUT, "02-prazos.png") });
  const br = s => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
  const adiante = [90, 60, 40].map(d => br(iso(d)));
  // F335 · um prazo de cada vez: à vista só o próximo; o vencido conta no "Ver as outras", em vermelho
  conf(`à vista só o próximo, e não os de longe (${z.vis.join(", ")})`, z.vis.length === 1 && z.vis.includes(br(iso(3))) && !adiante.some(d => z.vis.includes(d)));
  conf(`o resto em "Ver as outras N datas", recolhido, com a vencida (${z.bt})`, /\+\d+ datas/.test(z.bt) && /vencida/.test(z.bt));
  const q = s => s.split("/").reverse().join("");
  const resto = z.todos.slice(1);
  conf("F254 · depois do prazo fatal, a ordem é crescente", resto.every((d, i) => !i || q(resto[i - 1]) <= q(d)) && adiante.every(d => z.todos.includes(d)));
  conf("os grupos dizem o vencido e o que vem", /Vencidas/.test(z.resumo) && /Mais tarde/.test(z.resumo));
  await p.click("details.fp-resto summary");
  z = await pz();
  conf("o clique mostra todas as datas", z.vis.length === z.todos.length && !z.bt);

  // 4 · o Caso completo por mês
  await abrir(cA, kA, "tudo");
  const meses = await p.evaluate(() => [...document.querySelectorAll("details.mes-b")].map(d => [d.dataset.mesChave.split("|").pop(), d.open, d.querySelectorAll(".tl-card, li.tl-item, .timeline li").length]));
  await p.screenshot({ path: path.join(OUT, "03-completo.png") });
  const ym = d => d.slice(0, 7), hj = ym(iso(0)), antes = ym(new Date(Date.parse(iso(0).slice(0, 8) + "01") - 864e5).toISOString()), velho = ym(iso(-100));
  conf(`o Caso completo vem por mês (${meses.map(m => m[0] + (m[1] ? "·aberto" : "")).join(", ")})`, meses.length >= 3);
  conf("abertos o mês atual e o anterior (ou o mais recente do caso)", meses.filter(m => m[1]).every(m => m[0] === hj || m[0] === antes || m[0] === meses[0][0]) && meses[0][1]);
  conf(`o mês de ${velho} fica fechado`, meses.some(m => m[0] === velho && !m[1]));
  await p.evaluate(v => { const d = [...document.querySelectorAll("details.mes-b")].find(x => x.dataset.mesChave.endsWith(v)); d.open = true; }, velho);
  await p.waitForTimeout(100);
  await p.evaluate(() => repintarFicha()); await p.waitForTimeout(300);
  conf("o mês aberto à mão continua aberto na repintura", await p.evaluate(v => [...document.querySelectorAll("details.mes-b")].find(x => x.dataset.mesChave.endsWith(v)).open, velho));

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
