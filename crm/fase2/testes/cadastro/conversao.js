// F34 — o caminho de volta: caso que não é caso vira atendimento.
//
//   1. o botão "↩ não é caso" mora no quadro do caso, ao lado do Encerrar
//   2. F226: o caso volta a PRÉ-CASO na mesma linha (pre_caso, fase
//      Escritório), com andamentos, anexos, tarefas e agenda; nada é apagado
//   3. a lista Escritório não tem mais o lote que apagava os casos
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CLI_VAZIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const CASO2 = "b0000000-0000-0000-0000-000000000002";
const CASO3 = "b0000000-0000-0000-0000-000000000003";
const AND1 = "ad000000-0000-0000-0000-000000000001";
const AND2 = "ad000000-0000-0000-0000-000000000002";

// três casos na fase Escritório: o do botão, o travado (perícia) e o do lote
FIX.casos[0] = { ...FIX.casos[0], fase: "escritorio", origem_lista: "🙋 Escritório" };
FIX.casos.push(
  { ...FIX.casos[0], id: CASO2, titulo: "Caso travado", beneficio: "BPC/LOAS" },
  { ...FIX.casos[0], id: CASO3, cliente_id: CLI_VAZIO, titulo: "Caso do lote",
    beneficio: "Revisão de aposentadoria" });
FIX.andamentos = [
  { id: AND1, caso_id: CASO1, autor_id: EU, texto: "Bloco que veio do To Do",
    criado_em: "2026-03-10T12:00:00Z", origem: "todo" },
  { id: AND2, caso_id: CASO1, autor_id: EU, texto: "Escrito à mão no CRM",
    criado_em: "2026-04-02T15:00:00Z", origem: "app" },
];
FIX.tarefas = [
  { id: "tf000000-0000-0000-0000-000000000001", caso_id: CASO1, titulo: "📄 CNIS emitido", concluida: false },
  { id: "tf000000-0000-0000-0000-000000000002", caso_id: CASO1, titulo: "📄 RG antigo", concluida: true },
];
FIX.eventos = [
  { id: "ev000000-0000-0000-0000-000000000001", caso_id: CASO2, cliente_id: CLI_CHEIO,
    tipo: "Perícia médica", data_hora: "2026-09-10T13:00:00Z", status: "confirmada", local: "APS" },
];

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
    window.confirm = () => true;   // as janelas de confirmação dizem sim
  }, [SUPA, SESSAO]);
  const escritos = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      escritos.push({ m, t, u, corpo: JSON.parse(rota.request().postData() || "null") });
      return rota.fulfill({ status: 204, body: "" });
    }
    let corpo = FIX[t] || [];
    const fc = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (fc) corpo = corpo.filter(x => x.cliente_id === fc[1]);
    const fin = u.match(/caso_id=in\.\(([^)]*)\)/);
    if (fin) { const ids = decodeURIComponent(fin[1]).split(","); corpo = corpo.filter(x => ids.includes(x.caso_id)); }
    const feq = u.match(/caso_id=eq\.([0-9a-f-]+)/);
    if (feq) corpo = corpo.filter(x => x.caso_id === feq[1]);
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

  // ── 1. o botão no quadro do caso ────────────────────────────────────────
  // abrirFicha com >1 caso abre o modal de escolher processo (armadilha
  // conhecida): limpa o modal, fixa o caso e repinta
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForTimeout(700);
  await p.evaluate(caso => { casoSel = caso;
    const m = document.getElementById("modal"); if (m) m.innerHTML = "";
    abaAtiva = 2; pintarFicha(); }, CASO1);
  await p.waitForSelector(".fatos-topo");
  await p.waitForTimeout(400);
  // F58: as ações moram juntas no RODAPÉ do cartão (por último, pedido do
  // Paulo) — a prova confere que continuam lado a lado
  conf("o botão «não é caso» mora ao lado do Encerrar (no rodapé)",
    await p.evaluate(() => {
      const rodape = [...document.querySelectorAll(".fatos-processo .fatos-topo")].pop();
      return rodape && /não é caso/.test(rodape.textContent) && /Encerrar caso/.test(rodape.textContent);
    }));

  // ── 2. F226 · "não é caso" volta a pré-caso: a MESMA linha, nada apagado ──
  escritos.length = 0;
  await p.evaluate(caso => naoEhCaso(caso), CASO2);
  await p.waitForTimeout(900);
  const pat = escritos.find(x => x.m === "PATCH" && x.t === "casos" && x.u.includes(`id=eq.${CASO2}`));
  conf("o caso vira pré-caso na mesma linha (pre_caso, fase Escritório)",
    pat && pat.corpo.pre_caso === true && pat.corpo.fase === "escritorio");
  conf("o objeto do pré-caso leva a natureza e de onde veio",
    pat && pat.corpo.precaso && pat.corpo.precaso.de_caso === CASO2 && pat.corpo.precaso.id === CASO2);
  conf("nada é apagado: nem o caso, nem os anexos saem dele",
    !escritos.some(x => x.m === "DELETE") && !escritos.some(x => x.t === "anexos"));
  conf("a perícia marcada já não trava: ela fica com a linha",
    await p.evaluate(caso => (D.eventos || []).some(e => e.caso_id === caso), CASO2));
  conf("na memória, o cliente passa a ter o pré-caso",
    await p.evaluate(([cli, caso]) => precasosDe(D.cliPorId.get(cli)).some(pc => pc.caso_id === caso && pc.especie === "BPC/LOAS"), [CLI_CHEIO, CASO2]));
  conf("e o pré-caso não oferece de novo o «não é caso»",
    await p.evaluate(caso => !/naoEhCaso/.test(acoesDoCaso(D.casoPorId.get(caso))), CASO2));

  // ── 3. a lista Escritório não oferece mais o lote que apagava casos ──────
  await p.evaluate(() => { visao = "fase:escritorio"; filtroColab = null; render(); });
  await p.waitForTimeout(400);
  conf("a lista Escritório não tem mais o lote de conversão",
    !/converter todos/.test(await p.evaluate(() => (document.getElementById("conteudo-meio") || {}).innerText || "")));

  console.log("=== o caminho de volta (F34) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
