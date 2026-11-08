// F441 · as ideias do Trello: Quadro por etapa com arrastar e desfazer, caso parado, limite por coluna,
// regras por etapa (sugestão com um clique), modelos de etapas e seguir o caso
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, EU, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const TUDO = JSON.parse(JSON.stringify(FIX));
TUDO.casos[0].etapa = "aguardando perícia";
TUDO.casos[0].revisado_em = null;
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

  // 1 · Quadro por etapa
  await p.evaluate(() => { guardar("crm_quadro_agrupar", "etapa"); guardar("crm_quadro_fase", "inss"); visao = "quadro"; render(); });
  await p.waitForSelector('.coluna[data-etapa]');
  const cols = await p.$$eval('.coluna[data-etapa]', cs => cs.map(c => [c.dataset.etapa, c.querySelectorAll(".kcard").length]));
  conf("uma coluna por etapa do catálogo do INSS, mais Sem etapa", cols.length === 7 && cols[6][0] === "");
  conf("o caso aparece na coluna da etapa declarada", (cols.find(c => c[0] === "aguardando perícia") || [])[1] === 1);
  conf("a escolha da fase troca as colunas", await p.evaluate(() => { guardar("crm_quadro_fase", "judicial"); render();
    const n = document.querySelectorAll(".coluna[data-etapa]").length; guardar("crm_quadro_fase", "inss"); render(); return n === 9; }));
  // arrastar: declara a etapa e oferece desfazer
  await p.dragAndDrop('.coluna[data-etapa="aguardando perícia"] .kcard', '.coluna[data-etapa="perícia realizada"]');
  await p.waitForFunction(c => D.casoPorId.get(c).etapa === "perícia realizada", CASO1, { timeout: 3000 }).catch(() => {});
  conf("arrastar declara a etapa no caso", await p.evaluate(c => D.casoPorId.get(c).etapa, CASO1) === "perícia realizada");
  conf("a etapa vai ao banco", gravados.some(g => g.t === "casos" && g.m === "PATCH" && g.corpo.etapa === "perícia realizada"));
  conf("o aviso traz o desfazer", await p.$$eval("#aviso button, .aviso button", bs => bs.some(b => /Desfazer/i.test(b.textContent))));
  await p.evaluate(c => gravarEtapa(c, "aguardando perícia"), CASO1);

  // 2 · caso parado e limite
  conf("o caso sem anotação há mais de 30 dias fica em destaque", await p.$$eval(".kcard.parado .ag-parado", e => e.length) === 1);
  await p.fill("#q-lim", "1"); await p.press("#q-lim", "Enter"); await p.waitForTimeout(100);
  conf("o limite digitado fica guardado", await p.evaluate(() => ler("crm_quadro_lim")) === "1");
  conf("limite de 0 cartões não marca; de 1 também não com um cartão", await p.evaluate(() => { guardar("crm_quadro_lim", "1"); render(); return document.querySelectorAll(".coluna.acima").length === 0; }));
  conf("a coluna acima do limite fica vermelha", await p.evaluate(c => { const k = D.casoPorId.get(c); const k2 = {...k, id: "b0000000-0000-0000-0000-0000000000f2"};
    D.casos.push(k2); D.casoPorId.set(k2.id, k2); render(); const n = document.querySelectorAll(".coluna.acima").length;
    D.casos.pop(); D.casoPorId.delete(k2.id); guardar("crm_quadro_lim", "0"); render(); return n === 1; }, CASO1));
  conf("o selo de parado aparece nas listas", await p.evaluate(c => /parado|há \d+ dias/.test(seloParado(D.casoPorId.get(c))), CASO1));

  // 3 · regras por etapa
  const sug = await p.evaluate(e => sugeridasDoDia(e).filter(s => s.regra), EU);
  conf("a regra da etapa aparece nas Sugeridas para hoje", sug.length === 1 && /Orientar o cliente/.test(sug[0].txt));
  gravados.length = 0;
  await p.evaluate(([c, r]) => criarTarefaDaRegra(c, r), [CASO1, sug[0] && sug[0].regra]);
  conf("Criar grava a anotação e a tarefa", gravados.some(g => g.t === "andamentos" && /Orientar o cliente/.test(g.corpo.texto))
    && gravados.some(g => g.t === "andamento_tarefas" && g.corpo.natureza === "compromisso"));
  conf("a regra feita não volta a ser sugerida", await p.evaluate(e => sugeridasDoDia(e).filter(s => s.regra).length === 0, EU));
  conf("diasUteisDepois pula o fim de semana", await p.evaluate(() => diasUteisDepois("2026-11-06", 1) === "2026-11-09"));

  // 4 · modelos de etapas
  conf("os três modelos padrão existem", await p.evaluate(() => modelosEtapas().map(m => m.nome).join("|") === "Réplica|Recurso ao CRPS|Perícia"));
  const tf = { id: "tf-mod", caso_id: CASO1, andamento_id: "and-1", colaborador_id: EU, etapas: [{ t: "Revisar", feito: false }] };
  gravados.length = 0;
  await p.evaluate(t => { D.tarefasPorCaso.set(t.caso_id, [t]); window.tarefaAberta = id => id === t.id ? t : null; return aplicarModeloEtapas(t.id, 0); }, tf);
  const pat = gravados.find(g => g.t === "andamento_tarefas" && g.m === "PATCH");
  conf("o modelo acrescenta as etapas sem repetir as que já existem", pat && pat.corpo.etapas.length === 5 && pat.corpo.etapas.filter(e => e.t === "Revisar").length === 1);

  // 5 · seguir o caso
  gravados.length = 0;
  await p.evaluate(c => seguirCaso(c), CASO1);
  conf("Seguir grava em caso_seguidores", gravados.some(g => g.t === "caso_seguidores" && g.m === "POST" && g.corpo.caso_id === CASO1));
  conf("o caso passa a constar como seguido", await p.evaluate(c => sigoCaso(c), CASO1));
  await p.evaluate(c => seguirCaso(c), CASO1);
  conf("tocar de novo deixa de seguir", gravados.some(g => g.t === "caso_seguidores" && g.m === "DELETE") && !(await p.evaluate(c => sigoCaso(c), CASO1)));

  // 6 · Configurações
  conf("as Configurações mostram regras e modelos", await p.evaluate(() => { const h = cfgRegrasModelos(); return /Regras por etapa/.test(h) && /Modelos de etapas/.test(h) && /perícia designada/.test(h); }));
  conf("a migração cria a tabela e o gatilho", /create table if not exists public\.caso_seguidores/.test(fs.readFileSync(path.join(__dirname, "../../migracoes/f441_seguir_caso.sql"), "utf8")));

  conf("sem erro na página", !erros.length);
  await nav.close(); s.close();
  const n = ok.filter(x => x[1]).length;
  ok.forEach(([t, v]) => console.log(`${v ? "✓" : "✗"} ${t}`));
  if (erros.length) console.log(erros.join("\n"));
  console.log(`${n}/${ok.length}`);
  process.exit(n === ok.length ? 0 : 1);
})();
