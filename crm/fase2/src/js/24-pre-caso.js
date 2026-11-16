// F235 · o pedido do mesmo benefício negado, com o recurso ao CRPS ainda no prazo (contado da última atualização do pedido concluído)
const RE_RECURSO = {idade:/idade/i, transicao:/tempo de contribui/i, professor:/professor/i, b31:/incapacidade tempor|aux[íi]lio por incapacidade|aux[íi]lio[- ]doen|prorroga/i,
  b32:/incapacidade permanente|invalidez/i, acid:/acident/i};
function recursoDoBenef(x, re){
  if(!re) return null; const item = PRAZOS_CATALOGO.find(i=>i.id==="crps");
  for(const p of (x.fd.processos||[]).filter(p=>re.test(p.servico||"") && /^Conclu/i.test(p.status||"") && p.atualizado)){
    const c = (p.comunicacoes||[]).slice(-1)[0]; if(!c || !c.contra) continue;
    const fatal = contarPrazo(isoBr(p.atualizado), item); if(fatal && fatal >= x.hoje) return {p, c, fatal, der:isoBr(p.entrada||"")};
  }
  return null;
}
// F235 · o que derruba o motivo da negativa, com o que o dossiê já tem: o vínculo que a carteira juntada ao pedido prova e o INSS não
// contou (carência), e a qualidade que o seguro-desemprego estende (Lei 8.213, art. 15, § 2º)
function argumentoDoRecurso(x, rc){
  const mot = String(rc.c.motivo||""), out = [];
  if(/car[êe]ncia|contribui/i.test(mot)){
    const n0 = +((mot.match(/(\d+)\s*contribui[çc][õo]es/i)||[])[1]||0), ex = +((mot.match(/exigidas?\s*(\d+)/i)||[])[1]||0), anx = anexosDoPedido(rc.p).map(dsa), der = rc.der || x.der;
    const prov = ((x.g||{}).vinculos||[]).filter(v=>v.tipo!=="Benefício" && v.inicio && (v.indicadores||[]).some(i=>/^PEXT/.test(String(i))))
      .filter(v=>{ const w = (dsa(v.origem||"").match(/[a-z]{4,}/g)||[]).filter(w=>!/ltda|ficticia|ficticio/.test(w)); return w.length && anx.some(l=>w.every(p=>l.includes(p))); });
    const m = prov.reduce((n, v)=>{ const a = ymDe(isoBr(v.inicio)), b = ymDe(isoBr(v.fim||"") || der); return n + (a && b && a <= b ? mesesEntreYm(a, b) : 0); }, 0);
    if(n0 && m) out.push(`o INSS contou ${n0} contribuições; ${prov.map(v=>`${tituloOrgao(v.origem)} (${v.inicio}${v.fim ? ` a ${v.fim}` : ""})`).join(" e ")}, com ${m} meses, já estava no pedido, na carteira de trabalho juntada, e não foi contado: com ele são ${n0 + m}${ex ? `, e a lei exige ${ex}` : ""}`);
  }
  if(/qualidade de segurad/i.test(mot)){ const r = (REQ_BENEF.b31||[]).find(r=>r.id==="qualidade_na_dii"); let m = null; try{ m = r && r.mede(x); }catch(e){}
    const sd = (x.fd.seguros||[])[0], ps = sd ? (sd.parcelas||[]).map(p=>isoBr(p.pagamento||p.liberacao||"")).filter(Boolean).sort() : [];
    const mm = m && m.est==="ok" && String(m.txt).match(/DII (\d{2}\/\d{2}\/\d{4})[^,;]*?mantida até (\d{2}\/\d{2}\/\d{4})/);
    if(m && m.est==="ok") out.push(`${mm ? `na DII (${mm[1]}) a qualidade de segurado estava mantida até ${mm[2]}` : String(m.txt).replace(/^Sim\.\s*/, "")}${ps.length ? `, porque o seguro-desemprego (${plu(ps.length, "parcela", "parcelas")}, de ${fmtBarra(ps[0]).slice(3)} a ${fmtBarra(ps[ps.length-1]).slice(3)}) prova o desemprego e soma 12 meses à graça (Lei 8.213, art. 15, § 2º)` : ""}`); }
  return out.join("; ");
}
// F235 · com o mesmo benefício negado e o recurso no prazo, o caminho é o recurso, que paga desde o pedido; pedido novo perde esses meses
function vereditoDoRecurso(op, x, a, rc){
  const arg = argumentoDoRecurso(x, rc), aux = /^(b31|b32|acid)$/.test(op);
  const dib = aux ? (((a.rs.find(r=>r.id==="prazo_30_dias_dib")||{}).txt||"").match(/DIB na (?:DII|DER)[^(]*\((\d{2}\/\d{2}\/\d{4})\)/)||[])[1] : "";
  const desde = dib || (rc.der ? fmtBarra(rc.der) : "a data do pedido");
  return {tom:"sim", txt:`Já ${aux ? "pedido" : "pedida"} em ${fmtBarra(rc.der)} e ${aux ? "negado" : "negada"}${rc.c.motivo ? ` (${rc.c.motivo})` : ""}. O caminho é o recurso ao CRPS até ${fmtBarra(rc.fatal)} (${faltamTxt(rc.fatal)}): ganhando, paga desde ${desde}.${arg ? ` O motivo cai: ${arg}.` : ""} Pedido novo só se o advogado decidir, e paga só a partir dele.`,
    guia:"Recurso ao CRPS — Meu INSS (Apresentar Recurso Ordinário): é o recurso deste pedido, e não um pedido novo",
    desf:{acao:"caso", prazo:true, txt:`recorra até ${fmtBarra(rc.fatal)} (${faltamTxt(rc.fatal)}): ganhando, paga desde ${desde}; um pedido novo perderia esses meses`},
    agora:[`Recorrer ao CRPS até ${fmtBarra(rc.fatal)} (${faltamTxt(rc.fatal)}), pelo Meu INSS: ganhando, paga desde ${desde}.`, ...(arg ? [`O argumento, com o que o dossiê já tem: ${arg}.`] : []), "Pedido novo só se o advogado decidir: ele paga só a partir da nova data."]};
}

// ══════════════════════════════════════════════════════════════════════════
// F233 · O PRIMEIRO ATENDIMENTO EM QUADROS (docs/PRIMEIRO-ATENDIMENTO-QUADROS.md)
// ══════════════════════════════════════════════════════════════════════════
// A primeira leitura do dossiê, em quadros na ordem da conversa: CNIS, RAIS, CNPJs,
// pedidos, benefícios, saúde, PPP e CAT, CadÚnico, outros documentos e o que não veio.
// Cada quadro diz o que é o documento, o que encontramos, para que benefícios importa,
// e traz os itens com chave estável (do dado bruto, não do texto). Tudo vai à Análise
// de Direito, salvo o que se desmarcar (ad.fora, F231). Sem a lente da espécie: o
// quadro não muda quando o Mapa ou a Análise de Direito trocam de benefício.
// [id, título, o que é, importa para, fontes do dossiê que o quadro lê (nome "<fonte> · <arquivo>")]
const PA_Q = [
  // F235 · os papéis da roça e da pesca abrem a leitura quando existem: um item por papel, com a data, o titular e o que prova
  ["roca", "Papéis da roça e da pesca", "Os papéis que o cliente trouxe e que mostram o trabalho na roça ou na pesca: de quando são, em nome de quem estão e o que provam.",
    "aposentadoria rural e híbrida, salário-maternidade rural e seguro-defeso", null],
  ["cnis", "Situação no CNIS", "O CNIS é o cadastro do INSS: os vínculos, as contribuições e os benefícios da pessoa.",
    "todos os benefícios do INSS (qualidade de segurado, carência e tempo)", /^(Cadastro|CNIS|Declara)/i],
  // F616 · o cálculo do escritório no Prévius, conferido com o CNIS; só aparece com o Prévius anexado
  ["prev", "Prévius", "O cálculo do escritório no Prévius: tempo, carência, regras e RMI, conferido com o CNIS.",
    "aposentadorias (tempo, carência, regra e valor)", null],
  ["rais", "RAIS e CAGED: há afastamento sem remuneração?", "A RAIS é a declaração anual do empregador e o CAGED registra admissões e saídas; mostram o que o CNIS não mostra, como a licença sem remuneração.",
    "aposentadorias (tempo), qualidade de segurado (desemprego) e acerto de CNIS", /^CTPS/i],
  ["cnpj", "CNPJs no CPF", "A Redesim mostra as empresas em que o CPF é sócio, titular ou responsável.",
    "incapacidade (o CNPJ ativo pode ser lido como trabalho), segurado especial (rural), BPC, MEI, salário-maternidade (nos 120 dias não se trabalha no MEI) e qualidade de segurado", /^CNPJ/i],
  ["ped", "Pedidos ao INSS", "Os requerimentos, as decisões e os recursos, com o resultado de cada um.",
    "recurso ao CRPS, novo pedido e os prazos", /^(Processos|Recursos)/i],
  ["ben", "Benefícios: cartas e extratos", "As cartas de concessão e os extratos de pagamento dos benefícios que a pessoa recebe ou recebeu.",
    "revisão (decadência), acumulação e qualidade de segurado", /^(Cartas|Extrato)/i],
  ["saude", "Saúde: laudos e documentos médicos", "Os laudos da perícia do INSS e os exames, internações e relatórios do HC.",
    "incapacidade, auxílio-acidente, BPC da pessoa com deficiência, aposentadoria PcD e isenção de imposto de renda de quem é aposentado", /^(Laudos|HC )/i],
  ["esp", "PPP e CAT", "O PPP descreve a exposição a agentes nocivos; a CAT comunica o acidente de trabalho.",
    "aposentadoria especial, conversão de tempo e auxílio-acidente", /^(PPP|CAT)$/i],
  ["cad", "CadÚnico e Portal da Transparência", "O cadastro da família para os programas sociais, com a renda e os integrantes, e o que cada integrante recebe.",
    "BPC, facultativo de baixa renda, seguro-defeso (o cadastro é exigido), salário-maternidade (o bebê no cadastro) e, na roça, quem é o grupo familiar", /^(CadUnico|Transparencia)/i],
  ["docs", "Outros documentos", "O que o dossiê baixou e nenhum quadro acima lê.", "", null],
  ["falta", "Não encontrado no dossiê", "O que os portais disseram que não existe e o que faltou consultar.", "", null],
];
const PA_SEMPRE = new Set(["cnis", "rais", "cnpj", "falta"]);   // aparecem mesmo vazios, dizendo por quê
const PA_VISIVEIS = 5;   // itens à vista por quadro; o resto em "mostrar mais"
const chaveDocPA = a => "doc:" + (String(a.caminho||"").split("/").slice(2).join("/") || a.id);
const slugPA = t => String(t||"").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 48);
// F235 · concordância e tratamento: "1 mês", "2 meses"; "a senhora, segurada" pelo sexo do cadastro
const cidFmt = c => /^[A-Z]\d{3}$/.test(String(c||"")) ? `${c.slice(0,3)}.${c.slice(3)}` : (c || "");
const plu = (n, um, varios) => `${n} ${n===1 ? um : varios}`;
const anosMeses = (a, m) => [a ? plu(a, "ano", "anos") : "", m ? plu(m, "mês", "meses") : ""].filter(Boolean).join(" e ") || "nenhum mês";
const ehF = c => sexoDe(c)==="F";
const segurad = c => ehF(c) ? "segurada" : "segurado";
const tratDe = c => ehF(c) ? "a senhora" : "o senhor";
const cap1 = s => s ? s[0].toUpperCase() + s.slice(1) : s;
// o nome que o cliente conhece, pela espécie do INSS
const NOME_BEN = {"31":"Auxílio-doença", "91":"Auxílio-doença acidentário", "32":"Aposentadoria por invalidez", "92":"Aposentadoria por invalidez acidentária",
  "36":"Auxílio-acidente", "94":"Auxílio-acidente", "41":"Aposentadoria por idade", "42":"Aposentadoria por tempo de contribuição", "46":"Aposentadoria especial",
  "57":"Aposentadoria de professor", "21":"Pensão por morte", "93":"Pensão por morte acidentária", "25":"Auxílio-reclusão", "80":"Salário-maternidade",
  "87":"BPC da pessoa com deficiência", "88":"BPC do idoso"};
const nomeBenef = esp => NOME_BEN[String(esp||"").replace(/\D/g, "")] || (esp ? `Benefício ${esp}` : "Benefício");
// o último mês pago: o fim do último período que o CNIS conta (benefício não entra)
const ultimoMesPago = ct => { const p = ((ct||{}).periodos||[]).slice(-1)[0]; return p ? p[1].split("-").reverse().join("/") : ""; };
// os meses inteiros dentro das licenças sem remuneração da RAIS: sem salário, o INSS os desconta da carência
function mesesDeLicenca(lic){
  const meses = new Set();
  for(const l of lic||[]){ const a = isoBr(l.de), b = isoBr(l.ate); if(!a || !b) continue;
    for(let d = new Date(a.slice(0,7)+"-01T12:00:00"); d.toISOString().slice(0,10) <= b; d.setMonth(d.getMonth()+1)){
      const ini = d.toISOString().slice(0,10), fim = new Date(d.getFullYear(), d.getMonth()+1, 0, 12).toISOString().slice(0,10);
      if(ini >= a && fim <= b) meses.add(ini.slice(0,7)); } }
  return meses;
}
// o que pedir ao cliente para cada pendência comum do CNIS, com o vínculo nomeado
const PEDIR_IND = {
  "PEXT": onde => `O vínculo ${onde || "marcado"} entrou no CNIS fora do prazo e só conta depois de provado. Peça a carteira de trabalho (contrato e saída), a rescisão e os holerites desse período`,
  "PREM-EXT": onde => `Há salário lançado fora do prazo ${onde || "no CNIS"}: só conta depois de provado. Peça os holerites desses meses`,
  "PADM-EMPR": onde => `A data de admissão do vínculo ${onde || "marcado"} não bate com o período em que a empresa funcionou. Peça a carteira de trabalho (a página do contrato) e a rescisão`,
};
// F235 · o IEAN no quadro do CNIS: não é erro do cadastro, é a exposição informada pelo empregador (sinal de tempo especial)
PEDIR_IND.IEAN = onde => `O empregador informou ao INSS exposição a agente que faz mal à saúde ${onde || "no vínculo"}: não é erro do cadastro; indica tempo especial, que vale mais na aposentadoria, e a prova é o PPP de todo o período`;
// F235 · os ajustes do catálogo de cada espécie à leitura do CNIS e aos cartões da escolha: cada função recebe o quadro (ou os
// cartões) já montado e o dado bruto, e mexe só no que é da sua espécie
const PA_CNIS_AJUSTE = [], PA_TRAB_AJUSTE = [];
// ── aposentadorias, CTC e GPS ──
const _paMeses = v => { const a = ymDe(isoBr(v.inicio||"")), b = ymDe(isoBr(v.fim||"") || isoBr(fimDoMes(v.ultRemun||"")) || hoje()); return a && b && a <= b ? mesesEntreYm(a, b) : 0; };
const _paFaixa = v => `${String(v.inicio||"").slice(3)} a ${v.fim ? String(v.fim).slice(3) : (v.ultRemun || "hoje")}`;
const _paIdadeTxt = n => n % 1 ? `${Math.floor(n)} anos e 6 meses` : `${n} anos`;
const _magCboDe = c => _magCbo({fd: fontesDoDossie(c.id)}).length > 0;
PA_CNIS_AJUSTE.push((c, q, {g, gr, ct, an, Q}) => {
  if(!g) return;
  const vs = (g.vinculos||[]).filter(v=>v.tipo!=="Benefício"), comInd = re => vs.filter(v=>(v.indicadores||[]).some(i=>re.test(String(i))));
  const item = k => q.itens.find(x=>x.k===k), sv = servicoDoPreCaso(c), n = ct ? ct.carencia : 0, F = ehF(c);
  // o cargo no regime próprio: é o destino da certidão, e não ponto a acertar
  const prpps = comInd(/^PRPPS/), servidor = prpps.some(v=>!v.fim), iP = item("cnis.ind:PRPPS");
  if(iP && prpps.length){ iP.est = "info"; iP.txt = `Cargo público no regime próprio (${prpps.map(v=>`${tituloOrgao(v.origem||"")}, desde ${v.inicio}`).join("; ")}): não conta no INSS e não se acerta; é para onde vai o tempo da certidão (CTC). Nada a corrigir`; }
  // o carnê de 11 %: vale para a aposentadoria por idade; para a por tempo e para a certidão, só com a diferença até 20 %
  const lc = comInd(/LC123/), nLc = lc.reduce((s, v)=>s + _paMeses(v), 0);
  // F235 · com CNPJ de MEI ativo, o recolhimento reduzido é o DAS de 5 %, e não o carnê de 11 %
  const mei = (fontesDoDossie(c.id).cnpjs||[]).some(e=>/^ATIVA$/i.test(e.situacao||"") && /empres[áa]rio|\bmei\b/i.test(`${e.qualificacao||""} ${e.vinculo||""}`)) || vs.some(v=>(v.indicadores||[]).some(i=>/IREC-MEI/.test(String(i))));
  for(const k of ["IREC-LC123", "PREC-LC123"]){ const it = item(`cnis.ind:${k}`); if(!it || !lc.length) continue;
    it.est = "warn"; it.txt = `${mei ? "DAS do MEI (5 %)" : "Carnê de 11 % (plano simplificado)"}, ${lc.map(_paFaixa).join(" e ")}, ${plu(nLc, "mês", "meses")}: vale para a aposentadoria por idade; para a aposentadoria por tempo de contribuição e para a certidão (CTC), só conta pagando a diferença até 20 %`; }
  // o carnê de 5 % sem validação (CadÚnico vencido)
  const fbr = comInd(/^PREC-FBR/), nF = fbr.reduce((s, v)=>s + _paMeses(v), 0), iF = item("cnis.ind:PREC-FBR");
  if(iF && nF){ iF.est = "warn"; iF.txt = `${plu(nF, "mês", "meses")} de carnê de 5 % (${fbr.map(_paFaixa).join(" e ")}) sem validação: o CadÚnico estava vencido, e o INSS não os conta; só contam pagando a diferença (IN 128, art. 103, V)`; }
  // o mês abaixo do mínimo: a pendência é só nos meses marcados, e não no período inteiro
  const ab = (an && an.abaixo) || [], iM = item("cnis.ind:PREC-MENOR-MIN");
  if(iM && ab.length){ iM.est = "info"; iM.txt = `Pendência só nos meses pagos abaixo do mínimo (${ab.map(a=>a.comp).join(", ")}), e não no período inteiro`; }
  // a carência que vale hoje e o tempo da aposentadoria por tempo sem o carnê de 11 %
  const iC = item("cnis.car");
  if(iC && ct){
    if(nF) iC.txt += `. Valem hoje ${n - nF}: ${nF} são de 5 % sem validação; com a diferença, ${n}${n < 180 ? ` (faltam ${180 - n})` : ""}; sem ela, ${n - nF < 180 ? `faltam ${180 - n + nF}` : "as 180 continuam cumpridas"}`;
    // na certidão, o que vai já (sem o carnê reduzido e sem o tempo junto do cargo); fora dela, o tempo da aposentadoria por tempo
    const tm = ct.anos*12 + ct.meses - nLc, ja = sv==="CTC" ? _paCtcJa(g) : 0;
    if(sv==="CTC") iC.txt += `. Para a certidão, vão já ${anosMeses(Math.floor(ja/12), ja%12)}: o carnê de 11 % só vai com a diferença, e o tempo junto do cargo não vai`;
    else if(nLc && tm > 0) iC.txt += `. Para a aposentadoria por tempo de contribuição e para a certidão, sem os ${nLc} meses de carnê de 11 %: ${anosMeses(Math.floor(tm/12), tm%12)}`;
    if(nF && q.blocos[1]) q.blocos[1][1] = `${plu(n - nF, "mês", "meses")} hoje; mais ${nF} de 5 % a validar`;
  }
  // a qualidade: o que ela muda (e o que não muda) para a aposentadoria por idade, para o carnê atrasado e para a certidão
  const iQ = item("cnis.qual"), id = idadeDe(c.dn), perto = id!=null && id >= (F ? 58 : 63);
  const ultCi = vs.filter(v=>/individual|facultativ/i.test(v.tipo||"")).pop(), atr = iQ && /Até essa data pode pagar os meses atrasados/.test(iQ.txt);
  let qual = null;   // a frase nova do resumo
  if(gr && !gr.semLimite && iQ){
    if(servidor && sv==="CTC"){ iQ.est = "info"; iQ.txt += ". Para a certidão isso não importa: ela leva as contribuições já feitas"; if(q.blocos[0]) q.blocos[0][2] = "info";
      qual = `${tratDe(c)} é ${F ? "servidora" : "servidor"} no regime próprio desde ${prpps.map(v=>v.inicio).sort()[0]}: as contribuições ao INSS continuam valendo e podem ir para lá pela certidão; a qualidade de ${segurad(c)} do INSS não conta para a certidão`; }
    else if(gr.vencida){
      if(n - nF >= 180 && perto){ iQ.est = "info"; if(q.blocos[0]) q.blocos[0][2] = "info";
        iQ.txt += ". Para a aposentadoria por idade isso não importa: com 180 meses pagos, a perda não conta (Lei 10.666/2003, art. 3º, § 1º)";
        qual = `${tratDe(c)} parou de pagar em ${gr.ultima} e deixou de estar ${F ? "coberta" : "coberto"} pelo INSS em ${fmtBarra(gr.perda)}, mas isso não tira a aposentadoria por idade: com 180 meses pagos, a perda não conta (Lei 10.666/2003, art. 3º, § 1º)`; }
      else if(gr.facultativo && perto){
        // sem os meses de 5 % sem validação, a perda vem antes: a graça de 6 meses do facultativo, contada do último mês que vale
        const fi = nF ? ymDe(isoBr(fbr[0].inicio||"")) : "", pre = fi ? ymDe(somarMeses(fi+"-01", -1)) : "", ps = (ct||{}).periodos||[];
        const ult = !fi ? null : ps.some(([a, b])=>a <= pre && pre <= b) ? pre : ps.map(p=>p[1]).filter(m=>m < fi).sort().pop() || null;
        const perdaSem = ult ? diaSeguinte(proxDiaUtil(`${ymDe(somarMeses(ult+"-01", 8))}-15`)) : null;
        iQ.txt += `. O que já pagou continua valendo, e a aposentadoria por idade não depende da qualidade quando chegar às 180 contribuições (Lei 10.666/2003, art. 3º, § 1º); mas os meses sem pagar desde ${competenciaMais(gr.ultima, 1)} não podem mais ser pagos. A guia vence no dia 15 e, sem expediente bancário, no dia útil seguinte (Lei 8.212, art. 30, § 2º, I)${perdaSem ? `. Sem os ${nF} meses de 5 %, o INSS conta a perda desde ${fmtBarra(perdaSem)}` : ""}`;
        qual = `${tratDe(c)} ficou sem a cobertura do INSS em ${fmtBarra(gr.perda)}: o que já pagou continua valendo, e a aposentadoria por idade não depende disso; mas os meses sem pagar desde ${competenciaMais(gr.ultima, 1)} não podem mais ser pagos`; }
    } else if(atr){ iQ.est = "crit"; iQ.txt = iQ.txt.replace(/, mesmo sem pagar/, "").replace(/depois, a facultativa não paga mais o atraso/, "depois, não pode mais");
      qual = `${tratDe(c)} continua ${segurad(c)} do INSS até ${fmtBarra(gr.mantidaAte)}, e até essa data pode pagar os meses atrasados; depois, não pode mais`; }
    else if(n < 180 && perto && ultCi && chaveComp(gr.ultima||"") >= ymDe(somarMeses(hoje(), -1))){
      iQ.txt = iQ.txt.replace(/, mesmo sem pagar/, "") + `. Para se aposentar, continue pagando o carnê todo mês, até o dia 15 do mês seguinte: faltam ${180 - n} contribuições, e cada mês sem pagar adia a aposentadoria`;
      qual = `${tratDe(c)} continua ${segurad(c)} do INSS até ${fmtBarra(gr.mantidaAte)}; para se aposentar, precisa continuar pagando o carnê todo mês (faltam ${180 - n} contribuições)`; }
  }
  // o resumo: a frase da qualidade, o tempo que vale e os pontos a conferir recontados
  if(q.achado){
    if(qual) q.achado = q.achado.replace(new RegExp(`${cap1(tratDe(c))} (perdeu a qualidade|continua ${segurad(c)})[^.]*`), cap1(qual));
    if(nF) q.achado = q.achado.replace(/(\d+) meses de contribuição \(([^)]*)\)/, (m0, a, b)=>`${a} meses de contribuição (${b}), mas valem hoje ${n - nF}: ${nF} são de 5 % sem validação`);
    const tm = ct ? ct.anos*12 + ct.meses - nLc : 0, ja = sv==="CTC" ? _paCtcJa(g) : 0;
    if(sv==="CTC") q.achado = q.achado.replace(/(\d+ meses de contribuição \([^)]*\))/, `$1; para a certidão, vão já ${anosMeses(Math.floor(ja/12), ja%12)}`);
    else if(nLc && tm > 0) q.achado = q.achado.replace(/(\d+ meses de contribuição \([^)]*\))/, `$1; para a aposentadoria por tempo e para a certidão, ${anosMeses(Math.floor(tm/12), tm%12)}, porque o ${mei ? "DAS do MEI (5 %)" : "carnê de 11 %"} só conta com a diferença`);
    const np = q.itens.filter(x=>x.k!=="cnis.qual" && (x.est==="warn"||x.est==="crit")).length;
    q.achado = q.achado.replace(/\.?\s*\d+ pontos? no cadastro do INSS para conferir/, "") + (np ? `. ${cap1(plu(np, "ponto", "pontos"))} no cadastro do INSS para conferir` : "");
  }
  // a certidão: o que vai, o que só vai complementado e o que não vai, já no quadro do CNIS
  if(sv==="CTC"){ q.importa = `${q.importa} e a certidão de tempo para o regime próprio (CTC)`;
    let r = null; try{ r = (requisitosDe(c, D.casosDoCliente.get(c.id)||[], "CTC").rs||[]).find(x=>x.id==="ctc_periodos"); }catch(e){}
    if(r && r.txt) q.itens.unshift({k:"cnis.ctc", txt:`Para a certidão: ${r.txt.replace(/^./, s=>s.toLowerCase())}`, est: r.est==="ok" ? "ok" : "warn", fonte:"CNIS", anexo:null, acao:null}); }
  // o CadÚnico vencido explica o 5 % sem validação: atualizar serve para voltar a pagar 5 %
  const iA = Q && Q.cad && Q.cad.itens.find(x=>x.k==="cad.atualizacao"), fz = familiaCadunico(c);
  if(iA && nF && /passou de 24 meses/.test(iA.txt)) iA.txt = iA.txt.replace(/: passou de 24 meses, precisa atualizar antes do pedido/, `: passou de 24 meses, e por isso os ${nF} meses de carnê de 5 % não foram validados. Atualizar no CRAS serve para voltar a pagar 5 %${fz && fz.renda_total!=null ? `; a renda da família (${moeda(fz.renda_total)}) parece caber no limite do facultativo de baixa renda (conferir)` : ""}`);
  // o professor: as idades da aposentadoria do professor, menores que a da aposentadoria por idade
  const iI = item("cnis.idade");
  if(iI && id!=null && _magCboDe(c)){ const ano = anoDe(hoje());
    iI.txt += `; a aposentadoria do professor pede menos: em ${ano}, ${_paIdadeTxt(idadeProgExig(ano, F ? "F" : "M", true))} na idade mínima ou ${F ? 52 : 55} anos no pedágio de 100 %, com ${F ? 25 : 30} anos de magistério (a RAIS mostra ocupação de professor; veja a Análise de Direito)`; }
});
// os cartões não podem chamar os requisitos (reqCtx lê o paDados que ainda se monta): a conta sai do CNIS lido
const _paIni = ct => { const ult = ((ct||{}).periodos||[]).map(p=>p[1]).sort().pop(); return ult && ult < ymDe(hoje()) ? ymDe(hoje()) : ymDe(somarMeses(hoje(), 1)); };
const _paComp = (ct, falta) => ymDe(somarMeses(_paIni(ct)+"-01", Math.max(0, falta - 1))).split("-").reverse().join("/");
// a certidão: os meses que vão já (sem pendência, sem carnê reduzido, antes da posse)
const _paCtcJa = g => { const vs = (g.vinculos||[]).filter(v=>v.tipo!=="Benefício" && v.inicio);
  const posse = vs.filter(v=>(v.indicadores||[]).some(i=>/^PRPPS/.test(String(i)))).map(v=>isoBr(v.inicio)).sort()[0]; let n = 0;
  for(const v of vs){ if((v.indicadores||[]).some(i=>/^PRPPS|^PEXT|^PADM|LC123|MEI|FBR/.test(String(i)))) continue;
    const de = isoBr(v.inicio), fim = isoBr(v.fim||"") || (v.ultRemun ? isoBr(fimDoMes(v.ultRemun)) : hoje()), ate = posse && fim >= posse ? diaAnterior(posse) : fim;
    if(!posse || de < posse) n += mesesEntreYm(ymDe(de), ymDe(ate)); }
  return n; };
