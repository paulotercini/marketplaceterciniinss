// F403 · o cabeçalho da ficha sem o ⋯ (pedido do Paulo, 05.11.2026): o botão Anotações lista e sinaliza as anotações
// rápidas do cliente; o ⚡ oferece o cliente da ficha, nasce com ⭐ marcada e carrega anexo. Banco simulado e dados fictícios.
// Uso: node f403.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f403";
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



const cA = cli("Ellen Fictícia Rápida");
cA.telefone = "(16) 99999-0000";
const kA = caso(cA, { beneficio: "Pensão por Morte", especie: "B21", fase: "inss" });
const cB = cli("Bruno Fictício Sem Caso");

const ok = [];
const conf = (nome, v) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); };

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, "..", "..", q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1500, height: 900 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  await instalarBanco(ctx, { SUPA, SESSAO, banco });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await ctx.route(/\/storage\/v1\//, r => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await p.evaluate(async c => { await abrirFicha(c); }, cA.id); await p.waitForTimeout(600);

  conf("o cabeçalho não tem mais o ⋯", !(await p.$(".det-topo .det-mais")));
  conf("o botão Anotações está no cabeçalho, sem sinal", !!(await p.$(".det-topo .det-notas")) && !(await p.$(".det-notas-pt")));
  conf("Separar e SMBot saíram do cabeçalho", !(await p.$(".det-topo .sep-abrir")) && !(await p.$('.det-topo [onclick^="abrirSmbot"]')));

  // o ⚡ oferece o cliente da ficha, nasce com ⭐ e tem anexo
  await p.evaluate(() => anotacaoRapida());
  conf("o ⚡ oferece o nome do cliente da ficha", (await p.textContent(".ar-cli")).includes("Ellen"));
  conf("a ⭐ importante nasce marcada", await p.$eval("#ar-imp", e => e.checked));
  conf("há o botão de anexo", !!(await p.$("#ar-arq")));
  await p.click(".ar-cli");
  await p.fill("#ar-texto", "Ligou pedindo notícia da pensão");
  await p.setInputFiles("#ar-arq", { name: "rg.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 teste") });
  await p.evaluate(() => salvarAnotacaoRapida()); await p.waitForTimeout(900);
  await p.waitForTimeout(600); const and1 = T.andamentos.find(a => a.texto === "Ligou pedindo notícia da pensão");
  conf("a anotação entra no caso", !!and1 && and1.caso_id === kA.id);
  conf("o caso fica ⭐", T.casos.find(k => k.id === kA.id).importante === true);
  const an = T.anexos.find(a => a.nome === "rg.pdf");
  conf("o anexo vai a anexos, preso ao caso e ao andamento", !!an && an.caso_id === kA.id && an.andamento_id === and1.id && an.cliente_id === cA.id);
  const rs = (T.clientes.find(c => c.id === cA.id).campos || {}).rapidas || [];
  conf("a cópia curta fica em campos.rapidas, com o anexo", rs.length === 1 && rs[0].anexos.length === 1);

  // anotação de outra pessoa sinaliza; abrir a lista apaga o sinal
  await p.evaluate(c => { const x = D.cliPorId.get(c); x.campos.rapidas[0].autor_id = "outro"; }, cA.id);
  await p.evaluate(async c => { await abrirFicha(c); }, cA.id); await p.waitForTimeout(500);
  conf("a anotação de outra pessoa acende o ponto", !!(await p.$(".det-notas-pt")));
  await p.click(".det-notas"); await p.waitForTimeout(400);
  conf("a lista mostra a anotação e o anexo", /notícia da pensão/.test(await p.textContent(".sug-it")) && /rg\.pdf/.test(await p.textContent(".sug-it")));
  conf("abrir a lista apaga o ponto e grava rapidas_vistas", !(await p.$(".det-notas-pt")) && !!T.clientes.find(c => c.id === cA.id).campos.rapidas_vistas);
  await p.evaluate(() => fecharCaixa());

  // cliente sem caso: a anotação vai à ficha; digitar continua possível
  await p.evaluate(() => anotacaoRapida());
  await p.fill("#ar-busca", "Bruno Fic"); await p.waitForTimeout(300);
  await p.click('#ar-achados .proc-op:has-text("Bruno")');
  await p.fill("#ar-texto", "Trouxe o RG");
  await p.evaluate(() => salvarAnotacaoRapida()); await p.waitForTimeout(700);
  const nb = ((T.clientes.find(c => c.id === cB.id).campos || {}).atendimento || []).find(n => n.texto === "Trouxe o RG");
  conf("digitando outro cliente, a anotação vai à ficha dele, como rápida e ⭐", !!nb && nb.origem === "rapida" && nb.importante === true);

  // no Cadastro: Separar e Não é cliente
  await p.evaluate(async c => { await abrirFicha(c); }, cA.id); await p.waitForTimeout(500);
  conf("o Não é cliente está no Cadastro", !!(await p.$(".idf-dossie .cli-nao")));
  T.zap_conversas.push({ id: id("z"), cliente_id: cA.id, telefone: "5516999990000", nao_lidas: 0, ultima_em: ts(-1) });
  await p.evaluate(async c => { await abrirFicha(c); }, cA.id); await p.waitForTimeout(500);
  conf("o WhatsApp fica ao lado do telefone", await p.evaluate(() => [...document.querySelectorAll(".resumo-lado .id-min")].some(x => /Telefone/.test(x.textContent) && x.querySelector('[onclick^="verZapCliente"]'))));
  await p.screenshot({ path: path.join(OUT, "01-cabecalho.png"), clip: { x: 0, y: 0, width: 1500, height: 160 } });

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  await nav.close(); s.close();
  const n = ok.filter(x => x[1]).length;
  console.log(`\n${n}/${ok.length}`);
  process.exit(n === ok.length ? 0 : 1);
})();
