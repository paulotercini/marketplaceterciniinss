// F224 · o documento da coleta que já existe por caminho, preso a um caso
// ENCERRADO do mesmo número, vem ao caso aberto do mesmo cliente em vez de ser
// pulado; o que está em outro caso ABERTO fica onde foi posto. Banco simulado.
// Uso: node f224.js [pasta-das-fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1 } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f224";
fs.mkdirSync(OUT, { recursive: true });

const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: JSON.parse(JSON.stringify(FIX.clientes)), casos: JSON.parse(JSON.stringify(FIX.casos)),
  atribuicoes: FIX.atribuicoes, documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;

const NUM = "50024535420254036314";
const FECHADO = "b0000000-0000-0000-0000-0000000000f1", ABERTO = "b0000000-0000-0000-0000-0000000000a1", OUTRO = "b0000000-0000-0000-0000-0000000000a2";
const caso = (id, extra) => Object.assign(JSON.parse(JSON.stringify(FIX.casos[0])), { id, fase: "judicial", origem_lista: "👪 Judicial", protocolos: [],
  processo: "5002453-54.2025.4.03.6314", titulo: "Auxílio por incapacidade", criado_em: "2025-06-01T12:00:00Z" }, extra);
T.casos.push(caso(FECHADO, { encerrado_em: "2026-01-10T12:00:00Z" }), caso(ABERTO, {}), caso(OUTRO, { processo: "5002453-54.2025.4.03.6301" }));
T.anexos.push(
  { id: "a0000000-0000-0000-0000-000000000001", caso_id: FECHADO, cliente_id: CLI_CHEIO, origem: "pje", nome: "Sentença", caminho: `pje/${NUM}/1.pdf`, andamento_id: null },
  { id: "a0000000-0000-0000-0000-000000000002", caso_id: OUTRO, cliente_id: CLI_CHEIO, origem: "pje", nome: "Laudo", caminho: `pje/${NUM}/2.pdf`, andamento_id: null },
  { id: "a0000000-0000-0000-0000-000000000003", caso_id: ABERTO, cliente_id: CLI_CHEIO, origem: "pje", nome: "Inicial", caminho: `pje/${NUM}/3.pdf`, andamento_id: null });

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
  p._erros = [];
  p.on("pageerror", e => p._erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);

  // a coleta do processo chega ao caso ABERTO com os três caminhos já gravados
  const n = await p.evaluate(([aberto, cli, num]) => gravarDocsDaColeta([1, 2, 3].map(i => ({
    caso_id: aberto, cliente_id: cli, origem: "pje", caminho: `pje/${num}/${i}.pdf`, nome: `doc ${i}`, andamento_oid: null, momento: null }))), [ABERTO, CLI_CHEIO, NUM]);
  const patches = banco.escritas.filter(e => e.m === "PATCH" && e.t === "anexos");
  const a1 = T.anexos.find(a => a.id.endsWith("01")), a2 = T.anexos.find(a => a.id.endsWith("02")), a3 = T.anexos.find(a => a.id.endsWith("03"));
  conf("o documento preso ao caso encerrado do mesmo número vem ao caso aberto (caso_id e cliente_id)",
    a1.caso_id === ABERTO && a1.cliente_id === CLI_CHEIO && n === 1);
  conf("o documento de outro caso ABERTO fica onde está, e o que já é do caso aberto não gera escrita",
    a2.caso_id === OUTRO && a3.caso_id === ABERTO && patches.length === 1 && patches[0].ids.length === 1);
  conf("nada foi gravado como documento novo", !banco.escritas.some(e => e.m === "POST" && e.t === "anexos"));

  conf("sem erro de página", !p._erros.length);
  if (p._erros.length) console.log(p._erros.join("\n"));
  const bons = ok.filter(x => x[1]).length;
  console.log(`\n${bons}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(bons === ok.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
