// F54 — o pacote do Paulo: (1) a tela do PJe de volta na aba CNJ; (2) nome
// completo + telefone obrigatórios no cadastro pela anotação rápida; (3) o
// vínculo da triagem viajando para a análise de direito; (4) incapacidade
// pergunta a cidade e abre o checklist; (5) Pendências em aberto no topo.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CLI_VAZIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const NUM = "1234567-89.2026.4.03.6106";
// (1) caso judicial com o processo NA LISTA (sem principal) e coleta do PJe
// SEM o número no texto — o cenário que escondia a tela
FIX.casos[0] = { ...FIX.casos[0], processo: null, processos: [NUM], fase: "judicial", datajud: null };
FIX.andamentos = [
  { id: "a0000000-0000-0000-0000-0000000pje54", caso_id: CASO1, autor_id: EU, origem: "pje",
    criado_em: "2026-08-18T15:00:00Z", andamentos_lidos: [],
    texto: "Expedição de intimação eletrônica — prazo de 15 dias." },
];
// (5) notas do atendimento do CLI_VAZIO: uma urgente antiga, uma pendente e
// uma comum — só as duas primeiras podem aparecer no quadro
FIX.clientes[1] = { ...FIX.clientes[1],
  campos: { atendimento: [
    { em: "2026-08-01T10:00:00Z", quem: "P", autor_id: EU, texto: "Pedir a CTPS antiga ao cliente.", urgente: true },
    { em: "2026-08-05T10:00:00Z", quem: "P", autor_id: EU, texto: "Confirmar endereço para a procuração.", pendente: true },
    { em: "2026-08-10T10:00:00Z", quem: "P", autor_id: EU, texto: "Cliente avisado do andamento." },
  ] } };
