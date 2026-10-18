// F240 · Documentos em passos (docs/ATENDIMENTO-EM-ETAPAS.md, onda 3): no atendimento, a trilha Assinar,
// Pedir ao cliente, Guia do pedido e Desfecho; os gerados e assinados junto do Assinar; a gaveta Ferramentas
// (catálogo, consultas, anexos da IN 128, site interno) à vista em todos os passos; a linha da Análise de
// Direito abre Documentos no Desfecho; o passo gravado no pré-caso. Banco simulado. Uso: node f240.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f240";
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
  const abrirDoc = async pc => { await p.evaluate(([a, x]) => abrirAtendimentoDe(a, x), [A, pc]); await p.waitForTimeout(400);
    await p.evaluate(() => irSubCad("documentos")); await p.waitForSelector(".doc-quadros", { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(300); };
  const estado = () => p.evaluate(() => { const r = document.querySelector('[data-tp="doc"]'); if (!r) return null;
    const vis = [...r.querySelectorAll(".tp-passo")].filter(x => x.offsetParent !== null).map(x => x.dataset.passo);
    const lis = [...r.querySelectorAll(".tp-trilha > li")], aq = lis.find(l => l.classList.contains("aqui"));
    const v = sel => { const b = r.querySelector(sel); return !!b && b.offsetParent !== null; };
    return { ids: lis.map(l => l.dataset.passo), vis, aqui: aq ? aq.dataset.passo : "", feitos: lis.filter(l => l.classList.contains("feito")).map(l => l.dataset.passo),
      prox: v(".tp-prox") ? r.querySelector(".tp-prox").textContent : "", ferr: v("#dq-ferramentas") }; });
  const visivel = id => p.evaluate(i => { const e = document.getElementById(i); return !!e && e.offsetParent !== null; }, id);

  // 1 · abre no primeiro passo, Assinar, com os gerados e assinados junto
  await abrirDoc("pc_r1");
  let e = await estado();
  await p.screenshot({ path: path.join(OUT, "01-assinar.png") });
  conf(`a trilha de Documentos é Assinar, Pedir ao cliente, Guia do pedido e Desfecho (${e && e.ids.join(", ")})`, e && e.ids.join() === "assinar,pedir,guias,desfecho");
  conf(`só o passo Assinar à vista, com o que já foi gerado (${e.vis})`, e.vis.join() === "assinar" && await visivel("dq-assinar") && await visivel("dq-gerados") && !(await visivel("dq-prov")));
  conf("a gaveta Ferramentas fica à vista em todos os passos, fechada", e.ferr && await p.evaluate(() => { const d = document.getElementById("dq-ferramentas"); return !d.open && !!d.querySelector(".doc-catalogo"); }));

  // 2 · Próximo leva a Pedir ao cliente, à Guia e ao Desfecho
  await p.click(".tp-prox");
  e = await estado();
  conf(`Pedir ao cliente traz a lista do que providenciar (${e.vis})`, e.vis.join() === "pedir" && await visivel("dq-prov") && e.feitos.includes("assinar"));
  await p.screenshot({ path: path.join(OUT, "02-pedir.png") });
  await p.click(".tp-prox");
  e = await estado();
  conf("Guia do pedido traz as guias e formulários", e.vis.join() === "guias" && await visivel("dq-guias"));
  await p.click(".tp-prox");
  e = await estado();
  await p.screenshot({ path: path.join(OUT, "03-desfecho.png") });
  conf("o Desfecho é o último passo, com as três saídas", e.vis.join() === "desfecho" && !e.prox && await visivel("desfecho")
    && await p.evaluate(() => document.querySelectorAll("#desfecho .desf-acoes > *").length === 3));
  conf("os passos de fora continuam na página", await p.evaluate(() => ["dq-assinar", "dq-prov", "dq-guias", "dq-gerados", "dq-desfecho"].every(i => !!document.getElementById(i))));
  await p.waitForTimeout(800);
  conf("o passo aberto vai para a linha do pré-caso (casos.ad.passos.doc)", ((T.casos.find(k => k.id === K1).ad || {}).passos || {}).doc === "desfecho");

  // 3 · a linha da Análise de Direito abre Documentos já no Desfecho
  await p.evaluate(a => passoIr("doc", a, "assinar"), A);
  await p.evaluate(() => irSubCad("direito")); await p.waitForTimeout(300);
  await p.evaluate(a => passoIr("ad", a, "concl"), A);
  await p.click("#desfecho-ir button");
  await p.waitForTimeout(500);
  e = await estado();
  conf(`"Ir ao Desfecho" da Análise de Direito abre Documentos no Desfecho (${e && e.vis})`, e && e.vis.join() === "desfecho");

  // 4 · Ver tudo numa página
  await p.click(".tp-pe .tp-chave input");
  e = await estado();
  conf(`Ver tudo mostra os quatro passos (${e.vis.length})`, e.vis.length === 4);
  await p.click(".tp-pe .tp-chave input");
  conf("desligado, volta a um passo só", (await estado()).vis.length === 1);

  // 5 · fora do atendimento, Documentos fica como era
  await p.evaluate(a => { _atendAberto.delete(a); irSubCad("documentos"); }, A); await p.waitForTimeout(300);
  conf("fora do atendimento, sem trilha em Documentos", await p.evaluate(() => !document.querySelector('[data-tp="doc"]')));

  // 6 · 390 px
  await abrirDoc("pc_r1");
  await p.evaluate(a => passoIr("doc", a, "pedir"), A);
  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(400);
  const largos = await p.evaluate(() => { const w = document.documentElement.clientWidth;
    return [...document.querySelectorAll(".doc-quadros *")].filter(e => !e.closest(".tp-rola, table") && e.offsetParent !== null && e.getBoundingClientRect().right > w + 1 && e.getBoundingClientRect().width > 0).map(e => e.className || e.tagName).slice(0, 5); });
  await p.screenshot({ path: path.join(OUT, "04-390.png"), fullPage: true });
  conf(`a 390 px nada transborda fora da trilha${largos.length ? `: ${largos.join(", ")}` : ""}`, !largos.length);

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
