// F101–F105 — A TELA DO CASO SEM POLUIÇÃO (tema v10). O cabeçalho ganha a
// parceria ao lado do nome e o status no canto; a LINHA DO CASO mostra só o
// essencial e abre os números no ➕ e a gestão no segundo ➕ (NB a mais,
// comentário fixo, verificação); o menu dos andamentos vem abaixo, com o
// Caso completo como padrão e os recursos juntos; os quadros de prazo são
// comandados pela anotação; e cada tipo de anotação abre uma janela que
// escreve o comentário padronizado no compositor.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const hojeSP = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const emDias = n => new Date(new Date(hojeSP() + "T12:00:00Z").getTime() + n * 864e5).toISOString().slice(0, 10);
const fmtBR = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const AND1 = "a0000000-0000-0000-0000-0000000f1021";
Object.assign(FIX.casos[0], { der: "2024-05-12", nb: "216.197.676-6", nbs: [], protocolos: ["1234567890"],
  crps_nups: ["44236386953202361", "44236000111202455"], parceria: "Dr. Fictício Parceiro", acompanhamento: "manual",
  prazo: emDias(9), fixo: null, natureza: "concessao",
  crps: [
    { nup: "44236386953202361", status: "Em julgamento", eventos: [{ data: "10/09/2026", resumo: "Recurso distribuído à 5ª Junta", tipo: "tramitacao" }] },
    { nup: "44236000111202455", status: "Aguardando", eventos: [{ data: "15/09/2026", resumo: "Embargos recebidos", tipo: "tramitacao" }] },
  ] });
FIX.andamentos = [
  { id: AND1, caso_id: CASO1, autor_id: EU, origem: "app", andamentos_lidos: [], criado_em: new Date(Date.now() - 864e5).toISOString(),
    texto: `⏰ [PRAZO ${emDias(9).split("-").reverse().join(".")}] Contestar o laudo — prazo de 15 dias` },
  { id: "a0000000-0000-0000-0000-0000000f1022", caso_id: CASO1, autor_id: EU, origem: "pat", origem_id: "c-1", andamentos_lidos: [],
    criado_em: new Date(Date.now() - 4 * 864e5).toISOString(), texto: "INSS · Solicitamos a apresentação de CTPS." },
];
FIX.andamento_tarefas = [{ id: "t0000000-0000-0000-0000-0000000f1021", andamento_id: AND1, caso_id: CASO1, colaborador_id: EU, lembrar_em: emDias(4), concluida_em: null }];

