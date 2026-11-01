// F271 · O WHATSAPP NO CELULAR: a lista ocupa a tela; aberta a conversa, ela ocupa a tela toda, sem a barra de
// baixo e sem o ⚡ sobre o enviar; a seta volta à lista e o nome abre a ficha em tela cheia. Dados fictícios.
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
    atendente_id: null, status: "aberta", nao_lidas: 0, ultima_em: agora, ultimo_texto: "oi" }],
  zap_mensagens: [{ id: "m1", seq: 1, conversa_id: CONV, direcao: "entrada", tipo: "imagem", texto: "o laudo", midia_url: "zap/x/laudo.jpg", midia_nome: "laudo.jpg", status: "entregue", criado_em: agora },
    { id: "m2", seq: 2, conversa_id: CONV, direcao: "saida", tipo: "documento", texto: null, midia_url: "zap/x/contrato.pdf", midia_nome: "contrato.pdf", status: "enviada", criado_em: agora }],
};
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
  const ctx = await nav.newContext({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  const escritas = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = decodeURIComponent(rota.request().url()), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (/token=/.test(u)) return rota.fulfill({ status: 200, contentType: "image/png", body: PNG });
    if (/storage\/v1\/object\/sign\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ signedURL: "/object/sign/anexos/" + u.split("/sign/anexos/")[1] + "?token=t" }) });
    if (/storage\/v1\/object\/sign\/anexos\/.*token=/.test(u)) return rota.fulfill({ status: 200, contentType: "image/png", body: PNG });
    if (m !== "GET") {
      const corpo = rota.request().postData();
      escritas.push({ u, m, b: corpo ? JSON.parse(corpo) : null });
      if (/rpc\/zap_painel/.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PAINEL) });
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
  const vis = sel => p.$eval(sel, e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return cs.display !== "none" && cs.visibility !== "hidden" && r.width > 0 && r.height > 0; }).catch(() => false);
  try {
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
    await p.waitForSelector("#app.logado.celular");
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
    // F306 · a barra de baixo traz o WhatsApp no lugar do Buscar; a busca fica no alto
    const barra = await p.$$eval("#barra-cel button", b => b.filter(x => x.offsetParent !== null).map(x => x.dataset.cel));
    conf(`a barra de baixo é Meu Dia, WhatsApp, Menções e Listas (${barra.join(", ")})`, barra.join() === "meudia,whatsapp,mencoes,menu");
    conf("o WhatsApp da barra tem a marca", await p.$eval('#barra-cel [data-cel="whatsapp"] b svg', e => !!e.querySelector('path[fill="#25D366"]')).catch(() => false));
    conf("a busca continua no alto da tela", await vis("#busca-cel"));
    await p.evaluate(() => { zapFiltro = "todas"; });
    await p.tap('#barra-cel [data-cel="whatsapp"]');
    await p.waitForSelector(".zap-conv");
    conf("o botão abre o WhatsApp e fica aceso", await p.evaluate(() => visao === "whatsapp") && await p.$eval('#barra-cel [data-cel="whatsapp"]', e => e.classList.contains("on")));
    conf("sem conversa aberta, não aparece o quadro vazio “Escolha uma conversa”", !(await vis("#zap-dir")));
    await p.tap(".zap-conv");
    await p.waitForSelector("#zap-msgs .zap-b");
    const r = await p.$eval("#zap-dir", e => e.getBoundingClientRect().toJSON());
    conf("aberta, a conversa ocupa a tela toda", r.top === 0 && r.left === 0 && r.width === 390 && r.height === 780);
    conf("sem a barra de baixo e sem o ⚡ por cima", !(await vis(".barra-cel")) && !(await vis(".fab-rapida")));
    const t = await p.$eval("#zap-txt", e => e.getBoundingClientRect().bottom);
    conf("o campo de escrever fica à vista, no pé da tela", t > 600 && t <= 780);
    conf("os botões do topo ficam só com o ícone", await p.$eval(".zt-acoes .zt-btn.pri .lbl", e => getComputedStyle(e).display === "none"));
    await p.tap("#zb-m1 .txt");
    const sobre = await p.$eval("#zb-m1 .zap-acoes", e => getComputedStyle(e).position);
    conf("as ações do balão não cobrem o texto", sobre === "static");
    await p.tap(".zt-id h2");
    conf("o nome abre a ficha em tela cheia", await p.$eval("#zap-painel", e => { const r = e.getBoundingClientRect(); return r.width === 390 && getComputedStyle(e).position === "fixed"; }));
    await p.tap(".zp-fechar");
    conf("o ✕ fecha a ficha e volta à conversa", !(await vis("#zap-painel")) && await vis("#zap-msgs"));
    // F356 · o "i" do topo também abre a ficha
    await p.tap(".zt-info"); await p.waitForTimeout(200);
    conf("o botão i abre a ficha do cliente", await vis("#zap-painel"));
    await p.tap(".zp-fechar"); await p.waitForTimeout(200);
    await p.tap(".zt-voltar");
    await p.waitForTimeout(200);
    conf("a seta volta à lista, com a barra de baixo", await vis(".zap-conv") && !(await vis("#zap-dir")) && await vis(".barra-cel"));
  } catch (e) { conf("FALHA " + e.message.split("\n")[0], false); }
  console.log(erros.length ? "erros de console:\n" + erros.join("\n") : "erros de console: nenhum");
  ok.forEach(([n, v]) => console.log((v ? "✔ " : "✘ ") + n));
  const passou = ok.filter(([, v]) => v).length;
  console.log(`${passou}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(passou === ok.length && !erros.length ? 0 : 1);
})();
