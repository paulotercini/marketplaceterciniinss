// F220 · o CRM percorrido pela equipe, com nota de 0 a 100 (exige mais de 95).
// Recepção, advogada, sócio e colaborador no mesmo banco simulado de estado:
// o cliente novo até o caso, o caso pelo INSS, pelo CRPS e pela Justiça, o
// cliente de vários casos organizado, as matérias por benefício e a barra por
// cargo. Dados fictícios. Uso: node f220.js [pasta-das-fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { FIX, SESSAO, CLI_VAZIO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f220";
fs.mkdirSync(OUT, { recursive: true });
const RAIZ = path.join(__dirname, "../../../..");

const AUTH = { paulo: SESSAO.user.id, amanda: "a2222222-2222-2222-2222-222222222222", marcos: "a3333333-3333-3333-3333-333333333333", bruna: "a4444444-4444-4444-4444-444444444444" };
const COL = { paulo: FIX.colaboradores[0].id, amanda: "22222222-2222-2222-2222-222222222222", marcos: "33333333-3333-3333-3333-333333333333", bruna: "44444444-4444-4444-4444-444444444444" };
const equipe = [
  { ...FIX.colaboradores[0] },
  { id: COL.amanda, auth_id: AUTH.amanda, nome: "Amanda Fictícia Garcez", inicial: "A", cor: "#1B6E38", papel: "colaborador", ativo: true, cargo: "advogado", setor: null },
  { id: COL.marcos, auth_id: AUTH.marcos, nome: "Marcos Fictício Amorim", inicial: "M", cor: "#8F5400", papel: "colaborador", ativo: true, cargo: "advogado", setor: null },
  { id: COL.bruna, auth_id: AUTH.bruna, nome: "Bruna Fictícia Recepção", inicial: "B", cor: "#6B3FA0", papel: "colaborador", ativo: true, cargo: "recepcao", setor: null },
];
const catalogo = JSON.parse(execSync("python3 crm/docs_catalogo.py --json", { cwd: RAIZ }).toString()).map((d, i) => ({ id: `cat-${i}`, ...d }));
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados"]) dados[t] = [];
Object.assign(dados, { colaboradores: equipe, clientes: JSON.parse(JSON.stringify(FIX.clientes)), casos: JSON.parse(JSON.stringify(FIX.casos)),
  atribuicoes: FIX.atribuicoes, credenciais: FIX.credenciais, documentos_beneficio: catalogo, modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const hoje = new Date().toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });

