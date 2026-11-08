// F382 · as ideias do Lovable aprovadas pelo Paulo (02.11.2026): a linha dos próximos 30 dias na aba Prazos (hoje o mês, F451),
// o caminho até o direito na Análise de Direito e a carga de prazos por pessoa no Planejado. Molde: f378.js
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

  // 1. F451 · o mês da aba Prazos (substituiu a linha dos 30 dias): um ponto por prazo na cor da natureza, o dia clicado filtra
  const l = await p.evaluate(() => {
    const hj = hoje(); _pzMes = null; _pzDia = null;
    _pzCli = [{data: hj, _nat: "fatal", _titulo: "Recurso inominado"}, {data: hj, _nat: "lembrete", rotulo: "Retorno", _titulo: "Retorno"},
      {data: hj, _nat: "fatal", _titulo: "A confirmar", aConfirmar: true}];
    const d = document.createElement("div"); d.innerHTML = calendarioPz();
    const h = d.querySelector(".pzm-hoje");
    return {pts: [...h.querySelectorAll(".pzm-pts i")].map(i => i.className), nu: d.querySelectorAll(".pzm-nu").length,
      dias: d.querySelectorAll(".pzm-d").length, mes: d.querySelector(".pzm-cab b").textContent, clique: h.getAttribute("onclick")};
  });
  conf("o mês tem semanas inteiras e diz o mês", l.dias % 7 === 0 && l.dias >= 28 && /de \d{4}$/.test(l.mes));
  conf("hoje traz um ponto por prazo, fora o a confirmar, e o retorno em cinza", l.pts.join("|") === "pzm-fatal|pzm-ret");
  conf("o dia clicado filtra a lista", /^pzDia\('\d{4}-\d{2}-\d{2}'\)$/.test(l.clique));
  conf("fim de semana e feriado em cinza", l.nu >= 8);

  // 2. o caminho até o direito
  const dir = await p.evaluate(() => {
    const x = {hoje: "2026-11-02"};
    const a = {quando: "2027-11-01", rs: [
      {rot: "Já tem a idade mínima (65 anos o homem; 62 a mulher)?", quando: "2027-03-15", est: "falta"},
      {rot: "Tem 180 contribuições mensais de carência?", quando: "2027-11-01", est: "falta"},
      {rot: "Quando começou a contribuir?", quando: "2010-01-01", est: "info"}]};
    const d = document.createElement("div"); d.innerHTML = linhaDireito(a, x);
    return {itens: [...d.querySelectorAll(".adl-lista li")].map(li => li.textContent), marcos: d.querySelectorAll(".adl-trilho i").length,
      ja: linhaDireito({quando: "2026-01-01", rs: []}, x), nulo: linhaDireito(null, x)};
  });
  conf("o caminho lista hoje, os requisitos na ordem da data e o direito",
    dir.itens.join(" / ") === "hoje, 02/11/2026 / a idade mínima: 15/03/2027 / 180 contribuições mensais de carência: 01/11/2027 / direito em 01/11/2027");
  conf("quatro marcos no trilho (hoje, dois requisitos, direito)", dir.marcos === 4);
  conf("direito já alcançado ou sem análise não desenha nada", dir.ja === "" && dir.nulo === "");

  const pg = await p.evaluate(() => {
    const c = D.clientes[0], x = {hoje: "2026-11-02", dn: "1965-03-15", ct: {periodos: [["2013-01", "2026-10"]]}, c};
    const a = {quando: "2027-11-01", rs: [
      {id: "idade_minima", rot: "Já tem a idade mínima?", base: "EC 103/2019, art. 18", quando: "2027-03-15", est: "falta"},
      {id: "carencia_180", rot: "Tem 180 contribuições mensais de carência?", base: "Lei 8.213/91, art. 25, II", quando: "2027-11-01", est: "falta"}]};
    const d = document.createElement("div"); d.innerHTML = linhaDireito(a, x);
    const q = [...d.querySelectorAll(".adp-q")].map(e => e.textContent.replace(/\s+/g, ""));
    const sem = document.createElement("div"); sem.innerHTML = linhaDireito({...a, rs: [a.rs[0]], quando: "2027-03-15"}, x);
    return {q, paths: d.querySelectorAll(".adp-g path").length, ex: !!d.querySelector(".adp-ex"), pag: (d.querySelector(".adp-pag") || {}).textContent || "",
      contrib: (d.querySelector(".adp-pag button[onclick^='formQualidade']") || {}).getAttribute ? d.querySelector(".adp-pag button[onclick^='formQualidade']").getAttribute("onclick") : "",
      semPag: !sem.querySelector(".adp-pag"), semGraf: sem.querySelectorAll(".adp-g path").length};
  });
  conf("F386 três quadros: carência de hoje e o exigido, idade e a data do direito",
    pg.q.length === 3 && pg.q[1] === "Carência166de178mesescompletaem11/2027" && pg.q[0] === "Idade61de62anoscompletaem15/03/2027" && pg.q[2] === "Datadodireito01/11/2027" || (console.log(JSON.stringify(pg.q)), false));
  conf("F386 o gráfico tem as duas curvas e a linha do exigido", pg.paths === 2 && pg.ex);
  conf("F386 a linha das competências a pagar e o Contribuições com o plano pré-preenchido",
    /Pagar de 12\/2026 a 11\/2027 e protocolar em 01\/11\/2027/.test(pg.pag) && /finalidade&quot;:&quot;aposentadoria|"finalidade":"aposentadoria"/.test(pg.contrib) || (console.log(pg.pag, pg.contrib), false));
  conf("F386 sem carência a pagar, não há a linha de pagar; o gráfico fica só com a idade", pg.semPag && pg.semGraf === 1);
  const fq = await p.evaluate(() => { const c = D.clientes[0];
    formQualidade(c.id, "", "analise", {q: {finalidade: "aposentadoria", modalidade: "mensal", inicio: "2026-12-01", fim: "2027-11-28"}});
    const r = {fim: document.getElementById("mq-fim-de").value, mod: document.getElementById("mq-mod").value, ini: document.getElementById("mq-ini").value, ate: document.getElementById("mq-fim").value};
    fecharCaixa(); return r; });
  conf("F386 o Contribuições abre o plano já com a finalidade, o mensal e as competências", fq.fim === "aposentadoria" && fq.mod === "mensal" && fq.ini === "2026-12" && fq.ate === "2027-11");

  // 3. a carga por pessoa
  const cg = await p.evaluate(eu => {
    const hj = hoje(), its = [];
    for (let i = 0; i < 7; i++) its.push({data: somaDias(hj, i % 5), fatal: true, donos: [eu]});
    its.push({data: somaDias(hj, 1), selo: "Retorno", donos: [eu]}, {data: somaDias(hj, 9), fatal: true, donos: [eu]}, {data: somaDias(hj, -1), fatal: true, donos: [eu]});
    const d = document.createElement("div"); d.innerHTML = blocoCarga(its);
    const b = d.querySelector(".carga-l");
    return {n: d.querySelectorAll(".carga-l").length, q: b && b.querySelector(".carga-q").textContent, alto: b && !!b.querySelector("i.alto"), col: b && b.dataset.agcol,
      vazio: blocoCarga([{data: somaDias(hj, 1), selo: "Retorno", donos: [eu]}])};
  }, EU);
  conf("conta só os prazos da semana (7), sem o retorno, o de 9 dias e o vencido", cg.n === 1 && /^7/.test(cg.q));
  conf("acima de 6 a barra fica vermelha", cg.alto);
  conf("o nome filtra o Planejado pela pessoa", cg.col === EU);
  conf("sem prazo na semana, o bloco não aparece", cg.vazio === "");

  await p.evaluate(() => { visao = "planejado"; render(); });
  await p.waitForTimeout(300);
  conf("o Planejado abre sem erro", !erros.length);

  let pts = 0; ok.forEach(([n, v]) => { console.log((v ? "✔ " : "✘ ") + n); if (v) pts++; });
  console.log(`\n${pts}/${ok.length}`); if (erros.length) console.log(erros.join("\n"));
  await nav.close(); s.close(); process.exit(pts === ok.length ? 0 : 1);
})();
