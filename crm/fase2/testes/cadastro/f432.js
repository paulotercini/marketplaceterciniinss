// F432 · pedido do Paulo de 07.11.2026: quem escreveu apaga a anotação ou o prazo; sai das anotações e fica no
// histórico do caso (andamentos_apagados, gravado pelo gatilho do banco, aqui emulado), com quem apagou e quando.
// O prazo apagado leva junto a data do caso, salvo a do Microsoft To Do e a de outro carimbo vivo.
// Pontua; passa acima de 95 de 100. Banco simulado, dados fictícios. Uso: node f432.js [pasta das capturas]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco, filtrar } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f432";
fs.mkdirSync(OUT, { recursive: true });

const PAULO = FIX.colaboradores[0].id, AMANDA = "22222222-2222-2222-2222-222222222222";
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais",
  "andamentos_apagados"]) dados[t] = [];
Object.assign(dados, { colaboradores: [...FIX.colaboradores, { id: AMANDA, auth_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", nome: "Amanda Fictícia",
  inicial: "A", cor: "#c99a06", papel: "membro", ativo: true, atende_zap: true, cargo: "advogado", setor: null }],
  clientes: [], casos: [], atribuicoes: [], documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = () => banco.t;
const iso = n => new Date(Date.now() - 3 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
const br = d => d.split("-").reverse().join(".");
const ts = (n, h = "12:00") => `${iso(n)}T${h}:00-03:00`;
const util = n => { let k = n; while ([0, 6].includes(new Date(iso(k) + "T12:00:00").getDay())) k++; return k; };
let seq = 0;
const id = p => `${p}0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const cli = nome => { const c = { id: id("c"), nome, cpf: null, telefone: null, campos: { advogado_id: PAULO }, telefones: [], criado_em: ts(-400) }; T().clientes.push(c); return c; };
const caso = (c, o) => { const k = { id: id("b"), cliente_id: c.id, titulo: c.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
  marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, dcb_prorrogacao_pedida: false, origem_lista: "👪 Judicial",
  criado_em: ts(-300), ...o }; T().casos.push(k); T().atribuicoes.push({ caso_id: k.id, colaborador_id: PAULO }); return k; };
const and = (k, n, texto, o = {}) => { const a = { id: id("e"), caso_id: k.id, autor_id: PAULO, texto, origem: "app", origem_id: null, criado_em: ts(n),
  publico: false, excluir: false, importante: false, urgente: false, responde_a: null, todo_sync: false, ...o }; T().andamentos.push(a);
  T().andamentos_lidos.push({ andamento_id: a.id, colaborador_id: PAULO }); return a; };
const tarefa = (a, o = {}) => { const t = { id: id("f"), andamento_id: a.id, caso_id: a.caso_id, colaborador_id: PAULO, atribuido_por: PAULO,
  lembrar_em: iso(-2), natureza: "compromisso", papel: "executa", concluida_em: null, iniciada_em: null, etapas: [], criado_em: a.criado_em, ...o };
  T().andamento_tarefas.push(t); return t; };

// o gatilho andamento_apagado (migracoes/f432_anotacoes_apagadas.sql) e o ON DELETE CASCADE de andamento_tarefas
const responder = banco.responder.bind(banco);
let semTabela = false, nHist = 0;
banco.responder = (m, url, h, corpo) => {
  const u = new URL(url);
  if (semTabela && u.pathname === "/rest/v1/andamentos_apagados")
    return { status: 404, contentType: "application/json", body: JSON.stringify({ code: "42P01", message: "relation does not exist" }) };
  if (m !== "DELETE" || u.pathname !== "/rest/v1/andamentos") return responder(m, url, h, corpo);
  const alvo = filtrar(T().andamentos, [...u.searchParams.entries()]);
  for (const a of alvo) if (["app", "whatsapp"].includes(a.origem || ""))
    T().andamentos_apagados.push({ id: ++nHist, andamento_id: a.id, caso_id: a.caso_id, autor_id: a.autor_id, origem: a.origem, origem_id: a.origem_id,
      responde_a: a.responde_a, texto: a.texto, criado_em: a.criado_em, apagado_em: new Date().toISOString(), apagado_por: a.excluir ? a.autor_id : PAULO,
      tarefas: T().andamento_tarefas.filter(t => t.andamento_id === a.id)
        .map(t => ({ colaborador_id: t.colaborador_id, natureza: t.natureza, papel: t.papel, lembrar_em: t.lembrar_em, concluida_em: t.concluida_em })) });
  const r = responder(m, url, h, corpo), ids = new Set(alvo.map(a => a.id));
  banco.t.andamento_tarefas = T().andamento_tarefas.filter(t => !ids.has(t.andamento_id));
  return r;
};

// 1 · caso judicial com prazo do CRM, uma anotação comum, uma da Amanda e uma já replicada no To Do
const dP = util(6);
const c1 = cli("Ana Fictícia Apagar");
const k1 = caso(c1, { beneficio: "Apos. por Idade", especie: "B41", fase: "judicial", processo: "50005695320264036314", prazo: iso(dP), todo_prazo: null });
const nP = and(k1, -1, `⏰ [PRAZO ${br(iso(dP))}] Apresentar a réplica.`);
const tP = tarefa(nP, { natureza: "fatal", lembrar_em: iso(dP) });
const nN = and(k1, -2, "Telefonei para a cliente e combinei a entrega dos documentos.");
const nO = and(k1, -3, "Conferi o cálculo da contadoria.", { autor_id: AMANDA });
const nTodo = and(k1, -4, "Pedido de cópia integral do processo feito.", { todo_sync: true });
// 2 · a data do caso é a do Microsoft To Do: apagar o carimbo não a tira
const c2 = cli("Bruno Fictício To Do");
const k2 = caso(c2, { beneficio: "Pensão por morte", especie: "B21", fase: "judicial", processo: "50002223320264036314", prazo: iso(util(9)), todo_prazo: iso(util(9)) });
const nP2 = and(k2, -1, `⏰ [PRAZO ${br(iso(util(9)))}] Contrarrazões.`);
// 3 · caso sem nada apagado
const c3 = cli("Carla Fictícia Vazia");
const k3 = caso(c3, { beneficio: "BPC Idoso", especie: "B88", fase: "inss", protocolos: ["1700000901"], origem_lista: "🌻 INSS" });
// 4 · dois carimbos da mesma data: apagar um não tira a data do caso
const c4 = cli("Daniel Fictício Dois");
const dQ = util(11);
const k4 = caso(c4, { beneficio: "Apos. Especial", especie: "B46", fase: "judicial", processo: "50003330020264036314", prazo: iso(dQ), todo_prazo: null });
const nQ1 = and(k4, -1, `⏰ [PRAZO ${br(iso(dQ))}] Especificar provas.`);
and(k4, -2, `⏰ [PRAZO ${br(iso(dQ))}] Juntar o PPP.`);

const pts = [];
const conf = (nome, v, peso, info) => { pts.push([nome, !!v, peso]); console.log((v ? "PASSOU  " : "FALHOU  ") + `[${peso}] ` + nome + (v || info === undefined ? "" : "  → " + JSON.stringify(info).slice(0, 300))); };

(async () => {
  const s = http.createServer((q, r) => { r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(path.join(__dirname, "app.html"))); }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(([u, ss]) => { localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss)); localStorage.setItem("crm_tema", "v10"); }, [SUPA, SESSAO]);
  await instalarBanco(ctx, { SUPA, SESSAO, banco });
  const p = await ctx.newPage();
  const erros = [], dialogos = [];
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => { dialogos.push(d.message()); d.accept(); });
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await p.waitForTimeout(600);
  const foto = n => p.screenshot({ path: path.join(OUT, n + ".png") });
  const abrir = async c => { await p.evaluate(async x => { await abrirFicha(x); const m = document.getElementById("modal"); if (m) m.style.display = "none"; }, c.id); await p.waitForTimeout(700); };
  const botao = aid => p.evaluate(x => !!document.querySelector(`[onclick^="apagarAndamento('${x}'"]`), aid);
  const apagar = async aid => { banco.escritas.length = 0; dialogos.length = 0;
    await p.evaluate(x => document.querySelector(`[onclick^="apagarAndamento('${x}'"]`).click(), aid); await p.waitForTimeout(900); };
  const naTela = aid => p.evaluate(x => !!document.querySelector(`[onclick*="'${x}'"]`), aid);
  const patchPrazo = k => banco.escritas.some(e => e.m === "PATCH" && e.t === "casos" && e.ids.includes(k.id) && "prazo" in e.corpo);
  const linhasDia = async c => { await p.evaluate(() => { visao = "planejado"; render(); }); await p.waitForTimeout(500);
    return p.evaluate(x => [...document.querySelectorAll(`.ag-linha[data-cli="${x}"]`)].map(l => l.textContent), c.id); };

  // ── 1. quem pode apagar (5) ─────────────────────────────────────────────
  await abrir(c1);
  conf("a anotação própria tem Apagar; a da Amanda não", await botao(nN.id) && !(await botao(nO.id)), 5);
  conf("o ⋯ do caso tem Apagadas", await p.evaluate(x => !!document.querySelector(`.lc-apagadas[onclick*="${x}"]`), k1.id), 5);
  await foto("01-ficha");

  // ── 2. a anotação comum (15) ────────────────────────────────────────────
  await apagar(nN.id);
  const h1 = T().andamentos_apagados.find(x => x.andamento_id === nN.id);
  conf("apaga a anotação: DELETE, sem mexer na data do caso, no histórico com quem apagou e fora da tela",
    banco.escritas.some(e => e.m === "DELETE" && e.t === "andamentos" && e.ids.includes(nN.id)) && !patchPrazo(k1)
    && h1 && h1.apagado_por === PAULO && h1.texto === nN.texto && !(await naTela(nN.id)), 15, { h1, d: dialogos });
  conf("a pergunta da anotação diz que ela fica no histórico", /anotação/i.test(dialogos[0] || "") && /histórico/.test(dialogos[0] || ""), 3, dialogos);

  // ── 3. o prazo (30) ─────────────────────────────────────────────────────
  const antes = await linhasDia(c1);
  await abrir(c1);
  await apagar(nP.id);
  conf("a pergunta do prazo diz que sai do quadro Prazos e fica no histórico", /prazo/i.test(dialogos[0] || "") && /Prazos/.test(dialogos[0] || "") && /histórico/.test(dialogos[0] || ""), 5, dialogos);
  const h2 = T().andamentos_apagados.find(x => x.andamento_id === nP.id);
  conf("apaga o prazo: a data do caso sai (PATCH prazo nulo), a anotação sai e as tarefas vão ao histórico",
    banco.escritas.some(e => e.m === "PATCH" && e.t === "casos" && e.ids.includes(k1.id) && e.corpo.prazo === null)
    && T().casos.find(k => k.id === k1.id).prazo === null && !T().andamento_tarefas.some(t => t.id === tP.id)
    && h2 && h2.tarefas.length === 1 && h2.tarefas[0].natureza === "fatal", 15, { h2 });
  const depois = await linhasDia(c1);
  conf("o Planejado deixa de mostrar a réplica", antes.some(t => /réplica/i.test(t)) && !depois.some(t => /réplica/i.test(t)), 10, { antes, depois });
  await foto("02-planejado");

  // ── 4. a anotação já replicada no To Do (10) ────────────────────────────
  await abrir(c1);
  await apagar(nTodo.id);
  conf("a replicada no To Do é marcada (excluir) e não apagada aqui: a sincronização tira o texto do To Do e apaga",
    banco.escritas.some(e => e.m === "PATCH" && e.t === "andamentos" && e.ids.includes(nTodo.id) && e.corpo.excluir === true)
    && !banco.escritas.some(e => e.m === "DELETE"), 10);

  // ── 5. as datas que não se apagam (15) ──────────────────────────────────
  await abrir(c2);
  await apagar(nP2.id);
  conf("a data do Microsoft To Do fica no caso", !patchPrazo(k2) && banco.escritas.some(e => e.m === "DELETE" && e.ids.includes(nP2.id)), 10);
  await abrir(c4);
  await apagar(nQ1.id);
  conf("com outro carimbo vivo da mesma data, a data fica", !patchPrazo(k4) && banco.escritas.some(e => e.m === "DELETE" && e.ids.includes(nQ1.id)), 5);

  // ── 6. o histórico (25) ─────────────────────────────────────────────────
  await abrir(c1);
  await p.evaluate(x => verApagadas(x), k1.id);
  await p.waitForTimeout(500);
  const hist = await p.evaluate(() => { const m = document.getElementById("modal"); return m ? m.innerText : ""; });
  conf("Anotações apagadas lista o prazo e a anotação, com quem apagou", /Anotações apagadas/.test(hist) && /Apresentar a réplica/.test(hist)
    && /Telefonei para a cliente/.test(hist) && /apagada por Paulo/.test(hist) && /Escrita por Paulo/.test(hist), 10, hist);
  conf("o prazo apagado diz que tinha o prazo fatal de quem fazia, com a data", new RegExp(`Tinha: prazo fatal de Paulo para ${br(iso(dP))}`).test(hist), 5, hist);
  conf("a replicada no To Do aparece como apagada, com o aviso de que o texto ainda consta lá",
    /Pedido de cópia integral/.test(hist) && /ainda consta no Microsoft To Do/.test(hist), 5, hist);
  conf("o mais recente vem primeiro", hist.indexOf("Apresentar a réplica") < hist.indexOf("Telefonei para a cliente"), 3);
  await foto("03-historico");
  await p.evaluate(x => verApagadas(x), k3.id);
  await p.waitForTimeout(400);
  conf("o caso sem nada apagado diz que não há", /Nenhuma anotação apagada/.test(await p.evaluate(() => document.getElementById("modal").innerText)), 4);
  semTabela = true;
  await p.evaluate(() => { const m = document.getElementById("modal"); if (m) m.style.display = "none"; });
  await p.evaluate(x => verApagadas(x), k1.id);
  await p.waitForTimeout(400);
  conf("sem a tabela no banco, avisa e não quebra", /ainda não está disponível/.test(await p.evaluate(() => (document.getElementById("aviso") || {}).textContent || "")), 3);

  conf("sem erro de página", !erros.length, 5, erros.slice(0, 3));
  const total = pts.reduce((t, x) => t + x[2], 0), feitos = pts.filter(x => x[1]).reduce((t, x) => t + x[2], 0);
  console.log(`pontuação ${Math.round(feitos * 1000 / total) / 10} de 100 (${feitos}/${total} pontos)`);
  await nav.close(); s.close();
  process.exit(feitos * 100 / total > 95 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
