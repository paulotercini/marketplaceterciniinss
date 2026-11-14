// F584 · A mini agenda do Reagendar (pedido do Paulo de 13.11.2026): o Reagendar da linha, o Prorrogar do caso, o Reagendar
// dos Vencidos e o Adiar da tarefa abrem um mês na tela, e um clique no dia grava a data.
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
  await linha(RET).click(); await p.waitForTimeout(300);
  const ext = p.locator(".ag-ext");
  await ext.locator('[data-ae="reagendar"]').click(); await p.waitForTimeout(150);
  const cal = ext.locator(".mcal");
  conf("o Reagendar abre a mini agenda na hora", await cal.count() === 1 && await cal.isVisible());
  conf("sem campo de data", await ext.locator('.ae-painel input[type="date"]').count() === 0);
  conf("os atalhos continuam", await ext.locator(".ae-dias .esp-it").count() === 4);
  const ontem = await p.evaluate(() => somaDias(hoje(), -1));
  const hj = await p.evaluate(() => hoje());
  if (ontem.slice(0, 7) === hj.slice(0, 7)) conf("dia passado desligado", await cal.locator(`button[data-d="${ontem}"]`).isDisabled());
  conf("hoje marcado", await cal.locator(`button.hj[data-d="${hj}"]`).count() === 1);
  const mes0 = await cal.locator(".mcal-cab b").textContent();
  await cal.locator('.mcal-nav[data-nav="1"]').click(); await p.waitForTimeout(100);
  const mes1 = await cal.locator(".mcal-cab b").textContent();
  conf(`a seta troca o mês (${mes0} → ${mes1})`, mes0 !== mes1);
  conf("trocar o mês não fecha o painel", await ext.locator(".ae-painel").isVisible());
  const alvo = await p.evaluate(() => { const d = new Date(hoje() + "T12:00:00"); d.setMonth(d.getMonth() + 1, 10); return d.toLocaleDateString("sv"); });
  await cal.locator(`button[data-d="${alvo}"]`).click(); await p.waitForTimeout(400);
  conf("um clique no dia grava a data", patches.some(([u, b]) => u.includes(RET) && b.includes(`"prazo":"${alvo}"`)));
  conf("com desfazer", await p.locator("#aviso .aviso-bt").count() === 1);
  await p.screenshot({ path: "f584-linha.png" });

  // Vencidos: a janela do Reagendar em lote
  await p.evaluate(id => { const k = D.casoPorId.get(id); if (k) k.prazo = somaDias(hoje(), -5); render(); reagendarVencidas(); }, RET); await p.waitForTimeout(200);
  const mc = p.locator("#modal .mcal");
  conf("os Vencidos abrem a mini agenda", await mc.count() === 1 && await mc.isVisible());
  conf("sem campo de data nos Vencidos", await p.locator('#modal input[type="date"]').count() === 0);
  const p0 = patches.length;
  const d2 = await p.evaluate(() => proxDiaUtil(somaDias(hoje(), 3)));
  if (d2.slice(0, 7) !== hj.slice(0, 7)) { await mc.locator('.mcal-nav[data-nav="1"]').click(); await p.waitForTimeout(100); }
  await mc.locator(`button[data-d="${d2}"]`).click(); await p.waitForTimeout(500);
  conf("o dia escolhido reagenda os vencidos", patches.slice(p0).some(([u, b]) => b.includes(`"${d2}"`)));
  await ctx.close();

  // celular
  const cel = await abrir(390);
  await cel.p.locator(`.cartao[data-casos="${RET}"]`).first().click(); await cel.p.waitForTimeout(300);
  await cel.p.locator('.ag-ext [data-ae="reagendar"]').click(); await cel.p.waitForTimeout(150);
  const m = await cel.p.evaluate(() => { const c = document.querySelector(".ag-ext .mcal"); const b = c && c.querySelector(".mcal-g button"); return c ? [c.getBoundingClientRect().right, innerWidth, document.documentElement.scrollWidth, b.getBoundingClientRect().height] : null; });
  conf(`no celular a mini agenda cabe na tela (${m})`, m && m[0] <= m[1] && m[2] <= m[1] + 1);
  conf("no celular o dia tem alvo de toque", m && m[3] >= 36);
  await cel.p.screenshot({ path: "f584-celular.png" });
  await cel.ctx.close();

  console.log("=== F584 · a mini agenda do Reagendar ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length + erros.length;
  console.log(`${ok.length - ok.filter(x => !x[1]).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
