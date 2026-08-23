// F57 — o quadro "📅 Lembretes e datas" no caso: todas as datas do cliente
// numa lista em cima dos dados, cada uma com o date aberto (trocou, gravou),
// "✔ feito" resolvendo pelo fluxo oficial, e criação de lembrete ali mesmo.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const D0 = new Date(); const iso = d => d.toISOString().slice(0, 10);
const mais = n => { const d = new Date(D0); d.setDate(d.getDate() + n); return iso(d); };
const ONTEM3 = mais(-3), DAQUI2 = mais(2), DAQUI10 = mais(10), DAQUI20 = mais(20);

// CLI_CHEIO: nota datada vencida; lembrete ativo; prazo no caso; e uma nota
// GÊMEA de lembrete (mesmo título "Anotação: ...") que NÃO pode duplicar
FIX.clientes[0].campos = { ...(FIX.clientes[0].campos || {}), atendimento: [
  { em: "2026-08-01T10:00:00Z", quem: "Paulo", autor_id: EU,
    texto: "Cobrar o extrato fictício do banco.", lembrar_em: ONTEM3 },
  { em: "2026-08-02T10:00:00Z", quem: "Paulo", autor_id: EU,
    texto: "Nota gêmea que já virou lembrete.", lembrar_em: DAQUI10 },
] };
FIX.lembretes = FIX.lembretes || [];
FIX.lembretes.push(
  { id: "lb-57", cliente_id: CLI_CHEIO, tipo: "geral", titulo: "Rever documentos fictícios",
    proximo_em: DAQUI2, responsavel_id: EU, criado_por: EU, ativo: true },
  { id: "lb-57b", cliente_id: CLI_CHEIO, tipo: "geral",
    titulo: "Anotação: Nota gêmea que já virou lembrete.",
    proximo_em: DAQUI10, responsavel_id: EU, criado_por: EU, ativo: true });
FIX.casos[0].prazo = DAQUI20;

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
      escritos.push({ m, t, corpo });
      const rep = /return=representation/.test(JSON.stringify(rota.request().headers()));
      return rota.fulfill({ status: rep ? 201 : 204, contentType: "application/json",
        body: rep ? JSON.stringify([{ id: "n" + escritos.length, ...corpo }]) : "" });
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

  // abre a ficha do CLI_CHEIO no caso (o modal de 2 processos resolve)
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForTimeout(700);
  await p.evaluate(([cli, caso]) => { const m = document.getElementById("modal");
    if (m && m.style.display !== "none") escolhido(cli, caso); }, [CLI_CHEIO, CASO1]);
  await p.waitForTimeout(700);

  // 1) o quadro está no cartão do caso, DEPOIS da espécie e da linha da DER
  // (F69: a espécie é o código B no topo; o ➕ virou botão na linha da DER)
  conf("o quadro 📅 vem depois da espécie e da linha DER + ➕",
    await p.evaluate(() => { const q = document.getElementById("quadro-datas");
      const esp = document.querySelector(".fatos-processo .esp-cod");
      const der = document.querySelector(".fatos-processo .fx-linha-der");
      return q && esp && der &&
        !!(esp.compareDocumentPosition(q) & Node.DOCUMENT_POSITION_FOLLOWING) &&
        !!(der.compareDocumentPosition(q) & Node.DOCUMENT_POSITION_FOLLOWING); }));

  // 2) as quatro fontes aparecem, ordenadas, e a gêmea NÃO duplica
  const txt = await p.evaluate(() => document.getElementById("quadro-datas").textContent);
  conf("a anotação vencida aparece com a cobrança em vermelho",
    /venceu/.test(txt) && /extrato fictício/.test(txt));
  // F59: o responsável virou a bolinha colorida com a inicial (title = nome)
  conf("o lembrete aparece com o responsável (bolinha com o nome no title)",
    /Rever documentos fictícios/.test(txt) &&
    await p.evaluate(() => [...document.querySelectorAll("#quadro-datas .qd-linha")]
      .some(li => /Rever documentos fictícios/.test(li.textContent) &&
        li.querySelector('.avatar.mini[title*="Paulo"]'))));
  conf("o prazo fatal do caso está na lista",
    /PRAZO FATAL/.test(txt));
  conf("a nota gêmea de lembrete entra UMA vez só (sem eco)",
    (txt.match(/Nota gêmea que já virou lembrete/g) || []).length === 1);
  conf("as linhas estão em ordem de data (vencida primeiro)",
    await p.evaluate(() => { const ds = [...document.querySelectorAll("#quadro-datas .qd-data")]
        .map(i => i.value); return ds.length >= 3 && ds.every((d, i) => !i || ds[i-1] <= d); }));

  // 3) trocar a data da ANOTAÇÃO grava na hora (PATCH clientes)
  escritos.length = 0;
  await p.evaluate(([cli, quando]) => qdMudarNota(cli, 0, quando), [CLI_CHEIO, DAQUI2]);
  await p.waitForTimeout(500);
  conf("remarcar a anotação grava campos.atendimento com a data nova",
    escritos.some(x => x.m === "PATCH" && x.t === "clientes" &&
      (((x.corpo.campos || {}).atendimento || [])[0] || {}).lembrar_em === DAQUI2));

  // 4) trocar a data do LEMBRETE usa o fluxo oficial (adiarLembrete)
  escritos.length = 0;
  await p.evaluate(quando => adiarLembrete("lb-57", quando), DAQUI10);
  await p.waitForTimeout(500);
  conf("adiar o lembrete grava proximo_em novo",
    escritos.some(x => x.m === "PATCH" && x.t === "lembretes" && x.corpo.proximo_em === DAQUI10));

  // 5) trocar o PRAZO fatal grava no caso
  escritos.length = 0;
  await p.evaluate(([caso, quando]) => qdMudarPrazo(caso, quando), [CASO1, DAQUI10]);
  await p.waitForTimeout(500);
  conf("remarcar o prazo fatal grava casos.prazo",
    escritos.some(x => x.m === "PATCH" && x.t === "casos" && x.corpo.prazo === DAQUI10) &&
    await p.evaluate(caso => D.casoPorId.get(caso).prazo, CASO1) === DAQUI10);

  // 6) "✔ feito" do lembrete usa lembreteAvisado (único → desliga)
  escritos.length = 0;
  await p.evaluate(() => lembreteAvisado("lb-57", "manual"));
  await p.waitForTimeout(600);
  conf("o feito registra o aviso e desliga o lembrete único",
    escritos.some(x => x.m === "POST" && x.t === "lembrete_avisos") &&
    escritos.some(x => x.m === "PATCH" && x.t === "lembretes" && x.corpo.ativo === false));
  conf("desligado, o lembrete sai do quadro na repintura",
    await p.evaluate(() => !/Rever documentos fictícios/.test(
      document.getElementById("quadro-datas").textContent)));

  // F61: o quadro virou RESUMO — o criar saiu (as datas nascem nos
  // andamentos, na aba Lembretes e nas Perícias)
  conf("o rodapé de criar lembrete NÃO existe mais no quadro",
    await p.evaluate(() => !document.getElementById("qd-tit")));
  conf("as linhas têm a separação sutil (borda entre vizinhas)",
    await p.evaluate(() => { const ls = [...document.querySelectorAll("#quadro-datas .qd-linha")];
      if (ls.length < 2) return false;
      const b = getComputedStyle(ls[1]).borderTopWidth;
      return b && b !== "0px"; }));

  console.log("=== F57 · o quadro de datas do caso ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
