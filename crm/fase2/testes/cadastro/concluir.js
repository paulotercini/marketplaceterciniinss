// F14 — concluir em um clique, com desfazer. O que o To Do faz no círculo.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const AND = "a0000000-0000-0000-0000-000000000001";
const TAR = "t0000000-0000-0000-0000-000000000001";
FIX.andamentos = [{ id: AND, caso_id: CASO1, autor_id: EU, origem: null,
  texto: "Pedir o PPP da empresa ao cliente.", criado_em: "2026-08-14T12:00:00Z" }];
FIX.andamento_tarefas = [{ id: TAR, andamento_id: AND, caso_id: CASO1, colaborador_id: EU,
  atribuido_por: EU, lembrar_em: "2026-08-15", concluida_em: null }];

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
    localStorage.setItem("crm_subaba", "escritorio");
  }, [SUPA, SESSAO]);
  const escritos = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      const corpo = JSON.parse(rota.request().postData() || "{}");
      escritos.push({ m, t, corpo, url: u });
      const rep = /return=representation/.test(JSON.stringify(rota.request().headers()));
      return rota.fulfill({ status: rep ? 201 : 204, contentType: "application/json",
        body: rep ? JSON.stringify([{ id: "novo-and-" + escritos.length, ...corpo }]) : "" });
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
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);

  await p.evaluate(([cli, caso]) => abrirFicha(cli).then(() => { casoSel = caso; abaAtiva = 2; subAba = "escritorio"; pintarFicha(); }),
    [CLI_CHEIO, CASO1]);
  await p.waitForSelector(".tf-ok", { timeout: 10000 });
  await p.waitForTimeout(300);

  conf("o círculo aparece no comentário com tarefa minha", await p.$(".tf-ok"));
  const alvo = await p.evaluate(() => {
    const b = document.querySelector(".tf-ok"); const r = b.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  conf(`o alvo tem o tamanho do círculo do To Do (${alvo.w}x${alvo.h})`, alvo.w >= 20 && alvo.h >= 20);
  conf("a janela de escrever continua existindo ao lado",
    await p.$('.tf-acao:has-text("concluir e escrever")'));
  await (await p.$(".comentario, .cx-com, .fatos")) ;

  // um clique conclui, sem janela
  await p.click(".tf-ok");
  await p.waitForTimeout(900);
  conf("um clique não abre janela nenhuma", !(await p.$(".modal-cx")));
  const pat = escritos.find(x => x.m === "PATCH" && x.t === "andamento_tarefas");
  conf("a tarefa foi fechada", pat && !!pat.corpo.concluida_em);
  const and = escritos.find(x => x.m === "POST" && x.t === "andamentos");
  conf(`o histórico continua, com o texto padrão (${JSON.stringify((and || {}).corpo && and.corpo.texto)})`,
    and && /Tarefa concluída/.test(and.corpo.texto));
  conf("a conclusão responde o comentário que pediu a tarefa",
    and && and.corpo.responde_a === AND);

  // a faixa de desfazer
  conf("a faixa oferece desfazer", await p.$(".aviso.com-bt .aviso-bt"));
  const faixa = await p.innerText(".aviso");
  conf(`a faixa diz o que aconteceu (${JSON.stringify(faixa.replace(/\n/g, " "))})`, /Conclu/.test(faixa));
  await (await p.$(".aviso")).screenshot({ path: path.join(__dirname, "f14-desfazer.png") });

  escritos.length = 0;
  await p.click(".aviso-bt");
  await p.waitForTimeout(900);
  const volta = escritos.find(x => x.m === "PATCH" && x.t === "andamento_tarefas");
  conf("desfazer reabre a tarefa", volta && volta.corpo.concluida_em === null);
  const apaga = escritos.find(x => x.m === "DELETE" && x.t === "andamentos");
  conf("desfazer apaga o comentário que a conclusão escreveu", !!apaga);
  conf("a faixa some depois de desfazer",
    !(await p.evaluate(() => document.getElementById("aviso").classList.contains("com-bt"))));

  // a faixa não fica para sempre
  await p.evaluate(() => { avisoDesfazer("teste", async () => {}); });
  conf("a faixa aparece", await p.$(".aviso.com-bt"));
  await p.evaluate(() => { esconderDesfazer(); });
  conf("e some quando o tempo passa", !(await p.$(".aviso.com-bt")));

  // um aviso comum não deixa botão de desfazer para trás
  await p.evaluate(() => { avisoDesfazer("primeiro", async () => {}); aviso("segundo", false); });
  await p.waitForTimeout(200);
  conf("aviso comum limpa o desfazer pendente",
    !(await p.evaluate(() => document.getElementById("aviso").classList.contains("com-bt")))
    && (await p.evaluate(() => window._temDesfazer === undefined)));

  console.log("=== concluir em um clique (F14) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
