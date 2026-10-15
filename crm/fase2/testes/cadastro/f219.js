// F219 · a integração do atendimento (ondas 2 a 5): etapas do pré-caso com
// "Concluir esta etapa", a Análise de Direito devolvendo espécie e data ao
// pré-caso e ao card, o quadro Desfecho (lembrete, caso, arquivar), Documentos
// em seis quadros cruzados com o dossiê, a folha gerada guardada e a mesa antiga
// recolhida. Pontuação de 0 a 100 por peso; a entrega exige mais de 95. Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { FIX, SESSAO, CLI_CHEIO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const L1 = "10000000-0000-0000-0000-0000000000a1";
const DIREITO = "2027-06-15";   // terça-feira: D-60 = 16/04/2027 (sexta), D-90 = 15/03/2027 (segunda)

FIX.clientes[0] = { ...FIX.clientes[0], cpf: "52998224725", logradouro: "Rua Fictícia", dossie: {},
  campos: { precasos: [{ id: "pc_1", especie: "", natureza: "", marc: {}, honorarios: "", quem: null, em: "2026-10-12", lembrete_id: L1 }] } };
FIX.casos = [];
FIX.colaboradores = [...FIX.colaboradores, { id: "22222222-2222-2222-2222-222222222222", auth_id: null, nome: "Amanda Fictícia", inicial: "A", cor: "#1B6E38", papel: "membro", ativo: true, cargo: "advogada", setor: null }];
FIX.atribuicoes = [];
FIX.lembretes = [{ id: L1, cliente_id: CLI_CHEIO, tipo: "aposentadoria_futura", titulo: "Aposentadoria por idade", ativo: true, proximo_em: "2027-03-01",
  intervalo_meses: null, crm: { precaso_id: "pc_1", etapa: "atendimento" }, detalhes: { todo_task_id: "t1", beneficio: "Aposentadoria por idade", anotacoes: [], checklist: [] } }];
