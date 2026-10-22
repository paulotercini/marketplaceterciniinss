// F250 · a agenda pelas vagas do Google Agenda ("001", "002") e a lista Clientes do nível 0: as vagas em destaque e na
// linha do tempo, o agendamento na vaga (o tipo e o horário dela, o pedido leva o eventoId), o passo do horário com as
// vagas dos dois tipos, e a lista de todos os clientes que abre só a Identificação. Apps Script e banco simulados.
// Uso: node f250.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f250";
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



const cA = cli("Ana Fictícia Agenda"); cA.telefone = "(16) 99999-0001"; cA.cpf = "52998224725";
const kA = caso(cA, { beneficio: "Apos. por Idade", especie: "B41", fase: "inss", der: iso(-10), protocolos: ["1700000601"] });
cli("Bruno Fictício Lista"); cli("Carla Fictícia Lista");
T.config_app.push({ chave: "crm_transicao", valor: JSON.stringify({ ligada: true, onda: 1, niveis: {} }) });
const DIA = iso(7);
const vaga = (id, ini, fim, tipo) => ({ id, titulo: tipo, data: DIA, inicio: ini, fim, atendimento: false, vaga: true, tipo, profissional: "paulo", confirmado: false, origemCrm: false });
const DISP = { ok: true, usuario: "Paulo", papel: "admin", profissional: "paulo", alerta: null, duracao: { "001": 45, "002": 30 },
  profissionais: [{ id: "paulo", nome: "Paulo", tratamento: "o Dr. Paulo Roberto Tercini Filho", cor: "9", dias: [3] }],
  ajustes: { dias: [3], extras: [], folgas: [] },
  dias: [{ data: DIA, diaSemana: 3, limite: 14, bloqueado: false, atendimentos: 1, lotado: false,
    eventos: [vaga("V1", "08:00", "08:45", "001"),
      { id: "A1", titulo: "002 - Fulano Fictício - Confirmado", data: DIA, inicio: "09:00", fim: "09:30", atendimento: true, vaga: false, tipo: "002", profissional: "paulo", confirmado: true, origemCrm: true },
      vaga("V2", "10:00", "10:30", "002")],
    livres: { "001": [{ inicio: "08:00", fim: "08:45", encaixado: true, reserva: false, vaga: true, eventoId: "V1", tipo: "001" }],
              "002": [{ inicio: "10:00", fim: "10:30", encaixado: true, reserva: false, vaga: true, eventoId: "V2", tipo: "002" }] },
    reservas: [], janelas: [{ inicio: "08:00", fim: "12:30" }, { inicio: "13:30", fim: "18:30" }] }] };
const DISP_M = JSON.parse(JSON.stringify(DISP)); DISP_M.profissional = "marcos";
DISP_M.dias[0].eventos = [{ id: "M1", titulo: "002", data: DIA, inicio: "14:00", fim: "14:30", atendimento: false, vaga: true, tipo: "002", profissional: "marcos" },
  { id: "ALM", titulo: "Almoço", data: DIA, inicio: "12:30", fim: "13:30", atendimento: false, vaga: false, tipo: null, profissional: null }];
