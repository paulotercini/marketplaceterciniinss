// Teste integrado do fluxo real (pedido do Paulo, 31.10.2026): um cliente fictício "TESTE CRM" percorre o atendimento
// em passos (Próximo e Anterior no Primeiro atendimento, na Análise de Direito e em Documentos), vira caso, recebe a
// anotação com prazo fatal e o prazo é seguido no quadro do caso, na aba Prazos e no Meu Dia; depois o Concluir por
// hoje, o cumprimento e cada desfazer, conferindo que as partes contam a mesma história. Banco simulado.
// Uso: node integra-prazos.js [pasta-das-fotos]
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/integra-prazos";
fs.mkdirSync(OUT, { recursive: true });
const PAULO = FIX.colaboradores[0].id;
const CNIS = { em: "2026-10-08", nome: "Marlene Ficta Ramos", paginas: 3, qtVinculos: 1, nits: [], contribSemPerda: 104,
  indicadores: [{ codigo: "PEXT", descricao: "", ocorrencias: 2 }, { codigo: "IREM-INDPEND", descricao: "", ocorrencias: 1 }],
  vinculos: [{ seq: 1, tipo: "Empregado", origem: "CONFECCOES FICTICIAS LTDA", codigo: "11.444.777/0001-61", inicio: "01/02/2011", fim: "30/09/2019", ultRemun: "09/2019", aberto: false, indicadores: [] },
    { seq: 2, tipo: "Benefício", especie: "31", origem: "AUXILIO DOENCA PREVIDENCIARIO", nb: "6123456789", inicio: "10/03/2018", fim: "20/05/2018", situacao: "CESSADO", aberto: false }],
  analise: { abertos: [], errosEmp: [], abaixo: [], mesAnt: "09/2026", agora: { tipo: "sem", ultima: { comp: "09/2019", tipo: "Empregado" } },
    benefAtivos: [], qtComps: 104, contagem: { periodos: [["2011-02", "2019-09"]], carencia: 104, anos: 8, meses: 8, foraMinimo: 0 } } };
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "lembretes", "analises_direito",
  "aposentadorias", "lista_pref", "andamento_tarefas", "modelos_mensagem", "credencial_vis", "apagados", "credenciais", "atribuicoes", "andamentos_lidos",
  "anexos", "vinculos", "checklist_modelo", "frases_prontas", "lembrar_motivos", "rotinas", "rotinas_feitas", "zap_conversas", "inss_calendario",
  "conversas", "coletas", "qualidade_planos"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: [], casos: [], documentos_beneficio: FIX.documentos_beneficio || [],
  modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const CLI = "c0000000-0000-4000-8000-00000000e001", PRE = "b0000000-0000-4000-8000-00000000e001";
dados.clientes.push({ id: CLI, nome: "TESTE CRM Joana Integração", cpf: "52998224725", dn: "1962-02-10", sexo: "F", telefone: "16999990000",
  criado_em: "2026-10-01T12:00:00Z", dossie: { meuinss: { em: "2026-10-08T10:00:00Z" }, mte: { em: "2026-10-08T10:00:00Z" } },
  triagem: { pdf: { cnis: CNIS } }, campos: {} });
dados.casos.push({ id: PRE, cliente_id: CLI, titulo: "", fase: "escritorio", pre_caso: true, beneficio: "Aposentadoria por idade", protocolos: [], processos: [],
  crps_nups: [], crps: [], nbs: [], arquivados: {}, marcadores: [], ronda: {}, prazos_tribunal: [], origem_lista: "🙋 Escritório",
  precaso: { id: "pc_e1", natureza: "", marc: {}, honorarios: "", quem: null, em: "2026-10-12" }, criado_em: "2026-10-12T12:00:00Z" });
