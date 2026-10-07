// WHATSAPP NA FICHA. O botão ao lado do nome abre as mensagens só para ler,
// com o áudio transcrito; a aba Mensagens (e o Cadastro) mostra a última mensagem da conversa da ponte e
// leva direto a ela; conversa sem cliente ganha "vincular a cliente", que liga
// a conversa à ficha escolhida. Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CLI_VAZIO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const ZAP_CLI = "d1000000-0000-0000-0000-000000000001", ZAP_SOLTA = "d1000000-0000-0000-0000-000000000002";
const ZAPS = [
  { id: ZAP_CLI, telefone: "5516999990001", chave: "99990001", nome_perfil: "Cliente Ficta", cliente_id: CLI_CHEIO, lead_id: null, atendente_id: null,
    status: "aberta", nao_lidas: 2, ultima_em: "2026-10-01T13:00:00Z", ultimo_texto: "Chegou carta do INSS", bot_ativo: true },
  { id: ZAP_SOLTA, telefone: "5511988887777", chave: "88887777", nome_perfil: "Filha da cliente", cliente_id: null, lead_id: null, atendente_id: null,
    status: "aberta", nao_lidas: 0, ultima_em: "2026-10-02T13:00:00Z", ultimo_texto: "Sou a filha dela", bot_ativo: true },
];
const MSGS = [
  { id: "m1", direcao: "entrada", tipo: "texto", texto: "Chegou carta do INSS", status: "entregue", criado_em: "2026-10-01T13:00:00Z" },
  { id: "m2", direcao: "entrada", tipo: "audio", texto: "marcando a perícia para o dia 20", midia_url: "zap/x/a1.ogg", status: "entregue", criado_em: "2026-10-01T13:01:00Z" },
  { id: "m3", direcao: "entrada", tipo: "audio", texto: null, midia_url: "zap/x/a2.ogg", status: "entregue", criado_em: "2026-10-01T13:02:00Z" },
  { id: "m4", direcao: "saida", autor_id: null, por_bot: true, tipo: "texto", texto: "Recebemos sua mensagem", status: "enviada", criado_em: "2026-10-01T13:03:00Z" },
  { id: "m5", direcao: "entrada", tipo: "audio", texto: "[mídia não baixada]", midia_url: null, status: "entregue", criado_em: "2026-10-01T13:04:00Z" },
];

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
  const patches = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (m === "PATCH") {
      patches.push({ u, b: JSON.parse(rota.request().postData() || "{}") });
      const id = (u.match(/id=eq\.([0-9a-f-]+)/) || [])[1], z = ZAPS.find(x => x.id === id);
      if (z && /zap_conversas/.test(u)) Object.assign(z, patches.at(-1).b);
      return rota.fulfill({ status: 204, body: "" });
    }
    if (m !== "GET") return rota.fulfill({ status: 204, body: "" });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    let corpo = t === "zap_conversas" ? ZAPS : t === "zap_mensagens" ? MSGS : (FIX[t] || []);
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    const ou = decodeURIComponent(u).match(/or=\(cliente_id\.eq\.([0-9a-f-]+)(?:,chave\.in\.\(([\d,]+)\))?\)/);
    if (ou) corpo = corpo.filter(x => x.cliente_id === ou[1] || (ou[2] || "").split(",").includes(x.chave));
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

  // o botão ao lado do nome abre as mensagens, só para ler, com o áudio transcrito
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForSelector('.det-topo button[onclick^="verZapCliente"]');
  conf("o topo da ficha tem o botão 💬 WhatsApp com as novas", /WhatsApp.*2 novas/.test(await p.textContent('.det-topo button[onclick^="verZapCliente"]')));
  await p.click('.det-topo button[onclick^="verZapCliente"]');
  await p.waitForSelector("#modal .zap-msgs .zap-b");
  const jan = await p.textContent("#modal .zap-msgs");
  conf("a janela traz texto, áudio transcrito e áudio ainda transcrevendo", jan.includes("Chegou carta do INSS")
    && jan.includes("🎤 marcando a perícia para o dia 20") && jan.includes("transcrevendo…") && jan.includes("robô"));
  conf("áudio antigo sem arquivo diz que não foi baixado e não oferece ouvir", jan.includes("áudio antigo, não baixado")
    && (await p.$$eval("#modal .zap-b", bs => bs.filter(b => b.textContent.includes("não baixado") && b.querySelector("button")).length)) === 0);
  conf("a janela é só leitura: sem caixa de resposta", !(await p.$("#modal textarea")) && !(await p.$("#modal #zap-txt")));
  await p.waitForFunction(() => !(D.zapFicha || []).some(z => z.nao_lidas));
  conf("abrir zera as novas", patches.some(x => /zap_conversas\?id=in\./.test(x.u) && x.b.nao_lidas === 0));
  await p.evaluate(() => fecharCaixa());

  // a aba Mensagens também mostra a última e abre a mesma janela
  await p.waitForSelector('button.mt[data-vv="0"]');
  await p.click('button.mt[data-vv="0"]');
  await p.evaluate(() => irSubCad("mensagens"));
  await p.waitForSelector('.painel[data-p="0"].ativo .zap-ping');
  conf("a aba Mensagens mostra a última mensagem", (await p.textContent('.painel[data-p="0"].ativo .zap-ping')).includes("Chegou carta do INSS"));
  await p.click('.painel[data-p="0"].ativo .zap-ping button');
  await p.waitForSelector("#modal .zap-msgs .zap-b");
  conf("“ler mensagens” abre a janela de leitura", (await p.textContent("#modal h3")).includes("WhatsApp"));
  await p.evaluate(() => fecharCaixa());

  // na tela do WhatsApp, a conversa de cliente mostra “abrir ficha”
  await p.evaluate(() => irPara("whatsapp"));
  await p.waitForFunction(() => zapConvs.length);
  await p.evaluate(id => abrirConversa(id), ZAP_CLI);
  conf("conversa de cliente mostra “abrir ficha” e não “vincular”",
    (await p.textContent(".zap-topo")).includes("Abrir a ficha") && !(await p.textContent(".zap-topo")).includes("Vincular"));

  // quem cuida do benefício de outro: o número dele na ficha do outro traz a conversa
  await p.evaluate(cli => { const c = D.cliPorId.get(cli); c.telefone = "(16) 99999-0001";
    c.telefones = [{ numero: "16999990001", obs: "Fulana (namorada)", zap: true }]; }, CLI_VAZIO);
  await p.evaluate(cli => abrirFicha(cli), CLI_VAZIO);
  await p.waitForSelector('.det-topo button[onclick^="verZapCliente"]');
  await p.click('.det-topo button[onclick^="verZapCliente"]');
  await p.waitForSelector("#modal .zap-msgs .zap-b");
  const cab = await p.textContent("#modal .meio-sub");
  conf("a ficha de quem tem o número na lista mostra a conversa, dizendo de quem é", cab.includes("conversa de") && cab.includes("Fulana (namorada)"));
  await p.evaluate(() => fecharCaixa());

  // a conversa solta ganha o vincular, que liga à ficha escolhida
  await p.evaluate(id => abrirConversa(id), ZAP_SOLTA);
  conf("conversa sem cliente mostra “vincular a cliente”", (await p.textContent(".zap-topo")).includes("Vincular a um cliente"));
  const nome = await p.evaluate(id => D.cliPorId.get(id).nome, CLI_CHEIO);
  await p.evaluate(() => vincularConversa());
  await p.fill("#zv-busca", nome.split(" ")[0]);
  await p.waitForSelector(`[data-zv="${CLI_CHEIO}"]`);
  await p.click(`[data-zv="${CLI_CHEIO}"]`);
  await p.waitForFunction(id => (zapConvs.find(c => c.id === id) || {}).cliente_id, ZAP_SOLTA);
  const pt = patches.find(x => x.u.includes(`zap_conversas?id=eq.${ZAP_SOLTA}`));
  conf("vincular grava o cliente na conversa e limpa o prospecto", pt && pt.b.cliente_id === CLI_CHEIO && pt.b.lead_id === null);
  conf("depois de vincular o cabeçalho passa a “abrir ficha”", await p.waitForFunction(() =>
    (document.querySelector(".zap-topo")?.textContent || "").includes("Abrir a ficha"), null, { timeout: 5000 }).then(() => true, () => false));

  for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
