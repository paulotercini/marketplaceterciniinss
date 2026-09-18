// F84/F104 — OS QUADROS DE PRAZO (tema v10). Os prazos são o que o escritório não
// pode perder: no tema, o quadro de datas sai de dentro do cartão e vira o
// primeiro bloco da coluna da esquerda, com os PRAZOS no topo (fatal,
// exigência do INSS, recorrer até, DCB), vencido em vermelho e os 7 dias
// seguintes em âmbar. Desligado, o quadro segue dentro do cartão.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

// as datas da fixtura seguem o fuso do app (São Paulo, -03): à noite, o dia
// de UTC já virou e um "ontem" ingênuo cairia no hoje de SP — a prova
// quebrava sozinha depois das 21h, sem nada ter mudado no programa
const hojeSP = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const emDias = n => new Date(new Date(hojeSP() + "T12:00:00Z").getTime() + n * 864e5).toISOString().slice(0, 10);
const mais = emDias;
const fmtBR = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
FIX.casos[0] = { ...FIX.casos[0], prazo: mais(-1), exigencia_prazo: mais(3), decisao_em: mais(-10) };
FIX.eventos = [{ id: "e0000000-0000-0000-0000-00000000f841", caso_id: CASO1, tipo: "Perícia",
  data_hora: mais(12) + "T09:30:00", local: "JEF", status: "agendada" }];

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (rota.request().method() !== "GET") return rota.fulfill({ status: 204, body: "" });
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error" && !/ERR_FAILED/.test(m.text())) erros.push("console: " + m.text()); });
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const abrir = async (q) => {
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html${q}`);
    await p.waitForSelector("#app.logado");
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
    await p.evaluate(async (a) => { await abrirFicha(a.cli); casoSel = a.id; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); }, { cli: CLI_CHEIO, id: CASO1 });
    await p.waitForTimeout(200);
  };
  const ler = () => p.evaluate(() => {
    const faixa = document.querySelector(".faixa-prazos");
    const qd = document.querySelector("#quadro-datas");
    const dentroDoCartao = !!qd && !!qd.closest(".fatos-processo");
    const cards = [...document.querySelectorAll(".faixa-prazos .pz")].map(c => ({
      tipo: c.dataset.tipo, data: c.querySelector(".pz-data").textContent, prazo: c.classList.contains("pz-fatal"),
      fundo: getComputedStyle(c).backgroundColor, mais: !!c.querySelector(".pz-mais") }));
    const acima = faixa && document.querySelector(".escrever") && faixa.getBoundingClientRect().bottom <= document.querySelector(".escrever").getBoundingClientRect().top + 1;
    return { faixa: !!faixa, dentroDoCartao, cards, acima, linhaCaso: !!document.querySelector(".linha-caso") };
  });

  await abrir("?tema=v10");
  const on = await ler();
  conf("ligado: os prazos viraram QUADROS lado a lado, fora do cartão", on.faixa && !on.dentroDoCartao);
  conf("os quadros ficam acima do compositor (o trabalho vem depois)", on.acima);
  conf("o prazo fatal SEM anotação de origem não vira quadro (pedido do Paulo)", !on.cards.some(c => c.data === fmtBR(mais(-1))));
  conf("a exigência do INSS é um quadro de PRAZO FATAL, em vermelho", on.cards.some(c => c.tipo === "Prazo fatal" && c.data === fmtBR(mais(3)) && c.prazo && c.fundo === "rgb(179, 38, 30)"));
  conf("recorrer até (30 dias da decisão) entrou como quadro de prazo", on.cards.filter(c => c.prazo).length === 2);
  conf("a perícia marcada é um quadro cinza, depois dos prazos", (i => i > 0 && !on.cards[i].prazo && on.cards[i].fundo !== "rgb(179, 38, 30)")(on.cards.findIndex(c => c.tipo === "Perícia")));
  conf("os prazos vêm todos antes dos lembretes", on.cards.map(c => c.prazo ? 1 : 0).join("") === "11" + "0".repeat(on.cards.length - 2));
  conf("cada quadro tem só a data e o 'saber mais'", on.cards.every(c => c.mais) && on.cards.every(c => /^\d\d\/\d\d\/\d{4}$/.test(c.data)));
  // o "saber mais" da exigência abre a ficha dela, com o ✔ cumprida
  await p.evaluate(() => document.querySelector(".faixa-prazos .pz-fatal .pz-mais").click());
  await p.waitForTimeout(200);
  conf("o 'saber mais' da exigência traz o que é e o ✔ cumprida", await p.evaluate(() => {
    const m = document.getElementById("modal"); return /Exigência do INSS/.test(m.textContent) && !!m.querySelector('button[onclick^="cumprirExigencia"]'); }));
  await p.evaluate(() => fecharCaixa());

  await abrir("?tema=");
  const off = await ler();
  conf("desligado: sem quadros, o quadro de datas segue dentro do cartão", !off.faixa && off.dentroDoCartao && !off.linhaCaso);
  conf("desligado: exigência e recorrer NÃO entram no quadro (ficam nos chips)", await p.evaluate(() => ![...document.querySelectorAll("#quadro-datas .qd-linha")].some(l => /xigência do INSS|Recorrer até/.test(l.textContent))));

  for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
