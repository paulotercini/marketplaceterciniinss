// F217 · análise por benefício: os chips do Primeiro atendimento ramificam em
// opções e abrem, na Análise de Direito, só os quadros que cada benefício pede;
// a caixa de tempos de contribuição conta por natureza e converte o especial.
// Pontuação de 0 a 100 por peso; a entrega exige mais de 95. Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const CNIS = { em: "2026-10-08", nome: "Aurélia Ficta de Souza", paginas: 3, qtVinculos: 1, nits: [], indicadores: [], contribSemPerda: 104,
  vinculos: [{ seq: 1, tipo: "Empregado", origem: "CONFECCOES FICTICIAS LTDA", codigo: "11.444.777/0001-61", inicio: "01/02/2011", fim: "30/09/2019",
    ultRemun: "09/2019", aberto: false, indicadores: [] }],
  analise: { abertos: [], errosEmp: [], abaixo: [], mesAnt: "09/2026", agora: { tipo: "sem", ultima: { comp: "09/2019", tipo: "Empregado" } },
    benefAtivos: [], qtComps: 104, contagem: { periodos: [["2011-02", "2019-09"]], carencia: 104, anos: 8, meses: 8 } } };
FIX.anexos = [];
FIX.clientes[0] = { ...FIX.clientes[0], cpf: "52998224725", dossie: {}, triagem: { pdf: { cnis: CNIS } },
  campos: { ...(FIX.clientes[0].campos || {}), precasos: [{ id: "pc_1", especie: "Aposentadoria por idade", cod: "B41", sub: "B41", natureza: "", marc: {}, honorarios: "", quem: null, em: "2026-10-12" }] } };
