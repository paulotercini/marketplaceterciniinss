// F326 · a tela Prazos (31.10.2026, desenho aprovado pelo Paulo): a aba Prazos do cliente com o próximo prazo fatal no
// alto, a janela do prazo (por cima da aba, com o véu; no celular, tela cheia), o prazo na anotação (viva, cumprindo,
// cumprida, vencida sem registro) e o campo de escrever com o catálogo, quem faz e quem revisa. Banco simulado, dados fictícios.
// Uso: node f326.js [pasta-das-fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f326";
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
const br = d => d.split("-").reverse().join(".");
const ts = (n, h = "12:00") => `${iso(n)}T${h}:00-03:00`;
// o prazo fatal cai em dia útil, como na vida
const util = n => { let k = n; while ([0, 6].includes(new Date(iso(k) + "T12:00:00").getDay())) k++; return k; };
let seq = 0;
const id = p => `${p}0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const cli = (nome, campos = {}) => { const c = { id: id("c"), nome, cpf: null, telefone: null, campos, telefones: [], criado_em: ts(-400) }; T.clientes.push(c); return c; };
const caso = (c, o) => { const k = { id: id("b"), cliente_id: c.id, titulo: c.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
  marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, dcb_prorrogacao_pedida: false, origem_lista: "🌻 INSS",
  criado_em: ts(-300), ...o }; T.casos.push(k); T.atribuicoes.push({ caso_id: k.id, colaborador_id: PAULO }); return k; };
const and = (k, n, texto, o = {}) => { const a = { id: id("e"), caso_id: k.id, autor_id: PAULO, texto, origem: "app", origem_id: null, criado_em: ts(n),
  publico: false, excluir: false, importante: false, urgente: false, responde_a: null, ...o }; T.andamentos.push(a);
  T.andamentos_lidos.push({ andamento_id: a.id, colaborador_id: PAULO }); return a; };
const tarefa = (a, quem, o = {}) => { const t = { id: id("f"), andamento_id: a.id, caso_id: a.caso_id, colaborador_id: quem, atribuido_por: PAULO,
  lembrar_em: null, natureza: "fatal", papel: "executa", concluida_em: null, iniciada_em: null, etapas: [], criado_em: a.criado_em, ...o };
  T.andamento_tarefas.push(t); return t; };

const dVivo = util(6), dVenc = (() => { let k = -3; while ([0, 6].includes(new Date(iso(k) + "T12:00:00").getDay())) k--; return k; })();
const cA = cli("Ana Fictícia Prazos");
const kA1 = caso(cA, { beneficio: "Auxílio por incapacidade", especie: "B31", fase: "inss", protocolos: ["1700000601"], prazo: iso(dVivo) });
const nVivo = and(kA1, -2, `⏰ [PRAZO ${br(iso(dVivo))}] Recurso ao CRPS (ordinário ou especial) — 30 dias corridos (art. 77 do Regimento Interno do CRPS), intimação de ${br(iso(dVivo - 30))}. Indeferido o B31 pela perícia. Recorrer ao CRPS com o relatório novo do ortopedista.`);
const tVivo = tarefa(nVivo, PAULO, { lembrar_em: iso(dVivo), etapas: [{ t: "Pedir o relatório", feito: true, por: PAULO, em: ts(-1) }, { t: "Redigir o recurso", feito: false }] });
const tRev = tarefa(nVivo, MARCOS, { lembrar_em: iso(dVivo), papel: "revisa" });
// a minha tarefa comum (o prazo adicional da resposta), que a janela conclui pelo "Concluir a minha tarefa"
const nAd = and(kA1, -1, `Prazo adicional · prazo adicional até ${iso(util(9)).split("-").reverse().join("/")}`);
const tAd = tarefa(nAd, PAULO, { lembrar_em: iso(util(9)), natureza: "compromisso" });
const kA2 = caso(cA, { beneficio: "Apos. por Idade", especie: "B41", fase: "judicial", processo: "50000000000000000001", prazo: iso(dVenc) });
const nVenc = and(kA2, -20, `⏰ [PRAZO ${br(iso(dVenc))}] Apelação contra a sentença de improcedência.`);
tarefa(nVenc, MARCOS, { lembrar_em: iso(dVenc) });
const nOk = and(kA2, -40, `⏰ [PRAZO ${br(iso(-30))}] Réplica à contestação do INSS.`);
and(kA2, -33, `✔ [PRAZO CUMPRIDO] Réplica protocolada no PJe. (cumprido em ${iso(-33).split("-").reverse().join("/")})`, { responde_a: nOk.id });

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
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const foto = n => p.screenshot({ path: path.join(OUT, n + ".png") });
  const abrir = async (aba, k) => { await p.evaluate(async ([c, aba, k]) => { await abrirFicha(c); const m = document.getElementById("modal"); if (m) m.style.display = "none";
    casoSel = k; abaAtiva = aba; subAba = "escritorio"; repintarFicha(); }, [cA.id, aba, k || kA1.id]); await p.waitForTimeout(300); };

  // ── 1. a aba Prazos ──────────────────────────────────────────────────────
  await abrir(2);
  await p.click('.mt[data-vv="5"]');
  await p.waitForSelector(".pzc-hero");
  const aba = await p.evaluate(() => ({ hero: document.querySelector(".pzc-hero h2").textContent, n: document.querySelector(".pzc-hero-n b").textContent,
    venc: document.querySelector(".pzc-tile-venc b") && document.querySelector(".pzc-tile-venc b").textContent,
    grupos: [...document.querySelectorAll(".pzc-gt > span:first-child")].map(x => x.textContent), linhas: document.querySelectorAll(".pzc-lin").length }));
  conf("a aba abre pelo próximo prazo fatal, em número grande", /Recurso ao CRPS/.test(aba.hero) && /^\d+$/.test(aba.n));
  conf("o quadro dos vencidos conta o vencido", aba.venc === "1");
  conf("os prazos vêm por data, com o grupo dos vencidos primeiro", aba.grupos[0] === "Vencidos" && aba.linhas >= 2);
  await foto("01-aba");
  await p.evaluate(() => pzNat("fatal"));
  conf("o filtro da natureza deixa só os prazos fatais", await p.evaluate(() => [...document.querySelectorAll(".pzc-lin")].every(l => l.dataset.nat === "fatal")));
  await p.evaluate(() => pzNat("todos"));

  // ── 2. a janela do prazo, por cima da aba ────────────────────────────────
  await p.click(".pzc-hero .pzc-pri");
  await p.waitForSelector("#painel-prazo.aberto.pp-prazo"); await p.waitForTimeout(350);
  const jan = await p.evaluate(() => { const el = document.getElementById("painel-prazo");
    return { sobre: el.classList.contains("pp-sobre"), veu: !!document.getElementById("pp-veu"), h2: el.querySelector("h2").textContent,
      larg: Math.round(el.getBoundingClientRect().width), uteis: /dias? úteis|é o último dia/.test(el.querySelector(".ppz-quanto").textContent),
      conta: (el.querySelector(".ppz-conta") || {}).textContent || "", pri: (el.querySelector(".pp-pri") || {}).textContent || "",
      tarefa: !!el.querySelector(".ppz-tarefa .ppz-est"), etapas: el.querySelectorAll(".ppz-ets .pp-et").length, hist: el.querySelectorAll(".ppz-hist li").length }; });
  conf("a janela abre por cima da aba, com o véu, em 480 px", jan.sobre && jan.veu && jan.larg === 480);
  conf("o título é o do catálogo e o quanto falta vem em dias úteis", /Recurso ao CRPS/.test(jan.h2) && jan.uteis);
  conf("a conta do catálogo explica a data", /30 dias corridos/.test(jan.conta));
  conf("o principal é Cumpri o prazo", /Cumpri o prazo/.test(jan.pri));
  conf("a tarefa de quem faz traz o estado e as etapas", jan.tarefa && jan.etapas === 2);
  conf("o histórico traz a anotação, a tarefa e a etapa", jan.hist >= 3);
  await foto("02-janela");
  await p.keyboard.press("Escape");
  await p.waitForTimeout(200);
  conf("o Esc fecha a janela e tira o véu", await p.evaluate(() => !document.querySelector("#painel-prazo.aberto") && !document.getElementById("pp-veu")));

  // ── 3. o prazo na anotação: vivo, cumprido e vencido ────────────────────
  await abrir(2, kA1.id);
  await p.waitForSelector(".timeline .tl-pz-vivo");
  const viva = await p.evaluate(id => { const li = [...document.querySelectorAll(".timeline li.tl-card")].find(x => x.querySelector(`[onclick*="${id}"]`));
    return { faixa: (li.querySelector(".tl-pz-vivo") || {}).textContent || "", bt: !!li.querySelector(".tl-pz-cumpri"),
      semCarimbo: !/\[PRAZO|30 dias corridos \(art/.test(li.querySelector(".tl-corpo").textContent) }; }, nVivo.id);
  conf("a anotação viva traz a faixa com o que é, quando vence e quanto falta", /Recurso ao CRPS/.test(viva.faixa) && /vence/.test(viva.faixa) && /Abrir/.test(viva.faixa));
  conf("o cabeçalho oferece Cumpri o prazo e o carimbo sai do texto", viva.bt && viva.semCarimbo);
  await foto("03-anotacao-viva");
  await p.evaluate(id => cumpriNaNota(id), nVivo.id);
  await p.waitForSelector(".tl-pz-form #tpf-txt");
  conf("o formulário diz quem conclui e quem revisa", /Concluir a tarefa de Paulo e avisar Marcos, que revisa/.test(await p.textContent(".tl-pz-form")));
  await p.fill("#tpf-txt", "Recurso ordinário protocolado no Meu INSS.");
  await p.fill("#tpf-data", iso(-1));
  await p.setInputFiles("#tpf-arq", { name: "comprovante do protocolo.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 ficticio") });
  await foto("04-cumprindo");
  banco.escritas.length = 0;
  await p.click(".tl-pz-f-ok");
  await p.waitForTimeout(800);
  const esc = banco.escritas;
  const resp = esc.find(e => e.m === "POST" && e.t === "andamentos");
  conf("o cumprimento grava a resposta à anotação, com a data", resp && resp.corpo.responde_a === nVivo.id
    && /^✔ \[PRAZO CUMPRIDO\] Recurso ordinário protocolado no Meu INSS\. \(cumprido em \d\d\/\d\d\/\d{4}\)/.test(resp.corpo.texto));
  conf("o prazo sai do caso", esc.some(e => e.m === "PATCH" && e.t === "casos" && e.corpo.prazo === null));
  conf("conclui a tarefa de quem faz e deixa a revisão", esc.some(e => e.m === "PATCH" && e.t === "andamento_tarefas" && e.ids.includes(tVivo.id))
    && !esc.some(e => e.m === "PATCH" && e.t === "andamento_tarefas" && e.ids.includes(tRev.id)));
  conf("o comprovante sobe e fica preso à resposta", esc.some(e => e.t === "storage") && esc.some(e => e.m === "POST" && e.t === "anexos" && e.corpo.andamento_id === (T.andamentos.find(a => a.responde_a === nVivo.id) || {}).id));
  conf("quem revisa é avisado", esc.some(e => e.m === "POST" && e.t === "mencoes" && JSON.stringify(e.corpo).includes(MARCOS)));
  await p.waitForSelector(".timeline .tl-pz-ok");
  const cump = await p.evaluate(id => { const li = [...document.querySelectorAll(".timeline li.tl-card")].find(x => x.querySelector(".tl-pz-ok"));
    return { faixa: li.querySelector(".tl-pz-ok").textContent, resp: (li.querySelector(".tl-pz-resp") || {}).textContent || "", doc: !!li.querySelector(".tl-pz-doc") }; });
  conf("a anotação passa à faixa verde do cumprido, com quem e quando", /cumprido/.test(cump.faixa) && /por Paulo/.test(cump.faixa) && /antes do vencimento/.test(cump.faixa));
  conf("a resposta mostra o selo e o comprovante", cump.resp === "Prazo cumprido" && cump.doc);
  await foto("05-cumprido");

  await abrir(2, kA2.id);
  await p.waitForSelector(".timeline .tl-pz-alerta");
  const venc = await p.evaluate(() => { const li = document.querySelector(".timeline li.tl-pz-venc");
    return { li: !!li, al: (li && li.querySelector('.tl-pz-alerta[role="alert"]') || {}).textContent || "", ok: document.querySelectorAll(".timeline .tl-pz-ok").length }; });
  conf("o vencido sem registro tem o cartão vermelho e o alerta", venc.li && /venceu/.test(venc.al) && /A tarefa de Marcos segue aberta/.test(venc.al)
    && /Foi cumprido/.test(venc.al) && /Não foi cumprido/.test(venc.al));
  conf("a réplica cumprida pela resposta antiga aparece cumprida", venc.ok === 1);
  await foto("06-vencido");
  await p.evaluate(id => registrarNaoCumprido(id, document.querySelector(".timeline li.tl-pz-venc .tl-pz-nao").getAttribute("onclick").match(/'([^']+)'\)$/)[1]), kA2.id);
  await p.waitForSelector("#pzn-txt");
  await p.fill("#pzn-txt", "A sentença transitou sem recurso.");
  banco.escritas.length = 0;
  await p.evaluate(() => document.querySelector('#modal button.forte, .caixa button.forte, button.btn-mini.forte').click());
  await p.waitForTimeout(600);
  const nao = banco.escritas.find(e => e.m === "POST" && e.t === "andamentos");
  conf("o não cumprido grava a resposta e encerra a tarefa de quem fazia", nao && nao.corpo.responde_a === nVenc.id && /^✖ \[PRAZO NÃO CUMPRIDO\] A sentença/.test(nao.corpo.texto)
    && banco.escritas.some(e => e.m === "PATCH" && e.t === "andamento_tarefas" && e.corpo.concluida_em));

  // ── 4. a janela pela anotação sem tarefa aberta ──────────────────────────
  await p.evaluate(([k, a]) => abrirPainelTarefa(k, a), [kA2.id, nOk.id]);
  await p.waitForSelector("#painel-prazo.aberto"); await p.waitForTimeout(350);
  conf("a anotação sem tarefa aberta também abre a janela", /Réplica/.test(await p.textContent("#painel-prazo h2")));
  await p.evaluate(() => fecharPainelPrazo());

  // ── 5. o campo de escrever ───────────────────────────────────────────────
  await abrir(2, kA1.id);
  await p.click("#and-texto");
  await p.waitForSelector(".esc-tg-pz");
  await p.evaluate(() => { const t = document.getElementById("and-texto"); t.value = "Recorrer ao CRPS."; t.dispatchEvent(new Event("input", { bubbles: true })); });
  await p.click(".esc-tg-pz");
  await p.waitForSelector("#esc-pnl-pz:not([hidden])");
  await p.evaluate(d => { document.getElementById("and-de").value = d; const sel = document.getElementById("and-cat"); sel.value = "crps"; sel.dispatchEvent(new Event("change")); }, iso(-2));
  const comp = await p.evaluate(() => ({ data: document.getElementById("and-prazo-data").value, n: document.getElementById("pzx-n").textContent,
    expl: document.getElementById("pzx-expl").textContent, quem: (document.querySelector("#esc-pnl-pz .pzx-q.on") || {}).textContent,
    frase: document.getElementById("esc-frase").textContent }));
  conf("o catálogo calcula a data e o quadro diz quanto falta", comp.data >= iso(28) && /^\d+/.test(comp.n) && /30 dias corridos/.test(comp.expl));
  conf("quem faz vem do advogado do cliente e entra na frase", !!comp.quem && /marca prazo fatal em \d\d\/\d\d\/\d{4}, com a tarefa de/.test(comp.frase));
  conf("quem faz: só o escolhido fica cheio", await p.evaluate(() => { const bs = [...document.querySelectorAll("#esc-pnl-pz .pzx-q")];
    return bs.length > 1 && bs.filter(b => !b.classList.contains("on")).every(b => getComputedStyle(b).backgroundColor === "rgb(255, 255, 255)"); }));
  await foto("07-escrever");
  await p.evaluate(() => { document.querySelector('#esc-pnl-pz .pzx-q[data-pzq="22222222-2222-2222-2222-222222222222"]').click(); });
  banco.escritas.length = 0;
  await p.evaluate(k => novoAndamento(k), kA1.id);
  await p.waitForTimeout(800);
  const nova = banco.escritas.find(e => e.m === "POST" && e.t === "andamentos");
  const tfs = banco.escritas.filter(e => e.m === "POST" && e.t === "andamento_tarefas").map(e => e.corpo);
  conf("a anotação nasce com o carimbo do catálogo", nova && /^⏰ \[PRAZO \d\d\.\d\d\.\d{4}\] Recurso ao CRPS \(ordinário ou especial\) — 30 dias corridos/.test(nova.corpo.texto));
  conf("o prazo nasce com a tarefa fatal de quem faz", tfs.some(t => t.colaborador_id === MARCOS && t.natureza === "fatal" && t.papel !== "revisa"));

  // ── 6. o celular ─────────────────────────────────────────────────────────
  await p.setViewportSize({ width: 390, height: 844 });
  await abrir(5);
  await p.waitForSelector(".pzc-lin");
  const cel = await p.evaluate(() => { const l = document.querySelector(".pzc-lin"), a = l.querySelector(".pzc-abrir").getBoundingClientRect(), r = l.getBoundingClientRect();
    return { seg: getComputedStyle(document.querySelector(".pzc-seg")).display, cobre: Math.abs(a.width - r.width) < 3 && Math.abs(a.height - r.height) < 3,
      caso: getComputedStyle(l.querySelector(".pzc-caso-c")).display !== "none", rola: document.documentElement.scrollWidth <= 390 }; });
  conf("no celular a lista vira cartões que se tocam inteiros", cel.seg === "none" && cel.cobre && cel.caso);
  conf("no celular a aba não rola de lado", cel.rola);
  conf("a revisão que fica depois do cumprido é compromisso, e não prazo fatal", await p.evaluate(() =>
    [...document.querySelectorAll('.pzc-lin[data-nat="compromisso"]')].some(l => /revisa/i.test(l.textContent))
    && ![...document.querySelectorAll('.pzc-lin[data-nat="fatal"]')].some(l => /revisa/i.test(l.textContent))));
  await foto("08-celular-aba");
  await p.evaluate(() => document.querySelector(".pzc-lin .pzc-abrir").click());
  await p.waitForSelector("#painel-prazo.aberto"); await p.waitForTimeout(350);
  const celJ = await p.evaluate(() => { const el = document.getElementById("painel-prazo");
    return { larg: Math.round(el.getBoundingClientRect().width), volta: getComputedStyle(el.querySelector(".ppz-volta")).display !== "none" }; });
  conf("no celular a janela ocupa a tela e volta por ‹ Prazos", celJ.larg === 390 && celJ.volta);
  await foto("09-celular-janela");
  await p.evaluate(() => fecharPainelPrazo());
  await p.evaluate(() => [...document.querySelectorAll(".pzc-lin")].find(l => /prazo adicional/i.test(l.textContent)).querySelector(".pzc-abrir").click());
  await p.waitForSelector("#painel-prazo.aberto"); await p.waitForTimeout(350);
  const peAd = await p.evaluate(() => { const el = document.getElementById("painel-prazo"), pe = el.querySelector(".ppz-pe");
    const vis = [...pe.children].filter(b => b.offsetParent && b.textContent.trim());
    return { bts: vis.map(b => b.textContent.trim()), dentro: vis.every(b => b.getBoundingClientRect().right <= 391), x: el.getBoundingClientRect().left,
      larg: document.documentElement.scrollWidth }; });
  conf("no celular a janela da minha tarefa tem só Concluir e o ⋯, dentro da tela", peAd.dentro && peAd.x === 0 && peAd.larg <= 390
    && peAd.bts.some(t => /Concluir a minha tarefa/.test(t)) && !peAd.bts.some(t => /✔ feito|✎ escrever/.test(t)));
  if (!peAd.dentro || peAd.x) console.log(JSON.stringify(peAd));
  await p.evaluate(() => { const c = document.querySelector("#painel-prazo .ppz-corpo"); c.parentNode.scrollTop = 1e5; document.getElementById("painel-prazo").scrollTop = 1e5; });
  await foto("10-celular-minha-tarefa");
  banco.escritas.length = 0;
  await p.evaluate(() => document.querySelector("#painel-prazo .pp-pri").click());
  await p.waitForTimeout(500);
  conf("o Concluir da janela conclui a tarefa e fecha a janela", banco.escritas.some(e => e.m === "PATCH" && e.t === "andamento_tarefas" && e.ids.includes(tAd.id))
    && await p.evaluate(() => !document.querySelector("#painel-prazo.aberto")));

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
