// F321 · o quadro do benefício pelos documentos (onda 1): o campo vazio do caso
// se preenche pela carta de concessão do dossiê, com a fonte; o valor diferente do
// gravado não troca nada e vira sugestão, que se aceita ou se mantém. Banco simulado.
// Uso: node f321.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1 } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f321";
fs.mkdirSync(OUT, { recursive: true });

const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: JSON.parse(JSON.stringify(FIX.clientes)), casos: JSON.parse(JSON.stringify(FIX.casos)),
  atribuicoes: FIX.atribuicoes, documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;

const B = "b0000000-0000-0000-0000-0000000003b2";
const caso1 = T.casos.find(k => k.id === CASO1);
Object.assign(caso1, { nb: "1234567890", der: null, dib: null, especie: "B41" });
T.casos.push(Object.assign(JSON.parse(JSON.stringify(caso1)), { id: B, fase: "judicial", especie: "B31", nb: "9876543210", der: "2025-05-01",
  protocolos: [], titulo: "Auxílio por incapacidade" }));
const carta = (nb, der, dib) => `CARTA DE\nCONCESSÃO\nNÚMERO DO BENEFÍCIO\n${nb} R$ 1.621,00\nComunicamos que foi concedido\nAPOSENTADORIA\nSolicitado em\n${der} 20/02/2026\nInício do benefício\n${dib} 01/03/2026`;
T.anexos.push(
  { id: "a0000000-0000-0000-0000-000000000321", cliente_id: CLI_CHEIO, caso_id: null, origem: "dossie", nome: "Cartas de concessao · carta 1",
    caminho: "dossie/12345678909/Cartas de concessao/1.pdf", texto: carta("123.456.789-0", "10/01/2026", "12/01/2026") },
  { id: "a0000000-0000-0000-0000-000000000322", cliente_id: CLI_CHEIO, caso_id: null, origem: "dossie", nome: "Cartas de concessao · carta 2",
    caminho: "dossie/12345678909/Cartas de concessao/2.pdf", texto: carta("987.654.321-0", "02/05/2025", "02/05/2025") });

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

  // a ficha aberta lê o quadro sozinha
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForFunction(([a, b]) => { const k = D.casoPorId.get(a), x = D.casoPorId.get(b); return k && k.der && x && ((x.ronda || {}).sugere || {}).der; },
    [CASO1, B], { timeout: 15000 }).catch(() => {});
  const a = T.casos.find(k => k.id === CASO1), b = T.casos.find(k => k.id === B);
  conf("o campo vazio se preenche pela carta do mesmo NB (DER e DIB)", a.der === "2026-01-10" && a.dib === "2026-01-12");
  conf("a fonte fica gravada no caso", ((a.ronda || {}).fontes || {}).der && a.ronda.fontes.der.fonte === "carta de concessão");
  conf("a DER já gravada e diferente não muda: vira sugestão", b.der === "2025-05-01" && ((b.ronda || {}).sugere || {}).der && b.ronda.sugere.der.v === "2025-05-02");
  const html = await p.evaluate(id => avisoQuadro(D.casoPorId.get(id)), B);
  conf("a placa mostra a sugestão com Aceitar e Manter", /02\/05\/2025/.test(html) && /Aceitar/.test(html) && /Manter/.test(html));
  await p.evaluate(id => quadroSugestao(id, "der", 0), B);
  conf("Manter guarda a recusa e tira a sugestão", b.der === "2025-05-01" && !(b.ronda.sugere || {}).der && b.ronda.recusou.der === "2025-05-02");
  await p.evaluate(cli => adotarQuadro(cli), CLI_CHEIO);
  conf("a sugestão recusada não volta", !(T.casos.find(k => k.id === B).ronda.sugere || {}).der);
  // a sugestão sem valor (DER que é a data do recurso) apaga no Aceitar
  await p.evaluate(id => { const k = D.casoPorId.get(id); k.ronda = { ...k.ronda, sugere: { der: { v: null, fonte: "PAT", motivo: "é a data do recurso" } } }; }, B);
  await p.evaluate(id => quadroSugestao(id, "der", 1), B);
  conf("Apagar tira a DER que é a data do recurso", T.casos.find(k => k.id === B).der === null);
  const t = await p.evaluate(id => lcCampo(D.casoPorId.get(id), "dib"), CASO1);
  conf("a placa diz de onde veio o valor", /lido de: carta de concessão/.test(t));

  conf("sem erro de página", !p._erros.length);
  if (p._erros.length) console.log(p._erros.join("\n"));
  const bons = ok.filter(x => x[1]).length;
  console.log(`\n${bons}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(bons === ok.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
