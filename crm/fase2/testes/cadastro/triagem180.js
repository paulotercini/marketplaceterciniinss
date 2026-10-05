// F178 — Triagem no estilo da Análise de Direito: topo com a contagem por
// cor e a barra, lista dos passos à esquerda (aria-current no atual) e o
// cartão do passo à direita, com "O que o CRM já sabe", as três respostas
// grandes e Anterior / Próximo passo. Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const RETRATO = process.env.RETRATO_DIR;

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
  const escritos = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      escritos.push({ m, t, corpo: JSON.parse(rota.request().postData() || "{}") });
      return rota.fulfill({ status: 204, body: "" });
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
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  // dois passos respondidos (um sem pendência, um com atenção) e o quarto aberto
  await p.evaluate(cli => { const c = D.cliPorId.get(cli);
    c.campos = { precasos: [{ id: "pc180", especie: "Aposentadoria por idade", natureza: "", marc: {}, honorarios: "", quem: null, em: "2026-10-01" }] };
    c.triagem = { cnis: { estado: "ok", feito: 1, em: "2026-10-01", quem: "x" },
                  indicadores: { estado: "atencao", feito: 1, em: "2026-10-01", quem: "x" }, passo: 3 };
    return abrirFicha(cli).then(() => { abaAtiva = 0; subCad = "triagem"; repintarFicha(); }); }, CLI_CHEIO);
  await p.waitForSelector(".tri-novo .tri-topo");
  const N = await p.evaluate(() => document.querySelectorAll(".tri-nav li").length);
  const topo = await p.textContent(".tri-topo");
  conf(`topo: Triagem · 2 de ${N} respondidos`, /Triagem/.test(topo) && new RegExp(`2 de ${N} respondidos`).test(topo));
  conf("topo: 1 sem pendência, 1 atenção e o resto não conferido",
    /1 sem pendência/.test(topo) && /1 atenção/.test(topo) && new RegExp(`${N - 2} não conferidos`).test(topo));
  conf("a barra de progresso diz 2", await p.evaluate(() => document.querySelector('.tri-topo [role="progressbar"]').getAttribute("aria-valuenow") === "2"));
  const lista = await p.$$eval(".tri-nav li button", bs => bs.map(b => ({ cur: b.getAttribute("aria-current"),
    nome: b.querySelector(".tri-item-nome").textContent, est: b.querySelector(".tri-item-est").textContent,
    ponto: b.querySelector(".tri-etapa").className })));
  conf("a lista tem um botão por passo, o atual com aria-current=step",
    lista.length === N && lista.filter(x => x.cur === "step").length === 1 && lista[3].cur === "step" && /Vínculo/.test(lista[3].nome));
  conf("cada passo traz a cor e o estado (sem pendência / atenção)",
    /\bok\b/.test(lista[0].ponto) && lista[0].est === "sem pendência" && /atencao/.test(lista[1].ponto) && lista[1].est === "atenção" && lista[2].est === "");
  const card = await p.textContent(".tri-passo");
  conf("o cartão diz Passo 4 de N, o título e a pergunta",
    new RegExp(`Passo 4 de ${N}`).test(card) && /Vínculo com a Previdência hoje/.test(card) && /Como o cliente contribui hoje\?/.test(card));
  conf("o cartão tem a caixa O que o CRM já sabe, com a leitura automática",
    await p.evaluate(() => { const b = document.querySelector(".tri-passo .tri-sabe"); return !!b && /O que o CRM já sabe/.test(b.textContent) && !!b.querySelector(".tri-leitura"); }));
  conf("o passo do vínculo mantém o seletor próprio dentro do cartão", !!(await p.$(".tri-passo #tri-vinc")));
  const resp = await p.$$eval(".tri-passo .tri-bt .tri-e", bs => bs.map(b => ({ t: b.textContent.replace(/\s+/g, " "), h: b.getBoundingClientRect().height })));
  conf("três respostas grandes (≥ 44px) com a linha de apoio",
    resp.length === 3 && resp.every(r => r.h >= 44) && /sem pendência.*segue o atendimento/.test(resp[0].t) && /atenção/.test(resp[1].t) && /não conferido/.test(resp[2].t));
  conf("o campo Observação existe", await p.evaluate(() => /Observação/.test(document.querySelector(".tri-obs").textContent) && !!document.querySelector(".tri-obs #tri-vinculo")));
  if (RETRATO) await p.screenshot({ path: path.join(RETRATO, "triagem180.png"), fullPage: true });

  escritos.length = 0;
  await p.click(".tri-prox-bt .principal");
  await p.waitForTimeout(500);
  const g = escritos.filter(x => x.t === "clientes").pop();
  const tri = g && (g.corpo.triagem || (g.corpo.campos || {}).triagem);
  conf("Próximo passo grava o passo (quem e quando) e avança", tri && tri.vinculo && tri.vinculo.quem === EU && tri.passo === 4);
  conf("e o cartão passa ao passo 5", new RegExp(`Passo 5 de ${N}`).test(await p.textContent(".tri-passo"))
    && (await p.getAttribute('.tri-nav li:nth-child(5) button', "aria-current")) === "step");
  await p.click(".tri-prox-bt .cad-mini");
  await p.waitForTimeout(400);
  conf("Anterior volta ao passo 4", new RegExp(`Passo 4 de ${N}`).test(await p.textContent(".tri-passo")));
  await p.click(".tri-nav li:nth-child(8) button");
  await p.waitForTimeout(400);
  conf("clicar na lista abre o passo escolhido (CadÚnico)", /CadÚnico/.test(await p.textContent(".tri-passo .tri-tit b")));
  escritos.length = 0;
  await p.click(".tri-passo .tri-e.atencao");
  await p.waitForTimeout(400);
  const g2 = escritos.filter(x => x.t === "clientes").pop();
  const t2 = g2 && (g2.corpo.triagem || (g2.corpo.campos || {}).triagem);
  conf("marcar atenção grava e o topo conta 2 atenções", t2 && t2.cadunico.estado === "atencao" && /2 atenção/.test(await p.textContent(".tri-topo")));
  conf("o botão marcado fica com aria-pressed=true", (await p.getAttribute(".tri-passo .tri-e.atencao", "aria-pressed")) === "true");
  await p.click(`.tri-nav li:nth-child(${N}) button`);
  await p.waitForTimeout(400);
  conf("no último passo o botão principal encerra a triagem, e o fecho continua",
    /Encerrar a triagem/.test(await p.textContent(".tri-prox-bt .principal")) && !!(await p.$(".tri-fecho button")) && !!(await p.$(".tri-prox .tri-p")));

  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