function cpfFicticio(base9) {
  const d = String(base9).split("").map(Number);
  const dv = n => { const s = d.slice(0, n).reduce((t, x, i) => t + x * (n + 1 - i), 0); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  d.push(dv(9)); d.push(dv(10));
  return d.join("");
}
let pontos = 0, total = 0;
const falhas = [];
function conf(peso, nome, ok) {
  total += peso;
  if (ok) pontos += peso; else falhas.push(`${nome} (${peso})`);
  console.log(`${ok ? "✔" : "✘"} [${peso}] ${nome}`);
}

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  async function entrar(quem, largura = 1440) {
    const ctx = await nav.newContext({ viewport: { width: largura, height: 1000 } });
    const sess = { ...SESSAO, user: { ...SESSAO.user, id: AUTH[quem] } };
    await ctx.addInitScript(([u, ss]) => {
      localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
      localStorage.setItem("crm_sessao", JSON.stringify(ss));
      localStorage.setItem("crm_passos_tudo", "1");   // F238/F239 · a página inteira; os passos têm o f238.js e o f239.js
      localStorage.setItem("crm_tema", "v10");
    }, [SUPA, sess]);
    await instalarBanco(ctx, { SUPA, SESSAO: sess, banco });
    const p = await ctx.newPage();
    p._erros = [];
    p.on("pageerror", e => p._erros.push(e.message));
    p.on("dialog", d => d.accept());
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
    await p.waitForSelector("#app.logado", { timeout: 15000 });
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
    return p;
  }
  let n = 0;
  const foto = async (p, nome, cheia = false) => { n++; await p.screenshot({ path: path.join(OUT, `${String(n).padStart(2, "0")}-${nome}.png`), fullPage: cheia }); };
  const textoDe = (p, sel) => p.evaluate(s => [...document.querySelectorAll(s)].map(e => e.innerText.replace(/\s+/g, " ").trim()), sel);
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const recarregar = async p => { await p.evaluate(async () => { await carregar(); montarSidebar(); }); };

  // ══ 1 · RECEPÇÃO (8) ═══════════════════════════════════════════════════
  const bruna = await entrar("bruna");
  const lateralB = (await textoDe(bruna, "#grupo-dinamicas .lista-item, #grupo-fases .lista-item")).join(" | ");
  conf(2, "1.1 a recepção vê Escritório e Perícias, sem as listas de processo", /Escritório/.test(lateralB) && /Perícias/.test(lateralB) && !/Judicial|Conselho/.test(lateralB));
  await bruna.evaluate(() => { visao = "novocliente"; render(); });
  await bruna.waitForSelector("#ncl-cpf");
  const cpf = cpfFicticio("391845726");
  await bruna.fill("#ncl-cpf", cpf);
  await bruna.fill("#ncl-tel", "(16) 99123-4567");
  await bruna.click("button:has-text('Gravar e seguir para a etapa 2')");
  await bruna.waitForSelector("#ncl-nome", { timeout: 8000 });
  await bruna.fill("#ncl-nome", "Cecília Inventada Prado");
  await bruna.fill("#ncl-dn", "1961-05-20");
  await bruna.selectOption("#ncl-sexo", "F");
  await bruna.fill("#ncl-rua", "Rua Fictícia das Flores");
  await bruna.fill("#ncl-num", "120");
  await bruna.fill("#ncl-caso", "Apos. por Idade");
  await bruna.fill("#ncl-relato", "Trabalhou de costureira registrada e quer saber se já pode se aposentar por idade.");
  const voltarBranco = await bruna.evaluate(() => { const b = [...document.querySelectorAll(".form-linha button")].find(x => x.textContent.trim() === "Voltar"); return b && getComputedStyle(b).backgroundColor; });
  conf(2, "1.2 o Voltar do cadastro é botão secundário", /255, 255, 255/.test(voltarBranco || ""));
  await foto(bruna, "recepcao-etapa2");
  await bruna.click("button:has-text('Concluir cadastro')");
  await espera(1500);
  const cli = banco.t.clientes.find(c => c.cpf === cpf);
  const menc = banco.t.mencoes.filter(m => m.cliente_id === (cli || {}).id);
  conf(2, "1.3 a menção do cliente novo pede para abrir o atendimento", menc.length >= 2 && menc.every(m => /abrir o atendimento/.test(m.texto)));
  conf(2, "1.4 a recepção não teve erro de tela", !bruna._erros.length);

  // ══ 2 · AMANDA, ADVOGADA (12) ══════════════════════════════════════════
  const amanda = await entrar("amanda");
  const lateralA = (await textoDe(amanda, "#grupo-dinamicas .lista-item, #grupo-fases .lista-item")).join(" | ");
  conf(2, "2.1 a advogada tem Atribuídas a mim e Aposentadorias futuras", /Atribuídas a mim/.test(lateralA) && /Aposentadorias futuras/i.test(lateralA));
  await amanda.evaluate(() => { visao = "mencoes"; render(); });
  await amanda.waitForTimeout(300);
  await amanda.click(".mencao button:has-text('abrir o atendimento')");
  await amanda.waitForTimeout(1500);
  const telaPA = await amanda.evaluate(() => ({ sub: subCad, tela: document.getElementById("detalhe").classList.contains("atend-tela") }));
  conf(3, "2.2 a menção abre o atendimento no Primeiro atendimento, em tela cheia", telaPA.sub === "pa" && telaPA.tela);
  const pa = await amanda.evaluate(() => ({
    semDz: !!document.querySelector(".pa-sem-dz"), relato: /costureira/.test((document.querySelector(".pa-sem-dz") || {}).innerText || ""),
    chip: !!document.querySelector('.ben-chip[data-fam="tempo"].on'), opc: !!document.querySelector('.ben-opc[data-opc="tempo.idade"].on') }));
  conf(3, "2.3 sem dossiê o passo mostra o relato e já marca a aposentadoria por idade", pa.semDz && pa.relato && pa.chip && pa.opc);
  await foto(amanda, "amanda-primeiro-atendimento", true);
  await amanda.fill("#atend-nota", "Conferir a CTPS antiga da costura com a cliente, @Marcos");
  await amanda.click(".atend-conv-nova button:has-text('Anotar')");
  await amanda.waitForTimeout(800);
  const cliA = banco.t.clientes.find(c => c.id === cli.id);
  const notaOk = ((cliA.campos || {}).atendimento || []).some(x => /CTPS antiga/.test(x.texto));
  const mencMarcos = banco.t.mencoes.some(m => m.para_id === COL.marcos && m.cliente_id === cli.id && /CTPS antiga/.test(m.texto));
  conf(2, "2.4 a conversa da equipe grava a anotação e avisa quem foi citado", notaOk && mencMarcos);
  conf(2, "2.5 a barra do Escritório não duplica o Desfecho na tela de atendimento", await amanda.evaluate(() => { irSubCad("direito"); return !document.querySelector(".adr-barra-esc"); }));

  // ══ 3 · PAULO: ANÁLISE, DESFECHO E O CASO (14) ═════════════════════════
  const paulo = await entrar("paulo");
  await paulo.evaluate(id => abrirFicha(id), cli.id);
  await paulo.waitForTimeout(800);
  await paulo.evaluate(id => { abaAtiva = 0; _atendAberto.add(id); irSubCad("direito"); }, cli.id);
  await paulo.waitForSelector("#ad-esp", { state: "attached" });
  await paulo.evaluate(() => { document.getElementById("ad-novo").open = true; const e = document.getElementById("ad-esp"); e.value = "B41"; e.dispatchEvent(new Event("change", { bubbles: true })); });
  await paulo.waitForTimeout(300);
  await paulo.evaluate(() => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); } };
    set("ad-f-data_direito", "2023-05-20"); set("ad-f-carencia", "192 contribuições"); set("ad-f-tempo", "16 anos");
    document.getElementById("ad-contexto").value = "Costureira com 16 anos de CTPS; idade cumprida em 2023; carência de 180 cumprida.";
  });
  await paulo.click("#ad-novo button:has-text('Registrar análise')");
  await paulo.waitForTimeout(1500);
  await paulo.evaluate(() => irSubCad("documentos")); await paulo.waitForTimeout(500);   // F239 · o Desfecho fica só no fim de Documentos
  const desf = (await textoDe(paulo, "#desfecho .desf-base"))[0] || "";
  conf(2, "3.1 a análise registrada sugere gerar o caso", /^Caso/.test(desf));
  const casosAntes = banco.t.casos.filter(k => k.cliente_id === cli.id).length;
  await paulo.click("#desfecho button:has-text('Gerar o caso')");
  await paulo.waitForTimeout(600);
  const perguntou = await paulo.evaluate(() => !!document.getElementById("desf-sem"));
  conf(4, "3.2 sem procuração e contrato gerados, o CRM pergunta antes de criar o caso", perguntou && banco.t.casos.filter(k => k.cliente_id === cli.id).length === casosAntes);
  await foto(paulo, "paulo-pergunta-documentos");
  await paulo.click("button:has-text('Gerar o caso assim mesmo')");
  await paulo.waitForTimeout(2200);
  const caso = banco.t.casos.find(k => k.cliente_id === cli.id);
  const andCaso = caso ? banco.t.andamentos.filter(a => a.caso_id === caso.id) : [];
  const depois = await paulo.evaluate(() => ({ sub: subCad, docs: !!document.querySelector(".doc-quadros") }));
  conf(4, "3.3 o caso nasce, a ficha abre em Documentos e o andamento diz a verdade sobre os documentos",
    !!caso && depois.sub === "documentos" && depois.docs && andCaso.some(a => /a gerar em Documentos/.test(a.texto || "")));
  await foto(paulo, "paulo-documentos-do-caso", true);
  await paulo.evaluate(id => { _atendAberto.delete(id); abaAtiva = 2; repintarFicha(); }, cli.id);
  await paulo.waitForTimeout(400);
  await paulo.evaluate(() => irOutraAba("documentos"));
  await paulo.waitForTimeout(400);
  conf(2, "3.4 com caso em andamento, Documentos continua acessível", await paulo.evaluate(() => subCad === "documentos" && !!document.querySelector(".doc-quadros")));
  conf(2, "3.5 nenhum erro de tela no desfecho", !paulo._erros.length);

  // ══ 4 · O CASO PELO INSS, CRPS, JUSTIÇA E PAGAMENTO (16) ══════════════════════════
  // 4.1 · protocolo no caso do Escritório leva o caso ao INSS
  banco.t.casos.push({ id: "b0000000-0000-0000-0000-0000000000e9", cliente_id: CLI_VAZIO, titulo: "Belmiro Inventado Nogueira", beneficio: "Apos. por Idade",
    especie: "B41", fase: "escritorio", origem_lista: "🙋 Escritório", protocolos: [], processos: [], crps_nups: [], nbs: [], arquivados: {}, criado_em: "2026-09-01T12:00:00Z" });
  await recarregar(paulo);
  const anotar = async (p, kid, tipo, campos) => {
    await p.evaluate(id => { casoSel = id; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); }, kid);
    await p.waitForTimeout(250);
    await p.click("#and-texto"); await p.waitForTimeout(150);
    await p.evaluate(() => { const d = document.querySelector(".tipo-mais"); if (d) d.open = true; }); await p.click(`.tipo-ch[data-tipoand="${tipo}"]`);
    await p.waitForSelector(".pop-campos");
    for (const [id, v] of Object.entries(campos)) {
      const el = await p.$(`#pa-${id}`); if (!el) continue;
      if ((await el.evaluate(e => e.tagName)) === "SELECT") await p.selectOption(`#pa-${id}`, v); else await p.fill(`#pa-${id}`, v);
      await p.evaluate(i => { const e = document.getElementById(`pa-${i}`); if (e) e.dispatchEvent(new Event("change", { bubbles: true })); }, id);
    }
    await p.click("button:has-text('inserir no andamento')");
    await p.waitForTimeout(350);
    await p.evaluate(() => { const b = document.querySelector('.esc-tg.tf-nt[data-nat="compromisso"]'); if (b && b.getAttribute("aria-pressed") === "true") b.click(); });
    await p.waitForTimeout(120);
    await p.evaluate(id => novoAndamento(id), kid);
    await p.waitForTimeout(1100);
  };
  const faixa = async (p, kid) => { await p.evaluate(id => { casoSel = id; abaAtiva = 2; repintarFicha(); }, kid); await p.waitForTimeout(250); return p.evaluate(() => (faixaAtual || []).map(x => x.rotulo || "")); };
  await paulo.evaluate(id => abrirFicha(id), CLI_VAZIO);
  await paulo.waitForTimeout(700);
  await anotar(paulo, "b0000000-0000-0000-0000-0000000000e9", "protocolo", { num: "555666777", oque: "requerimento de aposentadoria por idade", der: "2026-10-01" });
  const kE = banco.t.casos.find(k => k.id === "b0000000-0000-0000-0000-0000000000e9");
  conf(3, "4.1 o protocolo leva o caso do Escritório ao INSS e guarda o número com a marca do CRM",
    kE.fase === "inss" && kE.etapa === "requerimento protocolado" && (kE.protocolos || []).includes("555666777") && !!(kE.arquivados || {})["add:prot:555666777"]);
  conf(1, "4.1b o aviso não promete réplica no To Do", !/replicado no To Do/.test(await paulo.evaluate(() => document.getElementById("aviso").textContent)));
  // 4.2 a 4.6 · a cadeia do caso de Cecília
  const kid = caso.id;
  await paulo.evaluate(id => abrirFicha(id), cli.id);
  await paulo.waitForTimeout(700);
  await anotar(paulo, kid, "protocolo", { num: "1234567890", oque: "requerimento de aposentadoria por idade", der: "2026-08-01" });
  conf(2, "4.2 com DER, o prazo de análise do INSS (acordo do RE 1.171.152) entra nos quadros", (await faixa(paulo, kid)).some(r => /Prazo de análise do INSS|Mora do INSS/.test(r)));
  await anotar(paulo, kid, "exigencia", { oque: "CTPS original e carnês", prazo: "2026-11-12", doc: "CTPS" });
  const comExig = await faixa(paulo, kid);
  await anotar(paulo, kid, "decisao", { res: "Benefício indeferido", data: "2026-09-20", motivo: "falta de carência" });
  const k1 = banco.t.casos.find(k => k.id === kid), aposDec = await faixa(paulo, kid);
  conf(2, "4.3 a exigência tem rótulo próprio e sai com a decisão, que arma o recurso ordinário",
    comExig.includes("Exigência do INSS") && !k1.exigencia_prazo && k1.decisao_em === "2026-09-20" && aposDec.includes("Recurso ordinário") && !aposDec.includes("Exigência do INSS"));
  await anotar(paulo, kid, "peticao", { onde: "CRPS", qual: "Recurso Ordinário", data: "2026-09-25" });
  const aposRO = await faixa(paulo, kid);
  conf(2, "4.4 protocolado o recurso, o prazo de recorrer sai dos quadros", banco.t.casos.find(k => k.id === kid).fase === "conselho" && !aposRO.some(r => /Recurso (ordinário|especial)/.test(r)));
  await anotar(paulo, kid, "decisao", { res: "Recurso improvido", data: "2026-10-10", motivo: "Junta manteve o indeferimento" });
  conf(2, "4.5 o acórdão contrário da Junta arma o recurso especial", (await faixa(paulo, kid)).includes("Recurso especial"));
  await anotar(paulo, kid, "peticao", { onde: "Judicial", qual: "Petição Inicial", data: "2026-10-12" });
  await anotar(paulo, kid, "decisao", { res: "Sentença procedente", data: "2026-10-13", motivo: "carência reconhecida" });
  const kJ = banco.t.casos.find(k => k.id === kid), noJud = await faixa(paulo, kid);
  const trilhaCons = await paulo.evaluate(id => (jornadaFases(D.casoPorId.get(id)).find(x => x.f === "conselho") || {}).st, kid);
  conf(2, "4.6 no judicial não vale o prazo de 30 dias, a sentença favorável grava o resultado e a trilha mostra que houve Conselho",
    kJ.fase === "judicial" && kJ.resultado === "deferido" && !noJud.some(r => /Recurso (ordinário|especial)/.test(r)) && trilhaCons && trilhaCons !== "n");
  await foto(paulo, "caso-judicial");
  // 4.7 · a sentença lança os honorários em Pagamentos e o caso segue para o cumprimento
  await paulo.evaluate(id => janelaEncerrar(id), kid);
  await paulo.click('#janela [data-res="deferido"]');
  await paulo.click("#hon-segue");
  await paulo.fill("#hon-valor", "1500");
  await paulo.click("#hon-enviar");
  await paulo.waitForTimeout(900);
  conf(1, "4.7 a sentença lança os honorários em Pagamentos e o caso segue no Judicial para o cumprimento",
    banco.t.casos.find(k => k.id === kid).fase === "judicial" && banco.t.pagamentos.some(x => x.caso_id === kid && Number(x.valor) === 1500)
    && banco.t.andamentos.some(a => a.caso_id === kid && /SEGUE em/.test(a.texto || "")));

  // ══ 5 · O CLIENTE DE VÁRIOS CASOS (24) ═════════════════════════════════
  const cli2 = { id: "c0000000-0000-0000-0000-0000000000c2", nome: "Dirceu Fictício Lemos", cpf: cpfFicticio("472918365"), dn: "02021970", telefone: "(16) 99000-0002", sexo: "M", campos: {}, criado_em: "2025-01-10T12:00:00Z" };
  banco.t.clientes.push(cli2);
  const NUP1 = "44233123456202611", NUP2 = "44233654321202512", PROC = "0005555-11.2025.4.03.6314", P20 = "00055551120254036314";
  const D1 = "b0000000-0000-0000-0000-0000000000d1", D2 = "b0000000-0000-0000-0000-0000000000d2", D3 = "b0000000-0000-0000-0000-0000000000d3";
  banco.t.casos.push(
    { id: D1, cliente_id: cli2.id, titulo: cli2.nome, beneficio: "Auxílio-doença", especie: "B31", fase: "inss", origem_lista: "🌻 INSS", nb: "6123456789", nbs: [],
      protocolos: ["987654321"], processos: [], crps_nups: [NUP1], crps: [{ nup: NUP1, situacao: "Em análise na Junta", eventos: [] }], arquivados: {}, dcb: "2026-03-10", criado_em: "2025-11-01T12:00:00Z", todo_task_id: "t-inss" },
    { id: D2, cliente_id: cli2.id, titulo: cli2.nome, beneficio: "Aposentadoria por incapacidade", especie: "B32", fase: "judicial", origem_lista: "👪 Judicial", nb: "6198765432", nbs: [],
      processo: PROC, processos: [{ numero: PROC, nosso: true }], crps_nups: [], protocolos: ["987654321"], arquivados: {}, datajud_multi: { [P20]: { classe: "PJEC", ultimo: { nome: "Conclusos" } } }, criado_em: "2025-06-01T12:00:00Z", todo_task_id: "t-jud" },
    { id: D3, cliente_id: cli2.id, titulo: cli2.nome, beneficio: "Recurso", fase: "conselho", origem_lista: "🖥 Conselho de Recursos", nbs: [],
      crps_nups: [NUP2], crps: [{ nup: NUP2, situacao: "Julgado", eventos: [{ resumo: "Acórdão", bruto: "Recurso conhecido" }] }], protocolos: [], processos: [], arquivados: {}, criado_em: "2026-01-15T12:00:00Z", todo_task_id: "t-crps" });
  banco.t.andamentos.push(
    { id: "e0000000-0000-0000-0000-0000000000f1", caso_id: D2, origem: "pje", origem_id: `mov:${P20}:1`, texto: `PJe (1º grau): Juntada de petição — em 01/06/2025 10:00 — PJEC ${PROC}`, criado_em: "2025-06-01T13:00:00Z", autor_id: COL.paulo },
    { id: "e0000000-0000-0000-0000-0000000000f2", caso_id: D3, origem: "crps", origem_id: `${NUP2}|acordao`, texto: "🖥 CRPS · 15/01/2026 — Acórdão publicado", criado_em: "2026-01-15T13:00:00Z", autor_id: COL.paulo });
  banco.t.anexos.push(
    { id: "a0000000-0000-0000-0000-0000000000e1", cliente_id: cli2.id, caso_id: null, origem: "dossie", nome: `Recursos · ${NUP2} Recurso ordinario.pdf`, caminho: `dossie/x/Recursos/${NUP2}/Recurso ordinario.pdf`,
      tipo: "application/pdf", texto: "Recurso ordinário. Benefício NB 619.876.543-2, espécie 32.", criado_em: "2026-01-15T12:00:00Z" },
    { id: "a0000000-0000-0000-0000-0000000000e2", cliente_id: cli2.id, caso_id: D2, andamento_id: "e0000000-0000-0000-0000-0000000000f1", origem: "pje", nome: "Petição inicial", caminho: "pje/x/inicial.pdf",
      tipo: "application/pdf", texto: "Petição inicial. Pede o restabelecimento do benefício NB 612.345.678-9 cessado em 10/03/2026 e a conversão em aposentadoria por incapacidade.", criado_em: "2025-06-01T12:00:00Z" });
  await recarregar(paulo);
  await paulo.evaluate(id => abrirFicha(id), cli2.id);
  await paulo.waitForTimeout(1200);
  const escolha = await paulo.evaluate(() => (document.querySelector("#modal .modal-cx") || {}).innerText || "");
  conf(2, "5.1 a escolha do caso mostra recurso, processo e protocolo, com o Organizar", /recurso 44233\.654321\/2025-12/.test(escolha) && /proc\. 0005555-11/.test(escolha) && /Organizar os números/.test(escolha));
  await foto(paulo, "varios-casos-escolha");
  await paulo.evaluate(() => { fecharEscolha(); });
  await paulo.evaluate(id => abrirOrganizar(id), cli2.id);
  await paulo.waitForTimeout(900);
  // F221 · o plano automático junta ao caso judicial o NB que a inicial cita e os recursos do mesmo benefício
  const plano = await paulo.evaluate(() => [...document.querySelectorAll(".org-plano li")].map(x => x.textContent.replace(/\s+/g, " ")));
  conf(3, "5.2 o plano leva ao caso judicial o NB que a inicial cita, os recursos e o protocolo, e junta os casos vazios",
    plano.some(t => /Levar o NB 612\.345\.678-9 ao caso Judicial/.test(t)) && plano.some(t => /Recurso CRPS 44233\.654321\/2025-12 ao caso Judicial/.test(t))
    && plano.some(t => /Protocolo INSS 987654321 ao caso Judicial/.test(t)) && plano.filter(t => /^Juntar o caso/.test(t)).length === 2);
  await foto(paulo, "organizar-casos", true);
  // 5.3 · o processo vai ao caso do B31, com o andamento e o documento
  await paulo.evaluate(([a, b]) => moverNumero("proc", "00055551120254036314", a, b), [D2, D1]);
  await paulo.waitForTimeout(1200);
  const d1 = banco.t.casos.find(k => k.id === D1), d2 = banco.t.casos.find(k => k.id === D2);
  conf(4, "5.3 levar o processo leva os andamentos e o documento, e deixa a marca para a sincronização",
    (d1.processos || []).some(p => p.numero.replace(/\D/g, "") === P20) && !(d2.processos || []).length && !d2.processo
    && banco.t.andamentos.find(a => a.id === "e0000000-0000-0000-0000-0000000000f1").caso_id === D1
    && banco.t.anexos.find(a => a.id === "a0000000-0000-0000-0000-0000000000e2").caso_id === D1
    && !!(d2.arquivados || {})[`mov:proc:${P20}`] && !!(d1.datajud_multi || {})[P20]);
  // 5.4 · o recurso do B32 sai do caso do Conselho e vai ao caso do B32
  await paulo.evaluate(([a, b]) => moverNumero("nup", "44233654321202512", a, b), [D3, D2]);
  await paulo.waitForTimeout(1200);
  const d2b = banco.t.casos.find(k => k.id === D2), d3 = banco.t.casos.find(k => k.id === D3);
  conf(3, "5.4 levar o recurso leva o histórico do e-Recursos e os andamentos dele",
    (d2b.crps_nups || []).includes(NUP2) && (d2b.crps || []).some(b => b.nup === NUP2) && !(d3.crps_nups || []).includes(NUP2)
    && banco.t.andamentos.find(a => a.id === "e0000000-0000-0000-0000-0000000000f2").caso_id === D2);
  // 5.5 · o protocolo repetido fica só no caso do B31
  await paulo.evaluate(([a, b]) => deixarSo("prot", "987654321", a, `${a},${b}`), [D1, D2]);
  await paulo.waitForTimeout(1200);
  const d2c = banco.t.casos.find(k => k.id === D2);
  conf(3, "5.5 o protocolo repetido sai do outro caso com a marca que a sincronização respeita",
    !(d2c.protocolos || []).includes("987654321") && !!(d2c.arquivados || {})["mov:prot:987654321"] && (banco.t.casos.find(k => k.id === D1).protocolos || []).includes("987654321"));
  // 5.6 · o caso do Conselho, agora sem número, junta-se ao do B32
  await paulo.evaluate(([a, b]) => fundirCasos(a, b), [D3, D2]);
  await paulo.waitForTimeout(2000);
  const d3f = banco.t.casos.find(k => k.id === D3);
  conf(3, "5.6 juntar os casos deixa a casca encerrada com a marca de fusão", d3f.fase === "encerrado" && !!(d3f.arquivados || {}).fundido);
  // 5.7 e 5.8 · a fila do acervo
  banco.t.casos.push({ id: "b0000000-0000-0000-0000-0000000000d4", cliente_id: cli2.id, titulo: cli2.nome, beneficio: "Revisão", especie: "REV", fase: "inss", origem_lista: "🌻 INSS",
    nb: "6123456789", nbs: [], protocolos: [], processos: [], crps_nups: [], arquivados: {}, criado_em: "2026-02-01T12:00:00Z" });
  await recarregar(paulo);
  await paulo.evaluate(() => { visao = "acervo"; render(); });
  await paulo.waitForTimeout(400);
  const fila = await paulo.evaluate(() => (document.getElementById("acervo-varios") || {}).textContent || "");
  conf(2, "5.7 o Cuidar do acervo lista o cliente de vários casos com o número repetido", /Dirceu Fictício Lemos/.test(fila) && /repetido/.test(fila));
  await paulo.evaluate(id => casosOrganizados(id), cli2.id);
  await paulo.waitForTimeout(500);
  conf(2, "5.8 marcado como organizado, o cliente sai da fila", /Dirceu Fictício Lemos/.test(fila) && !/Dirceu Fictício Lemos/.test(await paulo.evaluate(() => (document.getElementById("acervo-varios") || {}).textContent || "")));
  const cel = await entrar("paulo", 390);
  await cel.evaluate(id => abrirOrganizar(id), cli2.id);
  await cel.waitForTimeout(900);
  const largo = await cel.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2 || [...document.querySelectorAll(".org-casos *")].some(e => e.getBoundingClientRect().right > window.innerWidth + 2));
  await foto(cel, "organizar-celular", true);
  conf(2, "5.9 sem erro de tela e sem rolagem lateral no celular", !largo && !paulo._erros.length && !cel._erros.length);

  // ══ 6 · MATÉRIAS POR BENEFÍCIO (12) ════════════════════════════════════
  const leg = await paulo.evaluate(() => {
    const c = D.cliPorId.get(CLI_CHEIO_ID());
    function CLI_CHEIO_ID(){ return [...D.cliPorId.keys()].find(id => (D.cliPorId.get(id).nome || "").startsWith("Aurélia")); }
    const sel = b => { c.campos = { ...(c.campos || {}), ad_modulos: { valores: { dep_media12: "1500", dep_teto: "1906.04" }, tempos: [], beneficios: b } }; };
    sel({ tempo: ["pcd_idade"] });
    const pcdIdade = modulosDe(c).includes("idade") && /15 anos de contribuição na condição de pessoa com deficiência/.test(ADM_CALC.defic(c, admCtx(c, []))) && /exige 55 anos|exige 60 anos/.test(ADM_CALC.idade(c, admCtx(c, [])));
    sel({ incapacidade: ["b31"] });
    const isencao = /art\. 196, II, da IN 128/.test(ADM_CALC.carencia(c, admCtx(c, [])));
    sel({ pensao: ["reclusao"] });
    const camposRec = /dep_media12/.test(camposModulo(c, "dependentes")), calcRec = /dentro do limite/.test(ADM_CALC.dependentes(c, admCtx(c, [])));
    sel({ pensao: ["morte"] });
    const semCampoNaPensao = !/dep_media12/.test(camposModulo(c, "dependentes"));
    sel({ especial: ["b46"] });
    const esp = ADM_CALC.especial(c, admCtx(c, []));
    const especial = /art\. 261/.test(esp) && /art\. 262/.test(esp) && /art\. 260/.test(esp) && /ADI 6309/.test(esp);
    const ctc = /Anexo IX da Portaria MTP 1\.467\/2022/.test(JSON.stringify(GUIAS_ESPECIE.transicao));
    const resid = /art\. 32, § 2º, III/.test(DOC_FONTE.find(r => r.rx.test("comprovante de residencia")).quem);
    c.campos = { ...(c.campos || {}), ad_modulos: undefined };
    return { pcdIdade, isencao, camposRec, calcRec, semCampoNaPensao, especial, ctc, resid };
  });
  conf(2, "6.1 a PcD por idade abre o quadro Idade com 60/55 e os 15 anos do art. 311", leg.pcdIdade);
  conf(2, "6.2 a carência do B31 mostra a isenção do art. 196, II", leg.isencao);
  conf(2, "6.3 o auxílio-reclusão pede e mede a baixa renda; a pensão não mostra esses campos", leg.camposRec && leg.calcRec && leg.semCampoNaPensao);
  conf(2, "6.4 o tempo especial traz as regras da IN 128 e a ADI 6309", leg.especial);
  conf(2, "6.5 a CTC do RPPS aponta o Anexo IX da Portaria MTP 1.467/2022", leg.ctc);
  conf(2, "6.6 o comprovante de residência cita o art. 32, § 2º, III", leg.resid);

  // ══ 7 · DIVISÃO DE TAREFAS (8) ═════════════════════════════════════════
  await paulo.evaluate(id => abrirFicha(id), cli.id);
  await paulo.waitForTimeout(700);
  await paulo.evaluate(([kid, mid, d]) => { casoSel = kid; abaAtiva = 2; subAba = "escritorio"; repintarFicha();
    const ta = document.getElementById("and-texto"); ta.value = "Calcular os atrasados da sentença para o cumprimento"; tfNatureza = "compromisso"; tfQuem = [mid]; tfData = d; return novoAndamento(kid); }, [kid, COL.marcos, hoje]);
  await paulo.waitForTimeout(1200);
  const tf = banco.t.andamento_tarefas.find(t => t.colaborador_id === COL.marcos && t.caso_id === kid);
  const marcos = await entrar("marcos");
  await marcos.evaluate(() => { visao = "minhas"; render(); });
  await marcos.waitForTimeout(500);
  const minhas = await marcos.evaluate(() => document.getElementById("conteudo-meio").innerText);
  conf(3, "7.1 a tarefa atribuída ao Marcos aparece em Atribuídas a mim", !!tf && /Cecília Inventada Prado/.test(minhas));
  await marcos.evaluate(() => { visao = "meudia"; render(); });
  await marcos.waitForTimeout(500);
  conf(3, "7.2 e no Meu Dia dele, na data marcada", /atrasados da sentença|Cecília Inventada Prado/.test(await marcos.evaluate(() => document.getElementById("conteudo-meio").innerText)));
  conf(2, "7.3 o colaborador não teve erro de tela", !marcos._erros.length && !amanda._erros.length);
  await foto(marcos, "marcos-meu-dia");
  // 4.8 · paga a RPV, o caso vai a Pagamentos e o CRM pergunta pelo caso seguinte (o ciclo da incapacidade)
  await paulo.evaluate(id => janelaEncerrar(id), kid);
  await paulo.click('#janela [data-res="deferido"]');
  await paulo.click("#hon-sim");
  await paulo.click("#hon-enviar");
  await paulo.waitForTimeout(900);
  const pergCaso = await paulo.evaluate(() => /Abrir caso novo/.test((document.getElementById("janela") || {}).textContent || ""));
  conf(1, "4.8 paga a RPV, o caso vai a Pagamentos e o CRM pergunta se abre o caso seguinte",
    banco.t.casos.find(k => k.id === kid).fase === "pagamento" && pergCaso);
  await paulo.evaluate(() => { const b = document.getElementById("jan-nao"); if (b) b.click(); });
  await paulo.waitForTimeout(500);

  // ══ 8 · VISUAL (6) ═════════════════════════════════════════════════════
  await paulo.evaluate(id => { abaAtiva = 0; _atendAberto.delete(id); irSubCad("direito"); }, cli.id);
  await paulo.waitForTimeout(400);
  const padCons = await paulo.evaluate(() => { const t = document.getElementById("adx-cons"); return t ? parseFloat(getComputedStyle(t).paddingLeft) : 0; });
  conf(2, "8.1 o campo Minhas considerações tem respiro interno", padCons >= 8);
  const cnisSem = await paulo.evaluate(() => { const b = document.createElement("button"); b.className = "cnis-abrir sem"; document.body.appendChild(b); const c = getComputedStyle(b).backgroundColor; b.remove(); return c; });
  const chipBen = await paulo.evaluate(() => { const b = document.createElement("span"); b.className = "chip ben"; b.textContent = "B41"; document.body.appendChild(b); const pt = parseFloat(getComputedStyle(b).paddingTop); b.remove(); return pt; });
  conf(2, "8.2 o botão de CNIS ausente é neutro e o chip de benefício volta a ser etiqueta", /255, 255, 255/.test(cnisSem) && chipBen <= 4);
  const cel2 = await entrar("amanda", 390);
  await cel2.evaluate(id => abrirAtendimentoDe(id), cli2.id);
  await cel2.waitForTimeout(1200);
  const largo2 = await cel2.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2
    || [...document.querySelectorAll(".atend-cab *, .atend-passos *, .ben *")].some(e => e.getBoundingClientRect().right > window.innerWidth + 2));
  const tela2 = await cel2.evaluate(() => document.getElementById("detalhe").classList.contains("atend-tela") && getComputedStyle(document.getElementById("modal")).display === "none" && subCad === "pa");
  await foto(cel2, "atendimento-celular", true);
  conf(2, "8.3 o atendimento do cliente de vários casos abre direto e cabe no celular", tela2 && !largo2 && !cel2._erros.length);

  console.log(`\nNOTA F220: ${pontos}/${total}${falhas.length ? `\nfaltou: ${falhas.join("; ")}` : ""}`);
  const erros = [bruna, amanda, paulo, marcos, cel, cel2].flatMap(p => p._erros);
  if (erros.length) console.log("erros de tela:", [...new Set(erros)].join(" | "));
  await nav.close(); s.close();
  process.exit(pontos > 95 && total === 100 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
