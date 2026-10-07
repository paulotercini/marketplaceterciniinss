// F183 — jornada por cor e trilha do rito. (Base: F182 — Casos e anotações (canvas aprovado): trilha das etapas, "Nas outras
// abas", chaves Tarefa / Prazo fatal / Lembrete com a frase "Ao registrar",
// e o cartão da anotação com Responder, Concluir tarefa, + prazo e Reagendar.
// Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const OUTRA = "22222222-2222-2222-2222-222222222222";
const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const A1 = "a1820000-0000-0000-0000-000000000001", A2 = "a1820000-0000-0000-0000-000000000002";
const T1 = "t1820000-0000-0000-0000-000000000001";
const DADOS = {
  ...FIX,
  colaboradores: [...FIX.colaboradores, { id: OUTRA, auth_id: "bbbb", nome: "Amanda Ficta", inicial: "A", cor: "#8A5300", papel: "colaborador", ativo: true }],
  casos: FIX.casos.map(k => ({ ...k, fase: "judicial", especie: "B94", processo: "1008703-50.2025.8.26.0999", etapa: null, prazo: null })),
  andamentos: [
    { id: A1, caso_id: CASO1, autor_id: EU, origem: "app", texto: "⏰ [PRAZO " + d(20).split("-").reverse().join(".") + "] [EXIGÊNCIA] O que o INSS exigiu: declaração do empregador", criado_em: new Date(Date.now() - 3600e3).toISOString(), andamentos_lidos: [{ colaborador_id: EU }] },
    { id: A2, caso_id: CASO1, autor_id: OUTRA, origem: "app", texto: "Cliente avisado sobre a perícia.", criado_em: new Date(Date.now() - 7200e3).toISOString(), andamentos_lidos: [{ colaborador_id: EU }] },
  ],
  andamento_tarefas: [{ id: T1, andamento_id: A1, caso_id: CASO1, colaborador_id: EU, atribuido_por: EU, lembrar_em: d(3), concluida_em: null, natureza: "compromisso" }],
  eventos: [{ id: "ev182", caso_id: CASO1, tipo: "Perícia", data_hora: d(2) + "T09:40:00-03:00", local: "APS Fictícia", status: "agendada" }],
  pagamentos: [{ id: "pg182", cliente_id: CLI_CHEIO, caso_id: CASO1, valor: 500, vencimento: d(30), status: "aberto", descricao: "Honorários · 1ª parcela" }],
};

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
  await ctx.route(SUPA + "/**", rota => {
    const q = rota.request(), u = q.url(), m = q.method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      escritos.push({ t, m, u, corpo: q.postData() });
      if (m === "POST") { let b = {}; try { b = JSON.parse(q.postData() || "{}"); } catch (e) {}
        return rota.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify([{ id: "novo-" + escritos.length, criado_em: new Date().toISOString(), ...b }]) }); }
      return rota.fulfill({ status: 204, body: "" });
    }
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
  await p.evaluate(([cli, id]) => { abrirFicha(cli); casoSel = id; abaAtiva = 2; subAba = "escritorio"; }, [CLI_CHEIO, CASO1]);
  await p.waitForSelector(".tr-faixa .jn-l");
  await p.evaluate(() => repintarFicha());
  
  const FOTO = process.env.FOTO;
  await p.waitForSelector(".tr-faixa .tr-l");
  const v = await p.evaluate(() => ({
    fases: [...document.querySelectorAll(".jn-l .jn-b")].map(b => [...b.classList].find(c => /^jn-[afnv]$/.test(c))).join("|"),
    tit: document.querySelector(".tr-cab h3").textContent,
    nomes: [...document.querySelectorAll(".tr-l .tr-nm")].map(x => x.textContent),
    roxo: getComputedStyle(document.querySelector(".tr-g-ex")).color,
    ritos: [...document.querySelectorAll(".tr-ritos button")].map(b => b.textContent) }));
  conf("processo do TJSP abre a trilha acidentária, judicial como fase atual", v.tit === "Judicial · Acidentário · TJSP" && v.fases.endsWith("jn-a"));
  conf("no acidentário a perícia e o laudo vêm antes da contestação", v.nomes.indexOf("Laudo juntado") < v.nomes.indexOf("Citação e contestação") && v.nomes.indexOf("Perícia realizada") > 0);
  conf("a execução entra na trilha, com o grupo em roxo", v.nomes.includes("RPV ou precatório expedido") && v.nomes.includes("Cumprimento de sentença") === false && v.roxo === "rgb(165, 24, 127)");
  conf("os ritos judiciais podem ser trocados à mão", ["JEF · incapacidade e BPC", "JEF · aposentadorias", "Vara Federal · rito comum", "Acidentário · TJSP", "Mandado de segurança"].every(x => v.ritos.includes(x)));
  // marcar: perícia realizada como atual grava a palavra antiga em casos.etapa
  escritos.length = 0;
  await p.evaluate(() => { const i = TRILHAS.acid.e.map(lerEtapaTrilha).findIndex(e => e.n === "Perícia realizada"); return trMarcar(casoSel, "acid", i, "a"); });
  await p.waitForTimeout(300);
  const pt = escritos.filter(e => e.t === "casos" && e.m === "PATCH").map(e => JSON.parse(e.corpo)).pop() || {};
  conf("a etapa atual grava a trilha e a etapa equivalente (perícia realizada)", pt.etapa === "perícia realizada" && pt.trilha && pt.trilha.m["acid:Perícia realizada"].s === "a");
  await p.evaluate(() => { const i = TRILHAS.acid.e.map(lerEtapaTrilha).findIndex(e => e.n === "Esclarecimentos do perito"); return trMarcar(casoSel, "acid", i, "n"); });
  await p.evaluate(() => { const i = TRILHAS.acid.e.map(lerEtapaTrilha).findIndex(e => e.n === "Citação e contestação"); return trMarcar(casoSel, "acid", i, "a"); });
  await p.waitForTimeout(300);
  const est = await p.evaluate(() => [...document.querySelectorAll(".tr-l .tr-et")].map(b => [...b.classList].find(c => /^tr-s/.test(c))));
  const nm = v.nomes;
  conf("a etapa anterior vira cumprida, a pulada fica 'não houve' e a ordem continua", est[nm.indexOf("Perícia realizada")] === "tr-sf" && est[nm.indexOf("Esclarecimentos do perito")] === "tr-sn" && est[nm.indexOf("Citação e contestação")] === "tr-sa" && est[nm.indexOf("Laudo juntado")] === "tr-sv");
  // a providência que declara a etapa (anotação) acende a etapa da trilha
  await p.evaluate(() => marcarEtapa(casoSel, "sentença publicada"));
  conf("a anotação que declara 'sentença publicada' acende Sentença na trilha", await p.evaluate(() => (marcaTrilha(D.casoPorId.get(casoSel), "acid", "Sentença") || {}).s === "a"));
  if (FOTO) await p.screenshot({ path: FOTO + "-1.png" });
  // a jornada: ver a trilha do Escritório, com o documento aguardado
  await p.evaluate(() => trVerFase(casoSel, "escritorio"));
  await p.evaluate(() => { const i = TRILHAS.escritorio.e.indexOf("Aguardando documentos"); trEscolher(casoSel, "escritorio", i); });
  await p.evaluate(() => { const i = TRILHAS.escritorio.e.indexOf("Aguardando documentos"); return trDetalhe(casoSel, "escritorio", i, "relatório médico"); });
  await p.waitForTimeout(200);
  const esc = await p.evaluate(() => ({ tit: document.querySelector(".tr-cab h3").textContent, x: (document.querySelector(".tr-l .tr-x") || {}).textContent,
    cor: getComputedStyle(document.querySelector(".tr")).borderTopColor, sel: !!document.querySelector(".tr-doc select") }));
  if (FOTO) await p.screenshot({ path: FOTO + "-2.png" });
  conf("a jornada abre a trilha do Escritório, em vermelho, com o documento aguardado", esc.tit === "Escritório · Atendimento" && esc.x === "relatório médico" && esc.cor === "rgb(179, 38, 30)" && esc.sel);
  conf("a trilha do INSS de auxílio-acidente existe", await p.evaluate(() => ritoPadrao({ especie: "B94" }, "inss") === "inss_b94" && ritoPadrao({ especie: "B31", processo: "5000850-63.2023.4.03.6314" }, "judicial") === "jef_inc" && ritoPadrao({ especie: "B42", processo: "5000850-63.2023.4.03.6136" }, "judicial") === "vara"));

  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
