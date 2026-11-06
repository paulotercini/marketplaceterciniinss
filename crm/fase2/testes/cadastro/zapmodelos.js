// F411 · AS MENSAGENS PRONTAS COM OS DADOS DO CASO (Onda 1, decisões do Paulo de 05.11.2026): a perícia sai
// com data, hora e local do agendamento; o campo sem dado fica entre chaves e trava o Enviar; com dois
// casos abertos, o modelo pergunta de qual caso é. Dados fictícios.
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
  zap_conversas: [{ id: CONV, telefone: "5516999990002", chave: "99990002", nome_perfil: "Rosa", cliente_id: CLI,
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
  const usa = id => p.evaluate(id => usarModeloZap(D.modelos.find(m => m.id === id)), id);
  const txt = () => p.$eval("#zap-txt", e => e.value);
  const trava = () => p.$eval("#zap-enviar", e => e.disabled);

  await usa("m-per");
  conf("a perícia sai com a data, a hora e o local do agendamento", await txt() === "Olá, Rosa! Sua perícia: dia 12/11/2099, às 9h30, em APS Catanduva.");
  conf("e o Enviar fica livre", !(await trava()));

  await usa("m-doc");
  const doc = await txt();
  conf("a etapa pública, os documentos pedidos e o prazo do pedido entram", doc.includes("aguardando perícia") && doc.includes("1. Laudo do ortopedista") && doc.includes("20/11/2099"));

  await usa("m-rec");
  conf("o campo sem dado fica entre chaves e trava o Enviar", (await txt()).includes("{retorno}") && await trava());
  conf("e o aviso diz qual falta", /\{retorno\}/.test(await p.$eval("#zap-falta", e => e.hidden ? "" : e.textContent)));
  await p.evaluate(() => enviarZap());
  conf("o envio forçado não grava a mensagem", !escritas.some(e => /zap_mensagens/.test(e.u) && e.m === "POST"));
  await p.fill("#zap-txt", "Retornamos no dia 07/01/2027.");
  conf("preenchido à mão, o Enviar volta", !(await trava()) && await p.$eval("#zap-falta", e => e.hidden));

  // dois casos abertos: o modelo da perícia pergunta de qual caso é
  await p.evaluate(([cli, k2]) => { const k = { id: k2, cliente_id: cli, fase: "judicial", beneficio: "B41" };
    D.casosDoCliente.get(cli).push(k); D.casoPorId.set(k2, k); }, [CLI, K2]);
  await p.fill("#zap-txt", "");
  await usa("m-per");
  conf("com dois casos, abre a escolha do caso", await p.$$eval("[data-zk]", es => es.length === 2));
  conf("o modelo sem dado de caso não pergunta", await p.evaluate(() => { fecharCaixa(); usarModeloZap(D.modelos.find(m => m.id === "m-rec")); return !document.querySelector("[data-zk]"); }));
  await usa("m-per");
  await p.click("[data-zk]:nth-child(1)");
  conf("escolhido o caso da perícia, o texto sai completo", (await txt()).includes("9h30"));

  for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