(async () => {
  const escritos = [];
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
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      const corpo = rota.request().postData() || "";
      escritos.push({ t, m, corpo });
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ ...(JSON.parse(corpo || "{}")), id: "novo-" + escritos.length }]) });
    }
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error" && !/ERR_FAILED/.test(m.text())) erros.push("console: " + m.text()); });
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const patches = campo => escritos.filter(e => e.t === "casos" && e.m === "PATCH").map(e => JSON.parse(e.corpo)).filter(b => campo in b);

  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await p.evaluate(async (a) => { await abrirFicha(a.cli); casoSel = a.id; abaAtiva = 2; localStorage.removeItem("crm_subaba"); subAba = "tudo"; repintarFicha(); }, { cli: CLI_CHEIO, id: CASO1 });
  await p.waitForTimeout(300);

  // ── F101 · cabeçalho ─────────────────────────────────────────────────────
  const cab = await p.evaluate(() => {
    const l1 = document.querySelector(".det-topo .linha1"), parc = l1.querySelector(".cli-parc"), st = l1.querySelector(".cli-st"), x = l1.querySelector(".fechar");
    const cpf = document.querySelector(".det-topo .resumo [data-cop]");
    return { parc: parc && parc.textContent.trim(), parcAntesDoStatus: parc && st && parc.getBoundingClientRect().left < st.getBoundingClientRect().left,
      stNoCanto: st && x && (x.getBoundingClientRect().left - st.getBoundingClientRect().right) < 20,
      cpfCop: cpf && cpf.dataset.cop, cursor: cpf && getComputedStyle(cpf).cursor };
  });
  conf("a parceria aparece ao lado do nome, só porque existe", /Dr\. Fictício Parceiro/.test(cab.parc || "") && cab.parcAntesDoStatus);
  conf("a pílula 'Cliente ativo' está no canto direito, colada no ✕", cab.stNoCanto);
  conf("o CPF copia no clique (cursor de copiar, sem botão)", cab.cpfCop === "12345678909" && cab.cursor === "copy");
  conf("a pílula 'volta dd.mm.aaaa' saiu do cabeçalho (F108)", await p.evaluate(() => !document.querySelector(".det-topo .volta-pilula")));

  // ── F102 · a linha do caso ───────────────────────────────────────────────
  const lc = await p.evaluate(() => {
    const r = document.querySelector(".linha-caso"), topo = r.querySelector(".lc-topo");
    return { txt: topo.innerText.replace(/\s+/g, " ").trim(), manual: (r.querySelector(".lc-manual") || {}).textContent,
      corManual: r.querySelector(".lc-manual") && getComputedStyle(r.querySelector(".lc-manual")).color,
      nivel1: !!r.querySelector(".lc-numeros"), semRegua: !document.querySelector(".regua-caso"), semCartaoFora: !document.querySelector(".painel[data-p='2'] > .fatos-processo"),
      semPrazoFatalSolto: !/Prazo fatal do caso|PRAZO FATAL/.test(document.querySelector(".painel[data-p='2']").textContent) };
  });
  conf("uma linha só: o nome do pedido (sem o código), DER em dd/mm/aaaa, tramitação e verificação", /^Aposentadoria por idade/.test(lc.txt) && !/^B41/.test(lc.txt) && /DER 12\/05\/2024/.test(lc.txt) && /TRAMITAÇÃO INSS/i.test(lc.txt) && /VERIFICAÇÃO Manual/i.test(lc.txt));
  // ── F113 · a espécie pela janela, com subespécies e pedido à mão ─────────
  conf("a canetinha ao lado do nome abre a janela das espécies", await p.evaluate(() => /escolherEspecie/.test((document.querySelector(".lc-topo .lc-ben + .lapis") || {}).getAttribute("onclick") || "")));
  await p.evaluate((id) => escolherEspecie(id), CASO1); await p.waitForTimeout(150);
  const jan = await p.evaluate(() => { const m = document.getElementById("modal"); return { itens: m.querySelectorAll(".esp-it").length, b36: /Auxílio-acidente previdenciário/.test(m.textContent),
    b42: [...m.querySelectorAll(".esp-it")].filter(b => /Aposentadoria por tempo de contribuição/.test(b.textContent)).length, livre: !!m.querySelector("#esp-livre") }; });
  conf("a janela lista o catálogo inteiro, com o B36 e as subespécies do B42 (deficiência, especiais, rurais e combinações)", jan.itens > 60 && jan.b36 && jan.b42 >= 8 && jan.livre);
  await p.evaluate(() => { espBusca = "deficiência e períodos especiais"; pintarEspecies(casoSel); });
  const achou = await p.evaluate(() => [...document.querySelectorAll("#esp-lista .esp-it")].map(b => b.textContent.trim()));
  conf("a busca acha a subespécie certa", achou.length >= 1 && achou.every(t => /pessoa com deficiência/.test(t) && /especiais/.test(t)));
  await p.evaluate((id) => gravarEspecie(id, "B42", "B42.PCD.ESP"), CASO1); await p.waitForTimeout(300);
  const esp = patches("subespecie").pop();
  conf("escolher grava espécie B42 + subespécie + nome, e o título do caso vira o nome da subespécie",
    esp && esp.especie === "B42" && esp.subespecie === "B42.PCD.ESP" && /pessoa com deficiência e períodos especiais/.test(esp.beneficio)
    && await p.evaluate(() => /Aposentadoria por tempo de contribuição da pessoa com deficiência e períodos especiais/.test(document.querySelector(".lc-topo .lc-ben").textContent)));
  await p.evaluate((id) => gravarEspecie(id, null, null, "Repetição de Indébito"), CASO1); await p.waitForTimeout(300);
  const livre = patches("subespecie").pop();
  conf("o pedido à mão grava sem espécie e vira o título", livre && livre.especie === null && livre.beneficio === "Repetição de Indébito"
    && await p.evaluate(() => document.querySelector(".lc-topo .lc-ben").textContent.trim() === "Repetição de Indébito"));
  await p.evaluate((id) => gravarEspecie(id, "B41", "B41"), CASO1); await p.waitForTimeout(300);
  conf("voltar à espécie do INSS limpa a subespécie", (patches("subespecie").pop() || {}).subespecie === null && await p.evaluate(() => /^Aposentadoria por idade/.test(document.querySelector(".lc-topo .lc-ben").textContent.trim())));
  conf("'Manual' em vermelho", lc.manual === "Manual" && lc.corManual === "rgb(179, 38, 30)");
  conf("fechada, a linha não mostra os números; a régua e o cartão saíram da frente", !lc.nivel1 && lc.semRegua && lc.semCartaoFora);
  conf("o 'venceu … Prazo fatal do caso' sumiu de vez", lc.semPrazoFatalSolto);

  // ➕ números
  await p.evaluate(() => document.querySelector(".linha-caso .lc-mais").click()); await p.waitForTimeout(200);
  const n1 = await p.evaluate(() => ({ txt: document.querySelector(".lc-numeros").innerText.replace(/\s+/g, " "), gestao: !!document.querySelector(".lc-gestao") }));
  conf("o ➕ abre os números: NB, E-SisREC (os dois recursos) e o convite para incluir Judicial", /NB 216\.197\.676-6/.test(n1.txt) && /44236\.386953\/2023-61/.test(n1.txt) && /44236\.000111\/2024-55/.test(n1.txt) && /\+ Judicial/i.test(n1.txt) && !n1.gestao);
  // NB a mais, pela janela
  await p.evaluate((id) => lcNovoNb(id), CASO1);
  await p.evaluate(() => { document.getElementById("lc-nb-inp").value = "41/210.334.552-0"; });
  await p.evaluate((id) => lcGuardarNb(id), CASO1); await p.waitForTimeout(300);
  const nbs = patches("nbs").pop();
  conf("o segundo NB grava em casos.nbs e aparece ao lado do primeiro", nbs && nbs.nbs.join("|") === "41/210.334.552-0" && await p.evaluate(() => /41\/210\.334\.552-0/.test(document.querySelector(".lc-numeros").textContent)));
  conf("os números copiam no clique", await p.evaluate(() => [...document.querySelectorAll(".lc-numeros [data-cop]")].map(e => e.dataset.cop).includes("44236.386953/2023-61")));

  // ➕ gestão
  await p.evaluate(() => document.querySelector(".lc-mais2").click()); await p.waitForTimeout(200);
  const g = await p.evaluate(() => ({ txt: document.querySelector(".lc-gestao").innerText.replace(/\s+/g, " "),
    ficha: !!document.querySelector(".lc-ficha .fatos-processo"), fichaFechada: !document.querySelector(".lc-ficha").open,
    acoes: [...[...document.querySelectorAll(".lc-gestao .lc-linha")].find(l => /^Ações/.test(l.textContent.trim())).querySelectorAll("button")].map(b => b.textContent.trim()) }));
  conf("o segundo ➕ traz protocolos, a escolha Manual/Automática com o botão de verificar, o comentário fixo e as ações",
    /PROTOCOLOS 1234567890/i.test(g.txt) && /verifiquei agora/.test(g.txt) && /COMENTÁRIO FIXO/i.test(g.txt) && g.acoes.some(t => /não é caso/.test(t)) && g.acoes.some(t => /Encerrar caso/.test(t)));
  conf("a ficha completa do caso continua ali, dobrada (nada sumiu)", g.ficha && g.fichaFechada);
  await p.evaluate((id) => checarAcomp(id), CASO1); await p.waitForTimeout(200);
  conf("verificar registra quem e quando, e o ✓ acende na linha", patches("checado_em").length === 1 && await p.evaluate(() => document.querySelector(".lc-topo .lc-check").classList.contains("ok")));
  // comentário fixo
  await p.evaluate((id) => lcEditarFixo(id), CASO1);
  await p.evaluate((d) => { document.getElementById("lc-fx-texto").value = "Só ligar de manhã."; document.getElementById("lc-fx-data").value = d; }, emDias(20));
  await p.evaluate((id) => lcGuardarFixo(id), CASO1); await p.waitForTimeout(300);
  const fx = patches("fixo").pop();
  conf("o comentário fixo grava com a data de lembrar", fx && fx.fixo.texto === "Só ligar de manhã." && fx.fixo.lembrar_em === emDias(20));
  const faixaFx = await p.evaluate(() => { const f = document.querySelector(".fixo-caso"), pr = document.querySelector(".faixa-prazos");
    return { txt: f && f.textContent, acima: f && pr && f.getBoundingClientRect().bottom <= pr.getBoundingClientRect().top + 1,
      lemb: [...document.querySelectorAll(".faixa-prazos .pz")].some(c => c.dataset.tipo === "Comentário fixo") }; });
  conf("e aparece em destaque acima dos quadros de prazo, com o lembrete dele na faixa", /Só ligar de manhã/.test(faixaFx.txt || "") && faixaFx.acima && faixaFx.lemb);

  // ── F103 · o menu dos andamentos ─────────────────────────────────────────
  const menu = await p.evaluate(() => {
    const m = document.querySelector(".painel[data-p='2'] .sub-menu.menu-andamentos"), esc = document.querySelector(".escrever"), tl = document.querySelector(".painel[data-p='2'] .timeline");
    return { botoes: [...m.querySelectorAll("button")].map(b => b.textContent.replace(/\s+/g, " ").trim()), on: (m.querySelector("button.on") || {}).textContent,
      abaixoDoCompositor: m.getBoundingClientRect().top >= esc.getBoundingClientRect().bottom - 1,
      acimaDaConversa: tl && m.getBoundingClientRect().bottom <= tl.getBoundingClientRect().top + 1,
      umCompositor: document.querySelectorAll("#and-texto").length === 1, rotulo: getComputedStyle(m, "::before").content };
  });
  conf("o menu dos andamentos fica entre onde se escreve e o que se lê, sem o rótulo 'CASO'", menu.abaixoDoCompositor && menu.acimaDaConversa && menu.umCompositor && /none/.test(menu.rotulo));
  conf("Escritório · INSS · Recurso (CRPS) · Caso completo — Judicial só existe com número", menu.botoes.join("|").replace(/ \(sem dados\)/g, "") === "Andamentos do Escritório|INSS|Recurso (CRPS)|Caso completo");
  conf("o Caso completo abre por padrão", /Caso completo/.test(menu.on || ""));
  const idTudo = await p.evaluate(() => { const li = [...document.querySelectorAll(".painel[data-p='2'] .timeline li.tl-of")].find(l => /Contestar o laudo/.test(l.textContent));
    const av = li && li.querySelector(".quando .avatar"); return av && { ini: av.textContent.trim(), cor: av.style.background, fonte: av.classList.contains("av-fonte"), marco: li.classList.contains("tudo-marco") }; });
  conf("no Caso completo quem escreveu aparece com a bolinha da sua cor, mesmo sendo marco", idTudo && idTudo.ini === "P" && /rgb\(37, 100, 207\)|#2564cf/i.test(idTudo.cor) && !idTudo.fonte);
  await p.evaluate(() => irSubAba("crps")); await p.waitForTimeout(300);
  const crps = await p.evaluate(() => ({ menu: [...document.querySelectorAll(".sub-menu.instancias button")].map(b => b.textContent.replace(/\s+/g, " ").trim()),
    on: (document.querySelector(".sub-menu.instancias button.on") || {}).textContent || "",
    tl: [...document.querySelectorAll(".timeline .tl-of")].map(li => li.querySelector(".autor-nome").textContent), compositor: !!document.querySelector("#and-texto") }));
  conf("com dois recursos, a aba mostra os DOIS juntos por padrão, cada linha dizendo de qual é",
    /Todos os recursos/.test(crps.on) && crps.tl.length === 2 && crps.tl.every(t => /^Recurso 44236\./.test(t)));
  conf("o sub-menu deixa escolher um só; o compositor está na aba também", crps.menu.length === 3 && crps.compositor);
  await p.evaluate(() => { nupSel = "44236000111202455"; repintarFicha(); }); await p.waitForTimeout(200);
  conf("escolhido um, só ele aparece", await p.evaluate(() => document.querySelectorAll(".timeline .tl-of").length === 1 && /000111/.test(document.querySelector(".painel[data-p='2'] .fatos:not(.fatos-processo) .fatos-topo h3").textContent)));
  await p.evaluate(() => { nupSel = ""; irSubAba("inss"); }); await p.waitForTimeout(200);
  conf("a aba INSS também escreve dali (compositor) e lista o comentário do INSS", await p.evaluate(() => !!document.querySelector("#and-texto") && /Solicitamos a apresentação de CTPS/.test(document.querySelector(".timeline").textContent)));

  // ── F110 · blocos por dia ────────────────────────────────────────────────
  const ff = await p.evaluate(() => {
    const tl = document.querySelector(".painel[data-p='2'] .timeline");
    const blocos = tl ? [...tl.querySelectorAll(":scope > li.dia-bloco")] : [];
    return { chao: getComputedStyle(document.querySelector(".det-rolagem")).backgroundColor,
      topo: getComputedStyle(document.querySelector(".det-topo")).backgroundColor,
      escrever: (e => e && { borda: getComputedStyle(e).borderTopStyle, fundo: getComputedStyle(e).backgroundColor, hoje: getComputedStyle(e, "::before").content })(document.querySelector(".escrever")),
      blocos: blocos.length, dias: blocos.map(b => (b.querySelector(".tl-dia span") || {}).textContent),
      itensPorBloco: blocos.map(b => b.querySelectorAll(":scope > .dia-itens > li").length),
      fundos: blocos.map(b => getComputedStyle(b).backgroundColor),
      soltos: tl ? tl.querySelectorAll(":scope > li:not(.dia-bloco)").length : -1,
      pin: (b => b && getComputedStyle(b).opacity)(document.querySelector('.timeline button[onclick^="abrirSeguimento"]')) };
  });
  conf("a ficha é branca e só o cabeçalho do cliente tem cor própria", ff.chao === "rgb(255, 255, 255)" && ff.topo === "rgb(234, 237, 239)");
  conf("o compositor é um bloco leve, sem borda e sem o rótulo 'Hoje' (F112)", ff.escrever && ff.escrever.borda === "none" && ff.escrever.fundo === "rgb(241, 243, 245)" && !/Hoje/.test(ff.escrever.hoje));
  // F112 · fechado: só tipos + Sugestões e o campo; aberto: prazo com Lembrar em ao lado, Atribuir para com as ferramentas e o Registrar
  const VIS = 'const vis = sel => { const e = document.querySelector(sel); return !!e && getComputedStyle(e).display !== "none" && e.getBoundingClientRect().height > 0; };';
  const fechado = await p.evaluate(`(() => { ${VIS}
    const sug = document.querySelector("#tipo-fila .sug-abrir");
    return { sug: !!sug && vis("#tipo-fila .sug-abrir") && sug.textContent.trim() === "Sugestões", campo: vis("#and-texto"), barra: vis("#tf-box"), prazo: vis("#and-prazo-ck") }; })()`);
  conf("fechado: ficam à vista só os tipos, o Sugestões ao lado deles e o campo", fechado.sug && fechado.campo && !fechado.barra && !fechado.prazo);
  await p.click("#and-texto"); await p.waitForTimeout(250);
  const aberto = await p.evaluate(`(() => { ${VIS}
    const linhas = [...document.querySelectorAll("#tf-box .esc-linha")];
    const y = el => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; };
    const mesmaLinha = (a, b) => Math.abs(y(document.querySelector(a)) - y(document.querySelector(b))) < 10;
    return { barra: vis("#tf-box"), linhas: linhas.length,
      l1: linhas[0] && /tarefa com PRAZO/.test(linhas[0].textContent) && /LEMBRAR EM/i.test(linhas[0].textContent) && mesmaLinha("#and-prazo-ck", "#tf-box .tf-dt"),
      l2: linhas[1] && /ATRIBUIR PARA/i.test(linhas[1].textContent) && !!linhas[1].querySelector(".esc-reg") && mesmaLinha("#tf-ninguem", ".esc-reg"),
      icone: getComputedStyle(document.querySelector(".esc-ic svg")).width }; })()`);
  conf("aberto: linha 1 = prazo e Lembrar em; linha 2 = Atribuir para e as ferramentas com o Registrar", aberto.barra && aberto.linhas === 2 && aberto.l1 && aberto.l2);
  conf("os ícones das ferramentas cresceram (19px)", aberto.icone === "19px");
  await p.evaluate(() => { document.getElementById("and-texto").blur(); document.body.click(); }); await p.waitForTimeout(400);
  conf("a conversa vira blocos por dia: um bloco por dia, cada um com a data e seus registros, nada solto", ff.blocos >= 1 && ff.soltos === 0 && ff.itensPorBloco.every(n => n >= 1) && ff.dias.every(Boolean));
  conf("o bloco do dia tem o cinza leve (e o seguinte, quando há, é branco)", ff.fundos[0] === "rgb(241, 243, 245)" && (ff.fundos.length < 2 || ff.fundos[1] === "rgb(255, 255, 255)"));
  conf("o 'dar seguimento' de cada registro fica invisível até o mouse chegar", ff.pin === "0");

  // ── F104 · os quadros ────────────────────────────────────────────────────
  const cards = await p.evaluate(() => [...document.querySelectorAll(".faixa-prazos .pz")].map(c => ({ tipo: c.dataset.tipo, data: c.querySelector(".pz-data").textContent, onclick: c.querySelector(".pz-mais").getAttribute("onclick") })));
  conf("o prazo com anotação de origem vira quadro vermelho e o 'saber mais' vai até a anotação",
    cards.some(c => c.tipo === "Prazo processual" && c.data === fmtBR(emDias(9)) && /qdIrParaAndamento/.test(c.onclick)));
  conf("o 'lembrar antes' da mesma anotação é um quadro cinza ao lado", cards.some(c => c.tipo === "Lembrar antes" && c.data === fmtBR(emDias(4))));

  // ── F105 · a janela do tipo ──────────────────────────────────────────────
  await p.evaluate(() => irSubAba("escritorio")); await p.waitForTimeout(200);
  const fila = await p.evaluate(() => [...document.querySelectorAll("#tipo-fila .tipo-ch")].map(b => b.textContent.trim()));
  conf("os tipos do compositor: trouxe documentos, exigência, perícia, protocolo, petição, decisão, contato, ouvidoria",
    fila.join("|") === "Trouxe documentos|Exigência|Perícia|Protocolo|Petição|Decisão|Contato|Ouvidoria");
  await p.evaluate(() => popAnotacao("exigencia")); await p.waitForTimeout(150);
  conf("Exigência abre a janela com os campos e a observação livre no fim", await p.evaluate(() => {
    const m = document.getElementById("modal"); const ids = [...m.querySelectorAll("input,select,textarea")].map(e => e.id);
    return ids.join("|") === "pa-oque|pa-prazo|pa-doc|pa-quem|pa-obs"; }));
  await p.evaluate((d) => { document.getElementById("pa-oque").value = "Apresentar CTPS"; document.getElementById("pa-prazo").value = d; document.getElementById("pa-doc").value = "CTPS"; document.getElementById("pa-obs").value = "Cliente avisada."; }, emDias(6));
  await p.evaluate(() => popInserir("exigencia")); await p.waitForTimeout(300);
  const ex = await p.evaluate(() => ({ txt: document.getElementById("and-texto").value, modal: document.getElementById("modal").style.display,
    card: [...document.querySelectorAll(".faixa-prazos .pz")].map(c => c.dataset.tipo + " " + c.querySelector(".pz-data").textContent) }));
  conf("o comentário padronizado entra no compositor, com a observação no fim",
    ex.txt === `[EXIGÊNCIA] O que o INSS exigiu: Apresentar CTPS\nPrazo para cumprir: ${fmtBR(emDias(6))}\nDocumento que falta: CTPS\nQuem vai cumprir: —\nCliente avisada.` && ex.modal === "none");
  conf("a exigência grava o prazo no caso e vira quadro vermelho na hora", patches("exigencia_prazo").pop().exigencia_prazo === emDias(6) && ex.card.includes("Prazo processual " + fmtBR(emDias(6))));
  await p.evaluate(() => popAnotacao("documentos")); await p.waitForTimeout(150);
  conf("Trouxe documentos: lista de documentos e o toque 'anexei no Drive' com a explicação do nome do PDF", await p.evaluate(() => {
    const m = document.getElementById("modal"); return !!m.querySelector("#pa-docs") && !!m.querySelector("#pa-drive") && /Nome do documento \+ data/.test(m.textContent); }));
  await p.evaluate(() => { document.getElementById("pa-docs").value = "CTPS\nCarnês 2019"; document.getElementById("pa-drive").checked = true; });
  await p.evaluate(() => popInserir("documentos")); await p.waitForTimeout(200);
  conf("o texto dos documentos se soma ao que já estava no compositor", await p.evaluate(() => /\n\[DOCUMENTOS\] Trouxe: CTPS; Carnês 2019\. Anexado no Drive \(PDF “documento \+ data”\)\.$/.test(document.getElementById("and-texto").value)));
  await p.evaluate(() => popAnotacao("peticao")); await p.waitForTimeout(150);
  await p.evaluate(() => { const o = document.getElementById("pa-onde"); o.value = "CRPS"; o.dispatchEvent(new Event("change")); });
  conf("Petição: escolher CRPS troca a lista para Recurso Ordinário, Especial, Embargos…", await p.evaluate(() => [...document.getElementById("pa-qual").options].map(o => o.value).slice(0, 3).join("|") === "Recurso Ordinário|Recurso Especial|Embargos de Declaração"));
  await p.evaluate(() => { document.getElementById("pa-qual").value = "Recurso Especial"; });
  await p.evaluate(() => popInserir("peticao")); await p.waitForTimeout(200);
  conf("Recurso Especial protocolado grava a data no caso (re_protocolado_em)", (patches("re_protocolado_em").pop() || {}).re_protocolado_em === hojeSP());

  // ── F114 · o essencial da espécie na linha, o resto em gestão do caso ───
  conf("a aposentadoria por idade não enche a linha: sem DIB nem DCB, a DER basta", await p.evaluate(() =>
    camposEssenciais(D.casoPorId.get(casoSel)).every(t => t[0] === "?") &&
    ![...document.querySelectorAll(".lc-topo .lc-f .lc-k")].map(x => x.textContent.trim()).some(r => !["DER","Tramitação","Verificação"].includes(r))));
  await p.evaluate((id) => gravarEspecie(id, "B31", "B31"), CASO1); await p.waitForTimeout(300);
  const rotsDa = () => p.evaluate(() => [...document.querySelectorAll(".lc-topo .lc-f .lc-k")].map(x => x.textContent.trim()));
  const b31 = await rotsDa();
  conf("a incapacidade temporária traz DII e DCB na própria linha", b31.includes("DII") && b31.includes("DCB"));
  await p.evaluate((id) => lcAbrir(id, 2), CASO1); await p.waitForTimeout(200);
  await p.evaluate((id) => lcNovaData(id), CASO1); await p.waitForTimeout(200);
  conf("o ＋ das datas só oferece o que falta e explica cada uma", await p.evaluate(() => {
    const o = [...document.getElementById("lc-dt-campo").options].map(x => x.value);
    return !o.includes("der") && o.includes("dcb") && o.includes("obito_em") && /CadÚnico|decadência|óbito|prorroga|Início/i.test(document.getElementById("lc-dt-dica").textContent);
  }));
  await p.evaluate((d) => { document.getElementById("lc-dt-campo").value = "dcb"; document.getElementById("lc-dt-valor").value = d; }, emDias(9));
  await p.evaluate((id) => lcGuardarData(id), CASO1); await p.waitForTimeout(350);
  const dcbP = patches("dcb").pop();
  conf("a data gravada pelo ＋ rearma a prorrogação 15 dias antes da DCB", dcbP && dcbP.dcb === emDias(9) && dcbP.dcb_prorrogar_em === emDias(-6) && dcbP.dcb_prorrogacao_pedida === false);
  conf("a DCB na linha diz sozinha quantos dias faltam", await p.evaluate(() => /em 9 d/.test(document.querySelector(".lc-topo #lc-dcb-" + casoSel).parentElement.textContent)));
  await p.evaluate((id) => gravarEspecie(id, "B42", "B42.PCD.ESP"), CASO1); await p.waitForTimeout(350);
  const pcd = await rotsDa();
  conf("a aposentadoria da pessoa com deficiência troca a DII por DID e Grau", pcd.includes("DID") && pcd.includes("Grau") && !pcd.includes("DII"));
  conf("a DCB preenchida continua na PRIMEIRA linha em espécie que não a pede, sem abrir gestão do caso",
    pcd.includes("DCB") && await p.evaluate(() => !!document.querySelector(".lc-topo #lc-dcb-" + casoSel) && !document.querySelector(".lc-gestao #lc-dcb-" + casoSel)));
  await p.evaluate(async (id) => { await patchCaso(id, { dib: "2026-03-01" }); D.casoPorId.get(id).dib = "2026-03-01"; repintarFicha(); }, CASO1);
  await p.waitForTimeout(250);
  conf("a DIB preenchida entra na linha de qualquer espécie, e some quando não há", (await rotsDa()).includes("DIB"));
  await p.evaluate(async (id) => { await patchCaso(id, { dib: null }); D.casoPorId.get(id).dib = null; repintarFicha(); }, CASO1);
  await p.waitForTimeout(250);
  conf("sem DIB a linha não pede DIB, porque ela só nasce com a concessão", !(await rotsDa()).includes("DIB"));
  await p.evaluate((id) => editarFato(id, "grau_deficiencia", "lc"), CASO1); await p.waitForTimeout(200);
  await p.evaluate(() => { const s = document.querySelector("#lc-grau_deficiencia-" + casoSel + " select"); s.value = "grave"; s.dispatchEvent(new Event("change")); });
  await p.waitForTimeout(350);
  conf("o grau se escolhe numa lista de leve, moderada e grave", (patches("grau_deficiencia").pop() || {}).grau_deficiencia === "grave");
  await p.evaluate((id) => gravarEspecie(id, "B21", "B21.CONJ"), CASO1); await p.waitForTimeout(350);
  conf("a pensão por morte pede a data do óbito na linha", await p.evaluate(() => !!document.querySelector(".lc-topo #lc-obito_em-" + casoSel)));
  const obitoDiz = async (d) => { await p.evaluate(async (a) => { await patchCaso(a.id, { obito_em: a.d }); D.casoPorId.get(a.id).obito_em = a.d; repintarFicha(); }, { id: CASO1, d });
    await p.waitForTimeout(250);
    return p.evaluate(() => document.querySelector(".lc-topo #lc-obito_em-" + casoSel).parentElement.textContent); };
  conf("óbito com a DER dentro dos 90 dias, a linha avisa que a DIB é no óbito", /DIB no óbito/.test(await obitoDiz("2024-04-01")));
  conf("óbito com a DER fora dos 90 dias, a linha avisa que a DIB cai na DER", /fora dos 90 d/.test(await obitoDiz("2023-01-01")));
  await p.evaluate((id) => gravarEspecie(id, "B41", "B41"), CASO1); await p.waitForTimeout(300);

  // ── F115 · havendo DCB, o lembrete de 15 dias antes existe sozinho ──────
  await p.evaluate((id) => gravarEspecie(id, "B31", "B31"), CASO1); await p.waitForTimeout(300);
  const porDcb = async (dcb, prorrogar, pedida) => {
    await p.evaluate(async (a) => { const c = { dcb: a.dcb, dcb_prorrogar_em: a.pr, dcb_prorrogacao_pedida: !!a.pd };
      await patchCaso(a.id, c); Object.assign(D.casoPorId.get(a.id), c); repintarFicha(); },
      { id: CASO1, dcb, pr: prorrogar, pd: pedida });
    await p.waitForTimeout(300);
    return p.evaluate(() => [...document.querySelectorAll(".faixa-prazos .pz")].map(c => c.innerText.replace(/\s+/g, " ")));
  };
  const semCampo = await porDcb(emDias(20), null, false);
  conf("DCB anotada sem data de prorrogação já gera o lembrete 15 dias antes",
    semCampo.some(t => /pedir a prorrogação/i.test(t) && t.includes(fmtBR(emDias(5)))));
  conf("o lembrete diz de que DCB é e que nasceu sozinho", await p.evaluate(() => {
    const r = faixaAtual.map(x => x.rot).join(" ");
    return /Cessação marcada para/.test(r) && /lembrete automático/.test(r); }));
  const comCampo = await porDcb(emDias(20), emDias(3), false);
  conf("a data que eu escrevo prevalece sobre os 15 dias", comCampo.some(t => /pedir a prorrogação/i.test(t) && t.includes(fmtBR(emDias(3)))) && !comCampo.some(t => t.includes(fmtBR(emDias(5)))));
  const desligado = await porDcb(emDias(20), null, true);
  conf("marcada a prorrogação como pedida, o lembrete se desliga", !desligado.some(t => /pedir a prorrogação/i.test(t)));
  conf("a mesma conta serve ao calendário e ao Planejado, sem segunda versão", await p.evaluate(() => {
    const k = D.casoPorId.get(casoSel);
    k.dcb_prorrogacao_pedida = false; k.dcb_prorrogar_em = null;
    return prorrogarEm(k) === somaDias(k.dcb, -15) && itensDoCalendario().some(i => i.tipo === "prorrog" && i.dia === prorrogarEm(k));
  }));
  await p.evaluate(async (id) => { const c = { dcb: null, dcb_prorrogar_em: null, dcb_prorrogacao_pedida: false };
    await patchCaso(id, c); Object.assign(D.casoPorId.get(id), c); repintarFicha(); }, CASO1);
  await p.waitForTimeout(250);
  await p.evaluate((id) => gravarEspecie(id, "B41", "B41"), CASO1); await p.waitForTimeout(300);

  // ── desligado: nada disso muda o tema antigo ─────────────────────────────
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await p.evaluate(async (a) => { await abrirFicha(a.cli); casoSel = a.id; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); }, { cli: CLI_CHEIO, id: CASO1 });
  await p.waitForTimeout(250);
  conf("desligado: cartão de fatos na frente, sem linha do caso, tipos com esqueleto no texto", await p.evaluate(() =>
    !document.querySelector(".linha-caso") && !!document.querySelector(".painel[data-p='2'] > .fatos-processo") && /escolherTipoAnotacao/.test(document.querySelector("#tipo-fila .tipo-ch").getAttribute("onclick"))));

  for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
