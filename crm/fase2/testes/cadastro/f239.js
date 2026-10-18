// F239 · a Análise de Direito em passos (docs/ATENDIMENTO-EM-ETAPAS.md, onda 2): no atendimento, a trilha
// Benefício, Já resolvido, Falta responder e Conclusão; escolher o benefício leva ao passo seguinte; o já
// resolvido só com o que está em ordem ou é informativo; responder recalcula sem trocar de passo; a Conclusão
// com o registrar e a linha que leva ao Desfecho, que ficou só em Documentos; o passo gravado no pré-caso;
// um benefício só abre sozinho. Banco simulado e dados fictícios. Uso: node f239.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f239";
fs.mkdirSync(OUT, { recursive: true });

const A = "c0000000-0000-0000-0000-000000000a34";
const K1 = "b0000000-0000-0000-0000-000000000a34", K2 = "b0000000-0000-0000-0000-000000000b34";
const CNIS = { em: "2026-10-08", nome: "Rosalina Ficta Moura", paginas: 3, qtVinculos: 1, nits: [], contribSemPerda: 150, indicadores: [],
  vinculos: [{ seq: 1, tipo: "Empregado", origem: "LOJAS FICTICIAS LTDA", codigo: "11.444.777/0001-61", inicio: "01/03/2012", fim: "", ultRemun: "08/2026", aberto: true, indicadores: [] },
    { seq: 2, tipo: "Benefício", especie: "31", origem: "AUXILIO DOENCA PREVIDENCIARIO", nb: "6123456780", inicio: "10/03/2018", fim: "20/05/2018", situacao: "CESSADO", aberto: false }],
  analise: { abertos: [], errosEmp: [], abaixo: [], mesAnt: "09/2026", agora: { tipo: "empregado" }, benefAtivos: [], qtComps: 174,
    contagem: { periodos: [["2012-03", "2026-08"]], carencia: 174, anos: 14, meses: 6, foraMinimo: 0 } } };
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "lembretes", "analises_direito", "anexos",
  "aposentadorias", "lista_pref", "andamento_tarefas", "modelos_mensagem", "credencial_vis", "apagados", "credenciais", "atribuicoes"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: JSON.parse(JSON.stringify(FIX.clientes)), casos: JSON.parse(JSON.stringify(FIX.casos)),
  documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const pre = (id, pc, esp, ad) => ({ id, cliente_id: A, titulo: "", fase: "escritorio", pre_caso: true, beneficio: esp, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [],
  arquivados: {}, marcadores: [], origem_lista: "🙋 Escritório", precaso: { id: pc, natureza: "", marc: {}, honorarios: "", quem: null, em: "2026-10-12" }, ad, criado_em: "2026-10-12T12:00:00Z" });
dados.clientes.push({ id: A, nome: "Rosalina Ficta Moura", cpf: "70010020133", dn: "1962-04-20", sexo: "F", criado_em: "2026-10-01T12:00:00Z",
  dossie: { meuinss: { em: "2026-10-08T10:00:00Z" } }, triagem: { pdf: { cnis: CNIS } }, campos: {} });
dados.casos.push(pre(K1, "pc_r1", "", { fora: [], beneficios: { tempo: ["idade"], incapacidade: ["b31"] }, valores: {}, tempos: [] }),
  pre(K2, "pc_r2", "BPC/LOAS", { fora: [], beneficios: { bpc: ["idoso"] }, valores: {}, tempos: [] }));
