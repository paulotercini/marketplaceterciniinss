// F308 · a escolha do caso diz qual é qual (decisão do Paulo, 30.10.2026): os casos do mesmo NB juntos, o
// mais adiantado primeiro, onde corre, etapa, próximo passo, último andamento por extenso, botão do portal,
// as teclas 1 a 9 e o nome próprio do caso. Banco simulado, dados fictícios.
// Uso: node f308.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, EU } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";

const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: JSON.parse(JSON.stringify(FIX.clientes)), casos: [],
  atribuicoes: [], documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;

const CLI = FIX.clientes[0].id, NB = "7193701585";
const iso = n => new Date(Date.now() + n * 86400000).toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });
const base = { cliente_id: CLI, marcadores: [], arquivados: {}, importante: false, urgente: false, crps_nups: [], protocolos: [], processos: [],
  dcb_prorrogacao_pedida: false, renda_acima_minimo: false, criado_em: "2026-02-01T12:00:00Z", ronda: {} };
const INSS = "b0000000-0000-0000-0000-0000000308a1", EST = "b0000000-0000-0000-0000-0000000308a2", JEF = "b0000000-0000-0000-0000-0000000308a3";
T.casos.push(
  { ...base, id: INSS, titulo: "Fulana", especie: "B31", beneficio: "Auxílio por incapacidade temporária", fase: "inss", origem_lista: "🌻 INSS",
    nb: NB, protocolos: ["1479410049"], der: "2026-09-02", prazo: iso(-3), ronda: { despacho: { prazo: iso(-3), por: EU, em: iso(-10) } } },
  { ...base, id: EST, titulo: "Fulana", especie: null, beneficio: null, fase: "judicial", origem_lista: "👪 Judicial",
    processo: "1003595-79.2024.8.26.0347", prazo: iso(5), lembrar_motivo: "apelação" },
  { ...base, id: JEF, titulo: "Fulana", especie: "B31", beneficio: "Auxílio por incapacidade temporária", fase: "judicial", origem_lista: "👪 Judicial",
    nb: NB, processo: "5002340-76.2025.4.03.6322", orgao_judicial: "JEF de Catanduva", etapa: "Perícia judicial marcada", dcb: "2025-08-14" });
T.atribuicoes.push({ caso_id: JEF, colaborador_id: EU });
const ts = n => new Date(Date.now() - n * 86400000).toISOString();
T.andamentos.push(
  { id: "a0000000-0000-0000-0000-000000030801", caso_id: JEF, autor_id: EU, texto: "Juntada de laudo do assistente técnico", criado_em: ts(2) },
  { id: "a0000000-0000-0000-0000-000000030802", caso_id: EST, autor_id: null, origem: "pje", texto: "e-SAJ TJSP (1º grau): Sentença de improcedência publicada", criado_em: ts(1) },
  { id: "a0000000-0000-0000-0000-000000030803", caso_id: INSS, autor_id: null, origem: "pat", texto: "Em análise", criado_em: ts(20) });

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
  const p = await ctx.newPage();
  p._erros = [];
  p.on("pageerror", e => p._erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await p.evaluate(c => { casoSel = "__auto__"; abrirFicha(c); }, CLI);
  await p.waitForSelector(".esc-caso", { timeout: 10000 });
  await p.locator(".esc-cx").screenshot({ path: path.join(__dirname, "f308-escolha.png") });

  const ordem = await p.$$eval(".esc-caso", xs => xs.map(x => x.dataset.caso));
  conf("o caso judicial do NB vem primeiro, o do INSS em seguida e o sem NB por último", ordem.join() === [JEF, INSS, EST].join());
  const grupos = await p.$$eval(".esc-gcab", xs => xs.map(x => x.innerText));
  conf("os casos do mesmo NB ficam no mesmo grupo", grupos.length === 2 && /NB 719\.370\.158-5/.test(grupos[0]) && /Sem NB/.test(grupos[1]));
  const txt = id => p.$eval(`.esc-caso[data-caso="${id}"]`, x => x.innerText);
  const tJef = await txt(JEF), tEst = await txt(EST), tInss = await txt(INSS);
  conf("o caso judicial diz onde está (JEF de Catanduva) e a etapa", /JEF de Catanduva/.test(tJef) && /Perícia judicial marcada/.test(tJef));
  conf("o último andamento aparece por extenso, com quem escreveu", /Juntada de laudo do assistente técnico/.test(tJef) && /Paulo/.test(tJef));
  conf("o caso em que você escreveu por último fica marcado", await p.$(`.esc-caso.esc-meu[data-caso="${JEF}"]`) && /você escreveu aqui/.test(tJef));
  conf("a ação estadual sem espécie se identifica pela Justiça Estadual", /Justiça Estadual de SP/.test(tEst) && /Ação na Justiça Estadual, espécie não definida/.test(tEst));
  conf("o movimento do e-SAJ aparece sem o rótulo da coleta", /e-SAJ · Sentença de improcedência publicada/.test(tEst));
  conf("o prazo do caso aparece como prazo, e a volta à fila como volta à fila", /prazo \d\d\/\d\d\/\d{4}/.test(tEst) && /volta à fila .* vencida/.test(tInss));
  conf("o caso do INSS mostra a DER", /DER 02\/09\/2026/.test(tInss));
  conf("o caso estadual tem o botão do e-SAJ", await p.$(`.esc-caso[data-caso="${EST}"] a.lc-acesso[href*="esaj"]`));
  conf("o caso do INSS tem o botão do Meu INSS", /Meu INSS/.test(tInss));

  await p.evaluate(([c, id]) => nomearCaso(c, id), [CLI, INSS]);
  await p.fill(`[data-tit="${INSS}"] input`, "Novo pedido de setembro");
  await p.press(`[data-tit="${INSS}"] input`, "Enter");
  await p.waitForFunction(id => /Novo pedido de setembro/.test((document.querySelector(`.esc-caso[data-caso="${id}"]`) || {}).innerText || ""), INSS);
  conf("o ✎ grava o nome próprio do caso", T.casos.find(k => k.id === INSS).apelido === "Novo pedido de setembro");

  await p.keyboard.press("2");
  await p.waitForFunction(() => document.getElementById("modal").style.display === "none");
  conf("a tecla 2 escolhe o segundo caso", await p.evaluate(() => casoSel) === INSS);

  conf("sem erro de página", !p._erros.length);
  if (p._erros.length) console.log(p._erros.join("\n"));
  const bons = ok.filter(x => x[1]).length;
  console.log(`\n${bons}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(bons === ok.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
