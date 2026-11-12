// F466 · o Dashboard do caso (ditado pelo Paulo em 09.11.2026): abaixo das fases e abaixo do campo de escrever (F486), o Último
// andamento no Escritório da equipe com Anotar e Prorrogar (F467: sem Concluir, Anotar verde) e, abaixo das anotações, o Último andamento do portal da fase; os números só aparecem em
// "Ver anotações anteriores", que também mostra a linha do tempo. Banco simulado e dados fictícios. Uso: node f466.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f466";
fs.mkdirSync(OUT, { recursive: true });

const PAULO = FIX.colaboradores[0].id, MARCOS = "22222222-2222-2222-2222-222222222222";
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: [...FIX.colaboradores, { id: MARCOS, auth_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", nome: "Marcos Fictício", inicial: "M",
    cor: "#8a4b00", papel: "colaborador", ativo: true, cargo: "advogado" }],
  clientes: [], casos: [], atribuicoes: [], documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;
const iso = n => new Date(Date.now() - 3 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
const ts = (n, h = "12:00") => `${iso(n)}T${h}:00-03:00`;
let seq = 0;
const id = p => `${p}0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const base = (c, extra) => ({ id: id("b"), cliente_id: c.id, titulo: c.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
  marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, dcb_prorrogacao_pedida: false, criado_em: ts(-300), ...extra });
const cli = nome => { const c = { id: id("c"), nome, cpf: null, telefone: null, campos: {}, telefones: [], criado_em: ts(-400) }; T.clientes.push(c); return c; };
const and = (k, n, texto, o = {}) => { const a = { id: id("e"), caso_id: k.id, autor_id: PAULO, texto, origem: "app", origem_id: null, criado_em: ts(n, o.h || "12:00"),
  publico: false, excluir: false, importante: false, urgente: false, responde_a: null, ...o }; delete a.h; T.andamentos.push(a);
  T.andamentos_lidos.push({ andamento_id: a.id, colaborador_id: PAULO }); return a; };

// A · INSS com retorno: duas anotações da equipe (a última com resposta) e dois andamentos do PAT
const cA = cli("Rita Fictícia Dashboard");
const kA = base(cA, { origem_lista: "🌻 INSS", beneficio: "Auxílio por incapacidade", especie: "B31", fase: "inss", protocolos: ["1700000801"], nb: "6401234567", der: iso(-90), prazo: iso(-3) });
T.casos.push(kA); T.atribuicoes.push({ caso_id: kA.id, colaborador_id: PAULO });
and(kA, -20, "Anotação antiga: pedido protocolado.");
const nA = and(kA, -2, "Aguardar a perícia. Cliente avisada da data; levar os exames do ortopedista.");
and(kA, -1, "Exames separados na recepção.", { responde_a: nA.id, autor_id: MARCOS, h: "15:00" });
and(kA, -10, "Requerimento recebido. Em análise", { origem: "pat", origem_id: "situacao:1700000801:Em análise", autor_id: null });
and(kA, -4, "Perícia médica agendada. Agendado para 20/11/2026", { origem: "pat", origem_id: "evento:1700000801:pericia:2026-11-20", autor_id: null });
// F546 · os comentários do PAT: o mais recente no cartão, os anteriores no botão
and(kA, -6, "INSS · Apresentar o laudo do ortopedista.", { origem: "pat", origem_id: "880001", autor_id: null });
and(kA, -3, "Escritório · Laudo anexado em resposta à exigência.", { origem: "pat", origem_id: "880002", autor_id: null });

// B · Conselho com mandado de segurança em paralelo
const cB = cli("Jorge Fictício Paralelo");
const kB = base(cB, { origem_lista: "🖥 Conselho de Recursos", beneficio: "Aposentadoria por idade", especie: "B41", fase: "conselho", crps_nups: ["35014000001202699"],
  crps: [{ nup: "35014000001202699", eventos: [{ data: iso(-30), tipo: "tramitacao", resumo: "Recurso protocolado", bruto: "Requerimento protocolado - Tarefa" },
    { data: iso(-8)+" 10:00:00", tipo: "tramitacao", resumo: "Distribuído", bruto: "Distribuição automática - 26ª JR" },
    { data: iso(-6)+" 09:00:00", tipo: "tramitacao", resumo: "Encaminhado", bruto: "Encaminhamento automático - 26ª JR para Composição" },
    { data: iso(-6)+" 11:30:00", tipo: "tramitacao", resumo: "Encaminhado à Junta de Recursos", bruto: "Criação de subtarefa - Número do protocolo GET: 000000000" }] }],
  processos: [{ numero: "50000420420264036102", papel: "ms", classe: "Mandado de Segurança" }],
  ronda: { expedientes: { "50000420420264036102|1º grau": { em: iso(-1)+"T10:00:00", grau: "1º grau", host: "pje1g.trf3.jus.br", itens: [{ ato: "Intimação", destinatario: "JORGE FICTICIO", limite: iso(10), fechado: false }] } },
    detalhes: { "50000420420264036102|1º grau": { em: iso(-1)+"T10:00:00", grau: "1º grau", "Competência": "JUIZADO ESPECIAL FEDERAL CÍVEL", "Órgão julgador": "1ª Vara Gabinete JEF de Catanduva",
      "Valor da causa": "R$ 36.219,08", "Justiça gratuita?": "SIM", "Polo ativo": "JORGE FICTICIO PARALELO", "Polo passivo": "INSTITUTO NACIONAL DO SEGURO SOCIAL - INSS" } } },
  pje_link: "https://pje1g.trf3.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=1&ca=abc" });
T.casos.push(kB); T.atribuicoes.push({ caso_id: kB.id, colaborador_id: PAULO });
and(kB, -5, "Conclusos para decisão", { origem: "pje", origem_id: "pje:50000420420264036102:1", autor_id: null });
and(kB, -5, "PJe (1º grau): Expedição de Outros documentos · Disponibilizado no DJ Eletrônico — em "+iso(-5).split("-").reverse().join(".")+" 09:00 — MS 5000042-04.2026.4.03.6102", { origem: "pje", origem_id: "pje:50000420420264036102:2", autor_id: null, h: "09:00" });
// F492 · movimento antigo importado hoje: vale a data do movimento (origem_id), e não a da importação
and(kB, 0, "PJe (1º grau): Remetidos os Autos — em 05.03.2025 15:33 — MS 5000042-04.2026.4.03.6102", { origem: "pje", origem_id: `mov:50000420420264036102:${iso(-400)}T15:33:abc`, autor_id: null });
and(kB, -5, "PJe (1º grau): Juntada de Petição intercorrente", { origem: "pje", origem_id: "pje:50000420420264036102:3", autor_id: null, h: "10:00" });
and(kB, 0, "PJe (1º grau): Juntada de Petição", { origem: "pje", origem_id: `mov:50000420420264036102:${iso(-500)}T10:00:def`, autor_id: null });
and(kB, 0, "PJe (1º grau): Distribuído por sorteio", { origem: "pje", origem_id: `mov:50000420420264036102:${iso(-600)}T10:00:ghi`, autor_id: null });

// D · processo no 2º grau (Turma Recursal): a situação vem do 2º grau, e não do 1º (F529)
const cD = cli("Cliente Teste Segundo Grau");
const kD = base(cD, { origem_lista: "👪 Judicial", beneficio: "Auxílio por incapacidade", especie: "B31", fase: "judicial", etapa: "aguardando sentença",
  processos: [{ numero: "50012340320254036314", classe: "Procedimento do Juizado Especial Cível" }],
  trf3: { ordem: 120, total: 800, consultado_em: iso(-2), projecao: { previsao: "2027-03-15" } },
  ronda: { detalhes: { "50012340320254036314|1º grau": { em: iso(-1)+"T10:00:00", grau: "1º grau", "Órgão julgador": "1ª Vara Gabinete JEF de Catanduva" },
    "50012340320254036314|2º grau": { em: iso(-1)+"T10:00:00", grau: "2º grau", "Órgão julgador": "37º Juiz Federal da 13ª TR SP" } } } });
T.casos.push(kD); T.atribuicoes.push({ caso_id: kD.id, colaborador_id: PAULO });
and(kD, 0, "PJe (1º grau): Sentença · Julgado improcedente o pedido", { origem: "pje", origem_id: `mov:50012340320254036314:${iso(-200)}T10:00:s1`, autor_id: null });
and(kD, 0, "PJe (2º grau): Distribuído por sorteio", { origem: "pje", origem_id: `mov:50012340320254036314:${iso(-100)}T10:00:s2`, autor_id: null });
and(kD, 0, "PJe (2º grau): Conclusos para julgamento", { origem: "pje", origem_id: `mov:50012340320254036314:${iso(-40)}T10:00:s3`, autor_id: null });
and(kD, 0, "PJe (2º grau): Juntada de Petição", { origem: "pje", origem_id: `mov:50012340320254036314:${iso(-3)}T10:00:s4`, autor_id: null });

// E · 1º grau: o concluso antigo não vale depois do prazo decorrido; certidão é ruído; órgão sem a barra (F533)
const cE = cli("Cliente Teste Prazo Decorrido");
const kE = base(cE, { origem_lista: "👪 Judicial", beneficio: "Aposentadoria por idade", especie: "B41", fase: "judicial", orgao_judicial: "/1ª VARA GABINETE JEF DE CATANDUVA",
  processos: [{ numero: "50099990320264036314", classe: "Procedimento do Juizado Especial Cível" }] });
T.casos.push(kE); T.atribuicoes.push({ caso_id: kE.id, colaborador_id: PAULO });
and(kE, 0, "PJe (1º grau): Conclusos para despacho", { origem: "pje", origem_id: `mov:50099990320264036314:${iso(-61)}T10:00:e1`, autor_id: null });
and(kE, 0, "PJe (1º grau): Decorrido prazo de INSTITUTO NACIONAL DO SEGURO SOCIAL - INSS em 06/10/2026 23:59.", { origem: "pje", origem_id: `mov:50099990320264036314:${iso(-36)}T10:00:e2`, autor_id: null });
and(kE, 0, "PJe (1º grau): Juntada de Certidão", { origem: "pje", origem_id: `mov:50099990320264036314:${iso(-30)}T10:00:e3`, autor_id: null });

// C · sem nada: o estado vazio
const cC = cli("Caso Fictício Vazio");
const kC = base(cC, { origem_lista: "🌻 INSS", beneficio: "BPC", especie: "B88", fase: "inss" });
T.casos.push(kC); T.atribuicoes.push({ caso_id: kC.id, colaborador_id: PAULO });

const ok = [];
const conf = (nome, v) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); };

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if(!fs.existsSync(a)){ r.writeHead(404); return r.end(); }   // o ícone do AdvPrev só existe em docs/crm
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const erros = [];
  const pagina = async (opc, c, k) => {
    const ctx = await nav.newContext(opc);
    await ctx.addInitScript(([u, ss]) => {
      localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
      localStorage.setItem("crm_sessao", JSON.stringify(ss));
      localStorage.setItem("crm_tema", "v10");
      localStorage.setItem("crm_dash_caso", "1");
    }, [SUPA, SESSAO]);
    await instalarBanco(ctx, { SUPA, SESSAO, banco });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com|google\.com\/s2/, r => r.abort());
    const p = await ctx.newPage();
    p.on("pageerror", e => erros.push(e.message));
    p.on("dialog", d => d.accept());
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
    await p.waitForSelector("#app.logado", { timeout: 15000 });
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
    await p.evaluate(([cid, kid]) => { abrirFicha(cid).then(() => { casoSel = kid; abaAtiva = 2; repintarFicha(); }); }, [c.id, k.id]);
    await p.waitForSelector(".db-dash");
    await p.waitForTimeout(400);
    return { p, ctx };
  };
  const vis = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return !!e && e.offsetParent !== null; }, sel);

  // ── 1 · computador, caso A ──
  let { p, ctx } = await pagina({ viewport: { width: 1440, height: 1000 } }, cA, kA);
  conf("os cartões dizem o lugar do andamento (F486)", /^Último andamento no Escritório$/.test((await p.locator(".db-desp h3").textContent()).trim()) && /^Último andamento no INSS$/.test((await p.locator(".db-and h3").textContent()).trim()));
  conf("o Último despacho mostra a última anotação da equipe e a resposta", /Aguardar a perícia/.test(await p.locator(".db-desp .db-txt").textContent()) && /Marcos: Exames separados/.test(await p.locator(".db-desp .db-resp").textContent()));
  conf("o cabeçalho diz quando e quantas anteriores", /ontem|há 2 dias/.test(await p.locator(".db-desp .db-when").textContent()) && /Ver anotações anteriores \(1\)/.test(await p.locator(".db-desp .db-ant").textContent()));
  conf("Anotar (verde) e Prorrogar, sem Concluir (F467)", (await p.locator(".db-desp .db-acoes .btn-mini").allTextContents()).join(",") === "Anotar,Prorrogar" && await p.evaluate(() => { const b = document.querySelector('.db-desp [data-ae="anotar"]'); const c = getComputedStyle(b); return c.color === "rgb(255, 255, 255)" && c.backgroundColor !== "rgb(255, 255, 255)"; }));
  conf("o ícone do despacho é o do AdvPrev", await p.locator('.db-desp .db-logo img[src="icone-192.png"]').count() === 1);
  conf("o Último andamento fica ao lado do Escritório (F499)", await p.evaluate(() => { const a = document.querySelector(".db-col-dir .db-and"), d = document.querySelector(".db-col-esq .db-desp"); if(!a||!d) return false; const ra = a.getBoundingClientRect(), rd = d.getBoundingClientRect(); return ra.left >= rd.right && Math.abs(ra.top - rd.top) < 200; }));
  conf("o campo de escrever fica abaixo do Escritório e só na coluna dele (F500)", await p.evaluate(() => { const e = document.querySelector(".db-col-esq textarea, .db-col-esq [contenteditable]"), d = document.querySelector(".db-col-esq .db-desp"); return !!e && !!d && e.getBoundingClientRect().top >= d.getBoundingClientRect().bottom - 1 && !document.querySelector(".db-col-dir textarea"); }));
  conf("os números não aparecem fechados", await p.locator(".db-n").count() === 0);
  conf("a linha do tempo fica escondida enquanto o Dashboard está fechado", !(await vis(p, ".caso-dir .timeline")));
  conf("o cartão do INSS mostra o último comentário, com a situação (F546)", await p.locator(".db-and").count() === 1 && /Comentário do escritório: Laudo anexado/.test(await p.locator(".db-and .db-mov").textContent()) && !/Perícia médica/.test(await p.locator(".db-and .db-mov").textContent()) && /Em análise/.test(await p.locator(".db-and .db-sub").textContent()) && await p.locator(".db-and .db-logo[aria-label='Abrir no Meu INSS']").count() === 1);
  conf("o cartão do INSS conta os comentários anteriores (F546)", /Ver comentários anteriores \(1\)/.test(await p.locator(".db-and .db-ant").textContent()));
  conf("os anteriores ficam no canto direito da linha de botões, em todos os quadros (F546)", await p.evaluate(() => [[".db-desp .db-acoes", ".btn-mini"], [".db-and .db-bts", ".db-bt"]].every(([l, b]) => {
    const a = document.querySelector(l + " > .db-ant"), u = [...document.querySelectorAll(l + " " + b)].pop(); if(!a) return false;
    const ra = a.getBoundingClientRect(), rl = document.querySelector(l).getBoundingClientRect(), ru = u ? u.getBoundingClientRect() : null;
    return (!ru || ra.left > ru.right || ra.top >= ru.bottom - 1) && rl.right - ra.right < 4; })) && await p.locator(".db-cab .db-ant").count() === 0);
  const alvos = await p.evaluate(() => [...document.querySelectorAll(".db button, .db a")].map(b => { const r = b.getBoundingClientRect(); return Math.min(r.width, r.height); }));
  conf(`no computador todo alvo tem 32 px ou mais (${Math.min(...alvos)})`, alvos.length && Math.min(...alvos) >= 32);
  await p.screenshot({ path: path.join(OUT, "pc-fechado.png") });
  await p.locator(".db-desp .db-ant").click(); await p.waitForTimeout(400);
  conf("Ver anotações anteriores mostra a linha do tempo e os números", await vis(p, ".caso-dir .timeline") && await p.locator(".db-n").count() >= 3 && /Ocultar/.test(await p.locator(".db-desp .db-ant").textContent()));
  conf("as anotações anteriores abrem para baixo e o cartão do portal continua ao lado (F499)", await p.evaluate(() => { const t = document.querySelector(".db-col-esq > .timeline"), a = document.querySelector(".db-col-dir .db-and"), d = document.querySelector(".db-desp"); return !!t && !!a && t.getBoundingClientRect().top > d.getBoundingClientRect().bottom - 1 && a.getBoundingClientRect().left > t.getBoundingClientRect().right - 1; }));
  conf("o número copia ao clique (data-cop)", await p.locator(".db-n[data-cop]").count() === await p.locator(".db-n").count() && /1700000801/.test(await p.locator(".db-n").first().getAttribute("data-cop")));
  await p.screenshot({ path: path.join(OUT, "pc-aberto.png") });
  await p.locator(".db-desp .db-ant").click(); await p.waitForTimeout(300);
  conf("Ocultar fecha de novo", !(await vis(p, ".caso-dir .timeline")) && await p.locator(".db-n").count() === 0);
  await p.locator('.db-desp [data-ae="anotar"]').click(); await p.waitForTimeout(200);
  conf("Anotar abre o painel no lugar dos botões", await vis(p, ".db-desp .ae-painel") && !(await vis(p, ".db-desp .db-acoes")) && await p.locator(".db-desp .ae-nota").count() === 1);
  await p.locator('.db-desp [data-ae="cancelar"]').click(); await p.waitForTimeout(200);
  conf("Cancelar devolve os botões", await vis(p, ".db-desp .db-acoes"));
  await p.locator('.db-desp [data-ae="reagendar"]').click(); await p.waitForTimeout(200);
  conf("Prorrogar do retorno oferece as datas", await p.locator(".db-desp .ae-dias .esp-it").count() === 4);
  await p.locator('.db-desp [data-ae="cancelar"]').click(); await p.waitForTimeout(200);
  await p.locator(".db-and .db-ant").click(); await p.waitForTimeout(400);
  conf("Ver andamentos anteriores abre a lista logo abaixo do cartão (F511)", await vis(p, ".db-and .db-pn") && /Apresentar o laudo/.test(await p.locator(".db-and .db-pn").textContent()) && !/Requerimento recebido/.test(await p.locator(".db-and .db-pn").textContent()) && await p.locator(".db-dash").count() > 0 && /Ocultar/.test(await p.locator(".db-and .db-ant").textContent()));
  await p.locator(".db-and .db-ant").click(); await p.waitForTimeout(300);
  conf("Ocultar fecha a lista", await p.locator(".db-and .db-pn").count() === 0);
  await ctx.close();

  // ── 2 · caso B: CRPS e o mandado de segurança em paralelo ──
  ({ p, ctx } = await pagina({ viewport: { width: 1440, height: 1000 } }, cB, kB));
  conf("o cartão do Conselho diz CRPS (F499)", /^Último andamento no CRPS$/.test((await p.locator(".db-and.crps h3").textContent()).trim()));
  conf("dois cartões de processo ficam empilhados à direita", await p.locator(".db-col-dir .db-and").count() === 2);
  conf("no Conselho o Último andamento é do e-Recursos", await p.locator(".db-and.crps").count() === 1);
  const crpsLis = await p.locator(".db-and.crps .db-movs li").allTextContents();
  console.log("  [B] crps:", JSON.stringify(crpsLis));
  conf("o CRPS lista os três últimos andamentos com o status cru do e-SISREC, o mais novo no alto (F547)",
    /Criação de subtarefa/.test(crpsLis[0]) && /Criação de subtarefa[\s\S]*Encaminhamento automático - 26ª JR para Composição/.test(crpsLis[0])
    && crpsLis.some(t=>/Distribuição automática - 26ª JR/.test(t)) && !crpsLis.join(" ").includes("Requerimento protocolado"));
  conf("o quarto andamento fica em Ver andamentos anteriores (1) (F547)", /\(1\)/.test(await p.locator(".db-and.crps .db-ant").textContent()));
  conf("o mandado de segurança ganha o segundo cartão, Judicial", await p.locator(".db-and.jud").count() === 1 && /Em paralelo · mandado de segurança/.test(await p.locator(".db-and.jud .db-par").textContent()) && /Conclusos/.test(await p.locator(".db-and.jud .db-rel").textContent()));
  conf("a data do cartão é a do movimento, não a da importação (F492)", /há 5 dias/.test(await p.locator(".db-and.jud .db-when").textContent()));
  const lis = await p.locator(".db-and.jud .db-rel > li").allTextContents(), jud = await p.locator(".db-and.jud").textContent();
  console.log("  [B] rel:", JSON.stringify(lis), "| situ:", await p.locator(".db-and.jud .db-situ").textContent(), "| rot:", await p.locator(".db-and.jud .db-rot").textContent().catch(()=>"-"));
  conf("o Judicial mostra a situação com o órgão (F523)", /1ª Vara Gabinete JEF de Catanduva/.test(await p.locator(".db-and.jud .db-situ").textContent()));
  conf("o Judicial mostra até dois movimentos relevantes, sem a rotina (F523)", lis.length >= 1 && lis.length <= 2
    && /Conclusos/.test(lis[0]) && !/intercorrente|Distribuído/.test(lis.join(" ")) && !/PJe \(1º grau\)|— em|5000042/.test(lis.join(" ")));
  conf("a rotina vira uma linha de contagem (F523)", /\+\d+ movimentos? de rotina/.test(await p.locator(".db-and.jud .db-rot").textContent()));
  await p.locator(".db-and.jud .db-ant").click(); await p.waitForTimeout(300);
  const ant = await p.locator(".db-and.jud .db-pn").textContent();
  conf("os anteriores trazem a rotina e as datas mais antigas, abaixo do cartão (F511/F523)", /Ocultar/.test(await p.locator(".db-and.jud .db-ant").textContent()) && /intercorrente/.test(ant) && /Remetidos os Autos/.test(ant) && /Distribuído por sorteio/.test(ant) && !/Conclusos/.test(ant));
  await p.locator(".db-and.jud .db-ant").click(); await p.waitForTimeout(300);
  await p.locator('.db-and.jud .db-bt:has-text("Expedientes")').click(); await p.waitForTimeout(300);
  conf("Expedientes abre logo abaixo do cartão, sem janela (F509)", await p.locator(".db-and.jud .db-pn .exp-tab").count() === 1 && await p.locator(".modal-fundo").count() === 0);
  await p.locator('.db-and.jud .db-bt:has-text("Detalhes")').click(); await p.waitForTimeout(300);
  const det = await p.locator(".db-and.jud .db-pn .db-det").textContent().catch(() => "");
  conf("Detalhes troca o painel e mostra o cabeçalho do processo (F509)", await p.locator(".db-and.jud .exp-tab").count() === 0 && /Número do Processo/.test(det) && /JUIZADO ESPECIAL FEDERAL CÍVEL/.test(det) && /Órgão julgador Atual/.test(det) && /Polo passivo/.test(det));
  await p.locator('.db-and.jud .db-bt:has-text("Detalhes")').click(); await p.waitForTimeout(300);
  conf("Detalhes de novo fecha o painel (F509)", await p.locator(".db-and.jud .db-pn").count() === 0);
  conf("Baixar e Claude ficam no cartão (F509)", await p.locator('.db-and.jud .db-bt:has-text("Baixar")').count() === 1 && await p.locator('.db-and.jud .db-bt:has-text("Claude")').count() === 1);
  conf("o cartão Judicial tem o link do portal", await p.locator(".db-and.jud a.db-logo[target='_blank']").count() === 1);
  await ctx.close();

  // ── 2b · caso D: o processo no 2º grau não mostra dado do 1º grau (F529) ──
  ({ p, ctx } = await pagina({ viewport: { width: 1440, height: 1000 } }, cD, kD));
  const situD = await p.locator(".db-and.jud .db-situ").textContent(), relD = (await p.locator(".db-and.jud .db-rel").textContent().catch(()=>""));
  console.log("  [D] situ:", situD, "| rel:", relD, "| fila:", await p.locator(".db-and.jud .db-fila").textContent().catch(()=>"-"));
  conf("no 2º grau o órgão é a Turma Recursal, e não a vara (F529)", /TRF3 · 13ª Turma Recursal/.test(situD) && !/1ª Vara/.test(situD));
  conf("o estado e a data vêm do último movimento do 2º grau (F529)", /Concluso para julgamento/.test(situD) && situD.includes("desde "+iso(-40).split("-").reverse().join("/")));
  conf("no 2º grau aparece a fila do TRF3 (F529)", /120º de 800/.test(await p.locator(".db-and.jud .db-fila").textContent()));
  conf("a sentença do 1º grau não entra nos relevantes do 2º grau (F529)", !/Sentença|improcedente/.test(relD) && /Conclusos/.test(relD));
  await ctx.close();

  // ── 2c · caso E: o movimento mais novo decide (F533) ──
  ({ p, ctx } = await pagina({ viewport: { width: 1440, height: 1000 } }, cE, kE));
  const situE = await p.locator(".db-and.jud .db-situ").textContent();
  console.log("  [E] situ:", situE);
  conf("o prazo decorrido depois do concluso decide o estado, e a certidão não (F533)", /Prazo decorrido/.test(situE) && !/Concluso/.test(situE) && situE.includes("desde "+iso(-36).split("-").reverse().join("/")));
  conf("o órgão julgador aparece sem a barra do começo (F533)", /VARA GABINETE JEF DE CATANDUVA/i.test(situE) && !/\//.test(situE.replace(/\d{2}\/\d{2}\/\d{4}/g, "")));
  await ctx.close();

  // ── 3 · caso C: o estado vazio ──
  ({ p, ctx } = await pagina({ viewport: { width: 1440, height: 1000 } }, cC, kC));
  conf("sem anotação, o Último despacho diz isso", /Sem anotação da equipe/.test(await p.locator(".db-desp .db-vazio").textContent()) && !/\(\d+\)/.test(await p.locator(".db-desp .db-ant").textContent()));
  conf("sem andamento de portal não há cartão de andamento", await p.locator(".db-and").count() === 0);
  conf("sem processo ativo o Escritório ocupa a largura toda (F499)", await p.locator(".db-col-dir").count() === 0 && await p.locator(".db-grade-in.com-lado").count() === 0);
  conf("sem retorno a mover, o Prorrogar não existe e fica o Anotar (F473)", await p.locator('.db-desp [data-ae="reagendar"]').count() === 0 && await p.locator('.db-desp [data-ae="anotar"]').count() === 1);
  await ctx.close();

  // ── 4 · celular ──
  ({ p, ctx } = await pagina({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, cA, kA));
  const m = await p.evaluate(() => { const alvos = [...document.querySelectorAll(".db button, .db a")].map(b => { const r = b.getBoundingClientRect(); return Math.min(r.width, r.height); });
    const d = document.querySelector(".caso-dir"); return { alvo: Math.min(...alvos), larg: d.scrollWidth <= d.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1 }; });
  conf(`no celular todo alvo tem 44 px ou mais (${m.alvo})`, m.alvo >= 44);
  conf("no celular nada passa da tela", m.larg);
  conf("no celular os anteriores ficam numa linha própria, à direita, no fim dos botões (F546)", await p.evaluate(() => [".db-desp .db-acoes", ".db-and .db-bts"].every(l => {
    const a = document.querySelector(l + " > .db-ant"); if(!a) return false; const ra = a.getBoundingClientRect(), rl = document.querySelector(l).getBoundingClientRect();
    return rl.bottom - ra.bottom < 4 && getComputedStyle(a).textAlign === "right"; })));
  await p.screenshot({ path: path.join(OUT, "celular.png") });
  await ctx.close();

  console.log("=== F466 · o Dashboard do caso ===");
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length + erros.length;
  console.log(`${ok.length - ok.filter(x => !x[1]).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
