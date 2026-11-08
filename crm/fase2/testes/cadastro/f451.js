// F451 · Paleta Ctrl+K e atalhos de uma tecla (proposta 7 do Todoist, aprovada pelo Paulo em 08.11.2026): Ctrl+K abre a paleta
// com listas, ações e clientes; N abre a anotação rápida; G e D vão ao Meu Dia; G e P ao Planejado; nada disso no celular.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
FIX.clientes.push({ id: "c4510000-0000-0000-0000-000000000001", nome: "Cliente Fictício da Paleta", cpf: "45100000001", dn: "01011960", campos: {} });

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
  const tecla = async k => { await p.locator("body").click({ position: { x: 700, y: 5 } }).catch(() => {}); await p.keyboard.press(k); await p.waitForTimeout(250); };
  await p.evaluate(() => { document.activeElement && document.activeElement.blur(); });
  await p.keyboard.press("Control+k"); await p.waitForTimeout(250);
  conf("Ctrl+K abre a paleta", await p.locator("#paleta").count() === 1);
  conf("o campo da paleta fica em foco", await p.evaluate(() => document.activeElement === document.querySelector("#paleta input")));
  conf("a paleta lista ações e listas", await p.locator('#paleta li:has-text("Anotação rápida")').count() === 1 && await p.locator('#paleta li .pal-t:text-is("Lista")').count() > 0);
  await p.keyboard.type("planej"); await p.waitForTimeout(150);
  conf("escrever filtra a paleta", await p.locator('#paleta li.pal-on:has-text("Planejado")').count() === 1);
  await p.keyboard.press("Enter"); await p.waitForTimeout(300);
  conf("Enter abre a lista escolhida e fecha a paleta", await p.evaluate(() => visao === "planejado") && await p.locator("#paleta").count() === 0);
  await p.keyboard.press("Control+k"); await p.keyboard.type("Paleta"); await p.waitForTimeout(150);
  conf("a paleta acha o cliente pelo nome", await p.locator('#paleta li:has-text("Cliente Fictício da Paleta") .pal-t:text-is("Cliente")').count() === 1);
  await p.keyboard.press("Escape"); await p.waitForTimeout(150);
  conf("Esc fecha a paleta sem fechar mais nada", await p.locator("#paleta").count() === 0);
  await p.keyboard.press("Control+k"); await p.keyboard.type("45100000"); await p.waitForTimeout(150);
  conf("a paleta acha o cliente pelo CPF", await p.locator('#paleta li:has-text("Cliente Fictício da Paleta")').count() === 1);
  await p.keyboard.press("Enter"); await p.waitForTimeout(800);
  conf("Enter abre a ficha do cliente", await p.evaluate(() => clienteAberto === "c4510000-0000-0000-0000-000000000001"));
  await p.evaluate(() => document.activeElement && document.activeElement.blur());
  await p.keyboard.press("n"); await p.waitForTimeout(300);
  conf("N com a ficha aberta abre a anotação rápida do cliente", await p.locator('#modal #ar-busca').count() === 1 && await p.evaluate(() => (arCliSel && arCliSel.id || arCliSel) === "c4510000-0000-0000-0000-000000000001"));
  await p.evaluate(() => fecharCaixa()); await p.evaluate(() => fecharFicha()); await p.waitForTimeout(200);
  await p.evaluate(() => { irPara("minhas"); document.activeElement && document.activeElement.blur(); });
  await p.keyboard.press("g"); await p.keyboard.press("d"); await p.waitForTimeout(300);
  conf("G e D vão ao Meu Dia", await p.evaluate(() => visao === "meudia"));
  await p.keyboard.press("g"); await p.keyboard.press("p"); await p.waitForTimeout(300);
  conf("G e P vão ao Planejado", await p.evaluate(() => visao === "planejado"));
  await p.evaluate(() => { irPara("minhas"); document.getElementById("busca").focus(); });
  await p.keyboard.press("g"); await p.keyboard.press("d"); await p.waitForTimeout(200);
  conf("dentro de um campo G e D são texto", await p.evaluate(() => visao === "minhas"));
  await p.evaluate(() => { document.getElementById("busca").value = ""; document.activeElement.blur(); janelaAtalhos(); });
  conf("a lista de atalhos traz Ctrl+K e G e D", await p.locator('#modal .atalhos:has-text("Ctrl+K"):has-text("G e D")').count() === 1);
  await p.evaluate(() => { fecharCaixa(); ajuda("atalhos"); });
  conf("a ajuda tem o assunto Atalhos de teclado", await p.locator('#modal:has-text("Ctrl+K abre a paleta")').count() === 1);
  await p.evaluate(() => fecharCaixa());
  await p.setViewportSize({ width: 390, height: 800 }); await p.waitForTimeout(400);
  await p.evaluate(() => document.activeElement && document.activeElement.blur());
  await p.keyboard.press("Control+k"); await p.waitForTimeout(200);
  conf("no celular Ctrl+K não abre a paleta", await p.locator("#paleta").count() === 0);

  console.log("=== F451 · Paleta Ctrl+K e atalhos ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length + erros.length;
  console.log(`${ok.length - ok.filter(x => !x[1]).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
