// F87 — vocabulário do CRM e NATUREZA DO PEDIDO.
// (a) os rótulos de escritório: "Tramitação", "Tramitação em paralelo",
//     "Prazos e providências", "Números anteriores" — nada de linguagem
//     inventada na tela que o cliente pode ver por cima do ombro;
// (b) a natureza do pedido (concessão, revisão, acerto de cadastro) marcada
//     no cartão do caso, com o chip no topo. Sem a coluna no banco, o clique
//     avisa qual arquivo rodar e não deixa a marca colada na tela.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

Object.assign(FIX.casos[0], { fase: "conselho", origem_lista: "🖥 Conselho de Recursos", der: "2024-12-18",
  protocolos: ["4712009318"], crps_nups: ["44233100482202611"], ro_protocolado_em: "2025-09-24",
  processo: "50012345620264036108", classe_judicial: "MSCiv",
  orgao_judicial: "1ª Vara Federal de Catanduva", ajuizado_em: "2026-08-11", prazo: null });

(async () => {
  let recusarNatureza = false; const escritos = [];
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
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      const corpo = rota.request().postData() || "";
      escritos.push({ t, corpo });
      // o banco sem a coluna responde 42703, como o Postgres de verdade
      if (recusarNatureza && /natureza/.test(corpo))
        return rota.fulfill({ status: 400, contentType: "application/json",
          body: JSON.stringify({ code: "42703", message: 'column "natureza" of relation "casos" does not exist' }) });
      return rota.fulfill({ status: 204, body: "" });
    }
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error" && !/ERR_FAILED|42703|400/.test(m.text())) erros.push("console: " + m.text()); });
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const abrir = async (q) => {
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html${q}`);
    await p.waitForSelector("#app.logado");
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
    await p.evaluate(async (a) => { await abrirFicha(a.cli); casoSel = a.id; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); }, { cli: CLI_CHEIO, id: CASO1 });
    await p.waitForTimeout(250);
  };

  // ── (a) vocabulário ──────────────────────────────────────────────────────
  await abrir("?tema=v10");
  const tela = await p.evaluate(() => ({
    regua: document.querySelector(".regua-caso").textContent.replace(/\s+/g, " "),
    acao: document.querySelector(".acao-caso").textContent.replace(/\s+/g, " "),
    tudo: document.querySelector(".painel[data-p='2']").textContent.replace(/\s+/g, " ") }));
  conf("a régua diz 'Tramitação em paralelo'", /Tramitação em paralelo/.test(tela.regua));
  conf("os números antigos são 'Números anteriores · N'", /Números anteriores · 1/.test(tela.regua));
  conf("o campo vazio diz 'não informado', não 'a atribuir'", /NB\s*não informado/.test(tela.regua) && !/a atribuir/.test(tela.regua));
  conf("a coluna se chama 'Prazos e providências'", /Prazos e providências/.test(tela.acao));
  conf("e o vazio dela fala como escritório", /Sem prazos ou providências em aberto/.test(tela.acao));
  conf("sumiram as expressões inventadas", !/trilhas vivas|cobra ação|cliente esquecido/.test(tela.tudo));
  await p.evaluate(() => { const k = D.casoPorId.get(casoSel); k.processo = null; k.processos = []; k.classe_judicial = null; repintarFicha(); });
  conf("com uma frente só, o rótulo é 'Tramitação'", await p.evaluate(() => /Tramitação/.test(document.querySelector(".rg-lbl").textContent) && !/paralelo/.test(document.querySelector(".rg-lbl").textContent)));

  // ── (b) natureza do pedido ───────────────────────────────────────────────
  const nat = await p.evaluate(() => {
    const l = [...document.querySelectorAll(".nat-linha")][0];
    return l ? { rot: l.querySelector(".marc-rot").textContent.trim(), botoes: [...l.querySelectorAll("button")].map(b => b.textContent.trim()) } : null;
  });
  conf("o cartão tem a linha NATUREZA DO PEDIDO", nat && nat.rot === "NATUREZA DO PEDIDO");
  conf("com os três valores do escritório", nat && nat.botoes.join("|") === "Concessão|Revisão|Acerto de cadastro");
  await p.evaluate(() => document.querySelectorAll(".nat-linha button")[1].click());
  await p.waitForTimeout(300);
  const gravou = escritos.filter(e => e.t === "casos").map(e => JSON.parse(e.corpo)).find(b => "natureza" in b);
  conf("clicar grava a natureza escolhida", gravou && gravou.natureza === "revisao");
  conf("o botão fica marcado e o chip sobe para o topo do cartão", await p.evaluate(() =>
    document.querySelectorAll(".nat-linha button")[1].classList.contains("on") &&
    /Revisão/.test((document.querySelector(".fatos-topo .nat-chip") || {}).textContent || "")));
  await p.evaluate(() => document.querySelectorAll(".nat-linha button")[1].click());
  await p.waitForTimeout(300);
  conf("clicar de novo tira a natureza", await p.evaluate(() => D.casoPorId.get(casoSel).natureza === null));

  // banco sem a coluna: avisa e não deixa marca falsa
  recusarNatureza = true;
  await p.evaluate(() => document.querySelectorAll(".nat-linha button")[0].click());
  await p.waitForTimeout(600);
  const avisoTxt = await p.evaluate(() => (document.querySelector(".aviso") || {}).textContent || "");
  conf("sem a coluna no banco, o aviso diz qual arquivo rodar", /schema_natureza\.sql/.test(avisoTxt));
  conf("e a natureza não fica marcada na tela", await p.evaluate(() => !D.casoPorId.get(casoSel).natureza));

  // ── desligado: a natureza continua (é dado, não visual) ──────────────────
  recusarNatureza = false;
  await abrir("?tema=");
  conf("desligado: a linha da natureza continua no cartão", await p.evaluate(() => !!document.querySelector(".nat-linha")));

  for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
