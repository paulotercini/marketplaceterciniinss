function seloParado(k){
  const n = diasParado(k); if(n===null) return "";
  const u = ultimoRegistro(k);
  return `<span class="ag-tipo ag-parado" title="caso sem anotação da equipe há mais de 30 dias${n>90?"; acima de 90 dias entra na Esteira de revisão":""}">${u ? `há ${n} dias` : "parado +30 dias"}</span>`;
}
function colunasDoQuadro(modo){
  const ks = ativos(), urg = xs => xs.sort((a,b)=>(b.urgente?1:0)-(a.urgente?1:0));
  if(modo==="etapa"){ const f = quadroFase(), et = ETAPAS_POR_FASE[f]||[], noF = ks.filter(k=>faseEfetiva(k)===f && !ehPreCaso(k));
    return [...et.map(e=>[e, e, urg(noF.filter(k=>k.etapa===e))]), ["", "Sem etapa", urg(noF.filter(k=>!et.includes(k.etapa)))]]; }
  // "de quem é" segue a regra única da F236 (ehDoColab: atribuído ao caso ou com tarefa aberta nele); no teste real de
  // 24.10, só pela atribuição, 715 casos caíam em "Sem responsável"
  if(modo==="responsavel"){ const eq = equipeAtiva();
    return [...eq.map(c=>[c.id, c.nome.split(" ")[0], urg(ks.filter(k=>ehDoColab(k, c.id)))]),
      ["", "Sem responsável", urg(ks.filter(k=>!eq.some(c=>ehDoColab(k, c.id))))]]; }
  if(modo==="prazo"){ const hj = hoje(), em = n => somaDias(hj, n), comP = ks.filter(k=>k.prazo).sort((a,b)=>a.prazo<b.prazo?-1:1);
    return [["venc","Vencidos", comP.filter(k=>k.prazo<hj)], ["hoje","Hoje", comP.filter(k=>k.prazo===hj)],
      ["sete","Próximos sete dias", comP.filter(k=>k.prazo>hj && k.prazo<=em(7))], ["depois","Mais tarde", comP.filter(k=>k.prazo>em(7))]]; }
  return COLUNAS_QUADRO.map(([f,rot])=>[f, rot, urg(D.casos.filter(k=>k.fase===f))]);
}
function renderQuadro(){
  tituloLista("📌 Quadro");
  const modo = ler("crm_quadro_agrupar") || "fase";
  document.getElementById("sub-lista").innerHTML = `<span style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">Agrupar por: ${AGRUPAR_QUADRO.map(([v,r])=>
    `<button class="fchip ${v===modo?"on":""}" data-agrupar="${v}" style="display:inline-flex">${r}</button>`).join("")} <span class="meio-sub">${
    modo==="fase" ? "arraste o cartão para mudar a fase do caso (o To Do acompanha)."
    : modo==="etapa" ? "arraste o cartão para declarar a etapa do caso."
    : modo==="responsavel" ? "arraste o cartão para passar o caso a outra pessoa." : "o prazo fatal muda na ficha, não aqui."}</span>${
    modo==="etapa" ? `<span style="display:flex;gap:6px;flex-wrap:wrap;width:100%">Fase: ${FASES_QUADRO_ETAPA.map(f=>`<button class="fchip ${f===quadroFase()?"on":""}" data-qfase="${f}" style="display:inline-flex">${esc(NOME_FASE[f]||f)}</button>`).join("")}</span>` : ""}${
    modo==="etapa"||modo==="responsavel" ? `<label style="font-size:12px;color:var(--cinza)" title="a coluna com mais cartões que o limite fica em vermelho; vazio, sem limite">Limite <input id="q-lim" type="number" min="0" max="500" value="${quadroLim()||""}"></label>` : ""}</span>`;
  const lim = (modo==="etapa"||modo==="responsavel") ? quadroLim() : 0, atr = {fase:"fase", etapa:"etapa", responsavel:"colab"}[modo];
  document.getElementById("conteudo-meio").innerHTML =
    `<div class="kanban">`+colunasDoQuadro(modo).map(([id,rot,ks])=>
      `<div class="coluna${lim && ks.length>lim?" acima":""}" ${atr?`data-${atr}="${esc(id)}"`:""}><h4>${esc(semEmoji(rot))}<span${lim && ks.length>lim?` title="acima do limite de ${lim}"`:""}>${ks.length}</span></h4>
        ${ks.slice(0,60).map(kcardCaso).join("")}
        ${ks.length>60?`<p class="meio-sub">+${ks.length-60} — use a pesquisa</p>`:""}</div>`).join("")+`</div>`;
  document.querySelectorAll("[data-agrupar]").forEach(b=>b.onclick=()=>{ guardar("crm_quadro_agrupar", b.dataset.agrupar); renderQuadro(); });
  document.querySelectorAll("[data-qfase]").forEach(b=>b.onclick=()=>{ guardar("crm_quadro_fase", b.dataset.qfase); renderQuadro(); });
  const qi = document.getElementById("q-lim"); if(qi) qi.onchange=()=>{ guardar("crm_quadro_lim", String(Math.max(0, Math.round(+qi.value)||0))); setTimeout(renderQuadro); };   // fora do blur, que roda no meio de outra pintura
  ligarQuadro();
}
// passa o caso de uma pessoa a outra (atribuições), com a menção a quem recebe; usada pelo Quadro e pela Tabela
async function passarCaso(id, de, para){
  const atr=D.atrDoCaso.get(id)||[];
  try{
    if(para && !atr.includes(para)) await api(`/rest/v1/atribuicoes`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({caso_id:id, colaborador_id:para})});
    if(de) await api(`/rest/v1/atribuicoes?caso_id=eq.${id}&colaborador_id=eq.${de}`,{method:"DELETE"});
  }catch(err){ aviso("Não consegui passar o caso: "+String(err.message||err).slice(0,80)); return false; }
  D.atrDoCaso.set(id, [...atr.filter(x=>x!==de && x!==para), ...(para?[para]:[])]);
  const k=D.casoPorId.get(id), c=k && D.cliPorId.get(k.cliente_id);
  if(para && para!==eu.id) api(`/rest/v1/mencoes`,{method:"POST",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({de_id:eu.id, para_id:para, caso_id:id,
      texto:`👤 ${(eu.nome||"").split(" ")[0]} atribuiu a você o cliente ${c?c.nome:""}`.trim()})}).catch(()=>{});
  aviso(para ? `Caso passado para ${(D.colPorId.get(para)||{}).nome||""}` : "Caso sem responsável"); montarSidebar();
  return true;
}
function ligarQuadro(){
  document.querySelectorAll(".kcard[data-caso]").forEach(el=>{
    el.ondragstart=e=>{ e.dataTransfer.setData("text/caso", el.dataset.caso);
      const de=el.closest(".coluna[data-colab]"); if(de) e.dataTransfer.setData("text/de", de.dataset.colab); };
    el.onmousedown=e=>{ if(e.shiftKey) e.preventDefault(); };
    el.onclick=e=>{ if(e.shiftKey){ e.preventDefault(); return alternarSel(el); } if(el.dataset.cli) abrirFicha(el.dataset.cli); };   // F445 · a seleção da F443 no Quadro
  });
  if(_sel.size) pintarSel();
  document.querySelectorAll(".coluna[data-colab]").forEach(col=>{
    col.ondragover=e=>{ e.preventDefault(); col.classList.add("solta"); };
    col.ondragleave=()=>col.classList.remove("solta");
    col.ondrop=async e=>{
      e.preventDefault(); col.classList.remove("solta");
      const id=e.dataTransfer.getData("text/caso"), de=e.dataTransfer.getData("text/de"), para=col.dataset.colab;
      if(id && de!==para && await passarCaso(id, de, para)) renderQuadro();
    };
  });
  document.querySelectorAll(".coluna[data-fase]").forEach(col=>{
    col.ondragover=e=>{ e.preventDefault(); col.classList.add("solta"); };
    col.ondragleave=()=>col.classList.remove("solta");
    col.ondrop=async e=>{
      e.preventDefault(); col.classList.remove("solta");
      const id=e.dataTransfer.getData("text/caso"); if(!id) return;
      const k=D.casoPorId.get(id); if(!k || k.fase===col.dataset.fase) return;
      k.fase=col.dataset.fase;
      await patchCaso(id, {fase:k.fase});
      aviso("Fase: "+NOME_FASE[k.fase]); montarSidebar(); renderQuadro();
    };
  });
  document.querySelectorAll(".coluna[data-etapa]").forEach(col=>{
    col.ondragover=e=>{ e.preventDefault(); col.classList.add("solta"); };
    col.ondragleave=()=>col.classList.remove("solta");
    col.ondrop=async e=>{
      e.preventDefault(); col.classList.remove("solta");
      const id=e.dataTransfer.getData("text/caso"), k=id && D.casoPorId.get(id); if(!k) return;
      const para = col.dataset.etapa||"", antes = k.etapa||"", et = ETAPAS_POR_FASE[quadroFase()]||[];
      if(para===antes || (!para && !et.includes(antes))) return;
      await gravarEtapa(id, para);
      if((k.etapa||"")===para) avisoDesfazer(para ? `Etapa: ${para}` : "Etapa retirada", ()=>gravarEtapa(id, antes));
    };
  });
}

// ── F441 · as ideias do Trello (aprovadas pelo Paulo em 08.11.2026) ─────────
// Regras por etapa: "quando o caso entrar na etapa X, propor a tarefa Y para Z em N dias úteis". A regra só PROPÕE,
// nas Sugeridas para hoje de quem cuida do caso e de quem fará a tarefa; um clique cria a tarefa (nada grava sozinho)
const REGRAS_ETAPA_PADRAO = [
  {id:"r1", fase:"judicial", etapa:"perícia designada", tarefa:"Orientar o cliente sobre a perícia", quem:"recepcao", dias:2},
  {id:"r2", fase:"inss", etapa:"aguardando perícia", tarefa:"Orientar o cliente sobre a perícia", quem:"recepcao", dias:2},
];
const QUEM_REGRA = [["responsavel","Quem cuida do caso"],["recepcao","Recepção"],["advogado","Advogado do cliente"]];
function lerJsonCfg(chave, padrao){ const v = cfgApp(chave); if(v==null || v==="") return padrao; try{ const o = JSON.parse(v); return Array.isArray(o) ? o : padrao; }catch(e){ return padrao; } }
const regrasEtapa = () => lerJsonCfg("regras_etapa", REGRAS_ETAPA_PADRAO).filter(r=>r && r.etapa && r.tarefa);
function alvosDaRegra(r, k){
  const eq = equipeAtiva();
  const ids = r.quem==="recepcao" ? eq.filter(c=>c.cargo==="recepcao").map(c=>c.id)
    : r.quem==="advogado" ? (advogadoDoCliente(k.cliente_id, k)||[]) : donosDoCaso(k);
  const ok = ids.filter(id=>eq.some(c=>c.id===id));
  return ok.length ? ok : donosDoCaso(k).filter(id=>eq.some(c=>c.id===id));   // sem ninguém no papel, vai a quem cuida do caso
}
function diasUteisDepois(iso, n){ let d = iso; for(let i=0; i<Math.max(0, n|0);){ d = somaDias(d, 1); if(ehDiaUtil(d)) i++; } return proxDiaUtil(d); }
// as regras que valem para o caso agora e ainda não viraram tarefa (ronda.regras guarda "<regra>|<etapa>")
function regrasDoCaso(k){
  if(!k.etapa || ehPreCaso(k)) return [];
  const f = faseEfetiva(k), feitas = (k.ronda && k.ronda.regras) || {};
  return regrasEtapa().filter(r=>r.fase===f && r.etapa===k.etapa && !feitas[`${r.id}|${k.etapa}`]);
}
async function criarTarefaDaRegra(casoId, rid){
  const k = D.casoPorId.get(casoId), r = regrasEtapa().find(x=>x.id===rid); if(!k || !r) return;
  const alvo = alvosDaRegra(r, k)[0];
  if(!alvo) return aviso("Ninguém da equipe para esta regra: confira em Configurações");
  const dia = diasUteisDepois(hoje(), +r.dias||0);
  let and = null;
  try{ [and] = await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify({caso_id:casoId, autor_id:eu.id, texto:`${r.tarefa} (pela etapa ${k.etapa})`})});
    await criarTarefasDe(and.id, casoId, [alvo], null, dia, "compromisso");
    const regras = {...((k.ronda && k.ronda.regras)||{}), [`${r.id}|${k.etapa}`]: hoje()};
    await patchCaso(casoId, {ronda:{...(k.ronda||{}), regras}}); k.ronda = {...(k.ronda||{}), regras};
  }catch(e){ return aviso("Não gravou a tarefa: "+String(e.message||e).slice(0,80)); }
  const c = D.cliPorId.get(k.cliente_id);
  if(alvo!==eu.id) api(`/rest/v1/mencoes`,{method:"POST",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({de_id:eu.id, para_id:alvo, caso_id:casoId, andamento_id:and.id, texto:`📋 ${r.tarefa}: ${c?c.nome:""} até ${fmt(dia).slice(0,5)}`})}).catch(()=>{});
  aviso(`Tarefa criada para ${((D.colPorId.get(alvo)||{}).nome||"").split(" ")[0]} até ${fmt(dia).slice(0,5)}`, false);
  montarSidebar(); render(); if(clienteAberto===k.cliente_id) repintarFicha();
}
// Modelos de etapas: a tarefa nasce com os passos de um modelo do escritório (catálogo nas Configurações)
const MODELOS_ETAPAS_PADRAO = [
  {nome:"Réplica", etapas:["Ler a contestação","Conferir o laudo pericial","Redigir a réplica","Revisar","Protocolar"]},
  {nome:"Recurso ao CRPS", etapas:["Ler a decisão do INSS","Conferir o processo administrativo","Redigir o recurso","Revisar","Protocolar no e-Recursos"]},
  {nome:"Perícia", etapas:["Orientar o cliente","Conferir os documentos médicos","Confirmar o comparecimento","Conferir o resultado"]},
];
const modelosEtapas = () => lerJsonCfg("modelos_etapas", MODELOS_ETAPAS_PADRAO).filter(m=>m && m.nome && Array.isArray(m.etapas) && m.etapas.length);
function modeloEtapas(id){
  const ms = modelosEtapas();
  caixa(`<h3>Modelo de etapas</h3><p class="meio-sub">As etapas do modelo entram depois das que a tarefa já tem.</p>
    <div style="display:grid;gap:8px">${ms.map((m,i)=>`<button class="btn-mini" style="text-align:left" onclick="aplicarModeloEtapas('${id}',${i})" title="${esc(m.etapas.join("\n"))}"><b>${esc(m.nome)}</b> · ${m.etapas.length} etapas</button>`).join("")}</div>`);
}
function aplicarModeloEtapas(id, i){
  const t = tarefaAberta(id), m = modelosEtapas()[i]; if(!t || !m) return;
  const ja = new Set((t.etapas||[]).map(e=>e.t));
  const novas = m.etapas.filter(e=>!ja.has(e)).map(e=>({t:e, feito:false}));
  return gravarLembrar(id, {etapas:[...(t.etapas||[]), ...novas]}, `Modelo ${m.nome}: ${novas.length} etapas`);
}
// Seguir o caso: quem segue recebe menção de cada anotação e de cada movimento oficial (gatilho avisar_seguidores)
const sigoCaso = id => (D.seguidores||[]).some(s=>s.caso_id===id && s.colaborador_id===eu.id);
async function seguirCaso(id){
  const sigo = sigoCaso(id);
  try{
    if(sigo) await api(`/rest/v1/caso_seguidores?caso_id=eq.${id}&colaborador_id=eq.${eu.id}`,{method:"DELETE"});
    else await api(`/rest/v1/caso_seguidores`,{method:"POST",headers:{Prefer:"return=minimal,resolution=ignore-duplicates"},
      body:JSON.stringify({caso_id:id, colaborador_id:eu.id})});
  }catch(e){ return aviso(/caso_seguidores/.test(String(e.message||e)) ? "O banco ainda não tem a tabela de seguidores" : "Não gravou"); }
  D.seguidores = sigo ? (D.seguidores||[]).filter(s=>!(s.caso_id===id && s.colaborador_id===eu.id))
    : [...(D.seguidores||[]), {caso_id:id, colaborador_id:eu.id}];
  aviso(sigo ? "Você deixou de seguir o caso" : "Seguindo: cada anotação e movimento chega às suas Menções", false);
  if(clienteAberto) repintarFicha(); else render();
}
// Configurações: as regras por etapa e os modelos de etapas
function cfgRegrasModelos(){
  return `<h3 class="secao">🔁 Regras por etapa</h3><p class="meio-sub">Quando o caso entra na etapa, o CRM propõe a tarefa nas Sugeridas para hoje. Nada é criado sem clique.</p>
    <div class="cfg-cx" id="cfg-regras">${linhasCfgRegras(regrasEtapa())}</div>
    <h3 class="secao">☑ Modelos de etapas</h3><p class="meio-sub">Os passos que a tarefa recebe pelo botão Modelo, um por linha.</p>
    <div class="cfg-cx" id="cfg-modelos">${linhasCfgModelos(modelosEtapas())}</div>`;
}
function linhasCfgRegras(rs){
  const fases = FASES_QUADRO_ETAPA;
  return rs.map(r=>`<div class="cfg-linha cfg-regra" data-rid="${esc(r.id)}" style="flex-wrap:wrap;gap:6px">
      <select data-r="fase" aria-label="fase" onchange="mudouRegra(true)">${fases.map(f=>`<option value="${f}"${f===r.fase?" selected":""}>${esc(NOME_FASE[f]||f)}</option>`).join("")}</select>
      <select data-r="etapa" aria-label="etapa" onchange="mudouRegra()">${(ETAPAS_POR_FASE[r.fase]||[]).map(e=>`<option${e===r.etapa?" selected":""}>${esc(e)}</option>`).join("")}</select>
      <input data-r="tarefa" aria-label="tarefa" value="${esc(r.tarefa)}" style="flex:1;min-width:180px" onchange="mudouRegra()">
      <select data-r="quem" aria-label="para quem" onchange="mudouRegra()">${QUEM_REGRA.map(([v,t])=>`<option value="${v}"${v===r.quem?" selected":""}>${t}</option>`).join("")}</select>
      <label>em <input data-r="dias" type="number" min="0" max="60" value="${+r.dias||0}" style="width:56px" onchange="mudouRegra()"> dias úteis</label>
      <button class="btn-mini" onclick="this.closest('.cfg-regra').remove();mudouRegra()" aria-label="apagar a regra" title="apagar a regra">✕</button></div>`).join("")
    + `<button class="btn-mini" onclick="novaRegra()">Regra<span class="sr-only"> nova</span></button>`;
}
function regrasDaTela(){
  return [...document.querySelectorAll(".cfg-regra")].map(l=>{ const v = n => (l.querySelector(`[data-r="${n}"]`)||{}).value||"";
    return {id:l.dataset.rid, fase:v("fase"), etapa:v("etapa"), tarefa:v("tarefa").trim(), quem:v("quem"), dias:Math.max(0, Math.round(+v("dias"))||0)}; });
}
async function gravarRegras(rs){ try{ await guardarCfgApp("regras_etapa", JSON.stringify(rs)); aviso("Regras guardadas", false); }catch(e){ aviso("Não consegui guardar"); } }
function mudouRegra(repinta){
  const rs = regrasDaTela().map(r=>({...r, etapa:(ETAPAS_POR_FASE[r.fase]||[]).includes(r.etapa) ? r.etapa : (ETAPAS_POR_FASE[r.fase]||[])[0]||""}));
  if(repinta){ const cx = document.getElementById("cfg-regras"); if(cx) cx.innerHTML = linhasCfgRegras(rs); }
  return gravarRegras(rs.filter(r=>r.tarefa));
}
function novaRegra(){
  const rs = [...regrasDaTela(), {id:"r"+Date.now().toString(36), fase:"inss", etapa:ETAPAS_POR_FASE.inss[0], tarefa:"", quem:"responsavel", dias:2}];
  const cx = document.getElementById("cfg-regras"); if(cx) cx.innerHTML = linhasCfgRegras(rs);
}
function linhasCfgModelos(ms){
  return ms.map(m=>`<div class="cfg-linha cfg-modelo" style="flex-wrap:wrap;gap:6px;align-items:flex-start">
      <input data-m="nome" aria-label="nome do modelo" value="${esc(m.nome)}" style="width:180px" onchange="mudouModelo()">
      <textarea data-m="etapas" aria-label="etapas, uma por linha" rows="${Math.max(3, m.etapas.length)}" style="flex:1;min-width:220px" onchange="mudouModelo()">${esc(m.etapas.join("\n"))}</textarea>
      <button class="btn-mini" onclick="this.closest('.cfg-modelo').remove();mudouModelo()" aria-label="apagar o modelo" title="apagar o modelo">✕</button></div>`).join("")
    + `<button class="btn-mini" onclick="novoModeloEtapa()">Modelo<span class="sr-only"> novo</span></button>`;
}
function modelosDaTela(){
  return [...document.querySelectorAll(".cfg-modelo")].map(l=>({nome:(l.querySelector('[data-m="nome"]').value||"").trim(),
    etapas:(l.querySelector('[data-m="etapas"]').value||"").split("\n").map(x=>x.trim()).filter(Boolean)}));
}
async function mudouModelo(){
  try{ await guardarCfgApp("modelos_etapas", JSON.stringify(modelosDaTela().filter(m=>m.nome && m.etapas.length))); aviso("Modelos guardados", false); }catch(e){ aviso("Não consegui guardar"); }
}
function novoModeloEtapa(){ const cx = document.getElementById("cfg-modelos"); if(cx) cx.innerHTML = linhasCfgModelos([...modelosDaTela(), {nome:"", etapas:[]}]); }

