// F180 — Identificação no estilo da Análise de Direito: topo "Cadastro N%
// completo" com um chip por campo em branco (cadFaltando) que abre o editor,
// o cartão do nome como na F163 e três cartões (Documentos e acesso, Dados
// pessoais, Contato), uma linha por campo. Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CLI_VAZIO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const RETRATO = process.env.RETRATO_DIR;

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
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") return rota.fulfill({ status: 204, body: "" });
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
  const abrir = async cli => {
    await p.evaluate(x => abrirFicha(x).then(() => { abaAtiva = 0; subCad = "identificacao"; repintarFicha(); }), cli);
    await p.waitForSelector(".idf .idf-comp");
  };

  await abrir(CLI_CHEIO);
  const falta = await p.evaluate(cli => cadFaltando(D.cliPorId.get(cli)), CLI_CHEIO);
  const comp = await p.textContent(".idf-comp");
  const chips = await p.$$eval(".idf-chip", bs => bs.map(b => ({ t: b.textContent.trim(), tag: b.tagName })));
  conf(`cliente sem endereço: 83% completo e um chip (${JSON.stringify(falta)})`,
    /Cadastro 83% completo/.test(comp) && chips.length === falta.length && chips.length === 1 && chips[0].t === "endereço" && chips[0].tag === "BUTTON");
  conf("a barra diz 83", (await p.getAttribute('.idf-comp [role="progressbar"]', "aria-valuenow")) === "83");
  const cartoes = await p.$$eval(".idf-card", cs => cs.map(c => ({ h: c.querySelector("h3").textContent,
    rots: [...c.querySelectorAll(".cad-campo > label")].map(l => l.textContent.replace(/\s+/g, " ").trim()) })));
  conf("três cartões na ordem: Documentos e acesso, Dados pessoais, Contato",
    cartoes.length === 3 && cartoes[0].h === "Documentos e acesso" && cartoes[1].h === "Dados pessoais" && cartoes[2].h === "Contato");
  const tem = (i, rx) => cartoes[i].rots.some(r => rx.test(r));
  conf("Documentos e acesso: CPF, Senha Meu INSS, PIS/NIT, CNIS, Pasta",
    [/^CPF/, /Senha Meu INSS/, /PIS \/ NIT/, /^CNIS/, /Pasta do cliente/].every(rx => tem(0, rx)));
  conf("Dados pessoais: Nascimento, Sexo, Estado civil, Profissão, Nome da mãe, Origem",
    [/Nascimento/, /^Sexo/, /Estado civil/, /Profissão/, /Nome da mãe/, /^Origem/].every(rx => tem(1, rx)));
  conf("Contato: Telefones e Endereço", tem(2, /Telefones/) && tem(2, /Endereço/));
  conf("os ids de antes continuam",
    await p.evaluate(() => ["campo-nome", "campo-cpf", "campo-dn", "campo-representante", "campo-endereco", "cad-tel-novo", "cad-tel-obs", "parc-sel-id", "cad-origem"]
      .every(id => document.getElementById(id))));
  conf("o cartão do nome fica em cima, com o representante e a parceria",
    await p.evaluate(() => { const n = document.querySelector(".idf-nome"); const c = document.querySelector(".idf-card");
      return n && c && n.getBoundingClientRect().bottom <= c.getBoundingClientRect().top + 1
        && /representante legal/.test(n.textContent) && !!n.querySelector(".cad-parc #parc-sel-id"); }));
  const linha = await p.evaluate(() => { const x = document.querySelector(".idf-card .cad-campo:has(#campo-cpf)");
    const l = x.querySelector("label").getBoundingClientRect(), v = x.querySelector(".cad-v").getBoundingClientRect();
    return { lado: v.left > l.right - 1, mesmaLinha: Math.abs(l.top + l.height / 2 - (v.top + v.height / 2)) < 12 }; });
  conf("cada campo é uma linha: rótulo à esquerda, valor à direita", linha.lado && linha.mesmaLinha);
  conf("campo em branco: botão preencher, tracejado e vermelho-claro",
    await p.evaluate(() => { const b = document.querySelector("#cad-nome_mae .cad-preencher");
      if (!b || b.tagName !== "BUTTON") return false; const st = getComputedStyle(b);
      return st.borderStyle === "dashed" && st.backgroundColor === "rgb(253, 236, 236)" && b.getBoundingClientRect().height >= 40; }));
  conf("telefone com a marca WhatsApp, abrir conversa e + telefone",
    await p.evaluate(() => { const t = document.querySelector(".idf-card .cad-tel"); return /WhatsApp/.test(t.textContent) && /abrir conversa/.test(t.textContent)
      && /telefone/.test(document.querySelector('.idf-card button[onclick^="novoTelefone"]').textContent); }));
  conf("Parentes ou amigos continua recolhido atrás do +",
    await p.evaluate(() => { const b = [...document.querySelectorAll("button.cad-mini")].find(x => /Parentes ou amigos/.test(x.textContent));
      return b && b.getAttribute("aria-expanded") === "false" && ![...document.querySelectorAll(".cad-tit")].some(x => /Parentes ou Amigos/i.test(x.textContent)); }));
  if (RETRATO) await p.screenshot({ path: path.join(RETRATO, "identificacao180.png"), fullPage: true });
  await p.click('.idf-chip[data-falta="endereco"]');
  await p.waitForTimeout(300);
  conf("o chip endereço abre o editor do endereço", !!(await p.$("#campo-endereco #end-cep")));

  await abrir(CLI_VAZIO);
  const comp2 = await p.textContent(".idf-comp");
  const chips2 = await p.$$eval(".idf-chip", bs => bs.map(b => b.textContent.trim()));
  conf(`cliente vazio: 17% e cinco chips (${chips2.join(", ")})`,
    /Cadastro 17% completo/.test(comp2) && chips2.join("|") === "CPF|nascimento|estado civil|profissão|endereço");
  await p.click('.idf-chip[data-falta="cpf"]');
  await p.waitForTimeout(300);
  conf("o chip CPF abre o editor do CPF", !!(await p.$("#campo-cpf #ed-campo")));
  await abrir(CLI_VAZIO);
  await p.click('.idf-chip[data-falta="estado_civil"]');
  await p.waitForTimeout(300);
  conf("o chip estado civil abre a lista do estado civil", !!(await p.$("#cad-estado_civil select#cad-ed")));
  await abrir(CLI_VAZIO);
  await p.click("#cad-profissao .cad-preencher");
  await p.waitForTimeout(300);
  conf("o botão preencher abre o editor do campo", !!(await p.$("#cad-profissao input#cad-ed")));

  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
