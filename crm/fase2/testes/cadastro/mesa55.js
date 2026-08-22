// F55 — a ficha respira: a mesa se arruma sozinha (bloco resolvido vira
// linha verde informativa; mexeu, fica aberto; trocou de cliente, arruma de
// novo), a linha-guia diz o que falta, o rodapé fala português em cápsulas
// com a frase-viva, e o prazo fatal sai direto da anotação.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CLI_VAZIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const EU2 = "22222222-2222-2222-2222-222222222222";
FIX.colaboradores.push({ id: EU2, auth_id: null, nome: "Marcos Fictício", inicial: "M",
  cor: "#7a3ccf", ativo: true });

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

  // ── a mesa do CLI_VAZIO: triagem encerrada em memória, sub-aba anotações
  const irMesa = async cli => { await p.evaluate(cli => { const c = D.cliPorId.get(cli);
      c.triagem = { ...(c.triagem || {}), atendimento: { em: hoje(), quem: eu.id, passos: 8, conferidos: 8 } };
      abrirFicha(cli); }, cli);
    await p.waitForTimeout(600);
    await p.evaluate(() => irSubCad("anotacoes")); await p.waitForTimeout(300); };
  await irMesa(CLI_VAZIO);
  await p.waitForTimeout(700);

  // 1) a linha-guia fala com o leigo: sem atendimento aberto, diz por onde começar
  conf("a linha-guia âmbar diz o que falta (sem atendimento: abrir o passo 1)",
    await p.evaluate(() => { const g = document.querySelector(".mesa-guia.falta");
      return g && /Falta fazer/.test(g.textContent) && /abrir o atendimento/.test(g.textContent); }));

  // 2) espécie + natureza definidas COM a ficha aberta: o bloco NÃO recolhe
  //    embaixo da mão de quem edita (mexeu → fica aberto)
  await p.evaluate(cli => novoPreCaso(cli), CLI_VAZIO);
  await p.waitForTimeout(500);
  const pcId = await p.evaluate(cli => precasosDe(D.cliPorId.get(cli))[0].id, CLI_VAZIO);
  await p.evaluate(([cli, id]) => mudarPreCaso(cli, id, "especie", "Apos. Tempo de Contribuição"), [CLI_VAZIO, pcId]);
  await p.waitForTimeout(400);
  await p.evaluate(([cli, id]) => mudarPreCaso(cli, id, "natureza", "concessao"), [CLI_VAZIO, pcId]);
  await p.waitForTimeout(400);
  conf("editando, o bloco 1 continua aberto (não foge da mão)",
    await p.evaluate(() => { const d = [...document.querySelectorAll("details.mesa-feito")]
        .find(x => /1 · De que se trata/.test(x.textContent));
      return !d || d.open; }));

  // 3) fechou e reabriu a ficha: a mesa se arruma — bloco 1 vira linha verde
  //    que INFORMA a decisão (espécie · natureza) com o "alterar" à vista
  await p.evaluate(() => fecharFicha(false));
  await irMesa(CLI_CHEIO);            // troca de cliente limpa o aberto-à-mão
  await p.waitForTimeout(500);
  await p.evaluate(() => fecharCaixa());  // CLI_CHEIO tem 2 processos → modal
  await p.evaluate(() => fecharFicha(false));
  await irMesa(CLI_VAZIO);
  await p.waitForTimeout(700);
  conf("ficha reaberta: bloco 1 recolhido numa linha verde com a decisão",
    await p.evaluate(() => { const d = [...document.querySelectorAll("details.mesa-feito")]
        .find(x => /Apos\. Tempo de Contribuição/.test((x.querySelector("summary") || {}).textContent || ""));
      return d && !d.open && /concessão/.test(d.querySelector("summary").textContent) &&
        /alterar/.test(d.querySelector("summary").textContent); }));
  conf("a linha-guia já não pede espécie — pede a análise de direito",
    await p.evaluate(() => { const g = document.querySelector(".mesa-guia");
      return g && !/definir a espécie/.test(g.textContent) && /análise de direito/.test(g.textContent); }));

  // 4) clicar na linha reabre, e o aberto SOBREVIVE à repintura
  await p.evaluate(() => { const d = [...document.querySelectorAll("details.mesa-feito")]
      .find(x => /1 · De que se trata/.test(x.textContent)); d.open = true; });
  await p.waitForTimeout(200);
  await p.evaluate(() => repintarFicha());
  await p.waitForTimeout(500);
  conf("aberto no toque, continua aberto depois da repintura (mesaAberta)",
    await p.evaluate(() => { const d = [...document.querySelectorAll("details.mesa-feito")]
        .find(x => /1 · De que se trata/.test(x.textContent)); return d && d.open; }));

  // 5) honorários vive recolhido com o PADRÃO à vista na própria linha
  conf("honorários recolhido diz o padrão do escritório na linha",
    await p.evaluate(() => [...document.querySelectorAll("details.mesa-feito summary")]
      .some(x => /Honorários/.test(x.textContent) && /Padrão do escritório/.test(x.textContent))));

  // 6) o rodapé fala português: as cápsulas perguntam, os chips têm NOME
  conf("as cápsulas perguntam em português (marcar/quem/quando/prazo)",
    await p.evaluate(() => { const t = [...document.querySelectorAll(".capsula .cap-perg")]
        .map(x => x.textContent).join("|");
      return /Como marcar\?/.test(t) && /Quem cuida disso\?/.test(t) &&
        /Lembrar quando\?/.test(t) && /Prazo fatal\?/.test(t); }));
  conf("o chip de atribuir mostra o NOME do colaborador, não só a inicial",
    await p.evaluate(() => [...document.querySelectorAll(".at-eq")]
      .some(b => /Marcos/.test(b.textContent))));

  // 7) a frase-viva confirma o efeito antes do clique
  await p.fill("#at-nota", "Cobrar a certidão que faltou.");
  await p.click('.at-eq[data-atq="' + EU2 + '"]');
  await p.click('button:has-text("Amanhã") >> nth=0');
  await p.evaluate(() => { document.getElementById("at-urg").checked = true; atualizarFraseNota(); });
  conf("a frase-viva diz: urgente + avisa Marcos + lembrete na data",
    await p.evaluate(() => { const f = document.getElementById("at-frase").textContent;
      return /urgente/.test(f) && /avisa Marcos/.test(f) && /lembrete para/.test(f); }));

  // 8) prazo fatal SEM caso em andamento: barra e explica, nada grava
  await p.evaluate(() => { document.getElementById("at-prazo").value = "2026-09-10"; });
  escritos.length = 0;
  await p.evaluate(cli => salvarNotaAtendimento2(cli), CLI_VAZIO);
  await p.waitForTimeout(400);
  conf("sem caso, o prazo fatal é barrado com aviso claro",
    escritos.length === 0 && await p.evaluate(() =>
      /Prazo fatal pede caso/.test(document.getElementById("aviso").textContent)));

  // 9) prazo fatal COM caso: a nota sai [PRAZO] e o caso vai para 🗓
  await p.evaluate(() => fecharFicha(false));
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForTimeout(700);
  await p.evaluate(([cli, caso]) => { const m = document.getElementById("modal");
    if (m && m.style.display !== "none") escolhido(cli, caso); }, [CLI_CHEIO, CASO1]);
  await p.waitForTimeout(600);
  await p.click('button.mt[data-vv="0"]');   // a mesa vive na aba Cadastro
  await p.waitForTimeout(400);
  // com caso e SEM pré-caso a divisão Anotações nem existe (regra F29/F30):
  // o cenário real do prazo fatal é atendimento novo + caso ativo
  await p.evaluate(cli => novoPreCaso(cli), CLI_CHEIO);
  await p.waitForTimeout(500);
  await p.evaluate(() => irSubCad("anotacoes"));
  await p.waitForTimeout(500);
  await p.fill("#at-nota", "Protocolar a réplica.");
  await p.evaluate(() => { document.getElementById("at-prazo").value = "2026-09-01"; atualizarFraseNota(); });
  conf("a frase-viva avisa do PRAZO FATAL e do 🗓",
    await p.evaluate(() => /PRAZO FATAL/.test(document.getElementById("at-frase").textContent)));
  escritos.length = 0;
  await p.evaluate(cli => salvarNotaAtendimento2(cli), CLI_CHEIO);
  await p.waitForTimeout(600);
  conf("a nota sai prefixada ⏰ [PRAZO 01.09.2026]",
    escritos.some(x => x.m === "PATCH" && x.t === "clientes" &&
      ((x.corpo.campos || {}).atendimento || []).some(n => /\[PRAZO 01\.09\.2026\] Protocolar a réplica/.test(n.texto))));
  conf("e o caso vai para 🗓 Tarefas com Prazo com a data fatal",
    escritos.some(x => x.m === "PATCH" && x.t === "casos" &&
      x.corpo.prazo === "2026-09-01" && x.corpo.mover_para === "🗓 Tarefas com Prazo"));

  // 10) análise registrada hoje → na reabertura o bloco 4 vira linha verde
  await p.evaluate(() => fecharFicha(false));
  await irMesa(CLI_VAZIO);
  await p.waitForTimeout(600);
  await p.evaluate(() => {
    document.getElementById("ad-contexto").value = "Primeira conversa.";
    const r = document.querySelector("#ad-cens .ad-row");
    r.querySelector(".ad-regra").value = "Pontos";
  });
  await p.evaluate(cli => salvarAnalise(cli), CLI_VAZIO);
  await p.waitForTimeout(800);
  conf("análise salva: o bloco 4 recolhe em 'registrada hoje'",
    await p.evaluate(() => [...document.querySelectorAll("details.mesa-feito summary")]
      .some(x => /Análise de Direito — registrada hoje/.test(x.textContent))));

  console.log("=== F55 · a ficha respira ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
