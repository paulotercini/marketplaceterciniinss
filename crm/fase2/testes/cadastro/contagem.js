// Dossiê, onda 3 — a contagem do CNIS por competência (vínculo de empregado
// mês a mês, contribuição de individual uma a uma, a concomitância contada
// uma vez, a competência abaixo do mínimo fora), a contagem do INSS do resumo
// de documentos lida ao lado, e o que falta para a aposentadoria por idade no
// mapa, na triagem, na caixa da aposentadoria e no formulário da análise.
// Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO } = require("./fixturas");
const { RESUMO_INSS_TEXTO } = require("./fixt-dossie");
const SUPA = "https://ficticio.supabase.co";

FIX.anexos = [{ id: "a4000000-0000-0000-0000-000000000001", cliente_id: CLI_CHEIO, caso_id: null, origem: "dossie",
  nome: "Processos · Resumo de tempo.pdf", caminho: "dossie/52998224725/Processos/Resumo de tempo.pdf", tipo: "application/pdf",
  tamanho: 1000, texto: RESUMO_INSS_TEXTO, paginas: 1, paginas_imagem: [], criado_em: "2026-10-08T12:00:00Z" }];
// o CNIS já lido, com a contagem gravada pela leitura: 150 contribuições
// entre 01/2000 e 06/2012, e contribuinte individual hoje
const CNIS = { em: "2026-10-10", paginas: 3, qtVinculos: 1, nits: [], indicadores: [], contribSemPerda: 150,
  vinculos: [{ seq: 1, tipo: "Empregado", origem: "FABRICA FICTICIA", inicio: "03/01/2000", fim: "30/06/2012", ultRemun: "06/2012", aberto: false, indicadores: [] }],
  analise: { abertos: [], errosEmp: [], abaixo: [], mesAnt: "09/2026", agora: { tipo: "ci", comp: "09/2026" }, benefAtivos: [], qtComps: 150,
    contagem: { carencia: 150, anos: 12, meses: 6, periodos: [["2000-01", "2012-06"]], foraMinimo: 0 } } };
