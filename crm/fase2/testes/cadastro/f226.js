// F226 · onda 1 dos pré-casos (docs/PRE-CASOS.md): o pré-caso é linha de casos na
// fase Escritório (pre_caso), cada um com cartão próprio no 🙋 Escritório; gerar o
// caso muda a fase da mesma linha; arquivar encerra; "não é caso" volta a pré-caso
// sem apagar nada. Banco simulado de estado e dados fictícios.
// Uso: node f226.js [pasta-das-fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f226";
fs.mkdirSync(OUT, { recursive: true });

const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: JSON.parse(JSON.stringify(FIX.clientes)), casos: JSON.parse(JSON.stringify(FIX.casos)),
  atribuicoes: FIX.atribuicoes, documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;
const A = "c0000000-0000-0000-0000-000000000a26", B = "c0000000-0000-0000-0000-000000000b26";
const KB = "b0000000-0000-0000-0000-000000000b26", KT = "b0000000-0000-0000-0000-000000000c26";
// A: atendimento antigo em campos.precasos (antes da F226)
T.clientes.push({ id: A, nome: "Albertina Fictícia Prado", cpf: "70010020044", telefone: "(16) 99000-4001", criado_em: "2026-10-01T12:00:00Z",
  campos: { precasos: [{ id: "pc_a1", especie: "Aposentadoria por idade", natureza: "", marc: {}, honorarios: "", quem: null, em: "2026-10-01" }] } });
// B: caso de verdade no INSS (com andamento) e uma linha antiga do 🙋 Escritório vinda do To Do
T.clientes.push({ id: B, nome: "Benedito Fictício Lago", cpf: "70010020055", telefone: "(16) 99000-4002", campos: {}, criado_em: "2025-01-01T12:00:00Z" });
const caso = o => ({ titulo: "", protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {}, marcadores: [], ...o });
T.casos.push(caso({ id: KB, cliente_id: B, titulo: "Benedito Fictício Lago", fase: "inss", beneficio: "Revisão de aposentadoria", criado_em: "2025-02-01T12:00:00Z" }),
  caso({ id: KT, cliente_id: B, titulo: "Benedito Fictício Lago", fase: "escritorio", pre_caso: true, beneficio: "Auxílio-acidente",
    todo_task_id: "todo-ficticio-1", origem_lista: "🙋 Escritório", criado_em: "2025-03-01T12:00:00Z" }));
