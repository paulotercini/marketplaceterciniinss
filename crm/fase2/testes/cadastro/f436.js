// F436 · as ideias do Tiimo aprovadas pelo Paulo (07.11.2026): o Hoje por período, a conta do dia, as Sugeridas para
// hoje e o ⚡ com IA (Edge Function anotacao_ia fingida). Molde: f382.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, EU } = require("./fixturas");
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
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  const ia = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (/functions\/v1\/anotacao_ia/.test(u)) { ia.push(JSON.parse(rota.request().postData() || "{}"));
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ cliente: "", caso_id: "", anotacao: "Juntada: laudo entregue no balcão.",
        juntada: true, lembrete_data: "2099-01-15", lembrete_texto: "ligar ao cliente", data_duvidosa: true, motivo_duvida: "sexta sem data" }) }); }
    if (rota.request().method() !== "GET") return rota.fulfill({ status: 201, contentType: "application/json", body: "[]" });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FIX[t] || []) });
  });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);

  // 1. o Hoje por período e o tempo estimado
  const per = await p.evaluate(() => {
    const hj = hoje(), cli = D.clientes[0];
    const ev = {data: hj, cli, ev: {data_hora: hj + "T17:30:00Z", tipo: "Perícia médica"}, selo: "Perícia", resumo: "perícia às 14h30", quem: [], donos: []};
    const pz = {data: hj, cli, fatal: true, selo: "Prazo", resumo: "Apresentar réplica", quem: [], donos: []};
    const at = {atend: true, hora: "09:00", tipo: "001", cli: null, nome: "Fulano de Tal"};
    const d = document.createElement("div"); d.innerHTML = hojePorPeriodo([ev, pz], [at]);
    const so = document.createElement("div"); so.innerHTML = hojePorPeriodo([pz], []);
    return {per: [...d.querySelectorAll(".md-per")].map(h => h.textContent), atend: d.querySelectorAll(".md-atend").length,
      semHora: so.querySelectorAll(".md-per").length, minutos: [minutosDe(ev), minutosDe(pz), minutosDe(at), minutosDe({...at, tipo: "002"}), minutosDe({data: hj, resumo: "conferir o andamento"})],
      fmt: [fmtMin(45), fmtMin(185)]};
  });
  conf("Manhã, Tarde e A qualquer hora, nessa ordem", per.per.join("|") === "Manhã|Tarde|A qualquer hora");
  conf("o atendimento da Agenda entra na hora dele", per.atend === 1);
  conf("sem nada com hora, o Hoje fica como era", per.semHora === 0);
  conf("perícia 60, réplica 120, 001 45, 002 30, conferir 5", per.minutos.join(",") === "60,120,45,30,5");
  conf("45 min e 3 h 5 min", per.fmt.join("|") === "45 min|3 h 5 min");

  // 2. a tabela das Configurações vale por cima da padrão
  const cfg = await p.evaluate(() => { D.config.set("dur_tarefas", JSON.stringify({replica: 90})); const r = minutosDe({resumo: "réplica"}); D.config.delete("dur_tarefas"); return r; });
  conf("a réplica ajustada a 90 minutos nas Configurações", cfg === 90);

  // 3. a conta do dia
  const conta = await p.evaluate((eu) => {
    const hj = hoje(), d = document.createElement("div");
    d.innerHTML = contaDoDia([{data: hj, resumo: "réplica"}, {data: hj, resumo: "conferir"}], [{atend: true, tipo: "001", hora: "09:00"}], eu);
    return {txt: d.textContent.replace(/\s+/g, " "), pct: d.querySelector("[role=progressbar]").getAttribute("aria-valuenow"), vazio: contaDoDia([], [], "ninguem")};
  }, EU);
  conf("3 itens hoje e cerca de 2 h 50 min", /3 itens hoje/.test(conta.txt) && /2 h 50 min/.test(conta.txt));
  conf("a barra diz a porcentagem concluída", /^\d+$/.test(conta.pct));
  conf("dia sem item nem concluído, sem conta", conta.vazio === "");

  // 4. as sugeridas: dispensar tira, o motivo novo volta
  const sug = await p.evaluate((eu) => {
    const k = ativos().find(x => !ehPreCaso(x)); if (!k) return null;
    D.atrDoCaso.set(k.id, [eu]); k.trilha = {...(k.trilha || {}), velha: true}; k.etapa = k.etapa || "aguardando análise";
    const tem = () => sugeridasDoDia(eu).some(s => s.k && s.k.id === k.id && s.ch.startsWith("etapa:"));
    const antes = tem(); guardar("crm_sug_fora", JSON.stringify([`etapa:${k.id}:${k.etapa}`])); const depois = tem();
    k.etapa = k.etapa + " (outra)"; const volta = tem(); guardar("crm_sug_fora", "[]");
    const html = secaoSugeridas();
    return {antes, depois, volta, botoes: /data-sug-add/.test(html) && /data-sug-fora/.test(html)};
  }, EU);
  conf("a etapa desatualizada vira sugestão do dono do caso", sug && sug.antes);
  conf("Dispensar tira a sugestão", sug && !sug.depois);
  conf("com outra etapa, a sugestão volta", sug && sug.volta);
  conf("cada sugerida tem Adicionar e ✕", sug && sug.botoes);

  // 5. o Meu Dia abre com tudo isso sem erro
  await p.evaluate(() => { visao = "meudia"; render(); });
  await p.waitForTimeout(400);
  conf("o Meu Dia abre sem erro", !erros.length);

  // 6. o ⚡ com IA: propõe, marca a data duvidosa e não grava sem o Gravar
  await p.evaluate((cliId) => anotacaoRapida("", cliId), (await p.evaluate(() => D.clientes[0].id)));
  await p.fill("#ar-texto", "trouxe o laudo, CPF 123.456.789-00, ligar sexta");
  await p.click("button:has-text('Organizar com a IA')");
  await p.waitForSelector(".ar-ia");
  const prop = await p.evaluate(() => ({txt: document.querySelector(".ar-ia").textContent.replace(/\s+/g, " "),
    lem: document.getElementById("ar-lem").value, duv: !!document.querySelector(".ar-ia-duv"), texto: document.getElementById("ar-texto").value}));
  conf("o pedido leva a data de hoje e os casos do cliente", ia.length === 1 && ia[0].hoje && Array.isArray(ia[0].casos));
  conf("a proposta mostra a anotação e a juntada", /Juntada: laudo entregue/.test(prop.txt) && /Juntada de documento/.test(prop.txt));
  conf("o lembrete vem com a data proposta", prop.lem === "2099-01-15");
  conf("a data duvidosa vem marcada para conferir", prop.duv);
  conf("nada muda no campo antes do Gravar", /ligar sexta/.test(prop.texto));
  await p.click(".ar-ia button:has-text('Corrigir')");
  conf("Corrigir devolve a anotação ao campo e fecha a proposta", await p.evaluate(() => document.getElementById("ar-texto").value.startsWith("Juntada:") && !document.querySelector(".ar-ia")));
  conf("sem erro de página", !erros.length);

  let pts = 0; ok.forEach(([n, v]) => { console.log((v ? "✔ " : "✘ ") + n); if (v) pts++; });
  console.log(`\n${pts}/${ok.length}`); if (erros.length) console.log(erros.join("\n"));
  await nav.close(); s.close(); process.exit(pts === ok.length ? 0 : 1);
})();