FIX.anexos = [
  { id: "a0000000-0000-0000-0000-000000000001", cliente_id: CLI_CHEIO, caso_id: null, origem: "dossie", nome: "CNIS · CNIS completo.pdf", caminho: "dossie/52998224725/CNIS/CNIS completo.pdf", tipo: "application/pdf", texto: "texto fictício", criado_em: "2026-10-10T12:00:00Z" },
  { id: "a0000000-0000-0000-0000-000000000002", cliente_id: CLI_CHEIO, caso_id: null, origem: "dossie", nome: "CTPS RAIS CAGED · Extrato RAIS 2023.pdf", caminho: "dossie/52998224725/CTPS RAIS CAGED/Extrato RAIS 2023.pdf", tipo: "application/pdf", texto: "texto fictício", criado_em: "2026-10-10T12:00:00Z" },
];
FIX.documentos_beneficio = [
  { id: "e1", beneficio: "Apos. por Idade", itens: "RG, CNH ou CIN — Original e cópia\nCPF\nComprovante de residência — no máximo 3 meses\nBiometria — Verifique na Justiça Eleitoral",
    extras: "Carteira de Trabalho (CTPS) — Todas as páginas\nExtrato do CNIS atualizado\nRAIS — Relação Anual\nDTC — Declaração de Tempo de Contribuição emitida pelo INSS", observacoes: "" },
];

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 1100 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  const reg = []; let seq = 0;
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url(), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    let corpo = null; try { corpo = JSON.parse(rota.request().postData() || "null"); } catch (e) { corpo = rota.request().postData(); }
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1] || (/\/storage\//.test(u) ? "storage" : "");
    if (m !== "GET") reg.push({ m, t, u, corpo });
    if (m === "POST" && t && t !== "storage") {
      const linhas = (Array.isArray(corpo) ? corpo : [corpo]).map(x => ({ id: `gen-${++seq}`, criado_em: new Date().toISOString(), ...x }));
      return rota.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(linhas) });
    }
    if (m !== "GET") return rota.fulfill(m === "POST" ? { status: 201, contentType: "application/json", body: "{}" } : { status: 204, body: "" });
    let lista = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) lista = lista.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(lista) });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  const itens = []; const conf = (peso, nome, v) => itens.push([peso, nome, !!v]);
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await p.evaluate(() => { window.open = () => ({ document: { write() {}, close() {} } }); const av = window.aviso; window._avisos = []; window.aviso = (m, s) => { _avisos.push(String(m)); return av(m, s); }; });
  // o corpo do upload é lido na página: o Chromium instalado pela CI não entrega ao route o corpo de um Blob
  await p.evaluate(() => { const s0 = subirArquivo; window.__subidos = []; subirArquivo = async (c, b) => { try { window.__subidos.push({ c, t: await b.text() }); } catch (e) {} return s0(c, b); }; });
  await p.evaluate(cli => abrirFicha(cli), CLI_CHEIO);
  await p.waitForFunction(() => D._ficha && D._ficha.cliId && !_lendoDossie && !_lendoLeitores, null, { timeout: 30000 });
  await p.evaluate(() => { abaAtiva = 0; _atendAberto.add(clienteAberto); irSubCad("identificacao"); });
  await p.waitForSelector(".atend-passos");
  const texto = sel => p.evaluate(s => [...document.querySelectorAll(s)].map(e => e.textContent.replace(/\s+/g, " ").trim()), sel);
  const n = sel => p.evaluate(s => document.querySelectorAll(s).length, sel);
  const pcAtual = () => p.evaluate(cli => JSON.parse(JSON.stringify(precasosDe(D.cliPorId.get(cli))))   /* F226 · lê das linhas de casos */, CLI_CHEIO);
  // espera a condição em vez de um tempo fixo: sob carga (a CI roda quatro provas juntas) 600 ms não bastavam
  const esperar = async (cond, ms = 8000) => { const fim = Date.now() + ms; while (Date.now() < fim) { if (await cond()) return true; await p.waitForTimeout(100); } return false; };
  const hojeBr = await p.evaluate(() => fmt(hoje()));

  // ── A · onda 2: etapas, Concluir e a análise que volta ao pré-caso e ao card ──
  const temConcluir = await n(".atend-acoes .atend-concluir");
  await p.click(".atend-acoes .atend-concluir");
  await p.waitForFunction(() => subCad === "pa", null, { timeout: 5000 }).catch(() => {});
  const pcs1 = await pcAtual(), et1 = ((pcs1[0] || {}).etapas || {}).identificacao || {};
  const avisou = reg.some(x => x.t === "mencoes");
  conf(5, "A1 Concluir esta etapa grava quem e quando, avisa o próximo e abre o passo seguinte", temConcluir === 1 && et1.em && et1.quem && avisou && (await p.evaluate(() => subCad)) === "pa");
  const passo1 = (await texto(".atend-passos .pa-passo"))[0] || "";
  conf(4, "A2 o passo concluído mostra ✔, quem fechou e a data", (await n(".atend-passos .pa-passo.feita")) === 1 && passo1.includes("✔") && passo1.includes("Paulo") && passo1.includes(hojeBr));
  await p.evaluate(cli => { admSalvar(cli, a => { a.beneficios = { tempo: ["idade"] }; }); }, CLI_CHEIO);
  await p.click(".atend-acoes .atend-concluir");
  await p.waitForFunction(() => subCad === "direito", null, { timeout: 5000 }).catch(() => {});
  const etPa = (((await pcAtual())[0] || {}).etapas || {}).pa || {};
  conf(4, "A3 concluir o Primeiro atendimento leva os benefícios marcados e abre a Análise de Direito", etPa.em && etPa.beneficios && etPa.beneficios.tempo && (await p.evaluate(() => subCad)) === "direito");
  await p.waitForSelector("#ad-esp", { state: "attached" });
  await p.evaluate(() => { document.getElementById("ad-novo").open = true; const e = document.getElementById("ad-esp"); e.value = "B41"; e.dispatchEvent(new Event("change", { bubbles: true })); });
  await p.waitForTimeout(200);
  await p.evaluate(d => { const f = document.getElementById("ad-f-data_direito"); f.value = d; document.getElementById("ad-contexto").value = "Análise fictícia do teste F219"; }, DIREITO);
  const visDd = await p.evaluate(() => !document.querySelector('#ad-campos [data-campo="data_direito"]').hidden);
  const regAntes = reg.length;
  await p.evaluate(cli => salvarAnalise(cli), CLI_CHEIO);
  await esperar(async () => { const pc = (await pcAtual())[0] || {}; return pc.etapas && pc.etapas.analise
    && reg.slice(regAntes).some(x => x.t === "aposentadorias" && x.m === "POST") && reg.slice(regAntes).some(x => x.t === "lembretes" && x.m === "PATCH"); });
  const novos = reg.slice(regAntes), pc2 = (await pcAtual())[0] || {};
  const lemb = novos.filter(x => x.t === "lembretes" && x.m === "PATCH").map(x => x.corpo).pop() || {};
  const apos = novos.filter(x => x.t === "aposentadorias" && x.m === "POST").map(x => x.corpo).pop() || {};
  conf(4, "A4 a análise devolve ao pré-caso a espécie decidida e a etapa com o id da análise", visDd && pc2.cod === "B41" && pc2.especie && pc2.etapas && pc2.etapas.analise && /^gen-/.test(pc2.etapas.analise.analise_id || ""));
  conf(7, "A5 o card ligado vira Analisado com a data do direito, documentos em D-60 e aviso em D-90",
    lemb.crm && lemb.crm.etapa === "analisado" && lemb.crm.data_direito === DIREITO && /^gen-/.test(lemb.crm.analise_id || "") && lemb.proximo_em === "2027-04-16" && apos.lembrar_em === "2027-03-15" && apos.data === DIREITO);
  const etapas = await p.evaluate(() => {
    const mk = (crm, prox) => ({ tipo: "aposentadoria_futura", titulo: "x", proximo_em: prox, crm, detalhes: {} });
    return [etapaDoCard(mk({ data_direito: "2099-01-01", etapa: "analisado" }, "2020-01-01")), etapaDoCard(mk({ data_direito: "2020-01-01", etapa: "analisado" }, "2019-11-01")),
      etapaDoCard(mk({ data_direito: "2099-01-01", etapa: "analisado" }, "2098-11-01")), etapaDoCard(mk({ etapa: "caso", data_direito: "2020-01-01" }, "2019-01-01")), APOS_MOTIVOS.includes("Faleceu")];
  });
  conf(5, "A6 Documentação no D-60, Pronto só com o direito alcançado (D-0), caso e arquivado não mudam; motivo Faleceu existe",
    etapas[0] === "documentacao" && etapas[1] === "pronto" && etapas[2] === "analisado" && etapas[3] === "caso" && etapas[4]);

  // ── B · onda 3: o quadro Desfecho ──────────────────────────────────────
  await p.evaluate(() => repintarFicha());
  await p.waitForSelector("#desfecho");
  const desf = (await texto("#desfecho .desf-base"))[0] || "";
  const btLemb = (await texto("#desfecho .adr-bt"))[0] || "";
  conf(5, "B1 o Desfecho sugere o lembrete pela data futura e, com card ligado, oferece atualizá-lo", /^Lembrete/.test(desf) && desf.includes("15.06.2027") && /Atualizar o card/.test(btLemb));
  // sem card ligado: o lembrete nasce do Desfecho
  // F226 · o card sai do objeto do pré-caso, que mora na linha de casos
  // com a máquina carregada, a recarga da análise pode chegar depois: tira o card e repinta até o botão valer
  await esperar(() => p.evaluate(cli => { linhasPreCaso(cli).forEach(k => { if (k.precaso) delete k.precaso.lembrete_id; }); repintarFicha();
    const b = [...document.querySelectorAll("#desfecho .adr-bt")].find(x => /Criar o lembrete/.test(x.textContent)); return !!b && !b.disabled; }, CLI_CHEIO), 20000);
  const regB = reg.length;
  await p.click("#desfecho .adr-bt:has-text('Criar o lembrete')");
  await esperar(async () => reg.slice(regB).some(x => x.t === "lembretes" && x.m === "POST") && !!(((await pcAtual())[0] || {}).desfecho));
  const nl = reg.slice(regB).filter(x => x.t === "lembretes" && x.m === "POST").map(x => x.corpo).pop() || {};
  const pc3 = (await pcAtual())[0] || {};
  conf(7, "B2 Criar o lembrete grava o card de aposentadoria futura com etapa, data, D-60 e cadência de 6 meses, e o pré-caso registra o desfecho",
    nl.tipo === "aposentadoria_futura" && nl.crm && nl.crm.etapa === "analisado" && nl.crm.data_direito === DIREITO && nl.proximo_em === "2027-04-16" && nl.intervalo_meses === 6
    && nl.detalhes && nl.detalhes.origem === "precaso" && pc3.so_lembrete && pc3.desfecho && pc3.desfecho.tipo === "lembrete" && pc3.lembrete_id);
  const imed = await p.evaluate(cli => { const c = D.cliPorId.get(cli); const ks = D.casosDoCliente.get(cli); D.casosDoCliente.set(cli, (D.casosDoCliente.get(cli) || []).filter(k => !k.pre_caso)); const pcs = c.campos.precasos;
    c.campos.precasos = [{ id: "pc_rev", especie: "Revisão", natureza: "revisao", marc: {} }];
    const b = baseDesfecho(c, null); c.campos.precasos = pcs; D.casosDoCliente.set(cli, ks); return b; }, CLI_CHEIO);
  conf(5, "B3 revisão é ato que não espera: o Desfecho sugere o caso", imed.sug === "caso" && /não espera/.test(imed.motivo));
  await p.evaluate(cli => { const c = D.cliPorId.get(cli); D.casosDoCliente.set(cli, (D.casosDoCliente.get(cli) || []).filter(k => !k.pre_caso)); c.campos.precasos = [{ id: "pc_2", especie: "Aposentadoria por idade", natureza: "", marc: {}, em: "2026-10-12" }]; }, CLI_CHEIO);
  await p.evaluate(cli => desfechoArquivar(cli, "Faleceu"), CLI_CHEIO);
  await esperar(async () => (await pcAtual()).length === 0);
  const arq = await p.evaluate(cli => { const cp = D.cliPorId.get(cli).campos; return { pcs: (cp.precasos || []).length, arq: (cp.pc_arquivados || []).slice(-1)[0], nota: (cp.atendimento || []).slice(-1)[0] }; }, CLI_CHEIO);
  const avisoPensao = await p.evaluate(() => _avisos.some(m => /pensão por morte/.test(m)));
  conf(5, "B4 Arquivar tira o pré-caso da mesa com o motivo, anota, e Faleceu lembra a pensão aos dependentes",
    arq.pcs === 0 && arq.arq && arq.arq.desfecho.motivo === "Faleceu" && /arquivado: Faleceu/.test(arq.nota.texto) && avisoPensao);

  // ── C · onda 4: Documentos em seis quadros ─────────────────────────────
  await p.evaluate(cli => { const c = D.cliPorId.get(cli); D.casosDoCliente.set(cli, (D.casosDoCliente.get(cli) || []).filter(k => !k.pre_caso)); c.campos.precasos = [{ id: "pc_3", especie: "Aposentadoria por idade", natureza: "", marc: {}, em: "2026-10-12", etapas: { identificacao: { em: "2026-10-12" } } }];
    admSalvar(cli, a => { a.beneficios = { tempo: ["idade"] }; }); _atendAberto.add(cli); abaAtiva = 0; irSubCad("documentos"); }, CLI_CHEIO);
  await p.waitForSelector(".doc-quadros", { state: "attached" });
  const ids = await p.evaluate(() => [...document.querySelectorAll(".doc-quadros > .doc-quadro")].map(e => e.id).filter(Boolean));
  conf(5, "C1 Documentos em seis quadros: assinar, providenciar, já temos, guias, gerados e desfecho", ["dq-assinar", "dq-prov", "dq-temos", "dq-guias", "dq-gerados", "dq-desfecho"].every(i => ids.includes(i)));
  const prov = await texto("#dq-prov .doc-it"), temos = await texto("#dq-temos li"), escr = await texto("#dq-prov .doc-escr li");
  conf(9, "C2 o catálogo cruza com o dossiê: CNIS e RAIS em Já temos com ver, RG e CPF da ficha, biometria e CTPS com o cliente, DTC com o escritório",
    temos.some(t => /CNIS/.test(t) && /ver/.test(t)) && temos.some(t => /^RAIS/.test(t)) && temos.some(t => /^RG/.test(t)) && temos.some(t => /^CPF/.test(t))
    && !prov.some(t => /CNIS|RAIS/.test(t)) && prov.some(t => /Biometria/.test(t)) && prov.some(t => /Carteira de Trabalho/.test(t)) && escr.some(t => /DTC/.test(t)));
  const guias = (await texto("#dq-guias .doc-guia")).join(" | ");
  const guiasRur = await p.evaluate(cli => { admSalvar(cli, a => { a.beneficios = { rural: ["idade_rural"], incapacidade: ["b31"] }; }); const c = D.cliPorId.get(cli); return quadroGuias(c).replace(/<[^>]+>/g, " "); }, CLI_CHEIO);
  conf(5, "C3 guias por espécie: RAC e o serviço do Meu INSS na idade; autodeclaração no rural; campos vinculantes no B31",
    /RAC Completo \(Anexo I\)/.test(guias) && /Pedir Aposentadoria/.test(guias) && /Autodeclaração do segurado especial/.test(guiasRur) && /Data de início dos sintomas/.test(guiasRur));
  await p.evaluate(cli => { admSalvar(cli, a => { a.beneficios = { tempo: ["idade"] }; }); repintarFicha(); }, CLI_CHEIO);
  await p.waitForSelector("#dq-prov");
  const regC = reg.length;
  await p.click("#dq-prov button:has-text('Imprimir e registrar o pedido')");
  await esperar(() => reg.slice(regC).some(x => x.t === "clientes" && x.m === "PATCH" && x.corpo.campos && x.corpo.campos.docs_pedidos));
  const ped = reg.slice(regC).filter(x => x.t === "clientes" && x.m === "PATCH").map(x => x.corpo).pop() || {};
  const dp = ((ped.campos || {}).docs_pedidos || []).slice(-1)[0] || {};
  conf(5, "C4 o pedido ao cliente fica registrado com a espécie do catálogo, a data de entrega e só o que falta", dp.especie === "Apos. por Idade" && dp.ate && dp.itens && dp.itens.some(i => /Biometria/.test(i.nome)) && !dp.itens.some(i => /CNIS/.test(i.nome)));
  await p.waitForSelector("#dq-gerados");
  const regG = reg.length;
  await p.evaluate(cli => imprimirDocsEscritorio(cli, ["proc_judicial", "contrato"], ["CEP"]), CLI_CHEIO);
  await esperar(async () => reg.slice(regG).some(x => x.t === "storage" && /\/object\/anexos\/gerados\//.test(x.u))
    && reg.slice(regG).some(x => x.t === "anexos" && x.m === "POST") && (await texto("#dq-gerados .mov-lista li")).some(t => /reimprimir/.test(t)), 10000);
  const up = reg.slice(regG).find(x => x.t === "storage" && /\/object\/anexos\/gerados\//.test(x.u));
  const upCorpo = (up && typeof up.corpo === "string" && up.corpo) || await p.evaluate(() => (window.__subidos || []).filter(x => /^gerados\//.test(x.c)).map(x => x.t).pop() || "");
  const an = reg.slice(regG).filter(x => x.t === "anexos" && x.m === "POST").map(x => x.corpo).pop() || {};
  const gerados = await texto("#dq-gerados .mov-lista li");
  conf(6, "C5 a folha gerada fica guardada no bucket e em anexos (origem gerado, com as lacunas) e aparece em Gerados com reimprimir",
    up && /PROCURAÇÃO/.test(upCorpo) && /Aurélia Ficta/.test(upCorpo) && an.origem === "gerado" && an.tipo === "text/html" && /lacunas: CEP/.test(an.nome) && gerados.some(t => /reimprimir/.test(t)));
  await p.evaluate(() => { abaAtiva = 0; irSubCad("anotacoes"); });
  await p.waitForSelector(".caixa-atend");
  const mesa = await p.evaluate(() => ({ novo: !!document.querySelector(".mesa-novo"), b2: !!document.querySelector(".caixa-atend .mesa-b2 #at-docs"), dec: [...document.querySelectorAll(".caixa-atend .rotulo-caso")].some(e => /E agora\?/.test(e.textContent)), b3: !!document.querySelector(".caixa-atend .mesa-b3") }));
  conf(4, "C6 com etapas, a mesa antiga recolhe documentos, análise e decisão, e as anotações ficam", mesa.novo && !mesa.b2 && !mesa.dec && mesa.b3);

  // ── D · onda 5, desenho e erros ────────────────────────────────────────
  let py = false;
  try { execSync("python3 -m pytest tests/test_docs_catalogo.py -q", { cwd: path.join(__dirname, "../../../.."), stdio: "pipe" }); py = true; } catch (e) {}
  conf(5, "D1 o catálogo do CRM compara e alimenta as listas do site (docs_catalogo.py, testado)", py);
  await p.evaluate(() => { abaAtiva = 0; _atendAberto.add(clienteAberto); irSubCad("direito"); });
  await p.waitForSelector("#desfecho");
  const css = fs.readFileSync(path.join(__dirname, "app.html"), "utf8");
  const a11y = await p.evaluate(() => ({ h3: !!document.querySelector("#desfecho h3"), sel: !!document.querySelector("#desfecho select[aria-label]"), bts: [...document.querySelectorAll("#desfecho button")].every(b => b.type === "button") }));
  conf(5, "D2 Desfecho com título, select rotulado e botões; o Concluir responde ao toque e respeita o movimento reduzido",
    a11y.h3 && a11y.sel && a11y.bts && /\.atend-concluir:active\{transform:scale\(\.97\)\}/.test(css) && /prefers-reduced-motion:reduce\)\{\.atend-concluir\{transition:none\}/.test(css));
  conf(5, "D3 sem erro de página", !erros.length);

  await p.screenshot({ path: "/tmp/f219-ad.png" });
  await p.evaluate(() => irSubCad("documentos"));
  await p.waitForSelector(".doc-quadros");
  await p.screenshot({ path: "/tmp/f219-docs.png", fullPage: true });

  const total = itens.reduce((t, [w]) => t + w, 0), feito = itens.filter(x => x[2]).reduce((t, [w]) => t + w, 0);
  for (const [w, nome, v] of itens) console.log(`${v ? "✔" : "✘"} ${String(w).padStart(2)} ${nome}`);
  if (erros.length) console.log(erros.join("\n"));
  console.log(`PESOS: ${total} · PONTUAÇÃO: ${feito}/${total}`);
  await nav.close(); s.close();
  process.exit(feito > 95 && total === 100 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
