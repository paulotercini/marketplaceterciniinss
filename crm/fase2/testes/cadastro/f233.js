// F233 · o Primeiro atendimento em quadros (docs/PRIMEIRO-ATENDIMENTO-QUADROS.md): a
// primeira leitura do dossiê, um quadro por documento na ordem da conversa (CNIS, RAIS,
// CNPJs…), cada um com o que é, o que encontramos, para que importa e os itens com
// caixinha; tudo vai à Análise de Direito, salvo o que se desmarcar, e a escolha fica no
// pré-caso (casos.ad); o fato negativo também vai; sem dossiê, só o relato e os
// benefícios; o Mapa só mostra. Banco simulado e dados fictícios. Uso: node f233.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f233";
fs.mkdirSync(OUT, { recursive: true });

// a RAIS no layout do "Relatório Completo do Trabalhador", com a licença sem remuneração de 2016
const bloco = (ano, afast, dias) => ["MINISTÉRIO DO TRABALHO E EMPREGO", "Secretaria-Executiva",
  `RELAÇÃO ANUAL DE INFORMAÇÕES SOCIAIS - RAIS - Ano-Base: ${ano}`, "Relatório Completo do Trabalhador", "VÍNCULOS",
  "PIS: 123.45678.90-1 Nome: MARLENE FICTA RAMOS", "CNPJ Razão Social", "11.444.777/0001-61 CONFECCOES FICTICIAS LTDA",
  "Data Admissão Tipo de admissão", "01/02/2011", "De Até Motivo", ...afast, "Afastamento", `Quantidade de dias afastados: ${dias}`,
  "Data", "Valor aviso prévio 0,00", "Causa", "Desligamento", "Remuneração Hora extra Remuneração Hora extra",
  "Janeiro 1.500,00 0 Julho 0,00 0", "Fevereiro 1.500,00 0 Agosto 1.500,00 0", "Contribuição", "1"];
const RAIS_LIC = [...bloco("2015", ["1) 0 - null"], 0), ...bloco("2016", ["1) 01/06/2016 31/07/2016 70 - LICENCA SEM VENCIMENTO/REMUNERACAO", "2) 0 - null"], 61)].join("\n");
const RAIS_SEM = bloco("2015", ["1) 0 - null"], 0).join("\n");
const comoLido = t => t.replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
const CNPJ_TEXTO = comoLido(["CNPJs VINCULADOS AO CPF (Redesim · Minhas Empresas) — MARLENE FICTA RAMOS", "Consulta em 08/10/2026", "",
  "CNPJ 12.345.678/0001-95 · MARLENE FICTA RAMOS 52998224725 (fantasia: ATELIE FICTICIO)", "  Situação cadastral: ATIVA · MATRIZ · MONTE ALTO/SP",
  "  Vínculo do CPF: TITULAR · qualificação: 50 - Empresário", "", "--- dados brutos do portal ---", "[]"].join("\n"));

const P = "c0000000-0000-0000-0000-000000000a33", S = "c0000000-0000-0000-0000-000000000b33", N = "c0000000-0000-0000-0000-000000000c33";
const KP = "b0000000-0000-0000-0000-000000000a33", KS = "b0000000-0000-0000-0000-000000000b33", KN = "b0000000-0000-0000-0000-000000000c33";
const CNIS = { em: "2026-10-08", nome: "Marlene Ficta Ramos", paginas: 3, qtVinculos: 1, nits: [], contribSemPerda: 104,
  indicadores: [{ codigo: "PEXT", descricao: "", ocorrencias: 2 }, { codigo: "IREM-INDPEND", descricao: "", ocorrencias: 1 }],
  vinculos: [{ seq: 1, tipo: "Empregado", origem: "CONFECCOES FICTICIAS LTDA", codigo: "11.444.777/0001-61", inicio: "01/02/2011", fim: "30/09/2019", ultRemun: "09/2019", aberto: false, indicadores: [] },
    { seq: 2, tipo: "Benefício", especie: "31", origem: "AUXILIO DOENCA PREVIDENCIARIO", nb: "6123456789", inicio: "10/03/2018", fim: "20/05/2018", situacao: "CESSADO", aberto: false }],
  analise: { abertos: [], errosEmp: [], abaixo: [], mesAnt: "09/2026", agora: { tipo: "sem", ultima: { comp: "09/2019", tipo: "Empregado" } },
    benefAtivos: [], qtComps: 104, contagem: { periodos: [["2011-02", "2019-09"]], carencia: 104, anos: 8, meses: 8, foraMinimo: 0 } } };
