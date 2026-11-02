// TESTE COMO COLABORADORA (pedido do Paulo de 02.11.2026): a Ingrid (recepção, nível 1 da transição, que tem
// Menções, Agenda, Clientes e WhatsApp) atende pelo WhatsApp, assume a conversa, responde, deixa nota,
// agenda pela agenda da conversa (cliente do escritório e contato novo), abre a ficha da conversa e a lista
// Clientes (só a Identificação), e repete o essencial no celular. O Apps Script é o Code.gs de verdade num
// Google Agenda simulado; banco simulado e dados fictícios. Uso: node colab-integrado.js [pasta das fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const { criarGoogle, proximo, quando } = require("./google-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/colab-integrado";
fs.mkdirSync(OUT, { recursive: true });

const INGRID = "33333333-3333-3333-3333-333333333333", AUTH_I = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const SESSAO_I = { ...SESSAO, user: { id: AUTH_I, email: "ingrid@exemplo.invalido" } };
const ANA = "c0000000-0000-4000-8000-000000000001", CASO = "k0000000-0000-4000-8000-000000000001";
const C_ANA = "d0000000-0000-4000-8000-000000000001", C_LEAD = "d0000000-0000-4000-8000-000000000002";
const agora = new Date().toISOString();
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados",
  "zap_reacoes", "zap_transferencias", "zap_atendimentos", "zap_setores", "zap_etiquetas", "zap_conversa_etiquetas", "zap_retornos"]) dados[t] = [];
Object.assign(dados, {
  colaboradores: [...FIX.colaboradores, { id: INGRID, auth_id: AUTH_I, nome: "Ingrid Fictícia", inicial: "I", cor: "#8a4b00",
    papel: "colaborador", ativo: true, cargo: "recepcao" }],
  clientes: [{ id: ANA, nome: "Ana Fictícia Colab", cpf: "52998224725", telefone: "(16) 99999-0001", dn: "1960-05-10", campos: {}, telefones: [], criado_em: "2026-01-01T12:00:00Z" },
    { id: "c0000000-0000-4000-8000-000000000002", nome: "Bruno Fictício Lista", cpf: "11144477735", telefone: null, campos: {}, telefones: [], criado_em: "2026-01-01T12:00:00Z" }],
  casos: [{ id: CASO, cliente_id: ANA, fase: "inss", beneficio: "B41", etapa: "aguardando análise", criado_em: "2026-09-01T12:00:00Z" }],
  credenciais: [{ id: "cr1", cliente_id: ANA, tipo: "meu_inss", valor: "Senha@Ficticia1" }],
  atribuicoes: [], documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento,
  config_app: [...(FIX.config_app || []), { chave: "crm_transicao", valor: JSON.stringify({ ligada: true, onda: 1, niveis: { [INGRID]: 1 } }) }],
  zap_conversas: [
    { id: C_ANA, telefone: "5516999990001", chave: "99990001", nome_perfil: "Ana", cliente_id: ANA, atendente_id: null, status: "aberta",
      nao_lidas: 1, ultima_em: agora, ultimo_texto: "Quero marcar um horário" },
    { id: C_LEAD, telefone: "5516988880002", chave: "88880002", nome_perfil: "Joana Ficticia Lead", cliente_id: null, atendente_id: null, status: "aberta",
      nao_lidas: 1, ultima_em: agora, ultimo_texto: "boa tarde, preciso de ajuda com o INSS" }],
  zap_mensagens: [
    { id: "m1", seq: 1, conversa_id: C_ANA, direcao: "entrada", tipo: "texto", texto: "Quero marcar um horário", status: "entregue", criado_em: agora, momento: agora },
    { id: "m2", seq: 2, conversa_id: C_LEAD, direcao: "entrada", tipo: "texto", texto: "boa tarde, preciso de ajuda com o INSS", status: "entregue", criado_em: agora, momento: agora }],
});
const banco = new Banco(dados);
const T = banco.t;

const QUA = proximo(3);
const ev = (id, s, ini, fim, cor) => ({ id, summary: s, start: quando(QUA, ini), end: quando(QUA, fim), ...(cor ? { colorId: cor } : {}) });
const LIVRE = t => `${t} - Livre (anote o telefone)`;
const google = criarGoogle({ tokens: { "tok-ingrid": { nome: "Ingrid", papel: "equipe" } }, eventos: [
  ev("P1", LIVRE("002"), "09:00", "09:30"), ev("P2", LIVRE("001"), "13:30", "14:15"), ev("P3", LIVRE("001"), "15:00", "15:45")] });
