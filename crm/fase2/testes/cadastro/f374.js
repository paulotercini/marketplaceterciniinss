// F374 — a tela do PAT na aba INSS: o requerimento como o portal mostra,
// montado pelo blocoPat a partir do detalhe cru da coleta (02.11.2026).
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

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
  }, [SUPA, SESSAO]);
  const escritos = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      const corpo = JSON.parse(rota.request().postData() || "{}");
      escritos.push({ m, t, corpo });
      return rota.fulfill({ status: 204, contentType: "application/json", body: "" });
    }
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error") erros.push("console: " + m.text()); });
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);

  const r = await p.evaluate(([cli]) => {
    const det = { protocolo: 2370340440736, status: "CUMPRIMENTO_DE_EXIGENCIA",
      nomeServico: "Benefício Assistencial à Pessoa com Deficiência", nomeUnidade: "APS MONTE ALTO",
      dataEntradaRequerimento: "2026-10-05T15:56:37", tipoExigencia: "FALTA_AGENDAMENTO_AVS_PERICIA",
      descricaoEtapaPericia: "Concluído", cpfRequerente: "12345678909",
      comentarios: [{ id: 1, dataCriacao: "2026-10-05T15:57:50", conteudo: "<p>Requerimento aberto</p>", incluidoPorServidor: false },
                    { id: 2, dataCriacao: "2026-10-20T10:00:00", conteudo: "Compare&ccedil;a &agrave; per&iacute;cia", incluidoPorServidor: true },
                    { id: 3, dataCriacao: "2026-10-21T10:00:00", conteudo: "oculto", visivel: false }],
      anexos: [{ id: 981264918, nomeArquivo: "Relatório Médico.pdf", descricaoArquivo: "Documento Médico", categoria: "INICIAL" },
               { id: 981264910, nomeArquivo: "RG 2.pdf", descricaoArquivo: "Identificação", categoria: "INICIAL" },
               { id: 7001, nomeArquivo: "CNIS.pdf", descricaoArquivo: "Outros documentos", siapeCriador: "1234567" },
               { id: 7002, nomeArquivo: "Laudo novo.pdf", descricaoArquivo: "Documento Médico", idComentario: 2 },
               { id: 7003, nomeArquivo: "Foto.jpg", descricaoArquivo: "Outros documentos" }],
      agendamentosPericia: [{ data: "19/10/2026", horario: "09:20", nomeUnidade: "APS MONTE ALTO", situacaoAgendamento: "CUMPRIDO" }] };
    const b = blocoPat(det, { dataUltimaAtualizacao: "2026-10-21T08:00:00" }, "2026-11-02T14:33:06Z");
    const k = { id: "kpat", cliente_id: cli, protocolos: ["2370340440736"], fase: "inss", titulo: "t",
                pat: { "2370340440736": b, "999": { protocolo: "999", status: "CONCLUIDA" } } };
    D.anexos = [...(D.anexos||[]),
      { id: "a1", caso_id: "kpat", origem: "pat", nome: "Relatório", caminho: "pat/2370340440736/981264918" },
      { id: "a2", caso_id: "kpat", origem: "pat", nome: "Integral", caminho: "pat/2370340440736/processo-integral-cumprimento-de-exigencia" }];
    fontePat = "";
    const menu = painelINSS(k, []);
    fontePat = "tela";
    const div = document.createElement("div"); div.innerHTML = painelINSS(k, []); document.body.appendChild(div);
    const pastasData = [...div.querySelectorAll(".pat-arv summary")].map(x=>x.textContent);
    arvPatData = false; div.innerHTML = painelINSS(k, []);
    const txt = div.innerText;
    const botoes = [...div.querySelectorAll(".tela-pat button")].map(x => x.getAttribute("onclick")).filter(o => /abrirDecisao/.test(o));
    let parse = 0; for (const o of botoes) { try { new Function(o); parse++; } catch (e) {} }
    arvPatData = true;
    return { b, pastasData, temBotao: /fontePat='tela'/.test(menu), telas: div.querySelectorAll(".tela-pat").length,
      txt, coms: div.querySelectorAll(".pat-com tr").length, anx: div.querySelectorAll(".pat-arv li").length,
      pastas: [...div.querySelectorAll(".pat-arv summary")].map(x=>x.textContent),
      ag: div.querySelectorAll(".pat-ag tr").length, botoes: botoes.length, parse,
      naoBaixado: /RG 2\.pdf \(não baixado\)/.test(div.textContent), tc: div.textContent, integral: botoes.some(o => /processo-integral/.test(o)),
      ambos: integralDoPat(["pat/9/processo-integral-pendente", "pat/9/processo-integral", "pat/9/1"], "9"),
      nenhum: integralDoPat(["pat/9/1"], "9") };
  }, [CLI_CHEIO]);
  conf("blocoPat guarda só os comentários visíveis", r.b.comentarios.length === 2);
  conf("blocoPat leva a última atualização da lista e o agendamento com o tipo",
       r.b.dataUltimaAtualizacao === "2026-10-21T08:00:00" && r.b.agendamentos[0].tipo === "Perícia médica");
  conf("blocoPat não guarda o CPF", !JSON.stringify(r.b).includes("12345678909"));
  conf("a aba INSS oferece o botão PAT", r.temBotao);
  conf("só o protocolo do caso aparece", r.telas === 1);
  conf("cabeçalho com serviço, exigência e data de entrada",
       /Benefício Assistencial/.test(r.txt) && /Falta agendamento avs pericia/.test(r.txt) && /05\/10\/2026 15:56/.test(r.txt));
  conf("comentários do INSS e do escritório, sem HTML", r.coms === 3 && /Compareça à perícia/.test(r.txt) && !/<p>/.test(r.txt));
  conf("agendamento da perícia", r.ag === 2 && /19\/10\/2026 09:20/.test(r.txt));
  conf("anexos: o guardado abre, o que falta diz não baixado", r.naoBaixado && /Relatório Médico\.pdf/.test(r.tc));
  conf("árvore: exigência, INSS e escritório por tipo, Outros por último", JSON.stringify(r.pastas) === JSON.stringify(
    ["📁 Respostas a exigências (1)", "📁 20/10/2026 · Compareça à perícia (1)", "📁 Juntados pelo INSS (1)",
     "📁 Enviados pelo escritório (3)", "📁 Documento Médico (1)", "📁 Identificação (1)", "📁 Outros (1)"]));
  conf("árvore por data: a exigência do INSS no topo e a entrada do requerimento", JSON.stringify(r.pastasData) === JSON.stringify(
    ["📁 20/10/2026 · Exigência do INSS · Compareça à perícia (1)", "📁 05/10/2026 · Entrada do requerimento (4)"]));
  conf("F416 · o parcial do requerimento em curso não se diz processo inteiro",
       /Informações da tarefa \(cumprimento de exigencia\)/.test(r.txt) && !/Processo administrativo inteiro/.test(r.txt));
  conf("F416 · com o concluído guardado, vale o inteiro e não o parcial",
       r.ambos.caminho === "pat/9/processo-integral" && r.ambos.rot === "Processo administrativo inteiro" && r.nenhum === null);
  conf("processo integral e anexos com onclick válido", r.integral && r.botoes === 3 && r.parse === 3);

  console.log("=== F374: tela do PAT na aba INSS ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
