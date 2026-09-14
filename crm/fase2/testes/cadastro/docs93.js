// F93 — O PEDIDO DE DOCUMENTO COM ESTADO. O checklist já dizia o que foi
// pedido e se chegou; agora o pedido tem data de entrega, o vencido sobe ao
// Meu Dia com o nome do cliente, e a cobrança é um clique: mensagem pronta
// no WhatsApp com os pendentes e registro no caso (ou no atendimento, para
// quem ainda não tem caso). Datas SEMPRE relativas ao hoje do app.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CLI_VAZIO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

// perícia daqui a ~60 dias, no formato que o detector lê (dd/mm/aaaa)
const ev = new Date(Date.now() + 60 * 864e5);
const EV_BR = `${String(ev.getDate()).padStart(2, "0")}/${String(ev.getMonth() + 1).padStart(2, "0")}/${ev.getFullYear()}`;
const EV_ISO = ev.toLocaleDateString("sv");
const EV_PT = EV_BR.replace(/\//g, ".");

(async () => {
  const escritos = [];
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
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      const corpo = rota.request().postData() || "";
      escritos.push({ t, m, corpo });
      return rota.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify([{ ...(JSON.parse(corpo || "{}")), id: "x" + escritos.length }]) });
    }
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
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await p.evaluate(() => { window.__aberto = null; window.open = u => { window.__aberto = u; return null; }; });
  const posts = t => escritos.filter(e => e.t === t && e.m === "POST").map(e => JSON.parse(e.corpo));

  // ── 1 · pedir documento no caso, com data de entrega ─────────────────────
  await p.evaluate(([cli, caso]) => abrirFicha(cli).then(() => { casoSel = caso; janelaDocsAnotacao(); }), [CLI_CHEIO, CASO1]);
  await p.waitForSelector("#jd-ate");
  const j = await p.evaluate(() => ({ ate: document.getElementById("jd-ate").value, esperado: somaDias(hoje(), 15),
    itens: [...document.querySelectorAll(".jd-doc")].map(x => x.value) }));
  conf("a janela de solicitar traz 'entrega até', já com +15 dias", j.ate === j.esperado);
  conf("e a lista do benefício (RG, CPF, comprovante)", j.itens.join("|") === "RG|CPF|Comprovante de endereço");
  await p.evaluate(([caso]) => { document.querySelector('.jd-doc[value="RG"]').checked = true; return solicitarDocsAnotacao(caso); }, [CASO1]);
  await p.waitForTimeout(400);
  const tRG = posts("tarefas").find(t => t.titulo === "RG");
  conf("o item do checklist nasce com a data de entrega", tRG && tRG.prazo === j.esperado);
  const frase = await p.evaluate(() => document.getElementById("and-texto").value);
  conf("a anotação em curso ganha a frase com a data ANTES dos dois-pontos (o migrar separa os itens depois deles)",
    frase.includes(`Solicitei os documentos (entrega até ${await p.evaluate(d => fmt(d), j.esperado)}): RG.`));

  // ── 2 · o checklist mostra estado e cobra num clique ─────────────────────
  await p.evaluate(([cli]) => abrirFicha(cli), [CLI_CHEIO]);
  await p.waitForFunction(() => [...document.querySelectorAll(".cl")].some(e => /RG/.test(e.textContent)));
  const ck = await p.evaluate(() => {
    const li = [...document.querySelectorAll(".cl")].find(e => /RG/.test(e.textContent));
    return { chip: !!li.querySelector(".chip.prazo"), botao: !!li.querySelector("button[onclick^='prazoDoDoc']"),
      cobrar: !![...document.querySelectorAll("button")].find(b => /📲 cobrar 1 pendente/.test(b.textContent)) };
  });
  conf("o item pendente mostra a data e o 📅 para trocá-la", ck.chip && ck.botao);
  conf("o cabeçalho do checklist oferece '📲 cobrar 1 pendente'", ck.cobrar);
  const idRG = await p.evaluate(() => D.tarefas.find(t => t.titulo === "RG").id);
  await p.evaluate(id => prazoDoDoc(id), idRG);
  await p.waitForSelector("#pd-data");
  await p.evaluate(id => gravarPrazoDoc(id, hoje()), idRG);
  await p.waitForTimeout(300);
  conf("trocar a data grava no banco", escritos.some(e => e.t === "tarefas" && e.m === "PATCH" && /"prazo":"\d{4}-\d{2}-\d{2}"/.test(e.corpo)));

  // ── 3 · no Meu Dia o pedido aparece com o nome do cliente e o botão ──────
  await p.evaluate(() => { clienteAberto = null; visao = "meudia"; render(); });
  await p.waitForSelector("#conteudo-meio");
  const md = await p.evaluate(() => {
    const c = [...document.querySelectorAll(".cartao[data-tarefa]")].find(e => /RG/.test(e.textContent));
    return c ? { nome: c.querySelector(".nome").textContent, cobrar: !!c.querySelector("button[onclick*='cobrarDocs']"),
      secao: (() => { let e = c.previousElementSibling; while (e && !(e.tagName === "H3")) e = e.previousElementSibling; return e ? e.textContent : ""; })() } : null;
  });
  conf("o cartão no Meu Dia diz de quem é o documento", md && /Aurélia Ficta de Souza · RG/.test(md.nome));
  conf("na seção de hoje, com o botão 📲 cobrar", md && md.cobrar && /Vencem hoje/.test(md.secao));

  await p.evaluate(([cli, caso]) => cobrarDocs(cli, caso), [CLI_CHEIO, CASO1]);
  await p.waitForTimeout(400);
  const zap = await p.evaluate(() => window.__aberto);
  conf("cobrar abre o WhatsApp do cliente com a lista dos pendentes",
    zap && zap.startsWith("https://wa.me/5516999990001?text=") && /Olá, Aurélia/.test(decodeURIComponent(zap)) && /• RG \(até /.test(decodeURIComponent(zap)));
  conf("e a cobrança fica registrada no caso, com data e autor",
    posts("andamentos").some(a => a.caso_id === CASO1 && a.texto === "📲 Cobrados de Aurélia os documentos pendentes: RG."));

  // ── 4 · pré-caso: o pedido com data vencida sobe ao Meu Dia e cobra ──────
  await p.evaluate(([cli]) => {
    const c = D.cliPorId.get(cli);
    c.campos = { docs_pedidos: [{ em: new Date().toISOString(), quem: "Paulo", especie: "BPC", ate: somaDias(hoje(), -1),
      itens: [{ nome: "CNIS", entregue: null }, { nome: "RG", entregue: hoje() }] }] };
  }, [CLI_VAZIO]);
  const pc = await p.evaluate(() => { const l = docsPreCasoComData(); return { n: l.length, titulo: l[0] && l[0].titulo, venc: l[0] && l[0].prazo < hoje(), conta: quantosVencidos() }; });
  conf("o pedido do pré-caso com data vencida vira um cartão virtual (só o CNIS, o RG já chegou)",
    pc.n === 1 && pc.titulo === "📄 CNIS" && pc.venc);
  conf("e entra na conta das vencidas da barra", pc.conta >= 1);
  await p.evaluate(() => { filtroVencidas = true; render(); });
  const mv = await p.evaluate(() => {
    const c = [...document.querySelectorAll(".cartao[data-tarefa^='pc|']")][0];
    return c ? { nome: c.querySelector(".nome").textContent, semCheck: !c.querySelector("[data-conclui]"),
      cobrar: !!c.querySelector("button[onclick*='cobrarDocs']") } : null;
  });
  conf("no Meu Dia, o cartão do pré-caso tem o nome, não tem caixinha e tem o 📲",
    mv && /Belmiro Inventado Nogueira · 📄 CNIS/.test(mv.nome) && mv.semCheck && mv.cobrar);
  await p.evaluate(() => { window.__aberto = null; });
  await p.evaluate(([cli]) => cobrarDocs(cli, ""), [CLI_VAZIO]);
  await p.waitForTimeout(400);
  conf("cliente sem telefone: não abre WhatsApp, mas a cobrança fica nas anotações do atendimento",
    (await p.evaluate(() => window.__aberto)) === null
    && escritos.some(e => e.t === "clientes" && e.m === "PATCH" && /Cobrados de Belmiro os documentos pendentes: CNIS\./.test(e.corpo)));

  // ── 5 · o roteiro da perícia (F89) deixa o pedido no checklist com a data ─
  await p.evaluate(([caso, txt]) => { const i = segRegistrar(caso, txt, null); abrirSeguimento(i); },
    [CASO1, `Perícia médica agendada para o dia ${EV_BR} às 10h00min. Avisar a cliente.`]);
  await p.waitForSelector(".rot-box");
  await p.evaluate(() => salvarSeguimento());
  await p.waitForTimeout(800);
  const docPer = posts("tarefas").find(t => /Documentos médicos novos/.test(t.titulo));
  conf("o passo 'documentos médicos novos' do roteiro vira item do checklist com a data da perícia",
    docPer && docPer.caso_id === CASO1 && docPer.prazo === EV_ISO && docPer.titulo.includes(EV_PT));

  for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
