// F179 — Honorários no estilo da Análise de Direito: quatro quadros
// (Contratado, Recebido, A receber, Próximo vencimento), a tabela dos
// lançamentos com a situação de cada um e o "recebido" que continua gravando.
// Dados fictícios; datas relativas a hoje.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const RETRATO = process.env.RETRATO_DIR;
const dia = n => { const d = new Date(Date.now() - 3 * 3600e3); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const br = iso => iso.slice(8, 10) + "." + iso.slice(5, 7) + "." + iso.slice(0, 4);
const PG = [
  { id: "f1800000-0000-0000-0000-000000000001", caso_id: CASO1, cliente_id: CLI_CHEIO, descricao: "1ª parcela", valor: 1000,
    status: "recebido", pago_em: dia(-30), vencimento: null, conferencias: [{ c: EU, em: new Date().toISOString() }] },
  { id: "f1800000-0000-0000-0000-000000000002", caso_id: CASO1, cliente_id: CLI_CHEIO, descricao: "2ª parcela", valor: 800,
    status: "aberto", pago_em: null, vencimento: dia(20), conferencias: [] },
  { id: "f1800000-0000-0000-0000-000000000003", caso_id: CASO1, cliente_id: CLI_CHEIO, descricao: "3ª parcela", valor: 800,
    status: "aberto", pago_em: null, vencimento: dia(50), conferencias: [] },
  { id: "f1800000-0000-0000-0000-000000000004", caso_id: CASO1, cliente_id: CLI_CHEIO, descricao: "RPV", valor: 300,
    status: "aberto", pago_em: null, vencimento: dia(-5), conferencias: [] },
];

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
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  const escritos = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      escritos.push({ m, t, u, corpo: JSON.parse(rota.request().postData() || "{}") });
      return rota.fulfill({ status: 204, body: "" });
    }
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const abrir = () => p.evaluate(([cli, pg]) => { D.pagamentos = pg.map(x => ({ ...x }));
    return abrirFicha(cli).then(() => { abaAtiva = 4; repintarFicha(); }); }, [CLI_CHEIO, PG]);
  await abrir();
  await p.waitForSelector('.painel[data-p="4"].ativo .hon .hon-resumo');
  const tiles = await p.$$eval('.painel[data-p="4"].ativo .hon-resumo .adr-tile', ts => ts.map(t => t.textContent.replace(/\s+/g, " ").trim()));
  conf("quatro quadros: Contratado, Recebido, A receber, Próximo vencimento",
    tiles.length === 4 && /Contratado/.test(tiles[0]) && /Recebido/.test(tiles[1]) && /A receber/.test(tiles[2]) && /Próximo vencimento/.test(tiles[3]));
  conf("Contratado: o padrão do escritório da espécie do caso", /Padrão do escritório/.test(tiles[0]) && /30% dos atrasados/.test(tiles[0]));
  conf("Recebido soma o pago: R$ 1.000,00, 1 de 4", /R\$\s?1\.000,00/.test(tiles[1]) && /1 de 4 lançamentos/.test(tiles[1]));
  conf("A receber soma os abertos: R$ 1.900,00, 3 em aberto", /R\$\s?1\.900,00/.test(tiles[2]) && /3 em aberto/.test(tiles[2]));
  conf("Próximo vencimento: o primeiro ainda não vencido, em âmbar",
    tiles[3].includes(br(dia(20))) && /2ª parcela/.test(tiles[3])
    && await p.evaluate(() => document.querySelectorAll(".hon-resumo .adr-tile")[3].classList.contains("hon-t-prox")));
  const linhas = await p.$$eval(".hon-tab tbody tr", trs => trs.map(t => ({ t: t.textContent.replace(/\s+/g, " "),
    sit: t.querySelector(".hon-sit").className, chip: t.querySelector(".hon-sit").textContent,
    num: getComputedStyle(t.querySelector(".hon-num")).textAlign, bt: (t.querySelector("button[data-recebe],button[data-confere]") || {}).textContent || "" })));
  const de = rx => linhas.find(l => rx.test(l.t)) || {};
  conf("uma linha por lançamento, valor alinhado à direita", linhas.length === 4 && linhas.every(l => l.num === "right"));
  conf("recebido em verde", /hon-ok/.test(de(/1ª parcela/).sit) && de(/1ª parcela/).chip === "recebido");
  conf("o próximo: vence em 20 dias, em âmbar", /hon-prox/.test(de(/2ª parcela/).sit) && de(/2ª parcela/).chip === "vence em 20 dias");
  conf("o vencido em vermelho: vencido há 5 dias", /hon-venc/.test(de(/RPV/).sit) && de(/RPV/).chip === "vencido há 5 dias");
  conf("o mais longe: a vencer, em cinza", /hon-cinza/.test(de(/3ª parcela/).sit) && de(/3ª parcela/).chip === "a vencer");
  conf("a tabela está numa caixa com rolagem horizontal",
    await p.evaluate(() => getComputedStyle(document.querySelector(".hon-tab-cx")).overflowX === "auto"));
  conf("o + lançamento continua com os campos de antes",
    await p.evaluate(() => /\+ lançamento/.test(document.querySelector(".hon-novo summary").textContent)
      && ["np-caso", "np-data", "np-valor", "np-desc"].every(id => document.getElementById(id))));
  conf("o cartão Contrato diz o serviço, sem repetir a modalidade do quadro", /Serviço/.test(await p.textContent(".adr-col-lado")) && !/Modalidade/.test(await p.textContent(".adr-col-lado")));
  if (RETRATO) await p.screenshot({ path: path.join(RETRATO, "honorarios180.png"), fullPage: true });

  escritos.length = 0;
  await p.click('.hon-tab button[data-recebe="f1800000-0000-0000-0000-000000000002"]');
  await p.waitForTimeout(700);
  const patch = escritos.find(x => x.m === "PATCH" && x.t === "pagamentos");
  conf("recebido ainda grava (PATCH com status recebido, data e quem recebeu)",
    patch && /f1800000-0000-0000-0000-000000000002/.test(patch.u) && patch.corpo.status === "recebido" && patch.corpo.pago_em && patch.corpo.conferencias[0].c === EU);

  // o ajuste combinado no atendimento manda no Contratado
  await p.evaluate(cli => { D.cliPorId.get(cli).campos = { precasos: [{ id: "pc180", especie: "Aposentadoria por idade",
    natureza: "", marc: {}, honorarios: "25% dos atrasados, sem os três benefícios", quem: null, em: null }] }; }, CLI_CHEIO);
  await abrir();
  await p.waitForSelector('.painel[data-p="4"].ativo .hon .hon-resumo');
  const t0 = await p.textContent('.painel[data-p="4"].ativo .hon-resumo .adr-tile');
  conf("com ajuste no pré-caso, o Contratado mostra o ajuste", /Ajuste combinado/.test(t0) && /25% dos atrasados/.test(t0));

  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
