// F456 · Lista de espera da agenda (onda 1, aprovada pelo Paulo em 08.11.2026): quem cabe na vaga liberada, a ordem,
// o quadro, a faixa da vaga liberada, a oferta (estado e mensagem) e o recusou que devolve a vaga ao próximo.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const dia = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" }); };
// a vaga fica numa quarta-feira adiante, para valer o filtro de dias
let D3 = 3; while (new Date(dia(D3) + "T12:00:00").getDay() !== 3) D3++;
const DATA = dia(D3);
FIX.agenda_espera = [
  { id: "e1", nome: "Maria Fictícia da Espera", telefone: "16999990001", tipo: "001", profs: ["amanda", "paulo"], dias: [1, 2, 3, 4, 5], periodos: ["manha", "tarde"], estado: "aguardando", ofertas: [], criado_em: dia(-5) + "T10:00:00Z" },
  { id: "e2", nome: "João Fictício Antecipa", telefone: "16999990002", tipo: "001", profs: ["amanda"], dias: [3], periodos: ["manha"], marcado: dia(D3 + 20), estado: "aguardando", ofertas: [], criado_em: dia(-5) + "T09:00:00Z" },
  { id: "e3", nome: "Ana Fictícia Só Tarde", telefone: "16999990003", tipo: "001", profs: ["amanda"], dias: [3], periodos: ["tarde"], estado: "aguardando", ofertas: [], criado_em: dia(-9) + "T09:00:00Z" },
  { id: "e4", nome: "Pedro Fictício do Marcos", telefone: "16999990004", tipo: "001", profs: ["marcos"], dias: [3], periodos: ["manha"], estado: "aguardando", ofertas: [], criado_em: dia(-10) + "T09:00:00Z" },
];

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const erros = [], patches = [];
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const q = rota.request(), u = q.url();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (q.method() === "PATCH") {
      patches.push([u, q.postData()]);
      const id = (u.match(/id=eq\.([^&]+)/) || [])[1], e = FIX.agenda_espera.find(x => x.id === id);
      if (e) Object.assign(e, JSON.parse(q.postData()));
      return rota.fulfill({ status: 204, body: "" });
    }
    if (q.method() !== "GET") return rota.fulfill({ status: 201, contentType: "application/json", body: "[]" });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    let corpo = FIX[t] || [];
    if (t === "agenda_espera") corpo = corpo.filter(e => ["aguardando", "oferta"].includes(e.estado));
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  const p = await ctx.newPage();
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.evaluate(async (DATA) => {
    window.zapDoNumero = async n => { window._zapNum = n; };
    agq.prof = "amanda";
    agq.disp = { dias: [{ data: DATA, livres: { "001": [{ inicio: "09:00", fim: "09:45", vaga: true, eventoId: "ev-manha", profissional: "amanda" }],
      "002": [{ inicio: "14:00", fim: "14:30", vaga: true, eventoId: "ev-tarde", profissional: "amanda", tipoFixo: false }] } }] };
    await carregarEspera(true);
  }, DATA);

  const r = await p.evaluate(DATA => {
    const d = agq.disp.dias[0], [m, t] = [vagasDoDia(d).find(x => x.eventoId === "ev-manha"), vagasDoDia(d).find(x => x.eventoId === "ev-tarde")];
    return { manha: quemCabe(d, m).map(e => e.id), tarde: quemCabe(d, t).map(e => e.id), ordem: ordemEspera(agq.espera).map(e => e.id) };
  }, DATA);
  conf("a vaga da manhã cabe a Maria e a João, não à Ana (tarde) nem ao Pedro (Marcos)", JSON.stringify(r.manha) === '["e1","e2"]');
  conf("a vaga sem código (tipo livre) da tarde cabe a Maria e à Ana", JSON.stringify(r.tarde.sort()) === '["e1","e3"]');
  conf("no mesmo dia, quem está sem horário vem antes de quem quer antecipar", r.ordem.indexOf("e1") < r.ordem.indexOf("e2"));
  conf("quem entrou antes na lista vem primeiro", r.ordem[0] === "e4" && r.ordem[1] === "e3");

  const html = await p.evaluate(() => quadroEspera(agq.disp.dias[0]));
  conf("o quadro mostra a lista com a contagem", /Lista de espera · 4/.test(html));
  conf("o quadro diz quem cabe e oferece", /cabe às 9h|cabe às 09/.test(html) && /oferecerEspera\('e1'/.test(html));
  conf("os botões dizem uma palavra", /Oferecer<span class="sr-only">/.test(html) && /Incluir<span class="sr-only">/.test(html));

  const faixa = await p.evaluate(DATA => { agq.liberada = { id: "ev-manha", data: DATA }; return faixaLiberada(); }, DATA);
  conf("a vaga liberada abre a faixa com a primeira pessoa que cabe", /Vaga liberada/.test(faixa) && /a primeira é Maria Fictícia da Espera/.test(faixa));

  await p.evaluate(DATA => oferecerEspera("e1", "ev-manha", DATA), DATA);
  await p.waitForTimeout(900);
  const pe = patches.find(x => /id=eq\.e1/.test(x[0]));
  const corpo = pe && JSON.parse(pe[1]);
  conf("oferecer grava o estado oferta e a oferta com o horário", corpo && corpo.estado === "oferta" && corpo.ofertas[0].eventoId === "ev-manha" && corpo.ofertas[0].inicio === "09:00");
  conf("a vaga perto (até amanhã não) dá 30 minutos para responder", corpo && Math.round((new Date(corpo.ofertas[0].ate) - new Date(corpo.ofertas[0].em)) / 60000) === 30);
  conf("a oferta abre a conversa do telefone da lista", await p.evaluate(() => window._zapNum) === "16999990001");
  const msg = await p.evaluate(DATA => msgOferta(agq.espera.find(e => e.id === "e1"), vagasDoDia(agq.disp.dias[0])[0], DATA, new Date()), DATA);
  conf("a mensagem é formal, com a advogada, o dia e a hora", /^(Bom dia|Boa tarde|Boa noite), Maria\. Surgiu um horário com a Dra\. Amanda na quarta-feira/.test(msg) && /às 09h00/.test(msg) && !/—/.test(msg));
  conf("com a oferta aberta a faixa some e a vaga não é oferecida a outro", await p.evaluate(() => faixaLiberada()) === "" && !/oferecerEspera\('e2'/.test(await p.evaluate(() => quadroEspera(agq.disp.dias[0]))));
  conf("a linha em oferta tem Aceitou e Recusou", /em oferta/.test(await p.evaluate(() => quadroEspera(agq.disp.dias[0]))) && /recusouEspera\('e1'/.test(await p.evaluate(() => quadroEspera(agq.disp.dias[0]))));

  await p.evaluate(() => recusouEspera("e1")); await p.waitForTimeout(300);
  const f2 = await p.evaluate(() => faixaLiberada());
  conf("recusou devolve a pessoa à lista com a resposta registrada", FIX.agenda_espera[0].estado === "aguardando" && FIX.agenda_espera[0].ofertas[0].resposta === "recusou");
  conf("o recusou devolve a vaga liberada à faixa", /Vaga liberada/.test(f2));

  conf("nenhum erro na página", !erros.length);
  await nav.close(); s.close();
  const falhas = ok.filter(x => !x[1]);
  ok.forEach(([n, v]) => console.log((v ? "ok  " : "FALHA ") + n));
  if (erros.length) console.log(erros.join("\n"));
  console.log(`${ok.length - falhas.length}/${ok.length}`);
  process.exit(falhas.length ? 1 : 0);
})();
