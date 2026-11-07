// F400 · o Ler e o processo inteiro com um processo grande (25 peças de 60 folhas):
// a página não pode travar nem guardar todas as folhas desenhadas.
// Uso: PDFJS_DIR=<build do pdfjs-dist 3.11.174> node f398.js  (sem ele, a parte do PDF é pulada)
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1 } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const N = 25;

const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: JSON.parse(JSON.stringify(FIX.clientes)), casos: JSON.parse(JSON.stringify(FIX.casos)),
  atribuicoes: FIX.atribuicoes, documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;
Object.assign(T.casos.find(k => k.id === CASO1), { processo: "5002453-54.2025.4.03.6314", fase: "judicial", encerrado_em: null });
const pdf = fs.readFileSync(path.join(__dirname, "fixturas", "processo-60-folhas.pdf"));
for (let n = 1; n <= N; n++) {
  const dia = String(n).padStart(2, "0");
  T.anexos.push({ id: `b0000000-0000-0000-0000-0000000000${dia}`, cliente_id: CLI_CHEIO, caso_id: CASO1, nome: `Peça ${n}.pdf`, caminho: `pje/${CASO1}/${n}`,
    tipo: "application/pdf", origem: "pje", criado_em: `2026-01-${dia}T10:00:00Z`, paginas: 60, texto: "x", tamanho: pdf.length });
  banco.arquivos.set(`anexos/pje/${CASO1}/${n}`, { tipo: "application/pdf", corpo: pdf });
}
// e 120 peças em HTML, como o PJe guarda despachos e certidões
for (let n = 1; n <= 120; n++) { T.anexos.push({ id: `c0000000-0000-0000-0000-${String(n).padStart(12, "0")}`, cliente_id: CLI_CHEIO, caso_id: CASO1,
  nome: `Certidão ${n}`, caminho: `pje/${CASO1}/h${n}`, tipo: "text/html", origem: "pje", criado_em: `2025-12-01T10:${String(n % 60).padStart(2, "0")}:00Z`, texto: "x" });
  banco.arquivos.set(`anexos/pje/${CASO1}/h${n}`, { tipo: "text/html", corpo: Buffer.from("<html><body><p>" + "Certifico que. ".repeat(200) + "</p></body></html>") }); }
const ok = [];
const conf = (nome, v) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); };

(async () => {
  if (!process.env.PDFJS_DIR) { console.log("sem PDFJS_DIR: teste pulado"); process.exit(0); }
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
  await ctx.route(/cdnjs\.cloudflare\.com\/ajax\/libs\/pdf\.js\//, r =>
    r.fulfill({ status: 200, contentType: "application/javascript", body: fs.readFileSync(path.join(process.env.PDFJS_DIR, r.request().url().split("/").pop())) }));
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  p.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) erros.push("console: " + m.text()); });
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await p.evaluate(([cli, caso]) => abrirFicha(cli).then(() => { casoSel = caso; }), [CLI_CHEIO, CASO1]);
  await p.waitForFunction(n => (D.anexos || []).length >= n, N + 120);

  const t0 = Date.now();
  await p.evaluate(caso => abrirProcessoInteiro(caso), CASO1);
  await p.waitForFunction(() => document.querySelectorAll("#pi-0 iframe, #pi-0 canvas").length > 0, null, { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(4000);
  const medida = () => p.evaluate(() => { const cv = [...document.querySelectorAll("#proc-inteiro canvas")];
    return { n: cv.length, px: cv.reduce((s, c) => s + c.width * c.height, 0), vivos: cv.filter(c => c.width > 0).length }; });
  const m1 = await medida();
  console.log("aberto:", m1, Date.now() - t0, "ms");
  conf("a primeira peça aparece", await p.evaluate(() => !!document.querySelector("#pi-0 iframe, #pi-0 canvas")));
  conf("ao abrir, no máximo 12 folhas desenhadas na memória", m1.vivos <= 12);
  // rola o processo inteiro até o fim, como quem lê depressa
  for (let i = 0; i < 40; i++) { await p.evaluate(() => { const a = document.querySelector("#proc-inteiro .pi-autos"); a.scrollTop += 4000; }); await p.waitForTimeout(80); }
  await p.waitForTimeout(3000);
  const m2 = await medida();
  console.log("rolado:", m2);
  conf("depois de rolar, as folhas que saíram da tela são soltas (≤ 12 vivas)", m2.vivos <= 12);
  conf("e a memória das folhas fica abaixo de 60 milhões de pixels", m2.px < 60e6);
  const vivos = () => p.evaluate(() => ({ ifr: document.querySelectorAll("#proc-inteiro iframe").length,
    pdfs: [...document.querySelectorAll("#proc-inteiro .pi-peca")].reduce((s, x) => s + (x._pdfs || []).length, 0) }));
  const v2 = await vivos(); console.log("peças vivas depois de rolar:", v2);
  conf("as peças que ficaram longe são soltas (HTML e PDF)", v2.ifr <= 40 && v2.pdfs <= 6);
  await p.evaluate(() => { document.querySelector("#proc-inteiro .pi-autos").scrollTop = 0; }); await p.waitForTimeout(3000);
  conf("ao voltar ao começo, a primeira peça se desenha de novo", await p.evaluate(() => !!document.querySelector("#pi-0 iframe, #pi-0 canvas")));
  const t1 = Date.now(); await p.evaluate(() => 1); const lat = Date.now() - t1;
  conf("a página responde (menos de 500 ms)", lat < 500);
  // ir a uma peça pela árvore e o zoom
  await p.evaluate(() => piIr(130)); await p.waitForTimeout(2500);
  conf("a peça escolhida na árvore se desenha", await p.evaluate(() => [...document.querySelectorAll("#pi-130 canvas")].some(c => c.width > 0)));
  await p.evaluate(() => { piZoom(1); piZoom(1); }); await p.waitForTimeout(800);
  conf("o zoom não trava a página", await p.evaluate(() => !!document.getElementById("proc-inteiro")));
  await p.keyboard.press("Escape");
  conf("Esc fecha e solta as folhas", await p.evaluate(() => !document.getElementById("proc-inteiro")));
  conf("o Esc fecha só o processo inteiro, e a ficha continua aberta", await p.evaluate(() => !!clienteAberto));
  // o leitor ao lado da árvore: a peça de 60 folhas também se desenha aos poucos
  await p.evaluate(() => { const w = document.createElement("div"); w.id = "t-leitor"; w.className = "proc-leitor";
    w.innerHTML = '<div class="pl-corpo" style="height:700px;overflow:auto"><section class="pi-peca"><div class="pi-folha"></div></section></div>';
    document.body.appendChild(w); desenharPeca(D.anexos.find(a => /Peça 3/.test(a.nome)), w.querySelector(".pi-folha")); });
  await p.waitForTimeout(3000);
  const l1 = await p.evaluate(() => [...document.querySelectorAll("#t-leitor canvas")].filter(c => c.width > 0).length);
  conf("no leitor ao lado, a peça aparece com poucas folhas na memória", l1 > 0 && l1 <= 8);
  await p.evaluate(() => { const w = document.getElementById("t-leitor"); soltarPdfs(w.querySelector(".pi-peca")); });
  conf("trocar de documento solta as folhas do anterior", await p.evaluate(() => !document.querySelectorAll("#t-leitor canvas").length));
  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros.slice(0, 10).join("\n"));
  const falhas = ok.filter(([, v]) => !v).length;
  console.log(`${ok.length - falhas}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})();
