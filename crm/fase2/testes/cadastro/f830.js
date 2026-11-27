// F830 · o quadro do pré-caso (ordem do Paulo de 27.11.2026): passos numerados com quem e quando; Gerar o caso exige a
// procuração e o contrato marcados e converte a linha no CRM; Encerrar exige o motivo da lista (Outro com texto), com
// quem e quando; a caixa "Em qual caso registrar?" destaca o apelido. Banco simulado e dados fictícios.
// Uso: node f830.js [pasta-das-fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f830";
fs.mkdirSync(OUT, { recursive: true });

const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: JSON.parse(JSON.stringify(FIX.clientes)), casos: JSON.parse(JSON.stringify(FIX.casos)),
  atribuicoes: FIX.atribuicoes, documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;
const { EU } = require("./fixturas");
const B = "c0000000-0000-0000-0000-000000000b29", E = "c0000000-0000-0000-0000-000000000e29", F = "c0000000-0000-0000-0000-000000000f29";
const KB = "b0000000-0000-0000-0000-000000000b29", KE = "b0000000-0000-0000-0000-000000000e29", KF1 = "b0000000-0000-0000-0000-0000000001f9", KF2 = "b0000000-0000-0000-0000-0000000002f9";
const caso = o => ({ titulo: "", protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {}, marcadores: [], ...o });
const pc = (id, cli, k, et) => caso({ id: k, cliente_id: cli, titulo: "Cliente Teste", fase: "escritorio", pre_caso: true, beneficio: "Aposentadoria por idade",
  precaso: { id, especie: "Aposentadoria por idade", etapas: et }, origem_lista: "🙋 Escritório", todo_task_id: "tarefa-" + id, criado_em: "2026-11-01T12:00:00Z" });
for (const [id, n] of [[B, "Cliente Teste Gerar"], [E, "Cliente Teste Encerrar"], [F, "Cliente Teste Apelido"]])
  T.clientes.push({ id, nome: n, cpf: null, telefone: "(16) 5500000029", campos: {}, criado_em: "2025-01-01T12:00:00Z" });
