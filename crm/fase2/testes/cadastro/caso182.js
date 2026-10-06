// F182 — Casos e anotações (canvas aprovado): trilha das etapas, "Nas outras
// abas", chaves Tarefa / Prazo fatal / Lembrete com a frase "Ao registrar",
// e o cartão da anotação com Responder, Concluir tarefa, + prazo e Reagendar.
// Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const OUTRA = "22222222-2222-2222-2222-222222222222";
const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return x.toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" }); };
const A1 = "a1820000-0000-0000-0000-000000000001", A2 = "a1820000-0000-0000-0000-000000000002";
const T1 = "t1820000-0000-0000-0000-000000000001";
const DADOS = {
  ...FIX,
  colaboradores: [...FIX.colaboradores, { id: OUTRA, auth_id: "bbbb", nome: "Amanda Ficta", inicial: "A", cor: "#8A5300", papel: "colaborador", ativo: true }],
  casos: FIX.casos.map(k => ({ ...k, etapa: "aguardando perícia", prazo: d(20) })),
  andamentos: [
    { id: A1, caso_id: CASO1, autor_id: EU, origem: "app", texto: "⏰ [PRAZO " + d(20).split("-").reverse().join(".") + "] [EXIGÊNCIA] O que o INSS exigiu: declaração do empregador", criado_em: new Date(Date.now() - 3600e3).toISOString(), andamentos_lidos: [{ colaborador_id: EU }] },
    { id: A2, caso_id: CASO1, autor_id: OUTRA, origem: "app", texto: "Cliente avisado sobre a perícia.", criado_em: new Date(Date.now() - 7200e3).toISOString(), andamentos_lidos: [{ colaborador_id: EU }] },
  ],
  andamento_tarefas: [{ id: T1, andamento_id: A1, caso_id: CASO1, colaborador_id: EU, atribuido_por: EU, lembrar_em: d(3), concluida_em: null, natureza: "compromisso" }],
  eventos: [{ id: "ev182", caso_id: CASO1, tipo: "Perícia", data_hora: d(2) + "T09:40:00-03:00", local: "APS Fictícia", status: "agendada" }],
  pagamentos: [{ id: "pg182", cliente_id: CLI_CHEIO, caso_id: CASO1, valor: 500, vencimento: d(30), status: "aberto", descricao: "Honorários · 1ª parcela" }],
};

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 1100 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  const escritos = [];
  await ctx.route(SUPA + "/**", rota => {
    const q = rota.request(), u = q.url(), m = q.method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      escritos.push({ t, m, u, corpo: q.postData() });
      if (m === "POST") { let b = {}; try { b = JSON.parse(q.postData() || "{}"); } catch (e) {}
        return rota.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify([{ id: "novo-" + escritos.length, criado_em: new Date().toISOString(), ...b }]) }); }
      return rota.fulfill({ status: 204, body: "" });
    }
    let corpo = DADOS[t] || [];
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
  await p.evaluate(([cli, id]) => { abrirFicha(cli); casoSel = id; abaAtiva = 2; subAba = "escritorio"; }, [CLI_CHEIO, CASO1]);
  await p.waitForSelector(".caso-esq .lc-trilha");
  await p.evaluate(() => repintarFicha());
  await p.waitForSelector(".timeline .tl-barra");

  const FOTO = process.env.FOTO;
  if (FOTO) { await p.click("#and-texto"); await p.waitForTimeout(200); await p.screenshot({ path: FOTO + "-1.png", fullPage: false });
    await p.evaluate(id => abrirRespInline(id, 1), A1); await p.waitForTimeout(200);
    await p.screenshot({ path: FOTO + "-2.png", fullPage: false }); await p.evaluate(() => fecharRespInline()); await p.waitForSelector(".timeline .tl-barra"); }
  // ── coluna do caso ───────────────────────────────────────────────────────
  const esq = await p.evaluate(() => {
    const li = [...document.querySelectorAll(".lc-trilha li")];
    return { n: li.length, atual: (document.querySelector(".lc-trilha li.atual") || {}).textContent || "",
      feitas: document.querySelectorAll(".lc-trilha li.feita").length,
      abas: [...document.querySelectorAll(".outras-abas .oa-linha small")].map(x => x.textContent),
      txt: (document.querySelector(".outras-abas") || {}).textContent || "" };
  });
  conf("a trilha mostra as etapas da fase e acende a atual", esq.n === 6 && /aguardando perícia/.test(esq.atual) && esq.feitas === 1);
  conf("Nas outras abas traz Perícias e Honorários com o dado de cada uma", esq.abas.includes("Perícias") && esq.abas.includes("Honorários") && /APS Fictícia/.test(esq.txt) && /próximo vencimento/.test(esq.txt));
  await p.evaluate(() => document.querySelector(".oa-linha").click());
  conf("o atalho leva à aba (Perícias)", await p.evaluate(() => abaAtiva === 3));
  await p.evaluate(() => { abaAtiva = 2; repintarFicha(); });
  await p.waitForSelector(".timeline .tl-barra");

  // ── o cartão ─────────────────────────────────────────────────────────────
  const cart = await p.evaluate(() => {
    const li = [...document.querySelectorAll(".timeline li:not(.dia-bloco)")].find(x => /declaração do empregador/.test(x.textContent));
    return { tipo: !!li.querySelector(".tl-cab .tipo-tl"), pz: (li.querySelector(".tl-pz-chip") || {}).textContent || "",
      semCarimbo: !/\[PRAZO/.test(li.querySelector(".tl-corpo").textContent),
      tarefa: (li.querySelector(".tl-tarefa") || {}).textContent || "", bola: !!li.querySelector(".tl-tarefa .tf-ok"),
      bts: [...li.querySelectorAll(".tl-barra .tl-bt")].map(b => b.textContent.trim()) };
  });
  conf("o cabeçalho traz o tipo e o prazo fatal; o carimbo sai do texto", cart.tipo && /^prazo fatal \d\d\/\d\d$/.test(cart.pz) && cart.semCarimbo);
  conf("a tarefa tem faixa própria com quem, quando e o círculo de concluir", /Paulo · .* · tarefa/.test(cart.tarefa) && cart.bola);
  conf("a barra traz Responder, Concluir tarefa, + prazo e Reagendar", ["Responder", "Concluir tarefa", "+ prazo", "Reagendar"].every(x => cart.bts.includes(x)));
  const outro = await p.evaluate(() => [...[...document.querySelectorAll(".timeline li:not(.dia-bloco)")].find(x => /Cliente avisado/.test(x.textContent)).querySelectorAll(".tl-barra .tl-bt")].map(b => b.textContent.trim()));
  conf("sem tarefa, o cartão não oferece Concluir nem Reagendar", outro.includes("Responder") && !outro.includes("Concluir tarefa") && !outro.includes("Reagendar"));

  // ── resposta com prazo adicional ─────────────────────────────────────────
  await p.evaluate(id => abrirRespInline(id, 1), "a1820000-0000-0000-0000-000000000001");
  await p.waitForSelector("#ri-box.foco-prazo");
  await p.evaluate(() => { document.getElementById("ri-txt").value = "Pedi a declaração ao empregador"; document.getElementById("ri-concluir").checked = false; riDia(15); });
  conf("o prazo escolhido acende e o texto digitado não se perde", await p.evaluate(() => document.querySelector("#ri-box .tl-pill.on") && document.getElementById("ri-txt").value === "Pedi a declaração ao empregador" && document.getElementById("ri-concluir").checked === false));
  escritos.length = 0;
  await p.evaluate(id => responderInline(id), "a1820000-0000-0000-0000-000000000001");
  await p.waitForTimeout(400);
  const resp = escritos.find(e => e.t === "andamentos" && e.m === "POST");
  const patch = escritos.find(e => e.t === "andamento_tarefas" && e.m === "PATCH");
  const quinze = await p.evaluate(() => maisDias(15));
  conf("a resposta grava pendurada no comentário, com o prazo adicional no texto", resp && JSON.parse(resp.corpo).responde_a === "a1820000-0000-0000-0000-000000000001" && /prazo adicional até/.test(JSON.parse(resp.corpo).texto));
  conf("sem concluir, o prazo adicional muda a data da tarefa aberta", patch && JSON.parse(patch.corpo).lembrar_em === quinze);

  // ── concluir pela resposta ───────────────────────────────────────────────
  await p.waitForSelector(".timeline .tl-barra");
  await p.evaluate(id => abrirRespInline(id), "a1820000-0000-0000-0000-000000000001");
  await p.waitForSelector("#ri-box");
  escritos.length = 0;
  await p.evaluate(id => { document.getElementById("ri-txt").value = "Cumpri a exigência"; return responderInline(id); }, "a1820000-0000-0000-0000-000000000001");
  await p.waitForTimeout(400);
  const fech = escritos.find(e => e.t === "andamento_tarefas" && e.m === "PATCH");
  const rc = escritos.find(e => e.t === "andamentos" && e.m === "POST");
  conf("com a caixa marcada, responder conclui a tarefa e escreve o feito", fech && /concluida_em/.test(fech.corpo) && rc && /^✔ Cumpri a exigência/.test(JSON.parse(rc.corpo).texto));

  // ── o compositor ─────────────────────────────────────────────────────────
  await p.waitForSelector("#and-texto");
  await p.click("#and-texto"); await p.waitForTimeout(200);
  const comp = await p.evaluate(() => ({
    tgs: [...document.querySelectorAll("#tf-box .esc-tgs .esc-tg")].map(b => b.textContent.trim()),
    pnl: !document.getElementById("esc-pnl-tf").hidden, frase: document.getElementById("esc-frase").textContent }));
  conf("as três chaves: Tarefa, Prazo fatal e Lembrete, com a Tarefa ligada", comp.tgs.join("|") === "Tarefa|Prazo fatal|Lembrete" && comp.pnl);
  conf("a frase diz o que falta antes de registrar", /^Ao registrar: anota no Escritório, cria tarefa \(falta quem faz\)/.test(comp.frase));
  await p.evaluate(() => { const t = document.getElementById("and-texto"); t.value = "[CONTATO] Cliente orientado"; t.dispatchEvent(new Event("input", { bubbles: true })); });
  await p.evaluate(() => document.querySelector('#tf-box .tf-eq').click());
  await p.evaluate(() => document.querySelector('#tf-box [data-tfd="3"]').click());
  await p.evaluate(() => document.querySelector(".esc-tg-pz").click());
  await p.evaluate(v => { const i = document.getElementById("and-prazo-data"); i.value = v; i.dispatchEvent(new Event("change", { bubbles: true })); }, d(10));
  await p.waitForTimeout(100);
  const fr = await p.evaluate(() => ({ f: document.getElementById("esc-frase").textContent, pz: !document.getElementById("esc-pnl-pz").hidden }));
  conf("com tipo, pessoa, data e prazo a frase conta tudo", /anota como contato, cria tarefa para Paulo em \d\d\/\d\d, marca prazo fatal em \d\d\/\d\d\/\d{4}/.test(fr.f) && fr.pz);
  // desligar a Tarefa e o prazo: a anotação grava sem tarefa
  await p.evaluate(() => { document.querySelector('.tf-nt[data-nat="compromisso"]').click(); document.querySelector(".esc-tg-pz").click(); });
  conf("desligada a Tarefa, o quadro fecha e a frase só anota", await p.evaluate(() => document.getElementById("esc-pnl-tf").hidden && tfNatureza === null && /^Ao registrar: anota como contato$/.test(document.getElementById("esc-frase").textContent)));
  escritos.length = 0;
  await p.evaluate(id => novoAndamento(id), CASO1); await p.waitForTimeout(500);
  conf("registra sem tarefa e sem prazo", escritos.some(e => e.t === "andamentos" && e.m === "POST" && /Cliente orientado/.test(e.corpo)) && !escritos.some(e => e.t === "andamento_tarefas" && e.m === "POST"));

  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
