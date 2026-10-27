// F288 · o processo do acervo sem caso no CRM há mais de 7 dias (a extensão
// do e-SAJ 1.24 só baixa peças de processo com caso): a conferência anota a
// data em que o número apareceu sem caso, e o 📥 Importar avisa. Banco simulado.
// Uso: node f288.js
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

const NOVO = "1000123-45.2026.8.26.0368", VELHO = "1000999-11.2026.8.26.0368", N1 = "5002453-54.2025.4.03.6314";
Object.assign(T.casos[0], { processo: N1, fase: "judicial", encerrado_em: null });
const dez = new Date(Date.now() - 10 * 86400000).toISOString();
T.config_app.push({ chave: "pje_sem_caso", valor: JSON.stringify({
  [VELHO.replace(/\D/g, "")]: { numero: VELHO, partes: "BELTRANO x INSS", sistema: "esaj", desde: dez },
  [N1.replace(/\D/g, "")]: { numero: N1, partes: "FULANO x INSS", sistema: "pje", desde: dez } }) });
const proc = (numero, partes) => ({ numero, classe: "Procedimento Comum", partes, movimento: { data: "2026-10-20", hora: "10:00", texto: "Distribuído" } });
T.coletas.push({ id: "c0000000-0000-0000-0000-000000000001", fonte: "pje", host: "esaj.tjsp.jus.br", grau: "1º grau", sistema: "esaj",
  criado_em: new Date().toISOString(), aplicada_em: null,
  dados: { versao: 1, fonte: "pje-acervo", sistema: "esaj", host: "esaj.tjsp.jus.br", grau: "1º grau",
    processos: [proc(NOVO, "CICRANO DE TAL x INSS"), proc(VELHO, "BELTRANO x INSS"), proc(N1, "FULANO x INSS")] } });
const C1 = T.coletas[0].id;

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
  await p.evaluate(c1 => conferirPje(c1), C1);
  const m = JSON.parse(T.config_app.filter(x => x.chave === "pje_sem_caso").pop().valor);
  const d = n => n.replace(/\D/g, "");
  conf("o processo novo da consulta por OAB fica anotado com a data de hoje", m[d(NOVO)] && Date.now() - new Date(m[d(NOVO)].desde) < 60000);
  conf("o anotado antes mantém a data em que apareceu", m[d(VELHO)] && m[d(VELHO)].desde === dez);
  conf("o processo que ganhou caso sai da anotação", !m[d(N1)]);
  await p.evaluate(() => { visao = "patinss"; planoPjeAtual = null; render(); });
  const txt = await p.locator(".aviso-sem-caso").innerText().catch(() => "");
  conf("o Importar avisa o processo sem caso há mais de 7 dias", /1 processo\(s\).*mais de 7 dias/.test(txt) && txt.includes(VELHO));
  conf("o processo sem caso há menos de 7 dias ainda não entra no aviso", !txt.includes(NOVO));
  const barra = await p.evaluate(() => document.querySelector('[data-v="patinss"]').innerText);
  conf("a barra mostra o ⚠ com a contagem", /⚠ 1/.test(barra));
  await p.evaluate(v => ignorarProcessoPje(v), VELHO);
  await p.evaluate(() => { planoPjeAtual = null; render(); });
  conf("o ignorado sai do aviso", !(await p.locator(".aviso-sem-caso").count()));

  conf("sem erro de página", !p._erros.length);
  if (p._erros.length) console.log(p._erros.join("\n"));
  const bons = ok.filter(x => x[1]).length;
  console.log(`\n${bons}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(bons === ok.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
