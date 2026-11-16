// F235 · o primeiro pagamento do benefício (art. 103 da Lei 8.213/91): o extrato do INSS só o mostra quando cobre o mês da DIP
// (o dos últimos 12 meses começa depois e dava o prazo de 2035); sem ele, o 1º crédito do INSS no extrato do banco trazido pelo
// cliente, entre a DIP e 4 meses depois da concessão (o extrato de outro mês não é o do primeiro pagamento)
function primeiroPagamentoDe(extratos, dip, ddb, cliId, nb){
  const ini = dip ? ymDe(dip) : "", n = soDig(nb||"");
  const cs = (extratos||[]).filter(e=>!n || !e.nb || e.nb===n).flatMap(e=>{ const cr = (e.creditos||[]).filter(k=>k.comp);
    return ini && cr.some(k=>chaveComp(k.comp) <= ini) ? cr.filter(k=>k.pago && k.pagoEm).map(k=>isoBr(k.pagoEm)) : []; }).filter(Boolean).sort();
  if(cs.length) return {iso:cs[0], onde:"extrato de pagamento do INSS"};
  if(!cliId) return null;
  const ref = ddb || dip, lim = ref ? somarMeses(ref, 4) : "9999-12-31", d0 = dip || "0000-01-01";
  const ds = docsDoDossie(cliId).filter(a=>a.texto && (/extrato banc/i.test(a.nome||"") || /EXTRATO DE CONTA/i.test(a.texto)))
    .flatMap(a=>String(a.texto).split("\n").filter(l=>/\bINSS\b|BENEF|PREVID/i.test(l) && (!n || !/\d{3}\.?\d{3}\.?\d{3}-\d/.test(l) || soDig(l).includes(n)))
      .map(l=>(l.match(/(\d{2}\/\d{2}\/\d{4})/)||[])[1]).filter(Boolean).map(isoBr))
    .filter(d=>d && d >= d0 && d <= lim).sort();
  return ds.length ? {iso:ds[0], onde:"extrato do banco trazido pelo cliente"} : null;
}
// F235 · o relato da recepção (as notas do atendimento): para o que só ele diz (o AR, as testemunhas)
const relatoDe = c => (((c||{}).campos||{}).atendimento||[]).map(n=>n && n.texto || "").join(" \n ");
Object.assign(PRE_DOSSIE, {
  rev_primeiro: x => { const nb = soDig(x.v.rev_nb||""), ca = (x.fd.cartas||[]).find(k=>!nb || k.nb===nb) || {};
    const ex = (x.fd.extratos||[]).find(e=>!nb || e.nb===nb) || {};
    const p = primeiroPagamentoDe(x.fd.extratos, isoBr(ca.dip || ca.dib || ex.dip || ex.dib || ""), isoBr(ca.concessao||""), x.c && x.c.id, ca.nb || nb);
    return p ? {val:p.iso, fonte:`${p.onde}: primeiro crédito do INSS em ${fmtBarra(p.iso)}`} : null; },
  der: x => { if(!(x.ops||[]).some(o=>o.o==="crps")) return null;
    const p = (x.fd.processos||[]).filter(p=>p.entrada && ((p.comunicacoes||[]).slice(-1)[0]||{}).contra).sort((a, b)=>isoBr(a.entrada) < isoBr(b.entrada) ? -1 : 1).pop();
    return p ? {val:isoBr(p.entrada), fonte:`cópia do processo: pedido negado de ${p.entrada} (no recurso, os requisitos se medem nessa data)`} : null; },
  copia_ciencia: x => { const m = relatoDe(x.c).match(/\b(?:AR|aviso de recebimento|ci[êe]ncia)\b[^.\n]{0,50}?(\d{2}\/\d{2}\/\d{4})/i);
    return m ? {val:isoBr(m[1]), fonte:"relato da recepção"} : null; },
  ja_parente: x => /testemunh[^.\n]{0,80}\b(irm[ãa]o?|filh[oa]|sobrinh[oa]|primo|prima|tio|tia|pai|m[ãa]e|cunhad[oa])\b|\b(irm[ãa]o?|filh[oa]|sobrinh[oa]|cunhad[oa])\b[^.\n]{0,80}testemunh/i.test(relatoDe(x.c))
    ? {val:"Sim", fonte:"relato da recepção: parente trazido como testemunha"} : null,
});
// F235 · os papéis da união que o cliente trouxe (com o nome dele e o de quem morreu), cada um com a data, e quantos são dos 24 meses
// antes do óbito (Decreto 3.048, art. 22, § 14: com um só nesse período, a justificação administrativa o supre)
function provasDaUniao(c){
  const docs = docsDoDossie(c.id).filter(a=>a.texto), cert = docs.find(a=>/certid[ãa]o de [óo]bito/i.test(`${a.nome} ${String(a.texto).slice(0, 200)}`));
  const ce = cert && (String(cert.texto).match(/^\s*Nome:\s*([^·\n]+)/m)||[])[1]; if(!ce) return null;
  const ob = isoBr((String(cert.texto).match(/falecimento:?\s*(\d{2}\/\d{2}\/\d{4})/i)||[])[1]||""); if(!ob) return null;
  const nm = s => dsa(s).split(/\s+/).filter(w=>w.length > 2 && !/^(ficticia|ficticio|das?|dos?|des?)$/.test(w));
  const wi = nm(ce), wc = nm(c.nome||""), tem = (t, ws) => ws.length > 1 && t.includes(ws[0]) && ws.slice(1).some(w=>t.includes(w));
  const out = docs.filter(a=>a!==cert && /trazid/i.test(a.nome||"") && tem(dsa(a.texto), wi) && tem(dsa(a.texto), wc))
    .map(a=>({rot:String(a.nome).split(" · ").pop().replace(/\.pdf$/i, "").replace(/\s*\(trazid[oa] pel[oa] client[ea]\)/i, "").trim(), iso:isoBr((String(a.texto).match(/(\d{2}\/\d{2}\/\d{4})/)||[])[1]||""), anexo:a}));
  const ini24 = somarMeses(ob, -24);
  return {instituidor:tituloOrgao(ce.trim()), obito:ob, docs:out, ini24, n24:out.filter(d=>d.iso && d.iso >= ini24 && d.iso <= ob).length};
}
// F235 · na pensão e na reclusão, quem pede vem do papel: a certidão de casamento com o nome dela, o estado civil e o
// declarante da certidão de óbito; na falta, o relato. O nome casa pelo primeiro nome e mais um sobrenome
const _opDep = (x, re) => re.test(x.op||"") || (x.ops||[]).some(o=>re.test(o.o||""));
const _nomeCasa = (x, s) => { const ws = dsa((x.c||{}).nome||"").split(/\s+/).filter(w=>w.length > 2), t = dsa(s||"");
  return ws.length > 1 && t.includes(ws[0]) && ws.slice(1).some(w=>t.includes(w)); };
Object.assign(PRE_DOSSIE, {
  dep_classe: x => { if(!_opDep(x, /^(morte|B93|reclusao)$/)) return null;
    for(const c of x.cert||[]){
      if(c.casamento && !c.divorcio && _nomeCasa(x, c.contraentes)) return {val:"Cônjuge", fonte:`da certidão de casamento (${fmtBarra(c.casamento)})`};
      if(c.civil && /casad/i.test(c.civil) && _nomeCasa(x, c.civil)) return {val:"Cônjuge", fonte:`da ${c.rot}: ${c.civil.toLowerCase()}`};
      if(c.declarante && _nomeCasa(x, c.declarante) && /companheir/i.test(c.declarante)) return {val:"Companheiro(a)", fonte:`da ${c.rot}: declarante ${c.declarante.toLowerCase()}`};
      if(c.declarante && _nomeCasa(x, c.declarante) && /espos|marido|vi[úu]v/i.test(c.declarante)) return {val:"Cônjuge", fonte:`da ${c.rot}: declarante ${c.declarante.toLowerCase()}`};
    }
    const r = relatoDe(x.c);
    if(/companheir|viviam juntos|moravam juntos|uni[ãa]o est[áa]vel|n[ãa]o eram casados/i.test(r)) return {val:"Companheiro(a)", fonte:"relato da recepção"};
    if(/\b(esposa|marido|casad[oa]s)\b/i.test(r)) return {val:"Cônjuge", fonte:"relato da recepção"};
    return null; },
  dep_uniao: x => { if(!_opDep(x, /^(morte|B93|reclusao)$/)) return null;
    const c = (x.cert||[]).find(c=>c.casamento && !c.divorcio && _nomeCasa(x, c.contraentes));
    if(c) return {val:c.casamento, fonte:"da certidão de casamento"};
    const m = relatoDe(x.c).match(/(?:juntos|uni[ãa]o|casad[oa]s)[^.\n]{0,25}?desde\s+(?:(\d{2}\/\d{2}\/\d{4})|(?:[a-zç]+ de\s+)?((?:19|20)\d{2}))/i);
    if(!m) return null;
    // só o ano: conta do fim dele, que é o mais desfavorável para os 2 anos de união
    return m[1] ? {val:isoBr(m[1]), fonte:"relato da recepção"} : {val:`${m[2]}-12-31`, fonte:`relato da recepção (desde ${m[2]}; contado do fim do ano)`}; },
  // F235 · os papéis da união do dossiê respondem as provas (o total e os dos 24 meses); as contribuições dele, só pelo relato, são estimativa
  dep_provas_total: x => { if(!_opDep(x, /^(morte|B93)$/) || !x.c) return null; const u = provasDaUniao(x.c);
    return u && u.docs.length ? {val:String(u.docs.length), fonte:`papéis da união trazidos: ${u.docs.map(d=>`${d.rot}${d.iso ? ` (${fmtBarra(d.iso)})` : ""}`).join("; ")}`} : null; },
  dep_provas_24m: x => { if(!_opDep(x, /^(morte|B93)$/) || !x.c) return null; const u = provasDaUniao(x.c);
    return u && u.docs.length ? {val:String(u.n24), fonte:`dos 24 meses antes do óbito (${fmtBarra(u.ini24)} a ${fmtBarra(u.obito)})`} : null; },
  dep_contrib: x => { if(!_opDep(x, /^(morte|B93|reclusao)$/) || !x.c) return null;
    const m = relatoDe(x.c).match(/registrad[oa][^.\n]{0,80}?desde\s+(\d{2})\/((?:19|20)\d{2})/i), f = x.v.dep_fato || (_certMais(x, "obito")||{}).obito; if(!m || !f) return null;
    const n = mesesEntreYm(`${m[2]}-${m[1]}`, ymDe(f)); return n > 0 ? {val:String(n), fonte:`relato da recepção: registrado desde ${m[1]}/${m[2]} (estimativa; confira no CNIS dele)`} : null; },
  ins_acidente: x => { if(!_opDep(x, /^(morte|B93)$/)) return null;
    if((x.fd.cats||[]).length) return {val:"Sim", fonte:"CAT no dossiê"};
    const c = (x.cert||[]).find(c=>c.obito && c.causa); if(!c) return null;
    // F235 · o AVC ("acidente vascular") não é acidente: a regra dos 4 meses vale
    return /acident|tr[âa]nsito|atropel|queda|choque|eletropless|afogamento|homic[íi]d|ferimento|trauma|motocicleta/i.test(String(c.causa).replace(/acidente vascular\S*(?: cerebral| encef[áa]lico)?/gi, "AVC"))
      ? {val:"Sim", fonte:`certidão de óbito: ${c.causa}`} : {val:"Não", fonte:`certidão de óbito: ${c.causa}`}; },
});
// F235 · a roça: os módulos fiscais do CCIR, o endereço rural da ficha, o trabalho só da família e um papel de cada metade
const _opRural = x => _opDep(x, /^(idade_rural|hibrida|rur)$/) && x.c;   // F235 · a mãe da roça também: módulos, moradia, mão de obra
const _rurMetade = (x, n) => { if(!_opDep(x, /^idade_rural$/) || !x.c) return null;
  const alvo = +somarMeses(x.der, n===1 ? -135 : -45).slice(0, 4);
  // F235 · o papel no nome da própria pessoa vem antes do de familiar; a escritura diz que é documento permanente
  const p = papeisRuraisComAno(x.c).filter(p=>p.ativ && p.de <= alvo && p.ate >= alvo).sort((a, b)=>(b.proprio ? 1 : 0) - (a.proprio ? 1 : 0) || b.de - a.de)[0];
  const perm = p && /escritura|t[íi]tulo de propriedade|matr[íi]cula/i.test(p.rot);
  return p ? {val:`${alvo}: ${p.rotLimpo}${perm ? ` (${p.de}, documento permanente)` : p.ate > p.de ? ` (${p.de} a ${p.ate})` : ""}${p.proprio ? "" : " (de familiar)"}`, fonte:`${p.rot}, no dossiê`} : null; };
Object.assign(PRE_DOSSIE, {
  rur_modulos: x => { if(!_opRural(x)) return null;
    const m = papeisRurais(x.c.id).map(a=>String(a.texto||"").match(/n[úu]mero de m[óo]dulos fiscais:?\s*([\d.,]+)/i)).find(Boolean);
    return m ? {val:m[1].replace(",", "."), fonte:`CCIR: ${m[1]} módulo fiscal`} : null; },
  rur_reside: x => { if(!_opRural(x)) return null; const e = `${x.c.logradouro||""} ${x.c.bairro||""}`.trim();
    return /s[íi]tio|zona rural|fazenda|ch[áa]cara|\bkm\b/i.test(e) ? {val:"No imóvel rural", fonte:`endereço da ficha: ${e}`} : null; },
  rur_empregados: x => { if(!_opRural(x)) return null;
    if(/sem (ter )?empregad|s[óo] (a|com a) fam[íi]lia|sem pagar ningu[ée]m/i.test(relatoDe(x.c))) return {val:"Não", fonte:"relato da recepção"};
    return papeisRurais(x.c.id).some(a=>/m[ãa]o de obra:?\s*familiar/i.test(String(a.texto||""))) ? {val:"Não", fonte:"CAF: mão de obra familiar"} : null; },
  rur_ratif_1a: x => _rurMetade(x, 1),
  rur_ratif_2a: x => _rurMetade(x, 2),
});
// F235 · a roça da mãe e o pescador: o relato diz desde quando ela está na roça; o papel anterior ao parto e o titular vêm dos papéis;
// do pescador, o RGP, as notas de venda e o REAP vêm dos papéis que ele trouxe; na híbrida, a filiação e a roça antes de 11/1991
const _partoDe = x => x.v.mat_data || ((PRE_DOSSIE.mat_data(x)||{}).val) || "";
function _rurAntesParto(x){
  if(!_opDep(x, /^rur$/) || !x.c) return null; const parto = _partoDe(x); if(!parto) return null;
  return papeisDaRoca(x.c).filter(p=>p.data && p.data < parto && /^(proprio|conjuge)$/.test(p.titular) && p.prof)
    .sort((p, q)=>(q.titular==="proprio" ? 1 : 0) - (p.titular==="proprio" ? 1 : 0) || q.data.localeCompare(p.data))[0] || null;
}
Object.assign(PRE_DOSSIE, {
  rur_meses_12: x => { if(!_opDep(x, /^rur$/) || !x.c || ((x.g||{}).vinculos||[]).some(v=>/Segurado Especial/i.test(v.tipo||""))) return null;
    const r = relatoDe(x.c), d = _partoDe(x); if(!d || !/ro[çc]a|s[íi]tio|lavoura|planta|horta|caf[ée]/i.test(r)) return null;
    const m = r.match(/desde\b[^.\d]{0,40}?(\d{2})\/((?:19|20)\d{2})/i) || r.match(/desde\b[^.\d]{0,40}?((?:19|20)\d{2})/i); if(!m) return null;
    const ini = m[2] ? `${m[2]}-${m[1]}` : `${m[1]}-01`, j0 = ymDe(somarMeses(d, -12)), j1 = ymDe(somarMeses(d, -1)), de = ini > j0 ? ini : j0;
    return {val:String(de > j1 ? 0 : mesesEntreYm(de, j1)), fonte:`relato da recepção: na roça desde ${m[2] ? `${m[1]}/${m[2]}` : m[1]}`}; },
  rur_ratif_antes: x => { const p = _rurAntesParto(x); return p ? {val:`${p.rot}, ${fmtBarra(p.data)}`, fonte:`${p.arq}: ${p.txt.split(";")[0]}`} : null; },
  rur_titular_doc: x => { const p = _rurAntesParto(x); return p ? {val:p.titular==="proprio" ? "Própria" : "Marido ou companheiro", fonte:p.arq} : null; },
  rur_municipio: x => { if(!_opRural(x)) return null;
    for(const a of papeisRurais(x.c.id)){ const m = String(a.texto||"").match(/(?:munic[íi]pio:?\s*|zona rural de\s+|·\s*)([A-ZÀ-Ú][A-Za-zÀ-ú' ]{2,40}\/[A-Z]{2})\b/);
      if(m) return {val:m[1].trim(), fonte:fonteDoDossie(a)[1]}; }
    return null; },
  rur_pre1991: x => { if(!_opRural(x)) return null; const p = papeisRuraisComAno(x.c).filter(p=>p.ativ && p.de < 1991).sort((a, b)=>a.de - b.de)[0];
    return p ? {val:"Sim", fonte:`${p.rot}: papel rural de ${p.de}`} : null; },
  apo_filiacao: x => { if(!_opDep(x, /^hibrida$/) || !x.g) return null; const f = filiacaoDe(x.g);
    return f ? {val:f, fonte:`CNIS: primeiro vínculo em ${fmtBarra(f)}`} : null; },
  sd_rgp: x => { if(!_opDep(x, /^SD$/) || !x.c) return null; const r = pescaDoDossie(x.c).rgp;
    return r && r.desde ? {val:r.desde, fonte:`RGP: primeiro registro em ${fmtBarra(r.desde)}`} : null; },
  sd_notas: x => { if(!_opDep(x, /^SD$/) || !x.c) return null; const n = pescaDoDossie(x.c).notas;
    return n ? {val:String(n.meses.length), fonte:`notas de venda do pescado: ${n.meses.map(k=>k.split("-").reverse().join("/")).join(", ") || "nenhum mês nos 12 antes do defeso"}`} : null; },
  sd_reap: x => { if(!_opDep(x, /^SD$/) || !x.c) return null; const r = pescaDoDossie(x.c).reap;
    return r && r.entregue ? {val:"Sim", fonte:`REAP${r.ano ? ` ${r.ano}` : ""} entregue em ${fmtBarra(r.entregue)}`} : null; },
});
// F235 · quem pagou até o mês passado segue pagando (B41); a ocupação de professor da RAIS diz o nível e a função
const _magCbo = x => (x.fd.rais||[]).filter(r=>/professor|docente/i.test(r.cbo||"") && !/^\s*234|ensino superior|universit/i.test(r.cbo||"")).sort((a, b)=>(+a.ano||0) - (+b.ano||0));
const _magNivelCbo = cbo => /infantil/i.test(cbo) ? "Infantil" : /fundamental/i.test(cbo) ? "Fundamental" : /ensino m[ée]dio|m[ée]dio regular/i.test(cbo) ? "Médio" : "";
Object.assign(PRE_DOSSIE, {
  apo_segue: x => { if(x.op!=="idade" || !x.gr || !/^\d{2}\/\d{4}$/.test(x.gr.ultima||"")) return null;
    return chaveComp(x.gr.ultima) >= ymDe(somarMeses(x.hoje, -1)) ? {val:"Sim", fonte:`CNIS: contribui em dia (último mês pago ${x.gr.ultima})`} : null; },
  mag_nivel: x => { if(!_opDep(x, /^professor$/)) return null; const rs = _magCbo(x).filter(r=>_magNivelCbo(r.cbo)); if(!rs.length) return null;
    const ult = rs[rs.length-1], outros = [...new Set(rs.map(r=>_magNivelCbo(r.cbo)))].filter(n=>n!==_magNivelCbo(ult.cbo));
    return {val:_magNivelCbo(ult.cbo), fonte:`RAIS de ${ult.ano}: ${fraseClinica(ult.cbo)}${outros.length ? `; antes, também ${outros.join(" e ").toLowerCase()}, tudo educação básica` : ""}; confirme com a pessoa`}; },
  mag_funcao: x => { if(!_opDep(x, /^professor$/)) return null; const rs = _magCbo(x); if(!rs.length) return null;
    return {val:"Regência", fonte:`RAIS: ocupação de professor (${[...new Set(rs.map(r=>r.ano))].join(", ")}), quem dá aula; confirme com a pessoa`}; },
});
// F235 · o auxílio-acidente começa no dia seguinte ao fim do auxílio que veio antes: a data vem do CNIS
PRE_DOSSIE.aci_dcb31 = x => { if(!_opDep(x, /^(b94|b36)$/)) return null;
  const b = (x.benefCnis||[]).filter(b=>/^(31|91)$/.test(String(b.especie)) && b.ate && !b.ativo).sort((p, q)=>p.ate < q.ate ? -1 : 1).pop();
  return b ? {val:b.ate, fonte:`CNIS: o B${b.especie} terminou em ${fmtBarra(b.ate)}`} : null; };
// o valor presumido entra na conta só onde não se digitou nada
function aplicarPreDossie(x){
  x.vDig = x.v; x.preUsado = {};
  const v = {...x.v};
  for(const [k, f] of Object.entries(PRE_DOSSIE)){ if(v[k]) continue; let p = null; try{ p = f(x); }catch(e){}
    if(p && p.val){ v[k] = p.val; x.preUsado[k] = p; } }
  x.v = v;
  // a data do pedido presumida (a do pedido negado, no recurso) muda a data em que tudo se mede
  if(x.preUsado.der){ x.der = v.der; if(x.dn) x.idade = idadeEm(x.dn, x.der); }
  return x;
}
const valorPre = (k, val) => /^\d{4}-\d{2}-\d{2}$/.test(String(val)) ? fmtBarra(val) : String(val);
function avaliarReq(op, x){
  const lista = REQ_BENEF[op]; if(!lista) return null;
  const rs0 = lista.map(r=>{ let m;
    try{ m = r.mede(x) || {est:"info", txt:""}; }catch(e){ m = {est:"informar", txt:"não consegui medir este requisito"}; }
    return {r, m}; });
  // F235 · o valor tirado do dossiê aparece uma vez, no primeiro requisito que ainda pede a resposta (antes se repetia em cada um)
  const dono = {}; for(const k of Object.keys(x.preUsado||{})){ const q = rs0.find(({r, m})=>(r.campos||[]).includes(k) && !["ok","info","opcao"].includes(m.est)) || rs0.find(({r})=>(r.campos||[]).includes(k)); if(q) dono[k] = q.r.id; }
  const rs = rs0.map(({r, m})=>{
    const pu = (r.campos||[]).filter(k=>(x.preUsado||{})[k]), pk = pu.filter(k=>dono[k]===r.id);
    if(pk.length) m = {...m, pre: pk.map(k=>({k, rot:(CAMPO_AD[k]||[k])[0], val:valorPre(k, x.preUsado[k].val), fonte:x.preUsado[k].fonte}))};
    if(pu.length && m.fonte==="campo") m = {...m, fonte:"dossiê"};
    return {...r, ...m, est: REQ_EST[m.est] ? m.est : "info"}; });
  const n = k => rs.filter(r=>r.est===k).length;
  const pior = rs.map(r=>r.est).sort((a, b)=>REQ_ORDEM.indexOf(a) - REQ_ORDEM.indexOf(b))[0] || "info";
  let quando = null; try{ quando = REQ_EXTRA[op].quando ? REQ_EXTRA[op].quando(x) : null; }catch(e){}
  return {op, rs, ok:n("ok"), total: rs.filter(r=>r.est!=="info").length, informar:n("informar"), falta:n("falta"), provar:n("provar"),
    risco:n("risco") + n("impedido"), divergente:n("divergente"), pior, quando, resumo:(REQ_EXTRA[op]||{}).resumo || ""};
}
const requisitosDe = (c, ks, op) => avaliarReq(op, reqCtx(c, ks||D.casosDoCliente.get(c.id)||[], op));
// ══ F232 · O CATÁLOGO, POR FAMÍLIA ════════════════════════════════════════
// ── Incapacidade e auxílio-acidente (casos-ouro em testes/cadastro/req-ouro/incap.json) ──
// F232 · família incapacidade e auxílio-acidente: b31, b32, acid (B91/B92), b94, b36
// Fonte: crm/fase2/docs/REQUISITOS-POR-BENEFICIO.md, seção "Incapacidade e auxílio-acidente".
(()=>{
  // ── auxiliares da família ──────────────────────────────────────────────
  const _incYmBr = ym => ym ? ym.split("-").reverse().join("/") : "";
  const _incYmMais = (ym, n) => somarMeses(ym+"-01", n).slice(0,7);
  const _incDias = (a, b) => Math.round((Date.parse(b+"T12:00:00") - Date.parse(a+"T12:00:00")) / 864e5);
  const _incSoma = (iso, n) => new Date(Date.parse(iso+"T12:00:00") + n*864e5).toISOString().slice(0,10);
  const _incLido = x => !!(x.g || x.ct || x.gr || (x.hist||[]).length || (x.benefCnis||[]).length);
  const _incAtivos = x => (x.benefCnis||[]).filter(b=>b.ativo);
  const _incNb = b => b.nb ? ` NB ${fmtNb(b.nb)}` : "";
  // o laudo mais recente (pela data do exame, ou pela DII) que traz o dado k
  const _incLaudo = (x, k) => (x.fd.laudos||[]).filter(l=>!k || l[k])
    .map(l=>({...l, _d: isoBr(l.exame||"") || isoBr(l.dii||"") || isoBr(l.dcb||"")})).sort((a, b)=>a._d < b._d ? -1 : 1).pop() || null;
  const _incFonteL = l => `laudo${l.sistema ? " "+l.sistema : ""} de ${l.exame || l.dii || l.dcb}`;
  // a DII: o campo digitado vale (o advogado pode sustentar outra); sem ele, a do laudo mais recente
  function _incDii(x){
    const l = _incLaudo(x, "dii"), dl = l && isoBr(l.dii);
    if(x._perm) return {iso:x._perm, fonte:"campo (incapacidade permanente)", outra:""};
    if(x.v.inc_dii) return {iso:x.v.inc_dii, fonte: ((x.preUsado||{}).inc_dii||{}).fonte || "campo", outra: dl && dl!==x.v.inc_dii ? `; o ${_incFonteL(l)} diz DII ${l.dii}` : ""};
    return dl ? {iso:dl, fonte:_incFonteL(l), outra:""} : null;
  }
  // no B32 todos os requisitos se medem na DII da incapacidade permanente, quando informada (IN 128, art. 326, § 5º)
  const _incPerm = x => x.v.inc_dii_perm ? {...x, _perm:x.v.inc_dii_perm} : x;
  function _incDid(x){
    if(x.v.inc_did) return {iso:x.v.inc_did, fonte: ((x.preUsado||{}).inc_did||{}).fonte || "campo"};
    const l = _incLaudo(x, "did"); return l && isoBr(l.did) ? {iso:isoBr(l.did), fonte:_incFonteL(l)} : null;
  }
  // o começo que conta para preexistência e isenção: o último reingresso antes do fato, ou a filiação
  function _incInicio(x, fato){
    const re = fato && reingressoAte(x, fato);
    if(re) return {iso:`${re}-01`, rot:"volta ao RGPS depois da perda"};
    return x.filiacao ? {iso:x.filiacao, rot:"filiação"} : null;
  }
  // o tipo do trecho da história da qualidade num mês
  const _incSeg = (x, iso) => ((x.hist||[]).find(s=>s.tipo!=="reingresso" && s.de <= ymDe(iso) && ymDe(iso) <= s.ate)||{}).tipo || "";
  // a qualidade numa data (qualidadeEm) com a divergência do Tema 255 TNU e o aviso do limbo
  function _incQual(x, iso){
    // o "sem limite" vale do início do benefício ativo em diante; fato anterior se mede pela história
    const ini = x.gr && x.gr.semLimite && _incAtivos(x).filter(b=>b.de && !/^(36|94|95)$/.test(b.especie)).map(b=>b.de).sort()[0];
    const q = ini && iso < ini ? qualidadeEm({...x, gr:{...x.gr, semLimite:false}}, iso) : qualidadeEm(x, iso); if(q.est!=="risco") return q;
    const ym = ymDe(iso), limbo = ((x.g||{}).vinculos||[]).some(v=>v.aberto && !v.fim && /Empregado/.test(v.tipo||""))
      ? "; há vínculo de emprego sem saída no CNIS: veja o limbo (Tema 300 TNU, só na skill) e não peça a baixa" : "";
    // IN 128, art. 184, § 4º: os 24 meses exigem 120 contribuições NOVAS; o Tema 255 TNU incorpora a prorrogação já adquirida
    let acum = 0, teve = false, ult = null;
    for(const s of x.hist||[]){ if(s.de > ym) break;
      if(s.tipo==="reingresso"){ if(acum > 120) teve = true; acum = 0; }
      if(s.tipo==="contrib"){ acum += mesesEntreYm(s.de, s.ate < ym ? s.ate : ym); ult = s.ate; } }
    if(teve && ult && ult < ym && acum <= 120 && iso < `${_incYmMais(ult, 26)}-16`)
      return {est:"divergente", txt:`${q.txt}; com os 24 meses de graça adquiridos antes da perda, ainda estaria segurado${limbo}`, fonte:q.fonte,
        div:{inss:"IN 128, art. 184, § 4º: os 24 meses exigem 120 contribuições novas depois da perda; vale a graça de 12",
             judicial:"Tema 255 TNU (só na skill; Tema 1352 STJ pendente): a prorrogação já adquirida se incorpora"}};
    // F235 · sem qualidade depois da última graça: diz quando a cobertura acabou e, se o desemprego registrado (SINE ou
    // seguro-desemprego dentro da graça) somaria 12 meses e alcançaria a data, faz a pergunta (IN 128, art. 184, §§ 5º e 10)
    const g0 = x.gr || {}, ultima = !g0.semLimite && g0.perda && g0.mantidaAte && iso >= g0.perda;
    const ext = ultima && !g0.desempregado && !g0.facultativo && g0.ultima && g0.base ? perdaDaQualidade(competenciaMais(g0.ultima, g0.base + 12)) : null;
    const desemp = ext && iso < ext.perda ? `; salvo desemprego registrado: se, depois de ${g0.ultima}, parou de trabalhar e se cadastrou no SINE ou recebeu seguro-desemprego até ${fmtBarra(g0.mantidaAte)}, a cobertura vai até ${fmtBarra(ext.mantidaAte)} e alcança ${fmtBarra(iso)} (IN 128, art. 184, §§ 5º e 10). Pergunte e rode o Emprega Brasil antes de concluir` : "";
    return {...q, txt:q.txt + (ultima && !/terminou em|perdida desde/.test(q.txt) ? ` (a cobertura do INSS acabou em ${fmtBarra(g0.mantidaAte)})` : "") + desemp + limbo};
  }
  // a qualidade na DII; com a DII do campo em ordem e a do laudo não, fica em risco (o INSS usa a do laudo)
  function _incQualDii(x, d){
    const q = _incQual(x, d.iso), l = d.fonte==="campo" && _incLaudo(x, "dii"), dl = l && isoBr(l.dii);
    if(q.est!=="ok" || !dl || dl===d.iso) return q;
    const q2 = _incQual(x, dl);
    return q2.est==="ok" ? q : {est:"risco", txt:`${q.txt}; pela DII do ${_incFonteL(l)} (${fmtBarra(dl)}), que o INSS usa: ${q2.txt}`, fonte:q.fonte};
  }
  // ── categoria do segurado numa data ──
  const _INC_CAT = [[/dom[ée]stic/i,"dom"],[/avulso/i,"avulso"],[/segurado especial/i,"se"],[/individual|empregador/i,"ci"],[/facultativ/i,"fac"],[/empregad/i,"emp"]];
  const _incCatDe = t => (_INC_CAT.find(([rx])=>rx.test(t||""))||[])[1] || "";
  const _INC_ORD = ["emp","dom","avulso","se","ci","fac"];
  const _incFimV = (v, x) => isoBr(v.fim||"") || ((v.comps||[]).length ? `${chaveComp(v.comps[v.comps.length-1].c)}-28` : x.hoje);
  // o campo aci_categoria, ou o vínculo do CNIS na data; sem nenhum aberto, a última atividade antes (a graça)
  function _incCategoria(x, iso){
    if(x.v.aci_categoria) return {cat:_incCatDe(x.v.aci_categoria), rot:x.v.aci_categoria, fonte:"campo", graca:false};
    const vs = ((x.g||{}).vinculos||[]).filter(v=>v.tipo && v.tipo!=="Benefício" && v.inicio && _incCatDe(v.tipo))
      .map(v=>({...v, _de:isoBr(v.inicio), _ate:_incFimV(v, x)}));
    const ordem = l => l.sort((a, b)=>_INC_ORD.indexOf(_incCatDe(a.tipo)) - _INC_ORD.indexOf(_incCatDe(b.tipo)))[0];
    let v = ordem(vs.filter(v=>v._de <= iso && iso <= v._ate)), graca = false;
    if(!v){ v = vs.filter(v=>v._ate < iso).sort((a, b)=>a._ate < b._ate ? -1 : 1).pop(); graca = !!v; }
    return v ? {cat:_incCatDe(v.tipo), rot:v.tipo, fonte:`CNIS: ${v.tipo}${v.origem ? ` em ${v.origem}` : ""}`, graca} : null;
  }
  // o fim de um emprego anterior cuja graça (12 meses) ainda corria na data
  const _incEmpAnterior = (x, iso) => ((x.g||{}).vinculos||[]).filter(v=>["emp","dom","avulso"].includes(_incCatDe(v.tipo)) && v.fim)
    .map(v=>isoBr(v.fim)).filter(f=>f && f < iso && iso < `${_incYmMais(ymDe(f), 14)}-16`).sort().pop() || null;
  // a data do acidente: o campo, ou a CAT mais recente do dossiê
  function _incDataAcid(x){
    if(x.v.aci_data) return {iso:x.v.aci_data, fonte: ((x.preUsado||{}).aci_data||{}).fonte || "campo"};
    const c = (x.fd.cats||[]).filter(c=>c.data).map(c=>({...c, iso:isoBr(c.data)})).sort((a, b)=>a.iso < b.iso ? -1 : 1).pop();
    return c ? {iso:c.iso, fonte:`CAT${c.numero ? " "+c.numero : ""} de ${c.data}`} : null;
  }
  const _incCat0 = x => (x.fd.cats||[]).slice().sort((a, b)=>isoBr(a.data||"") < isoBr(b.data||"") ? -1 : 1).pop() || null;
  // perda auditiva (H83.3, H90, H91) pelo campo, pelo laudo ou pela CAT
  const _incAuditiva = x => [x.v.inc_cid, ...(x.fd.laudos||[]).map(l=>l.cid), ...(x.fd.cats||[]).map(c=>c.cid)].some(c=>/^H(83\.?3|9[01])/i.test(String(c||"").trim()));
  // os meses de segurado especial até a data (quadro Tempos e CNIS), contínuos ou não
  function _incRural(x, ate){
    const ms = new Set(), add = (a, b) => { let k = ymDe(a); const f = ymDe(b && b < ate ? b : ate);
      for(let n = 0; k <= f && n < 1200; n++){ ms.add(k); k = _incYmMais(k, 1); } };
    let fonte = "";
    for(const t of x.tempos||[]) if(t.nat==="rural" && t.de && t.de <= ate && (/especial/i.test(t.det||"") || (!t.det && x.v.rur_regime==="Segurado especial"))){ add(t.de, t.ate); fonte = "quadro Tempos"; }
    for(const v of ((x.g||{}).vinculos||[])) if(/Segurado Especial/i.test(v.tipo||"") && v.inicio && isoBr(v.inicio) <= ate){ add(isoBr(v.inicio), isoBr(v.fim||"")); fonte = fonte || "CNIS"; }
    // "ainda que descontínua, no período imediatamente anterior": conta para trás desde a data e para na lacuna de mais de 12 meses (a graça)
    const l = [...ms].sort().reverse(), ult = l[0]; let n = 0, prev = _incYmMais(ymDe(ate), 1);
    for(const k of l){ if(mesesEntreYm(k, prev) - 2 > 12) break; n++; prev = k; }
    return {meses:n, total:l.length, ult, recente: n > 0, fonte};
  }
  // a dispensa de carência: {est, txt, fonte} ("nao" = não há dispensa), ou null sem motivo informado
  function _incDispensa(x, fato){
    const m = x.v.inc_isencao || "", l = _incLaudo(x, "isencao"), cat = _incCat0(x), se = _incRural(x, fato);
    if(se.meses >= 12) return {est:"ok", txt:`segurado especial com ${se.meses} meses de atividade rural até ${fmtBarra(fato)}; a carência são 12 meses de atividade, não contribuições (art. 39, I)`, fonte:se.fonte};
    if(se.total >= 12) return {est:"risco", txt:`segurado especial com ${se.total} meses rurais, mas só ${se.meses} no período imediatamente anterior a ${fmtBarra(fato)} (lacuna de mais de 12 meses${se.ult ? `; o último em ${_incYmBr(se.ult)}` : ""}): exige 12 (art. 39, I)`, fonte:se.fonte};
    if(/Segurado especial/.test(m)) return se.total
      ? {est:"falta", txt:`segurado especial com ${se.meses} meses rurais lançados no período imediatamente anterior a ${fmtBarra(fato)}; exige 12 (art. 39, I)`, fonte:se.fonte}
      : {est:"ok", txt:"segurado especial: 12 meses rurais declarados; lance-os no quadro Tempos com a prova (art. 39, I)", fonte:"campo"};
    if(/Acidente|profissional/.test(m)) return {est:"ok", txt:`${m.toLowerCase()} (art. 26, II)`, fonte:"campo"};
    if(/lista|Gesta/.test(m)){
      const did = _incDid(x), ini = _incInicio(x, fato), qual = /Gesta/.test(m) ? "gestação de alto risco (Portaria Interministerial MPS/MS 15/2026)" : "doença da lista do art. 151";
      // a gestação de alto risco entrou na lista com a Portaria Interministerial 15/2026, vigente na publicação (data do ato, 03/07/2026; a do DOU não foi conferida)
      if(/Gesta/.test(m) && fato < "2026-07-03") return {est:"risco", txt:`${qual}, mas a DII (${fmtBarra(fato)}) é anterior à inclusão na lista (Portaria Interministerial MPS/MS 15, de 03/07/2026, vigente na publicação): pela norma da época não dispensa`, fonte:"campo"};
      if(!did) return {est:"informar", txt:`${qual}: informe a DID, porque só dispensa a doença surgida depois da filiação`};
      if(!ini) return {est:"informar", txt:`${qual}, surgida em ${fmtBarra(did.iso)}: o CNIS não foi lido e não sei se foi depois da filiação`, fonte:did.fonte};
      if(did.iso < ini.iso) return {est:"risco", txt:`${qual}, mas a doença começou em ${fmtBarra(did.iso)}, antes da ${ini.rot} (${fmtBarra(ini.iso)}): não dispensa (RPS, art. 30, § 2º)`, fonte:did.fonte};
      return {est:"ok", txt:`${qual}, surgida em ${fmtBarra(did.iso)}, depois da ${ini.rot} (${fmtBarra(ini.iso)})`, fonte:did.fonte};
    }
    if(m==="Nenhuma") return {est:"nao", txt:"sem motivo de dispensa", fonte:"campo"};
    if(l && /^Sim/i.test(l.isencao)) return {est:"ok", txt:"a perícia reconheceu a isenção de carência", fonte:_incFonteL(l)};
    // a CAT só dispensa se a incapacidade vier dela: o CID da CAT tem de ser o da incapacidade (campo ou laudo)
    if(cat){ const cid = s => String(s||"").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0,3), ci = cid(x.v.inc_cid || (_incLaudo(x, "cid")||{}).cid);
      return ci && cid(cat.cid)===ci ? {est:"ok", txt:`acidente do trabalho (CAT de ${cat.data || "data não lida"}, CID ${cat.cid}, o mesmo da incapacidade; art. 26, II)`, fonte:"CAT"}
        : {est:"informar", txt:`há CAT de ${cat.data || "data não lida"}${cat.cid ? ` (CID ${cat.cid})` : ""}: se a incapacidade vem desse acidente, marque o motivo da dispensa`, fonte:"CAT"}; }
    if(l && /^N/i.test(l.isencao)) return {est:"nao", txt:"a perícia não reconheceu isenção de carência", fonte:_incFonteL(l)};
    return null;
  }
  // a carência até o fato: o total, o intercalado e, no reingresso, só as novas até chegar a 6 (art. 27-A; IN 128, art. 200)
  function _incCar(x, fato){
    const tot = carenciaAte(x, fato), ic = intercaladoAte(x, fato), re = reingressoAte(x, fato);
    const novas = re ? tot - mesesContadosAte((x.ct||{}).periodos, _incYmMais(re, -1)) : null;
    return {tot, ic, re, novas, conta: re && novas < 6 ? novas : tot + ic};
  }
  function _incMedeCar(x){
    const d = _incDii(x), fato = d ? d.iso : x.der, disp = _incDispensa(x, fato);
    if(disp && disp.est==="ok") return {...disp, txt: /^segurado especial/.test(disp.txt) ? disp.txt : `dispensada: ${disp.txt}`};
    if(!x.ct) return {est:"informar", txt:"o CNIS não foi lido: informe as contribuições"};
    const c = _incCar(x, fato), ate = d ? `até a DII (${_incYmBr(ymDe(fato))})` : `até a DER (${fmtBarra(x.der)})`;
    const ps = [`${c.tot} ${c.tot===1?"contribuição":"contribuições"} ${ate}`];
    if(c.ic) ps.push(`mais ${c.ic} meses de benefício intercalado (IN 128, art. 193)`);
    if(c.re) ps.push(c.novas >= 6 ? `${c.novas} desde a volta em ${_incYmBr(c.re)}, e as de antes da perda voltam a contar (art. 27-A; IN 128, art. 200)`
      : `só ${c.novas} desde a volta em ${_incYmBr(c.re)}: as de antes da perda ainda não contam (art. 27-A; IN 128, art. 200)`);
    const txt = `${ps.join("; ")}; exige 12`;
    if(c.re && fato < "2019-06-18" && c.tot + c.ic >= 12) return {est:"informar", txt:`${txt}, mas o fato é anterior a 18/06/2019: a fração exigida desde a volta é a da norma da época (MP 767/2017, Lei 13.457/2017, MP 871/2019)`, fonte:"CNIS"};
    if(c.conta >= 12 && d){ const l = d.fonte==="campo" && _incLaudo(x, "dii"), dl = l && isoBr(l.dii), c2 = dl && dl < d.iso ? _incCar(x, dl).conta : 12;
      if(c2 < 12) return {est:"risco", txt:`${txt}; pela DII do ${_incFonteL(l)} (${_incYmBr(ymDe(dl))}), que o INSS usa, são só ${c2}`, fonte:"CNIS"}; }
    if(c.conta >= 12) return d ? {est:"ok", txt, fonte:"CNIS"} : {est:"informar", txt:`${txt}. Informe a DII: só conta até ela`, fonte:"CNIS"};
    return {est:"falta", txt: txt + (disp && disp.txt ? ` (${disp.txt})` : ""), fonte:"CNIS"};
  }
  function _incMedeIsencao(x){
    const d = _incDii(x), fato = d ? d.iso : x.der, disp = _incDispensa(x, fato);
    if(disp && !["nao","informar"].includes(disp.est)) return disp;
    const cumpre = x.ct && d ? _incCar(x, fato).conta >= 12 : null;
    if(cumpre) return {est:"info", txt:`a carência de 12 está cumprida até a DII (${_incYmBr(ymDe(fato))}); a dispensa não é necessária`, fonte:"CNIS"};
    if(disp && disp.est==="informar") return disp;
    if(disp) return cumpre===false ? {est:"falta", txt:`${disp.txt}, e a carência de 12 não está cumprida`, fonte:disp.fonte} : {...disp, est:"informar"};
    return {est:"informar", txt:"informe se há dispensa: acidente de qualquer natureza, doença do trabalho, doença da lista do art. 151 surgida depois da filiação, gestação de alto risco ou segurado especial"};
  }
  function _incMedePreex(x, art){
    const did = _incDid(x), d = _incDii(x), ini = _incInicio(x, d ? d.iso : x.der);
    if(!ini) return {est:"informar", txt:"o CNIS não foi lido: não sei a filiação"};
    if(!did){
      if(d && d.iso < ini.iso) return {est:"risco", txt:`Não: a incapacidade (DII ${fmtBarra(d.iso)}) é anterior à ${ini.rot} (${fmtBarra(ini.iso)})`, fonte:d.fonte};
      // F235 · o documento médico mais antigo do dossiê, depois da filiação, responde como provável (a pessoa confirma quando a doença começou)
      const ant = (x.clin||[]).filter(i=>/^\d{4}-\d{2}-\d{2}$/.test(i.data||"")).sort((a, b)=>a.data < b.data ? -1 : 1)[0];
      if(ant && ant.data > ini.iso) return {est:"ok", txt:`Sim, pelo que o dossiê mostra: o documento médico mais antigo é de ${fmtBarra(ant.data)}, depois da ${ini.rot} (${fmtBarra(ini.iso)}); confirme com a pessoa quando a doença começou`, fonte:_clinFonte(ant)};
      return {est:"informar", txt:"pergunte quando a doença começou (DID), ou veja no relatório médico ou no laudo da perícia"};
    }
    if(did.iso < ini.iso) return {est:"risco", txt:`Não: a doença começou em ${fmtBarra(did.iso)}, antes da ${ini.rot} (${fmtBarra(ini.iso)}); só há direito se a incapacidade veio do agravamento (${art})`, fonte:did.fonte};
    return {est:"ok", txt:`Sim: a doença começou em ${fmtBarra(did.iso)}, depois da ${ini.rot} (${fmtBarra(ini.iso)})`, fonte:did.fonte};
  }
  // a DER: o campo, ou o primeiro pedido de incapacidade do dossiê feito depois da DII
  function _incDer(x, desde){
    if(x.v.der) return {iso:x.v.der, fonte:"campo"};
    const p = (x.fd.processos||[]).filter(p=>/incapacidade|doen[çc]a|invalidez/i.test(p.servico||"") && p.entrada)
      .map(p=>({...p, iso:isoBr(p.entrada)})).filter(p=>p.iso && (!desde || p.iso >= desde)).sort((a, b)=>a.iso < b.iso ? -1 : 1)[0];
    return p ? {iso:p.iso, fonte:`pedido de ${p.entrada}`} : null;
  }
  // a DIB do auxílio ou da aposentadoria sem benefício anterior (art. 60 e art. 43, § 1º; IN 128, art. 336).
  // Os 30 dias contam do afastamento (DAT) no B31 (art. 60, § 1º; IN 128, art. 336, II) e da DII no B32 do não empregado (art. 43, § 1º, b)
  function _incDib(x, b32){
    const d = _incDii(x); if(!d && !x.v.inc_dat) return null;
    const afast = x.v.inc_dat ? diaSeguinte(x.v.inc_dat) : d.iso, k = _incCategoria(x, d ? d.iso : afast), emp = !!k && k.cat==="emp" && !k.graca;
    const d16 = _incSoma(afast, 15), base = b32 && !emp && d ? d.iso : afast, prazo = _incSoma(base, emp ? 29 : 30);
    const dib = emp ? (d && d.iso > d16 ? d.iso : d16) : (d ? d.iso : afast);
    return {d, k, emp, base, dib, prazo, der:_incDer(x, d && d.iso),
      quem: emp ? `empregado: DIB ${dib===d16 ? "no 16º dia do afastamento" : "na DII, posterior ao 16º dia do afastamento"} (${fmtBarra(dib)}) se pedir até o 30º dia (${fmtBarra(prazo)})`
        // F235 · o último emprego já tinha acabado na DII (em graça): a pessoa estava desempregada, e o benefício conta da DII
        : `${k ? (k.graca ? `desempregado na DII (o último vínculo, de ${k.rot.toLowerCase()}, já tinha acabado)` : k.rot.toLowerCase()) : "categoria não lida, conta como não empregado"}: DIB na DII (${fmtBarra(dib)}) se pedir até ${fmtBarra(prazo)}`};
  }
  // as vedações do auxílio e da aposentadoria por incapacidade (art. 124)
  function _incMedeVed(x, op){
    const at = _incAtivos(x), apo = at.find(b=>/^(4[1-6]|57|32|92)$/.test(b.especie));
    if(op==="acid" && apo && /^32$/.test(apo.especie)) return {est:"info", txt:`B32 previdenciário em manutenção${_incNb(apo)}: cabe pedir a conversão em acidentário, para 100 % da média (só na skill)`, fonte:"CNIS"};
    if(x.apos || apo){ const a = x.apos || {especie:`B${apo.especie}`, nb:apo.nb};
      return {est:"impedido", txt:`${a.especie}${a.nb ? ` (NB ${a.nb})` : ""} em manutenção: não acumula com ${op==="b32" ? "outra aposentadoria" : "auxílio por incapacidade"} (art. 124, I e II)`, fonte:"CNIS"}; }
    const d = _incDii(x), fato = d ? d.iso : x.der;
    const sm = at.find(b=>b.especie==="80");
    if(sm) return {est:"risco", txt:`salário-maternidade em manutenção${_incNb(sm)}: não acumula (art. 124, IV)`, fonte:"CNIS"};
    const parc = (x.fd.seguros||[]).flatMap(s=>(s.parcelas||[]).filter(parcelaRecebida)).map(p=>isoBr(p.pagamento)).filter(p=>p && p >= fato).sort()[0];
    if(parc) return {est:"risco", txt:`seguro-desemprego com parcela paga em ${fmtBarra(parc)}, depois de ${fmtBarra(fato)}: não acumula (art. 124, parágrafo único)`, fonte:"seguro-desemprego"};
    if(!_incLido(x)) return {est:"informar", txt:"o CNIS não foi lido: confira os benefícios ativos"};
    const inc = at.find(b=>/^(31|91)$/.test(b.especie)), aa = at.find(b=>/^(36|94)$/.test(b.especie)), ps = [];
    if(inc) ps.push(op==="b32" ? `B${inc.especie}${_incNb(inc)} ativo: cessa com a aposentadoria` : `já recebe B${inc.especie}${_incNb(inc)}: é prorrogação, não pedido novo`);
    if(aa) ps.push(op==="b32" ? `auxílio-acidente${_incNb(aa)} cessa na véspera da aposentadoria (art. 86, § 1º)` : `auxílio-acidente${_incNb(aa)} acumula; se for do mesmo acidente, fica suspenso durante o auxílio (IN 128, art. 356)`);
    if(op==="b32" && d && ((x.ct||{}).periodos||[]).some(([, b])=>b > ymDe(d.iso))) ps.push("há contribuição no CNIS depois da DII: voltar a trabalhar cessa a aposentadoria (IN 128, art. 332)");
    return ps.length ? {est:"info", txt:ps.join("; "), fonte:"CNIS"} : {est:"ok", txt:"nenhum benefício ativo impede; pensão por morte acumula", fonte:"CNIS"};
  }
  // ── auxílio-acidente ──
  function _incMedeCategoria(x, op){
    const d = op==="acid" ? (_incDataAcid(x) || _incDii(x)) : _incDataAcid(x);
    if(!d) return {est:"informar", txt:`informe a data do ${op==="acid" ? "acidente ou da DII" : "acidente"} (ou traga ${op==="b36" ? "o boletim de ocorrência ou a ficha do pronto-socorro" : "a CAT"})`};
    const k = _incCategoria(x, d.iso), em = `em ${fmtBarra(d.iso)}`, nome = op==="acid" ? "benefício acidentário" : "auxílio-acidente";
    if(!k || !k.cat) return {est:"informar", txt:`informe a categoria ${em} (o CNIS não foi lido)`};
    const fonte = k.fonte==="campo" ? "campo" : `${k.fonte}; ${d.fonte}`;
    if(k.cat==="dom" && d.iso < "2015-06-02") return {est:"impedido", txt:`empregado doméstico ${em}: só tem ${nome} para fato desde 02/06/2015 (LC 150/2015)${op==="acid" ? "; o pedido segue como B31 ou B32 previdenciário" : ""}`, fonte};
    // F235 · vale como trabalhava no dia do acidente: ser MEI ou trabalhar por conta própria hoje não tira o auxílio-acidente, que soma à renda de hoje
    const hoje0 = op!=="acid" && ((x.g||{}).vinculos||[]).some(v=>v.tipo && v.tipo!=="Benefício" && v.inicio && isoBr(v.inicio) > d.iso && ["ci","fac"].includes(_incCatDe(v.tipo)));
    if(["emp","dom","avulso","se"].includes(k.cat)) return {est:"ok", txt:`${k.rot} ${em}${k.graca ? " (na graça: vale a última atividade)" : ""}${x.v.aci_vinculo ? `, ${x.v.aci_vinculo}` : ""}${hoje0 ? `. Vale a atividade do dia do acidente (IN 128, art. 352, § 8º): ser MEI ou trabalhar por conta própria hoje não tira o direito, e o auxílio-acidente é pago junto com essa renda (Lei 8.213/91, art. 86, § 3º)` : ""}`, fonte};
    if(op!=="acid"){ const prev = _incEmpAnterior(x, d.iso);
      if(prev && k.cat==="fac") return {est:"ok", txt:`facultativo ${em}, na graça do emprego que terminou em ${fmtBarra(prev)}: vale a última atividade exercida e a graça da condição anterior (IN 128, arts. 353, § 1º, e 184, § 7º)`, fonte};
      if(prev && k.cat==="ci") return {est:"divergente", txt:`contribuinte individual ${em}, na graça do emprego que terminou em ${fmtBarra(prev)}`, fonte,
        div:{inss:"IN 128, art. 352, § 9º: contribuinte individual não tem auxílio-acidente", judicial:"TNU, PUIL 5000733 e PEDILEF 5026380 (só na skill; STJ dividido): vale a graça do emprego anterior"}}; }
    return {est:"impedido", txt:`${k.rot} ${em}: ${op==="acid" ? "não tem espécie acidentária; o pedido segue como B31 ou B32 previdenciário, sem carência se for acidente de qualquer natureza" : "contribuinte individual e facultativo não têm auxílio-acidente (art. 18, § 1º)"}`, fonte};
  }
  function _incMedeQualAcid(x){
    const d = _incDataAcid(x); if(!d) return {est:"informar", txt:"informe a data do acidente (ou traga a CAT, o boletim de ocorrência ou a ficha do pronto-socorro)"};
    const q = _incQual(x, d.iso), fonte = q.fonte ? `${q.fonte}; ${d.fonte}` : d.fonte;
    if(q.est==="ok" && d.iso < "2008-12-31" && _incSeg(x, d.iso)==="graca")
      return {est:"risco", txt:`acidente em ${fmtBarra(d.iso)}, na graça e antes de 31/12/2008: o auxílio-acidente na graça só vale desde o Decreto 6.722/2008`, fonte};
    return {...q, txt:`acidente em ${fmtBarra(d.iso)}: ${q.txt}`, fonte};
  }
  function _incMedeNexo(x, op){
    const c = _incCat0(x), n = x.v.aci_nexo || "", t = x.v.aci_tipo || (c && c.tipo) || "", aud = _incAuditiva(x);
    if(n==="Sem nexo") return {est:"falta", txt: op==="b94" ? `sem nexo com o trabalho: o pedido é o B36 previdenciário${aud ? "; a perda auditiva sem nexo não dá auxílio-acidente (art. 86, § 4º)" : ""}`
      : "sem nexo com o trabalho: o pedido segue como B31 ou B32 previdenciário", fonte:"campo"};
    let r = null;
    if(c) r = {est:"ok", txt:`CAT${c.numero ? " "+c.numero : ""} de ${c.data || "data não lida"}${c.tipo ? `, ${c.tipo.toLowerCase()}` : ""}${c.cnae && c.cid ? `; CNAE ${c.cnae} e CID ${c.cid}: confira o NTEP na Lista C do Anexo II do RPS` : ""}`, fonte:"CAT"};
    else if(/^(CAT|NTEP|Perícia)$/.test(n)) r = {est:"ok", txt:`nexo por ${n}`, fonte:"campo"};
    else if(x.v.aci_ntep==="Sim") r = {est:"ok", txt:`o CID combina com o CNAE da empresa${x.v.aci_cnae ? ` (${x.v.aci_cnae})` : ""}: o NTEP presume o nexo (art. 21-A)`, fonte:"campo"};
    // F235 · sem CAT, o laudo do INSS e o prontuário que dizem "no trabalho" são a prova; falta registrar a CAT
    else if(!n && _incTrab(x)){ const tr = _incTrab(x);
      r = {est:"risco", txt:`acidente no trabalho registrado ${tr.onde}, mas ${tr.nexoNao ? "o perito marcou nexo técnico Não e " : ""}não há CAT: por isso o benefício saiu como comum. A prova são o laudo e o prontuário; falta registrar a CAT (o próprio segurado, o sindicato ou o médico que atendeu podem fazê-la, sem prazo)`, fonte:tr.fonte}; }
    else if(/Típico|Trajeto|profissional|Concausa|Doença/i.test(t)) r = {est:"informar", txt:`${t}: falta a prova do nexo (CAT, que o próprio segurado pode emitir, NTEP ou perícia)`};
    if(!r) return {est:"informar", txt:"traga a CAT ou informe o nexo (NTEP pelo CNAE e CID, ou perícia)"};
    if(aud && op==="b94") r.txt += "; perda auditiva: exige o nexo e a redução comprovada (art. 86, § 4º)";
    return r;
  }
  // a DCB do auxílio por incapacidade que veio antes: o campo, o CNIS (31 ou 91 cessado) ou o laudo
  function _incDcbAnterior(x){
    if(x.v.aci_dcb31) return {iso:x.v.aci_dcb31, fonte:"campo"};
    const b = (x.benefCnis||[]).filter(b=>/^(31|91)$/.test(b.especie) && b.ate && !b.ativo).sort((a, b)=>a.ate < b.ate ? -1 : 1).pop();
    if(b) return {iso:b.ate, fonte:`CNIS: B${b.especie}${_incNb(b)}`};
    if(x.v.inc_dcb && x.v.inc_dcb < x.hoje) return {iso:x.v.inc_dcb, fonte:"campo"};
    const l = _incLaudo(x, "dcb"); return l && isoBr(l.dcb) < x.hoje ? {iso:isoBr(l.dcb), fonte:_incFonteL(l)} : null;
  }
  function _incMedeConsol(x){
    if(x.v.aci_consolidacao) return {est:"ok", txt:`lesões consolidadas em ${fmtBarra(x.v.aci_consolidacao)}`, fonte:"campo"};
    const inc = _incAtivos(x).find(b=>/^(31|91)$/.test(b.especie));
    if(inc) return {est:"falta", txt:`ainda recebe B${inc.especie}${_incNb(inc)}: a consolidação vem depois da alta`, fonte:"CNIS"};
    // aci_sequela é "Sequela consolidada": o Não diz que ainda não consolidou, e vale sobre a DCB
    if(x.v.aci_sequela==="Não") return {est:"falta", txt:"a sequela ainda não se consolidou (tratamento em curso): o auxílio-acidente vem depois da consolidação", fonte:"campo"};
    const dcb = _incDcbAnterior(x);
    // F235 · o relatório do dossiê que diz "consolidada" responde, junto com a alta
    const rc = _clinMais(x, "consolidada");
    if(dcb && rc) return {est:"ok", txt:`o ${_clinFonte(rc)} diz que a lesão está consolidada; o auxílio que veio antes cessou em ${fmtBarra(dcb.iso)}`, fonte:_clinFonte(rc)};
    if(dcb) return {est:"ok", txt:`o auxílio que veio antes cessou em ${fmtBarra(dcb.iso)}: a alta marca a consolidação; confirme no relatório médico`, fonte:dcb.fonte};
    if(x.v.aci_sequela==="Sim") return {est:"ok", txt:"sequela consolidada", fonte:"campo"};
    return {est:"informar", txt:"informe a data da consolidação (fim do tratamento) ou a DCB do auxílio que veio antes"};
  }
  function _incMedeSequela(x){
    const ativ = x.v.aci_atividade ? ` para ${x.v.aci_atividade}` : "", r = x.v.aci_reducao || "";
    if(x.v.aci_readaptado==="Sim") return {est:"risco", txt:"mudou de função por readaptação preventiva da empresa: a IN 128, art. 354, § 2º, II, nega", fonte:"campo"};
    if(r==="Não reduz") return {est:"falta", txt:`a sequela não reduz a capacidade${ativ}: sem repercussão no trabalho não cabe (IN 128, art. 354, § 2º, I; Súmula 89 TNU, só na skill)`, fonte:"campo"};
    if(/^Sim/.test(r)) return {est:"ok", txt:`${r==="Sim" ? "a sequela reduz a capacidade" : "a sequela exige maior esforço"}${ativ}${x.v.aci_anexo3==="Fora do Anexo III" ? "; fora do Anexo III, que é só exemplo (IN 128, art. 354, § 1º)" : x.v.aci_anexo3 ? `; ${x.v.aci_anexo3} do Anexo III` : ""}; qualquer grau basta (Tema 416 STJ, só na skill)`, fonte:"campo"};
    // F235 · antes da resposta, a regra que tranquiliza: qualquer grau basta, e a tabela do Anexo III é só exemplo
    return {est:"informar", txt:`informe se a sequela reduz a capacidade${ativ || " para a atividade da data do acidente"} (relatório médico): qualquer grau basta, mesmo fora da tabela do Anexo III (IN 128, art. 354, § 1º; Tema 416 STJ)`};
  }
  function _incMedeDibAa(x){
    const dcb = _incDcbAnterior(x), der = x.der;
    if(!dcb) return {est:"info", txt:`${_incLido(x) ? "nenhum auxílio por incapacidade anterior encontrado" : "sem o CNIS, não sei se houve auxílio antes"}: sem ele, DIB na DER (${fmtBarra(der)}), pedido aceito desde 29/05/2013 (IN 128, art. 352, §§ 2º e 6º, I); com ele, no dia seguinte à cessação`, fonte: _incLido(x) ? "CNIS" : "campo"};
    if(der >= somarAnos(dcb.iso, 10)) return {est:"info", txt:`passaram 10 anos da cessação (${fmtBarra(dcb.iso)}): DIB na DER (${fmtBarra(der)}) (IN 128, art. 352, § 10)`, fonte:dcb.fonte};
    const dib = diaSeguinte(dcb.iso), p5 = somarAnos(dib, 5), presc = der > p5 ? `; as parcelas de mais de 5 anos antes do pedido prescrevem (Tema 862 STJ, só na skill)` : "";
    // F235 · faltando 1 ano ou menos para a DIB completar 5 anos, o prazo corre: depois, cada mês de espera apaga um mês de atrasado
    // F235 · o prazo diz também onde: o do trabalho na Justiça Estadual, o comum no Juizado Federal
    if(der <= p5 && p5 <= somarAnos(x.hoje, 1)) return {est:"risco", txt:`prazo correndo: entre com o pedido no INSS ou a ação ${x.op==="b36" ? "no Juizado Especial Federal" : "acidentária na Justiça Estadual (nunca no Juizado Federal)"} antes de ${fmtBarra(p5)}; o auxílio-acidente é devido desde ${fmtBarra(dib)} (DIB), dia seguinte à cessação do auxílio (art. 86, § 2º), e depois de 5 anos cada mês de espera apaga um mês de atrasado (Tema 862 STJ, conferir)`, fonte:dcb.fonte, quando:p5};
    return {est:"info", txt:`DIB em ${fmtBarra(dib)}, dia seguinte à cessação do auxílio (art. 86, § 2º)${presc}`, fonte:dcb.fonte, quando:dib};
  }
  function _incMedeVedAa(x){
    const at = _incAtivos(x), apo = at.find(b=>/^(4[1-6]|57|32|92)$/.test(b.especie));
    if(x.apos || apo){ const d = _incDataAcid(x), de = apo && apo.de;
      if(d && d.iso < "1997-11-11" && de && de < "1997-11-11") return {est:"divergente", txt:`acidente (${fmtBarra(d.iso)}) e aposentadoria (${fmtBarra(de)}) anteriores a 11/11/1997`, fonte:"CNIS",
        div:{inss:"art. 86, §§ 1º a 3º: o auxílio-acidente cessa na véspera da aposentadoria", judicial:"Súmula 507 e Tema 555 STJ (só na skill): lesão e aposentadoria anteriores a 11/11/1997 acumulam"}};
      const a = x.apos || {especie:`B${apo.especie}`, nb:apo.nb};
      return {est:"impedido", txt:`${a.especie}${a.nb ? ` (NB ${a.nb})` : ""} em manutenção: o auxílio-acidente não acumula e cessa na véspera da aposentadoria (art. 86, §§ 1º a 3º)`, fonte:"CNIS"}; }
    const outro = at.find(b=>/^(36|94)$/.test(b.especie));
    if(outro) return {est:"opcao", txt:`já recebe auxílio-acidente (B${outro.especie}${_incNb(outro)}): não acumula com outro; opte pelo mais vantajoso (art. 124, V; IN 128, art. 355, § 3º)`, fonte:"CNIS"};
    if(!_incLido(x)) return {est:"informar", txt:"o CNIS não foi lido: confira os benefícios ativos"};
    const inc = at.find(b=>/^(31|91)$/.test(b.especie));
    if(inc) return {est:"info", txt:`B${inc.especie}${_incNb(inc)} ativo: o auxílio-acidente do mesmo acidente fica suspenso enquanto durar (IN 128, art. 356)`, fonte:"CNIS"};
    return {est:"ok", txt:"nada impede: acumula com salário, pensão e seguro-desemprego; não mantém a qualidade de segurado (art. 15, I)", fonte:"CNIS"};
  }
  function _incMedeDocsAa(x){
    const tem = [(x.fd.cats||[]).length ? "CAT" : "", (x.fd.laudos||[]).length ? "laudo" : ""].filter(Boolean).join(" e ");
    // F235 · o relatório do dossiê traz o acidente e a sequela, mas não a tarefa que ficou difícil: pede-se o relatório dos 7 itens com ela
    if(x.v.aci_docs==="Sim" && (x.preUsado||{}).aci_docs){ const rel = (x.clin||[]).filter(i=>i.tipo==="Relatório" && i.fatos && i.fatos.acid && i.fatos.sequela).sort((a, b)=>String(a.data).localeCompare(String(b.data))).pop();
      if(rel && !rel.fatos.reduz){ const ul = _incLaudo(x, "resultado"), alta = ul && !/consolidad|sequela/i.test(ul.historia||"") ? `a perícia de ${ul.exame} deu alta e não registrou sequela, e ` : "";
        return {est:"provar", txt:`${alta}o ${_clinFonte(rel)} traz o acidente e a sequela, mas não diz o que ficou difícil no trabalho que fazia na data do acidente${x.v.aci_atividade ? ` (${x.v.aci_atividade})` : ""}: peça ao médico um relatório com os 7 itens da análise documental, que diga também a tarefa do trabalho que ficou mais difícil: identificação, nome e CRM do médico, data, a lesão, o acidente e a data, a consolidação e a ligação com o acidente, e a assinatura. Faça o pedido no Meu INSS antes de qualquer ação`, fonte:_clinFonte(rel)}; } }
    if(x.v.aci_docs==="Sim") return {est:"ok", txt:"há documento médico do acidente e da sequela: o INSS agenda a perícia presencial", fonte:"campo"};
    if(x.v.aci_docs==="Não") return {est:"falta", txt:"sem documento médico do acidente e da sequela o INSS indefere sem perícia (análise documental prévia)", fonte:"campo"};
    return {est:"informar", txt:`confira se há relatório médico do acidente e da sequela${tem ? ` (o dossiê tem ${tem})` : ""}: sem ele o INSS indefere sem perícia`};
  }
  const _incSemCar = (art) => ({est:"ok", txt:`dispensada (${art})`, fonte:"lei"});
  // F235 · onde se pede o auxílio-acidente: o do trabalho na Justiça Estadual (nunca no Juizado Federal), o comum no INSS e, negado, no
  // Juizado Federal; a perícia que já viu a lesão consolidada permite ir direto à ação acidentária (escolha do advogado)
  function _incMedeViaAa(x, op){
    const ul = _incLaudo(x, "resultado"), viu = ul && /consolidad/i.test(ul.historia||"") ? ul : null;
    if(op==="b94"){ const r = viu ? {est:"info", txt:`a perícia de ${viu.exame} já viu a lesão consolidada: o advogado escolhe entre a ação acidentária na Justiça Estadual (o núcleo de acidentes do trabalho do TJSP, conferir), sem pedido novo ao INSS, e, mais conservador, o pedido no Meu INSS com o relatório dos 7 itens; nunca o Juizado Federal (CF, art. 109, I). Para a ação: comprovante de residência e procuração com assinatura digital (ICP-Brasil, conferir)`, fonte:_incFonteL(viu)}
      : {est:"info", txt:"pedido no Meu INSS, com o relatório dos 7 itens; se o INSS negar, recurso em 30 dias ou ação acidentária na Justiça Estadual, nunca no Juizado Federal (CF, art. 109, I)", fonte:"lei"};
    // F235 · a estabilidade de quem volta do auxílio acidentário: 12 meses, com ou sem o auxílio-acidente (Lei 8.213/91, art. 118)
    const b91 = (x.benefCnis||[]).filter(b=>b.especie==="91" && b.ate && !b.ativo).sort((p, q)=>p.ate < q.ate ? -1 : 1).pop(), est = b91 && somarMeses(b91.ate, 12) >= x.hoje ? somarMeses(b91.ate, 12) : null;
    if(est) r.txt += `. A estabilidade no emprego vai até ${fmtBarra(est)}, 12 meses depois do fim do auxílio acidentário, com ou sem o auxílio-acidente (Lei 8.213/91, art. 118)`;
    return r; }
    return {est:"info", txt:`pedido no Meu INSS antes de qualquer ação${ul ? `: a perícia de ${ul.exame} ${viu ? "viu a lesão consolidada" : "não registrou a sequela, e há Turma Recursal de SP que extingue a ação sem esse pedido (conferir)"}` : ""}; se o INSS negar, recurso em 30 dias ou ação no Juizado Especial Federal, e não na Justiça Estadual, porque não foi acidente do trabalho`, fonte: ul ? _incFonteL(ul) : "lei"};
  }

  // F235 · sem qualidade no dia em que ficou incapaz (a DII depois da perda da última graça): o pedido espera a prova da
  // incapacidade anterior ou o desemprego registrado; voltar a pagar não resolve (Lei 8.213/91, art. 59, § 1º)
  const _incSemQual = (x, a) => { const r = a && a.rs.find(r=>r.id==="qualidade_na_dii" && r.est==="risco"), d = _incDii(x), g = x.gr || {};
    return r && d && g.perda && !g.semLimite && d.iso >= g.perda ? {dii:d.iso, ate:g.mantidaAte, perda:g.perda, desemp:/salvo desemprego/.test(r.txt)} : null; };
  // F235 · o que prova a incapacidade anterior à perda é o pedido ao cliente (vai a Documentos pelo "peça")
  const _incProvaAntes = (x, d, q) => q.est==="risco" && x.gr && x.gr.perda && !x.gr.semLimite && d.iso >= x.gr.perda
    ? `. Para mostrar que a incapacidade começou antes de ${fmtBarra(x.gr.perda)}, peça ao médico um relatório com a data em que parou de conseguir trabalhar e traga o laudo da biópsia ou do exame que confirmou a doença, as receitas, os relatórios e o prontuário de antes de ${fmtBarra(x.gr.perda)}` : "";
  // F235 · o auxílio-doença em curso: a data de fim (campo, laudo, extrato ou CNIS) e o valor de hoje (extrato ou carta)
  const _incNum = s => +String(s||"").replace(/[^\d,]/g, "").replace(",", ".") || 0;
  function _incAuxAtivo(x){
    const at = _incAtivos(x).find(b=>/^(31|91)$/.test(b.especie)); if(!at) return null;
    const mesmo = nb => soDig(nb||"")===soDig(at.nb||"");
    const l = _incLaudo(x, "dcb"), dl = l && isoBr(l.dcb), e = (x.fd.extratos||[]).find(e=>mesmo(e.nb)), de = e && e.dcb ? isoBr(e.dcb) : "";
    const dcb = [x.v.inc_dcb, dl, de, at.ate].find(d=>d && d >= x.hoje) || null;
    const fonte = !dcb ? "CNIS" : dcb===x.v.inc_dcb ? "campo" : dcb===dl ? _incFonteL(l) : dcb===de ? "extrato de pagamento" : "CNIS";
    const carta = (x.fd.cartas||[]).find(c=>mesmo(c.nb) && c.rmi), v = e && _incNum(e.mr) ? {v:_incNum(e.mr), fonte:"extrato de pagamento"} : carta ? {v:_incNum(carta.rmi), fonte:"carta de concessão"} : null;
    return {at, dcb, fonte, valor:v};
  }
  // F235 · o acidente no trabalho que o laudo do INSS ou o prontuário registram, sem CAT (o benefício saiu como comum)
  const RX_TRAB = /acidente (?:de|do) trabalho|no trabalho\b|em ambiente de trabalho|de trajeto/i;
  function _incTrab(x){
    const l = (x.fd.laudos||[]).filter(l=>RX_TRAB.test(l.historia||"")).pop(), cl = (x.clin||[]).find(i=>RX_TRAB.test(`${i.titulo} ${i.resumo}`) && !/fora do trabalho/i.test(i.resumo||""));
    if(!l && !cl) return null;
    const frase = l ? ((l.historia.match(/[^.]*(?:acidente (?:de|do) trabalho|no trabalho\b|em ambiente de trabalho|de trajeto)[^.]*/i)||[])[0]||"").trim() : "";
    const onde = [l ? `pelo INSS (laudo de ${l.exame}: "${frase}")` : "", cl ? `pelo ${String(cl.fonte||"").split("/")[0].replace(/Ribeirao/, "Ribeirão")} (${String(cl.tipo||"documento").toLowerCase()} de ${fmtBarra(cl.data)})` : ""].filter(Boolean).join(" e ");
    // F235 · a RAIS que registra o afastamento como "doença não relacionada ao trabalho" é a versão da empresa, a enfrentar
    const ra = (x.fd.rais||[]).flatMap(r=>(r.afastamentos||[]).map(a=>({...a, ano:r.ano}))).find(a=>/n[ãa]o relacionad[ao] ao trabalho/i.test(a.motivo||""));
    return {onde: onde + (ra ? `; a RAIS de ${ra.ano} registra o afastamento como doença não relacionada ao trabalho, que é a versão da empresa` : ""), nexoNao: !!l && l.nexo==="Não", fonte: l ? _incFonteL(l) : String(cl.fonte||"dossiê")};
  }
  // F235 · a aposentadoria por invalidez comum de quem se acidentou no trabalho: a troca para a acidentária (32 para 92)
  // F235 · o coeficiente da aposentadoria por incapacidade (EC 103: 60 % mais 2 por ano acima de 20 ou 15), contado até a DII, e a comparação com o auxílio de hoje
  function _incCoef(x){ x = _incPerm(x); const d = _incDii(x); if(d && d.iso <= EC103) return null;
    const anos = x.tot && x.tot.comum ? Math.floor((d ? x.totEm(d.iso) : x.tot).comum/365) : x.ct ? Math.floor((d ? carenciaAte(x, d.iso) : x.ct.carencia)/12) : null;
    return anos==null ? null : 60 + 2*Math.max(0, anos - (x.sx==="F" ? 15 : 20)); }
  const _incReais = v => `R$ ${Math.round(Math.abs(v)).toLocaleString("pt-BR")}`, _incDifR = v => `R$ ${(Math.round(Math.abs(v)/10)*10).toLocaleString("pt-BR")}`;
  function _incCompara(x, coef){ const au = _incAuxAtivo(x); if(!au || !au.valor || !au.valor.v) return null;
    if(au.at.especie==="91") coef = 100; else if(coef==null) coef = _incCoef(x); if(coef==null) return null;
    const apo = au.valor.v / 0.91 * coef / 100; return {au, aux:au.valor.v, apo, dif:apo - au.valor.v, menos: apo < au.valor.v - 1}; }
  const _incTroca92 = x => { const b = _incAtivos(x).find(b=>b.especie==="32"); return b && ((x.fd.cats||[]).length || _incTrab(x)) ? b : null; };
  // F235 · o vínculo de emprego aberto, sem salário depois do auxílio cortado há menos de 90 dias: se a empresa recusou a volta, é o limbo
  function _incLimbo(x, corte){
    if(!corte || corte < _incSoma(x.hoje, -90) || corte >= x.hoje) return null;
    const v = ((x.g||{}).vinculos||[]).find(v=>v.aberto && !v.fim && _incCatDe(v.tipo)==="emp");
    if(!v || (v.ultRemun && chaveComp(v.ultRemun) > ymDe(corte))) return null;
    return {v, onde:tituloOrgao(v.origem||"empresa"), ate:_incSoma(corte, 30)};
  }
  // F235 · o auxílio que virou aposentadoria por invalidez (B32 ou B92 logo depois) não foi cortado: foi convertido
  const _incConvertido = (x, b) => (x.benefCnis||[]).some(z=>/^(32|92)$/.test(String(z.especie)) && z.de && b.ate && Math.abs(Date.parse(z.de) - Date.parse(b.ate)) <= 60*864e5);
  const _incCorte = x => { const ces = (x.benefCnis||[]).filter(b=>/^(31|91)$/.test(b.especie) && b.ate && !b.ativo && !_incConvertido(x, b)).sort((a, b)=>a.ate < b.ate ? -1 : 1).pop();
    const l = _incLaudo(x, "dcb"), dcbL = l && isoBr(l.dcb||""); return [dcbL, ces && ces.ate].filter(d=>d && d < x.hoje).sort().pop() || null; };
  const _incLimboTxt = (x, lb) => `Vínculo aberto em ${lb.onde}: se a empresa não aceitou a volta, é limbo (o INSS diz que pode trabalhar e a empresa diz que não). Não peça a baixa do vínculo. ${x.sx==="F" ? "Ela" : "Ele"} deve se apresentar por escrito à empresa até ${fmtBarra(lb.ate)} (30 dias do corte; regra a conferir pelo advogado) e guardar o atestado de inapto do médico da empresa. Avise o advogado hoje: os salários do período são questão trabalhista.`;
  // ── campos novos (o aci_categoria ganha o empregado doméstico; aci_tipo serve ao acidentário e ao B36) ──
  const CAMPOS = {
    inc_dat:["Último dia trabalhado (início do afastamento)", "date"],
    inc_atividade:["Atividade habitual (o que faz no trabalho)", "text"],
    inc_did:["Início da doença (DID)", "date"],
    inc_isencao:["Motivo da dispensa de carência", "select", ["","Nenhuma","Acidente de qualquer natureza","Doença profissional ou do trabalho","Doença da lista (art. 151)","Gestação de alto risco","Segurado especial (12 meses rurais)"]],
    inc_docs:["O atestado tem data, CID ou doença por extenso, dias de afastamento, assinatura e CRM", "select", SN],
    inc_prisao:["Preso", "select", ["","Não","Regime fechado","Semiaberto","Aberto"]],
    inc_reab:["Pode ser reabilitado para outra profissão", "select", ["","Não","Sim","Em reabilitação","Reabilitação frustrada"]],
    inc_terceiro:["Precisa de ajuda permanente de outra pessoa (acréscimo de 25 %)", "select", SN],
    inc_dii_perm:["Data em que a incapacidade passou a ser permanente", "date"],
    aci_tipo:["Tipo do acidente", "select", ["","Típico (no trabalho)","Trajeto casa-trabalho","Doença profissional ou do trabalho","Concausa","Trânsito fora do trabalho","Acidente em casa","Lazer ou esporte","Agressão","Outro acidente","Doença sem acidente"]],
    aci_cnae:["CNAE do empregador na data", "text"],
    aci_ntep:["O CID combina com o CNAE da empresa (NTEP)", "select", ["","Sim","Não","Não conferido"]],
    aci_vinculo:["Empregador na data do acidente", "text"],
    aci_categoria:["Categoria na data", "select", ["","Empregado","Empregado doméstico","Avulso","Segurado especial","Contribuinte individual","Facultativo"]],
    aci_consolidacao:["Data da consolidação (fim do tratamento)", "date"],
    aci_dcb31:["Fim do auxílio por incapacidade que veio antes (DCB)", "date"],
    aci_atividade:["Atividade na data do acidente", "text"],
    aci_reducao:["A sequela reduz a capacidade para essa atividade", "select", ["","Sim","Sim, com maior esforço","Não reduz"]],
    aci_anexo3:["Quadro do Anexo III (a tabela é só exemplo: fora dela também dá direito)", "select", ["","Quadro 1 (visão)","Quadro 2 (audição)","Quadro 3 (fala)","Quadro 4 (prejuízo estético)","Quadro 5 (perda de parte de membro)","Quadro 6 (movimento das articulações)","Quadro 7 (encurtamento da perna)","Quadro 8 (força ou função dos membros)","Quadro 9 (outros órgãos e sistemas)","Fora do Anexo III"]],
    aci_readaptado:["Mudou de função por readaptação preventiva da empresa", "select", SN],
    aci_docs:["Documento médico que prova o acidente e a sequela (análise documental prévia)", "select", SN],
  };
  const BASE_QUAL = "Lei 8.213/91, art. 15, I, II, VI e §§ 1º, 2º e 4º; IN 128/2022, arts. 184 e 335, § 2º";
  const BASE_ISEN = "Lei 8.213/91, arts. 26, II e III, 39, I, e 151; Decreto 3.048/99, art. 30, III, IV, §§ 1º e 2º; IN 128/2022, art. 196, II; Portaria Interministerial MPS/MS 15/2026, art. 1º";

  // F235 · os campos que o dossiê já responde: o painel mostra o valor e a fonte ao lado do campo vazio
  const _INC_PRE = {
    inc_dii: x=>{ const l = _incLaudo(x, "dii"); return l ? {val:l.dii, fonte:`do ${_incFonteL(l)}`} : null; },
    inc_did: x=>{ const l = _incLaudo(x, "did"); return l ? {val:l.did, fonte:`do ${_incFonteL(l)}`} : null; },
    inc_cid: x=>{ const l = _incLaudo(x, "cid"); return l ? {val:`${l.cid}${l.cidDesc ? ` (${l.cidDesc.toLowerCase()})` : ""}`, fonte:`do ${_incFonteL(l)}`} : null; },
    inc_dcb: x=>{ const l = _incLaudo(x, "dcb"); return l ? {val:l.dcb, fonte:`do ${_incFonteL(l)}`} : null; },
    inc_atividade: x=>x.c && x.c.profissao ? {val:x.c.profissao, fonte:"da profissão no cadastro"} : null,
  };
  // F235 · o que dá para fazer agora no auxílio: com o benefício cortado, as três saídas com data; sem benefício, o pedido e o prazo
  function _incAgora31(x, a){
    const ces = (x.benefCnis||[]).filter(b=>/^(31|91)$/.test(b.especie) && b.ate && !b.ativo).sort((a, b)=>a.ate < b.ate ? -1 : 1).pop();
    const l = _incLaudo(x, "dcb"), dcbL = l && isoBr(l.dcb||""), corte = [dcbL, ces && ces.ate].filter(d=>d && d < x.hoje).sort().pop();
    const at = _incAtivos(x).find(b=>/^(31|91)$/.test(b.especie));
    // F236 · o caso já tem pedido próprio, feito mais de 60 dias depois do último corte (ou sem corte): vale o que aconteceu com
    // ESSE pedido. O auxílio antigo cessado não é corte a restabelecer: a petição inicial de um B31 negado em 08/2026 recebia o
    // roteiro de devolver o auxílio cessado em 01/2026, e o pedido ainda em análise recebia "pedir já"
    const kc = x.caso && x.caso.der && !ehPreCaso(x.caso) ? x.caso : null;
    if(kc && !at && (!corte || kc.der > _incSoma(corte, 60))){
      const dec = decisaoDoInss(kc), ped = `O pedido de ${fmtBarra(kc.der)}`;
      if(dec && dec.resultado==="indeferido"){
        const neg = `${ped} foi negado${dec.data ? ` em ${fmtBarra(dec.data)}` : ""}`, rec = recorrerAte(kc);
        // F236 · negado com vínculo de emprego aberto: o risco de limbo (o INSS diz que pode trabalhar; a empresa pode dizer que não)
        const lb = _incLimbo(x, dec.data), limbo = lb ? [_incLimboTxt(x, lb).replace("30 dias do corte", "30 dias da decisão")] : [];
        // F236 · o empregado que pediu até o 30º dia do afastamento tem o auxílio desde o 16º dia, e não desde a DER (Lei 8.213, art. 60)
        const ib = _incDib(x, false), desde = ib && ib.emp && ib.dib && kc.der <= ib.prazo ? ib.dib : kc.der;
        const desdeTxt = `${fmtBarra(desde)}${desde !== kc.der ? " (o 16º dia do afastamento: o pedido foi feito até o 30º dia; Lei 8.213, art. 60)" : ""}`;
        if(kc.fase==="peticao_inicial") return [`${neg}, e a via escolhida é a ação na Justiça Federal: a inicial pede o auxílio desde ${desdeTxt}, com perícia judicial. Leve a ela o laudo do INSS e os relatórios médicos desde a incapacidade.`, ...limbo];
        if(kc.fase==="judicial") return [`${neg}: a ação na Justiça Federal pede o auxílio desde ${desdeTxt}, e o que decide é a perícia judicial.`, ...limbo];
        return [rec ? `${neg}: recorrer à Junta de Recursos até ${fmtBarra(rec)} (${faltamTxt(rec)}) ou entrar com a ação na Justiça Federal; a ação faz desistir do recurso (Lei 8.213/91, art. 126, § 3º).`
          : `${neg}, e o prazo do recurso passou: o caminho é a ação na Justiça Federal ou um pedido novo, que paga só desde ele.`, ...limbo, "A escolha entre recurso, ação e pedido novo é do advogado."];
      }
      if(!dec && kc.fase==="inss") return [`${ped} está em análise no INSS${(kc.protocolos||[]).length ? ` (protocolo ${kc.protocolos[0]})` : ""}: acompanhe a perícia e a decisão. Negado, cabe recurso à Junta de Recursos em 30 dias da ciência ou a ação na Justiça Federal.`];
    }
    if(corte){
      const volta = fmtBarra(diaSeguinte(corte)), out = [];
      const rec = (x.c ? prazosDoDossie(x.c) : []).find(p=>/incapacidade|prorroga|aux[íi]lio/i.test(p.texto));
      const pediu = (x.fd.processos||[]).some(p=>/prorroga|incapacidade|aux[íi]lio/i.test(p.servico||"") && isoBr(p.entrada||"") >= somarMeses(corte, -1));
      const novo = _incSoma(corte, 30), rest = _incSoma(corte, 60);
      const capaz = (x.fd.processos||[]).some(p=>/prorroga/i.test(p.servico||"") && ((p.comunicacoes||[]).slice(-1)[0]||{}).contra);
      // F235 · o auxílio anterior concedido por perícia admite o pedido só com atestado desde o dia seguinte ao corte (Portaria Conjunta 13/2026, art. 6º, III)
      const porPericia = (x.fd.laudos||[]).some(l=>l.resultado==="incapaz" && !/documental/i.test(l.tipo||""));
      const mental = /^F\d/i.test(String(x.v.inc_cid || (_incLaudo(x, "cid")||{}).cid || ""));
      const r347 = x.hoje <= rest ? `Pela mesma doença, com o novo benefício começando até ${fmtBarra(rest)}, o INSS restabelece o anterior e paga desde ${volta} (IN 128, art. 347); depois disso, paga só desde o pedido.`
        : "Passados 60 dias do corte, o pedido novo paga só desde ele.";
      const peric = x.hoje < novo ? `Pedido novo com perícia: a partir de ${fmtBarra(novo)} (30 dias depois do corte, IN 128, art. 346; a Portaria Conjunta 13/2026 aceita antes: conferir).` : "Pedido novo com perícia: já pode ser feito.";
      const lb = _incLimbo(x, corte);
      if(rec || pediu){
        if(rec) out.push(`Recorrer ao CRPS até ${fmtBarra(rec.fatal)} (${faltamTxt(rec.fatal)}): se ganhar, o auxílio volta desde ${volta}.`);
        out.push(`Entrar com a ação na Justiça Federal: também pode devolver o auxílio desde ${volta}, com perícia judicial; a ação faz desistir do recurso (Lei 8.213/91, art. 126, § 3º).`, r347, peric);
        if(capaz) out.push(`Pedido só com atestado (Atestmed): fechado até ${fmtBarra(_incSoma(corte, 180))}, porque a perícia negou a prorrogação (Portaria Conjunta 13/2026, art. 6º, V).`);
        if(lb) out.push(_incLimboTxt(x, lb));
        out.push("A escolha entre recurso, ação e pedido novo é do advogado.");
        return out;
      }
      // F235 · sem pedido de prorrogação, o corte na data marcada não gera decisão para recorrer: o caminho é o pedido novo, e o só com atestado vem primeiro
      if(porPericia && !capaz) out.push(`Pedido só com atestado (Atestmed): já pode, desde ${volta}, porque o auxílio anterior veio de perícia (Portaria Conjunta 13/2026, art. 6º, III). Faça pelo Meu INSS, pela mesma doença, com o relatório médico de depois do corte${mental ? "; nos transtornos mentais o pedido só com atestado tem risco alto de negativa: o relatório precisa trazer os sintomas, os remédios e a tentativa de volta ao trabalho" : ""}.`);
      out.push(r347, `Não houve pedido de prorrogação antes do corte (${fmtBarra(corte)}): não há decisão para recorrer, e a ação sem pedido ao INSS tende a ser extinta (Tema 277 TNU, conferir). O caminho é o pedido novo.`, peric);
      if(lb) out.push(_incLimboTxt(x, lb));
      return out;
    }
    if(at){ const dcb = (l && dcbL >= x.hoje && dcbL) || at.ate;
      return dcb ? [`Recebe o auxílio${_incNb(at)} até ${fmtBarra(dcb)}. A prorrogação se pede nos últimos 15 dias, de ${fmtBarra(_incSoma(dcb, -14))} até ${fmtBarra(dcb)}, com relatório médico atual.`] : []; }
    // F235 · sem qualidade no dia em que ficou incapaz: o que procurar antes de pedir, e o que não resolve
    const sq = _incSemQual(x, a);
    if(sq){ const grave = a && a.rs.some(r=>r.id==="isencao_carencia" && /lista|grave|neoplasia|c[âa]ncer/i.test(r.txt||"")) || (x.clin||[]).some(i=>i.grave);
      return [`Procure relatório, consulta, receita ou exame que mostre que já não conseguia trabalhar antes de ${fmtBarra(sq.perda)}: o exame que só mostra a doença não basta.`,
        ...(sq.desemp ? [`Pergunte pelo desemprego: com registro no SINE ou seguro-desemprego até ${fmtBarra(sq.ate)}, a cobertura cresce 12 meses e o pedido sai.`] : []),
        "Voltar a pagar agora não resolve: a incapacidade já existe (Lei 8.213/91, art. 59, § 1º).",
        ...(grave ? ["A doença grave dispensa as 12 contribuições, mas não a cobertura do INSS."] : []),
        ...((x.ops||[]).some(o=>o.o==="def") || x.cad ? ["Veja o BPC da pessoa com deficiência, que não pede contribuição."] : [])]; }
    const b = _incDib(x);
    if(b && x.hoje <= b.prazo) return [`Pedir já pelo Meu INSS, até ${fmtBarra(b.prazo)}: ${b.quem}. Depois, o benefício começa só na data do pedido.`,
      "Com atestado completo de até 30 dias de repouso (90 pela Portaria Conjunta 14/2026), dá para pedir só com o documento (Atestmed); acima disso, com perícia.",
      // F235 · a doença causada ou piorada pelo serviço é do trabalho: outra espécie (B91) e 12 meses de estabilidade
      ...(b.emp && !(x.fd.cats||[]).length ? ["Pergunte se o serviço causou ou piorou a doença: sendo do trabalho, o benefício é o acidentário (B91), com 12 meses de estabilidade no emprego depois (Lei 8.213/91, art. 118); o advogado decide."] : [])];
    return b ? [`Pedir pelo Meu INSS: passado o prazo de ${fmtBarra(b.prazo)}, o benefício começa na data do pedido.`] : [];
  }
  // ═══ b31 · auxílio por incapacidade temporária ═══
  registrarReq("b31", [
    {id:"qualidade_na_dii", rot:"No dia em que ficou incapaz, a pessoa ainda estava segurada pelo INSS?", base:BASE_QUAL, conf:"conferido", campos:["inc_dii"],
     mede:x=>{ const d = _incDii(x); if(!d) return {est:"informar", txt:"informe a DII (ou traga o laudo da perícia)"};
       const q = _incQualDii(x, d), sn = q.est==="ok" ? "Sim. " : q.est==="risco" ? "Não. " : "";
       return {...q, txt:`${sn}DII ${fmtBarra(d.iso)}: ${q.txt}${d.outra}${_incProvaAntes(x, d, q)}`, fonte: q.fonte ? `${q.fonte}; DII do ${d.fonte}` : d.fonte}; }},
    {id:"carencia_12", rot:"Tem pelo menos 12 contribuições antes de ficar incapaz?", base:"Lei 8.213/91, art. 25, I; IN 128/2022, arts. 193 e 196, I", conf:"conferido", campos:[],
     mede:_incMedeCar},
    {id:"carencia_reingresso_27a", rot:"Se perdeu a qualidade e voltou a contribuir, já tem 6 contribuições desde a volta?", base:"Lei 8.213/91, art. 27-A (red. Lei 13.846/2019); IN 128/2022, art. 200", conf:"conferido", campos:[],
     mede:x=>{ if(!x.ct) return {est:"informar", txt:"o CNIS não foi lido"};
       if(!(x.hist||[]).length) return {est:"informar", txt:"sem a história da qualidade: não sei se houve perda"};
       const d = _incDii(x), fato = d ? d.iso : x.der, c = _incCar(x, fato);
       if(!c.re){ const q = _incQual(x, fato);
         return q.est==="risco" ? {est:"info", txt:`perdeu a qualidade e não voltou a pagar antes de ${fmtBarra(fato)}: voltar a pagar agora não dá este benefício, porque a incapacidade já existe (art. 59, § 1º)`, fonte:"CNIS"}
           : {est:"info", txt:`não perdeu a qualidade antes de ${fmtBarra(fato)}: a regra da volta (art. 27-A) não se aplica`, fonte:"CNIS"}; }
       const disp = _incDispensa(x, fato); if(disp && disp.est==="ok") return {est:"info", txt:`carência dispensada (${disp.txt}): o art. 27-A não pesa`, fonte:disp.fonte};
       const txt = `${c.novas} ${c.novas===1?"contribuição":"contribuições"} desde a volta em ${_incYmBr(c.re)} até ${d ? "a DII" : "a DER"} (${_incYmBr(ymDe(fato))}); exige 6`;
       if(fato < "2019-06-18") return {est:"informar", txt:`${txt}, mas o fato é anterior a 18/06/2019: vale a fração da norma da época (MP 767/2017, Lei 13.457/2017, MP 871/2019)`, fonte:"CNIS"};
       if(c.novas >= 6) return d ? {est:"ok", txt, fonte:"CNIS"} : {est:"informar", txt:`${txt}. Informe a DII: só conta até ela`, fonte:"CNIS"};
       return {est:"falta", txt, fonte:"CNIS"}; }},
    {id:"isencao_carencia", rot:"Está dispensado das 12 contribuições?", base:BASE_ISEN, conf:"conferido", campos:["inc_isencao"], mede:_incMedeIsencao},
    {id:"incapacidade_15_dias", rot:"Ficou sem conseguir fazer o seu trabalho de sempre por mais de 15 dias seguidos?", base:"Lei 8.213/91, arts. 59 e 60, § 6º; IN 128/2022, arts. 335, caput e § 4º, 337, 339, § 2º, e 342", conf:"conferido", campos:["inc_atividade","inc_tipo","inc_cid"],
     mede:x=>{ const l = _incLaudo(x, "resultado"), ativ = x.v.inc_atividade ? ` para ${x.v.inc_atividade}` : "";
       // F235 · benefício cortado (o CNIS o dá por cessado, ou veio negativa depois do laudo): o que se prova é a incapacidade DEPOIS do corte,
       // e vem antes do "concluiu capaz" da perícia da prorrogação, que é justamente o que se ataca
       const dcbL = l && l.resultado==="incapaz" && isoBr(l.dcb||""), ces = (x.benefCnis||[]).filter(b=>/^(31|91)$/.test(b.especie) && b.ate && !b.ativo).sort((a, b)=>a.ate < b.ate ? -1 : 1).pop();
       const corte = dcbL && dcbL < x.hoje ? dcbL : ces && ces.ate < x.hoje ? ces.ate : null;
       const negou = corte && (x.fd.processos||[]).find(p=>{ const dc = (p.comunicacoes||[]).slice(-1)[0]; return dc && dc.contra && /incapacidade|prorroga|aux[íi]lio|doen[çc]a/i.test(p.servico||"") && isoBr(p.entrada||"") >= ((l && isoBr(l.exame||"")) || (ces && ces.de) || ""); });
       const novo = corte && (x.clin||[]).filter(i=>i.tipo==="Relatório" && i.data && i.data > corte).sort((a, b)=>String(a.data).localeCompare(String(b.data))).pop();
       if(corte && (negou || ces)) return {est:"provar", txt:`O INSS reconheceu a incapacidade até ${fmtBarra(corte)}${negou ? ` e negou a continuação${negou.atualizado ? ` em ${negou.atualizado}` : ""}` : ""}. ${novo ? `O ${_clinFonte(novo)} diz que ela continua: leve-o ao recurso, à ação ou ao pedido novo` : `Falta provar que ela continua: peça relatório médico com data depois de ${fmtBarra(corte)}, dizendo por que não consegue ${x.v.inc_atividade ? `trabalhar como ${x.v.inc_atividade}` : "trabalhar"}`}`, fonte: novo ? _clinFonte(novo) : l ? _incFonteL(l) : `CNIS: B${ces.especie}${_incNb(ces)}`};
       if(l && l.resultado==="capaz") return {est:"risco", txt:`a perícia de ${l.exame || l.dii} concluiu capaz${ativ}: a prova é o relatório médico com o tempo de afastamento`, fonte:_incFonteL(l)};
       const d = _incDii(x), dcb = l && l.resultado==="incapaz" && isoBr(l.dcb||"") || x.v.inc_dcb, ini = l && isoBr(l.dii||"") || (d && d.iso);
       if(ini && dcb){ const n = _incDias(ini, dcb) + 1;
         return n > 15 ? {est:"ok", txt:`incapaz${ativ} de ${fmtBarra(ini)} a ${fmtBarra(dcb)} (${n} dias)`, fonte: l ? _incFonteL(l) : "campo"}
           : {est:"falta", txt:`só ${n} dias de incapacidade (${fmtBarra(ini)} a ${fmtBarra(dcb)}); exige mais de 15`, fonte: l ? _incFonteL(l) : "campo"}; }
       if(l && l.resultado==="incapaz") return {est:"ok", txt:`a perícia reconheceu a incapacidade${l.grau ? ` (${l.grau.toLowerCase()})` : ""}${ativ}`, fonte:_incFonteL(l)};
       if(x.v.inc_tipo==="Permanente") return {est:"ok", txt:`incapacidade permanente${ativ}: passa de 15 dias`, fonte:"campo"};
       // F235 · sem laudo do INSS, o relatório do médico que diz desde quando não consegue trabalhar responde; com mais de 90 dias, pede-se um atual
       const cl = _clinMais(x, "desde") || _clinMais(x, "afast");
       if(cl){ const ini = cl.fatos.desde || cl.fatos.afast.ini, velho = cl.data && cl.data < _incSoma(x.hoje, -90);
         const txt = `o ${_clinFonte(cl)} diz que não consegue trabalhar${ativ} desde ${fmtBarra(ini)}${/indeterminad/i.test(cl.resumo||"") ? ", por tempo indeterminado" : ""}`;
         return velho ? {est:"provar", txt:`${txt}, mas tem mais de 90 dias: peça um atestado atual, com a data, o CID, os dias de afastamento, a assinatura e o CRM do médico`, fonte:_clinFonte(cl)}
           : {est:"ok", txt, fonte:_clinFonte(cl)}; }
       return {est:"informar", txt:`traga o relatório médico com a DII e o tempo de afastamento previsto${x.v.inc_atividade ? "" : "; informe a atividade habitual"}`}; }},
    {id:"preexistencia", rot:"A doença começou depois que a pessoa passou a contribuir?", base:"Lei 8.213/91, art. 59, § 1º (red. Lei 13.846/2019); IN 128/2022, art. 335, § 1º", conf:"conferido", campos:["inc_did"],
     mede:x=>_incMedePreex(x, "art. 59, § 1º")},
    {id:"prazo_30_dias_dib", rot:"O pedido foi feito em até 30 dias do afastamento?", base:"Lei 8.213/91, art. 60, caput e § 1º; IN 128/2022, art. 336", conf:"conferido", campos:["inc_dat","der"],
     mede:x=>{ const d0 = _incDii(x), pago = (x.benefCnis||[]).filter(b=>/^(31|91)$/.test(b.especie) && b.de && b.ate && !b.ativo).sort((a, b)=>a.ate < b.ate ? -1 : 1).pop();
       // F235 · o auxílio já pago e cortado: a prorrogação negada não é pedido novo, e os 30 dias não contam contra ele
       if(pago && (!d0 || d0.iso <= pago.ate)){ const pr = (x.fd.processos||[]).find(p=>/prorroga/i.test(p.servico||""));
         // F235 · o pedido novo pela mesma doença, começando até 60 dias do corte, restabelece o anterior (IN 128, art. 347)
         const r60 = _incSoma(pago.ate, 60);
         // F235 · o auxílio que virou aposentadoria por invalidez não foi cortado
         const conv = (x.benefCnis||[]).find(z=>/^(32|92)$/.test(String(z.especie)) && z.de && Math.abs(Date.parse(z.de) - Date.parse(pago.ate)) <= 60*864e5);
         if(conv) return {est:"info", txt:`Não se aplica: o auxílio foi pago de ${fmtBarra(pago.de)} a ${fmtBarra(pago.ate)} e virou aposentadoria por invalidez em ${fmtBarra(conv.de)}: não houve corte, e o pedido é sobre a aposentadoria`, fonte:"CNIS"};
         return {est:"info", txt:`Não se aplica: o auxílio foi pago de ${fmtBarra(pago.de)} a ${fmtBarra(pago.ate)}${pr ? `, e o pedido de ${pr.entrada} foi de prorrogação` : ""}. Se o recurso ou a ação devolverem o auxílio, os atrasados contam de ${fmtBarra(diaSeguinte(pago.ate))}; ${x.hoje <= r60 ? `um pedido novo pela mesma doença, começando até ${fmtBarra(r60)}, também restabelece o auxílio desde ${fmtBarra(diaSeguinte(pago.ate))} (IN 128, art. 347); depois disso, paga só desde o pedido` : "passados 60 dias do corte, um pedido novo paga só desde ele"}`, fonte:`CNIS: B${pago.especie}${_incNb(pago)}`}; }
       const b = _incDib(x); if(!b) return {est:"informar", txt:"informe a DII ou o último dia trabalhado"};
       const fonte = b.k ? (b.k.fonte==="campo" ? "campo" : "CNIS") : "campo";
       if(b.der){ if(b.d && b.d.iso > b.der.iso) return {est:"ok", txt:`a DII (${fmtBarra(b.d.iso)}) é posterior ao pedido: DIB na DII`, fonte:b.der.fonte};
         return b.der.iso <= b.prazo ? {est:"ok", txt:`pedido em ${fmtBarra(b.der.iso)}, no prazo; ${b.quem}`, fonte:b.der.fonte}
           : {est:"info", txt:`pedido em ${fmtBarra(b.der.iso)}, depois de ${fmtBarra(b.prazo)}: DIB na DER, sem os dias de ${fmtBarra(b.dib)} a ${fmtBarra(b.der.iso)} (o direito não se perde)`, fonte:b.der.fonte}; }
       return x.hoje <= b.prazo ? {est:"risco", txt:`prazo correndo: pedir até ${fmtBarra(b.prazo)}; ${b.quem}`, fonte, quando:b.prazo}
         : {est:"info", txt:`o prazo de 30 dias terminou em ${fmtBarra(b.prazo)}: a DIB será a DER; ${b.quem}`, fonte}; }},
    {id:"documentos_analise_documental", rot:"Tem atestado ou relatório médico recente para pedir só com o documento, sem perícia (Atestmed)?", base:"Lei 8.213/91, art. 60, §§ 11-A, 11-F, 11-G e 11-I (Lei 15.265/2025); Portaria Conjunta MPS/INSS 13/2026, arts. 2º, 3º, § 2º, e 8º, com a redação da Portaria Conjunta 54/2026; Portaria Conjunta 14/2026, art. 2º; Portaria Conjunta 43/2026, art. 1º", conf:"divergente", campos:["inc_docs","inc_dcb"],
     mede:x=>{ const div = {inss:"Portarias Conjuntas 14/2026 e 43/2026: até 90 dias somados por análise documental (ampliação prorrogada por 365 dias; data final não conferida)", judicial:"Lei 8.213/91, art. 60, § 11-F (Lei 15.265/2025): no máximo 30 dias somados"};
       // F235 · a prorrogação negada por parecer contrário fecha o pedido só com atestado por 180 dias do corte (Portaria Conjunta 13/2026, art. 6º, V)
       const corte = _incCorte(x), negP = corte && (x.fd.processos||[]).some(p=>/prorroga/i.test(p.servico||"") && ((p.comunicacoes||[]).slice(-1)[0]||{}).contra);
       if(negP && x.hoje < _incSoma(corte, 180)) return {est:"info", txt:`não se aplica até ${fmtBarra(_incSoma(corte, 180))}: a prorrogação foi negada por parecer contrário, e o pedido só com atestado fica fechado por 180 dias do corte (Portaria Conjunta 13/2026, art. 6º, V)`, fonte:"dossiê"};
       if(x.v.inc_docs==="Não") return {est:"falta", txt:"o atestado precisa de documento com foto, data de emissão, CID ou diagnóstico por extenso, assinatura e registro do médico", fonte:"campo"};
       if(x.v.inc_docs!=="Sim") return {est:"informar", txt:"pergunte se há atestado recente; se houver, confira a data, o CID ou a doença por extenso, os dias de afastamento, a assinatura e o CRM do médico"};
       const d = _incDii(x), n = d && x.v.inc_dcb ? _incDias(d.iso, x.v.inc_dcb) + 1 : null;
       if(n==null) return {est:"divergente", txt:"atestado completo; o repouso cabe na análise documental até 30 dias pela lei ou 90 pela Portaria Conjunta 14/2026", fonte:"campo", div};
       if(n <= 30) return {est:"ok", txt:`atestado completo e repouso de ${n} dias: cabe na análise documental nas duas regras`, fonte:"campo"};
       if(n <= 90) return {est:"divergente", txt:`repouso de ${n} dias: a via administrativa aceita até 90 dias somados, a lei fala em 30`, fonte:"campo", div};
       return {est:"info", txt:`repouso de ${n} dias, acima de 90: vai à perícia (presencial ou por telemedicina)`, fonte:"campo"}; }},
    {id:"prorrogacao_novo_pedido", rot:"Se já recebe ou recebeu, ainda dá para pedir prorrogação ou um novo pedido?", base:"IN 128/2022, arts. 339, § 3º (red. IN 212/2026), 340, 346 e 347; Portaria Conjunta 13/2026, arts. 6º, I, III a VIII, 8º-A e 9º, com a redação da Portaria Conjunta 54/2026", conf:"conferido", campos:["inc_dcb"],
     mede:x=>{ const l = _incLaudo(x, "dcb"), lr = _incLaudo(x, "resultado"), at = _incAtivos(x).find(b=>/^(31|91)$/.test(b.especie));
       // F235 · a DCB presumida do relatório (fim do afastamento) só vale com benefício em curso: sem ele, é pedido novo
       const dcbDig = (x.vDig||x.v).inc_dcb, dcbAt = dcbDig || (l && isoBr(l.dcb)) || (at && at.ate) || (at ? x.v.inc_dcb : null) || null, fonteD = dcbDig ? "campo" : l && l.dcb ? _incFonteL(l) : "CNIS";
       if(!dcbAt && at) return {est:"informar", txt:`recebe B${at.especie}${_incNb(at)} sem DCB lida: informe a DCB, porque a prorrogação se pede nos últimos 15 dias do benefício`, fonte:"CNIS"};
       // "nos últimos quinze dias do benefício" (IN 128, art. 339, § 3º, red. IN 212/2026): da DCB menos 14 até a DCB
       if(dcbAt && dcbAt >= x.hoje){ const abre = _incSoma(dcbAt, -14);
         return x.hoje < abre ? {est:"info", txt:`DCB em ${fmtBarra(dcbAt)}: a prorrogação se pede de ${fmtBarra(abre)} até a DCB (IN 128, art. 339, § 3º)`, fonte:fonteD, quando:abre}
           : {est:"risco", txt:`prazo correndo: pedir a prorrogação até a DCB, ${fmtBarra(dcbAt)} (IN 128, art. 339, § 3º); doença diferente vira pedido novo, com carência (art. 340)`, fonte:fonteD, quando:dcbAt}; }
       const ces = (x.benefCnis||[]).filter(b=>/^(31|91)$/.test(b.especie) && b.ate && !b.ativo && !_incConvertido(x, b)).map(b=>b.ate).sort().pop();
       const fim = [dcbAt, ces].filter(Boolean).sort().pop() || (lr && lr.resultado==="capaz" && isoBr(lr.exame||"")) || null;
       if(!fim) return {est:"info", txt:"sem benefício anterior: é pedido novo, não prorrogação"};
       const pode = _incSoma(fim, 30), rest = _incSoma(fim, 60), fonte = dcbAt ? fonteD : ces ? "CNIS" : _incFonteL(lr);
       const neg = lr && lr.resultado==="capaz" ? `a perícia de ${lr.exame || "data não lida"} concluiu capaz (recurso em 30 dias da ciência); ` : "";
       // F235 · só o inciso que vale para o caso: a prorrogação negada (V), o anterior concedido por perícia (III) ou por análise documental (I)
       const negP = (x.fd.processos||[]).some(p=>/prorroga/i.test(p.servico||"") && ((p.comunicacoes||[]).slice(-1)[0]||{}).contra) || (lr && lr.resultado==="capaz");
       const porPericia = (x.fd.laudos||[]).some(l=>l.resultado==="incapaz" && !/documental/i.test(l.tipo||""));
       const trava = negP ? `; pedido só com atestado (análise documental) apenas a partir de ${fmtBarra(_incSoma(fim, 180))}, porque a prorrogação foi negada por parecer contrário (Portaria Conjunta 13/2026, art. 6º, V)`
         : porPericia ? `; pedido só com atestado (análise documental) já cabe desde o dia seguinte ao corte (${fmtBarra(diaSeguinte(fim))}), porque o auxílio anterior veio de perícia (Portaria Conjunta 13/2026, art. 6º, III)`
         : `; pedido só com atestado (análise documental) desde o dia seguinte ao corte (${fmtBarra(diaSeguinte(fim))}), se não passou o prazo máximo da análise documental (Portaria Conjunta 13/2026, art. 6º, I)`;
       if(x.hoje < pode) return {est:"info", txt:`${neg}novo pedido com perícia só a partir de ${fmtBarra(pode)}, 30 dias depois de ${fmtBarra(fim)} (IN 128, art. 346)${trava}`, fonte, quando:pode};
       return {est:"ok", txt:`${neg}novo pedido já pode ser feito (passaram 30 dias de ${fmtBarra(fim)})${x.hoje <= rest ? `; pela mesma doença até ${fmtBarra(rest)}, restabelece o benefício anterior (IN 128, art. 347)` : ""}${trava}`, fonte}; }},
    {id:"vedacoes_acumulacao", rot:"A pessoa já recebe algo que impede este benefício?", base:"Lei 8.213/91, art. 124, I e IV e parágrafo único; IN 128/2022, arts. 341 e 356", conf:"conferido", campos:[],
     mede:x=>_incMedeVed(x, "b31")},
    {id:"recluso_regime_fechado", rot:"Atendimento por familiar: o segurado está preso em regime fechado?", base:"Lei 8.213/91, art. 59, §§ 2º a 8º; IN 128/2022, art. 338", conf:"conferido", campos:["inc_prisao"],
     mede:x=>{ const p = x.v.inc_prisao, d = _incDii(x);
       if(!p) return {est:"info", txt:"só se pergunta quando quem atende é familiar: o segurado preso em regime fechado não recebe"};
       const antes = d && d.iso < "2019-01-18" && /fechado|Semiaberto/.test(p) ? `${p.toLowerCase()} e DII anterior a 18/01/2019 (MP 871/2019): a vedação do art. 59, § 2º, não alcança, mas se os dependentes recebem auxílio-reclusão não acumula; opte pelo mais vantajoso (IN 128, art. 338, § 6º)` : "";
       if(antes) return {est:"info", txt:antes, fonte:"campo"};
       if(p!=="Regime fechado") return {est:"ok", txt: p==="Não" ? "não está presa" : `${p.toLowerCase()}: recebe normalmente (IN 128, art. 338, § 5º)`, fonte:"campo"};
       return {est:"impedido", txt:"preso em regime fechado não recebe; quem já recebia tem o benefício suspenso por até 60 dias e depois cessado (art. 59, §§ 2º a 8º)", fonte:"campo"}; }},
  ], CAMPOS, {resumo:"Paga enquanto a pessoa não consegue fazer o seu trabalho por mais de 15 dias seguidos, desde que estivesse segurada no dia em que ficou incapaz e tenha 12 contribuições (ou seja dispensada delas).",
    agora: _incAgora31, pre: _INC_PRE,
    // F235 · sem qualidade na DII: o caso de auxílio-doença só se gera com a prova da incapacidade anterior ou o desemprego registrado
    veredito: (x, a)=>{ const sq = _incSemQual(x, a); if(!sq) return null;
      return {tom:"ainda", txt:`Ainda não. No dia em que ficou incapaz (${fmtBarra(sq.dii)}), a pessoa já não estava coberta pelo INSS: a cobertura acabou em ${fmtBarra(sq.ate)}. Só gere o caso com documento que mostre a incapacidade antes de ${fmtBarra(sq.perda)}${sq.desemp ? ` ou com desemprego registrado até ${fmtBarra(sq.ate)}` : ""}; voltar a pagar agora não resolve.`}; },
    // F235 · só no restabelecimento: o limbo do empregado que a empresa não aceitou de volta, e a prova da recusa
    soREST: [{id:"limbo_empresa", rot:"Tem carteira assinada e a empresa não aceitou a volta depois do corte?", base:"Lei 8.213/91, art. 15, II; Tema 300/TNU (em revisão no Tema 1421/STF, mérito pendente)", conf:"conferido", campos:[],
      mede:x=>{ const corte = _incCorte(x), lb = _incLimbo(x, corte);
        if(!lb) return {est:"info", txt:"sem vínculo de emprego aberto e parado depois do corte: não há limbo"};
        const rel = relatoDe(x.c), trouxe = /atestado do m[ée]dico da empresa|\bASO\b/i.test(rel) && /inapt/i.test(rel);
        return {est:"provar", txt:`vínculo aberto em ${lb.onde}, sem salário depois do corte (${fmtBarra(corte)}): se a empresa recusou a volta, é limbo, e a recusa se prova${trouxe ? `; ${x.sx==="F" ? "ela" : "ele"} trouxe o atestado de inapto do médico da empresa, guarde a cópia` : ""}: traga ${trouxe ? "" : "o atestado de inapto do médico da empresa e "}a prova de que se apresentou à empresa por escrito, por e-mail, carta com protocolo ou notificação, até ${fmtBarra(lb.ate)}; não pedir a baixa do vínculo`, fonte:"CNIS"}; }}],
    naoPedir: (x, a)=>{ const sq = _incSemQual(x, a);
      return sq ? `No dia em que ficou incapaz (${fmtBarra(sq.dii)}), a pessoa já não estava coberta pelo INSS (a cobertura acabou em ${fmtBarra(sq.ate)}): só com documento que mostre a incapacidade antes de ${fmtBarra(sq.perda)}${sq.desemp ? " ou com desemprego registrado" : ""}.` : ""; },
    // F235 · o benefício cortado: com decisão, recurso ou ação; sem ela, o pedido novo pela mesma doença; o prazo de cada saída vira tarefa
    desfecho: (x, a)=>{ const corte = _incCorte(x); if(!corte || _incSemQual(x, a)) return null;
      const volta = fmtBarra(diaSeguinte(corte)), rest = _incSoma(corte, 60), lb = _incLimbo(x, corte);
      const rec = (x.c ? prazosDoDossie(x.c) : []).find(p=>/incapacidade|prorroga|aux[íi]lio/i.test(p.texto));
      const pediu = (x.fd.processos||[]).some(p=>/prorroga|incapacidade|aux[íi]lio/i.test(p.servico||"") && isoBr(p.entrada||"") >= somarMeses(corte, -1));
      const capaz = (x.fd.processos||[]).some(p=>/prorroga/i.test(p.servico||"") && ((p.comunicacoes||[]).slice(-1)[0]||{}).contra);
      const atestado = !capaz && (x.fd.laudos||[]).some(l=>l.resultado==="incapaz" && !/documental/i.test(l.tipo||""));
      const tarefas = [...(rec ? [{titulo:"⏰ Recurso ao CRPS contra a negativa da prorrogação do auxílio-doença", prazo:rec.fatal}] : []),
        ...(x.hoje <= rest ? [{titulo:`⏰ Pedido novo pela mesma doença: começando até ${fmtBarra(rest)}, restabelece o auxílio desde ${volta} (IN 128, art. 347)`, prazo:rest}] : []),
        ...(lb ? [{titulo:"⏰ Limbo: apresentar-se por escrito à empresa (30 dias do corte; conferir com o advogado)", prazo:lb.ate}] : [])];
      if(rec || pediu) return {acao:"caso", prazo:!!rec, quando:rec ? rec.fatal : null, tarefas,
        txt:`gere o caso: ${rec ? `recorrer ao CRPS até ${fmtBarra(rec.fatal)} (${faltamTxt(rec.fatal)}) ou entrar com a ação já` : "entrar com a ação"}; a via é do advogado${x.hoje <= rest ? `. O pedido novo pela mesma doença, começando até ${fmtBarra(rest)}, também restabelece desde ${volta}` : ""}`};
      return {acao:"caso", tarefas, txt:`gere o caso: pedido novo pela mesma doença hoje${atestado ? ", só com atestado (já cabe)" : ""}; começando até ${fmtBarra(rest)}, o INSS restabelece o auxílio desde ${volta} (IN 128, art. 347)${lb ? `. Limbo: apresentar-se por escrito à empresa até ${fmtBarra(lb.ate)}` : ""}`}; }});

  // ═══ b32 · aposentadoria por incapacidade permanente ═══
  registrarReq("b32", [
    {id:"qualidade_na_dii", rot:"No dia em que ficou incapaz, a pessoa ainda estava segurada?", base:"Lei 8.213/91, art. 15; IN 128/2022, arts. 184 e 326, § 5º", conf:"conferido", campos:["inc_dii","inc_dii_perm"],
     mede:x=>{ x = _incPerm(x); const d = _incDii(x);
       if(!d) return {est:"informar", txt:"informe a DII (ou traga o laudo da perícia)"};
       const q = _incQualDii(x, d); return {...q, txt:`DII ${fmtBarra(d.iso)}: ${q.txt}${d.outra}`, fonte: q.fonte ? `${q.fonte}; DII do ${d.fonte}` : d.fonte}; }},
    {id:"carencia_12", rot:"Tem 12 contribuições antes de ficar incapaz (ou 6 desde a volta, se perdeu a qualidade)?", base:"Lei 8.213/91, arts. 25, I, e 27-A; IN 128/2022, arts. 193, 196, I, 200 e 326, § 5º", conf:"conferido", campos:[],
     mede:x=>_incMedeCar(_incPerm(x))},
    {id:"isencao_carencia", rot:"Está dispensado das 12 contribuições?", base:BASE_ISEN, conf:"conferido", campos:["inc_isencao"], mede:x=>_incMedeIsencao(_incPerm(x))},
    {id:"incapacidade_total_permanente", rot:"A pessoa não consegue fazer NENHUM trabalho que a sustente, e de forma definitiva?", base:"Lei 8.213/91, art. 42, caput, § 1º e § 1º-A (Lei 14.724/2023); IN 128/2022, arts. 326, caput e § 1º, e 327, § 2º", conf:"conferido", campos:["inc_tipo","inc_cid"],
     mede:x=>{ const l = _incLaudo(x, "resultado"), g = (l && l.grau) || "", t = x.v.inc_tipo || "";
       const outra = " (com mais de uma atividade, a incapacidade tem de alcançar todas)";
       if(l && l.resultado==="capaz") return {est:"risco", txt:`a perícia de ${l.exame || l.dii} concluiu capaz: a prova é o relatório de especialista com o prognóstico`, fonte:_incFonteL(l)};
       if(/^Total/i.test(g) && /permanente|definitiva/i.test(g)) return {est:"ok", txt:`a perícia fixou incapacidade ${g.toLowerCase()}${outra}`, fonte:_incFonteL(l)};
       if(/Parcial/i.test(g) || t==="Parcial") return {est:"falta", txt:"incapacidade parcial não dá B32: o caminho é o B31 com reabilitação, ou o auxílio-acidente", fonte: /Parcial/i.test(g) ? _incFonteL(l) : "campo"};
       if(/tempor/i.test(g) && t==="Permanente"){ const pr = (x.preUsado||{}).inc_tipo;
         return {est:"provar", txt:`a perícia do INSS (${l.exame || l.dii}) viu incapacidade temporária; ${pr ? `o ${pr.fonte.split(":")[0]} diz que é definitiva` : "o campo diz permanente"}: leve esse relatório ao pedido de prorrogação ou à perícia, para o auxílio virar aposentadoria`, fonte:_incFonteL(l)}; }
       // F235 · com o auxílio-doença em curso, a perícia diz "temporária" porque é o auxílio: a aposentadoria se prova na prorrogação, e não falta
       const au = /tempor/i.test(g) && t!=="Temporária" ? _incAuxAtivo(x) : null;
       if(au){ const lim = (x.clin||[]).filter(i=>i.tipo==="Relatório" && /permanente|definitiv|irrevers/i.test(i.resumo||"")).sort((a, b)=>String(a.data).localeCompare(String(b.data))).pop();
         // F235 · a idade, o estudo e o trabalho de sempre pesam na reabilitação: o relatório os considera (a ocupação vem da RAIS mais recente; sem parênteses, porque o pedido ao cliente corta no primeiro)
         const rr = ((x.fd||{}).rais||[]).filter(r=>r.cbo).sort((a, b)=>String(a.ano) < String(b.ano) ? -1 : 1).pop();
         const pc = `, levando em conta ${x.idade != null ? `a idade de ${x.idade} anos, ` : "a idade, "}até que série estudou e o trabalho de sempre${rr ? `: ${String(rr.cbo).toLowerCase().replace(/\s*\([^)]*\)/g, "")}, pela RAIS de ${rr.ano}` : ""}`;
         return {est:"provar", txt:`a perícia do INSS (${l.exame || l.dii}) viu incapacidade temporária, porque é o auxílio-doença em curso, e nenhum relatório diz que ela é total e definitiva${lim ? ` (o ${_clinFonte(lim)} fala em limitação permanente, mas não em incapacidade total nem na falta de reabilitação)` : ""}: peça ao médico que acompanha um relatório novo${au.dcb ? `, antes de ${fmtBarra(_incSoma(au.dcb, -14))},` : ""} que diga com estas palavras que a incapacidade é total e permanente para qualquer trabalho e que não há como reabilitar, com as limitações e os tratamentos já feitos${pc}`, fonte:_incFonteL(l)}; }
       if(/tempor/i.test(g) || t==="Temporária") return {est:"falta", txt:"incapacidade temporária é caso de B31, não de B32", fonte: g ? _incFonteL(l) : "campo"};
       if(t==="Permanente") return {est:"ok", txt:`incapacidade permanente para qualquer trabalho${outra}`, fonte:"campo"};
       return {est:"informar", txt:"traga o relatório de especialista com o prognóstico (irreversível, sem reabilitação) ou informe o tipo"}; }},
    {id:"insuscetivel_reabilitacao", rot:"Não dá para reabilitar a pessoa para outra profissão?", base:"Lei 8.213/91, art. 42, caput; IN 128/2022, arts. 326, caput, e 339, § 4º", conf:"conferido", campos:["inc_reab","inc_atividade"],
     mede:x=>{ const r = x.v.inc_reab, pes = x.idade!=null ? `; ${x.idade} anos${x.v.inc_atividade ? `, ${x.v.inc_atividade}` : ""}: idade, escolaridade e profissão pesam na via judicial (Súmula 47 TNU, só na skill)` : "";
       if(r==="Não" || r==="Reabilitação frustrada") return {est:"ok", txt:`${r==="Não" ? "não pode ser reabilitado" : "reabilitação frustrada"}${pes}`, fonte:"campo"};
       if(r==="Sim") return {est:"falta", txt:`pode ser reabilitado: o caminho é o B31 com reabilitação profissional${pes}`, fonte:"campo"};
       if(r==="Em reabilitação") return {est:"falta", txt:"em reabilitação: o B32 só se ela for frustrada", fonte:"campo"};
       return {est:"informar", txt:`informe se a pessoa pode ser reabilitada para outra profissão${pes}`}; }},
    {id:"preexistencia", rot:"A doença começou depois que a pessoa passou a contribuir?", base:"Lei 8.213/91, art. 42, § 2º; IN 128/2022, art. 326, § 4º", conf:"conferido", campos:["inc_did"],
     mede:x=>_incMedePreex(_incPerm(x), "art. 42, § 2º")},
    // F235 · o auxílio-doença em curso: a janela da prorrogação é o prazo do caso, e é nela que a perícia pode reconhecer a permanência
    {id:"prazo_prorrogacao", rot:"Recebe auxílio-doença agora? Até quando? É a perícia da prorrogação que pode virar aposentadoria", base:"IN 128/2022, arts. 326, § 6º, I, e 339, § 3º (red. IN 212/2026)", conf:"conferido", campos:["inc_dcb"],
     mede:x=>{ const au = _incAuxAtivo(x);
       if(!au) return {est:"info", txt:"não recebe auxílio-doença agora: é pedido novo de aposentadoria, com perícia"};
       if(!au.dcb) return {est:"informar", txt:`recebe o auxílio-doença${_incNb(au.at)} sem data de fim lida: informe a DCB, porque a prorrogação se pede nos últimos 15 dias do benefício`, fonte:"CNIS"};
       const abre = _incSoma(au.dcb, -14), pr = (x.preUsado||{}).inc_tipo, leva = pr && x.v.inc_tipo==="Permanente" ? `levando o ${pr.fonte.split(":")[0]}, que diz que a incapacidade é definitiva` : "levando relatório médico que diga que a incapacidade é total e permanente";
       const cmp = _incCompara(x), aviso = cmp && cmp.menos ? ` Antes, avise o cliente por escrito: a aposentadoria pagaria cerca de ${_incReais(cmp.apo)}, uns ${_incDifR(cmp.dif)} a menos que o auxílio de hoje; ele pode preferir seguir só com a prorrogação.` : "";
       const corpo = `${leva}: é a perícia da prorrogação que pode transformar o auxílio em aposentadoria (IN 128, art. 326, § 6º, I).${aviso} Se o INSS só prorrogar ou cortar: recurso em 30 dias ou ação ${au.at.especie==="91" ? "na Justiça Estadual (acidente do trabalho)" : "no Juizado Especial Federal"}`;
       return x.hoje < abre ? {est:"info", txt:`pedir a prorrogação de ${fmtBarra(abre)} até ${fmtBarra(au.dcb)} (os últimos 15 dias do auxílio; IN 128, art. 339, § 3º), ${corpo}`, fonte:au.fonte, quando:abre}
         : {est:"risco", txt:`prazo correndo: pedir a prorrogação até ${fmtBarra(au.dcb)} (a janela vai de ${fmtBarra(abre)} a ${fmtBarra(au.dcb)}, os últimos 15 dias do auxílio; IN 128, art. 339, § 3º), ${corpo}`, fonte:au.fonte, quando:au.dcb}; }},
    {id:"dib_b32", rot:"Desde quando a aposentadoria é devida?", base:"Lei 8.213/91, art. 43, caput e § 1º; IN 128/2022, arts. 326, § 6º, e 327", conf:"conferido", campos:["inc_dat","der"],
     mede:x=>{ const d0 = _incDii(x), perm = x.v.inc_dii_perm;
       const b31 = (x.benefCnis||[]).filter(b=>/^(31|91)$/.test(b.especie) && b.ate && (!d0 || b.ate >= d0.iso)).sort((a, b)=>a.ate < b.ate ? -1 : 1).pop();
       const ie = perm ? `; a IN 128 (art. 326, § 6º) usa a perícia que fixou a permanência (${fmtBarra(perm)})` : "";
       // F235 · com o auxílio-doença em curso, a aposentadoria nasce na perícia que reconhecer a permanência; o tempo do auxílio já está pago
       const au = _incAuxAtivo(x);
       if(au) return {est:"info", txt:`vem do auxílio-doença${_incNb(au.at)}, ativo${au.dcb ? `, com fim marcado para ${fmtBarra(au.dcb)}` : ""}: a aposentadoria começa na data da perícia que reconhecer a incapacidade permanente (IN 128, art. 326, § 6º, I; a lei fala no dia seguinte ao fim do auxílio, Lei 8.213/91, art. 43). Não há atrasado do tempo do auxílio: ele já está sendo pago`, fonte:au.fonte};
       if(b31) return {est:"info", txt:`vindo do B${b31.especie}${_incNb(b31)}${b31.ativo ? ` com DCB em ${fmtBarra(b31.ate)}` : ` cessado em ${fmtBarra(b31.ate)}`}: DIB em ${fmtBarra(diaSeguinte(b31.ate))} (art. 43, caput)${ie}`, fonte:"CNIS", quando:diaSeguinte(b31.ate)};
       const b = _incDib(x, true); if(!b) return {est:"informar", txt:"informe a DII ou o último dia trabalhado"};
       if(b.der && b.d && b.d.iso > b.der.iso) return {est:"info", txt:"a DII é posterior ao pedido: DIB na DII", fonte:b.der.fonte};
       if(b.der && b.der.iso > b.prazo) return {est:"info", txt:`sem B31 antes e pedido em ${fmtBarra(b.der.iso)}, depois de ${fmtBarra(b.prazo)}: DIB na DER (art. 43, § 1º)`, fonte:b.der.fonte};
       return {est:"info", txt:`sem B31 antes; ${b.quem} (art. 43, § 1º)`, fonte: b.der ? b.der.fonte : "campo"}; }},
    {id:"acrescimo_25", rot:"A pessoa precisa da ajuda permanente de outra pessoa no dia a dia?", base:"Lei 8.213/91, art. 45; IN 128/2022, arts. 328, 330, § 4º, II, e 331, § 3º, I", conf:"conferido", campos:["inc_terceiro"],
     mede:x=>{ const t = x.v.inc_terceiro;
       if(t==="Sim") return {est:"ok", txt:"tem direito ao acréscimo de 25 %, mesmo acima do teto: peça junto, porque o INSS não concede de ofício; cessa com a morte e não passa à pensão", fonte:"campo"};
       if(t==="Não") return {est:"info", txt:"sem o acréscimo de 25 %; se a necessidade surgir depois, é devido desde o pedido", fonte:"campo"};
       return {est:"informar", txt:"pergunte se a pessoa precisa de ajuda permanente para as atividades do dia a dia (relatório médico)"}; }},
    {id:"valor_rmi_b32", rot:"Quanto a aposentadoria vai pagar?", base:"EC 103/2019, art. 26, caput, § 2º, III, § 3º, II, e § 5º; IN 128/2022, art. 233, II, e § 1º", conf:"conferido", campos:[],
     mede:x=>{ x = _incPerm(x); const d = _incDii(x);
       const acid = (x.v.aci_nexo && x.v.aci_nexo!=="Sem nexo") || /profissional/i.test(x.v.inc_isencao||"") || /Típico|Trajeto|profissional|Concausa/.test(x.v.aci_tipo||"");
       if(d && d.iso <= EC103) return {est:"info", txt:`DII em ${fmtBarra(d.iso)}, até 13/11/2019: 100 % do salário de benefício, pela regra anterior à EC 103 (IN 128, art. 233, II, a)`, fonte:d.fonte};
       if(acid) return {est:"info", txt:"decorre de acidente do trabalho ou doença profissional: 100 % da média desde 07/1994 (EC 103, art. 26, § 3º, II; IN 128, art. 233, II, c)", fonte:"campo"};
       // tempo até a DII: contribuição posterior não entra
       const anos = x.tot && x.tot.comum ? Math.floor((d ? x.totEm(d.iso) : x.tot).comum/365) : x.ct ? Math.floor((d ? carenciaAte(x, d.iso) : x.ct.carencia)/12) : null;
       if(anos==null) return {est:"informar", txt:"lance os tempos ou leia o CNIS para o coeficiente"};
       const cat = (x.fd.cats||[]).length ? "; há CAT no dossiê: se a incapacidade vem desse acidente do trabalho, são 100 % (art. 26, § 3º, II)" : "";
       const lim = x.sx==="F" ? 15 : 20, coef = 60 + 2*Math.max(0, anos - lim), regra = `60 % mais 2 por ano acima de ${lim}; ${anos} anos${d ? " até a DII" : ""}`;
       // F235 · a pergunta do cliente é "ganho mais ou menos do que hoje?": compara com o auxílio-doença em curso (91 % da média)
       const cmp = _incCompara(x, coef);
       if(cmp) return cmp.menos ? {est:"opcao", txt:`Hoje o auxílio-doença paga ${moedaBR(cmp.aux)} (91 % da média). A aposentadoria pagaria ${coef} % da média (${regra}), cerca de ${_incReais(cmp.apo)}: uns ${_incDifR(cmp.dif)} a menos por mês (EC 103/2019, art. 26, § 2º, III; Tema 1300 STF). Avise o cliente por escrito antes de pedir. Só a aposentadoria por acidente do trabalho paga 100 %: pergunte se o serviço causou ou piorou a doença${cat}`, fonte:cmp.au.valor.fonte}
         : {est:"info", txt:`A aposentadoria paga mais: ${coef} % da média (${regra}), cerca de ${_incReais(cmp.apo)}, contra ${moedaBR(cmp.aux)} do auxílio-doença de hoje (91 % da média)${cat}`, fonte:cmp.au.valor.fonte};
       return {est:"info", txt:`${coef} % da média desde 07/1994: 60 % mais 2 por ano acima de ${lim} (${anos} anos${d ? " até a DII" : ""})${cat}`, fonte: x.tot && x.tot.comum ? "quadro Tempos" : "CNIS"}; }},
    {id:"vedacoes_acumulacao", rot:"A pessoa já recebe algo que impede esta aposentadoria?", base:"Lei 8.213/91, arts. 86, § 1º, e 124, I, II e parágrafo único; IN 128/2022, arts. 332, parágrafo único, e 355, § 1º, I", conf:"conferido", campos:[],
     mede:x=>_incMedeVed(x, "b32")},
    {id:"revisao_periodica", rot:"A aposentadoria vai passar por revisão do INSS?", base:"Lei 8.213/91, arts. 43, §§ 4º a 6º (Lei 15.157/2025), e 101, § 1º; IN 128/2022, arts. 330, caput, §§ 3º e 4º, e 333", conf:"conferido", campos:[],
     mede:x=>{ const cid = String(x.v.inc_cid || (_incLaudo(x, "cid")||{}).cid || "").toUpperCase().trim(), nota = "; a dispensa não vale para o pedido de 25 % nem para quem voltou a trabalhar";
       const ben = (x.benefCnis||[]).filter(b=>/^(31|32|91|92)$/.test(b.especie) && b.de).sort((a, b)=>a.de < b.de ? -1 : 1).pop(), anosBen = ben ? anosEntre(ben.de, x.der) : 0;
       const motivo = x.idade!=null && x.idade >= 60 ? `${x.idade} anos (60 ou mais)` : /^B2[0-4]/.test(cid) ? "HIV/aids" : /^G30/.test(cid) ? "Alzheimer" : /^G20/.test(cid) ? "Parkinson" : /^G12\.?2/.test(cid) ? "ELA"
         : x.idade!=null && x.idade >= 55 && anosBen >= 15 ? `${x.idade} anos e ${Math.floor(anosBen)} anos de benefício` : "";
       if(motivo) return {est:"info", txt:`dispensado da revisão: ${motivo}${nota}`, fonte: /anos/.test(motivo) ? "ficha" : "CID"};
       if(x.idade==null && !cid) return {est:"informar", txt:"sem a data de nascimento e sem o CID: não sei se há dispensa da revisão"};
       // F235 · a data em que fica livre da perícia de 2 em 2 anos (aos 60, ou aos 55 com 15 anos de benefício somando o auxílio que precedeu)
       // e a regra certa da recuperação (Lei 8.213/91, art. 47; IN 128, art. 333)
       const d60 = x.dn ? somarAnos(x.dn, 60) : null, d55 = x.dn && ben ? [somarAnos(x.dn, 55), somarAnos(ben.de, 15)].sort().pop() : null, livre = [d60, d55].filter(Boolean).sort()[0];
       return {est:"info", txt:`passa pela perícia de revisão a cada 2 anos (IN 128, art. 330)${livre ? ` até ${livre===d60 ? `os 60 anos, em ${fmtBarra(d60)} (§ 3º, II)` : `${fmtBarra(livre)}, quando terá 55 anos e 15 de benefício somando o auxílio (§ 3º, III)`}` : ""}; antes disso, só fica livre se a perícia declarar a incapacidade permanente e irreversível (Lei 8.213/91, art. 43, § 6º, red. Lei 15.157/2025)${nota}. Se recuperar a capacidade em até 5 anos (contados do auxílio que veio antes), a aposentadoria acaba logo (empregado que pode voltar à função) ou depois de tantos meses quantos forem os anos de benefício; depois de 5 anos, ou com recuperação parcial, vai diminuindo até acabar, em 18 meses (Lei 8.213/91, art. 47; IN 128, art. 333)`, fonte:"ficha"}; }},
  ], CAMPOS, {pre:_INC_PRE, resumo:"Paga quando a pessoa não consegue fazer nenhum trabalho que a sustente e não há como reabilitá-la para outro, desde que estivesse segurada quando ficou incapaz e tenha 12 contribuições (ou seja dispensada delas). Quem precisa de ajuda permanente de outra pessoa ganha mais 25 %.",
    // F235 · quem recebe auxílio-doença pede a prorrogação, e não a aposentadoria à parte: é a perícia da prorrogação que a reconhece
    guia: (x, a)=>{ const au = _incAuxAtivo(x); if(!au) return null; const abre = au.dcb ? _incSoma(au.dcb, -14) : null;
      return {anexos:[], servico:`Pedir a prorrogação do auxílio-doença — Meu INSS${au.dcb ? ` (de ${fmtBarra(abre)} a ${fmtBarra(au.dcb)}, os últimos 15 dias)` : ""}`,
        nota:"É a perícia da prorrogação que pode transformar o auxílio em aposentadoria (IN 128, art. 326, § 6º, I): leve o relatório que diga que a incapacidade é total e permanente. O acréscimo de 25 % é pedido à parte."}; },
    // F235 · com a janela ainda fechada, o caso nasce com a tarefa da prorrogação; se a aposentadoria paga menos, o cliente decide avisado
    desfecho: (x, a)=>{ const au = _incAuxAtivo(x); if(!au || !au.dcb) return null;
      const abre = _incSoma(au.dcb, -14); if(x.hoje >= abre) return null;
      const cmp = _incCompara(x);
      return {acao:"caso", tarefas:[{titulo:`⏰ Pedir a prorrogação do auxílio-doença, de ${fmtBarra(abre)} a ${fmtBarra(au.dcb)}, com relatório que diga que a incapacidade é permanente`, prazo:au.dcb}],
        txt:`gere o caso, com a tarefa de pedir a prorrogação de ${fmtBarra(abre)} até ${fmtBarra(au.dcb)}: é a perícia dela que pode transformar o auxílio em aposentadoria${cmp && cmp.menos ? `. Antes, avise o cliente por escrito que a aposentadoria pagaria cerca de ${_incReais(cmp.apo)}, uns ${_incDifR(cmp.dif)} a menos que o auxílio; se ele preferir o valor maior, siga só com a prorrogação do auxílio (a escolha é do advogado com o cliente)` : ""}`}; }});

  // ═══ acid · B91 e B92 acidentários ═══
  registrarReq("acid", [
    {id:"categoria_acidentaria", rot:"Na data do acidente ou da doença, a pessoa era empregada, doméstica, avulsa ou segurada especial?", base:"Lei 8.213/91, art. 19 (red. LC 150/2015); IN 128/2022, arts. 348, caput e § 3º, e 351, III e V", conf:"conferido", campos:["aci_data","aci_categoria","aci_vinculo"],
     mede:x=>_incMedeCategoria(x, "acid")},
    {id:"nexo_trabalho", rot:"A doença ou o acidente tem ligação com o trabalho?", base:"Lei 8.213/91, arts. 20, 21, I a IV, e 21-A; Decreto 3.048/99, art. 337; IN 128/2022, art. 348, § 1º", conf:"conferido", campos:["aci_tipo","aci_nexo","aci_cnae","aci_ntep"],
     mede:x=>_incMedeNexo(x, "acid")},
    {id:"cat_comunicacao", rot:"Foi emitida a CAT (comunicação do acidente)?", base:"IN 128/2022, arts. 350 e 351, §§ 3º, 4º, 5º e 8º", conf:"conferido", campos:["aci_cat"],
     mede:x=>{ const c = _incCat0(x);
       if(c) return {est:"ok", txt:`CAT${c.numero ? " "+c.numero : ""}${c.tipoCat ? ` (${c.tipoCat.toLowerCase()})` : ""}${c.emitente ? `, emitida por ${c.emitente}` : ""}, acidente em ${c.data || "data não lida"}`, fonte:"CAT"};
       if(x.v.aci_cat==="Sim") return {est:"ok", txt:"CAT emitida; traga a cópia", fonte:"campo"};
       if(x.v.aci_cat==="Não") return {est:"falta", txt:"sem CAT: o próprio segurado, os dependentes, o sindicato, o médico ou autoridade pública podem emitir, sem prazo; o nexo também pode vir do NTEP ou da perícia (IN 128, art. 351)", fonte:"campo"};
       // F235 · o Meu INSS que respondeu "nenhuma CAT" é fato: falta registrá-la, e quem pode
       if(Object.values((x.c && x.c.dossie) || {}).some(p=>((p && p.inexistentes) || []).some(t=>/^CAT\b/i.test(String(t)))))
         return {est:"falta", txt:"o Meu INSS não tem CAT no CPF: o próprio segurado, os dependentes, o sindicato, o médico que atendeu ou autoridade pública podem registrá-la agora, pelo Meu INSS, sem prazo (IN 128, art. 351)", fonte:"Meu INSS"};
       return {est:"informar", txt:"pergunte se a empresa emitiu a CAT, ou traga a do Meu INSS"}; }},
    {id:"qualidade_na_dii", rot:"Na data em que ficou incapaz, a pessoa estava segurada?", base:"Lei 8.213/91, art. 15; IN 128/2022, arts. 184, 335, § 2º, e 351, IV", conf:"conferido", campos:["inc_dii"],
     mede:x=>{ const d = _incDii(x) || _incDataAcid(x); if(!d) return {est:"informar", txt:"informe a DII ou a data do acidente (ou traga o laudo ou a CAT)"};
       const q = d.fonte==="campo" ? _incQualDii(x, d) : _incQual(x, d.iso); return {...q, txt:`${x.v.inc_dii || (x.fd.laudos||[]).some(l=>l.dii) ? "DII" : "acidente em"} ${fmtBarra(d.iso)}: ${q.txt}`, fonte: q.fonte ? `${q.fonte}; ${d.fonte}` : d.fonte}; }},
    {id:"sem_carencia", rot:"Precisa de contribuições mínimas?", base:"Lei 8.213/91, art. 26, II; IN 128/2022, art. 196, II", conf:"conferido", campos:[],
     mede:()=>_incSemCar("acidente do trabalho e doença profissional ou do trabalho; art. 26, II")},
    {id:"incapacidade_acidentaria", rot:"A incapacidade é passageira (B91) ou definitiva (B92)?", base:"IN 128/2022, arts. 335, § 4º, 345, 348, §§ 2º e 3º, e 349, I e II", conf:"conferido", campos:["inc_tipo","inc_dcb"],
     mede:x=>{ const l = _incLaudo(x, "resultado"), g = (l && l.grau) || "", t = x.v.inc_tipo || "", f = l ? _incFonteL(l) : "campo";
       if(l && l.resultado==="capaz") return {est:"risco", txt:`a perícia de ${l.exame || l.dii} concluiu capaz`, fonte:f};
       if((/^Total/i.test(g) && /permanente|definitiva/i.test(g)) || (!g && t==="Permanente")) return {est:"ok", txt:"incapacidade permanente: aposentadoria acidentária (B92), 100 % da média", fonte: g ? f : "campo"};
       if(/Parcial/i.test(g) || (!g && t==="Parcial")) return {est:"falta", txt:"incapacidade parcial: com sequela consolidada, o caminho é o auxílio-acidente (B94)", fonte: g ? f : "campo"};
       const ini = l && isoBr(l.dii||"") || (_incDii(x)||{}).iso, fim = l && isoBr(l.dcb||"") || x.v.inc_dcb;
       if(ini && fim){ const n = _incDias(ini, fim) + 1;
         if(n <= 15) return {est:"falta", txt:`só ${n} dias de incapacidade: até 15 dias a CAT só registra o acidente`, fonte:f}; }
       if(t==="Temporária" && !g && !(l && l.resultado==="incapaz") && !(ini && fim)) return {est:"informar", txt:"incapacidade temporária: informe a DCB ou o tempo de afastamento previsto (tem de passar de 15 dias)", fonte:"campo"};
       if(/tempor/i.test(g) || (l && l.resultado==="incapaz") || t==="Temporária") return {est:"ok", txt:`incapacidade temporária: auxílio acidentário (B91)${ini && fim ? `, de ${fmtBarra(ini)} a ${fmtBarra(fim)}` : ""}`, fonte: l ? f : "campo"};
       return {est:"informar", txt:"traga o laudo ou o relatório médico com o tipo e o tempo da incapacidade (mais de 15 dias)"}; }},
    // F235 · o prazo de 30 dias do afastamento vale também para o auxílio acidentário (Lei 8.213/91, art. 60, § 1º)
    ...(REQ_BENEF.b31 || []).filter(r=>r.id==="prazo_30_dias_dib"),
    {id:"valor_efeitos_acidentario", rot:"O que muda por ser acidentário?", base:"Lei 8.213/91, arts. 61 e 118; EC 103/2019, art. 26, § 3º, II; CF/88, art. 109, I", conf:"conferido", campos:[],
     mede:x=>{ const b91 = (x.benefCnis||[]).filter(b=>b.especie==="91" && b.ate && !b.ativo).sort((a, b)=>a.ate < b.ate ? -1 : 1).pop();
       const est = b91 ? somarMeses(b91.ate, 12) : null;
       return {est:"info", txt:`B91 paga 91 % do salário de benefício e o B92, 100 % da média; a ação vai à Justiça Estadual (CF, art. 109, I)${est ? `; estabilidade no emprego até ${fmtBarra(est)}, 12 meses depois da cessação do B91 (art. 118)` : "; o empregado tem 12 meses de estabilidade depois da cessação do B91 (art. 118)"}`, fonte: b91 ? "CNIS" : "lei", quando: est || undefined}; }},
    {id:"vedacoes_acumulacao", rot:"A pessoa já recebe algo que impede?", base:"Lei 8.213/91, art. 124; IN 128/2022, art. 349, parágrafo único", conf:"conferido", campos:[],
     mede:x=>_incMedeVed(x, "acid")},
  ], CAMPOS, {pre:_INC_PRE, resumo:"São o auxílio e a aposentadoria por incapacidade quando a doença ou o acidente vêm do trabalho: não pedem carência, a aposentadoria paga 100 % da média e o empregado ganha 12 meses de estabilidade.",
    // F235 · a aposentadoria por invalidez comum de quem se acidentou no trabalho: a troca para a acidentária (32 → 92), e não um pedido novo
    veredito: (x, a)=>{ const t = _incTroca92(x); if(!t) return null;
      const k = (x.fd.cartas||[]).find(c=>soDig(c.nb||"")===soDig(t.nb||"") && c.rmi), co = _incCoef(x), rmi = k ? _incNum(k.rmi) : 0, cem = rmi && co ? rmi / co * 100 : 0;
      return {tom:"sim", txt:`Sim, como troca: é acidente do trabalho, mas sem CAT o INSS deu a aposentadoria por invalidez comum${_incNb(t)}. Como acidentária (B92), paga 100 % da média${cem > rmi ? `, cerca de ${_incReais(cem)}, contra ${moedaBR(rmi)} de hoje (${co} %): uns ${_incDifR(cem - rmi)} por mês a mais` : ""}. Primeiro, registrar a CAT; depois, revisão da espécie no INSS ou ação acidentária na Justiça Estadual, à escolha do advogado.`}; },
    agora: (x, a)=>{ const t = _incTroca92(x);
      if(t) return ["Registrar a CAT agora: o próprio segurado pelo Meu INSS, o sindicato ou o médico que atendeu; não há prazo (Lei 8.213/91, art. 22, § 2º).",
        "Depois, à escolha do advogado: pedir ao INSS a revisão da espécie (de 32 para 92) ou entrar com a ação acidentária na Justiça Estadual (CF, art. 109, I); nunca no Juizado Federal.",
        "O auxílio-doença comum que veio antes também deveria ser acidentário (91): no INSS o valor é o mesmo, mas a empresa deve o FGTS do afastamento (conferir com o advogado).",
        // F235 · os prazos da troca: a ação acidentária conta 5 anos do reconhecimento da invalidez (art. 104, II); a revisão, 10 anos (art. 103)
        ...(t.de ? [`Prazos: a ação acidentária prescreve em 5 anos do dia em que o INSS reconheceu a incapacidade permanente, ${fmtBarra(somarAnos(t.de, 5))} (Lei 8.213/91, art. 104, II; conferir a data da perícia); a revisão da espécie, em 10 anos do primeiro pagamento (art. 103, conferir); a CAT não tem prazo.`] : [])];
      const b = _incDib(x), cat = _incCat0(x), rel = (x.clin||[]).filter(i=>i.tipo==="Relatório" && i.data).sort((p, q)=>p.data < q.data ? -1 : 1).pop();
      if(!b || x.hoje > b.prazo) return [];
      return [`Pedir já pelo Meu INSS, até ${fmtBarra(b.prazo)}: pedindo até essa data, o INSS paga desde ${fmtBarra(b.dib)}; depois, só desde o pedido.`,
        `Leve documento com foto${cat ? `, a CAT de ${cat.data}` : ""}${rel ? ` e o ${_clinFonte(rel)}` : ""}${cat || rel ? ": estão no dossiê" : ""}.`,
        ...(cat ? [] : ["Sem CAT da empresa, o próprio segurado, o sindicato ou o médico podem registrá-la no Meu INSS, sem prazo."]),
        "Pelo atestado, o INSS só concede como acidentário se a perícia reconhecer a ligação com o trabalho; se vier como auxílio comum (31), o recurso em 30 dias pede a troca para 91."]; },
    guia: (x, a)=>_incTroca92(x) ? {anexos:[], servico:"1) Registrar a CAT no Meu INSS; 2) pedir a revisão da espécie, de 32 para 92, no Meu INSS, ou entrar com a ação acidentária na Justiça Estadual",
      nota:"A CAT pode ser registrada pelo próprio segurado, pelo sindicato ou pelo médico que atendeu, sem prazo (Lei 8.213/91, art. 22, § 2º). A escolha entre a revisão no INSS e a ação na Justiça Estadual é do advogado; nunca o Juizado Federal. Para a ação: comprovante de residência e procuração com assinatura digital (ICP-Brasil, conferir)."} : null,
    desfecho: (x, a)=>_incTroca92(x) ? {acao:"caso", cod:"B92", txt:"gere o caso da troca da aposentadoria comum pela acidentária (32 para 92): primeiro registrar a CAT; depois, revisão da espécie no INSS ou ação acidentária na Justiça Estadual, à escolha do advogado; nunca o Juizado Federal"} : null,
    docCat: c=>{ const ap = aposentadoriaAtiva(c), fd = fontesDoDossie(c.id);
      return ap && /invalidez|incapacidade permanente/i.test(ap.especie) && !(fd.cats||[]).length && trabalhoNoDossie(c, fd) ? CAT_TROCA92 : null; }});
  // F235 · a lista da troca da aposentadoria comum pela acidentária (o gabarito do teste por espécie, 16.10.2026)
  const CAT_TROCA92 = {beneficio:"Troca da aposentadoria comum pela acidentária (32 para 92)", itens:["CAT registrada — o próprio segurado, o sindicato ou o médico que atendeu registram no Meu INSS, sem prazo",
    "Prontuário do atendimento do dia do acidente — HC ou pronto-socorro", "Laudo do INSS — da perícia que deu a aposentadoria", "Carta de concessão — da aposentadoria por invalidez",
    "Comprovante de residência — para a ação na Justiça Estadual", "Documento de identificação com foto"].join("\n"), extras:"", observacoes:""};

  // ═══ b94 · auxílio-acidente acidentário ═══
  registrarReq("b94", [
    {id:"categoria_b94", rot:"Na data do acidente a pessoa era empregada (inclusive doméstica), avulsa ou segurada especial?", base:"Lei 8.213/91, art. 18, § 1º (red. LC 150/2015); Decreto 3.048/99, art. 104, caput e § 8º; IN 128/2022, arts. 184, § 7º, 352, caput, §§ 4º, 8º e 9º, e 353", conf:"conferido", campos:["aci_data","aci_categoria"],
     mede:x=>_incMedeCategoria(x, "b94")},
    {id:"qualidade_data_acidente", rot:"No dia do acidente, a pessoa estava segurada?", base:"Decreto 3.048/99, art. 104, § 7º; IN 128/2022, art. 353", conf:"conferido", campos:[], mede:_incMedeQualAcid},
    {id:"acidente_do_trabalho_nexo", rot:"O acidente ou a doença veio do trabalho?", base:"Lei 8.213/91, arts. 19, 21, 21-A e 86, § 4º; IN 128/2022, art. 349, parágrafo único", conf:"conferido", campos:["aci_tipo","aci_nexo","aci_ntep","aci_cnae"],
     mede:x=>_incMedeNexo(x, "b94")},
    {id:"consolidacao", rot:"O tratamento terminou e as lesões já se estabilizaram?", base:"Lei 8.213/91, art. 86, caput; IN 128/2022, art. 354, caput", conf:"conferido", campos:["aci_consolidacao","aci_dcb31","aci_sequela"], mede:_incMedeConsol},
    {id:"sequela_reducao", rot:"Ficou sequela que reduz a capacidade para o trabalho que a pessoa fazia?", base:"Lei 8.213/91, art. 86, caput; Decreto 3.048/99, art. 104, caput e § 4º; IN 128/2022, arts. 352, caput, e 354, §§ 1º (red. IN 212/2026) e 2º", conf:"conferido", campos:["aci_atividade","aci_reducao","aci_anexo3","aci_readaptado"], mede:_incMedeSequela},
    {id:"sem_carencia", rot:"Precisa de contribuições mínimas?", base:"Lei 8.213/91, art. 26, I; Decreto 3.048/99, art. 30, I", conf:"conferido", campos:[], mede:()=>_incSemCar("art. 26, I")},
    {id:"dib_b94", rot:"Desde quando é devido?", base:"Lei 8.213/91, art. 86, § 2º; IN 128/2022, art. 352, §§ 2º, 5º, 6º e 10", conf:"conferido", campos:["aci_dcb31","der"], mede:_incMedeDibAa},
    {id:"onde_pedir", rot:"Onde se pede?", base:"CF/88, art. 109, I; Lei 8.213/91, art. 129", conf:"conferido", campos:[], mede:x=>_incMedeViaAa(x, "b94")},
    {id:"vedacoes_b94", rot:"A pessoa já é aposentada ou já recebe outro auxílio-acidente?", base:"Lei 8.213/91, arts. 15, I, 86, §§ 1º a 3º, e 124, V e parágrafo único; IN 128/2022, arts. 184, I, 355 e 356", conf:"conferido", campos:[], mede:_incMedeVedAa},
    {id:"analise_documental_previa", rot:"Os documentos médicos provam o acidente e a sequela?", base:"Portaria Conjunta MPS/INSS 15/2026, arts. 1º, §§ 1º a 3º, e 4º", conf:"conferido", campos:["aci_docs"], mede:_incMedeDocsAa},
    {id:"valor_b94", rot:"Quanto paga?", base:"Lei 8.213/91, arts. 31 e 86, § 1º; Decreto 3.048/99, art. 104, § 1º; IN 128/2022, arts. 233, X e § 3º, e 352, § 7º", conf:"conferido", campos:[],
     mede:x=>{ const c = (x.fd.cartas||[]).filter(c=>/31|91|incapacidade|doen/i.test(c.especie||"") && c.rmi).sort((a, b)=>isoBr(a.dib||"") < isoBr(b.dib||"") ? -1 : 1).pop();
       const base = "50 % do salário de benefício, todo mês, até a véspera da aposentadoria; entra como salário de contribuição na aposentadoria futura (art. 31)";
       if(!c) return {est:"info", txt:base, fonte:"lei"};
       const rmi = +String(c.rmi).replace(/\./g, "").replace(",", "."), sb = rmi / 0.91;
       // F235 · a espécie de origem é a da carta (o auxílio do acidente do trabalho é o B91), e o valor é o do ano da carta, a reajustar
       const eo = /acident/i.test(c.especie||"") ? "B91" : "B31", ano = String(c.dib||"").slice(-4), velho = /^\d{4}$/.test(ano) && ano < x.hoje.slice(0, 4);
       return {est:"info", txt:`${base}; o auxílio-doença de origem (${eo}) pagou ${moedaBR(rmi)}${velho ? ` em ${ano}` : ""} (91 % do salário de benefício), o que dá cerca de ${moedaBR(sb/2)}${velho ? ` em valores de ${ano}, a reajustar` : ""}: 50 % do salário de benefício do ${eo} (IN 128, art. 233, X); se a renda do ${eo} foi limitada pela média dos 12 últimos salários (art. 233, I, b), o salário de benefício é maior`, fonte:`carta${c.nb ? " NB "+fmtNb(c.nb) : ""}`}; }},
  ], CAMPOS, {pre:_INC_PRE, resumo:"É uma indenização mensal de 50 % para quem, depois de um acidente do trabalho ou doença do trabalho, ficou com sequela que reduz a capacidade para o trabalho que fazia; não pede carência e acaba quando a pessoa se aposenta."});

  // ═══ b36 · auxílio-acidente previdenciário ═══
  registrarReq("b36", [
    {id:"categoria_b36", rot:"Na data do acidente a pessoa era empregada (inclusive doméstica), avulsa ou segurada especial?", base:"Lei 8.213/91, art. 18, § 1º; IN 128/2022, arts. 184, § 7º, 352, caput, §§ 4º e 9º, e 353", conf:"conferido", campos:["aci_data","aci_categoria"],
     mede:x=>_incMedeCategoria(x, "b36")},
    {id:"qualidade_data_acidente", rot:"No dia do acidente, a pessoa estava segurada?", base:"Decreto 3.048/99, art. 104, § 7º; IN 128/2022, art. 353", conf:"conferido", campos:[], mede:_incMedeQualAcid},
    {id:"acidente_qualquer_natureza", rot:"Houve um acidente (trauma ou agente externo), e não só uma doença?", base:"Lei 8.213/91, art. 86, caput e § 4º; Decreto 3.048/99, art. 30, § 1º; IN 128/2022, art. 352, § 1º", conf:"conferido", campos:["aci_tipo","inc_cid"],
     mede:x=>{ const d = _incDataAcid(x), t = x.v.aci_tipo || "";
       if(_incAuditiva(x)) return {est:"impedido", txt:"perda auditiva só gera auxílio-acidente com nexo com o trabalho (art. 86, § 4º): é o B94, não o B36", fonte:"CID"};
       if(d && d.iso < "1995-04-29") return {est:"impedido", txt:`acidente em ${fmtBarra(d.iso)}, antes de 29/04/1995: só havia auxílio-acidente por acidente do trabalho`, fonte:d.fonte};
       if(/Doença sem acidente/.test(t)) return {est:"impedido", txt:"doença comum ou degenerativa sem acidente não dá auxílio-acidente (art. 86; IN 128, art. 352, § 1º)", fonte:"campo"};
       if((x.fd.cats||[]).length || /Típico|Trajeto|profissional|Concausa/.test(t)) return {est:"risco", txt:"é acidente do trabalho (CAT ou tipo informado): o benefício é o B94 acidentário, na Justiça Estadual, e não o B36", fonte: (x.fd.cats||[]).length ? "CAT" : "campo"};
       // F235 · o papel que a pessoa trouxe prova o acidente; e a pergunta do trajeto ou do serviço separa o B36 do B94
       if(/Trânsito|casa|Lazer|Agressão|Outro/.test(t)){ const trouxe = /ficha do pronto[- ]socorro|boletim de ocorr|prontu[áa]rio/i.test(relatoDe(x.c));
         return {est:"ok", txt:`${t.toLowerCase()}${d ? ` em ${fmtBarra(d.iso)}` : ""}: acidente de qualquer natureza; ${trouxe ? "a ficha do atendimento que a pessoa trouxe prova o acidente: anexe-a ao pedido" : "traga o boletim ou o prontuário do atendimento"}. Confirme que, no dia, não ia nem voltava do trabalho nem estava a serviço: seria acidente do trabalho (B94, Justiça Estadual)`, fonte:"campo"}; }
       return {est:"informar", txt:"informe a natureza do acidente (trânsito, em casa, lazer, agressão) e traga o boletim ou o prontuário"}; }},
    {id:"consolidacao", rot:"O tratamento terminou e as lesões já se estabilizaram?", base:"Lei 8.213/91, art. 86, caput; IN 128/2022, art. 354, caput", conf:"conferido", campos:["aci_consolidacao","aci_dcb31","aci_sequela"], mede:_incMedeConsol},
    {id:"sequela_reducao", rot:"Ficou sequela que reduz a capacidade para o trabalho que a pessoa fazia?", base:"Lei 8.213/91, art. 86; Decreto 3.048/99, art. 104, § 4º; IN 128/2022, art. 354, §§ 1º e 2º", conf:"conferido", campos:["aci_atividade","aci_reducao","aci_anexo3","aci_readaptado"], mede:_incMedeSequela},
    {id:"sem_carencia", rot:"Precisa de contribuições mínimas?", base:"Lei 8.213/91, art. 26, I", conf:"conferido", campos:[], mede:()=>_incSemCar("art. 26, I")},
    {id:"dib_b36", rot:"Desde quando é devido?", base:"Lei 8.213/91, art. 86, § 2º; IN 128/2022, art. 352, § 6º", conf:"conferido", campos:["aci_dcb31","der"], mede:_incMedeDibAa},
    {id:"onde_pedir", rot:"Onde se pede?", base:"CF/88, art. 109, I", conf:"conferido", campos:[], mede:x=>_incMedeViaAa(x, "b36")},
    // F235 · "quanto é?" também no B36: metade do salário de benefício do auxílio que veio antes
    ...(REQ_BENEF.b94 || []).filter(r=>r.id==="valor_b94"),
    {id:"vedacoes_b36", rot:"A pessoa já é aposentada ou já recebe outro auxílio-acidente?", base:"Lei 8.213/91, arts. 15, I, 86, §§ 1º a 3º, e 124, V e parágrafo único; IN 128/2022, art. 355", conf:"conferido", campos:[], mede:_incMedeVedAa},
    {id:"analise_documental_previa", rot:"Os documentos médicos provam o acidente e a sequela?", base:"Portaria Conjunta MPS/INSS 15/2026, arts. 1º e 4º", conf:"conferido", campos:["aci_docs"], mede:_incMedeDocsAa},
  ], CAMPOS, {pre:_INC_PRE, resumo:"É a mesma indenização de 50 % do B94, mas para acidente fora do trabalho (trânsito, doméstico, lazer) que deixou sequela redutora da capacidade para o trabalho habitual; não pede carência e acaba com a aposentadoria."});
})();
// ── Aposentadorias urbanas e professor (casos-ouro em testes/cadastro/req-ouro/apos.json) ──
(()=>{
  // ══ Aposentadorias urbanas e professor: idade (B41), transicao (B42), professor (B57) ══
  // Tempo em dias (ano 365, como admTotaisDe); idade pela data de aniversário (dataDaIdade) e,
  // nos pontos, em dias (anosEntre). Pontos e idades vêm da fórmula da EC 103 pelo ano em que a
  // regra se cumpre (pontosExig, idadeProgExig, idadeArt18): os números de 2026 são só um caso.
  const FIM = "9999-12-31", DEPOIS = "2019-11-14", EC20 = "1998-12-16", ANO = 365;
  const _apoMemo = new WeakMap();
  const _apoM = (x, k, f) => { let o = _apoMemo.get(x); if(!o) _apoMemo.set(x, o = new Map()); if(!o.has(k)) o.set(k, f()); return o.get(k); };
  const _apoSegue = x => x.v.apo_segue==="Sim";
  const _apoRef = x => x.der < x.hoje ? x.der : x.hoje;
  // depois de hoje só cresce o que continua sendo pago (campo "continua contribuindo até a DER")
  const _apoLim = (x, iso) => iso > x.hoje && !_apoSegue(x) ? x.hoje : iso;
  // a projeção conta desde o mês corrente quando o CNIS ainda não o tem (sem CNIS, o número digitado já o inclui)
  const _apoProj = (x, iso) => { if(!(iso > x.hoje && _apoSegue(x))) return 0;
    const ult = ((x.ct||{}).periodos||[]).map(p=>p[1]).sort().pop(), ini = ult && ult < ymDe(x.hoje) ? ymDe(x.hoje) : ymDe(somarMeses(x.hoje, 1));
    return Math.max(0, mesesEntreYm(ini, ymDe(iso))); };
  const _apoAnosMeses = a => { const t = Math.round(a*12), y = Math.floor(t/12), m = t % 12; return `${y} ${y===1?"ano":"anos"}${m ? ` e ${m} ${m===1?"mês":"meses"}` : ""}`; };
  const _apoIdade = (dn, iso) => { const [a, m, d] = dn.split("-").map(Number), [b, n, e] = iso.split("-").map(Number); return _apoAnosMeses(((b-a)*12 + (n-m) - (e < d ? 1 : 0))/12); };
  const _apoPts = p => (Math.floor(p*10)/10).toFixed(1).replace(".", ",");
  // F235 · o tempo exigido ao dia, como na conta de data a data: 35 anos menos 31a7m13d dá 3a4m17d, e não 3a4m17,4d
  // (menos um milionésimo: a soma dos períodos em ponto flutuante não pode perder o dia exato por arredondamento)
  const _aoDia = dias => { const M = ANO/12, n = Math.floor(dias/M + 1e-9); return n*M + Math.round(dias - n*M) - 1e-6; };
  // F235 · o valor pela regra (EC 103, art. 26, §§ 2º e 5º): 60 % mais 2 % por ano completo acima de 20 (homem) ou 15 (mulher)
  const _apoPct = (x, dias) => 60 + 2*Math.max(0, Math.floor(dias/ANO + 1e-9) - (x.sx==="F" ? 15 : 20));
  const _apoPctTxt = (x, dias) => `${_apoPct(x, dias)} % da média dos salários desde 07/1994 (60 % mais 2 % por ano de contribuição acima de ${x.sx==="F" ? 15 : 20})`;
  // F235 · os meses pagos abaixo do mínimo depois de 11/2019; os do ano corrente ainda se completam até 31/12 (EC 103, art. 29, parágrafo único)
  const _apoAbaixoLista = x => ((x.an||{}).abaixo||[]).filter(a=>chaveComp(a.comp) >= "2019-11");
  const _apoAbaixoAno = x => _apoAbaixoLista(x).filter(a=>+String(a.comp).slice(-4)===anoDe(x.hoje));
  const _mmaa = ym => String(ym||"").split("-").reverse().join("/");
  // o primeiro mês que a projeção conta (o corrente, se o CNIS ainda não o tem)
  const _apoIniProj = x => { const ult = ((x.ct||{}).periodos||[]).map(p=>p[1]).sort().pop(); return ult && ult < ymDe(x.hoje) ? ymDe(x.hoje) : ymDe(somarMeses(x.hoje, 1)); };
  // a alíquota do carnê pelo indicador do último vínculo de contribuinte (11 % no plano simplificado, 5 % na baixa renda e no MEI)
  const _apoAliqDe = x => { const v = ((x.g||{}).vinculos||[]).filter(v=>/individual|facultativ/i.test(v.tipo||"")).pop(), ind = ((v||{}).indicadores||[]).join(" ");
    return /FBR|MEI/.test(ind) ? 5 : /LC123/.test(ind) ? 11 : 20; };
  // os meses de carnê (CI ou facultativo) dentro da contagem do CNIS
  const _apoCiMeses = x => { const ps = (x.ct||{}).periodos||[], ms = new Set();
    for(const v of ((x.g||{}).vinculos||[]).filter(v=>/individual|facultativ/i.test(v.tipo||"") && v.inicio)){
      let a = ymDe(isoBr(v.inicio)); const b = ymDe(isoBr(v.fim||"") || (v.ultRemun ? isoBr(fimDoMes(v.ultRemun)) : x.hoje));
      for(let k = 0; a && a <= b && k < 1200; k++, a = ymDe(somarMeses(a+"-01", 1))) if(ps.some(([i, f])=>i <= a && a <= f)) ms.add(a); }
    return ms.size; };
  const _apoPextVs = x => ((x.g||{}).vinculos||[]).filter(v=>v.tipo!=="Benefício" && (v.indicadores||[]).some(i=>/^PEXT/.test(String(i))));
  const _apoPextOnde = v => `${tituloOrgao(v.origem||"empresa")} de ${String(v.inicio||"").slice(3)} a ${String(v.fim||v.ultRemun||"").slice(-7)}`;
  // competências digitadas: "01/2015 a 12/2016, 03/2018", um número, ou "nenhuma"
  const _apoComps = s => { s = String(s||"").trim();
    if(!s || /^(n[ãa]o|nenhum|nenhuma|0+)\b/i.test(s)) return {meses:[], n:0};
    if(/^\d+$/.test(s)) return {meses:null, n:+s};
    const ms = new Set();
    for(const m of s.matchAll(/(\d{2})\/(\d{4})(?:\s*(?:a|até|-)\s*(\d{2})\/(\d{4}))?/g)){
      let a = `${m[2]}-${m[1]}`; const b = m[3] ? `${m[4]}-${m[3]}` : a;
      for(let k = 0; a <= b && k < 1200; k++, a = ymDe(somarMeses(a+"-01", 1))) ms.add(a); }
    return {meses:[...ms], n:ms.size}; };
  // shortcut: o número sem competências vale para qualquer data; com as competências, só as até a data
  const _apoCompsAte = (p, iso) => p.meses ? p.meses.filter(m=>m <= ymDe(iso)).length : p.n;
  // a primeira filiação: o campo confirmado; sem ele, a mais antiga entre o CNIS e as linhas do quadro
  // Tempos (rural, RPPS ou vínculo fora do CNIS antecipam a filiação)
  const _APO_PRE = {apo_filiacao: x=>{ const f = _apoFil(x); return f && f.fonte!=="campo" ? {val:fmtBarra(f.iso), fonte:`do ${f.fonte}`} : null; },
    // F235 · o campo da carência mostra a contagem do CNIS: só se preenche quando o CNIS estiver errado
    car_cumprida: x=>x.ct && x.ct.carencia!=null ? {val:String(x.ct.carencia), fonte:"pela contagem do CNIS (corrija só se o CNIS estiver errado)"} : null};
  const _apoFil = x => {
    if(x.v.apo_filiacao) return {iso:x.v.apo_filiacao, fonte:"campo"};
    const ln = (x.tempos||[]).map(r=>r.de).filter(Boolean).sort()[0], p = ((x.ct||{}).periodos||[])[0];
    const cn = x.filiacao || (p ? p[0]+"-01" : null), f = [cn, ln].filter(Boolean).sort()[0];
    return f ? {iso:f, fonte: f===cn ? "CNIS" : "quadro Tempos"} : null; };
  // Lei 8.213/91, art. 142 (lido em 16/10/2026): inscrito até 24/07/1991, carência pelo ano
  const TAB142 = {1991:60, 1992:60, 1993:66, 1994:72, 1995:78, 1996:90, 1997:96, 1998:102, 1999:108, 2000:114,
    2001:120, 2002:126, 2003:132, 2004:138, 2005:144, 2006:150, 2007:156, 2008:162, 2009:168, 2010:174};
  const _apoExig = (x, ano) => { const f = _apoFil(x); return f && f.iso <= "1991-07-24" && ano <= 2010 ? TAB142[Math.max(1991, ano)] : 180; };
  const _apoExigTxt = (x, ano) => _apoExig(x, ano) < 180 ? ` (inscrito até 24/07/1991: tabela do art. 142, ano ${Math.max(1991, ano)})` : "";
  // os benefícios e as alíquotas vêm do CNIS lido (g); a contagem sozinha não os traz
  const _apoCnisLido = x => !!(x.g || (x.benefCnis||[]).length);
  const _apoTemCi = x => ((x.g||{}).vinculos||[]).some(v=>/Individual|Facultativo/i.test(v.tipo||""));
  const _apoAliqSinal = x => {
    const cods = [...((x.an||{}).indicadores||[]), ...((x.g||{}).indicadores||[])].map(i=>i.codigo).concat(((x.g||{}).vinculos||[]).flatMap(v=>v.indicadores||[]));
    const vs = (x.g||{}).vinculos||[];
    return cods.find(k=>/^(IREC|PREC)-(LC123|FBR|MEI)/.test(k||"")) || (vs.some(v=>/MEI|Microempreendedor/i.test(v.origem||"")) ? "MEI" : null)
      || (vs.some(v=>/Individual|Facultativo/i.test(v.tipo||"") && (v.comps||[]).some(cp=>[5, 11, 12].includes(cp.aliq) || (cp.ind||[]).some(i=>/LC123|FBR|MEI/.test(i)))) ? "alíquota da competência" : null); };
  // competências depois de 11/2019 abaixo do mínimo, sem complemento (EC 103, art. 29), até a data
  const _apoAbaixo = (x, lim) => x.v.apo_compl==="Sim" ? 0
    : ((x.an||{}).abaixo||[]).filter(a=>{ const k = chaveComp(a.comp); return k >= "2019-11" && k <= ymDe(lim); }).length;
  // benefício por incapacidade (31, 32, 91, 92) até lim, em intervalos ISO
  const _apoBens = (x, lim) => (x.benefCnis||[]).filter(b=>/^(31|32|91|92)$/.test(String(b.especie)) && b.de && b.de <= lim)
    .map(b=>({b, de:b.de, ate: !b.ate || b.ate > lim ? lim : b.ate}));
  // os meses de benefício que o CNIS não conta: intercalado com contribuição (IN 128, art. 193 e art. 216, IV)
  // e, na carência, o acidentário mesmo sem intercalar (art. 193); o mês já contado no CNIS não conta duas vezes
  const _apoBenMeses = (x, lim, carencia, proj) => _apoM(x, `bm${lim}${carencia?1:0}${proj?1:0}`, () => {
    const ps = (x.ct||{}).periodos||[], ym = ymDe(lim), noCnis = m => ps.some(([a, b])=>a <= m && m <= b), ms = new Set();
    for(const {b, de, ate} of _apoBens(x, lim)){
      // F235 · com a contribuição projetada depois de hoje, o benefício já encerrado fica entre contribuições
      const a = ymDe(de), z = ymDe(ate), inter = ps.some(([, f])=>f < a) && (ps.some(([i])=>i > z && i <= ym) || (proj && z < ymDe(x.hoje)));
      if(!inter && !(carencia && /^9[12]$/.test(String(b.especie)))) continue;
      for(let m = a, k = 0; m <= z && k < 1200; k++, m = ymDe(somarMeses(m+"-01", 1))) if(!noCnis(m)) ms.add(m);
    }
    return ms.size; });
  const _apoPend = (x, carencia) => _apoBenMeses(x, x.hoje, carencia, true) - _apoBenMeses(x, x.hoje, carencia, false);
  // o tempo de contribuição numa data, em dias: as linhas do quadro Tempos (com a conversão do especial
  // até 13/11/2019) ou, sem linhas, os meses do CNIS; mais o benefício por incapacidade intercalado que
  // nenhuma linha cobre; menos as competências abaixo do mínimo depois da Reforma
  const _apoTempo = (x, iso) => _apoM(x, "t"+iso, () => {
    const lim = _apoLim(x, iso), t = lim===_apoRef(x) ? x.tot : x.totEm(lim);
    if(t && t.linhas){
      const cob = fundirIvs((x.tempos||[]).filter(r=>r.de && r.de <= lim).map(r=>[r.de, !r.ate || r.ate > lim ? lim : r.ate]));
      const ben = fundirIvs(_apoBens(x, lim).filter(({de, ate})=>cob.some(([, f])=>f < de) && cob.some(([i])=>i > ate)).map(({de, ate})=>[de, ate]));
      const interc = ben.flatMap(([a, b])=>semCobertura(a, b, cob)).reduce((s, [a, b])=>s + durDias(durCal(a, b)), 0);
      const abaixo = _apoAbaixo(x, lim);
      // F235 · "pagando todo mês" sem linha aberta no quadro Tempos (quem volta a pagar): os meses projetados contam no tempo
      const proj = iso > x.hoje && _apoSegue(x) && !(x.tempos||[]).some(r=>r.de && !r.ate) ? _apoProj(x, iso) : 0;
      return {dias: t.comum + interc - abaixo*ANO/12 + proj*ANO/12, interc, abaixo, fonte:"quadro Tempos"};
    }
    if(!x.ct) return null;
    const base = lim > x.hoje ? x.hoje : lim, ib = _apoBenMeses(x, base, false, iso > x.hoje && _apoSegue(x));
    return {dias: (carenciaAte(x, base) + ib + _apoProj(x, iso))*ANO/12, interc: ib*ANO/12, abaixo:0, fonte:"CNIS"}; });
  // o tempo da B42 e da B57: sem as competências a 5 %, 11 % ou 12 % não complementadas (IN 128, art. 216, V, a)
  const _traTempo = (x, iso) => { const t = _apoTempo(x, iso); if(!t || x.v.tra_aliq_compl==="Sim") return t;
    const n = _apoCompsAte(_apoComps(x.v.tra_aliq_comps), iso); return n ? {...t, dias: t.dias - n*ANO/12, aliq:n} : t; };
  // as contribuições para carência até a competência da data (Lei 8.213, art. 25, II)
  const _apoCar = (x, iso) => _apoM(x, "c"+iso, () => {
    const man = +x.v.car_cumprida, proj = _apoProj(x, iso);
    // o número digitado é o da DER (ou de hoje): não diz quantas havia numa data anterior (direito adquirido)
    if(man && iso >= _apoRef(x)) return {n: man + proj, interc:0, proj, atr:0, fonte:"campo"};
    if(!x.ct) return null;
    const base = iso > x.hoje ? x.hoje : iso, interc = _apoBenMeses(x, base, true, iso > x.hoje && _apoSegue(x)), atr = _apoCompsAte(_apoComps(x.v.apo_ci_atraso), iso);
    // F235 · o mês abaixo do mínimo completado volta a contar (a contagem do CNIS o deixa de fora)
    const compl = x.v.apo_compl==="Sim" ? _apoAbaixoLista(x).filter(a=>chaveComp(a.comp) <= ymDe(base)).length : 0;
    return {n: carenciaAte(x, base) + interc + proj - atr + compl, interc, proj, atr, compl, fonte:"CNIS"}; });
  const _apoN = (x, iso) => (_apoCar(x, iso)||{n:-1}).n;
  // a primeira data entre desde e ate (inclusive) em que teste vale, ou null. As exigências sobem em 1º de
  // janeiro (pontos, idades, tabela do art. 142), e a busca de mês em mês pulava a janela que fecha em 31/12;
  // dentro do ano elas são fixas e idade, tempo e contribuições só crescem: acha o primeiro ano cujo último
  // dia cumpre e, nele, o primeiro dia
  const _apoPrim = (desde, ate, teste) => { if(!desde || desde > ate) return null;
    for(let y = anoDe(desde), k = 0, yMax = Math.min(anoDe(ate), y + 60); y <= yMax; y++, k++){
      const ini = k ? `${y}-01-01` : desde; if(ini > ate) return null;
      const fim = `${y}-12-31` < ate ? `${y}-12-31` : ate;
      if(teste(fim)){ const r = quandoCumpre(ini, d => d >= fim || teste(d)); return r && r < fim ? r : fim; }
    }
    return null; };
  const _apoCarLinha = (x, ex, exTxt) => {
    const c = _apoCar(x, x.der);
    if(!c) return {est:"informar", txt:"leia o CNIS ou informe as contribuições para carência"};
    // F235 · o carnê pago em atraso só pesa quando a carência depende dele: 382 meses de empregado já passam das 180
    const semCi = c.fonte==="CNIS" && _apoTemCi(x) ? c.n - _apoCiMeses(x) : null;
    const ok = c.n >= ex, ci = semCi!=null && semCi < ex && !String(x.v.apo_ci_atraso||"").trim(), nt = [];
    if(c.interc) nt.push(`inclui ${c.interc} ${c.interc===1?"mês":"meses"} de benefício por incapacidade intercalado (IN 128, art. 193)`);
    if(c.atr) nt.push(`sem ${c.atr} de CI ou facultativo pagas em atraso (Lei 8.213, art. 27, II)`);
    if(c.compl) nt.push(`com ${c.compl===1 ? "o mês completado" : `os ${c.compl} meses completados`} até o mínimo`);
    if(c.proj) nt.push(`com ${c.proj} a pagar até a DER`);
    if(semCi!=null && semCi >= ex) nt.push(`sem contar o carnê já são ${semCi}, mais que as ${ex}: o carnê não precisa ser conferido para a carência`);
    if(ci) nt.push("pergunte se algum mês do carnê foi pago em atraso antes de começar a pagar em dia: esse mês não conta para a carência (Lei 8.213, art. 27, II); a data de pagamento de cada guia está no CNIS");
    if(x.v.car_reingresso==="Sim") nt.push("o art. 27-A (metade no reingresso) não vale para aposentadoria (Lei 10.666/2003, art. 3º, § 1º)");
    const lic = c.fonte==="CNIS" ? [...mesesDeLicenca(licencasDaRais(x.fd.rais))].filter(k=>((x.ct||{}).periodos||[]).some(([a, b])=>k>=a && k<=b)).length : 0;
    if(lic) nt.push(`sem os ${lic} ${lic===1?"mês":"meses"} da licença sem remuneração da RAIS, que o INSS desconta, seriam ${c.n - lic}`);
    const pend = !_apoSegue(x) && c.fonte==="CNIS" ? _apoPend(x, true) : 0;
    if(pend) nt.push(`o benefício por incapacidade (${pend} ${pend===1?"mês":"meses"}) passa a contar se voltar a pagar o INSS: seriam ${c.n + pend}`);
    // F235 · o vínculo com pendência (PEXT) está na conta do CNIS, mas o INSS só o conta depois de provado
    const pextVs = c.fonte==="CNIS" ? ((x.g||{}).vinculos||[]).filter(v=>v.tipo!=="Benefício" && (v.indicadores||[]).some(i=>/^PEXT/.test(String(i)))) : [];
    const pext = pextVs.reduce((n, v)=>{ const a = ymDe(isoBr(v.inicio||"")), b = ymDe(isoBr(v.fim||"") || isoBr(fimDoMes(v.ultRemun||"")) || x.der); return n + (a && b && a <= b ? mesesEntreYm(a, b) : 0); }, 0);
    // F235 · sem a prova, quando viria a última contribuição (pagando todo mês e completando o mínimo do ano), e o pedido da carteira
    if(pext){ const semP = c.n - pext, need = ex - semP - (x.v.apo_compl ? 0 : _apoAbaixoAno(x).length), ini = _apoIniProj(x);
      const c180 = need > 0 && ini ? _mmaa(ymDe(somarMeses(ini+"-01", need - 1))) : "";
      nt.push(`${pext} ${pext===1 ? "delas é" : "delas são"} do vínculo com pendência (PEXT) em ${pextVs.map(v=>tituloOrgao(v.origem||"")).join(", ")}: só ${pext===1 ? "vale" : "valem"} depois de provado; sem ${pext===1 ? "ela" : "elas"}, ${semP}${c180 ? `, e a ${ex}ª contribuição só viria na competência ${c180}, pagando todo mês: a data do direito depende dessa prova` : ""}; traga a carteira de trabalho com o contrato e a saída na ${pextVs.map(_apoPextOnde).join(" e na ")}, a rescisão, os holerites e o extrato do FGTS do período`); }
    const riscoPext = ok && pext && c.n - pext < ex;
    const quando = ok ? null : _apoPrim(x.der, FIM, d => _apoN(x, d) >= ex);
    return {est: !ok ? "falta" : riscoPext ? "risco" : ci ? "informar" : "ok", fonte:c.fonte, ...(quando ? {quando} : {}),
      txt:`${c.n} ${c.n===1?"contribuição":"contribuições"} até ${fmtBarra(x.der)}; exige ${ex}${exTxt||""}${ok ? "" : `, faltam ${ex - c.n}`}${nt.length ? `; ${nt.join("; ")}` : ""}`};
  };
  // acumulação: impedido só com aposentadoria em manutenção; o resto é opção ou nota
  const _apoVed = (x, notas) => {
    const at = (x.benefCnis||[]).filter(b=>b.ativo), esp = b => String(b.especie);
    const apo = x.apos || at.find(b=>/^(41|42|46|57|32|92)$/.test(esp(b)));
    if(apo) return {est:"impedido", txt:`já recebe aposentadoria (espécie ${apo.especie}${apo.nb ? `, NB ${apo.nb}` : ""}): não se acumula outra do RGPS (Lei 8.213, art. 124, II)`, fonte:"CNIS"};
    const op = [], info = [...(notas||[])];
    for(const b of at){
      if(/^(31|91)$/.test(esp(b))) op.push(`recebe auxílio por incapacidade (B${esp(b)}): não se acumula com aposentadoria e cessa com ela (art. 124, I)`);
      else if(/^(36|94)$/.test(esp(b))) op.push(`recebe auxílio-acidente (B${esp(b)}): cessa na véspera da aposentadoria (art. 86, §§ 1º a 3º); compare os valores`);
      else if(/^(87|88)$/.test(esp(b))) op.push(`recebe BPC (B${esp(b)}): não se acumula com benefício previdenciário (LOAS, art. 20, § 4º); compare os valores`);
      else if(esp(b)==="21") info.push("a pensão por morte se acumula, com redução por faixas (EC 103, art. 24, § 2º)");
    }
    if((x.fd.seguros||[]).flatMap(r=>r.parcelas||[]).some(p=>{ const d = isoBr(p.liberacao||p.pagamento||""); return d && d >= x.der; }))
      op.push("há parcela de seguro-desemprego depois da DER: não se acumula com aposentadoria (art. 124, parágrafo único)");
    if(x.v.apo_outro_regime==="Já aposentado no RPPS") info.push("aposentado no RPPS: as duas coexistem se o tempo não for o mesmo; o tempo usado lá não conta aqui (IN 128, art. 216, VII)");
    else if(x.v.apo_outro_regime==="Tem CTC a averbar") info.push("tempo do RPPS por CTC: lance no quadro Tempos; o tempo certificado não conta em dois regimes (IN 128, art. 216, VII)");
    if(op.length) return {est:"opcao", txt:[...op, ...info].join("; "), fonte:"CNIS"};
    if(!_apoCnisLido(x) && !x.apos) return {est:"informar", txt:"leia o CNIS para ver os benefícios em manutenção"};
    return {est:"ok", txt:["nenhum benefício incompatível no CNIS", ...info].join("; "), fonte:"CNIS"};
  };
  // uma regra entre várias (transições): em ordem se cumpriu até a DER; "informativo" se outra já cumpre
  // F235 · proj(): quando e com quanto a regra que ainda não fecha fecharia, continuando a contribuir (sem projeção, null)
  const _apoRegra = (x, R, k, okTxt, faltaTxt, proj) => {
    const r = R[k];
    if(r.data && r.data <= x.der) return {est:"ok", txt:okTxt(r.data), quando:r.data, fonte:r.fonte};
    const o = Object.entries(R).find(([j, q])=>j!==k && q.vale!==false && q.data && q.data <= x.der);
    let p = null; if(proj){ try{ p = proj(); }catch(e){} }
    const pTxt = p ? `; contribuindo todo mês, cumpre por volta de ${p}` : "";
    if(o) return {est:"info", txt:`não precisa: cumpre ${o[1].rot} desde ${fmtBarra(o[1].data)}; por esta regra, ${faltaTxt()}${pTxt}`, fonte:r.fonte};
    return {est:"falta", txt: faltaTxt() + (r.data ? `; cumpre em ${fmtBarra(r.data)}` : "") + pTxt, ...(r.data ? {quando:r.data} : {}), fonte:r.fonte};
  };
  // a data em que a regra se cumpre também com a carência (para o quando do benefício)
  // art. 142: a tabela é a do ano em que se implementaram todas as condições (o direito adquirido), e não a da DER
  const _apoAnoCar = (x, rs) => { const d = rs.filter(r=>r.vale!==false && r.data && r.data <= x.der).map(r=>r.data).sort()[0]; return anoDe(d || x.der); };
  const _apoComCar = (x, r) => r.comCar ? r.data : _apoPrim(r.desde, r.ate || FIM, d => r.teste(d) && _apoN(x, d) >= _apoExig(x, anoDe(d)));
  const _apoQualidade = x => { const g = x.gr; return !g ? "" : g.semLimite ? "benefício em manutenção" : g.vencida ? `perdeu a qualidade em ${fmtBarra(g.perda)}` : g.mantidaAte ? `qualidade mantida até ${fmtBarra(g.mantidaAte)}` : ""; };

  // ── idade (B41) ─────────────────────────────────────────────────────────
  // a data em que a idade se cumpre: homem 65; mulher filiada até 13/11/2019, a escada do art. 18, § 1º
  // (60 até 2019, mais 6 meses por ano), pelo ano em que completa a idade daquele ano; filiada depois, 62
  const _idaIdade = x => { if(!x.dn) return null;
    const f = _apoFil(x), antes = !f || f.iso <= EC103;
    if(x.sx!=="F") return {data:dataDaIdade(x.dn, 65), exig:65, regra:"65 anos, homem (art. 18, I, e art. 19)", f};
    if(!antes) return {data:dataDaIdade(x.dn, 62), exig:62, regra:"62 anos, mulher filiada depois de 13/11/2019 (art. 19)", f};
    const data = _apoPrim(dataDaIdade(x.dn, 60), FIM, d => dataDaIdade(x.dn, idadeArt18(anoDe(d), "F")) <= d), exig = idadeArt18(anoDe(data), "F");
    return {data, exig, regra: data <= EC103 ? "60 anos, mulher, até 13/11/2019" : `${_apoAnosMeses(exig)} em ${anoDe(data)}, escada do art. 18, § 1º`, f, escada:true}; };
  const _idaTempoEx = x => { const f = _apoFil(x); return f && f.iso > EC103 && x.sx!=="F" ? 20 : 15; };
  const _idaCarEx = x => x.dn ? _apoExig(x, anoDe(dataDaIdade(x.dn, [65,60][x.i]))) : 180;
  // F235 · os meses pagos abaixo do mínimo depois da Reforma: os do ano corrente se completam até 31/12, no mesmo ano (EC 103,
  // art. 29, parágrafo único), com os acréscimos da guia (Decreto 3.048, art. 19-E, § 3º); os de anos passados, o Decreto permite
  // completar a qualquer tempo (§ 2º) e o advogado decide. Diz o custo e a data do direito com e sem a diferença
  const _apoMinimoLinha = x => {
    if(!x.an) return {est:"informar", txt:"leia o CNIS (PDF) para ver os meses pagos abaixo do mínimo"};
    const ab = _apoAbaixoLista(x), lista = l => l.map(a=>a.comp).join(l.length===2 ? " e " : ", ");
    if(!ab.length) return {est:"ok", fonte:"CNIS", txt:"nenhum mês pago abaixo do mínimo depois de 11/2019"};
    if(x.v.apo_compl==="Sim") return {est:"ok", fonte:"campo", txt:`${lista(ab)} ${ab.length===1 ? "foi completado e conta" : "foram completados e contam"}`};
    const ano = _apoAbaixoAno(x), velhos = ab.filter(a=>!ano.includes(a)), al = _apoAliqDe(x), fim = `${anoDe(x.hoje)}-12-31`, ps = [];
    if(ano.length){ const dif = ano.map(a=>Math.max(0, (+a.minimo||0) - (+a.valor||0))), igual = dif.every(d=>Math.abs(d - dif[0]) < 0.005);
      const custo = igual ? `${al} % de ${moeda(dif[0])}, cerca de ${moeda(dif[0]*al/100)} por mês` : `${al} % da diferença de cada mês, cerca de ${moeda(dif.reduce((s, d)=>s + d*al/100, 0))} ao todo`;
      ps.push(`prazo correndo: ${lista(ano)} ${ano.length===1 ? "foi pago" : "foram pagos"} abaixo do mínimo${ano[0].valor ? ` (sobre ${moeda(+ano[0].valor)}; o mínimo é ${moeda(+ano[0].minimo)})` : ""} e só ${ano.length===1 ? "conta" : "contam"} com a diferença paga até ${fmtBarra(fim)}, no mesmo ano (EC 103, art. 29, parágrafo único): ${custo}, com os acréscimos da guia (Decreto 3.048, art. 19-E, § 3º)`); }
    if(velhos.length) ps.push(`${lista(velhos)}, de ${velhos.length===1 ? "ano passado" : "anos passados"}: a EC 103 fala em ajuste no mesmo ano e o Decreto 3.048 (art. 19-E, § 2º) permite completar a qualquer tempo, com acréscimos; o advogado decide`);
    if(x.v.apo_compl!=="Não"){ const q = (REQ_EXTRA.idade||{}).quando, ex = _idaCarEx(x);
      let com = null, sem = null; try{ com = q(ctxComV(x, {apo_segue:"Sim", apo_compl:"Sim"})); sem = q(ctxComV(x, {apo_segue:"Sim", apo_compl:"Não"})); }catch(e){}
      const c = _apoCar(ctxComV(x, {apo_compl:"Sim"}), x.der), ini = _apoIniProj(x);
      const c180 = c && c.n < ex && ini ? _mmaa(ymDe(somarMeses(ini+"-01", ex - c.n - 1))) : "";
      if(com) ps.push(`com a diferença${c ? `, ${c.n} contribuições hoje` : ""}${c180 ? ` e a ${ex}ª na competência ${c180}` : ""}, o direito em ${fmtBarra(com)}${sem && sem!==com ? `; sem ela, só em ${fmtBarra(sem)}` : ""}${_apoSegue(x) ? "" : ", pagando todo mês"}`); }
    return {est: ano.length ? "risco" : "falta", fonte:"CNIS", ...(ano.length ? {quando:fim} : {}), txt:ps.join("; ")};
  };
  registrarReq("idade", [
    {id:"filiacao_marco", rot:"Quando a pessoa começou a contribuir: antes ou depois de 13/11/2019?", base:"EC 103/2019, arts. 18 e 19; IN 128/2022, arts. 249 e 317",
     conf:"conferido", campos:["apo_filiacao"],
     mede:x=>{ const f = _apoFil(x);
       if(!f) return {est:"informar", txt:"informe a primeira filiação (ou leia o CNIS); período rural ou de RPPS anterior ao CNIS antecipa a filiação"};
       const nota = f.fonte==="quadro Tempos" ? "; a data é a da linha mais antiga do quadro Tempos, anterior ao CNIS" : "";
       return f.iso <= EC103
         ? {est:"info", fonte:f.fonte, txt:`filiado em ${fmtBarra(f.iso)}, até 13/11/2019: vale a transição do art. 18 (15 anos de contribuição, homem e mulher); a permanente só se for mais vantajosa (IN 128, art. 249, § 1º)${nota}`}
         : {est:"info", fonte:f.fonte, txt:`filiado em ${fmtBarra(f.iso)}, depois de 13/11/2019: vale a regra permanente do art. 19 (${x.sx==="F" ? "62 anos e 15 anos de contribuição" : "65 anos e 20 anos de contribuição"})${nota}`}; }},
    {id:"idade_minima", rot:"Já tem a idade mínima (65 anos o homem; 62 a mulher, menos para quem a completou entre 2019 e 2022)?", base:"EC 103/2019, art. 18, I e § 1º, e art. 19; IN 128/2022, art. 317, I e § 1º, e art. 249, I",
     conf:"conferido", campos:["der"],
     mede:x=>{ const r = _idaIdade(x);
       if(!r) return {est:"informar", txt:"sem a data de nascimento na ficha"};
       if(!r.f && r.escada && r.data < dataDaIdade(x.dn, 62) && dataDaIdade(x.dn, 62) > x.der)
         return {est:"informar", txt:`confirme a filiação: filiada até 13/11/2019, a idade se cumpre em ${fmtBarra(r.data)} (${r.regra}); filiada depois, só aos 62`, quando:r.data};
       return r.data <= x.der
         ? {est:"ok", txt:`cumprida em ${fmtBarra(r.data)}: ${r.regra}; na DER tem ${_apoIdade(x.dn, x.der)}`, quando:r.data, fonte:"ficha"}
         : {est:"falta", txt:`completa a idade em ${fmtBarra(r.data)}: ${r.regra}; na DER (${fmtBarra(x.der)}) tem ${_apoIdade(x.dn, x.der)}`, quando:r.data, fonte:"ficha"}; }},
    {id:"tempo_minimo", rot:"Tem o tempo mínimo de contribuição: 15 anos (20 para o homem que começou depois da Reforma)?", base:"EC 103/2019, art. 18, II, e art. 19, caput; IN 128/2022, art. 317, II, art. 249, II, e art. 216, § 1º e IV",
     // F235 · o campo do mínimo mudou para o requisito minimo_reforma
     conf:"conferido", campos:["apo_segue"],
     mede:x=>{ const t = _apoTempo(x, x.der), f = _apoFil(x);
       if(x.der <= EC103) return {est:"info", txt:`DER em ${fmtBarra(x.der)}, até 13/11/2019: a regra anterior (Lei 8.213, art. 48) pedia só a idade e a carência, sem tempo mínimo próprio`};
       if(!t) return {est:"informar", txt:"lance os períodos no quadro Tempos ou leia o CNIS"};
       if(!f && x.sx!=="F" && t.dias >= 15*ANO && t.dias < 20*ANO)
         return {est:"informar", txt:`${tempoFmt(t.dias)}: bastam 15 anos se filiado até 13/11/2019 (art. 18); 20 se depois (art. 19); confirme a filiação`, fonte:t.fonte};
       const ex = _idaTempoEx(x), ok = t.dias >= ex*ANO, nt = [];
       if(t.interc) nt.push(`inclui ${tempoFmt(t.interc)} de benefício por incapacidade intercalado (IN 128, art. 216, IV)`);
       const pendT = !_apoSegue(x) && t.fonte==="CNIS" ? _apoPend(x, false) : 0;
       if(pendT) nt.push(`o benefício por incapacidade (${pendT} ${pendT===1?"mês":"meses"}) passa a contar se voltar a pagar o INSS`);
       if(t.abaixo) nt.push(`fora ${t.abaixo} ${t.abaixo===1?"competência":"competências"} abaixo do mínimo depois de 11/2019, sem complemento (EC 103, art. 29)`);
       if(_apoAliqSinal(x) || _apoComps(x.v.tra_aliq_comps).n) nt.push("as contribuições a 5 %, 11 % ou 12 % contam nesta aposentadoria (IN 128, art. 216, § 1º)");
       if(x.v.apo_outro_regime==="Já aposentado no RPPS") nt.push("o tempo usado na aposentadoria do RPPS não conta (IN 128, art. 216, VII)");
       const quando = ok ? null : _apoPrim(x.der, FIM, d => (_apoTempo(x, d)||{dias:0}).dias >= ex*ANO);
       return {est: ok ? "ok" : "falta", fonte:t.fonte, ...(quando ? {quando} : {}),
         txt:`${tempoFmt(t.dias)} até ${fmtBarra(x.der)}; exige ${ex} anos (${!f ? "art. 18 ou art. 19" : f.iso > EC103 ? "art. 19, filiado depois de 13/11/2019" : "art. 18, filiado até 13/11/2019"})${ok ? "" : `, faltam ${tempoFmt(ex*ANO - t.dias)}`}${nt.length ? `; ${nt.join("; ")}` : ""}`}; }},
    {id:"carencia_180", rot:"Tem 180 contribuições mensais de carência?", base:"Lei 8.213/91, art. 25, II, art. 27, II, e art. 142; IN 128/2022, arts. 193, 199 e 318",
     conf:"conferido", campos:["car_cumprida","apo_ci_atraso"],
     mede:x=>{ const ano = x.dn ? anoDe(dataDaIdade(x.dn, [65,60][x.i])) : anoDe(x.der); return _apoCarLinha(x, _idaCarEx(x), _apoExigTxt(x, ano)); }},
    // F235 · o mês pago abaixo do mínimo: o prazo de completar (31/12 do ano), o custo e a data com e sem a diferença
    {id:"minimo_reforma", rot:"Os meses pagos abaixo do mínimo depois da Reforma foram completados?", base:"EC 103/2019, art. 29 e parágrafo único; Decreto 3.048/99, art. 19-E, §§ 2º e 3º",
     conf:"conferido", campos:["apo_compl"], mede:x=>_apoMinimoLinha(x)},
    {id:"qualidade_dispensada", rot:"Não precisa estar contribuindo hoje", base:"Lei 10.666/2003, art. 3º, § 1º; Portaria DIRBEN 991/2022, art. 60",
     conf:"conferido", campos:[],
     mede:x=>{ const c = _apoCar(x, x.der), q = _apoQualidade(x);
       if(c && c.n >= _idaCarEx(x)) return {est:"ok", fonte:"CNIS", txt:`com a carência cumprida na DER, a perda da qualidade não conta (Lei 10.666/2003, art. 3º, § 1º)${q ? `; ${q}` : ""}`};
       return {est:"info", txt:`a perda da qualidade deixa de contar quando a carência estiver cumprida na DER (Lei 10.666/2003, art. 3º, § 1º)${q ? `; ${q}` : ""}`}; }},
    {id:"direito_adquirido_idade", rot:"Já tinha o direito antes da Reforma (até 13/11/2019)?", base:"EC 103/2019, art. 3º; IN 128/2022, art. 316 (cálculo no art. 233, III)",
     conf:"conferido", campos:[],
     mede:x=>{ if(!x.dn) return {est:"informar", txt:"sem a data de nascimento na ficha"};
       const id = [65,60][x.i], d0 = dataDaIdade(x.dn, id);
       if(d0 > EC103) return {est:"info", fonte:"ficha", txt:`em 13/11/2019 tinha ${_apoIdade(x.dn, EC103)}; a regra anterior exigia ${id}: sem direito adquirido`};
       const ex = _apoExig(x, anoDe(d0)), c19 = _apoCar(x, EC103);
       if(!c19) return {est:"informar", txt:`tinha ${id} anos em 13/11/2019; leia o CNIS para saber se tinha a carência`};
       const data = _apoPrim(d0, EC103, d => _apoN(x, d) >= ex);
       return data ? {est:"ok", quando:data, fonte:c19.fonte, txt:`direito adquirido desde ${fmtBarra(data)}: ${id} anos e ${ex} contribuições${_apoExigTxt(x, anoDe(d0))} pela regra anterior (cálculo do art. 233, III)`}
         : {est:"info", fonte:c19.fonte, txt:`tinha a idade, mas ${c19.n} contribuições em 13/11/2019 (exigia ${ex}): sem direito adquirido`}; }},
    {id:"vedacao_acumulacao", rot:"Já recebe outra aposentadoria ou benefício que não se acumula?", base:"Lei 8.213/91, art. 124, I, II e parágrafo único, e art. 86, §§ 1º a 3º; EC 103/2019, art. 24",
     conf:"conferido", campos:["apo_outro_regime"], mede:x=>_apoVed(x)},
  ], {apo_outro_regime:["Tempo ou aposentadoria em regime próprio", "select", ["","Não","Tem CTC a averbar","Já aposentado no RPPS"]],
      apo_compl:["Competências abaixo do mínimo depois de 13/11/2019 complementadas ou agrupadas", "select", SN],
      // F235 · a pergunta à cliente, e onde ver a data de pagamento
      apo_ci_atraso:["Algum mês do carnê foi pago em atraso antes de começar a pagar em dia? Quais (ex.: 01/2010 a 06/2010, ou \"nenhum\")? A data de pagamento de cada guia está no CNIS", "text"]},
  {pre:_APO_PRE, resumo:"Aposenta quem chegou à idade mínima e tem pelo menos 15 anos de contribuição (20, para o homem que só começou a contribuir depois de 13/11/2019), com 180 meses de carência; não precisa estar contribuindo hoje.",
   // F235 · o "sim" diz que o pagamento começa no pedido e quanto vale; o "ainda não" diz quando, e só pede a resposta que muda a data
   veredito: (x, a) => { if(!x.dn || _apoVed(x).est==="impedido") return null;
     const t = _apoTempo(x, x.der);
     if(a.quando && a.quando <= x.hoje) return {tom:"sim", txt:`Já pode se aposentar? Sim, desde ${fmtBarra(a.quando)}. O pagamento começa no dia do pedido (Lei 8.213, art. 49): não há atrasados de antes, e cada mês sem pedir é um mês a menos. Peça já.${t ? ` Valor estimado: ${_apoPctTxt(x, t.dias)}, nunca menos que o salário mínimo.` : ""}`};
     const r = _idaIdade(x), c = _apoCar(x, x.der), ex = _idaCarEx(x), tex = _idaTempoEx(x), ps = [];
     if(r && r.data > x.der) ps.push(`faz ${r.exig} anos em ${fmtBarra(r.data)}`);
     if(c && c.n < ex) ps.push(`tem ${c.n} das ${ex} contribuições`);
     if(t && t.dias < tex*ANO) ps.push(`tem ${tempoFmt(t.dias)} dos ${tex} anos de contribuição`);
     if(!ps.length) return null;
     if(ps.length===1 && r && r.data > x.der) return {tom:"ainda", txt:`Já pode se aposentar? Ainda não: faz ${r.exig} anos em ${fmtBarra(r.data)}, a data do direito. Tempo e carência já estão cumpridos, pagando ou não.`};
     const pend = !_apoSegue(x) && c && c.fonte==="CNIS" ? _apoPend(x, true) : 0, ab = !x.v.apo_compl && _apoAbaixoAno(x).length;
     const extra = _apoSegue(x) ? (a.quando ? ` Pagando em dia${ab ? ` e completando até ${fmtBarra(`${anoDe(x.hoje)}-12-31`)} os meses pagos abaixo do mínimo` : ""}, alcança em ${fmtBarra(a.quando)}.` : "")
       : `${pend ? ` Se voltar a pagar, os ${pend} meses de benefício por incapacidade passam a contar.` : ""} Responda "${CAMPO_AD.apo_segue[0].replace(/\s*\(.*$/, "")}" para ver a data em que alcança.`;
     return {tom:"ainda", txt:`Já pode se aposentar? Ainda não: ${ps.join("; ")}.${extra}`}; },
   // F235 · o que fazer já: provar o vínculo com pendência, completar o mínimo do ano e seguir pagando; a data vai a Aposentadorias futuras
   agora: (x, a) => { if(!x.dn || (a.quando && a.quando <= x.hoje)) return [];
     const out = [], ab = x.v.apo_compl ? [] : _apoAbaixoAno(x), c = _apoCar(x, x.der), ex = _idaCarEx(x), pvs = _apoPextVs(x);
     if(pvs.length) out.push(`Pedir já o acerto do CNIS da ${pvs.map(_apoPextOnde).join(" e da ")} com a carteira de trabalho, a rescisão e os holerites: RAC Vínculos (Anexo I-B). Sem a prova, esse tempo não conta.`);
     if(pvs.length && !(x.fd.rais||[]).length) out.push("Rodar o Emprega Brasil no dossiê: a RAIS do período ajuda a provar o vínculo com pendência.");
     if(ab.length) out.push(`Pagar a diferença de ${ab.map(z=>z.comp).join(" e ")} até ${fmtBarra(`${anoDe(x.hoje)}-12-31`)}: depois disso não se pode mais (EC 103, art. 29, parágrafo único).`);
     if(c && c.n < ex && _apoSegue(x)){ const ini = _apoIniProj(x), n = c.n + ab.length, fimC = ini && n < ex ? ymDe(somarMeses(ini+"-01", ex - n - 1)) : "";
       out.push(`Continuar pagando o INSS todo mês, até o dia 15 do mês seguinte${fimC ? `, da competência ${_mmaa(ini)} à ${_mmaa(fimC)} (${ex - n} meses)` : ""}: cada mês sem pagar adia a aposentadoria.`); }
     if(a.quando && a.quando > x.hoje) out.push(`Enviar a Aposentadorias futuras com a data provável de ${fmtBarra(a.quando)}: o aviso sai em ${fmtBarra(avisoApos(a.quando))}, e o pedido de documentos, em ${fmtBarra(avisoDocs(a.quando))}.`);
     return out; },
   // F235 · a linha do desfecho: o que se faz agora e, depois, Aposentadorias futuras com a data provável e o que a muda
   desfecho: (x, a) => { if(!x.dn || !a.quando || a.quando <= x.hoje || !_apoSegue(x)) return null;
     const ab = x.v.apo_compl ? [] : _apoAbaixoAno(x), alt = [], ag = [], pvs = _apoPextVs(x), c = _apoCar(x, x.der), ex = _idaCarEx(x);
     if(pvs.length) ag.push(`pedir já o acerto do CNIS da ${pvs.map(_apoPextOnde).join(" e da ")} com a carteira de trabalho (RAC Vínculos, Anexo I-B)`);
     if(ab.length) ag.push(`pagar a diferença de ${ab.map(z=>z.comp).join(" e ")} até ${fmtBarra(`${anoDe(x.hoje)}-12-31`)}`);
     if(c && c.n < ex){ const ini = _apoIniProj(x), n = c.n + ab.length, fimC = ini && n < ex ? ymDe(somarMeses(ini+"-01", ex - n - 1)) : "";
       ag.push(`pagar o INSS todo mês${fimC ? `, de ${_mmaa(ini)} a ${_mmaa(fimC)}` : ""}`); }
     if(ab.length){ let sem = null; try{ sem = REQ_EXTRA.idade.quando(ctxComV(x, {apo_compl:"Não"})); }catch(e){} if(sem && sem!==a.quando) alt.push(`sem a diferença, só em ${fmtBarra(sem)}`); }
     const m = (_apoCarLinha(x, _idaCarEx(x), "").txt.match(/só viria na competência (\d{2}\/\d{4})/)||[])[1];
     if(m) alt.push(`sem provar o vínculo com pendência, a ${_idaCarEx(x)}ª contribuição só na competência ${m}`);
     const r = _idaIdade(x), t = _apoTempo(x, x.der);
     if(!ag.length && !ab.length && c && c.n >= ex && t && t.dias >= _idaTempoEx(x)*ANO && r && r.data===a.quando)
       return {acao:"lembrete", data:a.quando, txt:`envie a Aposentadorias futuras: direito em ${fmtBarra(a.quando)}, quando faz ${r.exig} anos; o tempo e a carência já estão cumpridos, pagando ou não`};
     return {acao:"lembrete", data:a.quando, txt:`${ag.length ? `agora, ${ag.join("; ")}. Depois, e` : "e"}nvie a Aposentadorias futuras: direito provável em ${fmtBarra(a.quando)}${ab.length ? `, se pagar a diferença até ${fmtBarra(`${anoDe(x.hoje)}-12-31`)} e o INSS em dia` : ", pagando o INSS em dia"}${alt.length ? `; ${alt.join("; ")}` : ""}`}; },
   quando: x => { if(!x.dn || _apoVed(x).est==="impedido") return null;
     // F235 · as linhas automáticas se refazem com o v da conta (a projeção abre a última linha de carnê), e o mês do ano corrente
     // pago abaixo do mínimo entra completado: o plano é pagar a diferença até 31/12 (a resposta "Não" o tira)
     x = ctxComV(x, !x.v.apo_compl && _apoAbaixoAno(x).length ? {apo_compl:"Sim"} : {});
     const f = _apoFil(x), antes = !f || f.iso <= EC103, ex = _idaCarEx(x), tem = d => (_apoTempo(x, d)||{dias:-1}).dias;
     return _apoPrim(dataDaIdade(x.dn, antes ? [65,60][x.i] : [65,62][x.i]), FIM, d => d <= EC103 ? _apoN(x, d) >= ex
       : antes ? dataDaIdade(x.dn, idadeArt18(anoDe(d), x.sx)) <= d && _apoN(x, d) >= ex && tem(d) >= 15*ANO
       : dataDaIdade(x.dn, [65,62][x.i]) <= d && _apoN(x, d) >= 180 && tem(d) >= [20,15][x.i]*ANO); }});

  // ── transicao (B42) ─────────────────────────────────────────────────────
  const _traRegras = x => _apoM(x, "tra", () => {
    const T = [35,30][x.i]*ANO, tem = d => (_traTempo(x, d)||{dias:0}).dias, f = _apoFil(x), dn = x.dn;
    const t19 = tem(EC103), t98 = tem(EC20), Tp = [30,25][x.i]*ANO, Tprop = _aoDia(Tp + 0.4*Math.max(0, Tp - t98));
    // F235 · o tempo dos pedágios ao dia, como na conta de data a data
    const ex50 = _aoDia(T + 0.5*Math.max(0, T - t19)), ex100 = _aoDia(T + Math.max(0, T - t19));
    const ped50 = t19 > [33,28][x.i]*ANO, depois = !!(f && f.iso > EC103), fonte = (_traTempo(x, x.der)||{}).fonte;
    const car = d => _apoN(x, d) >= _apoExig(x, anoDe(d));
    const R = {
      integral: {rot:"o direito adquirido", comCar:true, desde: f && f.iso, ate:EC103, teste: d => tem(d) >= T && car(d)},
      proporcional: {rot:"a proporcional", comCar:true, vale: x.v.tra_proporcional_ok==="Sim", desde: f && f.iso, ate:EC103,
        teste: d => !!(f && f.iso <= EC20 && dn) && dataDaIdade(dn, [53,48][x.i]) <= d && tem(d) >= Tprop && car(d)},
      pontos: {rot:"a regra dos pontos", desde: dn && DEPOIS, teste: d => tem(d) >= T && anosEntre(dn, d) + tem(d)/ANO >= pontosExig(anoDe(d), x.sx)},
      idade: {rot:"a idade progressiva", desde: dn && DEPOIS, teste: d => tem(d) >= T && dataDaIdade(dn, idadeProgExig(anoDe(d), x.sx)) <= d},
      // F235 · os pedágios contra o tempo exigido ao dia
      ped50: {rot:"o pedágio de 50 %", desde: ped50 && DEPOIS, teste: d => tem(d) >= ex50},
      ped100: {rot:"o pedágio de 100 %", desde: dn && DEPOIS, teste: d => dataDaIdade(dn, [60,57][x.i]) <= d && tem(d) >= ex100},
    };
    for(const r of Object.values(R)){ r.fonte = fonte; r.data = depois || !fonte ? null : _apoPrim(r.desde, r.ate || FIM, r.teste); }
    // F235 · o tempo exigido de cada pedágio vai junto, para o texto usar o mesmo número da conta
    return {T, t19, t98, Tp, Tprop, ped50, ex50, ex100, depois, fonte, tem, R};
  });
  // F235 · a regra que só se cumpriria pagando até depois dos 75 anos não é caminho: "não serve", fora da conta
  const _traLonge = (x, g, ex) => { if(!x.dn) return null; const t = g.tem(x.hoje), falta = ex - t; if(falta <= 0) return null;
    const aos = anosEntre(x.dn, x.hoje) + falta/ANO;
    return aos > 75 ? {est:"info", fonte:g.fonte, txt:`Não serve: exige ${tempoFmt(ex)} de contribuição e a pessoa tem ${tempoFmt(t)}; mesmo pagando todo mês, completaria com ${Math.floor(aos)} anos`} : null; };
  // F235 · o carnê de 5, 11 ou 12 % sem complemento: o que a complementação faria (a regra que fecha, os meses até ela e o custo)
  const _traCompl = x => _apoM(x, "trc", () => {
    if(x.v.tra_aliq_compl==="Sim") return null;
    const p = _apoComps(x.v.tra_aliq_comps); if(!p.n || !p.meses) return null;
    const g = _traRegras(x), g2 = _traRegras(ctxComV(x, {tra_aliq_compl:"Sim"}));
    const [k, r] = Object.entries(g2.R).filter(([, r])=>r.vale!==false && r.data).sort((a, b)=>a[1].data < b[1].data ? -1 : 1)[0] || [];
    const ate = ymDe(r ? r.data : x.hoje), meses = p.meses.filter(m=>m <= ate).sort(), al = _apoAliqDe(x), dif = (20 - al)/100;
    if(!meses.length) return null;   // F235 · nenhum mês de carnê reduzido antes da data do direito: nada a complementar
    const custo = meses.reduce((s, m)=>s + dif*(salarioMinimo(_mmaa(m)) || 0), 0);
    const faixa = l => !l.length ? "" : l.length===1 ? _mmaa(l[0]) : `${_mmaa(l[0])} a ${_mmaa(l[l.length-1])}`;
    const valor = !r ? "" : k==="ped100" ? "100 % da média" : k==="ped50" ? "fator previdenciário" : _apoPctTxt(x, g2.tem(r.data > x.der ? r.data : x.der));
    return {p, al, k, r, meses, custo, faixa, valor, sm: dif*(smEm(x.hoje) || 0), t0: g.tem(x.der)}; });
  // F235 · a regra que ainda não fecha: quando fecharia continuando a contribuir, e com quanto (sem carnê reduzido pendente;
  // só quando contribuir adianta a data)
  const _traProjDe = (x, k) => { if(_traCompl(x)) return null;
    const r0 = _traRegras(x).R[k], g = _traRegras(ctxComV(x, {apo_segue:"Sim"})), r = g.R[k];
    if(!r || !r.data || r.data <= x.hoje || (r0.data && r0.data <= r.data)) return null;
    return {data:r.data, curto: k==="ped100" ? "100 %" : k==="ped50" ? "com fator previdenciário" : `${_apoPct(x, g.tem(r.data))} %`,
      longo: k==="ped100" ? "100 % da média" : k==="ped50" ? "fator previdenciário" : _apoPctTxt(x, g.tem(r.data))}; };
  const _traProj = (x, k) => () => { const p = _traProjDe(x, k); return p ? `${_mmaa(ymDe(p.data))}, com ${p.longo}` : null; };
  // o que toda regra de transição pede antes de medir: filiação até 2019, tempo e (quase sempre) nascimento
  const _traPre = (x, g, comIdade) => g.depois ? {est:"info", txt:"não se aplica: filiado depois de 13/11/2019 (só a aposentadoria por idade do art. 19)"}
    : !g.fonte ? {est:"informar", txt:"lance os períodos no quadro Tempos ou leia o CNIS"}
    : comIdade && !x.dn ? {est:"informar", txt:"sem a data de nascimento na ficha"} : null;
  const _traVeredito = (x, a) => { const g = _traRegras(x); if(g.depois || !g.fonte || !x.dn) return null;
    // F235 · com o direito: qual regra, quanto vale e o que custa esperar pelas outras; quem está empregado não precisa sair
    if(a.quando && a.quando <= x.hoje){ const [k, r] = Object.entries(g.R).filter(([, q])=>q.vale!==false && q.data && q.data <= x.hoje).sort((p, q)=>p[1].data < q[1].data ? -1 : 1)[0] || [];
      if(!r) return null;
      const esperar = ["pontos","idade","ped50","ped100"].filter(j=>j!==k).map(j=>{ const p = _traProjDe(x, j); return p ? `${g.R[j].rot} por volta de ${_mmaa(ymDe(p.data))} (${p.curto}, ${plu(Math.max(1, mesesEntreYm(ymDe(x.hoje), ymDe(p.data)) - 1), "mês", "meses")} sem receber)` : null; }).filter(Boolean);
      const emprego = ((x.g||{}).vinculos||[]).some(v=>v.tipo!=="Benefício" && v.aberto && !v.fim && !/individual|facultativ/i.test(v.tipo||""));
      const valor = k==="ped100" ? "100 % da média" : /^(integral|proporcional|ped50)$/.test(k) ? "pela regra anterior, com o fator previdenciário quando couber" : _apoPctTxt(x, g.tem(x.der));
      return {tom:"sim", txt:`Sim: cumpre ${r.rot} desde ${fmtBarra(r.data)}; o pagamento começa no dia do pedido, então peça logo. Valor estimado: ${valor}.${esperar.length ? ` Esperar: ${esperar.join("; ")}.` : ""}${emprego ? " Pode continuar no emprego depois de aposentado." : ""}`}; }
    // F235 · o carnê de 5, 11 ou 12 % sem complemento derruba a conta: o topo diz isso, e o que a complementação faz
    const cp = _traCompl(x);
    if(cp) return {tom:"ainda", txt:`Hoje não: os ${cp.p.n} meses de carnê de ${cp.al} % (${cp.faixa(cp.p.meses.slice().sort())}) não contam para esta aposentadoria; sem eles, ${tempoFmt(cp.t0)} de contribuição. ${cp.r ? `Pagando antes do pedido a diferença até 20 % de ${cp.faixa(cp.meses)}, fecha ${cp.r.rot} em ${fmtBarra(cp.r.data)} (competência ${_mmaa(ymDe(cp.r.data))}), com ${cp.valor}.` : "Mesmo complementando, nenhuma regra fecha ainda."}`};
    const REGRAS = ["direito_adquirido_integral","direito_adquirido_proporcional","pontos_art15","idade_progressiva_art16","pedagio50_art17","pedagio100_art20"];
    if(!a.rs.some(r=>REGRAS.includes(r.id) && r.est!=="info"))
      return {tom:"nao", txt:`Não é caminho: as regras da aposentadoria por tempo de contribuição pedem ${g.T/ANO} anos de contribuição, e a pessoa tem ${tempoFmt(g.tem(x.hoje))}. Veja a aposentadoria por idade (B41).`};
    return a.quando ? {tom:"ainda", txt:`Ainda não: a primeira regra se cumpre em ${fmtBarra(a.quando)}${_apoSegue(x) ? ", pagando todo mês até lá" : ""}.`} : null; };
  // F235 · a complementação, passo a passo, antes do pedido (Documentos e "O que dá para fazer agora")
  const _traAgora = (x, a) => { const cp = _traCompl(x); if(!cp || !cp.r || (a.quando && a.quando <= x.hoje)) return [];
    let id = null; try{ id = REQ_EXTRA.idade.quando(x); }catch(e){}
    return [`Pedir ao INSS o cálculo da complementação de ${cp.faixa(cp.meses)} (de ${cp.al} % para 20 %: ${20 - cp.al} % do mínimo de cada mês, cerca de ${moeda(cp.custo)} antes dos acréscimos; cálculo no Meu INSS ou na Receita).`,
      "Pagar as guias da complementação e guardar os comprovantes.",
      "Só depois pedir a aposentadoria: conta o que for pago até a data do pedido (Portaria DIRBEN 991/2022, art. 150, § 6º).",
      `O advogado compara o custo com os meses ganhos${id ? `: sem complementar, a saída é a aposentadoria por idade em ${fmtBarra(id)}, em que o carnê de ${cp.al} % conta` : ""}.`]; };
  // F235 · o desfecho com o carnê reduzido pendente: não é "pedir já"; responder (ou decidir com o advogado) e só então gerar o caso
  const _traDesfecho = (x, a) => { if(a.quando && a.quando <= x.hoje) return null; const cp = _traCompl(x); if(!cp || !cp.r) return null;
    let id = null; try{ id = REQ_EXTRA.idade.quando(x); }catch(e){}
    const plano = `complementando ${cp.faixa(cp.meses)} para 20 % (cerca de ${moeda(cp.custo)} mais os acréscimos) e pagando antes do pedido, fecha ${cp.r.rot} em ${fmtBarra(cp.r.data)}, com ${cp.valor}: peça ao INSS o cálculo, pague e só então gere o caso`;
    return {acao:"", txt: x.v.tra_aliq_compl==="Não"
      ? `falta responder com o advogado se vale complementar: ${plano}; sem complementar, nenhuma regra desta aposentadoria fecha${id ? `, e a saída é a aposentadoria por idade em ${fmtBarra(id)}` : ""}`
      : `falta responder na Análise de Direito se o carnê de ${cp.al} % foi complementado: sem complementar, nenhuma regra fecha; ${plano}`}; };
  registrarReq("transicao", [
    {id:"filiado_ate_2019", rot:"Contribuiu para o INSS antes de 13/11/2019?", base:"EC 103/2019, arts. 15, 16, 17, 19 e 20; IN 128/2022, arts. 249 e 321 a 324",
     conf:"conferido", campos:["apo_filiacao"],
     mede:x=>{ const f = _apoFil(x);
       if(!f) return {est:"informar", txt:"informe a primeira filiação (ou leia o CNIS); tempo rural, de RPPS ou militar anterior ao CNIS antecipa a filiação"};
       return f.iso <= EC103 ? {est:"ok", fonte:f.fonte, txt:`filiado em ${fmtBarra(f.iso)}: as transições se aplicam`}
         : {est:"impedido", fonte:f.fonte, txt:`filiado em ${fmtBarra(f.iso)}, depois de 13/11/2019: não há transição; só a aposentadoria programada por idade (art. 19)`}; }},
    {id:"direito_adquirido_integral", rot:"Já tinha 35 anos (homem) ou 30 anos (mulher) de contribuição em 13/11/2019?", base:"EC 103/2019, art. 3º; IN 128/2022, art. 320; Lei 8.213/91, art. 29-C, caput e § 2º, I",
     conf:"conferido", campos:[],
     mede:x=>{ const g = _traRegras(x), r = g.R.integral;
       if(!g.fonte) return {est:"informar", txt:"lance os períodos no quadro Tempos ou leia o CNIS"};
       if(r.data){ const p = x.dn ? anosEntre(x.dn, EC103) + g.t19/ANO : null;
         return {est:"ok", quando:r.data, fonte:g.fonte, txt:`tinha ${g.T/ANO} anos de contribuição e a carência em ${fmtBarra(r.data)}: direito adquirido pela regra anterior, sem idade; ${p==null ? "fator previdenciário a conferir (sem nascimento)" : p >= [96,86][x.i] ? `sem fator previdenciário (${_apoPts(p)} pontos em 13/11/2019, art. 29-C)` : `com fator previdenciário (${_apoPts(p)} pontos em 13/11/2019, abaixo de ${[96,86][x.i]})`}`}; }
       const c19 = _apoN(x, EC103);
       if(g.t19 >= g.T && c19 < 0) return {est:"informar", fonte:g.fonte, txt:`tinha ${tempoFmt(g.t19)} em 13/11/2019; leia o CNIS para conferir a carência até essa data`};
       return {est:"info", fonte:g.fonte, txt:`em 13/11/2019 tinha ${tempoFmt(g.t19)}${c19 >= 0 ? ` e ${c19} contribuições` : ""}; exigia ${g.T/ANO} anos e a carência: sem direito adquirido`}; }},
    {id:"direito_adquirido_proporcional", rot:"Tinha direito à aposentadoria proporcional antes da Reforma?", base:"EC 20/1998, art. 9º, § 1º; IN 128/2022, art. 319 (§ 2º: concordância)",
     conf:"conferido", campos:["tra_proporcional_ok"],
     mede:x=>{ const g = _traRegras(x), r = g.R.proporcional, f = _apoFil(x);
       if(!f) return {est:"informar", txt:"informe a primeira filiação: a proporcional é só de quem se filiou até 16/12/1998"};
       if(f.iso > EC20) return {est:"info", fonte:f.fonte, txt:`não se aplica: filiado em ${fmtBarra(f.iso)}, depois de 16/12/1998`};
       if(!g.fonte) return {est:"informar", txt:"lance os períodos no quadro Tempos ou leia o CNIS"};
       if(!x.dn) return {est:"informar", txt:"sem a data de nascimento na ficha"};
       const ex = `${[53,48][x.i]} anos de idade e ${tempoFmt(g.Tprop)} de contribuição (${g.Tp/ANO} anos e 40 % do que faltava em 16/12/1998)`;
       if(!r.data){
         const semCar = _apoN(x, EC103) < 0 && _apoPrim(f.iso, EC103, d => dataDaIdade(x.dn, [53,48][x.i]) <= d && g.tem(d) >= g.Tprop);
         return semCar ? {est:"informar", fonte:g.fonte, txt:`cumpria ${ex} em ${fmtBarra(semCar)}; leia o CNIS para conferir a carência até essa data`}
           : {est:"info", fonte:g.fonte, txt:`até 13/11/2019 não cumpria ${ex}; tinha ${tempoFmt(g.t19)}`}; }
       const ok = x.v.tra_proporcional_ok;
       return ok==="Sim" ? {est:"ok", quando:r.data, fonte:g.fonte, txt:`cumpria em ${fmtBarra(r.data)}: ${ex}; o cliente aceita a proporcional`}
         : ok==="Não" ? {est:"info", fonte:g.fonte, txt:`cumpria em ${fmtBarra(r.data)}, mas o cliente não aceita a proporcional`}
         : {est:"informar", quando:r.data, fonte:g.fonte, txt:`cumpria em ${fmtBarra(r.data)}: ${ex}; só se concede com a concordância expressa do cliente (IN 128, art. 319, § 2º)`}; }},
    {id:"pontos_art15", rot:"Regra dos pontos: idade mais tempo de contribuição chega à pontuação do ano?", base:"EC 103/2019, art. 15, I, II e §§ 1º e 2º; IN 128/2022, art. 321",
     conf:"conferido", campos:["der"],
     mede:x=>{ const g = _traRegras(x), pre = _traPre(x, g, true); if(pre) return pre;
       const longe = !g.R.pontos.data && _traLonge(x, g, g.T); if(longe) return longe;
       return _apoRegra(x, g.R, "pontos",
         // F235 · o valor da regra (EC 103, art. 26, § 2º) e, sem ela ainda, quando fecharia contribuindo
         d => `cumprida em ${fmtBarra(d)}: ${g.T/ANO} anos de contribuição e ${pontosExig(anoDe(d), x.sx)} pontos (exigência de ${anoDe(d)}); valor de ${_apoPctTxt(x, g.tem(d > x.der ? d : x.der))}`,
         () => { const t = g.tem(x.der), a = anoDe(x.der); return `na DER (${fmtBarra(x.der)}): ${_apoPts(anosEntre(x.dn, x.der) + t/ANO)} pontos e ${tempoFmt(t)} de contribuição; exige ${pontosExig(a, x.sx)} pontos em ${a} e ${g.T/ANO} anos`; }, _traProj(x, "pontos")); }},
    {id:"idade_progressiva_art16", rot:"Regra da idade mínima que sobe a cada ano", base:"EC 103/2019, art. 16, I, II e § 1º; IN 128/2022, art. 322",
     conf:"conferido", campos:[],
     mede:x=>{ const g = _traRegras(x), pre = _traPre(x, g, true); if(pre) return pre;
       const longe = !g.R.idade.data && _traLonge(x, g, g.T); if(longe) return longe;
       return _apoRegra(x, g.R, "idade",
         // F235 · o valor da regra (EC 103, art. 26, § 2º) e, sem ela ainda, quando fecharia contribuindo
         d => `cumprida em ${fmtBarra(d)}: ${g.T/ANO} anos de contribuição e ${_apoAnosMeses(idadeProgExig(anoDe(d), x.sx))} de idade (exigência de ${anoDe(d)}); valor de ${_apoPctTxt(x, g.tem(d > x.der ? d : x.der))}`,
         () => { const t = g.tem(x.der), a = anoDe(x.der); return `na DER (${fmtBarra(x.der)}): ${_apoIdade(x.dn, x.der)} de idade e ${tempoFmt(t)} de contribuição; exige ${_apoAnosMeses(idadeProgExig(a, x.sx))} em ${a} e ${g.T/ANO} anos`; }, _traProj(x, "idade")); }},
    {id:"pedagio50_art17", rot:"Pedágio de 50 %: estava a menos de 2 anos de se aposentar em 13/11/2019?", base:"EC 103/2019, art. 17, caput, I, II e parágrafo único; IN 128/2022, art. 323",
     conf:"conferido", campos:[],
     mede:x=>{ const g = _traRegras(x), pre = _traPre(x, g, false); if(pre) return pre;
       const lim = [33,28][x.i];
       if(!g.ped50) return {est:"info", fonte:g.fonte, txt:`não cabe: tinha ${tempoFmt(g.t19)} em 13/11/2019; o art. 17 exige mais de ${lim} anos`};
       // F235 · o tempo exigido ao dia, o mesmo da conta
       const ex = g.ex50;
       return _apoRegra(x, g.R, "ped50",
         d => `cumprida em ${fmtBarra(d)}: ${tempoFmt(ex)} (${g.T/ANO} anos e 50 % do que faltava em 13/11/2019), sem idade mínima; valor com fator previdenciário`,
         // F235 · e quando fecharia contribuindo
         () => `exige ${tempoFmt(ex)} de contribuição (tinha ${tempoFmt(g.t19)} em 13/11/2019); na DER tem ${tempoFmt(g.tem(x.der))}`, _traProj(x, "ped50")); }},
    {id:"pedagio100_art20", rot:"Pedágio de 100 % com idade mínima de 60 (homem) ou 57 (mulher)", base:"EC 103/2019, art. 20, I, II, IV e § 2º, II; IN 128/2022, arts. 324 e 233, IV",
     conf:"conferido", campos:[],
     mede:x=>{ const g = _traRegras(x), pre = _traPre(x, g, true); if(pre) return pre;
       // F235 · o tempo exigido ao dia, o mesmo da conta
       const ex = g.ex100, id = [60,57][x.i];
       const longe = !g.R.ped100.data && _traLonge(x, g, ex); if(longe) return longe;
       return _apoRegra(x, g.R, "ped100",
         d => `cumprida em ${fmtBarra(d)}: ${id} anos de idade e ${tempoFmt(ex)} de contribuição (pedágio de ${tempoFmt(ex - g.T)}); valor de 100 % da média`,
         // F235 · e quando fecharia contribuindo
         () => `exige ${id} anos de idade e ${tempoFmt(ex)} de contribuição (pedágio de ${tempoFmt(ex - g.T)}); na DER tem ${_apoIdade(x.dn, x.der)} de idade e ${tempoFmt(g.tem(x.der))} de contribuição`, _traProj(x, "ped100")); }},
    {id:"carencia_180", rot:"Tem 180 contribuições mensais de carência?", base:"Lei 8.213/91, art. 25, II, art. 27, II, e art. 142; IN 128/2022, arts. 193 e 199",
     conf:"conferido", campos:["car_cumprida","apo_ci_atraso"],
     mede:x=>{ const R = _traRegras(x).R, a = _apoAnoCar(x, [R.integral, R.proporcional]); return _apoCarLinha(x, _apoExig(x, a), _apoExigTxt(x, a)); }},
    {id:"aliquota_reduzida", rot:"Contribuiu a 5 %, 11 % ou 12 % sem complementar? Esses meses não contam para esta aposentadoria", base:"IN 128/2022, art. 216, V, a, e §§ 1º e 2º (redação da IN PRES/INSS 212/2026)",
     conf:"conferido", campos:["tra_aliq_comps","tra_aliq_compl"],
     mede:x=>{ const p = _apoComps(x.v.tra_aliq_comps), s = _apoAliqSinal(x);
       if(x.v.tra_aliq_compl==="Sim") return {est:"ok", fonte:"campo", txt:"as contribuições a alíquota reduzida foram complementadas para 20 %: contam"};
       // F235 · o que a complementação faz: os meses até a regra que fecha, o custo e a data
       if(p.n > 0){ const cp = _traCompl(x);
         return {est:"falta", fonte:"campo", txt:`${p.n} ${p.n===1?"competência":"competências"} a 5 %, 11 % ou 12 % sem complemento ficam fora do tempo desta aposentadoria${x.v.tra_aliq_compl==="Em parte" ? " (parte já complementada: liste só as que faltam)" : ""}; complementar para 20 % as faz contar${cp && cp.r ? `: pagando antes do pedido a diferença de ${cp.faixa(cp.meses)} (${plu(cp.meses.length, "mês", "meses")}; ${20 - cp.al} % do mínimo de cada mês, cerca de ${moeda(cp.custo)} antes dos acréscimos${cp.meses.some(m=>m.startsWith(String(anoDe(x.hoje)))) ? `, ${moeda(cp.sm)} por mês de ${anoDe(x.hoje)}` : ""}), fecha ${cp.r.rot} em ${fmtBarra(cp.r.data)}, com ${cp.valor}; traga os comprovantes das guias da complementação, depois de pagas` : ""}; na aposentadoria por idade elas contam (art. 216, § 1º)`}; }
       if(String(x.v.tra_aliq_comps||"").trim()) return {est:"ok", fonte:"campo", txt:"nenhuma competência a alíquota reduzida sem complemento"};
       if(s) return {est:"informar", fonte:"CNIS", txt:`o CNIS mostra recolhimento a alíquota reduzida (${s}): informe as competências sem complemento`};
       if(!x.g) return {est:"informar", txt:"leia o CNIS para ver as alíquotas"};
       // a alíquota da competência só vem do PDF do CNIS: com CI ou facultativo, não se presume 20 %
       if(_apoTemCi(x) && (x.fd.cnpjs||[]).some(e=>/^ATIVA$/i.test(e.situacao||"")))
         return {est:"informar", fonte:"Redesim", txt:"o CPF tem CNPJ ativo (MEI): as contribuições de contribuinte individual desde a abertura são provavelmente o DAS de 5 %, que não conta nesta aposentadoria sem completar para 20 %. Confirme no CNIS (PDF) ou deixe para o advogado"};
       if(_apoTemCi(x)) return {est:"informar", fonte:"CNIS", txt:"há contribuição de CI ou facultativo: confira a alíquota de cada competência no PDF do CNIS e informe as que foram a 5 %, 11 % ou 12 % sem complemento (ou \"nenhuma\")"};
       return {est:"ok", fonte:"CNIS", txt:"o CNIS só mostra contribuições de empregado: sem alíquota reduzida"}; }},
    {id:"competencia_minima", rot:"Mês com salário abaixo do mínimo depois da Reforma foi complementado?", base:"EC 103/2019, art. 29 e parágrafo único",
     conf:"conferido", campos:["apo_compl"],
     mede:x=>{ if(!x.an) return {est:"informar", txt:"leia o CNIS (PDF) para ver as competências abaixo do mínimo"};
       const ab = ((x.an||{}).abaixo||[]).filter(a=>chaveComp(a.comp) >= "2019-11");
       if(!ab.length) return {est:"ok", fonte:"CNIS", txt:"nenhuma competência abaixo do mínimo depois de 11/2019"};
       if(x.v.apo_compl==="Sim") return {est:"ok", fonte:"campo", txt:`${ab.length===1 ? "a competência abaixo do mínimo foi complementada ou agrupada" : `as ${ab.length} competências abaixo do mínimo foram complementadas ou agrupadas`}`};
       const ano = anoDe(x.hoje), velhas = ab.filter(a=>+String(a.comp).slice(-4) < ano).length;
       return {est:"falta", fonte:"CNIS", txt:`${ab.length===1 ? "1 mês foi pago" : `${ab.length} meses foram pagos`} abaixo do mínimo depois de 11/2019 (${ab.slice(0, 4).map(a=>a.comp).join(", ")}${ab.length > 4 ? "…" : ""}) e ${ab.length===1 ? "não conta" : "não contam"} até completar a diferença${velhas ? `. Para ${velhas===1 ? "o mês" : "os meses"} de anos passados, a EC 103 fala em ajuste no mesmo ano civil e o Decreto 3.048 (art. 19-E, § 2º) permite completar a qualquer tempo, com acréscimos: o advogado decide` : ""}. Efeito: ${ab.length===1 ? "1 mês" : `${ab.length} meses`} de contribuição`}; }},
    // F235 · o tempo que o CNIS não mostra e o especial até 13/11/2019 entram na conta: perguntar e lançar no quadro Tempos
    {id:"tempo_fora_cnis", rot:"Tem trabalho que não aparece no CNIS (carteira antiga, serviço militar, roça, cargo público, escola técnica)?", base:"Lei 8.213/91, art. 55, I a VI e § 3º", conf:"conferido", campos:["tra_fora_cnis"],
     mede:x=>{ const lan = (x.tempos||[]).filter(r=>/^(rural|militar|rpps|aprendiz)$/.test(r.nat||""));
       if(lan.length) return {est:"ok", fonte:"quadro Tempos", txt:`${plu(lan.length, "período lançado", "períodos lançados")} no quadro Tempos fora do CNIS`};
       const v = x.v.tra_fora_cnis;
       return v==="Não" ? {est:"ok", fonte:"campo", txt:"só o tempo do CNIS"}
         : v==="Sim" ? {est:"informar", fonte:"campo", txt:"lance cada período no quadro Tempos, com a natureza (rural, militar, cargo público por certidão ou aluno-aprendiz) e a prova: soma no tempo e, antes de 13/11/2019, muda o pedágio"}
         : {est:"informar", txt:"pergunte: o tempo fora do CNIS soma, e o de antes de 13/11/2019 muda o pedágio"}; }},
    {id:"especial_ate_2019", rot:"Trabalhou com ruído, produto químico, hospital ou eletricidade até 13/11/2019?", base:"EC 103/2019, art. 25, § 2º; IN 128/2022, art. 206, § 3º", conf:"conferido", campos:["tra_especial"],
     mede:x=>{ if((x.tempos||[]).some(r=>r.nat==="especial" && r.de && r.de <= EC103)) return {est:"ok", fonte:"quadro Tempos", txt:"o período especial está no quadro Tempos e converte até 13/11/2019"};
       const v = x.v.tra_especial;
       return v==="Não" ? {est:"ok", fonte:"campo", txt:"sem atividade especial"}
         : v==="Sim, com PPP" ? {est:"informar", fonte:"campo", txt:"lance o período como Especial no quadro Tempos: até 13/11/2019 ele converte e entra nas transições"}
         : v==="Sim, sem PPP" ? {est:"informar", fonte:"campo", txt:"peça o PPP ao empregador: sem ele, o período fica comum"}
         : {est:"informar", txt:"pergunte: o tempo especial até 13/11/2019 converte em comum e encurta as transições"}; }},
    {id:"qualidade_dispensada", rot:"Não precisa estar contribuindo hoje", base:"Lei 10.666/2003, art. 3º, caput",
     conf:"conferido", campos:[],
     mede:x=>{ const q = _apoQualidade(x); return {est:"info", txt:`a perda da qualidade de segurado não conta nesta aposentadoria (Lei 10.666/2003, art. 3º)${q ? `; ${q}` : ""}`}; }},
    {id:"vedacao_acumulacao", rot:"Já recebe outra aposentadoria ou benefício que não se acumula?", base:"Lei 8.213/91, art. 124, I e II, e art. 86, §§ 1º a 3º; IN 128/2022, art. 216, VII",
     conf:"conferido", campos:["apo_outro_regime"], mede:x=>_apoVed(x)},
  // F235 · as perguntas do tempo fora do CNIS e do especial
  ], {tra_fora_cnis:["Trabalho fora do CNIS (carteira antiga, serviço militar, roça, cargo público, escola técnica)", "select", SN],
      tra_especial:["Atividade especial até 13/11/2019 (ruído, químico, hospital, eletricidade)", "select", ["","Não","Sim, com PPP","Sim, sem PPP"]],
      tra_aliq_comps:["Competências a 5 %, 11 % ou 12 % sem complemento para 20 % (ex.: 01/2015 a 12/2016, ou \"nenhuma\")", "text"],
      tra_aliq_compl:["Contribuições a 5 %, 11 % ou 12 % complementadas para 20 %", "select", ["","Não","Sim","Em parte"]],
      tra_proporcional_ok:["Cliente aceita a aposentadoria proporcional (IN 128, art. 319, § 2º)", "select", SN]},
  // F235 · o que fazer agora e a linha do desfecho com o carnê reduzido pendente
  {veredito:_traVeredito, agora:_traAgora, desfecho:_traDesfecho, pre:_APO_PRE, resumo:"Para quem já contribuía antes de 13/11/2019: aposenta com 35 anos de contribuição (homem) ou 30 (mulher) somados a uma das condições de transição (pontos, idade mínima que sobe a cada ano, pedágio de 50 % ou pedágio de 100 % com idade), sempre com 180 meses de carência.",
   quando: x => { if(_apoVed(x).est==="impedido") return null;
     const g = _traRegras(x);
     return Object.values(g.R).filter(r=>r.vale!==false && r.data).map(r=>_apoComCar(x, r)).filter(Boolean).sort()[0] || null; }});

  // ── professor (B57) ─────────────────────────────────────────────────────
  // F235 · o auxiliar que dava aula como a titular conta como magistério com a resposta "Sim" (IN 128, art. 214, VI)
  const _magLinhas = x => (x.tempos||[]).filter(r=>r.de && (r.nat==="magisterio" || (r.aux && (r.nat||"comum")==="comum" && x.v.mag_auxiliar==="Sim")));
  // direção, coordenação ou assessoramento: pelo detalhe da linha ou, sem ele, pela função predominante
  const _magGest = (x, r) => /Dire|Coord|Assess/i.test(r.det || x.v.mag_funcao || "");
  const _MAG_GEST = "sem contar a direção, a coordenação e o assessoramento, que só contam se a pessoa foi admitida como professor (IN 128, art. 214, I, b e c): confirme";
  // o magistério numa data, em dias: as linhas de natureza Magistério (sem o ensino superior, salvo no
  // acréscimo da EC 20; a direção, a coordenação e o assessoramento só com a admissão como professor
  // confirmada), mais o benefício por incapacidade entre dois períodos de magistério e o acidentário
  // até 30/06/2020 mesmo sem intercalar (IN 128, art. 214, II e III)
  const _magDias = (x, iso, sup) => _apoM(x, `m${iso}${sup?1:0}`, () => {
    if(!sup && x.v.mag_nivel==="Superior") return 0;
    const lim = _apoLim(x, iso), adm = x.v.mag_admitido_professor==="Sim";
    const ls = _magLinhas(x).filter(r=>r.de <= lim && (adm || !_magGest(x, r))).map(r=>[r.de, !r.ate || r.ate > lim ? lim : r.ate]);
    const cob = fundirIvs(ls), bs = _apoBens(x, lim);
    const ben = bs.filter(({de, ate})=>cob.some(([, f])=>f < de) && cob.some(([i])=>i > ate)).map(({de, ate})=>[de, ate]);
    const DEC = "2020-06-30", acid = bs.filter(({b, de})=>/^9[12]$/.test(String(b.especie)) && de <= DEC && cob.some(([i, f])=>i < de && f >= diaAnterior(de)))
      .map(({de, ate})=>[de, ate < DEC ? ate : DEC]);
    return uniaoDias([...ls, ...ben, ...acid]); });
  const _magRegras = x => _apoM(x, "mag", () => {
    const Tm = [30,25][x.i]*ANO, mag = (d, s) => _magDias(x, d, s), tem = d => (_traTempo(x, d)||{dias:0}).dias, f = _apoFil(x), dn = x.dn;
    // F235 · o acréscimo da EC 20 e o pedágio do professor ao dia, como na conta de data a data
    const m19 = mag(EC103), m98 = mag(EC20, true), bonus = _aoDia(m98*[0.17, 0.20][x.i]), T35 = [35,30][x.i]*ANO, exP = _aoDia(Tm + Math.max(0, Tm - m19));
    const depois = !!(f && f.iso > EC103), car = d => _apoN(x, d) >= _apoExig(x, anoDe(d)), tem0 = _magLinhas(x).length > 0;
    const adm = x.v.mag_admitido_professor, gestDuvida = adm!=="Sim" && adm!=="Não" && _magLinhas(x).some(r=>_magGest(x, r));
    const R = {
      adquirido: {rot:"o direito adquirido", comCar:true, desde: f && f.iso, ate:EC103, teste: d => mag(d) >= Tm && car(d)},
      ec20: {rot:"o acréscimo da EC 20", comCar:true, vale: m98 > 0 && m98 < Tm, desde: m98 > 0 && m98 < Tm && EC20, ate:EC103, teste: d => mag(d, true) + bonus >= T35 && car(d)},
      pontos: {rot:"os pontos do professor", desde: dn && DEPOIS, teste: d => mag(d) >= Tm && anosEntre(dn, d) + tem(d)/ANO >= pontosExig(anoDe(d), x.sx, true)},
      idade: {rot:"a idade progressiva do professor", desde: dn && DEPOIS, teste: d => mag(d) >= Tm && dataDaIdade(dn, idadeProgExig(anoDe(d), x.sx, true)) <= d},
      // F235 · o pedágio contra o tempo exigido ao dia
      ped100: {rot:"o pedágio de 100 % do professor", desde: dn && DEPOIS, teste: d => dataDaIdade(dn, [55,52][x.i]) <= d && mag(d) >= exP},
      permanente: {rot:"a regra permanente do professor", vale: depois, desde: dn && DEPOIS, teste: d => dataDaIdade(dn, [60,57][x.i]) <= d && mag(d) >= 25*ANO},
    };
    for(const [k, r] of Object.entries(R)){ r.fonte = "quadro Tempos";
      r.data = !tem0 || (k==="permanente" ? !depois : depois) ? null : _apoPrim(r.desde, r.ate || FIM, r.teste); }
    // F235 · o magistério exigido no pedágio vai junto, para o texto usar o mesmo número da conta
    return {Tm, m19, m98, bonus, T35, exP, depois, tem0, gestDuvida, mag, tem, R};
  });
  const _magPre = (x, g, comIdade) => g.depois ? {est:"info", txt:"não se aplica: filiado depois de 13/11/2019 (vale a regra permanente do professor)"}
    : !g.tem0 ? {est:"informar", txt:"lance os períodos de magistério no quadro Tempos (natureza Magistério)"}
    : comIdade && !x.dn ? {est:"informar", txt:"sem a data de nascimento na ficha"} : null;
  // sem a admissão como professor confirmada, a regra que não fecha sem a gestão fica a informar
  const _magDuv = (g, m) => g.gestDuvida && m.est==="falta" ? {...m, est:"informar", txt:`${m.txt}; ${_MAG_GEST}`} : m;
  // F235 · o que fazer já no professor: a declaração de cada escola (função, nível e período) e, do auxiliar, a de que dava aula como a titular
  const _magEscolas = x => [...new Map((x.tempos||[]).filter(r=>r.de && (r.nat==="magisterio" || r.aux)).map(r=>[r.onde||"escola", r])).values()];
  const _magAgora = (x, a) => { const out = [], es = _magEscolas(x), aux = es.filter(r=>r.aux), resp = x.v.mag_auxiliar;
    if(es.length) out.push(`Pedir a cada escola a declaração com a função, o nível de ensino e o período: ${es.map(r=>`${r.onde||"escola"} (${_mmaa(ymDe(r.de))} a ${r.ate ? _mmaa(ymDe(r.ate)) : "hoje"})`).join("; ")}.`);
    if(aux.length && resp!=="Sim" && resp!=="Não") out.push(`Da ${aux.map(r=>r.onde||"escola").join(" e da ")}, pedir também que declare que, como auxiliar, ${x.sx==="F" ? "ela" : "ele"} dava aula nas mesmas condições da professora titular (IN 128, art. 214, VI); a declaração pode ir no pedido ou na exigência.`);
    out.push("Trazer a carteira de trabalho com os contratos de professor.");
    if(a.quando && a.quando <= x.hoje) out.push("Pedir já: não é preciso deixar a escola para pedir a aposentadoria.");
    return out; };
  // F235 · com o direito e o auxiliar ainda sem resposta: pedir já e juntar a declaração; o INSS oferece o mais vantajoso (IN 128, art. 577, I)
  const _magDesfecho = (x, a) => { if(!a.quando || a.quando > x.hoje) return null;
    const aux = (x.tempos||[]).filter(r=>r.aux && r.de); if(!aux.length || x.v.mag_auxiliar==="Sim" || x.v.mag_auxiliar==="Não") return null;
    const g = _magRegras(ctxComV(x, {mag_auxiliar:"Sim"})), [k, r] = Object.entries(g.R).filter(([, r])=>r.vale!==false && r.data).sort((p, q)=>p[1].data < q[1].data ? -1 : 1)[0] || [];
    return {acao:"caso", txt:`gere o caso e peça já: cumpre os requisitos desde ${fmtBarra(a.quando)}, e o pagamento começa no dia do pedido. Junte a declaração da ${aux[0].onde||"escola"} no pedido ou na exigência${r && r.data < a.quando ? `: com ela, ${r.rot} desde ${fmtBarra(r.data)}, com ${k==="ped100" ? "100 % da média" : _apoPctTxt(x, g.tem(x.der))}, e o INSS deve oferecer o benefício mais vantajoso, com os demonstrativos (IN 128, art. 577, I)` : ""}`}; };
  // F235 · com o direito: qual regra e quanto vale; o auxiliar ainda sem resposta mostra a conta com a declaração
  const _magVeredito = (x, a) => { if(!a.quando || a.quando > x.hoje) return null;
    const g = _magRegras(x), [k, r] = Object.entries(g.R).filter(([, q])=>q.vale!==false && q.data && q.data <= x.hoje).sort((p, q)=>p[1].data < q[1].data ? -1 : 1)[0] || [];
    if(!r) return null;
    const val = k==="ped100" ? "100 % da média" : /^(adquirido|ec20)$/.test(k) ? "pela regra anterior" : _apoPctTxt(x, g.tem(x.der));
    const aux = (x.tempos||[]).filter(q=>q.aux && q.de); let com = "";
    if(aux.length && x.v.mag_auxiliar!=="Sim" && x.v.mag_auxiliar!=="Não"){ const g1 = _magRegras(ctxComV(x, {mag_auxiliar:"Sim"}));
      const [k1, r1] = Object.entries(g1.R).filter(([, q])=>q.vale!==false && q.data).sort((p, q)=>p[1].data < q[1].data ? -1 : 1)[0] || [];
      if(r1 && r1.data < r.data) com = ` Com a declaração da ${aux[0].onde||"escola"} de que, como auxiliar, dava aula como a titular: ${r1.rot} desde ${fmtBarra(r1.data)}, com ${k1==="ped100" ? "100 % da média" : _apoPctTxt(x, g1.tem(x.der))}.`; }
    return {tom:"sim", txt:`Sim: cumpre ${r.rot} desde ${fmtBarra(r.data)}, com ${val}; o pagamento começa no dia do pedido, então peça logo.${com} Não é preciso deixar a escola para pedir.`}; };
  registrarReq("professor", [
    {id:"magisterio_educacao_basica", rot:"O tempo exigido é todo de magistério na educação infantil, no fundamental ou no médio?", base:"EC 103/2019, arts. 15, § 3º, 16, § 2º, 19, § 1º, II, e 20, § 1º; IN 128/2022, art. 214, I a VI, §§ 1º e 2º",
     // F235 · a declaração das escolas mudou para o requisito mag_declaracoes
     conf:"conferido", campos:["mag_nivel","mag_funcao","mag_admitido_professor","mag_habilitacao","mag_afast"],
     mede:x=>{ const ls = _magLinhas(x), rais = [...new Set((x.fd.rais||[]).filter(r=>/professor/i.test(r.cbo||"")).map(r=>r.ano))].sort();
       const ind = rais.length ? `; a RAIS mostra ocupação de professor (${rais.join(", ")})` : "";
       if(x.v.mag_nivel==="Superior") return {est:"risco", fonte:"campo", txt:"ensino superior não é magistério da educação básica (IN 128, art. 214, §§ 1º e 2º): conta só no acréscimo da EC 20, até 16/12/1998; fora disso, o tempo vai à B42 como comum"};
       if(!ls.length) return {est:"informar", txt:`lance os períodos de magistério no quadro Tempos (natureza Magistério)${ind}`, ...(rais.length ? {fonte:"RAIS"} : {})};
       const gest = ls.filter(r=>_magGest(x, r)), adm = x.v.mag_admitido_professor;
       // o nível só se presume pela linha ou pela função de educação infantil; sem ele, não se presume a educação básica
       const nivel = x.v.mag_nivel || (ls.some(r=>/infantil/i.test(r.det||"")) || /infantil/i.test(x.v.mag_funcao||"") ? "Infantil" : "");
       if(gest.length && adm!=="Sim" && adm!=="Não")
         return {est:"informar", fonte:"quadro Tempos", txt:`há período de direção, coordenação ou assessoramento: conta só se a pessoa foi admitida como professor, e não como especialista em educação (art. 214, I, b e c); confirme${ind}`};
       const f = _apoFil(x), ex = f && f.iso > EC103 ? 25 : [30,25][x.i], m = _magDias(x, x.der), ok = m >= ex*ANO, nt = [];
       if(gest.length && adm==="Não") nt.push(`${gest.length===1 ? "o período de direção, coordenação ou assessoramento fica" : `os ${gest.length} períodos de direção, coordenação ou assessoramento ficam`} fora: especialista em educação não conta`);
       if(x.v.mag_declaracao==="Não") nt.push("falta a declaração da escola com função, nível e período");
       if(x.v.mag_habilitacao==="Não") nt.push("sem o documento de habilitação (exigência só na skill, não conferida)");
       if(x.v.mag_afast) nt.push(`afastamentos (${x.v.mag_afast}): benefício por incapacidade intercalado, licença-prêmio, férias e salário-maternidade contam como magistério (art. 214, II a VI); lance-os como magistério`);
       if(ok && !nivel) nt.push("informe o nível de ensino: só a educação infantil, o fundamental e o médio contam (IN 128, art. 214, § 2º)");
       return {est: !ok ? "falta" : x.v.mag_declaracao==="Não" ? "risco" : !nivel ? "informar" : "ok", fonte:"quadro Tempos",
         txt:`${tempoFmt(m)} de magistério até ${fmtBarra(x.der)}; exige ${ex} anos${ok ? "" : `, faltam ${tempoFmt(ex*ANO - m)}`}${nt.length ? `; ${nt.join("; ")}` : ""}${ind}`}; }},
    // F235 · a declaração de cada escola (função, nível e período) é o documento do magistério: até chegar, vai ao pedido ao cliente
    {id:"mag_declaracoes", rot:"Cada escola deu a declaração com a função, o nível de ensino e o período?", base:"IN 128/2022, art. 214, I (a declaração prova a função, o nível e o período; modelo próprio não localizado em norma)", conf:"conferido", campos:["mag_declaracao"],
     mede:x=>{ const ls = _magLinhas(x); if(!ls.length) return {est:"info", txt:"sem período de magistério lançado no quadro Tempos"};
       if(x.v.mag_declaracao==="Sim") return {est:"ok", fonte:"campo", txt:"as declarações das escolas estão com o escritório"};
       const es = [...new Map(ls.map(r=>[r.onde||"escola", r])).values()].map(r=>`${r.onde||"escola"}, de ${fmtBarra(r.de).slice(3)} a ${r.ate ? fmtBarra(r.ate).slice(3) : "hoje"}`).join(", e ");
       return {est: x.v.mag_declaracao==="Não" ? "risco" : "informar", fonte:"quadro Tempos", txt:`peça a cada escola a declaração com a função, o nível de ensino e o período: ${es}`}; }},
    // F235 · o auxiliar de classe (IN 128, art. 214, VI): a pergunta, a declaração e as duas contas lado a lado
    {id:"mag_auxiliar", rot:"O tempo de auxiliar de classe conta como magistério?", base:"IN 128/2022, art. 214, VI", conf:"conferido", campos:["mag_auxiliar"],
     mede:x=>{ const aux = (x.tempos||[]).filter(r=>r.aux && r.de);
       if(!aux.length) return {est:"info", txt:"nenhum período de auxiliar de classe na escola"};
       const onde = aux.map(r=>`${r.onde||"escola"}, de ${_mmaa(ymDe(r.de))} a ${r.ate ? _mmaa(ymDe(r.ate)) : "hoje"}`).join("; ");
       const ocup = (String(aux[0].prova||"").match(/RAIS: ([^.]+)\./)||[])[1];
       const melhor = y => { const g = _magRegras(y), [k, r] = Object.entries(g.R).filter(([, r])=>r.vale!==false && r.data).sort((p, q)=>p[1].data < q[1].data ? -1 : 1)[0] || [];
         return !r ? "nenhuma regra fecha ainda" : `${r.rot} ${r.data <= x.hoje ? "desde" : "em"} ${fmtBarra(r.data)}, com ${k==="ped100" ? "100 % da média" : _apoPctTxt(x, g.tem(r.data > x.der ? r.data : x.der))}`; };
       const contas = `Sem a declaração: ${melhor(ctxComV(x, {mag_auxiliar:"Não"}))}. Com a declaração: ${melhor(ctxComV(x, {mag_auxiliar:"Sim"}))}`;
       if(x.v.mag_auxiliar==="Sim") return {est:"ok", fonte:"campo", txt:`${onde}: conta como magistério, com a declaração da escola. ${contas}`};
       if(x.v.mag_auxiliar==="Não") return {est:"info", fonte:"campo", txt:`${onde}: não conta como magistério, mas entra nos pontos e no valor. ${contas}`};
       return {est:"informar", fonte:"RAIS", txt:`${onde}${ocup ? `: na RAIS, ${ocup.toLowerCase()}` : ""}. Conta como magistério só se dava aula nas mesmas condições da professora titular (IN 128, art. 214, VI): peça à ${aux[0].onde||"escola"} a declaração de que, como auxiliar, ${x.sx==="F" ? "ela" : "ele"} dava aula nas mesmas condições da professora titular, com a função, o nível e o período. ${contas}`}; }},
    {id:"direito_adquirido_prof", rot:"Já tinha 25 anos (mulher) ou 30 anos (homem) de magistério em 13/11/2019?", base:"EC 103/2019, art. 3º; IN 128/2022, art. 251, caput e § 2º; Lei 8.213/91, art. 29-C, § 3º",
     conf:"conferido", campos:[],
     mede:x=>{ const g = _magRegras(x), r = g.R.adquirido;
       if(!g.tem0) return {est:"informar", txt:"lance os períodos de magistério no quadro Tempos (natureza Magistério)"};
       if(r.data){ const p = x.dn ? anosEntre(x.dn, EC103) + g.tem(EC103)/ANO + 5 : null;
         return {est:"ok", quando:r.data, fonte:r.fonte, txt:`tinha ${g.Tm/ANO} anos de magistério e a carência em ${fmtBarra(r.data)}: direito adquirido, sem idade mínima; ${p==null ? "fator previdenciário a conferir (sem nascimento)" : p >= [96,86][x.i] ? `sem fator previdenciário (idade + tempo + 5 = ${_apoPts(p)} pontos em 13/11/2019, art. 29-C, § 3º)` : `com fator previdenciário (idade + tempo + 5 = ${_apoPts(p)} pontos em 13/11/2019)`}`}; }
       if(g.m19 >= g.Tm && _apoN(x, EC103) < 0) return {est:"informar", fonte:r.fonte, txt:`tinha ${tempoFmt(g.m19)} de magistério em 13/11/2019; leia o CNIS para conferir a carência até essa data`};
       return _magDuv(g, {est: g.gestDuvida ? "falta" : "info", fonte:r.fonte, txt:`em 13/11/2019 tinha ${tempoFmt(g.m19)} de magistério; exigia ${g.Tm/ANO} anos e a carência: sem direito adquirido`}); }},
    {id:"acrescimo_ec20", rot:"Acréscimo da EC 20 (só para a aposentadoria por tempo comum): o magistério até 16/12/1998 vale 17 % (homem) ou 20 % (mulher) a mais se fechar os 35 ou 30 anos só de magistério?", base:"EC 20/1998, art. 9º, § 2º; IN 128/2022, art. 251, § 1º",
     conf:"conferido", campos:["mag_nivel"],
     mede:x=>{ const g = _magRegras(x), r = g.R.ec20, pc = [17,20][x.i];
       if(!g.tem0) return {est:"informar", txt:"lance os períodos de magistério no quadro Tempos (natureza Magistério)"};
       if(!g.m98) return {est:"info", fonte:r.fonte, txt:"não se aplica: sem magistério até 16/12/1998"};
       if(g.m98 >= g.Tm) return {est:"info", fonte:r.fonte, txt:`já tinha ${g.Tm/ANO} anos de magistério em 16/12/1998: vale o direito adquirido`};
       if(r.data) return {est:"ok", quando:r.data, fonte:r.fonte, txt:`o magistério até 16/12/1998 (${tempoFmt(g.m98)}) com ${pc} % (+${tempoFmt(g.bonus)}) fecha ${g.T35/ANO} anos só de magistério em ${fmtBarra(r.data)}: aposentadoria por tempo, sem idade nem pedágio`};
       const t19 = g.mag(EC103, true) + g.bonus;
       if(t19 >= g.T35 && _apoN(x, EC103) < 0) return {est:"informar", fonte:r.fonte, txt:`com ${pc} % sobre o magistério até 16/12/1998, tinha ${tempoFmt(t19)} em 13/11/2019; leia o CNIS para conferir a carência até essa data`};
       return _magDuv(g, {est: g.gestDuvida ? "falta" : "info", fonte:r.fonte, txt:`com ${pc} % sobre ${tempoFmt(g.m98)} até 16/12/1998, tinha ${tempoFmt(t19)} em 13/11/2019; exigia ${g.T35/ANO} anos só de magistério`}); }},
    {id:"pontos_prof", rot:"Regra dos pontos do professor", base:"EC 103/2019, art. 15, § 3º; IN 128/2022, art. 252; Portaria DIRBEN 991/2022, art. 257, I e parágrafo único",
     conf:"conferido", campos:["der"],
     mede:x=>{ const g = _magRegras(x), pre = _magPre(x, g, true); if(pre) return pre;
       return _magDuv(g, _apoRegra(x, g.R, "pontos",
         // F235 · o valor da regra (EC 103, art. 26, §§ 2º e 5º)
         d => `cumprida em ${fmtBarra(d)}: ${g.Tm/ANO} anos de magistério e ${pontosExig(anoDe(d), x.sx, true)} pontos (exigência de ${anoDe(d)}; nos pontos entra todo o tempo); valor de ${_apoPctTxt(x, g.tem(d > x.der ? d : x.der))}`,
         () => { const a = anoDe(x.der), t = g.tem(x.der); return `na DER (${fmtBarra(x.der)}): ${_apoPts(anosEntre(x.dn, x.der) + t/ANO)} pontos e ${tempoFmt(g.mag(x.der))} de magistério; exige ${pontosExig(a, x.sx, true)} pontos em ${a} e ${g.Tm/ANO} anos de magistério`; })); }},
    {id:"idade_progressiva_prof", rot:"Regra da idade mínima do professor, que sobe a cada ano", base:"EC 103/2019, art. 16, § 2º; IN 128/2022, art. 253",
     conf:"conferido", campos:[],
     mede:x=>{ const g = _magRegras(x), pre = _magPre(x, g, true); if(pre) return pre;
       return _magDuv(g, _apoRegra(x, g.R, "idade",
         // F235 · o valor da regra (EC 103, art. 26, §§ 2º e 5º)
         d => `cumprida em ${fmtBarra(d)}: ${g.Tm/ANO} anos de magistério e ${_apoAnosMeses(idadeProgExig(anoDe(d), x.sx, true))} de idade (exigência de ${anoDe(d)}); valor de ${_apoPctTxt(x, g.tem(d > x.der ? d : x.der))}`,
         () => { const a = anoDe(x.der); return `na DER (${fmtBarra(x.der)}): ${_apoIdade(x.dn, x.der)} de idade e ${tempoFmt(g.mag(x.der))} de magistério; exige ${_apoAnosMeses(idadeProgExig(a, x.sx, true))} em ${a} e ${g.Tm/ANO} anos de magistério`; })); }},
    {id:"pedagio100_prof", rot:"Pedágio de 100 % do professor, com 52 (mulher) ou 55 (homem) anos", base:"EC 103/2019, art. 20, § 1º; IN 128/2022, arts. 254 e 233, IV",
     conf:"conferido", campos:[],
     mede:x=>{ const g = _magRegras(x), pre = _magPre(x, g, true); if(pre) return pre;
       // F235 · o magistério exigido ao dia, o mesmo da conta
       const ex = g.exP, id = [55,52][x.i];
       return _magDuv(g, _apoRegra(x, g.R, "ped100",
         d => `cumprida em ${fmtBarra(d)}: ${id} anos de idade e ${tempoFmt(ex)} de magistério (pedágio de ${tempoFmt(ex - g.Tm)}); valor de 100 % da média; não há pedágio de 50 % do professor`,
         () => `exige ${id} anos de idade e ${tempoFmt(ex)} de magistério (tinha ${tempoFmt(g.m19)} em 13/11/2019); na DER tem ${_apoIdade(x.dn, x.der)} de idade e ${tempoFmt(g.mag(x.der))} de magistério`)); }},
    {id:"permanente_prof", rot:"Para quem começou a contribuir depois de 13/11/2019: 25 anos de magistério e 57 (mulher) ou 60 (homem) anos", base:"EC 103/2019, art. 19, § 1º, II; IN 128/2022, art. 250 (e art. 216, § 1º)",
     conf:"conferido", campos:["apo_filiacao","tra_aliq_comps","tra_aliq_compl"],
     mede:x=>{ const f = _apoFil(x), g = _magRegras(x);
       if(!f) return {est:"informar", txt:"confirme a filiação: a regra permanente é de quem se filiou depois de 13/11/2019 (IN 128, art. 250)"};
       if(f.iso <= EC103) return {est:"info", fonte:f.fonte, txt:"não se aplica pela IN 128, art. 250: filiado até 13/11/2019 usa as transições (o texto da EC 103, art. 19, § 1º, II, não traz a restrição expressa)"};
       if(!g.tem0) return {est:"informar", txt:"lance os períodos de magistério no quadro Tempos (natureza Magistério)"};
       if(!x.dn) return {est:"informar", txt:"sem a data de nascimento na ficha"};
       const id = [60,57][x.i];
       const m = _magDuv(g, _apoRegra(x, g.R, "permanente", d => `cumprida em ${fmtBarra(d)}: ${id} anos de idade e 25 anos de magistério`,
         () => `exige ${id} anos de idade e 25 anos de magistério; na DER tem ${_apoIdade(x.dn, x.der)} de idade e ${tempoFmt(g.mag(x.der))} de magistério`));
       const aliq = x.v.tra_aliq_compl!=="Sim" && (_apoComps(x.v.tra_aliq_comps).n > 0 || (!String(x.v.tra_aliq_comps||"").trim() && _apoAliqSinal(x)));
       return aliq ? {...m, est: m.est==="ok" ? "risco" : m.est, txt:`${m.txt}; há contribuição a 5 %, 11 % ou 12 %: o art. 216, § 1º, da IN 128 ressalva só os arts. 249 e 317, e se ela conta aqui é ponto a decidir pelo advogado`} : m; }},
    {id:"carencia_180", rot:"Tem 180 contribuições mensais de carência?", base:"Lei 8.213/91, art. 25, II, art. 27, II, e art. 142; IN 128/2022, arts. 193 e 199",
     conf:"conferido", campos:["car_cumprida","apo_ci_atraso"],
     mede:x=>{ const R = _magRegras(x).R, a = _apoAnoCar(x, [R.adquirido, R.ec20]); return _apoCarLinha(x, _apoExig(x, a), _apoExigTxt(x, a)); }},
    {id:"sem_conversao_magisterio", rot:"O magistério não se converte, e o tempo fora da escola não completa os 25 ou 30 anos", base:"IN 128/2022, art. 255, §§ 1º e 2º; Portaria DIRBEN 991/2022, art. 257, parágrafo único",
     conf:"conferido", campos:[],
     mede:x=>{ const g = _magRegras(x);
       if(!g.tem0) return {est:"info", txt:"o magistério não se converte em tempo comum, e o tempo fora da escola não completa os 25 ou 30 anos (IN 128, art. 255)"};
       const m = g.mag(x.der), t = (_traTempo(x, x.der)||{dias:0}).dias, fora = Math.max(0, t - m), esp = (x.tempos||[]).some(r=>r.nat==="especial");
       return {est:"info", fonte:"quadro Tempos", txt:`${tempoFmt(m)} de magistério${fora ? ` e ${tempoFmt(fora)} fora dele, que não completam os ${g.Tm/ANO} anos de magistério, mas não se perdem: entram nos pontos e no valor da aposentadoria (na média e no percentual)` : ""}; o magistério não se converte (art. 255, § 1º)${esp ? "; o tempo especial não completa o magistério" : ""}${m < g.Tm && t >= g.T35 ? `; sem os ${g.Tm/ANO} anos de magistério, a B42 conta tudo um por um (${tempoFmt(t)})` : ""}`}; }},
    {id:"vedacao_acumulacao", rot:"Já recebe outra aposentadoria ou benefício que não se acumula?", base:"Lei 8.213/91, art. 124, I e II, e art. 86, §§ 1º a 3º; IN 128/2022, art. 216, VI e VII",
     conf:"conferido", campos:["mag_regime","apo_outro_regime"],
     mede:x=>_apoVed(x, x.v.mag_regime==="Ambos" ? ["professor na rede pública (RPPS) e na particular (RGPS): as duas aposentadorias, cada uma com o seu tempo"] : [])},
  ], {mag_admitido_professor:["Na direção, coordenação ou assessoramento, foi admitido como professor (não especialista em educação)", "select", SN],
      mag_habilitacao:["Diploma ou habilitação para o magistério", "select", SN],
      mag_declaracao:["Declaração da escola com função, nível e período", "select", SN],
      mag_afast:["Benefício por incapacidade ou licença durante o magistério (períodos)", "text"]},
  // F235 · o veredito com a regra e o valor, o que pedir às escolas e o desfecho com a declaração do auxiliar
  {pre:_APO_PRE, veredito:_magVeredito, agora:_magAgora, desfecho:_magDesfecho, resumo:"Professor da educação infantil, do ensino fundamental ou do médio aposenta com 25 anos (mulher) ou 30 anos (homem) só de magistério, mais uma das regras: pontos, idade mínima que sobe a cada ano ou pedágio de 100 % com 52 (mulher) ou 55 (homem) anos. O pedágio paga 100 % da média; as outras, 60 % mais 2 % por ano de contribuição acima de 15 (mulher) ou 20 (homem). Quem começou a contribuir depois de 13/11/2019 precisa de 25 anos de magistério e 57 (mulher) ou 60 (homem) anos de idade; sempre com 180 meses de carência.",
   quando: x => { if(_apoVed(x).est==="impedido") return null;
     const g = _magRegras(x);
     return Object.values(g.R).filter(r=>r.vale!==false && r.data).map(r=>_apoComCar(x, r)).filter(Boolean).sort()[0] || null; }});
})();
// ── Pessoa com deficiência e especial (casos-ouro em testes/cadastro/req-ouro/pcd_esp.json) ──
// F232 · catálogo de requisitos · pessoa com deficiência e especial: pcd, pcd_idade, b46, conv
// Fonte: crm/fase2/docs/REQUISITOS-POR-BENEFICIO.md (seções pcd, pcd_idade, b46 e conv) e a revisão jurídica.
// Os fatores das tabelas (RPS, arts. 66, 70-E e 70-F) foram conferidos no MCP normas em 16/10/2026;
// os da conversão em tempo comum (2,33/2,00 · 1,75/1,50 · 1,40/1,20) seguem só na skill (FATOR_ESP).
(()=>{
  // ── auxiliares da família (prefixo _pe, _pcd, _b46, _conv) ────────────────
  const _peAte = x => x.der < x.hoje ? x.der : x.hoje;   // como x.tot: as linhas contam até a DER, nunca depois de hoje
  const _peFat = (de, para) => Math.round(para / de * 100) / 100;   // alvo ÷ origem em 2 casas reproduz as tabelas dos arts. 66, 70-E e 70-F do RPS
  const _peF = n => n.toFixed(2).replace(".", ",");
  const _pe1 = n => (Math.floor(n * 10) / 10).toFixed(1).replace(".", ",");   // trunca: 85,96 pontos não pode aparecer como "86,0"
  const _peDias = ivs => ivs.reduce((t, [a, b]) => t + durDias(durCal(a, b)), 0);
  const _peIdadeTxt = n => n % 1 ? `${Math.floor(n)} anos e 6 meses` : `${n} anos`;
  const _peCorta = (ivs, de, ate) => ivs.filter(([a, b]) => b >= de && a <= ate).map(([a, b]) => [a < de ? de : a, b > ate ? ate : b]);
  // os dias em que U e I se cruzam (a interseção direta: subtrair pedaços arrastaria a diferença entre ano de 365 e 12 meses de 30)
  const _peInter = (U, I) => _peDias(fundirIvs(U.flatMap(([a, b]) => I.filter(([c, d]) => c <= b && d >= a).map(([c, d]) => [a > c ? a : c, b < d ? b : d]))));
  // o tempo do agente (15, 20 ou 25 anos): o da linha, o escrito no detalhe ("25 anos") ou o do quadro; sem nenhum, null
  const _peAgente = (r, x) => [15, 20, 25].find(n => n === +r.esp) || +((String(r.det||"").match(/\b(15|20|25)\s*anos\b/)||[])[1]) || [15, 20, 25].find(n => n === +x.v.esp_anos) || null;
  const _peLinhas = (x, ate) => (x.tempos||[]).filter(r => r.de && r.de <= ate && (!r.ate || r.ate >= r.de))
    .map(r => ({de: r.de, fim: !r.ate || r.ate > ate ? ate : r.ate, nat: r.nat || "comum", det: r.det || "", prova: r.prova || "", ag: _peAgente(r, x)}));
  const _peEsp = (x, ate) => _peLinhas(x, ate).filter(l => l.nat === "especial");
  const _peIni = x => (x.tempos||[]).map(r => r.de).filter(Boolean).sort()[0] || null;
  const _peUniao = (x, ate) => uniaoDias(_peLinhas(x, ate).map(l => [l.de, l.fim]));   // tempo de contribuição sem o acréscimo da conversão
  // benefício por incapacidade (CNIS ou o campo esp_incapacidade "dd/mm/aaaa a dd/mm/aaaa; …")
  const _peIncap = x => [...(x.benefCnis||[]).filter(b => /^(31|32|91|92)$/.test(b.especie) && b.de).map(b => [b.de, b.ate || x.hoje]),
    ...String(x.v.esp_incapacidade||"").split(/[;\n]+/).map(s => (s.match(/\d{2}\/\d{2}\/\d{4}/g)||[]).map(isoBr)).filter(d => d.length >= 2 && d[0] && d[1]).map(d => [d[0], d[1]])];
  const _PE_998 = "2020-07-01";   // IN 128, art. 271, § 2º (Decreto 10.410/2020): desde aqui o INSS não conta o benefício por incapacidade como especial
  const _peTirarInss = x => fundirIvs(_peCorta(_peIncap(x), _PE_998, "9999-12-31"));
  const _peSemCnis = x => !x.g && !(x.benefCnis||[]).length && !x.v.esp_incapacidade;
  // os dias especiais por agente; o período sobreposto conta uma vez, pelo agente de menor tempo (IN 128, art. 265, par. único)
  function _peEspPor(x, ate, tirar){
    const por = {15: [], 20: [], 25: []}, out = {15: 0, 20: 0, 25: 0};
    for(const l of _peEsp(x, ate)) por[l.ag || 25].push(...(tirar && tirar.length ? semCobertura(l.de, l.fim, tirar) : [[l.de, l.fim]]));
    let cob = [];
    for(const a of [15, 20, 25]){ out[a] = _peDias(fundirIvs(por[a]).flatMap(([p, q]) => semCobertura(p, q, cob))); cob = fundirIvs([...cob, ...por[a]]); }
    return out;
  }
  const _peBonus = (x, ate) => { const por = _peEspPor(x, ate < EC103 ? ate : EC103); return [15, 20, 25].reduce((t, a) => t + por[a] * (FATOR_ESP[a][x.i] - 1), 0); };
  // a exposição: o agente que sozinho cumpre basta; senão soma pelo preponderante (o de maior tempo), convertendo os outros (IN 128, art. 266)
  function _peEspTot(x, ate, tirar){
    const por = _peEspPor(x, ate, tirar), ags = [15, 20, 25].filter(a => por[a]);
    if(!ags.length) return {dias: 0, ok: false, prep: null, por};
    const so = ags.find(a => por[a] >= a * 365);
    if(so) return {dias: por[so], ok: true, prep: so, por, mix: false};
    const prep = ags.slice().sort((p, q) => por[q] - por[p] || p - q)[0], dias = ags.reduce((t, a) => t + por[a] * _peFat(a, prep), 0);
    return {dias, ok: dias >= prep * 365, prep, por, mix: ags.length > 1};
  }
  // ── carência (até a DER; Lei 8.213/91, art. 142, lido em 16/10/2026, para o inscrito até 24/07/1991) ──
  const _peCar142 = ano => ano <= 1992 ? 60 : ano <= 1995 ? 60 + 6 * (ano - 1992) : ano === 1996 ? 90 : Math.min(180, 96 + 6 * (ano - 1997));
  const _peCarExig = (x, ano) => x.filiacao && x.filiacao <= "1991-07-24" ? _peCar142(ano) : 180;
  // apo_ci_atraso é o campo da família das aposentadorias (texto: as competências pagas em atraso, "01/2010 a 06/2010",
  // um número ou "nenhuma"), com a mesma leitura: as competências até a data saem da carência (Lei 8.213/91, art. 27, II)
  const _peAtraso = (x, iso) => { const s = String(x.v.apo_ci_atraso||"").trim();
    if(!s || /^(n[ãa]o|nenhum|nenhuma|0+)\b/i.test(s)) return 0;
    if(/^\d+$/.test(s)) return +s;
    const ms = new Set();
    for(const m of s.matchAll(/(\d{2})\/(\d{4})(?:\s*(?:a|até|-)\s*(\d{2})\/(\d{4}))?/g)){
      let a = `${m[2]}-${m[1]}`; const b = m[3] ? `${m[4]}-${m[3]}` : a;
      for(let k = 0; a <= b && k < 1200; k++, a = ymDe(somarMeses(a + "-01", 1))) ms.add(a); }
    return [...ms].filter(m => m <= ymDe(iso)).length; };
  const _peTemCi = x => ((x.g||{}).vinculos||[]).some(v => /Individual|Facultativo/i.test(v.tipo||""));
  // as contribuições até a data, com o benefício por incapacidade intercalado (IN 128, art. 193) e sem as pagas em atraso; depois de hoje só cresce se continua contribuindo
  function _peCarEm(x, iso){
    const h = iso < x.hoje ? iso : x.hoje, manual = x.v.car_cumprida !== undefined && x.v.car_cumprida !== "";
    const base = manual ? +x.v.car_cumprida : x.ct ? carenciaAte(x, h) + intercaladoAte(x, h) - _peAtraso(x, h) : null;
    if(base == null) return null;
    const segue = iso > x.hoje && (x.v.apo_segue === "Sim" || (x.tempos||[]).some(r => r.de && !r.ate));
    return base + (segue ? mesesEntreYm(ymDe(x.hoje), ymDe(iso)) - 1 : 0);
  }
  // shortcut: sem o CNIS a data do direito sai só do tempo; a carência fica "a informar" no requisito
  const _peCarOk = (x, d) => { const n = _peCarEm(x, d); return n == null || n >= _peCarExig(x, anoDe(d)); };
  function _peCarReq(x, nota){
    const n = _peCarEm(x, x.der), ex = _peCarExig(x, anoDe(x.der)), manual = !!x.v.car_cumprida, fonte = manual ? "campo" : "CNIS";
    const t142 = x.filiacao && x.filiacao <= "1991-07-24" ? ` (inscrito até 24/07/1991: tabela do art. 142 da Lei 8.213/91${ex === 180 ? ", que desde 2011 também pede 180" : ""})` : "";
    if(n == null) return {est: "informar", txt: `o CNIS não foi lido: informe as contribuições; exige ${ex}${t142}`};
    const h = x.der < x.hoje ? x.der : x.hoje, inter = manual ? 0 : intercaladoAte(x, h), atr = manual ? 0 : _peAtraso(x, h);
    const base = `${n} contribuições até ${fmtBarra(x.der).slice(3)}${inter ? `, com ${inter} meses de benefício por incapacidade intercalado (IN 128, art. 193)` : ""}${atr ? `, sem ${atr} de CI ou facultativo pagas em atraso (Lei 8.213/91, art. 27, II)` : ""}; exige ${ex}${t142}${nota || ""}`;
    if(n < ex) return {est: "falta", txt: `${base}; faltam ${ex - n}`, fonte};
    if(!manual && _peTemCi(x) && !String(x.v.apo_ci_atraso||"").trim()) return {est: "informar", fonte,
      txt: `${base}; há CI ou facultativo no CNIS: o pago em atraso antes do primeiro pagamento em dia não conta (Lei 8.213/91, art. 27, II); informe as competências pagas em atraso (ou "nenhuma")`};
    return {est: "ok", txt: base, fonte};
  }
  // ── acumulação e qualidade (comuns às aposentadorias da família) ─────────
  function _peAcum(x){
    if(x.apos) return {est: "impedido", txt: `já recebe ${x.apos.especie}${x.apos.nb ? ` (NB ${x.apos.nb})` : ""}: duas aposentadorias não se acumulam (Lei 8.213/91, art. 124, II)`, fonte: "CNIS"};
    const at = (x.benefCnis||[]).filter(b => b.ativo), e = rx => at.find(b => rx.test(b.especie)); let b;
    if((b = e(/^(32|41|42|46|57|92)$/))) return {est: "impedido", txt: `aposentadoria B${b.especie} ativa${b.nb ? ` (NB ${b.nb})` : ""}: duas aposentadorias não se acumulam (art. 124, II)`, fonte: "CNIS"};
    if((b = e(/^(31|91)$/))) return {est: "opcao", txt: `auxílio por incapacidade B${b.especie} ativo: não se acumula com aposentadoria (art. 124, I); um cessa, compare os valores`, fonte: "CNIS"};
    if((b = e(/^(36|94)$/))) return {est: "opcao", txt: `auxílio-acidente B${b.especie} ativo: cessa na véspera da aposentadoria (art. 86, §§ 1º e 2º), salvo direito adquirido; compare os valores`, fonte: "CNIS"};
    if((b = e(/^(87|88)$/))) return {est: "opcao", txt: "BPC ativo: não se acumula com aposentadoria (LOAS, art. 20, § 4º); compare os valores", fonte: "CNIS"};
    if(!x.g && !(x.benefCnis||[]).length) return {est: "informar", txt: "o CNIS não foi lido: confira os benefícios em manutenção"};
    return {est: "ok", txt: "nenhum benefício ativo que impeça ou que cesse com a aposentadoria", fonte: "CNIS"};
  }
  // F235 · "precisa estar contribuindo? Não" só vale para quem já completou os requisitos (IN 128, art. 186, § 1º): quem ainda
  // depende de tempo de contribuição, se parar, empurra a data do direito
  const _peQual = x => { const q = (x.hist||[]).length ? qualidadeEm(x, x.der) : null, fonte = q ? q.fonte : undefined;
    let f = null; try{ f = _peFaltaTempo(x); }catch(e){}
    if(f) return {est: "info", fonte, txt: `${f}. Se parar, a data do direito anda; só quem já completou os requisitos não perde o direito por ter parado (IN 128, art. 186, § 1º)`};
    return {est: "info", fonte, txt: `Não: quem já completou os requisitos não perde o direito por ter parado de contribuir (IN 128, art. 186, § 1º)${q ? `; na DER, ${q.txt}` : ""}`}; };
  // F235 · o que ainda depende de contribuir, por benefício, já como resposta ("Sim: …"); null quando nada depende
  // (já cumpriu, ou só falta a idade)
  function _peFaltaTempo(x){
    const cont = (x.tempos||[]).some(r => r.de && !r.ate) ? "se continuar contribuindo" : "se voltar a contribuir";
    if(x.op === "pcd_idade"){ const d = _pcdDiasPcd(x, _peAte(x)); if(!d || d >= 15 * 365) return null;
      const q = REQ_EXTRA.pcd_idade.quando(x);
      return `Sim: faltam ${tempoFmt(15 * 365 - d)} de contribuição depois da deficiência${q ? `, e os 15 anos fecham em ${fmtBarra(q)} ${cont}` : ""}`; }
    if(x.op === "pcd"){ const t = _pcdTempo(x, _peAte(x)); if(!t) return null;
      if(t.semGrau){ const s = _pcdTresGraus(x); if(s.leve) return null;
        const fs = ["grave", "moderada", "leve"].filter(g => s.r[g] && !s.r[g].ja && s.r[g].quando); if(!fs.length) return null;
        const ds = fs.map((g, k) => `${k ? "no" : "no grau"} ${_pcdGrauTxt(g)}, ${k ? "em" : "o tempo fecha em"} ${fmtBarra(s.r[g].quando)}`).join("; ");
        return s.grave ? `Sim, se a avaliação der um grau que ainda não fechou: ${ds}, ${cont}` : `Sim: ${ds}, ${cont}`; }
      if(t.conv == null || t.conv >= t.exig) return null;
      const q = REQ_EXTRA.pcd.quando(x);
      return `Sim: faltam ${tempoFmt(t.exig - t.conv)} de tempo${q ? `, que fecham em ${fmtBarra(q)} ${cont}` : ""}`; }
    if(x.op === "b46"){ const q = REQ_EXTRA.b46.quando(x); return q && q > x.der ? `Sim: os requisitos só se completam em ${fmtBarra(q)}, ${cont}` : null; }
    return null;
  }

  // ── PcD: a deficiência é uma camada (DID e grau) sobre os períodos, e não uma natureza da linha ──
  const _PCD_GRAU = {grave: [25, 20], moderada: [29, 24], leve: [33, 28]};
  const _pcdGr = s => (String(s||"").toLowerCase().match(/grave|moderada|leve/)||[])[0] || null;
  // shortcut: LC 142, art. 11 (seis meses depois da publicação de 09/05/2013); o dia exato não foi conferido, rever se a DID cair em nov/2013
  const _PCD_VIG = "2013-11-09";
  // a aposentadoria da LC 142 não existe antes da vigência: quem já tinha os requisitos tem o direito desde ela
  const _pcdDesde = d => d < _PCD_VIG ? _PCD_VIG : d;
  // def_grau_periodos: "01/01/2000 a 31/12/2010 grave; 01/01/2011 a hoje moderada"
  const _pcdPer = x => String(x.v.def_grau_periodos||"").split(/[;\n]+/).map(s => { const ds = (s.match(/\d{2}\/\d{2}\/\d{4}/g)||[]).map(isoBr), g = _pcdGr(s);
    return ds[0] && g ? {de: ds[0], ate: ds[1] || "9999-12-31", g} : null; }).filter(Boolean);
  // os trechos de tempo com a sua condição: com deficiência (e o grau) e especial (e o agente). Com a DID,
  // conta como PcD tudo o que vem depois dela; sem a DID, só as linhas "com deficiência" e os períodos de grau
  function _pcdSegs(x, ate){
    const ls = _peLinhas(x, ate); if(!ls.length) return [];
    const did = x.v.def_did || null, pers = _pcdPer(x), temEsp = ls.some(l => l.nat === "especial");
    const bs = [...new Set([did, temEsp ? diaSeguinte(EC103) : null, ...pers.flatMap(p => [p.de, p.ate < "9999" ? diaSeguinte(p.ate) : null]),
      ...ls.flatMap(l => [l.de, diaSeguinte(l.fim)])].filter(Boolean))].sort(), out = [];
    for(let k = 0; k < bs.length - 1; k++){
      const a = bs[k], b = diaAnterior(bs[k + 1]), cob = ls.filter(l => l.de <= a && l.fim >= b); if(!cob.length) continue;
      const per = pers.find(p => p.de <= a && p.ate >= b), pcd = did ? a >= did : !!per || cob.some(l => l.nat === "defic");
      const gr = !pcd ? null : (per && per.g) || _pcdGr((cob.find(l => l.nat === "defic" && _pcdGr(l.det))||{}).det) || _pcdGr(x.v.def_grau);
      const esps = cob.filter(l => l.nat === "especial").map(l => l.ag || 25), esp = esps.length ? Math.min(...esps) : null, depois = !!esp && a > EC103;
      const u = out[out.length - 1];
      if(u && u.pcd === pcd && u.gr === gr && u.esp === esp && u.depois === depois && diaSeguinte(u.b) === a) u.b = b;
      else out.push({a, b, pcd, gr, esp, depois});
    }
    out.forEach(s => s.dias = durDias(durCal(s.a, s.b)));
    return out;
  }
  // o tempo convertido ao grau preponderante (RPS, art. 70-E; IN 128, art. 309), com o especial pelo art. 70-F, § 1º
  function _pcdTempo(x, ate){
    const segs = _pcdSegs(x, ate); if(!segs.length) return null;
    const com = segs.filter(s => s.pcd), pcdDias = com.reduce((t, s) => t + s.dias, 0);
    if(!com.length) return {semPcd: true, pcdDias};
    if(com.some(s => !s.gr)) return {semGrau: true, pcdDias};
    const porGr = {}; com.forEach(s => porGr[s.gr] = (porGr[s.gr]||0) + s.dias);
    // o grau preponderante é o de maior tempo antes da conversão (art. 70-E, § 1º); no empate, o que exige menos
    const gp = Object.keys(porGr).sort((p, q) => porGr[q] - porGr[p] || _PCD_GRAU[p][0] - _PCD_GRAU[q][0])[0], alvo = _PCD_GRAU[gp][x.i], cheio = [35, 30][x.i];
    let conv = 0, ganhoEsp = 0, espDepois = 0, semDias = 0;
    for(const s of segs){
      const fb = _peFat(s.pcd ? _PCD_GRAU[s.gr][x.i] : cheio, alvo), fe = s.esp ? _peFat(s.esp, alvo) : 0, usa = fe > fb && !s.depois;
      // o especial entra só se for melhor e só até 13/11/2019 (IN 128, art. 310, § 1º); nunca soma as duas reduções (LC 142, art. 10)
      if(fe > fb && s.depois) espDepois += s.dias;
      if(usa) ganhoEsp += s.dias * (fe - fb);
      conv += s.dias * (usa ? fe : fb);
      if(!s.pcd) semDias += s.dias;
    }
    return {gp, alvo, cheio, exig: alvo * 365, conv, porGr, semDias, pcdDias, ganhoEsp, espDepois};
  }
  const _pcdFaltaDado = (t, x) => !t ? "lance os períodos no quadro Tempos (ou traga do CNIS)"
    : t.semPcd ? (x.v.def_did ? "nenhum período de contribuição depois da DID" : "informe a DID ou marque os períodos com deficiência: o tempo comum sozinho não vira tempo de PcD")
    : t.semGrau ? "informe o grau (leve, moderada ou grave), no campo ou por período" : null;
  const _pcdPartes = (t, x) => [...Object.entries(t.porGr).map(([g, d]) => `${tempoFmt(d)} com deficiência ${g}${g === t.gp ? "" : ` × ${_peF(_peFat(_PCD_GRAU[g][x.i], t.alvo))}`}`),
    ...(t.semDias ? [`${tempoFmt(t.semDias)} sem deficiência × ${_peF(_peFat(t.cheio, t.alvo))}`] : [])].join(" + ") + (t.ganhoEsp ? `; o especial até 13/11/2019 rende ${tempoFmt(t.ganhoEsp)} a mais (art. 70-F)` : "");
  const _pcdDiasPcd = (x, ate) => _pcdSegs(x, ate).filter(s => s.pcd).reduce((t, s) => t + s.dias, 0);
  function _pcdSer(x){
    const v = x.v, lei = /^F84/i.test(v.def_cid||"") ? "TEA é deficiência por lei (Lei 12.764/2012, só na skill)" : /^M79\.?7/i.test(v.def_cid||"") ? "fibromialgia é deficiência por lei (Lei 15.176/2025, só na skill)" : "";
    const bar = v.def_barreiras ? `; barreiras: ${v.def_barreiras}` : "";
    if(v.def_certificado === "Reconhecido") return {est: "ok", txt: `Certificado PcD reconhecido no Meu INSS${bar}`, fonte: "campo"};
    if(v.def_longo === "Não") return {est: "falta", txt: "impedimento de menos de 2 anos não é deficiência (LC 142, art. 2º)", fonte: "campo"};
    if(v.def_certificado === "Negado") return {est: "risco", txt: "o INSS negou o Certificado PcD: recurso ou via judicial, com laudo que descreva a limitação e as barreiras", fonte: "campo"};
    if(v.def_longo === "Sim" && v.def_laudo === "Sim") return {est: "ok", txt: `impedimento de longo prazo${v.def_tipo ? ` (${v.def_tipo.toLowerCase()}${v.def_cid ? `, CID ${v.def_cid}` : ""})` : ""}, com laudo de domínios e barreiras${bar}${lei ? `; ${lei}` : ""}; não precisa estar incapaz de trabalhar`, fonte: "campo"};
    if(v.def_laudo === "Não") return {est: "falta", txt: "sem laudo que descreva a limitação e as barreiras, o diagnóstico sozinho não basta (IN 128, art. 303)", fonte: "campo"};
    // F235 · o que falta e o papel que resolve: o relatório atual no modelo do escritório (e a receita da prótese, quando o relato fala dela)
    const prot = /pr[óo]tese/i.test(relatoDe(x.c)) ? ", e a receita ou a nota fiscal da prótese" : "";
    return {est: "informar", txt: `${lei ? `${lei}, mas o grau ainda depende da avaliação; ` : ""}${v.def_longo === "Sim" ? "o impedimento é de longo prazo, mas falta o laudo com o que a deficiência limita e as barreiras" : "informe o impedimento de 2 anos e o laudo com domínios e barreiras"}: peça o relatório atual do médico assistente, no modelo do escritório, com o que a deficiência limita no dia a dia e as barreiras${prot}`};
  }
  function _pcdNaDer(x){
    if(x.v.def_na_der === "Sim") return {est: "ok", txt: "a deficiência continua na data do pedido", fonte: "campo"};
    if(x.v.def_na_der === "Não") return {est: "falta", txt: "sem a deficiência na DER: cabe a aposentadoria comum (Lei 8.213/91, arts. 48 e 52), com a conversão do tempo de PcD (IN 128, art. 309, § 4º)", fonte: "campo"};
    if(x.v.def_certificado === "Reconhecido") return {est: "ok", txt: "Certificado PcD reconhecido; confirme que a deficiência continua na DER", fonte: "campo"};
    return {est: "informar", txt: "informe se a deficiência continua hoje (um relatório médico recente mostra), ou quando completou os requisitos"};
  }
  const _PE_CAMPOS_PCD = {
    def_grau_periodos: ["Períodos em cada grau (dd/mm/aaaa a dd/mm/aaaa grau; separe com ;)", "text"],
    def_na_der: ["Deficiência presente na data do pedido", "select", SN],
    def_certificado: ["Certificado PcD no Meu INSS", "select", ["", "Não pedido", "Em análise", "Reconhecido", "Negado"]],
    def_pontuacao: ["Pontuação IF-BrA da avaliação do INSS", "number"],
    def_fuzzy: ["Método Fuzzy aplicado", "select", ["", "Sim", "Não", "Não se aplica"]],
    def_barreiras: ["Barreiras presentes (urbanística, arquitetônica, transportes, comunicação, atitudinal, tecnológica)", "text"],
    def_prova_antiga: ["Documento que prova a deficiência antes de nov/2013", "text"],
    // o mesmo rótulo e o mesmo tipo da família das aposentadorias: quem registrar por último não muda o campo
    apo_ci_atraso: ["Contribuições de CI ou facultativo pagas em atraso antes do primeiro pagamento em dia (competências, ex.: 01/2010 a 06/2010, ou \"nenhuma\")", "text"],
  };
  // F235 · o dossiê responde a deficiência: o relatório do médico (tipo, CID, longo prazo, barreiras, se continua hoje) e o
  // documento mais antigo que a prova (antes de 11/2013 só documento prova). Valor provável, com a fonte; o digitado vale mais
  const _pcdOp = x => /^(pcd|pcd_idade)$/.test(x.op || "");
  const _pcdDocs = x => (x.clin || []).filter(i => /^\d{4}-\d{2}-\d{2}$/.test(i.data || ""));
  const _pcdTxt = i => String(((i.anexo || {}).texto) || "");
  const _pcdPerm = i => !!(i.fatos && (i.fatos.perm || i.fatos.congenita)) || /longo prazo|permanente/i.test(_pcdTxt(i));
  Object.assign(PRE_DOSSIE, {
    def_prova_antiga: x => { if(!_pcdOp(x)) return null; const did = x.v.def_did || (PRE_DOSSIE.def_did(x) || {}).val;
      if(!did || did >= _PCD_VIG) return null;
      const d = _pcdDocs(x).filter(i => i.data < _PCD_VIG && i.data >= did).sort((a, b) => a.data < b.data ? -1 : 1)[0]; if(!d) return null;
      return {val: d.titulo && d.titulo.includes(fmtBarra(d.data)) ? d.titulo : `${d.titulo || d.tipo} de ${fmtBarra(d.data)}`, fonte: `${_clinFonte(d)}, no dossiê`}; },
    def_na_der: x => { if(!_pcdOp(x)) return null;
      const r = _pcdDocs(x).filter(i => i.data >= somarMeses(x.hoje, -12) && _pcdPerm(i)).sort((a, b) => a.data < b.data ? 1 : -1)[0];
      return r ? {val: "Sim", fonte: `${_clinFonte(r)}: diz que a deficiência é permanente`} : null; },
    def_longo: x => { if(!_pcdOp(x)) return null; const r = (x.clin || []).find(_pcdPerm);
      return r ? {val: "Sim", fonte: `${_clinFonte(r)}: ${r.fatos && r.fatos.congenita ? "congênita" : "permanente"}`} : null; },
    def_laudo: x => { if(!_pcdOp(x)) return null; const r = (x.clin || []).find(i => /barreira/i.test(_pcdTxt(i)) && /n[ãa]o consegue|limita/i.test(_pcdTxt(i)));
      return r ? {val: "Sim", fonte: `${_clinFonte(r)}: diz o que a pessoa não consegue fazer e as barreiras`} : null; },
    def_barreiras: x => { if(!_pcdOp(x)) return null;
      for(const i of x.clin || []){ const m = _pcdTxt(i).match(/Barreiras?:\s*([^\n]{5,240})/i); if(m) return {val: m[1].trim().replace(/\.$/, ""), fonte: _clinFonte(i)}; }
      return null; },
    def_cid: x => { if(!_pcdOp(x)) return null;
      const r = (x.clin || []).find(i => /barreira|defici[êe]ncia/i.test(_pcdTxt(i)) && (i.cids || []).length) || (x.clin || []).find(i => (i.cids || []).length);
      return r ? {val: r.cids[0], fonte: _clinFonte(r)} : null; },
    def_tipo: x => { if(!_pcdOp(x)) return null;
      const t = [(x.clin || []).map(i => `${i.titulo} ${i.resumo} ${(i.cids || []).join(" ")}`).join(" "), relatoDe(x.c)].join(" ");
      const tipo = /\bH9[01]|\bsurd|auditiv|\bH5[34]|\bH35|\bvis[ãa]o\b|cegueira|\bcego\b|retinose/i.test(t) ? "Sensorial"
        : /amputa|pr[óo]tese|hemipar|parapleg|tetrapleg|\bI69|sequela de AVC|perdeu parte d/i.test(t) ? "Física" : /\bF7\d|intelectual/i.test(t) ? "Intelectual" : "";
      return tipo ? {val: tipo, fonte: (x.clin || []).length ? "documentos médicos do dossiê" : "relato da recepção"} : null; },
  });
  const _pcdGrauTxt = g => g === "moderada" ? "moderado" : g;
  // F235 · o papel da época que prova a DID antiga, dito pelo que o relato conta (pronto-socorro, acidente)
  const _pcdPedirEpoca = (x, did) => { const r = relatoDe(x.c), mes = fmtBarra(did).slice(3);
    const lugar = /pronto[- ]socorro|\bUPA\b/i.test(r) ? "do pronto-socorro" : /hospital|internad/i.test(r) ? "do hospital" : "do atendimento médico";
    return `traga o prontuário ${lugar} de ${mes}${/acidente(?! vascular)/i.test(r) ? " e o boletim de ocorrência do acidente" : ""}, ou outro documento médico daquela época`; };
  // F235 · desde quando já cumpre: volta de mês em mês a partir da data (no máximo até a LC 142) e acerta o dia
  function _pcdDesdeQuando(cumpre, ate){
    let d = ate;
    for(let k = 0; k < 400; k++){ const p = somarMeses(d, -1); if(p < _PCD_VIG || !cumpre(p)) break; d = p; }
    for(let e = diaAnterior(d); e >= _PCD_VIG && cumpre(e); e = diaAnterior(e)) d = e;
    return d;
  }
  // F235 · depois do pedido: a avaliação, o que levar e o recurso (Decreto 3.048/99, art. 305, § 1º, II)
  const _PCD_DEPOIS = "Depois do pedido, o INSS marca a avaliação com médico e assistente social sobre o que a deficiência atrapalha no dia a dia: leve o relatório do médico e os documentos antigos. O grau e a data de início saem dela (IN 128, art. 305); se discordar, cabe recurso ao CRPS em 30 dias da ciência (Decreto 3.048/99, art. 305, § 1º).";

  registrarReq("pcd", [
    {id: "ser_pcd", rot: "Qual é a deficiência, e o que ela, junto com as barreiras do dia a dia, atrapalha (andar, enxergar, ouvir, entender, falar)? Tem de durar 2 anos ou mais; não precisa estar incapaz de trabalhar",
     base: "LC 142/2013, art. 2º; IN 128/2022, art. 303; Portaria Interministerial AGU/MPS/MF/SEDH/MP 1/2014, art. 3º", conf: "conferido",
     campos: ["def_tipo", "def_cid", "def_longo", "def_laudo", "def_barreiras", "def_certificado"], mede: _pcdSer},
    // F235 · a DID antes do grau e do tempo, como na conversa; a do relato serve à conta, e o requisito pede o papel da época
    {id: "did", rot: "Desde quando tem a deficiência? Só o tempo depois dessa data conta como tempo de pessoa com deficiência; antes de 11/2013, só documento da época prova",
     base: "LC 142/2013, art. 6º, §§ 1º e 2º; IN 128/2022, art. 305, §§ 4º a 6º", conf: "conferido", campos: ["def_did", "def_prova_antiga"],
     mede: x => { const did = x.v.def_did, rel = /^relato/.test(((x.preUsado||{}).def_did||{}).fonte||"");
       if(!did) return {est: "informar", txt: "informe a DID (a perícia fixa a data provável; prova por documento, não só testemunhal)"};
       if(did < _PCD_VIG && !x.v.def_prova_antiga) return {est: "informar", txt: `DID em ${fmtBarra(did)}${rel ? ", pelo relato" : ""}, antes da LC 142 (nov/2013): ${_pcdPedirEpoca(x, did)}; testemunha sozinha não prova (LC 142, art. 6º, § 2º)`};
       return {est: "ok", txt: `DID em ${fmtBarra(did)}: ${tempoFmt(_pcdDiasPcd(x, _peAte(x)))} de contribuição depois dela${did < _PCD_VIG ? `; prova da época: ${x.v.def_prova_antiga}` : ""}; a avaliação do INSS, depois do pedido, confirma a data`, fonte: "campo"}; }},
    {id: "grau", rot: "Qual é o grau da deficiência (leve, moderada ou grave)? Quem fixa é o perito médico com a assistente social do INSS",
     base: "LC 142/2013, art. 3º, par. único; IN 128/2022, art. 305, caput e § 3º; Portaria Interministerial 1/2014, art. 2º, § 1º", conf: "conferido",
     campos: ["def_grau", "def_grau_periodos", "def_pontuacao", "def_fuzzy"],
     mede: x => { const v = x.v, pers = _pcdPer(x), gi = _pcdGr(v.def_grau), fz = v.def_fuzzy === "Não" ? "; confira se o caso pedia o método Fuzzy" : "";
       if(v.def_certificado === "Negado") return {est: "risco", txt: "o INSS negou a deficiência na avaliação: recurso ou via judicial", fonte: "campo"};
       if(v.def_pontuacao){ const p = +v.def_pontuacao, pt = p.toLocaleString("pt-BR");
         if(p >= 7585) return {est: "falta", txt: `pontuação ${pt}: 7.585 ou mais não enquadra como deficiência (faixas da skill)`, fonte: "campo"};
         const gs = p <= 5739 ? "grave" : p <= 6354 ? "moderada" : "leve";
         if(gi && gi !== gs) return {est: "risco", txt: `a pontuação ${pt} dá deficiência ${gs}, e o informado é ${gi} (faixas da skill)${fz}`, fonte: "campo"};
         return {est: "ok", txt: `deficiência ${gs} pela pontuação ${pt} (faixas da skill: grave até 5.739, moderada até 6.354, leve até 7.584)${fz}`, fonte: "campo"}; }
       if(pers.length) return {est: "ok", txt: `graus por período: ${pers.map(p => `${p.g} de ${fmtBarra(p.de)}${p.ate < "9999" ? ` a ${fmtBarra(p.ate)}` : " em diante"}`).join("; ")}; quem fixa é a avaliação do INSS${fz}`, fonte: "campo"};
       if(gi) return {est: "ok", txt: `grau ${gi} informado; quem fixa é a avaliação médica e social do INSS (IF-BrA)${fz}`, fonte: "campo"};
       // F235 · antes da avaliação ninguém sabe o grau: a conta do tempo mostra os três
       return {est: "info", txt: "quem fixa o grau é a avaliação médica e social do INSS, depois do pedido; a conta do tempo, abaixo, mostra os três graus"}; }},
    {id: "tempo_pcd", rot: "Quanto tempo você contribuiu com a deficiência? Homem: 25 anos (grave), 29 (moderada) ou 33 (leve); mulher: 20, 24 ou 28",
     base: "LC 142/2013, art. 3º, I a III; IN 128/2022, art. 314, I a III", conf: "conferido", campos: ["def_grau"],
     mede: x => { const t = _pcdTempo(x, _peAte(x));
       if(t && t.semGrau){ const s = _pcdTresGraus(x);
         return {est: s.leve ? "ok" : s.grave ? "provar" : "falta", txt: s.txt, fonte: "Tempos"}; }
       const f = _pcdFaltaDado(t, x); if(f) return {est: "informar", txt: f};
       const ok = t.conv >= t.exig;
       return {est: ok ? "ok" : "falta", txt: `${tempoFmt(t.conv)} pela deficiência ${t.gp} (${_pcdPartes(t, x)}), exige ${t.alvo} anos${ok ? "" : `; faltam ${tempoFmt(t.exig - t.conv)}`}`, fonte: "Tempos"}; }},
    {id: "ajuste_proporcional", rot: "Trabalhou parte da vida sem a deficiência ou mudou de grau? Esse tempo é convertido por uma tabela, e vale o grau em que ficou mais tempo",
     base: "LC 142/2013, art. 7º; Decreto 3.048/99, art. 70-E e § 1º; IN 128/2022, art. 309, §§ 1º a 3º (§ 3º da IN 188/2025)", conf: "conferido", campos: ["def_grau_periodos"],
     mede: x => { const t = _pcdTempo(x, _peAte(x));
       if(t && t.semGrau) return {est: "info", txt: "a conversão do tempo sem deficiência depende do grau que a avaliação fixar; a conta dos três graus está no tempo, acima"};
       const f = _pcdFaltaDado(t, x); if(f) return {est: "informar", txt: f};
       const grs = Object.keys(t.porGr);
       if(grs.length === 1 && !t.semDias) return {est: "info", txt: `sem alternância (só grau ${grs[0]}, sem tempo sem deficiência): não há conversão (IN 128, art. 309, § 3º)`, fonte: "Tempos"};
       return {est: "info", txt: `grau preponderante ${t.gp}, o de maior tempo antes da conversão (${tempoFmt(t.porGr[t.gp])}); ${_pcdPartes(t, x)} (RPS, art. 70-E)`, fonte: "Tempos"}; }},
    {id: "especial_na_pcd", rot: "Trabalhou em atividade insalubre (especial)? Até 13/11/2019 ela pode entrar por uma tabela própria, se for melhor, sem somar as duas reduções",
     base: "LC 142/2013, art. 10; Decreto 3.048/99, art. 70-F, §§ 1º e 2º; IN 128/2022, art. 310, caput e §§ 1º e 2º", conf: "conferido", campos: [],
     mede: x => { if(!_peEsp(x, _peAte(x)).length) return {est: "info", txt: "nenhum período especial no quadro Tempos"};
       const t = _pcdTempo(x, _peAte(x)), f = _pcdFaltaDado(t, x); if(f) return {est: "informar", txt: `há período especial, mas ${f}`};
       if(t.espDepois) return {est: "risco", fonte: "Tempos",
         txt: `${tempoFmt(t.espDepois)} de especial depois de 13/11/2019: a IN 128 (art. 310, § 1º) não converte e o Decreto (art. 70-F, § 1º) não traz o corte; só pela via judicial${t.ganhoEsp ? `; até 13/11/2019 o especial já rende ${tempoFmt(t.ganhoEsp)} a mais` : ""}`};
       if(t.ganhoEsp) return {est: "ok", txt: `o especial até 13/11/2019 entra pela tabela do art. 70-F, § 1º, e rende ${tempoFmt(t.ganhoEsp)} a mais na deficiência ${t.gp}; o mesmo período não soma as duas reduções (LC 142, art. 10)`, fonte: "Tempos"};
       return {est: "info", txt: "o especial não melhora a conta: o período vale pela deficiência, sem somar as duas reduções (LC 142, art. 10); o tempo de PcD não serve para a especial (IN 128, art. 310, § 2º)", fonte: "Tempos"}; }},
    {id: "carencia", rot: "Tem 180 contribuições? Elas não precisam ter sido pagas já com a deficiência",
     base: "IN 128/2022, art. 314, caput e § 3º, e art. 199, I e II; Lei 8.213/91, arts. 24, 25, II, e 142", conf: "conferido", campos: ["car_cumprida", "apo_ci_atraso"],
     mede: x => _peCarReq(x, "; não precisa ser concomitante com a deficiência, e o acréscimo de conversão não é contribuição")},
    {id: "pcd_na_der", rot: "Ainda tem a deficiência hoje, na data do pedido?", base: "IN 128/2022, art. 314, § 2º, e art. 309, § 4º", conf: "conferido",
     campos: ["def_na_der"], mede: _pcdNaDer},
    {id: "qualidade", rot: "Precisa continuar contribuindo?", base: "IN 128/2022, art. 186, § 1º",
     conf: "conferido", campos: [], mede: _peQual},
    {id: "melhor_beneficio", rot: "Quanto vai receber? 100% da média, o fator previdenciário só se aumentar; se outra aposentadoria pagar mais, pode escolher a outra",
     base: "IN 128/2022, art. 233, VIII, e art. 315; LC 142/2013, art. 9º, I e V; EC 103/2019, art. 22", conf: "conferido", campos: [],
     // F235 · "opção" só com outra aposentadoria que já se possa pedir; sem ela, diz quando as outras fecham
     mede: x => { const txt = "100% do salário de benefício; o fator previdenciário só entra se aumentar a renda (LC 142, art. 9º, I)";
       const outras = (x.ops||[]).filter(o => o.o !== "pcd" && ["idade", "transicao", "professor", "b46", "pcd_idade", "hibrida", "idade_rural"].includes(o.o));
       if(!outras.length) return {est: "info", txt};
       const segue = (x.tempos||[]).some(r => r.de && !r.ate);
       const dt = o => { const q = (REQ_EXTRA[o.o]||{}).quando; if(!q) return null; try{ return q(x) || (segue ? q({...x, v:{...x.v, apo_segue:"Sim"}}) : null); }catch(e){ return null; } };
       const ds = outras.map(o => ({o, d: dt(o)})), ja = ds.filter(z => z.d && z.d <= x.der);
       if(ja.length) return {est: "opcao", txt: `${txt}; compare com ${ja.map(z => `${z.o.rot || z.o.o} (requisitos desde ${fmtBarra(z.d)})`).join(", ")} e fique com a maior renda`};
       const idc = x.dn && !outras.some(o => o.o === "idade") ? `; a por idade comum aos ${[65, 62][x.i]}, em ${fmtBarra(dataDaIdade(x.dn, [65, 62][x.i]))}` : "";
       return {est: "info", txt: `${txt}; nenhuma outra aposentadoria fecha hoje: ${ds.map(z => `${z.o.rot || z.o.o}, ${z.d ? `só em ${fmtBarra(z.d)}${segue ? ", contribuindo até lá" : ""}` : "sem data"}`).join("; ")}${idc}`}; }},
    {id: "acumulacao", rot: "Recebe outro benefício? Não dá para somar com outra aposentadoria nem com auxílio por incapacidade, e o auxílio-acidente acaba",
     base: "Lei 8.213/91, art. 124, I e II, e art. 86, §§ 1º e 2º (Lei 9.528/97)", conf: "conferido", campos: [], mede: _peAcum},
  ], _PE_CAMPOS_PCD, {
    resumo: "Quem tem deficiência de longo prazo se aposenta com menos tempo de contribuição: quanto mais grave a deficiência, menos anos são exigidos, e não há idade mínima.",
    // F235 · o acidente com sequela do relato: o auxílio-acidente fica para o advogado conferir (acaba na véspera da aposentadoria)
    agora: x => { const r = relatoDe(x.c), q = x.v.def_did && (x.hist||[]).length ? qualidadeEm(x, x.v.def_did) : null;
      return [_PCD_DEPOIS, ...(/acidente(?! vascular)/i.test(r) && /perdeu|amputa|sequela|pr[óo]tese/i.test(r) ? [`O relato fala de acidente com sequela: o advogado confere o auxílio-acidente${q ? ` (na data do acidente, ${fmtBarra(x.v.def_did)}: ${q.txt})` : ""}; ele acaba na véspera da aposentadoria e entra no cálculo dela (Lei 8.213/91, art. 31 e art. 86, §§ 1º e 2º).`] : [])]; },
    quando: x => { const ini = _peIni(x); if(!ini) return null;
      return quandoCumpre(_pcdDesde(somarAnos(ini, 5)), d => { const t = _pcdTempo(x, d); return !!t && t.conv != null && t.conv >= t.exig && _peCarOk(x, d); }); },
  });

  // F235 · a PcD por tempo nos três graus, sem esperar a avaliação: o tempo sem a deficiência entra convertido pelo grau e o
  // com ela entra cheio; para cada grau, desde quando já tem ou quando fecha (com o vínculo que segue aberto)
  // a conta dos três graus se pede várias vezes por pintura (requisito, veredito, desfecho, qualidade): uma vez por contexto
  const _pcdTresMemo = new WeakMap();
  function _pcdTresGraus(x){ if(!_pcdTresMemo.has(x)) _pcdTresMemo.set(x, _pcdTresGraus0(x)); return _pcdTresMemo.get(x); }
  function _pcdTresGraus0(x){
    const ate = _peAte(x), r = {}, segs = _pcdSegs(x, ate), sem = segs.filter(s => !s.pcd), com = segs.filter(s => s.pcd);
    const dSem = sem.reduce((t, s) => t + s.dias, 0), dCom = com.reduce((t, s) => t + s.dias, 0);
    for(const g of ["grave", "moderada", "leve"]){
      const xg = {...x, v:{...x.v, def_grau:g}}, t = _pcdTempo(xg, ate);
      if(!t || t.conv == null) continue;
      const cumpre = d => { const u = _pcdTempo(xg, d); return !!u && u.conv != null && u.conv >= u.exig && _peCarOk(x, d); };
      const ja = cumpre(ate);
      r[g] = {ja, desde: ja ? _pcdDesdeQuando(cumpre, ate) : null, quando: ja ? null : quandoCumpre(x.hoje, cumpre), conv:t.conv, alvo:t.alvo, fs:_peFat(t.cheio, t.alvo)};
    }
    const fr = g => !r[g] ? `${g}: sem conta` : `${g}: ${r[g].ja ? `já tem desde ${fmtBarra(r[g].desde)}` : r[g].quando ? `fecha em ${fmtBarra(r[g].quando)}` : "não fecha"} (${dSem ? `sem × ${_peF(r[g].fs)} + com = ` : ""}${tempoFmt(r[g].conv)}${r[g].ja ? "" : " hoje"}, exige ${r[g].alvo})`;
    const leve = !!(r.leve && r.leve.ja), grave = !!(r.grave && r.grave.ja);
    const ini = d => fmtBarra(d).slice(3), semP = sem.length ? `${ini(sem[0].a)} a ${ini(sem[sem.length - 1].b)}` : "", comP = com.length ? ini(com[0].a) : "";
    const conta = dSem ? `${tempoFmt(dSem)} sem a deficiência (${semP}) e ${tempoFmt(dCom)} com ela (desde ${comP})${dCom >= dSem ? ", o tempo maior, que dá o grau da conta" : "; o tempo sem a deficiência é o maior: confira com o advogado o grau preponderante (RPS, art. 70-E, § 1º)"}; o tempo sem a deficiência entra convertido, e os ${Math.floor((dSem + dCom) / 365)} anos de contribuição não contam cheios. ` : "";
    const lista = gs => { const t = gs.map(fr).join("; "); return conta ? cap1(t) : t; };
    return {leve, grave, r, dSem, dCom, txt: leve ? `tem o tempo em qualquer grau: ${conta}${lista(["leve","moderada","grave"])}. A avaliação do INSS fixa o grau, e aqui ele não muda o direito`
      : `${conta}${lista(["grave","moderada","leve"])}. O grau sai da avaliação do INSS, depois do pedido`};
  }
  // F235 · o veredito sem o grau: já tem em algum grau (pedir já, e a reafirmação da DER se a avaliação der um grau que não fechou)
  // ou ainda não em nenhum (as datas de cada grau); o desfecho dá a linha da PcD que depende do grau
  REQ_EXTRA.pcd = {...REQ_EXTRA.pcd,
    veredito: (x, a) => {
      const t = _pcdTempo(x, _peAte(x)); if(!t || !t.semGrau) return null;
      const s = _pcdTresGraus(x), G = ["grave", "moderada", "leve"], tem = G.filter(g => s.r[g] && s.r[g].ja), nao = G.filter(g => s.r[g] && !s.r[g].ja);
      if(s.leve) return {tom:"sim", txt:`Sim, em qualquer grau: ${s.txt.replace(/^tem o tempo em qualquer grau:\s*/, "")}. Pedir já.`};
      if(tem.length){ const prox = nao.find(g => s.r[g].quando);
        return {tom:"sim", txt:`Pode ter direito hoje: ${tem.map(g => `${g} desde ${fmtBarra(s.r[g].desde)}`).join(" e ")}; ${nao.map(g => `no grau ${_pcdGrauTxt(g)}, ${s.r[g].quando ? `só em ${fmtBarra(s.r[g].quando)}` : "não fecha"}`).join("; ")}. Pedir já: o grau sai da avaliação do INSS, depois do pedido${prox ? `; se der ${_pcdGrauTxt(prox)}, peça a reafirmação da DER para ${fmtBarra(s.r[prox].quando)} ou abra o card em Aposentadorias futuras com essa data` : ""}.`}; }
      const fs = nao.filter(g => s.r[g].quando);
      return fs.length ? {tom:"ainda", txt:`Ainda não, em nenhum grau: ${fs.map(g => `no grau ${_pcdGrauTxt(g)}, fecha em ${fmtBarra(s.r[g].quando)}`).join("; ")}, se continuar contribuindo. O grau sai da avaliação do INSS, depois do pedido.`} : null; },
    desfecho: (x, a) => {
      const t = _pcdTempo(x, _peAte(x)); if(!t || !t.semGrau) return null;
      const s = _pcdTresGraus(x); if(s.grave) return null;   // já tem em algum grau: o veredito "sim" faz a linha do caso
      const G = ["grave", "moderada", "leve"].filter(g => s.r[g] && s.r[g].quando); if(!G.length) return null;
      const outra = x.c ? dataDoDireito(x.c) : null, d0 = s.r[G[0]].quando;
      const txt = `depende do grau que a avaliação do INSS der: ${G.map(g => `no grau ${_pcdGrauTxt(g)}, fecha em ${fmtBarra(s.r[g].quando)}`).join("; ")}, se continuar contribuindo; paga 100% da média${outra && d0 < outra ? ` (no grau grave, chega antes de ${fmtBarra(outra)})` : ""}`;
      return outra ? {acao:"", txt} : {acao:"lembrete", data:d0, txt:`envie a Aposentadorias futuras com a data do grau grave e confira depois da avaliação: ${txt}`}; },
  };
  registrarReq("pcd_idade", [
    // F235 · a pergunta da deficiência e do que ela atrapalha também na PcD por idade, já respondida pelo dossiê quando há relatório
    {id: "ser_pcd", rot: "Qual é a deficiência, e o que ela, junto com as barreiras do dia a dia, atrapalha (andar, enxergar, ouvir, entender, falar)? Tem de durar 2 anos ou mais; não precisa estar incapaz de trabalhar",
     base: "LC 142/2013, art. 2º; IN 128/2022, art. 303", conf: "conferido", campos: ["def_tipo", "def_cid", "def_longo", "def_laudo", "def_barreiras", "def_certificado"], mede: _pcdSer},
    // F235 · a avaliação do INSS vem depois do pedido e não é requisito: o requisito é a prova da DID por documento
    {id: "avaliacao_did", rot: "Tem documento de desde quando tem a deficiência? Antes de 11/2013, só documento da época prova; a avaliação do INSS confirma a data depois do pedido",
     base: "IN 128/2022, art. 305, caput e §§ 4º a 6º; LC 142/2013, art. 6º, §§ 1º e 2º", conf: "conferido", campos: ["def_did", "def_prova_antiga"],
     mede: x => { const v = x.v, did = v.def_did, rel = /^relato/.test(((x.preUsado||{}).def_did||{}).fonte||"");
       if(v.def_certificado === "Negado") return {est: "risco", txt: "o INSS negou a avaliação: recurso ou via judicial, com prova documental da deficiência", fonte: "campo"};
       if(!did) return {est: "informar", txt: "informe a DID: a avaliação do INSS a confirma depois do pedido, e ela define quanto tempo conta como PcD"};
       if(did < _PCD_VIG && !v.def_prova_antiga) return {est: "informar", txt: `DID em ${fmtBarra(did)}${rel ? ", pelo relato" : ""}, antes da LC 142 (nov/2013): ${_pcdPedirEpoca(x, did)}; prova só testemunhal não vale (LC 142, art. 6º, § 2º)`};
       return {est: "ok", fonte: "campo", txt: `DID em ${fmtBarra(did)}${did < _PCD_VIG ? `, provada por ${v.def_prova_antiga}` : ""}; a avaliação do INSS (médico e assistente social) é marcada depois do pedido e confirma a data: não precisa ser feita antes, e nesta aposentadoria o grau não muda o direito`}; }},
    {id: "idade", rot: "Já tem a idade? 60 anos para o homem e 55 para a mulher", base: "LC 142/2013, art. 3º, IV; IN 128/2022, art. 311, I", conf: "conferido", campos: [],
     mede: x => { if(!x.dn) return {est: "informar", txt: "sem a data de nascimento na ficha"};
       const ex = [60, 55][x.i], d = dataDaIdade(x.dn, ex);
       return d <= x.der ? {est: "ok", txt: `${ex} anos completos em ${fmtBarra(d)}`, fonte: "ficha", quando: d} : {est: "falta", txt: `completa ${ex} anos em ${fmtBarra(d)}`, fonte: "ficha", quando: d}; }},
    {id: "tempo_pcd_15", rot: "Tem 15 anos de contribuição feitos já com a deficiência, em qualquer grau?", base: "LC 142/2013, art. 3º, IV; IN 128/2022, art. 311, II e § 4º",
     conf: "conferido", campos: [],
     mede: x => { const segs = _pcdSegs(x, _peAte(x)); if(!segs.length) return {est: "informar", txt: "lance os períodos no quadro Tempos (ou traga do CNIS)"};
       const d = segs.filter(s => s.pcd).reduce((t, s) => t + s.dias, 0);
       // sem tempo de PcD nunca se usa o tempo comum (a F217 usava e marcava "em ordem")
       if(!d) return {est: "informar", txt: x.v.def_did ? "nenhum período de contribuição depois da DID" : "informe a DID ou marque os períodos com deficiência: o tempo comum não completa os 15 anos (IN 128, art. 311, II)"};
       const ok = d >= 15 * 365;
       return {est: ok ? "ok" : "falta", txt: `${tempoFmt(d)} de contribuição na condição de PcD${x.v.def_did ? ` (desde a DID, ${fmtBarra(x.v.def_did)})` : ""}, exige 15 anos em qualquer grau${ok ? "" : `; faltam ${tempoFmt(15 * 365 - d)}`}`, fonte: "Tempos"}; }},
    {id: "carencia", rot: "Tem 180 contribuições? Podem ter sido pagas antes da deficiência",
     base: "IN 128/2022, art. 311, caput e § 1º, e art. 199; Lei 8.213/91, art. 142", conf: "conferido", campos: ["car_cumprida", "apo_ci_atraso"],
     // F235 · a IN 128 (art. 311, § 1º, lido em 16/10/2026) dispensa a concomitância: não há divergência com a Justiça a mostrar
     mede: x => _peCarReq(x, "; as de antes da deficiência também contam (IN 128, art. 311, § 1º)")},
    {id: "pcd_na_der", rot: "Ainda tem a deficiência hoje, na data do pedido?", base: "IN 128/2022, art. 311, III, e art. 309, § 4º", conf: "conferido",
     campos: ["def_na_der"], mede: _pcdNaDer},
    {id: "especial_so_renda", rot: "Trabalhou em atividade insalubre já com a deficiência? Até 13/11/2019 isso só aumenta o valor; não completa a carência nem os 15 anos",
     base: "IN 128/2022, art. 312, caput, I e II", conf: "conferido", campos: [],
     mede: x => { const segs = _pcdSegs(x, _peAte(x));
       if(!segs.some(s => s.esp)) return {est: "info", txt: "nenhum período especial no quadro Tempos"};
       const d = segs.filter(s => s.pcd && s.esp && !s.depois).reduce((t, s) => t + s.dias, 0);
       if(!d) return {est: "info", txt: "nenhum período especial feito com a deficiência até 13/11/2019"};
       return {est: "info", txt: `${tempoFmt(d)} de especial com deficiência até 13/11/2019 entram só no cálculo do valor; não completam a carência nem os 15 anos (IN 128, art. 312)`, fonte: "Tempos"}; }},
    {id: "rural", rot: "É trabalhador rural? Também tem direito, se ainda for rural na data do pedido", base: "IN 128/2022, art. 311, §§ 2º a 4º", conf: "conferido",
     campos: ["rur_regime", "rur_prova"],
     mede: x => !x.v.rur_regime ? {est: "info", txt: "não marcado como trabalhador rural"}
       : !x.v.rur_prova ? {est: "informar", txt: `${x.v.rur_regime}: comprove a condição rural na DER (início de prova material)`}
       : {est: "ok", txt: `${x.v.rur_regime}, com prova (${x.v.rur_prova}): a condição rural tem de existir na DER, e os 15 anos podem somar períodos de outras categorias, inclusive urbanos (IN 128, art. 311, § 4º)`, fonte: "campo"}},
    {id: "qualidade", rot: "Precisa continuar contribuindo?", base: "IN 128/2022, art. 186, § 1º", conf: "conferido", campos: [], mede: _peQual},
    {id: "renda", rot: "Quanto vai receber? 70% da média mais 1% a cada 12 contribuições, até 100%; o fator previdenciário só se aumentar",
     base: "IN 128/2022, art. 233, IX, e art. 313; LC 142/2013, art. 9º, I e V", conf: "conferido", campos: [],
     // F235 · sem o direito na DER, o valor se mede na data do direito (com as contribuições até lá), e não hoje
     mede: x => { let q = null; try{ q = REQ_EXTRA.pcd_idade.quando(x); }catch(e){} const fut = !!(q && q > x.der);
       const n = _peCarEm(x, fut ? q : x.der); if(n == null) return {est: "informar", txt: "o CNIS não foi lido: informe as contribuições para medir o valor"};
       const pct = Math.min(100, 70 + Math.floor(n / 12));
       return {est: "info", fonte: x.v.car_cumprida ? "campo" : "CNIS", txt: fut ? `na data do direito (${fmtBarra(q)}), com cerca de ${n} contribuições: ${pct}% da média (70% + 1% a cada 12 contribuições; o arredondamento se confere no cálculo); o fator previdenciário só se aumentar`
         : `70% + 1% a cada 12 contribuições: ${n} contribuições dão ${pct}% da média; o fator previdenciário só se aumentar`}; }},
    {id: "acumulacao", rot: "Recebe outro benefício? Não acumula com outra aposentadoria nem com auxílio por incapacidade; o auxílio-acidente acaba",
     base: "Lei 8.213/91, arts. 124 e 86, §§ 1º e 2º", conf: "conferido", campos: [], mede: _peAcum},
  ], _PE_CAMPOS_PCD, {
    // F235 · a idade comum da mulher é 62 desde a reforma: "5 anos mais cedo" só valia para o homem
    resumo: "A pessoa com deficiência, em qualquer grau, se aposenta aos 60 anos (homem) ou 55 (mulher), antes da idade comum de 65 e 62, com 15 anos de contribuição feitos já com a deficiência.",
    agora: x => [_PCD_DEPOIS],
    // F235 · só falta o tempo com a deficiência: o veredito já diz quando ele fecha, e que depende de continuar contribuindo
    veredito: (x, a) => { if(!a.quando || a.quando <= x.hoje) return null;
      const ruins = a.rs.filter(r => ["falta", "risco", "impedido"].includes(r.est)); if(ruins.length !== 1 || ruins[0].id !== "tempo_pcd_15") return null;
      const d = _pcdDiasPcd(x, _peAte(x)), segue = (x.tempos||[]).some(r => r.de && !r.ate);
      return {tom:"ainda", txt:`Ainda não: os 15 anos de contribuição com a deficiência fecham em ${fmtBarra(a.quando)}${segue ? ", se continuar contribuindo" : ""}; faltam ${tempoFmt(15 * 365 - d)}.`}; },
    // F235 · a data futura vale contribuindo até lá: a linha do desfecho diz isso
    desfecho: (x, a) => { if(!a.quando || a.quando <= x.hoje) return null;
      const dep = _pcdDiasPcd(x, _peAte(x)) < 15 * 365 || !_peCarOk(x, _peAte(x)), segue = (x.tempos||[]).some(r => r.de && !r.ate);
      return {acao: "lembrete", data: a.quando, txt: `envie a Aposentadorias futuras: direito em ${fmtBarra(a.quando)}${dep ? `, ${segue ? "se continuar contribuindo" : "se voltar a contribuir"} até lá (parar empurra a data)` : ""}`}; },
    quando: x => { if(!x.dn) return null;
      return quandoCumpre(_pcdDesde(dataDaIdade(x.dn, [60, 55][x.i])), d => _pcdDiasPcd(x, d) >= 15 * 365 && _peCarOk(x, d)); },
  });

  // ── especial: prova, ruído, EPI e categoria (servem à B46 e à conversão) ──
  function _peProva(x, ate){
    const ls = _peEsp(x, ate); if(!ls.length) return {est: "informar", txt: "nenhum período especial lançado no quadro Tempos"};
    // o PPP do dossiê prova só o período que ele cobre (as datas de exposição), e não os outros vínculos
    const pppDz = l => (x.fd.ppps||[]).some(p => (p.riscos||[]).some(r => (isoBr(r.ini) || "0000-01-01") <= l.fim && (isoBr(r.fim) || x.hoje) >= l.de));
    const faltas = [], ok = []; let dz = false;
    for(const l of ls){ const per = `${fmtBarra(l.de)} a ${fmtBarra(l.fim)}`, doc = `${l.prova} ${l.det}`;
      if(pppDz(l)){ dz = true; ok.push(`${per}: PPP do dossiê`); continue; }
      if(x.v.esp_ppp === "Sim" || /PPP/i.test(doc)){ ok.push(`${per}: PPP`); continue; }
      // sem PPP, o documento da época (o fim do período decide a exigência mais dura); "CNIS" não prova especial
      if(l.fim >= "2004-01-01") faltas.push(`${per}: desde 01/01/2004 só o PPP prova`);
      else if(l.fim >= "1996-10-14"){ if(x.v.esp_ltcat === "Sim" || /LTCAT|laudo/i.test(doc)) ok.push(`${per}: formulário com LTCAT`); else faltas.push(`${per}: de 14/10/1996 a 2003, formulário com LTCAT`); }
      else if(l.fim >= "1995-04-29"){ if(/formul|SB-?40|DSS|DIRBEN|DISES|laudo|LTCAT/i.test(doc)) ok.push(`${per}: formulário`); else faltas.push(`${per}: até 13/10/1996, formulário (no ruído, com laudo); informe o documento`); }
      else if(/CTPS|carteira|formul|SB-?40|DSS|DIRBEN|DISES|laudo|LTCAT/i.test(doc)) ok.push(`${per}: CTPS (categoria) ou formulário`);
      else faltas.push(`${per}: até 28/04/1995, CTPS (categoria) ou formulário; informe o documento`);
    }
    // "falta" só quando o período exige o PPP e o cliente disse que não tem; o documento antigo ainda pode aparecer
    const semPpp = x.v.esp_ppp === "Não" && !(x.fd.ppps||[]).length && faltas.some(f => /só o PPP/.test(f));
    if(faltas.length) return {est: semPpp ? "falta" : "informar", txt: `${faltas.join("; ")} (IN 128, art. 274)`, fonte: "Tempos"};
    // F235 · o PPP lido sem o responsável pelos registros ambientais (seção 16): a tela pede a conferência no papel
    const semResp = [...new Set((x.fd.ppps||[]).filter(p => p.resp === "nao").map(p => p.empresa || "empresa"))];
    return {est: "ok", txt: `${ok.join("; ")} (IN 128, art. 274; o PPP vale se emitido desde 18/07/2002)${semResp.length ? `; confira se o PPP de ${semResp.join(" e ")} traz o responsável pelos registros ambientais (engenheiro ou médico do trabalho) e a assinatura da empresa: sem eles o período pode não ser aceito, e se pede a correção à empresa ou o LTCAT (IN 128, arts. 281 e 285)` : ""}`, fonte: dz ? "PPP" : "Tempos"};
  }
  const _PE_RUIDO = [["0000-01-01", "1997-03-05", 80], ["1997-03-06", "2003-11-18", 90], ["2003-11-19", "9999-12-31", 85]];
  const _peDb = n => String(n).replace(".", ",");
  function _peRuido(x){
    const rs = (x.fd.ppps||[]).flatMap(p => (p.riscos||[]).filter(r => r.db != null).map(r => ({...r, empresa: p.empresa || ""})));
    if(!rs.length) return {est: "info", txt: "nenhum ruído medido nos PPPs do dossiê"};
    const ruins = [];
    for(const r of rs){ const a = isoBr(r.ini) || "0000-01-01", b = isoBr(r.fim) || x.hoje;
      // "superior a": o ruído igual ao limite não enquadra
      for(const [p, q, lim] of _PE_RUIDO) if(a <= q && b >= p && !(r.db > lim))
        ruins.push(`${_peDb(r.db)} dB${r.empresa ? ` (${r.empresa})` : ""} não passa de ${lim} dB no trecho de ${fmtBarra(a > p ? a : p)} a ${fmtBarra(b < q ? b : q)}`); }
    // F235 · desde 01/01/2004 o INSS só enquadra o ruído medido pelo NEN (ou a NHO-01 com jornada de 8 horas): o PPP lido sem a técnica é aviso
    for(const r of rs.filter(r => r.nen === false && r.db > 85 && (isoBr(r.fim) || x.hoje) >= "2004-01-01"))
      ruins.push(`desde 01/01/2004 o PPP${r.empresa ? ` de ${r.empresa}` : ""} não mostra a técnica (NEN ou NHO-01 com jornada de 8 horas), e o INSS costuma negar o ruído sem ela: peça à empresa a correção do PPP ou o LTCAT antes de protocolar; na Justiça, sem o NEN, vale o pico de ruído com perícia (Tema 1083 do STJ)`);
    if(ruins.length) return {est: "risco", txt: `${ruins.join("; ")} (limites de 80 dB até 05/03/1997, 90 até 18/11/2003 e 85 depois: IN 128, art. 292)`, fonte: "PPP"};
    return {est: "ok", txt: `ruído acima do limite da época: ${rs.map(r => `${_peDb(r.db)} dB de ${r.ini || "?"} a ${r.fim || "hoje"}`).join("; ")} (IN 128, art. 292)`, fonte: "PPP"};
  }
  const _PE_EPI = "1998-12-03";   // IN 128, art. 291: o EPI só conta nas demonstrações ambientais a partir de 03/12/1998
  function _peEpi(x, ate){
    const rs = (x.fd.ppps||[]).flatMap(p => (p.riscos||[]).filter(r => /^S/i.test(r.epi||"")));
    if(!rs.length && x.v.esp_epi !== "Sim") return x.v.esp_epi === "Não" || (x.fd.ppps||[]).length
      ? {est: "ok", txt: "nenhum EPI eficaz declarado", fonte: (x.fd.ppps||[]).length ? "PPP" : "campo"} : {est: "informar", txt: "informe se o PPP declara EPI eficaz"};
    // cada exposição com EPI eficaz: [agente, início, fim, é ruído]
    const itens = rs.length ? rs.map(r => [r.fator || "agente", isoBr(r.ini) || "0000-01-01", isoBr(r.fim) || x.hoje, r.db != null || /ru[íi]do/i.test(r.fator||"")])
      : _peEsp(x, ate).map(l => [l.det || "agente do período", l.de, l.fim, /ru[íi]do/i.test(l.det)]);
    if(!itens.length) return {est: "informar", txt: "EPI eficaz informado, mas nenhum período especial lançado"};
    const fonte = rs.length ? "PPP" : "campo", canc = x.v.esp_cancerigeno === "Sim";
    const afasta = itens.filter(([, , b, ru]) => b >= _PE_EPI && !ru && !canc);
    if(afasta.length) return {est: "risco", fonte, txt: `EPI eficaz declarado para ${afasta.map(([f, a, b]) => `${f} de ${fmtBarra(a > _PE_EPI ? a : _PE_EPI)} a ${fmtBarra(b)}`).join("; ")}: em princípio afasta o especial; cabe ao segurado provar a ineficácia, e na dúvida decide-se a favor dele (Tema 555/STF; Tema 1090/STJ)`};
    const por = [];
    if(itens.some(([, , b]) => b < _PE_EPI)) por.push("antes de 03/12/1998 o EPI não conta (IN 128, art. 291)");
    if(itens.some(([, , b, ru]) => b >= _PE_EPI && ru)) por.push("no ruído acima do limite o EPI eficaz não afasta (Tema 555/STF)");
    if(canc && itens.some(([, , b, ru]) => b >= _PE_EPI && !ru)) por.push("agente cancerígeno da LINACH: o EPI não afasta (só na skill)");
    return {est: "ok", txt: `EPI eficaz declarado, sem efeito: ${por.join("; ")}`, fonte};
  }
  function _peCategoria(x, ate){
    const ls = _peEsp(x, ate); if(!ls.length) return {est: "informar", txt: "nenhum período especial lançado no quadro Tempos"};
    const vs = ((x.g||{}).vinculos||[]).filter(v => v.tipo !== "Benefício" && v.inicio).map(v => ({tipo: v.tipo || "", origem: v.origem || "", de: isoBr(v.inicio), ate: isoBr(v.fim||"") || x.hoje}));
    const ruim = new Map(), sem = [];
    for(const l of ls){ const per = `${fmtBarra(l.de)} a ${fmtBarra(l.fim)}`;
      const ts = vs.length ? vs.filter(v => v.de <= l.fim && v.ate >= l.de) : x.v.esp_categoria ? [{tipo: x.v.esp_categoria, origem: ""}] : [];
      if(!ts.length){ sem.push(per); continue; }
      for(const v of ts){
        const ci = /Contribuinte Individual|Contribuinte individual|CI cooperado/.test(v.tipo), coop = /coop/i.test(v.origem) || v.tipo === "CI cooperado";
        if(/Facultativo/.test(v.tipo)) ruim.set(`f${per}`, ["falta", `facultativo em ${per}: não há atividade, não há especial`]);
        else if(/Dom[ée]stic/.test(v.tipo)) ruim.set(`d${per}`, ["risco", `doméstico em ${per}: a categoria não está no art. 263 da IN 128`]);
        else if(ci && l.fim > "1995-04-28" && !(coop && l.de >= "2002-12-13")) ruim.set(`c${per}`, ["risco", `contribuinte individual em ${per}: depois de 28/04/1995 o INSS só aceita o cooperado (desde 13/12/2002); na via judicial, Súmula 62 da TNU, não conferida na base`]);
      }
    }
    if(ruim.size){ const rs = [...ruim.values()]; return {est: rs.some(r => r[0] === "falta") ? "falta" : "risco", txt: `${rs.map(r => r[1]).join("; ")} (IN 128, art. 263)`, fonte: vs.length ? "CNIS" : "campo"}; }
    if(sem.length) return {est: "informar", txt: vs.length ? `${sem.join("; ")}: sem vínculo no CNIS; informe a categoria` : "o CNIS não foi lido: informe a categoria nos períodos especiais"};
    return {est: "ok", txt: "empregado ou avulso em todos os períodos especiais (IN 128, art. 263)", fonte: vs.length ? "CNIS" : "campo"};
  }
  const _PE_CAMPOS_ESP = {
    esp_cancerigeno: ["Agente cancerígeno da LINACH", "select", SN],
    esp_incapacidade: ["Benefício por incapacidade dentro de período especial (dd/mm/aaaa a dd/mm/aaaa; separe com ;)", "text"],
    esp_regra_pedida: ["Regra a pedir", "select", ["", "Direito adquirido", "Pontos (art. 21)", "Sem idade (ADI 6309)"]],
    esp_categoria: ["Categoria nos períodos especiais (quando o CNIS não foi lido)", "select", ["", "Empregado", "Avulso", "CI cooperado", "Contribuinte individual", "Doméstico", "Facultativo"]],
    apo_ci_atraso: _PE_CAMPOS_PCD.apo_ci_atraso,
  };
  // ── B46 ───────────────────────────────────────────────────────────────────
  const _B46_PTS = {15: 66, 20: 76, 25: 86}, _B46_IDADE_IN = {15: 55, 20: 58, 25: 60};
  // o direito adquirido: 15/20/25 anos de especial e a carência até 13/11/2019 (IN 128, art. 261)
  function _b46DA(x){
    const a19 = EC103 < _peAte(x) ? EC103 : _peAte(x), e = _peEspTot(x, a19);
    if(!e.prep) return {est: "informar", txt: "nenhum período especial até 13/11/2019 no quadro Tempos"};
    if(!e.ok) return {est: "info", txt: `não tinha: ${tempoFmt(e.dias)} de especial em 13/11/2019, exige ${e.prep} anos`, fonte: "Tempos"};
    const ini = _peEsp(x, a19).map(l => l.de).sort()[0], dE = quandoCumpre(ini, dd => _peEspTot(x, dd).ok) || a19;
    const n = _peCarEm(x, a19);
    if(n == null) return {est: "informar", txt: `os ${e.prep} anos de especial se cumpriram em ${fmtBarra(dE)}; falta medir a carência até 13/11/2019 (CNIS não lido)`, quando: dE};
    // o direito nasce quando as duas condições se juntam (a tabela do art. 142 é a do ano em que se juntam)
    const d = quandoCumpre(dE, dd => dd > a19 || _peCarOk(x, dd));
    if(!d || d > a19) return {est: "falta", txt: `os ${e.prep} anos de especial se cumpriram em ${fmtBarra(dE)}, mas até 13/11/2019 eram ${n} contribuições, e a carência pede ${_peCarExig(x, anoDe(a19))}`, fonte: "CNIS"};
    return {est: "ok", txt: `${e.prep} anos de especial cumpridos em ${fmtBarra(dE)}${d > dE ? ` e a carência em ${fmtBarra(d)}` : ""}, com ${n} contribuições até 13/11/2019: regra anterior, sem idade e sem pontos, 100% da média (IN 128, art. 261)`, fonte: "Tempos", quando: d};
  }
  function _b46Expo(x){
    const ate = _peAte(x), eJ = _peEspTot(x, ate), eI = _peEspTot(x, ate, _peTirarInss(x)), n = (x.fd.ppps||[]).length;
    if(!eJ.prep) return {est: "informar", txt: n ? `lance os períodos especiais no quadro Tempos (o dossiê tem ${n} PPP)` : "nenhum período especial lançado no quadro Tempos"};
    const p = eI.prep || eJ.prep, fr = e => `${tempoFmt(e.dias)} de atividade especial${e.mix ? ` somados pelo agente preponderante de ${e.prep} anos (IN 128, art. 266)` : ""}`;
    if(eI.ok) return {est: "ok", txt: `${fr(eI)}, exige ${eI.prep} anos`, fonte: "Tempos"};
    if(eJ.ok) return {est: "divergente", fonte: "Tempos", txt: `pelo INSS ${fr(eI)}, sem o benefício por incapacidade desde 01/07/2020; pelo Tema 998/STJ, ${tempoFmt(eJ.dias)}; exige ${p} anos`,
      div: {inss: `IN 128, art. 271, § 2º: ${tempoFmt(eI.dias)}, não cumpre os ${p} anos`, judicial: `Tema 998/STJ: ${tempoFmt(eJ.dias)}, cumpre`}};
    return {est: "falta", txt: `${fr(eI)}, exige ${p} anos; faltam ${tempoFmt(p * 365 - eI.dias)}`, fonte: "Tempos"};
  }
  function _b46Pontos(x){
    const fil = x.filiacao;
    if(!fil) return {est: "informar", txt: "informe a primeira filiação (vem do CNIS): os pontos valem para quem se filiou até 13/11/2019"};
    if(fil > EC103) return {est: "info", txt: `filiado em ${fmtBarra(fil)}, depois da reforma: os pontos não se aplicam; vale a regra permanente`};
    if(_b46DA(x).est === "ok") return {est: "info", txt: "dispensado: já tem o direito adquirido até 13/11/2019"};
    if(!x.dn) return {est: "informar", txt: "sem a data de nascimento não há como somar os pontos"};
    const ate = _peAte(x), e = _peEspTot(x, ate, _peTirarInss(x));
    if(!e.prep) return {est: "informar", txt: "nenhum período especial lançado no quadro Tempos"};
    // idade e tempo em dias (EC 103, art. 21, § 1º; RPS, art. 188-P, § 1º) e o tempo sem o acréscimo da conversão
    const P = _B46_PTS[e.prep], id = anosEntre(x.dn, x.der), tc = _peUniao(x, ate) / 365, pts = id + tc, ok = pts >= P && e.ok, bonus = _peBonus(x, ate) / 365;
    const tese = !ok && e.ok && pts + bonus >= P ? `; com o acréscimo da conversão seriam ${_pe1(pts + bonus)}, mas nenhuma norma põe o acréscimo nos pontos (tese)` : "";
    return {est: ok ? "ok" : "falta", fonte: "Tempos",
      txt: `${_pe1(pts)} pontos (idade ${_pe1(id)} + ${_pe1(tc)} de contribuição, em dias e sem o acréscimo da conversão); exige ${P} pontos e ${e.prep} anos de exposição, fixos (EC 103, art. 21)${e.ok ? "" : `; a exposição também falta (${tempoFmt(e.dias)})`}${tese}`};
  }
  function _b46SemIdade(x){
    const fil = x.filiacao;
    if(!fil) return {est: "informar", txt: "informe a primeira filiação (vem do CNIS)"};
    if(_b46DA(x).est === "ok") return {est: "info", txt: "dispensado: já tem o direito adquirido até 13/11/2019"};
    const ate = _peAte(x), e = _peEspTot(x, ate, _peTirarInss(x)), n = _peCarEm(x, x.der), pede = x.v.esp_regra_pedida ? `; regra a pedir: ${x.v.esp_regra_pedida}` : "";
    if(fil <= EC103){
      // F235 · com os pontos cumpridos, a tese da regra sem idade não muda nada: informativo, e não "divergente"
      if(_b46Pontos(x).est === "ok") return {est: "info", txt: `filiado em ${fmtBarra(fil)}, antes da reforma: não precisa da regra sem idade, porque já cumpre os pontos da transição${pede}`};
      if(e.ok && n != null && n >= 180) return {est: "divergente", txt: `filiado em ${fmtBarra(fil)}, antes da reforma: a regra sem idade é tese, e o STF não decidiu a opção; pedir a regra sem idade como principal e os pontos como sucessivo${pede}`,
        div: {inss: "IN 128, art. 262: quem se filiou até 13/11/2019 se aposenta pelos pontos", judicial: "a ADI 6309 derrubou a idade mínima do art. 19, § 1º; a opção do filiado antes da reforma pela regra sem idade (RPS, art. 188-P, caput) é tese"}};
      return {est: "info", txt: `filiado em ${fmtBarra(fil)}, antes da reforma: vale a regra de pontos (IN 128, art. 262); a regra sem idade seria tese${pede}`};
    }
    if(!e.prep) return {est: "informar", txt: "nenhum período especial lançado no quadro Tempos"};
    if(!e.ok) return {est: "falta", txt: `${tempoFmt(e.dias)} de exposição desde a filiação em ${fmtBarra(fil)}, exige ${e.prep} anos`, fonte: "Tempos"};
    if(n == null) return {est: "informar", txt: "o CNIS não foi lido: informe as contribuições"};
    if(n < 180) return {est: "falta", txt: `${n} contribuições, exige 180`, fonte: "CNIS"};
    const ida = _B46_IDADE_IN[e.prep];
    if(x.idade == null || x.idade < ida) return {est: "divergente", txt: `${e.prep} anos de exposição e ${n} contribuições; o INSS ainda pede ${ida} anos de idade (IN 128, art. 260), que a ADI 6309 declarou inconstitucional: se negar pela idade, recorrer`,
      div: {inss: `IN 128, art. 260: idade de ${ida} anos`, judicial: "ADI 6309 (acórdão de 08/06/2026, item 11 da ementa): a idade mínima é inconstitucional"}};
    return {est: "ok", txt: `${e.prep} anos de exposição, ${n} contribuições e ${x.idade} anos: regra permanente (a ADI 6309 derrubou a idade mínima)`, fonte: "Tempos"};
  }
  function _b46Incap(x){
    const ate = _peAte(x), ls = _peEsp(x, ate); if(!ls.length) return {est: "informar", txt: "nenhum período especial lançado no quadro Tempos"};
    const tirar = _peTirarInss(x), U = fundirIvs(ls.map(l => [l.de, l.fim])), dentro = _peInter(U, tirar);
    const comum = Math.max(0, _peUniao(x, ate) - _peDias(U)), nota = comum > 0 ? `; ${tempoFmt(comum)} de tempo comum fica fora da especial (IN 128, art. 264)` : "";
    if(dentro > 0){ const eI = _peEspTot(x, ate, tirar), eJ = _peEspTot(x, ate);
      // a divergência só pesa quando muda o resultado: com o cômputo do INSS a exposição já se cumpre
      // F235 · sem efeito no resultado, sem o selo de divergência (a conferência do requisito vale para o resultado medido)
      if(eI.ok) return {est: "ok", conf: "conferido", fonte: "CNIS", txt: `${tempoFmt(dentro)} de benefício por incapacidade dentro do especial desde 01/07/2020, que o INSS não conta (IN 128, art. 271, § 2º); mesmo sem ele, ${tempoFmt(eI.dias)} de especial cumprem os ${eI.prep} anos${nota}`};
      return {est: "divergente", fonte: "CNIS", txt: `${tempoFmt(dentro)} de benefício por incapacidade dentro do especial desde 01/07/2020: o INSS conta ${tempoFmt(eI.dias)} de especial, a via judicial ${tempoFmt(eJ.dias)}${nota}`,
        div: {inss: `não conta como especial o benefício por incapacidade desde 01/07/2020 (IN 128, art. 271, § 2º): ${tempoFmt(eI.dias)}`, judicial: `Tema 998/STJ, conta como especial: ${tempoFmt(eJ.dias)}`}}; }
    if(_peSemCnis(x)) return {est: "informar", txt: `o CNIS não foi lido: confira se houve benefício por incapacidade dentro do especial${nota}`};
    // F235 · sem benefício no especial, nada a divergir
    return {est: "ok", conf: "conferido", txt: `nenhum benefício por incapacidade dentro do especial desde 01/07/2020${nota}`, fonte: "CNIS"};
  }
  // o direito numa data: o adquirido (até 13/11/2019) ou, depois, os pontos (filiado até a reforma) ou a regra sem idade (filiado depois, ADI 6309)
  function _b46Ok(x, d){
    const d19 = d < EC103 ? d : EC103;
    if(_peEspTot(x, d19).ok && _peCarOk(x, d19)) return true;
    if(d <= EC103 || !x.filiacao) return false;
    const e = _peEspTot(x, d, _peTirarInss(x)); if(!e.ok || !_peCarOk(x, d)) return false;
    if(x.filiacao > EC103) return true;
    return !!x.dn && anosEntre(x.dn, d) + _peUniao(x, d) / 365 >= _B46_PTS[e.prep];
  }

  registrarReq("b46", [
    {id: "exposicao", rot: "Trabalhou 15, 20 ou 25 anos exposto, de forma permanente, a agente que faz mal à saúde?",
     base: "Lei 8.213/91, art. 57, caput e §§ 3º e 4º; IN 128/2022, arts. 266, 268, 269 e 271", conf: "conferido", campos: ["esp_anos"], mede: _b46Expo},
    {id: "agente_tempo", rot: "Qual é o tempo do agente? 15 anos (mina de subsolo na frente de produção), 20 (amianto, mina afastada da frente) ou 25 (os demais: ruído, químicos, biológicos)",
     base: "Portaria DIRBEN/INSS 991/2022, art. 285", conf: "conferido", campos: ["esp_anos"],
     mede: x => { const ls = _peEsp(x, _peAte(x)); if(!ls.length) return {est: "informar", txt: "nenhum período especial lançado no quadro Tempos"};
       const sem = ls.filter(l => !l.ag);
       if(sem.length) return {est: "informar", txt: `informe o tempo do agente de ${sem.length === 1 ? "um período" : `${sem.length} períodos`}: 15 (mina subterrânea na frente de produção), 20 (amianto, mina afastada da frente) ou 25 (os demais)`};
       const por = {}; ls.forEach(l => por[l.ag] = (por[l.ag]||0) + 1);
       return {est: "ok", txt: Object.entries(por).map(([a, n]) => `agente de ${a} anos em ${n === 1 ? "um período" : `${n} períodos`}`).join("; "), fonte: "Tempos"}; }},
    {id: "prova_por_epoca", rot: "Tem o documento de cada época? O PPP emitido desde 18/07/2002 serve para todo o período; sem ele, a carteira só para categoria profissional até 28/04/1995 e o formulário até 2003, e no ruído sempre com o laudo",
     base: "IN 128/2022, arts. 272 e 274 (IN 170/2024); Decreto 3.048/99, art. 188-P, § 6º", conf: "conferido", campos: ["esp_ppp", "esp_ltcat"], mede: x => _peProva(x, _peAte(x))},
    {id: "ruido", rot: "No ruído, passou do limite da época? Acima de 80 dB até 05/03/1997, de 90 dB até 18/11/2003 e de 85 dB depois",
     base: "IN 128/2022, art. 292 (IN 170/2024)", conf: "conferido", campos: [], mede: _peRuido},
    {id: "epi", rot: "O PPP diz que o EPI protegeu? Só tira o direito se protegeu de fato; no ruído e antes de 03/12/1998 não tira",
     base: "IN 128/2022, art. 291, caput e § 2º; STF Tema 555 (ARE 664.335); STJ Tema 1090 (REsp 2.082.072)", conf: "conferido", campos: ["esp_epi", "esp_cancerigeno"],
     mede: x => _peEpi(x, _peAte(x))},
    {id: "categoria_segurado", rot: "Trabalhou como empregado, avulso ou cooperado? O autônomo só conta por categoria profissional até 1995",
     base: "IN 128/2022, art. 263", conf: "conferido", campos: ["esp_categoria"], mede: x => _peCategoria(x, _peAte(x))},
    {id: "carencia", rot: "Tem 180 contribuições?", base: "Lei 8.213/91, arts. 25, II, e 142; IN 128/2022, art. 199", conf: "conferido", campos: ["car_cumprida", "apo_ci_atraso"],
     mede: x => _peCarReq(x)},
    {id: "direito_adquirido", rot: "Já tinha os 15, 20 ou 25 anos de especial até 13/11/2019? Então se aposenta pela regra antiga, sem idade e sem pontos, com 100% da média",
     base: "IN 128/2022, art. 261 e art. 233, V, a", conf: "conferido", campos: [], mede: _b46DA},
    {id: "pontos_transicao", rot: "Já contribuía antes da reforma? Some a idade e o tempo de contribuição: precisa de 66, 76 ou 86 pontos, que não sobem com os anos",
     base: "EC 103/2019, art. 21, I a III, e § 1º; IN 128/2022, art. 262; Decreto 3.048/99, art. 188-P", conf: "conferido", campos: ["apo_filiacao"], mede: _b46Pontos},
    {id: "regra_permanente_sem_idade", rot: "Entrou no INSS depois da reforma? Precisa só dos 15, 20 ou 25 anos e da carência: a idade mínima caiu no STF",
     base: "EC 103/2019, art. 19, § 1º, I; IN 128/2022, art. 260; Decreto 3.048/99, art. 188-P; STF ADI 6309", conf: "conferido", campos: ["apo_filiacao", "esp_regra_pedida"],
     mede: _b46SemIdade},
    {id: "comum_nao_vira_especial", rot: "Ficou afastado por auxílio-doença no meio do trabalho insalubre? Desde 01/07/2020 o INSS não conta esse tempo como especial, mas o STJ conta",
     base: "IN 128/2022, art. 264 e art. 271, § 2º; STJ Tema 998", conf: "divergente", campos: ["esp_incapacidade"], mede: _b46Incap},
    // F235 · o Tema 709 só alcança o trabalho exposto: o serviço sem exposição (o de hoje, se for o caso) pode continuar
    {id: "afastamento_atividade", rot: "Continua trabalhando exposto? Pode seguir enquanto o pedido corre; depois de aposentado, só o trabalho exposto suspende o pagamento, e o serviço sem exposição pode continuar",
     base: "Lei 8.213/91, art. 57, § 8º; IN 128/2022, art. 267 (§§ 1º e 2º da IN 188/2025) e § 3º; STF Tema 709", conf: "conferido", campos: ["esp_continua"],
     mede: x => x.v.esp_continua === "Sim"
       ? {est: "info", txt: "pode seguir na atividade nociva enquanto o pedido corre (a DIB fica na DER); depois de implantado, permanecer ou voltar a ela suspende o pagamento, com contraditório, e o benefício não é cancelado (Tema 709/STF; IN 128, art. 267); o trabalho sem exposição pode continuar", fonte: "campo"}
       : x.v.esp_continua === "Não" ? {est: "ok", txt: "fora da atividade nociva: pode continuar no trabalho de hoje depois de aposentado; o que suspende o pagamento é continuar ou voltar a trabalhar exposto (Tema 709/STF)", fonte: "campo"}
       : {est: "informar", txt: "informe se continua na atividade nociva (depois da implantação, suspende o pagamento: Tema 709/STF); o trabalho sem exposição pode continuar"}},
    {id: "qualidade", rot: "Precisa continuar contribuindo?", base: "IN 128/2022, art. 186, § 1º", conf: "conferido", campos: [], mede: _peQual},
    {id: "renda", rot: "Quanto vai receber? Regra antiga: 100% da média; regra nova: 60% mais 2% por ano acima de 20 anos (homem) ou 15 (mulher e agente de 15 anos)",
     base: "IN 128/2022, art. 233, V; Decreto 3.048/99, art. 188-P, § 3º; STF ADI 6309", conf: "conferido", campos: [],
     mede: x => { if(_b46DA(x).est === "ok") return {est: "info", txt: "direito adquirido: 100% da média (IN 128, art. 233, V, a)"};
       const ate = _peAte(x); if(!_peLinhas(x, ate).length) return {est: "informar", txt: "lance os períodos no quadro Tempos"};
       const anos = Math.floor(_peUniao(x, ate) / 365), base = x.sx === "F" || _peEspTot(x, ate).prep === 15 ? 15 : 20, pct = 60 + 2 * Math.max(0, anos - base);
       return {est: "info", txt: `60% + 2% por ano acima de ${base}: ${anos} anos de contribuição dão ${pct}% da média (EC 103, art. 26; constitucional na ADI 6309)`, fonte: "Tempos"}; }},
  ], _PE_CAMPOS_ESP, {
    // F235 · o direito adquirido antes da reforma não pede pontos: a frase dizia que quem contribuía em 2019 precisa somá-los
    resumo: "Quem trabalhou 15, 20 ou 25 anos exposto a agente que faz mal à saúde (ruído, químico, biológico) se aposenta mais cedo. Quem completou esse tempo até 13/11/2019 se aposenta pela regra antiga, sem idade e sem pontos; quem completou depois e já contribuía antes da reforma precisa também dos pontos (66, 76 ou 86).",
    quando: x => { const ini = _peEsp(x, "9999-12-31").map(l => l.de).sort()[0]; return ini ? quandoCumpre(somarAnos(ini, 10), d => _b46Ok(x, d)) : null; },
  });

  // F235 · continua exposto? O vínculo em aberto com PPP de exposição até os últimos meses diz que sim; o emprego de hoje sem
  // PPP, depois do último período especial, diz que não (a confirmar com a pessoa)
  Object.assign(PRE_DOSSIE, {
    esp_continua: x => { if(x.op !== "b46" || !x.g) return null;
      const abertos = (x.g.vinculos||[]).filter(v => v.tipo !== "Benefício" && v.inicio && !v.fim); if(!abertos.length) return null;
      const ppp = v => (x.fd.ppps||[]).filter(p => raizCnpj(p.cnpj||"") && raizCnpj(p.cnpj||"") === raizCnpj(v.codigo||""));
      const ult = v => ppp(v).flatMap(p => (p.riscos||[]).map(r => isoBr(r.fim||"") || x.hoje)).sort().pop();
      const exp = abertos.find(v => (ult(v)||"") >= somarMeses(x.hoje, -6));
      if(exp) return {val: "Sim", fonte: `PPP de ${tituloOrgao(exp.origem||"")} com exposição até ${fmtBarra(ult(exp))}, e o vínculo segue aberto no CNIS`};
      const v = abertos.find(v => !ppp(v).length);
      return v ? {val: "Não", fonte: `CNIS: o emprego de hoje (${tituloOrgao(v.origem||"") || v.tipo}, desde ${v.inicio}) não tem PPP de exposição; confirme com a pessoa`} : null; },
  });
  // F235 · a B46 decide pela data medida: o trecho do PPP abaixo do limite já fica fora da conta do quadro Tempos, e o "risco"
  // do ruído ou do EPI vira aviso, e não "Ainda não" (com o direito desde 2024, a tela dizia "Ainda não pedir")
  const _b46SoAvisos = a => !a.rs.some(r => ["falta", "impedido"].includes(r.est) || (r.est === "risco" && !["ruido", "epi"].includes(r.id))
    || (r.est === "informar" && r.id !== "afastamento_atividade"));
  // a aposentadoria por tempo com a conversão do especial até 13/11/2019: a saída de quem não pode deixar a exposição
  const _b46B42 = x => { const q = (REQ_EXTRA.transicao || {}).quando; try{ return q ? q(x) : null; }catch(e){ return null; } };
  const _b46Pct = x => { if(_b46DA(x).est === "ok") return 100; const ate = _peAte(x), anos = Math.floor(_peUniao(x, ate) / 365);
    return Math.min(100, 60 + 2 * Math.max(0, anos - (x.sx === "F" || _peEspTot(x, ate).prep === 15 ? 15 : 20))); };
  REQ_EXTRA.b46 = {...REQ_EXTRA.b46,
    pre: {apo_filiacao: x => x.filiacao && !x.v.apo_filiacao ? {val: fmtBarra(x.filiacao), fonte: "do CNIS"} : null},
    veredito: (x, a) => { if(!x.temposAuto || !a.quando || !_b46SoAvisos(a)) return null;
      const av = a.rs.filter(r => ["ruido", "epi"].includes(r.id) && r.est === "risco").map(r => r.txt.replace(/\s*\([^()]*IN 128[^()]*\)$/, ""));
      const nota = av.length ? ` Fica fora da conta o que não conta como especial: ${av.join("; ")}.` : "";
      return a.quando <= x.hoje ? {tom:"sim", txt:`Sim: cumpre os requisitos desde ${fmtBarra(a.quando)}; o pagamento começa no dia do pedido, então peça logo.${nota}`}
        : {tom:"ainda", txt:`Ainda não: o direito chega em ${fmtBarra(a.quando)}.${nota}`}; },
    agora: (x, a) => { if(!a || !a.quando || a.quando > x.hoje || x.v.esp_continua !== "Sim") return [];
      const b42 = _b46B42(x), ele = x.sx === "F" ? "ela" : "ele";
      return [`Antes do pedido, explique: concedida a especial, ${ele} não pode continuar exposto; seguir ou voltar à exposição suspende o pagamento (Tema 709 do STF). O trabalho sem exposição pode continuar.`,
        `Compare as duas saídas: aposentadoria especial desde ${fmtBarra(a.quando)}, com cerca de ${_b46Pct(x)}% da média, deixando a exposição${b42 && b42 <= x.hoje ? `; ou aposentadoria por tempo de contribuição, com a conversão do especial até 13/11/2019 e requisitos desde ${fmtBarra(b42)}, com o fator previdenciário (valor menor), podendo continuar na empresa` : ""}. O advogado simula os dois valores.`]; },
    desfecho: (x, a) => { if(!a.quando || a.quando > x.hoje || x.v.esp_continua !== "Sim") return null;
      const b42 = _b46B42(x);
      return {acao:"caso", txt:`gere o caso e peça já: cumpre os requisitos desde ${fmtBarra(a.quando)}; antes, explique o Tema 709 do STF: concedida a especial, continuar exposto suspende o pagamento${b42 && b42 <= x.hoje ? `. Se não puder sair, a alternativa é a aposentadoria por tempo com a conversão (requisitos desde ${fmtBarra(b42)}, com o fator previdenciário, valor menor), que deixa continuar na empresa` : ""}`}; },
  };

  // ── conversão de tempo especial em comum ─────────────────────────────────
  const _convA19 = x => EC103 < _peAte(x) ? EC103 : _peAte(x);
  function _convAte2019(x){
    const ls = _peEsp(x, _peAte(x)); if(!ls.length) return {est: "informar", txt: "nenhum período especial lançado no quadro Tempos"};
    const U = fundirIvs(ls.map(l => [l.de, l.fim])), antes = _peDias(_peCorta(U, "0000-01-01", EC103)), depois = _peDias(_peCorta(U, diaSeguinte(EC103), "9999-12-31"));
    if(!antes) return {est: "falta", txt: `${tempoFmt(depois)} de especial, todo depois de 13/11/2019: não converte; entra como tempo comum, sem acréscimo (EC 103, art. 25, § 2º)`, fonte: "Tempos"};
    return {est: "ok", txt: `${tempoFmt(antes)} de especial até 13/11/2019 convertem${depois ? `; ${tempoFmt(depois)} depois dessa data não convertem e entram como tempo comum` : ""}`, fonte: "Tempos"};
  }
  function _convFator(x){
    const a19 = _convA19(x), ls = _peEsp(x, a19);
    if(!_peEsp(x, _peAte(x)).length) return {est: "informar", txt: "nenhum período especial lançado no quadro Tempos"};
    if(!ls.length) return {est: "info", txt: "nenhum período especial até 13/11/2019 para converter"};
    const sem = ls.filter(l => !l.ag), tab = `15 anos ×${_peF(FATOR_ESP[15][x.i])}, 20 ×${_peF(FATOR_ESP[20][x.i])}, 25 ×${_peF(FATOR_ESP[25][x.i])}`;
    if(sem.length) return {est: "informar", txt: `informe o tempo do agente de ${sem.length === 1 ? "um período" : `${sem.length} períodos`}: o fator muda (${x.sx === "F" ? "mulher" : "homem"}: ${tab})`};
    const por = _peEspPor(x, a19);
    return {est: "ok", fonte: "Tempos", txt: `${[15, 20, 25].filter(a => por[a]).map(a => `agente de ${a} anos: ${tempoFmt(por[a])} × ${_peF(FATOR_ESP[a][x.i])}`).join("; ")} (${x.sx === "F" ? "mulher" : "homem"}), acréscimo de ${tempoFmt(_peBonus(x, a19))}`};
  }
  // F235 · a parte do vínculo com exposição informada pelo empregador (IEAN) que nenhum PPP do dossiê cobre: o PPP que falta
  const _convLacTxt = l => `o CNIS mostra exposição informada pelo empregador no vínculo de ${fmtBarra(l.de)} a ${fmtBarra(l.ate)}, e ${l.cob.length ? `o PPP do dossiê cobre só ${ivsTxt(l.cob)}` : "o dossiê não tem PPP dele"}`;
  function _convProva(x){
    const a19 = _convA19(x), lac = lacunasPpp(x.g, x.fd.ppps), tem = _peEsp(x, a19).length;
    if(!tem && !lac.length) return {est: "informar", txt: "nenhum período especial até 13/11/2019 no quadro Tempos"};
    const pv = tem ? _peProva(x, a19) : null;
    const rs = [pv, _peRuido(x), tem ? _peEpi(x, a19) : null,
      ...lac.map(l => ({est: "informar", fonte: "CNIS e PPP", txt: `falta o PPP de ${ivsTxt(l.falta)}: ${_convLacTxt(l)}; peça hoje ao ${l.onde} o PPP de ${ivsTxt(l.falta)}, e junte na exigência se ele demorar`}))].filter(r => r && r.est !== "info");
    const pior = rs.slice().sort((a, b) => REQ_ORDEM.indexOf(a.est) - REQ_ORDEM.indexOf(b.est))[0];
    // F235 · o PPP do dossiê já diz se há PPP e se o EPI é eficaz: os campos ficam só para o que ele não diz (o laudo, se a
    // prova não fecha; o cancerígeno, se há agente químico ou biológico com EPI eficaz)
    const camp = [pv && pv.est !== "ok" && "esp_ltcat", (x.fd.ppps||[]).some(p => (p.riscos||[]).some(r => r.db == null && /^S/i.test(r.epi||""))) && "esp_cancerigeno"].filter(Boolean);
    return {est: pior.est, txt: rs.map(r => r.txt).join(" · "), fonte: pior.fonte, ...((x.fd.ppps||[]).length ? {campos: camp} : {})};
  }
  // a aposentadoria por tempo com o período sem PPP contado como especial (agente de 25 anos): mede o que o PPP que falta muda
  function _convCenarios(x){
    const ls = lacunasPpp(x.g, x.fd.ppps), q = (REQ_EXTRA.transicao || {}).quando; if(!ls.length || !q) return null;
    let ts = x.tempos || [];
    for(const l of ls) for(const [a, b] of l.falta) ts = cortarTempos(ts, a, b, {nat: "especial", esp: "25", prova: "IEAN no CNIS; falta o PPP"});
    const y = {...x, tempos: ts}; y.tot = admTotaisDe(ts, x.sx, x.der < x.hoje ? x.der : x.hoje); y.totEm = iso => admTotaisDe(ts, x.sx, iso);
    let sem = null, com = null; try{ sem = q(x); com = q(y); }catch(e){}
    return {ls, sem, com, falta: ivsTxt(ls.flatMap(l => l.falta))};
  }
  function _convConc(x){
    const a19 = _convA19(x), ls = _peEsp(x, a19);
    if(!ls.length) return {est: _peEsp(x, _peAte(x)).length ? "info" : "informar", txt: _peEsp(x, _peAte(x)).length ? "nenhum período especial até 13/11/2019" : "nenhum período especial lançado no quadro Tempos"};
    const ivs = ls.map(l => [l.de, l.fim]), sobra = _peDias(ivs) - uniaoDias(ivs), por = _peEspPor(x, a19), ags = [15, 20, 25].filter(a => por[a]);
    if(sobra > 0) return {est: "ok", fonte: "Tempos", txt: `${tempoFmt(sobra)} de períodos especiais sobrepostos contam uma vez, pelo agente de menor tempo (IN 128, art. 265, par. único): ${tempoFmt(uniaoDias(ivs))} de especial e acréscimo de ${tempoFmt(_peBonus(x, a19))}`};
    return {est: "ok", txt: `sem sobreposição${ags.length > 1 ? `; agentes sucessivos de ${ags.join(", ")} anos: cada um converte pelo seu fator (na aposentadoria especial somam-se pelo preponderante, art. 266)` : ""}`, fonte: "Tempos"};
  }
  const _CONV_DEST = ["", "Direito adquirido", "Pontos (art. 15)", "Idade progressiva (art. 16)", "Pedágio de 50 % (art. 17)", "Pedágio de 100 % (art. 20)", "PcD (LC 142)"];
  function _convDestino(x){
    const d = x.v.esp_destino;
    if(d === "PcD (LC 142)") return {est: "info", txt: "na PcD o especial converte pela tabela própria do art. 70-F do RPS, e só se for melhor: veja a opção PcD"};
    const ate = _peAte(x); if(!_peLinhas(x, ate).length) return {est: "informar", txt: "lance os períodos no quadro Tempos"};
    // as transições só aceitam a conversão até 13/11/2019 (IN 128, arts. 321 a 324); pontos e idades pela fórmula do ano da DER
    const bonus = _peBonus(x, ate), tem = _peUniao(x, ate) + bonus, tem19 = _peUniao(x, _convA19(x)) + bonus;
    const Ta = [35, 30][x.i], T = Ta * 365, ano = anoDe(x.der), id = x.dn ? anosEntre(x.dn, x.der) : null, P = pontosExig(ano, x.sx), I = idadeProgExig(ano, x.sx);
    const p50 = T + 0.5 * Math.max(0, T - tem19), p100 = T + Math.max(0, T - tem19);
    const regras = [
      ["Direito adquirido", tem19 >= T, `${Ta} anos em 13/11/2019; tinha ${tempoFmt(tem19)}`],
      ["Pontos (art. 15)", id != null && tem >= T && id + tem / 365 >= P, id == null ? null : `${Ta} anos e ${P} pontos em ${ano}; tem ${_pe1(id + tem / 365)} pontos e ${tempoFmt(tem)}`],
      ["Idade progressiva (art. 16)", id != null && tem >= T && id >= I, id == null ? null : `${Ta} anos e ${_peIdadeTxt(I)} em ${ano}; tem ${_pe1(id)} anos e ${tempoFmt(tem)}`],
      ["Pedágio de 50 % (art. 17)", tem19 > T - 2 * 365 && tem >= p50, tem19 > T - 2 * 365 ? `exige ${tempoFmt(p50)}; tem ${tempoFmt(tem)}` : `só para quem tinha mais de ${Ta - 2} anos em 13/11/2019; tinha ${tempoFmt(tem19)}`],
      ["Pedágio de 100 % (art. 20)", id != null && id >= [60, 57][x.i] && tem >= p100, id == null ? null : `idade ${[60, 57][x.i]} e ${tempoFmt(p100)}; tem ${_pe1(id)} anos e ${tempoFmt(tem)}`]];
    const pega = d ? regras.filter(r => r[0] === d) : regras;
    if(d && pega.some(r => r[2] == null)) return {est: "informar", txt: "sem a data de nascimento não há como medir esta regra"};
    const ok = pega.filter(r => r[1]), mostra = rs => rs.filter(r => r[2]).map(r => `${r[0]}: ${r[2]}`).join("; ");
    if(ok.length) return {est: "ok", txt: `com a conversão, ${mostra(ok)}`, fonte: "Tempos"};
    return {est: !d && id == null ? "informar" : "falta", txt: `com a conversão, ${tempoFmt(tem)} de tempo; ${mostra(pega)}${!d && id == null ? "; sem a data de nascimento faltam as regras com idade" : ""}`, fonte: "Tempos"};
  }
  function _convIncap(x){
    const ate = _peAte(x), ls = _peEsp(x, ate); if(!ls.length) return {est: "informar", txt: "nenhum período especial lançado no quadro Tempos"};
    const U = fundirIvs(ls.map(l => [l.de, l.fim])), I = fundirIvs(_peIncap(x));
    const antes = _peInter(_peCorta(U, "0000-01-01", EC103), I), depois = _peInter(_peCorta(U, diaSeguinte(EC103), "9999-12-31"), I);
    if(antes) return {est: "ok", fonte: "CNIS", txt: `${tempoFmt(antes)} de benefício por incapacidade dentro do especial até 13/11/2019: converte (antes de 01/07/2020 a IN 128 não o exclui, art. 271, § 2º, e o Tema 998/STJ manda contar)`};
    if(depois) return {est: "info", fonte: "CNIS", txt: "o benefício por incapacidade dentro do especial é posterior a 13/11/2019: não converteria de todo modo, e o conflito entre o art. 271, § 2º, da IN 128 e o Tema 998/STJ não muda a conversão"};
    if(_peSemCnis(x)) return {est: "informar", txt: "o CNIS não foi lido: confira se houve benefício por incapacidade dentro do especial"};
    return {est: "ok", txt: "nenhum benefício por incapacidade dentro do especial", fonte: "CNIS"};
  }

  registrarReq("conv", [
    {id: "ate_2019", rot: "O trabalho insalubre foi até 13/11/2019? Só esse converte; o de depois entra como tempo comum, sem acréscimo",
     base: "EC 103/2019, art. 25, § 2º; IN 128/2022, art. 206, §§ 3º e 4º, e art. 269, § 2º; Decreto 3.048/99, art. 188-P, § 5º; STF ADI 6309", conf: "conferido", campos: [], mede: _convAte2019},
    {id: "fator", rot: "Qual é o multiplicador? Agente de 25 anos ×1,40 (homem) ou ×1,20 (mulher); de 20 anos ×1,75 ou ×1,50; de 15 anos ×2,33 ou ×2,00",
     base: "Decreto 3.048/99, art. 188-P, § 5º", conf: "conferido", campos: ["esp_anos"], mede: _convFator},
    {id: "prova", rot: "O período está provado como especial com o documento da época (PPP, formulário, laudo ou a carteira até 1995)?",
     base: "IN 128/2022, arts. 272, 274, 291 e 292; Decreto 3.048/99, art. 188-P, § 6º", conf: "conferido", campos: ["esp_ppp", "esp_ltcat", "esp_epi", "esp_cancerigeno"], mede: _convProva},
    {id: "so_especial_para_comum", rot: "Só o especial vira comum; o contrário (comum virar especial) não existe mais", base: "IN 128/2022, art. 264", conf: "conferido", campos: [],
     mede: x => ({est: "info", txt: `só o especial converte em comum; o tempo comum não vira especial (IN 128, art. 264)${_peLinhas(x, _peAte(x)).some(l => l.nat !== "especial") ? "; as linhas comuns entram como estão" : ""}`})},
    {id: "nao_e_carencia", rot: "O acréscimo vira tempo de contribuição, mas não conta como contribuição para a carência",
     base: "IN 128/2022, art. 217, III, e art. 206, § 3º; Lei 8.213/91, art. 24", conf: "conferido", campos: [],
     mede: x => { const b = _peBonus(x, _peAte(x)), n = _peCarEm(x, x.der);
       if(!b) return {est: "info", txt: "sem acréscimo de conversão; a carência é o número de contribuições"};
       return {est: "info", txt: `o acréscimo de ${tempoFmt(b)} conta como tempo de contribuição, não como contribuição: a carência fica em ${n == null ? "o que o CNIS mostrar" : `${n} contribuições`} (Lei 8.213/91, art. 24)`, fonte: n == null ? undefined : "CNIS"}; }},
    {id: "concomitancia", rot: "Teve dois trabalhos insalubres ao mesmo tempo? Contam uma vez só, pelo que exige menos anos",
     base: "IN 128/2022, arts. 265, par. único, e 266", conf: "conferido", campos: [], mede: _convConc},
    {id: "destino", rot: "Em que aposentadoria o tempo convertido vai entrar? Direito adquirido, pontos, idade progressiva ou pedágios (as transições aceitam a conversão só até 13/11/2019)",
     base: "EC 103/2019, arts. 15, § 1º, 16, § 1º, 17 e 20; IN 128/2022, arts. 321 a 324", conf: "conferido", campos: ["esp_destino", "apo_filiacao"], mede: _convDestino},
    // F235 · o corte do INSS (desde 01/07/2020) não alcança o tempo que converte (até 13/11/2019): sem selo de divergência aqui
    {id: "incapacidade_no_especial", rot: "Ficou afastado por auxílio-doença no meio do trabalho insalubre, até 13/11/2019? Esse afastamento conta como especial e converte (Tema 998 do STJ); o corte do INSS vale só para afastamento desde 01/07/2020, que já não converte",
     base: "IN 128/2022, art. 271, § 2º; STJ Tema 998", conf: "conferido", campos: ["esp_incapacidade"], mede: _convIncap},
  ], {..._PE_CAMPOS_ESP, esp_destino: ["Aposentadoria em que o tempo convertido vai entrar", "select", _CONV_DEST]}, {
    resumo: "O tempo insalubre trabalhado até 13/11/2019 vale mais quando vira tempo comum (homem ×1,40, mulher ×1,20, no agente de 25 anos), e esse acréscimo ajuda a completar a aposentadoria por tempo ou as regras de transição.",
  });
  // F235 · a conversão com o PPP que falta: pedir já a aposentadoria por tempo e juntar o PPP na exigência (levado só à Justiça,
  // o benefício começa na citação); sem lacuna, o trecho do PPP abaixo do limite já fica fora da conta e não vira "Ainda não"
  REQ_EXTRA.conv = {...REQ_EXTRA.conv,
    pre: {apo_filiacao: x => x.filiacao && !x.v.apo_filiacao ? {val: fmtBarra(x.filiacao), fonte: "do CNIS"} : null},
    veredito: (x, a) => {
      const c = _convCenarios(x);
      if(c && c.com) return c.com <= x.hoje
        ? {tom:"sim", txt:`Pedir já, com o PPP que falta (${c.falta}): com ele, a aposentadoria por tempo tem os requisitos desde ${fmtBarra(c.com)}; sem ele, ${c.sem ? `só em ${fmtBarra(c.sem)}` : "ainda sem data"}. Peça o PPP hoje e junte na exigência.`}
        : {tom:"ainda", txt:`Com o PPP que falta (${c.falta}), a aposentadoria por tempo fecha em ${fmtBarra(c.com)}; sem ele, ${c.sem ? `em ${fmtBarra(c.sem)}` : "ainda sem data"}. Peça o PPP hoje.`};
      if(a.rs.some(r => ["falta", "impedido", "informar"].includes(r.est) || (r.est === "risco" && r.id !== "prova"))) return null;
      const pr = a.rs.find(r => r.id === "prova" && r.est === "risco"), fat = a.rs.find(r => r.id === "fator"), ac = fat && (String(fat.txt).match(/acréscimo de [^;()]+/) || [])[0];
      if(pr && !x.temposAuto) return null;   // o quadro digitado à mão pode ter o trecho que não conta
      return {tom:"sim", txt:`Sim: o especial até 13/11/2019 converte${ac ? ` (${ac.trim()})` : ""}${pr ? ", já sem o trecho que não conta como especial" : ""}; a conversão entra na aposentadoria por tempo, que é o pedido.`}; },
    agora: (x, a) => { const c = _convCenarios(x); if(!c) return [];
      const out = c.ls.map(l => `Peça hoje ao ${l.onde} o PPP de ${ivsTxt(l.falta)}: ${_convLacTxt(l)}${l.falta.some(([p]) => p <= "1995-04-28") ? ". Até 28/04/1995, o cargo na carteira pode bastar, se a função estiver entre as categorias profissionais (a conferir)" : ""}.`);
      if(c.com) out.push(`Com o PPP que falta, a aposentadoria por tempo tem os requisitos ${c.com <= x.hoje ? "desde" : "em"} ${fmtBarra(c.com)}; sem ele, ${c.sem ? `só em ${fmtBarra(c.sem)}` : "ainda sem data"}.`);
      out.push("Não espere o PPP para pedir: protocole já e junte o PPP na exigência (o INSS dá ao menos 30 dias, prorrogáveis; IN 128, art. 566). Depois da decisão, o documento novo só vale da entrega; levado só à Justiça, o benefício começa na citação (Tema 1124 do STJ).");
      return out; },
    // a linha do caso vai como aposentadoria por tempo (B42): é nela que o tempo convertido entra
    desfecho: (x, a) => { const c = _convCenarios(x); if(!c || !c.com || c.com > x.hoje) return null;
      const oc = x.c && opcoesSel(x.c).find(z => z.o === "conv");
      return {acao:"caso", ...(oc ? {o: {...oc, cod: "B42", sub: "B42"}} : {}), txt:`gere o caso e peça já a aposentadoria por tempo: com o PPP que falta (${c.falta}), os requisitos estão cumpridos desde ${fmtBarra(c.com)}${c.sem ? `; sem ele, só em ${fmtBarra(c.sem)}` : ""}. Peça hoje o PPP ao empregador e junte na exigência: o PPP tem de ir ao INSS, porque levado só à Justiça o benefício começa na citação (Tema 1124 do STJ)`}; },
  };
  // F235 · na B42, o que o PPP que falta muda (a mesma conta da conversão), sem tirar o que o catálogo dela já diz
  const _traAgora0 = (REQ_EXTRA.transicao || {}).agora;
  if(REQ_EXTRA.transicao) REQ_EXTRA.transicao = {...REQ_EXTRA.transicao, agora: (x, a) => {
    let base = []; try{ base = (_traAgora0 && _traAgora0(x, a)) || []; }catch(e){}
    const c = _convCenarios(x);
    return c && c.com ? [...base, `Com o PPP que falta (${c.falta}), a conversão do especial dá os requisitos ${c.com <= x.hoje ? "desde" : "em"} ${fmtBarra(c.com)}; sem ele, ${c.sem ? `só em ${fmtBarra(c.sem)}` : "ainda sem data"}. Peça o PPP hoje e protocole já: veja a Conversão de tempo especial.`] : base; }};
})();
// F235 · a idade da pessoa com deficiência no quadro do CNIS: "65 (a idade mínima)" soava como "ainda não" para quem tem a
// deficiência e já passou dos 60 (55, mulher). O sinal: a PcD escolhida, o relato ou o relatório médico da deficiência
const RX_RELATO_PCD = /defici[êe]ncia|\bsurd[oa]|baixa vis[ãa]o|\bceg[oa]\b|cegueira|amputa|pr[óo]tese|\bAVC\b|derrame|hemipar|cadeirante|paralisia|retinose/i;
function sinalPcd(c){
  return opcoesSel(c).some(o=>/^(pcd|pcd_idade)$/.test(o.o)) || RX_RELATO_PCD.test(relatoDe(c))
    || docsDoDossie(c.id).some(a=>/relat[óo]rio m[ée]dic/i.test(a.nome||"") && /defici[êe]ncia/i.test(String(a.texto||"").slice(0, 600)));
}
