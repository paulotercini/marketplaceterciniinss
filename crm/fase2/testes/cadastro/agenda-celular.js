// A agenda no celular, no nível 0 (pedido do Paulo de 27.10.2026): a colaboradora entra pelo celular (390 × 844, toque),
// agenda um primeiro atendimento numa vaga, agenda um cliente do escritório, remarca e cancela, só com toques, e nenhuma
// tela rola de lado. O Apps Script é o Code.gs de verdade num Google Agenda simulado, como no f251.js. Banco simulado e
// dados fictícios. Uso: node agenda-celular.js [pasta das fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const { criarGoogle, proximo, quando } = require("./google-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/agenda-celular";
fs.mkdirSync(OUT, { recursive: true });

const INGRID = "33333333-3333-3333-3333-333333333333", AUTH_I = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const SESSAO_I = { ...SESSAO, user: { id: AUTH_I, email: "ingrid@exemplo.invalido" } };
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: [...FIX.colaboradores, { id: INGRID, auth_id: AUTH_I, nome: "Ingrid Fictícia", inicial: "I", cor: "#8a4b00",
    papel: "colaborador", ativo: true, cargo: "recepcao" }],
  clientes: [{ id: "c0000000-0000-4000-8000-000000000001", nome: "Ana Fictícia Colab", cpf: "52998224725", telefone: "(16) 99999-0001", campos: {}, telefones: [], criado_em: "2026-01-01T12:00:00Z" },
    { id: "c0000000-0000-4000-8000-000000000002", nome: "Bruno Fictício Lista", cpf: null, telefone: null, campos: {}, telefones: [], criado_em: "2026-01-01T12:00:00Z" },
    { id: "c0000000-0000-4000-8000-000000000003", nome: "Clara Fictícia Índice", cpf: null, telefone: null, campos: {}, telefones: [], criado_em: "2026-01-01T12:00:00Z" },
    { id: "c0000000-0000-4000-8000-000000000004", nome: "Élio Fictício Acento", cpf: null, telefone: null, campos: {}, telefones: [], criado_em: "2026-01-01T12:00:00Z" },
    { id: "c0000000-0000-4000-8000-000000000005", nome: "3M Fictícia Empresa", cpf: null, telefone: null, campos: { e_cliente: true }, telefones: [], criado_em: "2026-01-01T12:00:00Z" }],
  casos: [], atribuicoes: [], documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento,
  config_app: [...(FIX.config_app || []), { chave: "crm_transicao", valor: JSON.stringify({ ligada: true, onda: 1, niveis: {} }) }] });
const banco = new Banco(dados);
const T = banco.t;

// o Google Agenda: a quarta do Paulo (vagas sem cor, como o escritório faz), um atendimento lançado à mão, o almoço,
// e o Marcos (sálvia, um dos verdes) com um atendimento e uma vaga
const W = proximo(3);
const ev = (id, s, ini, fim, cor) => ({ id, summary: s, start: quando(W, ini), end: quando(W, fim), ...(cor ? { colorId: cor } : {}) });
const LIVRE = t => `${t} - Livre (anote o telefone)`;
const google = criarGoogle({ tokens: { "tok-ingrid": { nome: "Ingrid", papel: "equipe" } }, eventos: [
  ev("P1", LIVRE("001"), "09:00", "09:45"), ev("P2", LIVRE("002"), "09:45", "10:15"),
  ev("P3", "002 - Rafael Fictício - Não confirmado", "10:15", "10:45"), ev("ALM", "Almoço", "12:30", "13:30"),
  ev("P4", LIVRE("001"), "13:30", "14:15"),
  ev("M1", "002 - Michelle Fictícia - Confirmado", "09:00", "09:30", "2"), ev("M2", "LIVRE 09:30-10:00", "09:30", "10:00", "2"),
  // a Amanda (banana) escreve o horário livre como "LIVRE 09h30-10h00", sem o código, como no Google do escritório
  ev("A1", "LIVRE 10h00-10h30", "10:00", "10:30", "5")] });
