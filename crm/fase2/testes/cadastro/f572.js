// F572/F573 · o erro de página depois de enviar no WhatsApp (pedido do Paulo de 13.11.2026): o campo de escrever do computador
// trocava field-sizing content/fixed quando esvaziava com foco, e o Chrome derrubava a aba (STATUS_BREAKPOINT). Envia
// três vezes (Enter, Enter e botão) num computador de 1440 px e confere que a aba segue viva, que cada envio grava, que o
// campo volta vazio, baixo e com foco, que cresce com várias linhas e que não usa field-sizing. Dados fictícios.
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
    { id: "m8", seq: 8, conversa_id: CONV, direcao: "saida", tipo: "texto", texto: "Amanha as 9h", externo_id: "WA8", status: "enviada", enviada_em: agora, criado_em: agora },
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
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = []; let caiu = false;
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("crash", () => { caiu = true; });
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const campo = () => p.$eval("#zap-txt", t => ({ v: t.value, h: t.getBoundingClientRect().height, foco: document.activeElement === t,
    fs: getComputedStyle(t).fieldSizing || "" }));
  try {
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
    await p.waitForSelector("#app.logado");
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
    await p.evaluate(() => { zapFiltro = "todas"; irPara("whatsapp"); });
    await p.waitForSelector(".zap-conv"); await p.click(".zap-conv");
    await p.waitForSelector("#zap-msgs .zap-b");
    conf("o campo não usa field-sizing:content", (await campo()).fs !== "content");
    const vis = () => p.evaluate(() => ({ vazio: document.querySelector(".ze-linha").classList.contains("ze-vazio"),
      env: getComputedStyle(document.getElementById("zap-enviar")).display !== "none",
      mic: getComputedStyle(document.getElementById("zap-rec")).display !== "none" }));
    const css = await p.evaluate(() => [...document.styleSheets].flatMap(f => { try { return [...f.cssRules].map(r => r.cssText); } catch { return []; } })
      .filter(t => /zap-txt/.test(t) && /placeholder-shown/.test(t)).length);
    conf("F573: nenhuma regra do campo depende de :placeholder-shown", css === 0);
    let v = await vis();
    conf("F573: campo vazio mostra o microfone e esconde o Enviar", v.vazio && !v.env && v.mic);
    await p.fill("#zap-txt", "linha 1\nlinha 2\nlinha 3");
    v = await vis();
    conf("F573: com texto mostra o Enviar e esconde o microfone", !v.vazio && v.env && !v.mic);
    conf("o campo cresce com três linhas", (await campo()).h >= 60);
    const envios = [["primeiro envio", "Enter"], ["segundo envio", "Enter"], ["terceiro envio", "botão"]];
    for (const [txt, como] of envios) {
      await p.fill("#zap-txt", txt);
      if (como === "Enter") await p.press("#zap-txt", "Enter"); else await p.click("#zap-enviar");
      await p.waitForFunction(x => [...document.querySelectorAll("#zap-msgs .zap-b")].some(b => b.textContent.includes(x)), txt, { timeout: 5000 }).catch(() => {});
      await p.waitForTimeout(300);
      const c = await campo();
      conf(`${txt} (${como}): grava, a aba segue viva e o campo volta vazio, baixo e com foco`,
        !caiu && enviadas.includes(txt) && c.v === "" && c.h <= 30 && c.foco && c.fs !== "content");
      v = await vis();
      conf(`${txt}: depois do envio o campo vazio volta ao microfone`, v.vazio && !v.env && v.mic);
    }
  } catch (e) { conf("FALHA " + e.message.split("\n")[0], false); }
  console.log(erros.length ? "erros de console:\n" + erros.join("\n") : "erros de console: nenhum");
  ok.forEach(([n, v]) => console.log((v ? "✔ " : "✘ ") + n));
  const passou = ok.filter(([, v]) => v).length;
  console.log(`${passou}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(passou === ok.length && !erros.length && !caiu ? 0 : 1);
})();
