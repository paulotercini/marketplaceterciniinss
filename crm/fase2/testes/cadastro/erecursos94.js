// F94 — a novidade do CRPS abre o e-Recursos NO RECURSO DO CLIENTE. O portal
// tem endereço por processo (/e/p/<NUP de 17 dígitos>, o mesmo dos favoritos
// que o robô importa); o botão abria a consulta geral e deixava o NUP para
// colar. Agora cai direto no recurso; sem NUP conhecido, na consulta geral.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CASO1 } = require("./fixturas");
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
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") return rota.fulfill({ status: 200, contentType: "application/json", body: "[]" });
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
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);

  const r = await p.evaluate(([caso]) => {
    window.__abertos = []; window.open = u => { window.__abertos.push(u); return null; };
    const k = D.casoPorId.get(caso);
    const out = { formatado: linkERecursos("44233.139765/2025-37"), digitos: linkERecursos("44233139765202537"),
      vazio: linkERecursos(""), curto: linkERecursos("12345") };
    // novidade sem NUP no texto: vale o primeiro recurso do caso
    k.crps_nups = ["44233.139765/2025-37"];
    D.novid = [{ id: "n1", caso_id: caso, origem: "crps", texto: "Acórdão publicado.", andamentos_lidos: [] },
               { id: "n2", caso_id: caso, origem: "crps", texto: "Recurso 44233.000111/2026-99 distribuído ao relator.", andamentos_lidos: [] }];
    abrirERecursos(caso, "n1"); abrirERecursos(caso, "n2");
    out.abertos = window.__abertos.slice();
    out.links = linksDasNovidades();
    k.crps_nups = []; D.novid = [{ id: "n3", caso_id: caso, origem: "crps", texto: "Sem número aqui.", andamentos_lidos: [] }];
    abrirERecursos(caso, "n3");
    out.semNup = window.__abertos[2];
    return out;
  }, [CASO1]);
  conf("o NUP formatado vira o endereço do recurso", r.formatado === "https://consultaprocessos.inss.gov.br/e/p/44233139765202537");
  conf("o NUP só em dígitos dá o mesmo endereço", r.digitos === r.formatado);
  conf("sem NUP (ou número que não é NUP) fica a consulta geral",
    r.vazio === "https://consultaprocessos.inss.gov.br/" && r.curto === r.vazio);
  conf("a novidade sem número no texto abre o recurso do caso", r.abertos[0] === r.formatado);
  conf("a novidade com o número no texto abre ESSE recurso", r.abertos[1] === "https://consultaprocessos.inss.gov.br/e/p/44233000111202699");
  conf("os links das novidades (abrir todas) já saem por recurso, sem repetir",
    r.links.includes(r.formatado) && r.links.includes("https://consultaprocessos.inss.gov.br/e/p/44233000111202699"));
  conf("caso sem NUP conhecido cai na consulta geral", r.semNup === "https://consultaprocessos.inss.gov.br/");

  for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
