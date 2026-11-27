// F832 · melhorias 5 e 6 da auditoria (ordem do Paulo, 27.11.2026): a RPV registrada no caso judicial vence 60 dias
// depois da entrega da requisição (Lei 10.259/2001, art. 17) e avisa no Meu Dia; o repasse calcula o líquido (bruto
// menos IR retido e honorários não destacados), baixa o honorário já lançado sem duplicar e imprime o recibo; o cartão
// da perícia judicial mostra o laudo, o aviso do PJe e a manifestação. Banco simulado e dados fictícios. Uso: node f832.js
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
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: [...FIX.colaboradores], clientes: [], casos: [], atribuicoes: [],
  documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;
const iso = n => new Date(Date.now() - 3 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
const ts = (n, h = "12:00") => `${iso(n)}T${h}:00-03:00`;
let seq = 0;
const id = p => `${p}0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const cA = { id: id("c"), nome: "Cliente Teste", cpf: "00000000000", telefone: null, campos: {}, telefones: [], criado_em: ts(-400) };
T.clientes.push(cA);
const PROC = "5000000-00.2026.4.03.6136";
const kA = { id: id("b"), cliente_id: cA.id, titulo: cA.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
  marcadores: [], ronda: {}, pje_links: {}, importante: false, urgente: false, dcb_prorrogacao_pedida: false, origem_lista: "⚖️ Judicial",
  criado_em: ts(-300), beneficio: "Aposentadoria por idade", especie: "B41", fase: "judicial", processo: PROC,
  prazos_tribunal: [{ sistema: "pje", origem: "pje:x", numero: PROC, ato: "Intimação", dias: 15, expedido_em: iso(-4), fim: iso(12), situacao: "aberto" }] };
T.casos.push(kA); T.atribuicoes.push({ caso_id: kA.id, colaborador_id: PAULO });
const ev = { id: id("d"), caso_id: kA.id, tipo: "Perícia médica", data_hora: ts(-20, "09:00"), status: "realizada", local: "Fórum fictício", obs: "" };
T.eventos.push(ev);
const laudo = { id: id("a"), caso_id: kA.id, cliente_id: cA.id, autor_id: PAULO, nome: "Laudo pericial · laudo.pdf", caminho: `${cA.id}/laudo.pdf`, tipo: "application/pdf", criado_em: ts(-5) };
// o honorário dos atrasados já lançado e em aberto: o repasse baixa este, sem lançar outro
const pgAtr = { id: id("f"), caso_id: kA.id, cliente_id: cA.id, descricao: "Honorários · 30% dos atrasados", valor: null, vencimento: null, status: "aberto", pago_em: null, conferencias: [] };
T.pagamentos.push(pgAtr);

const ok = [];
const conf = (nome, v, x) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); if (!v && x !== undefined) console.log(JSON.stringify(x)); };

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  await instalarBanco(ctx, { SUPA, SESSAO, banco });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const erros = [];
  const p = await ctx.newPage();
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await p.waitForTimeout(900);

  // ── 1 · as contas ─────────────────────────────────────────────────────────
  const contas = await p.evaluate(() => ({
    rpv: prazoRpv({ tipo: "rpv", expedida: "2026-01-05", entrega: "2026-01-10" }),
    semEntrega: prazoRpv({ tipo: "rpv", expedida: "2026-01-05" }),
    prec: prazoRpv({ tipo: "precatorio", expedida: "2026-01-05", entrega: "2026-01-10" }),
    liq: liquidoRepasse({ bruto: 10000, honor: 3000, ir: 150.35, destacado: false }),
    liqDest: liquidoRepasse({ bruto: 7000, honor: 3000, ir: 0, destacado: true }),
    sit: [situacaoReq({}), situacaoReq({ pago_em: "x" }), situacaoReq({ pago_em: "x", levantado_em: "y" }), situacaoReq({ repasse: {} })].join(",") }));
  conf("RPV: 60 dias da entrega da requisição", contas.rpv === "2026-03-11", contas);
  conf("RPV sem a entrega: conta da expedição", contas.semEntrega === "2026-03-06", contas);
  conf("precatório não tem prazo de 60 dias", contas.prec === null, contas);
  conf("líquido: bruto menos IR e honorários", contas.liq === 6849.65, contas);
  conf("líquido: honorários destacados não saem do crédito", contas.liqDest === 7000, contas);
  conf("situações na ordem", contas.sit === "Expedida,Paga,Levantada,Repassada", contas);

  // ── 2 · registrar a RPV na aba Honorários ─────────────────────────────────
  await p.evaluate(([cli, k]) => { abrirFicha(cli); casoSel = k; abaAtiva = 4; repintarFicha(); }, [cA.id, kA.id]);
  await p.waitForSelector(".hon-req");
  conf("o caso judicial tem o cartão RPV e precatório com Registrar", await p.evaluate(() => /Registrar/.test(document.querySelector(".hon-req").textContent)));
  await p.evaluate(k => passoReq(k, "", "expedida"), kA.id);
  await p.fill("#rq-valor", "10000"); await p.fill("#rq-expedida", iso(-70)); await p.fill("#rq-entrega", iso(-65));
  await p.evaluate(k => gravarReq(k, "", "expedida"), kA.id); await p.waitForTimeout(400);
  const r1 = await p.evaluate(([cli, k]) => ((D.cliPorId.get(cli).campos.requisicoes || {})[k] || []), [cA.id, kA.id]);
  conf("a requisição grava no cliente, pelo caso", r1.length === 1 && r1[0].valor === 10000 && r1[0].entrega === iso(-65), r1);
  conf("gravou no banco", ((T.clientes[0].campos.requisicoes || {})[kA.id] || []).length === 1);
  const ag = await p.evaluate(k => itensAgenda().filter(i => i.k && i.k.id === k && i.selo === "RPV").map(i => [i.data, i.resumo]), kA.id);
  conf("o Meu Dia avisa o pagamento da RPV no 60º dia da entrega", ag.length === 1 && ag[0][0] === iso(-5) && /cobrar o pagamento/.test(ag[0][1]), ag);
  conf("o cartão mostra o prazo vencido", await p.evaluate(() => /prazo vencido em/.test(document.querySelector(".hon-req").textContent)));
  const cc = await p.evaluate(k => { const x = concessaoDoCaso(D.casoPorId.get(k)); return x && { exped: x.exped, reqs: x.reqs.length }; }, kA.id);
  conf("a requisição registrada entra na concessão (honorários)", cc && cc.reqs === 1 && cc.exped === iso(-65), cc);

  // ── 3 · paga, levantada, repassada ────────────────────────────────────────
  const rid = r1[0].id;
  await p.evaluate(([k, r]) => passoReq(k, r, "pago"), [kA.id, rid]); await p.fill("#rq-pago_em", iso(-10));
  await p.evaluate(([k, r]) => gravarReq(k, r, "pago"), [kA.id, rid]); await p.waitForTimeout(300);
  conf("paga: o aviso do Meu Dia sai", await p.evaluate(k => !itensAgenda().some(i => i.k && i.k.id === k && i.selo === "RPV"), kA.id));
  await p.evaluate(([k, r]) => passoReq(k, r, "levantado"), [kA.id, rid]); await p.fill("#rq-levantado_em", iso(-3)); await p.fill("#rq-alvara", "123/2026");
  await p.evaluate(([k, r]) => gravarReq(k, r, "levantado"), [kA.id, rid]); await p.waitForTimeout(300);
  await p.evaluate(([k, r]) => passoReq(k, r, "repasse"), [kA.id, rid]);
  const prop = await p.evaluate(() => ({ bruto: rqVal("bruto"), honor: rqVal("honor"), liq: document.getElementById("rq-liq").textContent }));
  conf("o repasse propõe 30% dos atrasados e mostra o líquido", +prop.bruto === 10000 && +prop.honor === 3000 && /7\.000,00/.test(prop.liq), prop);
  await p.fill("#rq-ir", "150.35"); await p.evaluate(() => rqLiquido());
  conf("o líquido desconta o IR retido", /6\.849,65/.test(await p.textContent("#rq-liq")));
  await p.evaluate(([k, r]) => gravarReq(k, r, "repasse"), [kA.id, rid]); await p.waitForTimeout(500);
  const pgs = T.pagamentos.filter(x => x.caso_id === kA.id);
  conf("o honorário já lançado foi baixado, sem lançamento novo", pgs.length === 1 && pgs[0].status === "recebido" && +pgs[0].valor === 3000 && pgs[0].pago_em === iso(0), pgs);
  conf("a situação é Repassada", await p.evaluate(() => /Repassada/.test(document.querySelector(".hon-req").textContent)));
  const [rec] = await Promise.all([ctx.waitForEvent("page"), p.evaluate(([k, r]) => reciboRepasse(k, r), [kA.id, rid])]);
  await rec.waitForLoadState();
  const txt = await rec.evaluate(() => document.body.innerText);
  conf("o recibo traz bruto, honorários, IR e líquido", /Recibo de repasse/.test(txt) && /10\.000,00/.test(txt) && /3\.000,00/.test(txt) && /150,35/.test(txt) && /6\.849,65/.test(txt) && /123\/2026/.test(txt), txt.slice(0, 400));
  await rec.close();

  // ── 4 · o cartão da perícia judicial ──────────────────────────────────────
  const cartao = () => p.evaluate(e => cartaoPericia(D.eventos.find(x => x.id === e)), ev.id);
  let h = await cartao();
  conf("sem laudo: Aguardando laudo, com o botão Laudo", /Aguardando laudo/.test(h) && />Laudo</.test(h), h.slice(0, 300));
  await p.evaluate(a => D.anexos.push(a), laudo);
  h = await cartao();
  conf("com o laudo: Laudo juntado, Manifestação e Quesitos", /Laudo juntado/.test(h) && />Manifestação</.test(h) && />Quesitos</.test(h));
  conf("o expediente do PJe aparece como aviso, com Fatal", new RegExp(`Aviso do PJe[\\s\\S]*${iso(12).slice(8, 10)}\\.${iso(12).slice(5, 7)}`).test(h) && /só quando anotado no CRM/.test(h) && />Fatal</.test(h));
  conf("o aviso não vira prazo fatal sozinho", await p.evaluate(k => !D.casoPorId.get(k).prazo, kA.id));
  await p.evaluate(([k, c]) => D.anexos.push({ id: "a-man", caso_id: k, cliente_id: c, nome: "Manifestação sobre a perícia · manif.pdf", caminho: "x/manif.pdf", criado_em: new Date().toISOString() }), [kA.id, cA.id]);
  h = await cartao();
  conf("com a manifestação: Manifestação feita, o documento no cartão e o aviso some", /Manifestação feita/.test(h) && /manif\.pdf/.test(h) && !/Aviso do PJe/.test(h));

  conf("sem erro de página", !erros.length, erros);
  await nav.close(); s.close();
  console.log(`${ok.filter(x => x[1]).length}/${ok.length} passaram`);
  process.exit(ok.every(x => x[1]) ? 0 : 1);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
