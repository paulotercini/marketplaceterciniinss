// F621 · as anotações do caso (pedido do Paulo de 16.11.2026): o cartão do Escritório tem Responder; com tarefa, Responder abre a janela
// do prazo, sem tarefa abre a resposta na anotação; o quadro Prazos mostra a inicial de quem faz. Banco simulado e dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const PAULO = FIX.colaboradores[0].id;
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: [...FIX.colaboradores], clientes: [], casos: [], atribuicoes: [], documentos_beneficio: FIX.documentos_beneficio || [],
  modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;
const iso = n => new Date(Date.now() - 3 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
const ts = n => `${iso(n)}T12:00:00-03:00`;
let seq = 0;
const id = p => `${p}0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const base = (c, extra) => ({ id: id("b"), cliente_id: c.id, titulo: c.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
  marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, dcb_prorrogacao_pedida: false, criado_em: ts(-300), ...extra });
const cli = nome => { const c = { id: id("c"), nome, cpf: null, telefone: null, campos: {}, telefones: [], criado_em: ts(-400) }; T.clientes.push(c); return c; };
const and = (k, n, texto) => { const a = { id: id("e"), caso_id: k.id, autor_id: PAULO, texto, origem: "app", origem_id: null, criado_em: ts(n),
  publico: false, excluir: false, importante: false, urgente: false, responde_a: null }; T.andamentos.push(a);
  T.andamentos_lidos.push({ andamento_id: a.id, colaborador_id: PAULO }); return a; };

// A · anotação com tarefa de quem faz
const cA = cli("Cliente Teste Tarefa");
const kA = base(cA, { origem_lista: "🌻 INSS", beneficio: "Aposentadoria por idade", especie: "B41", fase: "inss", protocolos: ["1700000901"] });
T.casos.push(kA); T.atribuicoes.push({ caso_id: kA.id, colaborador_id: PAULO });
const nA = and(kA, -1, "Pedir o PPP à empresa.");
T.andamento_tarefas.push({ id: id("f"), andamento_id: nA.id, caso_id: kA.id, colaborador_id: PAULO, atribuido_por: PAULO, lembrar_em: iso(6),
  natureza: "compromisso", papel: "executa", concluida_em: null, iniciada_em: null, etapas: [], criado_em: nA.criado_em });
// B · anotação sem tarefa
const cB = cli("Cliente Teste Sem Tarefa");
const kB = base(cB, { origem_lista: "🌻 INSS", beneficio: "Aposentadoria por idade", especie: "B41", fase: "inss", protocolos: ["1700000902"] });
T.casos.push(kB); T.atribuicoes.push({ caso_id: kB.id, colaborador_id: PAULO });
and(kB, -1, "Cliente informou que trará a carteira de trabalho.");

const ok = [];
const conf = (nome, v) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); };

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if(!fs.existsSync(a)){ r.writeHead(404); return r.end(); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const erros = [];
  const pagina = async (c, k) => {
    const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
    await ctx.addInitScript(([u, ss]) => {
      localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
      localStorage.setItem("crm_sessao", JSON.stringify(ss));
      localStorage.setItem("crm_tema", "v10");
      localStorage.setItem("crm_dash_caso", "1");
    }, [SUPA, SESSAO]);
    await instalarBanco(ctx, { SUPA, SESSAO, banco });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com|google\.com\/s2/, r => r.abort());
    const p = await ctx.newPage();
    p.on("pageerror", e => erros.push(e.message));
    p.on("dialog", d => d.accept());
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
    await p.waitForSelector("#app.logado", { timeout: 15000 });
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
    await p.evaluate(([cid, kid]) => { abrirFicha(cid).then(() => { casoSel = kid; abaAtiva = 2; repintarFicha(); }); }, [c.id, k.id]);
    await p.waitForSelector(".db-dash");
    await p.waitForTimeout(400);
    return { p, ctx };
  };

  let { p, ctx } = await pagina(cA, kA);
  /* F666 · o quadro de Prazos saiu do Caso */ false && conf("o quadro Prazos mostra a inicial de quem faz", await p.evaluate(() => { const a = document.querySelector(".fp5-lin .fp5-av"); return !!a && /P/.test(a.textContent) && /Quem faz/.test(a.nextElementSibling?.textContent || ""); }));
  conf("o cartão do Escritório tem Responder", await p.locator('.db-desp [data-ae="responder"]').count() === 1);
  await p.click('.db-desp [data-ae="responder"]');
  await p.waitForTimeout(400);
  conf("com tarefa, Responder abre a janela do prazo", await p.evaluate(() => !!document.querySelector("#painel-prazo.aberto")));
  await ctx.close();

  ({ p, ctx } = await pagina(cB, kB));
  await p.click('.db-desp [data-ae="responder"]');
  await p.waitForTimeout(400);
  conf("sem tarefa, Responder abre a resposta na anotação", await p.evaluate(() => !!document.querySelector("#ri-box") && !document.querySelector("#painel-prazo.aberto")));
  await ctx.close();

  console.log("=== F621 · Responder e a inicial nos Prazos ===");
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length + erros.length;
  console.log(`${ok.length - ok.filter(x => !x[1]).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
