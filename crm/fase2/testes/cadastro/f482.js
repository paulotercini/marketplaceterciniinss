// F482 · a importação automática das coletas não pisca a tela nem tira o que se faz (pedido do Paulo, 09.11.2026):
// durante a rodada nada se repinta e só aparece o "Importando N de M"; no fim, a tela ocupada fica como está.
// Banco simulado. Uso: node f482.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";

const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: JSON.parse(JSON.stringify(FIX.clientes)), casos: JSON.parse(JSON.stringify(FIX.casos)),
  atribuicoes: FIX.atribuicoes, documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;

const N1 = "5002453-54.2025.4.03.6314", N2 = "0002999-39.2021.4.03.6314";
Object.assign(T.casos[0], { processo: N1, processos: [{ numero: N2 }], fase: "judicial", encerrado_em: null });
const proc = (numero, texto) => ({ numero, classe: "PJEC", partes: "FULANO x INSS", movimento: { data: "2026-10-16", hora: "02:10", texto } });
// host e grau também no topo: é o que o select com apelido (host:dados->>host) devolve
const coleta = (id, host, grau, ps, min) => ({ id, fonte: "pje", host, grau, criado_em: `2026-10-16T09:${min}:00Z`, aplicada_em: null,
  dados: { versao: 1, fonte: "pje-acervo", host, grau, processos: ps } });
T.coletas.push(
  coleta("c0000000-0000-0000-0000-000000000001", "pje1g.trf3.jus.br", "1º grau", [proc(N1, "Publicado Sentença tipo B em 16/10/2026.")], "50"),
  coleta("c0000000-0000-0000-0000-000000000002", "pje2g.trf3.jus.br", "2º grau", [proc(N2, "Publicado Acórdão em 16/10/2026.")], "51"),
  { id: "c0000000-0000-0000-0000-000000000003", fonte: "pje-processo", criado_em: "2026-10-16T09:52:00Z", aplicada_em: null,
    dados: { numero: "9999999-99.2026.4.03.6314", grau: "1º grau", itens: [{ data: "2026-10-15", hora: "10:00", textos: ["Juntada"] }] } });
const C1 = T.coletas[0].id, C2 = T.coletas[1].id;

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
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  await instalarBanco(ctx, { SUPA, SESSAO, banco });
  const p = await ctx.newPage();
  p._erros = [];
  p.on("pageerror", e => p._erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const deCaso = () => T.andamentos.filter(a => a.origem === "pje").map(a => a.texto);
  // os avisos que a tela mostrou durante a rodada
  await p.evaluate(() => { window._avisos = []; const el = document.getElementById("aviso");
    new MutationObserver(() => window._avisos.push(el.textContent)).observe(el, { childList: true, characterData: true, subtree: true }); });

  // 1 · tela ocupada: um texto digitado e não gravado no meio da tela
  await p.evaluate(() => { visao = "meudia"; render();
    const m = document.getElementById("conteudo-meio");
    m.insertAdjacentHTML("afterbegin", `<div id="marca-f482"><textarea id="txt-f482"></textarea></div>`);
    const t = document.getElementById("txt-f482"); t.value = "texto em digitação"; t.focus(); });
  const cargas0 = await p.evaluate(() => { window._D0 = D; window._cargas = 0; const c = carregar; carregar = (...a) => { window._cargas++; return c(...a); }; return 0; });
  await p.evaluate(() => autoAplicarColetas());
  const t1 = deCaso();
  conf("a importação em segundo plano grava as duas coletas", t1.some(x => /Sentença tipo B/.test(x)) && t1.some(x => /Acórdão/.test(x))
    && T.coletas[0].aplicada_em && T.coletas[1].aplicada_em);
  const fica = await p.evaluate(() => { const t = document.getElementById("txt-f482"); return !!t && t.value === "texto em digitação" && document.activeElement === t; });
  conf("a tela não é repintada: o texto digitado e o foco continuam", fica);
  conf("com a tela ocupada a rodada não troca os dados em uso", await p.evaluate(() => D === window._D0));
  const avs = await p.evaluate(() => window._avisos);
  conf("durante a rodada só aparece o aviso Importando", avs.length > 0 && avs.every(a => /^Importando/.test(a)));
  conf("o modo silencioso termina com a rodada", await p.evaluate(() => coletaSilenciosa === false));

  // 2 · tela livre: no fim recarrega e repinta uma vez
  T.coletas[0].aplicada_em = null; T.coletas[1].aplicada_em = null; T.andamentos.length = 0;
  T.config_app = (T.config_app||[]).filter(c => c.chave !== "coletas_auto_em");
  await p.evaluate(() => { document.activeElement && document.activeElement.blur(); document.getElementById("marca-f482")?.remove(); visao = "meudia"; render(); window._cargas = 0;
    window._renders = 0; const r = render; render = (...a) => { window._renders++; return r(...a); }; });
  await p.evaluate(() => autoAplicarColetas());
  conf("F485 · nem no fim da rodada a tela é repintada", await p.evaluate(() => window._renders === 0));
  conf("com a tela livre a rodada só atualiza os dados, uma vez e sem repintar", await p.evaluate(() => window._cargas === 1));

  // 3 · o Importar à mão continua repintando
  conf("fora da rodada automática o render do Importar segue normal", await p.evaluate(() => { visao = "patinss"; renderColeta(); return !!document.querySelector("#conteudo-meio"); }));

  conf("sem erro de página", !p._erros.length);
  if (p._erros.length) console.log(p._erros.join("\n"));
  const bons = ok.filter(x => x[1]).length;
  console.log(`\n${bons}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(bons === ok.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
