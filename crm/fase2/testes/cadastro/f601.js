// F601 e F668 · o pré-caso como caso em formação (onda 1, aprovada em 21.11.2026): a aba Pré-caso saiu; o Casos ▾ traz
// o caso em formação primeiro, com o selo, e os encerrados recolhidos; a tela do caso abre com o quadro no alto;
// sem caso nem pré-caso, o advogado vê "＋ Pré-caso"; o prazo do pré-caso entra nas datas do cliente com o rótulo
// "Pré-caso". Banco simulado e dados fictícios.
// Uso: node f601.js [pasta-das-fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f601";
fs.mkdirSync(OUT, { recursive: true });

const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: JSON.parse(JSON.stringify(FIX.clientes)), casos: JSON.parse(JSON.stringify(FIX.casos)),
  atribuicoes: FIX.atribuicoes, documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;
const A = "c0000000-0000-0000-0000-000000000a61", B = "c0000000-0000-0000-0000-000000000b61", C = "c0000000-0000-0000-0000-000000000c61", D = "c0000000-0000-0000-0000-000000000d61";
const KA = "b0000000-0000-0000-0000-000000000a61", KE = "b0000000-0000-0000-0000-000000000e61", KB = "b0000000-0000-0000-0000-000000000b61";
const d5 = new Date(Date.now() - 5 * 864e5);
const cien = `${String(d5.getDate()).padStart(2, "0")}/${String(d5.getMonth() + 1).padStart(2, "0")}/${d5.getFullYear()}`;
const caso = o => ({ titulo: "", protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {}, marcadores: [], ...o });
// A: um caso ativo e um encerrado, sem pré-caso
T.clientes.push({ id: A, nome: "Cliente Teste Um", cpf: "70010060011", telefone: "(16) 5500000001", campos: {}, criado_em: "2025-01-01T12:00:00Z" });
// B: só um pré-caso vivo, com o relato do indeferimento (prazo do recurso)
T.clientes.push({ id: B, nome: "Cliente Teste Dois", cpf: "70010060022", telefone: "(16) 5500000002", criado_em: "2025-01-01T12:00:00Z",
  campos: { atendimento: [{ id: "n1", texto: `Benefício indeferido pelo INSS, ciência em ${cien}.`, em: new Date().toISOString(), quem: null }] } });
// C: só um pré-caso arquivado
T.clientes.push({ id: C, nome: "Cliente Teste Tres", cpf: "70010060033", telefone: "(16) 5500000003", criado_em: "2025-01-01T12:00:00Z",
  campos: { pc_arquivados: [{ id: "pc_c1", especie: "BPC/LOAS", desfecho: { tipo: "arquivado", motivo: "Renda acima do limite", em: "2026-11-02" } }] } });
