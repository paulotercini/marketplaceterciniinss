// F135 · os ajustes do teste de 26.09.2026: a abertura busca as páginas em
// paralelo, o Planejado mostra 50 por seção com "mostrar mais", a confirmação
// é um <dialog> dentro da página e o Registrar responde no clique.
// Datas RELATIVAS e bem longe de hoje (a suíte já apodreceu com data fixa).
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const dia = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

// 2.600 tarefas: 3 páginas de 1.000; 120 delas vencidas, para o Planejado
FIX.tarefas = [];
for (let i = 0; i < 2600; i++)
  FIX.tarefas.push({ id: `a0000000-0000-0000-0000-${String(i).padStart(12, "0")}`, cliente_id: CLI_CHEIO,
    caso_id: CASO1, titulo: `Tarefa fictícia ${i}`, prazo: i < 120 ? dia(-20) : null,
    concluida: i >= 120, concluida_em: null, particular_de: null, criado_em: "2026-01-01T00:00:00Z" });

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
  }, [SUPA, SESSAO]);
  let noAr = 0, picoTarefas = 0, reqTarefas = 0; const postsAnd = [];
  await ctx.route(SUPA + "/**", async rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      if (t === "andamentos") { postsAnd.push(Date.now()); await new Promise(r => setTimeout(r, 400)); }
      const c = JSON.parse(rota.request().postData() || "{}");
      return rota.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify([{ id: "n1", ...c }]) });
    }
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    const rg = (rota.request().headers()["range"] || "").match(/(\d+)-(\d+)/);
    if (t === "tarefas") { reqTarefas++; noAr++; picoTarefas = Math.max(picoTarefas, noAr);
      await new Promise(r => setTimeout(r, 150)); noAr--; }
    if (rg) {
      if (+rg[1] >= corpo.length && +rg[1] > 0) return rota.fulfill({ status: 416, contentType: "application/json", body: "{}" });
      corpo = corpo.slice(+rg[1], +rg[2] + 1);
    }
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);

  // 1) abertura: as 2.600 tarefas chegam inteiras, com páginas em paralelo
  conf(`as 2.600 tarefas carregam inteiras (${await p.evaluate(() => D.tarefas.length)})`,
    await p.evaluate(() => D.tarefas.length) === 2600);
  conf(`as páginas de tarefas saem em paralelo (pico ${picoTarefas}, ${reqTarefas} pedidos)`, picoTarefas >= 2);

  // 2) Planejado: 50 por seção e "mostrar mais"
  await p.locator('[data-v="planejado"]').first().click(); await p.waitForTimeout(300);
  const antes = await p.evaluate(() => document.querySelectorAll("#conteudo-meio .mais-plan").length);
  const cartoes = () => p.evaluate(() => [...document.querySelectorAll("#conteudo-meio h3.secao")]
    .find(h => /Vencidas/.test(h.textContent)) ? document.querySelectorAll("#conteudo-meio [data-tid], #conteudo-meio .cartao").length : 0);
  conf("a seção das vencidas mostra o botão Mostrar mais", antes >= 1);
  const texto = await p.evaluate(() => (document.querySelector(".mais-plan") || {}).textContent || "");
  conf(`o botão diz quantas faltam (${texto.trim()})`, /Mostrar mais \d+ de \d+/.test(texto));
  await p.click(".mais-plan"); await p.waitForTimeout(300);
  conf("clicado, as restantes aparecem e o botão some", await p.evaluate(() => !document.querySelector(".mais-plan")));

  // 3) confirmação dentro da página
  await p.evaluate(() => { window.__confirmarProprio = true; window.__r = null;
    confirmar("Apagar este seu comentário?").then(v => window.__r = v); });
  await p.waitForSelector("dialog.confirmar[open]");
  conf("a pergunta abre num <dialog> da página", true);
  conf("o botão diz o verbo da pergunta (Apagar)", await p.evaluate(() =>
    document.querySelector("dialog.confirmar button[value=sim]").textContent.trim() === "Apagar"));
  conf("e é vermelho, porque apagar é destrutivo", await p.evaluate(() =>
    document.querySelector("dialog.confirmar button[value=sim]").classList.contains("perigo")));
  await p.keyboard.press("Escape"); await p.waitForTimeout(250);
  conf("Esc desiste e devolve não", await p.evaluate(() => window.__r === false && !document.querySelector("dialog.confirmar")));
  await p.evaluate(() => { confirmar("Reabrir o caso?").then(v => window.__r = v); });
  await p.click("dialog.confirmar button[value=sim]"); await p.waitForTimeout(250);
  conf("o botão do verbo confirma e devolve sim", await p.evaluate(() => window.__r === true));

  // 4) Registrar responde no clique e não aceita o segundo
  await p.evaluate(() => { try { fecharCaixa(); } catch (e) {} });
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO); await p.waitForTimeout(900);
  await p.fill("#and-texto", "Prova do registrar sem clique duplo");
  await p.evaluate(() => { try { tfQuem = []; tfData = null; } catch (e) {} });
  const estado = await p.evaluate(caso => {
    const pr = novoAndamento(caso), pr2 = novoAndamento(caso);
    const b = document.querySelector('.escrever button[onclick^="novoAndamento"]');
    return Promise.all([pr, pr2]).then(() => null) && (b ? { env: b.classList.contains("enviando"), dis: b.disabled } : null);
  }, CASO1);
  conf("no clique o botão entra em enviando e trava", estado && estado.env && estado.dis);
  await p.waitForTimeout(1200);
  conf(`um clique duplo grava um andamento só (${postsAnd.length})`, postsAnd.length === 1);

  console.log("=== F135 · abertura em paralelo, Planejado em lotes, confirmação e registrar ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
