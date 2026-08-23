// F13 — a Consulta sem iframe. Prova que a moldura acabou, que o CPF da ficha
// vai junto para a consulta externa, e que os anexos da IN 128 apontam para o
// portal do INSS.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CLI_VAZIO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

// F29: a Consulta vive dentro das Anotações, que exigem triagem
// encerrada no cliente sem caso — a fixtura entrega o vazio já triado
FIX.clientes[1] = { ...FIX.clientes[1], triagem: { atendimento:
  { em: "2026-08-01", quem: "11111111-1111-1111-1111-111111111111", passos: 8, conferidos: 8 } } };

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
    localStorage.setItem("crm_subcad", "consulta");
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

  const abrir = async id => {
    await p.evaluate(x => abrirFicha(x), id);
    await p.waitForSelector('button.mt[data-vv="0"]');
    await p.click('button.mt[data-vv="0"]');
    await p.evaluate(() => irSubCad("consulta"));
    await p.waitForSelector('.painel[data-p="0"].ativo .cad-cartao');
    await p.waitForTimeout(250);
  };

  await abrir(CLI_CHEIO);
  conf("a moldura acabou: nenhum iframe na tela",
    (await p.evaluate(() => document.querySelectorAll("iframe").length)) === 0);
  conf("nenhum iframe no arquivo inteiro",
    !/\<iframe/i.test(await p.evaluate(() => document.documentElement.outerHTML)));

  const cartoes = await p.evaluate(() =>
    [...document.querySelectorAll('.painel[data-p="0"].ativo .cad-tit')].map(x => x.innerText.split("\n")[0].trim()));
  conf(`três cartões, e não um site dentro do outro (${JSON.stringify(cartoes)})`,
    cartoes.length === 3 && /CPF DESTE CLIENTE/i.test(cartoes[0])
    && /IN 128/i.test(cartoes[1]));

  // o CPF vai junto
  const bts = await p.evaluate(() =>
    // :first-of-type conta entre irmãos do mesmo ELEMENTO e casaria com o
    // sub-menu, que também é div. O primeiro cartão sai por índice.
    [...document.querySelectorAll('.painel[data-p="0"].ativo .cad-cartao')[0]
      .querySelectorAll(".cad-mini")].map(b => ({ rot: b.innerText.trim(), off: b.disabled })));
  conf(`quatro portais com o CPF (${bts.map(b => b.rot).join(", ")})`,
    bts.length === 4 && bts.every(b => !b.off));

  await p.evaluate(() => { window.__abriu = []; window.open = (u) => { window.__abriu.push(u); return null; }; });
  await p.evaluate(() => document.querySelector('.painel[data-p="0"].ativo .cad-mini').click());
  await p.waitForTimeout(600);
  const abriu = await p.evaluate(() => window.__abriu);
  conf(`o botão abre o portal em aba nova (${JSON.stringify((abriu[0] || "").slice(0, 40))})`,
    abriu.length === 1 && /tse\.jus\.br/.test(abriu[0]));
  const copiado = await p.evaluate(() => navigator.clipboard.readText());
  conf(`e o CPF da ficha vai copiado (${JSON.stringify(copiado)})`, copiado === "123.456.789-09");
  conf("o aviso diz onde colar", /cole na busca do TSE/.test(await p.innerText("#aviso")));

  // os anexos da IN 128
  const anexos = await p.evaluate(() =>
    [...document.querySelectorAll('.painel[data-p="0"].ativo a[href*="portalin.inss.gov.br"]')]
      .map(a => ({ rot: a.innerText.trim(), href: a.href })));
  conf(`os quinze anexos mais o link do portal (${anexos.length})`, anexos.length === 16);
  conf("todo anexo aponta para o portal oficial, em .docx",
    anexos.filter(a => /\.docx$/.test(a.href)).length === 15);
  conf("a família do RAC está inteira",
    anexos.filter(a => /^RAC /.test(a.rot)).length === 6);
  conf("todos abrem em aba nova, sem levar o CRM junto",
    (await p.evaluate(() => [...document.querySelectorAll('.painel[data-p="0"].ativo a[href^="http"]')]
      .every(a => a.target === "_blank" && /noopener/.test(a.rel)))));

  // o site interno continua a um clique, e a tela diz por que não foi copiado
  const txt = await p.innerText('.painel[data-p="0"].ativo');
  conf("a tela explica por que as calculadoras não vieram para cá",
    /duas cópias da mesma conta/.test(txt));
  conf("as ferramentas do site estão nomeadas",
    /Calculadora de ruído/.test(txt) && /Simulador RPPS-SP/.test(txt) && /Indicadores do CNIS/.test(txt));
  await (await p.$(".det-rolagem")).screenshot({ path: path.join(__dirname, "f13-consulta.png") });

  // cliente sem CPF: os botões apagam e a tela diz o que fazer
  await abrir(CLI_VAZIO);
  const bts2 = await p.evaluate(() =>
    [...document.querySelectorAll('.painel[data-p="0"].ativo .cad-cartao')[0]
      .querySelectorAll(".cad-mini")].map(b => b.disabled));
  conf("sem CPF, os botões de consulta ficam apagados", bts2.length === 4 && bts2.every(Boolean));
  conf("e a tela diz onde preencher",
    /Preencha na\s+divisão Identificação/.test(await p.innerText('.painel[data-p="0"].ativo')));
  conf("os anexos continuam disponíveis, porque não dependem do cliente",
    (await p.evaluate(() => document.querySelectorAll('a[href*="portalin.inss.gov.br"]').length)) === 16);

  console.log("=== consulta (F13) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
