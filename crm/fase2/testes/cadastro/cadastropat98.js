// F98 — QUEM NÃO TEM FICHA SE CADASTRA NA PRÓPRIA IMPORTAÇÃO. O requerimento
// "sem cliente no CRM" parava no aviso "cadastre o cliente antes", e o PAT já
// traz a pessoa inteira (nome, CPF, nascimento, nome da mãe, celular). Agora a
// tabela lista quem é e o botão cadastra; o plano é refeito e o protocolo
// passa para "casos novos" na hora.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const CPF = "52998224725";   // CPF válido de exemplo, de ninguém
const PAT = { id: "col-98", fonte: "pat", criado_em: new Date().toISOString(), aplicada_em: null,
  dados: { versao: 2, total: 1,
    lista: [{ protocolo: "7777777777", status: "Em análise", cpfRequerente: CPF, nomeRequerente: "JOSEFA FICTA DA SILVA",
              nomeServico: "Aposentadoria por Idade Urbana", siglaServico: "TAIU", nomeUnidade: "APS Monte Alto",
              dataCriacao: "2026-09-01T10:00:00", dataUltimaAtualizacao: "2026-09-15T09:00:00" }],
    detalhes: [{ protocolo: "7777777777", status: "Em análise", cpfRequerente: CPF,
      nomeServico: "Aposentadoria por Idade Urbana", siglaServico: "TAIU", nomeUnidade: "APS Monte Alto",
      dataEntradaRequerimento: "2026-09-01T10:00:00", tipoCanalAtendimento: "INTERNET", comentarios: [], anexos: [],
      agendamentosPericia: [], agendamentosAvaliacaoSocial: [], procuradores: [],
      interessados: [{ id: 1, cpf: CPF, nome: "JOSEFA FICTA DA SILVA", nomeMae: "MARIA FICTA",
                       dataNascimento: "1961-03-22", contatos: [{ id: 1, tipo: "CELULAR", valor: "(16) 99999-1234" }] }] }] } };

(async () => {
  const escritos = [];
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
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      const corpo = rota.request().postData() || "";
      escritos.push({ t, m, corpo });
      return rota.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify([{ ...(JSON.parse(corpo || "{}")), id: "novo-" + escritos.length }]) });
    }
    let corpo = FIX[t] || [];
    if (t === "coletas") corpo = [PAT];
    if (t === "clientes" && /cpf=eq\./.test(u)) corpo = [];    // ninguém com esse CPF no banco
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error" && !/ERR_FAILED/.test(m.text())) erros.push("console: " + m.text()); });
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);

  // a tradução do detalhe traz o requerente pronto para o cadastro
  const req = await p.evaluate(det => resumoDoDetalhe(det).requerente, PAT.dados.detalhes[0]);
  conf("o detalhe do PAT vira requerente com nome, CPF, nascimento DDMMAAAA, mãe e celular",
    req && req.nome === "JOSEFA FICTA DA SILVA" && req.cpf === CPF && req.dn === "22031961"
      && req.nome_mae === "MARIA FICTA" && req.telefone === "(16) 99999-1234");

  // a importação: 1 requerimento sem cliente, com a tabela de cadastro
  await p.evaluate(() => { visao = "patinss"; return usarColeta("col-98"); });
  await p.waitForFunction(() => planoPat && planoPat.coleta_id === "col-98");
  const antes = await p.evaluate(() => ({ r: planoPat.resumo, tela: document.getElementById("conteudo-meio").textContent }));
  conf("o plano conta 1 sem cliente e 0 casos novos", antes.r.sem_cliente === 1 && antes.r.novos === 0);
  conf("a tela mostra quem é, com CPF, e oferece o botão de cadastrar",
    /JOSEFA FICTA DA SILVA/.test(antes.tela) && /529\.982\.247-25/.test(antes.tela) && /cadastrar cliente/.test(antes.tela));
  conf("o aviso deixou de mandar cadastrar 'antes' em outra tela", !/cadastre o cliente antes/.test(antes.tela));

  // o clique
  await p.evaluate(() => cadastrarDoPat("7777777777"));
  await p.waitForFunction(() => planoPat && planoPat.resumo.sem_cliente === 0);
  const post = escritos.filter(e => e.t === "clientes" && e.m === "POST").map(e => JSON.parse(e.corpo))[0];
  conf("a ficha nasce com o que o PAT trouxe",
    post && post.nome === "JOSEFA FICTA DA SILVA" && post.cpf === CPF && post.dn === "22031961"
      && post.nome_mae === "MARIA FICTA" && post.telefone === "(16) 99999-1234");
  conf("e com a anotação de origem (o requerimento do INSS)",
    post && /Cadastrado a partir do requerimento 7777777777 do INSS/.test(JSON.stringify(post.campos)));
  const depois = await p.evaluate(() => ({ r: planoPat.resumo, novo: (planoPat.novos[0] || {}), tela: document.getElementById("conteudo-meio").textContent,
    naMemoria: D.clientes.some(c => c.nome === "JOSEFA FICTA DA SILVA") }));
  conf("o plano é refeito: 0 sem cliente, 1 caso novo, para a cliente recém-cadastrada",
    depois.r.sem_cliente === 0 && depois.r.novos === 1 && depois.novo.nome === "JOSEFA FICTA DA SILVA" && depois.novo.protocolo === "7777777777");
  conf("o botão Aplicar já conta a mudança", /Aplicar 1 mudança/.test(depois.tela) && depois.naMemoria);

  // CPF que já tem ficha: não duplica, só refaz o plano
  await p.evaluate(() => { planoPat.semCliente.push({ protocolo: "8888888888", cpf: D.clientes[0].cpf, nome: "OUTRO NOME", lista: "inss", tipo: "beneficio" }); });
  const nPost = escritos.filter(e => e.t === "clientes" && e.m === "POST").length;
  await p.evaluate(() => cadastrarDoPat("8888888888"));
  await p.waitForTimeout(400);
  conf("CPF já cadastrado não vira segunda ficha", escritos.filter(e => e.t === "clientes" && e.m === "POST").length === nPost);

  for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