// a regularização: os atrasados que ainda se podem pagar (facultativo na graça) e os meses de 5 % sem validação
const _paGps = (g, gr) => { const fac = gr && gr.facultativo && !gr.vencida && gr.mantidaAte && /^\d{2}\/\d{4}$/.test(gr.ultima||"");
  const atr = []; if(fac){ let k = ymDe(somarMeses(`${chaveComp(gr.ultima)}-01`, 1)); const lim = ymDe(somarMeses(hoje(), -1));
    for(let n = 0; k <= lim && n < 60; n++, k = ymDe(somarMeses(k+"-01", 1))) atr.push(k.split("-").reverse().join("/")); }
  const fbr = (g.vinculos||[]).filter(v=>(v.indicadores||[]).some(i=>/^PREC-FBR/.test(String(i)))).reduce((s, v)=>s + _paMeses(v), 0);
  return {atr, fbr}; };
PA_TRAB_AJUSTE.push((c, ks, ts, {g, an, ct, gr}) => {
  if(!g) return;
  const sv = servicoDoPreCaso(c), ab = ((an||{}).abaixo||[]).filter(a=>chaveComp(a.comp) >= "2019-11"), n = ct ? ct.carencia : 0;
  const pend = (g.indicadores||[]).filter(i=>tipoIndicador(i.codigo)==="P" && !/^PRPPS/.test(i.codigo)), gp = _paGps(g, gr);
  const faixa = l => l.length===1 ? l[0] : `${l[0]} a ${l[l.length-1]}`;
  for(const t of ts){
    if(t.f.chave==="tempo"){
      // o mês abaixo do mínimo: com o CNIS (PDF) lido e nenhum depois de 11/2019, não falta (a Análise de Direito diz "em ordem")
      const i = t.falta.indexOf(PA_FALTA_TXT.apo_minimo);
      if(i >= 0){ if(an && !ab.length) t.falta.splice(i, 1); else if(ab.length) t.falta[i] = `os meses pagos abaixo do mínimo (${ab.map(a=>a.comp).join(", ")})`; }
      // a carência do cartão pela conta do motor: a 180ª com o mínimo do ano completado, o vínculo com pendência à parte e, na
      // regularização, com os atrasados que ainda se podem pagar e a diferença do 5 %
      const fx = ((t.forte||{}).fatos||[])[0];
      if(sv!=="CTC" && fx && /^Carência pelo CNIS/.test(fx.texto||"") && ct && n < 180){
        const pext = (g.vinculos||[]).filter(v=>v.tipo!=="Benefício" && (v.indicadores||[]).some(i=>/^PEXT/.test(String(i)))).reduce((s, v)=>s + _paMeses(v), 0);
        const abA = ab.filter(a=>+String(a.comp).slice(-4)===anoDe(hoje())).length, atr = sv==="GPS" ? gp.atr.length : 0;
        t.forte = {fatos:[{...fx, texto:`Carência: ${n} de 180${pext ? `, ${pext} só contam provadas` : ""}${gp.fbr ? `, ${gp.fbr} de 5 % só contam com a diferença` : ""}; a 180ª em ${_paComp(ct, 180 - n - abA - atr)}${atr ? ` pagando os ${atr} atrasados` : ""}, e em dia${abA ? ", completando o mínimo" : ""}${atr ? `; sem eles, ${_paComp(ct, 180 - n)}` : ""}`}]}; }
      if(_magCboDe(c)) t.falta = ["as escolas, os níveis e as funções de professor: a RAIS mostra ocupação de professor, e a aposentadoria do professor pede idade menor", ...t.falta.filter(x=>x!==PA_FALTA_TXT.apo_reciproca)];
      if(sv==="CTC"){ const ja = _paCtcJa(g);
        t.forte = {fatos:[{texto:`Hoje ${n} contribuições; levando o que vai já na certidão (${ja} meses), ficam cerca de ${Math.max(0, n - ja)} no INSS`}]};
        t.selo = "info"; t.est = "info"; t.impedido = null;
        t.falta = ["decidir com o advogado o que levar na certidão: o tempo que for para o regime próprio deixa de contar aqui, e a aposentadoria do INSS fica só com o que não for"]; }
      else if(t.selo==="warn" && !t.falta.some(x=>x!==PA_FALTA_TXT.apo_reciproca) && !t.ramos.some(r=>r.id!=="apo_minimo" && r.id!=="apo_reciproca" && /^(warn|crit)$/.test(r.est))){ t.selo = "ok"; t.est = "ok"; }
    }
    if(t.f.chave==="cnis"){ t.impedido = null;
      // o serviço do pré-caso fala pelo que ele decide: a certidão pelo que vai já, a regularização pelo prazo do atrasado
      if(sv==="CTC"){ const ja = _paCtcJa(g), orgao = (admDe(c).valores||{}).ctc_orgao;
        t.forte = {fatos:[{texto:`Pode pedir já a certidão, com ${anosMeses(Math.floor(ja/12), ja%12)} que vão sem acerto`}]};
        t.falta = orgao ? [] : ["para qual órgão vai a certidão, e para quê"]; t.selo = orgao ? "ok" : "warn"; t.est = t.selo; }
      else if(sv==="GPS"){
        if(gp.atr.length){ t.forte = {fatos:[{texto:`Pode pagar ${faixa(gp.atr)} até ${fmtBarra(gr.mantidaAte)}; depois, não pode mais`}]}; t.selo = "crit"; t.est = "crit"; t.prazo = null; t.falta = []; }
        else if(gr && gr.vencida && gr.facultativo){ t.forte = {fatos:[{texto:`Não pode pagar o atrasado (sem cobertura desde ${fmtBarra(gr.perda)})${gp.fbr ? `; pode pagar a diferença dos ${gp.fbr} meses de 5 %` : ""} e voltar a pagar em dia`}]};
          t.selo = "warn"; t.est = "warn"; t.falta = gp.fbr ? ["o CadÚnico atualizado no CRAS, para voltar a pagar 5 %"] : []; }
        else { t.selo = "ok"; t.est = "ok"; t.falta = []; } }
      else if(!pend.length){ const i = t.falta.indexOf(PA_FALTA_TXT.cni_anexo); if(i >= 0) t.falta.splice(i, 1);
        if((g.indicadores||[]).some(i=>/LC123/.test(i.codigo))) t.falta.unshift("complementar o carnê de 11 % até 20 %, só para a aposentadoria por tempo ou a certidão: não é erro do CNIS e não se corrige por formulário"); }
    }
  }
});
function quadrosDoPA(c, ks){ return memoPA("q", c, ks, ()=>quadrosDoPACalc(c, ks)); }
function quadrosDoPACalc(c, ks){
  const fd = fontesDoDossie(c.id), g = cnisDe(c), an = g && g.analise, ct = an && an.contagem, dz = c.dossie || {};
  const gr = g && (g.vinculos||[]).length ? calcularGraca(g.vinculos, contribSemPerda(g), !!(triagemDe(c).graca||{}).desempregado, an && an.abaixo, ct && ct.periodos, fd.seguros) : null;
  const fatos = fatosDoMapa(c, ks, null), ids = itensDoDossie(c, ks);
  const Q = Object.fromEntries(PA_Q.map(([id, rot, oque, importa, re])=>[id, {id, rot, oque, importa, re, achado:"", vazio:"", blocos:[], itens:[], docs:[], extra:""}]));
  const it = (q, k, txt, est, fonte, anexo, acao) => Q[q].itens.push({k, txt, est: est||"info", fonte: fonte||"", anexo: anexo||null, acao: acao||null});
  // 1 · CNIS
  const bens = beneficiosDoCnis(g).sort((a, b)=>(b.de||"").localeCompare(a.de||""));
  const ultBen = bens[0], ap = (aposDoCliente(c)||[]).filter(a=>a.data).sort((a, b)=>a.data < b.data ? -1 : 1)[0], idade = idadeDe(c.dn);
  const lic = licencasDaRais(fd.rais), ult = ultimoMesPago(ct), idMin = IDADE_APOS[ehF(c) ? "F" : "M"];
  const semLic = ct ? [...mesesDeLicenca(lic)].filter(k=>(ct.periodos||[]).some(([a, b])=>k>=a && k<=b)).length : 0;
  const fimBen = b => /^(31|91)$/.test(b.especie) ? "cortado" : "encerrado";
  const benTxt = b => b.ativo ? `recebendo desde ${fmtBarra(b.de)}` : b.ate ? `${fimBen(b)} em ${fmtBarra(b.ate)}` : "sem data de fim no CNIS";
  const rural = papeisRurais(c.id).length > 0, idRur = ehF(c) ? 55 : 60, dnC = dnIso(c.dn);
  const certs = certidoesDoDossie(c.id), dep = certs.find(ce=>ce.obito || ce.prisao);
  // F235 · na roça de agora vale a idade rural, com a data em que se completou; na roça antiga (a da híbrida), a urbana
  const atual = rural && rocaAtual(c), dRur = dnC ? dataDaIdade(dnC, idRur) : null, dMin = dnC ? dataDaIdade(dnC, idMin) : null;
  const idadeTxt = atual && idade!=null ? `${idade >= idRur ? `já tem a idade da aposentadoria rural (${idRur}) desde ${fmtBarra(dRur)}` : `faz ${idRur} (a idade da aposentadoria rural) em ${fmtBarra(dRur)}`}; a urbana pede ${idMin}${dMin ? ` (${dMin <= hoje() ? "desde" : "em"} ${fmtBarra(dMin)})` : ""}`
    : rural && idade!=null && dMin ? `${idade >= idMin ? `já tem a idade da aposentadoria por idade (${idMin}) desde ${fmtBarra(dMin)}` : `faz ${idMin} (a idade da aposentadoria por idade) em ${fmtBarra(dMin)}`}, que é também a da híbrida (a roça antiga soma com a cidade)`
    : ap && !ap.automatica ? `aposentadoria prevista para ${fmtBarra(ap.data)} em Aposentadorias futuras`
    : ap ? `faz ${idMin} (a idade mínima da aposentadoria por idade) em ${fmtBarra(ap.data)}` : idade!=null && idade >= idMin ? `já tem a idade mínima da aposentadoria por idade (${idMin})` : "";
  const cAc = contagemComAcerto(c, g, ct);
  if(g){
    Q.cnis.blocos = [
      // F235 · na roça de agora a qualidade vem da atividade; na pensão e na reclusão conta a de quem morreu ou está preso: nenhuma das duas perdas é vermelha
      ["Qualidade de segurado", (!gr || (gr.vencida && !gr.semLimite)) && atual ? "pela atividade na roça" : !gr ? "—" : gr.semLimite ? "sem limite" : `${gr.vencida ? "perdida em" : "até"} ${fmtBarra(gr.vencida ? gr.perda : gr.mantidaAte)}`, (!gr || gr.vencida) && atual ? "info" : !gr ? "pend" : gr.vencida ? (rural || dep ? "info" : "crit") : "ok"],
      // F235 · com pendência PEXT ou contrato da carteira fora do CNIS, o número de hoje e o do acerto (antes somava o que o INSS não conta)
      ["Carência (meses de contribuição)", ct ? (cAc ? `${cAc.hoje} hoje; ${cAc.com} com o acerto` : `${plu(ct.carencia, "mês", "meses")}${semLic ? `; ${ct.carencia - semLic} sem a licença da RAIS` : ""}`) : "—", ct ? "info" : "pend"],
      ["Tempo pelo CNIS", ct ? anosMeses(ct.anos, ct.meses) : "—", "info"],
      ["Último mês pago", ult || "nenhum no CNIS", "info"],
      [ultBen ? nomeBenef(ultBen.especie) : "Benefício", ultBen ? benTxt(ultBen) : "nenhum no CNIS", ultBen && ultBen.ativo ? "ok" : "info"],
      ["Idade", idade!=null ? `${idade} anos${atual && dRur ? ` · ${idade >= idRur ? `idade rural (${idRur}) desde` : `faz ${idRur} (rural) em`} ${fmtBarra(dRur)}` : rural && dMin && idade >= idMin ? ` · idade da híbrida (${idMin}) desde ${fmtBarra(dMin)}` : ap && !ap.automatica ? ` · prevista ${fmtBarra(ap.data)}` : ap ? ` · faz ${idMin} em ${fmtBarra(ap.data)}` : ""}` : "—", "info"],
    ];
    const deQue = gr && ultBen && !ultBen.ativo && ultBen.ate && gr.ultima===`${ultBen.ate.slice(5,7)}/${ultBen.ate.slice(0,4)}`
      ? `do fim do ${nomeBenef(ultBen.especie).toLowerCase()} (${gr.ultima})` : gr ? `do último mês pago (${gr.ultima})` : "";
    // F235 · o que o CNIS da pessoa decide (e o que não decide)
    for(const k of ctpsForaDoCnis(c)){ const de = isoBr(k.admissao), ate = isoBr(k.saida||"") || "", ms = ate ? mesesEntreYm(ymDe(de), ymDe(ate)) : null;
      it("cnis", `cnis.ctps:${dsa(k.empregador)}|${k.admissao}`, `Vínculo da carteira de trabalho que não está no CNIS: ${tituloOrgao(k.empregador)}, de ${k.admissao}${k.saida ? ` a ${k.saida}` : ""}${ms ? ` (${plu(ms, "mês", "meses")})` : ""}. Pedir a inclusão com a carteira e a rescisão (RAC Vínculos, Anexo I-B)`, "warn", "CTPS do cliente", k.anexo.id); }
    // F235 · os papéis da época trazidos (o holerite com a admissão, o aviso de dispensa com o fim) de um emprego que o CNIS não tem
    for(const p of empregosDosPapeis(c.id)) it("cnis", `cnis.papeis:${slugPA(p.onde)}|${p.de}`, `Papéis da época trazidos (${p.docs}): marcam o começo e o fim de um emprego que não está no CNIS, ${p.onde}, de ${fmtBarra(p.de)} a ${fmtBarra(p.ate)} (${plu(p.meses, "mês", "meses")}). São o início de prova da justificação administrativa (IN 128, art. 571, III): provados por testemunhas, esses meses contam`, "warn", "papéis trazidos", (p.anexos[0]||{}).id);
    // F235 · quem morreu ou está preso, pelo papel que a pessoa trouxe; o CNIS daqui é o de quem pede e decide pouco
    if(dep){ const quem = (String((dep.anexo||{}).texto||"").match(/(?:Nome:\s*|Certifico que |Declaramos[^.]*?que )([A-ZÀ-Ý][A-ZÀ-Ý ]{3,80}?)(?:,|\n|\s+CPF)/)||[])[1];
      const cas = certs.find(ce=>ce.casamento && !ce.divorcio), qn = quem ? tituloOrgao(quem.trim()) : "o segurado";
      Q.cnis.importa = `os benefícios da própria pessoa; ${dep.obito ? "na pensão por morte" : "no auxílio-reclusão"} conta o CNIS de quem ${dep.obito ? "morreu" : "está preso"}, que o INSS consulta no pedido`;
      it("cnis", "cnis.dep", `${dep.obito ? `Quem morreu: ${qn}, em ${fmtBarra(dep.obito)}${dep.causa ? ` (${dep.causa.toLowerCase()})` : ""}` : `Quem está preso: ${qn}, desde ${fmtBarra(dep.prisao)}${dep.regime ? `, regime ${dep.regime}` : ""}`}${cas ? `; casamento em ${fmtBarra(cas.casamento)}` : ""}. Este é o CNIS de quem pede. ${dep.obito ? "Na pensão por morte contam a qualidade e as contribuições de quem morreu" : "No auxílio-reclusão contam a qualidade e as contribuições de quem está preso"}, que não vêm neste dossiê: pergunte o último emprego e se recebia seguro-desemprego${dep.prisao ? "; o salário de quem pede não entra na conta da baixa renda: conta só o que o preso ganhava nos 12 meses antes da prisão (Lei 8.213, art. 80, § 4º)" : ""}`, "info", cap1(dep.rot), dep.anexo.id); }
    // F235 · a perda pela cidade, para quem trabalha na roça, fica dita uma vez, no item da qualidade (cnis.qual)
    const atrasF = !gr || gr.vencida || gr.semLimite ? [] : (()=>{ const fac = (g.vinculos||[]).filter(v=>/facultativ/i.test(v.tipo||"")).length; if(!fac || !/^\d{2}\/\d{4}$/.test(gr.ultima||"")) return [];
      const out = []; let k = somarMeses(`${chaveComp(gr.ultima)}-01`, 1).slice(0,7); const lim = somarMeses(`${hoje().slice(0,7)}-01`, -1).slice(0,7);
      for(let n = 0; k <= lim && n < 60; n++){ out.push(k.split("-").reverse().join("/")); k = somarMeses(`${k}-01`, 1).slice(0,7); } return out; })();
    // F235 · a perda pode não ter acontecido: o desemprego registrado (SINE ou seguro-desemprego dentro da graça) soma 12 meses,
    // também ao contribuinte individual (IN 128, art. 184, §§ 5º e 10); o botão soma na conta da graça
    // F235 · a pergunta do desemprego só onde a qualidade decide: incapacidade, auxílio-acidente e maternidade (na aposentadoria e na CTC, não)
    const qualDecide = opcoesSel(c).some(o=>/^(b31|b32|acid|REST|b94|b36|urb)$/.test(o.o)) || beneficiosDoCnis(g).some(b=>/^(31|32|91|92)$/.test(String(b.especie)))
      || (fontesDoDossie(c.id).laudos||[]).length > 0 || linhaClinica(c.id).length > 0;
    const desempPA = qualDecide && gr && gr.vencida && !gr.semLimite && !gr.desempregado && !gr.facultativo && !rural && !dep && gr.ultima && gr.base
      ? {txt:`. Pergunte: depois de ${gr.ultima}, parou de trabalhar e se cadastrou no SINE ou recebeu seguro-desemprego até ${fmtBarra(gr.mantidaAte)}? Se sim, a cobertura vai até ${fmtBarra(perdaDaQualidade(competenciaMais(gr.ultima, gr.base + 12)).mantidaAte)} (IN 128, art. 184, §§ 5º e 10)${dz.mte ? "" : "; o Emprega Brasil não foi consultado: rode-o antes de concluir"}`,
        acao:{rot:"Teve desemprego registrado: somar 12 meses", js:`marcarDesemprego('${c.id}',true)`}} : null;
    if(gr) it("cnis", "cnis.qual", gr.semLimite ? (gr.especial ? `Continua ${segurad(c)} especial enquanto trabalhar na roça ou na pesca: o CNIS tem o período em aberto` : `Continua ${segurad(c)} enquanto receber o benefício em manutenção`)
      : gr.vencida && atual ? `Pelo CNIS, a proteção do trabalho na cidade acabou em ${fmtBarra(gr.perda)}, ${gr.base} meses depois ${deQue}; na roça, ${tratDe(c).toLowerCase()} continua ${segurad(c)} pela atividade, sem pagar, enquanto ela durar: a prova são os papéis rurais e a autodeclaração`
      : gr.vencida && rural ? `Não paga o INSS desde ${gr.ultima} e deixou de estar ${ehF(c) ? "coberta" : "coberto"} em ${fmtBarra(gr.perda)}: isso não impede a aposentadoria por idade, nem a híbrida (IN 128, art. 257, § 1º)`
      : `${gr.vencida ? `Perdeu a qualidade de ${segurad(c)} em ${fmtBarra(gr.perda)}` : `Continua ${segurad(c)} do INSS até ${fmtBarra(gr.mantidaAte)}, mesmo sem pagar`}: ${gr.base} meses depois ${deQue}`
        + (gr.vencida && idade!=null && idade >= 50 ? "; na aposentadoria por idade a perda não atrapalha: contam a idade e as contribuições (Lei 10.666/2003, art. 3º, § 1º)" : "")   // F235
        + (gr.complementar ? `; complementada a competência ${gr.complementar.comp}, iria até ${fmtBarra(gr.complementar.mantidaAte)}` : "")
        + (atrasF.length ? `. Até essa data pode pagar os meses atrasados (${atrasF.length===1 ? atrasF[0] : `${atrasF[0]} a ${atrasF[atrasF.length-1]}`}); depois, a facultativa não paga mais o atraso` : "")
        + (desempPA ? desempPA.txt : ""),
        gr.semLimite ? "ok" : gr.vencida ? ((rural || dep) ? "info" : "crit") : atrasF.length ? "warn" : "ok", "CNIS", null, desempPA ? desempPA.acao : null);
    // F235 · o limbo: o vínculo aberto, sem salário depois do auxílio cortado há menos de 90 dias, à vista no alto do CNIS (e não como erro do cadastro)
    if(g) for(const v of vinculosSemSaida(g).filter(v=>v.suspenso && !v.suspenso.ativo && v.suspenso.fim && /Empregado/i.test(v.tipo||"") && !/dom[ée]stic/i.test(v.tipo||""))){
      const fim = isoBr(v.suspenso.fim); if(!fim || fim < somaDias(hoje(), -90) || fim >= hoje()) continue;
      it("cnis", `cnis.limbo:${raizCnpj(v.codigo)||v.origem}`, `Vínculo aberto em ${tituloOrgao(v.origem||"empresa")} e o auxílio-doença cortado em ${fmtBarra(fim)}: se a empresa não aceitou a volta, é limbo (o INSS diz que pode trabalhar e a empresa diz que não). Não peça a baixa do vínculo; ${ehF(c) ? "ela" : "ele"} deve se apresentar por escrito à empresa até ${fmtBarra(somaDias(fim, 30))} (30 dias do corte; conferir com o advogado). Avise o advogado hoje: os salários do período são questão trabalhista`, "crit", "CNIS"); }
    if(ct) it("cnis", "cnis.car", `${cap1(plu(ct.carencia, "mês", "meses"))} de contribuição para a carência e ${anosMeses(ct.anos, ct.meses)} de tempo, contados mês a mês${cAc ? `; ${cAc.txt}` : ""}`
      + (ct.foraMinimo ? `; ${ct.foraMinimo===1 ? "1 mês pago abaixo do mínimo fica" : `${ct.foraMinimo} meses pagos abaixo do mínimo ficam`} fora da conta` : "")
      + (semLic ? `; sem os ${plu(semLic, "mês", "meses")} da licença sem remuneração da RAIS, ${ct.carencia - semLic}` : ""), "info", "CNIS");
    if(ult) it("cnis", "cnis.ult", `Último mês pago: ${ult}`, "info", "CNIS");
    for(const b of bens) it("cnis", `cnis.ben:${b.nb||b.especie+b.de}`, `${nomeBenef(b.especie)} (B${b.especie})${b.nb ? `, NB ${fmtNb(b.nb)}` : ""}`
      + (b.de ? `: de ${fmtBarra(b.de)}${b.ate ? ` a ${fmtBarra(b.ate)}, ${fimBen(b)}` : b.ativo ? ", recebendo" : ""}` : b.situacao ? `: ${b.situacao.toLowerCase()}` : ""), b.ativo ? "ok" : "info", "CNIS");
    for(const i of g.indicadores||[]){ const tp = tipoIndicador(i.codigo);
      const vs = (g.vinculos||[]).filter(v=>v.tipo!=="Benefício" && (v.indicadores||[]).includes(i.codigo));
      // F302 · o indicador de competência diz o vínculo e os meses; no empregado não muda o tempo, que se conta pelas datas do vínculo
      const nc = vs.length ? [] : (((an||{}).indComps||{})[i.codigo]||[]), soEmp = nc.length && nc.every(x=>TIPO_REMUN.test(x.tipo||""));
      const onde = vs.length ? vs.map(v=>`${v.origem ? `na ${tituloOrgao(v.origem)}` : `como ${String(v.tipo||"").toLowerCase()}`} (${v.inicio}${v.fim ? ` a ${v.fim}` : ""})`).join(" e ")
        : nc.map(x=>`${x.origem ? `na ${tituloOrgao(x.origem)}` : `como ${String(x.tipo||"").toLowerCase()}`}, em ${juntaE(faixasDeComps(x.comps))}`).join(" e ");
      const nPend = tp==="P" && !soEmp ? (vs.length ? vs.filter(vinculoPendente).reduce((n, v)=>n + _paMeses(v), 0) : nc.reduce((n, x)=>n + x.comps.length, 0)) : 0;
      // F235 · a RAIS do mesmo empregador confirma o vínculo com pendência: entra no pedido com a carteira
      const raisOk = /^PEXT/.test(i.codigo) ? [...new Set((fd.rais||[]).filter(r=>vs.some(v=>r.raiz && r.raiz===raizCnpj(v.codigo||""))).map(r=>r.ano))].sort() : [];
      const noPed = /^PEXT/.test(i.codigo) && fd.processos.find(p=>((p.comunicacoes||[]).slice(-1)[0]||{}).contra && anexosDoPedido(p).some(l=>/carteira de trabalho|ctps/i.test(l) && vs.some(v=>(dsa(v.origem||"").match(/[a-z]{4,}/g)||[]).filter(w=>!/ltda|ficticia|ficticio/.test(w)).every(w=>dsa(l).includes(w)))));
      it("cnis", `cnis.ind:${i.codigo}`, noPed ? `O vínculo ${onde} entrou no CNIS fora do prazo (PEXT), e a carteira de trabalho com esse contrato já está no pedido de ${noPed.entrada}, que o INSS negou sem contá-lo: não peça a carteira de novo (documento novo só vale da entrega); ela é a prova do recurso`
        : PEDIR_IND[i.codigo] ? PEDIR_IND[i.codigo](onde) + (nPend ? `; até lá, ${plu(nPend, "mês fica", "meses ficam")} fora da conta do INSS` : "") + (raisOk.length ? `; a RAIS de ${raisOk.join(" e ")} do dossiê confirma o emprego e a saída: junte ao pedido` : "")
        : soEmp ? `${descIndicador(i.codigo, i.descricao)} (${i.codigo}) ${onde}: não muda o tempo do vínculo, que se conta pelas datas de entrada e de saída; só importa se a data de saída estiver errada`
        : `${tp==="P" ? `Pendência (${i.codigo})` : tp==="A" ? "Acerto já feito" : "Alerta"}${onde ? ` ${onde}` : ""}: ${descIndicador(i.codigo, i.descricao)}`
          + (nPend ? `. Até o acerto, o INSS não conta ${nPend===1 ? "esse mês" : `esses ${nPend} meses`}` : ""),
        soEmp ? "info" : tp==="P" ? "warn" : tp==="A" ? "ok" : "info", `CNIS · indicador ${i.codigo}`); }
    if(an && (an.abaixo||[]).length){ const nAb = an.abaixo.length;
      it("cnis", "cnis.min", `${nAb===1 ? "1 mês foi pago" : `${nAb} meses foram pagos`} abaixo do mínimo (${an.abaixo.slice(0,3).map(x=>x.comp).join(", ")}${nAb>3?" e outros":""}): só ${nAb===1?"conta":"contam"} depois de completar a diferença`, "warn", "CNIS"); }
    // F302 · a empresa falida não emite PPP: o tempo especial do período se prova de outro jeito
    const espOp = opcoesSel(c).some(o=>(o.mods||[]).includes("especial"));
    for(const v of (g.vinculos||[]).filter(v=>v.tipo!=="Benefício" && /FALID|MASSA FAL/i.test(v.origem||""))){
      const iean = (v.indicadores||[]).includes("IEAN");
      it("cnis", `cnis.falida:${raizCnpj(v.codigo)||v.origem}`, `${tituloOrgao(v.origem)} (${v.inicio}${v.fim ? ` a ${v.fim}` : ""}) consta como falida: o PPP e o laudo técnico não se pedem à empresa. `
        + `Se o trabalho ali foi insalubre, a prova do tempo especial vem do administrador judicial da massa falida, de laudo de empresa do mesmo ramo ou de perícia indireta${iean ? "; o próprio CNIS traz a exposição informada pelo empregador (IEAN)" : ""}`,
        espOp || iean ? "warn" : "info", "CNIS"); }
    // F302 · salário em dois lugares no mesmo mês: soma no cálculo (Lei 8.213/91, art. 32) e, no benefício de antes da soma, a revisão do Tema 1070/STJ
    { const cc = (an && an.concomitantes) || []; if(cc.length){
      const br = k => k.split("-").reverse().join("/"), nCc = cc.reduce((n, f)=>n + f.n, 0), de1 = cc[0].de;
      const rev = beneficiosDoCnis(g).filter(b=>/^(31|32|41|42|46|57|91|92|94)$/.test(b.especie) && b.de >= "1999-11-29" && b.de <= "2019-06-17" && de1 < b.de.slice(0, 7))
        .map(b=>({b, dec: somarAnos(somarMeses(b.de.slice(0, 7)+"-01", 1), 10)})).filter(x=>x.dec > hoje());
      const onde = [...new Set(cc.flatMap(f=>f.origens))].slice(0, 3).map(o=>tituloOrgao(o)), fx = cc.map(f=>f.de===f.ate ? br(f.de) : `${br(f.de)} a ${br(f.ate)}`);
      it("cnis", "cnis.concom", `Salário em dois lugares no mesmo mês em ${plu(nCc, "mês", "meses")} (${juntaE(fx.slice(0, 4))}${fx.length > 4 ? " e outros" : ""}), em ${juntaE(onde)}: no cálculo, os salários do mesmo mês se somam até o teto (Lei 8.213/91, art. 32)`
        + (rev.length ? `. ${rev.map(({b, dec})=>`O ${nomeBenef(b.especie).toLowerCase()} (B${b.especie}), com DIB em ${fmtBarra(b.de)}, foi calculado antes da soma: cabe a revisão das atividades concomitantes (Tema 1070/STJ), e a decadência, contada da DIB, se consuma em ${fmtBarra(dec)}; a carta de concessão dá a data exata`).join(". ")}` : ""),
        rev.length ? "warn" : "info", "CNIS"); } }
    const abertos = new Map(vinculosSemSaida(g).map(v=>[`${v.origem}|${v.inicio}`, v]));
    for(const v of (g.vinculos||[]).filter(v=>v.tipo!=="Benefício" && v.aberto && !v.fim)){
      const a = abertos.get(`${v.origem}|${v.inicio}`) || {}, onde = v.origem ? tituloOrgao(v.origem) : "empregador";
      // F235 · emprego atual, cargo público e contrato suspenso pelo auxílio não são ponto a conferir
      const [txt, est] = /segurado especial/i.test(v.tipo||"") ? [`Segurado especial no CNIS desde ${v.inicio}, em aberto: a qualidade vem do trabalho na roça ou na pesca, enquanto ele durar`, "info"]
        : a.servidor ? [`Cargo público (regime próprio) em ${onde}, desde ${v.inicio}: não conta no INSS, não vai na certidão e não se acerta`, "info"]
        : a.suspenso ? [`Vínculo em aberto em ${onde}, desde ${v.inicio}: é o contrato ${a.suspenso.ativo ? "suspenso pelo auxílio em curso" : "do auxílio cortado; se a empresa recusar a volta, é o limbo"}. Normal: não peça a baixa`, "info"]
        : a.emCurso ? [`Emprego atual, em aberto (normal): ${onde}, desde ${v.inicio}${v.ultRemun ? `; última remuneração em ${v.ultRemun}` : ""}`, "info"]
        // F235 · o carnê do MEI, do autônomo ou do facultativo não tem empregador nem data de saída: não é ponto a conferir
        : /Individual|Facultativ/i.test(v.tipo||"") ? [`${(v.indicadores||[]).some(i=>/IREC-(MEI|LC123)/.test(String(i))) ? "Contribuições como MEI (DAS)" : /Facultativ/i.test(v.tipo||"") ? "Contribuições como facultativo" : "Contribuições como contribuinte individual (carnê)"}, desde ${v.inicio}${v.ultRemun ? `; último mês pago ${v.ultRemun}` : ""}: não tem empregador nem data de saída`, "info"]
        // F235 · a carteira do dossiê mostra a saída que falta no CNIS: o que se pede é a correção, e não perguntar se ainda trabalha lá
        : (k => k && k.saida ? [`Vínculo sem data de saída no CNIS: ${onde}, desde ${v.inicio}; a carteira de trabalho mostra a saída em ${k.saida}. Pedir a correção da saída com a carteira (RAC Vínculos, Anexo I-B)`, "warn"]
          : [`Vínculo sem data de saída: ${onde}, desde ${v.inicio}${v.ultRemun ? `; última remuneração em ${v.ultRemun}` : ""}. Confira com a pessoa se ainda trabalha lá`, "warn"])(ctpsDoVinculo(c.id, v));
      it("cnis", `cnis.aberto:${raizCnpj(v.codigo)||v.origem}|${v.inicio}`, txt, est, "CNIS"); }
    // F235 · para quem segue na roça ou na pesca, o emprego da cidade, com o que ele tira (só o período, ou o seguro-defeso do ano)
    if(atual) for(const e of empregosNaRoca(c, g)) it("cnis", `cnis.emp:${raizCnpj(e.v.codigo)||e.v.origem}|${e.v.inicio}`, e.txt, e.est, "CNIS");
  }
  const fs0 = fatoSeguro(gr, fd.seguros), sd = gr && gr.seguro || (fd.seguros||[])[0];
  if(fs0) it("cnis", `sd:${(sd && (sd.numero||sd.data||sd.dispensa))||"ultimo"}`, fs0.texto, fs0.est, "Seguro-desemprego", fs0.anexo);
  for(const r of fd.resumos||[]){ const f = fatos.find(x=>x.fonte==="Contagem do INSS" && x.anexo===(r.anexo||{}).id); if(f) it("cnis", `cnis.resumo:${r.der||(r.anexo||{}).id}`, f.texto, f.est, "Contagem do INSS", f.anexo); }
  if(idade!=null || ap) it("cnis", "cnis.idade", `${idade!=null ? `${idade} anos (nascimento em ${fmtBarra(dnIso(c.dn))})` : "Sem data de nascimento"}${idadeTxt ? `; ${idadeTxt}` : ""}`, "info", ap && !ap.automatica ? "Aposentadorias futuras" : "Ficha");
  Q.cnis.achado = !g ? "" : [dep ? `Este é o CNIS de quem pede; ${dep.obito ? "na pensão" : "no auxílio-reclusão"} conta o de ${dep.obito ? "quem morreu" : "quem está preso"}` : "",
    // F235 · na roça de agora, a qualidade vem da atividade e o CNIS vazio não é falta; na roça antiga (a híbrida), abre pelo que
    // importa, as contribuições e a idade, e a perda vem depois, dita como o que é: não impede a aposentadoria por idade
    ...(rural && !atual && gr && gr.vencida && !gr.semLimite ? [ct ? `tem ${plu(ct.carencia, "mês", "meses")} de contribuição (${anosMeses(ct.anos, ct.meses)})` : "",
      idade!=null && idade >= idMin ? `já tem ${idade} anos` : "", `deixou de estar ${ehF(c) ? "coberta" : "coberto"} pelo INSS em ${fmtBarra(gr.perda)}, o que não impede a aposentadoria por idade nem a híbrida`] : [
    gr ? (gr.semLimite ? (gr.especial ? `${tratDe(c)} é ${segurad(c)} especial, com o período em aberto no CNIS` : `${tratDe(c)} recebe benefício e continua ${segurad(c)} enquanto ele durar`)
      : gr.vencida && atual ? `${tratDe(c)} continua ${segurad(c)} pela atividade na roça; pelo CNIS, a proteção do trabalho na cidade acabou em ${fmtBarra(gr.perda)}`
      : gr.vencida ? `${tratDe(c)} perdeu a qualidade de ${segurad(c)} em ${fmtBarra(gr.perda)}`
      : `${tratDe(c)} continua ${segurad(c)} do INSS até ${fmtBarra(gr.mantidaAte)}, mesmo sem pagar`) : "",
    atual && (!ct || !ct.carencia) && !bens.length ? "nenhum emprego, benefício ou contribuição no CNIS: para quem trabalha na roça ou na pesca com a família, isso não é falta, porque não precisa ter pago o INSS; o período rural não aparece no CNIS e se prova pela autodeclaração e pelos papéis"
      : ct ? (cAc ? cAc.txt : `tem ${plu(ct.carencia, "mês", "meses")} de contribuição (${anosMeses(ct.anos, ct.meses)})`) : ""]),
    // F235 · o emprego na roça (cnis.emp) não é ponto do cadastro do INSS a conferir
    (n=>n ? `${plu(n, "ponto", "pontos")} no cadastro do INSS para conferir` : "")(Q.cnis.itens.filter(x=>!/^cnis\.(qual|limbo)/.test(x.k) && !/^cnis\.emp:/.test(x.k) && (x.est==="warn"||x.est==="crit")).length)].filter(Boolean).map(cap1).join(". ");
  Q.cnis.vazio = g ? "" : docsDoDossie(c.id).some(a=>/^CNIS/i.test(fonteDoDossie(a)[0])) ? "o CNIS baixado ainda está sendo lido" : dz.meuinss && !dz.meuinss.parcial ? "o Meu INSS foi consultado, mas o CNIS não veio" : "o Meu INSS não foi consultado";
  // F235 · quem tem deficiência tem a idade da PcD: o quadro diz de qual aposentadoria é cada idade
  pcdIdadeNoPA(c, Q.cnis);
  // F235 · os problemas do extrato vêm primeiro (a pendência e o vínculo sem saída ficavam escondidos em "mostrar mais")
  { const prob = x => /^cnis\.(ctps|ind|aberto|min|papeis)/.test(x.k) && /warn|crit/.test(x.est); Q.cnis.itens = [...Q.cnis.itens.filter(prob), ...Q.cnis.itens.filter(x=>!prob(x))]; }
  if(g && ct) Q.cnis.extra = "linha";
  // F235 · os papéis da roça e da pesca: um item por papel, com a data, o titular e o que prova
  const roca = papeisDaRoca(c);
  for(const p of roca) it("roca", `roca:${slugPA(p.arq)}`, `${p.rot}${p.quando ? ` (${p.quando})` : ""}: ${p.txt}`, p.est, "papel do dossiê", p.a.id);
  if(roca.length){ const as = roca.flatMap(p=>[p.de, p.ate]).filter(Boolean), pr = roca.filter(p=>p.titular==="proprio").length, ele = ehF(c) ? "dela" : "dele";
    Q.roca.achado = [`${plu(roca.length, "papel", "papéis")}${as.length ? `, de ${Math.min(...as)} a ${Math.max(...as)}` : ""}`, pr ? `${pr} no nome ${ele}` : `nenhum no nome ${ele}`,
      roca.some(p=>p.titular==="conjuge") ? `o ${ehF(c) ? "do marido" : "da esposa"} vale se ${ehF(c) ? "ele" : "ela"} era segurado especial no período` : "",
      roca.some(p=>/^(sogro|outro)$/.test(p.titular)) ? "o do sogro ou de outra pessoa não prova o trabalho" : ""].filter(Boolean).join("; "); }
  // 2 · RAIS e CAGED
  const anos = [...new Set((fd.rais||[]).map(r=>+r.ano).filter(Boolean))].sort();
  for(const l of lic) it("rais", `rais.lic:${l.raiz||l.nome}|${l.de}`, `Licença sem remuneração${l.nome ? ` na ${l.nome}` : ""}, de ${l.de}${l.ate ? ` a ${l.ate}` : ""}${l.dias ? ` (${l.dias} dias)` : ""}, na RAIS de ${l.ano}: o INSS desconta o período do tempo, e o CNIS ainda o conta`, "warn", `RAIS de ${l.ano}`, (l.anexo||{}).id);
  if(!lic.length && anos.length) it("rais", "rais.lic:nenhuma", `Nenhuma licença sem remuneração na RAIS${anos.length>1 ? ` de ${anos[0]} a ${anos[anos.length-1]}` : ` de ${anos[0]}`}`, "ok", "RAIS");
  // F235 · com o CNIS, o vínculo que ele fecha não é ponto a conferir
  // F235 · o vínculo que o CNIS mostra em curso, ou suspenso pelo benefício, não tem saída: não é ponto a conferir
  const emCursoCnis = v => (g ? vinculosSemSaida(g) : []).some(w=>(w.emCurso || w.suspenso) && (dsa(w.origem||"")===dsa(v.nome||"") || (w.inicio && w.inicio===v.admissao)));
  for(const v of vinculosRaisCaged(fd, g).filter(v=>v.alertas.some(a=>/sem data de saída/.test(a)) && !emCursoCnis(v)))
    it("rais", `rais.vinc:${v.nome}|${v.admissao}`, `Vínculo ${v.nome||""} admitido em ${v.admissao||"data não lida"}: ${v.alertas.filter(a=>/sem data/.test(a)).join("; ")}`, "warn", [...v.fontes].join(" e "));
  for(const f of fatos.filter(x=>x.grupo==="vinculo" && (x.fonte==="CAGED" || x.fonte==="RAIS")))
    it("rais", `${f.fonte==="CAGED" ? "caged.semcnis" : "rais.sobra"}:${slugPA(f.texto)}`, f.texto, f.est, f.fonte, f.anexo);
  const dem = fatos.find(x=>x.grupo==="qualidade" && /^RAIS de/.test(x.fonte||""));
  if(dem) Q.rais.itens.push({k:`rais.dispensa:${slugPA(dem.texto)}`, txt:dem.texto, est:dem.est, fonte:dem.fonte, anexo:dem.anexo, acao:dem.acao||null});
  Q.rais.achado = !anos.length && !(fd.caged||[]).length ? "" : lic.length ? `sim: ${lic.length} ${lic.length===1?"licença":"licenças"} sem remuneração, ${lic.reduce((n, l)=>n + (l.dias||0), 0)} dias no total` : "não: nenhuma licença sem remuneração";
  // F235 · para quem segue na roça ou na pesca, o emprego que a RAIS ou o CAGED mostram e o que ele tira (o item está no quadro do CNIS)
  const empR = atual && g && (anos.length || (fd.caged||[]).length) ? empregosNaRoca(c, g).filter(e=>e.altos.length || e.defeso) : [];
  if(empR.length) Q.rais.achado += `. ${empR.map(e=>e.altos.length ? `O emprego de ${e.altos.map(([y, n])=>`${n} dias em ${y}`).join(" e ")} passou de 120 dias no ano e tira só esse período da roça` : `O emprego de ${e.v.inicio} a ${e.v.fim} tira o seguro-defeso deste ano`).join("; ")} (veja o quadro do CNIS)`;
  Q.rais.vazio = anos.length || (fd.caged||[]).length ? "" : dz.mte ? "o Emprega Brasil foi consultado e não trouxe RAIS nem CAGED" : "o Emprega Brasil não foi consultado";
  // F235 · na roça e na pesca, o Emprega Brasil sem nenhum contrato é ponto a favor: nada tira a condição de segurado especial
  if(rural && !anos.length && !(fd.caged||[]).length && dz.mte && (dz.mte.inexistentes||[]).some(t=>/ctps|rais|caged/i.test(t))){
    it("rais", "rais.nenhum", `Nenhum emprego registrado: a CTPS Digital, a RAIS e o CAGED não têm contrato (Emprega Brasil, ${dz.mte.em ? fmtBarra(String(dz.mte.em).slice(0, 10)) : "data não lida"}): nada tira a condição de segurado especial`, "ok", "Emprega Brasil");
    Q.rais.achado = "nenhum emprego registrado"; Q.rais.vazio = ""; }
  if(vinculosRaisCaged(fd).length) Q.rais.extra = "tabela";
  // 3 · CNPJs
  const razaoLimpa = r => tituloOrgao(String(r||"").replace(/\s*\d{11}\s*$/, "").trim());
  // F235 · a incapacidade está em jogo: benefício por incapacidade no CNIS, laudo do INSS ou documento médico
  const incapEmJogo = bens.some(b=>/^(31|32|91|92)$/.test(b.especie)) || (fd.laudos||[]).length || linhaClinica(c.id).length;
  for(const e of fd.cnpjs||[]){ const d = soDig(e.cnpj), ws = _cnpjWs.get(d) || {};
    if(incapEmJogo && /^ATIVA$/i.test(e.situacao)) it("cnpj", `cnpj.pergunta:${d}`, `CNPJ ativo em nome ${ehF(c) ? "da cliente" : "do cliente"}${ult && chaveComp(ult) < somarMeses(hoje(), -2).slice(0, 7) ? ` e nenhum pagamento ao INSS desde ${ult}` : ""}. Pergunte: ainda trabalha ou fatura por ele? Paga o DAS? No auxílio-doença e na aposentadoria por invalidez, o INSS e o perito podem ler o CNPJ ativo como trabalho; no auxílio-acidente não atrapalha, porque ele é pago junto com o trabalho. Leve a resposta ao advogado`, "warn", "Redesim", (e.anexo||{}).id);
    it("cnpj", `cnpj:${d}`, `${e.cnpj}${e.razao ? `, ${razaoLimpa(e.razao)}` : ""}${e.fantasia ? ` (${tituloOrgao(e.fantasia)})` : ""}: ${(e.situacao||"situação não lida").toLowerCase()}${e.local ? `, em ${e.local}` : ""}; ${tratDe(c)} é ${(e.vinculo||"vinculado").toLowerCase()}${e.qualificacao ? ` (${e.qualificacao.replace(/^\d+\s*-\s*/, "").toLowerCase()})` : ""}`
      + (ws.dados ? `; ${resumoCnpjWs(ws.dados)}` : ""), /^ATIVA$/i.test(e.situacao) ? "warn" : "info", "Redesim", (e.anexo||{}).id,
      ws.dados ? null : {rot: ws.carregando ? "Consultando…" : "Consultar abertura, MEI e CNAE", js:`consultarCnpjWs('${d}')`}); }
  if(fd.redesim && !(fd.cnpjs||[]).length) it("cnpj", "cnpj:nenhum", `Nenhum CNPJ no CPF, na consulta à Redesim de ${fd.redesim.consulta || "data não lida"}`, "ok", "Redesim", (fd.redesim.anexo||{}).id);
  // F235 · a Redesim que respondeu "nenhum CNPJ" sem gerar PDF: o fato negativo vem do resumo do dossiê
  const redNeg = !fd.redesim && !(fd.cnpjs||[]).length && dz.redesim && (dz.redesim.inexistentes||[]).some(t=>/cnpj|empresa/i.test(t));
  if(redNeg) it("cnpj", "cnpj:nenhum", `A Redesim informou: nenhuma empresa no CPF (consulta de ${dz.redesim.em ? fmtBarra(String(dz.redesim.em).slice(0, 10)) : "data não lida"})`, "ok", "Redesim");
  const ativos = (fd.cnpjs||[]).filter(e=>/^ATIVA$/i.test(e.situacao)).length;
  Q.cnpj.achado = (fd.cnpjs||[]).length ? `${fd.cnpjs.length} ${fd.cnpjs.length===1?"CNPJ":"CNPJs"}, ${ativos} ${ativos===1?"ativo":"ativos"}` : fd.redesim || redNeg ? "nenhum CNPJ no CPF" : "";
  Q.cnpj.vazio = fd.redesim || redNeg || (fd.cnpjs||[]).length ? "" : dz.redesim ? "a Redesim foi aberta, mas a pesquisa não foi feita" : "a Redesim não foi consultada";
  // 4 · pedidos ao INSS
  const nomePed = pd => pd.cod ? nomeBenef(pd.cod) : semCaixa(String(pd.especie||"Pedido").replace(/^\d+\s*-\s*/, ""));
  // F235 · a pensão concedida com a parte de quem pede cortada (regra dos 4 meses) não é verde; na morte por acidente a regra não vale
  const corte = cotaCortadaDe(c), acid = dep && dep.obito && /acident|tr[âa]nsito|atropel|queda|choque|eletropless|motocicleta/i.test(String(dep.causa||"").replace(/acidente vascular\S*/gi, "")) ? dep.causa : "";
  const corteTxt = pd => { const lim = pd.decisaoEm ? somaDias(isoBr(pd.decisaoEm), 30) : null;
    return `concedida, mas a parte de quem pede foi cortada em ${fmtBarra(corte.ate)}${corte.motivo ? ` (${corte.motivo})` : ""}${acid ? `; a certidão de óbito dá ${acid.toLowerCase()}: na morte por acidente a regra dos 4 meses não vale (Lei 8.213, art. 77, § 2º-A)` : ""}${lim ? (lim < hoje() ? `; o recurso de 30 dias acabou em ${fmtBarra(lim)}, e a revisão cabe em até 10 anos` : `; dá para recorrer até ${fmtBarra(lim)} (30 dias da decisão; conferir a ciência)`) : ""}`; };
  for(const pd of pedidosAoInss(c, fd)){ const neg = pd.res==="indeferido", cortou = !neg && pd.res==="deferido" && !!corte && /cota/i.test(pd.motivo||"");
    it("ped", `ped:${pd.chave.startsWith("nb:") ? pd.nb : slugPA(pd.especie + pd.der)}`,
      neg ? `${nomePed(pd)}${pd.der ? ` de ${pd.der}` : ""}: negado${pd.decisaoEm ? ` em ${pd.decisaoEm}` : ""}${pd.motivo ? ` (${pd.motivo.replace(/^./, x=>x.toLowerCase())})` : ""}${pd.nb ? `; NB ${fmtNb(pd.nb)}` : ""}`
        : `${nomePed(pd)}${pd.nb ? `, NB ${fmtNb(pd.nb)}` : ""}${pd.der ? `, pedido em ${pd.der}` : ""}: ${cortou ? corteTxt(pd) : pd.res==="deferido" ? "concedido" : pd.res || "sem resultado no dossiê"}`,
      neg || cortou ? "warn" : pd.res==="deferido" ? "ok" : "info", pd.fontes.join(", "), pd.anexo); }
  for(const x of ids.filter(x=>x.id==="recurso" || x.id==="dcb")) it("ped", `ped.${x.id}:${x.anexo || slugPA(x.texto)}`, x.texto, x.alerta ? "crit" : "warn", x.fonte, x.anexo);
  // 11.91 · TRI-07: a ação anterior contra o INSS, também a encerrada, pede conferência de litispendência e coisa julgada
  { const lj = triagemLeitura("judicial", c, (D.casosDoCliente.get(c.id)||ks||[]).filter(k=>!k.pre_caso));
    if(lj.cor==="alerta") it("ped", "ped.judicial", `${cap1(lj.txt)}: ${lj.det}`, "warn", "CRM"); }
  // F235 · a janela da prorrogação do auxílio-doença em curso, à vista: é na perícia dela que o INSS pode dar a aposentadoria por invalidez
  for(const b of bens.filter(b=>/^(31|91)$/.test(b.especie) && b.ativo)){
    const mesmo = nb => soDig(nb||"")===soDig(b.nb||"");
    const dcb = [...(fd.laudos||[]).filter(l=>mesmo(l.nb) && l.dcb).map(l=>isoBr(l.dcb)), ...(fd.extratos||[]).filter(e=>mesmo(e.nb) && e.dcb).map(e=>isoBr(e.dcb)), b.ate].filter(d=>d && d >= hoje()).sort().pop();
    if(!dcb) continue; const abre = somaDias(dcb, -14), aberta = hoje() >= abre;
    it("ped", `ped.prorrog:${b.nb||dcb}`, `${aberta ? "Prazo correndo" : "Prazo"}: a prorrogação do ${nomeBenef(b.especie).toLowerCase()}${b.nb ? ` (NB ${fmtNb(b.nb)})` : ""} se pede de ${fmtBarra(abre)} a ${fmtBarra(dcb)}, os últimos 15 dias antes do fim marcado (IN 128, art. 339, § 3º), com relatório médico atual. Se o INSS só prorrogar ou cortar: recurso em 30 dias ou ação`, aberta ? "crit" : "warn", "dossiê"); }
  // F235 · o auxílio cortado na data marcada sem pedido de prorrogação no dossiê: não há decisão para recorrer
  for(const b of bens.filter(b=>/^(31|91)$/.test(b.especie) && !b.ativo && b.ate && b.ate < hoje() && b.ate >= somaDias(hoje(), -180)).slice(0, 1))
    if(!(fd.processos||[]).some(p=>/prorroga/i.test(p.servico||"") && isoBr(p.entrada||"") >= (b.de||"")))
      it("ped", `ped.semprorrog:${b.nb||b.ate}`, `Nenhum pedido de prorrogação do ${nomeBenef(b.especie).toLowerCase()}${b.nb ? ` (NB ${fmtNb(b.nb)})` : ""} no dossiê antes do corte em ${fmtBarra(b.ate)}: se não houve, não há decisão para recorrer, e o caminho é o pedido novo (confirme com ${ehF(c) ? "a cliente" : "o cliente"})`, "warn", "dossiê");
  // F235 · a concessão com a parte cortada é amarela, mas não é pedido negado
  const peds = Q.ped.itens.filter(x=>/^ped:/.test(x.k)), nInd = peds.filter(x=>x.est==="warn" && !/: concedida, mas /.test(x.txt)).length, pz = prazosDoDossie(c)[0];
  Q.ped.achado = peds.length ? [`${plu(peds.length, "pedido", "pedidos")}${nInd ? `, ${plu(nInd, "negado", "negados")}` : ""}`,
    pz ? `recurso ao CRPS até ${fmtBarra(pz.fatal)} (${faltamTxt(pz.fatal)})` : ""].filter(Boolean).map(cap1).join(". ") : "";
  // 5 · benefícios: cartas e extratos
  for(const k of fd.cartas||[]) it("ben", `ben.carta:${k.nb||(k.anexo||{}).id}`, `Carta de concessão${k.nb ? ` do NB ${fmtNb(k.nb)}` : ""}${k.especie ? `, ${k.especie}` : ""}${k.dib ? `, DIB ${k.dib}` : ""}${k.rmi ? `, renda inicial de ${k.rmi}` : ""}`, "info", "Carta de concessão", (k.anexo||{}).id);
  // F235 · a renda de hoje (é com ela que se compara a aposentadoria) e o desconto que o crédito líquido mostra
  for(const e of fd.extratos||[]){ const ds = descontoDoExtrato(e);
    it("ben", `ben.extrato:${e.nb||(e.anexo||{}).id}`, `Extrato de pagamento${e.nb ? ` do NB ${fmtNb(e.nb)}` : ""}${e.mr ? `: renda mensal de R$ ${e.mr}` : ""}${(e.creditos||[]).length ? `${e.mr ? "," : ":"} ${e.creditos.length} créditos` : ""}${e.dcb ? `; DCB em ${e.dcb}` : ""}`
      + (!ds ? "" : ds.atual ? `; crédito líquido R$ ${moedaBR(ds.valor).replace(/^R\$\s*/, "")} abaixo da renda todo mês (em geral o imposto de renda; o informe de rendimentos confirma)`
        : `; o crédito líquido ficou abaixo da renda até ${ds.ult} e é igual a ela desde ${ds.parou}: o desconto (em geral o imposto de renda) parou`), "info", "Extrato de pagamento", (e.anexo||{}).id); }
  for(const x of ids.filter(x=>x.id==="decadencia")) it("ben", `ben.dec:${slugPA(x.texto)}`, x.texto, x.alerta ? "crit" : "info", x.fonte, x.anexo);
  // F235 · a parte de quem pede cortada na pensão (a carta diz os dependentes e até quando cada um recebe)
  if(corte) it("ben", `ben.cota:${corte.ate}`, `A parte de quem pede na pensão foi cortada em ${fmtBarra(corte.ate)}${corte.meses ? ` (durou ${corte.meses} meses)` : ""}${corte.motivo ? `: ${corte.motivo}` : ""}${acid ? `; a morte foi por acidente (${acid.toLowerCase()}), e nela a regra dos 4 meses não vale (Lei 8.213, art. 77, § 2º-A): veja a revisão na Análise de Direito` : ""}`, "warn", cap1(corte.rot), corte.anexo.id);
  Q.ben.achado = Q.ben.itens.length ? [(fd.cartas||[]).length ? plu(fd.cartas.length, "carta de concessão", "cartas de concessão") : "", (fd.extratos||[]).length ? plu(fd.extratos.length, "extrato de pagamento", "extratos de pagamento") : ""].filter(Boolean).join(" e ") : "";
  // 6 · saúde
  const ul = (fd.laudos||[]).slice().sort((a, b)=>isoBr(b.exame||"").localeCompare(isoBr(a.exame||"")))[0], clin0 = linhaClinica(c.id);
  if(ul){
    const neg = pedidosAoInss(c, fd).find(p=>p.res==="indeferido" && p.nb && p.nb===ul.nb && isoBr(p.der||"") >= isoBr(ul.exame||""));
    const cid = ul.cid ? ` (CID ${ul.cid}${ul.cidDesc ? `, ${ul.cidDesc.toLowerCase()}` : ""})` : "";
    it("saude", `saude.laudo:${slugPA((ul.exame||"") + (ul.nb||""))}`, ul.resultado==="incapaz"
      ? `Na perícia de ${ul.exame||"data não lida"}, o INSS reconheceu a incapacidade${ul.dii ? ` desde ${ul.dii}` : ""}${cid}${ul.dcb ? (isoBr(ul.dcb) < hoje() ? `, só até ${ul.dcb}` : `, com fim marcado para ${ul.dcb}`) : ""}${neg ? `. Depois negou a continuação em ${neg.decisaoEm || neg.der} (ver Pedidos ao INSS)` : ""}${laudoTrabalho(ul)}`
      : ul.resultado==="capaz" ? (laudoCapazConsolidado(ul, cid) || `Na perícia de ${ul.exame||"data não lida"}, o INSS não reconheceu a incapacidade${cid}`) : `Laudo do INSS de ${ul.exame||"data não lida"}: resultado não lido${cid}`,
      ul.resultado==="capaz" || neg ? "warn" : ul.resultado==="incapaz" ? "ok" : "info", ul.sistema==="SABI" ? "Laudo do SABI" : "Laudo da Perícia Médica Federal", (ul.anexo||{}).id);
    const dcbIso = isoBr(ul.dcb||"");
    if(dcbIso && dcbIso < hoje() && !clin0.some(x=>x.data && x.data > dcbIso))
      it("saude", "saude.depois-dcb", `Documento médico depois do corte (${ul.dcb}): nenhum no dossiê. Peça relatório médico atual, com data, CID e o que impede o trabalho`, "warn", "dossiê");
  }
  for(const f of fatos.filter(x=>x.grupo==="contrib" && /isenção de carência|dispensam a carência/.test(x.texto))) it("saude", `saude.carencia:${slugPA(f.texto)}`, f.texto, f.est, f.fonte, f.anexo);
  const clin = linhaClinica(c.id);
  for(const x of clin) it("saude", `saude:${String((x.anexo||{}).caminho||(x.anexo||{}).id||"").split("/").slice(2).join("/") || slugPA(x.titulo + x.data)}`,
    `${x.data ? fmtBarra(x.data) : "Sem data"}, ${x.tipo.toLowerCase()}: ${x.titulo}${x.resumo ? `; ${x.resumo}` : ""}${x.cids.length ? `; CID ${x.cids.join(", ")}` : ""}`, "info", x.fonte, (x.anexo||{}).id);
  const area = clin.length ? areaClinica(clin) : null;
  // F235 · a negativa do SUS (terapia, remédio) é do quadro da saúde: é o que desconta o gasto na renda do BPC
  for(const a of docsDoDossie(c.id).filter(a=>/negativ/i.test(a.nome||"") && a.texto)) it("saude", `saude.neg:${slugPA(a.nome)}`,
    `${String(a.nome).split(" · ").pop().replace(/\.pdf$/i, "")}: ${((String(a.texto).replace(/\s+/g, " ").match(/n[ãa]o (?:oferece|fornece|consta)[^.]*\./i)||[])[0]||"o SUS não fornece.").trim()} Serve para descontar o gasto da renda do BPC, junto com a receita e o relatório do tratamento contínuo`, "info", "Negativa do SUS", a.id);
  Q.saude.achado = Q.saude.itens.length ? `${clin.length} ${clin.length===1?"documento médico":"documentos médicos"}${area ? `, da área de ${area.rot}` : ""}${(fd.laudos||[]).length ? `, ${fd.laudos.length} ${fd.laudos.length===1?"laudo":"laudos"} do INSS` : ""}` : "";
  // 7 · PPP e CAT
  // F235 · o fator casa sem caixa nem acento ("Ruído" do PPP e "ruído" do fato), e o fato traz os decibéis e o limite da época
  for(const pp of fd.ppps||[]) for(const r of pp.riscos||[]){ const f = fatos.find(x=>x.grupo==="ppp" && x.anexo===(pp.anexo||{}).id && dsa(x.texto).includes(dsa(r.fator||"")) && x.texto.includes(r.ini||"data não lida"));
    it("esp", `ppp:${String((pp.anexo||{}).caminho||"").split("/").slice(2).join("/")}|${r.fator}|${r.ini}`, f ? f.texto : `PPP de ${pp.empresa||"empresa não lida"}: ${r.fator} de ${r.ini||"?"} a ${r.fim||"?"}`, f ? f.est : "info", "PPP", (pp.anexo||{}).id); }
  for(const ca of fd.cats||[]){ const f = fatos.find(x=>x.grupo==="cat" && x.anexo===(ca.anexo||{}).id);
    it("esp", `cat:${ca.numero||String((ca.anexo||{}).caminho||"").split("/").pop()}`, f ? f.texto : `CAT de ${ca.data||"data não lida"}`, "info", "CAT", (ca.anexo||{}).id); }
  Q.esp.achado = Q.esp.itens.length ? [(fd.ppps||[]).length ? plu(fd.ppps.length, "PPP", "PPPs") : "", (fd.cats||[]).length ? plu(fd.cats.length, "CAT", "CATs") : ""].filter(Boolean).join(" e ") : "";
  // F235 · o especial que os PPPs provam (a mesma conta do quadro Tempos): em 13/11/2019 e hoje
  if((fd.ppps||[]).length){ const tt = admTotaisDe(temposAutoDe(c), sexoDe(c)==="F" ? "F" : "M", hoje());
    if(tt.especial) Q.esp.achado += `: ${tempoFmt(tt.especial2019)} de especial em 13/11/2019 e ${tempoFmt(tt.especial)} hoje, pelo que os PPPs provam`; }
  // F235 · quem já é aposentado usa o PPP para revisar a aposentadoria, e não para pedir outra
  if((fd.ppps||[]).length && aposentadoriaAtiva(c)) Q.esp.importa = "revisão da aposentadoria já concedida (o tempo especial que o INSS não contou), conversão de tempo e auxílio-acidente";
  // 8 · CadÚnico
  const fz = familiaCadunico(c);
  for(const f of fatos.filter(x=>x.grupo==="cadunico")) it("cad", `cad:${f.fonte==="CadÚnico" ? "familia" : "crm"}`, f.texto, f.est, f.fonte, f.anexo);
  if(fz && fz.atualizada_em){ const iso = isoBr(fz.atualizada_em) || String(fz.atualizada_em).slice(0,10), venceu = iso && somarMeses(iso, 24) < hoje();
    it("cad", "cad.atualizacao", `Cadastro atualizado em ${fmtBarra(iso)}${venceu ? ": passou de 24 meses, precisa atualizar antes do pedido" : ", dentro dos 24 meses"}`, venceu ? "warn" : "ok", "CadÚnico"); }
  const mmaa = s => /^\d{6}$/.test(String(s||"")) ? `${String(s).slice(4)}/${String(s).slice(0,4)}` : (s || "?");
  for(const b of (fz && fz.beneficios_pagos)||[]) it("cad", `cad.ben:${slugPA(`${b.tipo||""}${b.beneficiario||""}`)}`,
    `${b.tipo||"Benefício"}${b.beneficiario ? ` (${b.beneficiario})` : ""}: desde ${mmaa(b.primeira_competencia)}, último pago em ${mmaa(b.ultima_competencia)}${b.valor_ultimo!=null ? `, de ${moeda(b.valor_ultimo)}` : ""}`
      // F235 · a pergunta do balcão: o Bolsa Família não atrapalha o salário-maternidade, o seguro-defeso nem a roça
      + (/bolsa fam/i.test(b.tipo||"") && (rural || certs.some(ce=>ce.nascimento && ce.nascimento!==dnC && ce.nascimento >= somarMeses(hoje(), -60))) ? "; não impede o salário-maternidade, o seguro-defeso nem a condição de segurado especial" : ""), "info", "CadÚnico");
  // F235 · o bebê da certidão de nascimento, no CadÚnico, é o do salário-maternidade
  for(const m of (fz && fz.membros)||[]){ const n = isoBr(m.nascimento||"") || String(m.nascimento||"").slice(0, 10);
    if(n && n!==dnC && certs.some(ce=>ce.nascimento===n)) it("cad", `cad.bebe:${slugPA(m.nome||n)}`, `${m.nome}${m.parentesco ? ` (${String(m.parentesco).toLowerCase()})` : ""}, ${/filha/i.test(m.parentesco||"") ? "nascida" : "nascido"} em ${fmtBarra(n)}: é o bebê da certidão de nascimento, o do salário-maternidade`, "info", "CadÚnico"); }
  if(fz) Q.cad.extra = "transp";
  // F235 · a renda por pessoa da ficha não é a do BPC (a lei tira e põe rendas e pessoas)
  Q.cad.achado = fz ? `${(fz.membros||[]).length} ${(fz.membros||[]).length===1?"integrante":"integrantes"}; a ficha dá ${moeda(fz.renda_por_pessoa)} por pessoa, que não é a conta do BPC (a do BPC está logo abaixo e na Análise de Direito)` : "";
  // F616 · o Prévius: o resumo nos números e só a divergência com o CNIS como problema
  const pv = previusDe(c);
  if(pv){ const pp = pv.p, rg = pp.regras.find(r=>r.escolhida);
    Q.prev.blocos = [["Tempo", pp.tempo ? prevTempoTxt(pp.tempo) : "—", "info"], ["Carência", pp.carencia!=null ? plu(pp.carencia, "contribuição", "contribuições") : "—", "info"],
      ["Regra", pp.regra || (pp.regras.length ? plu(pp.regras.length, "regra calculada", "regras calculadas") : "—"), "info"],
      ["RMI", pp.rmi ? moeda(pp.rmi.valor) : rg && rg.rmi!=null ? moeda(rg.rmi) : "—", "info"]].filter(b=>b[1]!=="—");   // o que o relatório não traz não aparece
    Q.prev.achado = `${pp.data ? `cálculo de ${fmtBarra(pp.data)}` : "cálculo sem data"}${pp.periodos.length ? `, ${plu(pp.periodos.length, "período", "períodos")}` : ""}`;
    const cf = conferirPrevius(pp, {ct, vinculos:(g && g.vinculos)||[], ppps:fd.ppps.map(x=>x.empresa||""), temRural:rural, temLaudo:fd.laudos.length>0, hoje:hoje()});
    for(const d of cf) it("prev", d.k, d.texto, d.tipo==="divergencia" ? "warn" : "info", d.fonte, pv.a.id);
    if(!g) it("prev", "prev.semcnis", "Sem CNIS no dossiê para conferir", "warn", "Prévius", pv.a.id);   // F618
    else if(!cf.some(d=>d.tipo==="divergencia")) it("prev", "prev.ok", "Prévius confere com o CNIS", "ok", "Prévius", pv.a.id); }
  // 9 · os documentos de cada quadro, e os que nenhum quadro lê
  const idsRoca = new Set(roca.map(p=>p.a.id));   // F235 · o papel da roça já está no quadro dele, um item por papel
  // F235 · o relatório do médico vai ao quadro da Saúde, venha da pasta que vier
  for(const a of docsDoDossie(c.id)){ if(idsRoca.has(a.id)) continue; const [f] = fonteDoDossie(a), q = !RX_FONTE_CLINICA.test(f) && ehDocMedico(a) ? PA_Q.find(x=>x[0]==="saude") : PA_Q.find(x=>x[4] && x[4].test(f));
    (q ? Q[q[0]].docs : Q.docs.itens).push(q ? a : {k:chaveDocPA(a), txt:fonteDoDossie(a).join(" · "), est:"info", fonte:f, anexo:a.id}); }
  // 10 · o que não veio
  // F235 · na roça e na pesca, o portal sem emprego nem empresa é ponto a favor; sem doença em jogo, a falta de laudo não é pedido
  const doenca = incapEmJogo || /doen[çc]|\bdor(es)?\b|m[ée]dic|cirurg|afastad|incapac|acident|tratamento|c[âa]ncer|depress/i.test(relatoDe(c));
  for(const t of paFaltas(c, fd)){ const neg = rural && /^(CTPS|RAIS|CAGED|CNPJ)\b/i.test(t), lau = !doenca && /^Nenhum laudo m[ée]dico/.test(t);
    it("falta", `falta:${slugPA(t)}`, lau ? "Nenhum laudo médico nem relatório médico: só importa se houver doença" : neg ? `${t}: nada tira a condição de segurado especial` : t, neg ? "ok" : lau ? "info" : "warn", "dossiê"); }
  Q.falta.achado = Q.falta.itens.length ? `${Q.falta.itens.length} ${Q.falta.itens.length===1?"item":"itens"}` : "nada: o dossiê tem os documentos de cada portal";
  for(const q of Object.values(Q)) for(const a of q.docs) if(!a.k) Object.assign(a, {k:chaveDocPA(a)});
  // F235 · o catálogo da espécie ajusta a leitura do CNIS (o cargo no regime próprio, o carnê reduzido, o prazo do atrasado)
  for(const f of PA_CNIS_AJUSTE) try{ f(c, Q.cnis, {g, gr, ct, an, fd, Q}); }catch(e){}
  const quadros = PA_Q.map(([id])=>Q[id]).filter(q=>q.itens.length || q.docs.length || PA_SEMPRE.has(q.id));
  return {quadros, gr, ct, fd, an, g};
}
// ── a escolha: tudo vai, salvo o que se desmarcar (admDe(c).fora, por pré-caso) ──
const paForaDe = c => new Set(admDe(c).fora);
// os itens que vão à Análise de Direito, com o quadro de onde vieram
function itensLevados(c, ks, qs){
  const fora = paForaDe(c);
  return (qs || quadrosDoPA(c, ks||D.casosDoCliente.get(c.id)||[]).quadros).flatMap(q=>[...q.itens, ...q.docs.map(a=>({k:a.k, txt:fonteDoDossie(a).join(" · "), fonte:"dossiê", anexo:a.id}))]
    .filter(x=>!fora.has(x.k)).map(x=>({...x, q:q.id, qrot:q.rot})));
}
// os blocos de antes (F196) apontam para os quadros: vai se algum item do quadro vai
const PA_BLOCO_Q = {qual:"cnis", car:"cnis", cnis:"cnis", plan:"cnis", rais:"rais", cnpj:"cnpj", ped:"ped", ben:"ben", saude:"saude", esp:"esp", cad:"cad", falta:"falta"};
function paVai(cliId, b){
  const c = D.cliPorId.get(cliId); if(!c) return true;
  const qid = PA_BLOCO_Q[b] || b, fora = paForaDe(c);
  const q = quadrosDoPA(c, D.casosDoCliente.get(cliId)||[]).quadros.find(x=>x.id===qid);
  return !q || ![...q.itens, ...q.docs].length || [...q.itens, ...q.docs].some(x=>!fora.has(x.k));
}
// marca e desmarca no lugar: muda a classe e os contadores, sem repintar a ficha
function paMarcar(cliId, el){
  const li = el.closest("[data-k]"), k = li && li.dataset.k; if(!k) return;
  const vai = el.getAttribute("aria-checked")!=="true";
  admSalvar(cliId, a=>{ const f = new Set(a.fora); vai ? f.delete(k) : f.add(k); a.fora = [...f]; });
  paPintarMarca(li, vai);
}
function paMarcarQuadro(cliId, qid){
  const sec = document.getElementById("paq-"+qid); if(!sec) return;
  const lis = [...sec.querySelectorAll("[data-k]")], vai = lis.some(li=>li.classList.contains("fora"));
  admSalvar(cliId, a=>{ const f = new Set(a.fora); for(const li of lis) vai ? f.delete(li.dataset.k) : f.add(li.dataset.k); a.fora = [...f]; });
  lis.forEach(li=>paPintarMarca(li, vai));
}
function paPintarMarca(li, vai){
  li.classList.toggle("fora", !vai);
  const cx = li.querySelector(".paq-cx"); if(cx) cx.setAttribute("aria-checked", String(vai));
  const pa = li.closest(".pa"); if(!pa) return;
  for(const sec of pa.querySelectorAll(".paq[data-q]")){ const t = sec.querySelectorAll("[data-k]").length, n = t - sec.querySelectorAll("[data-k].fora").length;
    const ct = sec.querySelector(".paq-n"); if(ct) ct.textContent = t ? `${n} de ${t} vão à Análise` : "";
    const ix = pa.querySelector(`.tp-trilha li[data-passo="${sec.dataset.q}"] .tp-conta`); if(ix) ix.textContent = t ? `${n}/${t}` : ""; }
  const tot = pa.querySelectorAll(".paq [data-k]").length - pa.querySelectorAll(".paq [data-k].fora").length, b = pa.querySelector(".paq-barra-n");
  if(b) b.textContent = `${tot} ${tot===1?"item":"itens"} do dossiê`;
}
// F302 · o CNIS mostra à vista só o que tem problema; o resto, que não pede providência, fica fechado logo abaixo
// F320 · cada problema diz quem providencia (Cliente ou Escritório, pela mesma regra das Pendências) e a providência curta;
// a linha do tempo vai para dentro do "Ver os dados sem problema"
function quemDoProblema(x, ctx){
  let r; try{ r = providenciaDe(x, ctx||{}); }catch(e){ return ""; }
  const [quem, acao] = r, curto = acao.replace(/^Deve /, "").split(/[,;:(]|\s(?:para|porque|que|com|depois|antes)\s/)[0].trim();
  return `<span class="pp-quem ${quem==="Cliente" ? "cli" : "esc"}">${quem}</span><span class="paq-acao" title="${esc(acao)}">${esc(curto)}</span>`;
}
function itensDoCnis(itens, li, ctx, linha){
  const prob = itens.filter(x=>/warn|crit/.test(x.est)), resto = itens.filter(x=>!/warn|crit/.test(x.est));
  return `<p class="paq-prob${prob.length ? "" : " ok"}"><b>${prob.length ? `Problemas · ${prob.length}` : "Nenhum problema no CNIS"}</b></p>
    ${prob.length ? `<ul class="paq-itens">${prob.map(x=>li(x, quemDoProblema(x, ctx))).join("")}</ul>` : ""}
    ${resto.length || linha ? `<details class="paq-resto"><summary>Ver os ${plu(resto.length, "dado", "dados")} sem problema</summary>${linha||""}${resto.length ? `<ul class="paq-itens">${resto.map(x=>li(x, "")).join("")}</ul>` : ""}</details>` : ""}`;
}
function painelPA(c, ks){
  if(telaSimples("pa", c)) return paSimples(c, ks);   // F249 · nível 1 e 2 antes da onda 5
  // F220 · sem dossiê não há quadro: o relato da recepção e a escolha do benefício
  const semDz = !docsDoDossie(c.id).length && !cnisDe(c) && !familiaCadunico(c) && !previusDe(c);   // a família do CadÚnico já é dossiê; F618 · o Prévius também
  const d = paDados(c, ks), qd = semDz ? {quadros:[]} : quadrosDoPA(c, ks), fora = paForaDe(c), pc = preCasoAberto(c);
  const dz = c.dossie || {}, ems = Object.values(dz).map(x=>x&&x.em).filter(Boolean).sort(), nDocs = docsDoDossie(c.id).length;
  const PORT = {meuinss:"Meu INSS", mte:"Emprega Brasil", recursos:"e-Recursos", hc:"HC Ribeirão", redesim:"Redesim", cadunico:"CadÚnico", transparencia:"Portal da Transparência"};
  const ops = opcoesSel(c), nEsc = Object.keys(benefSel(c)).length;
  const conta = q => { const xs = [...q.itens, ...q.docs]; return [xs.filter(x=>!fora.has(x.k)).length, xs.length]; };
  const tot = qd.quadros.reduce((n, q)=>n + conta(q)[0], 0);
  const cx = (k) => `<button type="button" class="paq-cx" role="checkbox" aria-checked="${!fora.has(k)}" aria-label="Levar à Análise de Direito" onclick="paMarcar('${c.id}',this)"></button>`;
  const itemLi = (x, i, quem) => `<li class="paq-it${fora.has(x.k)?" fora":""}${i>=PA_VISIVEIS?" paq-extra":""}" data-k="${esc(x.k)}">${cx(x.k)}
      <i class="pa-bola ${x.est}" aria-hidden="true"></i><span class="paq-txt" title="${esc(x.txt)}" onclick="this.classList.toggle('aberto')">${esc(x.txt)}</span>
      ${quem||""}<span class="paq-orig">${esc(x.fonte||"")}${x.anexo ? ` · <button type="button" class="adr-link" onclick="abrirAnexo('${x.anexo}')">ver</button>` : ""}</span>
      ${x.acao ? `<button type="button" class="tl-bt" onclick="${x.acao.js}">${esc(x.acao.rot)}</button>` : ""}</li>`;
  const docLi = a => `<li class="paq-doc${fora.has(a.k)?" fora":""}" data-k="${esc(a.k)}">${cx(a.k)}<button type="button" class="adr-link" onclick="abrirAnexo('${a.id}')">${esc(fonteDoDossie(a)[1])}</button>
      <small>${a.texto ? "lido" : a.paginas!=null ? "digitalizado" : "em leitura"}</small></li>`;
  const quadro = (q, n) => { const [v, t] = conta(q);
    return `<section class="paq" id="paq-${q.id}" data-q="${q.id}" aria-labelledby="paq-t-${q.id}">
      ${/* F320 · o título com o "?" que abre o que é e para que importa; à direita, quantos vão à Análise */""}
      <div class="paq-cab"><h3 id="paq-t-${q.id}"><i>${n}</i>${esc(q.rot)}</h3>
        <details class="paq-sobre"><summary aria-label="O que é este quadro">?</summary><div class="paq-sobre-c">
          <p class="paq-oque"><b>O que é:</b> ${esc(q.oque)}</p>
          ${q.achado && q.blocos.length ? `<p class="paq-achado"><b>O que encontramos:</b> ${esc(q.achado)}.</p>` : ""}
          ${q.importa ? `<p class="paq-importa"><b>Importa para:</b> ${esc(q.importa)}.</p>` : ""}</div></details>
        <span class="paq-n">${t ? `${v} de ${t} vão à Análise` : ""}</span>
        ${t ? `<button type="button" class="adr-link paq-todos" onclick="paMarcarQuadro('${c.id}','${q.id}')" title="marcar ou desmarcar todos"><span aria-hidden="true">Todos</span><span class="sr-only">marcar ou desmarcar todos</span></button>` : ""}</div>
      ${q.id===(cnisDe(c) || !previusDe(c) ? "cnis" : "prev") ? previusLinha(c) : ""}
      ${q.achado && !q.blocos.length ? `<p class="paq-achado"><b>O que encontramos:</b> ${esc(q.achado)}.</p>` : ""}
      ${q.vazio ? `<p class="paq-vazio">Sem dado: ${esc(q.vazio)}.</p>` : ""}
      ${q.blocos.length ? `<div class="paq-blocos">${q.blocos.map(([r, val, est])=>`<div class="paq-bloco"><small title="${esc(r)}">${esc(PA_BLOCO_ROT[r] || r)}</small><b class="${est==="crit"?" crit":""}">${esc(PA_BLOCO_VAL(val))}</b></div>`).join("")}</div>` : ""}
      ${q.extra==="linha" && !(q.id==="cnis" && q.itens.length) ? `<div class="paq-rola">${paLinhaDoTempo(c, qd)}</div>` : ""}
      ${q.id==="cnis" && q.itens.length ? itensDoCnis(q.itens, (x, quem)=>itemLi(x, 0, quem), qd, q.extra==="linha" ? `<div class="paq-rola">${paLinhaDoTempo(c, qd)}</div>` : "")
      : q.itens.length ? `<ul class="paq-itens${q.itens.length > PA_VISIVEIS ? " recolhido" : ""}">${q.itens.map(itemLi).join("")}</ul>
        ${q.itens.length > PA_VISIVEIS ? `<button type="button" class="adr-link paq-mais" aria-expanded="false" data-n="${q.itens.length - PA_VISIVEIS}" onclick="paMais(this)">mostrar mais ${q.itens.length - PA_VISIVEIS}</button>` : ""}` : ""}
      ${q.extra==="tabela" ? `<div class="paq-rola">${tabelaRaisCaged(qd.fd, qd.g)}</div>` : ""}
      ${q.extra==="transp" ? `<div class="paq-rola">${quadroTransparencia(c)}</div>` : ""}
      ${q.docs.length ? `<div class="paq-docs"><span class="meio-sub">Documentos deste quadro</span><ul>${q.docs.map(docLi).join("")}</ul></div>` : ""}
    </section>`; };
  const sinal = t => { const [selo0, cls] = PA_SELO[t.selo], dt = t.selo==="crit" && t.prazo && (String(t.prazo.texto||"").match(/até (\d{2}\/\d{2}\/\d{4})/)||[])[1];
    const selo = dt ? `Prazo até ${dt}` : selo0;
    return `<li><span class="pa-selo ${cls}"><i></i>${selo}</span><b>${esc(t.f.rot)}</b><span>${esc(curtoMapa(t.forte.fatos[0].texto))}</span>
      ${t.impedido ? `<span class="pa-falta"><b>${t.selo==="opcao" ? "Opção" : "Impedimento"}</b> ${esc(t.impedido)}</span>` : ""}
      ${t.falta.length ? `<span class="pa-falta"><b>Falta:</b> ${esc(t.falta.slice(0, 2).join("; "))}</span>` : ""}</li>`; };
  const passo = (n, rot, sub, cur, js) => `<button type="button" class="pa-passo${cur?" cur":""}" ${cur?'aria-current="step"':""} onclick="${js}"><i>${n}</i><span><b>${rot}</b><small>${esc(sub)}</small></span></button>`;
  // F238 · um quadro por passo, na ordem da conversa; o quadro sem nada a mostrar entra no passo "Não encontrado"
  const cheio = q => q.itens.length || q.docs.length || q.blocos.length || q.extra, temFalta = qd.quadros.some(q=>q.id==="falta");
  const grupos = qd.quadros.filter(q=>cheio(q) || !temFalta || q.id==="falta").map(q=>({id:q.id, qs:[q]}));
  if(temFalta) grupos.find(g=>g.id==="falta").qs.unshift(...qd.quadros.filter(q=>!(cheio(q) || q.id==="falta")));
  const passos = semDz ? [] : [...grupos.map(g=>{ const q = g.qs[g.qs.length-1], [v, t] = g.qs.map(conta).reduce((a, b)=>[a[0]+b[0], a[1]+b[1]], [0, 0]);
    return {id:g.id, rot:PA_PASSO_ROT[q.id] || q.rot.split(":")[0], conta:t ? `${v}/${t}` : "", alerta:g.qs.some(q=>q.itens.some(x=>x.est==="crit"))}; }),
    {id:"escolha", rot:"Escolher os benefícios", conta:"", alerta:false}];
  const tp = passos.length > 1 ? passosDaTela("pa", c, passos) : null, oculto = id => tp && !tp.tudo && id!==tp.at ? " hidden" : "";
  let nq = 0;
  const urg = semDz ? [] : d.trabalhos.filter(t=>t.selo==="crit" && t.prazo && t.prazo.texto);
  return `<div class="pa${tp ? ` tp-raiz${tp.tudo ? " tp-tudo" : ""}` : ""}"${tp ? tp.attrs : ""}>
    <nav class="pa-passos" aria-label="Passos do atendimento">
      ${passo("✓", "Identificação", "conferida", false, "irSubCad('identificacao')")}
      ${passo(2, "Primeiro atendimento", "leitura do dossiê", true, "")}
      ${passo(3, "Análise de Direito", nEsc ? `${nEsc} ${nEsc===1?"benefício":"benefícios"}` : "nenhum benefício", false, `paIrAnalise('${c.id}')`)}
      ${passo(4, "Documentos", "pedido, guias e geração", false, "irSubCad('documentos')")}
    </nav>
    ${/* F320 · sem o título, a linha da leitura e a legenda: a data do dossiê fica no title do Mapa, no pé */""}
    ${(n => n ? `<p class="meio-sub" role="status">Lendo o dossiê: faltam ${n} ${n===1?"documento":"documentos"}; os quadros se completam sozinhos.</p>` : "")(dossieFaltaLer(c.id))}
    ${(n => n && !nomeIgual(n, c.nome) ? `<p class="pa-nome-dif" role="alert"><b>Nome diferente do CNIS.</b> No CRM consta <b>${esc(c.nome||"")}</b>, e no CNIS consta <b>${esc(n)}</b>. <button type="button" class="btn-mini" onclick="usarNomeCnis('${c.id}')" title="Usar o nome do CNIS">Usar<span class="sr-only"> o nome do CNIS</span></button></p>` : "")(nomeDoCnis(c))}
    ${semDz ? `<section class="pa-sem-dz" aria-label="Sem dossiê">
      <p><b>O dossiê ainda não foi baixado.</b> Os quadros nascem quando a extensão trouxer os documentos dos portais com o gov.br do cliente. Até lá, escolha o benefício abaixo e siga para a Análise de Direito.</p>
      ${previusLinha(c)}
      ${(ns=>ns.length ? `<div class="pa-relato"><span class="meio-sub">O que a recepção registrou</span>${ns.map(n=>`<p><b>${esc(n.quem||"")}</b> <span class="meio-sub">${n.em?esc(fmtTS(n.em)):""}</span> ${esc(String(n.texto||"").slice(0,1500))}</p>`).join("")}</div>` : "")(((c.campos||{}).atendimento||[]).slice(-3))}
    </section>` : `${tp ? tp.trilha : ""}
    ${grupos.map(g=>`<div class="tp-passo" data-passo="${g.id}"${oculto(g.id)}>${g.qs.map(q=>quadro(q, ++nq)).join("")}</div>`).join("")}`}
    <section class="paq paq-escolha${tp ? " tp-passo" : ""}" id="paq-escolha" data-passo="escolha"${oculto("escolha")} aria-labelledby="paq-t-escolha">
      <div class="paq-cab"><h3 id="paq-t-escolha"><i>✓</i>Benefícios para a Análise de Direito</h3></div>
      <p class="paq-oque">Marque os benefícios que vão à Análise de Direito; lá, cada um abre os requisitos dele.${d.trabalhos.length && !semDz ? " Os que têm sinal no dossiê vêm primeiro." : ""}</p>
      ${!semDz && d.trabalhos.length ? `<ul class="paq-sinais">${d.trabalhos.map(sinal).join("")}</ul>` : ""}
      ${faixaBeneficios(c, semDz ? null : d)}
      ${roteiroPerguntas(c, ks)}
    </section>
    <div class="paq-barra">${semDz ? "" : `<button type="button" class="adr-link paq-mapa" onclick="irSubCad('mapa')" title="dossiê baixado em ${ems.length ? esc(fmtBarra(ems[ems.length-1].slice(0,10))) : "—"} · ${nDocs} ${nDocs===1?"documento":"documentos"} · ${esc(Object.keys(dz).map(k=>PORT[k]||k).join(", ")||"nenhum portal")}">Mapa do dossiê</button>`}
      <span class="tp-nav">${tp ? tp.nav : ""}<button type="button" class="pa-prim tp-fim" ${nEsc?"":"disabled"}${tp && !tp.ult ? " hidden" : ""} onclick="paConcluir('${c.id}')">${pc ? "Concluir e levar" : "Levar"} à Análise de Direito →</button></span></div>
  </div>`;
}
// F320 · os rótulos curtos dos números do CNIS (o completo fica no title)
const PA_BLOCO_ROT = {"Qualidade de segurado":"Qualidade", "Carência (meses de contribuição)":"Carência", "Tempo pelo CNIS":"Tempo"};
const PA_BLOCO_VAL = v => String(v).replace(/^(\d+) hoje; (\d+) com o acerto$/, "$1 · $2 com acerto");
const PA_PASSO_ROT = {cnis:"CNIS", prev:"Prévius", ped:"Pedidos ao INSS", roca:"Roça e pesca", cad:"CadÚnico", ben:"Cartas e extratos", falta:"Não encontrado"};
// ══════════════════════════════════════════════════════════════════════════
// F238 · PASSOS DENTRO DE UMA PÁGINA LONGA (crm/fase2/docs/ATENDIMENTO-EM-ETAPAS.md)
// ══════════════════════════════════════════════════════════════════════════
// Uma trilha com flechas, um passo à vista e a barra do pé com Anterior e Próximo. Nenhum passo é
// trancado. Todos ficam na página; os de fora só ficam escondidos, e "Ver tudo numa página" tira o
// esconder. O passo aberto vale por pré-caso (casos.ad.passos) e volta quando se reabre o atendimento.
const _passoAt = new Map(), _passoVisto = new Map();
const passoChave = (tela, c) => `${tela}|${c.id}|${(preCasoAberto(c)||{}).id||""}`;
const verTudoPassos = () => ler("crm_passos_tudo")==="1";
// monta o estado da tela: o passo aberto, os já vistos, a trilha e os botões do pé
function passosDaTela(tela, c, passos){
  const ids = passos.map(p=>p.id), ch = passoChave(tela, c);
  let at = _passoAt.get(ch) || (admDe(c).passos||{})[tela];
  if(!ids.includes(at)) at = ids[0];
  _passoAt.set(ch, at);
  const i = ids.indexOf(at), tudo = verTudoPassos();
  const visto = _passoVisto.get(ch) || new Set(ids.slice(0, i + 1)); visto.add(at); _passoVisto.set(ch, visto);
  const ult = tudo || i===ids.length-1;
  const trilha = `<div class="tp-rola"><ol class="tp-trilha" aria-label="Passos desta página">${passos.map((p, j)=>{ const cur = !tudo && j===i, ok = !cur && visto.has(p.id);
    return `<li class="${[cur?"aqui":"", ok?"feito":"", p.alerta?"alerta":""].filter(Boolean).join(" ")}" data-passo="${p.id}" data-rot="${esc(p.rot)}">
      <button type="button" onclick="passoIr('${tela}','${c.id}','${p.id}')"${cur ? ' aria-current="step"' : ""}><span class="tp-n">${ok ? "✓" : j+1}</span>${esc(p.rot)}${p.conta ? ` <span class="tp-conta">${esc(p.conta)}</span>` : ""}</button></li>`; }).join("")}</ol></div>`;
  const nav = `<span class="tp-onde">${tudo ? "Página inteira" : `Passo ${i+1} de ${ids.length}`}</span>
    <label class="tp-chave"><input type="checkbox"${tudo ? " checked" : ""} onchange="passoTudo(this.checked)"> Ver tudo numa página</label>
    <button type="button" class="tl-bt tp-ant"${tudo ? " hidden" : ""}${i===0 ? " disabled" : ""} onclick="passoVai('${tela}','${c.id}',-1)">← Anterior</button>
    <button type="button" class="pa-prim tp-prox"${ult ? " hidden" : ""} onclick="passoVai('${tela}','${c.id}',1)">${ult ? "" : `Próximo: ${esc(passos[i+1].rot)} →`}</button>`;
  return {at, tudo, ult, trilha, nav, attrs:` data-tp="${tela}" data-cli="${c.id}" data-at="${at}"`};
}
// repinta só a trilha, os passos e o pé, sem repintar a ficha (o que se digitou fica)
function passoPinta(root){
  const tudo = root.classList.contains("tp-tudo"), lis = [...root.querySelectorAll(".tp-trilha > li")], ids = lis.map(l=>l.dataset.passo);
  const i = Math.max(0, ids.indexOf(root.dataset.at)), c = D.cliPorId.get(root.dataset.cli), visto = (c && _passoVisto.get(passoChave(root.dataset.tp, c))) || new Set();
  lis.forEach((l, j)=>{ const cur = !tudo && j===i, ok = !cur && visto.has(l.dataset.passo), b = l.querySelector("button");
    l.classList.toggle("aqui", cur); l.classList.toggle("feito", ok);
    cur ? b.setAttribute("aria-current", "step") : b.removeAttribute("aria-current");
    l.querySelector(".tp-n").textContent = ok ? "✓" : String(j+1); });
  root.querySelectorAll(".tp-passo").forEach(s=>{ s.hidden = !tudo && s.dataset.passo!==ids[i]; });
  const ult = tudo || i===ids.length-1, ant = root.querySelector(".tp-ant"), prox = root.querySelector(".tp-prox"), onde = root.querySelector(".tp-onde");
  if(ant){ ant.hidden = tudo; ant.disabled = i===0; }
  if(prox){ prox.hidden = ult; prox.textContent = ult ? "" : `Próximo: ${lis[i+1].dataset.rot} →`; }
  root.querySelectorAll(".tp-fim").forEach(b=>{ b.hidden = !ult; });
  if(onde) onde.textContent = tudo ? "Página inteira" : `Passo ${i+1} de ${ids.length}`;
  // na tela estreita a trilha rola de lado: o passo aberto fica à vista
  const rola = root.querySelector(".tp-rola"), li = lis[i];
  if(rola && li && (li.offsetLeft < rola.scrollLeft || li.offsetLeft + li.offsetWidth > rola.scrollLeft + rola.clientWidth)) rola.scrollLeft = Math.max(0, li.offsetLeft - 24);
}
function passoIr(tela, cliId, id){
  const root = document.querySelector(`[data-tp="${tela}"][data-cli="${cliId}"]`), c = D.cliPorId.get(cliId); if(!root || !c) return;
  const ch = passoChave(tela, c), visto = _passoVisto.get(ch) || new Set();
  visto.add(id); _passoVisto.set(ch, visto); _passoAt.set(ch, id); root.dataset.at = id;
  passoPinta(root);
  const alvo = root.classList.contains("tp-tudo") ? root.querySelector(`.tp-passo[data-passo="${id}"]`) : root.querySelector(".tp-rola");
  if(alvo && (root.classList.contains("tp-tudo") || alvo.getBoundingClientRect().top < 0)) alvo.scrollIntoView({block:"start"});
  if(linhaAd(c) && (admDe(c).passos||{})[tela]!==id) admSalvar(cliId, a=>{ a.passos = {...(a.passos||{}), [tela]:id}; });
}
function passoVai(tela, cliId, d){
  const root = document.querySelector(`[data-tp="${tela}"][data-cli="${cliId}"]`); if(!root) return;
  const ids = [...root.querySelectorAll(".tp-trilha > li")].map(l=>l.dataset.passo), i = ids.indexOf(root.dataset.at);
  passoIr(tela, cliId, ids[Math.max(0, Math.min(ids.length-1, i + d))]);
}
function passoTudo(on){
  guardar("crm_passos_tudo", on ? "1" : "0");
  document.querySelectorAll("[data-tp]").forEach(r=>{ r.classList.toggle("tp-tudo", on); r.querySelectorAll(".tp-chave input").forEach(x=>{ x.checked = on; }); passoPinta(r); });
}
// "mostrar mais": abre e fecha a lista no lugar
function paMais(bt){
  const ul = bt.previousElementSibling, aberto = !ul.classList.toggle("recolhido");
  bt.setAttribute("aria-expanded", String(aberto)); bt.textContent = aberto ? "mostrar menos" : `mostrar mais ${bt.dataset.n}`;
}
// o botão da barra: com pré-caso conclui a etapa (grava quem e quando e avisa) e leva à análise
async function paConcluir(cliId){
  const c = D.cliPorId.get(cliId); if(!c) return;
  if(!Object.keys(benefSel(c)).length) return aviso("Marque ao menos um benefício");
  if(preCasoAberto(c)) await concluirEtapa(cliId, "pa");
  paIrAnalise(cliId);
}
// F230 · os integrantes do CadÚnico com CPF/NIS e o que o Portal da Transparência
// já disse de cada um; o botão chama a Edge Function `transparencia` (crm/fase2/transparencia),
// que consulta a API com a chave guardada no Supabase e grava clientes.dossie.transparencia
const familiaCadunico = c => (c && c.dossie && c.dossie.cadunico && c.dossie.cadunico.familia) || null;
function quadroTransparencia(c){
  const fz = familiaCadunico(c); if(!fz) return "";
  const tr = (c.dossie||{}).transparencia||{}, por = new Map((tr.pessoas||[]).flatMap(p=>[[p.cpf,p],[p.nis,p]]).filter(([k])=>k));
  // F235 · a conta do BPC ao lado da ficha: a idade, a renda de cada um e se entra na conta (o parentesco é com a responsável)
  const bc = typeof bpcContaDe==="function" ? bpcContaDe(c) : null, rc = fz.renda_cnis || [];
  const renda = m => { const r = rc.find(x=>dsa(x.nome)===dsa(m.nome)); if(!r) return "—"; const d = r.declarado || {};
    const sal = Math.max(+r.remuneracao_ultimo_mes||0, +d.remuneracao_mes_anterior||0), bs = (r.beneficios_inss||[]).map(b=>`${String(b.especie||"benefício").toLowerCase()} ${moeda(b.valor)}`);
    return [sal ? `${moeda(sal)} de trabalho` : "", ...bs].filter(Boolean).join("; ") || "sem renda"; };
  const naConta = m => { if(!bc) return "—"; const d = (bc.det||[]).find(d=>d.m===m);
    return d ? (d.apr ? "entra; o salário de aprendiz não conta" : d.fora ? "entra; o benefício de até 1 salário mínimo não conta" : "entra")
      : (bc.duvida||[]).includes(m) ? "confirmar: só entra se for solteiro" : (bc.tirados||[]).includes(m) ? "fica fora: não é solteiro" : (bc.fora||[]).includes(m) ? "fica fora: não está no rol da lei" : "—"; };
  const linha = m => { const p = por.get(m.cpf) || por.get(m.nis), id = m.nascimento ? idadeDe(String(m.nascimento).slice(0,10)) : null;
    // F235 · os meses pagos à pessoa, e não a data do programa ("Bolsa Família (novo, desde 03/2023)" fazia ler que recebe desde 2023)
    const comp = s => { const d = soDig(s); return d.length===6 ? (/^(19|20)/.test(d) ? `${d.slice(4)}/${d.slice(0, 4)}` : `${d.slice(0, 2)}/${d.slice(2)}`) : String(s||""); };
    const prog = p ? (p.programas||[]).map(x=>`${String(x.rotulo||x.programa).replace(/\s*\((?:novo|antigo)?,?\s*desde [^)]*\)/i, "")}: ${plu(+x.meses||0, "pagamento", "pagamentos")}${x.primeira_competencia ? `, de ${comp(x.primeira_competencia)} a ${comp(x.ultima_competencia)}` : ""}, último ${moeda(x.valor_ultimo)}`).join("; ") : "";
    return `<tr><td>${esc(m.nome||"")}${m.responsavel?" <small>(RF)</small>":""}</td><td>${esc(m.parentesco||"")}</td><td class="mono">${id!=null ? id : "—"}</td><td>${esc(renda(m))}</td><td>${esc(naConta(m))}</td><td class="mono">${esc(fmtCpf(m.cpf))}</td><td class="mono">${esc(m.nis||"—")}</td>
      <td>${p ? (p.erro ? esc(p.erro) : prog || "sem pagamento encontrado") : "ainda não consultado"}</td></tr>`; };
  const resumoBpc = bc ? `<p class="meio-sub">A ficha do CadÚnico dá ${moeda(fz.renda_por_pessoa)} por pessoa: é a conta do cadastro, com todos da casa e sem o Bolsa Família. A conta do BPC é outra: ${moeda(bc.pc)} por pessoa (${plu(bc.n, "pessoa", "pessoas")} no grupo da lei)${bc.pc <= bc.lim + 1e-9 ? `, dentro do limite de ${moeda(bc.lim)}` : `, acima do limite de ${moeda(bc.lim)}`}; a conta inteira está na Análise de Direito.</p>` : "";
  return `<div class="pa-transp"><div class="pa-det-cab"><h4>Integrantes no Portal da Transparência</h4><span class="pa-det-dir">
      <span class="meio-sub">${tr.em ? `consultado em ${esc(fmtBarra(String(tr.em).slice(0,10)))}` : "ainda não consultado"}</span>
      <button type="button" class="btn-mini" id="pa-transp-bt" onclick="consultarTransparencia('${c.id}')" title="🔎 Consultar os integrantes">🔎 Consultar<span class="sr-only"> os integrantes</span></button></span></div>
    ${resumoBpc}
    <table class="pa-tabela"><thead><tr><th>Integrante</th><th>Parentesco com a responsável</th><th>Idade</th><th>Renda no CadÚnico</th><th>Na conta do BPC</th><th>CPF</th><th>NIS</th><th>Portal da Transparência</th></tr></thead>
    <tbody>${(fz.membros||[]).map(linha).join("")}</tbody></table></div>`;
}
async function consultarTransparencia(cliId){
  const c = D.cliPorId.get(cliId), fz = c && familiaCadunico(c); if(!fz) return;
  const pessoas = (fz.membros||[]).filter(m=>m.cpf||m.nis).map(m=>({nome:m.nome, cpf:m.cpf, nis:m.nis}));
  const bt = document.getElementById("pa-transp-bt"); if(bt){ bt.disabled = true; bt.textContent = "Consultando…"; }
  let r;
  try{ r = await api("/functions/v1/transparencia", {method:"POST", body:JSON.stringify({cliente_id:cliId, pessoas})}); }
  catch(e){ r = {aviso:"O Portal da Transparência não respondeu: " + (e.message||e)}; }
  const [n] = await api(`/rest/v1/clientes?select=dossie&id=eq.${cliId}`).catch(()=>[]) || [];
  if(n) c.dossie = n.dossie;
  aviso((r && (r.aviso || r.erro)) || "Portal da Transparência consultado", false);
  repintarFicha();
}
// leva à Análise de Direito, que abre pelo quadrado dos benefícios escolhidos
function paIrAnalise(cliId){
  const c = D.cliPorId.get(cliId); if(!c) return;
  if(!Object.keys(benefSel(c)).length) return aviso("Marque ao menos um benefício");
  adVisivel.add(cliId); irSubCad("direito");   // F234 · o quadrado dos benefícios; cada um abre no clique
}
const _paAnalise = new Map();
function painelMapa(c, ks){
  const fam = familiaDoMapa(c, ks);
  const lentes = `<div class="mapa-lentes" role="group" aria-label="Espécie do mapa">${PONTOS_ESPECIE.map(f=>
    `<button type="button" class="tri-p${fam && f.chave===fam.chave ? " on" : ""}" aria-pressed="${!!fam && f.chave===fam.chave}"
      onclick="mapaLente('${c.id}','${f.chave}')">${esc(f.rot)}</button>`).join("")}</div>`;
  if(!fam) return `<div class="mapa"><div class="mapa-topo">${lentes}</div>
    <p class="meio-sub">Escolha a espécie: o mapa mostra só o que ela usa do dossiê.</p></div>`;
  const {ramos, fora} = ramosDoMapa(c, ks, fam);
  const n = ramos.length, ab = _mapaAberto.has(c.id) ? _mapaAberto.get(c.id)
    : ((ramos.find(r=>r.est==="crit"||r.est==="warn")||{}).id || "");
  const nDocs = docsDoDossie(c.id).length;
  const iAb = ramos.findIndex(r=>r.id===ab);
  const fatos = r => `<div class="mapa-fatos" style="grid-row:${iAb+1} / span ${n-iAb}">
      ${r.dica ? `<p class="meio-sub mapa-dica">${esc(r.dica)}</p>` : ""}
      ${r.fatos.length ? `<ul class="mapa-lista">${r.fatos.map(x=>`<li class="est-${x.est}"><i class="mapa-bola" aria-hidden="true"></i>
        <span>${esc(x.texto)}</span>
        <span class="dossie-orig">${esc(x.fonte||"")}${x.anexo?` <button type="button" class="adr-link" onclick="abrirAnexo('${x.anexo}')">ver</button>`:""}</span>
        ${x.acao?`<button type="button" class="tl-bt" onclick="${x.acao.js}">${esc(x.acao.rot)}</button>`:""}</li>`).join("")}</ul>`
        : `<p class="meio-sub">O dossiê ainda não traz fato para este ponto.</p>`}
      ${r.ponto ? `<div class="mapa-resp" role="group" aria-label="Resposta">${TRIAGEM_ESTADOS.slice(0, 2).map(([e, rot])=>
          `<button type="button" class="tri-p${r.resp.estado===e ? " on" : ""}" aria-pressed="${r.resp.estado===e}"
            onclick="marcarTriagem('${c.id}','${r.id}','${e}')">${rot}</button>`).join("")}</div>
        <label class="tri-obs">Anotação, que vai para a Análise de Direito
          <textarea class="tri-nota" id="tri-${r.id}" rows="2" placeholder="o que foi visto neste ponto"
            onblur="salvarNotaTriagem('${c.id}','${r.id}')">${esc(r.resp.nota||"")}</textarea></label>` : ""}
      ${r.fatos.some(x=>x.anexo) ? `<button type="button" class="tl-bt" onclick="mapaClaude('${c.id}','${r.id}')" title="Pedir ao Claude com os documentos deste ramo"><span aria-hidden="true">Claude</span><span class="sr-only">Pedir ao Claude com os documentos deste ramo</span></button>` : ""}
      <button type="button" class="tl-bt" onclick="irSubCad('pa')" title="Escolher no Primeiro atendimento">Escolher<span class="sr-only"> no Primeiro atendimento</span></button>
    </div>`;
  return `<div class="mapa">
    <div class="mapa-topo">${lentes}
      <button type="button" class="tl-bt forte" onclick="irSubCad('pa')" title="o Mapa só mostra; o que vai à Análise de Direito se escolhe no Primeiro atendimento">Escolher<span class="sr-only"> no Primeiro atendimento</span></button></div>
    <div class="mapa-arvore">
      <div class="mapa-raiz" style="grid-row:1 / span ${n||1}"><b>${esc(fam.rot)}</b>
        <span>${esc(especieDoCliente(c, ks) || "espécie não anotada no caso")}</span>
        <small>${nDocs} documento${nDocs===1?"":"s"} no dossiê</small></div>
      ${ramos.map((r, i)=>`<div class="mapa-ramo est-${r.est}${r.id===ab?" aberto":""}${i===0?" primeiro":""}${i===n-1?" ultimo":""}" data-ramo="${r.id}" style="grid-row:${i+1}">
        <button type="button" class="mapa-no" aria-expanded="${r.id===ab}" onclick="mapaAbrir('${c.id}','${r.id}')">
          <b>${esc(r.rot)}</b><span>${esc(fraseDoRamo(r))}</span>${mapaVai(c.id, r.id) ? "" : `<small class="mapa-fora-tag">fora da análise</small>`}<i aria-hidden="true">${r.id===ab?"−":"+"}</i></button></div>
        ${r.id===ab ? fatos(r) : ""}`).join("")}
    </div>
    ${fora.length ? `<details class="mapa-fora"><summary>Fora do mapa de ${esc(fam.rot.toLowerCase())} (${fora.length})</summary>
      <ul>${fora.map(x=>`<li>${esc(x.texto)} <span class="dossie-orig">${esc(x.fonte||"")}</span></li>`).join("")}</ul></details>` : ""}
  </div>`;
}
function mapaLente(cliId, chave){ _mapaLente.set(cliId, chave); _mapaAberto.delete(cliId); repintarFicha(); }
function mapaAbrir(cliId, ramo){ _mapaAberto.set(cliId, _mapaAberto.get(cliId)===ramo ? "" : ramo); repintarFicha(); }
function mapaClaude(cliId, ramoId){
  const c = D.cliPorId.get(cliId), ks = D.casosDoCliente.get(cliId) || [];
  const fam = c && familiaDoMapa(c, ks); if(!fam) return;
  const r = ramosDoMapa(c, ks, fam).ramos.find(x=>x.id===ramoId); if(!r) return;
  const k = ks.find(x=>x.fase!=="encerrado") || ks[0];
  if(!k) return aviso("O pedido ao Claude parte de um caso: abra o caso do cliente primeiro");
  menuClaudeDocs(k.id, [...new Set(r.fatos.filter(x=>x.anexo).map(x=>`anexo:${x.anexo}`))]);
  const t = document.getElementById("cl-livre");
  const area = r.fatos.some(x=>x.grupo==="medicos" || x.grupo==="laudo") ? areaClinica(linhaClinica(cliId)) : null;
  if(t) t.value = `Com as skills ${fam.skill}, examine o ponto "${r.rot}" nestes documentos e diga o que está provado, o que falta provar e o risco principal.`
    + (area ? ` Para os documentos médicos, use o agente base-conhecimento-inss:${area.agente}.` : "");
}
// a passagem à Análise de Direito: o formulário abre preenchido com o mapa,
// e só grava no clique de Registrar análise
function caixaApos(cli){
  const lista=aposDoCliente(cli);
  const auto=lista.find(a=>a.automatica);
  const temIdadeManual=(D.apos||[]).some(a=>a.cliente_id===cli.id && dsa(a.especie)==="idade");
  const sexo=sexoDe(cli);
  const jaPassou = !temIdadeManual && idadeJaPassou(cli);
  const botoesSexo = `<button class="btn-mini" onclick="definirSexo('${cli.id}','F')">mulher</button>
    <button class="btn-mini" onclick="definirSexo('${cli.id}','M')">homem</button>`;
  const fonte = {andamento:"encontrado nos andamentos", cnis:"conferido no CNIS",
                 manual:"marcado à mão"}[cli.aposentado_fonte] || "";
  return `<div class="apos-cx" id="apos-cx">
    <div class="apos-cab">
      <strong>🎂 Aposentadoria provável</strong>
      ${/* dizer "já se aposentou" não pode esperar a idade passar: quem se
           aposenta por tempo de contribuição se aposenta ANTES da data que
           o sistema projeta pela idade */""}
      ${(cli.aposentado===true||jaPassou)?"":`<button class="btn-mini"
        onclick="marcarAposentado('${cli.id}',1)"
        title="marca como já aposentado e desliga o aviso — desfaz-se aqui mesmo"><span aria-hidden="true">✔ Aposentado</span><span class="sr-only">✔ já se aposentou</span></button>`}
      <button class="apos-mais" onclick="novaApos('${cli.id}')" title="acrescentar outra data">＋</button>
    </div>
    ${cli.aposentado===true ? `<div class="apos-ja">✔ <b>Já aposentado</b>
        ${fonte?`<span class="meio-sub">(${fonte}${cli.aposentado_em?" · "+fmt(cli.aposentado_em):""})</span>`:""}
        <button class="btn-mini" onclick="marcarAposentado('${cli.id}',null)">não está</button>
        ${cli.aposentado_prova?`<div class="apos-prova">“${esc(cli.aposentado_prova)}”</div>`:""}</div>`
    : lista.length ? lista.map(a=>`<div class="apos-it ${a.automatica?"auto":""}">
        <span class="apos-data">${fmt(a.data)}</span>
        <span class="apos-esp">${esc(a.especie)}</span>
        ${(kA=>kA ? `<span class="apos-av ja">⚖️ em caso: ${esc(tituloCaso(kA))} · ${esc(NOME_FASE[kA.fase]||kA.fase||"")}</span>` : "")(casoAposAtivo(cli.id, true))}
        ${casoAposAtivo(cli.id, true) ? "" : a.lembrar_em && a.lembrar_em>hoje()
          ? `<span class="apos-av">🗓 adiado — lembra em ${fmt(a.lembrar_em)}</span>`
          : a.data<=hoje() ? `<span class="apos-av ja">✓ já tem direito</span>`
                           : `<span class="apos-av">🔔 avisa em ${fmt(avisoApos(a.data))}</span>`}
        <input type="date" class="apos-lem" min="${hoje()}" value="${a.lembrar_em||""}"
          title="adiar o aviso: sai do Meu Dia e volta na data escolhida"
          onchange="lembrarApos('${cli.id}','${a.id}','${a.data}','${escJs(a.especie)}',this.value)">
        ${a.automatica
          ? `<button class="btn-mini" onclick="novaApos('${cli.id}','${a.data}','${escJs(a.especie)}')"
               title="gravar com ajuste">ajustar</button>`
          : `<button class="apaga-arq" onclick="apagarApos('${a.id}')" title="apagar">✕</button>`}
      </div>`).join("")
      : `<div class="meio-sub">${jaPassou ? "Sem data futura."
          : "Sem data ainda" + (dnIso(cli.dn)?"":" — falta a data de nascimento") + "."}</div>`}
    ${cli.aposentado===true ? ""
     : jaPassou ? `<div class="apos-nota">Completou ${IDADE_APOS[sexo]} anos em
        ${fmt(dataIdadeApos(cli))}: com o tempo de contribuição, provavelmente já se aposentou —
        por isso a aposentadoria por idade não entra como provável.
        <b>Confira no CNIS</b> (📁 Drive, no cadastro) e responda:
        <span class="apos-sexo">
          <button class="btn-mini" onclick="marcarAposentado('${cli.id}',1)">já se aposentou</button>
          <button class="btn-mini" onclick="marcarAposentado('${cli.id}',0)">não se aposentou</button>
        </span></div>`
     : auto ? `<div class="apos-nota">Calculada pelo nascimento (${IDADE_APOS[auto.sexoUsado]} anos,
        ${auto.sexoUsado==="F"?"mulher":"homem"}${auto.suposto?" — pelo nome":""}).
        <b>É automática: confira a carência e a regra de transição.</b>
        ${auto.suposto?`<span class="apos-sexo">Não é? ${botoesSexo}</span>`:""}</div>`
     : (!sexo && dnIso(cli.dn) && !temIdadeManual)
       ? `<div class="apos-nota">Não consegui deduzir pelo nome se é
          <span class="apos-sexo">${botoesSexo}</span></div>` : ""}
    ${(ct=>ct && cli.aposentado!==true ? `<div class="apos-nota apos-carencia">Carência pelo CNIS: <b>${ct.carencia} de 180</b> contribuições${
      ct.carencia>=180 ? ", cumprida" : `; faltam ${180-ct.carencia}`}. Tempo de ${anosMeses(ct.anos, ct.meses)}, contado por competência.</div>` : "")(((cnisDe(cli)||{}).analise||{}).contagem)}
    <div id="apos-form"></div>
  </div>`;
}
// ══════════════════════════════════════════════════════════════════════════
// F282 · MANUTENÇÃO DA QUALIDADE DE SEGURADO (pedido do Paulo, 26.10.2026)
// O plano de pagamento ao INSS de quem ainda não tem direito e precisa manter a
// qualidade de segurado. É do CLIENTE (vale para BPC e pensão, é acessório) e
// segue depois que os atendimentos se encerram. Nasce no parecer da Análise de
// Direito, aparece no Primeiro atendimento (Qualidade de segurado), em Documentos
// (a folha "Como pagar o INSS") e no quadro da Identificação, ao lado de
// Aposentadoria. Com o aviso ligado, o banco lembra o cliente pelo WhatsApp no dia
// do pagamento (zap_gerar_avisos_qualidade, crm/fase2/schema_qualidade.sql).
// ══════════════════════════════════════════════════════════════════════════
// F284 · as formas, nos nomes do Paulo (26.10.2026)
const QUAL_MODOS = {seis_semestral:"Pagar 6 meses e depois uma vez a cada 6 meses", mensal:"Pagar direto (todo mês)",
  semestral:"Pagar uma vez a cada 6 meses", anual:"Pagar uma vez a cada 12 meses", caso_a_caso:"Outra forma"};
const QUAL_CODIGOS = () => [["MEI","MEI (DAS)"], ...GPS_CATEGORIAS.map(([v,r])=>[v,`${v} — ${r}`]), ["outro","Outro"]];
function qualidadeDe(cliId){ return (D.qualidade||[]).filter(q=>q.cliente_id===cliId && q.ativo!==false); }
// P2 (prazos, 31.10.2026) · para que serve o pagamento: o plano deixou de ser só da qualidade de segurado
const QUAL_FIM = {qualidade:"Manter a qualidade de segurado", carencia:"Completar a carência", aposentadoria:"Alcançar a aposentadoria",
  complementacao:"Complementar competências abaixo do mínimo", indenizacao:"Indenizar período em atraso"};
const qualFim = q => QUAL_FIM[q.finalidade] || QUAL_FIM.qualidade;
// o texto do card das Aposentadorias futuras que fala em pagar o INSS ("tempo de contribuição" é o nome da espécie, e não pagamento)
const RX_PAGAR_CARD = /\bgps\b|\bguia\b|carn[eê]|recolh|\bpagar\b|pagando|\bpague\b|voltar a contribuir|\bcontribuir\b|contribui[cç][oõ]es|\bdas\b|facultativ|complementa|indeniza/i;
function trechosDePagamento(l){
  const d = l.detalhes||{}, tx = [l.titulo, ...((d.checklist||[]).map(x=>x && (x.texto||x))), ...((d.anotacoes||[]).map(x=>x && (x.texto||x)))];
  return tx.map(t=>String(t||"").replace(/tempo de contribui[cç][aã]o/gi, "TC")).filter(t=>RX_PAGAR_CARD.test(t))
    .map(t=>t.replace(/\bTC\b/g, "tempo de contribuição").replace(/\s+/g, " ").trim());
}
// a sugestão do plano lida do trecho: o código da guia e a primeira competência ("a partir de 07/2026")
function sugestaoDoTrecho(t){
  const cod = (String(t).match(/\b(1007|1163|1406|1473|1929|1287|1236)\b/)||[])[1] || (/\bmei\b|\bdas\b/i.test(t) ? "MEI" : "");
  const m = String(t).match(/(?:a partir d[aeo]|compet[eê]ncia(?: de)?|desde)\D{0,12}(\d{1,2})\/(\d{4})/i);
  return {codigo:cod, inicio: m ? `${m[2]}-${m[1].padStart(2,"0")}` : ""};
}
// o mês de pagamento ('AAAA-MM'), a mesma conta do banco (qualidade_paga_no_mes): conta do mês do primeiro vencimento
// (pagar_ate; nos planos da primeira versão, o início)
function qualidadePagaNoMes(q, ym){
  const b = String(q.pagar_ate || q.inicio);
  const n = (+ym.slice(0,4)*12 + +ym.slice(5,7)) - (+b.slice(0,4)*12 + +b.slice(5,7));
  if(n < 0 || (q.fim && ym > String(q.fim).slice(0,7))) return false;
  if(q.modalidade==="mensal") return true;
  if(q.modalidade==="semestral") return n % 6 === 0;
  if(q.modalidade==="anual") return n % 12 === 0;
  if(q.modalidade==="seis_semestral") return n < 6 || (n - 5) % 6 === 0;
  return (q.meses||[]).includes(ym);
}
// os próximos vencimentos, de hoje em diante: o dia do pagar_ate (o último dia, nos meses mais curtos)
function qualidadeProximos(q, k, desde){
  const out = [], h = desde || hoje(), dia = +(q.pagar_ate ? String(q.pagar_ate).slice(8,10) : q.dia || 15);
  let a = +h.slice(0,4), m = +h.slice(5,7);
  for(let i = 0; i < 360 && out.length < k; i++){
    const ym = `${a}-${String(m).padStart(2,"0")}`, ult = new Date(a, m, 0).getDate();
    const d = `${ym}-${String(Math.min(dia, ult)).padStart(2,"0")}`;
    if(qualidadePagaNoMes(q, ym) && d >= h) out.push(d);
    if(++m > 12){ m = 1; a++; }
  }
  return out;
}
// o aviso do WhatsApp: o primeiro dia útil do mês do vencimento, sem sábado, domingo e feriado nacional (fixo ou
// móvel), a mesma regra de qualidade_primeiro_util no banco
function qualidadeAviso(venc){
  let d = venc.slice(0,7)+"-01";
  while([0,6].includes(new Date(d+"T12:00:00").getDay()) || feriadosNacionais(+d.slice(0,4)).has(d)) d = somaDias(d, 1);
  return d;
}
const qualValor = v => v==null || v==="" ? "" : `R$ ${Number(v).toFixed(2).replace(".", ",")}`;
const qualGuia = q => q.codigo==="MEI" ? "DAS do MEI" : q.codigo && q.codigo!=="outro" ? `GPS código ${q.codigo}` : "guia do INSS";
function qualResumo(q){
  const px = qualidadeProximos(q, 1)[0];
  return `${QUAL_MODOS[q.modalidade]||q.modalidade} · ${qualGuia(q)}${q.valor ? ` · ${qualValor(q.valor)}` : ""}${px ? ` · próximo: pagar até ${fmtBarra(px)}` : " · sem pagamento por vir"}`;
}
// o bloco que vai à Identificação, ao Primeiro atendimento, à Análise de Direito e a Documentos
function blocoManutencao(c, onde){
  if(D.qualidade===null) return `<p class="meio-sub mq-falta">Rode o crm/fase2/schema_qualidade.sql no Supabase para usar a Manutenção da Qualidade de Segurado.</p>`;
  const qs = qualidadeDe(c.id);
  const intro = onde==="pa" ? "Sem direito a benefício hoje? Combine com o cliente como manter a qualidade de segurado; o parecer é dado na Análise de Direito."
    : onde==="analise" ? "O parecer: como o cliente paga o INSS para não perder a qualidade de segurado. Fica no cadastro dele, com o aviso pelo WhatsApp."
    : onde==="doc" ? "A folha para entregar ao cliente, com a guia, o valor e o calendário." : "";
  return `<div class="mq-bloco">${qs.length ? qs.map(q=>`<div class="mq-plano"><b>${esc(qualResumo(q))}</b>
      <small>${esc(qualFim(q))} · ${q.aviso_zap ? "WhatsApp automático ligado" : "sem aviso pelo WhatsApp"}${q.fim ? ` · até ${fmtBarra(String(q.fim).slice(0,10))}` : ""}${q.motivo ? ` · ${esc(q.motivo)}` : ""}</small>
      <span class="mq-bts"><button type="button" class="btn-mini" onclick="verQualidade('${c.id}')">Abrir</button>
      ${onde==="doc" || onde==="analise" ? `<button type="button" class="btn-mini" onclick="imprimirQualidade('${c.id}','${q.id}')" title="Imprimir para o cliente">Imprimir<span class="sr-only"> para o cliente</span></button>` : ""}</span></div>`).join("")
    : `${intro ? `<p class="meio-sub">${intro}</p>` : `<p class="meio-sub">Nenhum plano de pagamento.</p>`}
      <button type="button" class="btn-mini mq-novo" onclick="formQualidade('${c.id}','','${onde||""}')" title="Definir o plano"><span aria-hidden="true">Planejar</span><span class="sr-only">Definir o plano</span></button>`}</div>`;
}
function caixaQualidade(c){
  return `<section class="idf-card idf-qual" aria-labelledby="idf-qual">
    <h3 class="adr-h" id="idf-qual">Contribuições a pagar${qualidadeDe(c.id).length ? `<button type="button" class="cad-mini ac-mais" onclick="formQualidade('${c.id}','','')" title="outro plano" aria-label="acrescentar plano">${CAD_IC.mais}</button>` : ""}</h3>
    ${blocoManutencao(c, "")}</section>`;
}
function quadroManutencaoDoc(c){
  return `<section class="doc-quadro" id="dq-qualidade"><div class="rotulo-caso">Contribuições a pagar</div>${blocoManutencao(c, "doc")}</section>`;
}
let _qPre = null;   // P2 · o plano que nasce de um card: o card e a sugestão lida do texto dele
function formQualidade(cliId, id, onde, pre){
  _qPre = id ? null : (pre||null);
  const q = (D.qualidade||[]).find(x=>x.id===id) || {modalidade:"seis_semestral", codigo:"MEI", inicio:hoje(), aviso_zap:true, meses:[], finalidade: pre && pre.lembrete_id ? "aposentadoria" : "qualidade", ...((pre||{}).q||{})};
  caixa(`<div class="mq-modal" role="dialog" aria-labelledby="mq-t"><h3 id="mq-t">Contribuições a pagar</h3>
    ${pre && pre.trecho ? `<p class="meio-sub mq-trecho">Do card: “${esc(pre.trecho)}”</p>` : ""}
    <div class="mq-form">
      <label class="mq-largo">Para quê <select id="mq-fim-de">${Object.entries(QUAL_FIM).map(([v,r])=>`<option value="${v}"${(q.finalidade||"qualidade")===v?" selected":""}>${esc(r)}</option>`).join("")}</select></label>
      <label class="mq-largo">Como paga <select id="mq-mod" onchange="document.getElementById('mq-meses-l').hidden=this.value!=='caso_a_caso'">${Object.entries(QUAL_MODOS).map(([v,r])=>`<option value="${v}"${q.modalidade===v?" selected":""}>${r}</option>`).join("")}</select></label>
      <label>Guia <select id="mq-cod">${QUAL_CODIGOS().map(([v,r])=>`<option value="${v}"${q.codigo===v?" selected":""}>${esc(r)}</option>`).join("")}</select></label>
      <label>Valor (R$) <input id="mq-valor" type="number" step="0.01" min="0" value="${q.valor==null?"":esc(String(q.valor))}"></label>
      <label>Primeira competência <input id="mq-ini" type="month" value="${String(q.inicio||hoje()).slice(0,7)}"></label>
      <label>Pagar até <input id="mq-ate" type="date" value="${q.pagar_ate ? String(q.pagar_ate).slice(0,10) : ""}" title="o vencimento do primeiro pagamento; os seguintes caem no mesmo dia"></label>
      <label>Último pagamento (opcional) <input id="mq-fim" type="month" value="${q.fim ? String(q.fim).slice(0,7) : ""}"></label>
      <label id="mq-meses-l" class="mq-largo"${q.modalidade==="caso_a_caso"?"":" hidden"}>Meses de pagamento <input id="mq-meses" placeholder="11/2026, 05/2027" value="${(q.meses||[]).map(m=>`${m.slice(5)}/${m.slice(0,4)}`).join(", ")}"></label>
      <label class="mq-largo">Por que paga <input id="mq-mot" value="${esc(q.motivo||"")}" placeholder="ex.: mantém a qualidade até a aposentadoria por idade, em 2031"></label>
      <label class="cfg-ck mq-largo"><input type="checkbox" id="mq-zap"${q.aviso_zap?" checked":""}> Avisar o cliente pelo WhatsApp no primeiro dia útil do mês de cada pagamento, sozinho</label>
    </div>
    <div class="adr-modal-bts"><button type="button" class="adr-bt adr-primario" onclick="salvarQualidade('${cliId}','${q.id||""}','${onde||""}')">Guardar</button>
      <button type="button" class="adr-bt" onclick="fecharCaixa()">Cancelar</button></div></div>`);
}
async function salvarQualidade(cliId, id, onde){
  const v = i => ((document.getElementById(i)||{}).value||"").trim();
  const mod = v("mq-mod"), ate = v("mq-ate"), ini = v("mq-ini"), fim = v("mq-fim");
  const meses = v("mq-meses").split(/[,;\s]+/).map(x=>(x.match(/^(\d{1,2})\/(\d{4})$/)||[])).filter(m=>m[1]).map(m=>`${m[2]}-${m[1].padStart(2,"0")}`);
  if(!QUAL_MODOS[mod]) return aviso("Escolha como o cliente paga");
  if(!/^\d{4}-\d{2}$/.test(ini)) return aviso("Informe a primeira competência");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(ate)) return aviso("Informe o Pagar até: o dia, o mês e o ano do primeiro vencimento");
  if(fim && fim < ate.slice(0,7)) return aviso("O último pagamento vem depois do primeiro vencimento");
  if(mod==="caso_a_caso" && !meses.length) return aviso("Caso a caso: informe os meses, como 11/2026, 05/2027");
  const c = D.cliPorId.get(cliId), an = onde==="analise" && c ? (analisesDaVez(c)[0]||null) : null;
  const corpo = {cliente_id:cliId, modalidade:mod, codigo:v("mq-cod")||null, valor:v("mq-valor") ? Number(v("mq-valor")) : null, dia:+ate.slice(8,10), pagar_ate:ate,
    inicio:`${ini}-01`, fim: fim ? `${fim}-28` : null, meses: mod==="caso_a_caso" ? meses : [], motivo:v("mq-mot")||null,
    aviso_zap:!!(document.getElementById("mq-zap")||{}).checked, ativo:true, ...(an ? {analise_id:an.id} : {}),
    finalidade: v("mq-fim-de") || "qualidade", ...(_qPre && _qPre.lembrete_id ? {lembrete_id:_qPre.lembrete_id} : {})};
  try{
    if(id){ await api(`/rest/v1/qualidade_planos?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify(corpo)});
      Object.assign((D.qualidade||[]).find(x=>x.id===id)||{}, corpo); }
    else { const [q] = await api(`/rest/v1/qualidade_planos`,{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(corpo)});
      if(q) (D.qualidade = D.qualidade||[]).push(q); }
  }catch(e){ return aviso(/qualidade_planos|pagar_ate|finalidade|lembrete_id|modalidade_check|42P01|42703|PGRST20[45]/.test(String(e.message||e)) ? "Rode o crm/fase2/schema_qualidade.sql no Supabase (a versão nova)" : "Não consegui guardar o plano — tente de novo"); }
  fecharCaixa(); aviso(corpo.aviso_zap ? "Plano guardado: o WhatsApp lembra o cliente no primeiro dia útil do mês de cada pagamento" : "Plano guardado", false);
  if(clienteAberto) repintarFicha();
}
async function encerrarQualidade(id){
  if(!await confirmar("Encerrar este plano? O WhatsApp para de lembrar o cliente; o plano fica no histórico.")) return;
  try{ await api(`/rest/v1/qualidade_planos?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({ativo:false})}); }
  catch(e){ return aviso("Não consegui encerrar — tente de novo"); }
  const q = (D.qualidade||[]).find(x=>x.id===id); if(q) q.ativo = false;
  fecharCaixa(); aviso("Plano encerrado", false); if(clienteAberto) repintarFicha();
}
async function alternarZapQualidade(id, ligado){
  try{ await api(`/rest/v1/qualidade_planos?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({aviso_zap:ligado})}); }
  catch(e){ return aviso("Não consegui mudar o aviso — tente de novo"); }
  const q = (D.qualidade||[]).find(x=>x.id===id); if(q) q.aviso_zap = ligado;
  aviso(ligado ? "WhatsApp automático ligado" : "WhatsApp automático desligado", false); if(clienteAberto) repintarFicha();
}
// o Abrir: o plano, os próximos pagamentos, o aviso e o histórico do que o WhatsApp já mandou
async function verQualidade(cliId){
  const c = D.cliPorId.get(cliId); if(!c) return;
  const qs = qualidadeDe(cliId);
  let env = [];
  try{ if(qs.length) env = await api(`/rest/v1/zap_mensagens?select=aviso_ref,aviso_chave,criado_em,status&aviso_ref=in.(${qs.map(q=>q.id).join(",")})&aviso_chave=like.qualidade*&order=criado_em.desc`) || []; }catch(e){}
  caixa(`<div class="mq-modal"><h3>Contribuições a pagar · ${esc(String(c.nome||"").split(" ")[0])}</h3>
    ${qs.map(q=>`<section class="mq-sec"><b>${esc(qualResumo(q))}</b>${q.motivo ? `<p class="meio-sub">${esc(q.motivo)}</p>` : ""}
      <label class="cfg-ck"><input type="checkbox"${q.aviso_zap?" checked":""} onchange="alternarZapQualidade('${q.id}',this.checked)"> WhatsApp automático no primeiro dia útil do mês de cada pagamento</label>
      <div class="rotulo-caso">Próximos pagamentos</div>${(px=>px.length ? `<ul class="mq-cal">${px.map(d=>`<li><span>pagar até <b>${fmtBarra(d)}</b></span>${q.aviso_zap ? `<small>aviso em ${fmtBarra(qualidadeAviso(d))}</small>` : ""}</li>`).join("")}</ul>` : `<p class="meio-sub">nenhum</p>`)(qualidadeProximos(q, 6))}
      <div class="rotulo-caso">Avisos enviados</div>${(e=>e.length ? `<ul class="mov-lista">${e.map(m=>`<li><span class="mov-data">${fmt(String(m.criado_em).slice(0,10))}</span><span class="mov-txt">pagamento de ${esc(String(m.aviso_chave).slice(10).split("-").reverse().join("/"))} · ${esc(m.status)}</span></li>`).join("")}</ul>` : `<p class="meio-sub">nenhum ainda</p>`)(env.filter(m=>m.aviso_ref===q.id))}
      <div class="adr-modal-bts"><button type="button" class="adr-bt" onclick="formQualidade('${cliId}','${q.id}','')">Editar</button>
        <button type="button" class="adr-bt" onclick="imprimirQualidade('${cliId}','${q.id}')" title="Imprimir para o cliente">Imprimir<span class="sr-only"> para o cliente</span></button>
        <button type="button" class="adr-bt" onclick="encerrarQualidade('${q.id}')" title="Encerrar o plano">Encerrar<span class="sr-only"> o plano</span></button></div></section>`).join("")
      || `<p class="meio-sub">Nenhum plano ativo.</p><button type="button" class="adr-bt adr-primario" onclick="formQualidade('${cliId}','','')" title="Definir o plano"><span aria-hidden="true">Planejar</span><span class="sr-only">Definir o plano</span></button>`}</div>`);
}
// a folha para o cliente: a guia, o valor, o calendário e até quando
function imprimirQualidade(cliId, id){
  const c = D.cliPorId.get(cliId), q = (D.qualidade||[]).find(x=>x.id===id); if(!c || !q) return;
  const px = qualidadeProximos(q, 12);
  const como = q.codigo==="MEI" ? "Pague o DAS do MEI pelo aplicativo MEI ou pelo Portal do Empreendedor (gov.br/mei)."
    : "Gere a guia (GPS) no site da Receita Federal, no Sistema de Acréscimos Legais (SAL), com o seu NIT, o código e a competência, e pague no banco, na lotérica ou pelo aplicativo do banco.";
  janelaImpressao("Como pagar o INSS", [`<section>${DOC_TIMBRE}<h1>Como pagar o INSS</h1>
    <p><b>${esc(c.nome||"")}</b>${c.cpf ? ` · CPF ${esc(fmtCpf(c.cpf))}` : ""}</p>
    <p>Para manter a sua qualidade de segurado do INSS, faça os pagamentos abaixo${q.motivo ? `: ${esc(q.motivo)}` : "."}</p>
    <p><b>Forma:</b> ${esc(QUAL_MODOS[q.modalidade]||"")}<br><b>Guia:</b> ${esc(qualGuia(q))}${q.valor ? `<br><b>Valor:</b> ${esc(qualValor(q.valor))}` : ""}<br><b>Primeira competência:</b> ${esc(String(q.inicio).slice(5,7)+"/"+String(q.inicio).slice(0,4))}${q.pagar_ate ? `<br><b>Pagar até:</b> ${esc(fmtBarra(String(q.pagar_ate).slice(0,10)))}, e os seguintes no mesmo dia` : ""}${q.fim ? `<br><b>Último pagamento:</b> ${esc(String(q.fim).slice(5,7)+"/"+String(q.fim).slice(0,4))}` : ""}</p>
    <p><b>Pague até:</b></p><p>${px.map(fmtBarra).join(" · ") || "—"}</p>
    <p>${esc(como)}</p>
    <p>Guarde os comprovantes. Qualquer dúvida, fale com o escritório${q.aviso_zap ? "; no primeiro dia útil de cada mês de pagamento, enviamos um lembrete pelo WhatsApp" : ""}.</p>
    <div class="rodape">${esc(ESCRITORIO_RODAPE)}</div></section>`]);
}
// F277 · O QUADRO APOSENTADORIA DO CADASTRO (pedido do Paulo, 25.10.2026): ao lado de Contato, simples, com a data de cada
// aposentadoria e o dia em que o escritório é avisado. A por idade sai do nascimento e do sexo (homem aos 65, mulher aos 62),
// com o aviso 3 meses antes; o + acrescenta outra, com o nome, a data e o dia do aviso. Os cards de Aposentadorias futuras
// do To Do aparecem aqui também, e o clique abre o card inteiro (anotações, avisos), que era a aba
function caixaAposCadastro(c){
  const lista = c.aposentado===true ? [] : aposDoCliente(c), auto = lista.find(a=>a.automatica);
  const cards = lembretesDo(c.id).filter(l=>l.tipo==="aposentadoria_futura");
  const avisoDe = a => a.lembrar_em || avisoApos(a.data), kA = casoAposAtivo(c.id, true);   // com o pedido em caso, não há o que avisar
  // teste 11.88, TRI-06: o Criar aposentadoria futura grava o card e o lembrete com a mesma data; fica a linha do card
  const linhas = lista.filter(a=>a.automatica || !cards.some(l=>(l.crm||{}).data_direito===a.data)).map(a=>`<li class="ac-it"><b>${a.automatica ? "Aposentadoria por idade" : esc(a.especie)}</b><span class="ac-data">${fmt(a.data)}</span>
      <small>${kA ? `em caso: ${esc(tituloCaso(kA))} · ${esc(NOME_FASE[kA.fase]||kA.fase||"")}` : a.data<=hoje() ? "já tem direito" : `aviso em ${fmt(avisoDe(a))}`}</small>${a.automatica ? ""
        : `<button class="cad-lap" title="apagar" aria-label="apagar ${esc(a.especie)}" onclick="apagarApos('${a.id}')">${CAD_IC.fechar}</button>`}</li>`)
    .concat(cards.map(l=>`<li class="ac-it"><button type="button" class="ac-card" onclick="verAposFuturas('${c.id}')" title="abrir o card: anotações e avisos"><b>${esc(l.titulo||"Aposentadoria futura")}</b></button>
      <span class="ac-data">${(l.crm||{}).data_direito ? fmt(l.crm.data_direito) : ""}</span><small>${l.proximo_em ? `aviso em ${fmt(l.proximo_em)}` : "sem aviso"}</small></li>`));
  const nota = c.aposentado===true ? "Já aposentado."
    : !dnIso(c.dn) ? "Sem a data de nascimento, a aposentadoria por idade não tem data."
    : auto ? `Por idade: ${auto.sexoUsado==="F" ? "mulher aos 62" : "homem aos 65"} anos${auto.suposto ? " (sexo deduzido pelo nome; confira ao lado)" : ""}.`
    : !sexoDe(c) ? "Informe o sexo para calcular a aposentadoria por idade." : "";
  return `<section class="idf-card idf-apos" aria-labelledby="idf-apos">
    <h3 class="adr-h" id="idf-apos">Aposentadoria <button type="button" class="cad-mini ac-abrir" onclick="verAposFuturas('${c.id}')"
      title="as anotações do pré-caso ou do caso que foi para Aposentadorias futuras e a lista do Microsoft To Do">Abrir</button><button type="button" class="cad-mini ac-mais" onclick="novaAposCad('${c.id}')"
      title="acrescentar uma aposentadoria: o nome, a data e quando avisar" aria-label="acrescentar aposentadoria">${CAD_IC.mais}</button></h3>
    ${linhas.length ? `<ul class="ac-lista">${linhas.join("")}</ul>` : ""}
    ${nota ? `<p class="meio-sub ac-nota">${esc(nota)}</p>` : ""}
    ${qualidadeDe(c.id).length ? `<p class="ac-qual"><button type="button" class="ac-card" onclick="verQualidade('${c.id}')">Pagando o INSS para manter a qualidade · ver o plano ›</button></p>` : ""}
    <div id="ac-form"></div>
  </section>`;
}
// F296 · Onda E: as etapas do To Do que não têm campo na ficha (CNPJ, e-mail, telefone com recado, a data provável da
// aposentadoria, o parente que não é cliente) chegam pelo migrar.py em campos.notas_todo e ficam à vista aqui
const ROT_NOTA_TODO = {falta_cpf:"⚠ Falta CPF", cnpj:"CNPJ", email:"E-mail", telefone:"Telefone", aposentadoria:"Aposentadoria", parente:"Parente"};
function caixaNotasTodo(c){
  const ns = ((c.campos||{}).notas_todo||[]).filter(n=>n && n.texto && (n.tipo!=="falta_cpf" || faltaCpf(c)));
  if(!ns.length) return "";
  return `<section class="idf-card idf-notas-todo" aria-labelledby="idf-ntodo"><h3 class="adr-h" id="idf-ntodo">Anotado nas etapas do To Do</h3>
    <ul class="ac-lista">${ns.map(n=>`<li class="ac-it"><b>${esc(ROT_NOTA_TODO[n.tipo]||"Nota")}</b><small>${esc(n.texto)}</small></li>`).join("")}</ul></section>`;
}
function novaAposCad(cliId){
  const f = document.getElementById("ac-form"); if(!f) return;
  f.innerHTML = `<div class="ac-form">
    <label>Aposentadoria <input id="ac-nome" list="lista-especies-ac" placeholder="ex.: Aposentadoria especial"></label>
    <datalist id="lista-especies-ac">${ESPECIES_APOS.map(e=>`<option value="${esc(e)}">`).join("")}</datalist>
    <label>Data <input type="date" id="ac-data" onchange="const v=document.getElementById('ac-aviso');if(this.value&&(!v.value||v.dataset.auto)){v.value=avisoApos(this.value);v.dataset.auto=1}"></label>
    <label>Avisar em <input type="date" id="ac-aviso" oninput="delete this.dataset.auto"></label>
    <span class="ac-bts"><button type="button" class="btn-mini" onclick="salvarAposCad('${cliId}')">Guardar</button>
      <button type="button" class="btn-mini" onclick="document.getElementById('ac-form').innerHTML=''">Cancelar</button></span></div>`;
  document.getElementById("ac-nome").focus();
}
async function salvarAposCad(cliId){
  const v = id => ((document.getElementById(id)||{}).value||"").trim();
  const especie = v("ac-nome"), data = v("ac-data"), quando = v("ac-aviso") || (data && avisoApos(data));
  if(!especie || !data) return aviso("Preencha o nome e a data da aposentadoria");
  if(quando > data) return aviso("O aviso precisa vir antes da data da aposentadoria");
  try{
    const [a] = await api(`/rest/v1/aposentadorias`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({cliente_id:cliId, data, especie, autor_id:eu.id, lembrar_em:quando})});
    if(a) (D.apos=D.apos||[]).push(a);
  }catch(e){ return aviso("Não consegui guardar — tente de novo"); }
  aviso(`Guardado: aviso em ${fmt(quando)}`, false);
  abrirFicha(cliId);
}
// os cards de Aposentadorias futuras (o que era a aba): anotações do To Do, avisos e contas, numa janela
// F278 · o Abrir do quadro: as anotações do pré-caso que virou aposentadoria futura e do caso que foi para lá, e os cards
// de Aposentadorias futuras do Microsoft To Do (com as anotações de cada um)
function conteudoAposFuturas(c){
  const pcs = precasosDe(c).filter(p=>p.so_lembrete), cp = c.campos||{};
  const notasPc = pcs.length ? (cp.atendimento||[]) : [];
  const casosAF = (D.casosDoCliente.get(c.id)||[]).filter(k=>(D.lembretes||[]).some(l=>l.origem_caso===k.id && l.ativo!==false) || k.fase==="aposentadoria_futura");
  const andsK = k => (D._andsFicha||[]).filter(a=>a.caso_id===k.id).sort((a,b)=>String(b.criado_em).localeCompare(String(a.criado_em))).slice(0,8);
  const li = (q, quem, txt) => `<li><span class="mov-data">${q ? fmt(String(q).slice(0,10)) : "—"}</span><span class="mov-txt">${quem ? `<b>${esc(quem)}:</b> ` : ""}${esc(txt||"")}</span></li>`;
  const nomeDe = id => ((D.colPorId.get(id)||{}).nome||"").split(" ")[0];
  const blocoNotas = notasPc.length || casosAF.length ? `<section class="af-notas"><h4>Anotações</h4>
    ${notasPc.length ? `<div class="rotulo-caso">Do pré-caso que virou aposentadoria futura${pcs[0].especie ? ` · ${esc(pcs[0].especie)}` : ""}</div>
      <ul class="mov-lista">${notasPc.slice().reverse().map(n=>li(n.em, n.quem, n.texto)).join("")}</ul>` : ""}
    ${casosAF.map(k=>`<div class="rotulo-caso">Do caso ${esc(tituloCaso(k))}${k.fase==="encerrado" ? " (encerrado)" : ""}</div>
      <ul class="mov-lista">${andsK(k).map(a=>li(a.criado_em, nomeDe(a.autor_id), a.texto)).join("") || `<li class="meio-sub">sem anotações carregadas</li>`}</ul>`).join("")}
  </section>` : "";
  return `<h3 style="margin:0 0 8px">Aposentadorias futuras de ${esc(String(c.nome||"").split(" ")[0])}</h3>
    ${blocoNotas}<section class="af-todo"><h4>Do Microsoft To Do</h4>${painelLembretes(c, true)}</section>`;
}
