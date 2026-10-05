// F177 — o leitor do PDF do Prévius. Texto FICTÍCIO no formato das linhas que
// o PDF.js devolve (inclusive a letra trocada, ContribuiÁ„o, e a data colada).
// Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

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
    window.__abertos = []; window.open = (u) => { window.__abertos.push(u); return null; };
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (rota.request().method() !== "GET") return rota.fulfill({ status: 204, body: "" });
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
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  const r = await p.evaluate(t => lerPrevius(t), "RelatÛrio do Tempo de ContribuiÁ„o\nInÌcio do BenefÌcio (DIB): Data da AtualizaÁ„o:\n42 - Aposentadoria Por Tempo de ContribuiÁ„o ou Programada 01/03/2026 01/03/2026\nPerÌodos Considerados no C·lculo\n01/01/1990 31/12/1994 Normal EMPRESA FICTICIA UM 5 0 0 1,00 5 0 0\n31/12/2010 Especial METALURGICA FICTICIA LTDA01/01/1995 16 0 0 1,20 19 2 12\n01/01/2011 30/06/2011 Especial METALURGICA FICTICIA LTDA# 0 6 0 1,20 0 7 6\nAn·lise dos Dados\nTempo de ContribuiÁ„o na D.I.B.: Tempo Restante na DIB p/ Aposentadoria Proporcional:\n31 anos, 2 meses e 4 dias\nN˙mero de ContribuiÁıes na D.I.B.: Idade na DIB:\n372 contribuiÁıes 58 anos\nPossível aposentadoria por idade: 10/05/2031 (62 anos)\nAn·lise Por EspÈcie de BenefÌcio\nInÌcio do BenefÌcio (DIB): Data da AtualizaÁ„o:\n01/03/2026 01/03/2026\n42 - Aposentadoria Por Tempo de ContribuiÁ„o ou Programada\nTempo de ContribuiÁ„o CarÍncia Idade RMI\n31 anos 372 contribuiÁıes 58 anos Atingiu os Requisitos\nR$ 2.100,00\nNecess·rio: 30 anos Necess·rio: 180 contribuiÁıes\nO tempo mÌnimo de 30 anos foi atingido em 15/01/2025\n(Considerando-se somente o tempo especial)46 - Aposentadoria Especial\nTempo de ContribuiÁ„o CarÍncia Idade RMI\n16 anos 200 contribuiÁıes 58 anos N„o Atingiu os Requisitos\nR$ 2.500,00\nNecess·rio: 25 anos Necess·rio: 180 contribuiÁıes Maior RMI\nO tempo mÌnimo de 25 anos ser· atingido em 20/08/2035\n31 - Auxílio Doença Previdenciário\nTempo de ContribuiÁ„o CarÍncia Idade RMI\n31 anos 372 contribuiÁıes 58 anos Atingiu os Requisitos\nR$ 3.000,00\nRequisito N„o Necess·rio Necess·rio: 12 contribuiÁıes");
  conf("acentos consertados e tempo/carência da DIB", r.tempo === "31 anos, 2 meses e 4 dias" && r.carencia === "372 contribuições");
  conf("períodos especiais, inclusive com a data colada na empresa e o # de concomitante",
    r.periodos_especiais && r.periodos_especiais.length === 2 && r.periodos_especiais[0].inicio === "1995-01-01" && r.periodos_especiais[0].fim === "2010-12-31"
    && r.periodos_especiais[0].empresa === "METALURGICA FICTICIA LTDA" && r.periodos_especiais[1].empresa === "METALURGICA FICTICIA LTDA");
  const cs = r.cenarios || [];
  conf("só aposentadorias viram regra (o 31 fica de fora) e a idade projetada entra", cs.length === 3 && !cs.some(c => /^31/.test(c.regra)) && cs[2].data === "2031-05-10");
  conf("o cabeçalho com o parêntese antes do número é reconhecido", /^46 · Aposentadoria Especial \(Considerando/.test(cs[1].regra) && cs[1].data === "2035-08-20" && cs[1].obs === "não atingiu");
  conf("melhor caminho = maior RMI entre as que atingiram; vira valor e data do direito",
    cs[0].melhor === true && !cs[1].melhor && r.valor === 2100 && r.data_direito === "2025-01-15");

  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
