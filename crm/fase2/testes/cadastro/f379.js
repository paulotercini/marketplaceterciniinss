// F379 · os casos encerrados vêm na carga inicial sem o histórico do DataJud
// (datajud, datajud_multi); a ficha os completa, e mover um número a partir do
// caso sem eles busca antes, para não apagar o histórico no banco. Banco simulado.
// Uso: node f379.js [pasta-das-fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1 } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f379";
fs.mkdirSync(OUT, { recursive: true });

const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: JSON.parse(JSON.stringify(FIX.clientes)), casos: JSON.parse(JSON.stringify(FIX.casos)),
  atribuicoes: FIX.atribuicoes, documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;


const NUM = "50024535420254036314", OUTRO_NUM = "50011112220244036136";
const FECHADO = "b0000000-0000-0000-0000-0000000000f1", ABERTO = "b0000000-0000-0000-0000-0000000000a1";
const caso = (id, extra) => Object.assign(JSON.parse(JSON.stringify(FIX.casos[0])), { id, fase: "judicial", origem_lista: "👪 Judicial", protocolos: [],
  titulo: "Auxílio por incapacidade", criado_em: "2025-06-01T12:00:00Z" }, extra);
const hist = n => ({ processo: n, ultimo: { data: "2026-01-05", nome: "Baixa definitiva" }, instancias: [{ rotulo: "1º grau", historico: [{ data: "2026-01-05", nome: "Baixa definitiva" }] }] });
T.casos.push(
  caso(FECHADO, { encerrado_em: "2026-01-10T12:00:00Z", processo: "5002453-54.2025.4.03.6314",
    processos: [{ numero: "5002453-54.2025.4.03.6314", nosso: true, acompanhar: true }, { numero: "5001111-22.2024.4.03.6136", nosso: true, acompanhar: true }],
    datajud: hist(NUM), datajud_multi: { [NUM]: hist(NUM), [OUTRO_NUM]: hist(OUTRO_NUM) } }),
  caso(ABERTO, { processo: null, datajud: hist("aberto") }));

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
  const pedidos = [];
  p.on("request", q => { if (/\/rest\/v1\/casos\?/.test(q.url())) pedidos.push(decodeURIComponent(q.url())); });
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0 && D._completo);

  const fech = pedidos.find(u => /encerrado_em=not\.is\.null/.test(u) && !/limit=1/.test(u)) || "";
  conf("os encerrados são pedidos sem datajud e datajud_multi, com as demais colunas",
    /select=id,/.test(fech) && !/datajud/.test(fech) && /encerrado_em,/.test(fech) && /processos/.test(fech));
  conf("os abertos continuam inteiros (select=*)", pedidos.some(u => /select=\*&encerrado_em=is\.null/.test(u)));
  const est = await p.evaluate(([f, a]) => ({ n: D.casos.length, ids: new Set(D.casos.map(k => k.id)).size,
    leve: !!D.casoPorId.get(f)._semDj, abertoLeve: !!D.casoPorId.get(a)._semDj, abertoDj: !!D.casoPorId.get(a).datajud }), [FECHADO, ABERTO]);
  conf("nenhum caso repetido, o encerrado marcado como leve e o aberto inteiro",
    est.n === T.casos.length && est.ids === est.n && est.leve && !est.abertoLeve && est.abertoDj);

  // o banco simulado não recorta colunas: tira-se na memória o que a carga não teria trazido
  await p.evaluate(f => { const k = D.casoPorId.get(f); delete k.datajud; delete k.datajud_multi; }, FECHADO);
  const movido = await p.evaluate(([f, a, n]) => moverNumero("proc", n, f, a, { quieto: true }), [FECHADO, ABERTO, NUM]);
  const fb = T.casos.find(k => k.id === FECHADO), ab = T.casos.find(k => k.id === ABERTO);
  conf("mover o processo a partir do encerrado leve não apaga o histórico do outro número",
    movido !== false && fb.datajud_multi && fb.datajud_multi[OUTRO_NUM] && !fb.datajud_multi[NUM]);
  conf("o histórico do número movido vai junto ao caso de destino", ab.datajud_multi && ab.datajud_multi[NUM] && ab.datajud && ab.datajud.processo === NUM);

  // a ficha completa o caso encerrado
  await p.evaluate(f => { const k = D.casoPorId.get(f); k._semDj = true; delete k.datajud_multi; }, FECHADO);
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForFunction(f => !D.casoPorId.get(f)._semDj, FECHADO, { timeout: 10000 }).catch(() => {});
  conf("abrir a ficha traz o histórico do DataJud do caso encerrado",
    await p.evaluate(([f, o]) => { const k = D.casoPorId.get(f); return !k._semDj && !!(k.datajud_multi || {})[o]; }, [FECHADO, OUTRO_NUM]));

  conf("sem erro de página", !p._erros.length);
  if (p._erros.length) console.log(p._erros.join("\n"));
  await p.screenshot({ path: path.join(OUT, "f379.png") });
  const bons = ok.filter(x => x[1]).length;
  console.log(`\n${bons}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(bons === ok.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