// D: sem caso e sem pré-caso
T.clientes.push({ id: D, nome: "Cliente Teste Quatro", cpf: "70010060044", telefone: "(16) 5500000004", campos: {}, criado_em: "2025-01-01T12:00:00Z" });
T.casos.push(caso({ id: KA, cliente_id: A, titulo: "Cliente Teste Um", fase: "inss", beneficio: "Aposentadoria por idade", criado_em: "2025-02-01T12:00:00Z" }),
  caso({ id: KE, cliente_id: A, titulo: "Cliente Teste Um", fase: "encerrado", encerrado: true, encerrado_em: "2025-06-01T12:00:00Z", beneficio: "Auxílio-doença", criado_em: "2025-01-02T12:00:00Z" }),
  caso({ id: KB, cliente_id: B, titulo: "Cliente Teste Dois", fase: "escritorio", pre_caso: true, precaso: { id: "pc_b1", especie: "Aposentadoria por invalidez" },
    beneficio: "Aposentadoria por invalidez", origem_lista: "🙋 Escritório", criado_em: "2026-11-01T12:00:00Z" }));

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
    localStorage.setItem("crm_passos_tudo", "1");
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  await instalarBanco(ctx, { SUPA, SESSAO, banco });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const abrir = async id => { await p.evaluate(i => { abaAtiva = 0; abrirFicha(i); }, id); await p.waitForTimeout(700); };
  const menuCasos = id => p.evaluate(i => {
    const el = document.createElement("button"); document.body.appendChild(el);
    menuProcessos({ stopPropagation() {}, currentTarget: el }, D.casosDoCliente.get(i) || []);
    const v = [...document.querySelectorAll("#menu-processos .mp-it")].map(x => x.textContent);
    fecharMenuProcessos(); el.remove(); return v;
  }, id);

  // A · com casos e sem pré-caso: sem aba Pré-caso; o ＋ Novo pré-caso mora no Casos ▾
  await abrir(A);
  conf("a aba Pré-caso não existe mais (F668)", !(await p.$('.mt[data-vv="6"]')));
  const mA = await menuCasos(A);
  conf("o Casos ▾ lista o caso ativo e o encerrado, sem selo Em formação", mA.length >= 2 && !mA.some(t => /Em formação/.test(t)));
  conf("o Casos ▾ oferece o ＋ Novo pré-caso", mA.some(t => /Novo pré-caso/.test(t)));
  await p.screenshot({ path: path.join(OUT, "a-sem-precaso.png") });

  // B · pré-caso vivo: primeiro no Casos ▾, com o selo; abre a tela do caso com o quadro no alto
  await abrir(B);
  conf("com pré-caso vivo, nenhuma aba Pré-caso", !(await p.$('.mt[data-vv="6"]')));
  const mB = await menuCasos(B);
  conf("o caso em formação vem primeiro no Casos ▾, com o selo", /Em formação/.test(mB[0] || "") && /Passo:/.test(mB[0] || ""));
  conf("o prazo do pré-caso entra nas datas do cliente com o rótulo Pré-caso",
    await p.evaluate(i => linhasDeDatas(i).linhas.filter(l => l.rotulo === "Pré-caso").length === 1, B));
  await p.click("#btn-processos"); await p.waitForTimeout(200);
  await p.screenshot({ path: path.join(OUT, "b-menu.png") });
  await p.click("#menu-processos .mp-pc"); await p.waitForTimeout(500);
  const q = await p.evaluate(() => { const e = document.querySelector(".pc-quadro"); return e ? {
    t: e.textContent.replace(/\s+/g, " "), at: (e.querySelector('.pcq-passos [aria-current="step"]') || {}).textContent || "",
    alto: !e.previousElementSibling || !e.closest(".painel").textContent.trim().startsWith(e.textContent.trim()) ? e.getBoundingClientRect().top : e.getBoundingClientRect().top } : null; });
  conf("a ficha abre o caso com o quadro Caso em formação", !!q && /Caso em formação/.test(q.t) && /Em formação/.test(q.t));
  conf("o quadro marca o passo atual (Identificação)", !!q && /Identificação/.test(q.at));
  conf("o quadro tem Continuar atendimento e a lista do To Do", !!q && /Continuar atendimento/.test(q.t) && /Lista no To Do: 🙋 Escritório/.test(q.t));
  conf("o quadro vem antes dos andamentos do caso", await p.evaluate(() => { const e = document.querySelector(".pc-quadro"), o = document.querySelector(".caso-2col");
    return !!e && (!o || !!(e.compareDocumentPosition(o) & Node.DOCUMENT_POSITION_FOLLOWING)); }));
  await p.screenshot({ path: path.join(OUT, "b-quadro.png") });
  await p.click(".pcq-cont"); await p.waitForTimeout(500);
  conf("Continuar atendimento abre o atendimento daquele pré-caso", await p.evaluate(() => abaAtiva === 0));

  // C · só arquivado (legado): Casos ▾ com "Pré-casos encerrados (1)" recolhido, que abre com motivo e data
  await abrir(C);
  conf("só com arquivado, o Casos ▾ aparece", !!(await p.$("#btn-processos")));
  await p.click("#btn-processos"); await p.waitForTimeout(200);
  conf("os encerrados ficam recolhidos", await p.evaluate(() => /Pré-casos encerrados \(1\)/.test(document.querySelector(".mp-pc-tog").textContent)
    && document.querySelector(".mp-pc-arq").hidden));
  await p.click(".mp-pc-tog"); await p.waitForTimeout(200);
  const arq = await p.evaluate(() => { const e = document.querySelector(".mp-pc-arq"); return e && !e.hidden ? e.textContent : ""; });
  conf("aberto, o encerrado traz o motivo e a data", arq.includes("Renda acima do limite") && arq.includes("02.11.2026") && /Encerrado/.test(arq));
  await p.screenshot({ path: path.join(OUT, "c-arquivado.png") });
  await p.evaluate(() => fecharMenuProcessos());

  // D · sem caso nem pré-caso: o advogado vê o ＋ Pré-caso
  await abrir(D);
  conf("sem caso nem pré-caso, o advogado vê o ＋ Pré-caso", !!(await p.$("#btn-novo-pc")) && !(await p.$("#btn-processos")));

  conf("sem erro de página", erros.length === 0);
  if (erros.length) console.log(erros);
  const n = ok.filter(x => x[1]).length;
  console.log(`\n${n}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(n === ok.length ? 0 : 1);
})();
