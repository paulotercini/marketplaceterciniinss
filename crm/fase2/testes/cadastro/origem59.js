// F59 — a linha do quadro é clicável e abre a ANOTAÇÃO que criou a data
// (lembrete gêmeo acha a nota pelo título; avulso mostra a própria ficha),
// e o responsável aparece como bolinha colorida com a inicial.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const D0 = new Date(); const iso = d => d.toISOString().slice(0, 10);
const mais = n => { const d = new Date(D0); d.setDate(d.getDate() + n); return iso(d); };
const DAQUI3 = mais(3), DAQUI8 = mais(8), DAQUI12 = mais(12);

const EU2 = "22222222-2222-2222-2222-222222222222";
FIX.colaboradores.push({ id: EU2, auth_id: null, nome: "Marcos Fictício", inicial: "M",
  cor: "#7a3ccf", ativo: true });
// nota datada SEM lembrete gêmeo (linha 📝, atribuída ao Marcos), nota COM
// lembrete gêmeo (só o 🔔 aparece) e um lembrete avulso
FIX.clientes[0].campos = { ...(FIX.clientes[0].campos || {}), atendimento: [
  { em: "2026-08-10T10:00:00Z", quem: "Paulo", autor_id: EU, atribuidos: [EU2],
    texto: "Conferir a procuração fictícia com o cartório antes do protocolo.",
    lembrar_em: DAQUI3 },
  { em: "2026-08-11T10:00:00Z", quem: "Paulo", autor_id: EU,
    texto: "Separar os comprovantes fictícios de residência.", lembrar_em: DAQUI8 },
] };
FIX.lembretes = FIX.lembretes || [];
FIX.lembretes.push(
  { id: "lb-59g", cliente_id: CLI_CHEIO, tipo: "geral",
    titulo: "Anotação: Separar os comprovantes fictícios de residência.",
    proximo_em: DAQUI8, responsavel_id: EU, criado_por: EU, ativo: true },
  { id: "lb-59a", cliente_id: CLI_CHEIO, tipo: "geral",
    titulo: "Rever cálculo fictício no Prévius", proximo_em: DAQUI12,
    responsavel_id: EU2, criado_por: EU, ativo: true });

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
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (rota.request().method() !== "GET")
      return rota.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify([{ id: "n1" }]) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
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
  await p.waitForTimeout(800);

  // 1) o responsável é a bolinha colorida com a inicial certa
  conf("a nota atribuída ao Marcos mostra a bolinha roxa M",
    await p.evaluate(() => [...document.querySelectorAll("#quadro-datas .qd-linha")]
      .some(li => /procuração fictícia/.test(li.textContent) &&
        (a => a && a.textContent === "M" && /Marcos/.test(a.title))(li.querySelector(".avatar.mini")))));
  conf("o lembrete avulso mostra a bolinha do seu responsável",
    await p.evaluate(() => [...document.querySelectorAll("#quadro-datas .qd-linha")]
      .some(li => /Rever cálculo fictício/.test(li.textContent) &&
        li.querySelector('.avatar.mini[title*="Marcos"]'))));

  // 2) clicar na linha 📝 abre a anotação completa
  await p.click("#quadro-datas .qd-link >> nth=0");
  await p.waitForTimeout(400);
  conf("clicar na nota abre a caixa com o texto completo e a atribuição",
    await p.evaluate(() => { const m = document.querySelector(".modal-cx");
      return m && /Conferir a procuração fictícia com o cartório antes do protocolo\./.test(m.textContent) &&
        /atribuída a Marcos/.test(m.textContent); }));
  await p.evaluate(() => fecharCaixa());
  await p.waitForTimeout(200);

  // 3) o lembrete GÊMEO abre a MESMA anotação que o criou (sincronizado)
  await p.evaluate(() => { const li = [...document.querySelectorAll("#quadro-datas .qd-linha")]
    .find(x => /Separar os comprovantes/.test(x.textContent));
    li.querySelector(".qd-link").click(); });
  await p.waitForTimeout(400);
  conf("o lembrete que nasceu de anotação abre a própria anotação",
    await p.evaluate(() => { const m = document.querySelector(".modal-cx");
      return m && /📝 Anotação de/.test(m.textContent) &&
        /Separar os comprovantes fictícios de residência\./.test(m.textContent); }));
  await p.evaluate(() => fecharCaixa());
  await p.waitForTimeout(200);

  // 4) o lembrete avulso mostra a própria ficha (não nasceu de anotação)
  await p.evaluate(() => { const li = [...document.querySelectorAll("#quadro-datas .qd-linha")]
    .find(x => /Rever cálculo fictício/.test(x.textContent));
    li.querySelector(".qd-link").click(); });
  await p.waitForTimeout(400);
  conf("o lembrete avulso explica que não nasceu de anotação",
    await p.evaluate(() => { const m = document.querySelector(".modal-cx");
      return m && /Rever cálculo fictício/.test(m.textContent) &&
        /não nasceu de anotação/.test(m.textContent); }));
  await p.evaluate(() => fecharCaixa());
  await p.waitForTimeout(200);

  // 5) "abrir nas Anotações" leva à mesa do Cadastro
  await p.click("#quadro-datas .qd-link >> nth=0");
  await p.waitForTimeout(300);
  await p.click('.modal-cx button:has-text("abrir nas Anotações")');
  await p.waitForTimeout(600);
  conf("o atalho leva ao Cadastro, sub-aba Anotações",
    await p.evaluate(() => abaAtiva === 0 && subCad === "anotacoes"));

  console.log("=== F59 · a origem a um clique ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
