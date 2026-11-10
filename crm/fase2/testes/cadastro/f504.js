// F504 · os quadros Prazos e do caso (protótipo do Lovable aprovado pelo Paulo, 10.11.2026): Prazos com o cabeçalho vermelho, o
// dia, a natureza (Prazo fatal, Tarefa, Lembrete…) e quanto falta; o quadro do caso com o cabeçalho na cor de onde o caso está,
// o lugar no canto direito, a grade de datas e "Números do caso e gestão". Banco simulado, dados fictícios. Uso: node f503.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f504";
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


const dVivo = util(6);
const cA = cli("Ana Fictícia Quadro");
const kA = caso(cA, { beneficio: "Apos. por Idade", especie: "B41", fase: "judicial", processo: "50000000000000000001", der: "2025-03-10", nb: "1234567890", prazo: iso(dVivo) });
const nA = and(kA, -2, `⏰ [PRAZO ${br(iso(dVivo))}] Apelação contra a sentença de improcedência, com o relatório novo do ortopedista e a discussão inteira do laudo.`);
tarefa(nA, PAULO, { lembrar_em: iso(dVivo) });
const cB = cli("Bruno Fictício Quadro");
const kB = caso(cB, { beneficio: "Auxílio por incapacidade", especie: "B31", fase: "inss", protocolos: ["1700000701"], der: "2026-09-01" });

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
  const abrir = (c, k) => p.evaluate(async ([c, k]) => { await abrirFicha(c); const m = document.getElementById("modal"); if (m) m.style.display = "none";
    casoSel = k; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); }, [c, k]);
  const ler = () => p.evaluate(() => {
    const q = document.querySelector(".faixa-prazos.fp5") || document.createElement("div"), c = document.querySelector(".linha-caso.lc5"), cab = c.querySelector(".lc5-cab");
    return { tit: (q.querySelector(".fp-tit") || {}).textContent, n: (q.querySelector(".fp5-n") || {}).textContent, 
      rots: [...q.querySelectorAll(".fp5-linhas .fp3-tit")].map(e => e.textContent), chips: [...q.querySelectorAll(".fp5-linhas .fp5-chip")].map(e => e.textContent),
      vis: (() => { const l = q.querySelector(".fp5-linhas"); if (!l) return ""; const x = l.cloneNode(true); x.querySelectorAll(".sr-only").forEach(e => e.remove()); return x.textContent.replace(/\s+/g, " "); })(), cor: c.style.getPropertyValue("--lc-cor").trim(), lugar: cab.querySelector(".lc5-lugar").textContent,
      esp: cab.querySelector(".lc5-esp").textContent, cabFundoCaso: getComputedStyle(cab).backgroundColor,
      concluirNoMenu: !!c.querySelector(".lc-menu .desp-bt"), concluirFora: [...c.querySelectorAll(".desp-bt")].some(b => !b.closest(".lc-menu")),
      copiar: !!c.querySelector(".lc-placa button.cop, .lc-placa .lc-copiar"), der: (c.querySelector(".lc5-grade .lc-num") || {}).textContent,
      derFonte: getComputedStyle(c.querySelector(".lc5-grade .lc-num")).fontFamily, nbFonte: getComputedStyle(c.querySelector(".lc5-grade .lc-nb .lc-num, .lc5-grade .lc-prot .lc-num") || c).fontFamily,
      pe: c.querySelector(".lc-mais-pe").textContent.trim(), tramFora: !!c.querySelector(".lc5-grade .lc-tram-link"),
      sobra: [...c.querySelectorAll(".lc5-grade .lc-f")].filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent.trim().slice(0,40) + " " + e.scrollWidth + "/" + e.clientWidth).join(" | ") };
  });
  await abrir(cA.id, kA.id);
  await p.waitForSelector(".faixa-prazos.fp5"); await p.waitForTimeout(300);
  let v = await ler();
  conf(`o quadro se chama Prazos e traz o número de datas (${v.tit} · ${v.n})`, v.tit === "Prazos" && +v.n >= 1);
  conf(`cada linha diz apenas a natureza (${v.rots.join(", ")})`, v.rots.length >= 1 && v.rots.every(r => /^(Prazo fatal|Tarefa|Lembrete|Compromisso|Audiência|Perícia médica|Avaliação social|Retorno)$/.test(r)));
  conf(`a linha não repete a explicação do prazo (${v.vis.slice(0, 80)})`, !/Apelação contra|PRAZO FATAL|Vence ·/.test(v.vis));
  conf(`quanto falta vem no chip (${v.chips.join(", ")})`, v.chips.length >= 1 && v.chips.every(c => /\d|hoje|amanhã/i.test(c)));
  conf(`no Judicial o cabeçalho do caso é roxo e o canto diz Judicial (${v.cor}, ${v.lugar})`, v.cor.toUpperCase() === "#6B3FA0" && v.lugar === "Judicial");
  conf(`a espécie fica no cabeçalho (${v.esp})`, v.esp === "B41");
  conf("o Concluir mora no ⋯ e não fica à vista", v.concluirNoMenu && !v.concluirFora);
  conf("sem botão de copiar: o toque no número copia", !v.copiar);
  conf(`a DER na fonte do CRM e o NB na de código (${v.derFonte.split(",")[0]} · ${v.nbFonte.split(",")[0]})`, /Plex Sans|system|sans/i.test(v.derFonte) && /Mono|mono/i.test(v.nbFonte));
  conf(`o pé diz Números do caso e gestão e a tramitação fica nele (${v.pe})`, v.pe === "Números do caso e gestão" && !v.tramFora);
  conf(`nenhum valor da grade passa da borda (${v.sobra})`, !v.sobra);
  await p.screenshot({ path: OUT + "/1-judicial.png" });
  await p.click(".linha-caso.lc5 .lc-mais-pe"); await p.waitForTimeout(300);
  const tram = await p.evaluate(() => ({ ok: !!document.querySelector(".linha-caso.lc5 .lc5-tram"), txt: (document.querySelector(".linha-caso.lc5 .lc-numeros, .linha-caso.lc5 .lc-mais-corpo") || {}).textContent || document.querySelector(".linha-caso.lc5").className }));
  conf(`Números do caso e gestão abre a tramitação (${String(tram.txt).replace(/\s+/g," ").slice(0,120)})`, tram.ok);

  await abrir(cB.id, kB.id); await p.waitForTimeout(300);
  v = await ler();
  conf(`no INSS o cabeçalho é azul e o canto diz INSS (${v.cor}, ${v.lugar})`, v.cor.toUpperCase() === "#4F78B0" && v.lugar === "INSS");

  await p.setViewportSize({ width: 390, height: 844 });
  await abrir(cA.id, kA.id); await p.waitForTimeout(400);
  conf("no celular os quadros não rolam de lado", await p.evaluate(() => [".faixa-prazos.fp5", ".linha-caso.lc5"].every(s => { const q = document.querySelector(s); return !q || q.scrollWidth <= q.clientWidth + 1; })));
  conf("sem erro de página", !erros.length);
  console.log(erros.join("\n"));
  console.log(`${ok.filter(([, v]) => v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ok.every(([, v]) => v) && !erros.length ? 0 : 1);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
