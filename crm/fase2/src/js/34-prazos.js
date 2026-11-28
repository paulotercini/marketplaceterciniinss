const _feriadosAno = new Map();
function feriadosNacionais(ano){
  if(!_feriadosAno.has(ano)){
    const p = pascoa(ano), s = new Set(FERIADOS_FIXOS.map(md=>`${ano}-${md}`));
    [-48,-47,-2,60].forEach(n=>s.add(somaDias(p,n)));   // carnaval (2ª e 3ª), sexta-feira santa, corpus christi
    _feriadosAno.set(ano, s);
  }
  return _feriadosAno.get(ano);
}
// os locais e forenses do escritório: "dd/mm" (todo ano) ou "dd/mm/aaaa"
const feriadosExtra = () => String(cfgApp("feriados_extra")||"").split(/[,;\s]+/).filter(Boolean);
function ehFeriado(iso){
  if(feriadosNacionais(+iso.slice(0,4)).has(iso)) return true;
  const dm = iso.slice(8,10)+"/"+iso.slice(5,7);
  return feriadosExtra().some(f=>f===dm || f===dm+"/"+iso.slice(0,4));
}
const ehDiaUtil = iso => { const w=new Date(iso+"T12:00:00").getDay(); return w!==0 && w!==6 && !ehFeriado(iso); };
// 02.11.2026 · no prazo administrativo (INSS e CRPS) o ponto facultativo NÃO prorroga: carnaval e Corpus Christi não
// são feriado em lei federal (Lei 9.093/1995), e o vencimento que cai neles vale no próprio dia. A conta judicial segue
// o ehDiaUtil, porque o tribunal não tem expediente nesses dias
const PONTO_FACULTATIVO = [-48,-47,60];   // dias contados da Páscoa: segunda e terça de carnaval, Corpus Christi
const ehPontoFacultativo = iso => PONTO_FACULTATIVO.some(n=>somaDias(pascoa(+iso.slice(0,4)), n)===iso);
const ehDiaUtilAdm = iso => { const w=new Date(iso+"T12:00:00").getDay();
  return w!==0 && w!==6 && (ehPontoFacultativo(iso) || !feriadosNacionais(+iso.slice(0,4)).has(iso)); };
function proxDiaUtilAdm(iso){ let d = iso; while(d && !ehDiaUtilAdm(d)) d = somaDias(d, 1); return d; }
const emRecessoForense = iso => { const md=iso.slice(5); return md>="12-20" || md<="01-20"; };
// F384 · os feriados da Justiça Federal (Lei 5.010/1966, art. 62): a quarta e a quinta-feira da Semana Santa, 11 de agosto,
// 1º e 2 de novembro e 8 de dezembro. O carnaval e a sexta-feira santa já estão em feriadosNacionais, e o 20/12 a 06/01
// no recesso. O processo é federal pelo número CNJ (segmento 4) ou pelo rito do JEF; sem isso, o calendário é o geral
const FERIADOS_JF = ["08-11","11-01","11-02","12-08"];
const ehFeriadoJF = iso => FERIADOS_JF.includes(iso.slice(5)) || [-4,-3].some(n=>somaDias(pascoa(+iso.slice(0,4)), n)===iso);
function ehJusticaFederal(k){
  if(!k) return false;
  const nums = [k.processo, ...(Array.isArray(k.processos) ? k.processos.map(x=>x && (x.numero||x)) : [])].filter(Boolean);
  for(const n of nums){ const d = String(n).replace(/\D/g,""); if(d.length===20) return d[13]==="4"; }
  return (dadosJudiciais(k)||{}).rito==="JEF";
}
const casoDaTelaPz = () => (typeof casoSel==="string" && casoSel!=="__auto__" && D.casoPorId && D.casoPorId.get(casoSel)) || null;
// da data da intimação (excluída) à data fatal, pela regra do item; `k` (o caso) escolhe o calendário do tribunal
function contarPrazo(de, item, k){
  if(!de || !item) return "";
  let d = de;
  if(item.uteis){
    const jf = ehJusticaFederal(k);
    let c = 0;
    while(c < item.n){ d = somaDias(d,1); if(ehDiaUtil(d) && !emRecessoForense(d) && !(jf && ehFeriadoJF(d))) c++; }
    return d;
  }
  d = somaDias(de, item.n);
  while(!(item.dec ? ehDiaUtil(d) : ehDiaUtilAdm(d))) d = somaDias(d, item.dec ? -1 : 1);
  return d;
}
// o widget: catálogo + "intimado em", ao lado de um campo de data fatal.
// `alvo` é o id do campo que recebe a data (por padrão, `${p}-prazo`).
const catPrazo = {};
function catalogoPrazoHtml(p, alvo){
  return `<span class="cat-prazo" data-alvo="${alvo||p+"-prazo"}">
    <select id="${p}-cat" onchange="aplicarCatalogoPrazo('${p}')" title="escolha o prazo pelo nome: a data fatal é contada a partir da intimação">
      <option value="">…ou calcule pelo catálogo</option>
      ${PRAZOS_CATALOGO.map(x=>`<option value="${x.id}">${esc(x.rot)} · ${x.n} dias${x.uteis?" úteis":""}</option>`).join("")}
    </select>
    <label class="meio-sub">intimado em <input type="date" id="${p}-de" value="${hoje()}" onchange="aplicarCatalogoPrazo('${p}')"></label>
    <span class="cat-base" id="${p}-cat-base"></span></span>`;
}
function aplicarCatalogoPrazo(p){
  const sel=document.getElementById(`${p}-cat`), base=document.getElementById(`${p}-cat-base`);
  const de=(document.getElementById(`${p}-de`)||{}).value||"";
  const item=PRAZOS_CATALOGO.find(x=>x.id===(sel||{}).value);
  const alvo=document.getElementById((sel&&sel.closest(".cat-prazo")||{dataset:{}}).dataset.alvo||`${p}-prazo`);
  if(!item || !de){ delete catPrazo[p]; if(base){ base.textContent=""; base.classList.remove("venceu"); } return; }
  const k=casoDaTelaPz(), fatal=contarPrazo(de, item, k);
  catPrazo[p]={...item, de, fatal, jf: item.uteis && ehJusticaFederal(k)};
  if(alvo){ alvo.value=fatal; alvo.dispatchEvent(new Event("change")); }
  if(base){
    base.textContent=`${item.n} dias ${item.uteis?"úteis":"corridos"} de ${fmt(de)} → fatal ${fmt(fatal)} (${item.base})`
      + (fatal<hoje()?" ⚠ já venceu":"");
    base.classList.toggle("venceu", fatal<hoje());
  }
}
// o carimbo da anotação: de que é o prazo e de onde a data saiu. Só entra se
// a data gravada for a que o catálogo calculou (trocou à mão, fica só a data).
function carimboCatalogo(p, prazo){
  const c=catPrazo[p]; if(!c || !prazo || c.fatal!==prazo) return "";
  return `${c.rot} — ${c.n} dias${c.uteis?" úteis":" corridos"} (${c.base}), intimação de ${fmt(c.de)}. `;
}
function tfPessoa(id, btn){
  if(!Array.isArray(tfQuem)) tfQuem=[];
  tfQuem = tfQuem.includes(id) ? tfQuem.filter(x=>x!==id) : [...tfQuem, id];
  btn.classList.toggle("on");
  const nix=document.getElementById("tf-ninguem");
  if(nix) nix.classList.remove("on");
}
function tfNinguem(btn){
  tfQuem = [];
  document.querySelectorAll("#tf-box .tf-eq.on").forEach(b=>b.classList.remove("on"));
  btn.classList.add("on");
}
// F41 · a equipe inteira em um clique (clicar de novo desfaz)
function tfTodos(){
  const todos = equipeAtiva().map(c=>c.id);
  const jaTodos = Array.isArray(tfQuem) && tfQuem.length===todos.length;
  tfQuem = jaTodos ? [] : todos;
  document.querySelectorAll("#tf-box .tf-eq").forEach(b=>b.classList.toggle("on", !jaTodos));
  const nix=document.getElementById("tf-ninguem"); if(nix) nix.classList.remove("on");
}
function tfDia(qual, el){
  if(qual==="sem" && tfQuem && tfQuem.length)
    // tarefa para alguém precisa de data: o "sem lembrete" só vale sem gente
    return aviso("Tarefa para alguém precisa de data — escolha quando lembrar");
  document.querySelectorAll("#tf-box .tf-dt.on").forEach(b=>b.classList.remove("on"));
  tfData = qual==="sem" ? null
         : qual==="hoje" ? hoje()
         : qual==="amanha" ? maisDias(1)
         : /^\d{1,3}$/.test(qual) ? maisDias(+qual)   // "7", e o "+3 dias" da F182
         : qual;                                   // veio do input de data
  if(el && el.classList && el.classList.contains("tf-dt")) el.classList.add("on");
  // veio do calendário: quem fica aceso é o botão "Escolher a data"
  const inp=document.getElementById("tf-data"), bt=document.getElementById("tf-escolher");
  if(el===inp && bt){ bt.classList.add("on"); bt.textContent = fmt(qual); }
  else if(inp && el!==inp){ inp.style.display="none"; inp.value="";
    if(bt) bt.textContent="Escolher a data"; }
}

// ══════════════════════════════════════════════════════════════════════════
// F38 · TAREFAS COM PRAZO — o controle apertado do Paulo, dentro do CRM
// ══════════════════════════════════════════════════════════════════════════
// Prazo processual não se perde. A anotação marcada como prazo move o caso
// para 🗓 Tarefas com Prazo (fase "outro" + mover_para, como o select de
// listas já faz), guarda de onde ele veio em ronda.prazo_de, e a lista
// ordena pela data fatal. Cumprido, o caso volta à lista de origem — a
// proposta vem pronta, o seletor deixa trocar (regra da volta).
// Com a escrita CRM→To Do desligada, mover_para fica gravado e o To Do
// acompanha quando o ESCREVER_TODO ligar.
const LISTAS_VOLTA=[["🌻 INSS","inss"],["🖥 Conselho de Recursos","conselho"],
  ["👪 Judicial","judicial"],["💡 Petições Iniciais","peticao_inicial"]];
