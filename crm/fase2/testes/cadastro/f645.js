// F645 · O painel lateral do cliente (pedido do Paulo de 18.11.2026): o clique no nome abre o painel à direita, sem sair
// da lista, com os dados do cliente, a tarefa com atalhos e mês à vista, anexos, anotação e a última anotação.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const dia = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" }); };
const RET = "b4540000-0000-0000-0000-000000000001", FAT = "b4540000-0000-0000-0000-000000000002", AMANDA = "22222222-2222-2222-2222-222222222222";
FIX.colaboradores.push({ id: AMANDA, auth_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", nome: "Amanda Fictícia", inicial: "A", cor: "#c90", papel: "colaborador", ativo: true, cargo: "advogado" });
FIX.clientes.push({ id: "c4540000-0000-0000-0000-000000000001", nome: "Cliente Fictício do Retorno", cpf: "45400000001", dn: "01011960", campos: {} },
  { id: "c4540000-0000-0000-0000-000000000002", nome: "Cliente Fictício do Prazo Fatal", cpf: "45400000002", dn: "01011960", campos: {} });
FIX.casos.push({ id: RET, cliente_id: "c4540000-0000-0000-0000-000000000001", titulo: "Pensão", especie: "B21", fase: "judicial",
  origem_lista: "👪 Judicial", prazo: dia(-5), criado_em: "2026-01-01T00:00:00Z" },
  { id: FAT, cliente_id: "c4540000-0000-0000-0000-000000000002", titulo: "Recurso", especie: "B31", fase: "outro",
  origem_lista: "🗓 Tarefas com Prazo", mover_para: "🗓 Tarefas com Prazo", prazo: dia(-4), criado_em: "2026-01-01T00:00:00Z" });
FIX.atribuicoes.push({ caso_id: RET, colaborador_id: FIX.colaboradores[0].id });
FIX.andamentos = (FIX.andamentos || []).concat([{ id: "a454", caso_id: RET, autor_id: FIX.colaboradores[0].id, texto: "Anotação fictícia: aguardar a carta de concessão. " + "Conferir o andamento. ".repeat(50) + "FIM DA ANOTAÇÃO", criado_em: "2026-11-01T12:00:00Z" },
  { id: "a455", caso_id: FAT, autor_id: FIX.colaboradores[0].id, texto: Array.from({ length: 20 }, (_, i) => "Linha " + (i + 1) + " da anotação curta.").join("\n") + "\nFIM CURTO", criado_em: "2026-11-01T12:00:00Z" }]);

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const erros = [], patches = [], posts = [], dels = [];
  let n = 0;
  const abrir = async (largura) => {
    const ctx = await nav.newContext({ viewport: { width: largura, height: 900 } });
    await ctx.addInitScript(([u, ss]) => {
      localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
      localStorage.setItem("crm_sessao", JSON.stringify(ss));
      localStorage.setItem("crm_tema", "v10");
      localStorage.setItem("crm_ext_linha", "1");
    }, [SUPA, SESSAO]);
    await ctx.route(SUPA + "/**", rota => {
      const q = rota.request(), u = q.url();
      if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
      if (q.method() === "PATCH") { patches.push([u, q.postData()]); return rota.fulfill({ status: 200, contentType: "application/json", body: "[]" }); }
      if (q.method() === "DELETE") { dels.push(u); return rota.fulfill({ status: 204, body: "" }); }
      if (q.method() === "POST") { posts.push([u, q.postData()]); let b = {}; try { b = JSON.parse(q.postData() || "{}"); } catch (e) {}
        return rota.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify([{ id: "novo-" + (++n), criado_em: new Date().toISOString(), ...b }]) }); }
      const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
      let corpo = FIX[t] || [];
      const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
      if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
      const c = u.match(/caso_id=in\.\(([^)]+)\)/);
      if (c && t === "andamentos") corpo = corpo.filter(x => c[1].split(",").includes(x.caso_id));
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
    });
    const p = await ctx.newPage();
    p.on("pageerror", e => erros.push("pageerror: " + e.message));
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
    await p.waitForSelector("#app.logado");
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
    await p.evaluate(() => { filtroPlanColab = null; filtroPlanNat = ""; visao = "planejado"; render(); });
    await p.waitForTimeout(300);
    return { p, ctx };
  };
  const { p, ctx } = await abrir(1440);
  const linha = id => p.locator(`.cartao[data-casos="${id}"]`).first();
  await linha(RET).locator(".ag-txt b").click(); await p.waitForTimeout(400);
  const pc = p.locator("#pcli");
  conf("o nome abre o painel", await pc.count() === 1 && await pc.isVisible());
  conf("a lista continua à vista", await linha(RET).isVisible());
  conf("o clique no nome não estende a linha", await p.locator(".ag-ext").count() === 0);
  conf("nome, Abrir ficha e CPF", (await pc.textContent()).includes("Cliente Fictício do Retorno") && await pc.locator('[data-pc="ficha"]').count() >= 1 && (await pc.textContent()).includes("454.000.000-01"));
  conf("tarefa vencida em vermelho", await pc.locator(".pc-venc.venc").count() === 1);
  conf("cinco atalhos e o mês à vista", await pc.locator(".pc-dias .esp-it").count() === 5 && await pc.locator(".mcal").count() === 1);
  conf("última anotação", (await pc.locator(".pc-ult").textContent()).includes("aguardar a carta"));
  const alvo = await p.evaluate(() => { const d = new Date(hoje() + "T12:00:00"); d.setMonth(d.getMonth() + 1, 10); return d.toLocaleDateString("sv"); });
  await pc.locator('.mcal-nav[data-nav="1"]').click(); await p.waitForTimeout(100);
  await pc.locator(`button[data-d="${alvo}"]`).click(); await p.waitForTimeout(500);
  conf("um clique no dia reagenda", patches.some(([u, b]) => u.includes(RET) && b.includes(`"prazo":"${alvo}"`)));
  conf("o painel continua aberto depois de reagendar", await p.locator("#pcli").isVisible());
  await p.locator("#pcli .ae-nota").fill("Anotação fictícia pelo painel");
  await p.locator('#pcli [data-pc="anotar"]').click(); await p.waitForTimeout(400);
  conf("Anotar grava no caso", posts.some(([u, b]) => u.includes("/andamentos") && b.includes("pelo painel")));
  await p.screenshot({ path: "f645-painel.png" });
  await p.keyboard.press("Escape"); await p.waitForTimeout(100);
  conf("Esc fecha", await p.locator("#pcli").count() === 0);
  await linha(RET).locator(".ag-data").click(); await p.waitForTimeout(300);
  conf("o resto da linha ainda estende", await p.locator(".ag-ext").count() === 1);
  await ctx.close();
  const c2 = await abrir(390);
  await c2.p.locator(`.cartao[data-casos="${RET}"] .ag-txt b`).first().click(); await c2.p.waitForTimeout(400);
  const larg = await c2.p.evaluate(() => document.getElementById("pcli")?.getBoundingClientRect().width || 0);
  conf("no celular ocupa a tela", larg >= 380);
  await c2.p.screenshot({ path: "f645-celular.png" });
  await nav.close(); s.close();
  for (const [nn, v] of ok) console.log((v ? "✔ " : "✘ ") + nn);
  if (erros.length) console.log(erros.join("\n"));
  process.exit(ok.every(x => x[1]) && !erros.length ? 0 : 1);
})();
