// F34 — o caminho de volta: caso que não é caso vira atendimento.
//
//   1. o botão "↩ não é caso" mora no quadro do caso, ao lado do Encerrar
//   2. converter preserva TUDO: andamentos viram anotações com o MESMO id
//      (o id que a sincronização usa — a próxima rodada substitui, não
//      duplica), tarefas abertas viram documentos pedidos, anexos voltam
//      ao cadastro, o benefício vira pré-caso, e o caso é apagado
//   3. perícia e pagamento travam a conversão (caso_id obrigatório no banco)
//   4. reconverter não duplica nada (ids determinísticos)
//   5. o lote da lista Escritório converte os livres e pula os travados
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
  conf("o botão «não é caso» mora ao lado do Encerrar",
    await p.evaluate(() => {
      const topo = document.querySelector(".fatos-topo");
      return /não é caso/.test(topo.innerText) && /Encerrar caso/.test(topo.innerText);
    }));

  // ── 3 (antes do 2). perícia trava a conversão ───────────────────────────
  escritos.length = 0;
  await p.evaluate(caso => naoEhCaso(caso), CASO2);
  await p.waitForTimeout(500);
  conf("caso com perícia NÃO converte — aviso e nada gravado",
    !escritos.some(x => x.m === "DELETE"));
  conf("a trava explica o motivo",
    await p.evaluate(caso => /perícia/.test(travaConversao(D.casoPorId.get(caso))), CASO2));
  conf("pagamento também trava",
    await p.evaluate(caso => { D.pagamentos.push({ id: "pg1", caso_id: caso, valor: 100 });
      const t = travaConversao(D.casoPorId.get(caso));
      D.pagamentos.pop(); return /pagamento/.test(t); }, CASO3));

  // ── 2. converter pelo botão ─────────────────────────────────────────────
  escritos.length = 0;
  await p.evaluate(caso => naoEhCaso(caso), CASO1);
  await p.waitForTimeout(900);
  const patCli = escritos.find(x => x.m === "PATCH" && x.t === "clientes");
  const cp = patCli && patCli.corpo.campos;
  conf("os andamentos viram anotações do atendimento",
    cp && (cp.atendimento || []).length === 2
    && /veio do To Do/.test(cp.atendimento[0].texto) && /à mão no CRM/.test(cp.atendimento[1].texto));
  conf("cada anotação leva o MESMO id do andamento — o dedupe da sincronização",
    cp && cp.atendimento[0].id === AND1 && cp.atendimento[1].id === AND2);
  conf("com data e autor originais, e a origem marcada",
    cp && cp.atendimento[0].em === "2026-03-10T12:00:00Z" && cp.atendimento[0].quem === "Paulo"
    && cp.atendimento[0].origem === "todo" && cp.atendimento[1].origem === "app");
  conf("a tarefa ABERTA vira documento pedido, no formato da sincronização (id = caso)",
    cp && (cp.docs_pedidos || []).some(pd => pd.id === CASO1
      && pd.itens.length === 1 && /CNIS emitido/.test(pd.itens[0].nome)));
  conf("o benefício vira pré-caso com natureza deduzida",
    cp && (cp.precasos || []).some(pc => pc.especie === "Aposentadoria por idade rural"
      && pc.de_caso === CASO1));
  conf("os anexos voltam ao cadastro (caso_id nulo)",
    escritos.some(x => x.m === "PATCH" && x.t === "anexos" && x.u.includes(`caso_id=eq.${CASO1}`)
      && x.corpo.caso_id === null));
  conf("e o caso é apagado do banco",
    escritos.some(x => x.m === "DELETE" && x.t === "casos" && x.u.includes(`id=eq.${CASO1}`)));
  conf("na memória, o caso sumiu e o cliente ficou 🟡 em atendimento",
    await p.evaluate(([cli, caso]) => !D.casoPorId.get(caso)
      && clientesEmAtendimento().some(c => c.id === cli) === false /* tem CASO2 ativo ainda */
      && precasosDe(D.cliPorId.get(cli)).length === 1, [CLI_CHEIO, CASO1]));

  // ── 4. reconverter não duplica ──────────────────────────────────────────
  conf("reconverter o mesmo caso não duplica pré-caso nem anotações",
    await p.evaluate(async ([cli, caso]) => {
      const c = D.cliPorId.get(cli);
      const k = { id: caso, cliente_id: cli, beneficio: "Aposentadoria por idade rural", fase: "escritorio" };
      const dados = { ands: [{ id: "ad000000-0000-0000-0000-000000000001", caso_id: caso,
        autor_id: null, texto: "Bloco que veio do To Do", criado_em: "2026-03-10T12:00:00Z", origem: "todo" }], tfs: [] };
      const antes = { pcs: precasosDe(c).length, notas: (c.campos.atendimento || []).length };
      await converterCasoEmAtendimento(k, c, dados);
      return precasosDe(c).length === antes.pcs && (c.campos.atendimento || []).length === antes.notas;
    }, [CLI_CHEIO, CASO1]));

  // ── 5. o lote da lista Escritório ───────────────────────────────────────
  await p.evaluate(() => { visao = "fase:escritorio"; render(); });
  await p.waitForTimeout(400);
  conf("a lista Escritório oferece o lote nos casos antigos",
    /não são casos — converter todos/.test(await p.evaluate(() =>
      (document.getElementById("conteudo-meio") || {}).innerText || "")));
  escritos.length = 0;
  await p.evaluate(() => converterEscritorioEmMassa());
  await p.waitForTimeout(1200);
  conf("o lote converte o caso livre (CASO3) e apaga só ele",
    escritos.some(x => x.m === "DELETE" && x.u.includes(`id=eq.${CASO3}`))
    && !escritos.some(x => x.m === "DELETE" && x.u.includes(`id=eq.${CASO2}`)));
  conf("o travado continua vivo na memória, o livre sumiu",
    await p.evaluate(([a, b]) => !!D.casoPorId.get(a) && !D.casoPorId.get(b), [CASO2, CASO3]));
  conf("o cliente do lote ganhou o pré-caso da conversão",
    await p.evaluate(cli => precasosDe(D.cliPorId.get(cli))
      .some(pc => pc.especie === "Revisão de aposentadoria" && pc.natureza === "revisao"), CLI_VAZIO));

  console.log("=== o caminho de volta (F34) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
