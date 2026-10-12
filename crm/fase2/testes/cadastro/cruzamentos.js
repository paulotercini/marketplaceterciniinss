// Dossiê, onda 4 — os cruzamentos: o vínculo do CAGED que o CNIS não traz,
// a remuneração da RAIS que o CNIS não conta, o desemprego involuntário da
// última dispensa (com a marca na conta da graça), o ruído do PPP contra o
// limite de cada época, a CAT lida com o CNAE e o CID, e os honorários pela
// renda do extrato de pagamento. Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO } = require("./fixturas");
const { CAGED_TEXTO, blocoRais, CAT_TEXTO, PPP_TEXTO, extratoPag } = require("./fixt-dossie");
const SUPA = "https://ficticio.supabase.co";

// a última dispensa, sem justa causa, em agosto de 2026; o CNIS só conta até junho
const RAIS_2026 = blocoRais("2026", "66.777.888/0001-11", "TRANSPORTADORA ILUSORIA LTDA", "03/02/2025", "", "20/08/2026",
  "11 - Rescisão de contr. sem justa causa por iniciativa do empregador ou exoneração de cargo efetivo ou em comissão", "2.100,00",
  ["Janeiro 2.100,00 0 Maio 2.100,00 0", "Fevereiro 2.100,00 0 Junho 2.100,00 0", "Março 2.100,00 0 Julho 2.100,00 0", "Abril 2.100,00 0 Agosto 1.400,00 0"]).join("\n");
const AN = (n, nome, texto) => ({ id: `a5000000-0000-0000-0000-00000000000${n}`, cliente_id: CLI_CHEIO, caso_id: null, origem: "dossie", nome,
  caminho: `dossie/52998224725/${nome.replace(/ · /, "/")}`, tipo: "application/pdf", tamanho: 1000,
  texto, paginas: 2, paginas_imagem: [], criado_em: "2026-10-08T12:00:00Z" });
FIX.anexos = [
  AN(1, "CTPS RAIS CAGED · Extrato CAGED.pdf", CAGED_TEXTO),
  AN(2, "CTPS RAIS CAGED · Extrato RAIS.pdf", RAIS_2026),
  AN(3, "Meu INSS · CAT.pdf", CAT_TEXTO),
  AN(4, "Meu INSS · PPP.pdf", PPP_TEXTO),
  AN(5, "Meu INSS · Extrato de pagamento.pdf", extratoPag({ nb: "180.123.456-0", dib: "14/05/2020", dip: "14/05/2020",
    credito: { comp: "05/2020", previsao: "05/06/2020", pagoEm: "08/06/2020", fimPeriodo: "31/05/2020" } })),
];
// o CNIS lido: só dois dos cinco vínculos do CAGED, e a conta até 06/2026
const VINC = (origem, codigo, inicio) => ({ tipo: "Empregado", origem, codigo, inicio, fim: "", ultRemun: "06/2026", aberto: true, indicadores: [] });
const CNIS = { em: "2026-10-10", paginas: 3, qtVinculos: 3, nits: [], indicadores: [], contribSemPerda: 200,
  vinculos: [VINC("EVENTOS FICTICIOS", "33.444.555/0001-90", "11/11/2000"), VINC("INDUSTRIA FICTICIA", "11.222.333/0001-44", "15/04/2024"),
    VINC("TRANSPORTADORA ILUSORIA", "66.777.888/0001-11", "03/02/2025")],
  analise: { abertos: [], errosEmp: [], abaixo: [], mesAnt: "09/2026", agora: { tipo: "sem", ultima: { comp: "06/2026", tipo: "Empregado" } },
    benefAtivos: [], qtComps: 200, contagem: { carencia: 200, anos: 16, meses: 8, periodos: [["2010-01", "2026-06"]], foraMinimo: 0 } } };