// catálogo de documentos da incapacidade, para o checklist ter itens
FIX.documentos_beneficio = [...FIX.documentos_beneficio,
  { id: "e0000000-0000-0000-0000-000000000054", beneficio: "Auxílio-doença",
    itens: "RG\nCPF\nLaudos médicos recentes", extras: "", observacoes: "" }];

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
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);

  // ── 1 · a tela do PJe voltou ─────────────────────────────────────────────
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForTimeout(900);
  await p.evaluate(() => { subAba = "cnj"; repintarFicha(); });
  await p.waitForTimeout(400);
  conf("caso com um processo na lista mostra a coleta do PJe direto",
    await p.evaluate(() => /coletas do PJe/.test((document.querySelector('[data-p="2"]') || {}).textContent || "") &&
      /intimação eletrônica/.test((document.querySelector('[data-p="2"]') || {}).textContent || "")));

  // ── 2 · anotação rápida exige nome completo e telefone ───────────────────
  await p.click("#fab-rapida");
  await p.waitForTimeout(300);
  await p.fill("#ar-busca", "Otavio");
  await p.evaluate(() => arProcurar("Otavio"));
  await p.waitForTimeout(200);
  await p.evaluate(() => arNovoCliente());
  await p.waitForTimeout(200);
  conf("nome sem sobrenome é recusado no cadastro",
    await p.evaluate(() => !arNovo && /nome COMPLETO/.test(document.getElementById("aviso").textContent)));
  await p.fill("#ar-busca", "Otavio Recem Chegado");
  await p.evaluate(() => arNovoCliente());
  await p.waitForTimeout(200);
  conf("com nome completo, o campo do telefone aparece",
    await p.evaluate(() => !!document.getElementById("ar-tel")));
  await p.fill("#ar-texto", "Quer agendar atendimento para amanhã.");
  escritos.length = 0;
  await p.evaluate(() => salvarAnotacaoRapida());
  await p.waitForTimeout(300);
  conf("sem telefone, nada grava e o sistema avisa",
    escritos.length === 0 && await p.evaluate(() => /Telefone com DDD/.test(document.getElementById("aviso").textContent)));
  await p.fill("#ar-tel", "16 99999-0000");
  await p.evaluate(() => salvarAnotacaoRapida());
  await p.waitForTimeout(500);
  conf("com telefone, o cliente novo nasce com nome e telefone",
    escritos.some(x => x.m === "POST" && x.t === "clientes" &&
      x.corpo.nome === "Otavio Recem Chegado" && /99999/.test(x.corpo.telefone || "")));

  // ── 3 · o vínculo da triagem viaja para a análise ────────────────────────
  await p.evaluate(cli => abrirFicha(cli), CLI_VAZIO);
  await p.waitForTimeout(900);
  conf("a triagem pergunta o vínculo com a Previdência hoje",
    await p.evaluate(() => !!document.getElementById("tri-vinc")));
  escritos.length = 0;
  await p.evaluate(cli => {
    document.getElementById("tri-vinc").value = "empregado";
    document.getElementById("tri-vinc-desde").value = "2015-03";
    salvarVinculoTriagem(cli);
  }, CLI_VAZIO);
  await p.waitForTimeout(400);
  conf("a resposta grava na triagem (empregado desde 03/2015)",
    escritos.some(x => x.m === "PATCH" && x.t === "clientes" &&
      ((x.corpo.triagem || {}).vinculo || {}).tipo === "empregado" &&
      (x.corpo.triagem.vinculo.desde === "2015-03")));
  // triagem encerrada (memória) para abrir a mesa e registrar a análise
  await p.evaluate(cli => { const c = D.cliPorId.get(cli);
    c.triagem = { ...(c.triagem || {}), atendimento: { em: hoje(), quem: eu.id, passos: 8, conferidos: 8 } };
    irSubCad("anotacoes"); }, CLI_VAZIO);
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    document.getElementById("ad-contexto").value = "Primeira conversa sobre aposentadoria.";
    const r = document.querySelector("#ad-cens .ad-row");
    r.querySelector(".ad-regra").value = "Pontos";
  });
  escritos.length = 0;
  await p.evaluate(cli => salvarAnalise(cli), CLI_VAZIO);
  await p.waitForTimeout(800);
  conf("a análise sai com o vínculo da triagem anexado ao contexto",
    escritos.some(x => x.m === "POST" && x.t === "analises_direito" &&
      /Vínculo \(triagem\): Empregado \(CLT\) desde 03\/2015/.test(x.corpo.contexto || "")));

  // ── 5 · Pendências em aberto no topo das Anotações ───────────────────────
  await p.waitForTimeout(400);
  conf("o quadro prende as DUAS pendências (urgente antiga + marcada), não a comum",
    await p.evaluate(() => { const q = [...document.querySelectorAll('[data-p="0"] .rotulo-caso')]
        .find(r => /Pendências em aberto/.test(r.textContent));
      return q && /\(2\)/.test(q.textContent) &&
        /Pedir a CTPS antiga/.test(q.parentElement.textContent) &&
        /Confirmar endereço/.test(q.parentElement.textContent) &&
        !/Cliente avisado do andamento/.test(q.parentElement.textContent); }));
  escritos.length = 0;
  await p.evaluate(cli => resolverNotaAtendimento(cli, 0), CLI_VAZIO);
  await p.waitForTimeout(500);
  conf("Resolvida grava o selo e tira do quadro",
    escritos.some(x => x.m === "PATCH" && x.t === "clientes" &&
      ((x.corpo.campos || {}).atendimento || [])[0] && x.corpo.campos.atendimento[0].resolvida) &&
    await p.evaluate(() => { const q = [...document.querySelectorAll('[data-p="0"] .rotulo-caso')]
        .find(r => /Pendências em aberto/.test(r.textContent));
      return q && /\(1\)/.test(q.textContent); }));
  conf("a nota resolvida ganha o selo verde na lista",
    await p.evaluate(() => /resolvida/.test([...document.querySelectorAll('[data-p="0"] .chip.verde')]
      .map(x => x.textContent).join(" "))));

  // ── 4 · incapacidade: cidade + checklist aberto ──────────────────────────
  await p.evaluate(cli => novoPreCaso(cli), CLI_VAZIO);
  await p.waitForTimeout(500);
  const pcId = await p.evaluate(cli => precasosDe(D.cliPorId.get(cli))[0].id, CLI_VAZIO);
  await p.evaluate(([cli, id]) => mudarPreCaso(cli, id, "especie", "Auxílio-doença"), [CLI_VAZIO, pcId]);
  await p.waitForTimeout(500);
  conf("benefício por incapacidade pergunta a cidade",
    await p.evaluate(() => !!document.querySelector('[data-p="0"] input[placeholder="cidade do cliente"]')));
  conf("o checklist de documentos nasce ABERTO para incapacidade",
    await p.evaluate(() => { const d = [...document.querySelectorAll('[data-p="0"] details')]
        .find(x => /2 · Documentos/.test(x.textContent));
      return d && d.open && /Laudos médicos recentes/.test(d.textContent); }));
  await p.evaluate(([cli, id]) => mudarPreCaso(cli, id, "cidade", "Monte Alto"), [CLI_VAZIO, pcId]);
  await p.waitForTimeout(400);
  conf("a cidade fica gravada no pré-caso",
    (await p.evaluate(cli => precasosDe(D.cliPorId.get(cli))[0].cidade, CLI_VAZIO)) === "Monte Alto");

  console.log("=== o pacote F54 ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
