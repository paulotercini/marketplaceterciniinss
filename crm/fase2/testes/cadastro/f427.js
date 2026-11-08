// F427 · a checagem dos prazos pela tela (07.11.2026): o prazo diz do que é em todas as telas, sem o nome
// de quem faz na frente, com o rótulo de uma palavra na janela e sem rótulos encavalados na linha dos 30 dias.
// Pontua; passa acima de 95 de 100. Uso: node f427.js [pasta das capturas]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f427";
fs.mkdirSync(OUT, { recursive: true });

const PAULO = FIX.colaboradores[0].id, AMANDA = "33333333-3333-3333-3333-333333333333";
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: [...FIX.colaboradores, { id: AMANDA, auth_id: "cccccccc-cccc-cccc-cccc-cccccccccccc", nome: "Amanda Fictícia", inicial: "A",
    cor: "#b58900", papel: "colaborador", ativo: true, cargo: "advogado" }],
  clientes: [], casos: [], atribuicoes: [], documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;
const iso = n => new Date(Date.now() - 3 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
const br = d => d.split("-").reverse().join(".");
const bar = d => d.split("-").reverse().join("/");
const ts = (n, h = "12:00") => `${iso(n)}T${h}:00-03:00`;
const util = n => { let k = n; while ([0, 6].includes(new Date(iso(k) + "T12:00:00").getDay())) k += n < 0 ? -1 : 1; return k; };
let seq = 0;
const id = p => `${p}0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const cli = nome => { const c = { id: id("c"), nome, cpf: null, telefone: null, campos: { advogado_id: PAULO }, telefones: [], criado_em: ts(-400) }; T.clientes.push(c); return c; };
const caso = (c, o) => { const k = { id: id("b"), cliente_id: c.id, titulo: c.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
  marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, dcb_prorrogacao_pedida: false, origem_lista: "👪 Judicial",
  criado_em: ts(-300), ...o }; T.casos.push(k); T.atribuicoes.push({ caso_id: k.id, colaborador_id: PAULO }); return k; };
const and = (k, n, texto, o = {}) => { const a = { id: id("e"), caso_id: k.id, autor_id: PAULO, texto, origem: "app", origem_id: null, criado_em: ts(n),
  publico: false, excluir: false, importante: false, urgente: false, responde_a: null, ...o }; T.andamentos.push(a);
  T.andamentos_lidos.push({ andamento_id: a.id, colaborador_id: PAULO }); return a; };
const tarefa = (a, quem, o = {}) => { const t = { id: id("f"), andamento_id: a.id, caso_id: a.caso_id, colaborador_id: quem, atribuido_por: PAULO,
  lembrar_em: iso(-2), natureza: "compromisso", papel: "executa", concluida_em: null, iniciada_em: null, etapas: [], criado_em: a.criado_em, ...o };
  T.andamento_tarefas.push(t); return t; };

// A · um cliente com cinco casos, um de cada tipo de prazo
const cA = cli("Ana Fictícia Prazos");
const kRet = caso(cA, { beneficio: "Auxílio por incapacidade", especie: "B31", fase: "inss", protocolos: ["1700000901"], origem_lista: "🌻 INSS",
  prazo: iso(util(3)), todo_prazo: iso(util(3)) });
and(kRet, -6, "(P): perícia feita em 30/10, aguardar o resultado.", { origem: "todo" });
const kTp = caso(cA, { beneficio: "Apos. por Idade", especie: "B41", fase: "outro", origem_lista: "🗓 Tarefas com Prazo", processo: "50009990020264036314",
  prazo: iso(util(6)), todo_prazo: iso(util(6)) });
and(kTp, -3, "(P): intimados para réplica, 15 dias.", { origem: "todo" });
const dC = util(9), dAd = util(5);
const kAn = caso(cA, { beneficio: "Apos. Especial", especie: "B46", fase: "judicial", processo: "50001112220264036314" });
const nC = and(kAn, -4, `⏰ [PRAZO ${br(iso(dC))}] Apresentar réplica à contestação do INSS.\nPontos: PPP da empresa Alfa e ruído acima de 85 dB.`);
tarefa(nC, AMANDA, { natureza: "fatal", lembrar_em: iso(dC), etapas: [{ t: "Ler a contestação", feito: true, em: ts(-2), por: AMANDA }, { t: "Redigir a réplica", feito: false }] });
tarefa(nC, PAULO, { natureza: "fatal", lembrar_em: iso(dC), papel: "revisa" });
and(kAn, -3, "Contestação lida; o INSS ataca só o EPI.", { responde_a: nC.id, autor_id: AMANDA });
const r2 = and(kAn, -1, `Pedir o LTCAT à empresa · prazo adicional até ${bar(iso(dAd))}`, { responde_a: nC.id, autor_id: AMANDA });
tarefa(r2, AMANDA, { lembrar_em: iso(dAd) });
const kVe = caso(cA, { beneficio: "Pensão por morte", especie: "B21", fase: "judicial", processo: "50002223320264036314" });
const nV = and(kVe, -20, `⏰ [PRAZO ${br(iso(util(-2)))}] Manifestação sobre o laudo social.`);
tarefa(nV, PAULO, { natureza: "fatal", lembrar_em: iso(util(-2)) });
const kAs = caso(cA, { beneficio: "BPC Deficiente", especie: "B87", fase: "judicial", processo: "50003334420264036314" });
and(kAs, -1, `Laudo pericial juntado em ${bar(iso(-2))}. O perito não examinou a função habitual.\n⏳ Prazo: manifestação sobre o laudo pericial, 15 dias úteis, até ${bar(iso(util(14)))}.`,
  { origem_id: "mcp:" + id("m") });
// B · o "Concluir em" do To Do de hoje no 🗓 Tarefas com Prazo, sem tarefa: é retorno (F429), sem a frase do To Do
const cB = cli("Bruno Fictício Recurso");
const kHoje = caso(cB, { beneficio: "Apos. por Idade", especie: "B41", fase: "outro", origem_lista: "🗓 Tarefas com Prazo", processo: "50004445520264036314",
  prazo: iso(0), todo_prazo: iso(0) });
and(kHoje, -2, "(P): protocolar a apelação hoje. Conferir o preparo.", { origem: "todo" });
// C · a data do To Do sem nenhuma anotação: retorno com o selo do To Do
const cC = cli("Carla Fictícia Sem Nota");
caso(cC, { beneficio: "Apos. por Idade", especie: "B41", fase: "outro", origem_lista: "🗓 Tarefas com Prazo", processo: "50005556620264036314",
  prazo: iso(util(4)), todo_prazo: iso(util(4)) });

const pts = [];
const conf = (nome, v, peso, info) => { pts.push([nome, !!v, peso]); console.log((v ? "PASSOU  " : "FALHOU  ") + `[${peso}] ` + nome + (v || info === undefined ? "" : "  → " + JSON.stringify(info).slice(0, 300))); };

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, "app.html");
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  for (const [nome, vp] of [["pc", { width: 1440, height: 900 }], ["cel", { width: 390, height: 844, isMobile: true, hasTouch: true }]]) {
    const ctx = await nav.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch });
    await ctx.addInitScript(([u, ss]) => { localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
      localStorage.setItem("crm_sessao", JSON.stringify(ss)); localStorage.setItem("crm_tema", "v10"); }, [SUPA, SESSAO]);
    await instalarBanco(ctx, { SUPA, SESSAO, banco });
    const p = await ctx.newPage();
    const erros = [];
    p.on("pageerror", e => erros.push(e.message));
    p.on("dialog", d => d.accept());
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
    await p.waitForSelector("#app.logado", { timeout: 15000 });
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
    await p.waitForTimeout(600);
    const foto = n => p.screenshot({ path: path.join(OUT, `${nome}-${n}.png`) });
    const abrirAba = async c => { await p.evaluate(async c => { fecharPainelPrazo(); await abrirFicha(c); const m = document.getElementById("modal"); if (m) m.style.display = "none";
      casoSel = null; abaAtiva = 5; repintarFicha(); }, c); await p.waitForSelector(".pzc-lin", { timeout: 5000 }).catch(() => {}); await p.waitForTimeout(300); };
    const semEncavalar = () => p.evaluate(() => { const r = [...document.querySelectorAll(".pzl-lab")].map(e => e.getBoundingClientRect()).filter(b => b.width);
      return r.every((a, i) => r.every((b, j) => j <= i || a.right <= b.left + 1 || b.right <= a.left + 1 || a.bottom <= b.top || b.bottom <= a.top)); });
    const P = nome === "pc" ? "" : "celular · ";

    // ── 1. Meu Dia ───────────────────────────────────────────────────────────
    await p.evaluate(() => irPara("meudia"));
    await p.waitForSelector(`.ag-linha[data-cli="${cB.id}"]`, { timeout: 5000 }).catch(() => {});
    await p.waitForTimeout(500);
    const md = await p.evaluate(([b, a]) => ({
      bruno: [...document.querySelectorAll(`.ag-linha[data-cli="${b}"]`)].map(l => ({ oque: (l.querySelector(".ag-oque") || {}).textContent || "", txt: l.textContent, esp: (l.querySelector(".ag-esp") || {}).textContent || "",
        cabe: (t => !t || t.scrollWidth <= l.getBoundingClientRect().width + 1)(l.querySelector(".ag-txt")) })),
      ana: [...document.querySelectorAll(`.ag-linha[data-cli="${a}"]`)].map(l => ((l.querySelector(".ag-oque") || {}).textContent || "")),
      esps: [...document.querySelectorAll(".ag-linha .ag-esp")].map(e => e.textContent) }), [cB.id, cA.id]);
    conf(P + "a data do To Do de hoje é Retorno no Meu Dia, sem a frase do To Do e sem Prazo fatal (F429)",
      md.bruno.length && md.bruno.some(x => /Retorno/.test(x.txt)) && !md.bruno.some(x => /apelação|Prazo fatal/.test(x.txt)), 4, md.bruno);
    conf(P + "o prazo fatal vencido diz do que é na linha do Meu Dia", md.ana.some(t => /manifestação sobre o laudo social/i.test(t)), 3, md.ana);
    conf(P + "a linha do caso da lista Tarefas com Prazo diz a fase verdadeira (Judicial), e nenhuma diz Outros", md.bruno.some(x => x.esp === "B41 · Judicial") && !md.esps.some(t => /Outros/.test(t)), 3, md.esps);
    if (nome === "cel") conf("celular · a linha do Meu Dia não passa da borda do cartão", md.bruno.length && md.bruno.every(x => x.cabe), 2, md.bruno);
    await foto("01-meudia");

    // ── 2. aba Prazos e linha dos 30 dias ───────────────────────────────────
    await abrirAba(cA.id);
    // ── 3. as linhas dos prazos da ficha aberta (o quadro e a aba leem as mesmas) ──
    if (nome === "pc") {
      const ln = await p.evaluate(([a, c, kAn, kTp]) => { const ld = id => { const r = linhasDeDatas(id); return [...r.linhas, ...r.soltas]; }, L = [...ld(a), ...ld(c)];
        return { an: L.filter(x => x.casoId === kAn).map(x => String(x.resumo || "")), tp: L.filter(x => x.casoId === kTp).map(x => String(x.rot || "").replace(/<[^>]*>/g, "")),
          titC: ld(c).map(x => tituloDaLinha(x).titulo) }; }, [cA.id, cC.id, kAn.id, kTp.id]);
      conf("a tarefa diz o pedido com maiúscula, sem o nome de quem faz na frente e sem o 'prazo adicional até' repetido",
        ln.an.some(r => /^Pedir o LTCAT à empresa/.test(r)) && !ln.an.some(r => /^(Paulo|Amanda)\b.*:/.test(r) || /prazo adicional até/i.test(r)), 4, ln.an);
      conf("a revisão começa por 'Revisar:'", ln.an.some(r => /^Revisar: /.test(r)), 2, ln.an);
      conf("a data do To Do no Tarefas com Prazo é Retorno, sem a frase da anotação do To Do (F429)",
        ln.tp.length && ln.tp.every(r => /^Retorno/.test(r) && !/PRAZO FATAL|intimados/.test(r)), 4, ln.tp);
      conf("o título do prazo não usa travessão ('PRAZO FATAL —')", !ln.tp.some(r => /PRAZO FATAL —/.test(r)), 2, ln.tp);
      conf("a data do To Do sem nenhuma anotação não se chama prazo fatal nem pede 'Diga do que é'",
        ln.titC.length && !ln.titC.some(t => /Prazo fatal|Prazo do Microsoft|Diga do que é/i.test(t)), 3, ln.titC);
    }

    const hero = await p.evaluate(() => (document.querySelector(".pzc-hero-txt") || document.querySelector("[class*='pzc-hero']") || {}).textContent || "");
    conf(P + "o destaque da aba Prazos é o prazo fatal do CRM, e não a data do To Do", /Apresentar réplica/.test(hero) && !/intimados/.test(hero), 3, hero.slice(0, 160));
    conf(P + "os nomes da linha dos próximos 30 dias não se encavalam", await semEncavalar(), 3);
    await foto("02-aba-prazos");

    // ── 4. a janela do prazo ────────────────────────────────────────────────
    const abreLinha = rx => p.evaluate(rx => { const l = [...document.querySelectorAll(".pzc-lin")].find(x => new RegExp(rx).test(x.textContent)); const b = l && l.querySelector(".pzc-abrir");
      if (b) b.click(); return !!b; }, rx);
    const abriu = await abreLinha("Apresentar réplica");
    await p.waitForSelector("#painel-prazo.aberto", { timeout: 3000 }).catch(() => {});
    const jn = await p.evaluate(() => { const j = document.querySelector("#painel-prazo.aberto"); if (!j) return null; const pe = j.querySelector("footer.ppz-pe");
      return { pe: pe ? pe.innerText : "", caso: [...j.querySelectorAll("footer.ppz-pe [aria-hidden='true']")].some(e => e.textContent.trim() === "Caso"),
        avs: j.querySelectorAll(".pz-av").length, check: /✓/.test(j.innerText), cabe: j.getBoundingClientRect().right <= innerWidth + 1,
        peCabe: !pe || [...pe.children].every(c => c.getBoundingClientRect().right <= innerWidth + 1) }; });
    conf(P + "a janela do prazo abre pelo Abrir da aba", abriu && jn, 2);
    conf(P + "o pé da janela não diz '✔ feito' nem '✎ escrever'", jn && !/✔ feito|✎ escrever/.test(jn.pe), 2, jn && jn.pe);
    if (nome === "pc") conf("o botão do caso diz uma palavra: Caso", jn && jn.caso, 2, jn && jn.pe);
    conf(P + "o acompanhamento mostra quem fez cada registro, e não o ✓", jn && jn.avs > 0 && !jn.check, 2, jn);
    if (nome === "cel") conf("celular · a janela e o pé cabem na tela", jn && jn.cabe && jn.peCabe, 2, jn);
    await foto("03-janela");
    await p.evaluate(() => fecharPainelPrazo());

    // ── 5. o prazo sem descrição ────────────────────────────────────────────
    await abrirAba(cC.id);
    await abreLinha("Microsoft To Do");
    await p.waitForSelector("#painel-prazo.aberto", { timeout: 3000 }).catch(() => {});
    const desc = await p.evaluate(() => { const j = document.querySelector("#painel-prazo.aberto"); return j ? { t: j.innerText.slice(0, 300) } : null; });
    conf(P + "a janela da data do To Do diz Retorno e não Prazo fatal", desc && /Retorno/.test(desc.t) && !/Prazo fatal|PRAZO FATAL/.test(desc.t), 3, desc);
    await foto("04-sem-descricao");
    await p.evaluate(() => fecharPainelPrazo());

    conf(P + "sem erro de página", !erros.length, 3, erros.slice(0, 3));
    await ctx.close();
  }
  const total = pts.reduce((t, x) => t + x[2], 0), feitos = pts.filter(x => x[1]).reduce((t, x) => t + x[2], 0);
  console.log(`pontuação ${Math.round(feitos * 1000 / total) / 10} de 100 (${feitos}/${total} pontos)`);
  await nav.close(); s.close();
  process.exit(feitos * 100 / total > 95 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
