// F292 · Onda B do fluxo do To Do (29.10.2026): a data escrita na anotação vira a volta à fila num clique, a menção
// se responde com "Ok" ou "Feito", a etapa aparece na linha de todas as listas e o prazo fatal avisa a 5, 2 e 1 dia
// útil. Banco simulado e dados fictícios.
// Uso: node f292.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f292";
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



// A · na fila do dia, com etapa declarada
const cA = cli("Rosana Fictícia Nota");
const kA = caso(cA, { beneficio: "Aux. Incapacidade Temporária", especie: "B31", fase: "inss", importante: true, etapa: "Aguardando análise", protocolos: ["1700000401"] });
// B · o composer do caso
const cB = cli("Bruno Fictício Composer");
const kB = caso(cB, { beneficio: "Apos. por Idade", especie: "B41", fase: "inss", importante: true, protocolos: ["1700000402"] });
// C · menção do Marcos ao Paulo
const cC = cli("Carla Fictícia Menção");
const kC = caso(cC, { beneficio: "BPC", especie: "B87", fase: "inss", protocolos: ["1700000403"] });
const aC = and(kC, -1, "@Paulo confere o CadÚnico, por favor", { autor_id: MARCOS });
T.mencoes.push({ id: id("d"), de_id: MARCOS, para_id: PAULO, caso_id: kC.id, andamento_id: aC.id, texto: aC.texto, criado_em: ts(-1), lida_em: null });
// D · prazo fatal adiante (a data sai da conta da página: 2 dias úteis)
const cD = cli("Dario Fictício Prazo");
const kD = caso(cD, { beneficio: "Pensão por Morte", especie: "B21", fase: "inss", protocolos: ["1700000404"] });

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
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const kt = k => T.casos.find(x => x.id === k.id);
  const alvo = await p.evaluate(() => { let d = hoje(); for (let i = 0; i < 20; i++) { d = somaDias(d, 1); if (uteisAte(d) === 2 && ehDiaUtil(d)) return d; } });
  const br5 = s => `${s.slice(8, 10)}/${s.slice(5, 7)}`;

  // 1 · a etapa na linha da ⭐ Importante, que antes só as listas de fase mostravam
  await p.evaluate(() => { visao = "importante"; render(); });
  await p.waitForTimeout(400);
  conf("a etapa do caso aparece na linha da ⭐ Importante", /Aguardando análise/.test(await p.textContent(`.ag-linha[data-cli="${cA.id}"]`)));

  // 2 · a data escrita na anotação do despacho escolhe a volta
  await p.click(`.ag-linha[data-cli="${cA.id}"] .desp-circ`);
  await p.waitForSelector(".desp-datas");
  await p.fill("#desp-nota", `Pedido de relatório entregue. Aguardar até ${br5(alvo)}.`);
  await p.waitForTimeout(150);
  conf(`"aguardar até ${br5(alvo)}" na anotação escolhe a data de volta`, await p.evaluate(a => _desp && _desp.data === a, alvo));
  await p.click("#desp-ok");
  await p.waitForTimeout(800);
  conf("o despacho grava a data lida da anotação", kt(kA).prazo === alvo && kt(kA).importante === false);

  // 3 · no campo de escrever do caso, a data lida vira o "Concluir em" com um clique
  await p.evaluate(async c => { await abrirFicha(c); }, cB.id);
  await p.evaluate(kid => { casoSel = kid; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); }, kB.id);
  await p.waitForTimeout(500);
  await p.fill("#and-texto", `Cliente avisado. Verificar em ${br5(alvo)}.`);
  await p.waitForTimeout(200);
  conf("ao lado da data lida aparece '✔ e concluir por hoje'", !!(await p.$(".chip-desp")));
  await p.click(".chip-desp");
  await p.waitForTimeout(150);
  conf("ligado, a chave Tarefa se apaga", await p.evaluate(() => tfNatureza === null));
  conf("ligado, o chip diz 'volta à fila'", /volta à fila/.test(await p.textContent("#and-prazo-chip")));
  await p.screenshot({ path: path.join(OUT, "01-composer.png") });
  const nTar = T.andamento_tarefas.length;
  await p.evaluate(kid => novoAndamento(kid), kB.id);
  await p.waitForTimeout(1000);
  conf("registrar grava a anotação, a data como 'Concluir em' e apaga a ⭐", T.andamentos.some(a => a.caso_id === kB.id && /Cliente avisado/.test(a.texto))
    && kt(kB).prazo === alvo && kt(kB).importante === false && (kt(kB).ronda.despacho || {}).prazo === alvo);
  conf("e não cria o lembrete, que seria duplicado", T.andamento_tarefas.length === nTar);

  // 4 · "Feito" na menção
  await p.evaluate(() => { fecharFicha(false); visao = "mencoes"; render(); });
  await p.waitForTimeout(400);
  conf("a menção traz 'Ok' e 'Feito'", (await p.$$(".mencao .menc-resp")).length === 2);
  const nAnd = T.andamentos.length, nMenc = T.mencoes.length;
  await p.click('.mencao .menc-resp:has-text("Feito")');
  await p.waitForTimeout(800);
  const resp = T.andamentos.slice(nAnd).find(a => a.caso_id === kC.id);
  conf("a resposta entra no caso, em resposta à anotação do Marcos", resp && resp.texto === "@Marcos Feito." && resp.responde_a === aC.id);
  conf("o Marcos é avisado", T.mencoes.slice(nMenc).some(m => m.para_id === MARCOS && /respondeu "Feito\."/.test(m.texto)));
  conf("a menção sai da caixa", !!T.mencoes.find(m => m.andamento_id === aC.id && m.para_id === PAULO).lida_em && !(await p.$(".mencao .menc-resp")));

  // 5 · o prazo fatal avisa a 2 dias úteis, no Meu Dia de hoje
  await p.evaluate(([kid, d]) => { const k = D.casoPorId.get(kid); k.prazo = d; }, [kD.id, alvo]);
  const av = await p.evaluate(kid => itensAgenda(null).filter(i => i.k && i.k.id === kid).map(i => ({ data: i.data, selo: i.selo || "", fatal: !!i.fatal })), kD.id);
  conf("o prazo fatal continua no dia dele", av.some(i => i.fatal && i.data === alvo));
  conf("e ganha hoje o aviso 'Vence em 2 dias úteis'", av.some(i => i.data === new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10) && i.selo === "Vence em 2 dias úteis" && !i.fatal));
  const tres = await p.evaluate(() => { let d = hoje(); for (let i = 0; i < 20; i++) { d = somaDias(d, 1); if (uteisAte(d) === 3 && ehDiaUtil(d)) return d; } });
  await p.evaluate(([kid, d]) => { D.casoPorId.get(kid).prazo = d; }, [kD.id, tres]);
  conf("a 3 dias úteis não avisa", !(await p.evaluate(kid => itensAgenda(null).some(i => i.k && i.k.id === kid && /^Vence em/.test(i.selo || "")), kD.id)));

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
