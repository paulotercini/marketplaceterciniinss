// Auditoria de 27.11.2026, itens 7 a 9 (ordem do Paulo): a data do To Do ao lado da do CRM, com alerta quando
// divergem e o Abrir da tarefa; o relatório mensal de inadimplência sem o cancelado; o alerta de cliente conhecido sem
// ficha e o "Este telefone é de". Banco simulado e dados fictícios.
// Uso: node auditoria7a9.js
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

// 7 · um caso com as duas datas divergentes, outro com as duas iguais
const cT = cli("Cliente Teste Todo");
const kD = caso(cT, { titulo: "Caso divergente", prazo: iso(10), todo_prazo: iso(12), todo_task_id: "AQMkADAwATM0MDAAMS1+/=", origem_lista: "🗓 Tarefas com Prazo" });
const kI = caso(cT, { titulo: "Caso igual", prazo: iso(20), todo_prazo: iso(20), todo_task_id: "tarefa-igual" });
// 8 · vencidos em dois meses, um cancelado (F829) e um recebido, que não entram
const cH = cli("Cliente Teste Honor"); const kH = caso(cH, {});
const cH2 = cli("Cliente Teste Honor Dois"); const kH2 = caso(cH2, {});
const mesAnt = (() => { const d = new Date(Date.now() - 3 * 3600e3); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10); })();
const venc2 = (() => { const d = new Date(mesAnt); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10); })();
T.pagamentos.push(
  { id: "f9310000-0000-4000-8000-000000000001", caso_id: kH.id, cliente_id: cH.id, descricao: "1ª parcela", valor: 500, vencimento: mesAnt, status: "aberto", conferencias: [] },
  { id: "f9310000-0000-4000-8000-000000000002", caso_id: kH2.id, cliente_id: cH2.id, descricao: "Entrada", valor: 300, vencimento: mesAnt, status: "aberto", conferencias: [] },
  { id: "f9310000-0000-4000-8000-000000000003", caso_id: kH.id, cliente_id: cH.id, descricao: "2ª parcela", valor: 200, vencimento: venc2, status: "aberto", conferencias: [] },
  { id: "f9310000-0000-4000-8000-000000000004", caso_id: kH.id, cliente_id: cH.id, descricao: "Em dobro", valor: 999, vencimento: mesAnt, status: "cancelado", cancelado_motivo: "lançado em dobro", cancelado_em: ts(-2), conferencias: [] },
  { id: "f9310000-0000-4000-8000-000000000005", caso_id: kH.id, cliente_id: cH.id, descricao: "Cancelado antigo", valor: 777, vencimento: mesAnt, status: "aberto", cancelado_em: ts(-2), conferencias: [] },
  { id: "f9310000-0000-4000-8000-000000000006", caso_id: kH.id, cliente_id: cH.id, descricao: "Pago", valor: 888, vencimento: mesAnt, status: "recebido", pago_em: mesAnt, conferencias: [] });
// 9 · a ficha com o telefone da mãe; a anotação que cita um número sem ficha
const cZ = cli("Cliente Teste Zap"); cZ.telefone = "5500000000011";
cZ.telefones = [{ numero: "5500000000011", zap: true }, { numero: "5500000000012", obs: "recado" }];
const kZ = caso(cZ, {});
T.andamentos.push({ id: id("a"), caso_id: kZ.id, texto: "Ligar para a filha no 0000-0013, ela cuida do benefício", origem: "app", criado_em: ts(-5) });
T.zap_conversas.push(
  { id: id("z"), telefone: "5500000000012", chave: "00000012", cliente_id: cZ.id, nome_perfil: "Perfil", status: "aberta", ultima_em: ts(0) },
  { id: id("z"), telefone: "5500000000013", chave: "00000013", cliente_id: null, nome_perfil: "Sem Nome", status: "aberta", ultima_em: ts(0) },
  { id: id("z"), telefone: "5500000000014", chave: "00000014", cliente_id: null, nome_perfil: "Outro", status: "aberta", ultima_em: ts(0) });
