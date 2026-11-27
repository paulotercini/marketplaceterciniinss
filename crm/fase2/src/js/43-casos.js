// ══════════════════════════════════════════════════════════════════════════
// F831 · ATRASADOS NO CASO (ordem do Paulo, 27.11.2026, melhorias 1 a 4 da auditoria)
// ══════════════════════════════════════════════════════════════════════════
// 1 · DER, DIB, DIP, ajuizamento e citação no caso, com a prescrição quinquenal (Lei 8.213/91, art. 103, parágrafo
//     único): o que venceu antes de 5 anos do ajuizamento está prescrito.
// 2 · a decadência da revisão (art. 103, caput): 10 anos do dia 1º do mês seguinte ao primeiro pagamento, ou do dia
//     da ciência da decisão indeferitória definitiva. Alerta no caso e no Meu Dia só nos últimos 12 meses. Não grava
//     nada no Microsoft To Do (regra até 31/12/2026).
// 3 · Tema 1124/STJ: a prova nova apresentada só em juízo leva o termo inicial dos efeitos financeiros à citação.
// 4 · a calculadora: competências do termo inicial à véspera da DIP, 13º proporcional, INPC e juros da poupança até
//     11/2021 (Manual de Cálculos da Justiça Federal) e Selic única desde 12/2021 (EC 113/2021, art. 3º). Os índices
//     vêm da tabela indices_mensais (SGS do Banco Central); o mês sem índice entra como zero e marca "conferir".
//     O resultado é estimativa para conferência e alimenta a proposta de honorários (destaque e sucumbência).
const ehRevisaoCaso = k => !!k && (/^REV/.test(k.especie||"") || variantePorEspecie(especieDoCaso(k)||k.beneficio||"")==="revisao");
const _ymMais = (ym, n) => somarMeses(ym + "-01", n).slice(0, 7);
const _r2 = v => Math.round((v + Number.EPSILON) * 100) / 100;

// a decadência mais cedo entre as duas bases que o caso tiver
function decadenciaCaso(k){
  const op = [];
  if(k && k.primeiro_pagamento_em) op.push({ate: somarAnos(somarMeses(k.primeiro_pagamento_em.slice(0,7) + "-01", 1), 10),
    base:`10 anos do dia 1º do mês seguinte ao primeiro pagamento, em ${fmtBarra(k.primeiro_pagamento_em)}`});
  if(k && k.ciencia_indeferimento_em) op.push({ate: somarAnos(k.ciencia_indeferimento_em, 10),
    base:`10 anos da ciência da decisão indeferitória definitiva, em ${fmtBarra(k.ciencia_indeferimento_em)}`});
  if(!op.length) return null;
  const d = op.sort((a, b)=>a.ate < b.ate ? -1 : 1)[0];
  return {...d, dias: diasAte(d.ate)};
}
// o alerta vale só para a revisão e só nos últimos 12 meses (regra das memórias: decadência fatal no último ano)
const alertaDecadencia = k => { if(!ehRevisaoCaso(k)) return null; const d = decadenciaCaso(k); return d && d.dias <= 365 ? d : null; };

// o termo inicial dos atrasados: a DIB, a data da prescrição (5 anos antes do ajuizamento; sem ajuizamento, de hoje)
// ou, com o Tema 1124 marcado, a citação
function termoAtrasados(k, hj){
  if(!k || !k.dib) return null;
  const ref = k.ajuizado_em || hj || hoje(), limite = somarAnos(ref, -5), t1124 = !!((k.calculo||{}).tema1124||{}).marcado;
  let termo = k.dib > limite ? k.dib : limite, motivo = k.dib > limite ? "DIB" : "prescrição quinquenal";
  if(t1124 && k.citado_em && k.citado_em > termo){ termo = k.citado_em; motivo = "citação (Tema 1124/STJ)"; }
  return {termo, motivo, limite, prescreve: k.dib < limite, projecao: !k.ajuizado_em, t1124, semCitacao: t1124 && !k.citado_em};
}

