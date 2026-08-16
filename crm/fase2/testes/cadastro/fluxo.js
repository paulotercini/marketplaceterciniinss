// F30 — o Atendimento virou FLUXO, e o trilho do Cadastro acompanha:
//
//   1. a Triagem encerrada SOME do trilho; o resumo vira a primeira
//      informação das Anotações, com o botão de reabrir
//   2. o fluxo na ordem: espécie (com "outros") → documentos → anotações →
//      honorários (padrão do escritório + ajuste que entra no contrato) →
//      decisão (Gerar o caso · Somente gerar lembrete · Não gerar)
//   3. incapacidade exige a via (administrativo ou judicial) antes de gerar
//   4. Somente gerar lembrete: Anotações some e as anotações aparecem na
//      aba Lembretes
//   5. cliente com caso: sem Anotações à toa, com "+ atendimento" e com o
//      botão Documentos (que só nasce com o caso)
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CLI_VAZIO, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

// o cliente vazio chega TRIADO (pré-condição do fluxo) e há espécies extras
FIX.clientes[1] = { ...FIX.clientes[1], triagem: { atendimento:
  { em: "2026-08-01", quem: EU, passos: 8, conferidos: 7 },
  cnis: { estado: "atencao", nota: "faltam 2 vínculos" } } };
