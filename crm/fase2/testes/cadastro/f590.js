// F590 · as coletas mais rápidas: os documentos gravam sem ler o texto (lido depois, em passada
// limitada), os andamentos vão em lote, a memória que falha não vira "tudo é novo", as duas entregas
// do INSS e a coleta do login do cliente não se engolem, e a trava diz "travado".
// Banco simulado, processo fictício. Uso: node f590.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";

const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: JSON.parse(JSON.stringify(FIX.clientes)), casos: JSON.parse(JSON.stringify(FIX.casos)),
  atribuicoes: FIX.atribuicoes, documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;

const N = "5000001-11.2026.4.03.6314", DIG = N.replace(/\D/g, "");
Object.assign(T.casos[0], { processo: N, processos: [], fase: "judicial", encerrado_em: null });
const CAM = `pje/${DIG}/900001`;
banco.arquivos.set(`anexos/${CAM}`, { tipo: "text/plain", corpo: "<html><body><p>" + "Sentença fictícia de teste, julgo procedente o pedido. ".repeat(3) + "</p></body></html>" });
const CP = "c0000000-0000-0000-0000-000000000589";
const procColeta = () => ({ id: CP, fonte: "pje-processo", numero: N, criado_em: new Date().toISOString(), aplicada_em: null,
  dados: { fonte: "pje-processo", numero: N, grau: "1º grau", classe: "PJEC", itens: [
    { data: "2026-11-10", hora: "10:00", textos: ["Juntada de sentença"], docs: [{ nome: "Sentença", caminho: CAM }] },
    { data: "2026-11-09", hora: "09:00", textos: ["Conclusos para julgamento"] },
    { data: "2026-11-08", hora: "08:00", textos: ["Juntada de petição"] }] } });

