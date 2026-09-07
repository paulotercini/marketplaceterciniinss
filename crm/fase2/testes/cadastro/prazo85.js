// F85 — DE QUE É O PRAZO. O prazo fatal nasce com o carimbo "⏰ [PRAZO data]"
// no comentário que o criou: a linha do "O que cobra ação" tem de mostrar
// ESSE texto (e não só o nome do caso) e levar ao comentário num clique.
// Prazo sem carimbo diz que não tem motivo e convida a escrever. E o ✔
// cumprido escreve o que foi feito no caso, pendurado na origem, antes de
// tirar o prazo da lista — prazo cumprido não fica mais cobrando.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const mais = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const br = iso => iso.split("-").reverse().join(".");
const PRAZO_A = mais(5), PRAZO_B = mais(9);
const AND_ORIG = "a0000000-0000-0000-0000-00000000f851";
const C2 = "b0000000-0000-0000-0000-000000000002";

FIX.casos[0] = { ...FIX.casos[0], prazo: PRAZO_A, mover_para: "🗓 Tarefas com Prazo", fase: "outro" };
FIX.casos.push({ ...FIX.casos[0], id: C2, prazo: PRAZO_B, titulo: "Auxílio-acidente",
  beneficio: "Auxílio-acidente", especie: "B94", protocolos: [], crps_nups: [] });
FIX.atribuicoes.push({ caso_id: C2, colaborador_id: EU });
FIX.andamentos = [
  // o comentário que criou o prazo do caso 1 — é dele que sai o motivo
  { id: AND_ORIG, caso_id: CASO1, autor_id: EU, origem: "app", andamentos_lidos: [],
    criado_em: "2026-09-01T12:00:00Z", texto: `⏰ [PRAZO ${br(PRAZO_A)}] Protocolar o recurso ordinário contra o indeferimento` },
];

(async () => {
  const escritos = [];
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") { escritos.push({ m, t, corpo: rota.request().postData() || "" }); return rota.fulfill({ status: 204, body: "" }); }
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
  const abrir = async (q) => {
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html${q}`);
    await p.waitForSelector("#app.logado");
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
    await p.evaluate(async (a) => { await abrirFicha(a.cli); casoSel = a.id; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); }, { cli: CLI_CHEIO, id: CASO1 });
    await p.waitForTimeout(200);
  };
  const linhas = () => p.evaluate(() => [...document.querySelectorAll("#quadro-datas .qd-linha.qd-prazo")].map(l => ({
    txt: l.textContent.replace(/\s+/g, " ").trim(),
    onclick: (l.querySelector(".qd-rot") || {}).getAttribute ? (l.querySelector(".qd-rot").getAttribute("onclick") || "") : "",
    acao: (l.querySelector("button.btn-mini") || {}).getAttribute ? l.querySelector("button.btn-mini").getAttribute("onclick") : "" })));

  await abrir("?tema=v10");
  const on = await linhas();
  conf("ligado: os dois prazos aparecem", on.length === 2);
  const comMotivo = on.find(l => /Protocolar o recurso ordinário/.test(l.txt));
  conf("o prazo COM origem mostra o motivo escrito no comentário", !!comMotivo);
  conf("e diz que é prazo fatal, de qual caso e quem anotou", comMotivo && /Prazo fatal · Aposentadoria por idade · registrado por Paulo/.test(comMotivo.txt));
  conf("clicar leva ao comentário que criou o prazo", comMotivo && comMotivo.onclick.includes(`qdIrParaAndamento('${CASO1}','${AND_ORIG}')`));
  const semMotivo = on.find(l => /Sem descrição/.test(l.txt));
  conf("o prazo SEM origem avisa que não tem motivo", !!semMotivo);
  conf("e clicar nele abre a caixa de explicar", semMotivo && semMotivo.onclick.includes(`explicarPrazo('${C2}')`));
  conf("a ação do prazo é '✔ cumprido' pela janela que registra", comMotivo && /janelaPrazoCumprido/.test(comMotivo.acao));

  // explicar um prazo cria o comentário com o carimbo
  await p.evaluate(id => explicarPrazo(id), C2);
  await p.waitForSelector("#ep-txt");
  await p.evaluate(() => { document.getElementById("ep-txt").value = "Apresentar contrarrazões"; });
  await p.evaluate(id => salvarExplicacaoPrazo(id), C2);
  await p.waitForTimeout(300);
  const expl = escritos.find(e => e.t === "andamentos" && /\[PRAZO /.test(e.corpo) && /contrarraz/.test(e.corpo));
  conf("explicar grava o comentário com o carimbo do prazo", !!expl && JSON.parse(expl.corpo).caso_id === C2);

  // cumprir: escreve o que foi feito, como resposta à origem, e some da lista
  await p.evaluate(id => janelaPrazoCumprido(id), CASO1);
  await p.waitForSelector("#pz-txt");
  const jan = await p.evaluate(() => document.getElementById("janela").textContent.replace(/\s+/g, " "));
  conf("a janela do cumprido lembra qual era o prazo", /Prazo: Protocolar o recurso ordinário/.test(jan));
  await p.evaluate(() => { document.getElementById("pz-txt").value = "Recurso protocolado no e-Sisrec"; document.getElementById("pz-ok").click(); });
  await p.waitForTimeout(500);
  const cump = escritos.filter(e => e.t === "andamentos").map(e => JSON.parse(e.corpo)).find(b => /PRAZO CUMPRIDO/.test(b.texto || ""));
  conf("o que foi feito vira comentário no caso", cump && /Recurso protocolado no e-Sisrec/.test(cump.texto));
  conf("e fica pendurado na anotação que criou o prazo", cump && cump.responde_a === AND_ORIG);
  conf("o caso deixou de ter prazo", await p.evaluate(id => D.casoPorId.get(id).prazo === null, CASO1));
  const depois = await linhas();
  conf("o prazo cumprido SAIU do 'O que cobra ação'", depois.length === 1 && !/Protocolar o recurso/.test(depois[0].txt));

  // desligado: como sempre
  await abrir("?tema=");
  const off = await linhas();
  conf("desligado: a linha continua sendo 'PRAZO FATAL — título'", off.some(l => /PRAZO FATAL — Auxílio-acidente/.test(l.txt)));
  conf("desligado: o ✔ feito continua tirando o prazo direto", off.some(l => /qdMudarPrazo/.test(l.acao || "")));

  for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
