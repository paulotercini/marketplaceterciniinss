// F251 · a agenda testada como colaboradora: a Ingrid (colaboradora, nível 0 da transição) entra no CRM, cai na Agenda,
// vê as vagas do Google ("001 - Livre (anote o telefone)") no tom de cada tipo, agenda um primeiro atendimento numa vaga,
// edita um atendimento lançado à mão, remarca, cancela (a vaga volta com o título original), agenda um cliente do
// escritório numa vaga 002, olha o Marcos (só as vagas dele, nos tons de verde) e a agenda Completa, e abre um cliente
// pela lista Clientes (só a Identificação). O Apps Script é o Code.gs DE VERDADE, num Google Agenda simulado
// (google-simulado.js). Banco simulado e dados fictícios. Uso: node f251.js [pasta das fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const { criarGoogle, proximo, quando } = require("./google-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f251";
fs.mkdirSync(OUT, { recursive: true });

const INGRID = "33333333-3333-3333-3333-333333333333", AUTH_I = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const SESSAO_I = { ...SESSAO, user: { id: AUTH_I, email: "ingrid@exemplo.invalido" } };
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: [...FIX.colaboradores, { id: INGRID, auth_id: AUTH_I, nome: "Ingrid Fictícia", inicial: "I", cor: "#8a4b00",
    papel: "colaborador", ativo: true, cargo: "recepcao" }],
  clientes: [{ id: "c0000000-0000-4000-8000-000000000001", nome: "Ana Fictícia Colab", cpf: "52998224725", telefone: "(16) 99999-0001", campos: {}, telefones: [], criado_em: "2026-01-01T12:00:00Z" },
    { id: "c0000000-0000-4000-8000-000000000002", nome: "Bruno Fictício Lista", cpf: null, telefone: null, campos: {}, telefones: [], criado_em: "2026-01-01T12:00:00Z" },
    { id: "c0000000-0000-4000-8000-000000000003", nome: "Clara Fictícia Índice", cpf: null, telefone: null, campos: {}, telefones: [], criado_em: "2026-01-01T12:00:00Z" },
    { id: "c0000000-0000-4000-8000-000000000004", nome: "Élio Fictício Acento", cpf: null, telefone: null, campos: {}, telefones: [], criado_em: "2026-01-01T12:00:00Z" },
    { id: "c0000000-0000-4000-8000-000000000005", nome: "3M Fictícia Empresa", cpf: null, telefone: null, campos: { e_cliente: true }, telefones: [], criado_em: "2026-01-01T12:00:00Z" }],
  casos: [], atribuicoes: [], documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento,
  config_app: [...(FIX.config_app || []), { chave: "crm_transicao", valor: JSON.stringify({ ligada: true, onda: 1, niveis: {} }) }] });
const banco = new Banco(dados);
const T = banco.t;

// o Google Agenda: a quarta do Paulo (vagas sem cor, como o escritório faz), um atendimento lançado à mão, o almoço,
// e o Marcos (sálvia, um dos verdes) com um atendimento e uma vaga
const W = proximo(3);
const ev = (id, s, ini, fim, cor) => ({ id, summary: s, start: quando(W, ini), end: quando(W, fim), ...(cor ? { colorId: cor } : {}) });
const LIVRE = t => `${t} - Livre (anote o telefone)`;
const google = criarGoogle({ tokens: { "tok-ingrid": { nome: "Ingrid", papel: "equipe" } }, eventos: [
  ev("P1", LIVRE("001"), "09:00", "09:45"), ev("P2", LIVRE("002"), "09:45", "10:15"),
  ev("P3", "002 - Rafael Fictício - Não confirmado", "10:15", "10:45"), ev("ALM", "Almoço", "12:30", "13:30"),
  ev("P4", LIVRE("001"), "13:30", "14:15"),
  ev("M1", "002 - Michelle Fictícia - Confirmado", "09:00", "09:30", "2"), ev("M2", "LIVRE 09:30-10:00", "09:30", "10:00", "2"),
  // a Amanda (banana) escreve o horário livre como "LIVRE 09h30-10h00", sem o código, como no Google do escritório
  ev("A1", "LIVRE 10h00-10h30", "10:00", "10:30", "5")] });
