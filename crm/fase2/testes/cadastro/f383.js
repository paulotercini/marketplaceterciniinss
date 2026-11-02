// F383 — as abas INSS, Conselho e Judicial abrem em Processos, com a árvore
// no padrão comum, os filtros e o Ligado a (02.11.2026).
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
      { id: "j3", caso_id: "kproc", origem: "pje", nome: "Contestação.pdf", caminho: "pje/00012345620264036314/3", criado_em: "2026-06-02T10:00:00" }];
    const div = document.createElement("div"); document.body.appendChild(div);
    const pinta = (aba) => { div.innerHTML = abaComProcessos(k, aba, () => "<p id='ands'>andamentos</p>"); return div; };
    vistaProc = true; filtroArv = "todos";
    const inss = pinta("inss");
    const res = { cartoes: [...inss.querySelectorAll(".proc-cartao b")].map(x=>x.textContent),
      inssPastas: [...inss.querySelectorAll(".pat-arv summary")].map(x=>x.textContent),
      bts: [...inss.querySelectorAll(".proc-corpo .btn-mini")].map(x=>x.textContent.trim()).slice(0,4),
      lig: [...inss.querySelectorAll(".proc-lig button")].map(x=>x.textContent) };
    const crps = pinta("crps");
    res.crpsPastas = [...crps.querySelectorAll(".pat-arv summary")].map(x=>x.textContent);
    const jud = pinta("cnj");
    res.judPastas = [...jud.querySelectorAll(".pat-arv summary")].map(x=>x.textContent);
    res.judEt = [...jud.querySelectorAll(".arv-et")].map(x=>x.textContent);
    filtroArv = "dec"; res.judDec = [...pinta("cnj").querySelectorAll(".pat-arv summary")].length;
    filtroArv = "esc"; res.inssEsc = [...pinta("inss").querySelectorAll(".pat-arv ul li")].map(x=>x.textContent);
    filtroArv = "todos"; vistaProc = false; res.and = !!pinta("inss").querySelector("#ands");
    vistaProc = true;
    const onc = [...div.ownerDocument.querySelectorAll(".proc-corpo [onclick]")].map(x=>x.getAttribute("onclick"));
    res.parse = onc.every(o=>{ try{ new Function(o); return true; }catch(e){ return false; } });
    return res;
  }, [CLI_CHEIO]);
  conf("cartões das três fases", JSON.stringify(r.cartoes) === JSON.stringify(["INSS","Conselho","Judicial"]));
  conf("PAT: exigência no alto, entrada embaixo", /Exigência do INSS/.test(r.inssPastas[0]||"") && /Entrada do requerimento/.test(r.inssPastas[1]||""));
  conf("botões Tela, Portal e Claude", r.bts.includes("Tela") && r.bts.some(t=>/Portal/.test(t)) && r.bts.includes("Claude"));
  conf("ligado ao recurso e ao processo judicial", r.lig.length === 2);
  conf("e-SISREC: o acórdão no alto com decisão", /decisão/.test(r.crpsPastas[0]||"") && r.crpsPastas.length === 2);
  conf("Judicial: pastas por data, a sentença no alto", /30\/10\/2026/.test(r.judPastas[0]||"") && /decisão/.test(r.judPastas[0]) && r.judPastas.length === 3);
  conf("Judicial: origem na etiqueta", ["Juízo","Escritório","INSS"].every(e=>r.judEt.includes(e)));
  conf("filtro Decisões no Judicial", r.judDec === 1);
  conf("filtro Escritório no PAT tira o juntado pelo INSS", r.inssEsc.length === 2 && !r.inssEsc.some(t=>/CNIS/.test(t)));
  conf("Andamentos devolve a aba de antes", r.and);
  conf("onclick válidos", r.parse); 

  console.log("=== F383: abas em processos ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