async function marcarTarefaComPrazo(casoId, data){
  const k=D.casoPorId.get(casoId); if(!k) return;
  // F236 · o caso que já está no 🗓 Tarefas com Prazo guarda a lista de onde veio da primeira vez
  const de = (k.fase==="outro" && (k.ronda||{}).prazo_de) || listaDe(k);
  const ronda={...(k.ronda||{}), prazo_de:de};
  k.prazo=data; k.fase="outro"; k.mover_para="🗓 Tarefas com Prazo"; k.ronda=ronda;
  await patchCaso(k.id, {prazo:data, fase:"outro",
    mover_para:"🗓 Tarefas com Prazo", ronda}).catch(()=>{});
  aviso(`⏰ Prazo fatal ${fmt(data)} — o caso foi para 🗓 Tarefas com Prazo (veio de ${de})`);
  montarSidebar();
}
// a lista para onde o caso volta ao sair de 🗓 Tarefas com Prazo: a de onde veio, senão a da fase
function listaDeVolta(k){
  const de = (k.ronda||{}).prazo_de;
  return LISTAS_VOLTA.some(([l])=>l===de) ? de
    : (LISTAS_VOLTA.some(([l])=>l===k.origem_lista) ? k.origem_lista
    : ((LISTAS_VOLTA.find(([,f])=>f===faseEfetiva(k))||[])[0] || "👪 Judicial"));   // F236
}
const naFilaDoPrazo = k => k.mover_para==="🗓 Tarefas com Prazo" || (k.fase==="outro" && !!(k.ronda||{}).prazo_de);
// a anotação que criou o prazo, as tarefas abertas de quem executa e de quem revisa
function prazoDaAnotacao(k, andId){
  const og = andId ? (D._andsFicha||[]).find(a=>a.id===andId) : null;
  const o = og ? {id: og.id, texto: semCarimboPz(og.texto)} : origemDoPrazo(k);
  const ogA = o && (D._andsFicha||[]).find(a=>a.id===o.id);
  const m = ogA && /\[PRAZO ([0-9.]+)\]/.exec(ogA.texto||"");
  const ts = o ? (D.tarefasPorCaso.get(k.id)||[]).filter(t=>t.andamento_id===o.id && !t.concluida_em) : [];
  return {og: o, data: m ? isoDoCarimbo(m[1]) : k.prazo, exec: ts.filter(t=>t.papel!=="revisa"), rev: ts.filter(t=>t.papel==="revisa")};
}
// F326 · REGISTRAR O CUMPRIMENTO (regra combinada em 31.10.2026): o prazo fatal está cumprido com o andamento
// "✔ [PRAZO CUMPRIDO]" em resposta à anotação que o criou, ou com a tarefa fatal concluída. Aqui se grava a resposta
// (com a data, quando não é hoje, e o comprovante), se baixa o prazo do caso, se concluem as tarefas de quem executa,
// se avisa quem revisa e, na fila 🗓 Tarefas com Prazo, o caso volta à lista de onde veio. Tudo com desfazer.
// tipo "nao" registra o prazo perdido (✖ [PRAZO NÃO CUMPRIDO], avisa o advogado) e "nsa" o prazo que não se aplica.
async function registrarCumprimento(casoId, o){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const tipo = o.tipo || "cumprido", {og, data: dataPz, exec, rev} = prazoDaAnotacao(k, o.andId);
  const antes = {prazo: k.prazo, fase: k.fase, mover_para: k.mover_para||null, ronda: k.ronda||null};
  const corpo = {};
  if(k.prazo && (!dataPz || k.prazo===dataPz)) corpo.prazo = null;
  const lista = o.volta || (naFilaDoPrazo(k) ? listaDeVolta(k) : null);
  if(lista){
    corpo.fase = (LISTAS_VOLTA.find(([l])=>l===lista)||[])[1] || "outro";
    corpo.mover_para = lista;
    corpo.ronda = {...(k.ronda||{})}; delete corpo.ronda.prazo_de;
  }
  const pre = tipo==="nao" ? "✖ [PRAZO NÃO CUMPRIDO]" : tipo==="nsa" ? "✖ [PRAZO NÃO SE APLICA]" : "✔ [PRAZO CUMPRIDO]";
  const feito = (o.texto||"").trim() || (tipo==="nao" ? "O prazo não foi cumprido" : tipo==="nsa" ? "O prazo não se aplica" : "Prazo cumprido");
  const texto = `${pre} ${feito}${tipo==="cumprido" && o.data && o.data!==hoje() ? ` (cumprido em ${fmtBarra(o.data)})` : ""}${
    og || !lista ? "" : ` — o caso saiu de 🗓 Tarefas com Prazo e voltou para ${lista}.`}`;
  let and = null;
  try{
    if(Object.keys(corpo).length){ await patchCaso(k.id, corpo); Object.assign(k, corpo); }
    [and] = await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id: k.id, autor_id: eu.id, texto, ...(og ? {responde_a: og.id} : {})})});
  }catch(e){ return aviso("Não consegui registrar: " + String(e.message||e).slice(0, 80)); }
  if(and){ (D._andsFicha = D._andsFicha || []).unshift(and);
    api(`/rest/v1/andamentos_lidos`,{method:"POST",headers:{Prefer:"return=minimal,resolution=merge-duplicates"},
      body:JSON.stringify({andamento_id: and.id, colaborador_id: eu.id})}).catch(()=>{}); }
  // as tarefas de quem executa saem concluídas, também no não cumprido (o prazo acabou; a resposta diz como); a revisão
  // fica, e quem revisa recebe o aviso
  const concluidas = [];
  if(o.concluir!==false) for(const t of exec){
    try{ await api(`/rest/v1/andamento_tarefas?id=eq.${t.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({concluida_em: new Date().toISOString()})}); t.concluida_em = new Date().toISOString(); concluidas.push(t); }catch(e){}
  }
  if(concluidas.length) D.tarefasPorCaso.set(k.id, (D.tarefasPorCaso.get(k.id)||[]).filter(t=>!concluidas.includes(t)));
  const avisar = [...new Set([...rev.map(t=>t.colaborador_id), ...(tipo==="nao" ? advogadoDoCliente(k.cliente_id, k) : [])])].filter(id=>id && id!==eu.id);
  if(and && avisar.length) await criarMencoes(texto, k.id, and.id, avisar).catch(()=>{});
  // o comprovante vai junto, preso à resposta
  if(and && o.arquivo){
    if(o.arquivo.size > MAX_ARQ) aviso("O comprovante passa de 20 MB e não foi anexado");
    else try{
      const caminho = `prazos/${k.cliente_id}/${hoje()}-${Date.now()}-${nomeSeguro(o.arquivo.name || "comprovante")}`;
      await subirArquivo(caminho, o.arquivo);
      const [an] = await api(`/rest/v1/anexos`,{method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({caso_id: k.id, cliente_id: k.cliente_id, autor_id: eu.id, andamento_id: and.id, origem: "prazo",
          nome: o.arquivo.name || "comprovante", caminho, tipo: o.arquivo.type || null, tamanho: o.arquivo.size})});
      if(an) (D.anexos = D.anexos || []).unshift(an);
    }catch(e){ aviso("Registrei o cumprimento, mas o comprovante não subiu: " + String(e.message||e).slice(0, 60)); }
  }
  _cumprindo = null;
  const msg = tipo==="nao" ? "✖ Registrado: o prazo não foi cumprido" : tipo==="nsa" ? "Registrado: o prazo não se aplica"
    : `✔ Prazo cumprido${lista ? ` · o caso voltou para ${lista}` : ""}`;
  avisoDesfazer(msg, async ()=>{
    if(and) await apagarComprovantes(and.id);
    if(and) await api(`/rest/v1/andamentos?id=eq.${and.id}`,{method:"DELETE",headers:{Prefer:"return=minimal"}}).catch(()=>{});
    for(const t of concluidas){ await api(`/rest/v1/andamento_tarefas?id=eq.${t.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({concluida_em: null})}).catch(()=>{}); t.concluida_em = null; }
    if(concluidas.length) D.tarefasPorCaso.set(k.id, [...(D.tarefasPorCaso.get(k.id)||[]), ...concluidas]);
    if(Object.keys(corpo).length){ await patchCaso(k.id, antes).catch(()=>{}); Object.assign(k, antes); }
    if(and) D._andsFicha = (D._andsFicha||[]).filter(a=>a.id!==and.id);
    montarSidebar(); if(clienteAberto) abrirFicha(clienteAberto);
  });
  montarSidebar(); if(clienteAberto) abrirFicha(clienteAberto);
}
// a janela do cumprimento (o "Cumpri o prazo" da janela do prazo e o ✔ cumprido das listas): o que foi feito, quando,
// o comprovante, concluir a tarefa de quem executa e, na fila 🗓 Tarefas com Prazo, para onde o caso volta
function janelaPrazoCumprido(casoId, andId){
  fecharJanela();
  const k = D.casoPorId.get(casoId); if(!k) return;
  const {og, exec, rev} = prazoDaAnotacao(k, andId), nome = id => ((D.colPorId.get(id)||{}).nome||"").split(" ")[0];
  const sugerida = listaDeVolta(k), naFila = naFilaDoPrazo(k);
  const div = document.createElement("div"); div.id = "janela";
  const ex = [...new Set(exec.map(t=>nome(t.colaborador_id)))].join(" e "), rv = [...new Set(rev.map(t=>nome(t.colaborador_id)))].join(" e ");
  div.innerHTML = `<div class="jan-caixa pzj" role="dialog" aria-labelledby="pzj-t">
    <h3 id="pzj-t">Como o prazo foi cumprido</h3>
    <p class="meio-sub">${esc(tituloCaso(k))}${og ? ` · Prazo: <b>${esc(og.texto.slice(0,140))}</b>` : ""}</p>
    <div class="form-linha pzj-pre">${CONCLUIR_PRESETS.map(t=>
      `<button type="button" class="btn-rap" onclick="document.getElementById('pz-txt').value=this.textContent">${t}</button>`).join("")}</div>
    <label class="sr-so" for="pz-txt">O que foi feito</label>
    <textarea id="pz-txt" rows="2" placeholder="O que foi feito: protocolo, número, resultado"></textarea>
    <div class="pzj-lin">
      <label class="pzj-campo">Cumprido em <input type="date" id="pz-data" value="${hoje()}" max="${hoje()}"></label>
      <label class="pzj-campo pzj-arq">Comprovante <input type="file" id="pz-arq" accept="application/pdf,image/*"></label>
    </div>
    ${exec.length ? `<label class="pzj-ck"><input type="checkbox" id="pz-concluir" checked>Concluir a tarefa de ${esc(ex)}${rv ? ` e avisar ${esc(rv)}, que revisa` : ""}</label>` : ""}
    ${naFila ? `<label class="pzj-campo">O caso sai de 🗓 Tarefas com Prazo e volta para <select id="pz-volta">${LISTAS_VOLTA.map(([l])=>
      `<option value="${esc(l)}" ${l===sugerida?"selected":""}>${esc(l)}</option>`).join("")}</select></label>` : ""}
    <div class="form-linha pzj-pe">
      <button type="button" class="btn-mini" id="pz-cancela">Cancelar</button>
      <button type="button" class="pzj-ok" id="pz-ok" title="Confirmar o cumprimento">Confirmar<span class="sr-only"> o cumprimento</span></button>
    </div>
  </div>`;
  document.body.appendChild(div);
  document.getElementById("pz-cancela").onclick = fecharJanela;
  document.getElementById("pz-ok").onclick = async ()=>{
    const v = id => document.getElementById(id);
    const o = {andId: og && og.id, texto: (v("pz-txt").value||"").trim(), data: v("pz-data").value || hoje(),
      arquivo: (v("pz-arq").files||[])[0] || null, concluir: v("pz-concluir") ? v("pz-concluir").checked : true,
      volta: v("pz-volta") ? v("pz-volta").value : null};
    fecharJanela();
    await registrarCumprimento(casoId, o);
  };
  setTimeout(()=>{ const t = document.getElementById("pz-txt"); if(t) t.focus(); });
}
// o prazo que passou sem o ato: o registro diz o que houve e avisa o advogado do cliente
function registrarNaoCumprido(casoId, andId){
  caixa(`<h3>O prazo não foi cumprido</h3>
    <p class="meio-sub">Diga o que houve. O registro fica na linha do tempo, em resposta à anotação do prazo, e o advogado do cliente é avisado.</p>
    <label class="sr-so" for="pzn-txt">O que houve</label>
    <textarea id="pzn-txt" rows="3" style="width:100%;font:inherit;padding:8px;border:1px solid var(--borda);border-radius:8px" placeholder="Ex.: a cliente não trouxe o relatório a tempo; vamos pedir de novo ao INSS"></textarea>
    <div class="form-linha" style="margin-top:8px"><button class="btn-rap" onclick="fecharCaixa()">Cancelar</button>
      <button class="btn-mini forte" style="margin-left:auto" onclick="(t=>{fecharCaixa();registrarCumprimento('${casoId}',{andId:'${andId||""}',tipo:'nao',texto:t})})(document.getElementById('pzn-txt').value)">Registrar</button></div>`);
}
function naoSeAplica(casoId, andId){
  caixa(`<h3>O prazo não se aplica</h3>
    <p class="meio-sub">Diga por quê. O prazo sai do caso e o registro fica na linha do tempo.</p>
    <label class="sr-so" for="pzs-txt">Por que não se aplica</label>
    <textarea id="pzs-txt" rows="2" style="width:100%;font:inherit;padding:8px;border:1px solid var(--borda);border-radius:8px" placeholder="Ex.: a decisão foi favorável e não há o que recorrer"></textarea>
    <div class="form-linha" style="margin-top:8px"><button class="btn-rap" onclick="fecharCaixa()">Cancelar</button>
      <button class="btn-mini forte" style="margin-left:auto" onclick="(t=>{fecharCaixa();registrarCumprimento('${casoId}',{andId:'${andId||""}',tipo:'nsa',texto:t})})(document.getElementById('pzs-txt').value)">Registrar</button></div>`);
}
async function novoAndamento(casoUnico){
  const sel=document.getElementById("and-caso");
  const casoId = casoUnico || (sel && sel.value);
  const inp=document.getElementById("and-texto");
  if(!casoId || !inp.value.trim()) return;
  const kAlvo=D.casoPorId.get(casoId);
  if(kAlvo && kAlvo.fase==="encerrado" && !honAbertoNoCaso(kAlvo)) return aviso("✔ Processo encerrado — reabra pelo ↺ reabrir, no alto do caso, para comentar");   // F236 · com honorário aberto, a cobrança se anota
  const capE = capturaDoTexto(inp.value);   // F446 · o @ de quem faz e o * da estrela
  const texto=semEstrela(inp.value);
  if(!texto) return;
  // a escolha é OBRIGATÓRIA — mas só onde a caixa de escolha existe
  if(document.getElementById("tf-box")){
    // F182 · chaves desligadas = sem tarefa; lembrete sem pessoa é para quem escreve
    if(document.getElementById("esc-pnl-tf")){
      if(tfNatureza===null){ tfQuem = []; tfData = null; }
      else if(tfNatureza==="lembrete" && tfQuem===null) tfQuem = [];
      if(tfQuem===null) return aviso("Escolha quem faz a tarefa — ou desligue a chave Tarefa");
      if(tfData===undefined || (tfData===null && tfNatureza)) return aviso("Escolha quando — ou desligue a chave "+(tfNatureza==="lembrete"?"Lembrete":"Tarefa"));
    }
    if(tfQuem===null)
      return aviso("Diga para quem é a tarefa — ou marque \"ninguém\"");
    if(tfData===undefined)
      return aviso("Diga quando lembrar — ou marque \"sem lembrete\"");
    if(tfQuem.length && !tfData)
      return aviso("Tarefa para alguém precisa de data — escolha quando lembrar");
  }
  // a ação mais usada do sistema não pode falhar em silêncio: rede caída ou
  // banco recusando têm que virar um aviso, não um clique que "não fez nada"
  // F38 · anotação marcada como TAREFA COM PRAZO exige a data fatal
  const prazoCk=document.getElementById("and-prazo-ck");
  const prazoData=((document.getElementById("and-prazo-data")||{}).value)||"";
  if(prazoCk && prazoCk.checked && !prazoData)
    return aviso("Tarefa com prazo precisa da DATA FATAL — preencha o campo ao lado do ⏰");
  const textoFinal = (prazoCk && prazoCk.checked)
    ? `⏰ [PRAZO ${fmt(prazoData)}] ${carimboCatalogo("and", prazoData)}${texto}` : texto;
  let and;
  // F135 · o botão responde no clique e não aceita segundo clique enquanto
  // grava. ponytail: retorno no botão, não inserção otimista na linha do
  // caso; ela exige desfazer na tela se o banco recusar, fica para depois.
  const btReg=document.querySelector('.escrever button[onclick^="novoAndamento"]');
  if(btReg){ if(btReg.classList.contains("enviando")) return; btReg.classList.add("enviando"); btReg.disabled=true; }
  const soltarBt=()=>{ if(btReg){ btReg.classList.remove("enviando"); btReg.disabled=false; } };
  try{
    [and]=await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:casoId, autor_id:eu.id, texto:textoFinal,
        ...(respondeA?{responde_a:respondeA}:{})})});
  }catch(e){ soltarBt(); return aviso("Não consegui registrar o andamento: "+String(e.message||e).slice(0,120)); }
  delete catPrazo.and;   // F92 · o cálculo desta anotação não vaza para a próxima
  desarmarResposta();
  if(prazoCk && prazoCk.checked && prazoData) await marcarTarefaComPrazo(casoId, prazoData);
  // F326 · o prazo fatal nasce com a tarefa de quem faz (natureza fatal) e a revisão: é ela que diz cumprido
  const pzQ = prazoCk && prazoCk.checked && prazoData && and && document.querySelector("#esc-pnl-pz .pzx-q.on");
  if(pzQ){ try{ await criarTarefasDe(and.id, casoId, [pzQ.dataset.pzq], (document.getElementById("pz-rev")||{}).value||"", prazoData, "fatal"); }
    catch(e){ aviso("⚠ a tarefa do prazo não gravou: "+String(e.message||e).slice(0,80)); } }
  // data sem pessoa: quem escreveu "cobrar em 30 dias" quer ELE MESMO lembrar
  let tfCriouLembrete = false;   // F73: o detector do texto não duplica o tf-box
  let executores = [];
  if(and && document.getElementById("tf-box")){
    const pessoas = (tfQuem&&tfQuem.length) ? tfQuem : (tfData ? [eu.id] : []);
    if(tfNatureza==="compromisso") executores = pessoas;
    tfCriouLembrete = pessoas.length > 0;
    // F160 · o revisor escolhido ao lado dos executores entra com papel próprio
    const revisor = pessoas.length ? ((document.getElementById("tf-rev")||{}).value||"") : "";
    const repetir = tfNatureza && tfData ? regraRepetir((document.getElementById("tf-rep")||{}).value, (document.getElementById("tf-rep-apos")||{}).checked) : null;
    try{ await criarTarefasDe(and.id, casoId, pessoas, revisor, tfData, tfNatureza, repetir); }
    catch(e){ aviso("⚠ a tarefa do lembrete não gravou: "+String(e.message||e).slice(0,80)); }
    tfQuem=null; tfData=undefined; tfNatureza="compromisso";
  }
  tfTocado = false;
  // quem está ATRIBUÍDO ao caso fica sabendo (é essa a função do Atribuído a),
  // além de quem for citado com @ no texto
  await Promise.all([
    // teste 11.88, REC-07: quem recebe a tarefa também é avisado, e não só quem está atribuído ao caso
    criarMencoes(texto, casoId, and?and.id:null, [...(D.atrDoCaso.get(casoId)||[]), ...executores, ...(pzQ ? [pzQ.dataset.pzq] : [])]),
    and ? api(`/rest/v1/andamentos_lidos`,{method:"POST",       // autor já leu
      headers:{Prefer:"return=minimal,resolution=merge-duplicates"},
      body:JSON.stringify({andamento_id:and.id, colaborador_id:eu.id})}).catch(()=>{}) : null]);
  const k=D.casoPorId.get(casoId);
  // registrar o andamento e mudar o lembrete são UM gesto só: quem marcou a
  // data ali no campo não precisa abrir o Lembrar em depois
  // a data que o sistema leu no próprio texto vira o lembrete, sem campo extra
  let lembrou="";
  // F73 · a data lida no texto vira TAREFA DE LEMBRETE (andamento_tarefas),
  // NUNCA mais casos.prazo: o prazo fatal é sagrado — só o ⏰ do checkbox, o
  // quadro 📅 ou o "Concluir em" do To Do (sync) gravam ele. "Verificar em
  // 24/08" num comentário virava PRAZO FATAL fantasma no quadro (pedido do
  // Paulo: prazo fatal só quando o To Do tem data de conclusão).
  if(prazoDetectado && k && !prazoCancelado && and && prazoDespachar && prazoDetectado>hoje() && k.fase!=="encerrado" && !ehPreCaso(k)){
    const dataVolta = prazoDetectado; prazoDetectado = null; prazoDespachar = false;
    aplicarDespacho(k, {data:dataVolta}, "");    // F292 · a anotação já está gravada; o despacho tem o desfazer dele
  } else if(prazoDetectado && k && !prazoCancelado && and){
    if(!tfCriouLembrete){
      try{
        const faz = capE.quem ? capE.quem.id : eu.id;
        const [tf]=await api(`/rest/v1/andamento_tarefas`,{method:"POST",headers:{Prefer:"return=representation"},
          body:JSON.stringify({andamento_id:and.id, caso_id:casoId, colaborador_id:faz,
                               atribuido_por:eu.id, lembrar_em:prazoDetectado, natureza:faz===eu.id ? "lembrete" : "compromisso"})});
        tarefaNaMemoria(tf);
        lembrou=faz===eu.id ? ` · 🗓 lembrete para ${fmt(prazoDetectado)}` : ` · tarefa de ${capE.quem.nome} para ${fmt(prazoDetectado)}`;
      }catch(e){}
    }
  }
  if(capE.estrela && k && !k.importante && and){ k.importante = true; patchCaso(casoId, {importante:true}).catch(()=>{}); }
  prazoDetectado=null; prazoCancelado=false; prazoDespachar=false; capFora={};
  limparRascunho(casoId);      // gravou: o rascunho guardado já cumpriu o papel
  // "DCB 16/09" escrita no comentário vira a data do caso — é assim que a
  // equipe sempre anotou no To Do, e ninguém precisa procurar o campo
  const mdcb = texto.match(/\bDCB\b\D{0,15}?(\d{1,2})[\/\.](\d{1,2})(?:[\/\.](\d{2,4}))?/i);
  if(mdcb && k){
    const dia=mdcb[1].padStart(2,"0"), mes=mdcb[2].padStart(2,"0");
    let ano = mdcb[3] ? (mdcb[3].length===2 ? "20"+mdcb[3] : mdcb[3]) : hoje().slice(0,4);
    let dataDcb = `${ano}-${mes}-${dia}`;
    if(!mdcb[3] && dataDcb < hoje()) dataDcb = `${+ano+1}-${mes}-${dia}`;
    if(!isNaN(new Date(dataDcb+"T12:00:00").getTime()) && k.dcb!==dataDcb){
      k.dcb=dataDcb; k.dcb_prorrogacao_pedida=false;
      k.dcb_prorrogar_em=somaDias(dataDcb, -DIAS_PRORROG);
      await patchCaso(casoId, {dcb:dataDcb, dcb_prorrogacao_pedida:false, dcb_prorrogar_em:k.dcb_prorrogar_em});
      aviso(`🩸 DCB anotada para ${fmt(dataDcb)} — lembrete em ${fmt(k.dcb_prorrogar_em)}, ${DIAS_PRORROG} dias antes`, false);
    }
  }
  // protocolo citado entra na ficha e vira pesquisável ("protocolo 210...")
  const prot=texto.match(/protocolo\D{0,12}(\d{6,})/i);
  const cpA = prot && k && corpoProtocolos(k, [prot[1]]);
  if(cpA){
    await patchCaso(casoId, cpA); Object.assign(k, cpA);
    const cli=D.cliPorId.get(k.cliente_id);
    if(cli) cli._ix += " " + prot[1];
  }
  // "solicitei os documentos: X; Y" no atendimento -> sobe para o checklist
  let docsNovos=0;
  const mdoc=texto.match(/(?:document\w+\s+solicitad\w+|solicitad\w+[^:\n]{0,40}document\w+|solicitei[^:\n]{0,40}document\w+)[^:\n]*:\s*([^\n]+)/i);
  if(mdoc && k){
    const itens=mdoc[1].split(/[;,]/).map(x=>x.trim().replace(/\.$/,"")).filter(x=>x&&x.length<=80).slice(0,15);
    for(const it of itens){
      if(D.tarefas.some(t=>t.caso_id===casoId && t.titulo===`📄 ${it}` && !t.concluida)) continue;
      const [tf]=await api(`/rest/v1/tarefas`,{method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({caso_id:casoId, titulo:`📄 ${it}`})});
      if(tf){ D.tarefas.push(tf); docsNovos++; }
    }
  }
  const sufixoDocs = docsNovos?` · 📄 ${docsNovos} doc(s) no checklist`:"";
  const evs=await extrairEvento(texto, casoId);         // perícias citadas viram agendamentos
  if(evs){
    montarSidebar();
    const nomes=evs.map(e=>`${e.tipo} ${fmt(e.data)}`).join(" e ");
    // próximo passo: perícia em caso judicial pede atendimento presencial antes
    const tituloProx="Agendar atendimento presencial antes da perícia (orientar o cliente)";
    if(k && k.fase==="judicial" && evs.some(e=>/per[íi]cia/i.test(e.tipo)) &&
       !D.tarefas.some(t=>t.caso_id===casoId && !t.concluida && t.titulo===tituloProx)){
      const [tf]=await api(`/rest/v1/tarefas`,{method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({caso_id:casoId, titulo:tituloProx})});
      if(tf) D.tarefas.push(tf);
      aviso(`🩺 Agendado: ${nomes} — 💡 criei no checklist: agendar atendimento presencial antes${sufixoDocs}`);
    } else aviso(`🩺 Agendado automaticamente: ${nomes}!${sufixoDocs}`);
  }
  else aviso((prot?"Andamento registrado — protocolo 📄 guardado na ficha":"Andamento registrado no caso")+sufixoDocs+lembrou);
  abrirFicha(clienteAberto);
}

