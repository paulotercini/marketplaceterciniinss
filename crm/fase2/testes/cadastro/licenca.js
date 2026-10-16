// A licença sem remuneração da RAIS (motivo 70 do afastamento): o CNIS conta o
// mês, e o INSS tem descontado o período do tempo de contribuição. O mapa
// mostra o fato, e a passagem à Análise de Direito leva a nota junto da
// contagem. E a análise pede, por espécie, só os campos que mudam o direito
// ou o valor, com os outros a um clique. Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

// o layout do "Relatório Completo do Trabalhador" (fixt-dossie.js), com o
// afastamento preenchido na linha numerada sob "De Até Motivo"
const bloco = (ano, afast, dias, desl) => [
  "MINISTÉRIO DO TRABALHO E EMPREGO", "Secretaria-Executiva",
  `RELAÇÃO ANUAL DE INFORMAÇÕES SOCIAIS - RAIS - Ano-Base: ${ano}`, "Relatório Completo do Trabalhador", "VÍNCULOS",
  "PIS: 123.45678.90-1 Nome: MARLENE FICTA RAMOS", "CNPJ Razão Social", "11.444.777/0001-61 CONFECCOES FICTICIAS LTDA",
  "Data Admissão Tipo de admissão", "01/02/2011", "De Até Motivo", ...afast, "Afastamento", `Quantidade de dias afastados: ${dias}`,
  desl ? `Data ${desl}` : "Data", "Valor aviso prévio 0,00", "Causa", "Desligamento",
  "Remuneração Hora extra Remuneração Hora extra", "Janeiro 1.500,00 0 Julho 0,00 0", "Fevereiro 1.500,00 0 Agosto 1.500,00 0", "Contribuição", "1",
];
const RAIS = [
  ...bloco("2015", ["1) 0 - null"], 0),
  ...bloco("2016", ["1) 01/06/2016 31/07/2016 70 - LICENCA SEM VENCIMENTO/REMUNERACAO", "2) 0 - null", "3) 0 - null"], 61),
  ...bloco("2017", ["1) 0310 1210 40 - DOENCA NAO RELACIONADA AO TRABALHO"], 10),
].join("\n");

const AN = (n, nome, texto) => ({ id: `a9000000-0000-0000-0000-00000000000${n}`, cliente_id: CLI_CHEIO, caso_id: null, origem: "dossie", nome,
  caminho: `dossie/52998224725/${n}.pdf`, tipo: "application/pdf", tamanho: 1000, texto, paginas: 3, paginas_imagem: [], criado_em: "2026-10-08T12:00:00Z" });
FIX.anexos = [AN(1, "CTPS RAIS CAGED · Extrato RAIS.pdf", RAIS)];
const CNIS = { em: "2026-10-08", paginas: 3, qtVinculos: 1, nits: [], indicadores: [], contribSemPerda: 104,
  vinculos: [{ seq: 1, tipo: "Empregado", origem: "CONFECCOES FICTICIAS LTDA", codigo: "11.444.777/0001-61", inicio: "01/02/2011", fim: "30/09/2019",
    ultRemun: "09/2019", aberto: false, indicadores: [] }],
  analise: { abertos: [], errosEmp: [], abaixo: [], mesAnt: "09/2026", agora: { tipo: "sem", ultima: { comp: "09/2019", tipo: "Empregado" } },
    benefAtivos: [], qtComps: 104, contagem: { periodos: [["2011-02", "2019-09"]], carencia: 104, anos: 8, meses: 8 } } };