const banco = new Banco(dados);
const T = banco.t;

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
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  await instalarBanco(ctx, { SUPA, SESSAO, banco });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const abrirAd = async pc => { await p.evaluate(([a, x]) => abrirAtendimentoDe(a, x), [A, pc]); await p.waitForTimeout(400);
    await p.evaluate(() => irSubCad("direito")); await p.waitForSelector("#ad-quadrado", { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(300); };
  const estado = () => p.evaluate(() => { const r = document.querySelector('[data-tp="ad"]'); if (!r) return null;
    const vis = [...new Set([...r.querySelectorAll(".tp-passo")].filter(x => x.offsetParent !== null).map(x => x.dataset.passo))];
    const lis = [...r.querySelectorAll(".tp-trilha > li")], aq = lis.find(l => l.classList.contains("aqui"));
    const v = sel => { const b = r.querySelector(sel); return !!b && b.offsetParent !== null; };
    return { ids: lis.map(l => l.dataset.passo), vis, aqui: aq ? aq.dataset.passo : "", feitos: lis.filter(l => l.classList.contains("feito")).map(l => l.dataset.passo),
      prox: v(".tp-prox") ? r.querySelector(".tp-prox").textContent : "", onde: (r.querySelector(".tp-onde") || {}).textContent || "" }; });
  const ests = sel => p.evaluate(sl => [...document.querySelectorAll(sl)].map(li => (li.querySelector(".adb-est") || {}).className || ""), sel);

  // 1 · dois benefícios: a trilha começa no Benefício e só ele está à vista
  await abrirAd("pc_r1");
  let e = await estado();
  await p.screenshot({ path: path.join(OUT, "01-beneficio.png") });
  conf(`sem benefício aberto, a trilha é Benefício e Conclusão (${e && e.ids.join(", ")})`, e && e.ids.join() === "benef,concl");
  conf(`só o quadrado à vista (${e.vis.join(", ")})`, e.vis.join() === "benef" && /^Próximo: Conclusão/.test(e.prox));
  conf("o Desfecho saiu da Análise de Direito no atendimento", await p.evaluate(() => !document.getElementById("desfecho") && !!document.getElementById("desfecho-ir")));

  // 2 · escolher o benefício abre o Já resolvido, só com o que está em ordem ou é informativo
  await p.click('#ad-quadrado .adq-bt[data-op="b31"]');
  await p.waitForTimeout(300);
  e = await estado();
  await p.screenshot({ path: path.join(OUT, "02-resolvido.png") });
  conf(`o clique no B31 leva ao passo seguinte, com a trilha do benefício (${e.ids.join(", ")} · ${e.vis.join(", ")})`, e.ids.join() === "benef,ok,falta,concl" && e.vis.join() === "ok" && e.feitos.includes("benef"));
  const okE = await ests('.tp-passo[data-passo="ok"] .adb-req'), falE = await ests('.tp-passo[data-passo="falta"] .adb-req');
  conf(`Já resolvido traz só em ordem e informativo (${okE.length})`, okE.length > 0 && okE.every(c => /est-(ok|info)\b/.test(c)));
  conf(`Falta responder traz o resto (${falE.length})`, falE.length > 0 && falE.every(c => !/est-(ok|info)\b/.test(c)));
  conf("os requisitos somam os do catálogo, nenhum repetido", await p.evaluate(() => document.querySelectorAll("#ad-benef .adb-req").length === REQ_BENEF.b31.length
    && new Set([...document.querySelectorAll("#ad-benef .adb-req")].map(li => li.dataset.id)).size === REQ_BENEF.b31.length));
  conf("a resposta do benefício (veredito) fica à vista em todos os passos do benefício", await p.evaluate(() => { const v = document.querySelector("#ad-benef .adb-veredito"); return !!v && v.offsetParent !== null; }));
  conf("o quadrado continua logo acima do painel do benefício", await p.evaluate(() => document.getElementById("ad-quadrado").nextElementSibling === document.getElementById("ad-benef")));

  // 3 · Falta responder: a DER e os campos; responder recalcula no lugar, sem trocar de passo
  await p.waitForTimeout(1500);   // a leitura do PDF do CNIS, que o painel pede, termina e repinta uma vez
  await p.evaluate(() => { window.__rep = 0; const o = repintarFicha; window.repintarFicha = (...a) => { window.__rep++; window.__pilha = (new Error().stack || "").split(/\n/).slice(2, 5).join(" < "); return o(...a); }; });
  await p.click(".tp-prox");
  e = await estado();
  conf(`Próximo abre o Falta responder, com a DER (${e.vis})`, e.vis.join() === "falta" && await p.evaluate(() => { const d = document.querySelector('.tp-passo[data-passo="falta"] [data-adm="der"]'); return !!d && d.offsetParent !== null; }));
  await p.screenshot({ path: path.join(OUT, "03-falta.png") });
  const c0 = await p.textContent("#ad-benef .adb-cont");
  await p.fill('.tp-passo[data-passo="falta"] [data-adm="der"]', "2026-10-20");
  await p.dispatchEvent('.tp-passo[data-passo="falta"] [data-adm="der"]', "change");
  await p.waitForTimeout(300);
  e = await estado();
  conf(`responder um campo recalcula e o passo fica (${c0} → ${await p.textContent("#ad-benef .adb-cont")})`, e.vis.join() === "falta");
  const rep = await p.evaluate(() => [window.__rep, window.__pilha || ""]);
  conf(`trocar de passo e responder não repintam a ficha${rep[0] ? ` (${rep[1]})` : ""}`, rep[0] === 0);

  // 4 · Conclusão: o que fazer agora, as considerações, o registrar e a linha que leva ao Desfecho
  await p.click(".tp-prox");
  e = await estado();
  await p.screenshot({ path: path.join(OUT, "04-conclusao.png") });
  conf(`a Conclusão é o último passo (${e.onde})`, e.vis.join() === "concl" && !e.prox);
  conf("na Conclusão: registrar a análise, as considerações e o caminho ao Desfecho", await p.evaluate(() => {
    const vis = id => { const el = document.getElementById(id); return !!el && el.offsetParent !== null; };
    return vis("ad-novo") && vis("desfecho-ir") && !!document.querySelector('.tp-passo[data-passo="concl"] .adb-quando'); }));
  await p.waitForTimeout(800);
  conf("o passo aberto vai para a linha do pré-caso (casos.ad.passos.ad)", ((T.casos.find(k => k.id === K1).ad || {}).passos || {}).ad === "concl");
  await p.click("#desfecho-ir button");
  await p.waitForTimeout(500);
  conf("Ir ao Desfecho abre Documentos, com o quadro do Desfecho", await p.evaluate(() => subCad === "documentos" && !!document.getElementById("desfecho")));
  await p.evaluate(() => irSubCad("direito")); await p.waitForTimeout(300);
  e = await estado();
  conf("de volta à Análise de Direito, ela abre onde parou", e.vis.join() === "concl");

  // 5 · Ver tudo numa página: a página inteira, sem o Desfecho
  await p.click(".tp-pe .tp-chave input");
  e = await estado();
  conf(`Ver tudo mostra todos os passos (${e.vis.length} de ${e.ids.length})`, e.vis.length === e.ids.length);
  await p.click(".tp-pe .tp-chave input");
  conf("desligado, volta a um passo só", (await estado()).vis.length === 1);

  // 6 · um benefício só: abre sozinho e começa no passo seguinte
  await abrirAd("pc_r2");
  e = await estado();
  conf(`com um benefício só, ele abre sozinho e a visita começa depois do Benefício (${e.ids.join(", ")} · ${e.vis})`, (await p.evaluate(() => (document.getElementById("ad-benef") || {}).dataset.op)) === "idoso"
    && e.vis.join() === e.ids[1] && e.feitos.includes("benef"));

  // 7 · fora do atendimento, a Análise de Direito fica como era
  await p.evaluate(a => { _atendAberto.delete(a); irSubCad("direito"); }, A); await p.waitForTimeout(300);
  conf("fora do atendimento, sem trilha", await p.evaluate(() => !document.querySelector('[data-tp="ad"]') && !!document.getElementById("ad-quadrado")));

  // 8 · 390 px
  await abrirAd("pc_r1");
  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(400);
  const largos = await p.evaluate(() => { const w = document.documentElement.clientWidth;
    return [...document.querySelectorAll(".adx-main *")].filter(e => !e.closest(".tp-rola, .paq-rola, .adm-rola, table, .adm-tempos, #adm-tempos") && e.getBoundingClientRect().right > w + 1 && e.getBoundingClientRect().width > 0).map(e => e.className || e.tagName).slice(0, 5); });
  await p.screenshot({ path: path.join(OUT, "05-390.png"), fullPage: true });
  conf(`a 390 px nada transborda fora da trilha${largos.length ? `: ${largos.join(", ")}` : ""}`, !largos.length);

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
