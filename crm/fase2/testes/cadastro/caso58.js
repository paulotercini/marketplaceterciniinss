// F58 — o cartão do caso na ordem do Paulo: espécie primeiro, o essencial da
// fase (INSS: subespécies+DER+protocolo; judicial: distribuição+onde está+
// processos; conselho: datas recursais dinâmicas), quadro de datas, o ➕ mais
// informações dobrado com o resto, e as ações por último.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CLI_VAZIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const C_INSS = "b0000000-0000-0000-0000-00000000c058";
const C_CRPS = "b0000000-0000-0000-0000-00000000c059";
// CLI_VAZIO ganha um caso INSS (B31 rural, com DCB) e um caso no Conselho
// o CASO1 vira judicial neste teste (a fixtura base o deixa no INSS)
Object.assign(FIX.casos[0], { fase: "judicial", ajuizado_em: "2026-07-09",
  orgao_judicial: "1ª Vara Gabinete JEF de Catanduva",
  processos: [{ numero: "5001930-08.2026.4.03.6314", principal: true, nosso: true, acompanhar: true }] });
FIX.casos.push(
  { id: C_INSS, cliente_id: CLI_VAZIO, beneficio: "Auxílio-doença", especie: "B31",
    fase: "inss", protocolos: ["111222333"], der: "2026-05-10", nb: "9988776655",
    dcb: "2026-09-30", dcb_prorrogar_em: "2026-09-15", marcadores: ["rural"],
    criado_em: "2026-05-01T12:00:00Z", prazo: null, datajud: null },
  { id: C_CRPS, cliente_id: CLI_VAZIO, beneficio: "Aposentadoria por idade", especie: "B41",
    fase: "conselho", protocolos: ["444555666"], der: "2025-01-20",
    ro_protocolado_em: "2026-06-01",
    criado_em: "2026-06-01T12:00:00Z", prazo: null, datajud: null });

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
  const verCaso = async (cli, caso) => {
    await p.evaluate(([cli, caso]) => { abrirFicha(cli).then(() => {
      const m = document.getElementById("modal"); if (m) { m.style.display = "none"; m.innerHTML = ""; }
      casoSel = caso; abaAtiva = 2; pintarFicha(); }); }, [cli, caso]);
    await p.waitForTimeout(700);
  };

  // ── caso INSS (B31 rural) ───────────────────────────────────────────────
  await verCaso(CLI_VAZIO, C_INSS);
  conf("INSS: a espécie vem primeiro — o código B no topo do cartão (F69)",
    await p.evaluate(() => { const e = document.querySelector(".fatos-processo .esp-cod");
      return e && e.closest(".fatos-topo") && /B31/.test(e.textContent); }));
  conf("INSS: as subespécies (rural…) aparecem logo abaixo da espécie",
    await p.evaluate(() => { const s = document.querySelector(".fatos-processo");
      const i = s.innerHTML; return i.indexOf("esp-cod") < i.search(/Rural/) &&
        /Rural/.test([...s.querySelectorAll(":scope > *")].map(x=>x.textContent).join(" ")); }));
  conf("INSS: a DER está à vista, com o ➕ logo abaixo (F70)",
    await p.evaluate(() => { const der = document.querySelector('.fatos-processo [data-fato="der"]');
      const bt = document.querySelector(".fatos-processo .fx-mais-bt");
      return der && bt &&
        !!(der.compareDocumentPosition(bt) & Node.DOCUMENT_POSITION_FOLLOWING); }));
  conf("INSS: NB, DIB e o protocolo ficaram dobrados no ➕ (F69: corpo fechado nem renderiza)",
    await p.evaluate(() => { const s2 = document.querySelector(".fatos-processo");
      return !s2.querySelector(".fx-mais-corpo") && !/111222333/.test(s2.textContent); }));
  conf("B31: a janelinha da incapacidade mostra a DCB com o prorrogar 15 dias antes",
    await p.evaluate(() => { const cx = document.querySelector(".fatos-processo .fx-incap");
      return cx && /DCB/.test(cx.textContent) && /30\.09\.2026/.test(cx.textContent) &&
        /Prorrogar a partir de/.test(cx.textContent) && /15\.09\.2026/.test(cx.textContent); }));
  conf("as ações (não é caso · Encerrar) moram no RODAPÉ do cartão",
    await p.evaluate(() => { const blocos = [...document.querySelectorAll(".fatos-processo > *")];
      const rodape = blocos[blocos.length - 1];
      return /Encerrar caso/.test(rodape.textContent) && /não é caso/.test(rodape.textContent); }));

  // o ➕ aberto sobrevive à repintura (F69: botão + corpo, mesma mecânica)
  await p.evaluate(() => document.querySelector(".fatos-processo .fx-mais-bt").click());
  await p.waitForTimeout(400);
  conf("o clique no ➕ abre o corpo com NB, DIB e o protocolo",
    await p.evaluate(() => { const c = document.querySelector(".fatos-processo .fx-mais-corpo");
      return c && c.querySelector('[data-fato="nb"]') && c.querySelector('[data-fato="dib"]') &&
        /111222333/.test(c.textContent); }));
  await p.evaluate(() => pintarFicha());
  await p.waitForTimeout(500);
  conf("o ➕ aberto continua aberto depois da repintura (maisAberto)",
    await p.evaluate(() => !!document.querySelector(".fatos-processo .fx-mais-corpo")));

  // ── caso no CONSELHO: datas recursais dinâmicas ─────────────────────────
  await p.evaluate(() => fecharFicha(false));
  await verCaso(CLI_VAZIO, C_CRPS);
  conf("CRPS: RO preenchido mostra também o campo dos Embargos",
    await p.evaluate(() => { const s = document.querySelector(".fatos-processo");
      return s.querySelector('[data-fato="ro_protocolado_em"]') &&
        s.querySelector('[data-fato="ed_protocolado_em"]') &&
        !s.querySelector('[data-fato="re_protocolado_em"]'); }));
  escritos.length = 0;
  await p.evaluate(caso => { const k = D.casoPorId.get(caso);
    k.ed_protocolado_em = "2026-07-10";
    return patchCaso(caso, { ed_protocolado_em: "2026-07-10" }); }, C_CRPS);
  await p.waitForTimeout(400);
  await p.evaluate(() => pintarFicha());
  await p.waitForTimeout(500);
  conf("CRPS: gravado o ED, o campo do Recurso Especial aparece (dinâmico)",
    escritos.some(x => x.m === "PATCH" && x.t === "casos" && x.corpo.ed_protocolado_em === "2026-07-10") &&
    await p.evaluate(() => !!document.querySelector('.fatos-processo [data-fato="re_protocolado_em"]')));
  await p.evaluate(() => document.querySelector(".fatos-processo .fx-mais-bt").click());
  await p.waitForTimeout(400);
  conf("CRPS: o ➕ guarda os dados do INSS (DER e protocolo de lá)",
    await p.evaluate(() => { const mais = document.querySelector(".fatos-processo .fx-mais-corpo");
      return mais && mais.querySelector('[data-fato="der"]') && /444555666/.test(mais.textContent); }));

  // ── caso JUDICIAL: distribuição, onde está, processos ───────────────────
  await p.evaluate(() => fecharFicha(false));
  await verCaso(CLI_CHEIO, CASO1);
  conf("judicial: 'Distribuído em' e 'Onde está' na tela principal",
    await p.evaluate(() => { const fora = [...document.querySelectorAll(".fatos-processo > dl.fx-grade")]
        .map(x => x.textContent).join(" ");
      return /Distribuído em/.test(fora) && /Onde está/.test(fora); }));
  conf("judicial: os números dos processos vinculados aparecem logo abaixo",
    await p.evaluate(() => { const el = document.querySelector(".fatos-processo .fx-procs, .fatos-processo > dl.fx-grade [data-fato=\"processo\"]");
      return !!el; }));
  await p.evaluate(() => document.querySelector(".fatos-processo .fx-mais-bt").click());
  await p.waitForTimeout(400);
  conf("judicial: a trilha (etapas anteriores) mora dentro do ➕",
    await p.evaluate(() => { const mais = document.querySelector(".fatos-processo .fx-mais-corpo");
      return mais && !!mais.querySelector(".trilha-proc"); }));

  console.log("=== F58 · o cartão do caso na ordem do Paulo ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
