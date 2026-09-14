// F92 — O CATÁLOGO DE PRAZOS. A data fatal deixa de ser digitada: o prazo é
// escolhido pelo nome e contado a partir da intimação, em dias úteis (com
// feriados nacionais e recesso forense) ou corridos (com prorrogação do
// vencimento), e o carimbo da anotação passa a dizer de que é o prazo.
//
// As contas são conferidas em datas FIXAS de propósito: são aritmética de
// calendário, não estado do sistema — só o fluxo do modal usa uma intimação
// futura, para nunca cair no "já venceu".
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

(async () => {
  const escritos = [];
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
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      const corpo = rota.request().postData() || "";
      escritos.push({ t, m, corpo });
      return rota.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify([{ ...(JSON.parse(corpo || "{}")), id: "x" + escritos.length }]) });
    }
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error" && !/ERR_FAILED/.test(m.text())) erros.push("console: " + m.text()); });
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);

  // ── a aritmética do calendário ──────────────────────────────────────────
  const c = await p.evaluate(() => {
    const it = id => PRAZOS_CATALOGO.find(x => x.id === id);
    D.config.set("feriados_extra", "09/07, 15/08/2026");
    return {
      pascoa26: pascoa(2026), pascoa27: pascoa(2027), pascoa25: pascoa(2025),
      carnaval: ehFeriado("2026-02-17"), sextaSanta: ehFeriado("2026-04-03"),
      corpus: ehFeriado("2026-06-04"), consciencia: ehFeriado("2026-11-20"), comum: ehFeriado("2026-09-14"),
      extraTodoAno: ehFeriado("2027-07-09"), extraAno: ehFeriado("2026-08-15"), extraOutroAno: ehFeriado("2027-08-15"),
      cincoUteis: contarPrazo("2026-09-11", it("ed")),          // sexta → 5 úteis → sexta 18/09
      recesso: contarPrazo("2026-12-15", it("ed")),             // atravessa 20/12–20/01
      feriadoNoMeio: contarPrazo("2026-04-01", it("ed")),       // pula a sexta-feira santa
      corridos: contarPrazo("2026-09-04", it("crps")),          // 04/10 é domingo → 05/10
      decadencial: contarPrazo("2026-09-04", { n: 30, uteis: false, dec: true }),   // → 02/10, antecipa
      ms120: contarPrazo("2026-05-04", it("ms")),               // 01/09/2026 é terça
      inominado: contarPrazo("2027-03-01", it("ri")),
    };
  });
  conf("a Páscoa sai certa em três anos (05/04/2026, 28/03/2027, 20/04/2025)",
    c.pascoa26 === "2026-04-05" && c.pascoa27 === "2027-03-28" && c.pascoa25 === "2025-04-20");
  conf("carnaval, sexta-feira santa e corpus christi de 2026 são feriados", c.carnaval && c.sextaSanta && c.corpus);
  conf("20/11 é feriado nacional e 14/09 não é", c.consciencia && !c.comum);
  conf("feriado local dd/mm vale todo ano; dd/mm/aaaa só naquele ano",
    c.extraTodoAno && c.extraAno && !c.extraOutroAno);
  conf("5 dias úteis da sexta 11/09 vencem na sexta 18/09", c.cincoUteis === "2026-09-18");
  conf("o recesso de 20/12 a 20/01 não conta (15/12 + 5 úteis → 22/01)", c.recesso === "2027-01-22");
  conf("a sexta-feira santa não conta (01/04 + 5 úteis → 09/04)", c.feriadoNoMeio === "2026-04-09");
  conf("30 corridos do CRPS caindo no domingo prorrogam para segunda (05/10)", c.corridos === "2026-10-05");
  conf("prazo decadencial no domingo ANTECIPA para sexta (02/10)", c.decadencial === "2026-10-02");
  conf("120 dias do MS a partir de 04/05 vencem em 01/09", c.ms120 === "2026-09-01");
  conf("10 dias úteis de 01/03/2027 vencem em 15/03/2027", c.inominado === "2027-03-15");

  // ── o compositor da ficha (F38): o catálogo só aparece com o ⏰ marcado ──
  // (antes do modal: o seguimento com prazo move o caso para 🗓 Tarefas com
  // Prazo, e aí o compositor troca o ⏰ pelo chip "em Tarefas com Prazo")
  await p.evaluate(([cli]) => abrirFicha(cli), [FIX.clientes[0].id]);
  await p.waitForSelector("#and-prazo-ck");
  const antes = await p.evaluate(() => getComputedStyle(document.getElementById("and-prazo-mais")).display);
  await p.evaluate(() => { const ck = document.getElementById("and-prazo-ck"); ck.checked = true; ck.dispatchEvent(new Event("change")); });
  await p.evaluate(() => {
    document.getElementById("and-de").value = "2027-03-01";
    const sel = document.getElementById("and-cat"); sel.value = "crps"; sel.dispatchEvent(new Event("change"));
  });
  const comp = await p.evaluate(() => ({
    depois: getComputedStyle(document.getElementById("and-prazo-mais")).display,
    data: document.getElementById("and-prazo-data").value }));
  conf("no compositor o catálogo fica escondido até marcar ⏰", antes === "none" && comp.depois !== "none");
  conf("recurso ao CRPS de 01/03/2027 → 30 corridos → 31/03/2027 no campo da data fatal", comp.data === "2027-03-31");

  // ── o modal 📌 dar seguimento: escolher pelo nome preenche a data ─────────
  await p.evaluate(([caso]) => { const i = segRegistrar(caso, "Sentença improcedente publicada.", null); abrirSeguimento(i); }, [CASO1]);
  await p.waitForSelector("#seg-cat");
  conf("o catálogo aparece ao lado do prazo fatal, com as 18 entradas",
    await p.evaluate(() => document.querySelectorAll("#seg-cat option").length === 19));
  await p.evaluate(() => {
    document.getElementById("seg-de").value = "2027-03-01";
    const sel = document.getElementById("seg-cat"); sel.value = "ri"; sel.dispatchEvent(new Event("change"));
  });
  const m = await p.evaluate(() => ({
    prazo: document.getElementById("seg-prazo").value,
    base: document.getElementById("seg-cat-base").textContent,
    frase: document.getElementById("seg-frase").textContent }));
  conf("recurso inominado intimado em 01/03/2027 → prazo fatal 15/03/2027", m.prazo === "2027-03-15");
  conf("a base legal aparece junto da conta", /art\. 42 da Lei 9\.099\/95/.test(m.base) && /15\.03\.2027/.test(m.base));
  conf("a frase-viva já anuncia o PRAZO FATAL", /PRAZO FATAL 15\.03\.2027/.test(m.frase));
  await p.evaluate(() => { document.getElementById("seg-txt").value = "Sentença improcedente."; });
  await p.evaluate(() => salvarSeguimento());
  await p.waitForTimeout(600);
  const and = escritos.filter(e => e.t === "andamentos").map(e => JSON.parse(e.corpo)).pop() || {};
  conf("a anotação nasce com o carimbo dizendo de que é o prazo e de onde a data saiu",
    (and.texto || "").startsWith("⏰ [PRAZO 15.03.2027] Recurso inominado (JEF) — 10 dias úteis (art. 42 da Lei 9.099/95), intimação de 01.03.2027. Sentença improcedente."));
  conf("e o caso vai para 🗓 Tarefas com Prazo com a data calculada",
    escritos.some(e => e.t === "casos" && e.m === "PATCH" && /"prazo":"2027-03-15"/.test(e.corpo)));

  // trocada a data à mão, o carimbo do catálogo NÃO entra (a data manda)
  await p.evaluate(([caso]) => { const i = segRegistrar(caso, "Outra intimação.", null); abrirSeguimento(i); }, [CASO1]);
  await p.waitForSelector("#seg-cat");
  await p.evaluate(() => {
    document.getElementById("seg-de").value = "2027-03-01";
    const sel = document.getElementById("seg-cat"); sel.value = "ri"; sel.dispatchEvent(new Event("change"));
    document.getElementById("seg-prazo").value = "2027-03-20";
    document.getElementById("seg-txt").value = "Prazo combinado à mão.";
  });
  await p.evaluate(() => salvarSeguimento());
  await p.waitForTimeout(600);
  const and2 = escritos.filter(e => e.t === "andamentos").map(e => JSON.parse(e.corpo)).pop() || {};
  conf("data trocada à mão depois do catálogo: carimbo só com a data, sem rótulo emprestado",
    (and2.texto || "") === "⏰ [PRAZO 20.03.2027] Prazo combinado à mão.");

  // ── Configurações: o campo dos feriados locais existe e guarda só datas ──
  await p.evaluate(() => { visao = "config"; render(); });
  await p.waitForSelector("#cf-feriados");
  await p.evaluate(() => { const el = document.getElementById("cf-feriados"); el.value = "09/07, lixo, 15/08/2026"; el.dispatchEvent(new Event("change")); });
  await p.waitForTimeout(300);
  conf("o campo de feriados locais grava só o que tem cara de data",
    escritos.some(e => e.t === "config_app" && /"feriados_extra"/.test(e.corpo) && /"09\/07, 15\/08\/2026"/.test(e.corpo)));

  for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
