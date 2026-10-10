// Integração, etapa 3 · faixa do caso, fontes como filtro, régua de botões e
// títulos, honorário nos prazos do caso, triagem reaberta pela Análise.
// Fixture da F190 (dados fictícios):, os filtros do Caso completo, a rotina
// dobrada, o documento no cartão e a seleção de documentos para o Claude.
// Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const caso = extra => ({ ...FIX.casos[0], fase: "judicial", especie: "B42", processo: "0000003-33.2023.8.26.0999", etapa: null, ...extra });

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 1100 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  const escritos = [];
  const hj = new Date().toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });
  const br = hj.split("-").reverse().join(".");
  const AND = (i, origem, texto, extra) => ({ id: "f0000000-0000-0000-0000-0000000000" + String(i).padStart(2, "0"), caso_id: CASO1, origem, texto,
    criado_em: hj + "T12:00:00Z", autor_id: origem === "app" ? FIX.colaboradores[0].id : null, andamentos_lidos: [], excluir: false, publico: false, ...extra });
  const NUM = "5000850-63.2023.4.03.6314";
  const DADOS = { ...FIX,
    andamentos: [
      AND(1, "app", "Liguei para a cliente e pedi a autodeclaração assinada."),
      AND(2, "pat", "INSS · Movimentação no protocolo 1234567890 — situação: Em exigência (portal atualizado em " + hj + "T10:00:00).", { origem_id: "atualizacao:1234567890:x" }),
      AND(3, "pje", `PJe (1º grau): Julgado procedente o pedido — em ${br} 14:23 — PJEC ${NUM}`, { origem_id: `mov:${NUM}:${hj}T14:23` }),
      AND(4, "pje", `PJe (1º grau): Expedição de Outros documentos. — em ${br} 15:00 — PJEC ${NUM}`, { origem_id: `mov:${NUM}:${hj}T15:00` }),
      AND(5, "pje", `PJe (1º grau): Juntada de Petição de petição — em ${br} 15:10 — PJEC ${NUM}`, { origem_id: `mov:${NUM}:${hj}T15:10` }),
      AND(6, "pje", `PJe (1º grau): Conclusos para despacho — em ${br} 15:20 — PJEC ${NUM}`, { origem_id: `mov:${NUM}:${hj}T15:20` }),
      AND(7, "app", "Tarefa: conferir a exigência.", { responde_a: "f0000000-0000-0000-0000-000000000002" }),
      AND(8, "crps", "🖥 CRPS · 01/10/2026 — 📥 Protocolo recebido no INSS", { origem_id: "44233139765202537|2026-10-01T10" }),
      AND(9, "pje", `PJe (1º grau): Intimação eletrônica — prazo de 15 dias — em ${br} 16:00 — PJEC ${NUM}`, { origem_id: `mov:${NUM}:${hj}T16:00` }),
      AND(10, "pje", `PJe (1º grau): Expedição de Outros documentos. — em 02.10.2026 09:00 — PJEC ${NUM}`, { origem_id: `mov:${NUM}:2026-10-02T09:00`, criado_em: "2026-10-02T12:00:00Z" }),
    ],
    anexos: [{ id: "a0000000-0000-0000-0000-000000000001", cliente_id: CLI_CHEIO, caso_id: CASO1, andamento_id: "f0000000-0000-0000-0000-000000000003",
      nome: "Sentença", caminho: "x/sentenca.pdf", tipo: "application/pdf", tamanho: 1000, origem: "pje", paginas: 6, paginas_imagem: [],
      texto: "Relatório dispensado. Fundamentação. Ante o exposto, JULGO PROCEDENTE o pedido para condenar o INSS a conceder o benefício.", criado_em: hj + "T12:00:00Z" },
      { id: "a0000000-0000-0000-0000-000000000002", cliente_id: CLI_CHEIO, caso_id: CASO1, andamento_id: null,
      nome: "Carta de exigência", caminho: "x/exig.pdf", tipo: "application/pdf", tamanho: 1000, origem: "pat", texto: null, criado_em: hj + "T11:00:00Z" }],
    eventos: [{ id: "e1000000-0000-0000-0000-000000000001", caso_id: CASO1, cliente_id: CLI_CHEIO, tipo: "Perícia médica", status: "agendada", data_hora: hj + "T13:00:00Z", local: "JEF" }],
    andamento_tarefas: [{ id: "t0000000-0000-0000-0000-000000000001".replace(/^t/, "c"), andamento_id: "f0000000-0000-0000-0000-000000000007", caso_id: CASO1,
      colaborador_id: FIX.colaboradores[0].id, lembrar_em: hj, concluida_em: null, papel: "faz", natureza: "compromisso" }],
    casos: [caso({ processo: NUM, crps_nups: ["44233139765202537"],
      crps: [{ nup: "44233139765202537", status: "Julgado", eventos: [{ data: "01/10/2026", resumo: "Acórdão: recurso conhecido\ne provido em parte", tipo: "decisao",
        arquivos: [{ nome: "Acórdão 1.pdf", storage: "crps/fic'tício<x>/acordao.pdf" }] }] }], protocolos: ["1234567890"], processo_link: "https://atendimento.inss.gov.br/tarefas/detalhar_tarefa/1234567890", pje_links: { "1º grau": "https://pje1g.trf3.jus.br/x1" } })] };
  await ctx.route(SUPA + "/**", rota => {
    const q = rota.request(), u = q.url(), m = q.method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") { escritos.push({ t, m, corpo: q.postData() }); return rota.fulfill({ status: 204, body: "" }); }
    let corpo = DADOS[t] || [];
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
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.evaluate(([id, cli]) => { casoSel = id;
    const d = new Date(); d.setDate(d.getDate() + 20); const venc = d.toLocaleDateString("sv");
    D.pagamentos = [...(D.pagamentos || []), { id: "pg-1", cliente_id: cli, caso_id: id, status: "aberto", valor: 1500, vencimento: venc, descricao: "1ª parcela", conferencias: [] }];
  }, [CASO1, CLI_CHEIO]);
  const ir = js => p.evaluate(js + ";repintarFicha()").then(() => p.waitForTimeout(300));

  // faixa do caso nas três partes, levando ao caso
  for (const [n, js, sel] of [["Análise", "abaAtiva=0;subCad='direito'", '.painel[data-p="0"] .faixa-caso'], ["Perícias", "abaAtiva=3", '.painel[data-p="3"] .faixa-caso'], ["Honorários", "abaAtiva=4", '.painel[data-p="4"] .faixa-caso']]) {
    await ir(js);
    const f = await p.evaluate(sel => { const e = document.querySelector(sel); return e ? e.textContent.replace(/\s+/g, " ") : ""; }, sel);
    conf(`${n}: a faixa diz de que caso se trata (${f.trim().slice(0, 60)})`, /B42/.test(f) && /Judicial/.test(f));
  }
  await p.evaluate(() => document.querySelector('.painel[data-p="4"] .fc-caso').click()); await p.waitForTimeout(300);
  conf("clicar na faixa abre o caso", await p.evaluate(id => abaAtiva === 2 && casoSel === id, CASO1));

  // Análise: pendência vira link; triagem reaberta
  await ir("abaAtiva=0;subCad='direito'");
  conf("a pendência leva à Identificação", await p.evaluate(() => { const b = [...document.querySelectorAll('.painel[data-p="0"] .adr-pend .adr-link')].find(x => /Identificação/.test(x.textContent)); if (!b) return false; b.click(); return subCad === "identificacao"; }));
  await ir("subCad='direito'");
  const tri = await p.evaluate(() => { const b = [...document.querySelectorAll('.painel[data-p="0"] .ad-q-tri .adr-link')].find(x => /Responder/.test(x.textContent)); if (!b) return null; b.click(); return subCad; });
  await p.waitForTimeout(300);
  conf("Responder na triagem reabre a Triagem para quem já tem caso", tri === "triagem" && await p.evaluate(() => [...document.querySelectorAll(".sub-menu button")].some(b => /Triagem/.test(b.textContent) && b.classList.contains("on"))));
  if (process.env.SHOTS) await p.screenshot({ path: path.join(process.env.SHOTS, "triagem-reaberta.png"), fullPage: true });

  // Judicial: as fontes são filtro, com o "fase encerrada" na mesma linha
  await ir("abaAtiva=2;subAba='cnj'");
  const fo = await p.evaluate(() => { const m = document.querySelector('.painel[data-p="2"] .sub-menu.fontes'); const b = m && m.querySelector("button");
    return m ? { raio: getComputedStyle(b).borderRadius, antes: getComputedStyle(m, "::before").content, fase: !!m.querySelector(".fontes-fim"), emoji: /[⚡⚖📂]/u.test(m.textContent),
      barra: [...document.querySelectorAll('.painel[data-p="2"] .form-linha')].some(f => /fase encerrada/.test(f.textContent) && !f.closest(".sub-menu")) } : null; });
  conf("as fontes do Judicial são filtro (pílula, sem o rótulo FONTE, sem emoji)", fo && fo.raio === "999px" && /none|normal/.test(fo.antes) && !fo.emoji);
  conf("o fase encerrada mora na linha das fontes, sem linha própria", fo && fo.fase && !fo.barra);

  // o honorário em aberto entra nos prazos do caso
  conf("o vencimento do honorário entra em Prazos e compromissos do caso", /Honorários/.test(await p.evaluate(() => (document.querySelector(".faixa-prazos") || {}).textContent || "")));

  // régua de botões: seção 40px
  await ir("abaAtiva=4");
  const alt = await p.evaluate(() => ({ adr: Math.round(document.querySelector('.painel[data-p="4"] .adr-bt').getBoundingClientRect().height),
    prox: document.querySelector(".hon-t-prox") ? "âmbar" : "neutro" }));
  conf(`botão de seção com 40px (${alt.adr})`, alt.adr === 40);
  conf("o próximo vencimento fica âmbar quando há vencimento", alt.prox === "âmbar");

  // celular: nenhuma parte rola de lado
  await p.setViewportSize({ width: 390, height: 844 });
  for (const [n, js] of [["Análise", "abaAtiva=0;subCad='direito'"], ["Judicial", "abaAtiva=2;subAba='cnj'"], ["Perícias", "abaAtiva=3"], ["Honorários", "abaAtiva=4"]]) {
    await ir(js);
    const sobra = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    conf(`${n} no celular sem rolagem lateral (${sobra})`, sobra <= 0);
    if (process.env.SHOTS) await p.screenshot({ path: path.join(process.env.SHOTS, `cel-${n}.png`), fullPage: true });
  }
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de página:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length + erros.length;
  console.log(`${ok.length - ok.filter(x => !x[1]).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
