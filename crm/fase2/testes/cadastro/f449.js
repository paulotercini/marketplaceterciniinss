// F449 · A tarefa que se repete (proposta 5 do Todoist, aprovada pelo Paulo em 08.11.2026): a regra nasce no campo de
// escrever (Repetir), mora em andamento_tarefas.repetir e, concluída a tarefa, a próxima rodada nasce sozinha.
// Prazo fatal nunca repete.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const CLI = "c0000000-0000-0000-0000-000000000001";

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const erros = [], posts = [];
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  let seq = 0;
  await ctx.route(SUPA + "/**", rota => {
    const q = rota.request(), u = q.url();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (q.method() === "POST") {
      const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1]; let b = {}; try { b = JSON.parse(q.postData() || "{}"); } catch (e) {}
      posts.push([t, b]);
      const lin = Array.isArray(b) ? b : [b];
      return rota.fulfill({ status: 201, contentType: "application/json",
        body: JSON.stringify(lin.map(x => ({ id: `f4490000-0000-0000-0000-${String(++seq).padStart(12, "0")}`, criado_em: new Date().toISOString(), ...x }))) });
    }
    if (q.method() !== "GET") return rota.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  const p = await ctx.newPage();
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);

  // 1 · a conta da próxima rodada
  const conta = await p.evaluate(() => ({
    sem: proximaRepeticao({ repetir: { n: 7, un: "d" }, lembrar_em: "2026-11-02" }, "2026-11-03"),
    atrasada: proximaRepeticao({ repetir: { n: 7, un: "d" }, lembrar_em: "2026-10-01" }, "2026-11-08"),
    apos: proximaRepeticao({ repetir: { n: 15, un: "d", apos: true }, lembrar_em: "2026-10-01" }, "2026-11-08"),
    mes: proximaRepeticao({ repetir: { n: 1, un: "m" }, lembrar_em: "2026-01-31" }, "2026-02-01"),
    fatal: proximaRepeticao({ repetir: { n: 7, un: "d" }, lembrar_em: "2026-11-02", natureza: "fatal" }, "2026-11-03"),
    rot: rotRepetir({ n: 15, un: "d", apos: true })
  }));
  conf(`semanal conta da data da tarefa (${conta.sem})`, conta.sem === "2026-11-09");
  conf(`a atrasada pula as rodadas que já passaram (${conta.atrasada})`, conta.atrasada === "2026-11-12");
  conf(`"depois de concluir" conta da conclusão (${conta.apos})`, conta.apos === "2026-11-23");
  conf(`mensal em 31/01 cai no último dia de fevereiro (${conta.mes})`, conta.mes === "2026-02-28");
  conf("prazo fatal nunca repete", conta.fatal === null);
  conf(`o rótulo diz a regra (${conta.rot})`, conta.rot === "a cada 15 dias depois de concluir");

  // 2 · o campo de escrever grava a regra
  await p.evaluate(([cid, kid]) => { abrirFicha(cid).then(() => { casoSel = kid; abaAtiva = 2; repintarFicha(); }); }, [CLI, CASO1]);
  await p.waitForSelector(".escrever.esc-v12"); await p.waitForTimeout(400);
  await p.evaluate(() => irSubAba("escritorio")); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('.tf-nt[data-nat="compromisso"]').click()); await p.waitForTimeout(250);
  await p.click("#and-texto"); await p.waitForTimeout(200);
  conf("a Tarefa tem o Repetir", await p.locator("#esc-pnl-tf #tf-rep").isVisible());
  await p.locator(".escrever.esc-v12").screenshot({ path: "f449-tarefa.png" });
  await p.fill("#and-texto", "Conferir o pedido no Meu INSS");
  await p.evaluate(() => { document.querySelector(`#esc-pnl-tf .tf-eq[data-tfp="${eu.id}"]`).click(); document.querySelector('#esc-pnl-tf .tf-dt[data-tfd="hoje"]').click(); });
  await p.selectOption("#tf-rep", "7d");
  await p.evaluate(() => novoAndamento(casoSel)); await p.waitForTimeout(800);
  const tf = posts.filter(([t]) => t === "andamento_tarefas").map(([, b]) => b).pop();
  conf("a tarefa gravou a regra semanal", tf && tf.repetir && tf.repetir.n === 7 && tf.repetir.un === "d" && tf.repetir.apos === false);

  // 3 · concluir cria a próxima rodada, com a mesma pessoa, natureza e regra
  const n0 = posts.length;
  const prox = await p.evaluate(async () => {
    const t = { id: "t-rep", andamento_id: "a-rep", caso_id: casoSel, colaborador_id: eu.id, natureza: "compromisso",
      lembrar_em: hoje(), repetir: { n: 7, un: "d", apos: false } };
    tarefaNaMemoria(t); (D.tarefasFicha = D.tarefasFicha || []).push(t);
    await concluirDeVez("t-rep", "Conferido");
    return proximaRepeticao({ ...t, concluida_em: null });
  });
  const nova = posts.slice(n0).filter(([t]) => t === "andamento_tarefas").map(([, b]) => b);
  conf(`concluída, a próxima rodada nasceu em ${prox}`, nova.length === 1 && nova[0].lembrar_em === prox && nova[0].repetir && nova[0].repetir.n === 7 && nova[0].natureza === "compromisso");
  conf("o aviso diz a nova rodada", /nova rodada em/.test(await p.locator("#aviso").innerText()));

  // 4 · Parar encerra a repetição; o prazo fatal não renasce
  const n1 = posts.length;
  await p.evaluate(async () => {
    const t = { id: "t-par", andamento_id: "a-par", caso_id: casoSel, colaborador_id: eu.id, lembrar_em: hoje(), repetir: { n: 1, un: "m" } };
    tarefaNaMemoria(t); D.tarefasFicha.push(t);
    concluirTarefa("t-par");
  });
  conf("a janela de concluir oferece Regra e Parar", await p.locator('.ct-rep:has-text("Regra")').count() === 1 && await p.locator('.ct-rep:has-text("Parar")').count() === 1);
  await p.locator('.ct-rep:has-text("Parar")').click();
  await p.evaluate(() => fecharTarefa("t-par")); await p.waitForTimeout(500);
  const f = { id: "t-fat", andamento_id: "a-fat", caso_id: null, colaborador_id: null, natureza: "fatal", repetir: { n: 7, un: "d" } };
  await p.evaluate(async f => { f.caso_id = casoSel; f.colaborador_id = eu.id; f.lembrar_em = hoje(); tarefaNaMemoria(f); D.tarefasFicha.push(f); await concluirDeVez("t-fat", "Protocolado"); }, f);
  conf("Parar e o prazo fatal não criam rodada nova", !posts.slice(n1).some(([t]) => t === "andamento_tarefas"));
  conf("a tarefa com regra mostra o ↻ no cartão", await p.evaluate(() => tarefasCartao !== undefined && /↻ toda semana/.test(
    (() => { const a = { id: "a-x" }; const t = { id: "t-x", andamento_id: "a-x", caso_id: casoSel, colaborador_id: eu.id, lembrar_em: hoje(), repetir: { n: 7, un: "d" } }; tarefaNaMemoria(t); D.tarefasFicha.push(t); return tarefasCartao(a); })())));
  conf("sem erro de página", !erros.length);

  console.log("=== F449 · A tarefa que se repete ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  erros.forEach(e => console.log("  " + e));
  const falhas = ok.filter(([, v]) => !v).length;
  console.log(`${ok.length - falhas}/${ok.length}`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})();
