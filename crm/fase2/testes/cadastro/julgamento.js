// F51 — JULGAMENTO no seguimento: sem "preparação do cliente". O texto é o
// agendamento em si, a tarefa de conferir o RESULTADO nasce no dia útil
// seguinte e a atribuição padrão é do admin (o Paulo). Perícia segue como era.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

// datas RELATIVAS, a mesma lição do novidades.js: com data fixa esta prova
// passa na semana em que foi escrita e apodrece na virada do mês — o
// detector, CERTO, ignora agendamento no passado. O julgamento cai num dia
// útil de segunda a quinta para que o "dia útil seguinte" seja o dia corrido.
const iso = d => d.toISOString().slice(0, 10);
const mais = n => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const br = d => iso(d).split("-").reverse().join(".");
let SALTO = 3; while ([0, 5, 6].includes(mais(SALTO).getDay())) SALTO++;
const dJul = mais(SALTO), dLem = mais(SALTO + 1), dPeri = mais(SALTO + 3);
const curtoJul = br(dJul).slice(0, 6).replace(/\./g, "/") + iso(dJul).slice(2, 4);

const TXT_JULG = `Sessão de julgamento agendada para ${curtoJul} 09:20 na 25ª Junta de Recursos.`;
const TXT_PERI = `Perícia médica agendada para ${br(dPeri).replace(/\./g, "/")} 14:00 na APS local.`;

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
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);

  // 1) o modal 📌 com texto de JULGAMENTO
  await p.evaluate(([caso, tx]) => abrirSeguimento(segRegistrar(caso, tx, null, false)), [CASO1, TXT_JULG]);
  await p.waitForTimeout(300);
  const txt = await p.evaluate(() => document.getElementById("seg-txt").value);
  conf("o texto é o agendamento em si, com dia e hora",
    new RegExp(`Julgamento agendado para ${br(dJul)} às 09:20`).test(txt) && /Verificar o resultado/.test(txt));
  conf("nada de 'avisar para preparação' em julgamento",
    !/prepara/i.test(txt) && !/Avisar/i.test(txt));
  conf("a data de lembrar já vem no dia útil SEGUINTE ao julgamento",
    (await p.evaluate(() => document.getElementById("seg-data").value)) === iso(dLem));
  conf("a atribuição padrão é do Paulo (admin), com o chip já marcado",
    await p.evaluate(id => segAberto.quem.has(id) &&
      document.querySelector(`.seg-quem[data-col="${id}"]`).classList.contains("on"), EU));
  conf("a véspera de 'mensagem ao cliente' não é oferecida para julgamento",
    await p.evaluate(() => !/VÉSPERA/.test(document.getElementById("modal").textContent)));

  // 2) registrar pelo modal: tarefa do dia seguinte para o admin, sem véspera
  escritos.length = 0;
  await p.evaluate(() => salvarSeguimento());
  await p.waitForTimeout(600);
  conf("o registro grava o andamento do agendamento e agenda o evento",
    escritos.some(x => x.t === "andamentos" && /Julgamento agendado/.test(x.corpo.texto || "")) &&
    escritos.some(x => x.t === "eventos" && x.corpo.tipo === "Julgamento"));
  conf("a tarefa de conferir nasce no dia seguinte, para o admin",
    escritos.some(x => x.t === "andamento_tarefas" && x.corpo.lembrar_em === iso(dLem) &&
      x.corpo.colaborador_id === EU));
  conf("nenhuma véspera nasce no julgamento",
    !escritos.some(x => x.t === "andamentos" && /Véspera/.test(x.corpo.texto || "")));

  // 3) o 1 clique (aplicarPericia) com julgamento: mesmo comportamento
  escritos.length = 0;
  await p.evaluate(() => { D.eventos = []; });   // o passo 2 já tinha agendado o julgamento
  const r = await p.evaluate(([caso, tx]) =>
    aplicarPericia({ casoId: caso, texto: tx, andId: null }), [CASO1, TXT_JULG.replace("25ª", "9ª")]);
  await p.waitForTimeout(400);
  conf("o 1 clique agenda e programa o resultado (sem 📞 nem véspera)",
    new RegExp(`agendado \\+ resultado ${br(dLem)}`).test(r || "") &&
    escritos.some(x => x.t === "andamentos" && /Verificar o resultado/.test(x.corpo.texto || "")) &&
    !escritos.some(x => x.t === "andamentos" && /(Avisar|Véspera)/.test(x.corpo.texto || "")));
  conf("a tarefa do 1 clique também é do admin no dia seguinte",
    escritos.some(x => x.t === "andamento_tarefas" && x.corpo.lembrar_em === iso(dLem) &&
      x.corpo.colaborador_id === EU));

  // 4) regressão: PERÍCIA continua com o aviso de preparação + véspera
  escritos.length = 0;
  await p.evaluate(() => { D.eventos = []; });   // limpa o evJaAgendado
  await p.evaluate(([caso, tx]) =>
    aplicarPericia({ casoId: caso, texto: tx, andId: null }), [CASO1, TXT_PERI]);
  await p.waitForTimeout(400);
  conf("perícia segue como era: 📞 preparação hoje + véspera",
    escritos.some(x => x.t === "andamentos" && /Avisar .*preparação/.test(x.corpo.texto || "")) &&
    escritos.some(x => x.t === "andamentos" && /Véspera da perícia/.test(x.corpo.texto || "")));

  console.log("=== julgamento no seguimento (F51) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
