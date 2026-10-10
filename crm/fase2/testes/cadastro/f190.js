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
  const sent = P + 'li.tl-oficial:has(.tl-disp)';
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
  conf(`os filtros contam por fonte (${filtros.join(" | ")})`, filtros.some(f => /^INSS · 2$/.test(f)) && filtros.some(f => /^Judicial · 7$/.test(f)) && filtros.some(f => /^Com documento · 1$/.test(f)));
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
  // F190 · segunda rodada (revisão independente)
  await p.evaluate(() => { subAba = "tudo"; filtroTudo = "tudo"; repintarFicha(); }); await p.waitForTimeout(250);
  conf("a intimação com prazo não dobra na rotina", await p.evaluate(() => [...document.querySelectorAll('.painel[data-p="2"] li.tl-card')].some(l => /Intimação eletrônica/.test(l.textContent) && !l.closest(".tl-rotina"))));
  conf("um movimento de rotina sozinho no dia não dobra", await p.evaluate(() => [...document.querySelectorAll('.painel[data-p="2"] li.tl-card')].some(l => /Expedição/.test(l.textContent) && /02\.10/.test(l.textContent) && !l.closest(".tl-rotina"))));
  const pa = await p.evaluate(() => { const s2 = document.querySelector(".cc-acao"); return s2 ? s2.textContent.replace(/\s+/g, " ") : ""; });
  conf(`o painel Pede ação conta e filtra (${pa.trim().slice(0, 90)})`, /Pede ação/.test(pa) && /prazo/.test(pa) && /Claude sobre o caso/.test(pa));
  conf("Pede ação não conta a rotina", await p.evaluate(() => { filtroTudo = "acao"; repintarFicha(); return ![...document.querySelectorAll('.painel[data-p="2"] li.tl-card')].some(l => /Conclusos para despacho/.test(l.textContent)); }));
  await p.evaluate(() => { filtroTudo = "tudo"; repintarFicha(); });
  // o evento do e-SISREC com acórdão: cartão oficial inteiro, caminho com aspas escapado
  await p.evaluate(() => { irSubAba("crps"); }); await p.waitForTimeout(250);
  const cr = await p.evaluate(() => { const l = [...document.querySelectorAll('.painel[data-p="2"] li.tl-oficial')].find(x => /provido em parte/.test(x.textContent));
    if (!l) return null; const b2 = [...l.querySelectorAll(".tl-doc button")].map(b => b.getAttribute("onclick"));
    return { bar: l.querySelector(".tl-barra").textContent.replace(/\s+/g, " "), docs: b2, link: (l.querySelector(".tl-link") || {}).href || "" }; });
  conf("o acórdão do e-SISREC sai no cartão oficial, com documento, portal e mensagem", cr && /Criar tarefa ou prazo/.test(cr.bar) && /Mensagem ao cliente/.test(cr.bar) && /e\/p\/44233139765202537/.test(cr.link) && cr.docs.length === 2);
  conf("o caminho do acórdão com aspas e < não quebra o clique", cr && cr.docs.every(o => { try { new Function(o); return true; } catch (e) { return false; } }) && /fic\\'tício/.test(cr.docs[1]));
  await p.evaluate(() => { const b2 = [...document.querySelectorAll('.painel[data-p="2"] li.tl-oficial .tl-barra button')].find(b => /Mensagem ao cliente/.test(b.textContent)); b2.click(); }); await p.waitForTimeout(200);
  conf("a mensagem do CRPS sai pronta, com WhatsApp alcançável pelo teclado", /provido em parte/.test(await p.evaluate(() => document.getElementById("msg-and").value)) && await p.evaluate(() => /^https:\/\/wa\.me\/55/.test(document.getElementById("msg-wa").getAttribute("href") || "")));
  await p.evaluate(() => fecharCaixa());
  // o cartão do CNJ (espelho do DataJud) também é oficial
  conf("o histórico do CNJ vira cartão oficial com portal e mensagem", await p.evaluate(id => { const k = D.casoPorId.get(id);
    const h = cartaoTl({ q: "2026-10-05", em: "⚖️", rot: "CNJ", texto: "Conclusos para julgamento", ofic: oficCnj(k, "Conclusos para julgamento", { data: "2026-10-05" }, "x") });
    return /tl-oficial/.test(h) && /Criar tarefa ou prazo/.test(h) && /Abrir no PJe/.test(h) && /msgCliente/.test(h); }, CASO1));
  // Criar prazo abre o seguimento já preenchido pelo catálogo
  await p.evaluate(() => { subAba = "tudo"; repintarFicha(); document.querySelector(".tl-prazo-sug button").click(); }); await p.waitForTimeout(250);
  conf("Criar prazo abre com o prazo do catálogo e a data já preenchidos", await p.evaluate(() => !!(document.getElementById("seg-cat") || {}).value && !!(document.getElementById("seg-prazo") || {}).value));
  await p.evaluate(() => fecharCaixa());
  conf("todo cartão oficial tem respiro interno, em toda aba", await p.evaluate(() => { const r = [];
    for (const a of ["tudo", "inss", "crps", "cnj"]) { if (a === "crps") irSubAba("crps"); else { subAba = a; fonteCnj = "pje"; repintarFicha(); }
      for (const l of document.querySelectorAll('.painel[data-p="2"] li.tl-oficial')) { if (!l.offsetParent) continue; r.push(parseFloat(getComputedStyle(l).paddingLeft)); } }
    subAba = "tudo"; repintarFicha(); return r.length > 0 && r.every(v => v >= 12); }));
  // terceira rodada
  const t3 = await p.evaluate(() => { subAba = "tudo"; filtroTudo = "tudo"; repintarFicha();
    const cs = [...document.querySelectorAll('.painel[data-p="2"] li.tl-card')];
    const crps = cs.find(l => /provido em parte/.test(l.textContent) && l.classList.contains("tl-oficial"));
    const per = cs.find(l => /Perícia médica/.test(l.textContent));
    return { crpsDoc: !!(crps && crps.querySelector(".tl-doc")), crpsSin: !!(crps && crps.querySelector(".tl-sinal")),
      perAcao: !!(per && per.classList.contains("tl-pericia") && per.querySelector('.tl-barra .tl-bt.forte')),
      msgOk: (() => { const b2 = crps && [...crps.querySelectorAll(".tl-barra button")].find(b => /Mensagem/.test(b.textContent)); try { new Function(b2.getAttribute("onclick")); return true; } catch (e) { return false; } })() }; });
  conf("no Caso completo, o cartão do e-SISREC tem o acórdão e os sinais, como na aba Recurso", t3.crpsDoc && t3.crpsSin);
  conf("a perícia agendada no Caso completo é o cartão da perícia, com a ação do momento", t3.perAcao);
  conf("texto de várias linhas não quebra a Mensagem ao cliente", t3.msgOk);
  conf("o botão de prazos sugeridos filtra só os prazos", await p.evaluate(() => { [...document.querySelectorAll(".cc-acao-n")].find(b => /prazo/.test(b.textContent)).click();
    const cs = [...document.querySelectorAll('.painel[data-p="2"] li.tl-card')]; const ok = filtroTudo === "prazo" && cs.length > 0 && cs.every(l => l.querySelector(".tl-prazo-sug")); filtroTudo = "tudo"; repintarFicha(); return ok; }));
  // perícias: o que não é perícia sai da tela
  conf("evento com data de lembrete, manifestação ou atendimento não é perícia", await p.evaluate(() => [
      "perícia. Ver o resultado em 12/10", "Perícia desfavorável. Fazer manifestação em 15/10", "perícia médica de Auxílio-Acidente. Prazo 20/10",
      "perícia agendada e agenda atendimento para o dia 03/10", "periciais no valor de R$300,00. Verificar em 08/10", "perícia for marcada. Verificar em 05/11",
      "Perícia médica foi realizada. Em 30/10"].every(o => eventoFalso({ obs: o }))
    && ["Perícia agendada para o dia 12/10/2026 às 14h30", "perícia em 15/10", "Perícia remarcada para o dia 20.10.2026 as 09:00",
      "Perícia em Matão agendada para o dia 22/10 às 07h40", "avaliação social para o dia 29/10/2026 às 13:00", ""].every(o => !eventoFalso({ obs: o }))));
  // ⋯: Esc fecha e devolve o foco
  conf("Esc fecha o ⋯, devolve o foco e não fecha a ficha", await p.evaluate(() => { const d = document.querySelector("li.tl-oficial details.tl-mais"); d.open = true;
    d.querySelector("summary").dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); return !d.open && document.activeElement === d.querySelector("summary") && !!document.querySelector(".linha-caso"); }));
  conf("clicar fora fecha o ⋯", await p.evaluate(() => { const d = document.querySelector("li.tl-oficial details.tl-mais"); d.open = true; document.querySelector(".cc-acao-tit").click(); return !d.open; }));
  conf("os itens do ⋯ são itens de menu", await p.evaluate(() => [...document.querySelectorAll(".tl-mais-it")].every(b => b.getAttribute("role") === "menuitem")));
  // documentos e Claude
  await p.evaluate(() => { subAba = "cnj"; fonteCnj = "docs"; procSel = ""; repintarFicha(); }); await p.waitForTimeout(200);
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
  // o digitalizado sem texto baixa o PDF quando vai para o Claude
  conf("pedir ao Claude com um digitalizado baixa o PDF dele", await p.evaluate(async id => { let chamou = null; const orig = window.digitalizadosClaude; const antes = docsSel.size;
    window.digitalizadosClaude = async (c, so) => { chamou = [c, so, [...docsSel]]; };
    menuClaudeDocs(id, ["anexo:a0000000-0000-0000-0000-000000000002"]); await abrirClaudeDocs("resumo"); window.digitalizadosClaude = orig;
    return !!chamou && chamou[1] === true && chamou[2].length === 1 && /000000000002/.test(chamou[2][0]) && docsSel.size === antes; }, CASO1));
  // trocar de cliente zera filtro e seleção
  conf("trocar de cliente zera o filtro e a seleção", await p.evaluate(async ([a1, b1]) => { filtroTudo = "docs"; docsSel.add("anexo:x"); await abrirFicha(b1); const ok1 = filtroTudo === "tudo" && docsSel.size === 0; await abrirFicha(a1); return ok1; }, [CLI_CHEIO, "c0000000-0000-0000-0000-000000000002"]));
  await p.evaluate(id => { casoSel = id; abaAtiva = 2; subAba = "tudo"; repintarFicha(); }, CASO1);
  // celular: sem rolagem lateral e alvos de toque de 44px
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400);
  const cel = await p.evaluate(() => { const b = document.querySelector("li.tl-oficial .tl-bt.forte"); return { sobra: document.documentElement.scrollWidth - window.innerWidth, alto: b ? Math.round(b.getBoundingClientRect().height) : 0 }; });
  conf(`no celular não há rolagem lateral e o botão tem 44px (${cel.sobra}, ${cel.alto})`, cel.sobra <= 0 && cel.alto >= 44);
  if (process.env.SHOTS) { const c = await p.$("li.tl-oficial:has(.tl-disp)"); if (c) await c.screenshot({ path: path.join(process.env.SHOTS, "celular-cartao.png") }); }
  await p.setViewportSize({ width: 1440, height: 1100 }); await p.waitForTimeout(300);
  // visual
  await p.evaluate(() => { subAba = "tudo"; filtroTudo = "tudo"; docsSel.clear(); repintarFicha(); }); await p.waitForTimeout(400);
  const el = await p.$('.painel[data-p="2"]'); if (el) await el.screenshot({ path: path.join(__dirname, "f190-completo.png") });
  await p.evaluate(() => { subAba = "cnj"; fonteCnj = "docs"; docsSel.add(chaveDoc(documentosDoCaso(D.casoPorId.get(casoSel))[0])); repintarFicha(); }); await p.waitForTimeout(300);
  const el2 = await p.$('.painel[data-p="2"]'); if (el2) await el2.screenshot({ path: path.join(__dirname, "f190-docs.png") });
  await p.evaluate(() => { subAba = "tudo"; repintarFicha(); const d = document.querySelector('li.tl-oficial:has(.tl-disp) details.tl-mais'); d.open = true; }); await p.waitForTimeout(200);
  const card = await p.$('li.tl-oficial:has(.tl-doc)'); if (card) await card.screenshot({ path: path.join(__dirname, "f190-cartao.png") });

  if (process.env.SHOTS) {
    const D2 = process.env.SHOTS;
    const tira = async (nome, prep) => { await p.evaluate(prep); await p.waitForTimeout(350); const e = await p.$('.painel[data-p="2"]'); if (e) await e.screenshot({ path: path.join(D2, nome) }); };
    await tira("inss.png", () => { subAba = "inss"; repintarFicha(); });
    await tira("recurso.png", () => { irSubAba("crps"); });
    await tira("completo.png", () => { subAba = "tudo"; filtroTudo = "tudo"; repintarFicha(); });
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
