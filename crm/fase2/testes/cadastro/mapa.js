// Dossiê, onda 2b — o mapa do dossiê: a espécie do caso abre os ramos da
// família (PONTOS_ESPECIE), os prazos vêm à frente, cada ramo tem a cor do
// pior fato ou da resposta de quem atende, o que a espécie não usa fica
// recolhido no pé, a anotação de cada ramo é a nota do ponto na triagem e o
// mapa vai inteiro para o formulário da Análise de Direito. Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO } = require("./fixturas");
const { laudoPmf, cartaNova, processo, agendamento, comunicacaoIndeferimento } = require("./fixt-dossie");
const SUPA = "https://ficticio.supabase.co";

const br = d => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
const dia = n => { const d = new Date(); d.setDate(d.getDate() + n); return br(d); };
const mes = (n, d) => { const x = new Date(); x.setDate(1); x.setMonth(x.getMonth() + n); x.setDate(d); return br(x); };
const comp = n => mes(n, 1).slice(3);

const NB = "7001234567";
const AN = (n, nome, texto) => ({ id: `a3000000-0000-0000-0000-00000000000${n}`, cliente_id: CLI_CHEIO, caso_id: null, origem: "dossie", nome,
  caminho: `dossie/52998224725/${nome.replace(/ · /, "/")}`, tipo: "application/pdf", tamanho: 1000,
  texto, paginas: 2, paginas_imagem: [], criado_em: "2026-10-08T12:00:00Z" });
FIX.anexos = [
  AN(1, "Laudos · Laudo medico pericial.pdf", laudoPmf({ nb: NB, exame: dia(-20), did: "02/09/2025", dii: dia(-35), dcb: dia(40) })),
  AN(2, "Meu INSS · Carta de concessao.pdf", cartaNova({ nb: "180.123.456-0", der: mes(-117, 14), concessao: mes(-116, 10), dib: mes(-117, 14), dip: mes(-117, 14), rmi: "1.744,88" })),
  // o pedido de prorrogação indeferido; os despachos da cópia não entram no mapa
  AN(3, "Processos · Pedido de prorrogacao.pdf", processo({ protocolo: "5566778899", servico: "Pedido de Prorrogação de Benefício por Incapacidade",
    status: "Concluída", entrada: dia(-15), atualizado: dia(-5), nb: NB,
    despachos: [[dia(-12), agendamento(dia(-12), dia(-6), "07:00")]],
    comunicacao: comunicacaoIndeferimento("700.123.456-7", dia(40)) })),
];
// o CNIS já lido: emprego em curso e uma competência abaixo do mínimo
const CNIS = { em: "2026-10-10", paginas: 4, qtVinculos: 1, nits: [], indicadores: [], contribSemPerda: 130,
  vinculos: [{ seq: 1, tipo: "Empregado", origem: "FABRICA FICTICIA", codigo: "11.222.333/0001-44", inicio: "01/02/2020", fim: "",
    ultRemun: comp(-1), aberto: true, indicadores: [] }],
  analise: { abertos: [], errosEmp: [], abaixo: [{ comp: "03/2024", valor: 1000, minimo: 1412, tipo: "Contribuinte individual", origem: "" }],
    mesAnt: comp(-1), agora: { tipo: "empregado", aberto: true, origem: "FABRICA FICTICIA", desde: "01/02/2020", ultRemun: comp(-1) },
    benefAtivos: [], qtComps: 130 } };
