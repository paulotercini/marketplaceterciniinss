// F41/F42 — as extrações automáticas do composer, cada uma com prova: a data
// no texto vira lembrete do caso, "DCB 16/09" vira a data da cessação com
// alarme, "protocolo NNN" entra na ficha e vira pesquisável, "documentos
// solicitados: X; Y" sobe para o checklist e perícia citada vira agendamento.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1 } = require("./fixturas");
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
  // o login pinta antes de carregar() terminar — espera os clientes na memória
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);

  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForTimeout(900);
  const registrar = async texto => {
    await p.fill("#and-texto", texto);
    await p.waitForTimeout(250);
    await p.evaluate(() => { tfQuem = []; tfData = null; });
    escritos.length = 0;
    await p.evaluate(caso => novoAndamento(caso), CASO1);
    await p.waitForTimeout(900);
  };

  // 1) a data escrita no texto vira o lembrete do caso (estilo Todoist)
  await p.fill("#and-texto", "Cobrar a agência, verificar em 24/12");
  await p.evaluate(() => pintarPrazoDoTexto());
  conf("o chip do prazo aparece enquanto digita (24.12.2026)",
    /24\.12\.2026/.test(await p.evaluate(() =>
      (document.getElementById("and-prazo-chip") || {}).textContent || "")));
  await registrar("Cobrar a agência, verificar em 24/12");
  // F73: a data do texto vira TAREFA DE LEMBRETE (andamento_tarefas), nunca
  // mais casos.prazo — o PRAZO FATAL só nasce do ⏰, do quadro 📅 ou do To Do
  conf("a data do texto virou tarefa de lembrete (24/12), não prazo fatal",
    escritos.some(x => x.m === "POST" && x.t === "andamento_tarefas" &&
      x.corpo.lembrar_em === "2026-12-24") &&
    !escritos.some(x => x.m === "PATCH" && x.t === "casos" && "prazo" in x.corpo));

  // 2) "DCB 16/09" vira a data de cessação, com alarme
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForTimeout(700);
  await registrar("Concedido B31, DCB 16/09 conforme carta.");
  const patDcb = escritos.find(x => x.m === "PATCH" && x.t === "casos" && x.corpo.dcb === "2026-09-16");
  conf("a DCB do texto entrou na ficha (16/09 → 2026-09-16)",
    patDcb && patDcb.corpo.dcb_prorrogacao_pedida === false);

  // 3) o protocolo citado entra na ficha e vira pesquisável
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForTimeout(700);
  await registrar("Requerimento feito, protocolo 2109876543 do Meu INSS.");
  const patProt = escritos.find(x => x.m === "PATCH" && x.t === "casos" &&
    (x.corpo.protocolos || []).includes("2109876543"));
  conf("o protocolo citado foi guardado na ficha", !!patProt);
  conf("e virou pesquisável no índice do cliente",
    await p.evaluate(([cli]) => (D.cliPorId.get(cli)._ix || "").includes("2109876543"), [CLI_CHEIO]));

  // 4) "documentos solicitados: X; Y" sobe para o checklist do caso
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForTimeout(700);
  await registrar("Documentos solicitados ao cliente: CNIS atualizado; carteira de trabalho antiga");
  const docs = escritos.filter(x => x.m === "POST" && x.t === "tarefas" && /^📄 /.test(x.corpo.titulo || ""));
  conf(`os 2 documentos viraram itens do checklist (${docs.length})`, docs.length === 2 &&
    docs.some(d => /CNIS atualizado/.test(d.corpo.titulo)) &&
    docs.some(d => /carteira de trabalho antiga/.test(d.corpo.titulo)));

  // 5) perícia citada com data vira agendamento na aba 🩺
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForTimeout(700);
  await registrar("Perícia agendada para 20/12/2026 às 14:00 na agência de Catanduva.");
  const ev = escritos.find(x => x.m === "POST" && x.t === "eventos" && /2026-12-20/.test(x.corpo.data_hora || ""));
  conf("a perícia citada virou agendamento (20/12/2026)", !!ev);

  console.log("=== extrações automáticas do composer ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
