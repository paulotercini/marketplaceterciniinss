// F544 · pedido do Paulo de 11.11.2026: quem escreveu edita a anotação; a versão anterior fica no histórico
// (andamentos_editados, gravado pelo gatilho do banco, aqui emulado). Pontua; passa acima de 95 de 100.
// Banco simulado, dados fictícios. Uso: node f544.js [pasta das capturas]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco, filtrar } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f544";
fs.mkdirSync(OUT, { recursive: true });

const PAULO = FIX.colaboradores[0].id, AMANDA = "22222222-2222-2222-2222-222222222222";
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais",
  "andamentos_apagados", "andamentos_editados"]) dados[t] = [];
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


// o gatilho andamento_editado (migracoes/f544_anotacoes_editadas.sql)
const responder = banco.responder.bind(banco);
let nEd = 0;
banco.responder = (m, url, h, corpo) => {
  const u = new URL(url);
  if (m === "PATCH" && u.pathname === "/rest/v1/andamentos") {
    const novo = typeof corpo === "string" ? JSON.parse(corpo || "{}") : (corpo || {});
    if ("texto" in novo) for (const a of filtrar(T().andamentos, [...u.searchParams.entries()]))
      if (a.texto !== novo.texto && ["app", "whatsapp"].includes(a.origem || "")) {
        T().andamentos_editados.push({ id: ++nEd, andamento_id: a.id, caso_id: a.caso_id, autor_id: a.autor_id, texto_antes: a.texto,
          editado_em: new Date().toISOString(), editado_por: PAULO });
        a.editado_em = new Date().toISOString();
        if (a.todo_sync && a.todo_texto_antes == null) a.todo_texto_antes = a.texto;
      }
  }
  return responder(m, url, h, corpo);
};

const dP = util(6);
const c1 = cli("Cliente Teste Editar");
const k1 = caso(c1, { beneficio: "Apos. por Idade", especie: "B41", fase: "judicial", processo: "50005695320264036314", prazo: iso(dP), todo_prazo: null });
const nN = and(k1, -2, "Telefonei para a cliente e combinei a entrega.");
const nO = and(k1, -3, "Conferi o cálculo da contadoria.", { autor_id: AMANDA });
const nP = and(k1, -1, `⏰ [PRAZO ${br(iso(dP))}] Apresentar a réplica.`);
tarefa(nP, { natureza: "fatal", lembrar_em: iso(dP) });
const nTodo = and(k1, -4, "Pedido de cópia integral feito.", { todo_sync: true });

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
  const botao = aid => p.evaluate(x => !!document.querySelector(`[onclick="editarAndamento('${x}')"]`), aid);
  const editar = async (aid, txt) => { banco.escritas.length = 0;
    await p.evaluate(x => document.querySelector(`[onclick="editarAndamento('${x}')"]`).click(), aid); await p.waitForTimeout(300);
    const val = await p.evaluate(() => document.getElementById("ed-and").value);
    await p.fill("#ed-and", txt); await p.click("#ed-and-ok"); await p.waitForTimeout(900); return val; };
  const modal = () => p.evaluate(() => { const m = document.getElementById("modal"); return m ? m.innerText : ""; });

  await abrir(c1);
  conf("a anotação própria tem Editar; a da Amanda não", await botao(nN.id) && !(await botao(nO.id)), 10);
  conf("o botão diz uma palavra", await p.evaluate(x => document.querySelector(`[onclick="editarAndamento('${x}')"]`).firstChild.textContent.trim(), nN.id) === "Editar", 5);

  const v1 = await editar(nN.id, "Telefonei para a cliente e combinei a entrega na sexta.");
  const a1 = T().andamentos.find(x => x.id === nN.id);
  conf("edita: PATCH só do texto, o novo texto no banco", v1 === "Telefonei para a cliente e combinei a entrega." && a1.texto === "Telefonei para a cliente e combinei a entrega na sexta."
    && banco.escritas.some(e => e.m === "PATCH" && e.t === "andamentos" && e.ids.includes(nN.id) && Object.keys(e.corpo).join() === "texto"), 15, { v1, t: a1.texto });
  conf("a versão anterior fica no histórico", T().andamentos_editados.some(x => x.andamento_id === nN.id && x.texto_antes === "Telefonei para a cliente e combinei a entrega."), 10);
  await abrir(c1);
  const tela = await p.evaluate(() => document.querySelector("#detalhe, body").innerText);
  conf("o cartão mostra o texto novo e o selo editada", /entrega na sexta/.test(tela) && !!(await p.evaluate(x => document.querySelector(`.tl-editada[onclick*="${x}"]`), nN.id)), 10);
  await foto("01-editada");
  await p.evaluate(x => document.querySelector(`.tl-editada[onclick*="${x}"]`).click(), nN.id); await p.waitForTimeout(400);
  conf("o selo abre as versões anteriores", /Versões anteriores/.test(await modal()) && /combinei a entrega\.\n?/.test(await modal()), 10, await modal());
  await p.evaluate(() => fecharCaixa());

  const v2 = await editar(nP.id, "Apresentar a réplica com o laudo.");
  const a2 = T().andamentos.find(x => x.id === nP.id);
  conf("no prazo, edita só o corpo e o carimbo fica", v2 === "Apresentar a réplica." && a2.texto === `⏰ [PRAZO ${br(iso(dP))}] Apresentar a réplica com o laudo.`, 15, { v2, t: a2.texto });

  await abrir(c1);
  await editar(nTodo.id, "Pedido de cópia integral feito no PAT.");
  const a3 = T().andamentos.find(x => x.id === nTodo.id);
  conf("a replicada no To Do guarda o texto antigo para a sincronização trocar o bloco", a3.todo_texto_antes === "Pedido de cópia integral feito.", 10, a3);

  await abrir(c1);
  await p.evaluate(x => verApagadas(x), k1.id); await p.waitForTimeout(500);
  const hist = await modal();
  conf("o histórico do caso lista as anotações editadas", /Anotações editadas/.test(hist) && /substituída por Paulo/.test(hist) && /Pedido de cópia integral feito\./.test(hist), 10, hist);
  await foto("02-historico");
  conf("sem erro de página", !erros.length, 5, erros.slice(0, 3));
  const total = pts.reduce((t, x) => t + x[2], 0), feitos = pts.filter(x => x[1]).reduce((t, x) => t + x[2], 0);
  console.log(`pontuação ${Math.round(feitos * 1000 / total) / 10} de 100 (${feitos}/${total} pontos)`);
  await nav.close(); s.close();
  process.exit(feitos * 100 / total > 95 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
