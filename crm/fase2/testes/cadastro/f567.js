// F567 · Resumo do Caso (variação 4, Linha do tempo): o quadro abaixo do cartão do caso lê o pedido da petição inicial, chama a
// função caso_resumo (simulada aqui) e mostra a barra dos períodos; aberto, cada período diz a duração e a natureza ("7a 10m rural").
// Não aparece no INSS nem no pré-caso. Banco simulado, dados fictícios. Uso: node f567.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";

const PAULO = FIX.colaboradores[0].id;
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: [...FIX.colaboradores], clientes: [], casos: [], atribuicoes: [], documentos_beneficio: FIX.documentos_beneficio || [],
  modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;
let seq = 0;
const id = p => `${p}0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const cli = nome => { const c = { id: id("c"), nome, cpf: null, telefone: "5500000000" + String(10 + seq), campos: {}, telefones: [], criado_em: "2025-01-10T12:00:00-03:00" }; T.clientes.push(c); return c; };
const caso = (c, o) => { const k = { id: id("b"), cliente_id: c.id, titulo: c.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
  marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, dcb_prorrogacao_pedida: false, origem_lista: "🌻 INSS",
  criado_em: "2025-02-01T12:00:00-03:00", ...o }; T.casos.push(k); T.atribuicoes.push({ caso_id: k.id, colaborador_id: PAULO }); return k; };
const PROC = "50000000000000000067";
const INICIAL = "EXCELENTÍSSIMO SENHOR JUIZ FEDERAL DA VARA FEDERAL DE CATANDUVA. Cliente Teste, já qualificada, vem propor ação de concessão de aposentadoria. "
  + "DOS FATOS. A autora trabalhou na roça com a família e depois em atividade especial. ".repeat(4)
  + "DOS PEDIDOS. Ante o exposto, requer a concessão da aposentadoria por tempo de contribuição desde a DER de 10/03/2025, com o reconhecimento do "
  + "período rural de 02/12/1978 a 05/10/1986 e do período especial de 01/03/1990 a 31/08/1992. Pede deferimento. Monte Alto, 01/04/2025. Advogado OAB/SP 331.110.";

const cA = cli("Cliente Teste Resumo");
const kA = caso(cA, { beneficio: "Apos. por Tempo de Contribuição", especie: "B42", fase: "judicial", origem_lista: "👪 Judicial", processo: PROC, der: "2025-03-10" });
T.anexos.push({ id: id("a"), caso_id: kA.id, cliente_id: cA.id, andamento_id: null, nome: "Petição", caminho: `pje/${PROC}/1001`, origem: "pje", texto: INICIAL,
  tipo: "application/pdf", criado_em: "2025-04-01T10:00:00-03:00" });
const cB = cli("Cliente Teste Inss");
const kB = caso(cB, { beneficio: "Auxílio por incapacidade", especie: "B31", fase: "inss", protocolos: ["1700000701"] });
const cC = cli("Cliente Teste Pre");
const kC = caso(cC, { beneficio: "Aposentadoria", fase: "judicial", pre_caso: true, origem_lista: "🙋 Escritório" });

const RESPOSTA = { texto: "Aposentadoria por tempo de contribuição desde a DER de 10/03/2025, com o período rural de 02/12/1978 a 05/10/1986 e o especial de 01/03/1990 a 31/08/1992.",
  tipo: "concessao", beneficio: "Aposentadoria por tempo de contribuição", der: "10/03/2025",
  periodos: [{ natureza: "rural", ini: "1978-12-02", fim_iso: "1986-10-05", dur: "7a 10m", local: "", motivo: "economia familiar" },
    { natureza: "especial", ini: "1990-03-01", fim_iso: "1992-08-31", dur: "2a 6m", local: "", motivo: "" }], faltas: [], avisos: [] };

const ok = [];
const conf = (nome, v) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); };
(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, "..", "..", q.url === "/" ? "app.html" : q.url.split("?")[0]);
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
  let pedido = null;
  await p.route(`${SUPA}/functions/v1/caso_resumo`, async r => { pedido = JSON.parse(r.request().postData() || "{}");
    await r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(RESPOSTA) }); });
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const abrir = (c, k) => p.evaluate(async ([c, k]) => { await abrirFicha(c); const m = document.getElementById("modal"); if (m) m.style.display = "none";
    casoSel = k; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); }, [c, k]);

  await abrir(cA.id, kA.id); await p.waitForTimeout(400);
  const q0 = await p.evaluate(() => { const q = document.querySelector("section.rs5"); return q && { txt: q.textContent, gerar: !!q.querySelector("button[onclick^='gerarResumo']") }; });
  conf(`no Judicial o quadro aparece com Gerar e a fonte (${q0 && q0.txt.replace(/\s+/g, " ").slice(0, 80)})`, q0 && q0.gerar && /Petição inicial/.test(q0.txt));
  conf("o quadro fica logo abaixo do cartão do caso", await p.evaluate(() => { const c = document.querySelector(".linha-caso"), q = document.querySelector("section.rs5");
    return !!c && !!q && !!(c.compareDocumentPosition(q) & Node.DOCUMENT_POSITION_FOLLOWING); }));
  await p.click("section.rs5 button[onclick^='gerarResumo']");
  await p.waitForSelector("section.rs5 .rs5-barra", { timeout: 5000 });
  conf(`o pedido vai recortado, sem a peça inteira (${pedido && pedido.recorte.length} caracteres)`, pedido && /DOS PEDIDOS/.test(pedido.recorte) && pedido.fase === "judicial" && pedido.der_caso === "2025-03-10");
  const q1 = await p.evaluate(() => ({ segs: document.querySelectorAll("section.rs5 .rs5-seg").length, ped: (document.querySelector("section.rs5 .rs5-ped") || {}).textContent }));
  conf(`fechado, a linha do tempo tem um trecho por período (${q1.segs}) e o pedido (${q1.ped})`, q1.segs === 2 && /Aposentadoria/.test(q1.ped) && /DER 10\/03\/2025/.test(q1.ped));
  if (!(await p.evaluate(() => _rsAberto))) await p.click("section.rs5 .rs5-cab button");
  await p.waitForSelector("section.rs5 .rs5-lins", { timeout: 3000 });
  const durs = await p.evaluate(() => [...document.querySelectorAll("section.rs5 .rs5-dur")].map(e => e.textContent));
  conf(`aberto, cada período diz a duração e a natureza (${durs.join("; ")})`, durs.join("; ") === "7a 10m rural; 2a 6m especial");
  conf("aberto, a frase fica à vista", await p.evaluate(id => (document.getElementById("rs5-frase-" + id) || {}).textContent || "", kA.id).then(t => /rural de 02\/12\/1978/.test(t)));
  const gravado = banco.t.casos.find(k => k.id === kA.id).resumo;
  conf(`o resumo foi gravado no caso com a fonte (${gravado && gravado.fonte && gravado.fonte.rot})`, gravado && gravado.texto === RESPOSTA.texto && gravado.fonte && gravado.periodos.length === 2);

  await abrir(cB.id, kB.id); await p.waitForTimeout(300);
  conf("no INSS não há quadro", !(await p.$("section.rs5")));
  await abrir(cC.id, kC.id); await p.waitForTimeout(300);
  conf("no pré-caso não há quadro", !(await p.evaluate(id => typeof rsLigado === "function" && rsLigado(D.casoPorId.get(id)), kC.id)));

  conf("sem erro de página", !erros.length);
  console.log(erros.join("\n"));
  console.log(`${ok.filter(([, v]) => v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ok.every(([, v]) => v) && !erros.length ? 0 : 1);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
