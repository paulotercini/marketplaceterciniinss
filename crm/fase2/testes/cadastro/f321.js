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
// F321b · o caso judicial sem NB lê a DER e a DIB da sentença; a DIB da inicial (a pedida) não vale
const C = "b0000000-0000-0000-0000-0000000003b3";
T.casos.push(Object.assign(JSON.parse(JSON.stringify(caso1)), { id: C, fase: "judicial", especie: "B42", nb: null, der: null, dib: null,
  protocolos: [], titulo: "Aposentadoria por tempo" }));
const carta = (nb, der, dib) => `CARTA DE\nCONCESSÃO\nNÚMERO DO BENEFÍCIO\n${nb} R$ 1.621,00\nComunicamos que foi concedido\nAPOSENTADORIA\nSolicitado em\n${der} 20/02/2026\nInício do benefício\n${dib} 01/03/2026`;
T.anexos.push(
  { id: "a0000000-0000-0000-0000-000000000321", cliente_id: CLI_CHEIO, caso_id: null, origem: "dossie", nome: "Cartas de concessao · carta 1",
    caminho: "dossie/12345678909/Cartas de concessao/1.pdf", texto: carta("123.456.789-0", "10/01/2026", "12/01/2026") },
  { id: "a0000000-0000-0000-0000-000000000322", cliente_id: CLI_CHEIO, caso_id: null, origem: "dossie", nome: "Cartas de concessao · carta 2",
    caminho: "dossie/12345678909/Cartas de concessao/2.pdf", texto: carta("987.654.321-0", "02/05/2025", "02/05/2025")  },
  { id: "a0000000-0000-0000-0000-000000000323", cliente_id: CLI_CHEIO, caso_id: C, origem: "pje", nome: "Petição inicial",
    caminho: "pje/1/ini.pdf", criado_em: "2024-01-10T12:00:00Z", texto: "requer a aposentadoria desde a DER: 09/05/2017, com DIB: 01/01/2017." },
  { id: "a0000000-0000-0000-0000-000000000324", cliente_id: CLI_CHEIO, caso_id: C, origem: "pje", nome: "Sentença",
    caminho: "pje/1/sent.pdf", criado_em: "2025-03-10T12:00:00Z", texto: "julgo procedente. Segurado: X Benefício: Aposentadoria DIB: 09/05/2017 RMI: a calcular. Reafirmação? Não." });

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

  const c3 = T.casos.find(k => k.id === C);
  conf("o caso sem carta lê a DER da inicial e a DIB da sentença", c3.der === "2017-05-09" && c3.dib === "2017-05-09"
    && /sentença/.test(c3.ronda.fontes.dib.fonte) && /inicial/.test(c3.ronda.fontes.der.fonte));
  const lidos = await p.evaluate(() => [lerDatasDoJulgado("desde a data do requerimento administrativo (D.E.R. 22.11.2010), observada"),
    lerDatasDoJulgado("em 6 de março de 2015 (DER), deu entrada"), lerDatasDoJulgado("DER: 01/01/2019 e a reafirmação da DER 01/06/2020"),
    lerDatasDoJulgado("em que se der a aposentadoria 10/10/2010")]);
  conf("o leitor do julgado só aceita a data rotulada e única", lidos[0].der === "2010-11-22" && lidos[1].der === "2015-03-06" && !lidos[2].der && !lidos[3].der);
  // F321c · o lote do Cuidar do acervo preenche sem a ficha aberta
  await p.evaluate(id => { const k = D.casoPorId.get(id); k.dib = null; fecharFicha(false); }, CASO1);
  T.casos.find(k => k.id === CASO1).dib = null;
  await p.evaluate(() => preencherQuadrosTodos());
  await p.waitForFunction(() => /gravado/.test((document.getElementById("qd-lote-st") || {}).textContent || ""), null, { timeout: 15000 }).catch(() => {});
  const stLote = await p.evaluate(() => (document.getElementById("qd-lote-st") || {}).textContent || "");
  conf("o lote do acervo preenche a DIB vazia e diz quantos", T.casos.find(k => k.id === CASO1).dib === "2026-01-12" && /dado\(s\) gravado/.test(stLote));
  await p.evaluate(() => document.getElementById("qd-lote-desf").click());
  await p.waitForFunction(() => /Desfeito/.test(document.getElementById("qd-lote-st").textContent), null, { timeout: 5000 }).catch(() => {});
  conf("o desfazer do lote volta o campo", T.casos.find(k => k.id === CASO1).dib === null);
  conf("sem erro de página", !p._erros.length);
  if (p._erros.length) console.log(p._erros.join("\n"));
  const bons = ok.filter(x => x[1]).length;
  console.log(`\n${bons}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(bons === ok.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
