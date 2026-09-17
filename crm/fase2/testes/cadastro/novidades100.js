// F100 — A NOVIDADE CABE NA COLUNA ESTREITA. Com a ficha aberta ao lado, a
// coluna das Novidades encolhe; o cartão era uma linha só e os botões
// ("abrir no PJe · 2º grau", "dar seguimento", "li") vazavam pela margem,
// com o nome do cliente esmagado a zero. Agora o corpo tem largura mínima e
// as ações descem para a linha de baixo.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 900 } });
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

  // três novidades do PJe do 2º grau, com link, e a ficha aberta ao lado
  await p.evaluate(([caso, cli]) => {
    const k = D.casoPorId.get(caso);
    k.pje_links = { "2º grau": "https://pje2g.trf3.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=1&ca=x" };
    D.novid = [1, 2, 3].map(i => ({ id: "n" + i, caso_id: caso, origem: "pje", criado_em: new Date().toISOString(),
      texto: `PJe (2º grau): Decorrido prazo de AURÉLIA FICTA DE SOUZA em 14/09/2026 23:59. — em 15.09.2026 00:4${i} — RecInoCiv 5000033-13.2024.4.03.6314`, andamentos_lidos: [] }));
    visao = "novidades"; render();
    return abrirFicha(cli);
  }, [CASO1, CLI_CHEIO]);
  await p.waitForSelector(".nov");
  await p.waitForTimeout(300);
  const m = await p.evaluate(() => {
    const cont = document.getElementById("conteudo-meio");
    const cards = [...document.querySelectorAll(".nov")];
    const dentro = cards.every(c => {
      const r = c.getBoundingClientRect();
      return [...c.children].every(f => { const b = f.getBoundingClientRect(); return b.right <= r.right + 1 && b.left >= r.left - 1; });
    });
    const nome = cards[0].querySelector(".nov-cli").getBoundingClientRect().width;
    const botao = [...cards[0].querySelectorAll("a.btn-mini")].find(a => /abrir no PJe/.test(a.textContent));
    return { largura: cont.clientWidth, dentro, nome, semRolagem: cont.scrollWidth <= cont.clientWidth + 1,
      botaoTexto: botao && botao.textContent.trim(),
      linhas: new Set([...cards[0].children].map(f => Math.round(f.getBoundingClientRect().top))).size };
  });
  conf("a coluna das Novidades está estreita, com a ficha aberta ao lado", m.largura < 600);
  conf("nenhum botão vaza pela margem do cartão", m.dentro && m.semRolagem);
  conf("o nome do cliente continua legível (não esmagado a zero)", m.nome > 120);
  conf("as ações desceram para uma segunda linha, abaixo do texto", m.linhas >= 2 && /abrir no PJe · 2º grau/.test(m.botaoTexto));

  for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
