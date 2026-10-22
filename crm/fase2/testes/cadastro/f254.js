// F254 · quem é cliente na lista Clientes (pedido do Paulo, 22.10.2026): entra quem tem CPF e, sem CPF, quem tem nome
// e sobrenome que não sejam de tarefa; "Imprimir", "iCloud", "Pai" e o nome do próprio Paulo saem. O administrador tira um
// cadastro da lista pelo "Não é cliente" da ficha e o devolve pelo "É cliente"; no 🧹 Cuidar do acervo, "Conferir cadastros
// sem CPF" traz os que não parecem clientes já marcados. Nada é apagado. Banco simulado e dados fictícios. Uso: node f254.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f254";
fs.mkdirSync(OUT, { recursive: true });

const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: [], casos: [], atribuicoes: [], documentos_beneficio: FIX.documentos_beneficio || [],
  modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;
let seq = 0;
const cli = (nome, cpf = null, campos = {}) => { const c = { id: `c0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`, nome, cpf, telefone: null,
  campos, telefones: [], criado_em: "2026-01-01T12:00:00Z" }; T.clientes.push(c); return c; };
const comCpf = cli("Ana Fictícia Com CPF", "52998224725");
const semCpf = cli("Benedita Fictícia Sem Cpf");
const imprimir = cli("Imprimir"), icloud = cli("iCloud"), pai = cli("Pai"), impug = cli("Impugnação à Contestação");
const ligar = cli("Ligar- Osmar Fictício (marcar horário)"), proprio = cli("Paulo Roberto Tercini"), so1 = cli("Geraldo");
const voltou = cli("Carla Fictícia Volta", null, { nao_cliente: true });
// F255 · a cor da situação: caso andando, só no Escritório, nenhum aberto
const formacao = cli("Dora Fictícia Formação", "11144477735");
const caso = (c, fase, o = {}) => T.casos.push({ id: `b0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`, cliente_id: c.id, titulo: c.nome, fase,
  protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {}, marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {},
  criado_em: "2026-01-01T12:00:00Z", ...o });
caso(comCpf, "inss"); caso(comCpf, "encerrado"); caso(formacao, "escritorio", { pre_caso: true }); caso(semCpf, "encerrado");

const ok = [];
const conf = (nome, v) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); };

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
  await instalarBanco(ctx, { SUPA, SESSAO, banco });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const naLista = () => p.$$eval("#cli-todos-l .cli-todos-it b", b => b.map(x => x.textContent));
  const lista = async () => { await p.evaluate(() => irPara("clientes")); await p.waitForTimeout(300); return naLista(); };

  // 1 · a regra da lista
  let nomes = await lista();
  await p.screenshot({ path: path.join(OUT, "01-lista.png") });
  conf(`na lista ficam só as pessoas (${nomes.join(", ")})`, nomes.join() === [comCpf, semCpf, formacao].map(c => c.nome).join());
  const cores = await p.$$eval("#cli-todos-l .cli-todos-it", b => b.map(x => x.querySelector(".cli-sit").className.replace("cli-sit ", "") + ":" + x.querySelector(".cli-sit-t").textContent));
  conf(`ao lado do nome, a situação em cor (${cores.join(", ")})`, cores.join() === "ativo:Caso ativo,inativo:Inativo,formacao:Em formação");
  conf("a contagem da lista acompanha", /^3 clientes/.test(await p.textContent("#sub-lista")));
  conf("tarefas, contatos, nome só e o próprio Paulo ficam de fora", await p.evaluate(ids => ids.every(i => !ehClienteDaLista(D.cliPorId.get(i))),
    [imprimir, icloud, pai, impug, ligar, proprio, so1, voltou].map(c => c.id)));

  // 2 · Não é cliente / É cliente, na ficha
  await p.evaluate(async id => { await abrirFicha(id); }, semCpf.id); await p.waitForTimeout(400);
  conf("a ficha mostra 'Não é cliente' ao administrador", !!(await p.$(".cli-adv .cli-nao")));
  await p.click(".cli-adv .cli-nao"); await p.waitForTimeout(500);
  conf("o clique grava campos.nao_cliente e não apaga o cadastro", T.clientes.find(c => c.id === semCpf.id).campos.nao_cliente === true);
  conf("a ficha passa a dizer 'fora da lista Clientes' com o 'É cliente'", /fora da lista Clientes/.test(await p.textContent(".cli-adv")) && !!(await p.$(".cli-adv .cli-sim")));
  nomes = await lista();
  conf("e sai da lista", !nomes.includes(semCpf.nome));
  await p.evaluate(async id => { await abrirFicha(id); }, so1.id); await p.waitForTimeout(400);
  await p.click(".cli-adv .cli-sim"); await p.waitForTimeout(500);
  conf("'É cliente' devolve à lista quem tem só o primeiro nome", T.clientes.find(c => c.id === so1.id).campos.e_cliente === true && (await lista()).includes("Geraldo"));

  // 3 · Conferir cadastros sem CPF, no Cuidar do acervo
  await p.evaluate(() => irPara("acervo")); await p.waitForTimeout(400);
  await p.evaluate(() => { const d = document.getElementById("acervo-semcpf"); if (d) d.open = true; });
  await p.screenshot({ path: path.join(OUT, "02-acervo.png") });
  const g = await p.$$eval("#acervo-semcpf .semcpf-g", gs => gs.map(x => ({ t: x.querySelector("summary b").textContent,
    marcados: [...x.querySelectorAll(".semcpf-ck")].filter(i => i.checked).length, total: x.querySelectorAll(".semcpf-ck").length })));
  conf(`o grupo dos que não parecem clientes já vem marcado (${g.map(x => `${x.t}: ${x.marcados}/${x.total}`).join(" · ")})`,
    g.length === 1 && /Não parecem clientes \(6\)/.test(g[0].t) && g[0].marcados === 6);
  await p.click("#acervo-semcpf .btn-mini.forte"); await p.waitForTimeout(800);
  conf("'Tirar os marcados' grava nao_cliente nos seis", [imprimir, icloud, pai, impug, ligar, proprio].every(c => T.clientes.find(x => x.id === c.id).campos.nao_cliente === true));
  conf("nenhum cadastro foi apagado", T.clientes.length === 11);

  // 4 · quem não é administrador não vê nada disso
  await p.evaluate(() => { eu.papel = "colaborador"; });
  await p.evaluate(async id => { await abrirFicha(id); }, comCpf.id); await p.waitForTimeout(400);
  conf("o colaborador não vê o 'Não é cliente'", !(await p.$(".cli-adv .cli-nao")));
  conf("nem o bloco do acervo", await p.evaluate(() => blocoSemCpf() === ""));

  conf(`sem erro de página (${erros.join(" | ")})`, !erros.length);
  await nav.close(); s.close();
  const n = ok.filter(x => x[1]).length;
  console.log(`\n${n}/${ok.length} passaram`);
  process.exit(n === ok.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
