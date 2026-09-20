// F10 — a sub-aba Triagem. Prova as duas metades: a leitura automática que o
// CRM faz do próprio banco, e a marcação humana que fica com autoria e data.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CLI_VAZIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

// um cliente carregado: processo judicial, recurso no CRPS, BPC com CadÚnico
// vencido, benefício em pagamento e protocolo no INSS — os cinco passos que o
// sistema responde sozinho, todos acesos ao mesmo tempo
const CLI_CHEIO2 = "c0000000-0000-0000-0000-000000000005";
FIX.clientes.push({ ...FIX.clientes[1], id: CLI_CHEIO2, nome: "Genoveva Ficticia Alves",
  cpf: "55566677788", aposentado: 1 });
FIX.casos.push(
  { ...FIX.casos[0], id: "b0000000-0000-0000-0000-00000000000a", cliente_id: CLI_CHEIO2,
    fase: "judicial", processo: "00000011420264036120", titulo: "Aposentadoria por idade rural",
    beneficio: "Aposentadoria por idade rural", protocolos: ["1234567890"] },
  { ...FIX.casos[0], id: "b0000000-0000-0000-0000-00000000000b", cliente_id: CLI_CHEIO2,
    fase: "conselho", titulo: "BPC ao idoso", beneficio: "BPC LOAS ao idoso",
    especie: "B88", crps_nups: ["44233139765202537"], cadunico: "2022-01-10", protocolos: [] },
  { ...FIX.casos[0], id: "b0000000-0000-0000-0000-00000000000c", cliente_id: CLI_CHEIO2,
    fase: "pagamento", titulo: "Auxílio-acidente", nb: "1234567890", protocolos: [] });

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
    localStorage.setItem("crm_subcad", "triagem");
  }, [SUPA, SESSAO]);
  const gravados = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      gravados.push({ tabela: t, corpo: JSON.parse(rota.request().postData() || "{}") });
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
  // o login pinta antes de carregar() terminar — espera os clientes na memória
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);

  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const abrir = async id => {
    await p.evaluate(x => abrirFicha(x), id);
    // cliente com mais de um caso ativo abre o modal "escolher processo", que
    // segura a pintura (trava conhecida, cowork/04). Escolhe o primeiro e segue.
    await p.evaluate(() => {
      const ks = D.casosDoCliente.get(clienteAberto) || [];
      if (ks.length > 1) {
        casoSel = ks[0].id;
        const m = document.getElementById("modal");
        if (m) { m.style.display = "none"; m.innerHTML = ""; }
        pintarFicha();
      }
    });
    await p.waitForSelector('button.mt[data-vv="0"]');
    await p.click('button.mt[data-vv="0"]');
    await p.evaluate(() => irSubCad("triagem"));
    await p.waitForSelector('.painel[data-p="0"].ativo .tri-passo');
    await p.waitForTimeout(250);
  };

  // F127 · a triagem passou a mostrar UM passo por vez, com o CNIS
  // respondendo os primeiros; o trilho em cima tem uma etapa por passo
  await abrir(CLI_CHEIO2);
  const trilho = () => p.evaluate(() => [...document.querySelectorAll(".tri-etapa")].map(x => x.title));
  const aberto = () => p.evaluate(() => {
    const x = document.querySelector('.painel[data-p="0"].ativo .tri-passo');
    const l = x.querySelector(".tri-leitura");
    return { tit: x.querySelector(".tri-tit b").innerText.trim(),
      leitura: l ? l.innerText.replace(/\n/g, " · ") : "",
      cor: l ? [...l.classList].filter(c => c !== "tri-leitura")[0] : "",
      marcado: (x.querySelector(".tri-e.on") || {}).textContent || "" };
  });
  const passos = await trilho();
  conf(`os nove fixos abrem o trilho, na ordem (${passos.length} no total)`,
    passos.length >= 9 && passos[0] === "CNIS" && passos[1] === "Indicadores"
    && passos[2] === "Benefício ativo" && passos[3] === "Vínculo com a Previdência hoje"
    && passos[7] === "Requerimentos anteriores" && passos[passos.length - 1] === "Conclusão");
  conf("só UM passo aparece por vez",
    (await p.evaluate(() => document.querySelectorAll('.painel[data-p="0"].ativo .tri-passo').length)) === 1);
  conf("o botão de abrir/inserir o CNIS é a primeira coisa da triagem",
    await p.evaluate(() => { const c = document.querySelector('.painel[data-p="0"].ativo .cad-cartao');
      return !!c && c.querySelector(".cnis-abrir") === c.querySelector(".cnis-abrir, .tri-passo, .tri-trilho"); }));
  conf("e logo abaixo vem o que a recepção registrou, com a espécie",
    /O que a recepção registrou/.test(await p.innerText(".tri-balcao")) && /Espécie/.test(await p.innerText(".tri-balcao")));
  let a = await aberto();
  conf(`sem CNIS, o passo 1 pede o extrato (${JSON.stringify(a.leitura.slice(0, 50))})`,
    a.tit === "CNIS" && /CNIS ainda não inserido/.test(a.leitura));

  // um extrato lido, em memória: vínculo em aberto, erro de empregador,
  // competência abaixo do mínimo, dois indicadores e um benefício ativo
  await p.evaluate(cli => {
    const lido = { paginas: 5, vinculos: 3, nits: ["123.45678.90-1"], filiado: { nit: "123.45678.90-1", cpf: "", mae: "" },
      indicadores: [{ codigo: "PREC-MENOR-MIN", descricao: "Recolhimento abaixo do valor mínimo", ocorrencias: 1 },
                    { codigo: "IEAN", descricao: "Exposição a agente nocivo informada pelo empregador", ocorrencias: 2 },
                    { codigo: "AVRC-DEF", descricao: "Acerto confirmado pelo INSS", ocorrencias: 1 }],
      linhaDoTempo: [
        { seq: 1, nit: "123.45678.90-1", tipo: "Empregado", origem: "FAZENDA FICTICIA LTDA", inicio: "01/03/2015", fim: "", aberto: true, indicadores: ["PEMP-CAD"],
          comps: [{ c: "03/2015", v: 300 }, { c: "12/2019", v: 500 }, { c: "01/2020", v: 1045 }, { c: "05/2021", v: 1100 }] },
        { seq: 2, nit: "123.45678.90-1", tipo: "Contribuinte Individual", origem: "RECOLHIMENTO", inicio: "01/01/2010", fim: "31/12/2010", aberto: false, indicadores: [],
          comps: [{ c: "06/2010", v: 400 }, { c: "07/2010", v: 510 }] },
        { seq: 3, nit: "123.45678.90-1", tipo: "Benefício", especie: "31", origem: "AUXÍLIO POR INCAPACIDADE TEMPORÁRIA", nb: "1234567890", inicio: "10/02/2024", fim: "", situacao: "ATIVO", aberto: true },
      ] };
    return gravarCnisLido(cli, lido, { id: "an000000-0000-0000-0000-000000000001", caminho: `${cli}/x-cnis.pdf` });
  }, CLI_CHEIO2);
  await p.waitForTimeout(700);
  a = await aberto();
  conf(`o passo CNIS lê o vínculo sem data fim (${JSON.stringify(a.leitura.slice(0, 60))})`,
    /1 vínculo\(s\) sem data fim/.test(a.leitura) && /FAZENDA FICTICIA/.test(a.leitura));
  conf("aponta o erro no cadastro do empregador", /Erro no cadastro do empregador/.test(a.leitura) && /PEMP-CAD/.test(a.leitura));
  const abaixo = (a.leitura.match(/\d+ competência\(s\) abaixo do salário mínimo:[^·]*/) || [""])[0];
  conf(`lista a competência abaixo do mínimo, e só a partir de 11/2019 para o empregado (${JSON.stringify(abaixo.slice(0, 60))})`,
    /^2 /.test(abaixo) && /12\/2019 \(R\$\s?500,00 de R\$\s?998,00, Empregado/.test(abaixo)
    && /06\/2010 \(R\$\s?400,00 de R\$\s?510,00, Contribuinte Individual/.test(abaixo)
    && !/03\/2015/.test(abaixo) && !/07\/2010/.test(abaixo));
  conf("a resposta pré-pronta é atenção, com o botão já marcado", a.cor === "alerta" && /atenção/.test(a.marcado));
  conf("o botão Abrir CNIS aparece com a data do extrato",
    /Abrir CNIS/.test(await p.innerText(".cnis-abrir")) && !(await p.$(".cnis-abrir.sem")));
  conf("e a Identificação ganhou o campo CNIS e os NITs",
    await p.evaluate(cli => { const c = D.cliPorId.get(cli); return /123\.45678\.90-1/.test(c.pis_nit || ((c.campos || {}).civil || {}).pis_nit || ""); }, CLI_CHEIO2));

  // Próxima: confirma o passo e abre o seguinte
  gravados.length = 0;
  await p.click(".tri-prox-bt .principal");
  await p.waitForTimeout(600);
  const g1 = gravados.filter(x => x.tabela === "clientes").pop();
  const t1 = (g1.corpo.triagem || (g1.corpo.campos || {}).triagem || {});
  conf(`Próxima grava o passo com estado, texto, quem e quando (${JSON.stringify((t1.cnis || {}).estado)})`,
    t1.cnis && t1.cnis.estado === "atencao" && t1.cnis.quem === EU && !!t1.cnis.feito && /vínculo\(s\) sem data fim/.test(t1.cnis.texto || ""));
  a = await aberto();
  conf(`e abre o passo seguinte, Indicadores (${a.tit})`, a.tit === "Indicadores");
  conf(`com a contagem por tipo (${JSON.stringify(a.leitura.slice(0, 70))})`,
    /3 indicador\(es\)/.test(a.leitura) && /1 pendência/.test(a.leitura) && /1 alerta/.test(a.leitura) && /1 acerto/.test(a.leitura));
  const legenda = await p.evaluate(() => [...document.querySelectorAll(".ind-lista li")].map(x => ({
    cls: x.className, cod: x.querySelector(".ind-cod").textContent, tipo: x.querySelector(".ind-tipo").textContent, txt: x.textContent })));
  conf("a legenda colore cada indicador: pendência, alerta, acerto",
    legenda.length === 3
    && legenda.find(x => x.cod === "PREC-MENOR-MIN").cls === "ind-P" && legenda.find(x => x.cod === "PREC-MENOR-MIN").tipo === "pendência"
    && legenda.find(x => x.cod === "IEAN").cls === "ind-I" && legenda.find(x => x.cod === "IEAN").tipo === "alerta"
    && legenda.find(x => x.cod === "AVRC-DEF").cls === "ind-A" && legenda.find(x => x.cod === "AVRC-DEF").tipo === "acerto");
  conf("com a descrição de cada um", legenda.every(x => /Recolhimento abaixo|agente nocivo|Acerto confirmado/.test(x.txt)));
  conf("o contador anda", /1 de \d+ respondidos/.test(await p.innerText('.painel[data-p="0"].ativo .cad-cont')));
  conf("o trilho pinta a etapa respondida com a cor da resposta",
    await p.evaluate(() => document.querySelectorAll(".tri-etapa")[0].classList.contains("atencao")));

  await p.click(".tri-prox-bt .principal");
  await p.waitForTimeout(600);
  a = await aberto();
  conf(`Benefício ativo sai do CNIS (${JSON.stringify(a.leitura.slice(0, 60))})`,
    a.tit === "Benefício ativo" && /1 benefício\(s\) ativo\(s\)/.test(a.leitura) && /espécie 31/.test(a.leitura) && /atenção/.test(a.marcado));
  await p.click(".tri-prox-bt .principal");
  await p.waitForTimeout(600);
  a = await aberto();
  conf(`o vínculo hoje vem do vínculo em aberto (${JSON.stringify(a.leitura.slice(0, 70))})`,
    a.tit === "Vínculo com a Previdência hoje" && /Empregado \(CLT\) na FAZENDA FICTICIA/.test(a.leitura) && /em aberto/.test(a.leitura));
  conf("e a resposta de vínculo já viaja para a análise (t.vinculo)",
    await p.evaluate(cli => { const v = triagemDe(D.cliPorId.get(cli)).vinculo; return v && v.tipo === "empregado" && v.desde === "2015-03"; }, CLI_CHEIO2));

  // cada passo respondido já está na Análise de Direito, com quem respondeu
  await p.evaluate(() => { abaAtiva = 8; repintarFicha(); });
  await p.waitForTimeout(400);
  const feed = await p.evaluate(() => [...document.querySelectorAll('.painel[data-p="8"] .ad-feed li')].map(x => x.textContent));
  conf(`a Análise de Direito lista os três passos respondidos (${feed.length} linhas)`,
    feed.filter(x => /^Triagem · /.test(x)).length === 3);
  conf("do mais novo para o mais velho", /Benefício ativo/.test(feed[0]) && /Indicadores/.test(feed[1]) && /CNIS/.test(feed[2]));
  conf("cada linha traz o texto explícito, a resposta e quem respondeu",
    /vínculo\(s\) sem data fim/.test(feed[2]) && /— atenção\./.test(feed[2]) && /Paulo/.test(feed[2]));
  conf("a Análise de Direito tem o botão de abrir o CNIS",
    await p.evaluate(() => /Abrir CNIS/.test(document.querySelector('.painel[data-p="8"]').textContent)));
  conf("a aba da ficha também",
    await p.evaluate(() => [...document.querySelectorAll(".menu-topo .mt")].some(b => /Abrir CNIS/.test(b.textContent))));
  conf("sem a explicação embaixo",
    !(await p.evaluate(() => /memória do escritório para a próxima conversa/.test(document.querySelector('.painel[data-p="8"]').textContent))));
  await p.evaluate(() => { abaAtiva = 0; repintarFicha(); });
  await p.waitForTimeout(300);

  // cliente sem nada: o passo 1 convida a inserir; o trilho volta e avança
  await abrir(CLI_VAZIO);
  conf("o contador começa em zero", /0 de 9 respondidos/.test(await p.innerText('.painel[data-p="0"].ativo .cad-cont')));
  // um passo do meio pelo trilho
  await p.evaluate(cli => irPassoTriagem(cli, 4), CLI_VAZIO);
  await p.waitForTimeout(400);
  a = await aberto();
  conf("o trilho abre o passo escolhido (Ação judicial anterior)",
    a.tit === "Ação judicial anterior" && /pergunte ao cliente se já processou o INSS antes/.test(a.leitura));
  conf("o passo aberto ganha ‹ anterior", !!(await p.$('.tri-prox-bt .cad-mini')));

  // marcar um passo grava com autoria e data, e já conta como respondido
  gravados.length = 0;
  await p.click('.painel[data-p="0"].ativo .tri-passo .tri-e.ok');
  await p.waitForTimeout(500);
  const g2 = gravados.filter(x => x.tabela === "clientes").pop();
  const t2 = (g2.corpo.triagem || (g2.corpo.campos || {}).triagem || {});
  conf(`marcar grava o estado, quem e quando (${JSON.stringify((t2.judicial || {}).estado)})`,
    t2.judicial && t2.judicial.estado === "ok" && t2.judicial.quem === EU && !!t2.judicial.em && !!t2.judicial.feito);
  conf("o contador anda", /1 de 9 respondidos/.test(await p.innerText('.painel[data-p="0"].ativo .cad-cont')));
  await p.click('.painel[data-p="0"].ativo .tri-passo .tri-e.ok');
  await p.waitForTimeout(500);
  const t3 = (x => x.corpo.triagem || (x.corpo.campos || {}).triagem)(gravados.filter(x => x.tabela === "clientes").pop());
  conf("clicar no mesmo estado desmarca", t3.judicial.estado === "");

  // a conclusão: nota ao sair do campo e o próximo passo recomendado
  await p.evaluate(cli => irPassoTriagem(cli, 8), CLI_VAZIO);
  await p.waitForTimeout(400);
  const antes = gravados.length;
  await p.click("#tri-conclusao");
  await p.evaluate(() => document.getElementById("tri-conclusao").blur());
  await p.waitForTimeout(400);
  conf("sair do campo sem escrever não grava nada", gravados.length === antes);
  await p.fill("#tri-conclusao", "Falta o CNIS atualizado. Cliente traz na sexta.");
  await p.evaluate(() => document.getElementById("tri-conclusao").blur());
  await p.waitForTimeout(500);
  const t4 = (x => x.corpo.triagem || (x.corpo.campos || {}).triagem)(gravados.filter(x => x.tabela === "clientes").pop());
  conf("a nota grava ao sair do campo", /Cliente traz na sexta/.test((t4.conclusao || {}).nota || ""));
  await p.click('.tri-p:has-text("Aguardando")');
  await p.waitForTimeout(500);
  const t5 = (x => x.corpo.triagem || (x.corpo.campos || {}).triagem)(gravados.filter(x => x.tabela === "clientes").pop());
  conf("grava o próximo passo recomendado", (t5.conclusao || {}).proximo === "aguardando");
  conf("a nota anterior não foi apagada", /Cliente traz na sexta/.test((t5.conclusao || {}).nota || ""));
  conf("no último passo, o botão principal encerra a triagem",
    /Encerrar a triagem/.test(await p.innerText(".tri-prox-bt .principal")));
  await (await p.$(".det-rolagem")).screenshot({ path: path.join(__dirname, "f127-triagem.png") });

  console.log("=== triagem, um passo por vez (F10 → F127) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
