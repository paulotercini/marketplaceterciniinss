// O WHATSAPP NO CELULAR, BOTÃO A BOTÃO (pedido do Paulo de 29.10.2026): com a conversa em tela cheia (z-index 90), as
// caixas de Agendar, Retorno, Transferir, Encerrar, setor, etiqueta, reagir, encaminhar e mensagens prontas abriam por
// trás dela e o toque não respondia; a pílula da agenda cobria o áudio gravado; o topo mostrava o protocolo. Toca cada
// botão num celular de 390 px e confere que a caixa fica por cima e que o que grava, grava. Dados fictícios.
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
    atendente_id: null, status: "aberta", nao_lidas: 0, ultima_em: agora, ultimo_texto: "oi", atendimento_id: "e1" }],
  zap_mensagens: [{ id: "m1", seq: 1, conversa_id: CONV, direcao: "entrada", tipo: "imagem", texto: "o laudo", midia_url: "zap/x/laudo.jpg", midia_nome: "laudo.jpg", status: "entregue", criado_em: agora },
    { id: "m3", seq: 3, conversa_id: CONV, direcao: "entrada", tipo: "audio", texto: null, midia_url: "zap/x/a.ogg", midia_nome: "a.ogg", status: "entregue", criado_em: agora },
    { id: "m2", seq: 2, conversa_id: CONV, direcao: "saida", tipo: "documento", texto: null, midia_url: "zap/x/contrato.pdf", midia_nome: "contrato.pdf", status: "enviada", criado_em: agora }],
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
  const nav = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
  const ctx = await nav.newContext({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true, permissions: ["microphone"] });
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
      let corpo = null; try { corpo = rota.request().postData(); JSON.parse(corpo); } catch { corpo = null; }
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

  // a caixa aberta tem de ficar POR CIMA da conversa em tela cheia: o toque no meio dela cai nela
  const caixaNoTopo = () => p.evaluate(() => {
    const cx = document.querySelector("#modal .modal-cx") || document.querySelector("#janela");
    if (!cx || !cx.offsetWidth) return false;
    const r = cx.getBoundingClientRect(), el = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 40));
    return !!el && cx.contains(el);
  });
  const fechar = () => p.evaluate(() => fecharCaixa());
  const toca = async (sel, nome) => {
    await p.tap(sel); await p.waitForTimeout(150);
    const ok = await caixaNoTopo(); conf(nome + " abre a caixa por cima da conversa", ok);
    await fechar(); await p.waitForTimeout(80);
  };
  try {
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
    await p.waitForSelector("#app.logado.celular");
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
    await p.evaluate(() => { zapFiltro = "todas"; irPara("whatsapp"); });
    await p.waitForSelector(".zap-conv");
    // 29.10.2026 · a lista sem letra sobre letra: nenhuma fila corta o texto, os filtros não quebram em duas linhas e a
    // conversa não lida não vira cartão branco (a classe "nova" é também a do aviso de novidades)
    conf("a lista no celular não corta nem sobrepõe texto", await p.evaluate(() =>
      [...document.querySelectorAll(".zl-filas button")].every(b => b.scrollWidth <= b.clientWidth + 1)
      && new Set([...document.querySelectorAll(".zl-chips > *")].map(e => Math.round(e.getBoundingClientRect().top))).size === 1
      && [...document.querySelectorAll(".zap-conv")].every(e => getComputedStyle(e).borderTopWidth === "0px")
      && getComputedStyle(document.querySelector(".zl-sel-rot") || document.body).fontSize !== "16px"));
    await p.tap(".zap-conv");
    await p.waitForSelector("#zap-msgs .zap-b");
    conf("o topo não mostra o número de protocolo", !(await p.$(".zap-proto")) && !/Protocolo/.test(await p.$eval(".zap-topo", e => e.textContent)));
    await p.tap('button[onclick="assumirConversa()"]'); await p.waitForTimeout(300);
    conf("Assumir a conversa grava", escritas.some(e => /zap_conversas|assumir/.test(e.u)));
    await toca('.zt-acoes [aria-label="Retorno"]', "Retorno");
    await toca('.zt-acoes [aria-label="Transferir"]', "Transferir");
    await toca('.zt-acoes [aria-label="Encerrar"]', "Encerrar");
    await toca('button[onclick="escolherSetor()"]', "Setor");
    await toca('button[onclick="editarEtiquetas()"]', "Etiqueta");
    await p.tap(".zt-mais summary"); await p.waitForTimeout(100);
    conf("o ⋯ abre o menu à vista", await p.evaluate(() => { const b = document.querySelector('.zt-mais button[onclick="quemConversa()"]'); if (!b || !b.offsetWidth) return false; const r = b.getBoundingClientRect(); return b.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)); }));
    await toca('.zt-mais button[onclick="quemConversa()"]', "Quemconversa");
    await toca("#zb-m1 button[onclick^=\"reagirMsg\"]", "Reagir");
    await toca("#zb-m1 button[onclick^=\"encaminharMsg\"]", "Encaminhar");
    await toca('.zap-icone[aria-label="Mensagens prontas"]', "Mensagensprontas");
    await p.tap("#zb-m1 button[onclick^=\"responderMsg\"]"); await p.waitForTimeout(100);
    conf("↩ responder mostra a citação acima do campo", await vis(".zap-resp"));
    await p.tap(".zap-resp .btn-mini");
    await p.fill("#zap-txt", "Mensagem agendada de teste");
    await toca('.zap-icone[aria-label="Agendar envio"]', "Agendar");
    await p.fill("#zap-txt", "Mensagem agendada de teste");
    await p.tap('.zap-icone[aria-label="Agendar envio"]'); await p.waitForTimeout(150);
    await p.fill("#za-dia", new Date(Date.now() + 3 * 864e5).toLocaleDateString("sv"));
    await p.tap("#za-ok"); await p.waitForTimeout(300);
    conf("agendar grava a mensagem agendada", escritas.some(e => /zap_mensagens/.test(e.u) && e.b && e.b.status === "agendada" && e.b.texto === "Mensagem agendada de teste"));
    const ouvir = await p.$eval("#zb-m3 [data-ouvir]", e => e.getBoundingClientRect().width);
    await p.tap("#zb-m3 [data-ouvir]"); await p.waitForTimeout(300);
    const larg = await p.$eval("#zb-m3 audio", e => e.getBoundingClientRect().width).catch(() => 999);
    conf("o áudio para ouvir fica menor no celular (≤ 220 px)", larg <= 220);
    await p.tap("#zap-rec"); await p.waitForTimeout(1500);
    conf("o microfone grava", await p.$eval("#zap-rec", e => e.classList.contains("gravando")));
    await p.tap("#zap-rec"); await p.waitForTimeout(500);
    const prev = await p.$(".zap-audio-prev audio");
    if (prev) conf("o áudio gravado cabe na tela (≤ 220 px)", (await prev.boundingBox()).width <= 220);
    if (prev) await p.tap(".zap-audio-prev .btn-mini");
    conf("Descartar tira o áudio gravado", !(await p.$(".zap-audio-prev")));
    await p.setInputFiles("#zap-arq", { name: "rg.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
    await p.waitForTimeout(200);
    conf("o clipe envia o arquivo", escritas.some(e => /zap_mensagens/.test(e.u) && e.b && e.b.tipo === "documento"));
    await p.tap("#zap-btn-nota"); await p.waitForTimeout(100);
    await p.fill("#zap-txt", "nota de teste"); await p.tap("#zap-enviar"); await p.waitForTimeout(300);
    conf("a nota interna é gravada", escritas.some(e => /zap_mensagens/.test(e.u) && e.b && e.b.texto === "nota de teste"));
    await p.tap(".ze-modos button:first-child"); await p.waitForTimeout(100);
    await p.fill("#zap-txt", "resposta de teste"); await p.tap("#zap-enviar"); await p.waitForTimeout(300);
    conf("Enviar grava a resposta ao cliente", escritas.some(e => /zap_mensagens/.test(e.u) && e.b && e.b.texto === "resposta de teste"));
    conf("com a conversa aberta, a pílula da agenda não cobre a conversa", !(await vis(".zag-pilula")));
    await p.tap(".zt-mais summary"); await p.waitForTimeout(100);
    await p.tap('.zt-mais button[onclick*="zagAlternar"]'); await p.waitForTimeout(200);
    conf("o ⋯ abre a agenda de atendimentos", await vis(".zag-cx"));
    await p.tap(".zt-voltar"); await p.waitForTimeout(200);
    conf("a seta volta à lista", await vis(".zap-conv"));
    // a agenda aberta fica sobre a lista no celular: fecha antes de abrir a conversa de novo
    await p.evaluate(() => { if (zagAberta()) zagAlternar(); });
    await p.tap(".zap-conv"); await p.waitForSelector("#zap-msgs .zap-b");
    await p.waitForSelector(".zt-mais summary", { state: "visible" });
    await p.tap(".zt-mais summary"); await p.waitForTimeout(100);
    await p.tap('.zt-mais button[onclick="marcarNaoLida()"]'); await p.waitForTimeout(300);
    conf("Marcar como não lida grava e volta à lista com a bolinha", escritas.some(e => /zap_conversas/.test(e.u) && e.m === "PATCH" && e.b && e.b.nao_lidas === 1)
      && await vis(".zap-conv.nova .bolha"));
  } catch (e) { conf("FALHA " + e.message.split("\n")[0], false); }
  console.log(erros.length ? "erros de console:\n" + erros.join("\n") : "erros de console: nenhum");
  ok.forEach(([n, v]) => console.log((v ? "✔ " : "✘ ") + n));
  const passou = ok.filter(([, v]) => v).length;
  console.log(`${passou}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(passou === ok.length && !erros.length ? 0 : 1);
})();