const AN = (n, cli, nome, texto, cpf) => ({ id: `a7000000-0000-0000-0000-0000000${String(n).padStart(5, "0")}`, cliente_id: cli, caso_id: null, origem: "dossie", nome,
  caminho: `dossie/${cpf}/${n}.txt`, tipo: "text/plain", tamanho: (texto || "").length, texto, paginas: texto ? 1 : null, paginas_imagem: [], criado_em: "2026-10-08T12:00:00Z" });

const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "lembretes", "analises_direito",
  "aposentadorias", "lista_pref", "andamento_tarefas", "modelos_mensagem", "credencial_vis", "apagados", "credenciais", "atribuicoes"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: JSON.parse(JSON.stringify(FIX.clientes)), casos: JSON.parse(JSON.stringify(FIX.casos)),
  documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app, anexos: [] });
const pre = (id, cli, pc, esp) => ({ id, cliente_id: cli, titulo: "", fase: "escritorio", pre_caso: true, beneficio: esp, protocolos: [], processos: [], crps_nups: [], crps: [],
  nbs: [], arquivados: {}, marcadores: [], origem_lista: "🙋 Escritório", precaso: { id: pc, natureza: "", marc: {}, honorarios: "", quem: null, em: "2026-10-12" }, criado_em: "2026-10-12T12:00:00Z" });
dados.clientes.push(
  { id: P, nome: "Marlene Ficta Ramos", cpf: "52998224725", dn: "1964-02-10", sexo: "F", criado_em: "2026-10-01T12:00:00Z",
    dossie: { meuinss: { em: "2026-10-08T10:00:00Z" }, mte: { em: "2026-10-08T10:00:00Z" }, redesim: { em: "2026-10-08T10:00:00Z" } }, triagem: { pdf: { cnis: CNIS } }, campos: {} },
  { id: S, nome: "Sebastião Fictício Lima", cpf: "70010020111", criado_em: "2026-10-01T12:00:00Z",
    campos: { atendimento: [{ em: "2026-10-12T10:00:00Z", quem: "Recepção", texto: "Relato fictício: quer se aposentar por idade" }] } },
  { id: N, nome: "Norberto Fictício Paes", cpf: "70010020122", dn: "1960-01-01", sexo: "M", criado_em: "2026-10-01T12:00:00Z",
    dossie: { meuinss: { em: "2026-10-08T10:00:00Z" }, mte: { em: "2026-10-08T10:00:00Z" } }, triagem: { pdf: { cnis: CNIS } }, campos: {} });
dados.casos.push(pre(KP, P, "pc_p1", "Aposentadoria por idade"), pre(KS, S, "pc_s1", "Aposentadoria por idade"), pre(KN, N, "pc_n1", "Aposentadoria por idade"));
dados.anexos.push(AN(1, P, "CTPS RAIS CAGED · Extrato RAIS.txt", RAIS_LIC, "52998224725"), AN(2, P, "CNPJ · CNPJs vinculados ao CPF (Redesim).txt", CNPJ_TEXTO, "52998224725"),
  ...Array.from({ length: 40 }, (_, i) => AN(100 + i, P, `CTC · Certidão fictícia ${i + 1}.pdf`, "", "52998224725")),
  AN(3, N, "CTPS RAIS CAGED · Extrato RAIS.txt", RAIS_SEM, "70010020122"));
const banco = new Banco(dados);
const T = banco.t;

