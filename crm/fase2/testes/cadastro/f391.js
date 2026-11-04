// F391 · o campo de escrever compacto e os botões da anotação sem borda (proposta A, escolha do Paulo de 04.11.2026):
// fechado numa linha com Sem resposta e Pedir; aberto, uma barra só com Tipo, as chaves e os ícones, e o pé com Ao registrar,
// os gestos de um clique e o Registrar, vermelho com prazo fatal; a Tarefa em grade; no celular, os flutuantes somem.
// Banco simulado e dados fictícios. Uso: node f391.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f391";
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
const br = d => d.split("-").reverse().join(".");
const util = n => { let k = n; while ([0, 6].includes(new Date(iso(k) + "T12:00:00").getDay())) k++; return k; };
let seq = 0;
const id = p => `${p}0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const c = { id: id("c"), nome: "Rita Fictícia Linha", cpf: null, telefone: null, campos: {}, telefones: [], criado_em: ts(-400) }; T.clientes.push(c);
const k = { id: id("b"), cliente_id: c.id, titulo: c.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
  marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, dcb_prorrogacao_pedida: false, origem_lista: "🌻 INSS",
  criado_em: ts(-300), beneficio: "Auxílio por incapacidade", especie: "B31", fase: "inss", protocolos: ["1700000801"] };
T.casos.push(k); T.atribuicoes.push({ caso_id: k.id, colaborador_id: PAULO });
const and = (n, texto, o = {}, lida = true) => { const a = { id: id("e"), caso_id: k.id, autor_id: PAULO, texto, origem: "app", origem_id: null, criado_em: ts(n, o.h || "12:00"),
  publico: false, excluir: false, importante: false, urgente: false, responde_a: null, ...o }; delete a.h; T.andamentos.push(a);
  if (lida) T.andamentos_lidos.push({ andamento_id: a.id, colaborador_id: PAULO }); return a; };
const dVivo = util(8);
const nPz = and(-3, `⏰ [PRAZO ${br(iso(dVivo))}] Cumprir a exigência do INSS.`);
T.andamento_tarefas.push({ id: id("f"), andamento_id: nPz.id, caso_id: k.id, colaborador_id: MARCOS, atribuido_por: PAULO, lembrar_em: iso(dVivo),
  natureza: "fatal", papel: "executa", concluida_em: null, iniciada_em: null, etapas: [], criado_em: nPz.criado_em });
const nImp = and(-2, "Cliente trouxe o relatório do ortopedista; juntar ao pedido.", { importante: true });
and(-2, "Relatório juntado no Meu INSS.", { responde_a: nImp.id, autor_id: MARCOS, h: "15:00" });
const nNova = and(-1, "@Paulo a perícia foi remarcada pelo INSS, conferir a data.", { autor_id: MARCOS }, false);
T.mencoes.push({ id: id("m"), andamento_id: nNova.id, caso_id: k.id, para_id: PAULO, de_id: MARCOS, lida: false, criado_em: nNova.criado_em });

const ok = [];
const conf = (nome, v) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); };

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const erros = [];
  const pagina = async (opc) => {
    const ctx = await nav.newContext(opc);
    await ctx.addInitScript(([u, ss]) => {
      localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
      localStorage.setItem("crm_sessao", JSON.stringify(ss));
      localStorage.setItem("crm_tema", "v10");
    }, [SUPA, SESSAO]);
    await instalarBanco(ctx, { SUPA, SESSAO, banco });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    const p = await ctx.newPage();
    p.on("pageerror", e => erros.push(e.message));
    p.on("dialog", d => d.accept());
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
    await p.waitForSelector("#app.logado", { timeout: 15000 });
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
    await p.evaluate(([cid, kid]) => { abrirFicha(cid).then(() => { casoSel = kid; abaAtiva = 2; repintarFicha(); }); }, [c.id, k.id]);
    await p.waitForSelector(".timeline li.tl-card"); await p.waitForTimeout(500);
    return p;
  };
  const r = (p, sel) => p.evaluate(q => { const e = document.querySelector(q); if (!e || !e.offsetParent && getComputedStyle(e).position !== "fixed") return null;
    const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, h: b.height }; }, sel);
  const vis = (p, sel) => p.evaluate(q => { const e = document.querySelector(q); return !!e && getComputedStyle(e).display !== "none" && e.getBoundingClientRect().height > 0; }, sel);

  // ── 1 · computador, fechado ──
  const p = await pagina({ viewport: { width: 1440, height: 1000 } });
  await p.evaluate(() => irSubAba("escritorio")); await p.waitForTimeout(300);
  const tx = await r(p, "#and-texto"), sr = await r(p, ".esc-v12 .tipo-sr");
  conf("fechado, o campo é uma linha com Sem resposta e Pedir ao lado", tx && sr && tx.r <= sr.l && Math.abs((tx.t + tx.h / 2) - (sr.t + sr.h / 2)) < 8 && await vis(p, ".esc-v12 .tipo-pc"));
  conf("fechado, as chaves ficam escondidas", !(await vis(p, ".esc-v12 .esc-tgs")));
  conf("o Pedir mostra uma palavra e diz 'ao cliente' ao leitor de tela", await p.evaluate(() => { const b = document.querySelector(".tipo-pc"); return b.firstChild.textContent.trim() === "Pedir" && b.textContent.trim() === "Pedir ao cliente"; }));

  await p.locator(".escrever.esc-v12").screenshot({ path: OUT + "/fechado.png" });
  // ── 2 · computador, aberto ──
  await p.click("#and-texto"); await p.waitForTimeout(250);
  const barra = await p.evaluate(() => {
    const l = document.querySelector(".esc-v12 .esc-tgs"), y = e => { const b = e.getBoundingClientRect(); return b.top + b.height / 2; };
    const it = [l.querySelector(".tipo-mais > summary"), ...l.querySelectorAll(".esc-tg"), ...l.querySelectorAll(".esc-ic:not(.urg)")];
    return { umaLinha: it.every(e => Math.abs(y(e) - y(it[0])) < 6), semBorda: [...l.querySelectorAll(".esc-tg,.esc-ic")].every(e => getComputedStyle(e).borderTopWidth === "0px"),
      tipoNaBarra: !!l.querySelector(".tipo-ch[data-tipoand]"), prazo: [...l.querySelector(".esc-tg-pz").childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join("").trim() };
  });
  conf("aberto, Tipo, as três chaves e os ícones numa barra só", barra.umaLinha && barra.tipoNaBarra);
  conf("as chaves e os ícones ficam sem borda", barra.semBorda);
  conf("a chave do prazo diz uma palavra: Prazo", barra.prazo === "Prazo");
  const pe = await p.evaluate(() => { const f = document.querySelector(".esc-v12 .esc-fim"), y = e => { const b = e.getBoundingClientRect(); return b.top + b.height / 2; };
    const it = [f.querySelector(".esc-frase"), f.querySelector(".tipo-sr"), f.querySelector(".tipo-pc"), f.querySelector(".sug-abrir"), f.querySelector(".esc-reg")];
    return it.map(e => e && [e.className, e.offsetParent ? Math.round(y(e)) : null]); });
  conf("o pé traz Ao registrar, Sem resposta, Pedir, Sugestões e o Registrar na mesma linha", pe.every(x => x && x[1] !== null && Math.abs(x[1] - pe[4][1]) < 8));
  const cor0 = await p.evaluate(() => getComputedStyle(document.querySelector(".esc-v12 .esc-reg")).backgroundColor);
  await p.evaluate(() => document.querySelector(".esc-tg-pz").click()); await p.waitForTimeout(250);
  const cor1 = await p.evaluate(() => getComputedStyle(document.querySelector(".esc-v12 .esc-reg")).backgroundColor);
  conf("com o Prazo ligado, o Registrar fica vermelho", cor1 === "rgb(179, 38, 30)" && cor0 !== cor1);
  await p.evaluate(() => document.querySelector(".esc-tg-pz").click());
  await p.evaluate(() => document.querySelector('.tf-nt[data-nat="compromisso"]').click()); await p.waitForTimeout(250);
  const grade = await p.evaluate(() => { const q = document.getElementById("esc-pnl-tf"), [a, b] = q.querySelectorAll(".rotulo-rap"), [pa, pb] = q.querySelectorAll(".esc-pes");
    const L = e => e.getBoundingClientRect().left; return getComputedStyle(q).display === "grid" && Math.abs(L(a) - L(b)) < 2 && Math.abs(L(pa) - L(pb)) < 2; });
  conf("na Tarefa, Quem faz e Quando ficam alinhados em grade", grade);
  await p.locator(".escrever.esc-v12").screenshot({ path: OUT + "/aberto.png" });

  // ── 3 · o cartão ──
  const bt = await p.evaluate(() => { const b = [...document.querySelectorAll(".timeline .tl-barra:not(.tl-barra-of) > .tl-bt")]; return {
    n: b.length, semBorda: b.filter(x => !x.classList.contains("forte")).every(x => getComputedStyle(x).borderTopColor === "rgba(0, 0, 0, 0)"),
    prazo: b.some(x => x.firstChild.textContent.trim() === "Prazo" && /adicional/.test(x.textContent)) }; });
  conf("no cartão, Responder e Prazo ficam em texto, sem borda", bt.n > 0 && bt.semBorda && bt.prazo);

  // ── 4 · celular ──
  const m = await pagina({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await m.evaluate(() => irSubAba("escritorio")); await m.waitForTimeout(300);
  conf("no celular, fechado, Sem resposta e Pedir à vista", await vis(m, ".esc-v12 .tipo-sr") && await vis(m, ".esc-v12 .tipo-pc"));
  conf("no celular, o lembrete das chaves não aparece", !(await vis(m, ".esc-v12 .esc-dica")));
  await m.tap("#and-texto"); await m.waitForTimeout(300);
  conf("no celular, com o campo aberto, os flutuantes somem", !(await vis(m, "#fab-rapida")) && !(await vis(m, "#fab-sug")));
  const larg = await m.evaluate(() => { const e = document.querySelector(".escrever.esc-v12"); return [...e.querySelectorAll("button,label,summary")].filter(x => x.offsetParent && !x.closest(".sugestoes")).filter(x => x.getBoundingClientRect().right > e.getBoundingClientRect().right + 1).map(x => x.className + "|" + x.textContent.trim().slice(0, 20)); });
  console.log(JSON.stringify(larg));
  conf("no celular, nenhum botão do campo passa da borda", !larg.length);
  await m.screenshot({ path: OUT + "/celular.png", fullPage: false });

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
