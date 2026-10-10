// F190 · o cartão do andamento oficial, os filtros do Caso completo, a rotina
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
    ],
    anexos: [{ id: "a0000000-0000-0000-0000-000000000001", cliente_id: CLI_CHEIO, caso_id: CASO1, andamento_id: "f0000000-0000-0000-0000-000000000003",
      nome: "Sentença", caminho: "x/sentenca.pdf", tipo: "application/pdf", tamanho: 1000, origem: "pje", paginas: 6, paginas_imagem: [],
      texto: "Relatório dispensado. Fundamentação. Ante o exposto, JULGO PROCEDENTE o pedido para condenar o INSS a conceder o benefício.", criado_em: hj + "T12:00:00Z" },
      { id: "a0000000-0000-0000-0000-000000000002", cliente_id: CLI_CHEIO, caso_id: CASO1, andamento_id: null,
      nome: "Carta de exigência", caminho: "x/exig.pdf", tipo: "application/pdf", tamanho: 1000, origem: "pat", texto: null, criado_em: hj + "T11:00:00Z" }],
    andamento_tarefas: [{ id: "t0000000-0000-0000-0000-000000000001".replace(/^t/, "c"), andamento_id: "f0000000-0000-0000-0000-000000000007", caso_id: CASO1,
      colaborador_id: FIX.colaboradores[0].id, lembrar_em: hj, concluida_em: null, papel: "faz", natureza: "compromisso" }],
    casos: [caso({ processo: NUM, crps_nups: ["44233139765202537"], protocolos: ["1234567890"], processo_link: "https://atendimento.inss.gov.br/tarefas/detalhar_tarefa/1234567890", pje_links: { "1º grau": "https://pje1g.trf3.jus.br/x1" } })] };
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
  await p.evaluate(([cli, id]) => { abrirFicha(cli); casoSel = id; abaAtiva = 2; subAba = "tudo"; repintarFicha(); }, [CLI_CHEIO, CASO1]);
  await p.waitForSelector(".linha-caso");
  const tit = () => p.evaluate(() => document.querySelector(".tr-cab h3").textContent);

  const abrirsJanela = [];
  await p.exposeFunction("__abriu", u => abrirsJanela.push(u));
  await p.evaluate(() => { window.open = (u) => { window.__abriu(String(u)); return null; }; });
  const sel = q => p.evaluate(q2 => document.querySelectorAll(q2).length, q);
  const txt = q => p.evaluate(q2 => (document.querySelector(q2) || {}).textContent || "", q);
  await p.evaluate(() => { subAba = "tudo"; filtroTudo = "tudo"; repintarFicha(); }); await p.waitForTimeout(300);
  const P = '.painel[data-p="2"] ';
  // cartão oficial
  const sent = P + 'li.tl-oficial:has(.tl-doc)';
  conf("a sentença é cartão oficial com o documento dentro", await sel(sent) === 1);
  conf("o documento tem Abrir e Ler com Claude", /Abrir/.test(await txt(sent + " .tl-doc")) && /Ler com Claude/.test(await txt(sent + " .tl-doc")));
  conf("o trecho decisivo aparece abaixo do documento", /JULGO PROCEDENTE/.test(await txt(sent + " .tl-disp")));
  conf("o botão principal é Criar tarefa ou prazo", /Criar tarefa ou prazo/.test(await txt(sent + " .tl-barra .tl-bt.forte")));
  conf("o cartão abre no PJe", await p.evaluate(q => { const a = document.querySelector(q + " .tl-link"); return !!a && /pje1g/.test(a.href) && a.target === "_blank"; }, sent));
  conf("a sentença do JEF sugere o prazo do recurso inominado", /Prazo sugerido/.test(await txt(sent + " .tl-prazo-sug")) && /vence/.test(await txt(sent + " .tl-prazo-sug")));
  conf("o não lido aparece no cabeçalho", /não lido/.test(await txt(sent + " .tl-novo")));
  // ⋯
  const mais = await p.evaluate(q => [...document.querySelectorAll(q + " .tl-mais-it")].map(b => b.textContent.trim()), sent);
  conf("o ⋯ do PJe tem copiar e não é deste caso", mais.includes("Copiar o texto") && mais.includes("Não é deste caso"));
  const maisInss = await p.evaluate(q => [...document.querySelectorAll(q + "li.tl-oficial")].filter(l => /Situação: Em exigência/.test(l.textContent)).map(l => [...l.querySelectorAll(".tl-mais-it")].map(b => b.textContent.trim()))[0], P);
  conf("o ⋯ do INSS não oferece 'não é deste caso'", maisInss && !maisInss.includes("Não é deste caso"));
  // o que já se fez
  conf("o movimento do INSS mostra a tarefa criada", await p.evaluate(q => [...document.querySelectorAll(q + "li.tl-oficial")].some(l => /Em exigência/.test(l.textContent) && /Tarefa · Paulo/.test(l.textContent)), P));
  conf("o INSS abre no PAT", await p.evaluate(q => [...document.querySelectorAll(q + "li.tl-oficial")].some(l => /Em exigência/.test(l.textContent) && /detalhar_tarefa\/1234567890/.test((l.querySelector(".tl-link") || {}).href || "")), P));
  conf("o CRPS abre no e-SISREC", await p.evaluate(q => [...document.querySelectorAll(q + "li.tl-oficial")].some(l => /Protocolo recebido/.test(l.textContent) && /e\/p\/44233139765202537/.test((l.querySelector(".tl-link") || {}).href || "")), P));
  // rotina
  conf("três movimentos de rotina dobram numa linha", /\+ 3 movimentos de rotina/.test(await txt(P + "li.tl-rotina summary")));
  // filtros
  const filtros = await p.evaluate(q => [...document.querySelectorAll(q + ".cc-filtro")].map(b => b.textContent.trim()), P);
  conf(`os filtros contam por fonte (${filtros.join(" | ")})`, filtros.some(f => /^INSS · 1$/.test(f)) && filtros.some(f => /^Judicial · 4$/.test(f)) && filtros.some(f => /^Com documento · 1$/.test(f)));
  await p.evaluate(() => { filtroTudo = "docs"; repintarFicha(); }); await p.waitForTimeout(200);
  conf("Com documento mostra só a sentença", await sel(P + "li.tl-card") === 1);
  await p.evaluate(() => { filtroTudo = "acao"; repintarFicha(); }); await p.waitForTimeout(200);
  conf("Pede ação mostra os não lidos dos portais", await sel(P + "li.tl-oficial") >= 3 && await sel(P + "li.tl-card:not(.tl-oficial)") === 0);
  await p.evaluate(() => { filtroTudo = "tudo"; repintarFicha(); }); await p.waitForTimeout(200);
  // mensagem ao cliente
  await p.evaluate(q => document.querySelector(q + " .tl-barra button[onclick^='msgAndamento']").click(), sent);
  await p.waitForTimeout(200);
  conf("Mensagem ao cliente abre o texto pronto com o movimento", /Julgado procedente o pedido/.test(await p.evaluate(() => (document.getElementById("msg-and") || {}).value || "")));
  await p.evaluate(() => fecharCaixa());
  // escritório
  const esc = await p.evaluate(() => { subAba = "escritorio"; repintarFicha(); const l = document.querySelector('.painel[data-p="2"] li.tl-card');
    return l ? { mais: [...l.querySelectorAll(".tl-mais-it")].map(b => b.textContent.trim()), plus: [...l.querySelectorAll(".tl-barra > button")].some(b => b.textContent.trim() === "＋"), emoji: /👍/.test(l.innerHTML) } : null; });
  conf("na anotação, mais uma tarefa e apagar foram para o ⋯", esc && esc.mais.includes("Mais uma tarefa neste comentário") && esc.mais.some(m => /Apagar/.test(m)) && !esc.plus && !esc.emoji);
  conf("na aba Escritório, o movimento do CRPS sai no cartão oficial, sem Responder", await p.evaluate(() => { subAba = "escritorio"; repintarFicha();
    const l = [...document.querySelectorAll('.painel[data-p="2"] li.tl-card')].find(x => /Protocolo recebido/.test(x.textContent));
    return !!l && l.classList.contains("tl-oficial") && !/Responder/.test(l.textContent) && !/CRPS · 01\/10/.test(l.textContent); }));
  // documentos e Claude
  await p.evaluate(() => { subAba = "cnj"; fonteCnj = "docs"; repintarFicha(); }); await p.waitForTimeout(200);
  conf("a lista de documentos tem seleção e Ler com Claude", await sel(".arq-it .doc-ck") >= 1 && await sel(".arq-it .doc-claude") >= 1);
  await p.evaluate(() => { const c = document.querySelector(".arq-it .doc-ck"); c.checked = true; c.dispatchEvent(new Event("change")); }); await p.waitForTimeout(200);
  conf("marcar abre a barra dos selecionados", /1 selecionado/.test(await txt(".docs-sel-barra")) && /Pedir ao Claude com estes/.test(await txt(".docs-sel-barra")));
  await p.evaluate(() => [...document.querySelectorAll(".docs-sel-barra button")].find(b => /Pedir ao Claude/.test(b.textContent)).click()); await p.waitForTimeout(200);
  conf("o menu do Claude oferece os pedidos prontos", /Manifestação sobre o laudo pericial/.test(await txt("#modal")) && /Recurso ao CRPS/.test(await txt("#modal")));
  await p.evaluate(() => abrirClaudeDocs("resumo")); await p.waitForTimeout(300);
  const url = decodeURIComponent((abrirsJanela.find(u => /claude\.ai\/new/.test(u)) || "").split("q=")[1] || "");
  conf("o pedido leva o identificador do documento para o conector", /ler_documento/.test(url) && /anexo:a0000000-0000-0000-0000-000000000001/.test(url) && !/a0000000-0000-0000-0000-000000000002/.test(url));
  const chaves = await p.evaluate(id => docsEscolhidos(D.casoPorId.get(id), true).map(chaveDoc), CASO1);
  conf("o pacote dos selecionados leva só o marcado", chaves.length === 1 && /a0000000-0000-0000-0000-000000000001/.test(chaves[0]));
  // visual
  await p.evaluate(() => { subAba = "tudo"; filtroTudo = "tudo"; docsSel.clear(); repintarFicha(); }); await p.waitForTimeout(400);
  const el = await p.$('.painel[data-p="2"]'); if (el) await el.screenshot({ path: path.join(__dirname, "f190-completo.png") });
  await p.evaluate(() => { subAba = "cnj"; fonteCnj = "docs"; docsSel.add(chaveDoc(documentosDoCaso(D.casoPorId.get(casoSel))[0])); repintarFicha(); }); await p.waitForTimeout(300);
  const el2 = await p.$('.painel[data-p="2"]'); if (el2) await el2.screenshot({ path: path.join(__dirname, "f190-docs.png") });
  await p.evaluate(() => { subAba = "tudo"; repintarFicha(); const d = document.querySelector('li.tl-oficial:has(.tl-doc) details.tl-mais'); d.open = true; }); await p.waitForTimeout(200);
  const card = await p.$('li.tl-oficial:has(.tl-doc)'); if (card) await card.screenshot({ path: path.join(__dirname, "f190-cartao.png") });

  if (process.env.SHOTS) {
    const D2 = process.env.SHOTS;
    const tira = async (nome, prep) => { await p.evaluate(prep); await p.waitForTimeout(350); const e = await p.$('.painel[data-p="2"]'); if (e) await e.screenshot({ path: path.join(D2, nome) }); };
    await tira("inss.png", () => { subAba = "inss"; repintarFicha(); });
    await tira("escritorio.png", () => { subAba = "escritorio"; repintarFicha(); const d = document.querySelector('.painel[data-p="2"] li.tl-card details.tl-mais'); if (d) d.open = true; });
    await tira("judicial.png", () => { subAba = "cnj"; fonteCnj = "pje"; repintarFicha(); });
    await tira("rotina-aberta.png", () => { subAba = "tudo"; repintarFicha(); const d = document.querySelector("li.tl-rotina details"); if (d) d.open = true; });
    await p.evaluate(id => menuClaudeDocs(id, []), CASO1); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(D2, "claude-modal.png") });
    await p.evaluate(() => fecharCaixa());
    await p.evaluate(() => msgAndamento("f0000000-0000-0000-0000-000000000003")); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(D2, "msg-modal.png") });
    await p.evaluate(() => fecharCaixa());
    await p.setViewportSize({ width: 390, height: 844 });
    await p.evaluate(() => { subAba = "tudo"; repintarFicha(); }); await p.waitForTimeout(500);
    await p.screenshot({ path: path.join(D2, "celular.png"), fullPage: true });
  }
  console.log("=== F190 · cartão oficial, filtros, rotina e documentos ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de página:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
