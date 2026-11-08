// F450 · Arrastar para outro dia no Planejado (proposta 6 do Todoist, aprovada pelo Paulo em 08.11.2026): no Mês, o retorno e
// a tarefa pessoal mudam de data ao soltar noutro dia; o prazo fatal não muda e abre a janela do prazo. Fixturas do harmonia138.js.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const d0 = new Date(); d0.setMonth(d0.getMonth() + 1);
const MES = d0.toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" }).slice(0, 7), dia = n => `${MES}-${String(n).padStart(2, "0")}`;
const RET = "b4500000-0000-0000-0000-000000000001", FAT = "b4500000-0000-0000-0000-000000000002";
FIX.clientes.push({ id: "c4500000-0000-0000-0000-000000000001", nome: "Cliente Fictício do Retorno", cpf: "45000000001", dn: "01011960", campos: {} },
  { id: "c4500000-0000-0000-0000-000000000002", nome: "Cliente Fictício do Prazo Fatal", cpf: "45000000002", dn: "01011960", campos: {} });
FIX.casos.push({ id: RET, cliente_id: "c4500000-0000-0000-0000-000000000001", titulo: "Pensão", especie: "B21", fase: "judicial",
  origem_lista: "👪 Judicial", prazo: dia(10), criado_em: "2026-01-01T00:00:00Z" },
  { id: FAT, cliente_id: "c4500000-0000-0000-0000-000000000002", titulo: "Recurso", especie: "B31", fase: "outro",
  origem_lista: "🗓 Tarefas com Prazo", mover_para: "🗓 Tarefas com Prazo", prazo: dia(12), criado_em: "2026-01-01T00:00:00Z" });
FIX.tarefas = [{ id: "t-f450", titulo: "Tarefa pessoal fictícia", concluida: false, particular_de: FIX.colaboradores[0].id,
  prazo: dia(11), criado_em: "2026-09-01T00:00:00Z" }];

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
  await p.evaluate(m => { calMes = m; calVisao = "mes"; visao = "calendario"; render(); }, MES);
  await p.waitForTimeout(300);
  const it = t => p.locator(`.cal-dia[data-dia] .cal-it:has-text("${t}")`).first();
  conf("o retorno se arrasta", await it("Cliente Fictício do Retorno").getAttribute("draggable") === "true");
  conf("a tarefa pessoal se arrasta", await it("Tarefa pessoal fictícia").getAttribute("draggable") === "true");
  conf("o prazo fatal se arrasta (para abrir a janela)", await it("Cliente Fictício do Prazo Fatal").getAttribute("draggable") === "true");
  conf("o título explica o arrasto", /arraste a outro dia/.test(await it("Cliente Fictício do Retorno").getAttribute("title")));
  await it("Cliente Fictício do Retorno").dragTo(p.locator(`.cal-dia[data-dia="${dia(20)}"]`)); await p.waitForTimeout(500);
  conf("o retorno gravou o dia em que foi solto", patches.some(([u, b]) => u.includes(RET) && b.includes(`"prazo":"${dia(20)}"`)));
  conf("o retorno aparece no dia novo", await p.locator(`.cal-dia[data-dia="${dia(20)}"] .cal-it:has-text("Cliente Fictício do Retorno")`).count() === 1);
  conf("o aviso tem desfazer", await p.locator("#aviso .aviso-bt").count() === 1);
  const n0 = patches.length;
  await p.locator("#aviso .aviso-bt").click(); await p.waitForTimeout(500);
  conf("desfazer devolve a data", patches.length > n0 && await p.evaluate(([id, d]) => D.casoPorId.get(id).prazo === d, [RET, dia(10)]));
  await it("Tarefa pessoal fictícia").dragTo(p.locator(`.cal-dia[data-dia="${dia(21)}"]`)); await p.waitForTimeout(500);
  conf("a tarefa pessoal gravou o dia novo", patches.some(([u, b]) => /tarefas\?id=eq\.t-f450/.test(u) && b.includes(dia(21))));
  const n1 = patches.length;
  await it("Cliente Fictício do Prazo Fatal").dragTo(p.locator(`.cal-dia[data-dia="${dia(22)}"]`)); await p.waitForTimeout(1200);
  conf("o prazo fatal não foi gravado", !patches.slice(n1).some(([u]) => u.includes(FAT)));
  conf("o prazo fatal abriu a ficha na aba Prazos", await p.evaluate(() => clienteAberto === "c4500000-0000-0000-0000-000000000002" && abaAtiva === 5));
  conf("a janela do prazo abriu", await p.locator("#painel-prazo.aberto").count() === 1);
  await p.screenshot({ path: "f450.png" });

  console.log("=== F450 · Arrastar para outro dia no Planejado ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length + erros.length;
  console.log(`${ok.length - ok.filter(x => !x[1]).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
