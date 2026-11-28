const { chromium, devices } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
// F822 · os itens "A IA não responde esta conversa" e "A IA conversa com este número" gravam ao clicar
// (o onclick lia uma variável c que só existia no template e falhava com "c is not defined"). Dados fictícios.
const D0 = __dirname;
const { FIX, SESSAO, EU } = require(D0 + "/fixturas");
const SUPA = "https://ficticio.supabase.co", CONV = "d5990000-0000-0000-0000-000000000002", agora = new Date().toISOString();
const T = { config_app: [...FIX.config_app, {chave:"zap_ia_plantao",valor:"sim",atualizado:agora},{chave:"zap_bot_ligado",valor:"sim",atualizado:agora}],
  zap_conversas: [{ id: CONV, telefone: "5500000000031", chave: "00000031", nome_perfil: "Robô Teste", cliente_id: null,
    atendente_id: EU, status: "aberta", nao_lidas: 0, ultima_em: agora, ultimo_texto: "olá", sem_ia: false, bot_ativo: false }],
  zap_mensagens: [{ id: "m1", seq: 1, conversa_id: CONV, direcao: "entrada", tipo: "texto", texto: "olá", status: "entregue", criado_em: agora }] };
const grav = [];
(async () => {
  const s = http.createServer((q, r) => { r.writeHead(200, {"Content-Type":"text/html"}); r.end(fs.readFileSync(D0 + "/app.html")); }).listen(0);
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext(devices["iPhone 13"]);
  await ctx.addInitScript(([u, ss]) => { localStorage.setItem("crm_cfg", JSON.stringify({url:u,key:"a".repeat(60)})); localStorage.setItem("crm_sessao", JSON.stringify(ss)); localStorage.setItem("crm_tema","v10"); }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => { const u = decodeURIComponent(rota.request().url()), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({status:200,contentType:"application/json",body:JSON.stringify(SESSAO)});
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/)||[])[1];
    if (m !== "GET") { grav.push({m,t,u,c:rota.request().postData()}); return rota.fulfill({status:204,body:""}); }
    let c = T[t] || FIX[t] || []; return rota.fulfill({status:200,contentType:"application/json",body:JSON.stringify(c)}); });
  await ctx.route(/fonts\./, r => r.abort());
  const p = await ctx.newPage(); const er=[]; p.on("pageerror", e => er.push(e.message));
  await p.goto(`http://127.0.0.1:${s.address().port}/`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size >= 1);
  await p.evaluate(() => { zapFiltro = "todas"; irPara("whatsapp"); });
  await p.waitForSelector(".zap-conv"); await p.click(".zap-conv"); await p.waitForSelector(".zt-mais summary");
  await p.click(".zt-mais summary"); await p.click(".zt-outras summary");
  const b = p.locator(".zt-outras button", { hasText: "A IA não responde esta conversa" });
  console.log("botões:", await b.count()); await b.click(); await p.waitForTimeout(800);
  const ok = grav.some(g => g.t === "zap_conversas" && /"sem_ia":true/.test(g.c || ""))
    && (await p.locator(".zt-pergunta").allTextContents()).some(t => /A IA não responde/.test(t)) && !er.length;
  console.log((ok ? "✔ " : "✘ ") + "A IA não responde esta conversa grava sem_ia e mostra a faixa", er.join(" "));
  await nav.close(); s.close(); process.exit(ok ? 0 : 1);
})();
