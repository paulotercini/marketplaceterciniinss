// F148 · a dashboard do visual novo: os números batem com a conta feita à
// mão sobre dados fictícios, o esqueleto entra na hora com a geometria final
// (e só aparece depois de 150 ms), os blocos chegam na ordem de leitura e a
// troca de tela no meio da carga não deixa pedaço para trás.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const dia = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString("sv"); };
const K = FIX.casos;
K[0].prazo = dia(3);
K.push({ ...K[0], id: "b0000000-0000-0000-0000-00000000f148", titulo: "Revisão", especie: "B31", fase: "judicial", prazo: dia(-2), todo_task_id: null });
FIX.pagamentos = [
  { id: "f1000000-0000-0000-0000-000000000001", caso_id: K[0].id, descricao: "Honorários", valor: 1000, vencimento: dia(5), status: "aberto" },
  { id: "f1000000-0000-0000-0000-000000000002", caso_id: K[0].id, descricao: "RPV", valor: 2500, vencimento: dia(25), status: "aberto" },
  { id: "f1000000-0000-0000-0000-000000000003", caso_id: K[0].id, descricao: "Parcela", valor: 700, vencimento: dia(45), status: "aberto" },
  { id: "f1000000-0000-0000-0000-000000000004", caso_id: K[0].id, descricao: "Atrasada", valor: 400, vencimento: dia(-40), status: "aberto" },
  { id: "f1000000-0000-0000-0000-000000000005", caso_id: K[0].id, descricao: "Paga", valor: 900, vencimento: dia(-3), status: "recebido", pago_em: dia(-2) },
  { id: "f1000000-0000-0000-0000-000000000006", caso_id: K[0].id, descricao: "Cancelada", valor: 9999, vencimento: dia(3), status: "cancelado" },
];

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const erros = [];
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (rota.request().method() !== "GET") return rota.fulfill({ status: 204, body: "" });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  const p = await ctx.newPage();
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await p.waitForTimeout(400);

  // o esqueleto: no MESMO quadro do clique, com os cinco blocos da tela pronta
  const sk = await p.evaluate(() => { visao = "dashboard"; render();
    const dk = document.querySelector(".dk"), cx = document.querySelector(".sk-caixa");
    return { busy: dk && dk.getAttribute("aria-busy"), blocos: [...document.querySelectorAll("[data-dk]")].map(e => e.dataset.dk).join(","),
      atraso: cx && getComputedStyle(cx).animationDelay }; });
  conf("F148 · o esqueleto entra no mesmo quadro, com os cinco blocos da tela", sk.busy === "true" && sk.blocos === "kpis,prazos,fin,ben,extras");
  conf(`F148 · o esqueleto só aparece depois de 150 ms (${sk.atraso})`, sk.atraso === "0.15s");
  await p.waitForFunction(() => document.querySelector(".dk") && document.querySelector(".dk").getAttribute("aria-busy") === "false");
  const r = await p.evaluate(() => {
    const m = window.__dash, hj = hoje(), e7 = new Date(hj + "T12:00:00"); e7.setDate(e7.getDate() + 7);
    const it = itensAgenda(null);
    return { m, venc: it.filter(i => i.data < hj).length, sete: it.filter(i => i.data >= hj && i.data <= e7.toLocaleDateString("sv")).length,
      kpis: document.querySelectorAll(".dk-kpi").length, sobra: document.querySelectorAll("[data-dk], .sk").length,
      ordem: [...document.querySelectorAll(".dk > *")].map(e => e.className.split(" ")[0]).join(","),
      num0: (document.querySelector(".dk-kpi .dk-num") || {}).textContent };
  });
  conf(`F148 · os prazos batem com a agenda (${r.m.kpi.vencidos} vencidos, ${r.m.kpi.sete} em 7 dias)`, r.venc >= 1 && r.sete >= 1 && r.m.kpi.vencidos === r.venc && r.m.kpi.sete === r.sete && r.num0 === String(r.venc));
  conf(`F148 · a receber em 30 dias soma só o aberto no prazo (${r.m.kpi.aReceber30})`, r.m.kpi.aReceber30 === 3500);
  conf("F148 · o atraso cai na faixa certa e o cancelado fica fora", r.m.aging.find(a => a.rot === "31 a 90 dias").v === 400 && r.m.aging.find(a => a.rot === "A vencer").v === 4200);
  conf("F148 · o recebido do mês entra no gráfico", r.m.fin[r.m.fin.length - 1].recebido === 900 || r.m.fin[r.m.fin.length - 2].recebido === 900);
  conf(`F148 · a tela pronta tem quatro números e nenhum pedaço de esqueleto (${r.ordem})`, r.kpis === 4 && r.sobra === 0 && r.ordem === "dk-kpis,dk-faixa,dk-bloco,dk-extras");
  // o funil por fase leva à lista
  await p.click('.dk-hbar[data-ir="fase:inss"]'); await p.waitForTimeout(300);
  conf("F148 · a barra da fase abre a lista da fase", await p.evaluate(() => visao === "fase:inss"));
  // trocar de tela no meio da carga cancela o resto
  const corte = await p.evaluate(async () => { visao = "dashboard"; render(); visao = "planejado"; render();
    await new Promise(r => setTimeout(r, 300)); return { dk: !!document.querySelector(".dk"), pl: /Planejado/.test(document.getElementById("titulo-lista").textContent) }; });
  conf("F148 · sair da dashboard no meio da carga não deixa pedaço dela", !corte.dk && corte.pl);
  // o filtro por período refaz a conta sem erro
  await p.evaluate(() => { visao = "dashboard"; render(); });
  await p.waitForFunction(() => document.querySelector(".dk") && document.querySelector(".dk").getAttribute("aria-busy") === "false");
  await p.click('[data-dper="365"]');
  await p.waitForFunction(() => document.querySelector(".dk") && document.querySelector(".dk").getAttribute("aria-busy") === "false");
  conf("F148 · 12 meses mostra doze meses no financeiro", await p.evaluate(() => document.querySelectorAll(".dk-mes").length === 12));

  console.log("=== F148 · dashboard e esqueleto ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length + erros.length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
