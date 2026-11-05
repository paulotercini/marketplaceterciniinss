// F407 · o prazo na anotação, proposta A (escolha do Paulo, 05.11.2026): o "⏳ Prazo: … até dd/mm/aaaa" do assistente vira
// prazo de verdade ao abrir a ficha (carimbo, prazo do caso vazio, a tarefa citada passa à anotação), e a faixa no cartão traz o
// prazo com a barra, a tarefa e Cumprido, Perdido e Abrir. Pontuação de 100; exige mais de 95. Banco simulado, dados fictícios.
// Uso: node f406.js [pasta-das-fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f406";
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

const dPz = util(6);
// o caso da RPV: a tarefa do assistente de dias atrás e a avaliação de hoje com a linha do prazo
const cA = cli("Ana Fictícia RPV");
const kA = caso(cA, { beneficio: "Apos. por Idade", especie: "B41", fase: "judicial", processo: "50005695320264036314" });
const nTf = and(kA, -6, "Conferir o preenchimento do ofício requisitório de RPV 20269999192P no cumprimento de sentença e manifestar-se se houver erro.", mcp());
const tA = tarefa(nTf);
const nAss = and(kA, 0, `🧭 Avaliação do caso: o ato ordinatório foi publicado. Próximo passo: conferir o ofício e manifestar-se se houver erro.\n⏳ Prazo: conferência do ofício de RPV 20269999192P, 5 dias da publicação de ${bar(iso(-1))}, até ${bar(iso(dPz))} (ato ordinatório; PJe)\n📋 Lançar: fase pagamento`, mcp());
// linhas que não viram prazo: estimativa, DCB e a de anotação humana
const nEst = and(kA, -1, `🧭 Avaliação: nada.\n⏳ Prazo: contrarrazões, estimativa ${bar(iso(util(9)))} (despacho)`, mcp());
const nDcb = and(kA, -1, `🧭 Avaliação: benefício.\n⏳ Prazo: DCB ${bar(iso(60))} (HISCRE)`, mcp());
const nHum = and(kA, -1, `Anotei: ⏳ Prazo: algo até ${bar(iso(util(8)))}`);
// o caso que já tem prazo: a anotação ganha a faixa, o prazo do caso fica como está
const kB = caso(cA, { beneficio: "Auxílio por incapacidade", especie: "B31", fase: "inss", protocolos: ["1700000901"], prazo: iso(util(3)) });
const nB = and(kB, 0, `🧭 Avaliação do caso: indeferido.\n⏳ Prazo: recurso à Junta de Recursos até ${bar(iso(util(20)))}, 30 dias da comunicação de ${bar(iso(-2))} (PAT)`, mcp());
// a anotação antiga com prazo já vencido não é adotada
const nVelha = and(kB, -40, `🧭 Avaliação antiga.\n⏳ Prazo: exigência até ${bar(iso(-25))} (carta)`, mcp());

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
  const abrir = async k => { await p.evaluate(async ([c, k]) => { await abrirFicha(c); const m = document.getElementById("modal"); if (m) m.style.display = "none";
    casoSel = k; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); }, [cA.id, k]); await p.waitForTimeout(900); };
  const lin = andId => banco.escritas.filter(e => e.m === "PATCH" && e.t === "andamentos" && (e.ids || []).includes(andId));

  // ── 1. a adoção ao abrir a ficha (35) ────────────────────────────────────
  banco.escritas.length = 0;
  await abrir(kA.id);
  await p.waitForSelector(".timeline .tl-pz-a", { timeout: 8000 }).catch(() => {});
  const carimbo = `⏰ [PRAZO ${bar(iso(dPz)).replace(/\//g, ".")}] `;
  conf("a anotação do assistente ganha o carimbo do prazo", lin(nAss.id).some(e => String(e.corpo.texto).startsWith(carimbo + "🧭 Avaliação")), 10);
  conf("o caso sem prazo ganha a data do prazo", banco.escritas.some(e => e.m === "PATCH" && e.t === "casos" && e.ids.includes(kA.id) && e.corpo.prazo === iso(dPz)), 8);
  conf("a tarefa citada pela RPV passa à anotação do prazo", banco.escritas.some(e => e.m === "PATCH" && e.t === "andamento_tarefas" && e.ids.includes(tA.id) && e.corpo.andamento_id === nAss.id), 8);
  conf("estimativa, DCB e anotação humana não viram prazo", !lin(nEst.id).length && !lin(nDcb.id).length && !lin(nHum.id).length, 5);
  conf("o caso que já tem prazo fica com o seu; a anotação ganha o carimbo; a antiga vencida não", lin(nB.id).length === 1
    && !banco.escritas.some(e => e.m === "PATCH" && e.t === "casos" && e.ids.includes(kB.id) && "prazo" in e.corpo) && !lin(nVelha.id).length, 4);

  // ── 2. a faixa no cartão (30) ────────────────────────────────────────────
  const fx = await p.evaluate(aid => { const li = [...document.querySelectorAll(".timeline li.tl-card")].find(x => x.querySelector(`[onclick*="${aid}"]`));
    const f = li && li.querySelector(".tl-pz-a"); const r = el => el.getBoundingClientRect();
    return { tem: !!f, tit: f ? f.querySelector(".tl-pz-t").textContent : "", m: f ? f.querySelector(".tl-pz-m").textContent : "",
      barra: !!(f && f.querySelector(".tl-pz-barra i")), k: f ? [...f.querySelectorAll(".tl-pz-pill,.tl-pz-k")].map(x => x.textContent.trim()) : [],
      tf: f ? (f.querySelector(".tl-pz-tf .tl-tarefa") || {}).textContent || "" : "", bola: !!(f && f.querySelector(".tl-pz-tf .tf-ok")),
      bts: f ? [...f.querySelectorAll(".tl-pz-bts button")].map(b => b.textContent.trim()) : [],
      corpo: li ? li.querySelector(".tl-corpo").textContent : "", barraCab: li ? [...li.querySelectorAll(".tl-barra .tl-bt")].map(b => b.textContent.trim()) : [],
      lado: f && f.children.length >= 3 && Math.abs(r(f.children[0]).top - r(f.children[1]).top) < 4,
      dentro: f && r(f).right <= r(li).right + 1 };
  }, nAss.id);
  conf("a faixa diz o que é: o título vem da linha do assistente", /^Conferência do ofício de RPV 20269999192P$/.test(fx.tit), 6);
  conf("vence na data e diz quanto falta em dias úteis", new RegExp(bar(iso(dPz)).slice(0, 5)).test(fx.m) && /dias? úte|último dia/.test(fx.m), 5);
  conf("a barra da intimação ao vencimento aparece", fx.barra, 3);
  conf("Prazo fatal e Tarefa lado a lado, com a tarefa de Paulo e o círculo", fx.k.join("|") === "Prazo fatal|Tarefa" && /Paulo · atrasada desde/.test(fx.tf) && fx.bola && fx.lado, 6);
  conf("os botões Cumprido, Perdido e Abrir ficam na faixa, e o Cumprido sai da barra", fx.bts.join("|") === "Cumprido|Perdido|Abrir" && !fx.barraCab.includes("Cumprido"), 5);
  conf("a linha ⏳ Prazo sai do texto e o resto fica", !/⏳ Prazo/.test(fx.corpo) && /Próximo passo/.test(fx.corpo) && /📋 Lançar/.test(fx.corpo), 5);
  const orig = await p.evaluate(aid => { const li = [...document.querySelectorAll(".timeline li.tl-card")].find(x => /Conferir o preenchimento/.test((x.querySelector(".tl-corpo") || {}).textContent || ""));
    return li ? li.querySelectorAll(".tl-tarefa").length : -1; }, nTf.id);
  conf("o cartão de origem deixa de mostrar a tarefa separada", orig === 0, 4);
  await foto("01-faixa");

  // ── 3. os botões (20) ────────────────────────────────────────────────────
  await p.evaluate(aid => document.querySelector(`.tl-pz-a .tl-pz-abrir[onclick*="${aid}"]`).click(), nAss.id);
  await p.waitForSelector("#painel-prazo.aberto", { timeout: 4000 }).catch(() => {});
  await p.waitForTimeout(350);
  const jan = await p.evaluate(() => { const el = document.querySelector("#painel-prazo.aberto"); return el ? { h2: el.querySelector("h2").textContent, dir: Math.round(window.innerWidth - el.getBoundingClientRect().right) } : null; });
  conf("Abrir leva à janela do prazo, no canto direito", jan && /Conferência do ofício/.test(jan.h2) && jan.dir === 0, 6);
  await foto("02-abrir");
  await p.evaluate(() => fecharPainelPrazo());
  await p.evaluate(aid => document.querySelector(`.tl-pz-a .tl-pz-perdi[onclick*="${aid}"]`).click(), nAss.id);
  conf("Perdido abre o registro do não cumprido", await p.waitForSelector("#pzn-txt", { timeout: 3000 }).then(() => true).catch(() => false), 4);
  await p.evaluate(() => fecharCaixa());
  await p.evaluate(aid => document.querySelector(`.tl-pz-a .tl-pz-cumpri[onclick*="${aid}"]`).click(), nAss.id);
  await p.waitForSelector(".tl-pz-form #tpf-txt");
  const form = await p.textContent(".tl-pz-form");
  await p.fill("#tpf-txt", "Ofício conferido, sem erro.");
  banco.escritas.length = 0;
  await p.click(".tl-pz-f-ok");
  await p.waitForTimeout(900);
  const resp = banco.escritas.find(e => e.m === "POST" && e.t === "andamentos");
  conf("Cumprido grava a resposta, conclui a tarefa que veio da origem e tira o prazo do caso", /Concluir a tarefa de Paulo/.test(form) && resp && resp.corpo.responde_a === nAss.id
    && /^✔ \[PRAZO CUMPRIDO\] Ofício conferido/.test(resp.corpo.texto)
    && banco.escritas.some(e => e.m === "PATCH" && e.t === "andamento_tarefas" && e.ids.includes(tA.id) && e.corpo.concluida_em)
    && banco.escritas.some(e => e.m === "PATCH" && e.t === "casos" && e.ids.includes(kA.id) && e.corpo.prazo === null), 10);
  await p.waitForSelector(".timeline .tl-pz-ok", { timeout: 4000 }).catch(() => {});
  await foto("03-cumprido");

  // ── 4. o desfazer da adoção (10) ─────────────────────────────────────────
  await p.evaluate(() => { const el = document.getElementById("aviso"); if (el) el.classList.remove("on"); });
  banco.escritas.length = 0;
  await abrir(kB.id);
  const temDesf = await p.evaluate(() => /desfazer/.test((document.getElementById("aviso") || {}).textContent || ""));
  // segunda abertura: kA já adotado; kB adotado na primeira, então aqui nada mais
  conf("a segunda abertura não adota de novo", !banco.escritas.some(e => e.m === "PATCH" && e.t === "andamentos"), 3);
  // o desfazer da primeira adoção, chamado de novo pela função
  await p.evaluate(async bId => { const k = D.casoPorId.get(bId); }, kB.id);
  T.andamentos.find(a => a.id === nB.id).texto = nB.texto.replace(/^⏰ \[PRAZO [0-9.]+\] /, "");
  await p.evaluate(async ([cid, aid, t]) => { const a = D._andsFicha.find(x => x.id === aid); a.texto = t; await adotarPrazosAssistente(cid); }, [cA.id, nB.id, T.andamentos.find(a => a.id === nB.id).texto]);
  await p.waitForTimeout(300);
  banco.escritas.length = 0;
  await p.evaluate(() => desfazerAgora());
  await p.waitForTimeout(700);
  const kBdb = T.casos.find(k => k.id === kB.id);
  conf("o desfazer devolve o texto e marca a anotação para não voltar", banco.escritas.some(e => e.m === "PATCH" && e.t === "andamentos" && e.ids.includes(nB.id) && !/^⏰/.test(e.corpo.texto))
    && ((kBdb.ronda || {}).pz_ass_fora || []).includes(nB.id), 5);
  banco.escritas.length = 0;
  await abrir(kB.id);
  conf("depois do desfazer, abrir a ficha não adota de novo", !banco.escritas.some(e => e.m === "PATCH" && e.t === "andamentos" && e.ids.includes(nB.id)), 2);

  // ── 5. celular (5) ───────────────────────────────────────────────────────
  await p.setViewportSize({ width: 390, height: 844 });
  await abrir(kA.id);
  const cel = await p.evaluate(() => [...document.querySelectorAll(".tl-pz-a, .tl-pz-ok")].every(f => { const li = f.closest("li.tl-card"); return f.getBoundingClientRect().right <= li.getBoundingClientRect().right + 1; }));
  conf("no celular a faixa não passa da borda do cartão", cel, 2);
  conf("sem erro de página", !erros.length, 3);
  if (erros.length) console.log(erros.slice(0, 3));
  await foto("04-celular");

  const total = pts.reduce((t, x) => t + x[2], 0), feitos = pts.filter(x => x[1]).reduce((t, x) => t + x[2], 0);
  console.log(`pontuação ${Math.round(feitos * 1000 / total) / 10} de 100 (${feitos}/${total} pontos)`);
  await nav.close(); s.close();
  process.exit(feitos * 100 / total > 95 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
