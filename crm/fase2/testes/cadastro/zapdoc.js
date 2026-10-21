// F195 · DOCUMENTO DA FICHA PELO WHATSAPP. Em "Gerados e assinados" cada
// documento tem 📲 WhatsApp: pede confirmação, mostra para quem vai, e manda
// pela fila da ponte (o assinado como está; o gerado, que é HTML, em PDF).
// Sem conversa ainda, abre uma pelo telefone da ficha. Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const CONV = "d1000000-0000-0000-0000-000000000009";
let ZAPS = [];
const GERADO = `<!doctype html><html><head><style>body{margin:0}section{width:210mm;min-height:297mm;padding:20mm 18mm;box-sizing:border-box}
  p{margin:0 0 7pt}</style></head><body><section><h1>PROCURAÇÃO</h1>${"<p>Parágrafo de teste da procuração com texto corrido para encher a folha.</p>".repeat(70)}</section></body></html>`;

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
  const posts = [], subidos = [];
  await ctx.route(SUPA + "/**", async rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (/\/storage\/v1\/object\/sign\//.test(u)) {
      const cam = u.split("/object/sign/anexos/")[1];
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ signedURL: "/object/baixar/" + cam }) });
    }
    if (/\/storage\/v1\/object\/baixar\//.test(u)) {
      return /\.html$/.test(u) ? rota.fulfill({ status: 200, contentType: "text/plain", body: GERADO })
                              : rota.fulfill({ status: 200, contentType: "application/pdf", body: "%PDF-1.4 assinado" });
    }
    if (/\/storage\/v1\/object\/anexos\//.test(u) && m === "POST") {
      subidos.push({ u, tipo: rota.request().headers()["content-type"], tam: (rota.request().postDataBuffer() || Buffer.alloc(0)).length });
      return rota.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    if (/rpc\/zap_abrir/.test(u)) {
      posts.push({ u, b: JSON.parse(rota.request().postData() || "{}") });
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CONV) });
    }
    if (m === "POST") { posts.push({ u, b: JSON.parse(rota.request().postData() || "{}") }); return rota.fulfill({ status: 201, body: "" }); }
    if (m !== "GET") return rota.fulfill({ status: 204, body: "" });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    let corpo = t === "zap_conversas" ? ZAPS : (FIX[t] || []);
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);

  const anexos = [
    { id: "an-ass", cliente_id: CLI_CHEIO, origem: "assinado", nome: "Assinado · procuracao assinada.pdf", caminho: `assinados/${CLI_CHEIO}/2026-10-21-procuracao.pdf`, tipo: "application/pdf", criado_em: "2026-10-21T12:00:00Z" },
    { id: "an-ger", cliente_id: CLI_CHEIO, origem: "gerado", nome: "Gerado · Procuração (lacunas: RG)", caminho: `gerados/${CLI_CHEIO}/2026-10-21-procuracao.html`, tipo: "text/html", criado_em: "2026-10-21T11:00:00Z" },
  ];
  await p.evaluate(([cli, an]) => {
    D.anexos = an.concat(D.anexos || []);
    const d = document.createElement("div"); d.id = "zd-teste"; d.innerHTML = quadroGerados(D.cliPorId.get(cli));
    document.body.appendChild(d);
  }, [CLI_CHEIO, anexos]);
  conf("cada documento de Gerados e assinados tem o botão 📲 WhatsApp",
    (await p.$$eval('#zd-teste button[onclick^="docAoZap"]', b => b.length)) === 2);

  // 1) sem conversa: confirma com o telefone da ficha, abre a conversa e manda o assinado como está
  await p.click('#zd-teste button[onclick="docAoZap(\'an-ass\')"]');
  await p.waitForSelector("#dz-ok");
  const caixa1 = await p.textContent("#modal");
  conf("pede confirmação dizendo o documento e para quem vai", caixa1.includes("Mandar pelo WhatsApp?") && caixa1.includes("procuracao assinada.pdf"));
  conf("a legenda vem pronta e editável", (await p.inputValue("#dz-leg")).startsWith("Olá,"));
  await p.click("#dz-ok");
  for (let i = 0; i < 100 && !posts.some(x => /zap_mensagens/.test(x.u)); i++) await p.waitForTimeout(250);
  const abriu = posts.find(x => /rpc\/zap_abrir/.test(x.u));
  conf("sem conversa, abre uma pelo telefone da ficha", !!abriu && /\d{10,}/.test(String(abriu.b.p_telefone).replace(/\D/g, "")));
  const msg1 = posts.find(x => /zap_mensagens/.test(x.u));
  conf("o assinado entra na fila da ponte, na conversa aberta, como documento",
    !!msg1 && msg1.b.conversa_id === CONV && msg1.b.status === "fila" && msg1.b.tipo === "documento" && msg1.b.midia_url.startsWith(`zap/${CONV}/enviados/`) && msg1.b.midia_nome.endsWith(".pdf"));
  conf("o arquivo sobe para a pasta da conversa", subidos.some(x => x.u.includes(`zap/${CONV}/enviados/`)));

  // 2) com conversa (a mãe que fala pelo cliente): vai para ela, e o gerado vira PDF de verdade
  ZAPS = [{ id: CONV, telefone: "5516999990001", contato_nome: "Maria Ficta", contato_relacao: "mãe", cliente_id: CLI_CHEIO, ultima_em: "2026-10-20T10:00:00Z" }];
  posts.length = 0; subidos.length = 0;
  await p.click('#zd-teste button[onclick="docAoZap(\'an-ger\')"]');
  await p.waitForSelector("#dz-ok");
  const caixa2 = await p.textContent("#modal");
  conf("com quem conversa informado, vai para ela e diz por qual cliente", caixa2.includes("Maria Ficta") && caixa2.includes("mãe de"));
  conf("o gerado avisa que vai em PDF e o título sai sem as lacunas", caixa2.includes("vai em PDF") && !caixa2.includes("lacunas"));
  await p.click("#dz-ok");
  for (let i = 0; i < 100 && !posts.some(x => /zap_mensagens/.test(x.u)); i++) await p.waitForTimeout(250);
  const msg2 = posts.find(x => /zap_mensagens/.test(x.u));
  conf("não abre outra conversa quando já existe", !posts.some(x => /rpc\/zap_abrir/.test(x.u)));
  conf("o gerado sai em PDF (nome .pdf, application/pdf)", !!msg2 && msg2.b.midia_nome.endsWith(".pdf") && msg2.b.midia_mime === "application/pdf" && msg2.b.tipo === "documento");
  const pdf = subidos.find(x => x.u.includes("enviados/"));
  conf("o PDF sobe para a pasta da conversa", !!pdf && pdf.tipo === "application/pdf");
  conf("a folha que passa do A4 vira mais de uma página", await p.evaluate(async h => {
    const b = await pdfDoGerado(h); const t = await b.text(); return (t.match(/\/Type \/Page\b/g) || []).length >= 2;
  }, GERADO));

  conf("sem erro de página", erros.length === 0);
  const falhas = ok.filter(x => !x[1]);
  ok.forEach(([n, v]) => console.log((v ? "✓ " : "✗ ") + n));
  if (erros.length) console.log(erros.join("\n"));
  console.log(`\n${ok.length - falhas.length}/${ok.length}`);
  await nav.close(); s.close();
  process.exit(falhas.length ? 1 : 0);
})();
