// F48 — ⚖️ ANÁLISE DE DIREITO: a memória dos atendimentos. A aba na ficha, a
// visão global com dashboard, o registro retroativo com cenários (regra, data,
// valor, ⭐ no melhor), o comentário em TODOS os casos ativos, o aviso 🎂 de
// época e a anotação antiga do To Do virando análise em um clique.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

// segundo caso ATIVO do mesmo cliente — prova do "comentário em todos"
const CASO2 = "b0000000-0000-0000-0000-00000000f482";
FIX.casos.push({ ...FIX.casos[0], id: CASO2, titulo: "Revisão da vida toda",
  beneficio: "Revisão", especie: "B42", fase: "judicial", protocolos: [] });
// e um encerrado, que NÃO pode receber o comentário
const CASO3 = "b0000000-0000-0000-0000-00000000f483";
FIX.casos.push({ ...FIX.casos[0], id: CASO3, titulo: "Caso velho", fase: "encerrado", protocolos: [] });
// anotação antiga do To Do (lista 🙏), espelhada no lembrete do cliente
FIX.lembretes = [{ id: "l0000000-0000-0000-0000-00000000f481", cliente_id: CLI_CHEIO,
  tipo: "aposentadoria_futura", titulo: "Aposentadoria por pontos", ativo: true,
  proximo_em: null, intervalo_meses: null, responsavel_id: null,
  detalhes: { anotacoes: [{ data: "2020-05-02", inicial: "P",
    texto: "Verifiquei: aposenta por pontos em 2025; conferir de novo perto da data." }] },
  lembrete_avisos: [] }];

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
  }, [SUPA, SESSAO]);
  const escritos = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      const corpo = JSON.parse(rota.request().postData() || "{}");
      escritos.push({ m, t, corpo });
      const rep = /return=representation/.test(JSON.stringify(rota.request().headers()));
      const eco = Array.isArray(corpo) ? corpo.map((x, i) => ({ id: "n" + escritos.length + "-" + i, ...x }))
        : [{ id: "n" + escritos.length, ...corpo }];
      return rota.fulfill({ status: rep ? 201 : 204, contentType: "application/json",
        body: rep ? JSON.stringify(eco) : "" });
    }
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error") erros.push("console: " + m.text()); });
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);

  // 2) a aba na ficha, sempre visível
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForTimeout(900);
  // com DOIS processos ativos o sistema pergunta em qual trabalhar (regra da
  // casa) — o teste escolhe o primeiro, como o usuário faria no modal
  await p.evaluate(([cli, caso]) => escolhido(cli, caso), [CLI_CHEIO, CASO1]);
  await p.waitForTimeout(500);

  // 1) o menu na barra lateral (pintado pelo montarSidebar já com os dados)
  conf("⚖️ Análise de Direito está na barra lateral",
    await p.evaluate(() => !!document.querySelector('.lista-item[data-v="direito"]')));
  conf("a ficha tem a aba Análise de Direito",
    await p.evaluate(() => [...document.querySelectorAll(".mt")].some(b => /Análise de Direito/.test(b.textContent))));

  // 3) abrir a aba: convite + formulário + anotação antiga do To Do
  await p.evaluate(() => { abaAtiva = 8; repintarFicha(); });
  await p.waitForTimeout(400);
  conf("o painel abre com o formulário de registrar",
    await p.evaluate(() => !!document.getElementById("ad-novo") && !!document.getElementById("ad-data")));
  conf("a anotação antiga do To Do aparece, com a data original",
    await p.evaluate(() => [...document.querySelectorAll(".mov-txt")]
      .some(x => /aposenta por pontos em 2025/.test(x.textContent))));

  // 4) "→ virar análise" pré-preenche o formulário
  await p.evaluate(() => notaViraAnalise("l0000000-0000-0000-0000-00000000f481", 0));
  await p.waitForTimeout(400);
  conf("virar análise pré-preenche data, texto e fonte",
    await p.evaluate(() => document.getElementById("ad-data").value === "2020-05-02" &&
      /aposenta por pontos/.test(document.getElementById("ad-contexto").value) &&
      document.getElementById("ad-fonte").value === "todo"));

  // 5) registrar a análise retroativa com dois cenários (⭐ no primeiro)
  await p.evaluate(() => {
    const rows = document.querySelectorAll("#ad-cens .ad-row");
    rows[0].querySelector(".ad-regra").value = "Pontos";
    rows[0].querySelector(".ad-data").value = "2025-05-12";
    rows[0].querySelector(".ad-valor").value = "3000";
    rows[0].querySelector("input[type=radio]").checked = true;
    rows[1].querySelector(".ad-regra").value = "Pedágio 100%";
    rows[1].querySelector(".ad-data").value = "2027-06-23";
    rows[1].querySelector(".ad-valor").value = "5000";
  });
  escritos.length = 0;
  await p.evaluate(cli => salvarAnalise(cli), CLI_CHEIO);
  await p.waitForTimeout(1000);
  const post = escritos.find(x => x.m === "POST" && x.t === "analises_direito");
  conf("a análise grava com a data retroativa e os dois cenários",
    post && post.corpo.data_analise === "2020-05-02" && post.corpo.fonte === "todo" &&
    (post.corpo.cenarios || []).length === 2 && post.corpo.cenarios[0].melhor === true &&
    post.corpo.cenarios[0].valor === 3000);
  const andPost = escritos.find(x => x.m === "POST" && x.t === "andamentos");
  conf("o comentário vai para TODOS os casos ativos (2), e não para o encerrado",
    andPost && Array.isArray(andPost.corpo) && andPost.corpo.length === 2 &&
    andPost.corpo.every(x => /Análise de Direito registrada \(02\.05\.2020\)/.test(x.texto) &&
      /Pontos em 12\.05\.2025/.test(x.texto)) &&
    !andPost.corpo.some(x => x.caso_id === "b0000000-0000-0000-0000-00000000f483"));
  conf("a anotação do To Do fica carimbada (✔ virou análise)",
    escritos.some(x => x.m === "PATCH" && x.t === "lembretes" &&
      ((x.corpo.detalhes || {}).anotacoes || []).some(n => n.analise_id)));

  // 6) o cartão da análise na régua dos atendimentos
  conf("o ano grande (2020) abre o cartão da análise",
    await p.evaluate(() => [...document.querySelectorAll(".ad-ano")].some(x => x.textContent === "2020")));
  conf("o melhor caminho leva ⭐ e o valor sai em reais",
    await p.evaluate(() => { const c = document.querySelector(".ad-cen.ad-melhor");
      return c && /Pontos/.test(c.textContent) && /R\$\s?3\.000,00/.test(c.textContent); }));
  conf("cenário com data que já passou fica verde: ✓ direito alcançado",
    await p.evaluate(() => [...document.querySelectorAll(".ad-cen.ad-ok")]
      .some(c => /direito alcançado/.test(c.textContent))));
  conf("o cenário futuro oferece o aviso 🎂 de época",
    await p.evaluate(() => [...document.querySelectorAll(".ad-cen:not(.ad-ok) .btn-mini")]
      .some(b => /avisar na época/.test(b.textContent))));

  // 7) o aviso 🎂 reusa a máquina das aposentadorias (com lembrar_em)
  escritos.length = 0;
  await p.evaluate(cli => avisarCenario(cli, "2027-06-23", "Pedágio 100%"), CLI_CHEIO);
  await p.waitForTimeout(700);
  conf("🎂 avisar na época grava em aposentadorias com o lembrete adiantado",
    escritos.some(x => x.m === "POST" && x.t === "aposentadorias" &&
      x.corpo.data === "2027-06-23" && x.corpo.especie === "Pedágio 100%" && x.corpo.lembrar_em));

  // 8) contador da barra lateral: 1 cliente com direito alcançado
  conf("a barra lateral conta quem já pode aposentar",
    await p.evaluate(() => (document.querySelector('.lista-item[data-v="direito"] .cont') || {}).textContent === "1"));

  // 9) a visão global e o dashboard
  await p.evaluate(() => { fecharFicha(false); visao = "direito"; subDireito = "analises"; render(); });
  await p.waitForTimeout(500);
  conf("a visão global agrupa por cliente com o resumo da última análise",
    await p.evaluate(() => [...document.querySelectorAll("#conteudo-meio .cartao")]
      .some(c => /1 análise/.test(c.textContent) && /direito alcançado/.test(c.textContent))));
  await p.evaluate(() => irSubDireito("dash"));
  await p.waitForTimeout(500);
  conf("o dashboard mostra os cartões-resumo (1 já pode aposentar)",
    await p.evaluate(() => [...document.querySelectorAll(".ad-tile")]
      .some(t => /já podem aposentar/.test(t.textContent) && /\b1\b/.test(t.querySelector("b").textContent))));
  conf("o dashboard tem a lista de comunicar e as barras por regra",
    await p.evaluate(() => /Direito alcançado — comunicar/.test(document.getElementById("conteudo-meio").textContent) &&
      !!document.querySelector(".ad-barra")));

  // 10) tabela ausente = aviso do schema (banco atrasado não quebra a tela)
  await p.evaluate(() => { D.analises = null; render(); });
  await p.waitForTimeout(300);
  conf("sem a tabela no banco, a tela pede o schema_analise_direito.sql",
    await p.evaluate(() => /schema_analise_direito\.sql/.test(document.getElementById("conteudo-meio").textContent)));

  await p.evaluate(cli => { D.analises = D.analises || []; visao = "direito"; subDireito = "analises"; render(); }, null);
  await p.waitForTimeout(200);
  const meio = await p.$("#conteudo-meio");
  if (meio) await meio.screenshot({ path: path.join(__dirname, "f48-analise-direito.png") });
  console.log("=== ⚖️ Análise de Direito (F48) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
