// F42 — A CONVERSA DO CASO. A linha do tempo agrupa por dia, mostra a faixa
// do "não lido" com o marcar-todas, encolhe registro de sistema, destaca a
// @menção, agrega o 👍 e revela as ações no hover.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const EU2 = "22222222-2222-2222-2222-222222222222";
FIX.colaboradores.push({ id: EU2, auth_id: null, nome: "Marcos Fictício", inicial: "M",
  cor: "#7a3ccf", papel: "user", ativo: true, cargo: "advogado", setor: null });
const hojeISO = new Date().toISOString();
const ontem = new Date(Date.now() - 864e5).toISOString();
const A_NOVA = "a0000000-0000-0000-0000-00000000f421";
const A_LIDA = "a0000000-0000-0000-0000-00000000f422";
const A_SYS  = "a0000000-0000-0000-0000-00000000f423";
const A_REAG = "a0000000-0000-0000-0000-00000000f424";
FIX.andamentos = FIX.andamentos || [];
FIX.andamentos.push(
  // NOVA para mim (autor Marcos, eu não li) — hoje
  { id: A_NOVA, caso_id: CASO1, autor_id: EU2, origem: "app", criado_em: hojeISO,
    andamentos_lidos: [], texto: "@Paulo o INSS juntou a carta de exigência, veja hoje." },
  // já LIDA por mim — ontem
  { id: A_LIDA, caso_id: CASO1, autor_id: EU2, origem: "app", criado_em: ontem,
    andamentos_lidos: [{ colaborador_id: EU }], texto: "Protocolei a defesa ontem à tarde." },
  // registro de SISTEMA lido (mudança de situação vinda do PAT)
  { id: A_SYS, caso_id: CASO1, autor_id: EU, origem: "pat", origem_id: "situacao:999:x",
    criado_em: ontem, andamentos_lidos: [{ colaborador_id: EU }],
    texto: "INSS: Em análise → Exigência" },
  // reação 👍 do Marcos na minha... na lida dele (resposta só-emoji)
  { id: A_REAG, caso_id: CASO1, autor_id: EU, origem: "app", criado_em: hojeISO,
    responde_a: A_LIDA, andamentos_lidos: [], texto: "👍" });

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

  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForTimeout(900);

  // 1) estrutura: dias separando e a faixa do não lido
  conf("os separadores de dia estão na conversa (Hoje e Ontem)",
    (await p.$$eval(".timeline .tl-dia span", els => els.map(e => e.textContent))).join("|").match(/Hoje.*Ontem|Hoje/));
  conf("a faixa diz quantas são novas para mim",
    /1 nova\(s\) para você/.test(await p.evaluate(() =>
      (document.querySelector(".tl-banner") || {}).textContent || "")));
  conf("o comentário novo está marcado (fundo + filete azul)",
    await p.evaluate(() => !!document.querySelector(".timeline li.tl-nao-lida")));
  conf("a fronteira “você já tinha visto daqui para baixo” aparece",
    await p.evaluate(() => !!document.querySelector(".timeline .tl-fim-novas")));

  // 2) sistema encolhe, conversa respira
  conf("a mudança de situação do INSS virou linha central de sistema",
    await p.evaluate(() => [...document.querySelectorAll(".timeline li.tl-sys")]
      .some(li => /INSS: Em análise/.test(li.textContent))));

  // 3) autor com nome e hora; @menção destacada
  conf("o comentário mostra o NOME do autor e a hora",
    await p.evaluate(() => { const li = document.querySelector(".timeline li.tl-nao-lida");
      return li && !!li.querySelector(".autor-nome") && !!li.querySelector(".tl-hora"); }));
  conf("a @menção sai destacada na cor do time",
    await p.evaluate(() => !!document.querySelector(".timeline .mencao-in")));

  // 4) o 👍 existente aparece agregado em chip (não como resposta solta)
  conf("o 👍 do colega virou chip de reação com a inicial",
    await p.evaluate(() => [...document.querySelectorAll(".timeline .tl-reacoes .chip")]
      .some(c => /👍/.test(c.textContent))));
  conf("a reação NÃO aparece como comentário solto",
    await p.evaluate(() => ![...document.querySelectorAll(".timeline .texto")]
      .some(t => t.textContent.trim() === "👍")));

  // 5) 👍 em um toque grava e entra na memória
  escritos.length = 0;
  await p.evaluate(([and, caso]) => reagir(and, caso), [A_NOVA, CASO1]);
  await p.waitForTimeout(700);
  const rPost = escritos.find(x => x.m === "POST" && x.t === "andamentos");
  conf("o 👍 grava como resposta-emoji do comentário",
    rPost && rPost.corpo.texto === "👍" && rPost.corpo.responde_a === A_NOVA);

  // 6) marcar todas como lidas: a faixa some e nada fica marcado
  escritos.length = 0;
  await p.evaluate(caso => liTudoNaFicha(caso), CASO1);
  await p.waitForTimeout(800);
  conf("o marcar-todas grava as leituras",
    escritos.some(x => x.m === "POST" && x.t === "andamentos_lidos"));
  conf("depois de ler tudo, a faixa desaparece",
    await p.evaluate(() => !document.querySelector(".tl-banner")));
  conf("e nenhum comentário fica marcado como novo",
    await p.evaluate(() => !document.querySelector(".timeline li.tl-nao-lida")));

  // 7) as ações aparecem no hover (e existem no DOM sempre)
  conf("cada comentário tem a barra de ações (👍 e ↩)",
    await p.evaluate(() => { const b = document.querySelector(".timeline li:not(.tl-sys) .tl-acoes");
      return b && /👍/.test(b.textContent) && /↩/.test(b.textContent); }));
  const li1 = await p.$(".timeline li:not(.tl-sys):not(.tl-dia)");
  await li1.hover();
  await p.waitForTimeout(300);
  conf("no hover a barra fica visível",
    await p.evaluate(() => { const b = document.querySelector(".timeline li:hover .tl-acoes");
      return b && getComputedStyle(b).opacity === "1"; }));

  await (await p.$("#conteudo-meio, #app")).screenshot({ path: path.join(__dirname, "f42-conversa.png") });
  const det = await p.$(".det-rolagem"); if (det) await det.screenshot({ path: path.join(__dirname, "f42-conversa.png") });
  console.log("=== a conversa do caso (F42) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
