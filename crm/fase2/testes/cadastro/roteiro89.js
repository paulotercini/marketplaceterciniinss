// F89 — O ROTEIRO DA PERÍCIA. O caminho que o escritório percorre em toda
// perícia (quesitos → atendimento de preparação → documentos novos → véspera
// → estudo do processo → conclusão do caso) sai de dentro da cabeça e vira
// sete passos com data calculada, no mesmo modal do 📌 dar seguimento.
//
// O exemplo do Paulo é a régua desta prova: perícia em 16/11/2026 às 13h20
// tem de produzir atendimento em 11/11 (3 dias úteis antes) e estudo +
// conclusão em 10/11 (1 dia útil antes do atendimento).
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

// uma segunda colaboradora, que é quem agenda o atendimento
const AMANDA = "a0000000-0000-0000-0000-0000000000a1";
FIX.colaboradores.push({ id: AMANDA, nome: "Amanda Ficticia", inicial: "A", cor: "#E6A700",
  papel: "assistente", ativo: true, cargo: "assistente" });

const TEXTO = "Perícia médica judicial agendada para o dia 16/11/2026 às 13h20min — RAFAEL BOGAS. " +
  "Avisar a cliente, agendar atendimento e pedir documentos médicos novos.";

(async () => {
  const escritos = [];
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
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      const corpo = rota.request().postData() || "";
      escritos.push({ t, m, corpo });
      // devolve uma linha com id, que é o que o app espera do return=representation
      return rota.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify([{ ...(JSON.parse(corpo || "{}")), id: "x" + escritos.length }]) });
    }
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error" && !/ERR_FAILED/.test(m.text())) erros.push("console: " + m.text()); });
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);

  // o 📌 dar seguimento de uma anotação com perícia marcada
  await p.evaluate(([caso, txt]) => { const i = segRegistrar(caso, txt, "and-origem"); abrirSeguimento(i); }, [CASO1, TEXTO]);
  await p.waitForSelector(".rot-box");
  const campos = () => p.evaluate(() => ({
    atend: document.getElementById("rot-atend-data").value,
    estudo: document.getElementById("rot-estudo-data").value,
    concl: document.getElementById("rot-concl-dia").textContent,
    ques: document.getElementById("rot-ques-data").value,
    vesp: document.getElementById("rot-vesp-data").value,
    passos: [...document.querySelectorAll(".rot-li .rot-rot")].map(e => e.textContent.trim()),
    quemAtend: [...document.getElementById("rot-atend-quem").options].map(o => o.textContent) }));
  let c = await campos();
  conf("o roteiro abre junto com o agendamento", c.passos.length === 6);
  conf("e traz os passos do escritório, na ordem",
    c.passos.join("|") === "📝 Quesitos|📅 Atendimento de preparação|📄 Documentos médicos novos|🗓 Mensagem de lembrete ao cliente|📖 Estudar o processo|⏰ Conclusão do caso");
  conf("atendimento 3 dias úteis antes da perícia de 16/11 → 11/11", c.atend === "2026-11-11");
  conf("estudo 1 dia útil antes do atendimento → 10/11", c.estudo === "2026-11-10");
  conf("a conclusão do caso segue o dia do estudo → 10.11.2026", c.concl === "10.11.2026");
  conf("os quesitos vêm com data (5 dias úteis antes)", c.ques === "2026-11-09");
  conf("a equipe inteira pode ficar com o atendimento", c.quemAtend.includes("Amanda"));

  // trocar a data do atendimento arrasta estudo e conclusão
  await p.evaluate(() => { const i = document.getElementById("rot-atend-data"); i.value = "2026-11-12"; i.dispatchEvent(new Event("change")); });
  c = await campos();
  conf("mudou o atendimento, o estudo acompanha (12/11 → 11/11)", c.estudo === "2026-11-11" && c.concl === "11.11.2026");
  await p.evaluate(() => { const i = document.getElementById("rot-atend-data"); i.value = "2026-11-11"; i.dispatchEvent(new Event("change")); });

  // Amanda fica com o atendimento e a véspera
  await p.evaluate(a => { for (const id of ["rot-atend-quem", "rot-vesp-quem"]) { const sel = document.getElementById(id); sel.value = a; sel.dispatchEvent(new Event("change")); } }, AMANDA);
  await p.evaluate(() => { document.getElementById("seg-txt").value = "Avisar a cliente da perícia."; });
  await p.evaluate(() => salvarSeguimento());
  await p.waitForTimeout(700);

  const ands = escritos.filter(e => e.t === "andamentos").map(e => JSON.parse(e.corpo));
  const tfs = escritos.filter(e => e.t === "andamento_tarefas").map(e => JSON.parse(e.corpo));
  const evs = escritos.filter(e => e.t === "eventos").map(e => JSON.parse(e.corpo));
  const casos = escritos.filter(e => e.t === "casos" && e.m === "PATCH").map(e => JSON.parse(e.corpo));
  const acha = rx => ands.find(a => rx.test(a.texto || ""));
  conf("a perícia foi agendada na aba Perícias", evs.length === 1 && evs[0].data_hora === "2026-11-16T13:20:00-03:00" && evs[0].tipo === "Perícia");
  conf("nasceu o passo dos quesitos, com a data", !!acha(/Apresentar os quesitos da perícia de 16\.11\.2026 às 13:20/));
  conf("nasceu o atendimento de preparação, com o nome do cliente e as duas datas",
    !!acha(/Agendar o atendimento de preparação com Aurélia para 11\.11\.2026, antes da perícia de 16\.11\.2026/));
  conf("nasceu o pedido de documentos novos, com o prazo da perícia",
    !!acha(/Pedir a Aurélia documentos médicos novos até o dia da perícia \(16\.11\.2026\)/));
  conf("nasceu a véspera da mensagem ao cliente", !!acha(/Véspera da perícia de 16\.11\.2026: mandar a mensagem/));
  conf("nasceu o estudo do processo, amarrado ao atendimento", !!acha(/Estudar o processo para a perícia de 16\.11\.2026, antes do atendimento de 11\.11\.2026/));
  conf("o atendimento ficou com quem o escritório escolheu (Amanda)",
    tfs.some(t => t.colaborador_id === AMANDA && t.lembrar_em === "2026-11-11"));
  conf("o estudo ficou para o advogado, em 10/11",
    tfs.some(t => t.colaborador_id === EU && t.lembrar_em === "2026-11-10"));
  conf("a conclusão do caso passou para o dia do estudo", casos.some(b => b.prazo === "2026-11-10"));
  conf("e o CRM guardou quem agenda o atendimento, para a próxima perícia",
    escritos.some(e => e.t === "config_app" && /pericia_quem_atendimento/.test(e.corpo)));

  // quesitos já apresentados: o texto diz, o roteiro entende
  await p.evaluate(([caso, txt]) => { const i = segRegistrar(caso, txt, null); abrirSeguimento(i); },
    [CASO1, "Perícia médica agendada para o dia 20/12/2026 às 10h. Quesitos foram apresentados."]);
  await p.waitForSelector(".rot-box");
  conf("com 'quesitos foram apresentados' no texto, o roteiro já marca 'só registrar'",
    await p.evaluate(() => document.getElementById("rot-ques-tipo").value === "feito" &&
      document.getElementById("rot-ques-data").style.display === "none"));

  // julgamento do CRPS não tem roteiro (não há presença nem preparação)
  await p.evaluate(() => fecharCaixa());
  await p.evaluate(([caso]) => { const i = segRegistrar(caso, "Julgamento agendado para o dia 03/12/2026 às 14h.", null); abrirSeguimento(i); }, [CASO1]);
  await p.waitForTimeout(200);
  conf("julgamento no CRPS segue sem roteiro", await p.evaluate(() => !document.querySelector(".rot-box")));

  for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
