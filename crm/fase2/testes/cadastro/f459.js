// F459 · o Meu Dia no celular em uma linha só (pedido do Paulo, 08.11.2026): data, nome, atribuição e ⭐; o toque abre a
// extensão com CPF, senha do Meu INSS, WhatsApp e a última anotação só com a data e o texto. Banco simulado. Uso: node f459.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f459";
fs.mkdirSync(OUT, { recursive: true });
const PAULO = FIX.colaboradores[0].id;
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: [...FIX.colaboradores], clientes: [], casos: [], atribuicoes: [], documentos_beneficio: FIX.documentos_beneficio || [],
  modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;
const iso = n => new Date(Date.now() - 3 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
const ts = (n, h = "12:00") => `${iso(n)}T${h}:00-03:00`;
let seq = 0;
const id = p => `${p}0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const c = { id: id("c"), nome: "Marcia Fictícia Lyra", cpf: "52998224725", telefone: "16999990001", telefones: [{ numero: "16999990001", zap: true }], campos: {}, criado_em: ts(-400) };
T.clientes.push(c);
const k = { id: id("b"), cliente_id: c.id, titulo: c.nome, beneficio: "Aux. Incapacidade", especie: "B31", fase: "judicial", origem_lista: "👪 Judicial",
  protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {}, marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {},
  importante: true, urgente: false, criado_em: ts(-300) };
T.casos.push(k); T.atribuicoes.push({ caso_id: k.id, colaborador_id: PAULO });
const a = { id: id("e"), caso_id: k.id, autor_id: PAULO, texto: "Avisar a cliente da perícia judicial de 16/11, com documento com foto e exames.", origem: "app",
  origem_id: null, criado_em: ts(-3), publico: false, excluir: false, importante: false, urgente: false, responde_a: null };
T.andamentos.push(a);
T.andamento_tarefas.push({ id: id("f"), andamento_id: a.id, caso_id: k.id, colaborador_id: PAULO, atribuido_por: PAULO, lembrar_em: iso(-2), natureza: "compromisso",
  papel: "executa", concluida_em: null, iniciada_em: null, etapas: [], criado_em: a.criado_em });
T.credenciais.push({ id: id("d"), cliente_id: c.id, tipo: "meu_inss", valor: "Senha#Ficticia1", criado_em: ts(-100) });
// F460 · o retorno do To Do, sem motivo escrito: a atribuição da linha é a última anotação da equipe
const c2 = { id: id("c"), nome: "Osvaldo Fictício Nery", cpf: "11144477735", telefone: "16999990002", campos: {}, criado_em: ts(-400) };
T.clientes.push(c2);
const k2 = { id: id("b"), cliente_id: c2.id, titulo: c2.nome, beneficio: "Aposentadoria", especie: "B42", fase: "inss", origem_lista: "🌻 INSS", prazo: iso(0), todo_prazo: iso(0),
  protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {}, marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, criado_em: ts(-300) };
T.casos.push(k2); T.atribuicoes.push({ caso_id: k2.id, colaborador_id: PAULO });
T.andamentos.push({ id: id("e"), caso_id: k2.id, autor_id: PAULO, texto: "Aguardar a análise do INSS e conferir o PAT.", origem: "app", origem_id: null, criado_em: ts(-5), publico: false, excluir: false, importante: false, urgente: false, responde_a: null });

const ok = [];
const conf = (nome, v) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); return v; };

(async () => {
  const s = http.createServer((q, r) => {
    const f = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(f)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(f));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
    localStorage.setItem("crm_ext_linha", "1");
  }, [SUPA, SESSAO]);
  await instalarBanco(ctx, { SUPA, SESSAO, banco });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await p.evaluate(() => irPara("meudia")); await p.waitForTimeout(1200);
  const linha = p.locator(`.cartao.ag-linha[data-casos="${k.id}"]`).first();
  conf("a linha do caso está no Meu Dia", await linha.count() === 1);
  const vis = await linha.evaluate(el => [...el.children].filter(x => x.getBoundingClientRect().width && getComputedStyle(x).display !== "none")
    .map(x => ({ c: x.className.split(" ")[0], t: x.getBoundingClientRect().top, b: x.getBoundingClientRect().bottom, l: x.getBoundingClientRect().left })));
  const classes = vis.map(x => x.c);
  conf("na linha ficam só a data, o texto e a estrela", classes.join(",") === "ag-data,ag-txt,acoes") || console.log(classes);
  if(!conf("tudo na mesma altura, a data no canto esquerdo", vis.every(x => Math.abs((x.t + x.b) / 2 - (vis[0].t + vis[0].b) / 2) < 10) && vis[0].l < 30)) console.log(JSON.stringify(vis));
  const txt = await linha.locator(".ag-txt").innerText();
  conf("o texto traz o nome e a atribuição, sem a espécie", /Marcia Fictícia Lyra/.test(txt) && /avisar a cliente/i.test(txt) && !/B31/.test(txt)) || console.log(txt);
  const l2 = p.locator(`.cartao.ag-linha[data-casos="${k2.id}"]`).first();
  await p.waitForTimeout(800);
  const txt2 = await l2.innerText().catch(() => "");
  conf("o retorno do To Do traz a última anotação como atribuição (F460)", /Osvaldo/.test(txt2) && /aguardar a análise do INSS/i.test(txt2)) || console.log(txt2);
  const alt = await linha.evaluate(el => el.getBoundingClientRect().height);
  conf("a linha tem uma altura só (até 48 px)", alt <= 48) || console.log(alt);
  await p.screenshot({ path: OUT + "/linha.png" });
  await linha.tap(); await p.waitForTimeout(900);
  const ext = p.locator(".ag-ext");
  conf("o toque abre a extensão", await ext.count() === 1 && await p.evaluate(() => !clienteAberto));
  conf("a extensão mostra o CPF", await ext.locator('[data-cop="52998224725"]').count() === 1);
  conf("a senha do Meu INSS está à vista", /Senha#Ficticia1/.test(await ext.locator('[data-ae="senha"]').innerText()));
  conf("há o botão do WhatsApp", await ext.locator('[data-ae="zap"]').count() === 1);
  const cab = await ext.locator(".ae-cab").innerText();
  conf("a anotação vem só com a data e o texto", /^\d{2}\/\d{2}\/\d{4}$/.test(cab.trim()) && /avisar a cliente/i.test(await ext.locator(".ae-txt").innerText())) || console.log(cab);
  conf("sem o rótulo 'Última anotação'", !/Última anotação/.test(await ext.innerText()));
  await p.screenshot({ path: OUT + "/extensao.png" });
  await ext.locator('[data-ae="zap"]').tap(); await p.waitForTimeout(1200);
  conf("o WhatsApp leva à conversa do cliente", await p.evaluate(() => visao === "whatsapp"));
  conf("sem erro de página", !erros.length) || console.log(erros.slice(0, 3));
  console.log(`${ok.filter(x => x[1]).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ok.every(x => x[1]) ? 0 : 1);
})();
