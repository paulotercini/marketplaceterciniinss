// F291 · Concluir por hoje (Onda A do fluxo do To Do, pedido do Paulo de 29.10.2026): o círculo da linha e o
// botão do caso escolhem quando o cliente volta, apagam a ⭐, tiram do Meu Dia e, se pedido, passam a outra
// pessoa, com anotação opcional e desfazer. A ⭐ do caso não acende sozinha. Banco simulado e dados fictícios.
// Uso: node f291.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f291";
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


// A · na fila do dia: ⭐ acesa, no Meu Dia de hoje, atribuído ao Paulo
const cA = cli("Rosana Fictícia Fila");
const kA = caso(cA, { beneficio: "Aux. Incapacidade Temporária", especie: "B31", fase: "inss", importante: true, todo_task_id: "tdA", protocolos: ["1700000301"] });
and(kA, -3, "Pedido protocolado. Verificar.");
T.meu_dia.push({ id: id("m"), colaborador_id: PAULO, caso_id: kA.id, dia: iso(0) });
// B · também na fila, para o botão do caso
const cB = cli("Bruno Fictício Despacho");
const kB = caso(cB, { beneficio: "Apos. por Idade", especie: "B41", fase: "inss", importante: true, protocolos: ["1700000302"] });

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
  const br = s => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
  const kAt = () => T.casos.find(k => k.id === kA.id), kBt = () => T.casos.find(k => k.id === kB.id);

  // 1 · a fila do dia (⭐ Importante) tem o círculo
  await p.evaluate(() => { visao = "importante"; render(); });
  await p.waitForTimeout(400);
  conf("na ⭐ Importante, cada linha tem o círculo de concluir por hoje", (await p.$$(".ag-linha .desp-circ")).length === 2);
  await p.screenshot({ path: path.join(OUT, "01-fila.png") });

  // 2 · o círculo abre a escolha, sem abrir a ficha
  await p.click(`.ag-linha[data-cli="${cA.id}"] .desp-circ`);
  await p.waitForSelector(".desp-datas");
  const rot = await p.$$eval(".desp-datas .btn-mini", b => b.map(x => x.firstChild.textContent.trim()));
  conf(`as datas rápidas (${rot.join(", ")})`, rot.join() === "Amanhã,Próxima semana,Em 15 dias,Em 1 mês,Em 6 meses");
  conf("a ficha não abriu", await p.evaluate(() => !clienteAberto));
  await p.click("#desp-ok");
  await p.waitForTimeout(300);
  conf("sem data, não conclui e pede a data", kAt().importante === true && /Escolha quando/.test(await p.textContent("#aviso")));
  const semana = await p.evaluate(() => proxSegunda());
  conf(`"Próxima semana" é a segunda-feira seguinte (${semana})`, new Date(semana + "T12:00:00").getDay() === 1 && semana > iso(0) && semana <= iso(7));
  await p.click('.desp-datas .btn-mini:has-text("Próxima semana")');
  await p.click('.desp-quem .btn-mini:has-text("Marcos")');
  await p.fill("#desp-nota", "Meissa, imprime o pedido de relatório médico. Aguardar o retorno.");
  await p.screenshot({ path: path.join(OUT, "02-escolha.png") });
  const nAnd = T.andamentos.length, nMenc = T.mencoes.length;
  await p.click("#desp-ok");
  await p.waitForTimeout(900);
  const k1 = kAt();
  conf("a ⭐ apaga e o 'Concluir em' vira a data de volta", k1.importante === false && k1.prazo === semana);
  conf("o despacho fica registrado para a ponte do To Do", k1.ronda && k1.ronda.despacho && k1.ronda.despacho.prazo === semana && k1.ronda.despacho.por === PAULO && !k1.ronda.despacho.todo);
  conf("sai do Meu Dia de quem concluiu", !T.meu_dia.some(m => m.caso_id === kA.id));
  const nota = T.andamentos.slice(nAnd).find(a => a.caso_id === kA.id);
  conf("a anotação entra no caso", nota && /imprime o pedido/.test(nota.texto));
  const atr = T.atribuicoes.filter(a => a.caso_id === kA.id).map(a => a.colaborador_id);
  conf("passa ao Marcos e sai do Paulo, como trocar o 'Atribuído a'", atr.includes(MARCOS) && !atr.includes(PAULO));
  conf("o Marcos é avisado por menção", T.mencoes.slice(nMenc).some(m => m.para_id === MARCOS && /passou a você/.test(m.texto) && m.texto.includes(br(semana).slice(0, 5))));
  conf("o cliente sai da fila", !(await p.$(`.ag-linha[data-cli="${cA.id}"]`)));
  conf("aparece o desfazer", /desfazer/.test(await p.textContent("#aviso")));
  await p.screenshot({ path: path.join(OUT, "03-depois.png") });

  // 3 · desfazer devolve tudo
  await p.click("#aviso .aviso-bt");
  await p.waitForTimeout(900);
  const k2 = kAt(), atr2 = T.atribuicoes.filter(a => a.caso_id === kA.id).map(a => a.colaborador_id);
  conf("desfazer acende a ⭐, devolve a data e o Meu Dia", k2.importante === true && !k2.prazo && !(k2.ronda || {}).despacho && T.meu_dia.some(m => m.caso_id === kA.id));
  conf("desfazer apaga a anotação e devolve a atribuição", !T.andamentos.find(a => a.id === nota.id) && atr2.includes(PAULO) && !atr2.includes(MARCOS));

  // 4 · o botão do caso faz o mesmo
  await p.evaluate(async c => { await abrirFicha(c); }, cB.id);
  await p.evaluate(kid => { casoSel = kid; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); }, kB.id);
  await p.waitForTimeout(500);
  conf("o caso aberto traz o botão ✔ Concluir", /Concluir/.test(await p.textContent(".desp-bt")));
  
  await p.click(".desp-bt");
  await p.waitForSelector(".desp-datas");
  await p.click('.desp-datas .btn-mini:has-text("Em 6 meses")');
  await p.click("#desp-ok");
  await p.waitForTimeout(800);
  const em6 = await p.evaluate(() => somaMeses(hoje(), 6));
  conf(`no caso, "Em 6 meses" (${em6}) apaga a ⭐ sem anotação nem troca de pessoa`, kBt().importante === false && kBt().prazo === em6
    && !T.andamentos.some(a => a.caso_id === kB.id) && T.atribuicoes.some(a => a.caso_id === kB.id && a.colaborador_id === PAULO));
  await p.screenshot({ path: path.join(OUT, "04-caso.png") });
  const fx = await p.evaluate(() => document.querySelector(".faixa-prazos").textContent);
  conf("no quadro de prazos, a data é 'Volta à fila', e não prazo fatal", /Volta à fila/.test(fx) && !/PRAZO FATAL|Prazo fatal/.test(fx));

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
