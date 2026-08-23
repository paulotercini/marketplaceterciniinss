// F35 — A REGRA DA VOLTA: toda transição do CRM tem o seu desfazer
// (decisão permanente do Paulo, 16.08.2026).
//
//   1. caso encerrado se REABRE: volta à lista de origem, resultado limpo,
//      registro de quem reabriu
//   2. "Somente gerar lembrete" se desfaz: o pré-caso volta à mesa e o
//      lembrete criado é desativado
//   3. pré-caso tirado vai à lixeira e se RESTAURA da mesa
//   4. "entregue" marcado por engano se desmarca no clique
//   5. anotação e registro avulso do PRÓPRIO autor se apagam (só o autor)
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CLI_VAZIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

// o caso nasce ENCERRADO para provar a reabertura; o cliente vazio chega
// triado, com pré-caso em lembrete, nota própria, nota alheia e doc entregue
FIX.casos[0] = { ...FIX.casos[0], fase: "encerrado", resultado: "indeferido",
  encerrado_em: "2026-08-10T12:00:00Z", encerrado_por: EU, origem_lista: "🌻 INSS" };
FIX.clientes[1] = { ...FIX.clientes[1], triagem: { atendimento:
  { em: "2026-08-01", quem: EU, passos: 8, conferidos: 8 } },
  campos: {
    precasos: [{ id: "pcL", especie: "BPC/LOAS", natureza: "", marc: {},
      honorarios: "", quem: EU, em: "2026-08-10", so_lembrete: true }],
    atendimento: [
      { id: "n1", em: "2026-08-10T10:00:00Z", quem: "Paulo", texto: "Minha anotação, para apagar." },
      { id: "n2", em: "2026-08-11T10:00:00Z", quem: "Amanda", texto: "Anotação de outra pessoa." }],
    docs_pedidos: [{ id: "pd1", em: "2026-08-10", quem: "Paulo", especie: "BPC/LOAS",
      itens: [{ nome: "CadÚnico atualizado", entregue: "2026-08-12" }] }],
    registros: [{ texto: "Registro meu, por engano.", quem: EU, em: "2026-08-10" }] } };
