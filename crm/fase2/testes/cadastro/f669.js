// F669 · mini agenda do cliente abaixo do quadro da espécie: o dia do prazo marcado e o índice com data e tipo. Uso: node f667.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f669";
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
const br = d => d.split("-").reverse().join(".");
const ts = (n, h = "12:00") => `${iso(n)}T${h}:00-03:00`;
// o prazo fatal cai em dia útil, como na vida
const util = n => { let k = n; while ([0, 6].includes(new Date(iso(k) + "T12:00:00").getDay())) k++; return k; };
let seq = 0;
const id = p => `${p}0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const cli = (nome, campos = {}) => { const c = { id: id("c"), nome, cpf: null, telefone: null, campos, telefones: [], criado_em: ts(-400) }; T.clientes.push(c); return c; };
const caso = (c, o) => { const k = { id: id("b"), cliente_id: c.id, titulo: c.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
  marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, dcb_prorrogacao_pedida: false, origem_lista: "🌻 INSS",
  criado_em: ts(-300), ...o }; T.casos.push(k); T.atribuicoes.push({ caso_id: k.id, colaborador_id: PAULO }); return k; };
const and = (k, n, texto, o = {}) => { const a = { id: id("e"), caso_id: k.id, autor_id: PAULO, texto, origem: "app", origem_id: null, criado_em: ts(n),
  publico: false, excluir: false, importante: false, urgente: false, responde_a: null, ...o }; T.andamentos.push(a);
  T.andamentos_lidos.push({ andamento_id: a.id, colaborador_id: PAULO }); return a; };
const tarefa = (a, quem, o = {}) => { const t = { id: id("f"), andamento_id: a.id, caso_id: a.caso_id, colaborador_id: quem, atribuido_por: PAULO,
  lembrar_em: null, natureza: "fatal", papel: "executa", concluida_em: null, iniciada_em: null, etapas: [], criado_em: a.criado_em, ...o };
  T.andamento_tarefas.push(t); return t; };


const dVivo = util(6);
const cA = cli("Ana Fictícia Quadro");
const kA = caso(cA, { beneficio: "Apos. por Idade", especie: "B41", fase: "judicial", processo: "50000000000000000001", der: "2025-03-10", nb: "1234567890", prazo: iso(dVivo) });
const nA = and(kA, -2, `⏰ [PRAZO ${br(iso(dVivo))}] Apelação contra a sentença de improcedência, com o relatório novo do ortopedista e a discussão inteira do laudo.`);
tarefa(nA, PAULO, { lembrar_em: iso(dVivo) });
const dRet = util(9);
caso(cA, { beneficio: "Auxílio por incapacidade", especie: "B31", fase: "inss", protocolos: ["1700000701"], der: "2026-09-01", prazo: iso(dRet) });
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
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const abrir = (c, k) => p.evaluate(async ([c, k]) => { await abrirFicha(c); const m = document.getElementById("modal"); if (m) m.style.display = "none";
    casoSel = k; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); }, [c, k]);
  await abrir(cA.id, kA.id);
  await p.waitForSelector(".linha-caso.lc5 + .ma"); await p.waitForTimeout(300);
  const r = await p.evaluate(d => { const m = document.querySelector(".ma"), dia = String(+d.slice(8));
    return { marcado: [...m.querySelectorAll(".ma-tem")].map(e => e.textContent), leg: (m.querySelector(".ma-leg") || {}).textContent || "" }; }, iso(dVivo));
  
  const mesmoMes = iso(dRet).slice(0, 7) === iso(0).slice(0, 7);
  if (!mesmoMes) await p.evaluate(() => maMes(1));
  const r2 = mesmoMes ? r : await p.evaluate(() => { const m = document.querySelector(".ma");
    return { marcado: [...m.querySelectorAll(".ma-tem")].map(e => e.textContent), leg: (m.querySelector(".ma-leg") || {}).textContent || "" }; });
  // F832 · a mini agenda abre recolhida, com o próximo prazo na linha de cima
  const px = await p.evaluate(() => { const d = document.querySelector(".ma details.ma-dt"); return d && { aberta: d.open, txt: d.querySelector("summary").textContent }; });
  conf("F832: mini agenda recolhida com a linha Próximo prazo", px && !px.aberta && /Próximo prazo/.test(px.txt) && /\d\d\/\d\d|hoje/.test(px.txt));
  // F833 · com a ficha aberta a lista do meio vira faixa; a alça devolve a largura
  const larg = () => p.evaluate(() => Math.round(document.querySelector(".meio").getBoundingClientRect().width));
  const lf = await larg(); await p.click("#lista-alca"); const ll = await larg(); await p.click("#lista-alca");
  conf("F833: lista em faixa de 216px e alça que devolve os 380px", lf === 216 && ll === 380 && await larg() === 216);
  conf("dia do prazo marcado na mini agenda", r2.marcado.includes(String(+iso(dRet).slice(8))));
  conf("índice traz a data e o tipo", r2.leg.includes(iso(dRet).slice(8) + "/" + iso(dRet).slice(5, 7)) && /Prazo do Microsoft To Do/.test(r2.leg));
  await p.screenshot({ path: path.join(OUT, "mini-agenda.png"), clip: { x: 0, y: 0, width: 720, height: 900 } });
  await p.evaluate(d => { const b = [...document.querySelectorAll(".ma button.ma-tem")].find(e => e.textContent === String(+d.slice(8))); b.click(); }, iso(dRet));
  await p.waitForSelector("#pz-cli");
  const sinc = await p.evaluate(d => ({ dia: _pzDia === d, mes: (document.querySelector(".pzm-cab b") || {}).textContent || "" }), iso(dRet));
  conf("o dia da mini agenda abre a aba Prazos filtrada no mesmo dia e no mesmo mês", sinc.dia && /de \d{4}/.test(sinc.mes));
  conf("sem erro na página", !erros.length); if (erros.length) console.log(erros);
  await nav.close(); s.close();
  process.exit(ok.every(([, v]) => v) && !erros.length ? 0 : 1);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