DISP_M.dias[0].livres = { "001": [], "002": [{ inicio: "14:00", fim: "14:30", encaixado: true, reserva: false, vaga: true, eventoId: "M1", tipo: "002", profissional: "marcos" }] };
DISP_M.dias[0].atendimentos = 0;
const DISP_A = JSON.parse(JSON.stringify(DISP_M)); DISP_A.profissional = "amanda"; DISP_A.dias[0].eventos = [DISP_M.dias[0].eventos[1]]; DISP_A.dias[0].livres = { "001": [], "002": [] };
DISP.dias[0].eventos.push(DISP_M.dias[0].eventos[1]);
const pedidos = [];

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
    localStorage.setItem("crm_agenda_token", "token-ficticio");
  }, [SUPA, SESSAO]);
  await instalarBanco(ctx, { SUPA, SESSAO, banco });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await ctx.route(/script\.google\.com/, async r => {
    const b = JSON.parse(r.request().postData() || "{}"); pedidos.push(b);
    const resp = b.acao === "disponibilidade" ? (b.profissional === "marcos" ? DISP_M : b.profissional === "amanda" ? DISP_A : DISP)
      : b.acao === "editar" ? { ok: true, evento: {} }
      : b.acao === "agendar" ? { ok: true, evento: { id: b.eventoId || "NOVO", titulo: `${b.tipo} - ${b.nome} - Não confirmado`, data: b.data, inicio: b.inicio, fim: "08:45", atendimento: true, tipo: b.tipo, profissional: "paulo", origemCrm: true } }
      : b.acao === "agendamentosFuturos" ? { ok: true, agendamentos: [] } : { ok: true, usuario: "Paulo", papel: "admin" };
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(resp) }); });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const abrir = async (c, k) => { await p.evaluate(async ([cid, kid]) => { await abrirFicha(cid); casoSel = kid; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); fecharCaixa(); }, [c.id, k.id]); await p.waitForTimeout(500); };
  const util = n => p.evaluate(n => proxDiaUtil(somaDias(hoje(), n)), n);
  const br = s => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;




  const vis = sel => p.evaluate(s => { const e = document.querySelector(s); return !!e && e.offsetParent !== null; }, sel);
  // 1 · a agenda mostra as vagas do Google
  await p.evaluate(() => { visao = "agendaq"; render(); });
  await p.waitForSelector(".aq-vaga", { timeout: 10000 });
  const vs = await p.$$eval(".aq-vaga", b => b.map(x => x.textContent.replace(/\s+/g, " ").trim()));
  conf(`as vagas aparecem em destaque (${vs.join(" | ")})`, vs.length === 2 && /08:00.*001.*45 min/.test(vs[0]) && /10:00.*002.*30 min/.test(vs[1]));
  conf("a faixa do dia conta as vagas", /2 vagas/.test(await p.textContent(".aq-dia")));
  conf("na linha do tempo a vaga é 'Livre · agendar' e o atendimento marcado continua", (await p.$$(".aq-ev-vaga")).length === 2 && /Fulano/.test(await p.textContent(".aq-evs")));
  await p.screenshot({ path: path.join(OUT, "01-vagas.png"), fullPage: true });
  conf("a vaga 001 e a 002 do Paulo têm tons de azul diferentes", await p.evaluate(() => {
    const c = sel => getComputedStyle(document.querySelector(sel)).borderTopColor;
    return c('.aq-vaga[data-aqvaga="V1"]') !== c('.aq-vaga[data-aqvaga="V2"]') && document.querySelector('.aq-vaga[data-aqvaga="V1"]').classList.contains("p-paulo"); }));
  conf("o atendimento marcado leva a cor do tipo (002)", await p.evaluate(() => document.querySelector('[data-aqev="A1"]').classList.contains("t002")));
  // Editar o atendimento marcado
  await p.click('[data-aqev="A1"]');
  const opsEv = await p.$$eval(".aq-menu [data-aqop]", b => b.map(x => x.textContent));
  conf(`o atendimento marcado oferece Editar (${opsEv.join(", ")})`, opsEv[0] === "Editar");
  await p.click('.aq-menu [data-aqop="editar"]');
  await p.fill("#aq-ed-nome", "Fulano Fictício Corrigido");
  await p.click("#aq-ed-salvar"); await p.waitForTimeout(500);
  const ed = pedidos.find(x => x.acao === "editar");
  conf("Editar pede ao Google a troca do nome", ed && ed.eventId === "A1" && ed.nome === "Fulano Fictício Corrigido");
  await p.evaluate(() => fecharCaixa());
  // 2 · agendar na vaga 001
  await p.click('.aq-vaga[data-aqvaga="V1"]');
  await p.waitForSelector("#aq-busca");
  conf("a vaga abre o agendamento já com o tipo e o horário dela", await p.evaluate(() => fluxo.tipo === "001" && fluxo.eventoId === "V1" && fluxo.inicio === "08:00"));
  await p.evaluate(() => { window._jan = document.querySelector(".aq-fluxo"); });
  await p.type("#aq-busca", "Ana Fic");
  conf("digitar o nome não repinta a janela (sem tela piscando)", await p.evaluate(() => document.querySelector(".aq-fluxo") === window._jan && document.activeElement.id === "aq-busca"));
  await p.fill("#aq-busca", "Ana Fictícia");
  await p.evaluate(() => { const b = document.getElementById("aq-busca"); b.dispatchEvent(new Event("input")); });
  await p.waitForSelector("[data-aqcli]");
  await p.click("[data-aqcli]");
  conf("escolher cliente do escritório não troca o tipo da vaga (001)", await p.evaluate(() => fluxo.tipo === "001"));
  await p.evaluate(() => { fluxo.etapa = 6; fluxo.o1 = fluxo.o2 = true; });
  await p.evaluate(() => gravarFluxo()); await p.waitForTimeout(800);
  const ag = pedidos.find(x => x.acao === "agendar");
  conf(`o pedido ao Google leva a vaga (${ag && ag.eventoId}, ${ag && ag.tipo}, ${ag && ag.nome})`, ag && ag.eventoId === "V1" && ag.tipo === "001" && ag.nome === "Ana Fictícia Agenda" && ag.inicio === "08:00");
  await p.evaluate(() => fecharCaixa());
  // 3 · no fluxo, com vagas no dia, os horários são as vagas dos dois tipos
  await p.evaluate(() => { abrirFluxoAgenda({}); fluxo.cli = D.clientes.find(c => /Ana/.test(c.nome)); fluxo.nome = fluxo.cli.nome; fluxo.tipo = "002"; fluxo.etapa = 5; pintarFluxo(); });
  const hs = await p.$$eval("[data-aqhora]", b => b.map(x => x.textContent.replace(/\s+/g, " ").trim()));
  conf(`o passo do horário oferece as vagas dos dois tipos (${hs.join(" | ")})`, hs.length === 2 && /001/.test(hs[0]) && /002/.test(hs[1]));
  await p.click('[data-aqhora="08:00"]');
  conf("escolher a vaga de 001 passa o tipo a 001", await p.evaluate(() => fluxo.tipo === "001" && fluxo.eventoId === "V1"));
  await p.evaluate(() => fecharCaixa());
  // a agenda Completa
  await p.click('[data-aqprof="todos"]');
  await p.waitForFunction(() => agq.prof === "todos" && agq.disp && agq.disp.profissional === "todos", null, { timeout: 10000 });
  await p.evaluate(() => pintarAgenda());
  const vc = await p.$$eval(".aq-vaga", b => b.map(x => x.className));
  conf(`a Completa junta as vagas do Paulo e do Marcos (${vc.length})`, vc.length === 3 && vc.some(c => /p-marcos/.test(c)) && vc.some(c => /p-paulo/.test(c)));
  conf("o almoço, que é de todos, aparece uma vez só", await p.evaluate(() => agq.disp.dias[0].eventos.filter(e => e.id === "ALM").length === 1));
  await p.click('.aq-vaga[data-aqvaga="M1"]');
  conf("a vaga do Marcos na Completa agenda com o Marcos", await p.evaluate(() => fluxo.prof === "marcos" && fluxo.eventoId === "M1"));
  await p.evaluate(() => fecharCaixa());
  await p.screenshot({ path: path.join(OUT, "03-completa.png"), fullPage: true });
  await p.evaluate(() => { agq.prof = "paulo"; agq.disp = agq.cache.paulo; });
  // 4 · nível 0: a lista Clientes
  await p.evaluate(() => verComoNivel(0)); await p.waitForTimeout(400);
  const itens = await p.evaluate(() => [...document.querySelectorAll(".lista-item")].filter(e => e.offsetParent !== null).map(e => e.dataset.v));
  conf(`no nível 0 a barra traz Agenda e Clientes (${itens.join(", ")})`, itens.join() === "agendaq,clientes");
  await p.click('.lista-item[data-v="clientes"]'); await p.waitForTimeout(400);
  const nCli = await p.$$eval(".cli-todos-it", b => b.length);
  conf(`a lista Clientes mostra todos, em ordem (${nCli})`, nCli === 3 && /Ana/.test(await p.textContent(".cli-todos-it")));
  await p.fill("#cli-filtro", "bru"); await p.waitForTimeout(200);
  conf("o filtro acha pelo nome", (await p.$$eval(".cli-todos-it", b => b.map(x => x.textContent))).join("").includes("Bruno") && (await p.$$(".cli-todos-it")).length === 1);
  await p.screenshot({ path: path.join(OUT, "02-clientes.png") });
  await p.click(".cli-todos-it"); await p.waitForTimeout(600);
  const abas = await p.evaluate(() => [...document.querySelectorAll(".menu-topo .mt")].filter(e => e.offsetParent !== null).map(e => e.textContent.trim()));
  conf(`o cliente abre só na Identificação (${abas.join(", ")})`, abas.join() === "Cadastro" && await p.evaluate(() => subCad) === "identificacao");
  await p.evaluate(() => verComoNivel(null));

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
