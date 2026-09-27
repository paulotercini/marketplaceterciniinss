// F151 · agenda de quarta. O CRM conversa com o Code.gs DE VERDADE (rodando
// em Node com dublês do Google, agendagas.js): contador na barra, linha do
// tempo, fluxo 002 e 001 com pré-cadastro, orientações obrigatórias,
// horário tomado no meio do caminho, confirmar, cancelar com registro no
// cliente, reserva só para o Paulo e o alerta de falta de vaga.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO } = require("./fixturas");
const { criarAgenda, quartas } = require("./agendagas");
const SUPA = "https://ficticio.supabase.co";
const URL_AG = "https://script.google.com/macros/s/TESTE/exec";
FIX.config_app = [...(FIX.config_app || []), { chave: "agenda_url", valor: URL_AG }];
const g = criarAgenda({ "t-adm": { nome: "Paulo", papel: "admin" }, "t-eq": { nome: "Amanda", papel: "equipe" } });
const q = quartas(6);
g.evento(q[0], "09:30", "10:00", "002 - Fulano Manual - Não confirmado");
g.evento(q[0], "10:00", "11:00", "Audiência JEF Catanduva");
g.evento(q[0], "08:00", "12:00", "Agenda Livre", { transparency: "transparent" });

(async () => {
  const s = http.createServer((qq, r) => {
    const a = path.join(__dirname, qq.url === "/" ? "app.html" : qq.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const erros = [], escritas = [];
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
    if (!localStorage.getItem("crm_agenda_token")) localStorage.setItem("crm_agenda_token", "t-adm");
  }, [SUPA, SESSAO]);
  await ctx.route(URL_AG, rota => rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(g.chamar(rota.request().postData())) }));
  let novoId = 0;
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      escritas.push({ m, t, u, corpo: rota.request().postData() });
      if (m === "POST" && t === "clientes") {
        const c = { id: `c9000000-0000-0000-0000-${String(++novoId).padStart(12, "0")}`, cpf: null, ...JSON.parse(rota.request().postData()) };
        return rota.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify([c]) });
      }
      return rota.fulfill({ status: 204, body: "" });
    }
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  const p = await ctx.newPage();
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D._completo);
  await p.waitForFunction(() => agq.disp !== null, null, { timeout: 5000 });
  const cont = await p.evaluate(() => (document.querySelector('.lista-item[data-v="agendaq"] .cont') || {}).textContent);
  conf(`F151 · a barra mostra a ocupação da próxima quarta (${cont})`, cont === "1/14");

  // a tela
  await p.locator('.lista-item[data-v="agendaq"]').first().click();
  await p.waitForSelector(".aq-tempo");
  const foto = n => process.env.FOTO ? p.screenshot({ path: process.env.FOTO + "-" + n + ".png" }) : null;
  await foto("tela");
  const tela = await p.evaluate(() => ({ dias: document.querySelectorAll(".aq-dia").length,
    manual: !!document.querySelector(".aq-ev.p-nenhum"), outro: !!document.querySelector(".aq-ev.outro"),
    livre: [...document.querySelectorAll(".aq-ev")].some(e => /Agenda Livre/.test(e.textContent)),
    reserva: !!document.querySelector(".aq-reserva"), almoco: !!document.querySelector(".aq-almoco") }));
  conf("F151 · seis quartas na faixa; atendimento manual, audiência em cinza, almoço e reserva do Paulo", tela.dias === 6 && tela.manual && tela.outro && tela.almoco && tela.reserva);
  conf("F151 · o 'Agenda Livre' (disponível) não ocupa a linha do tempo", !tela.livre);

  // fluxo 002: cliente do escritório
  await p.click(".aq-agendar");
  await p.fill("#aq-busca", "souza aurelia");
  await p.waitForSelector(`[data-aqcli="${CLI_CHEIO}"]`);
  const sug = await p.textContent(`[data-aqcli="${CLI_CHEIO}"]`);
  conf(`F151 · a busca acha 'Aurélia Ficta de Souza' por 'souza aurelia', com CPF mascarado (${sug.replace(/\s+/g, " ").trim()})`, /\*\*\*\.456\.789-\*\*/.test(sug));
  await p.click(`[data-aqcli="${CLI_CHEIO}"]`);
  conf("F151 · cliente do cadastro vira 002, 30 minutos", /002 · 30 minutos/.test(await p.textContent(".aq-fluxo")));
  await p.click("#aq-seg2");
  await p.waitForSelector("[data-aqacomp]");
  await p.click('[data-aqacomp="sim"]');
  conf("F151 · acompanhante com assunto próprio: aviso do agendamento individual", /agendamento é individual/.test(await p.textContent(".aq-fluxo")));
  await p.click("#aq-seg4");
  await p.waitForSelector("[data-aqhora]");
  await foto("horario");
  const temUrgente = /Encaixe urgente/.test(await p.textContent(".aq-fluxo"));
  await p.click(`[data-aqdata="${q[0]}"]`);
  await p.click('[data-aqhora="08:00"]');
  await p.click("#aq-seg5");
  const trava = await p.evaluate(() => document.getElementById("aq-gravar").disabled);
  await p.check("#aq-o1");
  const trava1 = await p.evaluate(() => document.getElementById("aq-gravar").disabled);
  await p.check("#aq-o2");
  conf("F151 · o Agendar só libera com as duas orientações marcadas", trava && trava1 && await p.evaluate(() => !document.getElementById("aq-gravar").disabled));
  await p.click("#aq-gravar");
  await p.waitForSelector(".aq-whats");
  await foto("feito");
  const ev1 = g.eventos.find(e => /Aurélia/.test(e.summary || ""));
  const dur1 = ev1 && (new Date(ev1.end.dateTime) - new Date(ev1.start.dateTime)) / 60000;
  conf(`F151 · gravou '002 - Aurélia Ficta de Souza - Não confirmado', 30 minutos (${ev1 && ev1.summary}, ${dur1})`, ev1 && /^002 - Aurélia Ficta de Souza - Não confirmado$/.test(ev1.summary) && dur1 === 30);
  conf("F151 · a mensagem de WhatsApp sai pronta, com a senha do Meu INSS", /senha do Meu INSS/.test(await p.textContent(".aq-whats")) && await p.locator("text=Abrir no WhatsApp").count() === 1);
  conf("F151 · o cliente recebe o registro (andamento) e o próximo atendimento no cadastro",
    escritas.some(w => w.t === "andamentos" && /Atendimento presencial com Paulo agendado para/.test(w.corpo)) && escritas.some(w => w.t === "clientes" && /agenda_quarta/.test(w.corpo || "")));
  conf("F151 · para o Paulo aparece o encaixe urgente das 18h00", temUrgente);
  // a segunda pessoa sugere o horário logo depois
  await p.click("#aq-segunda");
  await p.fill("#aq-busca", "Pessoa Nova Teste");
  await p.click("[data-aqnovo]");
  conf("F151 · 'Nenhum destes' vira 001, 45 minutos", /001 · 45 minutos/.test(await p.textContent(".aq-fluxo")));
  await p.fill("#aq-tel", "1699");
  await p.click("#aq-seg2");
  conf("F151 · telefone curto é recusado", /Telefone inválido/.test(await p.textContent(".aq-fluxo")));
  await p.fill("#aq-tel", "16988887777");
  await p.click("#aq-seg2");
  await p.waitForSelector('[data-aqacomp="nao"]');
  await p.click('[data-aqacomp="nao"]'); await p.click("#aq-seg4");
  await p.waitForSelector("[data-aqhora]");
  conf("F151 · a segunda pessoa vem com o horário seguinte sugerido", await p.evaluate(() => { const b = document.querySelector(".aq-horarios .sugerido"); return b && b.textContent === "08:30"; }));
  await p.click('[data-aqhora="08:30"]'); await p.click("#aq-seg5");
  // alguém ocupa o horário no meio do caminho (lançado direto no Google)
  g.evento(q[0], "08:30", "09:15", "Compromisso lançado no Google");
  await p.check("#aq-o1"); await p.check("#aq-o2"); await p.click("#aq-gravar");
  await p.waitForSelector("[data-aqhora]");
  conf("F151 · horário tomado no meio do caminho: volta à escolha com o aviso", /acabou de ser ocupado/.test(await p.textContent(".aq-fluxo")) && await p.locator('[data-aqhora="08:30"]').count() === 0);
  conf("F151 · o pré-cadastro do primeiro atendimento foi criado", escritas.some(w => w.m === "POST" && w.t === "clientes" && /primeiro_atendimento/.test(w.corpo)));
  const hora2 = await p.evaluate(() => document.querySelector("[data-aqhora]").dataset.aqhora);
  await p.click(`[data-aqhora="${hora2}"]`); await p.click("#aq-seg5");
  await p.check("#aq-o1"); await p.check("#aq-o2"); await p.click("#aq-gravar");
  await p.waitForSelector(".aq-whats");
  const ev2 = g.eventos.find(e => /Pessoa Nova Teste/.test(e.summary || ""));
  const dur2 = ev2 && (new Date(ev2.end.dateTime) - new Date(ev2.start.dateTime)) / 60000;
  conf(`F151 · primeiro atendimento gravado como 001, 45 minutos (${ev2 && ev2.summary}, ${dur2})`, ev2 && /^001 - Pessoa Nova Teste - Não confirmado$/.test(ev2.summary) && dur2 === 45);
  await p.evaluate(() => fecharCaixa());

  // confirmar e cancelar pelo menu do evento
  await p.evaluate(async () => { await carregarAgenda(); agq.sel = agq.disp.dias[0].data; pintarAgenda(); });
  const idA = g.eventos.find(e => /Aurélia/.test(e.summary)).id;
  await p.click(`[data-aqev="${idA}"]`); await p.click('[data-aqop="confirmar"]');
  await p.waitForTimeout(400);
  conf("F151 · Confirmar troca o fim do título para 'Confirmado'", /Aurélia Ficta de Souza - Confirmado$/.test(g.eventos.find(e => e.id === idA).summary));
  const idManual = g.eventos.find(e => /Fulano Manual/.test(e.summary)).id;
  await p.click(`[data-aqev="${idManual}"]`);
  const opsManual = await p.evaluate(() => [...document.querySelectorAll(".aq-menu [data-aqop]")].map(b => b.dataset.aqop).join(","));
  conf(`F151 · atendimento lançado à mão só tem Confirmar e Abrir cliente (${opsManual})`, opsManual === "confirmar,abrir");
  await p.keyboard.press("Escape"); await p.mouse.click(5, 5);
  const antes = escritas.length;
  await p.click(`[data-aqev="${idA}"]`); await p.click('[data-aqop="cancelar"]');
  await p.waitForTimeout(500);
  conf("F151 · Cancelar tira o evento e registra no cliente", !g.eventos.some(e => e.id === idA) && escritas.slice(antes).some(w => /cancelado/.test(w.corpo || "")));

  // F152 · o Marcos atende no mesmo horário que o Paulo, em verde, e não vê o evento azul
  await p.evaluate(() => { fecharCaixa(); visao = "agendaq"; render(); });
  await p.click('[data-aqprof="marcos"]');
  await p.waitForFunction(() => agq.prof === "marcos" && agq.disp && agq.disp.profissional === "marcos");
  await p.waitForTimeout(300); await foto("marcos");
  const mar = await p.evaluate(() => ({ dias: agq.disp.dias.length, seg: agq.disp.dias.some(d => d.diaSemana === 1), azul: !!document.querySelector(".aq-ev.p-paulo") }));
  conf(`F152 · Marcos atende de segunda a sexta (${mar.dias} dias) e não vê o atendimento azul do Paulo`, mar.dias === 10 && mar.seg && !mar.azul);
  await p.click(".aq-agendar");
  await p.fill("#aq-busca", "souza aurelia"); await p.click(`[data-aqcli="${CLI_CHEIO}"]`); await p.click("#aq-seg2");
  await p.waitForSelector("[data-aqacomp]"); await p.click('[data-aqacomp="nao"]'); await p.click("#aq-seg4");
  await p.waitForSelector("[data-aqhora]");
  conf("F152 · no fluxo, o Marcos vem escolhido e sem encaixe urgente", await p.evaluate(() => fluxo.prof === "marcos" && !/Encaixe urgente/.test(document.querySelector(".aq-fluxo").textContent)));
  await p.click(`[data-aqdata="${q[0]}"]`); await p.click('[data-aqhora="08:00"]'); await p.click("#aq-seg5");
  await p.check("#aq-o1"); await p.check("#aq-o2"); await p.click("#aq-gravar");
  await p.waitForSelector(".aq-whats");
  const evM = g.eventos.find(e => /Aurélia/.test(e.summary) && e.colorId === "10");
  conf("F152 · o mesmo horário (08h00) vale para o Marcos, gravado em verde", !!evM && new Date(evM.start.dateTime).getTime() === new Date(q[0] + "T08:00:00-03:00").getTime());
  conf("F152 · a mensagem cita o profissional escolhido", /com o Dr\. Marcos/.test(await p.textContent(".aq-whats")));
  await p.evaluate(() => fecharCaixa());
  // F152 · o Paulo troca a quarta por uma quinta
  await p.click('[data-aqprof="paulo"]');
  await p.waitForFunction(() => agq.prof === "paulo" && agq.disp && agq.disp.profissional === "paulo");
  const quinta = (() => { const d = new Date(q[1] + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); })();
  await p.click('#topo-extra button:has-text("Dias de atendimento")');
  await p.waitForTimeout(300); await foto("dias");
  await p.selectOption("#dj-de", q[1]); await p.fill("#dj-para", quinta); await p.click("#dj-trocar");
  await p.waitForFunction(q1 => agq.cache.paulo && !agq.cache.paulo.dias.some(d => d.data === q1), q[1]);
  conf("F152 · trocar a quarta pela quinta: a quinta entra e a quarta sai da agenda do Paulo",
    await p.evaluate(qi => agq.cache.paulo.dias.some(d => d.data === qi && d.diaSemana === 4), quinta));
  await p.evaluate(() => fecharCaixa());

  // equipe: sem reserva do Paulo
  await p.evaluate(async () => { guardar("crm_agenda_token", "t-eq"); agq.disp = null; await carregarAgenda(); });
  const semReserva = await p.evaluate(() => agq.disp.dias.every(d => d.bloqueado || (d.livres["002"] || []).every(s => !s.reserva && s.inicio < "18:00")));
  conf("F151 · para a equipe, o encaixe das 18h00 não aparece", semReserva);
  await p.evaluate(() => { visao = "agendaq"; render(); });
  conf("F152 · só o Paulo vê 'Dias de atendimento'", await p.locator('#topo-extra button:has-text("Dias de atendimento")').count() === 0);

  // sem vaga nas seis quartas: o alerta aparece
  // (a quinta que entrou na troca também precisa de feriado para zerar as vagas)
  q.forEach(d => { g.diaInteiro("ipt0crldsn7gg9s0gl9hn6l5b8@group.calendar.google.com", d, "Feriado");
    const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + 1); g.diaInteiro("ipt0crldsn7gg9s0gl9hn6l5b8@group.calendar.google.com", x.toISOString().slice(0, 10), "Feriado"); });
  await p.evaluate(() => { agq.prof = "paulo"; agq.cache = {}; });
  await p.evaluate(async () => { agq.disp = null; agq.cache = {}; visao = "agendaq"; render(); await new Promise(r => setTimeout(r, 600)); });
  await p.waitForSelector(".aq-alerta");
  conf("F151 · feriado bloqueia a quarta e, sem vaga, aparece o alerta", /Nenhuma vaga/.test(await p.textContent(".aq-alerta")) && /Feriado ou férias/.test(await p.textContent(".aq-faixa")));

  console.log("=== F151 · agenda de quarta ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length + erros.length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
