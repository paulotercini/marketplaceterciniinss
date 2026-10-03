// F159 — O PRÓXIMO PASSO SAI DO MOVIMENTO. O 📌 de um andamento judicial
// abre com a data do movimento como "intimado em", o prazo do catálogo
// escolhido pelo ato e o passo escrito; o movimento mostra, na aba Judicial
// e nas Novidades, o que já se fez a partir dele. Números e textos fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, EU, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const JEF = "5001234-56.2026.4.03.6302", TJ = "1002819-79.2025.8.26.0368";
const MOV = (id, texto, dias) => ({ id, caso_id: CASO1, origem: "pje", texto, andamentos_lidos: [],
  criado_em: new Date(Date.now() - dias * 864e5).toISOString() });
const SENT = MOV("a1", `PJe (1º grau): Sentença Tipo B — em 02.10.2026 14:10 — PJEC ${JEF}`, 1);
const ACOR = MOV("a2", `e-SAJ TJSP (2º grau): Julgado virtualmente — Rejeitaram os embargos. V. U. — em 01.10.2026 00:00 — Embargos de Declaração Cível ${TJ}`, 2);
const FILHO = { id: "f1", caso_id: CASO1, responde_a: "a2", autor_id: EU, origem: "app", excluir: false,
  texto: "⏰ [PRAZO 10.10.2026] Embargos de declaração — 5 dias úteis (art. 1.023 do CPC), intimação de 01/10/2026. Analisar o acórdão." };
const TAREFA = { id: "t1", andamento_id: "f1", caso_id: CASO1, colaborador_id: EU, lembrar_em: "2026-10-08", concluida_em: null };
FIX.andamento_tarefas = [TAREFA];

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
  const pedidosFilhos = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = decodeURIComponent(rota.request().url()), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") return rota.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    let corpo = FIX[t] || [];
    if (t === "andamentos" && /responde_a=in\./.test(u)) { pedidosFilhos.push(u); corpo = [FILHO]; }
    else if (t === "andamentos" && /origem=in\./.test(u)) corpo = [SENT, ACOR];
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

  // as regras, isoladas
  const r = await p.evaluate(([sent, acor, jef]) => ({
    sent: proximoPassoDoMovimento(sent),
    acor: proximoPassoDoMovimento(acor),
    laudo: proximoPassoDoMovimento(`PJe (1º grau): Juntada de laudo pericial — em 30.09.2026 09:00 — PJEC ${jef}`),
    direto: proximoPassoDoMovimento(`PJe (1º grau): Intimação eletrônica — Prazo: 20/10/2026 — em 29.09.2026 09:00 — PJEC ${jef}`),
    sentComum: proximoPassoDoMovimento("eproc TJSP (1º grau): Sentença — em 29.09.2026 10:00 — Procedimento Comum 1000001-11.2026.8.26.0368"),
    nada: proximoPassoDoMovimento("PJe (1º grau): Conclusos para despacho — em 29.09.2026 09:00 — PJEC " + jef),
    cumpr: proximoPassoDoMovimento("e-SAJ TJSP (1º grau): Execução/Cumprimento de Sentença Iniciada (o) — 0000890-28.2020.8.26.0368 — em 29.09.2026 00:00 — Procedimento Comum 0000890-28.2020.8.26.0368"),
    sessao: proximoPassoDoMovimento("PJe (2º grau): Deliberado em Sessão - Julgado - Mérito — em 17.09.2026 00:20 — RecInoCiv " + jef),
    manual: proximoPassoDoMovimento("Cliente ligou pedindo notícias"),
  }), [SENT.texto, ACOR.texto, JEF]);
  conf("sentença no JEF: recurso inominado, intimado na data do movimento", r.sent && r.sent.cat === "ri" && r.sent.de === "2026-10-02" && /sentença/i.test(r.sent.passo));
  conf("sentença no rito comum: apelação", r.sentComum && r.sentComum.cat === "ap");
  conf("acórdão (julgado virtualmente): embargos de declaração, 01/10", r.acor && r.acor.cat === "ed" && r.acor.de === "2026-10-01");
  conf("laudo: manifestação sobre o laudo", r.laudo && r.laudo.cat === "laudo");
  conf("prazo escrito no movimento vale como data fatal direta", r.direto && r.direto.prazo === "2026-10-20" && !r.direto.cat);
  conf("movimento sem ato de prazo e anotação manual não sugerem nada", r.nada === null && r.manual === null);
  conf("cumprimento de sentença iniciado não é sentença; julgado em sessão é acórdão", r.cumpr === null && r.sessao && r.sessao.cat === "ed");

  // o 📌 aberto de uma novidade vem preenchido
  await p.evaluate(([sent, acor]) => { D.novid = [sent, acor]; visao = "novidades"; render(); }, [SENT, ACOR]);
  await p.waitForFunction(() => document.querySelectorAll(".nov").length === 2);
  await p.waitForTimeout(300);
  const cab = await p.evaluate(() => [...document.querySelectorAll(".nov")].map(n => ({ id: n.dataset.and, cab: (n.querySelector(".seg-cab") || {}).textContent || "" })));
  conf("a lista pede os filhos das não lidas uma vez só", pedidosFilhos.length === 1 && /responde_a=in\.\(a1,a2\)/.test(pedidosFilhos[0]));
  conf("a novidade do acórdão mostra o prazo marcado e a tarefa de quem", (cab.find(x => x.id === "a2") || {}).cab.includes("⏰ 10.10 Embargos de declaração") && /🗓 P 08.10/.test((cab.find(x => x.id === "a2") || {}).cab));
  conf("a novidade sem seguimento não ganha cabeçalho", (cab.find(x => x.id === "a1") || {}).cab === "");

  await p.evaluate(() => { const i = segItens.findIndex(x => x.andId === "a1"); abrirSeguimento(i); });
  await p.waitForSelector("#seg-cat");
  const seg = await p.evaluate(() => ({
    cat: document.getElementById("seg-cat").value, de: document.getElementById("seg-de").value,
    prazo: document.getElementById("seg-prazo").value, txt: document.getElementById("seg-txt").value,
    sug: (document.querySelector(".seg-sug") || {}).textContent || "",
    esperado: contarPrazo("2026-10-02", PRAZOS_CATALOGO.find(x => x.id === "ri")) }));
  conf("o 📌 abre com o catálogo no recurso inominado e intimado em 02/10", seg.cat === "ri" && seg.de === "2026-10-02");
  conf("a data fatal já está contada em dias úteis a partir da intimação", seg.prazo === seg.esperado && seg.prazo > "2026-10-02");
  conf("o passo vem escrito e a sugestão diz de onde veio", /sentença/i.test(seg.txt) && /sugerido pelo movimento de 02.10.2026/.test(seg.sug));
  await p.evaluate(() => fecharCaixa());

  // o cabeçalho na aba Judicial da ficha
  const cnj = await p.evaluate(([acor, filho, tarefa]) => {
    D._andsFicha = [acor, filho]; D.tarefasFicha = [tarefa];
    return caixaPje(D.casoPorId.get(acor.caso_id), [acor]);
  }, [ACOR, FILHO, TAREFA]);
  conf("na aba Judicial o movimento traz o mesmo cabeçalho", /seg-cab/.test(cnj) && /⏰ 10.10 Embargos de declaração/.test(cnj) && /🗓 P 08.10/.test(cnj));

  for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
