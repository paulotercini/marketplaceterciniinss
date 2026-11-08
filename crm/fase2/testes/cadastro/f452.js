// F452 · a aba Prazos em mês e lista (proposta C escolhida pelo Paulo em 08.11.2026). Molde: f382.js
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

  // monta a aba com uma lista fictícia, sem banco: prazosDoCliente devolve o que o teste quer
  const pinta = async () => p.evaluate(() => {
    const hj = hoje(), cli = D.clientes[0].id;
    window._pzOrig = window._pzOrig || prazosDoCliente;
    prazosDoCliente = () => ({lista: [
      {data: somaDias(hj, -3), natureza: "lembrete", rotulo: "Retorno", rot: "Retorno", todo: true},
      {data: somaDias(hj, -2), natureza: "lembrete", rot: "Ligar ao cliente"},
      {data: somaDias(hj, 4), natureza: "fatal", ehPrazo: true, rot: "Recurso inominado"},
      {data: somaDias(hj, 12), natureza: "compromisso", rot: "Perícia médica"}]});
    let el = document.getElementById("pz-teste"); if(!el){ el = document.createElement("div"); el.id = "pz-teste"; document.body.prepend(el); }
    el.innerHTML = painelPrazosCliente(cli); _pzCliId = cli;
  });
  await pinta();
  const a = await p.evaluate(() => ({
    hero: (document.querySelector(".pzc-hero h2") || {}).textContent, n: (document.querySelector(".pzc-hero-n b") || {}).textContent,
    chips: [...document.querySelectorAll(".pzc-chip")].map(b => b.textContent.replace(/\s+/g, " ").trim()),
    grupos: [...document.querySelectorAll(".pzc-gt > span:first-child")].map(x => x.textContent),
    reag: !!document.querySelector(".pzc-g-venc .pzc-lk"), mes: !!document.querySelector(".pzc-grade .pzm"),
    todo: [...document.querySelectorAll(".pzc-lin")].some(l => /Retorno/.test(l.textContent) && /Microsoft To Do/.test(l.textContent)),
    cor: (document.querySelector(".pzc-lin[data-nat='fatal']") || {}).className || ""}));
  conf("a faixa abre pelo próximo prazo fatal, com o número de dias úteis", a.hero === "Recurso inominado" && /^\d+$/.test(a.n || ""));
  conf("os chips da natureza trazem o Retorno à parte", a.chips.join("|") === "Todos 4|Prazo fatal 1|Compromisso 1|Lembrete 1|Retorno 1" || (console.log(a.chips), false));
  conf("os vencidos vêm primeiro, com Reagendar", a.grupos[0] === "Vencidos" && a.reag);
  conf("a lista fica ao lado do mês", a.mes);
  conf("o retorno do To Do leva o selo Microsoft To Do", a.todo);
  conf("a linha do prazo fatal leva a cor dele", /pzc-c-fatal/.test(a.cor));
  await p.evaluate(() => pzNat("retorno"));
  conf("o chip Retorno deixa só o retorno", await p.evaluate(() => { const ls = [...document.querySelectorAll(".pzc-lin")]; return ls.length === 1 && /Retorno/.test(ls[0].textContent); }));
  await p.evaluate(() => pzNat("todos"));
  const d = await p.evaluate(() => { const iso = somaDias(hoje(), 12); _pzMes = iso.slice(0, 7); pzPintar(); document.querySelector(`.pzm-d[onclick="pzDia('${iso}')"]`).click();
    return {n: document.querySelectorAll(".pzc-lin").length, t: (document.querySelector(".pzc-lin .pzc-t") || {}).textContent, sel: !!document.querySelector(".pzm-sel"),
      lim: !!document.querySelector(".pzc-dia-sel .pzc-lk")}; });
  conf("o dia clicado filtra a lista e diz o dia, com Limpar", d.n === 1 && d.t === "Perícia médica" && d.sel && d.lim);
  await p.evaluate(() => document.querySelector(".pzc-dia-sel .pzc-lk").click());
  conf("Limpar volta à lista inteira", await p.evaluate(() => document.querySelectorAll(".pzc-lin").length === 4 && !document.querySelector(".pzm-sel")));
  const r = await p.evaluate(() => { let it = null; const o = reagendarVencidas; reagendarVencidas = () => { it = _reagVenc; }; pzReagendar(); reagendarVencidas = o;
    return it.map(x => x.fatal ? "fatal" : x.selo || (x.tc ? "tc" : "?")); });
  conf("Reagendar leva o retorno vencido à janela do Meu Dia", r.includes("fatal") || r.length === 2);
  await p.evaluate(() => { prazosDoCliente = window._pzOrig; });

  // o celular: o mês no alto e a linha inteira se toca
  await p.setViewportSize({ width: 390, height: 844 });
  await pinta();
  const c = await p.evaluate(() => { const g = document.querySelector(".pzc-grade"), m = g.querySelector(".pzm").getBoundingClientRect(), col = g.querySelector(".pzc-col").getBoundingClientRect();
    const l = document.querySelector(".pzc-lin"), ab = l.querySelector(".pzc-abrir").getBoundingClientRect(), lr = l.getBoundingClientRect();
    const largos = [...document.querySelectorAll("#pz-teste *")].filter(e => e.getBoundingClientRect().right > 391 && !e.closest(".pzc-chips")).map(e => e.className).slice(0, 5);
    return {alto: m.bottom <= col.top + 1, cobre: Math.abs(ab.width - lr.width) < 3, rola: !largos.length, largos}; });
  if (!c.rola) console.log(c.largos);
  conf("no celular o mês vai para o alto", c.alto);
  conf("no celular a linha se toca inteira", c.cobre);
  conf("no celular nada passa da largura da tela (fora a fila dos chips, que rola sozinha)", c.rola);

  const falhas = ok.filter(([, v]) => !v);
  ok.forEach(([n, v]) => console.log((v ? "✔ " : "✘ ") + n));
  if (erros.length) console.log(erros.join("\n"));
  console.log(`${ok.length - falhas.length}/${ok.length}`);
  await nav.close(); s.close();
  process.exit(falhas.length || erros.length ? 1 : 0);
})();
