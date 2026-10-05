// F174 — Análise de Direito em quadros: resumo, ficha da análise (campos do
// serviço), regras com barra, planejamento só para facultativo/CI,
// pendências e o formulário que grava `detalhes` e cria o aviso de época.
// Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

FIX.analises_direito = [{ id: "a0000000-0000-0000-0000-000000000178", cliente_id: CLI_CHEIO, autor_id: EU,
  data_analise: "2026-09-28", fonte: "previus", contexto: "Cálculo conferido com a cliente.",
  cenarios: [{ regra: "PCD (LC 142)", data: "2025-01-10", valor: 2800, melhor: true },
             { regra: "Pontos", data: "2028-06-01", valor: 3100 }],
  detalhes: { servico: { cod: "B42", sub: "B42.PCD.ESP", nome: "Aposentadoria por tempo de contribuição da pessoa com deficiência e períodos especiais" },
    tempo: "32 anos, 5 meses e 22 dias", valor: 2800, did: "2010-04-02", grau: "Leve",
    recolhe: "facultativo", ultima_contribuicao: "2026-09",
    periodos_especiais: [{ inicio: "1990-01-01", fim: "1995-12-31", empresa: "Metalúrgica Fictícia" }],
    plano: [{ id: "pl1", data: "2026-10-15", texto: "Pagar a competência 09/2026" },
            { id: "pl2", data: "2027-03-15", texto: "Pagar a competência 02/2027" }] } }];

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
  const escritos = []; let semColuna = false;
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      const corpo = JSON.parse(rota.request().postData() || "{}");
      escritos.push({ m, t, corpo });
      // banco sem a coluna detalhes: o PostgREST recusa com PGRST204
      if (semColuna && t === "analises_direito" && corpo.detalhes)
        return rota.fulfill({ status: 400, contentType: "application/json",
          body: JSON.stringify({ code: "PGRST204", message: "Could not find the 'detalhes' column of 'analises_direito'" }) });
      const rep = /return=representation/.test(JSON.stringify(rota.request().headers()));
      const eco = Array.isArray(corpo) ? corpo.map((x, i) => ({ id: "n" + escritos.length + "-" + i, ...x }))
        : [{ id: "n" + escritos.length, ...corpo }];
      return rota.fulfill({ status: rep ? 201 : 204, contentType: "application/json", body: rep ? JSON.stringify(eco) : "" });
    }
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
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0 && D.analisesPorCliente);
  await p.evaluate(cli => { const c = D.cliPorId.get(cli);
    c.campos = { atendimento: [{ id: "n1", em: "2026-09-28T12:00:00-03:00", quem: "Paulo", texto: "Falta relatório médico que indique a deficiência. Verificar em 29/10." }],
      docs_pedidos: [{ em: "2026-09-20T12:00:00Z", quem: "Paulo", itens: [{ nome: "Relatório médico", entregue: null }, { nome: "Carteira de trabalho", entregue: "2026-09-25" }] }] };
    return abrirFicha(cli).then(() => { abaAtiva = 0; subCad = "direito"; repintarFicha(); }); }, CLI_CHEIO);
  await p.waitForSelector(".adr-resumo");
  const tiles = await p.$$eval(".adr-resumo .adr-tile", ts => ts.map(t => t.textContent.replace(/\s+/g, " ").trim()));
  conf("quatro quadros no resumo: idade, tempo, como recolhe, atinge o direito",
    tiles.length === 4 && /Idade hoje/.test(tiles[0]) && /anos e/.test(tiles[0]) && /Tempo de contribuição/.test(tiles[1])
    && /Como recolhe hoje/.test(tiles[2]) && /Atinge o direito/.test(tiles[3]));
  conf("tempo de contribuição vem da análise (Prévius)", /32 anos, 5 meses e 22 dias/.test(tiles[1]) && /Prévius/.test(tiles[1]));
  conf("facultativo com última contribuição 09/2026: qualidade de segurado até 15.05.2027",
    /Facultativo/.test(tiles[2]) && /qualidade de segurado até 15\.05\.2027/.test(tiles[2]));
  conf("atinge o direito: a data do melhor cenário", /10\.01\.2025/.test(tiles[3]) && /direito alcançado/.test(tiles[3]));
  const ficha = await p.textContent(".adr-ficha");
  conf("a ficha leva o nome do serviço e o chip Prévius · data",
    /pessoa com deficiência e períodos especiais/.test(ficha) && /Prévius · 28\.09\.2026/.test(ficha));
  conf("a ficha mostra os campos preenchidos (DID, grau, valor) e os períodos especiais",
    /DID/.test(ficha) && /02\.04\.2010/.test(ficha) && /Leve/.test(ficha) && /R\$\s?2\.800,00/.test(ficha)
    && /Metalúrgica Fictícia/.test(ficha) && !/Carência/.test(ficha));
  const regras = await p.$$eval(".adr-regra", ls => ls.map(l => ({ t: l.textContent.replace(/\s+/g, " "),
    w: parseFloat(l.querySelector(".adr-barra > span").style.width), ok: l.classList.contains("adr-ok"), melhor: l.classList.contains("adr-melhor") })));
  conf("uma linha por regra, com barra e data", regras.length === 2 && /01\.06\.2028/.test(regras[1].t) && /10\.01\.2025/.test(regras[0].t));
  conf("regra alcançada: barra cheia; futura: entre 5% e 95%, com faltam N meses",
    regras[0].ok && regras[0].w === 100 && regras[0].melhor && regras[1].w >= 5 && regras[1].w <= 95 && /faltam \d+ meses/.test(regras[1].t));
  const plano = await p.$$eval(".adr-plano li", ls => ls.map(l => l.textContent.replace(/\s+/g, " ")));
  conf("planejamento aparece para o facultativo, com as datas e a regra dos 6 e 12 meses",
    plano.length === 2 && /15\.10\.2026/.test(plano[0]) && /até 6 meses/.test(await p.textContent(".adr-plano")));
  escritos.length = 0;
  await p.click(".adr-plano li >> text=levar ao Lembretes");
  await p.waitForTimeout(400);
  const lemb = escritos.find(x => x.m === "POST" && x.t === "lembretes");
  conf("levar ao Lembretes cria lembrete geral com a data e o item do plano",
    lemb && lemb.corpo.tipo === "geral" && /^Contribuição: Pagar a competência 09\/2026/.test(lemb.corpo.titulo)
    && lemb.corpo.proximo_em === "2026-10-15" && lemb.corpo.detalhes.plano_item === "pl1");
  conf("e a linha passa a dizer no Lembretes", /no Lembretes/.test((await p.$$eval(".adr-plano li", ls => ls[0].textContent))));
  const pend = await p.$$eval(".adr-pend li", ls => ls.map(l => ({ t: l.textContent, ok: l.querySelector(".adr-ponto").classList.contains("ok") })));
  conf("pendências: o que falta em vermelho, o entregue em verde, e o CNIS que falta",
    pend.some(x => /Relatório médico/.test(x.t) && !x.ok) && pend.some(x => /Carteira de trabalho/.test(x.t) && x.ok)
    && pend.some(x => /CNIS/.test(x.t) && !x.ok));
  conf("próxima verificação lida da última anotação (29.10.2026)", /próxima verificação: 29\.10\.2026/.test(await p.textContent(".adr-pend")));
  conf("o quadro Andamentos tem a âncora e o campo de anotar",
    await p.evaluate(() => !!document.querySelector("#ad-anotar #ad-anot")));
  // empregado: sem planejamento
  await p.evaluate(() => { analisesDe(clienteAberto)[0].detalhes.recolhe = "empregado"; repintarFicha(); });
  conf("empregado não tem planejamento das contribuições", !(await p.$(".adr-plano")));

  // o formulário: serviço, campos da espécie, gravação com detalhes e o aviso de época
  await p.evaluate(() => { document.getElementById("ad-novo").open = true; });
  await p.selectOption("#ad-esp", "B41");
  conf("trocar a espécie troca as subespécies e esconde os campos de PCD",
    await p.evaluate(() => [...document.querySelectorAll("#ad-sub option")].some(o => o.value === "B41.RURAL")
      && document.querySelector('#ad-campos [data-campo="did"]').hidden));
  await p.selectOption("#ad-esp", "B42");
  await p.selectOption("#ad-sub", "B42.PCD");
  conf("PCD mostra DID, grau e períodos especiais",
    await p.evaluate(() => !document.querySelector('#ad-campos [data-campo="did"]').hidden && !document.querySelector('#ad-campos [data-campo="grau"]').hidden
      && !document.querySelector('#ad-campos [data-campo="periodos_especiais"]').hidden));
  await p.fill("#ad-f-tempo", "33 anos");
  await p.fill("#ad-f-data_direito", "2029-03-01");
  await p.selectOption("#ad-f-grau", "Moderada");
  escritos.length = 0;
  await p.evaluate(cli => salvarAnalise(cli), CLI_CHEIO);
  await p.waitForTimeout(900);
  const post = escritos.find(x => x.m === "POST" && x.t === "analises_direito");
  conf("salvar grava detalhes com o serviço e os campos",
    post && post.corpo.detalhes && post.corpo.detalhes.servico.cod === "B42" && post.corpo.detalhes.servico.sub === "B42.PCD"
    && post.corpo.detalhes.tempo === "33 anos" && post.corpo.detalhes.grau === "Moderada" && post.corpo.detalhes.data_direito === "2029-03-01");
  conf("data do direito no futuro cria o aviso de época (aposentadorias)",
    escritos.some(x => x.m === "POST" && x.t === "aposentadorias" && x.corpo.data === "2029-03-01" && x.corpo.lembrar_em));
  conf("o resumo passa a mostrar o novo tempo", /33 anos/.test(await p.textContent(".adr-resumo")));
  // banco sem a coluna: tenta com detalhes, recebe PGRST204 e grava sem
  semColuna = true; escritos.length = 0;
  await p.evaluate(() => { document.getElementById("ad-novo").open = true; document.getElementById("ad-f-tempo").value = "34 anos"; });
  await p.evaluate(cli => salvarAnalise(cli), CLI_CHEIO);
  await p.waitForTimeout(700);
  const posts = escritos.filter(x => x.m === "POST" && x.t === "analises_direito");
  conf("sem a coluna detalhes, a análise grava sem ela (segunda tentativa)",
    posts.length === 2 && posts[0].corpo.detalhes && !posts[1].corpo.detalhes);

  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
