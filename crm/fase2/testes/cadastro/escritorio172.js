// F172 — cliente da lista Escritório (sem caso, com anotações do To Do) vê as
// anotações na Análise de Direito e anota por ali. Dados fictícios.
// Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CLI_VAZIO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
    window.__abertos = []; window.open = (u) => { window.__abertos.push(u); return null; };
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (rota.request().method() !== "GET") return rota.fulfill({ status: 204, body: "" });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.evaluate(cli => { const c = D.cliPorId.get(cli);
    c.campos = { atendimento: [{ id: "n1", em: "2026-09-20T12:00:00Z", texto: "Cliente trará a carteira de trabalho na sexta.", quem: "Amanda", origem: "todo" }] };
    return abrirFicha(cli); }, CLI_VAZIO);
  await p.waitForSelector("#ad-anot", { state: "attached" });
  const v = await p.evaluate(() => ({ sub: subCad, menu: [...[...document.querySelectorAll(".sub-menu")].find(m => /Identificação/.test(m.textContent)).querySelectorAll("button")].map(b => b.textContent.trim()),
    feed: document.querySelector(".ad-q-anot").textContent }));
  conf("sem caso e com anotações do To Do, a ficha abre na Análise de Direito", v.sub === "direito" && v.menu.some(x => /^Análise de Direito/.test(x)));
  conf("a anotação do To Do aparece ali, com quem e quando", /carteira de trabalho/.test(v.feed) && /Amanda/.test(v.feed));
  await p.fill("#ad-anot", "Ligou perguntando do BPC; explicado o prazo.");
  const req = p.waitForRequest(r => r.method() === "PATCH" && /clientes/.test(r.url()));
  await p.click(".ad-q-anot button.btn-mini");
  const corpo = JSON.parse((await req).postData() || "{}");
  conf("anotar por ali grava em clientes.campos.atendimento, preservando a antiga",
    corpo.campos.atendimento.length === 2 && corpo.campos.atendimento[0].id === "n1" && /BPC/.test(corpo.campos.atendimento[1].texto));
  await p.waitForTimeout(300);
  conf("e a nova anotação aparece na lista", /explicado o prazo/.test(await p.textContent(".ad-q-anot")));

  // caso legado na fase Escritório: os andamentos dele também aparecem ali
  await p.evaluate(cli => abrirFicha(cli).then(() => { const k = D.casos.find(x => x.cliente_id === cli); k.fase = "escritorio";
    D._andsFicha = [{ id: "a-escr", caso_id: k.id, texto: "Aguardando o PPP da empresa.", criado_em: "2026-09-25T12:00:00Z", autor_id: null }];
    abaAtiva = 0; subCad = "direito"; repintarFicha(); }), CLI_CHEIO);
  await p.waitForSelector(".ad-q-anot");
  conf("caso na fase Escritório: os andamentos dele entram nas Anotações da Análise", /Aguardando o PPP/.test(await p.textContent(".ad-q-anot")));
  // F173 · a versão antiga do bloco do To Do (começo da nova) não se repete
  const sem = await p.evaluate(() => notasSemRepeticao([
    { id: "a", em: "2026-09-28T12:00:00-03:00", quem: "P", texto: "56 anos.\n12 anos de contribuição." },
    { id: "b", em: "2026-09-28T12:00:00-03:00", quem: "P", texto: "56 anos.\n12 anos de contribuição.\nFalta relatório médico." },
    { id: "c", em: "2026-09-29T12:00:00-03:00", quem: "P", texto: "56 anos." },
    { id: "d", em: "2026-09-28T12:00:00-03:00", quem: "A", texto: "56 anos." }]).map(n => n.id).join(","));
  conf("F173 · a anotação cortada some e a completa fica; outro dia ou outro autor não somem", sem === "b,c,d");
  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
