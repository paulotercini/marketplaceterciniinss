// F454 · três ajustes dos prazos vindos do teste no Trello (aprovados pelo Paulo em 08.11.2026): o cumprido depois do
// vencimento em vermelho, o Reagendar em lote anota no caso e a última etapa feita oferece concluir a tarefa.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const dia = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" }); };
FIX.casos[0].prazo = dia(-3);
const RET = "b4410000-0000-0000-0000-000000000001", FAT = "b4410000-0000-0000-0000-000000000002";
FIX.clientes.push({ id: "c4410000-0000-0000-0000-000000000001", nome: "Cliente Fictício do Retorno", cpf: "44100000001", dn: "01011960", campos: {} },
  { id: "c4410000-0000-0000-0000-000000000002", nome: "Cliente Fictício do Prazo Fatal", cpf: "44100000002", dn: "01011960", campos: {} });
FIX.casos.push({ id: RET, cliente_id: "c4410000-0000-0000-0000-000000000001", titulo: "Pensão", especie: "B21", fase: "judicial",
  origem_lista: "👪 Judicial", prazo: dia(-5), criado_em: "2026-01-01T00:00:00Z" },
  { id: FAT, cliente_id: "c4410000-0000-0000-0000-000000000002", titulo: "Recurso", especie: "B31", fase: "outro",
  origem_lista: "🗓 Tarefas com Prazo", mover_para: "🗓 Tarefas com Prazo", prazo: dia(-4), criado_em: "2026-01-01T00:00:00Z" });
FIX.tarefas = [{ id: "t-f451", titulo: "Tarefa pessoal fictícia", concluida: false, particular_de: FIX.colaboradores[0].id,
  prazo: dia(-2), criado_em: "2026-09-01T00:00:00Z" }];

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const erros = [], patches = [], posts = [], deletes = [];
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const q = rota.request(), u = q.url();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (q.method() === "DELETE") { deletes.push(u); return rota.fulfill({ status: 204, body: "" }); }
    if (q.method() === "PATCH") { patches.push([u, q.postData()]); return rota.fulfill({ status: 200, contentType: "application/json", body: "[]" }); }
    if (q.method() === "POST" && /\/rest\/v1\/andamentos(\?|$)/.test(u)) { const b = JSON.parse(q.postData()); posts.push(b);
      return rota.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify([{ id: "and-f454-" + posts.length, criado_em: new Date().toISOString(), ...b }]) }); }
    if (q.method() !== "GET") return rota.fulfill({ status: 204, body: "" });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  const p = await ctx.newPage();
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await p.evaluate(() => { filtroPlanColab = null; filtroPlanNat = ""; visao = "planejado"; render(); });
  await p.waitForTimeout(300);
  // (b) o Reagendar em lote anota no caso
  await p.locator('section.pl-grupo[data-tom="venc"] .reag-bt').click(); await p.waitForTimeout(200);
  await p.locator('button.esp-it:has-text("Amanhã")').click(); await p.waitForTimeout(600);
  const n = posts.find(b => b.caso_id === RET);
  conf(`o retorno reagendado anota no caso (${n && n.texto})`, n && /^Retorno levado de \d{2}\/\d{2}\/\d{4} para \d{2}\/\d{2}\/\d{4} por \S+ \(reagendado em lote\)\.$/.test(n.texto));
  conf("o prazo fatal não recebeu anotação", !posts.some(b => b.caso_id === FAT));
  const nd = posts.length;
  await p.locator("#aviso .aviso-bt").click(); await p.waitForTimeout(500);
  conf("o desfazer apaga a anotação do lote", deletes.some(u => /andamentos\?id=eq\.and-f454-/.test(u)) && posts.length === nd);

  // (a) cumprido depois do vencimento em vermelho
  const a = await p.evaluate(() => {
    const k = D.casos.find(x => x.fase !== "encerrado");
    const ant = { id: "pz-f451", caso_id: k.id, autor_id: eu.id, texto: "⏰ [PRAZO 03.11.2026] Réplica", criado_em: "2026-10-20T12:00:00Z" };
    const resp = id => ({ id: "r-" + id, caso_id: k.id, autor_id: eu.id, responde_a: "pz-f451", texto: `✔ [PRAZO CUMPRIDO] Réplica protocolada (cumprido em ${id})`, criado_em: "2026-11-06T12:00:00Z" });
    D._andsFicha = [ant, resp("05/11/2026")];
    const tarde = faixaPrazoNota(ant, estadoPrazoNota(ant)), chipT = respPrazoHtml(D._andsFicha[1]).chip;
    D._andsFicha = [ant, resp("03/11/2026")];
    const emDia = faixaPrazoNota(ant, estadoPrazoNota(ant)), chipD = respPrazoHtml(D._andsFicha[1]).chip;
    return { tarde, chipT, emDia, chipD };
  });
  conf("o cumprido tarde diz quantos dias úteis depois do vencimento", /cumprido 2 dias úteis depois do vencimento/.test(a.tarde) && /tl-pz-tarde/.test(a.tarde));
  conf("o cumprido tarde tem o fundo vermelho e diz fora do prazo", /tl-pz-ok-tarde/.test(a.tarde) && /cumprido fora do prazo/.test(a.tarde));
  conf("o selo da resposta diz após o vencimento", /Cumprido após o vencimento/.test(a.chipT) && /tl-pz-resp-x/.test(a.chipT));
  conf("o cumprido no último dia segue verde", !/tl-pz-tarde|ok-tarde/.test(a.emDia) && /no último dia/.test(a.emDia) && /tl-pz-resp-ok/.test(a.chipD));

  // (c) a última etapa feita oferece concluir a tarefa
  await p.evaluate(() => { const k = D.casos.find(x => x.fase !== "encerrado");
    D.tarefasFicha = [{ id: "tf-f451", andamento_id: "pz-f451", caso_id: k.id, colaborador_id: eu.id, atribuido_por: eu.id, lembrar_em: "2026-11-10",
      natureza: "compromisso", etapas: [{ t: "Ler", feito: true }, { t: "Redigir", feito: false }] }]; });
  await p.evaluate(() => marcarEtapaTarefa("tf-f451", 1, true)); await p.waitForTimeout(500);
  conf("a última etapa feita abre a oferta de concluir", await p.locator("#et-concluir").count() === 1);
  conf("o botão diz uma palavra", (await p.locator("#et-concluir").textContent()).trim() === "Concluir");
  await p.evaluate(() => fecharCaixa());
  await p.evaluate(() => { D.tarefasFicha[0].etapas = [{ t: "Ler", feito: false }, { t: "Redigir", feito: false }]; marcarEtapaTarefa("tf-f451", 0, true); });
  await p.waitForTimeout(400);
  conf("a etapa que não é a última não oferece concluir", await p.locator("#et-concluir").count() === 0);

  console.log("=== F454 · ajustes dos prazos (Trello) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length + erros.length;
  console.log(`${ok.length - ok.filter(x => !x[1]).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
