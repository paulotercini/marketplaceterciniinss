// F388 · as anotações do caso em linha do tempo (proposta B, escolha do Paulo de 03.11.2026): o trilho com a inicial de
// quem escreveu, o dia à esquerda no computador e em cima no celular, um sinal só para a não lida, o texto da importante
// afastado da borda, o prazo num quadro cinza sem repetir o texto, a resposta sem caixa e a menção como texto.
// Banco simulado e dados fictícios. Uso: node f388.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f388";
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
const br = d => d.split("-").reverse().join(".");
const util = n => { let k = n; while ([0, 6].includes(new Date(iso(k) + "T12:00:00").getDay())) k++; return k; };
let seq = 0;
const id = p => `${p}0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const c = { id: id("c"), nome: "Rita Fictícia Linha", cpf: null, telefone: null, campos: {}, telefones: [], criado_em: ts(-400) }; T.clientes.push(c);
const k = { id: id("b"), cliente_id: c.id, titulo: c.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
  marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, dcb_prorrogacao_pedida: false, origem_lista: "🌻 INSS",
  criado_em: ts(-300), beneficio: "Auxílio por incapacidade", especie: "B31", fase: "inss", protocolos: ["1700000801"] };
T.casos.push(k); T.atribuicoes.push({ caso_id: k.id, colaborador_id: PAULO });
const and = (n, texto, o = {}, lida = true) => { const a = { id: id("e"), caso_id: k.id, autor_id: PAULO, texto, origem: "app", origem_id: null, criado_em: ts(n, o.h || "12:00"),
  publico: false, excluir: false, importante: false, urgente: false, responde_a: null, ...o }; delete a.h; T.andamentos.push(a);
  if (lida) T.andamentos_lidos.push({ andamento_id: a.id, colaborador_id: PAULO }); return a; };
const dVivo = util(8);
const nPz = and(-3, `⏰ [PRAZO ${br(iso(dVivo))}] Cumprir a exigência do INSS.`);
T.andamento_tarefas.push({ id: id("f"), andamento_id: nPz.id, caso_id: k.id, colaborador_id: MARCOS, atribuido_por: PAULO, lembrar_em: iso(dVivo),
  natureza: "fatal", papel: "executa", concluida_em: null, iniciada_em: null, etapas: [], criado_em: nPz.criado_em });
const nImp = and(-2, "Cliente trouxe o relatório do ortopedista; juntar ao pedido.", { importante: true });
and(-2, "Relatório juntado no Meu INSS.", { responde_a: nImp.id, autor_id: MARCOS, h: "15:00" });
const nNova = and(-1, "@Paulo a perícia foi remarcada pelo INSS, conferir a data.", { autor_id: MARCOS }, false);
T.mencoes.push({ id: id("m"), andamento_id: nNova.id, caso_id: k.id, para_id: PAULO, de_id: MARCOS, lida: false, criado_em: nNova.criado_em });

const ok = [];
const conf = (nome, v) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); };

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const erros = [];
  const pagina = async (opc) => {
    const ctx = await nav.newContext(opc);
    await ctx.addInitScript(([u, ss]) => {
      localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
      localStorage.setItem("crm_sessao", JSON.stringify(ss));
      localStorage.setItem("crm_tema", "v10");
    }, [SUPA, SESSAO]);
    await instalarBanco(ctx, { SUPA, SESSAO, banco });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    const p = await ctx.newPage();
    p.on("pageerror", e => erros.push(e.message));
    p.on("dialog", d => d.accept());
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
    await p.waitForSelector("#app.logado", { timeout: 15000 });
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
    await p.evaluate(([cid, kid]) => { abrirFicha(cid).then(() => { casoSel = kid; abaAtiva = 2; repintarFicha(); }); }, [c.id, k.id]);
    await p.waitForSelector(".timeline li.tl-card"); await p.waitForTimeout(500);
    return p;
  };
  // mede o trilho, a inicial, o dia e o cartão de cada anotação
  const medir = p => p.evaluate(([idImp, idNova, idPz]) => {
    const card = id => [...document.querySelectorAll(".timeline li.tl-card")].find(li => li.querySelector(`[onclick*="${id}"]`));
    const r = e => e.getBoundingClientRect();
    const itens = [...document.querySelectorAll(".timeline .dia-itens")];
    const trilho = itens.map(ul => { const a = r(ul), b = getComputedStyle(ul, "::before"); return a.left + parseFloat(b.left) + parseFloat(b.width) / 2; });
    const avs = [...document.querySelectorAll(".timeline .dia-itens>li.tl-card>.texto>.tl-cab>.tl-av")];
    const noTrilho = avs.length > 0 && avs.every(av => { const ul = av.closest(".dia-itens"), i = itens.indexOf(ul), a = r(av); return Math.abs(a.left + a.width / 2 - trilho[i]) <= 2; });
    const dentro = avs.every(av => r(av).right <= r(av.closest("li.tl-card")).left);
    const imp = card(idImp), nova = card(idNova), pz = card(idPz);
    const dia = document.querySelector(".timeline .dia-bloco>.tl-dia"), ul1 = dia.parentElement.querySelector(".dia-itens>li.tl-card");
    const resp = imp && imp.querySelector(".resp-item");
    return {
      noTrilho, dentro,
      diaAoLado: r(dia).right <= r(ul1).left + 1 && r(dia).top < r(ul1).bottom,
      diaEmCima: r(dia).bottom <= r(ul1).top + 1,
      novaSinal: nova && getComputedStyle(nova).boxShadow === "none" && getComputedStyle(nova).borderTopColor !== getComputedStyle(imp).borderTopColor,
      impMargem: imp && r(imp.querySelector(".tl-corpo")).left - r(imp).left >= 12 && getComputedStyle(imp).boxShadow === "none",
      estrela: !!(imp && imp.querySelector(".sinal-imp, [class*='imp']")),
      menc: (e => e && getComputedStyle(e).backgroundColor === "rgba(0, 0, 0, 0)" && e.offsetParent !== null)(nova && nova.querySelector(".tl-menc")),
      respSemCaixa: resp && getComputedStyle(resp).backgroundColor === "rgba(0, 0, 0, 0)" && /21B3|↳/.test(getComputedStyle(resp, "::before").content),
      pzQuadro: (q => q && getComputedStyle(q).backgroundColor !== "rgba(0, 0, 0, 0)" && q.querySelector(".tl-pz-t").offsetParent !== null)(pz && pz.querySelector(".tl-pz-vivo")),
      pzSemRep: pz && pz.querySelector(".tl-corpo").offsetParent === null && /Cumprir a exigência/.test(pz.querySelector(".tl-pz-t").textContent),
      semVazar: [...document.querySelectorAll(".timeline li.tl-card")].every(li => r(li).right <= r(li.closest(".dia-itens")).right + 1),
    };
  }, [nImp.id, nNova.id, nPz.id]);

  // ── 1 · computador ──
  const p = await pagina({ viewport: { width: 1440, height: 1000 } });
  const d = await medir(p);
  conf("a inicial de quem escreveu fica sobre o trilho, fora do cartão", d.noTrilho && d.dentro);
  conf("no computador, o dia fica à esquerda dos cartões", d.diaAoLado);
  conf("a não lida tem só a borda colorida, sem a faixa grossa", d.novaSinal);
  conf("a importante perde a faixa e o texto não encosta na borda", d.impMargem);
  conf("a menção é texto, sem a caixa bege", d.menc);
  conf("a resposta vem com a seta e sem a caixa cinza", d.respSemCaixa);
  conf("o prazo fica num quadro cinza com o título", d.pzQuadro);
  conf("o texto que só repete o título do prazo não aparece duas vezes", d.pzSemRep);
  conf("nenhum cartão passa da borda", d.semVazar);
  conf("a importante mantém a estrela no cabeçalho", d.estrela);
  await p.locator(".caso-dir").first().screenshot({ path: OUT + "/computador.png" });

  // ── 2 · celular ──
  const m = await pagina({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const e = await medir(m);
  conf("no celular, a inicial também fica sobre o trilho", e.noTrilho && e.dentro);
  conf("no celular, o dia fica acima dos cartões", e.diaEmCima);
  conf("no celular, nenhum cartão passa da borda", e.semVazar);
  await m.screenshot({ path: OUT + "/celular.png", fullPage: false });

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
