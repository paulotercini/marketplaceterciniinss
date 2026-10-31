// F283 · as anotações do atendimento fixas à direita em todos os passos, os documentos a pedir junto delas,
// e o quadro vermelho da Análise de Direito com os problemas do Primeiro atendimento, que se arrastam às
// anotações. Banco simulado. Uso: node f283.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f283";
fs.mkdirSync(OUT, { recursive: true });

const A = "c0000000-0000-0000-0000-000000000a34";
const K1 = "b0000000-0000-0000-0000-000000000a34", K2 = "b0000000-0000-0000-0000-000000000b34";
const CNIS = { em: "2026-10-08", nome: "Rosalina Ficta Moura", paginas: 3, qtVinculos: 1, nits: [], contribSemPerda: 150, indicadores: [],
  vinculos: [{ seq: 1, tipo: "Empregado", origem: "LOJAS FICTICIAS LTDA", codigo: "11.444.777/0001-61", inicio: "01/03/2012", fim: "31/05/2019", ultRemun: "05/2019", aberto: false, indicadores: [] },
    { seq: 2, tipo: "Benefício", especie: "31", origem: "AUXILIO DOENCA PREVIDENCIARIO", nb: "6123456780", inicio: "10/03/2018", fim: "20/05/2018", situacao: "CESSADO", aberto: false }],
  analise: { abertos: [], errosEmp: [], abaixo: [{ comp: "03/2018" }, { comp: "04/2018" }, { comp: "05/2018" }, { comp: "09/2018" }], mesAnt: "09/2026", agora: { tipo: "empregado" }, benefAtivos: [], qtComps: 174,
    contagem: { periodos: [["2012-03", "2019-05"]], carencia: 174, anos: 14, meses: 6, foraMinimo: 0 } } };
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
dados.anexos.push({ id: "ax_res", cliente_id: A, origem: "dossie", nome: "CNIS · CNIS resumido (vinculos).pdf", caminho: "dossie/70010020133/CNIS/CNIS resumido (vinculos).pdf", tipo: "application/pdf", criado_em: "2026-10-08T10:00:00Z" },
  { id: "ax_dec", cliente_id: A, origem: "dossie", nome: "Declaracao · Declaracao de beneficiario.pdf", caminho: "dossie/70010020133/Declaracao/Declaracao de beneficiario.pdf", tipo: "application/pdf", criado_em: "2026-10-08T10:00:00Z" });
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
  const ir = async v => { await p.evaluate(x => irSubCad(x), v); await p.waitForTimeout(400); };
  const caixa = () => p.evaluate(() => { const e = document.getElementById("atend-conversa"); if (!e || e.offsetParent === null && getComputedStyle(e).position !== "fixed") return null;
    const r = e.getBoundingClientRect(); return { fixo: getComputedStyle(e).position === "fixed", dir: Math.round(innerWidth - r.right), larg: Math.round(r.width), aberto: e.open }; });
  await p.evaluate(([a, x]) => abrirAtendimentoDe(a, x), [A, "pc_r1"]); await p.waitForTimeout(500);
  // F320 · as anotações são gaveta: nascem fechadas, com a aba vertical; o botão "Anotações N" do cabeçalho abre
  conf("a gaveta das anotações nasce fechada, com a aba vertical à direita", await p.evaluate(() => getComputedStyle(document.getElementById("atend-conversa")).display === "none") && await p.evaluate(() => { const b = document.querySelector(".atend-aba-notas"); const r = b && b.getBoundingClientRect(); return !!r && r.width > 0 && innerWidth - r.right < 4; }));
  await p.click(".atend-notas-bt"); await p.waitForTimeout(200);
  conf("o botão Anotações do cabeçalho abre a gaveta e a escolha fica no navegador", await p.evaluate(() => localStorage.getItem("crm_atend_notas") === "1" && document.querySelector(".atend-notas-bt").getAttribute("aria-expanded") === "true"));
  for (const v of ["identificacao", "pa", "direito", "documentos"]) {
    await ir(v); const b = await caixa();
    conf(`em ${v}, as anotações ficam abertas e fixas à direita (${JSON.stringify(b)})`, b && b.fixo && b.dir < 90 && b.aberto);   // 11.92 · TRI-09: à esquerda da coluna dos flutuantes (76 px)
  }
  // os documentos a pedir
  await p.fill("#atend-doc", "Laudo do ortopedista atualizado"); await p.click(".atend-docs .adr-bt"); await p.waitForTimeout(500);
  const cli = () => T.clientes.find(x => x.id === A);
  const ped = () => ((cli().campos || {}).docs_pedidos || []).find(x => x.origem === "anotacoes");
  conf("o documento anotado vai a docs_pedidos, preso ao pré-caso", ped() && ped().precaso_id === "pc_r1" && ped().itens.length === 1);
  conf("e aparece na lista ao lado", await p.evaluate(() => /Laudo do ortopedista/.test(document.querySelector(".atend-docs").textContent)));
  conf("as competências abaixo do mínimo saem em faixas", await p.evaluate(() => faixasDeComps(["03/2021","04/2021","05/2021","09/2021"]).join("|") === "03/2021 a 05/2021|09/2021"));
  // as pendências, primeiro passo da Análise de Direito, e o arrastar
  await ir("direito");
  const pend = await p.evaluate(() => { const r = document.querySelector('[data-tp="ad"]'); const lis = [...r.querySelectorAll(".tp-trilha > li")];
    return { ids: lis.map(l => l.dataset.passo).join(), aqui: (lis.find(l => l.classList.contains("aqui")) || {}).dataset?.passo,
      itens: [...document.querySelectorAll(".pa-prob li")].map(li => ({ quem: li.querySelector(".pp-quem").textContent, acao: li.dataset.txt })) }; });
  await p.screenshot({ path: path.join(OUT, "01-pendencias.png") });
  conf(`a trilha é Pendências, Análise do Benefício e Conclusão, e abre nas Pendências (${pend.ids} · ${pend.aqui})`, pend.ids === "pend,benef,concl" && pend.aqui === "pend");
  conf(`cada pendência diz o que deve ser feito e por quem (${pend.itens.length})`, pend.itens.length > 0 && pend.itens.every(x => /^Deve /.test(x.acao) && /^(Cliente|Escritório)$/.test(x.quem)));
  conf("a qualidade perdida pede a pergunta do desemprego", pend.itens.some(x => /desempregada/.test(x.acao)));
  conf("as competências abaixo do mínimo pedem o pagamento, com as faixas", pend.itens.some(x => x.quem === "Cliente" && /Deve pagar a complementação das competências 03\/2018 a 05\/2018 e 09\/2018/.test(x.acao)));
  conf("o que falta no dossiê vira providência (rodar o Emprega Brasil)", pend.itens.some(x => /rodar o Emprega Brasil/.test(x.acao)));
  await p.fill("#atend-nota", "rascunho");
  await p.dragAndDrop(".pa-prob li", "#atend-conversa");
  const txt = await p.inputValue("#atend-nota");
  conf(`arrastar a pendência leva a providência às anotações (${txt.slice(0, 60)})`, /^rascunho\nDeve .+/.test(txt));
  await p.click(".pa-prob li .btn-mini");
  conf("o anotar faz o mesmo", (await p.inputValue("#atend-nota")).split("\n").length === 3);
  conf("o campo de escrever é maior (6 linhas)", await p.evaluate(() => document.getElementById("atend-nota").getBoundingClientRect().height >= 120));
  await p.fill("#atend-doc", "CTPS"); await p.click(".atend-docs .adr-bt"); await p.waitForTimeout(500);
  conf("gravar um documento não apaga a anotação em curso", (await p.inputValue("#atend-nota")).startsWith("rascunho") && ped().itens.length === 2);
  await p.click(".atend-docs li .olho"); await p.waitForTimeout(500);
  conf("o ✕ tira o documento da lista", ped().itens.length === 1 && ped().itens[0].nome === "CTPS");
  // F283c · os atalhos do dossiê no pé das anotações
  const at = await p.evaluate(() => [...document.querySelectorAll(".atend-atalhos button")].map(b => [b.textContent, b.disabled, (b.getAttribute("onclick") || "")]));
  conf(`no pé das anotações, CNIS Resumido, CNIS Completo e Declaração de Beneficiário (${at.map(x => x[0]).join(", ")})`, at.map(x => x[0]).join("|") === "CNIS Resumido|CNIS Completo|Declaração de Beneficiário");
  conf("o que está no dossiê abre o anexo; o que falta fica desligado", /ax_res/.test(at[0][2]) && at[1][1] && /ax_dec/.test(at[2][2]) && !at[0][1] && !at[2][1]);
  conf("os atalhos ficam dentro da gaveta, abaixo dos documentos a pedir", await p.evaluate(() => { const b = document.querySelector(".atend-atalhos"), d = document.querySelector(".atend-docs"); return !!b.closest("#atend-conversa") && b.getBoundingClientRect().top >= d.getBoundingClientRect().bottom; }));   // F313
  // fora do atendimento, sem quadro nem painel
  await p.evaluate(a => { _atendAberto.delete(a); irSubCad("direito"); }, A); await p.waitForTimeout(300);
  conf("fora do atendimento, nem as pendências nem as anotações fixas", await p.evaluate(() => !document.querySelector(".pa-prob") && !document.getElementById("atend-conversa")));
  // 390 px: as anotações voltam ao pé
  await p.evaluate(([a, x]) => abrirAtendimentoDe(a, x), [A, "pc_r1"]); await p.waitForTimeout(400);
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
  conf("a 390 px as anotações ficam no pé, sem posição fixa", await p.evaluate(() => getComputedStyle(document.getElementById("atend-conversa")).position !== "fixed"));

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
