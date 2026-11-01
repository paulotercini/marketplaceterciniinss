// F268 · A FICHA DE QUEM FALA E A DE QUEM ELA REPRESENTA: aberta a conversa, o painel da
// direita traz primeiro a ficha do dono da conversa e, abaixo, a dos clientes que ele
// representa (representante gravado na ficha ou o mesmo número na lista de telefones). Dados fictícios.
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
    { id: MAE, nome: "Rosa Fictícia Lima", cpf: "11122233396", telefone: "16999990002",
      campos: { docs_pedidos: [{ caso_id: "k9000000-0000-0000-0000-000000000001", em: "2026-10-30", itens: [{ nome: "Laudo do ortopedista" }] }] } },
    { id: FILHO, nome: "Pedro Fictício Lima", cpf: "22233344405", campos: { representante: { nome: "Rosa Fictícia Lima", cpf: "111.222.333-96", qualidade: "mãe" } } },
    { id: AVO, nome: "Antônio Fictício Lima", cpf: "33344455514", telefones: [{ numero: "16999990002", obs: "é a nora, cuida do benefício" }] },
    { id: OUTRO, nome: "Carla Fictícia Souza", cpf: "44455566623", campos: { representante: { nome: "Outra Pessoa", cpf: "99988877766" } } }],
  casos: [...(FIX.casos || []), { id: "k9000000-0000-0000-0000-000000000001", cliente_id: MAE, fase: "inss", beneficio: "B31", etapa: "aguardando perícia", exigencia_prazo: "2099-12-10" },
    { id: "k9000000-0000-0000-0000-000000000002", cliente_id: MAE, fase: "escritorio", pre_caso: true, beneficio: "B41", precaso: { etapas: { identificacao: { em: "2026-10-30" } } } }],
  credenciais: [{ id: "cr1", cliente_id: MAE, tipo: "meu_inss", valor: "Senha@Ficticia1" }],
  andamentos: [{ caso_id: "k9000000-0000-0000-0000-000000000001", texto: "Perícia agendada para 10/11", criado_em: agora, autor_id: null }],
  zap_conversas: [{ id: CONV, telefone: "5516999990002", chave: "99990002", nome_perfil: "Rosa", cliente_id: MAE,
    atendente_id: null, status: "aberta", nao_lidas: 0, ultima_em: agora, ultimo_texto: "oi" }],
  zap_mensagens: [{ id: "m1", seq: 1, conversa_id: CONV, direcao: "entrada", tipo: "texto", texto: "oi", status: "entregue", criado_em: agora }],
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
  const ctx = await nav.newContext({ viewport: { width: 1100, height: 1000 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  const escritas = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = decodeURIComponent(rota.request().url()), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
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
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);

  await p.evaluate(() => { zapFiltro = "todas"; irPara("whatsapp"); });
  await p.waitForSelector(".zap-conv");
  await p.click(".zap-conv");
  await p.waitForSelector("#zap-painel .zp-card", { state: "attached" });
  // F270 · em 1100 px a ficha é gaveta: fechada até o clique no nome, que abre e o ✕ fecha
  conf("em 1100 px a conversa fica com espaço (ficha fechada)", await p.$eval("#zap-dir", e => e.offsetWidth > 350)
    && await p.$eval("#zap-painel", e => getComputedStyle(e).display === "none"));
  await p.click(".zt-id h2");
  await p.waitForSelector("#zap-painel .zp-card:not(.zp-conv-cel)");
  const cards = await p.$$eval("#zap-painel .zp-card:not(.zp-conv-cel)", es => es.map(e => e.textContent));
  conf("o clique no nome abre a ficha na tela de 1100 px", await p.$eval("#zap-painel", e => getComputedStyle(e).display !== "none"));
  conf("a primeira ficha é a de quem fala", /Ficha do cliente/.test(cards[0]) && cards[0].includes("Rosa Fictícia Lima"));
  // F354 · CPF inteiro, a senha do Meu INSS à vista, o que se espera do cliente e o último andamento
  await p.waitForFunction(() => /Senha@Ficticia1/.test(document.getElementById("zap-painel").textContent), null, { timeout: 5000 }).catch(() => {});
  const painel = await p.$eval("#zap-painel", e => e.textContent);
  conf("o CPF aparece inteiro", painel.includes("111.222.333-96"));
  conf("a senha do Meu INSS aparece e o ver fica registrado", painel.includes("Senha@Ficticia1") && escritas.some(e => /credencial_vis/.test(e.u)));
  // F358 · leitura rápida: casos numerados com Abrir, prazos só com a data, sem o andamento nem o aguardando
  conf("os casos vêm numerados, com o título e o Abrir", /Caso 1/.test(painel) && /Caso 2/.test(painel)
    && await p.$$eval("#zap-painel .zp-caso button", es => es.length >= 2 && es.every(b => /Abrir/.test(b.textContent))));
  conf("o pré-caso se identifica pelo título", /\(pré-caso\)/.test(painel));
  conf("o painel não traz o último andamento nem o aguardando do cliente", !/Último andamento|Aguardando do cliente/.test(painel));
  conf("o nome do cliente é clicável", await p.$eval("#zap-painel .zp-nome", e => e.tagName === "BUTTON"));
  const datas = await p.$$eval("#zap-painel .zp-pz", es => es.map(e => e.textContent.trim()));
  conf("os prazos mostram somente a data", datas.length > 0 && datas.every(d => /^\d{2}\/\d{2}\/\d{4}$/.test(d)));
  const rep = await p.$$eval("#zap-painel .zp-rep", es => es.map(e => e.textContent));
  conf("abaixo, os dois clientes que ela representa", rep.length === 2 && rep[0].includes("Antônio") && rep[1].includes("Pedro"));
  conf("o representante gravado na ficha conta pelo CPF, com a qualidade", rep[1].includes("representante (mãe)"));
  conf("o advogado responsável aparece ao lado do nome, na lista e no topo",
    await p.$eval(".zap-conv .zc-adv", e => e.textContent.trim().length > 0).catch(() => false)
    && /Advogado:/.test(await p.$eval(".zt-sub", e => e.textContent)));
  conf("o mesmo número conta com a observação do telefone", rep[0].includes("é a nora, cuida do benefício"));
  conf("quem tem outro representante fica de fora", !rep.join("").includes("Carla"));
  conf("o título diz quantos são", (await p.textContent("#zap-painel .zp-rep-tit")).includes("(2)"));
  // F338 · o topo diz quem é o cliente; o ⋯ tem as ações do dia a dia e o resto em "Outras opções"
  conf("o topo diz todos os clientes do número, o dono primeiro", /Clientes: Rosa Fictícia Lima e Antônio Fictício Lima e mais 1/.test(await p.$eval(".zt-sub", e => e.textContent)));
  conf("o ⋯ deixa robô, histórico e IA em Outras opções", await p.evaluate(() => { const m = document.querySelector(".zt-menu"), o = m.querySelector(".zt-outras");
    return !!o && /Buscar histórico/.test(o.textContent) && !/Abrir a ficha do cliente/.test(m.textContent); }));
  // F286 · o ⋯ da conversa pede ao celular o histórico antigo
  // a gaveta da ficha cobre o ⋯ em 1100 px: o clique vai pelo próprio botão
  await p.evaluate(() => [...document.querySelectorAll(".zt-menu button")].find(b => /Buscar histórico/.test(b.textContent)).click());
  await p.waitForTimeout(300);
  const ped = escritas.find(e => e.m === "PATCH" && e.u.includes("zap_conversas?id=eq." + CONV) && e.b && e.b.historico_pedido);
  conf("Buscar histórico no celular grava o pedido na conversa", ped && ped.b.historico_feito === null);
  conf("e o botão passa a dizer que está buscando", await p.evaluate(() => /Buscando o histórico no celular/.test(document.querySelector(".zt-menu").textContent)));
  await p.evaluate(() => document.querySelector(".zt-mais")?.removeAttribute("open"));
  // 29.10.2026 · sem a coluna da ficha, o ⚡ e o Sugestões não cobrem o Enviar, e o telefone do topo fica numa linha
  conf("o Enviar não fica sob os botões flutuantes", await p.evaluate(() => { const t = document.querySelector(".zap-tela"), on = t.classList.contains("ficha-on");
    t.classList.remove("ficha-on"); document.getElementById("zap-txt").value = "x"; const r = document.getElementById("zap-enviar").getBoundingClientRect();
    const ok = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest("#zap-enviar") != null; if (on) t.classList.add("ficha-on"); document.getElementById("zap-txt").value = ""; return ok; }));
  conf("o telefone do topo ocupa uma linha", await p.evaluate(() => { const m = document.querySelector(".zt-sub .mono"); return m.getBoundingClientRect().height < 24; }));
  await p.click("#zap-painel .zp-rep button");
  await p.waitForTimeout(400);
  conf("Abrir ficha leva à ficha do representado", await p.evaluate(id => clienteAberto === id, AVO));
  // F282 · e a conversa fica ao lado da ficha, como no botão WhatsApp da ficha
  await p.waitForSelector("#painel-prazo .pp-zap-msgs", { timeout: 5000 }).catch(() => {});
  conf("a ficha abre com a conversa do WhatsApp ao lado", await p.evaluate(() => document.body.classList.contains("zap-aberto")
    && !!document.querySelector("#painel-prazo .pp-zap-msgs") && document.getElementById("app").classList.contains("detalhe-aberto")));
  conf("a agenda da tela do WhatsApp não fica por cima da ficha", await p.evaluate(() => { const a = document.getElementById("zap-ag"); return !a || !a.offsetParent; }));
  // F358 · o Abrir do caso leva ao caso, com a conversa ao lado
  const alvo = await p.evaluate(() => { const c = zapConvs.find(x => x.id === zapAberta) || zapConvs[0], cli = c && clienteDaConversa(c);
    const k = cli && (D.casosDoCliente.get(cli.id) || []).find(k => k.fase !== "encerrado" && !ehPreCaso(k)); return k ? [cli.id, k.id] : null; });
  if (alvo) { await p.evaluate(([c, k]) => casoComZap(c, k), alvo); await p.waitForTimeout(500); }
  conf("o Abrir do caso abre o caso com a conversa ao lado", !!alvo && await p.evaluate(([c, k]) => clienteAberto === c && casoSel === k
    && abaAtiva === 2 && document.body.classList.contains("zap-aberto"), alvo));

  for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
