// F519 · as mensagens de ausência salvas: o Offline mostra a lista, o clique devolve o texto ao
// campo, o ✕ chama zap_offline_esquecer e gravar põe o texto no alto da lista. Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const Z1 = "d1000000-0000-0000-0000-000000000001";
const EXTRA = {
  zap_conversas: [{ id: Z1, telefone: "5500000000001", chave: "00000001", nome_perfil: "Cliente Teste", cliente_id: null, atendente_id: null,
    status: "aberta", nao_lidas: 0, ultima_em: "2026-11-11T11:00:00Z", ultimo_texto: "Bom dia", bot_ativo: false }],
  zap_mensagens: [{ id: "m1", seq: 1, conversa_id: Z1, direcao: "entrada", tipo: "texto", texto: "Bom dia", externo_id: "WA1", status: "entregue", criado_em: "2026-11-11T11:00:00Z" }],
};

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
  const escritas = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = decodeURIComponent(rota.request().url()), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (m !== "GET") { const c = rota.request().postData(); escritas.push({ u, b: c ? JSON.parse(c) : null }); return rota.fulfill({ status: 204, body: "" }); }
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EXTRA[t] || FIX[t] || []) });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = []; p.on("pageerror", e => erros.push(e.message));
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.evaluate(() => { eu.zap_offline_msg = "Texto A"; eu.zap_offline_salvas = ["Texto A", "Texto B"]; estadoZap(); });
  conf("a lista mostra as duas mensagens salvas", (await p.textContent(".zof-salvas")).includes("Texto B"));
  await p.click('[data-zof-usar="1"]');
  conf("o clique leva a mensagem salva ao campo", (await p.inputValue("#zof-msg")) === "Texto B");
  await p.click('[data-zof-tirar="0"]');
  await p.waitForFunction(() => eu.zap_offline_salvas.length === 1);
  conf("o ✕ chama zap_offline_esquecer com o texto", escritas.some(e => /zap_offline_esquecer/.test(e.u) && e.b.p_msg === "Texto A"));
  conf("o campo mantém o que estava escrito depois do ✕", (await p.inputValue("#zof-msg")) === "Texto B");
  await p.fill("#zof-msg", "Texto C"); await p.click("#zof-off");
  await p.waitForFunction(() => eu.zap_offline_desde);
  conf("gravar manda o texto ao zap_meu_offline", escritas.some(e => /zap_meu_offline/.test(e.u) && e.b.p_msg === "Texto C" && e.b.p_offline));
  conf("o texto gravado entra no alto da lista", (await p.evaluate(() => eu.zap_offline_salvas.join("|"))) === "Texto C|Texto B");
  // F536: offline, o campo de escrever da conversa mostra o aviso vermelho e continua liberado
  await p.evaluate(() => irPara("whatsapp"));
  await p.waitForFunction(id => typeof zapConvs !== "undefined" && zapConvs.some(c => c.id === id), Z1);
  await p.evaluate(id => abrirConversa(id, true), Z1);
  await p.waitForSelector("#zap-txt");
  conf("offline, o campo de escrever traz o aviso vermelho", (await p.textContent(".ze-offline")).includes("Você está offline"));
  conf("enviar continua liberado", await p.isEnabled("#zap-txt"));
  await p.click(".ze-offline button");
  await p.waitForFunction(() => !eu.zap_offline_desde);
  await p.waitForFunction(() => !document.querySelector(".ze-offline"));
  conf("o Online do aviso volta a ficar online e tira o aviso", escritas.some(e => /zap_meu_offline/.test(e.u) && e.b.p_offline === false));
  // F538: a conversa coberta durante o Offline do titular fica com o substituto, que responde sem assumir
  await p.evaluate(() => {
    const c = zapConvs[0]; c.atendente_id = "00000000-0000-0000-0000-0000000000aa";
    c.cobertura = { titular: c.atendente_id, cobre: eu.id, desde: "2026-11-11T12:00:00Z" };
    zapFiltro = "minhas"; pintarListaZap(); pintarConversaGuardando();
  });
  await p.waitForSelector(".ze-cobre");
  conf("a conversa coberta entra nas Minhas do substituto", await p.evaluate(id => !!document.querySelector(`[data-zc="${id}"]`), Z1));
  conf("o substituto responde sem assumir", await p.evaluate(() => !precisaAssumir(zapConvs[0]) && !document.querySelector(".ze-assumir-aviso")));
  // F551: a lista e o topo dizem quem está de plantão
  conf("o topo diz Plantão com o nome de quem cobre", await p.evaluate(() => (document.querySelector(".zt-plantao")||{}).textContent?.includes("Plantão:")));
  conf("a lista diz plantão na conversa coberta", await p.evaluate(id => (document.querySelector(`[data-zc="${id}"]`)||{}).textContent?.includes("plantão"), Z1));
  // F542: o ⋯ da conversa escolhe se ela vai ou não ao plantão
  await p.evaluate(() => { D.config = D.config || new Map(); D.config.set("zap_cobertura", "sim"); pintarConversaGuardando(); });
  conf("o ⋯ oferece Não encaminhar ao plantão", await p.evaluate(() => [...document.querySelectorAll(".zt-menu button")].some(b => b.textContent.includes("Não encaminhar ao plantão"))));
  await p.evaluate(() => semCoberturaZap(true));
  await p.waitForFunction(() => !document.querySelector(".ze-cobre"));
  conf("marcar grava sem_cobertura e tira a cobertura da tela", escritas.some(e => /zap_conversas/.test(e.u) && e.b && e.b.sem_cobertura === true) && await p.evaluate(() => !zapConvs[0].cobertura));
  conf("sem erro na página", !erros.length);
  for (const [n, v] of ok) console.log((v ? "OK " : "FALHOU ") + n);
  await nav.close(); s.close();
  process.exit(ok.every(x => x[1]) ? 0 : 1);
})();
