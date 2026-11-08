// F444 · Captura que entende a frase (proposta 3 do Todoist, aprovada pelo Paulo em 08.11.2026): no ⚡ e no campo de
// escrever, a data ("amanhã", "sex", "15/12", "em 10 dias"), o @ de quem faz e o * da estrela são lidos na hora, cada
// parte aparece destacada e o ✕ desfaz só ela.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const MEISSA = "e4440000-0000-0000-0000-000000000001";
FIX.colaboradores.push({ ...FIX.colaboradores[0], id: MEISSA, nome: "Meissa Fictícia", inicial: "M", papel: "colaborador", cargo: "recepcao", user_id: "u-f444" });

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const erros = [], patches = [], posts = [];
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  let n = 0;
  await ctx.route(SUPA + "/**", rota => {
    const q = rota.request(), u = q.url();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (q.method() === "PATCH") { patches.push([u, q.postData()]); return rota.fulfill({ status: 200, contentType: "application/json", body: "[]" }); }
    if (q.method() === "POST") {
      posts.push([u, q.postData() || ""]);
      if (/\/rest\/v1\/(andamentos|andamento_tarefas)\b/.test(u)) {
        const b = JSON.parse(q.postData() || "{}");
        return rota.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify([{ id: `f444-${++n}`, criado_em: new Date().toISOString(), ...b }]) });
      }
    }
    if (q.method() !== "GET") return rota.fulfill({ status: 204, body: "" });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  const p = await ctx.newPage();
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);

  // 1 · a leitura
  const r = await p.evaluate(() => {
    const prox = n => { const d = new Date(hoje() + "T12:00:00"); const f = (n - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate() + f); return d.toLocaleDateString("sv"); };
    const c = (t, l) => capturaDoTexto(t, l);
    return {
      sex: c("Cliente traz o RG sex", true).data, sexIso: prox(5),
      amanha: c("Ligar amanhã", true).data, amanhaIso: maisDias(1),
      dias: c("Retorno em 10 dias", true).data, diasIso: somaDias(hoje(), 10),
      dez: c("Trazer o laudo 15/12", true).data,
      ter: c("Verificar se vai ter o documento", false).data,
      hoje: c("Cliente veio hoje", true).data,
      pericia: c("Perícia em 15/12", true).data,
      campoSemVerbo: c("Cliente traz o RG sex", false).data,
      campoComVerbo: c("Verificar sex", false).data,
      quem: c("Pedir à @Meissa", true).quem, estrela: c("Urgente *", true).estrela, mult: c("2*3", true).estrela,
    };
  });
  conf(`"sex" é a próxima sexta (${r.sex && r.sex.iso})`, r.sex && r.sex.iso === r.sexIso && r.sex.trecho === "sex");
  conf(`"amanhã" mantém o acento no trecho destacado`, r.amanha && r.amanha.iso === r.amanhaIso && r.amanha.trecho === "amanhã");
  conf(`"em 10 dias" soma 10 dias`, r.dias && r.dias.iso === r.diasIso);
  conf(`"15/12" vira 15 de dezembro`, r.dez && /-12-15$/.test(r.dez.iso) && r.dez.trecho === "15/12");
  conf(`"ter o documento" não é terça`, !r.ter);
  conf(`"hoje" solto no ⚡ não vira lembrete`, !r.hoje);
  conf(`"perícia em 15/12" é evento, não lembrete`, !r.pericia);
  conf(`no campo de escrever, a data sem o verbo continua de fora`, !r.campoSemVerbo && r.campoComVerbo && r.campoComVerbo.trecho === "sex");
  conf(`"@Meissa" diz quem faz`, r.quem && r.quem.trecho === "@Meissa");
  conf(`"*" solto é a estrela, e "2*3" não`, r.estrela && !r.mult);

  // 2 · o ⚡
  const cli = await p.evaluate(k => D.casoPorId.get(k).cliente_id, CASO1);
  await p.evaluate(c => anotacaoRapida(null, c), cli);
  await p.waitForSelector("#ar-texto");
  await p.locator("#ar-imp").uncheck();
  await p.locator("#ar-texto").fill("Cliente traz o RG sex @Meissa *");
  await p.waitForTimeout(150);
  const marks = await p.locator("#ar-cap mark").allTextContents();
  conf(`as três partes aparecem destacadas (${marks})`, marks.join("|") === "sex|@Meissa|*");
  conf("o * marca a ⭐ do ⚡", await p.locator("#ar-imp").isChecked());
  conf("sem caso escolhido, o chip avisa que o lembrete precisa do caso", /precisa do caso/.test(await p.locator("#ar-cap").innerText()));
  await p.screenshot({ path: "f444-rapida.png" });
  await p.locator("#ar-cap .cap-it", { hasText: "@Meissa" }).locator("a").click();
  await p.waitForTimeout(100);
  conf("o ✕ desfaz só o @", (await p.locator("#ar-cap mark").allTextContents()).join("|") === "sex|*");
  await p.locator("#ar-texto").press("End"); await p.locator("#ar-texto").type(" ok");
  await p.waitForTimeout(100);
  conf("o desfeito não volta enquanto o trecho continua", !(await p.locator("#ar-cap mark").allTextContents()).includes("@Meissa"));
  await p.selectOption("#ar-caso", CASO1);
  const nP = posts.length;
  await p.evaluate(() => salvarAnotacaoRapida()); await p.waitForTimeout(700);
  const novos = posts.slice(nP);
  const and = novos.find(([u]) => /\/andamentos\b/.test(u) && !/tarefas/.test(u));
  const tf = novos.find(([u]) => /andamento_tarefas/.test(u));
  conf("a anotação grava sem o *", and && JSON.parse(and[1]).texto === "Cliente traz o RG sex @Meissa ok");
  conf("a data vira o lembrete de quem escreveu (o @ foi desfeito)", tf && JSON.parse(tf[1]).lembrar_em === r.sexIso && JSON.parse(tf[1]).natureza === "lembrete");
  conf("o * marca o caso como importante", patches.some(([u, b]) => u.includes(CASO1) && b.includes('"importante":true')));

  // 3 · o campo de escrever
  await p.evaluate(async ([c, k]) => { await abrirFicha(c); casoSel = k; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); }, [cli, CASO1]);
  await p.evaluate(k => { D.casoPorId.get(k).importante = false; }, CASO1);
  await p.waitForSelector("#and-texto");
  await p.fill("#and-texto", "Verificar amanhã com o cliente @Meissa *");
  await p.waitForTimeout(200);
  const m2 = await p.locator("#and-prazo-chip mark").allTextContents();
  conf(`no campo de escrever as três partes aparecem (${m2})`, m2.join("|") === "amanhã|@Meissa|*");
  conf("com o @ de outra pessoa, a data é tarefa dela", /amanhã\s*tarefa/.test(await p.locator("#and-prazo-chip").innerText()));
  await p.screenshot({ path: "f444-campo.png" });
  const nP2 = posts.length, nPa = patches.length;
  await p.evaluate(k => novoAndamento(k), CASO1); await p.waitForTimeout(900);
  const nv = posts.slice(nP2);
  const and2 = nv.find(([u]) => /\/andamentos\b/.test(u) && !/tarefas|lidos/.test(u));
  const tf2 = nv.find(([u]) => /andamento_tarefas/.test(u));
  conf("o andamento grava sem o *", and2 && JSON.parse(and2[1]).texto === "Verificar amanhã com o cliente @Meissa");
  conf("a data vira a tarefa da Meissa", tf2 && JSON.parse(tf2[1]).colaborador_id === MEISSA && JSON.parse(tf2[1]).natureza === "compromisso" && JSON.parse(tf2[1]).lembrar_em === r.amanhaIso);
  conf("o * marca o caso como importante", patches.slice(nPa).some(([u, b]) => u.includes(CASO1) && b.includes('"importante":true')));
  conf("sem erro de página", !erros.length);

  await nav.close(); s.close();
  for (const [nome, v] of ok) console.log((v ? "✔ " : "✘ ") + nome);
  if (erros.length) console.log(erros.join("\n"));
  const f = ok.filter(x => !x[1]).length;
  console.log(`\n${ok.length - f}/${ok.length}`);
  process.exit(f ? 1 : 0);
})();
