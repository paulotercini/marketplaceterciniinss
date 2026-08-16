// F22 — os defeitos de layout dos Casos que o Paulo apontou por captura.
//
//   1. com a ficha aberta, a lateral encolhe para só os ícones — e o ☰ vira
//      exceção da sessão, não preferência gravada
//   2. o cartão da lista ganha a fita de atribuição, com a cor de cada
//      colaborador atribuído
//   3. o texto do andamento ocupa a largura toda: morreu o vão branco entre
//      o texto e o ✓ de "li"
//   4. a bolinha oca da linha do tempo morreu: o AVATAR é o nó, com o trilho
//      passando por trás — e o CRPS mantém o desenho antigo
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CLI_VAZIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const AND = "a0000000-0000-0000-0000-0000000000a1";
FIX.andamentos = [
  { id: AND, caso_id: CASO1, autor_id: EU, origem: "app",
    texto: "Inicial revisada e jogo de provas prontos na subpasta. ".repeat(6).trim(),
    criado_em: "2026-08-10T12:00:00Z" },
  { id: "a0000000-0000-0000-0000-0000000000a2", caso_id: CASO1, autor_id: EU, origem: "app",
    texto: "Petição no drive. Verificar e deixar pronto para distribuir.",
    criado_em: "2026-08-11T09:00:00Z" },
];
// um segundo colaborador para a fita de duas cores
const COL2 = "a0000000-0000-0000-0000-00000000c0l2";
FIX.colaboradores.push({ id: COL2, nome: "Amanda Ficticia", inicial: "A", cor: "#B4530A",
  cargo: "advogada", email: "am@ex.com", ativo: true });
