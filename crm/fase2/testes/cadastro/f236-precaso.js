// F236 · frente "precaso" (clientes ativos): do pré-caso ao caso e o card de Aposentadorias futuras.
// O card que virou caso fecha e não gera outro caso; o card com o direito alcançado grita (art. 49 da Lei 8.213)
// e passa o recado ao advogado; o gerar o caso grava o Desfecho, liga a análise, mantém as marcas das notas, não
// apaga nada que falhou e não leva o que é de outro pré-caso; o caso mostra "Do atendimento"; a régua do
// cadastro é a da peça; Documentos segue a fase do caso. Banco simulado de estado, dados fictícios.
// Uso: node f236-precaso.js [pasta-das-fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, EU } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || path.join(require("os").tmpdir(), "f236-precaso");
fs.mkdirSync(OUT, { recursive: true });

const HOJE = new Date().toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" });
const dia = n => { const d = new Date(HOJE + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const ts = n => `${dia(n)}T13:00:00Z`;
const br = n => dia(n).split("-").reverse().join("/");

const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: JSON.parse(JSON.stringify(FIX.clientes)), casos: JSON.parse(JSON.stringify(FIX.casos)),
  atribuicoes: FIX.atribuicoes, documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;
const id = (p, n) => `${p}0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const caso = o => ({ titulo: "", protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {}, marcadores: [], origem_lista: "🙋 Escritório",
  criado_em: ts(-30), ...o });
const card = o => ({ tipo: "aposentadoria_futura", titulo: "Apos. por Idade", ativo: true, responsavel_id: null, intervalo_meses: null, criado_em: ts(-400),
  detalhes: { checklist: [], anotacoes: [] }, ...o });
const analise = o => ({ autor_id: EU, fonte: "manual", contexto: "Aposentadoria por idade urbana.", criado_em: ts(-5), ...o });

// V · o pré-caso virou caso antes da F236: o card ligado ficou vivo, "Analisado", oferecendo gerar o caso de novo
const V = id("c", 2361), KV = id("b", 2361), LV = id("1", 2361), AV = id("3", 2361);
T.clientes.push({ id: V, nome: "Valquíria Ficta Moraes", cpf: "70023600011", dn: "1964-08-10", sexo: "F", telefone: "(16) 99236-0001", campos: {}, criado_em: ts(-800) });
T.casos.push(caso({ id: KV, cliente_id: V, titulo: "Valquíria Ficta Moraes", fase: "inss", beneficio: "Apos. por Idade", especie: "B41", der: dia(-1),
  protocolos: ["1977008841"], pre_caso: false, natureza: "concessao", ad: { fora: ["cnis.ind:IREC-LC123", "falta:ppp"], valores: {}, tempos: [], beneficios: { tempo: ["idade"] } },
  precaso: { id: "pc_v", natureza: "concessao", marc: {}, honorarios: "3 primeiros benefícios na concessão", quem: EU, em: dia(-9), cod: "B41", via: "adm", lembrete_id: LV,
    etapas: { identificacao: { em: dia(-9), quem: EU }, pa: { em: dia(-8), quem: EU }, analise: { em: dia(-5), quem: EU, analise_id: AV }, documentos: { em: dia(-4), quem: EU } },
    desfecho: { tipo: "caso", em: dia(-3), quem: EU } } }));
T.lembretes.push(card({ id: LV, cliente_id: V, proximo_em: dia(-128), crm: { etapa: "analisado", precaso_id: "pc_v", analise_id: AV, data_direito: dia(-68) },
  detalhes: { todo_task_id: "todo-ficticio-v", checklist: [], anotacoes: [] } }));
T.analises_direito.push(analise({ id: AV, cliente_id: V, data_analise: dia(-5),
  cenarios: [{ regra: "Aposentadoria por idade (art. 18 da EC 103)", data: dia(-68), valor: 1621, melhor: true }],
  detalhes: { precaso_id: "pc_v", beneficio: "idade", servico: { nome: "Apos. por Idade", cod: "B41", sub: "B41" }, data_direito: dia(-68),
    modulos: { beneficios: { tempo: ["idade"] }, quando: dia(-68), requisitos: [{ id: "idade_minima", est: "ok", txt: `cumprida em ${br(-68)}: 62 anos` },
      { id: "carencia_180", est: "ok", txt: "195 contribuições; exige 180" }] },
    levados: [{ k: "cnis.resumo:carencia", txt: "Carência: 195 contribuições", fonte: "CNIS" }] } }));
T.aposentadorias.push({ id: id("2", 2361), cliente_id: V, data: dia(-68), especie: "Idade", lembrar_em: dia(-158), criado_em: ts(-800) });

// S · só o card, com o direito alcançado há 20 dias e o lembrete de documentos vencido
const S = id("c", 2362), LS = id("1", 2362);
T.clientes.push({ id: S, nome: "Sebastiana Ficta Carvalho", cpf: "70023600022", dn: "1961-09-27", sexo: "F", telefone: "(16) 99236-0002", campos: {}, criado_em: ts(-2200) });
T.lembretes.push(card({ id: LS, cliente_id: S, proximo_em: dia(-80), crm: { data_direito: dia(-20), data_fonte: "checklist do To Do" },
  detalhes: { todo_task_id: "todo-ficticio-s", checklist: [{ texto: `Aposentadoria provável ${br(-20)} (65 anos)`, feito: false }], anotacoes: [] } }));

// G · dois pré-casos; o da idade nasceu do card e vai virar caso pelo Desfecho
const G = id("c", 2363), KG1 = id("b", 2363), KG2 = id("b", 2364), LG = id("1", 2363), AG = id("3", 2363), ANG = id("a", 2363);
T.clientes.push({ id: G, nome: "Gilberto Ficto Rezende", cpf: "70023600033", dn: "1960-03-05", sexo: "M", telefone: "(16) 99236-0003", criado_em: ts(-300),
  campos: { atendimento: [
    { em: ts(-6), quem: "Paulo", autor_id: EU, texto: "Nota importante e urgente do atendimento da idade.", precaso_id: "pc_g1", importante: true, urgente: true },
    { em: ts(-5), quem: "Paulo", autor_id: EU, texto: "Pendência: conferir a CTPS antiga.", precaso_id: "pc_g1", pendente: true, atribuidos: [EU], lembrar_em: dia(2) },
    { em: ts(-4), quem: "Paulo", autor_id: EU, texto: "Nota do BPC, que fica no atendimento.", precaso_id: "pc_g2" },
    { em: ts(-3), quem: "Paulo", autor_id: EU, texto: "Nota sem dono, que fica porque há dois pré-casos." }],
    docs_pedidos: [
      { em: ts(-5), quem: "Paulo", especie: "Apos. por Idade", precaso_id: "pc_g1", ate: dia(10), itens: [{ nome: "CTPS antiga", entregue: null }, { nome: "RG", entregue: dia(-2) }] },
      { em: ts(-4), quem: "Paulo", especie: "BPC/LOAS", precaso_id: "pc_g2", itens: [{ nome: "Folha resumo do CadÚnico", entregue: null }] }] } });
T.casos.push(caso({ id: KG1, cliente_id: G, titulo: "Gilberto Ficto Rezende", fase: "escritorio", pre_caso: true, beneficio: "Apos. por Idade", etapa: "em atendimento",
    precaso: { id: "pc_g1", natureza: "", marc: { rural: true }, honorarios: "", quem: EU, em: dia(-7), cod: "B41", sub: "B41", via: "adm", lembrete_id: LG,
      etapas: { analise: { em: dia(-2), quem: EU, analise_id: AG } } }, ad: { fora: [], valores: {}, tempos: [], beneficios: { tempo: ["idade"] } } }),
  caso({ id: KG2, cliente_id: G, titulo: "Gilberto Ficto Rezende", fase: "escritorio", pre_caso: true, beneficio: "BPC/LOAS",
    precaso: { id: "pc_g2", natureza: "", marc: {}, honorarios: "", quem: EU, em: dia(-6), cod: "B88" } }));
T.lembretes.push(card({ id: LG, cliente_id: G, proximo_em: dia(-30), crm: { etapa: "atendimento", precaso_id: "pc_g1" },
  detalhes: { todo_task_id: "todo-ficticio-g", checklist: [{ texto: `Aposentadoria provável ${br(-20)} (65 anos)`, feito: false }], anotacoes: [] } }));
T.analises_direito.push(analise({ id: AG, cliente_id: G, data_analise: dia(-2), cenarios: [{ regra: "Aposentadoria por idade (art. 18 da EC 103)", data: dia(-20), valor: 1621, melhor: true }],
  detalhes: { precaso_id: "pc_g1", beneficio: "idade", servico: { nome: "Apos. por Idade", cod: "B41", sub: "B41" }, data_direito: dia(-20) } }));
T.anexos.push({ id: ANG, caso_id: null, cliente_id: G, autor_id: EU, nome: "foto-da-ctps.jpg", caminho: `${G}/foto-da-ctps.jpg`, origem: null, criado_em: ts(-4) });

// F · um pré-caso só; a gravação das notas no caso falha
const F = id("c", 2365), KF = id("b", 2365);
T.clientes.push({ id: F, nome: "Florêncio Ficto Dias", cpf: "70023600044", telefone: "(16) 99236-0005", criado_em: ts(-90),
  campos: { atendimento: [{ em: ts(-3), quem: "Paulo", autor_id: EU, texto: "Nota A que não pode sumir." }, { em: ts(-2), quem: "Paulo", autor_id: EU, texto: "Nota B que não pode sumir." }] } });
T.casos.push(caso({ id: KF, cliente_id: F, titulo: "Florêncio Ficto Dias", fase: "escritorio", pre_caso: true, beneficio: "Apos. por Idade",
  precaso: { id: "pc_f1", natureza: "", marc: {}, honorarios: "", quem: EU, em: dia(-3), cod: "B41", via: "adm" } }));

// J · caso no JEF com cadastro mínimo, contrato assinado pela aba Honorários e procuração judicial gerada
const J = id("c", 2366), KJ = id("b", 2366);
T.clientes.push({ id: J, nome: "Benedita Ficta Ramos", cpf: null, dn: null, telefone: "(16) 99236-0006", campos: {}, criado_em: ts(-110) });
T.casos.push(caso({ id: KJ, cliente_id: J, titulo: "Benedita Ficta Ramos", fase: "judicial", origem_lista: "👪 Judicial", beneficio: "Apos. por Incapacidade Permanente",
  especie: "B32", processo: "5009802-11.2026.4.03.6302", processos: [{ numero: "5009802-11.2026.4.03.6302", nosso: true }], ajuizado_em: dia(-95), pre_caso: false }));
T.anexos.push({ id: id("a", 2366), caso_id: null, cliente_id: J, autor_id: EU, nome: "Contrato assinado 10.07.2026 - contrato.pdf", caminho: `${J}/contrato-assinado.pdf`, origem: null, criado_em: ts(-99) },
  { id: id("a", 2367), caso_id: KJ, cliente_id: J, autor_id: EU, nome: "Gerado · Procuração Judicial; Declaração de Pobreza (lacunas: CPF, nascimento)", caminho: `gerados/${J}/procuracao.html`, origem: "gerado", criado_em: ts(-100) });
T.tarefas.push({ id: id("7", 2366), caso_id: KJ, titulo: "📄 Relatório do neurologista", prazo: dia(5), concluida: false, criado_em: ts(-10) },
  { id: id("7", 2367), caso_id: KJ, titulo: "Conferir a perícia designada", prazo: dia(3), concluida: false, criado_em: ts(-10) });

T.anexos.push({ id: id("a", 2368), caso_id: KJ, cliente_id: J, autor_id: EU, nome: "Petição Inicial", caminho: `pje/50098021120264036302/9800001`, origem: "pje", criado_em: ts(-95),
  texto: "EXCELENTÍSSIMO SENHOR JUIZ FEDERAL DO JUIZADO ESPECIAL FEDERAL DE RIBEIRÃO PRETO\nBENEDITA FICTA RAMOS, brasileira, casada, trabalhadora rural, portadora do RG nº 22.980.331-4 SSP/SP, inscrita no CPF sob o nº 700.236.000-77, nascida em 21/03/1968, residente na Rua Fictícia das Palmeiras, nº 77, Jardim Fictício, Sertãozinho/SP, CEP 14170-980, vem propor AÇÃO em face do INSS." });
// Y · card vivo; o caso de aposentadoria nasce pelo "Criar caso" do Escritório
const Y = id("c", 2369), LY = id("1", 2369);
T.clientes.push({ id: Y, nome: "Yolanda Ficta Prado", cpf: "70023600088", dn: "1958-01-10", sexo: "F", telefone: "(16) 99236-0009", campos: {}, criado_em: ts(-500) });
T.lembretes.push(card({ id: LY, cliente_id: Y, proximo_em: dia(40), crm: { etapa: "monitorando" }, detalhes: { todo_task_id: "todo-ficticio-y", checklist: [], anotacoes: [] } }));

// R · pensão pelo óbito do marido e o cadastro ainda diz "casada"
const R = id("c", 2370), KR = id("b", 2370);
T.clientes.push({ id: R, nome: "Rosa Ficta Albuquerque", cpf: "70023600099", dn: "1970-02-14", sexo: "F", telefone: "(16) 99236-0010", estado_civil: "casada", profissao: "Doméstica",
  endereco: "Rua Fictícia 1, nº 10", bairro: "Centro", cidade: "Ribeirão Preto", uf: "SP", cep: "14000000", campos: {}, criado_em: ts(-300) });
T.casos.push(caso({ id: KR, cliente_id: R, fase: "inss", beneficio: "Pensão por Morte", especie: "B21", der: dia(-40), obito_em: dia(-50), protocolos: ["1978006630"], pre_caso: false }));

// W · dois casos nascidos de pré-caso, cada um com a sua escolha do atendimento
const W = id("c", 2368), KW1 = id("b", 2368), KW2 = id("b", 2369);
T.clientes.push({ id: W, nome: "Wanda Ficta Lopes", cpf: "70023600066", telefone: "(16) 99236-0008", campos: {}, criado_em: ts(-200) });
T.casos.push(caso({ id: KW1, cliente_id: W, fase: "inss", beneficio: "Apos. por Idade", especie: "B41", pre_caso: false, precaso: { id: "pc_w1" }, ad: { fora: ["falta:cat"], beneficios: { tempo: ["idade"] } } }),
  caso({ id: KW2, cliente_id: W, fase: "inss", beneficio: "BPC/LOAS", especie: "B88", pre_caso: false, precaso: { id: "pc_w2" }, ad: { fora: [], beneficios: { bpc: ["idoso"] } } }));

// a gravação das notas do F falha (rede ou banco): o gerar não pode apagá-las do cadastro
const responder0 = banco.responder.bind(banco);
banco.responder = (m, u, h, c) => (m === "POST" && /\/rest\/v1\/andamentos/.test(u) && String(c || "").includes(KF))
  ? { status: 500, contentType: "application/json", body: JSON.stringify({ message: "falha simulada" }) } : responder0(m, u, h, c);

const ok = [];
const conf = (nome, v) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); };
const linha = k => T.casos.find(x => x.id === k);
const lemb = l => T.lembretes.find(x => x.id === l);
const cli = c => T.clientes.find(x => x.id === c);

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
  await instalarBanco(ctx, { SUPA, SESSAO, banco });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  let dialogo = "aceitar";
  p.on("dialog", d => dialogo === "aceitar" ? d.accept() : d.dismiss());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D._completo === true && D.cliPorId && D.cliPorId.size > 0);
  const texto = sel => p.evaluate(x => { const e = document.querySelector(x); return e ? e.innerText.replace(/\s+/g, " ") : ""; }, sel);
  const abrirCaso = async (c, k) => { await p.evaluate(([c, k]) => abrirFicha(c).then(() => { const m = document.getElementById("modal"); if (m) m.style.display = "none";
    _atendAberto.delete(c); casoSel = k; abaAtiva = 2; subAba = "escritorio"; repintarFicha(); }), [c, k]); await p.waitForTimeout(500); };

  // ── 1 · o card que virou caso (lacuna 1 e achado A) ──
  conf("na carga, o card cujo pré-caso virou caso sai dos cards vivos e espera a ficha gravar o fechamento",
    await p.evaluate(([v, l]) => !cardsApos().some(x => x.id === l) && !lembretesDo(v).length && (D._cardsViraram || []).some(x => x.id === l), [V, LV]));
  conf("e a etapa dele é Virou caso, pela linha do pré-caso", await p.evaluate(l => etapaDoCard(D._cardsViraram.find(x => x.id === l)) === "caso", LV));
  conf("o aviso de 3 meses de quem já tem a aposentadoria em caso aberto se cala", await p.evaluate(v => !lembretesApos().some(a => a.cliente.id === v), V));
  await abrirCaso(V, KV);
  await p.waitForTimeout(400);
  const lv = lemb(LV);
  conf("abrir a ficha grava o card: crm.etapa caso, crm.caso_id e desligado (a ponte conclui a tarefa no To Do)",
    lv.ativo === false && lv.crm.etapa === "caso" && lv.crm.caso_id === KV && lv.crm.precaso_id === "pc_v");
  const nCasos = T.casos.length;
  await p.evaluate(([v, l, x]) => { D.lembretes.push({ ...x, id: l + "-eco", ativo: true }); return gerarCasoDoCard(v, l + "-eco"); }, [V, LV, { ...lv, crm: { precaso_id: "pc_v" } }]);
  await p.waitForTimeout(500);
  conf("o Gerar o caso de um card que já virou caso abre o caso, e não cria outro", T.casos.length === nCasos && await p.evaluate(k => casoSel === k && abaAtiva === 2, KV));

  // ── 2 · o caso mostra o que o atendimento decidiu (lacunas 2, 8, 9) ──
  await abrirCaso(V, KV);
  const da = await texto(".do-atend");
  if (process.env.VER) console.log("DA:", da);
  await p.screenshot({ path: path.join(OUT, "01-do-atendimento.png") });
  conf("o caso que nasceu de pré-caso tem o quadro Do atendimento, com o Desfecho e a via", /Do atendimento/.test(da) && /Desfecho: Apos\. por Idade · via administrativa · Concessão/.test(da));
  conf("com a análise registrada, os requisitos que ela gravou e a data do direito",
    /Análise de Direito de/.test(da) && /Já tem a idade mínima\? em ordem/.test(da) && /195 contribuições; exige 180/.test(da) && new RegExp(`direito desde ${br(-68)}`).test(da));
  conf("os itens levados e os deixados de fora no Primeiro atendimento, e os passos do atendimento",
    /Levados do Primeiro atendimento \(1\)/.test(da) && /indicador IREC-LC123 do CNIS/.test(da) && /Passos: Identificação/.test(da) && /Honorários combinados/.test(da));
  conf("Nas outras abas diz a data do direito da análise do caso", /direito desde/.test(await texto(".outras-abas")));
  await p.click(".do-atend button");
  await p.waitForTimeout(700);
  conf("Abrir a análise leva à Análise de Direito dessa análise, com os requisitos na ficha dela",
    await p.evaluate(a => abaAtiva === 0 && subCad === "direito" && _adSel.get(clienteAberto) === a, AV) && /Requisitos registrados · Por idade/.test(await texto(".adr-ficha")));
  await p.evaluate(() => { abaAtiva = 9; repintarFicha(); });
  conf("a aposentadoria provável diz que está em caso (no quadro Aposentadoria do Cadastro, F277)", /em caso:/.test(await texto(".idf-apos")));
  await p.evaluate(() => fecharCaixa());

  // ── 3 · o card com o direito alcançado (achados A: alarme e recado) ──
  await p.evaluate(sx => abrirFicha(sx), S);
  await p.waitForTimeout(500);
  const chip = await texto(".cli-st.alarme");
  conf(`o alto da ficha grita o direito alcançado para quem estiver atendendo (${chip})`, /Direito há 20 dias · protocolar já/.test(chip));
  await p.evaluate(() => { abaAtiva = 9; repintarFicha(); });
  await p.waitForTimeout(200);
  const al = await texto(".card-alarme");
  await p.screenshot({ path: path.join(OUT, "02-alarme-do-card.png") });
  conf("o card diz quanto se perde: começa no pedido (art. 49), R$ por mês e por dia, e o já perdido",
    /arts\. 49 e 54/.test(al) && /R\$\s?1\.621,00 a menos/.test(al) && /R\$\s?54,03 por dia/.test(al) && /já são cerca de R\$\s?1\.081,00/.test(al));
  conf("e o próximo passo com data: ligar hoje, abrir o atendimento e protocolar, com o que falta para protocolar",
    new RegExp(`hoje \\(${br(0)}\\)`).test(al) && /protocolar no mesmo dia/.test(al) && /senha do Meu INSS/.test(al) && /Abrir atendimento/.test(al) && /Passar ao advogado/.test(al));
  dialogo = "recusar";
  await p.evaluate(l => adiarLembrete(l, new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)), LS);
  dialogo = "aceitar";
  conf("adiar o card com o direito alcançado pergunta antes (e, recusado, não adia)", lemb(LS).proximo_em === dia(-80));
  await p.evaluate(([sx, l]) => passarAoAdvogado(sx, l), [S, LS]);
  await p.waitForTimeout(200);
  await p.evaluate(([sx, l]) => passarAoAdvogadoGravar(sx, l), [S, LS]);
  await p.waitForTimeout(400);
  conf("Passar ao advogado: menção, tarefa para hoje e o card ganha o responsável",
    T.mencoes.some(m => m.cliente_id === S && m.para_id === EU && /direito/.test(m.texto)) && T.tarefas.some(t => t.cliente_id === S && t.prazo === HOJE && /Sebastiana/.test(t.titulo))
    && lemb(LS).responsavel_id === EU);
  await p.evaluate(sx => novoAtendimento(sx), S);
  await p.waitForTimeout(600);
  conf("o + atendimento de quem tem card vivo pergunta e, se é dele, abre o atendimento ligado ao card",
    T.casos.some(k => k.cliente_id === S && k.pre_caso && (k.precaso || {}).lembrete_id === LS) && lemb(LS).crm.precaso_id && await p.evaluate(sx => _atendAberto.has(sx), S));
  await p.evaluate(sx => { _atendAberto.delete(sx); }, S);
  conf("sem caso nem atendimento, a Análise de Direito parte do benefício do card", await p.evaluate(sx => JSON.stringify(benefSel(D.cliPorId.get(sx))) === '{"tempo":["idade"]}', S));

  // ── 4 · gerar o caso pelo Desfecho (lacunas 1, 2, 7, 9, 12, 13, 14, 17) ──
  await p.evaluate(g => abrirAtendimentoDe(g, "pc_g1"), G);
  await p.waitForTimeout(600);
  conf("no atendimento, o documento gerado vai à linha do pré-caso escolhido, e não ao outro", await p.evaluate(([g, k]) => (casoDoDoc(g) || {}).id === k, [G, KG1]));
  await p.evaluate(g => desfechoCaso(g, true, true), G);
  await p.waitForTimeout(1500);
  const kg = linha(KG1);
  conf("a linha vira caso no INSS, sem a etapa velha, com a natureza e o marcador do atendimento",
    kg.pre_caso === false && kg.fase === "inss" && kg.etapa === null && kg.natureza === "concessao" && (kg.marcadores || []).includes("rural"));
  conf("o Desfecho fica gravado no caso: benefício, via, data do direito, linhas e a análise",
    kg.precaso.desfecho.tipo === "caso" && kg.precaso.desfecho.via === "adm" && kg.precaso.desfecho.analise_id === AG && !!kg.precaso.desfecho.beneficio && Array.isArray(kg.precaso.desfecho.linhas));
  conf("o card do To Do ligado ao pré-caso vira Virou caso, com o caso, e se desliga",
    lemb(LG).ativo === false && lemb(LG).crm.etapa === "caso" && lemb(LG).crm.caso_id === KG1);
  conf("a análise registrada no atendimento se liga ao caso", (T.analises_direito.find(a => a.id === AG).detalhes || {}).caso_id === KG1);
  const andsG = T.andamentos.filter(a => a.caso_id === KG1);
  const imp = andsG.find(a => /importante e urgente/.test(a.texto)), pend = andsG.find(a => /conferir a CTPS/.test(a.texto));
  conf("a nota migrada mantém importante e urgente", imp && imp.importante === true && imp.urgente === true);
  conf("a nota pendente vira tarefa de quem ela atribuía, com a data", pend && T.andamento_tarefas.some(t => t.andamento_id === pend.id && t.colaborador_id === EU && t.lembrar_em === dia(2)));
  const camG = cli(G).campos;
  conf("as notas do outro pré-caso e as sem dono ficam no atendimento (há dois pré-casos)",
    (camG.atendimento || []).length === 2 && camG.atendimento.some(n => n.precaso_id === "pc_g2") && camG.atendimento.some(n => !n.precaso_id));
  const tsG = T.tarefas.filter(t => t.caso_id === KG1);
  conf("o pedido deste pré-caso vira checklist com a entrega combinada, e o entregue fica concluído",
    tsG.some(t => t.titulo === "📄 CTPS antiga" && t.prazo === dia(10) && !t.concluida) && tsG.some(t => t.titulo === "📄 RG" && t.concluida === true));
  conf("o pedido do outro pré-caso fica no cadastro", (camG.docs_pedidos || []).length === 1 && camG.docs_pedidos[0].precaso_id === "pc_g2");
  conf("o anexo sem caso não vai a este caso quando há outro pré-caso", T.anexos.find(a => a.id === ANG).caso_id === null);
  conf("o atendimento fecha ao gerar o caso", await p.evaluate(g => !_atendAberto.has(g) && !_pcSel.has(g), G));
  await abrirCaso(G, KG1);
  conf("o caso recém-gerado mostra o Desfecho no quadro Do atendimento", /Desfecho: Apos\. por Idade/.test(await texto(".do-atend")) && /virou caso em/.test(await texto(".do-atend")));

  // ── 5 · a gravação no caso falha: nada some do cadastro (lacuna 12) ──
  await p.evaluate(f => abrirFicha(f), F);
  await p.waitForTimeout(400);
  await p.evaluate(f => gerarCasoDoPre(f, "pc_f1"), F);
  await p.waitForTimeout(1200);
  conf("o caso nasce, mas as notas que não gravaram no caso continuam no cadastro",
    linha(KF).pre_caso === false && (cli(F).campos.atendimento || []).length === 2 && !T.andamentos.some(a => a.caso_id === KF));

  // ── 6 · régua do cadastro e Documentos pela fase do caso (achados B) ──
  conf("a régua da Identificação e a peça contam as mesmas lacunas (9)", await p.evaluate(j => { const c = D.cliPorId.get(j); return faltaParaDocs(c).length === 9 && cadFaltandoChaves(c).length === 9; }, J));
  await abrirCaso(J, KJ);
  const oa = await p.evaluate(() => { const e = document.querySelector(".outras-abas"); if(!e) return ""; const h = e.hidden; e.hidden = false; const t = e.innerText.replace(/\s+/g, " "); e.hidden = h; return t; });   // F320 · o quadro mora dobrado nos números do caso
  await p.screenshot({ path: path.join(OUT, "03-caso-judicial.png") });
  conf(`o caso avisa o cadastro incompleto (${oa.slice(0, 160)})`, /Cadastro 9 dados faltam às peças/.test(oa) && /sem CPF e nascimento, não há portal do cliente nem dossiê/.test(oa));
  conf("documento e tarefa em linhas próprias, com a data", new RegExp(`Documentos 1 pendente · até ${br(5).slice(0, 5)}`).test(oa) && new RegExp(`Tarefas do caso 1 aberta · até ${br(3).slice(0, 5)}`).test(oa));
  await p.evaluate(() => { abaAtiva = 0; irSubCad("documentos"); });
  await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(OUT, "04-documentos-judicial.png"), fullPage: true });
  conf("Documentos abre com as pendências do caso, onde o item está à vista", /Relatório do neurologista/.test(await texto("#dq-pend-caso")) && /Conferir a perícia/.test(await texto("#dq-pend-caso")));
  const ass = await texto("#dq-assinar");
  conf("no caso judicial, a procuração judicial e a declaração vêm primeiro, para esta ação",
    /Para esta ação \(Judicial\)/.test(ass) && await p.evaluate(() => /Procuração Judicial/.test((document.querySelector("#dq-assinar .form-linha button") || {}).textContent || ""))
    && await p.evaluate(() => !!document.querySelector("#dq-assinar details.doc-inss")) && !/Só se o caso for à Justiça/.test(ass));
  conf("o que já foi gerado e o contrato assinado aparecem", /Procuração Judicial ✔ gerado/.test(ass) && /Contrato de Honorários ✔ assinado/.test(ass));
  const ger = await texto("#dq-gerados");
  conf("Gerados e assinados conta o contrato da aba Honorários e não diz que o caso vai nascer", /2 documentos/.test(ger) && /Contrato assinado/.test(ger) && /o caso já existe/.test(ger));
  conf("sem pré-caso, o benefício em análise é o do caso (B32)", await p.evaluate(j => JSON.stringify(benefSel(D.cliPorId.get(j))) === '{"incapacidade":["b32"]}', J));
  await p.evaluate(() => { abaAtiva = 0; irSubCad("identificacao"); });
  await p.waitForTimeout(300);
  conf("a Identificação diz quantas lacunas a peça tem", /Cadastro 10% completo · 9 lacunas nas peças/.test(await texto(".idf-comp")));

  conf("o caso avisa que a petição inicial traz os dados do cadastro", /a petição inicial traz os dados/.test(oa));
  const qual = await texto(".pa-nome-dif");
  conf("a Identificação propõe a qualificação da petição inicial, só nos campos vazios",
    /Da petição inicial/.test(qual) && /CPF 700\.236\.000-77/.test(qual) && /nascimento 21\/03\/1968/.test(qual) && /estado civil Casado/.test(qual)
    && /profissão trabalhadora rural/.test(qual) && /Sertãozinho\/SP, CEP 14170-980/.test(qual));
  await p.evaluate(j => usarQualificacao(j), J);
  await p.waitForTimeout(700);
  const cj = cli(J);
  conf("Usar no cadastro grava CPF, nascimento, estado civil, profissão, RG e endereço, e a peça fica sem lacuna",
    cj.cpf === "70023600077" && cj.dn === "21031968" && cj.estado_civil === "casado" && cj.profissao === "trabalhadora rural" && cj.rg === "22.980.331-4"
    && cj.cidade === "Sertãozinho" && cj.cep === "14170980" && /Rua Fictícia das Palmeiras, nº 77/.test(cj.endereco || "") && await p.evaluate(j => !faltaParaDocs(D.cliPorId.get(j)).length, J));

  // ── 6b · o "Criar caso" do Escritório liga o card (achado 21) ──
  await p.evaluate(y => abrirFicha(y), Y);
  await p.waitForTimeout(400);
  await p.evaluate(y => { modalCriarCaso(y); document.getElementById("cc-esp").value = "B41"; document.getElementById("cc-lista").value = "inss"; return criarCasoEscritorio(y); }, Y);
  await p.waitForTimeout(700);
  const ky = T.casos.find(k => k.cliente_id === Y && !k.pre_caso);
  conf("o caso de aposentadoria criado no Escritório, confirmado como o do card, fecha o card", ky && lemb(LY).ativo === false && lemb(LY).crm.etapa === "caso" && lemb(LY).crm.caso_id === ky.id);

  await abrirCaso(R, KR);
  conf("a pensão avisa que o cadastro diz casada e o óbito diz viúva", new RegExp(`o cadastro diz casada, mas pelo óbito de ${br(-50)} é viúva`).test(await texto(".outras-abas")));

  // ── 7 · com dois casos de pré-caso, a escolha é a do caso aberto (lacuna 10) ──
  conf("casoComAd segue o caso aberto na ficha", await p.evaluate(([w, k2]) => { casoSel = k2; return (casoComAd(D.cliPorId.get(w)) || {}).id === k2; }, [W, KW2]));

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
