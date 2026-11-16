// F619 · a linha curta abaixo do título dos cartões INSS, CRPS e Judicial do Dashboard do caso, calculada no banco
// por linha_curta(), com o Corrigir (nível 3+) gravado em casos.ronda.linha_curta.<aba>. Banco simulado, dados fictícios.
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
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: [], casos: [], atribuicoes: [], documentos_beneficio: FIX.documentos_beneficio || [],
  modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;
const iso = n => new Date(Date.now() - 3 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
const ts = (n, h = "12:00") => `${iso(n)}T${h}:00-03:00`;
const c = { id: "c0000000-0000-4000-8000-000000000001", nome: "Cliente Teste Linha", cpf: null, telefone: "5500000000001", campos: {}, telefones: [], criado_em: ts(-400) };
T.clientes.push(c);
const k = { id: "b0000000-0000-4000-8000-000000000002", cliente_id: c.id, titulo: c.nome, protocolos: ["1700000901"], processos: [{ numero: "50000770320264036314", papel: "ms" }],
  crps_nups: [], crps: [], nbs: [], arquivados: {}, marcadores: [], ronda: { outra: "fica" }, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false,
  origem_lista: "🌻 INSS", beneficio: "Auxílio por incapacidade", especie: "B31", fase: "inss", dcb_prorrogacao_pedida: false, criado_em: ts(-300) };
T.casos.push(k); T.atribuicoes.push({ caso_id: k.id, colaborador_id: PAULO });
const and = (n, texto, o) => T.andamentos.push({ id: "e" + T.andamentos.length + "000000-0000-4000-8000-000000000000", caso_id: k.id, autor_id: null, texto, criado_em: ts(n),
  publico: false, excluir: false, importante: false, urgente: false, responde_a: null, ...o });
and(-4, "Perícia médica agendada. Agendado para 20/11/2026", { origem: "pat", origem_id: "evento:1700000901:pericia:2026-11-20" });
and(-3, "PJe (1º grau): Conclusos para decisão", { origem: "pje", origem_id: `mov:50000770320264036314:${iso(-3)}T10:00:a1` });

let chamadas = 0;
banco.rpc = { linha_curta: corpo => { chamadas++; return corpo.p_caso === k.id
  ? { inss: { texto: "Perícia médica agendada para 20/11/2026", data: iso(-4), fonte: "PAT", via: "catálogo" },
      judicial: { texto: "Concluso para decisão desde " + iso(-3).split("-").reverse().join("/"), data: iso(-3), fonte: "PJe", via: "catálogo" } } : {}; } };

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
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await p.evaluate(([cid, kid]) => { abrirFicha(cid).then(() => { casoSel = kid; abaAtiva = 2; repintarFicha(); }); }, [c.id, k.id]);
  await p.waitForSelector(".db-and .db-lc", { timeout: 8000 }).catch(() => {});

  const txt = sel => p.evaluate(s => [...document.querySelectorAll(s)].map(e => e.textContent.trim()), sel);
  conf("o cartão do INSS traz a linha curta logo abaixo do título", await p.evaluate(() => { const l = document.querySelector(".db-and:not(.jud) .db-lc"); return !!l && l.previousElementSibling.classList.contains("db-cab"); }));
  conf("a linha diz o fato calculado", (await txt(".db-and:not(.jud) .db-lc-t"))[0] === "Perícia médica agendada para 20/11/2026");
  conf("o mandado de segurança em paralelo traz a linha do Judicial", /Concluso para decisão/.test((await txt(".db-and.jud .db-lc-t"))[0] || ""));
  conf("uma linha só, com reticências, e o texto inteiro no title", await p.evaluate(() => { const t = document.querySelector(".db-lc-t"), cs = getComputedStyle(t);
    return cs.whiteSpace === "nowrap" && cs.textOverflow === "ellipsis" && /Perícia médica agendada para 20\/11\/2026 \(.*PAT\)/.test(t.title); }));
  conf("uma chamada ao banco por caso na sessão", await (async () => { const antes = chamadas; await p.evaluate(() => repintarFicha()); await p.waitForTimeout(200); return chamadas === antes && antes === 1; })());
  conf("o Corrigir tem uma palavra", (await txt(".db-and:not(.jud) .db-lc-bt"))[0] === "Corrigir");

  // corrige: a ronda é relida do banco e as outras chaves ficam
  T.casos[0].ronda = { outra: "fica", robo: "gravou depois" };
  await p.click(".db-and:not(.jud) .db-lc-bt");
  await p.fill(".db-lc input", "Perícia médica no dia 20/11/2026, em Catanduva");
  await p.click('.db-lc .db-lc-bt:has-text("Salvar")');
  await p.waitForTimeout(500);
  const r = T.casos[0].ronda, cor = r.linha_curta && r.linha_curta.inss;
  conf("a correção grava texto, original, por e em", cor && cor.texto === "Perícia médica no dia 20/11/2026, em Catanduva" && cor.original === "Perícia médica agendada para 20/11/2026" && cor.por && cor.em);
  conf("a ronda foi relida antes do PATCH: nada se perde", r.outra === "fica" && r.robo === "gravou depois");
  conf("a correção aparece no cartão", (await txt(".db-and:not(.jud) .db-lc-t"))[0] === "Perícia médica no dia 20/11/2026, em Catanduva");

  // a linha calculada mudou: a correção deixa de valer
  await p.evaluate(kid => { _lc.get(kid).d.inss = { texto: "Benefício concedido", data: "2026-11-15", fonte: "PAT" }; repintarFicha(); }, k.id);
  await p.waitForTimeout(200);
  conf("com fato novo, a linha calculada volta a valer", (await txt(".db-and:not(.jud) .db-lc-t"))[0] === "Benefício concedido");

  // nível 2 não corrige
  await p.evaluate(() => { sessionStorage.setItem("crm_ver_nivel", "2"); transicao = () => ({ ligada: true, v: 2, niveis: {} }); repintarFicha(); });
  await p.waitForTimeout(200);
  conf("abaixo do nível 3 não há Corrigir", await p.locator(".db-lc-bt").count() === 0 && await p.locator(".db-lc-t").count() >= 1);

  conf("sem erro de página", !erros.length || (console.log(erros), false));
  await nav.close(); s.close();
  const passou = ok.filter(x => x[1]).length;
  console.log(`\n${passou}/${ok.length}`);
  process.exit(passou === ok.length ? 0 : 1);
})();
