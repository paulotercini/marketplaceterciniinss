// F71 — a aba CNJ sem o buraco em branco: o menu das fontes (⚡ PJe primeiro,
// padrão) vive no TOPO da coluna dos andamentos; o detector do 📌 não vira
// mais "Perícia" com data de prazo (exige palavra de agendamento); o 📌 grava
// a obs de origem no evento; e a linha do PJe ganha o "⚠ não é deste caso".
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const D0 = new Date(); const iso = d => d.toISOString().slice(0, 10);
const mais = n => { const d = new Date(D0); d.setDate(d.getDate() + n); return iso(d); };
const br = s => `${s.slice(8,10)}/${s.slice(5,7)}/${s.slice(0,4)}`;
const PROC = "0000000-11.2020.4.03.9999";

Object.assign(FIX.casos[0], { fase: "judicial", processo: PROC,
  datajud: { ultimo: { nome: "Conclusos para decisão", data: "2026-08-20" },
    recentes: [{ nome: "Juntada de petição", data: "2026-08-18" }],
    consultado_em: "2026-08-22", orgao: "1ª Vara Federal Fictícia", classe: "RecInoCiv" } });
const AND_PJE = "a0000000-0000-0000-0000-00000000f711";
FIX.andamentos = [
  { id: AND_PJE, caso_id: CASO1, autor_id: EU, origem: "pje",
    origem_id: "mov:00000001120204039999:2026-08-21T10:00", andamentos_lidos: [],
    criado_em: "2026-08-21T10:00:00Z",
    texto: `PJe (2º grau): Decorrido prazo de PESSOA FICTÍCIA em 20/08/2026 23:59. — em 21.08.2026 00:40 — RecInoCiv ${PROC}` }];

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
    window.confirm = () => true;
  }, [SUPA, SESSAO]);
  const escritos = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      const corpo = JSON.parse(rota.request().postData() || "{}");
      escritos.push({ m, t, corpo, u });
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

  await p.evaluate(([cli, caso]) => { abrirFicha(cli).then(() => {
    const m = document.getElementById("modal"); if (m) { m.style.display = "none"; m.innerHTML = ""; }
    casoSel = caso; abaAtiva = 2; subAba = "cnj"; pintarFicha(); }); }, [CLI_CHEIO, CASO1]);
  await p.waitForTimeout(900);

  // 1) o menu das fontes está no TOPO da coluna (não abaixo do cartão)
  conf("os botões de coleta ficam em CIMA dos andamentos (alinhados ao cartão)",
    await p.evaluate(() => { const f = document.querySelector(".sub-menu.fontes");
      const c = document.querySelector(".fatos-processo");
      return f && c && Math.abs(f.getBoundingClientRect().top - c.getBoundingClientRect().top) < 8; }));
  conf("⚡ Coleta do PJe vem PRIMEIRO no menu e é a fonte padrão",
    await p.evaluate(() => { const bs = [...document.querySelectorAll(".sub-menu.fontes button")];
      return bs.length === 2 && /Coleta do PJe/.test(bs[0].textContent) &&
        bs[0].classList.contains("on") && /Coleta oficial/.test(bs[1].textContent); }));
  conf("a caixa das coletas do PJe abre de cara, sem parte em branco",
    await p.evaluate(() => /coletas do PJe \(1\)/.test(
      document.querySelector('.painel[data-p="2"].ativo').textContent)));

  // 2) o detector do 📌 desconfiado: data de prazo não vira perícia
  conf("'perícia' + data de PRAZO no texto NÃO vira evento (fantasma morta)",
    await p.evaluate(d => eventoNoTexto(`Perícia do autor. Decorrido prazo em ${d} 23:59.`) === null, br(mais(30))));
  conf("'perícia agendada para dd/mm às hh:mm' continua virando evento",
    await p.evaluate(d => { const e = eventoNoTexto(`Perícia agendada para ${d} às 8:50 no posto fictício`);
      return e && e.tipo === "Perícia" && e.hora === "08:50"; }, br(mais(30))));
  conf("'comparecer' também vale como palavra de agendamento",
    await p.evaluate(d => !!eventoNoTexto(`Audiência: comparecer em ${d} 14:00`), br(mais(40))));

  // 3) o 📌 grava a obs de origem no evento agendado
  escritos.length = 0;
  await p.evaluate(([caso, txt]) => { const i = segRegistrar(caso, txt, null);
    abrirSeguimento(i); }, [CASO1, `Perícia agendada para ${br(mais(30))} às 8:50 no posto fictício`]);
  await p.waitForTimeout(400);
  await p.evaluate(() => salvarSeguimento());
  await p.waitForTimeout(500);
  conf("o agendamento do 📌 nasce com a obs do trecho de origem (auditável)",
    escritos.some(x => x.m === "POST" && x.t === "eventos" &&
      /Perícia agendada para/.test(x.corpo.obs || "")));
  await p.evaluate(() => fecharCaixa());
  await p.waitForTimeout(300);
  // o salvarSeguimento repinta a ficha — volta à sub-aba do CNJ antes do 4
  await p.evaluate(caso => { casoSel = caso; abaAtiva = 2; subAba = "cnj"; pintarFicha(); }, CASO1);
  await p.waitForTimeout(500);

  // 4) o intruso: ⚠ não é deste caso remove e aponta a causa
  escritos.length = 0;
  conf("a linha do PJe tem o botão '⚠ não é deste caso'",
    await p.evaluate(() => [...document.querySelectorAll(".painel.ativo button")]
      .some(b => /não é deste caso/.test(b.textContent))));
  await p.evaluate(() => [...document.querySelectorAll(".painel.ativo button")]
    .find(b => /não é deste caso/.test(b.textContent)).click());
  await p.waitForTimeout(500);
  conf("o clique apaga o andamento intruso no banco",
    escritos.some(x => x.m === "DELETE" && /andamentos\?id=eq\./.test(x.u)));
  conf("e o aviso denuncia a CAUSA: o número gravado na ficha do caso",
    await p.evaluate(() => /está GRAVADO neste caso/.test(
      document.getElementById("aviso").textContent)));

  console.log("=== F71 · a aba CNJ no lugar e as fantasmas do 📌 ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