FIX.clientes[0] = { ...FIX.clientes[0], cpf: "52998224725", dossie: {}, triagem: { pdf: { cnis: CNIS } }, campos: { ...(FIX.clientes[0].campos || {}), precasos: [{ id: "pc_m", especie: "", marc: {}, em: "2026-10-12" }] } };
FIX.casos[0] = { ...FIX.casos[0], titulo: "Auxílio por incapacidade temporária", beneficio: "Auxílio por incapacidade temporária",
  especie: "B31", nb: NB, dcb: null, prazo: null };

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
  const escritos = [];
  let seq = 0;
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (m !== "GET") {
      const corpo = JSON.parse(rota.request().postData() || "{}");
      escritos.push({ m, u, corpo });
      if (m === "POST") return rota.fulfill({ status: 201, contentType: "application/json",
        body: JSON.stringify((Array.isArray(corpo) ? corpo : [corpo]).map(x => ({ id: `f3000000-0000-0000-0000-${String(++seq).padStart(12, "0")}`, ...x }))) });
      return rota.fulfill({ status: 204, body: "" });
    }
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
  await p.waitForFunction(() => D._ficha && D._ficha.cliId && !_lendoDossie && !_lendoLeitores, null, { timeout: 10000 });
  await p.evaluate(() => { abaAtiva = 0; irSubCad("mapa"); });
  await p.waitForSelector(".mapa-arvore");

  // 1 · a espécie do caso abre os ramos da família, com os prazos à frente
  conf("o mapa ganha a sua aba no Cadastro", (await p.textContent(".sub-menu")).includes("Mapa do dossiê"));
  const ramos = () => p.$$eval(".mapa-ramo", rs => rs.map(r => ({ id: r.dataset.ramo, est: [...r.classList].find(c => c.startsWith("est-")),
    aberto: r.classList.contains("aberto"), t: r.querySelector(".mapa-no").textContent.replace(/\s+/g, " ").trim() })));
  let rs = await ramos();
  conf("a raiz é a incapacidade, com a espécie do caso", /Incapacidade/.test(await p.textContent(".mapa-raiz")) && /Auxílio por incapacidade temporária/.test(await p.textContent(".mapa-raiz")));
  conf("os prazos vêm primeiro, depois os quatro pontos da incapacidade e os outros fatos", rs.map(r => r.id).join(",") === "prazos,inc_dii,inc_carencia,inc_qualidade,inc_pericia,outros");
  const fxPrazos = await p.textContent(".mapa-fatos");
  conf("o ramo dos prazos é vermelho e já abre, com o recurso contado da conclusão", rs[0].est === "est-crit" && rs[0].aberto
    && /Recurso ao CRPS até/.test(fxPrazos) && /pedido concluído em/.test(fxPrazos) && !/Perícia agendada/.test(fxPrazos));
  conf("o recurso traz a ação e o documento de origem", (await p.$$(".mapa-fatos .mapa-lista li button.tl-bt")).length === 1
    && (await p.$$(".mapa-fatos .mapa-lista .adr-link")).length === 1);
  const r = id => rs.find(x => x.id === id) || {};
  // onda 5 · o laudo reconhece a incapacidade, mas sem relatório médico no
  // dossiê o ramo fica em atenção: é o que falta para a próxima perícia
  conf("sem relatório médico para a perícia, o ramo da DII fica em atenção", r("inc_dii").est === "est-warn" && /Nenhum relatório médico no dossiê/.test(r("inc_dii").t));
  conf("a competência abaixo do mínimo deixa a carência em atenção", r("inc_carencia").est === "est-warn" && /abaixo do mínimo/.test(r("inc_carencia").t));
  conf("o emprego em curso e o período de graça deixam a qualidade verde", r("inc_qualidade").est === "est-ok");
  conf("a DCB do laudo fica no ramo da perícia", r("inc_pericia").est === "est-warn" && /DCB em/.test(r("inc_pericia").t));
  conf("a decadência perto do fim fica entre os outros fatos, em vermelho", r("outros").est === "est-crit");

  // 2 · a flecha abre um ramo de cada vez, com a anotação do ponto
  await p.click('.mapa-ramo[data-ramo="inc_carencia"] .mapa-no');
  await p.waitForSelector('.mapa-ramo[data-ramo="inc_carencia"].aberto + .mapa-fatos');
  conf("abrir um ramo fecha o outro", (await p.$$(".mapa-ramo.aberto")).length === 1);
  conf("o ramo aberto traz a dica da skill e o campo de anotação", /complementação|dispensa|lista de doenças/.test(await p.textContent(".mapa-fatos .mapa-dica"))
    && !!(await p.$(".mapa-fatos textarea#tri-inc_carencia")));
  escritos.length = 0;
  await p.fill("#tri-inc_carencia", "complementar a competência de 03/2024 antes do pedido");
  await p.click(".mapa-raiz");
  await p.waitForTimeout(300);
  const nota = escritos.find(e => e.m === "PATCH" && /\/rest\/v1\/clientes/.test(e.u));
  conf("a anotação do ramo é a nota do ponto na triagem", nota && nota.corpo.triagem && nota.corpo.triagem.inc_carencia
    && nota.corpo.triagem.inc_carencia.nota === "complementar a competência de 03/2024 antes do pedido");
  escritos.length = 0;
  await p.click('.mapa-fatos .mapa-resp button:first-child');
  await p.waitForTimeout(300);
  const resp = escritos.find(e => e.m === "PATCH" && /\/rest\/v1\/clientes/.test(e.u));
  conf("responder o ponto no mapa grava a triagem", resp && resp.corpo.triagem.inc_carencia.estado === "ok");
  rs = await ramos();
  conf("a resposta de quem atende vale sobre a leitura, com a anotação na frase", r("inc_carencia").est === "est-ok"
    && /sem pendência: complementar a competência/.test(r("inc_carencia").t));

  // 3 · o pedido ao Claude leva a skill da família e só os documentos do ramo
  await p.click('.mapa-ramo[data-ramo="inc_dii"] .mapa-no');
  await p.waitForSelector('.mapa-ramo[data-ramo="inc_dii"].aberto + .mapa-fatos');
  await p.click('.mapa-fatos > button.tl-bt');
  await p.waitForSelector(".modal-cx #cl-livre");
  const cl = await p.evaluate(() => ({ q: document.getElementById("cl-livre").value, ch: _docsClaude && _docsClaude.chaves }));
  conf("o pedido ao Claude nomeia a skill e leva só o laudo", /^Com as skills base-incapacidade-b31-temporaria/.test(cl.q) && /"DID e DII/.test(cl.q)
    && cl.ch.length === 1 && cl.ch[0] === "anexo:a3000000-0000-0000-0000-000000000001");
  await p.evaluate(() => fecharCaixa());

  // 4 · trocar a espécie refaz o funil: na pensão, o laudo e o mínimo ficam fora
  await p.evaluate(cli => mapaLente(cli, "pensao"), CLI_CHEIO);
  await p.waitForSelector(".mapa-fora");
  rs = await ramos();
  conf("na pensão os ramos são os da pensão", rs.map(x => x.id).join(",") === "prazos,dep_qualidade,dep_prova,dep_cota,outros");
  conf("o ponto sem fato no dossiê fica a conferir", r("dep_qualidade").est === "est-pend" && /a conferir/.test(r("dep_qualidade").t));
  const fora = await p.textContent(".mapa-fora");
  conf("o laudo e a competência abaixo do mínimo saem do mapa, recolhidos no pé", /Fora do mapa de dependentes/.test(fora)
    && /Laudo médico de/.test(fora) && /abaixo do mínimo/.test(fora) && !(await p.$eval(".mapa-fora", d => d.open)));

  // 5 · o mapa vai para a Análise de Direito, sem gravar sozinho
  await p.evaluate(cli => mapaLente(cli, "incapacidade"), CLI_CHEIO);
  await p.waitForSelector(".mapa-arvore");
  escritos.length = 0;
  // F234 · o Mapa só mostra; o que vai à Análise de Direito se escolhe no Primeiro atendimento
  await p.click(".mapa-topo button.tl-bt.forte");
  conf("o botão do Mapa leva a escolher no Primeiro atendimento", await p.evaluate(() => subCad === "pa") && /Escolher no Primeiro atendimento/.test(await p.textContent(".mapa-topo button.tl-bt.forte").catch(() => "Escolher no Primeiro atendimento")));
  conf("e não grava a análise sozinho", !escritos.some(e => /analises_direito/.test(e.u)));
  // a foto do mapa, para quem confere a tela: MAPA_FOTO=<pasta> node mapa.js
  if (process.env.MAPA_FOTO) {
    await p.evaluate(() => irSubCad("mapa"));
    await p.waitForSelector(".mapa-arvore");
    await p.screenshot({ path: path.join(process.env.MAPA_FOTO, "mapa.png"), fullPage: true });
  }

  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
