// F272 · A IA NO WHATSAPP, o lado do CRM: as caixas das Configurações, a fila
// "Automáticas" com o "Não é automática", e os botões ✨ (Resumo, Rascunho e
// "juntar ao caso"), que chamam a Edge Function zap_assistente e nunca
// mandam nada ao cliente. Dados fictícios; a função é simulada.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const CLI = FIX.casos[0].cliente_id, CASO = FIX.casos[0].id;
const CONV = "d3000000-0000-0000-0000-000000000010", AUTO = "d3000000-0000-0000-0000-000000000011";
const agora = new Date().toISOString();
const T = {
  config_app: [{ chave: "zap_ia_equipe", valor: "sim" }],
  zap_conversas: [
    { id: CONV, telefone: "5516999990010", chave: "99990010", nome_perfil: "Cliente", cliente_id: CLI,
      atendente_id: null, status: "aberta", nao_lidas: 0, ultima_em: agora, ultimo_texto: "o laudo", bot_ativo: false },
    { id: AUTO, telefone: "5511400000000", chave: "00000000", nome_perfil: "Banco X", cliente_id: null, automatica: true,
      atendente_id: null, status: "resolvida", nao_lidas: 0, ultima_em: agora, ultimo_texto: "Digite a opção", bot_ativo: true }],
  zap_mensagens: [
    { id: "m1", seq: 1, conversa_id: CONV, direcao: "entrada", tipo: "texto", texto: "já saiu minha aposentadoria?", status: "entregue", criado_em: agora },
    { id: "m2", seq: 2, conversa_id: CONV, direcao: "entrada", tipo: "imagem", texto: null, midia_url: "zap/x/laudo.jpg", midia_nome: "laudo.jpg", midia_mime: "image/jpeg", status: "entregue", criado_em: agora },
    { id: "m3", seq: 1, conversa_id: AUTO, direcao: "entrada", tipo: "texto", texto: "Digite a opção", status: "entregue", criado_em: agora }],
};
const PAINEL = { totais: {}, setores: [], atendentes: [] };

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1600, height: 1000 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  const escritas = [];
  const RESP = { resumo: { texto: "O cliente pergunta se a aposentadoria saiu." }, rascunho: { texto: "Bom dia! Vamos conferir e retornamos hoje." },
    documento: { tipo: "laudo médico", nome: "Laudo do ortopedista", caso_id: CASO, motivo: "o caso pede laudo" } };
  await ctx.route(SUPA + "/**", rota => {
    const u = decodeURIComponent(rota.request().url()), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (m !== "GET") {
      const corpo = rota.request().postData();
      const b = corpo ? JSON.parse(corpo) : null;
      escritas.push({ u, m, b });
      if (/functions\/v1\/zap_assistente/.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(RESP[b.acao]) });
      if (/rpc\/zap_virar_andamento/.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify("e0000000-0000-0000-0000-000000000099") });
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
  p.on("dialog", d => d.accept());
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);

  await p.evaluate(() => { zapFiltro = "todas"; irPara("whatsapp"); });
  await p.waitForSelector(".zap-conv");
  const lista = await p.textContent(".zap-lado");
  conf("a lista tem o link Automáticas", lista.includes("Automáticas"));
  await p.evaluate(() => { const d = document.querySelector(".zl-mais"); if (d) d.open = true; }); await p.click('[data-zf="auto"]');
  conf("a fila Automáticas mostra o robô de outra empresa", (await p.textContent(".zl-lista")).includes("Banco X"));
  await p.evaluate(() => { const d = document.querySelector(".zl-mais"); if (d) d.open = true; }); await p.click('[data-zf="fim"]');
  conf("e as Encerradas não o misturam", !(await p.textContent(".zl-lista")).includes("Banco X"));

  await p.evaluate(id => abrirConversa(id), AUTO);
  await p.waitForSelector(".zap-topo");
  conf("a automática avisa no topo", (await p.textContent(".zap-topo")).includes("Mensagem automática de outra empresa"));
  await p.evaluate(() => naoEhAutomatica());
  await p.waitForTimeout(300);
  const des = escritas.find(e => e.m === "PATCH" && e.u.includes(`zap_conversas?id=eq.${AUTO}`));
  conf("Não é automática devolve a conversa à fila", des && des.b.automatica === false && des.b.status === "aberta");

  await p.evaluate(id => abrirConversa(id), CONV);
  await p.waitForSelector(".zap-topo");
  const topo = await p.textContent(".zap-topo");
  conf("com a IA ligada, o topo tem Resumo e Rascunho", topo.includes("Resumo") && topo.includes("Rascunho"));
  await p.evaluate(() => iaZap("resumo"));
  await p.waitForTimeout(300);
  conf("o Resumo abre na janela, para a equipe", (await p.textContent("body")).includes("O cliente pergunta se a aposentadoria saiu."));
  const pr = escritas.find(e => /zap_assistente/.test(e.u) && e.b.acao === "resumo");
  conf("e chama a função com a conversa", pr && pr.b.conversa_id === CONV);
  await p.evaluate(() => fecharCaixa());
  await p.evaluate(() => iaZap("rascunho"));
  await p.waitForTimeout(300);
  conf("o Rascunho vai ao campo de escrever", (await p.inputValue("#zap-txt")) === "Bom dia! Vamos conferir e retornamos hoje.");
  conf("e nada é enviado ao cliente", !escritas.some(e => e.m === "POST" && /rest\/v1\/zap_mensagens/.test(e.u)));

  conf("a foto do cliente tem o ✨ juntar ao caso", await p.$(`#zb-m2 button[onclick*="identificarDocZap"]`));
  await p.evaluate(() => identificarDocZap("m2"));
  await p.waitForSelector("#jz-ok");
  conf("a janela traz o nome e o caso que a IA sugeriu", (await p.inputValue("#jz-nome")) === "Laudo do ortopedista"
    && (await p.inputValue("#jz-caso")) === CASO);
  await p.click("#jz-ok");
  await p.waitForTimeout(400);
  const an = escritas.find(e => /rest\/v1\/anexos/.test(e.u));
  conf("juntar vira andamento e documento do caso", escritas.some(e => /zap_virar_andamento/.test(e.u) && e.b.p_caso === CASO)
    && an && an.b.caso_id === CASO && an.b.caminho === "zap/x/laudo.jpg" && an.b.origem === "whatsapp" && an.b.andamento_id);

  await p.evaluate(() => { D.config.set("zap_ia_equipe", "nao"); abrirConversa(zapAberta); });
  await p.waitForTimeout(300);
  conf("com a IA desligada, os botões somem", !(await p.textContent(".zap-topo")).includes("Rascunho") && !(await p.$(`button[onclick*="identificarDocZap"]`)));

  await p.evaluate(() => { irPara("config"); });
  await p.waitForTimeout(400);
  conf("as Configurações têm as quatro caixas", await p.$("#cf-filtro-auto") && await p.$("#cf-ia-equipe") && await p.$("#cf-robo-agenda") && await p.$("#cf-robo-noturno"));
  conf("o prazo de volta ao robô aparece com 60 min", await p.$eval("#cf-volta-min", e => e.value).catch(() => "") === "60");
  conf("o plantão da IA nasce desligado, com 20 min e o caso novo para os três advogados", await p.$eval("#cf-ia-plantao", e => !e.checked).catch(() => false)
    && await p.$eval("#cf-plantao-min", e => e.value).catch(() => "") === "20" && await p.$eval("#cf-plantao-lead", e => e.value).catch(() => "") === "todos");
  conf("F275 · conversa na hora desligada (0 dias), chamada direta e as duas instruções editáveis",
    await p.$eval("#cf-plantao-aberta-dias", e => e.value).catch(() => "") === "0"
    && await p.$eval("#cf-ia-motor", e => e.value).catch(() => "") === "mensagens"
    && !!(await p.$("#cf-ia-txt-plantao")) && !!(await p.$("#cf-ia-txt-rascunho")));
  await p.selectOption("#cf-ia-motor", "agentes");
  await p.fill("#cf-ia-txt-plantao", "Atendemos de segunda a sexta.");
  await p.dispatchEvent("#cf-ia-txt-plantao", "change");
  await p.waitForTimeout(300);
  conf("trocar o motor e as instruções grava em config_app", escritas.some(w => JSON.stringify(w.b || "").includes("zap_ia_motor") && JSON.stringify(w.b).includes("agentes"))
    && escritas.some(w => JSON.stringify(w.b || "").includes("Atendemos de segunda a sexta.")));

  for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
