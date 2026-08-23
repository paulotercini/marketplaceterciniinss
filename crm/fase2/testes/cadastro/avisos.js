// F10, a outra metade — o CadÚnico virando lembrete de verdade e o caso novo
// avisando quem decide.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_VAZIO, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

// mais dois colaboradores: um advogado (entra no padrão, junto com o EU das
// fixturas, que também é advogado) e uma estagiária (fica de fora).
const ADV = "11111111-1111-1111-1111-111111111112";
const EST = "11111111-1111-1111-1111-111111111113";
FIX.colaboradores.push(
  { id: ADV, nome: "Marcos Ficticio", inicial: "M", cor: "#8A4FBF", ativo: true, cargo: "advogado" },
  { id: EST, nome: "Ingrid Inventada", inicial: "I", cor: "#0A7D43", ativo: true, cargo: "estagiario" });

// um caso de BPC, para o CadÚnico valer
const CASO_BPC = "b0000000-0000-0000-0000-0000000000f1";
FIX.casos.push({ ...FIX.casos[0], id: CASO_BPC, cliente_id: CLI_VAZIO, fase: "inss",
  titulo: "BPC ao idoso", beneficio: "BPC LOAS ao idoso", especie: "B88", cadunico: null });

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
      const corpo = JSON.parse(rota.request().postData() || "{}");
      escritos.push({ m, t, corpo, url: u });
      // POST com return=representation precisa devolver a linha criada
      const rep = /return=representation/.test(JSON.stringify(rota.request().headers()));
      return rota.fulfill({ status: rep ? 201 : 204, contentType: "application/json",
        body: rep ? JSON.stringify([{ id: "novo-" + escritos.length, ativo: true, ...corpo }]) : "" });
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
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);

  const ok = []; const conf = (n, v) => ok.push([n, !!v]);

  // ── 1. CadÚnico vira lembrete ────────────────────────────────────────────
  await p.evaluate(id => salvarCadunico(id, "2026-08-10"), CASO_BPC);
  await p.waitForTimeout(600);
  const lemb = escritos.find(x => x.t === "lembretes" && x.m === "POST");
  conf("gravar a data do CadÚnico cria o lembrete", !!lemb);
  conf(`o lembrete repete a cada 24 meses (${lemb && lemb.corpo.intervalo_meses})`,
    lemb && lemb.corpo.intervalo_meses === 24);
  conf(`vence dois anos depois (${lemb && lemb.corpo.proximo_em})`,
    lemb && lemb.corpo.proximo_em === "2028-08-10");
  conf("nasce ligado ao caso que o gerou", lemb && lemb.corpo.origem_caso === CASO_BPC);
  conf("é do tipo CadÚnico", lemb && lemb.corpo.tipo === "cadunico");

  // mudar a data não cria um segundo: atualiza o que existe
  const antes = escritos.filter(x => x.t === "lembretes").length;
  await p.evaluate(id => salvarCadunico(id, "2026-08-12"), CASO_BPC);
  await p.waitForTimeout(600);
  const depois = escritos.filter(x => x.t === "lembretes");
  conf("mudar a data não cria um segundo lembrete",
    depois.length === antes + 1 && depois[depois.length - 1].m === "PATCH");
  conf(`a atualização move o vencimento (${depois[depois.length - 1].corpo.proximo_em})`,
    depois[depois.length - 1].corpo.proximo_em === "2028-08-12");

  // apagar a data desliga o lembrete
  await p.evaluate(id => salvarCadunico(id, ""), CASO_BPC);
  await p.waitForTimeout(600);
  const desliga = escritos.filter(x => x.t === "lembretes").pop();
  conf("apagar a data desliga o lembrete", desliga.m === "PATCH" && desliga.corpo.ativo === false);

  // a mensagem do lembrete é a mesma do CadÚnico, não uma segunda versão
  const msg = await p.evaluate(([casoId, cliId]) => {
    const k = D.casoPorId.get(casoId); k.cadunico = "2026-08-10";
    return msgLembrete({ tipo: "cadunico", origem_caso: casoId, titulo: "CadÚnico" },
                       D.cliPorId.get(cliId));
  }, [CASO_BPC, CLI_VAZIO]);
  conf("o lembrete usa a mensagem do CRAS que já existia",
    /CRAS/.test(msg) && /ATUALIZAÇÃO CADASTRAL/.test(msg));

  // ── 2. caso novo avisa quem decide ───────────────────────────────────────
  const quem = await p.evaluate(() => quemAvisaCasoNovo().map(c => c.nome).sort());
  conf(`sem escolha gravada, avisa os dois advogados (${JSON.stringify(quem)})`,
    quem.join("|") === "Marcos Ficticio|Paulo Tercini");

  escritos.length = 0;
  // novoCaso lê três campos do formulário da ficha; o arnês os fornece
  await p.evaluate(() => {
    const cx = document.createElement("div");
    cx.innerHTML = `<input id="nk-ben" value="Aposentadoria por idade rural">
      <select id="nk-fase"><option value="inss" selected>inss</option></select>
      <input id="nk-prazo" value="">`;
    document.body.appendChild(cx);
  });
  await p.evaluate(id => novoCaso(id), CLI_VAZIO);
  await p.waitForTimeout(800);
  const mencoes = escritos.filter(x => x.t === "mencoes");
  conf(`caso novo gera menção para o advogado (${mencoes.length})`, mencoes.length === 1);
  conf("a menção vai para o advogado, não para a estagiária",
    mencoes[0] && mencoes[0].corpo.para_id === ADV);
  conf("quem criou não se avisa", !mencoes.some(x => x.corpo.para_id === EU));
  conf(`a menção diz o que nasceu (${JSON.stringify((mencoes[0] || {}).corpo && mencoes[0].corpo.texto)})`,
    mencoes[0] && /^Caso novo: /.test(mencoes[0].corpo.texto)
    && /aberto na ficha do cliente/.test(mencoes[0].corpo.texto));

  // a escolha gravada manda mais que o padrão
  await p.evaluate(id => { D.config.set("avisar_caso_novo", id); }, EST);
  const quem2 = await p.evaluate(() => quemAvisaCasoNovo().map(c => c.nome));
  conf(`a escolha gravada substitui o padrão (${JSON.stringify(quem2)})`,
    quem2.length === 1 && quem2[0] === "Ingrid Inventada");

  // ── 3. a tela de Configurações mostra e grava a escolha ──────────────────
  // o caso criado deixou o cliente com dois ativos, e o modal "escolher
  // processo" ficou por cima da tela (trava conhecida, cowork/04)
  await p.evaluate(() => {
    const m = document.getElementById("modal");
    if (m) { m.style.display = "none"; m.innerHTML = ""; }
    fecharFicha(false);
    D.config.delete("avisar_caso_novo"); visao = "config"; render();
  });
  await p.waitForTimeout(700);
  const marcados = await p.evaluate(() =>
    [...document.querySelectorAll("[data-casonovo]")].map(x => ({ id: x.dataset.casonovo, on: x.checked })));
  conf(`Configurações marca os advogados, não a estagiária (${marcados.filter(x => x.on).length} de ${marcados.length})`,
    marcados.length === 3 && marcados.filter(x => x.on).length === 2
    && marcados.find(x => x.id === ADV).on && !marcados.find(x => x.id === EST).on);
  escritos.length = 0;
  await p.click(`[data-casonovo="${EST}"]`);
  await p.waitForTimeout(600);
  const cfg = escritos.find(x => x.t === "config_app");
  conf(`marcar mais alguém grava os três na chave (${cfg && cfg.corpo.valor.split(",").length})`,
    cfg && cfg.corpo.chave === "avisar_caso_novo"
    && cfg.corpo.valor.split(",").sort().join() === [EU, ADV, EST].sort().join());
  await (await p.$("#conteudo-meio")).screenshot({ path: path.join(__dirname, "f10-config.png") });

  console.log("=== avisos (F10, 2ª metade) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
