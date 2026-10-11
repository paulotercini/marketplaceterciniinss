// Dossiê, onda 1 — CAGED e RAIS lidos do texto do dossiê; vínculo sem data de
// saída encerrado no último dia do mês da última remuneração, com a data do
// desligamento achada no CAGED ou na RAIS e o atendimento de acerto de CNIS;
// benefício indeferido sem datas; vínculo de hoje pelo mais recente; CNIS e
// declaração do dossiê pelos leitores do CRM, com o NB como sugestão.
// Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1 } = require("./fixturas");
const { ITENS_CNIS, ITENS_DECLARACAO } = require("./fixt-pdf");
const { CAGED_TEXTO, RAIS_TEXTO, itensDeLinhas } = require("./fixt-dossie");
const SUPA = "https://ficticio.supabase.co";

const CPF_DOC = "52998224725";    // o CPF das fixturas do CNIS e da declaração
const AN = (id, nome, extra) => ({ id, cliente_id: CLI_CHEIO, caso_id: null, origem: "dossie", nome,
  caminho: `dossie/${CPF_DOC}/${nome.replace(/ · /, "/")}`, tipo: "application/pdf", tamanho: 1000,
  texto: null, paginas: 1, paginas_imagem: [], criado_em: "2026-10-08T12:00:00Z", ...extra });
FIX.anexos = [
  AN("a1000000-0000-0000-0000-000000000001", "CTPS RAIS CAGED · Extrato CAGED.pdf", { texto: CAGED_TEXTO }),
  AN("a1000000-0000-0000-0000-000000000002", "CTPS RAIS CAGED · Extrato RAIS.pdf", { texto: RAIS_TEXTO }),
  AN("a1000000-0000-0000-0000-000000000003", "CNIS · CNIS completo (com remuneracoes).pdf", { texto: "CNIS" }),
  AN("a1000000-0000-0000-0000-000000000004", "Declaracao · Declaracao de beneficiario.pdf", { texto: "Declaração" }),
];
// o CNIS já lido (como a triagem guarda): quatro vínculos sem data de saída
const VINC = (seq, origem, codigo, inicio, ultRemun) => ({ seq, nit: "123.45678.90-1", tipo: "Empregado", origem, codigo,
  inicio, fim: "", ultRemun, indicadores: [], aberto: true });
const CNIS_LIDO = { em: "2026-10-10", quem: null, paginas: 9, qtVinculos: 4, nits: [], indicadores: [],
  vinculos: [
    VINC(1, "EVENTOS FICTICIOS TRABALHO TEMPORARIO", "33.444.555/0001-90", "11/11/2000", "03/2002"),
    VINC(2, "TRANSPORTADORA ILUSORIA", "66.777.888/0001-11", "03/02/2015", "07/2016"),
    VINC(3, "FABRICA SEM FONTE", "77.888.999/0001-22", "01/03/2005", "12/2006"),
    VINC(4, "INDUSTRIA FICTICIA DE PARAFUSOS", "11.222.333/0001-44", "15/04/2024", "08/2026"),
  ], analise: { abertos: [], errosEmp: [], abaixo: [], mesAnt: "09/2026", agora: { tipo: "empregado" }, benefAtivos: [], qtComps: 0 } };
FIX.clientes[0] = { ...FIX.clientes[0], cpf: CPF_DOC, dossie: {},
  campos: { triagem: { pdf: { cnis: CNIS_LIDO } } } };
