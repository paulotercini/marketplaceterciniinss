// F281 · A AGENDA NA TELA DO WHATSAPP, com pontuação (o Paulo pediu mais de 95 de 100): no canto de baixo à direita,
// os dias com vaga do Paulo, do Marcos e da Amanda, cada um na sua cor; o clique na vaga agenda ali mesmo, com o cliente
// da conversa aberta ou com o nome e o telefone do contato que ainda não é cliente, e a confirmação vai para a conversa.
// O Apps Script é o Code.gs DE VERDADE num Google Agenda simulado. Banco simulado e dados fictícios.
// Uso: node zapagenda.js [pasta das fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const { criarGoogle, proximo, quando } = require("./google-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/zapagenda";
fs.mkdirSync(OUT, { recursive: true });

const ANA = "c0000000-0000-4000-8000-0000000000a1", C_ANA = "d0000000-0000-4000-8000-0000000000a1", C_LEAD = "d0000000-0000-4000-8000-0000000000a2";
const agora = new Date().toISOString();
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais",
  "zap_reacoes", "zap_transferencias", "zap_atendimentos", "zap_setores", "zap_etiquetas", "zap_conversa_etiquetas", "zap_retornos"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, casos: [], atribuicoes: [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app || [],
  clientes: [{ id: ANA, nome: "Ana Fictícia Zap", cpf: "52998224725", telefone: "(16) 99999-0001", campos: {}, telefones: [], criado_em: "2026-01-01T12:00:00Z" }],
  zap_conversas: [
    { id: C_ANA, telefone: "5516999990001", chave: "99990001", nome_perfil: "Ana", cliente_id: ANA, status: "aberta", nao_lidas: 0, ultima_em: agora, ultimo_texto: "quero marcar" },
    { id: C_LEAD, telefone: "5516988880002", chave: "88880002", nome_perfil: "Joana Ficticia Lead", cliente_id: null, status: "aberta", nao_lidas: 0, ultima_em: agora, ultimo_texto: "boa tarde" }],
  zap_mensagens: [
    { id: "m1", seq: 1, conversa_id: C_ANA, direcao: "entrada", tipo: "texto", texto: "quero marcar", status: "entregue", criado_em: agora, momento: agora },
    { id: "m2", seq: 2, conversa_id: C_LEAD, direcao: "entrada", tipo: "texto", texto: "boa tarde", status: "entregue", criado_em: agora, momento: agora }] });
const banco = new Banco(dados);
const T = banco.t;

// quarta: duas vagas do Paulo (sem cor) e uma da Amanda (banana); quinta: a vaga LIVRE do Marcos (sálvia)
const QUA = proximo(3), QUI = proximo(4);
// uma quarta treze semanas adiante, fora das seis quartas que a agenda do Paulo mostra
const somaDias = (d, n) => new Date(Date.parse(d + "T12:00:00Z") + n * 86400e3).toISOString().slice(0, 10);
const LONGE = somaDias(QUA, 91), DESDE = somaDias(LONGE, -3);
const ev = (dia, id, s, ini, fim, cor) => ({ id, summary: s, start: quando(dia, ini), end: quando(dia, fim), ...(cor ? { colorId: cor } : {}) });
const LIVRE = t => `${t} - Livre (anote o telefone)`;
const google = criarGoogle({ tokens: { "tok-paulo": { nome: "Paulo", papel: "admin" } }, eventos: [
  ev(QUA, "P1", LIVRE("001"), "09:00", "09:45"), ev(QUA, "P4", LIVRE("002"), "13:30", "14:00"),
  ev(QUA, "A1", LIVRE("002"), "10:00", "10:30", "5"), ev(QUI, "M2", "LIVRE 09:30-10:00", "09:30", "10:00", "2"),
  ev(LONGE, "P9", LIVRE("001"), "09:00", "09:45")] });
const evG = id => google.eventos.find(e => e.id === id) || {};

