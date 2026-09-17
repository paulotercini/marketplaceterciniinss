// F99 — MAIS DE UM RECURSO NO MESMO CASO. O segundo número de recurso era
// obrigado a nascer em caso separado (a regra "um caso para cada recurso").
// Agora entra no mesmo caso por padrão, com a aba 🖥 Recurso mostrando um por
// vez; caso próprio continua como escolha. Adicionar e tirar, como já se faz
// com os processos judiciais na aba CNJ.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const NUP1 = "44233139765202537", NUP2 = "44233000111202699";
FIX.casos[0].crps_nups = [NUP1];
FIX.casos[0].crps = [];

(async () => {
  const escritos = [];
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
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      const corpo = rota.request().postData() || "";
      escritos.push({ t, m, u, corpo });
      return rota.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify([{ ...(JSON.parse(corpo || "{}")), id: "novo-" + escritos.length }]) });
    }
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

  await p.evaluate(([cli]) => abrirFicha(cli).then(() => { subAba = "crps"; repintarFicha(); }), [CLI_CHEIO]);
  await p.waitForSelector(`#crps-nup-${CASO1}`);
  const t0 = await p.evaluate(() => document.getElementById("detalhe").textContent);
  conf("a aba Recurso lista o número que o caso já tem", t0.includes(NUP1));

  // o segundo recurso: a caixa oferece as duas saídas, e "acrescentar" é a principal
  await p.evaluate(([caso, n2]) => { document.getElementById("crps-nup-" + caso).value = n2; salvarCrpsNup(caso); }, [CASO1, NUP2]);
  await p.waitForSelector("#pnc-ok");
  const caixa = await p.evaluate(() => ({ ok: document.getElementById("pnc-ok").textContent, sep: document.getElementById("pnc-sep").textContent }));
  conf("a caixa pergunta: acrescentar a este caso (principal) ou caso próprio", /acrescentar a este caso/.test(caixa.ok) && /caso próprio/.test(caixa.sep));
  await p.click("#pnc-ok");
  await p.waitForFunction(([caso]) => crpsNups(D.casoPorId.get(caso)).length === 2, [CASO1]);
  const patch = escritos.filter(e => e.t === "casos" && e.m === "PATCH").map(e => JSON.parse(e.corpo)).pop() || {};
  conf("o caso passa a ter os DOIS números, gravados no banco", Array.isArray(patch.crps_nups) && patch.crps_nups.join("|") === `${NUP1}|${NUP2}`);
  conf("nenhum caso novo foi criado", !escritos.some(e => e.t === "casos" && e.m === "POST"));
  await p.waitForSelector(`#crps-nup-${CASO1}`);
  const t1 = await p.evaluate(() => document.getElementById("detalhe").textContent);
  conf("a aba lista os dois, com o aviso neutro e o separar como opção",
    t1.includes(NUP1) && t1.includes(NUP2) && /2 recursos neste caso/.test(t1) && /separar em 2 casos/.test(t1) && !/O certo é um caso para cada um/.test(t1));

  // tirar um: fica um
  await p.evaluate(([caso, n2]) => removerCrpsNup(caso, n2), [CASO1, NUP2]);
  await p.waitForFunction(([caso]) => crpsNups(D.casoPorId.get(caso)).length === 1, [CASO1]);
  const patch2 = escritos.filter(e => e.t === "casos" && e.m === "PATCH").map(e => JSON.parse(e.corpo)).pop() || {};
  conf("tirar o número grava a lista sem ele", Array.isArray(patch2.crps_nups) && patch2.crps_nups.join("|") === NUP1);

  // a outra saída continua existindo: caso próprio
  await p.waitForSelector(`#crps-nup-${CASO1}`);
  await p.evaluate(([caso, n2]) => { document.getElementById("crps-nup-" + caso).value = n2; salvarCrpsNup(caso); }, [CASO1, NUP2]);
  await p.waitForSelector("#pnc-sep");
  await p.click("#pnc-sep");
  await p.waitForTimeout(600);
  const novo = escritos.filter(e => e.t === "casos" && e.m === "POST").map(e => JSON.parse(e.corpo))[0];
  conf("'caso próprio' cria o caso separado com o número novo, como antes",
    novo && Array.isArray(novo.crps_nups) && novo.crps_nups[0] === NUP2 && novo.cliente_id === CLI_CHEIO);

  for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