// ── F445 · as ideias do Trello, segunda leva (aprovadas pelo Paulo em 08.11.2026) ─────────
// ▦ Tabela: os casos abertos numa planilha, com ordem pelo cabeçalho, filtro de texto e de fase, e a etapa (só do
// catálogo, F119) e o responsável trocados na própria linha, com desfazer. A etapa escrita à mão aparece, mas não se oferece
let tabTxt = "";
const TAB_LIM = 200;
const TAB_COLS = [["cliente","Cliente"],["fase","Fase"],["etapa","Etapa"],["resp","Responsável"],["prazo","Prazo"],["especie","Espécie"],["ultima","Última anotação"]];
const tabFase = () => ler("crm_tab_fase") || "";
const tabOrd = () => { const [c, d] = (ler("crm_tab_ord")||"prazo:asc").split(":"); return {c: TAB_COLS.some(x=>x[0]===c) ? c : "prazo", d: d==="desc" ? "desc" : "asc"}; };
const respTab = k => (D.atrDoCaso.get(k.id)||[]).filter(id=>D.colPorId.get(id));
function valTab(k, c){
  if(c==="cliente") return ((D.cliPorId.get(k.cliente_id)||{}).nome || k.titulo || "").toLowerCase();
  if(c==="fase") return NOME_FASE[faseEfetiva(k)] || "";
  if(c==="etapa") return k.etapa || "";
  if(c==="resp"){ const r = respTab(k)[0]; return r ? D.colPorId.get(r).nome : ""; }
  if(c==="prazo") return k.prazo || "";
  if(c==="especie") return k.especie || k.beneficio || "";
  return ultimoRegistro(k) || "";
}
function linhasTabela(){
  const f = tabFase(), t = semAcento((tabTxt||"").toLowerCase().trim()), {c, d} = tabOrd();
  const ks = ativos().filter(k=>!ehPreCaso(k) && (!f || faseEfetiva(k)===f) && (!t || semAcento([valTab(k,"cliente"), valTab(k,"etapa"), valTab(k,"especie"), valTab(k,"resp")].join(" ").toLowerCase()).includes(t)));
  // o vazio fica sempre no fim, nos dois sentidos
  return ks.sort((a,b)=>{ const x = valTab(a,c), y = valTab(b,c); if(!x !== !y) return x ? -1 : 1; const r = x<y ? -1 : x>y ? 1 : 0; return d==="desc" ? -r : r; });
}
function celEtapa(k, pode){
  const lista = etapasDaFase(k), manual = k.etapa && !lista.includes(k.etapa);
  return `<select data-tab-etapa="${k.id}" aria-label="etapa"${pode?"":" disabled"}>${manual?`<option selected disabled>${esc(k.etapa)} (à mão)</option>`:""}<option value=""${!k.etapa?" selected":""}>—</option>${
    lista.map(e=>`<option${e===k.etapa?" selected":""}>${esc(e)}</option>`).join("")}</select>`;
}
function celResp(k, pode){
  const rs = respTab(k), r = rs[0]||"";
  return `<select data-tab-resp="${k.id}" data-de="${r}" aria-label="responsável"${pode?"":" disabled"}><option value=""${!r?" selected":""}>—</option>${
    equipeAtiva().map(c=>`<option value="${c.id}"${c.id===r?" selected":""}>${esc(c.nome.split(" ")[0])}</option>`).join("")}</select>${rs.length>1?` <span class="meio-sub" title="${esc(rs.slice(1).map(id=>D.colPorId.get(id).nome).join(", "))}">+${rs.length-1}</span>`:""}`;
}
function linhaTabela(k, pode){
  const c = D.cliPorId.get(k.cliente_id), u = ultimoRegistro(k), n = u ? diasEntreIso(u, hoje()) : null, ret = k.prazo && prazoEhRetorno(k);
  return `<tr><td><button class="tab-cli" data-cli="${c?c.id:""}">${esc(c?c.nome:k.titulo||"")}</button></td><td>${esc(NOME_FASE[faseEfetiva(k)]||"")}</td>
    <td>${celEtapa(k, pode)}</td><td>${celResp(k, pode)}</td>
    <td class="${k.prazo && !ret && k.prazo<hoje()?"tab-venc":""}">${k.prazo?`${fmt(k.prazo)}${ret?` <span class="meio-sub">retorno</span>`:""}`:""}</td>
    <td>${esc(k.especie||k.beneficio||"")}</td><td>${u?`${fmt(u)} <span class="meio-sub">${n===0?"hoje":`há ${n} ${n===1?"dia":"dias"}`}</span>`:`<span class="meio-sub">mais de 30 dias</span>`}</td></tr>`;
}
function pintarTabela(){
  const cx = document.getElementById("tab-casos"); if(!cx) return;
  const ls = linhasTabela(), pode = podeGravarCaso(), {c, d} = tabOrd();
  cx.innerHTML = `<p class="meio-sub" id="tab-n">${ls.length>TAB_LIM ? `Mostrando ${TAB_LIM} de ${ls.length} casos: use o filtro.` : `${ls.length} ${ls.length===1?"caso":"casos"}`}</p>
    <div class="tab-rola"><table class="tab tab-casos"><thead><tr>${TAB_COLS.map(([k,r])=>`<th aria-sort="${k===c?(d==="asc"?"ascending":"descending"):"none"}"><button data-tab-ord="${k}" title="ordenar por ${r.toLowerCase()}">${r}${k===c?(d==="asc"?" ▲":" ▼"):""}</button></th>`).join("")}</tr></thead>
    <tbody>${ls.slice(0, TAB_LIM).map(k=>linhaTabela(k, pode)).join("")}</tbody></table></div>`;
  cx.querySelectorAll("[data-tab-ord]").forEach(b=>b.onclick=()=>{ const o = tabOrd(), col = b.dataset.tabOrd;
    guardar("crm_tab_ord", `${col}:${o.c===col && o.d==="asc" ? "desc" : "asc"}`); pintarTabela(); });
  cx.querySelectorAll(".tab-cli[data-cli]").forEach(b=>b.onclick=()=>{ if(b.dataset.cli) abrirFicha(b.dataset.cli); });
  cx.querySelectorAll("[data-tab-etapa]").forEach(s=>s.onchange=async()=>{
    const id = s.dataset.tabEtapa, k = D.casoPorId.get(id), antes = (k&&k.etapa)||"", para = s.value;
    await gravarEtapa(id, para);
    if(k && (k.etapa||"")===para) avisoDesfazer(para ? `Etapa: ${para}` : "Etapa retirada", ()=>gravarEtapa(id, antes));
  });
  cx.querySelectorAll("[data-tab-resp]").forEach(s=>s.onchange=async()=>{
    const id = s.dataset.tabResp, de = s.dataset.de, para = s.value;
    if(de===para || !await passarCaso(id, de, para)) return pintarTabela();
    pintarTabela();
    avisoDesfazer(para ? `Caso passado para ${((D.colPorId.get(para)||{}).nome||"").split(" ")[0]}` : "Caso sem responsável",
      async()=>{ if(await passarCaso(id, para, de)) pintarTabela(); });
  });
}
// F556 · Perícias (Visões), como o protótipo aprovado em 12.11.2026 (/mnt/project-files/pericias/prototipo-tela-pericias.html):
// lista à esquerda, prévia da mensagem e Notificações à direita. O aviso ao cliente só sai depois do Ligar desta perícia,
// que aprova a data registrada; os envios, as repetições e os lembretes moram no banco (pericia_avisos_vez), às 08:30 e às 16:00
const PER_CSS = ".per5{ --bg:#F3F5F2; --surface:#FFFFFF; --surface-2:#F8FAF7; --ink:#18211C; --muted:#56635C; --faint:#65716A; --line:#DCE2DD; --line-2:#C9D1CB; --esc:#1E7A4C; --esc-ink:#FFFFFF; --esc-soft:#E2F1E7; --esc-txt:#165C39; --paulo:#2459B8; --paulo-soft:#E5EDFA; --paulo-txt:#1D4A99; --amanda:#E3B21A; --amanda-soft:#FBF1CC; --amanda-txt:#7A5900; --inss:#2459B8; --inss-soft:#E5EDFA; --inss-txt:#1D4A99; --jud:#6A3E9F; --jud-soft:#EFE8F8; --jud-txt:#57307F; --warn:#B4530A; --warn-soft:#FCEBDC; --warn-txt:#8F4108; --bad:#B42318; --bad-soft:#FBE7E5; --bad-txt:#93190F; --wa-bg:#EFE7DC; --wa-out:#D9FDD3; --wa-ink:#111B21; --wa-meta:#667781; --focus:#1E7A4C; --shadow:0 1px 2px rgba(24,33,28,.06),0 4px 16px rgba(24,33,28,.06); --ease:cubic-bezier(.23,1,.32,1); --r:10px; }\n.per5{container:per5/inline-size;background:var(--bg);color:var(--ink);font-family:\"IBM Plex Sans\",system-ui,sans-serif;font-size:14px;line-height:1.45;padding:18px 20px 32px;display:flex;flex-direction:column;gap:14px;min-height:100%}\n.per5 button,.per5 input{font:inherit;color:inherit}.per5 button{cursor:pointer;touch-action:manipulation}\n.per5 :focus-visible{outline:2px solid var(--focus);outline-offset:2px;border-radius:6px}\n.per5 .num{font-variant-numeric:tabular-nums}\n.per5 .num{font-size:inherit;font-weight:inherit;color:inherit}\n.per5 .mono{font-family:\"IBM Plex Mono\",ui-monospace,Menlo,monospace;font-size:12px;white-space:nowrap}\n.per5 .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}\n.per5 .top{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:10px 16px}\n.per5 .top h1{margin:0;font:600 28px/1.1 \"Zilla Slab\",Georgia,serif;letter-spacing:-.01em;display:flex;align-items:baseline;gap:10px}\n.per5 .top h1 .cnt{font:500 14px/1 \"IBM Plex Sans\",sans-serif;color:var(--muted);font-variant-numeric:tabular-nums}\n.per5 .agora{font-size:12px;color:var(--muted)}\n.per5 .agora b{color:var(--ink);font-weight:500}\n.per5 .filtros{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center}\n.per5 .chips{display:flex;flex-wrap:wrap;gap:6px}\n.per5 .chip-f{border:1px solid var(--line-2);background:var(--surface);border-radius:999px;padding:5px 12px;font-size:13px;font-weight:500;color:var(--muted);min-height:32px;display:inline-flex;gap:6px;align-items:center;transition:transform .12s var(--ease),background .15s}\n.per5 .chip-f .num{color:var(--faint);font-size:12px}\n.per5 .chip-f[aria-pressed=\"true\"]{background:var(--ink);border-color:var(--ink);color:var(--bg)}\n.per5 .chip-f[aria-pressed=\"true\"] .num{color:var(--bg);opacity:.75}\n.per5 .chip-f:active{transform:scale(.97)}\n.per5 .grade{display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:16px;align-items:start}\n.per5 .lista{display:flex;flex-direction:column;gap:8px;min-width:0}\n.per5 .linha{position:relative;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:12px 14px;display:grid;grid-template-columns:112px minmax(0,1fr) auto;gap:6px 16px;cursor:pointer;transition:border-color .15s,box-shadow .15s}\n.per5 .linha[aria-current=\"true\"]{border-color:var(--esc);box-shadow:0 0 0 1px var(--esc)}\n@media (hover:hover) and (pointer:fine){.per5 .linha:hover{border-color:var(--line-2)}}\n.per5 .quando{display:flex;flex-direction:column;gap:1px}\n.per5 .quando .dia{font-size:20px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-.01em;line-height:1.1}\n.per5 .quando .sem{font-size:12px;color:var(--muted)}\n.per5 .quando .sem b{color:var(--ink);font-weight:600;font-size:14px}\n.per5 .quando .falta{font-size:12px;color:var(--faint);font-variant-numeric:tabular-nums}\n.per5 .quando .falta.perto{color:var(--bad-txt);font-weight:500}\n.per5 .meio{min-width:0;display:flex;flex-direction:column;gap:4px}\n.per5 .l1{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px}\n.per5 .cli{font-weight:600;font-size:15px}\n.per5 .tipo{font-size:12px;color:var(--muted)}\n.per5 .l2{display:flex;flex-wrap:wrap;gap:2px 10px;font-size:12px;color:var(--muted);min-width:0}\n.per5 .l2 span{min-width:0}\n.per5 .ori{display:inline-flex;align-items:center;gap:6px}\n.per5 .fase{font-size:11px;font-weight:600;padding:1px 6px;border-radius:4px;letter-spacing:.02em}\n.per5 .fase.inss{background:var(--inss-soft);color:var(--inss-txt)}\n.per5 .fase.jud{background:var(--jud-soft);color:var(--jud-txt)}\n.per5 .estado{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:500;padding:2px 8px;border-radius:999px;border:1px solid transparent;max-width:100%}\n.per5 .estado::before{content:\"\";width:6px;height:6px;border-radius:2px;background:currentColor;flex:none}\n.per5 .e-aguardando{background:var(--surface-2);border-color:var(--line-2);color:var(--muted)}\n.per5 .e-ligado,.per5 .e-agendado{background:var(--esc-soft);color:var(--esc-txt)}\n.per5 .e-resposta,.per5 .e-telefone{background:var(--paulo-soft);color:var(--paulo-txt)}\n.per5 .e-mudou{background:var(--warn-soft);color:var(--warn-txt)}\n.per5 .e-equipe{background:var(--bad-soft);color:var(--bad-txt)}\n.per5 .l3{font-size:12px;color:var(--muted)}\n.per5 .l3 b{color:var(--ink);font-weight:500}\n.per5 .ctrl{display:flex;flex-direction:column;align-items:flex-end;gap:8px}\n.per5 .adv{display:inline-flex;border:1px solid var(--line-2);border-radius:8px;padding:2px;gap:2px;background:var(--surface)}\n.per5 .adv button{border:0;background:transparent;border-radius:6px;padding:4px 8px 4px 4px;display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:500;color:var(--muted);min-height:28px;transition:background .15s,transform .12s var(--ease)}\n.per5 .adv button:active{transform:scale(.97)}\n.per5 .ini{width:20px;height:20px;border-radius:4px;display:inline-grid;place-items:center;font-size:11px;font-weight:600;flex:none}\n.per5 .ini.p{background:var(--paulo);color:#fff}\n.per5 .ini.a{background:var(--amanda);color:#3D2D00}\n.per5 .adv button[aria-pressed=\"true\"].p{background:var(--paulo-soft);color:var(--paulo-txt)}\n.per5 .adv button[aria-pressed=\"true\"].a{background:var(--amanda-soft);color:var(--amanda-txt)}\n.per5 .adv button[aria-pressed=\"false\"] .ini{opacity:.55}\n.per5 .sw{display:inline-flex;align-items:center;gap:8px;border:0;background:transparent;padding:2px 0;font-size:12px;font-weight:600;color:var(--muted);min-height:28px}\n.per5 .sw .trk{width:36px;height:20px;border-radius:999px;background:var(--faint);position:relative;transition:background .18s var(--ease);flex:none}\n.per5 .sw .trk::after{content:\"\";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .18s var(--ease)}\n.per5 .sw[aria-checked=\"true\"]{color:var(--esc-txt)}\n.per5 .sw[aria-checked=\"true\"] .trk{background:var(--esc)}\n.per5 .sw[aria-checked=\"true\"] .trk::after{transform:translateX(16px)}\n.per5 .sw:active .trk::after{width:19px}\n.per5 .btn{border:1px solid var(--line-2);background:var(--surface);border-radius:8px;padding:6px 12px;font-size:13px;font-weight:500;min-height:32px;transition:transform .12s var(--ease),background .15s}\n.per5 .btn:active{transform:scale(.97)}\n.per5 .btn.pri{background:var(--esc);border-color:var(--esc);color:var(--esc-ink);font-weight:600}\n.per5 .btn.pequeno{padding:3px 10px;min-height:28px;font-size:12px}\n@media (hover:hover) and (pointer:fine){.per5 .btn:hover{background:var(--surface-2)}.per5 .btn.pri:hover{filter:brightness(1.06);background:var(--esc)}}\n.per5 .vazio{padding:28px 16px;text-align:center;color:var(--muted);background:var(--surface);border:1px dashed var(--line-2);border-radius:var(--r)}\n.per5 .lado{display:flex;flex-direction:column;gap:12px;position:sticky;top:12px;min-width:0}\n.per5 .card{background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow);min-width:0}\n.per5 .card-cab{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px 10px;border-bottom:1px solid var(--line)}\n.per5 .card-cab h2{margin:0;font-size:14px;font-weight:600}\n.per5 .card-cab .sub{font-size:12px;color:var(--muted)}\n.per5 .voltar{display:none}\n.per5 .prev-corpo{padding:12px 14px;display:flex;flex-direction:column;gap:12px}\n.per5 .wa{background:var(--wa-bg);border-radius:10px;padding:12px 10px;display:flex;flex-direction:column;gap:6px}\n.per5 .wa-quem{font-size:11px;color:var(--wa-meta);text-align:center}\n.per5 .bolha{align-self:flex-end;max-width:94%;background:var(--wa-out);color:var(--wa-ink);border-radius:8px 8px 2px 8px;padding:7px 9px 4px;font-size:13px;line-height:1.42;box-shadow:0 1px .5px rgba(0,0,0,.13)}\n.per5 .bolha p{margin:0 0 6px}\n.per5 .bolha .assin{font-weight:600}\n.per5 .bolha .pe{font-size:11px;color:var(--wa-meta);text-align:right;font-variant-numeric:tabular-nums}\n.per5 .horas{display:inline;font-weight:600}\n.per5 .fatos{background:none;border:0;border-radius:0;padding:0;box-shadow:none;overflow:visible;margin:0;display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 12px;font-size:12px;margin:0}\n.per5 .fatos dt{color:var(--muted)}\n.per5 .fatos dd{margin:0;font-variant-numeric:tabular-nums}\n.per5 .aviso{font-size:12px;color:var(--muted);background:var(--surface-2);border:1px solid var(--line);border-radius:8px;padding:8px 10px}\n.per5 .aviso.forte{background:var(--warn-soft);border-color:transparent;color:var(--warn-txt)}\n.per5 .acoes{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}\n.per5 .fluxo{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}\n.per5 .fluxo li{display:grid;grid-template-columns:14px minmax(0,1fr) auto;gap:2px 10px;font-size:12px;padding:3px 0;position:relative}\n.per5 .fluxo li::before{content:\"\";width:10px;height:10px;border-radius:3px;margin-top:3px;border:2px solid var(--line-2);background:var(--surface);grid-row:1}\n.per5 .fluxo li:not(:last-child)::after{content:\"\";position:absolute;left:6px;top:17px;bottom:-4px;width:2px;background:var(--line)}\n.per5 .fluxo li.feito::before{background:var(--esc);border-color:var(--esc)}\n.per5 .fluxo li.feito:not(:last-child)::after{background:var(--esc)}\n.per5 .fluxo li.agora::before{border-color:var(--esc);background:var(--esc-soft)}\n.per5 .fluxo li.agora .t{font-weight:600}\n.per5 .fluxo li.pulado .t{color:var(--faint);text-decoration:line-through}\n.per5 .fluxo .t{color:var(--ink)}\n.per5 .fluxo .d{color:var(--muted);font-variant-numeric:tabular-nums;text-align:right}\n.per5 .fluxo li.fut .t{color:var(--muted)}\n.per5 .tit-sec{margin:0;font-size:12px;font-weight:600;color:var(--muted);letter-spacing:.04em;text-transform:uppercase}\n.per5 details.notif summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px}\n.per5 details.notif summary::-webkit-details-marker{display:none}\n.per5 details.notif summary h2{margin:0;font-size:14px;font-weight:600}\n.per5 details.notif summary .seta{transition:transform .18s var(--ease);color:var(--muted)}\n.per5 details.notif[open] summary{border-bottom:1px solid var(--line)}\n.per5 details.notif[open] summary .seta{transform:rotate(180deg)}\n.per5 .notif-corpo{padding:10px 14px 14px;display:flex;flex-direction:column;gap:12px}\n.per5 .janelas{display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:12px;color:var(--muted)}\n.per5 .hora{font-variant-numeric:tabular-nums;font-weight:600;color:var(--ink);background:var(--surface-2);border:1px solid var(--line);border-radius:6px;padding:2px 8px;font-size:13px}\n.per5 .lemb{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 10px;align-items:center;padding:8px 0;border-top:1px solid var(--line)}\n.per5 .lemb:first-of-type{border-top:0}\n.per5 .lemb .nome{font-weight:500;font-size:13px}\n.per5 .lemb .quando2{grid-column:1;font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}\n.per5 .lemb .sw{grid-row:1/span 2;grid-column:2}\n.per5 .outra{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--muted)}\n.per5 .outra input{width:56px;font-size:16px;padding:2px 6px;border:1px solid var(--line-2);border-radius:6px;background:var(--surface);font-variant-numeric:tabular-nums}\n.per5 .regra{font-size:12px;color:var(--muted);margin:0}\n.per5 .ja-at{font-size:12px;color:var(--ink,inherit);background:#fff7e0;border:1px solid #e8c766;border-radius:8px;padding:6px 10px;margin-top:6px}\n.per5 .per-local{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:var(--ink)}\n.per5 .per-local .sub{font-weight:400;color:var(--muted)}\n.per5 .per-local input{font-size:16px;padding:6px 8px;border:1px solid var(--line-2);border-radius:8px;background:var(--surface);width:100%;box-sizing:border-box}\n.per5 .bolha:has(#per-txt){align-self:stretch;max-width:100%}.per5 #per-txt{display:block;width:100%;min-height:14em;box-sizing:border-box;font:inherit;font-size:16px;line-height:1.42;background:transparent;border:0;resize:vertical;color:inherit;padding:0;field-sizing:content;overflow:hidden}\n.per5 .so-lemb{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px;color:var(--muted);background:var(--surface-2);border:1px solid var(--line);border-radius:8px;padding:8px 10px}\n@container per5 (max-width:720px){.per5 .card-cab{flex-wrap:wrap}.per5 .adv-cel{display:block;margin-top:4px}.per5 .top h1{font-size:24px}.per5 .filtros{gap:8px}.per5 .chips{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin-inline:-12px;padding-inline:12px}.per5 .chips::-webkit-scrollbar{display:none}.per5 .chip-f{flex:none;min-height:36px}.per5 .grade{grid-template-columns:minmax(0,1fr)}.per5 .linha{grid-template-columns:minmax(0,1fr) auto;padding:12px}.per5 .quando{grid-column:1;flex-direction:row;flex-wrap:wrap;align-items:baseline;gap:2px 8px}.per5 .quando .dia{font-size:17px}.per5 .meio{grid-column:1/-1}.per5 .ctrl{grid-column:2;grid-row:1;align-items:flex-end}.per5 .ctrl .adv{display:none}.per5 .lado{position:static}.per5 .card.prev{position:fixed;inset:0;z-index:30;border-radius:0;border:0;overflow:auto;transform:translateX(100%);visibility:hidden;transition:transform .28s var(--ease),visibility 0s .28s;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);overscroll-behavior:contain}.per5 .card.prev.aberta{transform:none;visibility:visible;transition:transform .28s var(--ease)}.per5 .voltar{display:inline-flex}.per5 .sw,.per5 .adv button{min-height:44px}.per5 .btn{min-height:44px}}\n.per5 .per-confira{font-size:12px;font-weight:600;color:var(--bad-txt);background:var(--bad-soft);border-radius:8px;padding:6px 10px;margin-top:4px}\n.per5 .adv-cel{display:none}@container per5 (max-width:720px){.per5 .adv-cel{display:block;margin-top:4px}}\n@media (prefers-reduced-motion:reduce){.per5 *{transition-duration:.01ms!important}}";
const PER_EST = {aguardando:"Aguardando", resposta:"Aguardando resposta", agendado:"Atendimento agendado",
  telefone:"Telefone 16h oferecido", mudou:"Data mudou · aprovar de novo", equipe:"Encaminhado à equipe"};