// os juros da poupança do mês (sem a TR): (1 + rendimento) / (1 + TR) - 1; antes de 07/2009, 1% ao mês (Manual)
function jurosPoupanca(idx, ym){
  if(ym < "2009-07") return {v:1};
  const p = (idx.poup_nova||{})[ym] ?? (idx.poup_antiga||{})[ym], tr = (idx.tr||{})[ym];
  if(p==null || tr==null) return {v:0, falta:true};
  return {v: ((1 + p/100) / (1 + tr/100) - 1) * 100};
}
// o reajuste anual (Lei 8.213/91, art. 41-A): o informado; sem ele, o INPC acumulado do ano anterior, desde o mês da DIB
// no primeiro reajuste. O derivado marca "conferir": vale a portaria do ano
function reajusteDoAno(p, ano){
  const inf = (p.reajustes||{})[ano];
  if(inf!=null && inf!=="" && isFinite(+inf)) return {pct:+inf};
  const dibY = +p.dib.slice(0, 4), de = ano-1===dibY ? p.dib.slice(0, 7) : `${ano-1}-01`;
  let f = 1, falta = false;
  for(let m = de; m <= `${ano-1}-12`; m = _ymMais(m, 1)){ const v = (p.idx.inpc||{})[m]; if(v==null) falta = true; else f *= 1 + v/100; }
  return {pct: _r2((f - 1) * 100), derivado:true, falta};
}
// pura, para a prova: p = {inicio, fim, dib, rmi, reajustes, piso, decimo, citado, calcEm:"AAAA-MM", idx, sm(comp "MM/AAAA")}
function calcAtrasados(p){
  const conferir = new Set(), linhas = [], idx = p.idx || {};
  if(!p.inicio || !p.fim || p.fim < p.inicio || !(p.rmi > 0)) return {linhas, total:0, nominal:0, conferir:[], rendaEm:()=>0};
  const reaj = {};
  const rendaEm = ym => {
    let r = p.rmi;
    for(let a = +p.dib.slice(0, 4) + 1; a <= +ym.slice(0, 4); a++){
      if(!reaj[a]) reaj[a] = reajusteDoAno(p, a);
      if(reaj[a].derivado) conferir.add(`reajuste de ${a} derivado do INPC${reaj[a].falta ? " (com mês sem índice)" : ""}: conferir com a portaria`);
      r = _r2(r * (1 + reaj[a].pct/100));
    }
    if(p.piso){ const sm = p.sm(`${ym.slice(5)}/${ym.slice(0, 4)}`); if(sm && sm > r) r = sm; }
    return r;
  };
  const selicAte = _ymMais(p.calcEm, -1);   // o mês do cálculo ainda não fechou: a Selic dele fica de fora
  const atualiza = (valor, venc) => {
    let v = valor, selDe = venc;
    if(venc <= "2021-11"){
      let f = 1;
      for(let m = venc; m <= "2021-11"; m = _ymMais(m, 1)){ const i = (idx.inpc||{})[m]; if(i==null) conferir.add(`INPC de ${m} sem índice`); else f *= 1 + i/100; }
      let j = 0;
      const cit = p.citado ? p.citado.slice(0, 7) : null;
      if(cit) for(let m = venc > cit ? venc : cit; m <= "2021-11"; m = _ymMais(m, 1)){ const x = jurosPoupanca(idx, m); if(x.falta) conferir.add(`juros da poupança de ${m} sem índice`); j += x.v; }
      v = valor * f * (1 + j/100); selDe = "2021-12";
    }
    let s = 0;
    for(let m = selDe; m <= selicAte; m = _ymMais(m, 1)){ const i = (idx.selic||{})[m]; if(i==null) conferir.add(`Selic de ${m} sem índice`); else s += i; }
    return _r2(v * (1 + s/100));
  };
  const ini = p.inicio.slice(0, 7), fim = p.fim.slice(0, 7);
  let mesesAno = 0;
  for(let m = ini; m <= fim; m = _ymMais(m, 1)){
    const ult = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5), 0)).getUTCDate();
    const d0 = m===ini ? +p.inicio.slice(8) : 1, d1 = m===fim ? +p.fim.slice(8) : ult, dias = d1 - d0 + 1;
    const renda = rendaEm(m), devido = _r2(renda * (dias===ult ? 1 : dias/ult)), venc = _ymMais(m, 1);
    linhas.push({comp:m, renda, dias, devido, atualizado: atualiza(devido, venc)});
    if(dias >= 15) mesesAno++;
    // o 13º proporcional vence com dezembro ou com a última competência (meses com 15 dias ou mais)
    if(p.decimo && (m.slice(5)==="12" || m===fim) && mesesAno){
      const ab = _r2(renda * mesesAno / 12);
      linhas.push({comp:m, decimo:true, meses:mesesAno, renda, devido:ab, atualizado: atualiza(ab, venc)});
    }
    if(m.slice(5)==="12") mesesAno = 0;
  }
  const soma = c => _r2(linhas.reduce((a, l)=>a + l[c], 0));
  return {linhas, total: soma("atualizado"), nominal: soma("devido"), conferir:[...conferir], rendaEm};
}
// o valor da causa no ajuizamento (vencidas mais 12 vincendas, Lei 10.259/2001, art. 3º, § 2º) contra 60 mínimos
function alcadaJef(c, ajuiz, sm){
  const ym = ajuiz.slice(0, 7), venc = _r2(c.linhas.filter(l=>l.comp < ym).reduce((a, l)=>a + l.devido, 0));
  const vincendas = _r2(c.rendaEm(ym) * 12), limite = 60 * (sm(`${ym.slice(5)}/${ym.slice(0, 4)}`) || 0);
  return {vencidas: venc, vincendas, causa: _r2(venc + vincendas), limite, acima: limite > 0 && venc + vincendas > limite};
}