// a exigência abre pela sugestão "⚠ Exigência do INSS" (não tem mais botão)
function abrirExigencia(){
  const b=document.getElementById("exig-box"); if(!b) return;
  b.style.display = b.style.display==="none" ? "block" : "none";
  const pb=document.getElementById("preenche-box"); if(pb) pb.style.display="none";
  const lb=document.getElementById("lembrar-box"); if(lb) lb.style.display="none";
  if(b.style.display==="block"){
    const d=new Date(hoje()+"T12:00:00"); d.setDate(d.getDate()+30);   // prazo legal de 30 dias
    document.getElementById("ex-prazo").value=d.toLocaleDateString("sv");
    document.getElementById("ex-desc").focus();
  }
}
// apagar o próprio comentário: se já foi replicado, o To Do é limpo na sincronização
// F433 · quem escreveu apaga a anotação ou o prazo: sai das anotações e fica no histórico do caso (andamentos_apagados,
// gravado pelo gatilho do banco com o texto, as tarefas, quem apagou e quando); o prazo apagado leva junto a data do caso
async function apagarAndamento(id, jaNoTodo){
  const a = (D._andsFicha||[]).find(x=>x.id===id) || (D.and30||[]).find(x=>x.id===id);
  const m = a && RX_PRAZO_AND.exec(a.texto||""), dPz = m && isoDoCarimbo((/\d{2}\.\d{2}\.\d{4}/.exec(m[1])||[])[0]);
  if(!await confirmar(m ? "Apagar este prazo? Ele sai das anotações, do quadro Prazos e do Meu Dia, e fica no histórico do caso (⋯ do caso, Apagadas)."
    : "Apagar esta anotação? Ela sai das anotações e fica no histórico do caso (⋯ do caso, Apagadas).")) return;
  const k = a && D.casoPorId.get(a.caso_id), carimbo = m && m[0].trim();
  let pzAntes = null;
  if(k && /^\d{4}-\d{2}-\d{2}$/.test(dPz||"") && k.prazo===dPz && !prazoDoTodo(k)
     && ![D._andsFicha, D.and30].some(l=>(l||[]).some(b=>b.id!==id && b.caso_id===k.id && !b.excluir && (b.texto||"").startsWith(carimbo)))){
    try{ await patchCaso(k.id, {prazo:null}); k.prazo = null; }catch(e){ return aviso("Não apagou: tente de novo"); }
    pzAntes = dPz;
  }
  // F828 · o apagar tem Desfazer, como o Concluir: volta o prazo do caso e regrava a anotação (com as tarefas, no DELETE)
  const voltarPz = async ()=>{ if(pzAntes){ await patchCaso(k.id, {prazo:pzAntes}).catch(()=>{}); k.prazo = pzAntes; } };
  if(jaNoTodo){
    try{ await api(`/rest/v1/andamentos?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({excluir:true})}); }catch(e){ return aviso("Não apagou: tente de novo"); }
    for(const l of [D._andsFicha, D.and30]) for(const b of (l||[])) if(b.id===id) b.excluir = true;
    avisoDesfazer("Apagado: o texto sai do To Do na próxima sincronização e fica no histórico do caso", async ()=>{
      await api(`/rest/v1/andamentos?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({excluir:false})}).catch(()=>{});
      for(const l of [D._andsFicha, D.and30]) for(const b of (l||[])) if(b.id===id) b.excluir = false;
      await voltarPz(); montarSidebar(); if(clienteAberto) abrirFicha(clienteAberto); });
  }else{
    try{ await api(`/rest/v1/andamentos?id=eq.${id}`,{method:"DELETE"}); }catch(e){ return aviso("Não apagou: tente de novo"); }
    // o banco apaga as tarefas junto (ON DELETE CASCADE); a memória acompanha, senão o Meu Dia e o Planejado as mostram até recarregar
    const ts = a && D.tarefasPorCaso.get(a.caso_id), suas = (ts||[]).filter(t=>t.andamento_id===id);
    if(ts) D.tarefasPorCaso.set(a.caso_id, ts.filter(t=>t.andamento_id!==id));
    if(D.and30) D.and30 = D.and30.filter(b=>b.id!==id);
    const msg = m ? "Prazo apagado: fica no histórico do caso" : "Anotação apagada: fica no histórico do caso";
    // sem o texto (linha só do and30) não há o que regravar
    if(!(a && a.texto)) aviso(msg);
    else avisoDesfazer(msg, async ()=>{
      const {id:_i, caso_id, autor_id, criado_em, texto, publico, origem, responde_a, origem_id, zap_mensagem_id} = a;
      try{ await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({id, caso_id, autor_id, criado_em, texto, publico, origem, responde_a, origem_id, zap_mensagem_id})}); }
      catch(e){ return aviso("Não desfez: tente de novo"); }
      for(const t of suas) await api(`/rest/v1/andamento_tarefas`,{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(t)}).catch(()=>{});
      if(suas.length) D.tarefasPorCaso.set(caso_id, [...(D.tarefasPorCaso.get(caso_id)||[]), ...suas]);
      await voltarPz(); montarSidebar(); if(clienteAberto) abrirFicha(clienteAberto); aviso("Anotação de volta", false); });
  }
  abrirFicha(clienteAberto);
}
// F544 · quem escreveu edita a anotação; o gatilho andamento_editado guarda a versão anterior
// (andamentos_editados) e, se ela já foi ao To Do, o texto antigo para a sincronização trocar o bloco lá
function editarAndamento(id){
  const a = (D._andsFicha||[]).find(x=>x.id===id) || (D.and30||[]).find(x=>x.id===id); if(!a) return;
  const pz = RX_PRAZO_AND.exec(a.texto||"");
  caixa(`<h3 style="margin:0 0 4px">Editar anotação</h3>
    <p class="meio-sub" style="margin:0 0 8px">A versão anterior fica no histórico do caso (⋯ do caso, Apagadas).${pz?" O carimbo do prazo não muda.":""}</p>
    <textarea id="ed-and" rows="6" aria-label="texto da anotação" style="width:100%;box-sizing:border-box">${esc(pz ? a.texto.slice(pz[0].length) : (a.texto||""))}</textarea>
    <div style="display:flex;gap:6px;justify-content:flex-end;margin-top:8px">
      <button class="btn-mini" onclick="fecharCaixa()">Cancelar</button>
      <button class="btn-mini pri" id="ed-and-ok" onclick="gravarEdicaoAndamento('${id}')">Salvar</button></div>`);
  setTimeout(()=>{ const t=document.getElementById("ed-and"); if(t){ t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }, 0);
}
async function gravarEdicaoAndamento(id){
  const a = (D._andsFicha||[]).find(x=>x.id===id) || (D.and30||[]).find(x=>x.id===id); if(!a) return;
  const pz = RX_PRAZO_AND.exec(a.texto||""), corpo = ((document.getElementById("ed-and")||{}).value||"").trim();
  if(!corpo) return aviso("Escreva o texto ou use Apagar");
  const texto = (pz ? pz[0] : "") + corpo;
  if(texto===a.texto){ fecharCaixa(); return; }
  try{ await api(`/rest/v1/andamentos?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({texto})}); }
  catch(e){ return aviso("Não editou: tente de novo"); }
  const em = new Date().toISOString();
  for(const l of [D._andsFicha, D.and30]) for(const b of (l||[])) if(b.id===id){ b.texto = texto; b.editado_em = em; }
  fecharCaixa();
  aviso("Anotação editada: a versão anterior fica no histórico do caso");
  abrirFicha(clienteAberto);
}
async function verEdicoes(id){
  let ls;
  try{ ls = await api(`/rest/v1/andamentos_editados?andamento_id=eq.${id}&select=*&order=editado_em.desc`); }
  catch(e){ return aviso("O histórico das edições ainda não está disponível"); }
  const nome = c => ((D.colPorId.get(c)||{}).nome||"").split(" ")[0] || "alguém";
  caixa(`<h3 style="margin:0 0 8px">Versões anteriores</h3>${(ls||[]).length ? `<ul class="apagadas">${ls.map(x=>`<li class="apagada">
    <div class="meio-sub">Substituída por <b>${esc(nome(x.editado_por))}</b> em ${esc(fmtTS(x.editado_em))}</div>
    <div class="apagada-txt">${esc(x.texto_antes||"")}</div></li>`).join("")}</ul>` : `<p class="meio-sub">Nenhuma versão anterior registrada.</p>`}`);
}
// F433 · o histórico do caso: as anotações e os prazos apagados, do mais recente ao mais antigo
async function verApagadas(casoId){
  const k = D.casoPorId.get(casoId); if(!k) return;
  let ls;
  try{ ls = await api(`/rest/v1/andamentos_apagados?caso_id=eq.${casoId}&select=*&order=apagado_em.desc&limit=200`); }
  catch(e){ return aviso("O histórico das anotações apagadas ainda não está disponível"); }
  // a replicada no To Do fica marcada (excluir) até a sincronização tirar o texto de lá e apagá-la
  const marcadas = (await api(`/rest/v1/andamentos?caso_id=eq.${casoId}&excluir=eq.true&select=id,autor_id,texto,criado_em&order=criado_em.desc`).catch(()=>[])||[])
    .map(x=>({...x, apagado_por:x.autor_id, apagado_em:null}));
  ls = [...marcadas, ...(ls||[])];
  const eds = (await api(`/rest/v1/andamentos_editados?caso_id=eq.${casoId}&select=*&order=editado_em.desc&limit=200`).catch(()=>[])) || [];
  const nome = id => ((D.colPorId.get(id)||{}).nome||"").split(" ")[0] || "alguém";
  const tfs = x => (x.tarefas||[]).map(t=>`${t.natureza==="fatal"?"prazo fatal":t.papel==="revisa"?"revisão":"tarefa"} de ${esc(nome(t.colaborador_id))}${t.lembrar_em?` para ${esc(fmt(t.lembrar_em))}`:""}${t.concluida_em?" (concluída)":""}`).join("; ");
  caixa(`<h3 style="margin:0 0 4px">Anotações apagadas <small class="meio-sub">· ${esc(tituloCaso(k))}</small></h3>
    <p class="meio-sub" style="margin:0 0 8px">Quem escreveu pode apagar a anotação ou o prazo. Ela sai das anotações e fica aqui.</p>
    ${(ls||[]).length ? `<ul class="apagadas">${ls.map(x=>`<li class="apagada">
      <div class="meio-sub">Escrita por <b>${esc(nome(x.autor_id))}</b> em ${esc(fmtTS(x.criado_em))} · apagada${x.apagado_por?` por <b>${esc(nome(x.apagado_por))}</b>`:""}${x.apagado_em ? ` em ${esc(fmtTS(x.apagado_em))} às ${esc(new Date(x.apagado_em).toLocaleTimeString("pt-BR",{timeZone:"America/Sao_Paulo",hour:"2-digit",minute:"2-digit"}))}` : "; o texto ainda consta no Microsoft To Do"}</div>
      <div class="apagada-txt">${esc(x.texto||"")}</div>${tfs(x)?`<div class="meio-sub">Tinha: ${tfs(x)}</div>`:""}</li>`).join("")}</ul>`
      : `<p class="meio-sub">Nenhuma anotação apagada neste caso.</p>`}
    ${eds.length ? `<h3 style="margin:12px 0 4px">Anotações editadas</h3><ul class="apagadas">${eds.map(x=>`<li class="apagada">
      <div class="meio-sub">Versão anterior, substituída por <b>${esc(nome(x.editado_por))}</b> em ${esc(fmtTS(x.editado_em))}</div>
      <div class="apagada-txt">${esc(x.texto_antes||"")}</div></li>`).join("")}</ul>` : ""}`);
}

// Lembrar em = quando agir + POR QUÊ (padrão dos bons sistemas: data com motivo)
// Os motivos prontos vivem no banco (lembrar_motivos), minerados do histórico
// real do To Do e editáveis no próprio app (✎): criar, renomear, remover e
// escolher em quais listas cada um aparece (listas vazio = todas).
const MOTIVOS_PADRAO=[    // reserva para quem ainda não rodou o schema novo
  "Pedir prorrogação do benefício","Cobrar documentos do cliente","Conferir resposta do INSS",
  "Verificar pagamento","Retornar contato com o cliente","Último dia do prazo"]
  .map(t=>({grupo:"Motivos",texto:t,listas:[],ativo:true}));
let lbEditando=false, lbMotivoEdit=null;
function lbMotivos(){
  const ms=(D.lembrarMotivos&&D.lembrarMotivos.length)?D.lembrarMotivos:MOTIVOS_PADRAO;
  return ms.filter(m=>m.ativo!==false);
}
// (F41) menuLembrar e salvarPrazo saíram: ninguém os chamava — o prazo
// hoje nasce do texto (estilo Todoist) ou do ⏰ tarefa com PRAZO (F38).

// A caixa antiga do Lembrar virou o EDITOR DAS SUGESTÕES: os mesmos textos
// que aparecem embaixo do campo de escrever, editáveis pela equipe.
function lbRender(casoId){
  const b=document.getElementById("lembrar-box"); const k=D.casoPorId.get(casoId);
  if(!b||!k) return;
  const vis=lbMotivos();
  const grupos=[], porGrupo=new Map();
  vis.forEach(m=>{ if(!porGrupo.has(m.grupo)){porGrupo.set(m.grupo,[]); grupos.push(m.grupo);} porGrupo.get(m.grupo).push(m); });
  b.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
      <strong style="font-size:13px">✎ Sugestões de andamento — o que a equipe costuma escrever</strong>
      <button class="btn-mini" onclick="lbEditar('${casoId}')">fechar</button>
    </div>
    <p class="meio-sub" style="margin:2px 0 6px">Clique num texto para alterá-lo, no ✕ para tirar da lista, ou crie um novo abaixo. Sem lista marcada = aparece em todas.</p>
    ${grupos.map(g=>`<div class="form-linha" style="align-items:center;gap:4px;margin:3px 0">
      <span class="meio-sub" style="min-width:86px;font-weight:600">${esc(g)}</span>
      ${porGrupo.get(g).map(m=>`<span style="display:inline-flex;align-items:center;gap:2px"><button class="btn-mini" title="clique para alterar" onclick="lbCarregarForm('${m.id||""}')">${esc(m.texto)}</button><a style="cursor:pointer;color:#B3261E;font-weight:700;padding:0 3px" title="remover" onclick="lbDesativar('${casoId}','${m.id||""}')">✕</a></span>`).join("")}
    </div>`).join("")}
    ${lbFormHtml(casoId)}`;
  b.style.display="block";
}

function lbEditar(casoId){
  const b=document.getElementById("lembrar-box"); if(!b) return;
  if(b.style.display==="block" && lbEditando){ b.style.display="none"; lbEditando=false; return; }
  lbEditando=true; lbMotivoEdit=null; lbRender(casoId);
}
function lbFormHtml(casoId){
  const grupos=[...new Set(lbMotivos().map(m=>m.grupo))];
  const FL=[["escritorio","🙋 Escritório"],["inss","🌻 INSS"],["conselho","🖥 Conselho"],["judicial","👪 Judicial"],
            ["pagamento","💰 Pagamentos"],["peticao_inicial","💡 Petições"],["aposentadoria_futura","🙏 Apos. Futuras"]];
  return `<div style="border-top:1px dashed var(--borda);margin-top:6px;padding-top:6px">
    <strong style="font-size:13px" id="lbm-titulo">＋ Novo motivo</strong>
    <div class="form-linha" style="margin-top:4px">
      <input id="lbm-texto" placeholder="texto do motivo — ex.: Conferir CNIS" style="flex:1;min-width:220px">
      <select id="lbm-grupo" onchange="document.getElementById('lbm-grupo-novo').style.display=this.value==='__novo__'?'':'none'">
        ${grupos.map(g=>`<option>${esc(g)}</option>`).join("")}<option value="__novo__">— novo grupo —</option>
      </select>
      <input id="lbm-grupo-novo" placeholder="nome do novo grupo" style="display:none;min-width:150px">
    </div>
    <div class="form-linha" style="align-items:center;font-size:13px;gap:8px;flex-wrap:wrap">
      <span class="meio-sub">Aparece em:</span>
      ${FL.map(([f,n])=>`<label style="display:flex;gap:3px;align-items:center;cursor:pointer"><input type="checkbox" class="lbm-lista" value="${f}">${n}</label>`).join("")}
    </div>
    <div class="form-linha">
      <button onclick="lbSalvarMotivo('${casoId}')" title="Salvar motivo">Salvar<span class="sr-only"> motivo</span></button>
      <button class="btn-mini" onclick="lbMotivoEdit=null;lbRender('${casoId}')">limpar</button>
    </div></div>`;
}
function lbCarregarForm(id){
  const m=lbMotivos().find(x=>x.id===id); if(!m) return;
  lbMotivoEdit=id;
  document.getElementById("lbm-titulo").textContent="✎ Alterando: "+m.texto;
  document.getElementById("lbm-texto").value=m.texto;
  const sel=document.getElementById("lbm-grupo");
  if([...sel.options].some(o=>o.value===m.grupo)) sel.value=m.grupo;
  document.getElementById("lbm-grupo-novo").style.display="none";
  document.querySelectorAll(".lbm-lista").forEach(c=>c.checked=(m.listas||[]).includes(c.value));
}
async function lbSalvarMotivo(casoId){
  const texto=document.getElementById("lbm-texto").value.trim();
  if(!texto) return aviso("Escreva o texto do motivo");
  let grupo=document.getElementById("lbm-grupo").value;
  if(grupo==="__novo__") grupo=document.getElementById("lbm-grupo-novo").value.trim()||"🙋 Cliente";
  const listas=[...document.querySelectorAll(".lbm-lista:checked")].map(c=>c.value);
  try{
    if(lbMotivoEdit){
      await api(`/rest/v1/lembrar_motivos?id=eq.${lbMotivoEdit}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({texto,grupo,listas})});
      const m=(D.lembrarMotivos||[]).find(x=>x.id===lbMotivoEdit); if(m) Object.assign(m,{texto,grupo,listas});
      aviso("Motivo alterado ✎");
    } else {
      const ordem=Math.max(0,...lbMotivos().map(m=>m.ordem||0))+1;
      const [novo]=await api(`/rest/v1/lembrar_motivos`,{method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({texto,grupo,listas,ordem})});
      if(novo) (D.lembrarMotivos=D.lembrarMotivos||[]).push(novo);
      aviso("Motivo criado ＋");
    }
  }catch(e){ return aviso("Rode o schema.sql mais novo no Supabase para editar os motivos"); }
  lbMotivoEdit=null; lbRender(casoId);
}
async function lbDesativar(casoId,id){
  if(!id) return aviso("Rode o schema.sql mais novo no Supabase para editar os motivos");
  try{
    await api(`/rest/v1/lembrar_motivos?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({ativo:false})});
  }catch(e){ return aviso("Rode o schema.sql mais novo no Supabase para editar os motivos"); }
  const m=(D.lembrarMotivos||[]).find(x=>x.id===id); if(m) m.ativo=false;
  aviso("Motivo removido"); lbRender(casoId);
}
function diaSemana(iso){
  return new Date(iso+"T12:00:00").toLocaleDateString(IDIOMA,{weekday:"long"});
}
async function novaExigencia(){
  const sel=document.getElementById("and-caso");
  const casoId = casoSel || (sel && sel.value) ||
    ((D.casosDoCliente.get(clienteAberto)||[]).filter(k=>k.fase!=="encerrado")[0]||{}).id;
  if(!casoId) return aviso("Cliente sem caso ativo");
  const prazo=document.getElementById("ex-prazo").value;
  if(!prazo) return aviso("Informe o prazo final da exigência");
  const desc=document.getElementById("ex-desc").value.trim();
  const k=D.casoPorId.get(casoId);
  k.exigencia_prazo=prazo; k.exigencia_descricao=desc||null;
  await patchCaso(casoId, {exigencia_prazo:prazo, exigencia_descricao:k.exigencia_descricao});
  await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({caso_id:casoId, autor_id:eu.id,
      texto:`⚠ Exigência do INSS${desc?": "+desc:""}. Prazo final para cumprimento: ${fmt(prazo)}.`})});
  aviso("Exigência registrada — contagem regressiva ligada ⚠");
  montarSidebar(); abrirFicha(clienteAberto);
}
// preenchimento guiado das frases: __/__/____ vira campo de data, __:__ de
// hora e ____ de texto — nada de apagar tracinhos na mão
function montarPreenchimento(texto){
  const box=document.getElementById("preenche-box");
  // A ORDEM É DO MAIS LONGO PARA O MAIS CURTO: `__` casaria antes de
  // `__/__/____` e picotaria a data em pedaços. Faltavam `__/__` e `__` — as
  // frases que os usavam ("orientado sobre __", "aguardar até __/__") abriam
  // a caixa "Complete a frase" SEM nenhum campo para completar.
  const partes=texto.split(/(__\/__\/____|__:__|__\/__|____|__)/);
  let n=0;
  box.innerHTML = `<strong style="font-size:13px">⚡ Complete a frase:</strong>
    <div style="margin:8px 0;line-height:2.1">` + partes.map(p=>{
      if(p==="__/__/____") return `<input type="date" class="pr-campo" data-t="data" id="pr-${n++}" style="padding:3px 6px;border:1px solid var(--borda);border-radius:6px">`;
      if(p==="__:__")      return `<input type="time" class="pr-campo" data-t="hora" id="pr-${n++}" style="padding:3px 6px;border:1px solid var(--borda);border-radius:6px">`;
      if(p==="__/__")      return `<input type="text" class="pr-campo" data-t="txt" id="pr-${n++}" placeholder="dd/mm" maxlength="5" inputmode="numeric" style="padding:3px 6px;border:1px solid var(--borda);border-radius:6px;width:78px">`;
      if(p==="____")       return `<input type="text" class="pr-campo" data-t="txt" id="pr-${n++}" placeholder="…" style="padding:3px 6px;border:1px solid var(--borda);border-radius:6px;width:150px">`;
      if(p==="__")         return `<input type="text" class="pr-campo" data-t="txt" id="pr-${n++}" placeholder="…" style="padding:3px 6px;border:1px solid var(--borda);border-radius:6px;width:150px">`;
      return `<span data-fixo>${esc(p)}</span>`;
    }).join("") + `</div>
    <button onclick="inserirPreenchida()" title="➡ Inserir no andamento">➡ Inserir<span class="sr-only"> no andamento</span></button>
    <button class="btn-mini" onclick="document.getElementById('preenche-box').style.display='none'">cancelar</button>`;
  box.dataset.partes=JSON.stringify(partes);
  box.style.display="block";
  const primeiro=box.querySelector(".pr-campo"); if(primeiro) primeiro.focus();
}
function inserirPreenchida(){
  const box=document.getElementById("preenche-box");
  const partes=JSON.parse(box.dataset.partes);
  const campos=[...box.querySelectorAll(".pr-campo")];
  let i=0;
  const texto=partes.map(p=>{
    // a MESMA lista de padrões do montarPreenchimento: um a menos aqui e o
    // campo preenchido voltaria como tracinho para o andamento do cliente
    if(p==="__/__/____"||p==="__:__"||p==="__/__"||p==="____"||p==="__"){
      const el=campos[i++]; const v=el.value;
      if(!v) return p;                       // não preencheu: fica o tracinho mesmo
      if(el.dataset.t==="data") return fmt(v).replace(/\./g,"/");
      return v;
    }
    return p;
  }).join("");
  const inp=document.getElementById("and-texto");
  // a frase completada entra como mais um item; se a última linha era o que
  // estava sendo digitado, ela toma o lugar dela
  alternarFrase(inp, texto, []);
  box.style.display="none"; inp.focus();
  inp.style.height="auto"; inp.style.height=Math.min(inp.scrollHeight,220)+"px";
}
async function novoCaso(cliId){
  const ben=document.getElementById("nk-ben").value.trim()||null;
  const fase=document.getElementById("nk-fase").value;
  const prazo=document.getElementById("nk-prazo").value||null;
  const c=D.cliPorId.get(cliId);
  const [k]=await api(`/rest/v1/casos`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify({cliente_id:cliId, titulo:c.nome,
      beneficio:ben, fase, prazo, origem_lista:(LISTAS_MOVER.find(([,f])=>f===fase)||["🙋 Escritório"])[0]})});
  D.casos.push(k); D.casoPorId.set(k.id,k);
  if(!D.casosDoCliente.has(cliId)) D.casosDoCliente.set(cliId,[]);
  D.casosDoCliente.get(cliId).push(k);
  await avisarCasoNovo(k.id, cliId, "aberto na ficha do cliente");
  plim(); aviso("Caso criado — a sincronização cria a tarefa no To Do 📋");
  montarSidebar(); casoSel=k.id; abaAtiva=2; abrirFicha(cliId);
}
async function novaFrase(){
  const inp=document.getElementById("nf-texto");
  const t=inp.value.trim(); if(!t) return;
  try{
    const [f]=await api(`/rest/v1/frases_prontas`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({texto:t})});
    if(f) D.frases.push(f);
  }catch(e){ if(e.status!==409) throw e; }
  D.frases.sort((a,b)=>a.texto<b.texto?-1:1);
  inp.value=""; aviso("Frase salva ⚡ — aparece para toda a equipe");
  abrirFicha(clienteAberto);
}
async function novoEvento(){
  const data=document.getElementById("ne-data").value;
  if(!data) return aviso("Escolha a data");
  const linha={caso_id:document.getElementById("ne-caso").value,
    tipo:document.getElementById("ne-tipo").value,
    data_hora:data+"T"+(document.getElementById("ne-hora").value||"09:00")+":00-03:00",
    local:document.getElementById("ne-local").value||null};
  const [nova]=await api(`/rest/v1/eventos`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify(linha)});
  D.eventos.push(nova); aviso("Agendado 🩺"); montarSidebar(); abrirFicha(clienteAberto);
}
// F67 · a caça às fantasmas JÁ gravadas: evento futuro criado pelo leitor de
// texto (só ele grava obs) cuja frase de origem NÃO tem palavra de
// agendamento é suspeito — o leitor antigo aceitava "perícia ... 24/07" de
// qualquer contexto e empurrava data passada para o ano seguinte. O banner
// do Calendário lista, e cada linha se resolve em um clique: ✕ cancelar
// (fantasma) ou ✔ é real (a obs some e a desconfiança acaba).
const RE_AGENDAR=/agendad|marcad|remarcad|reagendad|designad/i;
function evSuspeitos(){
  return (D.eventos||[]).filter(e=>e.status!=="cancelada" && e.obs &&
    dataSP(e.data_hora)>=hoje() && !RE_AGENDAR.test(e.obs));
}
async function manterEvento(id){
  const e=D.eventos.find(x=>x.id===id); if(!e) return;
  await api(`/rest/v1/eventos?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({obs:null})});
  e.obs=null;
  aviso(`✔ ${e.tipo} de ${fmt(dataSP(e.data_hora))} confirmada como real`, false);
  render();
}
// cancelar não apaga: a linha fica na ficha como "cancelada" (histórico),
// mas sai das listas, dos contadores e do cartão do Meu Dia. É a saída para
// perícia desmarcada — e para a fantasma com o ano trocado (a "20.04" da
// Marcela era 20.04.2027, nascida de nota sem ano lida pelo leitor antigo).
async function cancelarEvento(id){
  const e=D.eventos.find(x=>x.id===id); if(!e) return;
  if(!await confirmar(`Cancelar ${e.tipo} de ${fmt(dataSP(e.data_hora))}?`)) return;
  await api(`/rest/v1/eventos?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({status:"cancelada"})});
  e.status="cancelada";
  aviso(`${e.tipo} cancelada — saiu das listas`);
  montarSidebar(); if(clienteAberto) abrirFicha(clienteAberto); else render();
}
// perícia que passou e ACONTECEU: um clique fecha o assunto — vira
// "✔ compareceu" na ficha e para de acenar como pendência
// F236 · e deixa rastro: o andamento curto no caso, a etapa "perícia realizada" (pelo andarEtapa, só para frente;
// com as duas avaliações do INSS feitas, "aguardando análise") e a tarefa de conferir o resultado, no INSS no dia
// útil seguinte (o laudo sai no Meu INSS) e no processo em 15 dias (a juntada do laudo), se ele ainda não chegou
async function registrarDoEvento(e, texto, dia){
  const k = D.casoPorId.get(e.caso_id)||{};
  const [novo]=await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify({caso_id:e.caso_id, autor_id:eu.id, origem:"app", publico:false, texto})}).catch(()=>[])||[];
  if(novo && dia) await criarTarefasDe(novo.id, e.caso_id, [quemDoCaso(k)], "", dia).catch(()=>{});
  return novo;
}
async function compareceuEvento(id){
  const e=D.eventos.find(x=>x.id===id); if(!e) return;
  await api(`/rest/v1/eventos?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({status:"realizada"})});
  e.status="realizada";
  const k=D.casoPorId.get(e.caso_id)||{}, d=dataSP(e.data_hora), t=e.tipo||"Perícia", per=ehPericiaEv(e), jud=k.fase==="judicial";
  const la = per ? (laudoDaPericia(e) || laudoAnexoDaPericia(e)) : null;
  const conf = per && !la ? (x=>x<hoje()?proxDiaUtil(hoje()):x)(proxDiaUtil(somaDias(d, jud?15:1))) : "";
  await registrarDoEvento(e, `✔ ${t} de ${fmt(d)} às ${horaSP(e.data_hora)}: ${ehJulgamentoEv(e)?"aconteceu":"compareceu"}.${
    la?` Laudo já recebido em ${fmt(dataSP(la.criado_em))}.`:conf?` Conferir o resultado (${jud?"a juntada do laudo no processo":"o laudo no Meu INSS / SABI"}) em ${fmt(conf)}.`:""}`, conf);
  if(per){
    const lista = etapasDaFase(k), i = lista.indexOf(k.etapa||"");
    const duas = k.fase==="inss" && (D.eventos||[]).some(x=>x.caso_id===k.id && x.id!==e.id && x.status==="realizada" && ehPericiaEv(x) && palavraDoEv(x.tipo)!==palavraDoEv(e.tipo));
    const alvo = duas ? "aguardando análise" : "perícia realizada";
    if(lista.includes(alvo) && (!k.etapa || (i>=0 && i<lista.indexOf(alvo) && k.etapa!=="em exigência")))
      await andarEtapa(k.id, null, `${t} de ${fmt(d)} realizada`, alvo);
  }
  aviso(`✔ ${t} de ${fmt(d)} marcada como comparecida${conf?` · conferir o resultado em ${fmt(conf)}`:""}`, false);
  montarSidebar(); if(clienteAberto) abrirFicha(clienteAberto); else render();
}
// o cliente faltou: o evento sai da agenda como "não compareceu" e nasce, para hoje, a tarefa de pedir nova data
async function naoCompareceuEvento(id){
  const e=D.eventos.find(x=>x.id===id); if(!e) return;
  const k=D.casoPorId.get(e.caso_id)||{}, d=dataSP(e.data_hora), t=e.tipo||"Perícia";
  if(!await confirmar(`Registrar que o cliente não compareceu ${evFem(t)?"à":"ao"} ${t.toLowerCase()} de ${fmt(d)}? Nasce a tarefa de pedir nova data.`)) return;
  const obs=(e.obs?e.obs+" · ":"")+"✕ não compareceu";
  await api(`/rest/v1/eventos?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({status:"cancelada", obs})});
  e.status="cancelada"; e.obs=obs;
  const passo = /^atendimento/i.test(t) ? "Remarcar o atendimento com o cliente."
    : k.fase==="judicial" ? "Justificar a falta no processo e pedir nova data."
    : "Pedir nova data pelo Meu INSS ou pela Central 135, com a justificativa da falta (atestado, se houver).";
  await registrarDoEvento(e, `✕ ${t} de ${fmt(d)} às ${horaSP(e.data_hora)}: o cliente não compareceu. ${passo}`, hoje());
  aviso(`✕ ${t} de ${fmt(d)}: não compareceu — a tarefa de pedir nova data está no caso`, false);
  montarSidebar(); if(clienteAberto) abrirFicha(clienteAberto); else render();
}
// ganhou outra data: a de agora fica no histórico como remarcada e a nova entra na agenda (a pedir aviso)
function remarcarEvento(id){
  const e=D.eventos.find(x=>x.id===id); if(!e) return;
  const t=e.tipo||"Perícia", o=evFem(t)?"a":"o";
  caixa(`<h3 style="margin:0 0 4px">↻ ${esc(t)} de ${fmt(dataSP(e.data_hora))} remarcad${o}</h3>
    <p class="meio-sub" style="margin:0 0 8px">A nova data entra na agenda; a de ${fmt(dataSP(e.data_hora))} fica no histórico como remarcad${o}.</p>
    <div class="form-linha" style="align-items:center">
      <input type="date" id="rm-data"><input type="time" id="rm-hora" value="${horaSP(e.data_hora)||"09:00"}">
      <input id="rm-local" placeholder="local" value="${esc(e.local||"")}" style="flex:1;min-width:180px">
    </div>
    <div class="form-linha" style="margin-top:12px">
      <button class="btn-rap" onclick="fecharCaixa()">voltar</button>
      <button style="margin-left:auto;padding:9px 18px;border:none;border-radius:8px;background:var(--azul);color:#fff;font-weight:600;cursor:pointer"
        onclick="salvarRemarcacao('${e.id}')" title="Gravar a nova data">Gravar<span class="sr-only"> a nova data</span></button>
    </div>`);
}
async function salvarRemarcacao(id){
  const e=D.eventos.find(x=>x.id===id); if(!e) return;
  const data=(document.getElementById("rm-data")||{}).value||"", hora=(document.getElementById("rm-hora")||{}).value||"09:00";
  const local=((document.getElementById("rm-local")||{}).value||"").trim()||null;
  if(!data) return aviso("Escolha a nova data");
  const t=e.tipo||"Perícia", o=evFem(t)?"a":"o", de=dataSP(e.data_hora);
  try{
    const [novo]=await api(`/rest/v1/eventos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:e.caso_id, tipo:t, status:"agendada", data_hora:`${data}T${hora}:00-03:00`, local})})||[];
    if(novo) D.eventos.push(novo);
    const obs=(e.obs?e.obs+" · ":"")+`↻ remarcad${o} para ${fmt(data)} ${hora}`;
    await api(`/rest/v1/eventos?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({status:"cancelada", obs})});
    e.status="cancelada"; e.obs=obs;
    await registrarDoEvento(e, `↻ ${t} de ${fmt(de)} remarcad${o} para ${fmt(data)} às ${hora}${local?` — ${local}`:""}.`, "");
    fecharCaixa(); plim(); aviso(`↻ ${t} remarcad${o} para ${fmt(data)} às ${hora} — avise o cliente da nova data`, false);
    montarSidebar(); if(clienteAberto) abrirFicha(clienteAberto); else render();
  }catch(err){ aviso("Não consegui remarcar: "+String(err.message||err).slice(0,120)); }
}
// como o status aparece nas listas — 'realizada' vira a palavra do Paulo
const nomeStatusEvento = s => s==="realizada" ? "✔ compareceu" : s;

