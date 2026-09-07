// F83 — a barra lateral no tema v10: três grupos com título (o primeiro,
// "Trabalho de hoje", nasce por CSS, sem tocar o markup), contadores como
// sempre, e o contador do Meu Dia em VERMELHO quando há prazo vencido. Com
// o tema desligado nada muda: a classe .venc existe, mas não pinta.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const ontem = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
FIX.casos[0] = { ...FIX.casos[0], prazo: ontem };   // um caso com prazo VENCIDO

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
    await p.waitForTimeout(200);
  };
  const ler = () => p.evaluate(() => {
    const cs = getComputedStyle(document.getElementById("grupo-dinamicas"), "::before");
    const cont = document.querySelector('.lista-item[data-v="meudia"] .cont');
    const titulos = [...document.querySelectorAll(".sidebar .grupo h3")].map(h => h.textContent.trim());
    return { antes: cs.content, cor: cont ? getComputedStyle(cont).color : null, venc: !!cont && cont.classList.contains("venc"),
      titulo: cont ? cont.title : "", titulos, grupos: document.querySelectorAll(".sidebar .grupo").length,
      itens: document.querySelectorAll(".sidebar .lista-item").length, vencidos: quantosVencidos() };
  });

  await abrir("?tema=v10");
  const on = await ler();
  conf("ligado: o primeiro grupo diz 'Trabalho de hoje' (por CSS)", /Trabalho de hoje/.test(on.antes));
  conf("os outros dois títulos continuam", on.titulos.join("|") === "Listas do escritório|Visões");
  conf("são três grupos", on.grupos === 3);
  conf("o caso com prazo de ontem conta como vencido", on.vencidos === 1);
  conf("o contador do Meu Dia leva a classe venc e o título", on.venc && /1 vencida/.test(on.titulo));
  conf("e fica VERMELHO (#B3261E)", on.cor === "rgb(179, 38, 30)");
  const nItens = on.itens;

  await abrir("?tema=");
  const off = await ler();
  conf("desligado: sem título por CSS no primeiro grupo", off.antes === "none" || off.antes === "normal" || off.antes === '""');
  conf("desligado: a classe existe mas o contador NÃO fica vermelho", off.venc && off.cor !== "rgb(179, 38, 30)");
  conf("desligado: mesma quantidade de itens no menu", off.itens === nItens);

  for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