const PER_ADV = {paulo:{nome:"Dr. Paulo", ini:"P", c:"p", o:"o Dr. Paulo", curto:"Paulo"}, amanda:{nome:"Dra. Amanda", ini:"A", c:"a", o:"a Dra. Amanda", curto:"Amanda"}};
const PER_TEXTO = "{saudacao}, {nome}. A sua {tipo} foi agendada para {dia}, {data}, às {hora}, em {local}.\n\nPara a sua preparação para a {tipo}, precisamos agendar o seu atendimento presencial com {advogado}. Podemos agendar {quando_atendimento}?";
const PER_LEMBRETE = "{saudacao}, {nome}. Lembramos que a sua {tipo} foi agendada para {dia}, {data}, às {hora}, em {local}.";
// F608: o dia proposto, como pericia_dia_atendimento no banco: o dia útil anterior à perícia, nunca hoje; o próprio dia só na falta de outro
function perDiaAtend(p){
  let d = uteisAntesPer(p.dia, 1);
  if(d <= hoje()){ d = somaDias(hoje(), 1); while(!ehDiaUtil(d) && d < p.dia) d = somaDias(d, 1); if(d > p.dia) d = p.dia; }
  return d;
}
// F608: os dois horários reais da agenda do advogado (uma vaga de manhã e outra à tarde), do dia útil anterior à perícia para trás
function perVagas(p){
  const r0 = agq.cache[p.prof], dias = r0 && (r0.dias || []);
  if(!r0){ if(!agq.carregando[p.prof]) carregarAgenda(p.prof).then(()=>{ if(visao==="periciasaviso") renderPericiasAviso(); }).catch(()=>{}); return null; }
  const vs = d => vagasDoDia(d).filter(s=>s.tipo==="002" || s.tipoFixo===false);
  const antes = dias.filter(d=>d.data > hoje() && d.data < p.dia && ehDiaUtil(d.data)).sort((x, y)=>y.data.localeCompare(x.data));
  // o dia útil mais próximo da perícia com vaga vale mais que um dia anterior com manhã e tarde
  const d1 = antes.find(d=>vs(d).length);
  if(d1){ const v = vs(d1), m = v.find(s=>hmMin(s.inicio) < 720), t = v.find(s=>hmMin(s.inicio) >= 720);
    if(m && t) return {dia:d1.data, m:m.inicio, t:t.inicio};
    return {dia:d1.data, m:v[0].inicio, t:v[1] ? v[1].inicio : null}; }
  // excepcionalmente, o dia da perícia, 3 horas antes dela
  const dp = dias.find(d=>d.data===p.dia), lim = hmMin(p.hora) - 180;
  if(dp){ const v = vs(dp).filter(s=>hmMin(s.inicio) <= lim), m = v.find(s=>hmMin(s.inicio) < 720), t = v.find(s=>hmMin(s.inicio) >= 720);
    if(m && t) return {dia:p.dia, m:m.inicio, t:t.inicio}; if(v.length) return {dia:p.dia, m:v[0].inicio, t:null}; }
  return null;
}
const perQuandoAt = p => { const v = perVagas(p), d = v ? v.dia : perDiaAtend(p);
  const dia = d===p.dia ? "no próprio dia da "+(p.social?"avaliação social":"perícia") : "na "+perDiaExt(d)+", "+fmt(d);
  return v ? dia+", às "+v.m+(v.t ? " ou às "+v.t : "") : dia+", pela manhã ou à tarde"; };
let _perAvisos = null, _perTxt = new Map(), _perSel = null, _perFiltro = "todas", _perTipo = null, _perProf = new Map(), _perLocal = new Map();
// F565 · endereços oficiais (lista de APS do gov.br e páginas da JF), para o local da perícia ter rua, número e cidade
const PER_LOCAIS = {
  araraquara:"Agência do INSS de Araraquara, Av. La Salle, 250, Araraquara",
  bebedouro:"Agência do INSS de Bebedouro, Rua Benjamin Constant, 359, Bebedouro",
  jaboticabal:"Agência do INSS de Jaboticabal, Av. Tiradentes, 1.053, Jaboticabal",
  matao:"Agência do INSS de Matão, Rua Oreste Bozzeli, 110, Matão",
  "monte alto":"Agência do INSS de Monte Alto, Rua Rui Barbosa, 664, Monte Alto",
  taquaritinga:"Agência do INSS de Taquaritinga, Rua Bernardino Sampaio, 400, Taquaritinga",
  jfcatanduva:"Justiça Federal de Catanduva, Av. Comendador Antônio Stocco, 81, Parque Joaquim Lopes, Catanduva",
  jfribeirao:"Justiça Federal de Ribeirão Preto, Rua Afonso Taranto, 455, Nova Ribeirânia, Ribeirão Preto"};