T.casos.push(pc("pc_b29", B, KB, { identificacao: { em: "2026-11-20", quem: EU }, pa: { em: "2026-11-21", quem: EU } }), pc("pc_e29", E, KE, {}),
  caso({ id: KF1, cliente_id: F, titulo: "Cliente Teste Apelido", fase: "inss", beneficio: "Aposentadoria por idade", apelido: "Revisão da vida toda", criado_em: "2025-02-01T12:00:00Z" }),
  caso({ id: KF2, cliente_id: F, titulo: "Cliente Teste Apelido", fase: "judicial", beneficio: "Auxílio-doença", criado_em: "2025-03-01T12:00:00Z" }));

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
  const abrir = async id => { await p.evaluate(i => { abaAtiva = 0; abrirFicha(i); }, id); await p.waitForTimeout(700); };
  const quadro = async id => { await abrir(id); await p.click("#btn-processos"); await p.waitForTimeout(200); await p.click("#menu-processos .mp-pc"); await p.waitForTimeout(500); };
  const linha = id => T.casos.find(k => k.id === id);

  // 1 · passos numerados com quem e quando
  await quadro(B);
  const ps = await p.$$eval(".pcq-passos li", ls => ls.map(l => l.textContent.replace(/\s+/g, " ").trim()));
  conf("quatro passos numerados: Identificação, Primeiro atendimento, Análise, Documentos",
    /^1 Identificação/.test(ps[0] || "") && /^2 Primeiro atendimento/.test(ps[1] || "") && /^3 Análise/.test(ps[2] || "") && /^4 Documentos/.test(ps[3] || ""));
  conf("o passo marcado diz quem e quando", /Paulo, 20\.11\.2026/.test(ps[0] || "") && /Paulo, 21\.11\.2026/.test(ps[1] || "") && !/Paulo/.test(ps[2] || ""));

  // 2 · Gerar exige a procuração e o contrato marcados
  conf("sem as marcas, o Gerar fica desligado", await p.$eval("[data-pc-gerar]", b => b.disabled));
  conf("a função também recusa sem as marcas", await p.evaluate(([c, k]) => { gerarCasoDoQuadro(c, k); return !document.querySelector("#pcm-ok"); }, [B, KB]));
  await p.check(`[data-pc-ass="${KB}|proc"]`); await p.waitForTimeout(400);
  conf("a procuração marcada grava quem e quando", (linha(KB).precaso.assinados || {}).proc && linha(KB).precaso.assinados.proc.por === EU);
  conf("só com a procuração, o Gerar segue desligado", await p.$eval("[data-pc-gerar]", b => b.disabled));
  await p.check(`[data-pc-ass="${KB}|contr"]`); await p.waitForTimeout(400);
  conf("com as duas marcas, o Gerar liga", await p.$eval("[data-pc-gerar]", b => !b.disabled));
  await p.screenshot({ path: path.join(OUT, "b-quadro.png") });
  await p.click("[data-pc-gerar]"); await p.waitForSelector("#pcm-ok");
  await p.selectOption('[data-pcm="inicio"]', "inss"); await p.click("#pcm-ok"); await p.waitForTimeout(1200);
  const kb = linha(KB);
  conf("o pré-caso vira caso na mesma linha, no CRM", kb.pre_caso === false && kb.fase === "inss" && T.casos.filter(k => k.cliente_id === B).length === 1);
  conf("o caso guarda o desfecho e as marcas (o migrar.py o reconhece)", (kb.precaso.desfecho || {}).tipo === "caso" && kb.precaso.assinados.contr && kb.mover_para === "🌻 INSS");

  // 3 · Encerrar sem gerar caso: motivo obrigatório, Outro pede texto
  await quadro(E);
  await p.click("[data-pc-encerrar]"); await p.waitForSelector("#pcm-ok");
  await p.click("#pcm-ok"); await p.waitForTimeout(200);
  conf("sem motivo, não encerra", !!(await p.$("#pcm-ok")) && linha(KE).fase === "escritorio");
  await p.selectOption('[data-pcm="motivo"]', "Outro"); await p.click("#pcm-ok"); await p.waitForTimeout(400);
  conf("Outro sem texto não encerra", linha(KE).fase === "escritorio");
  await p.click("[data-pc-encerrar]"); await p.waitForSelector("#pcm-ok");
  await p.selectOption('[data-pcm="motivo"]', "Outro"); await p.fill('[data-pcm="outro"]', "mudou de cidade");
  await p.click("#pcm-ok"); await p.waitForTimeout(800);
  const ke = linha(KE), aq = (ke.precaso || {}).arquivo || {};
  conf("encerrado com o motivo, quem e quando", ke.fase === "encerrado" && aq.motivo === "Outro: mudou de cidade" && aq.por === EU && !!aq.em && ke.pre_caso === true);

  // 4 · "Em qual caso registrar?" destaca o apelido
  await abrir(F);
  await p.evaluate(i => escolherProcesso(i, D.casosDoCliente.get(i).filter(k => k.fase !== "encerrado")), F); await p.waitForTimeout(300);
  conf("o apelido aparece em destaque, com a espécie embaixo", await p.evaluate(() => { const a = document.querySelector(".esc-apel");
    return !!a && a.textContent === "Revisão da vida toda" && /Aposentadoria/.test((a.parentElement.querySelector(".esc-esp") || {}).textContent || ""); }));
  await p.screenshot({ path: path.join(OUT, "f-escolha.png") });

  conf("sem erro de página", erros.length === 0);
  if (erros.length) console.log(erros);
  const n = ok.filter(x => x[1]).length;
  console.log(`\n${n}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(n === ok.length ? 0 : 1);
})();
