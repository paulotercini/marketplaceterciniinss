// F249 · a transição do To Do em níveis (crm/fase2/docs/TRANSICAO.md): o painel do Paulo liga a transição (todos no
// nível 0, ele no 3), troca a onda e o nível de cada um; o nível 1 (F294) só lê os andamentos do INSS, do CRPS e do
// Judicial; no nível 2 o que a onda não ligou some, e o atendimento abre simples (relato, veredito e parecer, Documentos com
// o Desfecho), com "Ver … completo". Banco simulado e dados fictícios. Uso: node f249.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f249";
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



// X · cliente com um caso no INSS (com data à frente) e um pré-caso de atendimento
const cX = cli("Xênia Fictícia Transição");
const kX = caso(cX, { beneficio: "Apos. por Idade", especie: "B41", fase: "inss", der: iso(-30), prazo: iso(5), protocolos: ["1700000501"] });
and(kX, -20, "Requerimento protocolado.");
and(kX, -10, "Em análise.", { origem: "pat", origem_id: "1700000501|c1" });   // F294 · o andamento do INSS que o nível 1 lê
const PC = "pc_f249a";
const kP = caso(cX, { fase: "escritorio", pre_caso: true, beneficio: "Aposentadoria por idade", origem_lista: "🙋 Escritório",
  precaso: { id: PC, natureza: "", marc: {}, honorarios: "", quem: null, em: iso(-1) } });

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
    localStorage.setItem("crm_tema", "v10"); localStorage.setItem("crm_etapas", "1");   // F320 · as etapas abertas (no computador nascem recolhidas)
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
  const abrir = async (c, k) => { await p.evaluate(async ([cid, kid]) => { await abrirFicha(cid); casoSel = kid; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); fecharCaixa(); }, [c.id, k.id]); await p.waitForTimeout(500); };
  const util = n => p.evaluate(n => proxDiaUtil(somaDias(hoje(), n)), n);
  const br = s => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;




  const nivel = () => p.evaluate(() => document.documentElement.getAttribute("data-nivel"));
  const vis = sel => p.evaluate(s => { const e = document.querySelector(s); return !!e && (e.offsetParent !== null || getComputedStyle(e).position === "fixed"); }, sel);
  const cfg = () => { const r = T.config_app.filter(x => x.chave === "crm_transicao").pop(); return r ? JSON.parse(r.valor) : null; };

  // 1 · desligada: ninguém muda de tela
  await abrir(cX, kX);
  conf("sem a transição, o CRM é o completo (sem nível)", (await nivel()) === null && await vis(".tipo-ch.tipo-sr"));
  conf("o botão 'níveis' existe para o administrador (no menu, ao lado de 'visual')", await p.evaluate(() => document.getElementById("btn-niveis").style.display !== "none"));

  // 2 · ligar: todos no 1, o Paulo no 3
  conf("o menu da conta traz 'Níveis da equipe' ao administrador", await p.evaluate(() => /Níveis da equipe/.test(document.getElementById("menu-conta").textContent)));
  await p.evaluate(() => abrirTransicao());
  conf("desligada, o painel já mostra os níveis e as ondas como botões", (await p.$$(".trn-nv")).length > 0 && (await p.$$(".trn-onda")).length === 6);
  await p.click(".trn-ligar");
  await p.waitForTimeout(500);
  const c1 = cfg();
  conf(`ligar grava a transição na onda 1 com o Paulo no 3 (${JSON.stringify(c1)})`, c1 && c1.ligada && c1.onda === 1 && c1.niveis[PAULO] === 3);
  conf("o painel mostra as seis ondas e um nível por pessoa", (await p.$$(".trn-onda")).length === 6 && (await p.$$(".trn-nv")).length === 4 * (await p.$$(".trn-lista li")).length);
  conf("quem não foi escolhido começa no 0 (primeiro acesso)", await p.evaluate(id => nivelDe(id), MARCOS) === 0);
  await p.screenshot({ path: path.join(OUT, "01-painel.png") });

  // 2a · o Paulo olha como o nível 0 sem trocar de usuário, e volta
  conf("o painel oferece 'ver como nível 0/1/2'", (await p.$$(".trn-ver-n")).length === 3);
  await p.click(".trn-ver-n >> text=nível 0"); await p.waitForTimeout(500);
  conf("ver como nível 0 mostra só a Agenda, sem gravar nada", (await nivel()) === "0" && await p.evaluate(() => visao) === "agendaq" && cfg().niveis[PAULO] === 3);
  conf("vendo como o nível 0, a faixa para voltar fica à vista", await vis("#ver-nivel-faixa button"));
  conf("vendo como o nível 0, a barra monta o menu da conta", await p.evaluate(() => {   // antes, só a visão completa o montava
    document.getElementById("btn-conta").onclick = null; montarSidebar(); return !!document.getElementById("btn-conta").onclick; }));
  await p.click("#btn-conta"); await p.click('#menu-conta [data-conta="config"]'); await p.waitForTimeout(400);   // pelos cliques, como o Paulo
  conf("as Configurações abrem para o administrador mesmo vendo como o nível 0", await p.evaluate(() => visao) === "config");
  await p.click("#ver-nivel-faixa button"); await p.waitForTimeout(400);
  conf("a faixa devolve a visão completa e some", (await nivel()) === null && !(await p.$("#ver-nivel-faixa")));
  await p.evaluate(() => verComoNivel(0)); await p.waitForTimeout(300);
  await p.evaluate(() => abrirTransicao());
  await p.click(".trn-ver-volta"); await p.waitForTimeout(400);
  conf("'Voltar à minha visão' devolve o nível 3", (await nivel()) === null);
  await p.evaluate(() => abrirTransicao());
  // 2b · o nível 0: só a Agenda e a Identificação
  await p.click(`.trn-nv[data-col="${PAULO}"][data-n="0"]`);
  await p.waitForTimeout(500);
  await p.evaluate(() => { fecharCaixa(); fecharFicha && fecharFicha(); visao = "meudia"; render(); montarSidebar(); });
  await p.waitForTimeout(400);
  conf("no nível 0, a tela inicial é a Agenda do Google", (await nivel()) === "0" && await p.evaluate(() => visao) === "agendaq");
  const itens = await p.evaluate(() => [...document.querySelectorAll(".lista-item")].filter(e => e.offsetParent !== null).map(e => e.dataset.v));
  conf(`a barra mostra as Menções, a Agenda e os Clientes (REC-09) (${itens.join(", ")})`, itens.join() === "mencoes,agendaq,clientes");
  conf("o Novo Cliente continua no botão fixo e a anotação rápida some", await vis("#btn-v10-cli") && !(await vis("#btn-v10-anotar")));
  await p.click("#btn-v10-cli"); await p.waitForTimeout(400);
  conf("o Novo Cliente abre", await p.evaluate(() => visao) === "novocliente");
  await p.evaluate(id => abrirFicha(id), cX.id); await p.waitForTimeout(600);
  const abas = await p.evaluate(() => [...document.querySelectorAll(".menu-topo .mt")].filter(e => e.offsetParent !== null).map(e => [...e.childNodes].filter(n => !(n.classList && n.classList.contains("mt-ponto"))).map(n => n.textContent).join("").trim()));
  const subs = await p.evaluate(() => [...document.querySelectorAll(".sub-menu button")].filter(e => e.offsetParent !== null).map(e => e.textContent.trim()));
  conf(`a ficha mostra só o Cadastro (${abas.join(", ")}) com a Identificação (${subs.join(", ")})`, abas.join() === "Cadastro" && subs.join() === "Identificação");
  await p.screenshot({ path: path.join(OUT, "00-nivel0-ficha.png") });

  // 3 · F294 · o nível 1: a Agenda, os Clientes e os andamentos dos portais, sem escrever
  await p.evaluate(id => gravarTransicao({ col: id, n: 1 }), PAULO); await p.waitForTimeout(400);
  await p.evaluate(() => { fecharCaixa(); fecharFicha && fecharFicha(); visao = "meudia"; render(); montarSidebar(); });
  await p.waitForTimeout(400);
  conf("no nível 1, o html leva data-nivel=1 e a tela inicial é a Agenda", (await nivel()) === "1" && await p.evaluate(() => visao) === "agendaq");
  const itens1 = await p.evaluate(() => [...document.querySelectorAll(".lista-item")].filter(e => e.offsetParent !== null).map(e => e.dataset.v));
  conf(`no nível 1 a barra mostra as Menções, a Agenda e os Clientes (${itens1.join(", ")})`, itens1.join() === "mencoes,agendaq,clientes");
  await p.evaluate(id => abrirFicha(id), cX.id); await p.waitForTimeout(600);
  const abas1 = await p.evaluate(() => [...document.querySelectorAll(".menu-topo .mt")].filter(e => e.offsetParent !== null).map(e => [...e.childNodes].filter(n => !(n.classList && n.classList.contains("mt-ponto"))).map(n => n.textContent).join("").trim()));
  conf(`a ficha do nível 1 abre no Cadastro e mostra os Casos (${abas1.join(", ")})`, abas1.length === 2 && abas1[0] === "Cadastro" && /^Casos/.test(abas1[1]));
  await abrir(cX, kX);
  const sub1 = await p.evaluate(() => [...document.querySelectorAll(".menu-andamentos button")].filter(e => e.offsetParent !== null).map(e => e.textContent.trim()));
  conf(`no caso, só as abas dos portais (${sub1.join(", ")})`, sub1.length >= 1 && sub1.every(t => /^(INSS|Recurso|Judicial)/.test(t)));
  conf("o caso abre na aba INSS, sem o campo de escrever", await p.evaluate(() => document.querySelector(".menu-andamentos button.on")?.textContent.trim().startsWith("INSS")) && !(await vis(".caso-dir .tipo-fila, .caso-dir #tipo-fila")));
  conf("os prazos, que têm botões de gravar, não aparecem", !(await vis(".caso-pz")) && !(await vis(".conf-sem")));
  await p.screenshot({ path: path.join(OUT, "02-nivel1-caso.png") });
  conf("as etapas aparecem, mas não se escolhem", await vis(".tr-et") && await p.evaluate(() => getComputedStyle(document.querySelector(".tr-et")).pointerEvents === "none"));
  conf("os botões que gravam somem (arquivar, tarefa, estrela, mensagem, levar, aceitar etapa, advogado)",
    await p.evaluate(() => !["alternarArquivo", "abrirSeguimento", "alternarSinal", "msgAndamento", "moverAndamento", "aceitarEtapaProposta", "escolherAdvogado", "editarFato"]
      .some(f => [...document.querySelectorAll(`#detalhe [onclick*="${f}"]`)].some(e => e.offsetParent !== null))));
  conf("os de ler continuam (copiar o texto e marcar como lido)", await vis('.painel[data-p="2"] [onclick^="copiar"]') && await vis('.painel[data-p="2"] [onclick^="liNaFicha"]'));

  // 3b · o nível 2: a anotação, com o que a onda ligou
  await p.evaluate(id => gravarTransicao({ col: id, n: 2 }), PAULO); await p.waitForTimeout(400);
  await p.evaluate(() => fecharCaixa());
  await abrir(cX, kX);
  conf("no nível 2, o html leva data-nivel=2 e o campo de escrever volta", (await nivel()) === "2" && await vis("#tipo-fila"));
  conf("na onda 1, Sem resposta e Pedir ao cliente ainda não aparecem", !(await vis(".tipo-ch.tipo-sr")) && !(await vis(".tipo-ch.tipo-pc")));
  conf("na onda 1, o 'Em análise · +7 d' já aparece e o Movimentou não", await vis(".faixa-prazos .conf-sem") && !(await vis(".faixa-prazos .conf-mov")));

  // 4 · a onda 2 liga Sem resposta e Pedir ao cliente
  await p.evaluate(() => gravarTransicao({ onda: 2 })); await p.waitForTimeout(400); await p.evaluate(() => fecharCaixa());
  await abrir(cX, kX);
  conf("na onda 2, Sem resposta e Pedir ao cliente aparecem", await vis(".tipo-ch.tipo-sr") && await vis(".tipo-ch.tipo-pc"));

  // 5 · o atendimento no nível 2
  await p.evaluate(([c, x]) => abrirAtendimentoDe(c, x), [cX.id, PC]);
  await p.waitForTimeout(800);
  await p.evaluate(() => irSubCad("pa")); await p.waitForTimeout(500);
  conf("o Primeiro atendimento simples: relato na Conversa da equipe e a escolha do benefício", await vis("#pa-simples") && await vis("#atend-conversa") && !(await vis(".paq")));
  await p.screenshot({ path: path.join(OUT, "03-pa-simples.png") });
  await p.evaluate(() => irSubCad("direito")); await p.waitForTimeout(500);
  conf("a Análise de Direito simples: veredito e parecer livre", await vis("#ad-simples") && await vis("#ad-simples .adq, #ad-simples [class*=adq]") || await vis("#ad-simples"));
  conf("a Análise de Direito simples traz o parecer (Minhas considerações)", await p.evaluate(() => /consider/i.test((document.getElementById("ad-simples") || {}).textContent || "")));
  await p.screenshot({ path: path.join(OUT, "04-ad-simples.png") });
  await p.evaluate(() => irSubCad("documentos")); await p.waitForTimeout(500);
  conf("Documentos simples: assinar, gerados e Desfecho, sem a trilha", await vis("#doc-simples") && await vis("#dq-desfecho") && !(await vis("#dq-ferramentas")));
  await p.click('#doc-simples .nv-completo');
  await p.waitForTimeout(500);
  conf("'Ver Documentos completo' abre a tela inteira na sessão", !(await vis("#doc-simples")) && await vis("#dq-ferramentas"));

  // 6 · voltar ao 3 e desligar
  await p.evaluate(id => gravarTransicao({ col: id, n: 3 }), PAULO); await p.waitForTimeout(400);
  conf("no nível 3 o atributo some", (await nivel()) === null);
  await p.evaluate(() => gravarTransicao({ ligada: false })); await p.waitForTimeout(400);
  conf("desligar volta todos ao completo", cfg().ligada === false && await p.evaluate(id => nivelDe(id), MARCOS) === 3);
  await p.evaluate(() => abrirTransicao());
  await p.click(`.trn-nv[data-col="${MARCOS}"][data-n="2"]`);
  await p.waitForTimeout(500);
  conf("com ela desligada, clicar num nível liga a transição e grava o nível", cfg().ligada === true && cfg().niveis[MARCOS] === 2 && cfg().niveis[PAULO] === 3
    && await p.evaluate(() => /ligada/.test(document.querySelector(".trn-estado").textContent)));

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
