// F123 — o ☀️ Meu Dia só responde "o que vence hoje?". Duas seções, e nada
// mais: Adicionados ao dia e Vencem hoje. O aviso de aposentadoria e o
// lembrete do cliente entram DENTRO de Vencem hoje, porque são lembrete. A
// rotina do escritório, os recursos do CRPS para conferir à mão e o CadÚnico
// mudaram para 🧹 Cuidar do acervo.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, EU, CLI_CHEIO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const hoje = new Date().toISOString().slice(0, 10);

// o que esta prova acrescenta ao cenário: um lembrete vencido, um aviso de
// aposentadoria que já chegou a hora e uma rotina de todo dia
const EXTRA = {
  lembretes: [{ id: "l0000000-0000-0000-0000-000000000001", cliente_id: CLI_CHEIO,
    tipo: "geral", titulo: "Ligar sobre a perícia", intervalo_meses: 6,
    proximo_em: hoje, ativo: true, criado_por: EU, detalhes: {} }],
  aposentadorias: [{ id: "a0000000-0000-0000-0000-000000000001", cliente_id: CLI_CHEIO,
    especie: "Idade", data: hoje, lembrar_em: hoje, autor_id: EU }],
  rotinas: [{ id: "r0000000-0000-0000-0000-000000000001", titulo: "Conferir o e-mail do escritório",
    ativo: true, dias_semana: [], responsavel_id: EU, detalhe: null }],
};

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
  const TUDO = { ...FIX, ...EXTRA };
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
  await p.waitForTimeout(300);
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);

  const secoes = () => p.evaluate(() =>
    [...document.querySelectorAll("#conteudo-meio h3.secao")].map(h => h.textContent.trim()));

  const noDia = await secoes();
  conf("o Meu Dia tem duas seções, e só elas: Adicionados ao dia e Vencem hoje",
    noDia.length === 2 && /Adicionados ao dia/.test(noDia[0]) && /Vencem hoje/.test(noDia[1]));
  conf("Aposentadorias a tratar e Lembretes a fazer deixaram de ser seção",
    !noDia.some(t => /Aposentadorias a tratar|Lembretes a fazer/.test(t)));
  conf("rotina, CRPS à mão e CadÚnico não estão mais no Meu Dia",
    await p.evaluate(() => {
      const t = document.getElementById("conteudo-meio").textContent;
      return !/Rotina do escrit/.test(t) && !/sem novidade/.test(t) && !/Cad[ÚU]nico/.test(t);
    }));

  const venc = await p.evaluate(() => {
    const h = [...document.querySelectorAll("#conteudo-meio h3.secao")]
      .find(x => /Vencem hoje/.test(x.textContent));
    let el = h.nextElementSibling, txt = "", n = 0;
    while (el && !(el.tagName === "H3" && el.classList.contains("secao"))) {
      txt += el.textContent + " | "; n++; el = el.nextElementSibling;
    }
    return { titulo: h.textContent, txt, n };
  });
  conf("o lembrete vencido aparece DENTRO de Vencem hoje, com o botão de avisado",
    /Ligar sobre a perícia/.test(venc.txt) && /avisado/.test(venc.txt));
  conf("o aviso de aposentadoria também entra ali, sem seção própria",
    /já tem direito/.test(venc.txt));
  conf("o contador do título conta tudo que está embaixo dele",
    (venc.titulo.match(/\((\d+)\)/) || [])[1] === String(venc.n));

  await p.evaluate(() => { visao = "acervo"; render(); });
  await p.waitForTimeout(300);
  const noAcervo = await p.evaluate(() => document.getElementById("conteudo-meio").textContent);
  conf("a rotina do escritório passou a morar em Cuidar do acervo",
    /Rotina do escrit/.test(noAcervo) && /Conferir o e-mail/.test(noAcervo));
  conf("o subtítulo do acervo avisa que nada ali vence hoje",
    /Nada aqui vence hoje/.test(await p.evaluate(() => document.getElementById("sub-lista").textContent)));

  conf("nenhum erro de página", erros.length === 0);

  console.log("=== F123 · Meu Dia só com o que vence hoje ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
