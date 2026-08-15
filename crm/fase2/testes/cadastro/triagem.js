// F10 — a sub-aba Triagem. Prova as duas metades: a leitura automática que o
// CRM faz do próprio banco, e a marcação humana que fica com autoria e data.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CLI_VAZIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

// um cliente carregado: processo judicial, recurso no CRPS, BPC com CadÚnico
// vencido, benefício em pagamento e protocolo no INSS — os cinco passos que o
// sistema responde sozinho, todos acesos ao mesmo tempo
const CLI_CHEIO2 = "c0000000-0000-0000-0000-000000000005";
FIX.clientes.push({ ...FIX.clientes[1], id: CLI_CHEIO2, nome: "Genoveva Ficticia Alves",
  cpf: "55566677788", aposentado: 1 });
FIX.casos.push(
  { ...FIX.casos[0], id: "b0000000-0000-0000-0000-00000000000a", cliente_id: CLI_CHEIO2,
    fase: "judicial", processo: "00000011420264036120", titulo: "Aposentadoria por idade rural",
    beneficio: "Aposentadoria por idade rural", protocolos: ["1234567890"] },
  { ...FIX.casos[0], id: "b0000000-0000-0000-0000-00000000000b", cliente_id: CLI_CHEIO2,
    fase: "conselho", titulo: "BPC ao idoso", beneficio: "BPC LOAS ao idoso",
    especie: "B88", crps_nups: ["44233139765202537"], cadunico: "2022-01-10", protocolos: [] },
  { ...FIX.casos[0], id: "b0000000-0000-0000-0000-00000000000c", cliente_id: CLI_CHEIO2,
    fase: "pagamento", titulo: "Auxílio-acidente", nb: "1234567890", protocolos: [] });

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
    localStorage.setItem("crm_subcad", "triagem");
  }, [SUPA, SESSAO]);
  const gravados = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      gravados.push({ tabela: t, corpo: JSON.parse(rota.request().postData() || "{}") });
      return rota.fulfill({ status: 204, body: "" });
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

  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  const abrir = async id => {
    await p.evaluate(x => abrirFicha(x), id);
    // cliente com mais de um caso ativo abre o modal "escolher processo", que
    // segura a pintura (trava conhecida, cowork/04). Escolhe o primeiro e segue.
    await p.evaluate(() => {
      const ks = D.casosDoCliente.get(clienteAberto) || [];
      if (ks.length > 1) {
        casoSel = ks[0].id;
        const m = document.getElementById("modal");
        if (m) { m.style.display = "none"; m.innerHTML = ""; }
        pintarFicha();
      }
    });
    await p.waitForSelector('button.mt[data-vv="0"]');
    await p.click('button.mt[data-vv="0"]');
    await p.evaluate(() => irSubCad("triagem"));
    await p.waitForSelector('.painel[data-p="0"].ativo .tri-passo');
    await p.waitForTimeout(250);
  };

  await abrir(CLI_CHEIO2);
  const passos = await p.evaluate(() =>
    [...document.querySelectorAll('.painel[data-p="0"].ativo .tri-passo')].map(x => ({
      tit: x.querySelector(".tri-tit b").innerText.trim(),
      leitura: x.querySelector(".tri-leitura").innerText.replace(/\n/g, " · "),
      cor: [...x.querySelector(".tri-leitura").classList].filter(c => c !== "tri-leitura")[0],
    })));
  // A F17 acrescenta os pontos da ESPÉCIE entre o passo 7 e a conclusão. Este
  // cliente é rural, então são os oito fixos mais os quatro do rural, e a
  // conclusão continua sendo o último — é isso que o teste tem de garantir.
  conf(`os oito fixos abrem a lista, na ordem (${passos.length} no total)`,
    passos.length >= 8 && passos[0].tit === "CNIS"
    && passos[6].tit === "Requerimentos anteriores"
    && passos[passos.length - 1].tit === "Conclusão");

  const por = t => passos.find(x => x.tit === t) || {};
  conf(`acha o processo judicial (${JSON.stringify(por("Ação judicial anterior").leitura.slice(0, 60))})`,
    /1 caso\(s\) com processo judicial/.test(por("Ação judicial anterior").leitura)
    && por("Ação judicial anterior").cor === "alerta");
  conf("acha o recurso no CRPS", /1 recurso\(s\) no Conselho/.test(por("Recurso no CRPS").leitura));
  conf(`vê o CadÚnico vencido (${JSON.stringify(por("CadÚnico").leitura.slice(0, 40))})`,
    /venceu em/.test(por("CadÚnico").leitura) && por("CadÚnico").cor === "alerta");
  conf("vê o benefício ativo e cobra o art. 24 da EC 103",
    /art\. 24 da EC 103/.test(por("Benefício ativo").leitura));
  conf("acha o protocolo e dá o Tema 350 por atendido",
    /Tema 350/.test(por("Requerimentos anteriores").leitura)
    && por("Requerimentos anteriores").cor === "ok");
  conf("diz que não lê o CNIS sozinho",
    /à mão/.test(por("Indicadores e pendências").leitura));
  await (await p.$(".det-rolagem")).screenshot({ path: path.join(__dirname, "f10-triagem.png") });

  // cliente sem nada: as leituras viram o convite de perguntar ao cliente
  await abrir(CLI_VAZIO);
  const vazio = await p.innerText('.painel[data-p="0"].ativo');
  conf("sem processo, manda perguntar ao cliente",
    /pergunte ao cliente se já processou o INSS antes/.test(vazio));
  conf("sem protocolo, avisa do Tema 350",
    /sem prévio requerimento a ação é extinta/.test(vazio));
  conf("sem BPC, não cobra CadÚnico", /o CadÚnico não é exigido aqui/.test(vazio));
  conf("o contador começa em zero", /0 de 8 conferidos/.test(vazio));

  // marcar um passo grava com autoria e data
  await p.click('.painel[data-p="0"].ativo .tri-lista .tri-passo:first-child .tri-e.ok');
  await p.waitForTimeout(500);
  const g1 = gravados.filter(x => x.tabela === "clientes").pop();
  const t1 = (g1.corpo.triagem || (g1.corpo.campos || {}).triagem || {});
  conf(`marcar grava o estado, quem e quando (${JSON.stringify(t1.cnis)})`,
    t1.cnis && t1.cnis.estado === "ok" && t1.cnis.quem === EU && !!t1.cnis.em);
  conf("o contador anda", /1 de 8 conferidos/.test(await p.innerText('.painel[data-p="0"].ativo')));

  // clicar de novo no mesmo estado desmarca
  await p.click('.painel[data-p="0"].ativo .tri-lista .tri-passo:first-child .tri-e.ok');
  await p.waitForTimeout(500);
  const t2 = (x => x.corpo.triagem || (x.corpo.campos || {}).triagem)(gravados.filter(x => x.tabela === "clientes").pop());
  conf("clicar no mesmo estado desmarca", t2.cnis.estado === "");

  // a nota grava ao sair do campo, e não grava se nada mudou
  const antes = gravados.length;
  await p.click("#tri-conclusao");
  await p.evaluate(() => document.getElementById("tri-conclusao").blur());
  await p.waitForTimeout(400);
  conf("sair do campo sem escrever não grava nada", gravados.length === antes);
  await p.fill("#tri-conclusao", "Falta o CNIS atualizado. Cliente traz na sexta.");
  await p.evaluate(() => document.getElementById("tri-conclusao").blur());
  await p.waitForTimeout(500);
  const t3 = (x => x.corpo.triagem || (x.corpo.campos || {}).triagem)(gravados.filter(x => x.tabela === "clientes").pop());
  conf("a nota grava ao sair do campo", /Cliente traz na sexta/.test((t3.conclusao || {}).nota || ""));

  // o próximo passo recomendado
  await p.click('.tri-p:has-text("Aguardando")');
  await p.waitForTimeout(500);
  const t4 = (x => x.corpo.triagem || (x.corpo.campos || {}).triagem)(gravados.filter(x => x.tabela === "clientes").pop());
  conf("grava o próximo passo recomendado", (t4.conclusao || {}).proximo === "aguardando");
  conf("a nota anterior não foi apagada", /Cliente traz na sexta/.test((t4.conclusao || {}).nota || ""));
  await (await p.$(".det-rolagem")).screenshot({ path: path.join(__dirname, "f10-triagem-vazio.png") });

  console.log("=== triagem (F10) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
