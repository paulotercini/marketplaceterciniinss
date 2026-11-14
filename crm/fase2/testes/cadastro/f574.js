// F574 · Sugestões da rotina: a anotação sugerida acima do "Escrever no caso" (Usar, Agendar, Descartar) e a fila "Sugestões do dia"
// das mensagens de iniciativa (Enviar grava a mensagem na fila da ponte e marca a sugestão). Banco simulado, dados fictícios.
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
const k2 = caso({ beneficio: "Aposentadoria", especie: "B42", fase: "inss", protocolos: ["1700000702"] });
const conv = { id: id("f"), cliente_id: c.id, telefone: "5500000000" + "11", status: "aberta", nao_lidas: 0 }; T.zap_conversas.push(conv);
// F586 · sugestão da IA parada acima do campo de escrever; a de iniciativa (sugestao_id) não se repete
const conv2 = { id: id("f"), cliente_id: c.id, telefone: "5500000000" + "12", contato_nome: "Contato Teste", status: "aberta", nao_lidas: 0,
  ultima_em: "2026-11-13T10:00:00-03:00", sugestao_ia: { texto: "Recebi o documento, obrigado.", em: "2026-11-13T10:00:00-03:00", modo: "plantao" } };
const conv3 = { id: id("f"), cliente_id: c.id, telefone: "5500000000" + "13", status: "aberta", nao_lidas: 0, ultima_em: "2026-11-13T09:00:00-03:00",
  sugestao_ia: { texto: "Texto de iniciativa", sugestao_id: "x" } };
T.zap_conversas.push(conv2, conv3);
const sug = o => { const x = { id: id("e"), estado: "aberta", origem: "rotina", cliente_id: c.id, criado_em: "2026-11-13T05:00:00-03:00", ...o }; T.sugestoes_rotina.push(x); return x; };
const a1 = sug({ tipo: "anotacao", origem: "whatsapp", caso_id: k1.id, chave: "w1", texto: "Agendei a perícia para 20/11/2026, às 9h.", motivo: "mensagem enviada",
  evento: { tipo: "Perícia", data: "2026-11-20", hora: "09:00", local: "APS Catanduva" } });
const a2 = sug({ tipo: "anotacao", caso_id: k1.id, chave: "r1", texto: "Conferir o retorno da exigência." });
const m1 = sug({ tipo: "mensagem", caso_id: k2.id, conversa_id: conv.id, chave: "iniciativa:x:2026-11-13", texto: "Bom dia! Lembro a assinatura da procuração.", motivo: "tarefa vencendo hoje" });
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
  await p.waitForSelector(".sug-anot-it", { timeout: 5000 });
  const n = await p.$$eval(".sug-anot-it", x => x.length);
  conf(`as duas anotações sugeridas do caso aparecem (${n})`, n === 2);
  conf("a da mensagem enviada oferece Agendar, a da rotina não", await p.evaluate(([a, b]) =>
    !!document.querySelector(`[data-sug="${a}"] button[onclick^="agendarSugAnot"]`) && !document.querySelector(`[data-sug="${b}"] button[onclick^="agendarSugAnot"]`), [a1.id, a2.id]));
  await p.click(`[data-sug="${a1.id}"] button[onclick^="usarSugAnot"]`); await p.waitForTimeout(300);
  conf("Usar leva o texto ao campo de escrever", (await p.$eval("#and-texto", t => t.value)).includes("Agendei a perícia"));
  conf("Usar marca a sugestão como usada, sem gravar anotação", a1.estado === "usada" && !T.andamentos.length);
  await p.click(`[data-sug="${a2.id}"] button[onclick^="decidirSugAnot"]`); await p.waitForTimeout(300);
  conf("Descartar marca descartada e tira o quadro", a2.estado === "descartada" && !(await p.$(".sug-anot-it")));
  await p.evaluate(() => { visao = "sugestoesdia"; render(); }); await p.waitForSelector(".sug-dia", { timeout: 5000 });
  await p.click(`.sug-dia[data-sug="${m1.id}"] button[data-ac="enviar"]`); await p.waitForTimeout(500);
  const z = T.zap_mensagens[0];
  conf("Enviar grava a mensagem na fila da ponte", z && z.conversa_id === conv.id && z.status === "fila" && /procuração/.test(z.texto));
  conf("e marca a sugestão como enviada com o texto final", m1.estado === "enviada" && /procuração/.test(m1.texto_final || ""));
  const nIa = await p.$$eval(".sug-ia", x => x.length);
  conf(`a sugestão da IA pendente aparece, sem repetir a de iniciativa (${nIa})`, nIa === 1 && (await p.$eval(".sug-ia", e => e.textContent)).includes("Recebi o documento"));
  await p.click(`.sug-ia[data-conv="${conv2.id}"] button[data-ac="ia-descartar"]`); await p.waitForTimeout(400);
  conf("Descartar apaga a sugestão da conversa e tira o cartão", conv2.sugestao_ia === null && !(await p.$(".sug-ia")));
  conf("e registra o retorno para a IA aprender", (T.zap_sugestao_retorno || []).some(r => r.conversa_id === conv2.id && r.acao === "descartada"));
  conf("sem erro de página", !erros.length);
  console.log(erros.join("\n"));
  console.log(`${ok.filter(([, v]) => v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ok.every(([, v]) => v) && !erros.length ? 0 : 1);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
