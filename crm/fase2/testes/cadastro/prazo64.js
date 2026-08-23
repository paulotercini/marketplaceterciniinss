// F64 — concluir a tarefa que nasceu do prazo fatal BAIXA o prazo junto:
// nada de segundo clique em ✔ feito na linha do prazo. O caso movido para
// 🗓 Tarefas com Prazo volta sozinho à lista de origem, o aviso conta e o
// desfazer devolve tudo. Tarefa SEM carimbo não mexe no prazo.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const D0 = new Date(); const iso = d => d.toISOString().slice(0, 10);
const mais = n => { const d = new Date(D0); d.setDate(d.getDate() + n); return iso(d); };
const fmtBR = s => `${s.slice(8,10)}.${s.slice(5,7)}.${s.slice(0,4)}`;
const FATAL = mais(2);

const AND_PRAZO = "a0000000-0000-0000-0000-00000000f641";
const TAR_PRAZO = "a0000000-0000-0000-0000-00000000f642";
const AND_SOLTA = "a0000000-0000-0000-0000-00000000f643";
const TAR_SOLTA = "a0000000-0000-0000-0000-00000000f644";
FIX.andamentos = FIX.andamentos || [];
FIX.andamentos.push(
  { id: AND_PRAZO, caso_id: CASO1, autor_id: EU, origem: null,
    criado_em: "2026-08-23T10:00:00Z", andamentos_lidos: [],
    texto: `⏰ [PRAZO ${fmtBR(FATAL)}] Protocolar o recurso fictício` },
  { id: AND_SOLTA, caso_id: CASO1, autor_id: EU, origem: null,
    criado_em: "2026-08-23T10:05:00Z", andamentos_lidos: [],
    texto: "Pedir a certidão fictícia (sem prazo)" });
FIX.andamento_tarefas = [
  { id: TAR_PRAZO, andamento_id: AND_PRAZO, caso_id: CASO1, colaborador_id: EU,
    atribuido_por: EU, lembrar_em: mais(1), concluida_em: null },
  { id: TAR_SOLTA, andamento_id: AND_SOLTA, caso_id: CASO1, colaborador_id: EU,
    atribuido_por: EU, lembrar_em: mais(3), concluida_em: null }];
// o caso está com prazo fatal E preso em 🗓 Tarefas com Prazo (F38)
Object.assign(FIX.casos[0], { prazo: FATAL, fase: "outro",
  mover_para: "🗓 Tarefas com Prazo", ronda: { prazo_de: "🌻 INSS" } });

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
      // o PATCH precisa valer no reGET (a ficha recarrega ao repintar)
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

  conf("antes de tudo, o quadro mostra o PRAZO FATAL",
    await p.evaluate(() => /PRAZO FATAL/.test(
      document.getElementById("quadro-datas").textContent)));

  // 1) concluir a tarefa SEM carimbo não mexe no prazo do caso
  escritos.length = 0;
  await p.evaluate(id => concluirDeVez(id, "Certidão pedida (fictícia)"), TAR_SOLTA);
  await p.waitForTimeout(700);
  conf("tarefa sem carimbo: nenhum PATCH em casos tocando o prazo",
    !escritos.some(x => x.m === "PATCH" && x.t === "casos" && "prazo" in x.corpo));
  conf("o PRAZO FATAL continua no quadro",
    await p.evaluate(() => /PRAZO FATAL/.test(
      document.getElementById("quadro-datas").textContent)));

  // 2) concluir a tarefa carimbada (o caminho do ✎ escrever) baixa o prazo
  escritos.length = 0;
  await p.evaluate(id => concluirDeVez(id, "Recurso protocolado (fictício)"), TAR_PRAZO);
  await p.waitForTimeout(700);
  conf("a conclusão grava concluida_em e responde o andamento com o comentário",
    escritos.some(x => x.m === "PATCH" && x.t === "andamento_tarefas" && x.corpo.concluida_em) &&
    escritos.some(x => x.m === "POST" && x.t === "andamentos" &&
      /Recurso protocolado/.test(x.corpo.texto || "") && x.corpo.responde_a));
  conf("a MESMA conclusão baixa o prazo do caso (prazo:null, sem clique extra)",
    escritos.some(x => x.m === "PATCH" && x.t === "casos" && x.corpo.prazo === null));
  conf("o caso volta sozinho de 🗓 Tarefas com Prazo para a lista de origem",
    escritos.some(x => x.m === "PATCH" && x.t === "casos" &&
      x.corpo.mover_para === "🌻 INSS" && x.corpo.fase === "inss"));
  conf("o PRAZO FATAL saiu do quadro",
    await p.evaluate(() => { const q = document.getElementById("quadro-datas");
      return q && !/PRAZO FATAL/.test(q.textContent); }));
  conf("o aviso conta que o prazo foi baixado junto, com o desfazer à mão",
    await p.evaluate(() => { const a = document.getElementById("aviso");
      return a && /prazo fatal .* baixado junto/.test(a.textContent) &&
        /desfazer/.test(a.textContent); }));

  // 3) o desfazer devolve TUDO: tarefa aberta, prazo, fase e lista
  escritos.length = 0;
  await p.evaluate(() => desfazerAgora());
  await p.waitForTimeout(700);
  conf("desfazer reabre a tarefa e devolve prazo, fase e lista do caso",
    escritos.some(x => x.m === "PATCH" && x.t === "andamento_tarefas" && x.corpo.concluida_em === null) &&
    escritos.some(x => x.m === "PATCH" && x.t === "casos" && x.corpo.prazo &&
      x.corpo.mover_para === "🗓 Tarefas com Prazo" && x.corpo.fase === "outro"));
  conf("o PRAZO FATAL voltou ao quadro",
    await p.evaluate(() => /PRAZO FATAL/.test(
      document.getElementById("quadro-datas").textContent)));

  console.log("=== F64 · concluir baixa o prazo fatal ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
