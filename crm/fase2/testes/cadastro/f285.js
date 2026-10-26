// F285 — a ficha vê o dossiê que a extensão gravou depois que o CRM carregou a
// lista (abrirFicha relê a linha do cliente), e o "Atualizar dossiê" da
// Identificação completa só os campos vazios com os dados cadastrais do CNIS.
// Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const DOSSIE = { meuinss: { em: "2026-10-26T10:37:00Z", baixados: ["CNIS completo"], inexistentes: [], falhas: [],
  cadastro: { dn: "01011950", nome_mae: "Maria Ficta", logradouro: "Rua Sete de Setembro, 10", bairro: "Centro",
    cidade: "Monte Alto", uf: "SP", cep: "15910000" } } };

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 1100 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  const patches = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (t === "clientes" && m === "PATCH") {
      const corpo = JSON.parse(rota.request().postData() || "{}"); patches.push(corpo);
      const base = FIX.clientes.find(x => x.id === CLI_CHEIO);
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([Object.assign({}, base, { dossie: DOSSIE }, corpo)]) });
    }
    if (m !== "GET") return rota.fulfill({ status: 204, body: "" });
    // a linha do banco já tem o dossiê; a lista carregada no começo, não
    if (t === "clientes" && u.includes(`id=eq.${CLI_CHEIO}`))
      return rota.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify([Object.assign({}, FIX.clientes.find(x => x.id === CLI_CHEIO), { dossie: DOSSIE })]) });
    let corpo = FIX[t] || [];
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
  conf("a lista carregada no começo não tem o dossiê", await p.evaluate(c => !Object.keys(D.cliPorId.get(c).dossie || {}).length, CLI_CHEIO));
  await p.evaluate(x => abrirFicha(x).then(() => { abaAtiva = 0; subCad = "identificacao"; repintarFicha(); }), CLI_CHEIO);
  await p.waitForSelector(".idf .idf-comp");
  conf("abrir a ficha traz o dossiê do banco", await p.evaluate(c => !!(D.cliPorId.get(c).dossie || {}).meuinss, CLI_CHEIO));
  conf("a Identificação mostra o Meu INSS na caixa do dossiê", /Meu INSS/.test(await p.textContent(".idf-dossie")));
  conf("o nascimento digitado não é trocado na abertura", await p.evaluate(c => D.cliPorId.get(c).dn === "14031962", CLI_CHEIO));
  const bt = await p.$('.idf-dossie button[onclick^="atualizarDossie"]');
  conf("botão Atualizar dossiê na Identificação", bt && /Atualizar dossiê/.test(await bt.textContent()));
  await bt.click();
  await p.waitForFunction(() => /Dossiê atualizado/.test(document.getElementById("aviso").textContent), null, { timeout: 8000 }).catch(() => {});
  const pt = patches.find(x => "cep" in x) || {};
  conf(`completa só os vazios (${Object.keys(pt).join(",")})`,
    ["nome_mae", "logradouro", "bairro", "cidade", "uf", "cep"].every(k => k in pt) && !("dn" in pt));
  conf("o aviso diz quantos campos", /6 campos do cadastro preenchidos/.test(await p.textContent("#aviso")));
  // sem CPF não há o que buscar
  await p.evaluate(c => { D.cliPorId.get(c).cpf = ""; return atualizarDossie(c); }, CLI_CHEIO);
  conf("sem CPF avisa que o dossiê é preso pelo CPF", /preencha o CPF/.test(await p.textContent("#aviso")));

  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
