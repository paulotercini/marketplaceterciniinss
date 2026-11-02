// F311 — a importação do PAT lê também o requerimento sem detalhe. A
// extensão pulava o detalhe do concluído e o plano só lia detalhes: três
// decisões na tela chegavam como "0 requerimentos" (30.10.2026).
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
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
      return rota.fulfill({ status: 204, contentType: "application/json", body: "" });
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
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);

  // a coleta crua da extensão com só concluídos: a lista vem, o detalhe não
  const r = await p.evaluate(([cli]) => {
    const bruto = { lista: [
        { protocolo: 5185771724025, status: "CONCLUÍDA", siglaServico: "TAA",
          nomeServico: "Auxílio-Acidente", cpfRequerente: "12345678909",
          nomeRequerente: "AURELIA FICTA", dataUltimaAtualizacao: "2026-10-30T13:18:00" },
        { protocolo: 1857538205, status: "CONCLUÍDA", siglaServico: "TREC",
          nomeServico: "Recurso Ordinário (Inicial)", cpfRequerente: "98765432100",
          nomeRequerente: "SEM FICHA", dataUltimaAtualizacao: "2026-10-30T12:17:00" },
        { protocolo: 1575099069, status: "PENDENTE", siglaServico: "TREC",
          nomeServico: "Recurso Ordinário (Inicial)", cpfRequerente: "12345678909" } ],
      detalhes: [{ protocolo: 1575099069, status: "PENDENTE", siglaServico: "TREC",
          nomeServico: "Recurso Ordinário (Inicial)", comentarios: [] }] };
    const pat = normalizarColeta(bruto);
    const k = { id: "k1", cliente_id: cli, protocolos: ["5185771724025"], fase: "inss",
                situacao_inss: "Em análise", titulo: "t", beneficio: "Auxílio-acidente" };
    const plano = planoDeImportacao(pat,
      { casos: [k], clientes: [{ id: cli, cpf: "12345678909", nome: "X" }], eventos: [], andamentos: [] },
      "2026-10-30");
    return { lidos: pat.detalhes.length, plano, erro: conferirPlanoPat(pat, plano) };
  }, [CLI_CHEIO]);
  conf("os três protocolos da lista entram, mesmo sem detalhe", r.lidos === 3);
  const at = r.plano.atualizar.find(x => x.protocolo === "5185771724025");
  conf("o concluído com caso atualiza a situação", at && at.situacao === "Concluído" &&
       /Em análise → Concluído/.test(at.andamento || ""));
  conf("o concluído sem ficha aparece para cadastrar, com o nome da lista",
       r.plano.semCliente.some(x => x.protocolo === "1857538205" && x.nome === "SEM FICHA" && x.lista === "conselho"));
  conf("o que tinha detalhe não duplica", r.plano.novos.concat(r.plano.possiveisDuplicados)
       .filter(x => x.protocolo === "1575099069").length === 1);
  conf("o plano confere", !r.erro);

  console.log("=== PAT: concluído sem detalhe entra no plano ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
