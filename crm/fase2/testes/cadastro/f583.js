// F583 · a conversa muito grande derrubava a aba ao abrir (pedido do Paulo de 13.11.2026): a conversa abre com as 150
// mensagens mais recentes e "Mostrar N anteriores" acrescenta 150 por vez, sem perder a posição. Confere com 3.000
// mensagens fictícias: só 150 balões, o botão acrescenta e mantém a rolagem, a mensagem nova não desloca o começo, a busca
// por mensagem antiga amplia a janela e irParaMsg alcança balão fora dela. Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const CONV = "d3000000-0000-0000-0000-000000000002";
const agora = new Date().toISOString();
const MAE = "c9000000-0000-0000-0000-000000000001", FILHO = "c9000000-0000-0000-0000-000000000002",
      AVO = "c9000000-0000-0000-0000-000000000003", OUTRO = "c9000000-0000-0000-0000-000000000004";
const T = {
  clientes: [...FIX.clientes,
    { id: MAE, nome: "Rosa Fictícia Lima", cpf: "11122233396", telefone: "16999990002", campos: {} },
    { id: FILHO, nome: "Pedro Fictício Lima", cpf: "22233344405", campos: { representante: { nome: "Rosa Fictícia Lima", cpf: "111.222.333-96", qualidade: "mãe" } } },
    { id: AVO, nome: "Antônio Fictício Lima", cpf: "33344455514", telefones: [{ numero: "16999990002", obs: "é a nora, cuida do benefício" }] },
    { id: OUTRO, nome: "Carla Fictícia Souza", cpf: "44455566623", campos: { representante: { nome: "Outra Pessoa", cpf: "99988877766" } } }],
  zap_conversas: [{ id: CONV, telefone: "5516999990002", chave: "99990002", nome_perfil: "Rosa", cliente_id: MAE,
    atendente_id: null, status: "aberta", nao_lidas: 0, ultima_em: agora, ultimo_texto: "[audio]", atendimento_id: "e1" }],
  zap_mensagens: Array.from({ length: 3000 }, (_, i) => ({ id: "m" + (i + 1), seq: i + 1, conversa_id: CONV,
    direcao: i % 2 ? "saida" : "entrada", tipo: "texto", texto: i === 10 ? "palavra antiguissima" : "mensagem " + (i + 1),
    status: "entregue", criado_em: agora })),
};
T.zap_setores = [{ id: "s1", nome: "Jurídico", cor: "#2a6", ativo: true, ordem: 1 }];
T.zap_etiquetas = [{ id: "e1", texto: "URGENTE", cor: "#fcc", ordem: 1 }];
const PAINEL = { totais: {}, setores: [], atendentes: [] };

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  const enviadas = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = decodeURIComponent(rota.request().url()), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (/token=/.test(u)) return rota.fulfill({ status: 200, contentType: "image/png", body: PNG });
    if (/storage\/v1\/object\/sign\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ signedURL: "/object/sign/anexos/x?token=t" }) });
    if (/functions\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    if (m !== "GET") {
      if (/rpc\/zap_painel/.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PAINEL) });
      if (m === "POST" && /rest\/v1\/zap_mensagens/.test(u)) {
        const b = JSON.parse(rota.request().postData() || "{}"), arr = (Array.isArray(b) ? b : [b]).map(x =>
          ({ id: "n" + (T.zap_mensagens.length + 1), seq: 100 + T.zap_mensagens.length, criado_em: new Date().toISOString(), status: "fila", ...x }));
        arr.forEach(x => { T.zap_mensagens.push(x); enviadas.push(x.texto); });
        return rota.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(arr) });
      }
      return rota.fulfill({ status: 204, body: "" });
    }
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    let corpo = T[t] || FIX[t] || [];
    const cv = u.match(/conversa_id=eq\.([0-9a-f-]+)/);
    if (cv && t !== "mencoes") corpo = corpo.filter(x => x.conversa_id === cv[1]);
    const rg = (rota.request().headers()["range"] || "").match(/^(\d+)-(\d+)$/);
    if (rg) corpo = corpo.slice(+rg[1], +rg[2] + 1);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = []; let caiu = false;
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("crash", () => { caiu = true; });
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const nb = () => p.$$eval("#zap-msgs .zap-b", x => x.length);
  try {
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
    await p.waitForSelector("#app.logado");
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
    await p.evaluate(() => { zapFiltro = "todas"; irPara("whatsapp"); });
    await p.waitForSelector(".zap-conv"); await p.click(".zap-conv");
    await p.waitForFunction(() => document.querySelectorAll("#zap-msgs .zap-b").length > 0 && zapMsgs.length === 3000);
    await p.waitForTimeout(300);
    conf("abre com 150 balões das 3.000 mensagens", await nb() === 150);
    conf("o último balão é a mensagem mais recente", await p.evaluate(() => !!document.getElementById("zb-m3000")));
    conf("o botão diz Mostrar 150 anteriores", await p.$eval(".zap-ant", b => /Mostrar 150 anteriores/.test(b.textContent)));
    const antes = await p.evaluate(() => { const c = document.getElementById("zap-msgs"); c.scrollTop = 0; return document.getElementById("zb-m2851").getBoundingClientRect().top; });
    await p.click(".zap-ant");
    await p.waitForTimeout(200);
    conf("o botão acrescenta 150 (300 balões)", await nb() === 300);
    const depois = await p.evaluate(() => document.getElementById("zb-m2851").getBoundingClientRect().top);
    conf("acrescentar mantém a posição da leitura", Math.abs(depois - antes) < 40);
    await p.evaluate(() => { zapMsgs.push({ id: "m3001", seq: 3001, conversa_id: zapAberta, direcao: "entrada", tipo: "texto", texto: "nova", status: "entregue", criado_em: new Date().toISOString() }); pintarConversaGuardando(); });
    conf("a mensagem nova entra sem deslocar o começo da janela", await nb() === 301 && await p.evaluate(() => !!document.getElementById("zb-m2701")));
    await p.evaluate(() => irParaMsg("m50"));
    await p.waitForTimeout(200);
    conf("irParaMsg alcança a mensagem antiga fora da janela", await p.evaluate(() => !!document.getElementById("zb-m50")));
    await p.evaluate(() => { zapMostrarDesde(zapMsgs.length - 150); });
    await p.evaluate(() => abrirBuscaZap && abrirBuscaZap());
    const q = await p.$(".zap-busca input");
    if (q) { await q.fill("antiguissima"); await p.waitForTimeout(300); }
    conf("a busca por mensagem antiga amplia a janela até ela", await p.evaluate(() => !!document.getElementById("zb-m11")));
    conf("a aba segue viva", !caiu);
  } catch (e) { conf("FALHA " + e.message.split("\n")[0], false); }
  console.log(erros.length ? "erros de console:\n" + erros.join("\n") : "erros de console: nenhum");
  ok.forEach(([n, v]) => console.log((v ? "✔ " : "✘ ") + n));
  const passou = ok.filter(([, v]) => v).length;
  console.log(`${passou}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(passou === ok.length && !erros.length && !caiu ? 0 : 1);
})();
