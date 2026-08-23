// F19 — a vida contributiva lida do CNIS, e o cadastro reorganizado.
//
// Três coisas que o Paulo pediu, e o que cada uma tem de provar:
//   1. a linha do tempo dos vínculos, em ordem cronológica, com os períodos de
//      benefício que o próprio CNIS traz no meio deles
//   2. CPF e senha do Meu INSS lado a lado, que é o par que mais se copia
//   3. o protocolo fora da Identificação: ele é do CASO, não do cliente
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1 } = require("./fixturas");
const { ITENS_CNIS } = require("./fixt-pdf");
const SUPA = "https://ficticio.supabase.co";

FIX.clientes[0] = { ...FIX.clientes[0], cpf: "52998224725" };
// dois casos, cada um com o SEU protocolo: é a situação que a fileira achatada
// da Identificação não sabia representar
FIX.casos[0] = { ...FIX.casos[0], protocolos: ["1234567890"], der: "2025-03-10" };
FIX.casos.push({ ...FIX.casos[0], id: "b0000000-0000-0000-0000-0000000000d1",
  beneficio: "BPC/LOAS", protocolos: ["9876543210"], der: "2026-01-20", fase: "inss" });
FIX.credenciais = [{ id: "cr1", cliente_id: CLI_CHEIO, tipo: "meu_inss",
  valor: "cifrado", criado_em: "2026-01-01T10:00:00Z" }];

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 },
    permissions: ["clipboard-read", "clipboard-write"] });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_subcad", "identificacao");
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (rota.request().method() !== "GET") return rota.fulfill({ status: 204, body: "" });
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

  // ── 1. a linha do tempo dos vínculos ────────────────────────────────────
  const vs = await p.evaluate(it => lerVinculosCnis(it), ITENS_CNIS);
  conf(`lê os vínculos do CNIS (${vs.length})`, vs.length >= 4);
  const tipos = vs.reduce((a, v) => { a[v.tipo] = (a[v.tipo] || 0) + 1; return a; }, {});
  conf(`separa os tipos de filiado (${JSON.stringify(tipos)})`,
    tipos["Empregado ou Agente Público"] >= 1 && tipos["Facultativo"] === 1);
  // "Empregado ou Agente Público" quebra em duas linhas no extrato. Quando o
  // "Público" não cai na linha seguinte, o texto termina em "Empregado ou
  // Agente" — e o casamento ingênuo caía no "Empregado" solto.
  conf("nenhum vínculo sai com o tipo truncado em 'Empregado'",
    !vs.some(v => v.tipo === "Empregado"));
  conf("todo vínculo sai com origem e data de início",
    vs.every(v => v.origem && /^\d{2}\/\d{2}\/\d{4}$/.test(v.inicio)));
  const cron = vs.map(v => v.inicio.split("/").reverse().join(""));
  conf("saem em ordem cronológica, não na sequência do INSS",
    cron.every((d, i) => i === 0 || cron[i - 1] <= d));
  // vínculo em aberto: só uma data. A última remuneração é competência
  // (MM/AAAA) e não pode ser lida como data-fim.
  const abertos = vs.filter(v => v.aberto && v.tipo !== "Benefício");
  conf(`vínculo sem data-fim fica em aberto (${abertos.length})`,
    abertos.length >= 1 && abertos.every(v => !v.fim));
  conf("a última remuneração não vira data-fim",
    vs.every(v => !v.fim || /^\d{2}\/\d{2}\/\d{4}$/.test(v.fim)));
  // o período de benefício que o CNIS traz como se fosse vínculo
  const bens = vs.filter(v => v.tipo === "Benefício");
  conf(`acha os períodos de benefício dentro do CNIS (${bens.length})`, bens.length === 3);
  conf(`cada um com espécie, NB e situação (${JSON.stringify(bens[0] && bens[0].especie)}, ${JSON.stringify(bens[0] && bens[0].situacao)})`,
    bens.every(b => /^\d+$/.test(b.especie) && b.nb && b.situacao)
    && bens[0].especie === "31" && bens[0].situacao === "CESSADO");
  conf(`e com o nome da espécie por extenso (${JSON.stringify((bens[0] || {}).origem)})`,
    /AUXILIO DOENCA/i.test((bens[0] || {}).origem || ""));
  const comInd = vs.filter(v => (v.indicadores || []).length);
  conf(`o indicador do vínculo vem junto (${comInd.map(v => v.indicadores.join(",")).join(" | ") || "nenhum"})`,
    comInd.some(v => v.indicadores.includes("IREC-INDPEND")));

  // o texto do parecer
  const txt = await p.evaluate(it => vidaContributivaTexto(lerVinculosCnis(it)), ITENS_CNIS);
  const ls = txt.split("\n");
  conf(`o texto do parecer tem uma linha por registro (${ls.length})`, ls.length === vs.length);
  conf(`a data sai no padrão do escritório (${JSON.stringify(ls[0].slice(0, 24))})`,
    /^\d{2}\.\d{2}\.\d{4} a \d{2}\.\d{2}\.\d{4} · /.test(ls[0]));
  conf("o vínculo em aberto é dito com todas as letras", /em aberto/.test(txt));
  conf("o benefício sai identificado como benefício", /· Benefício espécie 31 ·/.test(txt));

  // ── 2. a tela: a lista, e o copiar ──────────────────────────────────────
  // este cliente tem DOIS casos ativos de propósito (é o ponto do teste do
  // protocolo), e com mais de um caso a ficha abre a janela "escolher
  // processo", que trava a pintura. Escolher o caso é o que quem atende faria.
  // `abrirFicha` põe casoSel em "__auto__"; com mais de um processo em aberto
  // ele devolve a janela "escolher processo" e a ficha NÃO chega a ser pintada
  // — nem as abas existem. Escolher o processo, que é o que quem atende faz,
  // é o que destrava. Definir casoSel depois do abrirFicha não adianta.
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForTimeout(600);
  await p.evaluate(([cli, caso]) => { casoSel = caso;
    const m = document.getElementById("modal"); if (m) m.innerHTML = "";
    pintarFicha(); }, [CLI_CHEIO, CASO1]);
  await p.waitForSelector('button.mt[data-vv="0"]');
  await p.click('button.mt[data-vv="0"]');
  await p.evaluate(() => irSubCad("triagem"));
  await p.waitForSelector(".tri-lista");
  await p.evaluate(([cli, it]) => gravarCnisLido(cli, lerCnisPdf(it)), [CLI_CHEIO, ITENS_CNIS]);
  await p.waitForTimeout(800);
  conf("a lista aparece no passo do CNIS", await p.$(".vida-cx"));
  const resumo = await p.innerText(".vida-cx summary");
  conf(`o resumo conta o que tem dentro (${JSON.stringify(resumo)})`,
    /Vida contributiva lida do CNIS/.test(resumo) && /3 de benefício/.test(resumo));
  conf(`a lista tem uma linha por registro (${await p.evaluate(() => document.querySelectorAll(".vida-lista li").length)})`,
    (await p.evaluate(() => document.querySelectorAll(".vida-lista li").length)) === vs.length);
  conf("o registro de benefício é destacado dos vínculos",
    (await p.evaluate(() => document.querySelectorAll(".vida-lista li.vida-ben").length)) === 3);
  await p.evaluate(() => { document.querySelector(".vida-cx").open = true; });
  await p.waitForTimeout(200);
  await p.click('.vida-acao button');
  await p.waitForTimeout(500);
  const colado = await p.evaluate(() => navigator.clipboard.readText());
  conf(`copiar leva o texto inteiro (${colado.split("\n").length} linhas)`,
    /^VIDA CONTRIBUTIVA \(lida do CNIS em \d{2}\.\d{2}\.\d{4}\)/.test(colado)
    && colado.split("\n").length === vs.length + 2);
  await (await p.$(".vida-cx")).screenshot({ path: path.join(__dirname, "f19-vida.png") });

  // ── 3. CPF e senha do Meu INSS lado a lado ──────────────────────────────
  await p.evaluate(() => { subCad = "identificacao"; pintarFicha(); });
  await p.waitForTimeout(400);
  const pos = await p.evaluate(() => {
    const campos = [...document.querySelectorAll('.painel[data-p="0"].ativo .cad-grade > .cad-campo')];
    return campos.map(x => { const r = x.getBoundingClientRect();
      const l = x.querySelector("label");
      // innerText ignora texto de elemento cujo estilo o esconde; textContent
      // pega o rótulo escrito, que é o que interessa aqui
      return { rot: (l ? l.textContent : "").replace(/\s+/g, " ").trim(),
        x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) }; });
  });
  const acha = rx => pos.find(c => rx.test(c.rot));
  const cpf = acha(/^CPF/), senha = acha(/Senha Meu INSS/), nome = acha(/Nome completo/);
  conf(`os três campos existem (${pos.length} campos na grade)`, cpf && senha && nome);
  conf(`CPF e senha estão na MESMA linha (y ${cpf && cpf.y} e ${senha && senha.y})`,
    cpf && senha && Math.abs(cpf.y - senha.y) <= 4);
  conf(`e são vizinhos, sem nada entre eles (${senha && cpf && senha.x - (cpf.x + cpf.w)}px de distância)`,
    cpf && senha && senha.x > cpf.x && senha.x - (cpf.x + cpf.w) < 20);
  conf(`o nome ficou acima dos dois, com a largura inteira (${nome && nome.w}px)`,
    nome && cpf && nome.y < cpf.y && nome.w > cpf.w * 2);
  conf("os dois têm botão de copiar",
    (await p.evaluate(() => {
      const cs = [...document.querySelectorAll('.painel[data-p="0"].ativo .cad-campo')];
      const oCpf = cs.find(x => /^\s*CPF/.test((x.querySelector("label") || {}).textContent || ""));
      const oSen = cs.find(x => /Senha Meu INSS/.test((x.querySelector("label") || {}).textContent || ""));
      return !!(oCpf && /copiar/.test(oCpf.innerText)) && !!(oSen && /copiar/.test(oSen.innerText));
    })));
  // no celular a grade vira uma coluna: os dois continuam um embaixo do outro
  const cel = await p.evaluate(() => {
    document.getElementById("app").classList.add("celular");
    const cs = [...document.querySelectorAll('.painel[data-p="0"].ativo .cad-grade > .cad-campo')];
    const idx = r => cs.findIndex(x => r.test((x.querySelector("label") || {}).textContent || ""));
    const a = idx(/^CPF/), b = idx(/Senha Meu INSS/);
    document.getElementById("app").classList.remove("celular");
    return { a, b };
  });
  conf(`no celular continuam grudados (posições ${cel.a} e ${cel.b})`, cel.b === cel.a + 1);
  await (await p.$('.painel[data-p="0"].ativo .cad-cartao')).screenshot({
    path: path.join(__dirname, "f19-cpf-senha.png") });

  // ── 4. o protocolo saiu da Identificação ────────────────────────────────
  const ident = await p.innerText('.painel[data-p="0"].ativo');
  conf("o número do protocolo não é mais listado na Identificação",
    !/1234567890/.test(ident) && !/9876543210/.test(ident));
  conf("mas a tela diz onde ele passou a morar",
    /De onde partiu/.test(ident) && /Requerimentos anteriores/.test(ident));
  // a pesquisa continua achando o cliente pelo protocolo
  const achou = await p.evaluate(() => pesquisar("9876543210").map(c => c.id));
  conf(`a pesquisa continua achando o cliente pelo protocolo (${achou.length})`,
    achou.includes(CLI_CHEIO) || achou.length > 0);
  // e a triagem passa a dizer de QUAL caso é cada protocolo
  const leit = await p.evaluate(cli => {
    const c = D.cliPorId.get(cli), ks = D.casosDoCliente.get(cli) || [];
    return triagemLeitura("requerimento", c, ks);
  }, CLI_CHEIO);
  conf(`a triagem conta os dois protocolos (${JSON.stringify(leit.txt.slice(0, 40))})`,
    /2 protocolo\(s\)/.test(leit.txt) && leit.cor === "ok");
  conf(`e diz de qual caso é cada um (${JSON.stringify((leit.det || "").slice(0, 60))})`,
    /1234567890 · /.test(leit.det) && /9876543210 · /.test(leit.det)
    && /DER /.test(leit.det));
  // e a trilha do caso continua mostrando o protocolo daquele caso, só dele
  const trilha = await p.evaluate(caso => trilhaProcessual(D.casoPorId.get(caso)), CASO1);
  conf("a trilha do caso mostra o protocolo DAQUELE caso", /1234567890/.test(trilha));
  conf("e não mostra o protocolo do outro caso", !/9876543210/.test(trilha));

  console.log("=== vida contributiva e cadastro (F19) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
