// O nome do contato sem cliente (pedido do Paulo de 05.11.2026): o ✎ ao lado do nome e o Renomear do ⋯ gravam
// contato_nome, que passa a ser o nome da conversa; vazio, volta o nome do WhatsApp. Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const CONV = "d3000000-0000-0000-0000-000000000002";
const agora = new Date().toISOString();
const CLI = "c9000000-0000-0000-0000-000000000001", K1 = "k9000000-0000-0000-0000-000000000001", K2 = "k9000000-0000-0000-0000-000000000002";
const T = {
  clientes: [...FIX.clientes,
    { id: CLI, nome: "Rosa Fictícia Lima", cpf: "11122233396", telefone: "16999990002",
      campos: { docs_pedidos: [{ caso_id: K1, em: "2026-10-30", ate: "2099-11-20", itens: [{ nome: "Laudo do ortopedista" }] }] } }],
  casos: [...(FIX.casos || []), { id: K1, cliente_id: CLI, fase: "inss", beneficio: "B31", etapa: "aguardando perícia", nb: "1234567890" }],
  eventos: [{ id: "e1", caso_id: K1, tipo: "Perícia médica", data_hora: "2099-11-12T09:30:00-03:00", local: "APS Catanduva", status: "agendada" }],
  modelos_mensagem: [
    { id: "m-per", contexto: "pericia", titulo: "Lembrete de perícia", atalho: "pericia", texto: "Olá, {primeiro_nome}! Sua perícia: dia {data}, às {hora}, em {local}." },
    { id: "m-rec", contexto: "geral", titulo: "Recesso", atalho: "recesso", texto: "Retornamos no dia {retorno}." },
    { id: "m-doc", contexto: "documentos", titulo: "Solicitação de documentos", atalho: "docs", texto: "{primeiro_nome}, seu caso está em {etapa}. Precisamos de:\n{documentos}\nAté {prazo}." }],
  zap_conversas: [{ id: CONV, telefone: "5516999990002", chave: "99990002", nome_perfil: "☕", cliente_id: null,
    atendente_id: null, status: "aberta", nao_lidas: 0, ultima_em: agora, ultimo_texto: "oi" }],
  zap_mensagens: [{ id: "m1", seq: 1, conversa_id: CONV, direcao: "entrada", tipo: "texto", texto: "oi", status: "entregue", criado_em: agora }],
};

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1400, height: 1000 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  const escritas = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = decodeURIComponent(rota.request().url()), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (m !== "GET") {
      const corpo = rota.request().postData();
      escritas.push({ u, m, b: corpo ? JSON.parse(corpo) : null });
      if (/rpc\/zap_painel/.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ totais: {}, setores: [], atendentes: [] }) });
      return rota.fulfill({ status: 204, body: "" });
    }
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    let corpo = T[t] || FIX[t] || [];
    const cv = u.match(/conversa_id=eq\.([0-9a-f-]+)/);
    if (cv && t !== "mencoes") corpo = corpo.filter(x => x.conversa_id === cv[1]);
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
  await p.evaluate(() => { zapFiltro = "todas"; irPara("whatsapp"); });
  await p.waitForSelector(".zap-conv");
  await p.click(".zap-conv");
  await p.waitForSelector("#zap-txt");
  conf("sem cliente, o nome do WhatsApp aparece com o ✎", await p.$eval(".zt-nm h2", e => e.textContent) === "☕" && await p.$(".zt-renomear"));
  await p.click(".zt-renomear");
  await p.fill("#zn-nome", "Maria da Padaria");
  await p.press("#zn-nome", "Enter");
  await p.waitForFunction(() => document.querySelector(".zt-nm h2").textContent === "Maria da Padaria");
  const w = escritas.find(e => /zap_conversas\?id=eq\./.test(e.u) && e.m === "PATCH");
  conf("guarda o nome em contato_nome", w && w.b.contato_nome === "Maria da Padaria");
  conf("a lista mostra o nome novo", (await p.$eval(".zap-conv", e => e.textContent)).includes("Maria da Padaria"));
  await p.evaluate(() => { document.querySelector(".zt-mais").open = true; });
  await p.click('.zt-menu button:has-text("Alterar o nome do contato")');
  await p.fill("#zn-nome", "");
  await p.click("#zn-ok");
  await p.waitForFunction(() => document.querySelector(".zt-nm h2").textContent === "☕");
  conf("pelo ⋯, apagar o nome devolve o do WhatsApp", true);
  for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
