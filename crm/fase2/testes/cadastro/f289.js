// F289 · o processo inteiro: as peças judiciais de Documentos, da mais antiga
// à mais nova, com a árvore ao lado e a leitura contínua dentro do CRM.
// Banco simulado; o PDF passa pelo pdf.js do cdnjs (sem rede, essa parte é pulada).
// Uso: node f289.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1 } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";

const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: JSON.parse(JSON.stringify(FIX.clientes)), casos: JSON.parse(JSON.stringify(FIX.casos)),
  atribuicoes: FIX.atribuicoes, documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;
Object.assign(T.casos.find(k => k.id === CASO1), { processo: "5002453-54.2025.4.03.6314", fase: "judicial", encerrado_em: null });
const anexo = (n, nome, tipo, origem, criado_em, paginas) => ({ id: `a000000${n}-0000-0000-0000-000000000000`, cliente_id: CLI_CHEIO, caso_id: CASO1,
  nome, caminho: `pje/${CASO1}/${n}`, tipo, origem, criado_em, paginas, texto: "x", tamanho: 100 });
T.anexos.push(
  anexo(1, "Sentença", "text/html", "pje", "2026-09-10T10:00:00Z", 1),
  anexo(2, "Petição inicial.pdf", "application/pdf", "pje", "2026-01-05T10:00:00Z", 1),
  anexo(3, "Contestação", "text/html", "pje", "2026-03-02T10:00:00Z", 1),
  anexo(4, "Procuração do escritório", "application/pdf", "escritorio", "2026-01-01T10:00:00Z", 1));
