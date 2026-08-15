// F9.3 passo 3 — importação em massa de endereços por planilha colada.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CLI_VAZIO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const CLI_SEM = "c0000000-0000-0000-0000-000000000003";
const CLI_COM = "c0000000-0000-0000-0000-000000000004";
const MOLDE = FIX.clientes[1];
FIX.clientes.push(
  { ...MOLDE, id: CLI_SEM, nome: "Anselmo Ficticio Prado", cpf: "98765432100" },
  { ...MOLDE, id: CLI_COM, nome: "Zulmira Inventada Reis", cpf: "11122233396",
    logradouro: "Rua Velha", numero: "10", bairro: "Centro", cidade: "Matão",
    uf: "SP", cep: "15990000", endereco: "Rua Velha, nº 10" });
FIX.casos.push(
  { ...FIX.casos[0], id: "b0000000-0000-0000-0000-000000000002", cliente_id: CLI_SEM, fase: "judicial" },
  { ...FIX.casos[0], id: "b0000000-0000-0000-0000-000000000003", cliente_id: CLI_COM, fase: "judicial" });

// a planilha colada, do jeito que o Excel entrega no Ctrl+C (colunas por TAB)
const T = "\t";
const PLANILHA = [
  ["CPF", "CEP", "Logradouro", "Numero", "Compl", "Bairro", "Cidade", "UF"].join(T),   // cabeçalho, deve ser ignorado
  ["123.456.789-09", "15910-000", "Rua Rui Barbosa", "663", "sala 2", "Centro", "Monte Alto", "sp"].join(T),
  ["987.654.321-00", "15910-000", "Sítio Boa Esperança", "s/n", "", "Zona Rural", "Monte Alto", "SP"].join(T),
  ["111.222.333-96", "15990-000", "Rua Nova", "88", "", "Centro", "Matão", "SP"].join(T),   // já tem endereço
  ["000.000.000-00", "15910-000", "Rua Fantasma", "1", "", "Centro", "Monte Alto", "SP"].join(T), // CPF fora do CRM
  ["123.456.789-09", "123", "Rua do CEP Ruim", "2", "", "Centro", "Monte Alto", "SP"].join(T),    // CEP inválido
  "",
].join("\n");

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
  const gravados = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      gravados.push({ tabela: t, id: (u.match(/id=eq\.([0-9a-f-]+)/) || [])[1], corpo: JSON.parse(rota.request().postData() || "{}") });
      return rota.fulfill({ status: 204, body: "" });
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

  const ok = []; const conf = (n, v) => ok.push([n, !!v]);

  await p.evaluate(() => { visao = "acervo"; render(); });
  await p.waitForTimeout(400);
  await p.click(".sem-acao.neutro summary");
  await p.waitForTimeout(200);
  await p.click('.sem-acao.neutro button:has-text("importar de uma planilha")');
  await p.waitForSelector("#imp-txt");
  conf("a fila abre a janela de importação", true);

  await p.fill("#imp-txt", PLANILHA);
  await p.click('button:has-text("Conferir")');
  await p.waitForTimeout(400);
  conf("nada foi gravado só por conferir", gravados.length === 0);

  const estados = await p.evaluate(() => _impEnd.map(l => l.estado));
  conf(`o cabeçalho não vira linha (${estados.length} linhas lidas de 6)`, estados.length === 5);
  conf(`classificou cada linha (${JSON.stringify(estados)})`,
    JSON.stringify(estados) === JSON.stringify(["ok", "ok", "ja_tem", "sem_cadastro", "cep_ruim"]));
  const resumo = await p.innerText("#imp-res");
  conf("o resumo diz quantas estão prontas", /2 pronta\(s\) para gravar/.test(resumo));
  conf("quem já tem endereço aparece como tal e oferece substituir",
    /já tem endereço/.test(resumo) && await p.$("#imp-subst"));
  await (await p.$(".modal-cx")).screenshot({ path: path.join(__dirname, "f93-importar.png") });

  await p.click('#imp-res button:has-text("Gravar")');
  await p.waitForTimeout(1200);
  const pats = gravados.filter(g => g.tabela === "clientes");
  conf(`gravou só as duas prontas (${pats.length} PATCH)`, pats.length === 2);
  const porId = Object.fromEntries(pats.map(g => [g.id, g.corpo]));
  conf("a UF minúscula da planilha virou maiúscula", (porId[CLI_CHEIO] || {}).uf === "SP");
  conf(`o espelho saiu montado (${JSON.stringify((porId[CLI_CHEIO] || {}).endereco)})`,
    porId[CLI_CHEIO].endereco === "Rua Rui Barbosa, nº 663, sala 2");
  conf(`endereço rural sem complemento (${JSON.stringify((porId[CLI_SEM] || {}).endereco)})`,
    porId[CLI_SEM].endereco === "Sítio Boa Esperança, nº s/n");
  conf("não tocou em quem já tinha endereço", !porId[CLI_COM]);
  conf("não tocou no CPF que não está no CRM", pats.length === 2);
  conf("a fila encurtou depois da gravação",
    !(await p.innerText("#conteudo-meio")).includes("Anselmo Ficticio Prado"));

  console.log("=== importação (F9.3 passo 3) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
