// F828 · auditoria de 27.11.2026: o rascunho da anotação rápida sobrevive ao Esc e ao voltar, o apagar tem Desfazer,
// o voltar fecha o painel do cliente e leva à tela anterior, e recarregar mantém a tela e a ficha (o endereço guarda
// as duas). Banco simulado e dados fictícios. Uso: node f828.js
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
Object.assign(dados, { colaboradores: [...FIX.colaboradores], clientes: [], casos: [], atribuicoes: [],
  documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;
const iso = n => new Date(Date.now() - 3 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
const ts = (n, h = "12:00") => `${iso(n)}T${h}:00-03:00`;
let seq = 0;
const id = p => `${p}0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const cA = { id: id("c"), nome: "Cliente Teste", cpf: null, telefone: null, campos: {}, telefones: [], criado_em: ts(-400) };
T.clientes.push(cA);
const kA = { id: id("b"), cliente_id: cA.id, titulo: cA.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
  marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, dcb_prorrogacao_pedida: false, origem_lista: "🌻 INSS",
  criado_em: ts(-300), beneficio: "Aux. Incapacidade Temporária", especie: "B31", fase: "inss" };
T.casos.push(kA); T.atribuicoes.push({ caso_id: kA.id, colaborador_id: PAULO });
const nota = { id: id("e"), caso_id: kA.id, autor_id: PAULO, texto: "Anotação fictícia para apagar.", origem: "app", origem_id: null,
  criado_em: ts(-1), publico: false, excluir: false, importante: false, urgente: false, responde_a: null, todo_sync: false };
T.andamentos.push(nota);

const ok = [];
const conf = (nome, v, x) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); if (!v && x !== undefined) console.log(JSON.stringify(x)); };

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
    localStorage.setItem("crm_voltar", "1");
    localStorage.setItem("crm_painel_cli", "1");
  }, [SUPA, SESSAO]);
  await instalarBanco(ctx, { SUPA, SESSAO, banco });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const erros = [];
  const p = await ctx.newPage();
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  const pronto = async () => {
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
    await p.waitForTimeout(900);
  };
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await pronto();
  await p.evaluate(() => irPara("meudia")); await p.waitForTimeout(400);

  // ── 1 · o rascunho da anotação rápida ─────────────────────────────────────
  await p.evaluate(() => anotacaoRapida()); await p.waitForTimeout(200);
  await p.fill("#ar-texto", "Ligou pedindo o andamento fictício.");
  await p.keyboard.press("Escape"); await p.waitForTimeout(200);
  if (await p.evaluate(() => modalAberto())) { await p.keyboard.press("Escape"); await p.waitForTimeout(200); }   // o primeiro Esc pode só tirar o foco
  conf("Esc fecha a anotação rápida e guarda o texto", await p.evaluate(() => !modalAberto() && sessionStorage.getItem("rasc:ar") === "Ligou pedindo o andamento fictício."));
  await p.evaluate(() => anotacaoRapida()); await p.waitForTimeout(200);
  conf("reabrir devolve o texto", (await p.inputValue("#ar-texto")) === "Ligou pedindo o andamento fictício.");
  await p.fill("#ar-texto", "Texto que o voltar não pode perder.");
  await p.goBack(); await p.waitForTimeout(600);
  conf("o voltar fecha a caixa e guarda o texto", await p.evaluate(() => !modalAberto() && sessionStorage.getItem("rasc:ar") === "Texto que o voltar não pode perder."));
  await p.evaluate(id => anotacaoRapida(null, id), cA.id); await p.waitForTimeout(300);
  conf("com o cliente escolhido o texto também volta", (await p.inputValue("#ar-texto")) === "Texto que o voltar não pode perder.");
  await p.evaluate(() => salvarAnotacaoRapida()); await p.waitForTimeout(900);
  conf("gravar limpa o rascunho", await p.evaluate(() => !modalAberto() && sessionStorage.getItem("rasc:ar") === null));

  // ── 2 · apagar a anotação tem Desfazer ────────────────────────────────────
  await p.evaluate(id => abrirFicha(id), cA.id); await p.waitForTimeout(900);
  await p.evaluate(id => apagarAndamento(id, 0), nota.id); await p.waitForTimeout(900);
  conf("apagou e ofereceu o Desfazer", !T.andamentos.some(a => a.id === nota.id) && await p.evaluate(() => !!document.querySelector("#aviso .aviso-bt")));
  await p.click("#aviso .aviso-bt"); await p.waitForTimeout(900);
  const volta = T.andamentos.find(a => a.id === nota.id);
  conf("Desfazer regrava a anotação com o mesmo id, texto e autor", volta && volta.texto === nota.texto && volta.autor_id === PAULO, volta);

  // ── 4 · o voltar e o endereço ─────────────────────────────────────────────
  await p.evaluate(() => fecharFicha()); await p.waitForTimeout(300);
  await p.evaluate(() => irPara("planejado")); await p.waitForTimeout(400);
  await p.evaluate(() => irPara("fase:inss")); await p.waitForTimeout(500);
  conf("a tela fica no endereço", await p.evaluate(() => location.hash === "#fase:inss"));
  await p.click(`.cartao[data-cli="${cA.id}"]`); await p.waitForTimeout(700);
  conf("o clique na linha abre o painel do cliente", await p.evaluate(() => !!_pcli && !!document.getElementById("pcli")));
  // 5 · os flutuantes não ficam sob o painel
  const fabs = await p.evaluate(() => ["fab-rapida", "fab-sug"].map(i => { const el = document.getElementById(i), r = el.getBoundingClientRect();
    const alvo = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!alvo && el.contains(alvo) && r.right <= innerWidth - 460; }));
  conf("com o painel aberto, Sugestões e ⚡ seguem clicáveis e fora do painel", fabs.every(Boolean), fabs);
  await p.goBack(); await p.waitForTimeout(600);
  conf("o primeiro voltar fecha o painel e fica na tela", await p.evaluate(() => !_pcli && visao === "fase:inss"));
  await p.goBack(); await p.waitForTimeout(600);
  conf("o voltar leva à tela anterior (Planejado), não ao Meu Dia", await p.evaluate(() => visao === "planejado" && location.hash === "#planejado"));
  await p.goBack(); await p.waitForTimeout(600);
  conf("mais um voltar chega ao Meu Dia", await p.evaluate(() => visao === "meudia"));

  const link = await p.evaluate(id => { window.__abriu = null; window.open = u => { window.__abriu = u; return null; };
    irPara("fase:inss"); return id; }, cA.id);
  await p.waitForTimeout(500);
  await p.click(`.cartao[data-cli="${link}"]`, { modifiers: ["Control"] }); await p.waitForTimeout(300);
  conf("Ctrl+clique abre a ficha noutra aba pelo endereço do cliente", await p.evaluate(id => (window.__abriu || "").endsWith("#fase:inss/" + id) && !clienteAberto, cA.id));

  await p.evaluate(id => abrirFicha(id), cA.id); await p.waitForTimeout(900);
  conf("ficha aberta entra no endereço", await p.evaluate(id => location.hash === "#fase:inss/" + id, cA.id));
  await p.reload(); await pronto(); await p.waitForTimeout(600);
  conf("recarregar mantém a tela e a ficha", await p.evaluate(id => visao === "fase:inss" && clienteAberto === id, cA.id));

  // ── 3 · Descartar no Escrever no caso ─────────────────────────────────────
  const semTexto = await p.evaluate(() => { const b = document.getElementById("and-descartar"); return !!b && b.offsetParent === null; });
  await p.evaluate(() => { const t = document.getElementById("and-texto"); t.value = "Rascunho fictício"; t.oninput(); });
  await p.waitForTimeout(200);
  conf("Descartar só aparece com texto", semTexto && await p.evaluate(() => !document.getElementById("and-descartar").hidden));
  await p.evaluate(() => document.getElementById("and-descartar").click()); await p.waitForTimeout(200);
  conf("Descartar limpa o campo e o rascunho", await p.evaluate(k => document.getElementById("and-texto").value === "" && !sessionStorage.getItem("rasc:" + k)
    && document.getElementById("and-descartar").hidden, kA.id));

  conf("sem erro de página", !erros.length, erros);
  await nav.close(); s.close();
  console.log(`${ok.filter(x => x[1]).length}/${ok.length} passaram`);
  process.exit(ok.every(x => x[1]) ? 0 : 1);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
