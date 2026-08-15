// F11 — a geração de documentos. Prova que a peça sai no padrão do escritório,
// que nada sai com lacuna sem alguém saber, e que o andamento registra o que
// estava em branco.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CLI_VAZIO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

// um cliente com o cadastro COMPLETO: nada deve faltar para os documentos
const CLI_OK = "c0000000-0000-0000-0000-0000000000c1";
FIX.clientes.push({ ...FIX.clientes[0], id: CLI_OK, nome: "Ondina Ficticia Barros",
  cpf: "32132132187", logradouro: "Rua Rui Barbosa", numero: "663", complemento: "",
  bairro: "Centro", cidade: "Monte Alto", uf: "SP", cep: "15910000",
  endereco: "Rua Rui Barbosa, nº 663" });
FIX.casos.push({ ...FIX.casos[0], id: "b0000000-0000-0000-0000-0000000000c1",
  cliente_id: CLI_OK, fase: "inss" });
// o cliente de cadastro incompleto precisa de um caso: sem caso,
// registrarDocGerado sai cedo e o andamento nem chega a ser escrito
FIX.casos.push({ ...FIX.casos[0], id: "b0000000-0000-0000-0000-0000000000c2",
  cliente_id: CLI_VAZIO, fase: "inss" });

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
    localStorage.setItem("crm_subcad", "documentos");
  }, [SUPA, SESSAO]);
  const escritos = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      escritos.push({ t, corpo: JSON.parse(rota.request().postData() || "{}") });
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

  // ── 1. todo marcador dos modelos é trocado ───────────────────────────────
  const vaza = await p.evaluate(id => {
    const c = D.cliPorId.get(id), ks = D.casosDoCliente.get(id) || [];
    const esp = especieDoCliente(c, ks);
    const sobrou = [];
    for (const ch of Object.keys(DOCS_ESCRITORIO)) {
      const d = corpoDoDoc(ch, c, esp);
      (d.corpo.match(/<[A-ZÇÃÕÁÉÍÓÚ_]{2,}>/g) || []).forEach(x => sobrou.push(ch + ":" + x));
    }
    return sobrou;
  }, CLI_OK);
  conf(`nenhum marcador sai literal em nenhum dos ${Object.keys(FIX).length ? 8 : 8} modelos (${vaza.length})`,
    vaza.length === 0);

  // ── 2. a qualificação leva a profissão ───────────────────────────────────
  const q = await p.evaluate(id => preencherModeloDoc(QUALIF, D.cliPorId.get(id), "x"), CLI_OK);
  conf(`a qualificação leva a profissão (${JSON.stringify(q.slice(0, 92))})`, /costureira/.test(q));

  // ── 3. cadastro completo imprime direto, sem perguntar ───────────────────
  await p.evaluate(() => { window.__abertas = []; window.open = (u, a) => {
    const w = { document: { write: h => window.__abertas.push(h), close: () => {} } }; return w; }; });
  await p.evaluate(id => gerarDocEscritorio("proc_adm", id), CLI_OK);
  await p.waitForTimeout(400);
  conf("cadastro completo não abre janela de conferência", !(await p.$(".modal-cx")));
  const html = await p.evaluate(() => window.__abertas[0] || "");
  conf("imprimiu a folha", /<section>/.test(html));
  conf("sai em Bookman Old Style", /Bookman Old Style/.test(html));
  conf("sai em corpo 12 e espaçamento 1,5", /font-size:12pt/.test(html) && /line-height:1\.5/.test(html));
  conf("tem timbre do escritório", /class="timbre"/.test(html) && /OAB\/SP 331\.110/.test(html));
  conf("tem rodapé com o endereço para intimação",
    /class="rodape"/.test(html) && /Rua Rui Barbosa, nº 663, Centro, Monte Alto\/SP/.test(html));
  // underscore sozinho não prova nada: a linha de assinatura também é
  // underscore. O que prova é o dado do cliente aparecendo no lugar certo.
  conf("a folha traz os dados do cliente, não lacuna",
    /Ondina Ficticia Barros/.test(html) && /Rua Rui Barbosa, nº 663/.test(html)
    && /321\.321\.321-87/.test(html));
  conf("de cadastro completo, faltaParaDocs não acusa nada",
    (await p.evaluate(id => faltaParaDocs(D.cliPorId.get(id)).length, CLI_OK)) === 0);
  const and1 = escritos.filter(x => x.t === "andamentos").pop();
  conf("registra o documento no caso", and1 && /Documento\(s\) gerado\(s\)/.test(and1.corpo.texto));
  conf("sem lacuna, o andamento não fala de lacuna", and1 && !/lacuna/.test(and1.corpo.texto));

  // ── 4. cadastro incompleto pergunta antes ────────────────────────────────
  escritos.length = 0;
  await p.evaluate(() => { window.__abertas = []; });
  await p.evaluate(id => gerarDocEscritorio("proc_adm", id), CLI_VAZIO);
  await p.waitForTimeout(400);
  conf("cadastro incompleto abre a conferência", await p.$(".modal-cx"));
  const aviso = await p.innerText(".modal-cx");
  conf(`a janela lista o que sai em branco (${JSON.stringify(aviso.split("\\n")[0])})`,
    /Faltam \d+ campos? no cadastro/.test(aviso));
  conf("nomeia os campos, um a um", /endereço/.test(aviso) && /RG/.test(aviso) && /CPF/.test(aviso));
  conf("nada foi impresso enquanto ninguém decidiu",
    (await p.evaluate(() => window.__abertas.length)) === 0);
  conf("nada foi registrado enquanto ninguém decidiu", escritos.length === 0);
  await (await p.$(".modal-cx")).screenshot({ path: path.join(__dirname, "f11-conferencia.png") });

  // preencher agora leva ao Cadastro, sem imprimir
  await p.click('.modal-cx button:has-text("Preencher agora")');
  await p.waitForTimeout(600);
  conf("preencher agora abre a Identificação do cliente",
    (await p.evaluate(() => [abaAtiva, subCad, clienteAberto].join("|"))) === `0|identificacao|${CLI_VAZIO}`);
  conf("preencher agora não imprime", (await p.evaluate(() => window.__abertas.length)) === 0);

  // gerar assim mesmo imprime E registra a lacuna
  await p.evaluate(id => gerarDocEscritorio("proc_adm", id), CLI_VAZIO);
  await p.waitForTimeout(400);
  await p.click('.modal-cx button:has-text("Gerar assim mesmo")');
  await p.waitForTimeout(500);
  const html2 = await p.evaluate(() => window.__abertas[0] || "");
  conf("gerar assim mesmo imprime", /<section>/.test(html2));
  conf("a folha sai com a linha para preencher à caneta", /_{10,}/.test(html2));
  const and2 = escritos.filter(x => x.t === "andamentos").pop();
  conf(`o andamento registra a lacuna (${JSON.stringify((and2 || {}).corpo && and2.corpo.texto.slice(-70))})`,
    and2 && /Saiu com lacuna para preencher à caneta:/.test(and2.corpo.texto)
    && /endereço/.test(and2.corpo.texto));

  // ── 5. gerar todos passa pela mesma porta ────────────────────────────────
  await p.evaluate(() => { window.__abertas = []; });
  await p.evaluate(id => gerarTodosDocs(id), CLI_VAZIO);
  await p.waitForTimeout(400);
  conf("gerar todos também confere antes", await p.$(".modal-cx"));
  await p.click('.modal-cx button:has-text("Gerar assim mesmo")');
  await p.waitForTimeout(500);
  const html3 = await p.evaluate(() => window.__abertas[0] || "");
  conf(`gerar todos sai com uma folha por documento (${(html3.match(/<section>/g) || []).length})`,
    (html3.match(/<section>/g) || []).length === 6);
  conf("cada folha tem seu timbre", (html3.match(/class="timbre"/g) || []).length === 6);

  console.log("=== documentos (F11) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
