// F549/F556 · a tela Perícias (Visões), igual ao protótipo aprovado: lista, prévia, Ligar, advogado, Notificações e a data mudada
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, EU, CLI_CHEIO, CASO1 } = require("./fixturas");
const chamadas = [];
const cfg = [];
const soCh = [];
const locCh = [];
const SUPA = "https://ficticio.supabase.co";
const dia = n => new Date(Date.now() + n * 864e5).toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });

const EV = "e0000000-0000-0000-0000-000000000549";
const TUDO = {
  ...FIX,
  casos: [{ ...FIX.casos[0] }],
  eventos: [{ id: EV, caso_id: CASO1, tipo: "Perícia", status: "agendada", local: "APS Teste",
    data_hora: dia(20) + "T17:00:00.000Z" }],
  pericia_avisos: [],
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
    localStorage.setItem("crm_agenda_token", "token-ficticio");
  }, [SUPA, SESSAO]);
  await ctx.route(/script\.google\.com/, r => {
    const b = JSON.parse(r.request().postData() || "{}");
    const resp = b.acao === "agendamentosFuturos"
      ? { ok: true, agendamentos: [{ id: "ag1", data: dia(18), inicio: "09:00", fim: "09:30", tipo: "002", profissional: "paulo", atendimento: true, confirmado: true }] }
      : b.acao === "historico" ? { ok: true, eventos: [] } : { ok: true };
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(resp) }); });
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (rota.request().method() !== "GET") {
      if (/rpc\/pericia_ligar/.test(u)) { const b = JSON.parse(rota.request().postData()); chamadas.push(b);
        TUDO.pericia_avisos = [{ evento_id: b.p_evento, ligado: b.p_ligado, profissional: b.p_profissional,
          data_aprovada: TUDO.eventos[0].data_hora, estado: b.p_ligado ? "ligado" : "desligado" }]; }
      if (/rpc\/pericia_so_lembretes/.test(u)) { const b = JSON.parse(rota.request().postData()); soCh.push(b);
        TUDO.pericia_avisos = [{ evento_id: b.p_evento, ligado: false, so_lembretes: b.p_so, estado: "aguardando" }]; }
      if (/rpc\/pericia_local/.test(u)) locCh.push(JSON.parse(rota.request().postData()));
      if (/config_app/.test(u)) cfg.push(rota.request().postData() || u);
      return rota.fulfill({ status: 201, contentType: "application/json", body: "[]" }); }
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
  await p.waitForSelector("#app.logado", { timeout: 15000 }).catch(e => { console.log(erros); throw e; });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await p.evaluate(() => { visao = "periciasaviso"; render(); });
  await p.waitForTimeout(500);
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const txt = () => p.evaluate(() => document.getElementById("conteudo-meio").innerText);
  conf("o menu de Visões tem Perícias", await p.evaluate(() => [...document.querySelectorAll(".sidebar .lista-item")].some(e => e.dataset.v === "periciasaviso")));
  conf("dias úteis: 7 antes de 15/12/2026 é 04/12 e 1 antes é 14/12", await p.evaluate(() => uteisAntesPer("2026-12-15",7)==="2026-12-04" && uteisAntesPer("2026-12-15",1)==="2026-12-14"));
  let t = await txt();
  conf("a tela segue o protótipo: lista, prévia e Notificações", await p.evaluate(() => !!document.querySelector(".per5 #lista") && !!document.querySelector(".per5 aside.lado #prev") && !!document.querySelector(".per5 #notif")));
  conf("a perícia aparece aguardando aprovação, com o local", /Aguardando/.test(t) && /APS Teste/.test(t) && /Notificações/.test(t));
  conf("os três lembretes contam dias úteis", /7 dias úteis antes/.test(t) && /1 dia útil antes/.test(t) && /dias úteis antes/.test(t));
  await p.locator('[data-adv="amanda"]:visible').first().click(); await p.waitForTimeout(200);
  conf("escolher a Dra. Amanda marca o botão", await p.evaluate(() => [...document.querySelectorAll('[data-adv="amanda"]')].some(b => b.offsetParent && b.getAttribute("aria-pressed") === "true")));
  await p.click(`[data-sw="${EV}"]`); await p.waitForTimeout(200);
  conf("a chave da linha abre a prévia com Ligar", await p.evaluate(() => !!document.querySelector("#per-ligar")));
  await p.waitForTimeout(400);
  conf("a linha avisa o atendimento presencial já agendado", /Atendimento presencial já agendado/.test(await txt()));
  conf("a prévia avisa o atendimento já agendado e sugere Já orientado", /já tem atendimento presencial agendado/.test(await p.evaluate(() => document.querySelector(".per5 aside.lado").innerText)));
  const prev = () => p.evaluate(() => { const t = document.querySelector("#per-txt"); return t ? t.value : ((document.querySelector(".per5 .bolha") || {}).innerText || ""); });
  let bol = await prev();
  conf("a primeira mensagem diz dia, horário e local, sem dizer quem agendou nem se apresentar", /APS Teste/.test(bol) && !/INSS agendou/.test(bol) && !/Aqui é do escritório/.test(bol));
  conf("a prévia vem pronta e editável, propõe o atendimento e não pergunta o horário", await p.evaluate(() => !!document.querySelector("#per-txt")) && /precisamos agendar o seu atendimento presencial/.test(bol) && /Podemos agendar na /.test(bol) && !/Qual horário/.test(bol));
  await p.fill("#per-txt", bol + "\n\nTexto acrescentado."); await p.waitForTimeout(200);
  conf("a edição da prévia é mantida e oferece Restaurar", (await prev()).includes("Texto acrescentado.") && await p.evaluate(() => !!document.querySelector("#per-txt-volta")));
  await p.click("#per-txt-volta"); await p.waitForTimeout(200);
  conf("Restaurar volta ao texto pronto", !(await prev()).includes("Texto acrescentado."));
  await p.click("#sw-so"); await p.waitForTimeout(500);
  bol = await prev();
  conf("Já orientado grava pericia_so_lembretes e a prévia vira o lembrete", soCh.length === 1 && soCh[0].p_so === true && /Lembramos que/.test(bol) && !/atendimento presencial/.test(bol));
  await p.click("#sw-so"); await p.waitForTimeout(500);
  conf("desligar Já orientado volta ao primeiro aviso", soCh.length === 2 && soCh[1].p_so === false);
  conf("a prévia tem o campo do endereço com os endereços oficiais", await p.evaluate(() => !!document.querySelector("#per-local") && document.querySelectorAll("#per-locais option").length >= 8));
  await p.click("#per-ligar"); await p.waitForTimeout(400);
  conf("sem rua e número o Ligar não liga", chamadas.length === 0);
  const END = "Agência do INSS de Monte Alto, Rua Rui Barbosa, 664, Monte Alto";
  await p.fill("#per-local", END); await p.waitForTimeout(200);
  conf("o endereço digitado aparece na mensagem", (await prev()).includes("Rua Rui Barbosa, 664"));
  // F626 · o Ligar abre a confirmação do dia e do horário; sem digitar o horário certo e marcar o dia, não liga
  await p.click("#per-ligar"); await p.waitForTimeout(300);
  const cx = () => p.evaluate(() => { const d = document.querySelector("dialog.per-conf"); return d ? d.innerText : ""; });
  conf("F626: o Ligar abre a confirmação com dia da semana, data, horário e endereço", /14:00/.test(await cx()) && /feira|sábado|domingo/.test(await cx()) && /Rua Rui Barbosa, 664/.test(await cx()));
  const desl = () => p.evaluate(() => document.querySelector("#pc-ligar").disabled);
  conf("F626: sem conferir, o Ligar da janela fica desligado", await desl());
  await p.check("#pc-dia"); await p.fill("#pc-hora", "15:00");
  conf("F626: horário errado mantém o Ligar desligado", await desl());
  await p.fill("#pc-hora", "14:00"); await p.uncheck("#pc-dia");
  conf("F626: sem marcar o dia, o Ligar fica desligado", await desl());
  await p.click("dialog.per-conf button[value=nao]"); await p.waitForTimeout(300);
  conf("F626: Voltar não liga", chamadas.length === 0 && locCh.length === 0);
  await p.click("#per-ligar"); await p.waitForTimeout(300);
  await p.fill("#pc-hora", "14:00"); await p.check("#pc-dia");
  conf("F626: horário certo e dia marcado ligam o botão", !(await desl()));
  await p.click("#pc-ligar"); await p.waitForTimeout(600);
  conf("o Ligar grava o endereço da perícia", locCh.length === 1 && locCh[0].p_local === END && locCh[0].p_evento === EV);
  conf("com atendimento futuro agendado o Ligar dispensa a oferta", soCh.length === 3 && soCh[2].p_so === true);
  conf("o Ligar chama pericia_ligar com a Dra. Amanda", chamadas.length === 1 && chamadas[0].p_ligado === true && chamadas[0].p_profissional === "amanda");
  conf("F626: o Ligar manda a data e o horário confirmados", chamadas[0].p_confirmado === TUDO.eventos[0].data_hora);
  conf("depois do Ligar a chave da linha fica ligada", await p.evaluate(ev => document.querySelector(`[data-sw="${ev}"]`).getAttribute("aria-checked") === "true", EV));
  await p.evaluate(() => { const d = document.querySelector("#notif"); if (d) d.open = true; });
  await p.click("#sw-d7"); await p.waitForTimeout(300);
  conf("desligar o lembrete de 7 dias grava a configuração", cfg.some(x => /pericia_aviso_d7/.test(x)));
  await p.evaluate(ev => { D.eventos.find(e => e.id === ev).data_hora = new Date(Date.now() + 25 * 864e5).toISOString(); render(); }, EV);
  await p.waitForTimeout(300);
  conf("data mudada depois do Ligar mostra Data mudou e desliga a chave", /Data mudou/.test(await txt()) && await p.evaluate(ev => document.querySelector(`[data-sw="${ev}"]`).getAttribute("aria-checked") !== "true", EV));
  // F624 · hora não informada (00:00) e outro evento do caso no mesmo dia: aviso vermelho e o Ligar não liga
  const EV2 = "e0000000-0000-0000-0000-000000000624";
  await p.evaluate(([ev, ev2]) => { const o = D.eventos.find(e => e.id === ev);
    D.eventos.push({ ...o, id: ev2, data_hora: dataSP(o.data_hora) + "T03:00:00.000Z" }); render(); }, [EV, EV2]);
  await p.waitForTimeout(300);
  conf("F624: 00:00 aparece como Hora não informada e o duplicado avisa", /Hora não informada/.test(await txt()) && /Há outro evento deste caso no mesmo dia/.test(await txt()));
  const nAntes = chamadas.length;
  await p.click(`[data-prev="${EV2}"]`); await p.waitForTimeout(300);
  await p.click("#per-ligar"); await p.waitForTimeout(400);
  conf("F624: o Ligar da perícia sem hora não chama pericia_ligar", chamadas.length === nAntes);
  conf("nenhum erro de página", erros.length === 0);
  if (process.env.SHOT) { await p.evaluate(ev => { D.eventos.find(e => e.id === ev).data_hora = new Date(Date.now() + 20 * 864e5).toISOString(); render(); }, EV); await p.waitForTimeout(400); await p.evaluate(() => { document.querySelectorAll("*").forEach(e => { if (e.scrollTop) e.scrollTop = 0; }); window.scrollTo(0,0); }); await p.screenshot({ path: process.env.SHOT }); }
  console.log("=== F549 · Perícias com aprovação ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