FIX.lembretes = [{ id: "lb000000-0000-0000-0000-000000000001", cliente_id: CLI_VAZIO,
  tipo: "geral", titulo: "BPC/LOAS — atendimento virou lembrete", ativo: true,
  proximo_em: "2027-01-10", detalhes: { origem: "precaso", precaso_id: "pcL" },
  criado_por: EU }];

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
    window.confirm = () => true;
  }, [SUPA, SESSAO]);
  const escritos = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      const corpo = JSON.parse(rota.request().postData() || "null");
      escritos.push({ m, t, u, corpo });
      // gerarCasoDoPre consome o caso criado — eco 201 obrigatório
      if (m === "POST" && t === "casos")
        return rota.fulfill({ status: 201, contentType: "application/json",
          body: JSON.stringify([{ id: "b9999999-9999-9999-9999-999999999999", ...corpo }]) });
      return rota.fulfill({ status: 204, body: "" });
    }
    let corpo = FIX[t] || [];
    const fc = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (fc) corpo = corpo.filter(x => x.cliente_id === fc[1]);
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

  // ── 1. reabrir caso encerrado ───────────────────────────────────────────
  // cliente só com caso encerrado abre no Cadastro: força a aba do caso
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForTimeout(600);
  await p.evaluate(caso => { casoSel = caso;
    const m = document.getElementById("modal"); if (m) m.innerHTML = "";
    abaAtiva = 2; pintarFicha(); }, CASO1);
  await p.waitForTimeout(400);
  // F58: as ações moram no RODAPÉ do cartão — procura no cartão inteiro
  conf("o caso encerrado mostra o ↺ reabrir ao lado do carimbo",
    /reabrir/.test(await p.evaluate(() => document.querySelector(".fatos-processo").innerText)));
  escritos.length = 0;
  await p.evaluate(caso => reabrirCaso(caso), CASO1);
  await p.waitForTimeout(600);
  const patK = escritos.find(x => x.m === "PATCH" && x.t === "casos");
  conf("reabrir devolve o caso à lista de origem (INSS) e limpa o encerramento",
    patK && patK.corpo.fase === "inss" && patK.corpo.resultado === null
    && patK.corpo.encerrado_em === null);
  conf("com o registro de quem reabriu na linha do tempo",
    escritos.some(x => x.m === "POST" && x.t === "andamentos"
      && /reaberto/.test(x.corpo.texto) && x.corpo.autor_id === EU));
  conf("na memória, o caso voltou a andar",
    await p.evaluate(caso => D.casoPorId.get(caso).fase === "inss"
      && !D.casoPorId.get(caso).encerrado_em, CASO1));

  // ── 2. o lembrete volta à mesa ──────────────────────────────────────────
  // a mesa está recolhida (atendimento resolvido): o desfazer mora na aba
  // Lembretes, junto do próprio lembrete
  await p.evaluate(cli => abrirFicha(cli), CLI_VAZIO);
  await p.waitForTimeout(600);
  await p.evaluate(() => { abaAtiva = 9; pintarFicha(); });
  await p.waitForTimeout(400);
  conf("o lembrete vindo do atendimento oferece o ↺ voltar ao atendimento",
    /voltar ao atendimento/.test(await p.evaluate(() =>
      (document.querySelector('.painel[data-p="9"]') || {}).innerText || "")));
  escritos.length = 0;
  await p.evaluate(cli => voltarLembreteParaMesa(cli, "pcL"), CLI_VAZIO);
  await p.waitForTimeout(600);
  conf("o lembrete criado é desativado no banco",
    escritos.some(x => x.m === "PATCH" && x.t === "lembretes" && x.corpo.ativo === false));
  conf("e o pré-caso volta vivo para a mesa",
    await p.evaluate(cli => { const pc = precasosDe(D.cliPorId.get(cli)).find(p2 => p2.id === "pcL");
      return pc && !pc.so_lembrete; }, CLI_VAZIO));

  // ── 3. tirar → lixeira → restaurar ──────────────────────────────────────
  escritos.length = 0;
  await p.evaluate(cli => tirarPreCaso(cli, "pcL"), CLI_VAZIO);
  await p.waitForTimeout(500);
  conf("o pré-caso tirado vai para a lixeira do cadastro",
    await p.evaluate(cli => { const cp = D.cliPorId.get(cli).campos;
      return !precasosDe(D.cliPorId.get(cli)).length
        && cp.pc_lixeira && cp.pc_lixeira.pc.id === "pcL"; }, CLI_VAZIO));
  conf("a mesa oferece restaurar, dizendo a espécie e a data",
    /restaurar o pré-caso/.test(await p.evaluate(() =>
      (document.querySelector(".pc-bloco") || {}).innerText || ""))
    && /BPC\/LOAS/.test(await p.evaluate(() =>
      (document.querySelector(".pc-bloco") || {}).innerText || "")));
  await p.evaluate(cli => restaurarPreCaso(cli), CLI_VAZIO);
  await p.waitForTimeout(500);
  conf("restaurar repõe o pré-caso e esvazia a lixeira",
    await p.evaluate(cli => precasosDe(D.cliPorId.get(cli)).some(p2 => p2.id === "pcL")
      && !(D.cliPorId.get(cli).campos.pc_lixeira), CLI_VAZIO));

  // ── 4. entregue se desmarca ─────────────────────────────────────────────
  conf("o chip entregue avisa que o clique desfaz",
    /clique para desfazer/.test(await p.evaluate(() =>
      (document.querySelector(".caixa-atend") || {}).innerHTML || "")));
  escritos.length = 0;
  await p.evaluate(cli => docEntregue(cli, 0, 0), CLI_VAZIO);
  await p.waitForTimeout(500);
  conf("clicar no entregue por engano volta o item a pendência",
    escritos.some(x => x.m === "PATCH" && x.t === "clientes"
      && x.corpo.campos.docs_pedidos[0].itens[0].entregue === null));
  await p.evaluate(cli => docEntregue(cli, 0, 0), CLI_VAZIO);
  await p.waitForTimeout(400);
  conf("e marcar de novo funciona (o ciclo fecha)",
    await p.evaluate(cli => !!D.cliPorId.get(cli).campos.docs_pedidos[0].itens[0].entregue, CLI_VAZIO));

  // ── 5. anotação e registro do próprio autor ─────────────────────────────
  await p.evaluate(() => repintarFicha());
  await p.waitForTimeout(400);
  conf("a MINHA anotação tem o ×; a da colega não",
    await p.evaluate(() => {
      const lis = [...document.querySelectorAll(".caixa-atend .mov-lista li")];
      const minha = lis.find(li => /Minha anotação/.test(li.innerText));
      const dela = lis.find(li => /outra pessoa/.test(li.innerText));
      return minha && minha.querySelector("button[onclick^='apagarNota']")
        && dela && !dela.querySelector("button[onclick^='apagarNota']");
    }));
  escritos.length = 0;
  await p.evaluate(cli => apagarNotaAtendimento(cli, 0), CLI_VAZIO);
  await p.waitForTimeout(500);
  conf("apagar a minha anotação grava sem ela (a da colega fica)",
    escritos.some(x => x.m === "PATCH" && x.t === "clientes"
      && x.corpo.campos.atendimento.length === 1
      && /outra pessoa/.test(x.corpo.campos.atendimento[0].texto)));
  conf("apagar anotação dos outros é recusado",
    await p.evaluate(cli => { const antes = D.cliPorId.get(cli).campos.atendimento.length;
      apagarNotaAtendimento(cli, 0);   // agora a nota 0 é da Amanda
      return D.cliPorId.get(cli).campos.atendimento.length === antes; }, CLI_VAZIO));
  escritos.length = 0;
  await p.evaluate(cli => apagarRegistroAvulso(cli, 0), CLI_VAZIO);
  await p.waitForTimeout(500);
  conf("o registro avulso do próprio autor também se apaga",
    escritos.some(x => x.m === "PATCH" && x.t === "clientes"
      && x.corpo.campos.registros.length === 0));

  // ── 6. F36: de Lembretes também se GERA o caso ──────────────────────────
  // re-prepara: o pré-caso volta a "somente lembrete", com lembrete ativo
  await p.evaluate(cli => { const c = D.cliPorId.get(cli);
    const pcs = precasosDe(c).map(p2 => p2.id === "pcL" ? { ...p2, so_lembrete: true } : p2);
    c.campos = { ...(c.campos || {}), precasos: pcs };
    D.lembretes = [{ id: "lb000000-0000-0000-0000-000000000001", cliente_id: cli,
      tipo: "geral", titulo: "BPC/LOAS — atendimento virou lembrete", ativo: true,
      proximo_em: "2027-01-10", detalhes: { origem: "precaso", precaso_id: "pcL" } }];
    abaAtiva = 9; pintarFicha(); }, CLI_VAZIO);
  await p.waitForTimeout(400);
  conf("o lembrete oferece TAMBÉM o Gerar o caso",
    /Gerar o caso/.test(await p.evaluate(() =>
      (document.querySelector('.painel[data-p="9"]') || {}).innerText || "")));
  escritos.length = 0;
  await p.evaluate(cli => gerarCasoDoLembrete(cli, "pcL"), CLI_VAZIO);
  await p.waitForTimeout(900);
  const postK = escritos.find(x => x.m === "POST" && x.t === "casos");
  conf("gerar do lembrete cria o caso com a espécie do pré-caso",
    postK && postK.corpo.beneficio === "BPC/LOAS");
  conf("e a fase nunca cai em escritorio — sem o select da mesa, vai ao INSS",
    postK && postK.corpo.fase === "inss");
  conf("o lembrete se desativa ao gerar",
    escritos.some(x => x.m === "PATCH" && x.t === "lembretes" && x.corpo.ativo === false));
  conf("o pré-caso se encerra e some da lixeira de pendências",
    await p.evaluate(cli => !precasosDe(D.cliPorId.get(cli)).some(p2 => p2.id === "pcL"), CLI_VAZIO));
  conf("a ficha abre nos documentos da assinatura",
    await p.evaluate(() => subCad === "documentos"));

  console.log("=== a regra da volta (F35) + gerar do lembrete (F36) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
