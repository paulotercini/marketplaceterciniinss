// E3 e E4 — a auditoria To Do × CRM na tela do administrador e o aviso do
// disparo automático. O resumo vem em config_app (auditoria_todo); as linhas
// de todo_auditoria só da lista aberta. O botão "auditar agora" dispara o
// workflow com auditar=sim. Token do disparo recusado vira ⚠ âmbar no rodapé.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const agora = new Date().toISOString();
const RESUMO = {
  em: agora, total: 3,
  listas: {
    "🌻 INSS": { abertas: 12, com_data: 7, divergencias: 2, tipos: { retorno: 1, caso_ausente: 1 } },
    "🙏 Aposentadorias Futuras": { abertas: 4, com_data: 4, divergencias: 1, tipos: { lembrete_data: 1 } },
    "👪 Judicial": { abertas: 3, com_data: 1, divergencias: 0, tipos: {} },
  },
  tipos: { retorno: 1, caso_ausente: 1, lembrete_data: 1 },
  fora_do_crm: { "☕ Marcos": 124 },
  planejado: { todo_com_data: 12, crm_mesma_data: 10 },
  parcelas_abertas_de_tarefa_concluida: 5,
};
const LINHAS = [
  { id: 1, rodada: agora, lista: "🌻 INSS", tipo: "retorno", caso_id: CASO1, cliente_id: CLI_CHEIO,
    no_todo: "2026-10-05", no_crm: "2026-08-15" },
  { id: 2, rodada: agora, lista: "🌻 INSS", tipo: "caso_ausente", titulo: "Cliente Sem Cadastro",
    no_todo: "🌻 INSS" },
  { id: 3, rodada: agora, lista: "🙏 Aposentadorias Futuras", tipo: "lembrete_data",
    cliente_id: CLI_CHEIO, no_todo: "2027-03-01", no_crm: "2026-08-01" },
];
FIX.config_app = [...FIX.config_app,
  { chave: "auditoria_todo", valor: JSON.stringify(RESUMO) },
  { chave: "gh_token", valor: "token-ficticio" },
  { chave: "sync_disparo", valor: JSON.stringify({ em: agora, id: 9, sem_token: false, status_anterior: 401 }) }];
FIX.todo_auditoria = LINHAS;

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
  }, [SUPA, SESSAO]);
  const disparos = [], pedidosAud = [];
  await ctx.route("https://api.github.com/**", rota => {
    disparos.push({ url: rota.request().url(), corpo: JSON.parse(rota.request().postData() || "{}") });
    return rota.fulfill({ status: 204, body: "" });
  });
  await ctx.route(SUPA + "/**", rota => {
    const u = new URL(rota.request().url());
    if (/\/auth\/v1\//.test(u.pathname))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (rota.request().method() !== "GET") return rota.fulfill({ status: 204, body: "" });
    const t = (u.pathname.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    let corpo = FIX[t] || [];
    const lista = u.searchParams.get("lista");
    if (t === "todo_auditoria") { pedidosAud.push(lista); corpo = corpo.filter(l => "eq." + l.lista === lista); }
    const f = u.searchParams.get("cliente_id");
    if (f) corpo = corpo.filter(x => "eq." + x.cliente_id === f);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error" && !/ERR_FAILED/.test(m.text())) erros.push("console: " + m.text()); });
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);

  // o rodapé: token do disparo recusado vira ⚠ âmbar para o administrador
  const rodape = await p.evaluate(() => { montarSidebar(); const st = document.getElementById("sync-todo");
    return { html: st.innerHTML, cor: st.style.color }; });
  conf("token recusado no disparo automático: ⚠ no rodapé", /⚠/.test(rodape.html) && /recusou o token/.test(rodape.html));
  conf("e o carimbo fica âmbar", /232, 161, 61|#E8A13D/i.test(rodape.cor));

  // o menu da conta leva à auditoria
  await p.evaluate(() => montarConta());
  const menu = await p.evaluate(() => document.getElementById("menu-conta").innerText);
  conf("o menu da conta tem a Auditoria To Do com o total", /Auditoria To Do/.test(menu) && /3 diferença/.test(menu));
  await p.evaluate(() => document.querySelector('[data-conta="auditoria"]').click());
  await p.waitForTimeout(200);
  const tela = await p.evaluate(() => ({ visao, sub: document.getElementById("sub-lista").textContent,
    meio: document.getElementById("conteudo-meio").innerText }));
  conf("a tela abre com o resumo do Planejado", tela.visao === "auditoria" && /10 de 12 tarefas com data/.test(tela.sub));
  conf("as listas vêm da que tem mais diferenças para a que tem menos",
    tela.meio.indexOf("🌻 INSS") < tela.meio.indexOf("🙏 Aposentadorias") &&
    tela.meio.indexOf("🙏 Aposentadorias") < tela.meio.indexOf("👪 Judicial"));
  conf("a lista sem diferença aparece como igual", /👪 Judicial[\s\S]*igual/.test(tela.meio));
  conf("as listas fora do CRM e as parcelas de tarefa concluída entram no rodapé da tela",
    /☕ Marcos \(124\)/.test(tela.meio) && /5 parcela\(s\) em aberto/.test(tela.meio));
  conf("a tabela de linhas não é baixada antes de abrir uma lista", pedidosAud.length === 0);

  // abrir a lista INSS traz só as linhas dela
  await p.evaluate(() => abrirListaAuditoria("🌻 INSS"));
  await p.waitForTimeout(300);
  const aberta = await p.evaluate(() => document.getElementById("conteudo-meio").innerText);
  conf("abrir a lista pede ao banco só as linhas dela", pedidosAud.length === 1 && pedidosAud[0] === "eq.🌻 INSS");
  conf("a linha com cliente mostra o nome e as duas datas no formato brasileiro",
    /Aurélia Ficta de Souza/.test(aberta) && /To Do: 05\/10\/2026 · CRM: 15\/08\/2026/.test(aberta));
  conf("a tarefa sem cliente no CRM mostra o título do To Do", /Cliente Sem Cadastro/.test(aberta));
  conf("o grupo diz o que é a diferença", /Data diferente \(1\)/i.test(aberta) && /sem caso no CRM \(1\)/i.test(aberta));

  if (process.env.FOTO) await p.screenshot({ path: process.env.FOTO + "-auditoria.png" });

  // auditar agora
  await p.evaluate(() => dispararAuditoria());
  await p.waitForTimeout(200);
  const d = disparos.find(x => /crm-sync\.yml\/dispatches/.test(x.url));
  conf("o botão dispara o workflow com auditar=sim", d && d.corpo.inputs && d.corpo.inputs.auditar === "sim"
    && d.corpo.ref === "main");

  // quem não é administrador não vê
  const colab = await p.evaluate(() => { eu.papel = "equipe"; irPara("auditoria");
    const r = { titulo: document.getElementById("titulo-lista").textContent, disparo: problemaDisparo() };
    eu.papel = "admin"; return r; });
  conf("colaborador não abre a auditoria nem vê o aviso do disparo", !/Auditoria/.test(colab.titulo) && colab.disparo === "");

  console.log("=== E3/E4 · auditoria e disparo ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length + erros.length;
  console.log(`${ok.length - ok.filter(x => !x[1]).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})();
