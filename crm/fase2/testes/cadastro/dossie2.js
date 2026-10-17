// Dossiê, onda 2 — laudo médico (PMF e SABI), carta de concessão (a de hoje e
// a antiga), extrato de pagamento e cópia do processo lidos do texto do
// dossiê; da cópia, só a folha de interposição e a comunicação de decisão,
// sem os despachos. No quadro "O que o dossiê já diz": a DCB a gravar, o
// recurso com o prazo contado da conclusão do pedido, a decadência da revisão
// e o último laudo. Dados fictícios, datas contadas a partir de hoje.
process.env.TZ = "America/Sao_Paulo";   // as datas da prova seguem o relógio do escritório, e não o da CI (UTC vira o dia às 21h)
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1 } = require("./fixturas");
const { laudoPmf, LAUDO_SABI_TEXTO, cartaNova, CARTA_ANTIGA_TEXTO, extratoPag, processo, EXIGENCIA_AGENDAR, agendamento,
  comunicacaoIndeferimento } = require("./fixt-dossie");
const SUPA = "https://ficticio.supabase.co";

// "dd/mm/aaaa" de hoje + n dias, e o dia d do mês de hoje + n meses
const br = d => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
const dia = n => { const d = new Date(); d.setDate(d.getDate() + n); return br(d); };
const mes = (n, d) => { const x = new Date(); x.setDate(1); x.setMonth(x.getMonth() + n); x.setDate(d); return br(x); };
const iso = b => b.split("/").reverse().join("-");

const NB = "7001234567", NB_APOS = "1801234560";
// os despachos ficam na cópia, como no documento real, e não podem virar fato
const PA_CONCEDIDO = processo({ protocolo: "1122334455", servico: "Benefício por Incapacidade", status: "Concluída", entrada: dia(-70),
  atualizado: dia(-19), nb: NB,
  despachos: [[dia(-60), EXIGENCIA_AGENDAR], [dia(-59), agendamento(dia(-59), dia(-50), "10:20")],
    [dia(-19), ["A perícia médica reconheceu a sua incapacidade para o trabalho ou atividade habitual e o AUXÍLIO POR",
      `INCAPACIDADE TEMPORÁRIA PREVIDENCIÁRIO nº ${NB} foi concedido.`, `A cessação do seu benefício será em ${dia(40)}.`]]] });
const PA_PRORROG = processo({ protocolo: "5566778899", servico: "Pedido de Prorrogação de Benefício por Incapacidade", status: "Pendente",
  entrada: dia(-6), nb: NB,
  despachos: [[dia(-5), agendamento(dia(-5), dia(20), "07:00")],
    [dia(-3), ["Prezado(a) Sr.(a), para dar continuidade ao pedido, apresente o relatório médico atualizado em 'Cumprir Exigência'.",
      "O documento deve ser enviado em até 30 (trinta) dias, sob pena de conclusão do pedido."]]] });
// a comunicação sai com "Data: 9 de outubro de 2026", a emissão da cópia: o
// prazo do recurso conta da última atualização do pedido concluído
const PA_INDEFERIDO = processo({ protocolo: "6677889900", servico: "Pedido de Prorrogação de Benefício por Incapacidade", status: "Concluída",
  entrada: dia(-30), atualizado: dia(-10), nb: NB,
  despachos: [[dia(-10), ["A perícia médica não reconheceu a sua incapacidade para o trabalho ou atividade habitual e o benefício",
    `${NB} não foi prorrogado.`, `A cessação do seu benefício continua sendo em ${dia(-12)}.`]]],
  comunicacao: comunicacaoIndeferimento("700.123.456-7", dia(-12)) });
// a cópia sem a última atualização: o recurso pede a ciência, sem prazo contado
const PA_SEM_DATA = processo({ protocolo: "7788990011", servico: "Benefício por Incapacidade", status: "Concluída", entrada: dia(-40), nb: NB,
  despachos: [], comunicacao: comunicacaoIndeferimento("700.123.456-7", dia(-35)) });
// a aposentadoria concedida há quase dez anos: a revisão está perto de decair
const CONC = mes(-116, 10), DIB = mes(-117, 14), PAGO = mes(-115, 8);
const CARTA = cartaNova({ nb: "180.123.456-0", der: DIB, concessao: CONC, dib: DIB, dip: DIB, rmi: "1.744,88" });
const EXTRATO = extratoPag({ nb: "180.123.456-0", dib: DIB, dip: DIB,
  credito: { comp: DIB.slice(3), previsao: mes(-115, 5), pagoEm: PAGO, fimPeriodo: mes(-117, 28) } });

