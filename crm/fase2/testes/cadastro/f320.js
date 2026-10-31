// F320 · a interface limpa (plano de 31.10.2026, imagens aprovadas pelo Paulo): a linha do Meu Dia sem o texto, a ficha
// em duas colunas com as etapas recolhidas, as abas do celular (Andamentos, Prazos, Caso, Cadastro e Honorários) e a
// faixa do atendimento com o prazo uma vez. Banco simulado e dados fictícios.
// Uso: node f320.js [fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f320";
fs.mkdirSync(OUT, { recursive: true });

const PAULO = FIX.colaboradores[0].id, MARCOS = "22222222-2222-2222-2222-222222222222", MEISSA = "33333333-3333-3333-3333-333333333333";
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: [...FIX.colaboradores, { id: MARCOS, auth_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", nome: "Marcos Fictício", inicial: "M",
    cor: "#8a4b00", papel: "colaborador", ativo: true, cargo: "advogado" },
    { id: MEISSA, auth_id: "cccccccc-cccc-cccc-cccc-cccccccccccc", nome: "Meissa Fictícia", inicial: "ME", cor: "#2b7a4b", papel: "colaborador", ativo: true, cargo: "recepcao" }],
  clientes: [], casos: [], atribuicoes: [], documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;
const iso = n => new Date(Date.now() - 3 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
const ts = (n, h = "12:00") => `${iso(n)}T${h}:00-03:00`;
let seq = 0;
const id = p => `${p}0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const cli = (nome, campos = {}) => { const c = { id: id("c"), nome, cpf: null, telefone: null, campos, telefones: [], criado_em: ts(-400) }; T.clientes.push(c); return c; };
const caso = (c, o) => { const k = { id: id("b"), cliente_id: c.id, titulo: c.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
  marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, dcb_prorrogacao_pedida: false, origem_lista: "🌻 INSS",
  criado_em: ts(-300), ...o }; T.casos.push(k); T.atribuicoes.push({ caso_id: k.id, colaborador_id: PAULO }); return k; };
const and = (k, n, texto, o = {}) => { const a = { id: id("e"), caso_id: k.id, autor_id: PAULO, texto, origem: "app", origem_id: null, criado_em: ts(n),
  publico: false, excluir: false, importante: false, urgente: false, responde_a: null, ...o }; T.andamentos.push(a); return a; };




// o último dia útil antes de hoje, como o CRM conta
const dUtil = (() => { let n = -1; for (;;) { const d = new Date(iso(n) + "T12:00:00"); if (d.getDay() % 6) return n; n--; } })();
const cA = cli("Luciana Aparecida Fictícia Mendes de Oliveira"); cA.telefone="17996186303"; cA.cpf = "52998224725";
cA.campos = { notas_todo: [{ tipo: "cnpj", texto: "12.345.678/0001-90" }, { tipo: "aposentadoria", texto: "Possível aposentadoria especial em 22/10/2027" }] };
const kA = caso(cA, { beneficio: "Aux. Incapacidade Temporária", especie: "B31", fase: "inss", importante: true, urgente: true, prazo: iso(10),
  ronda: { despacho: { em: ts(dUtil, "15:00"), por: PAULO, prazo: iso(10) } } });
and(kA, dUtil, "Cliente avisado. Verificar em 10 dias.");
const cB = cli("Bruna Fictícia Urgente");
const kB = caso(cB, { beneficio: "Apos. por Idade", especie: "B41", fase: "inss", urgente: true });
and(kB, dUtil, "Pedido de documento enviado.");
const cC = cli("Carla Fictícia Estrela");
caso(cC, { beneficio: "Pensão por Morte", especie: "B21", fase: "inss", importante: true });
caso(cli("Roseli Maria Fictícia Custodio Schisatti"), { beneficio: "Aux. Incapacidade", especie: "B46", fase: "inss", prazo: iso(-90) });


cA.campos.atendimento = [{ em: ts(-6), quem: "Paulo", texto: `Benefício negado; ciência pelo AR em ${iso(-6).split("-").reverse().join("/")}. Quer recorrer.` }];

const ok = [];
const conf = (nome, v) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); };

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const erros = [];
  const pagina = async (opc) => {
    const ctx = await nav.newContext(opc);
    await ctx.addInitScript(([u, ss]) => {
      localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
      localStorage.setItem("crm_sessao", JSON.stringify(ss));
      localStorage.setItem("crm_tema", "v10");
    }, [SUPA, SESSAO]);
    await instalarBanco(ctx, { SUPA, SESSAO, banco });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    const p = await ctx.newPage();
    p.on("pageerror", e => erros.push(e.message));
    p.on("dialog", d => d.accept());
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
    await p.waitForSelector("#app.logado", { timeout: 15000 });
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
    return p;
  };
  const vis = (p, sel) => p.$$eval(sel, a => a.some(e => e.offsetParent || getComputedStyle(e).position === "fixed" && e.getBoundingClientRect().width > 0));

  // ── 1 · computador ──
  const p = await pagina({ viewport: { width: 1440, height: 1000 } });
  const ln = await p.evaluate(([cid, kid]) => {
    const d = document.createElement("div"); document.body.appendChild(d);
    d.innerHTML = linhaAgenda({ k: D.casoPorId.get(kid), cli: D.cliPorId.get(cid), data: "2020-10-14", quem: [], resumo: "o INSS passou dos 90 dias", selo: "Mora do INSS", prazo: true, fatal: true });
    const t = d.querySelector(".ag-txt"), r = { txt: t.textContent.trim(), title: t.title, fatal: !!d.querySelector(".ag-fatal"), conc: /Concluir/.test(d.textContent) };
    d.remove(); return r; }, [cA.id, kA.id]);
  conf(`a linha do Meu Dia traz só o nome, e o texto vai ao title (${ln.txt})`, ln.txt === cA.nome && ln.title === "o INSS passou dos 90 dias");
  conf("a linha do Meu Dia mantém o prazo fatal e não ganha botão Concluir", ln.fatal && !ln.conc);
  await p.evaluate(([cid, kid]) => { abrirFicha(cid).then(() => { casoSel = kid; abaAtiva = 2; repintarFicha(); }); }, [cA.id, kA.id]);
  await p.waitForSelector(".tr-faixa"); await p.waitForTimeout(500);
  conf("as etapas nascem recolhidas, com a linha do resumo", await p.evaluate(() => !!document.querySelector(".tr-faixa.tr-fechada") && document.querySelector(".tr-corpo").hidden && !!document.querySelector(".tr-resumo .tr-agora")));
  await p.click(".tr-alca-et"); await p.waitForTimeout(300);
  conf("ver as etapas abre a trilha e a escolha fica no navegador", await p.evaluate(() => !!document.querySelector(".tr-faixa.tr-aberta") && !document.querySelector(".tr-corpo").hidden && localStorage.getItem("crm_etapas") === "1"));
  await p.click(".tr-alca-et"); await p.waitForTimeout(300);
  conf("recolher etapas volta à linha do resumo", await p.evaluate(() => !!document.querySelector(".tr-faixa.tr-fechada") && !localStorage.getItem("crm_etapas")));
  const col = await p.evaluate(() => { const e = document.querySelector(".caso-esq:not(.caso-pz)").getBoundingClientRect(), pz = document.querySelector(".caso-pz").getBoundingClientRect(), d = document.querySelector(".caso-dir").getBoundingClientRect();
    return { e: e.right <= d.left + 1, pz: pz.top >= e.bottom - 1 && pz.right <= d.left + 1 }; });
  conf("duas colunas: o cartão e os prazos à esquerda, os andamentos à direita", col.e && col.pz);
  conf("a segunda linha do cabeçalho traz os dados, o advogado e a situação", await p.evaluate(() => { const l = document.querySelector(".det-topo .linha2"); return !!(l && l.querySelector(".resumo-lado") && l.querySelector(".cli-adv") && l.querySelector(".cli-st")); }));
  await p.screenshot({ path: OUT + "/ficha.png" });
  // a faixa do atendimento: o prazo do relato uma vez, sem o "Por que veio"
  const fx = await p.evaluate(cid => faixaAtendimento(D.cliPorId.get(cid), null), cA.id);
  conf("a faixa do atendimento traz o prazo correndo uma vez, sem o relato", (fx.match(/Prazo correndo/g) || []).length === 1 && !/Por que veio/.test(fx) && /recurso ao CRPS/.test(fx));

  // ── 2 · celular ──
  const m = await pagina({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await m.evaluate(([cid, kid]) => { abrirFicha(cid).then(() => { casoSel = kid; abaAtiva = 2; repintarFicha(); }); }, [cA.id, kA.id]);
  await m.waitForSelector(".cel-abas"); await m.waitForTimeout(500);
  const abas = await m.$$eval(".cel-abas button", a => a.map(b => b.textContent.trim().replace(/\s*\d+$/, "")));
  conf(`no celular, as abas do topo (${abas.join(", ")})`, ["Andamentos", "Prazos", "Caso", "Cadastro", "Honorários"].every(x => abas.includes(x)));
  const and = await m.$$eval(".caso-dir .menu-andamentos button", a => a.filter(b => b.offsetParent).map(b => b.textContent.trim().replace(/\s*\d+$/, "")));
  conf(`nos Andamentos, os botões das origens (${and.join(", ")})`, and.join() === "Escritório,INSS,CRPS,Judicial,Tudo");
  await m.evaluate(() => celIr("caso")); await m.waitForTimeout(300);
  conf("a aba Caso mostra o cartão do caso e esconde os andamentos", await vis(m, ".linha-caso") && !(await vis(m, ".caso-dir .timeline")));
  await m.evaluate(() => celIr("cad")); await m.waitForTimeout(400);
  const cad = await m.evaluate(() => { const v = e => !!(e && e.offsetParent); const ds = [...document.querySelectorAll(".cel-dado")].filter(v);
    return { rot: ds.map(d => d.querySelector(".cel-rot").textContent), cop: ds[0] && /Copiar/.test(ds[0].textContent), tel: !!document.querySelector('.cel-dado a[href^="tel:"]'), ident: v(document.querySelector('.painel[data-p="0"] .id-quadros, .painel[data-p="0"] form, .painel[data-p="0"] .cad-sec')) }; });
  conf(`o Cadastro abre no Principal: CPF, Meu INSS e telefone (${cad.rot.join(", ")})`, cad.rot.join() === "CPF,Meu INSS,Telefone" && cad.cop && cad.tel);
  await m.click('.cel-cad-seg [data-cc="mais"]'); await m.waitForTimeout(200);
  conf("Mais dados troca para o resto do cadastro, sem repintar", await m.evaluate(() => document.querySelector(".det-principal").dataset.celCad === "mais" && ![...document.querySelectorAll(".cel-dado")].some(e => e.offsetParent)));
  await m.screenshot({ path: OUT + "/cel-cadastro.png" });
  await m.evaluate(() => celIr("and")); await m.waitForTimeout(300);
  conf("de volta aos Andamentos, o campo de escrever aparece", await vis(m, ".escrever"));

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  console.log(`${ok.filter(x => x[1]).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ok.every(x => x[1]) ? 0 : 1);
})();
