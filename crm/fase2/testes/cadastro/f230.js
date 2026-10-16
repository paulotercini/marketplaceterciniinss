// F230 · a família do CadÚnico que a extensão gravou em clientes.dossie aparece
// no Primeiro atendimento: fato no bloco CadÚnico, quadro dos integrantes com
// CPF/NIS e o que o Portal da Transparência já disse, e o botão que pede a
// consulta à Edge Function `transparencia`. Banco simulado; a função é fingida na rota.
// Uso: node f230.js [pasta-das-fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1 } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f230";
fs.mkdirSync(OUT, { recursive: true });

const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: JSON.parse(JSON.stringify(FIX.clientes)), casos: JSON.parse(JSON.stringify(FIX.casos)),
  atribuicoes: FIX.atribuicoes, documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;

const cli = T.clientes.find(c => c.id === CLI_CHEIO);
cli.dossie = { cadunico: { em: "2026-10-13T12:00:00Z", baixados: [], inexistentes: [], falhas: [], familia: {
    numero_familiar: "12345678901", estado_cadastral: "Cadastrada", renda_por_pessoa: 150, membros: [
      { nome: "Aurélia Ficta de Souza", parentesco: "Responsável", cpf: "12345678909", nis: "10000000001", responsavel: true },
      { nome: "Zélia Ficta de Souza", parentesco: "Filha", cpf: "52998224725", nis: "10000000002" },
      { nome: "Nenê Ficta", parentesco: "Filho", cpf: null, nis: null }] } },
  transparencia: { em: "2026-10-13T12:05:00Z", pessoas: [
    { nome: "Aurélia Ficta de Souza", cpf: "12345678909", programas: [{ programa: "bpc", rotulo: "BPC", meses: 18, valor_ultimo: 1621 }] },
    { nome: "Zélia Ficta de Souza", cpf: "52998224725", programas: [] }] } };

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

  await p.evaluate(id => abrirAtendimentoDe(id), CLI_CHEIO);
  await p.waitForSelector(".pa-blocos");
  conf("o bloco CadÚnico nasce da família do dossiê e mostra estado e renda por pessoa",
    await p.evaluate(() => { const b = [...document.querySelectorAll(".pa-bloco")].find(x => /CadÚnico/.test(x.textContent)); if (!b) return false; b.click(); return true; }));
  await p.waitForSelector(".pa-transp");
  const txt = await p.evaluate(() => document.querySelector(".pa-det").textContent);
  conf("o fato diz família, estado cadastral, integrantes e renda", /Cadastrada/.test(txt) && /3 integrante/.test(txt) && /150,00/.test(txt));
  conf("o quadro lista os integrantes com CPF e NIS e o que a Transparência já disse",
    /123\.456\.789-09/.test(txt) && /529\.982\.247-25/.test(txt) && /10000000002/.test(txt) && /BPC: 18 pagamento/.test(txt) && /sem pagamento encontrado/.test(txt) && /ainda não consultado/.test(txt)
    && /consultado em 13\/10\/2026/.test(txt));
  await p.screenshot({ path: path.join(OUT, "f230-cadunico.png") });
  // a Edge Function fingida: o banco simulado responde /functions/v1/* com {}; aqui se guarda o pedido
  await p.route("**/functions/v1/transparencia", r => { banco.pedidoFn = JSON.parse(r.request().postData()); r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, aviso: "Portal da Transparência: 2 integrante(s) consultado(s)" }) }); });
  await p.evaluate(id => consultarTransparencia(id), CLI_CHEIO);
  const pedido = banco.pedidoFn;
  conf("o botão chama a Edge Function com o cliente e o CPF/NIS de cada integrante que os tem",
    pedido && pedido.cliente_id === CLI_CHEIO && pedido.pessoas.length === 2 && pedido.pessoas[0].cpf === "12345678909" && pedido.pessoas[1].cpf === "52998224725");

  conf("sem erro de página", !p._erros.length);
  if (p._erros.length) console.log(p._erros.join("\n"));
  const bons = ok.filter(x => x[1]).length;
  console.log(`\n${bons}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(bons === ok.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
