// F245 · a conferência em um clique e a movimentação em dois (pedido do Paulo, 19.10.2026): "Sem novidade" anota
// "Está em análise", fecha o lembrete vencido e marca de novo para 7 dias (ou anda o "Concluir em" do To Do), com
// desfazer; nunca sozinho. "Movimentou" grava a anotação com ⭐, acende a ⭐ do caso, declara a etapa, registra o
// resultado e avisa o advogado responsável, que aparece abaixo do nome do cliente e pode ser trocado. As conferências
// iguais em sequência viram uma linha só. Banco simulado e dados fictícios. Uso: node f245.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f245";
fs.mkdirSync(OUT, { recursive: true });

const PAULO = FIX.colaboradores[0].id, MARCOS = "22222222-2222-2222-2222-222222222222";
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: [...FIX.colaboradores, { id: MARCOS, auth_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", nome: "Marcos Fictício", inicial: "M",
    cor: "#8a4b00", papel: "colaborador", ativo: true, cargo: "advogado" }],
  clientes: [], casos: [], atribuicoes: [], documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;
const iso = n => new Date(Date.now() - 3 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
const ts = (n, h = "12:00") => `${iso(n)}T${h}:00-03:00`;
let seq = 0;
const id = p => `${p}0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const cli = (nome, campos = {}) => { const c = { id: id("c"), nome, cpf: null, telefone: null, campos, telefones: [], criado_em: ts(-400) }; T.clientes.push(c); return c; };
const caso = (c, o) => { const k = { id: id("b"), cliente_id: c.id, titulo: c.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
  marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, dcb_prorrogacao_pedida: false, origem_lista: "🌻 INSS",
  criado_em: ts(-300), ...o }; T.casos.push(k); T.atribuicoes.push({ caso_id: k.id, colaborador_id: PAULO }); return k; };
const and = (k, n, texto, o = {}) => { const a = { id: id("e"), caso_id: k.id, autor_id: PAULO, texto, origem: "app", origem_id: null, criado_em: ts(n),
  publico: false, excluir: false, importante: false, urgente: false, responde_a: null, ...o }; T.andamentos.push(a); return a; };

// A · INSS sem "Concluir em", com o lembrete de conferir vencido; o advogado escolhido é o Marcos
const cA = cli("Silvana Fictícia Confere", { advogado_id: MARCOS });
const kA = caso(cA, { beneficio: "Aux. Incapacidade Temporária", especie: "B31", fase: "inss", der: iso(-40), protocolos: ["1700000201"] });
const aA = and(kA, -9, "Solicitei o benefício por incapacidade. Verificar.");
T.andamento_tarefas.push({ id: id("f"), andamento_id: aA.id, caso_id: kA.id, colaborador_id: PAULO, atribuido_por: PAULO, lembrar_em: iso(-2), natureza: "lembrete", concluida_em: null, criado_em: ts(-9) });
// B · INSS com o "Concluir em" do To Do vencido (casos.prazo)
const cB = cli("Bento Fictício Prazo");
const kB = caso(cB, { beneficio: "Apos. por Idade", especie: "B41", fase: "inss", der: iso(-60), prazo: iso(-1), protocolos: ["1700000202"] });
and(kB, -8, "Protocolado o pedido. Verificar em uma semana.");
// C · quatro conferências iguais seguidas
const cC = cli("Cecília Fictícia Repete");
const kC = caso(cC, { beneficio: "Apos. por Idade", especie: "B41", fase: "inss", der: iso(-90), protocolos: ["1700000203"] });
and(kC, -40, "Requerimento protocolado.");
for (const n of [-28, -21, -14, -7]) and(kC, n, "Está em análise.");

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
  const abrir = async (c, k) => { await p.evaluate(async ([cid, kid]) => { await abrirFicha(cid); casoSel = kid; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); }, [c.id, k.id]); await p.waitForTimeout(500); };
  const util = n => p.evaluate(n => proxDiaUtil(somaDias(hoje(), n)), n);
  const br = s => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;

  // 1 · o advogado responsável abaixo do nome, e os botões no quadro de prazos
  await abrir(cA, kA);
  await p.screenshot({ path: path.join(OUT, "01-caso.png") });
  conf("abaixo do nome, o advogado responsável escolhido (Marcos)", /Advogado responsável:\s*Marcos Fictício/.test(await p.textContent(".det-topo .cli-adv")));
  conf("o quadro de prazos traz 'Em análise · +7 d' e 'Movimentou'", /Em análise · \+7 d/.test(await p.textContent(".faixa-prazos .conf-sem")) && !!(await p.$(".faixa-prazos .conf-mov")));

  // 2 · Sem novidade: um clique
  const em7 = await util(7);
  const nAnd = T.andamentos.length, nTf = T.andamento_tarefas.length;
  await p.click(".faixa-prazos .conf-sem");
  await p.waitForTimeout(700);
  const novo = T.andamentos.slice(nAnd).find(a => a.caso_id === kA.id);
  conf(`um clique anota a conferência com a data de voltar (${novo && novo.texto})`, novo && novo.texto === `Está em análise. Conferir de novo em ${br(em7)}.` && novo.autor_id === PAULO);
  const tfNovo = T.andamento_tarefas.slice(nTf).find(t => t.caso_id === kA.id);
  conf("o lembrete de conferir vai para daqui a 7 dias (dia útil)", tfNovo && tfNovo.lembrar_em === em7 && tfNovo.natureza === "lembrete");
  conf("o lembrete vencido de conferir sai", !!T.andamento_tarefas.find(t => t.andamento_id === aA.id).concluida_em);
  conf("o caso não ganha prazo fatal nem ⭐", !T.casos.find(k => k.id === kA.id).prazo && !T.casos.find(k => k.id === kA.id).importante);
  conf("aparece o desfazer", await p.evaluate(() => /desfazer/.test((document.getElementById("aviso") || {}).textContent || "")));
  await p.click("#aviso .aviso-bt");
  await p.waitForTimeout(700);
  conf("desfazer apaga a anotação, reabre o lembrete vencido e tira o novo", !T.andamentos.find(a => a.id === novo.id) && !T.andamento_tarefas.find(t => t.andamento_id === aA.id).concluida_em
    && !T.andamento_tarefas.find(t => t.id === tfNovo.id));

  // 3 · com o "Concluir em" do To Do vencido, é ele que anda
  await abrir(cB, kB);
  await p.click(".faixa-prazos .conf-sem");
  await p.waitForTimeout(700);
  conf(`o "Concluir em" vencido anda para daqui a 7 dias, sem lembrete a mais (${T.casos.find(k => k.id === kB.id).prazo})`,
    T.casos.find(k => k.id === kB.id).prazo === em7 && !T.andamento_tarefas.some(t => t.caso_id === kB.id));

  // 4 · outro intervalo pelo ▾
  await p.click(".faixa-prazos .conf-mais");
  conf("o ▾ oferece 3, 7, 15 e 30 dias", (await p.$$eval(".conf-dias .esp-it", b => b.map(x => x.textContent))).join() === "3 dias,7 dias,15 dias,30 dias");
  await p.evaluate(() => fecharCaixa());

  // 5 · conferências iguais seguidas: uma linha só
  await abrir(cC, kC);
  const tl = await p.evaluate(() => ({ vis: [...document.querySelectorAll(".timeline .tl-corpo")].filter(e => /Está em análise/.test(e.textContent)).length,
    mais: (document.querySelector(".timeline .tl-conf-mais") || {}).textContent || "" }));
  await p.screenshot({ path: path.join(OUT, "02-repetidas.png") });
  conf(`as 4 conferências iguais viram uma linha (${tl.vis} à vista · ${tl.mais})`, tl.vis === 1 && /conferido mais 3 vezes/.test(tl.mais));

  // 6 · Movimentou: dois cliques
  await abrir(cA, kA);
  await p.click(".faixa-prazos .conf-mov");
  await p.waitForSelector(".mov-ops .esp-it");
  const opcoes = await p.$$eval(".mov-ops .esp-it", b => b.map(x => x.textContent));
  conf(`no INSS as opções são as do pedido (${opcoes.join(", ")})`, opcoes.join() === "Exigência,Perícia marcada,Deferido,Indeferido,Outro");
  await p.screenshot({ path: path.join(OUT, "03-movimentou.png") });
  await p.fill("#mov-txt", "negado por falta de qualidade de segurado");
  const nAnd2 = T.andamentos.length, nMenc = T.mencoes.length;
  await p.click('.mov-ops .esp-it:has-text("Indeferido")');
  await p.waitForTimeout(800);
  const mov = T.andamentos.slice(nAnd2).find(a => a.caso_id === kA.id), kA2 = T.casos.find(k => k.id === kA.id);
  conf(`a anotação nasce com ⭐ e o que aconteceu (${mov && mov.texto})`, mov && mov.importante && mov.texto === "Indeferido: negado por falta de qualidade de segurado.");
  conf("a ⭐ do caso acende, a etapa vira 'decidido' e o resultado fica registrado", kA2.importante && kA2.etapa === "decidido" && kA2.resultado === "indeferido" && kA2.decisao_em === iso(0));
  conf("o advogado responsável (Marcos) é avisado por menção", T.mencoes.slice(nMenc).some(m => m.para_id === MARCOS && m.andamento_id === mov.id));

  // 7 · trocar o advogado responsável
  await p.click(".cli-adv-bt");
  await p.click('.esp-lista .esp-it:has-text("Paulo")');
  await p.waitForTimeout(500);
  conf("o advogado responsável troca e fica no cadastro", (T.clientes.find(c => c.id === cA.id).campos || {}).advogado_id === PAULO && /Paulo/.test(await p.textContent(".det-topo .cli-adv")));

  // 8 · no Meu Dia, a linha vencida traz o mesmo botão
  await p.evaluate(() => { fecharFicha && fecharFicha(); visao = "meudia"; filtroDia = null; render(); });
  await p.waitForTimeout(400);
  conf("no Meu Dia, a linha vencida traz 'Em análise · +7 d'", await p.evaluate(() => [...document.querySelectorAll(".ag-linha .conf-sem")].length > 0));
  await p.screenshot({ path: path.join(OUT, "04-meudia.png") });

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
