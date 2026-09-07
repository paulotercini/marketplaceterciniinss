// F86 — TRILHA PARALELA e o resto da paridade com o protótipo. Caso no
// Conselho com mandado de segurança impetrado ao lado: o MS não é a fase
// seguinte, é a segunda trilha viva (instrumental). A régua mostra as duas,
// o Caso completo NÃO inventa uma "Ação judicial", o telefone entra na faixa
// do cliente e o ✔ li aparece no que o robô trouxe.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

Object.assign(FIX.casos[0], { fase: "conselho", origem_lista: "🖥 Conselho de Recursos", der: "2024-12-18",
  protocolos: ["4712009318"], crps_nups: ["44233100482202611"], ro_protocolado_em: "2025-09-24",
  processo: "50012345620264036108", classe_judicial: "MSCiv",
  orgao_judicial: "1ª Vara Federal de Catanduva", ajuizado_em: "2026-08-11" });
FIX.andamentos = [
  { id: "a0000000-0000-0000-0000-00000000f861", caso_id: CASO1, autor_id: EU, origem: "app",
    criado_em: "2026-08-11T12:00:00Z", andamentos_lidos: [], texto: "Mandado de segurança impetrado contra a mora do Conselho." },
  { id: "a0000000-0000-0000-0000-00000000f862", caso_id: CASO1, autor_id: EU, origem: "pat", origem_id: "c9",
    criado_em: "2026-08-25T10:00:00Z", andamentos_lidos: [], texto: "INSS · Situação: em análise." },
];

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
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error" && !/ERR_FAILED/.test(m.text())) erros.push("console: " + m.text()); });
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const abrir = async (q, aba) => {
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html${q}`);
    await p.waitForSelector("#app.logado");
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
    await p.evaluate(async (a) => { await abrirFicha(a.cli); casoSel = a.id; abaAtiva = 2; subAba = a.aba; repintarFicha(); }, { cli: CLI_CHEIO, id: CASO1, aba });
    await p.waitForTimeout(250);
  };

  await abrir("?tema=v10", "escritorio");
  const rg = await p.evaluate(() => {
    const r = document.querySelector(".regua-caso");
    return { txt: r.textContent.replace(/\s+/g, " ").trim(), trilhas: r.querySelectorAll(".rg-trk").length,
      papeis: [...r.querySelectorAll(".rg-papel")].map(e => e.textContent.trim()),
      lbl: (r.querySelector(".rg-lbl") || {}).textContent };
  });
  conf("a régua diz que há DUAS trilhas vivas", /Duas trilhas vivas/.test(rg.lbl));
  conf("são duas linhas de trilha", rg.trilhas === 2);
  conf("o recurso no Conselho é a trilha PRINCIPAL", rg.papeis[0] === "Principal" && /Recurso e-Sisrec ?44233\.100482\/2026-11/.test(rg.txt));
  conf("o mandado de segurança é a trilha INSTRUMENTAL", rg.papeis[1] === "Instrumental" && /Mandado de Segurança/.test(rg.txt));
  conf("o processo do MS NÃO caiu em 'fase anterior'", !/2 números de fases anteriores/.test(rg.txt) && /1 número de fase anterior/.test(rg.txt));
  conf("e o órgão do MS aparece na trilha", /1ª Vara Federal de Catanduva/.test(rg.txt));

  await p.evaluate(() => { subAba = "tudo"; repintarFicha(); }); await p.waitForTimeout(200);
  const fases = await p.evaluate(() => [...document.querySelectorAll(".fase-b summary .nm")].map(e => e.textContent.trim()));
  conf("o Caso completo NÃO inventa uma fase 'Ação judicial'", !fases.some(f => /Ação judicial/.test(f)));
  conf("o caso segue em duas fases: Conselho (atual) e INSS", fases.length === 2 && /Recurso no Conselho/.test(fases[0]));
  const liInfo = await p.evaluate(() => {
    const b = [...document.querySelectorAll(".timeline .tl-li")];
    return { n: b.length, onclick: b[0] ? b[0].getAttribute("onclick") : "" };
  });
  conf("o que o robô trouxe (INSS) ganha o ✔ li no Caso completo", liInfo.n === 1 && /liNaFicha/.test(liInfo.onclick));
  const tel = await p.evaluate(() => {
    const e = [...document.querySelectorAll(".det-topo .resumo .id-min")].find(x => /Telefone/.test(x.textContent));
    return e ? { txt: e.textContent.replace(/\s+/g, " ").trim(), copia: !!e.querySelector("button[onclick^='copiar']") } : null;
  });
  conf("o telefone entra na faixa do cliente, com copiar", tel && /\(16\) 99999-0001/.test(tel.txt) && tel.copia);

  await abrir("?tema=", "escritorio");
  const off = await p.evaluate(() => ({
    regua: !!document.querySelector(".regua-caso"),
    tel: !![...document.querySelectorAll(".det-topo .resumo .id-min")].find(x => /Telefone/.test(x.textContent)),
    li: document.querySelectorAll(".timeline .tl-li").length }));
  conf("desligado: sem régua, sem telefone na faixa, sem ✔ li no completo", !off.regua && !off.tel && off.li === 0);

  for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
})().catch(e => { console.error("FALHA", e); process.exit(1); });
