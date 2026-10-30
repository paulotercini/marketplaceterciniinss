// F303 · nenhum texto passa da borda do quadro (pedido do Paulo, 30.10.2026). Abre as telas mais usadas no computador
// (1280 e 1480 px) e no celular (390 px) e mede cada pedaço de texto contra o quadro que o contém: texto que sai da caixa
// ou fica cortado sem reticências é falha. Banco simulado e dados fictícios.
// Uso: node f303.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f303";
fs.mkdirSync(OUT, { recursive: true });

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
const cli = (nome, o = {}) => { const c = { id: id("c"), nome, cpf: null, telefone: null, campos: {}, telefones: [], criado_em: ts(-400), ...o }; T.clientes.push(c); return c; };
const caso = (c, o) => { const k = { id: id("b"), cliente_id: c.id, titulo: c.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
  marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, dcb_prorrogacao_pedida: false, origem_lista: "🌻 INSS",
  criado_em: ts(-300), ...o }; T.casos.push(k); T.atribuicoes.push({ caso_id: k.id, colaborador_id: PAULO }); return k; };
const and = (k, n, texto, o = {}) => { const a = { id: id("e"), caso_id: k.id, autor_id: PAULO, texto, origem: "app", origem_id: null, criado_em: ts(n),
  publico: false, excluir: false, importante: false, urgente: false, responde_a: null, ...o }; T.andamentos.push(a); return a; };

// a ficha do print: dois casos, um deles na lista 🗓 Tarefas com Prazo e com processo judicial, etapa desatualizada,
// sugestão de etapa, honorários a lançar, tarefas, prazos e documentos do PJe com nome comprido
const cA = cli("Conceição de Souza Amaral Braga Fictícia", { cpf: "52998224725", telefone: "16999990001", dn: "14031962", sexo: "F" });
const PROC = "50323132920264036100";
const kA = caso(cA, { beneficio: "Aposentadoria por idade", especie: "B41", fase: "outro", origem_lista: "🗓 Tarefas com Prazo",
  etapa: "aguardando citação", processos: [PROC], processo: PROC, protocolos: ["1234567890"], crps_nups: ["44233.123456/2025-11"],
  nbs: ["2315935894"], nb: "2315935894", der: iso(-560), resultado: "deferido", prazo: iso(14), importante: true,
  prazos_tribunal: [{ data: iso(-30), tipo: "Manifestar sobre a contestação apresentada pelo réu", fonte: "pje" }, { data: iso(17), tipo: "Prazo para apresentar réplica à contestação", fonte: "pje" }] });
const kB = caso(cA, { beneficio: "Benefício de prestação continuada à pessoa com deficiência", especie: "B87", fase: "inss", etapa: "em exigência" });
and(kA, -40, "Distribuído por sorteio", { origem: "pje", origem_id: `mov:${PROC}:${iso(-40)}T10:00` });
and(kA, -11, "Recebidos os autos do Tribunal Regional Federal da 3ª Região para prosseguimento do feito", { origem: "pje", origem_id: `mov:${PROC}:${iso(-11)}T10:00` });
and(kA, -2, "Conferido no PJe. Sem novidade relevante, aguardando a citação do INSS e o prazo da contestação, que ainda não começou a correr.");
and(kB, -3, "Exigência do INSS: apresentar a declaração de composição do grupo familiar e o comprovante de residência atualizado.");
for (let i = 0; i < 31; i++) T.tarefas.push({ id: id("t"), caso_id: kA.id, titulo: `Tarefa fictícia ${i}`, concluida: false, criado_em: ts(-20), prazo: iso(i % 7) });
const docs = ["Informação", "Documento Comprobatório (CERTIDAO DE CASAMENTO)", "Documento Comprobatório (Comprovante de Endereço)",
  "Documento de Identificação (DOC PESSOAL)", "Documento Comprobatório (DECLARAÇÃO DE POBREZA )", "Documento Comprobatório (PROCURAÇAO)", "Petição inicial"];
docs.forEach((n, i) => T.anexos.push({ id: id("a"), caso_id: kA.id, cliente_id: cA.id, nome: n, caminho: `pje/${PROC}/${i}.pdf`, tipo: "application/pdf",
  tamanho: 120000 + i * 90000, texto: i % 2 ? "texto" : null, origem: "pje", criado_em: ts(-14 + i) }));
