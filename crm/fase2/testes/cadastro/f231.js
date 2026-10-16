// F231 · a escolha da Análise de Direito mora no pré-caso (casos.ad), e não no cliente
// (docs/PRIMEIRO-ATENDIMENTO-QUADROS.md, "Onde mora a escolha"): dois pré-casos não se
// misturam; a gravação com atraso não se perde ao trocar de pré-caso, concluir ou
// recarregar; o legado continua em campos.ad_modulos; a herança é em cópia e uma só
// vez; gerar o caso mantém a escolha; as análises são as do pré-caso escolhido.
// Banco simulado de estado e dados fictícios. Uso: node f231.js [pasta-das-fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f231";
fs.mkdirSync(OUT, { recursive: true });

const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: JSON.parse(JSON.stringify(FIX.clientes)), casos: JSON.parse(JSON.stringify(FIX.casos)),
  atribuicoes: FIX.atribuicoes, documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;
const A = "c0000000-0000-0000-0000-000000000a31", L = "c0000000-0000-0000-0000-000000000c31", H = "c0000000-0000-0000-0000-000000000d31";
const K1 = "b0000000-0000-0000-0000-000000000a31", K2 = "b0000000-0000-0000-0000-000000000b31", KH = "b0000000-0000-0000-0000-000000000d31";
const caso = o => ({ titulo: "", protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {}, marcadores: [], origem_lista: "🙋 Escritório", ...o });
// A: dois pré-casos em linha (aposentadoria por idade e BPC)
T.clientes.push({ id: A, nome: "Adelaide Fictícia Rocha", cpf: "70010020066", telefone: "(16) 99000-5001", dn: "1962-05-10", campos: {}, criado_em: "2026-10-01T12:00:00Z" });
T.casos.push(caso({ id: K1, cliente_id: A, titulo: "Adelaide Fictícia Rocha", fase: "escritorio", pre_caso: true, beneficio: "Aposentadoria por idade",
    precaso: { id: "pc_a1", natureza: "", marc: {}, honorarios: "", quem: null, em: "2026-10-01", cod: "B41", sub: "B41" }, criado_em: "2026-10-01T12:00:00Z" }),
  caso({ id: K2, cliente_id: A, titulo: "Adelaide Fictícia Rocha", fase: "escritorio", pre_caso: true, beneficio: "BPC/LOAS",
    precaso: { id: "pc_a2", natureza: "", marc: {}, honorarios: "", quem: null, em: "2026-10-02", cod: "B87", sub: "B87" }, criado_em: "2026-10-02T12:00:00Z" }));
// L: pré-caso legado, ainda em campos.precasos (sem linha)
T.clientes.push({ id: L, nome: "Lourenço Fictício Melo", cpf: "70010020077", telefone: "(16) 99000-5002", campos: {
  precasos: [{ id: "pc_l1", especie: "Auxílio por incapacidade", natureza: "", marc: {}, honorarios: "", quem: null, em: "2026-10-03" }] }, criado_em: "2026-10-03T12:00:00Z" });
// H: um só pré-caso em linha e a escolha antiga no cliente (antes da F231)
T.clientes.push({ id: H, nome: "Heloísa Fictícia Dantas", cpf: "70010020088", telefone: "(16) 99000-5003", criado_em: "2026-10-04T12:00:00Z",
  campos: { ad_modulos: { beneficios: { bpc: ["def"] }, valores: { ren_pessoas: "3" }, tempos: [] } } });
T.casos.push(caso({ id: KH, cliente_id: H, titulo: "Heloísa Fictícia Dantas", fase: "escritorio", pre_caso: true, beneficio: "BPC/LOAS",
  precaso: { id: "pc_h1", natureza: "", marc: {}, honorarios: "", quem: null, em: "2026-10-04" }, criado_em: "2026-10-04T12:00:00Z" }));

