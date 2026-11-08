// F443 · Seleção múltipla nas listas (proposta 2 do Todoist, aprovada pelo Paulo em 08.11.2026): Shift+clique marca as
// linhas, a barra do pé traz Concluir, Passar, Estrela e Data, e o lote nunca alcança o prazo fatal.
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
  origem_lista: "🗓 Tarefas com Prazo", mover_para: "🗓 Tarefas com Prazo", prazo: dia(3), criado_em: "2026-01-01T00:00:00Z" });
FIX.colaboradores.push({ ...FIX.colaboradores[0], id: "e4430000-0000-0000-0000-000000000001", nome: "Meissa Fictícia", inicial: "M", papel: "colaborador", cargo: "recepcao", user_id: "u-f443" });
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
  const erros = [], patches = [], posts = [];
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
    if (q.method() === "POST") posts.push([u, q.postData() || ""]);
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
  const linha = id => p.locator(`.cartao.ag-linha[data-casos="${id}"]`).first();
  await linha(RET).click({ modifiers: ["Shift"] });
  await linha(FAT).click({ modifiers: ["Shift"] });
  conf("o Shift+clique marca as linhas", await p.locator(".cartao.sel").count() === 2);
  conf("o Shift+clique não abre a ficha", await p.evaluate(() => !clienteAberto));
  const barra = p.locator("#sel-barra");
  conf("a barra diz quantas estão selecionadas", /2 selecionadas/.test(await barra.innerText()));
  const rot = await barra.locator('button [aria-hidden="true"]').allTextContents();
  conf(`a barra tem Concluir, Passar, Estrela e Data, uma palavra cada (${rot})`, rot.join(",") === "Concluir,Passar,Estrela,Data");
  await p.screenshot({ path: "f443-barra.png" });
  await p.evaluate(() => render()); await p.waitForTimeout(200);
  conf("a seleção sobrevive ao render", await p.locator(".cartao.sel").count() === 2);
  // Estrela
  await barra.locator('button:has-text("Estrela")').first().click(); await p.waitForTimeout(400);
  conf("Estrela marca os dois casos", [RET, FAT].every(id => patches.some(([u, b]) => u.includes(id) && b.includes('"importante":true'))));
  conf("a ação limpa a seleção", await p.locator("#sel-barra").count() === 0);
  await p.locator("#aviso .aviso-bt").click(); await p.waitForTimeout(400);
  conf("desfazer da Estrela desmarca", await p.evaluate(ids => ids.every(id => !D.casoPorId.get(id).importante), [RET, FAT]));
  // Concluir: o prazo fatal em 3 dias fica, o retorno volta em 15 dias
  await linha(RET).click({ modifiers: ["Shift"] }); await linha(FAT).click({ modifiers: ["Shift"] });
  await p.locator('#sel-barra button:has-text("Concluir")').first().click(); await p.waitForTimeout(200);
  conf("Concluir abre a janela da volta para os 2 casos", /2 casos/.test(await p.locator("#modal").innerText()));
  const d15 = await p.evaluate(() => somaDias(hoje(), 15));
  await p.locator('.desp-datas button:has-text("Em 15 dias")').click();
  await p.locator("#desp-ok").click(); await p.waitForTimeout(600);
  conf("o retorno volta em 15 dias", patches.some(([u, b]) => u.includes(RET) && b.includes(`"prazo":"${d15}"`)));
  conf("o caso com prazo fatal antes da volta não foi tocado", !patches.some(([u, b]) => u.includes(FAT) && b.includes(`"prazo":"${d15}"`)));
  conf("o aviso diz que o prazo fatal ficou", /1 com prazo fatal antes da volta ficou/.test(await p.locator("#aviso").innerText()));
  await p.locator("#aviso .aviso-bt").click(); await p.waitForTimeout(500);
  conf("desfazer do Concluir devolve a data", await p.evaluate(([id, d]) => D.casoPorId.get(id).prazo !== d, [RET, d15]));
  // Passar
  await p.evaluate(() => render()); await p.waitForTimeout(200);
  await linha(RET).click({ modifiers: ["Shift"] });
  await p.locator('#sel-barra button:has-text("Passar")').first().click(); await p.waitForTimeout(200);
  const nPost = posts.length;
  await p.locator("#modal .desp-quem button").first().click(); await p.waitForTimeout(500);
  conf("Passar cria a atribuição e a menção", posts.slice(nPost).some(([u]) => /atribuicoes/.test(u)) && posts.slice(nPost).some(([u, b]) => /mencoes/.test(u) && b.includes("passou a você")));
  // Data numa lista de fase (cartão do cliente), pelo menu do botão direito
  await p.evaluate(() => { filtroColab = null; visao = "fase:judicial"; render(); }); await p.waitForTimeout(300);
  const card = p.locator(`.cartao[data-casos*="${RET}"]`).first();
  await card.click({ button: "right" }); await p.waitForTimeout(150);
  conf("o menu do botão direito oferece Selecionar", await p.locator('#menu-mover [data-selecionar]').count() === 1);
  await p.locator('#menu-mover [data-selecionar]').click(); await p.waitForTimeout(150);
  conf("Selecionar pelo menu marca o cartão", await p.locator(".cartao.sel").count() === 1);
  await p.locator('#sel-barra button:has-text("Data")').first().click(); await p.waitForTimeout(200);
  conf("Data abre a janela da nova data", /Nova data para 1 item/.test(await p.locator("#modal").innerText()));
  await p.keyboard.press("Escape"); await p.evaluate(() => fecharCaixa()); await p.waitForTimeout(100);
  await p.keyboard.press("Escape"); await p.waitForTimeout(100);
  conf("Esc limpa a seleção", await p.locator("#sel-barra").count() === 0);
  await card.click(); await p.waitForTimeout(400);
  conf("o clique simples continua abrindo a ficha", await p.evaluate(() => !!clienteAberto));

  console.log("=== F443 · Seleção múltipla ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length + erros.length;
  console.log(`${ok.length - ok.filter(x => !x[1]).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
