async function planoParaLembrete(cliId, analiseId, itemId){
  const a=(D.analises||[]).find(x=>x.id===analiseId);
  const p=(((a||{}).detalhes||{}).plano||[]).find(x=>x.id===itemId); if(!p) return;
  try{
    const [l]=await api(`/rest/v1/lembretes`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({cliente_id:cliId, tipo:"geral", titulo:`Contribuição: ${(p.texto||"").slice(0,80)}`,
        detalhes:{origem:"plano", plano_item:p.id, analise_id:analiseId}, proximo_em:p.data,
        responsavel_id:eu.id, criado_por:eu.id, ativo:true})});
    if(l) (D.lembretes=D.lembretes||[]).push(l);
  }catch(e){ return aviso("Não consegui criar o lembrete — tente de novo"); }
  aviso(`Lembrete criado para ${fmt(p.data)}`, false); repintarFicha();
}
// "Verificar em DD/MM" na última anotação: a data seguinte à da anotação
function proximaVerificacao(c){
  const n=notasSemRepeticao(feedAnotacoes(c))[0]; if(!n) return null;
  const ms=[...String(n.texto||"").matchAll(/verificar em (\d{1,2})\/(\d{1,2})/gi)]; if(!ms.length) return null;
  const [, dd, mm]=ms[ms.length-1], base=String(n.em||hoje()).slice(0,10);
  let iso=`${base.slice(0,4)}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`;
  if(iso<base) iso=`${+base.slice(0,4)+1}${iso.slice(4)}`;
  return iso;
}
function pendenciasDireito(c){
  const itens=[];
  if(!c.dn) itens.push({ok:false, nome:"Data de nascimento", sub:"preencher na Identificação", ir:"identificacao"});
  const g=cnisDe(c);
  itens.push(g ? {ok:true, nome:"CNIS", sub:`recebido em ${fmt(g.em)}`} : {ok:false, nome:"CNIS", sub:"inserir na Identificação", ir:"identificacao"});
  for(const p of ((c.campos||{}).docs_pedidos||[])) for(const it of (p.itens||[]))
    itens.push({ok:!!it.entregue, nome:String(it.nome||it), sub:it.entregue?`entregue em ${fmt(it.entregue)}`:p.em?`pedido em ${fmt(p.em.slice(0,10))}`:"pedido"});
  const pv=proximaVerificacao(c);
  return `<section class="adr-card adr-pend" aria-labelledby="adr-t-pend">
    <h2 class="adr-h" id="adr-t-pend">Pendências e documentos</h2>
    ${pv?`<p class="adr-verif${pv<hoje()?" venceu":""}">próxima verificação: <b>${esc(fmt(pv))}</b></p>`:""}
    <ul class="adr-pend-lista">${itens.map(i=>`<li><span class="adr-ponto ${i.ok?"ok":"falta"}" aria-hidden="true"></span>
      <span><b>${esc(i.nome)}</b> <span class="sr-so">${i.ok?"(entregue)":"(falta)"}</span><br>${i.ir?`<button type="button" class="adr-link" onclick="irSubCad('${i.ir}')">${esc(i.sub)}</button>`:`<span class="adr-sub">${esc(i.sub)}</span>`}</span></li>`).join("")}</ul>
  </section>`;
}
const _adSel = new Map();
// F282 · o parecer da Manutenção da Qualidade de Segurado, dentro da Análise de Direito
function secaoManutencaoAnalise(c){
  return `<section class="adx-sec mq-analise" aria-labelledby="mq-an-t"><div class="adm-cab"><h3 id="mq-an-t">Manutenção da Qualidade de Segurado</h3></div>${blocoManutencao(c, "analise")}</section>`;
}
function painelDireito(c){
  if(D.analises===null)
    return `<p class="meio-sub">A tabela desta página ainda não existe no banco — rode o
      <b>crm/fase2/schema_analise_direito.sql</b> no SQL Editor do Supabase e recarregue o CRM.</p>`;
  if(telaSimples("ad", c)) return adSimples(c);   // F249 · nível 1 e 2 antes da onda 6
  const as=analisesDe(c.id), ult=analisesDaVez(c)[0];   // F231 · a última do pré-caso no atendimento
  const ks=D.casosDoCliente.get(c.id)||[];
  const notas=[];
  for(const l of (D.lembretes||[]).filter(x=>x.cliente_id===c.id && x.tipo==="aposentadoria_futura"))
    ((l.detalhes||{}).anotacoes||[]).forEach((n,i)=>{ if(!n.analise_id) notas.push({...n, lembId:l.id, i}); });
  const plano=planejamentoDireito(c, ult);
  // F206 · mais de uma análise: as datas em quadrados, e o clique mostra aquela análise inteira
  const sel = as.find(a=>a.id===_adSel.get(c.id)) || ult;
  const datas = as.length>1 ? `<nav class="ad-datas" aria-label="Análises de Direito">${as.map(a=>`<button type="button" class="${a===sel?"on":""}"
    aria-pressed="${a===sel}" onclick="_adSel.set('${c.id}','${a.id}');repintarFicha()">${esc(fmt(a.data_analise))}<small>${esc(a.fonte||"manual")}</small></button>`).join("")}</nav>` : "";
  const anteriores = datas ? [] : as.slice(1);
  const atend = _atendAberto.has(c.id) && !!preCasoAberto(c);   // F234
  // F239 · com um benefício só, ele já abre: o passo "Benefício" não pede clique
  if(atend && !adBenefAberto(c) && opcoesSel(c).length===1) _adBenef.set(adChave(c), opcoesSel(c)[0].o);
  const ab = adBenefAberto(c);
  // F239 · no atendimento, a Análise de Direito em passos: Benefício, Já resolvido, Falta responder, Conclusão
  const tp = atend ? passosDaTela("ad", c, adPassosDe(c, ks, ab)) : null, oc = id => tp && !tp.tudo && id!==tp.at ? " hidden" : "";
  const principal = tp
    ? `<div class="adx-main tp-raiz${tp.tudo ? " tp-tudo" : ""}"${tp.attrs}>${tp.trilha}
        <div class="tp-passo" data-passo="pend"${oc("pend")}>${quadroProblemasPA(c, ks)}</div>
        ${quadradoEmPasso(quadradoBeneficios(c, ks), oc)}
        ${ab ? painelBeneficio(c, ks, ab, oc) : `<div id="ad-benef"></div>`}
        <div class="tp-passo" data-passo="concl"${oc("concl")}>${caixaConsideracoes(c)}${secaoManutencaoAnalise(c)}${formAnalise(c)}${linhaDesfecho(c)}</div>
        <div class="tp-pe">${tp.nav}</div></div>`
    : `<div class="adx-main">${quadradoBeneficios(c, ks)}${ab ? painelBeneficio(c, ks, ab) : `<div id="ad-benef"></div>`}${caixaConsideracoes(c)}${secaoManutencaoAnalise(c)}${quadroDesfecho(c)}${formAnalise(c)}</div>`;
  return `<div class="adr">
    <div class="ad-topo">${faixaDoCaso(ks)}
      <span class="ad-topo-fim">${chipParceria(c, ks)}
      <button type="button" class="tl-bt tl-quieto" onclick="irSubCad('identificacao')"
        title="a parceria e o CNIS se alteram na Identificação">Alterar<span class="sr-only"> na Identificação</span></button>
      ${cnisDe(c)&&cnisDe(c).caminho?`<button type="button" class="tl-bt" onclick="abrirCnis('${c.id}')" title="abre o extrato guardado em outra aba (CNIS de ${esc(fmt(cnisDe(c).em))})"><span aria-hidden="true">CNIS</span><span class="sr-only">Abrir CNIS</span></button>`
        :`<button type="button" class="tl-bt tl-falta" onclick="irSubCad('identificacao')" title="o CNIS ainda não foi inserido: insira na Identificação">Inserir<span class="sr-only"> CNIS</span></button>`}</span>
    </div>
    <div class="adx-grade">${principal}
      <aside class="adx-lado">${listaConsideracoes(c)}</aside></div>
    ${atend ? `<details class="adr-hist" id="ad-hist"><summary>Análises anteriores e histórico</summary>` : ""}
    ${resumoDireito(c, ult)}
    ${datas}
    ${sel ? fichaDaAnalise(sel) : ""}
    ${ult ? regrasDireito(ult) : ""}
    <div class="adr-colunas">
      ${plano||anteriores.length ? `<div class="adr-col-larga">${plano}
        ${anteriores.length?`<section class="adr-anteriores" aria-labelledby="adr-t-ant"><h2 class="adr-h" id="adr-t-ant">Análises anteriores</h2>
          ${anteriores.map(cartaoAnalise).join("")}</section>`:""}</div>` : ""}
      <aside class="adr-col-lado">${quadroDossie(c, ks)}${pendenciasDireito(c)}${quadroAndamentos(c)}${quadroTriagemDireito(c, ks)}</aside>
    </div>
    ${notas.length?`<div class="caso" style="margin-top:10px;border-left:3px solid var(--roxo)">
      <div class="rotulo-caso">Anotações antigas do To Do (lista Aposentadorias Futuras)</div>
      <p class="meio-sub">O que você anotava para lembrar no futuro. "→ virar análise" traz a anotação
        para cá, já com a data original.</p>
      <ul class="mov-lista" style="margin-top:4px">${notas.map(n=>`<li>
        <span class="mov-data">${n.data?fmt(n.data):"—"}</span>
        <span class="mov-txt">${n.inicial&&n.inicial!=="?"?`<b>${esc(n.inicial)}:</b> `:""}${esc(n.texto||"")}</span>
        <button class="btn-mini" onclick="notaViraAnalise('${n.lembId}',${n.i})" title="→ virar análise"><span aria-hidden="true">→ Analisar</span><span class="sr-only">→ virar análise</span></button>
      </li>`).join("")}</ul></div>`:""}
    ${atend ? "</details>" : ""}
  </div>`;
}
// ══════════════════════════════════════════════════════════════════════════
// F234 · A ANÁLISE DE DIREITO POR BENEFÍCIO (docs/PRIMEIRO-ATENDIMENTO-QUADROS.md)
// ══════════════════════════════════════════════════════════════════════════
// Primeiro o quadrado com os benefícios escolhidos; o clique num benefício abre, logo
// abaixo, os requisitos DELE (motor F232), com os campos que cada requisito pede, a
// tabela de tempos quando o benefício soma tempo e, fechado no pé, o que veio do
// Primeiro atendimento. Um benefício por vez; nada abre antes do clique. Trocar de
// benefício ou mudar um campo repinta só o trecho, para não perder o que se digitou.
const _adBenef = new Map();   // cliId|pcId → a opção aberta
const adChave = c => `${c.id}|${(preCasoAberto(c)||{}).id||""}`;
const adBenefAberto = c => { const o = _adBenef.get(adChave(c)); return o && opcoesSel(c).some(x=>x.o===o) ? o : null; };
function adContagem(a){
  if(!a) return "sem requisitos no catálogo";
  return `${a.ok} de ${a.total} em ordem` + [[a.provar, "a provar"], [a.informar, "a informar"], [a.falta, a.falta===1 ? "falta" : "faltam"], [a.risco, "em risco"], [a.divergente, a.divergente===1 ? "divergente" : "divergentes"]]
    .filter(([n])=>n).map(([n, r])=>` · ${n} ${r}`).join("");
}
function quadradoBeneficios(c, ks){
  const ops = opcoesSel(c), ab = adBenefAberto(c);
  const bt = o => { const a = avaliarReq(o.o, reqCtx(c, ks, o.o)), cls = (REQ_EST[a ? a.pior : "info"]||[])[1] || "info";
    return `<button type="button" class="adq-bt${ab===o.o?" on":""}" aria-pressed="${ab===o.o}" data-op="${o.o}" onclick="adAbrirBenef('${c.id}','${o.o}')">
      <b>${esc(o.rot)}</b><span class="adq-sub"><i class="pa-bola ${cls}" aria-hidden="true"></i>${esc(adContagem(a))}</span>${(v=>v ? `<span class="adq-ver tom-${v.tom}">${esc(v.txt.length > 96 ? v.txt.slice(0, 93).replace(/\s+\S*$/, "") + "…" : v.txt)}</span>` : "")(vereditoReq(o.o, reqCtx(c, ks, o.o), a))}</button>`; };
  return `<section class="adq" id="ad-quadrado" aria-labelledby="adq-t">
    <div class="adq-cab"><h3 id="adq-t">Benefícios em análise</h3>
      <button type="button" class="btn-mini" aria-expanded="false" onclick="adMaisBenef(this)">＋ benefício</button></div>
    ${ops.length ? `<div class="adq-bts">${ops.map(bt).join("")}</div>
      <p class="meio-sub adq-dica">${ab ? "Os requisitos do benefício aberto estão logo abaixo." : "Clique num benefício para ver os requisitos dele."}</p>`
      : `<p class="meio-sub">Nenhum benefício escolhido. Use ＋ benefício${_atendAberto.has(c.id) ? " ou volte ao Primeiro atendimento" : ""}.</p>`}
    <div class="adq-mais" hidden>${faixaBeneficios(c, null)}</div>
  </section>`;
}
// um campo do catálogo (CAMPO_AD), gravado no ad do pré-caso a cada mudança
function campoAd(c, k, v, dica){
  const [rot, tipo, ops] = CAMPO_AD[k] || [k, "text"], val = v[k] ?? "";
  const dv = dica && dica.val ? (/^\d{4}-\d{2}-\d{2}$/.test(String(dica.val)) ? fmtBarra(dica.val) : String(dica.val)) : "";
  const nota = dv && !val ? `<small class="adm-dica">Usando ${esc(dv)}${dica.fonte && !dica.doDossie ? `, ${esc(dica.fonte)}` : " (do dossiê)"}; preencha só se for outro valor.</small>` : "";
  return `<label class="adm-campo"><span>${esc(rot)}</span>${tipo==="select"
    ? `<select data-adm="${k}" onchange="admCampo('${c.id}',this)">${(typeof ops==="function" ? ops() : ops||SN).map(o=>`<option value="${esc(o)}" ${String(val)===o?"selected":""}>${esc(o||"—")}</option>`).join("")}</select>`
    : `<input type="${tipo==="month" ? "month" : tipo}" data-adm="${k}" value="${esc(val)}" ${tipo==="number"?'min="0" step="0.01"':""} onchange="admCampo('${c.id}',this)">`}${nota}</label>`;
}
// F235 · o código do campo (dep_fato, ins_ultima_contrib) é do catálogo, não de quem atende: some da tela
const semCodigo = s => String(s||"").replace(/\s*\((?:[a-z]{2,6}_[a-z0-9_]+(?:,\s*|\s+e\s+|\s+ou\s+)?)+\)/g, "");
// F235 · o requisito que é prazo (o pedido em 30 ou 90 dias, o recurso, a decadência): o vermelho dele é "peça já"
const ehPrazo = r => /^prazo correndo|^peça até|^pedir até|^recorrer até|prazo até/i.test(String(r.txt||"")) || /prazo|decad[êe]ncia/i.test(String(r.id||""));
// F235 · a resposta da pergunta que a pessoa fez, antes da lista: pode pedir? se não, por quê e quando.
// O catálogo pode trazer a frase própria (REQ_EXTRA[op].veredito); sem ela, sai dos estados.
function vereditoReq(op, x, a){ const v = vereditoReq0(op, x, a); return v ? {...v, txt:semCodigo(v.txt)} : v; }
function vereditoReq0(op, x, a){
  if(!a) return null;
  const f = (REQ_EXTRA[op]||{}).veredito;
  if(f){ try{ const v = f(x, a); if(v) return v; }catch(e){} }
  const p = est => a.rs.find(r=>r.est===est && !ehPrazo(r)), rot = r => r.rot.replace(/\s*\?$/, "?");
  const imp = p("impedido"); if(imp) return {tom:"nao", txt:`Não cabe. ${rot(imp)} ${imp.txt}`};
  const fl = p("risco") || p("falta"); if(fl) return {tom:"ainda", txt:`Ainda não. ${rot(fl)} ${fl.txt}`};
  // F235 · o prazo correndo, sozinho, não barra: o pedido cabe, e cabe já
  const pz = a.rs.find(r=>ehPrazo(r) && ["risco","falta"].includes(r.est));
  if(pz && !a.informar) return {tom:"sim", txt:`Sim, e o prazo corre: ${cap1(pz.txt.replace(/^prazo correndo:\s*/i, ""))}.`.replace(/\.\.$/, ".")};
  if(pz) return {tom:"ainda", txt:`O prazo corre: ${pz.txt.replace(/^prazo correndo:\s*/i, "")}. ${plu(a.informar, "resposta falta", "respostas faltam")} para concluir: ${a.rs.filter(r=>r.est==="informar").slice(0, 3).map(r=>r.rot.replace(/\s*\?$/, "").replace(/^./, s=>s.toLowerCase())).join("; ")}.`};
  const pr = p("provar"); if(pr) return {tom:"ainda", txt:pr.txt.replace(/\.?$/, ".")};
  if(a.quando && a.quando > x.hoje) return {tom:"ainda", txt:`Ainda não: o direito chega em ${fmtBarra(a.quando)}.`};
  if(a.informar) return {tom:"informar", txt:`Falta${a.informar===1 ? "" : "m"} ${plu(a.informar, "resposta", "respostas")} para concluir: ${a.rs.filter(r=>r.est==="informar").slice(0, 3).map(r=>r.rot.replace(/\s*\?$/, "").replace(/^./, s=>s.toLowerCase())).join("; ")}.`};
  if(a.divergente) return {tom:"sim", txt:"Sim, com ponto em que o INSS e a Justiça divergem: o advogado decide a via."};
  // F235 · "direito desde" soava como atrasados: a aposentadoria e o BPC pagam a partir do pedido (Lei 8.213/91, art. 49)
  return {tom:"sim", txt: !a.quando ? "Sim: os requisitos estão em ordem; pode pedir."
    : /^(def|idoso)$/.test(op) ? `Sim: pode pedir desde ${fmtBarra(a.quando)}; o BPC é pago a partir do pedido.`
    : `Sim: cumpre os requisitos desde ${fmtBarra(a.quando)}; o pagamento começa no dia do pedido, então peça logo.`};
}
const adReqDin = r => { const [rotE, cls] = REQ_EST[r.est];
  return `<i class="pa-bola ${cls}" aria-hidden="true"></i><span class="adb-est est-${r.est}">${rotE}</span>
    <p class="adb-txt">${esc(semCodigo(r.txt))}${r.fonte ? ` <small>· ${esc(r.fonte)}</small>` : ""}</p>
    ${(r.pre||[]).length ? `<p class="adb-pre">Do dossiê, a confirmar com a pessoa: ${r.pre.map(p=>`<b>${esc(p.rot)}</b> ${esc(p.val)} <small>(${esc(p.fonte)})</small>`).join("; ")}</p>` : ""}
    ${r.div ? `<p class="adb-div"><b>No INSS:</b> ${esc(r.div.inss||"")} <b>Na via judicial:</b> ${esc(r.div.judicial||"")}</p>` : ""}`; };
