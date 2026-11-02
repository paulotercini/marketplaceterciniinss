// F376 · os flutuantes, a barra do pé dos passos e o aviso temporário não cobrem o que se toca (revisão do Figma, 02.11.2026).
// Aba Prazos com muitas linhas, Pendências do atendimento e o aviso no celular. Banco simulado e dados fictícios. Uso: node f376.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f376";
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



const cA = cli("Ana Fictícia Dois Casos");
const kA1 = caso(cA, { beneficio: "Auxílio por incapacidade", especie: "B31", fase: "inss", protocolos: ["1700000601"], prazo: iso(5) });
const kA2 = caso(cA, { beneficio: "Apos. por Idade", especie: "B41", fase: "judicial", processo: "50000000000000000001", prazo: iso(-2) });
const cB = cli("Beto Fictício Sem Data");
caso(cB, { beneficio: "Apos. por Idade", especie: "B41", fase: "inss" });

for (let i = 0; i < 9; i++) caso(cA, { beneficio: "Apos. por Idade", especie: "B41", fase: "inss", protocolos: [String(1700000700 + i)], prazo: iso(8 + i * 3) });
// o cliente do atendimento, com o CNIS que gera as pendências (o mesmo do f283)
const A = "c0000000-0000-0000-0000-000000000a76", K1 = "b0000000-0000-0000-0000-000000000a76", K2 = "b0000000-0000-0000-0000-000000000b76";
const CNIS = { em: "2026-10-08", nome: "Rosalina Ficta Moura", paginas: 3, qtVinculos: 1, nits: [], contribSemPerda: 150, indicadores: [],
  vinculos: [{ seq: 1, tipo: "Empregado", origem: "LOJAS FICTICIAS LTDA", codigo: "11.444.777/0001-61", inicio: "01/03/2012", fim: "31/05/2019", ultRemun: "05/2019", aberto: false, indicadores: [] },
    { seq: 2, tipo: "Benefício", especie: "31", origem: "AUXILIO DOENCA PREVIDENCIARIO", nb: "6123456780", inicio: "10/03/2018", fim: "20/05/2018", situacao: "CESSADO", aberto: false }],
  analise: { abertos: [], errosEmp: [], abaixo: [{ comp: "03/2018" }, { comp: "04/2018" }, { comp: "05/2018" }, { comp: "09/2018" }], mesAnt: "09/2026", agora: { tipo: "empregado" }, benefAtivos: [], qtComps: 174,
    contagem: { periodos: [["2012-03", "2019-05"]], carencia: 174, anos: 14, meses: 6, foraMinimo: 0 } } };
const pre = (id, pc, esp, ad) => ({ id, cliente_id: A, titulo: "", fase: "escritorio", pre_caso: true, beneficio: esp, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [],
  arquivados: {}, marcadores: [], origem_lista: "🙋 Escritório", precaso: { id: pc, natureza: "", marc: {}, honorarios: "", quem: null, em: "2026-10-12" }, ad, criado_em: "2026-10-12T12:00:00Z" });
T.clientes.push({ id: A, nome: "Rosalina Ficta Moura", cpf: "70010020133", dn: "1962-04-20", sexo: "F", criado_em: "2026-10-01T12:00:00Z",
  dossie: { meuinss: { em: "2026-10-08T10:00:00Z" } }, triagem: { pdf: { cnis: CNIS } }, campos: {} });
T.casos.push(pre(K1, "pc_r1", "", { fora: [], beneficios: { tempo: ["idade"], incapacidade: ["b31"] }, valores: {}, tempos: [] }),
  pre(K2, "pc_r2", "BPC/LOAS", { fora: [], beneficios: { bpc: ["idoso"] }, valores: {}, tempos: [] }));

