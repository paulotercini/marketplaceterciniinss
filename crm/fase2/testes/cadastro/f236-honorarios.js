// F236 · frente "honorários" do teste dos clientes ativos: a concessão propõe os honorários do contrato (com a conta),
// a RPV traz o destaque e a sucumbência, o vencido não se passa por "próximo", o caso encerrado mostra a parcela dele,
// a parcela sem caso não vira compromisso de outro caso, o valor absurdo fica fora dos totais, o contrato assinado de
// Documentos vale, 💰 Recebimentos é parcela por parcela e o "recebido" pergunta o dia, o valor e o caso.
// Banco simulado, dados fictícios, datas relativas a hoje. Uso: node f236-honorarios.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, EU } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";

const dia = n => { const d = new Date(Date.now() - 3 * 3600e3); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const br = iso => iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4);
const pt = iso => iso.slice(8, 10) + "." + iso.slice(5, 7) + "." + iso.slice(0, 4);
const ts = (n, h = "12:00") => `${dia(n)}T${h}:00-03:00`;

const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: JSON.parse(JSON.stringify(FIX.clientes)), casos: JSON.parse(JSON.stringify(FIX.casos)),
  atribuicoes: [...FIX.atribuicoes], documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;

const id = (p, n) => `${p}2360000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const CV = id("c", 1), CR = id("c", 2), CM = id("c", 3), CA = id("c", 4), CJ = id("c", 5);
const KV46 = id("b", 11), KV31 = id("b", 12), KR = id("b", 21), KM = id("b", 31), KA = id("b", 41), KJ = id("b", 51);
const cli = (cid, nome, cpf, campos = {}) => ({ id: cid, nome, cpf, dn: "01011965", telefone: "(16) 99999-1234",
  telefones: [{ numero: "(16) 99999-1234", obs: "", zap: true }], campos, criado_em: "2025-01-01T12:00:00Z" });
const caso = (kid, cid, extra) => Object.assign(JSON.parse(JSON.stringify(FIX.casos[0])), { id: kid, cliente_id: cid, protocolos: [], processos: [],
  crps_nups: [], prazos_tribunal: [], prazo: null, criado_em: "2025-02-01T12:00:00Z" }, extra);
T.clientes.push(
  cli(CV, "Valdir Ficto Teste", "79769769746", { honor_ajuste: { incapacidade: "Acordo no JEF (B31): 30% dos atrasados da RPV, R$ 3.600,00 em 3 parcelas de R$ 1.200,00; sem destaque." },
    honor_estrut: { padrao: { nben: 3, pct: 30 } }, contrato: { destaque: { st: "nao" } } }),
  cli(CR, "Rafael Ficto Teste", "71533420911", { honor_estrut: { incapacidade: { pct: 30, valor: 1600, parcelas: 2, primeira_em: dia(25) } } }),
  cli(CM, "Maria Ficta Teste", "21933450722", { contrato: { destaque: { st: "pedido", em: dia(-27) } } }),
  cli(CA, "Aparecida Ficta Teste", "21975044133", { contrato: { destaque: { st: "nao" } } }),
  cli(CJ, "Rosângela Ficta Teste", "64177520844", { contrato: { destaque: { st: "cumprimento" } } }));
T.casos.push(
  caso(KV46, CV, { fase: "inss", especie: "B46", beneficio: "Apos. Especial", titulo: "Aposentadoria especial", origem_lista: "🌻 INSS", protocolos: ["1976004512"] }),
  caso(KV31, CV, { fase: "encerrado", especie: "B31", beneficio: "Aux. Incapacidade Temporária", titulo: "B31", origem_lista: "💵 Pagamentos", nb: "6319762209",
    processo: "5009762-11.2024.4.03.6302", resultado: "deferido", encerrado_em: ts(-100) }),
  caso(KR, CR, { fase: "inss", especie: "B87", beneficio: "BPC/LOAS — deficiência", titulo: "BPC", situacao_inss: "Concluída - Deferida", protocolos: ["1712045566"] }),
  caso(KM, CM, { fase: "judicial", especie: "B41", beneficio: "Apos. por Idade", titulo: "Idade", origem_lista: "👪 Judicial", resultado: "deferido",
    processo: "5000437-53.2022.4.03.6302", etapa: "sentença publicada" }),
  caso(KA, CA, { fase: "pagamento", especie: "B41", beneficio: "Apos. por Idade", titulo: "Idade", origem_lista: "💵 Pagamentos", resultado: "deferido",
    etapa: "RPV expedida", processo: "5009751-07.2023.4.03.6302",
    datajud: { processo: "5009751-07.2023.4.03.6302", marcos: { pago: { data: dia(-8), nome: "Pagamento de RPV" }, requisitorio: { data: dia(-68), nome: "Expedição de RPV" } } } }),
  caso(KJ, CJ, { fase: "judicial", especie: "B31", beneficio: "Aux. Incapacidade Temporária", titulo: "B31", origem_lista: "👪 Judicial", resultado: "indeferido",
    processo: "5002781-33.2025.4.03.6302", etapa: "perícia realizada" }));
T.atribuicoes.push({ caso_id: KV46, colaborador_id: EU }, { caso_id: KM, colaborador_id: EU }, { caso_id: KA, colaborador_id: EU });

const and = (aid, kid, origem, origem_id, texto, criado_em) => ({ id: id("a", aid), caso_id: kid, autor_id: EU, origem, origem_id, texto, criado_em,
  publico: false, todo_sync: false, excluir: false, importante: false, urgente: false });
const DM = "50004375320224036302";
T.andamentos.push(
  and(1, KR, "pat", "situacao:1712045566:Concluída - Deferida", "INSS: Em análise → Concluída - Deferida", ts(-5, "07:40")),
  and(2, KM, "pje", `hist:${DM}:${dia(-400)}T16:40:aaa`, `PJe (1º grau): Julgado procedente o pedido · 📎 Sentença — em ${pt(dia(-400))} 16:40 — PJEC 5000437-53.2022.4.03.6302`, ts(-400, "16:40")),
  and(3, KM, "pje", `mov:${DM}:${dia(-22)}T16:31:bbb`, `PJe (1º grau): Proferidas outras decisões não especificadas — em ${pt(dia(-22))} 16:31 — PJEC 5000437-53.2022.4.03.6302`, ts(-21, "07:55")),
  and(4, KM, "pje", `mov:${DM}:${dia(-15)}T16:20:ccc`, `PJe (1º grau): Expedição de Requisição de Pequeno Valor. — em ${pt(dia(-15))} 16:20 — PJEC 5000437-53.2022.4.03.6302`, ts(-14, "07:55")),
  and(5, KM, "pje", `hist:${DM}:${dia(-120)}T14:05:ddd`, `PJe (1º grau): Conhecido o recurso de INSS e não-provido · 📎 Acórdão — em ${pt(dia(-120))} 14:05 — PJEC 5000437-53.2022.4.03.6302`, ts(-120, "14:05")),
  and(6, KJ, "pje", `hist:50027813320254036302:${dia(-6)}T17:46:eee`, `PJe (1º grau): Julgado procedente o pedido · 📎 Sentença — em ${pt(dia(-6))} 17:46 — PJEC 5002781-33.2025.4.03.6302`, ts(-6, "17:46")));
const anx = (n, kid, cid, extra) => Object.assign({ id: id("d", n), caso_id: kid, cliente_id: cid, autor_id: EU, origem: "pje", andamento_id: null, texto: null,
  caminho: `pje/${cid}/${n}.pdf`, tipo: "application/pdf", tamanho: 50000, paginas: 2, paginas_imagem: [], criado_em: ts(-30) }, extra);
const carta = ["Instituto Nacional do Seguro Social", `${br(dia(-5))} 11:03:22`, "CARTA DE", "CONCESSÃO", "TITULAR: RAFAEL FICTO TESTE", "CPF: 715.334.209-11",
  "Comunicamos que foi concedido seu benefício:", "BENEFÍCIO ASSISTENCIAL À PESSOA COM DEFICIÊNCIA", "NÚMERO DO BENEFÍCIO VALOR DO BENEFÍCIO*",
  "715.334.209-0 R$ 1.621,00", "Solicitado em Concedido em", "DATA DE PAGAMENTO", `${br(dia(-120))} ${br(dia(-5))}`, "2° dia útil do mês **",
  "Início do benefício Início do pagamento", `${br(dia(-120))} ${br(dia(-5))}`, "Local de Pagamento"].join("\n");
T.anexos.push(
  anx(1, KV46, CV, { origem: "assinado", nome: "Assinado · procuracao-contrato-valdir.pdf", caminho: `assinados/${CV}/x.pdf`, criado_em: ts(-26, "15:40") }),
  anx(2, KR, CR, { origem: "pat", nome: "CARTA DE CONCESSAO.pdf", caminho: "pat/1712045566/1", texto: carta, criado_em: ts(-5, "07:50") }),
  anx(3, KM, CM, { nome: "Requisição de Pequeno Valor - autora", andamento_id: id("a", 4), texto: "REQUISIÇÃO DE PEQUENO VALOR\nValor requisitado: R$ 41.208,35\n"
    + "Honorários contratuais destacados (30%): R$ 12.362,51 em favor de PAULO ROBERTO TERCINI FILHO\nValor líquido da requerente: R$ 28.845,84" }),
  anx(4, KM, CM, { nome: "Requisição de Pequeno Valor - honorários sucumbenciais", andamento_id: id("a", 4),
    texto: "REQUISIÇÃO DE PEQUENO VALOR\nBeneficiário: PAULO ROBERTO TERCINI FILHO (honorários de sucumbência)\nValor requisitado: R$ 4.120,84" }),
  anx(5, KM, CM, { nome: "Decisão", andamento_id: id("a", 3), texto: "DECISÃO\nHOMOLOGO os cálculos.\nJuntado o contrato antes da expedição, DEFIRO o destaque de 30% dos honorários contratuais (art. 22, § 4º, da Lei 8.906/94)." }),
  anx(6, KM, CM, { nome: "Acórdão", andamento_id: id("a", 5), texto: "ACÓRDÃO\nA Turma negou provimento ao recurso do INSS. Condenado o INSS, recorrente vencido, em honorários de 10% sobre o valor da condenação (art. 55 da Lei 9.099/95). Intimem-se." }),
  anx(7, KA, CA, { nome: "Requisição de Pequeno Valor", criado_em: ts(-68), texto: "REQUISIÇÃO DE PEQUENO VALOR\nBeneficiária: APARECIDA FICTA TESTE · valor bruto: R$ 48.736,52 · natureza alimentar.\n"
    + "Honorários contratuais destacados: NÃO.\nRequisição de honorários sucumbenciais: PAULO ROBERTO TERCINI FILHO · R$ 3.512,40." }),
  anx(8, KJ, CJ, { nome: "Sentença", andamento_id: id("a", 6), texto: "SENTENÇA\nJULGO PROCEDENTE o pedido. Sem custas e honorários nesta instância (art. 55 da Lei 9.099/95). Defiro a gratuidade." }));
const pg = (n, kid, cid, descricao, valor, vencimento, extra = {}) => Object.assign({ id: id("e", n), caso_id: kid, cliente_id: cid, descricao, valor, vencimento,
  status: "aberto", pago_em: null, conferencias: [], todo_item_id: null }, extra);
const rec = (n) => ({ status: "recebido", pago_em: dia(n), conferencias: [{ c: EU, em: ts(n) }] });
T.pagamentos.push(
  pg(1, KV31, CV, "Honorários acordo B31 · parcela 1/3", 1200, dia(-130), { ...rec(-128), todo_item_id: "chk-v-1" }),
  pg(2, KV31, CV, "Honorários acordo B31 · parcela 2/3", 1200, dia(-40), { todo_item_id: "chk-v-2" }),
  pg(3, null, CV, "Honorários acordo B31 · parcela 3/3", 1200, dia(20), { todo_item_id: "chk-v-3" }),
  pg(4, null, CV, "Honorários RPV 5009762", 6200000, null, { todo_item_id: "chk-v-4" }),
  pg(5, KR, CR, "Honorários · 30% dos atrasados do BPC (DIB a DIP)", null, null),
  pg(6, KR, CR, "Honorários · parcela 1/2", 800, dia(25)),
  pg(7, KM, CM, "1º benefício (aposentadoria implantada)", 1621, dia(-10), rec(-8)),
  pg(8, KM, CM, "2º benefício", 1621, dia(22)),
  pg(9, KM, CM, "3º benefício", 1621, dia(52)),
  pg(10, KA, CA, "Honorários · 1º benefício (contrato)", 1621, dia(-245), rec(-245)),
  pg(11, KA, CA, "Honorários · 2º benefício (contrato)", 1621, dia(-215), rec(-214)),
  pg(12, KA, CA, "Honorários · 3º benefício (contrato)", 1621, dia(-185), rec(-184)),
  pg(13, KA, CA, "Honorários de sucumbência (RPV em nome do escritório)", 3512.4, dia(-4), rec(-4)),
  pg(14, KA, CA, "Honorários 30% dos atrasados (RPV)", 14620.96, dia(-3)));

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
  p._erros = [];
  p.on("pageerror", e => p._erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const ficha = async (cid, kid, aba) => {
    await p.evaluate(async ([c, k, a]) => {
      await abrirFicha(c);
      const m = document.getElementById("modal"); if (m) m.style.display = "none";
      if (k) casoSel = k;
      abaAtiva = a; repintarFicha();
    }, [cid, kid, aba]);
    await p.waitForTimeout(250);
  };
  const txt = sel => p.evaluate(s => (document.querySelector(s) || {}).textContent || "", sel);

  // ── valor absurdo ──
  conf("valor absurdo (R$ 6,2 milhões) é marcado; o normal não; o igual a um número do caso (NB) também é",
    await p.evaluate(([v4, v2, cv]) => valorSuspeito(D.pagamentos.find(x => x.id === v4)) && !valorSuspeito(D.pagamentos.find(x => x.id === v2))
      && valorSuspeito({ cliente_id: cv, valor: 631976 }), [id("e", 4), id("e", 2), CV]));

  // ── Valdir: B46 ativo e B31 encerrado com a parcela vencida ──
  await ficha(CV, KV46, 4);
  const venc = await txt('.painel[data-p="4"].ativo .hon-vencidos');
  conf("o vencido tem quadro próprio, em vermelho, com o valor e há quantos dias", /R\$\s?1\.200,00/.test(venc) && /há 40 dias/.test(venc) && /parcela 2\/3/.test(venc));
  const tiles = await p.$$eval('.painel[data-p="4"].ativo .hon-resumo .adr-tile', ts => ts.map(t => t.textContent.replace(/\s+/g, " ").trim()));
  conf("“Próximo vencimento” é só o que ainda não venceu (a 3/3), nunca a vencida",
    tiles.length === 4 && tiles[3].includes(pt(dia(20))) && !tiles[3].includes(pt(dia(-40))));
  conf("A receber não soma o valor absurdo (R$ 2.400,00) e diz o vencido", /R\$\s?2\.400,00/.test(tiles[2]) && /1 vencido/.test(tiles[2]));
  const linhas = await p.$$eval('.painel[data-p="4"].ativo .hon-tab tbody tr', trs => trs.map(t => t.textContent.replace(/\s+/g, " ")));
  conf("o lançamento de R$ 6,2 milhões aparece como “conferir valor”", linhas.some(l => /RPV 5009762/.test(l) && /conferir valor/.test(l)));
  conf("Contratado é o do caso escolhido (B46, padrão) e o Contrato mostra o ajuste do B31 encerrado",
    /Padrão do escritório/.test(tiles[0]) && /Acordo no JEF/.test(await txt('.painel[data-p="4"].ativo .adr-col-lado')));
  conf("o contrato assinado de Documentos (“Assinado · …”) é reconhecido", (await txt('.painel[data-p="4"].ativo .hon-ass-val')).includes(pt(dia(-26))));
  conf("a parcela sem caso propõe o caso da série dela (o B31)", linhas.some(l => /parcela 3\/3/.test(l) && /é de Auxílio por incapacidade temporária \(encerrado\)\?/.test(l)));
  conf("a aba diz o vencido", /1 vencido/.test(await txt('.mt[data-vv="4"]')));
  const dt = await p.evaluate(cv => linhasDeDatas(cv).linhas.filter(x => x.ico === "💰").map(x => ({ caso: x.casoId, rot: x.rotulo, data: x.data })), CV);
  conf("Prazos: a parcela vencida é compromisso do caso ENCERRADO dela; a sem caso não vira compromisso de ninguém",
    dt.length === 1 && dt[0].caso === KV31 && dt[0].rot === "Honorários a cobrar" && dt[0].data === dia(-40));
  conf("o B46 não mostra o honorário do B31 nos prazos; o B31 mostra",
    await p.evaluate(([a, b]) => !/Honorários/.test(faixaPrazos(D.casoPorId.get(a))) && /Honorários a cobrar/.test(faixaPrazos(D.casoPorId.get(b))), [KV46, KV31]));
  const oa = await p.evaluate(([a, b]) => [painelOutrasAbas(D.casoPorId.get(a)), painelOutrasAbas(D.casoPorId.get(b))], [KV46, KV31]);
  conf("Nas outras abas (B46): o vencido do outro caso, dizendo de qual, e a parcela sem caso; nada de “próximo vencimento” vencido",
    /Honorários de outro caso/.test(oa[0]) && /incapacidade temporária \(encerrado\)/.test(oa[0]) && /sem caso/.test(oa[0]) && !/próximo vencimento/.test(oa[0]));
  conf("Nas outras abas (B31): a parcela dele vencida, em vermelho", /vencido há 40 d/.test(oa[1]) && /var\(--venc\)/.test(oa[1]));
  conf("o caso encerrado com honorário aberto aceita a anotação da cobrança", await p.evaluate(k => !/comentários desativados/.test(composerCaso(D.casoPorId.get(k))), KV31));

  // ── "recebido" da parcela sem caso: pergunta o caso (sugere o B31) e o dia ──
  await p.evaluate(e => receberPgto(e), id("e", 3));
  await p.waitForSelector("#rc-caso");
  conf("o recebido da parcela sem caso pergunta de qual caso, já sugerindo o da série", await p.evaluate(k => document.getElementById("rc-caso").value === k, KV31));
  banco.escritas.length = 0;
  await p.evaluate(() => { document.getElementById("rc-caso").value = ""; });
  await p.click('#modal button:has-text("Confirmar")');
  await p.waitForTimeout(300);
  conf("sem dizer o caso, não grava", !banco.escritas.some(e => e.m === "PATCH" && e.t === "pagamentos"));
  await p.evaluate(([k, d]) => { document.getElementById("rc-caso").value = k; document.getElementById("rc-data").value = d; }, [KV31, dia(-1)]);
  await p.click('#modal button:has-text("Confirmar")');
  await p.waitForTimeout(800);
  const v3 = T.pagamentos.find(x => x.id === id("e", 3));
  conf("recebido grava o dia informado, o caso escolhido e quem recebeu", v3.status === "recebido" && v3.pago_em === dia(-1) && v3.caso_id === KV31
    && (v3.conferencias || [])[0] && v3.conferencias[0].c === EU);

  // ── Rafael: BPC deferido no PAT, com a carta: os 30% dos atrasados estimados e lançados com um clique ──
  await ficha(CR, KR, 4);
  const pr = await p.evaluate(([c, k]) => { const x = propostaHonorarios(D.cliPorId.get(c), D.casoPorId.get(k)); return x && x.itens.map(i => ({ ch: i.ch, valor: i.valor, venc: i.venc, alvo: i.alvo && i.alvo.id, nota: i.nota })); }, [CR, KR]);
  conf("a concessão no INSS (PAT e carta) propõe os 30% dos atrasados: 115 dias × R$ 1.621,00 ÷ 30 × 30% = R$ 1.864,15, no 1º crédito (45 dias)",
    pr && pr.length === 1 && pr[0].ch === "atr" && pr[0].valor === 1864.15 && pr[0].venc === dia(40) && pr[0].alvo === id("e", 5) && /≈ estimado: 115 dias/.test(pr[0].nota));
  banco.escritas.length = 0;
  await p.click('.painel[data-p="4"].ativo .hon-prop button:has-text("Lançar este honorário")');
  await p.waitForTimeout(1200);
  const r1 = T.pagamentos.find(x => x.id === id("e", 5));
  conf("um clique completa a linha “a calcular” com o valor estimado, a data e a conta", +r1.valor === 1864.15 && r1.vencimento === dia(40)
    && /— ≈ estimado/.test(r1.descricao) && r1.todo_item_id === `hon:${KR}:atr`);
  conf("o lançamento nasce com o lembrete de cobrança, que não entra em Aposentadorias futuras",
    T.lembretes.filter(l => (l.detalhes || {}).origem === "cobranca" && l.cliente_id === CR).length === 2
    && await p.evaluate(c => lembretesDo(c).length === 0, CR));
  conf("A receber mostra o estimado à parte", /\+ ≈ R\$\s?1\.864,15 estimado/.test(await txt('.painel[data-p="4"].ativo .hon-resumo')));
  conf("a proposta some depois de lançada", !(await p.$('.painel[data-p="4"].ativo .hon-prop')));

  // ── Maria: RPV expedida com destaque e sucumbência: os dois lançamentos com o valor do documento ──
  await ficha(CM, KM, 4);
  const pm = await p.evaluate(([c, k]) => { const x = propostaHonorarios(D.cliPorId.get(c), D.casoPorId.get(k)); return x && { itens: x.itens.map(i => ({ ch: i.ch, valor: i.valor, venc: i.venc })), info: x.info, motivo: x.motivo.rot }; }, [CM, KM]);
  conf("a RPV propõe o destaque (R$ 12.362,51) e a sucumbência (R$ 4.120,84), em até 60 dias da requisição",
    pm && pm.itens.length === 2 && pm.itens[0].ch === "atr" && pm.itens[0].valor === 12362.51 && pm.itens[0].venc === dia(45)
    && pm.itens[1].ch === "suc" && pm.itens[1].valor === 4120.84 && pm.motivo === "requisitório expedido");
  conf("a sucumbência do acórdão vem na frase inteira", pm && pm.info.some(t => /\(art\. 55 da Lei 9\.099\/95\)\./.test(t)));
  conf("A receber já mostra o requisitado a lançar", /\+ R\$\s?16\.483,35 a lançar/.test(await txt('.painel[data-p="4"].ativo .hon-resumo')));
  conf("o processo deferiu o destaque: o Contrato propõe trocar o “pedido”",
    await p.evaluate(k => (destaqueDoProcesso(D.casoPorId.get(k)) || {}).em, KM) === dia(-22)
    && /marcar como deferido/.test(await txt('.painel[data-p="4"].ativo .adr-col-lado')));
  await p.click('.painel[data-p="4"].ativo .hon-prop button:has-text("Lançar os 2 honorários")');
  await p.waitForTimeout(1200);
  const novos = T.pagamentos.filter(x => String(x.todo_item_id || "").startsWith(`hon:${KM}:`));
  conf("dois lançamentos a receber, com o cliente, o caso e a marca da proposta",
    novos.length === 2 && novos.every(x => x.cliente_id === CM && x.caso_id === KM && x.status === "aberto")
    && novos.some(x => +x.valor === 12362.51 && /destaque/.test(x.descricao)) && novos.some(x => +x.valor === 4120.84 && /sucumbência/.test(x.descricao)));
  conf("destaque e sucumbência não viram cobrança ao cliente (quem paga é o tribunal), nem o valor estimado",
    await p.evaluate(([km, r1]) => D.pagamentos.filter(x => String(x.todo_item_id || "").startsWith(`hon:${km}:`)).every(x => !cobravel(x))
      && !cobravel(D.pagamentos.find(x => x.id === r1)) && /2º benefício/.test((document.querySelector('.painel[data-p="4"].ativo .hon-cob') || {}).textContent || ""), [KM, id("e", 5)]));

  // ── Aparecida: caso em Pagamentos com a RPV paga e os 30% vencidos ──
  await ficha(CA, null, 4);
  const receb = await txt('.painel[data-p="4"].ativo .hon-receb');
  conf("o cartão Em recebimento diz que a RPV foi paga e que falta o honorário", /RPV paga em/.test(receb) && /falta receber os honorários/.test(receb) && !/falta o dinheiro entrar/.test(receb));
  conf("a etapa velha (“RPV expedida”) é apontada, com o botão de marcar “recebido”", /A etapa ainda diz “RPV expedida”/.test(receb) && /marcar “recebido”/.test(receb));
  conf("depois do pagamento não se oferece “alterar o destaque”, e o quadro diz o que vale agora",
    !(await p.$('.painel[data-p="4"].ativo .hon-dst')) && /sem o destaque/.test(await txt('.painel[data-p="4"].ativo .adr-col-lado')));
  const tA = await p.$$eval('.painel[data-p="4"].ativo .hon-resumo .adr-tile', ts => ts.map(t => t.textContent.replace(/\s+/g, " ").trim()));
  conf("Recebido separa o que o cliente pagou da sucumbência do advogado", /R\$\s?4\.863,00/.test(tA[1]) && /3\.512,40 de sucumbência/.test(tA[1]));
  conf("sem data futura, “Próximo vencimento” fica vazio (o vencido está no quadro vermelho)", /—/.test(tA[3]) && !tA[3].includes(pt(dia(-3))));

  // ── Rosângela: sentença de procedência no JEF, nada lançado: a proposta "a calcular" e o "não lançar" ──
  await ficha(CJ, KJ, 4);
  const pj = await p.evaluate(([c, k]) => { const x = propostaHonorarios(D.cliPorId.get(c), D.casoPorId.get(k)); return x && { itens: x.itens.map(i => ({ ch: i.ch, valor: i.valor, nota: i.nota })), info: x.info }; }, [CJ, KJ]);
  conf("a sentença de procedência propõe os 6 benefícios (30%) e os 30% dos atrasados, a calcular, com o destaque a pedir",
    pj && pj.itens.length === 2 && pj.itens.every(i => !i.valor && /^a calcular/.test(i.nota)) && pj.info.some(t => /art\. 22, § 4º/.test(t))
    && pj.info.some(t => /Sem custas e honorários nesta instância \(art\. 55 da Lei 9\.099\/95\)\./.test(t)));
  await p.click('.painel[data-p="4"].ativo .hon-prop button:has-text("não lançar")');
  await p.waitForTimeout(500);
  conf("“não lançar” tira a proposta do caso e guarda o motivo", await p.evaluate(([c, k]) => !propostaHonorarios(D.cliPorId.get(c), D.casoPorId.get(k))
    && D.cliPorId.get(c).campos.hon_prop_fora[k].rot === "sentença de procedência", [CJ, KJ]));

  // ── 💰 Recebimentos: parcela por parcela, o vencido mais antigo primeiro, sem filtro por pessoa ──
  await p.evaluate(() => { fecharFicha(false); filtroColab = null; visao = "recebimentos"; render(); montarSidebar(); });
  await p.waitForTimeout(400);
  const rc = await p.$$eval(".rc-linha", ls => ls.map(l => l.dataset.cli + "|" + l.textContent.replace(/\s+/g, " ")));
  conf("Recebimentos lista as parcelas: a vencida mais antiga primeiro (a do caso encerrado)", rc.length >= 6 && rc[0].startsWith(CV) && /parcela 2\/3/.test(rc[0]));
  conf("o valor absurdo fica em “Valor a conferir”, fora dos totais", /Valor a conferir \(1\)/.test(await txt("#conteudo-meio")) && !/6\.200\.000/.test(await txt(".rc-tot")));
  conf("o número da barra é o dinheiro vencido", (await txt('[data-v="recebimentos"] .cont')).trim() === "2");

  // ── "o valor está certo": quem confere devolve o lançamento aos totais ──
  await p.evaluate(e => conferirValor(e), id("e", 4));
  await p.waitForTimeout(500);
  conf("“o valor está certo” devolve o lançamento aos totais (campos.valor_conferido)",
    await p.evaluate(([e, c]) => !valorSuspeito(D.pagamentos.find(x => x.id === e)) && D.cliPorId.get(c).campos.valor_conferido[e] === 6200000, [id("e", 4), CV]));

  conf("sem erro de página", !p._erros.length);
  if (p._erros.length) console.log(p._erros.join("\n"));
  const bons = ok.filter(x => x[1]).length;
  console.log(`\n${bons}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(bons === ok.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