const [Z1, Z2, Z3] = T.zap_conversas.slice(-3);

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

  // ── 7 · To Do ao lado do CRM ─────────────────────────────────────────────────────
  const r7 = await p.evaluate(([d, i, c]) => ({ dv: todoDiverge(D.casoPorId.get(d)), ig: todoDiverge(D.casoPorId.get(i)),
    hd: datasTodoHtml(D.casoPorId.get(d)), hi: datasTodoHtml(D.casoPorId.get(i)), aba: painelPrazosCliente(c), lk: linkTodo(D.casoPorId.get(d)) }), [kD.id, kI.id, cT.id]);
  conf("datas diferentes divergem; iguais, não", r7.dv && !r7.ig);
  conf("o caso divergente mostra as duas datas e o alerta", /Microsoft To Do: <b>/.test(r7.hd) && /CRM: <b>/.test(r7.hd) && /As datas divergem/.test(r7.hd));
  conf("o caso igual mostra as datas, sem alerta", /CRM: <b>/.test(r7.hi) && !/divergem/.test(r7.hi));
  conf("o Abrir leva à tarefa no To Do pelo id", r7.lk === "https://to-do.live.com/tasks/id/" + encodeURIComponent(kD.todo_task_id) + "/details" && r7.hd.includes(r7.lk) && />Abrir</.test(r7.hd));
  conf("a aba Prazos do cliente traz o quadro das datas do To Do", /Datas do Microsoft To Do/.test(r7.aba) && /As datas divergem/.test(r7.aba));
  conf("caso sem tarefa no To Do não mostra o quadro", await p.evaluate(k => datasTodoHtml(D.casoPorId.get(k)) === "", kH.id));

  // ── 8 · inadimplência por mês ────────────────────────────────────────────────────
  const r8 = await p.evaluate(() => { const r = inadimplencia(D.pagamentos, hoje());
    return { total: r.total, meses: r.meses.map(o => ({ mes: o.mes, total: o.total, n: o.n, resp: [...o.resp], cli: [...o.cli.values()].map(x => [x.c.nome, x.total]) })) }; });
  conf("total sem cancelado nem recebido", r8.total === 1000);
  conf("dois meses, o mais recente primeiro", r8.meses.length === 2 && r8.meses[0].mes === mesAnt.slice(0, 7) && r8.meses[0].total === 800 && r8.meses[1].total === 200);
  conf("por responsável e por cliente", r8.meses[0].resp.length === 1 && r8.meses[0].resp[0][1] === 800 && r8.meses[0].cli.length === 2);
  await p.evaluate(() => irPara("recebimentos")); await p.waitForTimeout(300);
  const h8 = await p.textContent("#conteudo-meio");
  conf("o relatório aparece nos Recebimentos", /Inadimplência por mês/.test(h8) && !/999/.test(h8.split("Inadimplência por mês")[1] || "x"));

  // ── 9b · "Este telefone é de" ────────────────────────────────────────────────────
  await p.evaluate(c => abrirFicha(c), cZ.id); await p.waitForTimeout(300);
  await p.evaluate(c => editarTelefone(c, 1), cZ.id);
  await p.selectOption("#et-de", "outro");
  await p.click("#et-ok"); await p.waitForTimeout(200);
  conf("outro sem nome é recusado", /nome de quem usa/.test(await aviso()) && !T.clientes.find(x => x.id === cZ.id).telefones[1].de);
  await p.selectOption("#et-de", "mãe"); await p.fill("#et-denome", "Pessoa Teste");
  await p.click("#et-ok"); await p.waitForTimeout(500);
  const tz = T.clientes.find(x => x.id === cZ.id).telefones[1];
  conf("a ficha grava de quem é o telefone", tz.de === "mãe" && tz.de_nome === "Pessoa Teste");
  const z1 = T.zap_conversas.find(x => x.id === Z1.id);
  conf("a conversa do número recebe quem conversa (a IA lê)", z1.contato_relacao === "mãe" && z1.contato_nome === "Pessoa Teste");
  conf("a ficha mostra o Este telefone é de", /Este telefone é de: mãe · Pessoa Teste/.test(await p.evaluate(() => document.body.innerHTML)));
  conf("o cabeçalho da conversa diz de quem é o telefone", await p.evaluate(c => telDeTexto(telDe(D.cliPorId.get(c), "5500000000012")) === "mãe · Pessoa Teste", cZ.id));

  // ── 9a · cliente conhecido sem ficha ─────────────────────────────────────────────
  const a9 = await p.evaluate(async ([z2, z3]) => {
    const c2 = zapConvs.find(x => x.id === z2) || { id: z2, telefone: "5500000000013" }, c3 = zapConvs.find(x => x.id === z3) || { id: z3, telefone: "5500000000014" };
    alertaSemFicha(c2, []); await new Promise(r => setTimeout(r, 400));
    return { notas: alertaSemFicha(c2, []), nada: alertaSemFicha(c3, [{ direcao: "entrada", texto: "bom dia" }]),
      assunto: alertaSemFicha(c3, [{ direcao: "entrada", texto: "queria saber do meu processo" }]),
      saida: alertaSemFicha(c3, [{ direcao: "saida", texto: "o processo segue" }]) };
  }, [Z2.id, Z3.id]);
  conf("o número citado em anotação dá o alerta com o cliente e o Vincular", /Cliente conhecido sem ficha/.test(a9.notas) && /Cliente Teste Zap/.test(a9.notas) && new RegExp(`vincularConversa\\('${cZ.id}'\\)`).test(a9.notas));
  conf("a conversa que fala de processo dá o alerta", /fala de caso, benefício ou processo/.test(a9.assunto) && />Vincular</.test(a9.assunto));
  conf("sem sinal (ou só o escritório falando), sem alerta", a9.nada === "" && a9.saida === "");
  conf("conversa com ficha não tem o alerta", await p.evaluate(c => alertaSemFicha({ id: "z", cliente_id: c, telefone: "5500000000012" }, [{ direcao: "entrada", texto: "meu processo" }]) === "", cZ.id));

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
