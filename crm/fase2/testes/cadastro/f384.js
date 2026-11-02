// F384 · os pontos da análise de prazos e da Análise de Direito (02.11.2026): o catálogo com os recursos do CRPS e das
// cortes superiores, o calendário da Justiça Federal (Lei 5.010/1966, art. 62) e o valor estimado do benefício. Molde: f382.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, EU } = require("./fixturas");
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
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (rota.request().method() !== "GET") return rota.fulfill({ status: 201, contentType: "application/json", body: "[]" });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FIX[t] || []) });
  });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);

  // 1. o catálogo
  const cat = await p.evaluate(() => Object.fromEntries(["resp","aresp","aint","edcrps","rclcrps","agcrps"].map(id => {
    const x = PRAZOS_CATALOGO.find(i => i.id === id); return [id, x ? `${x.n}|${x.uteis}|${x.base}` : null]; })));
  conf("REsp/RE, AREsp e agravo interno: 15 dias úteis", ["resp","aresp","aint"].every(id => /^15\|true\|/.test(cat[id] || "")));
  conf("embargos, reclamação e agravo do CRPS: 30 dias corridos, com o artigo do Regimento",
    /^30\|false\|art\. 92/.test(cat.edcrps || "") && /^30\|false\|art\. 123/.test(cat.rclcrps || "") && /^30\|false\|art\. 93/.test(cat.agcrps || ""));
  conf("o catálogo aparece no seletor do prazo", await p.evaluate(() => /Reclamação ao Conselho Pleno/.test(catalogoPrazoHtml("t"))));

  // 2. o calendário da Justiça Federal
  const jf = await p.evaluate(() => {
    const fed = {processo: "5000123-45.2026.4.03.6136"}, est = {processo: "1000123-45.2026.8.26.0368"}, u5 = {n: 5, uteis: true}, u1 = {n: 1, uteis: true};
    return {fed: ehJusticaFederal(fed), est: ehJusticaFederal(est), nada: ehJusticaFederal(null),
      santaGeral: contarPrazo("2026-03-31", u5), santaJF: contarPrazo("2026-03-31", u5, fed), santaTJ: contarPrazo("2026-03-31", u5, est),
      agostoGeral: contarPrazo("2026-08-10", u1), agostoJF: contarPrazo("2026-08-10", u1, fed),
      dezJF: contarPrazo("2026-12-07", u1, fed), crpsJF: contarPrazo("2026-03-02", {n: 30, uteis: false}, fed),
      texto: textoContagemPz(5, true, "2026-03-31", "2026-04-10", false, true)};
  });
  conf("processo federal pelo segmento 4 do número CNJ; o estadual não", jf.fed && !jf.est && !jf.nada);
  conf("Semana Santa: a quarta e a quinta não contam na Justiça Federal", jf.santaGeral === "2026-04-08" && jf.santaJF === "2026-04-10" && jf.santaTJ === "2026-04-08");
  conf("11 de agosto não conta na Justiça Federal", jf.agostoGeral === "2026-08-11" && jf.agostoJF === "2026-08-12");
  conf("8 de dezembro não conta na Justiça Federal", jf.dezJF === "2026-12-09");
  conf("o prazo administrativo não muda com o caso federal", jf.crpsJF === "2026-04-01");
  conf("a explicação cita a Lei 5.010/1966", /Lei 5\.010\/1966, art\. 62/.test(jf.texto));

  // 3. o valor estimado
  const v = await p.evaluate(() => {
    const serie = {"2026-01": 1, "2026-02": 2, "2026-03": 0};
    const m = mediaCorrigida([{c: "01/2026", v: 1700}, {c: "02/2026", v: 2000}, {c: "03/2026", v: 500}, {c: "04/2026", v: 3000}], "2026-04-10", serie, TETO_2026);
    const t = mediaCorrigida([{c: "01/2025", v: 20000}], "2025-02-10", {}, TETO_2026);
    const soma = mediaCorrigida([{c: "05/2018", v: 1000}, {c: "05/2018", v: 700}], "2018-06-10", {}, TETO_2026);
    return {media: m && Math.round(m.media * 100) / 100, n: m && m.n, teto: t && t.media, soma: soma && soma.media,
      coefIdade: coefDaOpcao("idade", {tot: {comum: 25 * 365}, sx: "M", v: {}}).p, coefMulher: coefDaOpcao("idade", {tot: {comum: 25 * 365}, sx: "F", v: {}}).p,
      coefB31: coefDaOpcao("b31", {tot: {}, v: {}}), coefB94: coefDaOpcao("b94", {tot: {}, v: {}}).p, coefPensao: coefDaOpcao("morte", {tot: {}, v: {}}),
      idoso: valorEstimado("idoso", {der: "2026-11-02"})};
  });
  conf("cada salário corrigido pelo INPC do mês da competência ao mês anterior à DER", v.media === 1895.67);
  conf("fora o mês abaixo do mínimo depois de 11/2019 e o mês da DER", v.n === 2);
  conf("o salário corrigido não passa do teto", v.teto === 8475.55);
  conf("dois vínculos no mesmo mês se somam", v.soma === 1700);
  conf("60 % mais 2 % por ano acima de 20 (homem) ou 15 (mulher)", v.coefIdade === 70 && v.coefMulher === 80);
  conf("auxílio 91 % limitado aos 12 últimos; acidente 50 %; pensão sem estimativa", v.coefB31.p === 91 && v.coefB31.lim12 && v.coefB94 === 50 && v.coefPensao === null);
  conf("BPC do idoso: um salário mínimo de 2026", /R\$ 1\.621,00/.test(v.idoso));

  let pts = 0; ok.forEach(([n, v]) => { console.log((v ? "✔ " : "✘ ") + n); if (v) pts++; });
  console.log(`\n${pts}/${ok.length}`); if (erros.length) console.log(erros.join("\n"));
  await nav.close(); s.close(); process.exit(pts === ok.length ? 0 : 1);
})();
