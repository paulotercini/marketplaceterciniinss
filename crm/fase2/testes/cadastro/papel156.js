// F156 — o PAPEL de cada processo do caso (Ação, MS, Cumprimento de sentença)
// e a escolha do principal. O papel vem da classe até alguém escolher; o
// principal só muda por escolha (ou quando deixa de ser nosso/acompanhado),
// e a classe, o órgão e o ajuizamento da ficha acompanham o principal.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const CLI = "c0000000-0000-0000-0000-000000000156";
const CASO = "b0000000-0000-0000-0000-000000000156";
const P1 = "10011144620258260368", P2 = "50003583720244036136", P3 = "00012345620268260368";
const MULTI_P2 = { processo: "5000358-37.2024.4.03.6136", orgao_atual: "1ª Vara Federal de Catanduva", ultimo: null, consultado_em: "2026-09-28" };
FIX.clientes.push({ ...FIX.clientes[0], id: CLI, nome: "Otacílio Ficticio Brandão", cpf: "15615615615" });
FIX.casos.push({ ...FIX.casos[0], id: CASO, cliente_id: CLI, fase: "conselho", titulo: "Aux. acidente",
  processo: "1001114-46.2025.8.26.0368", classe_judicial: "Procedimento Comum Cível",
  orgao_judicial: "Vara Única de Monte Alto", ajuizado_em: "2025-03-10",
  datajud_multi: { [P2]: MULTI_P2 },
  processos: [{ numero: "1001114-46.2025.8.26.0368", nosso: true, acompanhar: true },
              { numero: "5000358-37.2024.4.03.6136", nosso: true, acompanhar: true },
              { numero: "0001234-56.2026.8.26.0368", nosso: true, acompanhar: true,
                rotulo: "Cumprimento de Sentença contra a Fazenda Pública" }] });

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
  }, [SUPA, SESSAO]);
  const escritos = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") { escritos.push({ t, corpo: JSON.parse(rota.request().postData() || "{}") });
      return rota.fulfill({ status: 204, body: "" }); }
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error" && !/ERR_FAILED/.test(m.text())) erros.push("console: " + m.text()); });
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.casoPorId && D.casoPorId.size > 0);
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const dig = n => String(n || "").replace(/\D/g, "");

  // o quadro de gerência desenhado numa caixa de prova, com os botões de verdade
  const quadro = async () => {
    await p.evaluate((id) => {
      let d = document.getElementById("prova156");
      if (!d) { d = document.createElement("div"); d.id = "prova156"; document.body.appendChild(d); }
      d.innerHTML = gerenciaProcessos(D.casoPorId.get(id));
    }, CASO);
    return p.evaluate(() => [...document.querySelectorAll("#prova156 .proc-item")]
      .map(l => ({ txt: l.innerText.replace(/\s+/g, " "), ativo: (l.querySelector(".papel-proc button.on") || {}).textContent,
        principal: !!l.querySelector(".chip.ben"), tornar: !!l.querySelector("button[onclick^='tornarPrincipal']") })));
  };
  const clicar = async (num, sel) => {
    await p.evaluate(([n, s]) => {
      const l = [...document.querySelectorAll("#prova156 .proc-item")].find(x => x.innerText.replace(/\D/g, "").includes(n));
      l.querySelector(s).click();
    }, [num, sel]);
    await p.waitForTimeout(300);
  };
  const ultimoPatch = () => escritos.filter(x => x.t === "casos").pop().corpo;

  let q = await quadro();
  conf(`três números, cada um com o seletor de papel (${q.length})`, q.length === 3);
  conf("o papel vem da classe: o principal é Ação e o incidente é Cumprimento",
    q[0].ativo === "Ação" && q[0].principal && q[2].ativo === "Cumprimento");
  conf("os que não são o principal oferecem 'tornar principal'", !q[0].tornar && q[1].tornar && q[2].tornar);

  // escolher MS para o segundo número
  await clicar(P2, ".papel-proc button:nth-child(2)");
  let c = ultimoPatch();
  const pr = n => (c.processos || []).find(x => dig(x.numero) === n) || {};
  conf("escolher MS grava o papel só daquele número", pr(P2).papel === "ms" && !pr(P1).papel && !pr(P3).papel);
  conf("o rótulo do incidente e o principal ficam como estavam",
    /Cumprimento de Sentença/.test(pr(P3).rotulo || "") && dig(c.processo) === P1);
  q = await quadro();
  conf("o seletor passa a mostrar MS no segundo número", q[1].ativo === "MS");

  // a linha do caso mostra o papel ao lado do número (caso no Conselho: MS instrumental)
  const linha = await p.evaluate((id) => lcNumeros(D.casoPorId.get(id)), CASO);
  conf("na linha do caso o MS aparece como instrumental e o incidente como cumprimento de sentença",
    /MS · instrumental/.test(linha) && />Cumprimento</.test(linha));

  // tornar principal o MS: a ficha passa a descrever o MS, e o antigo guarda o que era dele
  await clicar(P2, "button[onclick^='tornarPrincipal']");
  c = ultimoPatch();
  conf("tornar principal grava o novo número principal", dig(c.processo) === P2);
  conf("classe, órgão e ajuizamento do antigo principal ficam guardados no número dele",
    pr(P1).classe === "Procedimento Comum Cível" && pr(P1).orgao === "Vara Única de Monte Alto" && pr(P1).ajuizado === "2025-03-10");
  conf("a ficha passa a usar os dados do novo principal (vazios até a consulta) e o andamento oficial dele",
    c.classe_judicial === null && c.orgao_judicial === null && c.ajuizado_em === null && c.datajud && c.datajud.orgao_atual === MULTI_P2.orgao_atual);
  q = await quadro();
  conf("o selo de principal muda de número", !q[0].principal && q[1].principal && q[0].tornar);

  // mexer em outro número não devolve o principal ao primeiro da lista
  await p.evaluate(([id, n]) => alternarAcompanhar(id, n), [CASO, "0001234-56.2026.8.26.0368"]);
  await p.waitForTimeout(300);
  c = ultimoPatch();
  conf("mexer em outro número mantém o principal escolhido", dig(c.processo) === P2 && pr(P3).acompanhar === false);

  // voltar o principal ao primeiro: os dados guardados voltam para a ficha
  await quadro();
  await clicar(P1, "button[onclick^='tornarPrincipal']");
  c = ultimoPatch();
  conf("voltando o principal, classe, órgão e ajuizamento guardados voltam para a ficha",
    dig(c.processo) === P1 && c.classe_judicial === "Procedimento Comum Cível"
    && c.orgao_judicial === "Vara Única de Monte Alto" && c.ajuizado_em === "2025-03-10");

  // o principal marcado como "não é nosso" passa o posto ao próximo número nosso e acompanhado
  await p.evaluate(([id, n]) => alternarNossoProcesso(id, n), [CASO, "1001114-46.2025.8.26.0368"]);
  await p.waitForTimeout(300);
  c = ultimoPatch();
  conf("o principal que deixa de ser nosso passa o posto ao próximo apto", dig(c.processo) === P2);

  if (process.env.FOTO) {
    await p.evaluate(async ([cli, id]) => { await abrirFicha(cli); casoSel = id; abaAtiva = 2; subAba = "cnj"; repintarFicha(); }, [CLI, CASO]);
    await p.waitForTimeout(500);
    const alvo = await p.evaluateHandle(() => [...document.querySelectorAll(".caso")].find(x => /processos judiciais deste caso/i.test(x.innerText)));
    if (alvo) await alvo.asElement().screenshot({ path: process.env.FOTO + "-quadro.png" });
    await p.evaluate((id) => { lcAbrir(id, 1); }, CASO); await p.waitForTimeout(300);
    const lin = await p.$(".lc-numeros"); if (lin) await lin.screenshot({ path: process.env.FOTO + "-linha.png" });
  }
  console.log("=== F156 · papel dos processos ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length + erros.length;
  console.log(`${ok.length - ok.filter(x => !x[1]).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})();