const evG = id => google.eventos.find(e => e.id === id) || {};

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
    localStorage.setItem("crm_agenda_token", "tok-ingrid");
  }, [SUPA, SESSAO_I]);
  await instalarBanco(ctx, { SUPA, SESSAO: SESSAO_I, banco });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await ctx.route(/script\.google\.com/, r => {
    const corpo = JSON.parse(r.request().postData() || "{}");
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(google.post(corpo)) });
  });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  const vis = sel => p.evaluate(x => { const e = document.querySelector(x); return !!e && e.offsetParent !== null; }, sel);
  const foto = n => p.screenshot({ path: path.join(OUT, n + ".png"), fullPage: true });
  const recarregar = async () => { await p.evaluate(async () => { await carregarAgenda(); pintarAgenda(); }); await p.waitForTimeout(300); };

  // 1 · a entrada da colaboradora
  await p.waitForSelector(".aq-faixa", { timeout: 15000 });
  conf("a colaboradora entra no nível 0 e cai direto na Agenda", await p.evaluate(() => meuNivel() === 0 && visao === "agendaq"));
  const itens = await p.evaluate(() => [...document.querySelectorAll(".lista-item")].filter(e => e.offsetParent !== null).map(e => e.dataset.v));
  conf(`o menu tem só Agenda e Clientes (${itens.join(", ")})`, itens.join() === "agendaq,clientes");
  conf("sem o título vazio das listas do escritório", !(await vis(".grupo:has(#grupo-fases) h3")));
  const profs = await p.$$eval("[data-aqprof]", b => b.map(x => x.dataset.aqprof));
  conf(`dá para ver Paulo, Marcos, Amanda e a Completa (${profs.join(", ")})`, profs.join() === "paulo,marcos,amanda,todos");
  // F250g · as agendas do Marcos e da Amanda carregam em segundo plano: a troca é imediata
  conf("com a agenda do Paulo aberta, as do Marcos e da Amanda já carregam em segundo plano",
    await p.waitForFunction(() => agq.cache.marcos && agq.cache.amanda, null, { timeout: 8000 }).then(() => true, () => false));
  await p.click(`[data-aqdia="${W}"]`);
  const vagas = await p.$$eval(".aq-vaga", b => b.map(x => [x.dataset.aqvaga, x.className]));
  conf(`na quarta do Paulo aparecem as 3 vagas dele (${vagas.map(v => v[0]).join(", ")})`, vagas.map(v => v[0]).join() === "P1,P2,P4");
  conf("as vagas estão no tom do Paulo e do tipo", vagas.every(([, c]) => /p-paulo/.test(c)) && /t001/.test(vagas[0][1]) && /t002/.test(vagas[1][1]));
  conf("a vaga do Marcos e o atendimento dele não aparecem na agenda do Paulo", !(await p.$('[data-aqvaga="M2"]')) && !(await p.$('[data-aqev="M1"]')));
  conf("o atendimento lançado à mão (sem cor) aparece como do Paulo, no tom do 002", await p.evaluate(() => { const e = document.querySelector('[data-aqev="P3"]'); return !!e && e.classList.contains("p-paulo") && e.classList.contains("t002"); }));
  conf("o dia conta 1 atendimento (a vaga não conta)", /1\/14/.test(await p.textContent(`[data-aqdia="${W}"]`)));
  await foto("01-quarta-do-paulo");

  // 2 · primeiro atendimento numa vaga 001
  await p.click('.aq-vaga[data-aqvaga="P1"]');
  await p.waitForSelector("#aq-busca");
  await p.evaluate(() => { window._jan = document.querySelector(".aq-fluxo"); });
  await p.type("#aq-busca", "Novo Ficticio Cliente", { delay: 20 });
  conf("digitar o nome não repinta a janela nem perde o cursor", await p.evaluate(() => document.querySelector(".aq-fluxo") === window._jan && document.activeElement.id === "aq-busca"));
  await p.click("[data-aqnovo]");
  await p.waitForSelector("#aq-tel");
  conf("o nome digitado já vem no cadastro do primeiro atendimento", (await p.inputValue("#aq-nome")) === "Novo Ficticio Cliente");
  await p.fill("#aq-tel", "16999990009");
  await p.click("#aq-seg2");
  await p.waitForSelector('[data-aqacomp="nao"]');
  await p.click('[data-aqacomp="nao"]'); await p.click("#aq-seg4");
  await p.waitForSelector("#aq-seg5");
  conf("o horário já vem escolhido na vaga clicada", await p.evaluate(() => fluxo.inicio === "09:00" && fluxo.eventoId === "P1" && !document.getElementById("aq-seg5").disabled));
  await p.click("#aq-seg5");
  await p.check("#aq-o1"); await p.check("#aq-o2");
  await p.click("#aq-gravar");
  await p.waitForSelector(".aq-whats", { timeout: 10000 });
  conf(`a vaga vira o atendimento no próprio evento (${evG("P1").summary})`, evG("P1").summary === "001 - Novo Ficticio Cliente - Não confirmado");
  const novo = T.clientes.find(c => c.nome === "Novo Ficticio Cliente");
  conf("o pré-cadastro nasce no CRM e o evento leva o cliente", !!novo && ((evG("P1").extendedProperties || {}).private || {}).clienteId === novo.id);
  await foto("02-agendado");
  await p.evaluate(() => fecharCaixa());
  await recarregar();
  conf("na agenda, o horário agendado fica no tom do 001 e a vaga sai da lista", await p.evaluate(() => { const e = document.querySelector('[data-aqev="P1"]'); return !!e && e.classList.contains("t001") && !document.querySelector('.aq-vaga[data-aqvaga="P1"]'); }));

  // 3 · Editar o atendimento lançado à mão
  await p.click('[data-aqev="P3"]');
  const ops = await p.$$eval(".aq-menu [data-aqop]", b => b.map(x => x.dataset.aqop));
  conf(`o atendimento lançado à mão oferece Editar (${ops.join(", ")})`, ops[0] === "editar");
  await p.click('.aq-menu [data-aqop="editar"]');
  await p.fill("#aq-ed-nome", "Rafael Fictício Souza");
  await p.fill("#aq-ed-tel", "16988887777");
  await p.click("#aq-ed-salvar"); await p.waitForTimeout(500);
  conf(`editar troca o nome e guarda o telefone (${evG("P3").summary})`, evG("P3").summary === "002 - Rafael Fictício Souza - Não confirmado"
    && /Telefone: 16988887777/.test(evG("P3").description || ""));
  await recarregar();

  // 4 · Remarcar para outra vaga 001
  await p.click('[data-aqev="P1"]');
  await p.click('.aq-menu [data-aqop="remarcar"]');
  await p.waitForSelector('[data-aqhora="13:30"]');
  await p.click('[data-aqhora="13:30"]');
  await p.click("#aq-seg5");
  await p.waitForSelector(".aq-whats", { timeout: 10000 });
  conf(`remarcar ocupa a vaga nova (${evG("P4").summary})`, evG("P4").summary === "001 - Novo Ficticio Cliente - Não confirmado");
  conf(`e devolve a antiga com o título original (${evG("P1").summary})`, evG("P1").summary === LIVRE("001"));
  await p.evaluate(() => fecharCaixa());
  await recarregar();

  // 5 · Cancelar: a vaga volta
  await p.click('[data-aqev="P4"]');
  await p.click('.aq-menu [data-aqop="cancelar"]'); await p.waitForTimeout(600);
  conf(`cancelar devolve a vaga com o título original (${evG("P4").summary})`, evG("P4").summary === LIVRE("001") && !((evG("P4").extendedProperties || {}).private || {}).clienteId);
  await recarregar();
  conf("e ela volta à lista de vagas", !!(await p.$('.aq-vaga[data-aqvaga="P4"]')));

  // 6 · cliente do escritório numa vaga 002
  await p.click('.aq-vaga[data-aqvaga="P2"]');
  await p.type("#aq-busca", "Ana Fic", { delay: 20 });
  await p.click("[data-aqcli]");
  await p.click("#aq-seg2");
  await p.waitForSelector('[data-aqacomp="nao"]');
  await p.click('[data-aqacomp="nao"]'); await p.click("#aq-seg4");
  await p.click("#aq-seg5");
  await p.waitForSelector("#aq-aviso002"); // F306 · no 002 é aviso, sem caixa
  await p.click("#aq-gravar");
  await p.waitForSelector(".aq-whats", { timeout: 10000 });
  conf(`cliente do escritório na vaga 002 (${evG("P2").summary})`, evG("P2").summary === "002 - Ana Fictícia Colab - Não confirmado");
  await p.evaluate(() => fecharCaixa());

  // 7 · a agenda do Marcos e a Completa
  await p.click('[data-aqprof="marcos"]');
  conf("trocar para o Marcos mostra a agenda dele na hora, sem esperar o Google", await p.evaluate(() => agq.disp && agq.disp.profissional === "marcos" && !!document.querySelector(".aq-faixa")));
  await p.waitForFunction(() => agq.disp && agq.disp.profissional === "marcos", null, { timeout: 10000 });
  await p.click(`[data-aqdia="${W}"]`);
  const vm = await p.$$eval(".aq-vaga", b => b.map(x => [x.dataset.aqvaga, x.className]));
  conf(`na agenda do Marcos só a vaga dele, nos tons de verde (${vm.map(v => v[0]).join(", ")})`, vm.length === 1 && vm[0][0] === "M2" && /p-marcos/.test(vm[0][1]));
  conf("o atendimento do Marcos (sálvia) é dele e as vagas do Paulo não aparecem", await p.evaluate(() => { const e = document.querySelector('[data-aqev="M1"]'); return !!e && e.classList.contains("p-marcos") && !document.querySelector('[data-aqvaga="P4"]'); }));
  conf("o almoço é só do Paulo: não aparece na agenda do Marcos", !/Almoço/.test(await p.textContent(".aq-tempo")) && !(await p.$(".aq-almoco")));
  await foto("03-marcos");
  conf("a vaga LIVRE do Marcos diz \"Livre · 30 min\"", /Livre · 30 min/.test(await p.textContent('.aq-vaga[data-aqvaga="M2"]')));
  // F250h · dia sem vaga no Google (como o 23/10 do Marcos): nenhum horário, em vez dos horários calculados
  const semVaga = await p.evaluate(d => agq.disp.dias.filter(x => x.data !== d && !x.bloqueado).every(x => !(x.livres["001"] || []).length && !(x.livres["002"] || []).length), W);
  conf("nos dias do Marcos sem vaga no Google não aparece horário nenhum", semVaga);
  // a Amanda: a vaga LIVRE, um primeiro atendimento nela e o cancelamento
  await p.click('[data-aqprof="amanda"]');
  await p.waitForFunction(() => agq.disp && agq.disp.profissional === "amanda", null, { timeout: 10000 });
  await p.click(`[data-aqdia="${W}"]`);
  conf("a vaga LIVRE da Amanda aparece tracejada nos tons de amarelo", await p.evaluate(() => { const v = document.querySelector('.aq-vaga[data-aqvaga="A1"]'), t = document.querySelector('.aq-ev-vaga[data-aqvaga="A1"]');
    return !!v && v.classList.contains("p-amanda") && !!t && t.classList.contains("p-amanda"); }));
  await p.click('.aq-vaga[data-aqvaga="A1"]');
  await p.type("#aq-busca", "Primeira Ficticia Amanda", { delay: 10 });
  await p.click("[data-aqnovo]");
  await p.fill("#aq-tel", "16999990010"); await p.click("#aq-seg2");
  await p.waitForSelector('[data-aqacomp="nao"]'); await p.click('[data-aqacomp="nao"]'); await p.click("#aq-seg4");
  await p.click("#aq-seg5"); await p.check("#aq-o1"); await p.check("#aq-o2"); await p.click("#aq-gravar");
  await p.waitForSelector(".aq-whats", { timeout: 10000 });
  conf(`na vaga LIVRE, o primeiro atendimento vira 001 no próprio evento, no mesmo horário (${evG("A1").summary})`,
    evG("A1").summary === "001 - Primeira Ficticia Amanda - Não confirmado" && evG("A1").end.dateTime.slice(11, 16) === "10:30" && evG("A1").colorId === "5");
  await p.evaluate(() => fecharCaixa());
  await recarregar();
  conf("agendado, fica cheio no amarelo do 001", await p.evaluate(() => { const e = document.querySelector('[data-aqev="A1"]'); return !!e && e.classList.contains("p-amanda") && e.classList.contains("t001"); }));
  await p.click('[data-aqev="A1"]'); await p.click('.aq-menu [data-aqop="cancelar"]'); await p.waitForTimeout(600);
  conf(`cancelar devolve o título LIVRE original (${evG("A1").summary})`, evG("A1").summary === "LIVRE 10h00-10h30");
  await foto("03b-amanda");
  await p.click('[data-aqprof="todos"]');
  await p.waitForFunction(() => agq.disp && agq.disp.profissional === "todos", null, { timeout: 10000 });
  await p.click(`[data-aqdia="${W}"]`);
  const vt = await p.$$eval(".aq-vaga", b => b.map(x => x.dataset.aqvaga));
  conf(`a Completa junta as vagas do Paulo e do Marcos (${vt.join(", ")})`, vt.includes("P4") && vt.includes("M2"));
  conf("na Completa o almoço do Paulo aparece uma vez só", await p.evaluate(d => agq.disp.dias.find(x => x.data === d).eventos.filter(e => e.id === "ALM").length === 1, W));
  await foto("04-completa");
  await p.click('.aq-vaga[data-aqvaga="M2"]');
  conf("a vaga do Marcos na Completa agenda com o Marcos", await p.evaluate(() => fluxo.prof === "marcos" && fluxo.eventoId === "M2"));
  await p.evaluate(() => fecharCaixa());

  // 8 · a lista Clientes abre só a Identificação
  await p.click('.lista-item[data-v="clientes"]'); await p.waitForTimeout(300);
  // F252 · o índice de A a Z
  const az = await p.$$eval("#cli-az [data-letra]", b => b.map(x => [x.dataset.letra, x.disabled]));
  conf(`o índice tem Todos, A a Z e # (${az.length})`, az.length === 28 && az[0][0] === "" && az[1][0] === "A" && az[27][0] === "#");
  const ativas = az.filter(([l, d]) => l && !d).map(([l]) => l).join("");
  conf(`só as letras com cliente ficam ativas (${ativas})`, ativas === "ABCENP#");
  const seps = await p.$$eval(".cli-letra", b => b.map(x => x.textContent).join(""));
  conf(`em Todos, a lista se separa por letra (${seps})`, seps === "#ABCENP");
  await foto("06-indice");
  await p.click('#cli-az [data-letra="E"]'); await p.waitForTimeout(200);
  const soE = await p.$$eval(".cli-todos-it b", b => b.map(x => x.textContent));
  conf(`a letra E traz o nome com acento (${soE.join(", ")})`, soE.join() === "Élio Fictício Acento");
  await p.click('#cli-az [data-letra="B"]'); await p.waitForTimeout(200);
  conf("a letra B traz só o Bruno e diz quantos são", (await p.$$eval(".cli-todos-it b", b => b.map(x => x.textContent))).join() === "Bruno Fictício Lista"
    && /1 na letra B/.test(await p.textContent("#cli-todos-n")) && await p.evaluate(() => document.querySelector('#cli-az [data-letra="B"]').classList.contains("on")));
  await p.click('#cli-az [data-letra="#"]'); await p.waitForTimeout(200);
  conf("o # traz o nome que começa com número", (await p.$$eval(".cli-todos-it b", b => b.map(x => x.textContent))).join() === "3M Fictícia Empresa");
  await p.click('#cli-az [data-letra=""]'); await p.waitForTimeout(200);
  conf("Todos volta a lista inteira", (await p.$$(".cli-todos-it")).length === 7);
  await p.click('#cli-az [data-letra="C"]'); await p.waitForTimeout(200);
  await p.fill("#cli-filtro", "ana fic"); await p.waitForTimeout(200);
  conf("digitar procura em todos e solta a letra", await p.evaluate(() => _cliLetra === "") && (await p.$$eval(".cli-todos-it b", b => b.map(x => x.textContent))).join() === "Ana Fictícia Colab");
  await p.setViewportSize({ width: 390, height: 800 }); await p.waitForTimeout(300);
  conf("no celular o índice quebra a linha, sem rolar de lado", await p.evaluate(() => { const n = document.getElementById("cli-az"); return n.scrollWidth <= n.clientWidth + 1 && document.documentElement.scrollWidth <= window.innerWidth + 1; }));
  const barra = await p.$$eval("#barra-cel button", b => b.filter(x => x.offsetParent !== null).map(x => x.dataset.cel));
  conf(`no celular a barra de baixo é Agenda, Clientes e Buscar (${barra.join(", ")})`, barra.join() === "agendaq,clientes,busca" && !(await vis("#fab-rapida")));
  conf("os ícones da barra são desenhados, não emoji", await p.evaluate(() => [...document.querySelectorAll("#barra-cel button")].filter(b => b.offsetParent !== null).every(b => !!b.querySelector("b svg"))));
  await foto("07-indice-celular");
  await p.click('#barra-cel [data-cel="agendaq"]'); await p.waitForTimeout(300);
  conf("no celular, Agenda na barra abre a agenda", await p.evaluate(() => visao === "agendaq"));
  await p.click('#barra-cel [data-cel="clientes"]'); await p.waitForTimeout(300);
  await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(300);
  await p.click(".cli-todos-it"); await p.waitForTimeout(600);
  const abas = await p.evaluate(() => [...document.querySelectorAll(".menu-topo .mt")].filter(e => e.offsetParent !== null).map(e => e.textContent.trim()));
  conf(`o cliente abre só no Cadastro, na Identificação (${abas.join(", ")})`, abas.join() === "Cadastro" && await p.evaluate(() => subCad) === "identificacao");
  await foto("05-cliente");

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
