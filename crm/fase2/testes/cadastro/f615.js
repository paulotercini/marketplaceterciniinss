// F615 · a matéria do caso (onda 1 dos casos não previdenciários, 15.11.2026): o caso cível fica sem DER, NB, espécie,
// Resumo do Caso, prazos do INSS e trilha; o cartão mostra processo, vara, partes e valor da causa; o seletor grava
// casos.area com desfazer; o caso previdenciário fica como era; a lista Marcos é do Marcos. Banco simulado, dados fictícios.
// Uso: node f615.js [pasta-das-fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f615";
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
let seq = 0;
const id = p => `${p}0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const cli = nome => { const c = { id: id("c"), nome, cpf: null, telefone: null, campos: {}, telefones: [], criado_em: "2025-01-01T12:00:00Z" }; T.clientes.push(c); return c; };
const caso = (c, o) => { const k = { id: id("b"), cliente_id: c.id, titulo: c.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
  marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, criado_em: "2026-01-01T12:00:00Z", ...o }; T.casos.push(k); return k; };

const cA = cli("Cliente Teste Cível");
const kA = caso(cA, { titulo: "Cobrança de aluguel", area: "civil", fase: "outro", origem_lista: "Marcos", processo: "10000000020268260001",
  der: "2025-03-10", nb: "1234567890", especie: "B41", decisao_em: iso(-5), etapa: "decidido", orgao_judicial: "/1ª Vara Cível de Teste",
  ronda: { detalhes: { "10000000020268260001|1º grau": { "Valor da causa": "R$ 12.000,00", "Polo ativo": "Cliente Teste", "Polo passivo": "Empresa Teste" } } } });
const cB = cli("Cliente Teste Previdência");
const kB = caso(cB, { beneficio: "Apos. por Idade", especie: "B41", fase: "inss", origem_lista: "🌻 INSS", protocolos: ["1700000701"], der: "2026-09-01",
  decisao_em: iso(-5), etapa: "decidido", resultado: "indeferido" });
const cC = cli("Cliente Teste Marcos");
const kC = caso(cC, { titulo: "Divórcio", fase: "outro", origem_lista: "🧑‍💼 Marcos" });

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
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  await instalarBanco(ctx, { SUPA, SESSAO, banco });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const abrir = (c, k) => p.evaluate(async ([c, k]) => { await abrirFicha(c); const m = document.getElementById("modal"); if (m) m.style.display = "none";
    casoSel = k; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); }, [c, k]);
  const cartao = () => p.evaluate(() => { const c = document.querySelector(".linha-caso.lc5"); return c ? c.textContent.replace(/\s+/g, " ") : ""; });

  // A · caso cível
  await abrir(cA.id, kA.id); await p.waitForTimeout(600);
  let t = await cartao();
  conf("cível: o selo diz a matéria", /Cível/.test(t) && !!(await p.$(".linha-caso.lc5 .lc5-area")));
  conf("cível: sem DER, NB nem espécie no cartão", !/DER/.test(t) && !/NB/.test(t) && !/B41/.test(t));
  conf("cível: mostra processo, vara, partes e valor da causa", /Processo/.test(t) && /1ª Vara Cível de Teste/.test(t) && /Cliente Teste × Empresa Teste/.test(t) && /R\$ 12\.000,00/.test(t));
  conf("cível: sem Resumo do Caso, prazos do INSS e trilha", await p.evaluate(k => { const x = D.casoPorId.get(k);
    return !rsLigado(x) && !recorrerAte(x) && !prazoMora(x) && !msAte(x) && !prazoDaEtapa(x) && !faseDaTrilha(x) && !etapasDaFase(x).length && !faixaTrilha(x); }, kA.id));
  conf("cível: sem Meu INSS nem e-SISREC nos acessos", await p.evaluate(k => !acessosDoCaso(D.casoPorId.get(k)).outros.concat(acessosDoCaso(D.casoPorId.get(k)).atual).join("").match(/INSS|SISREC|PAT/), kA.id));
  await p.screenshot({ path: path.join(OUT, "a-civil.png") });
  // partes à mão
  await p.click(".linha-caso.lc5 .lc-partes .lapis"); await p.fill("#lc-partes-in", "Autor Teste × Réu Teste");
  await p.click('button[onclick^="gravarPartes"]'); await p.waitForTimeout(400);
  conf("partes escritas vão a ronda.partes sem perder o cabeçalho do PJe", T.casos.find(k => k.id === kA.id).ronda.partes === "Autor Teste × Réu Teste" && !!T.casos.find(k => k.id === kA.id).ronda.detalhes);

  // B · previdenciário intacto
  await abrir(cB.id, kB.id); await p.waitForTimeout(600);
  t = await cartao();
  conf("previdenciário: espécie, DER e protocolo como antes", /B41/.test(t) && /DER/.test(t) && /Protocolo/.test(t) && !(await p.$(".linha-caso.lc5 .lc5-area")));
  conf("previdenciário: recorrer até e trilha continuam", await p.evaluate(k => { const x = D.casoPorId.get(k); return !!recorrerAte(x) && faseDaTrilha(x)==="inss"; }, kB.id));

  // C · lista Marcos sem espécie: matéria a escolher, dono Marcos
  conf("lista Marcos tem como dono o Marcos", await p.evaluate(([k, m]) => (donoDaLista(D.casoPorId.get(k))||{}).id === m && donosDoCaso(D.casoPorId.get(k))[0] === m, [kC.id, MARCOS]));
  conf("lista com ☕ continua do dono", await p.evaluate(m => (donoDaLista({origem_lista:"☕ Marcos"})||{}).id === m, MARCOS));
  await abrir(cC.id, kC.id); await p.waitForTimeout(600);
  conf("lista Marcos sem espécie mostra o seletor da matéria em destaque", !!(await p.$(".linha-caso.lc5 .lc5-area-esc")));
  await p.click(".linha-caso.lc5 .lc5-area-esc"); await p.waitForTimeout(200);
  await p.click('button[data-area="familia"]'); await p.waitForTimeout(500);
  conf("o seletor grava casos.area", T.casos.find(k => k.id === kC.id).area === "familia");
  t = await cartao();
  conf("depois de gravar, o selo diz Família", /Família/.test(t) && !(await p.$(".linha-caso.lc5 .lc5-area-esc")));
  await p.screenshot({ path: path.join(OUT, "c-familia.png") });
  const desf = await p.$("#aviso button, .aviso button");
  if (desf) { await desf.click(); await p.waitForTimeout(500); }
  conf("o desfazer devolve a matéria", T.casos.find(k => k.id === kC.id).area === "previdenciaria");

  conf("sem erro na página", erros.length === 0);
  if (erros.length) console.log(erros);
  await nav.close(); s.close();
  const f = ok.filter(x => !x[1]).length;
  console.log(`\n${ok.length - f}/${ok.length}`);
  process.exit(f ? 1 : 0);
})();
