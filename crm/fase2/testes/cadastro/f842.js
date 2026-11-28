// F842 · o mesmo NB em dois casos do mesmo cliente: o plano de organização junta o caso do To Do ao mais adiantado,
// e não junta quando o caso ficaria com dois NUP, quando o incorporado nasceu no CRM ou quando um é revisão e o outro não.
// Banco simulado, dados fictícios (NB e processo com dígito inválido). Uso: node f842.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";

const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: JSON.parse(JSON.stringify(FIX.clientes)), casos: JSON.parse(JSON.stringify(FIX.casos)),
  atribuicoes: FIX.atribuicoes, documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;

const cli = n => `c0000000-0000-0000-0000-00000000084${n}`, k = n => `b0000000-0000-0000-0000-0000000084${n}`;
const NB = n => `600.000.084-${n}`;
for (const n of [1, 2, 3, 4, 5]) T.clientes.push({ id: cli(n), nome: `Cliente Teste ${n}`, cpf: null, telefone: `55000000008${n}`, sexo: "F", campos: {}, criado_em: "2024-01-10T12:00:00Z" });
const caso = o => ({ titulo: "Cliente Teste", protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {}, marcadores: [], criado_em: "2025-01-01T12:00:00Z", ...o });
T.casos.push(
  // 1 · INSS e Judicial com o mesmo NB, os dois do To Do: junta ao Judicial
  caso({ id: k(11), cliente_id: cli(1), fase: "inss", origem_lista: "🌻 INSS", beneficio: "Apos. Especial", nb: NB(1), todo_task_id: "t11" }),
  caso({ id: k(12), cliente_id: cli(1), fase: "judicial", origem_lista: "👪 Judicial", beneficio: "Apos. Especial", nb: NB(1), todo_task_id: "t12",
    processo: "0008400-11.2026.4.03.6314", processos: [{ numero: "0008400-11.2026.4.03.6314", nosso: true }] }),
  // 2 · dois recursos com NUP diferente: o caso ficaria com dois NUP
  caso({ id: k(21), cliente_id: cli(2), fase: "conselho", origem_lista: "🖥 Conselho de Recursos", nb: NB(2), todo_task_id: "t21", crps_nups: ["44233000084202601"] }),
  caso({ id: k(22), cliente_id: cli(2), fase: "conselho", origem_lista: "🖥 Conselho de Recursos", nb: NB(2), todo_task_id: "t22", crps_nups: ["44233000084202602"] }),
  // 3 · o que se juntaria nasceu no CRM: a fusão o apagaria
  caso({ id: k(31), cliente_id: cli(3), fase: "inss", nb: NB(3) }),
  caso({ id: k(32), cliente_id: cli(3), fase: "judicial", origem_lista: "👪 Judicial", nb: NB(3), todo_task_id: "t32" }),
  // 4 · revisão do benefício já concedido: outro pedido sobre o mesmo NB
  caso({ id: k(41), cliente_id: cli(4), fase: "inss", origem_lista: "🌻 INSS", beneficio: "Revisão", nb: NB(4), todo_task_id: "t41" }),
  caso({ id: k(42), cliente_id: cli(4), fase: "judicial", origem_lista: "👪 Judicial", beneficio: "Apos. por Idade", nb: NB(4), todo_task_id: "t42" }),
  // 5 · F844 · Judicial e Pagamento com o mesmo NB: o Judicial se junta ao caso em Pagamento
  caso({ id: k(51), cliente_id: cli(5), fase: "judicial", origem_lista: "👪 Judicial", beneficio: "BPC", nb: NB(5), todo_task_id: "t51" }),
  caso({ id: k(52), cliente_id: cli(5), fase: "pagamento", origem_lista: "💰 Pagamento", beneficio: "BPC", nb: NB(5), todo_task_id: "t52" }));
// F844 · o mesmo agendamento nos dois casos do cliente 5: a fusão não apaga a cópia
T.eventos.push({ id: "f0000000-0000-0000-0000-000000008451", caso_id: k(51), tipo: "pericia", data: "2026-12-10" },
  { id: "f0000000-0000-0000-0000-000000008452", caso_id: k(52), tipo: "pericia", data: "2026-12-10" });
