// F16 — desempenho das telas. Este teste mede o que o olho sente como travada.
//
// A auditoria de layout começou pelas cores e terminou aqui: a maior queixa
// de uso do CRM não é uma cor, é ☀️ Meu Dia levar 1,6 s congelado para pintar
// cinco linhas. O culpado é uma função de uma linha, `hoje()`, chamada 5.790
// vezes num filtro só.
//
// Com dados de escritório de verdade (1.915 clientes, 3.094 casos, 7.657
// tarefas) a conta era 909 ms num `filter`. Aqui a massa é sintética e do
// mesmo tamanho, para o número ter significado.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

// massa fictícia do tamanho do acervo real
const N_TAR = 7000;
FIX.tarefas = Array.from({ length: N_TAR }, (_, i) => ({
  id: "tf" + i, texto: "tarefa " + i, concluida: i % 4 === 0,
  prazo: "2026-08-" + String((i % 28) + 1).padStart(2, "0"), colaborador_id: null }));

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
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (rota.request().method() !== "GET") return rota.fulfill({ status: 204, body: "" });
    // `todas()` pagina de mil em mil e só para quando a página vem incompleta.
    // Devolver as 7.000 linhas em TODA página deixa o app carregando para
    // sempre — o Range precisa ser respeitado, como o PostgREST faz.
    const corpo = FIX[t] || [];
    const rg = (rota.request().headers()["range"] || "").match(/^(\d+)-(\d+)$/);
    const pag = rg ? corpo.slice(+rg[1], +rg[2] + 1) : corpo;
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(pag) });
  });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error") erros.push("console: " + m.text()); });
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  // com 7.000 tarefas o `todas()` faz oito idas ao servidor: a classe .logado
  // aparece antes de D existir, e medir render() nesse meio dá erro, não tempo
  // `D` é `let` no escopo do script: NÃO existe como `window.D`. Testar
  // `window.D` aqui dá sempre falso e o teste espera para sempre por dado
  // que já chegou. (Sexta vez que o vermelho era o teste, não o programa.)
  await p.waitForFunction(() => typeof D !== "undefined"
    && Array.isArray(D.meudia) && Array.isArray(D.tarefas) && D.tarefas.length > 0,
    null, { timeout: 40000 });
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  conf(`a massa de teste chegou inteira (${await p.evaluate(() => D.tarefas.length)} tarefas)`,
    (await p.evaluate(() => D.tarefas.length)) === 7000);

  // ── 1. hoje() deixou de refazer a conta a cada chamada ──────────────────
  const custo = await p.evaluate(() => {
    const a = performance.now(); for (let i = 0; i < 20000; i++) hoje();
    return +((performance.now() - a) / 20000).toFixed(5);
  });
  conf(`hoje() custa menos de 0,001 ms por chamada (${custo} ms)`, custo < 0.001);
  conf("e continua devolvendo a data de Brasília no formato do banco",
    /^\d{4}-\d{2}-\d{2}$/.test(await p.evaluate(() => hoje())));
  conf("a data guardada é a mesma que o cálculo direto",
    (await p.evaluate(() => hoje()))
    === (await p.evaluate(() => new Date().toLocaleDateString("sv", { timeZone: FUSO }))));

  // ── 2. as telas que travavam ────────────────────────────────────────────
  const tempo = await p.evaluate(() => {
    const med = v => { const t = []; for (let i = 0; i < 3; i++) {
      const a = performance.now(); visao = v; render(); t.push(performance.now() - a); }
      return Math.round(Math.min(...t)); };
    const r = { meudia: med("meudia"), lateral: (() => { const t = [];
      for (let i = 0; i < 3; i++) { const a = performance.now(); montarSidebar(); t.push(performance.now() - a); }
      return Math.round(Math.min(...t)); })() };
    visao = "meudia"; render();
    return r;
  });
  conf(`☀️ Meu Dia pinta em menos de 300 ms (${tempo.meudia} ms — era 1.601)`, tempo.meudia < 300);
  conf(`a lateral monta em menos de 300 ms (${tempo.lateral} ms — era 1.206)`, tempo.lateral < 300);

  const qmd = await p.evaluate(() => { const a = performance.now(); const n = quantosNoMeuDia();
    return { ms: Math.round(performance.now() - a), n }; });
  conf(`quantosNoMeuDia responde em menos de 100 ms (${qmd.ms} ms — era 1.138)`, qmd.ms < 100);
  conf(`e continua contando (${qmd.n})`, typeof qmd.n === "number" && qmd.n >= 0);

  // ── 3. a fase fora da lista não derruba mais a tela ─────────────────────
  const pag = await p.evaluate(() => {
    try { visao = "fase:pagamento"; render();
      return { ok: true, titulo: (document.getElementById("titulo-lista") || {}).innerText || "" }; }
    catch (e) { return { ok: false, erro: e.message }; }
    finally { visao = "meudia"; render(); }
  });
  conf(`fase:pagamento não derruba a tela (${pag.ok ? JSON.stringify(pag.titulo.trim()) : pag.erro})`, pag.ok);
  conf("e mostra o nome da fase, não a chave crua", pag.ok && /Pagamento/i.test(pag.titulo));

  console.log("=== desempenho (F16) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
