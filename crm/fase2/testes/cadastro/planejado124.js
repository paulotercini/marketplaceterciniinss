// F124 — o 🗓️ Planejado é o do To Do: TODA data, não só a do caso. Entram o
// caso, a tarefa (inclusive o documento pedido ao cliente) e o lembrete, que é
// onde moram as aposentadorias futuras. As seções são as mesmas do To Do.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, EU, CLI_CHEIO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const dia = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

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

  const t1 = await tela();
  conf("a agenda conta as três origens, não só o caso", /4 data\(s\)/.test(t1.sub));
  conf("o caso com prazo de hoje entra em Vencem hoje",
    /Vencem hoje \(1\)/.test(t1.secoes.join(" ")) && /Aurélia/.test(t1.txt));
  conf("a tarefa do caso entra no dia dela",
    /Amanhã \(1\)/.test(t1.secoes.join(" ")) && /Escrever a petição/.test(t1.txt));
  conf("a tarefa particular atrasada entra em Vencidas",
    /Vencidas \(1\)/.test(t1.secoes.join(" ")) && /Levar o carro/.test(t1.txt));
  conf("o lembrete de aposentadoria futura entra em Mais tarde",
    /Mais tarde \(1\)/.test(t1.secoes.join(" ")) && /Aposentadoria futura/.test(t1.txt));
  conf("o cartão do lembrete traz o ✔ avisado e a caixa de adiar com a data",
    await p.evaluate(d => {
      const txt = document.getElementById("conteudo-meio").innerText;
      const dt = [...document.querySelectorAll("#conteudo-meio input[type=date]")]
        .some(i => i.value === d);
      return /avisado/.test(txt) && dt;
    }, dia(30)));

  conf("o número da barra lateral é o mesmo que a tela conta",
    await p.evaluate(() => quantosNoPlanejado() === 4));

  await p.evaluate(() => { filtroPlan = "hoje"; render(); });
  await p.waitForTimeout(300);
  const t2 = await tela();
  conf("o filtro Hoje corta tarefa e lembrete junto com o caso",
    /1 data\(s\)/.test(t2.sub) && !/Escrever a petição/.test(t2.txt)
    && !/Aposentadoria futura/.test(t2.txt));

  await p.evaluate(() => { filtroPlan = "todas"; filtroPlanColab = "11111111-1111-1111-1111-111111111111"; render(); });
  await p.waitForTimeout(300);
  const t3 = await tela();
  conf("com filtro por pessoa, o lembrete sai de cena (não tem dono)",
    !/Aposentadoria futura/.test(t3.txt) && /Levar o carro/.test(t3.txt));

  conf("nenhum erro de página", erros.length === 0);

  console.log("=== F124 · Planejado com caso, tarefa e lembrete ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
