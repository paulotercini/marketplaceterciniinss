// F17 — a espécie dentro da triagem, e o fecho do atendimento.
//
// As 204 skills do escritório continuam fora do CRM: elas são o raciocínio.
// O que desce para a tela é a parte que muda a decisão enquanto o cliente
// está na cadeira. Este teste prova três coisas:
//   1. cada família de espécie acrescenta os SEUS pontos, e só os seus
//   2. quem não casa com nenhuma família continua com os oito de sempre
//   3. encerrar o atendimento escreve UMA linha no caso, com o que ficou
//      conferido, o que ficou em atenção, o que faltou e o próximo passo
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO, CLI_VAZIO, CASO1, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

// um cliente por família, para conferir a tabela inteira de uma vez
const FAMILIAS = [
  ["BPC/LOAS", "BPC/LOAS", 4], ["Apos. Especial", "Aposentadoria especial", 4],
  ["Aux. Incapacidade Temporária", "Incapacidade", 4], ["Aux. Acidente", "Auxílio-acidente", 3],
  ["Rural", "Rural e híbrida", 4], ["Pensão por Morte", "Dependentes", 3],
  ["Apos. Tempo de Contribuição", "Aposentadoria programável", 3], ["Revisão", "Revisão", 3],
  ["Acerto de CNIS", "Acerto de CNIS", 3], ["Recurso especial ou incidente", "Recurso no CRPS", 3],
  ["Salário-Maternidade", "Salário-maternidade", 3],
  ["Encaminhamentos do processo de apuração (MOB)", null, 0],
];
FAMILIAS.forEach(([ben], i) => {
  const cli = "c0000000-0000-0000-0000-00000000f" + String(i).padStart(3, "0");
  FIX.clientes.push({ ...FIX.clientes[0], id: cli, nome: "Fam " + i + " Ficticio", cpf: "1110000000" + i });
  FIX.casos.push({ ...FIX.casos[0], id: "b0000000-0000-0000-0000-00000000f" + String(i).padStart(3, "0"),
    cliente_id: cli, beneficio: ben, fase: "inss", processo: null, protocolos: [], nb: null });
  FAMILIAS[i].push(cli);
});

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
    localStorage.setItem("crm_subcad", "triagem");
  }, [SUPA, SESSAO]);
  const escritos = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      escritos.push({ m, t, corpo: JSON.parse(rota.request().postData() || "{}") });
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

  // ── 1. a tabela de espécies, família por família ─────────────────────────
  const fam = await p.evaluate(lista => lista.map(([ben, rot, n, cli]) => {
    const c = D.cliPorId.get(cli), ks = D.casosDoCliente.get(cli) || [];
    const f = familiaDaEspecie(ben);
    const passos = triagemPassosDe(c, ks);
    return { ben, esperado: rot, achou: f ? f.rot : null, extras: passos.length - 8,
      ultimo: passos[passos.length - 1][0],
      chaves: passos.slice(7, passos.length - 1).map(x => x[0]) };
  }), FAMILIAS);
  const erradas = fam.filter(x => x.achou !== x.esperado);
  conf(`cada espécie cai na sua família${erradas.length ? "\n          " + JSON.stringify(erradas) : ""}`,
    erradas.length === 0);
  const contas = fam.filter((x, i) => x.extras !== FAMILIAS[i][2]);
  conf(`e traz o número certo de pontos${contas.length ? "\n          " + JSON.stringify(contas.map(x => [x.ben, x.extras])) : ""}`,
    contas.length === 0);
  conf("a conclusão continua sendo o último passo, em todas",
    fam.every(x => x.ultimo === "conclusao"));
  conf(`a espécie sem família fica com os oito de sempre (${fam[fam.length - 1].extras} extras)`,
    fam[fam.length - 1].achou === null && fam[fam.length - 1].extras === 0);
  const todasChaves = fam.flatMap(x => x.chaves);
  conf(`nenhuma chave de passo se repete entre famílias (${todasChaves.length})`,
    new Set(todasChaves).size === todasChaves.length);
  const fixas = await p.evaluate(() => TRIAGEM_PASSOS.map(x => x[0]));
  conf(`nenhum ponto da espécie colide com os oito fixos (${fixas.join(",")})`,
    !todasChaves.some(k => fixas.includes(k)));

  // ── 2. a tela mostra de onde veio cada ponto ─────────────────────────────
  const bpc = FAMILIAS.find(x => x[1] === "BPC/LOAS")[3];
  const abrir = async cli => {
    await p.evaluate(x => abrirFicha(x), cli);
    await p.waitForSelector('button.mt[data-vv="0"]');
    await p.click('button.mt[data-vv="0"]');
    await p.evaluate(() => irSubCad("triagem"));
    await p.waitForSelector(".tri-lista");
    await p.waitForTimeout(200);
  };
  await abrir(bpc);
  const faixa = await p.innerText(".tri-especie");
  conf(`a faixa nomeia a espécie lida (${JSON.stringify(faixa.split("\n")[0].slice(0, 46))})`,
    /BPC\/LOAS/.test(faixa) && /4 pontos além dos oito/.test(faixa));
  conf("e diz de qual skill do escritório o ponto veio",
    /base-bpc-loas-requisitos/.test(faixa));
  const ferr = await p.evaluate(() => { const a = document.querySelector(".tri-ferr");
    return a ? { rot: a.innerText.trim(), href: a.href, alvo: a.target, rel: a.rel } : null; });
  conf(`a ferramenta do site interno aparece no passo em que serve (${ferr ? ferr.rot : "não achei"})`,
    ferr && /renda per capita/i.test(ferr.rot) && /advprevidenciaria/.test(ferr.href)
    && ferr.alvo === "_blank" && /noopener/.test(ferr.rel));
  const etiquetas = await p.evaluate(() =>
    [...document.querySelectorAll(".tri-passo")].map(x => {
      const d = x.querySelector(".tri-de");
      return { tit: x.querySelector(".tri-tit b").innerText.trim(), de: d ? d.innerText.trim() : null }; }));
  conf(`só os pontos da espécie levam etiqueta (${etiquetas.filter(x => x.de).length} de ${etiquetas.length})`,
    etiquetas.slice(0, 7).every(x => !x.de) && etiquetas.slice(7, 11).every(x => x.de === "BPC/LOAS")
    && !etiquetas[etiquetas.length - 1].de);
  conf(`o contador conta os doze (${await p.innerText(".cad-cont")})`,
    /de 12 conferidos/.test(await p.innerText(".cad-cont")));
  // a captura precisa mostrar a faixa da espécie E os pontos que ela trouxe:
  // um retrato do cartão inteiro corta justamente o que a F17 acrescentou
  await p.evaluate(() => {
    const r = document.querySelector(".det-rolagem");
    const alvo = document.querySelectorAll(".tri-passo")[7];
    if (r && alvo) r.scrollTop = 0;
  });
  await p.waitForTimeout(200);
  const faixaEl = await p.$(".tri-especie");
  if (faixaEl) await faixaEl.screenshot({ path: path.join(__dirname, "f17-faixa-especie.png") });
  await p.evaluate(() => {
    const ps = [...document.querySelectorAll(".tri-passo")].slice(7, 11);
    if (!ps.length) return;
    const cx = document.createElement("div");
    cx.id = "retrato-f17"; cx.style.cssText = "background:#fff;padding:10px 14px";
    ps.forEach(x => cx.appendChild(x.cloneNode(true)));
    document.querySelector(".tri-lista").appendChild(cx);
  });
  await p.waitForTimeout(200);
  const retr = await p.$("#retrato-f17");
  if (retr) await retr.screenshot({ path: path.join(__dirname, "f17-pontos-bpc.png") });
  await p.evaluate(() => { const x = document.getElementById("retrato-f17"); if (x) x.remove(); });

  // ── 3. encerrar o atendimento ───────────────────────────────────────────
  // sem nenhum passo marcado, não escreve nada
  escritos.length = 0;
  await p.click('.tri-fecho button');
  await p.waitForTimeout(500);
  conf("sem passo nenhum marcado, não lança nada no caso",
    !escritos.some(x => x.t === "andamentos"));
  conf("e diz por quê", /Marque ao menos um passo/.test(await p.innerText("#aviso")));

  // marca alguns passos, um deles em atenção, e escreve a conclusão
  await p.evaluate(cli => marcarTriagem(cli, "cnis", "ok"), bpc);
  await p.waitForTimeout(400);
  await p.evaluate(cli => marcarTriagem(cli, "bpc_renda", "atencao"), bpc);
  await p.waitForTimeout(400);
  await p.evaluate(cli => { const c = D.cliPorId.get(cli);
    const t = { ...triagemDe(c) };
    t.bpc_renda = { ...t.bpc_renda, nota: "renda de R$ 412 por pessoa, acima de 1/4" };
    t.conclusao = { estado: "ok", proximo: "inss", nota: "protocolar o BPC com o gasto de saúde comprovado" };
    c.triagem = t; }, bpc);
  await p.evaluate(() => repintarFicha());
  await p.waitForTimeout(400);

  escritos.length = 0;
  await p.click('.tri-fecho button');
  await p.waitForTimeout(900);
  const and = escritos.find(x => x.t === "andamentos" && x.m === "POST");
  conf("agora lança no caso", !!and);
  const txt = (and || { corpo: {} }).corpo.texto || "";
  conf(`é UMA linha só (${txt.length} caracteres)`, and && !/\n/.test(txt));
  // três: CNIS, renda per capita e a própria conclusão — a conclusão é passo
  conf(`conta quantos passos foram conferidos (${JSON.stringify(txt.slice(0, 56))})`,
    /triagem conferida: 3 de 12 passos/.test(txt));
  conf("nomeia a espécie que foi lida", /Espécie lida como BPC\/LOAS/.test(txt));
  conf("registra o que ficou em atenção, com a anotação",
    /Com atenção: Renda per capita do grupo familiar \(renda de R\$ 412/.test(txt));
  conf("lista o que ainda não foi conferido", /Ainda não conferido:.*Indicadores/.test(txt));
  conf("leva a conclusão escrita à mão", /Conclusão: protocolar o BPC com o gasto de saúde/.test(txt));
  conf(`e termina no próximo passo (${JSON.stringify(txt.slice(-46))})`,
    /Próximo passo: Pronto para o protocolo no INSS\.$/.test(txt));
  conf("o atendimento fica marcado na triagem do cliente, com data e autor",
    escritos.some(x => x.t === "clientes" && x.corpo.triagem
      && x.corpo.triagem.atendimento && x.corpo.triagem.atendimento.quem === EU
      && x.corpo.triagem.atendimento.conferidos === 3
      && x.corpo.triagem.atendimento.passos === 12));

  // cliente sem caso: avisa em vez de gravar
  const semCaso = await p.evaluate(async cli => {
    if ((D.casosDoCliente.get(cli) || []).length) return "ERRO: o cliente tem caso";
    await fecharAtendimento(cli);
    return document.getElementById("aviso").innerText;
  }, CLI_VAZIO);
  conf(`cliente sem caso não quebra, avisa (${JSON.stringify(String(semCaso).slice(0, 44))})`,
    /não tem caso/.test(String(semCaso)));

  console.log("=== atendimento e espécie (F17) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
