// F418 · a suspensão por tema lida dos movimentos do PJe, do e-SAJ e do eproc: grava sozinha, retoma no levantamento, pede conferência sem tema
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, EU, CLI_CHEIO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const dia = n => new Date(Date.now() + n * 864e5).toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });
const TUDO = FIX;

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
    const u = rota.request().url();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (rota.request().method() !== "GET")
      return rota.fulfill({ status: 201, contentType: "application/json", body: "[]" });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    let corpo = TUDO[t] || [];
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
  const cli = await p.evaluate(c => D.casoPorId.get(c).cliente_id, CASO1);
  await p.evaluate(c => abrirFicha(c), cli);
  await p.waitForSelector(".linha-caso");
  // o leitor das partes do movimento, com os textos reais do PJe, do e-SAJ e do eproc
  const le = await p.evaluate(() => [
    "Processo suspenso por Recurso Especial Repetitivo 1124",
    "Processo Suspenso por Recurso Extraordinário com repercussão geral 1209",
    "Processo Suspenso por depender do julgamento de outra causa, de outro juízo ou declaração incidente (TNU - Tema - 317)",
    "Recurso Especial repetitivo - SUSPENSÃO/SOBRESTAMENTO RECURSO ESPECIAL REPETITIVO - RECURSO ESPECIAL REPETITIVO - TEMA STJ Nº 1090",
    "Levantada a Causa Suspensiva ou de Sobrestamento - Suspensão / Sobrestamento por Recurso Extraordinário com Repercussão Geral de número 1209",
    "Autos Suspensos ou Sobrestados",
    "Suspensão do Prazo",
    "Processo suspenso em razão de expedição de precatório",
    "Recebido o recurso Com efeito suspensivo",
  ].map(leSuspensao));
  conf("lê o REsp repetitivo como STJ", le[0] && le[0].tipo === "susp" && le[0].trib === "STJ" && le[0].tema === "1124");
  conf("lê a repercussão geral como STF", le[1] && le[1].trib === "STF" && le[1].tema === "1209");
  conf("lê o tema da TNU", le[2] && le[2].trib === "TNU" && le[2].tema === "317");
  conf("lê o 'TEMA STJ Nº' do e-SAJ", le[3] && le[3].trib === "STJ" && le[3].tema === "1090");
  conf("o levantamento não vira suspensão", le[4] && le[4].tipo === "lev");
  conf("sem número de tema pede conferência", le[5] && le[5].tipo === "sem");
  conf("prazo, precatório e efeito suspensivo não contam", !le[6] && !le[7] && !le[8]);
  // grava sozinho pelo movimento do caso, com a nota e o desfazer
  const r = await p.evaluate(async c => {
    const k = D.casoPorId.get(c); k.ronda = {}; k.fase = "judicial";
    D._andsFicha = [{id:"a1", caso_id:c, origem:"pje", criado_em:"2026-09-15T12:00:00Z",
      texto:"PJe (2º grau): Processo Suspenso por Recurso Extraordinário com repercussão geral 1209 · 📎 Decisão — em 15.09.2026 22:13 — ApCiv 5025427-35.2018.4.03.9999"}];
    await adotarSuspensao(k.cliente_id);
    const s1 = suspensaoDe(k) ? {...suspensaoDe(k)} : null;
    // o mesmo movimento não manda de novo: retomado à mão, não volta
    await retomarCaso(c, true); await adotarSuspensao(k.cliente_id);
    const volta = !!suspensaoDe(k);
    // o levantamento retoma
    k.ronda = {}; D._andsFicha.push({id:"a2", caso_id:c, origem:"pje", criado_em:"2026-10-01T12:00:00Z",
      texto:"PJe (2º grau): Levantada a suspensão ou sobrestamento dos autos — em 01.10.2026 10:00 — ApCiv 5025427-35.2018.4.03.9999"});
    k.ronda = {suspensao:{trib:"STF", tema:"1209", desde:"2026-09-15"}};
    await adotarSuspensao(k.cliente_id);
    const ret = !suspensaoDe(k);
    // sem tema: não grava, pede conferência no cartão
    k.ronda = {}; D._andsFicha = [{id:"a3", caso_id:c, origem:"pje", criado_em:"2026-10-02T12:00:00Z",
      texto:"PJe (2º grau): Autos Suspensos ou Sobrestados — em 02.10.2026 12:34 — RecInoCiv 5001446-32.2022.4.03.6314"}];
    await adotarSuspensao(k.cliente_id); irAoCaso(c); repintarFicha();
    await new Promise(r=>setTimeout(r, 200));
    return { s1, volta, ret, conf: !!(k.ronda.susp_conferir) && !suspensaoDe(k),
      chip: (document.querySelector(".lc-susp-conf")||{}).textContent || "" };
  }, CASO1);
  conf("grava STF, Tema 1209, desde a data do movimento, por: auto", r.s1 && r.s1.trib === "STF" && r.s1.tema === "1209" && r.s1.desde === "2026-09-15" && r.s1.por === "auto");
  conf("o movimento já lido não volta a suspender", r.volta === false);
  conf("o levantamento retoma o caso", r.ret);
  conf("sem tema fica a conferir, sem gravar", r.conf);
  conf("o cartão pede a conferência", /Suspensão sem tema/.test(r.chip));
  await p.evaluate(() => { visao = "acervo"; render(); });
  conf("o Cuidar do acervo oferece a leitura do acervo", await p.$$eval('#acervo-suspensos button:has-text("Ler as suspensões")', b => b.length) === 1);
  conf("sem erro na página", !erros.length);
  await nav.close(); s.close();
  const n = ok.filter(x => x[1]).length;
  ok.forEach(([t, v]) => console.log(`${v ? "✓" : "✗"} ${t}`));
  if (erros.length) console.log(erros.join("\n"));
  console.log(`${n}/${ok.length}`);
  process.exit(n === ok.length ? 0 : 1);
})();