T.andamentos.push({ id: "ad000000-0000-0000-0000-000000000b26", caso_id: KB, texto: "Andamento fictício do INSS", criado_em: "2025-02-02T12:00:00Z", origem: "app" });

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
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const linhas = cli => T.casos.filter(k => k.cliente_id === cli);

  // 1 · o atendimento antigo continua legível e, ao gravar, vira linha de casos com o mesmo id
  conf("o pré-caso de campos.precasos continua sendo lido", await p.evaluate(a => precasosDe(D.cliPorId.get(a)).map(x => x.id).join() === "pc_a1", A));
  await p.evaluate(a => gravarPrecasos(a, [...precasosDe(D.cliPorId.get(a)), { id: "pc_a2", especie: "BPC/LOAS", natureza: "", marc: {}, honorarios: "", quem: null, em: "2026-10-02" }]), A);
  const la = linhas(A);
  conf("gravar cria uma linha de casos por pré-caso, na fase Escritório com pre_caso",
    la.length === 2 && la.every(k => k.pre_caso === true && k.fase === "escritorio" && k.origem_lista === "🙋 Escritório"));
  conf("o id de cada pré-caso (citado por anotações e cards) fica em casos.precaso",
    la.map(k => k.precaso.id).sort().join() === "pc_a1,pc_a2" && la.some(k => k.beneficio === "BPC/LOAS"));
  conf("campos.precasos sai do cadastro, porque a linha passou a ser a fonte", !("precasos" in (T.clientes.find(c => c.id === A).campos || {})));
  conf("e a leitura devolve os dois, com o caso_id da linha", await p.evaluate(a => { const v = precasosDe(D.cliPorId.get(a));
    return v.length === 2 && v.every(x => x.caso_id) && v[0].id === "pc_a1"; }, A));
  conf("gravar de novo sem mudança não duplica a linha", await p.evaluate(async a => { await gravarPrecasos(a, precasosDe(D.cliPorId.get(a))); return true; }, A) && linhas(A).length === 2);

  // 2 · D1 · dois cartões no 🙋 Escritório, um por pré-caso, com o passo
  await p.evaluate(() => { visao = "fase:escritorio"; filtroColab = null; render(); });
  await p.waitForTimeout(400);
  const cart = await p.evaluate(a => [...document.querySelectorAll(`#conteudo-meio .cartao[data-cli="${a}"]`)].map(c => c.textContent.replace(/\s+/g, " ")), A);
  await p.screenshot({ path: path.join(OUT, "01-escritorio-dois-cartoes.png") });
  conf(`o cliente com dois pré-casos tem dois cartões no Escritório (${cart.length})`, cart.length === 2);
  conf("cada cartão diz que é pré-caso e em que passo está", cart.every(t => /Pré-caso · Identificação/.test(t)));
  conf("a lista não oferece mais o lote que apagava casos", !(await p.evaluate(() => /converter todos/.test(document.getElementById("conteudo-meio").textContent))));
  conf("a linha antiga do To Do (pre_caso) também é cartão de pré-caso", await p.evaluate(b => [...document.querySelectorAll(`#conteudo-meio .cartao[data-cli="${b}"]`)]
    .some(c => /Pré-caso/.test(c.textContent)), B));

  // 3 · a ficha de quem só tem pré-caso abre no atendimento, e o Casos ▾ põe os pré-casos primeiro
  await p.evaluate(a => abrirFicha(a), A);
  await p.waitForTimeout(600);
  conf("a ficha de quem só tem pré-caso abre no atendimento, e não num caso", await p.evaluate(() => abaAtiva === 0));
  await p.evaluate(b => abrirFicha(b), B);
  await p.waitForTimeout(600);
  const menu = await p.evaluate(b => { const el = document.createElement("button"); document.body.appendChild(el);
    menuProcessos({ stopPropagation() {}, currentTarget: el }, D.casosDoCliente.get(b));
    const r = [...document.querySelectorAll("#menu-processos .mp-it small")].map(x => x.textContent); fecharMenuProcessos(); return r; }, B);
  conf("no Casos ▾ o pré-caso vem antes do caso, marcado como pré-caso no escritório", /Pré-caso no escritório/.test(menu[0] || "") && !/Pré-caso/.test(menu[1] || ""));

  // F227 · onda 2: o cartão abre o atendimento DAQUELE pré-caso, o seletor troca, e o Desfecho tem as três saídas em ordem
  await p.evaluate(() => { visao = "fase:escritorio"; filtroColab = null; render(); });
  await p.waitForTimeout(300);
  await p.click(`#conteudo-meio .cartao[data-pc="pc_a1"]`);
  await p.waitForTimeout(900);
  conf("o cartão do pré-caso abre o atendimento dele", await p.evaluate(a => (preCasoAberto(D.cliPorId.get(a)) || {}).id === "pc_a1" && _atendAberto.has(a), A));
  await p.evaluate(() => irSubCad("direito"));
  await p.waitForTimeout(600);
  const esc = await p.evaluate(() => [...document.querySelectorAll(".pc-escolha .pc-esc-bt")].map(b => [b.textContent, b.classList.contains("on")]));
  await p.screenshot({ path: path.join(OUT, "02-seletor-e-desfecho.png") });
  conf("com dois pré-casos, o modo atendimento mostra o seletor com o escolhido marcado",
    esc.length === 2 && esc.some(([t, on]) => /Aposentadoria por idade/.test(t) && on) && esc.some(([t, on]) => /BPC/.test(t) && !on));
  const ordem = await p.evaluate(() => [...document.querySelectorAll("#desfecho .desf-acoes > *")].map(e => e.tagName === "SELECT" ? e.options[0].text : e.textContent.trim()));
  conf(`o Desfecho tem arquivar, Aposentadorias futuras e gerar o caso, nessa ordem (${ordem.join(" | ")})`,
    ordem.length === 3 && /^1 · Arquivar/.test(ordem[0]) && /^2 · Enviar a Aposentadorias futuras/.test(ordem[1]) && /^3 · Gerar o caso/.test(ordem[2]));
  await p.click(".pc-escolha .pc-esc-bt:not(.on)");
  await p.waitForTimeout(500);
  conf("o seletor troca o pré-caso do atendimento e o Desfecho acompanha", await p.evaluate(a => (preCasoAberto(D.cliPorId.get(a)) || {}).id === "pc_a2"
    && /BPC/.test(document.querySelector("#desf-t").textContent), A));
  conf("a aba do cliente se chama Aposentadorias futuras", await p.evaluate(() => /Aposentadorias futuras/.test(document.querySelector("#app").innerHTML) && !/data-vv="9">Lembretes/.test(document.querySelector("#app").innerHTML)));
  await p.evaluate(a => { _atendAberto.delete(a); _pcSel.delete(a); }, A);

  // 4 · arquivar encerra a linha; gerar o caso muda a fase da MESMA linha
  await p.evaluate(a => gravarPrecasos(a, precasosDe(D.cliPorId.get(a)).filter(x => x.id !== "pc_a2")), A);
  const arq = linhas(A).find(k => k.precaso.id === "pc_a2");
  conf("o pré-caso que sai da lista (arquivado) encerra a linha, sem apagá-la", arq && arq.fase === "encerrado" && !!arq.encerrado_em);
  const nCasos = T.casos.length;
  await p.evaluate(a => gerarCasoDoPre(a, "pc_a1"), A);
  await p.waitForTimeout(500);
  const ger = linhas(A).find(k => k.precaso.id === "pc_a1");
  conf("gerar o caso não cria linha nova", T.casos.length === nCasos);
  conf("a mesma linha vira caso no INSS, sem a marca de pré-caso e com o desfecho registrado",
    ger && ger.fase === "inss" && ger.pre_caso === false && (ger.precaso.desfecho || {}).tipo === "caso");
  conf("o caso gerado sai do atendimento", await p.evaluate(a => !precasosDe(D.cliPorId.get(a)).length, A));
  await p.evaluate(b => gerarCasoDoPre(b, "b0000000-0000-0000-0000-000000000c26"), B);
  await p.waitForTimeout(500);
  const kt = T.casos.find(k => k.id === KT);
  conf("a linha que veio do To Do ganha o mover_para, para a sincronização não a devolver ao Escritório",
    kt.fase === "inss" && kt.mover_para === "🌻 INSS" && kt.pre_caso === false);

  // 5 · "não é caso" volta a pré-caso com tudo o que tinha
  const antesDel = banco.log ? banco.log.length : 0;
  await p.evaluate(k => naoEhCaso(k), KB);
  await p.waitForTimeout(600);
  const kb = T.casos.find(k => k.id === KB);
  conf("o caso que não é caso volta a pré-caso na fase Escritório, na mesma linha", kb && kb.pre_caso === true && kb.fase === "escritorio");
  conf("os andamentos ficam com ele (nada é apagado)", T.andamentos.some(a => a.caso_id === KB));
  conf("e ele aparece como pré-caso do cliente", await p.evaluate(b => precasosDe(D.cliPorId.get(b)).some(x => x.caso_id === "b0000000-0000-0000-0000-000000000b26"
    && x.especie === "Revisão de aposentadoria" && x.natureza === "revisao"), B));
  conf("sem erro de console", !erros.length);
  if (erros.length) console.log(erros);

  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
