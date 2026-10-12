// F195 · o desenho do protótipo no CRM: cada ponto do mapa vai ou não à
// Análise de Direito; a análise mostra o que veio do mapa e o estado de cada
// campo (falta, do dossiê, informado); Documentos diz o que falta na análise
// e volta a ela. Dados fictícios.
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
FIX.clientes[0] = { ...FIX.clientes[0], cpf: "52998224725", dossie: {}, triagem: { pdf: { cnis: CNIS } },
  campos: { ...(FIX.clientes[0].campos || {}), precasos: [{ id: "pc_1", especie: "Aposentadoria por idade", cod: "B41", sub: "B41", natureza: "", marc: {}, honorarios: "", quem: null, em: "2026-10-12" }] } };
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

  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForFunction(() => D._ficha && D._ficha.cliId && !_lendoDossie && !_lendoLeitores, null, { timeout: 10000 });
  await p.evaluate(() => { abaAtiva = 0; irSubCad("mapa"); });
  await p.waitForSelector(".mapa-arvore");
  const n = await p.$$eval(".mapa-ramo", r => r.length);
  conf(`o mapa leva todos os ${n} pontos por padrão`, n > 1 && !(await p.$(".mapa-fora-tag")) && /Levar à Análise de Direito$/.test((await p.textContent(".mapa-topo .tl-bt.forte")).trim()));
  if (!(await p.$('.mapa-ramo[data-ramo="apo_der"].aberto'))) await p.click('.mapa-ramo[data-ramo="apo_der"] .mapa-no');
  await p.waitForSelector(".mapa-fatos .mapa-levar.on");
  const rot = (await p.textContent('.mapa-ramo[data-ramo="apo_der"] .mapa-no b')).trim();
  await p.click(".mapa-fatos .mapa-levar"); await p.waitForTimeout(150);
  conf("tirado da análise, o ponto ganha a marca e o botão conta", /fora da análise/.test(await p.textContent('.mapa-ramo[data-ramo="apo_der"]'))
    && new RegExp(`\\(${n - 1} de ${n} pontos\\)`).test(await p.textContent(".mapa-topo .tl-bt.forte"))
    && (await p.textContent(".mapa-fatos .mapa-levar")).trim() === "Levar à análise");

  await p.click(".mapa-topo button.tl-bt.forte");
  await p.waitForSelector("#ad-novo[open] #ad-trazido");
  const tz = await p.evaluate(() => ({ txt: document.getElementById("ad-trazido").textContent, fora: [...document.querySelectorAll("#ad-trazido .ad-tz.fora b")].map(b => b.textContent),
    lev: document.querySelectorAll("#ad-trazido details.ad-tz").length, ctx: document.getElementById("ad-contexto").value }));
  conf("a análise mostra os pontos levados e o tirado, com o botão de levar", new RegExp(`${n - 1} de ${n} pontos levados`).test(tz.txt) && tz.lev === n - 1 && tz.fora.join() === rot);
  conf("o ponto tirado não vai ao contexto da análise", !tz.ctx.includes(`${rot} (`) && /Mapa do dossiê/.test(tz.ctx));
  await p.evaluate(() => { document.querySelectorAll("#ad-trazido details.ad-tz").forEach(d => { d.open = true; }); });
  conf("cada ponto levado abre os fatos com a fonte", await p.$$eval("#ad-trazido details.ad-tz[open] .mapa-lista li", ls => ls.length > 0 && ls.every(l => l.querySelector(".dossie-orig"))));
  await p.waitForTimeout(50);
  const est = () => p.evaluate(() => Object.fromEntries([...document.querySelectorAll("#ad-campos .adr-campo[data-campo]")].filter(l => !l.hidden)
    .map(l => [l.dataset.campo, [l.dataset.est, l.querySelector(".ad-est").textContent, l.querySelector(".ad-vai").textContent]])));
  let e = await est();
  conf("tempo e carência vindos do dossiê pedem conferência, e o vazio pede informação", e.tempo[0] === "pre" && e.carencia[1] === "do dossiê · confira"
    && e.valor[0] === "falta" && e.valor[1] === "falta informar" && /vai para o resumo da análise e Documentos/.test(e.tempo[2]));
  conf("o título conta o que falta", /\d+ de \d+ a informar/.test(await p.textContent("#ad-falta")));
  await p.fill("#ad-f-carencia", "102 contribuições"); await p.fill("#ad-f-valor", "1621");
  e = await est();
  conf("o que você digita vira informado", e.carencia[0] === "ok" && e.valor[0] === "ok" && e.carencia[1] === "informado");
  await p.click("#ad-trazido .ad-tz.fora button"); await p.waitForTimeout(100);
  conf("levar de volta na análise não apaga o que se digitou", !(await p.$("#ad-trazido .ad-tz.fora")) && (await p.inputValue("#ad-f-carencia")) === "102 contribuições"
    && new RegExp(`${n} de ${n} pontos levados`).test(await p.textContent("#ad-trazido")));

  // Documentos: sem análise, o caminho de volta; com análise, o que falta da espécie
  await p.evaluate(() => { irSubCad("documentos"); });
  await p.waitForSelector(".docs-ad");
  conf("sem análise, Documentos avisa e oferece informar", /nenhuma registrada/.test(await p.textContent(".docs-ad")));
  await p.click(".docs-ad button"); await p.waitForSelector("#ad-novo[open]");
  conf("informar na análise abre o formulário", true);
  const docs = await p.evaluate(cli => { const c = D.cliPorId.get(cli);
    const pega = det => { D.analisesPorCliente.set(cli, [{ id: "x", cliente_id: cli, data_analise: "2026-10-12", detalhes: det, cenarios: [] }]); return docsDaAnalise(c).replace(/<[^>]+>/g, ""); };
    const sv = { cod: "B31", sub: "B31", nome: "Auxílio por incapacidade temporária" };
    const r = { meia: pega({ servico: sv, carencia: "12" }), toda: pega({ servico: sv, carencia: "12", valor: 1621, recolhe: "ci" }), sem: pega({ tempo: "1 ano" }) };
    D.analisesPorCliente.set(cli, []); return r; }, CLI_CHEIO);
  conf("com análise incompleta, diz o que falta da espécie", /falta informar valor do benefício, como recolhe hoje\./.test(docs.meia) && /Informar na análise/.test(docs.meia));
  conf("completa, diz que está pronta e não pede mais nada", /pronta, com os 3 campos que a espécie pede/.test(docs.toda) && !/Informar/.test(docs.toda));
  conf("sem espécie, pede a escolha", /sem espécie escolhida/.test(docs.sem));

  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