// F235 · a data dos requisitos não é a do pagamento: o BPC e a aposentadoria pagam desde o pedido
function quandoTxt(op, a, x){
  const d = `<b>${fmtBarra(a.quando)}</b>`, ja = a.quando <= x.hoje;
  if(/^(def|idoso)$/.test(op)) return ja ? `Pode pedir desde ${d}; o BPC é pago a partir do pedido.` : `Pode pedir a partir de ${d}.`;
  if(/^(idade|transicao|professor|pcd|pcd_idade|b46|idade_rural|hibrida)$/.test(op))
    return ja ? `Requisitos cumpridos desde ${d}; o pagamento começa no dia do pedido.` : `Requisitos cumpridos em ${d}, pelas regras abaixo.`;
  return `Direito ${ja ? "desde" : "em"} ${d}, pelos requisitos abaixo.`;
}
function painelBeneficio(c, ks, op, oc){
  const o = opcoesSel(c).find(x=>x.o===op); if(!o) return `<div id="ad-benef"></div>`;
  const x = reqCtx(c, ks, op), a = avaliarReq(op, x), lev = itensLevados(c, ks), v = x.vDig || x.v, ex = REQ_EXTRA[op] || {};
  const dica = k => { const f = (ex.pre||{})[k]; try{ return (f ? f(x) : null) || ((x.preUsado||{})[k] ? {...x.preUsado[k], doDossie:true} : null); }catch(e){ return null; } };
  // os campos aparecem onde falta resposta, ou onde já se digitou algo; a DER fica só no alto do painel
  const campos = r => (r.campos||[]).filter(k=>k!=="der");
  const mostra = r => !["ok","info","opcao"].includes(r.est) || campos(r).some(k=>v[k]);
  // F235 · cada campo é pedido uma vez, no primeiro requisito que o mostra (a categoria e a data se repetiam até três vezes)
  const visto = new Set(), unicos = r => { const ks = mostra(r) ? campos(r).filter(k=>!visto.has(k)) : []; ks.forEach(k=>visto.add(k)); return ks; };
  const linha = r => { const ks = unicos(r); return `<li class="adb-req" data-id="${esc(r.id)}">
      <div class="adb-cab"><b class="adb-rot">${esc(r.rot)}</b>${REQ_CONF[r.conf] ? ` <span class="adb-conf">${REQ_CONF[r.conf]}</span>` : ""}<span class="adb-dyn">${adReqDin(r)}</span></div>
      <details class="adb-base"><summary>base legal</summary>${esc(r.base)}</details>
      ${ks.length ? `<div class="adm-campos adb-campos">${ks.map(k=>campoAd(c, k, v, dica(k))).join("")}</div>` : ""}</li>`; };
  // F235 · o catálogo pode recolher num bloco fechado o que não serve ao caso (REQ_EXTRA[op].recolher)
  const rec = a && ex.recolher ? a.rs.filter(r=>{ try{ return ex.recolher(r, x); }catch(e){ return false; } }) : [];
  const ver = vereditoReq(op, x, a);
  let agora = []; try{ agora = ex.agora ? ex.agora(x, a) || [] : []; }catch(e){}
  const porQ = new Map(); for(const it of lev){ if(!porQ.has(it.qrot)) porQ.set(it.qrot, []); porQ.get(it.qrot).push(it); }
  const der = /^(crps|COPIA|JA)$/.test(op) ? "" : `<div class="adm-campos adb-der">${campoAd(c, "der", v)}</div>`;
  const tempos = o.mods.includes("tempos") ? `<div class="adb-tempos"><h4>Tempos de contribuição</h4>${caixaTempos(c, x.temposAuto ? x.tempos : null)}<div class="adm-calc" data-mod="tempos">${admCalcHtml("tempos", c, {...admCtx(c, ks), tempos:x.tempos, tot:x.tot})}</div></div>` : "";
  const mais = `<details class="adb-mais" id="adb-mais"><summary>Do primeiro atendimento: ${lev.length} ${lev.length===1?"item levado":"itens levados"}, e os documentos em detalhe</summary>
      ${[...porQ].map(([q, its])=>`<div class="adb-lev"><b>${esc(q)}</b><ul>${its.map(it=>`<li>${esc(it.txt)}${it.anexo ? ` <button type="button" class="adr-link" onclick="abrirAnexo('${it.anexo}')">ver</button>` : ""}</li>`).join("")}</ul></div>`).join("")
        || `<p class="meio-sub">Nenhum item levado do Primeiro atendimento.</p>`}
      ${exploracaoDireito(c, ks)}</details>`;
  const nota = `<p class="meio-sub adm-nota">Os itens marcados "a conferir na lei" ainda não foram checados na norma, e os marcados "INSS e Justiça divergem" pedem a decisão do advogado antes de virar pedido ou peça.</p>`;
  // F239 · em passos: o que o dossiê já resolveu, depois o que falta responder (com a DER), e a conclusão
  if(oc && a){
    const rs = a.rs.filter(r=>!rec.includes(r)), ok = rs.filter(adResolvido), fal = rs.filter(r=>!adResolvido(r));
    const derEm = fal.length ? "falta" : "ok";
    return `<section class="adb" id="ad-benef" data-op="${op}" aria-labelledby="adb-t">
    <div class="adb-topo"><h3 id="adb-t">Requisitos · ${esc(o.rot)}</h3><span class="adb-cont">${esc(adContagem(a))}</span></div>
    ${ver ? `<p class="adb-veredito tom-${ver.tom}" role="status">${esc(ver.txt)}</p>` : ""}
    ${ok.length || rec.length ? `<div class="tp-passo adb-parte" data-passo="benef"${oc("benef")}>
      <h4 class="adb-parte-t ok">Já cumprido (${ok.length})</h4>
      <p class="adb-passo-sub">O que o dossiê já responde. Confira com a pessoa o que vier marcado "Do dossiê"; a base legal abre em cada um.</p>
      ${derEm==="ok" ? der : ""}
      ${ok.length ? `<ol class="adb-lista adb-resolvidos">${ok.map(linha).join("")}</ol>` : ""}
      ${rec.length ? `<details class="adb-recolhido"><summary>${esc(ex.recolherRot || "Outros pontos")} (${rec.length})</summary><ol class="adb-lista">${rec.map(linha).join("")}</ol></details>` : ""}
      ${mais}</div>` : ""}
    ${fal.length ? `<div class="tp-passo adb-parte" data-passo="benef"${oc("benef")}>
      <h4 class="adb-parte-t falta">Ainda falta (${fal.length})</h4>
      <p class="adb-passo-sub">O que ainda pede resposta, prova ou decisão. Cada resposta recalcula o benefício na hora.</p>
      ${der}<ol class="adb-lista">${fal.map(linha).join("")}</ol>${nota}</div>` : ""}
    <div class="tp-passo" data-passo="concl"${oc("concl")}>
      ${agora.length ? `<div class="adb-agora"><b>O que dá para fazer agora</b><ol>${agora.map(t=>`<li>${esc(t)}</li>`).join("")}</ol></div>` : ""}
      ${a.resumo ? `<p class="adb-resumo"><b>Em uma frase:</b> ${esc(a.resumo)}</p>` : ""}
      <p class="adb-quando">${a.quando ? quandoTxt(op, a, x) : ""}</p>
      ${linhaDireito(a, x)}
      ${valorEstimado(op, x)}${rmiPrevius(x && x.c)}
      ${tempos}</div>
  </section>`;
  }
  return `<section class="adb" id="ad-benef" data-op="${op}" aria-labelledby="adb-t">
    <div class="adb-topo"><h3 id="adb-t">Requisitos · ${esc(o.rot)}</h3><span class="adb-cont">${a ? esc(adContagem(a)) : ""}</span></div>
    ${ver ? `<p class="adb-veredito tom-${ver.tom}" role="status">${esc(ver.txt)}</p>` : ""}
    ${agora.length ? `<div class="adb-agora"><b>O que dá para fazer agora</b><ol>${agora.map(t=>`<li>${esc(t)}</li>`).join("")}</ol></div>` : ""}
    ${a && a.resumo ? `<p class="adb-resumo"><b>Em uma frase:</b> ${esc(a.resumo)}</p>` : ""}
    <p class="adb-quando">${a && a.quando ? quandoTxt(op, a, x) : ""}</p>
    ${linhaDireito(a, x)}
    ${valorEstimado(op, x)}${rmiPrevius(x && x.c)}
    ${der}
    ${a ? `<ol class="adb-lista">${a.rs.filter(r=>!rec.includes(r)).map(linha).join("")}</ol>${rec.length ? `<details class="adb-recolhido"><summary>${esc(ex.recolherRot || "Outros pontos")} (${rec.length})</summary><ol class="adb-lista">${rec.map(linha).join("")}</ol></details>` : ""}` : `<p class="meio-sub">Este benefício ainda não tem requisitos no catálogo.</p>`}
    ${tempos}
    ${mais}
    ${nota}
  </section>`;
}
// F382 (12.40) · o caminho até o direito (ideia do Lovable aprovada pelo Paulo): de hoje à data do direito, um marco por
// requisito ainda por cumprir, na data em que o motor diz que se cumpre; o direito já alcançado não desenha nada
function linhaDireito(a, x){
  if(!a || !a.quando || !x || a.quando<=x.hoje) return "";
  const tot = Math.max(1, diasEntreIso(x.hoje, a.quando)), pct = d => Math.round(100*diasEntreIso(x.hoje, d)/tot);
  const ms = a.rs.filter(r=>r.quando && r.quando>x.hoje && r.quando<=a.quando && r.est!=="info").sort((p, q)=>p.quando<q.quando ? -1 : 1);
  const rot = r => cortaFrase(String(r.rot).replace(/\s*[?(:].*$/, "").replace(/^(Já )?(tem|completou|cumpriu) /i, ""), 40);
  const linha = `<div class="adl"><div class="adl-trilho" aria-hidden="true"><i class="adl-hoje" style="left:0"></i>${
    ms.map(r=>`<i style="left:${pct(r.quando)}%"></i>`).join("")}<i class="adl-dir" style="left:100%"></i></div>
    <ol class="adl-lista"><li>hoje, ${fmtBarra(x.hoje)}</li>${ms.map(r=>`<li>${esc(rot(r))}: ${fmtBarra(r.quando)}</li>`).join("")}<li><b>direito em ${fmtBarra(a.quando)}</b></li></ol></div>`;
  return progressoDireito(a, x, ms, rot) + linha;
}
// F386 · o progresso até o direito (protótipo do Lovable, escolha do Paulo de 03.11.2026): um quadro por requisito ainda por
// cumprir (a carência e a idade com o número de hoje e o exigido), o da data do direito, o gráfico das curvas em % do exigido
// e, quando falta carência, as competências a pagar com Futura e Contribuições.
// shortcut: o exigido sai da data em que o motor diz que o requisito se cumpre, supondo um mês pago por mês; a carência paga
// com atraso ou com lacuna muda a conta, e o requisito do motor continua sendo o que vale
const mesesEntreIso = (a, b) => (+b.slice(0,4) - +a.slice(0,4))*12 + (+b.slice(5,7) - +a.slice(5,7));
function seriesDireito(ms, x){
  return ms.map(r=>{
    if(/carencia/i.test(r.id||"") && x.ct){ const ate = mesesEntreIso(x.hoje, r.quando), hj = carenciaAte(x, x.hoje) || 0;
      return {r, tipo:"car", rot:"Carência", hj, ex: hj + ate, un:"meses", fim:r.quando}; }
    if(/idade/i.test(r.id||"") && x.dn){ const hj = idadeEm(x.dn, x.hoje), ex = idadeEm(x.dn, r.quando);
      if(hj!=null && ex!=null) return {r, tipo:"ida", rot:"Idade", hj, ex, un:"anos", fim:r.quando}; }
    return {r, tipo:"", fim:r.quando};
  });
}
function progressoDireito(a, x, ms, rot){
  if(!ms.length) return "";
  const ss = seriesDireito(ms, x), num = ss.filter(s=>s.tipo), car = ss.find(s=>s.tipo==="car");
  const quadros = ss.map(s=>`<div class="adp-q" title="${esc(s.r.base||"")}"><small>${esc(s.tipo ? s.rot : rot(s.r))}</small>${
    s.tipo ? `<b>${s.hj} <span>de ${s.ex} ${s.un}</span></b>` : ""}<span class="adp-em">completa em ${s.tipo==="car" ? fmtBarra(s.fim).slice(3) : fmtBarra(s.fim)}</span></div>`).join("")
    + `<div class="adp-q adp-dir"><small>Data do direito</small><b>${fmtBarra(a.quando)}</b></div>`;
  let graf = "";
  if(num.length){
    const W = 640, H = 170, P = 34, tot = Math.max(1, diasEntreIso(x.hoje, a.quando)),
      gx = d => P + (W - 2*P) * Math.min(1, diasEntreIso(x.hoje, d)/tot), v0 = s => s.ex ? s.hj/s.ex : 1,
      // a escala começa um pouco abaixo da curva mais baixa, para a subida aparecer (166 de 178 é 93 % do exigido)
      lo = Math.max(0, Math.min(...num.map(v0)) - 0.05), gy = v => H - P - (H - 2*P) * Math.min(1, (v - lo)/(1 - lo || 1));
    const curva = s => { return `M${gx(x.hoje)},${gy(v0(s))} L${gx(s.fim)},${gy(1)} L${gx(a.quando)},${gy(1)}`; };
    graf = `<svg class="adp-g" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`Progresso até o direito: ${num.map(s=>`${s.rot.toLowerCase()} de ${s.hj} para ${s.ex} ${s.un} até ${fmtBarra(s.fim)}`).join("; ")}; direito em ${fmtBarra(a.quando)}`)}">
      <line class="adp-ex" x1="${P}" x2="${W-P}" y1="${gy(1)}" y2="${gy(1)}"/><text class="adp-tx" x="${P}" y="${gy(1)-6}">exigido</text>
      <line class="adp-dl" x1="${gx(a.quando)}" x2="${gx(a.quando)}" y1="${P-12}" y2="${H-P}"/><text class="adp-tx adp-dt" x="${gx(a.quando)-4}" y="${P-16}" text-anchor="end">direito em ${fmtBarra(a.quando)}</text>
      ${num.map(s=>`<path class="adp-${s.tipo}" d="${curva(s)}" fill="none"/>`).join("")}
      <text class="adp-tx" x="${P}" y="${H-12}">hoje</text><text class="adp-tx" x="${W-P}" y="${H-12}" text-anchor="end">${fmtBarra(a.quando).slice(3)}</text></svg>
      <div class="adp-leg">${num.map(s=>`<span class="adp-${s.tipo}"><i></i>${s.rot} (${s.un})</span>`).join("")}</div>`;
  }
  let pagar = "";
  if(car && car.ex > car.hj){
    const de = somarMeses(x.hoje.slice(0,7)+"-01", 1), ate = car.fim.slice(0,7)+"-01", c = x.c, pc = c && typeof preCasoAberto==="function" ? preCasoAberto(c) : null;
    const pre = c ? JSON.stringify({q:{finalidade:"aposentadoria", modalidade:"mensal", inicio:de, fim:car.fim.slice(0,7)+"-28",
      motivo:`carência de ${car.ex} meses para a aposentadoria em ${fmtBarra(a.quando)}`}}).replace(/"/g, "&quot;") : "";
    pagar = `<div class="adp-pag"><span>Pagar de <b>${fmtBarra(de).slice(3)}</b> a <b>${fmtBarra(ate).slice(3)}</b> e protocolar em <b>${fmtBarra(a.quando)}</b></span>
      ${pc ? `<button type="button" class="btn-mini" onclick="irDesfecho()" title="Criar a aposentadoria futura no Desfecho, com o aviso antes da data do direito">Futura<span class="sr-only"> (criar a aposentadoria futura)</span></button>` : ""}
      ${c ? `<button type="button" class="btn-mini" onclick="formQualidade('${c.id}','','analise',${pre})" title="Criar o plano de contribuições a pagar">Contribuições<span class="sr-only"> (criar o plano)</span></button>` : ""}</div>`;
  }
  return `<section class="adp" aria-label="Progresso até o direito"><h4 class="adp-t">Progresso até o direito</h4><div class="adp-qs">${quadros}</div>${graf}${pagar}</section>`;
}
// F384 · O VALOR ESTIMADO DO BENEFÍCIO. A média dos salários de contribuição desde 07/1994 (EC 103, art. 26), cada um
// corrigido pelo INPC do mês da competência ao mês anterior à DER (Lei 8.213/91, art. 29-B), com o percentual da regra.
// O INPC é a série oficial do IBGE (SGS 188 do Banco Central), gravada em config_app.indice_inpc e renovada todo dia 15.
// shortcut: o salário corrigido é limitado ao teto de 2026, e não ao teto da época; a carta de concessão é que vale
const TETO_2026 = 8475.55;   // Portaria Interministerial MPS/MF nº 13/2026 [CONFERIDO, gov.br]
let _inpcMemo = null;
function inpcSerie(){
  const t = cfgApp("indice_inpc"); if(!t) return null;
  if(_inpcMemo && _inpcMemo.t===t) return _inpcMemo.v;
  let v = null; try{ v = JSON.parse(t); }catch(e){}
  _inpcMemo = {t, v}; return v;
}
// comps: [{c:"MM/AAAA", v}] (somadas por mês); devolve {media, n, ult12} ou null. Pura, para o teste
function mediaCorrigida(comps, der, serie, teto){
  const fim = ymDe(der), ms = Object.keys(serie||{}).sort(), soma = new Map();
  for(const cp of comps||[]){ const k = chaveComp(cp.c); if(k < "1994-07" || k >= fim || !(cp.v > 0)) continue;
    // EC 103, art. 29: depois de 13/11/2019, o mês abaixo do mínimo sem complementação não entra
    soma.set(k, (soma.get(k)||0) + cp.v); }
  const ks = [...soma.keys()].filter(k=>!(k >= "2019-11" && soma.get(k) < (salarioMinimo(k.split("-").reverse().join("/"))||0))).sort();
  if(!ks.length) return null;
  // o fator acumulado de trás para frente: do mês anterior à DER até a competência
  const fator = new Map(); let f = 1;
  for(let m = somarMeses(fim + "-01", -1).slice(0, 7); m >= ks[0]; m = somarMeses(m + "-01", -1).slice(0, 7)){ f *= 1 + (+(serie||{})[m] || 0)/100; fator.set(m, f); }
  const corr = ks.map(k=>Math.min(teto, soma.get(k) * (fator.get(k) || 1)));
  const media = corr.reduce((a, b)=>a + b, 0) / corr.length;
  const u = corr.slice(-12), ult12 = u.reduce((a, b)=>a + b, 0) / u.length;
  return {media, n: corr.length, ult12, ate: ms[ms.length-1] || null};
}
// o percentual pela opção (null: o valor não sai da média do segurado)
function coefDaOpcao(op, x){
  const anos = Math.floor(((x.tot||{}).comum||0)/365 + 1e-9);   // como _apoPct
  const regra = lim => ({p: Math.min(100, 60 + 2*Math.max(0, anos - lim)), txt: `60 % mais 2 % por ano de contribuição acima de ${lim} (EC 103, art. 26, § 2º); ${anos} anos no quadro Tempos`});
  if(["idade","transicao","professor","b32","hibrida"].includes(op)) return regra(x.sx==="F" ? 15 : 20);
  if(op==="b46") return regra(x.sx==="F" ? 15 : (+x.v.esp_anos===15 ? 15 : 20));
  if(op==="acid") return {p:100, txt:"100 % da média na aposentadoria acidentária (EC 103, art. 26, § 3º, II)"};
  if(op==="pcd") return {p:100, txt:"100 % da média (LC 142/2013, art. 8º, I)"};
  if(op==="pcd_idade"){ const car = ((x.ct||{}).carencia)||0; const p = Math.min(100, 70 + Math.floor(car/12));
    return {p, txt:`70 % mais 1 % por grupo de 12 contribuições (LC 142/2013, art. 8º, II); ${car} contribuições`}; }
  if(op==="b31" || op==="REST") return {p:91, txt:"91 % da média, limitado à média dos 12 últimos salários (Lei 8.213/91, arts. 61 e 29, § 10)", lim12:true};
  if(op==="b94" || op==="b36") return {p:50, txt:"50 % da média (Lei 8.213/91, art. 86, § 1º)"};
  return null;
}
const SM_FIXO = {idade_rural:"aposentadoria rural do segurado especial (Lei 8.213/91, art. 39, I)", rur:"salário-maternidade da segurada especial (Lei 8.213/91, art. 39, parágrafo único)",
  def:"BPC (CF, art. 203, V)", idoso:"BPC (CF, art. 203, V)", reclusao:"auxílio-reclusão (EC 103, art. 27, § 1º)"};
const brl = v => "R$ " + v.toLocaleString("pt-BR", {minimumFractionDigits:2, maximumFractionDigits:2});
function valorEstimado(op, x){
  if(!x || !op) return "";
  if(SM_FIXO[op]) return `<p class="adb-valor"><b>Valor:</b> ${brl(salarioMinimo("01/" + anoDe(x.der)) || SM_2026)}, um salário mínimo no ${esc(SM_FIXO[op])}.</p>`;
  const co = coefDaOpcao(op, x); if(!co || !x.c) return "";
  const st = _cnisComps.get(x.c.id);
  if(!st){ carregarCnisComps(x.c); return `<p class="adb-valor meio-sub">Lendo as remunerações do CNIS para estimar o valor…</p>`; }
  if(st.carregando) return `<p class="adb-valor meio-sub">Lendo as remunerações do CNIS para estimar o valor…</p>`;
  const ser = inpcSerie();
  if(!ser || !ser.serie) return `<p class="adb-valor meio-sub">Valor: sem a tabela do INPC no CRM; a estimativa volta quando ela for gravada.</p>`;
  const comps = (st.vs||[]).filter(v=>v.tipo!=="Benefício").flatMap(v=>v.comps||[]);
  const m = mediaCorrigida(comps, x.der, ser.serie, TETO_2026);
  if(!m) return `<p class="adb-valor meio-sub">Valor: o CNIS lido não tem remuneração desde 07/1994 para a média.</p>`;
  let rmi = m.media * co.p/100;
  if(co.lim12) rmi = Math.min(rmi, m.ult12);
  const sm = salarioMinimo("01/" + anoDe(x.der)) || SM_2026;
  rmi = Math.max(sm, Math.min(TETO_2026, rmi));
  return `<p class="adb-valor"><b>Valor estimado: ${brl(rmi)}</b> por mês, na DER de ${fmtBarra(x.der)}. ${esc(co.txt)}, sobre a média de ${brl(m.media)} (${m.n} salários desde 07/1994, corrigidos pelo INPC${m.ate ? ` até ${_mmaaIso(m.ate)}` : ""}).</p>
    <p class="meio-sub adb-valor-nota">Estimativa: piso de um salário mínimo e teto de ${brl(TETO_2026)} (Portaria Interministerial MPS/MF nº 13/2026); cada salário corrigido limitado ao teto atual. O valor do INSS sai da carta de concessão.</p>`;
}
const _mmaaIso = ym => String(ym||"").split("-").reverse().join("/");
// F239 · os passos da Análise de Direito no atendimento: o benefício, o já resolvido, o que falta responder e a conclusão
// o quadrado é o passo "Benefício" e continua logo acima do painel do benefício aberto
const quadradoEmPasso = (h, oc) => h.replace('<section class="adq"', `<section class="adq tp-passo" data-passo="benef"${oc("benef")}`);
const adResolvido = r => r.est==="ok" || r.est==="info";
// F283b · Pendências primeiro, depois a Análise do Benefício (os botões dos benefícios e, do aberto, o que já se cumpriu e o
// que falta) e a Conclusão (pedido do Paulo, 26.10.2026)
function adPassosDe(c, ks, ab){
  const np = problemasDoPA(c, ks);
  const ps = [{id:"pend", rot:"Pendências", conta:String(np.length || ""), alerta:np.some(x=>x.est==="crit")}];
  let a = null; if(ab){ try{ a = avaliarReq(ab, reqCtx(c, ks, ab)); }catch(e){} }
  const fal = a ? a.rs.filter(r=>!adResolvido(r)) : [];
  ps.push({id:"benef", rot:"Análise do Benefício", conta:String(opcoesSel(c).length || ""), alerta:fal.some(r=>["risco","impedido","falta"].includes(r.est))});
  ps.push({id:"concl", rot:"Conclusão", conta:"", alerta:false});
  return ps;
}
// F239 · o Desfecho do pré-caso fica só no fim de Documentos; aqui, a linha que leva até ele (decisão do Paulo, 17.10.2026)
function linhaDesfecho(c){
  if(!preCasoAberto(c)) return "";
  return `<section class="adx-sec adr-desf-ir" id="desfecho-ir"><p><b>Criar caso.</b> Criar o caso, arquivar ou enviar a Aposentadorias futuras fica no fim de Documentos, depois dos papéis.</p>
    <button type="button" class="tl-bt" onclick="irDesfecho()" title="Ir ao Desfecho, em Documentos →"><span aria-hidden="true">Desfecho →</span><span class="sr-only">Ir ao Desfecho, em Documentos →</span></button></section>`;
}
function irDesfecho(){
  const c = D.cliPorId.get(clienteAberto);
  if(c){ const ch = passoChave("doc", c); _passoAt.set(ch, "desfecho"); (_passoVisto.get(ch) || _passoVisto.set(ch, new Set()).get(ch)).add("desfecho"); }   // F240 · Documentos abre no passo do Desfecho
  irSubCad("documentos");
  setTimeout(()=>{ const e = document.getElementById("dq-desfecho") || document.getElementById("desfecho"); if(e) e.scrollIntoView({block:"start"}); }, 60);
}
// abre o benefício: repinta o quadrado e o painel, e o formulário passa a ser dele
function adAbrirBenef(cliId, op){
  const c = D.cliPorId.get(cliId); if(!c) return;
  _adBenef.set(adChave(c), op);
  adRepintarBenef(cliId);
  adServicoDoBenef(c, op);
  // F239 · em passos, escolher o benefício leva ao passo seguinte
  if(document.querySelector('[data-tp="ad"]')) return passoIr("ad", cliId, "benef");   // F283b · o benefício abre no mesmo passo
  const el = document.getElementById("ad-benef"); if(el && el.scrollIntoView) el.scrollIntoView({behavior:"smooth", block:"nearest"});
}
function adMaisBenef(bt){ const m = bt.closest(".adq").querySelector(".adq-mais"); m.hidden = !m.hidden; bt.setAttribute("aria-expanded", String(!m.hidden)); }
function adRepintarBenef(cliId){
  const c = D.cliPorId.get(cliId), q = document.getElementById("ad-quadrado"), b = document.getElementById("ad-benef"); if(!c || !q) return repintarFicha();
  const ks = D.casosDoCliente.get(cliId)||[], aberto = !q.querySelector(".adq-mais").hidden, ab = adBenefAberto(c);
  const root = document.querySelector('[data-tp="ad"]');
  q.outerHTML = root ? quadradoEmPasso(quadradoBeneficios(c, ks), ()=>"") : quadradoBeneficios(c, ks);
  if(aberto){ const q2 = document.getElementById("ad-quadrado"); q2.querySelector(".adq-mais").hidden = false; q2.querySelector(".adq-cab .btn-mini").setAttribute("aria-expanded", "true"); }
  // F239 · em passos, a trilha muda com o benefício: refaz a trilha e o pé, e o painel nasce no passo certo
  if(root){ const t = passosDaTela("ad", c, adPassosDe(c, ks, ab)), oc = id => !t.tudo && id!==t.at ? " hidden" : "";
    root.querySelector(".tp-rola").outerHTML = t.trilha; root.querySelector(".tp-pe").innerHTML = t.nav; root.dataset.at = t.at;
    if(b) b.outerHTML = ab ? painelBeneficio(c, ks, ab, oc) : `<div id="ad-benef"></div>`;
    return passoPinta(root); }
  if(b) b.outerHTML = ab ? painelBeneficio(c, ks, ab) : `<div id="ad-benef"></div>`;
}
// recalcula no lugar: o estado de cada requisito e a contagem, sem tocar nos campos
function adRecalcBenef(cliId){
  const c = D.cliPorId.get(cliId), b = document.getElementById("ad-benef"); if(!c || !b || !b.dataset.op) return;
  const ks = D.casosDoCliente.get(cliId)||[], op = b.dataset.op, x = reqCtx(c, ks, op), a = avaliarReq(op, x); if(!a) return;
  for(const r of a.rs){ const li = b.querySelector(`.adb-req[data-id="${CSS.escape(r.id)}"] .adb-dyn`); if(li) li.innerHTML = adReqDin(r); }
  const ct = b.querySelector(".adb-cont"); if(ct) ct.textContent = adContagem(a);
  const qd = b.querySelector(".adb-quando"); if(qd) qd.innerHTML = a.quando ? quandoTxt(op, a, x) : "";
  const bt = document.querySelector(`#ad-quadrado .adq-bt[data-op="${op}"] .adq-sub`);
  if(bt) bt.innerHTML = `<i class="pa-bola ${(REQ_EST[a.pior]||[])[1]||"info"}" aria-hidden="true"></i>${esc(adContagem(a))}`;
  // F235 · o veredito e as saídas mudam com a resposta digitada
  const ve = vereditoReq(op, x, a), pv = b.querySelector(".adb-veredito");
  if(pv && ve){ pv.className = `adb-veredito tom-${ve.tom}`; pv.textContent = ve.txt; }
  const qv = document.querySelector(`#ad-quadrado .adq-bt[data-op="${op}"] .adq-ver`);
  if(qv && ve){ qv.className = `adq-ver tom-${ve.tom}`; qv.textContent = ve.txt.length > 96 ? ve.txt.slice(0, 93).replace(/\s+\S*$/, "") + "…" : ve.txt; }
  const ag = b.querySelector(".adb-agora ol"); let agora = [];
  try{ agora = (REQ_EXTRA[op]||{}).agora ? REQ_EXTRA[op].agora(x, a) || [] : []; }catch(e){}
  if(ag) ag.innerHTML = agora.map(t=>`<li>${esc(t)}</li>`).join("");
}
// F235 · o roteiro do balcão: as perguntas que os benefícios marcados ainda esperam, com o campo ali mesmo.
// A resposta grava no ad do pré-caso (o mesmo campo da Análise de Direito) e o roteiro some quando respondido
function roteiroPerguntas(c, ks){
  const ops = opcoesSel(c); if(!ops.length) return "";
  const v = admDe(c).valores || {}, vistos = new Set(), itens = [];
  for(const o of ops){ let x = null, a = null; try{ x = reqCtx(c, ks, o.o); a = avaliarReq(o.o, x); }catch(e){ continue; }
    const pre = (REQ_EXTRA[o.o]||{}).pre || {};
    for(const r of (a||{rs:[]}).rs.filter(r=>r.est==="informar")){
      const cs = (r.campos||[]).filter(k=>k!=="der" && !vistos.has(k) && !v[k]); if(!cs.length) continue;
      cs.forEach(k=>vistos.add(k));
      itens.push({rot:r.rot, ben:o.rot, campos:cs.map(k=>{ let d = null; try{ d = (pre[k] ? pre[k](x) : null) || (x.preUsado||{})[k] || null; }catch(e){} return {k, d}; })});
    } }
  if(!itens.length) return "";
  return `<div class="pa-roteiro" id="pa-roteiro"><h4>Perguntar agora, com a pessoa na frente</h4>
    <p class="meio-sub">Cada resposta vai direto à Análise de Direito do benefício.</p>
    <ol>${itens.slice(0, 8).map(it=>`<li><b>${esc(it.rot)}</b> <small class="meio-sub">· ${esc(it.ben)}</small><div class="adm-campos">${it.campos.map(f=>campoAd(c, f.k, v, f.d)).join("")}</div></li>`).join("")}</ol></div>`;
}
// o formulário de registrar a análise passa a ser do benefício aberto
function adServicoDoBenef(c, op){
  const o = opcoesSel(c).find(x=>x.o===op), sel = document.getElementById("ad-esp"); if(!o || !sel) return;
  if(o.cod){ sel.value = o.cod; adTrocarEspecie();
    const sb = document.getElementById("ad-sub"); if(sb && o.sub){ sb.value = o.sub; adMostrarCampos(); } }
  adPreencherDoDossie(c, o);
}
// o que o dossiê já responde entra nos campos vazios do formulário, marcado para conferir
// (a contagem do CNIS com a nota da licença da RAIS, a DID do laudo), e o contexto leva,
// uma linha por quadro, o que veio do Primeiro atendimento
function adPreencherDoDossie(c, o){
  const ks = D.casosDoCliente.get(c.id)||[], ct = ((cnisDe(c)||{}).analise||{}).contagem, fd = fontesDoDossie(c.id);
  const vazio = (id, v) => { const e = document.getElementById(id); if(e && !e.value && v){ e.value = v; e.dataset.pre = v; } };
  const lic = licencasDaRais(fd.rais), diasLic = lic.reduce((t, l)=>t + (l.dias||0), 0);
  const notaLic = lic.length ? `; a RAIS mostra ${diasLic ? `${diasLic} dias de ` : ""}licença sem remuneração, que o INSS tem descontado` : "";
  if(ct){ vazio("ad-f-carencia", `${ct.carencia} contribuições (CNIS, contagem do CRM)${notaLic}`); vazio("ad-f-tempo", `${anosMeses(ct.anos, ct.meses)} (CNIS, por competência)${notaLic}`); }
  const ul = (fd.laudos||[]).slice().sort((a,b)=>isoBr(b.exame).localeCompare(isoBr(a.exame)))[0];
  if(ul && ul.did) vazio("ad-f-did", isoBr(ul.did));
  const el = document.getElementById("ad-contexto"), porQ = new Map();
  for(const it of itensLevados(c, ks)){ if(!porQ.has(it.qrot)) porQ.set(it.qrot, []); porQ.get(it.qrot).push(it.txt); }
  const linhas = [...porQ].map(([q, ts])=>`${q}: ${ts.slice(0, 6).join("; ")}${ts.length > 6 ? `; e mais ${ts.length - 6}` : ""}.`);
  if(el && (!el.value || /^Primeiro atendimento, /.test(el.value))) el.value = [`Primeiro atendimento, ${o.rot}.`, ...linhas].join("\n");
  const f = document.getElementById("ad-novo"); if(f) f.dataset.mexido = 1;   // o que se preencheu sobrevive à repintura
  adEstados();
}
// ── a visão global da barra lateral: Análises | Dashboard ─────────────────
let subDireito = ler("crm_subdireito") || "analises";
function irSubDireito(s){ subDireito=s; guardar("crm_subdireito", s); render(); }
function abrirDireitoDe(cliId){   // F171 · a análise mora no Cadastro
  return Promise.resolve(abrirFicha(cliId)).then(()=>{ abaAtiva=0; subCad="direito"; repintarFicha(); });
}
function renderDireito(){
  tituloLista("⚖️ Análise de Direito");
  const sub=document.getElementById("sub-lista"), meio=document.getElementById("conteudo-meio");
  if(D.analises===null){
    sub.textContent="";
    meio.innerHTML=`<p class="meio-sub">A tabela desta página ainda não existe no banco — rode o
      <b>crm/fase2/schema_analise_direito.sql</b> no SQL Editor do Supabase e recarregue o CRM.</p>`;
    return;
  }
  const menu=`<div class="sub-menu" style="width:100%;margin-bottom:10px">
    <button class="${subDireito==="analises"?"on":""}" onclick="irSubDireito('analises')">Análises</button>
    <button class="${subDireito==="dash"?"on":""}" onclick="irSubDireito('dash')">Dashboard</button>
  </div>`;
  if(subDireito==="dash"){
    sub.textContent="A régua do escritório: quem já pode, quem está chegando, o que precisa de revisão.";
    meio.innerHTML = menu + dashDireito();
    return;
  }
  sub.textContent="A memória dos atendimentos: o que já foi visto com cada cliente, para a próxima conversa.";
  const grupos=[...(D.analisesPorCliente||new Map()).entries()]
    .map(([cliId,as])=>({c:D.cliPorId.get(cliId), as})).filter(g=>g.c)
    .sort((x,y)=>x.as[0].data_analise<y.as[0].data_analise?1:-1);
  meio.innerHTML = menu + (grupos.length ? grupos.map(g=>{
    const ult=g.as[0], m=cenMelhor(ult);
    const alcancou=(ult.cenarios||[]).some(x=>x.data&&x.data<=hoje()) && g.c.aposentado!==true;
    return `<div class="cartao" data-cli="${g.c.id}" onclick="abrirDireitoDe('${g.c.id}')">
      <div class="info"><div class="nome">${esc(g.c.nome)}</div>
        <div class="meta">
          <span class="chip per">⚖️ ${g.as.length} análise${g.as.length>1?"s":""}</span>
          <span>última em <b>${fmt(ult.data_analise)}</b></span>
          ${m?`<span class="chip ${alcancou?"verde":"ben"}">${alcancou?((dD, kP)=>kP ? `✓ direito alcançado · pedido em ${fmt(kP.der)}`
            : `✓ direito alcançado em ${fmt(dD)}${-diasAte(dD) > 0 ? ` · ${-diasAte(dD)} dias sem pedido` : ""}`)(dataDoDireitoDe(ult), pedidoApos(g.c.id, dataDoDireitoDe(ult))):"melhor: "+esc(m.regra||"—")+(m.data?" em "+fmt(m.data):"")}</span>`:""}
          ${cnisDe(g.c)&&cnisDe(g.c).caminho?`<button class="btn-mini" onclick="event.stopPropagation();abrirCnis('${g.c.id}')" title="Abrir CNIS ↗"><span aria-hidden="true">CNIS ↗</span><span class="sr-only">Abrir CNIS ↗</span></button>`:""}
        </div></div></div>`;
  }).join("") : `<p class="meio-sub">Nenhuma análise registrada ainda. Abra a ficha de um cliente na aba
    <b>Análise de Direito</b> e registre a primeira. A análise antiga entra com a data original
    (a de 2020 entra como 2020).</p>`);
}
function dashDireito(){
  const h=hoje(), lim=somaMeses(h,12), corte=somaMeses(h,-24);
  const grupos=[...(D.analisesPorCliente||new Map()).entries()]
    .map(([cliId,as])=>({c:D.cliPorId.get(cliId), ult:as[0]})).filter(g=>g.c);
  const alc=direitoAlcancado();
  const prox=[], regras=new Map(); let velhas=0;
  for(const g of grupos){
    if(g.ult.data_analise<corte && g.c.aposentado!==true) velhas++;
    const m=cenMelhor(g.ult);
    if(m&&m.regra) regras.set(m.regra,(regras.get(m.regra)||0)+1);
    for(const cn of (g.ult.cenarios||[]))
      if(cn.data && cn.data>h && cn.data<=lim && g.c.aposentado!==true) prox.push({c:g.c, cn});
  }
  prox.sort((x,y)=>x.cn.data<y.cn.data?-1:1);
  const tile=(n,rot,cor)=>`<div class="ad-tile" style="border-top:3px solid ${cor}"><b>${n}</b><span>${rot}</span></div>`;
  const barras=[...regras.entries()].sort((x,y)=>y[1]-x[1]);
  const max=barras.length?barras[0][1]:1;
  return `
    <div class="ad-tiles">
      ${tile((D.analises||[]).length,"análises registradas","var(--azul)")}
      ${tile(grupos.length,"clientes analisados","var(--roxo)")}
      ${tile(alc.length,"já podem aposentar","var(--verde)")}
      ${tile(prox.length,"aposentam em até 12 meses","#E9B44C")}
      ${tile(velhas,"análises com 2+ anos — rever","var(--vermelho)")}
    </div>
    ${alc.length?`<h3 class="secao">✓ Direito alcançado — comunicar (${alc.length})</h3>`+alc.map(x=>{
      const cn=(x.analise.cenarios||[]).filter(c2=>c2.data&&c2.data<=h).sort((a2,b2)=>a2.data<b2.data?-1:1)[0];
      return `<div class="cartao" data-cli="${x.cliente.id}" onclick="abrirDireitoDe('${x.cliente.id}')">
        <div class="info"><div class="nome">${esc(x.cliente.nome)}</div>
          <div class="meta"><span class="chip verde">✓ ${esc(cn.regra||"—")} desde ${fmt(cn.data)}</span>${-diasAte(cn.data) > 0 ? `<span class="chip vermelho" title="dias desde o direito, sem pedido: a aposentadoria paga desde o pedido">${-diasAte(cn.data)} dias sem pedido</span>` : ""}
            ${cn.valor?`<span class="chip ben">${moedaBR(cn.valor)}</span>`:""}
            ${x.cliente.telefone?`<a class="chip per" href="https://wa.me/55${x.cliente.telefone.replace(/\D/g,"")}"
              target="_blank" rel="noopener" onclick="event.stopPropagation()">💬 chamar</a>`:""}</div></div></div>`;
    }).join(""):""}
    ${prox.length?`<h3 class="secao">🗓 Próximas aposentadorias (12 meses)</h3>`+prox.slice(0,20).map(x=>`
      <div class="cartao" data-cli="${x.c.id}" onclick="abrirDireitoDe('${x.c.id}')">
        <div class="info"><div class="nome">${esc(x.c.nome)}</div>
          <div class="meta"><span class="chip fase">${esc(x.cn.regra||"—")}</span>
            <span>direito em <b>${fmt(x.cn.data)}</b> (${(mm=>mm<=1?"1 mês":mm+" meses")(mesesAte(x.cn.data))})</span>
            ${x.cn.valor?`<span class="chip ben">${moedaBR(x.cn.valor)}</span>`:""}</div></div>
        <button class="btn-mini" style="flex:none" onclick="event.stopPropagation();avisarCenario('${x.c.id}','${x.cn.data}','${escJs(x.cn.regra||"")}')"
          title="cria o aviso 🎂 que entra no Meu Dia ${MESES_AVISO} meses antes da data"><span aria-hidden="true">🎂 Avisar</span><span class="sr-only">🎂 avisar na época</span></button>
      </div>`).join(""):""}
    ${barras.length?`<h3 class="secao">Por regra (melhor caminho das análises mais recentes)</h3>
      <div class="caso">${barras.map(([r,n])=>`
        <div class="ad-barra"><span class="ad-barra-rot">${esc(r)}</span>
          <span class="ad-barra-tr"><span class="ad-barra-in" style="width:${Math.round(n/max*100)}%"></span></span>
          <b>${n}</b></div>`).join("")}</div>`:""}
    ${!(D.analises||[]).length?`<p class="meio-sub">O dashboard acende quando as primeiras análises
      forem registradas.</p>`:""}`;
}

// ── O que cada portal TEM e NÃO TEM (clientes.dossie, schema_dossie.sql) ──
// A extensão "Dossiê do cliente" grava, por portal, o que baixou, o que o
// portal disse que não existe ("sem CTC", "não possui deficiência", benefício
// sem laudo) e o que falhou. Os PDFs estão em anexos; aqui é a NEGATIVA, que
// antes só vivia na faixa da página e sumia.
// Onda 0 · os PDFs do dossiê são do CLIENTE (anexos sem caso, origem dossie);
// o nome é "<fonte> · <arquivo>", como a extensão grava
const docsDoDossie = cliId => (D.anexos||[]).filter(a=>a.cliente_id===cliId && a.origem==="dossie");
const fonteDoDossie = a => { const [f, ...r] = String(a.nome||"").split(" · "); return r.length ? [f, r.join(" · ")] : ["Dossiê", f]; };
function caixaDossie(cli){
  const d = (cli.dossie && typeof cli.dossie==="object") ? cli.dossie : {};
  const NOME = {meuinss:"Meu INSS", mte:"Emprega Brasil (CTPS/RAIS/CAGED)", recursos:"e-Recursos", hc:"HC Ribeirão", redesim:"Redesim (CNPJs)", cadunico:"CadÚnico", transparencia:"Portal da Transparência"};
  const portais = Object.keys(NOME).filter(k=>d[k]);
  const docs = docsDoDossie(cli.id), dep = depDoDossie(cli);   // F235 · o "não existe" explicado, como no Primeiro atendimento
  if(!portais.length && !docs.length) return "";
  const lista = (itens, cls) => itens.length
    ? `<ul class="dossie-lista ${cls}">${itens.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>` : "";
  const comTexto = docs.filter(a=>a.texto).length, imagem = docs.filter(a=>a.paginas!=null && !a.texto).length;
  const fila = docs.length - comTexto - imagem;
  // F235 · o "não possui deficiência" cru soava como "o INSS negou a deficiência": sai com a tradução
  const naoTxt = x => /defici/i.test(x) ? CERT_PCD_NAO : x;
  return `<div class="apos-cx dossie-cx">
    <div class="apos-cab"><strong>📂 Dossiê — o que os portais têm</strong></div>
    ${portais.map(k=>{ const p=d[k]; const em=p.em?fmtTS(p.em):""; const n=(p.baixados||[]).length;
      // F590 · o resumo antecipado da extensão (parcial) não é a rodada inteira
      // F639 · consultado sem documento nem falha = "Não tem cadastro"
      const semCad = !p.parcial && !n && !(p.falhas||[]).length && (p.inexistentes||[]).length;
      return `<div class="dossie-portal"><b>${NOME[k]}</b>${semCad ? ` <span class="dossie-semcad">Não tem cadastro</span>` : ""} <span class="meio-sub">${p.parcial ? "rodada em andamento ou interrompida: se não estiver rodando, rode de novo · " : em?`rodado em ${em} · `:""}${n} documento${n===1?"":"s"}</span>
        ${lista((p.inexistentes||[]).map(x=>"✗ "+(/defici/i.test(x) ? naoTxt(x) : explicaFalta(x, dep, cli))), "nao")}
        ${lista((p.falhas||[]).map(x=>"⚠ "+x), "falha")}</div>`; }).join("")}
    ${portais.length ? `<p class="meio-sub">Não pesquisado: ${Object.keys(NOME).filter(k=>!d[k]).map(k=>NOME[k]).join(", ") || "nenhum"}</p>` : ""}
    ${portais.length ? "" : `<p class="meio-sub dossie-sem">O resumo dos portais não foi gravado nesta coleta.
      Rode o dossiê de novo para registrar o que cada portal não tem.</p>`}
    ${docs.length ? `<div class="dossie-docs"><span class="meio-sub">${docs.length} documento${docs.length===1?"":"s"} · ${comTexto} com texto${
      imagem?` · ${imagem} digitalizado${imagem===1?"":"s"}`:""}${fila?` · ${fila} em leitura`:""}</span>
      <button class="cad-mini" onclick="verDocsDossie('${cli.id}')" title="Ver documentos"><span aria-hidden="true">Documentos</span><span class="sr-only">Ver documentos</span></button></div>` : ""}
  </div>`;
}
// a lista do dossiê por fonte, com o caminho para o Claude pelo caso do cliente
let _dossieChaves = [];
function verDocsDossie(cliId){
  const docs = docsDoDossie(cliId);
  const grupos = new Map();
  for(const a of docs){ const [f, arq] = fonteDoDossie(a); if(!grupos.has(f)) grupos.set(f, []); grupos.get(f).push([a, arq]); }
  const ks = D.casosDoCliente.get(cliId) || [];
  const k = ks.find(x=>x.fase!=="encerrado") || ks[0];
  _dossieChaves = docs.map(a=>`anexo:${a.id}`);
  caixa(`<h3 style="margin:0 0 4px">Documentos do dossiê</h3>
    <p class="meio-sub" style="margin:0 0 8px">${docs.length} documento${docs.length===1?"":"s"} baixado${docs.length===1?"":"s"} dos portais.
      O CRM lê o texto de cada um ao abrir a ficha.</p>
    ${k ? `<button class="tl-bt forte" onclick="menuClaudeDocs('${k.id}', _dossieChaves)" title="Pedir ao Claude com o dossiê"><span aria-hidden="true">Claude</span><span class="sr-only">Pedir ao Claude com o dossiê</span></button>` : ""}
    ${[...grupos].map(([f, ds])=>`<div style="margin-top:10px">
      <div class="meio-sub" style="font-weight:600;margin-bottom:4px">${esc(f)} (${ds.length})</div>
      ${ds.map(([a, arq])=>`<div class="arq-it">
        <button class="arq-abrir" onclick="abrirAnexo('${a.id}')" title="abrir o documento">📄 ${esc(arq)}</button>
        <span class="meio-sub">${a.texto ? "com texto" : a.paginas!=null ? "digitalizado" : "em leitura"}</span></div>`).join("")}
    </div>`).join("")}`);
}
// Onda 0 · a extensão entrega o PDF sem texto. A ficha lê o texto de cada
// um uma vez, em segundo plano e um por vez, e o guarda no anexo (texto,
// páginas e páginas em imagem): o pacote, o conector e os leitores das ondas
// seguintes partem dele. O digitalizado fica com páginas e sem texto, e não é
// relido a cada abertura.
let _lendoDossie = null;
// F203 · LEITURA EM PARTES. Abrir a ficha lê só o que a Identificação usa: os
// dados cadastrais, o CNIS completo, a declaração de beneficiário, a RAIS (a
// profissão) e, enquanto o estado civil faltar, laudo e pedido administrativo.
// O resto do dossiê só é lido quando se abre o Primeiro atendimento (ou o Mapa
// e a Análise de Direito, que partem dele), em ordem do menor para o maior.
const _dossieTudo = new Set(), _dossieFalhou = new Set();
const SUB_DOSSIE_TUDO = new Set(["pa","mapa","direito"]);
// o estado civil ainda falta: nem no cadastro, nem no que o dossiê já leu
const civilFalta = c => !civilDe(c).estado_civil
  && !docsDoDossie(c.id).some(x=>/^(Cadastro|Laudos|Processos administrativos)$/i.test(fonteDoDossie(x)[0]) && /Estado Civil:?[ \t]+[A-Z]/.test(x.texto||""));
function dossieDaIdentificacao(a, c, falta = civilFalta(c)){
  const [f, arq] = fonteDoDossie(a);
  if(/^Cadastro$/i.test(f)) return 1;   // o .txt e o PDF dos dados cadastrais
  if(/^CNIS$/i.test(f) && /completo/i.test(arq)) return 2;
  if(/declara[çc][ãa]o de benefici/i.test(arq)) return 3;
  if(/^CTPS RAIS CAGED$/i.test(f) && /RAIS/i.test(arq)) return 4;
  if(/^(Laudos|Processos administrativos)$/i.test(f) && falta)
    return /^Laudos$/i.test(f) ? 5 : 6;
  return 0;
}
function proximoDoDossie(cliId){
  const c = D.cliPorId.get(cliId); if(!c) return null;
  const tudo = _dossieTudo.has(cliId), falta = civilFalta(c);
  const fila = docsDoDossie(cliId).filter(a=>a.paginas==null && a.caminho && !_dossieFalhou.has(a.id))
    .map(a=>({a, p:dossieDaIdentificacao(a, c, falta) || (tudo ? 9 : 0)})).filter(x=>x.p)
    .sort((x,y)=>x.p-y.p || (x.a.tamanho||0)-(y.a.tamanho||0));
  return fila.length ? fila[0].a : null;
}
// quantos documentos do dossiê faltam ler para o Primeiro atendimento
const dossieFaltaLer = cliId => docsDoDossie(cliId).filter(a=>a.paginas==null && a.caminho && !_dossieFalhou.has(a.id)).length;
function lerDossieTodo(cliId){
  if(!cliId || _dossieTudo.has(cliId)) return;
  _dossieTudo.add(cliId); lerTextoDoDossie(cliId).catch(e=>console.warn("dossiê:", e));
}
async function lerTextoDoDossie(cliId){
  if(_lendoDossie) return 0;
  _lendoDossie = cliId;
  let n = 0, desde = 0, identPronta = false;
  try{
    for(let a; clienteAberto===cliId && (a = proximoDoDossie(cliId)); ){
      const ident = !!dossieDaIdentificacao(a, D.cliPorId.get(cliId));
      let lido;
      try{ lido = await textoDoDocumento(a.caminho); }catch(e){ console.warn("dossiê sem leitura:", a.nome, e); _dossieFalhou.add(a.id); continue; }
      const corpo = { texto: lido.texto || null, paginas: lido.paginas || 0, paginas_imagem: lido.paginas_imagem || [] };
      try{
        await api(`/rest/v1/anexos?id=eq.${a.id}`, {method:"PATCH", headers:{Prefer:"return=minimal"}, body:JSON.stringify(corpo)});
        Object.assign(a, corpo); n++; desde++;
      }catch(e){ console.warn("dossiê: texto não gravado", a.nome, e); _dossieFalhou.add(a.id); continue; }
      // a Identificação aparece assim que a parte dela termina, sem esperar o resto
      const prox = proximoDoDossie(cliId);
      if(!identPronta && (!prox || !dossieDaIdentificacao(prox, D.cliPorId.get(cliId)))){
        identPronta = true; desde = 0;
        await lerLeitoresDoDossie(cliId).catch(e=>console.warn("dossiê:", e));
        if(clienteAberto===cliId) repintarSeLivre();
      } else if(!ident && desde >= 5 && clienteAberto===cliId){ desde = 0; repintarSeLivre(); }
    }
  } finally { _lendoDossie = null; }
  if(desde && clienteAberto===cliId) repintarSeLivre();
  if(n && clienteAberto===cliId) adotarQuadro(cliId).catch(e=>console.warn("quadro:", e));   // F321 · a carta e o laudo lidos agora
  // trocou de cliente no meio: a leitura do que está aberto começa agora
  if(clienteAberto && clienteAberto!==cliId) lerTextoDoDossie(clienteAberto).catch(()=>{});
  return n;
}
// repinta a ficha sem tirar o campo de quem está digitando
function repintarSeLivre(){
  const f = document.activeElement;
  if(f && f.matches && f.matches("input,textarea,select,[contenteditable]")) return;
  repintarFicha();
}
// ═══════════════════════════════════════════════════════════════════════
// LEITURA DO DOSSIÊ — o que os PDFs já dizem, com a origem ao lado
// ═══════════════════════════════════════════════════════════════════════
// Cada leitor é função pura sobre o TEXTO que a onda 0 guardou no anexo (as
// linhas na ordem da folha, como textoDoDocumento as monta). O que só informa
// aparece com o documento de origem; o que muda o caso (NB, DCB, prazo,
// perícia, serviço novo) espera o clique de quem confere.
const linhasDoTexto = t => String(t||"").split("\n").map(s=>s.trim()).filter(Boolean);
const raizCnpj = s => { const d = String(s||"").replace(/\D/g,""); return d.length>=8 ? d.slice(0,8) : ""; };
// "08/2011" → "31/08/2011"
function fimDoMes(comp){
  const [m, a] = String(comp||"").split("/").map(Number);
  if(!m || !a || m>12) return "";
  return `${String(new Date(Date.UTC(a, m, 0)).getUTCDate()).padStart(2,"0")}/${String(m).padStart(2,"0")}/${a}`;
}
// CAGED · "Relação de vínculos do trabalhador": uma linha por vínculo, com o
// código do empregador (CNPJ inteiro, ou só a raiz quando a fonte é o
// eSocial), a razão social, a admissão, o desligamento quando houve, a
// situação e a fonte. Razão social longa quebra em duas linhas, uma acima e
// outra abaixo da linha das datas; colada à data quando não cabe.
const RX_CAGED = /^(\d{2}\.\d{3}\.\d{3}(?:\/\d{4}-\d{2})?|\d{11,14})\s+(.*?)\s*(\d{2}\/\d{2}\/\d{4})\s+(?:(\d{2}\/\d{2}\/\d{4})\s+)?(Aberto|Fechado)\s+(\S+)\s*$/;
const RX_CAGED_CAB = /^(Cod\. Empregador|VÍNCULOS|DADOS DO|Nome:|CPF:|PIS\/PASEP|Total de Vínculos|Autenticidade|Chave|Consulta realizada|Brasília|A autenticidade|a chave acima|https?:|Relação de vínculos|MINISTÉRIO|Secretaria|Subsecretaria|Coordenação)/i;
function lerCagedTexto(txt){
  const ls = linhasDoTexto(txt);
  if(!ls.some(l=>/Relação de vínculos do trabalhador/i.test(l))) return [];
  const solta = l => l && !RX_CAGED.test(l) && !RX_CAGED_CAB.test(l) && !/^\d+$/.test(l) && !/^[\d.]+-\d$|^\d{3}\.\d{5}\.\d{2}-\d/.test(l);
  const out = [];
  ls.forEach((l, i)=>{
    const m = l.match(RX_CAGED); if(!m) return;
    const nome = m[2].trim() || [ls[i-1], ls[i+1]].filter(solta).join(" ");
    out.push({cod:m[1], raiz:raizCnpj(m[1]), nome, admissao:m[3], desligamento:m[4]||"", situacao:m[5], fonte:m[6]});
  });
  return out;
}
// RAIS · "Relatório Completo do Trabalhador": um bloco por vínculo e por
// ano-base. O desligamento é a linha "Data dd/mm/aaaa" (só "Data" quando não
// houve), a causa vem logo abaixo e as remunerações vêm por mês, duas por linha.
// Os afastamentos vêm numerados sob "De Até Motivo" ("1) 0 - null" quando não
// houve), com o código e a descrição do motivo, e a data sem o ano quando o
// portal a abrevia: o ano é o do ano-base.
const _dataDaRais = (tok, ano) => { const m = String(tok).match(/^(\d{2})\/?(\d{2})(?:\/(\d{4}))?$/); return m ? `${m[1]}/${m[2]}/${m[3]||ano}` : ""; };
function lerRaisTexto(txt){
  const ls = linhasDoTexto(txt);
  const out = []; let b = null, m;
  ls.forEach((l, i)=>{
    if((m = l.match(/RAIS\s*-\s*Ano-Base:\s*(\d{4})/i))){
      b = {ano:m[1], cnpj:"", raiz:"", nome:"", admissao:"", desligamento:"", causa:"", avisoPrevio:0, remuneracoes:{}, afastamentos:[], diasAfastados:0};
      out.push(b); return;
    }
    if(!b) return;
    if((m = l.match(/^\d\)\s*(.*?)\s*(\d{1,3})\s*-\s*(.+)$/)) && m[2]!=="0"){
      const ds = (m[1].match(/\d{2}\/\d{2}\/\d{4}|\d{2}\/\d{2}|\d{4}/g)||[]).map(x=>_dataDaRais(x, b.ano)).filter(Boolean);
      b.afastamentos.push({de:ds[0]||"", ate:ds[1]||"", codigo:m[2], motivo:m[3].trim()});
      return;
    }
    if((m = l.match(/^Quantidade de dias afastados:\s*(\d+)/i))){ b.diasAfastados = +m[1]; return; }
    if(/^CNPJ\s+Razão Social$/i.test(l)){
      const x = (ls[i+1]||"").match(/^([\d.\/-]{11,18})\s+(.+)$/);
      if(x){ b.cnpj = x[1]; b.raiz = raizCnpj(x[1]); b.nome = x[2].trim(); }
      return;
    }
    if(/^Data Admissão/i.test(l)){ const x = (ls[i+1]||"").match(/^(\d{2}\/\d{2}\/\d{4})/); if(x) b.admissao = x[1]; return; }
    if(/CBO$/.test(l)){ const x = (ls[i+1]||"").match(/\d{3,6}\s*-\s*([A-ZÀ-Ú].+)$/); if(x) b.cbo = x[1].trim(); return; }
    if((m = l.match(/^Data\s+(\d{2}\/\d{2}\/\d{4})$/))){ b.desligamento = m[1]; return; }
    if((m = l.match(/^Causa\s+(\d+\s*-\s*.+)$/))){ b.causa = m[1].trim(); return; }
    if((m = l.match(/^Valor aviso prévio\s+([\d.]+,\d{2})/i))){ b.avisoPrevio = +m[1].replace(/\./g,"").replace(",","."); return; }
    for(const x of l.matchAll(/(Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)\s+([\d.]+,\d{2})/g))
      b.remuneracoes[String(MESES_NOME.indexOf(x[1].toLowerCase())+1).padStart(2,"0")] = +x[2].replace(/\./g,"").replace(",",".");
  });
  return out.filter(x=>x.raiz || x.admissao);
}
// SEGURO-DESEMPREGO · o .txt que a extensão monta do Emprega Brasil (dossiê
// 0.6.2, textoSeguroDesemprego): um bloco por requerimento, com a dispensa e
// as parcelas datadas. O JSON cru do pé fica de fora.
function lerSeguroDesempregoTexto(txt){
  const ls = linhasDoTexto(String(txt||"").split("--- dados brutos do portal ---")[0]);
  if(!/^SEGURO-DESEMPREGO/.test(ls[0]||"")) return [];
  const data = s => (String(s||"").match(/\d{2}\/\d{2}\/\d{4}/)||[])[0] || "";
  const out = []; let r = null, m;
  for(const l of ls){
    if((m = l.match(/^Requerimento\s+(\S+)\s+·\s+modalidade\s+(.+?)(?:\s+·\s+situação\s+(.+))?$/))){
      r = {numero:m[1], modalidade:m[2], situacao:m[3]||"", data:"", empregador:"", admissao:"", dispensa:"", parcelas:[]};
      out.push(r);
    }else if(!r) continue;
    else if((m = l.match(/^Data do requerimento:\s*(.*)$/))) r.data = data(m[1]);
    else if((m = l.match(/^Empregador:\s*(.*?)\s+\(.*?\)\s+·\s+admissão\s+(\S+)\s+·\s+dispensa\s+(\S+)/)))
      Object.assign(r, {empregador: m[1]==="?" ? "" : m[1], admissao:data(m[2]), dispensa:data(m[3])});
    else if((m = l.match(/^Vínculo:\s*(.*?)\s+·\s+admissão\s+(\S+)\s+·\s+demissão\s+(\S+)/)) && !r.dispensa)
      Object.assign(r, {empregador: r.empregador || (m[1]==="?" ? "" : m[1]), admissao: r.admissao || data(m[2]), dispensa:data(m[3])});
    else if((m = l.match(/^Parcela\s+(\S+):\s+liberação\s+(\S+)\s+·\s+pagamento\s+(\S+)\s+·\s+valor\s+(\S+)\s+·?\s*(.*)$/)))
      r.parcelas.push({n:m[1], liberacao:data(m[2]), pagamento:data(m[3]), valor:m[4], situacao:m[5].trim()});
    // a extensão 0.8.6 escreve "programada · paga em · R$"; a leitura aceita os dois formatos
    else if((m = l.match(/^Parcela\s+(\S+):\s+programada\s+(\S+)\s+·\s+paga em\s+(\S+)\s+·\s+R\$\s+(\S+)\s+·?\s*(.*)$/)))
      r.parcelas.push({n:m[1], liberacao:data(m[2]), pagamento:data(m[3]), valor:m[4], situacao:m[5].trim()});
  }
  return out;
}
// a parcela que chegou ao segurado: com data e sem situação de bloqueio
const parcelaRecebida = p => !!p.pagamento && !/CANCEL|BLOQUE|SUSPEN|N[ÃA]O\s*PAG|DEVOLV|RESTITU|PENDEN|A EMITIR/i.test(p.situacao||"");
// as licenças sem remuneração dos blocos da RAIS (motivo 70 do afastamento),
// uma vez cada: o mesmo afastamento sai na RAIS de cada vínculo e ano
function licencasDaRais(rais){
  const visto = new Set(), out = [];
  for(const r of rais||[]) for(const a of r.afastamentos||[]){
    if(a.codigo!=="70" && !/sem\s+(vencimento|remunera)/i.test(a.motivo)) continue;
    const k = [r.raiz, a.de, a.ate].join("|"); if(visto.has(k)) continue; visto.add(k);
    const d0 = isoBr(a.de), d1 = isoBr(a.ate);
    const dias = d0 && d1 ? Math.round((new Date(d1+"T12:00:00") - new Date(d0+"T12:00:00"))/864e5) + 1
      : (r.afastamentos.length===1 ? r.diasAfastados : 0);
    out.push({ano:r.ano, raiz:r.raiz, nome:r.nome, de:a.de, ate:a.ate, dias, anexo:r.anexo});
  }
  return out;
}
// REDESIM · o .txt dos CNPJs vinculados ao CPF (dossiê 0.7.1, redesim.js): um
// bloco por CNPJ, com a situação e o vínculo do CPF. Sem a data de abertura,
// que só a consulta ao CNPJ traz (consultarCnpjWs)
function lerCnpjsTexto(txt){
  const ls = linhasDoTexto(String(txt||"").split("--- dados brutos do portal ---")[0]);
  if(!/^CNPJs VINCULADOS AO CPF/.test(ls[0]||"")) return null;
  const out = {consulta: (ls.join("\n").match(/Consulta em (\d{2}\/\d{2}\/\d{4})/)||[])[1] || "", cnpjs:[]};
  const sem = v => v==="?" ? "" : (v||"");
  let e = null, m;
  for(const l of ls){
    if((m = l.match(/^CNPJ\s+([\d./-]{14,18})\s+·\s+(.*?)(?:\s+\(fantasia:\s*(.*)\))?$/))){
      e = {cnpj:m[1], razao:sem(m[2]), fantasia:m[3]||"", situacao:"", matriz:"", local:"", vinculo:"", qualificacao:"", capital:""};
      out.cnpjs.push(e);
    }else if(!e) continue;
    else if((m = l.match(/^Situação cadastral:\s*(.*)$/))){ const [s, mt, lc] = m[1].split(/\s*·\s*/); Object.assign(e, {situacao:sem(s), matriz:mt||"", local:(lc||"").replace(/^\/$/, "")}); }
    else if((m = l.match(/^Vínculo do CPF:\s*(.*)$/))){ const [v, q] = m[1].split(/\s*·\s*qualificação:\s*/); Object.assign(e, {vinculo:sem(v), qualificacao:q||""}); }
    else if((m = l.match(/^Capital social:\s*(.+)$/))) e.capital = m[1];
  }
  return out;
}
// Onda 2 · "11 de Junho de 2026" → "11/06/2026"
function dataPorExtenso(s){
  const m = String(s||"").match(/(\d{1,2})\s+de\s+([a-zà-ú]+)\s+de\s+(\d{4})/i);
  const i = m ? MESES_NOME.indexOf(m[2].toLowerCase()) : -1;
  return i<0 ? "" : `${m[1].padStart(2,"0")}/${String(i+1).padStart(2,"0")}/${m[3]}`;
}
const isoBr = br => dataIso(br) || "";
// LAUDO MÉDICO PERICIAL · o da Perícia Médica Federal e o antigo do SABI (uma
// página por perícia). No SABI os valores saem uma linha ACIMA dos rótulos: a
// DCB vem junto do nome do benefício, na linha de cima de "Cessação do
// Benefício", e a data do exame na linha de baixo da do "Sexo:".
function lerLaudosTexto(txt){
  const ls = linhasDoTexto(txt);
  const ini = ls.map((l, i)=>/^SABI - Sistema de Administração de Benefícios por Incapacidade$/i.test(l)
    || (/^PERÍCIA MÉDICA FEDERAL$/.test(l) && /^Perícia Médica de Benefício/i.test(ls[i+1]||"")) ? i : -1).filter(i=>i>=0);
  return ini.map((i, j)=>{
    let b = ls.slice(i, j+1<ini.length ? ini[j+1] : ls.length);
    const fim = b.findIndex(l=>/^(Você pode conferir a autenticidade|O INSS poderá rever a qualquer tempo)/i.test(l));
    if(fim>0) b = b.slice(0, fim);
    return /^SABI/.test(ls[i]) ? laudoSabi(b) : laudoPmf(b);
  }).filter(x=>x.dcb || x.dii || x.resultado);
}
function laudoPmf(b){
  const t = b.join("\n"), pega = rx => (t.match(rx)||[])[1] || "";
  const cid = t.match(/^CID Principal[ \t]+([A-Z]\d{2}(?:\.?\d)?)[ \t]*-[ \t]*(.+)$/m);
  const cap = pega(/Capacidade Laborativa[ \t]+(Não houve|Houve) comprovação/i) || pega(/Considerações Médico Periciais:[ \t]*(Incapaz|Capaz)/i);
  return {sistema:"PMF", tipo: pega(/Avaliação Médico Pericial[ \t]+BI[ \t]*-[ \t]*(.+)/i).trim(),
    nb: soDig(pega(/Espécie\/NB:[ \t]*\S*?\/([\d.\-]{10,13})/)),
    exame: dataPorExtenso(pega(/^[^,\n]+ - [A-Z]{2},[ \t]*(\d{1,2} de \S+ de \d{4})\.?$/m)),
    did: pega(/^DID[ \t]+(\d{2}\/\d{2}\/\d{4})$/m), dii: pega(/^DII[ \t]+(\d{2}\/\d{2}\/\d{4})$/m),
    dcb: pega(/^DCB[ \t]+(\d{2}\/\d{2}\/\d{4})$/m) || pega(/\(DCB\)[ \t]+(\d{2}\/\d{2}\/\d{4})/),
    cid: cid ? cid[1] : "", cidDesc: cid ? cid[2].trim() : "",
    resultado: !cap ? "" : /^(Não|Capaz)/i.test(cap) ? "capaz" : "incapaz",
    grau: pega(/^(?:Tipo de Grau de Incapacidade[ \t]+)?((?:Total|Parcial) e (?:temporária|permanente|definitiva))$/mi),
    isencao: pega(/Doença isenta de carência\?[ \t]*(Sim|Não)/i),
    // F235 · o histórico (onde o perito escreve "queda no trabalho", "lesão consolidada", "fora do Anexo III") e o nexo técnico marcado
    historia: ((t.match(/^História Clínica\n([\s\S]*?)\nDiagnóstico$/m)||[])[1]||"").replace(/\s+/g, " ").trim(), nexo: pega(/^Nexo Técnico[ \t]+(Sim|Não)$/mi)};
}
function laudoSabi(b){
  const t = b.join("\n"), pega = rx => (t.match(rx)||[])[1] || "";
  const vizinha = (rx, d) => { const i = b.findIndex(l=>rx.test(l)); return i<0 ? "" : (b[i+d]||""); };
  const cid = ((t.match(/\bCID:([^\n]*)/)||[])[1]||"").match(/^[ \t]*([A-Z]\d{2}(?:\.?\d)?)\b/);
  const res = pega(/Resultado:[ \t]*([^\n]*)/), ordem = pega(/Ordem:[ \t]*(\d+)/);
  return {sistema:"SABI", tipo: ordem ? `${ordem}ª perícia do benefício` : "", nb: soDig(pega(/NB:[ \t]*([\d.\-]{10,13})/)),
    exame: pega(/Dt Exame:[ \t]*(\d{2}\/\d{2}\/\d{4})/) || (vizinha(/^Sexo:/, 1).match(/^[\d.\-\s]*?(\d{2}\/\d{2}\/\d{4})$/)||[])[1] || "",
    did: pega(/Início da Doença:[ \t]*(\d{2}\/\d{2}\/\d{4})/), dii: pega(/Início da Incapacidade:[ \t]*(\d{2}\/\d{2}\/\d{4})/),
    dcb: pega(/Cessação do Benefício:[ \t]*(\d{2}\/\d{2}\/\d{4})/) || (vizinha(/^Cessação do\b/, -1).match(/^[^:]*?(\d{2}\/\d{2}\/\d{4})$/)||[])[1] || "",
    cid: cid ? cid[1] : "", cidDesc: "",
    resultado: /Não existe incapacidade/i.test(res) ? "capaz" : /Existe incapacidade/i.test(res) ? "incapaz" : "",
    grau: "", isencao: pega(/Isenção de Carência:[ \t]*(Sim|Não)/i)};
}
// F616 · PRÉVIUS (o cálculo do escritório): o relatório se reconhece pelo título, e a leitura tira o tempo,
// a carência, a data do cálculo, os períodos, as regras com a RMI e a espécie. Campo não achado fica ausente.
// O texto vem do PDF com os acentos certos ou trocados (fonte MacRoman), por isso os rótulos se casam sem acento.
const _prevN = s => String(s||"").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\x00-\x7f]/g, "?");
const _prevIso = br => br ? br.split("/").reverse().join("-") : "";
const _prevD = /\d{2}\/\d{2}\/\d{4}/g;
function prevTempo(s){
  const m = String(s||"").match(/(\d+)\s+anos?(?:,?\s*(?:e\s+)?(\d+)\s+m.s(?:es)?)?(?:,?\s*(?:e\s+)?(\d+)\s+dias?)?/i);
  return m ? {anos:+m[1], meses:+(m[2]||0), dias:+(m[3]||0)} : null;
}
const prevDias = t => t ? t.anos*365 + t.meses*30 + t.dias : 0;
const prevValor = s => { const m = String(s||"").match(/R\$\s*(\d[\d. ]*,\d{2})/); return m ? +m[1].replace(/[. ]/g, "").replace(",", ".") : null; };
const PREV_ROT_DATAS = /Data de Nascimento:|Inscri..o no INSS:|In.cio do Benef.cio \(DIB\):|Data da Atualiza..o:|Data do C.lculo:/g;
const PREV_TITULOS = [["transicao", /^Regras de Transi..o - EC 103\/2019$/i], ["regras", /^An.lise das Regras de Transi..o/i],
  ["tempo", /^Relat.rio do Tempo de Contribui..o$/i], ["situacao", /^An.lise da Situa..o Atual do Benef.cio/i], ["rmi", /^C.lculo da R\.M\.I\. /i]];