// ── índices: lidos uma vez por sessão da tabela indices_mensais ──────────────
let _idxAtr = null;
async function indicesAtrasados(){
  if(_idxAtr) return _idxAtr;
  const idx = {inpc:{}, selic:{}, tr:{}, poup_antiga:{}, poup_nova:{}};
  try{
    const ls = await api(`/rest/v1/indices_mensais?select=serie,competencia,valor&order=competencia&limit=5000`);
    for(const l of ls||[]) if(idx[l.serie]) idx[l.serie][l.competencia] = +l.valor;
  }catch(e){ idx.erro = true; }
  return (_idxAtr = idx);
}
// os parâmetros do caso para a conta (com ou sem o Tema 1124)
function paramsAtrasados(k, idx, comTema){
  const cal = k.calculo || {}, hj = hoje();
  const t = termoAtrasados(comTema ? k : {...k, calculo:{...cal, tema1124:null}}, hj); if(!t) return null;
  const fim = k.dip ? somaDias(k.dip, -1) : hj;
  return {t, p:{inicio:t.termo, fim, dib:k.dib, rmi:+cal.rmi || 0, reajustes:cal.reajustes||{}, piso:cal.piso!==false, decimo:cal.decimo!==false,
    citado:k.citado_em||null, calcEm:hj.slice(0, 7), idx, sm:salarioMinimo}};
}
function resultadoAtrasados(k, idx){
  const a = paramsAtrasados(k, idx, true); if(!a) return null;
  const c = calcAtrasados(a.p);
  const b = a.t.t1124 ? calcAtrasados(paramsAtrasados(k, idx, false).p) : null;
  // a alçada se mede pelo pedido (prescrição só), e não pelo que o Tema 1124 deixar
  const pc = b || c, jef = alcadaJef(pc, k.ajuizado_em || hoje(), salarioMinimo);
  return {t:a.t, p:a.p, c, semTema:b, jef};
}

