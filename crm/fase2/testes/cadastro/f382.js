// F382 · as ideias do Lovable aprovadas pelo Paulo (02.11.2026): a linha dos próximos 30 dias na aba Prazos,
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

  // 1. a linha dos 30 dias
  const l = await p.evaluate(() => {
    const hj = hoje();
    _pzCli = [{data: hj, _nat: "fatal", _titulo: "Recurso inominado"}, {data: somaDias(hj, 9), _nat: "compromisso", _titulo: "Perícia"},
      {data: somaDias(hj, 40), _nat: "lembrete", _titulo: "Longe"}, {data: somaDias(hj, 3), _nat: "fatal", _titulo: "A confirmar", aConfirmar: true}];
    const d = document.createElement("div"); d.innerHTML = linha30Pz(hj);
    const vazio = (_pzCli = [{data: somaDias(hj, 40), _nat: "lembrete", _titulo: "Longe"}], linha30Pz(hj));
    return {dias: d.querySelectorAll(".pzl-d").length, marcos: [...d.querySelectorAll(".pzl-m")].map(b => b.className + "|" + b.getAttribute("onclick")),
      hoje: d.querySelector(".pzl-d .pzl-n").textContent, nu: d.querySelectorAll(".pzl-nu").length, vazio};
  });
  conf("31 dias, de hoje a hoje + 30", l.dias === 31 && l.hoje === "hoje");
  conf("dois marcos: fora o de 40 dias e o a confirmar", l.marcos.length === 2);
  conf("o marco fatal abre a janela do prazo pelo índice", /pzl-fatal\|abrirPainelPrazo\(0,'cli'\)/.test(l.marcos[0]) && /pzl-comp/.test(l.marcos[1]));
  conf("fim de semana e feriado em cinza", l.nu >= 8);
  conf("sem prazo nos 30 dias, a linha não aparece", l.vazio === "");

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
