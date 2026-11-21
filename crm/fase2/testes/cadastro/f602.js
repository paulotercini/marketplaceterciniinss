// F602 · os estados do pré-caso (Ativo, Futuro, Arquivo, Gerar caso) gravam mover_para
// para a ponte do To Do; a lista 💰 Contribuições; o que a ponte fez e o que pede o Paulo
// no 🧹 Cuidar do acervo. Banco simulado e dados fictícios.
// Uso: node f602.js [pasta-das-fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f602";
fs.mkdirSync(OUT, { recursive: true });

const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais", "qualidade_planos"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: JSON.parse(JSON.stringify(FIX.clientes)), casos: JSON.parse(JSON.stringify(FIX.casos)),
  atribuicoes: FIX.atribuicoes, documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: JSON.parse(JSON.stringify(FIX.config_app)) });
const banco = new Banco(dados);
const T = banco.t;
const A = "c0000000-0000-0000-0000-000000000a62", B = "c0000000-0000-0000-0000-000000000b62";
const KA = "b0000000-0000-0000-0000-000000000a62", KB = "b0000000-0000-0000-0000-000000000b62";
const caso = o => ({ titulo: "", protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {}, marcadores: [], ...o });
const agora = new Date().toISOString();
const daqui = d => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
T.clientes.push({ id: A, nome: "Cliente Teste Um", cpf: "70010060211", telefone: "(16) 5500000001", campos: {}, criado_em: "2025-01-01T12:00:00Z" },
  { id: B, nome: "Cliente Teste Dois", cpf: "70010060222", telefone: "(16) 5500000002", campos: {}, criado_em: "2025-01-01T12:00:00Z" });
T.casos.push(caso({ id: KA, cliente_id: A, titulo: "Cliente Teste Um", fase: "escritorio", pre_caso: true, precaso: { id: "pc_a62" },
  beneficio: "Aposentadoria por idade", origem_lista: "🙋 Escritório", todo_task_id: "t-a62", criado_em: "2026-11-01T12:00:00Z" }),
  caso({ id: KB, cliente_id: B, titulo: "Cliente Teste Dois", fase: "escritorio", pre_caso: true, precaso: { id: "pc_b62" },
  beneficio: "BPC/LOAS", origem_lista: "🙋 Escritório", todo_task_id: "t-b62", criado_em: "2026-11-01T12:00:00Z" }));
T.qualidade_planos.push({ id: "q0000000-0000-0000-0000-000000000062", cliente_id: B, ativo: true, modalidade: "mensal", finalidade: "qualidade",
  pagar_ate: daqui(10), inicio: "2026-11", codigo: "1406", valor: 300, criado_em: agora });
T.config_app.push(
  { chave: "todo_movimentos", valor: JSON.stringify([{ em: agora, caso_id: KA, cliente_id: A, de: "🙋 Escritório", para: "concluir", ok: false, erro: "LookupError" },
    { em: agora, caso_id: KB, cliente_id: B, de: "🙋 Escritório", para: "🙏 Aposentadorias Futuras", ok: true }]), atualizado: agora },
  { chave: "precaso_pares", valor: JSON.stringify({ pares: [{ nova: "t-nova62", cliente_id: B, candidatos: [KB], lista: "🙋 Escritório" }] }), atualizado: agora },
  { chave: "precaso_lote", valor: JSON.stringify({ ids: [KA, KB], em: agora }), atualizado: agora });
// o banco simulado não junta pelo chave: vale a última linha
const cfg = k => { const r = T.config_app.filter(x => x.chave === k).pop(); return r ? JSON.parse(r.valor) : null; };

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
  const abrirPc = async id => { await p.evaluate(i => { abaAtiva = 0; abrirFicha(i); }, id); await p.waitForTimeout(700);
    await p.click("#btn-processos"); await p.click("#menu-processos .mp-pc"); await p.waitForTimeout(500); };
  const linha = id => T.casos.find(k => k.id === id);

  // A · F602b: até 31/12/2026 o estado vem só do To Do; o quadro do caso em formação (F668) mostra o estado e não tem botão de mover
  await abrirPc(A);
  conf("o caso em formação mostra o estado no quadro", /Caso em formação/.test(await p.$eval(".pcq-cab", e => e.textContent).catch(() => "")));
  conf("sem botão de mover o pré-caso", !(await p.$("[data-pc-mover]")) && !(await p.$(".pc-mover")));
  await p.screenshot({ path: path.join(OUT, "a-ativo.png") });
  conf("nada grava mover_para", !linha(KA).mover_para && !linha(KB).mover_para);

  // 💰 Contribuições
  await p.evaluate(() => { document.querySelector("#detalhe") && fecharFicha && fecharFicha(); irPara("contribuicoes"); }).catch(() => p.evaluate(() => irPara("contribuicoes")));
  await p.waitForTimeout(500);
  const ctb = await p.evaluate(() => [...document.querySelectorAll("#ctb-l .cli-todos-it")].map(e => e.textContent));
  conf("a lista Contribuições traz o cliente com plano ativo", ctb.length === 1 && ctb[0].includes("Cliente Teste Dois") && /pagar até/.test(ctb[0]));
  conf("o item Contribuições está no menu", !!(await p.$('.lista-item[data-v="contribuicoes"]')));
  await p.screenshot({ path: path.join(OUT, "contribuicoes.png") });

  // 🧹 Cuidar do acervo
  await p.evaluate(() => irPara("acervo")); await p.waitForTimeout(600);
  conf("o acervo mostra os movimentos do To Do com a falha", /1 com falha/.test(await p.$eval("#acervo-movtodo summary", e => e.textContent).catch(() => "")));
  conf("o acervo mostra o par a identificar", !!(await p.$('#acervo-pcpares .pcpar[data-nova="t-nova62"]')));
  await p.screenshot({ path: path.join(OUT, "acervo.png"), fullPage: true });
  await p.click(`#acervo-pcpares [data-par="${KB}"]`); await p.waitForTimeout(500);
  conf("a escolha do par vai a config_app", (cfg("precaso_pares").escolhas || {})["t-nova62"] === KB && !(await p.$("#acervo-pcpares")));
  await p.click("#pclote-desfazer"); await p.waitForTimeout(500);
  conf("o Desfazer marca o lote como desfeito", cfg("precaso_lote").desfeito === true && !(await p.$("#pclote-desfazer")));

  conf("sem erro de página", erros.length === 0);
  if (erros.length) console.log(erros);
  const n = ok.filter(x => x[1]).length;
  console.log(`\n${n}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(n === ok.length ? 0 : 1);
})();
