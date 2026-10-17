// F232 · o motor de requisitos por benefício (docs/REQUISITOS-POR-BENEFICIO.md): o
// catálogo cobre as 31 opções do BENEF (23 benefícios e, desde a F235, os 8 serviços), todo requisito tem pergunta, base, conferência
// e campos que existem; nenhum quebra com o contexto vazio; os casos-ouro de cada
// família (req-ouro/*.json) passam; e as correções do cálculo (graça do B91, conversão
// por agente sem dobrar, fórmulas da EC 103 por ano, pedágio de 50 %, data do direito
// no Desfecho) ficam presas. Banco simulado e dados fictícios. Uso: node f232.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";

const OURO = fs.readdirSync(path.join(__dirname, "req-ouro")).filter(f => f.endsWith(".json")).sort()
  .flatMap(f => JSON.parse(fs.readFileSync(path.join(__dirname, "req-ouro", f), "utf8")).map(c => ({ ...c, arq: f })));
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "lembretes", "anexos", "analises_direito",
  "aposentadorias", "lista_pref", "andamento_tarefas", "modelos_mensagem", "credencial_vis", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: JSON.parse(JSON.stringify(FIX.clientes)), casos: JSON.parse(JSON.stringify(FIX.casos)),
  atribuicoes: FIX.atribuicoes, documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
