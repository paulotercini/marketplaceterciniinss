// F20 — a aba de Lembretes reorganizada, e a conta do período de graça.
//
// A aba é sobre DATA QUE CHEGA. Na ordem que o Paulo pediu: aposentadoria
// provável no topo, os lembretes, um botão só para criar, e no pé as contas
// que decidem prazo.
//
// A conta do período de graça é a parte delicada. Qualidade de segurado é
// conclusão jurídica, não campo de documento: o CRM faz a ARITMÉTICA e mostra
// de onde tirou cada número. O texto da lei foi conferido no Planalto em
// 16.08.2026 — e derrubou duas coisas que eu tinha escrito de memória:
//   · o FACULTATIVO tem 6 meses, não 12 (art. 15, VI)
//   · o prazo conta também da cessação de BENEFÍCIO por incapacidade
//     (art. 13, II do Decreto 3.048/99), não só das contribuições
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const { ITENS_CNIS } = require("./fixt-pdf");
const SUPA = "https://ficticio.supabase.co";

FIX.clientes[0] = { ...FIX.clientes[0], cpf: "52998224725" };

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
  const escritos = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      escritos.push({ m, t, corpo: JSON.parse(rota.request().postData() || "{}") });
      return rota.fulfill({ status: 204, body: "" });
    }
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error") erros.push("console: " + m.text()); });
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);

  // ── 1. a aritmética, caso a caso ────────────────────────────────────────
  const V = (tipo, inicio, fim, extra) => ({ tipo, origem: "X", inicio, fim: fim || "",
    aberto: !fim, ...(extra || {}) });
  const g = await p.evaluate(([vs, n, d]) => calcularGraca(vs, n, d), [[], 0, false]);
  conf("sem vínculo nenhum, não inventa conta", g === null);

  const cenarios = await p.evaluate(V => {
    const emp = t => ({ tipo: "Empregado ou Agente Público", origem: "X", ...t });
    const fac = t => ({ tipo: "Facultativo", origem: "RECOLHIMENTO", ...t });
    const ben = t => ({ tipo: "Benefício", origem: "AUXILIO DOENCA PREVIDENCIARIO",
      especie: "31", ...t });
    return {
      // empregado comum, poucas contribuições: 12 meses do art. 15, II
      empregado: calcularGraca([emp({ inicio: "01/01/2020", fim: "15/03/2024" })], 40, false),
      // FACULTATIVO: 6 meses do art. 15, VI — é o que mais engana
      facultativo: calcularGraca([fac({ inicio: "01/01/2023", fim: "31/05/2024" })], 40, false),
      // mais de 120 contribuições: 24 meses do §1º
      mais120: calcularGraca([emp({ inicio: "01/01/2000", fim: "15/03/2024" })], 200, false),
      // facultativo com mais de 120: o §1º prorroga o inciso II, não o VI
      facMais120: calcularGraca([fac({ inicio: "01/01/2000", fim: "31/05/2024" })], 200, false),
      // desemprego: mais 12 do §2º
      desempregado: calcularGraca([emp({ inicio: "01/01/2020", fim: "15/03/2024" })], 40, true),
      // cessação de BENEFÍCIO conta como marco (art. 13, II do Decreto)
      aposBeneficio: calcularGraca([emp({ inicio: "01/01/2015", fim: "10/02/2022" }),
        ben({ inicio: "11/02/2022", fim: "20/07/2024" })], 40, false),
      // benefício em manutenção: sem limite de prazo (art. 15, I)
      emGozo: calcularGraca([emp({ inicio: "01/01/2015", fim: "10/02/2022" }),
        ben({ inicio: "11/02/2022", fim: "", aberto: true })], 40, false),
      // auxílio-acidente é a exceção do inciso I e NÃO segura a qualidade
      soAcidente: calcularGraca([emp({ inicio: "01/01/2015", fim: "10/02/2022" }),
        ben({ inicio: "11/02/2022", fim: "", aberto: true, especie: "94",
          origem: "AUXILIO ACIDENTE PREVIDENCIARIO" })], 40, false),
    };
  }, null);
  const c = cenarios;
  conf(`empregado: 12 meses (base ${c.empregado.base}, de ${c.empregado.ultima} até ${c.empregado.fim})`,
    c.empregado.base === 12 && c.empregado.ultima === "03/2024" && c.empregado.fim === "03/2025");
  conf(`FACULTATIVO: 6 meses, não 12 (base ${c.facultativo.base}, até ${c.facultativo.fim})`,
    c.facultativo.base === 6 && c.facultativo.fim === "11/2024");
  conf("e a tela explica por quê, citando o inciso VI",
    c.facultativo.premissas.some(x => /FACULTATIVO/.test(x) && /art\. 15, VI/.test(x) && /6 meses/.test(x)));
  conf(`mais de 120 contribuições: 24 meses (base ${c.mais120.base}, até ${c.mais120.fim})`,
    c.mais120.base === 24 && c.mais120.fim === "03/2026" && c.mais120.mais120 === true);
  conf("e avisa que a prorrogação do §1º tem condição que ninguém lê sozinho",
    c.mais120.premissas.some(x => /sem perda|interrupção/.test(x)));
  conf(`facultativo com 200 contribuições continua em 6 meses (base ${c.facMais120.base})`,
    c.facMais120.base === 6);
  conf("e diz que o §1º prorroga o inciso II, e o facultativo está no VI",
    c.facMais120.premissas.some(x => /inciso II/.test(x) && /inciso VI/.test(x)));
  conf(`desemprego soma 12 do §2º (base ${c.desempregado.base}, até ${c.desempregado.fim})`,
    c.desempregado.base === 24 && c.desempregado.fim === "03/2026");
  conf("e deixa claro que a prova do desemprego não está no extrato",
    c.desempregado.premissas.some(x => /prova/.test(x) && /não está no extrato/.test(x)));
  conf(`a cessação de benefício é o marco (última ${c.aposBeneficio.ultima}, até ${c.aposBeneficio.fim})`,
    c.aposBeneficio.ultima === "07/2024" && c.aposBeneficio.fim === "07/2025"
    && c.aposBeneficio.premissas.some(x => /cessação de benefício/.test(x) && /art\. 13, II/.test(x)));
  conf("benefício em manutenção: sem limite de prazo (art. 15, I)",
    c.emGozo.semLimite === true && !c.emGozo.fim
    && c.emGozo.premissas.some(x => /art\. 15, I/.test(x)));
  conf(`auxílio-acidente NÃO segura a qualidade (é a exceção do inciso I) — base ${c.soAcidente.base}`,
    !c.soAcidente.semLimite && c.soAcidente.base > 0);
  conf(`a fonte é nomeada (${await p.evaluate(() => GRACA_FONTE)})`,
    /Lei 8\.213\/91, art\. 15/.test(await p.evaluate(() => GRACA_FONTE))
    && /Decreto 3\.048\/99/.test(await p.evaluate(() => GRACA_FONTE)));

  // a competência-limite e o DIA: a perda é no dia seguinte ao vencimento da
  // contribuição da competência seguinte ao fim do prazo (art. 15, § 4º, da Lei
  // 8.213/91 e art. 14 do Decreto 3.048/99), dia 15 ou o dia útil bancário seguinte
  conf("a conta entrega a competência-limite (MM/AAAA)",
    Object.values(c).every(x => !x.fim || /^\d{2}\/\d{4}$/.test(x.fim)));
  conf(`empregado: mantida até ${c.empregado.mantidaAte}, perda em ${c.empregado.perda}`,
    c.empregado.mantidaAte === "2025-05-15" && c.empregado.perda === "2025-05-16" && c.empregado.vencida === true);
  conf(`facultativo: mantida até ${c.facultativo.mantidaAte}`, c.facultativo.mantidaAte === "2025-01-15" && c.facultativo.perda === "2025-01-16");
  conf(`24 meses: mantida até ${c.mais120.mantidaAte}`, c.mais120.mantidaAte === "2026-05-15" && c.mais120.perda === "2026-05-16");
  const perdas = await p.evaluate(() => ["07/2024", "12/2024", "09/2023", "12/2020"].map(x => perdaDaQualidade(x)));
  conf(`dia 15 no domingo passa à segunda (${perdas[0].mantidaAte})`, perdas[0].mantidaAte === "2024-09-16" && perdas[0].perda === "2024-09-17");
  conf(`dia 15 no sábado passa à segunda (${perdas[1].mantidaAte})`, perdas[1].mantidaAte === "2025-02-17" && perdas[1].perda === "2025-02-18");
  conf(`dia 15 no feriado nacional passa ao dia útil seguinte (${perdas[2].mantidaAte})`, perdas[2].mantidaAte === "2023-11-16" && perdas[2].perda === "2023-11-17");
  conf(`dia 15 na segunda de carnaval passa à quarta de cinzas (${perdas[3].mantidaAte})`, perdas[3].mantidaAte === "2021-02-17" && perdas[3].perda === "2021-02-18");

  // § 1º: as mais de 120 contribuições contam sem perda da qualidade no meio
  // (IN 128, art. 184, § 4º); o benefício mantém a qualidade sem somar
  const seguidas = await p.evaluate(() => {
    const m = pares => new Map(pares.map(([k, conta, fac]) => [k, { conta, fac: !!fac }]));
    const meses = (a, b, conta, fac) => { const xs = []; percorrerMeses(a, b, k => xs.push([k, conta, fac])); return xs; };
    return {
      lacuna: contarSemPerda(m([...meses("2010-01", "2010-12", true), ...meses("2012-06", "2012-08", true)])),
      noPrazo: contarSemPerda(m([...meses("2010-01", "2010-12", true), ...meses("2012-01", "2012-03", true)])),
      beneficio: contarSemPerda(m([...meses("2010-01", "2010-06", true), ...meses("2010-07", "2013-06", false), ...meses("2013-07", "2013-09", true)])),
      facLonge: contarSemPerda(m([...meses("2015-01", "2015-03", true, true), ...meses("2015-11", "2015-12", true)])),
      facPerto: contarSemPerda(m([...meses("2015-01", "2015-03", true, true), ...meses("2015-10", "2015-12", true)])),
      mais120: contarSemPerda(m([...meses("2000-01", "2010-01", true), ...meses("2011-10", "2011-12", true)])),
    };
  });
  conf(`a lacuna maior que a graça zera a conta (${seguidas.lacuna})`, seguidas.lacuna === 3);
  conf(`a lacuna de 12 meses ainda está na graça (${seguidas.noPrazo})`, seguidas.noPrazo === 15);
  conf(`o benefício mantém a qualidade sem somar (${seguidas.beneficio})`, seguidas.beneficio === 9);
  conf(`depois do facultativo, a graça é de 6 meses (${seguidas.facLonge} e ${seguidas.facPerto})`, seguidas.facLonge === 2 && seguidas.facPerto === 6);
  conf(`com mais de 120, a lacuna de 20 meses não zera (${seguidas.mais120})`, seguidas.mais120 === 124);

  // § 2º da IN 128, art. 184: a competência abaixo do mínimo não abre a graça;
  // complementada (art. 19-E do Decreto), leva a graça adiante
  const abx = await p.evaluate(() => calcularGraca([{ tipo: "Empregado ou Agente Público", origem: "X", inicio: "01/01/2020", fim: "15/03/2024" }],
    40, false, [{ comp: "03/2024", valor: 1000, minimo: 1412 }]));
  conf(`a competência abaixo do mínimo recua a graça (${abx.ultima}, mantida até ${abx.mantidaAte})`,
    abx.ultima === "02/2024" && abx.mantidaAte === "2025-04-15" && abx.perda === "2025-04-16");
  // o contribuinte individual com lacuna: o recuo para no último mês contado,
  // e não no mês vazio logo antes da competência abaixo do mínimo
  const ci = await p.evaluate(() => {
    const vs = [{ tipo: "Contribuinte Individual", origem: "RECOLHIMENTO", inicio: "01/01/2020", fim: "30/06/2020" }];
    const abaixo = [{ comp: "06/2020", valor: 500, minimo: 1045 }];
    return [calcularGraca(vs, 10, false, abaixo, [["2020-01", "2020-02"]]).ultima, calcularGraca(vs, 10, false, abaixo).ultima];
  });
  conf(`com lacuna, o recuo vai ao último mês contado (${ci[0]}; sem a contagem, ${ci[1]})`, ci[0] === "02/2020" && ci[1] === "05/2020");
  conf(`e a complementação leva até ${abx.complementar && abx.complementar.mantidaAte}`,
    abx.complementar && abx.complementar.comp === "03/2024" && abx.complementar.mantidaAte === "2025-05-15"
    && abx.premissas.some(x => /03\/2024 ficou abaixo do mínimo e só conta complementada; complementada, a qualidade vai até 15\/05\/2025/.test(x)));

  // aritmética de competência na virada do ano
  const vira = await p.evaluate(() => [competenciaMais("11/2024", 12), competenciaMais("12/2024", 1),
    competenciaMais("01/2025", 24), competenciaMais("06/2026", 6)]);
  conf(`a soma de meses vira o ano certo (${vira.join(", ")})`,
    JSON.stringify(vira) === JSON.stringify(["11/2025", "01/2025", "01/2027", "12/2026"]));

  // ── 2. a aba, na ordem pedida ───────────────────────────────────────────
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForTimeout(600);
  // definir abaAtiva e pintar não basta: quem marca o painel como .ativo é o
  // clique no botão da aba. Sem ele o painel existe e fica invisível.
  await p.evaluate(([cli, caso]) => { casoSel = caso;
    const m = document.getElementById("modal"); if (m) m.innerHTML = "";
    pintarFicha(); }, [CLI_CHEIO, CASO1]);
  // a aba Lembretes é a data-vv="9", não a 1: a numeração das abas não é a
  // ordem em que elas aparecem
  await p.evaluate(() => verAposFuturas(clienteAberto));   // F277 · a aba virou o quadro Aposentadoria do Cadastro, e os cards abrem numa janela
  await p.waitForSelector(".lb-novo");
  const ordem = await p.evaluate(() => {
    const painel = document.querySelector("#modal");
    const y = sel => { const e = painel.querySelector(sel); return e ? Math.round(e.getBoundingClientRect().y) : null; };
    return { apos: y(".af-todo h4"), novo: y(".lb-novo"), contas: y(".conta-cx") };   // F278 · a aposentadoria provável fica no quadro; a janela abre na lista do To Do
  });
  conf(`a janela abre na lista do Microsoft To Do (y ${ordem.apos})`, ordem.apos !== null);
  conf(`o "＋ novo lembrete" vem depois (y ${ordem.novo})`,
    ordem.novo !== null && ordem.novo > ordem.apos);
  conf(`e as contas fecham a aba (y ${ordem.contas})`,
    ordem.contas !== null && ordem.contas > ordem.novo);
  conf("o formulário de criar começa FECHADO",
    !(await p.evaluate(() => document.querySelector(".lb-novo").open)));
  // medir a altura dos CAMPOS não serve: dentro de um <details> fechado o
  // Chromium ainda devolve caixa de layout para eles. Quem diz se ocupa a tela
  // é a altura do próprio <details>.
  const altFechado = await p.evaluate(() =>
    Math.round(document.querySelector(".lb-novo").getBoundingClientRect().height));
  conf(`fechado, ocupa só a altura de um botão (${altFechado}px)`, altFechado < 60);
  const nCampos = await p.evaluate(() =>
    document.querySelectorAll(".lb-novo select, .lb-novo input").length);
  await p.click(".lb-novo summary");
  await p.waitForTimeout(250);
  const altAberto = await p.evaluate(() =>
    Math.round(document.querySelector(".lb-novo").getBoundingClientRect().height));
  conf(`clicando, as ${nCampos} opções de sempre aparecem (${altFechado}px → ${altAberto}px)`,
    nCampos >= 6 && altAberto > altFechado * 2);
  conf("e o botão de criar continua lá",
    await p.$('.lb-novo button:has-text("Criar lembrete")'));

  // ── 3. o bloco de contas ────────────────────────────────────────────────
  const semCnis = await p.innerText(".conta-cx");
  conf(`sem CNIS lido, a tela diz onde ler (${JSON.stringify(semCnis.split("\n").pop().slice(0, 40))})`,
    /Triagem/.test(semCnis) && !/Período de graça/.test(semCnis));
  await p.evaluate(([cli, it]) => gravarCnisLido(cli, lerCnisPdf(it)), [CLI_CHEIO, ITENS_CNIS]);
  await p.waitForTimeout(800);
  await p.waitForTimeout(300);
  const comCnis = await p.innerText(".conta-cx");
  conf(`com o CNIS lido, a conta aparece (${JSON.stringify((comCnis.match(/Qualidade mantida até \d{2}\/\d{2}\/\d{4}/) || [""])[0])})`,
    /Qualidade mantida até \d{2}\/\d{2}\/\d{4}/.test(comCnis) && /(perda|perdida) em \d{2}\/\d{2}\/\d{4} · \d+ meses a partir de \d{2}\/\d{4}, até a competência \d{2}\/\d{4}/.test(comCnis));
  conf("com as premissas listadas, uma a uma",
    (await p.evaluate(() => document.querySelectorAll(".conta-prem li").length)) >= 1);
  conf("e a fonte conferida, nomeada no rodapé",
    /Lei 8\.213\/91, art\. 15/.test(comCnis) && /conferidos no Planalto/.test(comCnis));
  conf("a tela explica o DIA da perda pelo art. 14 do Decreto",
    /art\. 14 do Decreto 3\.048\/99/.test(comCnis) && /dia 15 ou o dia útil seguinte/.test(comCnis));
  conf("e diz que a conclusão é de quem atende", /quem conclui é você/.test(comCnis));
  conf("tem a ligação para a calculadora do site interno",
    await p.$('.conta-acao a[href*="advprevidenciaria"]'));

  // o desemprego é decisão de quem atende, e fica gravado
  escritos.length = 0;
  await p.click('#modal .conta-ck input');
  await p.waitForTimeout(700);
  const pat = escritos.find(x => x.m === "PATCH" && x.t === "clientes");
  conf("marcar desemprego grava na triagem, com autor e data",
    pat && pat.corpo.triagem.graca && pat.corpo.triagem.graca.desempregado === true
    && pat.corpo.triagem.graca.quem === EU);
  await p.waitForTimeout(300);
  const depois = await p.innerText(".conta-cx");
  conf("e a conta refaz na hora, com a premissa nova",
    /§2º|desemprego/.test(depois) && depois !== comCnis);
  await (await p.$(".conta-cx")).screenshot({ path: path.join(__dirname, "f20-contas.png") });
  await p.evaluate(() => { const d = document.querySelector(".lb-novo"); if (d) d.open = false; });
  await p.waitForTimeout(200);
  const painel = await p.$("#modal .modal-cx") || await p.$(".painel.ativo");
  if (painel) await painel.screenshot({ path: path.join(__dirname, "f20-lembretes.png") });

  console.log("=== lembretes e período de graça (F20) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