FIX.clientes[0] = { ...FIX.clientes[0], cpf: "52998224725", dossie: {}, triagem: { pdf: { cnis: CNIS } }, campos: { ...(FIX.clientes[0].campos || {}), precasos: [{ id: "pc_m", especie: "", marc: {}, em: "2026-10-12" }] } };
FIX.casos[0] = { ...FIX.casos[0], titulo: "Aposentadoria por idade", beneficio: "Aposentadoria por idade", especie: "B41", nb: null, dcb: null, prazo: null };

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 1100 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (m !== "GET") return rota.fulfill(m === "POST" ? { status: 201, contentType: "application/json", body: "[]" } : { status: 204, body: "" });
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

  // 1 · o leitor: o afastamento numerado, com o ano do ano-base quando falta
  const rs = await p.evaluate(t => lerRaisTexto(t).map(b => ({ ano: b.ano, af: b.afastamentos, dias: b.diasAfastados })), RAIS);
  conf("sem afastamento, a linha \"0 - null\" não vira afastamento", rs[0].af.length === 0 && rs[0].dias === 0);
  conf("a licença de 2016 sai com as datas, o código e o motivo", rs[1].af.length === 1 && rs[1].af[0].de === "01/06/2016"
    && rs[1].af[0].ate === "31/07/2016" && rs[1].af[0].codigo === "70" && /LICENCA SEM VENCIMENTO/.test(rs[1].af[0].motivo) && rs[1].dias === 61);
  conf("a data abreviada ganha o ano do ano-base", rs[2].af[0].de === "03/10/2017" && rs[2].af[0].ate === "12/10/2017" && rs[2].af[0].codigo === "40");
  const lic = await p.evaluate(t => licencasDaRais(lerRaisTexto(t).map(b => ({ ...b, anexo: { id: "x" } }))), RAIS + "\n" + RAIS);
  conf("só a licença sem remuneração conta, uma vez, com os dias", lic.length === 1 && lic[0].dias === 61 && lic[0].ano === "2016");

  // 2 · no mapa da aposentadoria, entre a idade e a contribuição
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForFunction(() => D._ficha && D._ficha.cliId && !_lendoDossie && !_lendoLeitores, null, { timeout: 10000 });
  await p.evaluate(() => { abaAtiva = 0; irSubCad("mapa"); });
  await p.waitForSelector(".mapa-arvore");
  const fatos = await p.evaluate(cli => { const c = D.cliPorId.get(cli), ks = D.casosDoCliente.get(cli) || [];
    return fatosDoMapa(c, ks, familiaDoMapa(c, ks)).filter(f => /licença sem remuneração/.test(f.texto)); }, CLI_CHEIO);
  conf("o fato da licença vai ao grupo da contribuição, em atenção, com a RAIS de origem", fatos.length === 1 && fatos[0].grupo === "contrib"
    && fatos[0].est === "warn" && fatos[0].fonte === "RAIS de 2016"
    && /^A RAIS de 2016 registra licença sem remuneração na CONFECCOES FICTICIAS LTDA, de 01\/06\/2016 a 31\/07\/2016 \(61 dias\): o INSS tem descontado esse período do tempo de contribuição, e a contagem do CNIS ainda o inclui$/.test(fatos[0].texto));
  if (!(await p.$('.mapa-ramo[data-ramo="apo_der"].aberto'))) await p.click('.mapa-ramo[data-ramo="apo_der"] .mapa-no');
  await p.waitForSelector('.mapa-ramo[data-ramo="apo_der"].aberto + .mapa-fatos');
  conf("o ramo da contagem mostra a licença, com a RAIS para ver", /RAIS de 2016 registra licença sem remuneração/.test(await p.textContent(".mapa-fatos"))
    && await p.$$eval(".mapa-fatos .mapa-lista li", ls => ls.some(l => /licença sem remuneração/.test(l.textContent) && l.querySelector(".adr-link"))));

  // 3 · a passagem à Análise de Direito leva a nota junto da contagem
  // F234 · o Mapa só mostra: a passagem à Análise de Direito é pelo benefício aberto, que preenche o formulário
  await p.evaluate(cli => { admSalvar(cli, a => { a.beneficios = { tempo: ["idade"] }; }); irSubCad("direito"); }, CLI_CHEIO);
  await p.waitForSelector("#ad-quadrado");
  await p.evaluate(cli => { adAbrirBenef(cli, "idade"); document.getElementById("ad-novo").open = true; }, CLI_CHEIO);
  await p.waitForSelector("#ad-novo[open] #ad-contexto");
  const campos = await p.evaluate(() => ({ t: document.getElementById("ad-f-tempo").value, c: document.getElementById("ad-f-carencia").value,
    ctx: document.getElementById("ad-contexto").value }));
  conf("o tempo e a carência levam a licença da RAIS", /8 anos e 8 meses \(CNIS, por competência\); a RAIS mostra 61 dias de licença sem remuneração, que o INSS tem descontado/.test(campos.t)
    && /104 contribuições .*61 dias de licença sem remuneração/.test(campos.c));
  conf("o que veio do Primeiro atendimento vai ao contexto, com a licença", /licença sem remuneração/i.test(campos.ctx));

  // 4 · a análise pede o certo por espécie, e os outros campos ficam a um clique
  const vis = await p.evaluate(() => ({
    b31: camposDoServico({ cod: "B31", sub: "B31", nome: "Auxílio por incapacidade temporária" }),
    b94: camposDoServico({ cod: "B94", sub: "B94", nome: "Auxílio-acidente acidentário" }),
    b87: camposDoServico({ cod: "B87", sub: "B87", nome: "BPC/LOAS — deficiência" }),
    b42: camposDoServico({ cod: "B42", sub: "B42", nome: "Aposentadoria por tempo de contribuição" }),
    b46: camposDoServico({ cod: "B46", sub: "B46", nome: "Aposentadoria especial" }) }));
  conf("o B31 pede carência, valor e como recolhe, sem tempo nem data do direito", vis.b31.join() === "carencia,valor,recolhe");
  conf("o auxílio-acidente não pede carência", vis.b94.join() === "valor,recolhe");
  conf("o BPC da pessoa com deficiência pede a DID e o grau, sem valor nem períodos especiais", vis.b87.join() === "recolhe,did,grau");
  conf("a aposentadoria segue com os cinco campos, e a especial com os períodos", vis.b42.join() === "tempo,carencia,valor,data_direito,recolhe"
    && vis.b46.includes("periodos_especiais"));
  await p.selectOption("#ad-esp", "B31"); await p.waitForTimeout(100);
  const esc = await p.evaluate(() => ({ tempo: document.querySelector('#ad-campos [data-campo="tempo"]').hidden, did: document.querySelector('#ad-campos [data-campo="did"]').hidden }));
  await p.click("#ad-outros"); await p.waitForTimeout(80);
  const abre = await p.evaluate(() => !document.querySelector('#ad-campos [data-campo="tempo"]').hidden && !document.querySelector('#ad-campos [data-campo="did"]').hidden);
  conf("no B31 o tempo some do formulário, e \"mostrar os outros campos\" o traz de volta", esc.tempo && esc.did && abre);

  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
