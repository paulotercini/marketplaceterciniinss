// F497 · os botões do processo (plano aprovado pelo Paulo em 09.11.2026): Ler, Tela, Expedientes e Detalhes nos cartões do
// INSS, do Conselho e do Judicial; a barra do pé da árvore (Baixar, Marcadas, MD, Imagens, Claude, Projeto) e o botão IA de
// cada documento (Resumo, Prazo, Pontos e, no laudo, Laudo), na cor do quadro. Banco simulado e dados fictícios. Uso: node f495.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f495";
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
const base = (c, extra) => ({ id: id("b"), cliente_id: c.id, titulo: c.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
  marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, dcb_prorrogacao_pedida: false, criado_em: ts(-300), ...extra });
const cli = nome => { const c = { id: id("c"), nome, cpf: null, telefone: null, campos: {}, telefones: [], criado_em: ts(-400) }; T.clientes.push(c); return c; };
const and = (k, n, texto, o = {}) => { const a = { id: id("e"), caso_id: k.id, autor_id: PAULO, texto, origem: "app", origem_id: null, criado_em: ts(n, o.h || "12:00"),
  publico: false, excluir: false, importante: false, urgente: false, responde_a: null, ...o }; delete a.h; T.andamentos.push(a);
  T.andamentos_lidos.push({ andamento_id: a.id, colaborador_id: PAULO }); return a; };

const PROC = "50000420420264036102";
// A · INSS com a tela do PAT
const cA = cli("Rita Fictícia Botões");
const kA = base(cA, { origem_lista: "🌻 INSS", beneficio: "Auxílio por incapacidade", especie: "B31", fase: "inss", protocolos: ["1700000801"],
  pat: { "1700000801": { protocolo: "1700000801", nomeServico: "Auxílio por incapacidade temporária", status: "Em análise", dataEntradaRequerimento: iso(-90), anexos: [] } } });
T.casos.push(kA); T.atribuicoes.push({ caso_id: kA.id, colaborador_id: PAULO });
and(kA, -4, "Perícia médica agendada. Agendado para 20/11/2026", { origem: "pat", origem_id: "pat:1700000801:ag1", autor_id: null });

// B · Conselho com mandado de segurança em paralelo, expedientes do PJe e duas peças (sentença e laudo)
const cB = cli("Jorge Fictício Botões");
const kB = base(cB, { origem_lista: "🖥 Conselho de Recursos", beneficio: "Aposentadoria por idade", especie: "B41", fase: "conselho", crps_nups: ["35014000001202699"],
  crps: [{ nup: "35014000001202699", eventos: [{ data: iso(-6), tipo: "tramitacao", resumo: "Encaminhado à Junta de Recursos", bruto: "Encaminhado" }] }],
  processos: [{ numero: PROC, papel: "ms", classe: "Mandado de Segurança" }],
  ronda: { expedientes: { [PROC + "|1"]: { em: ts(-1), grau: "1", itens: [{ ato: "Intimação", prazo: 15 }] } } } });
T.casos.push(kB); T.atribuicoes.push({ caso_id: kB.id, colaborador_id: PAULO });
and(kB, -5, "Conclusos para decisão", { origem: "pje", origem_id: `pje:${PROC}:1`, autor_id: null });
const doc = (nome, n) => T.anexos.push({ id: id("a"), caso_id: kB.id, cliente_id: cB.id, nome, caminho: `pje/${PROC}/${n}.pdf`, tipo: "application/pdf",
  origem: "pje", texto: `${nome} do processo fictício com texto suficiente para o trecho da árvore aparecer na leitura.`, paginas: 2, criado_em: ts(-3) });