const evG = id => google.eventos.find(e => e.id === id) || {};

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
    localStorage.setItem("crm_agenda_token", "tok-ingrid");
  }, [SUPA, SESSAO_I]);
  await instalarBanco(ctx, { SUPA, SESSAO: SESSAO_I, banco });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await ctx.route(/script\.google\.com/, r => {
    const corpo = JSON.parse(r.request().postData() || "{}");
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(google.post(corpo)) });
  });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  const vis = sel => p.evaluate(x => { const e = document.querySelector(x); return !!e && e.offsetParent !== null; }, sel);
  const foto = n => p.screenshot({ path: path.join(OUT, n + ".png"), fullPage: true });
  const recarregar = async () => { await p.evaluate(async () => { await carregarAgenda(); pintarAgenda(); }); await p.waitForTimeout(300); };


  // nada pode rolar de lado nem sair da tela, e a janela aberta cabe na largura
  const semRolarLado = () => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1
    && [...document.querySelectorAll(".modal-cx")].every(m => m.getBoundingClientRect().right <= window.innerWidth + 1 && m.getBoundingClientRect().left >= -1));
  const toque = async sel => { await p.waitForSelector(sel, { state: "visible", timeout: 10000 }); await p.tap(sel); };

  // 1 · a entrada
  await p.waitForSelector(".aq-faixa", { timeout: 15000 });
  conf("no celular, a colaboradora do nível 0 entra direto na Agenda", await p.evaluate(() => meuNivel() === 0 && visao === "agendaq"));
  const barra = await p.$$eval("#barra-cel button", b => b.filter(x => x.offsetParent !== null).map(x => x.dataset.cel));
  conf(`a barra de baixo é Agenda, Clientes e Buscar (${barra.join(", ")})`, barra.join() === "agendaq,clientes,busca");
  conf("a agenda não rola de lado", await semRolarLado());
  await toque(`[data-aqdia="${W}"]`);
  const vagas = await p.$$eval(".aq-vaga", b => b.map(x => x.dataset.aqvaga));
  conf(`na quarta aparecem as vagas do Paulo (${vagas.join(", ")})`, vagas.join() === "P1,P2,P4");
  conf("o dia com as vagas não rola de lado", await semRolarLado());
  await foto("01-quarta");

  // 2 · agendar um primeiro atendimento numa vaga 001, só com toques
  await toque('.aq-vaga[data-aqvaga="P1"]');
  await p.waitForSelector("#aq-busca");
  conf("a janela do agendamento cabe na tela", await semRolarLado());
  await p.tap("#aq-busca"); await p.keyboard.type("Novo Ficticio Cliente", { delay: 15 });
  await toque("[data-aqnovo]");
  await p.waitForSelector("#aq-tel");
  conf("o nome digitado vem no cadastro", (await p.inputValue("#aq-nome")) === "Novo Ficticio Cliente");
  await p.tap("#aq-tel"); await p.keyboard.type("16999990009");
  await toque("#aq-seg2");
  await toque('[data-aqacomp="nao"]'); await toque("#aq-seg4");
  await p.waitForSelector("#aq-seg5");
  conf("o horário já vem da vaga tocada", await p.evaluate(() => fluxo.inicio === "09:00" && fluxo.eventoId === "P1"));
  await foto("02-horario");
  await toque("#aq-seg5");
  await toque("#aq-o1"); await toque("#aq-o2");
  conf("a confirmação cabe na tela", await semRolarLado());
  await foto("03-confirmar");
  await toque("#aq-gravar");
  await p.waitForSelector(".aq-whats", { timeout: 10000 });
  conf(`agendar ocupa a vaga (${evG("P1").summary})`, evG("P1").summary === "001 - Novo Ficticio Cliente - Não confirmado");
  conf("o pré-cadastro nasce no CRM", !!T.clientes.find(c => c.nome === "Novo Ficticio Cliente"));
  conf("a tela do agendado, com o WhatsApp, cabe na tela", await semRolarLado());
  await foto("04-agendado");
  await p.evaluate(() => fecharCaixa()); await recarregar();

  // 3 · agendar um cliente do escritório numa vaga 002
  await toque('.aq-vaga[data-aqvaga="P2"]');
  await p.tap("#aq-busca"); await p.keyboard.type("Ana Fic", { delay: 15 });
  await toque("[data-aqcli]"); await toque("#aq-seg2");
  await toque('[data-aqacomp="nao"]'); await toque("#aq-seg4");
  await toque("#aq-seg5"); await toque("#aq-o1"); await toque("#aq-o2"); await toque("#aq-gravar");
  await p.waitForSelector(".aq-whats", { timeout: 10000 });
  conf(`cliente do escritório na vaga 002 (${evG("P2").summary})`, evG("P2").summary === "002 - Ana Fictícia Colab - Não confirmado");
  await p.evaluate(() => fecharCaixa()); await recarregar();

  // 4 · remarcar o primeiro atendimento para a vaga das 13:30
  await toque('[data-aqev="P1"]');
  const ops = await p.$$eval(".aq-menu [data-aqop]", b => b.filter(x => x.offsetParent !== null).map(x => x.dataset.aqop));
  conf(`o toque no atendimento oferece remarcar e cancelar (${ops.join(", ")})`, ops.includes("remarcar") && ops.includes("cancelar"));
  conf("o menu do atendimento cabe na tela", await p.evaluate(() => { const m = document.querySelector(".aq-menu"); if (!m) return false;
    const r = m.getBoundingClientRect(); return r.left >= -1 && r.right <= window.innerWidth + 1 && r.bottom <= window.innerHeight + 1; }));
  await foto("05-menu");
  await toque('.aq-menu [data-aqop="remarcar"]');
  await toque('[data-aqhora="13:30"]');
  conf("a remarcação cabe na tela", await semRolarLado());
  await p.waitForTimeout(500); await foto("06-remarcar");
  await toque("#aq-seg5");
  await p.waitForSelector(".aq-whats", { timeout: 10000 });
  conf(`remarcar ocupa a vaga nova (${evG("P4").summary})`, evG("P4").summary === "001 - Novo Ficticio Cliente - Não confirmado");
  conf(`e devolve a antiga (${evG("P1").summary})`, evG("P1").summary === LIVRE("001"));
  await p.evaluate(() => fecharCaixa()); await recarregar();

  // 5 · cancelar
  await toque('[data-aqev="P4"]');
  await toque('.aq-menu [data-aqop="cancelar"]'); await p.waitForTimeout(600);
  conf(`cancelar devolve a vaga (${evG("P4").summary})`, evG("P4").summary === LIVRE("001") && !((evG("P4").extendedProperties || {}).private || {}).clienteId);
  await recarregar();
  conf("e ela volta à lista de vagas", !!(await p.$('.aq-vaga[data-aqvaga="P4"]')));
  conf("a agenda continua sem rolar de lado", await semRolarLado());
  await foto("07-cancelado");
  conf("o nível 0 continua só na Agenda", await p.evaluate(() => visao === "agendaq" && !clienteAberto));

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
