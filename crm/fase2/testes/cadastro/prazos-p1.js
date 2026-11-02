// P1 dos prazos (31.10.2026): o mandado de segurança contra o indeferimento (120 dias), a perda da qualidade de
// segurado e a decadência da revisão viram linhas do quadro Prazos e itens do Meu Dia. Banco simulado e dados fictícios.
// Uso: node prazos-p1.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/prazos-p1";
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



// A · indeferido há 10 dias, sem recurso: recorrer e mandado de segurança
const cA = cli("Ana Fictícia Indeferida");
const kA = caso(cA, { beneficio: "Apos. por Idade", especie: "B41", fase: "inss", protocolos: ["1700000501"], decisao_em: iso(-10), resultado: "indeferido" });
// B · deferido: nada de mandado de segurança
const cB = cli("Beto Fictício Deferido");
const kB = caso(cB, { beneficio: "Apos. por Idade", especie: "B41", fase: "inss", protocolos: ["1700000502"], decisao_em: iso(-10), resultado: "deferido" });
// C · decisão de 130 dias atrás: o mandado de segurança já decaiu
const cC = cli("Caio Fictício Antigo");
const kC = caso(cC, { beneficio: "Apos. por Idade", especie: "B41", fase: "inss", protocolos: ["1700000503"], decisao_em: iso(-130), resultado: "indeferido" });
// D · cliente com CNIS (a graça é simulada) e carta de concessão
const cD = cli("Dora Fictícia Qualidade");
const kD = caso(cD, { beneficio: "Revisão", especie: "B42", fase: "escritorio", origem_lista: "🙋 Escritório", nbs: ["1234567890"] });

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
  const hj = iso(0);

  // 1 · mandado de segurança
  const ms = await p.evaluate(ids => ids.map(i => msAte(D.casoPorId.get(i))), [kA.id, kB.id, kC.id]);
  conf("indeferido há 10 dias: mandado de segurança até 120 dias da decisão", ms[0] === iso(110));
  conf("deferido: sem mandado de segurança", ms[1] === null);
  conf("decisão de 130 dias atrás: a data passou e não aparece", ms[2] === null);
  const lin = await p.evaluate(c => linhasDeDatas(c).linhas.filter(x => x.rotulo === "Mandado de segurança até").map(x => x.data), cA.id);
  conf("o quadro Prazos do caso ganha a linha do mandado de segurança", lin.length === 1 && lin[0] === iso(110));
  const md = await p.evaluate(kid => itensAgenda(null).filter(i => i.k && i.k.id === kid && i.selo === "Mandado de segurança").map(i => i.data), kA.id);
  conf("o Meu Dia traz o mandado de segurança na data", md.includes(iso(110)));
  await p.evaluate(kid => { D.tarefas.push({ id: "t-ms", caso_id: kid, titulo: "Redigir o mandado de segurança", concluida: false }); }, kA.id);
  conf("com a tarefa de redigir o mandado de segurança, a linha sai", await p.evaluate(kid => msAte(D.casoPorId.get(kid)) === null, kA.id));
  await p.evaluate(() => { D.tarefas = D.tarefas.filter(t => t.id !== "t-ms"); });

  // 2 · qualidade de segurado (cálculo simulado: a regra do art. 15 tem prova própria)
  const perda = iso(20), mantida = iso(18);
  await p.evaluate(([cid, perda, mantida]) => {
    const c = D.cliPorId.get(cid); c.campos = { ...(c.campos || {}), triagem: { pdf: { cnis: { vinculos: [{ tipo: "Empregado" }], analise: {} } } } };
    window.calcularGraca = () => ({ perda, mantidaAte: mantida, base: 12, ultima: "09/2025", premissas: [] });
  }, [cD.id, perda, mantida]);
  const gl = await p.evaluate(c => linhasDeDatas(c).linhas.filter(x => x.rotulo === "Qualidade de segurado até").map(x => x.data), cD.id);
  conf("o quadro Prazos ganha a data até quando a qualidade se mantém", gl.length === 1 && gl[0] === mantida);
  const gm = await p.evaluate(c => itensAgenda(null).filter(i => i.cli && i.cli.id === c && i.selo === "Qualidade").map(i => i.data), cD.id);
  conf("o Meu Dia avisa 30 dias antes da perda", gm.length === 1 && gm[0] === iso(-10));
  await p.evaluate(() => { window.calcularGraca = () => ({ semLimite: true, premissas: [] }); _gracaMemo.clear(); });
  conf("com benefício em manutenção, nada aparece", await p.evaluate(c => !linhasDeDatas(c).linhas.some(x => x.rotulo === "Qualidade de segurado até"), cD.id));

  // 3 · decadência da revisão (a carta é simulada: a conta tem prova própria)
  await p.evaluate(([c, ate]) => {
    const f0 = fontesDoDossie;
    window.fontesDoDossie = id => id === c ? { ...f0(id), cartas: [{ nb: "1234567890" }], extratos: [] } : f0(id);
    window.decadenciaDe = () => ({ ate, base: "primeiro pagamento em 01/2017" });
  }, [cD.id, iso(200)]);
  const dl = await p.evaluate(c => linhasDeDatas(c).linhas.filter(x => x.rotulo === "Revisão até"), cD.id);
  conf("a decadência da revisão vira linha, presa ao caso do NB", dl.length === 1 && dl[0].data === iso(200) && dl[0].casoId === kD.id);
  await p.evaluate(ate => { window.decadenciaDe = () => ({ ate, base: "x" }); }, iso(900));
  conf("a mais de dois anos do fim, não aparece", await p.evaluate(c => !linhasDeDatas(c).linhas.some(x => x.rotulo === "Revisão até"), cD.id));

  // 4 · a ficha abre com as linhas, sem erro
  await p.evaluate(async c => { await abrirFicha(c); }, cA.id);
  await p.evaluate(kid => { casoSel = kid; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); }, kA.id);
  await p.waitForTimeout(500);
  conf("a faixa Prazos do caso mostra o mandado de segurança", /Mandado de segurança/.test(await p.textContent("body")));
  await p.screenshot({ path: path.join(OUT, "01-caso.png") });

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
