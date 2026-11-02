// P5 dos prazos (31.10.2026): a renovação do CadÚnico vale para todo BPC, usa a data do Meu CadÚnico quando o caso
// não tem a anotada, e entra no quadro Prazos e no Meu Dia. Banco simulado e dados fictícios.
// Uso: node prazos-p5.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/prazos-p5";
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



const dnIdoso = "1950-01-01", dnJovem = "1990-01-01";
const brDe = n => iso(n).split("-").reverse().join("/");
const cA = cli("Ana Fictícia Deficiente"); cA.dn = dnJovem; cA.dossie = { cadunico: { familia: { atualizada_em: brDe(-700) } } };
const kA = caso(cA, { beneficio: "BPC/LOAS deficiente", especie: "B87", fase: "encerrado" });
const cB = cli("Beto Fictício Idoso"); cB.dn = dnIdoso;
const kB = caso(cB, { beneficio: "BPC/LOAS idoso", especie: "B88", fase: "encerrado", cadunico: iso(-400) });
const cC = cli("Caio Fictício Sem Data"); cC.dn = dnJovem;
caso(cC, { beneficio: "BPC/LOAS deficiente", especie: "B87", fase: "inss" });

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

  const r = await p.evaluate(([a, b]) => [renovaCadunico(D.casoPorId.get(a)), renovaCadunico(D.casoPorId.get(b))], [kA.id, kB.id]);
  conf("o BPC da pessoa com deficiência usa a data do Meu CadÚnico", r[0] && r[0] > iso(25) && r[0] < iso(35));
  conf("o caso com a data anotada usa a dele", r[1] && r[1] > iso(320) && r[1] < iso(335));
  const la = await p.evaluate(c => linhasDeDatas(c).linhas.filter(x => x.rotulo === "CadÚnico até").length, cA.id);
  conf("o quadro Prazos traz o CadÚnico a 30 dias", la === 1);
  const lb = await p.evaluate(c => linhasDeDatas(c).linhas.filter(x => x.rotulo === "CadÚnico até").length, cB.id);
  conf("a mais de 180 dias, ainda não aparece", lb === 0);
  const md = await p.evaluate(c => itensAgenda(null).filter(i => i.cli && i.cli.id === c && i.selo === "CadÚnico").length, cA.id);
  conf("o Meu Dia avisa 60 dias antes", md === 1);
  conf("sem nenhuma data, nada aparece", await p.evaluate(c => !cadunicoDoCliente(c), cC.id));
  await p.evaluate(c => D.lembretes.push({ id: "l-cu", cliente_id: c, tipo: "cadunico", ativo: true, proximo_em: "2030-01-01" }), cA.id);
  conf("com o lembrete do CadÚnico, a linha calculada sai", await p.evaluate(c => !cadunicoDoCliente(c), cA.id));

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
