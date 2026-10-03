// F158 — OS EMBARGOS DENTRO DA APELAÇÃO. No 2º grau do e-SAJ, os embargos de
// declaração têm o MESMO número da apelação e código próprio, e a extensão
// 1.12 passa a entregá-los, cada processo com as cinco movimentações mais
// recentes (e não só a última). O CRM grava o que não conhece: do processo
// que já acompanha, da última data gravada em diante; do que é novo para ele,
// os últimos 7 dias. O incidente entra com o código na chave e não mexe na
// ficha do caso (classe, ajuizamento, link). Número e textos fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const NUM = "0001234-56.2025.8.26.0368", DIG = "00012345620258260368";
const AP = "RI00ABCDE0000", ED = "RI00ABCDF12KW";
const dia = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const mv = (n, texto) => ({ data: dia(n), hora: "00:00", texto });
const LINK = c => `https://esaj.tjsp.jus.br/cposg/show.do?processo.codigo=${c}`;
const apelacao = movimentos => ({ numero: NUM, classe: "Apelação Cível", orgao: "3ª Câmara de Direito Público",
  situacao: "Julgado", codigo: AP, link: LINK(AP), principal: null, tipo: null, distribuido: dia(200),
  movimento: movimentos[0], movimentos, id: null, ca: null });
const embargos = movimentos => ({ numero: NUM, classe: "Embargos de Declaração Cível", orgao: "3ª Câmara de Direito Público",
  situacao: "Julgado", codigo: ED, link: LINK(ED), principal: NUM, tipo: "Recurso", distribuido: dia(60),
  movimento: movimentos[0], movimentos, id: null, ca: null });
const coleta = (id, processos) => ({ id, fonte: "pje", criado_em: new Date().toISOString(), aplicada_em: null,
  dados: { versao: 1, fonte: "pje-acervo", sistema: "esaj", tribunal: "TJSP", grau: "2º grau",
    host: "esaj.tjsp.jus.br", processos } });

const ED_MOVS = [mv(0, "Expedido Certidão"), mv(1, "Encaminhado para Publicação"), mv(1, "Acórdão registrado"),
  mv(1, "Julgado virtualmente — Rejeitaram os embargos. V. U."), mv(40, "Distribuído")];
const COLETAS = {
  "col-158": coleta("col-158", [
    apelacao([mv(1, "Certidão de Publicação Expedida"), mv(5, "Conclusos ao Relator"),
      mv(10, "Recebidos os autos"), mv(20, "Distribuído por prevenção")]),
    embargos(ED_MOVS)]),
  // a rodada seguinte: os embargos andaram um passo; o resto é o mesmo
  "col-158b": coleta("col-158b", [
    apelacao([mv(1, "Certidão de Publicação Expedida"), mv(5, "Conclusos ao Relator"), mv(10, "Recebidos os autos")]),
    embargos([mv(0, "Certificado trânsito em julgado"), ...ED_MOVS.slice(0, 4)])]),
};
// o que a ficha já tinha: só a apelação, até dia(10)
let banco = [{ origem_id: `mov:${DIG}:${dia(10)}T00:00:x1`,
  texto: `e-SAJ TJSP (2º grau): Recebidos os autos — em ${dia(10)} 00:00 — Apelação Cível ${NUM}` }];

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
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const u = decodeURIComponent(rota.request().url()), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") return rota.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    let corpo = FIX[t] || [];
    if (t === "coletas") { const id = (u.match(/id=eq\.([\w-]+)/) || [])[1]; corpo = COLETAS[id] ? [COLETAS[id]] : []; }
    if (t === "andamentos" && /origem=eq\.pje/.test(u)) corpo = banco;
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error" && !/ERR_FAILED/.test(m.text())) erros.push("console: " + m.text()); });
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);

  await p.evaluate(([caso, num]) => { const k = D.casoPorId.get(caso);
    Object.assign(k, { processo: num, classe_judicial: null, ajuizado_em: null, orgao_judicial: null }); }, [CASO1, NUM]);
  const conferir = id => p.evaluate(async id => { visao = "patinss"; await conferirPje(id);
    return { resumo: planoPjeAtual.resumo, andamentos: planoPjeAtual.andamentos, fichas: planoPjeAtual.fichas,
             tela: document.getElementById("conteudo-meio").textContent }; }, id);

  const r = await conferir("col-158");
  const doEd = r.andamentos.filter(a => a.origem_id.startsWith(`mov:${DIG}:${ED}:`));
  const daAp = r.andamentos.filter(a => new RegExp(`^mov:${DIG}:\\d{4}-`).test(a.origem_id));
  conf("os embargos entram com o código na chave, separados da apelação", doEd.length === 4 && daAp.length === 2);
  conf("dos embargos, as dos últimos 7 dias, na ordem em que aconteceram (o julgamento antes da certidão)",
    doEd.map(a => a.texto.split(": ")[1].split(" — em ")[0]).join(" | ") ===
      "Julgado virtualmente — Rejeitaram os embargos. V. U. | Acórdão registrado | Encaminhado para Publicação | Expedido Certidão");
  conf("a movimentação antiga dos embargos (40 dias) não vira novidade", !doEd.some(a => /Distribuído/.test(a.texto)));
  conf("da apelação, só o que veio depois da última data gravada (a de 20 dias fica fora; a de 10, conhecida)",
    daAp.map(a => a.texto.split(": ")[1].split(" — em ")[0]).join(" | ") === "Conclusos ao Relator | Certidão de Publicação Expedida");
  conf("o texto diz o que é: e-SAJ, 2º grau, a classe dos embargos e o número",
    doEd.every(a => a.texto.startsWith("e-SAJ TJSP (2º grau): ") && a.texto.endsWith(`— Embargos de Declaração Cível ${NUM}`)));
  conf("o resumo conta 6 movimentos novos e nenhum processo parado", r.resumo.movimentos === 6 && r.resumo.sem_mudanca === 0);
  const ficha = (r.fichas.find(f => f.caso_id === CASO1) || {}).campos || {};
  conf("a ficha recebe a classe e a data da apelação, e não as dos embargos",
    r.fichas.length === 1 && ficha.classe_judicial === "Apelação Cível" && ficha.ajuizado_em === dia(200));
  conf("o link da ficha é o da apelação", JSON.stringify(ficha).includes(AP) && !JSON.stringify(ficha).includes(ED));
  conf("a tela oferece gravar os 6", /Aplicar 6 movimento/.test(r.tela) && /Julgado virtualmente/.test(r.tela));

  // gravado o plano, a rodada seguinte só traz o passo novo dos embargos
  banco = banco.concat(r.andamentos.map(a => ({ origem_id: a.origem_id, texto: a.texto })));
  const r2 = await conferir("col-158b");
  conf("na rodada seguinte, só o trânsito em julgado dos embargos é novo",
    r2.andamentos.length === 1 && /Certificado trânsito em julgado/.test(r2.andamentos[0].texto)
      && r2.andamentos[0].origem_id.startsWith(`mov:${DIG}:${ED}:${dia(0)}T00:00:`));
  conf("a apelação, sem nada novo, conta como sem mudança", r2.resumo.sem_mudanca === 1 && r2.resumo.movimentos === 1);
  const r3 = await conferir("col-158");
  conf("a mesma coleta conferida de novo não grava nada duas vezes", r3.andamentos.length === 0);

  for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
