// F571 · Análises da IA: as análises gravadas pelo conector (registrar_analise) aparecem no Dashboard do caso, abaixo dos
// andamentos do escritório: a mais recente aberta, as anteriores fechadas, só as do caso e as sem caso. Banco simulado, dados fictícios.
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
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais", "analises_ia"]) dados[t] = [];
Object.assign(dados, { colaboradores: [...FIX.colaboradores], clientes: [], casos: [], atribuicoes: [], documentos_beneficio: FIX.documentos_beneficio || [],
  modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;
let seq = 0;
const id = p => `${p}0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const c = { id: id("c"), nome: "Cliente Teste Analise", cpf: null, telefone: "5500000000" + "11", campos: {}, telefones: [], criado_em: "2025-01-10T12:00:00-03:00" }; T.clientes.push(c);
const caso = o => { const k = { id: id("b"), cliente_id: c.id, titulo: c.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
  marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, dcb_prorrogacao_pedida: false, origem_lista: "🌻 INSS",
  criado_em: "2025-02-01T12:00:00-03:00", ...o }; T.casos.push(k); T.atribuicoes.push({ caso_id: k.id, colaborador_id: PAULO }); return k; };
const k1 = caso({ beneficio: "Auxílio por incapacidade", especie: "B31", fase: "inss", protocolos: ["1700000701"] });
const k2 = caso({ beneficio: "Aposentadoria", especie: "B42", fase: "inss", protocolos: ["1700000702"] });
T.andamentos.push({ id: id("d"), caso_id: k1.id, cliente_id: c.id, origem: "app", autor_id: PAULO, texto: "Conferi o CNIS com a cliente.", criado_em: "2026-11-10T10:00:00-03:00" });
const an = (o) => T.analises_ia.push({ id: id("e"), cliente_id: c.id, projeto: "Projeto Cliente Teste", autor_id: PAULO, hash: "h" + seq, criado_em: "2026-11-12T08:00:00-03:00", ...o });
an({ caso_id: k1.id, titulo: "Análise da perícia", texto: "A perícia de 05/11 deixou de examinar o ombro.", feita_em: "2026-11-05" });
an({ caso_id: null, titulo: "Visão geral do cliente", texto: "Qualidade de segurado mantida até 12/2026.", feita_em: "2026-10-01" });
an({ caso_id: k2.id, titulo: "Análise da aposentadoria", texto: "Faltam 14 meses de carência.", feita_em: "2026-11-11" });

const ok = [];
const conf = (nome, v) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); };
(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, "..", "..", q.url === "/" ? "app.html" : q.url.split("?")[0]);
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
    localStorage.setItem("crm_dash_caso", "1");
  }, [SUPA, SESSAO]);
  await instalarBanco(ctx, { SUPA, SESSAO, banco });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const abrir = k => p.evaluate(async ([c, k]) => { await abrirFicha(c); const m = document.getElementById("modal"); if (m) m.style.display = "none";
    casoSel = k; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); }, [c.id, k]);
  await abrir(k1.id);
  await p.waitForSelector("section.an5", { timeout: 5000 });
  const q = await p.evaluate(() => { const q = document.querySelector("section.an5");
    return { abertos: [...q.querySelectorAll("div.an5-it > b")].map(b => b.textContent), fechados: [...q.querySelectorAll("details.an5-it summary b")].map(b => b.textContent),
      txt: q.textContent, aviso: !!q.querySelector(".an5-aviso") }; });
  conf(`a mais recente do caso fica aberta (${q.abertos})`, q.abertos.join() === "Análise da perícia");
  conf(`a da ficha sem caso fica fechada, e a do outro caso não aparece (${q.fechados})`, q.fechados.join() === "Visão geral do cliente" && !/aposentadoria/.test(q.txt));
  conf("mostra a data, o projeto e quem gravou", /05\/11\/2026 · Projeto Cliente Teste · gravada por/.test(q.txt));
  conf("avisa a anotação do escritório posterior à análise", q.aviso);
  conf("o quadro fica abaixo do campo de escrever", await p.evaluate(() => { const e = document.querySelector(".db-col-esq"), a = e && e.querySelector("section.an5");
    const comp = e && [...e.children].find(x => x !== a && x.querySelector && (x.matches("[class*=esc]") || x.querySelector("textarea")));
    return !!a && (!comp || !!(comp.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING)); }));
  T.analises_ia.length = 0;
  await p.evaluate(() => { _anIa.clear(); });
  await abrir(k2.id); await p.waitForTimeout(500);
  conf("sem análise, nenhum quadro", !(await p.$("section.an5")));
  conf("sem erro de página", !erros.length);
  console.log(erros.join("\n"));
  console.log(`${ok.filter(([, v]) => v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ok.every(([, v]) => v) && !erros.length ? 0 : 1);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
