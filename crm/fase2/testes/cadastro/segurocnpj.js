// Dossiê 0.6.2 e 0.7.1 no CRM — o seguro-desemprego ao lado da qualidade de
// segurado, e os CNPJs em nome do cliente com a consulta à base pública.
// O seguro-desemprego RECEBIDO dentro da graça prova o desemprego e acresce
// 12 meses ao prazo do inciso II, que continua contado da última competência
// (IN 128, art. 184, §§ 2º e 5º). O texto do seguro sai da própria função da
// extensão (regras.js), para o teste pegar a mudança de formato dos dois lados.
// Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1 } = require("./fixturas");
const R = require("../../dossie/regras.js");
const SUPA = "https://ficticio.supabase.co";

// o que textoDoDocumento faz com o .txt antes de gravar o texto no anexo
const comoLido = t => t.replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
const req = (n, data, dispensa, parcelas, extra = {}) => ({ numeroRequerimento: n, modalidade: { codigo: 0, descricao: "Trabalhador Formal" },
  dataRequerimento: data, tipoInscricao: { codigo: 1, descricao: "CNPJ" }, inscricao: 11444777000161,
  razaoSocial: "CONFECCOES FICTICIAS LTDA", dataAdmissao: "2011-02-01", dataDispensa: dispensa,
  detalhe: { situacao: { descricao: "DEFERIDO" }, parcelas: parcelas.map(([d, sit], i) =>
    ({ numeroParcela: i + 1, dataLiberacao: d, dataPagamento: d, valorParcela: 1412, situacaoParcela: sit || "PAGA" })) }, ...extra });
const SD_TEXTO = comoLido(R.textoSeguroDesemprego([
  req(111, "2015-04-20", "2015-04-02", [["2015-05-20"], ["2015-06-20"], ["2015-07-20"]]),
  req(222, "2019-10-15", "2019-09-30", [["2019-11-05"], ["2019-12-05"], ["2020-01-05"], ["2020-02-05"], ["2020-03-05", "CANCELADA"]]),
  { numeroRequerimento: 333, modalidade: { codigo: 0, descricao: "Trabalhador Formal" }, dataRequerimento: "2021-01-10", detalhe_erro: "HTTP 500" },
]));
// o .txt da Redesim, como o redesim.js monta (texto()): um bloco por CNPJ
const CNPJ_TEXTO = comoLido([
  "CNPJs VINCULADOS AO CPF (Redesim · Minhas Empresas) — MARLENE FICTA RAMOS", "Consulta em 08/10/2026", "",
  "CNPJ 12.345.678/0001-95 · MARLENE FICTA RAMOS 52998224725 (fantasia: ATELIE FICTICIO)",
  "  Situação cadastral: ATIVA · MATRIZ · MONTE ALTO/SP",
  "  Vínculo do CPF: TITULAR · qualificação: 50 - Empresário", "",
  "CNPJ 11.444.777/0001-61 · FICTICIA COMERCIO LTDA",
  "  Situação cadastral: BAIXADA · MATRIZ · TAQUARITINGA/SP",
  "  Vínculo do CPF: SÓCIO · qualificação: 49 - Sócio-Administrador",
  "  Capital social: 10000", "", "",
  "--- dados brutos do portal ---", "[]"].join("\n"));
const WS_MEI = { razao_social: "MARLENE FICTA RAMOS 52998224725", capital_social: "1000.00",
  natureza_juridica: { id: "2135", descricao: "Empresário (Individual)" },
  simples: { simples: "Sim", data_opcao_simples: "2026-05-05", data_exclusao_simples: null, simei: "Sim", data_opcao_simei: "2026-05-05", data_exclusao_simei: null },
  estabelecimento: { cnpj: "12345678000195", tipo: "Matriz", situacao_cadastral: "Ativa", data_situacao_cadastral: "2026-05-05",
    data_inicio_atividade: "2026-05-05", atividade_principal: { id: "4781400", subclasse: "4781-4/00", descricao: "Comércio varejista de artigos do vestuário e acessórios" } } };

const AN = (n, nome, texto) => ({ id: `a8000000-0000-0000-0000-00000000000${n}`, cliente_id: CLI_CHEIO, caso_id: null, origem: "dossie", nome,
  caminho: `dossie/52998224725/${n}.txt`, tipo: "text/plain", tamanho: texto.length, texto, paginas: 0, paginas_imagem: [], criado_em: "2026-10-08T12:00:00Z" });
