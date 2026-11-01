// F333 · a tela do caso integrada com a aba Prazos (proposta aprovada pelo Paulo, 31.10.2026): o quadro do caso acima do
// cartão, o próximo prazo fatal em destaque com o "Cumpri o prazo", as linhas com o que são, o pé com os outros casos e o
// prazo oferecido pela etapa (Criar o prazo, Não se aplica). Banco simulado, dados fictícios. Uso: node f333.js [pasta-das-fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f333";
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
const kA2 = caso(cA, { beneficio: "Apos. por Idade", especie: "B41", fase: "judicial", processo: "50000000000000000001", prazo: iso(dVenc) });
const nVenc = and(kA2, -20, `⏰ [PRAZO ${br(iso(dVenc))}] Apelação contra a sentença de improcedência.`);
tarefa(nVenc, MARCOS, { lembrar_em: iso(dVenc) });
const nOk = and(kA2, -40, `⏰ [PRAZO ${br(iso(-30))}] Réplica à contestação do INSS.`);
and(kA2, -33, `✔ [PRAZO CUMPRIDO] Réplica protocolada no PJe. (cumprido em ${iso(-33).split("-").reverse().join("/")})`, { responde_a: nOk.id });

const cB = cli("Bruno Fictício Etapa");
const kB = caso(cB, { beneficio: "Aposentadoria por idade", especie: "B41", fase: "judicial", processo: "50000000000000000002", etapa: "contestação apresentada", origem_lista: "👪 Judicial" });
and(kB, -2, "O INSS apresentou contestação.");

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
  await abrir(cA.id, kA1.id);
  await p.waitForSelector(".caso-pz .fp3-hero"); await p.waitForTimeout(300);
  const a = await p.evaluate(() => { const h = document.querySelector(".caso-pz .fp3-hero"), q = document.querySelector(".caso-pz").getBoundingClientRect(),
      e = document.querySelector(".caso-esq:not(.caso-pz)").getBoundingClientRect(), out = document.querySelector(".caso-pz .fp3-out");
    return { tit: document.querySelector(".caso-pz .fp-tit").textContent, hero: h.textContent.replace(/\s+/g, " "), botoes: [...h.querySelectorAll("button")].map(b => b.textContent.trim()),
      acima: q.bottom <= e.top + 1, out: out ? out.textContent.replace(/\s+/g, " ") : "", etapa: !!document.querySelector(".caso-pz .fp3-etapa") }; });
  conf("o quadro se chama Prazos deste caso e fica acima do cartão do caso", a.tit === "Prazos deste caso" && a.acima);
  conf(`o próximo prazo fatal abre o quadro com o que é e quanto falta (${a.hero.slice(0, 90)})`, /Próximo prazo fatal/.test(a.hero) && /Recurso ao CRPS/.test(a.hero) && /dias? úte?is|dias? corridos/.test(a.hero));
  conf(`o destaque traz Abrir o prazo e Cumpri o prazo (${a.botoes.join(", ")})`, a.botoes.includes("Abrir") && a.botoes.includes("Cumprido"));
  conf(`o pé diz os outros casos do cliente e quantos venceram (${a.out})`, /Outros casos do cliente: \d+ datas?/.test(a.out) && /1 vencida/.test(a.out));
  conf("com prazo fatal em aberto, a etapa não oferece outro", !a.etapa);
  await p.screenshot({ path: OUT + "/1-caso.png" });
  await p.click(".caso-pz .fp3-hero .fp3-pri"); await p.waitForTimeout(300);
  conf("Abrir o prazo abre a janela do prazo", await p.evaluate(() => !!document.querySelector(".pp-prazo:not([hidden])")));
  await p.keyboard.press("Escape");

  await abrir(cB.id, kB.id);
  await p.waitForSelector(".caso-pz .fp3-etapa"); await p.waitForTimeout(200);
  const b = await p.evaluate(kid => { const s = prazoDaEtapa(D.casoPorId.get(kid)); return { txt: document.querySelector(".caso-pz .fp3-etapa").textContent.replace(/\s+/g, " "), s: s && { id: s.item.id, de: s.de, fatal: s.fatal } }; }, kB.id);
  conf(`a etapa contestação apresentada oferece a réplica (${b.txt.slice(0, 120)})`, b.s && b.s.id === "rep" && /Pela etapa “contestação apresentada”/.test(b.txt) && /Réplica à contestação/.test(b.txt));
  await p.screenshot({ path: OUT + "/2-etapa.png" });
  await p.click(".caso-pz .fp3-etapa .fp3-pri"); await p.waitForTimeout(400);
  const c = await p.evaluate(() => ({ ck: document.getElementById("and-prazo-ck").checked, cat: document.getElementById("and-cat").value, de: document.getElementById("and-de").value,
    vence: document.getElementById("and-prazo-data").value, txt: document.getElementById("and-texto").value, aberto: !document.getElementById("esc-pnl-pz").hidden }));
  conf(`Criar o prazo abre o campo de escrever com o catálogo, o início e a data (${c.cat}, ${c.de}, ${c.vence})`, c.ck && c.aberto && c.cat === "rep" && c.de === b.s.de && c.vence === b.s.fatal && /Réplica/.test(c.txt));
  await p.screenshot({ path: OUT + "/3-criar.png" });
  await p.evaluate(() => { const t = document.getElementById("and-texto"); t.value = ""; const ck = document.getElementById("and-prazo-ck"); ck.checked = false; pzToggle(ck); });
  await p.click(".caso-pz .fp3-etapa .fp3-sec"); await p.waitForTimeout(300);
  conf("Não se aplica tira a oferta do quadro", !(await p.$(".caso-pz .fp3-etapa")));
  const j = await p.evaluate(kid => { const k = D.casoPorId.get(kid), r = {};
    for (const [et, res, rito] of [["perícia designada", null, "JEF"], ["sentença publicada", null, ""], ["julgado", "deferido", ""], ["em exigência", null, ""], ["decidido", "indeferido", ""]]) {
      const kk = { ...k, etapa: et, resultado: res, fase: et === "julgado" ? "conselho" : /exigência|decidido/.test(et) ? "inss" : "judicial", decisao_em: "2026-10-26" };
      const orig = dadosJudiciais; window.dadosJudiciais = () => ({ rito }); const s = prazoDaEtapa(kk); window.dadosJudiciais = orig; r[et] = s ? s.item.id : null; }
    return r; }, kB.id);
  conf(`as etapas escolhem o item certo do catálogo (${JSON.stringify(j)})`, j["perícia designada"] === "quesj" && j["sentença publicada"] === "ap" && j["julgado"] === null && j["em exigência"] === "exig" && j["decidido"] === "crps");

  await p.setViewportSize({ width: 390, height: 844 });
  await abrir(cA.id, kA1.id); await p.waitForTimeout(400);
  conf("no celular o quadro não rola de lado", await p.evaluate(() => { const q = document.querySelector(".caso-pz .faixa-prazos"); return !q || q.scrollWidth <= q.clientWidth + 1; }));
  conf("sem erro de página", !erros.length);
  console.log(erros.join("\n"));
  console.log(`${ok.filter(([, v]) => v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ok.every(([, v]) => v) && !erros.length ? 0 : 1);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
