// F45 — uma estrutura para todas as linhas do tempo: INSS, Recurso (CRPS) e
// CNJ no mesmo esqueleto da conversa do Escritório; e o 📖 Caso completo como
// primeira tela ao abrir o cliente, com o compositor em cima.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

// fontes oficiais no caso: comentário do PAT, recurso no CRPS, DataJud
FIX.andamentos = FIX.andamentos || [];
FIX.andamentos.push({ id: "a0000000-0000-0000-0000-00000000f451", caso_id: CASO1,
  autor_id: EU, origem: "pat", origem_id: "c-teste-1",
  criado_em: "2026-08-16T10:30:00Z", andamentos_lidos: [],
  texto: "INSS · Processo em análise no setor de reconhecimento de direitos." });
FIX.casos[0] = { ...FIX.casos[0],
  crps: [{ nup: "355500011122233344", status: "Em julgamento",
    eventos: [{ tipo: "andamento", data: "2026-08-10T10:00:00",
      resumo: "Encaminhado para julgamento na 25ª Junta", bruto: "x" }] }],
  datajud: { consultado_em: "2026-08-16", instancias: [{ rotulo: "1º grau",
    historico: [{ data: "2026-08-05", nome: "Sentença", complemento: "procedente", decisao: true },
                { data: "2026-08-01", nome: "Conclusos", decisao: false }] }] } };

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
  const escritos = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      const corpo = JSON.parse(rota.request().postData() || "{}");
      escritos.push({ m, t, corpo });
      const rep = /return=representation/.test(JSON.stringify(rota.request().headers()));
      return rota.fulfill({ status: rep ? 201 : 204, contentType: "application/json",
        body: rep ? JSON.stringify([{ id: "n" + escritos.length, ...corpo }]) : "" });
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
  const painel = () => p.evaluate(() => (document.querySelector(".painel.ativo") || {}).innerText || "");

  // 1) abrir o cliente cai DIRETO no 📖 Caso completo, com o compositor
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForTimeout(900);
  conf("a primeira tela é o Caso completo (subAba tudo)",
    (await p.evaluate(() => subAba)) === "tudo");
  conf("o painel mostra o 📖 Caso completo", /Caso completo/.test(await painel()));
  conf("o compositor está em cima (dá para escrever dali)",
    await p.evaluate(() => !!document.getElementById("and-texto") && !!document.getElementById("tf-box")));

  // 2) o Caso completo usa a estrutura da conversa (dias + selo da fonte)
  conf("o Caso completo tem os separadores de dia",
    await p.evaluate(() => !!document.querySelector(".timeline .tl-dia")));
  conf("cada registro leva o selo e o NOME da fonte",
    await p.evaluate(() => !!document.querySelector(".timeline .av-fonte") &&
      [...document.querySelectorAll(".timeline .autor-nome")].some(b => /INSS|Recurso|CNJ|Escritório/.test(b.textContent))));
  conf("a decisão (Sentença) sai como marco destacado",
    await p.evaluate(() => [...document.querySelectorAll(".timeline li.tudo-marco")]
      .some(li => /Sentença/.test(li.textContent))));

  // 3) registrar pelo compositor DO Caso completo funciona
  await p.fill("#and-texto", "Registrado direto do Caso completo.");
  await p.evaluate(() => { tfQuem = []; tfData = null; });
  escritos.length = 0;
  await p.evaluate(caso => novoAndamento(caso), CASO1);
  await p.waitForTimeout(900);
  conf("o Registrar do Caso completo grava o andamento",
    escritos.some(x => x.m === "POST" && x.t === "andamentos" &&
      /Registrado direto do Caso completo/.test(x.corpo.texto || "")));

  // 4) aba INSS no mesmo esqueleto
  await p.evaluate(() => { subAba = "inss"; repintarFicha(); });
  await p.waitForTimeout(500);
  conf("a aba INSS usa a timeline da conversa (com dia e selo 🌻)",
    await p.evaluate(() => !!document.querySelector(".timeline .tl-dia") &&
      [...document.querySelectorAll(".timeline .av-fonte")].some(a => /🌻/.test(a.textContent))));
  conf("o ✔ li continua na aba INSS",
    /✔ li/.test(await painel()));

  // 5) aba Recurso (CRPS) no mesmo esqueleto, com o ⭐ próprio preservado
  await p.evaluate(() => { subAba = "crps"; repintarFicha(); });
  await p.waitForTimeout(500);
  conf("a aba Recurso usa a timeline da conversa",
    await p.evaluate(() => !!document.querySelector(".timeline .tl-dia") &&
      [...document.querySelectorAll(".timeline .autor-nome")].some(b => /Recurso/.test(b.textContent))));
  conf("o ⭐ de destaque do recurso continua lá",
    await p.evaluate(() => !!document.querySelector(".timeline .crps-est")));

  // 6) aba CNJ no mesmo esqueleto, decisão em destaque
  await p.evaluate(() => { subAba = "cnj"; repintarFicha(); });
  await p.waitForTimeout(500);
  conf("a aba CNJ usa a timeline da conversa",
    await p.evaluate(() => !!document.querySelector(".timeline .tl-dia") &&
      [...document.querySelectorAll(".timeline .autor-nome")].some(b => /CNJ/.test(b.textContent))));
  conf("a Sentença aparece como marco na aba CNJ",
    await p.evaluate(() => [...document.querySelectorAll(".timeline li.tudo-marco")]
      .some(li => /Sentença/.test(li.textContent))));

  await p.evaluate(() => { subAba = "tudo"; repintarFicha(); });
  await p.waitForTimeout(400);
  const det = await p.$(".det-rolagem");
  if (det) await det.screenshot({ path: path.join(__dirname, "f45-caso-completo.png") });
  console.log("=== uma estrutura para todas as linhas do tempo (F45) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
