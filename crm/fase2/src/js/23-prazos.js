function pcdIdadeNoPA(c, q){
  const dn = dnIso(c.dn), id = idadeDe(c.dn); if(!dn || id==null || !sinalPcd(c)) return;
  const ex = ehF(c) ? 55 : 60, d = dataDaIdade(dn, ex), pcd = `a por idade da pessoa com deficiência pede ${ex}, ${id >= ex ? `que ${ehF(c) ? "ela" : "ele"} tem desde ${fmtBarra(d)}` : `em ${fmtBarra(d)}`}`;
  const it = q.itens.find(x=>x.k==="cnis.idade");
  if(it) it.txt = `${it.txt.replace("a idade mínima da aposentadoria por idade", "a idade da aposentadoria por idade comum")}; ${pcd}`;
  const b = (q.blocos||[]).find(x=>x[0]==="Idade"); if(b) b[1] += ` · PcD: ${ex}${id >= ex ? ` desde ${fmtBarra(d)}` : ` em ${fmtBarra(d)}`}`;
}
// F235 · em "Já temos", o documento médico de antes de 11/2013 de quem pede a PcD é a prova da data de início
function provaPcdNoDoc(c, as){
  if(!(as||[]).length || !opcoesSel(c).some(o=>/^(pcd|pcd_idade)$/.test(o.o))) return "";
  const ids = new Set(as.map(a=>a.id));
  const i = linhaClinica(c.id).filter(i=>i.anexo && ids.has(i.anexo.id) && /^\d{4}-\d{2}-\d{2}$/.test(i.data||"") && i.data < "2013-11-09").sort((a, b)=>a.data < b.data ? -1 : 1)[0];
  return i ? `prova a deficiência antes de 11/2013 (${fmtBarra(i.data)}): junte ao pedido` : "";
}
// ── Rural, híbrida e salário-maternidade (casos-ouro em testes/cadastro/req-ouro/rural_mat.json) ──
// F232 · catálogo de requisitos · rural, híbrida e salário-maternidade (idade_rural, hibrida, urb, rur)
// Fonte: crm/fase2/docs/REQUISITOS-POR-BENEFICIO.md, seção "Rural, híbrida e salário-maternidade".
(()=>{
  // ── auxiliares da família ──────────────────────────────────────────────
  const _rmYm = k => String(k||"").split("-").reverse().join("/");            // "AAAA-MM" → "MM/AAAA"
  const _rmMes = iso => _rmYm(ymDe(iso));
  const _rmDias = (a, b) => Math.round((Date.parse(b+"T12:00:00") - Date.parse(a+"T12:00:00"))/864e5) + 1;
  const _rmIdTxt = a => a % 1 ? `${Math.floor(a)} anos e 6 meses` : `${a} anos`;
  const _rmAno = t => (String(t||"").match(/\b(19|20)\d{2}\b/)||[])[0] || "";
  // documento cuja validade alcança as duas metades (Portaria 990, art. 94, § 5º); ITR e nota são anuais
  const _rmLonga = /escritura|matr[íi]cula|t[íi]tulo|propriedade|posse|contrato|comodato|arrendamento|parceria/i;
  // o regime da linha: empregado rural; CI rural e boia-fria (art. 204); o resto (inclusive em branco) conta como segurado especial
  const _rmTipo = r => /empregado/i.test(r||"") ? "emp" : /ci rural|boia|diarista/i.test(r||"") ? "ci" : "se";
  function _rmMeses(de, ate){
    const out = []; if(!de || !ate || ate < de) return out;
    for(let k = ymDe(de), f = ymDe(ate); k <= f; k = ymDe(somarMeses(k+"-01", 1))) out.push(k);
    return out;
  }
  const _rmInd = x => new Set([...((x.an||{}).indicadores||[]), ...((x.g||{}).indicadores||[])].map(i=>i.codigo || i)
    .concat(((x.g||{}).vinculos||[]).flatMap(v=>v.indicadores||[])));
  // desde 01/2023 a lei quer só o cadastro do CNIS (art. 38-B, § 1º), mas a IN 128 (art. 117, § 1º) e a Portaria 990
  // (art. 101, § 1º) prorrogam o prazo até 50 % dos segurados especiais estarem cadastrados: a autodeclaração ratificada
  // continua valendo; o ato que encerra a prorrogação não foi achado
  const _rm2023 = (n, lido) => `${n ? `${n} ${n===1?"mês":"meses"} desde 01/2023 fora do cadastro do CNIS` : "fato desde 01/2023 sem o cadastro de segurado especial no CNIS"}: a Lei 8.213, art. 38-B, § 1º, quer o cadastro, mas o prazo segue prorrogado até 50 % dos segurados especiais estarem cadastrados (IN 128, art. 117, § 1º), e a autodeclaração ratificada ainda vale; peça a inclusão no cadastro${lido ? "" : " e leia o CNIS"}`;
  const _rmCnisTem = (x, k) => ((x.ct||{}).periodos||[]).some(([a, b])=>a <= k && k <= b);
  // as linhas rurais: o quadro Tempos (ou, sem linha, o início e o fim dos campos) e os períodos de segurado
  // especial do CNIS sem PSE-NEG; a linha aberta vai até rur_fim ou até lim (padrão a DER)
  function _rmLinhas(x, lim){
    lim = lim || x.der; const v = x.v || {}, fimAb = v.rur_fim && v.rur_fim < lim ? v.rur_fim : lim;
    const ls = (x.tempos||[]).filter(r=>r.nat==="rural" && r.de).map(r=>({de:r.de, ate:r.ate || fimAb, reg:r.det || v.rur_regime || "", prova:r.prova || "", fonte:"quadro Tempos"}));
    if(!ls.length && v.rur_inicio) ls.push({de:v.rur_inicio, ate:fimAb, reg:v.rur_regime || "", prova:v.rur_prova || "", fonte:"campos"});
    for(const g of ((x.g||{}).vinculos||[])) if(/Segurado Especial/i.test(g.tipo||"") && !(g.indicadores||[]).includes("PSE-NEG")){
      const de = isoBr(g.inicio); if(de) ls.push({de, ate: g.fim ? isoBr(g.fim) : fimAb, reg:"Segurado especial", prova:"CNIS", fonte:"CNIS", cnis:true}); }
    return ls.filter(l=>l.de <= lim).map(l=>({...l, ate: l.ate > lim ? lim : l.ate}));
  }
  const _rmFonte = ls => [...new Set(ls.map(l=>l.fonte))].join(" e ") || undefined;
  // os meses rurais por regime até a competência ym, cada mês uma vez
  function _rmMesesRurais(ls, ym){
    const m = {se:new Set(), emp:new Set(), ci:new Set()};
    for(const l of ls) for(const k of _rmMeses(l.de, l.ate)){ if(k > ym) break; m[_rmTipo(l.reg)].add(k); }
    return m;
  }
  // a carência da aposentadoria rural até a data (IN 128, arts. 201 a 205): o segurado especial conta o mês de
  // atividade; o empregado rural, no benefício de 1 salário mínimo, ×3 de 2011 a 2015 e ×2 de 2016 a 2020, até 12
  // por ano civil (art. 203, par. único); o CI rural e o boia-fria, desde 01/2011, só com contribuição (art. 204, § 2º)
  function _rmCarRural(x, ate, ls){
    const ym = ymDe(ate), m = _rmMesesRurais(ls || _rmLinhas(x), ym), anos = {};
    const semC = new Set([...m.ci].filter(k=>k >= "2011-01" && !_rmCnisTem(x, k) && !m.se.has(k) && !m.emp.has(k)));
    const simples = new Set([...m.se, ...[...m.ci].filter(k=>!semC.has(k))]);
    const ano = k => anos[k.slice(0,4)] = anos[k.slice(0,4)] || {s:0, e:0};
    for(const k of simples) ano(k).s++;
    let emp = 0; for(const k of m.emp) if(!simples.has(k)){ ano(k).e++; emp++; }
    let total = 0, calend = 0;
    for(const [a, o] of Object.entries(anos)){ const mult = a >= "2011" && a <= "2015" ? 3 : a >= "2016" && a <= "2020" ? 2 : 1;
      total += mult > 1 ? Math.min(12, o.s + o.e*mult) : o.s + o.e; calend += o.s + o.e; }
    return {total, calend, mult: total - calend, emp, semContrib: semC.size};
  }
  // Lei 8.213/91, art. 142 (conferido): carência pelo ano em que completou a idade, para quem já era filiado em 24/07/1991
  const _rmTab142 = a => a >= 2011 ? 180 : a <= 1992 ? 60 : [66,72,78,90,96,102,108,114,120,126,132,138,144,150,156,162,168,174][a - 1993];
  const _rmIdadeRur = x => x.sx==="F" ? 55 : 60;
  // inscrito até 24/07/1991, ou na roça antes de 11/1991 (IN 128, art. 199, I e § 2º)
  const _rmAntes91 = (x, ls) => x.v.rur_pre1991==="Sim" || (x.v.rur_pre1991!=="Não" && ((x.filiacao && x.filiacao <= "1991-07-24") || ls.some(l=>l.de < "1991-11-01")));
  function _rmExigRur(x, ls){
    const d = x.dn ? dataDaIdade(x.dn, _rmIdadeRur(x)) : null;
    return d && _rmAntes91(x, ls) ? {n:_rmTab142(anoDe(d)), tab:true, ano:anoDe(d)} : {n:180, tab:false};
  }
  // na roça, ou em graça (12 meses depois do último mês rural; IN 128, art. 184), na data
  function _rmNaRoca(ls, iso){
    const ym = ymDe(iso), ms = ls.flatMap(l=>_rmMeses(l.de, l.ate)).filter(k=>k <= ym).sort(), ult = ms.pop();
    if(!ult) return {ok:false, ult:null};
    if(ult===ym) return {ok:true, ult, ativo:true};
    const ate = perdaDaQualidade(competenciaMais(_rmYm(ult), 12)).mantidaAte;
    return {ok: iso <= ate, ult, ate};
  }
  // a data em que reuniu idade, carência rural e atividade (ou graça) ao mesmo tempo; até lim, se dado
  function _rmQuandoRural(x, lim){
    if(!x.dn) return null;
    const ls = _rmLinhas(x, lim || "2099-12-31"); if(!ls.length) return null;
    const ex = _rmExigRur(x, ls).n, d0 = dataDaIdade(x.dn, _rmIdadeRur(x));
    if(lim && d0 > lim) return null;
    return quandoCumpre(d0, d => (!lim || d <= lim) && _rmCarRural(x, d, ls).total >= ex && _rmNaRoca(ls, d).ok);
  }
  // junta partes: o pior estado manda; o texto mostra o que não está em ordem (ou tudo, se tudo está)
  function _rmJunta(ps){
    const vs = ps.filter(p=>p && p.est!=="info"); if(!vs.length) return ps.find(Boolean) || {est:"info", txt:""};
    const est = vs.map(p=>p.est).sort((a, b)=>REQ_ORDEM.indexOf(a) - REQ_ORDEM.indexOf(b))[0], ruins = vs.filter(p=>p.est!=="ok");
    return {est, txt:(ruins.length ? ruins : vs).map(p=>p.txt).join("; "), fonte:[...new Set(vs.map(p=>p.fonte).filter(Boolean))].join(", ") || undefined};
  }
  // ── a condição de segurado especial (IN 128, arts. 109 a 113) ─────────────
  const _rmEcon = x => x.v.rur_empregados==="Sim" ? {est:"risco", txt:"empregado permanente, ou mais de 120 pessoas/dia no ano civil, tira a condição de segurado especial (IN 128, art. 109)", fonte:"campo"}
    : x.v.rur_empregados==="Não" ? {est:"ok", txt:"trabalho da família, sem empregado permanente", fonte:"campo"}
    : {est:"informar", txt:"teve empregado permanente, ou mais de 120 pessoas/dia no ano? (ajuda eventual sem paga pode)"};
  function _rmModulos(x, ls){
    if(ls.length && !ls.some(l=>_rmTipo(l.reg)==="se" && l.ate >= "2008-06-23")) return {est:"info", txt:"segurado especial só antes de 23/06/2008: a área não se mede"};
    const m = x.v.rur_modulos, n = String(m||"").replace(".", ",");
    if(m==="" || m==null || isNaN(+String(m).replace(",", "."))) return {est:"informar", txt:`informe a área em módulos fiscais (número), somando todos os imóveis${x.v.rur_imovel ? ` (anotado: ${x.v.rur_imovel})` : ""}`};
    return +String(m).replace(",", ".") <= 4 ? {est:"ok", txt:`${n} ${+m===1?"módulo fiscal":"módulos fiscais"} (até 4)`, fonte:"campo"}
      : {est:"risco", txt:`${n} módulos fiscais: acima de 4 o INSS descaracteriza a atividade desde 23/06/2008 (IN 128, art. 110, § 2º); o Tema 1115/STJ diz que o tamanho, sozinho, não descaracteriza (recurso e ação)`, fonte:"campo"};
  }
  const _rmNorm = s => String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s*[-/(]\s*[a-z]{2}\)?\s*$/, "").trim();
  function _rmResid(x){
    const r = x.v.rur_reside, mun = x.v.rur_municipio, cad = (x.cad||{}).municipio;
    if(r==="Em município não vizinho") return {est:"risco", txt:"mora em município que não é o da roça nem vizinho: a IN exige o mesmo município ou o contíguo (art. 110, § 1º)", fonte:"campo"};
    if(r) return {est:"ok", txt:`mora ${r.toLowerCase()}`, fonte:"campo"};
    if(mun && cad) return _rmNorm(mun)===_rmNorm(cad) ? {est:"ok", txt:`mora em ${cad}, o município da roça`, fonte:"CadÚnico"}
      : {est:"informar", txt:`o CadÚnico diz ${cad} e a roça fica em ${mun}: é o mesmo município ou vizinho?`, fonte:"CadÚnico"};
    return {est:"informar", txt:"onde mora: no imóvel, no mesmo município da roça ou em município vizinho?"};
  }
  // a pessoa no Portal da Transparência: a única consultada, ou o integrante do CadÚnico com o mesmo nascimento
  function _rmPessoa(x){
    const ps = (x.transp||{}).pessoas||[], ms = (x.cad||{}).membros||[], dnM = m => isoBr(m.nascimento) || m.nascimento;
    const igual = (p, m) => (soDig(p.cpf) && soDig(p.cpf)===soDig(m.cpf)) || (p.nis && p.nis===m.nis);
    // a única consultada, salvo se o CadÚnico mostra que é outro integrante (outro nascimento)
    if(ps.length===1) return x.dn && ms.some(m=>igual(ps[0], m) && dnM(m) && dnM(m)!==x.dn) ? null : ps[0];
    const m = ms.find(m=>dnM(m)===x.dn);
    return m ? ps.find(p=>igual(p, m)) || null : null;
  }
  const _rmCompT = c => { const d = soDig(c); return d.length >= 6 ? (/^(19|20)/.test(d) ? `${d.slice(0,4)}-${d.slice(4,6)}` : `${d.slice(2,6)}-${d.slice(0,2)}`) : ""; };
  // o BPC da pessoa pelo Portal da Transparência, se pago entre as competências de e ate
  function _rmBpcTransp(x, de, ate){
    const p = _rmPessoa(x), b = p && (p.programas||[]).find(g=>/bpc/i.test(`${g.programa} ${g.rotulo||""}`));
    if(!b) return null; const u = _rmCompT(b.ultima_competencia), i = _rmCompT(b.primeira_competencia);
    return (!u || u >= de) && (!i || i <= ate) ? {...b, ult:u} : null;
  }
  // o que tira a condição de segurado especial entre as competências de e ate (IN 128, arts. 112 e 113)
  function _rmDescar(x, ls, de, ate){
    const se = new Set(ls.filter(l=>_rmTipo(l.reg)==="se").flatMap(l=>_rmMeses(l.de, l.ate)).filter(k=>k >= de && k <= ate));
    if(ls.length && !se.size) return {est:"info", txt:"só para o segurado especial"};
    // sem linha rural, os anos civis da janela pedida (o fato menos 12 meses, no salário-maternidade)
    const anos = [...new Set((se.size ? [...se] : _rmMeses(de+"-01", ate+"-01")).map(k=>k.slice(0,4)))];
    const ps = [], g = x.g, ini = de+"-01", fim = ate+"-31";
    if(g){
      const dias = {};
      // o facultativo não exerce atividade remunerada: não entra nos 120 dias
      for(const v of g.vinculos||[]){ if(v.tipo==="Benefício" || /Segurado Especial|Facultativo/i.test(v.tipo||"")) continue;
        const a = isoBr(v.inicio), b = v.fim ? isoBr(v.fim) : v.ultRemun ? isoBr("28/" + v.ultRemun) : ""; if(!a || !b) continue;
        for(const y of anos){ const i = a > `${y}-01-01` ? a : `${y}-01-01`, f = b < `${y}-12-31` ? b : `${y}-12-31`; if(f >= i) dias[y] = (dias[y]||0) + _rmDias(i, f); } }
      const altos = Object.entries(dias).filter(([, n])=>n > 120);
      // F235 · o emprego longo tira só o período dele, e não o resto da roça; a volta se prova com papel rural de depois dele
      const ultAlto = Math.max(0, ...altos.map(([y])=>+y)), volta = altos.length && x.c ? papeisRuraisComAno(x.c).filter(p=>p.ativ && p.de > ultAlto).sort((p, q)=>p.de - q.de)[0] : null;
      if(altos.length) ps.push({est:"risco", periodo:!!volta, txt:`vínculo remunerado acima de 120 dias no ano civil (${altos.map(([y, n])=>`${n} dias em ${y}`).join(", ")}): o INSS tira a condição de segurado especial só nesse período, a partir do mês seguinte ao excesso (IN 128, arts. 112, IX, d, e 113, II, b), e não o resto da roça; a volta à roça pede documento rural novo, de depois do emprego (art. 116, § 2º, V)${volta ? `, e o dossiê tem: ${volta.rotLimpo.replace(/\s*\(.*?\)/g, "").toLowerCase()} de ${volta.de}` : x.c ? ", e o dossiê não tem papel rural de depois dele" : ""}`, fonte:"CNIS"});
      const no = b => b.de && b.de <= fim && (!b.ate || b.ate >= ini);
      const bpc = (x.benefCnis||[]).find(b=>/^8[78]$/.test(b.especie) && no(b));
      if(bpc) ps.push({est:"risco", txt:`BPC (B${bpc.especie}) desde ${fmtBarra(bpc.de)}: tira a condição de segurado especial de quem o recebe (IN 128, art. 112, § 3º)`, fonte:"CNIS"});
      const pen = (x.benefCnis||[]).filter(b=>/^(21|25|36|94)$/.test(b.especie) && no(b));
      if(pen.length) ps.push({est:"informar", txt:`${pen.map(b=>`B${b.especie}`).join(", ")} no período: pensão, auxílio-acidente ou auxílio-reclusão acima de 1 salário mínimo (cota individual) descaracteriza pelo período (IN 128, arts. 112, IX, a, e 113, III); confira o valor`, fonte:"CNIS"});
      if(_rmInd(x).has("ISE-CVU")) ps.push({est:"informar", txt:"o CNIS marca segurado especial concomitante com período urbano (ISE-CVU)", fonte:"CNIS"});
    }
    const tp = !ps.some(p=>/BPC/.test(p.txt)) && _rmBpcTransp(x, de, ate);
    if(tp) ps.push({est:"risco", txt:`o Portal da Transparência registra BPC${tp.ult ? ` até ${_rmYm(tp.ult)}` : ""}: tira a condição de segurado especial de quem o recebe (IN 128, art. 112, § 3º)`, fonte:"Portal da Transparência"});
    const cn = x.fd.cnpjs||[];
    if(cn.length) ps.push({est:"informar", txt:`${cn.length} ${cn.length===1?"CNPJ":"CNPJs"} na Redesim (${cn.map(e=>[e.razao, e.situacao].filter(Boolean).join(", ") || e.cnpj).join("; ")}): a simples inscrição não descaracteriza (IN 128, art. 112, § 4º), nem a microempresa agrícola, agroindustrial ou agroturística só de segurados especiais no mesmo município ou vizinho (art. 112, X); confira a atividade e o período`, fonte:"Redesim"});
    if(x.v.rur_renda) ps.push({est:"informar", txt:`outra renda do grupo: ${x.v.rur_renda}; confira os limites do art. 112`, fonte:"campo"});
    if(!g) ps.push({est:"informar", txt:"o CNIS não foi lido: confira vínculos e benefícios no período"});
    // F235 · só o risco de um período, com a volta provada, não barra o pedido (so)
    if(ps.length){ const r = _rmJunta(ps); return ps.every(p=>p.est!=="risco" || p.periodo) && ps.some(p=>p.periodo) ? {...r, so:true} : r; }
    return {est:"ok", txt:`sem vínculo acima de 120 dias no ano civil (${anos.join(", ")}) nem benefício que descaracterize (Bolsa Família não descaracteriza)`, fonte:"CNIS"};
  }
  // aposentadoria: não acumula outra aposentadoria (absoluto); BPC é opção; auxílio por incapacidade cessa
  function _rmAcumApos(x){
    if(x.apos) return {est:"impedido", txt:`já recebe ${x.apos.especie}${x.apos.nb ? ` (NB ${x.apos.nb})` : ""}: não acumula duas aposentadorias (Lei 8.213, art. 124, II)`, fonte:"CNIS"};
    const at = (x.benefCnis||[]).filter(b=>b.ativo), bpc = at.find(b=>/^8[78]$/.test(b.especie)), ym = ymDe(x.der), tp = !bpc && _rmBpcTransp(x, ymDe(somarMeses(x.der, -3)), ym);
    if(bpc || tp) return {est:"opcao", txt:`recebe BPC${bpc ? ` (B${bpc.especie}${bpc.nb ? `, NB ${bpc.nb}` : ""})` : tp.ult ? ` (Portal da Transparência, até ${_rmYm(tp.ult)})` : ""}: não acumula com a aposentadoria (IN 128, art. 639, XVIII); compare os valores e escolha`, fonte: bpc ? "CNIS" : "Portal da Transparência"};
    const inc = at.find(b=>/^(31|91)$/.test(b.especie));
    if(inc) return {est:"info", txt:`B${inc.especie} ativo: cessa com a aposentadoria (Lei 8.213, art. 124, I)`, fonte:"CNIS"};
    if(!x.g) return {est:"informar", txt:"o CNIS não foi lido: confira os benefícios ativos"};
    return {est:"ok", txt:"sem aposentadoria nem BPC ativos", fonte:"CNIS"};
  }
  // ── híbrida ────────────────────────────────────────────────────────────
  // a filiação: a do CNIS (ou do campo) ou o primeiro período rural, o que vier antes
  const _hibFil = (x, ls) => [x.filiacao, ...ls.map(l=>l.de), x.v.rur_pre1991==="Sim" ? "1991-07-24" : ""].filter(Boolean).sort()[0] || null;
  // a idade exigida numa data: filiado até 13/11/2019 segue a escada da mulher (EC 103, art. 18, § 1º); depois, 62/65 (art. 19)
  const _hibIdadeExig = (x, iso, fil) => fil && fil > EC103 ? (x.sx==="F" ? 62 : 65) : idadeArt18(anoDe(iso), x.sx);
  const _hibDataIdade = (x, fil) => x.dn ? quandoCumpre(dataDaIdade(x.dn, x.sx==="F" ? 60 : 65), d => d >= dataDaIdade(x.dn, _hibIdadeExig(x, d, fil))) : null;
  const _hibExig = (x, ls, di) => di && _rmAntes91(x, ls) ? _rmTab142(anoDe(di)) : 180;
  const _hibTempoExig = (x, fil) => fil && fil > EC103 && x.sx!=="F" ? 20 : 15;
  // a carência somada até a data: contribuições do CNIS (ou as informadas), meses rurais fora delas, sem o
  // multiplicador do art. 203 (só do benefício de 1 salário mínimo), e o benefício por incapacidade intercalado;
  // o CI rural depois de 11/1991 sem contribuição fica fora (a ACP só cobre o segurado especial)
  // apo_ci_atraso (a mesma chave e o mesmo formato da família das aposentadorias): competências "01/2010 a 06/2010",
  // um número ou "nenhuma"; devolve quantas, até a data, ou null se em branco
  function _hibAtraso(x, iso){
    const s = String(x.v.apo_ci_atraso||"").trim(); if(!s) return null;
    if(/^(n[ãa]o|nenhum|nenhuma|0+)\b/i.test(s)) return 0;
    if(/^\d+$/.test(s)) return +s;
    let n = 0;
    for(const m of s.matchAll(/(\d{2})\/(\d{4})(?:\s*(?:a|até|-)\s*(\d{2})\/(\d{4}))?/g)){
      const a = `${m[2]}-${m[1]}`, b = m[3] ? `${m[4]}-${m[3]}` : a, z = b < ymDe(iso) ? b : ymDe(iso);
      if(a <= z) n += mesesEntreYm(a, z); }
    return n;
  }
  // depois de hoje só cresce o que continua sendo pago (apo_segue), como na família das aposentadorias
  const _hibProj = (x, iso) => { if(!(iso > x.hoje && x.v.apo_segue==="Sim")) return 0;
    const ult = ((x.ct||{}).periodos||[]).map(p=>p[1]).sort().pop(), ini = ult && ult < ymDe(x.hoje) ? ymDe(x.hoje) : ymDe(somarMeses(x.hoje, 1));
    return Math.max(0, mesesEntreYm(ini, ymDe(iso))); };
  function _hibCar(x, ate, ls){
    const ym = ymDe(ate), m = _rmMesesRurais(ls || _rmLinhas(x), ym), man = ate >= x.der && +x.v.car_cumprida;
    const atr = man ? 0 : _hibAtraso(x, ate) || 0, proj = man ? 0 : _hibProj(x, ate);
    const urb = man || Math.max(0, carenciaAte(x, ate > x.hoje ? x.hoje : ate) + proj - atr);
    const ciSem = new Set([...m.ci].filter(k=>k >= "1991-11" && !_rmCnisTem(x, k) && !m.se.has(k) && !m.emp.has(k)));
    const rur = new Set([...m.se, ...m.emp, ...m.ci].filter(k=>!ciSem.has(k) && !_rmCnisTem(x, k)));
    const inter = intercaladoAte(x, ate);
    return {total: urb + rur.size + inter, urb, rur: rur.size, inter, ciSem: ciSem.size, atr, proj};
  }
  // o tempo, em dias: o quadro Tempos ou, se maior, a carência somada (cada mês de contribuição é tempo)
  const _hibTempo = (x, iso, ls) => Math.max((x.totEm(iso)||{}).comum || 0, _hibCar(x, iso, ls).total * 365 / 12);
  function _hibQuando(x){
    if(!x.dn) return null;
    const ls = _rmLinhas(x, "2099-12-31"), fil = _hibFil(x, ls), di = _hibDataIdade(x, fil); if(!di) return null;
    const ex = _hibExig(x, ls, di), tm = _hibTempoExig(x, fil) * 365;
    return quandoCumpre(di, d => d >= dataDaIdade(x.dn, _hibIdadeExig(x, d, fil)) && _hibCar(x, d, ls).total >= ex && _hibTempo(x, d, ls) >= tm);
  }
  // ── salário-maternidade ────────────────────────────────────────────────
  // a categoria: o campo (ou o antigo mat_situacao), ou o vínculo do CNIS no dia do fato
  function _matCat(x){
    const v = x.v; if(v.mat_categoria) return {cat:v.mat_categoria, fonte:"campo"};
    const velho = {"Empregada":"Empregada com vínculo ativo", "CI ou facultativa":"CI", "Desempregada em graça":"Desempregada em graça", "Segurada especial":"Segurada especial"}[v.mat_situacao];
    if(velho) return {cat:velho, fonte:"campo"};
    const d = v.mat_data; if(!d || !x.g) return {cat:"", fonte:""};
    const cobre = ((x.g||{}).vinculos||[]).filter(g=>g.tipo!=="Benefício" && !/Segurado Especial/i.test(g.tipo||"") && isoBr(g.inicio) && isoBr(g.inicio) <= d
      && (g.fim ? isoBr(g.fim) >= d : !g.ultRemun || isoBr("28/" + g.ultRemun) >= somarMeses(d, /Individual|Facultativ/i.test(g.tipo||"") ? -3 : -1)));
    const g = cobre.find(g=>/Empregado|Avulso/.test(g.tipo)) || cobre[0], t = (g||{}).tipo || "", ind = (g||{}).indicadores || [];
    if(!g && (x.fd.cnpjs||[]).some(e=>/^ATIVA$/i.test(e.situacao||"") && /empres[áa]rio|titular|mei/i.test(`${e.qualificacao||""} ${e.vinculo||""}`))
      && ((x.g||{}).vinculos||[]).some(v=>/Individual/i.test(v.tipo||""))) return {cat:"MEI", fonte:"CNPJ ativo na Redesim e carnê no CNIS"};
    const cat = /Dom[ée]stic/.test(t) ? "Doméstica" : /Avulso/.test(t) ? "Avulsa" : /Empregado/.test(t) ? "Empregada com vínculo ativo"
      : /Facultativo/.test(t) ? (ind.some(i=>/FBR/.test(i)) ? "Facultativa baixa renda" : "Facultativa")
      : /Individual/.test(t) ? (ind.some(i=>/IREC-(MEI|LC123)/.test(i)) ? "MEI" : "CI") : "";
    if(cat) return {cat, fonte:"CNIS"};
    const q = qualidadeEm(x, d); return q.est==="ok" && /graça/.test(q.txt) ? {cat:"Desempregada em graça", fonte:"CNIS"} : {cat:"", fonte:""};
  }
  // o fato gerador: o afastamento até 28 dias antes do parto (a desempregada em graça recebe do parto) ou o próprio fato
  function _matFato(x){
    const v = x.v, p = v.mat_data; if(!p) return null;
    if(!v.mat_dat || v.mat_dat >= p || !/Parto|Natimorto/.test(v.mat_fato||"Parto") || _matCat(x).cat==="Desempregada em graça") return p;
    const lim = somaDias(p, -28); return v.mat_dat < lim ? lim : v.mat_dat;
  }
  function _matDuracao(x){
    const v = x.v, p = v.mat_data, f = v.mat_fato || "";
    if(!p || !f) return {est:"informar", txt:"informe o fato gerador e a data"};
    if(/Aborto/.test(f)) return {est:"ok", txt:`aborto não criminoso: 2 semanas, de ${fmtBarra(p)} a ${fmtBarra(somaDias(p, 13))} (IN 128, art. 358)`, fonte:"campo"};
    const des = _matCat(x).cat==="Desempregada em graça", ini = _matFato(x), notas = [];
    let est = "ok", fim = somaDias(ini, 119);
    if(v.mat_dat && v.mat_dat < p && !des && v.mat_dat < somaDias(p, -28)){ est = "risco"; notas.push("o afastamento só começa até 28 dias antes do parto (IN 128, art. 358, I)"); }
    if(des && v.mat_dat) notas.push("em graça, recebe a partir do parto, e não do afastamento");
    if(/Adoção/.test(f)) notas.push("adoção ou guarda: 120 dias qualquer que seja a idade da criança (ACP 5019632-23.2011.4.04.7200, nacional; a IN 128, art. 358, II, ainda diz até 12 anos)");
    if(v.mat_internacao==="Sim"){
      if(!v.mat_alta) return {est:"informar", txt:"internação de mais de 2 semanas: informe a data da alta"};
      fim = somaDias(v.mat_alta, 120 - (_rmDias(ini, p) - 1)); notas.push("internação: o período internado e mais 120 dias depois da alta, descontado o que recebeu antes do parto (Lei 8.213, art. 71, § 3º; ADI 6.327)"); }
    if(v.mat_zika==="Sim"){ fim = somaDias(fim, 60); notas.push("mais 60 dias pela síndrome congênita do Zika (Lei 8.213, art. 71, § 2º)"); }
    notas.push(des ? "mais 2 semanas depois do parto com atestado submetido à perícia (em graça, só as de depois; art. 358, § 2º)" : "mais 2 semanas antes e depois com atestado submetido à perícia (art. 358, § 2º)");
    return {est, txt:`${_rmDias(ini, fim)} dias, de ${fmtBarra(ini)} a ${fmtBarra(fim)}; ${notas.join("; ")}`, fonte:"campo"};
  }
  function _matPrazo(x){
    // os 5 anos contam do fato gerador, que pode ser o afastamento antes do parto (IN 128, art. 357, §§ 5º e 6º)
    const p = _matFato(x); if(!p) return {est:"informar", txt:"informe a data do fato"};
    const lim = somarAnos(p, 5);
    return x.der <= lim ? {est:"ok", txt:`pedido em ${fmtBarra(x.der)}, dentro dos 5 anos do fato (até ${fmtBarra(lim)})`, quando:lim, fonte:"campo"}
      : {est:"risco", txt:`os 5 anos do fato venceram em ${fmtBarra(lim)} (IN 128, art. 357, § 5º); só o cônjuge sobrevivente pede até o fim do benefício original`, quando:lim, fonte:"campo"};
  }
  function _matUm(x){
    const p = x.v.mat_data, b80 = p && (x.benefCnis||[]).find(b=>b.especie==="80" && b.de && Math.abs(Date.parse(b.de) - Date.parse(p)) <= 150*864e5);
    if(b80) return {est:"risco", txt:`o CNIS já tem salário-maternidade${b80.nb ? ` (NB ${b80.nb})` : ""} desde ${fmtBarra(b80.de)}: um só benefício por fato (IN 128, art. 357, §§ 3º e 4º)`, fonte:"CNIS"};
    const o = x.v.mat_outro_genitor;
    if(o==="Sim") return {est:"risco", txt:"o outro genitor ou adotante já pediu: o mesmo fato não gera dois benefícios (só a mãe biológica e o adotante recebem pela mesma criança, art. 71-A, § 2º)", fonte:"campo"};
    return o==="Não" ? {est:"ok", txt:"ninguém mais pediu pelo mesmo fato; gravidez múltipla dá um só benefício", fonte:"campo"} : {est:"informar", txt:"o outro genitor ou adotante já pediu pelo mesmo fato?"};
  }
  function _matAcum(x){
    const p = x.v.mat_data; if(!p) return {est:"informar", txt:"informe a data do fato"};
    const ini = _matFato(x), fim = somaDias(ini, 119);
    const sd = (x.fd.seguros||[]).flatMap(s=>s.parcelas||[]).filter(pc=>parcelaRecebida(pc) && isoBr(pc.pagamento) >= ini && isoBr(pc.pagamento) <= fim);
    if(sd.length) return {est:"risco", txt:`${sd.length} ${sd.length===1?"parcela":"parcelas"} do seguro-desemprego ${sd.length===1?"paga":"pagas"} dentro dos 120 dias: não acumula (Lei 8.213, art. 124, par. único; IN 128, art. 639, § 3º)`, fonte:"dossiê (seguro-desemprego)"};
    const inc = (x.benefCnis||[]).find(b=>/^(31|32|91|92)$/.test(b.especie) && b.de && b.de <= fim && (!b.ate || b.ate >= ini));
    if(inc) return {est:"info", txt:`B${inc.especie} no período: não acumula; o benefício por incapacidade fica suspenso enquanto durar o salário-maternidade (Lei 8.213, art. 124, IV; Decreto 3.048, art. 102, par. único)`, fonte:"CNIS"};
    if(x.apos) return {est:"info", txt:`aposentada (${x.apos.especie}): tem direito se continua ou voltou a trabalhar como segurada obrigatória (IN 128, art. 357, § 8º)`, fonte:"CNIS"};
    if(!x.g) return {est:"informar", txt:"o CNIS não foi lido: confira auxílio por incapacidade e seguro-desemprego no período"};
    return {est:"ok", txt:"sem auxílio por incapacidade nem seguro-desemprego no período", fonte:"CNIS"};
  }
  const _matCatTxt = c => /^(CI|MEI)$/.test(c) ? c : c.toLowerCase();
  // F235 · o salário-maternidade pago pelo INSS sai em 30 dias, ou é concedido de forma provisória (Lei 8.213/91, art. 73-A, Lei 15.415/2026)
  const _MAT_73A = "feito o pedido, o INSS tem 30 dias para conceder, e passado o prazo a concessão é provisória e automática, sem devolver o que receber, salvo má-fé (Lei 8.213, art. 73-A)";
  // F235 · no Desfecho: até quando pedir, os 30 dias do INSS e, passados os 120 dias, o pagamento de uma vez
  function _matDesf(x){
    const p = _matFato(x); if(!p) return "";
    const fim = somaDias(p, 119);
    return `; peça até ${fmtBarra(somarAnos(p, 5))} (5 anos do ${String(x.v.mat_fato||"parto").toLowerCase()}); feito o pedido, o INSS tem 30 dias para conceder (Lei 8.213, art. 73-A)${fim < x.hoje ? `; os 120 dias (${fmtBarra(p)} a ${fmtBarra(fim)}) já passaram: o INSS paga tudo de uma vez` : ""}`;
  }
  function _matAgora(x, rural){
    const p = _matFato(x); if(!p) return ["Pegue a certidão de nascimento (ou o termo de guarda): a data do parto decide o prazo e os dias."];
    const cat = _matCat(x).cat, cnisSE = ((x.g||{}).vinculos||[]).some(v=>/Segurado Especial/i.test(v.tipo||""));
    return [`Pedir já pelo Meu INSS, com a certidão de nascimento: o prazo vai até ${fmtBarra(somarAnos(p, 5))}.`,
      "Feito o pedido, o INSS tem 30 dias para conceder; passado o prazo, a concessão é provisória e automática, e o que ela receber não se devolve, salvo má-fé (Lei 8.213, art. 73-A).",
      ...(rural ? [cnisSE ? "O CNIS já tem o período de segurada especial: ele basta como prova da roça."
        : "Preencher com ela a autodeclaração do segurado especial e juntar ao menos um papel da roça com data anterior ao parto, no nome dela ou do marido; o do sogro não serve."] : []),
      ...(!rural && cat==="MEI" ? ["MEI: confira no Portal do Empreendedor se os DAS até o parto foram pagos até o vencimento, e oriente a não trabalhar no MEI durante os 120 dias (Lei 8.213, art. 71-C)."] : []),
      ...(!rural && cat==="Desempregada em graça" && (x.fd.seguros||[]).length ? ["Anexe ao pedido o extrato do seguro-desemprego: é a prova de que a cobertura do INSS alcança o parto."] : [])];
  }
  // F235 · as listas de documentos: na urbana, sem a prova rural e, fora do emprego, sem o que é da empresa; na rural, sem o que é
  // da empregada, com o cartão da gestante e a certidão de casamento que vale pelo marido lavrador
  function _urbDocs(x){
    const cat = _matCat(x).cat, emp = cat==="Empregada com vínculo ativo", nasceu = !!(x.v.mat_data || (x.cert||[]).some(c=>c.nascimento));
    const tira = new RegExp(["\\bdap\\b|\\bcaf\\b|lavrador|produtor rural|\\bccir\\b|incra|sindicato de trabalhadoras rurais|qualificacao rural|segurada especial",
      emp ? "" : "a empresa paga|declaracao da empresa", nasceu ? "se ainda gestante" : ""].filter(Boolean).join("|"));
    const topo = [...(cat==="MEI" ? ["Extrato dos DAS com a data de pagamento — Portal do Empreendedor: o DAS pago depois do parto não vale para este parto"] : []),
      ...(cat==="Desempregada em graça" ? ["Extrato do seguro-desemprego — prova que a cobertura do INSS alcança o parto", "Termo de rescisão (TRCT) — se tiver"] : [])];
    return {tira, topo, mais:[]};
  }
  function _rurDocs(x){
    const nasceu = !!(x.v.mat_data || (x.cert||[]).some(c=>c.nascimento)), cnisSE = ((x.g||{}).vinculos||[]).some(v=>/Segurado Especial/i.test(v.tipo||""));
    // sem o período de segurada especial no CNIS, a autodeclaração é o centro da prova: vai marcada, no alto
    return {tira: new RegExp(`a empresa paga|declaracao da empresa|inscricao como autonoma|orgao de fiscalizacao profissional|ultimas contribuicoes|qualificacao de lavradora${nasceu ? "|se ainda gestante" : ""}${cnisSE ? "" : "|autodeclaracao"}`),
      topo: [...(cnisSE ? [] : ["Autodeclaração do segurado especial (Anexo VIII) — preenchida com a equipe, dos 12 meses antes do parto"]),
        "Papéis da roça no nome dela ou do marido, com data anterior ao parto — notas, CCIR, ITR, sindicato; o do sogro só mostra que o sítio existe",
        "Cartão da gestante, ficha do posto de saúde ou do agente comunitário, carteira de vacinação — com a profissão ou o endereço na roça (IN 128, art. 116, XXIV e XXV)",
        "Certidão de casamento — vale a profissão do marido lavrador; o \"do lar\" dela não tira o direito"], mais:[]};
  }
  const _matSemData = {est:"informar", txt:"informe a data do parto, da adoção ou do afastamento"};
  // F235 · os meses rurais que contam, para trás do pedido, em trechos: o intervalo do emprego aparece
  function _rmJanela(ls, ate, n){
    const m = _rmMesesRurais(ls, ymDe(ate)), ms = [...new Set([...m.se, ...m.emp, ...m.ci])].sort().slice(-n); if(!ms.length) return "";
    const seg = []; for(const k of ms){ const u = seg[seg.length-1]; if(u && ymDe(somarMeses(u[1]+"-01", 1))===k) u[1] = k; else seg.push([k, k]); }
    return seg.map(([a, b])=>a===b ? _rmYm(a) : `${_rmYm(a)} a ${_rmYm(b)}`).join(" e ");
  }
  // F235 · a resposta da aposentadoria rural e da híbrida: com a data do direito já passada, e só o risco de um período (o emprego
  // de que se voltou com papel novo) ou a divergência do valor, é sim; o pagamento começa no pedido (Lei 8.213/91, art. 49, II)
  function _rmVeredito(x, a){
    if(!a || !a.quando || a.quando > x.hoje || a.rs.some(r=>["impedido","falta","provar"].includes(r.est))) return null;
    const riscos = a.rs.filter(r=>r.est==="risco"), div = a.rs.filter(r=>r.est==="divergente");
    if(riscos.some(r=>!r.so) || div.some(r=>r.id!=="valor_rmi")) return null;
    const inf = a.rs.filter(r=>r.est==="informar").map(r=>r.rot.replace(/\s*\?$/, "").replace(/^./, s=>s.toLowerCase()));
    return {tom:"sim", txt:`Sim: cumpre os requisitos desde ${fmtBarra(a.quando)}. O pagamento começa no dia do pedido, e os meses sem pedir não voltam: peça logo.`
      + (riscos.length ? " O emprego que passou de 120 dias tira só aquele período da roça, e a volta tem papel novo." : "")
      + (div.length ? " Como a roça entra no valor é decisão do advogado; não fica abaixo de 1 salário mínimo." : "")
      + (inf.length ? ` Antes de pedir, responda: ${inf.slice(0, 3).join("; ")}.` : "")};
  }
  function _rmAgora(x, a){
    if(!a || !a.quando || a.quando > x.hoje) return [];
    return ["Pedir já pelo Meu INSS, respondendo SIM à pergunta do tempo rural (com não, o INSS nem olha a roça): o pagamento começa no dia do pedido (Lei 8.213/91, art. 49, II).",
      "Preencher com a pessoa a autodeclaração do segurado especial (Anexo VIII) de cada período de roça e juntar os papéis dela."];
  }
  // F235 · a lista de documentos da roça pelo caso: tira o que não cabe ao sexo e à atividade, corrige o item do cônjuge (o papel dele
  // vale se ele era segurado especial no período) e pede o CNIS do cônjuge quando a prova está no nome dele
  function _rmDocs(x, hib){
    const F = x.sx==="F", pesca = !!(x.c && pescaDoDossie(x.c).rgp), conj = x.c ? papeisDaRoca(x.c).filter(p=>p.titular==="conjuge") : [];
    const ele = F ? "ele" : "ela", cj = F ? "do marido" : "da esposa";
    const tira = new RegExp(["documentos rurais no nome do conjuge", "processo administrativo de familiar", F ? "" : "cartao da gestante|salario-maternidade rural",
      pesca ? "" : "entreposto de pescado|comprovantes de defeso", hib ? "inscricao em conselho profissional|autodeclaracao" : ""].filter(Boolean).join("|"));
    const topo = [...(hib ? ["Autodeclaração do segurado especial (Anexo VIII) — de cada período de roça, preenchida com a equipe"] : []),
      ...(conj.length ? [`O CNIS ${cj} — tirado no Meu INSS ${F ? "dele" : "dela"}: mostra que ${ele} seguiu na roça, sem emprego, nos anos dos papéis no nome ${F ? "dele" : "dela"} (IN 128, art. 116, § 3º, I)`] : [])];
    const mais = [`Documentos rurais no nome ${cj} — valem se ${ele} era segurado especial no período, sem emprego (IN 128, art. 116, § 3º, I); traga a certidão de casamento`,
      "Processo administrativo de familiar já aposentado como segurado especial — mostra o trabalho rural da família",
      ...(hib ? [`Documentos rurais no nome dos pais, do tempo de ${F ? "solteira" : "solteiro"} — escritura, ITR, notas, ficha do sindicato (IN 128, arts. 109, § 1º, V, e 116, § 3º, I)`,
        "Histórico ou ficha da escola rural — com o endereço na roça", "Certificado de reservista ou de dispensa — com a profissão de lavrador"] : [])];
    return {tira, topo, mais};
  }

  // ══ idade_rural ══════════════════════════════════════════════════════════
  registrarReq("idade_rural", [
    {id:"idade_rural", rot:"Já tem 55 anos (mulher) ou 60 (homem)?", base:"Lei 8.213/91, art. 48, § 1º; IN 128, arts. 247, par. único, e 256, caput", conf:"conferido", campos:[],
     mede:x=>{ if(!x.dn) return {est:"informar", txt:"sem a data de nascimento na Identificação"};
       const ex = _rmIdadeRur(x), d = dataDaIdade(x.dn, ex), nota = "; doméstico, produtor empresário, pescador profissional e garimpeiro fora da economia familiar vão para a idade urbana (art. 247, par. único)";
       return d <= x.der ? {est:"ok", txt:`${x.idade} anos na DER; exige ${ex} (completou em ${fmtBarra(d)})${nota}`, fonte:"ficha", quando:d}
         : {est:"falta", txt:`${x.idade} anos na DER; completa ${ex} em ${fmtBarra(d)}`, fonte:"ficha", quando:d}; }},
    {id:"categoria_rural", rot:"Trabalha na roça como segurado especial, empregado rural, boia-fria ou CI rural?", base:"IN 128, art. 247, I a V", conf:"conferido", campos:["rur_regime"],
     mede:x=>{ const ls = _rmLinhas(x), ind = _rmInd(x);
       if(ind.has("PSE-NEG")) return {est:"risco", txt:"o CNIS marca período de segurado especial negativo (PSE-NEG): o INSS não reconheceu; prova nova ou recurso", fonte:"CNIS"};
       if(!ls.length) return {est:"informar", txt:"informe o regime (segurado especial, empregado rural, boia-fria ou CI rural) e lance a linha rural no quadro Tempos"};
       const sem = ls.filter(l=>!l.reg).length, regs = [...new Set(ls.map(l=>l.reg).filter(Boolean))].join(", ").toLowerCase();
       if(sem) return {est:"informar", txt:`${sem} ${sem===1?"linha rural sem o regime":"linhas rurais sem o regime"}${regs ? ` (as outras: ${regs})` : ""}; contei como segurado especial`, fonte:_rmFonte(ls)};
       const pen = ind.has("PSE-PEN") ? "; o CNIS tem período de segurado especial pendente (PSE-PEN), a ratificar" : "";
       return {est: pen ? "informar" : "ok", txt:`${regs}${pen}`, fonte:_rmFonte(ls)}; }},
    {id:"carencia_rural_180", rot:"Tem 180 meses de trabalho rural, mesmo com intervalos?", base:"Lei 8.213/91, arts. 25, II, 26, III, 39, I, 48, § 2º, e 142; IN 128, arts. 199, I, §§ 1º e 2º, 201 e 256, § 1º", conf:"conferido",
     campos:["rur_inicio","rur_fim","rur_pre1991","rur_contrib_facult"],
     mede:x=>{ const ls = _rmLinhas(x); if(!ls.length) return {est:"informar", txt:"lance as linhas rurais no quadro Tempos (ou o início da atividade rural)"};
       const ex = _rmExigRur(x, ls), c = _rmCarRural(x, x.der, ls), fonte = _rmFonte(ls);
       const base = `${c.total} meses rurais até ${_rmMes(x.der)}; exige ${ex.n}${ex.tab ? ` (tabela do art. 142, ano ${ex.ano})` : ""}`;
       const nota = (c.mult ? `; o multiplicador do empregado rural somou ${c.mult}` : "") + (x.v.rur_contrib_facult==="Sim" ? "; para receber acima do mínimo, o tempo rural sem contribuição não conta (IN 128, art. 256, § 3º)" : "");
       // F235 · os meses que contam, para trás do pedido: o intervalo do emprego fica à vista
       if(c.total >= ex.n){ const jan = _rmJanela(ls, x.der, ex.n); return {est:"ok", txt: base + nota + (jan ? `; os ${ex.n} meses, para trás do pedido: ${jan}` : ""), fonte}; }
       // sem o nascimento não se sabe o ano da tabela do art. 142, que pode exigir menos que 180
       if(!x.dn && _rmAntes91(x, ls)) return {est:"informar", txt:`${base}; informe o nascimento: quem estava na roça antes de 11/1991 (ou inscrito até 24/07/1991) usa a tabela do art. 142 pelo ano em que completou a idade${nota}`, fonte};
       if(c.total + c.semContrib >= ex.n) return {est:"risco", txt:`${base}; com os ${c.semContrib} meses de CI rural ou boia-fria sem contribuição desde 2011 chegaria lá, mas o INSS não os conta (IN 128, art. 204, § 2º; boia-fria: Tema 554/STJ na via judicial)`, fonte};
       return {est:"falta", txt:`${base}; faltam ${ex.n - c.total}${nota}`, fonte}; }},
    {id:"empregado_ci_rural_meses", rot:"Como contam os meses de empregado rural, boia-fria e CI rural?", base:"IN 128, arts. 203, par. único, 204, §§ 1º e 2º, e 258, § 1º (Lei 11.718/2008, art. 3º)", conf:"conferido", campos:["rur_regime"],
     mede:x=>{ const ls = _rmLinhas(x); if(!ls.length) return {est:"informar", txt:"sem linha rural"};
       const c = _rmCarRural(x, x.der, ls), tem = t => ls.some(l=>_rmTipo(l.reg)===t);
       if(!tem("emp") && !tem("ci")) return {est:"info", txt:"segurado especial: conta cada mês de atividade, sem contribuição"};
       if(c.semContrib) return {est:"risco", txt:`${c.semContrib} meses de CI rural ou boia-fria desde 01/2011 sem contribuição no CNIS: só contam com contribuição, presumida só para quem presta serviço a pessoa jurídica (art. 204, § 2º); boia-fria: na via judicial, Tema 554/STJ`, fonte:"quadro Tempos e CNIS"};
       return {est:"ok", txt: c.emp ? `${c.emp} meses de emprego rural viram ${c.emp + c.mult} na carência (×3 de 2011 a 2015 e ×2 de 2016 a 2020, até 12 por ano civil, no benefício de 1 salário mínimo)`
         : "CI rural: até 2010 conta o período comprovado; desde 2011, só com contribuição", fonte:_rmFonte(ls)}; }},
    {id:"periodo_imediatamente_anterior", rot:"Estava na roça (ou no período de graça) ao completar a idade ou no pedido?", base:"Lei 8.213/91, arts. 39, I, e 48, § 2º; IN 128, arts. 245, § 1º, 258 e 259; Tema 642/STJ", conf:"conferido", campos:["rur_fim"],
     mede:x=>{ const ls = _rmLinhas(x); if(!ls.length) return {est:"informar", txt:"lance as linhas rurais e o último mês na roça"};
       if(!x.dn) return {est:"informar", txt:"sem a data de nascimento"};
       const na = _rmNaRoca(ls, x.der), fonte = _rmFonte(ls);
       if(na.ok) return {est:"ok", txt: na.ativo ? `na roça na DER (${fmtBarra(x.der)})` : `em graça na DER: último mês na roça ${_rmYm(na.ult)}, mantida até ${fmtBarra(na.ate)}`, fonte};
       const q = _rmQuandoRural(x, x.der);
       if(q) return {est:"ok", txt:`reuniu idade, carência e atividade rural em ${fmtBarra(q)}: direito adquirido, mesmo fora da roça na DER (IN 128, art. 258, § 2º; Tema 642/STJ)`, quando:q, fonte};
       return {est:"risco", txt:`último mês na roça ${na.ult ? _rmYm(na.ult) : "sem data"}${na.ate ? `, graça até ${fmtBarra(na.ate)}` : ""}: fora da roça e da graça na DER e quando completou a idade (${fmtBarra(dataDaIdade(x.dn, _rmIdadeRur(x)))})`, fonte}; }},
    {id:"economia_familiar", rot:"O trabalho é da família, sem empregado permanente?", base:"IN 128, arts. 109, §§ 1º e 2º, e 112, VIII", conf:"conferido", campos:["rur_empregados"],
     mede:x=>{ const ls = _rmLinhas(x); return ls.length && !ls.some(l=>_rmTipo(l.reg)==="se") ? {est:"info", txt:"só para o segurado especial"} : _rmEcon(x); }},
    {id:"area_quatro_modulos", rot:"A terra tem até 4 módulos fiscais (desde 23/06/2008)?", base:"IN 128, art. 110, §§ 2º, 3º e 8º; Tema 1115/STJ", conf:"conferido", campos:["rur_modulos","rur_imovel"],
     mede:x=>{ const ls = _rmLinhas(x); return ls.length && !ls.some(l=>_rmTipo(l.reg)==="se") ? {est:"info", txt:"só para o segurado especial"} : _rmModulos(x, ls); }},
    {id:"residencia", rot:"Mora no sítio, na mesma cidade da roça ou em cidade vizinha?", base:"IN 128, art. 110, caput e § 1º", conf:"conferido", campos:["rur_municipio","rur_reside"],
     mede:x=>{ const ls = _rmLinhas(x); return ls.length && !ls.some(l=>_rmTipo(l.reg)==="se") ? {est:"info", txt:"só para o segurado especial"} : _rmResid(x); }},
    {id:"sem_descaracterizacao", rot:"Tem outra renda ou vínculo que tire a condição de segurado especial?", base:"IN 128, arts. 112 (IV, IX, X, §§ 3º e 4º), 113 e 116, § 2º, V; Portaria DIRBEN 990/2022, art. 94, § 4º", conf:"conferido", campos:["rur_renda"],
     mede:x=>{ const ls = _rmLinhas(x), ex = _rmExigRur(x, ls).n;
       if(!ls.length) return {est:"informar", txt:"lance as linhas rurais: é nos anos de roça que se procuram vínculo e benefício que descaracterizem"};
       const ms = [...new Set(ls.filter(l=>_rmTipo(l.reg)==="se").flatMap(l=>_rmMeses(l.de, l.ate)))].sort().slice(-ex);
       return _rmDescar(x, ls, ms[0] || ymDe(x.der), ymDe(x.der)); }},
    {id:"prova_autodeclaracao_ratificada", rot:"Tem a autodeclaração e um documento rural em cada metade dos 15 anos?", base:"Lei 8.213/91, art. 38-B, §§ 1º e 2º; IN 128, arts. 115, 116, §§ 1º a 3º, e 117, § 1º; Portaria DIRBEN 990/2022, art. 94, I e § 5º; Tema 554/STJ", conf:"conferido",
     campos:["rur_auto","rur_ratif_1a","rur_ratif_2a"],
     mede:x=>{ const ls = _rmLinhas(x), se = ls.filter(l=>_rmTipo(l.reg)==="se");
       if(!ls.length) return {est:"informar", txt:"lance as linhas rurais"};
       if(!se.length) return {est:"info", txt:"empregado e CI rural provam pela CTPS, pelo CNIS e pelas declarações (até 2010, com as regras do segurado especial, art. 258, § 1º)"};
       const ex = _rmExigRur(x, ls).n, ms = [...new Set(se.flatMap(l=>_rmMeses(l.de, l.ate)))].filter(k=>k <= ymDe(x.der)).sort().slice(-ex);
       const h = Math.ceil(ms.length/2), m1 = ms.slice(0, h), m2 = ms.slice(h), cn = se.filter(l=>l.cnis);
       const naCnis = k => cn.some(l=>ymDe(l.de) <= k && k <= ymDe(l.ate));
       const metade = (meses, doc, n) => { if(!meses.length) return null;
         if(meses.some(naCnis)) return {est:"ok", txt:`${n}ª metade: o CNIS (base governamental)`, fonte:"CNIS"};
         const a = meses[0].slice(0,4), b = meses[meses.length-1].slice(0,4), faixa = `${_rmYm(meses[0])} a ${_rmYm(meses[meses.length-1])}`, y = _rmAno(doc);
         if(!doc) return {est:"falta", txt:`falta documento rural na ${n}ª metade (${faixa})`};
         if(!y) return {est:"informar", txt:`${n}ª metade: informe o ano do documento (${doc})`};
         return (y >= a || _rmLonga.test(doc)) && y <= b ? {est:"ok", txt:`${n}ª metade: ${doc}`, fonte:"campo"} : {est:"risco", txt:`${n}ª metade (${faixa}): o documento de ${y} não é dessa época`, fonte:"campo"}; };
       const d1 = x.v.rur_ratif_1a, p1 = metade(m1, d1, 1);
       const p2 = !x.v.rur_ratif_2a && d1 && _rmLonga.test(d1) && p1 && p1.est==="ok" && m2.length && !m2.some(naCnis)
         ? {est:"ok", txt:"2ª metade: o mesmo documento, de validade longa, alcança as duas (Portaria 990, art. 94, § 5º)", fonte:"campo"} : metade(m2, x.v.rur_ratif_2a, 2);
       const ps = [p1, p2], todoCnis = ms.length && ms.every(naCnis), pos = ms.filter(k=>k >= "2023-01" && !naCnis(k)).length;
       if(!todoCnis && x.v.rur_auto==="Não") ps.push({est:"falta", txt:"falta a autodeclaração do segurado especial (Anexo VIII da IN 128)"});
       else if(!todoCnis && !x.v.rur_auto) ps.push({est:"informar", txt:"a autodeclaração (Anexo VIII) foi feita?"});
       const r = _rmJunta(ps);
       // F235 · os papéis no nome do cônjuge valem se ele era segurado especial no período: o CNIS dele diz
       const conj = x.c ? papeisDaRoca(x.c).filter(p=>p.titular==="conjuge") : [], F = x.sx==="F";
       const nc = conj.length ? `; ${plu(conj.length, "papel", "papéis")} no nome ${F ? "do marido" : "da esposa"} (${[...new Set(conj.map(p=>p.rot))].join(", ")}): valem se ${F ? "ele" : "ela"} era segurado especial no período, sem emprego (IN 128, art. 116, § 3º, I); peça o CNIS ${F ? "do marido, tirado no Meu INSS dele" : "da esposa, tirado no Meu INSS dela"}` : "";
       return pos ? {...r, txt:`${r.txt}${nc}; ${_rm2023(pos, !!x.g)}`} : nc ? {...r, txt:r.txt + nc} : r; }},
    {id:"nao_acumular", rot:"Recebe outra aposentadoria ou BPC?", base:"Lei 8.213/91, art. 124, I e II; IN 128, arts. 112, § 3º, e 639, I, II e XVIII", conf:"conferido", campos:[],
     mede:x=>_rmAcumApos(x)},
  ], {
    rur_inicio:["Início da atividade rural", "date"],
    rur_fim:["Último mês de trabalho na roça", "date"],
    rur_pre1991:["Já trabalhava na roça antes de 11/1991 (ou era inscrito no INSS até 24/07/1991)", "select", SN],
    rur_modulos:["Área total em módulos fiscais, somando todos os imóveis", "number"],
    rur_municipio:["Município onde fica a roça", "text"],
    rur_reside:["Onde mora", "select", ["","No imóvel rural","No mesmo município da roça","Em município vizinho","Em município não vizinho"]],
    rur_empregados:["Teve empregado permanente ou mais de 120 pessoas/dia no ano", "select", SN],
    rur_ratif_1a:["Documento rural na 1ª metade dos 180 meses (tipo e ano)", "text"],
    rur_ratif_2a:["Documento rural na 2ª metade dos 180 meses (tipo e ano)", "text"],
    rur_contrib_facult:["Segurado especial que paga GPS 1503/1554", "select", SN],
  }, {resumo:"Quem trabalhou na roça se aposenta com 55 anos (mulher) ou 60 (homem), provando 15 anos (180 meses) de trabalho rural, mesmo com intervalos, logo antes do pedido ou de completar a idade; o segurado especial não precisa ter pago o INSS e recebe 1 salário mínimo.",
      quando: x=>x.apos ? null : _rmQuandoRural(x),   // aposentado: não há outra aposentadoria a esperar (art. 124, II)
      // F235 · a resposta, o que fazer já e a lista de documentos do caso
      veredito: _rmVeredito, agora: _rmAgora, docs: x=>_rmDocs(x, false)});

  // ══ hibrida ══════════════════════════════════════════════════════════════
  registrarReq("hibrida", [
    {id:"idade_hibrida", rot:"Já tem 62 anos (mulher) ou 65 (homem)? (a idade é a urbana)", base:"IN 128, arts. 257, I, 316, §§ 1º e 2º, e 317, I e § 1º; EC 103/2019, arts. 18 e 19; Lei 8.213/91, art. 48, § 3º; Tema 1007/STJ", conf:"conferido", campos:["apo_filiacao"],
     mede:x=>{ if(!x.dn) return {est:"informar", txt:"sem a data de nascimento na Identificação"};
       const ls = _rmLinhas(x), fil = _hibFil(x, ls), ex = _hibIdadeExig(x, x.der, fil), di = _hibDataIdade(x, fil);
       const ft = !fil ? " (sem a filiação: contei como anterior a 13/11/2019)" : fil > EC103 ? " (filiação depois de 13/11/2019: art. 19)" : "";
       // F235 · a data em que completou a idade: o pagamento só corre do pedido, então ela diz há quanto tempo o direito espera
       if(x.der >= dataDaIdade(x.dn, ex)) return {est:"ok", txt:`${x.idade} anos na DER; exige ${_rmIdTxt(ex)} em ${anoDe(x.der)}${di ? ` (completou em ${fmtBarra(di)})` : ""}${ft}`, fonte:"ficha", quando:di};
       const q = _hibQuando(x);
       if(q && q <= x.der) return {est:"ok", txt:`reuniu idade, carência e tempo em ${fmtBarra(q)}, com a idade daquele ano: direito adquirido${ft}`, fonte:"ficha", quando:q};
       return {est:"falta", txt:`${x.idade} anos na DER; exige ${_rmIdTxt(ex)}; completa a idade exigida em ${fmtBarra(di)}${ft}`, fonte:"ficha", quando:di}; }},
    {id:"carencia_somada", rot:"Soma 180 meses entre a roça e a cidade?", base:"Lei 8.213/91, arts. 27, II, 48, § 3º, e 142; IN 128, arts. 193, 199 e 257, caput; Tema 1007/STJ; Portaria Conjunta 94/2024, Anexo III, ACP 5038261-15.2015.4.04.7100 (afasta o art. 194, II e V, da IN)", conf:"conferido",
     campos:["car_cumprida","rur_pre1991","apo_ci_atraso","apo_segue"],
     mede:x=>{ const ls = _rmLinhas(x), man = +x.v.car_cumprida; if(!x.ct && !man && !ls.length) return {est:"informar", txt:"o CNIS não foi lido e não há linha rural"};
       const fil = _hibFil(x, ls), di = x.dn ? _hibDataIdade(x, fil) : null, ex = _hibExig(x, ls, di), c = _hibCar(x, x.der, ls), fonte = "CNIS e quadro Tempos";
       let txt = `${c.urb} ${man ? "contribuições informadas" : x.ct ? "contribuições do CNIS" : "contribuições (CNIS não lido)"} + ${c.rur} meses rurais${c.inter ? ` + ${c.inter} de benefício intercalado` : ""} = ${c.total} até ${_rmMes(x.der)}; exige ${ex}${ex < 180 ? " (tabela do art. 142)" : ""}`;
       if(c.atr) txt += `; sem ${c.atr} de CI ou facultativo pagas em atraso (Lei 8.213, art. 27, II)`;
       if(c.proj) txt += `; com ${c.proj} a pagar até a DER`;
       if(c.ciSem) txt += `; ${c.ciSem} meses de CI rural depois de 11/1991 sem contribuição ficaram fora`;
       // sem o CNIS, o que falta pode estar nele: a informar, e não falta
       if(c.total < ex && !ls.length && x.c && papeisRurais(x.c.id).length) return {est:"informar", txt:`${txt}. Há papéis rurais no dossiê e nenhum mês de roça lançado: lance os períodos de roça no quadro Tempos, cada um com o documento, antes de concluir`, fonte};
       if(c.total < ex) return !x.ct && !man ? {est:"informar", txt:`${txt}; leia o CNIS (ou informe as contribuições): só o rural não chega`, fonte:"quadro Tempos"} : {est:"falta", txt:`${txt}; faltam ${ex - c.total}`, fonte};
       if(x.der < "2018-01-05" && c.rur && c.total - c.rur < ex) return {est:"risco", txt:`${txt}; DER anterior a 05/01/2018: a ACP não alcança, e o INSS não conta o rural sem contribuição (Tema 1007/STJ na via judicial)`, fonte};
       const ci = ((x.g||{}).vinculos||[]).some(v=>/Individual|Facultativo/i.test(v.tipo||""));
       if(ci && !man && _hibAtraso(x, x.der)==null) return {est:"informar", txt:`${txt}; há CI ou facultativo no CNIS: as contribuições pagas em atraso antes da primeira em dia não contam (Lei 8.213, art. 27, II); confira as datas de pagamento e preencha o campo (competências, ou "nenhuma")`, fonte};
       const antes91 = ls.some(l=>l.de < "1991-11-01");
       return {est:"ok", txt:`${txt}${antes91 ? "; o rural anterior a 11/1991 entra sem contribuição pela ACP (o art. 194, II, da IN ainda o exclui)" : ""}`, fonte}; }},
    {id:"rural_pos_1991_sem_indenizacao", rot:"A roça depois de 1991 entra sem pagar?", base:"Portaria Conjunta DIRBEN/PFE/INSS 94/2024, Anexo III, ACP 5038261-15.2015.4.04.7100 (vigente, nacional, DER desde 05/01/2018)", conf:"conferido", campos:["rur_regime"],   // F235 · o INSS conta o segurado especial pela ACP: a divergência é só da DER antiga, e o estado a diz
     mede:x=>{ const ls = _rmLinhas(x); if(!ls.length) return {est:"informar", txt:"sem linha rural"};
       const m = _rmMesesRurais(ls, ymDe(x.der)), pos = k => k >= "1991-11";
       const se = [...m.se].filter(pos).length, ci = [...m.ci].filter(k=>pos(k) && !_rmCnisTem(x, k) && !m.se.has(k) && !m.emp.has(k)).length;
       if(ci) return {est:"risco", txt:`${ci} meses de CI rural depois de 11/1991 sem contribuição: a ACP cobre só o segurado especial, e o INSS exige a contribuição (o TRF4 dispensa)`, fonte:"quadro Tempos e CNIS"};
       if(se && x.der < "2018-01-05") return {est:"divergente", txt:`${se} meses de segurado especial depois de 11/1991 com DER anterior a 05/01/2018, fora da ACP`,
         div:{inss:"fora da ACP (DER anterior a 05/01/2018), o rural sem contribuição depois de 11/1991 não entra", judicial:"Tema 1007/STJ e PEDILEF 1008411-25.2020 (só na skill): entra sem indenização"}, fonte:"quadro Tempos"};
       if(se) return {est:"ok", txt:`${se} meses de segurado especial depois de 11/1991 entram sem indenização (Portaria Conjunta 94, ACP 5038261-15.2015.4.04.7100); a skill, revogado o art. 257-A pela IN 188/2025, só os sustenta na jurisprudência`, fonte:"quadro Tempos"};
       return {est:"info", txt:"nenhum mês rural sem contribuição depois de 11/1991"}; }},
    {id:"tempo_minimo_contribuicao", rot:"Tem 15 anos de tempo de contribuição (homem que entrou depois de 13/11/2019: 20)?", base:"IN 128, arts. 257, II, e 317, II; EC 103/2019, arts. 18, II, e 19", conf:"conferido", campos:["apo_filiacao"],
     mede:x=>{ const ls = _rmLinhas(x), fil = _hibFil(x, ls), ex = _hibTempoExig(x, fil), t = _hibTempo(x, x.der, ls);
       if(!t) return {est:"informar", txt:"sem tempo lançado: traga os vínculos do CNIS ao quadro Tempos e lance as linhas rurais"};
       const txt = `${tempoFmt(t)} até ${fmtBarra(x.der)}, roça e cidade; exige ${ex} anos${ex===20 ? " (homem filiado depois de 13/11/2019)" : ""}`;
       if(t >= ex*365) return {est:"ok", txt, fonte:"quadro Tempos e CNIS"};
       // só linhas rurais e o CNIS não lido: o tempo da cidade pode estar nele
       if(!x.ct && !+x.v.car_cumprida && !(x.tempos||[]).some(r=>r.nat!=="rural")) return {est:"informar", txt:`${txt}; leia o CNIS: só o rural não chega`, fonte:"quadro Tempos"};
       return {est:"falta", txt:`${txt}; faltam ${tempoFmt(ex*365 - t)}`, fonte:"quadro Tempos e CNIS"}; }},
    {id:"qualidade_dispensada", rot:"Precisa estar trabalhando ou segurado no pedido? (não)", base:"IN 128, art. 257, § 1º, I e II (IN 188/2025); Tema 1007/STJ", conf:"conferido", campos:[],
     mede:x=>{ const g = x.gr;
       return {est:"info", txt:`não exige qualidade de segurado nem atividade na DER${g ? `; pelo CNIS, ${g.semLimite ? "benefício em manutenção" : g.vencida ? `perdida em ${fmtBarra(g.perda)}` : `mantida até ${fmtBarra(g.mantidaAte)}`} (só informação)` : ""}; se o INSS exigir (a ficha da ACP ainda pede), cite o art. 257, § 1º, II, da IN 128`, fonte: g ? "CNIS" : undefined}; }},
    {id:"prova_rural_por_periodo", rot:"Tem um documento rural para cada período de roça?", base:"Portaria DIRBEN 990/2022, art. 94, II e § 5º; IN 128, arts. 116 e 117, § 1º; Lei 8.213/91, art. 38-B", conf:"conferido", campos:[],
     mede:x=>{ const todas = _rmLinhas(x); if(!todas.length) return {est:"informar", txt:"lance as linhas rurais no quadro Tempos, com o documento de cada uma na coluna da prova"};
       // a linha que o período de segurado especial do CNIS cobre inteira já está ratificada (base governamental)
       const cn = todas.filter(l=>l.cnis), noCn = k => cn.some(c=>ymDe(c.de) <= k && k <= ymDe(c.ate));
       const ls = todas.filter(l=>!l.cnis && _rmTipo(l.reg)!=="emp" && !_rmMeses(l.de, l.ate).every(noCn));
       if(!ls.length) return {est:"ok", txt:"as linhas rurais vêm do CNIS ou de emprego registrado", fonte:"CNIS"};
       const ps = ls.map(l=>{ const per = `${fmtBarra(l.de)} a ${fmtBarra(l.ate)}`, y = _rmAno(l.prova);
         if(!l.prova) return {est:"falta", txt:`${per} sem documento`};
         if(!y) return {est:"informar", txt:`${per}: informe o ano do documento (${l.prova})`};
         return (y >= l.de.slice(0,4) || _rmLonga.test(l.prova)) && y <= l.ate.slice(0,4) ? {est:"ok", txt:`${per}: ${l.prova}`, fonte:l.fonte} : {est:"risco", txt:`${per}: o documento de ${y} não é contemporâneo`, fonte:l.fonte}; });
       const pos = new Set(ls.filter(l=>_rmTipo(l.reg)==="se").flatMap(l=>_rmMeses(l.de, l.ate)).filter(k=>k >= "2023-01" && !noCn(k))).size, r = _rmJunta(ps);
       return pos ? {...r, txt:`${r.txt}; ${_rm2023(pos, !!x.g)}`} : r; }},
    {id:"valor_rmi", rot:"Quanto vai receber? (a média, e o rural pesa pouco)", base:"Lei 8.213/91, art. 48, § 4º; IN 128, art. 257, § 2º", conf:"divergente", campos:[],
     mede:x=>{ const ls = _rmLinhas(x); if(!ls.length) return {est:"info", txt:"sem tempo rural: média como na idade comum"};
       const c = _hibCar(x, x.der, ls);
       // F235 · a pergunta do cliente, "quanto vou ganhar": nunca menos que 1 salário mínimo
       return {est:"divergente", txt:`${c.rur} meses rurais sem contribuição entram na média com o salário mínimo pela Lei, ou ficam fora, por outra leitura; de todo modo, a aposentadoria não fica abaixo de 1 salário mínimo${smEm(x.der) ? ` (${moedaBR(smEm(x.der))} em ${anoDe(x.der)})` : ""}: confira no cálculo`,
         div:{inss:"IN 128, art. 257, § 2º: calcula como a idade comum; há leitura de que a média usa só os salários pagos (conferir)", judicial:"Lei 8.213/91, art. 48, § 4º: o período de segurado especial entra com o limite mínimo do salário de contribuição"}, fonte:"quadro Tempos"}; }},
    {id:"nao_acumular", rot:"Recebe outra aposentadoria ou BPC?", base:"Lei 8.213/91, art. 124, I e II; IN 128, art. 639, I, II e XVIII", conf:"conferido", campos:[],
     mede:x=>_rmAcumApos(x)},
  ], {
    // a mesma definição da família das aposentadorias (fam_apos.js): quem registrar por último não muda nada
    apo_ci_atraso:["Contribuições de CI ou facultativo pagas em atraso antes do primeiro pagamento em dia (competências, ex.: 01/2010 a 06/2010, ou \"nenhuma\")", "text"],
  }, {resumo:"Junta o tempo de roça com o tempo de cidade: 62 anos (mulher) ou 65 (homem), 180 meses de carência somando os dois e 15 anos de tempo de contribuição (20 para o homem que só entrou no INSS depois de 13/11/2019). Não precisa estar trabalhando nem ser segurado na data do pedido.",
      quando: x=>x.apos ? null : _hibQuando(x),
      // F235 · a resposta, o que fazer já e a lista de documentos da híbrida
      veredito: _rmVeredito, agora: _rmAgora, docs: x=>_rmDocs(x, true)});

  // ══ urb · salário-maternidade urbano ═════════════════════════════════════
  registrarReq("urb", [
    {id:"qualidade_no_fato", rot:"Estava segurada no dia do parto, da adoção ou do afastamento?", base:"Lei 8.213/91, art. 15; IN 128, arts. 184 (§§ 1º, 2º, 4º, 5º e 10) e 357, caput e § 6º", conf:"conferido", campos:["mat_fato","mat_data","mat_dat"],
     mede:x=>{ const d = _matFato(x); if(!d) return _matSemData;
       const q = qualidadeEm(x, d), rot = d===x.v.mat_data ? (x.v.mat_fato || "fato").toLowerCase() : "afastamento";
       return {...q, txt:`${rot} em ${fmtBarra(d)}: ${q.txt}`}; }},
    {id:"sem_carencia", rot:"Precisa de número mínimo de contribuições? (não)", base:"Lei 8.213/91, art. 26, VI; Enunciado 19 do CRPS (Resolução 13/2026); IN 128, art. 357, caput (IN 188/2025); art. 197 da IN revogado", conf:"conferido", campos:[],
     mede:x=>{ const cat = _matCat(x).cat, d = _matFato(x), n = x.ct && d ? carenciaAte(x, d) : null;
       return {est:"ok", txt:`carência inexigível para todas as categorias${cat ? ` (${_matCatTxt(cat)})` : ""}${n!=null ? `; ${n} ${n===1?"contribuição":"contribuições"} até o fato, e as 10 do art. 25, III, não se exigem` : ""}`, fonte: n!=null ? "CNIS" : undefined}; }},
    {id:"contribuicao_em_dia_ci_facult_mei", rot:"CI, MEI ou facultativa: pagou em dia e se inscreveu antes do parto?", base:"Enunciado 19 do CRPS, I, IV e §§ 2º e 3º (remete ao Enunciado 5); IN 128, art. 361", conf:"conferido", campos:["mat_categoria","mat_em_dia"],
     mede:x=>{ const {cat, fonte} = _matCat(x), d = _matFato(x);
       if(!cat) return {est:"informar", txt:"informe a categoria no dia do fato"};
       if(!/^(CI|MEI|Facultativa)/.test(cat)) return {est:"info", txt:`${_matCatTxt(cat)}: o recolhimento não é dela; não se exige prova de pagamento`, fonte};
       if(!d) return _matSemData;
       const n = x.ct ? carenciaAte(x, d) : null, ind = _rmInd(x), qt = n!=null ? `${n} ${n===1?"contribuição":"contribuições"} até ${_rmMes(d)}` : "";
       if(n===0) return {est:"falta", txt:`nenhuma contribuição até ${_rmMes(d)}: a ${_matCatTxt(cat)} prova ao menos uma, com a filiação antes do fato (Enunciado 19, I e IV)`, fonte:"CNIS"};
       if(cat==="Facultativa baixa renda" && (ind.has("PREC-FBR") || ind.has("IREC-FBR-IND"))) return {est:"risco", txt:"o CNIS marca contribuição de baixa renda não validada: a de 5 % só vale validada pelo CadÚnico", fonte:"CNIS"};
       if(x.v.mat_em_dia==="Não") return {est:"risco", txt:`${qt ? qt + "; " : ""}paga depois do vencimento não vale para o fato anterior ao pagamento (Enunciado 19, § 2º)`, fonte:"campo"};
       if(x.v.mat_em_dia==="Sim") return {est:"ok", txt:`${qt ? qt + ", " : ""}paga até o vencimento`, fonte: n!=null ? "CNIS e campo" : "campo"};
       // F235 · a MEI confere no Portal do Empreendedor: o DAS pago depois do parto não vale para este parto
       return {est:"informar", txt:`${qt ? qt + "; " : ""}${cat==="MEI" ? `confira no Portal do Empreendedor (extrato dos DAS) se os DAS até ${_rmMes(d)} foram pagos até o vencimento: o DAS pago depois do parto não vale para este parto (Enunciado 19 do CRPS, § 2º)` : "confirme se ao menos uma foi paga até o vencimento (o CNIS lido não traz a data do pagamento)"}`, fonte: n!=null ? "CNIS" : undefined}; }},
    // F235 · no parto são 120 dias para o INSS e para a Justiça: a adoção, que tinha divergência, diz a dela no texto
    {id:"fato_gerador_duracao", rot:"Quantos dias recebe e a partir de quando?", base:"Lei 8.213/91, arts. 71 (caput e §§ 2º e 3º) e 71-A (caput e § 3º); IN 128, art. 358; Portaria Conjunta 94, Anexo XII: ADI 6.327 e ACP 5019632-23.2011.4.04.7200", conf:"conferido",
     campos:["mat_fato","mat_data","mat_dat","mat_internacao","mat_alta","mat_zika"], mede:x=>_matDuracao(x)},
    {id:"afastamento", rot:"Parou de trabalhar enquanto recebe?", base:"Lei 8.213/91, art. 71-C; IN 128, art. 357, § 2º", conf:"conferido", campos:["mat_afastou"],
     mede:x=>{ if(_matCat(x).cat==="Desempregada em graça") return {est:"info", txt:"desempregada: não há atividade a deixar"};
       const a = x.v.mat_afastou;
       return a==="Sim" ? {est:"ok", txt:"parou de trabalhar no período", fonte:"campo"} : a==="Não" ? {est:"risco", txt:"continuar trabalhando suspende o benefício (Lei 8.213, art. 71-C)", fonte:"campo"}
         // F235 · a pergunta no futuro, com a regra: trabalhar nos 120 dias suspende o benefício
         : {est:"informar", txt:`vai parar de trabalhar${/^(MEI|CI)$/.test(_matCat(x).cat) ? " (atender os clientes)" : ""} durante os 120 dias${_matFato(x) ? `, até ${fmtBarra(somaDias(_matFato(x), 119))}` : ""}? Se continuar trabalhando, o INSS suspende o benefício (Lei 8.213, art. 71-C)`}; }},
    {id:"quem_paga_valor", rot:"Quem paga e quanto?", base:"Lei 8.213/91, arts. 71-A, § 1º, 72, § 1º e § 3º, e 73, I, III e par. único; IN 128, art. 240 (I a VII e § 8º)", conf:"conferido", campos:["mat_categoria"],
     mede:x=>{ const {cat, fonte} = _matCat(x), d = _matFato(x) || x.der, sm = smEm(d), min = sm ? `; nunca menos que 1 salário mínimo (${moedaBR(sm)} em ${_rmMes(d)})` : "";
       if(!cat) return {est:"informar", txt:"informe a categoria: muda quem paga e o cálculo"};
       const media = "o INSS paga 1/12 da soma dos 12 últimos salários de contribuição, apurados em até 15 meses (art. 73, III; IN 128, art. 240)";
       const T = {"Empregada com vínculo ativo":"a empresa paga a remuneração integral (ou a média dos 6 últimos salários, se variável) e compensa (art. 72, § 1º)",
         "Doméstica":"o INSS paga o último salário de contribuição (art. 73, I)", "Avulsa":"o INSS paga a remuneração integral (art. 72, § 3º)",
         "Empregada de MEI":"o INSS paga a remuneração integral (art. 72, § 3º)", "Segurada especial":"o INSS paga 1 salário mínimo (art. 39, par. único)"};
       return {est:"info", txt:`${T[cat] || media}${/Adoção/.test(x.v.mat_fato||"") ? "; na adoção, o INSS paga sempre (art. 71-A, § 1º)" : ""}${min}${cat!=="Empregada com vínculo ativo" ? `; ${_MAT_73A}` : ""}`, fonte}; }},
    {id:"prazo_pedido", rot:"Está pedindo em até 5 anos do parto ou da adoção?", base:"IN 128, arts. 357, § 5º, e 360, § 5º", conf:"conferido", campos:["mat_data"], mede:x=>_matPrazo(x)},
    {id:"um_por_fato", rot:"Alguém mais já pediu pelo mesmo parto ou adoção?", base:"Lei 8.213/91, art. 71-A, § 2º; IN 128, arts. 357, §§ 3º e 4º, e 359, § 2º", conf:"conferido", campos:["mat_outro_genitor"], mede:x=>_matUm(x)},
    {id:"nao_acumular", rot:"Recebe auxílio por incapacidade ou seguro-desemprego no mesmo período?", base:"Lei 8.213/91, art. 124, IV e par. único; IN 128, arts. 357, § 8º, e 639, IV, §§ 3º e 5º; Decreto 3.048/99, art. 102", conf:"conferido", campos:[],
     mede:x=>_matAcum(x)},
  ], {
    mat_categoria:["Categoria no dia do fato", "select", ["","Empregada com vínculo ativo","Doméstica","Avulsa","Empregada de MEI","CI","MEI","Facultativa","Facultativa baixa renda","Desempregada em graça"]],
    mat_dat:["Afastamento antes do parto (até 28 dias)", "date"],
    mat_internacao:["Mãe ou bebê internados por mais de 2 semanas por complicação do parto", "select", SN],
    mat_alta:["Data da alta", "date"],
    mat_zika:["Criança com síndrome congênita do Zika", "select", SN],
    mat_afastou:["Parou de trabalhar no período", "select", SN],
    mat_outro_genitor:["O outro genitor ou adotante já pediu", "select", SN],
    mat_em_dia:["CI, MEI ou facultativa: ao menos uma contribuição paga até o vencimento", "select", SN],
  }, {resumo:"Quem tem filho, adota ou perde o bebê e está segurada do INSS nesse dia recebe 120 dias (2 semanas no aborto); não precisa de número mínimo de contribuições; a empregada com carteira assinada recebe pela empresa, menos a doméstica e a empregada de MEI, que recebem pelo INSS, como as demais.",
      // F235 · o prazo para pedir, os 30 dias do INSS e a lista pela categoria (sem a prova rural, e sem a empresa para quem não é empregada)
      agora: x=>_matAgora(x, false), desfechoTxt: x=>_matDesf(x), docs: x=>_urbDocs(x)});

  // ══ rur · salário-maternidade da segurada especial ═══════════════════════
  registrarReq("rur", [
    {id:"atividade_12_meses", rot:"Trabalhou na roça nos 12 meses antes do parto, mesmo com intervalos?", base:"Lei 8.213/91, art. 39, par. único; Enunciado 19 do CRPS, III; IN 128, arts. 184, § 9º, e 357, caput", conf:"conferido", campos:["mat_data","rur_meses_12"],
     mede:x=>{ const d = _matFato(x); if(!d) return _matSemData;
       const ini = ymDe(somarMeses(d, -12)), fim = ymDe(somarMeses(d, -1)), jan = `${_rmYm(ini)} a ${_rmYm(fim)}`;
       const cv = String(x.v.rur_meses_12 ?? "").trim().replace(",", "."), campo = cv!=="" && !isNaN(+cv) ? Math.min(12, Math.max(0, Math.floor(+cv))) : null;
       const ls = _rmLinhas(x, d).filter(l=>_rmTipo(l.reg)==="se");
       if(campo==null && !ls.length) return {est:"informar", txt:"lance a atividade rural (quadro Tempos, ou início e fim) ou informe os meses de roça nos 12 antes do fato"};
       const n = campo!=null ? campo : new Set(ls.flatMap(l=>_rmMeses(l.de, l.ate)).filter(k=>k >= ini && k <= fim)).size, fonte = campo!=null ? "campo" : _rmFonte(ls);
       if(n >= 12) return {est:"ok", txt:`12 de 12 meses na roça antes do fato (${jan})`, fonte};
       if(n > 0) return {est:"ok", txt:`${n} de 12 meses na roça antes do fato (${jan}): basta a atividade no período, ainda que descontínua, sem exigir o período todo (Enunciado 19, III); quem parou está em graça por 12 meses (art. 184, § 9º)`, fonte};
       // parou antes da janela, mas ainda em graça no fato: a IN dá o direito (arts. 184, § 9º, e 357, caput); a Lei e o Enunciado pedem a atividade nos 12 meses
       const gr = campo==null ? _rmNaRoca(ls, d) : {ok:false};
       if(gr.ok) return {est:"risco", txt:`nenhum mês de roça nos 12 antes do fato (${jan}), mas em graça no fato (último mês na roça ${_rmYm(gr.ult)}, mantida até ${fmtBarra(gr.ate)}): a IN 128 (arts. 184, § 9º, e 357, caput) paga à segurada em graça; a Lei 8.213, art. 39, par. único, e o Enunciado 19, III, pedem atividade nos 12 meses`, fonte};
       return {est:"falta", txt:`nenhum mês de roça nos 12 antes do fato (${jan})${gr.ult ? `, e a graça do último mês na roça (${_rmYm(gr.ult)}) acabou em ${fmtBarra(gr.ate)}` : ""}: a atividade tem de estar nesse período (Lei 8.213, art. 39, par. único; não são os 10 meses da carência antiga)`, fonte}; }},
    {id:"sem_carencia", rot:"Precisa ter pago o INSS? (não)", base:"Enunciado 19 do CRPS; IN 128, art. 357, caput (IN 188/2025); art. 197 da IN revogado", conf:"conferido", campos:[],
     mede:x=>({est:"ok", txt:"carência inexigível: as 10 contribuições do art. 25, III, não se exigem da segurada especial"})},
    {id:"condicao_segurada_especial", rot:"É segurada especial: roça da família, terra pequena, sem outro emprego longo?", base:"IN 128, arts. 109, § 1º, I, 110, §§ 1º, 2º e 8º, 112 (IV, IX, § 3º) e 113; Portaria Conjunta 94, Anexo XII", conf:"conferido",
     campos:["rur_empregados","rur_modulos","rur_municipio","rur_reside"],
     mede:x=>{ const d = _matFato(x); if(!d) return _matSemData;
       // F235 · com o período de segurada especial no CNIS, sem pendência, o cadastro já comprova a condição (Lei 8.213/91, art. 38-B):
       // o que ninguém respondeu (área, mão de obra, moradia) deixa de ser pergunta; resta o que a descaracterizaria
       const ls = _rmLinhas(x, d), cnSE = ls.filter(l=>l.cnis && l.de <= somarMeses(d, -12)), cad = cnSE.length && !_rmInd(x).has("PSE-PEN");
       const ps = [...[_rmEcon(x), _rmModulos(x, ls), _rmResid(x)].filter(p=>!(cad && p.est==="informar")),
         ...(cad ? [{est:"ok", txt:`o CNIS já tem o período de segurada especial (desde ${fmtBarra(cnSE[0].de)}), sem pendência: a condição está no cadastro do INSS (Lei 8.213, art. 38-B)`, fonte:"CNIS"}] : []),
         _rmDescar(x, ls, ymDe(somarMeses(d, -12)), ymDe(d))], id = x.dn ? idadeEm(x.dn, d) : null;
       if(id!=null && id < 16) ps.push({est:"risco", txt:`${id} anos no fato: abaixo de 16, o INSS só afasta o limite para as etnias e localidades das ACPs do Anexo XII da Portaria Conjunta 94`, fonte:"ficha"});
       return _rmJunta(ps); }},
    {id:"ratificador_antes_do_parto", rot:"Tem um documento rural com data anterior ao parto?", base:"Portaria DIRBEN 990/2022, art. 94, III e § 1º (alínea c revogada pela Portaria 1.299/2025); Lei 8.213/91, art. 38-B, §§ 1º e 2º; IN 128, arts. 116 (§ 3º, I, XXIV e XXV) e 117, § 1º", conf:"conferido",
     campos:["rur_ratif_antes","rur_titular_doc"],
     mede:x=>{ const d = _matFato(x); if(!d) return _matSemData;
       const ini = somarMeses(d, -12), cn = _rmLinhas(x, d).filter(l=>l.cnis && l.ate >= ini);
       if(cn.length) return {est:"ok", txt:`o CNIS traz período de segurado especial (desde ${fmtBarra(cn[0].de)}): base governamental ratifica`, fonte:"CNIS"};
       // desde 01/2023 sem o cadastro, segue a autodeclaração ratificada, pela prorrogação (IN 128, art. 117, § 1º)
       const n23 = d >= "2023-01-01" ? `; ${_rm2023(0, !!x.g)}` : "";
       const doc = x.v.rur_ratif_antes; if(!doc) return {est:"informar", txt:`informe o documento rural anterior ao parto (tipo e data)${n23}`};
       const br = (String(doc).match(/\d{2}\/\d{2}\/\d{4}/)||[])[0], dt = br ? isoBr(br) : "", y = _rmAno(doc);
       if(!dt && !y) return {est:"informar", txt:`informe a data do documento (${doc})${n23}`};
       if(dt ? dt >= d : y > d.slice(0,4)) return {est:"falta", txt:`o documento (${doc}) não é anterior ao fato (${fmtBarra(d)})${n23}`, fonte:"campo"};
       if(!dt && y===d.slice(0,4)) return {est:"informar", txt:`documento de ${y}, o ano do fato: informe o dia para saber se é anterior${n23}`};
       const t = x.v.rur_titular_doc || "";
       // F235 · o papel do sogro (ou de quem não é do grupo familiar) não prova o trabalho dela; o dos pais, só do tempo de solteira
       if(/Sogro|outra pessoa/i.test(t)) return {est:"falta", txt:`${doc}: no nome de quem não é do grupo familiar (o sogro, o cunhado), não prova o trabalho dela (IN 128, art. 109, § 1º, IV); traga um papel no nome dela ou do marido, anterior ao parto${n23}`, fonte:"campo"};
       const nota = /Marido/.test(t) ? `; em nome de ${t.toLowerCase()}: vale se o titular era segurado especial na data (IN 128, art. 116, § 3º, I)`
         : /Pais/.test(t) ? "; em nome dos pais: vale se o titular era segurado especial na data, e só do tempo em que ela era solteira e morava com eles (IN 128, arts. 109, § 1º, V, e 116, § 3º, I)" : "";
       return {est:"ok", txt:`${doc}, anterior ao fato${nota}${n23}`, fonte:"campo"}; }},
    {id:"valor", rot:"Quanto recebe? (1 salário mínimo, ou mais se contribui)", base:"Lei 8.213/91, art. 39, par. único; IN 128, art. 240, IV e V; Enunciado 19 do CRPS, II", conf:"conferido", campos:["mat_rur_contrib"],
     mede:x=>{ const d = _matFato(x) || x.der, sm = smEm(d);
       if(x.v.mat_rur_contrib==="Sim"){ const n = x.ct ? carenciaAte(x, d) : null;
         return n===0 ? {est:"info", txt:`paga GPS de segurada especial, mas o CNIS não tem contribuição até o fato: recebe 1 salário mínimo${sm ? ` (${moedaBR(sm)})` : ""}`, fonte:"CNIS"}
           : {est:"info", txt:"contribui: recebe 1/12 da soma dos 12 últimos salários de contribuição, provando atividade rural em ao menos 1 dos 12 meses e ao menos 1 contribuição (Enunciado 19, II; IN 128, art. 240)"}; }
       return {est:"info", txt:`1 salário mínimo${sm ? `: ${moedaBR(sm)} em ${_rmMes(d)}` : ""} (Lei 8.213, art. 39, par. único); ${_MAT_73A}`}; }},
    {id:"fato_gerador_duracao", rot:"Quantos dias recebe?", base:"Lei 8.213/91, arts. 71 e 71-A; IN 128, art. 358", conf:"conferido",
     campos:["mat_fato","mat_data","mat_dat","mat_internacao","mat_alta","mat_zika"], mede:x=>_matDuracao(x)},
    {id:"prazo_e_vedacoes", rot:"Está no prazo de 5 anos e não recebe outro benefício pelo mesmo período?", base:"IN 128, arts. 357, §§ 3º a 5º, e 639, IV; Lei 8.213/91, art. 124, IV", conf:"conferido", campos:["mat_data","mat_outro_genitor"],
     mede:x=>{ const r = _rmJunta([_matPrazo(x), _matUm(x), _matAcum(x)]), p = _rmPessoa(x);
       const defeso = p && (p.programas||[]).some(g=>/defeso/i.test(`${g.programa} ${g.rotulo||""}`));
       return defeso ? {...r, txt:`${r.txt}; recebe seguro-defeso: a acumulação com o salário-maternidade é controversa (não conferida)`} : r; }},
  ], {
    rur_meses_12:["Meses com trabalho rural nos 12 antes do parto", "number"],
    rur_ratif_antes:["Documento rural anterior ao parto (tipo e data)", "text"],
    rur_titular_doc:["Em nome de quem está o documento", "select", ["","Própria","Marido ou companheiro","Pais","Sogro, cunhado ou outra pessoa (não serve)"]],
    mat_rur_contrib:["Paga GPS de segurada especial (1503/1554)", "select", SN],
  }, {resumo:"A mãe que trabalha na roça com a família recebe 1 salário mínimo por 120 dias se provar trabalho rural nos 12 meses antes do parto (ou da adoção), mesmo com intervalos, sem precisar ter pago o INSS.",
      // F235 · o prazo para pedir, os 30 dias do INSS, a regra do papel anterior ao parto e a lista sem os papéis da empregada
      agora: x=>_matAgora(x, true), desfechoTxt: x=>_matDesf(x), docs: x=>_rurDocs(x)});
})();
// ── BPC, pensão por morte e auxílio-reclusão (casos-ouro em testes/cadastro/req-ouro/bpc_dep.json) ──
// F232 · catálogo de requisitos · BPC (def, idoso), pensão por morte (morte) e auxílio-reclusão (reclusao)
// Fonte: crm/fase2/docs/REQUISITOS-POR-BENEFICIO.md, seção "BPC, pensão por morte e auxílio-reclusão".
(()=>{
  // ── auxiliares comuns ─────────────────────────────────────────────────────
  const _num = v => v==null || v==="" || typeof v==="object" || isNaN(+v) ? null : +v;
  const _n = (x, k) => _num(x.v[k]);
  const _nm = s => String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toUpperCase().replace(/\s+/g," ").trim();
  const _mesAno = iso => `${iso.slice(5,7)}/${iso.slice(0,4)}`;
  const CORTE_2019 = "2019-01-18";   // Lei 13.846/2019 (MP 871): provas, 180 dias, carência e regime da reclusão
  // ── BPC: o grupo da LOAS a partir da família do CadÚnico ─────────────────
  // o parentesco do CadÚnico é com o responsável familiar (RF); o rol do art. 20, § 1º, é com o requerente
  const _bpcRel = p => { p = String(p||"").toLowerCase();
    return /respons/.test(p) ? "rf" : /c[oô]njuge|companheir|espos|marido/.test(p) ? "conj" : /entead/.test(p) ? "ent" : /net[oa]|bisnet/.test(p) ? "neto"
      : /sogr/.test(p) ? "sogro" : /genro|nora/.test(p) ? "genro" : /irm[aã]/.test(p) ? "irmao" : /^(pai|m[aã]e|padrast|madrast)/.test(p) ? "pai" : /^filh/.test(p) ? "filho" : "outro"; };
  // requerente (relação com o RF) → integrante (relação com o RF): 1 entra no grupo, 2 dúvida, ausente fica fora
  const _ROL = {rf:{conj:1, filho:1, ent:1, pai:1, irmao:1}, conj:{rf:1, filho:1, ent:1, sogro:1},
    filho:{rf:1, conj:1, filho:1, ent:2, neto:2, genro:2}, ent:{rf:1, conj:1, ent:1, filho:2, neto:2, genro:2},
    pai:{rf:1, pai:1, irmao:1}, irmao:{rf:1, pai:1, irmao:1}};
  const _BPC_RX = /amparo|assistencial|\bloas\b|\bbpc\b|\bB?8[78]\b/i;
  // F235 · o parentesco do CadÚnico é com a responsável familiar; a tela diz o que a pessoa é de quem pede
  const _PAR_REQ = {filho:{rf:"mãe ou pai", conj:"mãe ou pai, ou padrasto ou madrasta", filho:"irmão ou irmã", ent:"irmão ou irmã de um dos pais", pai:"avó ou avô", neto:"sobrinho ou filho", irmao:"tio ou tia", genro:"cunhado ou cônjuge"},
    rf:{conj:"cônjuge", filho:"filho ou filha", ent:"enteado ou enteada", pai:"mãe ou pai", irmao:"irmão ou irmã", neto:"neto ou neta", genro:"genro ou nora", sogro:"sogro ou sogra"},
    conj:{rf:"cônjuge", filho:"filho ou enteado", ent:"enteado ou enteada", neto:"neto ou neta", sogro:"mãe ou pai", pai:"sogro ou sogra", genro:"genro ou nora"}};
  const _rotPar = (eu, m) => { const r = eu && (_PAR_REQ[_bpcRel(eu.parentesco)]||{})[_bpcRel(m.parentesco)];
    return r ? `${r} de quem pede; no CadÚnico: ${m.parentesco}` : String(m.parentesco||""); };
  const _primeiro = s => fraseClinica(String(s||"")).split(" ")[0];
  // o Bolsa Família entra na renda desde o Decreto 12.534, de 25/06/2025 (revogou o art. 4º, § 2º, II, do Decreto 6.214); antes, ficava fora
  const BOLSA_NA_RENDA = "2025-06-25";
  // deduções do Anexo I pela DER: Portaria Conjunta 45/2026 (DOU de 30/09/2026, data só na skill); antes, os valores antigos (só na skill)
  const _CATS = [[/medicament|medica[cç]|rem[eé]d/i,"medicamentos"],[/consult|tratament/i,"consultas e tratamentos"],[/fralda/i,"fraldas"],[/aliment|dieta/i,"alimentação especial"],[/centro/i,"centro-dia"]];
  function _bpcDeducao(x){
    const real = _n(x, "ren_gastos_reais");
    if(real) return {valor:real, txt:`gasto real de ${moedaBR(real)}, comprovado por recibos dos 12 meses anteriores ao pedido`};
    const nova = x.der >= "2026-09-30", tab = nova ? [56,110,120,147,40] : [45,90,99,121,32], s = x.v.ren_gastos_cat || "";
    const us = _CATS.map((c, i)=>c[0].test(s) ? i : -1).filter(i=>i >= 0), valor = us.reduce((t, i)=>t + tab[i], 0);
    return {valor, txt: us.length ? `${moedaBR(valor)} de desconto (${us.map(i=>`${_CATS[i][1]} ${moedaBR(tab[i])}`).join(", ")}), ${nova ? "Portaria Conjunta 45/2026" : "valores anteriores à Portaria Conjunta 45/2026, só na skill"}` : ""};
  }
  // a renda por pessoa da LOAS: nunca a renda_por_pessoa do CadÚnico
  function _bpcRenda(x){
    const v = x.v, sm = smEm(x.der), lim = sm/4, ded = _bpcDeducao(x), exclM = _n(x, "ren_excluida") || 0;
    if(_n(x, "ren_pessoas") && _n(x, "ren_total")!=null){ const n = _n(x, "ren_pessoas"), bruto = _n(x, "ren_total");
      return {n, bruto, bolsa:0, exclV:exclM, excl:[], fora:[], duvida:[], det:[], tirados:[], ded, sm, lim, pc: Math.max(0, bruto - exclM - ded.valor)/n, fonte:"campo"}; }
    const cad = x.cad;
    if(!cad) return {erro:"sem o CadÚnico no dossiê: informe as pessoas do grupo (ren_pessoas) e a renda bruta (ren_total)"};
    const ms = (cad.membros||[]).filter(m=>!m.obito), eu = x.dn && ms.find(m=>String(m.nascimento||"").slice(0,10)===x.dn);
    if(!eu) return {erro:"não achei o requerente entre os integrantes do CadÚnico (pelo nascimento): confira, ou informe ren_pessoas e ren_total"};
    const tab = _ROL[_bpcRel(eu.parentesco)];
    if(!tab) return {erro:`o requerente aparece como "${eu.parentesco}" no CadÚnico: monte o grupo do art. 20, § 1º, em ren_pessoas e ren_total`};
    const dentro = [eu], fora = [], duvida = [];
    // genro ou nora na casa: algum filho ou enteado é casado, e o rol só conta os solteiros
    const casado = ms.some(m=>_bpcRel(m.parentesco)==="genro");
    // F235 · o filho ou enteado adulto entra só se solteiro, e o CadÚnico não diz o estado civil: fica em dúvida até a
    // atendente responder; quem ela tira (ren_fora_nomes: casado, divorciado, viúvo) sai do grupo
    const tirados = String(v.ren_fora_nomes||"").split(/[;,]/).map(s=>_nm(s)).filter(s=>s.length > 2);
    const tirado = m => tirados.some(t=>_nm(m.nome).includes(t));
    for(const m of ms) if(m!==eu){ const rel = _bpcRel(m.parentesco); let k = tab[rel];
      const adulto = m.nascimento && idadeEm(String(m.nascimento).slice(0,10), x.der) >= 18;
      if(tirado(m)) k = undefined;
      else if(k===1 && (rel==="filho" || rel==="ent") && (casado || adulto) && !v.ren_filhos_solteiros) k = 2;
      (k===1 ? dentro : k===2 ? duvida : fora).push(m); }
    const desde = ymDe(somarMeses(x.der, -3)).replace("-","");
    const bf = (cad.beneficios_pagos||[]).filter(b=>/bolsa\s*fam/i.test(`${b.tipo||""} ${b.especie||""}`) && String(b.ultima_competencia||"").replace(/\D/g,"").slice(0,6) >= desde)
      .sort((a, b)=>String(b.ultima_competencia).localeCompare(String(a.ultima_competencia)))[0];
    const bolsaAntes = !!bf && x.der < BOLSA_NA_RENDA;
    const bolsa = bf && !bolsaAntes ? _num(bf.valor_ultimo) || 0 : 0, rc = cad.renda_cnis || [];
    if(!rc.length){
      if(fora.length || duvida.length) return {erro:"o CadÚnico não traz a renda de cada integrante e há quem fique fora do grupo da LOAS: informe ren_pessoas e ren_total"};
      if(_num(cad.renda_total)==null) return {erro:"o CadÚnico não traz a renda da família: informe ren_total"};
      return {n:dentro.length, bruto:_num(cad.renda_total), bolsa, bolsaAntes, exclV:exclM, excl:[], fora, duvida, sem:[], det:[], eu, tirados:ms.filter(tirado), ded, sm, lim, fonte:"CadÚnico",
        pc: Math.max(0, _num(cad.renda_total) + bolsa - exclM - ded.valor)/dentro.length};
    }
    const conta = grupo => { let bruto = 0, exclV = exclM; const excl = [], sem = [], jovens = [], det = [];
      for(const m of grupo){ const r0 = rc.find(r=>_nm(r.nome)===_nm(m.nome)); if(!r0) sem.push(m);   // renda desconhecida não é renda zero
        const r = r0 || {}, d = r.declarado || {}, id = m.nascimento ? idadeEm(m.nascimento, x.der) : null;
        const sal = Math.max(_num(r.remuneracao_ultimo_mes) || 0, _num(d.remuneracao_mes_anterior) || 0);
        const aprendiz = String(v.ren_aprendiz||"").split(/[;,]/).map(s=>_nm(s)).filter(s=>s.length > 2).some(t=>_nm(m.nome).includes(t));
        // F235 · a renda de cada um, para a tela mostrar a conta inteira
        const dm = {m, sal, out:(_num(d.seguro_desemprego)||0) + (_num(d.pensao_alimenticia)||0) + (_num(d.outras)||0), ben:0, fora:0, apr:false}; det.push(dm);
        if(aprendiz && sal){ exclV += sal; dm.apr = true; excl.push(`salário de aprendiz ou estagiário de ${m.nome} (${moedaBR(sal)})`); }
        else if(sal && m!==eu && id!=null && id < 24 && !v.ren_aprendiz) jovens.push(m);
        bruto += sal + dm.out;
        const bens = (r.beneficios_inss||[]).length ? r.beneficios_inss : _num(d.aposentadoria_pensao_bpc) ? [{especie:"aposentadoria, pensão ou BPC declarado", valor:d.aposentadoria_pensao_bpc}] : [];
        let usou = false;   // art. 20, § 14: um benefício por integrante
        for(const b of bens){ const val = _num(b.valor) || 0; bruto += val; dm.ben += val; if(m===eu || usou) continue;
          if(_BPC_RX.test(b.especie||"")){ usou = true; exclV += val; dm.fora += val; excl.push(`BPC de ${m.nome} (${moedaBR(val)})`); }
          else if(id!=null && id >= 65 && val <= sm + 0.005){ usou = true; exclV += val; dm.fora += val; excl.push(`${String(b.especie||"benefício").toLowerCase()} de até 1 SM de ${m.nome}, ${id} anos (${moedaBR(val)})`); } }
      }
      return {bruto, exclV, excl, sem, jovens, det, pc: Math.max(0, bruto + bolsa - exclV - ded.valor)/grupo.length};
    };
    const r = conta(dentro), alt = duvida.length ? conta([...dentro, ...duvida]) : null;
    return {...r, eu, n:dentro.length, bolsa, bolsaAntes, casado, fora, duvida, tirados:ms.filter(tirado), ded, sm, lim, fonte:"CadÚnico", muda: alt && ((alt.pc <= lim) !== (r.pc <= lim))};
  }
  // F235 · a conta inteira, para ler à pessoa: quem entra (o que é de quem pede) e com que renda, quem fica fora e a divisão
  const _contaTxt = r => {
    const final = Math.max(0, (r.fonte==="campo" ? r.bruto - r.exclV : r.bruto + r.bolsa - r.exclV) - r.ded.valor);
    if(r.fonte==="campo") return `conta: ${moedaBR(r.bruto)} informados${r.exclV ? ` − ${moedaBR(r.exclV)} que a lei tira` : ""}${r.ded.valor ? ` − ${moedaBR(r.ded.valor)} de gastos de saúde` : ""} = ${moedaBR(final)}; ÷ ${r.n} = ${moedaBR(r.pc)} por pessoa`;
    const ent = (r.det||[]).map(d=>{ const ps = [];
      if(d.sal) ps.push(d.apr ? `${moedaBR(d.sal)} de aprendiz ou estágio, que não entra` : `${moedaBR(d.sal)} de trabalho`);
      if(d.out) ps.push(`${moedaBR(d.out)} de outras rendas`);
      if(d.ben) ps.push(d.fora ? `benefício de ${moedaBR(d.ben)}, que não entra (art. 20, § 14)` : `benefício de ${moedaBR(d.ben)}`);
      return `${_primeiro(d.m.nome)} (${d.m===r.eu ? "quem pede" : _rotPar(r.eu, d.m).split(";")[0]}${ps.length ? `: ${ps.join(", ")}` : ""})`; });
    const soma = (r.det||[]).flatMap(d=>[d.sal && !d.apr ? d.sal : 0, d.out || 0, (d.ben||0) - (d.fora||0)]).filter(v=>v > 0).map(moedaBR);
    if(r.bolsa) soma.push(`Bolsa Família ${moedaBR(r.bolsa)}`);
    return [`entram ${ent.join(", ")}`, ...(r.fora.length ? [`fica${r.fora.length > 1 ? "m" : ""} fora ${r.fora.map(m=>`${_primeiro(m.nome)} (${_rotPar(r.eu, m).split(";")[0]})`).join(", ")}`] : []),
      `conta: ${soma.length ? soma.join(" + ") : "nenhuma renda"} = ${moedaBR(r.bruto + r.bolsa - r.exclV)}${r.ded.valor ? `; menos ${moedaBR(r.ded.valor)} de gastos de saúde = ${moedaBR(final)}` : ""}; ÷ ${r.n} = ${moedaBR(r.pc)} por pessoa`].join("; ");
  };
  const _bpcPc = (x, extra) => { const r = _bpcRenda(x);
    if(r.erro) return {est:"informar", txt:r.erro};
    const ok = r.pc <= r.lim + 1e-9, nomes = ms => ms.map(m=>`${m.nome} (${_rotPar(r.eu, m)})`).join(", ");
    const partes = [`${moedaBR(r.pc)} por pessoa (${r.n} no grupo da LOAS); limite ${moedaBR(r.lim)}, 1/4 do salário mínimo de ${_mesAno(x.der)}${x.der >= "2026-01-01" ? " (valor de 2026 não conferido)" : ""}`];
    if(r.bolsa) partes.push(`o Bolsa Família de ${moedaBR(r.bolsa)} entra na renda (Decreto 12.534/2025)`);
    if(r.bolsaAntes) partes.push("o Bolsa Família fica fora: a DER é anterior ao Decreto 12.534/2025 (data de vigência não conferida)");
    if(r.fora.length) partes.push(`fora do rol do art. 20, § 1º: ${nomes(r.fora)}`);
    if(r.duvida.length) partes.push(`confirme se entra: ${nomes(r.duvida)}${r.casado ? " (há genro ou nora na casa: filhos e enteados só entram se solteiros)" : ""}`);
    if(r.ded.valor) partes.push(`descontados ${moedaBR(r.ded.valor)} de gastos de saúde`);
    // F235 · quem saiu por não ser solteiro: a prova vai junto e o CadÚnico se atualiza antes, senão o INSS conta a pessoa
    if((r.tirados||[]).length) partes.push(`${r.tirados.map(m=>_primeiro(m.nome)).join(" e ")} fica${r.tirados.length > 1 ? "m" : ""} fora por não ser solteiro: junte a certidão de casamento com a averbação (divórcio, separação ou óbito) e atualize o CadÚnico no CRAS antes do pedido, senão o INSS conta e pode negar`);
    const semDed = r.ded.valor ? Math.max(0, r.fonte==="campo" ? r.bruto - r.exclV : r.bruto + r.bolsa - r.exclV) / r.n : null;
    const fim = [_contaTxt(r), ...(semDed!=null ? [`sem as negativas do SUS e o relatório médico juntados ao pedido, o INSS não desconta os gastos: a conta dele dá ${moedaBR(semDed)} por pessoa${semDed > r.lim + 1e-9 ? ", acima do limite, e nega pela renda" : ""}`] : [])];
    if(r.muda) return {est:"informar", txt: [...partes, `quem está em dúvida muda o resultado: ${r.duvida.some(m=>/^filh|entead/i.test(m.parentesco||"")) ? "o filho ou enteado adulto só entra se for solteiro; casado, divorciado ou viúvo fica fora (escreva o nome no campo de quem não entra)" : "confirme quem mora na casa"}`, ...fim].join("; "), fonte:r.fonte};
    if((r.jovens||[]).length && !ok) return {est:"informar", txt: [...partes, `${r.jovens.map(m=>m.nome).join(", ")} tem salário e menos de 24 anos: se é aprendiz ou estagiário, o salário sai da conta (LOAS, art. 20, § 9º); escreva o nome no campo`, ...fim].join("; "), fonte:r.fonte};
    if(ok && (r.sem||[]).length) return {est:"informar", txt: partes.join("; ") + `; o CadÚnico não traz a renda de ${r.sem.map(m=>m.nome).join(", ")}: confirme antes de dar a renda por cumprida`, fonte:r.fonte};
    if(ok) return {est:"ok", txt: [...partes, `dentro do limite (sobram ${moedaBR(Math.max(0, r.lim - r.pc))})`, ...fim].join("; "), fonte:r.fonte};
    // F235 · acima de 1/4 mesmo com as exclusões e os descontos: a via judicial (Tema 185/STJ, só na skill); o 1/2 SM do § 11-A depende de regulamento
    partes.push(`acima de 1/4 mesmo com as exclusões e os descontos acima: provar a miserabilidade por outros meios (art. 20, § 11, e art. 20-B, LOAS)${extra ? extra(x) : ""}; na via judicial, a renda de 1/4 é presunção e não teto (Tema 185/STJ, só na skill; o Tema 27/STF declarou inconstitucional o § 3º); o limite de 1/2 SM do § 11-A ainda depende de regulamento`);
    return {est:"risco", txt: [...partes, ...fim].join("; "), fonte:r.fonte};
  };
  const _bpcExcl = x => { const r = _bpcRenda(x), m = _n(x, "ren_excluida");
    if(r.erro) return m ? {est:"ok", txt:`${moedaBR(m)} fora da conta, informados no campo`, fonte:"campo"}
      : {est:"info", txt:"sem o grupo do CadÚnico, informe em ren_excluida a renda que a lei manda excluir"};
    const ls = [...r.excl, ...(m ? [`${moedaBR(m)} informados no campo`] : [])];
    // F235 · salário de jovem sem saber se é aprendiz: a pergunta fica aqui, e nunca "nenhuma renda a excluir"
    const jov = (r.jovens||[]).length ? `${r.jovens.map(k=>_primeiro(k.nome)).join(" e ")} tem salário e menos de 24 anos: é jovem aprendiz ou estagiário? Se for, o salário sai da conta (LOAS, art. 20, § 9º); escreva o nome no campo do aprendiz, na renda` : "";
    // F235 · o benefício do cônjuge que sai da conta: se ele morrer, a pensão não se soma ao BPC
    const nota = x.op==="idoso" && (r.det||[]).some(d=>d.fora && d.m!==r.eu && /^c[ôo]njuge/.test(_rotPar(r.eu, d.m))) ? "; se o cônjuge falecer, a pensão por morte não se acumula com o BPC: escolhe-se a melhor (LOAS, art. 20, § 4º)" : "";
    if(jov) return {est:"informar", txt: ls.length ? `fora da conta (art. 20, §§ 9º e 14): ${ls.join("; ")}; ${jov}${nota}` : jov + nota, fonte:r.fonte};
    return ls.length ? {est:"ok", txt:`fora da conta (art. 20, §§ 9º e 14): ${ls.join("; ")}${nota}`, fonte:r.fonte}
      : {est:"info", txt:"nenhuma renda a excluir (BPC ou benefício de até 1 SM de idoso 65+ ou PcD, estágio, aprendiz, barragem, auxílio-inclusão)", fonte:r.fonte};
  };
  const _bpcDed = x => { const d = _bpcDeducao(x);
    // F235 · o desconto só vale com a negativa do SUS e o relatório do tratamento contínuo juntados ao pedido
    if(d.valor) return {est:"ok", txt:`${d.txt}; junte ao pedido a negativa do SUS de cada gasto e o relatório médico que diz que o tratamento é contínuo, senão o INSS não desconta`, fonte:"campo"};
    if(_n(x, "ren_saude")) return {est:"informar", txt:"o valor livre de gastos com saúde não vale: indique as categorias com documento médico (ren_gastos_cat) ou o gasto real com recibos (ren_gastos_reais)"};
    // F235 · a negativa do SUS no dossiê é o gasto que desconta: falta só marcar o tipo
    const neg = x.c ? docsDoDossie(x.c.id).filter(a=>/negativ/i.test(a.nome||"")) : [];
    if(neg.length) return {est:"informar", txt:`há ${neg.length===1 ? "uma negativa" : `${neg.length} negativas`} do SUS no dossiê (${neg.map(a=>String(a.nome).split(" · ").pop().replace(/\.pdf$/i, "")).join("; ")}): marque o tipo de gasto (remédio, terapia, fralda, dieta, centro-dia) para descontar da renda`, fonte:"dossiê"};
    // F235 · sem resposta: pergunta quando a renda ainda não cabe no limite; cabendo, o desconto não é preciso
    const r = _bpcRenda(x), tab = x.der >= "2026-09-30" ? [56,110,120,147,40] : [45,90,99,121,32];
    if(!r.erro && r.pc <= r.lim + 1e-9) return {est:"info", txt:"a renda já cabe no limite sem desconto: os gastos de saúde que o SUS não dá só contam se a conta passar"};
    return {est:"informar", txt:`gastam todo mês com remédio, consulta ou terapia, fralda, dieta especial ou centro-dia que o SUS não dá? Com a receita e a negativa por escrito do SUS, cada tipo desconta um valor fixo: remédio ${moedaBR(tab[0])}, consulta ou terapia ${moedaBR(tab[1])}, fralda ${moedaBR(tab[2])}, dieta ${moedaBR(tab[3])}, centro-dia ${moedaBR(tab[4])}; escreva os tipos no campo`};
  };
  const _bpcCad = x => { const cad = x.cad;
    if(!cad){ const f = x.v.ren_cad;
      return f==="Sim" ? {est:"ok", txt:"CadÚnico atualizado nos últimos 24 meses (informado)", fonte:"campo"}
        : f==="Não" ? {est:"falta", txt:"CadÚnico desatualizado ou ausente: inscrever ou atualizar no CRAS antes do pedido (o INSS abre exigência de 30 dias)", fonte:"campo"}
        : {est:"informar", txt:"o dossiê não traz o CadÚnico: informe se está atualizado nos últimos 24 meses"}; }
    const at = isoBr(String(cad.atualizada_em||"").slice(0,10)), est = String(cad.estado_cadastral||"");
    if(/exclu|cancel|sem registro/i.test(est)) return {est:"falta", txt:`estado cadastral "${est}": regularizar no CRAS`, fonte:"CadÚnico"};
    if(!at) return {est:"informar", txt:"o CadÚnico não traz a data da última atualização", fonte:"CadÚnico"};
    if(at < somarMeses(x.der, -24) || /desatualiz/i.test(cad.condicao||""))
      return {est:"falta", txt:`atualizado em ${fmtBarra(at)}, há mais de 24 meses da DER (${fmtBarra(x.der)}): atualizar no CRAS antes do pedido`, fonte:"CadÚnico"};
    return {est:"ok", txt:`atualizado em ${fmtBarra(at)}, vale até ${fmtBarra(somarMeses(at, 24))}${est ? `; estado ${est}` : ""}; confira se o CPF está regular`, fonte:"CadÚnico", quando: somarMeses(at, 24)};
  };
  const _bpcBio = x => x.v.bpc_biometria==="Sim" ? {est:"ok", txt:"biometria cadastrada (CIN, título de eleitor ou CNH), do requerente ou do responsável legal", fonte:"campo"}
    : x.v.bpc_biometria==="Não" ? {est:"falta", txt:"sem biometria: cadastrar (CIN, título de eleitor ou CNH) antes do pedido", fonte:"campo"}
    : {est:"informar", txt: x.idade!=null && x.idade < 16 ? `${x.idade} anos: quem assina o pedido, a procuração e o contrato é o responsável${_respTxt(x)}; a biometria pode ser a da criança ou, se ela não tiver, a do responsável (LOAS, art. 20, § 12-B). Informe se há biometria (CIN, título de eleitor ou CNH)` : "informe se há biometria cadastrada (CIN, título de eleitor ou CNH)"};
  // F235 · o responsável do menor que pede: a responsável familiar do CadÚnico, a confirmar
  const _respTxt = x => { const rf = ((x.cad||{}).membros||[]).find(m=>m.responsavel || /respons/i.test(m.parentesco||""));
    return rf && String(rf.nascimento||"").slice(0,10)!==x.dn ? ` (no CadÚnico, ${_primeiro(rf.nome)}, a responsável familiar)` : ""; };
  // F235 · o Bolsa Família acumula com o BPC, mas o pedido pode trazer o termo de saída do programa
  const _bolsaTxt = x => { const bf = ((x.cad||{}).beneficios_pagos||[]).find(b=>/bolsa\s*fam/i.test(`${b.tipo||""} ${b.especie||""}`) && String(b.ultima_competencia||"").replace(/\D/g,"").slice(0,6) >= ymDe(somarMeses(x.der, -3)).replace("-",""));
    return bf ? `; a família recebe Bolsa Família (${moedaBR(_num(bf.valor_ultimo)||0)}): a lei deixa receber junto (LOAS, art. 20, § 4º), mas o INSS pode pedir, no pedido, que a família concorde em sair do Bolsa Família (IN 54/SENARC/MDS/2026, só na skill: conferir); se o BPC for negado, a família pode ficar sem os dois: não assine esse termo sem falar com o advogado` : ""; };
  const _bpcRes = x => x.v.bpc_brasil==="Sim" ? {est:"ok", txt:"brasileiro ou estrangeiro regular, morando no Brasil", fonte:"campo"}
    : x.v.bpc_brasil==="Não" ? {est:"impedido", txt:"o BPC exige nacionalidade brasileira (ou estrangeiro regular) e residência no Brasil", fonte:"campo"}
    : {est:"informar", txt: (x.cad||{}).municipio ? `mora em ${x.cad.municipio} (CadÚnico): confirme a nacionalidade` : "informe a nacionalidade e a residência no Brasil"};
  const _nomeB = b => `${/^\d+$/.test(b.especie) ? `B${b.especie}` : b.especie}${b.nb ? ` (NB ${b.nb})` : ""}`;
  const _ativos = x => { const bs = (x.benefCnis||[]).filter(b=>b.ativo && !/CESSAD|INDEFER|SUSPENS/i.test(b.situacao||""));
    if(x.apos && !bs.some(b=>b.nb && b.nb===x.apos.nb)) bs.push({especie:x.apos.especie, nb:x.apos.nb});
    return bs; };
  // Bolsa Família, pensão indenizatória e assistência médica acumulam com o BPC (art. 20, § 4º): no campo, não contam como outro benefício
  const _bpcOutro = x => { const bs = _ativos(x), f = String(x.v.bpc_outro_benef||"").trim(), temF = !!f && !/^(n[aã]o|nenhum|nada)\b/i.test(f) && !/bolsa|indeniza|assist[eê]ncia m[eé]dica/i.test(f);
    if(bs.length || temF) return {est:"opcao", txt:`recebe ${[...bs.map(_nomeB), ...(temF ? [f] : [])].join(", ")}: não acumula com o BPC (art. 20, § 4º); compare os valores e escolha`, fonte: bs.length ? "CNIS" : "campo"};
    if(x.g || f) return {est:"ok", txt:`nenhum benefício da seguridade ou de outro regime em manutenção (Bolsa Família e pensão indenizatória podem)${_bolsaTxt(x)}`, fonte: x.g ? "CNIS" : "campo"};
    return {est:"informar", txt:"o CNIS não foi lido: informe se recebe outro benefício (bpc_outro_benef)"}; };
  const _trabalha = x => x.v.ren_trabalha==="Sim" || !!(((x.g||{}).vinculos||[]).some(v=>v.aberto && !v.fim && v.tipo!=="Benefício"));
  const _CAMPOS_BPC = {
    ren_fora_nomes:["Quem mora na casa mas não entra na conta: filho ou enteado casado, divorciado ou viúvo (nomes, separados por vírgula)", "text"],
    ren_filhos_solteiros:["Os filhos e enteados adultos da casa são todos solteiros", "select", SN],
    ren_aprendiz:["Quem tem salário e é aprendiz ou estagiário (nomes; o salário sai da conta)", "text"],
    ren_excluida:["Renda a excluir que o CadÚnico do dossiê não separa (BPC ou benefício de até 1 SM de idoso 65+ ou PcD, estágio, aprendiz, barragem, auxílio-inclusão), em R$", "number"],
    ren_total:["Renda do mês do grupo, com o Bolsa Família, antes dos descontos e sem a aposentadoria ou o BPC de até 1 salário mínimo de outro idoso (65+) ou pessoa com deficiência da casa (R$)", "number"],
    ren_pessoas:["Pessoas do grupo da LOAS (requerente, cônjuge, pais, filhos, enteados e irmãos solteiros, tutelados, sob o mesmo teto)", "number"],
    ren_gastos_cat:["Gastos de todo mês que o SUS não dá, com receita e negativa por escrito: escreva os tipos (remédio, consulta ou terapia, fralda, dieta especial, centro-dia)", "text"],
    ren_gastos_reais:["Gasto real com saúde comprovado por recibos dos 12 meses anteriores ao pedido, em R$", "number"],
    bpc_biometria:["Biometria cadastrada (CIN, título ou CNH) do requerente ou do responsável legal", "select", SN],
    bpc_outro_benef:["Recebe outro benefício da seguridade ou de outro regime (qual)", "text"],
    bpc_brasil:["Brasileiro (nato ou naturalizado) ou estrangeiro regular, morando no Brasil", "select", SN],
  };
  const _BASE_RENDA = "LOAS, art. 20, §§ 1º, 3º e 3º-A; Decreto 6.214, Anexo, art. 4º, IV a VI (red. Decreto 12.534/2025); Portaria Conjunta 34/2025, arts. 8º e 11, §§ 1º e 2º";
  // F235 · o relatório do médico responde o impedimento do BPC (longo prazo, tipo, CID, desde quando e as barreiras),
  // como presumido, com a fonte; só no BPC da pessoa com deficiência (a LC 142 tem a DID própria)
  const _defRel = x => { if(x.op!=="def") return null;
    for(const i of (x.clin||[]).filter(i=>i.tipo==="Relatório" && i.anexo && i.anexo.texto).sort((a, b)=>String(b.data).localeCompare(String(a.data)))){
      const t = desfazFonteHc(i.anexo.texto).replace(/\s+/g, " "), fonte = `relatório${/^HC/i.test(i.fonte||"") ? " do HC" : ""} de ${fmtBarra(i.data)}`;
      const perm = /permanente|irrevers[íi]vel|irrecuper[áa]vel/i.test(t), longo = perm || /longo prazo|cegueira legal|progressiv/i.test(t);   // F235 · "tempo indeterminado" e "sem previsão de alta" não dizem 2 anos
      const ano = (t.match(/(?:cegueira|surdez|defici[êe]ncia|impedimento)[^.]{0,40}?desde (?:o ano de )?((?:19|20)\d{2})/i) || t.match(/(?:acompanhad[oa]|em acompanhamento|em tratamento)[^.]{0,60}?desde ((?:19|20)\d{2})/i) || [])[1] || "";
      const bar = (t.match(/[^.]*\b(?:acompanhante|transporte|mediador|n[ãa]o l[êe]|precisa de ajuda|depende de|cadeira de rodas|n[ãa]o consegue)\b[^.]*\./gi) || []).map(s=>s.trim()).slice(0, 2).join(" ");
      const cid = (i.cids||[])[0] || "";
      if(longo || cid) return {fonte, perm, longo, ano, bar, cid, tipo: /^H/.test(cid) ? "Sensorial" : /^F7\d/.test(cid) ? "Intelectual" : ""};
    }
    return null; };
  const _didAntigo = PRE_DOSSIE.def_did;
  Object.assign(PRE_DOSSIE, {
    def_longo: x => { const d = _defRel(x); return d && d.longo ? {val:"Sim", perm:d.perm, fonte:`${d.fonte}: ${d.perm ? "impedimento permanente" : "condição de longo prazo"}; a perícia do INSS confirma`} : null; },
    def_cid: x => { const d = _defRel(x); return d && d.cid ? {val:d.cid, fonte:d.fonte} : null; },
    def_tipo: x => { const d = _defRel(x); return d && d.tipo ? {val:d.tipo, fonte:`${d.fonte}: CID ${d.cid}`} : null; },
    def_did: x => { const d = _defRel(x); return d && d.ano ? {val:d.ano, fonte:`${d.fonte}: desde ${d.ano}`} : _didAntigo(x); },
    def_barreiras: x => { const d = _defRel(x); return d && d.bar ? {val:fraseClinica(d.bar).replace(/\.\s*$/, "").replace(/^./, s=>s.toLowerCase()), fonte:d.fonte} : null; },
    // F235 · "jovem aprendiz" no relato e um só jovem com salário no CadÚnico: o salário dele sai da conta
    ren_aprendiz: x => { if(!_opDep(x, /^(def|idoso)$/) || !x.cad || !x.c) return null;
      const r = relatoDe(x.c); if(!/aprendiz|estagi[áa]ri/i.test(r)) return null;
      const rc = x.cad.renda_cnis || [], sal = m => { const q = rc.find(k=>_nm(k.nome)===_nm(m.nome)) || {}, d = q.declarado || {}; return Math.max(_num(q.remuneracao_ultimo_mes)||0, _num(d.remuneracao_mes_anterior)||0); };
      const idM = m => m.nascimento ? idadeEm(String(m.nascimento).slice(0,10), x.der) : null;
      let cs = (x.cad.membros||[]).filter(m=>String(m.nascimento||"").slice(0,10)!==x.dn && sal(m) > 0 && idM(m)!=null && idM(m) >= 14 && idM(m) < 25);
      if(cs.length > 1){ const id = +((r.match(/(\d{1,2}) anos?[^.]{0,40}(?:aprendiz|estagi)/i) || r.match(/(?:aprendiz|estagi)[^.]{0,40}?(\d{1,2}) anos/i) || [])[1]); if(id) cs = cs.filter(m=>idM(m)===id); }
      return cs.length===1 ? {val:cs[0].nome, fonte:`relato da recepção: ${/aprendiz/i.test(r) ? "jovem aprendiz" : "estagiário"} na casa; confira o contrato`} : null; },
    // F235 · as negativas do SUS no dossiê dizem o tipo de gasto: terapia é consulta e tratamento; remédio é medicamento
    ren_gastos_cat: x => { if(!_opDep(x, /^(def|idoso)$/) || !x.c) return null;
      const neg = docsDoDossie(x.c.id).filter(a=>/negativ|n[ãa]o (?:fornece|oferece)/i.test(`${a.nome} ${String(a.texto||"").slice(0, 800)}`) && /sus|sa[úu]de|farm[áa]cia|secretaria|prefeitura/i.test(`${a.nome} ${String(a.texto||"").slice(0, 400)}`));
      const cats = new Set();
      for(const a of neg){ const t = `${a.nome} ${a.texto||""}`;
        if(/medicament|rem[ée]dio|farm[áa]cia|\d\s?mg\b/i.test(t)) cats.add("medicamentos");
        if(/terapia|consulta|tratamento|fonoaud|fisioter|psicol/i.test(t)) cats.add("consultas e tratamentos");
        if(/fralda/i.test(t)) cats.add("fraldas"); if(/dieta|alimenta[çc][ãa]o especial|f[óo]rmula|leite especial/i.test(t)) cats.add("alimentação especial"); if(/centro[- ]dia/i.test(t)) cats.add("centro-dia"); }
      return cats.size ? {val:[...cats].join(", "), fonte:`${neg.length===1 ? "negativa" : `${neg.length} negativas`} do SUS no dossiê (${neg.map(a=>String(a.nome).split(" · ").pop().replace(/\.pdf$/i, "")).join("; ")}); confira o tipo de cada gasto`} : null; },
    // F235 · o filho adulto que o relato diz não ser solteiro sai do grupo (só filho solteiro entra)
    ren_fora_nomes: x => { if(!_opDep(x, /^(def|idoso)$/) || !x.cad || !x.c) return null;
      const r = relatoDe(x.c), m = r.match(/\b(filh[oa]|entead[oa])\b[^.;]{0,40}?\b(divorciad[oa]|separad[oa]|vi[úu]v[oa]|casad[oa])\b/i); if(!m) return null;
      const ms = x.cad.membros||[], eu = ms.find(k=>String(k.nascimento||"").slice(0,10)===x.dn); if(!eu || !/^(rf|conj)$/.test(_bpcRel(eu.parentesco))) return null;
      const ad = ms.filter(k=>k!==eu && /^(filh|entead)/i.test(k.parentesco||"") && k.nascimento && idadeEm(String(k.nascimento).slice(0,10), x.der) >= 18);
      return ad.length===1 ? {val:ad[0].nome, fonte:`relato da recepção: o ${m[1].toLowerCase()} é ${m[2].toLowerCase()}; confira na certidão de casamento com a averbação`} : null; },
  });
  // F235 · o desfecho do BPC diz por que pedir já, quanto, o que vem depois e o que juntar; o "agora" dá os passos
  const _bpcDesf = (x, a, ve) => {
    if(!ve || ve.tom==="nao" || (ve.tom==="ainda" && ["risco","falta"].includes(a.pior))) return null;
    const r = _bpcRenda(x), junta = [];
    if(x.op==="def") junta.push("o relatório médico");
    if(r.ded && r.ded.valor) junta.push("as negativas do SUS de cada gasto");
    if((r.excl||[]).some(t=>/aprendiz/.test(t))) junta.push("o contrato de aprendizagem ou o termo de estágio");
    if((r.tirados||[]).length) junta.push(`a certidão de casamento com a averbação de ${r.tirados.map(m=>_primeiro(m.nome)).join(" e ")}`);
    return {acao:"caso", txt:`gere o caso e peça já: o BPC é pago desde a data do pedido, e cada mês de espera se perde; é de 1 salário mínimo (${moedaBR(smEm(x.der))}), sem 13º e sem deixar pensão${x.op==="def" ? "; depois do pedido, o INSS marca a perícia médica e a avaliação social" : ""}${junta.length ? `; junte ${junta.join(", ")}` : ""}${r.bolsa ? "; a família recebe Bolsa Família: não assine o termo de saída do programa sem falar com o advogado (IN 54/SENARC/MDS/2026, conferir)" : ""}`};
  };
  const _bpcAgora = x => { const r = _bpcRenda(x), out = ["Pedir já: o BPC é pago desde a data do pedido, e cada mês de espera se perde."];
    if(r.erro) return out;
    if((r.tirados||[]).length) out.push(`Atualizar o CadÚnico no CRAS informando que ${r.tirados.map(m=>_primeiro(m.nome)).join(" e ")} não é solteiro, antes do pedido, e levar a certidão de casamento com a averbação.`);
    if(r.ded && r.ded.valor) out.push("Juntar ao pedido as negativas do SUS e o relatório médico que diz que o tratamento é contínuo.");
    if((r.excl||[]).some(t=>/aprendiz/.test(t))) out.push("Juntar o contrato de aprendizagem ou o termo de estágio de quem ganha como aprendiz.");
    if(r.bolsa) out.push("Explicar o Bolsa Família antes de protocolar: o INSS pode pedir a concordância com a saída do programa (IN 54/SENARC/MDS/2026, conferir); não assinar sem o advogado.");
    return out; };
  // F235 · a conta do BPC para o Primeiro atendimento (quadro do CadÚnico): a mesma da Análise de Direito
  window.bpcContaDe = c => { try{ const op = (idadeDe(c.dn)||0) >= 65 ? "idoso" : "def", x = reqCtx(c, D.casosDoCliente.get(c.id)||[], op), r = _bpcRenda(x);
    return r.erro ? null : r; }catch(e){ return null; } };

  // ── def · BPC da pessoa com deficiência (B87) ────────────────────────────
  registrarReq("def", [
    {id:"deficiencia_longo_prazo", rot:"Tem uma deficiência que dura ou deve durar 2 anos ou mais e, com as barreiras do dia a dia, atrapalha a vida em sociedade?",
     base:"Lei 8.742/93 (LOAS), art. 20, §§ 2º e 10; Decreto 6.214/2007, Anexo, art. 4º, II, e art. 16, §§ 5º e 6º", conf:"conferido",
     campos:["def_longo","def_tipo","def_did","def_cid","def_barreiras"],
     mede:x=>{ const v = x.v, nl = (x.fd.laudos||[]).length;
       const extra = (x.idade!=null && x.idade < 16 ? "; menor de 16: avalia-se a atividade compatível com a idade, sem o trabalho (Decreto 6.214, art. 4º, § 1º)" : "")
         + (x.idade!=null && x.idade >= 65 ? "; com 65 anos, pode pedir o BPC do idoso, sem avaliação (só na skill)" : "");
       if(v.def_longo==="Não") return {est:"falta", txt:`impedimento de menos de 2 anos não dá o BPC (art. 20, § 10); se a duração não é previsível mas pode ser longa, cabe o pedido${extra}`, fonte:"campo"};
       if(v.def_longo!=="Sim") return {est:"informar", txt:`informe se o impedimento dura ou deve durar 2 anos ou mais${nl ? ` (${nl} ${nl===1?"laudo":"laudos"} no dossiê)` : ""}${extra}`};
       // F235 · a DID só com o ano (do relatório), o relatório não dispensa a perícia, o permanente dispensa a revisão periódica
       const did = v.def_did ? (/^\d{4}$/.test(v.def_did) ? v.def_did : fmtBarra(v.def_did)) : "", perm = ((x.preUsado||{}).def_longo||{}).perm && !(x.vDig||{}).def_longo
         ? "; impedimento permanente pelo relatório: depois de concedido, fica dispensado da perícia periódica (LOAS, art. 21, § 5º, red. Lei 15.157/2025)" : "";
       return {est:"ok", txt:`impedimento de longo prazo${v.def_tipo ? ` (${v.def_tipo.toLowerCase()})` : ""}${v.def_cid ? `, CID ${v.def_cid}` : ""}${did ? `, desde ${did}` : ""}; ${v.def_barreiras ? `barreiras: ${v.def_barreiras}` : "descreva as barreiras (def_barreiras)"}; não exige incapacidade para o trabalho; o relatório não dispensa a perícia médica e a avaliação social do INSS, feitas depois do pedido${perm}${extra}`, fonte:"campo"}; }},
    {id:"avaliacao_biopsicossocial", rot:"Já passou pela perícia médica e pela avaliação social do INSS? Qual foi o resultado?",
     base:"LOAS, art. 20, §§ 2º-A e 6º; Decreto 6.214, Anexo, art. 16, §§ 1º a 3º-A (red. Decreto 12.534/2025); Portaria Conjunta MDS/INSS 34/2025, art. 11, I", conf:"conferido",
     campos:["def_avaliacao","def_laudo"],
     mede:x=>{ const a = x.v.def_avaliacao, inst = "instrumento próprio do BPC, baseado na CIF (não é o IFBrM nem o grau da LC 142)";
       if(a==="Deficiência reconhecida") return {est:"ok", txt:`perícia médica e avaliação social reconheceram o impedimento (${inst})`, fonte:"campo"};
       if(a==="Deficiência não reconhecida") return {est:"falta", txt:"a avaliação do INSS não reconheceu o impedimento: recurso ou novo pedido, com laudo novo", fonte:"campo"};
       const neg = (x.fd.processos||[]).flatMap(p=>(p.comunicacoes||[]).map(cm=>({...cm, p})))
         .find(cm=>/indefer/i.test(cm.decisao||"") && /impediment|defici[eê]n|avalia[cç][aã]o (social|m[eé]dica)/i.test(cm.motivo||""));
       if(neg) return {est:"falta", txt:`pedido de ${neg.p.entrada || "data não lida"} indeferido: ${neg.motivo}`, fonte:"comunicação de decisão"};
       if(a==="Ainda não feita") return {est:"info", txt:`feita pelo INSS depois do pedido: perícia médica e avaliação social, ${inst}; ${x.v.def_laudo==="Sim" ? "leve o laudo com domínios e barreiras" : "prepare laudo com CID, início e prognóstico"}`};
       // F235 · nenhum pedido ao INSS no dossiê: a avaliação ainda não houve; vem depois do pedido
       if(!a && x.c && (x.c.dossie||{}).meuinss && !x.c.dossie.meuinss.parcial && !(x.fd.processos||[]).length) return {est:"info", txt:`nenhum pedido ao INSS no dossiê: a perícia médica e a avaliação social são marcadas depois do pedido (${inst}); leve o relatório médico com CID, início e prognóstico`};
       return {est:"informar", txt:`informe se a avaliação já foi feita e o resultado (${inst})`}; }},
    {id:"renda_per_capita", rot:"A renda da família, dividida pelas pessoas da casa que a lei conta, é de até 1/4 do salário mínimo?",
     base:_BASE_RENDA, conf:"conferido", campos:["ren_pessoas","ren_total","ren_fora_nomes","ren_filhos_solteiros","ren_aprendiz","der"],
     mede:x=>_bpcPc(x, ()=>"; pesam o grau da deficiência e os gastos")},
    {id:"exclusoes_renda", rot:"Há renda que a lei manda deixar fora da conta (BPC ou benefício de até 1 salário mínimo de outro idoso ou PcD da casa, estágio, aprendiz, barragem)?",
     base:"LOAS, art. 20, §§ 9º e 14; Decreto 6.214, Anexo, art. 4º, § 2º, III e VI a X; Portaria Conjunta 34/2025, art. 8º, I, 'a' a 'f', e §§ 1º e 2º", conf:"conferido",
     campos:["ren_excluida"], mede:_bpcExcl},
    {id:"deducao_saude", rot:"A família tem gastos de saúde que o SUS não fornece (remédio, consulta, fralda, dieta especial, centro-dia)?",
     base:"LOAS, art. 20-B, III e § 4º; Portaria Conjunta 34/2025, art. 8º, §§ 4º a 7º; Anexo I na redação da Portaria Conjunta MDS/INSS 45/2026", conf:"conferido",
     campos:["ren_gastos_cat","ren_gastos_reais"], mede:_bpcDed},
    {id:"cadunico", rot:"A família está no CadÚnico, com os dados atualizados nos últimos 24 meses, e o CPF está regular?",
     base:"LOAS, art. 20, § 12; Decreto 6.214, Anexo, art. 12, caput e § 2º (red. Decreto 12.534/2025); Portaria Conjunta 34/2025, art. 6º, III e IV, e § 4º", conf:"conferido",
     campos:["ren_cad"], mede:_bpcCad},
    {id:"biometria", rot:"Tem biometria cadastrada (identidade nova CIN, título de eleitor ou CNH), ou a do responsável legal?",
     base:"LOAS, art. 20, §§ 12-A e 12-B; Decreto 6.214, Anexo, art. 12; Portaria Conjunta 34/2025, art. 6º, V e § 1º", conf:"conferido",
     campos:["bpc_biometria"], mede:_bpcBio},
    {id:"nacionalidade_residencia", rot:"É brasileiro (ou estrangeiro em situação regular) e mora no Brasil?",
     base:"Portaria Conjunta 34/2025, art. 6º, I e II, e § 2º, II", conf:"conferido", campos:["bpc_brasil"], mede:_bpcRes},
    {id:"sem_outro_beneficio", rot:"Recebe aposentadoria, pensão, auxílio ou outro benefício do INSS ou de outro regime? (Bolsa Família pode)",
     base:"LOAS, art. 20, § 4º (red. Lei 14.601/2023)", conf:"conferido", campos:["bpc_outro_benef"], mede:_bpcOutro},
    {id:"trabalho_pcd", rot:"Trabalha, com carteira, por conta própria ou como MEI?",
     base:"LOAS, art. 21-A e §§ 1º e 2º; art. 20, § 9º", conf:"conferido", campos:["ren_trabalha"],
     mede:x=>{ const t = _trabalha(x), b87 = (x.benefCnis||[]).find(b=>b.ativo && b.especie==="87");
       if(t && b87) return {est:"risco", txt:`já recebe o BPC${b87.nb ? ` (NB ${b87.nb})` : ""} e trabalha: o pagamento fica suspenso enquanto houver remuneração, inclusive como MEI (art. 21-A); ao parar, volta sem nova perícia; como aprendiz, recebe os dois por até 2 anos (§ 2º)`, fonte:"CNIS"};
       if(t) return {est:"info", txt:"na concessão, a remuneração entra na renda do grupo, salvo estágio e aprendizagem (art. 20, § 9º); a suspensão do art. 21-A vale só para o BPC já concedido", fonte: x.v.ren_trabalha==="Sim" ? "campo" : "CNIS"};
       // F235 · a criança não trabalha: antes dos 14 anos o trabalho é proibido
       if(x.idade!=null && x.idade < 14) return {est:"ok", txt:`${x.idade} anos: não trabalha (antes dos 14 anos o trabalho é proibido)`, fonte:"ficha"};
       if(x.v.ren_trabalha==="Não") return {est:"ok", txt:"não exerce atividade remunerada", fonte:"campo"};
       return {est:"informar", txt:"informe se exerce atividade remunerada (ren_trabalha)"}; }},
  ], {..._CAMPOS_BPC,
    def_barreiras:["Barreiras do dia a dia (urbanística, arquitetônica, transporte, comunicação, atitudinal, tecnológica)", "text"],
    def_avaliacao:["Perícia médica e avaliação social do INSS (resultado)", "select", ["","Ainda não feita","Deficiência reconhecida","Deficiência não reconhecida"]],
  }, {resumo:"Paga 1 salário mínimo à pessoa com deficiência de longo prazo (2 anos ou mais), avaliada pelo INSS, cuja família tem renda por pessoa de até 1/4 do salário mínimo, inscrita e atualizada no CadÚnico e com biometria. Não exige contribuição nem qualidade de segurado. Não é aposentadoria: não paga 13º e não deixa pensão (Decreto 6.214, Anexo, arts. 22 e 23); é revisto a cada 2 anos (LOAS, art. 21).",
    quando: x=>null, desfecho:_bpcDesf, agora:_bpcAgora});

  // ── idoso · BPC do idoso (B88) ───────────────────────────────────────────
  registrarReq("idoso", [
    {id:"idade_65", rot:"Tem 65 anos ou mais na data do pedido?",
     base:"LOAS, art. 20, caput; Decreto 6.214, Anexo, art. 4º, I; Portaria Conjunta 34/2025, art. 11, I", conf:"conferido", campos:["der"],
     mede:x=>{ if(!x.dn || x.idade==null) return {est:"informar", txt:"sem a data de nascimento na ficha"};
       const em = somarAnos(x.dn, 65);
       return x.idade >= 65 ? {est:"ok", txt:`${x.idade} anos na DER (${fmtBarra(x.der)}); 65 desde ${fmtBarra(em)}`, fonte:"ficha"}
         : {est:"falta", txt:`${x.idade} anos na DER (${fmtBarra(x.der)}); completa 65 em ${fmtBarra(em)}`, fonte:"ficha", quando:em}; }},
    {id:"renda_per_capita", rot:"A renda da família, dividida pelas pessoas da casa que a lei conta, é de até 1/4 do salário mínimo?",
     base:"LOAS, art. 20, §§ 1º, 3º e 3º-A, e art. 20-B; Portaria Conjunta 34/2025, arts. 8º e 11, §§ 1º e 2º", conf:"conferido", campos:["ren_pessoas","ren_total","ren_fora_nomes","ren_filhos_solteiros","ren_aprendiz","der","bpc_terceiros"],
     mede:x=>_bpcPc(x, x=>x.v.bpc_terceiros==="Sim" ? "; conta a dependência de terceiros nas atividades básicas (art. 20-B, II)" : "; pesam a dependência de terceiros (art. 20-B, II) e os gastos com saúde")},
    {id:"exclusoes_renda", rot:"Há renda que a lei manda deixar fora da conta (BPC ou benefício de até 1 salário mínimo do marido, da esposa ou de outro idoso ou PcD da casa, estágio, aprendiz)?",
     base:"LOAS, art. 20, §§ 9º e 14; Decreto 6.214, Anexo, art. 4º, § 2º; Portaria Conjunta 34/2025, art. 8º, I e § 1º", conf:"conferido",
     campos:["ren_excluida"], mede:_bpcExcl},
    {id:"deducao_saude", rot:"O idoso tem gastos de saúde que o SUS não fornece (remédio, consulta, fralda, dieta especial, centro-dia)?",
     base:"LOAS, art. 20-B, III; Portaria Conjunta 34/2025, art. 8º, §§ 4º a 7º; Portaria Conjunta 45/2026", conf:"conferido",
     campos:["ren_gastos_cat","ren_gastos_reais"], mede:_bpcDed},
    {id:"cadunico", rot:"Está no CadÚnico, com os dados atualizados nos últimos 24 meses, e o CPF está regular?",
     base:"LOAS, art. 20, § 12; Decreto 6.214, Anexo, art. 12, § 2º; Portaria 34/2025, art. 6º, III e IV", conf:"conferido", campos:["ren_cad"], mede:_bpcCad},
    {id:"biometria", rot:"Tem biometria cadastrada (identidade nova CIN, título de eleitor ou CNH), ou a do responsável legal?",
     base:"LOAS, art. 20, §§ 12-A e 12-B; Portaria 34/2025, art. 6º, V", conf:"conferido", campos:["bpc_biometria"], mede:_bpcBio},
    {id:"nacionalidade_residencia", rot:"É brasileiro (ou estrangeiro em situação regular) e mora no Brasil?",
     base:"Portaria Conjunta 34/2025, art. 6º, I e II", conf:"conferido", campos:["bpc_brasil"], mede:_bpcRes},
    {id:"sem_outro_beneficio", rot:"Recebe aposentadoria, pensão ou outro benefício do INSS ou de outro regime? (Bolsa Família pode)",
     base:"LOAS, art. 20, § 4º", conf:"conferido", campos:["bpc_outro_benef"], mede:_bpcOutro},
    // F235 · quem pergunta "aposentar ou LOAS?": a aposentadoria por idade, pelo CNIS, antes do BPC
    {id:"aposentadoria_alternativa", rot:"Há caminho melhor pelo INSS (aposentadoria por idade)?", base:"IN 128/2022, art. 199, II (180 contribuições); LOAS, art. 20, § 4º", conf:"conferido", campos:[],
     mede:x=>{ const n = x.ct ? x.ct.carencia : null;
       if(n==null) return {est:"info", txt:"o CNIS não foi lido: confira as contribuições antes de deixar de lado a aposentadoria por idade"};
       return n >= 180 ? {est:"info", txt:`tem ${n} contribuições: pode ter a aposentadoria por idade, que paga 13º e deixa pensão; compare antes do BPC (os dois não se acumulam)`, fonte:"CNIS"}
         : {est:"info", txt:`tem ${n} das 180 contribuições da aposentadoria por idade: não alcança; o BPC é o caminho`, fonte:"CNIS"}; }},
    {id:"trabalho_idoso", rot:"Ainda trabalha ou tem alguma renda de trabalho?",
     base:"LOAS, arts. 20, § 3º-A, e 21-A; Decreto 6.214, Anexo, art. 4º, VI", conf:"conferido", campos:["ren_trabalha"],
     mede:x=>_trabalha(x) ? {est:"info", txt:"o que o idoso ganha trabalhando entra na renda do grupo (art. 20, § 3º-A)", fonte: x.v.ren_trabalha==="Sim" ? "campo" : "CNIS"}
       : x.v.ren_trabalha==="Não" ? {est:"ok", txt:"não exerce atividade remunerada", fonte:"campo"}
       : {est:"informar", txt:"informe se exerce atividade remunerada (ren_trabalha)"}},
  ], {..._CAMPOS_BPC, bpc_terceiros:["Depende de terceiros para as atividades básicas da vida diária (art. 20-B, II)", "select", SN]},
  {resumo:"Paga 1 salário mínimo a quem tem 65 anos ou mais e cuja família tem renda por pessoa de até 1/4 do salário mínimo, com CadÚnico atualizado e biometria. Não precisa de perícia nem de contribuição. Não é aposentadoria: não paga 13º e não deixa pensão (Decreto 6.214, Anexo, arts. 22 e 23); é revisto a cada 2 anos (LOAS, art. 21).",
   quando: x=>x.dn ? somarAnos(x.dn, 65) : null, desfecho:_bpcDesf, agora:_bpcAgora});

  // ── pensão e reclusão: o instituidor (ou o recluso), nunca o CNIS do cliente ──
  // a qualidade na data do fato, pelos campos ins_*; art102 = a saída do art. 102, § 2º (só na pensão)
  function _insQual(x, fato, oque, art102){
    const v = x.v;
    if(!fato) return {est:"informar", txt:"informe a data do fato (dep_fato)"};
    const ben = String(v.ins_beneficio||"").trim(), temBen = !!ben && !/^(n[aã]o|nenhum|nada)\b/i.test(ben);
    // o BPC é assistencial: não mantém a qualidade nem gera pensão (Decreto 6.214, Anexo, art. 23)
    const bpc = temBen && _BPC_RX.test(ben);
    if(temBen && !bpc && !/acidente|suplementar|\b(94|95|36)\b/i.test(ben)) return {est:"ok", txt:`recebia ${ben} no ${oque}: qualidade mantida sem limite (art. 15, I; IN 128, art. 184, I)`, fonte:"campo"};
    if(v.ins_aposentado==="Sim") return {est:"ok", txt:`aposentado no ${oque}: qualidade mantida (art. 15, I)`, fonte:"campo"};
    let g = null;
    if(/^\d{4}-\d{2}$/.test(v.ins_ultima_contrib||"")){
      const ult = `${v.ins_ultima_contrib.slice(5)}/${v.ins_ultima_contrib.slice(0,4)}`, fac = v.ins_facultativo==="Sim";
      const base = fac ? 6 : 12 + (v.ins_120==="Sim" ? 12 : 0) + (v.ins_desemprego==="Sim" ? 12 : 0);
      g = {ult, base, ...perdaDaQualidade(competenciaMais(ult, base))};
      if(ymDe(fato) <= v.ins_ultima_contrib) return {est:"ok", txt:`contribuía no ${oque} (última contribuição ${ult})`, fonte:"campo"};
      if(fato <= g.mantidaAte) return {est:"ok", txt:`última contribuição ${ult}; graça de ${g.base} meses, mantida até ${fmtBarra(g.mantidaAte)} (art. 15${v.ins_desemprego==="Sim" ? "; 12 deles pelo desemprego provado com o seguro-desemprego ou o registro no SINE, IN 128, art. 184, § 5º" : ""})`, fonte:"campo"};
    }
    if(art102){
      if(v.ins_direito_apos==="Sim") return {est:"ok", txt:"sem qualidade no óbito, mas já tinha direito a uma aposentadoria (ou ao B32 dentro da graça): art. 102, § 2º", fonte:"campo"};
      const ctb = _n(x, "dep_contrib"), nasc = v.ins_nasc;
      if(nasc && ctb!=null && ctb >= 180){ const ex = v.ins_sexo==="Feminino" ? idadeArt18(anoDe(fato), "F") : 65, em = dataDaIdade(nasc, ex);
        if(em <= fato) return {est:"ok", txt:`${idadeEm(nasc, fato)} anos e ${ctb} contribuições no óbito: tinha direito à aposentadoria por idade, e a perda da qualidade não impede a pensão (art. 102, § 2º; Lei 10.666/2003, art. 3º, § 1º)`, fonte:"campo"};
        if(!v.ins_sexo && dataDaIdade(nasc, 60) <= fato) return {est:"informar", txt:"informe o sexo do instituidor: a idade da aposentadoria decide o art. 102, § 2º"}; }
    }
    if(bpc) return {est:"risco", txt:`recebia BPC no ${oque}: o benefício assistencial não mantém a qualidade de segurado nem gera pensão (Decreto 6.214, Anexo, art. 23); só se, apesar dele, havia qualidade por contribuição${art102 ? " ou direito a aposentadoria (art. 102, § 2º)" : ""}`, fonte:"campo"};
    // F235 · o seguro-desemprego depois do último emprego dá mais 12 meses: a pergunta vem com o efeito
    const sdq = "; pergunte também se ele recebeu seguro-desemprego ou se registrou no SINE depois do último emprego: são mais 12 meses de cobertura (IN 128, art. 184, § 5º)";
    if(!g) return {est:"informar", txt:`o CNIS do dossiê é o de quem pede, não o ${art102 ? "do instituidor (quem morreu)" : "do recluso (o preso)"}: pergunte a última contribuição dele (até quando trabalhou com registro ou pagou o INSS) ou que benefício recebia, e anote abaixo; no pedido, o INSS consulta o CNIS dele${sdq}`};
    return {est:"risco", txt:`sem qualidade no ${oque} (${fmtBarra(fato)}): a graça de ${g.base} meses desde ${g.ult} terminou em ${fmtBarra(g.mantidaAte)}${art102 ? "; só pelo art. 102, § 2º (direito a aposentadoria antes de morrer)" : ""}${v.ins_desemprego ? "" : sdq}`, fonte:"campo"};
  }
  // classe e idade do dependente na data do fato
  function _depClasse(x, fato, oque){
    const v = x.v, cl = v.dep_classe || "", c1 = v.dep_classe1 || "", inv = v.dep_invalido, nasc = dnIso(v.dep_nasc || x.dn || "");
    if(!cl) return {est:"informar", txt:"informe quem pede (dep_classe)"};
    if(!fato) return {est:"informar", txt:"informe a data do fato (dep_fato)"};
    if(/^(Cônjuge|Companheiro)/.test(cl)) return {est:"ok", txt:`${cl.toLowerCase()}: classe 1, concorre com os filhos`, fonte:"campo"};
    if(cl==="Ex-cônjuge com alimentos"){ const al = v.dep_alimentos;
      if(al && al < fato) return {est:"falta", txt:`os alimentos acabaram em ${fmtBarra(al)}, antes do ${oque}`, fonte:"campo"};
      return {est:"ok", txt: al ? `ex-cônjuge com alimentos até ${fmtBarra(al)}: concorre com a classe 1${fato >= CORTE_2019 ? " e recebe pelo prazo que restava (IN 128, art. 373)" : ""}` : "ex-cônjuge com alimentos sem prazo: concorre com a classe 1 (art. 76, § 2º)", fonte:"campo"}; }
    if(cl==="Pais" || cl==="Irmão"){
      if(!c1) return {est:"informar", txt:"informe se há dependente de classe anterior com direito (dep_classe1)"};
      if(c1!=="Nenhum" && !(cl==="Pais" && c1==="Pai ou mãe")) return {est:"impedido", txt:`há ${c1.toLowerCase()} com direito: ${cl==="Pais" ? "os pais ficam" : "o irmão fica"} de fora (art. 16, § 1º)`, fonte:"campo"};
      if(cl==="Pais") return {est:"ok", txt:"classe 2, sem cônjuge, companheiro ou filho com direito", fonte:"campo"};
    }
    if(nasc && nasc > fato) return {est:"ok", txt:`nasceu em ${fmtBarra(nasc)}, depois do ${oque}: dependente desde o nascimento`, fonte:"campo"};
    if(/inválido/.test(cl) || inv){
      if(!inv) return {est:"informar", txt:"informe o início da invalidez ou da deficiência (dep_invalido)"};
      if(inv > fato) return {est:"falta", txt:`a invalidez ou deficiência começou em ${fmtBarra(inv)}, depois do ${oque}`, fonte:"campo"};
      if(nasc && inv >= somarAnos(nasc, 21)) return {est:"risco", txt:`invalidez ou deficiência desde ${fmtBarra(inv)}, depois dos 21 anos: o INSS exige o início antes da perda da condição de dependente (IN 128, art. 178)`, fonte:"campo"};
      return {est:"ok", txt:`inválido ou com deficiência desde ${fmtBarra(inv)}, antes do ${oque}; prova por perícia ou avaliação biopsicossocial`, fonte:"campo"};
    }
    const id = nasc ? idadeEm(nasc, fato) : null;
    if(id==null) return {est:"informar", txt:"informe o nascimento do dependente (dep_nasc)"};
    if(id < 21) return {est:"ok", txt:`${id} anos no ${oque}: menor de 21${cl==="Irmão" ? "; classe 3, sem pais nem classe 1" : ""} (o emancipado perde a condição)`, fonte:"campo"};
    return {est:"falta", txt:`${id} anos no ${oque}: filho, equiparado ou irmão só até 21, salvo inválido ou com deficiência`, fonte:"campo"};
  }
  // duas provas materiais, uma dos 24 meses antes do fato (fato desde 18/01/2019)
  function _provas(x, fato, oque){
    const t = _n(x, "dep_provas_total"), q = _n(x, "dep_provas_24m") || 0;
    if(!fato) return {est:"informar", txt:"informe a data do fato (dep_fato)"};
    // antes da Lei 13.846/2019, o Decreto 3.048, art. 22, § 3º (red. Decreto 3.668/2000), pedia no mínimo três documentos, sem a janela dos 24 meses
    if(fato < CORTE_2019){ const dec = "Decreto 3.048, art. 22, § 3º, red. Decreto 3.668/2000";
      if(t==null) return {est:"informar", txt:`informe quantos documentos há: ${oque} antes de 18/01/2019, o INSS pedia no mínimo três (${dec})`};
      if(t >= 3) return {est:"ok", txt:`${t} documentos; ${oque} antes de 18/01/2019: o ${dec} pedia no mínimo três, sem a janela dos 24 meses`, fonte:"campo"};
      return {est:"risco", txt:`${t} ${t===1 ? "documento" : "documentos"}; ${oque} antes de 18/01/2019: o ${dec} pedia no mínimo três; completar por justificação administrativa ou, em juízo, pela Súmula 63/TNU, que dispensa a prova material da união (só na skill)`, fonte:"campo"}; }
    // F235 · a janela dos 24 meses com as datas, para quem atende contar os papéis com a pessoa
    const jan = `de ${fmtBarra(somarMeses(fato, -24))} a ${fmtBarra(fato)}`;
    if(t==null) return {est:"informar", txt:`informe quantas provas materiais há e quantas são dos 24 meses antes do ${oque} (${jan}): bastam 2 papéis com data, 1 deles nessa janela; não precisa de escritura nem de ação na Justiça, e testemunha só complementa`};
    if(t >= 2 && q >= 1) return {est:"ok", txt:`${t} provas materiais, ${q} dos 24 meses antes do ${oque} (${jan}; art. 16, § 5º; IN 128, art. 180)`, fonte:"campo"};
    if(q >= 1) return {est:"risco", txt:`só uma prova material, dos 24 meses antes do ${oque} (${jan}): cabe justificação administrativa (IN 128, art. 180)`, fonte:"campo"};
    return {est:"falta", txt:`${t} ${t===1 ? "prova" : "provas"}, nenhuma dos 24 meses antes do ${oque} (${jan}): exige duas provas materiais, uma desse período; só testemunha não basta`, fonte:"campo"};
  }
  // o prazo para receber desde o fato é o da lei na data do fato: desde 18/01/2019, 90 dias (180 para o dependente
  // menor de 16, IN 128, art. 369, I, "a"); antes, na pensão, 90 dias desde a Lei 13.183/2015 e 30 desde a Lei 9.528/1997,
  // sem prazo antes dela; no auxílio-reclusão anterior a 2019, 30 dias (Decreto 3.048, art. 116, § 4º, redação anterior)
  function _prazo(x, fato, oque, rec){
    if(!fato) return {est:"informar", txt:"informe a data do fato (dep_fato)"};
    const v = x.v, nasc = dnIso(v.dep_nasc || x.dn || ""), id = nasc ? idadeEm(nasc, fato) : null;
    // o inválido ou com deficiência conta como maior de 16 (IN 128, art. 369, § 1º)
    const m16 = !v.dep_invalido && !/inválido/.test(v.dep_classe||"") && id!=null && id < 16 && fato >= CORTE_2019;
    const dias = fato >= CORTE_2019 ? (m16 ? 180 : 90) : rec ? 30 : fato >= "2015-11-05" ? 90 : fato >= "1997-11-11" ? 30 : 0;
    const lei = fato >= CORTE_2019 ? "" : rec ? " (Decreto 3.048, art. 116, § 4º, na redação anterior a 2019)" : ` (Lei 8.213, art. 74, I, na redação da Lei ${dias===90 ? "13.183/2015" : "9.528/1997"})`;
    if(!dias) return {est:"ok", txt:`${oque} antes de 11/11/1997: a pensão era devida desde o ${oque}, sem prazo para pedir (prescrição de 5 anos das parcelas)`, fonte:"campo"};
    const lim = somaDias(fato, dias);
    // F235 · cada dependente com o seu prazo: o filho menor de 16 tem 180 dias (desde 18/01/2019); os filhos vêm do
    // CadÚnico e das certidões de nascimento do dossiê, a confirmar. O prazo aberto é vermelho: "peça até"
    const idF = f => f.nasc ? idadeEm(f.nasc, fato) : f.idadeFato;
    const filhos = fato >= CORTE_2019 && !m16 ? _depFilhos(x).filter(f=>(!f.nasc || f.nasc <= fato) && idF(f) < 16) : [];
    const fLim = somaDias(fato, 180), fNomes = filhos.map(f=>`${f.curto || fraseClinica(f.nome).split(" ")[0]} (${idF(f)} ${idF(f)===1 ? "ano" : "anos"})`).join(", ");
    const fonteF = (v.der ? "campo" : "dossiê");
    if(x.der <= lim){
      if(v.der) return {est:"ok", txt:`pedido em ${fmtBarra(x.der)}, dentro dos ${dias} dias (até ${fmtBarra(lim)})${lei}: recebe desde o ${oque}`, fonte:"campo", quando:lim};
      const fil = filhos.length ? `; ${fNomes}: até ${fmtBarra(fLim)} (180 dias)` : "";
      return lim >= x.hoje ? {est:"risco", txt:`prazo correndo: pedir até ${fmtBarra(lim)} (${faltamTxt(lim)}) para receber desde o ${oque}${fil}${lei}`, fonte:fonteF, quando:lim}
        : {est:"ok", txt:`pedir até ${fmtBarra(lim)} (${dias} dias depois do ${oque})${lei} para receber desde ele${fil}`, fonte:fonteF, quando:lim};
    }
    if(filhos.length && x.der <= fLim)
      return {est: fLim >= x.hoje && !v.der ? "risco" : "ok", txt:`${fLim >= x.hoje && !v.der ? "prazo correndo: " : ""}para ${fNomes}, pedir até ${fmtBarra(fLim)}${fLim >= x.hoje ? ` (${faltamTxt(fLim)})` : ""} para receber desde o ${oque}; para quem pede, os ${dias} dias acabaram em ${fmtBarra(lim)}: recebe desde o pedido`, fonte:fonteF, quando:fLim};
    return {est:"info", txt:`passou o prazo de ${dias} dias (${fmtBarra(lim)})${lei}: paga desde a DER, não desde o ${oque}${id!=null && id < 16 ? "; para o absolutamente incapaz há tese (art. 198 do CC; Tema 1421/STJ, só na skill)" : ""}${rec && fato < CORTE_2019 && fato >= "2015-11-05" ? "; o art. 80 manda seguir a pensão, que já tinha 90 dias desde a Lei 13.183/2015 (tese)" : ""}`, fonte:"campo", quando:lim};
  }
  // F235 · os filhos de quem pede: os do CadÚnico (filho ou enteado do responsável) e os das certidões de nascimento
  function _depFilhos(x){
    const out = new Map();
    for(const m of ((x.cad||{}).membros||[])) if(/^filh|entead/i.test(m.parentesco||"") && m.nascimento && !m.obito) out.set(_nm(m.nome), {nome:m.nome, nasc:String(m.nascimento).slice(0,10)});
    for(const c of x.cert||[]) if(c.nascimento && c.registrado && c.nascimento !== x.dn) out.set(_nm(c.registrado), {nome:c.registrado, nasc:c.nascimento});
    for(const c of x.cert||[]) for(const f of c.obito ? c.filhos||[] : []){ const k = _nm(f.nome);
      if(![...out.keys()].some(o=>o.split(" ")[0]===k.split(" ")[0])) out.set(k, {nome:f.nome, idadeFato:f.idade, fonte:"certidão de óbito"}); }
    // F235 · e os do relato ("têm o Enzo, de 3 anos"), quando nenhum papel os traz
    for(const f of _relatoDep(x).filhos){ const k = _nm(f.nome);
      if(![...out.keys()].some(o=>o.split(" ")[0]===k.split(" ")[0])) out.set(k, f); }
    return [...out.values()].filter(f=>(f.nasc && f.nasc !== x.dn) || f.idadeFato!=null);
  }
  // F235 · o que o relato da recepção diz da família e do falecido ou do preso: os filhos com a idade, o trabalho dele
  // (de quando a quando, se trabalhava no dia, o seguro-desemprego), o salário e os papéis que a pessoa trouxe.
  // Entra como presumido, com a fonte, para confirmar com a pessoa
  const _MES_EXT = {janeiro:1, fevereiro:2, "março":3, marco:3, abril:4, maio:5, junho:6, julho:7, agosto:8, setembro:9, outubro:10, novembro:11, dezembro:12};
  const _ymRel = (mm, yy, fim) => yy ? `${yy}-${String(mm ? +mm : (fim ? 1 : 12)).padStart(2, "0")}` : null;   // só o ano: o começo no fim dele, o fim no começo
  function _relatoDep(x){
    const r = x && x.c ? relatoDe(x.c) : "", o = {filhos:[], trab:null, pago:null, sd:false, semTrab:false, sal:null, papeis:[]};
    if(!r) return o;
    for(const m of r.matchAll(/(?:\bt[êe]m|\bfilh[oa]s?,?|\bnet[oa]s?,?)\s+(?:o |a )?([A-ZÀ-Ý][a-zà-ÿ]+(?: [A-ZÀ-Ý][a-zà-ÿ]+)?),? de (\d{1,2}) anos?/g))
      o.filhos.push({nome:m[1], curto:m[1], idadeFato:+m[2], fonte:"relato da recepção"});
    let m = r.match(/(?:registrad[oa]|com carteira|trabalh\w+)[^.;]{0,30}?\bde\s+(?:(\d{2})\/)?((?:19|20)\d{2})\s+a\s+(?:(\d{2})\/)?((?:19|20)\d{2})/i);
    if(m) o.trab = {de:_ymRel(m[1], m[2], false), ate:_ymRel(m[3], m[4], true)};
    else if((m = r.match(/(?:registrad[oa]|com carteira(?: assinada)?|trabalhava)[^.;]{0,40}?desde\s+(?:(\d{2})\/)?((?:19|20)\d{2})/i))) o.trab = {de:_ymRel(m[1], m[2], false), ate:null, noFato:true};
    else if(/(?:registrad[oa]|com carteira)[^.;]{0,80}?\b(?:faleceu|morreu|foi pres[oa])|\b(?:faleceu|morreu|foi pres[oa])[^.;]{0,80}?(?:registrad[oa]|com carteira)/i.test(r)) o.trab = {de:null, ate:null, noFato:true};
    if((m = r.match(/(?:pagando|pagou|contribuiu|contribuindo|recolhendo)[^.;]{0,30}?at[ée]\s+(?:(\d{2})\/((?:19|20)\d{2})|([a-zç]+) de ((?:19|20)\d{2}))/i))){
      const mm = m[1] ? +m[1] : _MES_EXT[String(m[3]||"").toLowerCase()]; if(mm) o.pago = `${m[2] || m[4]}-${String(mm).padStart(2, "0")}`; }
    o.sd = /seguro[- ]desemprego/i.test(r) && !/n[ãa]o (?:recebeu|teve|pegou)[^.;]{0,25}seguro/i.test(r);
    o.semTrab = /n[ãa]o trabalhou mais|ficou desempregad|est(?:á|ava) desempregad|sem trabalhar desde/i.test(r);
    if((m = r.match(/ganhava (?:uns |cerca de |em torno de |mais ou menos )?R\$\s*([\d.]+(?:,\d{1,2})?)/i))) o.sal = +m[1].replace(/\./g, "").replace(",", ".");
    const tr = (r.match(/\btrouxe\b([^.]*)/i)||[])[1] || "";
    for(const p of tr.split(/,\s*|\s+e\s+(?=(?:a|o|as|os|uma|um)\s)/).map(s=>s.trim()).filter(s=>/^(?:a|o|as|os|uma|um)\s/i.test(s))){
      if(/[óo]bito|\bcdp\b|pres[íi]dio|unidade prisional|recolhimento|\bcat\b|boletim|\biml\b|de casamento|^a de /i.test(p)) continue;
      const fil = (p.match(/certid[ãa]o de nascimento d[oa] ([A-ZÀ-Ý][a-zà-ÿ]+)/)||[])[1], f = fil && o.filhos.find(k=>k.nome.split(" ")[0]===fil);
      const dt = p.match(/\b(?:(\d{2})\/)?((?:19|20)\d{2})\b/);
      if(fil || /ficha|prontu[áa]rio|posto|\bubs\b|conta (?:de|da)|extrato|imposto|plano de sa[úu]de|seguro|escritura|aluguel|correspond|declara[çc][ãa]o/i.test(p))
        o.papeis.push({rot:p.replace(/^(?:a|o|as|os|uma|um)\s+/i, ""), ym: dt && dt[1] ? `${dt[2]}-${dt[1]}` : null, ano: dt ? +dt[2] : null, filho: f || null});
    }
    return o;
  }
  // F235 · para o Primeiro atendimento, os Documentos e a B93 (outros blocos)
  window.depFilhosDe = c => _depFilhos({c, cad:familiaCadunico(c), cert:certidoesDoDossie(c.id), dn:dnIso(c.dn)});
  window.depFilhosX = _depFilhos;
  window.relatoDepDe = _relatoDep;
  // F235 · o que o relato e a CAT respondem do falecido ou do preso (presumido, com a fonte): a última contribuição,
  // quantas, o seguro-desemprego, os 12 meses sem salário, o salário e as provas da união que a pessoa trouxe
  const _fatoPre = x => x.v.dep_fato || ((PRE_DOSSIE.dep_fato(x)||{}).val) || null;
  const _classePre = x => x.v.dep_classe || ((PRE_DOSSIE.dep_classe(x)||{}).val) || "";
  const _ymBr = ym => `${ym.slice(5)}/${ym.slice(0,4)}`;
  const _provasRelato = x => { if(!/^(morte|B93|reclusao)$/.test(x.op||"") || !/^Companheiro/.test(_classePre(x))) return null;
    const f = _fatoPre(x); if(!f) return null; const ps = _relatoDep(x).papeis; if(!ps.length) return null;
    const ini = somarMeses(f, -24), fy = +f.slice(0,4), iy = +ini.slice(0,4);
    const dentro = p => { const a = p.filho ? fy - p.filho.idadeFato : p.ano; if(!a) return false;
      return p.ym ? p.ym >= ymDe(ini) && p.ym <= ymDe(f) : a > iy && a < fy; };   // só o ano: conta quando o ano inteiro cai na janela
    return {total:ps.length, n24:ps.filter(dentro).length, fonte:`relato da recepção: ${ps.map(p=>p.rot).join("; ")}; confira as datas nos papéis (a janela vai de ${fmtBarra(ini)} a ${fmtBarra(f)})`}; };
  Object.assign(PRE_DOSSIE, {
    ins_ultima_contrib: x => { if(!/^(morte|B93|reclusao)$/.test(x.op||"")) return null; const f = _fatoPre(x); if(!f) return null;
      const cat = x.op==="B93" && x.c ? catDoDossie(x.c) : null;
      if(cat && cat.data && cat.data <= f) return {val:ymDe(f), fonte:`CAT da empresa (${cat.rot}): acidente no trabalho em ${fmtBarra(cat.data)}${cat.admissao ? `, empregado desde ${fmtBarra(cat.admissao)}` : ""}`};
      const d = _relatoDep(x), oque = x.op==="reclusao" ? "quando foi preso" : "quando morreu";
      if(d.pago && d.pago <= ymDe(f)) return {val:d.pago, fonte:`relato da recepção: pagou o INSS até ${_ymBr(d.pago)}; confira no CNIS dele`};
      if(d.trab && d.trab.ate && d.trab.ate <= ymDe(f)) return {val:d.trab.ate, fonte:`relato da recepção: trabalhou com registro até ${_ymBr(d.trab.ate)}; confira no CNIS dele`};
      if(d.trab && d.trab.noFato) return {val:ymDe(f), fonte:`relato da recepção: trabalhava com registro ${oque}; confira o último salário no CNIS dele`};
      return null; },
    dep_contrib: x => { if(!/^(morte|B93|reclusao)$/.test(x.op||"")) return null; const f = _fatoPre(x); if(!f) return null;
      const cat = x.op==="B93" && x.c ? catDoDossie(x.c) : null;
      if(cat && cat.admissao && cat.data && cat.admissao < cat.data){ const n = mesesEntreYm(ymDe(cat.admissao), ymDe(cat.data));
        return {val:String(n), fonte:`CAT da empresa: empregado desde ${fmtBarra(cat.admissao)} até o acidente (${n} meses; confira no CNIS dele)`}; }
      const d = _relatoDep(x); if(!d.trab || !d.trab.de) return null;
      const fim = d.trab.ate || (d.trab.noFato ? ymDe(f) : null); if(!fim || fim < d.trab.de) return null;
      const n = mesesEntreYm(d.trab.de, fim);
      return {val:String(n), fonte:`relato da recepção: trabalho com registro de ${_ymBr(d.trab.de)} a ${_ymBr(fim)}, ao menos ${n} contribuições (só o ano conta pelo mínimo); confira no CNIS dele`}; },
    ins_desemprego: x => /^(morte|B93|reclusao)$/.test(x.op||"") && _relatoDep(x).sd ? {val:"Sim", fonte:"relato da recepção: recebeu o seguro-desemprego depois do último emprego; peça o comprovante (requerimento e parcelas)"} : null,
    rec_comps_12: x => { if(x.op!=="reclusao") return null; const f = _fatoPre(x), d = _relatoDep(x); if(!f || !d.semTrab) return null;
      const ult = x.v.ins_ultima_contrib || d.pago || (d.trab && d.trab.ate) || null, ini = ymDe(somarMeses(f, -12));
      return ult && ult < ini ? {val:"0", fonte:`relato da recepção: não trabalhou mais depois de ${_ymBr(ult)}; confira que não há salário de ${_ymBr(ini)} a ${_ymBr(ymDe(somarMeses(f, -1)))}`} : null; },
    dep_media12: x => { if(x.op!=="reclusao") return null; const d = _relatoDep(x);
      return d.sal && d.trab && d.trab.noFato ? {val:String(d.sal), fonte:`relato da recepção: ganhava ${moedaBR(d.sal)}; confira nos holerites dos 12 meses antes do mês da prisão`} : null; },
    dep_provas_total: x => { const p = _provasRelato(x); return p ? {val:String(p.total), fonte:p.fonte} : null; },
    dep_provas_24m: x => { const p = _provasRelato(x); return p ? {val:String(p.n24), fonte:p.fonte} : null; },
  });
  // divergência (a) do levantamento: o menor sob guarda
  const _guarda = {est:"divergente", txt:"menor sob guarda: o INSS nega pela EC 103 e pela IN 128; a Lei 15.108/2025 o reincluiu, e cabe a via judicial (prova também que não tem como se sustentar)",
    div:{inss:"EC 103, art. 23, § 6º, e IN 128, art. 178, § 7º: equiparam só o enteado e o menor tutelado", judicial:"Lei 8.213, art. 16, § 2º (red. Lei 15.108/2025): enteado, tutelado e menor sob guarda judicial; Tema 1271/STF (só na skill)"}, fonte:"campo"};
  const _CAMPOS_DEP = {
    dep_classe:["Dependente", "select", ["","Cônjuge","Companheiro(a)","Filho menor","Filho inválido ou com deficiência","Enteado ou menor tutelado","Menor sob guarda","Ex-cônjuge com alimentos","Pais","Irmão"]],
    dep_contrib:["Contribuições do instituidor até o óbito ou a prisão (na pensão, conta também o RPPS)", "number"],
    dep_classe1:["Dependente de classe anterior com direito (exclui pais e irmãos)", "select", ["","Nenhum","Cônjuge, companheiro ou filho","Pai ou mãe"]],
    dep_invalido:["Dependente inválido ou com deficiência: início", "date"],
    dep_alimentos:["Ex-cônjuge: alimentos até quando (em branco se sem prazo)", "date"],
    dep_provas_total:["Provas materiais da união ou da dependência", "number"],
    dep_provas_24m:["Delas, quantas são dos 24 meses antes do óbito ou da prisão", "number"],
    ins_ultima_contrib:["Última contribuição do instituidor ou do recluso (competência)", "month"],
    ins_beneficio:["Benefício que o instituidor ou o recluso recebia no fato (espécie e NB)", "text"],
    ins_120:["Instituidor ou recluso com mais de 120 contribuições sem perder a qualidade", "select", SN],
    ins_desemprego:["Depois do último emprego, ele recebeu seguro-desemprego ou se registrou no SINE (mais 12 meses de cobertura)", "select", SN],
    ins_facultativo:["Instituidor ou recluso contribuía como facultativo (graça de 6 meses)", "select", SN],
  };

  // ── morte · pensão por morte (B21) ───────────────────────────────────────
  registrarReq("morte", [
    {id:"obito", rot:"Quando foi o óbito? Tem a certidão (ou a sentença de morte presumida)?",
     base:"Lei 8.213/91, art. 74, caput e III; IN 128/2022, arts. 365, §§ 1º e 3º, e 377", conf:"conferido", campos:["dep_fato"],
     mede:x=>{ const f = x.v.dep_fato;
       if(!f) return {est:"informar", txt:"informe a data do óbito (certidão) ou da sentença de morte presumida"};
       if(f > x.hoje) return {est:"informar", txt:`óbito com data futura (${fmtBarra(f)}): confira`};
       return {est:"ok", txt:`óbito em ${fmtBarra(f)}: vale a lei dessa data, e a DIB é o óbito`, fonte:"campo"}; }},
    {id:"qualidade_instituidor", rot:"Quem morreu era segurado do INSS no dia do óbito (trabalhando, contribuindo, recebendo benefício ou na graça)?",
     base:"Lei 8.213/91, arts. 15 e 102, § 2º; IN 128/2022, arts. 365, § 2º, e 368", conf:"conferido",
     campos:["ins_ultima_contrib","ins_beneficio","ins_aposentado","ins_120","ins_desemprego","ins_facultativo","ins_direito_apos","ins_nasc","ins_sexo","dep_contrib"],
     mede:x=>_insQual(x, x.v.dep_fato, "óbito", true)},
    {id:"sem_carencia", rot:"Precisa de um número mínimo de contribuições? (Não: o número só muda quanto tempo o cônjuge recebe.)",
     base:"IN 128/2022, art. 195, III; Lei 8.213/91, art. 26, I", conf:"conferido", campos:[],
     mede:x=>({est:"info", txt:"a pensão não exige carência; as 18 contribuições só decidem a duração da cota do cônjuge"})},
    {id:"dependente_classe", rot:"Quem pede é dependente: cônjuge, companheiro, filho menor de 21 ou inválido, pais (sem classe 1) ou irmão (sem pais nem classe 1)?",
     base:"Lei 8.213/91, art. 16, I a III e § 1º; IN 128/2022, arts. 178, I a III e §§ 8º e 9º, 365, § 2º, e 373", conf:"conferido",
     campos:["dep_classe","dep_nasc","dep_classe1","dep_invalido","dep_alimentos"],
     // o menor sob guarda é a divergência (a): a classe não fica "em ordem" só pela tese
     mede:x=>{ const c = _depClasse(x, x.v.dep_fato, "óbito"); return c.est==="ok" && x.v.dep_classe==="Menor sob guarda" ? _guarda : c; }},
    {id:"dependencia_economica", rot:"Dependia do falecido? (Cônjuge, companheiro e filhos não precisam provar; pais, irmãos e equiparados precisam.)",
     base:"Lei 8.213/91, art. 16, §§ 4º e 5º; IN 128/2022, arts. 178, §§ 1º, 2º e 7º, e 180", conf:"conferido",
     campos:["dep_classe","dep_provas_total","dep_provas_24m","dep_prova"],
     mede:x=>{ const cl = x.v.dep_classe || "";
       if(!cl) return {est:"informar", txt:"informe quem pede (dep_classe)"};
       if(/^(Cônjuge|Companheiro|Filho)/.test(cl)) return {est:"ok", txt:"presumida na classe 1 (art. 16, § 4º)", fonte:"lei"};
       if(cl==="Ex-cônjuge com alimentos") return {est:"ok", txt:"provada pelos alimentos ou pela ajuda que recebia (art. 76, § 2º)", fonte:"campo"};
       const r = _provas(x, x.v.dep_fato, "óbito");
       return {...r, txt:`dependência econômica (pode ser parcial, mas permanente): ${r.txt}`}; }},
    {id:"equiparados_filho", rot:"É enteado, menor sob tutela ou menor sob guarda do falecido?",
     base:"Lei 8.213/91, art. 16, § 2º (red. Lei 15.108/2025); EC 103/2019, art. 23, § 6º; IN 128/2022, art. 178, § 7º", conf:"divergente",
     campos:["dep_classe","dep_provas_total","dep_provas_24m"],
     mede:x=>{ const cl = x.v.dep_classe || "";
       if(cl==="Menor sob guarda") return _guarda;
       if(cl==="Enteado ou menor tutelado"){ const r = _provas(x, x.v.dep_fato, "óbito");
         return {...r, txt:`equipara-se a filho com declaração do segurado e prova de que não tem como se sustentar: ${r.txt}`}; }
       return {est:"info", txt: cl ? "não se aplica a quem pede" : "só se aplica a enteado, tutelado ou menor sob guarda"}; }},
    {id:"prova_uniao", rot:"Se é companheiro(a): tem pelo menos 2 documentos da união, um deles dos 24 meses antes do óbito?",
     base:"Lei 8.213/91, art. 16, §§ 5º e 6º; IN 128/2022, art. 180", conf:"conferido",
     campos:["dep_classe","dep_uniao","dep_provas_total","dep_provas_24m"],
     mede:x=>{ const cl = x.v.dep_classe || "";
       if(cl==="Cônjuge") return {est:"info", txt:"casamento: prova pela certidão atualizada"};
       // F235 · sem saber quem pede, a prova da união fica a informar (é o ponto que decide o caso da companheira)
       if(cl!=="Companheiro(a)") return cl ? {est:"info", txt:"não se aplica a quem pede"} : {est:"informar", txt:"informe quem pede: se é companheiro(a), sem casamento no papel, a união se prova com 2 papéis com data, 1 deles dos 24 meses antes do óbito"};
       const r = _provas(x, x.v.dep_fato, "óbito");
       return {...r, txt:`união estável: ${r.txt}`}; }},
    {id:"duracao_cota_conjuge", rot:"Por quanto tempo o cônjuge ou companheiro vai receber (idade no óbito, tempo de união e contribuições)?",
     base:"Lei 8.213/91, art. 77, § 2º, V, e §§ 2º-A e 5º; IN 128/2022, art. 375; Portaria ME 424/2020, arts. 1º e 2º", conf:"conferido",
     campos:["dep_nasc","dep_uniao","dep_contrib","ins_acidente","ins_aposentado","dep_invalido"],
     mede:x=>{ const v = x.v, f = v.dep_fato, cl = v.dep_classe || "";
       if(cl && !/^(Cônjuge|Companheiro|Ex-cônjuge)/.test(cl)) return {est:"info", txt:"só para cônjuge, companheiro ou ex-cônjuge com alimentos"};
       if(!f) return {est:"informar", txt:"informe a data do óbito (dep_fato)"};
       if(f < "2015-03-01") return {est:"ok", txt:`óbito em ${fmtBarra(f)}, antes de 01/03/2015: cota sem prazo (vitalícia)`, fonte:"campo"};
       const acid = v.ins_acidente==="Sim", apos = v.ins_aposentado==="Sim", ctb = _n(x, "dep_contrib");
       const nasc = dnIso(v.dep_nasc || x.dn || ""), id = nasc ? idadeEm(nasc, f) : null;
       const dois = v.dep_uniao ? somarAnos(v.dep_uniao, 2) <= f : null;
       if(!acid && !apos && ctb==null && dois && nasc){ const id0 = idadeEm(nasc, f), tab0 = f >= "2021-01-01" ? [[22,3],[28,6],[31,10],[42,15],[45,20]] : [[21,3],[27,6],[30,10],[41,15],[44,20]], a0 = (tab0.find(([l])=>id0 < l)||[0,0])[1];
         return {est:"informar", txt:`pergunte quanto tempo ele contribuiu (o CNIS dele não vem no dossiê): com 18 contribuições ou mais, ${a0 ? `a cota dura ${a0} anos, até ${fmtBarra(somarAnos(f, a0))}` : "a cota é vitalícia"} (${id0} anos no óbito, mais de 2 anos de ${cl==="Companheiro(a)" ? "união" : "casamento"}); com menos, só 4 meses, até ${fmtBarra(somarMeses(f, 4))}${v.ins_acidente==="Não" ? "" : "; se a morte foi por acidente ou doença do trabalho, os 4 meses não se aplicam"}`}; }
       if(!acid && ((!apos && ctb==null) || dois==null)) return {est:"informar", txt:`informe ${!apos && ctb==null ? "as contribuições do instituidor (dep_contrib)" : "o início do casamento ou da união (dep_uniao)"}: decidem se a cota é de 4 meses`};
       const curta = !acid && ((!apos && ctb < 18) || !dois), ressalva = acid ? "; o acidente ou a doença do trabalho dispensa as 18 contribuições e os 2 anos (art. 77, § 2º-A)" : apos && ctb!=null && ctb < 18 ? "; instituidor aposentado dispensa as 18 contribuições (IN 128, art. 375, § 3º)" : "";
       const inval = v.dep_invalido ? "; cônjuge inválido ou com deficiência recebe enquanto durar a condição, respeitado o prazo maior (art. 375, III, IV e § 5º)" : "";
       const fimDe = d => d && d < x.der ? {est:"impedido", txt:`a cota acabou em ${fmtBarra(d)}, antes do pedido: pedido indeferido (IN 128, art. 375, § 7º)`, fonte:"campo"} : null;
       if(curta){ const fim = somarMeses(f, 4);
         return v.dep_invalido ? {est:"ok", txt:`cota pela invalidez ou deficiência${inval}`, fonte:"campo"} : fimDe(fim) || {est:"falta", txt:`cota de 4 meses, até ${fmtBarra(fim)}: ${!dois ? "casamento ou união com menos de 2 anos" : `instituidor com ${ctb} contribuições, exige 18 (conta o RPPS, § 4º)`}`, fonte:"campo"}; }
       if(id==null) return {est:"informar", txt:"informe o nascimento do dependente (dep_nasc)"};
       const tab = f >= "2021-01-01" ? [[22,3],[28,6],[31,10],[42,15],[45,20]] : [[21,3],[27,6],[30,10],[41,15],[44,20]], a = (tab.find(([l])=>id < l)||[0,0])[1];
       if(!a) return {est:"ok", txt:`${id} anos no óbito: cota vitalícia${ressalva}${cl==="Companheiro(a)" && !acid ? "; a união de 2 anos precisa de prova material (art. 16, § 6º)" : ""}`, fonte:"campo"};
       const fim = somarAnos(f, a);
       return fimDe(fim) || {est:"ok", txt:`${id} anos no óbito: cota de ${a} anos, até ${fmtBarra(fim)}${inval}${ressalva}`, fonte:"campo", quando:fim}; }},
    {id:"dependentes_valor", rot:"Quem mais recebe junto, até quando, e quanto?", base:"EC 103/2019, art. 23, caput e § 1º; Lei 8.213/91, arts. 16, I, e 77, § 2º, II", conf:"conferido", campos:[],
     mede:x=>{ const f = x.v.dep_fato; if(!f) return {est:"info", txt:"informe a data do óbito"};
       const fs = _depFilhos(x).map(k=>({...k, id: k.nasc ? idadeEm(k.nasc, f) : k.idadeFato})).filter(k=>k.id!=null && k.id < 21);
       const quem = /^(Cônjuge|Companheiro|Ex-cônjuge)/.test(x.v.dep_classe||"") ? 1 : 0, n = quem + fs.length;
       // F235 · uma linha por dependente: o prazo para receber desde o óbito e o fim da parte de cada um
       const mais = "Pergunte se mais alguém dependia dele: filho de outra relação, filho inválido ou com deficiência, enteado, ex-mulher com pensão alimentícia";
       const sm = `nunca abaixo do mínimo (${moedaBR(smEm(x.der))})`, pz = d => fmtBarra(somaDias(f, d)), m16 = f >= CORTE_2019;
       if(!fs.length) return {est:"info", txt: quem ? `nenhum filho menor de 21 no dossiê nem no relato. ${mais}. Com um dependente, a pensão é 60 % (50 % + 10 %) da aposentadoria por incapacidade permanente a que ele teria direito, ${sm}` : "informe quem pede e os outros dependentes"};
       const fim = k => k.nasc ? `recebe até os 21, em ${fmtBarra(somarAnos(k.nasc, 21))}` : `recebe até os 21, por volta de ${anoDe(f) + 21 - k.id} (confira a certidão de nascimento)`;
       const de = k => k.fonte ? (/^relato/.test(k.fonte) ? `, do ${k.fonte}` : `, da ${k.fonte}`) : "";
       const paga = (x.benefCnis||[]).some(b=>/^(21|93)$/.test(b.especie) && b.de && Math.abs(Date.parse(b.de) - Date.parse(f)) <= 40*864e5);
       const prazo = d => paga ? "" : somaDias(f, d) >= x.hoje ? `pedir até ${pz(d)}${d===180 ? " (180 dias, menor de 16)" : ""}; ` : `os ${d} dias para receber desde o óbito acabaram em ${pz(d)}; `;
       const linhas = fs.map(k=>`${k.curto || fraseClinica(k.nome).split(" ")[0]} (${k.id} ${k.id===1 ? "ano" : "anos"} no óbito${de(k)}): ${prazo(m16 && k.id < 16 ? 180 : 90)}${fim(k)}`);
       return {est:"info", txt:`${quem ? `Quem pede: ${prazo(90)}a duração da parte de quem pede está no item acima. ` : ""}${linhas.join(". ")}. Com ${n} ${n===1 ? "dependente" : "dependentes"}, a pensão é ${Math.min(100, 50 + 10*n)} % (50 % + 10 % por dependente) da aposentadoria por incapacidade permanente a que ele teria direito, em partes iguais, ${sm}. ${paga ? "" : "Peçam juntos; "}${paga ? "Pelo" : "pelo"} menor de 16 assina a mãe ou o pai (a procuração sai em nome do filho, representado). ${mais}`, fonte:"dossiê"}; }},
    {id:"prazo_requerimento", rot:"Já pediu? Para receber desde o óbito, o pedido precisa sair em até 90 dias (180 para filho menor de 16).",
     base:"Lei 8.213/91, art. 74, I e II (redações das Leis 9.528/1997, 13.183/2015 e 13.846/2019); IN 128/2022, art. 369, I e §§ 1º e 2º", conf:"conferido", campos:["der","dep_nasc"],
     mede:x=>_prazo(x, x.v.dep_fato, "óbito")},
    {id:"exclusao_crime_fraude", rot:"Há notícia de que quem pede matou ou tentou matar o segurado, ou de casamento ou união simulados para ter o benefício?",
     base:"Lei 8.213/91, arts. 16, § 7º, 74, §§ 1º e 2º, e 77, § 7º; IN 128/2022, arts. 379 e 380", conf:"conferido", campos:["dep_exclusao"],
     mede:x=>{ const e = x.v.dep_exclusao || "";
       if(/Condenação|Fraude/.test(e)) return {est:"impedido", txt:`${e.toLowerCase()}: perde o direito à pensão (art. 74, §§ 1º e 2º)`, fonte:"campo"};
       if(/Indícios/.test(e)) return {est:"risco", txt:"há indícios, sem decisão: a cota pode ser suspensa até o processo judicial (IN 128, art. 380)", fonte:"campo"};
       return {est:"info", txt:"sem notícia de crime contra o segurado ou de simulação"}; }},
    {id:"acumulacao", rot:"Quem pede já recebe aposentadoria, pensão ou BPC?",
     base:"EC 103/2019, art. 24, caput e §§ 1º, 2º e 4º; Lei 8.213/91, art. 124, VI; IN 128/2022, art. 366; LOAS, art. 20, § 4º", conf:"conferido", campos:["dep_fato"],
     mede:x=>{ const bs = _ativos(x), cl = x.v.dep_classe || "", f = x.v.dep_fato;
       if(!bs.length) return x.g ? {est:"ok", txt:"o dependente não recebe outro benefício", fonte:"CNIS"} : {est:"informar", txt:"o CNIS do dependente não foi lido: confira se recebe outro benefício"};
       const nome = _nomeB, conj = /^(Cônjuge|Companheiro|Ex-cônjuge)/.test(cl);
       // F235 · a pensão deste mesmo óbito (DIB no óbito) não é outro benefício: o pedido é a revisão dela
       const mesma = f && bs.find(b=>/^(21|93)$/.test(b.especie) && b.de && Math.abs(Date.parse(b.de) - Date.parse(f)) <= 40*864e5);
       if(mesma) return {est:"info", txt:`já recebe ${nome(mesma)} deste óbito (desde ${fmtBarra(mesma.de)}): o pedido é revisão dessa pensão, não uma pensão nova`, fonte:"CNIS"};
       const bpc = bs.find(b=>/^8[78]$/.test(b.especie)), pen = bs.find(b=>/^21$/.test(b.especie)), adq = f && f < EC103;
       const apo = bs.find(b=>/^(32|41|42|46|57|92)$/.test(b.especie) || /aposent/i.test(b.especie));
       if(bpc) return {est:"opcao", txt:`recebe ${nome(bpc)}: o BPC não acumula com a pensão (LOAS, art. 20, § 4º); compare os valores e escolha`, fonte:"CNIS"};
       // duas pensões de cônjuge no RGPS: vedado desde a Lei 9.032/1995 (art. 124, VI), com ou sem direito adquirido à EC 103
       if(pen && conj) return {est:"opcao", txt:`já recebe ${nome(pen)}: se também é pensão de cônjuge ou companheiro, as duas não se acumulam no RGPS (Lei 8.213, art. 124, VI; EC 103, art. 24, caput); escolha a mais vantajosa`, fonte:"CNIS"};
       // o redutor do § 2º só alcança a pensão de cônjuge com aposentadoria (ou com pensão de outro regime, § 1º, I e II)
       if(conj && apo && !adq) return {est:"ok", txt:`recebe ${nome(apo)}: acumula com a pensão de cônjuge, a maior inteira e da menor 60 % do que passar de 1 SM até 2, 40 % de 2 a 3, 20 % de 3 a 4 e 10 % acima (EC 103, art. 24, §§ 1º, II, e 2º)`, fonte:"CNIS"};
       return {est:"ok", txt:`recebe ${bs.map(nome).join(", ")}: acumula ${conj && apo ? "sem redutor, porque o direito aos dois é anterior a 13/11/2019 (EC 103, art. 24, § 4º)" : "sem redutor (o redutor do art. 24, § 2º, só alcança a pensão de cônjuge com aposentadoria ou com pensão de outro regime)"}`, fonte:"CNIS"}; }},
  ], {..._CAMPOS_DEP,
    ins_aposentado:["Instituidor aposentado, exceto por incapacidade permanente (dispensa as 18 contribuições)", "select", SN],
    ins_direito_apos:["Instituidor já tinha direito a aposentadoria (ou ao B32 dentro da graça) antes de perder a qualidade", "select", SN],
    ins_nasc:["Nascimento do instituidor (art. 102, § 2º)", "date"],
    ins_sexo:["Sexo do instituidor", "select", ["","Masculino","Feminino"]],
    ins_acidente:["Óbito por acidente de qualquer natureza ou doença profissional ou do trabalho", "select", SN],
    dep_exclusao:["Notícia de crime contra o segurado ou de simulação", "select", ["","Nenhuma","Condenação definitiva por homicídio doloso ou tentativa","Fraude ou simulação apurada em juízo","Indícios, sem decisão"]],
  }, {resumo:"É paga aos dependentes de quem morreu sendo segurado do INSS. Não exige carência. O cônjuge e os filhos não precisam provar dependência; o tempo que o cônjuge recebe depende da idade dele, do tempo de casamento ou união e das contribuições do falecido.",
    quando: x=>null});

  // ── reclusao · auxílio-reclusão (B25) ────────────────────────────────────
  const _REG_OK = ["Fechado","Provisória, preventiva ou temporária","Medida de segurança de internação","Internação de adolescente (16 a 18 anos)","Domiciliar ou tornozeleira em regime fechado"];
  // F235 · o limite de baixa renda de 2025 (Portaria Interministerial de 2025; o valor está só na skill auxilio-reclusao-previdenciario)
  const LIM_RECL_2025 = 1906.04;
  const _dataExtenso = t => { const m = String(t||"").match(/(\d{1,2}) de (janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro) de ((?:19|20)\d{2})/i);
    return m ? `${m[3]}-${String(_MES_EXT[m[2].toLowerCase()] || _MES_EXT[m[2].toLowerCase().replace("ç","c")]).padStart(2,"0")}-${m[1].padStart(2,"0")}` : ""; };
  registrarReq("reclusao", [
    {id:"prisao_regime_fechado", rot:"O segurado está preso em regime fechado, ou em prisão provisória, preventiva ou temporária? Desde quando?",
     base:"Lei 8.213/91, art. 80, caput; IN 128/2022, arts. 381, §§ 1º e 2º, 382 e 383, I e §§ 1º e 4º; Decreto 3.048/99, art. 116, § 5º (redação anterior a 2019)", conf:"conferido", campos:["dep_fato","dep_regime"],
     mede:x=>{ const f = x.v.dep_fato, r = x.v.dep_regime || "";
       if(!f) return {est:"informar", txt:"informe a data da prisão (dep_fato)"};
       if(!r) return {est:"informar", txt:"informe o regime da prisão (dep_regime)"};
       if(_REG_OK.includes(r)) return {est:"ok", txt:`${r.toLowerCase()} desde ${fmtBarra(f)}`, fonte:"campo"};
       if(r==="Semiaberto" && f < CORTE_2019) return {est:"ok", txt:`semiaberto desde ${fmtBarra(f)}: antes de 18/01/2019 o semiaberto dava direito (Decreto 3.048, art. 116, § 5º, redação anterior; IN 128, art. 383, §§ 1º e 4º)`, fonte:"campo"};
       return {est:"impedido", txt:`${r.toLowerCase()}${f >= CORTE_2019 ? ", prisão desde 18/01/2019: só o fechado e a prisão provisória dão direito" : ": não dá direito"} (art. 80; IN 128, art. 382)`, fonte:"campo"}; }},
    {id:"certidao_prisao", rot:"Tem a certidão judicial da prisão? (Para continuar recebendo, o atestado de que segue preso a cada 90 dias.)",
     base:"Lei 8.213/91, art. 80, §§ 1º e 5º; IN 128/2022, arts. 390 e 391, I", conf:"conferido", campos:["rec_certidao"],
     mede:x=>{ const ce = (x.cert||[]).find(c=>c.prisao), t = String(((ce||{}).anexo||{}).texto||""), em = _dataExtenso(t);
       // F235 · a certidão que diz "permanece recolhido nesta data" mostra até quando se sabe que ele continua preso
       const segue = em && /permanece recolhid/i.test(t) ? `; a ${ce.rot} de ${fmtBarra(em)} diz que ele continua preso` : "";
       if(x.v.rec_certidao==="Sim") return {est:"ok", txt:`certidão judicial do recolhimento, com data e regime${segue}; a cada 90 dias, a prova de que segue preso (ou a base do CNJ)`, fonte:"campo"};
       if(x.v.rec_certidao==="Não") return {est:"falta", txt:"pedir a certidão judicial do recolhimento à prisão, com data e regime", fonte:"campo"};
       // F235 · a declaração do presídio prova a permanência a cada 90 dias; no pedido, a lei pede a certidão do fórum
       if(ce && ce.rot==="declaração da unidade prisional") return {est:"provar", txt:`o dossiê traz a declaração da unidade prisional${em && /permanece recolhid/i.test(t) ? ` de ${fmtBarra(em)} (ele continua preso nessa data)` : ""}: é a prova de permanência que se leva a cada 90 dias (IN 128, art. 390); no pedido, a lei pede a certidão judicial do recolhimento (Lei 8.213, art. 80, § 1º): peça a certidão judicial no fórum do processo; se a declaração basta para protocolar, quem decide é o advogado`, fonte:"dossiê"};
       return {est:"informar", txt:"informe se há certidão judicial da prisão (rec_certidao)"}; }},
    {id:"qualidade_recluso", rot:"O preso era segurado do INSS no dia da prisão (trabalhando, contribuindo ou na graça)?",
     base:"IN 128/2022, art. 383, caput; Lei 8.213/91, art. 15", conf:"conferido",
     campos:["ins_ultima_contrib","ins_desemprego","ins_beneficio","ins_120","ins_facultativo"], mede:x=>_insQual(x, x.v.dep_fato, "dia da prisão", false)},
    {id:"carencia_24", rot:"O preso tinha pelo menos 24 contribuições até a prisão (12 desde a volta, se tinha perdido a qualidade)?",
     base:"Lei 8.213/91, arts. 25, IV (via art. 80, caput), e 27-A; IN 128/2022, arts. 198 e 383, III", conf:"conferido", campos:["dep_contrib","ins_reingresso"],
     mede:x=>{ const f = x.v.dep_fato;
       if(!f) return {est:"informar", txt:"informe a data da prisão (dep_fato)"};
       if(f < CORTE_2019) return {est:"ok", txt:`prisão em ${fmtBarra(f)}, antes de 18/01/2019: sem carência (IN 128, art. 198, I)`, fonte:"campo"};
       const ctb = _n(x, "dep_contrib"), re = x.v.ins_reingresso==="Sim", ex = re ? 12 : 24;
       if(ctb==null) return {est:"informar", txt:`pergunte quanto tempo ele trabalhou com registro ou pagou o INSS até a prisão: precisa de ${ex} contribuições${re ? " desde a volta" : " (12 desde a volta, se tinha parado e perdido a qualidade)"}. O CNIS dele não vem no dossiê; no pedido, o INSS consulta`};
       return ctb >= ex ? {est:"ok", txt:`${ctb} contribuições até a prisão${re ? " desde a volta" : ""}, exige ${ex}${re ? " (metade, art. 27-A)" : ""}`, fonte:"campo"}
         : {est:"falta", txt:`${ctb} contribuições até a prisão${re ? " desde a volta" : ""}, exige ${ex}${re ? " (metade, art. 27-A)" : ""}`, fonte:"campo"}; }},
    {id:"baixa_renda", rot:"A média dos salários do preso nos 12 meses antes da prisão está dentro do limite da Portaria do ano da prisão?",
     base:"Lei 8.213/91, art. 80, §§ 3º, 4º e 6º; EC 103/2019, art. 27, caput; IN 128/2022, art. 383, II e §§ 2º, 5º, 6º e 7º; antes de 18/01/2019, Decreto 3.048/99, art. 116, caput e § 1º (redação anterior)", conf:"conferido",
     campos:["rec_comps_12","dep_media12","dep_teto","rec_ultimo_sc","ins_ultima_contrib"],
     mede:x=>{ const f = x.v.dep_fato, md = _n(x, "dep_media12"), tt = _n(x, "dep_teto"), nc = _n(x, "rec_comps_12"), us = _n(x, "rec_ultimo_sc");
       if(!f) return {est:"informar", txt:"informe a data da prisão (dep_fato)"};
       const sem = `informe o limite da Portaria do ano da prisão (dep_teto); o de 2025 era ${moedaBR(LIM_RECL_2025)} (só na skill), e R$ 1.364,43 é a referência de 2019 (EC 103, art. 27)`;
       if(f < CORTE_2019){ const dec = "Decreto 3.048, art. 116, na redação anterior a 2019", uc = x.v.ins_ultima_contrib || "";
         // § 1º: sem salário de contribuição na data da prisão (desempregado), mantida a qualidade, é devido
         if(/^\d{4}-\d{2}$/.test(uc) && uc < ymDe(f)) return {est:"ok", txt:`sem salário de contribuição no mês da prisão (última contribuição ${uc.slice(5)}/${uc.slice(0,4)}): é devido, mantida a qualidade (${dec}, § 1º; Tema 896/STJ, só na skill)`, fonte:"campo"};
         if(us==null) return {est:"informar", txt:`prisão até 17/01/2019: o critério é o último salário de contribuição, não a média de 12 meses (${dec}, caput); informe-o (rec_ultimo_sc)${tt ? "" : " e o limite da Portaria do ano da prisão (dep_teto)"}`};
         if(!tt) return {est:"informar", txt:sem};
         return us <= tt ? {est:"ok", txt:`último salário de contribuição de ${moedaBR(us)}, dentro do limite de ${moedaBR(tt)} da Portaria do ano da prisão (${dec}, caput)`, fonte:"campo"}
           : {est:"falta", txt:`último salário de contribuição de ${moedaBR(us)}, acima do limite de ${moedaBR(tt)} da Portaria do ano da prisão (${dec}, caput)`, fonte:"campo"}; }
       if(nc===0) return {est:"ok", txt:"sem salário de contribuição nos 12 meses antes da prisão: é baixa renda (art. 383, § 5º)", fonte:"campo"};
       if(md==null) return {est:"informar", txt:"nos 12 meses antes da prisão ele teve salário? Se não teve (desempregado), é baixa renda: ponha 0 no campo dos meses com salário (IN 128, art. 383, § 5º); se teve, informe a média dos salários de contribuição desses meses (dep_media12), sem as competências abaixo do mínimo; o salário de quem pede não entra nessa conta"};
       // F235 · o limite sobe todo ano pelo índice dos benefícios (EC 103, art. 27): o de 2025 é o piso para prisão desde 2025
       if(!tt && f >= "2025-01-01" && md <= LIM_RECL_2025) return {est:"ok", txt:`média de ${moedaBR(md)}, abaixo de ${moedaBR(LIM_RECL_2025)}, o limite de 2025 (só na skill); o limite sobe todo ano pelo índice dos benefícios (EC 103, art. 27), então o do ano da prisão não é menor: confira na Portaria; o salário de quem pede não entra nessa conta`, fonte:"campo"};
       if(!tt) return {est:"informar", txt:sem};
       return md <= tt ? {est:"ok", txt:`média de ${moedaBR(md)}${nc ? ` (${nc} competências)` : ""}, dentro do limite de ${moedaBR(tt)} da Portaria do ano da prisão`, fonte:"campo"}
         : {est:"falta", txt:`média de ${moedaBR(md)}, acima do limite de ${moedaBR(tt)} da Portaria do ano da prisão (o Tema 1162/STJ veda flexibilizar, só na skill)`, fonte:"campo"}; }},
    {id:"vedacoes_recluso", rot:"Na prisão, o preso recebe salário da empresa, auxílio por incapacidade, pensão, salário-maternidade, aposentadoria ou abono?",
     base:"Lei 8.213/91, art. 80, caput e § 7º; IN 128/2022, arts. 383, § 3º, 384, 385, 386, 387 e 391, § 2º", conf:"conferido", campos:["rec_vedacao"],
     mede:x=>{ const r = x.v.rec_vedacao || "", f = x.v.dep_fato || "";
       if(!r) return {est:"informar", txt:"informe se o preso recebe salário ou algum benefício (rec_vedacao)"};
       if(r==="Nenhuma") return {est:"ok", txt:"não recebe salário nem benefício; o trabalho do preso em regime fechado, como facultativo, não tira o direito (art. 80, § 7º)", fonte:"campo"};
       if(f && f < CORTE_2019 && /Pensão|Salário-maternidade/.test(r)) return {est:"ok", txt:`${r.toLowerCase()}: antes de 18/01/2019 não impedia (IN 128, arts. 384 e 385, par. único)`, fonte:"campo"};
       if(f && f < CORTE_2019 && /incapacidade/.test(r)) return {est:"opcao", txt:"auxílio por incapacidade em prisão anterior a 18/01/2019: opta-se pelo mais vantajoso (IN 128, art. 387)", fonte:"campo"};
       return {est:"impedido", txt:`recebe ${r.toLowerCase()}: não cabe o auxílio-reclusão (art. 80; IN 128, art. 383, § 3º)`, fonte:"campo"}; }},
    {id:"dependente", rot:"Quem pede é dependente do preso? O casamento ou a união começou antes da prisão?",
     base:"Lei 8.213/91, arts. 16, §§ 4º e 5º, e 80; IN 128/2022, arts. 180, 381, 388, 389 e 392, VIII", conf:"conferido",
     campos:["dep_classe","dep_nasc","dep_uniao","dep_classe1","dep_invalido","dep_alimentos","dep_provas_total","dep_provas_24m"],
     mede:x=>{ const v = x.v, f = v.dep_fato, cl = v.dep_classe || "";
       if(f && /^(Cônjuge|Companheiro)/.test(cl) && v.dep_uniao && v.dep_uniao > f)
         return {est:"impedido", txt:`casamento ou união desde ${fmtBarra(v.dep_uniao)}, depois da prisão (${fmtBarra(f)}): não dá direito (IN 128, art. 389)`, fonte:"campo"};
       const c = _depClasse(x, f, "dia da prisão"); if(c.est!=="ok") return c;
       if(cl==="Menor sob guarda") return _guarda;
       if(/^(Cônjuge|Filho|Ex-cônjuge)/.test(cl)) return {...c, txt:`${c.txt}; dependência presumida${/^Cônjuge/.test(cl) ? "; a cota segue a duração da pensão" : ""}`};
       const p = _provas(x, f, "dia da prisão");
       return p.est==="ok" ? {...c, txt:`${c.txt}; ${p.txt}`} : {...p, txt:`${c.txt}; ${p.txt}`}; }},
    {id:"prazo_requerimento", rot:"Já pediu? O pedido tem de sair antes da soltura e, para receber desde a prisão, em até 90 dias (180 para filho menor de 16).",
     base:"IN 128/2022, arts. 381, § 3º, 369 e 392, § 4º; Lei 8.213/91, arts. 74, I, e 80; antes de 18/01/2019, Decreto 3.048/99, art. 116, § 4º (redação anterior)", conf:"conferido", campos:["der","rec_soltura","dep_nasc"],
     mede:x=>{ const s = x.v.rec_soltura;
       if(s && x.der > s) return {est:"impedido", txt:`pedido em ${fmtBarra(x.der)}, depois da soltura (${fmtBarra(s)}): vedado (IN 128, art. 392, § 4º)`, fonte:"campo"};
       const r = _prazo(x, x.v.dep_fato, "dia da prisão", true);
       // F235 · o pedido tem de sair com ele ainda preso
       return s ? {...r, txt:`${r.txt}; pedir antes da soltura (${fmtBarra(s)})`} : x.v.der ? r : {...r, txt:`${r.txt}; e sempre antes de ele sair da prisão (IN 128, art. 392, § 4º)`}; }},
    {id:"valor_maximo", rot:"Quanto vai receber? (Calculado como a pensão, até 1 salário mínimo.)",
     base:"EC 103/2019, art. 27, § 1º; IN 128/2022, arts. 236 e 381, § 4º", conf:"conferido", campos:["dep_fato"],
     mede:x=>{ const f = x.v.dep_fato;
       if(f && f < "2019-11-14") return {est:"info", txt:`prisão em ${fmtBarra(f)}, antes de 14/11/2019: calculado como a pensão por morte, sem o limite de 1 salário mínimo (IN 128, art. 236)`, fonte:"campo"};
       return {est:"info", txt:`calculado como a pensão por morte, limitado a 1 salário mínimo: ${moedaBR(smEm(x.der))} em ${_mesAno(x.der)}${x.der >= "2026-01-01" ? " (valor de 2026 não conferido)" : ""}${f ? "" : "; o limite vale para prisão desde 14/11/2019"}`}; }},
    // F235 · quem recebe junto, por quanto tempo e quando o pagamento para (o auxílio segue as condições da pensão)
    {id:"dependentes_valor", rot:"Quem recebe junto, por quanto tempo, e quando o pagamento para?", base:"Lei 8.213/91, arts. 77, § 2º, V, e 80, caput; EC 103/2019, art. 27, § 1º; IN 128/2022, arts. 390 e 392", conf:"conferido", campos:[],
     mede:x=>{ const f = x.v.dep_fato; if(!f) return {est:"info", txt:"informe a data da prisão"};
       const fs = _depFilhos(x).map(k=>({...k, id: k.nasc ? idadeEm(k.nasc, f) : k.idadeFato})).filter(k=>k.id!=null && k.id < 21);
       const conj = /^(Cônjuge|Companheiro)/.test(x.v.dep_classe||""), nasc = dnIso(x.v.dep_nasc || x.dn || ""), id = nasc ? idadeEm(nasc, f) : null, ps = [];
       if(conj && id!=null){ const tab = f >= "2021-01-01" ? [[22,3],[28,6],[31,10],[42,15],[45,20]] : [[21,3],[27,6],[30,10],[41,15],[44,20]], a = (tab.find(([l])=>id < l)||[0,0])[1];
         ps.push(x.v.dep_uniao && somarAnos(x.v.dep_uniao, 2) > f ? "a parte de quem pede dura só 4 meses: a união começou menos de 2 anos antes da prisão (Lei 8.213, art. 77, § 2º, V, b)"
           : `a parte de quem pede (${id} anos na prisão) dura ${a ? `no máximo ${a} anos` : "sem prazo"}, e só enquanto ele estiver preso no regime fechado (a tabela da pensão, com o marco na prisão: conferir)`); }
       for(const k of fs) ps.push(`${k.curto || fraseClinica(k.nome).split(" ")[0]} (${k.id} ${k.id===1 ? "ano" : "anos"}) recebe até os 21`);
       const n = (conj ? 1 : 0) + fs.length;
       ps.push(`o valor, até 1 salário mínimo (${moedaBR(smEm(x.der))}), se divide em partes iguais${n > 1 ? ` entre os ${n}` : ""}`);
       ps.push("o pagamento para se ele passar ao semiaberto ou ao aberto, sair em livramento condicional, for solto ou fugir (IN 128, art. 392); a cada 90 dias, leve ao INSS o atestado ou a declaração do presídio de que ele continua preso (IN 128, art. 390)");
       return {est:"info", txt:cap1(ps.join("; "))}; }},
  ], {..._CAMPOS_DEP,
    dep_regime:["Regime da prisão", "select", ["","Fechado","Provisória, preventiva ou temporária","Medida de segurança de internação","Internação de adolescente (16 a 18 anos)","Domiciliar ou tornozeleira em regime fechado","Semiaberto","Aberto","Livramento condicional"]],
    dep_teto:["Limite de baixa renda da Portaria do ano da prisão (R$)", "number"],
    rec_certidao:["Certidão judicial do recolhimento à prisão (data e regime)", "select", SN],
    rec_soltura:["Soltura, fuga, progressão ou livramento condicional (data)", "date"],
    rec_vedacao:["Na prisão recebe", "select", ["","Nenhuma","Salário da empresa","Auxílio por incapacidade","Pensão por morte","Salário-maternidade","Aposentadoria","Abono de permanência"]],
    rec_comps_12:["Nos 12 meses antes da prisão, em quantos ele teve salário acima do mínimo (0 = desempregado: é baixa renda)", "number"],
    rec_ultimo_sc:["Último salário de contribuição antes da prisão (só para prisão até 17/01/2019), em R$", "number"],
    ins_reingresso:["Recluso voltou a contribuir depois de perder a qualidade (art. 27-A: 12 desde a volta)", "select", SN],
  }, {resumo:"É pago aos dependentes do segurado de baixa renda preso em regime fechado, nas mesmas condições da pensão por morte. Para prisão desde 18/01/2019, exige 24 contribuições do preso e média salarial dos 12 meses anteriores dentro do limite do ano. O valor não passa de 1 salário mínimo.",
    quando: x=>null});
})();
// ── Revisão, acerto de CNIS e recurso ao CRPS (casos-ouro em testes/cadastro/req-ouro/rev_adm.json) ──
// ══ F232 · revisão de benefício, acerto de CNIS e recurso ao CRPS ═══════════
// Fonte: crm/fase2/docs/REQUISITOS-POR-BENEFICIO.md, seções rev, acerto e crps.
(()=>{
  // número ou texto em reais ("1.621,00"); o CadÚnico grava o número cru ("1621.5"), que não passa pela troca de ponto
  const _num = s => { if(s==null || s==="") return null; if(typeof s==="number" || /^-?\d+(\.\d{1,2})?$/.test(String(s).trim())) return +s;
    const n = +String(s).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."); return isFinite(n) ? n : null; };
  const _plural = (n, um, varios) => `${n} ${n===1 ? um : varios}`;
  const _compBr = ym => ym.split("-").reverse().join("/");
  const _min1 = s => s ? s[0].toLowerCase() + s.slice(1) : s;
  // o prazo que vence sem expediente vai ao 1º dia útil: fim de semana e feriado nacional (Regimento do CRPS, art. 78, § 4º);
  // o proxDiaUtil só pula o fim de semana. O feriado local o colaborador marca (crp_feriado_local)
  const _diaUtil = proxDiaUtilAdm;

  // ── REVISÃO ─────────────────────────────────────────────────────────────
  // a tese escolhida: o rótulo atual "art. 29, II (melhor benefício)" junta duas teses e marca as duas
  const _revTeses = x => { const t = String(x.v.rev_tese||""), s = new Set();
    if(/teto|buraco/i.test(t)) s.add("teto");
    if(/\b29\b/.test(t)) s.add("art29");
    if(/melhor/i.test(t)) s.add("melhor");
    if(/irsm/i.test(t)) s.add("irsm");
    if(/vida toda|\brvt\b/i.test(t)) s.add("rvt");
    if(/concomit|1070/i.test(t)) s.add("concom");
    if(/especial|rural|defici|lc 142|pcd/i.test(t)) s.add("tempo");
    if(/ind[ée]bito|devolu|cobran/i.test(t)) s.add("indebito");
    return s; };
  // o benefício revisto: pelo NB digitado; sem NB, o único do dossiê
  const _revBen = x => { const nb = soDig(x.v.rev_nb), um = a => nb ? a.find(b=>soDig(b.nb)===nb) || null : (a.length===1 ? a[0] : null);
    return {nb, carta: um(x.fd.cartas||[]), ext: um(x.fd.extratos||[]), cnis: um(x.benefCnis||[])}; };
  const _revDatas = x => { const v = x.v, b = _revBen(x), c = b.carta || {}, e = b.ext || {}, cn = b.cnis || {};
    const pega = (...ps) => ps.find(p=>p[0]) || ["", ""];
    const [dib, fDib] = pega([v.rev_dib, "campo"], [isoBr(c.dib||""), "carta de concessão"], [isoBr(e.dib||""), "HISCRE"], [cn.de, "CNIS"]);
    const [ddb, fDdb] = pega([v.rev_ddb, "campo"], [isoBr(c.concessao||""), "carta de concessão"]);
    const [dip, fDip] = pega([v.rev_dip, "campo"], [isoBr(c.dip||""), "carta de concessão"], [isoBr(e.dip||""), "HISCRE"]);
    return {b, dib, fDib, ddb, fDdb, dip, fDip}; };
  // a espécie em dois dígitos: do campo, da carta, do HISCRE ou do CNIS
  const _revCod = x => { const b = _revBen(x), t = String(x.v.rev_especie || (b.carta||{}).especie || (b.ext||{}).especie || (b.cnis||{}).especie || "");
    const m = t.match(/\bB?(\d{2})\b/); if(m) return m[1];
    for(const [rx, k] of [[/invalidez.*acident|acident.*invalidez|permanente.*acident/i,"92"], [/doen[çc]a.*acident|acident.*doen|tempor[áa]ri.*acident/i,"91"],
      [/invalidez|incapacidade permanente/i,"32"], [/aux[íi]lio[- ]doen|incapacidade tempor/i,"31"], [/aux[íi]lio[- ]acidente/i,"36"], [/especial/i,"46"],
      [/professor/i,"57"], [/tempo de (contribui|servi)/i,"42"], [/idade/i,"41"], [/pens[ãa]o/i,"21"], [/reclus/i,"25"], [/defici/i,"87"], [/idoso/i,"88"]])
      if(rx.test(t)) return k;
    return null; };
  // a decadência do art. 103, I: 10 anos do 1º dia do mês seguinte ao primeiro pagamento.
  // Na falta dele, a DIP, a concessão (DDB) e por fim a DIB, que é só estimativa
  function _revDec(x){
    const v = x.v, d = _revDatas(x); let base = null, de = "", fonte = "", est = false;
    if(v.rev_origem_primeiro) [base, de, fonte] = [v.rev_origem_primeiro, "pelo primeiro pagamento do benefício de origem (IN 128, art. 524, § 7º)", "campo"];
    else if(v.rev_primeiro) [base, de, fonte] = [v.rev_primeiro, "pelo primeiro pagamento", "campo"];
    else if(d.dip) [base, de, fonte] = [d.dip, "pela DIP", d.fDip];
    else if(d.ddb) [base, de, fonte] = [d.ddb, "pela concessão (DDB)", d.fDdb];
    else if(d.dib) [base, de, fonte, est] = [d.dib, "pela DIB", d.fDib, true];
    if(!base) return null;
    // a concessão: a DDB; sem ela, o primeiro pagamento (a concessão vem antes dele). Na pensão derivada, a do benefício de origem
    const conc = v.rev_origem_primeiro ? base : d.ddb || base;
    const notas = []; let ini = somarMeses(base.slice(0,7)+"-01", 1);
    if(conc < "1997-06-28" && ini < "1997-08-01"){ ini = "1997-08-01"; notas.push("concedido antes de 28/06/1997: conta de 01/08/1997 (Tema 313/STF)"); }
    // art. 591: o menor de 16 (§§ 1º e 2º) e o incapaz até 02/01/2016 (§ 3º, "observado o § 1º"): vale o início mais tardio
    const f16 = x.dn ? diaSeguinte(somarAnos(x.dn, 16)) : null;
    if(f16 && ini < f16){ ini = f16; notas.push(`não corre contra menor de 16: começa no dia seguinte aos 16 anos (IN 128, art. 591, § 2º)`); }
    if(v.rev_menor_incapaz==="Sim" && ini < "2016-01-03"){ ini = "2016-01-03"; notas.push(`incapaz: corre desde 03/01/2016 (IN 128, art. 591, § 3º)${x.dn ? "" : "; se era menor de 16, informe o nascimento"}`); }
    const fim = somarAnos(ini, 10);
    return {...d, base, de, fonte, est, conc, ini, fim, notas, meses: (Date.parse(fim) - Date.parse(x.der)) / 864e5 / 30.4375, consumada: x.der > fim};
  }
  // decadência consumada só pela DIB é estimativa: o 1º pagamento pode vir anos depois (concessão judicial com DIB
  // retroativa), então não impede, pede o dado. Devolve null quando o prazo está aberto
  const _revDecaiu = (d, txt) => !d || !d.consumada ? null : d.est
    ? {est:"informar", txt:`pela DIB (estimativa), o prazo teria acabado em ${fmtBarra(d.fim)}: informe o primeiro pagamento (HISCRE ou carta) antes de descartar`, fonte:d.fonte}
    : {est:"impedido", txt, fonte:d.fonte};
  // faixas da skill decadencia-revisao-previdenciaria: < 6 meses, 6 a 12, 12 a 24
  const _revFaixa = m => m < 6 ? "risco" : m < 12 ? "falta" : m < 24 ? "info" : "ok";
  const _revFalta = m => m < 1 ? "menos de 1 mês" : _plural(Math.floor(m), "mês", "meses");
  // os vínculos ao mesmo tempo no período de cálculo (07/1994 até a DIB), pelo CNIS
  const _revConcom = (x, dib) => { const ate = ymDe(dib || x.der), n = new Map();
    for(const v of ((x.g||{}).vinculos||[]).filter(v=>v.tipo!=="Benefício" && v.inicio)){
      let a = ymDe(isoBr(v.inicio)); const b = v.fim ? ymDe(isoBr(v.fim)) : v.ultRemun ? chaveComp(v.ultRemun) : "";
      if(!a || !b) continue; if(a < "1994-07") a = "1994-07";
      for(let k = a; k <= b && k <= ate; k = ymDe(somarMeses(k+"-01", 1))) n.set(k, (n.get(k)||0) + 1);
    }
    const ms = [...n].filter(([, q])=>q > 1).map(([k])=>k).sort();
    return ms.length ? {meses: ms.length, de: _compBr(ms[0]), ate: _compBr(ms[ms.length-1])} : null; };
  const _revProcRev = x => (x.fd.processos||[]).filter(p=>/revis/i.test(p.servico||"")).sort((a, b)=>(isoBr(b.entrada||"")||"").localeCompare(isoBr(a.entrada||"")||""))[0] || null;
  // F235 · o especial do PPP antes da DIB, em períodos contínuos por lugar, e o ganho da revisão: o tempo da concessão (resumo
  // do INSS ou carta), o convertido (só até 13/11/2019) e o efeito na renda (EC 103, art. 26, §§ 2º e 5º) ou, na B42 de antes da
  // Reforma, nos pontos que tiram o fator previdenciário (Lei 8.213, art. 29-C)
  const _revCerca = d => { const ms = Math.floor(d/30.4375 + 0.25); return anosMeses(Math.floor(ms/12), ms % 12); };
  const _revAnos = d => { const y = Math.floor(d/365); return anosMeses(y, Math.min(11, Math.floor((d - y*365)/30))); };
  const _revVidaToda = x => _revTeses(x).has("rvt") || /vida toda/i.test(relatoDe(x.c));
  function _revGanho(x){
    const dt = _revDatas(x), dib = dt.dib, cod = _revCod(x);
    const esp = (x.temposAuto ? x.tempos : temposAutomaticos(x)).filter(r=>r.nat==="especial" && r.de && (!dib || r.de < dib));
    if(!esp.length) return null;
    const ls = esp.map(({auto, ...r})=>({...r, ate: r.ate && dib && r.ate > dib ? dib : r.ate || dib || x.hoje}));
    const tt = admTotaisDe(ls, x.sx, dib || x.hoje); if(!tt.bonus) return null;
    const per = [];
    for(const r of ls){ const u = per[per.length-1];
      if(u && u.onde===r.onde && diaSeguinte(u.ate) >= r.de){ if(r.ate > u.ate) u.ate = r.ate; } else per.push({onde:r.onde, de:r.de, ate:r.ate}); }
    const dbs = (x.fd.ppps||[]).flatMap(p=>p.riscos||[]).filter(k=>k.db!=null).map(k=>k.db);
    const epiInss = (x.fd.resumos||[]).some(r=>/N[ÃA]O ENQUADRADO[^\n]*EPI/i.test(String((r.anexo||{}).texto||"")));
    const res = (x.fd.resumos||[]).find(r=>r.tempo && (!dt.b.nb || !r.nb || r.nb===dt.b.nb));
    const ct = String(((dt.b.carta||{}).anexo||{}).texto||"").match(/tempo (?:de contribui[çc][ãa]o )?considerado:?\s*(\d+)\s*anos?,?\s*(\d+)\s*m[eê]s(?:es)?,?\s*e\s*(\d+)\s*dias?/i);
    const base = res ? res.tempo.anos*365 + res.tempo.meses*30 + res.tempo.dias : ct ? +ct[1]*365 + +ct[2]*30 + +ct[3] : null;
    const novo = base!=null ? base + tt.bonus : null, fator = x.sx==="F" ? "1,2" : "1,4";
    const periodos = per.map(p=>`${p.onde}, ${fmtBarra(p.de)} a ${fmtBarra(p.ate)}`).join("; ");
    const agente = dbs.length ? `ruído de ${String(Math.max(...dbs)).replace(".", ",")} dB, acima do limite de cada época` : "agente nocivo do PPP";
    const epi = !dbs.length ? "" : `${epiInss ? "o INSS não enquadrou por causa do EPI, que" : "o EPI"} não afasta o ruído acima do limite (Enunciado 12, II, do CRPS)${per.some(p=>p.de < "1998-12-03") ? " e, antes de 03/12/1998, não afasta nenhum agente (item III)" : ""}`;
    let efeito = "";
    if(base!=null){
      const der = isoBr((dt.b.carta||{}).der||"") || dib;
      if(dib && dib >= EC103 && /^4[12]$/.test(cod||"")){
        const lim = x.sx==="F" ? 15 : 20, pct = d => Math.min(100, 60 + 2*Math.max(0, Math.floor(d/365) - lim));
        efeito = `: o tempo vai de ${_revAnos(base)} para cerca de ${_revAnos(novo)}, e a renda, de ${pct(base)} % para ${pct(novo)} % da média (EC 103, art. 26, § ${x.sx==="F" ? "5º" : "2º"}; conferir no cálculo)`;
      } else if(cod==="42" && der && der < EC103 && x.dn){
        const idade = anosEntre(x.dn, der), pts = idade + novo/365, im = Math.floor(idade*12 + 1e-6);
        const ex = [95, 85][x.sx==="F" ? 1 : 0] + ["2018-12-31","2020-12-31","2022-12-31","2024-12-31","2026-12-31"].filter(d=>d <= der).length;
        efeito = `: o tempo na DER (${fmtBarra(der)}) vai de ${_revAnos(base)} para cerca de ${_revAnos(novo)}; com ${anosMeses(Math.floor(im/12), im%12)} de idade, são cerca de ${(Math.floor(pts*10)/10).toFixed(1).replace(".", ",")} pontos (${ex} exigidos em ${der.slice(0,4)})`
          + (pts >= ex && novo >= (x.sx==="F" ? 30 : 35)*365 ? `, o que tira o fator previdenciário (Lei 8.213, art. 29-C, ${x.sx==="F" ? "II" : "I"}; conferir no cálculo)` : "; o fator previdenciário continua, menor (conferir no cálculo)");
      } else efeito = `: o tempo vai de ${_revAnos(base)} para cerca de ${_revAnos(novo)} (conferir no cálculo)`;
    }
    return {periodos, agente, epi, epiInss, bonus:tt.bonus, esp:tt.especial, base, novo, efeito,
      curto: `${periodos} (${agente}); convertido (×${fator}, só até 13/11/2019), soma cerca de ${_revCerca(tt.bonus)}${efeito}`};
  }
  const _revEsp = () => ["","B21 Pensão por morte","B25 Auxílio-reclusão","B31 Auxílio por incapacidade temporária","B32 Aposentadoria por incapacidade permanente",
    "B36 Auxílio-acidente previdenciário","B41 Aposentadoria por idade","B42 Aposentadoria por tempo de contribuição","B46 Aposentadoria especial","B57 Aposentadoria do professor",
    "B87 BPC da pessoa com deficiência","B88 BPC do idoso","B91 Auxílio por incapacidade acidentário","B92 Aposentadoria por incapacidade acidentária","B94 Auxílio-acidente acidentário","Outra"];

  registrarReq("rev", [
    {id:"beneficio_concedido", rot:"Existe um benefício já concedido para revisar?", base:"IN 128, art. 583, caput e §§ 1º e 2º; IN 128, art. 524, § 7º; Tema 313/STF, item I",
     conf:"conferido", campos:["rev_nb","rev_especie"],
     mede:x=>{ const b = _revBen(x), cod = _revCod(x), pen = cod==="21" ? "; na pensão, o benefício de origem também se revê, no prazo dele e só para ajustar o valor (IN 128, art. 524, §§ 7º e 10)" : "";
       const ach = b.carta ? ["carta de concessão", b.carta] : b.ext ? ["HISCRE", b.ext] : b.cnis ? ["CNIS", b.cnis] : null;
       if(ach) return {est:"ok", txt:`NB ${ach[1].nb}${cod ? `, B${cod}` : ""}${ach[1].dib || ach[1].de ? `, DIB ${fmtBarra(isoBr(ach[1].dib || ach[1].de))}` : ""}${pen}`, fonte:ach[0]};
       if(b.nb) return {est:"ok", txt:`NB ${b.nb} informado; traga a carta de concessão e o HISCRE${pen}`, fonte:"campo"};
       const n = (x.fd.cartas||[]).length + (x.fd.extratos||[]).length;
       if(n > 1) return {est:"informar", txt:`o dossiê tem ${n} documentos de benefício: informe o NB a revisar`};
       if((x.fd.processos||[]).some(p=>(p.comunicacoes||[]).some(c=>c.contra)))
         return {est:"falta", txt:"o dossiê só mostra indeferimento: sem benefício concedido, o pedido com elemento novo vira novo requerimento (art. 583, § 1º), e a concessão não decai (Tema 313, I)", fonte:"cópia do processo"};
       return {est:"informar", txt:"informe o NB ou traga a carta de concessão; sem benefício concedido, o caso é de concessão, que não decai (Tema 313, I)"}; }},
    {id:"decadencia_10_anos", rot:"Ainda dá tempo de pedir a revisão (10 anos)?", base:"Lei 8.213/91, art. 103, caput e I; IN 128, arts. 591 e 592; Tema 975/STJ; Tema 313/STF",
     conf:"conferido", campos:["rev_primeiro","rev_dip","rev_ddb","rev_dib","rev_menor_incapaz","rev_origem_primeiro"],
     mede:x=>{ const ts = _revTeses(x), d = _revDec(x);
       if(ts.size===1 && ts.has("indebito")) return {est:"info", txt:"a cobrança do INSS não é revisão do ato: vale o prazo da cobrança (5 anos, IN 128, art. 595)"};
       if(!d) return {est:"informar", txt:"informe o primeiro pagamento, a DIP ou a DIB (ou traga a carta de concessão ou o HISCRE)"};
       const por = `${d.de} em ${fmtBarra(d.base)}${d.est ? " (estimativa: a DIB vem antes do primeiro pagamento; traga o HISCRE ou a carta)" : ""}`;
       const nota = d.notas.length ? "; " + d.notas.join("; ") : "";
       if(ts.has("teto")) return {est:"info", txt:`readequação ao teto: a decadência não se aplica (só na skill), só as parcelas prescrevem (Tema 1005/STJ); pelo art. 103 iria até ${fmtBarra(d.fim)}`, fonte:d.fonte};
       if(d.consumada) return d.est
         ? {est:"informar", txt:`pela DIB, os 10 anos de ${fmtBarra(d.ini)} a ${fmtBarra(d.fim)} já teriam acabado, ${por}${nota}; informe o primeiro pagamento antes de descartar`, fonte:d.fonte, quando:d.fim}
         : {est:"impedido", txt:`decadência consumada: 10 anos de ${fmtBarra(d.ini)} a ${fmtBarra(d.fim)}, ${por}${nota}; não se suspende nem se interrompe (Tema 975/STJ)`, fonte:d.fonte, quando:d.fim};
       // F235 · pelo primeiro pagamento sai o prazo legal; a DIP dá a data mais cedo, que é a de agir; a DIB não serve
       const dD = /primeiro pagamento/.test(d.de) && d.dip && d.dip < d.base ? _revDec({...x, v:{...x.v, rev_primeiro:"", rev_origem_primeiro:""}}) : null, cedo = dD && dD.fim < d.fim ? dD : null;
       const semDib = d.dib && d.dib < (d.dip || d.base) && !d.est ? `; a DIB (${fmtBarra(d.dib)}) não serve para esta conta` : "";
       return {est:_revFaixa((cedo || d).meses), txt: cedo ? `prazo até ${fmtBarra(cedo.fim)} para agir (faltam ${_revFalta(cedo.meses)}), pela DIP (${fmtBarra(d.dip)}), a data mais cedo; o prazo legal vai até ${fmtBarra(d.fim)}, contado de ${fmtBarra(d.ini)}, ${por}${semDib}${nota}`
         : `prazo até ${fmtBarra(d.fim)} (faltam ${_revFalta(d.meses)}), contado de ${fmtBarra(d.ini)}, ${por}${semDib}${nota}`, fonte:d.fonte, quando:(cedo || d).fim}; }},
    {id:"decadencia_beneficio_antigo", rot:"O benefício foi concedido antes de 28/06/1997?", base:"Tema 313/STF (RE 626.489), item II",
     conf:"conferido", campos:["rev_dib","rev_ddb"],
     mede:x=>{ const d = _revDec(x), conc = d && d.conc;
       if(!conc) return {est:"informar", txt:"informe a DIB ou a data da concessão (ou traga a carta)"};
       const em = `${d.conc===d.ddb && !x.v.rev_origem_primeiro ? "concedido" : `${d.de.replace(/^pel[ao] /, "")}`} em ${fmtBarra(conc)}`, f = d.conc===d.ddb ? d.fDdb : d.fonte;
       if(conc >= "1997-06-28") return {est:"info", txt:`${em}, depois de 28/06/1997: vale a regra geral do prazo`, fonte:f};
       if(_revTeses(x).has("teto")) return {est:"info", txt:`${em}: o prazo correu de 01/08/1997 a 01/08/2007, mas a readequação ao teto não decai (só na skill)`, fonte:f};
       if(!d.consumada) return {est:_revFaixa(d.meses), txt:`${em}: o prazo contaria de 01/08/1997 (Tema 313/STF), mas o art. 591 da IN 128 o leva a ${fmtBarra(d.fim)}`, fonte:f};
       if(d.est) return {est:"informar", txt:`pela DIB de ${fmtBarra(conc)} (estimativa), seria anterior a 28/06/1997 e o prazo teria acabado em 01/08/2007 (Tema 313/STF): informe a data da concessão ou o primeiro pagamento`, fonte:f};
       return {est:"impedido", txt:`${em}, antes de 28/06/1997: o prazo correu de 01/08/1997 a 01/08/2007 (Tema 313/STF); só tese sem decadência, como a readequação ao teto`, fonte:f}; }},
    {id:"pedido_revisao_anterior", rot:"Já pediu revisão ao INSS ou à Justiça? Quando, e quando soube da resposta?", base:"Lei 8.213/91, art. 103, II; Tema 1370/STJ (afetado, sem tese); ADI 6096",
     conf:"conferido", campos:["rev_pedido_adm","rev_pedido_data","rev_pedido_ciencia","rev_acao_judicial"],
     mede:x=>{ const v = x.v, pr = _revProcRev(x), tema = "Tema 1370/STJ em julgamento, sem tese";
       if(v.rev_acao_judicial==="Sim") return {est:"impedido", txt:"já existe ação sobre esta revisão: o pedido não se repete, siga no processo"};
       const pedido = v.rev_pedido_data || (pr ? isoBr(pr.entrada||"") : ""), ci = v.rev_pedido_ciencia || (pr && (!pr.status || /conclu/i.test(pr.status)) ? isoBr(pr.atualizado||"") : "");
       const fonte = v.rev_pedido_data || v.rev_pedido_ciencia ? "campo" : pr ? "cópia do processo de revisão" : undefined;
       if(!pedido && !ci) return v.rev_pedido_adm==="Não" ? {est:"info", txt:"sem pedido de revisão anterior: vale o prazo do art. 103, I"}
         : {est:"informar", txt:"já pediu revisão ao INSS? Informe a data do pedido e a da ciência da decisão"};
       if(!ci) return {est:"informar", txt:`pedido de revisão em ${fmtBarra(pedido)}: informe a ciência da decisão (o art. 103, II, conta dela)`, fonte};
       const fimII = somarAnos(ci, 10), d = _revDec(x);
       if(d && d.consumada && d.est) return _revDecaiu(d);
       if(d && d.consumada && x.der > fimII) return {est:"impedido", txt:`os dois prazos acabaram: o do art. 103, I, em ${fmtBarra(d.fim)}, e o do inciso II, da ciência em ${fmtBarra(ci)}, em ${fmtBarra(fimII)}`, fonte};
       if(d && d.consumada) return {est:"divergente", txt:`o prazo do art. 103, I, acabou em ${fmtBarra(d.fim)}; o do inciso II, da ciência em ${fmtBarra(ci)}, iria até ${fmtBarra(fimII)}`, fonte,
         div:{inss:`art. 103, I: decadência consumada em ${fmtBarra(d.fim)}`, judicial:`art. 103, II: 10 anos da ciência, até ${fmtBarra(fimII)}; prazo autônomo em discussão (${tema})`}};
       if(d && d.meses < 12) return {est:"risco", txt:`faltam ${_revFalta(d.meses)} do prazo original (até ${fmtBarra(d.fim)}): protocole a revisão e ajuíze ao mesmo tempo, sem contar com o inciso II (${tema})`, fonte};
       return {est:"info", txt:`ciência em ${fmtBarra(ci)}: o art. 103, II, daria até ${fmtBarra(fimII)}, mas não conte com ele (${tema})${d ? `; o prazo original vai até ${fmtBarra(d.fim)}` : ""}`, fonte}; }},
    {id:"prescricao_5_anos", rot:"Quantos anos de atrasados dá para receber?", base:"Lei 8.213/91, art. 103, parágrafo único; IN 128, arts. 585 a 587, 591 e 595; Tema 1005/STJ",
     conf:"conferido", campos:["rev_pedido_data","rev_novo_elemento"],
     mede:x=>{ const v = x.v, ts = _revTeses(x), ref = v.rev_pedido_data || x.der, desde = somarAnos(ref, -5);
       // F235 · o benefício concedido há menos de 5 anos não perde atrasado; e o marco é o pedido de revisão (DPR)
       const dtR = _revDatas(x), dibR = dtR.dib, dipR = dtR.dip || dibR;
       const ps = [dibR && dibR >= desde ? `todos os atrasados desde a DIB (${fmtBarra(dibR)}) estão dentro dos 5 anos` : `atrasados só desde ${fmtBarra(desde)}, 5 anos antes do pedido de revisão (DPR)${v.rev_pedido_data ? "" : ", se pedir hoje"} em ${fmtBarra(ref)}`];
       // F235 · com documento novo os efeitos ficam na DPR, sem atrasados antes dela; a regra da DIP é a do art. 586, § 1º (o 587 só define o elemento novo)
       if(v.rev_novo_elemento==="Sim") ps.splice(0, 1, "com documento novo, os efeitos administrativos vão à DPR (IN 128, art. 586, caput): não há atrasados de antes do pedido de revisão",
         `se a cópia do processo mostrar o documento no pedido, voltam à DIP${dipR ? ` (${fmtBarra(dipR)})` : ""}, só desde ${fmtBarra(desde)} (5 anos antes do pedido de revisão)`,
         "na Justiça, documento que o INSS nunca viu leva à extinção sem julgamento do mérito (Tema 1124/STJ, item 1.6): primeiro o pedido de revisão no INSS");
       const ef = v.rev_novo_elemento==="Não" ? `sem documento novo, vão à DIP${dipR ? ` (${fmtBarra(dipR)})` : ""}, observada a prescrição (IN 128, art. 586, § 1º)` : "";
       if(ef) ps.push(ef);
       if(ts.has("teto")) ps.push("na readequação ao teto, a prescrição conta do ajuizamento da ação individual, e não da ação civil pública (Tema 1005/STJ)");
       if(x.dn && somarAnos(x.dn, 16) > desde) ps.push(`não corre contra menor de 16 (até ${fmtBarra(somarAnos(x.dn, 16))}; IN 128, art. 591)`);
       if(v.rev_menor_incapaz==="Sim" && desde < "2016-01-03") ps.push("contra o incapaz não correu até 02/01/2016 (IN 128, art. 591, § 3º)");
       if(!v.rev_novo_elemento && !ts.has("teto")) ps.push("informe se leva documento novo: muda o início dos efeitos");
       return {est: v.rev_novo_elemento || ts.has("teto") ? "info" : "informar", txt:ps.join("; "), fonte: v.rev_pedido_data ? "campo" : undefined}; }},
    {id:"risco_reabrir_concessao", rot:"É a primeira revisão pedida ao INSS? Ela reabre a concessão inteira", base:"IN 128, arts. 584 e 588",
     conf:"conferido", campos:["rev_pedido_adm"],
     mede:x=>{ const v = x.v, pr = _revProcRev(x);
       if(v.rev_pedido_adm==="Sim" || pr) return {est:"ok", txt:"já houve revisão a pedido: a próxima analisa só o objeto (IN 128, art. 584)", fonte: v.rev_pedido_adm==="Sim" ? "campo" : "cópia do processo de revisão"};
       // F235 · a reabertura é cautela para o advogado pesar, e não requisito que falta: não barra o caso
       if(v.rev_pedido_adm==="Não") return {est:"info", txt:"atenção: primeira revisão a pedido, e o INSS reanalisa toda a concessão (art. 584); confira os pontos fracos antes de pedir (o prejuízo só vale depois do contraditório, art. 588)"};
       return {est:"informar", txt:"já pediu revisão ao INSS antes? A primeira reabre a concessão inteira (art. 584)"}; }},
    {id:"vedacao_troca_especie", rot:"A revisão quer trocar a espécie da aposentadoria?", base:"IN 128, art. 589, caput e §§ 1º a 3º",
     conf:"conferido", campos:["rev_especie","rev_saque_fgts"],
     mede:x=>{ const cod = _revCod(x), ts = _revTeses(x), fgts = x.v.rev_saque_fgts==="Sim" ? " e do saque do FGTS ou do PIS" : "";
       if(!cod) return {est:"informar", txt:"informe a espécie do benefício (ou traga a carta)"};
       if(!["41","42","46","57"].includes(cod)) return {est:"info", txt:`B${cod} não é aposentadoria por idade, tempo ou especial: a vedação não se aplica`};
       if(ts.has("tempo") && /especial/i.test(x.v.rev_tese||"") && cod==="42"){ const g = _revGanho(x);
         // F235 · com o PPP lido, o especial que não chega a 25 anos não vira aposentadoria especial: a revisão só converte o tempo
         if(g && g.esp < 25*365) return {est:"info", txt:`não vira aposentadoria especial: são ${_revAnos(g.esp)} de especial, menos de 25 anos; a revisão converte o tempo e a espécie B42 fica (art. 589)`, fonte:"PPP do dossiê"};
         return {est:"ok", txt:"a revisão da aposentadoria por tempo que reconhece especial pode virar B46, se o especial completar o tempo (art. 589, § 2º), com efeitos na DPR (§ 3º)"}; }
       if(ts.has("melhor")) return {est:"falta", txt:`depois do 1º pagamento${fgts} a espécie só muda se, na DER, já havia direito a mais de uma e não lhe ofereceram a opção (art. 589, § 1º): mostre as duas na DER`};
       return {est:"info", txt:`a espécie B${cod} fica: depois do 1º pagamento${fgts} não se transforma a aposentadoria (art. 589)`}; }},
    {id:"tese_teto", rot:"Readequação ao teto: o salário de benefício foi limitado ao teto antes de 2004?", base:"Tema 76/STF (RE 564.354); Tema 930/STF (RE 937.595); Tema 1005/STJ",
     conf:"conferido", campos:["rev_tese","rev_teto_glosa","rev_dib"],
     mede:x=>{ const ts = _revTeses(x), dib = _revDatas(x).dib, cabe = dib && dib <= "2003-12-31";
       const bn = dib >= "1988-10-05" && dib <= "1991-04-05" ? "; buraco negro (05/10/1988 a 05/04/1991): aferido caso a caso (Tema 930/STF)" : "";
       if(!ts.has("teto")) return {est:"info", txt: !dib ? "só para benefício anterior às ECs 20/1998 e 41/2003 limitado ao teto"
         : cabe ? `DIB ${fmtBarra(dib)}: cabe se o salário de benefício foi limitado ao teto` : `DIB ${fmtBarra(dib)}, depois da EC 41/2003: a readequação não cabe`};
       if(!dib) return {est:"informar", txt:"informe a DIB (ou traga a carta)"};
       if(!cabe) return {est:"impedido", txt:`DIB ${fmtBarra(dib)}, depois das ECs 20/1998 e 41/2003: a readequação não cabe (Tema 76/STF)`};
       if(x.v.rev_teto_glosa==="Não") return {est:"impedido", txt:`sem glosa pelo teto na concessão não há readequação${bn}`};
       if(x.v.rev_teto_glosa==="Sim") return {est:"ok", txt:`DIB ${fmtBarra(dib)} com o salário de benefício limitado ao teto: a renda segue os novos tetos das ECs 20 e 41 (Tema 76/STF)${bn}`};
       return {est:"informar", txt:`DIB ${fmtBarra(dib)}: confira na memória de cálculo se o salário de benefício foi limitado ao teto (a carta só traz a RMI)${bn}`}; }},
    {id:"tese_teto_sem_decadencia", rot:"Na readequação ao teto não se perde o prazo de 10 anos", base:"Lei 8.213/91, art. 103; jurisprudência do STJ (1ª e 2ª Turmas): a readequação aos tetos não se sujeita à decadência",
     conf:"conferido", campos:["rev_tese"],
     mede:x=> _revTeses(x).has("teto")
       ? {est:"ok", txt:"a readequação não revê o ato de concessão: não decai, só as parcelas prescrevem; a revisão da renda inicial (art. 144 da Lei 8.213; art. 26 da Lei 8.870) continua sujeita à decadência"}
       : {est:"info", txt:"vale só para a readequação ao teto"}},
    {id:"tese_art29_ii", rot:"Art. 29, II: a média usou os 80% maiores salários?", base:"Lei 8.213/91, art. 29, II (Lei 9.876/99); EC 103/2019, art. 26; Tema 704/STJ",
     conf:"conferido", campos:["rev_tese","rev_especie","rev_dib","rev_media_100"],
     mede:x=>{ const ts = _revTeses(x), cod = _revCod(x), dib = _revDatas(x).dib, d = _revDec(x);
       const esp = ["31","32","46","36","94","91","92"].includes(cod), jan = dib && dib >= "1999-11-29" && dib <= "2019-11-12";
       if(!ts.has("art29")) return {est:"info", txt: cod && dib ? `B${cod} com DIB ${fmtBarra(dib)}: ${esp && jan ? "dentro" : "fora"} da tese do art. 29, II`
         : "média dos 80% maiores: B31, B32, B46 e auxílio-acidente com DIB de 29/11/1999 a 12/11/2019"};
       if(!cod || !dib) return {est:"informar", txt:"informe a espécie e a DIB (ou traga a carta)"};
       if(cod==="21") return {est:"informar", txt:"na pensão a tese entra só por reflexo: revise o benefício de origem (espécie, DIB e prazo dele)"};
       if(!esp) return {est:"impedido", txt:`B${cod}: o art. 29, II, vale para incapacidade, especial e auxílio-acidente (art. 18, I, a, d, e e h)`};
       if(!jan) return {est:"impedido", txt:`DIB ${fmtBarra(dib)} fora da janela de 29/11/1999 a 12/11/2019 (depois da EC 103 a média é de 100%, art. 26)`};
       { const dc = d && _revDecaiu(d, `dentro da tese, mas a decadência se consumou em ${fmtBarra(d.fim)}`); if(dc) return dc; }
       // a tese só existe se a memória de cálculo usou todos os salários: o erro em massa (2002 a 2009) já decaiu
       const t704 = cod==="32" || cod==="92" ? "; a invalidez vinda de auxílio sem volta ao trabalho é 100% do salário de benefício dele (Tema 704/STJ)" : "";
       if(x.v.rev_media_100==="Não") return {est:"impedido", txt:`a memória de cálculo já usou os 80% maiores salários: não há o que revisar pelo art. 29, II${t704}`, fonte:"campo"};
       if(x.v.rev_media_100==="Sim") return {est:"ok", txt:`B${cod} com DIB ${fmtBarra(dib)} e média de todos os salários na memória de cálculo: cabe a média dos 80% maiores, sem fator${t704}`, fonte:"campo"};
       return {est:"informar", txt:`B${cod} com DIB ${fmtBarra(dib)}, dentro da tese: confira na memória de cálculo se a média usou todos os salários (100%) ou só os 80% maiores${t704}`}; }},
    {id:"tese_melhor_beneficio", rot:"Melhor benefício: já tinha direito antes, com renda maior?", base:"Tema 334/STF (RE 630.501); Enunciado 1 do CRPS; IN 128, art. 589, § 1º",
     conf:"conferido", campos:["rev_tese","rev_melhor_data"],
     mede:x=>{ const ts = _revTeses(x), dt = x.v.rev_melhor_data, d = _revDec(x);
       if(!ts.has("melhor")) return {est:"info", txt:"o INSS deve conceder o melhor benefício e orientar o segurado (Enunciado 1 do CRPS; Tema 334/STF)"};
       { const dc = d && _revDecaiu(d, `a tese respeita a decadência: consumada em ${fmtBarra(d.fim)}`); if(dc) return dc; }
       if(!dt) return {est:"informar", txt:"informe a data em que já tinha todos os requisitos com renda maior"};
       const car = x.ct ? carenciaAte(x, dt) : null, id = x.dn ? idadeEm(x.dn, dt) : null;
       return {est:"falta", txt:`em ${fmtBarra(dt)}: ${car!=null ? `${car} contribuições pelo CNIS` : "CNIS não lido"}${id!=null ? `, ${id} anos` : ""}; confira todos os requisitos da espécie nessa data (Tema 334/STF)${ts.has("art29") ? "; a opção escolhida junta o art. 29, II, e o melhor benefício, que são teses diferentes" : ""}`, fonte: car!=null ? "CNIS" : undefined}; }},
    {id:"tese_concomitantes", rot:"Trabalhou em dois lugares ao mesmo tempo antes de aposentar (Tema 1070)?", base:"Tema 1070/STJ (REsp 1.870.793); Lei 8.213/91, art. 32; IN 128, art. 225, § 1º",
     conf:"conferido", campos:["rev_tese","rev_dib"],
     mede:x=>{ const ts = _revTeses(x), dib = _revDatas(x).dib, d = _revDec(x), cc = _revConcom(x, dib);
       if(!ts.has("concom")) return {est:"info", txt: cc ? `o CNIS mostra ${cc.meses} meses com duas atividades ao mesmo tempo (${cc.de} a ${cc.ate})` : "soma dos salários de atividades ao mesmo tempo (Tema 1070/STJ)", fonte: cc ? "CNIS" : undefined};
       if(!dib) return {est:"informar", txt:"informe a DIB (ou traga a carta)"};
       if(dib < "1999-11-29" || dib > "2019-06-17") return {est:"impedido", txt:`DIB ${fmtBarra(dib)} fora da janela de 29/11/1999 a 17/06/2019 (a partir de 18/06/2019 o INSS já soma: IN 128, art. 225, § 1º)`};
       { const dc = d && _revDecaiu(d, `dentro da janela, mas a decadência se consumou em ${fmtBarra(d.fim)}`); if(dc) return dc; }
       if(!x.g) return {est:"informar", txt:"leia o CNIS para achar os vínculos ao mesmo tempo no período de cálculo"};
       if(!cc) return {est:"falta", txt:"o CNIS não mostra dois vínculos ao mesmo tempo entre 07/1994 e a DIB", fonte:"CNIS"};
       return {est:"ok", txt:`${cc.meses} meses com duas atividades ao mesmo tempo (${cc.de} a ${cc.ate}); não vale para quem contribuiu por uma só por causa do teto (art. 32, §§ 1º e 2º)`, fonte:"CNIS"}; }},
    {id:"tese_rvt_vencida", rot:"Revisão da vida toda: tese perdida, não ajuizar", base:"Tema 1102/STF (RE 1.276.977); ADIs 2.110 e 2.111",
     conf:"conferido", campos:["rev_tese","rev_acao_judicial"],
     mede:x=>{ const dib = _revDatas(x).dib;
       if(!_revTeses(x).has("rvt")) return {est:"info", txt:"revisão da vida toda: tese vencida (Tema 1102/STF, trânsito em 15/05/2026), não ajuizar"};
       if(x.v.rev_acao_judicial==="Sim") return {est:"risco", txt:"ação já ajuizada: sustente só a modulação do Tema 1102 (o recebido por decisões até 05/04/2024 não se devolve; sem honorários, custas e perícias nas ações pendentes nessa data)"};
       return {est:"impedido", txt:`tese vencida: o art. 3º da Lei 9.876/1999 é obrigatório (Tema 1102/STF, trânsito em 15/05/2026); não ajuizar${dib && dib < "1999-11-29" ? `; com DIB ${fmtBarra(dib)}, anterior a 29/11/1999, o caso é de direito adquirido comum` : ""}`}; }},
    {id:"tese_irsm", rot:"IRSM de fevereiro de 1994 (39,67%)", base:"Lei 8.880/1994, art. 21, § 1º; Lei 10.999/2004, art. 1º",
     conf:"conferido", campos:["rev_tese","rev_dib"],
     mede:x=>{ const dib = _revDatas(x).dib, d = _revDec(x);
       if(!_revTeses(x).has("irsm")) return {est:"info", txt:"IRSM de 02/1994: os benefícios alcançados pela tese já decaíram"};
       if(!dib) return {est:"informar", txt:"informe a DIB (ou traga a carta)"};
       if(dib < "1994-03-01") return {est:"impedido", txt:`DIB ${fmtBarra(dib)}: a tese é só para DIB a partir de 03/1994`};
       if(!d || d.consumada) return {est:"impedido", txt:`decadência consumada${d ? ` em ${fmtBarra(d.fim)}` : ""}; a MP 201/2004 não interrompeu o prazo (Tema 375/TNU, só na skill)`};
       return {est:"ok", txt:`prazo aberto até ${fmtBarra(d.fim)}, o que é improvável: confira o primeiro pagamento`}; }},
    {id:"tese_tempo_nao_computado", rot:"Falta incluir tempo especial, rural ou com deficiência? Tem a prova?", base:"Temas 975 e 1124/STJ; Lei 8.213/91, art. 55, § 3º; IN 128, arts. 307, 586 e 589, §§ 2º e 3º",
     conf:"conferido", campos:["rev_tese","rev_novo_elemento"],
     mede:x=>{ const t = String(x.v.rev_tese||""), d = _revDec(x);
       // F235 · o PPP do dossiê com período especial antes da DIB: a tese cabe, com o motivo do INSS e o ganho no tempo e na renda (ou nos pontos)
       const g = !_revTeses(x).has("tempo") || /especial/i.test(t) ? _revGanho(x) : null;
       if(g){ const dc = d && _revDecaiu(d, `decaído em ${fmtBarra(d.fim)} (Tema 975/STJ)`); if(dc) return dc;
         const ne = x.v.rev_novo_elemento;
         return {est:"provar", txt:`cabe incluir o especial: ${g.curto}${g.epi ? `. ${cap1(g.epi)}` : ""}${ne==="Não" ? ". O PPP já estava no pedido: não é documento novo, e os atrasados vão à DIP"
           : ne==="Sim" ? ". O INSS nunca viu este PPP: é documento novo, e os atrasados contam do pedido de revisão" : ". Diga se esse PPP foi entregue ao INSS na concessão: muda o início dos atrasados"}`, fonte:"PPP do dossiê"}; }
       if(!_revTeses(x).has("tempo")) return {est:"info", txt:"incluir tempo especial, rural ou com deficiência também decai (Tema 975/STJ)"};
       { const dc = d && _revDecaiu(d, `decaído em ${fmtBarra(d.fim)}, mesmo que o INSS não tenha examinado o tempo (Tema 975/STJ)`); if(dc) return dc; }
       const nPpp = (x.fd.ppps||[]).length, nRes = (x.fd.resumos||[]).reduce((n, r)=>n + (r.naoEnquadrados||0), 0), nRur = (x.tempos||[]).filter(l=>l.nat==="rural").length;
       const [tem, prova, fonte] = /especial/i.test(t) ? [nPpp, `${nPpp ? _plural(nPpp, "PPP", "PPPs") : "nenhum PPP"} no dossiê${nRes ? `; o resumo do INSS tem ${nRes} não enquadrado(s)` : ""}; PPP ou LTCAT provam o especial`, nPpp ? "dossiê" : undefined]
         : /rural/i.test(t) ? [nRur, `${nRur ? _plural(nRur, "linha rural", "linhas rurais") : "nenhuma linha rural"} no quadro Tempos; o rural pede início de prova material, não só testemunha (art. 55, § 3º)`, undefined]
         : [x.v.rev_novo_elemento==="Sim" ? 1 : 0, "a deficiência pede avaliação biopsicossocial e laudos; a revisão também decai em 10 anos (IN 128, art. 307)", undefined];
       const ef = x.v.rev_novo_elemento==="Sim" ? "; com documento novo, os efeitos vão à DPR (art. 586)" : "; documento levado só em juízo leva os efeitos à citação (Tema 1124/STJ)";
       return {est: tem ? "ok" : "falta", txt: prova + ef, fonte}; }},
    {id:"tese_indebito", rot:"O INSS está cobrando valores de volta? Dava para perceber o erro?", base:"Tema 979/STJ; Enunciado 17 do CRPS; IN 128, art. 595",
     conf:"conferido", campos:["rev_cobranca_valor","rev_cobranca_origem","rev_boa_fe"],
     mede:x=>{ const v = x.v, o = v.rev_cobranca_origem||"", val = _num(v.rev_cobranca_valor);
       if(!_revTeses(x).has("indebito") && !o && !val) return {est:"info", txt:"só se o INSS cobrar a devolução de valores: é defesa contra a cobrança, não revisão"};
       const vt = val ? `${moedaBR(val)} cobrados` : "cobrança";
       if(/fraude|m[áa]-f[ée]/i.test(o)) return {est:"risco", txt:`${vt} por fraude ou má-fé alegada: provada, não há prescrição (IN 128, art. 595, § 3º); a defesa ataca a prova`};
       if(/judicial/i.test(o)) return {est:"risco", txt:`${vt} por decisão judicial revogada: segue o Tema 692/STJ (só na skill), e não a boa-fé do Tema 979`};
       if(!o) return {est:"informar", txt:`${vt}: informe a origem da cobrança`};
       if(v.rev_boa_fe==="Não") return {est:"ok", txt:`${vt} por ${_min1(o)} que o segurado não podia perceber: a boa-fé objetiva afasta a devolução (Tema 979/STJ; Enunciado 17 do CRPS); a cobrança prescreve em 5 anos (art. 595)`};
       if(v.rev_boa_fe==="Sim") return {est:"risco", txt:`${vt}: dava para perceber o erro, então se devolve, com desconto de até 30% do benefício (Tema 979/STJ)`};
       return {est:"informar", txt:`${vt} por ${_min1(o)}: dava para o segurado perceber o erro?`}; }},
  ], {
    rev_especie:["Espécie do benefício (da carta)", "select", _revEsp()],
    rev_ddb:["Data da concessão (DDB, da carta)", "date"],
    rev_dip:["Início do pagamento (DIP, da carta)", "date"],
    rev_origem_primeiro:["Pensão: primeiro pagamento do benefício de origem (o prazo é o dele)", "date"],
    rev_menor_incapaz:["Titular menor de 16 ou incapaz na concessão", "select", SN],
    rev_pedido_adm:["Já pediu revisão ao INSS", "select", SN],
    rev_pedido_data:["Data do pedido de revisão (DPR)", "date"],
    rev_pedido_ciencia:["Ciência da decisão do pedido de revisão", "date"],
    rev_acao_judicial:["Já existe ação sobre esta revisão", "select", SN],
    rev_teto_glosa:["Salário de benefício limitado ao teto na concessão", "select", SN],
    rev_melhor_data:["Data em que já tinha direito com renda maior", "date"],
    rev_media_100:["Memória de cálculo: a média usou todos os salários (100%)", "select", SN],
    rev_novo_elemento:["Documento novo nunca levado ao INSS (PPP, prova rural, CTPS)", "select", SN],
    rev_saque_fgts:["Sacou FGTS ou PIS depois de aposentar", "select", SN],
    rev_cobranca_valor:["Valor cobrado pelo INSS (R$)", "number"],
    rev_cobranca_origem:["Origem da cobrança", "select", ["","Erro do INSS","Acumulação indevida","Fraude ou má-fé alegada","Decisão judicial revogada"]],
    rev_boa_fe:["Dava para o segurado perceber o erro", "select", SN],
  }, {resumo:"Só cabe revisar um benefício que já foi concedido, dentro de 10 anos contados do mês seguinte ao primeiro pagamento, e só os últimos 5 anos de atrasados são pagos. Além disso, a tese escolhida precisa caber no caso: o tipo de benefício, a DIB e o documento certo."});
  // F235 · a revisão responde o que o cliente veio saber: cabe? até quando? quanto muda? A decadência curta é "peça já", nunca "ainda não"
  const _revCedo = (x, d) => { const dD = d && /primeiro pagamento/.test(d.de) && d.dip && d.dip < d.base ? _revDec({...x, v:{...x.v, rev_primeiro:"", rev_origem_primeiro:""}}) : null; return dD && dD.fim < d.fim ? dD : null; };
  Object.assign(REQ_EXTRA.rev, {
    veredito: (x, a) => { const dc = a.rs.find(r=>r.id==="decadencia_10_anos"), d = _revDec(x);
      if(!dc || !d || ["impedido","informar"].includes(dc.est) || _revTeses(x).has("teto")) return null;
      const cedo = _revCedo(x, d), g = _revGanho(x);
      const vt = _revVidaToda(x) ? " A revisão da vida toda, que o cliente perguntou, não cabe: o STF decidiu contra (Tema 1102); não vale a pena entrar com ela." : "";
      const prazo = `o prazo para pedir a revisão acaba em ${fmtBarra(d.fim)}${cedo ? ` (pelo 1º crédito do INSS; para agir, conte até ${fmtBarra(cedo.fim)}, pela DIP)` : ""}; faltam ${_revFalta((cedo || d).meses)}`;
      if(["risco","falta"].includes(dc.est)) return {tom:"sim", txt:`Sim, e com pressa: ${prazo}. Protocolar a revisão no INSS${g ? " com o PPP" : ""} agora.${g ? ` Cabe pelo tempo especial: ${g.curto}.` : ""}${vt}`};
      return g ? {tom:"sim", txt:`Sim: cabe a revisão pelo tempo especial: ${g.curto}.${g.epiInss ? ` ${cap1(g.epi)}.` : ""} ${cap1(prazo)}.${vt}`} : null; },
    // F235 · as datas da carta ficam à vista nos campos do prazo (antes vinham em branco com o valor no texto)
    pre: {rev_dip: x=>{ const d = _revDatas(x); return d.dip && d.fDip!=="campo" ? {val:d.dip, fonte:d.fDip} : null; },
      rev_ddb: x=>{ const d = _revDatas(x); return d.ddb && d.fDdb!=="campo" ? {val:d.ddb, fonte:d.fDdb} : null; },
      rev_dib: x=>{ const d = _revDatas(x); return d.dib && d.fDib!=="campo" ? {val:d.dib, fonte:d.fDib} : null; }},
    // F235 · as teses que não servem a este benefício vão para um bloco fechado, e a que cabe fica à vista
    recolher: r => r.est==="info" && (/^tese_/.test(r.id) || r.id==="decadencia_beneficio_antigo"), recolherRot: "Outras revisões, que não servem para este benefício",
    agora: (x, a) => { const out = [], g = _revGanho(x), ne = x.v.rev_novo_elemento, dt = _revDatas(x), ano = (isoBr((dt.b.carta||{}).der||"") || dt.dib || "").slice(0, 4);
      if(_revVidaToda(x)) out.push("Dizer ao cliente, com clareza, que a revisão da vida toda não cabe: o STF decidiu contra (Tema 1102); não abrir caso por ela.");
      out.push(`Pedir a revisão do benefício no Meu INSS${g ? ", com o PPP, para o período especial contar convertido e a renda ser recalculada" : ""}. Não é recurso: o recurso tem 30 dias e vai ao Conselho; a revisão tem 10 anos e vai ao próprio INSS.`);
      if(ne==="Sim" || (g && !ne)) out.push(`Pedir a cópia do processo de concessão${ano ? ` de ${ano}` : ""} (se não estiver no Meu INSS, agendar o serviço de cópia de processo), sem esperar por ela para protocolar: ela mostra se o PPP foi entregue e decide se os atrasados vão à DIP ou só ao pedido de revisão.`);
      if(ne==="Sim") out.push("Não levar o PPP direto à Justiça: documento que o INSS nunca viu leva à extinção sem julgamento do mérito (Tema 1124/STJ, item 1.6). Primeiro o pedido de revisão no INSS.");
      if(x.v.rev_pedido_adm!=="Sim" && !_revProcRev(x)) out.push("Avisar que a primeira revisão pedida reabre a concessão inteira (IN 128, art. 584): conferir antes se há ponto fraco nela.");
      return out; },
  });
  // F235 · o que o dossiê já responde: a tese (PPP com especial antes da DIB ou período não enquadrado no resumo do INSS),
  // se o PPP é documento novo (a cópia do pedido o traz; o relato diz que não foi entregue) e se já houve pedido de revisão
  Object.assign(PRE_DOSSIE, {
    rev_tese: x => { if(x.op!=="rev") return null; const g = _revGanho(x);
      if(g) return {val:"reconhecimento de tempo especial", fonte:`PPP do dossiê: ${g.periodos}`};
      return (x.fd.resumos||[]).some(r=>r.naoEnquadrados) ? {val:"reconhecimento de tempo especial", fonte:"resumo do INSS: período especial não enquadrado"} : null; },
    rev_novo_elemento: x => { if(x.op!=="rev") return null; const b = _revBen(x), nb = b.nb || (b.carta||{}).nb || "";
      const p = (x.fd.processos||[]).find(p=>(!nb || !p.nb || p.nb===nb) && /Perfil Profissiogr/i.test(String((p.anexo||{}).texto||"")));
      if(p) return {val:"Não", fonte:`cópia do pedido de ${p.entrada || "concessão"}: o PPP já estava lá${(x.fd.resumos||[]).some(r=>r.naoEnquadrados) ? ", e o resumo do INSS marca o período como não enquadrado" : ""}`};
      return /\bPPP\b[^.\n]{0,80}\b(n[ãa]o|nunca)\b[^.\n]{0,25}\b(entregue|levad[oa]|apresentad[oa])|\b(n[ãa]o|nunca)\b[^.\n]{0,20}\b(entregou|levou|apresentou)\b[^.\n]{0,40}\bPPP\b/i.test(relatoDe(x.c))
        ? {val:"Sim", fonte:"relato da recepção; conferir na cópia do processo"} : null; },
    rev_pedido_adm: x => { if(x.op!=="rev" || _revProcRev(x)) return null;
      const ine = (((x.c||{}).dossie||{}).meuinss||{}).inexistentes || [];
      return (x.fd.processos||[]).length || ine.some(t=>/^Processos administrativos/i.test(String(t)))
        ? {val:"Não", fonte:"Meu INSS: nenhum pedido de revisão na lista de pedidos"} : null; },
  });

  // ── ACERTO DE CNIS ──────────────────────────────────────────────────────
  // os indicadores: do CNIS lido, de cada vínculo e o digitado (só o que tem cara de código)
  const _cnInds = x => { const s = new Set();
    for(const i of ((x.g||{}).indicadores || (x.an||{}).indicadores || [])) if(i && i.codigo) s.add(String(i.codigo).toUpperCase());
    for(const v of ((x.g||{}).vinculos||[])) for(const c of (v.indicadores||[])) s.add(String(c).toUpperCase());
    for(const c of String(x.v.cn_pendencia||"").match(/\b[A-Z][A-Z0-9]{2,}(?:-[A-Z0-9]+)*\b/g)||[]) if(IND_CNIS[c] || /-/.test(c) || /^P[A-Z]{3,}$/.test(c)) s.add(c);
    return [...s]; };
  // acerto já decidido contra (indeferido, não segurado especial, negativo ratificado, não confirmado)
  const _cnNeg = c => /-(IND[JR]?|NSE|RNEG|VI)$/.test(c);
  const _cnVs = x => ((x.g||{}).vinculos||[]).filter(v=>v.tipo!=="Benefício");
  const _cnLic = x => licencasDaRais(x.fd.rais||[]).map(l=>({...l, d0: isoBr(l.de||""), d1: isoBr(l.ate||"")}));
  const _cnLicTxt = ls => `${_plural(ls.length, "licença", "licenças")} sem remuneração na RAIS (${ls.map(l=>`${l.nome||"empregador"}, ${l.de} a ${l.ate}${l.dias ? `, ${l.dias} dias` : ""}`).join("; ")})`;
  const CN_CAT = ["","Empregado","Doméstico","Avulso","Contribuinte individual","MEI","Facultativo","Facultativo baixa renda","Segurado especial"];
  const CN_PROVA = {Empregado:"CTPS, contrato, ficha de registro, FGTS ou recibos (IN 128, arts. 46 a 51)",
    "Doméstico":"CTPS e recibos; a CTPS sem recolhimento só vale se o registro parecer da época (art. 76, § 2º)",
    Avulso:"certificado do sindicato ou do OGMO", "Contribuinte individual":"as guias, o contrato social e o distrato", MEI:"as guias do DAS e o CNPJ",
    Facultativo:"as guias pagas", "Facultativo baixa renda":"as guias e a folha do CadÚnico", "Segurado especial":"a autodeclaração com início de prova material"};
  const CN_ANEXO = {Empregado:"I-B", "Doméstico":"I-B", Avulso:"I-C", "Contribuinte individual":"I-D (CI que prestou serviço a empresa)"};

  registrarReq("acerto", [
    {id:"cnis_valor_prova", rot:"O CNIS foi lido? Ele vale como prova, mas pode ser corrigido", base:"Decreto 3.048/99, art. 19, caput e § 12; Lei 8.213/91, art. 29-A, caput",
     conf:"conferido", campos:[],
     mede:x=>{ if(!x.g && !x.ct) return {est:"informar", txt:"leia o CNIS completo (Meu INSS): é ele que se corrige"};
       const nv = _cnVs(x).length, ct = x.ct;
       return {est:"ok", txt:`CNIS lido${nv ? `: ${_plural(nv, "vínculo", "vínculos")}` : ""}${ct ? `, ${ct.carencia} contribuições contadas` : ""}; vale como prova de filiação, tempo e salário, e a falta de um dado não é falta do direito`, fonte:"CNIS"}; }},
    {id:"pedido_a_qualquer_tempo", rot:"O que pedir ao INSS: incluir, corrigir, ratificar ou excluir?", base:"Decreto 3.048/99, art. 19, § 1º; Lei 8.213/91, art. 29-A, § 2º; IN 128, art. 12, §§ 1º a 3º, e art. 574, § 3º",
     conf:"conferido", campos:["cn_tipo_acerto","cn_categoria","cn_finalidade"],
     mede:x=>{ const t = x.v.cn_tipo_acerto, cat = x.v.cn_categoria, fim = x.v.cn_finalidade ? `, para destravar ${x.v.cn_finalidade}` : "";
       // F235 · sem escolha digitada, o que pedir sai do dossiê: um acerto por vínculo, com a prova que já está lá
       if(!t){ const ac = _cnAcertos(x);
         return ac.length ? {est:"ok", txt:`pelo Meu INSS, a qualquer tempo e sem pedir benefício: ${ac.map(_cnAcTxt).join("; ")}; sem campo no formulário, anexe o RAC Vínculos (Anexo I-B da IN 128)${fim}`, fonte:"dossiê"}
           : {est:"informar", txt:"escolha o que pedir: incluir, corrigir, ratificar, excluir, unificar NIT, complementar ou indenizar"}; }
       if(t==="Excluir") return !cat ? {est:"informar", txt:"para excluir, informe a categoria: o anexo muda (I-B empregado e doméstico, I-C avulso, I-D CI prestador, I-E filiação)"}
         : CN_ANEXO[cat] ? {est:"ok", txt:`excluir pelo Meu INSS com a declaração expressa do Anexo ${CN_ANEXO[cat]} (IN 128, art. 12, § 2º; vale a IN, e não a tabela da skill)${fim}`}
         : {est:"ok", txt:`excluir pelo Meu INSS com declaração expressa do filiado (IN 128, art. 12, § 2º): para ${_min1(cat)} não há modelo simplificado, use o RAC (Anexo I); o I-E é do reconhecimento de filiação após pesquisa do INSS${fim}`};
       const extra = t==="Complementar" ? "; veja as competências abaixo do mínimo" : t==="Indenizar" ? "; veja a indenização do período decaído" : "";
       return {est:"ok", txt:`${_min1(t)} pelo Meu INSS, a qualquer tempo e sem pedir benefício; sem campo no formulário, anexe o RAC (Anexo I da IN 128)${extra}${fim}`}; }},
    {id:"indicador_classificado", rot:"Cada aviso do CNIS: o que bloqueia, o que só alerta e o que já foi tratado", base:"Portaria DIRBEN/INSS 990/2022, art. 8º-A e Anexo V; a classificação em bloqueia, alerta e tratado é do escritório",
     conf:"conferido", campos:["cn_pendencia"],
     mede:x=>{ const cs = _cnInds(x);
       if(!cs.length) return x.g ? {est:"ok", txt:"nenhum indicador no CNIS", fonte:"CNIS"} : {est:"informar", txt:"leia o CNIS (ou digite o indicador)"};
       const p = cs.filter(c=>tipoIndicador(c)==="P"), i = cs.filter(c=>tipoIndicador(c)==="I"), a = cs.filter(c=>tipoIndicador(c)==="A"), neg = a.filter(_cnNeg), ok = a.filter(c=>!_cnNeg(c)), ls = [];
       // F235 · no acerto, a pendência é o que se pede agora; "resolva antes do pedido" vale para o pedido de benefício
       if(p.length) ls.push(`${p.length===1 ? "1 pendência bloqueia" : `${p.length} pendências bloqueiam`} o cômputo (${p.join(", ")})${x.op==="acerto" ? " até o acerto: é o que se pede agora, com a prova do vínculo; o pedido de benefício é que espera o extrato limpo" : ": resolva antes do pedido, para não haver indeferimento automático"}`);
       if(neg.length) ls.push(`acerto já negado (${neg.join(", ")}): só volta por recurso ou ação`);
       if(i.length) ls.push(`${p.length || neg.length ? "e " : ""}${i.length} só de alerta (${i.join(", ")})`);
       if(ok.length) ls.push(`já tratado (${ok.join(", ")})`);
       return {est: p.length ? "risco" : neg.length ? "falta" : i.length ? "info" : "ok", txt: ls.join("; "), fonte: x.g ? "CNIS" : "campo"}; }},
    {id:"extemporaneo", rot:"Há dado lançado fora do prazo? Tem documento que o comprove?", base:"Decreto 3.048/99, art. 19, §§ 2º a 4º; Lei 8.213/91, art. 29-A, §§ 3º e 4º",
     conf:"conferido", campos:["cn_doc_contemporaneo"],
     mede:x=>{ const cs = _cnInds(x), pe = cs.filter(c=>/^(PEXT|PREM-EXT)/.test(c)), ae = cs.filter(c=>/^AEXT/.test(c)), neg = ae.filter(_cnNeg), doc = x.v.cn_doc_contemporaneo;
       if(!x.g && !cs.length) return {est:"informar", txt:"leia o CNIS para ver os dados extemporâneos"};
       if(pe.length) return doc==="Sim" ? {est:"ok", txt:`dado extemporâneo (${pe.join(", ")}) com documento da época: vale (RPS, art. 19, §§ 2º a 4º)`, fonte:"CNIS"}
         : {est:"falta", txt:`dado lançado fora do prazo (${pe.join(", ")}): só vale com documento que comprove a regularidade${doc==="Não" ? "; sem documento da época, não conta" : ""}`, fonte:"CNIS"};
       if(neg.length) return {est:"falta", txt:`extemporâneo não confirmado (${neg.join(", ")}): só volta com documento novo, recurso ou ação`, fonte:"CNIS"};
       const parc = ae.filter(c=>/-VP/.test(c));
       if(parc.length) return {est:"falta", txt:`extemporâneo confirmado só em parte (${parc.join(", ")}): o resto do período pede documento da época`, fonte:"CNIS"};
       if(ae.length) return {est:"ok", txt:`extemporâneo já confirmado (${ae.join(", ")})`, fonte:"CNIS"};
       return x.g ? {est:"ok", txt:"nenhum dado extemporâneo marcado no CNIS", fonte:"CNIS"} : {est:"informar", txt:"leia o CNIS para ver os dados extemporâneos"}; }},
    {id:"prova_por_categoria", rot:"Que documento da época prova esse trabalho?", base:"Decreto 3.048/99, art. 19-B, caput e §§ 1º, 3º e 4º; Lei 8.213/91, art. 55, § 3º; IN 128, arts. 46 a 51, 74 a 80 e 172; Enunciado 3 do CRPS",
     conf:"conferido", campos:["cn_categoria","cn_vinculo","cn_doc_contemporaneo","cn_reclamatoria","cn_prova"],
     mede:x=>{ const cat = x.v.cn_categoria, doc = x.v.cn_doc_contemporaneo;
       if(!cat) return {est:"informar", txt:"informe a categoria no período: a prova muda com ela"};
       const qual = `${cat}: ${CN_PROVA[cat] || "documento da época com início e fim"}`, apoio = (x.fd.rais||[]).length || (x.fd.caged||[]).length ? "; a RAIS e o CAGED do dossiê ajudam" : "";
       if(x.v.cn_reclamatoria==="Sim" && doc!=="Sim") return {est:"risco", txt:"reclamatória trabalhista só vale com início de prova material da época (IN 128, art. 172; Enunciado 3 do CRPS)"};
       if(doc==="Sim") return {est:"ok", txt:`${qual}${x.v.cn_prova ? ` (tem: ${x.v.cn_prova})` : ""}${apoio}`, fonte:"campo"};
       if(doc==="Não") return {est:"risco", txt:`sem documento da época: declaração do empregador tirada de registros, pesquisa ou justificação administrativa; testemunha sozinha não basta (art. 55, § 3º). ${qual}`};
       return {est:"falta", txt:`tem documento da época com início e fim? ${qual}${apoio}`}; }},
    {id:"empregado_sem_recolhimento", rot:"Era empregado? Então o tempo conta mesmo sem o patrão recolher", base:"Lei 8.213/91, art. 27, I; Enunciado 2 do CRPS",
     conf:"conferido", campos:["cn_categoria"],
     mede:x=>{ const cat = x.v.cn_categoria, vs = _cnVs(x);
       if(!cat && !x.g) return {est:"informar", txt:"informe a categoria (ou leia o CNIS)"};
       if(!(cat ? /Empregado|Doméstico|Avulso/.test(cat) : vs.some(v=>/Empregado|Avulso/.test(v.tipo||""))))
         return {est:"info", txt:"não se aplica: o recolhimento é do próprio segurado (veja o pagamento em atraso)"};
       const err = ((x.an||{}).errosEmp||[]).length;
       return {est:"ok", txt:`empregado, doméstico ou avulso: a carência conta desde a filiação, e a falta de recolhimento do empregador não prejudica (art. 27, I; Enunciado 2 do CRPS)${err ? `; o CNIS tem ${_plural(err, "indicador", "indicadores")} de erro do empregador` : ""}`, fonte: cat ? "campo" : "CNIS"}; }},
    {id:"ci_em_atraso", rot:"Pagou como autônomo ou facultativo com atraso?", base:"Lei 8.213/91, art. 27, II; IN 128, arts. 191 e 223, § 6º; Enunciado 5 do CRPS",
     conf:"conferido", campos:["cn_ci_atraso","cn_categoria"],
     mede:x=>{ const cat = x.v.cn_categoria, vs = _cnVs(x);
       if(!cat && !x.g) return {est:"informar", txt:"informe a categoria (ou leia o CNIS)"};
       if(!((cat && /individual|MEI|Facultativo|especial/i.test(cat)) || vs.some(v=>/Individual|Facultativo|Empregador/.test(v.tipo||""))))
         return {est:"info", txt:"não se aplica: sem contribuição como autônomo ou facultativo"};
       if(x.v.cn_ci_atraso==="Sim") return {est:"falta", txt:"guias pagas em atraso não contam para a carência antes do primeiro pagamento em dia (art. 27, II; IN 128, art. 191) nem depois do fato gerador (art. 223, § 6º); para contar como tempo, prove a atividade (Enunciado 5 do CRPS)"};
       if(x.v.cn_ci_atraso==="Não") return {est:"ok", txt:"contribuições em dia: contam desde o primeiro pagamento em dia"};
       return {est:"informar", txt:"o CNIS lido não traz a data de pagamento: houve guia paga em atraso?"}; }},
    {id:"abaixo_do_minimo", rot:"Há mês com salário abaixo do mínimo depois de 13/11/2019?", base:"EC 103/2019, art. 29, caput e parágrafo único; Decreto 3.048/99, art. 19-E, caput e §§ 1º a 4º",
     conf:"conferido", campos:[],   // F235 · a divergência é entre normas (a EC 103 e o RPS), e o texto diz qual se segue
     mede:x=>{ if(!x.an && !x.ct) return {est:"informar", txt:"leia o CNIS para achar as competências abaixo do mínimo"};
       const ab = ((x.an||{}).abaixo||[]).filter(a=>chaveComp(a.comp) >= "2019-11"), n = ab.length || (x.ct||{}).foraMinimo || 0;
       if(!n) return {est:"ok", txt:"nenhuma competência abaixo do mínimo depois de 13/11/2019", fonte:"CNIS"};
       const velhas = ab.filter(a=>chaveComp(a.comp).slice(0,4) < x.der.slice(0,4)).length, lista = ab.length ? ` (${ab[0].comp}${ab.length > 1 ? ` a ${ab[ab.length-1].comp}` : ""})` : "";
       const qt = `${_plural(n, "competência", "competências")} abaixo do mínimo fora da conta de qualidade, carência e tempo${lista}`;
       if(velhas) return {est:"risco", txt:`${qt}; ${velhas} de anos já encerrados: pela EC 103 (art. 29, par. único), que seguimos, os ajustes são no mesmo ano civil; o RPS (art. 19-E, § 2º) admite complementar a qualquer tempo`, fonte:"CNIS"};
       return {est:"falta", txt:`${qt}: complementar (vence no dia 15 do mês seguinte, depois com acréscimos), usar o excedente de outra competência ou agrupar, no mesmo ano civil (EC 103, art. 29; RPS, art. 19-E); o ajuste processado não se desfaz`, fonte:"CNIS"}; }},
    {id:"mes_sem_remuneracao", rot:"Há mês com vínculo e sem salário? O INSS usa o mínimo no cálculo", base:"IN 128, art. 223, § 2º, I, e § 3º (IN 212/2026)",
     conf:"conferido", campos:[],
     mede:x=>{ if(!x.g) return {est:"informar", txt:"leia o CNIS para achar os meses de vínculo sem salário"};
       const gaps = _cnVs(x).filter(v=>/Empregado|Avulso/.test(v.tipo||"") && v.fim && v.ultRemun)
         .map(v=>({v, de: ymDe(somarMeses(chaveComp(v.ultRemun)+"-01", 1)), ate: ymDe(isoBr(v.fim))})).filter(g=>g.de <= g.ate);
       if(!gaps.length) return {est:"ok", txt:"nenhum vínculo encerrado com meses finais sem salário (os do meio aparecem em Remunerações)", fonte:"CNIS"};
       const m = gaps.reduce((n, g)=>n + mesesEntreYm(g.de, g.ate), 0);
       return {est:"falta", txt:`${_plural(m, "mês", "meses")} de vínculo sem salário (${gaps.map(g=>`${g.v.origem||"vínculo"}, ${_compBr(g.de)} a ${_compBr(g.ate)}`).join("; ")}): no cálculo o INSS usa o mínimo; prove o salário real com holerites, dentro do prazo de decadência (IN 128, art. 223, § 2º, I); jornada parcial ou intermitente pede o contrato (§ 3º)`, fonte:"CNIS"}; }},
    {id:"licenca_sem_remuneracao_rais", rot:"A RAIS mostra licença sem salário antes de 13/11/2019?", base:"Decreto 3.048/99, art. 59, vigente até o Decreto 10.410/2020",
     conf:"conferido", campos:[],
     mede:x=>{ if(!(x.fd.rais||[]).length) return {est:"informar", txt:"sem RAIS no dossiê (Emprega Brasil)"};
       const ls = _cnLic(x).filter(l=>!l.d0 || l.d0 < EC103);
       if(!ls.length) return {est:"ok", txt:"nenhuma licença sem remuneração antes de 13/11/2019 na RAIS", fonte:"RAIS"};
       return {est:"falta", txt:`${_cnLicTxt(ls)}: antes de 13/11/2019 o desconto segue o art. 59 do RPS, então vigente; saídas: complementar, indenizar (Lei 8.212, art. 45-A), corrigir a RAIS se o código estiver errado ou contar o auxílio-doença intercalado`, fonte:"RAIS"}; }},
    {id:"licenca_rais_depois_ec103", rot:"A RAIS mostra licença sem salário depois de 13/11/2019?", base:"Decreto 3.048/99, art. 19-E; skill base-cnis-acerto-indicadores",
     conf:"conferido", campos:[],
     mede:x=>{ if(!(x.fd.rais||[]).length) return {est:"informar", txt:"sem RAIS no dossiê (Emprega Brasil)"};
       const ls = _cnLic(x).filter(l=>(l.d1 || l.d0) && (l.d1 || l.d0) >= EC103);
       if(!ls.length) return {est:"ok", txt:"nenhuma licença sem remuneração depois de 13/11/2019 na RAIS", fonte:"RAIS"};
       return {est:"falta", txt:`${_cnLicTxt(ls)}: fora do tempo, da carência e da qualidade (RPS, art. 19-E); saídas: complementar, indenizar, corrigir a RAIS ou contar o auxílio-doença intercalado`, fonte:"RAIS"}; }},
    {id:"erro_na_guia_receita", rot:"O erro é na guia (GPS ou DARF)? Então o acerto é na Receita Federal", base:"Decreto 3.048/99, art. 19-B, § 7º",
     conf:"conferido", campos:["cn_gps_erro"],
     mede:x=>{ const cs = _cnInds(x).filter(c=>/^(PDARF|PREC)/.test(c)), g = x.v.cn_gps_erro;
       if(g==="Sim") return {est:"falta", txt:"erro na guia: o acerto é na Receita Federal, não no INSS (inclusão de recolhimento, valor ou data de pagamento da GPS, contribuição com CNPJ e parcelamento; RPS, art. 19-B, § 7º)"};
       if(g==="Não") return {est:"ok", txt:"sem erro de guia: o acerto é no INSS"};
       if(cs.length) return {est:"informar", txt:`o CNIS mostra ${cs.join(", ")}: se o erro é da guia, o acerto é na Receita Federal (RPS, art. 19-B, § 7º)`, fonte:"CNIS"};
       return {est:"info", txt:"só se houver erro na guia: aí o acerto é na Receita Federal"}; }},
    {id:"indenizacao_periodo_decaido", rot:"Quer contar período antigo de autônomo sem contribuição? Só indenizando", base:"Lei 8.212/91, art. 45-A, §§ 1º a 4º",
     conf:"conferido", campos:["cn_tipo_acerto","cn_periodo_ini","cn_periodo_fim","cn_categoria"],
     mede:x=>{ const v = x.v, a = v.cn_periodo_ini, b = v.cn_periodo_fim;
       if(v.cn_tipo_acerto!=="Indenizar") return {est:"info", txt:"só para quem quer contar período antigo de autônomo sem contribuição: paga indenização (Lei 8.212, art. 45-A)"};
       if(/Empregado|Doméstico|Avulso/.test(v.cn_categoria||"")) return {est:"info", txt:`${v.cn_categoria} não indeniza: o recolhimento era do empregador e o tempo conta com a prova do vínculo (Lei 8.213, art. 27, I)`};
       if(!a || !b) return {est:"informar", txt:"informe o início e o fim do período a indenizar"};
       if(a > b) return {est:"informar", txt:`o início (${fmtBarra(a)}) está depois do fim (${fmtBarra(b)})`};
       // § 4º: sem multa só no rural anterior à filiação obrigatória (11/1991, a conferir); § 3º: o não decaído segue a regra geral
       const n = mesesEntreYm(ymDe(a), ymDe(b)), rural = /especial|rural/i.test(v.cn_categoria||"") && a < "1991-11-01";
       const multa = rural ? `; sem a multa de 10% no rural anterior a 11/1991 (§ 4º)${b >= "1991-11-01" ? ", com ela no resto" : ""}` : " e multa de 10%";
       const recente = b > somarAnos(x.der, -5) ? "; o trecho dos últimos 5 anos pode não ter decaído e segue a regra geral do atraso (§ 3º)" : "";
       return {est:"falta", txt:`${_plural(n, "mês", "meses")} a indenizar (${fmtBarra(a)} a ${fmtBarra(b)}): 20% da média dos 80% maiores salários desde 07/1994, com juros de 0,5% ao mês (até 50%)${multa}${recente}; prove a atividade`, fonte:"campo"}; }},
    {id:"limbo_nao_baixar", rot:"Há vínculo aberto sem salário porque o patrão não aceitou a volta (limbo)?", base:"Lei 8.213/91, art. 15, II; Tema 300/TNU (em revisão no Tema 1421/STF, mérito pendente)",
     conf:"conferido", campos:["cn_limbo"],
     mede:x=>{ const lim = x.v.cn_limbo, ref = ymDe(somarMeses(x.der, -3));
       const ab = _cnVs(x).filter(v=>v.aberto && /Empregado|Avulso/.test(v.tipo||"") && (!v.ultRemun || chaveComp(v.ultRemun) < ref));
       const nome = ab.map(v=>`${v.origem||"vínculo"} (última remuneração ${v.ultRemun||"nenhuma"})`).join("; ");
       const inc = (x.benefCnis||[]).some(b=>/^(31|32|91|92)$/.test(b.especie) && b.ate) || (x.fd.laudos||[]).length
         || (x.fd.processos||[]).some(p=>(p.comunicacoes||[]).some(c=>c.contra || c.dcb));
       if(lim==="Sim") return {est:"risco", txt:`não peça a baixa${nome ? ` de ${nome}` : " do vínculo"}: aberto sem salário por limbo, ele sustenta a qualidade de segurado (Tema 300/TNU); a baixa pelo RAC destrói a tese`};
       if(lim==="Não") return {est:"ok", txt:"sem limbo: o vínculo sem saída se fecha pela RAIS ou pelo CAGED"};
       if(ab.length && inc) return {est:"risco", txt:`${nome}: aberto sem salário depois de benefício ou perícia; se o empregador recusou a volta, é limbo: não peça a baixa (Tema 300/TNU)`, fonte:"CNIS"};
       // F235 · sem benefício por incapacidade nem perícia, o vínculo parado há anos (ou que a carteira fecha) não é limbo: falta a saída no CNIS
       const kv = v => x.c ? ctpsDoVinculo(x.c.id, v) : null, velho = v => (kv(v)||{}).saida || (v.ultRemun && chaveComp(v.ultRemun) < ymDe(somarAnos(x.der, -5)));
       if(ab.length && ab.every(velho)) return {est:"info", txt:`não é limbo: ${ab.map(v=>{ const k = kv(v); return `${tituloOrgao(v.origem||"") || "o vínculo"} está sem salário desde ${v.ultRemun||"o início"}, sem benefício por incapacidade; falta a data de saída no CNIS${k && k.saida ? ` (a carteira mostra ${k.saida}): pedir a correção com a carteira` : ": pedir a correção com a carteira ou a rescisão"}`; }).join("; ")}`, fonte:"CNIS"};
       if(ab.length) return {est:"informar", txt:`${nome}: aberto sem salário; é limbo (o empregador recusou a volta depois da alta)?`, fonte:"CNIS"};
       return x.g ? {est:"ok", txt:"nenhum vínculo aberto sem salário no CNIS", fonte:"CNIS"} : {est:"informar", txt:"leia o CNIS (ou diga se há vínculo em limbo)"}; }},
    {id:"facultativo_baixa_renda", rot:"Facultativo de baixa renda (5%): a família está no CadÚnico, com renda baixa?", base:"Lei 8.212/91, art. 21, § 2º, II, b, e § 4º; IN 128/2022, art. 107, § 2º, XIV",
     conf:"conferido", campos:["cn_categoria"],
     mede:x=>{ const fbr = _cnInds(x).filter(c=>/^(FBR|PREC-FBR)/.test(c)), cad = x.cad;
       if(!/baixa renda/i.test(x.v.cn_categoria||"") && !fbr.length) return {est:"info", txt:"só para o facultativo de baixa renda (5%)"};
       if(!cad) return {est:fbr.length ? "risco" : "informar", txt:`${fbr.length ? `validação negada no CNIS (${fbr.join(", ")}); ` : ""}traga o CadÚnico da família (Meu CadÚnico)`, fonte: fbr.length ? "CNIS" : undefined};
       const at = isoBr(cad.atualizada_em||""), sit = String(cad.estado_cadastral||""), tot = _num(cad.renda_total), lim = 2 * (smEm(x.der) || 0), pb = [];
       if(fbr.length) pb.push(`validação negada no CNIS (${fbr.join(", ")})`);
       if(at && at < somarAnos(x.der, -2)) pb.push(`CadÚnico atualizado em ${fmtBarra(at)}, há mais de 2 anos`);
       if(sit && !/cadastrad/i.test(sit)) pb.push(`estado cadastral "${sit}"`);
       if(tot!=null && lim && tot > lim) pb.push(`renda familiar de ${moedaBR(tot)}, acima de 2 salários mínimos`);
       if(pb.length) return {est:"risco", txt:`${pb.join("; ")}: sem a baixa renda validada, os 5% não contam; complemente a contribuição`, fonte:"CadÚnico"};
       return {est:"ok", txt:`CadÚnico${at ? ` atualizado em ${fmtBarra(at)}` : ""}${tot!=null ? `, renda familiar de ${moedaBR(tot)}` : ""}; exige também não ter renda própria e se dedicar ao lar`, fonte:"CadÚnico"}; }},
    {id:"recurso_do_acerto", rot:"O INSS negou o acerto? Cabe recurso ao CRPS", base:"Lei 8.213/91, art. 126, III; Decreto 3.048/99, art. 305, III",
     conf:"conferido", campos:[],
     mede:x=>{ const p = (x.fd.processos||[]).filter(p=>/acerto|atualiza|cnis|v[íi]nculo|inclus|remunera/i.test(p.servico||"")).find(p=>(p.comunicacoes||[]).some(c=>c.contra));
       if(!p) return {est:"info", txt:"se o INSS negar o acerto, cabe recurso ao CRPS em 30 dias da ciência (Lei 8.213, art. 126, III)"};
       const ci = isoBr(p.atualizado||""), ate = ci ? _diaUtil(somaDias(ci, 30)) : null;
       if(ate && x.hoje > ate) return {est:"risco", txt:`acerto negado (${p.servico}); o prazo de 30 dias da última atualização (${fmtBarra(ci)}) venceu em ${fmtBarra(ate)}: veja a relevação no CRPS ou um novo pedido`, fonte:"cópia do processo"};
       return {est:"falta", txt:`acerto negado (${p.servico}): recorra ao CRPS${ate ? ` até ${fmtBarra(ate)} (30 dias da última atualização, ciência a confirmar)` : " em 30 dias da ciência"}`, fonte:"cópia do processo"}; }},
  ], {
    cn_categoria:["Categoria no período", "select", CN_CAT],
    cn_tipo_acerto:["O que pedir", "select", ["","Incluir","Corrigir","Ratificar","Excluir","Unificar NIT","Complementar","Indenizar"]],
    cn_periodo_ini:["Início do período", "date"],
    cn_periodo_fim:["Fim do período", "date"],
    cn_doc_contemporaneo:["Tem documento da época", "select", SN],
    cn_reclamatoria:["Reclamatória com início de prova material", "select", SN],
    cn_gps_erro:["Erro em guia GPS ou DARF (vai à Receita)", "select", SN],
    cn_ci_atraso:["Contribuição de autônomo paga em atraso", "select", SN],
    cn_limbo:["Vínculo aberto sem salário por limbo", "select", SN],
    cn_finalidade:["Benefício que o acerto destrava", "text"],
  }, {veredito: (x, a)=>{
      // F235 · no acerto, a pendência é o objeto do pedido: pede-se já, um acerto por vínculo, e a aposentadoria espera o extrato limpo
      const ac = _cnAcertos(x);
      if(ac.length) return {tom:"sim", txt:`Pode pedir já, pelo Meu INSS e sem pedir benefício: ${ac.map(_cnAcTxt).join("; ")}. Não há prazo para pedir; se o INSS negar, cabe recurso ao CRPS em 30 dias da ciência. O que não se faz é pedir a aposentadoria antes de o extrato ficar certo.`,
        desf:{acao:"caso", txt:`gere o caso e peça já o acerto, pelo Meu INSS e sem pedir benefício (${ac.map(a=>`${a.tipo==="Incluir" ? "incluir" : a.tipo==="Corrigir" ? "a saída de" : "confirmar"} ${a.onde}`).join("; ")}); se o INSS negar, recurso ao CRPS em 30 dias da ciência`}};
      const r = a.rs.find(r=>r.id==="ctps_fora_cnis"); return r && r.est==="risco" ? {tom:"sim", txt:`Cabe pedir o acerto já: ${r.txt}`} : null; },
    agora: x=>{ const ac = _cnAcertos(x); if(!ac.length) return [];
      return [...ac.map(a=>`${cap1(_cnAcTxt(a))} (RAC Vínculos, Anexo I-B).`),
        "Pedir pelo Meu INSS, sem pedir benefício e sem prazo (IN 128, art. 12); sem campo no formulário para tudo, anexar o RAC (art. 12, § 1º).",
        "Se o INSS negar, recurso ao CRPS em 30 dias da ciência. A aposentadoria se pede depois do extrato corrigido."]; },
    resumo:"O CNIS é o cadastro que o INSS usa para contar o tempo e o salário. Quando ele está errado ou incompleto, o segurado pode pedir para incluir, corrigir, ratificar ou excluir dados a qualquer tempo, levando um documento da época certo para cada tipo de trabalho."});

  // F235 · cada acerto que o dossiê mostra, um por vínculo, com a prova que já está lá: o contrato da carteira fora do CNIS (incluir),
  // o vínculo de empregado sem saída e parado (corrigir a saída) e o vínculo com pendência PEXT (confirmar)
  const _cnAcertos = x => { if(!x.c || !x.g) return [];
    const out = [], rel = relatoDe(x.c), trouxe = /carteira|ctps/i.test(rel) ? `a carteira de trabalho${/rescis/i.test(rel) ? " e a rescisão" : ""} que trouxe` : "";
    const docs = docsDoDossie(x.c.id), resc = k => { const w = (dsa(k.empregador).match(/[a-z]{4,}/g)||[]).filter(w=>!/ficticia|ficticio|ltda/.test(w)); return docs.some(a=>/rescis/i.test(a.nome||"") && w.some(p=>dsa(`${a.nome} ${a.texto||""}`).includes(p))); };
    for(const k of ctpsForaDoCnis(x.c)) if(k.admissao) out.push({tipo:"Incluir", onde:tituloOrgao(k.empregador), de:k.admissao, ate:k.saida||"", prova:`a carteira de trabalho${resc(k) ? " e a rescisão" : ""}, que já estão no dossiê`});
    for(const v of _cnVs(x)){ const k = ctpsDoVinculo(x.c.id, v), ind = (v.indicadores||[]).map(String), onde = tituloOrgao(v.origem||"") || String(v.tipo||"").toLowerCase();
      if(v.aberto && !v.fim && v.ultRemun && chaveComp(v.ultRemun) < ymDe(somarMeses(x.hoje, -3)) && /empregad|avulso/i.test(v.tipo||""))
        out.push({tipo:"Corrigir", onde, de:v.inicio, ate:(k && k.saida) || "", prova: k && k.saida ? "a carteira de trabalho, que já está no dossiê" : (trouxe || "a carteira de trabalho ou a rescisão")});
      if(ind.some(i=>/^PEXT/.test(i))){ const ra = [...new Set((x.fd.rais||[]).filter(r=>r.raiz && r.raiz===raizCnpj(v.codigo||"")).map(r=>r.ano))].sort();
        out.push({tipo:"Ratificar", onde, de:v.inicio, ate:v.fim||"", prova:`${k ? "a carteira de trabalho, que já está no dossiê" : trouxe || "a carteira de trabalho, a rescisão ou o extrato do FGTS"}${ra.length ? `; a RAIS de ${ra.join(" e ")} do dossiê confirma o vínculo` : ""}`}); }
    }
    return out; };
  const _cnAcTxt = a => a.tipo==="Incluir" ? `incluir ${a.onde}, de ${a.de}${a.ate ? ` a ${a.ate}` : ""}, com ${a.prova}`
    : a.tipo==="Corrigir" ? `pôr a data de saída de ${a.onde}${a.ate ? ` (${a.ate})` : ""}, com ${a.prova}`
    : `confirmar o vínculo com ${a.onde} (${a.de}${a.ate ? ` a ${a.ate}` : ""}), lançado fora do prazo (PEXT), com ${a.prova}`;
  // F235 · o que o dossiê já responde no acerto: a pendência, o vínculo, a categoria, o documento da época e para que serve
  Object.assign(PRE_DOSSIE, {
    cn_pendencia: x => { if(x.op!=="acerto") return null; const p = _cnInds(x).filter(c=>tipoIndicador(c)==="P"); return p.length ? {val:p.join(", "), fonte:"CNIS"} : null; },
    cn_vinculo: x => { if(x.op!=="acerto") return null; const ac = _cnAcertos(x);
      return ac.length ? {val:ac.map(a=>`${a.onde}, ${a.de}${a.ate ? ` a ${a.ate}` : ""}`).join("; "), fonte:"CNIS e carteira de trabalho"} : null; },
    cn_categoria: x => { if(x.op!=="acerto") return null; const ac = _cnAcertos(x); if(!ac.length) return null;
      const ts = ac.map(a=>{ const v = _cnVs(x).find(v=>(tituloOrgao(v.origem||"") || "")===a.onde); return v ? String(v.tipo||"") : "Empregado"; });
      return ts.every(t=>/empregad/i.test(t) && !/dom[ée]stic/i.test(t)) ? {val:"Empregado", fonte:"CNIS e carteira de trabalho: vínculos de empregado"} : null; },
    cn_doc_contemporaneo: x => { if(x.op!=="acerto" || !x.c) return null;
      if(contratosDaCtps(x.c.id).length) return {val:"Sim", fonte:"carteira de trabalho no dossiê"};
      return /carteira|ctps|rescis/i.test(relatoDe(x.c)) ? {val:"Sim", fonte:"relato da recepção: trouxe a carteira e a rescisão"} : null; },
    cn_finalidade: x => x.op==="acerto" && /aposent/i.test(relatoDe(x.c)) ? {val:"aposentadoria", fonte:"relato da recepção"} : null,
  });

  // ── RECURSO ORDINÁRIO AO CRPS ───────────────────────────────────────────
  // a decisão: a cópia do processo mais recente com comunicação, preferindo a contrária ao cliente
  const _crpProc = x => { const ps = (x.fd.processos||[]).filter(p=>(p.comunicacoes||[]).length)
      .sort((a, b)=>(isoBr(b.atualizado||b.entrada||"")||"").localeCompare(isoBr(a.atualizado||a.entrada||"")||""));
    const p = ps.find(p=>p.comunicacoes.some(c=>c.contra)) || ps[0];
    return p ? {p, c: p.comunicacoes.find(c=>c.contra) || p.comunicacoes[0]} : null; };
  // a ciência: digitada; 5 dias da emissão por e-mail ou sistema; ou a última atualização do pedido concluído (estimativa).
  // A "Data:" da comunicação na cópia é a da emissão da cópia e não serve
  // Com a ciência digitada depois da presumida pela emissão, o prazo conta da mais cedo (art. 80, § 1º, I e II)
  const _crpCiencia = x => { const v = x.v, pres = v.crp_emissao && /mail|sistema/i.test(v.crp_forma_ciencia||"") ? somaDias(v.crp_emissao, 5) : null;
    if(v.crp_ciencia) return pres && pres < v.crp_ciencia ? {d:pres, como:`5 dias da emissão, antes da ciência informada (${fmtBarra(v.crp_ciencia)}): conta a mais cedo`, fonte:"campo"} : {d:v.crp_ciencia, como:"", fonte:"campo"};
    if(pres) return {d:pres, como:"5 dias da emissão pelo Regimento, art. 80, § 1º, II", fonte:"campo"};
    const pc = _crpProc(x), at = pc && (!pc.p.status || /conclu/i.test(pc.p.status)) && isoBr(pc.p.atualizado||"");
    return at ? {d:at, como:"estimada pela última atualização do pedido; confira", est:true, fonte:"cópia do processo"} : null; };
  const _crpPrazo = x => { const ci = _crpCiencia(x); return ci ? {...ci, ate: _diaUtil(somaDias(ci.d, 30))} : null; };
  const CRP_ENUN = [[/melhor benef/i,1,"melhor benefício"], [/recolhiment/i,2,"empregado sem recolhimento do empregador"], [/reclamat/i,3,"reclamatória com prova material"], [/atraso|extempor/i,5,"CI em atraso exige prova da atividade"],
    [/preexist|anterior ao (in[íi]cio|ingresso|reingresso)/i,7,"doença preexistente, salvo agravamento"], [/ltcat|laudo t[ée]cnico/i,11,"PPP dispensa LTCAT desde 01/01/2004"],
    [/\bepi\b|equipamento de prote/i,12,"EPI não descaracteriza a especialidade"], [/ru[íi]do/i,13,"ruído: 80, 90 e 85 dB por época"], [/categoria profissional|enquadramento/i,14,"categoria profissional até 28/04/1995"],
    [/devolu|ind[ée]bito|cobran/i,17,"devolução de valores"], [/intercal/i,18,"benefício intercalado conta como carência"]];

  registrarReq("crps", [
    {id:"decisao_recorrivel", rot:"Existe decisão do INSS contra o cliente?", base:"Lei 8.213/91, art. 126, I, III e § 4º; Decreto 3.048/99, art. 305, I e III; Regimento do CRPS, art. 89",
     conf:"conferido", campos:["crp_decisao_tipo","crp_especie"],
     mede:x=>{ const pc = _crpProc(x), t = x.v.crp_decisao_tipo;
       if(pc && pc.c.contra) return {est:"ok", txt:`${pc.c.decisao}${pc.c.nb ? ` (NB ${pc.c.nb})` : ""}${pc.p.servico ? `, em ${pc.p.servico}` : ""}: cabe recurso ordinário à Junta`, fonte:"cópia do processo"};
       if(t) return {est:"ok", txt:`${t}: decisão do INSS recorrível à Junta (Lei 8.213, art. 126; RPS, art. 305)`, fonte:"campo"};
       if(pc) return {est:"falta", txt:`a decisão lida ("${pc.c.decisao}") não é contra o cliente: diga o que se recorre`, fonte:"cópia do processo"};
       return {est:"informar", txt:"traga a cópia do processo com a comunicação de decisão (ou diga que decisão se recorre)"}; }},
    {id:"prazo_30_dias", rot:"Ainda está no prazo de 30 dias da ciência?", base:"Regimento do CRPS, art. 77, caput, e art. 78, caput e §§ 4º a 7º; Decreto 3.048/99, art. 305, § 1º, II; IN 128, art. 580",
     conf:"conferido", campos:["crp_ciencia","crp_feriado_local","crp_interposto_em"],
     mede:x=>{ const pz = _crpPrazo(x), it = x.v.crp_interposto_em, fer = x.v.crp_feriado_local==="Sim" ? "; vencimento em feriado local: comprove no recurso (art. 78, § 7º)" : "";
       if(!pz) return {est:"informar", txt:"informe a ciência da decisão: o recurso tem 30 dias"};
       const base = `ciência em ${fmtBarra(pz.d)}${pz.como ? `, ${pz.como}` : ""}; 30 dias levados ao 1º dia útil`;
       if(it) return it <= pz.ate ? {est:"ok", txt:`interposto em ${fmtBarra(it)}, dentro do prazo de ${fmtBarra(pz.ate)} (${base})${fer}`, fonte:pz.fonte, quando:pz.ate}
         : {est:"risco", txt:`interposto em ${fmtBarra(it)}, depois do prazo de ${fmtBarra(pz.ate)} (${base}): veja a relevação${fer}`, fonte:pz.fonte, quando:pz.ate};
       if(x.hoje > pz.ate) return {est:"risco", txt:`prazo vencido em ${fmtBarra(pz.ate)} (${base}): veja a relevação ou um novo requerimento${fer}`, fonte:pz.fonte, quando:pz.ate};
       const dias = Math.round((Date.parse(pz.ate) - Date.parse(x.hoje)) / 864e5);
       return {est: dias <= 7 ? "risco" : "ok", txt:`recorra até ${fmtBarra(pz.ate)}, faltam ${_plural(dias, "dia", "dias")} (${base}); o envio eletrônico vale até 23h59 de Brasília${fer}`, fonte:pz.fonte, quando:pz.ate}; }},
    {id:"data_da_ciencia", rot:"Quando e como o cliente ficou sabendo da decisão?", base:"Regimento do CRPS, art. 80, § 1º, I, II, IV e V, e §§ 2º a 5º",
     conf:"conferido", campos:["crp_forma_ciencia","crp_emissao","crp_ciencia"],
     mede:x=>{ const v = x.v, f = v.crp_forma_ciencia||"", ci = _crpCiencia(x);
       if(v.crp_ciencia){ const pres = v.crp_emissao && /mail|sistema/i.test(f) ? somaDias(v.crp_emissao, 5) : null;
         if(pres && pres < v.crp_ciencia) return {est:"falta", txt:`ciência informada em ${fmtBarra(v.crp_ciencia)}, mas pela emissão ela se presume em ${fmtBarra(pres)} (5 dias, art. 80, § 1º, II): confira qual vale e conte da mais cedo`, fonte:"campo"};
         return {est:"ok", txt:`ciência em ${fmtBarra(v.crp_ciencia)}${f ? ` (${_min1(f)})` : ""}`, fonte:"campo"}; }
       if(ci && !ci.est) return {est:"ok", txt:`ciência presumida em ${fmtBarra(ci.d)} (${ci.como})`, fonte:"campo"};
       if(/mail|sistema/i.test(f)) return {est:"informar", txt:"informe a data de emissão da comunicação: a ciência é 5 dias depois (art. 80, § 1º, II)"};
       if(ci) return {est:"falta", txt:`sem a data da ciência: a última atualização do pedido foi em ${fmtBarra(ci.d)}; use como ciência e confira (a "Data:" da comunicação na cópia é a da emissão da cópia)`, fonte:ci.fonte};
       return {est:"informar", txt:"como e quando soube da decisão? (consulta no Meu INSS, e-mail, carta com AR ou pessoalmente)"}; }},
    {id:"motivo_da_decisao", rot:"Qual o motivo escrito na decisão? O recurso ataca cada um", base:"Regimento do CRPS, art. 77, § 3º; Decreto 3.048/99, art. 305, § 7º; IN 128, art. 580, § 2º",
     conf:"conferido", campos:["crp_motivo"],
     mede:x=>{ const pc = _crpProc(x), m = pc && pc.c && pc.c.motivo, fim = ": rebata cada ponto com a norma e o documento; sem contrarrazões, ele vale como contrarrazões (art. 77, § 3º)";
       if(m) return {est:"ok", txt:`motivo: "${m}"${fim}`, fonte:"cópia do processo"};
       if(x.v.crp_motivo) return {est:"ok", txt:`motivo: "${x.v.crp_motivo}"${fim}`, fonte:"campo"};
       return {est:"informar", txt:"traga a cópia do processo com a comunicação de decisão (ou digite o motivo exato)"}; }},
    {id:"legitimidade", rot:"Quem recorre é o próprio segurado ou o procurador com procuração?", base:"Regimento do CRPS, art. 112, II e § 4º",
     conf:"conferido", campos:["crp_procuracao"],
     mede:x=>{ const p = x.v.crp_procuracao;
       if(p==="Sim") return {est:"ok", txt:"procuração assinada: o escritório tem legitimidade para recorrer", fonte:"campo"};
       if(p==="Não") return {est:"falta", txt:"assine a procuração ou o termo de representação: recurso de quem não tem legitimidade não é conhecido (art. 112, II); morto o requerente, os sucessores se habilitam (§ 4º)"};
       return {est:"informar", txt:"a procuração está assinada?"}; }},
    {id:"sem_acao_judicial_igual", rot:"Há ação na Justiça com o mesmo pedido?", base:"Lei 8.213/91, art. 126, § 3º; Regimento do CRPS, art. 86, §§ 1º a 7º, e art. 112, III",
     conf:"conferido", campos:["crp_acao_judicial"],
     mede:x=>{ const a = x.v.crp_acao_judicial;
       if(a==="Sim") return {est:"impedido", txt:"a ação com o mesmo pedido importa renúncia ao recurso e desistência do já interposto (art. 126, § 3º; Regimento, art. 86); salvo se a ação traz elemento novo, só pede andamento ou cobre só parte do objeto (§§ 2º, 5º e 7º)"};
       if(a==="Não") return {est:"ok", txt:"sem ação com o mesmo pedido", fonte:"campo"};
       return {est:"informar", txt:"já existe ação na Justiça com o mesmo pedido?"}; }},
    {id:"revisao_sem_elemento_novo", rot:"A decisão é de pedido de revisão do indeferimento? Se manteve o indeferimento ou não há documento novo, o recurso não é conhecido", base:"Regimento do CRPS, art. 112, § 7º (Portaria MPS 462/2026)",
     conf:"conferido", campos:["crp_decisao_tipo","crp_elemento_novo"],
     // § 7º: não se conhece "quando a decisão mantiver o resultado OU quando inexistirem documentos ou elementos novos"
     mede:x=>{ const v = x.v, pc = _crpProc(x), rev = v.crp_decisao_tipo ? /revis/i.test(v.crp_decisao_tipo) : !!(pc && /revis/i.test(pc.p.servico||""));
       if(!rev) return {est:"info", txt: v.crp_decisao_tipo || pc ? "a decisão não é de pedido de revisão: o § 7º não se aplica" : "só se a decisão for de pedido de revisão do indeferimento"};
       const pr = pc && /revis/i.test(pc.p.servico||"") ? pc.p : _revProcRev(x), cs = pr ? pr.comunicacoes||[] : [], mant = cs.length ? cs.some(c=>c.contra) : null;
       if(mant) return {est:"impedido", txt:"a decisão do pedido de revisão manteve o indeferimento: o recurso não é conhecido, com ou sem documento novo (Regimento, art. 112, § 7º); recorra do indeferimento direto, se ainda no prazo, ou faça novo requerimento", fonte:"cópia do processo"};
       if(v.crp_elemento_novo==="Não") return {est:"impedido", txt:"decisão de pedido de revisão sem documento novo: o recurso não é conhecido (Regimento, art. 112, § 7º); recorra do indeferimento direto ou leve documento novo"};
       if(v.crp_elemento_novo==="Sim" && mant===false) return {est:"ok", txt:"a decisão do pedido de revisão mudou o resultado e há documento novo: o § 7º não impede o recurso", fonte:"cópia do processo"};
       if(v.crp_elemento_novo==="Sim") return {est:"informar", txt:"com documento novo: a decisão do pedido de revisão manteve o indeferimento? Se manteve, o recurso não é conhecido (art. 112, § 7º); traga a cópia do processo de revisão"};
       return {est:"informar", txt:"decisão de pedido de revisão: leva documento novo? E a decisão manteve o indeferimento? Nos dois casos o recurso não é conhecido (art. 112, § 7º)"}; }},
    // F235 · no primeiro recurso a pergunta é se a prova já estava no pedido: documento entregue só agora paga da entrega
    {id:"preclusao", rot:"A prova do recurso já estava no pedido? Documento novo muda o início do pagamento", base:"IN 128/2022, art. 566, §§ 7º e 8º; Regimento do CRPS, art. 73, § 7º, e art. 112, VI",
     conf:"conferido", campos:["crp_elemento_novo"],
     mede:x=>{ const e = x.v.crp_elemento_novo;
       if(e==="Sim") return {est:"ok", txt:"documento novo, entregue só agora: vale, mas o pagamento conta da entrega dele, e não do pedido (IN 128, art. 566, §§ 7º e 8º); o que o Conselho já decidiu só volta com documento inédito (Regimento, art. 73, § 7º)"};
       if(e==="Não") return {est:"info", txt:"a prova já estava no pedido: não é documento novo, e ganhando o pagamento conta desde a data do pedido; a preclusão do Regimento (art. 73, § 7º) é do que o Conselho já decidiu"};
       return {est:"informar", txt:"a prova do recurso já estava no pedido? Documento entregue só agora vale da entrega (IN 128, art. 566, §§ 7º e 8º). E já recorreu antes deste mesmo pedido?"}; }},
    {id:"materia_de_alcada", rot:"A discussão é só médica? Então a Junta decide em definitivo", base:"Regimento do CRPS, art. 89, §§ 2º a 6º",
     conf:"conferido", campos:["crp_especie"],
     mede:x=>{ const pc = _crpProc(x), t = [x.v.crp_especie, pc && pc.p.servico].filter(Boolean).join(" "), mot = [pc && pc.c.motivo, x.v.crp_motivo].filter(Boolean).join(" ");
       if(!t && !mot) return {est:"informar", txt:"informe o benefício negado"};
       // F235 · a alçada é do motivo: a negativa por qualidade de segurado ou carência num B31 não é matéria só médica
       const naoMed = /qualidade de segurad|perda da qualidade|car[êe]ncia|contribui[çc]|renda|dependen|tempo de contribui/i.test(mot);
       const med = !naoMed && (mot ? /per[íi]cia|incapacidade|defici[êe]ncia|\bDI[DI]\b|\bDCB\b|nexo|n[ãa]o constata/i.test(mot) : /\bB?(31|32|36|87|91|92|94)\b|incapacidade|aux[íi]lio[- ](doen|acidente)|invalidez|defici/i.test(t));
       return med ? {est:"info", txt:"matéria médica: a Junta decide em definitivo, sem recurso especial (art. 89, § 3º); a Perícia Médica Federal é ouvida e o parecer vincula, salvo o agravamento pelas datas da própria perícia (§ 6º)", fonte: pc ? "cópia do processo" : "campo"}
         : {est:"info", txt:"não é matéria só médica: da decisão da Junta cabe recurso especial à Câmara", fonte: pc ? "cópia do processo" : "campo"}; }},
    {id:"relevacao_intempestividade", rot:"Perdeu o prazo? Só se o direito estiver claro", base:"Regimento do CRPS, art. 112, I e §§ 1º, 2º, 3º, 5º e 8º",
     conf:"conferido", campos:["crp_interposto_em"],
     mede:x=>{ const pz = _crpPrazo(x), it = x.v.crp_interposto_em;
       if(!pz) return {est:"informar", txt:"informe a ciência da decisão para saber se está no prazo"};
       if(!(it ? it > pz.ate : x.hoje > pz.ate)) return {est:"ok", txt:`no prazo (até ${fmtBarra(pz.ate)}): não precisa de relevação`, fonte:pz.fonte};
       return {est:"risco", txt:`fora do prazo (venceu em ${fmtBarra(pz.ate)}): só se conhece se o direito for líquido e certo, já reconhecido pelo INSS ou nas bases do governo (art. 112, §§ 1º e 2º), e sem diligência; avalie um novo requerimento`, fonte:pz.fonte}; }},
    {id:"reforma_pelo_inss", rot:"O INSS pode rever a própria decisão antes de mandar à Junta", base:"Decreto 3.048/99, art. 305, § 3º; Lei 8.213/91, art. 126, § 4º",
     conf:"conferido", campos:[],
     mede:x=>{ const cs = (x.fd.processos||[]).flatMap(p=>p.comunicacoes||[]), fav = cs.find(c=>!c.contra);
       if(fav && cs.some(c=>c.contra)) return {est:"info", txt:`há decisão favorável na cópia do processo ("${fav.decisao}"): confira se o INSS reformou antes de mandar à Junta (RPS, art. 305, § 3º)`, fonte:"cópia do processo"};
       return {est:"info", txt:"o INSS pode reformar a decisão e não mandar à Junta (RPS, art. 305, § 3º); interposto direto no CRPS, ele reanalisa em até 30 dias (Lei 8.213, art. 126, § 4º)"}; }},
    {id:"prazo_de_julgamento", rot:"A Junta tem até 365 dias para julgar", base:"Regimento do CRPS, art. 77, §§ 5º e 6º",
     conf:"conferido", campos:["crp_interposto_em"],
     mede:x=>{ const it = x.v.crp_interposto_em;
       if(!it) return {est:"info", txt:"a Junta tem 365 dias da entrada no CRPS para julgar, sem contar o tempo em diligência (art. 77, §§ 5º e 6º)"};
       const lim = somaDias(it, 365);
       if(x.hoje > lim) return {est:"falta", txt:`interposto em ${fmtBarra(it)}: passou dos 365 dias (${fmtBarra(lim)}), descontadas as diligências; é o parâmetro para mandado de segurança pela demora`, fonte:"campo", quando:lim};
       return {est:"info", txt:`a Junta tem até cerca de ${fmtBarra(lim)} (365 dias, contados da entrada no CRPS, sem as diligências)`, fonte:"campo", quando:lim}; }},
    {id:"enunciado_vinculante", rot:"Algum enunciado do Conselho Pleno resolve o motivo?", base:"Enunciados 1 a 19 do Conselho Pleno do CRPS; Regimento do CRPS, art. 124",
     conf:"conferido", campos:["crp_enunciado"],
     mede:x=>{ const pc = _crpProc(x), mot = [pc && pc.c.motivo, x.v.crp_motivo].filter(Boolean).join(" ");
       if(x.v.crp_enunciado) return {est:"ok", txt:`${x.v.crp_enunciado}: os enunciados do Conselho Pleno obrigam as Juntas e as Câmaras`, fonte:"campo"};
       const sug = CRP_ENUN.filter(([rx])=>rx.test(mot)).map(([, n, t])=>`${n} (${t})`);
       if(/car[êe]ncia/i.test(mot) && intercaladosDe(x).length) sug.push("18 (benefício intercalado conta como carência)");
       if(/car[êe]ncia/i.test(mot) && /maternidade/i.test(mot + " " + (x.v.crp_especie||""))) sug.push("19 (salário-maternidade sem carência)");
       if(sug.length) return {est:"info", txt:`o motivo sugere o Enunciado ${[...new Set(sug)].join("; ")}: confira e cite`, fonte: pc && pc.c.motivo ? "cópia do processo" : "campo"};
       return {est:"info", txt: mot ? "o motivo não casa com nenhum enunciado da lista (1, 2, 3, 5, 7, 11 a 14, 17 a 19)" : "sem o motivo não há enunciado a sugerir"}; }},
    {id:"sem_efeito_suspensivo", rot:"O recurso não suspende a decisão", base:"Lei 9.784/99, art. 61 (o Regimento do CRPS não trata do efeito no recurso de benefício)",
     conf:"conferido", campos:[],
     mede:x=>({est:"info", txt:`em regra o recurso não tem efeito suspensivo; com risco de dano de difícil reparação, peça o efeito à autoridade${/cessa|cobran/i.test(x.v.crp_decisao_tipo||"") ? ` (${_min1(x.v.crp_decisao_tipo)}: o pagamento não volta só com o recurso)` : ""}`})},
  ], {
    crp_decisao_tipo:["Que decisão se recorre", "select", ["","Indeferimento","Cessação","Concessão com valor ou espécie errados","Acerto de CNIS negado","Decisão em pedido de revisão","Cobrança de valores"]],
    crp_especie:["Benefício negado (abre os quadros da espécie)", "select", ["", ...Object.values(BENEF).flat().filter(o=>o[0]!=="crps").map(o=>o[1])]],
    crp_forma_ciencia:["Como soube da decisão", "select", ["","Consulta no Meu INSS","E-mail ou sistema (5 dias da emissão)","Carta com AR","Pessoalmente"]],
    crp_emissao:["Data de emissão da comunicação", "date"],
    crp_elemento_novo:["Leva documento novo", "select", SN],
    crp_acao_judicial:["Há ação na Justiça com o mesmo pedido", "select", SN],
    crp_procuracao:["Procuração assinada", "select", SN],
    crp_feriado_local:["Vencimento em feriado local (comprovar)", "select", SN],
    crp_interposto_em:["Data da interposição", "date"],
  }, {resumo:"Contra a decisão do INSS cabe recurso à Junta de Recursos em 30 dias contados da ciência. O recurso precisa atacar o motivo escrito na decisão e não pode existir ação na Justiça com o mesmo pedido."});
  // F235 · o recurso diz o que fazer e por que tem chance: o prazo (com a ciência estimada a confirmar), o argumento que o dossiê já
  // tem contra o motivo e a alçada; a prova que já estava no pedido não é documento novo
  const _crpCaso = x => { const pc = _crpProc(x), pz = _crpPrazo(x); return pc && pc.c.contra && pz && x.hoje <= pz.ate && !x.v.crp_interposto_em ? {p:pc.p, c:pc.c, pz, rc:{p:pc.p, c:pc.c, fatal:pz.ate, der:isoBr(pc.p.entrada||"")}} : null; };
  Object.assign(REQ_EXTRA.crps, {
    veredito: (x, a) => { const k = _crpCaso(x); if(!k) return null;
      const arg = argumentoDoRecurso(x, k.rc), alc = (a.rs.find(r=>r.id==="materia_de_alcada")||{}).txt || "";
      return {tom:"sim", txt:`Cabe recurso: vence em ${fmtBarra(k.pz.ate)} (${faltamTxt(k.pz.ate)})${k.pz.est ? `, contado da ciência estimada em ${fmtBarra(k.pz.d)} pela última atualização do pedido; confirme o dia em que a negativa foi vista` : ""}. ${arg ? `O motivo cai: ${arg}.` : "O recurso ataca o motivo escrito na decisão, ponto a ponto."}${/não é matéria só médica/.test(alc) ? " Se a Junta negar, cabe recurso especial à Câmara de Julgamento." : /matéria médica/.test(alc) ? " Matéria médica: a Junta decide em definitivo, ouvida a Perícia Médica Federal." : ""}`}; },
    agora: (x, a) => { const k = _crpCaso(x); if(!k) return [];
      const arg = argumentoDoRecurso(x, k.rc);
      return [`Recorrer até ${fmtBarra(k.pz.ate)} pelo Meu INSS (Apresentar Recurso Ordinário), atacando o motivo da negativa: "${k.c.motivo || k.c.decisao}".`,
        ...(arg ? [`O argumento, com o que o dossiê já tem: ${arg}.`] : []),
        "Não entrar na Justiça com o mesmo pedido enquanto o recurso corre: a ação faz desistir do recurso (Lei 8.213, art. 126, § 3º).",
        ...(x.v.crp_procuracao!=="Sim" ? ["Assinar a procuração ou o termo de representação antes de recorrer."] : [])]; },
  });
  Object.assign(PRE_DOSSIE, {
    // F235 · a carteira de trabalho já juntada ao pedido negado (a cópia lista os anexos) não é documento novo no recurso
    crp_elemento_novo: x => { if(x.op!=="crps") return null; const pc = _crpProc(x); if(!pc || !pc.c.contra) return null;
      return /carteira de trabalho|ctps/i.test(anexosDoPedido(pc.p).join(" ")) && /car[êe]ncia|contribui|tempo/i.test(pc.c.motivo||"")
        ? {val:"Não", fonte:"cópia do pedido: a carteira de trabalho já estava entre os documentos anexados"} : null; },
  });
})();
// F235 · os documentos anexados ao pedido, como a cópia do processo os lista ("1 - …", "2 - …")
function anexosDoPedido(p){
  const ls = String((p.anexo||{}).texto||"").split("\n"), i = ls.findIndex(l=>/Documentos anexados/i.test(l)); if(i < 0) return [];
  const out = []; for(let j = i+1; j < ls.length && j < i+40; j++){ const l = ls[j].trim(); if(/^(COMUNICA|RESUMO|INSTITUTO|P[áa]gina)/i.test(l)) break; if(/^\d+\s*-/.test(l)) out.push(l); }
  return out;
}
