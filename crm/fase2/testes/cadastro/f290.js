// F290 · o botão de sugestões da equipe: à vista acima do ⚡ em todas as telas e níveis,
// grava em sugestoes_equipe com return=minimal e só o titular vê as recebidas. Banco simulado.
// Uso: node f290.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";

const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais", "sugestoes_equipe"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: JSON.parse(JSON.stringify(FIX.clientes)), casos: JSON.parse(JSON.stringify(FIX.casos)),
  atribuicoes: FIX.atribuicoes, documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;

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

  conf("o botão aparece no Meu Dia", await p.locator("#fab-sug").isVisible());
  const [bs, bf] = await p.evaluate(() => [document.getElementById("fab-sug").getBoundingClientRect(),
    document.getElementById("fab-rapida").getBoundingClientRect()].map(r => ({ top: r.top, bottom: r.bottom, right: r.right })));
  conf("fica acima do ⚡, no canto direito", bs.bottom <= bf.top && Math.abs(bs.right - bf.right) < 2);
  await p.evaluate(() => abrirFicha(D.clientes[0].id));
  conf("o botão aparece com a ficha aberta", await p.locator("#fab-sug").isVisible());
  for (const n of ["0", "1", "2"]) {
    await p.evaluate(n => document.documentElement.setAttribute("data-nivel", n), n);
    conf(`o botão aparece no nível ${n}`, await p.locator("#fab-sug").isVisible());
  }
  await p.evaluate(() => document.documentElement.removeAttribute("data-nivel"));

  await p.click("#fab-sug");
  await p.check('input[name="sug-tipo"][value="melhoria"]');
  await p.fill("#sug-texto", "O botão de salvar some no celular.");
  await p.setInputFiles("#sug-arq", { name: "print tela.png", mimeType: "image/png", buffer: Buffer.from("png") });
  await p.click("button:has-text(\"Enviar ao Paulo\")");
  await p.waitForFunction(() => document.getElementById("modal").style.display === "none");
  const g = T.sugestoes_equipe[0] || {};
  conf("grava tipo, texto, autor e tela", g.tipo === "melhoria" && g.texto === "O botão de salvar some no celular." && g.autor && /ficha de/.test(g.tela || ""));
  conf("o print vai ao bucket sugestoes e fica na anotação", (g.arquivos || []).length === 1 && /print_tela\.png$/.test(g.arquivos[0].caminho)
    && banco.escritas.some(e => e.t === "storage" && String(e.chave).startsWith("sugestoes/")));
  conf("o texto vazio não grava", await p.evaluate(async () => { abrirSugestao(); await salvarSugestao(); return document.getElementById("modal").style.display !== "none"; }) && T.sugestoes_equipe.length === 1);

  await p.evaluate(() => { fecharCaixa(); abrirSugestao(); });
  await p.waitForSelector(".sug-it");
  conf("o titular vê as recebidas", (await p.locator(".sug-it").innerText()).includes("some no celular"));
  conf("o titular vê o anexo", await p.locator(".sug-it >> text=📎 print tela.png").count() === 1);
  await p.click(".sug-it button:has-text(\"marcar como lida\")");
  await p.waitForFunction(() => !document.querySelector(".sug-it.nova"));
  conf("marca como lida", !!T.sugestoes_equipe[0].lida_em);

  await p.evaluate(() => { eu.inicial = "A"; fecharCaixa(); abrirSugestao(); });
  conf("o colaborador não vê a lista das recebidas", !(await p.locator("#sug-lista").count()));

  conf("sem erro de página", !p._erros.length);
  if (p._erros.length) console.log(p._erros.join("\n"));
  const bons = ok.filter(x => x[1]).length;
  console.log(`\n${bons}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(bons === ok.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
