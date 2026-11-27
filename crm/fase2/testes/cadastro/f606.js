// F606 · a data de retorno do pré-caso: grava em precaso.retorno, só no CRM, e aparece no Meu Dia e na aba Prazos. Banco simulado e dados fictícios. Uso: node f606.js [pasta-das-fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f606";
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
  await p.click("#btn-processos"); await p.click("#menu-processos .mp-pc"); await p.waitForTimeout(500);

  const dia = "2026-12-01";
  conf("o cartão tem o campo da data de retorno", !!(await p.$(`[data-pc-ret="${KA}"]`)));
  await p.fill(`[data-pc-ret="${KA}"]`, dia);
  await p.fill(`[data-pc-ret-mot="${KA}"]`, "trazer a CTPS antiga");
  await p.click(`[data-pc-ret-salvar="${KA}"]`); await p.waitForTimeout(500);
  const linha = T.casos.find(k => k.id === KA);
  conf("grava em precaso.retorno sem perder o id", (linha.precaso.retorno||{}).data === dia && linha.precaso.retorno.motivo === "trazer a CTPS antiga" && linha.precaso.id === "pc_a63");
  conf("não mexe no casos.prazo (do To Do)", !linha.prazo);
  await p.evaluate(i => { abaAtiva = 0; abrirFicha(i); }, A); await p.waitForTimeout(700);
  await p.click("#btn-processos"); await p.click("#menu-processos .mp-pc"); await p.waitForTimeout(400);
  conf("a data volta ao reabrir a ficha", await p.$eval(`[data-pc-ret="${KA}"]`, e => e.value) === dia);
  await p.screenshot({ path: path.join(OUT, "a-cartao.png") });
  const md = await p.evaluate(k => itensAgendaTodos().filter(x => x.k && x.k.id === k).map(x => [x.data, x.selo, x.resumo, x.fatal]), KA);
  conf("entra no Meu Dia como Retorno do pré-caso, não prazo fatal", md.some(x => x[0] === dia && x[1] === "Retorno do pré-caso" && /CTPS/.test(x[2]) && !x[3]));
  await p.click('.mt[data-vv="5"]').catch(() => {}); await p.waitForTimeout(500);
  const pz = await p.$eval("#detalhe", e => e.textContent).catch(() => "");
  // F829 · no modo só To Do (até 31/12/2026) o retorno do pré-caso, que é do CRM, sai da aba Prazos
  const soTodo = await p.evaluate(() => PZ_SO_TODO);
  conf(soTodo ? "no modo só To Do, não aparece na aba Prazos" : "aparece na aba Prazos", /Retorno do pré-caso/.test(pz) !== soTodo);
  await p.screenshot({ path: path.join(OUT, "b-prazos.png") });
  // apagar
  await p.click("#btn-processos"); await p.click("#menu-processos .mp-pc"); await p.waitForTimeout(400);
  await p.fill(`[data-pc-ret="${KA}"]`, "");
  await p.click(`[data-pc-ret-salvar="${KA}"]`); await p.waitForTimeout(500);
  conf("apagar a data tira o retorno", !T.casos.find(k => k.id === KA).precaso.retorno);
  conf("sem retorno, sai do Meu Dia", await p.evaluate(k => !itensAgendaTodos().some(x => x.k && x.k.id === k && x.selo === "Retorno do pré-caso"), KA));
  conf("nenhum andamento foi gravado", T.andamentos.length === antes);
  conf("sem erro na página", erros.length === 0);
  if (erros.length) console.log(erros);

  await nav.close(); s.close();
  const f = ok.filter(x => !x[1]).length;
  console.log(`\n${ok.length - f}/${ok.length}`);
  process.exit(f ? 1 : 0);
})();