banco.arquivos.set(`anexos/pje/${CASO1}/1`, { tipo: "text/plain", corpo: "<html><body><p>JULGO PROCEDENTE o pedido.</p><script>parent.__vazou=1</script></body></html>" });
banco.arquivos.set(`anexos/pje/${CASO1}/3`, { tipo: "text/plain", corpo: "<html><body><p>O INSS contesta.</p></body></html>" });
banco.arquivos.set(`anexos/pje/${CASO1}/2`, { tipo: "application/pdf", corpo: fs.readFileSync(path.join(__dirname, "fixturas", "cnis-girado-ficticio.pdf")) });

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
  // sem rede: PDFJS_DIR=<pasta build do pdfjs-dist 3.11.174> serve o pdf.js daqui
  if (process.env.PDFJS_DIR) await ctx.route(/cdnjs\.cloudflare\.com\/ajax\/libs\/pdf\.js\//, r =>
    r.fulfill({ status: 200, contentType: "application/javascript", body: fs.readFileSync(path.join(process.env.PDFJS_DIR, r.request().url().split("/").pop())) }));
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push(e.message + " " + (e.stack||"").split("\n").slice(1,3).join(" ")));
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await p.evaluate(([cli, caso]) => abrirFicha(cli).then(() => { casoSel = caso; fonteCnj = "docs"; }), [CLI_CHEIO, CASO1]);
  await p.waitForFunction(() => (D.anexos || []).length >= 4);
  const html = await p.evaluate(caso => painelDocumentos(D.casoPorId.get(caso), DOCS_JUDICIAIS) + "|||" + painelDocumentos(D.casoPorId.get(caso), ["pat"]), CASO1);
  conf("Documentos da aba Judicial oferece 'Abrir o processo inteiro'", /abrirProcessoInteiro\(/.test(html.split("|||")[0]));
  conf("e a aba do INSS não", !/abrirProcessoInteiro\(/.test(html.split("|||")[1]));

  await p.evaluate(caso => abrirProcessoInteiro(caso), CASO1);
  await p.waitForSelector("#proc-inteiro");
  const arv = await p.evaluate(() => [...document.querySelectorAll("#proc-inteiro .pi-arvore button")].map(b => b.textContent.replace(/\s+/g, " ").trim()));
  conf("a árvore traz só as peças judiciais (3), sem a procuração do escritório", arv.length === 3 && !arv.some(t => /Procuração/.test(t)));
  conf("em ordem cronológica: inicial, contestação, sentença", /^Petição inicial/.test(arv[0]) && /^Contestação/.test(arv[1]) && /^Sentença/.test(arv[2]));
  conf("com a folha de cada peça (fls. 1, 2, 3)", /fls\. 1\b/.test(arv[0]) && /fls\. 2\b/.test(arv[1]) && /fls\. 3\b/.test(arv[2]));

  await p.evaluate(() => piIr(2));
  await p.waitForFunction(() => { const f = document.querySelector("#pi-2 iframe"); return f && f.contentDocument && /PROCEDENTE/.test((f.contentDocument.body?.textContent || "")); }, null, { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(300);
  const sent = await p.evaluate(() => { const f = document.querySelector("#pi-2 iframe");
    return { txt: f && f.contentDocument && f.contentDocument.body?.textContent, sandbox: f && f.getAttribute("sandbox"), vazou: window.__vazou,
      on: (document.querySelector("#proc-inteiro .pi-arvore button.on") || { dataset: {} }).dataset.i }; });
  conf("a sentença (HTML do PJe) aparece dentro do CRM", /JULGO PROCEDENTE/.test(sent.txt || ""));
  conf("a árvore acende a peça que está na tela", sent.on === "2");
  conf("sem rodar o script do tribunal", sent.sandbox === "allow-same-origin" && !sent.vazou);

  let comRede = true;
  try { await p.evaluate(() => carregarPdfJs()); } catch (e) { comRede = false; console.log("SEM REDE para o pdf.js do cdnjs — a parte do PDF não foi executada"); }
  if (comRede) {
    await p.evaluate(() => piIr(0));
    const desenhou = await p.waitForFunction(() => document.querySelectorAll("#pi-0 canvas").length > 0, null, { timeout: 10000 }).then(() => true).catch(() => false);
    conf("a petição inicial (PDF) se desenha em folhas, sem abrir outro arquivo", desenhou);
  }
  // etapa 1 do Claude: as peças marcadas na árvore vão ao pedido pronto, com as fls.
  await p.click('#proc-inteiro .pi-it input[data-i="0"]'); await p.click('#proc-inteiro .pi-it input[data-i="2"]');
  conf("marcar peças na árvore mostra quantas vão ao Claude", /\(2 peças\)/.test(await p.textContent("#proc-inteiro .pi-claude")));
  await p.click("#proc-inteiro .pi-claude");
  await p.waitForSelector("#modal .modal-cx");
  const cx = await p.evaluate(() => { const m = document.querySelector("#modal .modal-cx"), r = m.getBoundingClientRect();
    return { txt: m.textContent, topo: m.contains(document.elementFromPoint(r.left + r.width / 2, r.top + 20)) }; });
  conf("o pedido abre por cima do processo inteiro, com os pedidos do processo", cx.topo && /Resumo do processo/.test(cx.txt) && /Pontos para o recurso/.test(cx.txt) && /Conferência de prazos/.test(cx.txt));
  if (process.env.FOTO) { await p.waitForTimeout(300); await p.screenshot({ path: process.env.FOTO.replace(/\.png$/, "-claude.png") }); }
  await p.keyboard.press("Escape");
  conf("Esc com o pedido aberto não fecha o processo inteiro", await p.evaluate(() => !!document.getElementById("proc-inteiro")));
  await p.evaluate(() => { window.open = u => { window.__url = u; return null; }; if (!document.querySelector("#modal .modal-cx")) piClaude(); });
  await p.click("#modal .esp-it:has-text('Resumo do processo')");
  const ped = await p.evaluate(() => decodeURIComponent((window.__url || "").split("?q=")[1] || ""));
  conf("o pedido leva as peças marcadas com a folha de cada uma, e só elas", /Petição inicial.*fls\. 1/.test(ped) && /Sentença.*fls\. 3/.test(ped)
    && /anexo:a0000002/.test(ped) && /anexo:a0000001/.test(ped) && !/anexo:a0000003/.test(ped) && /Cite cada fato pela peça e pelas fls\./.test(ped));
  await p.evaluate(() => { window.__url = ""; piClaude(1); });
  await p.click("#modal .esp-it:has-text('Pontos para o recurso')");
  const ped1 = await p.evaluate(() => decodeURIComponent((window.__url || "").split("?q=")[1] || ""));
  conf("'Ler esta peça com o Claude' leva só aquela peça", /Contestação.*fls\. 2/.test(ped1) && !/anexo:a0000001/.test(ped1) && !/anexo:a0000002/.test(ped1));
  conf("cada peça tem o botão 'Ler esta peça com o Claude'", await p.evaluate(() => document.querySelectorAll("#proc-inteiro .pi-peca .pi-ler").length === 3));
  if (process.env.FOTO) { await p.waitForTimeout(800); await p.screenshot({ path: process.env.FOTO }); }
  await p.keyboard.press("Escape");
  conf("Esc fecha o processo inteiro", await p.evaluate(() => !document.getElementById("proc-inteiro") && document.body.style.overflow === ""));
  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros.join("\n"));
  const falhas = ok.filter(([, v]) => !v).length;
  console.log(`${ok.length - falhas}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})();
