// F373 · a ⭐ do canto da ficha (pedido do Paulo, 02.11.2026): abaixo do ⋯, um clique marca ou desmarca todos os
// casos abertos do cliente, e o Concluir por hoje não a apaga. Banco simulado e dados fictícios.
// Uso: node f373.js [fotos]
// Uso: node f291.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f373";
fs.mkdirSync(OUT, { recursive: true });

const PAULO = FIX.colaboradores[0].id, MARCOS = "22222222-2222-2222-2222-222222222222";
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: [...FIX.colaboradores, { id: MARCOS, auth_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", nome: "Marcos Fictício", inicial: "M",
    cor: "#8a4b00", papel: "colaborador", ativo: true, cargo: "advogado" }],
  clientes: [], casos: [], atribuicoes: [], documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;
const iso = n => new Date(Date.now() - 3 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
const ts = (n, h = "12:00") => `${iso(n)}T${h}:00-03:00`;
let seq = 0;
const id = p => `${p}0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const cli = (nome, campos = {}) => { const c = { id: id("c"), nome, cpf: null, telefone: null, campos, telefones: [], criado_em: ts(-400) }; T.clientes.push(c); return c; };
const caso = (c, o) => { const k = { id: id("b"), cliente_id: c.id, titulo: c.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
  marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, dcb_prorrogacao_pedida: false, origem_lista: "🌻 INSS",
  criado_em: ts(-300), ...o }; T.casos.push(k); T.atribuicoes.push({ caso_id: k.id, colaborador_id: PAULO }); return k; };
const and = (k, n, texto, o = {}) => { const a = { id: id("e"), caso_id: k.id, autor_id: PAULO, texto, origem: "app", origem_id: null, criado_em: ts(n),
  publico: false, excluir: false, importante: false, urgente: false, responde_a: null, ...o }; T.andamentos.push(a); return a; };



// A · dois casos abertos, nenhum marcado; B · um caso marcado; C · sem caso aberto
const cA = cli("Ellen Fictícia Estrela");
const kA1 = caso(cA, { beneficio: "Pensão por Morte", especie: "B21", fase: "inss", todo_task_id: "tdA1" });
const kA2 = caso(cA, { beneficio: "Aux. Incapacidade Temporária", especie: "B31", fase: "judicial", todo_task_id: "tdA2" });
const kA3 = caso(cA, { beneficio: "Apos. por Idade", fase: "encerrado" });
const cB = cli("Bruno Fictício Marcado");
const kB = caso(cB, { beneficio: "Apos. por Idade", especie: "B41", fase: "inss", importante: true });
const cC = cli("Carla Fictícia Sem Caso");

const ok = [];
const conf = (nome, v) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); };

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, "..", "..", q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1500, height: 900 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  await instalarBanco(ctx, { SUPA, SESSAO, banco });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const abrirA = async () => { await p.evaluate(async c => { await abrirFicha(c); }, cA.id);
    await p.waitForTimeout(400); await p.keyboard.press("1"); await p.waitForSelector(".det-imp"); };
  const kt = k => T.casos.find(x => x.id === k.id);

  // 1 · o botão fica abaixo do ⋯, apagado, e é um pouco maior que os botões vizinhos
  await abrirA();
  const g = await p.evaluate(() => {
    const b = document.querySelector(".det-imp").getBoundingClientRect(), m = document.querySelector(".det-notas").getBoundingClientRect();
    return { bTop: b.top, mBot: m.bottom, bx: b.left + b.width / 2, mx: m.left + m.width / 2, w: b.width, on: document.querySelector(".det-imp").classList.contains("on") };
  });
  console.log(JSON.stringify(g), await p.evaluate(() => JSON.stringify(document.querySelector(".det-canto").getBoundingClientRect())));
  conf("a ⭐ fica abaixo do Anotações", g.bTop >= g.mBot - 1 && Math.abs(g.bx - g.mx) < 20);
  conf("a ⭐ tem ao menos 32 px e nasce apagada", g.w >= 32 && !g.on);
  await p.screenshot({ path: path.join(OUT, "01-apagada.png"), clip: { x: 0, y: 0, width: 1500, height: 160 } });

  // 2 · um clique marca todos os casos abertos, e o encerrado não
  await p.click(".det-imp");
  await p.waitForTimeout(500);
  conf("um clique marca os dois casos abertos", kt(kA1).importante === true && kt(kA2).importante === true);
  conf("o caso encerrado não é marcado", !kt(kA3).importante);
  conf("a ⭐ acende", await p.evaluate(() => document.querySelector(".det-imp").classList.contains("on")));
  await p.screenshot({ path: path.join(OUT, "02-acesa.png"), clip: { x: 0, y: 0, width: 1500, height: 160 } });
  await p.evaluate(() => { fecharFicha(); visao = "importante"; render(); });
  await p.waitForTimeout(400);
  conf("o cliente entra na lista ⭐ Importante", !!(await p.$(`.ag-linha[data-cli="${cA.id}"]`)));

  // 3 · com um caso só marcado, a ⭐ aparece acesa e o clique desmarca todos
  T.casos.find(x => x.id === kA1.id).importante = false;
  await p.evaluate(id => { D.casoPorId.get(id).importante = false; }, kA1.id);
  await abrirA();
  conf("com algum caso marcado, a ⭐ aparece acesa", await p.evaluate(() => document.querySelector(".det-imp").classList.contains("on")));
  await p.click(".det-imp");
  await p.waitForTimeout(500);
  conf("o clique desmarca todos", !kt(kA1).importante && !kt(kA2).importante);

  // 4 · sem caso aberto, sem botão; no nível 1, sem botão
  await p.evaluate(async c => { await abrirFicha(c); }, cC.id);
  await p.waitForTimeout(300);
  conf("sem caso aberto, não há ⭐", !(await p.$(".det-imp")));
  await p.evaluate(async c => { await abrirFicha(c); }, cB.id);
  await p.waitForSelector(".det-imp.on");
  conf("caso único marcado: ⭐ acesa", true);

  // 5 · o Concluir por hoje não apaga a ⭐
  await p.evaluate(kid => { casoSel = kid; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); }, kB.id);
  await p.waitForSelector(".desp-bt");
  await p.click(".desp-bt");
  await p.waitForSelector(".desp-datas");
  await p.click('.desp-datas .btn-mini:has-text("Amanhã")');
  await p.click("#desp-ok");
  await p.waitForTimeout(700);
  conf("o Concluir por hoje marca a volta e mantém a ⭐", kt(kB).importante === true && !!kt(kB).prazo);

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  await nav.close(); s.close();
  const n = ok.filter(x => x[1]).length;
  console.log(`\n${n}/${ok.length}`);
  process.exit(n === ok.length ? 0 : 1);
})();