const ok = [];
const conf = (nome, v) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); };
const linha = id => T.casos.find(k => k.id === id);
const cli = id => T.clientes.find(c => c.id === id);

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
  const entrar = async () => {
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
    await p.waitForSelector("#app.logado", { timeout: 15000 });
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  };
  await entrar();

  // 1 · no atendimento do pré-caso A1 a escolha vai para a linha dele, e não para o cliente
  await p.evaluate(a => abrirAtendimentoDe(a, "pc_a1"), A);
  await p.waitForTimeout(500);
  await p.evaluate(a => admSalvar(a, x => { x.fora = ["cnis.ind:PEXT"]; x.beneficios = { tempo: ["idade"] }; x.valores.apo_der = "2026-10-16"; }), A);
  conf("a memória muda na hora (antes do PATCH)", await p.evaluate(a => { const d = admDe(D.cliPorId.get(a)); return d.fora.join() === "cnis.ind:PEXT" && !!d.beneficios.tempo; }, A));
  await p.waitForTimeout(900);
  conf("o PATCH vai a casos, só com a coluna ad, na linha do pré-caso escolhido",
    banco.escritas.some(e => e.m === "PATCH" && e.t === "casos" && e.ids.includes(K1) && Object.keys(e.corpo).join() === "ad"));
  conf("a linha A1 guarda fora, benefícios e campos", (linha(K1).ad || {}).fora?.join() === "cnis.ind:PEXT" && linha(K1).ad.valores.apo_der === "2026-10-16");
  conf("o cliente não recebe ad_modulos e a linha A2 continua sem escolha", !("ad_modulos" in (cli(A).campos || {})) && !linha(K2).ad);

  // 2 · trocar para A2: começa limpo; editar A2 e voltar a A1 em menos de 600 ms não perde nada
  await p.evaluate(a => escolherPreCaso(a, "pc_a2"), A);
  conf("o pré-caso A2 começa sem os itens deixados de fora no A1", await p.evaluate(a => admDe(D.cliPorId.get(a)).fora.length === 0, A));
  await p.evaluate(a => { admSalvar(a, x => { x.beneficios = { bpc: ["def"] }; x.valores.ren_pessoas = "4"; }); escolherPreCaso(a, "pc_a1"); }, A);
  await p.waitForTimeout(300);
  conf("trocar de pré-caso grava na hora o que esperava (A2 gravado)", (linha(K2).ad || {}).valores?.ren_pessoas === "4");
  conf("e A1 continua com a escolha dele", (linha(K1).ad || {}).beneficios?.tempo && !(linha(K1).ad.beneficios || {}).bpc);
  conf("o estado da sessão é do pré-caso: _paForaBl e _paEsc limpos na troca", await p.evaluate(a => !_paForaBl.has(a) && !_paEsc.has(a), A));

  // 3 · digitar e concluir a etapa em menos de 600 ms: as etapas e o ad sobrevivem os dois
  await p.evaluate(async a => { admSalvar(a, x => { x.valores.apo_filiacao = "1990-01-01"; }); await concluirEtapa(a, "pa"); }, A);
  await p.waitForTimeout(400);
  conf("concluir grava o ad pendente", (linha(K1).ad || {}).valores?.apo_filiacao === "1990-01-01");
  conf("e a etapa do Primeiro atendimento, sem apagar o ad", !!((linha(K1).precaso || {}).etapas || {}).pa && (linha(K1).ad || {}).fora?.join() === "cnis.ind:PEXT");

  // 4 · recarregar a página: a escolha volta, por pré-caso
  await entrar();
  await p.evaluate(a => abrirAtendimentoDe(a, "pc_a1"), A);
  await p.waitForTimeout(500);
  conf("depois de recarregar, A1 volta com o item deixado de fora", await p.evaluate(a => admDe(D.cliPorId.get(a)).fora.join() === "cnis.ind:PEXT", A));
  await p.evaluate(a => escolherPreCaso(a, "pc_a2"), A);
  conf("e A2 com os campos dele", await p.evaluate(a => admDe(D.cliPorId.get(a)).valores.ren_pessoas === "4" && !admDe(D.cliPorId.get(a)).fora.length, A));

  // 5 · análises do pré-caso: a de A2 não aparece no A1; registrar marca o pré-caso
  await p.evaluate(a => {
    const mk = (id, pc, dt, cod) => ({ id, cliente_id: a, data_analise: dt, fonte: "manual", cenarios: [], detalhes: { precaso_id: pc, servico: { cod, sub: cod, nome: cod } } });
    D.analisesPorCliente.set(a, [mk("an-a2", "pc_a2", "2026-10-12", "B87"), mk("an-a1", "pc_a1", "2026-10-10", "B41")]);
  }, A);
  await p.evaluate(a => escolherPreCaso(a, "pc_a1"), A);
  conf("no atendimento do A1, a última análise é a dele (e não a mais nova do cliente)", await p.evaluate(a => analisesDaVez(D.cliPorId.get(a))[0].id === "an-a1", A));
  conf("o serviço inicial do formulário é o do pré-caso escolhido", await p.evaluate(a => servicoInicial(D.cliPorId.get(a)).cod === "B41", A));
  await p.evaluate(a => escolherPreCaso(a, "pc_a2"), A);
  conf("no A2, a análise e o serviço são os dele", await p.evaluate(a => analisesDaVez(D.cliPorId.get(a))[0].id === "an-a2" && servicoInicial(D.cliPorId.get(a)).cod === "B87", A));
  conf("fora do atendimento, as análises são as do cliente", await p.evaluate(a => { _atendAberto.delete(a); const n = analisesDaVez(D.cliPorId.get(a)).length; _atendAberto.add(a); return n === 2; }, A));
  conf("escolher benefício ou deixar item de fora não conta como análise preenchida", await p.evaluate(() =>
    !adDetPreenchido({ servico: { cod: "B87" }, precaso_id: "x", modulos: { beneficios: { bpc: ["def"] }, valores: {}, tempos: [] } })
    && adDetPreenchido({ modulos: { valores: { ren_pessoas: "4" }, tempos: [] } }) && adDetPreenchido({ tempo: "10 anos" })));
  await p.evaluate(() => irSubCad("direito"));
  await p.waitForTimeout(600);
  await p.evaluate(() => { const d = document.getElementById("ad-novo"); if (d) d.open = true; });
  await p.fill("#ad-contexto", "Análise fictícia do BPC");
  const nAn = T.analises_direito.length;
  await p.evaluate(a => salvarAnalise(a), A);
  await p.waitForTimeout(800);
  const nova = T.analises_direito[nAn];
  conf("registrar a análise grava detalhes.precaso_id do pré-caso escolhido", nova && (nova.detalhes || {}).precaso_id === "pc_a2");

  // 6 · legado sem linha: continua em campos.ad_modulos e não cria linha de casos
  const nCasos = T.casos.length;
  await p.evaluate(l => abrirAtendimentoDe(l, "pc_l1"), L);
  await p.waitForTimeout(400);
  await p.evaluate(l => admSalvar(l, x => { x.beneficios = { incapacidade: ["b31"] }; }), L);
  await p.waitForTimeout(900);
  conf("o pré-caso sem linha grava em campos.ad_modulos, como antes", (cli(L).campos.ad_modulos || {}).beneficios?.incapacidade?.[0] === "b31");
  conf("e não cria linha de casos", T.casos.length === nCasos && !T.casos.some(k => k.cliente_id === L));

  // 7 · herança: o único pré-caso vivo herda, em cópia, a escolha antiga do cliente, uma vez
  await p.evaluate(h => abrirAtendimentoDe(h, "pc_h1"), H);
  await p.waitForTimeout(400);
  conf("o único pré-caso vivo lê a escolha antiga do cliente", await p.evaluate(h => { const d = admDe(D.cliPorId.get(h)); return d.beneficios.bpc[0] === "def" && d.valores.ren_pessoas === "3"; }, H));
  await p.evaluate(h => admSalvar(h, x => { x.valores.ren_total = "1200"; }), H);
  conf("a cópia é profunda: a memória do cliente não muda antes de gravar", await p.evaluate(h => !("ren_total" in ((D.cliPorId.get(h).campos.ad_modulos || {}).valores || {})), H));
  await p.waitForTimeout(900);
  conf("a linha recebe o herdado mais o novo", (linha(KH).ad || {}).valores?.ren_pessoas === "3" && linha(KH).ad.valores.ren_total === "1200");
  conf("e o ad_modulos sai do cliente, para não passar a outro pré-caso", !("ad_modulos" in (cli(H).campos || {})));
  await p.evaluate(h => gravarPrecasos(h, [...precasosDe(D.cliPorId.get(h)), { id: "pc_h2", especie: "Auxílio por incapacidade", natureza: "", marc: {}, honorarios: "", quem: null, em: "2026-10-05" }]), H);
  await p.evaluate(h => escolherPreCaso(h, "pc_h2"), H);
  conf("o pré-caso novo nasce vazio", await p.evaluate(h => { const d = admDe(D.cliPorId.get(h)); return !d.beneficios && !Object.keys(d.valores).length; }, H));

  // 8 · gerar o caso: a linha leva a escolha, e fora do atendimento é ela que vale
  await p.evaluate(a => escolherPreCaso(a, "pc_a1"), A);
  await p.evaluate(a => gerarCasoDoPre(a, "pc_a1"), A);
  await p.waitForTimeout(600);
  conf("a linha que virou caso mantém o ad", linha(K1).pre_caso === false && (linha(K1).ad || {}).fora?.join() === "cnis.ind:PEXT");
  conf("fora do atendimento, a escolha é a do caso que nasceu do pré-caso", await p.evaluate(a => { _atendAberto.delete(a);
    const d = admDe(D.cliPorId.get(a)); return d.fora.join() === "cnis.ind:PEXT" && !!d.beneficios.tempo; }, A));

  await p.screenshot({ path: path.join(OUT, "01-fim.png") });
  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
