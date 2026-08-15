// F12 — a raiz e os ramos do caso. Prova que os números que moram em três
// sub-abas diferentes aparecem juntos como árvore, e que o marcador
// "acompanhado" grava.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

// o caso do mandado de segurança MAIS a ação ordinária, que é o que a fase
// existe para resolver: dois processos, um recurso e a raiz no INSS
const CLI = "c0000000-0000-0000-0000-0000000000d1";
const CASO = "b0000000-0000-0000-0000-0000000000d1";
FIX.clientes.push({ ...FIX.clientes[0], id: CLI, nome: "Silvino Ficticio Biancardi", cpf: "45645645670" });
FIX.casos.push({ ...FIX.casos[0], id: CASO, cliente_id: CLI, fase: "judicial",
  titulo: "Aposentadoria por idade rural", nb: "1234567890",
  protocolos: ["9876543210"], crps_nups: ["44233139765202537"],
  processo: "00000011420264036120",
  processos: [{ numero: "00000011420264036120", nosso: true, acompanhar: true },
              { numero: "50001112320264036000", nosso: true, acompanhar: false },
              { numero: "10002223420238260361", nosso: false, acompanhar: false }] });

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
  p.on("console", m => { if (m.type() === "error") erros.push("console: " + m.text()); });
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);

  await p.evaluate(([cli, caso]) => { abrirFicha(cli).then(() => { casoSel = caso; abaAtiva = 2; pintarFicha(); }); },
    [CLI, CASO]);
  await p.waitForSelector(".trilha-proc", { timeout: 10000 });
  await p.waitForTimeout(400);

  const t = await p.innerText(".trilha-proc");
  conf("a trilha aparece no cartão de fatos", !!t);
  conf(`a raiz traz o NB e o protocolo (${JSON.stringify(t.split("\n")[1])})`,
    /NB 1234567890/.test(t) && /protocolo 9876543210/.test(t));
  const ramos = await p.evaluate(() =>
    [...document.querySelectorAll(".trilha-proc .ramo")].map(x => ({
      txt: x.innerText.replace(/\n/g, " · "), alheio: x.classList.contains("alheio") })));
  conf(`quatro ramos, um recurso e três processos (${ramos.length})`, ramos.length === 4);
  // innerText devolve MAIÚSCULA por causa do text-transform do rótulo: o
  // teste compara sem diferenciar caixa, senão acusa defeito que não existe
  conf("o recurso vem primeiro, com o NUP formatado",
    /recurso/i.test(ramos[0].txt) && /44233\.139765\/2025-37/.test(ramos[0].txt));
  conf("o principal é marcado como principal", /principal/.test(ramos[1].txt));
  conf("o processo de terceiro fica recuado e nomeado",
    ramos[3].alheio && /processo de terceiro/i.test(ramos[3].txt));
  conf("o que os robôs consultam aparece como acompanhado",
    /\bacompanhado\b/.test(ramos[1].txt) && /não acompanhado/.test(ramos[2].txt));
  await (await p.$(".trilha-proc")).screenshot({ path: path.join(__dirname, "f12-trilha.png") });

  // o marcador grava
  escritos.length = 0;
  await p.evaluate(() => {
    const r = [...document.querySelectorAll(".trilha-proc .ramo")]
      .find(x => /não acompanhado/.test(x.innerText));
    r.querySelector("button").click();
  });
  await p.waitForTimeout(600);
  const pat = escritos.filter(x => x.t === "casos").pop();
  const salvos = pat && pat.corpo.processos;
  conf(`ligar o acompanhado grava a lista inteira (${salvos && salvos.length})`, salvos && salvos.length === 3);
  conf("o número clicado passou a ser acompanhado",
    salvos && salvos.find(x => x.numero.replace(/\D/g, "") === "50001112320264036000").acompanhar === true);
  conf("os outros dois não mudaram",
    salvos && salvos.find(x => x.numero.replace(/\D/g, "") === "00000011420264036120").acompanhar === true
    && salvos.find(x => x.numero.replace(/\D/g, "") === "10002223420238260361").acompanhar === false);

  // caso sem nada não desenha árvore vazia
  const vazio = await p.evaluate(() => trilhaProcessual({ id: "x", protocolos: [], processos: [] }));
  conf("caso sem número nenhum não desenha trilha", vazio === "");

  console.log("=== trilha (F12) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
