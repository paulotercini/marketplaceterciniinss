// F247 · um clique no que mais se escrevia à mão: o Concluir escreve o que foi feito pelo pedido da tarefa ("Réplica
// protocolada"), "Sem resposta" conta as tentativas e marca a próxima, "Pedir ao cliente" no caso em andamento entra no
// Trouxe documentos, e o concedido ainda não implantado se confere e se registra com NB, DIB e renda. Banco simulado e
// dados fictícios. Uso: node f247.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f247";
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


// A · a tarefa de apresentar réplica
const cA = cli("Adélia Fictícia Réplica", { advogado_id: PAULO });
const kA = caso(cA, { beneficio: "Aux. Incapacidade Temporária", especie: "B31", fase: "judicial", origem_lista: "👪 Judicial", processos: [{ numero: "5000001-11.2026.4.03.6314" }] });
const aA = and(kA, -3, "Apresentar réplica à contestação. Prazo 30/10.");
const tfA = { id: id("f"), andamento_id: aA.id, caso_id: kA.id, colaborador_id: PAULO, atribuido_por: PAULO, lembrar_em: iso(0), concluida_em: null, criado_em: ts(-3) };
T.andamento_tarefas.push(tfA);
// B · cliente com telefone e dois casos (o pedido vai a um deles)
const cB = cli("Bruna Fictícia Contato"); cB.telefone = "16999990001";
const kB = caso(cB, { beneficio: "Apos. por Idade", especie: "B41", fase: "inss", der: iso(-50), protocolos: ["1700000301"] });
const kB2 = caso(cB, { beneficio: "Aux. Incapacidade Temporária", especie: "B31", fase: "judicial", origem_lista: "👪 Judicial" });
and(kB, -20, "Requerimento protocolado.");
// D · concedido no INSS, ainda não implantado
const cD = cli("Dalva Fictícia Implanta");
const kD = caso(cD, { beneficio: "Apos. por Idade", especie: "B41", fase: "inss", der: iso(-120), resultado: "deferido", decisao_em: iso(-10), protocolos: ["1700000302"] });
and(kD, -10, "Deferido.");

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
  const abrir = async (c, k) => { await p.evaluate(async ([cid, kid]) => { await abrirFicha(cid); casoSel = kid; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); fecharCaixa(); }, [c.id, k.id]); await p.waitForTimeout(500); };
  const util = n => p.evaluate(n => proxDiaUtil(somaDias(hoje(), n)), n);
  const br = s => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;



  // 1 · o "feito" pelo pedido da tarefa
  const fr = await p.evaluate(() => ["Apresentar réplica à contestação", "Manifestar sobre o laudo que foi favorável. Aguardar proposta de acordo.",
    "Manifestar sobre os cálculos.", "Apresentar quesitos", "Cumprir a exigência do INSS", "Ingrid digitaliza os documentos"].map(feitoDaTarefa));
  conf(`o feito sai do pedido (${fr.join(" | ")})`, fr.join("|") === "Réplica protocolada|Manifestação sobre o laudo protocolada|Manifestação sobre os cálculos protocolada|Quesitos apresentados|Exigência cumprida|");
  await abrir(cA, kA);
  const n1 = T.andamentos.length;
  await p.evaluate(id => concluirDeVez(id), tfA.id);
  await p.waitForTimeout(700);
  const feito = T.andamentos.slice(n1).find(a => a.caso_id === kA.id);
  conf(`um clique em Concluir escreve o que foi feito (${feito && feito.texto})`, feito && feito.texto === "✔ Réplica protocolada" && feito.responde_a === aA.id);
  conf("a tarefa fica concluída", !!T.andamento_tarefas.find(t => t.id === tfA.id).concluida_em);

  // 2 · Sem resposta: três tentativas
  await abrir(cB, kB);
  conf("o campo de escrever traz 'Sem resposta' e 'Pedir ao cliente'", !!(await p.$(".tipo-ch.tipo-sr")) && !!(await p.$(".tipo-ch.tipo-pc")));
  const em2 = await util(2);
  for (let i = 1; i <= 3; i++) {
    await p.click(".tipo-ch.tipo-sr");
    await p.click('.esp-lista .esp-it:has-text("telefone")');
    await p.waitForTimeout(600);
  }
  const srs = T.andamentos.filter(a => a.caso_id === kB.id && /^\[CONTATO\] Sem resposta/.test(a.texto)).map(a => a.texto);
  conf(`as tentativas são contadas (${srs[2]})`, srs.length === 3 && srs[2] === `[CONTATO] Sem resposta (3ª tentativa, telefone). Tentar de novo em ${br(em2)}.`);
  conf("cada tentativa marca a próxima para 2 dias úteis", T.andamento_tarefas.filter(t => t.caso_id === kB.id && t.lembrar_em === em2 && t.natureza === "lembrete").length === 3);
  const zap = await p.getAttribute(".sr-zap", "href").catch(() => "");
  await p.screenshot({ path: path.join(OUT, "01-sem-resposta.png") });
  conf("na 3ª, a mensagem pronta no WhatsApp", /^https:\/\/wa\.me\/5516999990001\?text=Ol%C3%A1%2C%20Bruna/.test(zap || ""));
  await p.evaluate(() => fecharCaixa());

  // 3 · Pedir ao cliente no caso em andamento
  await p.click(".tipo-ch.tipo-pc");
  await p.fill("#pc-itens", "Relatório médico atualizado\nSenha do Meu INSS");
  const ate = await p.inputValue("#pc-ate");
  await p.click('button:has-text("Registrar o pedido")');
  await p.waitForTimeout(700);
  const ped = ((T.clientes.find(c => c.id === cB.id).campos || {}).docs_pedidos || [])[0] || {};
  conf("o pedido fica no cadastro, preso ao caso, com a data", ped.caso_id === kB.id && ped.ate === ate && (ped.itens || []).length === 2);
  const anP = T.andamentos.find(a => a.caso_id === kB.id && /^\[DOCUMENTOS\] Pedido ao cliente/.test(a.texto));
  conf(`a anotação do pedido (${anP && anP.texto})`, anP && anP.texto === `[DOCUMENTOS] Pedido ao cliente: Relatório médico atualizado; Senha do Meu INSS. Entregar até ${br(ate)}.`);
  conf("na data, um lembrete cobra", T.andamento_tarefas.some(t => t.andamento_id === (anP || {}).id && t.lembrar_em === ate));
  const balcao = await p.evaluate(cid => pedidosDoBalcao(cid).grupos.map(g => [g.k.id, g.itens.map(i => i.nome)]), cB.id);
  conf("o Trouxe documentos mostra o pedido no caso certo", balcao.some(([k, it]) => k === kB.id && it.includes("Relatório médico atualizado")) && !balcao.some(([k]) => k === kB2.id));

  // 4 · implantação
  await abrir(cD, kD);
  conf("o concedido ainda não implantado se confere como 'Não implantado · +7 d'", /Não implantado · \+7 d/.test(await p.textContent(".faixa-prazos .conf-sem")));
  const em7 = await util(7), n4 = T.andamentos.length;
  await p.evaluate(() => { const d = document.querySelector(".faixa-prazos .fp-menu"); if (d) d.open = true; }); await p.click(".faixa-prazos .conf-sem");
  await p.waitForTimeout(700);
  const ni = T.andamentos.slice(n4).find(a => a.caso_id === kD.id);
  conf(`a conferência anota a implantação que falta (${ni && ni.texto})`, ni && ni.texto === `Conferi: o benefício ainda não foi implantado. Conferir de novo em ${br(em7)}.`);
  await p.evaluate(() => { const d = document.querySelector(".faixa-prazos .fp-menu"); if (d) d.open = true; }); await p.click(".faixa-prazos .conf-mov");
  await p.waitForSelector(".mov-ops .esp-it");
  await p.waitForFunction(() => document.activeElement && document.activeElement.id === "mov-txt");   // a janela põe o cursor no detalhe; só depois se preenche o NB
  conf("o Movimentou abre por 'Benefício implantado'", (await p.textContent(".mov-ops .esp-it")) === "Benefício implantado" && !!(await p.$("#mov-nb")));
  await p.fill("#mov-nb", "1234567890"); await p.fill("#mov-dib", iso(-10)); await p.fill("#mov-rmi", "1.621,00");
  await p.screenshot({ path: path.join(OUT, "02-implantado.png") });
  const n5 = T.andamentos.length;
  await p.click('.mov-ops .esp-it:has-text("Benefício implantado")');
  await p.waitForTimeout(800);
  const im = T.andamentos.slice(n5).find(a => a.caso_id === kD.id), kD2 = T.casos.find(k => k.id === kD.id);
  conf(`a anotação leva NB, DIB e renda (${im && im.texto})`, im && im.importante && im.texto === `Benefício implantado: NB 123.456.789-0, DIB ${br(iso(-10))}, renda R$ 1.621,00.`);
  conf("o NB e a DIB vão ao caso e a implantação fica marcada", kD2.nb === "1234567890" && kD2.dib === iso(-10) && !!(kD2.ronda || {}).implantado);
  await abrir(cD, kD);
  conf("depois de implantado, volta a conferência comum", /Em análise · \+7 d/.test(await p.textContent(".faixa-prazos .conf-sem")));

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
