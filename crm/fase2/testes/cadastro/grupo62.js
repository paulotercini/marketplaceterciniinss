// F62 — o prazo fatal adota o lembrete decorrente (grupo mãe/filha no
// quadro 📅) e a tarefa ganha o ✎ escrever (a janela oficial de concluir
// contando o que foi feito).
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const D0 = new Date(); const iso = d => d.toISOString().slice(0, 10);
const mais = n => { const d = new Date(D0); d.setDate(d.getDate() + n); return iso(d); };
const fmtBR = s => `${s.slice(8,10)}.${s.slice(5,7)}.${s.slice(0,4)}`;
const LEMBRA = mais(1), FATAL = mais(2), SOLTA = mais(9);

const AND1 = "a0000000-0000-0000-0000-00000000f621";
FIX.andamentos = FIX.andamentos || [];
FIX.andamentos.push({ id: AND1, caso_id: CASO1, autor_id: EU, origem: null,
  criado_em: "2026-08-23T10:06:00Z", andamentos_lidos: [],
  texto: `⏰ [PRAZO ${fmtBR(FATAL)}] Apresentar carteira fictícia de motorista` });
FIX.andamento_tarefas = [
  { id: "t-62", andamento_id: AND1, caso_id: CASO1, colaborador_id: EU,
    atribuido_por: EU, lembrar_em: LEMBRA, concluida_em: null }];
FIX.casos[0].prazo = FATAL;
// e um lembrete SOLTO, sem parentesco, para provar que continua irmão
FIX.lembretes = FIX.lembretes || [];
FIX.lembretes.push({ id: "lb-62", cliente_id: CLI_CHEIO, tipo: "geral",
  titulo: "Rever documentos fictícios", proximo_em: SOLTA, responsavel_id: EU,
  criado_por: EU, ativo: true });

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
  await p.waitForTimeout(900);

  // 1) o prazo adota o lembrete: um GRUPO com a filha aninhada
  conf("o grupo existe: prazo fatal (mãe) com o lembrete aninhado (filha)",
    await p.evaluate(() => { const g = document.querySelector("#quadro-datas .qd-grupo");
      return g && /PRAZO FATAL/.test(g.textContent) &&
        !!g.querySelector(".qd-linha.qd-filha"); }));
  conf("a filha diz que é decorrente (↳ lembrar) e perde o carimbo [PRAZO]",
    await p.evaluate(() => { const f = document.querySelector("#quadro-datas .qd-filha");
      return f && /↳/.test(f.textContent) && /Apresentar carteira fictícia/.test(f.textContent) &&
        !/\[PRAZO/.test(f.textContent); }));
  conf("a tarefa filha mantém a bolinha, a data editável e as duas conclusões",
    await p.evaluate(() => { const f = document.querySelector("#quadro-datas .qd-filha");
      return f && f.querySelector(".qd-data") && f.querySelector('.avatar.mini[title*="Paulo"]') &&
        /✔ feito/.test(f.textContent) && /✎ escrever/.test(f.textContent); }));

  // 2) o grupo ordena pela PRIMEIRA ação (a filha de amanhã vence o solto de +9)
  conf("o grupo vem antes do lembrete solto (ordena pela menor data do grupo)",
    await p.evaluate(() => { const filhos = [...document.querySelectorAll("#quadro-datas .qd-lista > li")];
      const iG = filhos.findIndex(x => x.classList.contains("qd-grupo"));
      const iS = filhos.findIndex(x => /Rever documentos fictícios/.test(x.textContent));
      return iG >= 0 && iS >= 0 && iG < iS; }));
  conf("o lembrete sem parentesco continua linha solta e irmã",
    await p.evaluate(() => { const li = [...document.querySelectorAll("#quadro-datas .qd-lista > li")]
      .find(x => /Rever documentos fictícios/.test(x.textContent));
      return li && !li.classList.contains("qd-grupo"); }));

  // 3) o ✎ escrever abre a janela oficial de concluir contando o que fez
  await p.evaluate(() => { const f = document.querySelector("#quadro-datas .qd-filha");
    [...f.querySelectorAll("button")].find(b => /escrever/.test(b.textContent)).click(); });
  await p.waitForTimeout(400);
  conf("o ✎ abre a janela com texto, protocolo e repetição",
    await p.evaluate(() => { const m = document.querySelector(".modal-cx");
      return m && /Concluir a sua parte/.test(m.textContent) &&
        !!document.getElementById("ct-txt") && !!document.getElementById("ct-prot"); }));

  console.log("=== F62 · o parentesco das datas ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
