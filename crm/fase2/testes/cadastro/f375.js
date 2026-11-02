// F375 · as correções da análise de interface da 12.35 (02.11.2026): sem selo Urgente no cartão do caso, a volta à fila
// sem o rótulo repetido, a regra dos prazos no "?", o título da lista sem o "i" ao lado do "?", o contador do Meu Dia
// sem "· 0" e nenhum travessão no texto à vista das listas e da ficha. Banco simulado e dados fictícios.
// Uso: node f375.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f375";
fs.mkdirSync(OUT, { recursive: true });

const PAULO = FIX.colaboradores[0].id, MARCOS = "22222222-2222-2222-2222-222222222222", MEISSA = "33333333-3333-3333-3333-333333333333";
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: [...FIX.colaboradores, { id: MARCOS, auth_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", nome: "Marcos Fictício", inicial: "M",
    cor: "#8a4b00", papel: "colaborador", ativo: true, cargo: "advogado" },
    { id: MEISSA, auth_id: "cccccccc-cccc-cccc-cccc-cccccccccccc", nome: "Meissa Fictícia", inicial: "ME", cor: "#2b7a4b", papel: "colaborador", ativo: true, cargo: "recepcao" }],
  clientes: [], casos: [], atribuicoes: [], documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;
const iso = n => new Date(Date.now() - 3 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
const ts = (n, h = "12:00") => `${iso(n)}T${h}:00-03:00`;
let seq = 0;
const id = p => `${p}0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const cli = (nome, campos = {}) => { const c = { id: id("c"), nome, cpf: null, telefone: null, campos, telefones: [], criado_em: ts(-400) }; T.clientes.push(c); return c; };
const caso = (c, o) => { const k = { id: id("b"), cliente_id: c.id, titulo: c.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
  marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, dcb_prorrogacao_pedida: false, origem_lista: "🌻 INSS",
  criado_em: ts(-300), ...o }; T.casos.push(k); T.atribuicoes.push({ caso_id: k.id, colaborador_id: PAULO }); return k; };
const and = (k, n, texto, o = {}) => { const a = { id: id("e"), caso_id: k.id, autor_id: PAULO, texto, origem: "app", origem_id: null, criado_em: ts(n),
  publico: false, excluir: false, importante: false, urgente: false, responde_a: null, ...o }; T.andamentos.push(a); return a; };




// o último dia útil antes de hoje, como o CRM conta
const dUtil = (() => { let n = -1; for (;;) { const d = new Date(iso(n) + "T12:00:00"); if (d.getDay() % 6) return n; n--; } })();
const cA = cli("Luciana Aparecida Fictícia Mendes de Oliveira"); cA.telefone="17996186303"; cA.cpf = "52998224725";
cA.campos = { notas_todo: [{ tipo: "cnpj", texto: "12.345.678/0001-90" }, { tipo: "aposentadoria", texto: "Possível aposentadoria especial em 22/10/2027" }] };
const kA = caso(cA, { beneficio: "Aux. Incapacidade Temporária", especie: "B31", fase: "inss", importante: true, urgente: true, prazo: iso(10),
  ronda: { despacho: { em: ts(dUtil, "15:00"), por: PAULO, prazo: iso(10) } } });
and(kA, dUtil, "Cliente avisado. Verificar em 10 dias.");
const cB = cli("Bruna Fictícia Urgente");
const kB = caso(cB, { beneficio: "Apos. por Idade", especie: "B41", fase: "inss", urgente: true });
and(kB, dUtil, "Pedido de documento enviado.");
const cC = cli("Carla Fictícia Estrela");
caso(cC, { beneficio: "Pensão por Morte", especie: "B21", fase: "inss", importante: true });
caso(cli("Roseli Maria Fictícia Custodio Schisatti"), { beneficio: "Aux. Incapacidade", especie: "B46", fase: "inss", prazo: iso(-90) });


cA.campos.atendimento = [{ em: ts(-6), quem: "Paulo", texto: `Benefício negado; ciência pelo AR em ${iso(-6).split("-").reverse().join("/")}. Quer recorrer.` }];

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
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
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

  // o texto à vista (sem o que está escondido) com travessão
  const travessoes = () => p.evaluate(() => {
    const achados = [], w = document.createTreeWalker(document.querySelector("#app") || document.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) {
      if (!/—/.test(n.data) || /^[·\s—]*$/.test(n.data)) continue;   // o "—" sozinho é o sinal de valor vazio
      const el = n.parentElement; if (!el || !el.getClientRects().length || el.closest("script,style,[hidden]")) continue;
      achados.push(n.data.trim().slice(0, 90));
    }
    return achados;
  });
  const vistos = {};
  const listas = await p.$$eval(".lista-item[data-v]", a => [...new Set(a.map(e => e.dataset.v))]);
  for (const v of listas) {
    await p.evaluate(v => irPara(v), v); await p.waitForTimeout(250);
    for (const t of await travessoes()) (vistos[t] = vistos[t] || []).push(v);
  }
  await p.evaluate(([cid, kid]) => abrirFicha(cid).then(() => { casoSel = kid; abaAtiva = 2; repintarFicha(); }), [cA.id, kA.id]);
  await p.waitForSelector(".tr-faixa"); await p.waitForTimeout(400);
  const ficha = await p.evaluate(kid => {
    const cartao = document.querySelector(".caso-esq .linha-caso"), fp = document.querySelector(".faixa-prazos");
    return { urg: !!(cartao && cartao.querySelector(".chip.urg")), regra: !!document.querySelector(".fp-regra"), fpTxt: fp ? fp.innerText : "" };
  }, kA.id);
  conf("o cartão do caso urgente não mostra o selo Urgente (F306)", !ficha.urg);
  conf("o quadro Prazos sem a frase fixa da regra, que foi para o \"?\"", !ficha.regra && await p.evaluate(() => /Concluir por hoje marca a volta à fila/.test(AJUDA["caso:prazos"][1])));
  conf(`a volta à fila não repete o rótulo (${ficha.fpTxt.replace(/\s+/g, " ").slice(0, 80)})`, !/volta à fila\W+volta à fila/i.test(ficha.fpTxt));
  for (const aba of [0, 1, 2, 3, 4, 5]) {
    await p.evaluate(a => { abaAtiva = a; repintarFicha(); }, aba); await p.waitForTimeout(250);
    for (const t of await travessoes()) (vistos[t] = vistos[t] || []).push("ficha:" + aba);
  }
  const lista = Object.entries(vistos);
  lista.forEach(([t, onde]) => console.log(`   travessão: "${t}" em ${[...new Set(onde)].join(", ")}`));
  conf(`nenhum travessão no texto à vista de ${listas.length} listas e das abas da ficha`, !lista.length);

  await p.evaluate(() => irPara("meudia")); await p.waitForTimeout(300);
  const cont = await p.evaluate(() => { const c = document.querySelector('.lista-item[data-v="meudia"] .cont.venc'); return c ? c.textContent.trim() : null; });
  conf(`o contador do Meu Dia não mostra "· 0" (${cont})`, cont === null || !/·\s*0$/.test(cont));
  const i = await p.evaluate(() => { const h = document.getElementById("titulo-lista"); h.classList.add("dica-tit"); return getComputedStyle(h, "::after").display; });
  conf(`o título da lista não ganha o "i" ao lado do "?" (${i})`, i === "none");

  conf("sem erro de página", !erros.length); erros.forEach(e => console.log("   " + e));
  await nav.close(); s.close();
  const falhas = ok.filter(([, v]) => !v).length;
  console.log(`\n${ok.length - falhas}/${ok.length}`);
  process.exit(falhas ? 1 : 0);
})();
