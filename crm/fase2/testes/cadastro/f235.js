// F235 · o teste do atendimento por espécie (16.10.2026): os leitores do dossiê (relatório médico, certidões,
// carteira de trabalho), o pré-preenchimento da Análise de Direito, o quadro Tempos que nasce do CNIS, os oito
// serviços como opção, o prazo que corre sem virar "Ainda não", o prazo de cada dependente, a PcD nos três graus,
// a qualidade que a pensão não mantém e o texto do HC que não vira lixo. Funções puras, contexto montado à mão
// (reqCtxTeste). Banco simulado e dados fictícios. Uso: node f235.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";

const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "lembretes", "anexos", "analises_direito",
  "aposentadorias", "lista_pref", "andamento_tarefas", "modelos_mensagem", "credencial_vis", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: JSON.parse(JSON.stringify(FIX.clientes)), casos: JSON.parse(JSON.stringify(FIX.casos)),
  atribuicoes: FIX.atribuicoes, documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });

const ok = [];
const conf = (nome, v, extra) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome + (v || extra === undefined ? "" : `  (${JSON.stringify(extra).slice(0, 300)})`)); };

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

  const r = await p.evaluate(() => {
    const o = {};
    // 1 · o relatório do médico em datas
    o.afast = datasDoRelatorio("Paciente sem condições de dirigir. Afastamento de 60 dias a partir de 25/09/2026. Em fisioterapia.");
    o.desde = datasDoRelatorio("Em quimioterapia desde 10/07/2026. Sem condições de trabalhar por tempo indeterminado.");
    o.casa = datasDoRelatorio("Queda de escada em casa em 08/03/2026 (domingo), fora do trabalho, com fratura do rádio. Tratamento encerrado; fratura consolidada. Sequela definitiva.");
    o.faixa = datasDoRelatorio("Queda de carga sobre o pé direito no trabalho em 28/09/2026. Afastamento de 90 dias, de 28/09/2026 a 26/12/2026.");
    o.diag = datasDoRelatorio("Doença de Parkinson, CID G20, diagnosticada em 12/03/2026 neste serviço.");
    o.avc = datasDoRelatorio("AVC isquêmico em 10/06/2013. Hemiparesia direita definitiva.");
    o.cong = datasDoRelatorio("Perda auditiva neurossensorial bilateral, compatível com surdez congênita.");
    // 2 · as certidões
    o.obito = lerCertidaoTexto("CERTIDÃO DE ÓBITO\nNome: JOSE FICTO\nData e hora do falecimento: 20/08/2026, às 14h10\nCausa da morte: acidente de trânsito (motocicleta)\nEstado civil: solteiro");
    o.prisao = lerCertidaoTexto("CERTIDÃO DE RECOLHIMENTO PRISIONAL\nCertifico que MARCOS FICTO foi recolhido à prisão em 25/08/2026, para cumprir pena em REGIME FECHADO.");
    o.cdp = lerCertidaoTexto("DECLARAÇÃO\nDeclaramos que DIEGO FICTO deu entrada nesta unidade em 10/06/2026 por prisão preventiva e permanece recolhido.");
    o.nasc = lerCertidaoTexto("CERTIDÃO DE NASCIMENTO\nRegistrada: LAURA FICTA · nascida em 02/10/2026, às 07h40");
    // 3 · a carteira de trabalho
    o.ctps = lerCtpsTexto("CONTRATO DE TRABALHO: METALURGICA ALFA LTDA · cargo ajudante · admissão 02/01/1984 · saída 15/12/1989\nCONTRATO DE TRABALHO: SERRALHERIA BETA LTDA · cargo serralheiro · admissão 05/03/1990");
    // 4 · o texto do HC e a frase
    o.hc = desfazFonteHc("G20),");
    o.frase = fraseClinica("SEQUELA DE LESAO DOS TENDOES CID: S66.1");
    // 5 · a qualidade que a pensão e o BPC não mantêm
    o.mantem = [naoMantemQualidade({especie:"21"}), naoMantemQualidade({especie:"87"}), naoMantemQualidade({especie:"31"})];
    const vsPensao = [{tipo:"Empregado", origem:"A", inicio:"01/01/2000", fim:"31/12/2010"}, {tipo:"Benefício", especie:"21", origem:"PENSAO POR MORTE", inicio:"01/01/2020"}];
    const vsAux = [{tipo:"Empregado", origem:"A", inicio:"01/01/2000", fim:"31/12/2010"}, {tipo:"Benefício", especie:"31", origem:"AUXILIO", inicio:"01/01/2026"}];
    o.gPensao = !!(calcularGraca(vsPensao, 100, false, [], [], []) || {}).semLimite;
    o.gAux = !!(calcularGraca(vsAux, 100, false, [], [], []) || {}).semLimite;
    // 6 · os serviços como opção e a família certa
    o.serv = ["CTC","IIR","GPS","B93","REST","COPIA","JA","SD"].map(k=>(REQ_BENEF[k]||[]).length);
    o.opCTC = (opcaoDe("CTC")||{}).o; o.famCTC = (familiaDaEspecie("Certidão de Tempo de Contribuição")||{}).chave;
    o.famIIR = (familiaDaEspecie("Isenção de Imposto de Renda")||{}).chave;
    // 7 · o pré-preenchimento: o afastamento do relatório vira a DII e o último dia trabalhado
    const clin = [{tipo:"Relatório", data:"2026-09-29", fonte:"HC Ribeirao/Relatorios", titulo:"Relatorio medico", resumo:"", cids:[], fatos: datasDoRelatorio("Afastamento de 60 dias a partir de 25/09/2026.")}];
    const xb = reqCtxTeste({sx:"M", dn:"1981-07-14", clin});
    o.pre = {dii: xb.v.inc_dii, dat: xb.v.inc_dat, dcb: xb.v.inc_dcb, usado: Object.keys(xb.preUsado||{}).sort().join(",")};
    // 8 · o veredito: o prazo que corre, sozinho, é "sim, e o prazo corre"
    o.ver = vereditoReq("b31", {hoje:"2026-10-16"}, {rs:[{id:"prazo_30_dias_dib", rot:"Pediu em 30 dias?", est:"risco", txt:"prazo correndo: peça até 24/10/2026"}, {id:"carencia_12", rot:"12?", est:"ok", txt:"ok"}], informar:0, quando:null});
    o.quando = quandoTxt("idoso", {quando:"2025-05-20"}, {hoje:"2026-10-16"});
    // 9 · a pensão: o filho menor de 16 tem 180 dias, e o prazo aberto é vermelho
    const xm = reqCtxTeste({dn:"1985-01-01", v:{dep_fato:"2026-08-20", dep_classe:"Companheiro(a)"}, cad:{membros:[{nome:"PEDRO FICTO", parentesco:"Filho", nascimento:"2022-05-01"}]}});
    o.pz = (avaliarReq("morte", xm).rs.find(r=>r.id==="prazo_requerimento")||{});
    // 10 · a CTC: o que vai já e o cargo no regime próprio
    const xc = reqCtxTeste({g:{vinculos:[{tipo:"Empregado", origem:"EMPRESA A LTDA", inicio:"01/04/1999", fim:"31/07/2006", indicadores:[]},
      {tipo:"Empregado ou Agente Público", origem:"PREFEITURA DE MONTE", inicio:"03/03/2014", aberto:true, indicadores:["PRPPS"]}]}});
    const ac = avaliarReq("CTC", xc); o.ctc = {per:(ac.rs.find(r=>r.id==="ctc_periodos")||{}), cargo:(ac.rs.find(r=>r.id==="ctc_cargo")||{}).est};
    // 11 · o quadro Tempos nasce do CNIS: magistério pela RAIS, especial pelo PPP
    const xt = reqCtxTeste({sx:"M", g:{vinculos:[{tipo:"Empregado", origem:"ESCOLA ALFA", codigo:"12.345.678/0001-90", inicio:"01/02/1995", fim:"31/12/2010", indicadores:[]},
      {tipo:"Empregado", origem:"METALURGICA", codigo:"98.765.432/0001-10", inicio:"01/01/2011", fim:"31/12/2015", indicadores:[]}]},
      fd:{rais:[{raiz:"12345678", ano:"2005", cbo:"PROFESSOR DE MATEMATICA NO ENSINO MEDIO"}], ppps:[{cnpj:"98.765.432/0001-10", riscos:[{tipo:"F", fator:"Ruído", db:95, epi:"S", ini:"01/01/2011", fim:"31/12/2015"}]}]}});
    const ta = temposAutomaticos(xt); o.tempos = ta.map(t=>t.nat).join(",");
    // 12 · a PcD sem grau: a conta nos três graus
    const xp = reqCtxTeste({sx:"F", dn:"1976-04-22", v:{def_did:"1976-04-22"}, tempos:[{de:"1995-01-01", ate:"2026-09-30", nat:"comum"}]});
    o.pcd = (avaliarReq("pcd", xp).rs.find(r=>r.id==="tempo_pcd")||{});
    // 13 · a certidão de óbito diz o estado civil, os filhos e quem declarou; a de casamento, os contraentes
    o.ob2 = lerCertidaoTexto("CERTIDÃO DE ÓBITO\nNome: JOSE CARLOS FICTO\nData e hora do falecimento: 20/08/2026, às 06h40\nCausa da morte: infarto agudo do miocárdio\nEstado civil: solteiro\nFilhos: PEDRO FICTO SANTANA, 4 anos\nDeclarante: CLAUDIA FICTA MORAES, companheira\nData do registro: 21/08/2026");
    o.cas = lerCertidaoTexto("CERTIDÃO DE CASAMENTO\nContraentes: REINALDO FICTO BARBOSA e MARLENE FICTA BARBOSA (nome de solteira MARLENE FICTA SOUZA)\nData do casamento: 12/12/1998 · Regime de bens: comunhão parcial");
    // 14 · quem pede e a união vêm do papel e do relato; o filho da certidão de óbito tem 180 dias; o percentual da pensão
    const cli = {id:"cli-f235", nome:"Cláudia Ficta Moraes", campos:{atendimento:[{texto:"O companheiro faleceu; viviam juntos desde 2019 e têm o Pedro, de 4 anos."}]}};
    const xd = reqCtxTeste({c:cli, op:"morte", dn:"1983-03-12", hoje:"2026-10-16", der:"2026-10-16", cert:[{...o.ob2}]});
    o.dep = {classe: xd.v.dep_classe, uniao: xd.v.dep_uniao, acid: xd.v.ins_acidente};
    const am = avaliarReq("morte", xd);
    o.dpz = (am.rs.find(r=>r.id==="prazo_requerimento")||{}).txt || "";
    o.dval = (am.rs.find(r=>r.id==="dependentes_valor")||{}).txt || "";
    // 15 · o código do campo some da tela
    o.cod = semCodigo("informe a data do fato (dep_fato) e o regime (dep_regime, rec_certidao)");
    // 16 · a roça proposta pelos papéis: do primeiro papel de atividade, aberta para quem segue na roça, sem o emprego do CNIS
    const cr = {id:"cli-f235-rur", nome:"Aparecida Ficta dos Santos", campos:{atendimento:[{texto:"Trabalha na roça desde que casou, em 1988."}]}};
    const ax = (nome, texto) => ({id:"ax-" + nome, cliente_id:cr.id, origem:"dossie", nome:`Declaracao · ${nome}`, texto});
    const extra = [ax("Certidao de casamento (1988).pdf", "CERTIDÃO DE CASAMENTO\nContraentes: BENEDITO FICTO DOS SANTOS, lavrador, e APARECIDA FICTA DOS SANTOS, lavradora\nData do casamento: 21/05/1988"),
      ax("ITR 2009 a 2025 (marido).pdf", "RECEITA FEDERAL · DECLARAÇÃO DO ITR (DITR) · recibos de entrega dos exercícios 2009 a 2025"),
      ax("CCIR 2025.pdf", "INCRA · CCIR 2025 · número de módulos fiscais: 0,45 · classificação: minifúndio")];
    D.anexos = [...(D.anexos||[]), ...extra];
    const xr = reqCtxTeste({c:cr, op:"idade_rural", sx:"F", dn:"1969-03-12", g:{vinculos:[{tipo:"Empregado", origem:"SUPERMERCADO", inicio:"01/02/2012", fim:"30/11/2012", indicadores:[]}]}});
    o.rur = linhasRuraisPropostas(xr).map(l=>`${l.de}|${l.ate}|${l.det}`);
    o.rurMod = xr.v.rur_modulos;
    D.anexos = D.anexos.filter(a=>!extra.includes(a));
    // 17 · os papéis do dossiê no catálogo de documentos
    o.docRural = !!DOC_DOSSIE.find(x=>x.rx.test("escritura publica de imovel rural")).doc.test("declaracao · escritura do sitio (1998).pdf tabeliao");
    o.docUniao = DOC_DOSSIE.find(x=>x.rx.test("escritura publica de uniao estavel")).doc.test("escritura do sitio");
    return o;
  });

  conf("o afastamento do relatório traz o início, os dias e o fim", r.afast.afast && r.afast.afast.ini === "2026-09-25" && r.afast.afast.dias === 60 && r.afast.afast.fim === "2026-11-23", r.afast);
  conf("'em quimioterapia desde', com 'sem condições de trabalhar', é o início da incapacidade", r.desde.desde === "2026-07-10", r.desde);
  conf("a queda em casa: a data, fora do trabalho, consolidada e definitiva", r.casa.acid && r.casa.acid.iso === "2026-03-08" && r.casa.acid.casa && !r.casa.acid.trabalho && r.casa.perm && r.casa.consolidada, r.casa);
  conf("o afastamento 'de … a …' traz as duas datas", r.faixa.afast && r.faixa.afast.ini === "2026-09-28" && r.faixa.afast.fim === "2026-12-26" && r.faixa.acid && r.faixa.acid.trabalho, r.faixa);
  conf("a data do diagnóstico", r.diag.diag === "2026-03-12", r.diag);
  conf("o AVC é evento, não acidente", r.avc.evento === "2013-06-10" && !r.avc.acid && r.avc.perm, r.avc);
  conf("a deficiência congênita", r.cong.congenita === true, r.cong);
  conf("a certidão de óbito: a data e a causa", r.obito.obito === "2026-08-20" && /acidente de tr/i.test(r.obito.causa), r.obito);
  conf("a certidão da prisão: a data e o regime", r.prisao.prisao === "2026-08-25" && r.prisao.regime === "fechado", r.prisao);
  conf("a declaração do CDP: preventiva conta como fechado", r.cdp.prisao === "2026-06-10" && r.cdp.regime === "fechado", r.cdp);
  conf("a certidão de nascimento: a data e quem nasceu", r.nasc.nascimento === "2026-10-02" && /LAURA/.test(r.nasc.registrado), r.nasc);
  conf("a carteira de trabalho: dois contratos, com e sem saída", r.ctps.length === 2 && r.ctps[0].saida === "15/12/1989" && r.ctps[1].admissao === "05/03/1990" && !r.ctps[1].saida, r.ctps);
  conf("o CID entre parênteses do HC não vira lixo", r.hc === "G20),", r.hc);
  conf("o caixa-alta do HC vira frase, com o CID em maiúscula", r.frase === "Sequela de lesao dos tendoes CID: S66.1", r.frase);
  conf("pensão e BPC não mantêm a qualidade; o auxílio-doença mantém", r.mantem.join() === "true,true,false" && !r.gPensao && r.gAux, [r.mantem, r.gPensao, r.gAux]);
  conf("os oito serviços têm requisitos próprios", r.serv.every(n => n > 0), r.serv);
  conf("a CTC é opção própria e cai na família do CNIS, e a isenção de IR na da revisão", r.opCTC === "CTC" && r.famCTC === "cnis" && r.famIIR === "revisao", [r.opCTC, r.famCTC, r.famIIR]);
  conf("o relatório preenche a DII, o último dia trabalhado e o fim do afastamento, como presumidos", r.pre.dii === "2026-09-25" && r.pre.dat === "2026-09-24" && r.pre.dcb === "2026-11-23" && /inc_dii/.test(r.pre.usado), r.pre);
  conf("o prazo que corre, sozinho, dá 'Sim, e o prazo corre'", r.ver && r.ver.tom === "sim" && /prazo corre/.test(r.ver.txt), r.ver);
  conf("o BPC diz que se pede desde a data e se paga desde o pedido", /Pode pedir desde/.test(r.quando) && /a partir do pedido/.test(r.quando), r.quando);
  conf("na pensão, o filho de 4 anos tem 180 dias e o prazo aberto é vermelho", r.pz.est === "risco" && /180 dias/.test(r.pz.txt) && /Pedro/.test(r.pz.txt), r.pz);
  conf("a CTC: o emprego vai já, e o cargo no regime próprio é o destino", r.ctc.per.est === "ok" && /vai já: Empresa A/i.test(r.ctc.per.txt) && r.ctc.cargo === "ok", r.ctc);
  conf("o quadro Tempos nasce com o magistério pela RAIS e o especial pelo PPP", r.tempos === "magisterio,especial", r.tempos);
  conf("a PcD congênita sem grau tem o tempo em qualquer grau", r.pcd.est === "ok" && /qualquer grau/.test(r.pcd.txt), r.pcd);
  conf("a certidão de óbito traz o estado civil, o declarante e os filhos com a idade", r.ob2.civil === "solteiro" && /companheira/.test(r.ob2.declarante) && r.ob2.filhos.length === 1 && r.ob2.filhos[0].idade === 4, r.ob2);
  conf("a certidão de casamento traz os contraentes e a data", /MARLENE FICTA BARBOSA/.test(r.cas.contraentes) && r.cas.casamento === "1998-12-12" && !r.cas.divorcio, r.cas);
  conf("quem pede é a companheira (declarante), a união desde 2019 conta do fim do ano e o infarto não é acidente", r.dep.classe === "Companheiro(a)" && r.dep.uniao === "2019-12-31" && r.dep.acid === "Não", r.dep);
  conf("o filho da certidão de óbito tem os 180 dias e a pensão de 2 dependentes é 70 %", /Pedro \(4 anos\): até 16\/02\/2027/.test(r.dpz) && /70 %/.test(r.dval), [r.dpz, r.dval]);
  conf("o código do campo some do texto", r.cod === "informe a data do fato e o regime", r.cod);
  conf("a roça proposta começa no casamento de 1988, segue aberta e pula o emprego de 2012", r.rur.join(";") === "1988-01-01|2012-01-31|Segurado especial;2012-12-01||Segurado especial" && r.rurMod === "0.45", [r.rur, r.rurMod]);
  conf("a escritura do sítio no dossiê responde a escritura rural, não a de união estável", r.docRural && !r.docUniao, [r.docRural, r.docUniao]);

  conf("sem erro de página", !erros.length);
  if (erros.length) console.log(erros);
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
