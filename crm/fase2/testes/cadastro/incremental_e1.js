// E1 — a CARGA INCREMENTAL. As seis tabelas grandes (clientes, casos,
// tarefas, eventos, pagamentos, lembretes) vêm inteiras só na primeira carga;
// dali em diante o CRM pede só o que tem mudou_em recente e tira da cópia o
// que o banco anotou em `apagados`. A vigia repinta a tela aberta a cada 3 min
// e NUNCA faz carga completa, nem com ficha ou caixa aberta.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, VAZIAS, SESSAO, CASO1, CLI_CHEIO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const agora = Date.now();
const t = min => new Date(agora + min * 60000).toISOString();   // relativo, nunca data fixa
const T0 = t(-120), T1 = t(-5);
const EV_SAI = "e1000000-0000-0000-0000-000000000001";
const TF_NOVA = "e1000000-0000-0000-0000-000000000002";

// o banco fictício, com o carimbo em cada linha das seis tabelas
const BANCO = JSON.parse(JSON.stringify(FIX));
for (const tab of VAZIAS) BANCO[tab] = BANCO[tab] || [];
BANCO.apagados = [];
BANCO.eventos = [{ id: EV_SAI, caso_id: CASO1, tipo: "Perícia", data_hora: t(60 * 24 * 7),
  status: "agendada", obs: null, local: null }];
BANCO.lembretes = [{ id: "e1000000-0000-0000-0000-000000000003", cliente_id: CLI_CHEIO,
  tipo: "cadunico", titulo: "CadÚnico", detalhes: {}, proximo_em: t(60 * 24 * 30).slice(0, 10),
  ativo: true, lembrete_avisos: [] }];
for (const tab of ["clientes", "casos", "tarefas", "eventos", "pagamentos", "lembretes"])
  for (const l of BANCO[tab]) l.mudou_em = T0;

