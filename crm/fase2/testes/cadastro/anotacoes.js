// F21 — a anotação com tipo, e os três defeitos de layout da aba Casos.
//
// O modelo veio da pesquisa de 16.08.2026 (Clio, MyCase, Notion, Linear,
// Obsidian, Astrea, ADVBOX, Tabelas do CNJ): vocabulário FECHADO de tipos,
// template que dá o esqueleto e a pessoa preenche, autor e hora carimbados,
// sem tipo "OUTROS". O tipo viaja como prefixo [TIPO] no texto — legível no
// To Do, pesquisável, sem coluna nova.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const AND = "a0000000-0000-0000-0000-000000000001";
FIX.andamentos = [
  { id: AND, caso_id: CASO1, autor_id: EU, origem: "app",
    texto: "[EXIGÊNCIA] O que o INSS exigiu: autodeclaração rural\nPrazo para cumprir: 30 dias",
    criado_em: "2026-08-09T10:00:00Z" },
  { id: "a2", caso_id: CASO1, autor_id: EU, origem: "app",
    texto: "Comentário livre, sem tipo, como sempre foi.", criado_em: "2026-08-10T10:00:00Z" },
];
FIX.andamento_tarefas = [{ id: "t1", andamento_id: AND, caso_id: CASO1, colaborador_id: EU,
  atribuido_por: EU, lembrar_em: "2026-08-25", concluida_em: null }];

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
    localStorage.setItem("crm_subaba", "escritorio");
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
        body: rep ? JSON.stringify([{ id: "novo" + escritos.length, ...corpo }]) : "" });
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

  await p.evaluate(([cli, caso]) => abrirFicha(cli).then(() => {
    casoSel = caso; abaAtiva = 2; subAba = "escritorio"; pintarFicha(); }), [CLI_CHEIO, CASO1]);
  await p.waitForSelector("#tipo-fila");
  await p.waitForTimeout(300);

  // ── 1. a fila de tipos ──────────────────────────────────────────────────
  const chips = await p.evaluate(() =>
    [...document.querySelectorAll("#tipo-fila .tipo-ch")].map(x => x.innerText.trim()));
  conf(`os seis tipos, fechados (${chips.join(", ")})`,
    JSON.stringify(chips) === JSON.stringify(["Exigência", "Perícia", "Prova", "Contato", "Decisão", "Protocolo"]));
  conf("não existe o tipo OUTROS nem NOTA — seria o dreno onde tudo cai",
    !chips.some(x => /outro|nota|geral/i.test(x)));
  const estilo = await p.evaluate(() => {
    const c = document.querySelector(".tipo-ch");
    const st = getComputedStyle(c);
    return { fundo: st.backgroundColor, h: Math.round(c.getBoundingClientRect().height) };
  });
  conf(`o chip é discreto, não um botão azul (fundo ${estilo.fundo})`,
    /255, 255, 255/.test(estilo.fundo));
  conf(`e tem alvo de toque (${estilo.h}px)`, estilo.h >= 24);

  // ── 2. clicar preenche o esqueleto ──────────────────────────────────────
  await p.click('[data-tipoand="exigencia"]');
  await p.waitForTimeout(200);
  const v1 = await p.evaluate(() => document.getElementById("and-texto").value);
  conf(`clicar em Exigência preenche o esqueleto (${JSON.stringify(v1.split("\n")[0])})`,
    /^\[EXIGÊNCIA\] O que o INSS exigiu: $/.test(v1.split("\n")[0])
    && /Prazo para cumprir/.test(v1) && /Quem vai cumprir/.test(v1));
  conf("o chip acende",
    await p.evaluate(() => document.querySelector('[data-tipoand="exigencia"]').classList.contains("on")));
  // trocar de tipo com o molde intacto troca o esqueleto inteiro
  await p.click('[data-tipoand="pericia"]');
  await p.waitForTimeout(200);
  const v2 = await p.evaluate(() => document.getElementById("and-texto").value);
  conf(`trocar o tipo troca o esqueleto (${JSON.stringify(v2.split("\n")[0])})`,
    /^\[PERÍCIA\]/.test(v2) && /perito considerou/.test(v2) && !/INSS exigiu/.test(v2));
  // clicar de novo no mesmo tipo desfaz, se ninguém escreveu
  await p.click('[data-tipoand="pericia"]');
  await p.waitForTimeout(200);
  conf("clicar de novo no mesmo tipo limpa o molde intocado",
    (await p.evaluate(() => document.getElementById("and-texto").value)) === "");
  // texto já escrito não é apagado: só o rótulo entra na frente
  await p.evaluate(() => { document.getElementById("and-texto").value = "conversei com a cliente"; });
  await p.click('[data-tipoand="contato"]');
  await p.waitForTimeout(200);
  const v3 = await p.evaluate(() => document.getElementById("and-texto").value);
  conf(`com texto já escrito, só o rótulo entra na frente (${JSON.stringify(v3)})`,
    v3 === "[CONTATO] conversei com a cliente");
  // e trocar o tipo de um texto rotulado troca só o rótulo
  await p.click('[data-tipoand="decisao"]');
  await p.waitForTimeout(200);
  conf("trocar o tipo de texto rotulado troca só o rótulo",
    (await p.evaluate(() => document.getElementById("and-texto").value))
    === "[DECISÃO] conversei com a cliente");

  // ── 3. o registro leva o prefixo, e a linha do tempo mostra o chip ──────
  escritos.length = 0;
  await p.evaluate(() => { tfQuem = []; tfData = null; });
  await p.evaluate(caso => novoAndamento(caso), CASO1);
  await p.waitForTimeout(700);
  const post = escritos.find(x => x.m === "POST" && x.t === "andamentos");
  conf(`o texto gravado leva o prefixo do tipo (${JSON.stringify(((post || {}).corpo || {}).texto)})`,
    post && post.corpo.texto === "[DECISÃO] conversei com a cliente");
  conf("o autor é carimbado pelo sistema, não digitado",
    post && post.corpo.autor_id === EU);

  const tl = await p.evaluate(() => {
    const li = [...document.querySelectorAll(".timeline > li")];
    return li.map(x => ({
      chip: (x.querySelector(".chip.tipo-tl") || {}).innerText || "",
      temColchete: /\[(EXIGÊNCIA|PERÍCIA)\]/.test(x.innerText),
      texto: x.innerText.slice(0, 40) }));
  });
  conf(`o comentário rotulado sai com CHIP, não com colchete cru (${JSON.stringify(tl[0] && tl[0].chip)})`,
    tl.some(x => x.chip === "EXIGÊNCIA") && !tl.some(x => x.temColchete));
  conf("o comentário sem tipo continua como sempre foi",
    tl.some(x => !x.chip && /Comentário livre/.test(x.texto)));

  // ── 4. os defeitos de layout da aba ─────────────────────────────────────
  const geo = await p.evaluate(() => {
    const li = [...document.querySelectorAll(".timeline > li")]
      .find(x => x.querySelector(".vistos .tf-acao"));
    if (!li) return null;
    const r = li.getBoundingClientRect();
    const v = li.querySelector(".vistos").getBoundingClientRect();
    const texto = li.querySelector(".texto").getBoundingClientRect();
    // o ponto da linha: pseudo-elemento — medimos a folga entre a coluna da
    // data e o começo do texto, que é onde ele mora
    return { liTop: Math.round(r.y), vTop: Math.round(v.y), vDir: Math.round(r.right - v.right),
      folgaTexto: Math.round(texto.x - (r.x + 12 + 74)) };
  });
  conf(`as ações da tarefa ficam na LINHA do comentário, não boiando no meio (topo li ${geo && geo.liTop}, topo ações ${geo && geo.vTop})`,
    geo && (geo.vTop - geo.liTop) < 20);
  conf(`e não são cobertas pelo × de apagar (${geo && geo.vDir}px da borda)`,
    geo && geo.vDir >= 14);
  conf(`o ponto da linha do tempo tem folga até o texto (${geo && geo.folgaTexto}px)`,
    geo && geo.folgaTexto >= 20);
  conf("a caixa de escrever tem duas linhas de partida",
    (await p.evaluate(() => document.getElementById("and-texto").rows)) === 2);

  await (await p.$(".escrever")).screenshot({ path: path.join(__dirname, "f21-tipos.png") });
  await (await p.$(".timeline")).screenshot({ path: path.join(__dirname, "f21-timeline.png") });

  console.log("=== anotações com tipo (F21) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