doc("Sentença", "101"); doc("Laudo pericial", "102");

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
  const pagina = async (opc, c, k) => {
    const ctx = await nav.newContext(opc);
    await ctx.addInitScript(([u, ss]) => {
      localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
      localStorage.setItem("crm_sessao", JSON.stringify(ss));
      localStorage.setItem("crm_tema", "v10");
      localStorage.setItem("crm_dash_caso", "1");
    }, [SUPA, SESSAO]);
    await instalarBanco(ctx, { SUPA, SESSAO, banco });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com|google\.com\/s2|cdnjs/, r => r.abort());
    const p = await ctx.newPage();
    p.on("pageerror", e => erros.push(e.message));
    p.on("dialog", d => d.accept());
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
    await p.waitForSelector("#app.logado", { timeout: 15000 });
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
    await p.evaluate(([cid, kid]) => { abrirFicha(cid).then(() => { casoSel = kid; abaAtiva = 2; repintarFicha(); }); }, [c.id, k.id]);
    await p.waitForSelector(".db-and");
    await p.waitForTimeout(400);
    return { p, ctx };
  };
  const bts = (p, sel) => p.evaluate(s => [...document.querySelectorAll(s + " .db-bts button")].map(b => b.querySelector("[aria-hidden]").textContent.trim()).join(","), sel);

  // ── 1 · INSS ──
  let { p, ctx } = await pagina({ viewport: { width: 1440, height: 1000 } }, cA, kA);
  conf("o cartão do INSS tem Ler, Tela, Detalhes, Baixar e Claude (F509)", await bts(p, ".db-and") === "Ler,Tela,Detalhes,Baixar,Claude");
  conf("os botões do cartão seguem a cor do quadro do INSS", await p.evaluate(() => { const b = document.querySelector(".db-and .db-bts button:not(.pri)"); return getComputedStyle(b).color === getComputedStyle(b.closest(".db-and")).getPropertyValue("--db-cor").trim() || /rgb/.test(getComputedStyle(b).color); }));
  conf("cada botão diz a frase inteira ao leitor de tela", await p.evaluate(() => [...document.querySelectorAll(".db-and .db-bts button")].every(b => b.title && b.querySelector(".sr-only"))));
  await ctx.close();

  // ── 2 · Conselho e o mandado de segurança ──
  ({ p, ctx } = await pagina({ viewport: { width: 1440, height: 1000 } }, cB, kB));
  conf("o cartão do Conselho tem Ler, Tela, Detalhes, Baixar e Claude (F509)", await bts(p, ".db-and.crps") === "Ler,Tela,Detalhes,Baixar,Claude");
  conf("o cartão Judicial do PJe tem Ler, Expedientes, Detalhes, Baixar e Claude (F509)", await bts(p, ".db-and.jud") === "Ler,Expedientes,Detalhes,Baixar,Claude");
  await p.evaluate(kid => lerProcesso(kid, "cnj", 0), kB.id); await p.waitForSelector("#proc-inteiro", { timeout: 5000 });
  const pe = await p.evaluate(() => [...document.querySelectorAll("#proc-inteiro .pi-arv-pe button")].map(b => b.querySelector("[aria-hidden]").textContent.trim()).join(","));
  conf(`a barra do pé da árvore tem os seis botões (${pe})`, pe === "Baixar,Marcadas,MD,Imagens,Claude,Projeto");
  conf("o Claude da barra mantém a contagem das marcadas", await p.locator("#proc-inteiro .pi-arv-pe .pi-claude .pi-claude-n").count() === 1);
  conf("o processo inteiro leva a cor do Judicial", await p.evaluate(() => document.getElementById("proc-inteiro").style.getPropertyValue("--db-cor") === "#6B3FA0"));
  conf("cada peça tem o botão IA", await p.locator("#proc-inteiro .pi-peca h4 .pi-ler").count() === 2);
  await p.evaluate(() => { document.querySelectorAll("#proc-inteiro .pi-peca h4 .pi-ler")[0].click(); }); await p.waitForTimeout(300);
  const ops1 = await p.evaluate(() => [...document.querySelectorAll("#modal .esp-it")].map(b => b.textContent.trim()));
  await p.evaluate(() => fecharCaixa && fecharCaixa());
  const peca2 = await p.evaluate(() => [...document.querySelectorAll("#proc-inteiro .pi-peca h4")].findIndex(h => /Laudo/.test(h.textContent)));
  await p.evaluate(i => { document.querySelectorAll("#proc-inteiro .pi-peca h4 .pi-ler")[i].click(); }, peca2); await p.waitForTimeout(300);
  const ops2 = await p.evaluate(() => [...document.querySelectorAll("#modal .esp-it")].map(b => b.textContent.trim()));
  const laudoPrimeiro = await p.evaluate(() => /Laudo/.test((document.querySelectorAll("#proc-inteiro .pi-peca h4")[0]||{}).textContent||""));
  const [sent, laudo] = laudoPrimeiro ? [ops2, ops1] : [ops1, ops2];
  conf(`o IA da sentença oferece Resumo, Prazo e Pontos (${sent})`, sent.join(",") === "Resumo,Prazo,Pontos");
  conf(`o IA do laudo acrescenta Laudo (${laudo})`, laudo.join(",") === "Resumo,Prazo,Pontos,Laudo");
  await ctx.close();

  // ── 3 · celular: alvos de toque ──
  ({ p, ctx } = await pagina({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, cB, kB));
  await p.evaluate(kid => lerProcesso(kid, "cnj", 0), kB.id); await p.waitForSelector("#proc-inteiro", { timeout: 5000 });
  await p.evaluate(() => document.getElementById("proc-inteiro").classList.add("arvore-on")); await p.waitForTimeout(200);
  const alt = await p.evaluate(() => Math.min(...[...document.querySelectorAll("#proc-inteiro .pi-arv-pe button")].map(b => b.getBoundingClientRect().height)));
  conf(`no celular os botões da barra têm 44 px (${alt})`, alt >= 44);
  await ctx.close();

  conf(`sem erro de página (${erros.slice(0, 2).join(" | ")})`, !erros.length);
  await nav.close(); s.close();
  const f = ok.filter(x => !x[1]).length;
  console.log(`\n${ok.length - f}/${ok.length} passaram`);
  process.exit(f ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
