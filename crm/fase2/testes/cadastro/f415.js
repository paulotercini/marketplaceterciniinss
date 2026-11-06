// F415 · Portaria Conjunta MPS/INSS 54/2026: a reanálise do B31 negado por análise documental (10 dias da ciência), a
// preclusão pelo recurso dentro desses 10 dias, o recurso contado da decisão da reanálise e os dois indeferimentos que levam à perícia
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, EU, CLI_CHEIO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const dia = n => new Date(Date.now() + n * 864e5).toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });
const TUDO = FIX;

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
    if (rota.request().method() !== "GET")
      return rota.fulfill({ status: 201, contentType: "application/json", body: "[]" });
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
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const r = await p.evaluate((caso) => {
    const k0 = D.casoPorId.get(caso), out = {};
    const k = { ...k0, beneficio: "Auxílio por incapacidade temporária", especie: "B31", fase: "inss", etapa: "decidido", resultado: "indeferido",
      decisao_em: "2026-11-10", situacao_inss: "Indeferido - análise documental", ro_protocolado_em: null, re_protocolado_em: null, ed_protocolado_em: null, ronda: {} };
    out.item = PRAZOS_CATALOGO.find(x => x.id === "reanl");
    out.rea = reanaliseAte(k); out.rec = recorrerAte(k);
    const s = prazoDaEtapa(k); out.etItem = s && s.item.id; out.etAlt = s && s.alt && s.alt.fatal;
    const pend = { ...k, ronda: { reanalise: { pedida_em: "2026-11-12" } } };
    out.recPend = recorrerAte(pend); out.reaPend = reanaliseAte(pend);
    out.recDec = recorrerAte({ ...k, ronda: { reanalise: { pedida_em: "2026-11-12", decidida_em: "2026-11-25", resultado: "indeferido" } } });
    out.recDef = recorrerAte({ ...k, ronda: { reanalise: { pedida_em: "2026-11-12", decidida_em: "2026-11-25", resultado: "deferido" } } });
    const ro = { ...k, ro_protocolado_em: "2026-11-13" };
    out.precl = reanalisePreclusa(ro); out.reaRo = reanaliseAte(ro);
    out.preclFora = reanalisePreclusa({ ...k, ro_protocolado_em: "2026-11-30" });
    const velho = { ...k, decisao_em: "2026-11-03" };
    out.reaVelho = reanaliseAte(velho); const sv = prazoDaEtapa(velho); out.etVelho = sv && sv.item.id; out.recVelho = recorrerAte(velho);
    out.naoInc = reanaliseAte({ ...k, beneficio: "Aposentadoria por idade", situacao_inss: "Indeferido" });
    const proc = (at, motivo) => ({ servico: "Auxílio por Incapacidade Temporária", status: "Concluído", entrada: at, atualizado: at,
      comunicacoes: [{ contra: true, decisao: "Indeferido", motivo }] });
    const doc = "parecer técnico contrário na análise documental";
    const x2 = reqCtxTeste({ fd: { processos: [proc("01/06/2026", doc), proc("01/08/2026", doc)] } });
    const x1 = reqCtxTeste({ fd: { processos: [proc("01/06/2026", "não constatada incapacidade em perícia"), proc("01/08/2026", doc)] } });
    const med = (REQ_BENEF.b31 || []).find(q => q.id === "documentos_analise_documental").mede;
    out.dois = med({ ...x2, v: { inc_docs: "Sim" } }); out.um = med({ ...x1, v: { inc_docs: "Sim" } });
    out.seg2 = indefDocumentaisSeguidos(x2); out.seg1 = indefDocumentaisSeguidos(x1);
    const lau = (tipo, dii, dcb) => ({ tipo, dii, dcb, resultado: "incapaz", exame: dii });
    out.soma = _incSomaDocumental(reqCtxTeste({ fd: { laudos: [lau("Análise Documental", "01/01/2026", "30/01/2026"), lau("Análise Documental", "01/03/2026", "20/03/2026")] } }));
    out.somaZera = _incSomaDocumental(reqCtxTeste({ fd: { laudos: [lau("Análise Documental", "01/01/2026", "30/01/2026"), lau("Perícia presencial", "01/02/2026", "28/02/2026"), lau("Análise Documental", "01/03/2026", "20/03/2026")] } }));
    out.guia = (GUIAS_ESPECIE.b31 || {}).nota || "";
    out.trilha = TRILHAS.inss_inc.e.includes("*Reanálise documental");
    return out;
  }, CASO1);
  conf("o catálogo tem a reanálise de 10 dias corridos", r.item && r.item.n === 10 && !r.item.uteis);
  conf("ciência em 10/11/2026: reanálise até 23/11 (20/11 é feriado nacional)", r.rea === "2026-11-23");
  conf("e o recurso até 10/12/2026", r.rec === "2026-12-10");
  conf("a etapa decidido oferece primeiro a reanálise e, ao lado, o recurso", r.etItem === "reanl" && r.etAlt === "2026-12-10");
  conf("reanálise pedida e não decidida: não há Recorrer até, nem nova reanálise", r.recPend === null && r.reaPend === null);
  conf("reanálise mantida em 25/11: recurso até 28/12 (25/12 feriado, 26/12 sábado)", r.recDec === "2026-12-28");
  conf("reanálise deferida encerra o prazo do recurso", r.recDef === null);
  conf("recurso em 13/11 sem reanálise: aviso de preclusão", r.precl === true && r.reaRo === null);
  conf("recurso depois dos 10 dias não é preclusão", r.preclFora === false);
  conf("ciência em 03/11/2026: só o recurso", r.reaVelho === null && r.etVelho === "crps" && r.recVelho === "2026-12-03");
  conf("fora da incapacidade não há reanálise", r.naoInc === null);
  conf("dois indeferimentos documentais seguidos: o veredito vai à perícia", r.seg2 === 2 && /perícia/.test(r.dois.txt) && /art\. 8º/.test(r.dois.txt));
  conf("um só documental não muda o veredito", r.seg1 === 1 && !/dois indeferimentos/.test((r.um || {}).txt || ""));
  conf("a soma documental junta os dias concedidos (30 + 20)", r.soma === 50);
  conf("a perícia favorável reinicia a soma", r.somaZera === 20);
  conf("a guia do B31 manda pedir a reanálise antes do recurso", /reanálise em 10 dias/.test(r.guia));
  conf("a trilha da incapacidade tem a reanálise opcional", r.trilha);
  conf("sem erro na página", !erros.length);
  await nav.close(); s.close();
  const n = ok.filter(x => x[1]).length;
  ok.forEach(([t, v]) => console.log(`${v ? "✓" : "✗"} ${t}`));
  if (erros.length) console.log(erros.join("\n"));
  console.log(`${n}/${ok.length}`);
  process.exit(n === ok.length ? 0 : 1);
})();
