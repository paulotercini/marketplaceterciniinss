// O "✔ li" das 📣 Novidades (07.10.2026). O lido era gravado, mas a repintura
// da barra lateral, quando falhava, caía no mesmo catch da gravação: o aviso
// dizia "Não consegui marcar como lido", a linha ficava na tela e o segundo
// clique regravava o mesmo lido. Esta prova quebra a barra de propósito depois
// da gravação e confere que (1) a linha sai da lista, (2) o aviso não fala em
// falha de gravação e (3) a gravação que falha de verdade continua avisada,
// sem tirar a linha e sem marcar a ficha como lida.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const agora = new Date(Date.now() - 3600e3).toISOString();
const NOV = ["a0000000-0000-0000-0000-00000000f501", "a0000000-0000-0000-0000-00000000f502",
             "a0000000-0000-0000-0000-00000000f503"];
FIX.andamentos = FIX.andamentos || [];
NOV.forEach((id, i) => FIX.andamentos.push({ id, caso_id: CASO1, origem: "pat", origem_id: "lido" + i,
  criado_em: agora, andamentos_lidos: [], autor_id: null, publico: false, excluir: false,
  texto: `Movimento fictício número ${i + 1} do processo` }));

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
  const lidos = [];
  let lidoFalha = false;
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      if (t === "andamentos_lidos") {
        lidos.push(JSON.parse(rota.request().postData() || "[]"));
        if (lidoFalha) return rota.fulfill({ status: 500, contentType: "application/json", body: '{"message":"falha fictícia"}' });
      }
      return rota.fulfill({ status: 201, body: "" });
    }
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const linha = id => p.evaluate(i => !!document.querySelector(`.nov[data-and="${i}"]`), id);
  const aviso = () => p.evaluate(() => document.getElementById("aviso").textContent);

  await p.evaluate(() => { visao = "novidades"; montarSidebar(); render(); });
  await p.waitForTimeout(400);
  conf("as três novidades fictícias estão na caixa", (await linha(NOV[0])) && (await linha(NOV[2])));

  // 1) a barra quebra DEPOIS da gravação: o lido vale e a linha sai
  await p.evaluate(() => { window.__barra = montarSidebar;
    montarSidebar = () => { throw new Error("barra quebrada de propósito"); }; });
  await p.click(`.nov[data-and="${NOV[0]}"] [data-ler]`);
  await p.waitForTimeout(500);
  conf("o lido foi gravado uma vez", lidos.length === 1 && lidos[0][0].andamento_id === NOV[0]);
  conf("a linha marcada sai da lista mesmo com a barra quebrada", !(await linha(NOV[0])));
  const a1 = await aviso();
  conf("o aviso não diz que a gravação falhou", !/consegui marcar/i.test(a1));
  conf("o aviso conta o motivo verdadeiro", /lido/i.test(a1) && /barra quebrada de propósito/.test(a1));
  await p.evaluate(() => { montarSidebar = window.__barra; });

  // 2) a gravação falha de verdade: aviso de falha e a linha fica
  lidoFalha = true;
  await p.click(`.nov[data-and="${NOV[1]}"] [data-ler]`);
  await p.waitForTimeout(500);
  conf("a gravação que falha é avisada como falha", /Não consegui marcar como lido/.test(await aviso()));
  conf("e a linha continua na lista", await linha(NOV[1]));

  // 3) na ficha, a gravação que falha não marca o andamento como lido
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForTimeout(800);
  const antes = await p.evaluate(i => (D._andsFicha || []).some(a => a.id === i), NOV[2]);
  await p.evaluate(i => liNaFicha(i), NOV[2]);
  await p.waitForTimeout(400);
  const lidaNaFicha = await p.evaluate(([i, eu]) => ((D._andsFicha || []).find(a => a.id === i) || {})
    .andamentos_lidos?.some(l => l.colaborador_id === eu), [NOV[2], FIX.colaboradores[0].id]);
  conf("a ficha carrega o andamento fictício", antes);
  conf("com a gravação falhando, a ficha não o dá por lido", !lidaNaFicha);

  console.log("=== ✔ li das Novidades ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de página:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
