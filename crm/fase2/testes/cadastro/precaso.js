// F25 — o pré-caso: a mesa do primeiro atendimento.
//
// "Gerado o caso" é quando saem as procurações e o cliente assina o contrato.
// Antes disso: pré-casos (mais de um, pelo +), com espécie, natureza,
// marcadores que abrem tópicos, honorários combinados e anotações com
// atribuição, lembrete, importante/urgente e checklist — tudo com autor.
// O cliente fica AMARELO ("em formação"), só com Cadastro e Lembretes no
// menu, até o caso nascer. Gerar o caso transfere as anotações como
// andamentos com a data e o autor originais (decisão do Paulo).
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_VAZIO, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

// F29: o pré-caso mora nas Anotações, que só se abrem com a triagem
// encerrada — a fixtura entrega o cliente já triado
FIX.clientes[1] = { ...FIX.clientes[1], triagem: { atendimento:
  { em: "2026-08-01", quem: EU, passos: 8, conferidos: 8 } } };
// espécies para os selects do pré-caso
FIX.documentos_beneficio.push(
  { id: "db2", beneficio: "Apos. Tempo de Contribuição", itens: "Procuração assinada\nCNIS emitido", extras: "" },
  { id: "db3", beneficio: "BPC/LOAS", itens: "CadÚnico atualizado", extras: "" });
