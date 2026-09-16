// F96 — O MESMO MINUTO NÃO É O MESMO MOVIMENTO. O PJe registra a distribuição
// como três eventos às 12:50 (Recebido pelo Distribuidor, Distribuído por
// sorteio, a inicial com os anexos). A conferência do processo completo
// tratava "mesmo processo + mesma data + mesma hora" como já gravado e dizia
// "4 conhecidos, 0 novos" para uma ficha que tinha 2. Agora o minuto carrega
// os textos gravados, e só o texto igual é conhecido.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const NUM = "5011816-67.2026.4.03.6302", DIG = "50118166720264036302";
const COLETA = { id: "col-96", fonte: "pje-processo", criado_em: new Date().toISOString(), aplicada_em: null,
  dados: { versao: 1, fonte: "pje-processo", grau: "1º grau", host: "pje1g.trf3.jus.br", numero: NUM,
    classe: "PJEC", orgao: "1ª Vara Gabinete JEF", link: "https://pje1g.trf3.jus.br/pje/x",
    itens: [
      { evento: 4, data: "2026-09-15", hora: "14:34", textos: ["Juntada de certidão"], docs: [{ id: "4", nome: "CERTIDÃO" }] },
      { evento: 3, data: "2026-08-06", hora: "12:50", textos: ["Recebido pelo Distribuidor"], docs: [] },
      { evento: 2, data: "2026-08-06", hora: "12:50", textos: ["Distribuído por sorteio"], docs: [] },
      { evento: 1, data: "2026-08-06", hora: "12:50", textos: [], docs: [{ id: "1", nome: "PETIÇÃO INICIAL" }, { id: "1", nome: "PROCURAÇÃO" }] },
    ] } };
// o que a ficha já tinha, pelo acervo (mov:): os dois de sempre
const JA_TINHA = [
  { origem_id: `mov:${DIG}:2026-09-15T14:34`, texto: `PJe (1º grau): Juntada de certidão — em 15.09.2026 14:34 — PJEC ${NUM}` },
  { origem_id: `mov:${DIG}:2026-08-06T12:50`, texto: `PJe (1º grau): Recebido pelo Distribuidor — em 06.08.2026 12:50 — PJEC ${NUM}` },
];

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
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") { escritos.push({ t, m, corpo: rota.request().postData() || "" });
      return rota.fulfill({ status: 200, contentType: "application/json", body: "[]" }); }
    let corpo = FIX[t] || [];
    if (t === "coletas") corpo = /id=eq\.col-96/.test(u) ? [COLETA] : [];
    if (t === "andamentos" && /origem=eq\.pje/.test(u)) corpo = JA_TINHA;
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
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);

  // a aritmética do minuto, isolada
  const a = await p.evaluate(([dig, num]) => {
    const mm = momentosPje([{ origem_id: `mov:${dig}:2026-08-06T12:50`, texto: `PJe (1º grau): Recebido pelo Distribuidor — em 06.08.2026 12:50 — PJEC ${num}` }]);
    return {
      igual: momentoConhecido(mm, `${dig}:2026-08-06T12:50`, "Recebido pelo Distribuidor"),
      acento: momentoConhecido(mm, `${dig}:2026-08-06T12:50`, "RECEBIDO PELO DISTRIBUÍDOR"),
      outro: momentoConhecido(mm, `${dig}:2026-08-06T12:50`, "Distribuído por sorteio"),
      soAnexos: momentoConhecido(mm, `${dig}:2026-08-06T12:50`, "📎 PETIÇÃO INICIAL · 📎 PROCURAÇÃO"),
      outroMinuto: momentoConhecido(mm, `${dig}:2026-08-06T12:51`, "Recebido pelo Distribuidor"),
      semTexto: momentoConhecido(momentosPje([`mov:${dig}:2026-08-06T12:50`]), `${dig}:2026-08-06T12:50`, "qualquer coisa"),
    };
  }, [DIG, NUM]);
  conf("mesmo minuto + mesmo texto = conhecido (sem diferenciar maiúscula ou acento)", a.igual && a.acento);
  conf("mesmo minuto + outro texto = movimento NOVO", !a.outro && !a.soAnexos);
  conf("outro minuto = novo; minuto gravado sem texto continua valendo pelo minuto", !a.outroMinuto && a.semTexto);

  // a conferência do processo completo, de ponta a ponta
  await p.evaluate(([caso, num]) => { D.casoPorId.get(caso).processo = num; }, [CASO1, NUM]);
  await p.evaluate(() => { visao = "patinss"; return conferirPjeProc("col-96"); });
  await p.waitForFunction(() => typeof planoPjeProcAtual !== "undefined" && planoPjeProcAtual && planoPjeProcAtual.coleta_id === "col-96");
  const r = await p.evaluate(() => ({ resumo: planoPjeProcAtual.resumo, textos: planoPjeProcAtual.andamentos.map(x => x.texto) }));
  conf("dos 4 itens, 2 a ficha já tinha e 2 são novos (a distribuição por sorteio e a inicial com anexos)",
    r.resumo.itens === 4 && r.resumo.conhecidos === 2 && r.resumo.movimentos === 2);
  conf("os novos são exatamente os do mesmo minuto com outro texto",
    r.textos.some(t => /Distribuído por sorteio — em 06\.08\.2026 12:50/.test(t)) && r.textos.some(t => /📎 PETIÇÃO INICIAL · 📎 PROCURAÇÃO — em 06\.08\.2026 12:50/.test(t)));
  conf("a tela não oferece mais 'gravar 0' para uma história que a ficha não tinha inteira",
    await p.evaluate(() => /Gravar 2 movimento/.test(document.getElementById("conteudo-meio").textContent)));

  for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