FIX.clientes[0] = { ...FIX.clientes[0], cpf: "52998224725", dossie: {}, sexo: "F", triagem: { pdf: { cnis: CNIS } } };
FIX.casos[0] = { ...FIX.casos[0], titulo: "Aposentadoria por idade", beneficio: "Aposentadoria por idade", especie: "B41", nb: null };

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
    if (m !== "GET") {
      escritos.push({ m, u, corpo: JSON.parse(rota.request().postData() || "{}") });
      if (m === "POST") return rota.fulfill({ status: 201, contentType: "application/json", body: "[]" });
      return rota.fulfill({ status: 204, body: "" });
    }
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
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

  // 1 · a contagem por competência
  const ct = await p.evaluate(() => analisarCnis({ linhaDoTempo: [
    { tipo: "Empregado", origem: "A", inicio: "01/03/2000", fim: "15/06/2001", aberto: false, comps: [] },
    { tipo: "Contribuinte Individual", origem: "", inicio: "", fim: "", comps: [{ c: "07/2001", v: 500 }, { c: "08/2001", v: 500 }] },
    { tipo: "Empregado", origem: "B", inicio: "10/05/2001", fim: "", aberto: true, comps: [{ c: "08/2001", v: 900 }, { c: "09/2001", v: 900 }] },
    { tipo: "Empregado", origem: "C", inicio: "01/01/2020", fim: "31/03/2020", aberto: false,
      comps: [{ c: "01/2020", v: 2000 }, { c: "02/2020", v: 900 }, { c: "03/2020", v: 2000 }] },
    { tipo: "Benefício", origem: "AUXILIO DOENCA", inicio: "01/01/2015", fim: "31/12/2015", comps: [] },
  ] }, "2026-10-10").contagem);
  conf("o empregado conta mês a mês e o vínculo sem saída vai até a última remuneração", ct.periodos[0][0] === "2000-03" && ct.periodos[0][1] === "2001-09");
  conf("a concomitância conta uma vez e o mês abaixo do mínimo fica fora", ct.carencia === 21 && ct.foraMinimo === 1
    && JSON.stringify(ct.periodos) === JSON.stringify([["2000-03", "2001-09"], ["2020-01", "2020-01"], ["2020-03", "2020-03"]]));
  conf("o benefício intercalado não entra na conta", !ct.periodos.some(([a]) => a.startsWith("2015")));
  conf("a conta até uma data corta os períodos", await p.evaluate(pp => mesesContadosAte(pp, "2001-12") === 19 && mesesContadosAte(pp, "2020-02") === 20, ct.periodos));
  conf("o tempo sai em anos e meses", ct.anos === 1 && ct.meses === 9);

  // 2 · a contagem do INSS, lida do resumo
  const rs = await p.evaluate(t => lerResumoInssTexto(t), RESUMO_INSS_TEXTO);
  conf("o resumo do INSS traz DER, tempo, carência considerada e o especial não enquadrado", rs && rs.der === "10/09/2019"
    && rs.tempo.anos === 10 && rs.tempo.meses === 5 && rs.tempo.dias === 28 && rs.carencia === 120 && rs.naoEnquadrados === 1
    && rs.especie === "42" && /^19 ANOS/.test(rs.aCumprir));

  // 3 · o mapa da aposentadoria por idade diz o que falta
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForFunction(() => D._ficha && D._ficha.cliId && !_lendoDossie && !_lendoLeitores, null, { timeout: 10000 });
  await p.evaluate(() => { abaAtiva = 0; irSubCad("mapa"); });
  await p.waitForSelector(".mapa-arvore");
  conf("a aposentadoria por idade abre a família programável", /Aposentadoria programável/.test(await p.textContent(".mapa-raiz")));
  await p.click('.mapa-ramo[data-ramo="apo_der"] .mapa-no');
  await p.waitForSelector('.mapa-ramo[data-ramo="apo_der"].aberto + .mapa-fatos');
  const fx = await p.textContent(".mapa-fatos");
  const falta = await p.evaluate(() => competenciaMais(compHoje(), 30));
  conf("a carência mostra quanto falta e quando se completa", fx.includes(`Carência pelo CNIS: 150 contribuições; faltam 30 para as 180, completas em ${falta} se contribuir todo mês`));
  conf("a idade da aposentadoria por idade vem com a data", /Completou 62 anos em 14\/03\/2024, a idade da aposentadoria por idade/.test(fx));
  conf("a contagem do INSS vem ao lado, com a diferença até a mesma DER", /Na DER de 10\/09\/2019, o INSS contou 10 anos, 5 meses e 28 dias e carência de 120; o CNIS de hoje dá 150 até a mesma data, 30 a mais/.test(fx)
    && /1 período especial não enquadrado/.test(fx));
  conf("o ramo fica em atenção", await p.$eval('.mapa-ramo[data-ramo="apo_der"]', e => e.classList.contains("est-warn")));

  // 4 · a triagem e a caixa da aposentadoria trazem a contagem
  const tri = await p.evaluate(cli => triagemLeitura("cnis", D.cliPorId.get(cli), D.casosDoCliente.get(cli)).txt, CLI_CHEIO);
  conf("o passo do CNIS na triagem traz a contagem", /Carência pelo CNIS: 150 contribuições; tempo de 12 anos e 6 meses/.test(tri));
  const apos = await p.evaluate(cli => caixaApos(D.cliPorId.get(cli)), CLI_CHEIO);
  conf("a caixa da aposentadoria provável mostra a carência contada", /Carência pelo CNIS: <b>150 de 180<\/b> contribuições; faltam 30/.test(apos));

  // 5 · o mapa leva a contagem aos campos da análise, sem gravar
  escritos.length = 0;
  await p.evaluate(() => irSubCad("mapa"));
  await p.waitForSelector(".mapa-topo button.tl-bt.forte");
  await p.click(".mapa-topo button.tl-bt.forte");
  await p.waitForSelector("#ad-novo[open]");
  const campos = await p.evaluate(() => ({ car: document.getElementById("ad-f-carencia").value, tempo: document.getElementById("ad-f-tempo").value }));
  conf("carência e tempo entram nos campos da análise", campos.car === "150 contribuições (CNIS, contagem do CRM)" && campos.tempo === "12 anos e 6 meses (CNIS, por competência)");
  conf("nada é gravado sem o clique", !escritos.some(e => /analises_direito/.test(e.u)));

  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
