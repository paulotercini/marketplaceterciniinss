// F9.3 passo 2 — a fila de quem está sem endereço, em Cuidar do acervo.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CLI_VAZIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

// dois clientes a mais: um com processo em andamento e SEM endereço (entra na
// fila), outro com processo em andamento e COM endereço (não entra)
const CLI_SEM = "c0000000-0000-0000-0000-000000000003";
const CLI_COM = "c0000000-0000-0000-0000-000000000004";
const MOLDE = FIX.clientes[1];
FIX.clientes.push(
  { ...MOLDE, id: CLI_SEM, nome: "Anselmo Ficticio Prado", cpf: "98765432100" },
  { ...MOLDE, id: CLI_COM, nome: "Zulmira Inventada Reis", cpf: "11122233396",
    logradouro: "Rua das Acácias", numero: "45", bairro: "Centro",
    cidade: "Matão", uf: "SP", cep: "15990000", endereco: "Rua das Acácias, nº 45" });
FIX.casos.push(
  { ...FIX.casos[0], id: "b0000000-0000-0000-0000-000000000002", cliente_id: CLI_SEM, fase: "judicial" },
  { ...FIX.casos[0], id: "b0000000-0000-0000-0000-000000000003", cliente_id: CLI_COM, fase: "judicial" },
  // encerrado: o cliente do caso morto NÃO deve aparecer na fila
  { ...FIX.casos[0], id: "b0000000-0000-0000-0000-000000000004", cliente_id: CLI_VAZIO, fase: "encerrado" });

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
    const u = rota.request().url();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (rota.request().method() !== "GET") return rota.fulfill({ status: 204, body: "" });
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

  await p.evaluate(() => { visao = "acervo"; render(); });
  await p.waitForTimeout(400);
  const fila = await p.$(".sem-acao.neutro");
  conf("a fila aparece em Cuidar do acervo", fila);
  const resumo = await p.innerText(".sem-acao.neutro summary");
  // dois, não três: Belmiro só tem caso encerrado e Zulmira já tem endereço
  conf(`o título conta os clientes (${JSON.stringify(resumo.slice(0, 40))})`, /\(2 clientes\)/.test(resumo));
  conf("o resumo da fila não é amarelo de prazo",
    (await p.evaluate(() => getComputedStyle(document.querySelector(".sem-acao.neutro summary")).backgroundColor))
    === "rgb(255, 255, 255)");

  await p.click(".sem-acao.neutro summary");
  await p.waitForTimeout(300);
  const nomes = await p.evaluate(() =>
    [...document.querySelectorAll(".sem-acao.neutro .titulo-caso")].map(x => x.innerText.trim()));
  conf(`entra quem tem caso ativo e nenhum endereço (${JSON.stringify(nomes)})`,
    nomes.length === 2 && nomes.includes("Anselmo Ficticio Prado")
    && nomes.includes("Aurélia Ficta de Souza"));
  conf("fica de fora quem já tem endereço", !nomes.includes("Zulmira Inventada Reis"));
  conf("fica de fora quem só tem caso encerrado", !nomes.includes("Belmiro Inventado Nogueira"));
  conf("a lista sai em ordem de nome", nomes.join("|") === [...nomes].sort().join("|"));
  await (await p.$("#conteudo-meio")).screenshot({ path: path.join(__dirname, "f93-fila.png") });

  // o botão leva direto ao campo, com o editor aberto
  await p.evaluate(nome => {
    const linha = [...document.querySelectorAll(".sem-acao.neutro .caso")]
      .find(x => x.innerText.includes(nome));
    linha.querySelector(".btn-mini").click();
  }, "Anselmo Ficticio Prado");
  await p.waitForTimeout(1200);
  conf("o botão abre a ficha no editor do endereço", await p.$("#end-cep"));
  conf("abre na aba Cadastro, divisão Identificação",
    await p.$('.painel[data-p="0"].ativo .cad-cartao'));
  conf("o cliente aberto é o da linha clicada",
    (await p.evaluate(() => clienteAberto)) === CLI_SEM);
  await (await p.$(".det-rolagem")).screenshot({ path: path.join(__dirname, "f93-fila-abriu.png") });

  console.log("=== fila do endereço (F9.3 passo 2) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
