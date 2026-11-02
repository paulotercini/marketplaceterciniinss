// F248 · a segunda leva de um clique: a Ouvidoria no prazo de análise vencido (abrir e a resposta, com a data de
// voltar e o desfazer) e a proposta de acordo e os cálculos no movimento do PJe (aceitei, recusei, falar com o cliente,
// concordei com os cálculos), em resposta ao movimento. Banco simulado e dados fictícios. Uso: node f248.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f248";
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
let seq = 0;
const id = p => `${p}0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const cli = (nome, campos = {}) => { const c = { id: id("c"), nome, cpf: null, telefone: null, campos, telefones: [], criado_em: ts(-400) }; T.clientes.push(c); return c; };
const caso = (c, o) => { const k = { id: id("b"), cliente_id: c.id, titulo: c.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
  marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, dcb_prorrogacao_pedida: false, origem_lista: "🌻 INSS",
  criado_em: ts(-300), ...o }; T.casos.push(k); T.atribuicoes.push({ caso_id: k.id, colaborador_id: PAULO }); return k; };
const and = (k, n, texto, o = {}) => { const a = { id: id("e"), caso_id: k.id, autor_id: PAULO, texto, origem: "app", origem_id: null, criado_em: ts(n),
  publico: false, excluir: false, importante: false, urgente: false, responde_a: null, ...o }; T.andamentos.push(a); return a; };



// O · INSS com o prazo de análise vencido (B41, 90 dias da DER)
const cO = cli("Olga Fictícia Ouvidoria");
const kO = caso(cO, { beneficio: "Apos. por Idade", especie: "B41", fase: "inss", der: iso(-200), protocolos: ["1700000401"] });
and(kO, -150, "Requerimento protocolado.");
// J · judicial com proposta de acordo e cálculos
const cJ = cli("Joana Fictícia Acordo");
const kJ = caso(cJ, { beneficio: "Aux. Incapacidade Temporária", especie: "B31", fase: "judicial", origem_lista: "👪 Judicial", processos: [{ numero: "5000002-22.2026.4.03.6314" }] });
const aAc = and(kJ, -2, "PJe (1º grau): Juntada de Petição de proposta de acordo — em 18.10.2026 · 5000002-22.2026.4.03.6314", { origem: "pje", origem_id: "mov:1:2026-10-18" });
const aCa = and(kJ, -1, "PJe (1º grau): Juntada de cálculos do INSS — em 19.10.2026 · 5000002-22.2026.4.03.6314", { origem: "pje", origem_id: "mov:2:2026-10-19" });

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
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const abrir = async (c, k) => { await p.evaluate(async ([cid, kid]) => { await abrirFicha(cid); casoSel = kid; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); fecharCaixa(); }, [c.id, k.id]); await p.waitForTimeout(500); };
  // F275 · a linha da faixa mostra só a data e o abrir: a Ouvidoria fica no rodapé do painel do prazo
  const painelOuv = async () => { await p.evaluate(() => { const i = faixaAtual.findIndex(x => /ouv-/.test(x.acao || "")); if (i >= 0) abrirPainelPrazo(i); }); await p.waitForTimeout(400); };
  const util = n => p.evaluate(n => proxDiaUtil(somaDias(hoje(), n)), n);
  const br = s => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;




  // 1 · Ouvidoria no prazo de análise vencido
  await abrir(cO, kO); await painelOuv();
  conf("o prazo de análise vencido traz 'Abrir Ouvidoria'", !!(await p.$("#painel-prazo .ouv-abrir")));
  await p.screenshot({ path: path.join(OUT, "01-ouvidoria.png") });
  await p.click("#painel-prazo .ouv-abrir");
  await p.fill("#ouv-num", "2026-123456");
  const em30 = await util(30), n1 = T.andamentos.length;
  await p.click('button:has-text("Registrar a reclamação")');
  await p.waitForTimeout(700);
  const ov = T.andamentos.slice(n1).find(a => a.caso_id === kO.id);
  conf(`a reclamação é anotada com o número (${ov && ov.texto})`, ov && ov.texto === `[OUVIDORIA] Reclamação aberta na Ouvidoria pelo prazo de análise vencido (nº 2026-123456). Ver a resposta em ${br(em30)}.`);
  conf("a resposta fica marcada para 30 dias", T.andamento_tarefas.some(t => t.andamento_id === (ov || {}).id && t.lembrar_em === em30));
  await abrir(cO, kO); await painelOuv();
  conf("depois, o botão vira 'Ouvidoria respondeu · +15 d'", !!(await p.$("#painel-prazo .ouv-resp")) && !(await p.$("#painel-prazo .ouv-abrir")));
  const em15 = await util(15), n2 = T.andamentos.length;
  await p.click("#painel-prazo .ouv-resp");
  await p.waitForTimeout(700);
  const rs = T.andamentos.slice(n2).find(a => a.caso_id === kO.id);
  conf(`a resposta é anotada num clique (${rs && rs.texto})`, rs && rs.texto === `[OUVIDORIA] A Ouvidoria respondeu: o pedido segue em análise. Conferir de novo em ${br(em15)}.`
    && T.andamento_tarefas.some(t => t.andamento_id === rs.id && t.lembrar_em === em15));
  conf("aparece o desfazer", await p.evaluate(() => /desfazer/i.test((document.getElementById("aviso") || {}).textContent || "")));
  await p.click("#aviso .aviso-bt");
  await p.waitForTimeout(600);
  conf("desfazer apaga a anotação e o lembrete", !T.andamentos.find(a => a.id === rs.id) && !T.andamento_tarefas.some(t => t.andamento_id === rs.id));

  // 2 · proposta de acordo e cálculos no movimento do PJe
  await abrir(cJ, kJ); await p.evaluate(() => irSubAba("cnj")); await p.waitForTimeout(400);
  const bts = await p.$$eval(".acordo-bt", b => b.map(x => x.textContent));
  await p.screenshot({ path: path.join(OUT, "02-acordo.png") });
  conf(`o movimento da proposta e o dos cálculos trazem os botões (${bts.join(", ")})`, bts.join() === "Concordei com os cálculos,Aceitei o acordo,Recusei,Falar com o cliente" || bts.sort().join() === ["Aceitei o acordo","Concordei com os cálculos","Falar com o cliente","Recusei"].join());
  const n3 = T.andamentos.length;
  await p.hover('.timeline li:has(.acordo-bt:has-text("Aceitei o acordo"))');   // F288 · com mouse, as ações aparecem ao passar sobre o cartão
  await p.click('.acordo-bt:has-text("Aceitei o acordo")');
  await p.waitForTimeout(700);
  const ac = T.andamentos.slice(n3).find(a => a.caso_id === kJ.id);
  conf(`aceitar registra em resposta ao movimento, com ⭐ (${ac && ac.texto})`, ac && ac.texto === "Aceitei o acordo proposto pelo INSS." && ac.responde_a === aAc.id && ac.importante);
  await abrir(cJ, kJ); await p.evaluate(() => irSubAba("cnj")); await p.waitForTimeout(400);
  conf("respondida, a proposta não oferece os botões de novo", !(await p.$('.acordo-bt:has-text("Aceitei o acordo")')) && !!(await p.$('.acordo-bt:has-text("Concordei com os cálculos")')));
  const n4 = T.andamentos.length;
  await p.hover('.timeline li:has(.acordo-bt:has-text("Concordei com os cálculos"))');   // F288 · com mouse, as ações aparecem ao passar sobre o cartão
  await p.click('.acordo-bt:has-text("Concordei com os cálculos")');
  await p.waitForTimeout(700);
  const cc = T.andamentos.slice(n4).find(a => a.caso_id === kJ.id);
  conf("concordar com os cálculos registra em resposta ao movimento", cc && cc.texto === "Concordei com os cálculos." && cc.responde_a === aCa.id);
  const fc = await p.evaluate(() => ["Proposta de acordo apresentada", "Acordo homologado", "Remessa à contadoria para cálculos"].map(t => !!botoesAcordo({ id: "x", caso_id: "y", texto: `PJe (1º grau): ${t} — em 19.10.2026` })));
  conf(`o acordo homologado e a contadoria não pedem resposta (${fc.join(",")})`, fc.join() === "true,false,false");

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
