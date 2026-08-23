// O que a captura de tela não prova: que os cartões novos REAGEM ao clique.
// Seis undefined da F9.1 passaram por teste de texto e só apareceram na
// imagem; aqui é o contrário — a imagem não diz se o clique abre o editor.
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
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));

  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_subcad", "identificacao");
  }, [SUPA, SESSAO]);

  const gravados = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") { gravados.push([m, t, rota.request().postData()]); return rota.fulfill({ status: 204, body: "" }); }
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });

  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error") erros.push("console: " + m.text()); });
  p.on("dialog", async d => { await d.accept("senha-ficticia-123"); });   // o prompt da senha

  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);

  const abrir = async id => {
    await p.evaluate(x => abrirFicha(x), id);
    await p.waitForSelector('button.mt[data-vv="0"]');
    await p.click('button.mt[data-vv="0"]');
    await p.evaluate(() => irSubCad("identificacao"));
    await p.waitForSelector('.painel[data-p="0"].ativo .cad-cartao');
    await p.waitForTimeout(250);
  };
  const ok = [];
  const conf = (nome, cond) => { ok.push([nome, !!cond]); };

  // 1. o cartão do CPF inteiro abre o editor (antes só o lápis de 4px abria)
  await abrir(CLI_CHEIO);
  // no rótulo, não no valor: o valor do CPF tem o botão "copiar" no meio, e o
  // clique do Playwright cai no centro do elemento — em cima do botão
  await p.click('.painel[data-p="0"].ativo #campo-cpf + *, .painel[data-p="0"].ativo .cad-campo:has(#campo-cpf) label');
  await p.waitForTimeout(200);
  conf("clique no cartão do CPF abre o editor", await p.$('#ed-campo'));

  // 2. o cartão do nascimento também
  await abrir(CLI_CHEIO);
  await p.click('.painel[data-p="0"].ativo #campo-dn');
  await p.waitForTimeout(200);
  conf("clique no cartão do nascimento abre o editor", await p.$('#ed-campo'));

  // 3. a senha existente mostra ••••• e os três botões
  await abrir(CLI_CHEIO);
  const senha = await p.evaluate(() => {
    const cx = [...document.querySelectorAll('.painel[data-p="0"].ativo .cad-campo')]
      .find(x => /SENHA MEU INSS/i.test(x.innerText));
    return cx ? { txt: cx.innerText.replace(/\n/g, " "), amarelo: getComputedStyle(cx).backgroundColor,
                  tracejado: getComputedStyle(cx).borderStyle } : null;
  });
  conf("senha existente: mascarada com copiar/ver/trocar",
    senha && /•/.test(senha.txt) && /copiar/.test(senha.txt) && /ver/.test(senha.txt) && /trocar/.test(senha.txt));
  conf("senha NÃO está em fundo amarelo", senha && senha.amarelo === "rgb(255, 255, 255)");

  // 4. sem senha: convite tracejado e o clique abre o prompt e grava
  await abrir(CLI_VAZIO);
  const vazia = await p.evaluate(() => {
    const cx = [...document.querySelectorAll('.painel[data-p="0"].ativo .cad-campo')]
      .find(x => /SENHA MEU INSS/i.test(x.innerText));
    return cx ? { txt: cx.innerText.replace(/\n/g, " "), tracejado: getComputedStyle(cx).borderStyle,
                  clicavel: getComputedStyle(cx).cursor } : null;
  });
  conf("sem senha: convida a cadastrar", vazia && /clique para cadastrar/.test(vazia.txt));
  conf("sem senha: borda tracejada", vazia && vazia.tracejado === "dashed");
  conf("sem senha: cartão clicável", vazia && vazia.clicavel === "pointer");
  await p.evaluate(() => {
    const cx = [...document.querySelectorAll('.painel[data-p="0"].ativo .cad-campo')]
      .find(x => /SENHA MEU INSS/i.test(x.innerText));
    cx.click();
  });
  await p.waitForTimeout(500);
  const gravouSenha = gravados.find(g => g[0] === "POST" && g[1] === "credenciais");
  conf("clique na senha vazia grava a credencial", gravouSenha
    && JSON.parse(gravouSenha[2]).cliente_id === CLI_VAZIO
    && JSON.parse(gravouSenha[2]).tipo === "meu_inss");

  // 5. o endereço vazio não estica ao lado dos telefones
  await abrir(CLI_CHEIO);
  const alturas = await p.evaluate(() => {
    const g = document.querySelector('.painel[data-p="0"].ativo .cad-grade');
    const end = [...g.querySelectorAll(".cad-campo")].find(x => /^ENDEREÇO/i.test(x.innerText));
    const tel = [...g.querySelectorAll(".cad-campo")].find(x => /^TELEFONES/i.test(x.innerText));
    return { end: Math.round(end.getBoundingClientRect().height), tel: Math.round(tel.getBoundingClientRect().height) };
  });
  conf(`endereço vazio não copia a altura dos telefones (${alturas.end}px vs ${alturas.tel}px)`,
    alturas.end < alturas.tel * 0.75);

  // 6. o botão copiar do CPF não dispara o editor junto
  await abrir(CLI_CHEIO);
  await p.click('.painel[data-p="0"].ativo #campo-cpf .cad-mini');
  await p.waitForTimeout(200);
  conf("copiar o CPF não abre o editor por tabela", !(await p.$('#ed-campo')));

  console.log("=== interação ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
