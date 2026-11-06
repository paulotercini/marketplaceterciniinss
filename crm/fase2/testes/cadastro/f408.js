// F408 · a data do Microsoft To Do na aba Prazos, com o selo e o Abrir que mostra as anotações do escritório, e a janela do
// prazo da anotação em três partes: a anotação inteira, o Acompanhamento (checklist e anotações, o mais recente primeiro) e
// os novos prazos da mesma tarefa (pedido do Paulo, 05.11.2026). Pontuação de 100; exige mais de 95. Banco simulado, dados fictícios.
// Uso: node f408.js [pasta-das-fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f408";
fs.mkdirSync(OUT, { recursive: true });

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
const bar = d => d.split("-").reverse().join("/");
const ts = (n, h = "12:00") => `${iso(n)}T${h}:00-03:00`;
const util = n => { let k = n; while ([0, 6].includes(new Date(iso(k) + "T12:00:00").getDay())) k++; return k; };
let seq = 0;
const id = p => `${p}0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const cli = nome => { const c = { id: id("c"), nome, cpf: null, telefone: null, campos: {}, telefones: [], criado_em: ts(-400) }; T.clientes.push(c); return c; };
const caso = (c, o) => { const k = { id: id("b"), cliente_id: c.id, titulo: c.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
  marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, dcb_prorrogacao_pedida: false, origem_lista: "👪 Judicial",
  criado_em: ts(-300), ...o }; T.casos.push(k); T.atribuicoes.push({ caso_id: k.id, colaborador_id: PAULO }); return k; };
const and = (k, n, texto, o = {}) => { const a = { id: id("e"), caso_id: k.id, autor_id: PAULO, texto, origem: "app", origem_id: null, criado_em: ts(n),
  publico: false, excluir: false, importante: false, urgente: false, responde_a: null, ...o }; T.andamentos.push(a);
  T.andamentos_lidos.push({ andamento_id: a.id, colaborador_id: PAULO }); return a; };
const tarefa = (a, o = {}) => { const t = { id: id("f"), andamento_id: a.id, caso_id: a.caso_id, colaborador_id: PAULO, atribuido_por: PAULO,
  lembrar_em: iso(-2), natureza: "compromisso", papel: "executa", concluida_em: null, iniciada_em: null, etapas: [], criado_em: a.criado_em, ...o };
  T.andamento_tarefas.push(t); return t; };
const mcp = () => ({ origem_id: "mcp:" + id("m") });


// o caso com a data do To Do (Concluir em), anotações do escritório e um movimento do PAT
const cA = cli("Bia Fictícia To Do");
const kT = caso(cA, { beneficio: "Auxílio por incapacidade", especie: "B31", fase: "inss", protocolos: ["1700000777"], origem_lista: "🌻 INSS",
  prazo: iso(util(5)), todo_prazo: iso(util(5)) });
const o1 = and(kT, -5, "(P): liguei para a cliente, aguardar a perícia.", { origem: "todo" });
const o2 = and(kT, -1, "(A): perícia remarcada pelo INSS, conferir de novo.", { origem: "todo" });
const oPat = and(kT, -2, "Situação do requerimento: em análise", { origem: "pat", autor_id: null });
// o caso com a data posta no CRM, sem To Do
const kM = caso(cA, { beneficio: "Apos. por Idade", especie: "B41", fase: "inss", protocolos: ["1700000778"], origem_lista: "🌻 INSS", prazo: iso(util(9)), todo_prazo: null });
// o caso com o prazo da anotação: etapas, duas respostas, uma com prazo adicional
const dC = util(12), dAd = util(18);
const kC = caso(cA, { beneficio: "Apos. Especial", especie: "B46", fase: "judicial", processo: "50001112220264036314", origem_lista: "👪 Judicial" });
const nC = and(kC, -4, `⏰ [PRAZO ${bar(iso(dC)).replace(/\//g, ".")}] Apresentar réplica à contestação do INSS.\nPontos: PPP da empresa Alfa e ruído acima de 85 dB.\nConferir o LTCAT juntado.`);
const tC = tarefa(nC, { natureza: "fatal", lembrar_em: iso(dC), etapas: [{ t: "Ler a contestação", feito: true, em: ts(-2), por: PAULO }, { t: "Redigir a réplica", feito: false }] });
const r1 = and(kC, -3, "Primeira resposta: contestação lida.", { responde_a: nC.id });
const r2 = and(kC, -1, `Pedir o LTCAT à empresa · prazo adicional até ${bar(iso(dAd))}`, { responde_a: nC.id });
const tR2 = tarefa(r2, { lembrar_em: iso(dAd) });

const pts = [];
const conf = (nome, v, peso) => { pts.push([nome, !!v, peso]); console.log((v ? "PASSOU  " : "FALHOU  ") + `[${peso}] ` + nome); };

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
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const foto = n => p.screenshot({ path: path.join(OUT, n + ".png") });
  const abaPrazos = async () => { await p.evaluate(async c => { fecharPainelPrazo(); await abrirFicha(c); const m = document.getElementById("modal"); if (m) m.style.display = "none";
    casoSel = null; abaAtiva = 5; repintarFicha(); }, cA.id); await p.waitForSelector(".pzc-lin"); await p.waitForTimeout(400); };
  const linhaDe = (rx) => p.evaluate(rx => [...document.querySelectorAll(".pzc-lin")].map(l => ({ t: l.textContent, todo: !!l.querySelector(".pz-pill-todo"), data: l.dataset.data }))
    .filter(l => new RegExp(rx).test(l.t) || l.data === rx), rx);
  const abrirLinha = async data => { await p.evaluate(d => [...document.querySelectorAll(".pzc-lin")].find(l => l.dataset.data === d).querySelector(".pzc-abrir").click(), data);
    await p.waitForSelector("#painel-prazo.aberto", { timeout: 4000 }); await p.waitForTimeout(350); };
  const janela = () => p.evaluate(() => { const el = document.querySelector("#painel-prazo.aberto"); if (!el) return null;
    const secs = [...el.querySelectorAll(".ppz-corpo > section")].map(x => (x.querySelector(".ppz-h") || {}).textContent || x.getAttribute("aria-label") || "");
    return { secs, pills: [...el.querySelectorAll(".ppz-pills .pz-pill")].map(x => x.textContent.trim()), orig: (el.querySelector(".ppz-orig-c") || {}).textContent || "",
      hist: [...el.querySelectorAll(".ppz-acomp .ppz-hist > li")].map(li => li.textContent.replace(/\s+/g, " ").trim()),
      novos: [...el.querySelectorAll(".ppz-novos .ppz-lig")].map(x => x.textContent.replace(/\s+/g, " ").trim()),
      dir: Math.round(window.innerWidth - el.getBoundingClientRect().right), larg: Math.round(el.getBoundingClientRect().width) }; });

  // ── 1. a data do To Do na aba Prazos (25) ───────────────────────────────
  await abaPrazos();
  const lT = await linhaDe(iso(util(5))), lM = await linhaDe(iso(util(9)));
  conf("a data do To Do aparece na aba Prazos com o selo Microsoft To Do", lT.length === 1 && lT[0].todo && /Microsoft To Do/.test(lT[0].t), 12);
  conf("a data posta no CRM não leva o selo do To Do", lM.length === 1 && !lM[0].todo, 4);
  conf("a linha do To Do tem o Abrir", await p.evaluate(d => !!document.querySelector(`.pzc-lin[data-data="${d}"] .pzc-abrir`), iso(util(5))), 5);
  await foto("01-aba");
  await p.evaluate(d => { const l = document.querySelector(`.pzc-lin[data-data="${d}"]`); l.scrollIntoView({block:"center"}); }, iso(util(5)));
  await p.waitForTimeout(300);
  const sobre = await p.evaluate(d => { const l = document.querySelector(`.pzc-lin[data-data="${d}"]`), o = l.querySelector(".pzc-o").getBoundingClientRect(), c = l.querySelector(".pzc-caso");
    const r = c ? c.getBoundingClientRect() : null; return [...l.querySelectorAll(".pzc-sub > *")].every(x => { const b = x.getBoundingClientRect(); return b.right <= o.right + 1 && b.bottom <= l.getBoundingClientRect().bottom; }); }, iso(util(5)));
  conf("o selo cabe na linha, sem cobrir a coluna do caso", sobre, 4);
  await (await p.$(`.pzc-lin[data-data="${iso(util(5))}"]`)).screenshot({ path: path.join(OUT, "01b-linha.png") });

  // ── 2. Abrir a data do To Do: as anotações do escritório (25) ───────────
  await abrirLinha(iso(util(5)));
  const jT = await janela();
  conf("abre a janela à direita, com o selo Microsoft To Do", jT && jT.dir === 0 && jT.pills.includes("Microsoft To Do"), 6);
  conf("a janela diz que a data é o Concluir em do To Do", jT && /Microsoft To Do/.test(jT.orig), 5);
  const iO2 = jT ? jT.hist.findIndex(h => /perícia remarcada/.test(h)) : -1, iO1 = jT ? jT.hist.findIndex(h => /liguei para a cliente/.test(h)) : -1;
  conf("as anotações do escritório aparecem, a mais recente primeiro", iO2 >= 0 && iO1 > iO2, 9);
  conf("o movimento do PAT não entra nas anotações do escritório", jT && !jT.hist.some(h => /Situação do requerimento/.test(h)), 5);
  await foto("02-todo");

  // ── 3. a janela do prazo da anotação (40) ───────────────────────────────
  await abaPrazos();
  await abrirLinha(iso(dC));
  const jC = await janela();
  conf("a ordem: Anotação, Acompanhamento, Novos prazos", jC && jC.secs.slice(0, 3).join("|") === "Anotação|Acompanhamento|Novos prazos desta tarefa", 10);
  conf("a anotação vem inteira, com as três linhas", jC && /Apresentar réplica/.test(jC.orig) && /ruído acima de 85 dB/.test(jC.orig) && /Conferir o LTCAT juntado/.test(jC.orig) && !/\[PRAZO/.test(jC.orig), 8);
  const h = jC ? jC.hist : [];
  const iPend = h.findIndex(x => /Redigir a réplica/.test(x)), iR2 = h.findIndex(x => /Pedir o LTCAT/.test(x)), iR1 = h.findIndex(x => /Primeira resposta/.test(x)), iEt = h.findIndex(x => /Ler a contestação/.test(x));
  conf("o checklist e as anotações com a data, o mais recente primeiro (a etapa por fazer no alto)", iPend === 0 && iR2 > iPend && iEt > iR2 && iR1 > iEt, 10);
  conf("a etapa feita traz quem e quando", iEt >= 0 && /Etapa feita · Paulo/.test(h[iEt]), 4);
  conf("o prazo adicional da resposta aparece em Novos prazos", jC && jC.novos.length === 1 && new RegExp(bar(iso(dAd)).slice(0, 5)).test(jC.novos[0]) && /Pedir o LTCAT/.test(jC.novos[0]), 8);
  await foto("03-anotacao");

  // ── 4. os botões da janela (10) ─────────────────────────────────────────
  banco.escritas.length = 0;
  await p.fill("#pp-com", "Réplica em revisão.");
  await p.click("#painel-prazo .pp-com-bt");
  await p.waitForTimeout(800);
  conf("Anotar grava a resposta ao prazo", banco.escritas.some(e => e.m === "POST" && e.t === "andamentos" && e.corpo.responde_a === nC.id && /Réplica em revisão/.test(e.corpo.texto)), 4);
  await abaPrazos(); await abrirLinha(iso(dC));
  await p.click("#painel-prazo .ppz-novos .pp-add");
  await p.waitForTimeout(700);
  conf("+ Prazo fecha a janela e abre a resposta com o prazo adicional", !(await p.$("#painel-prazo.aberto")) && !!(await p.$("#ri-box.foco-prazo, #ri-box")), 4);
  conf("sem erro de página", !erros.length, 2);
  if (erros.length) console.log(erros.slice(0, 3));

  const total = pts.reduce((t, x) => t + x[2], 0), feitos = pts.filter(x => x[1]).reduce((t, x) => t + x[2], 0);
  console.log(`pontuação ${Math.round(feitos * 1000 / total) / 10} de 100 (${feitos}/${total} pontos)`);
  await nav.close(); s.close();
  process.exit(feitos * 100 / total > 95 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
