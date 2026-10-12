// F196 · o painel do primeiro atendimento, como no protótipo aprovado;
// antes, F195: cada ponto do mapa vai ou não à
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
const CNIS = { em: "2026-10-08", nome: "Fulana Ficticia de Tal Souza", paginas: 3, qtVinculos: 1, nits: [], indicadores: [], contribSemPerda: 104,
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
  await p.evaluate(() => { abaAtiva = 0; irSubCad("pa"); });
  await p.waitForSelector(".pa .pa-blocos");
  const pa = await p.evaluate(() => ({ passos: [...document.querySelectorAll(".atend-passos .pa-passo b")].map(b => b.textContent),
    blocos: [...document.querySelectorAll(".pa-bloco .pa-bloco-rot")].map(b => b.textContent.trim()),
    cartoes: [...document.querySelectorAll(".pa-cartao-bt > b")].map(b => b.textContent.trim()),
    car: document.querySelector(".pa-bloco:nth-child(2) .pa-bloco-val").textContent, tl: !!document.querySelector(".pa-tl"),
    lic: !!document.querySelector(".pa-tl-lic"), aba: [...document.querySelectorAll(".sub-menu button")].some(b => /Primeiro atendimento/.test(b.textContent)) }));
  conf("a aba Primeiro atendimento existe e abre o painel com os quatro passos", pa.aba && pa.passos.join("|") === "Identificação|Primeiro atendimento|Análise de Direito|Documentos");
  conf("o nome diferente do CNIS aparece no primeiro atendimento", /Nome diferente do CNIS/.test(await p.textContent(".pa")) && /Fulana Ficticia de Tal Souza/.test(await p.textContent(".pa-nome-dif")));
  conf("nome igual, com acento e caixa diferentes, não gera aviso", await p.evaluate(() => nomeIgual("José  da SILVA", "jose da silva") && !nomeIgual("Jose Silva", "Jose da Silva")));
  conf("F202 · a Identificação sugere o estado civil que o dossiê traz e falta no cadastro", await p.evaluate(() => {
    const c = { ...D.clientes[0], estado_civil: null, profissao: "Lavrador", campos: {} };
    D.anexos.push({ id: "a9-civ", cliente_id: c.id, origem: "dossie", nome: "Processos administrativos · pedido.pdf", texto: "Estado Civil: CASADO(A)\nEscolaridade" });
    const h = civilDoDossieCaixa(c); D.anexos.pop();
    D.anexos.push({ id: "a9-cad", cliente_id: c.id, origem: "dossie", nome: "Cadastro · Dados cadastrais (CNIS).pdf", texto: "Sexo MASCULINO Estado Civil\nData de Nascimento 01/01/1960" },
      { id: "a9-txt", cliente_id: c.id, origem: "dossie", nome: "Cadastro · Dados cadastrais (CNIS).txt", texto: "x\n--- dados brutos do portal ---\n{\"filiadoTO\":{\"sexo\":\"MASCULINO\"}}" });
    const h2 = civilDoDossieCaixa({ ...c, sexo: null, estado_civil: null, profissao: "Lavrador" }); D.anexos.splice(-2);
    window.__h2 = h2;
    return /sexo masculino/.test(h2) && !/estado civil/.test(h2) && /estado civil Casado\(a\)/.test(h) && !/profissão/.test(h) && civilDoDossieCaixa({ ...c, estado_civil: "casado" }) === "";
  }));
  const partes = await p.evaluate(async () => {
    const cid = clienteAberto, lidos = [], t0 = textoDoDocumento, api0 = api, rp0 = repintarSeLivre, lL0 = lerLeitoresDoDossie;
    const mk = (n, nome, tam) => ({ id: "dz-" + n, cliente_id: cid, origem: "dossie", nome, caminho: "dz/" + n, tamanho: tam, paginas: null, texto: null });
    const extra = [mk(1, "HC Ribeirao · exame.pdf", 10), mk(2, "Processos administrativos · pedido.pdf", 50), mk(3, "CNIS · CNIS completo.pdf", 900),
      mk(4, "Cadastro · Dados cadastrais (CNIS).txt", 5), mk(5, "Cartas de concessao · carta.pdf", 20)];
    D.anexos.push(...extra);
    textoDoDocumento = async c => { lidos.push(c); return { texto: c === "dz/2" ? "Estado Civil: CASADO(A)\nX" : "texto ficticio " + c, paginas: 1, paginas_imagem: [] }; };
    api = async (u, o) => (o && o.method === "PATCH" && /anexos/.test(u)) ? null : api0(u, o);
    repintarSeLivre = () => {}; lerLeitoresDoDossie = async () => {};
    const c = D.cliPorId.get(cid), civ = c.estado_civil; c.estado_civil = null;
    _dossieTudo.delete(cid);
    try {
      await lerTextoDoDossie(cid); const ident = lidos.join(",");
      _dossieTudo.add(cid); await lerTextoDoDossie(cid); const tudo = lidos.join(",");
      return ident + " | " + tudo;
    } finally { textoDoDocumento = t0; api = api0; repintarSeLivre = rp0; lerLeitoresDoDossie = lL0; c.estado_civil = civ;
      D.anexos = D.anexos.filter(x => !String(x.id).startsWith("dz-")); }
  });
  conf(`F203 · a ficha lê primeiro só o da Identificação, e o resto quando abre o Primeiro atendimento (${partes})`,
    partes.split(" | ")[0].startsWith("dz/4,dz/3,") && partes.split(" | ")[0].includes("dz/2") && !partes.split(" | ")[0].includes("dz/1")
    && !partes.split(" | ")[0].includes("dz/5") && /dz\/1,dz\/5$|dz\/1.*dz\/5$/.test(partes.split(" | ")[1]));
  conf("F206 · com atendimento aberto, o Primeiro atendimento abre em tela cheia, com Fechar atendimento e só as quatro abas",
    await p.evaluate(() => document.getElementById("detalhe").classList.contains("atend-tela") && /Sair do modo atendimento/.test(document.querySelector(".atend-cab").textContent) && getComputedStyle(document.querySelector(".det-topo")).display === "none"
      && [...[...document.querySelectorAll(".sub-menu")].find(m => /Identificação/.test(m.textContent)).querySelectorAll("button:not(.trilho-mais)")].every(b => /Identificação|Primeiro atendimento|Mapa|Análise|Documentos/.test(b.textContent))));
  conf("F209 · no modo atendimento, Identificação, Análise de Direito e Documentos continuam em tela cheia", await p.evaluate(async () => {
    const r = [];
    for (const v of ["identificacao", "direito", "documentos", "pa"]) { irSubCad(v); await new Promise(x => setTimeout(x, 150));
      r.push(subCad === v && document.getElementById("detalhe").classList.contains("atend-tela") && !!document.querySelector(".atend-cab")); }
    return r.every(Boolean);
  }));
  conf("a situação tem os seis blocos do desenho", pa.blocos.join("|").startsWith("Qualidade de segurado|Carência|CNIS e RAIS|CNPJs do titular|Pedidos ao INSS|Planejamento prévio"));
  conf(`os trabalhos possíveis saem do dossiê (${pa.cartoes.join(", ")})`, pa.cartoes.length > 0);
  conf("a carência mostra a contagem do CNIS", /^104 de 180$/.test(pa.car.trim()));
  conf("a qualidade abre com a linha do tempo e a licença da RAIS marcada", pa.tl && pa.lic);
  await p.click('.pa-bloco:has-text("CNIS e RAIS")'); await p.waitForTimeout(100);
  conf("o bloco CNIS e RAIS traz a licença sem remuneração, com a fonte", /licença sem remuneração/.test(await p.textContent(".pa-det")) && /RAIS de 2016/.test(await p.textContent(".pa-det")));
  await p.click(".pa-det .pa-levar-bt"); await p.waitForTimeout(100);
  conf("tirado da análise, o bloco diz que fica fora", (await p.getAttribute('.pa-bloco:has-text("CNIS e RAIS") .pa-bloco-vai', "aria-checked")) === "false" && /\d+ de \d+ blocos/.test(await p.textContent(".pa-levar-box")));
  conf("F207 · a situação fica à esquerda e os trabalhos à direita", await p.evaluate(() => document.querySelector(".pa-sit").getBoundingClientRect().left < document.querySelector(".pa-trab").getBoundingClientRect().left));
  conf("F207 · quem já é aposentado tem incapacidade e aposentadorias marcadas como impedidas", await p.evaluate(() => {
    const c = D.clientes[0], t0 = c.triagem; c.triagem = { ...t0, pdf: { ...(t0.pdf||{}), declaracao: { beneficios: [{ nb: "1234567890", especie: "APOSENTADORIA POR IDADE", situacao: "ATIVO" }] } } };
    const d = paDados(c, D.casosDoCliente.get(c.id) || []); c.triagem = t0;
    const imp = d.trabalhos.filter(t => t.impedido).map(t => t.f.chave);
    return imp.length > 0 && imp.every(k => ["incapacidade","tempo","especial","rural","b94","bpc"].includes(k)) && /aposentadoria por idade/.test(d.trabalhos.find(t=>t.impedido).impedido);
  }));
  await p.click(".pa-cartao-bt"); await p.waitForTimeout(100);
  conf("clicar no cartão destaca a situação", !!(await p.$(".pa-cartao.sel")) && !!(await p.$(".pa-chip")));
  await (await p.$(".pa")).screenshot({ path: process.env.FOTO || "/tmp/f196-pa.png" });
  const marcados = await p.$$eval(".pa-levar input", is => is.filter(i => i.checked).length);
  if (!marcados) { await p.click(".pa-levar input"); await p.waitForTimeout(100); }
  await p.click(".pa-prim"); await p.waitForSelector("#ad-novo[open] .ad-trab");
  const ad = await p.evaluate(() => ({ nav: [...document.querySelectorAll(".ad-trab button b")].map(b => b.textContent), tz: document.getElementById("ad-trazido").textContent,
    ctx: document.getElementById("ad-contexto").value, esp: document.getElementById("ad-esp").value }));
  conf("a análise abre com os trabalhos levados e os blocos, e o CNIS fora oferece levar", ad.nav.length > 0 && /Do primeiro atendimento/.test(ad.tz) && /fora da análise/.test(ad.tz));
  conf("o contexto da análise leva os blocos levados, sem o tirado", /^Primeiro atendimento, /.test(ad.ctx) && !/CNIS e RAIS \(/.test(ad.ctx));
  await p.click("#ad-trazido .ad-tz.fora button"); await p.waitForTimeout(100);
  conf("levado de volta na análise, o bloco entra", !(await p.$("#ad-trazido .ad-tz.fora")));
  await p.evaluate(() => { const d = [...document.querySelectorAll("#ad-trazido details")]; d.forEach(x => x.open = true); });
  await (await p.$("#ad-novo")).screenshot({ path: process.env.FOTO2 || "/tmp/f196-ad.png" });

  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
