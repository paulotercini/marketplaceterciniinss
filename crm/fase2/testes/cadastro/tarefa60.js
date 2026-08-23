// F60 — a data do composer do caso (tarefa de andamento) no quadro 📅:
// texto do andamento + bolinha do responsável + data alterável + ✔ feito,
// e o clique leva ao próprio andamento (sub-aba Escritório, com brilho).
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const D0 = new Date(); const iso = d => d.toISOString().slice(0, 10);
const mais = n => { const d = new Date(D0); d.setDate(d.getDate() + n); return iso(d); };
const DAQUI1 = mais(1), DAQUI5 = mais(5);

const AND1 = "a0000000-0000-0000-0000-00000000f601";
const TAR1 = "a0000000-0000-0000-0000-00000000f602";
FIX.andamentos = FIX.andamentos || [];
FIX.andamentos.push({ id: AND1, caso_id: CASO1, autor_id: EU, origem: null,
  criado_em: "2026-08-23T10:01:00Z", andamentos_lidos: [],
  texto: "Teste de lembrar a certidão fictícia." });
FIX.andamento_tarefas = [
  { id: TAR1, andamento_id: AND1, caso_id: CASO1, colaborador_id: EU,
    atribuido_por: EU, lembrar_em: DAQUI1, concluida_em: null }];

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
      if (m === "PATCH" && t === "andamento_tarefas") {
        const id = (u.match(/id=eq\.([^&]+)/) || [])[1];
        const alvo = (FIX.andamento_tarefas || []).find(x => x.id === id);
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

  // 1) a tarefa do composer aparece no quadro, com texto, bolinha e data
  conf("a tarefa do andamento está no quadro com o texto do comentário",
    await p.evaluate(() => /Teste de lembrar a certidão fictícia/.test(
      document.getElementById("quadro-datas").textContent)));
  conf("a linha traz a bolinha do responsável",
    await p.evaluate(() => [...document.querySelectorAll("#quadro-datas .qd-linha")]
      .some(li => /Teste de lembrar/.test(li.textContent) &&
        li.querySelector('.avatar.mini[title*="Paulo"]'))));
  conf("a pílula 'volta em' do topo considera a tarefa (é a menor data)",
    await p.evaluate(() => { const b = document.querySelector(".volta-pilula.futura");
      return b && /Tarefa: Teste de lembrar/.test(b.textContent); }));

  // 2) trocar a data usa o fluxo oficial (mudarLembrar → PATCH)
  escritos.length = 0;
  await p.evaluate(([id, quando]) => mudarLembrar(id, quando), [TAR1, DAQUI5]);
  await p.waitForTimeout(500);
  conf("trocar a data grava andamento_tarefas.lembrar_em",
    escritos.some(x => x.m === "PATCH" && x.t === "andamento_tarefas" &&
      x.corpo.lembrar_em === DAQUI5));

  // 3) clicar leva ao andamento: sub-aba Escritório + brilho no comentário
  await p.evaluate(() => { const li = [...document.querySelectorAll("#quadro-datas .qd-linha")]
    .find(x => /Teste de lembrar/.test(x.textContent));
    li.querySelector(".qd-link").click(); });
  await p.waitForTimeout(1300);
  conf("o clique abre a sub-aba do Escritório do caso certo",
    await p.evaluate(caso => abaAtiva === 2 && subAba === "escritorio" && casoSel === caso, CASO1));
  conf("o andamento de origem está na tela (âncora do visto)",
    await p.evaluate(and => !!document.getElementById(`visto-${and}`), AND1));

  // 4) ✔ feito conclui pelo fluxo oficial e some do quadro
  escritos.length = 0;
  await p.evaluate(id => concluirDeVez(id), TAR1); // F62: o fluxo oficial repinta sozinho
  await p.waitForTimeout(700);
  conf("o feito grava concluida_em e responde o andamento com ✔",
    escritos.some(x => x.m === "PATCH" && x.t === "andamento_tarefas" && x.corpo.concluida_em) &&
    escritos.some(x => x.m === "POST" && x.t === "andamentos" && /✔/.test(x.corpo.texto || "")));
  conf("concluída, a tarefa sai do quadro",
    await p.evaluate(() => { const q = document.getElementById("quadro-datas");
      return q && !/Teste de lembrar a certidão/.test(q.textContent); }));

  console.log("=== F60 · a tarefa do composer no quadro ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
