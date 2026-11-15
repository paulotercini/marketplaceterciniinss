// F603 e F604 · as anotações do Microsoft To Do aparecem no pré-caso (aba Pré-caso e anotações do atendimento),
// só leitura, e o campo do processo judicial anterior. Banco simulado e dados fictícios. Uso: node f603.js [pasta-das-fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f603";
fs.mkdirSync(OUT, { recursive: true });

const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais", "qualidade_planos"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: JSON.parse(JSON.stringify(FIX.clientes)), casos: JSON.parse(JSON.stringify(FIX.casos)),
  atribuicoes: FIX.atribuicoes, documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: JSON.parse(JSON.stringify(FIX.config_app)) });
const banco = new Banco(dados);
const T = banco.t;
const A = "c0000000-0000-0000-0000-000000000a63", KA = "b0000000-0000-0000-0000-000000000a63";
T.clientes.push({ id: A, nome: "Cliente Teste Um", cpf: "70010060311", telefone: "(16) 5500000001", campos: {}, criado_em: "2025-01-01T12:00:00Z" });
T.casos.push({ id: KA, cliente_id: A, titulo: "Cliente Teste Um", fase: "escritorio", pre_caso: true, precaso: { id: "pc_a63" },
  beneficio: "Aposentadoria por idade", origem_lista: "🙋 Escritório", todo_task_id: "t-a63", criado_em: "2026-11-01T12:00:00Z",
  protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {}, marcadores: [] });
T.andamentos.push(
  { id: "d0000000-0000-0000-0000-000000000a01", caso_id: KA, origem: "todo", texto: "Cliente trará a CTPS antiga na segunda.", criado_em: "2026-11-10T12:00:00" },
  { id: "d0000000-0000-0000-0000-000000000a02", caso_id: KA, origem: "todo", texto: "Primeiro atendimento: quer aposentar por idade.", criado_em: "2026-11-03T12:00:00" });
const antes = T.andamentos.length;

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
    localStorage.setItem("crm_passos_tudo", "1");
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  await instalarBanco(ctx, { SUPA, SESSAO, banco });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await p.evaluate(i => { abaAtiva = 0; abrirFicha(i); }, A); await p.waitForTimeout(900);
  await p.click('.mt[data-vv="6"]'); await p.waitForTimeout(500);

  const bloco = await p.$eval(".pc-notas", e => e.textContent).catch(() => "");
  conf("a aba Pré-caso tem o bloco das anotações do To Do", /Anotações do Microsoft To Do \(2\)/.test(bloco));
  conf("o bloco traz o texto das anotações", /CTPS antiga/.test(bloco) && /aposentar por idade/.test(bloco));
  conf("a mais recente vem primeiro", bloco.indexOf("CTPS antiga") < bloco.indexOf("aposentar por idade"));
  await p.screenshot({ path: path.join(OUT, "a-aba.png") });

  // F604 · o processo judicial anterior (outro escritório)
  conf("o cartão tem o campo do processo anterior", !!(await p.$(`[data-pc-proc="${KA}"]`)));
  await p.fill(`[data-pc-proc="${KA}"]`, "0001234-56.2020.4.03.6314");
  await p.click(`[data-pc-proc-salvar="${KA}"]`); await p.waitForTimeout(500);
  const linha = T.casos.find(k => k.id === KA);
  conf("grava o número em precaso.proc_anterior", (linha.precaso.proc_anterior||{}).numero === "0001234-56.2020.4.03.6314" && linha.precaso.id === "pc_a63");
  await p.evaluate(i => { abaAtiva = 0; abrirFicha(i); }, A); await p.waitForTimeout(700);
  await p.click('.mt[data-vv="6"]'); await p.waitForTimeout(400);
  conf("o número volta ao reabrir a ficha", await p.$eval(`[data-pc-proc="${KA}"]`, e => e.value) === "0001234-56.2020.4.03.6314");
  await p.screenshot({ path: path.join(OUT, "b-proc.png") });

  const html = await p.evaluate(i => conversaAtendimento(D.cliPorId.get(i)), A);
  conf("as anotações do atendimento mostram o bloco do To Do", /Do Microsoft To Do \(2\)/.test(html) && /CTPS antiga/.test(html));
  conf("nenhum andamento foi gravado", T.andamentos.length === antes);
  conf("sem erro na página", erros.length === 0);
  if (erros.length) console.log(erros);

  await nav.close(); s.close();
  const f = ok.filter(x => !x[1]).length;
  console.log(`\n${ok.length - f}/${ok.length}`);
  process.exit(f ? 1 : 0);
})();
