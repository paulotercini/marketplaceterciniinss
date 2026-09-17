// F81/F102 — a LINHA DO CASO do tema v10 (era a régua por fase). Só existe com o tema ligado; a linha da
// DER some do cartão (ela mora na régua); o número vivo troca com a fase:
// protocolo no INSS, NUP do e-Sisrec no Conselho, número CNJ no judicial; os
// números das fases anteriores ficam dobrados. Com o tema desligado nada
// disso aparece e o cartão segue igual à 09.75.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

Object.assign(FIX.casos[0], { der: "2025-03-14", nb: "41/210.334.552-0", protocolos: ["1234567890", "9988776655"] });
const C2 = "b0000000-0000-0000-0000-000000000002", C3 = "b0000000-0000-0000-0000-000000000003";
const base = { cliente_id: CLI_CHEIO, marcadores: [], arquivados: {}, ronda: {}, importante: false, urgente: false,
  criado_em: "2026-02-01T12:00:00Z", prazo: null, revisado_em: new Date().toISOString().slice(0, 10) };
FIX.casos.push({ ...base, id: C2, titulo: "Aposentadoria especial", beneficio: "Aposentadoria especial", especie: "B46",
  fase: "conselho", origem_lista: "🖥 Conselho de Recursos", protocolos: ["5550001112"], processos: [],
  crps_nups: ["44233100482202611"], ro_protocolado_em: "2026-02-10", der: "2024-12-18" });
FIX.casos.push({ ...base, id: C3, titulo: "Auxílio-acidente", beneficio: "Auxílio-acidente", especie: "B94",
  fase: "judicial", origem_lista: "👪 Judicial", protocolos: ["3391552077"], processo: "50008711920264036108", processos: [],
  crps_nups: [], classe_judicial: "PJEC", orgao_judicial: "JEF de Catanduva", ajuizado_em: "2026-04-14", der: "2025-05-02", nb: "94/205.331.008-2" });
FIX.atribuicoes.push({ caso_id: C2, colaborador_id: EU }, { caso_id: C3, colaborador_id: EU });

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (rota.request().method() !== "GET") return rota.fulfill({ status: 204, body: "" });
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());   // sem rede, sem fonte: cai no Segoe
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error" && !/ERR_FAILED/.test(m.text())) erros.push("console: " + m.text()); });
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const abrir = async (q) => {
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html${q}`);
    await p.waitForSelector("#app.logado");
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
    await p.evaluate(async (cli) => { await abrirFicha(cli); }, CLI_CHEIO);
  };
  // F102 · a régua virou a LINHA DO CASO: DER e tramitação à vista, os
  // números (NB, e-Sisrec, judicial) no ➕ da direita, o cartão no ➕ da gestão
  const linha = async (id) => {
    await p.evaluate(async (a) => { casoSel = a; abaAtiva = 2; subAba = "escritorio"; lcAbrir(a, 1); }, id);
    await p.waitForTimeout(150);
    return p.evaluate(() => {
      const r = document.querySelector(".linha-caso"); if (!r) return null;
      const topo = r.querySelector(".lc-topo"), nums = r.querySelector(".lc-numeros");
      return { topo: topo.innerText.replace(/\s+/g, " ").trim(), nums: nums ? nums.innerText.replace(/\s+/g, " ").trim() : "",
        tram: (r.querySelector(".lc-tram") || {}).textContent || "",
        cops: [...r.querySelectorAll("[data-cop]")].map(e => e.dataset.cop),
        cartaoFora: !document.querySelector(".painel[data-p='2'] > .fatos-processo") };
    });
  };

  // ── ligado ───────────────────────────────────────────────────────────────
  await abrir("?tema=v10");
  conf("o tema v10 está no <html>", await p.evaluate(() => document.documentElement.getAttribute("data-tema") === "v10"));
  const inss = await linha(CASO1);
  conf("INSS: a linha do caso existe e o cartão saiu da frente", !!inss && inss.cartaoFora);
  conf("INSS: a DER está na linha, em dd/mm/aaaa", inss && /DER 14\/03\/2025/.test(inss.topo));
  conf("INSS: a tramitação é INSS", inss && inss.tram === "INSS");
  conf("INSS: o NB mora no ➕ dos números", inss && /NB 41\/210\.334\.552-0/.test(inss.nums));
  conf("INSS: os protocolos não poluem a linha (ficam na gestão)", inss && !/9988776655/.test(inss.topo + inss.nums));
  conf("a DER copia no clique", inss && inss.cops.includes("14/03/2025"));
  const cr = await linha(C2);
  conf("Conselho: a tramitação é Conselho de Recursos", cr && cr.tram === "Conselho de Recursos");
  conf("Conselho: o e-Sisrec formatado está nos números", cr && /E-SISREC 44233\.100482\/2026-11/i.test(cr.nums));
  conf("Conselho: sem NB, o ➕ oferece incluir NB", cr && /Incluir \+ NB/i.test(cr.nums));
  const ju = await linha(C3);
  conf("Judicial: a tramitação é Judicial e o CNJ formatado está nos números", ju && ju.tram === "Judicial" && /5000871-19\.2026\.4\.03\.6108/.test(ju.nums));
  conf("Judicial: o rito aparece ao lado do processo", ju && /JEF/.test(ju.nums));
  conf("Judicial: o número copia no clique", ju && ju.cops.includes("5000871-19.2026.4.03.6108"));
  await p.evaluate((id) => lcAbrir(id, 2), C3); await p.waitForTimeout(150);
  const gest = await p.evaluate(() => ({ gestao: !!document.querySelector(".lc-gestao"), prot: /3391552077/.test(document.querySelector(".lc-gestao").innerText),
    ficha: !!document.querySelector(".lc-ficha .fatos-processo"),
    derNoCartao: (d => !!d && getComputedStyle(d).display !== "none")(document.querySelector('.lc-ficha .fx[data-fato="der"]')) }));
  conf("o segundo ➕ traz protocolos e a ficha completa dobrada", gest.gestao && gest.prot && gest.ficha);
  conf("a DER não se repete dentro da ficha completa", !gest.derNoCartao);

  // ── desligado ────────────────────────────────────────────────────────────
  await abrir("?tema=");
  const off = await p.evaluate(async (a) => { casoSel = a; abaAtiva = 2; repintarFicha(); await new Promise(r => setTimeout(r, 150));
    return { tema: document.documentElement.getAttribute("data-tema"), linha: !!document.querySelector(".linha-caso"),
      der: !!document.querySelector('.fatos-processo .fx[data-fato="der"]') }; }, CASO1);
  conf("desligado: sem data-tema", !off.tema);
  conf("desligado: a linha do caso não existe", !off.linha);
  conf("desligado: a DER continua no cartão", off.der);

  for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
