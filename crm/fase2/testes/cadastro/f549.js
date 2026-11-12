// F549/F556 · a tela Perícias (Visões), igual ao protótipo aprovado: lista, prévia, Ligar, advogado, Notificações e a data mudada
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, EU, CLI_CHEIO, CASO1 } = require("./fixturas");
const chamadas = [];
const cfg = [];
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
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (rota.request().method() !== "GET") {
      if (/rpc\/pericia_ligar/.test(u)) { const b = JSON.parse(rota.request().postData()); chamadas.push(b);
        TUDO.pericia_avisos = [{ evento_id: b.p_evento, ligado: b.p_ligado, profissional: b.p_profissional,
          data_aprovada: TUDO.eventos[0].data_hora, estado: b.p_ligado ? "ligado" : "desligado" }]; }
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
  await p.click("#per-ligar"); await p.waitForTimeout(600);
  conf("o Ligar chama pericia_ligar com a Dra. Amanda", chamadas.length === 1 && chamadas[0].p_ligado === true && chamadas[0].p_profissional === "amanda");
  conf("depois do Ligar a chave da linha fica ligada", await p.evaluate(ev => document.querySelector(`[data-sw="${ev}"]`).getAttribute("aria-checked") === "true", EV));
  await p.evaluate(() => { const d = document.querySelector("#notif"); if (d) d.open = true; });
  await p.click("#sw-d7"); await p.waitForTimeout(300);
  conf("desligar o lembrete de 7 dias grava a configuração", cfg.some(x => /pericia_aviso_d7/.test(x)));
  await p.evaluate(ev => { D.eventos.find(e => e.id === ev).data_hora = new Date(Date.now() + 25 * 864e5).toISOString(); render(); }, EV);
  await p.waitForTimeout(300);
  conf("data mudada depois do Ligar mostra Data mudou e desliga a chave", /Data mudou/.test(await txt()) && await p.evaluate(ev => document.querySelector(`[data-sw="${ev}"]`).getAttribute("aria-checked") !== "true", EV));
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
