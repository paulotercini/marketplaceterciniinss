// F9.3 passo 1 — a captura do endereço. Prova o caminho inteiro: campo vazio
// convida, o botão busca o CEP, os sete campos gravam numa PATCH só, e o
// espelho `endereco` sai montado do jeito que <ENDERECO> da procuração espera.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CLI_VAZIO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const VIACEP = {                       // resposta fictícia, formato do serviço real
  cep: "15910-000", logradouro: "Rua Rui Barbosa", complemento: "",
  bairro: "Centro", localidade: "Monte Alto", uf: "SP",
};

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 1050 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_subcad", "identificacao");
  }, [SUPA, SESSAO]);

  const gravados = [];
  const cepsPedidos = [];
  await ctx.route("https://viacep.com.br/**", rota => {
    cepsPedidos.push(rota.request().url());
    rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(VIACEP) });
  });
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") { gravados.push([m, t, rota.request().postData()]); return rota.fulfill({ status: 204, body: "" }); }
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

  const abrir = async id => {
    await p.evaluate(x => abrirFicha(x), id);
    await p.waitForSelector('button.mt[data-vv="0"]');
    await p.click('button.mt[data-vv="0"]');
    await p.evaluate(() => irSubCad("identificacao"));
    await p.waitForSelector('.painel[data-p="0"].ativo .cad-cartao');
    await p.waitForTimeout(250);
  };
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);

  await abrir(CLI_CHEIO);
  conf("endereço vazio ainda convida a preencher",
    /clique para preencher/.test(await p.innerText("#campo-endereco")));

  // abre o editor pelo rótulo (o valor pode ter botão no meio)
  await p.click('.painel[data-p="0"].ativo .cad-campo:has(#campo-endereco) label');
  await p.waitForTimeout(250);
  conf("clique abre os sete campos", await p.$("#end-cep") && await p.$("#end-uf"));
  conf("nenhuma consulta de CEP ao abrir", cepsPedidos.length === 0);

  // digita o CEP e NÃO busca sozinho
  await p.fill("#end-cep", "15910000");
  await p.waitForTimeout(400);
  conf("digitar o CEP não dispara consulta", cepsPedidos.length === 0);

  await p.click('.cad-end button:has-text("buscar")');
  await p.waitForTimeout(500);
  conf("o botão consulta o ViaCEP", cepsPedidos.length === 1 && /15910000/.test(cepsPedidos[0]));
  const preenchido = await p.evaluate(() => ({
    log: document.getElementById("end-logradouro").value,
    bai: document.getElementById("end-bairro").value,
    cid: document.getElementById("end-cidade").value,
    uf: document.getElementById("end-uf").value,
    cep: document.getElementById("end-cep").value,
  }));
  conf("o CEP preencheu rua, bairro, cidade e UF",
    preenchido.log === "Rua Rui Barbosa" && preenchido.bai === "Centro"
    && preenchido.cid === "Monte Alto" && preenchido.uf === "SP");
  conf("o CEP volta formatado", preenchido.cep === "15910-000");

  await p.fill("#end-numero", "663");
  await p.fill("#end-complemento", "sala 2");
  await (await p.$(".cad-end")).screenshot({ path: path.join(__dirname, "f93-editor.png") });

  await p.click('.cad-end button:has-text("Guardar")');
  await p.waitForTimeout(600);
  const pat = gravados.filter(g => g[0] === "PATCH" && g[1] === "clientes").pop();
  const corpo = pat ? JSON.parse(pat[2]) : {};
  conf("gravou numa PATCH só, com as sete colunas",
    corpo.logradouro === "Rua Rui Barbosa" && corpo.numero === "663" && corpo.complemento === "sala 2"
    && corpo.bairro === "Centro" && corpo.cidade === "Monte Alto" && corpo.uf === "SP"
    && corpo.cep === "15910000");
  conf(`o espelho <ENDERECO> saiu montado (${JSON.stringify(corpo.endereco)})`,
    corpo.endereco === "Rua Rui Barbosa, nº 663, sala 2");

  // com o endereço em memória, a linha da grade mostra tudo junto
  const linha = await p.evaluate(([id, dados]) => {
    Object.assign(D.cliPorId.get(id), dados);
    return enderecoLinha(D.cliPorId.get(id));
  }, [CLI_CHEIO, { logradouro: "Rua Rui Barbosa", numero: "663", complemento: "sala 2",
                   bairro: "Centro", cidade: "Monte Alto", uf: "SP", cep: "15910000",
                   endereco: "Rua Rui Barbosa, nº 663, sala 2" }]);
  conf(`a linha da grade junta tudo (${JSON.stringify(linha)})`,
    linha === "Rua Rui Barbosa, nº 663, sala 2 · Centro · Monte Alto/SP · CEP 15910-000");
  await p.evaluate(() => repintarFicha());
  await p.waitForTimeout(300);
  await (await p.$(".det-rolagem")).screenshot({ path: path.join(__dirname, "f93-preenchido.png") });
  conf("com endereço, o contador do cartão fecha",
    /completo/.test(await p.innerText('.painel[data-p="0"].ativo .cad-cont')));

  // a prova que interessa: a qualificação da procuração, montada de verdade
  const qualif = await p.evaluate(id =>
    preencherModeloDoc(QUALIF, D.cliPorId.get(id), "Aposentadoria por idade rural"), CLI_CHEIO);
  conf("a qualificação sai sem 'Av./Rua' duplicado", !/Av\.\/Rua/.test(qualif));
  conf("o endereço entra inteiro na qualificação",
    /domiciliado\(a\) na Rua Rui Barbosa, nº 663, sala 2, Centro, na cidade de Monte Alto/.test(qualif));
  conf("a UF sai por extenso, não como sigla",
    /Estado de São Paulo/.test(qualif) && !/Estado de SP/.test(qualif));
  conf("o CEP sai formatado na peça", /CEP 15910-000/.test(qualif));
  // a preposição segue o tipo do logradouro, que era o risco declarado
  const prep = await p.evaluate(() => ["Rua Rui Barbosa, nº 663", "Avenida Brasil, nº 10",
    "Sítio Boa Esperança, nº s/n", "Largo do Rosário, nº 2", "Loteamento Vale Verde, nº 7",
    "Chácara Santa Rita, nº 3", "Km 12 da Rodovia SP-333", "Boa Esperança, nº 40"]
    .map(e => prepEndereco(e) + " " + e.split(",")[0]));
  conf(`a preposição segue o logradouro (${JSON.stringify(prep)})`,
    JSON.stringify(prep) === JSON.stringify(["na Rua Rui Barbosa", "na Avenida Brasil",
      "no Sítio Boa Esperança", "no Largo do Rosário", "no Loteamento Vale Verde",
      "na Chácara Santa Rita", "no Km 12 da Rodovia SP-333", "em Boa Esperança"]));
  console.log("   qualificação gerada >> " + qualif.slice(qualif.indexOf("residente")));

  // CEP inexistente não apaga o que já foi digitado
  await ctx.unroute("https://viacep.com.br/**");
  await ctx.route("https://viacep.com.br/**", r2 =>
    r2.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ erro: true }) }));
  await abrir(CLI_VAZIO);
  await p.click('.painel[data-p="0"].ativo .cad-campo:has(#campo-endereco) label');
  await p.waitForTimeout(200);
  await p.fill("#end-cep", "99999999");
  await p.fill("#end-logradouro", "Sítio Boa Esperança");
  await p.click('.cad-end button:has-text("buscar")');
  await p.waitForTimeout(500);
  conf("CEP inexistente avisa e não apaga o que foi digitado",
    /não encontrado/.test(await p.innerText("#end-recado"))
    && (await p.inputValue("#end-logradouro")) === "Sítio Boa Esperança");

  // apaga o CEP: sítio e bairro rural muitas vezes não têm um
  await p.fill("#end-cep", "");
  await p.evaluate(() => { document.getElementById("end-numero").value = "s/n"; });
  await p.click('.cad-end button:has-text("Guardar")');
  await p.waitForTimeout(600);
  const pat2 = gravados.filter(g => g[0] === "PATCH" && g[1] === "clientes").pop();
  const c2 = pat2 ? JSON.parse(pat2[2]) : {};
  conf(`endereço rural sem CEP grava assim mesmo (${JSON.stringify(c2.endereco)})`,
    c2.endereco === "Sítio Boa Esperança, nº s/n" && c2.cep === null);

  console.log("=== endereço (F9.3 passo 1) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
