// F829 · correções da auditoria (ordem do Paulo, 27.11.2026): a data do To Do é só leitura na aba Prazos e o modo
// só To Do esconde o que não vem dele; o lançamento de honorários pede Recebido ou A receber e avisa a falha; Editar,
// Cancelar com motivo e Desfazer; as parcelas do pré-caso vão ao caso ligado. Banco simulado e dados fictícios.
// Uso: node auditoria829.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";

const PAULO = FIX.colaboradores[0].id;
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: [...FIX.colaboradores], clientes: [], casos: [], atribuicoes: [],
  documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;
const iso = n => new Date(Date.now() - 3 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
const ts = (n, h = "12:00") => `${iso(n)}T${h}:00-03:00`;
let seq = 0;
const id = p => `${p}0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const cli = (nome, campos = {}) => { const c = { id: id("c"), nome, cpf: null, telefone: null, campos, telefones: [], criado_em: ts(-400) }; T.clientes.push(c); return c; };
const caso = (c, o) => { const k = { id: id("b"), cliente_id: c.id, titulo: c.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
  marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, dcb_prorrogacao_pedida: false, origem_lista: "🌻 INSS",
  fase: "inss", criado_em: ts(-300), ...o }; T.casos.push(k); T.atribuicoes.push({ caso_id: k.id, colaborador_id: PAULO }); return k; };

// 1 · prazos: o To Do (só leitura), a volta à fila (do CRM, editável, fora do modo só To Do) e o prazo do CRM
const cT = cli("Cliente Teste Todo"); const kT = caso(cT, { prazo: iso(10), todo_prazo: iso(10) });
const cV = cli("Cliente Teste Fila"); const kV = caso(cV, { prazo: iso(5), ronda: { despacho: { prazo: iso(5), por: PAULO, em: ts(-1) } } });
// 2 e 3 · honorários
const cH = cli("Cliente Teste Honor"); const kH = caso(cH, {});
const PG_AB = "f8280000-0000-4000-8000-000000000001", PG_RC = "f8280000-0000-4000-8000-000000000002", PG_CF = "f8280000-0000-4000-8000-000000000003";
T.pagamentos.push({ id: PG_AB, caso_id: kH.id, cliente_id: cH.id, descricao: "1ª parcela", valor: 500, vencimento: iso(20), status: "aberto", pago_em: null, conferencias: [] },
  { id: PG_RC, caso_id: kH.id, cliente_id: cH.id, descricao: "RPV", valor: 900, vencimento: null, status: "recebido", pago_em: iso(-3), conferencias: [{ c: PAULO, em: ts(-3) }] },
  { id: PG_CF, caso_id: kH.id, cliente_id: cH.id, descricao: "Entrada", valor: 300, vencimento: null, status: "recebido", pago_em: iso(-5),
    conferencias: [{ c: "22222222-2222-2222-2222-222222222222", em: ts(-5) }, { c: PAULO, em: ts(-4) }] });
// 4 · parcelas: dois casos abertos; o pré-caso está ligado ao segundo
const cP = cli("Cliente Teste Parcela"); caso(cP, { titulo: "Outro benefício" }); const kP2 = caso(cP, { titulo: "Benefício do pré-caso" });
cP.campos = { precasos: [{ id: "pc828", especie: "B41", caso_id: kP2.id }] };

const ok = [];
const conf = (nome, v) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); };

(async () => {
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
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  await instalarBanco(ctx, { SUPA, SESSAO, banco });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  let resposta = true;
  p.on("dialog", d => resposta ? d.accept() : d.dismiss());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const aviso = () => p.textContent("#aviso");

  // ── 1 · a data do To Do é só leitura ───────────────────────────────────────────────
  const l1 = await p.evaluate(c => prazosDoCliente(c).lista.filter(x => x.rotulo === "Prazo do Microsoft To Do").map(x => x.edita), cT.id);
  const transicao = await p.evaluate(() => hoje() <= "2026-12-31");
  conf("o prazo do To Do não tem campo de data nem Corrigir até 31/12/2026 (edita vazio)", l1.length === 1 && (l1[0] === "") === transicao);
  conf("a regra vale até 31/12/2026 e solta depois", await p.evaluate(() => editaPzTodo(true, "x") === (hoje() <= "2026-12-31" ? "" : "x") && editaPzTodo(false, "x") === "x"));
  const lV = await p.evaluate(c => prazosDoCliente(c).lista.filter(x => x.rotulo === "Volta à fila").map(x => !!x.edita), cV.id);
  conf("a volta à fila (do CRM) segue editável", lV.length === 1 && lV[0]);
  conf("o modo só To Do está ligado na tela sem PZ_TODOS_TIPOS", await p.evaluate(() => PZ_SO_TODO === true));
  const hT = await p.evaluate(c => painelPrazosCliente(c), cT.id);
  conf("na aba, o item do To Do aparece", /Microsoft To Do/.test(hT));
  conf("a legenda do mês no modo só To Do não fala de Compromisso nem Lembrete", /pzm-leg/.test(hT) && !/pzm-comp/.test(hT) && !/pzm-lemb"><\/i>Lembrete/.test(hT));
  const hV = await p.evaluate(c => painelPrazosCliente(c), cV.id);
  conf("no modo só To Do, a Volta à fila sai da aba", !/Volta à fila/.test(hV) && /Sem prazos em aberto/.test(hV));
  conf("o filtro do modo só To Do deixa de fora o Retorno do pré-caso", await p.evaluate(() => !doTodoPz({ rotulo: "Retorno do pré-caso" }) && !doTodoPz({ rotulo: "Volta à fila" }) && doTodoPz({ todo: true })));

  // ── 2 · Recebido ou A receber, escolhido ──────────────────────────────────────────
  const abrirHon = () => p.evaluate(c => abrirFicha(c).then(() => { abaAtiva = 4; repintarFicha(); }), cH.id);
  await abrirHon();
  await p.waitForSelector('.painel[data-p="4"].ativo .hon-novo', { state: "attached" });
  conf("o lançamento traz Recebido e A receber, nenhum marcado", await p.evaluate(() => {
    const r = [...document.querySelectorAll('input[name="np-sit"]')]; return r.length === 2 && r.every(x => !x.checked); }));
  const lancar = async (sit, data) => p.evaluate(([sit, data]) => {
    document.querySelector(".hon-novo").open = true;
    document.getElementById("np-valor").value = "100"; document.getElementById("np-data").value = data;
    document.querySelectorAll('input[name="np-sit"]').forEach(x => x.checked = x.value === sit);
    return novoPgto(); }, [sit, data]);
  const antes = T.pagamentos.length;
  await lancar("", iso(0));
  conf("sem escolher, não grava e pede a escolha", T.pagamentos.length === antes && /Recebido ou A receber/.test(await aviso()));
  await lancar("recebido", iso(3));
  conf("Recebido com data futura é recusado", T.pagamentos.length === antes && /data futura/.test(await aviso()));
  await lancar("aberto", iso(0));
  const novoA = T.pagamentos[T.pagamentos.length - 1];
  conf("A receber com a data de hoje grava aberto, com vencimento", T.pagamentos.length === antes + 1 && novoA.status === "aberto" && novoA.vencimento === iso(0) && !novoA.pago_em);
  await abrirHon(); await p.waitForSelector('.painel[data-p="4"].ativo .hon-novo', { state: "attached" });
  await lancar("recebido", iso(0));
  const novoR = T.pagamentos[T.pagamentos.length - 1];
  conf("Recebido grava recebido, com quem recebeu", novoR.status === "recebido" && novoR.pago_em === iso(0) && novoR.conferencias[0].c === PAULO);
  await abrirHon(); await p.waitForSelector('.painel[data-p="4"].ativo .hon-novo', { state: "attached" });
  await p.route(SUPA + "/rest/v1/pagamentos*", r => r.request().method() === "POST" ? r.fulfill({ status: 500, contentType: "application/json", body: '{"message":"falhou"}' }) : r.fallback());
  const n0 = T.pagamentos.length, e0 = erros.length;
  await lancar("aberto", iso(9));
  conf("falha no POST: avisa e não quebra", T.pagamentos.length === n0 && /Não gravei o lançamento/.test(await aviso()) && erros.length === e0);
  await p.unroute(SUPA + "/rest/v1/pagamentos*");

  // ── 3 · Editar, Cancelar com motivo, Desfazer ─────────────────────────────────────
  await abrirHon(); await p.waitForSelector('.painel[data-p="4"].ativo .hon-tab', { state: "attached" });
  const bts = await p.$$eval(`tr[data-pg="${PG_AB}"] .hon-acao button`, b => b.map(x => x.textContent.trim()));
  conf("o aberto tem recebido, Editar e Cancelar", bts.join("|") === "recebido|Editar|Cancelar");
  await p.click(`tr[data-pg="${PG_AB}"] button:has-text("Editar")`);
  await p.fill("#ed-valor", "550"); await p.fill("#ed-venc", iso(25));
  await p.click('#modal button:has-text("Guardar")'); await p.waitForTimeout(400);
  const pa = T.pagamentos.find(x => x.id === PG_AB);
  conf("Editar grava valor, vencimento, quem e quando", +pa.valor === 550 && pa.vencimento === iso(25) && pa.editado_por === PAULO && pa.editado_em);
  await p.click(`tr[data-pg="${PG_AB}"] button:has-text("Cancelar")`);
  await p.click('#modal button:has-text("Cancelar")'); await p.waitForTimeout(200);
  conf("Cancelar sem motivo não grava", T.pagamentos.find(x => x.id === PG_AB).status === "aberto" && /motivo/.test(await aviso()));
  await p.fill("#cc-motivo", "lançado em dobro");
  await p.click('#modal button:has-text("Cancelar")'); await p.waitForTimeout(400);
  const pc = T.pagamentos.find(x => x.id === PG_AB);
  conf("Cancelar com motivo: cancelado, com motivo, quem e quando", pc.status === "cancelado" && pc.cancelado_motivo === "lançado em dobro" && pc.cancelado_por === PAULO && pc.cancelado_em);
  const linhaC = await p.$eval(`tr[data-pg="${PG_AB}"]`, t => ({ s: !!t.querySelector("td.desc s") && !!t.querySelector("td.valor s"), txt: t.textContent, bts: t.querySelectorAll(".hon-acao button").length }));
  conf("o cancelado não some: fica riscado, com o motivo, sem botões", linhaC.s && /Cancelado por .*lançado em dobro/.test(linhaC.txt) && linhaC.bts === 0);
  conf("o cancelado sai do A receber", !/R\$\s?550/.test(await p.textContent(".hon-resumo")));
  // desfazer a minha conferência (sou o segundo da corrente), recusando antes
  resposta = false;
  await p.click(`tr[data-pg="${PG_CF}"] button:has-text("Desfazer")`); await p.waitForTimeout(300);
  conf("Desfazer pede confirmação (recusada, nada muda)", T.pagamentos.find(x => x.id === PG_CF).conferencias.length === 2);
  resposta = true;
  await p.click(`tr[data-pg="${PG_CF}"] button:has-text("Desfazer")`); await p.waitForTimeout(400);
  const pcf = T.pagamentos.find(x => x.id === PG_CF);
  conf("Desfazer a conferência tira só a minha", pcf.status === "recebido" && pcf.conferencias.length === 1 && pcf.conferencias[0].c !== PAULO);
  await p.click(`tr[data-pg="${PG_RC}"] button:has-text("Desfazer")`); await p.waitForTimeout(400);
  const prc = T.pagamentos.find(x => x.id === PG_RC);
  conf("Desfazer o recebido: volta a receber, vencimento no dia que era, sem a corrente", prc.status === "aberto" && !prc.pago_em && prc.vencimento === iso(-3) && !prc.conferencias.length && prc.editado_por === PAULO);

  // ── 4 · as parcelas vão ao caso ligado ao pré-caso ────────────────────────────────
  await p.evaluate(([c, d]) => sincronizarParcelasHon(D.cliPorId.get(c), "pc828", { valor: 1200, parcelas: 2, primeira_em: d }), [cP.id, iso(20)]);
  await p.waitForTimeout(300);
  const parc = T.pagamentos.filter(x => String(x.todo_item_id || "").startsWith("hon:pc828:"));
  conf("as parcelas do pré-caso vão ao caso ligado, e não ao primeiro aberto", parc.length > 0 && parc.every(x => x.caso_id === kP2.id));

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