const ok = [];
const conf = (nome, v) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); };
const semTrava = () => { T.config_app = (T.config_app || []).filter(c => c.chave !== "coletas_auto_em"); };

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
  // a leitura da memória do PJe cai enquanto `cai` estiver ligado (registrada depois: vence a do banco)
  let cai = false;
  await ctx.route(u => u.href.startsWith(SUPA + "/rest/v1/andamentos"), (rota, req) =>
    cai && req.method() === "GET" ? rota.fulfill({ status: 500, contentType: "application/json", body: '{"message":"caiu"}' }) : rota.fallback());
  const p = await ctx.newPage();
  p._erros = [];
  p.on("pageerror", e => p._erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);

  // 1 · as filas: as duas entregas do INSS e a coleta do login do cliente
  const filas = lista => p.evaluate(l => { coletasPendentes = l; const r = coletasPorFonte(); return [r.novas.map(c => c.id), r.velhas.map(c => c.id)]; }, lista);
  let [novas, velhas] = await filas([{ id: "a2", fonte: "pat", etapa: "anexos" }, { id: "a1", fonte: "pat", etapa: "detalhes" }]);
  conf("INSS: com a entrega dos anexos (a mesma coleta, completa) já na fila, a dos detalhes é repetição", novas.join() === "a2" && velhas.join() === "a1");
  [novas, velhas] = await filas([{ id: "b2", fonte: "pat", etapa: "detalhes" }, { id: "b1", fonte: "pat", etapa: "anexos" }]);
  conf("INSS: os detalhes de uma rodada mais nova não engolem os anexos da rodada anterior", novas.join() === "b2,b1" && !velhas.length);
  [novas, velhas] = await filas([{ id: "c2", fonte: "crps", login: "cliente" }, { id: "c1", fonte: "crps" }]);
  conf("e-Recursos: a coleta do login do cliente não descarta a rodada geral", novas.length === 2 && !velhas.length);

  // 2 · a memória que não se lê: nada é gravado e a coleta fica na fila
  T.coletas.push(procColeta());
  cai = true;
  const r1 = await p.evaluate(() => autoAplicarColetas());
  conf("memória do PJe fora do ar: nenhum andamento gravado e a coleta continua na fila",
    !T.andamentos.length && !T.anexos.length && !T.coletas[0].aplicada_em);
  conf("a rodada diz que houve falha", /falha/.test(String(r1)));
  cai = false; semTrava();

  // 3 · a rodada boa: andamentos em lote, documento sem texto e o texto lido em seguida
  banco.escritas.length = 0;
  await p.evaluate(() => autoAplicarColetas());
  await p.waitForFunction(() => !lendoTextos);
  const posts = banco.escritas.filter(e => e.m === "POST" && e.t === "andamentos");
  conf("os três andamentos vão num pedido só", T.andamentos.length === 3 && posts.length === 1 && posts[0].linhas.length === 3);
  const anexoPost = banco.escritas.find(e => e.m === "POST" && e.t === "anexos");
  const linha = anexoPost && [].concat(anexoPost.corpo)[0];
  conf("o documento é gravado sem esperar a leitura do texto", T.anexos.length === 1 && linha && linha.texto == null && linha.tipo == null);
  conf("o texto é lido na segunda passada", /julgo procedente/.test(T.anexos[0].texto || "") && T.anexos[0].tipo === "text/plain");
  conf("o documento fica preso ao andamento do movimento", !!T.anexos[0].andamento_id && T.andamentos.some(a => a.id === T.anexos[0].andamento_id));
  conf("a coleta sai da fila", !!T.coletas[0].aplicada_em);

  // 4 · a mesma coleta de novo não duplica nada
  T.coletas[0].aplicada_em = null; semTrava();
  await p.evaluate(() => autoAplicarColetas());
  conf("aplicar de novo não duplica andamento nem documento", T.andamentos.length === 3 && T.anexos.length === 1 && !!T.coletas[0].aplicada_em);

  // 5 · a trava de outro CRM: "travado", e nada é aplicado
  T.coletas[0].aplicada_em = null; semTrava();
  T.config_app.push({ chave: "coletas_auto_em", valor: new Date().toISOString() });
  const r5 = await p.evaluate(() => autoAplicarColetas());
  conf("com a trava de outro CRM a rodada devolve \"travado\" e não aplica", r5 === "travado" && !T.coletas[0].aplicada_em);

  // 5b · o anexo cujo arquivo não existe no bucket sai da fila, em vez de ocupar lugar em toda rodada
  T.anexos.push({ id: "a0000000-0000-0000-0000-000000000590", caminho: `pje/${DIG}/900404`, origem: "pje", tipo: null, texto: null, criado_em: new Date().toISOString() });
  await p.evaluate(() => lerTextosPendentes(Date.now()));
  conf("arquivo que não existe no bucket sai da fila dos textos", T.anexos[1].tipo === "application/octet-stream" && T.anexos[1].texto == null);

  // 5c · INSS: o caso que outra sessão já criou para o protocolo não é criado de novo
  T.casos.push({ id: "k0000000-0000-0000-0000-000000000590", cliente_id: T.casos[0].cliente_id, titulo: "Cliente Teste", fase: "inss", encerrado_em: null, protocolos: ["590000001"] });
  const criados = async prot => {
    banco.escritas.length = 0;
    await p.evaluate(async ([cli, prot]) => { planoPat = { atualizar: [], novos: [{ protocolo: prot, cliente_id: cli, nome: "Cliente Teste", lista: "inss" }] };
      try { await aplicarPatDeVerdade(); } catch (e) {} }, [T.casos[0].cliente_id, prot]);
    return banco.escritas.filter(e => e.m === "POST" && e.t === "casos").length;
  };
  conf("INSS: protocolo que já tem caso aberto no banco não ganha segundo caso", await criados("590000001") === 0 && await p.evaluate(() => D.casoPorId.has("k0000000-0000-0000-0000-000000000590")));
  conf("INSS: protocolo sem caso no banco cria o caso", await criados("590000002") === 1);

  // 6 · fila vazia com texto pendente: o retorno não leva a contagem dos textos (o robô a lia como falha)
  T.coletas[0].aplicada_em = new Date().toISOString(); semTrava();
  const r6 = await p.evaluate(async () => { textosPendentes = true; lerTextosPendentes = async () => 3; return (await autoAplicarColetas()) ?? null; });
  conf("sem coleta, os textos lidos não viram o estado da rodada", r6 === null);

  conf("sem erro de página", !p._erros.length);
  if (p._erros.length) console.log(p._erros.join("\n"));
  const bons = ok.filter(x => x[1]).length;
  console.log(`\n${bons}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(bons === ok.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
