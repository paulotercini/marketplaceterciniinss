// F50 — ⚡ ANOTAÇÃO RÁPIDA: o botão fixo que atende o telefone. Nome + texto
// + urgente ligado; com caso vira andamento e o caso fica 🔥, sem caso vira
// anotação urgente do atendimento. Nada de escrita quando falta o cliente.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CLI_VAZIO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

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
      return rota.fulfill({ status: rep ? 201 : 204, contentType: "application/json",
        body: rep ? JSON.stringify([{ id: "n" + escritos.length, ...corpo }]) : "" });
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

  // 1) as DUAS portas existem: o campo fixo no topo da barra e o botão do canto
  conf("o ⚡ está fixo na tela", await p.evaluate(() => !!document.getElementById("fab-rapida")));
  conf("o campo ⚡ vive na barra lateral, ACIMA da busca (F52)",
    await p.evaluate(() => { const a = document.getElementById("ar-nome"), b = document.getElementById("busca");
      return a && b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING); }));
  // clicar no campo já abre o painel com o cursor pronto para digitar o nome
  await p.click("#ar-nome");
  await p.waitForTimeout(300);
  conf("clicar no campo abre o painel direto, cursor no nome",
    await p.evaluate(() => document.getElementById("ar-busca") &&
      document.activeElement === document.getElementById("ar-busca")));
  await p.evaluate(() => fecharCaixa());
  await p.waitForTimeout(200);

  // 2) abre com a busca focada e o urgente já ligado
  await p.click("#fab-rapida");
  await p.waitForTimeout(300);
  conf("abre com o campo do cliente focado e 🔥 urgente pré-marcado",
    await p.evaluate(() => document.activeElement === document.getElementById("ar-busca") &&
      document.getElementById("ar-urg").checked));

  // 3) guardar sem cliente escolhido não grava nada
  await p.fill("#ar-texto", "texto órfão");
  escritos.length = 0;
  await p.evaluate(() => salvarAnotacaoRapida());
  await p.waitForTimeout(300);
  conf("sem cliente escolhido, avisa e nada é gravado",
    escritos.length === 0 && await p.evaluate(() =>
      /Escolha o cliente/.test(document.getElementById("aviso").textContent)));

  // 4) buscar e escolher cliente COM caso: mostra o caso de destino
  await p.fill("#ar-busca", "Aurelia");
  await p.evaluate(() => arProcurar("Aurelia"));
  await p.waitForTimeout(200);
  conf("a busca lista o cliente pelo nome",
    await p.evaluate(() => /Aurélia/.test(document.getElementById("ar-achados").textContent)));
  await p.evaluate(cli => arEscolher(cli), CLI_CHEIO);
  await p.waitForTimeout(200);
  conf("escolhido, mostra para qual caso a anotação vai",
    await p.evaluate(() => /vai para o caso/.test(document.getElementById("ar-alvo").textContent)));

  // 5) guardar: andamento no caso + caso marcado 🔥 URGENTE + modal fecha
  await p.fill("#ar-texto", "Cliente ligou: audiência remarcada, avisar hoje.");
  escritos.length = 0;
  await p.evaluate(() => salvarAnotacaoRapida());
  await p.waitForTimeout(500);
  conf("grava o andamento no caso ativo",
    escritos.some(x => x.m === "POST" && x.t === "andamentos" &&
      x.corpo.caso_id === CASO1 && /audiência remarcada/.test(x.corpo.texto)));
  conf("e marca o caso como URGENTE",
    escritos.some(x => x.m === "PATCH" && x.t === "casos" && x.corpo.urgente === true) &&
    await p.evaluate(caso => D.casoPorId.get(caso).urgente === true, CASO1));
  conf("a caixa fecha sozinha depois de guardar",
    await p.evaluate(() => document.getElementById("modal").style.display === "none"));

  // 6) cliente SEM caso: vira anotação urgente do atendimento
  await p.click("#fab-rapida");
  await p.waitForTimeout(300);
  await p.evaluate(() => arProcurar("Belmiro"));
  await p.waitForTimeout(200);
  await p.evaluate(cli => arEscolher(cli), CLI_VAZIO);
  await p.waitForTimeout(200);
  conf("sem caso, avisa que vira anotação do atendimento",
    await p.evaluate(() => /anotação do atendimento/.test(document.getElementById("ar-alvo").textContent)));
  await p.fill("#ar-texto", "Passou no balcão: trouxe a carteira de trabalho.");
  escritos.length = 0;
  await p.evaluate(() => salvarAnotacaoRapida());
  await p.waitForTimeout(500);
  conf("grava a anotação urgente na ficha do cliente",
    escritos.some(x => x.m === "PATCH" && x.t === "clientes" &&
      ((x.corpo.campos || {}).atendimento || []).some(n =>
        /balcão: trouxe a carteira/.test(n.texto) && n.urgente === true && n.origem === "rapida")));
  conf("e nenhum andamento é tentado (não há caso)",
    !escritos.some(x => x.t === "andamentos" || x.t === "casos"));

  // 7) F52 · quem liga sem ser cliente vira INTERESSADO no funil, com a anotação
  await p.click("#fab-rapida");
  await p.waitForTimeout(300);
  await p.fill("#ar-busca", "Zuleica Inexistente");
  await p.evaluate(() => arProcurar("Zuleica Inexistente"));
  await p.waitForTimeout(200);
  conf("sem resultado, oferece anotar como interessado",
    await p.evaluate(() => /ainda não é cliente/.test(document.getElementById("ar-achados").textContent)));
  await p.evaluate(() => arNaoCliente());
  await p.fill("#ar-tel", "16 98888-7777"); // F54: telefone obrigatório
  await p.fill("#ar-texto", "Ligou perguntando de aposentadoria rural, retornar amanhã.");
  escritos.length = 0;
  await p.evaluate(() => salvarAnotacaoRapida());
  await p.waitForTimeout(500);
  conf("o interessado nasce no funil com a anotação como interesse",
    escritos.some(x => x.m === "POST" && x.t === "leads" &&
      x.corpo.nome === "Zuleica Inexistente" && x.corpo.origem === "ligação/balcão" &&
      /aposentadoria rural/.test(x.corpo.beneficio_interesse || "")));
  conf("nada vai para clientes/casos quando é interessado",
    !escritos.some(x => x.t === "clientes" || x.t === "casos" || x.t === "andamentos"));

  // 8) F53 · as duas saídas aparecem MESMO com resultados na lista
  await p.click("#fab-rapida");
  await p.waitForTimeout(300);
  await p.fill("#ar-busca", "Aurelia");
  await p.evaluate(() => arProcurar("Aurelia"));
  await p.waitForTimeout(200);
  conf("com resultado na lista, as saídas de criar continuam embaixo",
    await p.evaluate(() => { const h = document.getElementById("ar-achados").textContent;
      return /Aurélia/.test(h) && /CLIENTE novo/.test(h) && /INTERESSADO/.test(h); }));

  // 9) F53 · cadastrar CLIENTE novo no ato, com a anotação como atendimento
  await p.evaluate(() => { document.getElementById("ar-busca").value = "Otavio Recem Chegado"; arNovoCliente(); });
  await p.waitForTimeout(200);
  conf("a saída de cliente novo explica o destino",
    await p.evaluate(() => /cliente novo/i.test(document.getElementById("ar-alvo").textContent)));
  await p.fill("#ar-tel", "16 97777-6666"); // F54: telefone obrigatório
  await p.fill("#ar-texto", "Veio ao balcão sem ser cliente, quer contratar amanhã.");
  escritos.length = 0;
  await p.evaluate(() => salvarAnotacaoRapida());
  await p.waitForTimeout(600);
  conf("o cliente novo nasce com nome e recebe a anotação urgente",
    escritos.some(x => x.m === "POST" && x.t === "clientes" && x.corpo.nome === "Otavio Recem Chegado") &&
    escritos.some(x => x.m === "PATCH" && x.t === "clientes" &&
      ((x.corpo.campos || {}).atendimento || []).some(n => /balcão sem ser cliente/.test(n.texto) && n.urgente === true)));
  conf("o cliente novo entra na memória e na busca",
    await p.evaluate(() => D.clientes.some(c => c.nome === "Otavio Recem Chegado") &&
      pesquisar("Otavio").some(c => c.nome === "Otavio Recem Chegado")));

  console.log("=== ⚡ anotação rápida (F50) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
