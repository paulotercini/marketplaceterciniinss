// F437 · a linha C e o menu ⋯ das listas (proposta C, aprovada pelo Paulo em 08.11.2026): o nome abre a linha, o
// concluir e a ⭐ ficam à direita (a ⭐ por último), e o ⋯ agrupa, ordena, troca a visualização e os períodos.
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
  await p.evaluate(() => { visao = "planejado"; render(); }); await p.waitForTimeout(300);
  const l = await p.evaluate(() => { const c = document.querySelector("#conteudo-meio .ag-linha[data-cli]"); if (!c) return null;
    const x = s => c.querySelector(s) && c.querySelector(s).getBoundingClientRect().left;
    return { txt: x(".ag-txt"), data: x(".ag-data"), av: x(".avatares"), slot: x(".ag-slot"), est: x(".acoes [data-estrela]"),
      ultima: c.lastElementChild.classList.contains("acoes") }; });
  conf("o nome abre a linha, antes da data", l && l.txt < l.data);
  conf("a ⭐ fecha a linha, à direita do responsável e do concluir", l && l.ultima && l.est > l.av && l.est >= l.slot);
  // F444 · no computador, colunas iguais em todas as linhas, o cabeçalho e a ⭐ à vista sem passar o mouse
  await p.mouse.move(5, 5);
  const col = await p.evaluate(() => { const ls = [...document.querySelectorAll("#conteudo-meio .ag-linha")];
    const xs = s => new Set(ls.map(c => c.querySelector(s)).filter(Boolean).map(e => Math.round(e.getBoundingClientRect().left)));
    const e = document.querySelector("#conteudo-meio .ag-linha [data-estrela]");
    return { n: ls.length, data: xs(".ag-data").size, est: xs(".acoes").size, op: e && getComputedStyle(e).opacity,
      th: [...document.querySelectorAll("#conteudo-meio .ag-th span")].map(x => x.textContent).join(),
      lista: (document.querySelector("#conteudo-meio .ag-linha .ag-c-lista") || {}).offsetWidth }; });
  conf(`F444: data e ⭐ na mesma coluna em ${col.n} linhas (${col.data}, ${col.est})`, col.n > 2 && col.data === 1 && col.est === 1);
  conf(`F444: a ⭐ à vista sem o mouse (${col.op})`, col.op === "1");
  conf(`F444: cabeçalho Cliente, Lista, Etapa, Prazo e coluna da lista (${col.th})`, col.th === "Cliente,Lista,Etapa,Prazo" && col.lista > 0);
  if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT });
  await ab();
  const menu = await p.evaluate(() => [...document.querySelectorAll("#lista-opc .lo-ln > span")].map(e => e.textContent));
  conf(`o ⋯ do Planejado tem Agrupar, Ordenar, Visualizar e Períodos (${menu})`, menu.join() === "Agrupar,Ordenar,Visualizar,Períodos");
  await clic("agrupar", "esp"); await p.waitForTimeout(200);
  const g = await p.evaluate(() => [...document.querySelectorAll("#conteudo-meio h3.secao")].map(h => h.firstChild.textContent.trim()).concat(localStorage.getItem("crm_agrupar")));
  conf(`agrupar por espécie põe uma seção por espécie (${g})`, g.includes("B21") && !g.includes("Hoje") && g.at(-1) === "esp");
  await ab(); await clic("agrupar", "data");
  await ab(); await clic("ordem", "alfa"); await p.waitForTimeout(200);
  const nomes = await p.evaluate(() => [...document.querySelectorAll('#conteudo-meio .pl-grupo[data-tom="venc"] .ag-linha .ag-txt b')].map(b => b.textContent));
  conf(`ordenar por nome põe as vencidas em ordem alfabética (${nomes.length})`, nomes.length > 1 && nomes.every((n, i) => !i || nomes[i - 1].localeCompare(n, "pt") <= 0));
  await ab(); await clic("ordem", "prazo");
  await ab(); await clic("vis", "cartoes"); await p.waitForTimeout(200);
  conf("Visualizar Cartões põe cada linha num quadro", await p.evaluate(() => document.getElementById("conteudo-meio").classList.contains("vis-cartoes")
    && getComputedStyle(document.querySelector("#conteudo-meio .ag-linha")).borderTopLeftRadius === "10px"));
  await p.screenshot({ path: "f437-cartoes.png" });
  await ab(); await clic("vis", "compacta");
  await ab(); await clic("per", "nao");
  conf("Períodos Sem divisão grava a escolha que o Hoje lê", await p.evaluate(() => localStorage.getItem("crm_periodos") === "nao" && !periodosLigados()));
  await ab(); await clic("per", "sim");
  // numa lista de fase o ⋯ não oferece agrupar pela própria lista
  await p.evaluate(() => { visao = "fase:judicial"; render(); }); await ab(); await p.waitForTimeout(200);
  const fz = await p.evaluate(() => [...document.querySelectorAll('#lista-opc [data-lopc="agrupar"]')].map(b => b.dataset.v));
  conf(`na lista de fase, Agrupar sem a opção Lista (${fz})`, fz.length === 3 && !fz.includes("lista"));
  await p.evaluate(() => document.querySelector('[data-lopc="agrupar"][data-v="resp"]').click()); await p.waitForTimeout(200);
  const fr = await p.evaluate(() => (filtroColab = null, render(), [...document.querySelectorAll("#conteudo-meio section.pl-grupo h3.secao")].map(h => h.textContent)));
  conf(`na lista de fase, agrupar por responsável põe seções (${fr})`, fr.length > 0);
  conf("a escolha vale por lista: o Planejado continua agrupado por data", await p.evaluate(() => { visao = "planejado"; return opcLista("agrupar") === "data"
    && (visao = "fase:judicial", opcLista("agrupar") === "resp") && (visao = "fase:inss", opcLista("agrupar") === "resp"); }));
  await p.evaluate(() => localStorage.removeItem("crm_agrupar"));
  await p.evaluate(() => { visao = "planejado"; render(); }); await p.waitForTimeout(200);
  await p.screenshot({ path: "f437-planejado.png" });
  await p.evaluate(() => { visao = "meudia"; render(); }); await ab(); await p.waitForTimeout(200);
  const md = await p.evaluate(() => [...document.querySelectorAll("#lista-opc .lo-ln > span")].map(e => e.textContent));
  conf(`no Meu Dia, o ⋯ tem Ordenar, Visualizar e Períodos (${md})`, md.join() === "Ordenar,Visualizar,Períodos");
  await p.screenshot({ path: "f437-meudia.png" });

  // F438 · o mouse parado sobre a linha mostra a última anotação; o clique continua abrindo a ficha
  await p.evaluate(() => { document.getElementById("topo-mais").open = false; visao = "planejado"; render(); });
  await p.waitForTimeout(200);
  const lin = p.locator("#conteudo-meio .ag-linha[data-casos]").first();
  await lin.hover({ position: { x: 60, y: 10 } }); await p.waitForTimeout(800);
  const ua = await p.evaluate(() => { const e = document.getElementById("ult-anot"); return e && e.classList.contains("on") ? e.innerText : ""; });
  conf(`o mouse sobre a linha mostra a última anotação (${ua.replace(/\n/g, " | ")})`, /Última anotação/.test(ua) && /Registro fictício/.test(ua));
  await p.mouse.move(5, 5); await p.waitForTimeout(100);
  conf("o mouse fora da linha esconde a anotação", await p.evaluate(() => !document.getElementById("ult-anot").classList.contains("on")));
  await lin.click({ position: { x: 60, y: 10 } }); await p.waitForTimeout(600);
  conf("o clique da linha continua abrindo a ficha", await p.evaluate(() => !!clienteAberto));

  console.log("=== F437 · linha C e o menu ⋯ das listas ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length + erros.length;
  console.log(`${ok.length - ok.filter(x => !x[1]).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