const pedidos = [];   // [tabela, query] de cada GET
function filtrar(linhas, q) {
  for (const [k, v] of q.entries()) {
    if (["select", "order", "limit", "offset"].includes(k)) continue;
    const m = v.match(/^(eq|gte|is)\.(.*)$/);
    if (!m) continue;
    const [, op, val] = m;
    linhas = linhas.filter(l => {
      const x = l[k];
      if (op === "eq") return String(x) === val;
      if (op === "is") return val === "true" ? x === true : val === "null" ? x == null : x === false;
      return x != null && Date.parse(x) >= Date.parse(val);
    });
  }
  return linhas;
}

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
  await ctx.route(SUPA + "/**", rota => {
    const req = rota.request(), u = new URL(req.url());
    if (/\/auth\/v1\//.test(u.pathname))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const tab = (u.pathname.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (req.method() !== "GET") return rota.fulfill({ status: 204, body: "" });
    const de = Number(((req.headers().range || "0-").split("-"))[0]);
    pedidos.push([tab, u.search]);
    const corpo = de > 0 ? [] : filtrar(BANCO[tab] || [], u.searchParams);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const erros = [];
  const abrir = async () => {
    const p = await ctx.newPage();
    p.on("pageerror", e => erros.push("pageerror: " + e.message));
    p.on("console", m => { if (m.type() === "error" && !/ERR_FAILED/.test(m.text())) erros.push("console: " + m.text()); });
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
    await p.waitForSelector("#app.logado");
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0 && D._completo);
    return p;
  };
  const casosPedidos = () => pedidos.filter(x => x[0] === "casos").map(x => x[1]);

  // 1) primeira abertura, sem cópia no aparelho: carga completa e carimbos
  let p = await abrir();
  conf("primeira abertura: casos vêm inteiros, sem filtro de mudou_em",
    casosPedidos().length && casosPedidos().every(q => !/mudou_em/.test(q)));
  const marca = await p.evaluate(() => D._marcas && D._marcas.casos);
  conf("o carimbo dos casos é o mudou_em mais novo da carga", marca === Date.parse(T0));

  // 2) o banco muda: um título, uma subtarefa nova e um evento apagado
  BANCO.casos[0].titulo = "Aposentadoria por idade rural — revista";
  BANCO.casos[0].mudou_em = T1;
  BANCO.tarefas.push({ id: TF_NOVA, caso_id: CASO1, titulo: "Pedir CNIS atualizado", prazo: null,
    concluida: false, concluida_em: null, particular_de: null, mudou_em: T1 });
  BANCO.eventos = [];
  BANCO.apagados.push({ tabela: "eventos", id: EV_SAI, em: T1 });
  BANCO.clientes[0].nome = "Aurélia Ficta Revista";
  BANCO.clientes[0].mudou_em = T1;

  // 3) com uma caixa aberta, a vigia espera: nem consulta o banco
  await p.evaluate(() => { visao = "fase:inss"; render(); caixa("<p>teste</p>"); });
  pedidos.length = 0;
  await p.evaluate(() => vigiarMudancas());
  conf("caixa aberta: a vigia não consulta nada", pedidos.length === 0);
  conf("caixa aberta: o título velho continua",
    await p.evaluate(id => D.casoPorId.get(id).titulo, CASO1) !== BANCO.casos[0].titulo);

  // 4) tela livre: só o que mudou, e a tela repinta
  await p.evaluate(() => fecharCaixa());
  await p.evaluate(() => vigiarMudancas());
  const qs = casosPedidos();
  const folga = await p.evaluate(() => FOLGA_INCREMENTAL);
  const esperado = new Date(Date.parse(T0) - folga).toISOString();
  conf(`a vigia pede os casos com mudou_em desde o carimbo menos a folga de ${folga / 60000} min (${qs.length} pedido)`,
    qs.length === 1 && decodeURIComponent(qs[0]).includes("mudou_em=gte." + esperado));
  conf("nenhuma das seis tabelas grandes veio inteira na vigia",
    pedidos.filter(x => ["clientes", "casos", "tarefas", "eventos", "pagamentos", "lembretes"].includes(x[0]))
      .every(x => /mudou_em=gte/.test(x[1])));
  conf("a segunda leva (andamentos de 30 dias, sugestões) não foi pedida de novo",
    !pedidos.some(x => ["andamentos", "sugestoes", "modelos_mensagem"].includes(x[0])));
  const dep = await p.evaluate(([id, tf, ev]) => ({
    titulo: D.casoPorId.get(id).titulo,
    tarefa: D.tarefas.some(x => x.id === tf),
    evento: D.eventos.some(x => x.id === ev),
    marca: D._marcas.casos,
    tela: document.getElementById("conteudo-meio").innerText,
  }), [CASO1, TF_NOVA, EV_SAI]);
  conf("o título novo entrou na memória", dep.titulo === BANCO.casos[0].titulo);
  conf("a subtarefa nova entrou", dep.tarefa);
  conf("o evento apagado no banco saiu da cópia", !dep.evento);
  conf("o carimbo andou para o mudou_em novo", dep.marca === Date.parse(T1));
  conf("a lista repintou com o nome novo do cliente", /Aurélia Ficta Revista/.test(dep.tela));

  // 5) nada mudou: a vigia consulta e não repinta
  const pintou = await p.evaluate(async () => { let n = 0; const r0 = render; render = () => { n++; r0(); };
    await vigiarMudancas(); render = r0; return n; });
  conf("sem mudança no banco, a vigia não repinta", pintou === 0);

  // 6) ficha aberta: a vigia espera
  await p.evaluate(id => { clienteAberto = id; }, CLI_CHEIO);
  pedidos.length = 0;
  await p.evaluate(() => vigiarMudancas());
  conf("ficha aberta: a vigia não consulta nada", pedidos.length === 0);
  await p.evaluate(() => { clienteAberto = null; });

  // 7) a cópia do aparelho: reabrir já vem pela incremental
  await p.evaluate(() => carregar());          // grava a sessão com os carimbos
  await p.waitForTimeout(300);
  await p.close();
  pedidos.length = 0;
  p = await abrir();
  conf("reaberto com a cópia do aparelho, os casos vêm pela incremental",
    casosPedidos().length > 0 && casosPedidos().every(q => /mudou_em=gte/.test(q)));
  conf("e os dados continuam certos depois da reabertura",
    await p.evaluate(([id, ev]) => D.casoPorId.get(id).titulo.includes("revista") && !D.eventos.some(x => x.id === ev),
      [CASO1, EV_SAI]));

  // 8) uma vez por semana, carga completa
  pedidos.length = 0;
  await p.evaluate(() => { D._cheiaEm = Date.now() - 8 * 864e5; return carregar(); });
  conf("cópia com mais de 7 dias: carga completa de novo", casosPedidos().some(q => !/mudou_em/.test(q)));

  // 9) banco sem o carimbo (antes da migração): a vigia nunca faz carga completa
  for (const tab of ["clientes", "casos", "tarefas", "eventos", "pagamentos", "lembretes"])
    for (const l of BANCO[tab]) delete l.mudou_em;
  await p.evaluate(() => { D._cheiaEm = 0; return carregar(); });
  conf("banco sem mudou_em: os carimbos ficam zerados",
    await p.evaluate(() => Object.values(D._marcas).every(x => x === 0)));
  pedidos.length = 0;
  await p.evaluate(() => vigiarMudancas());
  conf("banco sem mudou_em: a vigia não baixa as tabelas grandes",
    !pedidos.some(x => ["clientes", "casos", "tarefas"].includes(x[0])));

  console.log("=== E1 · carga incremental ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length + erros.length;
  console.log(`${ok.length - ok.filter(x => !x[1]).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})();
