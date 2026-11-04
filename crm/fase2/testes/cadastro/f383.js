// F383/F391 · as abas INSS, Conselho e Judicial abrem na árvore única do processo:
// documentos com o conteúdo e andamentos por data, Ler, Baixar e Detalhes (04.11.2026).
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
    const det = { protocolo: 2370340440736, status: "CUMPRIMENTO_DE_EXIGENCIA", nomeServico: "BPC", dataEntradaRequerimento: "2026-10-05T15:56:37",
      comentarios: [{ id: 2, dataCriacao: "2026-10-20T10:00:00", conteudo: "Compareça à perícia", incluidoPorServidor: true }],
      anexos: [{ id: 1, nomeArquivo: "Relatório.pdf" }, { id: 2, nomeArquivo: "CNIS.pdf", siapeCriador: "1" }, { id: 3, nomeArquivo: "Laudo.pdf", idComentario: 2 }] };
    const b = blocoPat(det, {}, "2026-11-02T14:33:06Z");
    const k = { id: "kproc", cliente_id: cli, protocolos: ["2370340440736"], fase: "judicial", titulo: "t", processo: "00012345620264036314",
      pat: { "2370340440736": b },
      crps: [{ nup: "44233139765202537", orgao_atual: "7ª JR", eventos: [
        { data: "2026-10-28", bruto: "Acórdão", tipo: "decisao", arquivos: [{ nome: "acordao.pdf", storage: "crps/x/acordao.pdf", decide: true }] },
        { data: "2026-03-20", bruto: "Recurso protocolado", arquivos: [{ nome: "razoes.pdf", storage: "crps/x/razoes.pdf" }] }] }] };
    D.casoPorId.set("kproc", k);
    D.anexos = [...(D.anexos||[]),
      { id: "j1", caso_id: "kproc", origem: "pje", nome: "Sentença.pdf", caminho: "pje/00012345620264036314/1", criado_em: "2026-10-30T10:00:00" },
      { id: "j2", caso_id: "kproc", origem: "pje", nome: "Petição inicial.pdf", caminho: "pje/00012345620264036314/2", criado_em: "2026-05-14T10:00:00" },
      { id: "j3", caso_id: "kproc", origem: "pje", nome: "Contestação.pdf", caminho: "pje/00012345620264036314/3", criado_em: "2026-06-02T10:00:00" },
      { id: "p1", caso_id: "kproc", origem: "pat", nome: "Relatório.pdf", caminho: "pat/2370340440736/1", criado_em: "2026-10-05T10:00:00" }];
    const div = document.createElement("div"); document.body.appendChild(div);
    const pinta = (aba) => { div.innerHTML = abaComProcessos(k, aba, () => "<p id='ands'>andamentos</p>"); return div; };
    const txt = (el, q) => [...el.querySelectorAll(q)].map(x=>x.textContent.replace(/\s+/g," ").trim());
    vistaProc = true; filtroArv = "todos";
    const inss = pinta("inss");
    const res = { cartoes: inss.querySelectorAll(".proc-cartao").length,
      inssDias: txt(inss, ".arv-data"), inssItens: txt(inss, ".arv-doc,.arv-and"),
      bts: txt(inss, ".proc-bts .btn-mini"), lig: txt(inss, ".proc-lig button") };
    const crps = pinta("crps");
    res.crpsItens = txt(crps, ".arv-doc,.arv-and");
    const jud = pinta("cnj");
    res.judDias = txt(jud, ".arv-data"); res.judEt = txt(jud, ".arv-et"); res.judPri = txt(jud, ".proc-pri");
    // F385 · a inicial do e-SAJ vem como "Petição (Outras)" e a ordem do dia é a da juntada
    const ds = [{origem:"esaj", nome:"Documentos Diversos", caminho:"esaj/1/454289457", data:"2025-06-02", texto:"fls. 20"},
      {origem:"esaj", nome:"Petição (Outras)", caminho:"esaj/1/454289365", data:"2025-06-02", texto:"fls. 1 EXCELENTÍSSIMO"},
      {origem:"esaj", nome:"Petição (Outras)", caminho:"esaj/1/474864039", data:"2025-10-06", texto:"fls. 60"},
      {origem:"eproc", nome:"INIC1", caminho:"eproc/2/9", data:"2025-01-01"}];
    marcarIniciais(ds); res.esaj = ds.sort(ordemPeca).map(rotPeca);
    res.trecho = trechoDoc({texto:"PODER JUDICIÁRIO\nJUSTIÇA FEDERAL\nDefiro à parte autora os benefícios da gratuidade da justiça, nos termos do art. 98 do CPC.\nCite-se."});
    filtroArv = "dec"; res.judDec = pinta("cnj").querySelectorAll(".arv-doc,.arv-and").length;
    filtroArv = "and"; res.inssAnd = pinta("inss").querySelectorAll(".arv-doc").length;
    filtroArv = "doc"; res.inssDoc = pinta("inss").querySelectorAll(".arv-and").length;
    filtroArv = "todos"; vistaProc = false; res.and = !!pinta("inss").querySelector("#ands") && /Árvore/.test(div.textContent);
    vistaProc = true;
    const onc = [...pinta("cnj").querySelectorAll("[onclick]"), ...pinta("inss").querySelectorAll("[onclick]")].map(x=>x.getAttribute("onclick"));
    res.parse = onc.every(o=>{ try{ new Function(o); return true; }catch(e){ return false; } });
    // Ler abre o leitor contínuo com os documentos do processo, no documento clicado
    desenharPeca = () => {};
    lerProcesso("kproc", "cnj", 0, "pje/00012345620264036314/3");
    const pi = document.getElementById("proc-inteiro");
    res.ler = pi ? { n: pi.querySelectorAll(".pi-peca").length, tit: pi.querySelector(".pi-cab b").textContent,
      alvo: (pi._alvo||{}).id||"" } : null;
    // zoom: o + aumenta, o teclado volta a 100 %, e a escolha fica guardada
    if(pi){ piZoom(1); piZoom(1); res.z1 = pi.style.getPropertyValue("--pi-zoom") + "|" + pi.querySelector(".pi-zoom output").textContent;
      res.zPeca = getComputedStyle(pi.querySelector(".pi-peca")).zoom;
      document.dispatchEvent(new KeyboardEvent("keydown", {key:"0", bubbles:true})); res.z0 = pi.style.getPropertyValue("--pi-zoom");
      piZoom(-1); res.zGuard = localStorage.getItem("crm_pi_zoom"); localStorage.removeItem("crm_pi_zoom"); }
    fecharProcessoInteiro();
    lerProcesso("kproc", "crps", 0);
    const pc = document.getElementById("proc-inteiro"); res.lerCrps = pc ? pc.querySelectorAll(".pi-peca").length : 0;
    fecharProcessoInteiro();
    return res;
  }, [CLI_CHEIO]);
  conf("sem os cartões das fases", r.cartoes === 0);
  conf("PAT: exigência no alto, entrada embaixo", /20\/10\/2026/.test(r.inssDias[0]||"") && /Exigência do INSS/.test(r.inssItens.join("|")) && /Entrada do requerimento/.test(r.inssItens[r.inssItens.length-1]||""));
  conf("botões Ler, Baixar, Claude, Portal, Tela e Detalhes", ["Ler","Baixar","Claude","Portal","Tela","Detalhes"].every(b=>r.bts.includes(b)));
  conf("ligado ao recurso e ao processo judicial", r.lig.length === 2);
  conf("e-SISREC: o acórdão no alto com decisão", /acordao/.test(r.crpsItens[0]||"") && /Decisão/.test(r.crpsItens[0]) && r.crpsItens.length === 2);
  conf("Judicial: dias do mais novo ao mais antigo, com Ler", /30\/10\/2026/.test(r.judDias[0]||"") && r.judDias.length === 3 && r.judPri[0] === "Ler");
  conf("Judicial: origem na etiqueta", ["Juízo","Escritório","INSS"].every(e=>r.judEt.includes(e)));
  conf("filtro Decisões no Judicial", r.judDec === 1);
  conf("filtros Andamentos e Documentos", r.inssAnd === 0 && r.inssDoc === 0);
  conf("o trecho do conteúdo pula o cabeçalho", /^Defiro à parte autora/.test(r.trecho));
  conf("e-SAJ e eproc: a inicial reconhecida e primeiro no dia", JSON.stringify(r.esaj) === JSON.stringify(["Petição inicial","Petição inicial","Documentos Diversos","Petição (Outras)"]));
  conf("Detalhes devolve a aba de antes, com a volta à árvore", r.and);
  conf("Ler abre o leitor no documento clicado", r.ler && r.ler.n === 3 && /Judicial/.test(r.ler.tit) && r.ler.alvo === "pi-1");
  conf("zoom das peças: + aumenta, 0 volta, a escolha fica", r.z1 === "1.25|125 %" && r.zPeca === "1.25" && r.z0 === "1" && r.zGuard === "0.9");
  conf("Ler no Conselho leva os documentos do recurso", r.lerCrps === 2);
  conf("onclick válidos", r.parse);

  console.log("=== F383/F391: árvore do processo ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
