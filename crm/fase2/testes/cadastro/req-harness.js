// F232 · banca dos requisitos: carrega o app, injeta o catálogo de uma família (um
// .js com chamadas a registrarReq) e roda os casos-ouro de um .json:
//   [{nome, op, id, x, est, txt?, quando?}]  → mede o requisito id da opção op em reqCtxTeste(x)
//   [{nome, op, quandoOp:true, x, quando}]   → confere REQ_EXTRA[op].quando(x)
// txt é uma expressão regular (sem barras) que o texto devolvido precisa casar.
// Uso: node req-harness.js familia.js casos.json   (sem o .js, roda só os casos contra o app)
// Não é prova da suíte (fica em NAO_SAO_PROVAS do rodar.js).
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const [arqJs, arqCasos] = process.argv.slice(2).length === 1 ? [null, process.argv[2]] : process.argv.slice(2);
if (!arqCasos) { console.error("uso: node req-harness.js [familia.js] casos.json"); process.exit(2); }
const casos = JSON.parse(fs.readFileSync(arqCasos, "utf8"));
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "lembretes", "anexos", "analises_direito",
  "aposentadorias", "lista_pref", "andamento_tarefas", "modelos_mensagem", "credencial_vis", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: FIX.clientes, casos: FIX.casos, atribuicoes: FIX.atribuicoes,
  documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });

(async () => {
  // serve o app.html do projeto direto (sem copiar), para várias bancas rodarem juntas
  const app = path.join(__dirname, "..", "..", "app.html");
  const s = http.createServer((q, r) => { r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(app)); }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext();
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
  }, [SUPA, SESSAO]);
  await instalarBanco(ctx, { SUPA, SESSAO, banco: new Banco(dados) });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  await p.goto(`http://127.0.0.1:${s.address().port}/`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  if (arqJs) await p.addScriptTag({ content: fs.readFileSync(arqJs, "utf8") });
  const res = await p.evaluate(casos => casos.map(c => {
    try {
      const x = reqCtxTeste(c.x);
      if (c.quandoOp) { const q = (REQ_EXTRA[c.op] || {}).quando ? REQ_EXTRA[c.op].quando(x) : undefined;
        return { ok: q === c.quando, got: { quando: q } }; }
      const r = (REQ_BENEF[c.op] || []).find(q => q.id === c.id);
      if (!r) return { ok: false, got: { erro: `sem o requisito ${c.op}.${c.id}` } };
      const m = r.mede(x) || {};
      const ok = m.est === c.est && (!c.txt || new RegExp(c.txt, "i").test(m.txt || "")) && (!("quando" in c) || m.quando === c.quando);
      return { ok, got: { est: m.est, txt: m.txt, quando: m.quando } };
    } catch (e) { return { ok: false, got: { erro: String(e && e.stack || e) } }; }
  }), casos);
  let bons = 0;
  res.forEach((r, i) => { const c = casos[i]; if (r.ok) bons++;
    console.log(`${r.ok ? "PASSOU" : "FALHOU"}  ${c.op}${c.id ? "." + c.id : " (quando)"} · ${c.nome}${r.ok ? "" : `\n        esperado ${JSON.stringify({ est: c.est, txt: c.txt, quando: c.quando })}\n        veio     ${JSON.stringify(r.got)}`}`); });
  const cat = await p.evaluate(() => Object.fromEntries(Object.entries(REQ_BENEF).map(([k, v]) => [k, v.length])));
  console.log("catálogo:", JSON.stringify(cat));
  if (erros.length) console.log("erros de página:", erros);
  console.log(`${bons}/${res.length} passaram`);
  await nav.close(); s.close();
  process.exit(bons === res.length && !erros.length ? 0 : 1);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
