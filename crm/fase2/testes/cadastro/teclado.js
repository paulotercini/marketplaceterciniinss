// F14 — o teclado. A fila do dia sem tirar a mão do teclado.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CLI_VAZIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

// três clientes na mesma lista, um deles com UMA tarefa minha aberta
const CLI_C = "c0000000-0000-0000-0000-0000000000e1";
FIX.clientes.push({ ...FIX.clientes[1], id: CLI_C, nome: "Zacarias Ficticio Melo", cpf: "77788899900" });
FIX.casos.push(
  { ...FIX.casos[0], id: "b0000000-0000-0000-0000-0000000000e1", cliente_id: CLI_VAZIO, fase: "inss" },
  { ...FIX.casos[0], id: "b0000000-0000-0000-0000-0000000000e2", cliente_id: CLI_C, fase: "inss" });
const AND = "a0000000-0000-0000-0000-0000000000e1";
const TAR = "t0000000-0000-0000-0000-0000000000e1";
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
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);

  // abre a lista da fase INSS, onde estão os três. filtroColab nasce ligado em
  // quem tem caso atribuído, e aqui só um dos três tem: o filtro é do app e
  // está certo, mas esconderia os outros dois do teste do teclado.
  await p.evaluate(() => { filtroColab = null; visao = "fase:inss"; render(); });
  await p.waitForTimeout(500);
  const quantos = await p.evaluate(() => document.querySelectorAll("#conteudo-meio .cartao[data-cli]").length);
  conf(`a lista tem cartões para andar (${quantos})`, quantos >= 3);

  // ↓ acende o primeiro
  await p.keyboard.press("ArrowDown");
  await p.waitForTimeout(200);
  conf("a seta para baixo acende o primeiro cartão",
    (await p.evaluate(() => cursorLista)) === 0 && !!(await p.$(".cartao.no-cursor")));
  await p.keyboard.press("ArrowDown");
  await p.keyboard.press("ArrowDown");
  await p.waitForTimeout(200);
  conf("as setas andam", (await p.evaluate(() => cursorLista)) === 2);
  await p.keyboard.press("ArrowUp");
  await p.waitForTimeout(150);
  conf("e voltam", (await p.evaluate(() => cursorLista)) === 1);
  conf("só um cartão fica aceso por vez",
    (await p.evaluate(() => document.querySelectorAll(".cartao.no-cursor").length)) === 1);
  await p.keyboard.press("ArrowUp"); await p.keyboard.press("ArrowUp"); await p.keyboard.press("ArrowUp");
  await p.waitForTimeout(150);
  conf("não passa do primeiro", (await p.evaluate(() => cursorLista)) === 0);
  await (await p.$("#conteudo-meio")).screenshot({ path: path.join(__dirname, "f14-cursor.png") });

  // Enter abre a ficha do cartão aceso
  const alvo = await p.evaluate(() => document.querySelectorAll("#conteudo-meio .cartao[data-cli]")[0].dataset.cli);
  await p.keyboard.press("Enter");
  await p.waitForTimeout(800);
  conf("Enter abre a ficha do cartão aceso", (await p.evaluate(() => clienteAberto)) === alvo);

  // com a ficha aberta, as setas param de mexer na lista
  const antes = await p.evaluate(() => cursorLista);
  await p.keyboard.press("ArrowDown");
  await p.waitForTimeout(200);
  conf("com a ficha aberta as setas não mexem na lista",
    (await p.evaluate(() => cursorLista)) === antes);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(500);
  conf("Esc fecha a ficha", (await p.evaluate(() => clienteAberto)) === null);

  // Espaço conclui a tarefa do caso, quando há uma só e é minha
  await p.evaluate(() => { filtroColab = null; visao = "fase:inss"; render(); });
  await p.waitForTimeout(400);
  await p.evaluate(cli => {
    const cs = [...document.querySelectorAll("#conteudo-meio .cartao[data-cli]")];
    cursorLista = cs.findIndex(x => x.dataset.cli === cli); pintarCursor();
  }, CLI_CHEIO);
  escritos.length = 0;
  await p.keyboard.press(" ");
  await p.waitForTimeout(900);
  const pat = escritos.find(x => x.m === "PATCH" && x.t === "andamento_tarefas");
  conf("Espaço conclui a tarefa daquele caso", pat && !!pat.corpo.concluida_em);
  conf("e a faixa oferece desfazer", await p.$(".aviso.com-bt .aviso-bt"));

  // num caso sem tarefa minha, Espaço avisa em vez de agir
  await p.evaluate(() => { esconderDesfazer(); filtroColab = null; visao = "fase:inss"; render(); });
  await p.waitForTimeout(400);
  await p.evaluate(cli => {
    const cs = [...document.querySelectorAll("#conteudo-meio .cartao[data-cli]")];
    cursorLista = cs.findIndex(x => x.dataset.cli === cli); pintarCursor();
  }, CLI_C);
  escritos.length = 0;
  await p.keyboard.press(" ");
  await p.waitForTimeout(500);
  conf("sem tarefa minha, Espaço não grava nada", escritos.length === 0);
  conf("e diz por quê", /Sem tarefa sua em aberto/.test(await p.innerText("#aviso")));

  // ? mostra os atalhos
  await p.keyboard.press("?");
  await p.waitForTimeout(400);
  conf("? abre a lista de atalhos", await p.$(".atalhos"));
  const at = await p.innerText(".modal-cx");
  conf("a lista nomeia as teclas", /Espaço/.test(at) && /Enter/.test(at) && /Esc/.test(at));
  await (await p.$(".modal-cx")).screenshot({ path: path.join(__dirname, "f14-atalhos.png") });
  await p.keyboard.press("Escape");
  await p.waitForTimeout(300);

  // digitando na busca, as setas e o espaço são do texto
  await p.evaluate(() => { document.getElementById("busca").focus(); });
  const cur = await p.evaluate(() => cursorLista);
  await p.keyboard.press("ArrowDown");
  await p.keyboard.type(" ");
  await p.waitForTimeout(300);
  conf("escrevendo na busca, as setas não movem o cursor da lista",
    (await p.evaluate(() => cursorLista)) === cur);
  conf("e o espaço vai para o campo",
    (await p.evaluate(() => document.getElementById("busca").value)) === " ");

  console.log("=== teclado (F14) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
