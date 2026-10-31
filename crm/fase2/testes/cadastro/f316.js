// 11.92 · TECLADO E CELULAR DEITADO (teste integral 11.88, etapa 5): o menu lateral se alcança por Tab e abre
// com Enter (VCP-02); o celular deitado fica no modo celular (VCE-02); o WhatsApp de 761 a 1023 px mostra uma
// coluna por vez e a conversa ocupa a largura útil (VCE-01); Enter na pesquisa abre a ficha (VCP-03) e a lista
// reserva espaço para os flutuantes (VCP-01). Dados fictícios.
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
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const erros = [];
  async function abrir(opc){
    const ctx = await nav.newContext(opc);
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
    p.on("pageerror", e => erros.push("pageerror: " + e.message));
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
    await p.waitForSelector("#app.logado");
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
    return { ctx, p };
  }
  const largura = (p, sel) => p.$eval(sel, e => e.getBoundingClientRect().width).catch(() => 0);
  try {
    // VCP-02 · só teclado, no computador
    { const { ctx, p } = await abrir({ viewport: { width: 1440, height: 900 } });
      let achou = false;
      for (let i = 0; i < 80 && !achou; i++) {
        await p.keyboard.press("Tab");
        achou = await p.evaluate(() => document.activeElement && document.activeElement.matches('.lista-item[data-v="planejado"]'));
      }
      conf("o Tab alcança o item Planejado do menu", achou);
      if (achou) { await p.keyboard.press("Enter"); await p.waitForTimeout(300); }
      conf("o Enter abre a lista Planejado", await p.evaluate(() => visao === "planejado"));
      // VCP-03 · "/", o nome e Enter abrem a ficha, sem esperar a pesquisa e sem Tab
      await p.fill("#busca", "Aurélia Ficta"); await p.press("#busca", "Enter"); await p.waitForTimeout(600);
      conf("o Enter na pesquisa abre a ficha do primeiro achado", await p.evaluate(() => clienteAberto === "c0000000-0000-0000-0000-000000000001"));
      // VCP-01 · o fim da lista reserva espaço para os flutuantes
      conf("a lista reserva espaço abaixo da última linha", await p.$eval("#conteudo-meio", e => parseFloat(getComputedStyle(e, "::after").height) >= 140));
      await ctx.close(); }
    // VCE-02 · celular deitado
    for (const [w, h] of [[844, 390], [800, 360]]) {
      const { ctx, p } = await abrir({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
      conf(`o celular deitado a ${w}x${h} fica no modo celular`, await p.$eval("#app", e => e.classList.contains("celular")));
      await ctx.close();
    }
    conf("o computador de tela baixa continua no modo computador", await (async () => {
      const { ctx, p } = await abrir({ viewport: { width: 1280, height: 480 } });
      const v = await p.$eval("#app", e => !e.classList.contains("celular")); await ctx.close(); return v; })());
    // VCE-01 · tablet em pé: uma coluna por vez
    { const { ctx, p } = await abrir({ viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true });
      await p.evaluate(() => { zapFiltro = "todas"; irPara("whatsapp"); });
      await p.waitForSelector(".zap-conv");
      const util = await p.$eval(".zap-tela", e => e.getBoundingClientRect().width);
      await p.tap(".zap-conv");
      await p.waitForSelector("#zap-msgs .zap-b");
      const w = await largura(p, "#zap-dir");
      conf(`a 768x1024 a conversa ocupa ao menos 80 % da largura útil (${Math.round(w)} de ${Math.round(util)} px)`, w >= util * 0.8);
      conf("a seta volta à lista", await p.$eval(".zt-voltar", e => getComputedStyle(e).display !== "none"));
      await p.tap(".zt-voltar"); await p.waitForTimeout(200);
      conf("de volta, a lista aparece", await largura(p, ".zap-lado") > 300);
      await ctx.close(); }
  } catch (e) { conf("FALHA " + e.message.split("\n")[0], false); }
  console.log(erros.length ? "erros de console:\n" + erros.join("\n") : "erros de console: nenhum");
  ok.forEach(([n, v]) => console.log((v ? "✔ " : "✘ ") + n));
  const passou = ok.filter(([, v]) => v).length;
  console.log(`${passou}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(passou === ok.length && !erros.length ? 0 : 1);
})();
