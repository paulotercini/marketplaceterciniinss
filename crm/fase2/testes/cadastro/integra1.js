// Integração, etapa 1 — contrato pela espécie do caso, triagem como leitura
// na Análise, parceria e CNIS com fonte única, andamento da Análise no caso.
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
    if (rota.request().method() === "POST" && /\/rest\/v1\/andamentos\b/.test(u)) {
      const b = JSON.parse(rota.request().postData() || "{}");
      return rota.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify([{ id: "and-novo", criado_em: new Date().toISOString(), ...b }]) });
    }
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

  // 1 · o contrato lê a espécie do caso, não o benefício escrito à mão
  const esp = await p.evaluate(cli => { const c = D.cliPorId.get(cli), ks = D.casosDoCliente.get(cli) || [], k = ks[0];
    const antes = { b: k.beneficio, e: k.especie, s: k.subespecie };
    k.beneficio = "Auxílio-doença"; k.especie = "B42"; k.subespecie = null; casoSel = k.id;
    const r1 = { esp: especieDoContrato(c, ks), tit: tituloCaso(k), vr: variantePorEspecie(especieDoContrato(c, ks)), ct: contratoDoCliente(c, ks).especie };
    k.especie = null;
    const r2 = especieDoContrato(c, ks);
    Object.assign(k, { beneficio: antes.b, especie: antes.e, subespecie: antes.s });
    return { ...r1, semEsp: r2 }; }, CLI_CHEIO);
  conf(`o contrato e o termo seguem o título do caso (${esp.esp} · ${esp.vr})`, esp.esp === esp.tit && esp.ct === esp.tit && esp.vr === "padrao");
  conf("sem espécie, vale o benefício escrito", esp.semEsp === "Auxílio-doença");

  // 2 · a triagem fica na Análise como leitura, no desenho dos outros quadros
  await p.evaluate(() => { abaAtiva = 0; subCad = "direito"; repintarFicha(); });
  await p.waitForSelector(".ad-q-anot");
  const tri = await p.evaluate(cli => { const orig = window.feedTriagem;
    window.feedTriagem = () => ({ atencao: [{ rot: "Vínculo", texto: "Empregada doméstica sem registro.", quem: "Amanda", em: "2026-09-20" }], pendente: [], ok: [] });
    const h = quadroTriagemDireito(D.cliPorId.get(cli), D.casosDoCliente.get(cli)); window.feedTriagem = orig; return h; }, CLI_CHEIO);
  conf("o quadro da triagem é cartão de leitura, sem campo de edição", /adr-card ad-q-tri/.test(tri) && /O que se apurou na triagem/.test(tri) && !/<(input|textarea|select)/.test(tri));

  // 3 · parceria e CNIS: a Análise mostra e leva à Identificação
  const par = await p.evaluate(() => { const t = document.querySelector('.painel[data-p="0"] .ad-topo'); return { sel: !!t.querySelector("select"), txt: t.textContent }; });
  conf("a Análise não tem mais o seletor de parceria duplicado", !par.sel && /CNIS/.test(par.txt) && /Alterar na Identificação/.test(par.txt));
  await p.evaluate(() => [...document.querySelectorAll('.painel[data-p="0"] .ad-topo button')].find(b => /Alterar na Identificação/.test(b.textContent)).click());
  await p.waitForTimeout(250);
  conf("o botão leva à Identificação, onde a parceria se altera", await p.evaluate(() => subCad === "identificacao" && !!document.getElementById("parc-sel-id")));

  // 4 · o andamento da Análise vai para o caso ativo, marcado
  await p.evaluate(() => { subCad = "direito"; repintarFicha(); });
  await p.waitForSelector("#ad-anot", { state: "attached" });
  await p.fill("#ad-anot", "Explicada a regra de transição por pontos.");
  const req = p.waitForRequest(r => r.method() === "POST" && /\/rest\/v1\/andamentos/.test(r.url()));
  await p.click(".ad-q-anot button.btn-mini");
  const env = JSON.parse((await req).postData() || "{}");
  const caso1 = await p.evaluate(cli => (D.casosDoCliente.get(cli) || []).filter(k => k.fase !== "encerrado").map(k => k.id), CLI_CHEIO);
  conf("com caso ativo, o andamento grava no caso, marcado como da Análise", caso1.includes(env.caso_id) && /^⚖️ Análise · Explicada/.test(env.texto) && env.origem === "app");
  await p.waitForTimeout(300);
  conf("e aparece no quadro Andamentos da Análise", /regra de transição por pontos/.test(await p.textContent(".ad-q-anot")));
  conf("e na linha do tempo do caso", await p.evaluate(() => (D._andsFicha || []).some(a => /^⚖️ Análise · Explicada/.test(a.texto))));

  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
