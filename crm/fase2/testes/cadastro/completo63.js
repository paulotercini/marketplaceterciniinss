// F63 — o 📖 Caso completo aninha a RESPOSTA (responde_a): a conclusão da
// tarefa fica recuada embaixo do pedido, não solta; órfã continua à mostra;
// e o copiar em texto sai com a resposta indentada.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const PAI = "a0000000-0000-0000-0000-00000000f631";
const FILHO = "a0000000-0000-0000-0000-00000000f632";
const ORFA = "a0000000-0000-0000-0000-00000000f633";
FIX.andamentos = FIX.andamentos || [];
FIX.andamentos.push(
  { id: PAI, caso_id: CASO1, autor_id: EU, origem: null,
    criado_em: "2026-08-20T11:57:00Z", andamentos_lidos: [],
    texto: "⏰ [PRAZO 28.08.2026] Apresentar o RG fictício" },
  { id: FILHO, caso_id: CASO1, autor_id: EU, origem: null, responde_a: PAI,
    criado_em: "2026-08-21T12:19:00Z", andamentos_lidos: [],
    texto: "✔ Juntei os documentos fictícios" },
  { id: ORFA, caso_id: CASO1, autor_id: EU, origem: null,
    responde_a: "a0000000-0000-0000-0000-00000000morto",
    criado_em: "2026-08-22T09:00:00Z", andamentos_lidos: [],
    texto: "✔ Resposta órfã de pai apagado" });

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
      return rota.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify([{ id: "n1" }]) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
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

  // abre a ficha no CASO COMPLETO (sub-aba "tudo", o padrão F45)
  await p.evaluate(([cli, caso]) => { abrirFicha(cli).then(() => {
    const m = document.getElementById("modal"); if (m) { m.style.display = "none"; m.innerHTML = ""; }
    casoSel = caso; abaAtiva = 2; subAba = "tudo"; pintarFicha(); }); }, [CLI_CHEIO, CASO1]);
  await p.waitForTimeout(900);

  // 1) a resposta fica RECUADA logo abaixo do pai (não solta no topo)
  conf("a conclusão aparece recuada (tl-resposta) no Caso completo",
    await p.evaluate(() => { const li = [...document.querySelectorAll(".timeline .tl-of")]
      .find(x => /Juntei os documentos fictícios/.test(x.textContent));
      return li && li.classList.contains("tl-resposta"); }));
  conf("e vem imediatamente DEPOIS do pedido que a criou",
    await p.evaluate(() => { const ls = [...document.querySelectorAll(".timeline li")]
        .map(x => x.textContent);
      const iPai = ls.findIndex(t => /Apresentar o RG fictício/.test(t));
      const iF = ls.findIndex(t => /Juntei os documentos fictícios/.test(t));
      return iPai >= 0 && iF > iPai && iF - iPai <= 2; }));

  // 2) a órfã (pai apagado) continua à mostra, sem recuo
  conf("a resposta órfã segue visível no nível de cima",
    await p.evaluate(() => { const li = [...document.querySelectorAll(".timeline .tl-of")]
      .find(x => /Resposta órfã/.test(x.textContent));
      return li && !li.classList.contains("tl-resposta"); }));

  // 3) o copiar em texto indenta a resposta com ↳
  const texto = await p.evaluate(([caso]) => {
    const k = D.casoPorId.get(caso);
    const itens = fatosDoCasoTodo(k, (D._andsFicha || []).filter(a => a.caso_id === caso));
    return itens.map(x => `${x.resposta ? "↳ " : ""}${x.texto}`).join("\n");
  }, [CASO1]);
  conf("no texto corrido, a resposta sai indentada sob o pedido",
    /Apresentar o RG fictício\n↳ ✔ Juntei os documentos fictícios/.test(texto));

  console.log("=== F63 · a resposta no Caso completo ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
