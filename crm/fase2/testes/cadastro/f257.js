// F257 · a agenda sugere quem já existe: o nome escrito de outro jeito (Luiz e Luis, Colatrelli e Colatreli) aparece como
// "nome parecido", o telefone digitado acha o cliente, e o telefone do primeiro atendimento que já está num cadastro
// mostra de quem é, com "É esta pessoa" (agenda como cliente) ou "É outra pessoa, continuar" (familiar ou amigo de quem
// ligou). No computador e no celular. Code.gs de verdade num Google simulado, banco simulado e dados fictícios.
// Uso: node f257.js [pasta das fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const { criarGoogle, proximo, quando } = require("./google-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f257";
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
    { id: "c0000000-0000-4000-8000-000000000005", nome: "Luiz Fictício Colatrelli", cpf: "11144477735", telefone: "16997331234", campos: {}, telefones: [], criado_em: "2026-01-01T12:00:00Z" }],
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
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
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


  await p.waitForSelector(".aq-faixa", { timeout: 15000 });
  await p.click(`[data-aqdia="${W}"]`);
  const sug = () => p.$$eval(".aq-fluxo .aq-sug button", b => b.map(x => [x.querySelector("b").textContent, x.className]));

  // 1 · o nome escrito de outro jeito: Luis com S e Colatreli com um L só
  await p.click('.aq-vaga[data-aqvaga="P1"]');
  await p.waitForSelector("#aq-busca");
  await p.type("#aq-busca", "Luis Ficticio Colatreli", { delay: 15 });
  let s1 = await sug();
  await foto("01-nome-parecido");
  conf(`Luis com S e um L só sugerem "Luiz Fictício Colatrelli" (${s1.map(x => x[0]).join(", ")})`, s1.some(([n, c]) => n === "Luiz Fictício Colatrelli" && /aq-parecido/.test(c)));
  conf("a sugestão vem com o aviso de nome parecido", /Nome parecido/.test(await p.textContent(".aq-fluxo .aq-sug")));
  conf("e o telefone do cadastro aparece junto, para conferir", /\(16\) 99733-1234/.test(await p.textContent(".aq-fluxo .aq-sug")));
  await p.fill("#aq-busca", ""); await p.type("#aq-busca", "99733", { delay: 15 });
  s1 = await sug();
  conf(`digitar parte do telefone também acha o cliente (${s1.map(x => x[0]).join(", ")})`, s1.some(([n]) => n === "Luiz Fictício Colatrelli"));

  // 2 · primeiro atendimento com um telefone que já está num cadastro
  await p.fill("#aq-busca", ""); await p.type("#aq-busca", "Marta Ficticia Nova", { delay: 10 });
  await p.click("[data-aqnovo]");
  await p.waitForSelector("#aq-tel");
  await p.type("#aq-tel", "16997331234", { delay: 10 });
  await p.waitForSelector("[data-aqmesmo]");
  await foto("02-telefone-ja-cadastrado");
  conf("o telefone que já está num cadastro mostra de quem é", /Este telefone já está no cadastro de:/.test(await p.textContent("#aq-tel-de")) && /Luiz Fictício Colatrelli/.test(await p.textContent("#aq-tel-de")));
  conf("o botão de seguir diz que é outra pessoa", (await p.textContent("#aq-seg2")).trim() === "É outra pessoa, continuar");
  conf("o cursor continua no telefone enquanto se digita", await p.evaluate(() => document.activeElement.id === "aq-tel"));
  // 2a · é outra pessoa (a mãe de quem ligou): segue como primeiro atendimento
  await p.click("#aq-seg2");
  await p.waitForSelector('[data-aqacomp="nao"]');
  conf("'É outra pessoa' segue o primeiro atendimento com o nome digitado", await p.evaluate(() => fluxo.novo && fluxo.nome === "Marta Ficticia Nova" && fluxo.tel === "16997331234"));
  // 2b · é a mesma pessoa: volta e escolhe o cadastro
  await p.click('[data-aqvolta="1"]');
  await p.waitForSelector("[data-aqmesmo]");
  await p.click("[data-aqmesmo]");
  await p.waitForTimeout(200);
  conf("'É esta pessoa' agenda como cliente do escritório", await p.evaluate(() => !fluxo.novo && fluxo.cli && fluxo.cli.nome === "Luiz Fictício Colatrelli") && /Cliente do escritório/.test(await p.textContent(".aq-fluxo")));
  await p.evaluate(() => fecharCaixa());

  // 3 · no celular
  await p.setViewportSize({ width: 390, height: 800 }); await p.waitForTimeout(300);
  await p.evaluate(() => abrirFluxoAgenda({ data: agq.sel }));
  await p.waitForSelector("#aq-busca");
  await p.type("#aq-busca", "Luis Colatreli", { delay: 15 });
  s1 = await sug();
  conf(`no celular o nome parecido também aparece (${s1.map(x => x[0]).join(", ")})`, s1.some(([n]) => n === "Luiz Fictício Colatrelli"));
  await foto("03-celular-nome");
  await p.fill("#aq-busca", ""); await p.type("#aq-busca", "Marta Ficticia Nova", { delay: 10 });
  await p.click("[data-aqnovo]"); await p.waitForSelector("#aq-tel");
  await p.type("#aq-tel", "16997331234", { delay: 10 });
  await p.waitForSelector("[data-aqmesmo]");
  conf("no celular o aviso do telefone cabe na tela, sem rolar de lado", await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1
    && document.querySelector("#aq-tel-de").getBoundingClientRect().right <= window.innerWidth + 1));
  await foto("04-celular-telefone");

  conf(`sem erro de página (${erros.join(" | ")})`, !erros.length);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