// um cliente para a data do direito: homem, filiado em 2005, 65 anos em 2031, 16 anos de contribuição em 2021
const CLI = "c0000000-0000-0000-0000-000000000a32";
dados.clientes.push({ id: CLI, nome: "Aristides Fictício Prado", cpf: "70010020099", dn: "1966-03-10", sexo: "M", criado_em: "2026-10-01T12:00:00Z",
  campos: { ad_modulos: { beneficios: { tempo: ["idade"] }, valores: {}, tempos: [{ de: "2005-01-01", ate: "2021-08-31", onde: "Empresa Fictícia", nat: "comum" }] },
    triagem: { pdf: { cnis: { vinculos: [{ seq: 1, tipo: "Empregado ou Agente Público", origem: "EMPRESA FICTICIA", inicio: "01/01/2005", fim: "31/08/2021" }],
      analise: { contagem: { carencia: 200, anos: 16, meses: 8, periodos: [["2005-01", "2021-08"]], foraMinimo: 0 }, abaixo: [], benefAtivos: [] } } } } } });

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
  const ctx = await nav.newContext();
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
  }, [SUPA, SESSAO]);
  await instalarBanco(ctx, { SUPA, SESSAO, banco: new Banco(dados) });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);

  // 1 · o catálogo
  const cat = await p.evaluate(() => {
    const ops = BENEF_ORDEM.flatMap(f => BENEF[f].map(o => o[0])), sem = ops.filter(o => !(REQ_BENEF[o] || []).length);
    const ruins = [], campos = [], quebra = [], ids = [];
    for (const [op, l] of Object.entries(REQ_BENEF)) {
      const vistos = new Set();
      for (const r of l) {
        if (!r.id || !r.rot || !r.base || !["conferido", "skill", "divergente"].includes(r.conf) || typeof r.mede !== "function") ruins.push(`${op}.${r.id}`);
        if (vistos.has(r.id)) ids.push(`${op}.${r.id}`); vistos.add(r.id);
        for (const k of r.campos || []) if (!CAMPO_AD[k]) campos.push(`${op}.${r.id}:${k}`);
      }
      const a = avaliarReq(op, reqCtxTeste({ op }));
      for (const r of a.rs) if (/não consegui medir/.test(r.txt || "")) quebra.push(`${op}.${r.id}`);
    }
    return { ops: ops.length, sem, ruins, campos, quebra, ids, total: Object.values(REQ_BENEF).reduce((n, l) => n + l.length, 0),
      apos: ["idade", "transicao", "professor", "pcd", "pcd_idade", "b46", "idade_rural", "hibrida"].filter(o => !(REQ_EXTRA[o] || {}).quando) };
  });
  conf(`o catálogo cobre as ${cat.ops} opções do BENEF (${cat.total} requisitos)${cat.sem.length ? `; faltam ${cat.sem.join(", ")}` : ""}`, cat.ops === 31 && !cat.sem.length);
  conf(`todo requisito tem id, pergunta, base, conferência e mede${cat.ruins.length ? `: ${cat.ruins.join(", ")}` : ""}`, !cat.ruins.length);
  conf(`nenhum id repetido na mesma opção${cat.ids.length ? `: ${cat.ids.join(", ")}` : ""}`, !cat.ids.length);
  conf(`todo campo pedido existe em CAMPO_AD${cat.campos.length ? `: ${cat.campos.slice(0, 8).join(", ")}` : ""}`, !cat.campos.length);
  conf(`com o contexto vazio nenhum requisito quebra${cat.quebra.length ? `: ${cat.quebra.slice(0, 8).join(", ")}` : ""}`, !cat.quebra.length);
  conf(`toda aposentadoria tem a data do direito (quando)${cat.apos.length ? `; faltam ${cat.apos.join(", ")}` : ""}`, !cat.apos.length);

  // 2 · os casos-ouro das famílias
  const res = await p.evaluate(casos => casos.map(c => {
    try {
      const x = reqCtxTeste(c.x);
      if (c.quandoOp) { const q = REQ_EXTRA[c.op].quando(x); return { ok: q === c.quando, got: q }; }
      const r = (REQ_BENEF[c.op] || []).find(q => q.id === c.id); if (!r) return { ok: false, got: "sem o requisito" };
      const m = r.mede(x) || {};
      return { ok: m.est === c.est && (!c.txt || new RegExp(c.txt, "i").test(m.txt || "")) && (!("quando" in c) || m.quando === c.quando), got: m.est + " · " + (m.txt || "") };
    } catch (e) { return { ok: false, got: String(e.message || e) }; }
  }), OURO);
  const porArq = {};
  res.forEach((r, i) => { const c = OURO[i], a = porArq[c.arq] = porArq[c.arq] || { n: 0, bons: 0, ruins: [] }; a.n++;
    if (r.ok) a.bons++; else a.ruins.push(`${c.op}${c.id ? "." + c.id : ""} · ${c.nome} (veio ${r.got})`); });
  for (const [arq, a] of Object.entries(porArq)) {
    conf(`casos-ouro de ${arq}: ${a.bons}/${a.n}`, a.bons === a.n);
    a.ruins.forEach(x => console.log("        " + x));
  }

  // 3 · as correções do cálculo
  const calc = await p.evaluate(() => {
    const emp = { tipo: "Empregado ou Agente Público", origem: "EMPRESA", inicio: "01/01/2015", fim: "10/02/2022" };
    const b91 = calcularGraca([emp, { tipo: "Benefício", especie: "91", origem: "AUXILIO DOENCA POR ACIDENTE DO TRABALHO", inicio: "11/02/2022", fim: "", aberto: true }], 40, false);
    const b94 = calcularGraca([emp, { tipo: "Benefício", especie: "94", origem: "AUXILIO ACIDENTE PREVIDENCIARIO", inicio: "11/02/2022", fim: "", aberto: true }], 40, false);
    const t15 = admTotaisDe([{ de: "2000-01-01", ate: "2009-12-31", nat: "especial", esp: "15" }], "M", "2026-10-16");
    const t25 = admTotaisDe([{ de: "2000-01-01", ate: "2009-12-31", nat: "especial" }], "M", "2026-10-16");
    const sob = admTotaisDe([{ de: "2000-01-01", ate: "2009-12-31", nat: "especial" }, { de: "2005-01-01", ate: "2009-12-31", nat: "especial" }], "M", "2026-10-16");
    const pos = admTotaisDe([{ de: "2020-01-01", ate: "2024-12-31", nat: "especial" }], "M", "2026-10-16");
    const ate = admTotaisDe([{ de: "2000-01-01", nat: "comum" }], "M", "2010-12-31");
    return { b91: !!b91.semLimite, b94: !b94.semLimite,
      f15: Math.abs(t15.bonus / t15.especial - 1.33) < 0.01, f25: Math.abs(t25.bonus / t25.especial - 0.40) < 0.01,
      sob: Math.abs(sob.bonus - t25.bonus) < 1, pos: pos.bonus === 0, ate: Math.round(ate.comum / 365) === 11,
      ec: [pontosExig(2026, "M"), pontosExig(2026, "F"), idadeProgExig(2026, "M"), idadeProgExig(2026, "F"), pontosExig(2026, "M", true), pontosExig(2026, "F", true),
        idadeProgExig(2026, "M", true), idadeProgExig(2026, "F", true), idadeArt18(2021, "F"), idadeArt18(2026, "F"), pontosExig(2025, "M"), pontosExig(2027, "F")].join() };
  });
  conf("o B91 em manutenção mantém a qualidade sem limite (o filtro é pela espécie, não pela palavra acidente)", calc.b91);
  conf("o auxílio-acidente (94) continua sem manter a qualidade", calc.b94);
  conf("o especial de agente de 15 anos converte por 2,33 (homem), e o de 25 por 1,40", calc.f15 && calc.f25);
  conf("dois períodos especiais sobrepostos não dobram o acréscimo", calc.sob);
  conf("o especial depois de 13/11/2019 não converte", calc.pos);
  conf("os totais param na data pedida (linha aberta até a DER)", calc.ate);
  conf(`as fórmulas da EC 103 por ano (${calc.ec})`, calc.ec === "103,93,64.5,59.5,98,88,59.5,54.5,61,62,102,94");
  const ped = await p.evaluate(() => { const x = reqCtxTeste({ dn: "1960-01-01", sx: "M", tempos: [{ de: "1986-11-14", ate: "2026-10-16", nat: "comum" }] });
    return ADM_CALC.transicao({ id: "x", campos: {} }, { ...x, idade: 66 }); });
  conf("o quadro antigo da transição não dá o pedágio de 50 % a quem tinha exatamente 33 anos", /mais de 33 anos/.test(ped) && !/Pedágio de 50 %<\/b>: exige/.test(ped));

  // 4 · a data do direito do Desfecho vem do motor
  const desf = await p.evaluate(cli => { const c = D.cliPorId.get(cli), ks = D.casosDoCliente.get(cli) || [], q = (requisitosDe(c, ks, "idade") || {}).quando, b = baseDesfecho(c, null);
    return { q, data: b.data, fonte: b.fonte }; }, CLI);
  conf(`o Desfecho usa a data do direito do motor (${desf.data} · ${desf.fonte})`, !!desf.q && desf.data === desf.q && /requisitos/.test(desf.fonte));

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