FIX.clientes[0] = { ...FIX.clientes[0], cpf: "52998224725", dossie: {}, triagem: { pdf: { cnis: CNIS } } };
FIX.casos[0] = { ...FIX.casos[0], titulo: "Auxílio por incapacidade temporária", beneficio: "Auxílio por incapacidade temporária", especie: "B31", nb: null };

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

  // 1 · os leitores e o limite de ruído da época
  const cat = await p.evaluate(t => lerCatTexto(t), CAT_TEXTO);
  conf("a CAT traz a data e o tipo do acidente, o CNAE e o CID", cat && cat.numero === "2025-123456-7/01" && cat.data === "12/03/2025" && cat.tipo === "Típico"
    && cat.cnae === "49.302" && cat.cid === "S626" && cat.parte === "Mão (exceto punho ou dedos)" && cat.emitente === "Empregador");
  const ppp = await p.evaluate(t => lerPppTexto(t), PPP_TEXTO);
  conf("o PPP traz a empresa e cada fator com o período quebrado em duas linhas", ppp && ppp.empresa === "FUNDICAO IMAGINARIA LTDA" && ppp.riscos.length === 3
    && ppp.riscos[0].db === 88 && ppp.riscos[0].ini === "01/01/1995" && ppp.riscos[0].fim === "31/12/1998" && ppp.riscos[0].epi === "SIM"
    && ppp.riscos[2].fator === "Sílica livre" && ppp.riscos[2].db === null);
  const lim = await p.evaluate(() => [ruidoNoPeriodo(88, "01/01/1995", "31/12/1998"), ruidoNoPeriodo(92.4, "01/01/2004", "31/12/2006"), ruidoNoPeriodo(89, "01/01/1999", "31/12/2002")]);
  conf("o ruído se mede contra 80, 90 e 85 dB(A), conforme a época", JSON.stringify(lim[0]) === JSON.stringify([{ lim: 80, acima: true }, { lim: 90, acima: false }])
    && lim[1].length === 1 && lim[1][0].lim === 85 && lim[1][0].acima && lim[2].length === 1 && !lim[2][0].acima);

  // 2 · no mapa da incapacidade: CAGED e RAIS contra o CNIS, e o desemprego
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForFunction(() => D._ficha && D._ficha.cliId && !_lendoDossie && !_lendoLeitores, null, { timeout: 10000 });
  await p.evaluate(() => { abaAtiva = 0; irSubCad("mapa"); });
  await p.waitForSelector(".mapa-arvore");
  await p.click('.mapa-ramo[data-ramo="inc_qualidade"] .mapa-no');
  await p.waitForSelector('.mapa-ramo[data-ramo="inc_qualidade"].aberto + .mapa-fatos');
  let fx = await p.textContent(".mapa-fatos");
  conf("o vínculo do CAGED que o CNIS não traz aparece", /O CAGED tem 3 vínculos que o CNIS não traz: MERCADO INVENTADO LTDA \(18\/09\/2019 a 31\/12\/2023\)/.test(fx) && !/EVENTOS FICTICIOS/.test(fx.split("O CAGED tem")[1].split(".")[0] || ""));
  conf("a remuneração da RAIS fora da conta do CNIS aparece, mês a mês", /A RAIS mostra remuneração de TRANSPORTADORA ILUSORIA LTDA em 2 meses que o CNIS não conta: 07\/2026, 08\/2026/.test(fx));
  conf("a dispensa sem justa causa propõe o desemprego na conta da graça", /mostra dispensa sem justa causa por TRANSPORTADORA ILUSORIA LTDA em 20\/08\/2026: o desemprego involuntário estende a graça em 12 meses/.test(fx));
  escritos.length = 0;
  await p.click('.mapa-fatos li:has-text("dispensa sem justa causa") button.tl-bt');
  await p.waitForTimeout(300);
  const gr = escritos.find(e => e.m === "PATCH" && /\/rest\/v1\/clientes/.test(e.u));
  conf("o clique marca o desemprego na triagem", gr && gr.corpo.triagem && gr.corpo.triagem.graca && gr.corpo.triagem.graca.desempregado === true);
  await p.waitForSelector('.mapa-ramo[data-ramo="inc_qualidade"].aberto + .mapa-fatos');
  fx = await p.textContent(".mapa-fatos");
  conf("marcado, o fato diz que já está na conta e perde o botão", /já marcado na conta/.test(fx) && !(await p.$('.mapa-fatos li:has-text("dispensa sem justa causa") button.tl-bt')));

  // 3 · na especial, o PPP período a período; no auxílio-acidente, a CAT
  await p.evaluate(cli => mapaLente(cli, "especial"), CLI_CHEIO);
  await p.waitForSelector('.mapa-ramo[data-ramo="esp_ppp"]');
  await p.click('.mapa-ramo[data-ramo="esp_ppp"] .mapa-no');
  await p.waitForSelector('.mapa-ramo[data-ramo="esp_ppp"].aberto + .mapa-fatos');
  fx = await p.textContent(".mapa-fatos");
  conf("o ruído que cruza 1997 fica acima só em parte, com o EPI que não afasta", /ruído de 88 dB\(A\) de 01\/01\/1995 a 31\/12\/1998, acima do limite da época só em parte do período; o EPI declarado eficaz não afasta/.test(fx));
  conf("o ruído de 2004 a 2006 fica acima dos 85 dB(A)", /ruído de 92,4 dB\(A\) de 01\/01\/2004 a 31\/12\/2006, acima do limite de 85 dB\(A\) da época/.test(fx));
  conf("o agente químico entra com o período e o EPI", /Sílica livre de 01\/01\/2004 a 31\/12\/2006, com EPI declarado eficaz/.test(fx));
  await p.evaluate(cli => mapaLente(cli, "b94"), CLI_CHEIO);
  await p.waitForSelector('.mapa-ramo[data-ramo="b94_nexo"]');
  await p.click('.mapa-ramo[data-ramo="b94_nexo"] .mapa-no');
  await p.waitForSelector('.mapa-ramo[data-ramo="b94_nexo"].aberto + .mapa-fatos');
  fx = await p.textContent(".mapa-fatos");
  conf("a CAT vai ao ramo do nexo, com a Lista C do NTEP", /CAT inicial de acidente típico em 12\/03\/2025, CID S626 \(fratura de outros dedos\), CNAE 49\.302; o nexo pelo NTEP se confere na Lista C do Anexo II do Decreto 3\.048\/99/.test(fx));

  // 4 · os honorários pela renda do extrato, conforme a variante do contrato
  const hon = await p.evaluate(cli => quadroHonorDossie(D.cliPorId.get(cli), D.casosDoCliente.get(cli)), CLI_CHEIO);
  conf("na incapacidade, o quadro faz a conta dos 20% e dos 30% sobre 6 benefícios", /renda mensal de R\$\s1\.518,00/.test(hon)
    && /20% sobre 6 benefícios dá R\$\s1\.821,60 na concessão pelo INSS; 30% sobre 6 dá R\$\s2\.732,40 em recurso ou judicial/.test(hon));
  const hon2 = await p.evaluate(cli => { const ks = D.casosDoCliente.get(cli); ks[0].beneficio = "Aposentadoria por idade"; ks[0].especie = "B41";
    return quadroHonorDossie(D.cliPorId.get(cli), ks); }, CLI_CHEIO);
  conf("no padrão, os 3 primeiros benefícios integrais", /os 3 primeiros benefícios integrais somam R\$\s4\.554,00, pela renda do extrato/.test(hon2));

  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
