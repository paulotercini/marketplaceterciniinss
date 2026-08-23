// F23 — quatro mudanças de cadastro pedidas pelo Paulo em 16.08.2026.
//
//   1. o RG saiu do sistema: do campo, dos obrigatórios e de TODOS os modelos
//   2. a parceria ganhou nome de advogado editável do cadastro, e a pesquisa
//      encontra o cliente por esse nome
//   3. "mais opções" trocou a credencial pelo registro avulso, com autor e data
//   4. cliente já aposentado + caso de aposentadoria = aviso de provável
//      REVISÃO no topo do caso, derivado (some se desmarcar o aposentado)
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

// o caso do cliente é uma aposentadoria programável — o cenário da revisão
FIX.casos[0] = { ...FIX.casos[0], beneficio: "Apos. Tempo de Contribuição" };

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
    localStorage.setItem("crm_subcad", "identificacao");
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

  // ── 1. o RG saiu do sistema ─────────────────────────────────────────────
  conf("nenhum modelo de documento carrega mais o marcador <RG>",
    (await p.evaluate(() => {
      let n = 0;
      for (const ch of Object.keys(DOCS_ESCRITORIO)) {
        const d = DOCS_ESCRITORIO[ch];
        const texto = ch === "contrato" ? textoContrato("padrao") : d.texto;
        if (/<RG>/.test(texto || "")) n++;
      }
      return n + (/<RG>/.test(QUALIF) ? 100 : 0);
    })) === 0);
  conf("a qualificação sai direto do CPF, sem RG",
    (await p.evaluate(() => /PROFISSAO>, inscrito\(a\) no CPF/.test(QUALIF))));
  conf("o RG não é mais obrigatório para os documentos",
    (await p.evaluate(() => !CAD_PRECISA.includes("rg")
      && !faltaParaDocs({ nome: "x", cpf: "1", dn: "1", endereco: "x",
        campos: { civil: { estado_civil: "solteiro", profissao: "x", bairro: "b",
          cidade: "c", uf: "SP", cep: "1" } } }).length)));
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForSelector('button.mt[data-vv="0"]');
  await p.click('button.mt[data-vv="0"]');
  await p.evaluate(() => irSubCad("identificacao"));
  await p.waitForTimeout(400);
  const grade = await p.evaluate(() =>
    [...document.querySelectorAll('.painel[data-p="0"].ativo .cad-campo label')]
      .map(l => l.textContent.trim()));
  conf(`o campo RG sumiu da grade (${grade.length} campos)`,
    !grade.some(x => /RG|órgão emissor/i.test(x)));
  conf("os documentos de escritório seguem gerando sem erro",
    (await p.evaluate(id => {
      const c = D.cliPorId.get(id);
      const q = preencherModeloDoc(QUALIF, c, "x");
      return q.length > 40 && !/<RG>/.test(q) && !/undefined/.test(q);
    }, CLI_CHEIO)));

  // ── 2. a parceria com nome de advogado ──────────────────────────────────
  conf("o cadastro tem onde escrever o advogado parceiro",
    await p.$("#par-nome"));
  escritos.length = 0;
  await p.fill("#par-nome", "Dra. Fictícia Parceira Nogueira");
  await p.evaluate(() => definirParceria());
  await p.waitForTimeout(600);
  const pat = escritos.find(x => x.m === "PATCH" && x.t === "casos");
  conf(`vincular grava a parceria no CASO (${pat && pat.corpo.parceria})`,
    pat && pat.corpo.parceria === "Dra. Fictícia Parceira Nogueira");
  conf("e a pesquisa passa a achar o cliente pelo nome do advogado",
    (await p.evaluate(cli => pesquisar("Nogueira").some(c => c.id === cli), CLI_CHEIO)));
  conf("a lista Parcerias da lateral conta este caso",
    (await p.evaluate(() => ativos().filter(k => k.parceria).length)) >= 1);

  // ── 3. o registro avulso ────────────────────────────────────────────────
  conf("a credencial saiu do 'mais opções'", !(await p.$("#nc-tipo")));
  conf("e o registro avulso entrou", await p.$("#ra-texto"));
  // o campo mora dentro do <details> "mais opções", que nasce fechado
  await p.evaluate(() => { const d = document.getElementById("mais-opcoes"); if (d) d.open = true; });
  await p.waitForTimeout(200);
  escritos.length = 0;
  await p.fill("#ra-texto", "Prefere ligação à tarde; quem ajuda é o sobrinho.");
  await p.evaluate(cli => novoRegistroAvulso(cli), CLI_CHEIO);
  await p.waitForTimeout(600);
  const reg = escritos.find(x => x.m === "PATCH" && x.t === "clientes");
  const rs = reg && reg.corpo.campos && reg.corpo.campos.registros;
  conf("o registro grava no cliente, fora de caso", rs && rs.length === 1);
  conf(`com o texto, o autor e a data (${rs && JSON.stringify(rs[0].em)})`,
    rs && /sobrinho/.test(rs[0].texto) && rs[0].quem === EU && /^\d{4}-\d{2}-\d{2}$/.test(rs[0].em));
  await p.waitForTimeout(400);
  // repintarFicha fecha o <details> de novo; innerText de conteúdo oculto
  // devolve vazio — o que existe no DOM se lê por textContent
  conf("e aparece na tela com quem registrou",
    /sobrinho/.test(await p.evaluate(() => (document.querySelector(".reg-avulso") || {}).textContent || "")));

  // ── 4. o aviso de provável revisão ──────────────────────────────────────
  const semMarca = await p.evaluate(caso =>
    chipRevisao(D.casoPorId.get(caso), D.cliPorId.get(D.casoPorId.get(caso).cliente_id)), CASO1);
  conf("sem a marca de aposentado, nenhum aviso", semMarca === "");
  const cenarios = await p.evaluate(caso => {
    const k = D.casoPorId.get(caso);
    const apos = { ...D.cliPorId.get(k.cliente_id), aposentado: true };
    return {
      aposentadoria: chipRevisao({ ...k, beneficio: "Apos. Tempo de Contribuição" }, apos),
      idade: chipRevisao({ ...k, beneficio: "Apos. por Idade" }, apos),
      revisao: chipRevisao({ ...k, beneficio: "Revisão" }, apos),
      incapacidade: chipRevisao({ ...k, beneficio: "Aux. Incapacidade Temporária" }, apos),
      pensao: chipRevisao({ ...k, beneficio: "Pensão por Morte" }, apos),
      semEspecie: chipRevisao({ ...k, beneficio: "" }, apos),
    };
  }, CASO1);
  conf("aposentado + caso de aposentadoria = aviso de provável revisão",
    /provável revisão, não concessão/.test(cenarios.aposentadoria)
    && /provável revisão/.test(cenarios.idade));
  conf("caso que JÁ é revisão não ganha aviso redundante", cenarios.revisao === "");
  conf("incapacidade e pensão não são confundidas com revisão",
    cenarios.incapacidade === "" && cenarios.pensao === "");
  conf("caso sem espécie não ganha aviso por adivinhação", cenarios.semEspecie === "");
  // e o aviso aparece de fato no quadro do caso
  await p.evaluate(cli => { D.cliPorId.get(cli).aposentado = true; }, CLI_CHEIO);
  await p.evaluate(([cli, caso]) => { casoSel = caso;
    const m = document.getElementById("modal"); if (m) m.innerHTML = "";
    abaAtiva = 2; pintarFicha(); }, [CLI_CHEIO, CASO1]);
  await p.waitForTimeout(500);
  conf("o aviso aparece no topo do quadro do caso",
    /provável revisão, não concessão/.test(await p.evaluate(() =>
      (document.querySelector(".fatos-topo") || {}).innerText || "")));
  const chip = await p.$('.fatos-topo .chip.laranja');
  if (chip) await chip.screenshot({ path: path.join(__dirname, "f23-revisao.png") });

  console.log("=== cadastro F23 (RG fora, parceria, registro avulso, revisão) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