const ok = [];
const conf = (pts, nome, v) => { ok.push([pts, nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + `[${pts}] ` + nome); };

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
    localStorage.setItem("crm_agenda_token", "tok-paulo");
  }, [SUPA, SESSAO]);
  await instalarBanco(ctx, { SUPA, SESSAO, banco });
  // depois do banco: a rota registrada por último responde primeiro
  await ctx.route(SUPA + "/rest/v1/rpc/zap_painel", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ totais: {}, setores: [], atendentes: [] }) }));
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
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const foto = n => p.screenshot({ path: path.join(OUT, n + ".png") });
  const caixaAg = () => p.evaluate(() => { const r = document.getElementById("zap-ag").getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: innerWidth, h: innerHeight }; });
  const cruza = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;

  // 1 · a agenda aparece no canto de baixo à direita, aberta
  await p.evaluate(() => { zapFiltro = "todas"; irPara("whatsapp"); });
  await p.waitForSelector(".zap-conv");
  await p.waitForSelector("#zap-ag .zag-dia", { timeout: 10000 }).catch(() => {});
  await p.waitForTimeout(400);   // a entrada da tela anima por 0,14 s
  const cx = await caixaAg();
  // logo acima do ⚡ da anotação rápida, que ocupa os últimos 64 px do canto
  conf(8, `a agenda fica no canto de baixo à direita (${Math.round(cx.w - cx.r)} px da direita, ${Math.round(cx.h - cx.b)} px de baixo)`,
    cx.w - cx.r <= 30 && cx.h - cx.b <= 100 && cx.l > cx.w / 2 && cx.t > cx.h / 3);
  const rect = sel => p.evaluate(x => { const e = document.querySelector(x); if (!e || !e.offsetParent && getComputedStyle(e).position !== "fixed") return null; const r = e.getBoundingClientRect(); return r.width ? { l: r.left, t: r.top, r: r.right, b: r.bottom } : null; }, sel);
  const fab = await rect(".fab-rapida");
  conf(4, "a agenda não fica sob o botão ⚡ da anotação rápida", !fab || !cruza(cx, fab));
  const dias = await p.$$eval(".zag-dia", b => b.map(x => x.dataset.zagdia));
  conf(8, `mostra só os dias com vaga, em ordem (${dias.join(", ")})`, dias.join() === [QUA, QUI].sort().join());
  const contas = await p.$$eval(".zag-dia", b => b.map(x => [...x.querySelectorAll(".zag-n")].map(n => n.className.match(/p-(\w+)/)[1] + ":" + n.textContent.trim())));
  const iQua = dias.indexOf(QUA), iQui = dias.indexOf(QUI);
  conf(8, `cada dia diz quantas vagas de cada um, com o nome (${JSON.stringify(contas)})`,
    iQua >= 0 && contas[iQua].join() === "paulo:Paulo 2,amanda:Amanda 1" && iQui >= 0 && contas[iQui].join() === "marcos:Marcos 1");
  const cores = await p.$$eval(".zag-n", b => [...new Set(b.map(x => getComputedStyle(x).backgroundColor))]);
  conf(6, `cada profissional tem uma cor própria (${cores.join(" · ")})`, cores.length === 3);
  const legenda = await p.$$eval("[data-zagprof] .aq-bola", b => [...new Set(b.map(x => getComputedStyle(x).backgroundColor))]);
  conf(4, "os botões de Paulo, Marcos e Amanda trazem a mesma cor, como legenda", legenda.length === 3 && cores.every(c => legenda.includes(c)));
  const aberto = await p.$$eval(".zag-vagas .zag-prof", b => b.map(x => x.querySelector("span").textContent.trim() + ":" + [...x.querySelectorAll(".zag-vaga")].map(v => v.dataset.zagvaga).join("+")));
  conf(6, `o primeiro dia já abre com as vagas por profissional (${aberto.join(" | ")})`, dias[0] === QUA ? aberto.join() === "Paulo:P1+P4,Amanda:A1" : aberto.join() === "Marcos:M2");
  conf(4, "sem conversa aberta, a agenda diz como agendar", /Clique na vaga para agendar/.test(await p.textContent(".zag-para")));
  await foto("01-agenda-no-zap");

  // 2 · o filtro por profissional
  await p.click('[data-zagprof="marcos"]');
  const soM = await p.$$eval(".zag-dia", b => b.map(x => x.dataset.zagdia));
  const vM = await p.$$eval(".zag-vaga", b => b.map(x => x.dataset.zagvaga + ":" + x.className));
  conf(6, `Marcos mostra só os dias e as vagas dele, em verde (${soM.join()} · ${vM.join()})`, soM.join() === QUI && vM.length === 1 && /^M2:.*p-marcos/.test(vM[0]));
  await p.click('[data-zagprof="todos"]');

  // 3 · cliente da conversa: o clique na vaga abre o agendamento já com ela, sem sair do WhatsApp
  await p.click(`.zap-conv[data-id="${C_ANA}"], .zap-conv >> nth=0`).catch(() => {});
  await p.evaluate(id => abrirConversa(id), C_ANA);
  await p.waitForFunction(() => /Ana Fictícia Zap/.test(document.querySelector(".zag-para")?.textContent || ""), null, { timeout: 5000 }).catch(() => {});
  conf(4, "com a conversa aberta, a agenda diz para quem vai agendar", /Agendar para:\s*Ana Fictícia Zap/.test(await p.textContent(".zag-para")));
  if (!(await p.$('.zag-dia[aria-expanded="true"][data-zagdia="' + QUA + '"]'))) await p.click(`.zag-dia[data-zagdia="${QUA}"]`);
  await p.click('.zag-vaga[data-zagvaga="P1"]');
  await p.waitForSelector(".aq-fluxo", { timeout: 5000 });
  conf(8, "o agendamento abre na própria tela, já com a cliente da conversa (sem procurar o nome)",
    await p.evaluate(() => visao === "whatsapp" && !!document.querySelector(".zap-tela") && fluxo.etapa === 2 && fluxo.cli && fluxo.cli.nome === "Ana Fictícia Zap" && fluxo.eventoId === "P1"));
  await p.click("#aq-seg2");
  await p.waitForSelector('[data-aqacomp="nao"]');
  await p.click('[data-aqacomp="nao"]'); await p.click("#aq-seg4");
  await p.waitForSelector("#aq-seg5");
  await p.click("#aq-seg5");
  await p.check("#aq-o1"); await p.check("#aq-o2");
  await p.click("#aq-gravar");
  await p.waitForSelector(".aq-whats", { timeout: 10000 }).catch(() => {});
  conf(8, `a vaga vira o atendimento da cliente no Google (${evG("P1").summary})`, /Ana Fictícia Zap/.test(evG("P1").summary || "")
    && ((evG("P1").extendedProperties || {}).private || {}).clienteId === ANA);
  await foto("02-agendado-no-zap");
  await p.click("#aq-naconversa").catch(() => {});
  const txt = await p.inputValue("#zap-txt").catch(() => "");
  conf(8, "Pôr na conversa leva a confirmação ao campo de escrever, e a janela fecha", /agendado para .*às 09h00/.test(txt) && !(await p.$(".aq-fluxo")));
  await p.waitForFunction(() => !document.querySelector('.zag-vaga[data-zagvaga="P1"]'), null, { timeout: 5000 }).catch(() => {});
  conf(6, "a vaga ocupada sai da agenda do WhatsApp", !(await p.$('.zag-vaga[data-zagvaga="P1"]')) && !!(await p.$(".zag-dia")));

  // 4 · contato que não é cliente: nome e telefone da conversa
  await p.evaluate(id => abrirConversa(id), C_LEAD);
  await p.waitForFunction(() => /Joana/.test(document.querySelector(".zag-para")?.textContent || ""), null, { timeout: 5000 }).catch(() => {});
  if (!(await p.$('.zag-vaga[data-zagvaga="A1"]'))) await p.click(`.zag-dia[data-zagdia="${QUA}"]`);
  await p.click('.zag-vaga[data-zagvaga="A1"]');
  await p.waitForSelector("#aq-busca");
  conf(4, "para quem não é cliente, a busca já vem com o nome do contato", (await p.inputValue("#aq-busca")) === "Joana Ficticia Lead");
  await p.click("[data-aqnovo]");
  await p.waitForSelector("#aq-tel");
  const nm = await p.inputValue("#aq-nome"), tl = (await p.inputValue("#aq-tel")).replace(/\D/g, "");
  conf(4, `o primeiro atendimento já traz o nome e o telefone da conversa (${nm} · ${tl})`, nm === "Joana Ficticia Lead" && tl === "16988880002");
  await p.click("#aq-seg2");
  await p.waitForSelector('[data-aqacomp="nao"]');
  await p.click('[data-aqacomp="nao"]'); await p.click("#aq-seg4");
  await p.waitForSelector("#aq-seg5"); await p.click("#aq-seg5");
  await p.check("#aq-o1"); await p.check("#aq-o2");
  await p.click("#aq-gravar");
  await p.waitForSelector(".aq-whats", { timeout: 10000 }).catch(() => {});
  conf(4, `agendado com a Amanda, com o telefone da conversa (${evG("A1").summary})`, /Joana Ficticia Lead/.test(evG("A1").summary || "") && /16988880002/.test(evG("A1").description || ""));
  await p.evaluate(() => fecharCaixa());

  // 5 · recolher e abrir de novo
  await p.click('.zag-cab [aria-label="Recolher a agenda"]');
  const pil = await p.textContent(".zag-pilula").catch(() => "");
  conf(4, `recolhida, vira a pílula com as vagas que sobram (${pil.trim()})`, /Agenda · 2 vagas/.test(pil) && await p.evaluate(() => localStorage.getItem("crm_zap_agenda") === "0"));
  await p.click(".zag-pilula");
  conf(2, "a pílula abre a agenda de novo", !!(await p.$(".zag-cx")));

  // 5b · a data adiante (o cliente que quer janeiro) e a vaga do Paulo com a carga em curso
  const corrida = await p.evaluate(async () => { delete agq.cache.paulo; const [a, b] = await Promise.all([carregarAgenda("paulo"), carregarAgenda("paulo")]);
    return !!(a && b && a === b && a.dias.some(d => vagasDoDia(d).length)); });
  conf(6, "quem pede a agenda do Paulo com a carga em curso recebe as vagas dele, e não a agenda vazia", corrida);
  conf(2, "a vaga adiante não aparece entre as próximas", !(await p.$(`.zag-dia[data-zagdia="${LONGE}"]`)));
  await p.evaluate(id => abrirConversa(id), C_ANA);
  await p.fill("#zag-desde", DESDE); await p.dispatchEvent("#zag-desde", "change");
  await p.waitForSelector(`.zag-dia[data-zagdia="${LONGE}"]`, { timeout: 5000 }).catch(() => {});
  const dLonge = await p.$$eval(".zag-dia", b => b.map(x => x.dataset.zagdia));
  conf(8, `"A partir de" ${DESDE} mostra a vaga do Paulo em ${LONGE} (${dLonge.slice(0, 3).join(", ")})`, dLonge[0] === LONGE && dLonge.every(d => d >= DESDE));
  const mais = await p.textContent(".zag-mais").catch(() => "");
  conf(4, `há o botão para seguir adiante (${mais.trim()})`, /Mais datas, depois de/.test(mais));
  if (!(await p.$('.zag-vaga[data-zagvaga="P9"]'))) await p.click(`.zag-dia[data-zagdia="${LONGE}"]`);
  await p.click('.zag-vaga[data-zagvaga="P9"]');
  await p.waitForSelector(".aq-fluxo", { timeout: 5000 }).catch(() => {});
  await p.click("#aq-seg2");
  // a Ana já tem o atendimento de quarta: o fluxo avisa e segue
  await p.waitForSelector("#aq-seguir", { timeout: 5000 }).catch(() => {});
  if (await p.$("#aq-seguir")) await p.click("#aq-seguir");
  await p.waitForSelector('[data-aqacomp="nao"]');
  await p.click('[data-aqacomp="nao"]'); await p.click("#aq-seg4");
  await p.waitForSelector("#aq-seg5"); await p.click("#aq-seg5");
  await p.check("#aq-o1"); await p.check("#aq-o2");
  await p.click("#aq-gravar");
  await p.waitForSelector(".aq-whats", { timeout: 10000 }).catch(() => {});
  conf(8, `a vaga adiante vira o atendimento no Google (${evG("P9").summary})`, /Ana Fictícia Zap/.test(evG("P9").summary || ""));
  await p.evaluate(() => fecharCaixa());
  await p.click(".zag-desde .zl-link");
  const volta = await p.$$eval(".zag-dia", b => b.map(x => x.dataset.zagdia));
  conf(2, `"voltar às próximas" devolve as datas de agora (${volta.join(", ")})`, volta.includes(QUI) && !volta.includes(LONGE));

  // 6 · telas menores: a agenda não cobre o enviar
  await p.setViewportSize({ width: 1100, height: 800 }); await p.waitForTimeout(300);
  const env = await p.evaluate(() => { const e = document.querySelector(".ze-enviar"); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; });
  conf(4, "em 1100 px a agenda fica acima do botão de enviar", !!env && !cruza(await caixaAg(), env));
  await p.setViewportSize({ width: 390, height: 800 }); await p.waitForTimeout(400);
  await p.evaluate(id => abrirConversa(id), C_ANA); await p.waitForTimeout(300);
  await p.evaluate(() => { if (zagAberta()) zagAlternar(); });
  const env2 = await p.evaluate(() => { const e = document.querySelector(".ze-enviar"); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; });
  const pil2 = await caixaAg();
  conf(2, "no celular, com a conversa aberta, a pílula aparece sem cobrir o enviar", !!env2 && pil2.r - pil2.l > 0 && !cruza(pil2, env2)
    && await p.evaluate(() => { const r = document.querySelector(".zag-pilula").getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest(".zag-pilula") !== null; }));
  await p.click(".zag-pilula");
  const escr = await rect(".zap-escrever");
  conf(4, "no celular, a agenda aberta não cobre o campo de escrever", !!escr && !cruza(await caixaAg(), escr));
  await p.click('.zag-vaga[data-zagvaga="P4"]').catch(() => {});
  await p.waitForSelector(".aq-fluxo", { timeout: 3000 }).catch(() => {});
  conf(2, "no celular, a janela do agendamento fica por cima da conversa", await p.evaluate(() => { const j = document.querySelector(".aq-fluxo"); if (!j) return false;
    const r = j.getBoundingClientRect(); return !!document.elementFromPoint(r.left + r.width / 2, r.top + 20)?.closest(".aq-fluxo"); }));
  await foto("03-celular");
  await p.evaluate(() => { fecharCaixa(); voltarListaZap(); if (zagAberta()) zagAlternar(); }); await p.waitForTimeout(200);
  const fab2 = await rect(".fab-rapida");
  conf(2, "no celular, na lista, a pílula não fica sob o ⚡", !fab2 || !cruza(await caixaAg(), fab2));

  conf(4, "sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const total = ok.reduce((n, [pt]) => n + pt, 0), feitos = ok.filter(x => x[2]).reduce((n, [pt]) => n + pt, 0);
  const nota = Math.round(feitos / total * 1000) / 10;   // os pesos somam mais de 100: a nota vai à escala de 100
  console.log(`${ok.filter(x => x[2]).length}/${ok.length} passaram · pontuação ${nota}/100`);
  await nav.close(); s.close();
  process.exit(nota > 95 && !erros.length ? 0 : 1);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