const perSemAc = t => String(t||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
function perLocalSugerido(p){
  if(_perLocal.has(p.e.id)) return _perLocal.get(p.e.id);
  const atual = String(p.e.local||"").trim();
  if(/\d/.test(atual)) return atual;   // já tem número: o escrito vale
  const cidade = t => { const x = perSemAc(t);
    if(/federal|jef|vara/.test(x)) return /ribeirao/.test(x) ? PER_LOCAIS.jfribeirao : /catanduva/.test(x) ? PER_LOCAIS.jfcatanduva : "";
    const c = Object.keys(PER_LOCAIS).find(c=>!c.startsWith("jf") && x.includes(c)); return c ? PER_LOCAIS[c] : ""; };
  if(atual && cidade(atual)) return cidade(atual);
  if(!p.jud){   // o agendamento do PAT na mesma data diz a agência
    const ag = Object.values(p.k.pat||{}).flatMap(b=>(b && b.agendamentos)||[]).find(a=>{ const m = String(a.data||"").match(/(\d\d)\/(\d\d)\/(\d{4})/); return m && m[3]+"-"+m[2]+"-"+m[1]===p.dia; });
    if(ag && cidade(ag.nomeUnidade)) return cidade(ag.nomeUnidade);
  } else {   // a subseção do número CNJ (403 = TRF3): Catanduva 6136 e 6314; Ribeirão Preto 6102 e 6302
    const n = String(numerosDoCaso(p.k).proc[0]||"").replace(/\D/g,"");
    if(n.length===20 && n.slice(13,16)==="403"){ const o = n.slice(16);
      if(o==="6136"||o==="6314") return PER_LOCAIS.jfcatanduva;
      if(o==="6102"||o==="6302") return PER_LOCAIS.jfribeirao; }
  }
  return atual;
}
function periciasDoAviso(){
  const hj = hoje();
  return (D.eventos||[]).filter(e=>["Perícia","Avaliação social"].includes(e.tipo) && e.status==="agendada" && dataSP(e.data_hora)>=hj)
    .map(e=>({e, k:D.casoPorId.get(e.caso_id)})).filter(x=>x.k && !x.k.encerrado_em)
    .sort((a,b)=>String(a.e.data_hora).localeCompare(String(b.e.data_hora)));
}
function uteisAntesPer(d, n){ let x = d, k = 0; while(k < n){ x = somaDias(x, -1); if(ehDiaUtil(x)) k++; } return x; }
const perDm = iso => fmt(iso).slice(0,5);
const perSem = iso => SIGLA_DIA[new Date(iso+"T12:00:00").getDay()];
const perDiaExt = iso => DIA_EXT[new Date(iso+"T12:00:00").getDay()];
// o próximo horário de envio: 08:30 ou 16:00 de um dia útil
function perProximoEnvio(){
  const hj = hoje(), h = horaSP(new Date().toISOString());
  if(ehDiaUtil(hj) && h < "08:30") return {dia:hj, hora:"08:30"};
  if(ehDiaUtil(hj) && h < "16:00") return {dia:hj, hora:"16:00"};
  let d = somaDias(hj, 1); while(!ehDiaUtil(d)) d = somaDias(d, 1);
  return {dia:d, hora:"08:30"};
}
const perEnvioTxt = p => (p.dia===hoje() ? "hoje" : perDm(p.dia)+" ("+perSem(p.dia)+")")+", "+p.hora;
function perDados({e, k}){
  const a = _perAvisos.get(e.id), cli = D.cliPorId.get(k.cliente_id), dia = dataSP(e.data_hora);
  const mudou = !!(a && ((a.ligado && a.data_aprovada && new Date(a.data_aprovada).getTime()!==new Date(e.data_hora).getTime()) || a.estado==="data_mudou"));
  const ligado = !!(a && a.ligado && !mudou);
  const est = mudou ? "mudou" : !ligado ? "aguardando" : ({aguardando:"resposta", conversa:"resposta", agendado:"agendado", sem_resposta:"equipe", sem_telefone:"equipe"})[a.estado] || "ligado";
  const nums = numerosDoCaso(k), fx = faseEfetiva(k), jud = !["inss","conselho"].includes(fx);
  const num = jud ? (nums.proc[0] ? fmtProc(nums.proc[0]) : "") : (nums.nb[0] ? fmtNb(nums.nb[0]) : (nums.prot[0]||""));
  // F624 · 00:00 é "hora não informada"; outro evento do caso no mesmo dia pede conferir a hora
  const hora = horaSP(e.data_hora), semHora = hora==="00:00";
  const dup = (D.eventos||[]).filter(o=>o.id!==e.id && o.caso_id===e.caso_id && o.tipo===e.tipo && o.status!=="cancelada" && dataSP(o.data_hora)===dia).map(o=>horaSP(o.data_hora));
  return {e, k, a, cli, dia, hora: semHora ? "Hora não informada" : hora, semHora, dup, mudou, ligado, est, jud, num,
    nome: cli ? cli.nome : tituloCaso(k), social: e.tipo==="Avaliação social",
    prof: _perProf.get(e.id) || (a && a.profissional) || "paulo", so: !!(a && a.so_lembretes)};
}
function perDetalhe(p){
  const adv = PER_ADV[p.prof], a = p.a || {};
  switch(p.est){
    case "aguardando": return "Designada em "+(p.e.created_at ? perDm(dataSP(p.e.created_at)) : "data não registrada")+"."+(p.so?" Cliente já orientado: apenas os lembretes.":"")+" Ligue para ver a prévia e aprovar a data.";
    case "ligado": return p.so ? "Data aprovada. Cliente já orientado: <b>apenas os lembretes</b>." : "Data aprovada. Propõe <b>atendimento presencial com "+adv.o+" "+perQuandoAt(p)+"</b>.";
    case "resposta": return a.estado==="conversa" ? "Cliente respondeu; a conversa segue com a IA."
      : a.repetido_em ? "Reiteração enviada em "+perDm(dataSP(a.repetido_em))+"."
      : "Sem resposta sobre o atendimento. <b>Reiteração "+perDm(perProxUtil(dataSP(a.primeiro_em)||hoje()))+" às 08:30.</b>";
    case "agendado": { const at = a.atendimento_em ? dataSP(a.atendimento_em) : ""; return at
      ? "<b>Presencial com "+adv.o+" em "+perDm(at)+" às "+esc(horaSP(a.atendimento_em))+".</b> Tarefa “Preparar o estudo sobre a perícia” para o Dr. Paulo em "+perDm(uteisAntesPer(at,1))+"."
      : "<b>Atendimento presencial agendado com "+adv.o+".</b>"; }
    case "mudou": return a.data_aprovada ? "Era "+perDm(dataSP(a.data_aprovada))+", agora "+perDm(p.dia)+". O aviso parou até a nova aprovação." : "A data mudou. O aviso parou até a nova aprovação.";
    case "equipe": return a.estado==="sem_telefone" ? "Ficha sem telefone com WhatsApp. <b>Menção à recepção.</b>" : "Sem resposta à reiteração. <b>Menção à recepção para telefonar.</b>";
  }
  return "";
}
// F562 · o atendimento presencial futuro do cliente (agendamentosFuturos e a agenda carregada, F554)
const perAtend = (p, modo) => p.cli ? htmlAtend(atendimentosDe({id:p.cli.id, nome:p.cli.nome}), modo) : "";
function perProxUtil(d){ let x = somaDias(d, 1); while(!ehDiaUtil(x)) x = somaDias(x, 1); return x; }
function perAdvSel(p, extra){
  return `<span class="adv${extra||""}" role="group" aria-label="Advogado do atendimento">`+["paulo","amanda"].map(k=>{
    const v = PER_ADV[k];
    return `<button type="button" class="${v.c}" data-adv="${k}" data-id="${p.e.id}" aria-pressed="${p.prof===k}" title="Atendimento com ${v.nome}" aria-label="Atendimento com ${v.nome}"${souAdmin()?"":" disabled"}><span class="ini ${v.c}" aria-hidden="true">${v.ini}</span>${v.curto}</button>`;
  }).join("")+`</span>`;
}
function perSw(on, attrs, label, tit){
  return `<button type="button" class="sw" role="switch" aria-checked="${on}" ${attrs} aria-label="${esc(label)}" title="${tit || (on?"Desligar os avisos":"Ligar: abre a prévia antes")}"${souAdmin()?"":" disabled"}><span class="trk"></span><span class="txt">${on?"Ligado":"Desligado"}</span></button>`;
}
function perVisivel(p){
  if(_perTipo && (p.social ? "social" : "medica")!==_perTipo) return false;
  if(_perFiltro==="aguardando") return p.est==="aguardando";
  if(_perFiltro==="ligadas") return p.ligado;
  if(_perFiltro==="mudou") return p.mudou;
  return true;
}
function perLinha(p){
  const f = Math.max(0, uteisEntre(hoje(), p.dia)), est = p.est==="ligado" ? (p.so ? "Ligado · apenas lembretes" : "Ligado · aviso sai às "+perProximoEnvio().hora) : PER_EST[p.est];
  return `<article class="linha" data-id="${p.e.id}" aria-current="${_perSel===p.e.id}">
    <div class="quando"><span class="dia">${perDm(p.dia)}</span><span class="sem"><b class="num">${esc(p.hora)}</b> · ${perDiaExt(p.dia)}</span><span class="falta${f<=5?" perto":""}">${f===0?"hoje":"faltam "+f+" dia"+(f>1?"s úteis":" útil")}</span></div>
    <div class="meio"><div class="l1"><span class="cli" data-cli="${esc(p.k.cliente_id||"")}">${esc(p.nome)}</span><span class="tipo">${p.social?"Avaliação social":"Perícia médica"}</span><span class="estado e-${p.est}">${esc(est)}</span></div>
      <div class="l2"><span class="ori"><span class="fase ${p.jud?"jud":"inss"}">${p.jud?"Judicial":"INSS"}</span>${p.num?`<span class="mono">${esc(p.num)}</span>`:""}</span><span>${esc(perLocalSugerido(p)||"endereço a informar")}</span></div>
      <div class="l3">${perDetalhe(p)}</div>${perConfira(p)}${perAtend(p, "per")}<div class="adv-cel">${perAdvSel(p)}</div></div>
    <div class="ctrl">${perSw(p.ligado, `data-sw="${p.e.id}"`, "Avisos da perícia de "+p.nome)}${perAdvSel(p)}
      <button type="button" class="btn pequeno" data-prev="${p.e.id}" title="Ver a prévia da mensagem de ${esc(p.nome)}">Prévia</button></div>
  </article>`;
}
function perConfira(p){
  return (p.semHora ? `<div class="per-confira" role="alert">Hora não informada: corrija a hora no evento antes de ligar.</div>` : "")
    + (p.dup.length ? `<div class="per-confira" role="alert">Há outro evento deste caso no mesmo dia (${esc(p.dup.join(", "))}): confira a hora.</div>` : "");
}
function perLembretes(){
  const out = +(cfgApp("pericia_aviso_outra") ?? "0") || 0;
  return {d7:(cfgApp("pericia_aviso_d7") ?? "sim")==="sim", d1:(cfgApp("pericia_aviso_d1") ?? "sim")==="sim", out:out>0, n:out>0 ? out : 3};
}
// F608: o texto pronto da prévia, com os horários reais; o editado ou o já aprovado vale mais
function perTextoPronto(p){
  const env = perProximoEnvio(), adv = PER_ADV[p.prof];
  let t = (p.so ? PER_LEMBRETE : (cfgApp("pericia_aviso_texto") || PER_TEXTO))
    .replace(/\{saudacao\}/g, env.hora==="08:30" ? "Bom dia" : "Boa tarde")
    .replace(/\{nome\}/g, String(p.nome).split(" ")[0])
    .replace(/\{tipo\}/g, p.social ? "avaliação social" : "perícia médica")
    .replace(/\{dia\}/g, perDiaExt(p.dia)).replace(/\{data\}/g, fmt(p.dia)).replace(/\{hora\}/g, p.hora)
    .replace(/\{local\}/g, perLocalSugerido(p) || "[endereço da perícia]")
    .replace(/\{advogado\}/g, adv.o).replace(/\{quando_atendimento\}/g, perQuandoAt(p));
  return t;
}
const perTextoDe = p => p.ligado && p.a && p.a.texto ? p.a.texto : (_perTxt.get(p.e.id) ?? perTextoPronto(p));
function perMensagem(p){
  const env = perProximoEnvio();
  return perTextoDe(p).split(/\n\s*\n/).map(s=>`<p>${esc(s).replace(/\n/g,"<br>")}</p>`).join("")+`<div class="pe">${env.hora} ✓</div>`;
}
function perPrevia(p){
  if(!p) return "";
  const L = perLembretes(), d7 = uteisAntesPer(p.dia,7), d1 = uteisAntesPer(p.dia,1), outra = uteisAntesPer(p.dia,L.n);
  const telOk = new Date(d1+"T12:00:00").getDay()!==3, a = p.a || {}, env = perProximoEnvio(), adv = PER_ADV[p.prof];
  const enviado = !!a.primeiro_em, at = a.atendimento_em ? dataSP(a.atendimento_em) : "";
  const tipoRot = p.social ? "Avaliação social" : "Perícia médica";
  const passos = [
    ["Designada", p.e.created_at ? perDm(dataSP(p.e.created_at)) : "", "feito"],
    ["Ligada", p.ligado ? "aprovada" : (p.mudou ? "aprovação caiu" : "falta aprovar"), p.ligado ? "feito" : "agora"],
    ...(p.so && !enviado ? [["Primeiro aviso", "dispensado: já orientado", "feito"]] : [
    ["Aviso enviado", enviado ? perDm(dataSP(a.primeiro_em))+" "+horaSP(a.primeiro_em) : (p.ligado ? perEnvioTxt(env) : ""), enviado ? "feito" : (p.ligado ? "agora" : "fut")],
    ["Reiteração", a.repetido_em ? perDm(dataSP(a.repetido_em)) : "", a.repetido_em ? "feito" : (p.est==="resposta" ? "agora" : "fut")],
    ["Atendimento agendado", at ? perDm(at)+" "+horaSP(a.atendimento_em) : "", at ? "feito" : (p.est==="equipe" ? "agora" : "fut")],
    ["Tarefa do estudo", at ? perDm(uteisAntesPer(at,1)) : "", p.est==="agendado" ? "feito" : "fut"]]),
    ["Lembretes", [L.d7?perDm(d7):null, L.d1?perDm(d1):null, L.out?perDm(outra):null].filter(Boolean).join(" · ")||"nenhum", "fut"],
    [tipoRot, perDm(p.dia)+" "+p.hora, "fut"],
  ];
  const aprov = p.ligado
    ? `<div class="aviso">Data aprovada. Se o ${p.jud?"processo":"INSS"} mudar a data, a aprovação cai e a linha mostra <b>Data mudou</b>.</div>`
    : (p.mudou ? `<div class="aviso forte">A data mudou${a.data_aprovada ? " de "+perDm(dataSP(a.data_aprovada)) : ""} para ${perDm(p.dia)}. Confira a mensagem e ligue de novo para aprovar a nova data.</div>`
      : `<div class="aviso">Ao ligar, você aprova a data de <b class="num">${fmt(p.dia)} às ${esc(p.hora)}</b>. ${p.so ? "Saem apenas os lembretes, às 08:30 de cada dia marcado." : `A primeira mensagem sai às <b>${env.hora}</b> ${env.dia===hoje()?"de hoje":"de "+perDm(env.dia)}.`}</div>`);
  return `<div class="card-cab"><button type="button" class="btn pequeno voltar" id="per-voltar" aria-label="Voltar às perícias">‹ Perícias</button><div><h2 id="prev-tit">Prévia · ${esc(p.nome)}</h2><div class="sub">${p.so?"Lembrete pelo WhatsApp":"Primeira mensagem pelo WhatsApp"}</div></div>${perAdvSel(p," adv-prev")}</div>
    <div class="prev-corpo">
      <label class="per-local">Endereço da ${p.social?"avaliação":"perícia"} <span class="sub">(rua, número e cidade)</span>
        <input id="per-local" list="per-locais" value="${esc(perLocalSugerido(p))}" placeholder="Ex.: Agência do INSS de Monte Alto, Rua Rui Barbosa, 664, Monte Alto"${souAdmin()&&!p.ligado?"":" disabled"}></label>
      <datalist id="per-locais">${Object.values(PER_LOCAIS).map(v=>`<option value="${esc(v)}">`).join("")}</datalist>
      <div class="wa" aria-label="Mensagem que será enviada"><div class="wa-quem">Escritório Paulo Tercini · WhatsApp</div><div class="bolha">${souAdmin()&&!p.ligado ? `<textarea id="per-txt" rows="12" aria-label="Texto da mensagem, editável antes do Ligar">${esc(perTextoDe(p))}</textarea><div class="pe">${perProximoEnvio().hora} ✓</div>` : perMensagem(p)}</div></div>${souAdmin()&&!p.ligado&&_perTxt.has(p.e.id) ? `<button type="button" class="btn-mini" id="per-txt-volta" title="Voltar ao texto pronto">Restaurar</button>` : ""}
      ${perAtend(p, "perprev")}
      <div class="so-lemb"><span><b>Já orientado</b>: enviar apenas os lembretes, sem o primeiro aviso.</span>${perSw(p.so, 'id="sw-so"', "Cliente já orientado: apenas os lembretes", p.so?"Voltar a enviar o primeiro aviso":"Enviar apenas os lembretes")}</div>
      <dl class="fatos">${p.so ? "" : `<dt>Atendimento</dt><dd>presencial, tipo 002, ${adv.nome}</dd>
        <dt>Dia proposto</dt><dd>${(v=>v ? esc(perDm(v.dia)+" ("+perSem(v.dia)+"), às "+v.m+(v.t?" ou às "+v.t:"")+", vagas do Google Agenda") : esc(perDm(perDiaAtend(p))+" ("+perSem(perDiaAtend(p))+")")+"; sem vaga lida da agenda, o texto não traz horário")(p.so?null:perVagas(p))}; o dia útil mais próximo antes da perícia que tem vaga</dd>`}
        <dt>Lembretes</dt><dd>${L.d7?"7 dias úteis: "+perDm(d7)+" ("+perSem(d7)+")":"7 dias úteis desligado"}<br>${L.d1?"1 dia útil: "+perDm(d1)+" ("+perSem(d1)+")":"1 dia útil desligado"}${L.out?"<br>"+L.n+" dias úteis: "+perDm(outra)+" ("+perSem(outra)+")":""}</dd>
        ${p.so ? "" : `<dt>Se não puder vir</dt><dd>${telOk?"telefone em "+perDm(d1)+" ("+perSem(d1)+") às 16h":"telefone indisponível: véspera útil é quarta-feira"}; persistindo, vai à equipe</dd>`}</dl>
      ${aprov}${perConfira(p)}
      ${p.ligado ? "" : `<div class="acoes"><button type="button" class="btn" id="per-cancelar" title="Fechar a prévia sem ligar">Cancelar</button><button type="button" class="btn pri" id="per-ligar" title="Ligar e aprovar a data desta perícia"${souAdmin()?"":" disabled"}>Ligar</button></div>`}
      <h3 class="tit-sec">Caminho desta perícia</h3><ol class="fluxo">${passos.map(s=>`<li class="${s[2]}"><span class="t">${esc(s[0])}</span><span class="d">${esc(s[1])}</span></li>`).join("")}</ol>
    </div>`;
}
function perNotif(p){
  const L = perLembretes(), w = d => perDm(d)+" ("+perSem(d)+")", pre = p ? (p.social?"Avaliação":"Perícia")+" de "+perDm(p.dia)+": " : "";
  return `<summary><h2>Notificações</h2><span class="seta" aria-hidden="true">&#9662;</span></summary>
    <div class="notif-corpo">
      <div class="janelas" aria-label="Horários de envio">Envio só em dois horários: <span class="hora">08:30</span><span class="hora">16:00</span></div>
      <p class="regra">Sem resposta sobre o atendimento, a mensagem é reiterada no dia útil seguinte, no primeiro horário.</p>
      <div><h3 class="tit-sec" style="margin-bottom:4px">Lembretes ao cliente</h3>
        <div class="lemb"><span class="nome">7 dias úteis antes</span><span class="quando2" id="q-d7">${p?pre+w(uteisAntesPer(p.dia,7)):""}</span>${perSw(L.d7,'id="sw-d7"',"Lembrete 7 dias úteis antes", L.d7?"Desligar o lembrete":"Ligar o lembrete")}</div>
        <div class="lemb"><span class="nome">1 dia útil antes</span><span class="quando2" id="q-d1">${p?pre+w(uteisAntesPer(p.dia,1)):""}</span>${perSw(L.d1,'id="sw-d1"',"Lembrete 1 dia útil antes", L.d1?"Desligar o lembrete":"Ligar o lembrete")}</div>
        <div class="lemb"><span class="nome outra"><label for="n-outra">Outra data:</label><input id="n-outra" type="number" inputmode="numeric" min="2" max="30" value="${L.n}"${souAdmin()?"":" disabled"}> dias úteis antes</span><span class="quando2" id="q-out">${p?pre+w(uteisAntesPer(p.dia,L.n)):""}</span>${perSw(L.out,'id="sw-out"',"Lembrete em outra data", L.out?"Desligar o lembrete":"Ligar o lembrete")}</div>
      </div>
      <p class="regra">Valem só para as perícias ligadas. Contam dias úteis: sem sábado, domingo e feriado nacional.</p>
      <p class="regra">Na conversa já assumida por alguém da equipe, a resposta da IA aparece como sugestão acima do campo de escrever e não é enviada.</p>
    </div>`;
}
// F626 · antes de ligar, o administrador confere o dia e o horário no documento da perícia:
// digita o horário (tem de bater com o do evento) e marca a caixa do dia. O banco recusa sem isso.
function perConfirmarHora(p, loc){
  return new Promise(res=>{
    const d = document.createElement("dialog"); d.className = "confirmar per-conf";
    const sem = new Date(p.dia+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"long"});
    d.innerHTML = `<form method="dialog"><p class="confirmar-txt">Confira no documento da ${p.social?"avaliação social":"perícia"} antes de ligar.</p>
      <div style="font-size:18px;line-height:1.5;margin:0 0 12px"><b>${esc(sem)}, <span class="num">${fmt(p.dia)}</span>, às <span class="num">${esc(p.hora)}</span></b><br><span style="font-size:14px">${esc(loc)}</span></div>
      <label style="display:block;margin:0 0 8px">Digite o horário do documento (hh:mm) <input id="pc-hora" inputmode="numeric" maxlength="5" placeholder="hh:mm" autocomplete="off" style="width:80px"></label>
      <label style="display:flex;gap:8px;align-items:center;margin:0 0 14px"><input type="checkbox" id="pc-dia"> Conferi o dia ${fmt(p.dia)} no documento da perícia</label>
      <div class="confirmar-bts"><button value="nao" class="btn-rap">Voltar</button><button value="sim" id="pc-ligar" class="btn-rap forte" disabled>Ligar</button></div></form>`;
    const h = d.querySelector("#pc-hora"), c = d.querySelector("#pc-dia"), b = d.querySelector("#pc-ligar");
    const ver = () => { const v = h.value.trim().replace(/^(\d)(?=:)/, "0$1").replace(/[h.]/i, ":"); b.disabled = !(v===p.hora && c.checked); };
    h.addEventListener("input", ver); c.addEventListener("change", ver);
    d.addEventListener("close", ()=>{ res(d.returnValue==="sim" && !b.disabled); d.remove(); });
    document.body.appendChild(d); d.showModal(); h.focus();
  });
}
async function perLigar(evId, ligar, prof, quando){
  try{
    await api(`/rest/v1/rpc/pericia_ligar`,{method:"POST", body:JSON.stringify({p_evento:evId, p_ligado:ligar, p_profissional:prof, ...(ligar ? {p_confirmado:quando} : {})})});
    return true;
  }catch(err){ aviso("Não foi possível: "+(err && err.message || err)); return false; }
}
async function perRecarregar(){ _perAvisos = null; await renderPericiasAviso(); }
async function renderPericiasAviso(){
  tituloLista("🩺 Perícias");
  if(!document.getElementById("per5-css")){ const st = document.createElement("style"); st.id = "per5-css"; st.textContent = PER_CSS; document.head.appendChild(st); }
  const meio = document.getElementById("conteudo-meio");
  if(!_perAvisos){
    meio.innerHTML = `<p class="meio-sub">Carregando…</p>`;
    try{ _perAvisos = new Map((await api(`/rest/v1/pericia_avisos?select=*`)).map(a=>[a.evento_id, a])); }
    catch(_){ _perAvisos = new Map(); }
    if(visao!=="periciasaviso") return;
  }
  const todas = periciasDoAviso().map(perDados), vs = todas.filter(perVisivel);
  if(!todas.some(p=>p.e.id===_perSel)) _perSel = todas[0] ? todas[0].e.id : null;
  const sel = todas.find(p=>p.e.id===_perSel), aberta = !!meio.querySelector("#prev.aberta");
  const c = {todas:todas.length, aguardando:todas.filter(p=>p.est==="aguardando").length, ligadas:todas.filter(p=>p.ligado).length,
    mudou:todas.filter(p=>p.mudou).length, medica:todas.filter(p=>!p.social).length, social:todas.filter(p=>p.social).length};
  document.getElementById("sub-lista").innerHTML = `<span class="meio-sub">${vs.length===todas.length ? todas.length+" marcada"+(todas.length===1?"":"s") : vs.length+" de "+todas.length}</span>`;
  const chip = (attr, v, rot, on) => `<button type="button" class="chip-f" ${attr}="${v}" aria-pressed="${on}">${rot} <span class="num">${c[v==="todas"?"todas":v]}</span></button>`;
  const notifAberta = meio.querySelector("#notif") ? meio.querySelector("#notif").open : null;
  meio.innerHTML = `<div class="per5">
    <div class="agora">Avisos saem às <b>08:30</b> e às <b>16:00</b>. Próximo envio: <b class="num">${perEnvioTxt(perProximoEnvio())}</b></div>
    <div class="filtros">
      <div class="chips" role="group" aria-label="Filtrar por situação">${chip("data-f","todas","Todas",_perFiltro==="todas")}${chip("data-f","aguardando","Aguardando",_perFiltro==="aguardando")}${chip("data-f","ligadas","Ligadas",_perFiltro==="ligadas")}${chip("data-f","mudou","Data mudou",_perFiltro==="mudou")}</div>
      <div class="chips" role="group" aria-label="Filtrar por tipo">${chip("data-t","medica","Perícia médica",_perTipo==="medica")}${chip("data-t","social","Avaliação social",_perTipo==="social")}</div>
    </div>
    <div class="grade">
      <section class="lista" id="lista" aria-label="Perícias, da mais próxima à mais distante">${vs.length ? vs.map(perLinha).join("") : todas.length ? `<div class="vazio">Nenhuma perícia nesta situação. Escolha <b>Todas</b> para ver a lista inteira.</div>` : `<div class="vazio">Nenhuma perícia ou avaliação social agendada.</div>`}</section>
      <aside class="lado">
        <section class="card prev${aberta?" aberta":""}" id="prev" aria-labelledby="prev-tit" tabindex="-1">${perPrevia(sel)}</section>
        <details class="card notif" id="notif">${perNotif(sel)}</details>
      </aside>
    </div></div>`;
  const P = meio.querySelector("#prev"), raiz = meio.querySelector(".per5");
  meio.querySelector("#notif").open = notifAberta ?? raiz.clientWidth > 720;
  const abrir = id => { _perSel = id; renderPericiasAviso().then(()=>{ const q = document.getElementById("prev"); if(!q) return; q.classList.add("aberta"); if(document.querySelector(".per5").clientWidth <= 720) q.focus(); }); };
  const fechar = () => P.classList.remove("aberta");
  if(!renderPericiasAviso._esc){ renderPericiasAviso._esc = true; document.addEventListener("keydown", ev=>{ if(ev.key==="Escape" && visao==="periciasaviso"){ const q = document.getElementById("prev"); if(q) q.classList.remove("aberta"); } }); }
  raiz.oninput = ev=>{   // F565 · o endereço digitado aparece na prévia na hora
    if(!sel) return;
    if(ev.target.id==="per-txt"){ _perTxt.set(sel.e.id, ev.target.value); if(!meio.querySelector("#per-txt-volta")) ev.target.insertAdjacentHTML("afterend", '<button type="button" class="btn-mini" id="per-txt-volta" title="Voltar ao texto pronto">Restaurar</button>'); return; }   // F608 · o texto editado vale até o Ligar
    if(ev.target.id!=="per-local") return;
    _perLocal.set(sel.e.id, ev.target.value);
    const ta = meio.querySelector("#per-txt");
    if(ta){ if(!_perTxt.has(sel.e.id)) ta.value = perTextoPronto(sel); return; }
    const b = meio.querySelector("#prev .bolha"); if(b) b.innerHTML = perMensagem(sel);
  };
  raiz.onclick = async ev=>{
    const t = ev.target, adm = souAdmin();
    const cli = t.closest(".cli[data-cli]"); if(cli && cli.dataset.cli){ abrirFicha(cli.dataset.cli); return; }
    const advB = t.closest("[data-adv]");
    if(advB){ if(!adm) return; const p = todas.find(x=>x.e.id===advB.dataset.id); if(!p) return;
      const prof = advB.dataset.adv; _perSel = p.e.id;
      if(p.ligado){ if(!await perLigar(p.e.id, true, prof, p.e.data_hora)) return; _perProf.delete(p.e.id); await perRecarregar(); }
      else { _perProf.set(p.e.id, prof); await renderPericiasAviso(); }
      aviso("Atendimento oferecido com "+PER_ADV[prof].nome+"."); return; }
    const s = t.closest("[data-sw]");
    if(s){ const p = todas.find(x=>x.e.id===s.dataset.sw); if(!p || !adm) return;
      if(p.ligado){ if(!await perLigar(p.e.id, false, p.prof)) return; await perRecarregar();
        avisoDesfazer("Avisos de "+p.nome+" desligados.", async()=>{ if(await perLigar(p.e.id, true, p.prof, p.e.data_hora)) await perRecarregar(); }); }
      else abrir(p.e.id);
      return; }
    const pv = t.closest("[data-prev]"); if(pv){ abrir(pv.dataset.prev); return; }
    if(t.closest("#per-ligar")){ const p = sel; if(!p || !adm) return;
      if(p.semHora){ aviso("Hora da perícia não informada: corrija a hora no evento antes de ligar."); return; }
      if(p.dup.length){ aviso("Há outro evento deste caso no mesmo dia ("+p.dup.join(", ")+"): confira a hora e cancele o errado antes de ligar."); return; }
      const inp = meio.querySelector("#per-local"), loc = String(inp ? inp.value : perLocalSugerido(p)).trim();
      if(!/\d/.test(loc) || loc.length < 10){ aviso("Informe o endereço da perícia, com rua, número e cidade, antes de ligar."); if(inp) inp.focus(); return; }
      if(!await perConfirmarHora(p, loc)) return;
      try{
        if(loc!==String(p.e.local||"").trim()){ await api(`/rest/v1/rpc/pericia_local`,{method:"POST", body:JSON.stringify({p_evento:p.e.id, p_local:loc})}); p.e.local = loc; }
        // o cliente com atendimento presencial já agendado recebe apenas os lembretes
        const at = p.cli ? atendimentosDe({id:p.cli.id, nome:p.cli.nome}) : null;
        if(!p.so && at && at.fut && at.fut.length){ await api(`/rest/v1/rpc/pericia_so_lembretes`,{method:"POST", body:JSON.stringify({p_evento:p.e.id, p_so:true})}); p.so = true; }
        // F608 · a mensagem pronta (ou a editada) é a que o banco envia
        if(!p.so){ const ta = meio.querySelector("#per-txt"), txt = String(ta ? ta.value : perTextoDe(p)).trim();
          if(txt) await api(`/rest/v1/rpc/pericia_texto_salvar`,{method:"POST", body:JSON.stringify({p_evento:p.e.id, p_texto:txt})}); }
      }catch(err){ aviso("Não foi possível: "+(err && err.message || err)); return; }
      _perLocal.delete(p.e.id); _perTxt.delete(p.e.id);
      if(!await perLigar(p.e.id, true, p.prof, p.e.data_hora)) return; _perProf.delete(p.e.id); await perRecarregar();
      const q = document.getElementById("prev"); if(q) q.classList.remove("aberta");
      avisoDesfazer("Ligado. Data de "+perDm(p.dia)+" aprovada; "+(p.so ? "saem apenas os lembretes." : "o aviso sai às "+perProximoEnvio().hora+"."), async()=>{ if(await perLigar(p.e.id, false, p.prof)) await perRecarregar(); });
      return; }
    if(t.closest("#sw-so")){ const p = sel; if(!p || !adm) return;
      try{ await api(`/rest/v1/rpc/pericia_so_lembretes`,{method:"POST", body:JSON.stringify({p_evento:p.e.id, p_so:!p.so})}); }
      catch(err){ aviso("Não foi possível: "+(err && err.message || err)); return; }
      await perRecarregar(); const q = document.getElementById("prev"); if(q) q.classList.add("aberta");
      aviso(p.so ? "Volta a sair o primeiro aviso." : "Apenas os lembretes para "+p.nome+"."); return; }
    if(t.closest("#per-txt-volta")){ if(!sel) return; _perTxt.delete(sel.e.id); abrir(sel.e.id); return; }
    if(t.closest("#per-cancelar,#per-voltar")){ fechar(); return; }
    const fb = t.closest("[data-f]"); if(fb){ _perFiltro = fb.dataset.f; renderPericiasAviso(); return; }
    const tb = t.closest("[data-t]"); if(tb){ _perTipo = _perTipo===tb.dataset.t ? null : tb.dataset.t; renderPericiasAviso(); return; }
    const ls = t.closest("#sw-d7,#sw-d1,#sw-out");
    if(ls){ if(!adm) return; const L = perLembretes(), k = ls.id.slice(3);
      try{
        if(k==="out") await guardarCfgApp("pericia_aviso_outra", L.out ? "0" : String(Math.min(30, Math.max(2, +meio.querySelector("#n-outra").value||3))));
        else await guardarCfgApp("pericia_aviso_"+k, L[k] ? "nao" : "sim");
      }catch(err){ aviso("Não foi possível salvar: "+(err && err.message || err)); }
      renderPericiasAviso(); return; }
    const ln = t.closest(".linha"); if(ln && !t.closest("button")){ abrir(ln.dataset.id); return; }
  };
  const no = meio.querySelector("#n-outra");
  if(no) no.onchange = async ()=>{ const v = parseInt(no.value,10); if(!(v>=2 && v<=30) || !perLembretes().out) return renderPericiasAviso();
    try{ await guardarCfgApp("pericia_aviso_outra", String(v)); }catch(err){ aviso("Não foi possível salvar: "+(err && err.message || err)); }
    renderPericiasAviso(); };
}
function renderTabela(){
  tituloLista("▦ Tabela");
  const f = tabFase();
  document.getElementById("sub-lista").innerHTML = `<span style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
    <input id="tab-txt" type="search" placeholder="filtrar por nome, etapa, espécie ou responsável" aria-label="filtrar a tabela" value="${esc(tabTxt)}" style="flex:1;min-width:220px">
    <button class="fchip${!f?" on":""}" data-tab-fase="" style="display:inline-flex">Todas</button>${FASES_QUADRO_ETAPA.map(x=>`<button class="fchip${x===f?" on":""}" data-tab-fase="${x}" style="display:inline-flex">${esc(NOME_FASE[x]||x)}</button>`).join("")}</span>`;
  document.getElementById("conteudo-meio").innerHTML = `<div id="tab-casos"></div>`;
  const i = document.getElementById("tab-txt"); i.oninput=()=>{ tabTxt = i.value; pintarTabela(); };
  document.querySelectorAll("[data-tab-fase]").forEach(b=>b.onclick=()=>{ guardar("crm_tab_fase", b.dataset.tabFase); renderTabela(); });
  pintarTabela();
}
// Pessoas (aba do Planejado): a linha do tempo de cada pessoa nas próximas três semanas, um quadrado por dia com o que
// ela tem (a mesma conta da Lista: itensAgenda), o vencido à esquerda; o clique mostra os itens do dia
const PES_DIAS = 21;
const ROT_NAT = Object.fromEntries(PLAN_NAT.map(([v,r])=>[v,r]));
function gradePessoas(){
  const hj = hoje(), dias = Array.from({length:PES_DIAS}, (_,i)=>somaDias(hj, i)), fim = dias[dias.length-1];
  const linhas = new Map();   // pessoa → coluna ("venc" ou o dia) → itens
  for(const i of itensAgenda(null)){
    if(!i.data || i.data>fim) continue;
    const col = i.data<hj ? "venc" : i.data;
    for(const p of (i.donos && i.donos.length ? i.donos : ["_"])){
      if(p!=="_" && !D.colPorId.get(p)) continue;
      if(!linhas.has(p)) linhas.set(p, new Map());
      const m = linhas.get(p); if(!m.has(col)) m.set(col, []); m.get(col).push(i);
    }
  }
  const ordem = [...equipeAtiva().map(c=>c.id).filter(id=>linhas.has(id)), ...[...linhas.keys()].filter(id=>id!=="_" && !equipeAtiva().some(c=>c.id===id)), ...(linhas.has("_")?["_"]:[])];
  return {dias, ordem, linhas};
}
let _pesGrade = null;
function rotItemPes(i){ return `${i.cli ? i.cli.nome : (i.k ? tituloCaso(i.k) : "")} · ${i.selo || (i.fatal ? "Prazo fatal" : ROT_NAT[natPlan(i)] || "")}`; }
function renderPessoas(){
  tituloLista("Planejado");
  document.getElementById("sub-lista").innerHTML = `<span class="meio-sub">O que cada pessoa tem por dia nas próximas três semanas. O vermelho é prazo fatal; o roxo, perícia ou audiência.</span>`;
  const g = _pesGrade = gradePessoas(), hj = hoje();
  if(!g.ordem.length){ document.getElementById("conteudo-meio").innerHTML = `<p class="meio-sub">Nada com data nas próximas três semanas.</p>`; return; }
  const max = Math.max(1, ...g.ordem.flatMap(p=>[...g.linhas.get(p).entries()].filter(([c])=>c!=="venc").map(([,v])=>v.length)));
  const cel = (p, col) => { const its = g.linhas.get(p).get(col)||[], n = its.length, fds = col!=="venc" && !ehDiaUtil(col);
    if(!n) return `<td class="pes-c${fds?" fds":""}"></td>`;
    const pz = its.some(i=>natPlan(i)==="prazos"), pe = its.some(i=>natPlan(i)==="pericias");
    return `<td class="pes-c${fds?" fds":""}${col==="venc"?" venc":""}"><button data-pes="${p}|${col}" style="--pes:${Math.round(25+75*Math.min(n,max)/max)}%" title="${esc(its.slice(0,8).map(rotItemPes).join("\n")+(n>8?`\n+${n-8}`:""))}">${n}${pz?`<i class="pes-pz" aria-hidden="true"></i>`:""}${pe?`<i class="pes-pe" aria-hidden="true"></i>`:""}<span class="sr-only"> ${n===1?"item":"itens"}${pz?", com prazo fatal":""}${pe?", com perícia ou audiência":""}</span></button></td>`; };
  const nomeP = p => p==="_" ? "Sem responsável" : (D.colPorId.get(p).nome||"").split(" ")[0];
  document.getElementById("conteudo-meio").innerHTML = `<div class="tab-rola"><table class="pes-tab"><thead><tr><th scope="col">Pessoa</th><th scope="col" class="venc">Vencidos</th>${
    g.dias.map(d=>`<th scope="col" class="${!ehDiaUtil(d)?"fds":""}${d===hj?" hoje":""}" title="${fmt(d)}">${SIGLA_DIA[new Date(d+"T12:00:00").getDay()]}<br>${d.slice(8,10)}</th>`).join("")}</tr></thead><tbody>${
    g.ordem.map(p=>`<tr><th scope="row">${p==="_"?"":avPz(p)} ${esc(nomeP(p))} <span class="pl-n">${[...g.linhas.get(p).values()].reduce((a,v)=>a+v.length,0)}</span></th>${cel(p,"venc")}${g.dias.map(d=>cel(p,d)).join("")}</tr>`).join("")}</tbody></table></div>`;
  document.querySelectorAll("[data-pes]").forEach(b=>b.onclick=()=>{
    const [p, col] = b.dataset.pes.split("|"), its = (_pesGrade.linhas.get(p)||new Map()).get(col)||[];
    caixa(`<h3>${esc(nomeP(p))} · ${col==="venc" ? "vencidos" : fmt(col)}</h3><div class="pes-lista">${its.map(i=>`<button class="btn-mini" data-cli="${i.cli?i.cli.id:""}" style="text-align:left">${esc(rotItemPes(i))}${i.data<hj?` <span class="meio-sub">${fmt(i.data)}</span>`:""}</button>`).join("")}</div>`);
    document.querySelectorAll(".pes-lista [data-cli]").forEach(x=>x.onclick=()=>{ if(x.dataset.cli){ fecharCaixa(); abrirFicha(x.dataset.cli); } });
  });
}

