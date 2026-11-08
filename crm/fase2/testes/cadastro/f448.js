// F448 · visões salvas (etapa 4 das ideias do Todoist): o Salvar do ⋯ guarda a lista, as escolhas e os filtros num item
// do menu lateral, que reabre tudo igual; o Excluir tira o item, com desfazer.
// Fixturas e servidor do harmonia138.js.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const dia = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" }); };
FIX.casos[0].prazo = dia(-3);
for (let i = 0; i < 3; i++) {
  const cid = `c2000000-0000-0000-0000-00000000000${i}`;
  FIX.clientes.push({ id: cid, nome: `Cliente Fictício Número ${i} da Silva`, cpf: String(20000000000 + i), dn: "01011960", campos: {} });
  FIX.casos.push({ id: `b2000000-0000-0000-0000-00000000000${i}`, cliente_id: cid, titulo: "Pensão", beneficio: "Pensão por morte",
    especie: "B21", fase: "judicial", origem_lista: "👪 Judicial", prazo: dia(-5 - i), criado_em: "2026-01-01T00:00:00Z" });
}
FIX.tarefas = [{ id: "t-f140", titulo: "Tarefa fictícia de conferência", concluida: false,
  particular_de: FIX.colaboradores[0].id, prazo: null, criado_em: "2026-09-01T00:00:00Z" }];
FIX.casos[0].datajud = { sistema: "Pje", instancias: [
  { rotulo: "1º grau", sistema: "Pje", historico: [{ data: dia(-4), nome: "Conclusão", decisao: false }] },
  { rotulo: "2º grau", sistema: "Eproc", historico: [{ data: dia(-5), nome: "Distribuição", decisao: false }] }] };
FIX.andamentos = [1, 2, 3].map(i => ({ id: `a3000000-0000-0000-0000-00000000000${i}`, caso_id: CASO1,
  autor_id: FIX.colaboradores[0].id, origem: "escritorio", texto: `Registro fictício ${i}`, criado_em: dia(-i) + "T15:00:00Z" }));
