// F229 · "conferir e aplicar todas" no 📥 Importar, e o aplicar do PJe preso
// ao plano da SUA coleta: um conferir que termina no meio não pode trocar o
// que é gravado (16.10.2026: o 1º grau gravou o 2º e perdeu 7 movimentos).
// Banco simulado. Uso: node f229.js
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
const C1 = T.coletas[0].id, C2 = T.coletas[1].id, C3 = T.coletas[2].id;

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

  // a corrida: o aplicar da coleta 1 começa e, antes do primeiro passo, outro
  // conferir troca o plano global — o que vai ao banco é o da coleta 1
  await p.evaluate(async ([c1, c2]) => {
    await conferirPje(c1);
    const pa = aplicarPje(c1);
    planoPjeAtual = { coleta_id: c2, andamentos: [], fichas: [], docs: [], resumo: {} };
    await pa;
  }, [C1, C2]);
  conf("o aplicar grava os movimentos da SUA coleta mesmo com o plano global trocado no meio",
    deCaso().some(t => /Sentença tipo B/.test(t)) && T.coletas[0].aplicada_em);

  // o botão: aparece com duas ou mais coletas dos tribunais na fila
  T.coletas[0].aplicada_em = null; T.andamentos.length = 0;
  await p.evaluate(async () => { coletasPendentes = []; await buscarColetas(); visao = "patinss"; render(); });
  const botao = await p.locator("button", { hasText: "conferir e aplicar todas" }).count();
  conf("o botão aparece no Importar com as coletas na fila", botao === 1);

  await p.evaluate(() => aplicarTodasColetas());
  const t = deCaso();
  conf("as duas coletas do PJe gravam cada uma o seu movimento",
    t.filter(x => /1º grau.*Sentença tipo B/.test(x)).length === 1 && t.filter(x => /2º grau.*Acórdão/.test(x)).length === 1);
  conf("as duas saem da fila", T.coletas[0].aplicada_em && T.coletas[1].aplicada_em);
  conf("o processo completo sem caso no CRM fica na fila", !T.coletas[2].aplicada_em);

  conf("sem erro de página", !p._erros.length);
  if (p._erros.length) console.log(p._erros.join("\n"));
  const bons = ok.filter(x => x[1]).length;
  console.log(`\n${bons}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(bons === ok.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
