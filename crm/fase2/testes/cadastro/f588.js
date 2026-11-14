// F588 · Colaborador Claude: pré-gravações na visão Sugestões do dia (Aprovar pela RPC, Descartar), resumo da rodada, caderno de regras e placar.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const PAULO = FIX.colaboradores[0].id;
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais", "analises_ia", "sugestoes_rotina", "zap_mensagens"]) dados[t] = [];
Object.assign(dados, { colaboradores: [...FIX.colaboradores], clientes: [], casos: [], atribuicoes: [], documentos_beneficio: FIX.documentos_beneficio || [],
  modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;
let seq = 0;
const id = p => `${p}0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const c = { id: id("c"), nome: "Cliente Teste Analise", cpf: null, telefone: "5500000000" + "11", campos: {}, telefones: [], criado_em: "2025-01-10T12:00:00-03:00" }; T.clientes.push(c);
const caso = o => { const k = { id: id("b"), cliente_id: c.id, titulo: c.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
  marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, dcb_prorrogacao_pedida: false, origem_lista: "🌻 INSS",
  criado_em: "2025-02-01T12:00:00-03:00", ...o }; T.casos.push(k); T.atribuicoes.push({ caso_id: k.id, colaborador_id: PAULO }); return k; };
const k1 = caso({ beneficio: "Auxílio por incapacidade", especie: "B31", fase: "inss", protocolos: ["1700000701"] });
const sug = o => { const x = { id: id("e"), estado: "aberta", origem: "colaborador", cliente_id: c.id, caso_id: k1.id, criado_em: new Date().toISOString(), dados: {}, ...o }; T.sugestoes_rotina.push(x); return x; };
const a1 = sug({ tipo: "anotacao", chave: "c1", texto: "Conferi o requerimento: segue em análise.", motivo: "tarefa vencida" });
const p1 = sug({ tipo: "peca", chave: "c2", texto: "Recurso ordinário pronto para revisão.", dados: { titulo: "Recurso ordinário", link: "https://exemplo.test/peca", revisor: FIX.colaboradores[1] && FIX.colaboradores[1].id } });
const z1 = sug({ tipo: "prazo_ia", chave: "c3", texto: "Conferir a resposta do INSS.", dados: { data: "2026-12-01" } });
sug({ tipo: "resumo", chave: "resumo:hoje", texto: "Rodada das 03:00: 3 itens em pré-gravação.", caso_id: null });
const r1 = sug({ tipo: "regra", estado: "aprovada", chave: "g1", texto: "Nunca sugerir tutela de urgência.", caso_id: null });
sug({ tipo: "anotacao", estado: "aprovada", chave: "d1", texto: "igual", texto_final: "igual", decidido_em: new Date().toISOString() });
sug({ tipo: "anotacao", estado: "aprovada", chave: "d2", texto: "antes", texto_final: "depois", decidido_em: new Date().toISOString() });
sug({ tipo: "anotacao", estado: "descartada", chave: "d3", texto: "fora", decidido_em: new Date().toISOString() });
const ok = [];
const conf = (nome, v) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); };
(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, "..", "..", q.url === "/" ? "app.html" : q.url.split("?")[0]);
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
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await p.evaluate(async ([c, k]) => { await abrirFicha(c); const m = document.getElementById("modal"); if (m) m.style.display = "none";
    casoSel = k; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); }, [c.id, k1.id]);
  await p.waitForTimeout(1200);
  conf("a pré-gravação do colaborador não aparece acima do campo de escrever do caso", !(await p.$(".sug-anot-it")));
  await p.evaluate(() => { fecharFicha && fecharFicha(); visao = "sugestoesdia"; render(); }); await p.waitForSelector(".sug-colab", { timeout: 5000 });
  const n = await p.$$eval(".sug-colab", x => x.length);
  conf(`as três pré-gravações abertas aparecem ao administrador (${n})`, n === 3);
  const txt = await p.$eval("#conteudo-meio", e => e.textContent);
  conf("o resumo da rodada aparece", txt.includes("Rodada das 03:00"));
  conf("a peça traz o título e o link Abrir", await p.evaluate(i => { const e = document.querySelector(`.sug-colab[data-sug="${i}"]`); return /Recurso ordinário/.test(e.textContent) && !!e.querySelector('a[href="https://exemplo.test/peca"]'); }, p1.id));
  conf("o Prazo da IA diz a data", await p.evaluate(i => /01\/12\/2026/.test(document.querySelector(`.sug-colab[data-sug="${i}"]`).textContent), z1.id));
  conf("o caderno de regras lista a regra aprovada", await p.evaluate(i => !!document.querySelector(`.colab-regras [data-regra="${i}"]`), r1.id));
  conf("o placar conta sem mudança, editada e descartada", /1 aprovada\(s\) sem mudança, 1 editada\(s\), 1 descartada\(s\)/.test(txt));
  await p.click(`.sug-colab[data-sug="${a1.id}"] button[data-ac="aprovar"]`); await p.waitForTimeout(500);
  conf("Aprovar chama colab_aprovar e tira o cartão", banco.escritas.some(e => e.t === "rpc:colab_aprovar") && !(await p.$(`.sug-colab[data-sug="${a1.id}"]`)));
  conf("Aprovar não grava anotação pelo navegador", !T.andamentos.length);
  await p.click(`.sug-colab[data-sug="${z1.id}"] button[data-ac="descartar"]`); await p.waitForTimeout(500);
  conf("Descartar marca descartada", z1.estado === "descartada");
  await p.evaluate(() => { document.querySelector(".colab-regras").open = true; });
  await p.fill("#colab-regra-txt", "Peça de BPC vai também à Dra. Amanda."); await p.click('.colab-regras button[data-ac="regra"]'); await p.waitForTimeout(500);
  conf("Gravar regra chama colab_regra", banco.escritas.some(e => e.t === "rpc:colab_regra"));
  conf("sem erro de página", !erros.length);
  console.log(erros.join("\n"));
  console.log(`${ok.filter(([, v]) => v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ok.every(([, v]) => v) && !erros.length ? 0 : 1);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