const ok = [];
const conf = (nome, v) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); };
const FLUT = ["#fab-sug", "#fab-ajuda", ".fab-rapida", "#zap-ag"];

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

  // 1 · a aba Prazos: em toda posição da rolagem, nenhum Abrir fica sob um flutuante
  const sobre = sel => p.evaluate(([fs, bsel]) => {
    const vis = e => { if (!e) return null; const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden") return null; const r = e.getBoundingClientRect(); return r.width ? r : null; };
    const fl = fs.map(x => vis(document.querySelector(x))).filter(Boolean);
    const cruza = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    return [...document.querySelectorAll(bsel)].map(vis).filter(r => r && r.bottom > 0 && r.top < innerHeight).filter(r => fl.some(f => cruza(r, f))).length;
  }, [FLUT, sel]);
  const rolarTudo = async (fn) => { const max = await p.evaluate(() => { const r = document.querySelector(".det-rolagem"); return r ? r.scrollHeight - r.clientHeight : 0; });
    let pior = 0; for (let y = 0; y <= max + 60; y += 60) { await p.evaluate(v => { const r = document.querySelector(".det-rolagem"); if (r) r.scrollTop = v; }, y); pior = Math.max(pior, await fn()); } return { pior, max }; };
  await p.evaluate(async c => { await abrirFicha(c); casoSel = D.casos.find(k => k.cliente_id === c).id; abaAtiva = 5; repintarFicha(); }, cA.id);
  await p.waitForTimeout(400); await p.evaluate(() => { const m = document.getElementById("modal"); if (m) m.style.display = "none"; });
  const nLin = await p.$$eval(".pzc-lin", l => l.length);
  const r1 = await rolarTudo(() => sobre(".pzc button"));
  conf(`aba Prazos a 1440 px: ${nLin} linhas, rolagem de ${r1.max} px, nenhum botão sob os flutuantes (${r1.pior})`, nLin >= 8 && r1.max > 0 && r1.pior === 0);
  await p.screenshot({ path: path.join(OUT, "01-prazos.png") });
  await p.evaluate(() => pzVer("caso")); await p.waitForTimeout(200);
  const r2 = await rolarTudo(() => sobre(".pzc button"));
  conf(`por caso também (${r2.pior})`, r2.pior === 0);
  conf("o texto da linha continua inteiro na coluna do assunto (sem passar da borda)", await p.evaluate(() => [...document.querySelectorAll(".pzc-lin")].every(l => l.scrollWidth <= l.clientWidth + 1)));

  // 2 · atendimento: a barra do pé dos passos não fica sobre a pendência focada nem sobre a última, rolada até o fim
  await p.evaluate(([a, x]) => abrirAtendimentoDe(a, x), [A, "pc_r1"]); await p.waitForTimeout(500);
  await p.evaluate(() => irSubCad("direito")); await p.waitForTimeout(400);
  const pend = () => p.evaluate(() => { const pe = [...document.querySelectorAll(".tp-pe")].find(e => e.offsetParent).getBoundingClientRect();
    const bts = [...document.querySelectorAll(".pa-prob li .btn-mini")]; return { pe: Math.round(pe.top), n: bts.length,
      ult: Math.round(bts[bts.length - 1].closest("li").getBoundingClientRect().bottom) }; });
  const a0 = await pend();
  // foco por teclado em cada "anotar": o botão focado fica acima da barra do pé e dos flutuantes
  const cobertos = await p.evaluate(fs => { const pe = [...document.querySelectorAll(".tp-pe")].find(e => e.offsetParent);
    const fl = fs.map(x => document.querySelector(x)).filter(e => e && getComputedStyle(e).display !== "none").map(e => e.getBoundingClientRect());
    const ruins = []; for (const b of document.querySelectorAll(".pa-prob li .btn-mini")) { b.focus(); const r = b.getBoundingClientRect(), t = pe.getBoundingClientRect();
      if (r.bottom > t.top || fl.some(f => r.left < f.right && f.left < r.right && r.top < f.bottom && f.top < r.bottom)) ruins.push(Math.round(r.bottom) + ">" + Math.round(t.top)); } return ruins; }, FLUT);
  conf(`atendimento: ${a0.n} pendências, nenhum "anotar" focado fica sob a barra do pé (${cobertos.join(" ")})`, a0.n >= 5 && !cobertos.length);
  await p.evaluate(() => { const r = document.querySelector(".det-rolagem"); r.scrollTop = r.scrollHeight; }); await p.waitForTimeout(200);
  const a1 = await pend();
  conf(`rolada até o fim, a última pendência fica inteira acima da barra (${a1.ult} < ${a1.pe})`, a1.ult < a1.pe);
  await p.screenshot({ path: path.join(OUT, "02-pendencias.png") });

  // 3 · celular: o aviso temporário sobe a faixa do iPhone, como a barra de baixo
  const regras = await p.evaluate(() => { const out = []; for (const sh of document.styleSheets) { let rs; try { rs = sh.cssRules; } catch (e) { continue; }
    const vai = l => { for (const r of l) { if (r.selectorText) { if (/~ \.aviso$/.test(r.selectorText) && r.style.bottom) out.push(r.style.bottom); } else if (r.cssRules) vai(r.cssRules); } }; vai(rs); } return out; });
  conf(`as ${regras.length} regras do aviso no celular somam a faixa do iPhone (${regras.join(" | ")})`, regras.length >= 3 && regras.every(b => /safe-area-inset-bottom/.test(b)));
  await p.setViewportSize({ width: 390, height: 844 }); await p.evaluate(() => { _atendAberto.clear && _atendAberto.clear(); irPara && irPara("meudia"); }).catch(() => {});
  await p.waitForTimeout(400);
  await p.evaluate(() => aviso("Aviso de teste com texto longo que quebra em duas linhas no celular", false)); await p.waitForTimeout(400);
  const cel = await p.evaluate(() => { const a = document.getElementById("aviso").getBoundingClientRect(), b = document.querySelector(".barra-cel"); const rb = b && getComputedStyle(b).display !== "none" ? b.getBoundingClientRect() : null;
    return { av: Math.round(a.bottom), barra: rb ? Math.round(rb.top) : null }; });
  conf(`no celular o aviso fica acima da barra de baixo (${cel.av} < ${cel.barra})`, cel.barra !== null && cel.av < cel.barra);
  await p.screenshot({ path: path.join(OUT, "03-aviso-cel.png") });

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