const evG = id => google.eventos.find(e => e.id === id) || {};

const ok = [];
const conf = (nome, v) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); };

async function abrir(nav, porta, viewport, extra) {
  const ctx = await nav.newContext({ viewport, ...(extra || {}) });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
    localStorage.setItem("crm_agenda_token", "tok-ingrid");
  }, [SUPA, SESSAO_I]);
  const recusas = [];
  await instalarBanco(ctx, { SUPA, SESSAO: SESSAO_I, banco });
  // as RPCs do WhatsApp que a tela usa, com o efeito que o banco de verdade teria
  await ctx.route(SUPA + "/rest/v1/rpc/**", r => {
    const u = r.request().url(), b = JSON.parse(r.request().postData() || "{}");
    banco.escritas.push({ m: "POST", t: "rpc:" + u.split("/rpc/")[1] });
    if (/zap_assumir$/.test(u)) { const c = T.zap_conversas.find(x => x.id === b.p_conversa); if (c) c.atendente_id = INGRID; }
    if (/zap_painel$/.test(u)) return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ totais: {}, setores: [], atendentes: [] }) });
    return r.fulfill({ status: 200, contentType: "application/json", body: "null" });
  });
  await ctx.route(/script\.google\.com/, r => {
    const corpo = JSON.parse(r.request().postData() || "{}");
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(google.post(corpo)) });
  });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error" && !/fonts\.g|ERR_FAILED|favicon/.test(m.text())) erros.push("console: " + m.text()); });
  p.on("response", r => { if (r.url().startsWith(SUPA) && r.status() >= 400) recusas.push(r.status() + " " + r.url()); });
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${porta}/app.html?tema=v10`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  return { ctx, p, erros, recusas };
}

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const porta = s.address().port;
  const nav = await chromium.launch();

  // ═══ COMPUTADOR ═══
  const { p, erros, recusas } = await abrir(nav, porta, { width: 1440, height: 900 });
  const foto = n => p.screenshot({ path: path.join(OUT, n + ".png") });
  const vis = sel => p.evaluate(x => { const e = document.querySelector(x); return !!e && e.offsetParent !== null; }, sel);

  // 1 · a entrada
  conf("a Ingrid entra como colaboradora no nível 1", await p.evaluate(() => meuNivel() === 1 && visaoColab()));
  const itens = await p.evaluate(() => [...document.querySelectorAll(".lista-item")].filter(e => e.offsetParent !== null).map(e => e.dataset.v));
  conf(`o menu tem Menções, Agenda, Clientes e WhatsApp, e nada do escritório (${itens.join(", ")})`,
    ["mencoes", "agendaq", "clientes", "whatsapp"].every(x => itens.includes(x)) && !itens.some(x => /^(meudia|importante|escritorio|inss|judicial|config)/.test(x)));

  // 2 · o WhatsApp: as duas conversas pendentes, assumir, responder e anotar
  await p.click('.lista-item[data-v="whatsapp"]');
  await p.waitForSelector(".zap-lado");
  const abas = await p.$$eval(".zap-lado [data-zf], .zap-filtros button", b => b.map(x => x.textContent.trim()));
  conf(`a colaboradora vê Novas, Minhas e Pendentes, sem Todas (${abas.join(" · ")})`, abas.some(a => /Pendentes/.test(a)) && !abas.some(a => /^Todas/.test(a)));
  await p.evaluate(() => { zapFiltro = "sem"; pintarListaZap(); });
  const pend = await p.$$eval(".zap-conv", b => b.map(x => x.dataset.zc));
  conf(`nas Pendentes estão as duas conversas sem atendente (${pend.length})`, pend.includes(C_ANA) && pend.includes(C_LEAD));
  await p.click(`.zap-conv[data-zc="${C_ANA}"]`);
  await p.waitForSelector(".zt-assumir", { timeout: 5000 }).catch(() => {});
  conf("a conversa sem atendente mostra Assumir em destaque", await vis(".zt-assumir"));
  await p.click(".zt-assumir");
  await p.waitForFunction(() => !document.querySelector(".zt-assumir"), null, { timeout: 5000 }).catch(() => {});
  await p.waitForTimeout(800);   // a conversa repinta de novo quando a leitura do banco volta
  conf("assumir passa a conversa à Ingrid e o botão some", T.zap_conversas.find(c => c.id === C_ANA).atendente_id === INGRID && !(await vis(".zt-assumir")));
  await p.fill("#zap-txt", "Bom dia, Sra. Ana. Vou verificar um horário.");
  await p.keyboard.press("Enter");
  await p.waitForTimeout(800);
  const saida = T.zap_mensagens.find(m => m.direcao === "saida");
  conf("a resposta vai à fila de envio com a Ingrid como autora", !!saida && saida.status === "fila" && saida.autor_id === INGRID && /verificar um horário/.test(saida.texto));
  conf("o balão da resposta aparece na conversa", /verificar um horário/.test(await p.textContent(".zap-msgs")));
  conf("o nível 1 não registra mensagem como andamento do caso", !(await p.$(".zap-msgs .virar")));
  await foto("01-whatsapp-respondido");

  // 3 · a agenda da conversa: cliente do escritório numa vaga 002
  await p.waitForSelector("#zap-ag .zag-dia", { timeout: 10000 }).catch(() => {});
  conf("a agenda de atendimentos aparece ao lado da conversa", !!(await p.$("#zap-ag .zag-dia")));
  conf("a agenda diz para quem vai agendar", /Ana Fictícia Colab/.test(await p.textContent(".zag-para").catch(() => "")));
  if (!(await p.$('.zag-vaga[data-zagvaga="P1"]'))) await p.click(`.zag-dia[data-zagdia="${QUA}"]`);
  await p.click('.zag-vaga[data-zagvaga="P1"]');
  await p.waitForSelector(".aq-fluxo", { timeout: 5000 });
  conf("o agendamento abre já com a cliente da conversa", await p.evaluate(() => fluxo.cli && fluxo.cli.nome === "Ana Fictícia Colab" && fluxo.eventoId === "P1"));
  await p.click("#aq-seg2");
  await p.waitForSelector('[data-aqacomp="nao"]');
  await p.click('[data-aqacomp="nao"]'); await p.click("#aq-seg4");
  await p.waitForSelector("#aq-seg5"); await p.click("#aq-seg5");
  await p.waitForSelector("#aq-aviso002");
  await p.click("#aq-gravar");
  await p.waitForSelector(".aq-whats", { timeout: 10000 }).catch(() => {});
  conf(`a vaga 002 vira o atendimento da Ana no Google (${evG("P1").summary})`, evG("P1").summary === "002 - Ana Fictícia Colab - Não confirmado"
    && ((evG("P1").extendedProperties || {}).private || {}).clienteId === ANA);
  await p.click("#aq-naconversa").catch(() => {});
  conf("Pôr na conversa leva a confirmação ao campo de escrever", /agendado para .*às 09h00/.test(await p.inputValue("#zap-txt").catch(() => "")));
  await p.fill("#zap-txt", "");
  await foto("02-agendado-pela-conversa");

  // 4 · contato novo: assumir e agendar o primeiro atendimento com o nome e o telefone da conversa
  await p.evaluate(id => abrirConversa(id), C_LEAD);
  await p.waitForSelector(".zt-assumir", { timeout: 5000 }).catch(() => {});
  await p.click(".zt-assumir").catch(() => {});
  await p.waitForFunction(() => /Joana/.test(document.querySelector(".zag-para")?.textContent || ""), null, { timeout: 5000 }).catch(() => {});
  if (!(await p.$('.zag-vaga[data-zagvaga="P2"]'))) await p.click(`.zag-dia[data-zagdia="${QUA}"]`);
  await p.click('.zag-vaga[data-zagvaga="P2"]');
  await p.waitForSelector("#aq-busca");
  conf("para o contato novo, a busca vem com o nome do contato", (await p.inputValue("#aq-busca")) === "Joana Ficticia Lead");
  await p.click("[data-aqnovo]");
  await p.waitForSelector("#aq-tel");
  conf("o primeiro atendimento traz o telefone da conversa", (await p.inputValue("#aq-tel")).replace(/\D/g, "") === "16988880002");
  await p.click("#aq-seg2");
  await p.waitForSelector('[data-aqacomp="nao"]');
  await p.click('[data-aqacomp="nao"]'); await p.click("#aq-seg4");
  await p.waitForSelector("#aq-seg5"); await p.click("#aq-seg5");
  await p.check("#aq-o1"); await p.check("#aq-o2");
  await p.click("#aq-gravar");
  await p.waitForSelector(".aq-whats", { timeout: 10000 }).catch(() => {});
  const joana = T.clientes.find(c => c.nome === "Joana Ficticia Lead");
  conf(`o primeiro atendimento é marcado e o pré-cadastro nasce (${evG("P2").summary})`, evG("P2").summary === "001 - Joana Ficticia Lead - Não confirmado" && !!joana);
  await p.evaluate(() => fecharCaixa());

  // 5 · a ficha pela conversa: só a Identificação, e o caso não abre no nível 1
  await p.evaluate(id => abrirConversa(id), C_ANA);
  await p.waitForSelector("#zap-painel .zp-nome", { state: "attached" });
  await p.evaluate(() => document.querySelector("#zap-painel .zp-nome").click());
  await p.waitForFunction(() => clienteAberto, null, { timeout: 5000 }).catch(() => {});
  await p.waitForTimeout(400);
  const abasF = await p.evaluate(() => [...document.querySelectorAll(".menu-topo .mt")].filter(e => e.offsetParent !== null).map(e => e.textContent.trim()));
  conf(`a ficha da conversa abre só na Identificação (${abasF.join(", ")})`, abasF.length === 1 && /^Cadastro/.test(abasF[0]) && await p.evaluate(() => subCad === "identificacao"));
  conf("a conversa fica ao lado da ficha", await p.evaluate(() => !!document.querySelector("#zap-txt, .zap-tela")));
  const txtF = await p.textContent("#detalhe").catch(() => "");
  conf("a Identificação mostra o nome e o CPF da cliente", /Ana Fictícia Colab/.test(txtF) && /529\.982\.247-25/.test(txtF));
  conf("sem + atendimento e sem anotação no caso", !(await vis(".det-atend, [onclick*='novoAtendimento']")) && !(await vis("#esc-txt, .composer")));
  await foto("03-ficha-pela-conversa");
  await p.evaluate(async (a) => { await casoComZap(a.cli, a.caso); }, { cli: ANA, caso: CASO });
  await p.waitForTimeout(400);
  conf("o Abrir do caso, no nível 1, continua na Identificação", await p.evaluate(() => abaAtiva === 0 && subCad === "identificacao"));

  // 6 · a lista Clientes
  await p.click('.lista-item[data-v="clientes"]'); await p.waitForTimeout(300);
  const nomes = await p.$$eval(".cli-todos-it b", b => b.map(x => x.textContent));
  conf(`a lista Clientes traz os cadastros, com a Joana recém-criada (${nomes.join(", ")})`, nomes.includes("Ana Fictícia Colab") && nomes.includes("Joana Ficticia Lead"));
  await p.fill("#cli-filtro", "52998224725"); await p.waitForTimeout(200);
  conf("procurar pelo CPF acha a cliente", (await p.$$eval(".cli-todos-it b", b => b.map(x => x.textContent))).join() === "Ana Fictícia Colab");
  await p.fill("#cli-filtro", "joana"); await p.waitForTimeout(200);
  await p.click(".cli-todos-it"); await p.waitForTimeout(500);
  conf("o pré-cadastro da Joana abre na Identificação com o telefone da conversa", await p.evaluate(() => subCad === "identificacao" && D.cliPorId.get(clienteAberto).nome === "Joana Ficticia Lead")
    && /98888-0002|988880002/.test(await p.textContent("#detalhe")));
  await foto("04-clientes-joana");

  // 7 · a Agenda da lista: os dois agendamentos aparecem
  await p.click('.lista-item[data-v="agendaq"]');
  await p.waitForSelector(".aq-faixa", { timeout: 10000 });
  await p.click(`[data-aqdia="${QUA}"]`);
  conf("na Agenda, os dois atendimentos marcados aparecem no dia", !!(await p.$('[data-aqev="P1"]')) && !!(await p.$('[data-aqev="P2"]')));
  await foto("05-agenda");

  // ═══ CELULAR ═══
  const cel = await abrir(nav, porta, { width: 390, height: 844 }, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const q = cel.p;
  const fotoC = n => q.screenshot({ path: path.join(OUT, n + ".png") });
  const semLado = () => q.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  const barra = await q.$$eval("#barra-cel button", b => b.filter(x => x.offsetParent !== null).map(x => x.dataset.cel));
  conf(`no celular, a barra de baixo traz o WhatsApp (${barra.join(", ")})`, barra.includes("whatsapp"));
  await q.tap('#barra-cel [data-cel="whatsapp"]');
  await q.waitForSelector(".zap-lado");
  await q.evaluate(() => { zapFiltro = "minhas"; pintarListaZap(); });
  await q.waitForSelector(`.zap-conv[data-zc="${C_ANA}"]`, { timeout: 5000 }).catch(() => {});
  conf("em Minhas está a conversa que a Ingrid assumiu no computador", !!(await q.$(`.zap-conv[data-zc="${C_ANA}"]`)));
  conf("a lista do WhatsApp não rola de lado", await semLado());
  await q.tap(`.zap-conv[data-zc="${C_ANA}"]`);
  await q.waitForSelector("#zap-txt");
  conf("aberta, a conversa ocupa a tela e não rola de lado", await q.evaluate(() => document.getElementById("app").classList.contains("zap-conv-aberta")) && await semLado());
  await q.fill("#zap-txt", "Confirmado o horário de quarta.");
  await q.tap(".ze-env, #zap-enviar, [onclick*='enviarZap']").catch(async () => { await q.focus("#zap-txt"); await q.keyboard.press("Enter"); });
  await q.waitForTimeout(500);
  conf("a resposta do celular vai à fila de envio", T.zap_mensagens.some(m => m.direcao === "saida" && /Confirmado o horário/.test(m.texto)));
  await fotoC("06-celular-conversa");
  await q.tap(".zt-info").catch(() => {});
  await q.waitForTimeout(400);
  conf("o i abre a ficha da conversa no celular", await q.evaluate(() => { const e = document.getElementById("zap-painel"); return !!e && getComputedStyle(e).display !== "none"; }));
  await fotoC("07-celular-ficha-zap");
  await q.evaluate(() => document.querySelector("#zap-painel .zp-nome").click());
  await q.waitForFunction(() => clienteAberto, null, { timeout: 5000 }).catch(() => {});
  await q.waitForTimeout(400);
  conf("no celular, a ficha abre na Identificação, sem rolar de lado", await q.evaluate(() => subCad === "identificacao" && abaAtiva === 0) && await semLado());
  conf("no celular, Copiar e Abrir do Meu INSS não ficam um sobre o outro", await q.evaluate(() => {
    const d = [...document.querySelectorAll(".cel-dado")].find(x => /Meu INSS/i.test(x.textContent)); if (!d) return false;
    const [a, b] = [...d.querySelectorAll(":scope > button")].map(x => x.getBoundingClientRect());
    return !!a && !!b && (a.bottom <= b.top + 1 || b.bottom <= a.top + 1 || a.right <= b.left + 1 || b.right <= a.left + 1); }));
  conf("no celular, o nível 1 não vê as abas do caso (Andamentos, Prazos, Caso, Honorários)", await q.evaluate(() => ![...document.querySelectorAll(".cel-abas button")].some(b => b.offsetParent !== null)));
  conf("no celular, a conversa não cobre a ficha que se pediu para ver", await q.evaluate(() => /Ana Fictícia Colab/.test(document.getElementById("detalhe").innerText)
    && ![...document.querySelectorAll("aside, .zap-ficha, #zap-cli")].some(e => e.offsetParent !== null && /Responder pelo WhatsApp/.test(e.innerHTML))));
  await fotoC("08-celular-identificacao");
  await q.tap('#barra-cel [data-cel="agendaq"]').catch(async () => { await q.evaluate(() => irPara("agendaq")); });
  await q.waitForSelector(".aq-faixa", { timeout: 10000 });
  await q.tap(`[data-aqdia="${QUA}"]`);
  conf("no celular, a Agenda mostra os atendimentos marcados", !!(await q.$('[data-aqev="P1"]')) && await semLado());
  await fotoC("09-celular-agenda");

  // erros de qualquer das duas telas
  const todos = [...erros, ...cel.erros], negados = [...recusas, ...cel.recusas];
  conf("sem erro de página nem de console", !todos.length);
  conf("nenhuma chamada ao banco recusada", !negados.length);
  if (todos.length) console.log(todos);
  if (negados.length) console.log(negados);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