function lerPreviusTexto(texto){
  const ls = String(texto||"").split("\n").map(l=>l.replace(/[ \t]+/g, " ").trim()).filter(Boolean), ns = ls.map(_prevN);
  const layouts = PREV_TITULOS.filter(([, rx])=>ns.some(n=>rx.test(n))).map(([k])=>k);
  if(!layouts.length) return null;
  const p = {layouts, periodos:[], regras:[]}, abaixo = rx => { const i = ns.findIndex(n=>rx.test(n)); return i>=0 ? ls[i+1]||"" : ""; };
  const cpf = (texto.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/)||[])[0]; if(cpf) p.cpf = cpf.replace(/\D/g, "");
  // a data do cálculo (o último dado da linha de baixo do rótulo) e, no relatório do tempo e no da RMI, a DIB informada
  // o cabeçalho põe os rótulos numa linha e os valores na seguinte: a data do rótulo é a de mesma posição entre as datas
  const dataRot = rx => { for(let i=0; i<ns.length-1; i++){ if(!rx.test(ns[i])) continue;
    const rots = ns[i].match(PREV_ROT_DATAS)||[], k = rots.findIndex(r=>rx.test(r)), ds = ls[i+1].match(_prevD)||[];
    const d = k<0 || !ds.length ? null : ds.length===rots.length ? ds[k] : k===rots.length-1 ? ds[ds.length-1] : k===0 ? ds[0] : null;
    if(d) return _prevIso(d); } return ""; };
  const dc = dataRot(/Data do C.lculo:/); if(dc) p.data = dc;
  const dib = dataRot(/In.cio do Benef.cio \(DIB\):/); if(dib) p.dib = dib;
  // a espécie: "42 - Aposentadoria ... (Deficiência Leve)" na linha de baixo do rótulo
  for(let i=0; i<ns.length-1; i++) if(/^Esp.cie do Benef.cio:/.test(ns[i]) && /^\d{2} - /.test(ls[i+1])){
    p.especie = ls[i+1].replace(_prevD, "").trim(); const g = _prevN(p.especie).match(/Defici.ncia (Leve|Moderada|Grave)/i); if(g) p.grau = g[1].toLowerCase(); break; }
  // o tempo e a carência da "Análise dos Dados" (na DIB informada; o tempo da PcD já vem convertido)
  for(let i=0; i<ns.length-1; i++){ const m = ns[i].match(/^Tempo de Contribui..o em (\d{2}\/\d{2}\/\d{4}) \(DIB Informada\)/i); if(!m) continue;
    const t = prevTempo(ls[i+1]), c = ls[i+1].match(/(\d+) contribui/i);
    if(t) p.tempo = t; if(c) p.carencia = +c[1]; p.tempoEm = _prevIso(m[1]); p.data = p.data || p.tempoEm; break; }
  if(ns.some(n=>/^Tempo de Contribui..o \(PcD\)/i.test(n))) p.pcd = true;
  // as regras do resumo "Regras de Transição": o nome vem na linha de cima da "Possível Aposentadoria: Tempo..."
  ns.forEach((n, i)=>{ if(!/^Poss.vel Aposentadoria: Tempo/i.test(n) || i<1) return;
    let fim = ns.findIndex((x, j)=>j>i && (/^Retorno do Investimento/i.test(x) || /^Poss.vel Aposentadoria: Tempo/i.test(x))); if(fim<0) fim = ns.length;
    const bl = ls.slice(i+1, fim), r = {nome: ls[i-1]};
    const d = bl.find(l=>/^\d{2}\/\d{2}\/\d{4}$/.test(l)); if(d) r.data = _prevIso(d);
    const t = bl.find(l=>/^Possui \d+ anos/i.test(l)); if(t) r.tempo = prevTempo(t);
    const car = bl.map(_prevN).map(l=>l.match(/Car.ncia = (\d+)|\((\d+) contribui/i)).find(Boolean); if(car) r.carencia = +(car[1]||car[2]);
    const v = bl.map(prevValor).find(x=>x!=null); if(v!=null) r.rmi = v;
    p.regras.push(r); });
  // as regras da "Análise das Regras de Transição": o nome na linha de cima do cabeçalho, os valores na de baixo
  ns.forEach((n, i)=>{ if(!/^Tempo de Contribui..o Car.ncia Idade Prov.vel RMI$/i.test(n) || i<1) return;
    let fim = ns.findIndex((x, j)=>j>i && /^Poss.vel aposentadoria em/i.test(x)); if(fim<0) fim = Math.min(ns.length-1, i+8);
    const bl = ls.slice(i+1, fim+1), r = {nome: ls[i-1]}, val = ls[i+1]||"";
    const t = prevTempo(val), c = val.match(/(\d+) contribui/i), d = (ls[fim].match(_prevD)||[])[0];
    if(t) r.tempo = t; if(c) r.carencia = +c[1]; if(d) r.data = _prevIso(d);
    const v = bl.map(prevValor).find(x=>x!=null); if(v!=null) r.rmi = v;
    if(bl.some(l=>/^Regra Escolhida$/i.test(l))) r.escolhida = true;
    p.regras.push(r); });
  p.regras = p.regras.filter((r, i, a)=>a.findIndex(x=>x.nome===r.nome && x.data===r.data)===i);
  const esc = p.regras.find(r=>r.escolhida); if(esc) p.regra = esc.nome;
  // sem a Análise dos Dados: o tempo e a carência da regra escolhida, senão o tempo que mais se repete no resumo
  if(!p.tempo){ const src = esc ? [esc] : p.regras, mais = {};
    src.filter(r=>r.tempo).forEach(r=>{ const k = JSON.stringify(r.tempo); mais[k] = (mais[k]||0) + 1; });
    const k = Object.keys(mais).sort((a, b)=>mais[b]-mais[a])[0]; if(k) p.tempo = JSON.parse(k); }
  if(p.carencia==null){ const r = esc || p.regras.find(x=>x.carencia!=null); if(r && r.carencia!=null) p.carencia = r.carencia; }
  // a RMI: a do cálculo da RMI, senão a da situação atual, senão a da regra escolhida
  const rmiL = ls.find(l=>/Renda Mensal Inicial: R\$/i.test(l)), sit = abaixo(/^Data de aposentadoria Valor estimado/i);
  const rv = rmiL ? prevValor(rmiL.slice(rmiL.search(/Renda Mensal Inicial/i))) : sit ? prevValor(sit) : esc && esc.rmi;
  if(rv!=null) p.rmi = {valor: rv, data: p.dib || _prevIso((sit.match(_prevD)||[])[0]) || (esc && esc.data) || undefined, especie: p.especie};
  // os períodos informados (o relatório do tempo); o nome da empresa pode vir na linha de cima e na de baixo
  const ini = ns.findIndex(n=>/^Per.odos Informados$/i.test(n));
  if(ini>=0){ const ruim = l => !l || /^[*#]?\s*\d{2}\/\d{2}\/\d{4}/.test(l) || /^Def$|Fim Tipo|^Legenda|^\d+\/\d+$/i.test(l);
    for(let i=ini+1; i<ls.length && !/^Legenda:|^Per.odos Considerados/i.test(ns[i]); i++){
      const m = ls[i].match(/^[*#]?\s*(\d{2}\/\d{2}\/\d{4}) (\d{2}\/\d{2}\/\d{4}) (\S+)\s*(.*)$/); if(!m) continue;
      const def = /\bDef$/.test(m[4]) || ls[i-1]==="Def";
      let emp = m[4].replace(/\s*\bDef$/, "").trim();
      if(!emp) emp = [ls[i-1], ls[i+1]].filter(l=>!ruim(l)).join(" ");
      const tipo = _prevN(m[3]).toLowerCase(), nat = tipo==="especial" ? "especial" : tipo==="rural" ? "rural" : def ? "def" : "comum";
      p.periodos.push({inicio:_prevIso(m[1]), fim:_prevIso(m[2]), empresa:emp, natureza:nat, def, ...(def && p.grau ? {grau:p.grau} : {}), ...(/projetad/i.test(_prevN(emp)) ? {projetado:true} : {})}); }
    p.periodos = p.periodos.filter((x, i, a)=>a.findIndex(y=>y.inicio===x.inicio && y.fim===x.fim && y.empresa===x.empresa)===i); }
  return p;
}
// a conferência com o CNIS: ctx = {ct (contagem), vinculos, ppps (nomes das empresas), temRural, temLaudo, hoje}
function conferirPrevius(prev, ctx){
  const out = [], x = ctx||{}, ct = x.ct, tf = t => `${t.anos} ${t.anos===1?"ano":"anos"}${t.meses ? `, ${t.meses} ${t.meses===1?"mês":"meses"}` : ""}${t.dias ? ` e ${t.dias} ${t.dias===1?"dia":"dias"}` : ""}`;
  const br = iso => iso ? iso.split("-").reverse().join("/") : "";
  if(!prev) return out;
  const projecao = prev.tempoEm && x.hoje && prev.tempoEm > x.hoje;   // o tempo numa DIB futura soma o que ainda não houve
  // F618 · na DIB futura e na PcD (tempo convertido), a soma bruta dos períodos até hoje, sem os projetados
  const bruto = (projecao || prev.pcd) ? somaPeriodosPrev(prev.periodos, x.hoje) : null, tPrev = bruto ? bruto.tempo : prev.tempo, cPrev = bruto ? bruto.carencia : prev.carencia;
  const rotT = bruto ? `Tempo até hoje${prev.pcd ? ", sem a conversão da PcD" : ""}` : "Tempo";
  if(tPrev && ct && ct.anos!=null && (bruto || (!prev.pcd && !projecao))){ const d = Math.abs(prevDias(tPrev) - (ct.anos*365 + (ct.meses||0)*30));
    if(d > 30) out.push({tipo:"divergencia", k:"prev.tempo", fonte:"Prévius e CNIS", texto:`${rotT}: o Prévius dá ${tf(tPrev)} e o CNIS ${tf({anos:ct.anos, meses:ct.meses||0, dias:0})} (diferença de ${d} dias)`}); }
  if(cPrev!=null && ct && ct.carencia!=null && (bruto || !projecao) && Math.abs(cPrev - ct.carencia) > 1)
    out.push({tipo:"divergencia", k:"prev.carencia", fonte:"Prévius e CNIS", texto:`Carência${bruto ? " até hoje" : ""}: o Prévius dá ${cPrev} contribuições e o CNIS ${ct.carencia}`});
  const ps = (prev.periodos||[]).filter(p=>!p.projetado), vs = (x.vinculos||[]).filter(v=>v.inicio);
  const vIso = v => [_prevIso(v.inicio), v.fim ? _prevIso(v.fim) : (x.hoje || "9999-12-31")];
  const cruza = (a1, b1, a2, b2) => a1 <= b2 && a2 <= b1;
  if(ps.length && vs.length){
    for(const p of ps) if(!vs.some(v=>{ const [a, b] = vIso(v); return cruza(p.inicio, p.fim, a, b); }))
      out.push({tipo:"divergencia", k:`prev.so:${p.inicio}|${p.fim}`, fonte:"Prévius", texto:`Período de ${br(p.inicio)} a ${br(p.fim)} (${p.empresa||"sem nome"}) está no Prévius e não no CNIS`});
    for(const v of vs.filter(v=>!/benef/i.test(v.tipo||""))){ const [a, b] = vIso(v); if(!ps.some(p=>cruza(p.inicio, p.fim, a, b)))   // o Prévius põe benefício em linha à parte, que o leitor pula
      out.push({tipo:"divergencia", k:`prev.cnis:${a}|${b}`, fonte:"CNIS", texto:`Vínculo do CNIS de ${v.inicio}${v.fim ? ` a ${v.fim}` : " em aberto"} (${v.origem||v.tipo||"sem nome"}) não está no Prévius`}); }
  }
  const pal = s => dsa(s).split(/[^a-z0-9]+/).filter(w=>w.length>=4 && !/^(ltda|eireli|servicos|comercio|industria)$/.test(w));
  const ppps = (x.ppps||[]).map(pal);
  for(const p of ps.filter(p=>p.natureza==="especial")) if(!ppps.some(w=>pal(p.empresa).some(q=>w.includes(q))))
    out.push({tipo:"sem_documento", k:`prev.esp:${p.inicio}`, fonte:"Prévius", texto:`Especial de ${br(p.inicio)} a ${br(p.fim)} (${p.empresa||"sem nome"}) sem PPP no dossiê`});
  if(ps.some(p=>p.natureza==="rural") && !x.temRural) out.push({tipo:"sem_documento", k:"prev.rural", fonte:"Prévius", texto:"Período rural no Prévius sem papel da roça no dossiê"});
  if(ps.some(p=>p.def) && !x.temLaudo) out.push({tipo:"sem_documento", k:"prev.def", fonte:"Prévius", texto:"Período com deficiência no Prévius sem laudo no dossiê"});
  return out;
}
// F618 · os períodos do Prévius até `ate`, sem os projetados: dias de calendário sem contar duas vezes a sobreposição e os meses tocados
function somaPeriodosPrev(ps, ate){
  const dia = iso => Date.UTC(+iso.slice(0,4), +iso.slice(5,7)-1, +iso.slice(8,10)) / 864e5, lim = ate || "9999-12-31";
  const iv = (ps||[]).filter(p=>!p.projetado && p.inicio && p.fim && p.inicio <= lim).map(p=>[p.inicio, p.fim < lim ? p.fim : lim]).sort((a, b)=>a[0] < b[0] ? -1 : 1);
  if(!iv.length) return null;
  let dias = 0, fim = -Infinity; const meses = new Set();
  for(const [a, b] of iv){ const da = dia(a), db = dia(b); if(db > fim){ dias += db - Math.max(da, fim + 1) + 1; fim = db; }
    const km = iso => +iso.slice(0,4)*12 + +iso.slice(5,7); for(let k = km(a); k <= km(b); k++) meses.add(k); }
  return {tempo:{anos:Math.floor(dias/365), meses:Math.floor(dias%365/30), dias:dias%365%30}, carencia:meses.size};
}
// F616 · o Prévius do cliente: os anexos de origem "previus", o mais novo primeiro; o campo que falta num relatório vem de outro
function previusDe(c){
  const as = (D.anexos||[]).filter(a=>c && a.cliente_id===c.id && a.origem==="previus" && a.texto)
    .sort((a, b)=>String(b.criado_em||"").localeCompare(String(a.criado_em||"")));
  if(!as.length) return null;
  const p = {layouts:[], periodos:[], regras:[]};
  for(const a of as){ const x = lidoDoAnexo(a, lerPreviusTexto, "prev"); if(!x) continue;
    for(const [k, v] of Object.entries(x)) if(Array.isArray(v)){ if(!(p[k]||[]).length) p[k] = v; } else if(p[k]==null) p[k] = v;
    p.layouts = [...new Set([...p.layouts, ...x.layouts])]; }
  return {a:as[0], p, n:as.length};
}
const prevTempoTxt = t => t ? [t.anos ? plu(t.anos, "ano", "anos") : "", t.meses ? plu(t.meses, "mês", "meses") : "", t.dias ? plu(t.dias, "dia", "dias") : ""].filter(Boolean).join(", ") || "nenhum dia" : "";
// a RMI do Prévius na Análise de Direito: só informação, o cálculo do CRM continua o de cima
function rmiPrevius(c){
  const pv = previusDe(c), r = pv && pv.p.rmi; if(!r || r.valor==null) return "";
  return `<p class="adb-valor meio-sub">RMI pelo Prévius: ${esc(moeda(r.valor))}${r.especie ? ` (${esc(r.especie)}${r.data ? `, ${esc(fmtBarra(r.data))}` : ""})` : r.data ? ` (${esc(fmtBarra(r.data))})` : ""}, só para conferência; o cálculo acima é o do CRM.</p>`;
}
// a linha do quadro do CNIS: o botão (escolher ou soltar o arquivo) e quando o Prévius foi enviado
function previusLinha(c){
  const pv = previusDe(c), id = `prev-arq-${c.id}`;
  return `<p class="pa-prev-linha" ondragover="event.preventDefault()" ondrop="event.preventDefault();subirPrevius('${c.id}',event.dataTransfer.files)">
    ${pv ? `Prévius enviado em ${esc(fmtBarra(String(pv.a.criado_em||"").slice(0, 10)))}.` : "Sem cálculo do Prévius."}
    <label class="btn-mini" for="${id}" title="${pv ? "Trocar o cálculo do Prévius" : "Enviar o cálculo do Prévius (PDF), ou solte o arquivo aqui"}">${pv ? "Trocar" : "Prévius"}</label>
    <input type="file" id="${id}" accept=".pdf,.txt,application/pdf,text/plain" hidden onchange="subirPrevius('${c.id}',this.files)">
    <span class="meio-sub">O que está no Drive vem pelo botão "Prévius do Drive" da extensão do dossiê.</span></p>`;
}
// F618 · o Prévius que a extensão trouxe do Drive chega sem texto (nulo): lido ao abrir a ficha, só com o CPF da ficha.
// Recusado, fica com texto "" (lido e recusado), para não ser lido de novo
async function lerPreviusPendentes(cliId){
  const c = D.cliPorId.get(cliId); if(!c) return;
  const cpf = soDig(c.cpf); let n = 0;
  for(const a of (D.anexos||[]).filter(a=>a.cliente_id===cliId && a.origem==="previus" && a.texto==null)){
    let r; try{ r = await textoDoDocumento(a.caminho, true); }catch(e){ console.warn("prévius:", e); continue; }
    const p = r.texto && lerPreviusTexto(r.texto), ok = !!p && (!p.cpf || p.cpf===cpf);
    const dados = ok ? {texto:r.texto, paginas:r.paginas ?? null} : {texto:""};
    try{ await api(`/rest/v1/anexos?id=eq.${a.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"}, body:JSON.stringify(dados)}); }
    catch(e){ console.warn("prévius:", e); continue; }
    Object.assign(a, dados);
    if(ok) n++; else aviso(`${a.nome||"O arquivo"}: ${p ? "o CPF do Prévius não é o desta ficha" : "não parece um relatório do Prévius"}. Não foi lido.`);
  }
  if(n && clienteAberto===cliId) repintarFicha();
}
async function subirPrevius(cliId, arqs){
  const arq = arqs && arqs[0], c = D.cliPorId.get(cliId); if(!arq || !c) return;
  if(arq.size > MAX_ARQ) return aviso("Arquivo grande demais (até 20 MB)");
  const cpf = soDig(c.cpf); if(cpf.length!==11) return aviso("Informe o CPF na ficha antes de enviar o Prévius");
  let texto = "", paginas = null;
  try{
    if(/pdf/i.test(arq.type) || /\.pdf$/i.test(arq.name)){ const l = await lerPdfPorPagina(arq); texto = l.texto || ""; paginas = l.paginas ?? null; }
    else texto = await arq.text();
  }catch(e){ return aviso("Não consegui ler o arquivo: "+msgErro(e)); }
  texto = texto.replace(/\u0000/g, "");
  const p = lerPreviusTexto(texto);
  if(!p) return aviso("O arquivo não parece um relatório do Prévius.");
  if(p.cpf && p.cpf!==cpf) return aviso("O CPF do Prévius não é o desta ficha. Nada foi gravado.");
  const caminho = `previus/${cpf}/${nomeSeguro(arq.name)}`, pc = preCasoAberto(c);
  try{ await subirArquivo(caminho, arq, BUCKET, true); }catch(e){ return aviso("Não consegui enviar o arquivo: "+msgErro(e)); }
  let an;
  try{ [an] = await api(`/rest/v1/anexos?on_conflict=caminho`,{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=representation"},
    body:JSON.stringify({cliente_id:cliId, caso_id:(pc && pc.caso_id) || null, autor_id:eu.id, nome:`Prévius · ${arq.name}`, caminho,
      tipo:arq.type || null, tamanho:arq.size, origem:"previus", texto, paginas})}) || []; }
  catch(e){ return aviso("Não consegui gravar o anexo: "+msgErro(e)); }
  if(an){ D.anexos = (D.anexos||[]).filter(x=>x.caminho!==an.caminho); D.anexos.unshift(an); }
  repintarFicha();
  aviso("Prévius anexado ✔", false);
}
// CARTA DE CONCESSÃO · a de hoje ("CARTA DE / CONCESSÃO", com o NB e a renda na
// linha de baixo dos rótulos) e a antiga ("Carta de Concessão / Memória de
// Cálculo"), em que os dados vêm num parágrafo
function lerCartaTexto(txt){
  const ls = linhasDoTexto(txt);
  const abaixo = rx => { const i = ls.findIndex(l=>rx.test(l));
    for(let j=i+1; i>=0 && j<=i+3; j++){ const d = (ls[j]||"").match(/\d{2}\/\d{2}\/\d{4}/g); if(d) return d; } return []; };
  if(ls.includes("CARTA DE") && ls.includes("CONCESSÃO")){
    const nb = (ls[ls.findIndex(l=>/^NÚMERO DO BENEFÍCIO/i.test(l))+1]||"").match(/^([\d.\-]{10,13})\s+R\$\s*([\d.]+,\d{2})/);
    if(!nb) return null;
    const iEsp = ls.findIndex(l=>/^Comunicamos que foi concedido/i.test(l));
    const [der, concessao] = abaixo(/^Solicitado em\b/i), [dib, dip] = abaixo(/^Início do benefício\b/i);
    return {nb: soDig(nb[1]), especie: iEsp>=0 ? (ls[iEsp+1]||"") : "", rmi: nb[2], der: der||"", concessao: concessao||"", dib: dib||"", dip: dip||""};
  }
  if(!ls.some(l=>/Carta de Concessão\s*\/\s*Memória de Cálculo/i.test(l))) return null;
  const p = ls.join(" ").replace(/(\d{2}\/\d{2})\s+\/(\d{4})/g, "$1/$2"), pega = rx => (p.match(rx)||[])[1] || "";
  const nb = soDig(pega(/Número do Benefício:\s*([\d.\-]{10,13})/i));
  return !nb ? null : {nb, especie: pega(/concedido\s+(.+?)\s+\(\d+\)\s+número/i), rmi: pega(/renda mensal de R\$\s*([\d.]+,\d{2})/i),
    der: pega(/requerido em\s+(\d{2}\/\d{2}\/\d{4})/i), concessao: pega(/Data de Concessão do Benefício:\s*(\d{2}\/\d{2}\/\d{4})/i),
    dib: pega(/início de vigência a partir de\s+(\d{2}\/\d{2}\/\d{4})/i), dip: ""};
}
// Onda 3 · RESUMO DE DOCUMENTOS PARA CÁLCULO DE TEMPO DE CONTRIBUIÇÃO: a
// contagem do INSS na DER, com o tempo, a carência considerada, o que falta e
// os períodos especiais não enquadrados
function lerResumoInssTexto(txt){
  const t = String(txt||"");
  if(!/RESUMO DE DOCUMENTOS PARA C[AÁ]LCULO DE TEMPO DE CONTRIBUI[CÇ][AÃ]O/i.test(t)) return null;
  const pega = rx => (t.match(rx)||[])[1] || "";
  const tempo = t.match(/TEMPO DE CONTRIBUI[CÇ][AÃ]O COMUM[^:\n]*:\s*(\d+)\s*ANOS?\s*(\d+)\s*MES(?:ES)?\s*(\d+)\s*DIAS?/i);
  const car = pega(/TOTAL DE CAR[EÊ]NCIA CONSIDERADA\.*:\s*(\d+)/i) || pega(/TOTAL DE CAR[EÊ]NCIA EM CONTRIBUI[CÇ][OÕ]ES\.*:\s*(\d+)/i);
  return {nb: soDig(pega(/NB\.+:\s*([\d.\-]{10,13})/)), especie: pega(/ESPECIE\.+:\s*(\d+)/i), der: pega(/DER\.+:\s*(\d{2}\/\d{2}\/\d{4})/),
    tempo: tempo ? {anos:+tempo[1], meses:+tempo[2], dias:+tempo[3]} : null, carencia: car ? +car : null,
    aCumprir: pega(/TEMPO A CUMPRIR\s*:\s*([^\n]+)/).trim(), naoEnquadrados: (t.match(/N[AÃ]O ENQUADRADO/gi)||[]).length};
}
// Onda 4 · CAT do Meu INSS: emitente, tipo, a data e o tipo do acidente, o
// CNAE do empregador (na linha de baixo do rótulo, depois do CNPJ) e o CID
function lerCatTexto(txt){
  const ls = linhasDoTexto(txt);
  if(!ls.some(l=>/^CAT - Comunica[çc][ãa]o de Acidente de Trabalho$/i.test(l))) return null;
  const t = ls.join("\n"), pega = rx => ((t.match(rx)||[])[1] || "").trim();
  const abaixo = rx => { const i = ls.findIndex(l=>rx.test(l)); return i<0 ? "" : (ls[i+1]||""); };
  const acid = abaixo(/^19 - Data do Acidente:/).match(/^(\d{2}\/\d{2}\/\d{4})(?:\s+\S+){0,2}\s+(Típico|Trajeto|Doença)\b/i);
  const cnae = abaixo(/^10 - CNAE:/).match(/(\d{2}\.\d{2,3}(?:-\d)?(?:\/\d{2})?)\s*$/);
  const cid = abaixo(/^47 - CID-10:/).match(/^([A-Z]\d{2,3})\s*-\s*(.+)$/);
  return {numero: /^\d{4}-\d{6}-\d\/\d{2}$/.test(ls[1]||"") ? ls[1] : "", tipoCat: pega(/2 - Tipo de CAT:\s*([^\n]+)/), emitente: pega(/1 - Emitente:\s*([^\n]+)/),
    data: acid ? acid[1] : "", tipo: acid ? acid[2] : "", cnae: cnae ? cnae[1] : "", cid: cid ? cid[1] : "", cidDesc: cid ? cid[2].trim() : "",
    // F235 · "após quantas horas de trabalho": o acidente no meio do expediente faz do dia um dia trabalhado
    apos: (abaixo(/^19 - Data do Acidente:/).match(/^\d{2}\/\d{2}\/\d{4}\s+\d{1,2}:\d{2}\s+(\d{1,2}:\d{2})\b/)||[])[1] || "",
    parte: (abaixo(/^31 - Parte do corpo atingida/).match(/-\s*(.+)$/)||[])[1] || ""};
}
// Onda 4 · PPP do eSocial (Meu INSS): um bloco por fator de risco, com a
// intensidade na linha do fator e o período logo abaixo ("dd/mm/aaaa a" e a
// data final na linha seguinte); o último campo da linha do fator é o EPI eficaz
function lerPppTexto(txt){
  const ls = linhasDoTexto(txt);
  if(!ls.some(l=>/^Perfil Profissiogr[áa]fico Previdenci[áa]rio/i.test(l))) return null;
  const iE = ls.findIndex(l=>/^1 - CNPJ do Domic/i.test(l));
  const emp = (ls[iE+1]||"").match(/^([\d.\/-]{8,18})\s+(.+?)\s+(\d{4}-\d\/\d{2})$/);
  const FATOR = /^([FQBEMA])\s+(\d{2}\.\d{2}\.\d{3})\s*-\s*(.+)$/, riscos = [];
  ls.forEach((l, i)=>{
    const m = l.match(FATOR); if(!m) return;
    let ini = "", fim = "";
    for(let j = i+1; j < Math.min(ls.length, i+14) && !fim && !FATOR.test(ls[j]); j++){
      const a = ls[j].match(/^(\d{2}\/\d{2}\/\d{4})\s+a(?:\s+(\d{2}\/\d{2}\/\d{4}))?$/);
      if(a){ ini = a[1]; fim = a[2] || ""; }
      else if(ini && /^\d{2}\/\d{2}\/\d{4}$/.test(ls[j])) fim = ls[j];
    }
    const db = m[3].match(/Ru[íi]do\s+([\d.,]+)\s*decibel/i), toks = m[3].trim().split(/\s+/);
    riscos.push({tipo:m[1], codigo:m[2], fator: m[3].replace(/\s+[\d.,]+\s+(decibel|metro|grau|ppm|mg|f\/cm).*$/i, "").replace(/(\s+(NA|SIM|N[ÃA]O)){2,}$/, "").trim(),
      // F235 · a técnica do ruído (NEN ou NHO-01): desde 2004 o INSS só enquadra com ela (IN 128, art. 292, IV e § 1º)
      db: db ? +db[1].replace(",", ".") : null, epi: toks[toks.length-1], ini, fim, nen: db ? /\bNEN\b|NHO[- ]?0?1/i.test(m[3]) : null});
  });
  // F235 · a seção 16 (responsável pelos registros ambientais): "sim" com nome ou registro no conselho, "nao" vazia
  const i16 = ls.findIndex(l=>/^16 - RESPONS[ÁA]VEL PELOS REGISTROS AMBIENTAIS/i.test(l)), d16 = i16 < 0 ? "" : ls.slice(i16 + 1, i16 + 8).join(" ");
  return {empresa: emp ? emp[2] : "", cnpj: emp ? emp[1] : "", riscos, resp: i16 < 0 ? null : /CRM|CREA|engenheir|m[ée]dic|\d{3}\.\d{5}\.\d{2}/i.test(d16) ? "sim" : "nao"};
}
// o ruído contra o limite de cada época (Decretos 53.831/64, 2.172/97 e
// 4.882/2003): 80 dB(A) até 05/03/1997, 90 até 18/11/2003 e 85 depois
function ruidoNoPeriodo(db, ini, fim){
  const a = isoBr(ini) || "0000-01-01", b = isoBr(fim) || hoje();
  return [["0000-01-01","1997-03-05",80],["1997-03-06","2003-11-18",90],["2003-11-19","9999-12-31",85]]
    .filter(([x, y])=>a<=y && b>=x).map(([, , lim])=>({lim, acima: db > lim}));
}
// F235 · o vínculo que o CNIS marca com exposição informada pelo empregador (indicador IEAN) e que o PPP do dossiê não
// cobre inteiro: a parte sem PPP é o documento a pedir. O PPP é por empresa (raiz do CNPJ) e prova só o período dele
function lacunasPpp(g, ppps){
  const out = [];
  for(const v of ((g||{}).vinculos||[]).filter(v=>v.tipo!=="Benefício" && v.inicio && (v.indicadores||[]).some(i=>/^IEAN/.test(String(i))))){
    const de = isoBr(v.inicio), ate = isoBr(v.fim||"") || (v.ultRemun ? isoBr(fimDoMes(v.ultRemun)) : hoje()), raiz = raizCnpj(v.codigo||"");
    if(!de || !ate) continue;
    const ps = (ppps||[]).filter(p=>raiz && raizCnpj(p.cnpj||"")===raiz);
    const cob = fundirIvs(ps.flatMap(p=>(p.riscos||[]).map(r=>[isoBr(r.ini||"") || de, isoBr(r.fim||"") || ate])));
    const falta = semCobertura(de, ate, cob).filter(([a, b])=>durDias(durCal(a, b)) >= 30);
    if(falta.length) out.push({onde: tituloOrgao(v.origem||"") || "empregador", raiz, de, ate, cob, falta, ppp: ps[0] || null});
  }
  return out;
}
const ivsTxt = ivs => ivs.map(([a, b])=>`${fmtBarra(a)} a ${fmtBarra(b)}`).join(" e ");
// EXTRATO DE PAGAMENTO · "Histórico de Créditos": um bloco por benefício, com
// DIB, DCB e DIP no cabeçalho e uma linha por crédito (competência, período,
// valor líquido, meio e situação, previsão e data do pagamento)
function lerExtratoPagTexto(txt){
  const ls = linhasDoTexto(txt);
  if(!ls.some(l=>/^Histórico de Créditos$/i.test(l))) return [];
  const out = []; let b = null, m;
  for(const l of ls){
    if((m = l.match(/^NB:\s*([\d.\-]{10,13})/))){ b = {nb:soDig(m[1]), especie:"", dib:"", dcb:"", dip:"", mr:"", creditos:[]}; out.push(b); continue; }
    if(!b) continue;
    if((m = l.match(/^Espécie:\s*(.+)$/))) b.especie = m[1].trim();
    for(const [k, rx] of [["dib",/\(DIB\):\s*(\d{2}\/\d{2}\/\d{4})/], ["dcb",/\(DCB\):\s*(\d{2}\/\d{2}\/\d{4})/],
                          ["dip",/\(DIP\):\s*(\d{2}\/\d{2}\/\d{4})/], ["mr",/\bMR:\s*R\$\s*([\d.]+,\d{2})/]])
      if((m = l.match(rx))) b[k] = m[1];
    if((m = l.match(/^(\d{2}\/\d{4})\s+\d{2}\/\d{2}\/\d{4}\s+R\$\s*([\d.]+,\d{2})\s+(.*?)\s+(\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}\/\d{2}\/\d{4}))?/)))
      b.creditos.push({comp:m[1], valor:m[2], pago: /\bPago\b/i.test(m[3]) && !/Não Pago/i.test(m[3]), previsao:m[4], pagoEm:m[5]||""});
  }
  return out;
}
// CÓPIA DO PROCESSO (PAP do Meu INSS) · só a folha de interposição (o
// PROTOCOLO DE REQUERIMENTO: serviço, situação, NB, data de entrada e última
// atualização) e a COMUNICAÇÃO DE DECISÃO (decisão, motivo e cessação). O resto
// da cópia não se lê: traz páginas em imagem e despachos que podem gerar fato
// falso (decisão do Paulo, 11.10.2026). A "Data:" da comunicação não se lê,
// porque a cópia a regera com a data da EMISSÃO da cópia, e não com a da
// decisão. A data quebra no meio ("16/05" e "/2025" em linhas seguidas) e é
// juntada antes de ler.
function lerProcessoTexto(txt){
  const ls = linhasDoTexto(txt);
  if(!ls.includes("PROTOCOLO DE REQUERIMENTO")) return null;
  const junta = xs => xs.join(" ").replace(/(\d{2}\/\d{2})\s+\/(\d{4})/g, "$1/$2").replace(/\s+/g, " ").trim();
  const iS = ls.findIndex(l=>/^Serviço\s+Status\s+Prioridade$/i.test(l));
  const sv = (ls[iS+1]||"").match(/^(.+?)\s+(Concluída|Pendente|Cancelada|Em análise|Em exigência|Exigência|Aguardando .+?)\s+\S+$/i);
  const iNb = ls.indexOf("NB"), tudo = ls.join("\n");
  const nb = soDig(((iNb>=0 && /^[\d.\-]{10,13}$/.test(ls[iNb+1]||"")) ? ls[iNb+1] : "")
    || (tudo.match(/^NB\s+([\d.\-]{10,13})$/m)||[])[1] || (tudo.match(/Número do Benefício:\s*([\d.\-]{10,13})/)||[])[1] || "");
  // cada comunicação vai até a próxima, ou 45 linhas
  const comunicacoes = [];
  ls.forEach((l, i)=>{
    if(l!=="COMUNICAÇÃO DE DECISÃO") return;
    const prox = ls.indexOf("COMUNICAÇÃO DE DECISÃO", i+1);
    const t = junta(ls.slice(i+1, prox>i ? Math.min(prox, i+45) : i+45)), dec = (t.match(/Decisão:\s*(.+?)\.?\s+Motivo:/i)||[])[1];
    if(dec) comunicacoes.push({nb: soDig((t.match(/Número do Benefício:\s*([\d.\-]{10,13})/)||[])[1]||"") || nb, decisao: dec.trim(),
      contra: /INDEFER|NEGAD|NÃO RECONHEC/i.test(dec),
      motivo: ((t.match(/Motivo:\s*(.+?)\.?\s+(?:Fundamentação|Em atenção|A perícia)/i)||[])[1]||"").trim(),
      dcb: (t.match(/(?:será mantido até|Data da cessação(?: do benefício)?:?)\s*(\d{2}\/\d{2}\/\d{4})/i)||[])[1]||""});
  });
  return {servico: sv ? sv[1] : (ls[iS+1]||""), status: sv ? sv[2] : "", nb,
    entrada: (tudo.match(/Data de entrada:\s*(\d{2}\/\d{2}\/\d{4})/)||[])[1]||"",
    atualizado: (tudo.match(/Última atualização\s*(\d{2}\/\d{2}\/\d{4})/)||[])[1]||"", comunicacoes};
}
