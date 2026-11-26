function popAnotacao(chave){
  const P = POPS_ANOTACAO[chave], k = casoSel && D.casoPorId.get(casoSel);
  if(!P || !k) return;
  const opcoes = (arr, sel) => arr.map(o=>`<option ${o===sel?"selected":""}>${esc(o)}</option>`).join("");
  const campo = c => {
    const id = `pa-${c.id}`, req = c.req ? " *" : "";
    let inp;
    if(c.tipo==="textarea") inp = `<textarea id="${id}" rows="3" placeholder="${esc(c.ph||"")}"></textarea>`;
    else if(c.tipo==="check") return `<label class="pop-c pop-ck ${c.larga?"larga":""}"><span><input type="checkbox" id="${id}"> ${esc(c.rot)}</span>${c.dica?`<small>${esc(c.dica)}</small>`:""}</label>`;
    else if(c.tipo==="select"){
      const opts = c.optsPor ? c.optsPor[Object.keys(c.optsPor)[0]] : c.opts;
      inp = `<select id="${id}" ${c.optsPor?`data-optspor='${esc(JSON.stringify(c.optsPor))}'`:""}>${opcoes(opts)}</select>`;
    }
    else if(c.tipo==="equipe") inp = `<select id="${id}"><option value="">—</option>${opcoes(equipeAtiva().map(co=>co.nome.split(" ")[0]))}</select>`;
    else inp = `<input id="${id}" type="${c.tipo}" placeholder="${esc(c.ph||"")}" ${c.padrao==="hoje"?`value="${hoje()}"`:""}>`;
    return `<label class="pop-c ${c.larga?"larga":""}"><span>${esc(c.rot)}${req}</span>${inp}</label>`;
  };
  caixa(`<h3 style="margin:0 0 10px">${esc(P.rot)} <small class="meio-sub">· ${esc(tituloCaso(k))}</small></h3>
    <div class="pop-campos">${P.campos.map(campo).join("")}
      <label class="pop-c larga"><span>Observação</span><textarea id="pa-obs" rows="2" placeholder="o que mais importa registrar"></textarea></label>
    </div>
    <div class="pop-pe">
      <span class="meio-sub">* obrigatório · o texto entra no compositor, você completa e registra</span>
      <span class="pop-bts"><button class="btn-mini" onclick="fecharCaixa()">cancelar</button>
      <button class="btn-mini forte" onclick="popInserir('${chave}')" title="inserir no andamento"><span aria-hidden="true">Inserir</span><span class="sr-only">inserir no andamento</span></button></span>
    </div>`);
  // o "Petição" muda a lista conforme o "Onde"
  for(const c of P.campos) if(c.dependeDe){
    const de = document.getElementById(`pa-${c.dependeDe}`), alvo = document.getElementById(`pa-${c.id}`);
    if(de && alvo) de.onchange = () => { alvo.innerHTML = opcoes(c.optsPor[de.value]||[]); };
  }
  const primeiro = document.querySelector(".pop-campos input,.pop-campos select,.pop-campos textarea");
  if(primeiro) primeiro.focus();
}
async function popInserir(chave){
  const P = POPS_ANOTACAO[chave], k = casoSel && D.casoPorId.get(casoSel);
  if(!P || !k) return;
  const v = {};
  for(const c of P.campos){
    const el = document.getElementById(`pa-${c.id}`); if(!el) continue;
    v[c.id] = c.tipo==="check" ? el.checked : (el.value||"").trim();
    if(c.req && !v[c.id]) return aviso(`Falta: ${c.rot}`);
  }
  // F415 · o recurso dentro dos 10 dias da reanálise, sem pedi-la, a preclui (Portaria Conjunta 13/2026, art. 9º, § 1º, com a redação da 54/2026)
  if(chave==="peticao" && v.onde==="CRPS" && v.qual==="Recurso Ordinário"){ const ra = reanaliseAte(k);
    if(ra && (v.data||hoje()) <= ra && !await confirmar("Protocolar o recurso agora impede a reanálise. Seguir?")) return; }
  const obs = (document.getElementById("pa-obs")||{value:""}).value.trim();
  const texto = P.texto(v) + (obs ? `\n${obs}` : "");
  const inp = document.getElementById("and-texto");
  if(inp){
    inp.value = inp.value.trim() ? `${inp.value.trimEnd()}\n${texto}` : texto;
    inp.dispatchEvent(new Event("input"));
    autoAltura(inp);
  }
  fecharCaixa();
  const alvo = document.getElementById("and-texto");
  if(alvo){ alvo.focus(); alvo.setSelectionRange(alvo.value.length, alvo.value.length); }
  aviso(`${P.rot} preenchido — complete e clique em Registrar`, false);
  // F117 · o efeito vem DEPOIS do aviso: ele pode mover o caso de etapa, e a
  // faixa do desfazer não pode ser apagada pelo aviso seguinte
  if(P.efeito){
    // o dado gravado muda a tela (quadro de prazo, datas do caso): repinta;
    // o texto sobrevive porque é rascunho guardado por caso
    try{ await P.efeito(k, v); repintarFicha(); }
    catch(e){ aviso("O texto entrou, mas o dado do caso não gravou: "+String(e.message||e).slice(0,80)); }
  }
}
// o comentário rotulado sai com o chip do tipo, não com o colchete cru
function tipoDoComentario(texto){
  const m = RX_TIPO_ANOT.exec(texto||"");
  return m ? {rot:m[1], cor:COR_TIPO_ANOT[m[1]]||"neutro", resto:(texto||"").replace(RX_TIPO_ANOT,"")} : null;
}
// F42 · o texto escapado ganha as menções destacadas na cor do time —
// "@Marcos" deixa de ser texto morto e vira sinal de quem foi chamado
function destacarMencoes(html){
  let h=html;
  for(const co of (D.colaboradores||[])){
    const pn=(co.nome||"").split(" ")[0]; if(!pn) continue;
    h=h.replace(new RegExp("@"+pn+"\\b","gi"), m=>`<b class="mencao-in">${m}</b>`);
  }
  return h;
}
// reação = resposta que é SÓ um emoji: 👍 sem cerimônia, agregada em chip
const EMOJIS_REACAO=["👍","👏","❤","🙏","✔"];
const ehReacao = a => EMOJIS_REACAO.includes(String(a.texto||"").trim());
async function reagir(andId, casoId){
  try{
    const [r]=await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:casoId, autor_id:eu.id, texto:"👍",
        responde_a:andId, origem:"app", publico:false})})||[];
    if(r){ r.andamentos_lidos=[{colaborador_id:eu.id}]; (D._andsFicha=D._andsFicha||[]).unshift(r); }
    repintarFicha();
  }catch(e){ aviso("Não consegui registrar o 👍: "+String(e.message||e).slice(0,80)); }
}
// ══════════════════════════════════════════════════════════════════════════
// ⭐/⚡ SINAIS POR ANOTAÇÃO
// ══════════════════════════════════════════════════════════════════════════
// O ⭐ que já existia é do PROCESSO (casos.importante), herdado do To Do, onde
// só a tarefa se marca. Aqui a marca é da LINHA: numa ficha com sessenta
// andamentos, o que decide o caso são três — e eram três que ninguém achava
// sem reler tudo. Duas colunas booleanas em `andamentos`, nada de mapa em
// jsonb: assim a lista ⭐ Importante acha os marcados com uma consulta só.
// Só linha que É um andamento no banco ganha os sinais. O que a aba 🖥 Recurso
// e a ⚖️ CNJ mostram é espelho de jsonb (casos.crps, casos.datajud), não tem
// linha para marcar — ali os botões não aparecem.
const IC_ESTRELA = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3.3 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.5l5.9-.8L12 3.3Z"/></svg>`;
const IC_RAIO    = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/></svg>`;
function sinaisHtml(a){
  if(!a || !a.id) return "";
  return `<span class="tl-sinais">
    <button class="tl-sinal imp ${a.importante?"on":""}" onclick="event.stopPropagation();alternarSinal('${a.id}','importante')"
      title="${a.importante?"tirar o importante desta anotação":"marcar ESTA anotação como importante"}">${IC_ESTRELA}</button>
    <button class="tl-sinal urg ${a.urgente?"on":""}" onclick="event.stopPropagation();alternarSinal('${a.id}','urgente')"
      title="${a.urgente?"tirar a urgência desta anotação":"marcar ESTA anotação como urgente"}">${IC_RAIO}</button>
  </span>`;
}
// a classe da <li>, para o marcado saltar sem depender de olhar o ícone
function clsSinal(a){
  return `${a&&a.importante?" tl-imp":""}${a&&a.urgente?" tl-urg":""}`;
}
// o mesmo botão é clicado de dois lugares — da ficha (D._andsFicha) e da lista
// ⭐ Importante (D.sinalizados) — e as duas cópias precisam andar juntas,
// senão a marca volta sozinha ao trocar de tela
async function alternarSinal(andId, campo){
  const naFicha = (D._andsFicha||[]).find(x=>x.id===andId);
  const naLista = (D.sinalizados||[]).find(x=>x.id===andId);
  const a = naFicha || naLista;
  if(!a) return;
  const antes = !!a[campo];
  const pintar = ()=>{ montarSidebar(); if(clienteAberto) repintarFicha(); render(); };
  for(const x of [naFicha, naLista]) if(x) x[campo] = !antes;
  try{
    await api(`/rest/v1/andamentos?id=eq.${andId}`,{method:"PATCH",
      headers:{Prefer:"return=minimal"}, body:JSON.stringify({[campo]:!antes})});
  }catch(e){
    for(const x of [naFicha, naLista]) if(x) x[campo] = antes;   // não fica marcado o que não gravou
    pintar();
    // 42703 é o "column does not exist" do PostgreSQL — a correção não está
    // no app, está no banco, e dizer isso poupa a caçada
    return aviso(/42703|importante|urgente/.test(e.message)
      ? "O banco ainda não tem as colunas dos sinais — rode o crm/fase2/schema_por_em_dia.sql no Supabase."
      : "Não consegui gravar o sinal. Tente de novo.");
  }
  // a lista ⭐ Importante lê D.sinalizados: mantém em dia sem recarregar tudo
  D.sinalizados = (D.sinalizados||[]).filter(x=>x.id!==andId);
  if(a.importante || a.urgente) D.sinalizados.unshift({...a});
  pintar();
}

// ── ⭐/⚡ no ⚖️ CNJ ────────────────────────────────────────────────────────
// O movimento do CNJ não é linha de `andamentos`: mora dentro de
// casos.datajud, que o datajud.py REESCREVE inteiro todo dia. Marcar lá seria
// marcar na areia. Por isso o CNJ tem mapa próprio, casos.sinais_cnj, que
// robô nenhum toca — chave estável do movimento apontando para a marca.
// (No 🖥 Recurso é diferente: lá a marca mora no próprio evento e o
// ingerir.js a reacende a cada coleta — mecanismo antigo, mantido.)
function chaveSinalCnj(rotuloInst, m){
  return `${dsa(rotuloInst||"proc").replace(/\s+/g,"_")}|${(m.data||"").slice(0,10)}`
       + `|${hashDjb(String(m.nome||"")+String(m.complemento||""))}`;
}
function sinaisCnjDoCaso(k){
  const m = (k && k.sinais_cnj) || {};
  return (m && typeof m==="object" && !Array.isArray(m)) ? m : {};
}
function sinalCnj(k, chave){ return sinaisCnjDoCaso(k)[chave] || {}; }
// o texto e a data viajam junto da marca: a lista ⭐ Importante mostra o
// movimento sem ter de reabrir o datajud de cada caso para reconstruí-lo
async function alternarSinalCnj(casoId, chave, campo, txt, q){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const mapa = {...sinaisCnjDoCaso(k)};
  const atual = {...(mapa[chave]||{})};
  atual[campo] = !atual[campo];
  atual.txt = txt || atual.txt || "";
  atual.q = q || atual.q || "";
  if(atual.importante || atual.urgente) mapa[chave] = atual;
  else delete mapa[chave];                    // marca apagada não deixa lixo
  const antes = k.sinais_cnj;
  k.sinais_cnj = mapa;
  try{
    await patchCaso(k.id, {sinais_cnj:mapa});
  }catch(e){
    k.sinais_cnj = antes;
    return aviso(/42703|sinais_cnj/.test(e.message)
      ? "O banco ainda não tem a coluna sinais_cnj — rode o crm/fase2/schema_por_em_dia.sql no Supabase."
      : "Não consegui gravar o sinal. Tente de novo.");
  }
  repintarTudo();
}
// o mesmo botão é clicado da ficha e da lista ⭐ Importante: com ficha aberta
// repinta a ficha, sem ficha repinta só a coluna do meio (abrirFicha(null)
// abriria uma ficha vazia por cima da lista)
function repintarTudo(){
  montarSidebar();
  if(clienteAberto) abrirFicha(clienteAberto); else render();
}
function sinaisCnjHtml(k, chave, txt, q){
  const s = sinalCnj(k, chave);
  const alv = `'${k.id}','${esc(chave)}'`;
  const arg = `,'${escJs(String(txt||"").slice(0,160))}','${esc(q||"")}'`;
  return `<span class="tl-sinais">
    <button class="tl-sinal imp ${s.importante?"on":""}" onclick="alternarSinalCnj(${alv},'importante'${arg})"
      title="${s.importante?"tirar o importante deste movimento":"marcar ESTE movimento como importante"}">${IC_ESTRELA}</button>
    <button class="tl-sinal urg ${s.urgente?"on":""}" onclick="alternarSinalCnj(${alv},'urgente'${arg})"
      title="${s.urgente?"tirar a urgência deste movimento":"marcar ESTE movimento como urgente"}">${IC_RAIO}</button>
  </span>`;
}

function comentario(a, resposta, reacoes, raiz){
  // F236 · no visual clássico o movimento que veio de um portal (e-Recursos, PAT, PJe, DOU) tinha o avatar e o nome
  // de quem o importou ("Paulo 09:00"): o autor é a fonte, como no cartão do v10
  const robo = !temaV10() && ORIGENS_ROBO.includes(a.origem) ? rotuloOrigem(a) : null;
  const co=robo ? {nome:robo.replace(/^\S+\s/,""), inicial:robo.split(" ")[0], cor:"#8A9099"} : D.colPorId.get(a.autor_id), cor=co?co.cor:"#a19f9d";
  if(temaV10()) return comentarioV12(a, resposta, reacoes, raiz, co, cor);
  const tp = tipoDoComentario(a.texto);
  const chipsReacao = (reacoes&&reacoes.length)
    ? `<span class="tl-reacoes">${[...reacoes.reduce((m,r)=>{
        const e=String(r.texto).trim(); if(!m.has(e)) m.set(e,[]);
        m.get(e).push((D.colPorId.get(r.autor_id)||{}).inicial||"?"); return m;
      },new Map())].map(([e,quem])=>`<span class="chip" title="${esc(quem.join(", "))}">${e} ${quem.join(" ")}</span>`).join("")}</span>`
    : "";
  return `<span class="quando" title="${esc(co?co.nome:"—")}"><span class="avatar mini" style="background:${cor}">${esc(co?co.inicial:"·")}</span><span class="q-dt">${fmtTS(a.criado_em)}</span></span>
    <span class="texto"><b class="autor-nome" style="color:${cor}">${esc(co?co.nome.split(" ")[0]:"—")}</b><span class="tl-hora">${horaDoAnd(a)}</span>${String(a.origem_id||"").startsWith("mcp:")?`<span class="tl-hora" title="registrado pelo assistente (Claude ou ChatGPT) em nome de quem está indicado">· via assistente</span>`:""}<br>${tp?`<span class="chip ${tp.cor} tipo-tl">${esc(tp.rot)}</span>`:""}${destacarMencoes(esc(tp?tp.resto:a.texto))}${chipsReacao}${resposta||""}</span>
    ${sinaisHtml(a)}
    ${vistos(a)}
    <span class="tl-acoes">
      <button class="apaga" title="👍 ciente — um toque, sem texto" onclick="reagir('${a.id}','${a.caso_id}')">👍</button>
      <button class="apaga resp-liga" title="responder a este comentário — a resposta fica grudada nele na linha do tempo"
        onclick="armarResposta('${a.id}')">↩</button>
      ${(a.autor_id===eu.id&&a.origem==="app"||a.origem==="zap_resumo")?`<button class="apaga" title="apagar este meu comentário" onclick="apagarAndamento('${a.id}',${a.todo_sync?1:0})">✕</button>`:""}
    </span>`;
}
// ══════════════════════════════════════════════════════════════════════════
// F182 · O CARTÃO DA ANOTAÇÃO (canvas "Casos e anotações")
// ══════════════════════════════════════════════════════════════════════════
// Cabeçalho com autor, hora, tipo e prazo fatal; o texto; a faixa de cada
// tarefa (quem, quando, estado); as respostas; e a barra de ações: Responder,
// Concluir tarefa, + prazo e Reagendar. A resposta abre DENTRO do cartão, com
// "concluir a tarefa ao responder" e o prazo adicional (+5, +15, data).
const RX_PRAZO_AND = /^⏰ \[PRAZO ([^\]]+)\]\s*/;
// F236 · a anotação do To Do chega com 12:00 por convenção do migrar: sem hora de verdade, o cartão não inventa uma
const horaDoAnd = a => (h => a.origem==="todo" && h==="12:00" ? "" : h)(horaSP(a.criado_em));
let respInline = null, riPrazo = null, riFocoPrazo = false;
function diaTarefa(iso){
  const hj = hoje();
  return !iso ? "sem data" : iso===hj ? "hoje" : iso===maisDias(1) && iso>hj ? "amanhã"
    : iso<hj ? `atrasada desde ${fmtBarra(iso).slice(0,5)}` : fmtBarra(iso).slice(0,5);
}
function tarefasCartao(a){
  const ts = tarefasDe(a); if(!ts.length) return "";
  return `<span class="tl-tarefas">${ts.map(t=>{
    const c = D.colPorId.get(t.colaborador_id); if(!c) return "";
    const feita = !!t.concluida_em, atras = !feita && t.lembrar_em && t.lembrar_em < hoje();
    const nome = c.nome.split(" ")[0];
    const rot = feita ? `Concluída · ${nome} · ${horaLocal(t.concluida_em)}`
      : `${nome} · ${diaTarefa(t.lembrar_em)}${t.lembrar_hora?` ⏰ ${String(t.lembrar_hora).slice(0,5)}`:""} · ${t.papel==="revisa"?"revisa":t.natureza==="lembrete"?"lembrete":"tarefa"}`;
    const bola = (!feita && t.colaborador_id===eu.id)
      ? `<button class="tf-ok" onclick="concluirDeVez('${t.id}')" title="concluir agora — dá para desfazer logo depois" aria-label="concluir a sua tarefa"></button>`
      : `<span class="tl-tf-bola" aria-hidden="true"></span>`;
    // F259 · na anotação a tarefa é UMA linha (decisão do Paulo, 24.10.2026): o andamento e as etapas vivem no
    // painel de progresso, que abre com um clique nela; aqui fica só o resumo e o círculo de concluir
    const andando = !feita && t.iniciada_em;
    const ets = Array.isArray(t.etapas) ? t.etapas : [], nOk = ets.filter(e=>e.feito).length;
    const resumo = feita ? "" : `${andando?" · em andamento":""}${ets.length?` · etapas ${nOk}/${ets.length}`:""}${t.repetir?` · ↻ ${rotRepetir(t.repetir)}`:""}`;
    return `<span class="tl-tarefa ${feita?"feita":atras?"atras":""}${andando?" andando":""}">${bola}${feita
      ? `<span>${esc(rot)}</span>`
      : `<button class="tl-tf-abrir" onclick="abrirPainelTarefa('${t.caso_id}','${t.andamento_id}')" title="ver o progresso: andamento, etapas e histórico">${esc(rot+resumo)}<span aria-hidden="true"> ›</span></button>`}</span>`;
  }).join("")}</span>`;
}
function caixaRespInline(a){
  if(respInline!==a.id) return "";
  const ts = tarefasDe(a).filter(t=>!t.concluida_em);
  const alvo = ts.find(t=>t.colaborador_id===eu.id) || ts[0];
  const dono = alvo && ((D.colPorId.get(alvo.colaborador_id)||{}).nome||"").split(" ")[0];
  const pill = (q, rot) => `<button type="button" class="tl-pill ${riPrazo&&riPrazo===maisDias(q)?"on":""}" data-ri="${maisDias(q)}" onclick="riDia(${q})">${rot}</button>`;
  const escolhida = riPrazo && riPrazo!==maisDias(5) && riPrazo!==maisDias(15);
  return `<span class="tl-resp-box${riFocoPrazo?" foco-prazo":""}" id="ri-box">
    <textarea id="ri-txt" rows="2" placeholder="Resposta"></textarea>
    <span class="tl-resp-ops">
      ${alvo?`<label class="tl-resp-ck"><input type="checkbox" id="ri-concluir"${alvo.colaborador_id===eu.id?" checked":""}> concluir a tarefa${alvo.colaborador_id===eu.id?"":` de ${esc(dono)}`} ao responder</label>`:""}
      <span class="tl-resp-rot">Prazo adicional</span>
      ${pill(5,"+5 dias")}${pill(15,"+15 dias")}
      <label class="tl-pill ri-outra ${escolhida?"on":""}"><span>${escolhida?fmtBarra(riPrazo).slice(0,5):"escolher data"}</span>
        <input type="date" min="${hoje()}" value="${escolhida?riPrazo:""}" aria-label="escolher a data do prazo adicional" onchange="riDia(this.value, true)"></label>
      <span class="tl-resp-fim">
        <button class="tl-bt" onclick="fecharRespInline()">Cancelar</button>
        <button class="tl-bt forte" onclick="responderInline('${a.id}')">Responder</button></span>
    </span></span>`;
}
function abrirRespInline(andId, prazo){
  respInline = respInline===andId && !prazo ? null : andId;
  riPrazo = null; riFocoPrazo = !!prazo;
  repintarFicha();
  setTimeout(()=>{ const t=document.getElementById("ri-txt"); if(t && !prazo) t.focus();
    document.getElementById("ri-box")?.scrollIntoView({block:"nearest"}); });
}
function fecharRespInline(){ respInline = null; riPrazo = null; repintarFicha(); }
// muda só os botões no lugar: repintar a ficha destruía o seletor de data do
// iPhone, que dispara o change ao abrir, e a data não podia ser escolhida
function riDia(q, daData){
  const d = /^\d{1,3}$/.test(String(q)) ? maisDias(+q) : q;
  riPrazo = riPrazo===d && !daData ? null : (d||null);
  const box = document.getElementById("ri-box"); if(!box) return;
  box.querySelectorAll("[data-ri]").forEach(b=>b.classList.toggle("on", !!riPrazo && b.dataset.ri===riPrazo));
  const outra = box.querySelector(".ri-outra"), esc = !!riPrazo && ![...box.querySelectorAll("[data-ri]")].some(b=>b.dataset.ri===riPrazo);
  if(outra){ outra.classList.toggle("on", esc); outra.querySelector("span").textContent = esc ? fmtBarra(riPrazo).slice(0,5) : "escolher data";
    const inp = outra.querySelector("input"); if(!esc && inp) inp.value = ""; }
}
async function responderInline(andId){
  const a = (D._andsFicha||[]).find(x=>x.id===andId); if(!a) return;
  const txt = ((document.getElementById("ri-txt")||{}).value||"").trim();
  const ts = tarefasDe(a).filter(t=>!t.concluida_em);
  const alvo = ts.find(t=>t.colaborador_id===eu.id) || ts[0];
  const concluir = !!(alvo && (document.getElementById("ri-concluir")||{}).checked);
  const prazo = riPrazo;
  if(!txt && !concluir && !prazo) return aviso("Escreva a resposta, conclua a tarefa ou dê um prazo adicional");
  respInline = null; riPrazo = null;
  // concluir pela resposta é a conclusão de sempre (desfazer, baixa do prazo
  // fatal ligado a ela); o prazo adicional vira a próxima rodada
  if(concluir){ ctRep = prazo || null; return concluirDeVez(alvo.id, txt); }
  const corpo = (txt || "Prazo adicional") + (prazo ? ` · prazo adicional até ${fmtBarra(prazo)}` : "");
  let and;
  try{
    [and] = await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:a.caso_id, autor_id:eu.id, texto:corpo, responde_a:andId})});
  }catch(e){ return aviso("Não consegui registrar a resposta: "+String(e.message||e).slice(0,120)); }
  if(and) await api(`/rest/v1/andamentos_lidos`,{method:"POST",
    headers:{Prefer:"return=minimal,resolution=merge-duplicates"},
    body:JSON.stringify({andamento_id:and.id, colaborador_id:eu.id})}).catch(()=>{});
  if(prazo){
    try{
      if(alvo){   // a tarefa aberta ganha a data nova
        await api(`/rest/v1/andamento_tarefas?id=eq.${alvo.id}`,{method:"PATCH",
          headers:{Prefer:"return=minimal"}, body:JSON.stringify({lembrar_em:prazo})});
        alvo.lembrar_em = prazo;
        const ab = (D.tarefasPorCaso.get(alvo.caso_id)||[]).find(x=>x.id===alvo.id); if(ab) ab.lembrar_em = prazo;
      }else if(and){   // sem tarefa aberta, o prazo vira tarefa de quem respondeu
        tarefaNaMemoria(await criarTarefa({andamento_id:and.id, caso_id:a.caso_id, colaborador_id:eu.id,
          atribuido_por:eu.id, lembrar_em:prazo}));
      }
    }catch(e){ aviso("⚠ o prazo adicional não gravou: "+String(e.message||e).slice(0,80)); }
  }
  if(txt && and) await criarMencoes(txt, a.caso_id, and.id, []).catch(()=>{});
  aviso(prazo ? `Respondido · prazo até ${fmtBarra(prazo)} 🗓` : "Respondido ✔", false);
  if(clienteAberto) abrirFicha(clienteAberto);
}
// ══════════════════════════════════════════════════════════════════════════
// F326 · O PRAZO NA ANOTAÇÃO (desenho aprovado pelo Paulo, 31.10.2026). A anotação com ⏰ mostra a faixa do prazo: viva,
// com o Abrir da janela; o formulário do cumprimento no próprio cartão; a faixa verde do cumprido; o alerta do vencido
// sem registro, com "Foi cumprido" e "Não foi cumprido". Cumprido = resposta "✔ [PRAZO CUMPRIDO]" à anotação ou tarefa
// de quem executa concluída (regra de 31.10.2026). O prazo que saiu do caso sem registro, antes desta regra, fica neutro.
// ══════════════════════════════════════════════════════════════════════════
const RX_PZ_RESP = /^(✔|✖) \[PRAZO (CUMPRIDO|NÃO CUMPRIDO|NÃO SE APLICA)\]\s*/;
let _cumprindo = null;   // a anotação com o formulário do cumprimento aberto
// F388 · o texto da anotação que só repete o título do prazo não aparece duas vezes
const limpaRepPz = t => String(t||"").trim().replace(/[\s.]+$/,"").toLowerCase();
const tituloNotaPz = a => (RX_PZ_CONTAGEM.exec(String(a.texto||"").replace(RX_PZ_CARIMBO, ""))||[])[1] || (pzDoAssistente(a.texto)||{}).desc
  || cortaFrase(fazerDaNota(a.texto) || "Prazo fatal", 80);
// F407 · o prazo que o assistente aponta na linha "⏳ Prazo: <o quê>, … até dd/mm/aaaa (…)" ou "… vence dd/mm/aaaa". Vale só a
// data dita como fim ("até", "vence"); estimativa, data a conferir, perícia, sessão e DCB ficam como texto. Duas datas: a mais cedo
const RX_PZ_ASS = /^⏳ Prazo:[ \t]*(.+)$/gmu, RX_PZ_ASS_FIM = /(?:\bvence(?: em)?|\baté)[ \t]+(\d{2})\/(\d{2})\/(\d{4})\b/giu;
function pzDoAssistente(t){
  let o = null;
  for(const m of String(t||"").matchAll(RX_PZ_ASS)){
    if(/estimativ|cerca de|a confirmar|a conferir|não certificad/i.test(m[1])) continue;
    const fins = [...m[1].matchAll(RX_PZ_ASS_FIM)]; if(!fins.length) continue;
    const data = fins.map(f=>`${f[3]}-${f[2]}-${f[1]}`).sort()[0]; if(o && o.data <= data) continue;
    const ini = /(?:publicação|intimação|comunicação|notificação|ciência|decisão|despacho)[^0-9\n]{0,14}(\d{2})\/(\d{2})\/(\d{4})/i.exec(m[1]);
    const desc = m[1].slice(0, fins[0].index).split(/,\s*/)[0].replace(/[\s,;.:(]+$/, "") || "Prazo";
    o = {data, linha: m[0], desc: desc.charAt(0).toUpperCase() + desc.slice(1), ini: ini ? `${ini[3]}-${ini[2]}-${ini[1]}` : null};
  }
  return o;
}
function estadoPrazoNota(a){
  const m = a && RX_PRAZO_AND.exec(a.texto||""); if(!m) return null;
  const data = isoDoCarimbo((/\d{2}\.\d{2}\.\d{4}/.exec(m[1])||[])[0]), k = D.casoPorId.get(a.caso_id);
  const resp = (D._andsFicha||[]).filter(f=>f.responde_a===a.id && !f.excluir && RX_PZ_RESP.test(f.texto||""))
    .sort((x,y)=>(x.criado_em||"")<(y.criado_em||"")?1:-1)[0];
  if(resp){ const r = RX_PZ_RESP.exec(resp.texto), q = /\(cumprido em (\d{2}\/\d{2}\/\d{4})\)/.exec(resp.texto);
    return {est: r[2]==="CUMPRIDO" ? "cumprido" : r[2]==="NÃO CUMPRIDO" ? "nao" : "nsa", data, resp,
      em: q ? q[1].split("/").reverse().join("-") : dataSP(resp.criado_em), por: resp.autor_id}; }
  const exec = tarefasDe(a).filter(t=>t.papel!=="revisa");
  if(exec.length && exec.every(t=>t.concluida_em)){
    const t = [...exec].sort((x,y)=>x.concluida_em<y.concluida_em?1:-1)[0];
    return {est: "cumprido", data, em: dataSP(t.concluida_em), por: t.colaborador_id};
  }
  if(!/^\d{4}-\d{2}-\d{2}$/.test(data)) return {est: "antigo", data: null};
  const vivo = k && k.fase!=="encerrado", aberta = exec.some(t=>!t.concluida_em);
  if(data >= hoje()) return {est: vivo ? "vivo" : "antigo", data};
  // vencido sem registro: o prazo ainda é o do caso ou a tarefa de quem executa segue aberta
  return {est: vivo && (k.prazo===data || aberta) ? "vencido" : "antigo", data, exec: exec.filter(t=>!t.concluida_em)};
}
const IC_ALERTA_PZ = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17.5v.01"/></svg>`;
function faixaPrazoNota(a, e){
  const tit = esc(tituloNotaPz(a)), nome = id => ((D.colPorId.get(id)||{}).nome||"alguém").split(" ")[0];
  const pill = `<span class="tl-pz-pill"><i aria-hidden="true"></i>Prazo fatal</span>`;
  if(_cumprindo===a.id && (e.est==="vivo" || e.est==="vencido"))
    return `<div class="tl-pz tl-pz-vivo">${pill}<div class="tl-pz-o"><b class="tl-pz-t">${tit} · vence ${esc(diaCurtoPz(e.data))}</b></div></div>${formCumprirNota(a)}`;
  if(e.est==="vivo"){
    const f = faltaPz({data: e.data, natureza: "fatal"});
    const meta = f.urg==="hoje" ? `hoje, ${esc(diaCurtoPz(e.data))} · <b>é o último dia</b>` : `vence ${esc(diaCurtoPz(e.data))} · <b>${esc(f.txt)}</b>`;
    // F407 · a proposta A (escolha do Paulo, 05.11.2026): a faixa no cartão com o prazo (o que é, quando vence, quanto falta e
    // a barra da intimação ao vencimento), a tarefa de quem faz e os botões Cumprido, Perdido e Abrir
    const tf = tarefasCartao(a), ct = RX_PZ_CONTAGEM.exec(String(a.texto||"").replace(RX_PZ_CARIMBO, "")), pa = pzDoAssistente(a.texto);
    const ini = ct ? isoDoCarimbo(ct[5]) : pa && pa.ini || dataSP(a.criado_em);
    const barra = barraPz({data: ini, rot: ct || (pa && pa.ini) ? "Intimação" : "Anotação"}, {data: e.data}, "tl-pz");
    return `<div class="tl-pz tl-pz-vivo tl-pz-grade tl-pz-a"><div class="tl-pz-col">${pill}<div class="tl-pz-o"><b class="tl-pz-t">${tit}</b><small class="tl-pz-m">${meta}</small>${barra}</div></div>
      ${tf?`<div class="tl-pz-col"><span class="tl-pz-k">Tarefa</span><div class="tl-pz-tf">${tf}</div></div>`:""}
      <div class="tl-pz-bts"><button type="button" class="tl-pz-cumpri" onclick="cumpriNaNota('${a.id}')" title="Registrar como o prazo foi cumprido">Cumprido</button>
        <button type="button" class="tl-pz-perdi" onclick="registrarNaoCumprido('${a.caso_id}','${a.id}')" title="O prazo não foi cumprido">Perdido</button>
        <button type="button" class="tl-pz-abrir" onclick="abrirPainelTarefa('${a.caso_id}','${a.id}')" aria-label="Abrir o prazo: ${tit}">Abrir</button></div></div>`;
  }
  if(e.est==="vencido"){
    const ex = [...new Set((e.exec||[]).map(t=>nome(t.colaborador_id)))].join(" e ");
    return `<div class="tl-pz-alerta" role="alert"><div class="tl-pz-al-cab">${IC_ALERTA_PZ}<div class="tl-pz-o">
      <b class="tl-pz-t">${tit} venceu ${esc(diaCurtoPz(e.data))}</b>
      <small class="tl-pz-m">Ninguém registrou o cumprimento.${ex ? ` A tarefa de ${esc(ex)} segue aberta.` : ""}</small></div></div>
      <div class="tl-pz-al-bts"><button type="button" class="tl-pz-sim" onclick="cumpriNaNota('${a.id}')" title="O prazo foi cumprido">Cumprido</button>
      <button type="button" class="tl-pz-nao" onclick="registrarNaoCumprido('${a.caso_id}','${a.id}')" title="O prazo não foi cumprido">Perdido</button></div></div>`;
  }
  if(e.est==="cumprido"){
    const u = e.data && e.em ? uteisEntre(e.em, e.data) : null, pl = n => `${n} ${n===1?"dia útil":"dias úteis"}`;
    const rel = u===null || u<0 ? "" : u>0 ? ` · ${pl(u)} antes do vencimento, ${diaCurtoPz(e.data)}` : " · no último dia";
    // F454 · o cumprido depois do vencimento fica em vermelho, para não se ler como cumprido em dia
    const tarde = u!==null && u<0 ? ` · <b class="tl-pz-tarde">cumprido ${pl(-u)} depois do vencimento, ${esc(diaCurtoPz(e.data))}</b>` : "";
    return `<div class="tl-pz tl-pz-ok${tarde?" tl-pz-ok-tarde":""}"><span class="tl-pz-ck" aria-hidden="true">${IC_OK_PZ}</span><div class="tl-pz-o">
      <b class="tl-pz-t">${tit} · cumprido${tarde?" fora do prazo":""}</b><small class="tl-pz-m">${esc(diaCurtoPz(e.em))}, por ${esc(nome(e.por))}${esc(rel)}${tarde}</small></div></div>`;
  }
  if(e.est==="nao" || e.est==="nsa")
    return `<div class="tl-pz tl-pz-fim"><div class="tl-pz-o"><b class="tl-pz-t">${tit} · ${e.est==="nao" ? "não foi cumprido" : "não se aplica"}</b>
      <small class="tl-pz-m">registrado ${esc(diaCurtoPz(dataSP(e.resp.criado_em)))}, por ${esc(nome(e.por))}</small></div></div>`;
  return e.data ? `<div class="tl-pz tl-pz-antigo"><small class="tl-pz-m">Prazo fatal de ${esc(diaAnoPz(e.data))}</small></div>` : "";
}
function formCumprirNota(a){
  const k = D.casoPorId.get(a.caso_id); if(!k) return "";
  const {exec, rev} = prazoDaAnotacao(k, a.id), nome = id => ((D.colPorId.get(id)||{}).nome||"").split(" ")[0];
  const ex = [...new Set(exec.map(t=>nome(t.colaborador_id)))].join(" e "), rv = [...new Set(rev.map(t=>nome(t.colaborador_id)))].join(" e ");
  const sugerida = listaDeVolta(k);
  return `<section class="tl-pz-form" aria-labelledby="tpf-t">
    <h3 id="tpf-t">Como o prazo foi cumprido</h3>
    <label class="sr-so" for="tpf-txt">O que foi feito</label>
    <textarea id="tpf-txt" rows="2" placeholder="O que foi feito: protocolo, número, resultado"></textarea>
    <div class="tl-pz-f-lin">
      <label class="tl-pz-f-campo">Cumprido em <input type="date" id="tpf-data" value="${hoje()}" max="${hoje()}"></label>
      <label class="tl-pz-f-arq">${IC_DOC_PZ}<span id="tpf-arq-n">Anexar o comprovante</span><input type="file" id="tpf-arq" class="sr-so" accept="application/pdf,image/*"
        onchange="document.getElementById('tpf-arq-n').textContent=this.files[0]?this.files[0].name:'Anexar o comprovante'"></label>
    </div>
    ${exec.length ? `<label class="tl-pz-f-ck"><input type="checkbox" id="tpf-concluir" checked>Concluir a tarefa de ${esc(ex)}${rv ? ` e avisar ${esc(rv)}, que revisa` : ""}</label>` : ""}
    ${naFilaDoPrazo(k) ? `<label class="tl-pz-f-campo">O caso sai de 🗓 Tarefas com Prazo e volta para <select id="tpf-volta">${LISTAS_VOLTA.map(([l])=>
      `<option value="${esc(l)}" ${l===sugerida?"selected":""}>${esc(l)}</option>`).join("")}</select></label>` : ""}
    <div class="tl-pz-f-pe"><button type="button" class="tl-bt" onclick="cumpriNaNota('${a.id}')">Cancelar</button>
      <button type="button" class="tl-pz-f-ok" onclick="confirmarCumprirNota('${a.caso_id}','${a.id}')" title="Confirmar o cumprimento">Confirmar<span class="sr-only"> o cumprimento</span></button></div>
  </section>`;
}
function cumpriNaNota(andId){
  _cumprindo = _cumprindo===andId ? null : andId;
  repintarFicha();
  if(_cumprindo) setTimeout(()=>{ const t = document.getElementById("tpf-txt"); if(t){ t.focus(); t.scrollIntoView({block:"nearest"}); } });
}
async function confirmarCumprirNota(casoId, andId){
  const v = id => document.getElementById(id);
  const o = {andId, texto: (v("tpf-txt").value||"").trim(), data: v("tpf-data").value || hoje(),
    arquivo: (v("tpf-arq").files||[])[0] || null, concluir: v("tpf-concluir") ? v("tpf-concluir").checked : true,
    volta: v("tpf-volta") ? v("tpf-volta").value : null};
  if(o.data > hoje()) return aviso("O cumprimento não pode ter data futura");
  await registrarCumprimento(casoId, o);
}
// desfazer o registro depois do aviso: a resposta sai, o prazo volta ao caso e as tarefas concluídas com ela reabrem
// o comprovante preso à resposta desfeita sai junto (a FK solta o andamento_id e o papel ficaria avulso no caso)
async function apagarComprovantes(andId){
  const anx = (D.anexos||[]).filter(an=>an.andamento_id===andId); if(!anx.length) return;
  await api(`/rest/v1/anexos?andamento_id=eq.${andId}`,{method:"DELETE",headers:{Prefer:"return=minimal"}}).catch(()=>{});
  D.anexos = (D.anexos||[]).filter(an=>!anx.includes(an));
}
async function desfazerCumprimento(respId){
  const r = (D._andsFicha||[]).find(x=>x.id===respId); if(!r) return;
  const og = (D._andsFicha||[]).find(x=>x.id===r.responde_a), k = D.casoPorId.get(r.caso_id);
  if(!await confirmar("Desfazer o registro deste prazo? O prazo volta ao caso e a tarefa concluída junto reabre.")) return;
  try{ await apagarComprovantes(r.id); await api(`/rest/v1/andamentos?id=eq.${r.id}`,{method:"DELETE",headers:{Prefer:"return=minimal"}}); }
  catch(e){ return aviso("Não consegui desfazer"); }
  D._andsFicha = (D._andsFicha||[]).filter(a=>a.id!==r.id);
  const m = og && /\[PRAZO (\d{2}\.\d{2}\.\d{4})\]/.exec(og.texto||""), data = m && isoDoCarimbo(m[1]);
  if(k && data && !k.prazo && k.fase!=="encerrado"){ await patchCaso(k.id, {prazo: data}).catch(()=>{}); k.prazo = data; }
  const junto = og ? tarefasDe(og).filter(t=>t.concluida_em && Math.abs(new Date(t.concluida_em) - new Date(r.criado_em)) < 120000) : [];
  for(const t of junto){ await api(`/rest/v1/andamento_tarefas?id=eq.${t.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({concluida_em: null})}).catch(()=>{}); t.concluida_em = null; }
  if(k && junto.length) D.tarefasPorCaso.set(k.id, [...(D.tarefasPorCaso.get(k.id)||[]), ...junto.filter(t=>!(D.tarefasPorCaso.get(k.id)||[]).includes(t))]);
  aviso("Registro desfeito: o prazo voltou ao caso", false);
  montarSidebar(); if(clienteAberto) abrirFicha(clienteAberto);
}
// a resposta do registro: o selo no lugar do colchete e o comprovante preso a ela
function respPrazoHtml(a){
  const r = RX_PZ_RESP.exec(a.texto||""); if(!r) return null;
  let rot = r[2]==="CUMPRIDO" ? "Prazo cumprido" : r[2]==="NÃO CUMPRIDO" ? "Prazo não cumprido" : "Prazo não se aplica", tarde = false;
  if(r[2]==="CUMPRIDO"){   // F454 · a resposta diz quando o cumprimento veio depois do vencimento da anotação
    const pai = (D._andsFicha||[]).find(f=>f.id===a.responde_a), m = pai && RX_PRAZO_AND.exec(pai.texto||"");
    const venc = m && isoDoCarimbo((/\d{2}\.\d{2}\.\d{4}/.exec(m[1])||[])[0]), q = /\(cumprido em (\d{2}\/\d{2}\/\d{4})\)/.exec(a.texto);
    const em = q ? q[1].split("/").reverse().join("-") : dataSP(a.criado_em);
    if(venc && /^\d{4}-\d{2}-\d{2}$/.test(venc) && em > venc){ rot = "Cumprido após o vencimento"; tarde = true; }
  }
  const anx = (D.anexos||[]).filter(an=>an.andamento_id===a.id);
  return {corpo: a.texto.slice(r[0].length), chip: `<span class="chip tl-pz-resp tl-pz-resp-${r[2]==="CUMPRIDO" && !tarde?"ok":"x"}">${rot}</span>`,
    anexos: anx.length ? `<span class="tl-pz-anx">${anx.map(an=>`<button type="button" class="tl-pz-doc" onclick="abrirAnexo('${an.id}')">${IC_DOC_PZ}${esc(an.nome||"comprovante")}</button>`).join("")}</span>` : ""};
}
// F407 · a linha "⏳ Prazo:" do assistente com a data do carimbo sai do texto, porque a faixa a mostra
const semLinhaPzAss = (t, carimbo) => { const d = String(carimbo||"").replace(/\./g, "/");
  return String(t||"").split("\n").filter(l=>!(/^⏳ Prazo:/u.test(l) && l.includes(d))).join("\n").trim(); };
function comentarioV12(a, resposta, reacoes, raiz, co, cor){
  const pz = RX_PRAZO_AND.exec(a.texto||"");
  // F326 · a anotação do prazo traz a faixa do estado; a resposta do registro traz o selo e o comprovante
  const pzE = pz && raiz ? estadoPrazoNota(a) : null, rp = !pz && respPrazoHtml(a);
  const corpo = pz ? semLinhaPzAss(a.texto.slice(pz[0].length).replace(RX_PZ_CONTAGEM, ""), pz[1]) : rp ? rp.corpo : (a.texto||"");
  const tp = tipoDoComentario(corpo);
  const chipsReacao = (reacoes&&reacoes.length)
    ? `<span class="tl-reacoes">${[...reacoes.reduce((m,r)=>{
        const e=String(r.texto).trim(); if(!m.has(e)) m.set(e,[]);
        m.get(e).push((D.colPorId.get(r.autor_id)||{}).inicial||"?"); return m;
      },new Map())].map(([e,quem])=>`<span class="chip" title="${esc(quem.join(", "))}">${e} ${quem.join(" ")}</span>`).join("")}</span>`
    : "";
  const abertas = tarefasDe(a).filter(t=>!t.concluida_em);
  const minha = abertas.find(t=>t.colaborador_id===eu.id), alvo = minha || abertas[0];
  // F182 · ciente, apagar, ⭐ e ⚡ saem da coluna da direita (que espremia o
  // texto) e entram no fim da barra; os vistos de leitura vão para o cabeçalho
  const apagar = (a.autor_id===eu.id&&a.origem==="app"||a.origem==="zap_resumo")
    ? `<button class="tl-bt tl-bt-ic tl-apaga" title="apagar este meu comentário" aria-label="apagar" onclick="apagarAndamento('${a.id}',${a.todo_sync?1:0})">✕</button>` : "";
  const editarResp = (a.autor_id===eu.id&&a.origem==="app"||a.origem==="zap_resumo")&&!rp ? `<button class="tl-bt tl-bt-ic tl-edita" title="editar esta minha resposta; a versão anterior fica no histórico" aria-label="editar" onclick="editarAndamento('${a.id}')">✎</button>` : "";   // F622
  const barra = raiz ? `<span class="tl-barra">
      <button class="tl-bt tl-bt-nota resp-liga" onclick="abrirRespInline('${a.id}')" title="responder a este comentário — a resposta fica grudada nele">Responder</button>
      ${pzE && (pzE.est==="vivo" || pzE.est==="vencido") ? ""
        : minha?`<button class="tl-bt tl-bt-ok tf-acao" onclick="concluirDeVez('${minha.id}')" title="concluir a sua tarefa — dá para desfazer logo depois">Concluir<span class="sr-only"> tarefa</span></button>`:""}
      <button class="tl-bt" onclick="abrirRespInline('${a.id}',1)" title="responder dando prazo adicional">Prazo<span class="sr-only"> adicional</span></button>
      ${alvo?`<button class="tl-bt tf-acao" onclick="adiarTarefa('${alvo.id}')" title="mudar a data da tarefa">Reagendar</button>`:""}
      <span class="tl-barra-fim">
        <button class="tl-bt tl-bt-ic" title="ciente — um toque, sem texto" aria-label="ciente" onclick="reagir('${a.id}','${a.caso_id}')">${IC_SVG.ciente}</button>
        ${sinaisHtml(a)}
        ${/* F190 · o raro sai da vista: mais uma tarefa e apagar vão para o ⋯ */""}
        ${menuMais([
          `<button class="tl-mais-it" role="menuitem" onclick="novaTarefaComentario('${a.id}','${a.caso_id}')" title="Mais uma tarefa neste comentário"><span aria-hidden="true">＋ Tarefa</span><span class="sr-only">Mais uma tarefa neste comentário</span></button>`,
          `<button class="tl-mais-it" role="menuitem" onclick="copiar(${esc(JSON.stringify(corpo))},'Texto copiado')" title="Copiar o texto">Copiar<span class="sr-only"> o texto</span></button>`,
          itemLevarAndamento(a),
          pzE && pzE.resp ? `<button class="tl-mais-it" role="menuitem" onclick="desfazerCumprimento('${pzE.resp.id}')" title="Desfazer o registro do prazo">Desfazer<span class="sr-only"> o registro do prazo</span></button>` : "",
          (a.autor_id===eu.id&&a.origem==="app"||a.origem==="zap_resumo")&&!rp ? `<button class="tl-mais-it" role="menuitem" onclick="editarAndamento('${a.id}')" title="Editar este comentário; a versão anterior fica no histórico">Editar<span class="sr-only"> este comentário</span></button>` : "",
          (a.autor_id===eu.id&&a.origem==="app"||a.origem==="zap_resumo") ? `<button class="tl-mais-it perigo" role="menuitem" onclick="apagarAndamento('${a.id}',${a.todo_sync?1:0})" title="Apagar este comentário">Apagar<span class="sr-only"> este comentário</span></button>` : "",
        ])}</span>
    </span>` : "";
  return `<span class="quando" title="${esc(co?co.nome:"—")}"><span class="avatar mini" style="background:${cor}">${esc(co?co.inicial:"·")}</span><span class="q-dt">${fmtTS(a.criado_em)}</span></span>
    <span class="texto"><span class="tl-cab"><span class="avatar mini tl-av" style="background:${cor}">${esc(co?co.inicial:"·")}</span><b class="autor-nome">${esc(co?co.nome.split(" ")[0]:"—")}</b><span class="tl-hora">${(h=>`<span class="tl-dt">${fmtTS(a.criado_em).slice(0,5)}${h?" · ":""}</span>${h}`)(horaDoAnd(a))}</span>${String(a.origem_id||"").startsWith("mcp:")?`<span class="tl-hora" title="registrado pelo assistente (Claude ou ChatGPT) em nome de quem está indicado">· via assistente</span>`:""}${a.editado_em?`<button class="tl-hora tl-editada" onclick="verEdicoes('${a.id}')" title="editada em ${esc(fmtTS(a.editado_em))}; ver as versões anteriores">· editada</button>`:""}${tp?`<span class="chip ${tp.cor} tipo-tl">${esc(tp.rot)}</span>`:""}${pz && !pzE?`<span class="chip tl-pz-chip" title="prazo fatal marcado nesta anotação">prazo fatal ${esc(pz[1].slice(0,5).replace(".","/"))}</span>`:""}${rp?rp.chip:""}<span class="tl-cab-fim">${barra}${vistos(a)}${raiz?"":editarResp+apagar}</span></span><span class="tl-corpo${pzE && pzE.est==="vivo" && limpaRepPz(tp?tp.resto:corpo)===limpaRepPz(tituloNotaPz(a)) ? " tl-corpo-rep" : ""}">${destacarMencoes(esc(tp?tp.resto:corpo))}</span>${rp?rp.anexos:""}${pzE?faixaPrazoNota(a, pzE):""}${pzE && pzE.est==="vivo" && _cumprindo!==a.id ? "" : tarefasCartao(a)}${chipsReacao}${resposta||""}${raiz?caixaRespInline(a):""}</span>`;   // F244 · as ações na linha do autor
}
// F41 · RESPONDER de qualquer comentário: arma o responde_a e o próximo
// Registrar entra aninhado no comentário original (como a conclusão de
// tarefa já fazia — agora sem precisar de uma tarefa no meio).
let respondeA = null;
function armarResposta(andId){
  const a=(D._andsFicha||[]).find(x=>x.id===andId);
  respondeA = andId;
  const inp=document.getElementById("and-texto");
  document.getElementById("resp-chip")?.remove();
  if(inp){
    inp.insertAdjacentHTML("beforebegin",
      `<div id="resp-chip" class="meio-sub" style="border-left:3px solid var(--azul);padding:2px 8px;margin-bottom:4px">
        ↩ respondendo a “${esc(String((a&&a.texto)||"comentário").slice(0,80))}${a&&a.texto&&a.texto.length>80?"…":""}”
        <button class="btn-mini" onclick="desarmarResposta()" title="cancelar a resposta">✕</button></div>`);
    inp.focus();
  }
  pintarFrase();
}
function desarmarResposta(){
  respondeA=null;
  document.getElementById("resp-chip")?.remove();
  pintarFrase();
}
// F41 · o @ com menu: descoberta da menção sem decorar nome — o clique
// insere @Primeiro no texto e a menção nasce no Registrar (criarMencoes)
function fecharMenuArroba(){ const m=document.getElementById("menu-arroba"); if(m) m.remove(); }
function menuArroba(ev){
  ev.preventDefault(); ev.stopPropagation(); fecharMenuArroba();
  const eqs=equipeAtiva().filter(c=>c.id!==eu.id);
  if(!eqs.length) return aviso("Não há outro colaborador ativo para mencionar");
  const m=document.createElement("div"); m.id="menu-arroba";
  m.innerHTML=`<div class="mm-tit">@ mencionar — recebe na caixa 📥</div>`+eqs.map(c=>
    `<div class="mm-it" data-arr="${c.id}"><span class="avatar mini" style="background:${c.cor}">${esc(c.inicial)}</span>${esc(c.nome)}</div>`).join("");
  document.body.appendChild(m);
  const W=m.offsetWidth||240, H=m.offsetHeight||200;
  m.style.left=Math.min(ev.clientX, innerWidth-W-8)+"px";
  m.style.top =Math.min(ev.clientY, innerHeight-H-8)+"px";
  m.querySelectorAll("[data-arr]").forEach(it=>it.onclick=()=>{
    const co=D.colPorId.get(it.dataset.arr); fecharMenuArroba();
    const inp=document.getElementById("and-texto"); if(!co||!inp) return;
    const sep=inp.value && !/\s$/.test(inp.value) ? " " : "";
    inp.value += `${sep}@${co.nome.split(" ")[0]} `;
    inp.focus(); inp.dispatchEvent(new Event("input"));
  });
  setTimeout(()=>document.addEventListener("click", fecharMenuArroba, {once:true}));
}
// F42 · o que é registro de SISTEMA (fato, não conversa) encolhe para uma
// linha central — a conversa da equipe respira. Se o registro carrega tarefa
// ou está por ler, volta a ser cartão cheio: função nunca some por estética.
function ehEventoSistema(a){
  const padrao = (a.origem==="pat" && String(a.origem_id||"").startsWith("situacao:"))
    || /^(✔ \[PRAZO CUMPRIDO\]|📅 |🗓 Véspera|INSS · )/.test(a.texto||"");
  return padrao && !tarefasDe(a).length && (euLi(a) || a.autor_id===eu.id);
}
async function liTudoNaFicha(casoId){
  const ids=(D._andsFicha||[]).filter(a=>a.caso_id===casoId && !a.excluir
    && !euLi(a) && (a.autor_id!==eu.id || ORIGENS_ROBO.includes(a.origem))).map(a=>a.id);
  if(!ids.length || !await marcarLidas(ids)) return;
  for(const a of (D._andsFicha||[])) if(ids.includes(a.id))
    a.andamentos_lidos=[...(a.andamentos_lidos||[]),{colaborador_id:eu.id}];
  repintarFicha();
}
function linhaDoTempo(ands){
  const vivos = (ands||[]).filter(a=>!a.excluir);
  const porPai = new Map();
  for(const a of vivos) if(a.responde_a){
    if(!porPai.has(a.responde_a)) porPai.set(a.responde_a, []);
    porPai.get(a.responde_a).push(a);
  }
  // resposta órfã (o pai foi apagado) volta a ser comentário de primeiro
  // nível: sumir com o "feito" de alguém seria pior que mostrá-lo solto
  const temPai = new Set(vivos.map(a=>a.id));
  const raiz0 = vivos.filter(a=>(!a.responde_a || !temPai.has(a.responde_a)) && !ehReacao(a));
  // F245 · a conferência sem novidade repetida ("Está em análise", "Sem movimentação") fica numa linha só: a mais nova
  // à vista, com quantas vezes se conferiu antes; as outras continuam no banco e no Caso completo
  const ehConf = a => RX_CONFERENCIA.test(String(a.texto||"").trim()) && !porPai.has(a.id) && !a.importante;
  const raiz = [];
  for(const a of raiz0){ const ant = raiz[raiz.length-1];
    if(ant && ehConf(a) && ehConf(ant) && (euLi(a) || (a.autor_id===eu.id && !ORIGENS_ROBO.includes(a.origem)))){ ant._confMais = (ant._confMais||0) + 1; ant._confDesde = dataSP(a.criado_em); continue; }
    if(ehConf(a)){ a._confMais = 0; a._confDesde = null; }
    raiz.push(a); }
  // F666 · o prazo em aberto da anotação fica fixado no topo, em vermelho, junto da própria anotação (pedido do Paulo, 21.11.2026)
  const pzAberto = a => { const e = estadoPrazoNota(a); return !!e && (e.est==="vivo" || e.est==="vencido"); };
  const fixos = raiz.filter(pzAberto).sort((x,y)=>{ const dx = estadoPrazoNota(x).data||"", dy = estadoPrazoNota(y).data||""; return dx<dy?-1:dx>dy?1:0; });
  if(fixos.length) for(let i = raiz.length-1; i>=0; i--) if(fixos.includes(raiz[i])) raiz.splice(i, 1);
  // F236 · o que veio de um portal conta como novo mesmo importado por mim (o selo "Novo · não lido" já contava),
  // salvo a linha de sistema, que não tem selo: o número do aviso, a linha divisória e os selos falam da mesma coisa
  const naoLi = a => !euLi(a) && (a.autor_id!==eu.id || (ORIGENS_ROBO.includes(a.origem) && !ehEventoSistema(a)));
  const novas = raiz.filter(naoLi).length;
  const ultimaNova = raiz.map(naoLi).lastIndexOf(true);
  const casoId = vivos.length ? vivos[0].caso_id : null;
  const li = a => {
    // as respostas também do mais recente ao mais antigo, como a linha do tempo (pedido do Paulo, 31.10.2026)
    const filhasTodas = (porPai.get(a.id)||[]).sort((x,y)=>(x.criado_em||"")<(y.criado_em||"")?1:-1);
    const reacoes = filhasTodas.filter(ehReacao);
    const filhas = filhasTodas.filter(f=>!ehReacao(f));
    const sub = filhas.length ? `<span class="resp">${filhas.map(f=>
      `<span class="resp-item">${comentario(f)}</span>`).join("")}</span>` : "";
    // F190 · o movimento do portal que cai aqui (CRPS, situação do INSS) sai no
    // cartão oficial, igual às outras abas, e não como anotação sem autor
    if(temaV10() && (a.origem==="crps" || (a.origem==="pat" && !ehEventoSistema(a))) && !filhas.length){
      const l = andLimpo(a, D.casoPorId.get(a.caso_id));
      return cartaoTl({q:l.q, em:iconeFonte(a.origem==="crps"?"crps":"inss"), rot:a.origem==="crps"?"Recurso":"INSS", texto:l.texto, and:a});
    }
    if(ehEventoSistema(a) && !filhas.length)
      return `<li class="tl-sys"><span class="texto" title="${esc(fmtTS(a.criado_em))} às ${esc(horaSP(a.criado_em))}">${esc(a.origem==="pat"?limparHtmlPat(a.texto):a.texto)}</span></li>`;
    // F236 · o cartão que cita você leva o selo, no cabeçalho (v10)
    const menc = (D.mencoes||[]).some(m=>m.andamento_id===a.id && m.para_id===eu.id);
    const html0 = comentario(a, sub, reacoes, true);
    const html = a._confMais ? html0.replace('<span class="tl-corpo">', `<span class="tl-conf-mais" title="conferências iguais anteriores, uma por linha no Caso completo">conferido mais ${a._confMais} ${a._confMais===1?"vez":"vezes"} desde ${fmt(a._confDesde)}</span><span class="tl-corpo">`) : html0;
    const pzV = (e=>e && e.est==="vencido" && _cumprindo!==a.id ? " tl-pz-venc" : "")(estadoPrazoNota(a));   // F326 · o cartão do prazo vencido sem registro
    return `<li class="${temaV10()?"tl-card ":""}${naoLi(a)?"tl-nao-lida":""}${clsSinal(a)}${pzV}">${menc ? html.replace('<span class="tl-cab-fim">', '<span class="chip tl-menc" title="esta anotação cita você e a menção ainda não foi lida">@ menciona você</span><span class="tl-cab-fim">') : html}</li>`;
  };
  // a linha do tempo vem do mais novo para o mais velho: os dias separam a
  // leitura, e a fronteira do "não lido" mostra até onde você precisa descer
  let corpo="", diaAtual=null, fronteira=false, passouNova=false, cortou=false;
  // F241 · à vista as TL_VISIVEIS anotações mais recentes; as anteriores num botão (26.11: só as 3 últimas, pedido do Paulo)
  const limite = TL_VISIVEIS, aberto = !casoId || _tlAntigos.has(casoId);
  for(const [i, a] of raiz.entries()){
    const d=dataSP(a.criado_em);
    if(!aberto && !cortou && i>=limite){
      if(diaAtual!==null){ corpo+=fecharDia(); diaAtual=null; }
      corpo+=`</ul><button type="button" class="tl-bt tl-antigos-bt" onclick="tlVerAntigos(this,'${casoId}')">Ver anotações anteriores</button><ul class="timeline tl-antigos" hidden>`;
      cortou=true;
    }
    // F236 · a linha vai depois da ÚLTIMA nova: abaixo dela não sobra nada por ler
    if(passouNova && !fronteira && i>ultimaNova){
      corpo+=`<li class="tl-fim-novas"><span>Você já tinha visto daqui para baixo</span></li>`;
      fronteira=true;
    }
    if(d!==diaAtual){ if(diaAtual!==null) corpo+=fecharDia(); corpo+=abrirDia(dataRelativa(d)); diaAtual=d; }
    corpo+=li(a);
    if(naoLi(a)) passouNova=true;
  }
  if(diaAtual!==null) corpo+=fecharDia();
  const bannerTxt = novas && casoId ? `🔵 ${novas} nova(s) para você desde a última visita` : "";
  // F236 · as menções a você não se misturam às outras novas: o aviso conta só elas
  const mencs = (D.mencoes||[]).filter(m=>m.andamento_id && m.para_id===eu.id && vivos.some(a=>a.id===m.andamento_id));
  const mencTxt = mencs.length ? `<span class="tl-banner-menc" title="o cartão leva o selo “@ menciona você”">@ ${mencs.length} ${mencs.length>1?"menções":"menção"} a você sem leitura (${
    esc(mencs.map(m=>`${((D.colPorId.get(m.de_id)||{}).nome||"").split(" ")[0]} ${fmt(dataSP(m.criado_em)).slice(0,5)}`).join(", "))})</span>` : "";
  // F244 · as novas e as menções num aviso só, com o "marcar todas como lidas" no fim
  const banner = bannerTxt || mencTxt ? `<div class="tl-banner tl-banner-um">${[bannerTxt, mencTxt].filter(Boolean).join(" <span class=\"tl-banner-sep\">·</span> ")}${
    bannerTxt ? `<button class="btn-mini" onclick="liTudoNaFicha('${casoId}')" title="✔ marcar todas como lidas"><span aria-hidden="true">✔ Lidas</span><span class="sr-only">✔ marcar todas como lidas</span></button>` : ""}</div>` : "";
  const fixHtml = fixos.length ? `<ul class="timeline tl-fixos" aria-label="Prazos das anotações">${fixos.map(a=>li(a).replace('<li class="', '<li class="tl-fixo ')).join("")}</ul>` : "";
  return banner + fixHtml + `<ul class="timeline">${corpo || fixHtml ? corpo
    : "<p class='meio-sub'>Sem andamentos ainda — escreva o primeiro no campo acima.</p>"}</ul>`;
}
const TL_VISIVEIS = 3, _tlAntigos = new Set();   // F241 · os casos em que se abriu a linha do tempo inteira, na sessão
function tlVerAntigos(bt, casoId){
  _tlAntigos.add(casoId);
  const ul = bt.nextElementSibling; if(ul) ul.hidden = false;
  bt.remove();
}

// ── 🌻 Andamentos INSS (PAT/Meu INSS) ────────────────────────────────────
// Os comentários que aparecem no processo dentro do site do INSS, coletados
// pela extensão e gravados na importação do PAT como andamentos com
// origem='pat' e o id do comentário no portal em origem_id. As mudanças de
// situação ("INSS: A → B") também têm origem 'pat', mas origem_id
// "situacao:...": essas ficam na linha do tempo do escritório, porque marcam
// fase, não conversa.
function ehComentarioPat(a){
  return a.origem==="pat" && a.origem_id && !String(a.origem_id).startsWith("situacao:");
}
function comentariosPat(ands){
  return (ands||[]).filter(a=>!a.excluir).filter(ehComentarioPat);
}
// Os movimentos coletados do PJe pela extensão (origem='pje') são andamento
// OFICIAL do processo judicial: o lugar deles é a aba ⚖️ CNJ, junto do
// DataJud — na linha do tempo do escritório eles soterravam a conversa.
function andamentosPje(ands){
  return (ands||[]).filter(a=>!a.excluir && a.origem==="pje")
    .sort((a,b)=>(a.criado_em||"")<(b.criado_em||"")?1:-1);
}

// ── 🗄 arquivar POR PROCESSO ─────────────────────────────────────────────
// Arquivado não é do caso, é de cada processo: um caso pode ter o recurso
// nº 1 morto e o nº 2 vivo, ou o 1º grau baixado e o TRF3 andando. Por isso
// casos.arquivados é um mapa chave -> {por, em}, com uma chave por processo:
// "pat" (o requerimento no INSS), "crps:<nup>" (cada recurso),
// "cnj:<instância>" (cada grau). A aba só se diz arquivada quando TODAS as
// chaves dela estão no mapa — um processo vivo mantém a aba viva.
function arqInfo(k, chave){ return ((k&&k.arquivados)||{})[chave] || null; }
// ══════════════════════════════════════════════════════════════════════════
// A FASE ACABOU (por ABA, não por processo)
// ══════════════════════════════════════════════════════════════════════════
// Arquivar é de UM processo. Encerrar a fase é da ABA inteira: "o recurso
// administrativo acabou, agora é judicial". A aba não some — fica em cinza,
// com o histórico onde estava, e o botão desfaz a qualquer momento.
// Nada disso é automático, DE PROPÓSITO. Um mandado de segurança impetrado
// para destravar algo DENTRO do recurso não encerra o recurso — ele continua
// correndo. Nenhuma regra adivinha essa diferença; quem sabe é quem lê os
// autos, e por isso a marca é sempre da mão de alguém. Vale nas três abas,
// nos dois sentidos, e desfaz-se do mesmo jeito.
// Mora em casos.arquivados, no mesmo mapa do 🗄, com a chave "aba:<qual>" —
// coluna nova nenhuma.
const ROT_ABA = {pat:"Andamentos INSS", crps:"Recurso (CRPS)", cnj:"Andamentos do CNJ"};
// ══════════════════════════════════════════════════════════════════════════
// QUAIS SUB-ABAS ESTE CASO TEM
// ══════════════════════════════════════════════════════════════════════════
// Escritório e Caso completo existem sempre. As outras três pedem o SEU
// gatilho — antes apareciam vazias em toda ficha. O gatilho é sempre um dado
// concreto, e o número que falta se digita em ➕ mais informações.
// A fase encerrada mantém a aba de pé, em cinza: encerrar não apaga história.
function abasVisiveis(k, ands){
  k = k || {};
  return {
    escritorio: true,
    inss: !!(comentariosPat(ands).length || protocolosDe(k).length || k.nb || (Array.isArray(k.nbs) && k.nbs.length) || faseEncerrada(k,"pat")),
    crps: !!(crpsNups(k).length || crpsTotalEventos(k) || faseEncerrada(k,"crps")),
    cnj:  !!(k.processo || (Array.isArray(k.processos) && k.processos.length)
      || (k.datajud && (k.datajud.ultimo || (k.datajud.instancias||[]).length))
      || andamentosPje(ands).length || faseEncerrada(k,"cnj")),
    tudo: true,
  };
}
function faseEncerrada(k, qual){ return !!arqInfo(k, "aba:"+qual); }
async function alternarFaseAba(casoId, qual){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const chave = "aba:"+qual, m = {...(k.arquivados||{})};
  const fechando = !m[chave];
  // F236 · o botão era "✔ fase encerrada" e se lia como estado: encerrar pede confirmação
  if(fechando && !await confirmar(`Encerrar a fase "${ROT_ABA[qual]||qual}" deste caso?\n\nA aba fica em cinza, sem perder nada, e o ↩ reabrir desfaz.`)) return;
  if(fechando) m[chave] = {por:eu.id, em:new Date().toISOString()};
  else delete m[chave];
  try{
    await patchCaso(k.id, {arquivados:m});
  }catch(e){ return aviso("Rode o crm/fase2/schema_por_em_dia.sql no Supabase — falta a coluna 'arquivados'"); }
  k.arquivados = m;
  aviso(fechando ? `✔ ${ROT_ABA[qual]||qual}: fase encerrada — a aba fica em cinza`
                 : `${ROT_ABA[qual]||qual}: fase reaberta`, false);
  abrirFicha(clienteAberto);
}
// o botão, no cabeçalho de cada painel
function botaoFaseAba(k, qual){
  const a = arqInfo(k, "aba:"+qual), co = a && D.colPorId.get(a.por);
  const cls = temaV10() ? "tl-bt tl-quieto" : "btn-mini";
  return a
    ? `<span class="chip neutro" title="fase encerrada${co?" por "+esc(co.nome):""} em ${fmtTS(a.em)}">✔ fase encerrada${co?` por ${esc(co.inicial)}`:""}</span>
       <button class="${cls}" onclick="alternarFaseAba('${k.id}','${qual}')"
         title="voltar a tratar esta fase como em andamento">↩ reabrir</button>`
    : ({pat:"inss", crps:"conselho", cnj:"judicial"}[qual]===faseDaEtapa(k)) ? ""   // F236 · na fase atual não se encerra a aba
    : `<button class="${cls}" onclick="alternarFaseAba('${k.id}','${qual}')"
        title="esta etapa terminou e o caso seguiu para a próxima — a aba fica em cinza, sem perder nada. Não use por causa de mandado de segurança: o MS não encerra o recurso."><span aria-hidden="true">Encerrar…</span><span class="sr-only">Encerrar esta fase…</span></button>`;
}
function chaveCnj(inst, n){
  return "cnj:" + (inst&&inst.rotulo ? dsa(inst.rotulo).replace(/\s+/g,"_") : String(n));
}
// as instâncias do CNJ como o painel mostra — helper único para o painel e
// para a etiqueta da aba não divergirem
function cnjInstancias(k, dj){
  const t=dj||k.datajud||{};
  return (t.instancias&&t.instancias.length) ? t.instancias
    : [{rotulo:"Processo", orgao:t.orgao, classe:t.classe, ultimo:t.ultimo,
        historico:(t.recentes||[]).map(m=>({...m,decisao:false})), decisao:null}];
}
function abaPatArquivada(k){ return !!arqInfo(k,"pat"); }
function abaCrpsArquivada(k){
  const bl=crpsBlocos(k).filter(b=>(b.eventos||[]).length);
  return !!bl.length && bl.every(b=>arqInfo(k, "crps:"+soDig(b.nup)));
}
function abaCnjArquivada(k){
  if(!(k.datajud && (k.datajud.ultimo || (k.datajud.instancias||[]).length))) return false;
  return cnjInstancias(k).every((x,n)=>arqInfo(k, chaveCnj(x,n)));
}
async function alternarArquivo(casoId, chave){
  const k=D.casoPorId.get(casoId); if(!k) return;
  const m={...(k.arquivados||{})};
  if(m[chave]) delete m[chave];
  else m[chave]={por:eu.id, em:new Date().toISOString()};
  try{
    await patchCaso(k.id, {arquivados:m});
  }catch(e){ return aviso("Rode o crm/fase2/schema_por_em_dia.sql no Supabase — falta a coluna 'arquivados'"); }
  k.arquivados=m;
  aviso(m[chave]?"🗄 Processo arquivado":"Processo reativado", false);
  abrirFicha(clienteAberto);
}
// o selo + o botão, no canto direito do quadro do processo
function seloArquivo(k, chave){
  const a=arqInfo(k, chave), co=a&&D.colPorId.get(a.por);
  return a
    ? `<span style="margin-left:auto;display:inline-flex;align-items:center;gap:6px">
        <span class="chip neutro" title="arquivado${co?" por "+esc(co.nome):""} em ${fmtTS(a.em)} ${horaSP(a.em)}">🗄 arquivado${co?` por ${esc(co.inicial)}`:""} · ${fmtTS(a.em)}</span>
        <button class="btn-mini" onclick="alternarArquivo('${k.id}','${chave}')">reativar</button></span>`
    : `<button class="btn-mini" style="margin-left:auto" onclick="alternarArquivo('${k.id}','${chave}')"
        title="marcar ESTE processo como arquivado — fica registrado quem e quando">🗄 arquivar</button>`;
}

// o quadro, nos moldes da aba 🖥 Recurso (CRPS): o oficial em zebra própria,
// com a data à esquerda, sem misturar com o que o escritório escreve. O texto
// já vem gravado com quem falou na frente ("INSS · " ou "Escritório · ") —
// aqui isso vira etiqueta, porque é o que muda o que se faz a seguir.
// F374 · A TELA DO PAT: o requerimento como o portal do INSS o mostra, a partir
// do detalhe que a extensão já coleta (casos.pat, por protocolo, gravado ao
// aplicar a coleta). Os anexos abrem o arquivo guardado em pat/<protocolo>/<id>.
const PAT_CAMPOS = ["protocolo","status","nomeServico","siglaServico","especieBeneficio","nomeUnidade",
  "nomeUnidadeCriacao","dataEntradaRequerimento","dataCriacao","tipoExigencia","descricaoEtapaPericia",
  "descricaoEtapaAvaliacao","tipoCanalAtendimento"];
const escolherCampos = (o, ks) => Object.fromEntries(ks.filter(x=>o && o[x]!=null && o[x]!=="").map(x=>[x, o[x]]));
function blocoPat(det, linha, em){
  const ag = (l, tipo) => (l||[]).map(a=>({...escolherCampos(a, ["data","horario","nomeUnidade","situacaoAgendamento"]), tipo}));
  return { ...escolherCampos(det, PAT_CAMPOS),
    ...escolherCampos(linha, ["dataUltimaAtualizacao"]),
    comentarios: (det.comentarios||[]).filter(c=>c && c.visivel!==false)
      .map(c=>escolherCampos(c, ["id","dataCriacao","conteudo","incluidoPorServidor"])),
    anexos: (det.anexos||[]).map(a=>escolherCampos(a, ["id","nomeArquivo","descricaoArquivo","categoria","tamanho","siapeCriador","idComentario","dataCriacao"])),
    agendamentos: [...ag(det.agendamentosPericia, "Perícia médica"), ...ag(det.agendamentosAvaliacaoSocial, "Avaliação social")],
    coletado_em: em || null };
}
// só os protocolos que o caso tem hoje, do mais recente ao mais antigo
const telasPat = k => { const ps = new Set((k.protocolos||[]).map(soDig));
  return Object.values(k.pat||{}).filter(b=>ps.has(soDig(b.protocolo)))
    .sort((a,b)=>String(b.dataEntradaRequerimento||"")<String(a.dataEntradaRequerimento||"")?-1:1); };
const dataPat = s => { const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}:\d{2}))?/.exec(String(s||""));
  return m ? `${m[3]}/${m[2]}/${m[1]}${m[4]?` ${m[4]}`:""}` : String(s||""); };
const rotuloPat = s => { const t = String(s||"").replace(/_/g," ").toLowerCase(); return t.charAt(0).toUpperCase()+t.slice(1); };
// os anexos em árvore. Por data (padrão, pedido do Paulo): o anexo preso a um comentário fica na
// data dele; o resto, na data de entrada do requerimento (o anexo do PAT não tem data própria).
// Por tipo: as respostas a cada exigência (idComentario), o que o INSS juntou (siapeCriador) e o
// que o escritório enviou, por tipo do documento
let arvPatData = true;
// F416 · o "Baixar Processo" do PAT só traz o processo inteiro no requerimento
// concluído ou cancelado (`pat/<p>/processo-integral`); antes disso entrega as
// "Informações da Tarefa" daquela data (`processo-integral-<situação>`), sem os
// documentos. O inteiro vence; o parcial fica com o nome do que é.
function integralDoPat(caminhos, p){
  const base = `pat/${p}/processo-integral`, l = [...caminhos].filter(c=>c===base || String(c).startsWith(base+"-"));
  if(l.includes(base)) return {caminho: base, rot: "Processo administrativo inteiro"};
  if(!l.length) return null;
  const c = l.sort().pop();
  return {caminho: c, rot: `Cópia parcial (${c.slice(base.length+1).replace(/-/g," ")})`};
}
function arvorePat(b, p, guardados, abrir, integral){
  const modo = `<span class="sub-menu fontes" style="margin-left:8px;display:inline-flex">
    <button class="${arvPatData?"on":""}" onclick="arvPatData=true;repintarFicha()" title="uma pasta por data, da mais recente à mais antiga">Data</button>
    <button class="${arvPatData?"":"on"}" onclick="arvPatData=false;repintarFicha()" title="exigências, juntados pelo INSS e enviados pelo escritório por tipo">Tipo</button></span>`;
  return `<h4 style="font-size:13px;margin:8px 0 4px">Documentos (${(b.anexos||[]).length})${modo}</h4>` + arvorePatRamos(b, p, guardados, abrir, integral);
}
function arvorePatRamos(b, p, guardados, abrir, integral){
  const coms = new Map((b.comentarios||[]).map(c=>[String(c.id), c]));
  const arq = a => { const c = `pat/${p}/${a.id}`;
    return `<li>${guardados.has(c) ? abrir(c, a.nomeArquivo||"anexo") : `<span class="meio-sub" title="a extensão ainda não baixou este anexo">${esc(a.nomeArquivo||"anexo")} (não baixado)</span>`}${a.dataCriacao?` <span class="meio-sub">${esc(dataPat(a.dataCriacao))}</span>`:""}</li>`; };
  const pasta = (rot, itens, sub) => `<li><details><summary>📁 ${esc(rot)} (${itens})</summary><ul class="pat-arv">${sub}</ul></details></li>`;
  const porGrupo = (lista, chave) => { const m = new Map(); lista.forEach(a=>{ const g = chave(a); m.set(g, [...(m.get(g)||[]), a]); }); return m; };
  const exig = [], inss = [], esc_ = [];
  (b.anexos||[]).forEach(a=>{ const c = a.idComentario!=null && coms.get(String(a.idComentario));
    (c && c.incluidoPorServidor ? exig : a.siapeCriador ? inss : esc_).push(a); });
  const rotExig = id => { const c = coms.get(String(id)); const t = limparHtmlPat(c.conteudo).slice(0, 70);
    return `${dataPat(c.dataCriacao).slice(0,10)} · ${t}${t.length>=70?"…":""}`; };
  const tipo = a => { const d = String(a.descricaoArquivo||"").trim(); return !d || /^outros documentos$/i.test(d) ? "Outros" : d; };
  const tipos = [...porGrupo(esc_, tipo)].sort(([x],[y])=>x==="Outros"?1:y==="Outros"?-1:x.localeCompare(y));
  if(arvPatData){
    const entrada = String(b.dataEntradaRequerimento||"").slice(0,10), m = new Map();
    (b.anexos||[]).forEach(a=>{ const c = a.idComentario!=null && coms.get(String(a.idComentario));
      const ch = c ? `c${c.id}` : `e${String(a.dataCriacao||entrada).slice(0,10)}`;
      if(!m.has(ch)) m.set(ch, {iso: c ? String(c.dataCriacao||"") : String(a.dataCriacao||entrada), c, l: []});
      m.get(ch).l.push(a); });
    const ramos = (integral ? `<li>📄 ${abrir(integral.caminho, integral.rot)}</li>` : "")
      + [...m.values()].sort((x,y)=>y.iso<x.iso?-1:1).map(({iso, c, l})=>{
        const dia = dataPat(iso).slice(0,10);
        if(!c) return pasta(`${dia} · ${iso.slice(0,10)===entrada?"Entrada do requerimento":"Documentos juntados"}`, l.length, l.map(arq).join(""));
        const t = limparHtmlPat(c.conteudo).slice(0, 70), rot = `${dia} · ${c.incluidoPorServidor?"Exigência do INSS":"Comentário do escritório"} · ${t}${t.length>=70?"…":""}`;
        return c.incluidoPorServidor
          ? `<li><details><summary><b>📁 ${esc(rot)} (${l.length})</b></summary><ul class="pat-arv">${l.map(arq).join("")}</ul></details></li>`
          : pasta(rot, l.length, l.map(arq).join("")); }).join("");
    return ramos ? `<ul class="pat-arv pat-raiz">${ramos}</ul>` : `<p class="meio-sub">Sem documentos neste requerimento.</p>`;
  }
  const ramos = [
    integral ? `<li>📄 ${abrir(integral.caminho, integral.rot)}</li>` : "",
    exig.length ? pasta("Respostas a exigências", exig.length, [...porGrupo(exig, a=>a.idComentario)].map(([id, l])=>pasta(rotExig(id), l.length, l.map(arq).join(""))).join("")) : "",
    inss.length ? pasta("Juntados pelo INSS", inss.length, inss.map(arq).join("")) : "",
    esc_.length ? pasta("Enviados pelo escritório", esc_.length, tipos.map(([t, l])=>pasta(t, l.length, l.map(arq).join(""))).join("")) : ""
  ].join("");
  return ramos ? `<ul class="pat-arv pat-raiz">${ramos}</ul>` : `<p class="meio-sub">Sem documentos neste requerimento.</p>`;
}
function telaPat(k, b){
  const p = soDig(b.protocolo);
  const guardados = new Map(docsDaOrigem(k, ["pat"]).map(d=>[d.caminho, d]));
  const abrir = (caminho, rot) => `<button class="btn-mini" onclick="abrirDecisao('${escJs(caminho)}')" title="abrir o arquivo guardado no CRM">📄 ${esc(rot)}</button>`;
  const integral = integralDoPat(guardados.keys(), p);
  const cab = [["Protocolo", b.protocolo], ["Serviço", b.nomeServico], ["Situação", situacaoDe(b.status) || rotuloPat(b.status)],
    ["Exigência", b.tipoExigencia && rotuloPat(b.tipoExigencia)], ["Data de entrada", dataPat(b.dataEntradaRequerimento)],
    ["Última atualização", dataPat(b.dataUltimaAtualizacao)], ["Unidade", b.nomeUnidade], ["Unidade de criação", b.nomeUnidadeCriacao],
    ["Etapa da perícia", b.descricaoEtapaPericia], ["Etapa da avaliação social", b.descricaoEtapaAvaliacao]].filter(x=>x[1]);
  const coms = [...(b.comentarios||[])].sort((x,y)=>String(y.dataCriacao||"")<String(x.dataCriacao||"")?-1:1);
  const ags = b.agendamentos||[];
  return `<div class="fatos tela-pat" style="margin-bottom:12px">
    <div class="fatos-topo"><h3 style="font-size:14px">PAT · ${esc(b.protocolo||"")}</h3>
      <span style="margin-left:auto">${integral ? abrir(integral.caminho, integral.caminho.endsWith("processo-integral") ? "Processo integral" : "Cópia parcial") : ""}</span></div>
    <table class="tab" style="margin-bottom:10px">${cab.map(([r,v])=>`<tr><th style="text-align:left;white-space:nowrap">${r}</th><td>${esc(v)}</td></tr>`).join("")}</table>
    ${ags.length ? `<h4 style="font-size:13px;margin:8px 0 4px">Agendamentos</h4>
    <table class="tab pat-ag"><tr><th>Data</th><th>Tipo</th><th>Local</th><th>Situação</th></tr>
      ${ags.map(a=>`<tr><td style="white-space:nowrap">${esc(a.data||"")} ${esc(a.horario||"")}</td><td>${esc(a.tipo)}</td><td>${esc(a.nomeUnidade||"")}</td><td>${esc(rotuloPat(a.situacaoAgendamento))}</td></tr>`).join("")}
    </table>` : ""}
    <h4 style="font-size:13px;margin:8px 0 4px">Comentários (${coms.length})</h4>
    <table class="tab pat-com"><tr><th>Data</th><th>Autor</th><th>Comentário</th></tr>
      ${coms.map(c=>`<tr><td style="white-space:nowrap">${esc(dataPat(c.dataCriacao))}</td><td>${c.incluidoPorServidor?"INSS":"Escritório"}</td><td>${esc(limparHtmlPat(c.conteudo))}</td></tr>`).join("")}
    </table>
    ${arvorePat(b, p, guardados, abrir, integral)}
    <div class="fatos-pe" style="justify-content:flex-end"><span class="meio-sub">lido do PAT${b.coletado_em?` em ${esc(dataPat(b.coletado_em))}`:""}</span></div>
  </div>`;
}
// F383 · as abas INSS, Conselho e Judicial abrem em PROCESSOS (decisão do Paulo, 02.11.2026): todos os
// processos da fase, um quadro cada, com a árvore no padrão comum (processo, data, documento; o mais
// recente no alto; decisão em destaque; a origem na etiqueta; sem pasta vazia), os botões Tela, Inteiro,
// Portal e Claude, os filtros Todos, Decisões e Escritório e o "Ligado a" com os números das outras
// fases do caso. Andamentos, ao lado de Processos, devolve a aba de antes; a escolha fica no navegador.
// shortcut: no navegador automatizado a aba abre em Andamentos, como as provas antigas esperam; tirar quando elas migrarem
let vistaProc = (()=>{ try{ const v = localStorage.getItem("crm_vista_proc"); return v ? v==="proc" : !navigator.webdriver; }catch(e){ return true; } })();
let filtroArv = "todos";
function mudarVistaProc(v){ vistaProc = v; try{ localStorage.setItem("crm_vista_proc", v ? "proc" : "and"); }catch(e){} repintarFicha(); }
const RX_PECA_DEC = /senten[cç]|ac[oó]rd[aã]|decis[aã]o|monocr|despacho\/decis|julgamento/i;
const RX_PECA_INSS = /contesta|contrarraz\w* do inss|inss|procuradoria|\bagu\b/i;
const RX_PECA_ESC = /peti[cç]|inicial|manifesta|r[eé]plica|recurso|raz[oõ]es|procura[cç]|embargos|quesitos|impugna/i;
// shortcut: a origem da peça judicial sai do nome, porque a coleta não traz o polo; troca quando trouxer
const origemPeca = d => { const n = rotPeca(d); return RX_PECA_DEC.test(n) ? "Juízo" : RX_PECA_INSS.test(n) ? "INSS" : RX_PECA_ESC.test(n) ? "Escritório" : "Juízo"; };
function processosDaFase(k, aba){
  if(aba==="inss") return telasPat(k).map(b=>{ const p = soDig(b.protocolo);
    return { aba, tipo:"prot", d:p, id:`Protocolo ${b.protocolo}`, tit:b.nomeServico||"Requerimento", sit:situacaoDe(b.status)||rotuloPat(b.status),
      dec:/indefer|deferid|conclu/i.test(String(b.status||"")), ult:String(b.dataUltimaAtualizacao||b.dataEntradaRequerimento||""), b,
      n:(b.anexos||[]).length, portal:PAT_TAREFA+p }; });
  if(aba==="crps") return crpsBlocos(k).filter(t=>(t.eventos||[]).length).map(t=>{ const e = [...t.eventos].sort(porDataDesc)[0]||{};
    return { aba, tipo:"nup", d:soDig(t.nup), id:`Recurso ${formatarNup(t.nup||"")}`, tit:t.orgao_atual||"Recurso no Conselho", sit:e.bruto||e.resumo||"",
      dec:e.tipo==="decisao", ult:isoCrps(e.data)||String(e.data||""), t,
      n:t.eventos.reduce((s,x)=>s+(x.arquivos||[]).length,0), portal:linkERecursos(t.nup) }; });
  const docs = docsDaOrigem(k, DOCS_JUDICIAIS), ps = processosDoCaso(k), links = linksPjeDoCaso(k);
  return ps.map(p=>{ const d = soDig(p.numero), u = (datajudDe(k, p.numero)||{}).ultimo||{};
    const meus = docs.filter(x=>{ const n = numDoAnexo(x); return n ? n.d===d : p.principal; });
    const lk = Object.entries(links).find(([g])=>g.startsWith(d+"|")) || (p.principal && Object.entries(links).find(([g])=>!g.includes("|")));
    return { aba, tipo:"proc", d, id:p.numero, principal:p.principal||ps.length===1, tit:rotuloProcesso(k, p), sit:u.nome||"", dec:RX_PECA_DEC.test(u.nome||""),
      ult:String(u.data||(meus[0]||{}).data||""), docs:meus, n:meus.length, portal:(lk||[])[1] || (p.principal ? k.pje_link : "") }; });
}
// F392 · a árvore do processo com o conteúdo (pedido do Paulo, 04.11.2026, proposta A): documentos e
// andamentos da fase numa árvore só, por data, a mais recente no alto, cada documento com a primeira
// frase do texto; Ler abre todos no leitor contínuo (o do processo inteiro, F289), Baixar faz o .zip
// do processo. A tela anterior fica em Detalhes.
let procIdx = {};
// a primeira frase de conteúdo: pula o cabeçalho em caixa alta, o carimbo e o endereço
function trechoDoc(d){
  for(const l0 of String((d&&d.texto)||"").split(/\n+/)){
    const l = l0.replace(/\s+/g," ").trim();
    if(l.length < 40 || /assinad[oa] eletronicamente|https?:|www\.|num\.\s*\d+\s*-\s*p[áa]g|p[áa]gina \d+ de \d+/i.test(l)) continue;
    const letras = l.replace(/[^A-Za-zÀ-ÿ]/g,"");
    if(letras.length < 20 || letras.replace(/[^a-zß-ÿ]/g,"").length / letras.length < .5) continue;
    return l.length > 150 ? l.slice(0,147).replace(/\s+\S*$/,"") + "…" : l;
  }
  return "";
}
function docsDoProcesso(k, x){
  if(x.aba==="cnj") return x.docs;
  if(x.aba==="inss") return documentosDoCaso(k).filter(d=>String(d.caminho||"").startsWith(`pat/${x.d}/`));
  const cams = new Set(x.t.eventos.flatMap(e=>(e.arquivos||[]).map(a=>a.storage)).filter(Boolean));
  return documentosDoCaso(k).filter(d=>cams.has(d.caminho));
}
// documentos e andamentos do processo, cada um com a data, a origem e se decide
function itensDoProcesso(k, x){
  const docs = docsDoProcesso(k, x), porCam = new Map(docs.map(d=>[d.caminho, d])), it = [];
  const doc = (d, data, dec, ori, rot, mov) => it.push({tipo:"doc", d, data:String(data||d.data||"").slice(0,10), rot:rot||rotPeca(d), dec:!!dec, ori, mov, txt:trechoDoc(d)});
  const and = (data, txt, dec, ori) => txt && it.push({tipo:"and", data:String(data||"").slice(0,10), txt, dec:!!dec, ori});
  if(x.aba==="inss"){
    const coms = new Map((x.b.comentarios||[]).map(c=>[String(c.id), c]));
    const entrada = String(x.b.dataEntradaRequerimento||"").slice(0,10);
    const ig = integralDoPat(docs.map(d=>d.caminho), x.d);
    if(ig) doc(porCam.get(ig.caminho), x.ult||porCam.get(ig.caminho).data, false, "INSS", ig.rot);
    (x.b.anexos||[]).forEach(a=>{ const c = a.idComentario!=null && coms.get(String(a.idComentario));
      const d = porCam.get(`pat/${x.d}/${a.id}`) || {nome:a.nomeArquivo, caminho:null};
      doc(d, c ? c.dataCriacao : (a.dataCriacao||entrada), false, a.siapeCriador || (c && c.incluidoPorServidor) ? "INSS" : "Escritório", a.nomeArquivo||rotPeca(d)); });
    (x.b.comentarios||[]).forEach(c=>{ const t = limparHtmlPat(c.conteudo);
      and(c.dataCriacao, (c.incluidoPorServidor ? "Exigência do INSS: " : "Comentário do escritório: ") + (t.length>160 ? t.slice(0,157)+"…" : t),
        c.incluidoPorServidor, c.incluidoPorServidor ? "INSS" : "Escritório"); });
    and(entrada, "Entrada do requerimento", false, "");
    if(x.dec) and(x.ult, `Situação: ${x.sit}`, true, "INSS");
  } else if(x.aba==="crps"){
    x.t.eventos.forEach(e=>{ const dia = isoCrps(e.data)||e.data, rot = e.bruto||e.resumo||"";
      if((e.arquivos||[]).length) e.arquivos.forEach(a=>{ const d = porCam.get(a.storage) || {nome:a.nome, caminho:a.storage||null};
        doc(d, dia, e.tipo==="decisao" || a.decide, "Conselho", a.nome||"documento", rot); });
      else and(dia, rot, e.tipo==="decisao", ""); });
  } else {
    x.docs.forEach(d=>doc(d, d.data, RX_PECA_DEC.test(rotPeca(d)), origemPeca(d)));
    const comDoc = new Set(x.docs.map(d=>d.and_id).filter(Boolean));
    const ands = (D._andsFicha||[]).filter(a=>a.caso_id===k.id);
    const pje = pjeDoProcesso(ands, x.id, x.principal).filter(a=>!comDoc.has(a.id));
    if(pje.length) pje.forEach(a=>{ const t = eventoDoAndamento(a) || String(a.texto||"").replace(/^[^:]{0,60}:\s*/,"").slice(0,160);
      and(dataDoMovimento(a), t, RX_PECA_DEC.test(t), ""); });
    else { const t = datajudDe(k, x.id);
      if(t) cnjInstancias(k, t).forEach(inst=>(inst.historico||[]).forEach(m=>and(m.data, m.nome + (m.complemento?` · ${m.complemento}`:""), m.decisao, ""))); }
  }
  return it;
}
// a ordem da árvore: a data mais nova no alto e, no mesmo dia, a decisão e a juntada
const ordemArvDia = (a,b) => (b.dec-a.dec) || (a.tipo===b.tipo ? (a.tipo==="doc" ? ordemPeca(a.d, b.d) : 0) : a.tipo==="doc" ? -1 : 1);
const ordemArv = (a,b) => String(b.data).localeCompare(String(a.data)) || ordemArvDia(a,b);
// F430 · a etiqueta que se repete em quase todo item some: a origem da maioria (o Juízo no Judicial) fica no
// cabeçalho da árvore, e "Decisão" não se repete quando o nome já diz (Sentença, Decisão, Acórdão)
function oriComum(l){
  const c = new Map(); l.forEach(y=>y.ori && c.set(y.ori, (c.get(y.ori)||0)+1));
  const [o, n] = [...c].sort((a,b)=>b[1]-a[1])[0] || [];
  return n>=3 && n*2>l.filter(y=>y.ori).length ? o : ""; // F432 · os andamentos não têm origem e não entram na conta
}
const RX_NOME_DEC = /decis|senten|ac[óo]rd|monocr|exig[êe]ncia/i; // F431 · a exigência já se diz no nome
const etiquetasArv = (y, comum) => `${y.dec && !RX_NOME_DEC.test(y.rot||y.txt||"")?` <span class="arv-et dec">Decisão</span>`:""}${y.ori && y.ori!==comum?` <span class="arv-et">${esc(y.ori)}</span>`:""}`;
function arvoreUnica(k, aba, i, x, todos, sel){
  const it = (todos || itensDoProcesso(k, x)).filter(y=>filtroArv==="dec" ? y.dec : filtroArv==="doc" ? y.tipo==="doc" : filtroArv==="and" ? y.tipo==="and" : true);
  if(!it.length) return `<p class="meio-sub">${filtroArv==="todos" ? "Nada guardado deste processo ainda." : "Nada neste filtro."}</p>`;
  const dias = new Map(); it.forEach(y=>dias.set(y.data, [...(dias.get(y.data)||[]), y]));
  const comum = oriComum(todos || it);
  const lin = y => { const et = etiquetasArv(y, comum);
    if(y.tipo==="and") return `<li class="arv-and${y.dec?" dec":""}">${esc(y.txt)}${et}</li>`;
    const nome = y.d.caminho
      ? `<button class="arv-nome" onclick="procVer('${k.id}','${aba}',${i},'${escJs(y.d.caminho)}')" title="ler este documento">${esc(y.rot)}</button>`
      : `<span class="arv-nome" title="a extensão ainda não baixou este documento">${esc(y.rot)} (não baixado)</span>`;
    return `<li class="arv-doc${y.dec?" dec":""}${sel && y.d.caminho===sel?" sel":""}"${y.d.caminho?` data-cam="${esc(y.d.caminho)}"`:""}>${y.d.caminho ? botaoIaDoc(k.id, chaveDoc(y.d), y.d.nome, "db-bt arv-ia") : ""}${nome}${et}${y.mov?`<span class="arv-mov">${esc(y.mov)}</span>`:""}${y.txt?`<span class="arv-txt">${esc(y.txt)}</span>`:""}</li>`; };
  const dia = ([d, l]) => { l.sort(ordemArvDia); const ver = l.length>5 ? l.slice(0,4) : l, resto = l.length>5 ? l.slice(4) : [];
    return `<li class="arv-dia"><span class="arv-data">${d ? dataPat(d) : "Sem data"}</span><ul>${ver.map(lin).join("")}${resto.length
      ? `<li><details><summary>Mais ${resto.length} deste dia</summary><ul>${resto.map(lin).join("")}</ul></details></li>` : ""}</ul></li>`; };
  const ord = [...dias].sort(([a],[b])=>b.localeCompare(a)), VIS = 12;
  return `<ul class="arv-u">${ord.slice(0,VIS).map(dia).join("")}</ul>${ord.length>VIS
    ? `<details class="arv-antes"><summary>Mais ${ord.length-VIS} datas anteriores</summary><ul class="arv-u">${ord.slice(VIS).map(dia).join("")}</ul></details>` : ""}`;
}
const docsLegiveis = (k, x) => docsDoProcesso(k, x).filter(d=>d.caminho).slice().sort(ordemPeca);
function lerProcesso(casoId, aba, i, caminho){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const x = processosDaFase(k, aba)[i]; if(!x) return;
  abrirProcessoInteiro(casoId, docsLegiveis(k, x), caminho, `${ROT_FASE[aba]} · ${x.id}`, aba);
}
function baixarProcesso(casoId, aba, i){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const x = processosDaFase(k, aba)[i]; if(!x) return;
  baixarDocsZip(casoId, false, docsLegiveis(k, x));
}
function telaDoProcesso(casoId, aba, i){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const x = processosDaFase(k, aba)[i]; if(!x) return;
  caixa(`<div class="adr-modal proc-tela" role="dialog" aria-label="${esc(x.id)}">${aba==="inss" ? telaPat(k, x.b) : telaEsisrec(x.t)}
    <div class="adr-modal-bts"><button type="button" class="adr-bt" onclick="fecharCaixa()">Fechar</button></div></div>`);
}
// F418 · a aba Expedientes do PJe replicada (pedido do Paulo, 06.11.2026): as quatro colunas do PJe,
// um quadro por grau, sem criar prazo. Vem de casos.ronda.expedientes, gravado pela coleta do processo.
function expedientesDe(k, dig){
  return Object.entries((k.ronda||{}).expedientes||{}).filter(([c])=>c.split("|")[0]===dig)
    .map(([, v])=>v).sort((a,b)=>String(a.grau).localeCompare(String(b.grau)));
}
const dtExp = s => s ? `${fmt(String(s).slice(0,10))}${String(s).length>10?" "+String(s).slice(11,16):""}` : "";
function tabelaExpedientes(v, k, dig){
  const lin = e => `<tr${e.fechado?"":` class="exp-aberto"`}>
    <td><b>${esc(e.ato||"")}</b>${e.expediente_id?` <span class="meio-sub">(${esc(e.expediente_id)})</span>`:""}${e.prioridade?` <span class="meio-sub">· Prioridade: ${esc(e.prioridade)}</span>`:""}
      ${e.destinatario?`<div>${esc(e.destinatario)}</div>`:""}
      ${e.meio?`<div class="meio-sub">${esc(e.meio)}${e.enviado_em?` (${dtExp(e.enviado_em)})`:""}</div>`:""}
      ${e.ciencia_em?`<div class="meio-sub">O sistema registrou ciência em ${dtExp(e.ciencia_em)}</div>`:""}
      ${e.prazo_dias?`<div class="meio-sub">Prazo: ${e.prazo_dias} dias</div>`:""}</td>
    <td>${e.limite?`${dtExp(e.limite)}${e.limite_para?`<div class="meio-sub">(${esc(e.limite_para)})</div>`:""}`:esc(e.limite_txt||"")}</td>
    <td>${e.documento_id&&k?`<button type="button" class="btn-mini" onclick="verExpediente('${k.id}','${esc(dig)}','${esc(String(e.documento_id).replace(/\D/g,""))}')" title="Abrir a peça ${esc(e.documento_id)} no CRM"><span aria-hidden="true">Ver</span><span class="sr-only">Abrir a peça ${esc(e.documento_id)} no CRM</span></button>`:""}</td>
    <td>${e.fechado?"SIM":"<b>NÃO</b>"}</td></tr>`;
  return `<table class="exp-tab"><thead><tr><th>Ato de comunicação</th><th>Data limite prevista para ciência ou manifestação</th><th>Ações</th><th>Fechado</th></tr></thead>
    <tbody>${(v.itens||[]).map(lin).join("")||`<tr><td colspan="4" class="meio-sub">Nenhum expediente.</td></tr>`}</tbody></table>
    <p class="meio-sub">${(v.itens||[]).length} resultado${(v.itens||[]).length===1?"":"s"} encontrado${(v.itens||[]).length===1?"":"s"} · lido em ${dtExp(String(v.em||"").slice(0,16))}</p>`;
}
// F559 · o Ver do expediente abre a peça já guardada no CRM (pje/<processo>/<ID do documento>),
// no leitor do processo inteiro, e não o PJe (pedido do Paulo, 12.11.2026)
function verExpediente(casoId, dig, docId){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const i = processosDaFase(k, "cnj").findIndex(x=>x.d===dig), x = processosDaFase(k, "cnj")[i];
  const docs = x ? docsLegiveis(k, x) : [];
  const alvo = docs.find(d=>String(d.caminho||"").split("/").pop()===docId);
  fecharCaixa();
  if(alvo) return abrirProcessoInteiro(casoId, docs, alvo.caminho, `${ROT_FASE.cnj} · ${x.id}`, "cnj");
  caixa(`<div class="adr-modal" role="dialog" aria-label="Peça não importada"><h3>Peça ${esc(docId)} não está no CRM</h3>
    <p>O documento deste expediente ainda não foi importado. A próxima leitura do processo pela extensão o traz.</p>
    <div class="adr-modal-bts">${docs.length?`<button type="button" class="adr-bt pri" onclick="fecharCaixa();lerProcesso('${k.id}','cnj',${i})" title="Ler o processo inteiro"><span aria-hidden="true">Ler</span><span class="sr-only">Ler o processo inteiro</span></button>`:""}<button type="button" class="adr-bt" onclick="fecharCaixa()">Fechar</button></div></div>`);
}
function telaExpedientes(casoId, i){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const x = processosDaFase(k, "cnj")[i]; if(!x) return;
  const vs = expedientesDe(k, x.d);
  caixa(`<div class="adr-modal proc-tela exp-tela" role="dialog" aria-label="Expedientes de ${esc(x.id)}">
    <h3>Expedientes · ${esc(x.id)}</h3>${vs.map(v=>`${vs.length>1?`<h4>${esc(v.grau||"")}</h4>`:""}${tabelaExpedientes(v, k, x.d)}`).join("")}
    <div class="adr-modal-bts"><button type="button" class="adr-bt" onclick="fecharCaixa()">Fechar</button></div></div>`);
}
function claudeDoProcesso(casoId, aba, i){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const x = processosDaFase(k, aba)[i]; if(!x) return;
  const docs = docsDoProcesso(k, x).filter(d=>d.caminho);
  if(!docs.length) return aviso("Nenhum documento guardado neste processo");
  menuClaudeDocs(k.id, docs.map(chaveDoc), aba==="cnj" ? "processo" : undefined);
}
const ROT_FASE = {inss:"INSS", crps:"Conselho", cnj:"Judicial"};
// F395 · a proposta A inteira (04.11.2026): a árvore à esquerda e o documento escolhido à direita, no leitor
// da própria aba, com ↑ ↓, o zoom e Abrir; a situação e os processos ligados numa faixa só. Na coluna
// estreita (celular, WhatsApp aberto) o leitor some e o documento abre no leitor de tela cheia.
let docEscolhido = {}, _leitorNo = null;
const docsDaArvore = (k, x) => itensDoProcesso(k, x).filter(y=>y.tipo==="doc" && y.d.caminho).sort(ordemArv);
function procEscolhido(k, aba, i, x){
  const l = docsDaArvore(k, x), c = docEscolhido[`${k.id}|${aba}|${i}`];
  return (l.find(y=>y.d.caminho===c) || l.find(y=>y.dec) || l[0] || {}).d;
}
function leitorMiolo(k, aba, i, x, d){
  if(!d) return `<p class="meio-sub" style="padding:16px">Nenhum documento guardado deste processo.</p>`;
  const l = docsDaArvore(k, x), j = l.findIndex(y=>y.d.caminho===d.caminho), y = l[j] || {d, rot:rotPeca(d)};
  const cron = docsLegiveis(k, x), n = cron.findIndex(z=>z.caminho===d.caminho), fl = (flsDasPecas(cron)[n]);
  const ir = z => z ? `procVer('${k.id}','${aba}',${i},'${escJs(z.d.caminho)}')` : "";
  const prox = l[j+1];
  const z0 = piZoomSalvo();
  return `<div class="pl-cab">
      <b class="pl-tit">${esc(y.rot)}</b>${etiquetasArv(y, oriComum(itensDoProcesso(k, x)))}
      <span class="meio-sub">${[y.data?dataPat(y.data):"", fl?`fls. ${fl}`:"", j>=0?`${j+1} de ${l.length}`:""].filter(Boolean).join(" · ")}</span>
      <span class="pl-bts">${botaoIaDoc(k.id, chaveDoc(d), d.nome, "db-bt")}<span class="pi-zoom" role="group" aria-label="zoom do documento"><button class="btn-mini" onclick="piZoom(-1)" title="diminuir (Ctrl + roda)" aria-label="diminuir o zoom">−</button><output aria-live="polite">${Math.round(z0*100)} %</output><button class="btn-mini" onclick="piZoom(1)" title="aumentar (Ctrl + roda)" aria-label="aumentar o zoom">+</button></span>
      <button class="btn-mini" ${j>0?`onclick="${ir(l[j-1])}"`:"disabled"} title="documento anterior (mais recente)" aria-label="documento anterior">↑</button>
      <button class="btn-mini" ${prox?`onclick="${ir(prox)}"`:"disabled"} title="próximo documento (mais antigo)" aria-label="próximo documento">↓</button>
      <button class="btn-mini" onclick="${d.id?`abrirAnexo('${escJs(d.id)}')`:`abrirDecisao('${escJs(d.caminho)}')`}" title="abrir este documento em outra guia">Abrir</button></span></div>
    <div class="pl-corpo" style="--pi-zoom:${z0}"><section class="pi-peca" data-cam="${esc(d.caminho)}"><div class="pi-folha"><p class="meio-sub">Carregando…</p></div></section>
      ${prox?`<button class="pl-prox" onclick="${ir(prox)}" title="ler o documento seguinte">${esc(prox.rot)}${prox.ori?` · ${esc(prox.ori)}`:""}${prox.data?` · ${dataPat(prox.data)}`:""}</button>`:""}</div>`;
}
// o documento do leitor: o desenhado fica guardado e volta na repintura, sem buscar de novo
function procDesenhar(){
  const pane = document.querySelector(".proc-leitor"); if(!pane || !pane.offsetParent) return;
  const sec = pane.querySelector(".pi-peca"); if(!sec) return;
  const cam = sec.dataset.cam, k = D.casoPorId.get(pane.dataset.caso); if(!k) return;
  const corpo = pane.querySelector(".pl-corpo");
  if(corpo && !corpo._roda){ corpo._roda = 1; corpo.addEventListener("wheel", e=>{ if(!e.ctrlKey) return; e.preventDefault(); piZoom(e.deltaY<0 ? 1 : -1); }, {passive:false}); }
  if(_leitorNo && _leitorNo.cam===cam && _leitorNo.caso===k.id){ sec.replaceWith(_leitorNo.el);
    const o = obsFolhas(corpo);   // as folhas passam ao observador da área nova
    _leitorNo.el.querySelectorAll(".pi-pag").forEach(f=>{ if(f._obs) f._obs.unobserve(f); f._obs = o; if(o) o.observe(f); });
    return; }
  const x = processosDaFase(k, pane.dataset.aba)[+pane.dataset.i]; if(!x) return;
  const d = docsLegiveis(k, x).find(z=>z.caminho===cam); if(!d) return;
  if(_leitorNo && _leitorNo.el !== sec) soltarPdfs(_leitorNo.el);
  _leitorNo = {cam, caso:k.id, el:sec};
  desenharPeca(d, sec.querySelector(".pi-folha"));
}
function procVer(casoId, aba, i, cam){
  const pane = document.querySelector(".proc-leitor");
  if(!pane || !pane.offsetParent) return lerProcesso(casoId, aba, i, cam);
  const k = D.casoPorId.get(casoId); if(!k) return;
  const x = processosDaFase(k, aba)[i]; if(!x) return;
  docEscolhido[`${casoId}|${aba}|${i}`] = cam;
  const d = docsLegiveis(k, x).find(z=>z.caminho===cam);
  pane.innerHTML = leitorMiolo(k, aba, i, x, d);
  document.querySelectorAll(".proc-arv .arv-doc").forEach(li=>li.classList.toggle("sel", li.dataset.cam===cam));
  const li = document.querySelector(`.proc-arv .arv-doc.sel`); if(li) li.scrollIntoView({block:"nearest"});
  procDesenhar();
}
function vistaProcessos(k, aba){
  const lista = processosDaFase(k, aba);
  const i = Math.max(0, Math.min(procIdx[aba]||0, lista.length-1)), x = lista[i];
  const ev = evidenciaNbs([k]), nbDe = y => (nbDoNumero(ev, y.tipo, y.d)||{}).nb, nb = nbDe(x);
  const ligados = ["inss","crps","cnj"].filter(a=>a!==aba).flatMap(a=>processosDaFase(k, a))
    .filter(y=>{ const o = nbDe(y); return !nb || !o || o===nb; });
  const n = docsLegiveis(k, x).length;
  // F430c · com dois a quatro processos, uma aba por processo (o nome curto, a Justiça e quantos documentos);
  // acima disso, a lista. O título igual ao número não se repete.
  const rotProc = y => soDig(y.tit).includes(soDig(y.id)) ? y.id : `${y.id} · ${y.tit}`;
  // F431 · no INSS e no Conselho o nome se repete (o mesmo serviço, a mesma Junta): vai o ano e, se ainda empatar, o fim do número
  const curtoBase = y => { const g = soDig(y.id);
    if(y.aba==="cnj" && g.length===20){ const j = {"4":"Federal","8":"Estadual"}[g[13]] || "";
      return `${j?`${j} · `:""}${g.slice(0,7)}/${g.slice(9,13)}`; }
    const ano = y.aba==="crps" && g.length===17 ? g.slice(11,15) : String((y.b||{}).dataEntradaRequerimento||"").slice(0,4);
    const nome = y.tit && !soDig(y.tit).includes(g) ? y.tit : y.id.replace(/^(Protocolo|Recurso) /,"");
    return /^\d{4}$/.test(ano) && !nome.includes(ano) ? `${nome} · ${ano}` : nome; };
  const curtos = lista.map(curtoBase);
  const curtoProc = y => { const j = lista.indexOf(y), c = curtos[j];
    return curtos.filter(o=>o===c).length > 1 ? `${c} · nº ${y.aba==="crps" ? soDig(y.id).slice(5,11) : soDig(y.id).slice(-4)}` : c; };
  const escolha = lista.length>4
    ? `<select class="proc-sel" aria-label="processo desta fase" onchange="procIdx['${aba}']=+this.value;repintarFicha()">${lista.map((y,j)=>
        `<option value="${j}"${j===i?" selected":""}>${esc(rotProc(y))}</option>`).join("")}</select>`
    : lista.length>1
    ? `<span class="proc-abas" role="group" aria-label="processos desta fase">${lista.map((y,j)=>{ const nd = docsLegiveis(k, y).length;
        return `<button type="button" class="${j===i?"on":""}" aria-pressed="${j===i}" title="${esc(rotProc(y))}" onclick="procIdx['${aba}']=${j};repintarFicha()">${esc(curtoProc(y))}${nd?` <span class="proc-abas-n">${nd}</span>`:""}</button>`; }).join("")}</span>`
    : `${soDig(x.tit).includes(soDig(x.id))?"":`<span class="proc-id">${esc(x.id)}</span>`}<span class="proc-tit">${esc(x.tit)}</span>`;
  const todos = itensDoProcesso(k, x), nd = todos.filter(y=>y.tipo==="doc").length, na = todos.length - nd;
    // F432 · sem o botão Tudo: o filtro ligado, tocado de novo, volta a mostrar tudo
  const filtros = `<span class="sub-menu fontes proc-filtros">${[["dec","Decisões"],["doc","Documentos"],["and","Andamentos"]].filter(([f])=>
    filtroArv===f || (f==="dec" ? todos.some(y=>y.dec) : f==="and" ? na && nd : nd && na)).map(([f,r])=>{ const on = filtroArv===f;
    return `<button class="${on?"on":""}" aria-pressed="${on}" title="${on?"mostrar tudo de novo":`mostrar só ${r.toLowerCase()}`}" onclick="filtroArv='${on?"todos":f}';repintarFicha()">${r}</button>`; }).join("")}</span>`;
  const bts = [
    n ? `<button class="btn-mini proc-pri" onclick="lerProcesso('${k.id}','${aba}',${i})" title="abrir os ${n} documentos deste processo num leitor contínuo, em tela cheia">Ler</button>` : "",
    n ? `<button class="btn-mini" onclick="baixarProcesso('${k.id}','${aba}',${i})" title="baixar os ${n} documentos deste processo em .zip">Baixar</button>` : "",
    n ? `<button class="btn-mini" onclick="claudeDoProcesso('${k.id}','${aba}',${i})" title="pedir ao Claude com os documentos deste processo">Claude</button>` : "",
    x.portal ? `<a class="btn-mini" href="${urlOk(x.portal)}" target="_blank" rel="noopener" title="abrir no sistema oficial">Portal</a>` : "",
    x.aba!=="cnj" ? `<button class="btn-mini" onclick="telaDoProcesso('${k.id}','${aba}',${i})" title="a tela do ${x.aba==="inss"?"PAT":"e-SISREC"}: cabeçalho, comentários e movimentações">Tela</button>` : "",
    x.aba==="cnj" && expedientesDe(k, x.d).length ? `<button class="btn-mini" onclick="telaExpedientes('${k.id}',${i})" title="a aba Expedientes do PJe: atos de comunicação, data limite e fechado">Expedientes</button>` : "",
    `<button class="btn-mini" onclick="mudarVistaProc(false)" title="a tela anterior desta aba: as fontes, a fase e a gestão dos processos">Detalhes</button>`];
  // F430 · uma ação à vista (Ler); as demais no ⋯, para a barra caber numa linha
  // F432 · os processos ligados (das outras fases) também vão ao ⋯: a tela fica com o essencial
  const lig = ligados.length ? `<span class="proc-lig"><span class="proc-mais-sec">Ligado a</span>${ligados.map(y=>`<button class="btn-mini" onclick="irSubAba('${y.aba}')"
      title="abrir ${esc(y.id)} em ${ROT_FASE[y.aba]}">${ROT_FASE[y.aba]} · ${esc(y.id.replace(/^(Protocolo|Recurso) /,""))}</button>`).join("")}</span>` : "";
  const btsHtml = bts[0] + `<details class="tl-mais proc-mais"><summary class="tl-bt tl-bt-ic" aria-label="Mais ações do processo" title="baixar, Claude, portal, tela, detalhes${lig?" e os processos ligados":""}">${IC_SVG.mais}</summary><span class="tl-mais-menu" role="menu">${bts.slice(1).join("")}${lig}</span></details>`;
  const d = n ? procEscolhido(k, aba, i, x) : null;
  if(d) setTimeout(procDesenhar, 0);
  const sit = x.sit ? `<span class="proc-sit-r"><b>Situação:</b> <span class="${x.dec?"dec":""}">${esc(x.sit.slice(0,80))}</span>${x.ult?` <span class="meio-sub">${esc(dataPat(x.ult.slice(0,10)))}</span>`:""}</span>` : "";
  return `<div class="proc-v">
    <div class="proc-barra">${escolha}${filtros}<span class="proc-bts">${btsHtml}</span></div>
    ${sit?`<div class="proc-situ">${sit}</div>`:""}
    <div class="proc-grade${d?"":" so-arv"}" style="--db-cor:${COR_FASE_DB[aba]||COR_FASE_DB.cnj}">
      <div class="proc-arv"><div class="proc-arv-cab"><b>Processo</b> <span class="meio-sub">${[nd?`${nd} documento${nd===1?"":"s"}`:"", na?`${na} andamento${na===1?"":"s"}`:"", oriComum(todos)].filter(Boolean).join(" · ")}</span></div>${arvoreUnica(k, aba, i, x, todos, d && d.caminho)}</div>
      ${d?`<div class="proc-leitor" data-caso="${k.id}" data-aba="${aba}" data-i="${i}" role="region" aria-label="documento escolhido">${leitorMiolo(k, aba, i, x, d)}</div>`:""}
    </div>
  </div>`;
}