FIX.casos[0] = { ...FIX.casos[0], nb: null };

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

  // 1 · os leitores do CAGED e da RAIS, sobre o texto
  const cg = await p.evaluate(t => lerCagedTexto(t), CAGED_TEXTO);
  conf("o CAGED traz os cinco vínculos", cg.length === 5);
  conf("a razão social quebrada acima e abaixo da linha se junta", cg[0].nome === "INDUSTRIA FICTICIA DE PARAFUSOS E COMERCIO LTDA" && cg[0].raiz === "11222333" && cg[0].situacao === "Aberto" && !cg[0].desligamento);
  conf("a razão social colada na admissão se separa", cg[2].nome === "COMERCIAL IMAGINARIA DE FRUTAS LTD" && cg[2].admissao === "10/05/2009" && cg[2].desligamento === "15/07/2011");
  conf("o vínculo de 2000 sai com o desligamento de 04/04/2002", cg[3].admissao === "11/11/2000" && cg[3].desligamento === "04/04/2002" && /CONSULT/.test(cg[3].nome));
  const ra = await p.evaluate(t => lerRaisTexto(t), RAIS_TEXTO);
  conf("a RAIS traz um bloco por vínculo e ano-base", ra.length === 3 && ra.map(b => b.ano).join(",") === "2001,2002,2016");
  conf("o bloco sem desligamento fica sem data, e o com desligamento traz data e causa", !ra[0].desligamento && ra[1].desligamento === "04/04/2002" && /^11 - Rescisão de contr\. sem justa causa/.test(ra[1].causa));
  conf("as remunerações saem por mês, com aviso prévio", ra[1].remuneracoes["04"] === 393.33 && ra[1].remuneracoes["01"] === 1180 && ra[1].avisoPrevio === 1322);

  // a leitura do PDF é do pdf.js, que o arneço não alcança: o teste fixa os
  // pedaços de texto (as fixturas do CNIS e da declaração) e confere o resto
  await p.evaluate(([ic, idc]) => {
    pdfDoAnexo = async a => a.nome;
    itensDoPdf = async marca => /CNIS/.test(marca) ? ic : idc;
  }, [ITENS_CNIS, ITENS_DECLARACAO]);
  // 2 · o fim presumido e a data que fecha o vínculo
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForFunction(cli => D._ficha && D._ficha.cliId && !_lendoDossie && !_lendoLeitores
    && (triagemDe(D.cliPorId.get(cli)).pdf || {}).declaracao, CLI_CHEIO, { timeout: 10000 });
  const auto = escritos.slice();
  const vs = await p.evaluate(cli => { const c = D.cliPorId.get(cli); const f = fontesDoDossie(cli);
    return vinculosSemSaida(cnisDe(c)).map(v => ({ o: v.origem, fim: v.fimPresumido, curso: v.emCurso, fe: (x => x ? x.fonte + " " + x.data : "")(fechoDoVinculo(v, f)) })); }, CLI_CHEIO);
  conf("o vínculo sem saída termina no último dia do mês da última remuneração", vs[0].fim === "31/03/2002" && vs[1].fim === "31/07/2016" && vs[2].fim === "31/12/2006");
  conf("o vínculo com remuneração recente está em curso", vs[3].curso && !vs[0].curso);
  conf("o CAGED fecha o vínculo de 2000 e a RAIS fecha o de 2015", vs[0].fe === "CAGED 04/04/2002" && vs[1].fe === "RAIS de 2016 20/08/2016" && vs[2].fe === "");

  // 3 · a triagem conta e propõe o acerto
  await p.evaluate(cli => { triVisivel.add(cli); abaAtiva = 0; subCad = "triagem"; const c = D.cliPorId.get(cli);
    const PASSOS = triagemPassosDe(c, D.casosDoCliente.get(cli)); irPassoTriagem(cli, PASSOS.findIndex(x => x[0] === "cnis")); }, CLI_CHEIO);
  await p.waitForSelector(".dossie-acerto");
  const blo = await p.textContent(".dossie-acerto");
  conf("o passo do CNIS lista os três vínculos sem saída, sem o que está em curso", (blo.match(/fim presumido/g) || []).length === 3 && !/PARAFUSOS/.test(blo));
  conf("e mostra a data do CAGED e da RAIS ao lado", /CAGED mostra desligamento em 04\/04\/2002/.test(blo) && /RAIS de 2016 mostra desligamento em 20\/08\/2016/.test(blo) && /nenhuma fonte do dossiê/.test(blo));
  const leit = await p.evaluate(cli => triagemLeitura("cnis", D.cliPorId.get(cli), D.casosDoCliente.get(cli)).txt, CLI_CHEIO);
  conf("a leitura do passo avisa que o fim foi presumido", /encerrado\(s\) pelo CRM no último dia do mês da última remuneração/.test(leit) && /CAGED do dossiê mostra desligamento em 04\/04\/2002/.test(leit));
  escritos.length = 0;
  await p.click(".dossie-acerto button.tl-bt");
  await p.waitForTimeout(300);
  const pat = escritos.find(e => e.m === "PATCH" && /\/rest\/v1\/clientes/.test(e.u));
  const pc = pat && (pat.corpo.campos.precasos || []).find(x => x.especie === "CNIS");
  const nota = pat && (pat.corpo.campos.atendimento || []).slice(-1)[0];
  conf("o atendimento de acerto de CNIS nasce com a prova do dossiê", pc && nota && nota.precaso_id === pc.id
    && /o CAGED mostra desligamento em 04\/04\/2002/.test(nota.texto) && /o RAIS de 2016 mostra desligamento em 20\/08\/2016, causa 21/.test(nota.texto)
    && /CTPS, do termo de rescisão ou do extrato analítico do FGTS/.test(nota.texto));
  escritos.length = 0;
  await p.evaluate(cli => abrirAcertoCnis(cli), CLI_CHEIO);
  conf("a segunda vez não duplica o atendimento", !escritos.some(e => e.m === "PATCH" && /clientes/.test(e.u)));

  // 4 · o leitor do CNIS: indeferido sem datas e vínculo de hoje
  const ben = await p.evaluate(itens => lerVinculosCnis(itens).filter(v => v.tipo === "Benefício").map(v => ({ nb: v.nb, sit: v.situacao, ab: v.aberto, ini: v.inicio })), [
    ...[ "Seq. NIT NB Origem do Vínculo Espécie Data Início Data Fim Situação",
      "21 108.12345.51-7 1234567890 Benefício 42 - APOSENTADORIA POR TEMPO DE 14/05/2020 0 - ATIVO",
      "22 108.12345.51-7 1234567891 Benefício 42 - APOSENTADORIA POR TEMPO DE 99 - INDEFERIDO",
      "10 114.12345.61-3 1234567892 Benefício 80 - AUXILIO SALARIO MATERNIDADE 22/02/2010 21/06/2010 2 - CESSADO" ].map((t, i) => ({ t, x: 30, y: 60 + i * 14, w: t.length * 5, p: 1 }))]);
  conf("o benefício indeferido sem datas é lido", ben.length === 3 && ben.some(b => b.nb === "1234567891" && b.sit === "INDEFERIDO" && !b.ab && !b.ini));
  conf("o ativo continua em aberto e o cessado fechado", ben.find(b => b.nb === "1234567890").ab && !ben.find(b => b.nb === "1234567892").ab);
  const an = await p.evaluate(() => {
    const lt = [ { tipo: "Empregado", origem: "ANTIGA", inicio: "01/03/2000", aberto: true, ultRemun: "03/2002", comps: [{ c: "03/2002", v: 900 }] },
      { tipo: "Empregado", origem: "ATUAL", inicio: "15/04/2024", aberto: true, ultRemun: "", comps: [{ c: "08/2026", v: 2000 }, { c: "09/2026", v: 2000 }] },
      { tipo: "Benefício", especie: "42", origem: "APOSENTADORIA", nb: "1", inicio: "", fim: "", situacao: "INDEFERIDO", aberto: false } ];
    const a = analisarCnis({ linhaDoTempo: lt }, "2026-10-10");
    return { agora: a.agora.origem, ativos: a.benefAtivos.length, fimAntigo: (a.abertos.find(v => v.origem === "ANTIGA") || {}).fimPresumido };
  });
  conf("o vínculo de hoje é o de remuneração recente, não o primeiro aberto da lista", an.agora === "ATUAL" && an.fimAntigo === "31/03/2002");
  conf("o indeferido não conta como benefício ativo", an.ativos === 0);
  const gr = await p.evaluate(() => calcularGraca([{ tipo: "Empregado", origem: "ANTIGA", inicio: "01/03/2000", fim: "", ultRemun: "03/2002", aberto: true }], 30, false));
  conf("a qualidade de segurado conta da última remuneração, não de hoje", gr.ultima === "03/2002" && gr.fim === "03/2003" && gr.premissas.some(x => /último dia do mês da última remuneração/.test(x)));

  // 5 · a declaração do dossiê, lida sozinha ao abrir a ficha; o CNIS do
  // dossiê é mais antigo que o já lido e por isso ficou de fora
  const triA = auto.filter(e => e.m === "PATCH" && /\/rest\/v1\/clientes/.test(e.u)).map(e => e.corpo.triagem).filter(Boolean).pop() || {};
  conf("a declaração do dossiê é lida como automática", ((triA.pdf || {}).declaracao || {}).auto === true && (triA.pdf.declaracao.beneficios || []).length > 0);
  conf("o CNIS do dossiê mais antigo que o lido não substitui o lido", ((triA.pdf || {}).cnis || {}).em === "2026-10-10" && !((triA.pdf || {}).cnis || {}).anexo_id);
  conf("o NB lido não entra no caso sem o clique", !auto.some(e => e.m === "PATCH" && /\/rest\/v1\/casos/.test(e.u)));
  conf("o andamento diz que a declaração veio do dossiê", auto.some(e => e.m === "POST" && /andamentos/.test(e.u) && /^Declaração de Benefícios do dossiê lida pelo CRM/.test(e.corpo.texto || "")));

  // 6 · o quadro "O que o dossiê já diz" na Análise, com o NB a gravar
  await p.evaluate(() => { abaAtiva = 0; subCad = "direito"; repintarFicha(); });
  await p.waitForSelector(".ad-q-dossie");
  const q = await p.textContent(".ad-q-dossie");
  conf("o quadro traz os vínculos sem saída e o NB da declaração", /3 vínculos sem data de saída/.test(q) && /lido da declaração de benefícios/.test(q));
  escritos.length = 0;
  await p.click('.ad-q-dossie li[data-fato="nb"] button');
  await p.waitForTimeout(300);
  const nb = escritos.find(e => e.m === "PATCH" && /\/rest\/v1\/casos\?id=eq\./.test(e.u));
  conf("o clique grava o NB no caso e lança o andamento", nb && /^\d{3}\.\d{3}\.\d{3}-\d$/.test(nb.corpo.nb) && escritos.some(e => e.m === "POST" && /andamentos/.test(e.u) && /declaração de benefícios do dossiê/.test(e.corpo.texto || "")));

  // 7 · o CNIS do dossiê mais novo que o lido passa pelo leitor, uma vez
  escritos.length = 0;
  await p.evaluate(cli => { D.anexos.find(a => /CNIS completo/.test(a.nome)).criado_em = "2026-10-11T09:00:00Z"; return lerLeitoresDoDossie(cli); }, CLI_CHEIO);
  const triB = escritos.filter(e => e.m === "PATCH" && /\/rest\/v1\/clientes/.test(e.u)).map(e => e.corpo.triagem).filter(Boolean).pop() || {};
  conf("o CNIS do dossiê é lido e fica ligado ao anexo", ((triB.pdf || {}).cnis || {}).anexo_id === "a1000000-0000-0000-0000-000000000003");
  conf("o andamento diz que o CNIS veio do dossiê", escritos.some(e => e.m === "POST" && /andamentos/.test(e.u) && /^CNIS do dossiê lido pelo CRM/.test(e.corpo.texto || "")));
  escritos.length = 0;
  await p.evaluate(cli => lerLeitoresDoDossie(cli), CLI_CHEIO);
  conf("abrir de novo não relê o mesmo anexo", !escritos.some(e => /clientes|andamentos/.test(e.u)));

  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
