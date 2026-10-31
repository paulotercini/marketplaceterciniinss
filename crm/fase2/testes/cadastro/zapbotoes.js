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
    atendente_id: null, status: "aberta", nao_lidas: 0, ultima_em: agora, ultimo_texto: "[audio]", atendimento_id: "e1" }],
  zap_mensagens: [{ id: "m1", seq: 1, conversa_id: CONV, direcao: "entrada", tipo: "imagem", texto: "o laudo", midia_url: "zap/x/laudo.jpg", midia_nome: "laudo.jpg", status: "entregue", criado_em: agora },
    { id: "m3", seq: 3, conversa_id: CONV, direcao: "entrada", tipo: "audio", texto: null, midia_url: "zap/x/a.ogg", midia_nome: "a.ogg", status: "entregue", criado_em: agora },
    { id: "m4", seq: 4, conversa_id: CONV, direcao: "entrada", tipo: "texto", texto: "Bom dia, doutor", status: "entregue", criado_em: agora },
    { id: "m5", seq: 5, conversa_id: CONV, direcao: "entrada", tipo: "texto", texto: "Veja https://www.gov.br/inss.", status: "entregue", criado_em: agora },
    { id: "m6", seq: 6, conversa_id: CONV, direcao: "entrada", tipo: "texto", texto: "Esqueci o que disse", status: "entregue", criado_em: agora, apagada_em: agora },
    { id: "m7", seq: 7, conversa_id: CONV, direcao: "entrada", tipo: "texto", texto: "Chego às 10h", texto_antes: "Chego às 9h", editada_em: agora, status: "entregue", criado_em: agora },
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
    if (/functions\/v1\/link_previa/.test(u)) return rota.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ titulo: "Meu INSS", descricao: "Serviços do INSS", imagem: "", site: "gov.br" }) });
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
    conf("a prévia da lista diz o tipo da mensagem (🎤 Áudio)", (await p.$eval(".zap-conv .l2", e => e.textContent)).trim() === "🎤 Áudio");
    await p.tap(".zap-conv");
    await p.waitForSelector("#zap-msgs .zap-b");
    conf("o fundo da conversa tem o desenho do aplicativo", await p.$eval("#zap-msgs", e => /svg/.test(getComputedStyle(e).backgroundImage)));
    // F324 · tocar e segurar o balão abre a fileira de emojis e as ações
    await p.evaluate(() => { const el = document.querySelector("#zb-m4 .txt"), r = el.getBoundingClientRect();
      const t = new Touch({ identifier: 1, target: el, clientX: r.left + 5, clientY: r.top + 5 });
      el.dispatchEvent(new TouchEvent("touchstart", { touches: [t], changedTouches: [t], bubbles: true })); });
    await p.waitForTimeout(650);
    conf("segurar o balão abre os emojis e as ações", await vis(".zm-emojis") && await vis('.zm-acoes [data-zm="r"]') && await vis('.zm-acoes [data-zm="c"]'));
    await p.tap('.zm-emojis [data-zm-r="👍"]'); await p.waitForTimeout(300);
    conf("o emoji do menu grava a reação", escritas.some(e => /zap_reacoes/.test(e.u) && e.b && e.b.emoji === "👍" && e.b.mensagem_id === "m4"));
    await p.evaluate(() => document.dispatchEvent(new TouchEvent("touchend", { bubbles: true })));
    // F328 · o link vira link e ganha a prévia do site; a lupa busca na conversa; o seletor põe o emoji no campo
    conf("o link da mensagem é clicável", !!(await p.$('#zb-m5 .txt a[href="https://www.gov.br/inss"]')));
    await p.waitForSelector("#zb-m5 .zap-link b", { timeout: 3000 }).catch(() => {});
    conf("o link mostra a prévia com o título do site", (await p.$eval("#zb-m5 .zap-link", e => e.textContent).catch(() => "")).includes("Meu INSS"));
    await p.tap('.zt-acoes button[aria-label="Buscar na conversa"]'); await p.waitForTimeout(100);
    await p.fill("#zap-bq", "bom dia"); await p.waitForTimeout(100);
    conf("a busca acha a mensagem sem diferença de maiúsculas", await p.$eval("#zb-m4", e => e.classList.contains("achou-atual"))
      && (await p.$eval("#zap-bn", e => e.textContent)) === "1 de 1");
    await p.fill("#zap-bq", "inexistente"); await p.waitForTimeout(100);
    conf("a busca sem resultado diz nenhuma", (await p.$eval("#zap-bn", e => e.textContent)) === "nenhuma");
    await p.press("#zap-bq", "Escape"); await p.waitForTimeout(100);
    conf("Esc fecha a busca", !(await p.$(".zap-busca")));
    await p.tap(".ze-emo summary"); await p.waitForTimeout(100);
    conf("o seletor de emojis abre", await vis(".ze-emo-grade"));
    await p.tap(".ze-emo-grade button"); await p.waitForTimeout(100);
    conf("o emoji entra no campo de escrever", (await p.$eval("#zap-txt", e => e.value)) === "😀");
    await p.evaluate(() => { document.querySelector(".ze-emo").open = false; const t = document.getElementById("zap-txt"); t.value = ""; t.style.height = ""; localStorage.removeItem("crm_zap_rasc"); });
    // F331 · apagada, editada, favorita e o rascunho que espera na conversa
    conf("a mensagem apagada fica riscada e avisa", await p.$eval("#zb-m6", e => e.classList.contains("apagada") && /apagou/.test(e.querySelector(".zap-apag").textContent)));
    conf("a editada diz Editada e guarda o texto de antes", (await p.$eval("#zb-m7 .zap-edit", e => e.title).catch(() => "")).includes("Chego às 9h"));
    await p.evaluate(() => favoritarMsg("m4")); await p.waitForTimeout(200);
    conf("favoritar grava e mostra a estrela", escritas.some(e => /zap_mensagens\?id=eq\.m4/.test(e.u) && e.b && e.b.favorita_em) && !!(await p.$("#zb-m4 .zap-fav")));
    await p.evaluate(() => verFavoritasZap()); await p.waitForTimeout(100);
    conf("a lista de favoritas traz a mensagem", (await p.$$(".zap-fav-it")).length === 1);
    await p.evaluate(() => fecharCaixa());
    await p.fill("#zap-txt", "texto pela metade"); await p.waitForTimeout(50);
    await p.evaluate(() => pintarConversa()); await p.waitForTimeout(100);
    conf("o rascunho volta ao repintar a conversa", (await p.$eval("#zap-txt", e => e.value)) === "texto pela metade");
    await p.evaluate(() => { const t = document.getElementById("zap-txt"); t.value = ""; t.oninput(); t.style.height = ""; });
    conf("apagar o texto apaga o rascunho", await p.evaluate(() => !JSON.parse(localStorage.getItem("crm_zap_rasc") || "{}")[Object.keys(JSON.parse(localStorage.getItem("crm_zap_rasc") || "{}"))[0]]));
    conf("o topo não mostra o número de protocolo", !(await p.$(".zap-proto")) && !/Protocolo/.test(await p.$eval(".zap-topo", e => e.textContent)));
    // F310 · o topo numa linha; atendente, setor e etiquetas ficam no cartão "Conversa" da ficha que o nome abre
    conf("o topo da conversa ocupa uma linha (≤ 56 px)", await p.$eval(".zap-topo", e => e.getBoundingClientRect().height) <= 56);
    conf("o campo de escrever ocupa uma linha (≤ 64 px)", await p.$eval(".zap-escrever", e => e.getBoundingClientRect().height) <= 64);
    conf("as mensagens ocupam ao menos 75 % da tela", await p.$eval("#zap-msgs", e => e.getBoundingClientRect().height / innerHeight) >= 0.75);
    conf("a hora fica na linha do texto da mensagem curta", await p.evaluate(() => { const b = document.querySelector("#zb-m4");
      return b.getBoundingClientRect().height < 36; }));
    await p.tap(".zt-id h2"); await p.waitForTimeout(150);
    conf("o nome abre a ficha com o cartão Conversa", await vis(".zp-conv-cel"));
    await p.tap('.zp-conv-cel button[onclick="assumirConversa()"]'); await p.waitForTimeout(300);
    conf("Assumir a conversa grava", escritas.some(e => /zap_conversas|assumir/.test(e.u)));
    await toca('.zp-conv-cel button[onclick="escolherSetor()"]', "Setor");
    await toca('.zp-conv-cel button[onclick="editarEtiquetas()"]', "Etiqueta");
    await p.tap(".zp-fechar"); await p.waitForTimeout(100);
    await toca('.zt-acoes [aria-label="Transferir"]', "Transferir");
    await toca('.zt-acoes [aria-label="Encerrar"]', "Encerrar");
    await p.tap(".zt-mais summary"); await p.waitForTimeout(100);
    conf("o ⋯ abre o menu à vista", await p.evaluate(() => { const b = document.querySelector('.zt-mais button[onclick="quemConversa()"]'); if (!b || !b.offsetWidth) return false; const r = b.getBoundingClientRect(); return b.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)); }));
    await toca('.zt-mais button[onclick="quemConversa()"]', "Quemconversa");
    // 30.10.2026 · as ações do balão aparecem só no balão tocado
    const balao = async () => { if (!(await p.$("#zb-m1.toque"))) { await p.evaluate(() => document.querySelectorAll("details[open]").forEach(d => d.open = false)); await p.tap("#zb-m1 .txt"); await p.waitForTimeout(80); } };
    conf("as ações do balão ficam escondidas até o toque", !(await vis("#zb-m1 .zap-acoes")));
    await balao();
    conf("o toque no balão mostra as ações dele", await vis("#zb-m1 .zap-acoes"));
    await toca("#zb-m1 button[onclick^=\"reagirMsg\"]", "Reagir");
    await balao();
    await toca("#zb-m1 button[onclick^=\"encaminharMsg\"]", "Encaminhar");
    await p.tap(".ze-mais summary"); await p.waitForTimeout(80);
    await toca('.ze-mais button[onclick*="frasesZap"]', "Mensagensprontas");
    await balao();
    await p.tap("#zb-m1 button[onclick^=\"responderMsg\"]"); await p.waitForTimeout(100);
    conf("↩ responder mostra a citação acima do campo", await vis(".zap-resp"));
    await p.tap(".zap-resp .btn-mini");
    await p.fill("#zap-txt", "Mensagem agendada de teste");
    await p.tap(".ze-mais summary"); await p.waitForTimeout(80);
    await toca('.ze-mais button[onclick*="agendarZap"]', "Agendar");
    await p.fill("#zap-txt", "Mensagem agendada de teste");
    await p.tap(".ze-mais summary"); await p.waitForTimeout(80);
    await p.tap('.ze-mais button[onclick*="agendarZap"]'); await p.waitForTimeout(150);
    await p.fill("#za-dia", new Date(Date.now() + 3 * 864e5).toLocaleDateString("sv"));
    await p.tap("#za-ok"); await p.waitForTimeout(300);
    conf("agendar grava a mensagem agendada", escritas.some(e => /zap_mensagens/.test(e.u) && e.b && e.b.status === "agendada" && e.b.texto === "Mensagem agendada de teste"));
    const ouvir = await p.$eval("#zb-m3 [data-ouvir]", e => e.getBoundingClientRect().width);
    await p.tap("#zb-m3 [data-ouvir]"); await p.waitForTimeout(300);
    const larg = await p.$eval("#zb-m3 .zap-player", e => e.getBoundingClientRect().width).catch(() => 999);
    conf("o áudio para ouvir fica menor no celular (≤ 220 px)", larg <= 220);
    conf("o áudio tem a onda, o tempo e a velocidade", !!(await p.$("#zb-m3 .zp-onda i")) && !!(await p.$("#zb-m3 .zp-tempo")));
    await p.tap("#zb-m3 .zp-vel");
    conf("a velocidade passa a 1,5×", (await p.textContent("#zb-m3 .zp-vel")) === "1,5×");
    conf("com o campo vazio, o microfone fica no lugar do Enviar", await vis("#zap-rec") && !(await vis("#zap-enviar")));
    await p.fill("#zap-txt", "x");
    conf("com texto, o Enviar volta e o microfone sai", await vis("#zap-enviar") && !(await vis("#zap-rec")));
    await p.fill("#zap-txt", "");
    await p.evaluate(() => { const b = document.getElementById("zb-m1"), r = b.getBoundingClientRect(), y = r.top + r.height / 2;
      const t = x => new Touch({identifier: 1, target: b, clientX: x, clientY: y});
      b.dispatchEvent(new TouchEvent("touchstart", {bubbles: true, touches: [t(r.left + 10)]}));
      b.dispatchEvent(new TouchEvent("touchmove", {bubbles: true, touches: [t(r.left + 90)]}));
      b.dispatchEvent(new TouchEvent("touchend", {bubbles: true, touches: []})); });
    await p.waitForTimeout(150);
    conf("arrastar o balão para a direita responde citando", await vis(".zap-resp"));
    if (await vis(".zap-resp")) await p.tap(".zap-resp .btn-mini");
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
    await p.tap(".ze-nota-cel"); await p.waitForTimeout(100);
    await p.fill("#zap-txt", "nota de teste"); await p.tap("#zap-enviar"); await p.waitForTimeout(300);
    conf("a nota interna é gravada", escritas.some(e => /zap_mensagens/.test(e.u) && e.b && e.b.texto === "nota de teste"));
    await p.tap(".ze-nota-cel"); await p.waitForTimeout(100);
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
    await p.tap('.zt-mais button[onclick="marcarNaoLida()"]'); await p.waitForSelector(".zap-conv.nova .bolha", { timeout: 3000 }).catch(() => {});
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
