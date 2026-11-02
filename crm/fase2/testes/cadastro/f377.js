// F377 · o Planejado junta as visões de data em abas (Lista, Mês, Perícias, Casos), com os filtros da natureza na Lista,
// e o menu perde Calendário, Perícias & Audiências e Tarefas com Prazo. Molde: planejado124.js
// F124 — o 🗓️ Planejado é o do To Do: TODA data, não só a do caso. Entram o
// caso, a tarefa (inclusive o documento pedido ao cliente) e o lembrete, que é
// onde moram as aposentadorias futuras. As seções são as mesmas do To Do.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, EU, CLI_CHEIO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const dia = n => new Date(Date.now() + n * 864e5).toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });

const TUDO = {
  ...FIX,
  casos: [{ ...FIX.casos[0], prazo: dia(0) }],
  tarefas: [
    { id: "t0000000-0000-0000-0000-000000000001", caso_id: CASO1, cliente_id: CLI_CHEIO,
      titulo: "Escrever a petição", prazo: dia(1), concluida: false, particular_de: null },
    { id: "t0000000-0000-0000-0000-000000000002", caso_id: null, cliente_id: null,
      titulo: "Levar o carro na revisão", prazo: dia(-2), concluida: false, particular_de: EU },
  ],
  lembretes: [
    { id: "l0000000-0000-0000-0000-000000000001", cliente_id: CLI_CHEIO,
      tipo: "aposentadoria_futura", titulo: "Aposentadoria futura", intervalo_meses: null,
      proximo_em: dia(30), ativo: true, criado_por: EU, detalhes: {} },
  ],
};

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
  await p.evaluate(() => { visao = "planejado"; render(); });
  await p.waitForTimeout(400);
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);

  const tela = () => p.evaluate(() => ({
    txt: document.getElementById("conteudo-meio").innerText,
    secoes: [...document.querySelectorAll("#conteudo-meio h3.secao")].map(h => h.textContent.trim()),
    sub: document.querySelector("#conteudo-meio .meio-sub").textContent,
  }));

  const abas = () => p.evaluate(() => [...document.querySelectorAll("#conteudo-meio > .plan-abas [data-plan-aba]")].map(b => b.textContent + (b.classList.contains("on") ? "*" : "")).join(","));
  conf("a Lista abre com as quatro abas e o nome Planejado",
    (await abas()) === "Lista*,Mês,Perícias,Casos" && await p.evaluate(() => document.getElementById("titulo-lista").textContent === "Planejado"));
  const chips = () => p.evaluate(() => [...document.querySelectorAll(".plan-nat [data-pnat]")].map(b => b.textContent.replace(/\s+/g, " ").trim()));
  const c1 = await chips();
  conf("os filtros da natureza contam cada tipo (Tudo 4, Prazos 1, Tarefas 2, Lembretes 1)",
    c1.join("|") === "Tudo 4|Prazos 1|Tarefas 2|Lembretes 1");
  await p.click('.plan-nat [data-pnat="tarefas"]'); await p.waitForTimeout(250);
  const tx = await p.evaluate(() => document.getElementById("conteudo-meio").innerText);
  conf("o filtro Tarefas deixa só as tarefas (a do caso amanhã, a particular vencida, sem o lembrete)", /VENCIDAS 1/i.test(tx) && /AMANHÃ 1/i.test(tx) && /Levar o carro/.test(tx) && !/MAIS TARDE/i.test(tx));
  await p.click('.plan-nat [data-pnat=""]'); await p.waitForTimeout(250);
  const menu = await p.evaluate(() => [...document.querySelectorAll(".sidebar .lista-item")].map(e => e.dataset.v));
  conf("o menu perde Calendário, Perícias & Audiências e Tarefas com Prazo, e mantém a Agenda",
    !menu.includes("calendario") && !menu.includes("agenda") && !menu.includes("fase:prazo") && menu.includes("agendaq") && menu.includes("planejado"));
  for (const [v, rot] of [["calendario", "Mês"], ["agenda", "Perícias"], ["fase:prazo", "Casos"]]) {
    await p.click(`.plan-abas [data-plan-aba="${v}"]`); await p.waitForTimeout(300);
    const st = await p.evaluate(() => ({ v: visao, t: document.getElementById("titulo-lista").textContent,
      at: (document.querySelector(".sidebar .lista-item.ativa") || {}).dataset?.v }));
    conf(`a aba ${rot} abre a tela de antes sob o Planejado, com o Planejado aceso no menu`,
      st.v === v && st.t === "Planejado" && st.at === "planejado" && (await abas()).includes(rot + "*"));
  }
  await p.click('.plan-abas [data-plan-aba="planejado"]'); await p.waitForTimeout(300);
  conf("a aba Lista volta à lista", await p.evaluate(() => visao === "planejado" && !!document.querySelector(".plan-nat")));
  await p.evaluate(() => { eu.cargo = "recepcao"; guardar("crm_ver_como", "colab"); montarSidebar(); visao = "fase:prazo"; render(); });
  await p.waitForTimeout(300);
  conf("a recepção vê o Planejado no menu e as abas que o cargo dela permite",
    await p.evaluate(() => [...document.querySelectorAll(".sidebar .lista-item")].some(e => e.dataset.v === "planejado")) && /Casos\*/.test(await abas()));
  await p.evaluate(() => { guardar("crm_ver_como", ""); });

  conf("nenhum erro de página", erros.length === 0);

  console.log("=== F377 · Planejado com as visões de data em abas ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
