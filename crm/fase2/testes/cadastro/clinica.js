// Dossiê, onda 5 — a clínica: a linha do tempo dos documentos do hospital
// (data e tipo do nome do arquivo, conclusão do exame, diagnóstico da
// internação, hipótese do relatório na fonte deslocada), o sinal de doença
// que dispensa a carência, a área médica que escolhe o agente da base, o
// relatório recente para a perícia, e os documentos médicos fora do mapa da
// pensão. Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO } = require("./fixturas");
const { cifraHc, HC_EXAME_TEXTO, HC_RELATORIO_TEXTO, HC_AIH_TEXTO } = require("./fixt-dossie");
const SUPA = "https://ficticio.supabase.co";

const AN = (n, nome, texto) => ({ id: `a6000000-0000-0000-0000-00000000000${n}`, cliente_id: CLI_CHEIO, caso_id: null, origem: "dossie", nome,
  caminho: `dossie/52998224725/${nome.replace(/ · /, "/")}`, tipo: "application/pdf", tamanho: 1000,
  texto, paginas: texto ? 1 : 2, paginas_imagem: texto ? [] : [1, 2], criado_em: "2026-10-08T12:00:00Z" });
FIX.anexos = [
  AN(1, "HC Ribeirao/Exames · 30-05-2026 TOMOGRAFIA COMPUTADORIZADA - PELVE.pdf", HC_EXAME_TEXTO),
  AN(2, "HC Ribeirao/Relatorios · 21-JUN-2024 16h31m35 RELATÓRIO MÉDICO.pdf", HC_RELATORIO_TEXTO),
  AN(3, "HC Ribeirao/Internacoes · Internacao 11-05-2024 - 22-06-2024 UE.pdf", HC_AIH_TEXTO),
  AN(4, "HC Ribeirao/Exames · 10-01-2025 RESSONANCIA MAGNETICA - JOELHO.pdf", null),
];
FIX.clientes[0] = { ...FIX.clientes[0], cpf: "52998224725", dossie: {}, campos: { ...(FIX.clientes[0].campos || {}), precasos: [{ id: "pc_m", especie: "", marc: {}, em: "2026-10-12" }] } };
FIX.casos[0] = { ...FIX.casos[0], titulo: "Auxílio por incapacidade temporária", beneficio: "Auxílio por incapacidade temporária", especie: "B31", nb: null };

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
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (m !== "GET") return rota.fulfill(m === "POST" ? { status: 201, contentType: "application/json", body: "[]" } : { status: 204, body: "" });
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

  // 1 · a fonte deslocada do hospital volta a ser texto, e o número fica como está
  const dec = await p.evaluate(([a, b]) => [desfazFonteHc(a), desfazFonteHc(b)], [cifraHc("FRATURA DE FEMUR DISTAL"), "PO 12/05/2024 (16)3602-1000 CID: S72.4"]);
  conf("a palavra deslocada volta, com os espaços", dec[0] === "FRATURA DE FEMUR DISTAL");
  conf("data, telefone e CID não mudam", dec[1] === "PO 12/05/2024 (16)3602-1000 CID: S72.4");

  // 2 · a linha do tempo, do mais novo ao mais antigo (os anexos chegam com a ficha)
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForFunction(() => D._ficha && D._ficha.cliId && !_lendoDossie && !_lendoLeitores, null, { timeout: 10000 });
  const lin = await p.evaluate(cli => linhaClinica(cli).map(x => ({ d: x.data, t: x.tipo, ti: x.titulo, r: x.resumo, c: x.cids, g: x.grave })), CLI_CHEIO);
  conf("quatro documentos, do mais novo ao mais antigo", lin.map(x => x.d).join(",") === "2026-05-30,2025-01-10,2024-06-21,2024-05-11");
  conf("o exame traz a conclusão e o sinal de doença grave", lin[0].t === "Exame" && lin[0].ti === "Tomografia computadorizada - pelve"
    && /^Seguimento de sarcoma operado no fêmur esquerdo, sem lesões secundárias na pelve\.$/.test(lin[0].r) && lin[0].g === "sarcoma");
  conf("o digitalizado entra pela data e pelo tipo do nome", lin[1].t === "Exame" && lin[1].ti === "Ressonancia magnetica - joelho" && !lin[1].r);
  conf("o relatório traz a hipótese decifrada e o CID", lin[2].t === "Relatório" && /hipótese: membro inferior esquerdo: fratura de femur distal esquerdo/i.test(lin[2].r)
    && lin[2].c.join() === "S72.4");
  conf("a internação traz o período e o diagnóstico principal", lin[3].t === "Internação" && lin[3].ti === "internação de 11/05/2024 a 22/06/2024"
    && /^diagnóstico principal: fratura da diafise do femur$/i.test(lin[3].r));
  const area = await p.evaluate(cli => areaClinica(linhaClinica(cli)), CLI_CHEIO);
  conf("a área médica é a do membro inferior", area && area.agente === "medico-membro-inferior" && area.n === 4);

  // 3 · no mapa da incapacidade
  await p.evaluate(() => { abaAtiva = 0; irSubCad("mapa"); });
  await p.waitForSelector(".mapa-arvore");
  await p.click('.mapa-ramo[data-ramo="inc_dii"] .mapa-no');
  await p.waitForSelector('.mapa-ramo[data-ramo="inc_dii"].aberto + .mapa-fatos');
  let fx = await p.textContent(".mapa-fatos");
  conf("o ramo da DII traz a linha do tempo clínica", /30\/05\/2026, exame: tomografia computadorizada - pelve; seguimento de sarcoma/i.test(fx)
    && /11\/05\/2024, internação: internação de 11\/05\/2024 a 22\/06\/2024; diagnóstico principal/i.test(fx));
  const clin = await p.$$eval(".mapa-fatos .mapa-lista li", ls => ls.map(l => l.textContent.replace(/\s+/g, " ").trim()).filter(t => /registro clínico em/.test(t)));
  conf("o registro mais antigo fica fixo no topo da linha clínica, e o mais recente logo abaixo", clin.length === 2
    && /^Primeiro registro clínico em 11\/05\/2024, internação/.test(clin[0]) && /^Último registro clínico em 30\/05\/2026, exame/.test(clin[1]));
  conf("o relatório antigo pede um novo para a perícia", /O relatório médico mais recente é de 21\/06\/2024, com mais de 90 dias: pedir relatório atualizado para a perícia/.test(fx)
    && await p.$eval('.mapa-ramo[data-ramo="inc_dii"]', e => e.classList.contains("est-warn")));
  conf("a área médica aparece com o agente da base", /área de membro inferior; o pedido ao Claude leva o agente medico-membro-inferior/.test(fx));
  await p.click(".mapa-fatos > button.tl-bt");
  await p.waitForSelector(".modal-cx #cl-livre");
  const q = await p.evaluate(() => ({ t: document.getElementById("cl-livre").value, ch: _docsClaude.chaves.length }));
  conf("o pedido ao Claude leva o agente e os quatro documentos do ramo", /use o agente base-conhecimento-inss:medico-membro-inferior\.$/.test(q.t) && q.ch === 4);
  await p.evaluate(() => fecharCaixa());
  await p.click('.mapa-ramo[data-ramo="inc_carencia"] .mapa-no');
  await p.waitForSelector('.mapa-ramo[data-ramo="inc_carencia"].aberto + .mapa-fatos');
  fx = await p.textContent(".mapa-fatos");
  conf("o sinal de doença que dispensa a carência vai ao ramo da carência", /O exame de 30\/05\/2026 menciona sarcoma, da lista de doenças que dispensam a carência \(art\. 26, II, da Lei 8\.213\/91\): conferir no documento/.test(fx));

  // 4 · na pensão, os documentos médicos ficam fora do mapa
  await p.evaluate(cli => mapaLente(cli, "pensao"), CLI_CHEIO);
  await p.waitForSelector(".mapa-fora");
  const fora = await p.textContent(".mapa-fora");
  conf("na pensão, a linha clínica fica recolhida fora do mapa", /tomografia computadorizada - pelve/i.test(fora) && /internação de 11\/05\/2024/.test(fora));

  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