FIX.documentos_beneficio.push(
  { id: "db-b31", beneficio: "Aux. Incapacidade Temporária (B31)",
    itens: "Documentos médicos\nCNIS", extras: "" });

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
    localStorage.setItem("crm_subcad", "anotacoes");
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
      if (m === "POST" && (t === "casos" || t === "lembretes"))
        return rota.fulfill({ status: 201, contentType: "application/json",
          body: JSON.stringify([{ id: t.slice(0, 2) + "999999-9999-9999-9999-999999999999", ...corpo }]) });
      return rota.fulfill({ status: 204, body: "" });
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

  const trilho = () => p.evaluate(() =>
    [...document.querySelectorAll('.painel[data-p="0"].ativo .sub-menu button')].map(b => b.innerText.trim()));
  await p.evaluate(cli => abrirFicha(cli), CLI_VAZIO);
  await p.waitForSelector(".caixa-atend");
  await p.waitForTimeout(300);

  // ── 1. a triagem encerrada: fora do trilho, dentro das Anotações ────────
  conf("a Triagem encerrada sumiu do trilho",
    !(await trilho()).some(x => /Triagem/.test(x)));
  const resumo = await p.evaluate(() => (document.querySelector(".tri-resumo-anot") || {}).innerText || "");
  conf("o resumo da triagem é a primeira informação das Anotações",
    /Triagem encerrada/.test(resumo) && /7 de 8/.test(resumo));
  conf("com as atenções da triagem à vista", /faltam 2 vínculos/.test(resumo));
  conf("e o botão de reabrir existe", /reabrir triagem/.test(resumo));
  escritos.length = 0;
  await p.evaluate(cli => reabrirTriagem(cli), CLI_VAZIO);
  await p.waitForTimeout(500);
  conf("reabrir traz a Triagem de volta ao trilho",
    (await trilho()).some(x => /Triagem/.test(x)));
  conf("e some com as Anotações até novo encerramento",
    !(await trilho()).some(x => /Anotações/.test(x)));
  conf("o rastro da reabertura fica gravado",
    escritos.some(x => x.m === "PATCH" && x.t === "clientes"
      && /reaberta/.test(JSON.stringify(x.corpo)) && !/"atendimento"/.test(JSON.stringify((x.corpo.triagem || {}).atendimento || null))));
  // encerra de novo (direto na memória) para seguir o fluxo
  await p.evaluate(cli => { D.cliPorId.get(cli).triagem.atendimento =
    { em: "2026-08-16", quem: "11111111-1111-1111-1111-111111111111", passos: 8, conferidos: 8 };
    irSubCad("anotacoes"); }, CLI_VAZIO);
  await p.waitForTimeout(400);

  // ── 2. o fluxo na ordem ─────────────────────────────────────────────────
  await p.evaluate(cli => novoPreCaso(cli), CLI_VAZIO);
  await p.waitForTimeout(500);
  const rotulos = await p.evaluate(() =>
    [...document.querySelectorAll(".caixa-atend .rotulo-caso")].map(x => x.innerText.trim()));
  conf(`os blocos seguem a ordem do atendimento (${rotulos.length})`,
    /1 · de que se trata/i.test(rotulos[1] || "") && /2 · documentos/i.test(rotulos[2] || "")
    && /3 · anotações/i.test(rotulos[3] || "") && /honorários/i.test(rotulos[4] || "")
    && /e agora\?/i.test(rotulos[5] || ""));
  conf("a espécie tem a opção outros para escrever",
    await p.evaluate(() => [...document.querySelectorAll(".pc-cartao select option")]
      .some(o => o.value === "__outros__")));
  const pcId = await p.evaluate(cli => precasosDe(D.cliPorId.get(cli))[0].id, CLI_VAZIO);
  await p.evaluate(([cli, id]) => mudarPreCaso(cli, id, "especie", "Guia de pagamento avulsa GPS"), [CLI_VAZIO, pcId]);
  await p.waitForTimeout(400);
  conf("espécie fora da lista (outros) grava como escrita",
    (await p.evaluate(cli => precasosDe(D.cliPorId.get(cli))[0].especie, CLI_VAZIO)) === "Guia de pagamento avulsa GPS");
  conf("a decisão avisa que o caso nasce com a procuração assinada",
    /será gerado somente quando o cliente assinar a procuração/.test(
      await p.evaluate(() => document.querySelector(".caixa-atend").innerText)));
  conf("os três caminhos estão lado a lado",
    await p.evaluate(() => { const t = document.querySelector(".pc-acao").innerText;
      return /Gerar o caso/.test(t) && /Somente gerar lembrete/.test(t) && /Não gerar/.test(t); }));

  // ── 3. incapacidade exige a via ─────────────────────────────────────────
  await p.evaluate(([cli, id]) => mudarPreCaso(cli, id, "especie", "Aux. Incapacidade Temporária (B31)"), [CLI_VAZIO, pcId]);
  await p.waitForTimeout(400);
  conf("benefício por incapacidade pergunta a via",
    /qual a via\?/.test(await p.evaluate(() => document.querySelector(".caixa-atend").innerText)));
  conf("sem a via, o Gerar o caso fica travado",
    await p.evaluate(() => { const b = [...document.querySelectorAll(".pc-acao button")]
      .find(x => /Gerar o caso/.test(x.innerText)); return b && b.disabled; }));
  await p.evaluate(([cli, id]) => mudarPreCaso(cli, id, "via", "adm"), [CLI_VAZIO, pcId]);
  await p.waitForTimeout(400);
  conf("via administrativa: 20% sobre as parcelas aparece nos honorários",
    /via administrativa: 20% sobre as parcelas recebidas/.test(
      await p.evaluate(() => document.querySelector(".caixa-atend").innerText)));
  conf("e destrava o Gerar o caso, com a fase INSS pré-escolhida",
    await p.evaluate(id => { const b = [...document.querySelectorAll(".pc-acao button")]
      .find(x => /Gerar o caso/.test(x.innerText));
      return b && !b.disabled && document.getElementById("pcf-" + id).value === "inss"; }, pcId));

  // ── 4. honorários: o padrão do escritório e o ajuste que entra no contrato
  conf("o padrão do escritório aparece pelo tipo de benefício",
    /Padrão do escritório/.test(await p.evaluate(() => document.querySelector(".caixa-atend").innerText))
    && /20% sobre os 6 primeiros/.test(await p.evaluate(() => document.querySelector(".caixa-atend").innerText)));
  conf("a cláusula completa do contrato está a um clique",
    await p.evaluate(() => [...document.querySelectorAll(".caixa-atend details summary")]
      .some(x => /ver a cláusula completa/.test(x.innerText))));
  // F33 · a lista de documentos nasce FECHADA, com o resumo no título
  conf("o bloco 2 dos documentos nasce fechado, só o título à vista",
    await p.evaluate(() => {
      const d = [...document.querySelectorAll(".caixa-atend details")]
        .find(x => /2 · documentos/i.test((x.querySelector("summary") || {}).innerText || ""));
      return d && !d.open;
    }));
  conf("e o título resume a lista sem expor os itens",
    await p.evaluate(() => {
      const s = [...document.querySelectorAll(".caixa-atend details summary")]
        .find(x => /2 · documentos/i.test(x.innerText));
      return s && /lista de \d+ itens/.test(s.innerText)
        && !/Documentos médicos/.test(s.parentElement.innerText.split("\n")[0]);
    }));
  conf("o clique abre a lista inteira",
    await p.evaluate(() => {
      const d = [...document.querySelectorAll(".caixa-atend details")]
        .find(x => /2 · documentos/i.test((x.querySelector("summary") || {}).innerText || ""));
      d.open = true;
      const tem = d.querySelectorAll(".at-doc").length > 0;
      d.open = false;
      return tem;
    }));
  escritos.length = 0;
  await p.evaluate(([cli, id]) => mudarPreCaso(cli, id, "honorarios", "15% sobre as parcelas, ajuste de balcão"), [CLI_VAZIO, pcId]);
  await p.waitForTimeout(500);
  conf("o ajuste grava por variante no cadastro do cliente",
    escritos.some(x => x.m === "PATCH" && x.t === "clientes"
      && (((x.corpo.campos || {}).honor_ajuste) || {}).incapacidade === "15% sobre as parcelas, ajuste de balcão"));
  conf("e o CONTRATO impresso sai com a disposição expressa em contrário",
    await p.evaluate(cli => {
      const d = corpoDoDoc("contrato", D.cliPorId.get(cli), "Aux. Incapacidade Temporária (B31)");
      return /DISPOSIÇÃO EXPRESSA EM CONTRÁRIO/.test(d.corpo)
        && /15% sobre as parcelas, ajuste de balcão/.test(d.corpo);
    }, CLI_VAZIO));

  // ── F31: os documentos do escritório logo abaixo do criar caso ──────────
  const caixaTxt = await p.evaluate(() =>
    (document.querySelector(".caixa-atend .caixa-docs") || {}).innerText || "");
  conf("a procuração e a declaração de pobreza estão logo abaixo do Gerar o caso",
    /Documentos para o cliente assinar/i.test(caixaTxt) && /Procuração/i.test(caixaTxt)
    && /pobreza/i.test(caixaTxt));
  conf("e o contrato anunciado segue a espécie do PRÉ-CASO (incapacidade)",
    /Benefícios por incapacidade/i.test(caixaTxt));

  // ── 5. Somente gerar lembrete: Anotações some, notas vão a Lembretes ────
  await p.evaluate(cli => salvarNotaAtendimento2 && (document.getElementById("at-nota").value =
    "Vai juntar os exames e volta em setembro."), CLI_VAZIO);
  await p.evaluate(cli => salvarNotaAtendimento2(cli), CLI_VAZIO);
  await p.waitForTimeout(500);
  await p.evaluate(id => { document.getElementById("pcl-data-" + id).value = "2027-03-01"; }, pcId);
  escritos.length = 0;
  await p.evaluate(([cli, id]) => preCasoParaLembrete(cli, id), [CLI_VAZIO, pcId]);
  await p.waitForTimeout(700);
  conf("o lembrete nasce com o título do benefício",
    escritos.some(x => x.m === "POST" && x.t === "lembretes"
      && /Aux\. Incapacidade.*virou lembrete/.test(x.corpo.titulo)));
  // o lembrete leva à aba Lembretes; volta ao Cadastro para conferir o trilho
  await p.click('button.mt[data-vv="0"]');
  await p.waitForTimeout(400);
  const t5 = await trilho();
  conf(`as Anotações somem do trilho — o atendimento se resolveu (${t5.join(" · ")})`,
    t5.length > 0 && !t5.some(x => /^Anotações/.test(x)));
  conf("e no lugar fica o + atendimento para a próxima vinda",
    t5.some(x => /\+ atendimento/.test(x)));
  await p.evaluate(() => { const b = [...document.querySelectorAll(".menu-topo .mt")]
    .find(x => /Lembretes/.test(x.innerText)); if (b) b.click(); });
  await p.waitForTimeout(400);
  conf("a aba Lembretes mostra as anotações do atendimento que virou lembrete",
    /Vai juntar os exames/.test(await p.evaluate(() =>
      (document.querySelector('.painel[data-p="9"].ativo') || {}).innerText || "")));

  // ── 6. cliente com caso: Documentos existe, Anotações só com atendimento ─
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForSelector('button.mt[data-vv="0"]');
  await p.click('button.mt[data-vv="0"]');
  await p.waitForTimeout(400);
  const tCheio = await trilho();
  conf(`com caso: Documentos no trilho, Triagem ainda aberta, Anotações recolhida (${tCheio.join(" · ")})`,
    tCheio.some(x => /Documentos/.test(x)) && tCheio.some(x => /Triagem/.test(x))
    && !tCheio.some(x => /^Anotações/.test(x))
    && tCheio.some(x => /\+ atendimento/.test(x)));
  await p.evaluate(() => { const b = [...document.querySelectorAll('.painel[data-p="0"].ativo .sub-menu button')]
    .find(x => /\+ atendimento/.test(x.innerText)); if (b) b.click(); });
  await p.waitForTimeout(600);
  conf("o + atendimento abre a mesa também para quem já tem caso",
    await p.evaluate(() => !!document.querySelector(".caixa-atend"))
    && (await trilho()).some(x => /Anotações/.test(x)));

  // ── 7. F31: o menu Documentos incorporou a Consulta ─────────────────────
  conf("o botão Consulta saiu do trilho",
    !(await trilho()).some(x => /^Consulta/.test(x)));
  await p.evaluate(() => irSubCad("documentos"));
  await p.waitForTimeout(500);
  const docPainel = await p.evaluate(() =>
    (document.querySelector('.painel[data-p="0"].ativo') || {}).innerText || "");
  conf("o painel Documentos traz os documentos para assinar E a consulta",
    /Documentos para o cliente assinar/i.test(docPainel)
    && /Consultas com o CPF/i.test(docPainel) && /IN 128/i.test(docPainel));
  conf("e o caminho antigo irSubCad('consulta') cai no lugar certo",
    await p.evaluate(() => { irSubCad("consulta"); return subCad === "documentos"; }));

  console.log("=== o fluxo do atendimento (F30) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
