// F429 · decisões do Paulo de 07.11.2026: (1) o CRM do administrador lança ao carregar os prazos do assistente
// ("⏳ Prazo: … até dd/mm/aaaa") de todos os clientes, sem esperar a ficha, com desfazer; (2) o "Concluir em" do
// Microsoft To Do não é prazo fatal nem no 🗓 Tarefas com Prazo: fatal é o que o CRM anotou (carimbo ou tarefa fatal).
// Pontua; passa acima de 95 de 100. Banco simulado, dados fictícios. Uso: node f429.js [pasta das capturas]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f429";
fs.mkdirSync(OUT, { recursive: true });

const PAULO = FIX.colaboradores[0].id;
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: [...FIX.colaboradores], clientes: [], casos: [], atribuicoes: [], documentos_beneficio: FIX.documentos_beneficio || [],
  modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;
const iso = n => new Date(Date.now() - 3 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
const br = d => d.split("-").reverse().join(".");
const bar = d => d.split("-").reverse().join("/");
const ts = (n, h = "12:00") => `${iso(n)}T${h}:00-03:00`;
const util = n => { let k = n; while ([0, 6].includes(new Date(iso(k) + "T12:00:00").getDay())) k++; return k; };
let seq = 0;
const id = p => `${p}0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const cli = nome => { const c = { id: id("c"), nome, cpf: null, telefone: null, campos: { advogado_id: PAULO }, telefones: [], criado_em: ts(-400) }; T.clientes.push(c); return c; };
const caso = (c, o) => { const k = { id: id("b"), cliente_id: c.id, titulo: c.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
  marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, dcb_prorrogacao_pedida: false, origem_lista: "👪 Judicial",
  criado_em: ts(-300), ...o }; T.casos.push(k); T.atribuicoes.push({ caso_id: k.id, colaborador_id: PAULO }); return k; };
const and = (k, n, texto, o = {}) => { const a = { id: id("e"), caso_id: k.id, autor_id: PAULO, texto, origem: "app", origem_id: null, criado_em: ts(n),
  publico: false, excluir: false, importante: false, urgente: false, responde_a: null, ...o }; T.andamentos.push(a);
  T.andamentos_lidos.push({ andamento_id: a.id, colaborador_id: PAULO }); return a; };
const tarefa = (a, o = {}) => { const t = { id: id("f"), andamento_id: a.id, caso_id: a.caso_id, colaborador_id: PAULO, atribuido_por: PAULO,
  lembrar_em: iso(-2), natureza: "compromisso", papel: "executa", concluida_em: null, iniciada_em: null, etapas: [], criado_em: a.criado_em, ...o };
  T.andamento_tarefas.push(t); return t; };
const mcp = () => ({ origem_id: "mcp:" + id("m") });

// A · dois casos de um cliente que ninguém abriu: o caso sem prazo ganha a data; o que tem prazo fica com o seu
const dA = util(6), dB = util(20);
const cA = cli("Ana Fictícia Assistente");
const kA = caso(cA, { beneficio: "Apos. por Idade", especie: "B41", fase: "judicial", processo: "50005695320264036314" });
const nTf = and(kA, -6, "Conferir o ofício requisitório de RPV 20269999192P e manifestar-se se houver erro.", mcp());
const tA = tarefa(nTf);
const nA = and(kA, 0, `🧭 Avaliação do caso: o ato ordinatório foi publicado.\n⏳ Prazo: conferência do ofício de RPV 20269999192P, 5 dias da publicação de ${bar(iso(-1))}, até ${bar(iso(dA))} (PJe)`, mcp());
const origA = new Map();   // os objetos do banco simulado mudam com o PATCH: guarda o texto da primeira carga
const kA2 = caso(cA, { beneficio: "Auxílio por incapacidade", especie: "B31", fase: "inss", protocolos: ["1700000901"], origem_lista: "🌻 INSS", prazo: iso(util(3)) });
const nA2 = and(kA2, 0, `🧭 Avaliação do caso: indeferido.\n⏳ Prazo: recurso à Junta de Recursos até ${bar(iso(dB))} (PAT)`, mcp());
// B · o que não se lança: estimativa, anotação humana, anotação antiga vencida, caso encerrado, a já desfeita
for (const a of [nA, nA2]) origA.set(a.id, a.texto);
const cB = cli("Bruno Fictício Nada");
const kB = caso(cB, { beneficio: "Pensão por morte", especie: "B21", fase: "judicial", processo: "50002223320264036314" });
const nEst = and(kB, -1, `🧭 Avaliação.\n⏳ Prazo: contrarrazões, estimativa ${bar(iso(util(9)))} (despacho)`, mcp());
const nHum = and(kB, -1, `Anotei: ⏳ Prazo: algo até ${bar(iso(util(8)))}`);
const nVelha = and(kB, -40, `🧭 Avaliação antiga.\n⏳ Prazo: exigência até ${bar(iso(-25))} (carta)`, mcp());
const kEnc = caso(cB, { beneficio: "BPC Idoso", especie: "B88", fase: "encerrado", processo: "50001110020264036314" });
const nEnc = and(kEnc, -1, `🧭 Encerrado.\n⏳ Prazo: recurso até ${bar(iso(util(10)))}`, mcp());
const kFora = caso(cB, { beneficio: "Apos. Especial", especie: "B46", fase: "judicial", processo: "50003330020264036314" });
const nFora = and(kFora, -1, `🧭 Desfeita.\n⏳ Prazo: réplica até ${bar(iso(util(12)))}`, mcp());
kFora.ronda = { pz_ass_fora: [nFora.id] };
// C · a ficha aberta durante a carga lança os seus ao abrir, e a carga não repete
const cC = cli("Carla Fictícia Aberta");
const kC = caso(cC, { beneficio: "BPC Deficiente", especie: "B87", fase: "judicial", processo: "50003334420264036314" });
const nC = and(kC, -1, `Laudo juntado.\n⏳ Prazo: manifestação sobre o laudo pericial, 15 dias úteis, até ${bar(iso(util(14)))}.`, mcp());
// D · o To Do: a data do To Do no Tarefas com Prazo é retorno; o carimbo e a tarefa fatal do CRM a fazem fatal
const cD = cli("Daniel Fictício To Do");
const TP = "🗓 Tarefas com Prazo";
const kD1 = caso(cD, { beneficio: "Apos. por Idade", especie: "B41", fase: "outro", origem_lista: TP, processo: "50004445520264036314", prazo: iso(util(4)), todo_prazo: iso(util(4)) });
and(kD1, -2, "(P): intimados para réplica, 15 dias.", { origem: "todo" });
const kD2 = caso(cD, { beneficio: "Apos. Especial", especie: "B46", fase: "outro", origem_lista: TP, processo: "50004445620264036314", prazo: iso(util(5)), todo_prazo: iso(util(5)) });
and(kD2, -2, `⏰ [PRAZO ${br(iso(util(5)))}] Apresentar a réplica.`);
const kD3 = caso(cD, { beneficio: "Pensão por morte", especie: "B21", fase: "outro", origem_lista: TP, processo: "50004445720264036314", prazo: iso(util(7)), todo_prazo: iso(util(7)) });
tarefa(and(kD3, -2, "Interpor a apelação."), { natureza: "fatal", lembrar_em: iso(util(7)) });
const kD4 = caso(cD, { beneficio: "BPC Idoso", especie: "B88", fase: "outro", origem_lista: TP, processo: "50004445820264036314", prazo: iso(util(8)), todo_prazo: null });

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
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await p.waitForTimeout(600);
  const foto = n => p.screenshot({ path: path.join(OUT, n + ".png") });
  const lin = aid => banco.escritas.filter(e => e.m === "PATCH" && e.t === "andamentos" && (e.ids || []).includes(aid));
  const carimbou = (a, d) => lin(a.id).some(e => String(e.corpo.texto).startsWith(`⏰ [PRAZO ${br(iso(d))}] 🧭`));

  // ── 1. a carga lança os prazos do assistente (45) ───────────────────────
  const fonte = fs.readFileSync(path.join(__dirname, "app.html"), "utf8");
  conf("a carga do administrador chama o lançamento, uma vez, fora do navegador automatizado",
    /souAdmin\(\) && !navigator\.webdriver && !window\._pzAssLancados[\s\S]{0,200}lancarPrazosAssistente\(\)/.test(fonte), 3);
  await p.evaluate(async c => { await abrirFicha(c); const m = document.getElementById("modal"); if (m) m.style.display = "none"; }, cC.id);
  await p.waitForTimeout(900);
  const naFicha = lin(nC.id).length;
  banco.escritas.length = 0;
  const n = await p.evaluate(async () => { await fecharFicha(false); clienteAberto = null; return 0; }).then(() => p.evaluate(() => lancarPrazosAssistente()));
  await p.waitForTimeout(400);
  conf("lança os dois prazos do cliente que ninguém abriu", n === 2 && carimbou(nA, dA) && carimbou(nA2, dB), 12, { n });
  conf("o caso sem prazo ganha a data; o que já tinha prazo fica com o seu",
    banco.escritas.some(e => e.m === "PATCH" && e.t === "casos" && e.ids.includes(kA.id) && e.corpo.prazo === iso(dA))
    && !banco.escritas.some(e => e.m === "PATCH" && e.t === "casos" && e.ids.includes(kA2.id) && "prazo" in e.corpo), 8);
  conf("a tarefa que a anotação cita (a RPV) passa à anotação do prazo",
    banco.escritas.some(e => e.m === "PATCH" && e.t === "andamento_tarefas" && e.ids.includes(tA.id) && e.corpo.andamento_id === nA.id), 6);
  conf("estimativa, anotação humana, anotação vencida antiga, caso encerrado e a já desfeita não se lançam",
    ![nEst, nHum, nVelha, nEnc, nFora].some(a => lin(a.id).length), 8);
  conf("a ficha aberta lança os seus ao abrir, e a carga não repete", naFicha === 1 && !lin(nC.id).length, 4, { naFicha });
  const av = await p.evaluate(() => (document.getElementById("aviso") || {}).textContent || "");
  conf("o aviso diz quantos foram lançados e oferece desfazer", /2 prazos do assistente lançados/.test(av) && /desfazer/i.test(av), 4, av);

  // ── 2. o Planejado mostra o prazo novo com do que é (15) ────────────────
  await p.evaluate(() => { visao = "planejado"; render(); });
  await p.waitForFunction(id => [...document.querySelectorAll(`.ag-linha[data-cli="${id}"] .ag-oque`)].some(l => /ofício/.test(l.textContent)), cA.id, { timeout: 6000 }).catch(() => {});
  const md = await p.evaluate(id => [...document.querySelectorAll(`.ag-linha[data-cli="${id}"]`)].map(l => l.textContent), cA.id);
  conf("o Planejado traz o prazo fatal lançado, dito pela linha do assistente", md.some(t => /prazo fatal/i.test(t) && /[Cc]onferência do ofício de RPV/.test(t)), 8, md);
  conf("a tarefa citada, agora na anotação do prazo, diz do que é pela linha do prazo, e não pela avaliação",
    md.some(t => /05\/11|\d{2}\/\d{2}/.test(t) && /[Cc]onferência do ofício/.test(t) && !/prazo fatal/i.test(t)) && !md.some(t => /ato ordinatório foi publicado/.test(t)), 3, md);
  await foto("01-planejado");
  // a segunda carga não lança de novo
  banco.escritas.length = 0;
  const n2 = await p.evaluate(() => lancarPrazosAssistente());
  conf("a segunda carga não lança de novo", n2 === 0 && !banco.escritas.some(e => e.m === "PATCH" && e.t === "andamentos"), 4, { n2 });

  // ── 3. o desfazer (15) ──────────────────────────────────────────────────
  banco.escritas.length = 0;
  for (const a of [nA, nA2]) T.andamentos.find(x => x.id === a.id).texto = origA.get(a.id);   // a primeira carga, de novo, para desfazer
  T.casos.find(k => k.id === kA.id).prazo = null; T.andamento_tarefas.find(t => t.id === tA.id).andamento_id = nTf.id;
  await p.evaluate(([ka, ta, og]) => { D.casoPorId.get(ka).prazo = null; for (const t of [...D.tarefasPorCaso.values()].flat()) if (t.id === ta) t.andamento_id = og; }, [kA.id, tA.id, nTf.id]);
  const n3 = await p.evaluate(() => lancarPrazosAssistente());
  banco.escritas.length = 0;
  await p.evaluate(() => desfazerAgora());
  await p.waitForTimeout(600);
  const kAdb = T.casos.find(k => k.id === kA.id), kA2db = T.casos.find(k => k.id === kA2.id);
  conf("o desfazer devolve os textos, tira a data do caso e devolve a tarefa", n3 === 2
    && lin(nA.id).some(e => !/^⏰/.test(e.corpo.texto)) && lin(nA2.id).some(e => !/^⏰/.test(e.corpo.texto)) && kAdb.prazo === null
    && T.andamento_tarefas.find(t => t.id === tA.id).andamento_id === nTf.id, 8, { n3 });
  conf("o desfeito fica marcado e a carga seguinte não o lança", ((kAdb.ronda || {}).pz_ass_fora || []).includes(nA.id) && ((kA2db.ronda || {}).pz_ass_fora || []).includes(nA2.id)
    && await p.evaluate(() => lancarPrazosAssistente()) === 0, 7);

  // ── 4. o To Do não é prazo fatal (20) ───────────────────────────────────
  const r = await p.evaluate(ks => ks.map(k => prazoEhRetorno(D.casoPorId.get(k))), [kD1.id, kD2.id, kD3.id, kD4.id]);
  conf("a data do To Do no Tarefas com Prazo, sem anotação de prazo do CRM, é retorno", r[0] === true, 6, r);
  conf("com o carimbo [PRAZO] do CRM na mesma data, é prazo fatal", r[1] === false, 4, r);
  conf("com a tarefa fatal do CRM na mesma data, é prazo fatal", r[2] === false, 4, r);
  conf("a data posta pelo CRM no Tarefas com Prazo (sem o To Do) continua prazo fatal", r[3] === false, 3, r);
  await p.evaluate(() => irPara("meudia"));
  await p.waitForTimeout(700);
  const mdD = await p.evaluate(id => [...document.querySelectorAll(`.ag-linha[data-cli="${id}"]`)].map(l => l.textContent), cD.id);
  conf("no Meu Dia a data do To Do não traz a frase da anotação do To Do", !mdD.some(t => /intimados/.test(t)), 3, mdD);
  await foto("02-todo");

  conf("sem erro de página", !erros.length, 5, erros.slice(0, 3));
  const total = pts.reduce((t, x) => t + x[2], 0), feitos = pts.filter(x => x[1]).reduce((t, x) => t + x[2], 0);
  console.log(`pontuação ${Math.round(feitos * 1000 / total) / 10} de 100 (${feitos}/${total} pontos)`);
  await nav.close(); s.close();
  process.exit(feitos * 100 / total > 95 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
