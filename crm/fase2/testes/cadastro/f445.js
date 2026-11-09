// F445 · as ideias do Trello, segunda leva: a Tabela dos casos abertos (ordem, filtro, etapa e responsável na linha,
// com desfazer) e a aba Pessoas do Planejado (o que cada pessoa tem por dia)
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, EU, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const TUDO = JSON.parse(JSON.stringify(FIX));
const OUTRO = "22222222-2222-2222-2222-222222222222";
TUDO.colaboradores.push({ id: OUTRO, auth_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", nome: "Amanda Ficta", inicial: "A", cor: "#c9a227", papel: "membro", ativo: true, cargo: "advogado", setor: null });
TUDO.casos[0].etapa = "aguardando perícia";
const em2 = new Date(Date.now() + 2 * 864e5).toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });
TUDO.casos[0].prazo = em2;
const gravados = [];

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
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const rq = rota.request(), u = rq.url(), m = rq.method();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      let corpo = {}; try { corpo = JSON.parse(rq.postData() || "{}"); } catch (e) {}
      gravados.push({ m, t, u, corpo });
      const id = t + "-" + gravados.length;
      return rota.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(m === "POST" ? [{ id, ...corpo }] : []) });
    }
    let corpo = TUDO[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) erros.push("console: " + m.text()); });
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0 && D.and30);
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);

  // 1 · Tabela
  await p.evaluate(() => { visao = "tabela"; render(); });
  await p.waitForSelector(".tab-casos tbody tr");
  conf("a Tabela lista o caso aberto", await p.$$eval(".tab-casos tbody tr", t => t.length) === 1);
  conf("o menu traz a Tabela", await p.$$eval('.lista-item[data-v="tabela"]', e => e.length) === 1);
  conf("a etapa oferece só o catálogo da fase, com a atual marcada", await p.evaluate(() => { const s = document.querySelector("[data-tab-etapa]");
    return s.value === "aguardando perícia" && [...s.options].every(o => o.value === "" || ETAPAS_POR_FASE.inss.includes(o.value)); }));
  await p.selectOption("[data-tab-etapa]", "perícia realizada");
  await p.waitForFunction(c => D.casoPorId.get(c).etapa === "perícia realizada", CASO1, { timeout: 3000 }).catch(() => {});
  conf("trocar a etapa na linha grava no caso", gravados.some(g => g.t === "casos" && g.m === "PATCH" && g.corpo.etapa === "perícia realizada"));
  // o aviso só aparece depois de a gravação terminar; a etapa já está na memória antes disso
  conf("a troca da etapa oferece desfazer", await p.waitForFunction(() => [...document.querySelectorAll("#aviso button, .aviso button")].some(b => /Desfazer/i.test(b.textContent)), null, { timeout: 3000 }).then(() => true, () => false));
  await p.evaluate(c => gravarEtapa(c, "aguardando perícia"), CASO1);
  conf("a etapa escrita à mão aparece, mas não se oferece", await p.evaluate(c => { const k = D.casoPorId.get(c); k.etapa = "esperando o médico"; const h = celEtapa(k, true); k.etapa = "aguardando perícia";
    return /esperando o médico \(à mão\)/.test(h) && /disabled>esperando/.test(h); }, CASO1));
  gravados.length = 0;
  await p.evaluate(() => { visao = "tabela"; render(); });
  await p.selectOption("[data-tab-resp]", OUTRO);
  await p.waitForFunction(([o, c]) => (D.atrDoCaso.get(c) || []).includes(o), [OUTRO, CASO1], { timeout: 3000 }).catch(() => {});
  conf("trocar o responsável passa o caso", gravados.some(g => g.t === "atribuicoes" && g.m === "POST" && g.corpo.colaborador_id === OUTRO) && gravados.some(g => g.t === "atribuicoes" && g.m === "DELETE"));
  conf("quem recebe é mencionado", gravados.some(g => g.t === "mencoes" && g.corpo.para_id === OUTRO));
  await p.$$eval("#aviso button, .aviso button", bs => { const b = bs.find(b => /Desfazer/i.test(b.textContent)); if (b) b.click(); });
  await p.waitForTimeout(300);
  conf("o desfazer devolve o caso", await p.evaluate(([e, c]) => (D.atrDoCaso.get(c) || []).join() === e, [EU, CASO1]));
  conf("o filtro de texto esconde o que não casa", await p.evaluate(() => { tabTxt = "ninguém assim"; pintarTabela(); const n = document.querySelectorAll(".tab-casos tbody tr").length; tabTxt = "aurelia"; pintarTabela(); const m = document.querySelectorAll(".tab-casos tbody tr").length; tabTxt = ""; return n === 0 && m === 1; }));
  conf("o filtro de fase esconde as outras fases", await p.evaluate(() => { guardar("crm_tab_fase", "judicial"); renderTabela(); const n = document.querySelectorAll(".tab-casos tbody tr").length; guardar("crm_tab_fase", ""); renderTabela(); return n === 0; }));
  await p.click('[data-tab-ord="cliente"]');
  conf("o cabeçalho ordena e guarda a escolha", await p.evaluate(() => ler("crm_tab_ord")) === "cliente:asc" && await p.$$eval('th[aria-sort="ascending"]', t => t.length) === 1);
  await p.click('[data-tab-ord="cliente"]');
  conf("o segundo clique inverte", await p.evaluate(() => ler("crm_tab_ord")) === "cliente:desc");
  conf("o vazio fica no fim nos dois sentidos", await p.evaluate(() => { const k = D.casos[0], k2 = {...k, id: "b0000000-0000-0000-0000-0000000000f9", prazo: null};
    D.casos.push(k2); D.casoPorId.set(k2.id, k2); guardar("crm_tab_ord", "prazo:desc"); const a = linhasTabela().map(x => x.id); guardar("crm_tab_ord", "prazo:asc"); const b = linhasTabela().map(x => x.id);
    D.casos.pop(); D.casoPorId.delete(k2.id); return a[1] === k2.id && b[1] === k2.id; }));
  conf("o clique no nome abre a ficha", await p.evaluate(() => { renderTabela(); document.querySelector(".tab-cli").click(); return !!clienteAberto; }));
  await p.evaluate(() => fecharFicha(false));

  // 2 · Pessoas
  await p.evaluate(() => irPara("pessoas"));
  await p.waitForSelector(".pes-tab");
  conf("Pessoas é aba do Planejado", await p.$$eval('[data-plan-aba="pessoas"]', b => b.length === 1 && b[0].classList.contains("on")));
  conf("o menu acende o Planejado", await p.$$eval('.lista-item[data-v="planejado"].ativa', e => e.length) === 1);
  conf("três semanas de colunas mais os vencidos", await p.$$eval(".pes-tab thead th", t => t.length) === 23);
  const cel = await p.evaluate(d => { const b = document.querySelector(`[data-pes$="|${d}"]`); return b && b.textContent; }, em2);
  conf("o item cai no dia certo da pessoa", !!cel && /^1/.test(cel));
  await p.click(`[data-pes$="|${em2}"]`);
  conf("o clique mostra os itens do dia", await p.$$eval(".pes-lista [data-cli]", b => b.length) >= 1);
  await p.click(".pes-lista [data-cli]");
  conf("o item abre a ficha", await p.evaluate(() => !!clienteAberto));
  await p.evaluate(() => fecharFicha(false));
  conf("a colaboradora vê a aba Pessoas", await p.evaluate(() => LISTAS_POR_CARGO.recepcao.includes("pessoas") && LISTAS_COLAB.includes("pessoas")));

  // 3 · seleção no Quadro (a base da F443)
  await p.evaluate(() => { guardar("crm_quadro_agrupar", "etapa"); guardar("crm_quadro_fase", "inss"); irPara("quadro"); });
  await p.waitForSelector(".kcard[data-casos]");
  await p.click(".kcard[data-casos]", { modifiers: ["Shift"] });
  conf("Shift+clique marca o cartão do Quadro sem abrir a ficha", await p.evaluate(() => _sel.size === 1 && !clienteAberto && !!document.querySelector(".kcard.sel")));
  conf("a barra do Quadro traz Etapa e Passar", await p.$$eval("#sel-barra button", bs => bs.some(b => /Etapa/.test(b.textContent)) && bs.some(b => /Passar/.test(b.textContent))));
  gravados.length = 0;
  await p.evaluate(() => loteEtapa());
  await p.click('.desp-quem button:has-text("perícia realizada")');
  await p.waitForFunction(c => D.casoPorId.get(c).etapa === "perícia realizada", CASO1, { timeout: 3000 }).catch(() => {});
  conf("a etapa em lote grava no caso e limpa a seleção", gravados.some(g => g.t === "casos" && g.m === "PATCH" && g.corpo.etapa === "perícia realizada") && await p.evaluate(() => _sel.size === 0));
  await p.$$eval("#aviso button, .aviso button", bs => { const b = bs.find(b => /Desfazer/i.test(b.textContent)); if (b) b.click(); });
  await p.waitForFunction(c => D.casoPorId.get(c).etapa === "aguardando perícia", CASO1, { timeout: 3000 }).catch(() => {});
  conf("o desfazer devolve a etapa", await p.evaluate(c => D.casoPorId.get(c).etapa, CASO1) === "aguardando perícia");
  conf("casos de fases diferentes não recebem etapa em lote", await p.evaluate(() => { const k = D.casos[0], k2 = {...k, id: "b0000000-0000-0000-0000-0000000000f8", fase: "judicial"};
    D.casos.push(k2); D.casoPorId.set(k2.id, k2); _sel.set("a", {casos: [k.id]}); _sel.set("b", {casos: [k2.id]}); loteEtapa();
    const aberta = !!document.querySelector(".desp-quem"); _sel.clear(); D.casos.pop(); D.casoPorId.delete(k2.id); pintarSel(); return !aberta; }));

  conf("sem erro na página", !erros.length);
  await nav.close(); s.close();
  const n = ok.filter(x => x[1]).length;
  ok.forEach(([t, v]) => console.log(`${v ? "✓" : "✗"} ${t}`));
  if (erros.length) console.log(erros.join("\n"));
  console.log(`${n}/${ok.length}`);
  process.exit(n === ok.length ? 0 : 1);
})();