// ── 📞 O REGISTRO DO AVISO ────────────────────────────────────────────────
// Perícia agendada → o cliente é avisado LOGO. Quem avisou registra aqui em
// dois cliques: avisou, e agendou (ou não) o atendimento presencial de
// preparação — a reunião em que o Paulo instrui sobre o ato pericial, que
// nem todo caso tem. Com atendimento, ele entra na agenda 🩺; a tarefa de
// "avisar" aberta no caso ganha baixa sozinha.
function janelaAvisado(evId){
  const e=D.eventos.find(x=>x.id===evId); if(!e) return;
  const k=D.casoPorId.get(e.caso_id)||{}, c=D.cliPorId.get(k.cliente_id)||{};
  caixa(`<h3 style="margin:0 0 4px">📞 ${esc((c.nome||"cliente").split(" ")[0])} avisado(a) da ${esc(e.tipo.toLowerCase())} de ${fmt(dataSP(e.data_hora))} às ${horaSP(e.data_hora)}</h3>
    <p class="meio-sub" style="margin:0 0 8px">Agendou atendimento presencial de preparação (instruir sobre o ato pericial)?</p>
    <div class="form-linha" style="align-items:center">
      <input type="date" id="av-data" min="${hoje()}" max="${dataSP(e.data_hora)}">
      <input type="time" id="av-hora" value="09:00">
    </div>
    <div class="form-linha" style="margin-top:12px">
      <button class="btn-rap" onclick="salvarAvisado('${evId}', false)">avisado, SEM atendimento</button>
      <button style="margin-left:auto;padding:9px 18px;border:none;border-radius:8px;background:var(--azul);color:#fff;font-weight:600;cursor:pointer"
        onclick="salvarAvisado('${evId}', true)">avisado, COM atendimento</button>
    </div>`);
}
async function salvarAvisado(evId, comAtendimento){
  const e=D.eventos.find(x=>x.id===evId); if(!e) return;
  const data=(document.getElementById("av-data")||{}).value||"";
  const hora=(document.getElementById("av-hora")||{}).value||"09:00";
  if(comAtendimento && !data) return aviso("Escolha a data do atendimento de preparação");
  let texto=`📞 Cliente avisado da ${e.tipo.toLowerCase()} de ${fmt(dataSP(e.data_hora))} às ${horaSP(e.data_hora)}`;
  try{
    if(comAtendimento){
      texto+=` — atendimento de preparação agendado para ${fmt(data)} às ${hora}.`;
      const [prep]=await api(`/rest/v1/eventos`,{method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({caso_id:e.caso_id, tipo:"Atendimento pré-perícia", status:"agendada",
          data_hora:`${data}T${hora}:00-03:00`, local:null})})||[];
      if(prep) D.eventos.push(prep);
    }else texto+=" — sem atendimento de preparação.";
    await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({caso_id:e.caso_id, autor_id:eu.id, origem:"app", publico:false, texto})});
    const obs=(e.obs?e.obs+" · ":"")+"📞 avisado";
    await api(`/rest/v1/eventos?id=eq.${evId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({obs})}).catch(()=>{});
    e.obs=obs;
    // a tarefa aberta de "avisar" deste caso ganha baixa sozinha. F236 · também fora da ficha (o Meu Dia da recepção): o
    // texto vem da ficha, da agenda ou do banco; só a desta perícia (sem data no texto, qualquer uma); e a menção a mim
    // que veio com ela também baixa
    const de = dataSP(e.data_hora), dm = new RegExp(`\\b${de.slice(8,10)}[./]${de.slice(5,7)}\\b`), baixadas = [];
    const abertas = (D.tarefasPorCaso.get(e.caso_id)||[]).filter(t=>!t.concluida_em);
    const falta = abertas.map(t=>t.andamento_id).filter(id=>!(D._andsFicha||[]).some(x=>x.id===id) && textoDoAndamento(id)==null);
    if(falta.length) await buscarTextosAgenda(falta);
    for(const t of abertas){
      const tx = ((D._andsFicha||[]).find(x=>x.id===t.andamento_id)||{}).texto ?? textoDoAndamento(t.andamento_id) ?? "";
      if(/📞 avisar/i.test(tx) && (!/\b\d{1,2}[./]\d{1,2}\b/.test(tx) || dm.test(tx))){
        await api(`/rest/v1/andamento_tarefas?id=eq.${t.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
          body:JSON.stringify({concluida_em:new Date().toISOString()})}).catch(()=>{});
        t.concluida_em=new Date().toISOString();
        D.tarefasPorCaso.set(e.caso_id,(D.tarefasPorCaso.get(e.caso_id)||[]).filter(x=>x.id!==t.id));
        baixadas.push(t.andamento_id);
      }
    }
    if(baixadas.length) await baixarMencoes(baixadas);
    fecharCaixa(); plim();
    aviso(comAtendimento?`✔ Avisado — atendimento de preparação em ${fmt(data)} às ${hora} 🩺`
                        :"✔ Avisado — sem atendimento de preparação", false);
    montarSidebar(); if(clienteAberto) abrirFicha(clienteAberto);
  }catch(err){ aviso("Não consegui registrar o aviso: "+String(err.message||err).slice(0,120)); }
}
// ── 💰 A CORRENTE DE CONFERÊNCIA (regra do Paulo, 13.08) ─────────────────
// André/Ingrid sinalizam um pagamento -> nasce a tarefa de HOJE para Marcos
// E Amanda conferirem (o primeiro que conferir dá baixa nas duas); Marcos ou
// Amanda conferem -> nasce a tarefa de conferência final para o Paulo; o
// Paulo confere e a corrente fecha. Papéis por NOME (não por inicial).
const colPorNome = rx => equipeAtiva().find(c=>rx.test(dsa(c.nome)));
function proximoElo(quemId){
  const nome = dsa((D.colPorId.get(quemId)||{}).nome||"");
  if(/andre|ingrid/.test(nome))
    return {alvos:[colPorNome(/marcos/), colPorNome(/amanda/)].filter(Boolean).filter(c=>c.id!==quemId),
            rotulo:"conferir o pagamento"};
  if(/marcos|amanda/.test(nome))
    return {alvos:[colPorNome(/paulo/)].filter(Boolean).filter(c=>c.id!==quemId),
            rotulo:"conferência final do pagamento"};
  return {alvos:[], rotulo:null};              // o Paulo fecha a corrente
}
// O caso onde a corrente de conferência vai escrever. A parcela que veio da
// lista 💵 Pagamentos do To Do pertence ao CLIENTE e pode não ter caso — aí a
// corrente escreve no processo principal dele. Cliente sem processo nenhum
// (só acerto de honorários) fica sem andamento: a conferência ainda é
// registrada na própria parcela, que é o que importa para o dinheiro.
function casoDaParcela(p){
  // F236 · a parcela sem caso de quem tem dois ou mais não escreve no primeiro caso aberto (era de outro benefício):
  // o "recebido" pergunta de qual caso ela é
  return casoDoPgto(p);
}
async function correnteConferencia(casoId, resumo){
  if(!casoId) return;                 // parcela solta: nada onde escrever
  const {alvos, rotulo} = proximoElo(eu.id);
  if(!alvos.length) return;
  try{
    const [novo]=await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:casoId, autor_id:eu.id, origem:"app", publico:false,
        texto:`💰 ${resumo} — ${rotulo} (lançado por ${((D.colPorId.get(eu.id)||{}).nome||"?").split(" ")[0]}).`})})||[];
    if(!novo) return;
    for(const alvo of alvos){
      const [tf]=await api(`/rest/v1/andamento_tarefas`,{method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({andamento_id:novo.id, caso_id:casoId, colaborador_id:alvo.id,
                             atribuido_por:eu.id, lembrar_em:hoje()})});
      tarefaNaMemoria(tf);
    }
    aviso(`💰 Corrente: ${alvos.map(a=>a.nome.split(" ")[0]).join(" e ")} já ${alvos.length>1?"têm":"tem"} a tarefa de ${rotulo}`, false);
  }catch(e){ console.warn("corrente de conferência:", e.message); }
}
// o "✔ conferi": baixa TODAS as tarefas 💰 abertas do caso (a dupla de
// conferentes conta como uma etapa só) e chama o próximo elo
async function elosDepoisDeConferir(casoId, resumo){
  if(!casoId) return;
  for(const t of [...(D.tarefasPorCaso.get(casoId)||[])].filter(t=>!t.concluida_em)){
    const and=(D._andsFicha||[]).find(x=>x.id===t.andamento_id);
    if(and && /^💰 /.test(and.texto||"")){
      await api(`/rest/v1/andamento_tarefas?id=eq.${t.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({concluida_em:new Date().toISOString()})}).catch(()=>{});
      t.concluida_em=new Date().toISOString();
      D.tarefasPorCaso.set(casoId,(D.tarefasPorCaso.get(casoId)||[]).filter(x=>x.id!==t.id));
    }
  }
  await correnteConferencia(casoId, resumo);
}
async function novoPgto(){
  const casoId=document.getElementById("np-caso").value;
  // F236 · o caso é opcional, como o campo diz: o dinheiro é do cliente
  if(!casoId && !clienteAberto) return aviso("Abra a ficha do cliente para lançar");
  const valor=document.getElementById("np-valor").value;
  if(!valor) return aviso("Informe o valor");
  const data=document.getElementById("np-data").value||hoje();
  const desc=document.getElementById("np-desc").value.trim();
  // 27.11.2026 · ordem do Paulo: Recebido ou A receber, escolhido sempre (antes a data de hoje gravava recebido em silêncio)
  const sit = (document.querySelector('input[name="np-sit"]:checked')||{}).value;
  if(!sit) return aviso("Marque Recebido ou A receber");
  const recebido = sit==="recebido";
  if(recebido && data>hoje()) return aviso("Recebido não tem data futura: marque A receber");
  // o dinheiro é do cliente: o caso é opcional (cliente sem processo lança
  // honorários do mesmo jeito), mas o cliente sempre acompanha a linha
  const linha={caso_id:casoId||null, cliente_id:clienteAberto||null,
    descricao:desc||"Recebimento", valor,
    status:recebido?"recebido":"aberto",
    pago_em:recebido?data:null, vencimento:recebido?null:data,
    conferencias:recebido?[{c:eu.id,em:new Date().toISOString()}]:[]};
  let novo;
  try{ [novo]=await api(`/rest/v1/pagamentos`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify(linha)})||[]; }
  catch(e){ return aviso("Não gravei o lançamento — tente de novo"); }
  if(!novo) return aviso("Não gravei o lançamento — tente de novo");
  D.pagamentos.push(novo);
  aviso(recebido?"Recebimento registrado 💵 — você consta como quem recebeu":"Lançado a receber 💰");
  if(recebido) await correnteConferencia(casoId,
    `Pagamento de ${moeda(+valor)}${desc?` (${desc})`:""} em ${fmt(data)}`);
  abrirFicha(clienteAberto);
}
function lembreteDoEvento(evId){
  const e=D.eventos.find(x=>x.id===evId); if(!e) return null;
  // 00:00 é "hora não informada" (F624): o recado não afirma horário; corrija a hora antes
  if(horaSP(e.data_hora)==="00:00"){ aviso("Hora não informada: corrija a hora no evento antes de avisar o cliente."); return null; }
  const k=D.casoPorId.get(e.caso_id), c=k&&D.cliPorId.get(k.cliente_id);
  // F236 · o julgamento do CRPS não é perícia: o recado não fala em levar documento nem exame
  if(ehJulgamentoEv(e)) return {texto:`Olá, ${((c&&c.nome)||"").split(" ")[0]}! A sessão de julgamento do seu recurso está marcada para ${fmt(dataSP(e.data_hora))} às ${horaSP(e.data_hora)}${e.local?` (${e.local})`:""}. O escritório acompanha e avisa o resultado. Escritório Tercini.`, cli:c};
  const ctx = e.tipo.toLowerCase().includes("aud") ? "audiencia" : "pericia";
  const m = modeloPor(ctx) || (D.modelos||[])[0];
  // sem modelo cadastrado, um lembrete mínimo em vez de quebrar o botão
  const txt = m ? preencher(m.texto, c, e, null)
    : `Olá, ${((c&&c.nome)||"").split(" ")[0]}! Lembrete: ${e.tipo.toLowerCase()} em ${fmt(dataSP(e.data_hora))} às ${horaSP(e.data_hora)}${e.local?`, ${e.local}`:""}. Leve documento com foto e os exames e relatórios médicos. Escritório Tercini.`;
  // F236 · o que o ato do juízo manda levar, e o aviso da falta, vão junto (o ato que cita a data desta perícia)
  const br = fmt(dataSP(e.data_hora)).replace(/\./g,"/");
  const ato = (D.anexos||[]).find(a=>a.caso_id===e.caso_id && /ato ordinat|decis|despach/i.test(a.nome||"") && String(a.texto||"").includes(br));
  const pede = ato ? (String(ato.texto).replace(/\s+/g," ").match(/[^.]*(?:comparecer com|aus[êe]ncia injustificada)[^.]*\./gi)||[]).join(" ").trim() : "";
  return {texto: txt + (pede ? `\n\nO que o juízo pede: ${pede}` : ""), cli: c};
}
async function copiarLembrete(evId){
  const l=lembreteDoEvento(evId);
  if(l) await copiar(l.texto, "Lembrete copiado — cole no WhatsApp 💬");
}
function zapLembrete(evId){
  const l=lembreteDoEvento(evId);
  if(l&&l.cli.telefone)
    window.open("https://wa.me/55"+l.cli.telefone.replace(/\D/g,"")+"?text="+encodeURIComponent(l.texto),"_blank");
}
// encerrar caso: resultado -> honorários? -> Pagamentos ou fim -> caso novo?
// A janela caminha em três perguntas, na ordem em que o escritório pensa:
//   1. Qual foi o resultado?
//   2. Gerou honorários? SIM manda o caso para a fase 💰 Pagamentos (ele
//      fica vivo lá até o dinheiro entrar); NÃO encerra de vez, com autoria.
//   3. Abre um caso novo? Em benefício por incapacidade é o ciclo normal:
//      encerra um requerimento e o próximo já entra — a pergunta poupa o
//      caminho até a aba ＋, que é onde a resposta "sim" desemboca.
function fecharJanela(){ const j=document.getElementById("janela"); if(j) j.remove(); }
// F35 · A REGRA DA VOLTA (decisão permanente do Paulo, 16.08.2026): toda
// transição do CRM precisa do caminho de volta — por erro ou por vontade.
// Reabrir devolve o caso à lista de origem, limpa o encerramento e registra
// quem reabriu. Os lançamentos de honorários ficam como estão.
async function reabrirCaso(casoId){
  const k=D.casoPorId.get(casoId); if(!k || k.fase!=="encerrado") return;
  const fase=(LISTAS_MOVER.find(([l])=>l===k.origem_lista)||[])[1] || "outro";
  const lista=(LISTAS_MOVER.find(([,f])=>f===fase)||[])[0] || k.origem_lista || "—";
  if(!await confirmar(`Reabrir "${tituloCaso(k)}"?\n\nO caso volta para ${lista}, o resultado é limpo e fica registrado quem reabriu. Os honorários lançados não mudam.`)) return;
  // F236 · a etapa de outra fase não volta com o caso (não deixa lixo no portal)
  const limpaEt = !!k.etapa && !etapasAceitas(fase).includes(k.etapa);
  k.fase=fase; k.resultado=null; k.encerrado_em=null; k.encerrado_por=null; if(limpaEt) k.etapa=null;
  const corpo={fase, resultado:null, encerrado_em:null, encerrado_por:null, ...(limpaEt?{etapa:null}:{})};
  try{ await patchCaso(k.id, corpo); }
  catch(e){ delete corpo.encerrado_por; await patchCaso(k.id, corpo); }
  await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({caso_id:k.id, autor_id:eu.id,
      texto:`[DECISÃO] Caso reaberto — voltou para ${lista}.`})}).catch(()=>{});
  aviso(`Caso reaberto — de volta a ${lista} ✔`);
  montarSidebar(); if(clienteAberto) abrirFicha(clienteAberto);
}
function janelaEncerrar(casoId){
  fecharJanela();
  const k=D.casoPorId.get(casoId);
  const div=document.createElement("div"); div.id="janela";
  const ROT={deferido:"✅ Deferido",acordo:"🤝 Acordo",indeferido:"❌ Indeferido",desistencia:"🚪 Desistência"};
  div.innerHTML=`<div class="jan-caixa">
    <h3>✔ Encerrar: ${esc(tituloCaso(k))}</h3>
    <p class="meio-sub">Qual foi o resultado?</p>
    <div class="form-linha">${Object.entries(ROT).map(([r,n])=>`<button class="btn-res" data-res="${r}">${n}</button>`).join("")}</div>
    <div id="jan-hon" style="display:none;margin-top:12px;border-top:1px solid var(--borda);padding-top:10px">
      <p class="meio-sub">O caso gerou honorários?</p>
      <div class="form-linha">
        <button class="btn-res" id="hon-sim">💰 Gerou — enviar para Pagamentos</button>
        <button class="btn-res" id="hon-segue"
          title="benefício concedido, honorários a receber, MAS o processo segue (cumprimento de sentença): lança a cobrança e o caso fica onde está">⚖️ Gerou — e o processo CONTINUA (cumprimento de sentença)</button>
        <button class="btn-res" id="hon-nao">Não gerou — encerrar de vez</button>
      </div>
      <div id="jan-hon-campos" style="display:none;margin-top:10px">
        <p class="meio-sub">O caso vai para a aba <b>💰 Pagamentos</b> e fica lá,
          vivo, até o dinheiro entrar — aí sim se encerra:</p>
        <div class="form-linha">
          <input id="hon-valor" type="number" step="0.01" placeholder="R$ honorários" style="width:140px">
          <input id="hon-venc" type="date" title="vencimento / previsão de recebimento">
          <button id="hon-enviar" title="💰 Enviar para Pagamentos"><span aria-hidden="true">💰 Pagamentos</span><span class="sr-only">💰 Enviar para Pagamentos</span></button>
          <span class="meio-sub">sem valor ainda? envie assim mesmo e lance depois</span>
        </div>
      </div>
    </div>
    <button class="btn-mini" id="jan-cancela" style="margin-top:12px">cancelar</button>
  </div>`;
  document.body.appendChild(div);
  let resultado=null;
  div.querySelectorAll("[data-res]").forEach(b=>b.onclick=()=>{
    resultado=b.dataset.res;
    div.querySelectorAll("[data-res]").forEach(x=>x.style.outline = x===b ? "2px solid var(--azul)" : "");
    document.getElementById("jan-hon").style.display="block";
  });

  // pergunta 3, no lugar da janela: abrir o próximo caso deste cliente?
  const perguntaCasoNovo=(feito)=>{
    const c=D.cliPorId.get(k.cliente_id)||{};
    div.innerHTML=`<div class="jan-caixa">
      <h3>${feito}</h3>
      <p class="meio-sub" style="margin-top:6px">Abrir um <b>caso novo</b> para
        ${esc(c.nome||"este cliente")}? Em benefício por incapacidade é comum:
        encerra um requerimento e o próximo já começa.</p>
      <div class="form-linha" style="margin-top:10px">
        <button id="jan-novo" title="＋ Abrir caso novo"><span aria-hidden="true">＋ Caso</span><span class="sr-only">＋ Abrir caso novo</span></button>
        <button class="btn-mini" id="jan-nao">agora não</button>
      </div>
    </div>`;
    document.getElementById("jan-novo").onclick=async()=>{
      fecharJanela(); plim(); montarSidebar();
      abaAtiva=7;                       // a aba ＋ Novo caso, já pronta
      await abrirFicha(k.cliente_id);
      const ben=document.getElementById("nk-ben");
      if(ben){ ben.value=k.beneficio||""; ben.focus(); }
    };
    document.getElementById("jan-nao").onclick=()=>{
      fecharJanela(); plim(); montarSidebar();
      if(clienteAberto) abrirFicha(clienteAberto);
    };
  };

  // NÃO gerou honorários: encerra de vez, com autoria e hora
  const encerrarDeVez=async()=>{
    if(!resultado) return aviso("Escolha o resultado primeiro");
    k.fase="encerrado"; k.resultado=resultado; k.encerrado_em=new Date().toISOString();
    k.encerrado_por=eu.id;
    // quem encerrou fica no caso; num banco sem a coluna (schema atrasado),
    // grava sem ela em vez de deixar o caso aberto
    const corpo={fase:"encerrado", resultado, encerrado_em:k.encerrado_em, encerrado_por:eu.id};
    try{
      await patchCaso(k.id, corpo);
    }catch(e){
      delete corpo.encerrado_por; k.encerrado_por=null;
      await patchCaso(k.id, corpo);
    }
    await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({caso_id:k.id, autor_id:eu.id,
        texto:`Caso encerrado — resultado: ${resultado.toUpperCase()}. Sem honorários.${resultado==="deferido"?" 🎉":""}`})});
    aviso(`Caso encerrado: ${resultado}`);
    perguntaCasoNovo("✔ Caso encerrado");
  };

  // GEROU honorários: o caso não morre — muda para a fase 💰 Pagamentos
  // F38 · modoSegue: deferido com CUMPRIMENTO DE SENTENÇA pela frente — os
  // honorários se lançam, mas o caso NÃO sai da lista em que está. Não é
  // encerramento: é marco. (Pedido do Paulo, 17.08.2026.)
  let modoSegue=false;
  const enviarPagamentos=async()=>{
    if(!resultado) return aviso("Escolha o resultado primeiro");
    if(!modoSegue){
      k.fase="pagamento"; k.resultado=resultado;
      await patchCaso(k.id, {fase:"pagamento", resultado});
    } else {
      k.resultado=resultado;
      await patchCaso(k.id, {resultado});
    }
    const v=document.getElementById("hon-valor").value;
    if(v){
      const venc=document.getElementById("hon-venc").value||null;
      const recebido = venc && venc<=hoje();
      const [pg]=await api(`/rest/v1/pagamentos`,{method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({caso_id:k.id, cliente_id:k.cliente_id, descricao:"Honorários", valor:v,   // F236 · com o cliente
          status:recebido?"recebido":"aberto", pago_em:recebido?venc:null,
          vencimento:recebido?null:venc,
          conferencias:recebido?[{c:eu.id,em:new Date().toISOString()}]:[]})});
      if(pg) D.pagamentos.push(pg);
    }
    await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({caso_id:k.id, autor_id:eu.id,
        texto: modoSegue
          ? `[DECISÃO] Resultado: ${resultado.toUpperCase()} — honorários${v?` de R$ ${v}`:""} lançados em 💰 Pagamentos; o caso SEGUE em ${listaDe(k)} para o cumprimento de sentença.${resultado==="deferido"?" 🎉":""}`
          : `Resultado: ${resultado.toUpperCase()} — caso enviado para 💰 Pagamentos${v?` (honorários de R$ ${v} lançados)`:""}.${resultado==="deferido"?" 🎉":""}`})});
    if(modoSegue){
      fecharJanela(); plim(); montarSidebar();
      aviso(`⚖️ Honorários lançados — o caso segue em ${listaDe(k)} para o cumprimento de sentença`);
      if(clienteAberto) abrirFicha(clienteAberto);
      return;
    }
    aviso(`💰 Enviado para Pagamentos${v?" — honorários lançados":""}`);
    perguntaCasoNovo("💰 Enviado para Pagamentos");
  };

  document.getElementById("hon-sim").onclick=()=>{
    if(!resultado) return aviso("Escolha o resultado primeiro");
    modoSegue=false;
    document.getElementById("hon-segue").style.outline="";
    document.getElementById("hon-sim").style.outline="2px solid var(--azul)";
    document.getElementById("jan-hon-campos").style.display="block";
    document.getElementById("hon-valor").focus();
  };
  document.getElementById("hon-segue").onclick=()=>{
    if(!resultado) return aviso("Escolha o resultado primeiro");
    modoSegue=true;
    document.getElementById("hon-sim").style.outline="";
    document.getElementById("hon-segue").style.outline="2px solid var(--azul)";
    document.getElementById("jan-hon-campos").style.display="block";
    const bt=document.getElementById("hon-enviar");
    if(bt) bt.textContent="⚖️ Lançar honorários — o caso continua";
    document.getElementById("hon-valor").focus();
  };
  document.getElementById("hon-nao").onclick=encerrarDeVez;
  document.getElementById("hon-enviar").onclick=enviarPagamentos;
  document.getElementById("jan-cancela").onclick=()=>{ fecharJanela(); if(clienteAberto) abrirFicha(clienteAberto); };
}