dados.atribuicoes.push({ caso_id: PRE, colaborador_id: PAULO });
const banco = new Banco(dados), T = banco.t;
const ok = [];
const conf = (nome, v, extra) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome + (v || extra === undefined ? "" : `  → ${JSON.stringify(extra)}`)); };

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
    localStorage.setItem("crm_sessao", JSON.stringify(ss)); localStorage.setItem("crm_tema", "v10");
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
  const foto = n => p.screenshot({ path: path.join(OUT, n + ".png") });
  const espera = ms => p.waitForTimeout(ms);
  const trilha = tela => p.evaluate(t => { const r = document.querySelector(`[data-tp="${t}"]`); if (!r) return null;
    const lis = [...r.querySelectorAll(".tp-trilha > li")], vis = sel => { const b = r.querySelector(sel); return !!b && !b.hidden && b.offsetParent !== null; };
    return { ids: lis.map(l => l.dataset.passo), at: r.dataset.at, onde: (r.querySelector(".tp-onde") || {}).textContent || "",
      vis: [...r.querySelectorAll(".tp-passo")].filter(x => !x.hidden).map(x => x.dataset.passo),
      ant: vis(".tp-ant"), antOff: !!(r.querySelector(".tp-ant") || {}).disabled, prox: vis(".tp-prox") ? r.querySelector(".tp-prox").textContent.trim() : "",
      fim: [...r.querySelectorAll(".tp-fim")].some(b => !b.hidden && b.offsetParent !== null), feitos: lis.filter(l => l.classList.contains("feito")).length }; }, tela);
  // percorre a trilha até o fim pelo Próximo e volta ao começo pelo Anterior, conferindo o "Passo i de n" e o passo à vista
  const percorre = async (tela, nome) => {
    let e = await trilha(tela); if (!e) return conf(`${nome}: a trilha existe`, false);
    const n = e.ids.length, ida = [], volta = [];
    const ini = e.ids.indexOf(e.at);
    for (let i = ini; i < n - 1; i++) { await p.click(`[data-tp="${tela}"] .tp-prox`); e = await trilha(tela);
      ida.push(e.at === e.ids[i + 1] && [...new Set(e.vis)].join() === e.at && e.onde === `Passo ${i + 2} de ${n}`); }
    conf(`${nome}: o Próximo anda um passo por vez até o fim (${n} passos)`, ida.every(Boolean), { ida, e });
    conf(`${nome}: no último passo o Próximo some`, !e.prox, e);
    for (let i = n - 1; i > 0; i--) { await p.click(`[data-tp="${tela}"] .tp-ant`); e = await trilha(tela);
      volta.push(e.at === e.ids[i - 1] && [...new Set(e.vis)].join() === e.at && e.onde === `Passo ${i} de ${n}`); }
    conf(`${nome}: o Anterior volta um passo por vez até o primeiro`, volta.every(Boolean), { volta, e });
    conf(`${nome}: no primeiro passo o Anterior fica desligado e o Próximo nomeia o segundo`, e.antOff && e.prox.startsWith(`Próximo:`), e);
    conf(`${nome}: os passos vistos ficam com ✓`, e.feitos >= n - 1, e);
    return e;
  };

  // ── 1. Primeiro atendimento ──────────────────────────────────────────────
  await p.evaluate(([c, x]) => abrirAtendimentoDe(c, x), [CLI, "pc_e1"]);
  await p.waitForFunction(() => !_lendoDossie && !_lendoLeitores && document.querySelector('[data-tp="pa"]'), null, { timeout: 15000 }).catch(() => {});
  await espera(500);
  await percorre("pa", "Primeiro atendimento");
  await foto("01-pa");
  // vai ao último passo pela trilha, marca a aposentadoria por idade e conclui
  const ultPa = (await trilha("pa")).ids.slice(-1)[0];
  await p.click(`[data-tp="pa"] .tp-trilha li[data-passo="${ultPa}"] button`);
  const marcou = await p.evaluate(() => { const b = [...document.querySelectorAll("#paq-escolha .ben-chip, [data-tp='pa'] .ben-chip")].find(x => /idade/i.test(x.textContent));
    if (b && !/on|ativo/.test(b.className) && b.getAttribute("aria-pressed") !== "true") b.click(); return !!b; });
  await espera(300);
  const temOp = await p.evaluate(() => { const c = D.cliPorId.get(clienteAberto); return Object.keys(benefSel(c)).length; });
  if (!temOp) await p.evaluate(() => { const b = document.querySelector("[data-tp='pa'] .ben-op, [data-tp='pa'] [onclick*='benefEscolher'], [data-tp='pa'] [onclick*='paEscolher']"); if (b) b.click(); });
  conf("o último passo do Primeiro atendimento escolhe o benefício", marcou && await p.evaluate(() => Object.keys(benefSel(D.cliPorId.get(clienteAberto))).length > 0));
  await p.evaluate(c => paConcluir(c), CLI);
  await p.waitForSelector('[data-tp="ad"]', { timeout: 8000 }).catch(() => {});
  await espera(500);
  conf("Concluir leva à Análise de Direito e grava a etapa no pré-caso", !!(await trilha("ad")) && !!((T.casos.find(k => k.id === PRE).precaso || {}).etapas || {}).pa,
    (T.casos.find(k => k.id === PRE).precaso || {}).etapas);
  // ── 2. Análise de Direito ────────────────────────────────────────────────
  await percorre("ad", "Análise de Direito");
  await foto("02-ad");
  const ultAd = (await trilha("ad")).ids.slice(-1)[0];
  await p.click(`[data-tp="ad"] .tp-trilha li[data-passo="${ultAd}"] button`);
  conf("a Conclusão traz o caminho ao Desfecho", await p.evaluate(() => !!document.querySelector("#desfecho-ir button")));
  await p.evaluate(() => irDesfecho());
  await p.waitForSelector('[data-tp="doc"]', { timeout: 8000 }).catch(() => {});
  await espera(400);
  let d = await trilha("doc");
  conf("Ir ao Desfecho abre Documentos já no último passo", d && d.at === "desfecho" && d.vis.join() === "desfecho" && !d.prox, d);
  // ── 3. Documentos ────────────────────────────────────────────────────────
  await percorre("doc", "Documentos");
  await foto("03-doc");
  await p.click('[data-tp="doc"] .tp-trilha li[data-passo="desfecho"] button');
  conf("o Desfecho oferece Criar caso", await p.evaluate(() => !!document.getElementById("cc-inicio")));
  await p.selectOption("#cc-inicio", "inss");
  await p.fill("#cc-num", "1700000999");
  await p.evaluate(c => criarCasoDoAtend(c), CLI);
  await espera(1200);
  const perguntas = [];
  for (let i = 0; i < 4 && await p.evaluate(() => !!document.querySelector("#modal .adr-modal")); i++) {   // procuração e contrato, espécie, via
    perguntas.push(await p.evaluate(() => { const m = document.querySelector("#modal .adr-modal"), h = m.querySelector("h3").textContent;
      const b = [...m.querySelectorAll("button")].find(x => /assim mesmo/i.test(x.textContent)) || m.querySelector("button.adr-primario"); b.click(); return h; }));
    await espera(1200);
  }
  console.log("   perguntas do Criar caso:", perguntas.join(" | ") || "nenhuma");
  const kc = T.casos.find(k => k.id === PRE);
  conf("Criar caso muda a mesma linha: deixa de ser pré-caso, vai ao INSS com o protocolo", kc && kc.pre_caso === false && kc.fase === "inss" && (kc.protocolos || []).includes("1700000999"),
    kc && { pre: kc.pre_caso, fase: kc.fase, prot: kc.protocolos });
  await foto("04-caso-criado");

  // ── 4. a anotação com prazo fatal ───────────────────────────────────────
  const abrirCaso = async (aba = 2) => { await p.evaluate(async ([c, k, aba]) => { if (typeof sairModoAtendimento === "function" && _atendAberto && _atendAberto.has(c)) await sairModoAtendimento(c, true);
    await abrirFicha(c); fecharCaixa && fecharCaixa(); casoSel = k; abaAtiva = aba; subAba = "escritorio"; repintarFicha(); }, [CLI, PRE, aba]); await espera(400); };
  await abrirCaso();
  await p.click("#and-texto");
  await p.waitForSelector(".esc-tg-pz");
  await p.evaluate(() => { const t = document.getElementById("and-texto"); t.value = "Exigência do INSS: juntar a certidão de casamento."; t.dispatchEvent(new Event("input", { bubbles: true })); });
  await p.click(".esc-tg-pz");
  await p.waitForSelector("#esc-pnl-pz:not([hidden])");
  const cats = await p.evaluate(() => [...document.querySelectorAll("#and-cat option")].map(o => o.value));
  const cat = cats.includes("exigencia") ? "exigencia" : cats.find(v => v) ;
  await p.evaluate(([c, de]) => { document.getElementById("and-de").value = de; const sel = document.getElementById("and-cat"); sel.value = c; sel.dispatchEvent(new Event("change")); },
    [cat, await p.evaluate(() => hoje())]);
  const dataPz = await p.evaluate(() => document.getElementById("and-prazo-data").value);
  conf(`o catálogo (${cat}) calcula a data do prazo`, /^\d{4}-\d\d-\d\d$/.test(dataPz) && dataPz > await p.evaluate(() => hoje()), dataPz);
  banco.escritas.length = 0;
  await p.evaluate(k => novoAndamento(k), PRE);
  await espera(900);
  const nota = T.andamentos.find(a => a.caso_id === PRE && /^⏰ \[PRAZO/.test(a.texto || ""));
  const tf = T.andamento_tarefas.find(t => nota && t.andamento_id === nota.id && t.natureza === "fatal");
  conf("a anotação nasce com o carimbo e a tarefa fatal de quem faz", !!nota && !!tf && tf.colaborador_id === PAULO && tf.lembrar_em === dataPz, { nota: nota && nota.texto, tf });
  const kPz = () => T.casos.find(k => k.id === PRE).prazo;
  conf("o prazo vai ao caso (casos.prazo)", kPz() === dataPz, kPz());
  // as três vistas do mesmo prazo
  const vistas = async () => p.evaluate(([k, dz]) => {
    const quadro = (() => { try { return faixaPrazos(D.casoPorId.get(k)); } catch (e) { return "ERRO " + e.message; } })();
    const meuDia = itensAgenda(eu.id).filter(i => i.k && i.k.id === k && i.fatal && i.data === dz).length;
    const brd = dz.split("-").reverse().join("/").slice(0, 5);
    return { quadro: quadro.includes(brd) || quadro.includes(dz.split("-").reverse().join("/")), meuDia, quadroTxt: quadro.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 300) };
  }, [PRE, dataPz]);
  let v = await vistas();
  conf("o prazo aparece no quadro Prazos do caso", v.quadro, v.quadroTxt);
  conf("o prazo aparece no Meu Dia de quem faz, como prazo fatal", v.meuDia === 1, v);
  await abrirCaso(5);
  await p.waitForSelector(".pzc-hero", { timeout: 5000 }).catch(() => {});
  const hero = await p.evaluate(() => (document.querySelector(".pzc-hero h2") || {}).textContent || "");
  conf("a aba Prazos abre por este prazo", hero.length > 3 && nota.texto.includes(hero.trim()), hero);
  await foto("05-aba-prazos");

  // ── 5. Concluir por hoje e desfazer ─────────────────────────────────────
  await abrirCaso();
  await p.evaluate(k => despachar(k), PRE);
  await p.waitForSelector(".desp-datas");
  const amanha = await p.evaluate(() => somaDias(hoje(), 1));
  await p.click(`.desp-datas button[data-dd="${amanha}"]`);
  await p.click("#desp-ok");
  await espera(700);
  conf("Concluir por hoje marca a volta à fila e apaga a ⭐", kPz() === amanha && T.casos.find(k => k.id === PRE).importante === false, kPz());
  v = await vistas();
  conf("depois do Concluir por hoje, o prazo fatal continua no quadro e no Meu Dia (a tarefa guarda a data)", v.quadro && v.meuDia === 1, v);
  await p.evaluate(() => desfazerAgora());
  await espera(700);
  conf("o desfazer do Concluir por hoje devolve o prazo ao caso", kPz() === dataPz, kPz());

  // ── 6. Cumpri o prazo pela janela da aba e desfazer pelo aviso ──────────
  await abrirCaso(5);
  await p.waitForSelector(".pzc-hero .pzc-pri");
  await p.click(".pzc-hero .pzc-pri");
  await p.waitForSelector("#painel-prazo.aberto"); await espera(300);
  const btC = await p.evaluate(() => { const b = [...document.querySelectorAll("#painel-prazo button")].find(x => /Cumprido/.test(x.textContent)); if (b) b.click(); return !!b; });
  await p.waitForSelector("#pz-txt", { timeout: 4000 }).catch(() => {});
  conf("a janela do prazo abre o formulário do cumprimento", btC && await p.evaluate(() => !!document.getElementById("pz-txt")));
  await p.fill("#pz-txt", "Certidão juntada no Meu INSS.");
  await p.click("#pz-ok");
  await espera(900);
  const resp = T.andamentos.find(a => a.responde_a === nota.id && /^✔ \[PRAZO CUMPRIDO\]/.test(a.texto || ""));
  conf("o cumprimento grava a resposta, tira o prazo do caso e conclui a tarefa", !!resp && kPz() === null && !!T.andamento_tarefas.find(t => t.id === tf.id).concluida_em,
    { resp: !!resp, prazo: kPz(), tf: T.andamento_tarefas.find(t => t.id === tf.id) });
  v = await vistas();
  conf("cumprido, o prazo sai do Meu Dia e do quadro", v.meuDia === 0 && !v.quadro, v);
  const aba1 = await p.evaluate(() => document.querySelectorAll('.pzc-lin[data-nat="fatal"]').length);
  conf("cumprido, a aba Prazos não mostra prazo fatal aberto", aba1 === 0, aba1);
  await p.evaluate(() => desfazerAgora());
  await espera(900);
  v = await vistas();
  conf("o desfazer do aviso apaga a resposta, devolve o prazo e reabre a tarefa",
    !T.andamentos.find(a => a.id === resp.id) && kPz() === dataPz && !T.andamento_tarefas.find(t => t.id === tf.id).concluida_em, { prazo: kPz() });
  conf("desfeito, o prazo volta ao Meu Dia e ao quadro", v.meuDia === 1 && v.quadro, v);

  // ── 7. Cumpri na anotação e desfazer pelo ⋯ da resposta ─────────────────
  await abrirCaso();
  await p.waitForSelector(".timeline .tl-pz-vivo");
  await p.evaluate(id => cumpriNaNota(id), nota.id);
  await p.waitForSelector(".tl-pz-form #tpf-txt");
  await p.fill("#tpf-txt", "Certidão juntada.");
  await p.click(".tl-pz-f-ok");
  await espera(900);
  const resp2 = T.andamentos.find(a => a.responde_a === nota.id && /^✔ \[PRAZO CUMPRIDO\]/.test(a.texto || ""));
  conf("o cumprimento pela anotação também tira o prazo", !!resp2 && kPz() === null);
  await p.evaluate(id => desfazerCumprimento(id), resp2.id);
  await espera(900);
  v = await vistas();
  conf("o desfazer pelo ⋯ apaga a resposta, devolve o prazo e reabre a tarefa",
    !T.andamentos.find(a => a.id === resp2.id) && kPz() === dataPz && !T.andamento_tarefas.find(t => t.id === tf.id).concluida_em && v.meuDia === 1, { prazo: kPz(), v });
  await foto("06-final");

  conf("sem erro de página", !erros.length, erros.slice(0, 3));
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
