// F56 — o "Concluir em" do To Do no CRM: a ficha mostra UMA data de volta
// (calculada de lembretes, anotações datadas, prazos e agendamentos),
// vencida cobra em vermelho, futura avisa em azul, ausência denuncia em
// cinza — e a nota com data vencida entra sozinha nas Pendências.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CLI_VAZIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

// datas relativas a hoje (o teste não pode apodrecer)
const D0 = new Date(); const iso = d => d.toISOString().slice(0, 10);
const mais = n => { const d = new Date(D0); d.setDate(d.getDate() + n); return iso(d); };
const ONTEM5 = mais(-5), ONTEM2 = mais(-2), DAQUI3 = mais(3), DAQUI9 = mais(9);

// CLI_VAZIO: uma nota vencida (5 dias), uma futura (3 dias), uma resolvida
// com data antiga (não cobra) — a pílula deve cobrar a VENCIDA
FIX.clientes[1].campos = { atendimento: [
  { em: "2026-07-01T10:00:00Z", quem: "Paulo", autor_id: EU,
    texto: "Pedir a certidão fictícia ao cartório.", lembrar_em: ONTEM5 },
  { em: "2026-07-02T10:00:00Z", quem: "Paulo", autor_id: EU,
    texto: "Ligar contando o andamento.", lembrar_em: DAQUI3 },
  { em: "2026-06-01T10:00:00Z", quem: "Paulo", autor_id: EU,
    texto: "Nota antiga já resolvida.", lembrar_em: ONTEM2,
    resolvida: { em: "2026-08-01", quem: "Paulo" } },
] };
// CLI_CHEIO: sem nota datada; um lembrete ativo daqui a 9 dias E o prazo do
// caso daqui a 3 — o prazo (menor data) deve ganhar a pílula
FIX.lembretes = FIX.lembretes || [];
FIX.lembretes.push({ id: "lb-56", cliente_id: CLI_CHEIO, tipo: "geral",
  titulo: "Rever contribuições fictícias", proximo_em: DAQUI9,
  responsavel_id: EU, criado_por: EU, ativo: true });
FIX.casos[0].prazo = DAQUI3;

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

  // ── o motor: proximaDataDe escolhe certo ────────────────────────────────
  const pdV = await p.evaluate(cli => proximaDataDe(cli), CLI_VAZIO);
  conf("a cobrança vencida mais antiga vence a futura (nota de -5 dias)",
    pdV.venceu && pdV.venceu.data === ONTEM5 && pdV.venceu.tipo === "nota");
  conf("a resolvida não cobra (a de -2 dias ficou de fora)",
    !(pdV.venceu && pdV.venceu.data === ONTEM2));
  const pdC = await p.evaluate(cli => proximaDataDe(cli), CLI_CHEIO);
  conf("no cliente com caso, o PRAZO (+3) ganha do lembrete (+9)",
    !pdC.venceu && pdC.proxima && pdC.proxima.data === DAQUI3 && pdC.proxima.tipo === "prazo");

  // ── a pílula no topo da ficha ───────────────────────────────────────────
  await p.evaluate(cli => abrirFicha(cli), CLI_VAZIO);
  await p.waitForTimeout(800);
  conf("a ficha abre com a pílula VERMELHA ⏰ venceu, com a data e o motivo",
    await p.evaluate(() => { const b = document.querySelector(".volta-pilula.venceu");
      return b && /venceu/.test(b.textContent) && /certidão fictícia/.test(b.textContent); }));
  // resolver a vencida → a pílula vira azul "volta" com a futura (+3)
  await p.evaluate(cli => resolverNotaAtendimento(cli, 0), CLI_VAZIO);
  await p.waitForTimeout(600);
  conf("resolvida a vencida, a pílula vira AZUL 📅 volta com a próxima data",
    await p.evaluate(() => { const b = document.querySelector(".volta-pilula.futura");
      return b && /volta/.test(b.textContent) && /Ligar contando/.test(b.textContent) &&
        !document.querySelector(".volta-pilula.venceu"); }));
  conf("clicar na pílula leva ao Cadastro (onde a anotação mora)",
    await (async () => { await p.click(".volta-pilula.futura"); await p.waitForTimeout(400);
      return p.evaluate(() => abaAtiva === 0); })());

  // ── as notas na lista: pílula colorida no começo, vencida vira pendência
  await p.evaluate(() => { const c = D.cliPorId.get(clienteAberto);
    c.triagem = { ...(c.triagem || {}), atendimento: { em: hoje(), quem: eu.id, passos: 8, conferidos: 8 } };
    irSubCad("anotacoes"); });
  await p.waitForTimeout(500);
  conf("a nota futura abre a linha com 📅 volta em azul",
    await p.evaluate(() => [...document.querySelectorAll('[data-p="0"] .chip.volta-chip')]
      .some(x => /volta/.test(x.textContent))));
  conf("a nota resolvida NÃO cobra (sem pílula, só o registro neutro)",
    await p.evaluate(() => ![...document.querySelectorAll('[data-p="0"] li')]
      .filter(li => /Nota antiga já resolvida/.test(li.textContent))
      .some(li => li.querySelector(".venceu-chip,.volta-chip"))));

  // vencida SEM resolver entra sozinha nas Pendências (nova fixture ao vivo)
  await p.evaluate(([cli, quando]) => { const c = D.cliPorId.get(cli);
    c.campos.atendimento.push({ em: new Date().toISOString(), quem: "Paulo",
      texto: "Nota nova que venceu sem ninguém resolver.", lembrar_em: quando });
    repintarFicha(); }, [CLI_VAZIO, ONTEM2]);
  await p.waitForTimeout(500);
  conf("a data vencida põe a nota SOZINHA nas Pendências em aberto",
    await p.evaluate(() => { const q = [...document.querySelectorAll('[data-p="0"] .rotulo-caso')]
        .find(r => /Pendências em aberto/.test(r.textContent));
      return q && /venceu sem ninguém resolver/.test(q.parentElement.textContent); }));

  // ── sem data nenhuma: a pílula cinza denuncia ───────────────────────────
  await p.evaluate(() => { const c = D.cliPorId.get(clienteAberto);
    c.campos.atendimento = []; fecharFicha(false); });
  await p.evaluate(cli => abrirFicha(cli), CLI_VAZIO);
  await p.waitForTimeout(700);
  conf("sem data nenhuma, a pílula cinza avisa 'sem próxima data'",
    await p.evaluate(() => { const b = document.querySelector(".volta-pilula.vazia");
      return b && /sem próxima data/.test(b.textContent); }));

  console.log("=== F56 · a data de volta à vista ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