// ── 📌 Quadros por horizonte (F132, em teste) ──────────────────────────────
// Uma providência com data por cartão: prazo fatal, lembrete de comentário,
// pedir prorrogação, tarefa, lembrete de época e perícia agendada. O dono é
// quem a anotação atribuiu; caso sem atribuição fica "sem dono".
let quadroColab = null;
function providenciasComData(){
  const out=[];
  const nomeC = k => (D.cliPorId.get(k.cliente_id)||{}).nome || "cliente sem ficha";
  const donos = k => (D.atrDoCaso.get(k.id)||[]);
  ativos().forEach(k=>{
    if(k.prazo){ const og = origemDoPrazo(k);
      out.push({data:k.prazo, ico:prazoEhRetorno(k)?"↩":"⏰", tipo:prazoEhRetorno(k)?"Prazo do Microsoft To Do":"Prazo fatal", txt: og?og.texto:tituloCaso(k), nome:nomeC(k), cli:k.cliente_id, donos:donos(k)}); }
    const pe = prorrogarEm(k);
    if(pe) out.push({data:pe, ico:"🩹", tipo:"Pedir prorrogação", txt:`DCB ${fmt(k.dcb)}`, nome:nomeC(k), cli:k.cliente_id, donos:donos(k)});
    (D.tarefasPorCaso.get(k.id)||[]).filter(t=>t.lembrar_em && !t.concluida_em).forEach(t=>
      out.push({data:t.lembrar_em, ico:"🔔", tipo:"Lembrete", txt:tituloCaso(k), nome:nomeC(k), cli:k.cliente_id, donos:[t.colaborador_id]}));
  });
  D.tarefas.filter(t=>!t.concluida && t.prazo).forEach(t=>{
    const c = t.cliente_id ? D.cliPorId.get(t.cliente_id) : null;
    out.push({data:t.prazo, ico:"📋", tipo:"Tarefa", txt:t.titulo, nome:c?c.nome:"", cli:c?c.id:null, donos:t.particular_de?[t.particular_de]:[]});
  });
  (D.lembretes||[]).filter(l=>l.ativo!==false && l.proximo_em).forEach(l=>{
    const c = D.cliPorId.get(l.cliente_id)||{};
    out.push({data:l.proximo_em, ico:"🎂", tipo:rotuloTipoLembrete(l.tipo).replace(/^\S+\s/,""), txt:l.titulo, nome:c.nome||"", cli:c.id||null, donos:[]});
  });
  D.eventos.filter(e=>e.status==="agendada").forEach(e=>{
    const k = D.casoPorId.get(e.caso_id); if(!k) return;
    out.push({data:dataSP(e.data_hora), ico:"🩺", tipo:e.tipo, txt:horaSP(e.data_hora), nome:nomeC(k), cli:k.cliente_id, donos:donos(k)});
  });
  return out.sort((a,b)=>a.data<b.data?-1:1);
}
// horizontes: vencidas, hoje, amanhã, resto da semana (até domingo), resto do mês
function horizontes(){
  const h = hoje(), d0 = new Date(h+"T12:00:00");
  const em = n => { const x=new Date(d0); x.setDate(x.getDate()+n); return x.toLocaleDateString("sv"); };
  const dow = d0.getDay();                       // 0 = domingo
  const fimSem = em(dow===0 ? 0 : 7-dow);
  const fimMes = new Date(d0.getFullYear(), d0.getMonth()+1, 0).toLocaleDateString("sv");
  return [
    ["venc","🔴 Vencidas", d=>d<h],
    ["hoje","Hoje", d=>d===h],
    ["amanha","Amanhã", d=>d===em(1)],
    ["semana","Restante da semana", d=>d>em(1) && d<=fimSem],
    ["mes","Restante do mês", d=>d>fimSem && d<=fimMes],
  ];
}
function kcardProv(p){
  const quem = p.donos.map(id=>D.colPorId.get(id)).filter(Boolean);
  return `<div class="kcard ${p.data<hoje()?"venceu":""}" ${p.cli?`data-cli="${p.cli}"`:""}>
    <div class="topo"><span>${p.ico} ${esc(p.tipo)} · ${fmt(p.data)}</span>
      <span class="quem">${quem.length?quem.map(c=>`<span class="avatar mini" style="background:${c.cor}" title="${esc(c.nome)}">${esc(c.inicial)}</span>`).join("")
        :`<span class="meio-sub" title="caso sem atribuição">sem dono</span>`}</span></div>
    <div class="nome">${esc(p.nome)}</div>
    <div class="meta"><span>${esc((p.txt||"").slice(0,90))}</span></div></div>`;
}
function chipsQuadro(){
  return `<div class="filtros">`+[`<button class="fchip ${quadroColab===null?"on":""}" data-qcol="">Todos</button>`]
    .concat(equipeAtiva().map(c=>
      `<button class="fchip fchip-ini ${quadroColab===c.id?"on":""}" data-qcol="${c.id}" title="${esc(c.nome)}">`+
      `<span class="avatar mini" style="background:${c.cor}">${esc(c.inicial)}</span></button>`)).join("")+`</div>`;
}
function renderQuadroN(n){
  tituloLista(`📌 Quadro ${n}`);
  const subs = {1:"Colunas por horizonte, filtro por colaborador — o que vence e quando.",
                2:"Linhas por horizonte, colunas por colaborador — quem carrega o quê.",
                3:"Colunas por horizonte com uma faixa por colaborador — as duas leituras numa tela."};
  document.getElementById("sub-lista").textContent = subs[n] + " Em teste: clique no cartão abre a ficha.";
  const todas = providenciasComData();
  const hz = horizontes();
  const ps = todas.filter(p=>!quadroColab || p.donos.includes(quadroColab));
  const eq = equipeAtiva();
  let html = chipsQuadro();
  if(n===1){
    html += `<div class="kanban kq">`+hz.map(([id,rot,f])=>{ const g=ps.filter(p=>f(p.data));
      return `<div class="coluna" data-hz="${id}"><h4>${semEmoji(rot)}<span>${g.length}</span></h4>${g.map(kcardProv).join("")}</div>`; }).join("")+`</div>`;
  } else if(n===2){
    const cols = [...eq, {id:null, nome:"Sem dono", inicial:"—", cor:"#9AA0B0"}].filter(c=>!quadroColab || c.id===quadroColab);
    const de = (c, g) => g.filter(p=> c.id ? p.donos.includes(c.id) : !p.donos.length);
    html += `<div class="kq kq2" style="grid-template-columns:120px repeat(${cols.length},minmax(170px,1fr))">`
      + `<div></div>` + cols.map(c=>`<div class="cab"><span class="avatar mini" style="background:${c.cor}">${esc(c.inicial)}</span>${esc(c.nome.split(" ")[0])}</div>`).join("")
      + hz.map(([id,rot,f])=>{ const g=ps.filter(p=>f(p.data));
          return `<div class="lin">${rot} <span class="meio-sub">${g.length}</span></div>`
            + cols.map(c=>`<div class="cel">${de(c,g).map(kcardProv).join("")}</div>`).join(""); }).join("")
      + `</div>`;
  } else {
    html += `<div class="kanban kq">`+hz.map(([id,rot,f])=>{ const g=ps.filter(p=>f(p.data));
      const faixas = [...eq.filter(c=>!quadroColab || c.id===quadroColab).map(c=>[c, g.filter(p=>p.donos.includes(c.id))]),
                      [{nome:"Sem dono", inicial:"—", cor:"#9AA0B0"}, quadroColab?[]:g.filter(p=>!p.donos.length)]]
        .filter(([,x])=>x.length);
      return `<div class="coluna" data-hz="${id}"><h4>${semEmoji(rot)}<span>${g.length}</span></h4>`
        + faixas.map(([c,x])=>`<div class="faixa"><span class="avatar mini" style="background:${c.cor}">${esc(c.inicial)}</span>${esc(c.nome.split(" ")[0])} <span class="meio-sub">${x.length}</span></div>${x.map(kcardProv).join("")}`).join("")
        + `</div>`; }).join("")+`</div>`;
  }
  document.getElementById("conteudo-meio").innerHTML = html;
  document.querySelectorAll("[data-qcol]").forEach(b=>b.onclick=()=>{ quadroColab=b.dataset.qcol||null; render(); });
  document.querySelectorAll(".kq .kcard[data-cli]").forEach(el=>el.onclick=()=>abrirFicha(el.dataset.cli));
}

