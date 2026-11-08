// F455 · A linha que se estende (artefato v6 aprovado pelo Paulo em 08.11.2026): o clique abre, abaixo do nome, a última
// anotação, o CPF, o Meu INSS e o WhatsApp, e Abrir, Anotar, Reagendar e Concluir; o segundo clique recolhe.
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
FIX.andamentos = (FIX.andamentos || []).concat([{ id: "a454", caso_id: RET, autor_id: FIX.colaboradores[0].id, texto: "Anotação fictícia: aguardar a carta de concessão. " + "Conferir o andamento. ".repeat(50) + "FIM DA ANOTAÇÃO", criado_em: "2026-11-01T12:00:00Z" }]);

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
  conf("o clique estende a linha", await ext.count() === 1 && await p.evaluate(() => document.querySelector(".ag-ext").previousElementSibling.classList.contains("ext-on")));
  conf("a extensão mostra a última anotação", /aguardar a carta de concessão/.test(await ext.innerText()));
  conf("o texto longo para em 1.000 caracteres", !/FIM DA ANOTAÇÃO/.test(await ext.locator(".ae-txt").textContent()));
  await ext.locator('[data-ae="mais"]').click(); await p.waitForTimeout(150);
  conf("Ver mais mostra a anotação inteira", /FIM DA ANOTAÇÃO/.test(await ext.locator(".ae-txt").textContent()) && await ext.locator('[data-ae="mais"]').count() === 0);
  conf("Ver mais não fecha a extensão nem abre a ficha", await ext.count() === 1 && await p.evaluate(() => !clienteAberto));
  conf("o CPF está à vista para copiar", await ext.locator('[data-cop="45400000001"]').count() === 1);
  conf("há Meu INSS e WhatsApp", await ext.locator('[data-ae="senha"]').count() === 1 && await ext.locator('[data-ae="zap"]').count() === 1);
  const rot = await ext.locator(".ae-acoes button").allTextContents();
  conf(`os quatro botões, uma palavra cada (${rot})`, rot.join(",") === "Abrir,Anotar,Reagendar,Concluir");
  conf("a ficha não abriu", await p.evaluate(() => !clienteAberto));
  await p.screenshot({ path: "f455-computador.png" });
  await linha(RET).click(); await p.waitForTimeout(200);
  conf("o segundo clique recolhe", await ext.count() === 0);
  // Ctrl+clique abre a ficha
  await p.evaluate(() => { clienteAberto = null; render(); }); await p.waitForTimeout(200);
  await linha(RET).click({ modifiers: ["Control"] }); await p.waitForTimeout(600);
  conf("Ctrl+clique abre a ficha", await p.evaluate(id => clienteAberto === id, "c4540000-0000-0000-0000-000000000001"));
  await p.evaluate(() => { clienteAberto = null; visao = "planejado"; render(); }); await p.waitForTimeout(300);

  await linha(RET).click(); await p.waitForTimeout(200);
  await ext.locator('[data-ae="reagendar"]').click();
  conf("o painel esconde os botões", await ext.locator(".ae-acoes").isHidden() && await ext.locator(".ae-dias .esp-it").count() === 4);
  await ext.locator('[data-ae="cancelar"]').click();
  conf("Cancelar devolve os botões", await ext.locator(".ae-acoes").isVisible() && await ext.locator(".ae-painel").isHidden());
  await ext.locator('[data-ae="reagendar"]').click();
  const amanha = await p.evaluate(() => proxDiaUtil(somaDias(hoje(), 1)));
  await ext.locator('.esp-it:has-text("Amanhã")').click(); await p.waitForTimeout(400);
  conf("Reagendar grava a data nova", patches.some(([u, b]) => u.includes(RET) && b.includes(`"prazo":"${amanha}"`)));
  conf("Reagendar tem desfazer", await p.locator("#aviso .aviso-bt").count() === 1);
  await p.locator("#aviso .aviso-bt").click(); await p.waitForTimeout(400);
  conf("desfazer devolve a data", await p.evaluate(([id, d]) => D.casoPorId.get(id).prazo !== d, [RET, amanha]));

  // Anotar: a data escrita vira a do Reagendar, e Atribuir a nasce com quem está atribuído
  await linha(RET).click(); await p.waitForTimeout(200);
  await ext.locator('[data-ae="anotar"]').click();
  conf("Atribuir a nasce com o responsável", await ext.locator(".ae-para").inputValue() === FIX.colaboradores[0].id);
  conf("Reagendar nasce com a data da linha", await ext.locator(".ae-data").inputValue() === dia(-5));
  await ext.locator(".ae-nota").fill("Ligar para a cliente em 15 dias");
  const em15 = dia(15);
  conf("a data escrita atualiza o Reagendar", await ext.locator(".ae-data").inputValue() === em15);
  await ext.locator(".ae-para").selectOption(AMANDA);
  const p0 = posts.length;
  await ext.locator('[data-ae="anotar-ok"]').click(); await p.waitForTimeout(500);
  const novos = posts.slice(p0);
  conf("Anotar grava a anotação", novos.some(([u, b]) => /andamentos$/.test(u.split("?")[0]) && b.includes("Ligar para a cliente")));
  conf("Anotar grava a data", patches.some(([u, b]) => u.includes(RET) && b.includes(`"prazo":"${em15}"`)));
  conf("Anotar atribui a outra pessoa", novos.some(([u, b]) => /atribuicoes/.test(u) && b.includes(AMANDA)) && dels.some(u => /atribuicoes/.test(u) && u.includes(FIX.colaboradores[0].id)));
  conf("a pessoa atribuída recebe a menção", novos.some(([u, b]) => /mencoes/.test(u) && b.includes(AMANDA)));
  conf("Anotar tem desfazer de uma vez", await p.locator("#aviso .aviso-bt").count() === 1 && /Anotado/.test(await p.locator("#aviso").innerText()));

  // Concluir o retorno: a nota e a data apagada, com o despacho que leva isso ao To Do
  await p.evaluate(() => { render(); }); await p.waitForTimeout(200);
  await linha(RET).click(); await p.waitForTimeout(200);
  await ext.locator('[data-ae="concluir"]').click();
  await ext.locator(".ae-nota").fill("Carta conferida");
  await ext.locator('[data-ae="concluir-ok"]').click(); await p.waitForTimeout(500);
  const pc = patches.filter(([u]) => u.includes(RET)).at(-1);
  conf("Concluir tira a data e marca o despacho concluído", pc && pc[1].includes('"prazo":null') && pc[1].includes('"concluido":true'));
  conf("Concluir grava o que foi feito", posts.some(([u, b]) => /andamentos$/.test(u.split("?")[0]) && b.includes("✔ Carta conferida")));

  // prazo fatal: não muda de data aqui, e o Concluir registra o cumprimento
  await p.evaluate(() => { render(); }); await p.waitForTimeout(200);
  await linha(FAT).click(); await p.waitForTimeout(200);
  await ext.locator('[data-ae="reagendar"]').click();
  conf("o prazo fatal não oferece datas", await ext.locator(".esp-it").count() === 0 && /registro é feito no caso/.test(await ext.innerText()));
  await ext.locator('[data-ae="cancelar"]').click();
  await ext.locator('[data-ae="concluir"]').click();
  await ext.locator('[data-ae="concluir-ok"]').click(); await p.waitForTimeout(600);
  conf("Concluir no prazo fatal registra o cumprimento", posts.some(([u, b]) => /andamentos$/.test(u.split("?")[0]) && b.includes("[PRAZO CUMPRIDO]") && b.includes(FAT)));
  await ctx.close();

  // celular: cabe na tela, sem rolagem lateral
  const cel = await abrir(390);
  await cel.p.locator(`.cartao[data-casos="${RET}"]`).first().click(); await cel.p.waitForTimeout(300);
  const larg = await cel.p.evaluate(() => { const x = document.querySelector(".ag-ext"); return x ? [x.scrollWidth, x.clientWidth, document.documentElement.scrollWidth, innerWidth] : null; });
  conf(`no celular a extensão cabe na tela (${larg})`, larg && larg[0] <= larg[1] + 1 && larg[2] <= larg[3] + 1);
  conf("no celular o nome do responsável não aparece", await cel.p.evaluate(() => { const r = document.querySelector(".ag-ext .ae-resp"); return !!r && getComputedStyle(r).display === "none"; }));
  await cel.p.screenshot({ path: "f455-celular.png" });
  await cel.ctx.close();

  console.log("=== F455 · a linha que se estende ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length + erros.length;
  console.log(`${ok.length - ok.filter(x => !x[1]).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