FIX.andamentos.push({ id: "a3000000-0000-0000-0000-000000000009", caso_id: CASO1, autor_id: null, origem: "pje",
  texto: "e-SAJ TJSP (1º grau): Certidão de Publicação Expedida — processo fictício", criado_em: dia(-2) + "T12:00:00Z" });

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const erros = [];
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (rota.request().method() !== "GET") return rota.fulfill({ status: 204, body: "" });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  const p = await ctx.newPage();
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const ab = () => p.evaluate(() => { const d = document.getElementById("topo-mais"); d.open = true; });
  const clic = (q, v) => p.evaluate(([q, v]) => document.querySelector(`[data-lopc="${q}"][data-v="${v}"]`).click(), [q, v]);
  conf("sem visão salva, o grupo do menu lateral fica escondido", await p.evaluate(() => document.getElementById("grupo-salvas-g").hidden));
  await p.evaluate(() => irPara("planejado")); await p.waitForTimeout(300);
  await ab(); await clic("agrupar", "esp"); await ab(); await clic("ordem", "alfa"); await ab(); await clic("vis", "cartoes");
  await p.evaluate(() => { filtroPlanNat = "prazos"; render(); }); await ab(); await p.waitForTimeout(200);
  conf("o ⋯ tem a linha Visão com Salvar", await p.evaluate(() => [...document.querySelectorAll("#lista-opc .lo-ln > span")].at(-1).textContent === "Visão"));
  await p.evaluate(() => [...document.querySelectorAll("#lista-opc button")].find(b => /Salvar/.test(b.textContent)).click());
  await p.waitForSelector("#vs-nome");
  conf("a janela propõe o nome da lista", await p.evaluate(() => document.getElementById("vs-nome").value === "Planejado"));
  await p.fill("#vs-nome", "Prazos por espécie"); await p.press("#vs-nome", "Enter"); await p.waitForTimeout(200);
  const sv = await p.evaluate(() => JSON.parse(localStorage.getItem("crm_visoes")));
  conf(`gravou a lista, as escolhas e a natureza (${JSON.stringify(sv[0] && sv[0].op)})`, sv.length === 1 && sv[0].visao === "planejado"
    && sv[0].op.agrupar === "esp" && sv[0].op.ordem === "alfa" && sv[0].op.vis === "cartoes" && sv[0].nat === "prazos");
  conf("o item aparece no menu lateral, aceso", await p.evaluate(() => { const g = document.getElementById("grupo-salvas-g"), it = g.querySelector(".lista-item");
    return !g.hidden && it && /Prazos por espécie/.test(it.textContent) && it.classList.contains("ativa"); }));
  // muda tudo, vai a outra lista e volta pela visão salva
  await ab(); await clic("agrupar", "data"); await ab(); await clic("ordem", "prazo"); await ab(); await clic("vis", "compacta");
  await p.evaluate(() => { filtroPlanNat = ""; document.querySelector('.lista-item[data-v="meudia"]').click(); }); await p.waitForTimeout(200);
  conf("ao abrir outra lista a visão salva apaga", await p.evaluate(() => visao === "meudia" && !document.querySelector("#grupo-salvas .lista-item.ativa")));
  await p.evaluate(() => document.querySelector("#grupo-salvas .lista-item").click()); await p.waitForTimeout(300);
  const ab2 = await p.evaluate(() => ({ v: visao, ag: opcLista("agrupar"), or: opcLista("ordem"), vis: opcLista("vis"), nat: filtroPlanNat,
    cart: document.getElementById("conteudo-meio").classList.contains("vis-cartoes"),
    sec: [...document.querySelectorAll("#conteudo-meio h3.secao")].map(h => h.firstChild.textContent.trim()) }));
  conf(`a visão salva reabre o Planejado com as escolhas (${JSON.stringify(ab2)})`, ab2.v === "planejado" && ab2.ag === "esp" && ab2.or === "alfa"
    && ab2.vis === "cartoes" && ab2.nat === "prazos" && ab2.cart);
  conf("o filtro da natureza está aceso", await p.evaluate(() => !!document.querySelector('[data-pnat="prazos"].on')));
  if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT });
  // excluir pela linha Visão do ⋯ e desfazer
  await ab(); await p.waitForTimeout(100);
  await p.evaluate(() => [...document.querySelectorAll("#lista-opc button")].find(b => /Excluir/.test(b.textContent)).click()); await p.waitForTimeout(200);
  conf("Excluir tira a visão do menu lateral", await p.evaluate(() => JSON.parse(localStorage.getItem("crm_visoes")).length === 0 && document.getElementById("grupo-salvas-g").hidden));
  await p.evaluate(() => [...document.querySelectorAll("button")].find(b => /Desfazer/i.test(b.textContent)).click()); await p.waitForTimeout(200);
  conf("o desfazer devolve a visão", await p.evaluate(() => JSON.parse(localStorage.getItem("crm_visoes")).length === 1 && !document.getElementById("grupo-salvas-g").hidden));
  // a pessoa escolhida no Meu Dia também volta
  await p.evaluate(() => { irPara("meudia"); filtroDia = "ninguem"; render(); }); await ab();
  await p.evaluate(() => [...document.querySelectorAll("#lista-opc button")].find(b => /Salvar/.test(b.textContent)).click());
  await p.waitForSelector("#vs-nome"); await p.press("#vs-nome", "Enter"); await p.waitForTimeout(200);
  await p.evaluate(() => { filtroDia = null; irPara("planejado"); document.querySelectorAll("#grupo-salvas .lista-item")[1].click(); }); await p.waitForTimeout(200);
  conf("a visão do Meu Dia devolve a pessoa escolhida", await p.evaluate(() => visao === "meudia" && filtroDia === "ninguem"));

  console.log("=== F448 · visões salvas ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length + erros.length;
  console.log(`${ok.length - ok.filter(x => !x[1]).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
