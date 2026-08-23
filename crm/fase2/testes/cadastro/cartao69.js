// F69 — a faxina do cartão do caso: espécie B na frente do nome (✎ com a
// lista), acompanhamento sem rótulo, DER + ➕ na mesma linha (protocolo
// dentro do mais), prazo fatal em destaque no quadro, frase curta do vazio
// e a linha do Responsável FORA do cartão.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CLI_VAZIO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const D0 = new Date(); const iso = d => d.toISOString().slice(0, 10);
const mais = n => { const d = new Date(D0); d.setDate(d.getDate() + n); return iso(d); };
FIX.casos[0].prazo = mais(3);   // um prazo fatal FUTURO — o destaque não depende de vencer

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
      if (m === "PATCH") {
        const id = (u.match(/id=eq\.([^&]+)/) || [])[1];
        const alvo = (FIX[t] || []).find(x => x.id === id);
        if (alvo) Object.assign(alvo, corpo);
      }
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

  await p.evaluate(([cli, caso]) => { abrirFicha(cli).then(() => {
    const m = document.getElementById("modal"); if (m) { m.style.display = "none"; m.innerHTML = ""; }
    casoSel = caso; abaAtiva = 2; pintarFicha(); }); }, [CLI_CHEIO, CASO1]);
  await p.waitForTimeout(900);

  // 1) a espécie mora na frente do nome; o quadro ESPÉCIE sumiu
  conf("o código B da espécie está no topo, ao lado do nome",
    await p.evaluate(caso => { const e = document.getElementById(`fx-especie-${caso}`);
      return e && e.closest(".fatos-topo") && /B41/.test(e.textContent); }, CASO1));
  conf("o quadrão antigo da ESPÉCIE não existe mais",
    await p.evaluate(() => ![...document.querySelectorAll(".fatos-processo dt")]
      .some(d => d.textContent.trim() === "Espécie")));
  // 2) acompanhamento sem rótulo, só os chips + ✓
  conf("o acompanhamento perdeu o rótulo escrito (só Manual/Automático + ✓)",
    await p.evaluate(() => { const f = document.querySelector(".fx-acomp");
      return f && !/ACOMPANHAMENTO/i.test(f.textContent) &&
        /Manual/.test(f.textContent) && /Automático/.test(f.textContent) &&
        !!f.querySelector(".acomp-check"); }));

  // 3) DER + ➕ na mesma linha; protocolo só dentro do mais
  conf("o ➕ mais informações fica logo abaixo da DER (F70)",
    await p.evaluate(() => { const der = document.querySelector('.fatos-processo [data-fato="der"]');
      const bt = document.querySelector(".fatos-processo .fx-mais-bt");
      return der && bt &&
        !!(der.compareDocumentPosition(bt) & Node.DOCUMENT_POSITION_FOLLOWING); }));
  conf("nenhuma frase explicativa quando a espécie não tem marcador (F70)",
    await p.evaluate(() => !/já diz o que é o pedido/.test(
      document.querySelector(".fatos-processo").textContent)));
  conf("fechado, o protocolo não aparece no cartão",
    await p.evaluate(() => !document.querySelector(".fatos-processo .fx-prot")));
  await p.evaluate(() => document.querySelector(".fx-mais-bt").click());
  await p.waitForTimeout(500);
  conf("aberto o mais, o protocolo aparece (com NB e etapas anteriores)",
    await p.evaluate(() => { const c = document.querySelector(".fx-mais-corpo");
      return c && [...c.querySelectorAll(".fx-prot")].some(x => /1234567890/.test(x.textContent)); }));
  await p.evaluate(() => document.querySelector(".fx-mais-bt").click());
  await p.waitForTimeout(400);

  // 4) o quadro: prazo fatal destacado mesmo SEM vencer + frase curta no vazio
  conf("a tarefa com prazo salta aos olhos (qd-prazo) mesmo antes de vencer",
    await p.evaluate(() => { const li = document.querySelector("#quadro-datas .qd-linha.qd-prazo");
      return li && /PRAZO FATAL/.test(li.textContent); }));

  // 5) o Responsável saiu; documentos e ações continuam
  conf("a linha do Responsável não existe mais no cartão",
    await p.evaluate(() => { const pe = document.querySelector(".fatos-pe");
      return pe && !/Responsável/.test(pe.textContent) && !pe.querySelector(".fx-av"); }));
  conf("o 📎 Documentos solicitados e as ações do fim continuam",
    await p.evaluate(() => { const s2 = document.querySelector(".fatos-processo");
      return /Documentos solicitados/.test(s2.textContent) &&
        /não é caso/.test(s2.textContent) && /Encerrar caso/.test(s2.textContent); }));

  // 6) o ✎ abre o editor com a lista das espécies cabíveis (por último: o
  // Escape dispara abrirFicha e repintaria no meio das outras provas)
  conf("o ✎ abre o editor com a lista das espécies cabíveis",
    await p.evaluate(caso => { editarFato(caso, "especie");
      const inp = document.querySelector(`#fx-especie-${caso} input`);
      return inp && inp.getAttribute("list") === "lista-especies" &&
        !!document.getElementById("lista-especies"); }, CASO1));
  await p.keyboard.press("Escape");
  await p.waitForTimeout(500);

  // 7) cliente SEM data: a frase curta
  await p.evaluate(cli => { abrirFicha(cli).then(() => { abaAtiva = 2; pintarFicha(); }); }, CLI_VAZIO);
  await p.waitForTimeout(700);
  conf("sem data nenhuma, o quadro diz só 'Nenhuma data marcada para este cliente.'",
    await p.evaluate(() => { const q = document.getElementById("quadro-datas");
      return !q || (/Nenhuma data marcada para este cliente\./.test(q.textContent) &&
        !/as datas nascem/.test(q.textContent)); }));

  console.log("=== F69 · a faxina do cartão ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
