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
  conf("uma linha só: espécie, benefício, DER em dd/mm/aaaa, tramitação e verificação", /^B41/.test(lc.txt) && /Aposentadoria por idade/.test(lc.txt) && /DER 12\/05\/2024/.test(lc.txt) && /TRAMITAÇÃO INSS/i.test(lc.txt) && /VERIFICAÇÃO Manual/i.test(lc.txt));
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
    acoes: [...document.querySelectorAll(".lc-gestao .lc-linha:nth-child(4) button")].map(b => b.textContent.trim()) }));
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
    const m = document.querySelector(".painel[data-p='2'] .sub-menu"), lc = document.querySelector(".linha-caso");
    return { botoes: [...m.querySelectorAll("button")].map(b => b.textContent.replace(/\s+/g, " ").trim()), on: (m.querySelector("button.on") || {}).textContent,
      abaixo: m.getBoundingClientRect().top >= lc.getBoundingClientRect().bottom - 1, fundo: getComputedStyle(m).backgroundColor, fundoLinha: getComputedStyle(lc).backgroundColor, rotulo: getComputedStyle(m, "::before").content };
  });
  conf("o menu vem abaixo da linha, na mesma superfície dela, sem o rótulo 'CASO'", menu.abaixo && menu.fundo === menu.fundoLinha && /none/.test(menu.rotulo));
  conf("Escritório · INSS · Recurso (CRPS) · Caso completo — Judicial só existe com número", menu.botoes.join("|").replace(/ \(sem dados\)/g, "") === "Andamentos do Escritório|INSS|Recurso (CRPS)|Caso completo");
  conf("o Caso completo abre por padrão", /Caso completo/.test(menu.on || ""));
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

  // ── F109 · papel ─────────────────────────────────────────────────────────
  const ff = await p.evaluate(() => ({ chao: getComputedStyle(document.querySelector(".det-rolagem")).backgroundColor,
    topo: getComputedStyle(document.querySelector(".det-topo")).backgroundColor,
    escrever: (e => e && { borda: getComputedStyle(e).borderTopWidth + " " + getComputedStyle(e).borderTopStyle, lados: getComputedStyle(e).borderLeftStyle, sombra: getComputedStyle(e).boxShadow })(document.querySelector(".escrever")),
    tl: (e => e && { borda: getComputedStyle(e).borderTopStyle, fio: getComputedStyle(e, "::before").display })(document.querySelector(".painel[data-p='2'] .timeline")),
    titulo: (e => e && getComputedStyle(e).borderBottomWidth)(document.querySelector(".painel[data-p='2'] .fatos:not(.fatos-processo)>.fatos-topo")),
    pin: (b => b && getComputedStyle(b).backgroundColor)(document.querySelector('.timeline button[onclick^="abrirSeguimento"]')) }));
  conf("papel: a ficha é branca e só o cabeçalho do cliente tem cor própria", ff.chao === "rgb(255, 255, 255)" && ff.topo === "rgb(234, 237, 239)");
  conf("o compositor tem só a régua escura em cima (sem caixa, sem sombra)", ff.escrever && ff.escrever.borda === "2px solid" && ff.escrever.lados === "none" && ff.escrever.sombra === "none");
  conf("a conversa não tem moldura nem fio; o título tem a régua escura", ff.tl && ff.tl.borda === "none" && ff.tl.fio === "none" && ff.titulo === "2px");
  conf("o 'dar seguimento' de cada registro fica fantasma até o mouse chegar", ff.pin === "rgba(0, 0, 0, 0)");

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