FIX.casos[0] = { ...FIX.casos[0], titulo: "Aposentadoria por idade", beneficio: "Aposentadoria por idade", especie: "B41", nb: null, dcb: null, prazo: null };

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
  const patches = [], posts = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (m === "PATCH" && /\/clientes\?/.test(u)) { try { patches.push(JSON.parse(rota.request().postData() || "{}")); } catch (e) {} }
    if (m === "POST" && /analises_direito/.test(u)) { try { posts.push(JSON.parse(rota.request().postData() || "{}")); } catch (e) {}
      return rota.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify([{ id: "an-1", cliente_id: CLI_CHEIO, data_analise: "2026-10-12", fonte: "manual", cenarios: [], detalhes: posts[posts.length - 1].detalhes }]) }); }
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
  const itens = []; const conf = (peso, nome, v) => itens.push([peso, nome, !!v]);
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForFunction(() => D._ficha && D._ficha.cliId && !_lendoDossie && !_lendoLeitores, null, { timeout: 10000 });
  await p.evaluate(() => { abaAtiva = 0; _atendAberto.add(clienteAberto); irSubCad("pa"); });
  await p.waitForSelector(".pa .ben .ben-chip");
  const texto = sel => p.evaluate(s => [...document.querySelectorAll(s)].map(e => e.textContent.trim()), sel);
  const n = sel => p.evaluate(s => document.querySelectorAll(s).length, sel);

  // ── A · a faixa no Primeiro atendimento ───────────────────────────────
  const chips = await p.evaluate(() => [...document.querySelectorAll(".pa .ben .ben-chip")].map(b => ({ fam: b.dataset.fam, on: b.classList.contains("on"), sinal: !!b.querySelector(".pa-bola"), pressed: b.getAttribute("aria-pressed") })));
  conf(4, "A1 onze famílias em chips, as com sinal do dossiê primeiro", chips.length === 11 && chips[0].sinal && chips.every(c => c.pressed === String(c.on)));
  const ligados = chips.filter(c => c.on).map(c => c.fam);
  conf(5, "A2 a família com sinal já nasce marcada, com a opção padrão aberta sob ela",
    ligados.includes("tempo") && (await n(".pa .ben-ramo[data-fam=tempo] .ben-opc")) === 4 && (await n(".pa .ben-ramo[data-fam=tempo] .ben-opc.on")) === 1);
  const padraoTempo = await p.evaluate(() => (document.querySelector(".pa .ben-ramo[data-fam=tempo] .ben-opc.on") || {}).dataset.opc);
  conf(0, "A2b a opção padrão da aposentadoria é por idade (64 anos, mulher)", padraoTempo === "tempo.idade");
  await p.click(".pa .ben-chip[data-fam=bpc]");
  await p.waitForSelector(".pa .ben-ramo[data-fam=bpc]");
  await p.waitForTimeout(800);
  const bpcOn = await p.evaluate(() => ({ chip: document.querySelector(".pa .ben-chip[data-fam=bpc]").classList.contains("on"), opc: [...document.querySelectorAll(".pa .ben-ramo[data-fam=bpc] .ben-opc.on")].map(b => b.dataset.opc) }));
  const gravouBpc = patches.some(x => x.campos && x.campos.ad_modulos && x.campos.ad_modulos.beneficios && x.campos.ad_modulos.beneficios.bpc);
  conf(5, "A3 ligar o BPC abre a ramificação com a opção padrão e grava na ficha", bpcOn.chip && bpcOn.opc.length === 1 && bpcOn.opc[0] === "bpc.def" && gravouBpc);
  await p.click(".pa .ben-ramo[data-fam=bpc] .ben-opc[data-opc='bpc.idoso']");
  await p.waitForFunction(() => document.querySelectorAll(".pa .ben-ramo[data-fam=bpc] .ben-opc.on").length === 2);
  conf(4, "A4 a segunda opção soma e o chip conta 2", (await texto(".pa .ben-chip[data-fam=bpc] small"))[0] === "2");
  await p.click(".pa .ben-chip[data-fam=bpc]");
  await p.waitForFunction(() => !document.querySelector(".pa .ben-ramo[data-fam=bpc]"));
  conf(4, "A5 desligar a família fecha a ramificação", !(await p.evaluate(() => document.querySelector(".pa .ben-chip[data-fam=bpc]").classList.contains("on"))));
  const quadros = (await texto(".pa .ben-quadros"))[0] || "", passo3 = (await texto(".atend-passos .pa-passo"))[2] || "";
  conf(4, "A6 a faixa diz os quadros que abrem e o passo 3 conta benefícios", /Quadros que abrem: .*Tempos de contribuição/.test(quadros) && /benefício/.test(passo3));

  // ── B · os quadros da Análise de Direito seguem a escolha ─────────────
  const mods = async () => p.evaluate(() => [...document.querySelectorAll(".adr .adm[data-mod]")].map(e => e.dataset.mod));
  await p.evaluate(cli => { admSalvar(cli, a => { a.beneficios = { bpc: ["def"] }; }); irSubCad("direito"); }, CLI_CHEIO);
  await p.waitForSelector(".adr .adm[data-mod]");
  const mBpc = await mods();
  conf(5, "B1 BPC do deficiente abre deficiência e renda, sem tempo especial nem rural", mBpc.join(",") === "defic,renda");
  await p.evaluate(cli => { admSalvar(cli, a => { a.beneficios = { b94: ["b94"] }; }); repintarFicha(); }, CLI_CHEIO);
  await p.waitForFunction(() => document.querySelector(".adr .adm[data-mod=acid]"));
  const mB94 = await mods();
  conf(5, "B2 auxílio-acidente abre qualidade, incapacidade e nexo, sem tempos", mB94.join(",") === "qualidade,incap,acid");
  conf(4, "B3 cada quadro diz para que benefício serve", (await texto(".adr .adm[data-mod=acid] .adm-para small")).includes("Acidentário · B94"));
  conf(3, "B4 a faixa de benefícios também vive na Análise de Direito", (await n(".adr .ben .ben-chip")) === 11 && (await p.evaluate(() => document.querySelector(".adr .ben-chip[data-fam=b94]").classList.contains("on"))));

  // ── C · a caixa de tempos ─────────────────────────────────────────────
  await p.evaluate(cli => { admSalvar(cli, a => { a.beneficios = { tempo: ["transicao"], especial: ["b46"] }; a.tempos = []; }); repintarFicha(); }, CLI_CHEIO);
  await p.waitForSelector("#adm-tempos");
  const mTempo = await mods();
  conf(0, "C0 transição e especial abrem tempos, carência, idade, transição e especial", mTempo.join(",") === "tempos,idade,carencia,transicao,especial");
  const linhas0 = await n("#adm-tempos tbody tr");
  await p.click(".adm-mais");
  await p.waitForFunction(() => document.querySelectorAll("#adm-tempos tbody tr").length === 2);
  conf(4, "C1 a caixa nasce com uma linha e o + acrescenta", linhas0 === 1);
  const linha = i => `#adm-tempos tbody tr[data-i="${i}"]`;
  await p.fill(`${linha(0)} input[data-k=de]`, "2005-01-01");
  await p.fill(`${linha(0)} input[data-k=ate]`, "2010-12-31");
  await p.fill(`${linha(0)} input[data-k=onde]`, "Metalúrgica Fictícia");
  await p.selectOption(`${linha(0)} select[data-k=nat]`, "especial");
  const detEsp = await p.evaluate(() => (document.querySelector('#adm-tempos tbody tr[data-i="0"] .adm-det input') || {}).placeholder);
  await p.selectOption(`${linha(0)} select[data-k=nat]`, "rural");
  const detRur = await p.evaluate(() => { const s = document.querySelector('#adm-tempos tbody tr[data-i="0"] .adm-det select'); return s ? s.options[0].textContent : ""; });
  conf(4, "C2 a natureza abre o detalhe que ela pede: agente e PPP no especial, regime no rural", detEsp === "Agente, PPP e EPI" && detRur === "Regime");
  await p.selectOption(`${linha(0)} select[data-k=nat]`, "comum");
  await p.waitForTimeout(100);
  const tot1 = (await texto(".adm[data-mod=tempos] .adm-tot")).join(" ");
  conf(4, "C3 o período conta pelo calendário: 6 anos, 0 meses e 0 dias, e vale como tempo comum", /Comum\s*6 anos, 0 meses e 0 dias/.test(tot1) && /Total para tempo comum\s*6 anos, 0 meses e 0 dias/.test(tot1));
  await p.click("button:has-text('Trazer do CNIS')");
  await p.waitForFunction(() => document.querySelectorAll("#adm-tempos tbody tr").length === 2);
  const doCnis = await p.evaluate(() => { const r = document.querySelector('#adm-tempos tbody tr[data-i="1"]'); return { de: r.querySelector("[data-k=de]").value, ate: r.querySelector("[data-k=ate]").value, onde: r.querySelector("[data-k=onde]").value, prova: r.querySelector("[data-k=prova]").value }; });
  conf(5, "C4 Trazer do CNIS lança o vínculo com datas, empregador e prova", doCnis.de === "2011-02-01" && doCnis.ate === "2019-09-30" && /CONFECCOES/.test(doCnis.onde) && doCnis.prova === "CNIS");
  await p.click("button:has-text('Trazer do CNIS')");
  await p.waitForTimeout(200);
  conf(0, "C4b trazer de novo não repete o vínculo", (await n("#adm-tempos tbody tr")) === 2);
  await p.click(`${linha(1)} .adm-x`);
  await p.waitForFunction(() => document.querySelectorAll("#adm-tempos tbody tr").length === 1);
  conf(3, "C5 o × tira a linha", true);
  await p.click(".adm-mais");
  await p.waitForFunction(() => document.querySelectorAll("#adm-tempos tbody tr").length === 2);
  await p.fill(`${linha(1)} input[data-k=de]`, "2000-01-01");
  await p.fill(`${linha(1)} input[data-k=ate]`, "2004-12-31");
  await p.selectOption(`${linha(1)} select[data-k=nat]`, "especial");
  await p.waitForTimeout(100);
  const tot2 = (await texto(".adm[data-mod=tempos] .adm-tot")).join(" ");
  conf(4, "C6 o especial até 13/11/2019 converte por 1,20 (mulher): 5 anos viram 6", /Especial\s*5 anos, 0 meses e 0 dias/.test(tot2) && /Especial convertido \(×1,20 até 13\/11\/2019\)\s*6 anos, 0 meses e 0 dias/.test(tot2) && /Total para tempo comum\s*12 anos, 0 meses e 0 dias/.test(tot2));

  // caso-ouro do teste real de 12.10.2026: 48 vínculos do CNIS sobrepostos somavam 47 anos
  await p.click(".adm-mais");
  await p.waitForFunction(() => document.querySelectorAll("#adm-tempos tbody tr").length === 3);
  await p.fill(`${linha(2)} input[data-k=de]`, "2008-01-01");
  await p.fill(`${linha(2)} input[data-k=ate]`, "2012-12-31");
  await p.waitForTimeout(100);
  const tot3 = (await texto(".adm[data-mod=tempos] .adm-tot")).join(" ");
  conf(4, "C7 períodos sobrepostos contam uma vez: 2005–2010 com 2008–2012 dá 8 anos, e o total 14", /Comum\s*8 anos, 0 meses e 0 dias/.test(tot3) && /Total para tempo comum\s*14 anos, 0 meses e 0 dias/.test(tot3));
  await p.click(`${linha(2)} .adm-x`);
  await p.waitForFunction(() => document.querySelectorAll("#adm-tempos tbody tr").length === 2);

  // ── D · os quadros calculam com a ficha, o CNIS e as linhas ───────────
  const hoje = new Date(), idade = hoje.getFullYear() - 1962 - ((hoje.getMonth() + 1 < 3 || (hoje.getMonth() + 1 === 3 && hoje.getDate() < 14)) ? 1 : 0);
  const idadeTxt = (await texto(".adm[data-mod=idade] .adm-calc li")).join(" | ");
  conf(4, "D1 idade: hoje pela ficha e a exigida por benefício", new RegExp(`Hoje: ${idade} anos`).test(idadeTxt));
  const carTxt = (await texto(".adm[data-mod=carencia] .adm-calc li")).join(" | ");
  conf(4, "D2 carência: cumprida pelo CNIS e o que falta para 180", /Cumprida: 104 contribuições \(CNIS/.test(carTxt) && /exige 180, falta 76 contribuições/.test(carTxt));
  const trTxt = await texto(".adm[data-mod=transicao] .adm-calc li");
  conf(4, "D3 transição: as seis regras da EC 103 medidas pelas linhas", trTxt.length === 6 && /Direito adquirido até 13\/11\/2019: 30 anos de tempo na data; tinha 12 anos/.test(trTxt[0]) && /Pontos \(art\. 15\)/.test(trTxt[1]) && /Regra permanente/.test(trTxt[5]));
  const espTxt = (await texto(".adm[data-mod=especial] .adm-calc li")).join(" | ");
  conf(0, "D4 especial: tempo de exposição contra os 25 anos", /Tempo especial: 5 anos, 0 meses e 0 dias; exige 25 anos, faltam 20 anos/.test(espTxt));

  // ── E · o que se digita fica na ficha e entra na análise registrada ──
  await p.selectOption(".adm[data-mod=especial] select[data-adm=esp_anos]", "20");
  await p.waitForTimeout(900);
  const ultimo = patches[patches.length - 1] || {};
  const adm = (ultimo.campos || {}).ad_modulos || {};
  conf(5, "E1 a ficha guarda benefícios, linhas de tempo e campos num só PATCH",
    adm.beneficios && adm.beneficios.tempo && adm.tempos && adm.tempos.length === 2 && adm.tempos[0].onde === "Metalúrgica Fictícia" && adm.valores && adm.valores.esp_anos === "20");
  const recalc = (await texto(".adm[data-mod=especial] .adm-calc li")).join(" | ");
  conf(0, "E1b mudar o campo recalcula o quadro sem repintar a ficha", /exige 20 anos, faltam 15 anos/.test(recalc));
  await p.evaluate(() => { const d = document.getElementById("ad-novo"); if (d) d.open = true; document.getElementById("ad-contexto").value = "Teste da análise por benefício"; });
  await p.click("#ad-novo button:has-text('Registrar análise')");
  await p.waitForFunction(() => document.querySelector(".adr-modulos"), null, { timeout: 5000 }).catch(() => {});
  const post = posts[0] || {}, snap = ((post.detalhes || {}).modulos) || {};
  conf(5, "E2 registrar a análise leva a cópia dos benefícios, das linhas e dos totais", snap.beneficios && snap.beneficios.tempo && snap.tempos && snap.tempos.length === 2 && snap.totais && snap.totais.comum > 0);
  conf(0, "E2b a análise registrada mostra o resumo por benefício", (await texto(".adr-modulos li")).length === 2);

  // ── F · desenho e acessibilidade ──────────────────────────────────────
  const css = fs.readFileSync(path.join(__dirname, "app.html"), "utf8");
  conf(2, "F1 o chip responde ao toque (scale .97, 160ms ease-out) e respeita o movimento reduzido", /\.ben-chip:active,\.ben-opc:active\{transform:scale\(\.97\)\}/.test(css) && /prefers-reduced-motion:reduce\)\{\.ben-chip,\.ben-opc\{transition:none\}/.test(css));
  const a11y = await p.evaluate(() => ({ chips: [...document.querySelectorAll(".ben-chip,.ben-opc")].every(b => b.tagName === "BUTTON" && b.hasAttribute("aria-pressed")), h3: [...document.querySelectorAll(".adr .adm")].every(s => s.querySelector("h3")), x: [...document.querySelectorAll(".adm-x")].every(b => b.getAttribute("aria-label")) }));
  conf(2, "F2 chips são botões com aria-pressed, quadros têm título, o × tem rótulo", a11y.chips && a11y.h3 && a11y.x);
  conf(3, "F3 sem erro de página", !erros.length);

  await p.evaluate(() => document.querySelector(".adr .ben").scrollIntoView({ block: "start" }));
  await p.screenshot({ path: "/tmp/f217-ad.png" });
  await p.evaluate(() => document.querySelector("#adm-transicao").scrollIntoView({ block: "start" }));
  await p.screenshot({ path: "/tmp/f217-ad2.png" });
  await p.evaluate(() => irSubCad("pa"));
  await p.waitForSelector(".pa .ben");
  await p.screenshot({ path: "/tmp/f217-pa.png", fullPage: true });

  const total = itens.reduce((t, [w]) => t + w, 0), feito = itens.filter(x => x[2]).reduce((t, [w]) => t + w, 0);
  for (const [w, nome, v] of itens) console.log(`${v ? "✔" : "✘"} ${String(w).padStart(2)} ${nome}`);
  if (erros.length) console.log(erros.join("\n"));
  console.log(`PONTUAÇÃO: ${feito}/${total}`);
  await nav.close(); s.close();
  process.exit(feito > 95 ? 0 : 1);
})();
