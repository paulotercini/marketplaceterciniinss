// F312 · a ajuda: o "?" do título, o "? Ajuda" fixo e o "?" das barras abrem o texto do assunto
// da tela, e todo assunto da lista existe. Banco simulado.
// Uso: node f312.js
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

  conf("o ? do título aparece no Meu Dia", await p.locator(".ajuda-tit").isVisible());
  conf("o ? fixo aparece", await p.locator("#fab-ajuda").isVisible());
  const [fa, fs2] = await p.evaluate(() => ["fab-ajuda","fab-sug"].map(i => document.getElementById(i).getBoundingClientRect()).map(r => ({ l: r.left, r: r.right, t: r.top, b: r.bottom })));
  conf("o ? fixo não cobre o Sugestões", fa.r <= fs2.l || fa.b <= fs2.t);
  await p.click(".ajuda-tit");
  conf("o ? do Meu Dia abre a ajuda do Meu Dia", /Ajuda: Meu Dia/.test(await p.locator("#modal").innerText()));
  conf("todo assunto da lista tem texto", await p.evaluate(() => AJUDA_GRUPOS.every(([, ks]) => ks.every(k => AJUDA[k]))));
  conf("todo assunto tem lugar na lista", await p.evaluate(() => Object.keys(AJUDA).every(k => AJUDA_GRUPOS.some(([, ks]) => ks.includes(k)))));
  conf("todo alvo aponta para assunto existente", await p.evaluate(() => AJUDA_ALVOS.every(([, c]) => c === null || AJUDA[c])));
  conf("os textos não têm travessão", await p.evaluate(() => !Object.values(AJUDA).some(([t, x]) => /—/.test(t + x))));
  await p.click(".ajuda-outros summary");
  await p.click('.ajuda-lista button:has-text("Concluir por hoje")');
  conf("outro assunto abre pela lista", /Ajuda: Concluir por hoje/.test(await p.locator("#modal").innerText()));
  await p.evaluate(() => fecharCaixa());
  await p.evaluate(() => irPara("fase:inss")); await p.waitForTimeout(100);
  await p.click(".ajuda-tit");
  conf("na lista INSS, a ajuda do INSS", /Ajuda: INSS/.test(await p.locator("#modal").innerText()));
  await p.evaluate(() => fecharCaixa());
  const k = await p.evaluate(() => D.casos.find(k => k.fase === "inss" || k.fase === "judicial") || D.casos[0]);
  await p.evaluate(k => { casoSel = k.id; abaAtiva = 2; abrirFicha(k.cliente_id); }, k);
  await p.waitForTimeout(400);
  conf("a barra da ficha ganha o ?", await p.locator(".menu-topo .ajuda-bt").count() > 0);
  conf("as abas do caso ficam sem o ?", await p.locator(".menu-andamentos .ajuda-bt").count() === 0);
  conf("o ? aparece uma vez por barra", await p.evaluate(() => [...document.querySelectorAll(".menu-topo")].every(m => m.querySelectorAll(":scope > .ajuda-bt").length === 1)));
  await p.locator(".menu-topo .ajuda-bt").first().click();
  conf("o ? da barra abre a ajuda da ficha", /Ajuda: Ficha do cliente/.test(await p.locator("#modal").innerText()));
  await p.evaluate(() => fecharCaixa());
  await p.click("#fab-ajuda");
  conf("o ? fixo na ficha abre a ajuda do caso", /Ajuda: Caso/.test(await p.locator("#modal").innerText()));
  await p.evaluate(() => fecharCaixa());
  await p.evaluate(() => { document.documentElement.setAttribute("data-nivel", "1"); });
  conf("no nível 1 o ? da ficha continua", await p.locator(".menu-topo .ajuda-bt").first().isVisible());
  conf("no nível 1 o ? fixo continua", await p.locator("#fab-ajuda").isVisible());
  conf("sem erro de página", !p._erros.length);
  if (p._erros.length) console.log(p._erros);

  await nav.close(); s.close();
  const f = ok.filter(x => !x[1]).length;
  console.log(`\n${ok.length - f}/${ok.length}`);
  process.exit(f ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
