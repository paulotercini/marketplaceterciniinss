// F191 · o conteúdo do movimento: a intimação, a expedição e a publicação no
// DJ apontam para o ato que comunicam (o mais recente do mesmo processo), a
// linha "Conteúdo" no cartão, a prévia ao passar o mouse, a leitura inteira
// sem cabeçalho nem rodapé, o tipo citado em "Publicado Despacho em", o ato
// sem texto, o documento sem andamento do mesmo dia, o e-SAJ com o teor no
// próprio movimento e a separação entre processos do mesmo caso. Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const FOTO = process.env.CONTEUDO_FOTO || "";

const NUM1 = "5009999-11.2026.4.03.6314", DIG1 = NUM1.replace(/\D/g, "");
const NUM2 = "1000123-45.2026.8.26.0132", DIG2 = NUM2.replace(/\D/g, "");
const CAB = `PODER JUDICIÁRIO\nJUIZADO ESPECIAL FEDERAL DA 3ª REGIÃO\nPROCEDIMENTO DO JUIZADO ESPECIAL CÍVEL (436) Nº ${NUM1}\n`
  + `AUTOR: MARIA FICTÍCIA DE TESTE\nAdvogado do(a) AUTOR: ADVOGADO FICTÍCIO - SP000000\nREU: INSTITUTO NACIONAL DO SEGURO SOCIAL - INSS\n`;
const ROD = `\nCatanduva, data da assinatura eletrônica.\n(assinado eletronicamente)\nJUIZ FEDERAL`;
const SENTENCA = CAB + "SENTENÇA TIPO A\n"
  + "Trata-se de ação em que a parte autora pede o restabelecimento do auxílio por incapacidade temporária. ".repeat(6)
  + "\nO laudo pericial concluiu pela incapacidade total e temporária desde a cessação administrativa. ".repeat(4)
  + "\nAnte o exposto, JULGO PARCIALMENTE PROCEDENTE o pedido para condenar o INSS a restabelecer o benefício desde a cessação, mantendo-o por 120 dias a contar desta sentença.\nSem custas e honorários nesta instância." + ROD;
// o despacho com o texto quebrado de origem (UTF-8 lido como Latin-1), como veio de um PDF real
const DESPACHO = CAB.replace("CÍVEL", "CÃ\u008dVEL") + "D E S P A C H O\nIntimem-se as partes para manifestaÃ§Ã£o acerca do laudo pericial anexado aos autos.\nPrazo: 10 (dez) dias." + ROD;
const DECISAO = CAB + "D E C I S Ã O\nDefiro a produção de prova testemunhal e designo audiência para 20/11/2026, às 14h.\nIntimem-se." + ROD;
const DESPACHO2 = CAB + "DESPACHO\nNotifique-se a autoridade impetrada para prestar informações no prazo de 10 (dez) dias." + ROD;
const DECISAO2 = CAB + "D E C I S Ã O\nDefiro o pedido de tutela de urgência para restabelecer o benefício em 15 dias." + ROD;

const AND = (i, texto, iso, extra) => ({ id: "c1910000-0000-0000-0000-0000000000" + String(i).padStart(2, "0"), caso_id: CASO1, origem: "pje", texto,
  origem_id: `hist:x:${iso}:${i}`, criado_em: iso + ":00-03:00", autor_id: null, andamentos_lidos: [], excluir: false, publico: false, ...extra });
const pje = (txt, dt, hora) => `PJe (1º grau): ${txt} — em ${dt.split("-").reverse().join(".")} ${hora} — PJEC ${NUM1}`;
const esaj = (txt, dt) => `e-SAJ TJSP (1º grau): ${txt} — em ${dt.split("-").reverse().join(".")} 00:00 — Procedimento Comum Cível ${NUM2}`;
const ANX = (i, nome, texto, criado, andId, dig) => ({ id: "a1910000-0000-0000-0000-0000000000" + String(i).padStart(2, "0"), cliente_id: CLI_CHEIO, caso_id: CASO1,
  andamento_id: andId || null, nome, caminho: `pje/${dig || DIG1}/9000${i}`, tipo: "text/plain", tamanho: 1000, origem: "pje", texto, criado_em: criado });