// ── no cartão do caso: as datas, o alerta e o botão ──────────────────────────
function chipsAtrasados(k){
  if(!ehPrev(k)) return "";
  const out = [], t = termoAtrasados(k), dec = alertaDecadencia(k), naLinha = new Set(camposEssenciais(k).map(soCampo));
  // a data base na linha já mostra o "decai em" (lcJanela): o chip só aparece quando ela não está à vista
  if(dec && !["primeiro_pagamento_em","ciencia_indeferimento_em"].some(c=>k[c] && naLinha.has(c))) out.push(`<span class="lc-f lc-dec" title="${esc(dec.base)} (Lei 8.213/91, art. 103)"><span class="lc-k">Decadência</span>
    <span class="lc-jan venc">${dec.dias < 0 ? `decaiu em ${fmtBarra(dec.ate)}` : `até ${fmtBarra(dec.ate)}`}</span></span>`);
  if(t && t.prescreve) out.push(`<span class="lc-f" title="parcelas anteriores a ${fmtBarra(t.limite)} prescritas: 5 anos ${t.projecao ? "contados de hoje (ainda sem ajuizamento)" : "do ajuizamento"} (Lei 8.213/91, art. 103, parágrafo único)">
    <span class="lc-k">Atrasados desde</span><span class="lc-num">${fmtBarra(t.termo)}</span></span>`);
  if(t && t.t1124) out.push(`<span class="chip" title="prova nova apresentada somente em juízo: efeitos financeiros desde a citação">Tema 1124</span>`);
  const mostra = k.dib || faseEfetiva(k)==="judicial" || ehRevisaoCaso(k) || k.calculo;
  if(mostra) out.push(`<button type="button" class="btn-mini lc-atr" onclick="abrirAtrasados('${k.id}')" title="prescrição, decadência, Tema 1124 e a estimativa dos atrasados">Atrasados</button>`);
  return out.join("");
}
const _CAMPOS_ATR = [["der","DER"],["dib","DIB"],["dip","DIP"],["ajuizado_em","Ajuizamento"],["citado_em","Citação"]];
const _CAMPOS_REV = [["primeiro_pagamento_em","1º pagamento"],["ciencia_indeferimento_em","Ciência do indeferimento"]];
async function abrirAtrasados(casoId){
  const k = D.casoPorId.get(casoId); if(!k) return;
  caixa(`<div id="atr-cx"><p class="meio-sub">Carregando os índices…</p></div>`);
  const idx = await indicesAtrasados();
  const cx = document.getElementById("atr-cx"); if(cx) cx.innerHTML = htmlAtrasados(k, idx);
}
function htmlAtrasados(k, idx){
  const cal = k.calculo || {}, t1124 = cal.tema1124 || {}, rev = ehRevisaoCaso(k), c = D.cliPorId.get(k.cliente_id);
  const campo = ([f, r]) => `<label class="meio-sub atr-campo">${r} <input type="date" data-atr="${f}" value="${esc(k[f]||"")}"></label>`;
  const dec = rev ? decadenciaCaso(k) : null, R = k.dib ? resultadoAtrasados(k, idx) : null;
  const anos = R ? [...new Set(R.c.linhas.map(l=>+l.comp.slice(0, 4)))].filter(a=>a > +k.dib.slice(0, 4)) : [];
  const pct = c && typeof termosHon==="function" ? (termosHon(c, k, "rec")||{}).pctAtr || 0 : 0;
  let res = "";
  if(!k.dib) res = `<p class="meio-sub">Informe a DIB para calcular.</p>`;
  else if(!(+cal.rmi > 0)) res = `<p class="meio-sub">Informe a RMI para calcular.</p>`;
  else{
    const {t, c:cc, semTema, jef} = R, sm = salarioMinimo(`${hoje().slice(5, 7)}/${hoje().slice(0, 4)}`) || 0;
    const porAno = new Map(); cc.linhas.forEach(l=>{ const a = l.comp.slice(0, 4); porAno.set(a, _r2((porAno.get(a)||0) + l.atualizado)); });
    res = `<p class="atr-total"><b>Estimativa para conferência: ${moeda(cc.total)}</b> <small class="meio-sub">(${moeda(cc.nominal)} sem correção; ${cc.linhas.filter(l=>!l.decimo).length} competências de ${fmtBarra(t.termo)} a ${fmtBarra(R.p.fim)}${k.dip ? ", véspera da DIP" : ", hoje (sem DIP)"})</small></p>
      <p class="meio-sub">Correção pelo INPC e juros da poupança${k.citado_em ? " desde a citação" : " (sem citação: juros não contados)"} até 11/2021 (Manual de Cálculos da Justiça Federal); Selic única desde 12/2021 (EC 113/2021, art. 3º), até ${fmtBarra(_ymMais(R.p.calcEm, -1) + "-01").slice(3)}.</p>
      ${semTema ? `<p class="atr-1124">Sem o Tema 1124 seriam ${moeda(semTema.total)}: a prova só em juízo tira ${moeda(_r2(semTema.total - cc.total))} dos atrasados${pct ? ` e ${moeda(_r2((semTema.total - cc.total) * pct / 100))} do honorário de êxito (${pct}%)` : ""}.</p>` : ""}
      <p class="${jef.acima ? "atr-alerta" : "meio-sub"}">Valor da causa ${jef.causa ? `${moeda(jef.causa)} (${moeda(jef.vencidas)} vencidas e ${moeda(jef.vincendas)} de 12 vincendas)` : "não calculado"}, ${k.ajuizado_em ? "no ajuizamento" : "se ajuizado hoje"}; 60 salários mínimos: ${moeda(jef.limite)} (Lei 10.259/2001, art. 3º, § 2º).${jef.acima
        ? " Acima do limite: fora da competência do JEF, salvo renúncia expressa ao excedente (Tema 1030/STJ)." : ""}</p>
      ${sm && cc.total > 60 * sm ? `<p class="atr-alerta">O total passa de 60 salários mínimos (${moeda(60 * sm)}): RPV só com renúncia ao excedente; sem ela, precatório (Lei 10.259/2001, art. 17, § 4º).</p>` : ""}
      ${pct ? `<p class="meio-sub">Honorário contratual de ${pct}% sobre os atrasados: ${moeda(_r2(cc.total * pct / 100))}, a destacar na RPV ou no precatório (EAOAB, art. 22, § 4º). Sucumbência, se fixada em 10% das parcelas vencidas até a sentença (Súmula 111/STJ): cerca de ${moeda(_r2(cc.total * 0.1))}; no JEF de primeiro grau não há (Lei 9.099/95, art. 55).</p>` : ""}
      ${cc.conferir.length ? `<p class="atr-alerta">Conferir: ${esc(cc.conferir.slice(0, 6).join("; "))}${cc.conferir.length > 6 ? ` e mais ${cc.conferir.length - 6}` : ""}.</p>` : ""}
      ${idx.erro ? `<p class="atr-alerta">A tabela de índices não respondeu: todos os índices entraram como zero. Conferir.</p>` : ""}
      <details><summary>Por ano</summary><ul class="atr-anos">${[...porAno].map(([a, v])=>`<li>${a}: ${moeda(v)}</li>`).join("")}</ul></details>`;
  }
  return `<h3 style="margin:0 0 4px">Atrasados <small class="meio-sub">· ${esc(tituloCaso(k))}</small></h3>
    <div class="form-linha atr-datas" style="flex-wrap:wrap;gap:8px">${_CAMPOS_ATR.map(campo).join("")}${rev ? _CAMPOS_REV.map(campo).join("") : ""}</div>
    ${R ? `<p class="meio-sub">${R.t.prescreve ? `Prescritas as parcelas anteriores a <b>${fmtBarra(R.t.limite)}</b>, 5 anos ${R.t.projecao ? "contados de hoje, ainda sem ajuizamento" : "antes do ajuizamento"} (Lei 8.213/91, art. 103, parágrafo único). ` : "Nenhuma parcela prescrita. "}Atrasados exigíveis desde <b>${fmtBarra(R.t.termo)}</b> (${esc(R.t.motivo)}).${R.t.semCitacao ? " Informe a citação: com o Tema 1124 marcado, é dela que contam os efeitos financeiros." : ""}</p>` : ""}
    ${dec ? `<p class="${dec.dias <= 365 ? "atr-alerta" : "meio-sub"}">Decadência da revisão ${dec.dias < 0 ? "consumada em" : "em"} <b>${fmtBarra(dec.ate)}</b>: ${esc(dec.base)} (Lei 8.213/91, art. 103).</p>` : rev ? `<p class="meio-sub">Decadência: informe o 1º pagamento ou a ciência do indeferimento definitivo.</p>` : ""}
    <fieldset class="atr-1124-f"><legend>Tema 1124/STJ</legend>
      <label><input type="checkbox" id="atr-1124" ${t1124.marcado ? "checked" : ""}> Prova nova apresentada somente em juízo</label>
      <input id="atr-prova" placeholder="qual prova" value="${esc(t1124.prova||"")}" style="width:100%;margin-top:4px">
      <small class="meio-sub">Marcado, o termo inicial dos efeitos financeiros vai para a citação${k.citado_em ? ` (${fmtBarra(k.citado_em)})` : ""}.</small></fieldset>
    <div class="form-linha" style="flex-wrap:wrap;gap:8px;align-items:center">
      <label class="meio-sub">RMI <input id="atr-rmi" inputmode="decimal" value="${cal.rmi ? String(cal.rmi).replace(".", ",") : ""}" placeholder="0,00" style="width:110px"></label>
      <label class="meio-sub"><input type="checkbox" id="atr-piso" ${cal.piso!==false ? "checked" : ""}> Piso do mínimo</label>
      <label class="meio-sub"><input type="checkbox" id="atr-13" ${cal.decimo!==false ? "checked" : ""}> 13º</label></div>
    ${anos.length ? `<div class="form-linha atr-reaj" style="flex-wrap:wrap;gap:6px"><span class="meio-sub">Reajustes (%):</span>${anos.map(a=>{
      const r = reajusteDoAno(R.p, a);
      return `<label class="meio-sub">${a} <input data-reaj="${a}" inputmode="decimal" value="${r.derivado ? "" : String(r.pct).replace(".", ",")}" placeholder="${String(r.pct).replace(".", ",")}" style="width:64px">${r.derivado ? ` <span class="lc-jan venc">conferir</span>` : ""}</label>`; }).join("")}</div>` : ""}
    <div class="atr-res">${res}</div>
    <div style="display:flex;gap:8px;margin-top:8px"><button class="adr-bt adr-primario" onclick="calcularAtrasados('${k.id}')">Calcular</button></div>`;
}
const _numBR = s => { const t = String(s||"").trim().replace(/\./g, "").replace(",", "."); return t && isFinite(+t) ? +t : null; };
async function calcularAtrasados(casoId){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const corpo = {}, q = s => document.querySelector(s);
  document.querySelectorAll("#atr-cx [data-atr]").forEach(i=>{ const v = i.value || null; if(v !== (k[i.dataset.atr]||null)) corpo[i.dataset.atr] = v; });
  const reajustes = {}; document.querySelectorAll("#atr-cx [data-reaj]").forEach(i=>{ const v = _numBR(i.value); if(v!=null) reajustes[i.dataset.reaj] = v; });
  const prova = (q("#atr-prova")||{}).value || "";
  const cal = {...(k.calculo||{}), rmi:_numBR((q("#atr-rmi")||{}).value), piso:!!(q("#atr-piso")||{}).checked, decimo:!!(q("#atr-13")||{}).checked, reajustes,
    tema1124:{marcado:!!(q("#atr-1124")||{}).checked, prova:prova.trim()}};
  if(cal.tema1124.marcado && !cal.tema1124.prova) return aviso("Diga qual prova foi apresentada somente em juízo");
  const kNovo = {...k, ...corpo, calculo:cal}, idx = await indicesAtrasados(), R = kNovo.dib && cal.rmi ? resultadoAtrasados(kNovo, idx) : null;
  // o último resultado fica no caso: é ele que a proposta de honorários lê
  cal.resultado = R ? {total:R.c.total, semTema:R.semTema ? R.semTema.total : null, termo:R.t.termo, em:hoje()} : null;
  corpo.calculo = cal;
  try{ await patchCaso(casoId, corpo); }catch(e){ return aviso("Não gravou: rode a migração f831 no Supabase"); }
  Object.assign(k, corpo);
  const cx = document.getElementById("atr-cx"); if(cx) cx.innerHTML = htmlAtrasados(k, idx);
  aviso(R ? `Estimativa: ${moedaTxt(R.c.total)}` : "Datas gravadas", false);
  repintarFicha();
}

// ── Meu Dia: as revisões com decadência nos próximos 12 meses ────────────────
function blocoDecadenciaDia(col){
  const it = ativos().filter(k=>!col || (D.atrDoCaso.get(k.id)||[]).includes(col))
    .map(k=>({k, d:alertaDecadencia(k)})).filter(x=>x.d && x.d.dias >= 0).sort((a, b)=>a.d.ate < b.d.ate ? -1 : 1);
  if(!it.length) return "";
  return `<section class="pl-grupo" data-tom="dec"><h3 class="secao">Decadência em até 12 meses <span class="pl-n">${it.length}</span></h3>`
    + it.map(({k, d})=>{ const c = D.cliPorId.get(k.cliente_id)||{};
      return `<div class="ag-dec" style="display:flex;gap:8px;align-items:center;padding:6px 0"><b>${esc(c.nome||"")}</b><span>${esc(tituloCaso(k))}</span>
        <span class="lc-jan venc" title="${esc(d.base)} (Lei 8.213/91, art. 103)">decai em ${fmtBarra(d.ate)}, ${d.dias} d</span>
        <button class="btn-mini" style="margin-left:auto" onclick="abrirFicha('${k.cliente_id}')">Abrir</button></div>`; }).join("")
    + `</section>`;
}
