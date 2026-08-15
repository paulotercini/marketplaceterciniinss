// Fumaça da aba Cadastro (F9.2) — abre o app com dados fictícios, entra na
// ficha, fotografa a divisão Identificação e roda as asserções da fase.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, VAZIAS, SESSAO, CLI_CHEIO, CLI_VAZIO } = require("./fixturas");

const RAIZ = __dirname;
const SUPA = "https://ficticio.supabase.co";
const SAIDA = process.argv[2] || "antes";

function servidor() {
  return new Promise(res => {
    const s = http.createServer((req, rq) => {
      const arq = path.join(RAIZ, req.url === "/" ? "app.html" : req.url.split("?")[0]);
      if (!fs.existsSync(arq)) { rq.writeHead(404); return rq.end("no"); }
      rq.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      rq.end(fs.readFileSync(arq));
    }).listen(0, "127.0.0.1", () => res(s));
  });
}

const tabelaDe = url => (url.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];

(async () => {
  const s = await servidor();
  const porta = s.address().port;
  const navegador = await chromium.launch();
  const ctx = await navegador.newContext({ viewport: { width: 1440, height: 1000 } });

  await ctx.addInitScript(([supa, sessao]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: supa, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(sessao));
    localStorage.setItem("crm_subcad", "identificacao");
  }, [SUPA, SESSAO]);

  const erros = [];
  const pagina = await ctx.newPage();
  pagina.on("pageerror", e => erros.push("pageerror: " + e.message));
  pagina.on("console", m => { if (m.type() === "error") erros.push("console: " + m.text()); });

  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = tabelaDe(u);
    if (rota.request().method() !== "GET")
      return rota.fulfill({ status: 204, body: "" });
    let corpo = FIX[t] || [];
    // honra o filtro cliente_id=eq.<id> — sem isto a senha do cliente A
    // aparecia na ficha do cliente B e o estado "sem senha" nunca era testado
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });

  await pagina.goto(`http://127.0.0.1:${porta}/app.html`);
  await pagina.waitForSelector("#app.logado", { timeout: 15000 });

  const abrirCadastro = async id => {
    await pagina.evaluate(x => abrirFicha(x), id);
    await pagina.waitForSelector('button.mt[data-vv="0"]', { timeout: 10000 });
    await pagina.click('button.mt[data-vv="0"]');
    await pagina.evaluate(() => irSubCad("identificacao"));
    await pagina.waitForSelector('.painel[data-p="0"].ativo .cad-cartao', { timeout: 10000 });
    await pagina.waitForTimeout(300);
  };

  await abrirCadastro(CLI_CHEIO);
  await (await pagina.$(".det-rolagem")).screenshot({ path: path.join(RAIZ, `${SAIDA}-cheio.png`) });

  await abrirCadastro(CLI_VAZIO);
  await (await pagina.$(".det-rolagem")).screenshot({ path: path.join(RAIZ, `${SAIDA}-vazio.png`) });

  await abrirCadastro(CLI_CHEIO);

  // ── asserções ──────────────────────────────────────────────────────────
  const r = await pagina.evaluate(() => {
    const painel = document.querySelector('.painel[data-p="0"]');
    const html = painel ? painel.innerHTML : "";
    const texto = painel ? painel.innerText : "";
    const cartoes = [...painel.querySelectorAll(".cad-cartao")].map(x => {
      const t = x.querySelector(".cad-tit");
      return t ? t.innerText.trim().split("\n")[0] : "(sem título)";
    });
    // o primeiro campo da primeira grade
    const primeiro = painel.querySelector(".cad-grade .cad-campo label");
    return {
      html, texto, cartoes,
      primeiroCampo: primeiro ? primeiro.innerText.trim() : null,
      temAmarelo: !!painel.querySelector(".id-card.destaque"),
      temIdGrid: !!painel.querySelector(".id-grid"),
      vazios: [...painel.querySelectorAll(".cad-campo.vazio .cad-v")].map(x => x.innerText.trim()),
      undefinedNaTela: (texto.match(/undefined|null|NaN/g) || []).length,
      emojis: (texto.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu) || []),
    };
  });
  fs.writeFileSync(path.join(RAIZ, `${SAIDA}.json`), JSON.stringify({ ...r, html: undefined, erros }, null, 1));

  console.log("=== " + SAIDA + " ===");
  console.log("cartões:", r.cartoes.join(" | "));
  console.log("1º campo da grade:", r.primeiroCampo);
  console.log("caixa amarela (.id-card.destaque):", r.temAmarelo);
  console.log("bloco antigo .id-grid:", r.temIdGrid);
  console.log("convites de campo vazio:", JSON.stringify(r.vazios));
  console.log("undefined/null/NaN na tela:", r.undefinedNaTela);
  console.log("emojis na aba Cadastro:", r.emojis.length, JSON.stringify(r.emojis));
  console.log("erros de console:", erros.length ? erros : "nenhum");

  await navegador.close();
  s.close();
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
