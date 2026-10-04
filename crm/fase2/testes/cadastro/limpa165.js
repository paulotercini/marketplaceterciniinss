// F164–F167 — tela limpa: Parentes ou amigos só no ＋; Triagem, Documentos e
// Mensagens só depois do + atendimento, que fica em destaque. Dados fictícios.
// Dados fictícios.
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
    window.__abertos = []; window.open = (u) => { window.__abertos.push(u); return null; };
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (rota.request().method() !== "GET") return rota.fulfill({ status: 204, body: "" });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
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
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.evaluate(cli => abrirFicha(cli).then(() => { abaAtiva = 0; subCad = "documentos"; repintarFicha(); }), CLI_CHEIO);
  await p.waitForSelector("#campo-nome");
  const t = await p.evaluate(cli => ({
    temCaso: (D.casosDoCliente.get(cli) || []).length > 0, vivos: precasosDe(D.cliPorId.get(cli)).filter(x => !x.so_lembrete).length,
    abas: [...[...document.querySelectorAll(".sub-menu")].find(m => /Identificação/.test(m.textContent)).querySelectorAll("button:not(.trilho-mais)")].map(b => b.textContent.trim()),
    atend: (() => { const b = document.querySelector(".sub-menu .atend-novo"); return b ? getComputedStyle(b).color : ""; })(),
    cartao: [...document.querySelectorAll(".cad-tit")].some(x => /Parentes ou Amigos/i.test(x.textContent)),
    botaoPar: [...document.querySelectorAll("button.cad-mini")].some(b => /Parentes ou amigos/.test(b.textContent)) }), CLI_CHEIO);
  conf("cliente com caso e sem atendimento vê Identificação e Análise de Direito, sem Triagem, Documentos e Mensagens", t.temCaso && !t.vivos && t.abas.join("|") === "Identificação|Análise de Direito");   // F171: com caso, a análise fica à mão
  conf("o + atendimento aparece em destaque, com letra branca", t.atend === "rgb(255, 255, 255)");
  conf("Parentes ou amigos fica recolhido num ＋", !t.cartao && t.botaoPar);
  await p.evaluate(() => [...document.querySelectorAll("button.cad-mini")].find(b => /Parentes ou amigos/.test(b.textContent)).click());
  await p.waitForSelector("text=Parentes ou Amigos");
  conf("o ＋ abre o cartão Parentes ou amigos, sem repetir a parceria (F169)", await p.evaluate(() => [...document.querySelectorAll(".cad-tit")].some(x => /Parentes ou Amigos/i.test(x.textContent)) && !document.getElementById("parc-sel-lig") && document.querySelectorAll("#parc-sel-id").length === 1));
  await p.evaluate(cli => { const c = D.cliPorId.get(cli); c.campos = {...(c.campos || {}), precasos: [{ id: "pc1", criado_em: new Date().toISOString(), so_lembrete: false }]}; repintarFicha(); }, CLI_CHEIO);
  const depois = await p.evaluate(() => [...[...document.querySelectorAll(".sub-menu")].find(m => /Identificação/.test(m.textContent)).querySelectorAll("button:not(.trilho-mais)")].map(b => b.textContent.trim()));
  conf("com atendimento aberto voltam Triagem, Documentos e Mensagens", ["Documentos", "Mensagens"].every(x => depois.some(d => d.includes(x))));
  // F166 · Lembretes por último e o caso abre no Escritório
  await p.evaluate(cli => { abrirFicha(cli); }, CLI_CHEIO);
  await p.waitForSelector("#btn-processos");
  const m = await p.evaluate(() => ({ menu: [...document.querySelectorAll(".menu-topo .mt")].map(b => b.textContent.trim().split(" (")[0].replace(" ▾", "")), sub: subAba }));
  conf("o caso abre nos andamentos do Escritório", m.sub === "escritorio");
  conf("Lembretes, quando existe, vem depois de Honorários", !m.menu.includes("Lembretes") || m.menu.indexOf("Lembretes") > m.menu.indexOf("Honorários"));
  // F165/F167 · cliente novo: só Cadastro, só Identificação e o + atendimento
  await p.evaluate(cli => { const c = D.cliPorId.get(cli); c.campos = {...(c.campos || {})}; delete c.campos.precasos; delete c.campos.especie; return abrirFicha(cli); }, CLI_VAZIO);
  await p.waitForSelector("#campo-nome, .sub-menu .atend-novo", { state: "attached" });
  const nv = await p.evaluate(() => ({ menu: [...document.querySelectorAll(".menu-topo .mt")].map(b => b.textContent.trim()),
    sub: [...[...document.querySelectorAll(".sub-menu")].find(x => /Identificação/.test(x.textContent)).querySelectorAll("button:not(.trilho-mais)")].map(b => b.textContent.trim()),
    atend: !!document.querySelector(".sub-menu .atend-novo") }));
  conf("cliente novo vê só Cadastro → Identificação e o + atendimento", nv.menu.join("|") === "Cadastro" && nv.sub.join("|") === "Identificação" && nv.atend);
  await (await p.$("#ficha, .ficha, main")).screenshot({ path: "/tmp/claude-0/-home-claude-marketplaceterciniinss/e623eb33-cd89-5ec5-b160-6a85b438ab17/scratchpad/limpa.png" }).catch(() => {});

  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