T.andamentos.push({ id: "e0000000-0000-0000-0000-000000008401", caso_id: k(11), origem: "app", texto: "Anotação do caso do INSS", criado_em: "2026-01-05T12:00:00Z", autor_id: FIX.colaboradores[0].id });
// F843 · o mesmo andamento coletado nos dois casos (o banco não deixa repetir no destino) e um documento do incorporado
const and = (id, caso) => ({ id: `e0000000-0000-0000-0000-00000000840${id}`, caso_id: caso, origem: "pat", origem_id: "ev-1", texto: "Exigência cumprida", criado_em: "2026-01-06T12:00:00Z" });
T.andamentos.push(and(2, k(11)), and(3, k(12)));
T.anexos.push({ id: "a0000000-0000-0000-0000-000000008401", caso_id: k(11), cliente_id: cli(1), nome: "carta.pdf", caminho: "teste/f843/carta.pdf", origem: "app", criado_em: "2026-01-06T12:00:00Z" });

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
  p._erros = [];
  p.on("pageerror", e => p._erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0 && D._completo);

  const plano = id => p.evaluate(c => planoOrganizar(c).passos.map(x => ({ acao: x.acao, de: x.de, para: x.para })), id);
  const p1 = await plano(cli(1));
  conf("INSS e Judicial do To Do com o mesmo NB: o plano junta o do INSS ao Judicial", p1.length === 1 && p1[0].acao === "juntar" && p1[0].de === k(11) && p1[0].para === k(12));
  conf("dois recursos com NUP diferente não se juntam", !(await plano(cli(2))).length);
  conf("o caso que nasceu no CRM não é incorporado (a fusão o apagaria)", !(await plano(cli(3))).length);
  conf("revisão e concessão sobre o mesmo NB não se juntam", !(await plano(cli(4))).length);
  const p5 = await plano(cli(5));
  conf("F844 · Judicial e Pagamento com o mesmo NB: o Judicial se junta ao caso em Pagamento", p5.length === 1 && p5[0].acao === "juntar" && p5[0].de === k(51) && p5[0].para === k(52));
  conf("F844 · o cliente com caso em Pagamento entra na lista do lote", await p.evaluate(c => clientesVariosCasos().some(l => l.c.id === c), cli(5)));

  await p.evaluate(async c => { window.confirmar = async () => true; const { passos } = planoOrganizar(c); await aplicarPlano(c, passos); }, cli(1));
  const casca = T.casos.find(x => x.id === k(11)), dest = T.casos.find(x => x.id === k(12));
  conf("aplicado: o caso do INSS vira casca encerrada com a marca que a sincronização respeita",
    !!casca && !!casca.encerrado_em && ((casca.arquivados || {}).fundido || {}).para === k(12));
  conf("a anotação do caso incorporado passa ao destino, que mantém NB e processo",
    T.andamentos.find(a => a.id === "e0000000-0000-0000-0000-000000008401").caso_id === k(12) && dest.nb === NB(1) && !!dest.processo);
  await p.evaluate(async c => { const { passos } = planoOrganizar(c); await aplicarPlano(c, passos); }, cli(5));
  const ev = T.eventos.filter(e => e.tipo === "pericia" && e.data === "2026-12-10");
  conf("F844 · aplicado o Pagamento: casca encerrada e o agendamento repetido não se apaga",
    !!T.casos.find(x => x.id === k(51)).encerrado_em && ev.length === 2);
  const andDe = n => T.andamentos.find(x => x.id === `e0000000-0000-0000-0000-00000000840${n}`).caso_id, anexo = () => T.anexos.find(x => x.caminho === "teste/f843/carta.pdf").caso_id;
  conf("F843 · o andamento que o destino já tem fica no incorporado e não impede os outros de ir", andDe(2) === k(11) && andDe(3) === k(12) && andDe(1) === k(12));
  conf("F843 · o documento do caso incorporado vai para o destino", anexo() === k(12));
  conf("o passo fica registrado no cliente, para o Desfazer", ((T.clientes.find(c => c.id === cli(1)).campos || {}).org_auto || []).some(l => l.passos.some(x => x.acao === "juntar" && x.reg)));

  await p.evaluate(c => desfazerOrganizacao(c), cli(1));
  conf("F843 · o Desfazer devolve a anotação e o documento ao caso reaberto", andDe(1) === k(11) && anexo() === k(11) && !T.casos.find(x => x.id === k(11)).encerrado_em);

  conf("sem erro de página", !p._erros.length);
  if (p._erros.length) console.log(p._erros.join("\n"));
  const bons = ok.filter(x => x[1]).length;
  console.log(`\n${bons}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(bons === ok.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
