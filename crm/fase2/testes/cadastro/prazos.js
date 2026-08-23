// F38 — Tarefas com Prazo e o deferido que continua (cumprimento de sentença).
//
//   1. a anotação com ⏰ exige a DATA FATAL, prefixa o andamento e move o
//      caso para 🗓 Tarefas com Prazo (fase outro + mover_para), guardando
//      de onde veio em ronda.prazo_de
//   2. a lista 🗓 ordena pela data fatal (mais urgente no topo)
//   3. "✔ prazo cumprido" propõe devolver à lista de ORIGEM, com seletor
//      para trocar — e registra tudo na linha do tempo
//   4. no Encerrar, o 3º caminho: deferido com cumprimento de sentença
//      lança os honorários SEM mudar a fase — o caso segue na lista
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

// o caso vive em 👪 Judicial — o cenário do prazo processual
FIX.casos[0] = { ...FIX.casos[0], fase: "judicial", origem_lista: "👪 Judicial",
  beneficio: "Apos. Tempo de Contribuição" };

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
      const corpo = JSON.parse(rota.request().postData() || "null");
      escritos.push({ m, t, u, corpo });
      if (m === "POST" && (t === "andamentos" || t === "pagamentos"))
        return rota.fulfill({ status: 201, contentType: "application/json",
          body: JSON.stringify([{ id: t.slice(0, 2) + "999999-9999-9999-9999-999999999999", ...corpo }]) });
      return rota.fulfill({ status: 204, body: "" });
    }
    let corpo = FIX[t] || [];
    const fc = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (fc) corpo = corpo.filter(x => x.cliente_id === fc[1]);
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

  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForTimeout(700);
  await p.evaluate(caso => { casoSel = caso;
    const m = document.getElementById("modal"); if (m) m.innerHTML = "";
    abaAtiva = 2; pintarFicha(); }, CASO1);
  await p.waitForTimeout(400);

  // ── 1. a anotação vira tarefa com prazo ─────────────────────────────────
  conf("o compositor oferece o ⏰ tarefa com prazo",
    await p.evaluate(() => !!document.getElementById("and-prazo-ck")));
  await p.evaluate(() => { document.getElementById("and-texto").value =
    "Contestar o laudo pericial — prazo fatal."; });
  // a caixa "para quem/quando" do compositor barra antes do prazo: responde
  await p.evaluate(() => { tfQuem = []; tfData = null; });
  await p.evaluate(() => { document.getElementById("and-prazo-ck").checked = true; });
  escritos.length = 0;
  await p.evaluate(caso => novoAndamento(caso), CASO1);
  await p.waitForTimeout(400);
  conf("sem a data fatal, o registro é barrado",
    !escritos.some(x => x.m === "POST" && x.t === "andamentos"));
  await p.evaluate(() => { document.getElementById("and-prazo-data").value = "2026-09-01"; tfQuem = []; tfData = null; });
  escritos.length = 0;
  await p.evaluate(caso => novoAndamento(caso), CASO1);
  await p.waitForTimeout(700);
  const postAnd = escritos.find(x => x.m === "POST" && x.t === "andamentos");
  conf("o andamento sai prefixado com o prazo fatal",
    postAnd && /^⏰ \[PRAZO 01\.09\.2026\] Contestar o laudo/.test(postAnd.corpo.texto));
  const patPrazo = escritos.find(x => x.m === "PATCH" && x.t === "casos"
    && x.corpo.mover_para === "🗓 Tarefas com Prazo");
  conf("o caso move para 🗓 Tarefas com Prazo com a data fatal",
    patPrazo && patPrazo.corpo.prazo === "2026-09-01" && patPrazo.corpo.fase === "outro");
  conf("e guarda de onde veio (👪 Judicial), para a volta",
    patPrazo && patPrazo.corpo.ronda.prazo_de === "👪 Judicial");

  // ── 2. a lista ordena pela data fatal ───────────────────────────────────
  conf("a lista 🗓 ordena do mais urgente para o mais folgado",
    await p.evaluate(cliVazio => {
      // segundo caso, de OUTRO cliente, com prazo mais curto: deve vir antes
      D.casos.push({ ...D.casoPorId.get(casoSel), id: "b7777777-7777-7777-7777-777777777777",
        cliente_id: cliVazio, prazo: "2026-08-25", mover_para: "🗓 Tarefas com Prazo", fase: "outro" });
      filtroColab = null;   // o chip do usuário nasce ligado e esconderia o caso sem atribuição
      visao = "fase:prazo"; render();
      const cartoes = [...document.querySelectorAll("#conteudo-meio .cartao")];
      D.casos.pop();
      return cartoes.length === 2 && /Belmiro/.test(cartoes[0].innerText)
        && /Aurélia/.test(cartoes[1].innerText);
    }, "c0000000-0000-0000-0000-000000000002"));

  // ── 3. o prazo cumprido devolve à origem ────────────────────────────────
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForTimeout(600);
  await p.evaluate(caso => { casoSel = caso;
    const m = document.getElementById("modal"); if (m) m.innerHTML = "";
    abaAtiva = 2; pintarFicha(); }, CASO1);
  await p.waitForTimeout(400);
  conf("o caso em 🗓 mostra o chip do prazo e o ✔ prazo cumprido",
    await p.evaluate(() => { const t = document.querySelector(".painel-caso, .painel[data-p=\"2\"]") || document.body;
      return /prazo cumprido/.test(t.innerText) && /fatal 01\.09\.2026/.test(t.innerText); }));
  await p.evaluate(caso => janelaPrazoCumprido(caso), CASO1);
  await p.waitForTimeout(300);
  conf("a janela propõe a lista de ORIGEM (👪 Judicial) já selecionada",
    (await p.evaluate(() => document.getElementById("pz-volta").value)) === "👪 Judicial");
  escritos.length = 0;
  await p.evaluate(() => document.getElementById("pz-ok").click());
  await p.waitForTimeout(600);
  const patVolta = escritos.find(x => x.m === "PATCH" && x.t === "casos");
  conf("devolver limpa o prazo e volta a fase judicial",
    patVolta && patVolta.corpo.fase === "judicial" && patVolta.corpo.prazo === null
    && patVolta.corpo.mover_para === "👪 Judicial" && !patVolta.corpo.ronda.prazo_de);
  conf("com o registro na linha do tempo",
    escritos.some(x => x.m === "POST" && x.t === "andamentos"
      && /\[PRAZO CUMPRIDO\]/.test(x.corpo.texto) && /voltou para 👪 Judicial/.test(x.corpo.texto)));

  // ── 4. deferido que CONTINUA (cumprimento de sentença) ──────────────────
  await p.evaluate(caso => janelaEncerrar(caso), CASO1);
  await p.waitForTimeout(300);
  conf("a janela do Encerrar tem o 3º caminho (o processo continua)",
    /processo CONTINUA/.test(await p.evaluate(() =>
      (document.getElementById("janela") || {}).textContent || "")));
  await p.evaluate(() => { [...document.querySelectorAll("[data-res]")]
    .find(b => /Deferido/.test(b.innerText)).click(); });
  await p.evaluate(() => document.getElementById("hon-segue").click());
  await p.waitForTimeout(200);
  conf("o botão de lançar muda de nome — deixa claro que nada encerra",
    /o caso continua/.test(await p.evaluate(() =>
      document.getElementById("hon-enviar").textContent)));
  await p.evaluate(() => { document.getElementById("hon-valor").value = "4500";
    document.getElementById("hon-venc").value = "2026-10-01"; });
  escritos.length = 0;
  await p.evaluate(() => document.getElementById("hon-enviar").click());
  await p.waitForTimeout(700);
  conf("o pagamento é lançado, vinculado ao caso",
    escritos.some(x => x.m === "POST" && x.t === "pagamentos"
      && x.corpo.valor === "4500" && x.corpo.caso_id));
  conf("o resultado grava SEM mudar a fase (o caso segue em Judicial)",
    escritos.some(x => x.m === "PATCH" && x.t === "casos"
      && x.corpo.resultado === "deferido" && !("fase" in x.corpo)));
  conf("o marco vai à linha do tempo com o cumprimento de sentença nomeado",
    escritos.some(x => x.m === "POST" && x.t === "andamentos"
      && /\[DECISÃO\] Resultado: DEFERIDO/.test(x.corpo.texto)
      && /cumprimento de sentença/.test(x.corpo.texto)));
  conf("na memória, o caso continua em Judicial",
    await p.evaluate(caso => D.casoPorId.get(caso).fase === "judicial", CASO1));

  console.log("=== tarefas com prazo + deferido que continua (F38) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
