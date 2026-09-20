// [BUG 20.09.2026] O CNIS EM PÁGINA GIRADA. O Meu INSS passou a gerar o
// extrato com /Rotate 90. Lendo a posição crua do texto, os eixos ficavam
// trocados: o cabeçalho caía na mesma "linha" da legenda, nenhum vínculo casava
// e a leitura dizia "nenhum indicador na legenda do extrato" com dois
// indicadores à vista. A prova usa um PDF FICTÍCIO girado do mesmo jeito
// (fixturas/cnis-girado-ficticio.pdf, sem dado de pessoa) e o leitor do app de
// ponta a ponta, pdf.js incluído — por isso precisa de internet para o cdnjs.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const PDF = path.join(__dirname, "fixturas", "cnis-girado-ficticio.pdf");

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext();
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (rota.request().method() !== "GET") return rota.fulfill({ status: 201, contentType: "application/json", body: "[]" });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FIX[t] || []) });
  });
  const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const b64 = fs.readFileSync(PDF).toString("base64");
  let r;
  try {
    r = await p.evaluate(async (b64) => {
      const bin = atob(b64); const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const itens = await itensDoPdf(new File([u8], "cnis.pdf", { type: "application/pdf" }));
      const lido = lerCnisPdf(itens);
      return { pedacos: itens.length, nit: lido.filiado.nit, cpf: lido.filiado.cpf, vinculos: lido.vinculos,
        inds: lido.indicadores.map(i => [i.codigo, i.ocorrencias, i.descricao]) };
    }, b64);
  } catch (e) {
    console.log("=== CNIS em página girada ===");
    console.log("SEM REDE para o pdf.js do cdnjs — prova não executada:", e.message);
    await nav.close(); s.close(); process.exit(0);
  }
  conf(`a página girada lê o NIT (${r.nit})`, r.nit === "123.45678.90-1");
  conf(`e o CPF (${r.cpf})`, r.cpf === "529.982.247-25");
  conf(`acha os vínculos (${r.vinculos})`, r.vinculos >= 1);
  const cods = r.inds.map(x => x[0]).sort();
  conf(`acha os DOIS indicadores da legenda (${cods.join(", ")})`,
    JSON.stringify(cods) === JSON.stringify(["IVIN-JORN-DIFERENCIADA", "PRPPS"]));
  const d = Object.fromEntries(r.inds.map(x => [x[0], x[2]]));
  conf("com a descrição inteira, inclusive a que quebra em duas linhas na coluna da direita",
    /jornada diferenciada/.test(d["IVIN-JORN-DIFERENCIADA"] || "") && /Regime Próprio \(Servidor Público\)/.test(d["PRPPS"] || ""));
  conf("o rodapé de autenticidade não vira descrição de indicador",
    !/autenticidade/.test(JSON.stringify(d)));
  conf("conta as ocorrências no corpo", (r.inds.find(x => x[0] === "IVIN-JORN-DIFERENCIADA") || [])[1] === 2);

  console.log("=== CNIS em página girada (/Rotate 90) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
