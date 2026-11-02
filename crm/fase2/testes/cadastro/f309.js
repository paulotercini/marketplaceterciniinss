// F309 · agendar fora das vagas (pedido do Paulo de 30.10.2026): no passo do horário, o "outro horário" discreto aceita
// qualquer data e hora, só para o administrador; o Code.gs DE VERDADE (google-simulado.js) confere de novo: a equipe
// é recusada e o horário que bate com outro atendimento também. Banco simulado e dados fictícios. Uso: node f309.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const { criarGoogle, proximo, quando } = require("./google-simulado");
const SUPA = "https://ficticio.supabase.co";

const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: [], casos: [], atribuicoes: [], documentos_beneficio: FIX.documentos_beneficio || [],
  modelos_documento: FIX.modelos_documento, config_app: FIX.config_app || [] });
const banco = new Banco(dados);

const W = proximo(3), QUI = proximo(4);   // a quarta do Paulo e uma quinta, dia em que ele não atende
const google = criarGoogle({ tokens: { "tok-paulo": { nome: "Paulo", papel: "admin" }, "tok-ingrid": { nome: "Ingrid", papel: "equipe" } },
  eventos: [{ id: "P1", summary: "001 - Livre (anote o telefone)", start: quando(W, "09:00"), end: quando(W, "09:45") },
    { id: "X1", summary: "002 - Outro Fictício - Confirmado", start: quando(QUI, "10:00"), end: quando(QUI, "10:30") }] });

const ok = [];
const conf = (nome, v) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); };
const pedido = (token, extra) => google.post({ acao: "agendar", token, profissional: "paulo", tipo: "001", nome: "Fulano Fictício Livre",
  telefone: "16999990009", data: QUI, inicio: "08:30", orientacoesConfirmadas: true, foraDaVaga: true, ...extra });

(async () => {
  // 1 · o Apps Script
  const eq = pedido("tok-ingrid");
  conf(`a equipe não agenda fora das vagas (${eq.codigo})`, !eq.ok && eq.codigo === "NAO_PERMITIDO");
  const sem = pedido("tok-paulo", { foraDaVaga: false });
  conf(`sem a opção, o dia sem atendimento continua recusado (${sem.codigo})`, !sem.ok);
  const bate = pedido("tok-paulo", { inicio: "10:15" });
  conf(`o horário que bate com outro atendimento pede confirmação (${bate.codigo})`, !bate.ok && bate.codigo === "SOBREPOSICAO" && /10:00/.test(bate.erro || ""));
  const junto = pedido("tok-paulo", { inicio: "10:15", nome: "Beltrano Ficticio Junto", telefone: "16999990011", sobrepor: true });
  conf(`confirmado, o administrador agenda junto (${junto.ok})`, junto.ok);

  // 2 · a tela do Paulo
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
    localStorage.setItem("crm_agenda_token", "tok-paulo");
  }, [SUPA, SESSAO]);
  await instalarBanco(ctx, { SUPA, SESSAO, banco });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await ctx.route(/script\.google\.com/, r => {
    const corpo = JSON.parse(r.request().postData() || "{}");
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(google.post(corpo)) });
  });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.evaluate(async () => { await carregarAgenda("paulo"); abrirFluxoAgenda({}); });
  await p.waitForSelector("#aq-busca");
  await p.type("#aq-busca", "Fulano Ficticio Livre", { delay: 10 });
  await p.click("[data-aqnovo]");
  await p.fill("#aq-tel", "16999990009"); await p.click("#aq-seg2");
  await p.waitForSelector('[data-aqacomp="nao"]'); await p.click('[data-aqacomp="nao"]'); await p.click("#aq-seg4");
  await p.waitForSelector(".aq-livre");
  conf("o outro horário fica fechado, discreto", await p.evaluate(() => !document.querySelector(".aq-livre").open));
  await p.click(".aq-livre summary");
  await p.fill("#aq-ldata", QUI); await p.fill("#aq-lhora", "08:30"); await p.click("#aq-lusar");
  conf("o horário livre vale e libera o Continuar", await p.evaluate(() => fluxo.livre && fluxo.inicio === "08:30" && !document.getElementById("aq-seg5").disabled));
  await p.click("#aq-seg5"); await p.check("#aq-o1"); await p.check("#aq-o2"); await p.click("#aq-gravar");
  await p.waitForSelector(".aq-whats", { timeout: 10000 });
  const novo = google.eventos.find(e => /Fulano Fict.cio Livre - /.test(e.summary || ""));
  conf(`o Google Agenda recebe ${QUI} às 08:30, 45 minutos (${novo && novo.start.dateTime})`,
    novo && novo.start.dateTime.startsWith(QUI) && /T11:30:00/.test(new Date(novo.start.dateTime).toISOString()) && (new Date(novo.end.dateTime) - new Date(novo.start.dateTime)) === 45 * 60e3);

  // 3 · 13:15 na quarta, com atendimento às 13:30 (o caso do Paulo, 04/11): a tela pergunta e, confirmado, grava
  google.eventos.push({ id: "X2", summary: "001 - Ciclano Fictício - Confirmado", start: quando(W, "13:30"), end: quando(W, "14:15") });
  let pergunta = "";
  p.removeAllListeners("dialog"); p.on("dialog", d => { pergunta = d.message(); d.accept(); });
  await p.evaluate(async () => { fecharCaixa(); await carregarAgenda("paulo"); abrirFluxoAgenda({}); });
  await p.waitForSelector("#aq-busca");
  await p.type("#aq-busca", "Fulano Ficticio Almoco", { delay: 10 });
  await p.click("[data-aqnovo]");
  await p.fill("#aq-tel", "16999990010"); await p.click("#aq-seg2");
  await p.waitForSelector('[data-aqacomp="nao"]'); await p.click('[data-aqacomp="nao"]'); await p.click("#aq-seg4");
  await p.waitForSelector(".aq-livre"); await p.click(".aq-livre summary");
  await p.fill("#aq-ldata", W); await p.fill("#aq-lhora", "13:15"); await p.click("#aq-lusar");
  await p.click("#aq-seg5"); await p.check("#aq-o1"); await p.check("#aq-o2"); await p.click("#aq-gravar");
  await p.waitForSelector(".aq-whats", { timeout: 10000 });
  const almoco = google.eventos.find(e => /Fulano Fict.cio Almoco - /.test(e.summary || ""));
  conf(`13:15 com atendimento às 13:30: pergunta e grava (${pergunta.slice(0, 60)})`, /13:30/.test(pergunta) && almoco && /T16:15:00/.test(new Date(almoco.start.dateTime).toISOString()));

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
