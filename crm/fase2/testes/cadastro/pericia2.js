// Integração, etapa 2 — a perícia no cartão dos andamentos, "+ perícia",
// perícia no Caso completo e no Pede ação, laudo ligado à perícia.
// Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CLI_VAZIO } = require("./fixturas");
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
    window.__abertos = []; window.open = (u) => { window.__abertos.push(u); return null; };
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (rota.request().method() === "POST" && /\/rest\/v1\/andamentos\b/.test(u)) {
      const b = JSON.parse(rota.request().postData() || "{}");
      return rota.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify([{ id: "and-novo", criado_em: new Date().toISOString(), ...b }]) });
    }
    if (rota.request().method() !== "GET") return rota.fulfill({ status: 204, body: "" });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    let corpo = FIX[t] || [];
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
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  const K = await p.evaluate(cli => {
    const k = (D.casosDoCliente.get(cli) || [])[0]; k.fase = "judicial"; k.pje_links = { "1º grau": "https://pje1g.trf3.jus.br/pje/ficticio" };
    const dia = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString("sv"); };
    D.eventos.push(
      { id: "ev-fut", caso_id: k.id, tipo: "Perícia", status: "agendada", data_hora: dia(12) + "T09:00:00-03:00", local: "JEF fictício, sala 2", obs: null },
      { id: "ev-avis", caso_id: k.id, tipo: "Avaliação social", status: "agendada", data_hora: dia(20) + "T14:00:00-03:00", local: null, obs: "📞 avisado" },
      { id: "ev-pass", caso_id: k.id, tipo: "Perícia", status: "agendada", data_hora: dia(-30) + "T10:00:00-03:00", local: null, obs: null },
      { id: "ev-canc", caso_id: k.id, tipo: "Perícia", status: "cancelada", data_hora: dia(-60) + "T10:00:00-03:00", local: null, obs: null });
    D._andsFicha = [...(D._andsFicha || []), { id: "and-laudo", caso_id: k.id, origem: "pje", texto: "PJe (1º grau): Juntada de laudo pericial.", criado_em: dia(-10) + "T12:00:00-03:00", andamentos_lidos: [] }];
    abaAtiva = 3; repintarFicha(); return { id: k.id, futura: dia(12) };
  }, CLI_CHEIO);
  await p.waitForTimeout(300);
  const ab = await p.evaluate(() => { const P = document.querySelector('.painel[data-p="3"]');
    const card = id => { const l = P.querySelector(`li.tl-pericia[data-ev="${id}"]`); return l ? { bar: (l.querySelector(".tl-barra") || {}).textContent || "", txt: l.textContent.replace(/\s+/g, " "), forte: (l.querySelector(".tl-bt.forte") || {}).textContent || "" } : null; };
    return { fut: card("ev-fut"), avis: card("ev-avis"), pass: card("ev-pass"), canc: card("ev-canc"),
      form: !!P.querySelector("details.per-novo:not([open]) #ne-data"), velho: !!P.querySelector(".data-box"), ordem: [...P.querySelectorAll("li.tl-pericia")].map(l => l.dataset.ev).join(",") }; });
  conf("a aba Perícias usa o cartão oficial, sem o bloco roxo antigo", ab.fut && !ab.velho);
  conf("perícia futura sem aviso: Avisar cliente é o botão cheio, com Preparar, portal e mensagem", ab.fut && ab.fut.forte === "Avisar cliente" && /Preparar/.test(ab.fut.bar) && /Abrir no/.test(ab.fut.bar) && /Mensagem ao cliente/.test(ab.fut.bar) && /avisar o cliente/.test(ab.fut.txt));
  conf("depois do aviso, Preparar passa a ser o botão cheio", ab.avis && ab.avis.forte === "Preparar" && !/Avisar cliente/.test(ab.avis.bar) && /cliente avisado/.test(ab.avis.txt));
  conf("perícia que passou pede Compareceu e mostra o laudo juntado com o documento do processo", ab.pass && ab.pass.forte === "Compareceu" && /Laudo juntado em/.test(ab.pass.txt));
  conf("cancelada fica no histórico, sem ações e sem o laudo da outra", ab.canc && !ab.canc.bar && /cancelada/.test(ab.canc.txt) && !/Laudo/.test(ab.canc.txt));
  conf("o formulário de agendar fica atrás do + perícia", ab.form);
  conf(`as futuras vêm primeiro, depois as anteriores (${ab.ordem})`, ab.ordem === "ev-fut,ev-avis,ev-pass,ev-canc");
  const menu = await p.evaluate(() => [...document.querySelectorAll('li.tl-pericia[data-ev="ev-fut"] .tl-mais-it')].map(b => b.textContent.trim()));
  conf(`o ⋯ guarda Google Agenda, copiar e cancelar (${menu.join(" · ")})`, menu.length === 3 && /Google Agenda/.test(menu[0]) && /Cancelar/.test(menu[2]));
  if (process.env.SHOTS) await (await p.$('.painel[data-p="3"]')).screenshot({ path: path.join(process.env.SHOTS, "pericias.png") });

  // Preparar abre o seguimento com o roteiro da perícia
  await p.evaluate(() => prepararPericia("ev-fut")); await p.waitForTimeout(250);
  conf("Preparar abre o seguimento com o roteiro (atendimento, véspera, estudo)", await p.evaluate(() => !!document.getElementById("rot-atend") && segAberto && segAberto.prep === true));
  await p.evaluate(() => fecharCaixa());
  // Mensagem ao cliente: o lembrete pronto, para conferir
  await p.evaluate(() => msgPericia("ev-fut")); await p.waitForTimeout(150);
  conf("Mensagem ao cliente abre o lembrete pronto, editável", await p.evaluate(() => (document.getElementById("msg-and") || {}).value.length > 10));
  await p.evaluate(() => fecharCaixa());

  // Caso completo e Pede ação
  await p.evaluate(id => { casoSel = id; abaAtiva = 2; subAba = "tudo"; filtroTudo = "tudo"; repintarFicha(); }, K.id); await p.waitForTimeout(300);
  const cc = await p.evaluate(() => ({ n: document.querySelectorAll('.painel[data-p="2"] li.tl-pericia').length,
    acao: ((document.querySelector(".cc-acao-n") || {}).textContent || "").trim() }));
  conf(`no Caso completo a perícia é o mesmo cartão (${cc.n})`, cc.n === 3);
  await p.evaluate(() => { filtroTudo = "acao"; repintarFicha(); });
  const ac = await p.evaluate(() => [...document.querySelectorAll('.painel[data-p="2"] li.tl-pericia')].map(l => l.dataset.ev).sort().join(","));
  conf(`Pede ação conta a perícia sem aviso e a que passou sem confirmação (${ac})`, ac === "ev-fut,ev-pass");
  await p.evaluate(() => { filtroTudo = "tudo"; repintarFicha(); });

  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
