// F246 · Trouxe documentos (pedido do Paulo, 19.10.2026): a cliente de três frentes deixa papéis no balcão; a janela
// junta o que cada caso pediu (📄 do caso e o pedido do atendimento), a recepção marca o que chegou e cada papel vai ao
// caso que o pediu, com a juntada, a baixa, a menção ao advogado responsável, a perícia e o prazo; o papel do cliente
// vale para todos; o não pedido ganha sugestão ou fica a classificar; a exigência oferece "cumprida".
// Banco simulado e dados fictícios. Uso: node f246.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f246";
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
const base = { protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {}, marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {},
  importante: false, urgente: false, dcb_prorrogacao_pedida: false, criado_em: ts(-200) };

const C = { id: id("c"), nome: "Marlene Ficta Duarte", cpf: null, telefone: null, telefones: [], criado_em: ts(-400),
  campos: { advogado_id: MARCOS, docs_pedidos: [{ em: ts(-5), quem: "Amanda", especie: "BPC/LOAS", precaso_id: "pc_m1", itens: [{ nome: "Laudo do neurologista", entregue: null }, { nome: "RG", entregue: null }] }] } };
T.clientes.push(C);
const kJ = { id: id("b"), cliente_id: C.id, titulo: C.nome, especie: "B31", beneficio: "Aux. Incapacidade Temporária", fase: "judicial", origem_lista: "👪 Judicial", ...base };
const kI = { id: id("b"), cliente_id: C.id, titulo: C.nome, especie: "B41", beneficio: "Apos. por Idade", fase: "inss", origem_lista: "🌻 INSS", exigencia_prazo: iso(20), exigencia_descricao: "Apresentar a CTPS", ...base };
const kP = { id: id("b"), cliente_id: C.id, titulo: "", fase: "escritorio", pre_caso: true, beneficio: "BPC/LOAS", origem_lista: "🙋 Escritório", precaso: { id: "pc_m1", em: iso(-6) }, ...base };
T.casos.push(kJ, kI, kP);
for (const k of [kJ, kI, kP]) T.atribuicoes.push({ caso_id: k.id, colaborador_id: PAULO });
const t1 = { id: id("7"), cliente_id: C.id, caso_id: kJ.id, titulo: "📄 Relatório médico atualizado", prazo: iso(1), concluida: false, criado_em: ts(-3) };
const t2 = { id: id("7"), cliente_id: C.id, caso_id: kJ.id, titulo: "📄 Eletroneuromiografia nova", prazo: iso(1), concluida: false, criado_em: ts(-3) };
const t3 = { id: id("7"), cliente_id: C.id, caso_id: kI.id, titulo: "📄 CTPS da tecelagem", prazo: iso(10), concluida: false, criado_em: ts(-10) };
T.tarefas.push(t1, t2, t3);
T.eventos.push({ id: id("d"), caso_id: kJ.id, tipo: "Perícia médica", status: "agendada", data_hora: `${iso(9)}T09:00:00`, local: "JEF", criado_em: ts(-20) });
T.andamentos.push({ id: id("e"), caso_id: kJ.id, autor_id: PAULO, texto: "Laudo juntado; pedir relatório novo.", origem: "app", criado_em: ts(-3), excluir: false, importante: false, urgente: false, responde_a: null });

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
  await p.evaluate(async ([cid, kid]) => { await abrirFicha(cid); casoSel = kid; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); }, [C.id, kJ.id]);
  await p.waitForTimeout(900);
  await p.evaluate(() => fecharCaixa());   // a janela "qual processo?" de quem tem vários casos
  const andsDe = k => T.andamentos.filter(a => a.caso_id === k.id).map(a => a.texto);

  // 1 · a janela junta o que cada frente pediu
  await p.click(".td-abrir");
  await p.waitForSelector(".td");
  const g = await p.evaluate(() => [...document.querySelectorAll(".td-g")].map(x => [x.querySelector(".td-selo").textContent, [...x.querySelectorAll(".td-nm b")].map(b => b.textContent)]));
  await p.screenshot({ path: path.join(OUT, "01-janela.png") });
  const grupo = r => (g.find(([s]) => r.test(s)) || [null, []])[1];
  conf(`o Judicial traz os dois papéis do checklist (${grupo(/B31/).join(", ")})`, grupo(/B31/).join() === "Relatório médico atualizado,Eletroneuromiografia nova");
  conf("o INSS traz a CTPS", grupo(/B41/).join() === "CTPS da tecelagem");
  conf("o atendimento traz o pedido do pré-caso", grupo(/^Atendimento/).join() === "Laudo do neurologista");
  conf("o RG vai para 'Do cliente · todos os casos'", grupo(/Do cliente/).join() === "RG");

  // 2 · marca, escreve um papel não pedido (sugestão) e um a classificar
  for (const n of ["Relatório médico atualizado", "CTPS da tecelagem", "RG", "Laudo do neurologista"]) await p.click(`.td-it:has-text("${n}")`);
  await p.fill("#td-outro-txt", "Receita do ortopedista");
  await p.waitForSelector("#td-outro-dest", { state: "visible" });
  conf("o papel médico não pedido sugere o caso de incapacidade", await p.evaluate(k => document.getElementById("td-outro-dest").value === k, kJ.id));
  await p.click(".td-outro .btn-mini");
  await p.fill("#td-outro-txt", "Papel sem nome");
  await p.waitForSelector("#td-outro-dest", { state: "visible" });
  await p.selectOption("#td-outro-dest", "naosei");
  await p.click(".td-outro .btn-mini");
  const vai = await p.textContent(".td-pe span");
  await p.screenshot({ path: path.join(OUT, "02-marcado.png") });
  conf(`o pé diz para onde vai cada coisa (${vai.replace(/\s+/g, " ").trim()})`, /B31 · Judicial \(3\)/.test(vai) && /B41 · INSS \(2\)/.test(vai) && /a classificar \(1\)/.test(vai));

  // 3 · registrar
  const nMenc = T.mencoes.length;
  await p.click(".td-reg");
  await p.waitForTimeout(1500);
  const jJ = andsDe(kJ).find(t => /^Juntada/.test(t)) || "", jI = andsDe(kI).find(t => /^Juntada/.test(t)) || "", jP = andsDe(kP).find(t => /^Juntada/.test(t)) || "";
  conf(`a juntada do Judicial tem os papéis dele, a perícia e o aviso (${jJ})`, /Relatório médico atualizado/.test(jJ) && /Receita do ortopedista/.test(jJ) && /RG/.test(jJ) && /Levar na perícia de/.test(jJ) && /@Marcos/.test(jJ));
  conf(`a juntada do INSS tem a CTPS, o RG e o prazo da exigência (${jI})`, /CTPS da tecelagem/.test(jI) && /RG/.test(jI) && new RegExp(`Prazo do caso: ${iso(20).split("-").reverse().join("/")}`).test(jI));
  conf("a juntada do atendimento vai à linha do pré-caso", /Laudo do neurologista/.test(jP));
  conf("o checklist baixa só o que chegou", T.tarefas.find(t => t.id === t1.id).concluida && T.tarefas.find(t => t.id === t3.id).concluida && !T.tarefas.find(t => t.id === t2.id).concluida);
  const ped = T.clientes.find(c => c.id === C.id).campos.docs_pedidos[0].itens;
  conf("o pedido do atendimento ganha a data da entrega (o laudo e o RG)", ped.every(i => i.entregue === iso(0)));
  conf("o advogado responsável é avisado por menção", T.mencoes.slice(nMenc).filter(m => m.para_id === MARCOS).length >= 3);
  conf("o papel sem caso fica a classificar, com a pergunta", (T.clientes.find(c => c.id === C.id).campos.a_classificar || []).length === 1 && T.andamentos.some(a => /^A classificar: Papel sem nome/.test(a.texto) && a.importante));

  // 4 · a exigência do INSS oferece 'cumprida'
  conf("o caso em exigência oferece 'Exigência cumprida'", await p.evaluate(() => /Exigência cumprida · B41/.test(((document.getElementById("modal") || {}).textContent) || "")));
  await p.click('#modal .esp-it:has-text("Exigência cumprida")');
  await p.waitForTimeout(800);
  conf("um clique marca a exigência como cumprida", !T.casos.find(k => k.id === kI.id).exigencia_prazo);

  // 5 · o papel a classificar aparece no caso, com um botão por caso
  await p.evaluate(async ([cid, kid]) => { await abrirFicha(cid); casoSel = kid; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); }, [C.id, kJ.id]);
  await p.waitForTimeout(900);
  await p.evaluate(() => fecharCaixa());
  await p.screenshot({ path: path.join(OUT, "03-classificar.png") });
  conf("o caso mostra o papel a classificar", await p.evaluate(() => /a classificar/.test((document.querySelector(".td-classif") || {}).textContent || "")));
  await p.click('.td-classif .btn-mini:has-text("B41")');
  await p.waitForTimeout(1000);
  conf("classificar leva a anotação ao caso escolhido e tira o aviso", T.andamentos.find(a => /^A classificar: Papel sem nome/.test(a.texto)).caso_id === kI.id
    && !(T.clientes.find(c => c.id === C.id).campos.a_classificar || []).length);

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