const ok = [];
const conf = (nome, v) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); };

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
  await instalarBanco(ctx, { SUPA, SESSAO, banco });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const abrir = async (cli, pc) => { await p.evaluate(([c, x]) => abrirAtendimentoDe(c, x), [cli, pc]);
    await p.waitForFunction(() => !_lendoDossie && !_lendoLeitores && document.querySelector(".pa"), null, { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(500); };

  // 1 · a ordem e o modelo dos quadros
  await abrir(P, "pc_p1");
  await p.evaluate(() => passoTudo(true));   // F238 · este teste lê os quadros todos; os passos têm o f238.js
  await p.screenshot({ path: path.join(OUT, "01-pa-topo.png") });
  for (const q of ["cnis", "rais", "cnpj", "ben"]) { const el = await p.$("#paq-" + q); if (el) await el.screenshot({ path: path.join(OUT, `01-pa-${q}.png`) }); }
  const qs = await p.evaluate(() => [...document.querySelectorAll(".pa .paq[data-q]")].map(q => q.dataset.q));
  conf(`os quadros seguem a ordem da conversa: CNIS, RAIS, CNPJs… (${qs.join(", ")})`, qs.slice(0, 3).join() === "cnis,rais,cnpj" && qs.includes("docs") && qs.includes("falta"));
  conf("o quadro dos benefícios vem por último, com a faixa de benefícios", await p.evaluate(() => { const b = document.getElementById("paq-escolha"), qq = [...document.querySelectorAll(".pa .paq")];
    return b && qq[qq.length - 1] === b && b.querySelectorAll(".ben-chip").length === 11; }));
  const cnis = await p.evaluate(() => { const q = document.getElementById("paq-cnis"); return { oque: !!q.querySelector(".paq-oque"), achado: (q.querySelector(".paq-achado") || {}).textContent || "",
    importa: !!q.querySelector(".paq-importa"), blocos: [...q.querySelectorAll(".paq-bloco small")].map(x => x.textContent), itens: [...q.querySelectorAll(".paq-it")].map(x => x.textContent.replace(/\s+/g, " ")) }; });
  conf("cada quadro diz o que é, o que encontramos e para que importa", cnis.oque && /O que encontramos/.test(cnis.achado) && cnis.importa);
  conf(`o CNIS traz qualidade, carência, tempo, último mês pago e o benefício pelo nome (${cnis.blocos.join(" · ")})`,
    ["Qualidade", "Carência", "Tempo", "Último mês pago"].every(b => cnis.blocos.includes(b)) && cnis.blocos.some(b => /Auxílio-doença|Aposentadoria|Benefício/.test(b)));
  conf("o indicador do CNIS aparece traduzido, com o vínculo e o que pedir", cnis.itens.some(t => /fora do prazo/.test(t) && /Peça/.test(t) && /PEXT/.test(t)));
  conf("o benefício do CNIS vira item, pelo nome (B31 de 2018)", cnis.itens.some(t => /Auxílio-doença \(B31\)/.test(t) && /2018/.test(t)));
  const rais = await p.evaluate(() => { const q = document.getElementById("paq-rais"); return { achado: (q.querySelector(".paq-achado") || {}).textContent || "",
    itens: [...q.querySelectorAll(".paq-it")].map(x => [x.dataset.k, x.textContent.replace(/\s+/g, " ")]), tabela: !!q.querySelector(".paq-rola table") }; });
  conf(`a RAIS responde se há afastamento sem remuneração, e o período (${rais.achado.trim()})`, /sim: 1 licença/.test(rais.achado) && rais.itens.some(([k, t]) => /^rais\.lic:/.test(k) && /01\/06\/2016 a 31\/07\/2016/.test(t) && /61 dias/.test(t)));
  conf("a tabela dos vínculos fica no quadro da RAIS, num contêiner rolável", rais.tabela);
  conf("os CNPJs aparecem com situação, vínculo e a consulta", await p.evaluate(() => { const q = document.getElementById("paq-cnpj"); const t = q.textContent;
    return /12\.345\.678\/0001-95/.test(t) && /ativa/i.test(t) && !!q.querySelector(".tl-bt"); }));
  conf("cada quadro mostra os documentos dele com abrir", await p.evaluate(() => !!document.querySelector("#paq-rais .paq-docs .paq-doc .adr-link")));

  // 2 · a caixinha: muda no lugar, sem repintar, e vai para o pré-caso
  const rep0 = await p.evaluate(() => { window.__rep = 0; const o = repintarFicha; window.repintarFicha = (...a) => { window.__rep++; return o(...a); }; return true; });
  const kLic = rais.itens.find(([k]) => /^rais\.lic:/.test(k))[0];
  await p.click(`#paq-rais .paq-it[data-k="${kLic}"] .paq-cx`);
  const marca = await p.evaluate(k => { const li = document.querySelector(`.paq-it[data-k="${k}"]`); return { fora: li.classList.contains("fora"), aria: li.querySelector(".paq-cx").getAttribute("aria-checked"),
    rep: window.__rep, n: document.querySelector("#paq-rais .paq-n").textContent, foco: document.activeElement && document.activeElement.className }; }, kLic);
  conf("desmarcar risca o item e muda a caixinha, sem repintar a ficha", rep0 && marca.fora && marca.aria === "false" && marca.rep === 0);
  conf(`o contador do quadro acompanha (${marca.n})`, /^\d+ de \d+ vão à Análise$/.test(marca.n) && !/^(\d+) de \1 vão/.test(marca.n));
  await p.waitForTimeout(900);
  conf("a escolha vai para a linha do pré-caso (casos.ad.fora)", ((T.casos.find(k => k.id === KP).ad || {}).fora || []).includes(kLic));
  conf("o item desmarcado sai do que vai à Análise de Direito", await p.evaluate(([c, k]) => !itensLevados(D.cliPorId.get(c)).some(x => x.k === k) && itensLevados(D.cliPorId.get(c)).some(x => x.q === "cnis"), [P, kLic]));
  await p.click("#paq-rais .paq-todos");
  conf("marcar ou desmarcar todos: o quadro inteiro volta", await p.evaluate(() => ![...document.querySelectorAll("#paq-rais .paq-it")].some(li => li.classList.contains("fora"))));
  await p.click("#paq-rais .paq-todos");
  conf("e de novo, sai inteiro; o bloco antigo da RAIS deixa de ir e o do CNIS continua", await p.evaluate(c => [...document.querySelectorAll("#paq-rais [data-k]")].every(li => li.classList.contains("fora"))
    && !paVai(c, "rais") && paVai(c, "cnis"), P));
  await p.click("#paq-rais .paq-todos");

  // 3 · mostrar mais: 40 documentos sem quadro próprio ficam em Outros documentos, com 5 à vista
  const mais = await p.evaluate(() => { const q = document.getElementById("paq-docs"), its = [...q.querySelectorAll(".paq-it")];
    return { n: its.length, vis: its.filter(li => li.offsetParent !== null).length }; });
  await p.click("#paq-docs .paq-mais");
  const mais2 = await p.evaluate(() => [...document.querySelectorAll("#paq-docs .paq-it")].filter(li => li.offsetParent !== null).length);
  conf(`com 40 documentos, 5 à vista e o resto em "mostrar mais" (${mais.vis} de ${mais.n}, depois ${mais2})`, mais.n === 40 && mais.vis === 5 && mais2 === 40);

  // 4 · as chaves não mudam com a lente do Mapa ou da Análise de Direito
  const chaves = await p.evaluate(c => { const cl = D.cliPorId.get(c), ks = D.casosDoCliente.get(c) || [], k = () => quadrosDoPA(cl, ks).quadros.flatMap(q => q.itens.map(x => x.k)).join();
    const a = k(); _mapaLente.set(c, "tempo"); const b = k(); _mapaLente.set(c, "incapacidade"); const d = k(); _mapaLente.delete(c); return a === b && b === d && a.length > 0; }, P);
  conf("as chaves dos itens não mudam quando a lente da espécie muda", chaves);

  // 5 · o Mapa só mostra e manda escolher no Primeiro atendimento
  await p.evaluate(() => irSubCad("mapa"));
  await p.waitForTimeout(400);
  conf("o Mapa leva a escolher no Primeiro atendimento, sem Levar à Análise próprio", await p.evaluate(() => /Escolher no Primeiro atendimento/.test(document.body.textContent) && !document.querySelector(".mapa-levar")));
  await p.evaluate(() => irSubCad("pa"));
  await p.waitForTimeout(300);
  conf("com pré-caso, a barra diz Concluir e levar à Análise de Direito", await p.evaluate(() => /Concluir e levar à Análise de Direito/.test((document.querySelector(".paq-barra") || {}).textContent || "")));

  // 6 · o fato negativo e o dossiê parcial
  await abrir(N, "pc_n1");
  const neg = await p.evaluate(() => ({ lic: [...document.querySelectorAll("#paq-rais .paq-it")].map(li => [li.dataset.k, li.textContent]),
    cnpj: (document.querySelector("#paq-cnpj .paq-vazio") || {}).textContent || "" }));
  conf("sem licença, a RAIS diz que não há, e esse fato também vai à análise", neg.lic.some(([k, t]) => k === "rais.lic:nenhuma" && /Nenhuma licença sem remuneração na RAIS de 2015/.test(t)));
  conf(`dossiê parcial: o quadro sem consulta diz por quê (${neg.cnpj.trim()})`, /Redesim não foi consultada/.test(neg.cnpj));

  // 7 · sem dossiê: só o relato e os benefícios
  await abrir(S, "pc_s1");
  const sem = await p.evaluate(() => ({ sd: !!document.querySelector(".pa .pa-sem-dz"), relato: /Relato fictício/.test((document.querySelector(".pa-relato") || {}).textContent || ""),
    quadros: document.querySelectorAll(".pa .paq[data-q]").length, ben: document.querySelectorAll("#paq-escolha .ben-chip").length }));
  conf("sem dossiê, o painel mostra o relato da recepção e o quadro dos benefícios, sem quadros vazios", sem.sd && sem.relato && sem.quadros === 0 && sem.ben === 11);

  // 8 · 390 px: nada passa da tela, a não ser dentro do contêiner rolável
  await abrir(P, "pc_p1");
  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(400);
  const largos = await p.evaluate(() => { const w = document.documentElement.clientWidth;
    return [...document.querySelectorAll(".pa *")].filter(e => !e.closest(".paq-rola, .tp-rola") && e.getBoundingClientRect().right > w + 1 && e.getBoundingClientRect().width > 0).map(e => e.className || e.tagName).slice(0, 5); });
  await p.screenshot({ path: path.join(OUT, "02-pa-390.png"), fullPage: true });
  conf(`a 390 px nada transborda fora das tabelas roláveis${largos.length ? `: ${largos.join(", ")}` : ""}`, !largos.length);

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