FIX.anexos = [
  AN(1, "CTPS RAIS CAGED · Seguro-desemprego requerimentos e parcelas.txt", SD_TEXTO),
  AN(2, "CNPJ · CNPJs vinculados ao CPF (Redesim).txt", CNPJ_TEXTO),
];
// o CNIS já lido: CLT de 02/2011 a 30/09/2019, 104 contribuições
const CNIS = { em: "2026-10-08", paginas: 3, qtVinculos: 1, nits: [], indicadores: [], contribSemPerda: 104,
  vinculos: [{ seq: 1, tipo: "Empregado", origem: "CONFECCOES FICTICIAS LTDA", codigo: "11.444.777/0001-61", inicio: "01/02/2011", fim: "30/09/2019",
    ultRemun: "09/2019", aberto: false, indicadores: [] }],
  analise: { abertos: [], errosEmp: [], abaixo: [], mesAnt: "09/2026", agora: { tipo: "sem", ultima: { comp: "09/2019", tipo: "Empregado" } },
    benefAtivos: [], qtComps: 104, contagem: { periodos: [["2011-02", "2019-09"]], carencia: 104, anos: 8, meses: 8 } } };
FIX.clientes[0] = { ...FIX.clientes[0], cpf: "52998224725", dossie: {}, triagem: { pdf: { cnis: CNIS } } };
FIX.casos[0] = { ...FIX.casos[0], titulo: "Auxílio por incapacidade temporária", beneficio: "Auxílio por incapacidade temporária",
  especie: "B31", nb: null, dcb: null, prazo: null };

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
  // a base pública do CNPJ: o MEI responde; o outro bate no limite de consultas
  const consultas = [];
  await ctx.route(/publica\.cnpj\.ws/, rota => {
    const u = rota.request().url(); consultas.push(u);
    const cors = { "Access-Control-Allow-Origin": "*" };
    if (/12345678000195$/.test(u)) return rota.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify(WS_MEI) });
    return rota.fulfill({ status: 429, headers: cors, contentType: "application/json", body: "{}" });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);

  // 1 · os leitores, sobre o texto que a extensão monta
  const sd = await p.evaluate(t => lerSeguroDesempregoTexto(t), SD_TEXTO);
  conf("três requerimentos, com número, data, dispensa e empregador", sd.length === 3 && sd[1].numero === "222" && sd[1].data === "15/10/2019"
    && sd[1].dispensa === "30/09/2019" && sd[1].empregador === "CONFECCOES FICTICIAS LTDA" && sd[1].situacao === "DEFERIDO");
  conf("as parcelas saem com a data e a situação", sd[1].parcelas.length === 5 && sd[1].parcelas[0].pagamento === "05/11/2019"
    && sd[1].parcelas[4].situacao === "CANCELADA" && sd[2].parcelas.length === 0);
  conf("o JSON cru do pé não vira requerimento", !(await p.evaluate(t => lerSeguroDesempregoTexto(t + '\n"Requerimento 999 · modalidade X"'), SD_TEXTO)).some(x => x.numero === "999"));
  const cn = await p.evaluate(t => lerCnpjsTexto(t), CNPJ_TEXTO);
  conf("dois CNPJs da Redesim, com situação, local e vínculo do CPF", cn.consulta === "08/10/2026" && cn.cnpjs.length === 2
    && cn.cnpjs[0].cnpj === "12.345.678/0001-95" && cn.cnpjs[0].fantasia === "ATELIE FICTICIO" && cn.cnpjs[0].situacao === "ATIVA"
    && cn.cnpjs[0].local === "MONTE ALTO/SP" && cn.cnpjs[0].vinculo === "TITULAR" && cn.cnpjs[0].qualificacao === "50 - Empresário"
    && cn.cnpjs[1].situacao === "BAIXADA" && cn.cnpjs[1].capital === "10000");
  const vazio = await p.evaluate(() => lerCnpjsTexto("CNPJs VINCULADOS AO CPF (Redesim · Minhas Empresas) — X\nConsulta em 08/10/2026\nNenhum CNPJ vinculado a este CPF na data da consulta."));
  conf("a lista vazia é lida como lista vazia", vazio && vazio.cnpjs.length === 0 && vazio.consulta === "08/10/2026");

  // 2 · a conta da graça com o seguro-desemprego
  const contas = await p.evaluate(([t]) => {
    const seg = lerSeguroDesempregoTexto(t).map(x => ({ ...x, anexo: { id: "a1" } }));
    const emp = { tipo: "Empregado", origem: "X", inicio: "01/02/2011", fim: "30/09/2019", ultRemun: "09/2019" };
    const fac = { tipo: "Facultativo", origem: "", inicio: "01/02/2011", fim: "30/09/2019" };
    const so = (...ns) => seg.filter(x => ns.includes(x.numero));
    return {
      sem: calcularGraca([emp], 104, false, [], [], []),
      com: calcularGraca([emp], 104, false, [], [], seg),
      manualEsd: calcularGraca([emp], 104, true, [], [], seg),
      antigo: calcularGraca([emp], 104, false, [], [], so("111", "333")),
      fac: calcularGraca([fac], 104, false, [], [], seg),
      depois: calcularGraca([{ ...emp, fim: "31/12/2021", ultRemun: "12/2021" }], 104, false, [], [], seg),
    };
  }, [SD_TEXTO]);
  conf("sem o seguro, 12 meses: a qualidade vai até 16/11/2020", contas.sem.base === 12 && contas.sem.mantidaAte === "2020-11-16" && !contas.sem.seguro);
  conf("com o seguro recebido na graça, 24 meses: vai até 16/11/2021, contados da última competência", contas.com.base === 24
    && contas.com.mantidaAte === "2021-11-16" && contas.com.fim === "09/2021" && contas.com.seguro && contas.com.seguro.numero === "222"
    && contas.com.desempregado === true);
  conf("a premissa diz a dispensa, a primeira parcela recebida e o § 5º", contas.com.premissas.some(x =>
    /seguro-desemprego da dispensa de 30\/09\/2019 teve parcela recebida em 05\/11\/2019, dentro da graça \(IN 128, art\. 184, § 5º\)/.test(x)));
  conf("a parcela cancelada não conta", contas.com.seguro.dentro.length === 4);
  conf("a marca manual e o seguro não somam 24 meses a mais", contas.manualEsd.base === 24);
  conf("o seguro de uma dispensa antiga, e o sem parcela, não provam o desemprego de agora", contas.antigo.base === 12 && !contas.antigo.seguro);
  conf("o facultativo não ganha os 12 meses do § 5º", contas.fac.base === 6 && !contas.fac.seguro);
  conf("o seguro recebido antes da última competência não prova a saída seguinte", contas.depois.base === 12 && !contas.depois.seguro);
  const fatos = await p.evaluate(([t]) => {
    const seg = lerSeguroDesempregoTexto(t).map(x => ({ ...x, anexo: { id: "a1" } })), dois = seg.slice(0, 2);
    const emp = { tipo: "Empregado", origem: "X", inicio: "01/02/2011", fim: "31/12/2021", ultRemun: "12/2021" };
    const gr = calcularGraca([emp], 104, false, [], [], seg);
    return { fora: fatoSeguro(calcularGraca([emp], 104, false, [], [], dois), dois), semParcela: fatoSeguro(gr, seg), semCnis: fatoSeguro(null, seg) };
  }, [SD_TEXTO]);
  conf("fora da graça, o fato diz por quê, com o período da conta", fatos.fora.est === "info"
    && /^Seguro-desemprego da dispensa de 30\/09\/2019 por CONFECCOES FICTICIAS LTDA: 4 parcelas recebidas, de 05\/11\/2019 a 05\/02\/2020; fora da graça desta conta, que corre de 01\/2022 a 15\/02\/2023, e não acresce os 12 meses$/.test(fatos.fora.texto));
  conf("o requerimento mais recente sem parcela não prova o desemprego", /^Seguro-desemprego requerido em 10\/01\/2021: nenhuma parcela recebida; não prova o desemprego$/.test(fatos.semParcela.texto));
  conf("sem CNIS lido, o fato só descreve o seguro mais recente", fatos.semCnis.est === "info"
    && /^Seguro-desemprego requerido em 10\/01\/2021: nenhuma parcela recebida$/.test(fatos.semCnis.texto));

  // 3 · na ficha: o mapa da incapacidade, ramo da qualidade
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForFunction(() => D._ficha && D._ficha.cliId && !_lendoDossie && !_lendoLeitores, null, { timeout: 10000 });
  await p.evaluate(() => { abaAtiva = 0; irSubCad("mapa"); });
  await p.waitForSelector(".mapa-arvore");
  await p.click('.mapa-ramo[data-ramo="inc_qualidade"] .mapa-no');
  await p.waitForSelector('.mapa-ramo[data-ramo="inc_qualidade"].aberto + .mapa-fatos');
  let fx = await p.textContent(".mapa-fatos");
  conf("a qualidade do mapa já conta o seguro-desemprego", /Qualidade mantida até 16\/11\/2021, perdida em 17\/11\/2021 \(24 meses a partir de 09\/2019\)/.test(fx));
  conf("o seguro-desemprego fica junto da qualidade, com a fonte e o documento", /Seguro-desemprego da dispensa de 30\/09\/2019 por CONFECCOES FICTICIAS LTDA: 4 parcelas recebidas, de 05\/11\/2019 a 05\/02\/2020, dentro da graça; prova o desemprego e acresce 12 meses/.test(fx)
    && await p.$$eval(".mapa-fatos .mapa-lista li", ls => ls.some(l => /Seguro-desemprego/.test(l.querySelector(".dossie-orig").textContent) && l.querySelector(".adr-link"))));

  // 4 · os CNPJs, entre os outros fatos da incapacidade, com a consulta no clique
  await p.click('.mapa-ramo[data-ramo="outros"] .mapa-no');
  await p.waitForSelector('.mapa-ramo[data-ramo="outros"].aberto + .mapa-fatos');
  fx = await p.textContent(".mapa-fatos");
  conf("os dois CNPJs aparecem com situação, local e vínculo", /CNPJ 12\.345\.678\/0001-95, MARLENE FICTA RAMOS 52998224725: ativa, em MONTE ALTO\/SP; o CPF é titular \(50 - empresário\)/.test(fx)
    && /CNPJ 11\.444\.777\/0001-61, FICTICIA COMERCIO LTDA: baixada/.test(fx));
  conf("nenhuma consulta sai sem o clique", consultas.length === 0);
  const botao = n => p.$$eval(".mapa-fatos .mapa-lista li", (ls, n) => { const l = ls.filter(x => /CNPJ \d/.test(x.textContent))[n]; const b = l && l.querySelector("button.tl-bt"); return b ? b.textContent.trim() : ""; }, n);
  conf("cada CNPJ tem o botão de consulta", await botao(0) === "Consultar abertura, MEI e CNAE" && await botao(1) === "Consultar abertura, MEI e CNAE");
  await p.$$eval(".mapa-fatos .mapa-lista li", ls => ls.filter(x => /CNPJ \d/.test(x.textContent))[0].querySelector("button.tl-bt").click());
  await p.waitForFunction(() => /aberto em 05\/05\/2026/.test(document.querySelector(".mapa-fatos").textContent), null, { timeout: 5000 });
  fx = await p.textContent(".mapa-fatos");
  conf("a consulta traz abertura, situação, MEI, CNAE e natureza", /aberto em 05\/05\/2026; situação ativa desde 05\/05\/2026; MEI desde 05\/05\/2026, sem exclusão; CNAE 4781-4\/00 \(comércio varejista de artigos do vestuário e acessórios\); empresário \(individual\)/.test(fx));
  conf("consultado, o botão sai", await botao(0) === "");
  conf("só o número do CNPJ vai à base pública, no caminho e sem parâmetro", consultas.length === 1 && consultas[0] === "https://publica.cnpj.ws/cnpj/12345678000195");
  await p.$$eval(".mapa-fatos .mapa-lista li", ls => ls.filter(x => /CNPJ \d/.test(x.textContent))[1].querySelector("button.tl-bt").click());
  await p.waitForFunction(() => /limitou as consultas/.test(document.querySelector(".mapa-fatos").textContent), null, { timeout: 5000 });
  conf("o limite da base vira aviso e o botão chama de novo", await botao(1) === "Consultar de novo");

  // 5 · na lente rural, o CNPJ entra na prova do segurado especial
  await p.evaluate(cli => mapaLente(cli, "rural"), CLI_CHEIO);
  await p.waitForSelector('.mapa-ramo[data-ramo="rur_prova"]');
  await p.click('.mapa-ramo[data-ramo="rur_prova"] .mapa-no');
  await p.waitForSelector('.mapa-ramo[data-ramo="rur_prova"].aberto + .mapa-fatos');
  conf("no rural, o CNPJ ativo deixa a prova em atenção", /CNPJ 12\.345\.678\/0001-95/.test(await p.textContent(".mapa-fatos"))
    && await p.$eval('.mapa-ramo[data-ramo="rur_prova"]', e => e.classList.contains("est-warn")));

  // 6 · na aba Lembretes, a conta mostra o seguro e dispensa a marca manual
  await p.evaluate(([cli, caso]) => { casoSel = caso; const m = document.getElementById("modal"); if (m) m.innerHTML = ""; pintarFicha(); }, [CLI_CHEIO, CASO1]);
  await p.waitForSelector('button.mt[data-vv="9"]');
  await p.click('button.mt[data-vv="9"]');
  await p.waitForSelector(".conta-cx .conta-linha.sd");
  const cx = await p.textContent(".conta-cx");
  conf("a conta dos Lembretes traz a qualidade com o seguro e o documento", /Qualidade mantida até 16\/11\/2021/.test(cx)
    && /Seguro-desemprego da dispensa de 30\/09\/2019/.test(cx) && !!(await p.$(".conta-cx .conta-linha.sd .adr-link")));
  conf("com o seguro provado, a marca manual do desemprego sai", !(await p.$('.conta-cx input[type="checkbox"]')));

  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