T.pagamentos.push({ id: id("p"), caso_id: kA.id, cliente_id: cA.id, descricao: "Honorários contratuais de 30% sobre os atrasados", valor: null, vencimento: iso(-5), pago: false, criado_em: ts(-6) });

// a mesma medida para todas as telas: cada texto contra o quadro (caixa com borda ou fundo, ou que corta) que o contém
const MEDIR = () => {
  const vis = el => { const s = getComputedStyle(el); return s.display !== "none" && s.visibility !== "hidden" && +s.opacity !== 0; };
  const caixa = s => s.overflowX !== "visible" || parseFloat(s.borderLeftWidth) > 0 || parseFloat(s.borderRightWidth) > 0 ||
    (s.backgroundColor !== "rgba(0, 0, 0, 0)" && s.backgroundColor !== "transparent");
  const achados = [], vistos = new Set();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) {
    const el = n.parentElement;
    if (!el || !n.textContent.trim() || ["SCRIPT", "STYLE", "OPTION", "TEXTAREA"].includes(el.tagName) || !vis(el)) continue;
    if (el.closest("[hidden],.sr-only,.visually-hidden,[aria-hidden=true],select")) continue;
    const r = document.createRange(); r.selectNodeContents(n);
    const rs = [...r.getClientRects()].filter(x => x.width > 0.5 && x.height > 0.5);
    if (!rs.length) continue;
    const dir = Math.max(...rs.map(x => x.right)), esq = Math.min(...rs.map(x => x.left));
    // o texto com reticências (text-overflow) está cortado de propósito
    let reticencias = false;
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.textOverflow === "ellipsis" && s.overflowX !== "visible") { reticencias = true; break; }
      if (s.webkitLineClamp && s.webkitLineClamp !== "none") { reticencias = true; break; }
      if (s.display !== "inline" && s.display !== "contents") break;
    }
    if (el.closest("details:not([open]) > :not(summary)")) continue;
    for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (!caixa(s)) { if (["absolute", "fixed"].includes(s.position)) break; continue; }
      if (["auto", "scroll"].includes(s.overflowX)) break; // rola: não corta, mostra a barra
      if (s.position === "fixed" && a === el) break;
      const b = a.getBoundingClientRect();
      const bl = b.left + parseFloat(s.borderLeftWidth), br = b.right - parseFloat(s.borderRightWidth);
      if (b.width < 2) break;
      const passa = dir - br, antes = bl - esq;
      if ((passa > 1.5 || antes > 1.5) && !(reticencias && s.overflowX !== "visible")) {
        const txt = n.textContent.trim().replace(/\s+/g, " ").slice(0, 60);
        const k = txt + "|" + Math.round(passa);
        if (!vistos.has(k)) {
          vistos.add(k);
          const nome = x => x.tagName.toLowerCase() + (x.id ? "#" + x.id : "") + (x.classList.length ? "." + [...x.classList].slice(0, 3).join(".") : "");
          achados.push({ txt, sai: Math.round(Math.max(passa, antes)), texto: nome(el), quadro: nome(a), corta: s.overflowX !== "visible" });
        }
        break;
      }
      if (s.overflowX !== "visible" || ["absolute", "fixed"].includes(s.position)) break; // o que corta esconde o resto; o flutuante não é contido pelo pai
    }
  }
  return achados;
};

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
  const telas = [["1280", { width: 1280, height: 860 }, false], ["1480", { width: 1480, height: 1000 }, false], ["1920", { width: 1920, height: 1080 }, false],
    ["cel", { width: 390, height: 844 }, true]];
  const todos = [];
  for (const [rot, vp, cel] of telas) {
    const ctx = await nav.newContext({ viewport: vp, ...(cel ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) });
    await ctx.addInitScript(([u, ss]) => {
      localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
      localStorage.setItem("crm_sessao", JSON.stringify(ss));
      localStorage.setItem("crm_tema", "v10");
    }, [SUPA, SESSAO]);
    await instalarBanco(ctx, { SUPA, SESSAO, banco });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    const p = await ctx.newPage();
    const erros = [];
    p.on("pageerror", e => erros.push(e.message));
    p.on("dialog", d => d.accept());
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
    await p.waitForSelector("#app.logado", { timeout: 15000 });
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
    await p.waitForTimeout(800);
    const medir = async (tela, foto) => {
      await p.waitForTimeout(700);
      const a = await p.evaluate(MEDIR);
      if (foto) await p.screenshot({ path: path.join(OUT, `${rot}-${tela}.png`), fullPage: !cel });
      for (const x of a) todos.push({ tela: `${rot} ${tela}`, ...x });
    };
    await medir("meu-dia", true);
    // cada lista do menu
    const vs = await p.evaluate(() => [...new Set([...document.querySelectorAll(".lista-item[data-v]")].map(x => x.dataset.v))]);
    for (const v of vs) {
      await p.evaluate(v => { visao = v; buscaTxt = ""; render(); }, v);
      await medir(`lista-${v.replace(/[^a-z0-9]+/gi, "_")}`, /fase:outro|meudia|importante|clientes/.test(v));
    }
    // a sugestão de etapa do print, sem depender do leitor dos movimentos
    await p.evaluate(([id, d]) => { const v = propostaDeEtapa; propostaDeEtapa = (k, a) => k && k.id === id ? { fase: "judicial", etapa: "em recurso", data: d,
      quando: d + "T10:00", por: "pelo movimento “Recebidos os autos” do PJe de 19/10", velha: true, fora: false, mover: null } : v(k, a); }, [kA.id, iso(-11)]);
    await p.evaluate(id => abrirFicha(id), cA.id);
    await p.waitForTimeout(1200);
    await p.keyboard.press("Escape");
    await p.evaluate(() => document.querySelectorAll(".modal-fundo,#janela").forEach(x => x.remove()));
    await medir("cadastro", true);
    await p.evaluate(id => { casoSel = id; abaAtiva = 2; repintarFicha(); }, kA.id);
    await medir("caso-escritorio", true);
    for (const [aba, rx] of [["judicial", /^Judicial/], ["inss", /^INSS/], ["recurso", /^Recurso/], ["completo", /^Caso Completo/]]) {
      await p.evaluate(rx => { const b = [...document.querySelectorAll(".menu-andamentos button,.menu-andamentos a")].find(x => new RegExp(rx).test(x.textContent.trim())); if (b) b.click(); }, rx.source);
      await medir(`caso-${aba}`, aba === "judicial");
      if (aba === "judicial") {
        await p.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^Documentos \(\d+\)/.test(x.textContent.trim())); if (b) b.click(); });
        await medir("caso-documentos", true);
      }
    }
    await p.evaluate(id => { casoSel = id; abaAtiva = 2; repintarFicha(); }, kB.id);
    await medir("caso-b87", true);
    for (const aba of [0, 1, 3]) { await p.evaluate(a => { abaAtiva = a; repintarFicha(); }, aba); await medir(`ficha-aba${aba}`, false); }
    if (!cel) {   // com o WhatsApp aberto, a coluna do caso fica de 300 px e a conversa à direita
      await p.evaluate(id => { casoSel = id; abaAtiva = 2; document.body.classList.add("zap-aberto"); repintarFicha(); }, kA.id);
      await medir("caso-com-zap", true);
      await p.evaluate(() => document.body.classList.remove("zap-aberto"));
    }
    conf(`${rot}: sem erro de página`, !erros.length);
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, "achados.json"), JSON.stringify(todos, null, 1));
  const porTela = {};
  for (const x of todos) (porTela[x.tela] ||= []).push(x);
  for (const [t, xs] of Object.entries(porTela)) {
    console.log(`\n${t}: ${xs.length}`);
    for (const x of xs.slice(0, 40)) console.log(`   +${x.sai}px ${x.corta ? "cortado" : "vaza"} "${x.txt}" ${x.texto} em ${x.quadro}`);
  }
  conf("nenhum texto passa da borda do quadro", !todos.length);
  await nav.close(); s.close();
  const falhas = ok.filter(x => !x[1]).length;
  console.log(`\n${ok.length - falhas}/${ok.length}`);
  process.exit(falhas ? 1 : 0);
})();
