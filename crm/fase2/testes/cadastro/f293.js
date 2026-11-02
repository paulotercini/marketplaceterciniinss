// F293 · Onda C do fluxo do To Do (29.10.2026): imprimir e separar o papel para o cliente retirar (anotação, tarefa
// de quem imprime e "para entregar" na ficha), o parente que também é cliente no alto da ficha, com o que ele tem
// marcado, e o ↗ que copia o CPF e abre o Meu INSS. Banco simulado e dados fictícios.
// Uso: node f293.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f293";
fs.mkdirSync(OUT, { recursive: true });

const PAULO = FIX.colaboradores[0].id, MARCOS = "22222222-2222-2222-2222-222222222222", MEISSA = "33333333-3333-3333-3333-333333333333";
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: [...FIX.colaboradores, { id: MARCOS, auth_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", nome: "Marcos Fictício", inicial: "M",
    cor: "#8a4b00", papel: "colaborador", ativo: true, cargo: "advogado" },
    { id: MEISSA, auth_id: "cccccccc-cccc-cccc-cccc-cccccccccccc", nome: "Meissa Fictícia", inicial: "ME", cor: "#2b7a4b", papel: "colaborador", ativo: true, cargo: "recepcao" }],
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




// A · filho, com caso; B · mãe, também cliente, com prazo fatal amanhã
const cA = cli("Rodrigo Fictício Filho"); cA.cpf = "52998224725";
const kA = caso(cA, { beneficio: "Aux. Incapacidade Temporária", especie: "B31", fase: "inss", protocolos: ["1700000501"] });
const cB = cli("Rosmeire Fictícia Mãe");
const kB = caso(cB, { beneficio: "Apos. por Idade", especie: "B41", fase: "inss", protocolos: ["1700000502"], prazo: iso(1) });
T.vinculos.push({ id: id("v"), cliente_id: cA.id, ligado_a: cB.id, relacao: "mãe" });

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
  const hj = iso(0);

  await p.evaluate(async c => { await abrirFicha(c); }, cA.id);
  await p.waitForTimeout(500);

  // 1 · o parente que também é cliente, no alto da ficha, com o que ele tem marcado
  const par = await p.$eval(".det-topo .chip-parente", b => ({ t: b.textContent, tit: b.title, tem: b.classList.contains("tem") }));
  conf("a mãe que também é cliente aparece no alto da ficha", /Rosmeire · mãe/.test(par.t));
  conf("e avisa que ela também tem o que fazer (prazo de amanhã)", par.tem && /também tem/.test(par.t) && /Aproveite a visita/.test(par.tit));

  // 2 · o ↗ do Meu INSS copia o CPF e abre o portal
  await p.evaluate(() => { window._abriu = []; window.open = (u) => { window._abriu.push(u); return null; }; window._copiou = []; window.copiar = (t) => window._copiou.push(t); });
  await p.click(".det-topo .entrar-inss");
  const mi = await p.evaluate(() => ({ abriu: window._abriu, copiou: window._copiou }));
  conf("o ↗ ao lado do Meu INSS abre o portal e copia o CPF", mi.abriu.some(u => /meu\.inss\.gov\.br/.test(u)) && mi.copiou.includes("52998224725"));

  // 3 · imprimir e separar para o cliente
  conf("o ⋯ da ficha oferece 'Imprimir e separar para o cliente'", await p.evaluate(() => !!document.querySelector(".det-topo .sep-abrir")));
  await p.evaluate(c => separarParaCliente(c), cA.id);
  await p.waitForSelector(".sep-mod");
  conf("quem imprime já vem na recepção (Meissa)", /Meissa/.test(await p.textContent(".desp-quem .btn-mini.on")));
  await p.click("#sep-ok");
  conf("sem papel escolhido, não separa", /Escolha o papel/.test(await p.textContent("#aviso")));
  await p.check(".sep-mod");
  await p.fill("#sep-outro", "Pedido para Médico Assistente");
  await p.screenshot({ path: path.join(OUT, "01-separar.png") });
  const nAnex = T.anexos.length, nAnd = T.andamentos.length, nTf = T.andamento_tarefas.length, nMenc = T.mencoes.length;
  await p.click("#sep-ok");
  await p.waitForTimeout(1000);
  const an = T.anexos.slice(nAnex)[0], and = T.andamentos.slice(nAnd).find(a => a.caso_id === kA.id), tf = T.andamento_tarefas.slice(nTf)[0];
  conf("o modelo vira documento guardado em Documentos", an && an.origem === "gerado" && /Procuração/.test(an.nome) && an.caso_id === kA.id);
  conf("a anotação diz o que separar, quem imprime e até quando", and && /Separar para Rodrigo/.test(and.texto) && /Procuração; Pedido para Médico Assistente/.test(and.texto) && /@Meissa/.test(and.texto));
  conf("a Meissa recebe a tarefa para hoje", tf && tf.colaborador_id === MEISSA && tf.lembrar_em === hj && tf.natureza === "compromisso" && tf.andamento_id === and.id);
  conf("e a menção", T.mencoes.slice(nMenc).some(m => m.para_id === MEISSA));
  const cAt = () => T.clientes.find(c => c.id === cA.id);
  conf("a ficha guarda o que está na pasta", (cAt().campos.entregar || []).length === 1);
  await p.waitForTimeout(300);
  conf("o alto da ficha mostra '1 para entregar'", /1 para entregar/.test(await p.textContent(".det-topo .chip-entregar")));
  await p.screenshot({ path: path.join(OUT, "02-ficha.png") });

  // 4 · o cliente retira no balcão
  await p.click(".det-topo .chip-entregar");
  await p.waitForSelector(".sep-ent");
  conf("a janela traz o documento para abrir e imprimir", /abrir para imprimir/.test(await p.textContent(".sep-ent")));
  const nAnd2 = T.andamentos.length;
  await p.click('.sep-ent .btn-mini:has-text("Entregue")');
  await p.waitForTimeout(800);
  const ent = T.andamentos.slice(nAnd2).find(a => a.caso_id === kA.id);
  conf("Entregue grava a entrega no caso, em resposta ao pedido", ent && /Entregue no balcão/.test(ent.texto) && ent.responde_a === and.id);
  conf("conclui a tarefa de quem imprimiu e tira da ficha", !!T.andamento_tarefas.find(x => x.id === tf.id).concluida_em && !(cAt().campos.entregar || []).length && !(await p.$(".det-topo .chip-entregar")));

  // 5 · o clique no parente abre a ficha dele
  await p.click(".det-topo .chip-parente");
  await p.waitForTimeout(500);
  conf("o clique no parente abre a ficha da mãe", await p.evaluate(c => clienteAberto === c, cB.id));

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
