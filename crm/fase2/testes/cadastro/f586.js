// F586 · CONTATOS QUE NÃO SÃO CLIENTES (pedido do Paulo de 13.11.2026): advogado, fornecedor, banco, órgão público e
// parceiro ficam numa ficha com campos.contato e campos.nao_cliente. Confere a lista 📇 Contatos com o filtro da
// categoria, o ＋ Contato que grava, a ficha que não entra na lista Clientes, a recusa de virar contato com caso aberto,
// a volta a cliente e o topo da conversa do WhatsApp que diz "Contato · <categoria>". Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const CT = "d5860000-0000-0000-0000-000000000001";
const CONV = "d5860000-0000-0000-0000-000000000002";
const agora = new Date().toISOString();
const contato = { id: CT, nome: "Contato Teste Advocacia", cpf: null, telefone: "(00) 00000-0021", telefones: [],
  campos: { nao_cliente: true, contato: { cat: "Advogado", empresa: "Escritório Fictício", obs: "" } }, criado_em: agora };
const T = {
  clientes: [...FIX.clientes, contato],
  zap_conversas: [{ id: CONV, telefone: "5500000000021", chave: "00000021", nome_perfil: "Contato Teste", cliente_id: CT,
    atendente_id: null, status: "aberta", nao_lidas: 0, ultima_em: agora, ultimo_texto: "olá", sem_ia: true, bot_ativo: false }],
  zap_mensagens: [{ id: "m1", seq: 1, conversa_id: CONV, direcao: "entrada", tipo: "texto", texto: "olá",
    status: "entregue", criado_em: agora }],
};
const gravados = [];
(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const u = decodeURIComponent(rota.request().url()), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      const corpo = rota.request().postData() ? JSON.parse(rota.request().postData()) : {};
      gravados.push({ m, t, u, corpo });
      if (m === "POST" && t === "clientes") return rota.fulfill({ status: 201, contentType: "application/json",
        body: JSON.stringify([{ id: "d5860000-0000-0000-0000-0000000000aa", cpf: null, telefones: [], criado_em: agora, ...corpo }]) });
      return rota.fulfill({ status: 204, body: "" });
    }
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
  try {
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
    await p.waitForSelector("#app.logado");
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 2);
    conf("o contato não entra na lista Clientes", await p.evaluate(id => !ehClienteDaLista(D.cliPorId.get(id)), CT));
    await p.evaluate(() => irPara("contatos"));
    await p.waitForSelector("#ct-novo");
    const lista = await p.$eval("#conteudo-meio", e => e.textContent);
    conf("a lista 📇 Contatos mostra o contato e a categoria", /Contato Teste Advocacia/.test(lista) && /Advogado/.test(lista));
    conf("a lista não mostra os clientes", !/Aurélia Ficta/.test(lista));
    conf("o menu tem 📇 Contatos", await p.$$eval(".lista-item", ls => ls.some(l => /Contatos/.test(l.textContent))));

    await p.click("#ct-novo");
    await p.waitForSelector("#ct-nome");
    await p.fill("#ct-nome", "Gerente Teste");
    await p.selectOption("#ct-cat", "Banco");
    await p.fill("#ct-emp", "Banco Fictício");
    await p.fill("#ct-tel", "99999-0099");
    await p.click("#ct-ok");
    await p.waitForFunction(() => D.clientes.some(c => c.nome === "Gerente Teste"));
    const post = gravados.find(g => g.m === "POST" && g.t === "clientes");
    conf("o ＋ Contato grava nao_cliente e a categoria", post && post.corpo.campos.nao_cliente === true && post.corpo.campos.contato.cat === "Banco"
      && post.corpo.campos.contato.empresa === "Banco Fictício");
    conf("o telefone sem DDD ganha o 16", post && /\(16\)/.test(post.corpo.telefone || ""));

    // ficha com caso aberto não vira contato
    const recusa = await p.evaluate(id => { virarContato(id); return { av: document.getElementById("aviso")?.textContent || "", aberto: !!document.getElementById("ct-ok") }; }, FIX.clientes[0].id);
    conf("a ficha com caso aberto não vira contato", /caso aberto/.test(recusa.av) && !recusa.aberto);
    // a ficha sem caso vira contato e volta
    await p.evaluate(id => virarContato(id), FIX.clientes[1].id);
    await p.waitForSelector("#ct-ok");
    await p.selectOption("#ct-cat", "Fornecedor");
    await p.click("#ct-ok");
    await p.waitForFunction(id => ehContato(D.cliPorId.get(id)), FIX.clientes[1].id);
    conf("a ficha sem caso vira contato", await p.evaluate(id => rotContato(D.cliPorId.get(id)) === "Contato · Fornecedor", FIX.clientes[1].id));
    await p.evaluate(id => gravarContato(id, null), FIX.clientes[1].id);
    conf("a ficha volta a cliente", await p.evaluate(id => !ehContato(D.cliPorId.get(id)) && ehClienteDaLista(D.cliPorId.get(id)), FIX.clientes[1].id));

    await p.evaluate(() => { zapFiltro = "todas"; irPara("whatsapp"); });
    await p.waitForSelector(".zap-conv");
    await p.click(".zap-conv");
    await p.waitForSelector(".zap-topo");
    const topo = await p.$eval(".zap-topo", e => e.textContent);
    conf("o topo da conversa diz Contato · Advogado", /Contato · Advogado/.test(topo) && !/Contato · Contato/.test(topo) && !/Cliente:/.test(topo));
  } catch (e) { conf("FALHA " + e.message.split("\n")[0], false); }
  console.log(erros.length ? "erros de console:\n" + erros.join("\n") : "erros de console: nenhum");
  ok.forEach(([n, v]) => console.log((v ? "✔ " : "✘ ") + n));
  const passou = ok.filter(([, v]) => v).length;
  console.log(`${passou}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(passou === ok.length && !erros.length ? 0 : 1);
})();