// ── 💼 Vendas (funil de prospectos) ───────────────────────────────────────
const ETAPAS=[["novo","🆕 Novo contato"],["atendimento","📅 Atendimento"],
  ["viabilidade","🔎 Viabilidade"],["proposta","🤝 Proposta"],
  ["fechado","✅ Fechado"],["perdido","❌ Perdido"]];
// "hoje 09:12" vale mais que a data cheia num cartão de funil: o que decide
// se alguém corre atrás é a distância até agora, não o dia do calendário
function quandoFalou(ts){
  const d=dataSP(ts);
  if(d===hoje()) return "hoje "+horaSP(ts);
  const o=new Date(hoje()+"T12:00:00"); o.setDate(o.getDate()-1);
  if(d===o.toLocaleDateString("sv")) return "ontem";
  return fmtTS(ts);
}
function renderVendas(){
  tituloLista("💼 Vendas");
  document.getElementById("sub-lista").textContent=
    "Do primeiro contato ao contrato. Arraste entre etapas; ao fechar, um clique transforma o prospecto em cliente.";
  const fech=D.leads.filter(l=>l.etapa==="fechado").length,
        perd=D.leads.filter(l=>l.etapa==="perdido").length;
  const taxa=(fech+perd)?Math.round(100*fech/(fech+perd)):null;
  document.getElementById("conteudo-meio").innerHTML =
    `<div class="nova">
      <input id="nl-nome" placeholder="＋ Nome do prospecto…" style="min-width:160px">
      <input id="nl-tel" placeholder="telefone" style="max-width:130px">
      <input id="nl-ben" placeholder="benefício de interesse" list="lista-beneficios" style="max-width:180px">
      <select id="nl-origem">${ORIGENS_CLIENTE.map(([v,r])=>`<option value="${esc(v)}">${esc(r)}</option>`).join("")}</select>
      <button onclick="novoLead()">Adicionar</button>
    </div>
    <datalist id="lista-beneficios">${D.docs.map(d=>`<option value="${esc(d.beneficio)}">`).join("")}</datalist>
    ${taxa!=null?`<div class="meio-sub">Conversão até hoje: <b>${taxa}%</b> (${fech} fechados, ${perd} perdidos)</div>`:""}
    <div class="kanban">`+ETAPAS.map(([e,rot])=>{
      const ls=D.leads.filter(l=>l.etapa===e);
      return `<div class="coluna" data-etapa="${e}"><h4>${semEmoji(rot)}<span>${ls.length}</span></h4>
        ${ls.slice(0,40).map(l=>`<div class="kcard" draggable="true" data-lead="${l.id}">
          <div class="nome">${esc(l.nome)}</div>
          <div class="meta">${l.beneficio_interesse?`<span class="chip ben">${esc(l.beneficio_interesse)}</span>`:""}
            ${l.origem?`<span class="chip neutro">${esc(l.origem)}</span>`:""}
            ${l.ultimo_contato?`<span class="chip per" title="quem chega pelo SMBot vem sem o texto: a conversa se lê no painel deles">💬 ${quandoFalou(l.ultimo_contato)}${l.contatos>1?` · ${l.contatos}×`:""}</span>`:""}</div>
          ${l.telefone?`<div class="acao"><a class="btn-mini" target="_blank" rel="noopener" style="text-decoration:none" href="https://wa.me/55${l.telefone.replace(/\D/g,"")}">💬 chamar</a></div>`:""}
          ${e==="fechado"&&!l.cliente_id?`<div class="acao"><button class="btn-mini" onclick="leadParaCliente('${l.id}')" title="→ virar cliente"><span aria-hidden="true">→ Cadastrar</span><span class="sr-only">→ virar cliente</span></button></div>`:""}
          ${e==="fechado"&&l.cliente_id?`<div class="acao"><button class="btn-mini" onclick="abrirFicha('${l.cliente_id}')" title="ficha do cliente"><span aria-hidden="true">Ficha</span><span class="sr-only">ficha do cliente</span></button></div>`:""}
        </div>`).join("")}</div>`;
    }).join("")+`</div>`;
  document.getElementById("nl-nome").onkeydown=e=>{ if(e.key==="Enter") novoLead(); };
  document.querySelectorAll(".kcard[data-lead]").forEach(el=>{
    el.ondragstart=e=>e.dataTransfer.setData("text/lead", el.dataset.lead);
  });
  document.querySelectorAll(".coluna[data-etapa]").forEach(col=>{
    col.ondragover=e=>{ e.preventDefault(); col.classList.add("solta"); };
    col.ondragleave=()=>col.classList.remove("solta");
    col.ondrop=async e=>{
      e.preventDefault(); col.classList.remove("solta");
      const id=e.dataTransfer.getData("text/lead"); if(!id) return;
      const l=D.leads.find(x=>x.id===id); if(!l || l.etapa===col.dataset.etapa) return;
      l.etapa=col.dataset.etapa;
      if(l.etapa==="perdido") l.motivo_perda=prompt("Motivo da perda (opcional):")||null;
      await api(`/rest/v1/leads?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({etapa:l.etapa, motivo_perda:l.motivo_perda||null,
          atualizado_em:new Date().toISOString()})});
      montarSidebar(); renderVendas();
    };
  });
}
async function novoLead(){
  const nome=document.getElementById("nl-nome").value.trim();
  if(!nome) return;
  const [l]=await api(`/rest/v1/leads`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify({nome, telefone:document.getElementById("nl-tel").value.trim()||null,
      beneficio_interesse:document.getElementById("nl-ben").value.trim()||null,
      origem:document.getElementById("nl-origem").value, responsavel_id:eu.id})});
  D.leads.unshift(l); renderVendas(); aviso("Prospecto no funil 💼");
}
async function leadParaCliente(leadId){
  const l=D.leads.find(x=>x.id===leadId); if(!l) return;
  // F160 · a origem do prospecto desce ao cadastro: é no cliente que o painel
  // conta de onde o escritório vem crescendo, e o funil some depois do fecho
  const [cli]=await api(`/rest/v1/clientes`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify({nome:l.nome, telefone:l.telefone,
      ...(l.origem?{campos:{civil:{origem:l.origem}}}:{})})});
  const [caso]=await api(`/rest/v1/casos`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify({cliente_id:cli.id, titulo:l.nome,
      beneficio:l.beneficio_interesse, fase:"escritorio"})});
  await api(`/rest/v1/atribuicoes`,{method:"POST",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({caso_id:caso.id, colaborador_id:eu.id})});
  await aplicarChecklistCaso(caso, true);
  await api(`/rest/v1/leads?id=eq.${leadId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({cliente_id:cli.id})});
  l.cliente_id=cli.id;
  await carregar(); montarSidebar();
  await avisarCasoNovo(caso.id, cli.id, "veio do funil de vendas");
  aviso("Cliente criado a partir da venda ✔"); abrirFicha(cli.id);
}

// ── 💬 WhatsApp: a caixa de entrada do escritório ─────────────────────────
// À esquerda quem está falando com a gente, à direita a conversa. Uma
// conversa por NÚMERO, não por processo: é assim que o cliente enxerga, mesmo
// tendo três casos.
//
// O que chega vem da ponte (crm/fase2/ponte/). O que sai é gravado como
// pedido de envio — o CRM nunca fala com o WhatsApp direto. Se a ponte
// estiver caída, a mensagem espera na fila em vez de sumir.
let zapFiltro = "novas", zapAberta = null, zapMsgs = [], zapTimer = null, zapConvs = [];
// modo nota interna: o que for escrito fica só para a equipe
let zapNota = false;
// o que veio do SMBot: setores, etiquetas, retornos, reações e o protocolo
let zapAux = {setores:[], etiquetas:[], convEtq:new Map(), retornos:[]};
let zapReacoes = new Map(), zapResponder = null, zapHist = [], zapTransf = [], zapPainelAberto = false;
let zapChips = {naoLidas:false, fixadas:false, setor:"", etiqueta:"", atendente:""};
async function carregarAuxZap(){
  const [setores, etiquetas, ce, retornos, colabSetores, mencs, passos] = await Promise.all([
    todas("zap_setores","select=*&ativo=eq.true&order=ordem,nome").catch(()=>[]),
    todas("zap_etiquetas","select=*&order=ordem,texto").catch(()=>[]),
    todas("zap_conversa_etiquetas","select=conversa_id,etiqueta_id").catch(()=>[]),
    todas("zap_retornos","select=*&feito_em=is.null&order=quando").catch(()=>[]),
    todas("colaborador_setores","select=colaborador_id,setor_id").catch(()=>[]),
    todas("mencoes",`select=conversa_id&para_id=eq.${eu.id}&lida_em=is.null&conversa_id=not.is.null`).catch(()=>[]),
    todas("zap_bot_passos","select=chave,ordem&ativo=eq.true&order=ordem").catch(()=>[]),
  ]);
  const convEtq = new Map();
  ce.forEach(x=>{ if(!convEtq.has(x.conversa_id)) convEtq.set(x.conversa_id,[]); convEtq.get(x.conversa_id).push(x.etiqueta_id); });
  zapAux = {setores, etiquetas, convEtq, retornos, colabSetores, passos,
            mencionado: new Set(mencs.map(m=>m.conversa_id))};
}
// F187 · gestor vê e mexe em tudo; atendente vê as suas, as pendentes dos seus
// setores e aquelas em que foi chamado com @. O banco confere as ações
// (zap_guarda_*), aqui é o que cada um enxerga.
const zapGestor = () => !visaoColab() || !!(eu && eu.gestor_zap);   // F368 · o gestor do WhatsApp vê e transfere todas, sem ser administrador do CRM
const meusSetoresZap = () => zapAux.colabSetores.filter(x=>x.colaborador_id===eu.id).map(x=>x.setor_id);
// F538 · a conversa coberta durante o Offline do titular fica com o substituto (onda 1, 11.11.2026)
// F594 · a IA conduz: sem atendente, aberta, no modo conversa ou lead do plantão e sem ter agendado (o banco tira o modo ao passar à equipe)
const comIaZap = c => !!c && !c.atendente_id && c.status!=="resolvida" && !!c.plantao
  && (c.plantao.modo==="conversa" || c.plantao.modo==="lead") && !c.plantao.agendado_em;
const cobrindoZap = c => !!c && !!c.cobertura && c.cobertura.cobre===eu.id && c.status!=="resolvida";
function zapVisivel(c){
  if(zapGestor() || c.atendente_id===eu.id || cobrindoZap(c) || zapAux.mencionado.has(c.id)) return true;
  if(c.atendente_id) return false;
  const meus = meusSetoresZap();
  return !c.setor_id || !meus.length || meus.includes(c.setor_id);
}
const podeAgirZap = c => !!c && (zapGestor() || !c.atendente_id || c.atendente_id===eu.id);
// o colaborador assume a conversa antes de responder ao cliente; o gestor responde sem assumir (pedido do Paulo, 06.11.2026)
const precisaAssumir = c => !!c && !zapGestor() && c.atendente_id !== eu.id && !cobrindoZap(c);
function barraAssumir(c){
  if(!precisaAssumir(c)) return false;
  const at = c.atendente_id && D.colPorId.get(c.atendente_id);
  aviso(at ? `A conversa está com ${at.nome}. Peça a transferência para responder.` : "Assuma a conversa para responder");
  return true;
}
// o banco explica a recusa em "message": é isso que vai para o aviso
function msgErro(e){
  try{ const j = JSON.parse(String(e.message).replace(/^\d+:\s*/,"")); return j.message || e.message; }
  catch(_){ return e.message; }
}
const setorDe = c => c && c.setor_id && zapAux.setores.find(s=>s.id===c.setor_id);
const etiquetasDe = c => (zapAux.convEtq.get(c.id)||[]).map(id=>zapAux.etiquetas.find(e=>e.id===id)).filter(Boolean);
const retornoDe = c => zapAux.retornos.find(r=>r.conversa_id===c.id);
const chipEtq = e => `<span class="zap-etq" style="background:${esc(e.cor)}">${esc(e.texto)}</span>`;
const chipSetor = s => `<span class="zap-setor" style="color:${esc(s.cor)}">${esc(s.nome)}</span>`;

function pararZapTimer(){ if(zapTimer){ clearInterval(zapTimer); zapTimer=null; } }

let zapAbaAuto = false;   // auditoria 23.11 · ao entrar, Novas vazia abre Pendentes, onde está o que o número do menu conta
async function renderWhats(){ zapAbaAuto = true;
  tituloLista("💬 WhatsApp");
  document.getElementById("sub-lista").textContent=
    "As conversas do escritório. Quem responde assume a conversa — e o robô se cala na hora.";
  document.querySelector(".meio").classList.add("zap-v");
  // F183 · três colunas: quem está falando, a conversa e, ao lado, o cliente
  // (caso, etapa, prazo) — atender sem sair da tela para abrir a ficha
  document.getElementById("conteudo-meio").innerHTML =
    `<div class="zap-tela${cfgApp("zap_visual")==="escritorio"?"":" wa"}">
       <div class="zap-lado"><div class="meio-sub">carregando…</div></div>
       <div class="zap-dir" id="zap-dir"></div>
       <aside class="zap-painel" id="zap-painel"></aside>
       <button class="zp-fechar" onclick="alternarFichaZap()" aria-label="Fechar a ficha">✕</button>
     </div>`;
  zagCarregar();
  await recarregarZap();
  pararZapTimer();
  // sem WebSocket: uma olhada a cada 6 segundos é o suficiente para quem está
  // atendendo e não deixa a página pesada
  zapTimer = setInterval(()=>{ if(visao==="whatsapp"){ recarregarZap(true); if(zagAberta()) zagCarregar(); } else pararZapTimer(); }, 6000);
}

async function recarregarZap(silencioso){
  const cs = await todas("zap_conversas","select=*&order=ultima_em.desc.nullslast")
    .catch(()=>null);
  if(cs===null){
    document.querySelector(".zap-lado")._html = null;
    document.querySelector(".zap-lado").innerHTML =
      `<p class="meio-sub">Ainda não dá para listar: o banco não tem as tabelas do
        WhatsApp, ou a ponte nunca subiu. Rode o schema.sql e veja o
        <code>crm/fase2/ponte/PASSO-A-PASSO.md</code>.</p>`;
    return;
  }
  zapConvs = cs;
  await Promise.all([assinarFotosZap(cs), carregarAuxZap(), atualizarEstadoZap()]);
  pintarListaZap();
  if(zapPainelAberto) await abrirPainelZap(true);
  else if(zapAberta && !silencioso) await abrirConversa(zapAberta);
  else if(zapAberta) await recarregarMsgs();
  else if(!silencioso){ document.getElementById("zap-dir").innerHTML = telaVaziaZap(); pintarPainelZap(null); }
}

// o estado da ponte muda o tempo todo (sinal de vida a cada 30 s, QR a cada
// 20 s): relê do banco a cada volta da lista, em vez do que veio no login
async function atualizarEstadoZap(){
  const rs = await todas("config_app","select=chave,valor&chave=like.zap_*").catch(()=>[]);
  rs.forEach(r=>(D.config=D.config||new Map()).set(r.chave, r.valor));
  if(document.getElementById("zx-painel")) pintarConexaoZap();
}
const zapComProblema = () => estadoPonte().txt!=="WhatsApp conectado";

// F185 · Corrigir a conexão de dentro do CRM. O CRM não fala com o WhatsApp:
// grava o pedido em zap_comando e a ponte (que lê a cada 10 s) obedece.
// Reconectar recomeça a ponte; Novo QR desfaz o aparelho e mostra o código
// aqui mesmo, desenhado no navegador (o código não sai para site nenhum).
function abrirConexaoZap(){
  caixa(`<div id="zx-painel" class="zx"></div>`);
  pintarConexaoZap();
}
function pintarConexaoZap(){
  const el = document.getElementById("zx-painel"); if(!el) return;
  const p = estadoPonte(), visto = cfgApp("zap_visto_em"), qr = cfgApp("zap_qr");
  const morta = !visto || (Date.now() - new Date(visto).getTime() > 120000);
  const pedido = String(cfgApp("zap_comando")||"").split("|")[0];
  // repinta só quando algo muda: redesenhar o QR a cada 6 s faz a câmera do
  // celular perder o código no meio da leitura
  const chave = [p.txt, qr, pedido, morta, visto && visto.slice(0,16)].join("|");
  if(el.dataset.chave===chave) return;
  el.dataset.chave = chave;
  el.innerHTML = `<h3>Conexão do WhatsApp</h3>
    <p class="zx-estado"><i style="background:${p.cor}"></i><b>${esc(p.txt==="WhatsApp conectado"?"Conectado":p.txt)}</b>
      ${visto?`<span class="meio-sub">· sinal de vida ${diaZap(visto)} às ${horaSP(visto)}</span>`:""}</p>
    ${morta?`<div class="zx-aviso">A ponte não dá sinal há mais de 2 minutos. Ela roda no computador do escritório:
        confira se ele está ligado e com internet. Quando o computador volta, a ponte volta sozinha.
        Os botões abaixo só funcionam com a ponte dando sinal.</div>`:""}
    ${qr?`<div class="zx-qr"><div id="zx-qrimg" aria-label="QR code para conectar o WhatsApp"></div>
        <ol><li>No celular do escritório, abra o WhatsApp.</li>
          <li>Toque em <b>⋮ › Aparelhos conectados › Conectar um aparelho</b>.</li>
          <li>Aponte a câmera para este código. Ele se renova sozinho a cada 20 segundos.</li></ol></div>`:""}
    ${pedido?`<p class="zx-pedido">Pedido enviado à ponte: ${pedido==="novo_qr"?"gerar novo QR code":"reconectar"}. Aguarde alguns segundos…</p>`:""}
    <div class="zx-bts">
      <button class="zt-btn" onclick="comandoZap('reconectar')" ${morta||pedido?"disabled":""} title="Reconectar agora">Reconectar<span class="sr-only"> agora</span></button>
      <button class="zt-btn" onclick="comandoZap('novo_qr')" ${morta||pedido?"disabled":""} title="Gerar novo QR code"><span aria-hidden="true">QR</span><span class="sr-only">Gerar novo QR code</span></button>
    </div>
    <p class="meio-sub">Reconectar resolve a maioria das quedas e não pede QR. Use o novo QR code só se o celular
      mostrar o aparelho como desconectado, ou se a reconexão não resolver.</p>`;
  if(qr) desenharQR(document.getElementById("zx-qrimg"), qr);
}
async function comandoZap(c){
  if(c==="novo_qr" && !await confirmar("Gerar um novo QR code? A conexão atual será desfeita e alguém precisa ler o código com o celular do escritório."))
    return;
  await guardarCfgApp("zap_comando", `${c}|${new Date().toISOString()}`);
  aviso(c==="novo_qr" ? "Pedido enviado: o QR code aparece aqui em instantes" : "Pedido enviado: a ponte reconecta em instantes");
  pintarConexaoZap();
}
// QR desenhado no próprio navegador (qrcodejs do cdnjs, carregado só aqui)
let libQR = null;
async function desenharQR(el, texto){
  if(!el) return;
  try{
    libQR = libQR || new Promise((ok, erro)=>{ const s=document.createElement("script");
      s.src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"; s.onload=ok; s.onerror=erro; document.head.appendChild(s); });
    await libQR;
    if(el.dataset.qr===texto) return;          // mesmo código: não redesenha (evita piscar)
    el.innerHTML = ""; el.dataset.qr = texto;
    new QRCode(el, {text:texto, width:240, height:240, correctLevel:QRCode.CorrectLevel.L});
  }catch(e){ libQR = null; el.textContent = "Não consegui desenhar o QR code. Atualize a página e tente de novo."; }
}

function estadoPonte(){
  const st = cfgApp("zap_status")||"", visto = cfgApp("zap_visto_em");
  // 2 minutos sem bater ponto: a ponte morreu, e é melhor dizer isso do que
  // deixar todo mundo achando que ninguém escreveu hoje
  const morta = !visto || (Date.now() - new Date(visto).getTime() > 120000);
  if(st==="ligado" && !morta) return {cor:"#0a7d43", txt:"WhatsApp conectado"};
  if(st.includes("QR")) return {cor:"#b06000", txt:"esperando leitura do QR"};
  if(!st) return {cor:"#b00020", txt:"WhatsApp desconectado"}   // F684 · vermelho e sem jargão: ao lado do "Online" o cinza parecia estar tudo bem;
  return {cor:"#b00020", txt: morta ? "WhatsApp sem sinal" : st};
}

// Ícones desenhados da tela (traço, como os do menu lateral): emoji em botão
// muda de cara em cada computador e não diz a mesma coisa para todo mundo
const ZIC = {
  busca:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  relogio:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  seta:'<path d="M4 12h13m-4-5 5 5-5 5"/>',
  ok:'<path d="m5 12 5 5 9-10"/>',
  carta:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="m3 8 9 6 9-6"/>',
  mais:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  clipe:'<path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4L14 7.6"/>',
  frases:'<path d="M5 5h14v10H9l-4 4z"/>',
  mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  agenda:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4m6-4v4"/>',
  baixo:'<path d="m6 9 6 6 6-6"/>',
  proibido:'<circle cx="12" cy="12" r="8"/><path d="m6.5 6.5 11 11"/>',
  ditar:'<rect x="7" y="3" width="5" height="10" rx="2.5"/><path d="M4 10a5.5 5.5 0 0 0 11 0M9.5 16v3M16 8h5m-5 4h5m-3 4h3"/>',
  corrigir:'<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/>',
  ideia:'<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  lupa2:'<circle cx="10" cy="10" r="6"/><path d="m20 20-5.5-5.5M7.5 10h5M10 7.5v5"/>',
  emoji:'<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14a4 4 0 0 0 7 0"/><path d="M9 9.5h.01M15 9.5h.01" stroke-width="2.4"/>',
};
const zic = (n, t=16) => `<svg class="zic" width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ZIC[n]}</svg>`;

// datas da conversa como se fala: "hoje", "amanhã", "06/10"
function diaZap(ts){
  const d = dataSP(ts), hj = hoje();
  const am = dataSP(new Date(Date.now()+864e5).toISOString()), on = dataSP(new Date(Date.now()-864e5).toISOString());
  return d===hj ? "hoje" : d===am ? "amanhã" : d===on ? "ontem" : `${d.slice(8,10)}/${d.slice(5,7)}`;
}
const dmaZap = iso => iso ? `${iso.slice(8,10)}/${iso.slice(5,7)}/${iso.slice(0,4)}` : "";
// 5516999990001 -> (16) 99999-0001
function foneZap(t){
  const d = String(t||"").replace(/\D/g,"").replace(/^55(?=\d{10,11}$)/,"");
  return d.length===11 ? `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
       : d.length===10 ? `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}` : (t||"");
}
// chip na cor do setor/etiqueta, clarinho, sem perder a leitura do texto
const tintaZap = cor => `color:color-mix(in srgb, ${cor} 82%, #000);background:color-mix(in srgb, ${cor} 9%, #fff);border-color:color-mix(in srgb, ${cor} 28%, #fff)`;

// As filas são as do SMBot: Minhas, Pendentes (ninguém pegou ainda), Todas as
// abertas e Retornos ("responder depois" com hora); Encerradas fica à parte.
let zapBusca = "", zapBuscaT = null, zapAchados = [];
// F191 · a busca também procura DENTRO das mensagens (palavra, nº de processo,
// nome dito na conversa), no banco, sem acento
async function buscarNasMensagens(){
  const q = zapBusca.trim();
  if(q.length < 3){ if(zapAchados.length){ zapAchados = []; pintarListaZap(); } return; }
  const r = await api(`/rest/v1/rpc/zap_buscar`,{method:"POST", body:JSON.stringify({p_q:q, p_limite:40})}).catch(()=>null);
  if(!r || zapBusca.trim()!==q) return;
  zapAchados = r.filter(m=>{ const c = zapConvs.find(x=>x.id===m.conversa_id); return c && zapVisivel(c); });
  pintarListaZap();
}
function achadoZap(m){
  const c = zapConvs.find(x=>x.id===m.conversa_id) || {};
  const t = String(m.texto||""), q = dsa(zapBusca.trim()), i = dsa(t).indexOf(q);
  const ini = Math.max(0, i-50), fim = i<0 ? 120 : i+q.length+70;
  const trecho = i<0 ? esc(t.slice(0,120))
    : `${ini?"…":""}${esc(t.slice(ini,i))}<mark>${esc(t.slice(i,i+q.length))}</mark>${esc(t.slice(i+q.length,fim))}${fim<t.length?"…":""}`;
  return `<button class="zl-achado" data-za="${m.conversa_id}|${m.mensagem_id}">
      <span class="l1"><b>${esc(nomeDaConversa(c))}</b><span class="hora">${diaZap(m.momento)} ${horaSP(m.momento)}</span></span>
      <span class="l2">${m.direcao==="saida"?"Escritório: ":m.direcao==="interna"?"Nota: ":""}${trecho}</span></button>`;
}
let zapMaisAberto = false;   // F274 · o ⋯ da lista do WhatsApp continua aberto quando a lista se repinta
function pintarListaZap(){
  if(!document.querySelector(".zap-lado")) return;   // a carga terminou depois de sair do WhatsApp
  const meu = c => c.atendente_id===eu.id || cobrindoZap(c);
  const aberta = c => c.status!=="resolvida";
  const gestor = zapGestor();
  // 29.10.2026 · sem a fila Retornos, que o escritório não usa (pedido do Paulo)
  // F346 · como no SMBot, o colaborador vê as Novas (as dele com mensagem não lida) e as Minhas;
  // Todas fica com o gestor; F362 · Pendentes voltou ao colaborador, para ele assumir quem escreveu e ninguém atende (pedido do Paulo de 02.11.2026);
  // F365 · volta a mostrar todas as pendentes ao colaborador: a leitura de um colega não pode tirá-las da fila (as antigas foram encerradas em 02.11.2026)
  // F594 · a conversa que a IA conduz fica em "Com a IA", fora de Novas e Pendentes, até a IA passar à equipe ou agendar
  const filtros = gestor ? [["novas","Novas"],["minhas","Minhas"],["sem","Pendentes"],["ia","Com a IA"],["todas","Todas"]]
                         : [["novas","Novas"],["minhas","Minhas"],["sem","Pendentes"],["ia","Com a IA"]];
  if(zapFiltro==="retornos") zapFiltro = gestor ? "todas" : "novas";
  if(!gestor && zapFiltro==="todas") zapFiltro = "novas";
  const naAba = (f,c) => f==="novas" ? meu(c)&&aberta(c)&&c.nao_lidas>0&&!comIaZap(c)
                       : f==="minhas" ? meu(c)&&aberta(c) : f==="sem" ? !c.atendente_id&&aberta(c)&&!comIaZap(c)
                       : f==="ia" ? comIaZap(c)
                       : f==="fim" ? !aberta(c)&&!c.automatica : f==="auto" ? !!c.automatica
                       : f==="retornos" ? !!retornoDe(c) : aberta(c);
  const q = dsa(zapBusca.trim()), qd = zapBusca.replace(/\D/g,"");
  const visiveis = zapConvs.filter(zapVisivel);
  // a conversa lida sai das Novas: o número do menu acompanha, em vez de ficar o da carga
  if(zapAbaAuto && zapConvs.length){ zapAbaAuto = false;
    if(zapFiltro==="novas" && !visiveis.some(c=>naAba("novas",c)) && visiveis.some(c=>naAba("sem",c))) zapFiltro = "sem"; }
  const nRes = contaZapResumo(visiveis); if(nRes!==D.zapResumo){ D.zapResumo = nRes; montarSidebar(); marcarBarraCel(); }
  // F410 · com texto na busca, procura em todas as filas, encerradas inclusive (pedido do Paulo de 05.11.2026)
  const buscando = q.length>=2 || qd.length>=4;
  let cs = visiveis.filter(c=>(buscando || naAba(zapFiltro,c))
    && (!zapChips.atendente || c.atendente_id===zapChips.atendente)
    && (!q || dsa(nomeDaConversa(c)+" "+((clienteDaConversa(c)||{}).nome||"")).includes(q) || (qd.length>=4 && String(c.telefone||"").includes(qd)))
    && (!zapChips.naoLidas || c.nao_lidas)
    && (!zapChips.setor || c.setor_id===zapChips.setor)
    && (!zapChips.etiqueta || (zapAux.convEtq.get(c.id)||[]).includes(zapChips.etiqueta)));
  // na aba Retornos, pela hora marcada; nas outras, fixadas e depois o dia da última mensagem
  let lista;
  if(zapFiltro==="retornos"){
    lista = cs.sort((a,b)=>(retornoDe(a).quando<retornoDe(b).quando?-1:1)).map(c=>cartaoConversa(c)).join("");
  } else {
    const hj = hoje(), ont = dataSP(new Date(Date.now()-864e5).toISOString());
    const grupo = c => buscando && !aberta(c) ? "Encerradas" : c.fixada ? "Fixadas" : !c.ultima_em ? "Antes" : dataSP(c.ultima_em)===hj ? "Hoje"
                     : dataSP(c.ultima_em)===ont ? "Ontem" : "Antes";
    lista = ["Fixadas","Hoje","Ontem","Antes","Encerradas"].map(g=>{
      const gs = cs.filter(c=>grupo(c)===g);
      return gs.length ? `<p class="zl-grupo">${g}</p>${gs.map(c=>cartaoConversa(c)).join("")}` : "";
    }).join("");
  }
  const p = estadoPonte();
  const busca = document.getElementById("zl-busca"), comFoco = document.activeElement===busca;
  // o select fica invisível por cima do rótulo: no celular ele precisa de 16 px (senão o iPhone dá zoom), e o rótulo segue com 12 px
  const sel = (id, rot, itens, atual) => `<label class="zl-sel ${atual?"on":""}"><span class="sr">${rot}</span>
      <span class="zl-sel-rot" aria-hidden="true">${esc((itens.find(([v])=>v===atual)||[,rot])[1])}</span>
      <select id="${id}"><option value="">${rot}</option>
      ${itens.map(([v,t])=>`<option value="${v}" ${atual===v?"selected":""}>${esc(t)}</option>`).join("")}</select>${zic("baixo",12)}</label>`;
  // a lista se repinta a cada 6 s: sem guardar a rolagem, ela voltava ao topo no meio da leitura
  // F687 · no celular quem rola é a coluna .meio, não a .zl-lista: guarda as duas
  const rolLista = (document.querySelector(".zl-lista")||{}).scrollTop || 0, meio = document.querySelector(".meio"), rolMeio = meio ? meio.scrollTop : 0;
  const lado = document.querySelector(".zap-lado");
  const html =
    `<div class="zl-cab">
       <div class="zl-topo"><h2>WhatsApp</h2>
         ${zapComProblema()?"":`<button class="zap-estado" onclick="abrirConexaoZap()" title="conexão do WhatsApp: ${esc(p.txt)}"><i style="background:${p.cor}"></i>conectado</button>`}
         <button class="tl-bt zl-on ${eu&&eu.zap_offline_desde?"off":""}" onclick="estadoZap()" aria-pressed="${!(eu&&eu.zap_offline_desde)}" title="${eu&&eu.zap_offline_desde?"Offline: o contato que você assumiu recebe a mensagem automática. Toque para ficar online.":"Online. Toque para ficar offline e editar a mensagem automática."}"><i aria-hidden="true"></i>${eu&&eu.zap_offline_desde?"Offline":"Online"}</button>
         <button class="tl-bt" onclick="novoContatoZap()" title="Conversar com um número novo" aria-label="Novo contato">＋<span class="sr-only"> Novo contato</span></button>
         ${/* F274 · som, Encerradas e Painel da equipe no ⋯; a lista se repinta a cada 6 s, então o ⋯ lembra se estava aberto */""}
         <details class="tl-mais mais-baixo zl-mais"${zapMaisAberto?" open":""} ontoggle="zapMaisAberto=this.open"><summary class="tl-bt tl-bt-ic" aria-label="Mais opções do WhatsApp" title="som, encerradas e painel da equipe">${IC_SVG.mais}</summary>
           <span class="tl-mais-menu" role="menu">
             <button class="tl-mais-it zl-som" role="menuitem" onclick="alternarSomZap()" aria-pressed="${somZapLigado()}">${somZapLigado()?"🔔 Aviso sonoro ligado":"🔕 Aviso sonoro desligado"}</button>
             <button class="tl-mais-it zl-nav" role="menuitem" onclick="alternarNavZap()" aria-pressed="${navZapLigado() && window.Notification && Notification.permission==="granted"}" title="notificação do navegador quando chega mensagem, com o CRM aberto">${navZapLigado() && window.Notification && Notification.permission==="granted"?"🖥 Notificação no navegador ligada":"🖥 Notificar no navegador"}</button>
             <button class="tl-mais-it zl-push" role="menuitem" onclick="alternarPushZap()" aria-pressed="${pushZapLigado()}" title="notificação no celular ou no computador, também com o CRM fechado">${pushZapLigado()?"📱 Aviso neste aparelho ligado":"📱 Avisar neste aparelho"}</button>
             <button class="tl-mais-it zl-hist" role="menuitem" onclick="historicoTodasZap()" title="pede ao celular as mensagens que faltam nas conversas dos últimos 3 dias">📥 Buscar histórico no celular</button>
             <button class="tl-mais-it zl-hora" role="menuitem" onclick="horarioAvisos()" title="das quantas às quantas o aviso chega no aparelho">🕘 Horário dos avisos: ${horaAvisosTxt()}</button>
             <button class="tl-mais-it zl-link ${zapFiltro==="fim"?"on":""}" role="menuitem" onclick="zapMaisAberto=false" data-zf="fim">Encerradas${zapFiltro==="fim"?` (${cs.length})`:""}</button>
             ${visiveis.some(c=>c.automatica)?`<button class="tl-mais-it zl-link ${zapFiltro==="auto"?"on":""}" role="menuitem" onclick="zapMaisAberto=false" data-zf="auto" title="robô de outra empresa (F272)">Automáticas${zapFiltro==="auto"?` (${cs.length})`:""}</button>`:""}
             ${gestor?`<button class="tl-mais-it zl-link ${zapPainelAberto?"on":""}" role="menuitem" onclick="abrirPainelZap()" title="Painel da equipe"><span aria-hidden="true">Equipe</span><span class="sr-only">Painel da equipe</span></button>`:""}
           </span></details></div>
       ${zapComProblema()?`<button class="zap-estado ruim zl-faixa" onclick="abrirConexaoZap()" title="conexão do WhatsApp: ${esc(p.txt)}"><i style="background:${p.cor}"></i><span>${esc(p.txt)}</span><b>${cfgApp("zap_qr")?"Ler QR code":"Corrigir conexão"}</b></button>`:""}
       <label class="zl-busca">${zic("busca")}<input type="search" id="zl-busca" value="${esc(zapBusca)}"
         placeholder="Nome, telefone ou mensagem" aria-label="Buscar em todas as conversas"></label>
       <div class="zl-filas${filtros.length>4?" cinco":""}" role="tablist" aria-label="Filas" style="grid-template-columns:repeat(${filtros.length},minmax(0,1fr))">${filtros.map(([f,r])=>{
          const n = visiveis.filter(c=>naAba(f,c)).length;
          return `<button role="tab" aria-selected="${zapFiltro===f}" class="${zapFiltro===f?"on":""} ${f}" data-zf="${f}">${r}${n?` <span class="n">${n}</span>`:""}</button>`;
        }).join("")}</div>
       <div class="zl-chips">
         <button class="zl-chip ${zapChips.naoLidas?"on":""}" data-zch="naoLidas" aria-pressed="${zapChips.naoLidas}">Não lidas</button>
         ${zapAux.setores.length?sel("zf-setor","Setor",zapAux.setores.map(s=>[s.id,s.nome]),zapChips.setor):""}
         ${zapAux.etiquetas.length?sel("zf-etq","Etiqueta",zapAux.etiquetas.map(e=>[e.id,e.texto]),zapChips.etiqueta):""}
         ${gestor?sel("zf-atend","Atendente",equipeAtiva().map(c=>[c.id,c.nome]),zapChips.atendente):""}
       </div>
     </div>
     <div class="zl-lista">${lista || (zapAchados.length?"":`<p class="meio-sub" style="padding:8px 6px">Nenhuma conversa aqui.</p>`)}
       ${zapAchados.length?`<p class="zl-grupo">Nas mensagens (${zapAchados.length})</p>${zapAchados.map(achadoZap).join("")}`:""}</div>`;
  // a volta de 6 s sem novidade não troca a lista debaixo do dedo (no iPhone a troca interrompia a rolagem e a devolvia ao topo)
  if(lado._html === html) return;
  lado.innerHTML = lado._html = html;
  const zl = document.querySelector(".zl-lista"); if(zl) zl.scrollTop = rolLista;
  if(meio) meio.scrollTop = rolMeio;
  document.querySelectorAll("[data-zf]").forEach(b=>b.onclick=()=>{ zapFiltro=b.dataset.zf; pintarListaZap(); });
  document.querySelectorAll("[data-zch]").forEach(b=>b.onclick=()=>{ zapChips[b.dataset.zch]=!zapChips[b.dataset.zch]; pintarListaZap(); });
  const fs = document.getElementById("zf-setor"); if(fs) fs.onchange=()=>{ zapChips.setor=fs.value; pintarListaZap(); };
  const fe = document.getElementById("zf-etq"); if(fe) fe.onchange=()=>{ zapChips.etiqueta=fe.value; pintarListaZap(); };
  const fa = document.getElementById("zf-atend"); if(fa) fa.onchange=()=>{ zapChips.atendente=fa.value; if(fa.value) zapFiltro="todas"; pintarListaZap(); };
  const b2 = document.getElementById("zl-busca");
  b2.oninput = ()=>{ zapBusca=b2.value; pintarListaZap();
    clearTimeout(zapBuscaT); zapBuscaT = setTimeout(buscarNasMensagens, 400); };
  document.querySelectorAll("[data-za]").forEach(el=>el.onclick=async()=>{
    const [cv, msg] = el.dataset.za.split("|");
    await abrirConversa(cv, true); irParaMsg(msg);
  });
  // a lista repinta a cada 6 s: quem está digitando a busca não pode perder o cursor
  if(comFoco){ b2.focus(); b2.setSelectionRange(b2.value.length, b2.value.length); }
  document.querySelectorAll("[data-zc]").forEach(el=>el.onclick=()=>abrirConversa(el.dataset.zc, true));
}