// uma colaboradora para atribuir
const COL2 = "a0000000-0000-0000-0000-00000000cc22";
FIX.colaboradores.push({ id: COL2, nome: "Amanda Ficticia", inicial: "A", cor: "#B4530A",
  cargo: "advogada", email: "am@ex.com", ativo: true });

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1500, height: 1000 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_subcad", "anotacoes");
    localStorage.setItem("crm_subanot", "atendimento");
  }, [SUPA, SESSAO]);
  const escritos = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      const corpo = JSON.parse(rota.request().postData() || "{}");
      escritos.push({ m, t, corpo });
      const rep = /return=representation/.test(JSON.stringify(rota.request().headers()));
      return rota.fulfill({ status: rep ? 201 : 204, contentType: "application/json",
        body: rep ? JSON.stringify([{ id: "novo-" + escritos.length, ...corpo }]) : "" });
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
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);

  // ── 1. o menu dinâmico do cliente sem caso ──────────────────────────────
  await p.evaluate(cli => abrirFicha(cli), CLI_VAZIO);
  await p.waitForSelector('button.mt[data-vv="0"]');
  const abas = await p.evaluate(() =>
    [...document.querySelectorAll(".mt")].map(b => b.innerText.trim().split("\n")[0]));
  conf(`sem caso, o menu tem só Cadastro e Lembretes (${abas.join(" · ")})`,
    abas.some(x => /Cadastro/.test(x)) && abas.some(x => /Lembretes/.test(x))
    && !abas.some(x => /Casos|Perícias|Honorários/.test(x)));
  conf("e a ficha abriu no Cadastro (a aba 2 não existe para ele)",
    (await p.evaluate(() => abaAtiva)) === 0);

  // ── 2. as três divisões e o trilho das Anotações ────────────────────────
  const divisoes = await p.evaluate(() =>
    [...document.querySelectorAll('.painel[data-p="0"].ativo .sub-menu')[0].querySelectorAll("button")]
      .map(b => b.innerText.trim()));
  conf(`o Cadastro tem TRÊS divisões (${divisoes.join(" · ")})`,
    divisoes.length === 3 && /Identificação/.test(divisoes[0])
    && /Triagem/.test(divisoes[1]) && /Anotações/.test(divisoes[2]));
  const trilho = await p.evaluate(() => {
    const t = document.querySelector(".anot-trilho");
    return t ? [...t.querySelectorAll("button")].map(b => b.innerText.trim()) : [];
  });
  conf(`dentro de Anotações, o trilho leva a Documentos, Consulta e Mensagens (${trilho.join(" · ")})`,
    trilho.length === 4 && trilho.includes("Documentos") && trilho.includes("Consulta"));
  await p.evaluate(() => irSubAnot("consulta"));
  await p.waitForTimeout(400);
  conf("a Consulta continua inteira, agora dentro de Anotações",
    /CPF DESTE CLIENTE/i.test(await p.evaluate(() =>
      (document.querySelector('.painel[data-p="0"].ativo') || {}).textContent || "")));
  await p.evaluate(() => irSubAnot("atendimento"));
  await p.waitForTimeout(400);

  // ── 3. o pré-caso ───────────────────────────────────────────────────────
  conf("o bloco do pré-caso está na mesa", await p.$(".pc-bloco"));
  escritos.length = 0;
  await p.evaluate(cli => novoPreCaso(cli), CLI_VAZIO);
  await p.waitForTimeout(500);
  conf("acrescentar cria o pré-caso com autor e data",
    escritos.some(x => x.m === "PATCH" && x.t === "clientes"
      && (x.corpo.campos.precasos || []).some(pc => pc.quem === EU && pc.em)));
  conf("o cartão amarelo do pré-caso aparece", await p.$(".pc-cartao"));

  // espécie + natureza + marcador
  const pcId = await p.evaluate(cli => precasosDe(D.cliPorId.get(cli))[0].id, CLI_VAZIO);
  await p.evaluate(([cli, id]) => mudarPreCaso(cli, id, "especie", "Apos. Tempo de Contribuição"), [CLI_VAZIO, pcId]);
  await p.waitForTimeout(400);
  await p.evaluate(([cli, id]) => mudarPreCaso(cli, id, "natureza", "concessao"), [CLI_VAZIO, pcId]);
  await p.waitForTimeout(400);
  conf("aposentadoria abre os marcadores rural/especial/deficiência",
    (await p.evaluate(() => document.querySelectorAll(".pc-marcas input").length)) === 3);
  await p.evaluate(([cli, id]) => mudarPreCaso(cli, id, "marc", "rural"), [CLI_VAZIO, pcId]);
  await p.waitForTimeout(400);
  const topicos = await p.evaluate(() =>
    [...document.querySelectorAll(".pc-topicos li")].map(x => x.innerText));
  conf(`marcar RURAL abre os tópicos da família rural (${topicos.length})`,
    topicos.length >= 3 && topicos.some(t => /prova material/i.test(t)));
  await p.evaluate(([cli, id]) => mudarPreCaso(cli, id, "honorarios", "30% dos atrasados"), [CLI_VAZIO, pcId]);
  await p.waitForTimeout(400);

  // status amarelo
  conf(`o topo da ficha diz "Em formação" (${await p.evaluate(() => (document.querySelector(".cli-st") || {}).innerText || "")})`,
    /Em formação — 1 pré-caso/.test(await p.evaluate(() => (document.querySelector(".cli-st") || {}).innerText || "")));

  // ── 4. a anotação com corpo ─────────────────────────────────────────────
  escritos.length = 0;
  await p.fill("#at-nota", "Cliente vai buscar o CNIS na agência e traz semana que vem.");
  await p.selectOption("#at-quem", COL2);
  await p.fill("#at-lembrar", "2026-09-01");
  await p.evaluate(() => { document.getElementById("at-imp").checked = true; });
  await p.evaluate(cli => salvarNotaAtendimento2(cli), CLI_VAZIO);
  await p.waitForTimeout(700);
  const lemb = escritos.find(x => x.m === "POST" && x.t === "lembretes");
  conf(`lembrar cria o LEMBRETE com o responsável (${lemb && lemb.corpo.responsavel_id === COL2 ? "Amanda" : "?"})`,
    lemb && lemb.corpo.responsavel_id === COL2 && lemb.corpo.proximo_em === "2026-09-01"
    && /Cliente vai buscar o CNIS/.test(lemb.corpo.titulo));
  const patN = escritos.filter(x => x.m === "PATCH" && x.t === "clientes").pop();
  const nota = patN && (patN.corpo.campos.atendimento || [])[0];
  conf("a anotação guarda atribuição, lembrete e importância",
    nota && nota.atribuido === COL2 && nota.lembrar_em === "2026-09-01"
    && nota.importante === true && nota.quem);
  await p.waitForTimeout(300);
  // checklist
  await p.evaluate(() => { const i = document.querySelector('[id^="nck-"]');
    i.value = "conferir os vínculos rurais"; });
  await p.evaluate(cli => notaChecklistItem(cli, 0), CLI_VAZIO);
  await p.waitForTimeout(500);
  conf("o item de checklist entra na anotação",
    (await p.evaluate(() => document.querySelectorAll(".nck-lista input").length)) === 1);
  await p.evaluate(cli => notaChecklistToggle(cli, 0, 0), CLI_VAZIO);
  await p.waitForTimeout(400);
  conf("marcar o item risca, com quem e quando",
    (await p.evaluate(cli => {
      const ck = ((D.cliPorId.get(cli).campos || {}).atendimento || [])[0].checklist[0];
      return ck.feito === true && !!ck.quem && !!ck.em;
    }, CLI_VAZIO)));

  // ── 5. gerar o caso ─────────────────────────────────────────────────────
  escritos.length = 0;
  await p.evaluate(([cli, id]) => gerarCasoDoPre(cli, id), [CLI_VAZIO, pcId]);
  await p.waitForTimeout(1000);
  const post = escritos.find(x => x.m === "POST" && x.t === "casos");
  conf(`gerar cria o caso com a espécie (${post && post.corpo.beneficio})`,
    post && post.corpo.beneficio === "Apos. Tempo de Contribuição");
  const dec = escritos.find(x => x.m === "POST" && x.t === "andamentos" && /\[DECISÃO\]/.test(x.corpo.texto));
  conf("o primeiro andamento registra natureza, marcador e honorários",
    dec && /concessão/.test(dec.corpo.texto) && /rural/.test(dec.corpo.texto)
    && /30% dos atrasados/.test(dec.corpo.texto));
  const trans = escritos.find(x => x.m === "POST" && x.t === "andamentos" && /buscar o CNIS/.test(x.corpo.texto));
  conf("a anotação vira andamento com a DATA original",
    trans && trans.corpo.criado_em && /^\d{4}-\d{2}-\d{2}T/.test(trans.corpo.criado_em));
  conf("o pré-caso se encerra ao gerar",
    escritos.some(x => x.m === "PATCH" && x.t === "clientes"
      && x.corpo.campos && !(x.corpo.campos.precasos || []).length));

  console.log("=== pré-caso (F25) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
