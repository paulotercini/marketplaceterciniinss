// F175/F176 — cliente em Escritório: a barra com Novo andamento, Gerar
// procurações e Criar caso; e os quatro passos do atendimento nas Anotações
// (Serviço, PDF do Prévius, Análise de direito, Destino). Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CLI_VAZIO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

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
    window.open = () => null;
  }, [SUPA, SESSAO]);
  const escritos = []; let semSub = true;
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      const corpo = JSON.parse(rota.request().postData() || "{}");
      escritos.push({ m, t, corpo });
      // banco sem a coluna subespecie: o caso tem de nascer mesmo assim
      if (semSub && t === "casos" && corpo.subespecie)
        return rota.fulfill({ status: 400, contentType: "application/json",
          body: JSON.stringify({ code: "42703", message: "column \"subespecie\" does not exist" }) });
      const rep = /return=representation/.test(JSON.stringify(rota.request().headers()));
      const eco = Array.isArray(corpo) ? corpo.map((x, i) => ({ id: "n" + escritos.length + "-" + i, ...x }))
        : [{ id: "b0000000-0000-0000-0000-0000000001" + String(escritos.length).padStart(2, "0"), ...corpo }];
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
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);

  // cliente com caso no INSS: sem a barra do Escritório
  await p.evaluate(cli => abrirFicha(cli).then(() => { abaAtiva = 0; subCad = "direito"; repintarFicha(); }), CLI_CHEIO);
  await p.waitForSelector(".adr-resumo");
  conf("cliente com caso no INSS não vê a barra do Escritório", !(await p.$(".adr-barra-esc")));

  // cliente sem caso, com anotações do To Do: a barra aparece na Análise de Direito
  await p.evaluate(cli => { const c = D.cliPorId.get(cli);
    c.campos = { atendimento: [{ id: "n1", em: "2026-09-20T12:00:00Z", texto: "Cliente trará a carteira de trabalho.", quem: "Amanda", origem: "todo" }] };
    return abrirFicha(cli); }, CLI_VAZIO);
  await p.waitForSelector(".adr-barra-esc");
  const bts = await p.$$eval(".adr-barra-esc button", b => b.map(x => x.textContent.trim()));
  conf("barra do Escritório com Novo andamento, Gerar procurações e Criar caso",
    bts.length === 3 && /Novo andamento/.test(bts[0]) && /Gerar procurações/.test(bts[1]) && /Criar caso/.test(bts[2]));
  conf("os botões da barra têm ao menos 40px de altura",
    (await p.$$eval(".adr-barra-esc button", b => b.map(x => x.getBoundingClientRect().height))).every(h => h >= 40));

  // Novo andamento: vai à Análise de Direito com o cursor no campo
  await p.evaluate(() => { subCad = "identificacao"; repintarFicha(); });
  await p.evaluate(cli => novoAndamentoDireito(cli), CLI_VAZIO);
  conf("Novo andamento abre a Análise de Direito com o foco no campo de anotar",
    await p.evaluate(() => subCad === "direito" && document.activeElement && document.activeElement.id === "ad-anot"));

  // Gerar procurações
  await p.click(".adr-barra-esc >> text=Gerar procurações");
  const rots = await p.$$eval("#modal .adr-ck", ls => ls.map(l => l.textContent.trim()));
  conf("Gerar procurações lista os quatro modelos",
    rots.length === 4 && /Procuração Administrativa/.test(rots.join("|")) && /Procuração Judicial/.test(rots.join("|")));
  await p.evaluate(() => { window.__docs = []; gerarTodosDocs = (cli, ch) => window.__docs.push(ch); });
  await p.evaluate(() => { const ck = document.querySelectorAll("#modal .proc-ck"); ck[2].checked = true; });
  await p.click("#modal .adr-modal-bts button.adr-primario");
  conf("Imprimir leva os modelos marcados ao gerador de documentos",
    await p.evaluate(() => JSON.stringify(window.__docs) === JSON.stringify([["proc_adm", "proc_judicial", "pobreza"]])));

  // Criar caso
  await p.click(".adr-barra-esc >> text=Criar caso");
  const listas = await p.$$eval("#cc-lista option", o => o.map(x => x.textContent));
  conf("Criar caso: a lista não oferece Aposentadorias Futuras nem Pagamentos, e começa no INSS",
    !listas.some(l => /Aposentadorias Futuras|Pagamentos/.test(l)) && listas.includes("Judicial")
    && (await p.$eval("#cc-lista", x => x.value)) === "inss" && !listas.some(l => /[\u{1F300}-\u{1FAFF}]/u.test(l)));
  await p.selectOption("#cc-esp", "B42");
  conf("a subespécie acompanha a espécie", (await p.$$eval("#cc-sub option", o => o.map(x => x.value))).includes("B42.PCD"));
  await p.selectOption("#cc-sub", "B42.PCD");
  await p.selectOption("#cc-lista", "judicial");
  escritos.length = 0;
  await p.click("#modal .adr-modal-bts button.adr-primario");
  await p.waitForTimeout(900);
  const casos = escritos.filter(x => x.m === "POST" && x.t === "casos");
  conf("o caso nasce com espécie, subespécie, fase e lista",
    casos[0] && casos[0].corpo.especie === "B42" && casos[0].corpo.subespecie === "B42.PCD"
    && casos[0].corpo.fase === "judicial" && casos[0].corpo.origem_lista === "👪 Judicial"
    && /pessoa com deficiência/.test(casos[0].corpo.beneficio));
  conf("sem a coluna subespecie, tenta de novo sem ela", casos.length === 2 && !casos[1].corpo.subespecie && casos[1].corpo.especie === "B42");
  conf("o andamento [DECISÃO] registra a criação",
    escritos.some(x => x.m === "POST" && x.t === "andamentos" && /^\[DECISÃO\] Caso criado/.test(x.corpo.texto)));
  conf("e a ficha abre no caso novo", await p.evaluate(() => abaAtiva === 2 && !!casoSel && D.casoPorId.has(casoSel)));

  // ── os quatro passos do atendimento ─────────────────────────────────────
  await p.evaluate(cli => { const c = D.cliPorId.get(cli);
    D.casos = D.casos.filter(k => k.cliente_id !== cli); D.casosDoCliente.set(cli, []);
    c.triagem = { atendimento: { em: hoje(), quem: eu.id, passos: 8, conferidos: 8 } };
    c.campos = { precasos: [{ id: "pc1", especie: "", natureza: "", marc: {}, honorarios: "", quem: eu.id, em: "2026-10-01" }] };
    D.anexos = [];
    abaAtiva = 0; subCad = "anotacoes"; repintarFicha(); }, CLI_VAZIO);
  await p.waitForSelector(".adr-passos");
  const est = () => p.$$eval(".adr-passo", bs => bs.map(b => (b.classList.contains("feito") ? "F" : "-") + (b.getAttribute("aria-current") === "step" ? "*" : "")).join(" "));
  conf("Anotações: os quatro passos, o primeiro em andamento", (await est()) === "-* - - -");
  conf("a barra do Escritório também aparece nas Anotações", !!(await p.$(".adr-barra-esc")));
  await p.evaluate(cli => { const c = D.cliPorId.get(cli);
    c.campos.precasos[0] = { ...c.campos.precasos[0], especie: "Aposentadoria por tempo de contribuição", cod: "B42", natureza: "concessao" };
    repintarFicha(); }, CLI_VAZIO);
  conf("com a espécie, o passo 1 fica feito e o 2 é o atual", (await est()) === "F -* - -");
  await p.evaluate(cli => { D.anexos = [{ id: "an1", cliente_id: cli, caso_id: null, nome: "Prévius 04.10.2026 - calculo.pdf", criado_em: new Date().toISOString() }]; repintarFicha(); }, CLI_VAZIO);
  conf("com o PDF do Prévius nos anexos, o passo 2 fica feito", (await est()) === "F F -* -");
  await p.click(".adr-passo >> nth=2");
  conf("o passo 3 leva à Análise de Direito com o formulário aberto",
    await p.evaluate(() => subCad === "direito" && document.getElementById("ad-novo").open));
  await p.evaluate(cli => { const a = { id: "an-hoje", cliente_id: cli, data_analise: hoje(), fonte: "manual", cenarios: [], detalhes: {} };
    D.analises.push(a); D.analisesPorCliente.set(cli, [a]); subCad = "anotacoes"; repintarFicha(); }, CLI_VAZIO);
  conf("com a análise de hoje, o passo 4 (Destino) é o atual", (await est()) === "F F F -*");
  const ops = await p.$$eval("#pcf-pc1 option", o => o.map(x => x.textContent));
  conf("o destino lista INSS, Conselho de Recursos, Judicial, Petições Iniciais e Manter em Escritório",
    JSON.stringify(ops) === JSON.stringify(["INSS", "Conselho de Recursos", "Judicial", "Petições Iniciais", "Manter em Escritório"]));
  await p.selectOption("#pcf-pc1", "escritorio");
  conf("escolhido Manter em Escritório, o botão diz isso", /Manter em Escritório/.test(await p.textContent("#pcb-pc1")));
  escritos.length = 0;
  await p.click("#pcb-pc1");
  await p.waitForTimeout(500);
  const pat = escritos.find(x => x.m === "PATCH" && x.t === "clientes");
  conf("Manter em Escritório grava só a anotação e mantém o pré-caso",
    pat && pat.corpo.campos.atendimento.some(n => n.texto === "Mantido em Escritório: faltam documentos")
    && pat.corpo.campos.precasos.length === 1 && !escritos.some(x => x.t === "casos"));
  conf("e o passo 4 fica feito", (await est()) === "F F F F");

  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
