// F44 — TODA movimentação do PAT consta em 📣. O protocolo que só avançou a
// "última atualização" vira novidade própria (deduplicada pelo carimbo), a
// primeira situação importada também entra, e o aplicar grava tudo.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

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
      return rota.fulfill({ status: 204, contentType: "application/json", body: "" });
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

  // o plano é função pura: dá para provar cada regra direto nela
  const plano = (det, extraD) => p.evaluate(([det, extraD, caso, cli]) => {
    const k = { id: caso, cliente_id: cli, protocolos: ["7770001"], fase: "inss",
      situacao_inss: det._situacaoNoCrm ?? null, titulo: "t",
      beneficio: "Auxílio-Acidente" };   // sem backfill pendente: isola a regra da movimentação
    const Df = { casos: [k], clientes: [{ id: cli, cpf: "12345678909", nome: "X" }],
      eventos: [], andamentos: (extraD && extraD.andamentos) || [] };
    return planoDeImportacao({
      lista: [{ protocolo: "7770001", cpf: "12345678909", situacao: det.situacao,
        atualizado_em: det.atualizado_em, servico: "Auxílio-Acidente" }],
      detalhes: [{ protocolo: "7770001", tipo: "beneficio", situacao: det.situacao,
        beneficio: "Auxílio-Acidente", especie: null, der: null, link: null,
        marcadores: [], comentarios: [], eventos: [] }],
    }, Df, "2026-08-17");
  }, [det, extraD || null, CASO1, CLI_CHEIO]);

  // 1) só a "última atualização" avançou → vira movimentação para 📣
  let pl = await plano({ situacao: "Em análise", _situacaoNoCrm: "Em análise",
    atualizado_em: "17/08/2026 14:54" });
  conf("movimentação sem outra mudança entra no plano (1)",
    pl.atualizacoes.length === 1 && pl.resumo.movimentacoes === 1);
  conf("e NÃO polui a lista de casos a atualizar", pl.atualizar.length === 0);

  // 2) o mesmo carimbo já gravado não repete
  pl = await plano({ situacao: "Em análise", _situacaoNoCrm: "Em análise",
    atualizado_em: "17/08/2026 14:54" },
    { andamentos: [{ caso_id: CASO1, origem_id: "atualizacao:7770001:170820261454" }] });
  conf("o carimbo já visto deduplica (0)", pl.atualizacoes.length === 0);

  // 3) situação mudou → a mudança fala por si (sem linha extra de movimentação)
  pl = await plano({ situacao: "Concluída", _situacaoNoCrm: "Em análise",
    atualizado_em: "17/08/2026 15:18" });
  conf("com mudança de situação, entra a mudança e não a movimentação",
    pl.atualizacoes.length === 0 && pl.atualizar.length === 1 &&
    /INSS: Em análise → Concluída/.test(pl.atualizar[0].andamento));

  // 4) a PRIMEIRA situação importada também consta
  pl = await plano({ situacao: "Em análise", _situacaoNoCrm: null,
    atualizado_em: "17/08/2026 15:16" });
  conf("primeira situação vira novidade (Situação registrada)",
    pl.atualizar.length === 1 && /INSS · Situação registrada: Em análise/.test(pl.atualizar[0].andamento));

  // 5) o aplicar grava a movimentação com o origem_id do carimbo
  escritos.length = 0;
  await p.evaluate(caso => {
    planoPat = { atualizar: [], novos: [], comentarios: [], eventos: [],
      atualizacoes: [{ caso_id: caso, protocolo: "7770001", ts: "17/08/2026 14:54",
        situacao: "Em análise" }], resumo: {} };
    return aplicarPatDeVerdade();
  }, CASO1);
  await p.waitForTimeout(900);
  const mov = escritos.find(x => x.m === "POST" && x.t === "andamentos" &&
    /Movimentação no protocolo 7770001/.test(x.corpo.texto || ""));
  conf("o aplicar grava a movimentação como novidade do PAT",
    mov && mov.corpo.origem === "pat" &&
    mov.corpo.origem_id === "atualizacao:7770001:170820261454" &&
    /situação: Em análise/.test(mov.corpo.texto) && /14:54/.test(mov.corpo.texto));

  console.log("=== toda movimentação do PAT em 📣 (F44) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
