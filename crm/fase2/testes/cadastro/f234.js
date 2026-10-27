// F234 · a Análise de Direito por benefício (docs/PRIMEIRO-ATENDIMENTO-QUADROS.md):
// primeiro o quadrado com os benefícios escolhidos; o clique abre, logo abaixo, os
// requisitos daquele benefício (motor F232), um por vez; nada abre antes do clique;
// trocar de benefício ou mudar um campo repinta só o trecho, sem perder o que se
// digitou; a análise registrada é do benefício aberto, com os requisitos e os itens
// levados; o Desfecho segue o benefício aberto; cada pré-caso tem o seu aberto.
// Substitui o f217 (faixa e quadros por módulo). Banco simulado. Uso: node f234.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f234";
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
    localStorage.setItem("crm_passos_tudo", "1");   // F238/F239 · a página inteira; os passos têm o f238.js e o f239.js
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
  await p.evaluate(a => abrirAtendimentoDe(a, "pc_r1"), A);
  await p.waitForTimeout(500);
  await p.evaluate(() => irSubCad("direito"));
  await p.waitForSelector("#ad-quadrado", { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(300);

  // 1 · o quadrado vem primeiro, só com os escolhidos, e nada abre antes do clique
  const q0 = await p.evaluate(() => { const q = document.getElementById("ad-quadrado"), main = q && q.parentElement;
    return { ok: !!q, primeiro: main && (x => !!x && (x === q || (x.dataset.passo === "pend" && x.nextElementSibling === q)))(main.querySelector(":scope > :not(.tp-rola)")), bts: [...document.querySelectorAll("#ad-quadrado .adq-bt")].map(b => [b.dataset.op, b.textContent.replace(/\s+/g, " ")]),
      vazio: !!document.getElementById("ad-benef") && !document.querySelector("#ad-benef .adb-req"), irmao: q && q.nextElementSibling && q.nextElementSibling.id }; });
  await p.screenshot({ path: path.join(OUT, "01-quadrado.png") });
  conf("o quadrado dos benefícios vem logo depois das Pendências (F283b)", q0.ok && q0.primeiro);
  conf(`o quadrado mostra só os escolhidos (${q0.bts.map(b => b[0]).join(", ")})`, q0.bts.map(b => b[0]).sort().join() === "b31,idade");
  conf("cada botão traz a contagem dos requisitos", q0.bts.every(([, t]) => /\d+ de \d+ em ordem/.test(t)));
  conf("nada abre antes do clique, e o lugar do painel é logo abaixo do quadrado", q0.vazio && q0.irmao === "ad-benef");

  // 2 · o clique abre os requisitos daquele benefício, logo abaixo
  await p.click('#ad-quadrado .adq-bt[data-op="b31"]');
  await p.waitForTimeout(300);
  const b31 = await p.evaluate(() => { const b = document.getElementById("ad-benef");
    return { op: b && b.dataset.op, n: b ? b.querySelectorAll(".adb-req").length : 0, cat: REQ_BENEF.b31.length, irmao: document.getElementById("ad-quadrado").nextElementSibling === b,
      on: document.querySelector('.adq-bt[data-op="b31"]').getAttribute("aria-pressed"), base: !!(b && b.querySelector(".adb-base")), campos: b ? b.querySelectorAll(".adb-campos [data-adm]").length : 0 }; });
  await p.screenshot({ path: path.join(OUT, "02-b31.png") });
  conf(`o clique abre os ${b31.cat} requisitos do B31, logo abaixo do quadrado`, b31.op === "b31" && b31.n === b31.cat && b31.irmao && b31.on === "true");
  conf("cada requisito traz o artigo e os campos que pede", b31.base && b31.campos > 0);
  conf("o formulário de registrar passa a ser do benefício aberto", await p.evaluate(() => (document.getElementById("ad-esp") || {}).value === "B31"));

  // 3 · o texto digitado não se perde ao trocar de benefício nem ao mudar um campo
  await p.evaluate(() => { const d = document.getElementById("ad-novo"); d.open = true; });
  await p.fill("#ad-contexto", "Conversa fictícia com a cliente");
  await p.click('#ad-quadrado .adq-bt[data-op="idade"]');
  await p.waitForTimeout(300);
  const idade = await p.evaluate(() => ({ op: document.getElementById("ad-benef").dataset.op, ctx: document.getElementById("ad-contexto").value, esp: document.getElementById("ad-esp").value,
    tempos: !!document.querySelector("#ad-benef #adm-tempos"), um: document.querySelectorAll(".adb").length }));
  conf("trocar de benefício abre o outro e fecha o primeiro (um por vez)", idade.op === "idade" && idade.um === 1);
  conf("o que foi digitado no formulário continua lá", idade.ctx === "Conversa fictícia com a cliente" && idade.esp === "B41");
  conf("a aposentadoria por idade traz a tabela de tempos no painel dela", idade.tempos);
  // o quadro de tempos (vinha do f217): +, natureza com detalhe, Trazer do CNIS sem o benefício, ×
  const nT = () => p.evaluate(() => document.querySelectorAll("#ad-benef #adm-tempos tbody tr").length);
  const t0 = await nT(); await p.click("#ad-benef .adm-mais"); await p.waitForTimeout(150);
  conf("o + acrescenta um período", (await nT()) === t0 + 1);
  await p.selectOption('#ad-benef #adm-tempos tbody tr[data-i="0"] select[data-k=nat]', "especial"); await p.waitForTimeout(150);
  conf("a natureza abre o detalhe que ela pede (agente e PPP no especial)", await p.evaluate(() => /Agente/.test(document.querySelector('#ad-benef #adm-tempos tbody tr[data-i="0"] .adm-det').innerHTML)));
  await p.click('#ad-benef button:has-text("Trazer do CNIS")'); await p.waitForTimeout(200);
  conf("Trazer do CNIS lança o vínculo e deixa o benefício de fora", await p.evaluate(a => { const t = admDe(D.cliPorId.get(a)).tempos;
    return t.some(r => /LOJAS FICTICIAS/.test(r.onde || "")) && !t.some(r => /AUXILIO/.test(r.onde || "")); }, A));
  const nL = () => p.evaluate(a => admDe(D.cliPorId.get(a)).tempos.length, A);
  const t2 = await nL(); await p.click("#ad-benef #adm-tempos tbody tr:last-child .adm-x"); await p.waitForTimeout(150);
  conf("o × tira a linha", t2 > 0 && (await nL()) === t2 - 1);
  conf("e o formulário continua com o que foi digitado", await p.evaluate(() => document.getElementById("ad-contexto").value === "Conversa fictícia com a cliente"));
  const antes = await p.evaluate(() => (document.querySelector('#ad-benef .adb-req[data-id] .adb-dyn') || {}).innerHTML);
  const campoDer = await p.$("#ad-benef .adb-der [data-adm=der]");
  await campoDer.fill("2030-05-01"); await campoDer.dispatchEvent("change");
  await p.waitForTimeout(300);
  const depois = await p.evaluate(() => ({ ctx: document.getElementById("ad-contexto").value, der: (document.querySelector("#ad-benef .adb-der [data-adm=der]") || {}).value }));
  conf("mudar um campo recalcula no lugar e não apaga o formulário", depois.ctx === "Conversa fictícia com a cliente" && depois.der === "2030-05-01" && antes !== undefined);
  await p.waitForTimeout(700);
  conf("o campo vai para o ad do pré-caso", ((T.casos.find(k => k.id === K1).ad || {}).valores || {}).der === "2030-05-01");

  // 4 · ＋ benefício escolhe ali mesmo, sem repintar a ficha
  await p.click("#ad-quadrado .adq-cab .btn-mini");
  conf("＋ benefício abre a escolha das famílias no próprio quadrado", await p.evaluate(() => !document.querySelector("#ad-quadrado .adq-mais").hidden && document.querySelectorAll("#ad-quadrado .ben-chip").length === 11));
  await p.click('#ad-quadrado .ben-chip[data-fam="bpc"]');
  await p.waitForTimeout(300);
  conf("o benefício novo entra no quadrado, e o formulário fica", await p.evaluate(() => [...document.querySelectorAll("#ad-quadrado .adq-bt")].length === 3
    && document.getElementById("ad-contexto").value === "Conversa fictícia com a cliente"));
  await p.click('#ad-quadrado .ben-chip[data-fam="bpc"]');
  await p.waitForTimeout(300);

  // 5 · o Desfecho segue o benefício aberto; o histórico fica fechado no atendimento
  conf("o Desfecho tem uma linha por benefício marcado, e não segue o último clique", await p.evaluate(a => { const c = D.cliPorId.get(a), b = baseDesfecho(c, null);
    return b.linhas.length === opcoesSel(c).length && b.linhas.some(l => /idade urbana/i.test(l.o.rot)); }, A));
  conf("no atendimento, as análises anteriores e o histórico ficam num quadro fechado", await p.evaluate(() => { const h = document.getElementById("ad-hist"); return !!h && !h.open; }));
  conf("nenhum id repetido na tela", await p.evaluate(() => { const ids = [...document.querySelectorAll("[id]")].map(e => e.id); return ids.length === new Set(ids).size; }));

  // 6 · registrar: a análise é do benefício aberto, com os requisitos e os itens levados
  const nAn = T.analises_direito.length;
  await p.evaluate(a => salvarAnalise(a), A);
  await p.waitForTimeout(900);
  const an = T.analises_direito[nAn] || {};
  const det = an.detalhes || {};
  conf("a análise registrada guarda o benefício aberto e o pré-caso", det.beneficio === "idade" && det.precaso_id === "pc_r1");
  conf("e o estado de cada requisito e os itens levados do Primeiro atendimento", Array.isArray((det.modulos || {}).requisitos) && det.modulos.requisitos.length > 0 && Array.isArray(det.levados));

  // 7 · cada pré-caso tem o seu benefício aberto
  await p.evaluate(a => abrirAtendimentoDe(a, "pc_r2"), A);
  await p.waitForTimeout(400);
  await p.evaluate(() => irSubCad("direito"));
  await p.waitForTimeout(400);
  // F239 · com um benefício só, ele já abre sozinho no atendimento
  conf("no outro pré-caso, o quadrado é o dele, e o benefício único já abre", await p.evaluate(() => [...document.querySelectorAll("#ad-quadrado .adq-bt")].map(b => b.dataset.op).join() === "idoso"
    && (document.getElementById("ad-benef") || {}).dataset.op === "idoso"));
  await p.evaluate(a => abrirAtendimentoDe(a, "pc_r1"), A);
  await p.waitForTimeout(400);
  await p.evaluate(() => irSubCad("direito"));
  await p.waitForTimeout(400);
  conf("voltando ao primeiro, o benefício que estava aberto continua aberto", await p.evaluate(() => (document.getElementById("ad-benef") || {}).dataset?.op === "idade"));

  // 8 · 390 px
  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(400);
  const largos = await p.evaluate(() => { const w = document.documentElement.clientWidth;
    return [...document.querySelectorAll(".adq *, .adb *")].filter(e => !e.closest(".pa-tabela, .adm-tempos, .paq-rola, .adx-tab-wrap") && e.getBoundingClientRect().right > w + 1 && e.getBoundingClientRect().width > 0)
      .map(e => e.className || e.tagName).slice(0, 5); });
  await p.screenshot({ path: path.join(OUT, "03-390.png") });
  conf(`a 390 px o quadrado e o painel cabem${largos.length ? `: ${largos.join(", ")}` : ""}`, !largos.length);

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
