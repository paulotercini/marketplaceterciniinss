// F24 — a porta de entrada da triagem, as perguntas do escritório e o
// encerramento que manda o resumo para as Anotações.
//
//   1. sem espécie no caso, a triagem pergunta "de qual caso se trata?" —
//      responder abre os pontos da família; "ainda não sei" deixa só o padrão
//   2. a advogada acrescenta perguntas que valem para TODOS os clientes,
//      com autor e data, e pode tirá-las
//   3. encerrar com atenção/não conferido manda o resumo para as Anotações;
//      sem pendência, as Anotações ficam limpas
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CLI_VAZIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

// o caso do cliente cheio fica SEM espécie: é o cenário da porta
FIX.casos[0] = { ...FIX.casos[0], beneficio: "" };

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
    localStorage.setItem("crm_subcad", "triagem");
  }, [SUPA, SESSAO]);
  const escritos = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      escritos.push({ m, t, corpo: JSON.parse(rota.request().postData() || "{}") });
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
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);

  const abrir = async cli => {
    await p.evaluate(x => abrirFicha(x), cli);
    await p.waitForSelector('button.mt[data-vv="0"]');
    await p.click('button.mt[data-vv="0"]');
    await p.evaluate(() => irSubCad("triagem"));
    await p.waitForSelector(".tri-lista");
    await p.waitForTimeout(250);
  };
  await abrir(CLI_CHEIO);

  // ── 1. a porta ──────────────────────────────────────────────────────────
  conf("sem espécie no caso, a porta pergunta de qual caso se trata",
    /De qual caso se trata\?/.test(await p.innerText(".tri-porta")));
  const ops = await p.evaluate(() =>
    [...document.querySelectorAll(".tri-porta .tri-p")].map(x => x.innerText.trim()));
  conf(`as famílias são as opções (${ops.length}), mais o "ainda não sei"`,
    ops.length >= 12 && ops.includes("BPC/LOAS") && ops.includes("ainda não sei"));
  conf("antes de responder, ficam só os passos padrão",
    (await p.evaluate(() => document.querySelectorAll(".tri-passo").length)) === 8);

  // responder BPC abre os pontos da família
  escritos.length = 0;
  await p.evaluate(cli => responderPorta(cli, "BPC/LOAS", true), CLI_CHEIO);
  await p.waitForTimeout(600);
  conf("responder abre os pontos daquela família",
    (await p.evaluate(() => document.querySelectorAll(".tri-passo").length)) === 12);
  const pat = escritos.find(x => x.m === "PATCH" && x.t === "clientes");
  conf("a resposta fica gravada com autor e data",
    pat && pat.corpo.triagem.porta && pat.corpo.triagem.porta.quem === EU
    && pat.corpo.triagem.porta.especie === "BPC/LOAS");
  conf("a faixa da espécie aparece, como se o caso a tivesse",
    /BPC\/LOAS/.test(await p.evaluate(() => (document.querySelector(".tri-especie") || {}).textContent || "")));

  // trocar → "ainda não sei" volta ao padrão
  await p.evaluate(cli => responderPorta(cli, null, null), CLI_CHEIO);
  await p.waitForTimeout(400);
  await p.evaluate(cli => responderPorta(cli, null, false), CLI_CHEIO);
  await p.waitForTimeout(500);
  conf('"ainda não sei" deixa só os oito passos padrão',
    (await p.evaluate(() => document.querySelectorAll(".tri-passo").length)) === 8);
  conf("e a porta mostra a resposta dada",
    /ainda não sabemos/.test(await p.innerText(".tri-porta")));

  // com espécie no CASO, a porta nem aparece
  await p.evaluate(caso => { D.casoPorId.get(caso).beneficio = "Rural"; }, CASO1);
  await p.evaluate(() => repintarFicha());
  await p.waitForTimeout(400);
  conf("com a espécie no caso, a porta não aparece (o caso responde por ela)",
    !(await p.$(".tri-porta")));
  conf("e a família do caso manda, mesmo com a porta respondida diferente",
    /Rural e híbrida/.test(await p.evaluate(() => (document.querySelector(".tri-especie") || {}).textContent || "")));
  await p.evaluate(caso => { D.casoPorId.get(caso).beneficio = ""; }, CASO1);

  // ── 2. as perguntas do escritório ───────────────────────────────────────
  escritos.length = 0;
  await p.fill("#tq-nova", "O cliente tem advogado anterior no caso?");
  await p.evaluate(() => novaPerguntaEscritorio());
  await p.waitForTimeout(600);
  const cfg = escritos.find(x => x.t === "config_app");
  conf("a pergunta grava em config_app — vale para TODOS os clientes",
    cfg && /advogado anterior/.test(JSON.stringify(cfg.corpo)));
  conf("com autor e data", cfg && new RegExp(EU).test(JSON.stringify(cfg.corpo)));
  await p.waitForTimeout(300);
  const passos = await p.evaluate(() =>
    [...document.querySelectorAll(".tri-passo .tri-tit b")].map(x => x.innerText.trim()));
  conf(`a pergunta aparece como passo (${passos.length} passos)`,
    passos.some(x => /advogado anterior/.test(x)));
  conf("com a etiqueta do escritório",
    await p.$(".tri-de-esc"));
  // em OUTRO cliente também
  await abrir(CLI_VAZIO);
  conf("e vale para outro cliente também",
    (await p.evaluate(() =>
      [...document.querySelectorAll(".tri-passo .tri-tit b")].map(x => x.innerText.trim())))
      .some(x => /advogado anterior/.test(x)));
  // tirar
  await p.evaluate(() => tirarPerguntaEscritorio(perguntasDoEscritorio()[0].chave));
  await p.waitForTimeout(500);
  conf("tirar remove de todos",
    !(await p.evaluate(() =>
      [...document.querySelectorAll(".tri-passo .tri-tit b")].map(x => x.innerText.trim())))
      .some(x => /advogado anterior/.test(x)));

  // ── 3. o encerramento e as Anotações ────────────────────────────────────
  // com pendência → resumo nas Anotações
  await abrir(CLI_CHEIO);
  await p.evaluate(cli => { const c = D.cliPorId.get(cli);
    c.campos = { ...(c.campos || {}), atendimento: [] };
    c.triagem = { cnis: { estado: "atencao", nota: "faltam 3 vínculos" },
      judicial: { estado: "ok" } }; }, CLI_CHEIO);
  await p.evaluate(() => repintarFicha());
  await p.waitForTimeout(300);
  escritos.length = 0;
  await p.click(".tri-fecho button");
  await p.waitForTimeout(800);
  // fecharAtendimento termina com carregar(), que no arneço REPÕE a fixtura
  // e apaga o que só existia na memória — na produção o PATCH persistiu e a
  // recarga o traz de volta. A prova certa aqui é o PATCH capturado.
  const patN = escritos.filter(x => x.m === "PATCH" && x.t === "clientes"
    && x.corpo.campos && (x.corpo.campos.atendimento || []).length).pop();
  const notas = patN ? patN.corpo.campos.atendimento : [];
  conf(`com atenção, o resumo vai para as Anotações (${notas.length} nota)`,
    notas.length === 1 && /ATENÇÃO: CNIS \(faltam 3 vínculos\)/.test(notas[0].texto));
  conf("o resumo lista também o não conferido", /NÃO CONFERIDO:/.test((notas[0] || {}).texto || ""));
  conf("assinado por quem encerrou", notas[0] && !!notas[0].quem);
  conf("e o caso recebe a linha de sempre",
    escritos.some(x => x.t === "andamentos" && /triagem conferida/.test(x.corpo.texto || "")));

  // sem pendência → Anotações limpas
  await p.evaluate(cli => { const c = D.cliPorId.get(cli);
    c.campos = { ...(c.campos || {}), atendimento: [] };
    const t = {};
    triagemPassosDe(c, D.casosDoCliente.get(cli) || []).forEach(([k]) => t[k] = { estado: "ok" });
    c.triagem = t; }, CLI_CHEIO);
  await p.evaluate(() => repintarFicha());
  await p.waitForTimeout(300);
  escritos.length = 0;
  await p.click(".tri-fecho button");
  await p.waitForTimeout(800);
  conf("sem pendência, as Anotações ficam limpas",
    !escritos.slice(escritos.length - 6).some(x => x.m === "PATCH" && x.t === "clientes"
      && x.corpo.campos && (x.corpo.campos.atendimento || []).length));

  const cartao = await p.$(".tri-porta");
  await abrir(CLI_VAZIO);
  const pt = await p.$(".tri-porta");
  if (pt) await pt.screenshot({ path: path.join(__dirname, "f24-porta.png") });

  console.log("=== porta da triagem e perguntas do escritório (F24) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
