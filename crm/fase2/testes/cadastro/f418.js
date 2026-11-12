// F418 · a aba Expedientes do PJe replicada no CRM (06.11.2026).
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

  const r = await p.evaluate(async ([cli]) => {
    const k = { id: "kexp", cliente_id: cli, fase: "judicial", titulo: "t", processo: "50000154120244036136", ronda: {} };
    D.casoPorId.set("kexp", k); D.casos.push(k);
    const itens = [
      { ato: "Sentença tipo M", expediente_id: "62094626", prioridade: "Normal", documento_id: "615119049", destinatario: "FULANA DE TAL",
        meio: "Diário Eletrônico", enviado_em: "2026-11-03T16:38", ciencia_em: "2026-11-05T00:00", prazo_dias: 15,
        limite: "2026-11-27T23:59", limite_para: "para manifestação", fechado: false,
        ver: "/pje/Painel/painel_usuario/popup/visualizarExpediente.seam?idProcessoParteExpediente=62094626&idProcesso=1&paramIdProcessoDocumento=615119049" },
      { ato: "Intimação", expediente_id: "57135099", destinatario: "INSTITUTO NACIONAL DO SEGURO SOCIAL - INSS", limite: "2026-06-26T23:59", limite_para: "para manifestação", fechado: true }];
    // o plano e o aplicar gravam em ronda.expedientes, sem prazo
    const id = "c-exp"; const dados = { fonte: "pje-processo", grau: "1º grau", host: "pje1g.trf3.jus.br", quando: "2026-11-06T17:00:00Z",
      numero: "5000015-41.2024.4.03.6136", itens: [], expedientes: itens };
    window.api = (async (u, o) => /coletas\?select/.test(u) ? [{ id, dados }] : (/andamentos/.test(u) && !o ? [] : null));
    window.todas = async () => [];
    await conferirPjeProc(id);
    const plano = planoPjeProcAtual;
    window.patchCaso = async (cid, campos) => { window._patch = campos; };
    await aplicarPjeProc(id).catch(e => e);
    const res = { exps: plano && plano.exps.length, patch: JSON.stringify(window._patch || {}), prazoNao: !("prazo" in (window._patch||{})) };
    const div = document.createElement("div"); document.body.appendChild(div);
    vistaProc = true; D.casoPorId.set("kexp", k);   // o aplicar recarrega o D
    div.innerHTML = abaComProcessos(k, "cnj", () => "");
    res.bt = [...div.querySelectorAll(".proc-bts .btn-mini")].map(b => b.textContent.trim());
    telaExpedientes("kexp", 0);
    const m = document.querySelector(".exp-tela");
    res.th = m ? [...m.querySelectorAll("th")].map(x => x.textContent.trim()) : [];
    res.linhas = m ? m.querySelectorAll("tbody tr").length : 0;
    res.txt = m ? m.textContent.replace(/\s+/g, " ") : "";
    res.link = m ? m.querySelectorAll("a[href*='pje']").length : -1;
    const bver = m && m.querySelector("button.btn-mini[onclick*='verExpediente']");
    res.verBt = !!bver;
    // sem a peça no CRM: aviso com Ler, sem ir ao PJe
    window.docsDoProcesso = () => [{ caminho: "pje/50000154120244036136/999", nome: "outra" }];
    window.abrirProcessoInteiro = (...a) => { window._abriu = a; };
    bver && bver.click();
    res.semPeca = (document.querySelector(".modal-fundo") || {}).textContent || "";
    fecharCaixa();
    // com a peça: abre o leitor do CRM no documento do expediente
    window.docsDoProcesso = () => [{ caminho: "pje/50000154120244036136/999" }, { caminho: "pje/50000154120244036136/615119049" }];
    verExpediente("kexp", "50000154120244036136", "615119049");
    res.abriu = window._abriu ? window._abriu[2] : "";
    return res;
  }, [CLI_CHEIO]);
  conf("o plano leva os expedientes do processo", r.exps === 1);
  conf("o aplicar grava em ronda.expedientes com grau, sem prazo", /"50000154120244036136\|1º grau"/.test(r.patch) && /Sentença tipo M/.test(r.patch) && r.prazoNao);
  conf("botão Expedientes na aba Judicial", r.bt.includes("Expedientes"));
  conf("as quatro colunas do PJe", JSON.stringify(r.th) === JSON.stringify(["Ato de comunicação","Data limite prevista para ciência ou manifestação","Ações","Fechado"]));
  conf("duas linhas, com ciência, prazo e fechado", r.linhas === 2 && /ciência em 05.11.2026/.test(r.txt) && /Prazo: 15 dias/.test(r.txt) && /27.11.2026 23:59/.test(r.txt) && /SIM/.test(r.txt) && /2 resultados encontrados/.test(r.txt));
  conf("Ver é botão do CRM, sem link ao PJe (F559)", r.verBt && r.link === 0);
  conf("Ver abre a peça guardada no leitor do CRM (F559)", r.abriu === "pje/50000154120244036136/615119049");
  conf("Ver sem a peça importada avisa e oferece Ler (F559)", /615119049 não está no CRM/.test(r.semPeca) && /Ler o processo/.test(r.semPeca));

  console.log("=== F418: expedientes do PJe ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