const AN = (n, nome, texto) => ({ id: `a2000000-0000-0000-0000-00000000000${n}`, cliente_id: CLI_CHEIO, caso_id: null, origem: "dossie", nome,
  caminho: `dossie/52998224725/${nome.replace(/ · /, "/")}`, tipo: "application/pdf", tamanho: 1000,
  texto, paginas: 2, paginas_imagem: [], criado_em: "2026-10-08T12:00:00Z" });
FIX.anexos = [
  AN(1, "Laudos · Laudo medico pericial.pdf", laudoPmf({ nb: NB, exame: dia(-20), did: "02/09/2025", dii: dia(-35), dcb: dia(40) })),
  AN(2, "Laudos · Laudos SABI.pdf", LAUDO_SABI_TEXTO),
  AN(3, "Meu INSS · Carta de concessao.pdf", CARTA),
  AN(4, "Meu INSS · Extrato de pagamento.pdf", EXTRATO),
  AN(5, "Processos · Beneficio por incapacidade.pdf", PA_CONCEDIDO),
  AN(6, "Processos · Pedido de prorrogacao.pdf", PA_PRORROG),
];
FIX.clientes[0] = { ...FIX.clientes[0], cpf: "52998224725", dossie: {} };
FIX.casos[0] = { ...FIX.casos[0], titulo: "Auxílio por incapacidade temporária", beneficio: "Auxílio por incapacidade temporária",
  especie: "B31", nb: NB, dcb: null, prazo: null };

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
  const escritos = [];
  let seq = 0;
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (m !== "GET") {
      const corpo = JSON.parse(rota.request().postData() || "{}");
      escritos.push({ m, u, corpo });
      // o POST devolve o que gravou, com id, como o PostgREST com return=representation
      if (m === "POST") return rota.fulfill({ status: 201, contentType: "application/json",
        body: JSON.stringify((Array.isArray(corpo) ? corpo : [corpo]).map(x => ({ id: `f2000000-0000-0000-0000-${String(++seq).padStart(12, "0")}`, ...x }))) });
      return rota.fulfill({ status: 204, body: "" });
    }
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);

  // 1 · os leitores, sobre o texto
  const pmf = await p.evaluate(t => lerLaudosTexto(t), FIX.anexos[0].texto);
  conf("o laudo da PMF traz as datas, o CID principal e o resultado", pmf.length === 1 && pmf[0].exame === dia(-20) && pmf[0].dii === dia(-35)
    && pmf[0].dcb === dia(40) && pmf[0].did === "02/09/2025" && pmf[0].cid === "M51.1" && pmf[0].resultado === "incapaz" && pmf[0].nb === NB
    && pmf[0].grau === "Total e temporária" && pmf[0].tipo === "Perícia de Prorrogação");
  const sabi = await p.evaluate(t => lerLaudosTexto(t), LAUDO_SABI_TEXTO);
  conf("o laudo do SABI lê o valor na linha de cima do rótulo e larga a página vazia", sabi.length === 1 && sabi[0].dcb === "28/07/2019"
    && sabi[0].exame === "26/03/2019" && sabi[0].did === "06/03/2019" && sabi[0].dii === "06/03/2019" && sabi[0].cid === "M545"
    && sabi[0].resultado === "incapaz" && sabi[0].tipo === "2ª perícia do benefício" && sabi[0].nb === "6001234567");
  const cn = await p.evaluate(t => lerCartaTexto(t), CARTA);
  conf("a carta de hoje traz NB, espécie, renda e as quatro datas", cn && cn.nb === NB_APOS && cn.especie === "APOSENTADORIA POR IDADE"
    && cn.rmi === "1.744,88" && cn.der === DIB && cn.concessao === CONC && cn.dib === DIB && cn.dip === DIB);
  const ca = await p.evaluate(t => lerCartaTexto(t), CARTA_ANTIGA_TEXTO);
  conf("a carta antiga é lida do parágrafo", ca && ca.nb === NB_APOS && ca.especie === "APOSENTADORIA POR IDADE" && ca.rmi === "1.181,28"
    && ca.der === "20/10/2016" && ca.concessao === "20/10/2016" && ca.dib === "17/04/2016");
  const ex = await p.evaluate(t => lerExtratoPagTexto(t), EXTRATO);
  conf("o extrato de pagamento traz o benefício e o crédito pago", ex.length === 1 && ex[0].nb === NB_APOS && ex[0].dib === DIB
    && ex[0].creditos.length === 1 && ex[0].creditos[0].pago && ex[0].creditos[0].pagoEm === PAGO && ex[0].creditos[0].comp === DIB.slice(3));
  const pr = await p.evaluate(t => lerProcessoTexto(t), PA_PRORROG);
  conf("a folha de interposição traz o pedido, a data do pedido, a situação e o NB", pr && pr.servico === "Pedido de Prorrogação de Benefício por Incapacidade"
    && pr.entrada === dia(-6) && pr.status === "Pendente" && pr.nb === NB && pr.atualizado === "");
  conf("os despachos ficam fora da leitura: nem perícia, nem exigência, nem decisão", pr.comunicacoes.length === 0
    && ["despachos", "pericias", "exigencias", "decisoes"].every(k => !(k in pr)));
  const pc = await p.evaluate(t => lerProcessoTexto(t), PA_CONCEDIDO);
  conf("a concessão lida só na folha: concluída, com a última atualização, e a DCB do despacho não entra", pc.status === "Concluída"
    && pc.atualizado === dia(-19) && pc.comunicacoes.length === 0);
  const pi = await p.evaluate(t => lerProcessoTexto(t), PA_INDEFERIDO);
  const ci = pi.comunicacoes[0] || {};
  conf("o indeferimento traz decisão, motivo, NB e cessação da comunicação", pi.comunicacoes.length === 1 && ci.contra && ci.decisao === "INDEFERIDO"
    && ci.motivo === "Não constatação da incapacidade laborativa" && ci.dcb === dia(-12) && ci.nb === NB);
  conf("a data da comunicação, que é a da emissão da cópia, não é lida", !("em" in ci) && pi.atualizado === dia(-10));
  conf("a data por extenso vira data", await p.evaluate(() => dataPorExtenso("CIDADE - SP, 11 de Março de 2026.") === "11/03/2026"));
  const dec = await p.evaluate(([c, e]) => [decadenciaDe(c, []), decadenciaDe(c, e)], [cn, ex]);
  // F235 · os 10 anos contam do dia 1º do mês seguinte ao primeiro pagamento (Lei 8.213, art. 103, I); sem o extrato, da DIP
  conf("sem o extrato, a decadência conta da DIP; com ele, do primeiro pagamento (dia 1º do mês seguinte)",
    dec[0].ate.slice(0, 7) === iso(mes(4, 1)).slice(0, 7) && /DIP|concessão/.test(dec[0].base)
    && dec[1].ate === iso(mes(6, 1)) && dec[1].base.startsWith(`primeiro pagamento em ${PAGO}`), dec);

  // 2 · o quadro na Análise de Direito
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForFunction(() => D._ficha && D._ficha.cliId && !_lendoDossie && !_lendoLeitores, null, { timeout: 10000 });
  await p.evaluate(() => { abaAtiva = 0; subCad = "direito"; repintarFicha(); });
  await p.waitForSelector(".ad-q-dossie");
  const fatos = () => p.$$eval(".ad-q-dossie li", ls => ls.map(l => ({ id: l.dataset.fato, alerta: l.classList.contains("alerta"), t: l.textContent.replace(/\s+/g, " ").trim() })));
  let q = await fatos();
  const ids = q.map(x => x.id).join(",");
  conf("o quadro traz DCB, decadência e laudo, nesta ordem, sem nada dos despachos", ids === "dcb,decadencia,laudo");
  const qd = q.find(x => x.id === "dcb") || {};
  conf("a DCB vem do laudo, com a janela da prorrogação",
    qd.t && qd.t.includes(`DCB em ${dia(40)}, fixada no laudo médico de ${dia(-20)}; o caso ainda não tem DCB`)
    && qd.t.includes(`a partir de ${dia(25)}`));
  const qc = q.find(x => x.id === "decadencia") || {};
  conf("a decadência perto do fim fica em destaque, com o primeiro pagamento", qc.alerta && /A revisão do ato de concessão pode ser pedida até/.test(qc.t)
    && qc.t.includes(`primeiro pagamento em ${PAGO}`) && /art\. 103 da Lei 8\.213\/91/.test(qc.t));
  const ql = q.find(x => x.id === "laudo") || {};
  conf("o último laudo é o da PMF, com CID, DII e DCB", ql.t && ql.t.includes(`Na perícia de ${dia(-20)}, o INSS reconheceu a incapacidade`) && ql.t.includes("CID M51.1")
    && ql.t.includes(`com fim marcado para ${dia(40)}`) && /Laudo da Perícia Médica Federal/.test(ql.t));
  conf("cada fato abre o documento de origem", (await p.$$(".ad-q-dossie li .dossie-orig .adr-link")).length === 3);
  conf("nada do dossiê entrou no caso sem o clique", !escritos.some(e => /\/rest\/v1\/(casos|eventos)/.test(e.u)));

  // 3 · os cliques gravam no caso, com o andamento que diz a origem
  escritos.length = 0;
  await p.click('.ad-q-dossie li[data-fato="dcb"] button.tl-bt');
  await p.waitForTimeout(400);
  const pd = escritos.find(e => e.m === "PATCH" && /\/rest\/v1\/casos\?id=eq\./.test(e.u));
  conf("a DCB vai ao caso e rearma o lembrete da prorrogação", pd && pd.corpo.dcb === iso(dia(40)) && pd.corpo.dcb_prorrogar_em === iso(dia(25)));
  conf("o andamento diz de onde a DCB veio", escritos.some(e => e.m === "POST" && /andamentos/.test(e.u) && /gravada no caso, lida no laudo médico de .* do dossiê/.test(e.corpo.texto || "")));
  await p.evaluate(() => { abaAtiva = 0; subCad = "direito"; repintarFicha(); });
  await p.waitForSelector(".ad-q-dossie");
  conf("gravada, a DCB sai do quadro", !(await fatos()).some(x => x.id === "dcb"));

  // 4 · chega a cópia do indeferimento: abre o recurso, contado da conclusão do
  // pedido e não da data de emissão da cópia, e a DCB que passou não volta
  await p.evaluate(a => { D.anexos.push(a); abaAtiva = 0; subCad = "direito"; repintarFicha(); },
    AN(7, "Processos · Prorrogacao indeferida.pdf", PA_INDEFERIDO));
  await p.waitForSelector('.ad-q-dossie li[data-fato="recurso"]');
  q = await fatos();
  const fatalRec = await p.evaluate(d => contarPrazo(d, PRAZOS_CATALOGO.find(x => x.id === "crps")), iso(dia(-10)));
  const qr = q.find(x => x.id === "recurso") || {};
  conf("o recurso vem primeiro, com o pedido, a data, a conclusão e o prazo", q[0].id === "recurso" && qr.alerta
    && qr.t.startsWith(`Recurso ao CRPS até ${fatalRec.split("-").reverse().join("/")} (`)
    && qr.t.includes(`Pedido de Prorrogação de Benefício por Incapacidade de ${dia(-30)} do NB 700.123.456-7: indeferido, não constatação da incapacidade laborativa`)
    && qr.t.includes(`contam da conclusão do pedido (${dia(-10)})`));
  conf("a DCB da decisão mais nova já passou e não é oferecida", !q.some(x => x.id === "dcb"));
  escritos.length = 0;
  await p.click('.ad-q-dossie li[data-fato="recurso"] button.tl-bt');
  await p.waitForTimeout(400);
  const pr2 = escritos.find(e => e.m === "PATCH" && /\/rest\/v1\/casos\?id=eq\./.test(e.u));
  conf("o prazo do recurso vai ao caso", pr2 && pr2.corpo.prazo === fatalRec && pr2.corpo.mover_para === "🗓 Tarefas com Prazo");
  conf("o andamento do prazo diz de que é e de onde veio", escritos.some(e => e.m === "POST" && /andamentos/.test(e.u)
    && /^⏰ Prazo fatal .*: recurso ao CRPS contra a decisão do pedido concluído em .*, lido da cópia do processo do dossiê\.$/.test(e.corpo.texto || "")));

  // 5 · a cópia sem a última atualização: o fato fica, sem prazo contado
  const semData = await p.evaluate(([t, casoId]) => {
    const x = lerProcessoTexto(t), f = { processos: [{ ...x, anexo: { id: "z" } }], laudos: [], cartas: [], extratos: [] };
    return itensDaOnda2(f, [{ ...D.casoPorId.get(casoId), prazo: null }]).find(i => i.id === "recurso");
  }, [PA_SEM_DATA, CASO1]);
  conf("sem a data da conclusão, o recurso pede a ciência e não conta prazo", semData && !semData.alerta && !semData.acao
    && /: indeferido, não constatação da incapacidade laborativa\. A cópia não traz a data da conclusão do pedido: confira no Meu INSS quando a decisão foi vista/.test(semData.texto));

  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
