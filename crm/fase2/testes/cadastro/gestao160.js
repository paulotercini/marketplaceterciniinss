// F160 — GESTÃO DOS CASOS (lição do Tramitação Inteligente, 03.10.2026). A
// origem do prospecto desce ao cadastro e vira coluna no painel; o
// representante legal entra na qualificação das peças; o revisor é tarefa
// com papel; o Meu Dia lista o que eu deleguei; a carga da equipe conta
// tarefas abertas, de hoje e vencidas. Números e textos fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, EU, CLI_CHEIO, CLI_VAZIO, CASO1 } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

const OUTRA = "22222222-2222-2222-2222-222222222222";
FIX.colaboradores.push({ id: OUTRA, auth_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", nome: "Amanda Fictícia",
  inicial: "A", cor: "#8e44ad", papel: "colab", ativo: true, atende_zap: false, cargo: "assistente", setor: null });
const hj = new Date().toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });
const ontem = new Date(Date.now() - 864e5).toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });
// a cliente cheia veio de indicação; a vazia entrou hoje, sem origem
FIX.clientes[0].campos = { civil: { origem: "indicação" } };
FIX.clientes[0].criado_em = new Date(Date.now() - 10 * 864e5).toISOString();
FIX.clientes[1].criado_em = new Date().toISOString();
const AND = { id: "a1", caso_id: CASO1, autor_id: EU, origem: "app", texto: "📝 Escrever a réplica à contestação.", andamentos_lidos: [],
  criado_em: new Date(Date.now() - 2 * 864e5).toISOString() };
