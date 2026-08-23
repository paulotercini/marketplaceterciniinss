// F66 — perícia cancelada some do Caso completo, do quadro 📅 e da pílula
// "volta em". F67 — o leitor de texto só cria agendamento com palavra de
// agendamento (fantasma do "24/07 empurrado para 2027" morre), e o Calendário
// ganha o banner da caça às fantasmas já gravadas (✕ fantasma / ✔ é real).
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const D0 = new Date(); const iso = d => d.toISOString().slice(0, 10);
const mais = n => { const d = new Date(D0); d.setDate(d.getDate() + n); return iso(d); };
const FUT1 = mais(10), FUT2 = mais(20), FUT3 = mais(30);

const EV_OK = "e0000000-0000-0000-0000-00000000f661";
const EV_CANC = "e0000000-0000-0000-0000-00000000f662";
const EV_SUSP = "e0000000-0000-0000-0000-00000000f663";
FIX.eventos = [
  { id: EV_OK, caso_id: CASO1, tipo: "Perícia", status: "agendada",
    data_hora: `${FUT1}T09:00:00-03:00`, local: "INSS Fictolândia", obs: null },
  { id: EV_CANC, caso_id: CASO1, tipo: "Perícia", status: "cancelada",
    data_hora: `${FUT2}T08:50:00-03:00`, local: null, obs: null },
  { id: EV_SUSP, caso_id: CASO1, tipo: "Perícia", status: "agendada",
    data_hora: `${FUT3}T09:00:00-03:00`, local: null,
    obs: "A perícia do processo fictício foi indeferida em 24/07" }];

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
    window.confirm = () => true; // o ✕ fantasma pergunta antes de cancelar
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
      if (m === "PATCH") {
        const id = (u.match(/id=eq\.([^&]+)/) || [])[1];
        const alvo = (FIX[t] || []).find(x => x.id === id);
        if (alvo) Object.assign(alvo, corpo);
      }
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

  // ── F66 · a ficha: quadro, pílula e Caso completo ──
  await p.evaluate(([cli, caso]) => { abrirFicha(cli).then(() => {
    const m = document.getElementById("modal"); if (m) { m.style.display = "none"; m.innerHTML = ""; }
    casoSel = caso; abaAtiva = 2; subAba = "tudo"; pintarFicha(); }); }, [CLI_CHEIO, CASO1]);
  await p.waitForTimeout(900);

  conf("a perícia agendada aparece no quadro 📅",
    await p.evaluate(d => new RegExp(`${d.slice(8,10)}\\.${d.slice(5,7)}\\.${d.slice(0,4)}`)
      .test(document.getElementById("quadro-datas").textContent), FUT1));
  conf("a perícia CANCELADA não aparece no quadro 📅",
    await p.evaluate(d => !new RegExp(`${d.slice(8,10)}\\.${d.slice(5,7)}\\.${d.slice(0,4)}`)
      .test(document.getElementById("quadro-datas").textContent), FUT2));
  conf("o Caso completo mostra a agendada e ESCONDE a cancelada",
    await p.evaluate(([caso]) => { const k = D.casoPorId.get(caso);
      const itens = fatosDoCasoTodo(k, []);
      return itens.some(x => /Perícia marcada/.test(x.texto)) &&
        !itens.some(x => /cancelada/.test(x.texto)); }, [CASO1]));
  conf("a pílula 'volta em' ignora a cancelada (aponta a data mais próxima)",
    await p.evaluate(([cli, d]) => { const r = proximaDataDe(cli);
      return r.proxima && r.proxima.data === d; }, [CLI_CHEIO, FUT1]));

  // ── F67 · o leitor desconfiado ──
  escritos.length = 0;
  const criouRuim = await p.evaluate(caso =>
    extrairEvento("A perícia foi indeferida em 24/07 e vamos recorrer da perícia até 30/07", caso), CASO1);
  conf("frase SEM palavra de agendamento não cria evento nenhum",
    !criouRuim && !escritos.some(x => x.t === "eventos"));
  const criouBom = await p.evaluate(([caso, d]) =>
    extrairEvento(`Perícia remarcada para ${d.slice(8,10)}/${d.slice(5,7)}/${d.slice(0,4)} às 8:50 no posto fictício`, caso),
    [CASO1, mais(45)]);
  conf("'Perícia remarcada para dd/mm/aaaa às 8:50' continua criando",
    criouBom && escritos.some(x => x.m === "POST" && x.t === "eventos" &&
      x.corpo.status === "agendada"));

  // ── F67 · o banner da caça no Calendário ──
  await p.evaluate(() => { clienteAberto = null; visao = "calendario"; render(); });
  await p.waitForTimeout(400);
  conf("o Calendário abre o banner com a suspeita (obs sem 'agendada')",
    await p.evaluate(() => { const b = document.querySelector(".cal-susp");
      return b && /para conferir/.test(b.textContent) &&
        /indeferida em 24\/07/.test(b.textContent); }));
  conf("a linha traz as duas saídas: ✕ fantasma e ✔ é real",
    await p.evaluate(() => { const l = document.querySelector(".cal-susp-linha");
      return l && /fantasma/.test(l.textContent) && /é real/.test(l.textContent); }));

  // ✔ é real: some do banner sem cancelar nada
  escritos.length = 0;
  await p.evaluate(id => manterEvento(id), EV_SUSP);
  await p.waitForTimeout(400);
  conf("✔ é real limpa a desconfiança (obs:null) e o banner esvazia",
    escritos.some(x => x.m === "PATCH" && x.t === "eventos" && x.corpo.obs === null) &&
    await p.evaluate(() => !document.querySelector(".cal-susp")));

  // e o ✕ fantasma cancela de verdade (recriando a suspeita antes)
  await p.evaluate(([id]) => { const e = D.eventos.find(x => x.id === id);
    e.obs = "texto suspeito de novo"; render(); }, [EV_SUSP]);
  await p.waitForTimeout(300);
  escritos.length = 0;
  await p.evaluate(() => { const l = document.querySelector(".cal-susp-linha");
    [...l.querySelectorAll("button")].find(b => /fantasma/.test(b.textContent)).click(); });
  await p.waitForTimeout(400);
  conf("✕ fantasma cancela o evento e a linha sai do banner",
    escritos.some(x => x.m === "PATCH" && x.t === "eventos" && x.corpo.status === "cancelada") &&
    await p.evaluate(() => !document.querySelector(".cal-susp")));

  console.log("=== F66+F67 · cancelada some e a fantasma morre ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
