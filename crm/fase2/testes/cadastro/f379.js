// F379 · três correções dos prazos (02.11.2026): o "Concluir em" do To Do fora do 🗓 Tarefas com Prazo é retorno, e não
// prazo fatal; no prazo administrativo o ponto facultativo (carnaval, Corpus Christi) não prorroga; o BPC do idoso (B88)
// tem prazo de análise contado do requerimento, sem esperar perícia
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, EU, CLI_CHEIO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const dia = n => new Date(Date.now() + n * 864e5).toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });
const TUDO = { ...FIX, casos: [{ ...FIX.casos[0], prazo: dia(3) }] };

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
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (rota.request().method() !== "GET")
      return rota.fulfill({ status: 201, contentType: "application/json", body: "[]" });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    let corpo = TUDO[t] || [];
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
  const r = await p.evaluate((caso) => {
    const k = D.casoPorId.get(caso);
    const out = {};
    out.retornoInss = prazoEhRetorno(k);
    out.agendaRet = itensAgendaTodos().some(i => i.k && i.k.id === k.id && i.selo === "Retorno" && !i.fatal);
    out.quadroRet = (x => [...(x.soltas||[]), ...(x.linhas||[])])(linhasDeDatas(k.cliente_id)).some(l => l.casoId === k.id && l.rotulo === "Retorno" && natDaLinha(l) === "lembrete");
    out.fatalAberto = fatalAbertoDe(k);
    const outro = { ...k, fase: "outro", mover_para: "🗓 Tarefas com Prazo" };
    out.outroFatal = !prazoEhRetorno(outro);
    out.cafeRetorno = prazoEhRetorno({ ...k, fase: "outro", mover_para: "☕ Marcos" });
    D.tarefasPorCaso.set(k.id, [{ natureza: "fatal", lembrar_em: k.prazo, concluida_em: null }]);
    out.tarefaFatal = !prazoEhRetorno(k);
    D.tarefasPorCaso.set(k.id, []);
    // 2027: Páscoa em 28/03; carnaval em 08 e 09/02; Corpus Christi em 27/05
    const crps = PRAZOS_CATALOGO.find(x => x.id === "crps"), ms = PRAZOS_CATALOGO.find(x => x.id === "ms"), ap = PRAZOS_CATALOGO.find(x => x.id === "ap");
    out.crpsCarnaval = contarPrazo("2027-01-09", crps);          // 30 dias caem na segunda de carnaval
    out.crpsCorpus = contarPrazo("2027-04-27", crps);            // 30 dias caem na quinta de Corpus Christi
    out.crpsNatal = contarPrazo("2026-11-25", crps);             // 25/12, feriado em lei: vai a 28/12
    out.msCarnaval = contarPrazo(somaDias("2027-02-08", -120), ms);   // decadencial antecipa: sexta 05/02
    out.apCarnaval = contarPrazo("2027-02-05", ap);              // judicial segue sem contar o carnaval
    out.exig = prazoDaExigencia("2027-01-09");
    const b88 = { ...k, fase: "inss", especie: "B88", der: somaDias(hoje(), -10), resultado: null, decisao_em: null, dib: null, dcb: null, exigencia_prazo: null, situacao_inss: "" };
    out.moraB88 = prazoMora(b88);
    out.esperado88 = somaDias(somaDias(hoje(), -10), 90);
    const b87 = { ...b88, especie: "B87" };
    out.moraB87 = prazoMora(b87);
    return out;
  }, CASO1);
  conf("o Concluir em do To Do de caso no INSS é retorno", r.retornoInss);
  conf("no Meu Dia ele entra com o selo Retorno, sem ser prazo fatal", r.agendaRet);
  conf("no quadro Prazos ele é a linha Retorno, de natureza lembrete", r.quadroRet);
  conf("o Concluir por hoje não o trata como prazo fatal aberto", r.fatalAberto === null);
  conf("no 🗓 Tarefas com Prazo a mesma data continua prazo fatal", r.outroFatal);
  conf("na lista pessoal ☕ (também fase outro) a data é retorno", r.cafeRetorno);
  conf("com a tarefa fatal da mesma data continua prazo fatal", r.tarefaFatal);
  conf("recurso ao CRPS que cai na segunda de carnaval vence nela (08/02/2027)", r.crpsCarnaval === "2027-02-08");
  conf("recurso ao CRPS que cai em Corpus Christi vence nele (27/05/2027)", r.crpsCorpus === "2027-05-27");
  conf("feriado em lei ainda prorroga: 25/12/2026 vai a 28/12/2026", r.crpsNatal === "2026-12-28");
  conf("exigência que cai no carnaval vence nele", r.exig === "2027-02-08");
  conf("mandado de segurança no carnaval antecipa para 05/02/2027", r.msCarnaval === "2027-02-05");
  conf("a apelação não conta o carnaval como dia útil", r.apCarnaval === "2027-03-02");
  conf("BPC do idoso tem prazo de análise de 90 dias da DER", r.moraB88 && r.moraB88.data === r.esperado88 && !r.moraB88.pericia);
  conf("BPC da pessoa com deficiência continua esperando as avaliações", r.moraB87 === null);
  await nav.close(); s.close();
  const n = ok.filter(x => x[1]).length;
  ok.forEach(([t, v]) => console.log(`${v ? "✓" : "✗"} ${t}`));
  if (erros.length) console.log(erros.join("\n"));
  console.log(`${n}/${ok.length}`);
  process.exit(n === ok.length ? 0 : 1);
})();
