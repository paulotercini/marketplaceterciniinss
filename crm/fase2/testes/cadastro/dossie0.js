// Dossiê, onda 0 — o texto dos PDFs do dossiê é lido uma vez e guardado no
// anexo; o documento do cliente entra nos documentos do caso; a caixa do
// dossiê aparece na triagem e lista os documentos. Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const AN = (id, nome, extra) => ({ id, cliente_id: CLI_CHEIO, caso_id: null, origem: "dossie", nome,
  caminho: `dossie/00000000000/${nome.replace(/ · /, "/")}`, tipo: "application/pdf", tamanho: 1000,
  texto: null, paginas: null, paginas_imagem: null, criado_em: "2026-10-08T12:00:00Z", ...extra });
FIX.anexos = [
  AN("a0000000-0000-0000-0000-000000000001", "CNIS · CNIS completo.pdf"),
  AN("a0000000-0000-0000-0000-000000000002", "HC Ribeirao/Relatorios · Relatorio de consulta.pdf"),
  AN("a0000000-0000-0000-0000-000000000003", "Laudos · Laudo medico.pdf", { texto: "LAUDO MÉDICO PERICIAL fictício", paginas: 2, paginas_imagem: [] }),
  { id: "a0000000-0000-0000-0000-000000000004", cliente_id: CLI_CHEIO, caso_id: CASO1, origem: "pat", nome: "Despacho.pdf",
    caminho: "pat/despacho.pdf", tipo: "application/pdf", tamanho: 500, texto: "Despacho", paginas: 1, paginas_imagem: [],
    criado_em: "2026-09-01T12:00:00Z" },
];
FIX.clientes[0] = { ...FIX.clientes[0], dossie: {} };

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
    localStorage.setItem("crm_subcad", "triagem");
    // a leitura do PDF é do pdf.js, que o arneço não alcança: o teste fixa o
    // que ela devolve e confere o que o CRM faz com isso
    window.__lidos = [];
    window.__textoFicticio = async (caminho) => {
      window.__lidos.push(caminho);
      return /Relatorio/.test(caminho)
        ? { tipo: "application/pdf", tamanho: 1000, texto: null, paginas: 3, paginas_imagem: [1, 2, 3] }
        : { tipo: "application/pdf", tamanho: 1000, texto: "CNIS - Cadastro Nacional de Informações Sociais", paginas: 5, paginas_imagem: [] };
    };
  }, [SUPA, SESSAO]);
  const escritos = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (m !== "GET") {
      escritos.push({ m, u, corpo: JSON.parse(rota.request().postData() || "{}") });
      return rota.fulfill({ status: 204, body: "" });
    }
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
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
  // a função de verdade foi declarada pela página depois do script de início:
  // a troca vale a partir daqui
  await p.evaluate(() => { textoDoDocumento = window.__textoFicticio; });
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForFunction(() => window.__lidos.length >= 1 && !_lendoDossie, null, { timeout: 5000 });
  // F203 · ao abrir a ficha, só a parte da Identificação (o CNIS); o HC espera o Primeiro atendimento
  const soIdent = await p.evaluate(() => window.__lidos.slice());
  conf("F203 · abrir a ficha lê só o CNIS, e o relatório do HC fica para o Primeiro atendimento", soIdent.length === 1 && /CNIS/.test(soIdent[0]));
  await p.evaluate(cli => lerDossieTodo(cli), CLI_CHEIO);
  await p.waitForFunction(() => window.__lidos.length >= 2 && !_lendoDossie, null, { timeout: 5000 });

  // 1 · a leitura em segundo plano: só o que nunca foi lido, um de cada vez
  const lidos = await p.evaluate(() => window.__lidos.slice());
  conf("lê os dois PDFs sem página registrada e pula o que já tem texto", lidos.length === 2 && !lidos.some(c => /Laudo/.test(c)));
  const pat = escritos.filter(e => e.m === "PATCH" && /\/rest\/v1\/anexos\?id=eq\./.test(e.u));
  const cnisP = pat.find(e => /0001$/.test(e.u)), hcP = pat.find(e => /0002$/.test(e.u));
  conf("grava texto e páginas no anexo do CNIS", cnisP && /Cadastro Nacional/.test(cnisP.corpo.texto) && cnisP.corpo.paginas === 5);
  conf("o digitalizado fica com as páginas em imagem e sem texto, para não ser relido", hcP && hcP.corpo.texto === null && hcP.corpo.paginas === 3 && hcP.corpo.paginas_imagem.length === 3);
  const segunda = await p.evaluate(async cli => { window.__lidos = []; const n = await lerTextoDoDossie(cli); return { n, lidos: window.__lidos.length }; }, CLI_CHEIO);
  conf("abrir de novo não relê nada", segunda.n === 0 && segunda.lidos === 0);

  // 2 · o documento do cliente entra nos documentos de cada caso
  const docs = await p.evaluate(k => documentosDoCaso(D.casoPorId.get(k)).map(d => d.origem), CASO1);
  conf("os três PDFs do dossiê e o despacho do caso estão nos documentos do caso", docs.filter(o => o === "dossie").length === 3 && docs.includes("pat"));
  const painel = await p.evaluate(k => painelDocumentos(D.casoPorId.get(k)), CASO1);
  conf("o painel agrupa o dossiê com nome próprio", /Dossiê do cliente \(3\)/.test(painel));
  const inss = await p.evaluate(k => docsDaOrigem(D.casoPorId.get(k), ["pat"]).length, CASO1);
  conf("a aba do INSS continua só com os documentos do INSS", inss === 1);

  // 3 · a caixa do dossiê na triagem
  await p.evaluate(() => { abaAtiva = 0; subCad = "identificacao"; repintarFicha(); });
  await p.waitForSelector(".idf-dossie .dossie-cx");
  const cx = await p.textContent(".idf-dossie .dossie-cx");
  conf("a Identificação mostra a caixa do dossiê mesmo sem o resumo dos portais", /O resumo dos portais não foi gravado/.test(cx));
  conf("e conta o que tem texto e o que é digitalizado", /3 documentos · 2 com texto · 1 digitalizado/.test(cx));
  await p.evaluate(cli => { triVisivel.add(cli); subCad = "triagem"; repintarFicha(); }, CLI_CHEIO);
  await p.waitForSelector(".tri-dossie .dossie-cx");
  conf("a triagem aberta mostra a mesma caixa", /2 com texto/.test(await p.textContent(".tri-dossie .dossie-cx")));
  await p.click(".tri-dossie .dossie-docs button");
  await p.waitForSelector(".modal-cx");
  const md = await p.textContent(".modal-cx");
  conf("a lista agrupa por fonte e abre cada documento", /CNIS \(1\)/.test(md) && /Laudos \(1\)/.test(md) && /HC Ribeirao\/Relatorios \(1\)/.test(md) && /digitalizado/.test(md));
  conf("e leva o dossiê ao Claude pelo caso do cliente", /Pedir ao Claude com o dossiê/.test(md));
  await p.click(".modal-cx button.tl-bt.forte");
  await p.waitForTimeout(200);
  conf("o pedido ao Claude leva as três chaves do dossiê", await p.evaluate(() => _docsClaude && _docsClaude.chaves.length === 3));

  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