const ID = i => "c1910000-0000-0000-0000-0000000000" + String(i).padStart(2, "0");

const DADOS = { ...FIX,
  andamentos: [
    AND(1, pje("Julgado procedente em parte o pedido · 📎 Sentença tipo A", "2026-10-08", "13:47"), "2026-10-08T13:47"),
    AND(2, pje("Expedida/certificada a intimação eletrônica", "2026-10-08", "14:23"), "2026-10-08T14:23"),
    AND(3, pje("Expedição de Outros documentos.", "2026-10-08", "14:23"), "2026-10-08T14:23"),
    AND(4, pje("Disponibilizado no DJ Eletrônico em 09/10/2026", "2026-10-10", "01:39"), "2026-10-10T01:39"),
    AND(5, pje("Disponibilizado no DJ Eletrônico em 24/09/2026", "2026-09-25", "01:40"), "2026-09-25T01:40"),
    AND(6, pje("Publicado Despacho em 25/09/2026.", "2026-09-25", "01:41"), "2026-09-25T01:41"),
    AND(7, pje("Juntada de ato ordinatório · 📎 Ato Ordinatório", "2026-09-23", "15:33"), "2026-09-23T15:33"),
    AND(8, pje("Expedida/certificada a intimação eletrônica", "2026-09-23", "15:34"), "2026-09-23T15:34"),
    AND(9, pje("Proferido despacho de mero expediente", "2026-10-01", "19:58"), "2026-10-01T19:58"),
    AND(10, pje("Expedida/certificada a intimação eletrônica", "2026-10-01", "20:12"), "2026-10-01T20:12"),
    AND(11, esaj("Proferido Despacho de Mero Expediente — Vistos. Manifeste-se a parte autora sobre a contestação, no prazo de 15 (quinze) dias. Int.", "2026-10-03"), "2026-10-03T00:00"),
    AND(12, esaj("Certidão de Publicação Expedida — Relação: 0456/2026 Data da Disponibilização: 06/10/2026 Data da Publicação: 07/10/2026 Número do Diário: 4321", "2026-10-06"), "2026-10-06T00:00"),
    AND(13, esaj("Remetido ao DJE — Relação: 0456/2026 Teor do ato: Vistos. Manifeste-se a parte autora sobre a contestação. Advogados(s): Advogado Fictício (OAB 000000/SP)", "2026-10-05"), "2026-10-05T00:00"),
  ],
  anexos: [
    ANX(1, "Sentença tipo A", SENTENCA, "2026-10-08T13:47:00-03:00", ID(1)),
    ANX(2, "Despacho", DESPACHO, "2026-09-22T12:00:00-03:00"),
    ANX(3, "Decisão", DECISAO, "2026-09-24T12:00:00-03:00"),
    ANX(4, "Despacho", DESPACHO2, "2026-10-01T12:00:00-03:00"),
    ANX(5, "Decisão", DECISAO2, "2026-10-04T12:00:00-03:00"),
  ],
  casos: [{ ...FIX.casos[0], fase: "judicial", especie: "B31", processo: NUM1, etapa: null }],
};

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
  const rotear = rota => {
    const q = rota.request(), u = q.url(), m = q.method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") { escritos.push({ t, m }); return rota.fulfill({ status: 204, body: "" }); }
    let corpo = DADOS[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  };
  const preparar = async c => {
    await c.addInitScript(([u, ss]) => {
      localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
      localStorage.setItem("crm_sessao", JSON.stringify(ss));
      localStorage.setItem("crm_tema", "v10");
    }, [SUPA, SESSAO]);
    await c.route(SUPA + "/**", rotear);
    await c.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  };
  await ctx.route(SUPA + "/**", rotear);
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await p.evaluate(([cli, id]) => { abrirFicha(cli); casoSel = id; abaAtiva = 2; subAba = "tudo"; filtroTudo = "tudo"; repintarFicha(); }, [CLI_CHEIO, CASO1]);
  await p.waitForFunction(() => document.querySelectorAll('.painel[data-p="2"] li.tl-oficial').length >= 10, null, { timeout: 10000 });

  // a linha "Conteúdo" do cartão de cada movimento, achado pela hora e pelo texto
  const linha = (hora, rx) => p.evaluate(([h, src]) => {
    const li = [...document.querySelectorAll('.painel[data-p="2"] li.tl-oficial')]
      .find(l => ((l.querySelector(".tl-hora") || {}).textContent || "").includes(h) && new RegExp(src).test((l.querySelector(".tl-corpo") || {}).textContent || ""));
    if (!li) return { achou: false };
    const c = li.querySelector(".tl-ato");
    return { achou: true, txt: c ? c.textContent.replace(/\s+/g, " ").trim() : null, botao: !!c && c.tagName === "BUTTON" };
  }, [hora, rx.source]);

  // 1 · a intimação, a expedição e a publicação apontam para a sentença do dia
  const l2 = await linha("08.10 · 14:23", /intimação eletrônica/), l3 = await linha("08.10 · 14:23", /Expedição de Outros documentos/);
  const l4 = await linha("10.10 · 01:39", /Disponibilizado/);
  conf("a intimação mostra a sentença que comunica", l2.botao && /^Conteúdo: Sentença de 08\.10 ler$/.test(l2.txt));
  conf("a expedição de outros documentos também", l3.botao && /Sentença de 08\.10/.test(l3.txt));
  conf("a disponibilização no DJ, no dia seguinte, também", l4.botao && /Sentença de 08\.10/.test(l4.txt));
  const l1 = await linha("08.10 · 13:47", /Julgado procedente/);
  conf("o próprio ato não ganha a linha (o documento já está no cartão)", l1.achou && l1.txt === null);
  const disp = await p.evaluate(() => (document.querySelector('.painel[data-p="2"] .tl-disp') || {}).textContent || "");
  conf("o trecho decisivo do cartão sai sem o rodapé da assinatura", /JULGO PARCIALMENTE PROCEDENTE/.test(disp) && !/assinatura eletr|JUIZ FEDERAL/.test(disp));

  // 2 · sem o tipo, o ato mais novo; com "Publicado Despacho em", o despacho
  const l5 = await linha("25.09 · 01:40", /Disponibilizado/), l6 = await linha("25.09 · 01:41", /Publicado Despacho/);
  conf("a disponibilização aponta a decisão mais nova", l5.botao && /Decisão de 24\.09/.test(l5.txt));
  conf("\"Publicado Despacho em\" aponta o despacho, e não a decisão", l6.botao && /Despacho de 22\.09/.test(l6.txt));

  // 3 · o ato ordinatório sem texto: diz qual é, e não pula para o despacho de antes
  const l8 = await linha("23.09 · 15:34", /intimação eletrônica/);
  conf("o ato ordinatório que não veio fica dito, sem botão", !l8.botao && /Ato ordinatório de 23\.09, sem o texto no CRM/.test(l8.txt || ""));

  // 4 · o despacho do dia sem andamento traz o texto do ato do mesmo dia
  const l10 = await linha("01.10 · 20:12", /intimação eletrônica/);
  conf("o documento do mesmo dia, sem andamento, dá o texto ao despacho", l10.botao && /Despacho de 01\.10/.test(l10.txt));

  // 5 · o e-SAJ: a certidão de publicação aponta o despacho do mesmo processo;
  // o "Remetido ao DJE" já traz o teor e não precisa de nada
  const l12 = await linha("06.10", /Certidão de Publicação/), l13 = await linha("05.10", /Remetido ao DJE/);
  conf("a certidão do e-SAJ aponta o despacho do e-SAJ, e não a decisão do PJe de 04.10", l12.botao && /Despacho de 03\.10/.test(l12.txt));
  conf("o movimento com o teor do ato não ganha a linha", l13.achou && l13.txt === null);

  // 6 · a prévia ao passar o mouse: o dispositivo da sentença, sem cabeçalho nem rodapé
  const chip2 = await p.evaluateHandle(() => [...document.querySelectorAll('.painel[data-p="2"] li.tl-oficial')]
    .find(l => /08\.10 · 14:23/.test(l.querySelector(".tl-hora").textContent) && /intimação/.test(l.querySelector(".tl-corpo").textContent)).querySelector(".tl-ato"));
  await chip2.asElement().scrollIntoViewIfNeeded();
  await chip2.asElement().hover();
  await p.waitForSelector("#pop-ato:not([hidden])", { timeout: 3000 }).catch(() => null);
  const pop = await p.evaluate(() => { const e = document.getElementById("pop-ato"); return e && !e.hidden ? { t: e.textContent, r: e.getBoundingClientRect().toJSON() } : null; });
  conf("passar o mouse mostra a prévia", !!pop);
  conf("a prévia da sentença longa é o dispositivo", pop && /SENTENÇA · 08\.10\.2026|Sentença · 08\.10\.2026/i.test(pop.t) && /\[…\] Ante o exposto, JULGO PARCIALMENTE PROCEDENTE/.test(pop.t));
  conf("a prévia não traz cabeçalho nem rodapé", pop && !/PODER JUDICI|AUTOR:|assinatura eletr/i.test(pop.t));
  conf("a prévia fica dentro da tela", pop && pop.r.left >= 0 && pop.r.right <= 1440 && pop.r.bottom <= 1000);
  if (FOTO) { await p.waitForTimeout(400); await p.screenshot({ path: path.join(FOTO, "f191-previa.png") }); }
  await p.mouse.move(5, 5);
  await p.waitForTimeout(150);
  conf("tirar o mouse esconde a prévia", await p.evaluate(() => { const e = document.getElementById("pop-ato"); return !e || e.hidden; }));

  // 7 · clicar abre a leitura inteira: o miolo, com o acento consertado
  await p.evaluate(() => [...document.querySelectorAll('.painel[data-p="2"] li.tl-oficial')]
    .find(l => /25\.09 · 01:41/.test(l.querySelector(".tl-hora").textContent)).querySelector(".tl-ato").click());
  await p.waitForSelector(".leitura-ato");
  const lei = await p.evaluate(() => ({ h: document.querySelector(".leitura-ato h3").textContent, t: document.querySelector(".leitura-txt").textContent,
    bts: [...document.querySelectorAll(".leitura-bts button")].map(b => [...b.childNodes].filter(n => !(n.classList && n.classList.contains("sr-only"))).map(n => n.textContent).join("").trim()), w: document.querySelector(".modal-cx").getBoundingClientRect().width }));
  conf("a leitura tem o tipo e a data do ato", lei.h === "Despacho · 22.09.2026");
  conf("a leitura é só o miolo, com o acento consertado", lei.t === "Intimem-se as partes para manifestação acerca do laudo pericial anexado aos autos.\nPrazo: 10 (dez) dias.");
  conf("a leitura oferece copiar, abrir o original e ler com o Claude", lei.bts.join("|") === "Copiar|Original|Claude");
  conf("a caixa de leitura é larga", lei.w > 700);
  if (FOTO) { await p.waitForTimeout(400); await p.screenshot({ path: path.join(FOTO, "f191-leitura.png") }); }
  await p.evaluate(() => fecharCaixa());

  // 8 · o nome do documento no cartão também lê
  await p.evaluate(() => document.querySelector('.painel[data-p="2"] .tl-doc-ler').click());
  await p.waitForSelector(".leitura-ato");
  const sent = await p.evaluate(() => document.querySelector(".leitura-txt").textContent);
  conf("o nome da sentença abre a leitura do miolo", /^Trata-se de ação/.test(sent) && /JULGO PARCIALMENTE PROCEDENTE/.test(sent) && !/AUTOR:|JUIZ FEDERAL/.test(sent));
  await p.evaluate(() => fecharCaixa());

  // 9 · o teor do e-SAJ, sem a classe e o número no fim
  await p.evaluate(() => [...document.querySelectorAll('.painel[data-p="2"] li.tl-oficial')]
    .find(l => /Certidão de Publicação/.test(l.querySelector(".tl-corpo").textContent)).querySelector(".tl-ato").click());
  await p.waitForSelector(".leitura-ato");
  const tesaj = await p.evaluate(() => document.querySelector(".leitura-txt").textContent);
  conf("o despacho do e-SAJ lê o teor do movimento", tesaj === "Vistos. Manifeste-se a parte autora sobre a contestação, no prazo de 15 (quinze) dias. Int.");
  conf("sem documento, a leitura não oferece abrir o original", !(await p.evaluate(() => [...document.querySelectorAll(".leitura-bts button")].some(b => /original/.test(b.textContent)))));
  await p.evaluate(() => fecharCaixa());
  conf("nada é gravado", !escritos.some(e => e.m !== "GET" && /anexos|andamentos/.test(e.t || "")));

  // 10 · no celular: sem prévia de mouse, o toque abre a leitura e a linha cabe no cartão
  const cel = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await preparar(cel);
  const pc = await cel.newPage();
  pc.on("pageerror", e => erros.push("celular: " + e.message));
  await pc.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await pc.waitForSelector("#app.logado");
  await pc.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await pc.evaluate(([cli, id]) => { abrirFicha(cli); casoSel = id; abaAtiva = 2; subAba = "tudo"; filtroTudo = "tudo"; repintarFicha(); }, [CLI_CHEIO, CASO1]);
  await pc.waitForSelector(".tl-ato", { timeout: 10000 });
  const medida = await pc.evaluate(() => {
    const c = document.querySelector("button.tl-ato"), li = c.closest("li");
    return { hover: matchMedia("(hover:hover) and (pointer:fine)").matches, dentro: c.getBoundingClientRect().right <= li.getBoundingClientRect().right + 0.5,
             rola: document.documentElement.scrollWidth > innerWidth + 1, alto: c.getBoundingClientRect().height };
  });
  conf("no celular não há prévia de mouse", medida.hover === false);
  conf("a linha cabe no cartão, sem rolagem lateral, com área de toque de 30px ou mais", medida.dentro && !medida.rola && medida.alto >= 30);
  await pc.tap("button.tl-ato");
  await pc.waitForSelector(".leitura-ato", { timeout: 3000 }).catch(() => null);
  conf("o toque abre a leitura", await pc.evaluate(() => !!document.querySelector(".leitura-ato") && (!document.getElementById("pop-ato") || document.getElementById("pop-ato").hidden)));
  await pc.waitForTimeout(400);
  const cel2 = await pc.evaluate(() => {
    const b = document.querySelector(".leitura-bts button"), r = b.getBoundingClientRect();
    const em = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const t = document.querySelector(".leitura-txt").getBoundingClientRect();
    return { livre: !!em && b.contains(em), dentro: r.bottom <= innerHeight, largura: t.width };
  });
  conf("no celular, nada cobre os botões da leitura", cel2.livre && cel2.dentro);
  conf("no celular, o texto usa a largura da caixa", cel2.largura >= 320);
  if (FOTO) await pc.screenshot({ path: path.join(FOTO, "f191-celular.png") });
  await nav.close(); s.close();

  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de página: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
