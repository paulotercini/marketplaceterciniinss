async function vincularPgto(pgId, casoId){
  const p=D.pagamentos.find(x=>x.id===pgId); if(!p) return;
  const antes=p.caso_id;
  p.caso_id=casoId||null;
  try{
    await api(`/rest/v1/pagamentos?id=eq.${pgId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({caso_id:p.caso_id})});
  }catch(e){
    p.caso_id=antes;
    return aviso("Não consegui vincular — rode o crm/fase2/schema_por_em_dia.sql no Supabase");
  }
  const k=casoId&&D.casoPorId.get(casoId);
  aviso(k?`Pagamento vinculado a ${tituloCaso(k)}`:"Vínculo removido", false);
  repintarFicha();
}
// F179 · Honorários no estilo da Análise de Direito: quatro quadros de
// resumo, a tabela dos lançamentos com a situação de cada um, e ao lado o
// contrato (o que o pré-caso ou a espécie dizem) e os casos em recebimento.
// Os gatilhos são os de antes: data-recebe, data-confere, novoPgto,
// data-prazo e data-fase.
// ══════════════════════════════════════════════════════════════════════════
// F236 · O DINHEIRO QUE O CASO JÁ DEVE (teste dos clientes ativos, 17.10.2026)
// A concessão registrada propõe, com um clique, os honorários do contrato; a
// requisição (RPV ou precatório) traz o valor do destaque e da sucumbência; o
// vencido não se passa por "próximo"; o caso encerrado mostra a parcela dele;
// a parcela sem caso não vira compromisso de outro caso; o valor absurdo que
// veio do To Do fica fora dos totais.
// ══════════════════════════════════════════════════════════════════════════
// F236 · valor que não pode ser honorário: acima de R$ 500 mil, ou igual a um número do cliente (processo, benefício,
// protocolo, CPF). O To Do mandou parcelas de até R$ 6,2 milhões. Fica marcado "conferir valor" e sai dos totais.
const HON_VALOR_ABSURDO = 500000;
function valorSuspeito(p){
  const v = +((p||{}).valor);
  if(!(v > 0)) return false;
  const int = String(Math.trunc(v));
  if(v <= HON_VALOR_ABSURDO && int.length < 6) return false;
  const cliId = p.cliente_id || (D.casoPorId.get(p.caso_id)||{}).cliente_id, c = D.cliPorId.get(cliId) || {};
  // quem conferiu e confirmou o valor (campos.valor_conferido[id] = o valor) o devolve aos totais
  if(+((((c.campos||{}).valor_conferido)||{})[p.id]) === v) return false;
  if(v > HON_VALOR_ABSURDO) return true;
  return [c.cpf, ...(D.casosDoCliente.get(cliId)||[]).flatMap(k=>[k.nb, k.processo, ...(k.protocolos||[]), ...(k.processos||[]).map(x=>x&&x.numero)])]
    .some(n=>soDig(n).includes(int));
}
async function conferirValor(pgId){
  const p = (D.pagamentos||[]).find(x=>x.id===pgId); if(!p) return;
  const c = D.cliPorId.get(p.cliente_id || (D.casoPorId.get(p.caso_id)||{}).cliente_id); if(!c) return;
  if(!await confirmar(`Confirmar o valor de ${moedaTxt(p.valor)} em "${origemPgto(p)}"? Ele volta aos totais.`)) return;
  if(await gravarCamposCli(c, {valor_conferido:{...(((c.campos||{}).valor_conferido)||{}), [p.id]:+p.valor}})){ aviso("Valor conferido", false); repintarFicha(); }
}
// F236 · de quem é o dinheiro: a sucumbência é do advogado (EAOAB, art. 23) e não abate o que o cliente deve
const natPgto = p => /sucumb/i.test((p||{}).descricao||"") ? "sucumbencia" : /destaque|destacad/i.test((p||{}).descricao||"") ? "destaque" : "contrato";
// F236 · a conta da estimativa e o "a calcular" moram na própria descrição, depois de " — ": ficam com o lançamento e
// não vão à mensagem ao cliente
const NOTA_PGTO = /\s+—\s+(?=≈|a calcular|data provável|data a confirmar)/;
const semNota = d => String(d||"").split(NOTA_PGTO)[0];
const notaPgto = p => { const d = String((p||{}).descricao||""), i = d.search(NOTA_PGTO); return i<0 ? "" : d.slice(i).replace(/^\s+—\s+/, ""); };
const pgEstimado = p => /^≈/.test(notaPgto(p));
const pgSemValor = p => !(+((p||{}).valor) > 0);
// F236 · cobra-se do cliente só o honorário do contrato com valor firme: o destaque e a sucumbência quem paga é o
// tribunal (confere-se o depósito), e o estimado se confere no extrato antes de virar cobrança
const cobravel = p => natPgto(p)==="contrato" && !pgEstimado(p) && !pgSemValor(p) && !valorSuspeito(p);
// F236 · de que caso é a parcela: a sem caso só é do caso quando o cliente tem UM; com dois ou mais ninguém adivinha
// (ela virava compromisso do caso aberto, de outro benefício, e a conferência ia escrever nele)
function casoDoPgto(p){
  if(!p) return null;
  if(p.caso_id) return p.caso_id;
  const ks = (D.casosDoCliente.get(p.cliente_id)||[]).filter(k=>!ehPreCaso(k));
  return ks.length===1 ? ks[0].id : null;
}
const honAbertoNoCaso = k => !!k && (D.pagamentos||[]).some(p=>p.status==="aberto" && casoDoPgto(p)===k.id);
// quem cobra: os atribuídos do caso da parcela (sem caso, os dos casos vivos do cliente)
function quemCobra(p){
  const k = D.casoPorId.get(casoDoPgto(p));
  const ids = k ? (D.atrDoCaso.get(k.id)||[])
    : (D.casosDoCliente.get(p.cliente_id)||[]).filter(x=>x.fase!=="encerrado").flatMap(x=>D.atrDoCaso.get(x.id)||[]);
  return [...new Set(ids)].map(id=>D.colPorId.get(id)).filter(Boolean);
}
// a parcela sem caso: a irmã da mesma série ("… parcela 2/3", já presa a um caso) ou a espécie citada na descrição
function sugestaoDeCaso(p, casos){
  const serie = d => semNota(d).replace(/\d+\s*\/\s*\d+[\s\S]*$/, "").trim();
  const s = serie(p.descricao);
  const irma = s && (D.pagamentos||[]).find(x=>x!==p && x.caso_id && x.cliente_id===p.cliente_id && serie(x.descricao)===s);
  if(irma && casos.some(k=>k.id===irma.caso_id)) return irma.caso_id;
  const cod = (String(p.descricao||"").match(/\bB\s?(\d{2})\b/)||[])[1];
  const pelo = cod ? casos.filter(k=>soDig(k.especie)===cod) : [];
  return pelo.length===1 ? pelo[0].id : null;
}
// F236 · o destaque é do PROCESSO: com dois ou mais casos, cada um guarda o seu em campos.contrato.casos[id]; o do
// cliente (o de antes) vale para o caso que não tem o próprio
function destaqueDe(c, k){
  const ct = ((c&&c.campos)||{}).contrato || {};
  return (k && ((ct.casos||{})[k.id]||{}).destaque) || ct.destaque || null;
}
// o processo já decidiu o destaque ("DEFIRO o destaque"): a ficha propõe trocar o "pedido"
function destaqueDoProcesso(k){
  return (D.anexos||[]).filter(a=>a.caso_id===k.id && a.texto && /\bdefiro o destaque|\bdestaque[^.\n]{0,80}\bdeferid/i.test(a.texto))
    .map(a=>({anexo:a, em:dataDoAnexo(a)})).sort((x,y)=>String(x.em).localeCompare(String(y.em)))[0] || null;
}
// F236 · o padrão que VALE para o caso: no INSS, o da concessão administrativa (e o de recurso, se chegar lá); em
// recurso ou na Justiça, só o de recurso (a tela mostrava as duas variantes ao caso judicial)
const HONOR_VIA = {
  padrao:{adm:"no INSS: os 3 primeiros benefícios (integrais e atualizados) · em recurso ou judicial: + 30% dos atrasados (RPV/precatório)",
    rec:"em recurso ou judicial: os 3 primeiros benefícios (integrais e atualizados) + 30% dos atrasados (RPV/precatório)"},
  incapacidade:{adm:"deferido no INSS: 20% sobre os 6 primeiros benefícios · em recurso ou judicial: 30% sobre os 6 primeiros + 30% dos atrasados",
    rec:"em recurso ou judicial: 30% sobre os 6 primeiros benefícios + 30% dos atrasados (RPV/precatório)"},
};
const viaDoCaso = k => !k ? "" : (["judicial","conselho","pagamento"].includes(k.fase) || (k.fase==="outro" && !!(k.processo || (k.processos||[]).length))) ? "rec"
  : ["inss","escritorio"].includes(k.fase) ? "adm" : "";
// F236 · A CONCESSÃO QUE O CASO JÁ REGISTROU, pela fonte mais firme (situação do PAT, carta de concessão, sentença de
// procedência ou acordo homologado, recurso provido no CRPS, requisitório, resultado gravado) e o que veio depois no
// processo: a requisição (RPV ou precatório), com os valores do documento, e o pagamento
const RX_REQUISICAO = /requisi[çc][ãa]o de pequeno valor|\bRPV\b|precat[óo]rio/i;
const valorBR = s => +String(s||"").replace(/[^\d,]/g, "").replace(",", ".") || 0;
const dataDoAnexo = a => dataSP(dataDoMovimento(a.andamento_id && (D._andsFicha||[]).find(x=>x.id===a.andamento_id)) || a.criado_em || "");
function requisicaoDoDoc(a){
  const t = String(a.texto||""), v = rx => valorBR((t.match(rx)||[])[1]);
  const dst = t.match(/honor[áa]rios contratuais destacados[^:\n]*:\s*(?:R\$\s*([\d.]+,\d{2})|(n[ãa]o))/i);
  const doAdv = /sucumb/i.test(a.nome||"") || /benefici[áa]rio:[^\n]*sucumb/i.test(t);
  const bruto = v(/valor (?:bruto|requisitado)\s*:?\s*R\$\s*([\d.]+,\d{2})/i);
  return {em:dataDoAnexo(a), anexo:a, precatorio:/precat/i.test(a.nome||""), bruto: doAdv ? 0 : bruto,
    destaque: dst && dst[1] ? valorBR(dst[1]) : 0, semDestaque: !!(dst && dst[2]),
    sucumbencia: doAdv ? bruto : v(/sucumbenciais?\s*:[^\n]*?R\$\s*([\d.]+,\d{2})/i)};
}
function concessaoDoCaso(k){
  if(!k || ehPreCaso(k) || k.fase==="encerrado") return null;
  const ands = (D._andsFicha||[]).filter(a=>a.caso_id===k.id), docs = (D.anexos||[]).filter(a=>a.caso_id===k.id);
  const s = [], sit = String(k.situacao_inss||"");
  if(/deferid|concedid/i.test(sit) && !/indeferid/i.test(sit)){
    const a = ands.filter(x=>x.origem==="pat" && /^situacao:/.test(x.origem_id||"") && /deferid|concedid/i.test(x.origem_id) && !/indeferid/i.test(x.origem_id))
      .sort((x,y)=>String(x.criado_em).localeCompare(String(y.criado_em)))[0];
    s.push({em: a ? dataSP(a.criado_em) : null, rot:"situação do PAT deferida", via:"adm"});
  }
  let carta = null;
  for(const a of docs.filter(x=>/carta de concess/i.test(x.nome||"") && x.texto)){
    const ct = lerCartaTexto(a.texto);
    if(ct && valorBR(ct.rmi)){ carta = {...ct, anexo:a}; s.push({em: isoBr(ct.concessao) || dataSP(a.criado_em), rot:"carta de concessão", via:"adm"}); break; }
  }
  for(const a of ands){
    const t = a.texto || "";
    if(a.origem==="crps" && /Recurso PROVIDO|Recurso provido EM PARTE/.test(t)) s.push({em: dataSP(a.criado_em), rot:"recurso provido no CRPS", via:"rec", crps:true});
    else if(/^(pje|esaj|eproc)$/.test(a.origem||"") && /\b(?:julgad[oa]|julgo)\s+(?:parcialmente\s+)?procedente\b|\bprocedente em parte\b|\bhomologad[oa] o acordo\b/i.test(t))
      s.push({em: dataSP(dataDoMovimento(a)), rot: /acordo/i.test(t) ? "acordo homologado" : "sentença de procedência", via:"rec"});
  }
  const reqs = docs.filter(a=>a.texto && RX_REQUISICAO.test(a.nome||"") && !/comprovante|dep[óo]sito|alvar/i.test(a.nome||"")).map(requisicaoDoDoc)
    .concat(reqsDoCaso(k).map(reqManual));   // F832 · e a registrada à mão
  const mc = (k.datajud||{}).marcos || {};
  const exped = reqs.map(r=>r.em).filter(Boolean).sort()[0] || (mc.requisitorio||{}).data || null;
  const comp = docs.find(a=>/comprovante de dep[óo]sito|alvar[áa]/i.test(a.nome||""));
  const paga = (mc.pago||{}).data || (comp && dataDoAnexo(comp)) || reqsDoCaso(k).map(r=>r.pago_em).filter(Boolean).sort()[0] || null;
  if(exped) s.push({em: exped, rot:"requisitório expedido", via:"rec"});
  else if(paga) s.push({em: paga, rot:"pagamento registrado nos autos", via:"rec"});
  if(!s.length && k.resultado==="deferido") s.push({em: k.decisao_em || null, rot:"resultado deferido", via: viaDoCaso(k)==="rec" ? "rec" : "adm"});
  if(!s.length) return null;
  const ord = s.filter(x=>x.em).sort((x,y)=>x.em.localeCompare(y.em));
  return {em: ord.length ? ord[0].em : null, rot: (ord[0]||s[0]).rot, via: s.some(x=>x.via==="rec") || viaDoCaso(k)==="rec" ? "rec" : "adm",
    pagaAdm: s.some(x=>x.crps) && !s.some(x=>x.via==="rec" && !x.crps) && !k.processo, carta, reqs, exped, paga, sinais:s};
}
// F236 · os honorários do CONTRATO para esta concessão: o combinado (honor_estrut) manda; sem ele, o padrão da variante
// pela via (concessão no INSS, ou em recurso e na Justiça), como está no texto do contrato (CONTRATO_VARIANTES)
function termosHon(c, k, via){
  const esp = especieDoCaso(k) || k.beneficio || "", vr = variantePorEspecie(esp);
  const h = honorEstrutDe(c, esp), livre = honorAjusteDe(c, esp), adm = via!=="rec";
  const T = h ? {nben:+h.nben||0, pctBen:1, pctAtr:+h.pct||0, combinado:true}
    : vr==="servico" ? {nben:0, pctBen:0, pctAtr:0}
    : vr==="incapacidade" ? {nben:6, pctBen:adm?0.2:0.3, pctAtr:adm?0:30}
    : {nben:3, pctBen:1, pctAtr:(vr==="padrao" && adm)?0:30, dif:vr==="revisao"};
  const frase = h ? resumoHon(h) : [T.nben ? `${T.dif?`as ${T.nben} primeiras diferenças`:`os ${T.nben} primeiros benefícios`}${T.pctBen<1?` (${Math.round(T.pctBen*100)}% de cada)`:" integrais"}` : "",
    T.pctAtr ? `${T.pctAtr}% dos atrasados` : ""].filter(Boolean).join(" + ");
  return {...T, vr, livre, frase};
}
const ORD_BEN = /(\d+)\s*[ºª°o]\s*(?:benef|diferen)/i;
// F236 · a PROPOSTA: o que o contrato manda lançar por esta concessão e ainda não está lançado. Cada item leva a conta
// e a fonte; o que depende da prorrogação fica marcado e não se lança; a linha "a calcular" já lançada é completada
function propostaHonorarios(c, k){
  const cc = concessaoDoCaso(k); if(!cc || !c) return null;
  const T = termosHon(c, k, cc.via);
  // F236 · o prazo do 1º crédito do BPC é o da LOAS (art. 37), e não o da Lei 8.213
  const baseCred = /^B8[78]$/.test(k.especie||"") ? "LOAS, art. 37; Decreto 6.214/2007, Anexo, art. 20" : "Lei 8.213, art. 41-A, § 5º";
  const desde = cc.em ? somaDias(cc.em, -7) : "0000-00-00", tag = ch => `hon:${k.id}:${ch}`;
  // os lançamentos desta concessão: o da proposta (pela marca), o datado a partir dela e o sem data
  const doConc = (D.pagamentos||[]).filter(p=>p.status!=="cancelado" && casoDoPgto(p)===k.id
    && (String(p.todo_item_id||"").startsWith(tag("")) || !(p.vencimento||p.pago_em) || (p.vencimento||p.pago_em)>=desde));
  // completa-se só a linha sem valor do CRM: a do To Do volta ao que o To Do diz a cada sincronização
  const editavel = p => p.status==="aberto" && pgSemValor(p) && (!p.todo_item_id || String(p.todo_item_id).startsWith("hon:"));
  const itens = [], info = [];
  // 1 · os N primeiros benefícios (ou diferenças, na revisão)
  if(T.nben){
    const ords = new Set(doConc.map(p=>+((String(p.descricao||"").match(ORD_BEN)||[])[1]||0)).filter(Boolean));
    const agreg = doConc.find(p=>/primeir[oa]s\s+(?:benef|diferen)/i.test(p.descricao||"") && !ORD_BEN.test(p.descricao||""));
    const rmi = cc.carta ? valorBR(cc.carta.rmi) : 0, ref = doConc.find(p=>ORD_BEN.test(p.descricao||"") && +p.valor>0);
    const vBen = T.dif ? 0 : rmi ? Math.round(rmi*T.pctBen*100)/100 : ref ? +ref.valor : 0;
    const datas = doConc.filter(p=>ORD_BEN.test(p.descricao||"")).map(p=>p.vencimento||p.pago_em).filter(Boolean).sort();
    const nMax = Math.max(0, ...ords);
    // a data de cada um: um mês depois do último lançado; sem nenhum, a 1ª renda sai em até 45 dias da concessão no
    // INSS (Lei 8.213, art. 41-A, § 5º); em recurso ou na Justiça, só depois da implantação, que a ficha não sabe
    const base = datas.length ? datas[datas.length-1] : cc.via==="adm" && cc.em ? somaDias(cc.em, 45) : null;
    const quais = Array.from({length:T.nben}, (_, i)=>i+1).filter(i=>!ords.has(i));
    const rot = i => `Honorários · ${i}${T.dif?"ª diferença":"º benefício"}${T.pctBen<1?` (${Math.round(T.pctBen*100)}%${rmi?` de ${moedaTxt(rmi)}`:""})`:""}`;
    if(quais.length && (!agreg || editavel(agreg))){
      if(vBen && base){
        quais.forEach(i=>{
          const venc = datas.length ? mesDepois(base, i-nMax) : mesDepois(base, i-1);
          const condic = !!(k.dcb && !k.dcb_prorrogacao_pedida && venc>k.dcb);
          itens.push({ch:`ben${i}`, desc:rot(i), valor:vBen, venc, condic, alvo:null,
            nota: condic ? "" : `data provável: ${datas.length ? "um mês depois do anterior" : `até 45 dias da concessão (${baseCred})`}; acertar pelo crédito`});
        });
        const prim = itens.find(x=>!x.condic); if(prim && agreg) prim.alvo = agreg;
        const cond = itens.filter(x=>x.condic), n = x => x.ch.slice(3);
        if(cond.length) info.push(`${cond.length===1 ? `O ${n(cond[0])}º benefício` : `Do ${n(cond[0])}º ao ${n(cond[cond.length-1])}º benefício`} (${cond.length} × ${moedaTxt(vBen)} = ${moedaTxt(Math.round(vBen*cond.length*100)/100)}) só entra${cond.length>1?"m":""} se a prorrogação for pedida e concedida: a DCB é ${fmtBarra(k.dcb)}${k.dcb>=hoje() ? `, e a prorrogação se pede até ${fmtBarra(somaDias(k.dcb, -1))}, a véspera` : ""}.`);
      }else if(!agreg){
        itens.push({ch:"ben", desc:`Honorários · ${T.dif?`${T.nben} primeiras diferenças`:`${T.nben} primeiros benefícios`}${T.pctBen<1?` (${Math.round(T.pctBen*100)}% de cada)`:" (integrais)"}`,
          valor:0, venc:null, nota:`a calcular: vencem com cada ${T.dif?"diferença paga":"benefício pago"}${cc.via==="rec"?", depois da implantação":""}`});
      }
    }
  }
  // 2 · os atrasados: pela requisição (o destaque, ou o percentual sobre o bruto), pela carta (estimativa do primeiro
  // crédito) ou "a calcular"; nunca sem valor e fora do total sem dizer por quê
  if(T.pctAtr){
    const jaAtr = doConc.find(p=>natPgto(p)!=="sucumbencia" && !ORD_BEN.test(p.descricao||"") && /atrasad|destaque|destacad|\brpv\b|precat/i.test(p.descricao||""));
    const alvo = jaAtr && editavel(jaAtr) ? jaAtr : null;
    if(!jaAtr || alvo){
      const r = cc.reqs.find(x=>x.destaque) || cc.reqs.find(x=>x.bruto);
      const venc = cc.paga || (r && !r.precatorio && r.em ? somaDias(r.em, 60) : null);
      const notaR = cc.paga || !r ? "" : r.precatorio ? "data a confirmar: precatório, pago pelo cronograma do tribunal"
        : "data provável: até 60 dias da entrega da requisição ao tribunal (Lei 10.259, art. 17); confirmar a data da transmissão";
      if(r && r.destaque) itens.push({ch:"atr", alvo, desc:`Honorários · destaque de ${T.pctAtr}% na ${r.precatorio?"requisição do precatório":"RPV"} (pago direto ao escritório)`, valor:r.destaque, venc, nota:notaR});
      else if(r && r.bruto) itens.push({ch:"atr", alvo, desc:`Honorários · ${T.pctAtr}% dos atrasados (${r.precatorio?"precatório":"RPV"} de ${moedaTxt(r.bruto)}${r.semDestaque?", sem destaque: o cliente paga":""})`,
        valor:Math.round(r.bruto*T.pctAtr)/100, venc, nota:notaR});
      else if(cc.carta && cc.via==="adm"){
        const dib = isoBr(cc.carta.dib), dip = isoBr(cc.carta.dip) || isoBr(cc.carta.concessao), rmi = valorBR(cc.carta.rmi);
        const dias = dib && dip ? Math.round((new Date(dip+"T12:00:00")-new Date(dib+"T12:00:00"))/864e5) : 0;
        if(dias>0){
          const atr = Math.round(rmi*dias/30*100)/100;
          itens.push({ch:"atr", alvo, desc:`Honorários · ${T.pctAtr}% dos atrasados (do início do benefício ao primeiro pagamento)`, valor:Math.round(atr*T.pctAtr)/100,
            venc: cc.em ? somaDias(cc.em, 45) : null,
            nota:`≈ estimado: ${dias} dias × ${moedaTxt(rmi)} ÷ 30 = ${moedaTxt(atr)}, pela carta de concessão (DIB ${fmtBarra(dib)}, DIP ${fmtBarra(dip)}); vence no 1º crédito, em até 45 dias da concessão (${baseCred}): conferir no extrato`});
        }
      }
      // F831 · sem requisição nem carta, a estimativa da calculadora de atrasados do caso (marcada "≈": confere-se antes de cobrar)
      const ce = (k.calculo||{}).resultado;
      if(!itens.some(x=>x.ch==="atr") && ce && ce.total > 0) itens.push({ch:"atr", alvo, desc:`Honorários · ${T.pctAtr}% dos atrasados (estimativa da calculadora do caso)`,
        valor:Math.round(ce.total*T.pctAtr)/100, venc:null,
        nota:`≈ estimado: ${T.pctAtr}% de ${moedaTxt(ce.total)}, atrasados desde ${fmtBarra(ce.termo)} calculados em ${fmtBarra(ce.em)} (estimativa para conferência); vence no pagamento da RPV ou do precatório`});
      if(!jaAtr && !itens.some(x=>x.ch==="atr")) itens.push({ch:"atr", alvo:null, desc:`Honorários · ${T.pctAtr}% dos atrasados`, valor:0, venc:null,
        nota:`a calcular: ${cc.pagaAdm || cc.via==="adm" ? "vence no crédito dos atrasados pelo INSS" : "vence no pagamento da RPV ou do precatório"}`});
    }
  }
  // 3 · a sucumbência que a requisição traz (RPV própria ou na mesma): é do advogado (EAOAB, art. 23)
  const rs = cc.reqs.find(x=>x.sucumbencia);
  if(rs && !doConc.some(p=>natPgto(p)==="sucumbencia"))
    itens.push({ch:"suc", desc:"Honorários de sucumbência (requisitados em nome do advogado)", valor:rs.sucumbencia, alvo:null,
      venc: cc.paga || (!rs.precatorio && rs.em ? somaDias(rs.em, 60) : null),
      nota: cc.paga ? "" : rs.precatorio ? "data a confirmar: precatório, pago pelo cronograma do tribunal" : "data provável: até 60 dias da entrega da requisição ao tribunal (Lei 10.259, art. 17)"});
  if(!itens.length) return null;
  // o que a equipe precisa saber antes de lançar e de cobrar
  if(T.livre && !T.combinado) info.push(`O contrato tem ajuste combinado ("${T.livre.slice(0,160)}"): confira antes de lançar.`);
  const st = (destaqueDe(c, k)||{}).st;
  if(cc.via==="rec" && !cc.pagaAdm && T.pctAtr && !cc.reqs.length && !cc.paga && !["pedido","deferido"].includes(st))
    info.push("Destaque: junte o contrato antes da expedição da RPV ou do precatório, e os honorários saem direto ao escritório (EAOAB, art. 22, § 4º).");
  if(cc.reqs.some(x=>x.semDestaque)) info.push("A requisição saiu sem o destaque: os honorários dos atrasados se cobram do cliente quando ele receber (o contrato escrito é título executivo, EAOAB, art. 24).");
  if(cc.pagaAdm && T.pctAtr && !T.combinado) info.push("Concessão em recurso administrativo: o INSS paga os atrasados no crédito, e não por RPV ou precatório, como diz a cláusula do contrato. Confirmar com o Paulo antes de cobrar os 30%.");
  if(T.vr==="incapacidade" && cc.via==="rec" && !T.combinado) info.push("Se o benefício for pago por menos de 6 meses, os 30% valem sobre os meses pagos (contrato).");
  const dec = (D.anexos||[]).filter(a=>a.caso_id===k.id && a.texto && /senten|ac[óo]rd[ãa]o/i.test(a.nome||""))
    .map(a=>({em:dataDoAnexo(a), f:String(a.texto).split(/(?<=[.;])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/).find(x=>/\bhonor[áa]rios\b/i.test(x) && !/contratua|destaque/i.test(x))}))
    .filter(x=>x.f).sort((x,y)=>String(x.em).localeCompare(String(y.em))).pop();
  if(cc.via==="rec" && dec) info.push(`Sucumbência no processo: "${dec.f.trim().slice(0,200)}"${/sem custas e honor/i.test(dec.f) ? "" : " É do advogado (EAOAB, art. 23) e não abate o que o cliente deve."}`);
  const daReq = cc.reqs.length && itens.some(x=>x.ch==="suc" || (x.ch==="atr" && x.valor && !/^≈/.test(x.nota||"")));
  const motivo = daReq ? {rot:"requisitório expedido", em:cc.exped} : {rot:cc.rot, em:cc.em};
  // "não lançar" vale para o motivo em que foi dado: o requisitório que chega depois volta a propor
  const fora = ((((c.campos||{}).hon_prop_fora)||{})[k.id]);
  if(fora && fora.rot===motivo.rot) return null;
  return {conc:cc, motivo, termos:T, itens, info, caso:k};
}
function cartaoProposta(pr){
  const k = pr.caso, lanc = pr.itens.filter(x=>!x.condic);
  const valorTxt = x => x.valor ? `${/^≈/.test(x.nota||"")?"≈ ":""}${moeda(x.valor)}` : "a calcular";
  return `<section class="adr-card hon-prop" aria-labelledby="hon-prop-${k.id}">
    <div class="adr-cab"><h3 class="adr-h" id="hon-prop-${k.id}">Honorários do contrato a lançar · ${esc(tituloCaso(k))}</h3>
      <span class="adr-chip">${esc(pr.motivo.rot)}${pr.motivo.em?` em ${fmt(pr.motivo.em)}`:""}</span></div>
    <p class="adr-nota">Pelo contrato (${pr.termos.combinado?"ajuste combinado":"padrão do escritório"}, ${pr.conc.via==="rec"?"concessão em recurso ou na Justiça":"concessão no INSS"}): ${esc(pr.termos.frase)}.</p>
    <ul class="hon-prop-itens">${pr.itens.map(x=>`<li class="${x.condic?"condic":""}"><span>${esc(x.desc)}${x.nota?`<small class="hon-nota">${esc(x.nota)}</small>`:""}</span>
      <b>${valorTxt(x)}</b><span class="hon-sit ${x.condic?"hon-cinza":"hon-prox"}">${x.condic?"depende da prorrogação":x.venc?`vence ${fmt(x.venc)}`:"sem data"}${x.alvo?" · completa o já lançado":""}</span></li>`).join("")}</ul>
    ${pr.info.length?`<ul class="hon-prop-info">${pr.info.map(t=>`<li>${esc(t)}</li>`).join("")}</ul>`:""}
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px">${lanc.length?`<button class="adr-bt adr-primario" onclick="lancarHonorarios('${k.id}')">${lanc.length===1?"Lançar este honorário":`Lançar os ${lanc.length} honorários`}</button>`:""}
      <button class="adr-bt" onclick="dispensarProposta('${k.id}')" title="os honorários desta concessão foram resolvidos de outro jeito"><span aria-hidden="true">Ignorar</span><span class="sr-only">não lançar</span></button></div>
    ${lanc.length?`<small class="hon-nota">Entram como "a receber", com a conta e a fonte em cada linha; dá para desfazer logo depois.</small>`:""}
  </section>`;
}
// F236 · "não lançar": os honorários desta concessão foram resolvidos de outro jeito; a proposta sai do caso até
// aparecer outro motivo (o requisitório depois da sentença, por exemplo), e dá para desfazer
async function dispensarProposta(casoId){
  const k = D.casoPorId.get(casoId), c = k && D.cliPorId.get(k.cliente_id); if(!c) return;
  const pr = propostaHonorarios(c, k); if(!pr) return;
  const antes = {...(((c.campos||{}).hon_prop_fora)||{})};
  if(!await gravarCamposCli(c, {hon_prop_fora:{...antes, [casoId]:{rot:pr.motivo.rot, em:hoje(), quem:eu.id}}})) return;
  repintarFicha();
  avisoDesfazer("A proposta de honorários saiu deste caso", async()=>{ await gravarCamposCli(c, {hon_prop_fora:antes}); repintarFicha(); });
}
// F236 · o clique que lança a proposta (POST das novas, PATCH da linha "a calcular" que ela completa), liga o lembrete
// de cobrança (salvo se alguém o desligou), registra no caso e oferece desfazer
async function lancarHonorarios(casoId){
  const k = D.casoPorId.get(casoId), c = k && D.cliPorId.get(k.cliente_id); if(!c) return;
  const pr = propostaHonorarios(c, k), itens = pr ? pr.itens.filter(x=>!x.condic) : [];
  if(!itens.length) return aviso("Nada a lançar agora");
  const criados = [], mudados = [];
  try{
    for(const x of itens){
      const corpo = {descricao: x.desc + (x.nota ? ` — ${x.nota}` : ""), valor: x.valor || null, vencimento: x.venc || null};
      if(x.alvo){
        const antes = {descricao:x.alvo.descricao, valor:x.alvo.valor, vencimento:x.alvo.vencimento, todo_item_id:x.alvo.todo_item_id||null};
        const muda = {...corpo, todo_item_id:`hon:${k.id}:${x.ch}`};
        await api(`/rest/v1/pagamentos?id=eq.${x.alvo.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"}, body:JSON.stringify(muda)});
        Object.assign(x.alvo, muda); mudados.push({p:x.alvo, antes});
      }else{
        const r = await api(`/rest/v1/pagamentos`,{method:"POST",headers:{Prefer:"return=representation"},
          body:JSON.stringify({...corpo, caso_id:k.id, cliente_id:c.id, status:"aberto", pago_em:null, conferencias:[], todo_item_id:`hon:${k.id}:${x.ch}`})});
        if(r && r[0]){ (D.pagamentos=D.pagamentos||[]).push(r[0]); criados.push(r[0]); }
      }
    }
  }catch(e){ aviso("Não consegui lançar todos — confira a aba e tente de novo"); }
  if(!criados.length && !mudados.length) return repintarFicha();
  if((((c.campos||{}).cobranca)||{}).lembrar!==false) await lembretesCobranca(c, true);
  await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({caso_id:k.id, autor_id:eu.id, texto:`Honorários do contrato lançados (${pr.motivo.rot}): ${itens.map(x=>`${x.desc.replace(/^Honorários · /,"")}, ${x.valor?moedaTxt(x.valor):"a calcular"}`).join("; ")}.`})}).catch(()=>{});
  const n = criados.length + mudados.length;
  await abrirFicha(clienteAberto);
  avisoDesfazer(`${n} lançamento${n>1?"s":""} de honorários`, async()=>{
    for(const p of criados){ await api(`/rest/v1/pagamentos?id=eq.${p.id}`,{method:"DELETE"}).catch(()=>{}); await desligarLembreteCobranca(c, p.id); D.pagamentos = D.pagamentos.filter(y=>y!==p); }
    for(const {p, antes} of mudados){ await api(`/rest/v1/pagamentos?id=eq.${p.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"}, body:JSON.stringify(antes)}).catch(()=>{}); Object.assign(p, antes); }
    repintarFicha(); aviso("Lançamentos desfeitos", false);
  });
}
async function desligarLembreteCobranca(c, pgId){
  const lid = (((((c||{}).campos||{}).cobranca)||{}).lembretes||{})[pgId], l = lid && (D.lembretes||[]).find(x=>x.id===lid);
  if(!l || l.ativo===false) return;
  try{ await api(`/rest/v1/lembretes?id=eq.${l.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"}, body:JSON.stringify({ativo:false})}); l.ativo = false; }catch(e){}
}
// F236 · RECEBIDO: o dia em que o dinheiro entrou (não hoje à força), o valor que entrou (a estimativa vira o valor
// real) e, na parcela sem caso de quem tem dois ou mais, de qual caso ela é
function receberPgto(pgId){
  const p = (D.pagamentos||[]).find(x=>x.id===pgId); if(!p) return;
  const cliId = p.cliente_id || (D.casoPorId.get(p.caso_id)||{}).cliente_id || clienteAberto;
  const casos = (D.casosDoCliente.get(cliId)||[]).filter(k=>!ehPreCaso(k));
  const pede = !casoDoPgto(p) && casos.length>1, sug = pede ? sugestaoDeCaso(p, casos) : null;
  caixa(`<h3 style="margin:0 0 6px">Recebido · ${esc(origemPgto(p))}</h3>
    <p class="adr-nota" style="margin:0 0 10px">Confirme o dia em que o dinheiro entrou e o valor${pgEstimado(p)?" (o lançado era estimado: vale o que entrou)":pgSemValor(p)?" (estava a calcular)":""}. Você fica registrado como quem recebeu.</p>
    <div class="form-linha" style="align-items:flex-end;flex-wrap:wrap;gap:10px">
      <label class="adr-campo">Recebido em<input type="date" id="rc-data" max="${hoje()}" value="${hoje()}"></label>
      <label class="adr-campo">Valor<input type="number" step="0.01" min="0" id="rc-valor" value="${pgSemValor(p)?"":+p.valor}" style="width:140px"></label>
      ${pede?`<label class="adr-campo">De qual caso<select id="rc-caso"><option value="">— escolha —</option>${casos.map(k=>`<option value="${k.id}" ${k.id===sug?"selected":""}>${esc(tituloCaso(k))}${k.fase==="encerrado"?" (encerrado)":""}</option>`).join("")}</select></label>`:""}
      <button class="adr-bt adr-primario" onclick="confirmarRecebido('${p.id}')">Confirmar</button>
    </div>`);
}
async function confirmarRecebido(pgId){
  const p = (D.pagamentos||[]).find(x=>x.id===pgId); if(!p) return;
  const data = (document.getElementById("rc-data")||{}).value || hoje(), valor = +((document.getElementById("rc-valor")||{}).value||0);
  const sel = document.getElementById("rc-caso"), casoId = sel ? sel.value : "";
  if(!(valor>0)) return aviso("Informe o valor que entrou");
  if(data>hoje()) return aviso("O dia do recebimento não pode ser futuro");
  if(sel && !casoId) return aviso("Diga de qual caso é este dinheiro");
  const corpo = {status:"recebido", pago_em:data, conferencias:[...(p.conferencias||[]),{c:eu.id,em:new Date().toISOString()}]};
  // teste 11.88, ADM-01: o valor lançado de verdade que entrou a menos deixa o saldo a receber, em vez de sumir
  const saldo = (pgEstimado(p) || pgSemValor(p)) ? 0 : Math.round((+p.valor - valor)*100)/100;
  if(+p.valor!==valor) corpo.valor = valor;
  if(notaPgto(p)) corpo.descricao = semNota(p.descricao);   // recebido, sai a conta da estimativa: vale o que entrou
  if(casoId) corpo.caso_id = casoId;
  try{ await api(`/rest/v1/pagamentos?id=eq.${p.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"}, body:JSON.stringify(corpo)}); }
  catch(e){ return aviso("Não gravei o recebimento — tente de novo"); }
  Object.assign(p, corpo); fecharCaixa();
  if(saldo > 0){
    try{
      const [r] = await api(`/rest/v1/pagamentos`,{method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({caso_id:p.caso_id, cliente_id:p.cliente_id, descricao:`${semNota(p.descricao)} · saldo`, valor:saldo,
          vencimento:p.vencimento, status:"aberto", pago_em:null, conferencias:[]})});
      if(r) D.pagamentos.push(r);
      aviso(`Ficou o saldo de ${moeda(saldo)} a receber`, false);
    }catch(e){ aviso(`Recebido, mas o saldo de ${moeda(saldo)} não foi lançado: lance-o à mão`); }
  }
  await desligarLembreteCobranca(D.cliPorId.get(p.cliente_id || (D.casoPorId.get(p.caso_id)||{}).cliente_id), p.id);
  aviso("Recebido 💵 — você consta como quem recebeu");
  await correnteConferencia(casoDaParcela(p), `Pagamento de ${moeda(p.valor)} recebido em ${fmt(data)}`);
  abrirFicha(clienteAberto);
}
// 27.11.2026 · ordem do Paulo: o lançamento se edita (valor e vencimento) e se cancela com motivo; o cancelado fica
// riscado, com quem e quando (o banco grava os dois pelo login, F829); o recebido e a conferência se desfazem, com confirmação
async function gravarPgto(p, corpo, erro){
  try{ await api(`/rest/v1/pagamentos?id=eq.${p.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"}, body:JSON.stringify(corpo)}); }
  catch(e){ aviso(erro); return false; }
  Object.assign(p, corpo); return true;
}
function editarPgto(pgId){
  const p = (D.pagamentos||[]).find(x=>x.id===pgId); if(!p || p.status!=="aberto") return;
  caixa(`<h3 style="margin:0 0 6px">Editar · ${esc(origemPgto(p))}</h3>
    <div class="form-linha" style="align-items:flex-end;flex-wrap:wrap;gap:10px">
      <label class="adr-campo">Valor<input type="number" step="0.01" min="0" id="ed-valor" value="${p.valor==null?"":+p.valor}" style="width:140px"></label>
      <label class="adr-campo">Vencimento<input type="date" id="ed-venc" value="${esc(p.vencimento||"")}"></label>
      <button class="adr-bt adr-primario" onclick="salvarEdicaoPgto('${p.id}')">Guardar</button>
    </div>`);
}
async function salvarEdicaoPgto(pgId){
  const p = (D.pagamentos||[]).find(x=>x.id===pgId); if(!p) return;
  const valor = +((document.getElementById("ed-valor")||{}).value||0), venc = (document.getElementById("ed-venc")||{}).value || null;
  if(!(valor>0)) return aviso("Informe o valor");
  if(!await gravarPgto(p, {valor, vencimento:venc, editado_por:eu.id, editado_em:new Date().toISOString()}, "Não gravei a edição — tente de novo")) return;
  fecharCaixa(); aviso("Lançamento editado", false); repintarFicha();
}
function cancelarPgto(pgId){
  const p = (D.pagamentos||[]).find(x=>x.id===pgId); if(!p || p.status!=="aberto") return;
  caixa(`<h3 style="margin:0 0 6px">Cancelar · ${esc(origemPgto(p))}</h3>
    <p class="adr-nota" style="margin:0 0 10px">O lançamento não some: fica riscado, com o motivo, quem cancelou e quando, e sai dos totais.</p>
    <label class="adr-campo" style="display:block">Motivo<textarea id="cc-motivo" rows="2" style="width:100%"></textarea></label>
    <div class="form-linha" style="margin-top:8px"><button class="adr-bt adr-primario" onclick="confirmarCancelPgto('${p.id}')">Cancelar</button></div>`);
}
async function confirmarCancelPgto(pgId){
  const p = (D.pagamentos||[]).find(x=>x.id===pgId); if(!p) return;
  const motivo = ((document.getElementById("cc-motivo")||{}).value||"").trim();
  if(!motivo) return aviso("Escreva o motivo do cancelamento");
  if(!await gravarPgto(p, {status:"cancelado", cancelado_motivo:motivo, cancelado_por:eu.id, cancelado_em:new Date().toISOString()}, "Não cancelei — tente de novo")) return;
  fecharCaixa();
  await desligarLembreteCobranca(D.cliPorId.get(p.cliente_id || (D.casoPorId.get(p.caso_id)||{}).cliente_id), p.id);
  aviso("Lançamento cancelado", false); repintarFicha();
}
async function desfazerPgto(pgId){
  const p = (D.pagamentos||[]).find(x=>x.id===pgId); if(!p || p.status!=="recebido") return;
  const cfs = p.conferencias||[], minha = cfs.length>1 && cfs[cfs.length-1].c===eu.id;
  if(minha){
    if(!await confirmar("Desfazer a sua conferência deste recebimento?")) return;
    if(!await gravarPgto(p, {conferencias:cfs.slice(0, -1)}, "Não desfiz a conferência — tente de novo")) return;
    aviso("Conferência desfeita", false);
  }else{
    if(!await confirmar(`Desfazer o recebido de ${moeda(p.valor)}? O lançamento volta a receber e a corrente de conferência é apagada.`)) return;
    if(!await gravarPgto(p, {status:"aberto", pago_em:null, vencimento:p.vencimento||p.pago_em, conferencias:[], editado_por:eu.id, editado_em:new Date().toISOString()}, "Não desfiz o recebido — tente de novo")) return;
    aviso("Recebido desfeito: o lançamento voltou a receber", false);
  }
  repintarFicha();
}
// F236 · a parcela do 💰 Recebimentos abre a ficha já na aba Honorários, no caso dela
async function abrirHonorariosDe(cliId, casoId){
  await abrirFicha(cliId);
  const m = document.getElementById("modal");
  if(m && m.style.display!=="none" && m.querySelector(".proc-op")) m.style.display = "none";
  if(casoId) casoSel = casoId;
  else if(!casoSel || casoSel==="__auto__") casoSel = ((D.casosDoCliente.get(cliId)||[]).find(k=>k.fase!=="encerrado" && !ehPreCaso(k))||{}).id || null;
  abaAtiva = 4; repintarFicha();
}
// F236 · 💰 RECEBIMENTOS É O DINHEIRO, PARCELA POR PARCELA. Era a lista dos casos da fase Pagamentos, sem valor nem
// vencimento e filtrada pela pessoa: o vencido de cliente com caso encerrado (1.021 parcelas no banco) não aparecia.
// Vencidos primeiro, do mais antigo; depois a vencer; sem data e "conferir valor" por último, fora dos totais. Quem
// cobra são os atribuídos do caso da parcela. Sem filtro por pessoa: o dinheiro é do escritório.
function renderRecebimentos(){
  tituloLista("💰 Recebimentos");
  document.getElementById("sub-lista").textContent = "Cada parcela em aberto, do vencido mais antigo ao próximo; o clique abre a aba Honorários da ficha.";
  const hj = hoje(), cliDe = p => D.cliPorId.get(p.cliente_id || (D.casoPorId.get(p.caso_id)||{}).cliente_id);
  const ab = (D.pagamentos||[]).filter(p=>p.status==="aberto" && cliDe(p)), ok = ab.filter(p=>!valorSuspeito(p));
  const venc = ok.filter(p=>p.vencimento && p.vencimento<hj && !pgSemValor(p)).sort((a,b)=>a.vencimento.localeCompare(b.vencimento));
  const prox = ok.filter(p=>p.vencimento && p.vencimento>=hj).sort((a,b)=>a.vencimento.localeCompare(b.vencimento));
  const semData = ok.filter(p=>!p.vencimento || (p.vencimento<hj && pgSemValor(p))), conferir = ab.filter(valorSuspeito);
  const soma = l => l.reduce((t,p)=>t+(+p.valor||0), 0), LIM = 300;
  const linha = p => { const c = cliDe(p), k = D.casoPorId.get(casoDoPgto(p)), d = p.vencimento ? diasAte(p.vencimento) : null;
    return `<div class="rc-linha" role="button" tabindex="0" data-cli="${c.id}"${k?` data-caso="${k.id}"`:""} title="abrir a aba Honorários de ${esc(c.nome)}">
      <span class="rc-data${d!=null&&d<0?" venc":""}">${p.vencimento?fmtBarra(p.vencimento):"sem data"}${d==null?"":`<small>${d<0?`há ${-d} d`:d===0?"hoje":`em ${d} d`}</small>`}</span>
      <span class="rc-txt"><b>${esc(c.nome)}</b><span>${esc(origemPgto(p))} · ${k?`${esc(tituloCaso(k))}${k.fase==="encerrado"?" (encerrado)":""}`:"sem caso"}</span></span>
      <span class="rc-valor">${valorSuspeito(p)?`<span class="hon-sit hon-venc">conferir valor</span> `:""}${pgSemValor(p)?"a calcular":`${pgEstimado(p)?"≈ ":""}${moeda(p.valor)}`}</span>
      <span class="avatares">${quemCobra(p).slice(0,3).map(co=>`<span class="avatar mini" style="background:${co.cor}" title="cobra: ${esc(co.nome)}">${esc(co.inicial)}</span>`).join("")}</span>
      ${p.vencimento && cobravel(p) ? `<button class="btn-mini" data-rc-cob="${p.id}" title="mensagem de cobrança pronta">cobrar</button>` : ""}
    </div>`; };
  const casosPag = D.casos.filter(k=>k.fase==="pagamento" && !ab.some(p=>casoDoPgto(p)===k.id));
  document.getElementById("conteudo-meio").innerHTML =
    // F684 · três números lado a lado; vermelho só quando há vencido; sem nada lançado, uma frase só
    `<div class="rc-tot"><span><small>Vencido (${venc.length})</small><b${venc.length?' class="venc"':""}>${moeda(soma(venc))}</b></span><span><small>A vencer (${prox.length})</small><b>${moeda(soma(prox))}</b></span>
      <span><small>Sem data</small><b>${semData.length}</b></span>${conferir.length?`<span><small>Valor a conferir, fora dos totais</small><b>${conferir.length}</b></span>`:""}</div>`
    + (!venc.length && !prox.length && !semData.length && !conferir.length ? "<p class='meio-sub rc-vazio'>Nenhum honorário a receber. As parcelas aparecem aqui quando forem lançadas na aba Honorários do cliente.</p>"
      : (venc.length ? `<h3 class="secao" style="color:var(--venc-tinta,#B3261E)">Vencidos (${venc.length})</h3>${venc.map(linha).join("")}` : "")
      + `<h3 class="secao">A vencer${prox.length?` (${prox.length})`:""}</h3>${prox.map(linha).join("") || "<p class='meio-sub'>Nada a vencer com data.</p>"}`)
    + (semData.length ? `<details class="rc-grupo"><summary class="secao">Sem data de vencimento (${semData.length})</summary>${semData.slice(0,LIM).map(linha).join("")}${semData.length>LIM?`<p class="meio-sub">e mais ${semData.length-LIM}: veja na aba Honorários de cada cliente.</p>`:""}</details>` : "")
    + (conferir.length ? `<details class="rc-grupo"><summary class="secao">Valor a conferir (${conferir.length})</summary><p class="meio-sub">Valor acima de ${moeda(HON_VALOR_ABSURDO)} ou igual a um número do cliente (processo, benefício, protocolo): quase sempre leitura errada do To Do. Fica fora dos totais até alguém conferir.</p>${conferir.map(linha).join("")}</details>` : "")
    + (casosPag.length ? `<h3 class="secao">Em Pagamentos, sem nada lançado (${casosPag.length})</h3>${grupoClientes(casosPag).map(([c,ks])=>cartaoCliente(c,ks)).join("")}` : "");
  document.querySelectorAll(".rc-linha[data-cli]").forEach(el=>{
    el.onclick = e=>{ if(e.target.closest("[data-rc-cob]")) return; abrirHonorariosDe(el.dataset.cli, el.dataset.caso||null); };
    el.onkeydown = e=>{ if(e.key==="Enter" && e.target===el) el.click(); };
  });
  document.querySelectorAll("[data-rc-cob]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); abrirCobranca(b.dataset.rcCob); });
  ligarCartoes();
}
// F236 · depois do pagamento da requisição, o destaque não se pede mais: o quadro diz o que vale agora
function textoPosPagamento(cc, dst){
  const com = cc.reqs.some(r=>r.destaque) || (!cc.reqs.some(r=>r.semDestaque) && (dst||{}).st==="deferido");
  return com ? `A requisição foi paga em ${fmt(cc.paga)} com o destaque: os honorários do contrato vêm direto ao escritório.`
    : `A requisição foi paga em ${fmt(cc.paga)} sem o destaque, que só se pede antes da expedição (EAOAB, art. 22, § 4º): os honorários do contrato agora se cobram do cliente. O contrato escrito é título executivo e pode ser executado nos próprios autos (EAOAB, art. 24, caput e § 1º).`;
}
function situacaoPgto(p, proxId){
  if(p.status==="cancelado") return ["cancelado", "cinza"];
  if(p.status!=="aberto") return ["recebido", "ok"];
  if(!p.vencimento) return [pgSemValor(p) ? "a calcular" : "a vencer", "cinza"];
  const d = diasAte(p.vencimento);
  if(d < 0) return [`vencido há ${-d} dia${d===-1?"":"s"}`, "venc"];
  if(p.id===proxId) return [d===0 ? "vence hoje" : `vence em ${d} dia${d===1?"":"s"}`, "prox"];
  return ["a vencer", "cinza"];
}
function contratoDoCliente(c, ks, kSel){
  // F236 · com o caso escolhido, o contrato é o dele (antes valia o do primeiro caso ativo): o pré-caso só responde
  // quando é da mesma variante de contrato
  const vrK = kSel && !ehPreCaso(kSel) ? variantePorEspecie(especieDoCaso(kSel)) : null;
  const pcs = c ? precasosDe(c).filter(pc=>!pc.so_lembrete && pc.especie!==ESPECIE_PAGAMENTOS && (!vrK || variantePorEspecie(pc.especie)===vrK)) : [];
  const pc = pcs.find(x=>x.honorarios||x.hon) || pcs[0] || null;
  const k = kSel || (ks||[]).find(x=>x.fase!=="encerrado") || (ks||[])[0];
  const esp = (pc && pc.especie) || especieDoCaso(k) || "";
  if(!pc && !k) return null;
  const vr = variantePorEspecie(esp);
  // F181 · o combinado em campos entra junto; sem pré-caso (já virou caso),
  // vale o que ficou guardado no cadastro para a variante do contrato
  const hon = (pc && pc.hon) || honorEstrutDe(c, esp);
  const livre = (pc && pc.honorarios) || honorAjusteDe(c, esp);
  // F236 · o combinado igual ao padrão (3 benefícios + 30%, sem valor fixo nem texto) não é ajuste
  const igual = hon && !livre && ["padrao","acidente"].includes(vr) && +hon.nben===3 && +hon.pct===30 && !(+hon.valor>0);
  return {ajuste: igual ? "" : [resumoHon(hon), livre].filter(Boolean).join(" · "),
    padrao: (HONOR_VIA[vr]||{})[viaDoCaso(k)] || HONOR_RESUMO[vr] || "", especie: esp};
}
// Onda 4 · o que o dossiê diz para os honorários: a renda do extrato de
// pagamento (ou a RMI da carta) e a conta pelo padrão da variante do contrato.
// Com ajuste combinado, a conta pelo padrão não vale e o quadro diz isso.
function quadroHonorDossie(c, ks){
  const f = fontesDoDossie(c.id), ct = contratoDoCliente(c, ks);
  const valor = s => +String(s||"").replace(/\./g, "").replace(",", ".") || 0;
  const vr = variantePorEspecie(ct ? ct.especie : especieDoCliente(c, ks));
  const linhas = [];
  const conta = (base, de) => ct && ct.ajuste ? "Há ajuste combinado no contrato: a conta pelo padrão não vale."
    : vr==="incapacidade" ? `Pelo padrão, 20% sobre 6 benefícios dá ${moeda(base*1.2)} na concessão pelo INSS; 30% sobre 6 dá ${moeda(base*1.8)} em recurso ou judicial, mais 30% dos atrasados.`
    : vr==="revisao" ? "Na revisão, os honorários saem das 3 primeiras diferenças, que o documento não mostra."
    : `Pelo padrão, os 3 primeiros benefícios integrais somam ${moeda(base*3)}, pela ${de}.`;
  for(const e of f.extratos){
    const mr = valor(e.mr), pagos = e.creditos.filter(x=>x.pago && x.pagoEm).sort((a,b)=>isoBr(a.pagoEm).localeCompare(isoBr(b.pagoEm)));
    if(!mr) continue;
    linhas.push(`<li><span>Extrato de pagamento do NB ${esc(fmtNb(e.nb))}: renda mensal de ${moeda(mr)}${pagos.length ? `, ${pagos.length} crédito${pagos.length>1?"s":""} pago${pagos.length>1?"s":""}, o primeiro em ${esc(pagos[0].pagoEm)}` : ""}. ${esc(conta(mr, "renda do extrato"))}</span>
      <button type="button" class="adr-link" onclick="abrirAnexo('${e.anexo.id}')">ver</button></li>`);
  }
  for(const ca of f.cartas.filter(x=>!f.extratos.some(e=>e.nb===x.nb && valor(e.mr)))){
    const rmi = valor(ca.rmi); if(!rmi) continue;
    linhas.push(`<li><span>Carta de concessão do NB ${esc(fmtNb(ca.nb))}: RMI de ${moeda(rmi)}, DIB ${esc(ca.dib||"não lida")}. ${esc(conta(rmi, "RMI da carta, sem o valor atualizado"))}</span>
      <button type="button" class="adr-link" onclick="abrirAnexo('${ca.anexo.id}')">ver</button></li>`);
  }
  return linhas.length ? `<section class="adr-card hon-dossie" aria-labelledby="hon-dos-t">
    <h3 class="adr-h" id="hon-dos-t">O que o dossiê diz para os honorários</h3>
    <ul class="dossie-fatos">${linhas.join("")}</ul></section>` : "";
}
// F181 · a cobrança: o lançamento em aberto mais antigo (vencido primeiro)
function proximaCobranca(abertos){
  return abertos.filter(p=>p.vencimento).sort((x,y)=>x.vencimento.localeCompare(y.vencimento))[0] || null;
}
function origemPgto(p){ const d = semNota(p.descricao); return d && d!=="Recebimento" ? d : "honorários"; }   // F236 · sem a conta da estimativa
function primeiroNomeDe(c){
  const n=((c&&c.nome)||"").trim().split(/\s+/)[0]||"";
  return n ? n[0].toUpperCase()+n.slice(1).toLowerCase() : "";
}
function zapDe(c){
  const ts=telefonesDe(c||{}), t=ts.find(x=>x.zap)||ts[0];
  const d=t ? String(t.numero||"").replace(/\D/g,"") : "";
  return !d ? "" : d.length<=11 ? "55"+d : d;
}
function mensagemCobranca(c, p){
  const venceu = p.vencimento && p.vencimento<hoje();
  // F236 · o cliente não fala em "B31": a espécie vai pelo nome
  const origem = origemPgto(p).replace(/\bB\s?(\d{2})\b/g, (m, n)=>{ const e = nomeDaEspecie("B"+n); return e ? `do ${e.toLowerCase()}` : m; });
  return `Prezado(a) ${primeiroNomeDe(c)},

O escritório de advocacia previdenciária Paulo Roberto Tercini Filho informa que a parcela de honorários advocatícios (${origem}), no valor de ${moedaTxt(p.valor)}, ${venceu?"venceu":"vence"} em ${fmtBarra(p.vencimento)}.

O pagamento pode ser feito por [FORMA DE PAGAMENTO]. Caso já o tenha efetuado, pedimos a gentileza de desconsiderar esta mensagem e, se possível, enviar o comprovante.

Permanecemos à disposição.
Atenciosamente,
Escritório Paulo Roberto Tercini Filho`;
}
function abrirCobranca(pgId){
  const p=(D.pagamentos||[]).find(x=>x.id===pgId); if(!p) return;
  const c=D.cliPorId.get(p.cliente_id||(D.casoPorId.get(p.caso_id)||{}).cliente_id||clienteAberto)||D.cliPorId.get(clienteAberto);   // F236 · também fora da ficha
  const tel=zapDe(c);
  caixa(`<h3 style="margin:0 0 8px">Mensagem de cobrança</h3>
    <p class="adr-nota" style="margin-bottom:8px">Confira e troque o [FORMA DE PAGAMENTO] antes de enviar. Nada sai sozinho.</p>
    <label class="adr-campo">Texto<textarea id="cob-txt" rows="12" style="width:100%;min-width:min(520px,80vw);font:inherit;font-weight:400;color:var(--texto,#1f1f1f);padding:8px;box-sizing:border-box">${esc(mensagemCobranca(c, p))}</textarea></label>
    <div class="form-linha" style="margin-top:10px">
      <button class="adr-bt" onclick="copiar(document.getElementById('cob-txt').value,'Mensagem copiada')">copiar</button>
      ${tel?`<a class="adr-bt adr-primario cob-zap" style="display:inline-flex;align-items:center;text-decoration:none" target="_blank" rel="noopener"
        href="https://wa.me/${tel}?text=${encodeURIComponent(mensagemCobranca(c, p))}"
        onclick="this.href='https://wa.me/${tel}?text='+encodeURIComponent(document.getElementById('cob-txt').value)" aria-label="Abrir no WhatsApp">${iconeFonte("zap")} Abrir</a>`
        :`<span class="adr-nota">Sem telefone cadastrado para o WhatsApp.</span>`}
    </div>`);
}
// lembrete "geral" 3 dias antes de cada vencimento em aberto. Os já criados
// ficam em campos.cobranca.lembretes ({pgto_id: lembrete_id}): o lembrete
// avisado sai da lista ativa, e o mapa impede que ele renasça
async function lembretesCobranca(c, quieto){
  const ks=D.casosDoCliente.get(c.id)||[];
  const cob={lembrar:true, lembretes:{}, ...(((c.campos||{}).cobranca)||{})};
  cob.lembretes={...(cob.lembretes||{})};
  // F236 · sem valor ("a calcular") ou com valor a conferir não há o que cobrar
  const abertos=(D.pagamentos||[]).filter(p=>(p.cliente_id===c.id || ks.some(k=>k.id===p.caso_id))
    && p.status==="aberto" && p.vencimento && !pgSemValor(p) && !valorSuspeito(p));
  let novos=0;
  try{
    for(const p of abertos){
      // F236 · o vencido não ganha lembrete no passado: cai hoje; o que o tribunal paga não é cobrança, é conferir o depósito
      const quando=[somaDias(p.vencimento,-3), hoje()].sort()[1], titulo=`${natPgto(p)==="contrato"?"Cobrança":"Conferir o depósito"}: ${origemPgto(p)} ${moedaTxt(p.valor)}`;
      const lid=cob.lembretes[p.id], l=lid && (D.lembretes||[]).find(x=>x.id===lid);
      if(lid){
        if(l && l.ativo!==false && (l.proximo_em!==quando || l.titulo!==titulo)){
          await api(`/rest/v1/lembretes?id=eq.${l.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
            body:JSON.stringify({proximo_em:quando, titulo})});
          Object.assign(l, {proximo_em:quando, titulo});
        }
        continue;
      }
      const r=await api(`/rest/v1/lembretes`,{method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({cliente_id:c.id, tipo:"geral", titulo, detalhes:{origem:"cobranca", pgto_id:p.id},
          intervalo_meses:null, proximo_em:quando, responsavel_id:(quemCobra(p)[0]||{}).id||null, criado_por:eu.id})});   // F236 · de quem cobra
      const l2=r&&r[0]; if(!l2) continue;
      (D.lembretes=D.lembretes||[]).push(l2);
      cob.lembretes[p.id]=l2.id; novos++;
    }
  }catch(e){ aviso("Não consegui criar os lembretes de cobrança — tente de novo"); }
  await gravarCamposCli(c, {cobranca:cob});
  if(!quieto) aviso(novos ? `${novos} lembrete(s) de cobrança criado(s), 3 dias antes de cada vencimento`
                          : "Os vencimentos em aberto já têm lembrete", false);
  montarSidebar();
}
async function alternarLembrarCobranca(cliId, ligar){
  const c=D.cliPorId.get(cliId); if(!c) return;
  if(ligar) await lembretesCobranca(c);
  else{
    const cob={...(((c.campos||{}).cobranca)||{})};
    // desligar apaga os lembretes ainda ativos; religar cria de novo
    for(const lid of Object.values(cob.lembretes||{})){
      const l=(D.lembretes||[]).find(x=>x.id===lid);
      if(l && l.ativo!==false){
        await api(`/rest/v1/lembretes?id=eq.${l.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
          body:JSON.stringify({ativo:false})}).catch(()=>{});
        l.ativo=false;
      }
    }
    await gravarCamposCli(c, {cobranca:{lembrar:false, lembretes:{}}});
    aviso("Lembretes de cobrança desligados", false);
    montarSidebar();
  }
  repintarFicha();
}
async function gravarCamposCli(c, patch){
  c.campos={...(c.campos||{}), ...patch};
  try{
    await api(`/rest/v1/clientes?id=eq.${c.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({campos:c.campos})});
    return true;
  }catch(e){ aviso("Não consegui guardar — tente de novo"); return false; }
}
// F181 · destaque dos honorários (art. 22, §4º, do EAOAB), em campos.contrato
const DESTAQUE_OPC = [["nao","não pedido",false],["cumprimento","pedir no cumprimento de sentença",false],
  ["pedido","pedido em",true],["deferido","deferido em",true],["indeferido","indeferido em",true]];
function textoDestaque(d){
  const o=DESTAQUE_OPC.find(x=>x[0]===(d&&d.st)) || DESTAQUE_OPC[0];
  return o[2] ? (d.em ? `${o[1]} ${fmt(d.em)}` : o[1].replace(/ em$/,"")) : o[1];
}
async function salvarDestaque(cliId, casoId){
  await salvarDestaqueComo(cliId, casoId, document.getElementById("hon-dst").value, document.getElementById("hon-dst-em").value);
}
// F236 · o destaque é do processo: com dois ou mais casos, cada um guarda o seu em campos.contrato.casos[id]; com um
// só, continua no cliente, como antes
async function salvarDestaqueComo(cliId, casoId, st, em){
  const c=D.cliPorId.get(cliId); if(!c) return;
  const comData=(DESTAQUE_OPC.find(x=>x[0]===st)||[])[2];
  const d = comData && em ? {st, em} : {st};
  const ct={...(((c.campos||{}).contrato)||{})};
  if(casoId && (D.casosDoCliente.get(cliId)||[]).filter(k=>!ehPreCaso(k)).length>1)
    ct.casos = {...(ct.casos||{}), [casoId]: {...((ct.casos||{})[casoId]||{}), destaque:d}};
  else ct.destaque = d;
  if(await gravarCamposCli(c, {contrato:ct})){ aviso(`Destaque: ${textoDestaque(d)}`, false); repintarFicha(); }
}
// F181 · o contrato assinado é um anexo do cliente; o mais novo é o que vale, e trocar é só anexar outro.
// F236 · vale também o PDF assinado de Documentos e do atendimento ("Assinado · …") que traz o contrato: pelo nome, ou
// porque veio depois da folha gerada com o Contrato de Honorários e não diz ser outra peça
function contratosAssinadosDe(c){
  const an = (D.anexos||[]).filter(a=>a.cliente_id===c.id);
  const gerado = an.filter(a=>a.origem==="gerado" && /contrato/i.test(a.nome||"")).map(a=>String(a.criado_em||"")).sort()[0];
  return an.filter(a=>/^Contrato assinado/.test(a.nome||"") || (a.origem==="assinado" && (/contrat/i.test(a.nome||"")
      || (gerado && String(a.criado_em||"")>=gerado && !/procura|declara|termo|requerim|autoriza|substabelec/i.test(a.nome||"")))))
    .sort((x,y)=>String(y.criado_em||"").localeCompare(String(x.criado_em||"")));
}
async function anexarContratoAssinado(cliId, inp){
  const arq=inp&&inp.files&&inp.files[0]; if(!arq) return;
  inp.value="";
  if(!/^(application\/pdf|image\/)/.test(arq.type||"")) return aviso("Anexe um PDF ou uma imagem");
  try{
    const stamp=new Date().toISOString().replace(/[:.]/g,"-").toLowerCase();
    const ext=(arq.name.match(/\.[a-z0-9]+$/i)||[".pdf"])[0].toLowerCase();
    const caminho=`${cliId}/${stamp}-contrato-assinado${ext}`;
    await subirArquivo(caminho, arq);
    const r=await api(`/rest/v1/anexos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:null, cliente_id:cliId, autor_id:eu.id, origem:"assinado",   // F236 · entra também em Documentos › Gerados e assinados
        nome:`Contrato assinado ${fmt(hoje())} - ${arq.name}`, caminho, tipo:arq.type, tamanho:arq.size})});
    const an=(r&&r[0]) || null;
    if(an) (D.anexos=D.anexos||[]).unshift(an);
    aviso("Contrato assinado guardado nos anexos do cliente", false);
  }catch(e){ return aviso("Não consegui guardar o contrato — tente de novo"); }
  repintarFicha();
}
function painelPagamentosFicha(ks, ands, pgs, pagK, c){
  const hj = hoje();
  const validos = pgs.filter(p=>p.status!=="cancelado");
  const recebidos = validos.filter(p=>p.status!=="aberto");
  const abertos = validos.filter(p=>p.status==="aberto");
  // F236 · todo total é de valor que pode ser verdade ("conferir valor" fica fora); o estimado e o "a calcular" à parte
  const soma = l => l.filter(p=>!valorSuspeito(p)).reduce((t,p)=>t+(Number(p.valor)||0), 0);
  const estimados = abertos.filter(p=>pgEstimado(p) && !pgSemValor(p)), aCalcular = abertos.filter(pgSemValor);
  const vencidos = abertos.filter(p=>p.vencimento && p.vencimento<hj && !pgSemValor(p) && !valorSuspeito(p))
    .sort((x,y)=>x.vencimento.localeCompare(y.vencimento));
  // F236 · "próximo vencimento" é só o que ainda não venceu: o vencido tem quadro próprio, em vermelho (antes ele
  // aparecia como "próximo" quando não havia data futura, e sumia atrás do próximo quando havia)
  const prox = abertos.filter(p=>p.vencimento && p.vencimento>=hj && !valorSuspeito(p))
    .sort((x,y)=>x.vencimento.localeCompare(y.vencimento))[0];
  const reais = ks.filter(k=>!ehPreCaso(k)), varios = reais.length>1;
  // F236 · o contrato é o do caso escolhido, e não o do primeiro caso ativo
  const kSel = reais.find(x=>x.id===casoSel) || reais.find(x=>x.fase!=="encerrado") || null;
  const ct = contratoDoCliente(c, ks, kSel);
  const dataDe = p => p.pago_em || p.vencimento || "";
  const linhas = [...pgs].sort((x,y)=>dataDe(x).localeCompare(dataDe(y)));
  const parc = c ? parceriaDe(c, ks) : "";
  const cct = (c && (c.campos||{}).contrato) || {};
  const dst = c ? destaqueDe(c, kSel) : null;
  const dstHerdado = varios && kSel && !((cct.casos||{})[kSel.id]||{}).destaque && !!cct.destaque;
  const assinados = c ? contratosAssinadosDe(c) : [], assin = assinados[0] || null;
  const cob = proximaCobranca(abertos.filter(cobravel));
  const props = c ? reais.filter(k=>k.fase!=="encerrado").map(k=>propostaHonorarios(c, k)).filter(Boolean) : [];
  const lancaveis = props.flatMap(pr=>pr.itens.filter(x=>!x.condic && (!x.alvo || pgSemValor(x.alvo))));
  const aLancar = lancaveis.reduce((s,x)=>s+(+x.valor||0), 0), aLancarEst = lancaveis.some(x=>x.valor && /^≈/.test(x.nota||""));
  const sucRec = soma(recebidos.filter(p=>natPgto(p)==="sucumbencia"));
  const ccSel = kSel && concessaoDoCaso(kSel), pagoSel = !!(ccSel && ccSel.paga);
  const dstProc = c && kSel && (dst||{}).st!=="deferido" ? destaqueDoProcesso(kSel) : null;
  const deCaso = p => { const k = varios && D.casoPorId.get(casoDoPgto(p)); return k ? ` · ${tituloCaso(k)}${k.fase==="encerrado"?" (encerrado)":""}` : ""; };
  const ha = iso => { const d = -diasAte(iso); return `${d} dia${d===1?"":"s"}`; };
  const outrosCt = c ? reais.filter(k=>k!==kSel && abertos.some(p=>casoDoPgto(p)===k.id)).map(k=>{ const o = contratoDoCliente(c, ks, k);
    return o ? `<div class="hon-ct-outro"><b>${esc(tituloCaso(k))}${k.fase==="encerrado"?" (encerrado)":""}</b><dl class="hon-dl">
      <dt>Contratado</dt><dd>${esc(o.ajuste ? `ajuste combinado: ${o.ajuste}` : o.padrao)}</dd>
      <dt>Destaque</dt><dd>${esc(textoDestaque(destaqueDe(c, k)))}</dd></dl></div>` : ""; }).join("") : "";
  return `<div class="adr hon">${faixaDoCaso(ks)}${c && (!c.cpf || !dnIso(c.dn)) ? `<p class="meio-sub hon-cad">⚠ Sem ${[!c.cpf && "CPF", !dnIso(c.dn) && "nascimento"].filter(Boolean).join(" e ")} no cadastro: o recibo e a mensagem de cobrança saem sem ${!c.cpf && !dnIso(c.dn) ? "eles" : "ele"}. <button type="button" class="btn-mini" onclick="irPreencherCadastro('${c.id}')">Completar</button></p>` : ""}
    ${vencidos.length ? `<section class="hon-vencidos" aria-label="Honorários vencidos">
      <div class="hon-venc-cab"><b>Vencido: ${moeda(soma(vencidos))}</b>
        <span>${vencidos.length===1?"1 lançamento":`${vencidos.length} lançamentos`}, o mais antigo há ${ha(vencidos[0].vencimento)}: cobrar hoje</span></div>
      <ul>${vencidos.map(p=>`<li><span>${esc(origemPgto(p))}${esc(deCaso(p))}</span><b>${moeda(p.valor)}</b>
        <span class="hon-sit hon-venc">venceu em ${fmt(p.vencimento)}, há ${ha(p.vencimento)}</span>
        ${cobravel(p) ? `<button class="adr-bt" onclick="abrirCobranca('${p.id}')" title="Mensagem de cobrança"><span aria-hidden="true">Cobrança</span><span class="sr-only">Mensagem de cobrança</span></button>`
          : `<small class="hon-nota">${natPgto(p)!=="contrato" ? "quem paga é o tribunal: confira o depósito" : "valor estimado: confira no extrato antes de cobrar"}</small>`}</li>`).join("")}</ul>
    </section>` : ""}
    <section class="hon-resumo" aria-label="Resumo dos honorários">
      <div class="adr-tile adr-t-texto"><span class="adr-tile-rot">Contratado${varios&&kSel?` · ${esc(tituloCaso(kSel))}`:""}</span>
        <span class="adr-tile-val">${ct ? (ct.ajuste ? "Ajuste combinado" : "Padrão do escritório") : "—"}</span>
        <span class="adr-tile-sub">${ct ? esc(ct.ajuste || ct.padrao) : "sem contrato registrado"}</span></div>
      <div class="adr-tile hon-t-rec"><span class="adr-tile-rot">Recebido</span>
        <span class="adr-tile-val">${moeda(soma(recebidos) - sucRec)}</span>
        <span class="adr-tile-sub">${recebidos.length} de ${validos.length} lançamento${validos.length===1?"":"s"}${sucRec?` · mais ${moeda(sucRec)} de sucumbência, que é do advogado (EAOAB, art. 23)`:""}</span></div>
      <div class="adr-tile"><span class="adr-tile-rot">A receber</span>
        <span class="adr-tile-val">${moeda(soma(abertos.filter(p=>!pgEstimado(p))))}</span>
        <span class="adr-tile-sub">${[`${abertos.length} em aberto`, estimados.length ? `+ ≈ ${moeda(soma(estimados))} estimado` : "",
          aCalcular.length ? `${aCalcular.length} a calcular` : "", vencidos.length ? `<b class="hon-t-venc">${vencidos.length} vencido${vencidos.length>1?"s":""}</b>` : "",
          aLancar ? `+ ${aLancarEst?"≈ ":""}${moeda(aLancar)} a lançar (abaixo)` : lancaveis.length ? `${lancaveis.length} a lançar, a calcular (abaixo)` : ""].filter(Boolean).join(" · ")}</span></div>
      <div class="adr-tile${prox?" hon-t-prox":""}"><span class="adr-tile-rot">Próximo vencimento</span>
        <span class="adr-tile-val">${prox ? fmt(prox.vencimento) : "—"}</span>
        <span class="adr-tile-sub">${prox ? `${esc(origemPgto(prox))} · ${pgSemValor(prox)?"a calcular":moeda(prox.valor)}` : vencidos.length ? "nada a vencer: os vencidos estão acima" : "nada em aberto com data"}</span></div>
    </section>
    ${props.map(cartaoProposta).join("")}
    ${reais.filter(k=>k.fase!=="encerrado" && (["judicial","pagamento"].includes(k.fase) || reqsDoCaso(k).length)).map(cartaoRequisicoes).join("")}
    <div class="adr-colunas">
      <section class="adr-card adr-col-larga hon-lanc" aria-labelledby="hon-lanc-t">
        <div class="adr-cab"><h3 class="adr-h" id="hon-lanc-t">Lançamentos</h3></div>
        ${linhas.length ? `<div class="hon-tab-cx"><table class="hon-tab">
          <thead><tr><th scope="col">Data</th><th scope="col">Origem</th><th scope="col" class="hon-num">Valor</th>
            <th scope="col">Situação</th><th scope="col"><span class="sr-so">Ação</span></th></tr></thead>
          <tbody>${linhas.map(p=>{
            const cfs=p.conferencias||[];
            const jaConferi=cfs.some(cf=>cf.c===eu.id);
            const susp = p.status==="aberto" && valorSuspeito(p), nota = notaPgto(p);
            const [sit, cor] = susp ? ["conferir valor", "venc"] : situacaoPgto(p, prox && prox.id);
            const canc = p.status==="cancelado", risca = t => canc ? `<s>${t}</s>` : t;
            return `<tr class="pgto${canc?" hon-cancelado":""}" data-pg="${p.id}">
              <td class="hon-data">${risca(dataDe(p) ? fmt(dataDe(p)) : "—")}</td>
              <td class="desc">${risca((d=>d&&d!=="Recebimento"?esc(d):"Recebimento")(semNota(p.descricao)))}${canc?`<small class="hon-nota">Cancelado${p.cancelado_por?` por ${esc(((D.colPorId.get(p.cancelado_por)||{}).nome||"?").split(" ")[0])}`:""}${p.cancelado_em?` em ${fmtTS(p.cancelado_em)}`:""}${p.cancelado_motivo?`: ${esc(p.cancelado_motivo)}`:""}</small>`:""}${p.editado_em && !canc?`<small class="hon-nota">Editado${p.editado_por?` por ${esc(((D.colPorId.get(p.editado_por)||{}).nome||"?").split(" ")[0])}`:""} em ${fmtTS(p.editado_em)}</small>`:""}${nota?`<small class="hon-nota">${esc(nota)}</small>`:""}${susp?`<small class="hon-nota">valor fora do comum (um número de processo ou de benefício lido como valor?): fica fora dos totais até alguém conferir
                  <button class="btn-mini" onclick="conferirValor('${p.id}')" title="o valor está certo: ele volta aos totais"><span aria-hidden="true">Confirmar</span><span class="sr-only">o valor está certo</span></button></small>`:""}
                <div class="hon-vinc">${vinculoDaParcela(p, ks)}
                <span class="cadeia">${cfs.map((cf,i)=>{const co=D.colPorId.get(cf.c);
                  return `<span class="conf-et" title="${co?esc(co.nome):"?"} ${i===0?"recebeu":"conferiu"} em ${fmtTS(cf.em)}">
                    <span class="avatar mini" style="background:${co?co.cor:"#a19f9d"}">${co?esc(co.inicial):"·"}</span>
                    <small>${i===0?"recebeu":"conferiu"} ${fmtTS(cf.em).slice(0,5)}</small></span>`;}).join(`<span class="conf-seta">→</span>`)}</span></div></td>
              <td class="valor hon-num">${risca(p.status==="aberto" && pgSemValor(p) ? "a calcular" : `${pgEstimado(p)?"≈ ":""}${moeda(p.valor)}`)}</td>
              <td><span class="hon-sit hon-${cor}">${sit}</span></td>
              <td class="hon-acao">${p.status==="aberto"?`<button class="adr-bt" data-recebe="${p.id}">recebido</button><button class="adr-bt" onclick="editarPgto('${p.id}')" title="corrigir o valor ou o vencimento">Editar</button><button class="adr-bt" onclick="cancelarPgto('${p.id}')" title="cancelar este lançamento, com o motivo (ele fica riscado)">Cancelar</button>`:
                canc ? "" : `${!jaConferi?`<button class="adr-bt" data-confere="${p.id}">conferi</button>`:""}<button class="adr-bt" onclick="desfazerPgto('${p.id}')" title="${cfs.length>1 && cfs[cfs.length-1].c===eu.id ? "desfazer a sua conferência" : "desfazer o recebido: o lançamento volta a receber"}">Desfazer</button>`}</td>
            </tr>`;}).join("")}</tbody></table></div>`
          : "<p class='meio-sub'>Nenhum recebimento registrado ainda.</p>"}
        <details class="hon-novo" ${linhas.length?"":"open"}>
          <summary class="adr-bt adr-primario">+ lançamento</summary>
          <div class="form-linha" style="align-items:center">
          ${(()=>{
            // com mais de um caso o lançamento pergunta de qual benefício é —
            // sem isso, o dinheiro entrava sempre no primeiro da lista
            const casos=ks.filter(k=>k.fase!=="pagamento");
            if(casos.length>1)
              return `<select id="np-caso" class="pg-caso" style="max-width:230px" title="benefício/serviço deste pagamento">
                <option value="">— de qual benefício? (opcional) —</option>
                ${casos.map(k=>`<option value="${k.id}">${esc(tituloCaso(k))}</option>`).join("")}</select>`;
            return `<input type="hidden" id="np-caso" value="${(pagK[0]||casos.find(k=>k.fase!=="encerrado")||casos[0]||{}).id||""}">`;
          })()}
            <label class="adr-campo">Data<input type="date" id="np-data" value="${hoje()}"></label>
            <label class="adr-campo">Valor<input id="np-valor" type="number" step="0.01" placeholder="R$" style="width:120px"></label>
            <label class="adr-campo" style="flex:1;min-width:160px">Origem<input id="np-desc" placeholder="RPV, honorários, 1ª parcela…"></label>
            <span role="radiogroup" aria-label="Situação do lançamento" style="display:flex;gap:12px">
              <label class="conta-ck" style="display:flex;align-items:center;gap:6px;min-height:40px" title="o dinheiro já entrou: a data é o dia do recebimento">
                <input type="radio" name="np-sit" value="recebido" style="width:18px;height:18px">Recebido</label>
              <label class="conta-ck" style="display:flex;align-items:center;gap:6px;min-height:40px" title="ainda não entrou: a data é o vencimento">
                <input type="radio" name="np-sit" value="aberto" style="width:18px;height:18px">A receber</label></span>
            <button class="adr-bt adr-primario" onclick="novoPgto()">Registrar</button>
          </div>
          <p class="adr-nota">Marque sempre: <strong>Recebido</strong> (a data é o dia em que entrou e você consta como quem recebeu) ou
            <strong>A receber</strong> (a data é o vencimento, inclusive o do honorário que venceu e não entrou). Quem pegar o dinheiro depois clica <strong>conferi</strong>:
            a corrente mostra quem recebeu e quem conferiu, com a data de cada um.</p>
        </details>
      </section>
      <aside class="adr-col-lado">
        ${c ? quadroHonorDossie(c, ks) : ""}
        <section class="adr-card" aria-labelledby="hon-ct-t">
          <h3 class="adr-h" id="hon-ct-t">Contrato${varios&&kSel?` · ${esc(tituloCaso(kSel))}`:""}</h3>
          ${ct ? `<dl class="hon-dl">
            ${ct.especie?`<dt>Serviço</dt><dd>${esc(ct.especie)}</dd>`:""}
            <dt>Parceria</dt><dd>${parc?esc(parc):"sem parceria"}</dd>
            <dt>Destaque</dt><dd class="hon-dst-val">${esc(textoDestaque(dst))}</dd>
            <dt>Assinado</dt><dd class="hon-ass-val">${assin?(assin.criado_em?`em ${fmtTS(assin.criado_em)}`:"anexado"):"não anexado"}${assinados.length>1?` <small class="hon-nota">e também em ${assinados.slice(1).map(a=>fmtTS(a.criado_em)).join(", ")}</small>`:""}</dd>
          </dl>${dstHerdado?`<p class="hon-nota">O destaque foi registrado para o cliente: confirme o deste caso em “alterar o destaque”.</p>`:""}`
            : `<p class="adr-nota">Nenhum caso nem atendimento com espécie: o contrato sai quando houver.</p>`}
          ${dstProc ? `<p class="adr-nota">O processo diz: destaque deferido em ${fmt(dstProc.em)} (${esc(dstProc.anexo.nome||"decisão")}).
            <button class="adr-bt" onclick="salvarDestaqueComo('${c.id}','${kSel.id}','deferido','${dstProc.em}')" title="marcar como deferido"><span aria-hidden="true">Deferido</span><span class="sr-only">marcar como deferido</span></button></p>` : ""}
          ${outrosCt}
          ${c ? `<div class="hon-ct-acoes">${pagoSel ? `<p class="adr-nota">${esc(textoPosPagamento(ccSel, dst))}</p>` : `<details class="hon-dst"><summary class="adr-bt">alterar o destaque</summary>
            <div class="form-linha" style="margin-top:8px;align-items:flex-end">
              <label class="adr-campo">Destaque dos honorários<select id="hon-dst">${DESTAQUE_OPC.map(([v,r,d])=>
                `<option value="${v}" ${(dst||{}).st===v?"selected":""}>${d?r+" (data)":r}</option>`).join("")}</select></label>
              <label class="adr-campo">Data<input type="date" id="hon-dst-em" value="${esc((dst||{}).em||"")}"></label>
              <button class="adr-bt adr-primario" onclick="salvarDestaque('${c.id}'${kSel?`,'${kSel.id}'`:""})">Guardar</button>
            </div></details>`}
          <div class="hon-assinado">
            ${assin?`<button class="adr-bt" onclick="abrirAnexo('${assin.id}')" title="abrir o contrato assinado"><span aria-hidden="true">Contrato</span><span class="sr-only">abrir o contrato assinado</span></button>`:""}
            ${assinados.slice(1).map(a=>`<button class="adr-bt" onclick="abrirAnexo('${a.id}')">abrir o de ${fmtTS(a.criado_em)}</button>`).join("")}
            <label class="adr-bt" style="display:inline-flex;align-items:center">${assin?"trocar o arquivo":"anexar contrato assinado"}
              <input type="file" accept="application/pdf,image/*" class="sr-so" id="hon-ass-arq"
                onchange="anexarContratoAssinado('${c.id}', this)"></label>
          </div></div>` : ""}
        </section>
        ${c ? `<section class="adr-card hon-cob" aria-labelledby="hon-cob-t">
          <h3 class="adr-h" id="hon-cob-t">Cobrança</h3>
          ${cob ? `<p class="hon-cob-item"><b>${esc(origemPgto(cob))}</b>${esc(deCaso(cob))} · ${moeda(cob.valor)}<br>
              <span class="hon-sit hon-${cob.vencimento<hoje()?"venc":"prox"}">${cob.vencimento<hoje()?"venceu":"vence"} em ${fmt(cob.vencimento)}</span></p>
            <button class="adr-bt adr-primario" style="width:max-content" onclick="abrirCobranca('${cob.id}')" title="Mensagem de cobrança"><span aria-hidden="true">Cobrança</span><span class="sr-only">Mensagem de cobrança</span></button>`
            : `<p class="adr-nota">${abertos.some(p=>p.vencimento && !cobravel(p) && !valorSuspeito(p)) ? "Nada a cobrar do cliente agora: o que está em aberto com data se confere (o depósito do tribunal ou a estimativa no extrato)." : "Nenhum lançamento em aberto com vencimento."}</p>`}
          <label class="conta-ck hon-cob-lemb" style="display:flex;align-items:center;gap:8px;min-height:40px;margin-top:8px">
            <input type="checkbox" id="hon-cob-lemb" style="width:20px;height:20px" ${(((c.campos||{}).cobranca)||{}).lembrar?"checked":""}
              onchange="alternarLembrarCobranca('${c.id}', this.checked)">lembrar 3 dias antes de cada vencimento</label>
        </section>` : ""}
        ${pagK.map(k=>{
          const ult=ands.filter(a=>a.caso_id===k.id)[0];
          const uco=ult&&D.colPorId.get(ult.autor_id);
          const lan=pgs.filter(p=>casoDoPgto(p)===k.id), ab=lan.filter(p=>p.status==="aberto");
          // F236 · a frase diz onde o dinheiro está: com a RPV paga e o honorário a receber, não é "falta o dinheiro entrar"
          const cc=concessaoDoCaso(k), prec=!!(cc && cc.reqs.length && cc.reqs.every(r=>r.precatorio));
          const frase = cc && cc.paga ? `${prec?"Precatório pago":"RPV paga"} em ${fmt(cc.paga)}: ${ab.length ? `falta receber os honorários (${moeda(soma(ab))}${ab.some(pgSemValor)?", mais o que está a calcular":""}).` : "nada em aberto — confira e encerre o caso."}`
            : cc && cc.exped ? (prec ? `Precatório expedido em ${fmt(cc.exped)}: pago pelo cronograma do tribunal.`
              : `RPV expedida em ${fmt(cc.exped)}: o tribunal paga em até 60 dias da entrega da requisição (Lei 10.259, art. 17), por volta de ${fmt(somaDias(cc.exped,60))}.`)
            : `Já venceram as fases; falta o dinheiro entrar.${lan.length?"":" Nenhum valor lançado ainda."}`;
          const etapa = cc && cc.paga ? "recebido" : cc && cc.exped ? "RPV expedida" : "";
          return `<section class="adr-card hon-receb" aria-label="Em recebimento: ${esc(tituloCaso(k))}">
            <div class="adr-cab"><h3 class="adr-h">Em recebimento</h3><span class="adr-chip">${esc(listaDe(k))}</span></div>
            <div><b>${esc(tituloCaso(k))}</b>
              ${k.nb?`<span class="chip neutro">NB ${esc(k.nb)}</span>`:""}
              ${k.processo?`<span class="chip neutro">proc. ${esc(k.processo)}</span>`:""}
              ${k.resultado?`<span class="chip fase">${esc(k.resultado)}</span>`:""}</div>
            <p class="adr-nota">${esc(frase)}</p>
            ${etapa && k.etapa!==etapa ? `<p class="adr-nota">A etapa ainda diz “${esc(k.etapa||"sem etapa")}”.
              <button class="adr-bt" onclick="gravarEtapa('${k.id}','${etapa}')">marcar “${etapa}”</button></p>` : ""}
            <button class="adr-bt" style="width:max-content" onclick="irAoCaso('${k.id}')" title="a história do processo: andamentos, decisões, a requisição e o comprovante"><span aria-hidden="true">Processo</span><span class="sr-only">ver o processo e os documentos</span></button>
            <label class="adr-campo lembrar-caixa" title="quando conferir se o pagamento saiu">Lembrar em
              <input type="date" value="${k.prazo||""}" data-prazo="${k.id}"></label>
            <label class="adr-campo">Fase
              <select data-fase="${k.id}">${Object.entries(NOME_FASE).map(([f,n])=>`<option value="${f}" ${k.fase===f?"selected":""}>${n}</option>`).join("")}</select></label>
            ${ult?`<div class="ult-and">Último andamento: ${fmtTS(ult.criado_em)}${uco?" ("+esc(uco.nome)+")":""} — ${esc(ult.texto)}</div>`:""}
          </section>`;}).join("")}
      </aside>
    </div>
  </div>`;
}

// aba 5 da ficha — extraída da pintarFicha (era um literal de 22 linhas)
function painelMensagensFicha(c, ks, evs){
  return `${ultimoZap()}
    <p class="meio-sub">Mensagens prontas, já preenchidas com os dados deste cliente — copie e cole no WhatsApp.</p>
    ${D.modelos.map(m=>{
      const ev = evs.find(e=>dataSP(e.data_hora)>=hoje() &&
        (m.contexto==="geral" || e.tipo.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").startsWith(m.contexto.slice(0,6))));
      const exigK = ks.find(k=>k.exigencia_prazo);
      const pronto = preencher(m.texto, c, ev, exigK&&exigK.exigencia_prazo);
      return `<div class="modelo"><div class="cab"><strong>${esc(m.titulo)}</strong>
        <button class="btn-mini" onclick="copiar(${esc(JSON.stringify(pronto))},'Mensagem copiada')"><span class="ic-bt">${CAD_IC.copiar}</span>copiar</button>
        ${c.telefone?`<button class="btn-mini" onclick="window.open('https://wa.me/55${c.telefone.replace(/\D/g,"")}?text='+encodeURIComponent(${esc(JSON.stringify(pronto))}),'_blank')">${iconeFonte("zap")}</button>`:""}</div>
        <div class="previa">${esc(pronto)}</div></div>`;
    }).join("")}
    <p class="meio-sub" style="margin-top:14px">Documentos para imprimir (preenchidos com os dados do cliente):</p>
    ${D.docModelos.filter(m=>m.categoria==="geral"||dsa(m.categoria)===dsa(ks[0]&&ks[0].beneficio||"")||ks.some(k=>k.beneficio&&dsa(m.categoria)===dsa(k.beneficio)))
      .map(m=>`<button class="btn-mini" style="margin:0 6px 6px 0" onclick="gerarDocumento('${m.id}','${c.id}')"><span class="ic-bt">${CAD_IC.doc}</span>${esc(m.titulo)}</button>`).join("")}
    <div class="form-linha">
      <input id="nm-titulo" placeholder="título do novo modelo">
      <select id="nm-ctx"><option value="geral">geral</option><option value="pericia">perícia</option><option value="audiencia">audiência</option><option value="exigencia">exigência</option></select>
    </div>
    <div class="form-linha">
      <input id="nm-texto" placeholder="texto — use {primeiro_nome}, {data}, {hora}, {local}, {prazo}" style="flex:1">
      <button onclick="novoModelo()" title="Salvar modelo">Salvar<span class="sr-only"> modelo</span></button>
    </div>`;
}

// muda a aba ativa da ficha por código (ex.: atalho "ver na aba Honorários")
function irAba(i){ abaAtiva=i; repintarFicha(); }

// pop-up "⚖️ Processos": escolher o processo certo sem errar o destino
function fecharMenuProcessos(){ const m=document.getElementById("menu-processos"); if(m) m.remove(); }
// o mesmo menu, aberto pelo nome/avatar do cliente no topo da ficha
function menuCasosDoCliente(ev, cliId){
  menuProcessos(ev, D.casosDoCliente.get(cliId)||[]);
}
// Caso em fase de PAGAMENTO não é mais um processo em andamento: o trabalho
// jurídico acabou e o que falta é dinheiro entrar. Ele sai do menu ⚖️ e passa
// a viver na aba 💰 Honorários — foi para isso que ela existe.
function processosDe(ks){ return (ks||[]).filter(k=>k.fase!=="pagamento"); }
function menuProcessos(ev, ks){
  ks = processosDe(ks).filter(k=>!k.pre_caso);
  // F668 · o pré-caso é caso em formação (onda 1, 21.11.2026): vem primeiro, com o selo; os encerrados ficam recolhidos no fim
  const cli = D.cliPorId.get((ks[0]||{}).cliente_id || clienteAberto), z = cli ? pcDaFicha(cli) : {lista:[], arq:[]};
  const itPc = (p, fora) => `<div class="mp-it mp-pc${fora ? " mp-pc-arq" : ""}${p.caso_id && casoSel===p.caso_id ? " sel" : ""}" ${p.caso_id ? `data-mp="${esc(p.caso_id)}"` : p.id!=="legado" && !fora ? `data-mp-pc="${esc(p.id)}"` : ""}${fora ? " hidden" : ""}>
    <b>${nomePc(p.especie)}</b> <span class="selo-form">${fora ? "Encerrado" : p.so_lembrete ? "Futuro" : "Em formação"}</span>
    <small>${fora ? esc([(p.desfecho||{}).motivo || "sem motivo registrado", (p.desfecho||{}).em && fmt(String(p.desfecho.em).slice(0,10))].filter(Boolean).join(" · "))
      : p.so_lembrete ? "🙏 Aposentadorias Futuras" : esc(`Passo: ${(k=>k ? passoDoPreCaso(k) : "Identificação")(p.caso_id && D.casoPorId.get(p.caso_id))}`)}</small></div>`;
  ev.stopPropagation(); fecharMenuProcessos();
  const m=document.createElement("div"); m.id="menu-processos";
  // a linha diz EM QUE LISTA o caso está (com o emoji do To Do — "👪
  // Judicial", "🙏 Aposentadorias Futuras"): é o mapa que o Paulo pediu ao
  // clicar no nome. Caso sem lista de origem cai no nome da fase.
  // F372 · embaixo: NB, DER, e-Sisrec e processo, sem o protocolo (pedido do Paulo, 02.11.2026)
  const item=k=>`<div class="mp-it ${casoSel===k.id?"sel":""} ${k.fase==="encerrado"?"enc":""}" data-mp="${k.id}" style="${k.fase==="encerrado"?"opacity:.55":""}">
    <b>${k.urgente?"🔥 ":""}${esc(tituloCaso(k))}</b>
    <small>${k.fase==="encerrado"?"✔ Encerrado":ehPreCaso(k)?`🟡 Pré-caso no escritório · ${esc(passoDoPreCaso(k))}`:esc(listaDe(k)!=="—"?listaDe(k):(NOME_FASE[k.fase]||""))}${(n=>esc([n.nb[0]&&`NB ${fmtNum("nb",n.nb[0])}`, k.der&&`DER ${fmtBarra(k.der)}`, n.nup[0]&&`e-Sisrec ${fmtNum("nup",n.nup[0])}`, n.proc[0]&&`proc. ${fmtNum("proc",n.proc[0])}`].filter(Boolean).map(x=>" · "+x).join("")))(numerosDoCaso(k))}${k.prazo?" · 🗓 "+fmt(k.prazo).slice(0,5):""}${k.exigencia_prazo?" · ⚠ exigência":""}</small>
  </div>`;
  m.innerHTML =
    z.lista.map(p=>itPc(p, false)).join("")
    + ks.filter(k=>k.fase!=="encerrado").map(item).join("")
    + (ks.length>1?`<div class="mp-it ${!casoSel?"sel":""}" data-mp=""><b>📚 Todos os processos</b><small>andamentos juntos</small></div>`:"")
    + ks.filter(k=>k.fase==="encerrado").map(item).join("")
    + (z.arq.length ? `<div class="mp-it mp-pc-tog" role="button" aria-expanded="false"><b>Pré-casos encerrados (${z.arq.length})</b><small>ver</small></div>${z.arq.map(p=>itPc(p, true)).join("")}` : "")
    + (ks.filter(k=>k.fase!=="encerrado").length>1 ? `<div class="mp-it mp-novo" data-mp="__org__">⇄ Organizar os casos</div>` : "")
    + (cli && podeAtender() ? `<div class="mp-it mp-novo" data-mp-novopc="1">＋ Novo pré-caso</div>` : "")
    + `<div class="mp-it mp-novo" data-mp="__novo__">＋ Novo processo</div>`;
  document.body.appendChild(m);
  const r=ev.currentTarget.getBoundingClientRect(), W=m.offsetWidth||300, H=m.offsetHeight||200;
  m.style.left=Math.min(r.left, innerWidth-W-8)+"px";
  m.style.top=Math.min(r.bottom+4, innerHeight-H-8)+"px";
  const tog = m.querySelector(".mp-pc-tog");
  if(tog) tog.onclick = e=>{ e.stopPropagation(); const ab = tog.getAttribute("aria-expanded")!=="true";
    tog.setAttribute("aria-expanded", String(ab)); tog.querySelector("small").textContent = ab ? "ocultar" : "ver";
    m.querySelectorAll(".mp-pc-arq").forEach(x=>x.hidden = !ab); };
  m.querySelectorAll("[data-mp-pc]").forEach(it=>it.onclick=()=>{ fecharMenuProcessos(); abrirAtendimentoDe(cli.id, it.dataset.mpPc); });
  m.querySelectorAll("[data-mp-novopc]").forEach(it=>it.onclick=()=>{ fecharMenuProcessos(); novoAtendimento(cli.id); });
  m.querySelectorAll("[data-mp]").forEach(it=>it.onclick=()=>{
    const v=it.dataset.mp;
    fecharMenuProcessos();
    if(v==="__org__") return organizarCasos(clienteAberto);
    if(v==="__novo__"){ abaAtiva=7; }
    else { casoSel=v||null; abaAtiva=2; subAba="escritorio"; }   // F166
    repintarFicha();
  });
  setTimeout(()=>document.addEventListener("click", fecharMenuProcessos, {once:true}));
}

async function removerVinculo(vid){
  await api(`/rest/v1/vinculos?id=eq.${vid}`,{method:"DELETE"});
  aviso("Vínculo removido"); abaAtiva=0; abrirFicha(clienteAberto);
}

// identidade didática do caso: "o que é" (benefício) + "onde está" (fase)
function nomeDaEspecie(cod){
  const e = ESPECIES.find(([c])=>c===cod);
  return e ? e[1] : null;
}
// O benefício é só outro jeito de escrever a espécie? Três formas reais:
// vazio; o genérico do PAT que o nome completo estende ("Auxílio-acidente"
// dentro de "Auxílio-acidente acidentário..."); e o código por extenso
// ("Espécie 94", "B94", "esp. 94" — o título da Marcela era "Espécie 94").
// Nesses três, o nome completo da espécie manda. Benefício escrito à mão
// que conta outra história não é tocado.
function beneficioGenerico(k, esp){
  const b = dsa(k.beneficio||"").trim();
  if(!b) return true;
  if(esp && dsa(esp).startsWith(b)) return true;
  // benefício que é SÓ um código ("Espécie 94", "B94", "esp. 94") é genérico
  // SEMPRE — mesmo que o código seja de outra espécie: trocar a espécie da
  // ficha deixava o título preso no código velho (o "Espécie 94" com B36)
  return !!(b.match(/^esp(?:ecie)?\.?\s*b?\s*\d{1,3}$/) || b.match(/^b\s*\d{1,3}$/));
}
// F130 · o título do caso no CRM é o nome do cliente; o "#CPF" que o To Do
// usa como chave fica só lá (escrever_todo.py o devolve ao criar a tarefa)
const semCpfTitulo = t => String(t||"").replace(/\s*#\s*[\d.\-]{11,14}\b/g,"").trim();
function tituloCaso(k){
  // F113 · a subespécie do escritório manda no título, quando existe
  const sub = k.subespecie && nomeDaSubespecie(k.subespecie);
  if(sub) return sub;
  const esp = nomeDaEspecie(k.especie);
  // decisão do Paulo (13.08): a ESPÉCIE define o título, sempre — nome
  // padronizado do catálogo, sem "Acerto de CNIS" e "B41" disputando o
  // cabeçalho. Sem espécie, vale o benefício escrito.
  if(esp) return esp;
  return k.beneficio || "Benefício não definido";
}
const TRILHA=["escritorio","inss","conselho","judicial"];
// trilha completa em botões — inclui 💰 Pagamentos e ✔ Encerrado; clicar move
// Quando o caso ainda não tem o resultado das consultas públicas, a ficha diz
// isso em vez de simplesmente não mostrar nada (senão parece que sumiu).
function consultaPendente(k){
  const temProc=!!(k.processo||"").trim();
  const judicial=["judicial","conselho"].includes(k.fase);
  const faltaCNJ = temProc && !(k.datajud && k.datajud.consultado_em);
  const faltaINSS = k.fase==="inss" && k.beneficio && !k.inss_fila;
  if(!faltaCNJ && !faltaINSS) return "";
  const oque = faltaCNJ
    ? "o andamento oficial (CNJ) e a ordem de julgamento no TRF3"
    : "a régua da fila do INSS";
  const quando = faltaCNJ ? "todo dia útil às 7h30 e às 14h30 — um processo vinculado agora entra na próxima rodada" : "no dia 20 de cada mês";
  const porque = faltaCNJ && !judicial
    ? " Este caso ainda não está numa fase judicial, então pode não haver o que consultar."
    : "";
  return `<div style="margin-top:8px;padding:7px 10px;border-radius:8px;background:#F4F5F7;border:1px dashed var(--borda);font-size:13px;color:var(--cinza)">
    ⏳ ${oque[0].toUpperCase()+oque.slice(1)} ainda não foi consultado para este caso.
    A consulta roda sozinha ${quando}.${porque}</div>`;
}

// Régua da fila do INSS (casos.inss_fila, do inss_fila.py mensal): responde
// "quanto tempo demora?" com dado oficial, sem prometer data.
function inssFilaCaso(k){
  const f=k.inss_fila;
  if(!f || !f.pendentes || k.fase!=="inss") return "";
  const uf=f.uf && f.uf!=="BR" ? `em ${esc(f.uf)}` : "no país";
  const nomes=(f.servicos||[]).join(" e ");
  return `<div style="margin-top:8px;padding:8px 10px;border-radius:8px;background:var(--branco);border:1px solid var(--borda);font-size:13px">
    🌻 <b>Fila do INSS ${uf}:</b> ${Number(f.pendentes).toLocaleString(IDIOMA)} pedidos
    de ${esc(nomes||"benefício")} esperando análise · metade já espera há mais de
    <b>${f.dias_mediana} dias</b>${f.dias_p90?` (9 em cada 10, até ${f.dias_p90} dias)`:""}
    <span class="meio-sub">— retrato oficial de ${fmt(f.referencia)}; é a régua da fila, não a data deste pedido</span>
    <div style="margin-top:4px"><button class="${temaV10()?"tl-bt":"btn-mini"}" onclick="copiarInssFila('${k.id}')" title="Copiar situação para o cliente">${temaV10()?"":"💬 "}<span aria-hidden="true">Situação</span><span class="sr-only">Copiar situação para o cliente</span></button></div>
  </div>`;
}
function copiarInssFila(casoId){
  const k=D.casoPorId.get(casoId); const f=k&&k.inss_fila; if(!f||!f.pendentes) return;
  const dbr=i=>i?`${i.slice(8,10)}/${i.slice(5,7)}/${i.slice(0,4)}`:"";
  const uf=f.uf&&f.uf!=="BR"?`em ${f.uf}`:"no país";
  copiar(`Segundo os dados abertos do INSS (retrato de ${dbr(f.referencia)}), havia `+
    `${Number(f.pendentes).toLocaleString(IDIOMA)} pedidos de ${(f.servicos||[]).join(" e ")} `+
    `aguardando análise ${uf}, e metade deles já esperava há mais de ${f.dias_mediana} dias. `+
    `É a régua da fila naquele momento, e não uma data do seu pedido.`,
    "Mensagem da fila do INSS copiada 💬");
}

// Andamento oficial na base pública do CNJ (casos.datajud, do datajud.py diário)
function tituloOrgao(n){          // o CNJ manda em CAIXA ALTA; aqui vira legível
  if(!n || n!==n.toUpperCase()) return n||"";
  const miudas=new Set(["de","da","do","das","dos","e","com","em","no","na","nos","nas"]);
  return n.split(" ").map((p,i)=>{ const b=p.toLowerCase();
    return (miudas.has(b)&&i) ? b : b.split(".").map(x=>x.charAt(0).toUpperCase()+x.slice(1)).join(".");
  }).join(" ");
}
// ── as duas telas do processo ─────────────────────────────────────────────
// Escritório = o que NÓS fazemos (checklist, equipe, lembrete, comentários).
// CNJ = o que o TRIBUNAL fez (andamentos oficiais por instância).
function irSubAba(qual){
  subAba = qual;
  guardar("crm_subaba", qual);
  repintarFicha();
}

// ── a data sai do próprio texto (como o Todoist faz) ─────────────────────
// A equipe já escreve "Verificar em 12/08" — 2.900 vezes no histórico. Em vez
// de pedir a data DE NOVO num campo separado, o sistema lê do comentário.
// Só vale com um verbo de próximo passo antes: "perícia em 12/08" é evento,
// não lembrete, e quem cuida disso é o extrairEvento.
const GATILHOS_PRAZO = "verificar|aguardar|ver|conferir|cobrar|retornar|checar|"+
  "solicitar|pedir|avisar|ligar|agendar|acompanhar|manifestar|apresentar|entrar em contato";
const DIAS_SEM = {domingo:0,segunda:1,terca:2,quarta:3,quinta:4,sexta:5,sabado:6};
// F446 · livre (o ⚡): sem o verbo, mas sem "hoje" solto, com "em N dias", e não depois de perícia, audiência ou DIB
function dataDoTexto(txt, livre){
  const t = dsa(txt||"");
  const re = new RegExp((livre ? "(?:^|[^a-z0-9/])" : "\\b(?:"+GATILHOS_PRAZO+")\\b[^.;\\n]{0,40}?\\b")+"("+
    "(\\d{1,2})[\\/.](\\d{1,2})(?:[\\/.](\\d{2,4}))?"+   // 12/08 · 12/08/2026 · 12.08
    (livre ? "|em (\\d{1,3})\\s*dias" : "|(\\d{1,3})\\s*dias")+   // em 30 dias
    "|depois de amanha|amanha"+(livre ? "" : "|hoje")+
    "|segunda|terca|quarta|quinta|sexta|sabado|domingo"+
    "|seg|qua|qui|sex|sab|dom|ter(?!\\s+[a-z]))(?![a-z0-9])");   // "sex"; "ter" só sozinho, porque "ter o documento" é verbo
  const m = t.match(re);
  if(!m) return null;
  const ini = m.index + m[0].length - m[1].length;
  if(livre && /(pericia|audiencia|julgamento|sessao|nasc|\bdib|\bder|\bdcb)[^.;\n]{0,12}$/.test(t.slice(Math.max(0, ini-24), ini))) return null;
  const trecho = String(txt).substr(ini, m[1].length);
  const hj = new Date(hoje()+"T12:00:00");
  const iso = d => d.toLocaleDateString("sv");
  if(m[2]){                                    // data escrita
    let [dia, mes, ano] = [+m[2], +m[3], m[4]];
    if(!dia || !mes || dia>31 || mes>12) return null;
    let a = ano ? (+ano < 100 ? 2000 + +ano : +ano) : hj.getFullYear();
    let d = new Date(a, mes-1, dia, 12);
    if(!ano && d < hj) d = new Date(a+1, mes-1, dia, 12);   // sem ano: o próximo
    if(livre && d < hj) return null;
    return {iso: iso(d), trecho};
  }
  if(m[5]){                                    // "em N dias"
    const d = new Date(hj); d.setDate(d.getDate() + +m[5]);
    return {iso: iso(d), trecho};
  }
  const ABREV = {seg:"segunda",ter:"terca",qua:"quarta",qui:"quinta",sex:"sexta",sab:"sabado",dom:"domingo"};
  const p = ABREV[m[1]] || m[1];
  if(p==="hoje") return {iso: iso(hj), trecho};
  if(p==="amanha"){ const d=new Date(hj); d.setDate(d.getDate()+1); return {iso:iso(d), trecho}; }
  if(p==="depois de amanha"){ const d=new Date(hj); d.setDate(d.getDate()+2); return {iso:iso(d), trecho}; }
  if(p in DIAS_SEM){
    const d=new Date(hj); const falta=(DIAS_SEM[p]-d.getDay()+7)%7 || 7;
    d.setDate(d.getDate()+falta); return {iso: iso(d), trecho};
  }
  return null;
}

// Sugestões de texto: as frases prontas
// da equipe + os motivos do Lembrar. Clicar preenche o campo — quem já sabe o
// que escrever ignora, quem não sabe tem exemplo do jeito que o escritório
// escreve. Substitui os botões ⚡ Frases e ⚠ Exigência.
function sugestoes(k){
  const itens = [];
  const vistos = new Set();
  const juntar = (txt, acao) => {
    const t = (txt||"").trim();
    if(!t || vistos.has(dsa(t))) return;
    vistos.add(dsa(t)); itens.push({texto:t, acao});
  };
  // motivos do Lembrar que combinam com a lista deste processo, e as frases
  lbMotivos().filter(m=>!(m.listas||[]).length || (m.listas||[]).includes(k.fase))
    .forEach(m=>juntar(m.texto));
  D.frases.forEach(f=>juntar(f.texto));
  juntar("Exigência do INSS — registrar com prazo", "exigencia");
  return itens;
}
// As 10 anotações que o escritório mais escreve, contadas nas 16.901 linhas
// datadas do To Do. Não é palpite: é o vocabulário real da casa.
//   em análise 515 · sem alteração 342 · aguardar até 178 · inicial
//   distribuída 115 · exigência cumprida 77 · verificar de novo 66 ·
//   petição protocolada 61 · réplica protocolada 55 · sem benefício
//   ativo 49 · recurso protocolado 48
// A segunda leva veio de agrupar por SIGNIFICADO (o mesmo fato escrito de
// vários jeitos): CNIS/HISCRE 720 · concedido 656 · perícia agendada 509 ·
// cálculo 460 · contato com o cliente 363 · documentos recebidos 355 ·
// indeferido 339 · procuração/contrato 236 · carta de concessão 183 ·
// requerimento protocolado 181 · embargos 152 · cliente não atende 106
const ANOTACOES = [
  "Em análise no INSS.",
  "Sem alteração — conferir de novo em __/__.",
  "Aguardar até __/__.",
  "Inicial distribuída.",
  "Exigência cumprida.",
  "Opção ainda não disponível — verificar novamente em __/__.",
  "Petição protocolada.",
  "Réplica protocolada.",
  "Sem benefício ativo no CNIS.",
  "Recurso protocolado.",
  "CNIS/HISCRE atualizado e conferido.",
  "Benefício concedido. 🎉",
  "Perícia médica agendada para __/__ às __:__.",
  "Cálculo conferido — valores e atrasados.",
  "Cliente orientado por telefone sobre __.",
  "Documentos recebidos e juntados.",
  "Benefício indeferido — analisar recurso.",
  "Procuração e contrato assinados.",
  "Carta de concessão emitida.",
  "Requerimento protocolado no INSS — protocolo __.",
  "Embargos de declaração protocolados.",
  "Cliente não retornou — tentar novo contato.",
];
function alternarSugestoes(casoId){
  const cx=document.getElementById("sug-box"), bt=document.getElementById("sug-abrir");
  if(!cx||!bt) return;
  const abrindo = cx.style.display==="none";
  cx.style.display = abrindo ? "flex" : "none";
  bt.classList.toggle("on", abrindo);
  if(abrindo) pintarSugestoes(D.casoPorId.get(casoId), true);
}
// filtradas enquanto digita (aí aparecem sozinhas, como autocompletar);
// com o campo vazio, só quando a pessoa pede pelo botão
function pintarSugestoes(k, forcar){
  const cx=document.getElementById("sug-box"); if(!cx) return;
  const inp=document.getElementById("and-texto");
  const proprias = ANOTACOES.map(t=>({texto:t}));
  const catalogo = [...proprias, ...sugestoes(k)];
  // o filtro olha só a ÚLTIMA linha, e só quando ela é texto solto: linha que
  // veio de uma sugestão é conteúdo já escolhido, não busca. Sem isso, marcar
  // a primeira frase escondia todas as outras e acabava a escolha múltipla.
  const escritas = (inp&&inp.value||"").split("\n").map(l=>semMarcador(l));
  const marcadas = new Set(escritas.filter(Boolean).map(dsa));
  const ultima = escritas.length ? escritas[escritas.length-1] : "";
  // PEDIR A LISTA IGNORA O FILTRO. Quem escreveu com as próprias palavras e
  // só então clicou em "Sugestões" via o botão acender e nada abrir: o texto
  // digitado virava busca, não casava com frase nenhuma e a caixa nascia
  // vazia. Clicar no botão é pedir o catálogo inteiro, não filtrar.
  const q = forcar ? "" : (catalogo.some(s=>dsa(s.texto)===dsa(ultima)) ? "" : dsa(ultima.trim()));
  if(!q && !forcar && cx.style.display==="none") return;
  const todas = q ? catalogo : proprias;
  const lista=(q ? todas.filter(s=>dsa(s.texto).includes(q)) : todas).slice(0, q?6:ANOTACOES.length);
  if(q) cx.style.display = lista.length ? "flex" : "none";
  // botão de verdade, não <span>: entra na ordem do Tab e o leitor de tela o
  // anuncia como algo clicável (eram 22 frases inalcançáveis pelo teclado)
  cx.innerHTML = lista.map(s=>
      `<button type="button" class="sug-it${marcadas.has(dsa(s.texto))?" on":""}" data-acao="${s.acao||""}">${s.acao==="exigencia"?"⚠ ":""}${esc(s.texto)}</button>`).join("")
    + (q?"":`<button type="button" class="sug-mais" onclick="lbEditar('${k.id}')" title="✎ editar sugestões"><span aria-hidden="true">✎ Editar</span><span class="sr-only">✎ editar sugestões</span></button>
      <input id="nf-texto" placeholder="+ nova frase pronta — Enter salva, vale para toda a equipe"
        style="flex:1;min-width:220px;font-size:12px;padding:4px 8px;border:1px solid var(--borda);border-radius:6px"
        onkeydown="if(event.key==='Enter'){event.preventDefault();novaFrase();}">`);
  cx.querySelectorAll(".sug-it").forEach(el=>el.onclick=()=>usarSugestao(el, k));
}
// o campo de data só aparece quando é pedido — a barra fica limpa até lá
function tfEscolherData(bt){
  const inp=document.getElementById("tf-data"); if(!inp) return;
  inp.style.display="inline-block";
  bt.classList.add("on");
  if(inp.showPicker) try{ inp.showPicker(); }catch(e){ inp.focus(); }
  else inp.focus();
}
// F446 · CAPTURA QUE ENTENDE A FRASE (ideia do Todoist, 08.11.2026): a data, o @ de quem faz e o * da estrela lidos
// na hora, sem IA. Cada parte reconhecida aparece destacada, e o ✕ desfaz só ela, enquanto o mesmo trecho estiver no texto
let capFora = {};
const RX_ESTRELA = /(^|\s)\*(?=\s|$)/;
function capturaDoTexto(txt, livre){
  const t = String(txt||"");
  let data = dataDoTexto(t) || (livre ? dataDoTexto(t, true) : null);
  if(data && capFora.data===data.trecho) data = null;
  let quem = null;
  for(const m of t.matchAll(/@(\p{L}+)/gu)){
    const c = equipeAtiva().find(x=>dsa((x.nome||"").split(" ")[0])===dsa(m[1]));
    if(c){ quem = {id:c.id, nome:c.nome.split(" ")[0], trecho:m[0]}; break; }
  }
  if(quem && capFora.quem===quem.trecho) quem = null;
  return {data, quem, estrela: RX_ESTRELA.test(t) && !capFora.estrela};
}
const semEstrela = t => String(t||"").replace(/(^|\s)\*(?=\s|$)/g, "$1").replace(/[ \t]{2,}/g, " ").trim();
function capDesfazer(tipo, trecho, fn){
  capFora[tipo] = tipo==="estrela" ? true : trecho;
  if(tipo==="data"){ prazoCancelado = true; prazoDetectado = null; prazoDespachar = false; }
  fn==="ar" ? pintarCapturaAr() : pintarPrazoDoTexto();
}
function capChips(cap, fn, rotData){
  const x = (tipo, trecho) => `<a role="button" tabindex="0" title="desfazer o reconhecimento" aria-label="desfazer" onclick="capDesfazer('${tipo}',${esc(JSON.stringify(trecho||""))},'${fn}')">✕</a>`;
  return [cap.data ? `<span class="chip-prazo cap-it">🗓 <mark>${esc(cap.data.trecho)}</mark> ${rotData}: <b>${fmt(cap.data.iso)}</b> (${diaSemana(cap.data.iso).slice(0,3)}) ${x("data", cap.data.trecho)}</span>` : "",
    cap.quem ? `<span class="chip-prazo cap-it">👤 <mark>${esc(cap.quem.trecho)}</mark> ${cap.data ? "faz" : "recebe o aviso"} ${x("quem", cap.quem.trecho)}</span>` : "",
    cap.estrela ? `<span class="chip-prazo cap-it">⭐ <mark>*</mark> importante ${x("estrela")}</span>` : ""].join("");
}
// enquanto digita: mostra a data que o sistema entendeu, para confirmar
function pintarPrazoDoTexto(k){
  const chip=document.getElementById("and-prazo-chip"); if(!chip) return;
  const inp=document.getElementById("and-texto");
  const cap = capturaDoTexto(inp ? inp.value : "");
  if(prazoCancelado) cap.data = null;
  const achado = cap.data;
  prazoDetectado = achado ? achado.iso : null;
  chip.innerHTML = capChips(cap, "and", prazoDespachar ? "volta à fila" : cap.quem && cap.quem.id!==eu.id ? "tarefa" : "lembrete")
    + (achado && achado.iso>hoje() ? `
        <button type="button" class="btn-mini chip-desp${prazoDespachar?" on":""}" aria-pressed="${prazoDespachar}" onclick="chipDespachar()"
          title="ao registrar, conclui por hoje: a data vira o Concluir em e o cliente sai do seu Meu Dia"><span aria-hidden="true">✔ Concluir</span><span class="sr-only">✔ e concluir por hoje</span></button>` : "");
}
// ══════════════════════════════════════════════════════════════════════════
// F832 · RPV E PRECATÓRIO NO CASO JUDICIAL (ordem do Paulo, 27.11.2026, melhoria 5 da auditoria). A requisição
// registrada à mão (tipo, valor, expedição e entrega) mora em clientes.campos.requisicoes[caso], como o destaque e a
// proposta de honorários. Ela entra na concessão (concessaoDoCaso): a proposta de honorários lança o destaque e a
// sucumbência sem duplicar. A RPV vence 60 dias depois da entrega da requisição (Lei 10.259/2001, art. 17), com
// alerta no Meu Dia; o precatório segue o cronograma do tribunal. Situações: Expedida, Paga, Levantada, Repassada.
// ══════════════════════════════════════════════════════════════════════════
const reqsDoCaso = k => { const c = k && D.cliPorId.get(k.cliente_id); return ((((c||{}).campos||{}).requisicoes||{})[k.id]) || []; };
const prazoRpv = r => r && r.tipo==="rpv" && (r.entrega || r.expedida) ? somaDias(r.entrega || r.expedida, 60) : null;
const situacaoReq = r => r.repasse ? "Repassada" : r.levantado_em ? "Levantada" : r.pago_em ? "Paga" : "Expedida";
const rotReq = r => r.tipo==="precatorio" ? "Precatório" : "RPV";
// o líquido do cliente: o bruto levantado menos o IR retido na fonte (RRA, Lei 7.713/1988, art. 12-A) e os honorários
// contratuais, salvo os destacados na requisição, que o tribunal pagou direto ao escritório e não saem do crédito dele
const liquidoRepasse = x => (Math.round((+x.bruto||0)*100) - Math.round((+x.ir||0)*100) - (x.destacado ? 0 : Math.round((+x.honor||0)*100))) / 100;
// a requisição registrada, no formato da lida do documento (requisicaoDoDoc)
const reqManual = r => ({em:r.entrega || r.expedida, precatorio:r.tipo==="precatorio", bruto:+r.valor||0, destaque:+r.destaque||0,
  semDestaque:false, sucumbencia:+r.sucumbencia||0, manual:true});
function cartaoRequisicoes(k){
  const rs = reqsDoCaso(k), hj = hoje();
  const PROX = {Expedida:["Paga","pago"], Paga:["Levantada","levantado"], Levantada:["Repasse","repasse"]};
  const linha = r => {
    const sit = situacaoReq(r), pz = prazoRpv(r), venc = pz && !r.pago_em && pz < hj, prox = PROX[sit];
    const nota = [`expedida em ${fmt(r.expedida)}`, r.entrega ? `entregue ao tribunal em ${fmt(r.entrega)}` : "",
      r.tipo==="precatorio" && !r.pago_em ? "pago pelo cronograma do tribunal" : "",
      pz && !r.pago_em ? `${venc ? "prazo vencido em" : "prazo de pagamento até"} ${fmt(pz)} (60 dias da ${r.entrega ? "entrega" : "expedição; confirme a data da entrega"}, Lei 10.259/2001, art. 17)` : "",
      r.destaque ? `honorários destacados ${moeda(r.destaque)}` : "", r.sucumbencia ? `sucumbência ${moeda(r.sucumbencia)}` : "",
      r.pago_em ? `paga em ${fmt(r.pago_em)}` : "", r.levantado_em ? `levantada em ${fmt(r.levantado_em)}${r.alvara ? ` (alvará ${r.alvara})` : ""}` : "",
      r.repasse ? `repassados ${moeda(r.repasse.liquido)} ao cliente em ${fmt(r.repasse.em)}` : ""].filter(Boolean).join(" · ");
    return `<li><span>${rotReq(r)}<small class="hon-nota">${esc(nota)}</small></span><b>${moeda(r.valor)}</b>
      <span class="hon-sit hon-${sit==="Repassada" ? "ok" : venc ? "venc" : "prox"}">${sit}</span>
      ${prox ? `<button class="adr-bt" onclick="passoReq('${k.id}','${r.id}','${prox[1]}')">${prox[0]}</button>` : ""}
      ${r.repasse ? `<button class="adr-bt" onclick="reciboRepasse('${k.id}','${r.id}')" title="recibo do repasse, para imprimir">Recibo</button>` : ""}</li>`;
  };
  return `<section class="adr-card hon-req" aria-labelledby="hon-req-${k.id}">
    <div class="adr-cab"><h3 class="adr-h" id="hon-req-${k.id}">RPV e precatório · ${esc(tituloCaso(k))}</h3></div>
    ${rs.length ? `<ul class="hon-prop-itens">${rs.map(linha).join("")}</ul>` : `<p class="adr-nota">Nenhuma requisição registrada neste processo.</p>`}
    <button class="adr-bt adr-primario" style="width:max-content" onclick="passoReq('${k.id}','','expedida')" title="registrar a expedição de RPV ou precatório">Registrar</button>
  </section>`;
}
// cada passo numa caixa: a expedição, o pagamento, o levantamento (com o alvará) e o repasse ao cliente
function passoReq(casoId, rid, passo){
  const k = D.casoPorId.get(casoId), c = k && D.cliPorId.get(k.cliente_id); if(!c) return;
  const r = reqsDoCaso(k).find(x=>x.id===rid) || {};
  const cp = (rot, id, tipo, v, extra="") => `<label class="adr-campo">${rot}<input type="${tipo}" id="rq-${id}" value="${esc(v==null ? "" : String(v))}"${tipo==="number" ? ' step="0.01" min="0" style="width:140px"' : ""}${extra}></label>`;
  let tit, corpo, nota;
  if(passo==="expedida"){
    tit = "Registrar requisição";
    corpo = `<label class="adr-campo">Tipo<select id="rq-tipo"><option value="rpv">RPV</option><option value="precatorio">Precatório</option></select></label>`
      + cp("Valor requisitado", "valor", "number", "") + cp("Expedida em", "expedida", "date", hoje(), ` max="${hoje()}"`) + cp("Entregue ao tribunal em", "entrega", "date", "")
      + cp("Honorários destacados", "destaque", "number", "") + cp("Sucumbência", "sucumbencia", "number", "");
    nota = "A RPV é paga em até 60 dias da entrega da requisição ao tribunal (Lei 10.259/2001, art. 17); sem a data da entrega, o prazo conta da expedição. Os honorários destacados e a sucumbência vão à proposta de honorários do contrato.";
  }else if(passo==="pago"){
    tit = `${rotReq(r)} paga`; corpo = cp("Paga em", "pago_em", "date", hoje(), ` max="${hoje()}"`); nota = "O dia do depósito judicial.";
  }else if(passo==="levantado"){
    tit = "Levantamento"; corpo = cp("Levantada em", "levantado_em", "date", hoje(), ` max="${hoje()}"`) + cp("Alvará", "alvara", "text", "");
    nota = "O dia do levantamento e o número do alvará, quando houver.";
  }else{
    const T = termosHon(c, k, "rec"), bruto = Math.round(((+r.valor||0) - (+r.destaque||0) - (+r.sucumbencia||0))*100)/100;
    const honor = r.destaque ? +r.destaque : Math.round(bruto*(T.pctAtr||0))/100;
    tit = "Repasse ao cliente";
    corpo = cp("Valor bruto levantado", "bruto", "number", bruto, ' oninput="rqLiquido()"') + cp("Honorários contratuais", "honor", "number", honor, ' oninput="rqLiquido()"')
      + `<label class="conta-ck" style="display:flex;align-items:center;gap:8px;min-height:40px"><input type="checkbox" id="rq-destacado" style="width:20px;height:20px" ${r.destaque ? "checked" : ""} onchange="rqLiquido()">destacados na requisição</label>`
      + cp("IR retido (RRA)", "ir", "number", "", ' oninput="rqLiquido()"') + cp("Repassado em", "em", "date", hoje(), ` max="${hoje()}"`)
      + `<p class="adr-nota" style="flex-basis:100%">Valor líquido ao cliente: <b id="rq-liq"></b></p>`;
    nota = `Honorários pelo contrato: ${T.frase || "sem percentual dos atrasados"}. Os destacados foram pagos direto ao escritório e não saem do crédito do cliente; os demais entram como recebidos nos honorários, sem novo lançamento quando já houver um. O IR é o retido pelo banco no regime de rendimentos recebidos acumuladamente (Lei 7.713/1988, art. 12-A), quando houver.`;
  }
  caixa(`<h3 style="margin:0 0 6px">${esc(tit)} · ${esc(tituloCaso(k))}</h3><p class="adr-nota" style="margin:0 0 10px">${esc(nota)}</p>
    <div class="form-linha" style="align-items:flex-end;flex-wrap:wrap;gap:10px">${corpo}
      <button class="adr-bt adr-primario" onclick="gravarReq('${k.id}','${escJs(rid)}','${passo}')">Gravar</button></div>`);
  if(passo==="repasse") rqLiquido();
}
const rqVal = id => (document.getElementById("rq-"+id)||{}).value || "";
function rqLiquido(){
  const el = document.getElementById("rq-liq");
  if(el) el.textContent = moeda(liquidoRepasse({bruto:rqVal("bruto"), honor:rqVal("honor"), ir:rqVal("ir"), destacado:(document.getElementById("rq-destacado")||{}).checked}));
}
async function gravarReq(casoId, rid, passo){
  const k = D.casoPorId.get(casoId), c = k && D.cliPorId.get(k.cliente_id); if(!c) return;
  const lista = reqsDoCaso(k), r = lista.find(x=>x.id===rid), hj = hoje();
  let nova, texto;
  if(passo==="expedida"){
    const v = +rqVal("valor"), ex = rqVal("expedida"), en = rqVal("entrega") || null, tipo = rqVal("tipo")==="precatorio" ? "precatorio" : "rpv";
    if(!(v > 0)) return aviso("Informe o valor requisitado");
    if(!ex || ex > hj) return aviso("Informe a data da expedição");
    if(en && en < ex) return aviso("A entrega não pode ser anterior à expedição");
    const n = {id:crypto.randomUUID(), tipo, valor:v, expedida:ex, entrega:en, destaque:+rqVal("destaque")||0, sucumbencia:+rqVal("sucumbencia")||0, por:eu.id};
    nova = [...lista, n];
    texto = `${rotReq(n)} de ${moedaTxt(v)} expedida em ${fmt(ex)}${en ? ` e entregue ao tribunal em ${fmt(en)}` : ""}.${prazoRpv(n) ? ` Prazo de pagamento até ${fmt(prazoRpv(n))} (Lei 10.259/2001, art. 17).` : " Pagamento pelo cronograma do tribunal."}`;
  }else{
    if(!r) return;
    const d = rqVal(passo==="repasse" ? "em" : passo+"_em");
    if(!d || d > hj) return aviso("Informe a data, que não pode ser futura");
    let m;
    if(passo==="pago"){ m = {pago_em:d}; texto = `${rotReq(r)} de ${moedaTxt(r.valor)} paga em ${fmt(d)}.`; }
    else if(passo==="levantado"){ m = {levantado_em:d, alvara:rqVal("alvara").trim() || null}; texto = `Levantamento da ${rotReq(r)} em ${fmt(d)}${m.alvara ? `, alvará ${m.alvara}` : ""}.`; }
    else{
      const x = {em:d, bruto:+rqVal("bruto")||0, honor:+rqVal("honor")||0, destacado:!!(document.getElementById("rq-destacado")||{}).checked, ir:+rqVal("ir")||0};
      if(!(x.bruto > 0)) return aviso("Informe o valor bruto levantado");
      x.liquido = liquidoRepasse(x);
      if(x.liquido < 0) return aviso("O líquido ficou negativo: confira os valores");
      m = {repasse:x};
      texto = `Repasse ao cliente em ${fmt(d)}: bruto ${moedaTxt(x.bruto)}, honorários contratuais ${moedaTxt(x.honor)}${x.destacado ? " (destacados, não descontados)" : ""}${x.ir ? `, IR retido ${moedaTxt(x.ir)}` : ""}, líquido ${moedaTxt(x.liquido)}.`;
    }
    nova = lista.map(y=>y===r ? {...y, ...m} : y);
  }
  const antes = ((c.campos||{}).requisicoes)||{};
  if(!await gravarCamposCli(c, {requisicoes:{...antes, [k.id]:nova}})) return;
  fecharCaixa();
  const pg = passo==="repasse" ? await honorariosDoRepasse(c, k, nova.find(y=>y.id===rid).repasse) : null;
  await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"}, body:JSON.stringify({caso_id:k.id, autor_id:eu.id, texto})}).catch(()=>{});
  repintarFicha();
  avisoDesfazer({expedida:"Requisição registrada", pago:"Pagamento registrado", levantado:"Levantamento registrado", repasse:"Repasse registrado"}[passo], async()=>{
    await gravarCamposCli(c, {requisicoes:antes});
    if(pg) await api(`/rest/v1/pagamentos?id=eq.${pg.p.id}`, pg.antes ? {method:"PATCH",headers:{Prefer:"return=minimal"}, body:JSON.stringify(pg.antes)} : {method:"DELETE"}).catch(()=>{});
    if(pg){ if(pg.antes) Object.assign(pg.p, pg.antes); else D.pagamentos = D.pagamentos.filter(y=>y!==pg.p); }
    repintarFicha();
  });
}
// os honorários retidos no repasse (não destacados) entram como recebidos: o lançamento dos atrasados que já existe é
// baixado; sem ele, nasce um, com a marca da proposta (hon:caso:atr), e a proposta não o lança de novo
async function honorariosDoRepasse(c, k, x){
  if(x.destacado || !(x.honor > 0)) return null;
  const conf = [{c:eu.id, em:new Date().toISOString()}];
  const p = (D.pagamentos||[]).find(y=>y.status==="aberto" && casoDoPgto(y)===k.id && natPgto(y)==="contrato" && !ORD_BEN.test(y.descricao||"")
    && (String(y.todo_item_id||"")===`hon:${k.id}:atr` || /atrasad|\brpv\b|precat/i.test(y.descricao||"")));
  try{
    if(p){
      const antes = {status:p.status, pago_em:p.pago_em, valor:p.valor, descricao:p.descricao, conferencias:p.conferencias||[]};
      const muda = {status:"recebido", pago_em:x.em, valor:x.honor, descricao:semNota(p.descricao), conferencias:[...(p.conferencias||[]), ...conf]};
      await api(`/rest/v1/pagamentos?id=eq.${p.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"}, body:JSON.stringify(muda)});
      Object.assign(p, muda);
      return {p, antes};
    }
    const [n] = await api(`/rest/v1/pagamentos`,{method:"POST",headers:{Prefer:"return=representation"}, body:JSON.stringify({caso_id:k.id, cliente_id:c.id,
      descricao:"Honorários · atrasados retidos no repasse ao cliente", valor:x.honor, vencimento:x.em, pago_em:x.em, status:"recebido", conferencias:conf, todo_item_id:`hon:${k.id}:atr`})}) || [];
    if(n) (D.pagamentos = D.pagamentos||[]).push(n);
    return n ? {p:n, antes:null} : null;
  }catch(e){ aviso("O repasse foi gravado, mas os honorários não: lance-os na tabela"); return null; }
}
// o recibo do repasse, simples, para imprimir e o cliente assinar
function reciboRepasse(casoId, rid){
  const k = D.casoPorId.get(casoId), c = k && D.cliPorId.get(k.cliente_id), r = reqsDoCaso(k).find(x=>x.id===rid);
  if(!c || !r || !r.repasse) return;
  const x = r.repasse, w = window.open("", "_blank");
  if(!w) return aviso("O navegador bloqueou a janela: libere os pop-ups deste site");
  const lin = (rot, v, sinal="") => `<tr><td>${esc(rot)}</td><td class="v">${sinal}${esc(moedaTxt(v))}</td></tr>`;
  const dataExt = new Date(x.em+"T12:00:00").toLocaleDateString(IDIOMA, {day:"numeric", month:"long", year:"numeric"});
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Recibo de repasse</title><style>
    body{font-family:Georgia,serif;max-width:680px;margin:40px auto;color:#111;line-height:1.6;font-size:15px}
    h1{font-size:20px;text-align:center;margin:0 0 24px}table{width:100%;border-collapse:collapse;margin:18px 0}
    td{padding:6px 4px;border-bottom:1px solid #ccc}td.v{text-align:right;white-space:nowrap}tr.t td{font-weight:bold;border-top:2px solid #111}
    .ass{margin-top:64px;text-align:center}.ass span{display:block;border-top:1px solid #111;width:320px;margin:0 auto 4px}
    @media print{body{margin:15mm}}</style></head><body>
    <h1>Recibo de repasse</h1>
    <p>Recebi do escritório Paulo R. Tercini Filho a importância líquida de <b>${esc(moedaTxt(x.liquido))}</b>, referente ao meu crédito na ${r.tipo==="precatorio" ? "requisição de precatório" : "requisição de pequeno valor (RPV)"} expedida em ${fmt(r.expedida)}${k.processo ? `, no processo nº ${esc(k.processo)}` : ""}${r.alvara ? `, levantada pelo alvará ${esc(r.alvara)}` : ""}, conforme discriminado:</p>
    <table>${lin("Valor bruto levantado", x.bruto)}
      ${x.destacado ? `<tr><td>Honorários contratuais destacados na requisição, pagos diretamente ao escritório e não descontados deste valor</td><td class="v">${esc(moedaTxt(x.honor))}</td></tr>`
        : x.honor ? lin("Honorários contratuais, conforme o contrato", x.honor, "(−) ") : ""}
      ${x.ir ? lin("Imposto de renda retido na fonte (rendimentos recebidos acumuladamente, Lei 7.713/1988, art. 12-A)", x.ir, "(−) ") : ""}
      <tr class="t"><td>Valor líquido recebido</td><td class="v">${esc(moedaTxt(x.liquido))}</td></tr></table>
    <p>Dou plena quitação quanto ao valor acima.</p><p>${esc(dataExt)}.</p>
    <div class="ass"><span></span>${esc(c.nome||"")}${c.cpf ? `<br>CPF ${esc(fmtCpf(c.cpf))}` : ""}</div>
    <script>window.print()<\/script></body></html>`);
  w.document.close();
}
