// F441 · Reagendar os vencidos de uma vez (proposta 1 do Todoist, aprovada pelo Paulo em 08.11.2026): o cabeçalho das
// Vencidas leva retornos, voltas à fila e tarefas pessoais a outra data; prazo fatal fica. Fixturas do harmonia138.js.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const dia = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" }); };
FIX.casos[0].prazo = dia(-3);
const RET = "b4410000-0000-0000-0000-000000000001", FAT = "b4410000-0000-0000-0000-000000000002";
FIX.clientes.push({ id: "c4410000-0000-0000-0000-000000000001", nome: "Cliente Fictício do Retorno", cpf: "44100000001", dn: "01011960", campos: {} },
  { id: "c4410000-0000-0000-0000-000000000002", nome: "Cliente Fictício do Prazo Fatal", cpf: "44100000002", dn: "01011960", campos: {} });
FIX.casos.push({ id: RET, cliente_id: "c4410000-0000-0000-0000-000000000001", titulo: "Pensão", especie: "B21", fase: "judicial",
  origem_lista: "👪 Judicial", prazo: dia(-5), criado_em: "2026-01-01T00:00:00Z" },
  { id: FAT, cliente_id: "c4410000-0000-0000-0000-000000000002", titulo: "Recurso", especie: "B31", fase: "outro",
  origem_lista: "🗓 Tarefas com Prazo", mover_para: "🗓 Tarefas com Prazo", prazo: dia(-4), criado_em: "2026-01-01T00:00:00Z" });
FIX.tarefas = [{ id: "t-f441", titulo: "Tarefa pessoal fictícia", concluida: false, particular_de: FIX.colaboradores[0].id,
  prazo: dia(-2), criado_em: "2026-09-01T00:00:00Z" }];

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const erros = [], patches = [];
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const q = rota.request(), u = q.url();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (q.method() === "PATCH") { patches.push([u, q.postData()]); return rota.fulfill({ status: 200, contentType: "application/json", body: "[]" }); }
    if (q.method() !== "GET") return rota.fulfill({ status: 204, body: "" });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  const p = await ctx.newPage();
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await p.evaluate(() => { filtroPlanColab = null; filtroPlanNat = ""; visao = "planejado"; render(); });
  await p.waitForTimeout(300);
  const bt = p.locator('section.pl-grupo[data-tom="venc"] .reag-bt');
  conf("o cabeçalho das Vencidas tem o botão Reagendar", await bt.count() === 1);
  conf("o botão diz uma palavra", (await bt.locator('[aria-hidden="true"]').textContent()) === "Reagendar");
  const reag = await p.evaluate(() => _reagVenc.filter(reagendavel).map(i => i.k ? i.k.id : i.t ? i.t.id : "tc"));
  conf(`o retorno e a tarefa pessoal são reagendáveis (${reag})`, reag.includes("b4410000-0000-0000-0000-000000000001") && reag.includes("t-f441"));
  conf("o prazo fatal não é reagendável", !reag.includes("b4410000-0000-0000-0000-000000000002"));
  await bt.click(); await p.waitForTimeout(200);
  const txt = await p.evaluate(() => document.querySelector(".modal-fundo, #caixa")?.innerText || document.body.innerText);
  conf("a janela diz quantos ficam", /ficam?\b/.test(txt) && /prazo fatal/.test(txt));
  await p.screenshot({ path: "f441-janela.png" });
  const amanha = await p.evaluate(() => proxDiaUtil(somaDias(hoje(), 1)));
  await p.locator('button.esp-it:has-text("Amanhã")').click(); await p.waitForTimeout(500);
  const pc = patches.filter(([u]) => /casos\?id=eq\.b4410000-0000-0000-0000-000000000001/.test(u));
  conf("o retorno gravou a data nova", pc.some(([, b]) => b.includes(`"prazo":"${amanha}"`)));
  conf("o prazo fatal não foi gravado", !patches.some(([u]) => u.includes(FAT)));
  conf("a tarefa pessoal gravou a data nova", patches.some(([u, b]) => /tarefas\?id=eq\.t-f441/.test(u) && b.includes(amanha)));
  conf("as Vencidas ficaram só com o que pede registro", await p.evaluate(() => !_reagVenc.some(reagendavel)));
  conf("o aviso tem desfazer", await p.locator("#aviso .aviso-bt").count() === 1);
  const n0 = patches.length;
  await p.locator("#aviso .aviso-bt").click(); await p.waitForTimeout(500);
  conf("desfazer devolve as datas", patches.length > n0 && await p.evaluate(d => D.casoPorId.get("b4410000-0000-0000-0000-000000000001").prazo !== d, amanha));
  await p.evaluate(() => { visao = "meudia"; render(); }); await p.waitForTimeout(300);
  conf("o Meu Dia também tem o Reagendar", await p.locator('section.pl-grupo[data-tom="venc"] .reag-bt').count() === 1);

  console.log("=== F441 · Reagendar os vencidos ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length + erros.length;
  console.log(`${ok.length - ok.filter(x => !x[1]).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