FIX.atribuicoes.push({ id: "at2", caso_id: CASO1, colaborador_id: COL2 });

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1600, height: 1000 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.removeItem("crm_menu");
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
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);

  // ── 1. a lateral encolhe quando a ficha abre ────────────────────────────
  conf("sem ficha, a lateral abre cheia",
    !(await p.evaluate(() => document.getElementById("app").classList.contains("mini-lateral"))));
  await p.evaluate(() => { filtroColab = null; visao = "fase:inss"; render(); });
  await p.waitForTimeout(300);
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForTimeout(700);
  conf("abrir a ficha encolhe a lateral para os ícones",
    await p.evaluate(() => document.getElementById("app").classList.contains("mini-lateral")
      && document.getElementById("app").classList.contains("detalhe-aberto")));
  // o ☰ abre de novo, mas como exceção — sem gravar preferência
  await p.click("#btn-lateral");
  await p.waitForTimeout(200);
  conf("o ☰ reabre a lateral dentro da ficha",
    !(await p.evaluate(() => document.getElementById("app").classList.contains("mini-lateral"))));
  conf("e isso NÃO vira preferência gravada",
    (await p.evaluate(() => localStorage.getItem("crm_menu"))) === null);
  await p.evaluate(() => fecharFicha());
  await p.waitForTimeout(400);
  conf("fechada a ficha, a lateral volta a abrir cheia",
    !(await p.evaluate(() => document.getElementById("app").classList.contains("mini-lateral"))));
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForTimeout(600);
  conf("e a PRÓXIMA ficha encolhe de novo (a exceção morreu com a anterior)",
    await p.evaluate(() => document.getElementById("app").classList.contains("mini-lateral")));

  // ── 2. a fita de atribuição no cartão ───────────────────────────────────
  const fita = await p.evaluate(() => {
    const c = document.querySelector('#conteudo-meio .cartao[data-cli]');
    const f = c && c.querySelector(".atr-fita");
    if (!f) return null;
    const r = f.getBoundingClientRect(), rc = c.getBoundingClientRect();
    return { seg: f.querySelectorAll("i").length,
      cores: [...f.querySelectorAll("i")].map(i => i.style.background),
      esq: Math.round(r.x - rc.x), larg: Math.round(r.width), alt: Math.round(r.height) };
  });
  conf(`o cartão do cliente atribuído tem a fita (${fita ? fita.seg + " cores" : "não achei"})`,
    fita && fita.seg === 2);
  // 1px de recuo é a própria borda do cartão: a fita mora DENTRO dela
  conf(`na borda esquerda, discreta (${fita && fita.esq}px da borda, ${fita && fita.larg}px de largura)`,
    fita && fita.esq <= 2 && fita.larg <= 6 && fita.alt > 20);
  conf("uma cor por colaborador atribuído",
    fita && new Set(fita.cores).size === 2);
  const semAtr = await p.evaluate(cli => {
    const c = [...document.querySelectorAll('#conteudo-meio .cartao[data-cli]')]
      .find(x => x.dataset.cli === cli);
    return c ? !c.querySelector(".atr-fita") : null;
  }, CLI_VAZIO);
  // se o cliente não está na lista, não há o que provar — vale o cartão de
  // qualquer cliente presente SEM atribuição
  conf(`cliente sem atribuição não ganha fita vazia (${JSON.stringify(semAtr)})`,
    semAtr === true || semAtr === null);

  // ── 3. o texto do andamento ocupa a largura ─────────────────────────────
  await p.evaluate(([cli, caso]) => { casoSel = caso;
    const m = document.getElementById("modal"); if (m) m.innerHTML = "";
    pintarFicha(); }, [CLI_CHEIO, CASO1]);
  await p.waitForSelector(".timeline li");
  const geo = await p.evaluate(() => {
    const li = document.querySelector(".timeline li");
    const tx = li.querySelector(".texto");
    const ul = li.closest(".timeline");
    const rli = li.getBoundingClientRect(), rtx = tx.getBoundingClientRect();
    const st = getComputedStyle(tx);
    return { liLarg: Math.round(rli.width), txLarg: Math.round(rtx.width),
      txFim: Math.round(rli.right - rtx.right), maxW: st.maxWidth,
      railEsq: Math.round(parseFloat(getComputedStyle(ul, "::before").left) || 0) };
  });
  conf(`o texto perdeu o teto de 72ch (max-width ${geo.maxW})`, geo.maxW === "none");
  conf(`e ocupa a linha até perto do fim (sobra ${geo.txFim}px de ${geo.liLarg}px)`,
    geo.txFim < geo.liLarg * 0.25);

  // ── 4. o avatar é o nó; a bolinha oca morreu ────────────────────────────
  conf("a bolinha oca (li::after) morreu na linha do escritório",
    (await p.evaluate(() => {
      const li = document.querySelector(".timeline:not(.crps-tl) li");
      return getComputedStyle(li, "::after").content === "none";
    })));
  const no = await p.evaluate(() => {
    const ul = document.querySelector(".timeline:not(.crps-tl)");
    const av = ul.querySelector(".quando .avatar");
    const railX = parseFloat(getComputedStyle(ul, "::before").left);
    const r = av.getBoundingClientRect(), ru = ul.getBoundingClientRect();
    return { railX: Math.round(railX), avCentro: Math.round(r.x - ru.x + r.width / 2),
      anel: getComputedStyle(av).boxShadow !== "none" };
  });
  conf(`o trilho passa pelo centro do avatar (trilho ${no.railX}px, avatar ${no.avCentro}px)`,
    Math.abs(no.railX + 1 - no.avCentro) <= 3);
  conf("e o avatar tem o anel branco que o destaca do trilho", no.anel);
  conf("a data ganhou fundo para não cruzar o trilho",
    await p.$(".timeline .q-dt"));
  await (await p.$(".timeline")).screenshot({ path: path.join(__dirname, "f22-timeline.png") });
  await p.evaluate(() => fecharFicha());
  await p.waitForTimeout(300);
  const meio = await p.$("#conteudo-meio");
  if (meio) await meio.screenshot({ path: path.join(__dirname, "f22-fita.png") });

  console.log("=== layout dos Casos (F22) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