// Paulo delegou à Amanda (vencida ontem); Amanda tem uma de hoje; Paulo tem uma de hoje que revisa
FIX.andamento_tarefas = [
  { id: "t1", andamento_id: "a1", caso_id: CASO1, colaborador_id: OUTRA, atribuido_por: EU, lembrar_em: ontem, concluida_em: null, natureza: "compromisso", papel: "executa" },
  { id: "t2", andamento_id: "a1", caso_id: CASO1, colaborador_id: EU, atribuido_por: EU, lembrar_em: hj, concluida_em: null, natureza: "compromisso", papel: "revisa" },
];
FIX.leads = [{ id: "l1", nome: "Prospecto Fictício Alves", telefone: "(16) 99999-0002", beneficio_interesse: "BPC/LOAS",
  origem: "parceiro", etapa: "fechado", cliente_id: null, criado_em: new Date().toISOString() }];

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
  const escritas = [];
  let semPapel = false, n = 0;
  await ctx.route(SUPA + "/**", rota => {
    const u = decodeURIComponent(rota.request().url()), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (m !== "GET") {
      const corpo = rota.request().postDataJSON ? (rota.request().postDataJSON() || {}) : {};
      escritas.push({ t, m, corpo });
      // o banco sem a coluna recusa o papel uma vez, como o PostgREST faz
      if (t === "andamento_tarefas" && semPapel && corpo.papel)
        return rota.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ code: "PGRST204", message: "Could not find the 'papel' column of 'andamento_tarefas' in the schema cache" }) });
      const id = `n${++n}`;
      return rota.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify([{ id, ...corpo, criado_em: new Date().toISOString() }]) });
    }
    let corpo = FIX[t] || [];
    if (t === "andamentos" && /origem=in\./.test(u)) corpo = [AND];
    if (t === "andamentos" && /id=in\./.test(u)) corpo = [AND];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error" && !/ERR_FAILED|400 \(Bad Request\)/.test(m.text())) erros.push("console: " + m.text()); });
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);

  // ── 1. a origem: no cadastro, no painel e na virada do prospecto ──────────
  await p.evaluate(id => abrirFicha(id), CLI_CHEIO);
  await p.waitForSelector("#cad-origem", { state: "attached" });
  const origem = await p.evaluate(() => document.getElementById("cad-origem").textContent.trim());
  conf("a Identificação mostra a origem gravada no cadastro (Indicação)", origem === "Indicação");
  const m = await p.evaluate(() => { const m = metricasDash(null, 90); return { origens: m.origens, sem: m.semOrigem, novos: m.novosClientes, equipe: m.extra.equipe.map(x => ({ n: x.c.inicial, a: x.abertas, h: x.hojeN, v: x.venc })) }; });
  conf("o painel conta os clientes novos do período por origem e os sem origem", m.novos === 2 && m.origens.length === 1 && m.origens[0].v === "indicação" && m.origens[0].n === 1 && m.sem === 1);
  await p.evaluate(() => { fecharFicha(false); irPara("dashboard"); });
  await p.waitForSelector(".dk-origem .dk-hbar");
  const dkOrigem = await p.evaluate(() => document.querySelector(".dk-origem").textContent.replace(/\s+/g, " "));
  conf("a coluna De onde vêm os clientes aparece na carteira com a barra de Indicação", /De onde vêm os clientes/.test(dkOrigem) && /Indicação/.test(dkOrigem) && /1 sem origem/.test(dkOrigem));
  await p.evaluate(() => leadParaCliente("l1"));
  await p.waitForFunction(() => document.querySelector("#aviso.on"));
  const cliPost = escritas.find(e => e.t === "clientes" && e.m === "POST");
  conf("o prospecto fechado vira cliente com a origem (parceiro) no cadastro", cliPost && cliPost.corpo.nome === "Prospecto Fictício Alves" && cliPost.corpo.campos && cliPost.corpo.campos.civil.origem === "parceiro");

  // ── 2. a carga da equipe por tarefas ─────────────────────────────────────
  const eqA = m.equipe.find(x => x.n === "A"), eqP = m.equipe.find(x => x.n === "P");
  conf("a carga da equipe conta por pessoa: Amanda 1 aberta (vencida), Paulo 1 aberta (hoje)", eqA && eqA.a === 1 && eqA.v === 1 && eqA.h === 0 && eqP && eqP.a === 1 && eqP.h === 1 && eqP.v === 0);
  const eq = await p.evaluate(() => ({
    cab: document.querySelector(".dk-eq-cab").textContent.replace(/\s+/g, " ").trim(),
    linhas: [...document.querySelectorAll(".dk-equipe .dk-hbar:not(.dk-eq-cab)")].map(l => ({
      nome: l.querySelector(".dk-hrot").textContent.trim(), abertas: l.querySelector("b").textContent.trim(),
      hoje: l.querySelectorAll(".dk-exito")[0].textContent.trim(), hojeCls: l.querySelectorAll(".dk-exito")[0].className,
      venc: l.querySelectorAll(".dk-exito")[1].textContent.trim(), vencCls: l.querySelectorAll(".dk-exito")[1].className })) }));
  const lA = eq.linhas.find(l => /Amanda/.test(l.nome)), lP = eq.linhas.find(l => /Paulo/.test(l.nome));
  conf("o bloco é uma tabela com cabeçalho abertas · hoje · vencidas e as linhas certas", eq.cab.replace(/\s+/g, "") === "abertashojevencidas" && lA && lA.abertas === "1" && lA.hoje === "–" && lA.venc === "1" && /venc/.test(lA.vencCls) && lP && lP.hoje === "1" && /hj/.test(lP.hojeCls) && lP.venc === "–");

  // ── 3. delegadas por mim, no Meu Dia ─────────────────────────────────────
  await p.evaluate(() => irPara("meudia"));
  await p.waitForFunction(() => [...document.querySelectorAll("h3.secao")].some(h => /Delegadas por mim/.test(h.textContent)));
  const deleg = await p.evaluate(() => {
    const sec = [...document.querySelectorAll("section.pl-grupo")].find(x => /Delegadas por mim/.test(x.textContent));
    return { n: sec.querySelector(".pl-n").textContent.trim(), linhas: sec.querySelectorAll(".ag-linha").length,
      txt: sec.textContent.replace(/\s+/g, " "), revisa: !!document.querySelector(".ag-revisa") };
  });
  conf("o Meu Dia lista a tarefa que delegou à Amanda, vencida, e só ela", deleg.n === "1" && deleg.linhas === 1 && /Aurélia Ficta/.test(deleg.txt) && /réplica/.test(deleg.txt));
  conf("a tarefa de revisar do Paulo leva o selo revisa na agenda", deleg.revisa);

  // ── 4. o revisor no 📌 dar seguimento ────────────────────────────────────
  await p.evaluate(() => { segItens.length = 0; const i = segRegistrar(D.casos[0].id, "Juntada de contestação", "a1"); abrirSeguimento(i); });
  await p.waitForSelector("#seg-rev");
  const antes = escritas.length;
  await p.evaluate(([outra, eu]) => {
    document.querySelector(`.seg-quem[data-col="${outra}"]`).click();
    document.getElementById("seg-rev").value = eu;
    document.getElementById("seg-txt").value = "Escrever a réplica.";
    document.getElementById("seg-data").value = hoje();
    return salvarSeguimento();
  }, [OUTRA, EU]);
  await p.waitForTimeout(400);
  const tfs = escritas.slice(antes).filter(e => e.t === "andamento_tarefas");
  conf("o 📌 grava a executora e, com papel revisa, o revisor, na mesma data", tfs.length === 2 && tfs[0].corpo.colaborador_id === OUTRA && !tfs[0].corpo.papel && tfs[1].corpo.colaborador_id === EU && tfs[1].corpo.papel === "revisa" && tfs[0].corpo.lembrar_em === tfs[1].corpo.lembrar_em);

  // ── 5. o banco sem a coluna: a tarefa grava sem o papel e o aviso explica ─
  semPapel = true;
  const antes2 = escritas.length;
  await p.evaluate(([outra, eu]) => { segItens.length = 0; abrirSeguimento(segRegistrar(D.casos[0].id, "Outro movimento", "a1")); }, [OUTRA, EU]);
  await p.waitForSelector("#seg-rev");
  await p.evaluate(([outra, eu]) => {
    document.querySelector(`.seg-quem[data-col="${outra}"]`).click();
    document.getElementById("seg-rev").value = eu;
    document.getElementById("seg-txt").value = "Conferir a juntada.";
    document.getElementById("seg-data").value = hoje();
    return salvarSeguimento();
  }, [OUTRA, EU]);
  await p.waitForTimeout(400);
  const tfs2 = escritas.slice(antes2).filter(e => e.t === "andamento_tarefas");
  conf("sem a coluna, o CRM repete a gravação sem o papel e nada se perde", tfs2.length === 3 && tfs2[1].corpo.papel === "revisa" && !tfs2[2].corpo.papel && tfs2[2].corpo.colaborador_id === EU);
  semPapel = false;

  // ── 6. o chip do revisor na linha do tempo ───────────────────────────────
  const chip = await p.evaluate(([and, t1, t2]) => { D.tarefasFicha = [t1, t2]; return vistos(and); }, [AND, FIX.andamento_tarefas[0], FIX.andamento_tarefas[1]]);
  conf("na linha do tempo o revisor tem pastilha própria, com a palavra revisa", /tf-chip\s[^"]*rev"/.test(chip) && /<small>revisa<\/small>/.test(chip));

  // ── 7. o representante legal: campo, gravação e procuração ───────────────
  await p.evaluate(id => abrirFicha(id), CLI_CHEIO);
  await p.waitForSelector("#campo-representante", { state: "attached" });
  await p.evaluate(id => editarRepresentante(id), CLI_CHEIO);
  await p.waitForSelector("#rep-nome", { state: "attached" });
  const antes3 = escritas.length;
  await p.evaluate(id => {
    document.getElementById("rep-nome").value = "Benedita Ficta de Souza";
    document.getElementById("rep-cpf").value = "987.654.321-00";
    document.getElementById("rep-qual").value = "curadora";
    return guardarRepresentante(id);
  }, CLI_CHEIO);
  await p.waitForTimeout(300);
  const patch = escritas.slice(antes3).find(e => e.t === "clientes" && e.m === "PATCH");
  conf("o representante grava em clientes.campos com nome, CPF só dígitos e qualidade", patch && patch.corpo.campos.representante.nome === "Benedita Ficta de Souza" && patch.corpo.campos.representante.cpf === "98765432100" && patch.corpo.campos.representante.qualidade === "curadora" && patch.corpo.campos.civil.origem === "indicação");
  const doc = await p.evaluate(([id, vazio]) => { const c = D.cliPorId.get(id); return {
    linha: document.getElementById("campo-representante").textContent.trim(),
    proc: corpoDoDoc("proc_adm", c, "").corpo,
    contrato: preencherModeloDoc("CONTRATANTE: " + QUALIF + ".", c, ""),
    sem: preencherModeloDoc("CONTRATANTE: " + QUALIF + ".", D.cliPorId.get(vazio), "") }; }, [CLI_CHEIO, CLI_VAZIO]);
  conf("a Identificação mostra nome, CPF e qualidade", doc.linha === "Benedita Ficta de Souza · CPF 987.654.321-00 · curadora");
  conf("a procuração sai com “neste ato representada por …, na qualidade de curadora” depois do CEP", /CEP _+, neste ato representada por Benedita Ficta de Souza, inscrito\(a\) no CPF nº 987\.654\.321-00, na qualidade de curadora,/.test(doc.proc));
  conf("a qualificação do contrato recebe o mesmo trecho e o cliente sem representante não muda", /na qualidade de curadora\./.test(doc.contrato) && !/representad|<REPRESENTANTE>/.test(doc.sem) && /CEP _+\./.test(doc.sem));

  for (const [nome, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${nome}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
