// P3 dos prazos (31.10.2026): a aba Prazos da ficha junta as datas de todos os casos e as do cliente; o quadro
// Prazos do caso leva a ela pelo "+N em outros casos". Banco simulado e dados fictícios.
// Uso: node prazos-p3.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/prazos-p3";
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

  const z = await p.evaluate(c => { const r = prazosDoCliente(c); return { total: r.total, venc: r.venc, grupos: [...r.grupos.keys()] }; }, cA.id);
  conf("o cliente de dois casos tem as datas dos dois", z.total >= 2 && z.grupos.includes(kA1.id) && z.grupos.includes(kA2.id));
  conf("o vencido é contado", z.venc >= 1);

  await p.evaluate(async ([c, k]) => { await abrirFicha(c); const m = document.getElementById("modal"); if (m) m.style.display = "none";
    casoSel = k; abaAtiva = 2; repintarFicha(); }, [cA.id, kA1.id]);
  await p.waitForTimeout(300);
  console.log(await p.evaluate(() => [abaAtiva, [...document.querySelectorAll(".mt")].map(b => b.dataset.vv + ":" + b.textContent.trim().slice(0,20))]));
  const bt = await p.$('.mt[data-vv="5"]');
  conf("o menu da ficha tem a aba Prazos com a contagem", bt && /^Prazos \d+/.test((await bt.textContent()).trim()) && !!(await p.$('.mt[data-vv="5"] .mt-pzn')));
  await bt.click();
  await p.waitForSelector(".pz-cli");
  conf("F324 · a aba abre por data, com o próximo prazo fatal no alto", !!(await p.$(".pzc-hero")) && !(await p.$(".pz-cli-g")));
  await p.evaluate(() => pzVer("caso"));
  const secs = await p.$$eval(".pz-cli-g", s => s.map(x => x.dataset.caso));
  conf("a aba mostra um bloco por caso", secs.includes(kA1.id) && secs.includes(kA2.id));
  conf("cada prazo fatal leva a etiqueta da natureza", (await p.$$(".pz-cli .pzc-lin .pz-pill-fatal")).length === 2);
  await p.screenshot({ path: path.join(OUT, "01-aba.png") });

  await p.evaluate(kid => { casoSel = kid; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); }, kA1.id);
  await p.waitForTimeout(300);
  const link = await p.$(".fp-outros");
  conf("o quadro Prazos do caso avisa as datas dos outros casos", link && /\+1 em outros casos/.test(await link.textContent()));
  if (link) { await link.click(); await p.waitForSelector(".pz-cli"); }
  conf("o link abre a aba Prazos", await p.evaluate(() => abaAtiva === 5));

  await p.evaluate(async c => { await abrirFicha(c); const m = document.getElementById("modal"); if (m) m.style.display = "none"; abaAtiva = 2; repintarFicha(); }, cB.id);
  await p.waitForTimeout(300);
  conf("cliente sem data não tem a aba", !(await p.$('.mt[data-vv="5"]')));

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
