// F238 · o Primeiro atendimento em passos (docs/ATENDIMENTO-EM-ETAPAS.md): a trilha com
// flechas na ordem dos quadros, um passo à vista, Anterior e Próximo sem repintar a ficha,
// a escolha dos benefícios como último passo, o passo aberto gravado no pré-caso
// (casos.ad.passos), Ver tudo numa página lembrado no navegador e o quadro vazio dentro
// do Não encontrado. Banco simulado e dados fictícios. Uso: node f238.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f238";
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
  const estado = () => p.evaluate(() => { const r = document.querySelector('.pa[data-tp="pa"]'); if (!r) return null;
    const vis = [...r.querySelectorAll(".tp-passo")].filter(x => x.offsetParent !== null).map(x => x.dataset.passo);
    const lis = [...r.querySelectorAll(".tp-trilha > li")];
    const v = sel => { const b = r.querySelector(sel); return !!b && b.offsetParent !== null; };
    const aq = lis.find(l => l.classList.contains("aqui"));
    return { ids: lis.map(l => l.dataset.passo), vis, aqui: aq ? aq.dataset.passo : "",
      feitos: lis.filter(l => l.classList.contains("feito")).map(l => l.dataset.passo), cur: r.querySelectorAll('.tp-trilha [aria-current="step"]').length,
      prox: v(".tp-prox") ? r.querySelector(".tp-prox").textContent : "", ant: v(".tp-ant"), antOff: !!(r.querySelector(".tp-ant") || {}).disabled,
      fim: v(".tp-fim"), onde: (r.querySelector(".tp-onde") || {}).textContent || "" }; });

  // 1 · abre em passos: a trilha na ordem da conversa e um passo só à vista
  await abrir(P, "pc_p1");
  await p.screenshot({ path: path.join(OUT, "01-cnis.png") });
  let e = await estado();
  conf(`a trilha segue a ordem dos quadros e termina na escolha (${e && e.ids.join(", ")})`, e && e.ids.slice(0, 3).join() === "cnis,rais,cnpj" && e.ids.includes("falta") && e.ids[e.ids.length - 1] === "escolha");
  conf(`um passo só à vista, o CNIS (${e.vis.join(", ")})`, e.vis.join() === "cnis" && e.aqui === "cnis" && e.cur === 1);
  conf(`o pé diz onde está e oferece o próximo (${e.onde} · ${e.prox})`, /Passo 1 de \d+/.test(e.onde) && /^Próximo: RAIS e CAGED/.test(e.prox) && e.antOff && !e.fim);
  conf("os quadros escondidos continuam na página (o conteúdo é o mesmo)", await p.evaluate(() => !!document.querySelector("#paq-rais .paq-it") && !!document.querySelector("#paq-escolha .ben-chip")));

  // 2 · Próximo e Anterior trocam o passo no lugar, sem repintar a ficha
  await p.evaluate(() => { window.__rep = 0; const o = repintarFicha; window.repintarFicha = (...a) => { window.__rep++; return o(...a); }; });
  await p.click(".tp-prox");
  e = await estado();
  conf(`Próximo abre a RAIS e marca o CNIS como visto (${e.vis} · feitos ${e.feitos})`, e.vis.join() === "rais" && e.aqui === "rais" && e.feitos.includes("cnis") && e.ant && !e.antOff);
  conf("o passo visto ganha o ✓ na trilha", await p.evaluate(() => document.querySelector('.tp-trilha li[data-passo="cnis"] .tp-n').textContent === "✓"));
  await p.screenshot({ path: path.join(OUT, "02-rais.png") });
  await p.click(".tp-ant");
  e = await estado();
  conf("Anterior volta ao CNIS", e.vis.join() === "cnis");
  conf("trocar de passo não repinta a ficha", await p.evaluate(() => window.__rep === 0));

  // 3 · a caixinha atualiza a conta do passo na trilha
  await p.click('.tp-trilha li[data-passo="rais"] button');
  const c0 = await p.textContent('.tp-trilha li[data-passo="rais"] .tp-conta');
  await p.click("#paq-rais .paq-it .paq-cx");
  const c1 = await p.textContent('.tp-trilha li[data-passo="rais"] .tp-conta');
  conf(`desmarcar um item muda a conta do passo (${c0} → ${c1})`, c0 !== c1 && /^\d+\/\d+$/.test(c1));
  await p.click("#paq-rais .paq-it .paq-cx");

  // 4 · o último passo é a escolha, com o Concluir no lugar do Próximo
  await p.click('.tp-trilha li[data-passo="escolha"] button');
  e = await estado();
  conf(`a escolha dos benefícios é o último passo, com Concluir e sem Próximo (${e.onde})`, e.vis.join() === "escolha" && e.fim && !e.prox);
  await p.screenshot({ path: path.join(OUT, "03-escolha.png") });

  // 5 · o passo fica no pré-caso e volta quando se reabre o atendimento
  await p.waitForTimeout(900);
  conf("o passo aberto vai para a linha do pré-caso (casos.ad.passos.pa)", ((T.casos.find(k => k.id === KP).ad || {}).passos || {}).pa === "escolha");
  await p.reload(); await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await abrir(P, "pc_p1");
  e = await estado();
  conf(`reaberto, o atendimento volta à escolha, com os passos de antes vistos (${e.vis} · ${e.feitos.length} vistos)`, e.vis.join() === "escolha" && e.feitos.includes("cnis") && e.feitos.includes("falta"));

  // 6 · Ver tudo numa página: a página de hoje, lembrada no navegador
  await p.click(".tp-chave input");
  e = await estado();
  conf(`Ver tudo mostra todos os passos (${e.vis.length} de ${e.ids.length})`, e.vis.length === e.ids.length && !e.ant && !e.prox && e.fim && e.cur === 0 && /Página inteira/.test(e.onde));
  conf("a escolha fica guardada no navegador", await p.evaluate(() => localStorage.getItem("crm_passos_tudo") === "1"));
  await p.evaluate(() => repintarFicha()); await p.waitForTimeout(300);
  e = await estado();
  conf("repintada a ficha, continua a página inteira", e.vis.length === e.ids.length);
  await p.click('.tp-trilha li[data-passo="rais"] button');
  conf("no Ver tudo, a trilha vira índice e não esconde nada", (await estado()).vis.length === e.ids.length);
  await p.click(".tp-chave input");
  e = await estado();
  conf("desligado, volta a um passo só", e.vis.length === 1);

  // 7 · o quadro vazio não vira passo: entra no "Não encontrado"
  await abrir(N, "pc_n1");
  e = await estado();
  conf(`sem consulta à Redesim, os CNPJs entram no passo Não encontrado (${e.ids.join(", ")})`, !e.ids.includes("cnpj") && await p.evaluate(() => !!document.querySelector('.tp-passo[data-passo="falta"] #paq-cnpj')));
  conf("o rótulo do passo é curto", await p.evaluate(() => document.querySelector('.tp-trilha li[data-passo="falta"]').dataset.rot === "Não encontrado"));

  // 8 · sem dossiê não há trilha: o relato e a escolha à vista
  await abrir(S, "pc_s1");
  conf("sem dossiê, nada de trilha e a escolha à vista", await p.evaluate(() => !document.querySelector(".tp-trilha") && document.getElementById("paq-escolha").offsetParent !== null
    && document.querySelector(".paq-barra .pa-prim").offsetParent !== null));

  // 9 · 390 px: a trilha rola dentro dela, a página não
  await abrir(P, "pc_p1");
  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(400);
  const largos = await p.evaluate(() => { const w = document.documentElement.clientWidth;
    return [...document.querySelectorAll(".pa *")].filter(e => !e.closest(".paq-rola, .tp-rola") && e.getBoundingClientRect().right > w + 1 && e.getBoundingClientRect().width > 0).map(e => e.className || e.tagName).slice(0, 5); });
  await p.screenshot({ path: path.join(OUT, "04-390.png"), fullPage: true });
  conf(`a 390 px nada transborda fora da trilha e das tabelas${largos.length ? `: ${largos.join(", ")}` : ""}`, !largos.length);

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
