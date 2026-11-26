// F55 · a frase-viva do 📌: mesma linguagem do rodapé das anotações
function atualizarFraseSeg(){
  const el=document.getElementById("seg-frase"); if(!el||!segAberto) return;
  const v=id=>{const e=document.getElementById(id);return e?e.value:"";};
  el.innerHTML = fraseAcao({quem:[...segAberto.quem], lembrar:v("seg-data"), prazo:v("seg-prazo")})
    .replace("registra a anotação","registra a anotação no caso");
}

// os passos marcados do roteiro viram andamento + tarefa, na ordem em que o
// escritório os executa. Cada passo é independente: desmarcado, não nasce.
async function gravarRoteiroPericia(s){
  const feito=[];
  const val = id => (document.getElementById(id)||{}).value||"";
  const on  = id => !!(document.getElementById(id)||{}).checked;
  if(!document.getElementById("rot-atend")) return feito;   // roteiro fora da tela
  const k = D.casoPorId.get(s.casoId)||{}, c = D.cliPorId.get(k.cliente_id)||{};
  const nome1 = (c.nome||"o cliente").split(" ")[0];
  const a = evFem(s.ev.tipo)?"a":"o";
  const tipo = String(s.ev.tipo||"Perícia").toLowerCase();
  const quandoEv = `${fmt(s.ev.data)} às ${s.ev.hora}`;
  const passo = async (texto, dia, quem) => {
    const [novo]=await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:s.casoId, autor_id:eu.id, origem:"app", publico:false,
        texto, ...(s.andId?{responde_a:s.andId}:{})})})||[];
    if(novo && dia && quem){
      const [tf]=await api(`/rest/v1/andamento_tarefas`,{method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({andamento_id:novo.id, caso_id:s.casoId, colaborador_id:quem,
                             atribuido_por:eu.id, lembrar_em:dia})});
      tarefaNaMemoria(tf);
    }
    return novo;
  };
  if(on("rot-ques")){
    if(val("rot-ques-tipo")==="feito"){
      await passo(`📝 Quesitos d${a} ${tipo} de ${fmt(s.ev.data)} apresentados.`, "", null);
      feito.push("quesitos registrados");
    } else {
      const d=val("rot-ques-data"), q=val("rot-ques-quem")||eu.id, pq=prazoDeQuesitos(k);
      // F236 · a tarefa diz que é também a vez do assistente técnico e prende-se ao prazo do tribunal pelo carimbo [PRAZO]
      await passo(`📝 Apresentar os quesitos d${a} ${tipo} de ${quandoEv} e decidir sobre o assistente técnico${pq?` — prazo do ${ROT_PRAZO[pq.sistema]||pq.sistema||"tribunal"}: ${fmt(pq.fim)} [PRAZO ${fmt(pq.fim)}]`:""}.`, d, q);
      feito.push(`quesitos ${fmt(d)}`);
    }
  }
  const dAt=val("rot-atend-data"), qAt=val("rot-atend-quem")||eu.id;
  if(on("rot-atend") && dAt){
    await passo(`📅 Agendar o atendimento de preparação com ${nome1} para ${fmt(dAt)}, antes d${a} ${tipo} de ${quandoEv}.`, dAt, qAt);
    feito.push(`atendimento ${fmt(dAt)}`);
  }
  if(on("rot-docs")){
    await passo(`📄 Pedir a ${nome1} documentos médicos novos até o dia d${a} ${tipo} (${fmt(s.ev.data)}) — cobrar no atendimento de preparação.`, dAt||"", qAt);
    // F93 · o pedido entra no checklist com a data d(a) perícia: tem estado
    // (pendente, vencido, recebido) e cobrança num clique
    const titulo=`📄 Documentos médicos novos (${tipo} de ${fmt(s.ev.data)})`;
    if(!D.tarefas.some(t=>t.caso_id===s.casoId && dsa(t.titulo)===dsa(titulo))){
      const [t]=await api(`/rest/v1/tarefas`,{method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({caso_id:s.casoId, titulo, prazo:s.ev.data})}).catch(()=>[]);
      if(t) D.tarefas.push(t);
    }
    feito.push("documentos novos");
  }
  if(on("rot-vesp") && val("rot-vesp-data")){
    await passo(`🗓 Véspera d${a} ${tipo} de ${fmt(s.ev.data)}: mandar a mensagem de lembrete ao cliente (aba 🩺).`,
      val("rot-vesp-data"), val("rot-vesp-quem")||eu.id);
    feito.push(`véspera ${fmt(val("rot-vesp-data"))}`);
  }
  const dEs=val("rot-estudo-data");
  if(on("rot-estudo") && dEs){
    await passo(`📖 Estudar o processo para ${a==="a"?"a":"o"} ${tipo} de ${fmt(s.ev.data)}, antes do atendimento${dAt?` de ${fmt(dAt)}`:""}.`,
      dEs, val("rot-estudo-quem")||colAdmin().id);
    feito.push(`estudo ${fmt(dEs)}`);
  }
  // a conclusão do caso vai para o dia do estudo: é quando o caso volta a
  // pedir alguém. Não é prazo fatal — é a data de conclusão, a do To Do.
  if(on("rot-concl") && dEs){
    try{ await patchCaso(s.casoId, {prazo:dEs}); const kk=D.casoPorId.get(s.casoId); if(kk) kk.prazo=dEs;
      feito.push(`conclusão ${fmt(dEs)}`); }catch(e){}
  }
  return feito;
}
async function salvarSeguimento(){
  const s = segAberto; if(!s) return;
  let nota = (document.getElementById("seg-txt")||{}).value?.trim()||"";
  const dia = (document.getElementById("seg-data")||{}).value||"";
  const prazo = (document.getElementById("seg-prazo")||{}).value||"";
  const agendar = s.ev && (document.getElementById("seg-evt")||{}).checked;
  const pessoas = [...s.quem];
  // F40 · prazo processual direto da novidade: a anotação nasce prefixada
  // como no compositor (F38) e o caso vai para 🗓 Tarefas com Prazo
  // F92 · vindo do catálogo, o carimbo já diz de que é o prazo
  const carimbo = carimboCatalogo("seg", prazo);
  if(prazo && !nota && !carimbo) nota = "Prazo processual anotado a partir da novidade do portal.";
  if(prazo) nota = `⏰ [PRAZO ${fmt(prazo)}] ${carimbo}${nota}`.trim();
  if(!nota && !agendar && !s.prep) return aviso("Escreva a anotação — ou marque o agendamento");
  if(pessoas.length && !dia) return aviso("Tarefa para alguém precisa de data — escolha quando lembrar");
  if(pessoas.length && !nota) return aviso("Tarefa para alguém precisa da anotação do que fazer");
  // sem pessoa mas com data: o lembrete é de quem registrou (regra da casa)
  const alvos = pessoas.length ? pessoas : (dia && nota ? [eu.id] : []);
  // F160 · o revisor entra na mesma data, com o papel marcado
  const revisor = (document.getElementById("seg-rev")||{}).value||"";
  if(revisor && !alvos.length) return aviso("Revisor sem executor não existe — escolha quem faz e quando");
  const feito=[];
  try{
    let novo=null;
    if(nota){
      [novo]=await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({caso_id:s.casoId, autor_id:eu.id, texto:nota, origem:"app",
          publico:false, ...(s.andId?{responde_a:s.andId}:{})})})||[];
      feito.push("anotado");
    }
    if(prazo){ await marcarTarefaComPrazo(s.casoId, prazo); feito.push(`⏰ prazo ${fmt(prazo)}`); }
    if(alvos.length && novo) await criarTarefasDe(novo.id, s.casoId, alvos, revisor, dia);
    if(alvos.length) feito.push(`tarefa ${fmt(dia)} (${alvos.map(id=>(D.colPorId.get(id)||{}).inicial||"?").join(",")}${
      revisor && !alvos.includes(revisor) ? ` · ${(D.colPorId.get(revisor)||{}).inicial||"?"} revisa` : ""})`);
    if(agendar && !evJaAgendado(s.casoId, s.ev.data)){
      // F71 · a obs guarda o trecho de origem: auditável, e o banner 🕵️ do
      // Calendário pega se um dia a frase for suspeita
      const [evn]=await api(`/rest/v1/eventos`,{method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({caso_id:s.casoId, tipo:s.ev.tipo, status:"agendada",
          data_hora:`${s.ev.data}T${s.ev.hora}:00-03:00`, local:localNoTexto(s.texto),
          obs:String(s.texto||"").slice(0,160)})})||[];
      if(evn) D.eventos.push(evn);
      feito.push(`🩺 ${fmt(s.ev.data)}`);
      // F51 · a véspera de "mensagem ao cliente" NÃO vale para julgamento —
      // no CRPS não há presença nem preparação; o que importa é o resultado,
      // e a tarefa de conferir já nasce do texto pré-preenchido + dia seguinte
      if(s.ev.tipo!=="Julgamento") feito.push(...await gravarRoteiroPericia(s));
    } else if(s.prep && s.ev && s.ev.tipo!=="Julgamento") feito.push(...await gravarRoteiroPericia(s));
    if(s.andId && novo) (segNovidades.get(s.andId)||segNovidades.set(s.andId,[]).get(s.andId)).push(novo);
    if(s.deNovidade && s.andId) await marcarLidas([s.andId]);
    fecharCaixa(); segAberto=null;
    plim(); aviso(`✔ Seguimento: ${feito.join(" · ")}`, false);
    montarSidebar();
    if(clienteAberto) abrirFicha(clienteAberto); else render();
  }catch(e){ aviso("Não consegui registrar o seguimento: "+String(e.message||e).slice(0,120)); }
}
// a aplicação em UM clique (e em lote, nas Novidades): agenda a perícia
// detectada e cria o aviso 3 dias úteis antes, para mim, sem abrir modal
async function aplicarPericia(s){
  const ev = sessaoVigente(eventoNoTexto(s.texto), s.casoId); if(!ev) return null;   // F236 · a sessão que vale
  const k = D.casoPorId.get(s.casoId)||{}, c = D.cliPorId.get(k.cliente_id)||{};
  if(evJaAgendado(s.casoId, ev.data)) return "já agendada";
  const nome1 = (c.nome||"").split(" ")[0]||"cliente";
  const [evn]=await api(`/rest/v1/eventos`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify({caso_id:s.casoId, tipo:ev.tipo, status:"agendada",
      data_hora:`${ev.data}T${ev.hora}:00-03:00`, local:s.local||localNoTexto(s.texto)})})||[];
  if(evn) D.eventos.push(evn);
  // DOIS lembretes por perícia (pedido do Paulo): avisar o cliente LOGO que
  // agendou (tarefa para hoje — o registro do aviso é o 📞 na aba 🩺) e a
  // VÉSPERA, 3 dias úteis antes, para a mensagem de lembrete
  const criar = async (texto, dia) => {
    const [novo]=await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:s.casoId, autor_id:eu.id, origem:"app", publico:false,
        texto, ...(s.andId?{responde_a:s.andId}:{})})})||[];
    if(novo){
      const [tf]=await api(`/rest/v1/andamento_tarefas`,{method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({andamento_id:novo.id, caso_id:s.casoId, colaborador_id:eu.id,
                             atribuido_por:eu.id, lembrar_em:dia})});
      tarefaNaMemoria(tf);
    }
  };
  // F51 · JULGAMENTO (CRPS) é outro rito: não há preparação nem presença do
  // cliente — o registro certo é o agendamento em si, e UMA tarefa de conferir
  // o RESULTADO no dia útil seguinte, atribuída por padrão ao admin (o Paulo)
  if(ev.tipo==="Julgamento"){
    const conferir = proxDiaUtil(somaDias(ev.data, 1));
    const [novo]=await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:s.casoId, autor_id:eu.id, origem:"app", publico:false,
        texto:`⚖️ Julgamento agendado para ${fmt(ev.data)} às ${ev.hora}. Verificar o resultado no dia seguinte.`,
        ...(s.andId?{responde_a:s.andId}:{})})})||[];
    if(novo){
      const [tf]=await api(`/rest/v1/andamento_tarefas`,{method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({andamento_id:novo.id, caso_id:s.casoId, colaborador_id:colAdmin().id,
                             atribuido_por:eu.id, lembrar_em:conferir})});
      tarefaNaMemoria(tf);
    }
    return `agendado + resultado ${fmt(conferir)} (${colAdmin().inicial})`;
  }
  const fEv = evFem(ev.tipo);
  await criar(`📞 Avisar ${nome1} que ${fEv?"a":"o"} ${ev.tipo.toLowerCase()} foi agendad${fEv?"a":"o"} para ${fmt(ev.data)} às ${ev.hora} — oferecer atendimento de preparação antes. (Registre pelo 📞 na aba 🩺.)`, hoje());
  const vesp = diasUteisAntes(ev.data, 3);
  await criar(`🗓 Véspera d${fEv?"a":"o"} ${ev.tipo.toLowerCase()} de ${fmt(ev.data)}: mandar a mensagem de lembrete ao cliente (aba 🩺).`, vesp);
  return `agendada + avisar hoje + véspera ${fmt(vesp)}`;
}
async function periciaRapida(i){
  const s = segItens[i]; if(s) await agendarPericiaDe(s);
}
// F236 · o mesmo agendar com aviso serve à linha do Meu Dia, pelo andamento da novidade
async function agendarPericiaDe(s){
  const r = await aplicarPericia(s).catch(e=>{ aviso("Não consegui agendar: "+e.message); return null; });
  if(r==="já agendada") aviso("🩺 Essa perícia já está na aba Perícias", false);
  else if(r){ plim(); aviso(`🩺 ${r} — no Meu Dia na data do aviso`, false); }
  montarSidebar(); render();
  // F236 · agendada do cartão do caso, a ficha repinta e o roteiro (quesitos, preparação, estudo) abre em seguida
  if(!clienteAberto || (D.casoPorId.get(s.casoId)||{}).cliente_id!==clienteAberto) return;
  await abrirFicha(clienteAberto);
  const ev = r && r!=="já agendada" && eventoNoTexto(s.texto);
  const e = ev && ev.tipo!=="Julgamento" && (D.eventos||[]).find(x=>x.caso_id===s.casoId && x.status==="agendada" && dataSP(x.data_hora)===ev.data);
  if(e) prepararPericia(e.id);
}
async function periciasEmLote(){
  // F236 · só o que ainda pede agenda, e no e-Recursos só a sessão que vale (a pauta superada agendava a data antiga)
  const alvos = novidades().filter(a=>novPede(a)==="evento").map(a=>({casoId:a.caso_id, texto:a.texto, andId:a.id}));
  if(!alvos.length) return;
  let feitas=0, ja=0;
  for(const s of alvos){
    const r = await aplicarPericia(s).catch(()=>null);
    if(r==="já agendada") ja++; else if(r) feitas++;
  }
  plim();
  aviso(`🩺 ${feitas} perícia(s) agendadas com aviso 3 dias úteis antes${ja?`; ${ja} já estavam na agenda`:""}`, false);
  montarSidebar(); render();
}

// ⭐/⚡ as anotações marcadas, de todos os clientes, no topo da lista ⭐
// Importante. É a contrapartida da marca por linha: marcar sem ter onde ver o
// que foi marcado seria enfeite. Urgente primeiro, depois da mais nova para a
// mais velha — e o clique abre a ficha de quem é.
// as marcas moram em três lugares — linha de `andamentos` (Escritório, INSS,
// PJe), dentro do evento em casos.crps (Recurso) e no mapa casos.sinais_cnj
// (CNJ). Aqui elas viram uma lista só, que é o ponto de marcar.
function tudoSinalizado(){
  const fora = [];
  for(const a of (D.sinalizados||[])){
    if(!D.casoPorId.get(a.caso_id)) continue;
    fora.push({caso_id:a.caso_id, q:a.criado_em, texto:a.texto, fonte:"",
      importante:!!a.importante, urgente:!!a.urgente, botoes:sinaisHtml(a)});
  }
  for(const k of (D.casos||[])){
    for(const b of crpsBlocos(k)){
      const evs = b.eventos||[];
      evs.forEach((e,i)=>{
        if(!e.importante && !e.urgente) return;
        const alv = `'${k.id}','${esc(b.nup||"")}',${i}`;
        fora.push({caso_id:k.id, q:isoCrps(e.data), fonte:"🖥 Recurso",
          texto:String(e.resumo||e.bruto||""),
          importante:!!e.importante, urgente:!!e.urgente,
          botoes:`<span class="tl-sinais">
            <button class="tl-sinal imp ${e.importante?"on":""}" onclick="event.stopPropagation();toggleSinalCrps(${alv},'importante')" title="importante">${IC_ESTRELA}</button>
            <button class="tl-sinal urg ${e.urgente?"on":""}" onclick="event.stopPropagation();toggleSinalCrps(${alv},'urgente')" title="urgente">${IC_RAIO}</button>
          </span>`});
      });
    }
    for(const [ch,s] of Object.entries(sinaisCnjDoCaso(k))){
      if(!s || (!s.importante && !s.urgente)) continue;
      const arg = `'${k.id}','${esc(ch)}'`, ex = `,'${escJs(String(s.txt||"").slice(0,160))}','${esc(s.q||"")}'`;
      fora.push({caso_id:k.id, q:s.q, fonte:"⚖️ CNJ", texto:String(s.txt||""),
        importante:!!s.importante, urgente:!!s.urgente,
        botoes:`<span class="tl-sinais">
          <button class="tl-sinal imp ${s.importante?"on":""}" onclick="event.stopPropagation();alternarSinalCnj(${arg},'importante'${ex})" title="importante">${IC_ESTRELA}</button>
          <button class="tl-sinal urg ${s.urgente?"on":""}" onclick="event.stopPropagation();alternarSinalCnj(${arg},'urgente'${ex})" title="urgente">${IC_RAIO}</button>
        </span>`});
    }
  }
  return fora;
}
function blocoSinalizados(){
  const ss = tudoSinalizado();
  if(!ss.length) return "";
  const ord = ss.sort((a,b)=>(b.urgente?1:0)-(a.urgente?1:0)
    || ((a.q||"")<(b.q||"")?1:-1));
  const nUrg = ord.filter(a=>a.urgente).length;
  return `<h3 class="secao">⭐ Marcados (${ord.length}${nUrg?` · ${nUrg} urgente`:""})</h3>`
    + ord.map(a=>{
        const k = D.casoPorId.get(a.caso_id)||{};
        const c = D.cliPorId.get(k.cliente_id)||{};
        const tp = tipoDoComentario(a.texto);
        const txt = String((tp?tp.resto:a.texto)||"").replace(/\s+/g," ").trim();
        return `<div class="nov${a.urgente?" tl-urg":""}" style="cursor:pointer"
            onclick="abrirFicha('${c.id||""}')">
          <span class="nov-fonte">${a.urgente?"⚡":"⭐"}</span>
          <div class="nov-corpo">
            <div class="nov-cli"><span class="nov-nome">${esc(c.nome||"cliente sem ficha")}</span>
              ${a.fonte?`<span class="chip neutro">${esc(a.fonte)}</span>`:""}
              ${k.beneficio?`<span class="u-papel" style="text-transform:none">· ${esc(k.beneficio)}</span>`:""}
              <span class="meio-sub">· ${esc(a.q?fmtTS(a.q):"—")}</span></div>
            <div class="nov-txt">${tp?`<span class="chip ${tp.cor} tipo-tl">${esc(tp.rot)}</span>`:""}${
              esc(txt.slice(0,180))}${txt.length>180?"…":""}</div>
          </div>
          ${a.botoes}
        </div>`;
      }).join("");
}

// as primeiras novidades, para caber no topo de outra lista sem tomar conta
function blocoNovidadesTopo(){
  const ns = novidades().slice().sort((a,b)=>(novPede(b)?1:0)-(novPede(a)?1:0));   // F236 · prazo e perícia antes do informativo
  if(!ns.length) return "";
  const mostra = ns.slice(0,5);
  // F236 · o atalho só aparece para quem tem a tela das Novidades (a barra do colaborador é a do To Do)
  const abre = !visaoColab() || listasDoColab().includes("novidades");
  return `<h3 class="secao">📣 Novidades dos portais (${ns.length})</h3>`
    + mostra.map(a=>linhaNovidade(a)).join("")
    + (ns.length>mostra.length && abre
        ? `<p class="meio-sub"><a href="#" id="ver-novidades">ver as ${ns.length} novidades ↗</a></p>`
        : "");
}

// uma linha da caixa de entrada, usada na lista 📣 e no topo do ⭐
function linhaNovidade(a){
  const k = D.casoPorId.get(a.caso_id) || {};
  const c = D.cliPorId.get(k.cliente_id) || {};
  return `<div class="nov" data-and="${a.id}">
    <span class="nov-fonte">${esc(rotuloOrigem(a))}</span>
    ${k.acompanhamento==="manual"?`<span class="nov-manual" title="este caso está marcado como acompanhamento MANUAL: a equipe precisa abrir o portal e checar, o robô não cobre">⚠ CASO MANUAL</span>`:""}
    <div class="nov-corpo">
      <div class="nov-cli" data-cli="${c.id||""}"><span class="nov-nome">${esc(c.nome||"cliente sem ficha")}</span>
        ${c.nome?`<button class="olho" title="copiar o nome"
          onclick="event.stopPropagation();copiar('${escJs(c.nome)}','Nome copiado')">📋</button>`:""}
        ${k.beneficio?`<span class="u-papel" style="text-transform:none">· ${esc(k.beneficio)}</span>`:""}</div>
      <div class="nov-txt">${esc(a.origem==="pat"?limparHtmlPat(a.texto):a.texto)}</div>
    </div>
    ${/* o link segue o GRAU do próprio andamento: um caso tem os dois, e abrir
         o 1º grau numa novidade do 2º era o defeito que se via na tela */""}
    ${((g,l)=>a.origem==="pje" && l
      ?`<a class="btn-mini" href="${urlOk(l)}" target="_blank" rel="noopener" title="abrir os autos digitais${g?` do ${esc(g)}`:""} na sua sessão do ${nomeSistemaDoLink(l)}">abrir no ${nomeSistemaDoLink(l)}${g?` · ${esc(g)}`:""} ↗</a>`
      :a.origem==="crps"
      ?`<button class="btn-mini" onclick="abrirERecursos('${a.caso_id}','${a.id}')"
          title="abre o recurso no e-Recursos e copia o NUP">${iconeFonte("crps")} ${(n=>n?esc(formatarNup(n)):"")(nupNoTexto(a.texto)||crpsNups(k)[0]||"")} ↗</button>`
      :k.processo_link?`<a class="btn-mini" href="${urlOk(k.processo_link)}" target="_blank" rel="noopener">abrir ↗</a>`:"")(grauDoAndamentoPje(a), a.origem==="pje"?linkPjeDoAndamento(a,k):null)}
    ${(i=>`${eventoDaNovidade(a)?`<button class="btn-mini" onclick="periciaRapida(${i})"
      title="agenda na aba 🩺 e cria o aviso 3 dias úteis antes — um clique"><span aria-hidden="true">🩺 Agendar</span><span class="sr-only">🩺 agendar+aviso</span></button>`:""}${segBtnHtml(i, "📌 dar seguimento")}`)(
      segRegistrar(a.caso_id, a.texto, a.id, true))}
    ${seguimentoHtml(segNovidades.get(a.id), f=>((D.tarefasPorCaso&&D.tarefasPorCaso.get(f.caso_id))||[]).filter(t=>t.andamento_id===f.id))}
    <button class="btn-mini" data-ler="${a.id}">✔ li</button>
  </div>`;
}

// F159 · o que já se fez a partir de cada novidade (os filhos por responde_a):
// uma consulta pequena só das não lidas, ao abrir a lista — e a linha diz
// "⏰ 17/10 Recurso inominado · 🗓 P 15/10" em vez de parecer intocada
const segNovidades = new Map();
async function carregarSegNovidades(ns){
  const ids = ns.map(a=>a.id).filter(id=>!segNovidades.has(id));
  if(!ids.length) return;
  ids.forEach(id=>segNovidades.set(id, []));
  const filhos = await todas("andamentos", `select=id,caso_id,responde_a,texto,excluir&responde_a=in.(${ids.join(",")})`).catch(()=>[]);
  for(const f of filhos) (segNovidades.get(f.responde_a)||[]).push(f);
}
// Decisão do Paulo (06.11.2026): tudo o que os portais trouxeram aparece nas Novidades, também o que ainda não
// tem caso; ele confere ali e não abre o 📥 Importar. Conferir leva à coleta, onde ficam os botões de sempre.
function patSemCaso(){ try{ return JSON.parse(cfgApp("pat_sem_caso")||"{}"); }catch(e){ return {}; } }
function novSemCaso(){
  const pat = patSemCaso(), fora = new Set(patIgnorados().map(String));
  const prots = new Set((D.casos||[]).flatMap(k=>(k.protocolos||[]).map(soDig)));
  const ps = (pat.itens||[]).filter(x=>!prots.has(soDig(x.protocolo)) && !fora.has(String(x.protocolo)));
  const comCaso = new Set();
  for(const k of D.casos||[]){
    if(soDig(k.processo)) comCaso.add(soDig(k.processo));
    for(const px of (Array.isArray(k.processos)?k.processos:[])) if(soDig(px && (px.numero||px))) comCaso.add(soDig(px.numero||px));
  }
  const pjFora = new Set(pjeIgnorados());
  const js = Object.entries(pjeSemCaso()).filter(([d])=>!comCaso.has(d) && !pjFora.has(d)).map(([,x])=>x);
  if(!ps.length && !js.length) return "";
  return `<h3 class="secao">📥 Sem caso no CRM (${ps.length+js.length})</h3>
    ${ps.map(x=>`<div class="nov-linha"><strong>INSS · ${esc(x.nome||"sem nome")}</strong> · protocolo ${esc(x.protocolo)}
      ${x.beneficio?` · ${esc(x.beneficio)}`:""} <span class="meio-sub">${esc(x.motivo||"")}</span>
      ${x.tipo==="sem"
        ? `<button class="btn-mini" onclick="resolverPat('cadastrar','${esc(x.protocolo)}')" title="cadastrar a ficha com o que o PAT trouxe e criar o caso">Cadastrar</button>`
        : `<button class="btn-mini" onclick="resolverPat('juntar','${esc(x.protocolo)}')" title="é o mesmo caso: juntar o protocolo">Juntar</button>
           <button class="btn-mini" onclick="resolverPat('criar','${esc(x.protocolo)}')" title="é outro: criar o caso">Criar</button>`}
      <button class="btn-mini" onclick="ignorarProtocolo('${esc(x.protocolo)}')" title="parar de perguntar por este protocolo">Ignorar</button></div>`).join("")}
    ${js.map(x=>`<div class="nov-linha"><strong>${esc(x.sistema==="esaj"?"e-SAJ":x.sistema==="eproc"?"eproc":"PJe")} · ${esc(x.partes||"")}</strong>
      · processo ${esc(x.numero)} <span class="meio-sub">sem caso desde ${esc(fmt(dataSP(x.desde)))}</span>
      <button class="btn-mini" onclick="vincularDaNovidade('${esc(x.numero)}')" title="vincular a um caso do cliente ou criar o caso">Vincular</button>
      <button class="btn-mini" onclick="ignorarProcessoPje('${esc(x.numero)}')" title="parar de perguntar por este processo">Ignorar</button></div>`).join("")}`;
}
// resolve na própria Novidades: refaz o plano da coleta do INSS (contra o banco) e usa os botões de sempre
async function resolverPat(acao, protocolo){
  const id = patSemCaso().coleta_id; if(!id) return;
  await usarColeta(id);
  if(acao==="juntar") await juntarAoCaso(protocolo);
  else if(acao==="criar") await criarMesmoAssim(protocolo);
  else if(acao==="cadastrar"){ await cadastrarDoPat(protocolo);
    if(planoPat && (planoPat.novos||[]).some(x=>x.protocolo===protocolo)) await aplicarPatDeVerdade(); }
  render();
}
// F595 · o que a coleta de fato baixou nas últimas 24 h (PDF e peça), e não só o movimento:
// por cliente e caso, numa seção recolhida; lido uma vez a cada 5 minutos
let _docsNovos = null, _docsNovosEm = 0;
async function carregarDocsNovos(){
  const desde = new Date(Date.now()-864e5).toISOString();
  _docsNovos = await api(`/rest/v1/anexos?select=id,nome,caso_id,cliente_id,origem,criado_em&origem=in.(pje,esaj,eproc,pat,crps)&criado_em=gte.${desde}&order=criado_em.desc&limit=500`).catch(()=>null) || [];
  _docsNovosEm = Date.now();
}
function secaoDocsNovos(){
  const ds = _docsNovos || [];
  if(!ds.length) return "";
  const porCli = new Map();
  for(const d of ds){ const k = D.casoPorId.get(d.caso_id) || {}; const cid = d.cliente_id || k.cliente_id || "";
    if(!porCli.has(cid)) porCli.set(cid, new Map());
    const m = porCli.get(cid); if(!m.has(d.caso_id||"")) m.set(d.caso_id||"", []); m.get(d.caso_id||"").push(d); }
  const blocos = [...porCli].map(([cid, casos])=>{
    const c = D.cliPorId.get(cid) || {};
    return `<div class="nov"><div class="nov-corpo"><div class="nov-cli" data-cli="${esc(cid)}"><span class="nov-nome">${esc(c.nome||"cliente sem ficha")}</span></div>`
      + [...casos].map(([kid, docs])=>{ const k = D.casoPorId.get(kid) || {};
        return `<div class="nov-txt"><b>${esc(k.beneficio||"sem caso")}</b> · ${docs.length} documento${docs.length>1?"s":""}: ${
          esc(docs.slice(0,6).map(d=>`${({pje:"PJe",esaj:"e-SAJ",eproc:"eproc",pat:"PAT",crps:"e-Recursos"})[d.origem]||d.origem} ${String(d.nome||"").slice(0,60)}`).join("; "))}${docs.length>6?` e mais ${docs.length-6}`:""}</div>`; }).join("")
      + `</div></div>`; }).join("");
  return `<details class="docs-novos"><summary class="secao">📄 Documentos novos nas últimas 24 h (${ds.length}, ${porCli.size} cliente${porCli.size>1?"s":""})</summary>${blocos}</details>`;
}
function renderNovidades(){
  tituloLista("📣 Novidades");
  if(Date.now()-_docsNovosEm > 3e5){ _docsNovosEm = Date.now(); carregarDocsNovos().then(()=>{ if(visao==="novidades") render(); }); }
  const ns = novidades();
  const semCaso = novSemCaso();
  if(ns.some(a=>!segNovidades.has(a.id))){ carregarSegNovidades(ns).then(()=>{ if(visao==="novidades") render(); }); }
  document.getElementById("sub-lista").textContent = ns.length
    ? "O que os portais trouxeram e você ainda não leu. Marcar como lido tira daqui, não da ficha."
    : "Nada novo. Tudo o que os portais trouxeram já foi lido.";
  if(!ns.length){
    document.getElementById("conteudo-meio").innerHTML = (semCaso ||
      "<p class='meio-sub'>Caixa vazia. 👏 Rode a extensão para buscar o que mudou hoje.</p>") + secaoDocsNovos();
    document.querySelectorAll(".nov-cli[data-cli]").forEach(el=>el.onclick=()=>{
      if(el.dataset.cli) abrirFicha(el.dataset.cli); });
    return;
  }
  // por dia, porque é assim que a pergunta é feita: "o que aconteceu hoje?"
  // — e o dia é o de BRASÍLIA: cortar o ISO cru pegava a data UTC e o que
  // entrou às 22h30 aparecia sob o cabeçalho "amanhã"
  // F236 · o que pede ação vem primeiro, separado: as perícias, audiências e julgamentos ainda sem
  // agenda; o resto segue por dia (F304 · os prazos dos tribunais saíram)
  const topo = [["evento","🩺 Perícias, audiências e julgamentos a agendar"]].map(([g,t])=>{
    const as = ns.filter(a=>novPede(a)===g);
    return as.length ? `<h3 class="secao">${t} (${as.length})</h3>` + as.map(linhaNovidade).join("") : ""; }).join("");
  const porDia = new Map();
  for(const a of ns.filter(a=>!novPede(a))){
    const d = dataSP(a.criado_em);
    if(!porDia.has(d)) porDia.set(d,[]);
    porDia.get(d).push(a);
  }
  const nLinks = linksDasNovidades().length;
  const corpo = [...porDia].map(([d,as])=>`<h3 class="secao">${esc(dataRelativa(d))} (${as.length})</h3>`
      + as.map(linhaNovidade).join("")).join("");
  const nPer = ns.filter(a=>novPede(a)==="evento").length;
  // F236 · "marcar como lidas" leva só o informativo: o que pede agenda fica até alguém dar seguimento
  const info = ns.filter(a=>!novPede(a));
  document.getElementById("conteudo-meio").innerHTML =
    `<div class="filtros">${info.length?`<button class="fchip" id="ler-tudo" title="o que pede agenda continua na lista até alguém dar seguimento">✔ marcar as informativas como lidas (${info.length})</button>`:""}${
      nLinks?`<button class="fchip" id="abrir-tudo" title="abre o processo de cada novidade numa aba — PJe ou PAT, conforme a origem">↗ abrir todos os links (${nLinks})</button>`:""}${
      nPer?`<button class="fchip" id="agendar-tudo" title="para cada perícia/audiência detectada: agenda na aba 🩺 e cria o aviso 3 dias úteis antes (seg–sex)">🩺 agendar ${nPer} perícia(s) + avisos</button>`:""}</div>`
    + semCaso + topo + corpo + secaoDocsNovos();
  const bAbrir=document.getElementById("abrir-tudo");
  if(bAbrir) bAbrir.onclick=abrirTodasNovidades;
  const bAg=document.getElementById("agendar-tudo");
  if(bAg) bAg.onclick=periciasEmLote;
  document.querySelectorAll("[data-ler]").forEach(b=>b.onclick=e=>{
    e.stopPropagation(); marcarLidas([b.dataset.ler]); });
  { const b=document.getElementById("ler-tudo"); if(b) b.onclick=()=>marcarLidas(info.map(a=>a.id)); }
  document.querySelectorAll(".nov-cli[data-cli]").forEach(el=>el.onclick=()=>{
    if(el.dataset.cli) abrirFicha(el.dataset.cli); });
}

async function liNaFicha(id){
  if(!await marcarLidas([id])) return;
  const a=(D._andsFicha||[]).find(x=>x.id===id);
  if(a) a.andamentos_lidos=[...(a.andamentos_lidos||[]),{colaborador_id:eu.id}];
  repintarFicha();
}
// devolve true quando o lido ficou gravado
async function marcarLidas(ids){
  if(!ids.length) return false;
  // F304 · lida a novidade, as repetições dela escondidas da caixa vão junto
  { const rep = repetidasDasNovidades(), set = new Set(ids); let mudou = true;
    while(mudou){ mudou = false; for(const [x, y] of rep) if(set.has(y) && !set.has(x)){ set.add(x); mudou = true; } }
    ids = [...set]; }
  try{
    await api(`/rest/v1/andamentos_lidos`,{method:"POST",
      headers:{Prefer:"return=minimal,resolution=ignore-duplicates"},
      body:JSON.stringify(ids.map(id=>({andamento_id:id, colaborador_id:eu.id})))});
  }catch(e){ aviso("Não consegui marcar como lido: "+e.message); return false; }
  // GRAVOU, ESTÁ LIDO (07.10.2026). A repintura da barra, quando falhava, caía
  // no catch da gravação: o lido ficava no banco, a linha ficava na tela, o
  // aviso dizia "não consegui marcar" e o segundo clique regravava o mesmo.
  // A lista vem primeiro (é dela que a linha sai) e cada repintura falha
  // sozinha, com o motivo verdadeiro no aviso e a pilha no console.
  await baixarMencoes(ids);   // F236 · lido o andamento, a menção a mim dele também
  const marcados = new Set(ids);
  (D.novid||[]).forEach(a=>{ if(marcados.has(a.id))
    a.andamentos_lidos = [...(a.andamentos_lidos||[]), {colaborador_id:eu.id}]; });
  let falha = null;
  for(const repintar of [render, montarSidebar])
    try{ repintar(); }catch(e){ falha = falha || e; console.error("[lido] repintura:", e); }
  if(falha) aviso(`Marcado como lido, mas a tela não se atualizou por inteiro: ${falha.message}`);
  return true;
}

// ── 🧹 Cuidar do acervo ───────────────────────────────────────────────────
// O que saiu do Meu Dia. São FILAS e CONFERÊNCIAS PERIÓDICAS, não agenda:
// processos sem próxima ação, processos parados há muito tempo, a rotina do
// escritório, os recursos do CRPS que o robô não enxerga e o CadÚnico a
// renovar. Nada disso responde "o que vence hoje?", e enquanto morava no Meu
// Dia empurrava para baixo justamente o que vence (F123, 20.09.2026).
//
// Aqui ficam à mão para quando sobrar tempo, com o número na barra lateral
// dizendo o tamanho da fila sem cobrar nada.
function renderAcervo(){
  tituloLista("🧹 Cuidar do acervo");
  document.getElementById("sub-lista").textContent =
    "O trabalho sem data marcada: rotina, conferências e processos parados. Nada aqui vence hoje.";
  const corpo = blocoSuspensos() + blocoRotinas() + blocoCrpsManual() + blocoCadunico()
    + blocoPrecasoPares() + blocoMovimentosTodo() + blocoPrecasoLote() + blocoCardsPagamento() + blocoDocsSemData() + blocoCardsRever() + blocoRevisao() + blocoSemAcao() + blocoSemEndereco() + blocoVariosCasos() + blocoQuadrosLote() + blocoEtapasLote() + blocoSemCpf();
  document.getElementById("conteudo-meio").innerHTML = corpo
    || "<p class='meio-sub'>Acervo em dia — nenhum processo parado nem sem próxima ação. 👏</p>";
  document.querySelectorAll("[data-revks]").forEach(b=>b.onclick=e=>{
    e.stopPropagation(); marcarRevisado(b.dataset.revks.split(",")); });
  ligarCartoes(); ligarSecoes();
}
// quantos esperam ali — o mesmo critério dos dois blocos, sem montar a tela
function quantosNoAcervo(){
  const dias = +(cfgApp("revisao_dias")||90);
  const lim = (()=>{ const d=new Date(hoje()+"T12:00:00");
                     d.setDate(d.getDate()-dias); return d.toLocaleDateString("sv"); })();
  // 11.92 · ADM-04: o caso parado e sem ação conta uma vez só (antes as duas listas se somavam)
  return ativos().filter(k=>{ const u=ultimoRegistro(k); return !u || u<=lim
    || (!k.prazo && !k.exigencia_prazo && !(D.tarefasPorCaso.get(k.id)||[]).length); }).length;
}

// ── F144 · A AGENDA DO VISUAL NOVO (mock do Paulo, 27.09.2026) ────────────
// No tema v10, Planejado e Meu Dia deixam de agrupar por cliente e passam a
// mostrar UMA LINHA POR DATA, como no To Do: a data, o cliente, o que é para
// fazer, o selo de prazo fatal, a espécie com a lista, quem está com ela e a
// estrela e o fogo. Cada linha nasce de uma de cinco origens: a tarefa de um
// comentário do caso, o prazo fatal do caso, o pedido de prorrogação, a
// perícia ou audiência agendada, a tarefa avulsa e o lembrete do cliente.
const txtAnd = new Map(), txtPedido = new Set();
function textoDoAndamento(id){
  if(!txtAnd.size) [...(D.and30||[]), ...(D.novid||[]), ...(D.sinalizados||[])]
    .forEach(a=>a && a.id && txtAnd.set(a.id, a.texto||""));
  return txtAnd.get(id);
}
// o texto do comentário não vem na carga inicial; busca de uma vez os que
// faltam na tela e repinta uma só vez
async function buscarTextosAgenda(ids){
  const falta = [...new Set(ids)].filter(id=>id && !txtAnd.has(id) && !txtPedido.has(id));
  if(!falta.length) return;
  falta.forEach(id=>txtPedido.add(id));
  for(let i=0;i<falta.length;i+=100){
    const r = await api(`/rest/v1/andamentos?select=id,texto&id=in.(${falta.slice(i,i+100).join(",")})`).catch(()=>[]);
    (r||[]).forEach(a=>txtAnd.set(a.id, a.texto||""));
  }
  if((["planejado","meudia","calendario","minhas","importante"].includes(visao) || String(visao).startsWith("fase:")) && !clienteAberto) render();   // F236 · listas e calendário também
}
// F427 · o prazo fatal do caso sem tarefa diz do que é na agenda pela anotação com o carimbo da data (F429: o To Do
// não descreve prazo). O texto não vem na carga inicial: busca-se uma vez por caso e data, e repinta
const motivoPz = new Map(), motivoPedido = new Set(), chaveMotivo = k => `${k.id}|${k.prazo}`;
async function buscarMotivosPz(ks){
  const falta = [...new Set(ks)].filter(k=>k && k.prazo && !k.lembrar_motivo && !motivoPedido.has(chaveMotivo(k)));
  if(!falta.length) return;
  falta.forEach(k=>motivoPedido.add(chaveMotivo(k)));
  let achou = false;
  for(let i=0;i<falta.length;i+=50){
    const lote = falta.slice(i,i+50);
    const r = await api(`/rest/v1/andamentos?select=id,caso_id,texto,origem,autor_id,criado_em,responde_a,excluir&caso_id=in.(${lote.map(k=>k.id).join(",")})&texto=like.*%5BPRAZO*&order=criado_em.desc`).catch(()=>[]);
    for(const k of lote){
      const dos = (r||[]).filter(a=>a.caso_id===k.id && !a.excluir), c = dos.find(a=>(a.texto||"").includes(`[PRAZO ${fmt(k.prazo)}]`));
      const f = c ? (pzDoAssistente(c.texto)||{}).desc || fraseDoTodo(c.texto) : "";   // F429 · do assistente, a linha do prazo
      if(f){ motivoPz.set(chaveMotivo(k), f); achou = true; }
    }
  }
  if(achou && (["planejado","meudia","minhas","importante"].includes(visao) || String(visao).startsWith("fase:")) && !clienteAberto) render();
}
const motivoDoPrazo = k => k.lembrar_motivo || motivoPz.get(chaveMotivo(k)) || "";
// "⏰ [PRAZO 12.10.2026] Protocolar recurso. Verificar..." -> "protocolar recurso"
// F236 · com `quem`, a frase que chama a pessoa ("@Paulo, confira…") abre o resumo e a primeira do
// comentário vem depois: a linha da agenda diz o que ELA tem de fazer, sem perder do que se trata
function resumoAgenda(txt, quem){
  // F429 · a anotação do assistente com o prazo lançado diz do que é pela linha do prazo, e não pela avaliação
  const pz = /\[PRAZO \d/.test(txt||"") && pzDoAssistente(txt);
  if(pz && pz.desc!=="Prazo") return pz.desc.length>90 ? pz.desc.slice(0,88).replace(/\s\S*$/,"")+"…" : pz.desc;
  const s = String(txt||"").replace(/<[^>]*>/g," ").replace(/\[[^\]]*\]/g," ")
    .replace(/^[^\p{L}\p{N}]+/u,"").replace(/\s+/g," ").trim();
  const frases = s.split(/(?<=[.;!?])\s/), sem = f => f.replace(/[.;]$/,"");
  const min = x => /^\p{Lu}\p{Ll}/u.test(x) ? x[0].toLowerCase()+x.slice(1) : x;
  const nome = quem && dsa((quem.nome||"").split(" ")[0]);
  const chama = nome && frases.find(f=>new RegExp(`@${nome}\\b`).test(dsa(f)));
  const pedido = chama ? sem(chama.replace(/@\p{L}+[,:]?\s*/gu,"").trim()) : "";
  // F236 · a anotação que registra o agendamento e manda conferir depois ("Julgamento agendado para 04.11.2026 às 08:00.
  // Verificar o resultado no dia seguinte.", a do Agendar julgamento) cobra a ordem, seguida do registro: no dia 05 o
  // Planejado dizia só "julgamento agendado para 04.11"
  const ordem = pedido.length<=2 && /\b(agendad|marcad|designad|remarcad|pautad)[oa]s?\b/i.test(frases[0]||"")
    && /^(verificar|conferir|acompanhar|checar)\b/i.test(frases[1]||"") ? sem(frases[1]) : "";
  let r = pedido.length>2 ? pedido + (chama!==frases[0] ? ` — ${min(sem(frases[0]))}` : "") : ordem ? `${ordem} — ${min(sem(frases[0]))}` : sem(frases[0]);
  if(r.length>90) r = r.slice(0,88).replace(/\s\S*$/,"")+"…";
  return min(r);
}
// F236 · A AGENDA COM TODAS AS ORIGENS, CADA ITEM COM O SEU DONO. Além da tarefa, do prazo fatal, da
// prorrogação e da perícia futura, entram o prazo do tribunal (dataDoPrazo), o recorrer até
// (recorrerAte), a exigência, o prazo de análise vencido (prazoMora), a perícia que passou sem
// confirmação, o honorário vencido, o card de aposentadoria com o seu dono, a rotina do dia e, para a
// recepção, os avisos de perícia da semana e os atendimentos presenciais. As regras das datas são as
// das funções do caso; aqui só se decide a quem cada item cobra. `donos` nulo = de todos.
// A conta é feita uma vez por passada (a barra pede três números e a tela, a lista): cada pessoa é um filtro.
let _agBase = null;
function itensAgenda(col){
  if(!_agBase){ _agBase = itensAgendaTodos(); queueMicrotask(()=>{ _agBase = null; }); }   // shortcut: vale a passada síncrona da barra e da tela; qualquer espera refaz a conta
  return col ? _agBase.filter(i=>!i.donos || i.donos.includes(col)) : _agBase.slice();
}
function itensAgendaTodos(){
  const out=[], hj=hoje(), d30=somaDias(hj,-30), d7=somaDias(hj,7);
  const cols=ids=>(ids||[]).map(id=>D.colPorId.get(id)).filter(Boolean);
  const por=(it, donos)=>out.push({...it, donos, quem: it.quem || cols(donos)});
  const evPorCaso = new Map();
  for(const e of (D.eventos||[])) if(e.status==="agendada"){ if(!evPorCaso.has(e.caso_id)) evPorCaso.set(e.caso_id,[]); evPorCaso.get(e.caso_id).push(e); }
  for(const k of ativos()){
    const cli=D.cliPorId.get(k.cliente_id); if(!cli || foraDoFluxo(k)) continue;
    for(const t of (D.tarefasPorCaso.get(k.id)||[])){
      if(!t.lembrar_em) continue;
      por({data:t.lembrar_em, k, cli, tc:t, andId:t.andamento_id, fatal:t.natureza==="fatal"}, [t.colaborador_id]);
    }
    const donos = donosDoCaso(k);
    // F606 · o retorno do pré-caso, gravado só no CRM (casos.precaso.retorno), entra no Meu Dia de quem cuida do pré-caso
    const rpc = ehPreCaso(k) && ((k.precaso||{}).retorno||{}).data;
    if(rpc) por({data:rpc, k, cli, selo:"Retorno do pré-caso", resumo:(k.precaso.retorno.motivo)||"retorno do pré-caso"}, donos);
    // F236 · o "Concluir em" do To Do no dia de um prazo que o CRM já conhece (recorrer até, exigência, prazo do tribunal
    // ainda não respondido) é ESSE prazo: um item só, o do prazo conhecido, com o selo de prazo fatal, como no quadro
    // do caso ("também no To Do"); antes o recurso especial da Luzia aparecia duas vezes no dia 27
    const rec = recorrerAte(k);
    const igual = !k.prazo ? "" : rec===k.prazo ? "rec" : k.exigencia_prazo===k.prazo ? "exig"
      : (k.prazos_tribunal||[]).some(p=>p.fim===k.prazo && dataDoPrazo(p) && !respostaAoPrazo(k, p)) ? "trib" : "";
    const volta = k.prazo && ((k.ronda||{}).despacho||{}).prazo===k.prazo;   // F291 · a volta à fila não é prazo fatal
    // o prazo fatal anotado com tarefa já entra pela tarefa (acima): o casos.prazo do mesmo dia não repete o item a quem a tem
    const comTf = k.prazo && !volta ? (D.tarefasPorCaso.get(k.id)||[]).filter(t=>t.natureza==="fatal" && !t.concluida_em && t.lembrar_em===k.prazo).map(t=>t.colaborador_id) : [];
    const donosPz = comTf.length ? (donos||[]).filter(d=>!comTf.includes(d)) : donos;
    if(k.prazo && !igual && (!comTf.length || donosPz.length)) por(volta ? {data:k.prazo, k, cli, selo:"Volta à fila", resumo:k.lembrar_motivo||tituloCaso(k)}
      : prazoEhRetorno(k) ? {data:k.prazo, k, cli, selo:"Prazo do Microsoft To Do", resumo:k.lembrar_motivo||tituloCaso(k)}
      : {data:k.prazo, k, cli, fatal:true, resumo:motivoDoPrazo(k)||tituloCaso(k), motivo:motivoDoPrazo(k)}, donosPz);
    // a data de início do Planner: o prazo fatal entra na agenda também no dia de começar
    if(k.prazo && k.prazo_inicio && k.prazo_inicio<k.prazo) por({data:k.prazo_inicio<hj ? hj : k.prazo_inicio, k, cli, selo:"Começar",
      resumo:`começar: prazo fatal em ${fmt(k.prazo)} (${k.lembrar_motivo||tituloCaso(k)})`}, donos);
    // F236 · pedir a prorrogação só enquanto dá: com a DCB já passada (a cessação que a ação discute) não é tarefa. O item
    // diz até quando: a véspera da DCB (IN 128/2022, art. 339, § 3º). Com a janela aberta o item é de hoje (antes caía em
    // "Vencidas" no dia em que a janela abria); passada a véspera, vence na véspera
    const pr = k.dcb && k.dcb>=hj && prorrogarEm(k), vesp = k.dcb ? somaDias(k.dcb, -1) : "";
    if(pr) por({data: pr>hj ? pr : hj<=vesp ? hj : vesp, k, cli, resumo: pr<=hj ? `pedir a prorrogação até ${fmt(vesp)}, véspera da DCB (o benefício cessa em ${fmt(k.dcb)})`
      : `pedir a prorrogação de ${fmt(pr)} a ${fmt(vesp)} (o benefício cessa em ${fmt(k.dcb)})`}, donos);
    for(const e of (evPorCaso.get(k.id)||[])){
      const d = dataSP(e.data_hora);
      if(d>=hj) por({data:d, k, cli, ev:e, selo:(e.tipo||"Agendamento").split(" ")[0],
        resumo:`${(e.tipo||"agendamento").toLowerCase()} às ${horaSP(e.data_hora).replace(":","h")}${e.local?` em ${e.local}`:""}`}, donos);
      // a perícia (a avaliação, a audiência) que passou sem ninguém dizer como foi cobra no dia útil seguinte. F236 · salvo
      // quando o processo ou o PAT já trouxe o laudo ou a "perícia realizada" (a ficha ainda pede o clique, com a prova)
      else if(d>=d30 && !provaForaDaFicha(e, k)) por({data:proxDiaUtil(somaDias(d,1)), k, cli, evPassado:e, selo:"Confirmar",
        resumo:`${/per[ií]cia|avalia/i.test(e.tipo||"") ? "confirmar se compareceu à" : "registrar como foi"} ${(e.tipo||"agendamento").toLowerCase()} de ${fmt(d).slice(0,5)}`}, donos);
    }
    for(const p of (k.prazos_tribunal||[])){
      // F236 · o prazo respondido (a peça protocolada anotada depois da ciência) não cobra mais; o do mesmo dia do "Concluir
      // em" do To Do é o item do prazo fatal (acima, um item só)
      const d = dataDoPrazo(p); if(!d || respostaAoPrazo(k, p) || (p.fim && p.fim===k.prazo && igual!=="trib")) continue;
      por({data:d, k, cli, selo:`Aviso ${ROT_PRAZO[p.sistema]||p.sistema||""}`.trim(),   // F531 · aviso, não prazo
        resumo: p.situacao==="findo" ? `venceu sem resposta: ${p.ato||"intimação"}` : `${p.ato||"intimação"}${p.dias?` (${p.dias} dias)`:""}${p.fim?"":", ciência tácita"}`}, donos);
    }
    if(rec) por({data:rec, k, cli, prazo:true, avisa:true, fatal: igual==="rec", selo:"Prazo do recurso",
      resumo:`recorrer da decisão de ${fmt(k.decisao_em)} (recurso ${k.fase==="conselho"?"especial":"ordinário"})`}, donos);
    // F236 · a descrição da exigência cortada na palavra, com reticências (cortava no meio: "Tecelagem Fictícia São Jos")
    if(k.exigencia_prazo) por({data:k.exigencia_prazo, k, cli, prazo:true, avisa:true, fatal: igual==="exig", selo:k.fase==="conselho"?"Diligência":"Exigência",
      resumo:`cumprir a ${k.fase==="conselho"?"diligência do CRPS":"exigência do INSS"}${k.exigencia_descricao?`: ${cortaFrase(String(k.exigencia_descricao).replace(/\s*·\s*prazo estimado:[\s\S]*$/i,"").replace(/\s+/g," ").trim(), 70)}`:""}`}, donos);
    // P1 · o mandado de segurança contra o indeferimento: avisa a 5, 2 e 1 dia útil
    const msd = msAte(k);
    if(msd) por({data:msd, k, cli, prazo:true, avisa:true, selo:"Mandado de segurança",
      resumo:`até ${fmt(msd)}: 120 dias da decisão de ${fmt(k.decisao_em)} (confirme a ciência)`}, donos);
    const mora = prazoMora(k);
    // F236 · com o mandado de segurança já decidido (a tarefa de redigi-lo, a ordem de impetrar), a mora não pede avaliação
    if(mora && mora.vencido && !msDecidido(k) && !moraVista(k, mora)) por({data:mora.data, k, cli, prazo:true, selo:"Mora do INSS",
      resumo:`o INSS passou dos ${mora.dias} dias para decidir: avaliar o mandado de segurança`}, donos);
  }
  [...D.tarefas.filter(t=>!t.concluida && t.prazo), ...docsPreCasoComData()].forEach(t=>{
    const k=t.caso_id?D.casoPorId.get(t.caso_id):null;
    if(k && foraDoFluxo(k)) return;
    const cli=D.cliPorId.get(t.cliente_id||(k&&k.cliente_id))||null;
    // F236 · a tarefa solta é de quem ela nomeia; sem nome, de quem responde pelo caso (ou pelo
    // cliente); só a tarefa sem caso nem cliente continua sendo de todos
    por({data:t.prazo, k, cli, t, resumo:t.titulo}, t.particular_de ? [t.particular_de] : k ? donosDoCaso(k) : cli ? donosDoCliente(cli.id) : null);
  });
  // F236 · o honorário vencido vai a quem cobra: o advogado do caso da parcela (ou do cliente). O de
  // caso encerrado fica no 💰 Recebimentos, para a lista do dia não virar o arquivo morto
  for(const pg of (D.pagamentos||[])){
    if(pg.status!=="aberto" || !pg.vencimento || pg.vencimento>hj) continue;
    const k = pg.caso_id ? D.casoPorId.get(pg.caso_id) : null;
    if(k && (k.fase==="encerrado" || foraDoFluxo(k))) continue;
    const cliId = pg.cliente_id || (k && k.cliente_id), cli = D.cliPorId.get(cliId);
    if(!cli || (!k && !(D.casosDoCliente.get(cliId)||[]).some(x=>x.fase!=="encerrado"))) continue;
    por({data:pg.vencimento, k, cli, pg, selo:"Honorários",
      resumo:`cobrar ${pg.valor?moedaBR(pg.valor):"o honorário"}${pg.descricao?` · ${pg.descricao}`:""}`}, advogadoDoCliente(cliId, k));
  }
  // P1 · a perda da qualidade de segurado de quem tem caso aberto: entra 30 dias antes, com o advogado do cliente
  const vistos = new Set();
  for(const k of ativos()){
    const cli = D.cliPorId.get(k.cliente_id); if(!cli || vistos.has(cli.id) || foraDoFluxo(k)) continue;
    vistos.add(cli.id);
    const gq = gracaDoCliente(cli); if(!gq) continue;
    por({data:somaDias(gq.perda, -30), cli, prazo:true, selo:"Qualidade",
      resumo:`a qualidade de segurado se perde em ${fmt(gq.perda)}: avaliar o recolhimento`}, advogadoDoCliente(cli.id));
  }
  // P2 · o vencimento de cada plano de contribuições: a recepção confere se o cliente pagou (sem recepção, o advogado)
  const recepQ = equipeAtiva().filter(c=>c.cargo==="recepcao").map(c=>c.id);
  for(const q of (D.qualidade||[])){
    if(q.ativo===false) continue;
    const cli = D.cliPorId.get(q.cliente_id), px = cli && qualidadeProximos(q, 1)[0];
    if(px) por({data:px, cli, selo:"Contribuição", resumo:`pagar até ${fmt(px)}: ${qualGuia(q)}${q.valor ? ` de ${qualValor(q.valor)}` : ""} (${qualFim(q).toLowerCase()})`},
      recepQ.length ? recepQ : advogadoDoCliente(q.cliente_id));
  }
  // P5 · o CadÚnico do BPC: 60 dias antes do vencimento, à recepção (sem recepção, ao advogado), uma vez por cliente
  const vistosCu = new Set();
  for(const k of (D.casos||[])){
    if(vistosCu.has(k.cliente_id) || !ehLoas(k)) continue;
    vistosCu.add(k.cliente_id);
    const cli = D.cliPorId.get(k.cliente_id), cu = cli && cadunicoDoCliente(cli.id); if(!cu) continue;
    por({data:somaDias(cu.ate, -60), cli, selo:"CadÚnico", resumo:`atualizar o CadÚnico no CRAS até ${fmt(cu.ate)}: avisar o cliente`},
      recepQ.length ? recepQ : advogadoDoCliente(cli.id));
  }
  // F236 · o card de aposentadoria tem dono: o responsável dele ou o advogado do cliente. Com o direito
  // já alcançado e sem caso, cobra todo dia, na data do direito, até virar caso ou ser arquivado
  for(const l of (D.lembretes||[])){
    if(l.ativo===false || !l.proximo_em || (ehCardApos(l) && !cardVivo(l))) continue;
    const cli = D.cliPorId.get(l.cliente_id)||null;
    const donos = l.responsavel_id ? [l.responsavel_id] : advogadoDoCliente(l.cliente_id);
    const dd = ehCardApos(l) && dataDireitoDoCard(l);
    // 31.10.2026 · a data marcada para rever o card (o "Concluir em" do To Do ou o rever em) adia a cobrança do direito
    if(dd && dd.data<=hj && !(proxDoCard(l) > hj)) por({data:dd.data, cli, cardDir:l, selo:"Aposentadoria",
      resumo:`${especieDoCard(l)||"aposentadoria"}: direito desde ${fmt(dd.data)}, protocolar já`}, donos);
    else por({data:ehCardApos(l) ? proxDoCard(l) : l.proximo_em, cli, l, resumo:l.titulo}, donos);
  }
  // F236 · a rotina do escritório entra no Meu Dia de quem a faz, no dia programado, com o "já fiz"
  for(const r of (D.rotinas||[])) if(r.ativo!==false && rotinaVenceHoje(r) && !rotinaFeitaHoje(r))
    por({data:hj, cli:null, rotina:r, resumo:r.titulo}, r.responsavel_id ? [r.responsavel_id] : null);
  // F236 · a fila da recepção: avisar o cliente das perícias da semana e os atendimentos presenciais
  const recep = equipeAtiva().filter(c=>c.cargo==="recepcao").map(c=>c.id);
  if(recep.length) for(const e of (D.eventos||[])){
    const d = dataSP(e.data_hora), k = D.casoPorId.get(e.caso_id);
    if(e.status!=="agendada" || d<hj || d>d7 || !RX_EV_PALAVRA.test(e.tipo||"") || !k || k.fase==="encerrado" || evAvisado(e)) continue;
    // F236 · a perícia que já tem o "📞 Avisar" aberto para alguém não entra: era o mesmo aviso com dois donos
    if(avisoEmAberto(e)) continue;
    const cli = D.cliPorId.get(k.cliente_id); if(!cli) continue;
    por({data:hj, k, cli, avisar:e, selo:"Avisar",
      resumo:`avisar da ${(e.tipo||"perícia").toLowerCase()} de ${fmt(d).slice(0,5)} às ${horaSP(e.data_hora)}`}, recep);
  }
  for(const c of (D.clientes||[])){
    const a = (c.campos||{}).agenda_quarta;
    if(!a || !a.data || a.data<hj) continue;
    const prof = equipeAtiva().find(x=>dsa((x.nome||"").split(" ")[0])===dsa(a.profissional||"paulo"));
    const falta = [!c.cpf&&"CPF", !enderecoLinha(c)&&"endereço", !c.dn&&"nascimento"].filter(Boolean);
    por({data:a.data, cli:c, selo:"Atendimento", resumo:`atendimento presencial${a.inicio?` às ${hmTxt(a.inicio)}`:""}${prof?` com ${prof.nome.split(" ")[0]}`:""}${falta.length?` · falta no cadastro: ${falta.join(", ")}`:""}`},
      [...new Set([...recep, ...(prof?[prof.id]:[])])]);
  }
  // F236 · O QUE SÓ CHEGAVA PELAS NOVIDADES vai ao Meu Dia de quem responde pelo caso (sem atribuído, ao
  // Paulo), na data em que chegou: a perícia, audiência ou julgamento designado e ainda fora da agenda
  // (até alguém agendar); a pauta do CRPS (até a pessoa ler); a decisão que ninguém da equipe comentou
  // depois (até a pessoa ler). O prazo do tribunal já entra por prazos_tribunal, com a data dele.
  const ultHumano = new Map();
  for(const a of (D.and30||[])) if(a.autor_id && !ORIGENS_ROBO.includes(a.origem)){
    const t = String(a.criado_em||""); if(t > (ultHumano.get(a.caso_id)||"")) ultHumano.set(a.caso_id, t); }
  const pautaVista = new Set();
  for(const a of (D.novid||[])){   // do mais novo para o mais velho: vale a pauta mais recente do caso
    const k = D.casoPorId.get(a.caso_id); if(!k || k.fase==="encerrado" || foraDoFluxo(k) || /^⏰ Prazo no /.test(a.texto||"")) continue;
    const cli = D.cliPorId.get(k.cliente_id); if(!cli) continue;
    const donos = donosDoCaso(k), naoLeram = donos.filter(id=>!(a.andamentos_lidos||[]).some(l=>l.colaborador_id===id));
    const chegou = () => dataSP(a.criado_em), txt = a.origem==="pat" ? limparHtmlPat(a.texto) : String(a.texto||"");
    // F236 · a pauta do CRPS antes do agendamento genérico: ela também é "julgamento a agendar", mas o item do dia
    // diz mais (a sustentação oral) e vai a quem ainda não leu. A sessão é a que vale (sessaoCrps: a remarcada, nunca a
    // cancelada nem a já julgada); o item vale no último dia do pedido de sustentação oral (3 dias úteis antes da sessão,
    // Regimento do CRPS, art. 81, III) e diz até quando; passado ele, fica o agendar. O julgamento não pede aviso ao
    // cliente (F51): a mensagem da pauta está no cartão do movimento
    const s = a.origem==="crps" && /pautad|sess[ãa]o|julgament/i.test(txt) && (crpsBlocos(k).length ? sessaoCrps(k) : sessaoDoRecurso(k, txt));
    if(s){
      if(s.data>=hj && !pautaVista.has(k.id) && !evJaAgendado(k.id, s.data) && naoLeram.length){
        const ate = uteisAntes(s.data, 3), quando = `julgamento ${s.orgao?`na ${s.orgao}`:"no CRPS"} em ${fmt(s.data).slice(0,5)}${s.hora?` às ${s.hora}`:""}`;
        por({data: ate>=hj ? ate : chegou(), k, cli, novLer:a, prazo:true, selo:"Pauta",
          resumo: ate>=hj ? `${quando}: pedir a sustentação oral até ${fmt(ate).slice(0,5)}, se for pedi-la, e agendar o julgamento`
            : `${quando}: agendar o julgamento (o pedido de sustentação oral ia até ${fmt(ate).slice(0,5)})`}, naoLeram);
      }
      pautaVista.add(k.id); continue;
    }
    const ev = eventoDaNovidade(a);
    if(ev){
      if(ev.data>=hj && !evJaAgendado(a.caso_id, ev.data)) por({data:chegou(), k, cli, novEv:a, prazo:true, selo:"Agendar",
        resumo:`${String(ev.tipo||"perícia").toLowerCase()} em ${fmt(ev.data).slice(0,5)} às ${ev.hora}: agendar e avisar o cliente`}, donos);
      continue;
    }
    if(RX_NOV_DECISAO.test(txt) && !/conclus[oa]s? para/i.test(txt) && naoLeram.length && !(ultHumano.get(k.id) > String(a.criado_em||"")))
      por({data:chegou(), k, cli, novLer:a, selo:"Decisão", resumo:resumoAgenda(txt)}, naoLeram);
  }
  // F292 · o prazo fatal avisa antes, no Meu Dia de quem já o tinha: a 5, a 2 e a 1 dia útil (Onda B do fluxo do To Do);
  // o recurso e a exigência também (teste 11.88, JUR-03), mesmo sem o "Concluir em" do To Do na mesma data
  for(const it of out.filter(i=>(i.fatal || i.avisa) && i.data>hj)){
    const n = uteisAte(it.data);
    if(n===5 || n===2 || n===1) out.push({...it, data:hj, fatal:false, prazo:true, antes:it.data, selo:`Vence em ${n} dia${n>1?"s":""} út${n>1?"eis":"il"}`,
      resumo:`prazo fatal em ${fmt(it.data).slice(0,5)}: ${it.resumo||(it.k?tituloCaso(it.k):"")}`});
  }
  return out.sort((a,b)=>a.data<b.data?-1:a.data>b.data?1
    : (b.k&&b.k.urgente?1:0)-(a.k&&a.k.urgente?1:0) || ((a.cli||{}).nome||"").localeCompare((b.cli||{}).nome||"","pt"));
}
const SVG_CAL = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>`;
function linhaAgenda(it){
  const {k, cli, t, tc, l, ev} = it;
  const d = it.data, hj = hoje();
  // F236 · o ano aparece quando não é o deste ano (a DCB de 2025 parecia de novembro que vem)
  const dTxt = d===hj ? "hoje" : `${d.slice(8,10)}/${d.slice(5,7)}${d.slice(0,4)!==hj.slice(0,4)?"/"+d.slice(2,4):""}`;
  const resumo = it.resumo || (it.andId ? resumoAgenda(textoDoAndamento(it.andId), tc && D.colPorId.get(tc.colaborador_id)) : "") || (k?tituloCaso(k):"");
  const slot = t ? (t.virtual ? "" : `<button class="check" data-conclui="${t.id}" aria-label="concluir"></button>`)
    : tc ? `<button class="check" data-conclui-and="${tc.id}" aria-label="concluir"></button>`
    : l ? `<button class="check" data-avisado="${l.id}" aria-label="registrar o aviso"></button>`
    : it.rotina ? `<button class="check" data-rotina="${it.rotina.id}" aria-label="já fiz" title="já fiz — volta no próximo dia programado"></button>`
    : it.evPassado ? `<button class="check" data-compareceu="${it.evPassado.id}" aria-label="aconteceu" title="aconteceu — fecha a pendência"></button>`
    : it.avisar ? `<button class="check" data-avisar="${it.avisar.id}" aria-label="avisado" title="registrar que o cliente foi avisado"></button>`
    : it.novEv ? `<button class="check" data-agendar-nov="${it.novEv.id}" aria-label="agendar" title="agendar na aba Perícias, com o aviso ao cliente"></button>`
    : it.novLer ? `<button class="check" data-li-nov="${it.novLer.id}" aria-label="li" title="li — sai do seu Meu Dia"></button>`
    : ev ? `<span class="ag-cal" title="${esc(ev.tipo||"")}">${SVG_CAL}</span>` : "";
  // F427 · a fase "outro" (🗓 Tarefas com Prazo, lista pessoal) diz a fase verdadeira do caso ou o nome da lista, e não "Outros"
  const fe = k && k.fase==="outro" ? faseEfetiva(k) : k && k.fase, lst = k && k.fase==="outro" ? semEmoji(listaDe(k)).trim() : "";
  const esp = k ? [k.especie, fe!=="outro" ? NOME_FASE[fe] : lst && lst!=="—" ? lst : NOME_FASE[fe]].filter(Boolean).join(" · ") : "";
  const quem = it.quem.slice(0,2);
  const nome = cli ? esc(cli.nome) : esc(resumo);
  // F427 · o prazo e o compromisso dizem do que são na própria linha, depois do nome (antes, só no title)
  const oque = !cli ? "" : it.antes ? resumo : it.motivo || (tc && tc.natureza!=="lembrete" ? resumo : "");
  const selK = t ? "t"+t.id : tc ? "tc"+tc.id : k ? `k${k.id}|${it.selo||""}|${d}` : "";   // F443 · a linha selecionada sobrevive ao render
  if(selK) _agIt.set(selK, it);
  // F437 · linha C: o nome à esquerda, a lista e a etapa, a data, o responsável e, à direita, o concluir e a ⭐
  return `<div class="cartao ag-linha${k&&k.urgente?" urg":""}"${cli?` data-cli="${cli.id}"`:""}${k?` data-casos="${k.id}"`:""}${t?` data-tarefa="${t.id}"`:""}${selK?` data-sel="${esc(selK)}"`:""}>
    <span class="ag-data${d<hj?" venc":d===hj?" hoje":""}">${dTxt}</span>
    <div class="ag-txt"${cli&&resumo?` title="${esc(resumo)}"`:""}><b>${nome}</b>${k&&k.especie?`<span class="ag-ben">${esc(k.especie)}</span>`:""}${oque?`<span class="ag-oque"> · ${esc(oque)}</span>`:""}</div>
    <span class="ag-c-lista">${esc(k ? (fe!=="outro" ? NOME_FASE[fe]||"" : lst && lst!=="—" ? lst : NOME_FASE[fe]||"") : "")}</span>
    <span class="ag-c-etapa">${k && k.etapa ? seloEtapaLista(k) : ""}</span>
    <span class="ag-selos">${it.fatal?`<span class="ag-fatal">Prazo fatal</span>`:""}${it.tc && it.tc.iniciada_em && !it.tc.concluida_em?`<span class="ag-tipo">em andamento</span>`:""}${it.tc && Array.isArray(it.tc.etapas) && it.tc.etapas.length?`<span class="ag-tipo">etapas ${it.tc.etapas.filter(e=>e.feito).length}/${it.tc.etapas.length}</span>`:""}${
      it.selo?`<span class="${it.prazo?"ag-prazo":"ag-tipo"}">${esc(it.selo)}</span>`:""}${
      it.extra?`<span class="ag-tipo" title="a menção que acompanha a tarefa ainda não foi lida">${esc(it.extra)}</span>`:""}${
      tc&&tc.papel==="revisa"?`<span class="ag-tipo ag-revisa" title="revisa o que o executor fez">revisa</span>`:""}${
      esp?`<span class="ag-esp">${esc(esp)}</span>`:""}</span>
    <span class="avatares"${cli?` data-equipe="${cli.id}"`:""}>${quem.map(c=>
      `<span class="avatar mini" style="background:${c.cor}" title="${esc(c.nome)}">${esc(c.inicial)}</span>`).join("")}</span>
    ${k && d<=hj ? botoesConferir(k, "ag-conf") : ""}
    <span class="ag-slot">${slot}</span>
    <span class="acoes">${k?`
      <button class="acao-card fogo ${k.urgente?"on":""}" title="Urgente" data-fogo="${k.id}"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c.6 3.2 4.5 5.4 4.5 10a4.5 4.5 0 0 1-9 0c0-2.3 1.2-3.7 2.2-4.8.4 1.6 1.2 2.6 2.3 2.8-.4-2.6-.6-5.4 0-8Z"/></svg></button>
      `:""}${estrelaDaLinha(k, t, cli)}</span>
  </div>`;
}
// F464 · a ⭐ em todas as linhas (pedido do Paulo, 09.11.2026): o caso, a tarefa pessoal (tarefas.importante) ou,
// sem caso na linha, todos os casos abertos do cliente; sem nada a marcar, a ⭐ fica apagada no mesmo lugar
function estrelaDaLinha(k, t, cli){
  const svg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z"/></svg>`;
  if(k) return `<button class="acao-card ${k.importante?"on":""}" title="Importante" data-estrela="${k.id}">${svg}</button>`;
  if(t && !t.virtual) return `<button class="acao-card ${t.importante?"on":""}" title="Importante" data-estrela-t="${t.id}">${svg}</button>`;
  const ks = cli ? ativos().filter(x=>x.cliente_id===cli.id) : [];
  if(ks.length) return `<button class="acao-card ${ks.some(x=>x.importante)?"on":""}" title="Importante: todos os casos deste cliente" data-estrela-cli="${cli.id}">${svg}</button>`;
  return `<button class="acao-card" title="Importante: nada a marcar nesta linha" aria-disabled="true" disabled>${svg}</button>`;
}
let limAg = {};
function renderAgendaV10(qual){
  const planej = qual==="planejado"; _agIt.clear();
  tituloLista(planej ? "Planejado" : "Meu Dia");
  document.querySelector(".meio").classList.add("ag-v10");
  const col = planej ? filtroPlanColab : filtroDia;   // F236 · o Meu Dia tem filtro próprio
  const em = n=>{ const x=new Date(hoje()+"T12:00:00"); x.setDate(x.getDate()+n); return x.toLocaleDateString("sv"); };
  const hj = hoje();
  let itens = planej || mdMostraVence() ? itensAgenda(col) : [];
  let chipsNat = "";
  if(planej) chipsNat = blocoCarga(itensAgenda(null));
  if(planej){   // F378 · os filtros da natureza; o número de cada um conta antes do filtro
    const cont = {}; itens.forEach(i=>{ const n = natPlan(i); cont[n] = (cont[n]||0)+1; });
    chipsNat += `<div class="filtros plan-nat" role="group" aria-label="Natureza">` + [["","Tudo",itens.length,"todas as datas"], ...PLAN_NAT.map(([v,r,t])=>[v,r,cont[v]||0,t])]
      .filter(([v,,n])=>!v || n || v===filtroPlanNat).map(([v,r,n,t])=>`<button class="fchip ${filtroPlanNat===v?"on":""}" data-pnat="${v}" aria-pressed="${filtroPlanNat===v}" title="${esc(t)}">${r} <span class="pl-n">${n}</span></button>`).join("") + `</div>`;
    if(filtroPlanNat) itens = itens.filter(i=>natPlan(i)===filtroPlanNat);
  }
  // F236 · O MEU DIA COMEÇA PELO ATRASADO DA PESSOA e mostra o próximo dia útil (no sábado, até a
  // segunda): a perícia de amanhã e o prazo de segunda não esperam alguém abrir o Planejado
  const util = (()=>{ let d=em(1); while(!ehDiaUtil(d)) d=somaDias(d,1); return d; })();
  const rotUtil = util===em(1) ? "Amanhã" : `Até ${SIGLA_DIA[new Date(util+"T12:00:00").getDay()]}, ${util.slice(8,10)}/${util.slice(5,7)}`;
  const nV = itens.filter(i=>i.data<hj).length, nH = itens.filter(i=>i.data===hj).length,
        n7 = itens.filter(i=>i.data>hj && i.data<=em(7)).length, nU = itens.filter(i=>i.data>hj && i.data<=util).length;
  // de onde vêm as vencidas, no title do número: "Mora do INSS 12 · Tarefa 8 · …"
  const porSelo = Object.entries(itens.filter(i=>i.data<hj).reduce((m,i)=>{ const s = i.selo||(i.tc?"Tarefa":i.l?"Lembrete":"Outro"); m[s]=(m[s]||0)+1; return m; }, {}))
    .sort((a,b)=>b[1]-a[1]).map(([s,n])=>`${s} ${n}`).join(" · ");
  const secoes = planej ? [
    ["Vencidas", d=>d<hj, "venc"], ["Hoje", d=>d===hj, "hoje"], ["Amanhã", d=>d===em(1), ""],
    ["Próximos sete dias", d=>d>em(1) && d<=em(7), ""], ["Mais tarde", d=>d>em(7), ""],
  ] : [["Vencidas", d=>d<hj, "venc"], ["Hoje", d=>d===hj, "hoje"], [rotUtil, d=>d>hj && d<=util, ""]];
  // Meu Dia: o que vence hoje e, à parte, o que alguém pôs no dia à mão
  const adic = planej ? [] : grupoClientes(D.meudia.filter(m=>!col || m.colaborador_id===col)
    .map(m=>m.caso_id && D.casoPorId.get(m.caso_id)).filter(Boolean));
  const dia = new Date(hj+"T12:00:00").toLocaleDateString(IDIOMA,{weekday:"long", day:"numeric", month:"long"});
  const partes = planej
    ? [nV?`<b class="ag-venc" title="${esc(porSelo)}">${nV} ${nV===1?"vencida":"vencidas"}</b>`:"", nH?`${nH} para hoje`:"",
       n7?`${n7} nos próximos sete dias`:""].filter(Boolean)
    : [nV?`<b class="ag-venc" title="${esc(porSelo)}">${nV} ${nV===1?"vencida":"vencidas"}</b>`:"", nH?`${nH} para hoje`:"nada vence hoje",
       nU?`${nU} ${util===em(1)?"para amanhã":`até ${rotUtil.slice(4)}`}`:""].filter(Boolean);
  const frase = partes.length>1 ? partes.slice(0,-1).join(", ")+" e "+partes.at(-1) : (partes[0]||"agenda limpa");
  // F236 · o atalho leva ao Planejado já filtrado na mesma pessoa, e só aparece para quem tem o Planejado
  const podePlan = !planej && (!visaoColab() || listasDoColab().includes("planejado"));
  document.getElementById("sub-lista").innerHTML = `${dia[0].toUpperCase()+dia.slice(1)}. ${
    frase.startsWith("<") ? frase : frase[0].toUpperCase()+frase.slice(1)}.${
    podePlan ? ` <a href="#" class="ag-link" onclick="event.preventDefault();filtroPlanColab=filtroDia;irPara('planejado')">ver no Planejado</a>` : ""}`;
  const nomes = equipeAtiva();
  document.getElementById("topo-extra").innerHTML = `<div class="seg-colab" role="group" aria-label="Filtrar por pessoa">`
    + [["", "Todos"], ...nomes.map(c=>[c.id, (c.nome||"").split(" ")[0]])].map(([id,n])=>
      `<button data-agcol="${id}" aria-pressed="${(col||"")===id}" class="${(col||"")===id?"on":""}">${esc(n)}</button>`).join("")
    + `</div>`;
  // F160 · DELEGADAS POR MIM (lição do Tramitação Inteligente, 03.10.2026): o
  // que eu pus na mão de outra pessoa e ainda está aberto, em qualquer data.
  // Responde "o que eu passei e não voltou?" sem abrir caso por caso. Não
  // obedece ao filtro por pessoa, porque a pergunta é sobre quem delegou.
  // F236 · e diz se a menção que acompanhou a tarefa já foi lida
  const envi = new Map((D.mencoesEnv||[]).map(m=>[`${m.andamento_id}|${m.para_id}`, m]));
  const deleg = planej ? [] : itensAgenda(null).filter(i=>i.tc && i.tc.atribuido_por===eu.id && i.tc.colaborador_id!==eu.id)
    .map(i=>{ const m = envi.get(`${i.tc.andamento_id}|${i.tc.colaborador_id}`);
      return m ? {...i, extra:`não lida há ${Math.max(0, diasEntreIso(dataSP(m.criado_em), hj))} d`} : i; });
  // F236 · as menções a mim ficam à parte das outras novidades, logo depois do que vence hoje (a que já
  // aparece no dia como tarefa minha não se repete)
  const naLista = new Set(itens.filter(i=>i.tc && i.data<=util).map(i=>i.andId));
  const mencs = planej || (col && col!==eu.id) ? [] : (D.mencoes||[]).filter(m=>!naLista.has(m.andamento_id));
  // F437 · a ordem escolhida no ⋯ (Data é a ordem da agenda); a ⭐ do caso ou o nome do cliente
  const ordL = opcLista("ordem");
  if(ordL==="alfa") itens = [...itens].sort((a,b)=>((a.cli||{}).nome||"").localeCompare((b.cli||{}).nome||"","pt") || (a.data<b.data?-1:a.data>b.data?1:0));
  else if(ordL==="imp") itens = [...itens].sort((a,b)=>(b.k&&b.k.importante?1:0)-(a.k&&a.k.importante?1:0) || (a.data<b.data?-1:a.data>b.data?1:0));
  const agrL = planej ? opcLista("agrupar") : "data";
  const meuDia = !planej && (!col || col===eu.id);   // F436 · período, conta do dia e sugeridas: só no Meu Dia da própria pessoa
  const ats = meuDia ? atendimentosHoje(eu.id) : [];
  const secao = ([tit,f,tom])=>{
    const g = itens.filter(i=>f(i.data)), at = tom==="hoje" ? ats : []; if(!g.length && !at.length) return "";
    const lim = limAg[tit]||50;
    const nReag = tom==="venc" ? g.filter(reagendavel).length : 0;   // F442 · Reagendar os vencidos (ideia do Todoist)
    if(tom==="venc") _reagVenc = g;
    return `<section class="pl-grupo"${tom?` data-tom="${tom}"`:""}><h3 class="secao">${tit} <span class="pl-n">${g.length+at.length}</span>${nReag ? `<button type="button" class="reag-bt" onclick="reagendarVencidas()" title="Levar de uma vez a outra data os ${nReag} retornos, voltas à fila e lembretes vencidos (prazo fatal e perícia ficam)"><span aria-hidden="true">Reagendar</span><span class="sr-only">Reagendar os ${nReag} vencidos que não são prazo fatal</span></button>` : ""}</h3>`
      + (tom==="hoje" ? hojePorPeriodo(g.slice(0,lim), at, planej) : planej ? g.slice(0,lim).map(linhaAgenda).join("") : porClienteDia(g.slice(0,lim)))
      + (g.length>lim?`<button class="btn-rap mais-plan" data-mais="${esc(tit)}">Mostrar mais ${Math.min(200,g.length-lim)} de ${g.length-lim}</button>`:"")
      + `</section>`;
  };
  const nDegNL = deleg.filter(i=>i.extra).length;
  const corpo = agrL!=="data" ? emGrupos(itens, i=>chaveGrupo(agrL, i.k, i.quem), linhaAgenda) : (meuDia ? contaDoDia(itens.filter(i=>i.data===hj), ats, eu.id) + blocoOntem() : "")
  + (itens.length ? `<div class="ag-th" aria-hidden="true"><span>Cliente</span><span>Lista</span><span>Etapa</span><span>Tipo</span><span>Prazo</span></div>` : "")
  + secoes.slice(0,2).map(secao).join("")
  + (mencs.length ? `<section class="pl-grupo" data-tom="menc"><h3 class="secao">Menções a você <span class="pl-n">${mencs.length}</span></h3>`
      + mencs.slice(0,8).map(linhaMencaoDia).join("")
      + (mencs.length>8?`<button class="btn-rap mais-plan" onclick="irPara('mencoes')">ver as ${mencs.length} em Menções</button>`:"") + `</section>` : "")
  + (meuDia ? secaoSugeridas() : "")
  + secoes.slice(2).map(secao).join("")
  + (adic.length ? `<section class="pl-grupo"><h3 class="secao">Adicionados ao dia <span class="pl-n">${adic.length}</span></h3>`
      + adic.map(([c,ks])=>cartaoCliente(c,ks)).join("") + `</section>` : "")
  + (planej ? "" : secaoDiasAnteriores(col))
  // F236 · a recepção completa os cadastros quando sobra tempo (a procuração sai com a linha da rua em branco)
  + (!planej && eu.cargo==="recepcao" && (!col || col===eu.id) ? blocoSemEndereco() : "")
  // F236 · o que eu passei a outra pessoa fica recolhido embaixo: a primeira tela é o MEU trabalho
  + (deleg.length ? `<details class="pl-grupo pl-dobra" data-tom="deleg"><summary><h3 class="secao">Delegadas por mim <span class="pl-n">${deleg.length}${nDegNL?` · ${nDegNL} sem leitura`:""}</span></h3></summary>`
      + deleg.slice(0,limAg["Delegadas por mim"]||50).map(linhaAgenda).join("")
      + (deleg.length>(limAg["Delegadas por mim"]||50)?`<button class="btn-rap mais-plan" data-mais="Delegadas por mim">Mostrar mais ${Math.min(200,deleg.length-(limAg["Delegadas por mim"]||50))} de ${deleg.length-(limAg["Delegadas por mim"]||50)}</button>`:"")
      + `</details>` : "");
  document.querySelector(".meio").classList.add("lista-opc");
  document.getElementById("conteudo-meio").innerHTML = chipsNat + avisoSeMeuDia(planej) + (corpo
    || `<p class="meio-sub">${planej?"Nada com data, agenda limpa.":`Nada vence hoje. Para pôr um cliente no dia, ${
      celular()?"toque e segure":"clique com o botão direito"} no cartão dele e escolha Adicionar ao Meu Dia.`}</p>`);
  document.querySelectorAll("[data-agcol]").forEach(b=>b.onclick=()=>{
    if(planej) filtroPlanColab=b.dataset.agcol||null; else filtroDia=b.dataset.agcol||null;
    limAg={}; render(); });
  document.querySelectorAll("[data-mais]").forEach(b=>b.onclick=()=>{ const t=b.dataset.mais; limAg[t]=(limAg[t]||50)+200; render(); });
  document.querySelectorAll("[data-pnat]").forEach(b=>b.onclick=()=>{ filtroPlanNat=b.dataset.pnat; limAg={}; render(); });
  document.querySelectorAll("[data-conclui-and]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); concluirDeVez(b.dataset.concluiAnd); });
  document.querySelectorAll("[data-avisado]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); lembreteAvisado(b.dataset.avisado,"manual"); });
  // F236 · a caixa de cada origem nova: a rotina feita, a perícia que aconteceu, o cliente avisado, a menção lida
  document.querySelectorAll("[data-rotina]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); marcarRotina(b.dataset.rotina, 0); });
  document.querySelectorAll("[data-compareceu]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); compareceuEvento(b.dataset.compareceu); });
  document.querySelectorAll("[data-avisar]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); janelaAvisado(b.dataset.avisar); });
  document.querySelectorAll("[data-menc-lida]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); lerMencao(b.dataset.mencLida); });
  document.querySelectorAll("[data-agendar-nov]").forEach(b=>b.onclick=e=>{ e.stopPropagation();
    const a = (D.novid||[]).find(x=>x.id===b.dataset.agendarNov); if(a) agendarPericiaDe({casoId:a.caso_id, texto:a.texto, andId:a.id}); });
  document.querySelectorAll("[data-li-nov]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); marcarLidas([b.dataset.liNov]); });
  document.querySelectorAll("[data-sug-add]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); b.dataset.sugCaso ? alternarMeuDia(b.dataset.sugCaso) : abrirFicha(b.dataset.sugCli); });
  document.querySelectorAll("[data-sug-regra]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); criarTarefaDaRegra(b.dataset.sugCaso, b.dataset.sugRegra); });   // F441
  document.querySelectorAll("[data-sug-fora]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); guardar("crm_sug_fora", JSON.stringify([...sugFora(), b.dataset.sugFora].slice(-500))); render(); });
  ligarCartoes(); ligarTarefas();
  buscarTextosAgenda([...itens, ...deleg].filter(i=>i.andId && !i.resumo).map(i=>i.andId));
  buscarMotivosPz([...itens, ...deleg].filter(i=>i.k && (i.fatal || i.antes) && !i.tc && !i.motivo && i.k.prazo===(i.antes||i.data)).map(i=>i.k));   // F427
}
// ══════════════════════════════════════════════════════════════════════════
// F442 · REAGENDAR OS VENCIDOS DE UMA VEZ (proposta 1 do Todoist, aprovada pelo Paulo em 08.11.2026)
// ══════════════════════════════════════════════════════════════════════════
// O cabeçalho das Vencidas do Meu Dia e do Planejado leva de uma vez a outra data o que é só data de voltar: a tarefa
// de lembrete ou compromisso da anotação, a volta à fila, o retorno do To Do e a tarefa pessoal. Prazo fatal, prazo do
// tribunal, recurso, exigência, perícia a confirmar, honorário e qualidade ficam: pedem registro, e não data nova.
let _reagVenc = [];
function reagendavel(i){
  if(i.fatal || i.prazo || i.ev || i.evPassado || i.pg) return false;
  if(i.tc) return i.tc.natureza!=="fatal" && !i.tc.concluida_em;
  if(i.t) return !i.t.virtual && !!i.t.id;
  return !!i.k && (i.selo==="Volta à fila" || i.selo==="Prazo do Microsoft To Do");
}
function reagendarVencidas(lote){
  const ms = _reagVenc.filter(reagendavel), fica = _reagVenc.length - ms.length;
  if(!ms.length) return aviso("Nenhuma linha selecionada tem data que se possa mudar: prazo fatal e perícia pedem registro");
  const op = [["Hoje", hoje()], ["Amanhã", proxDiaUtil(somaDias(hoje(),1))], ["Próxima semana", proxSegunda()]];
  caixa(`<h3 style="margin:0 0 6px">${lote ? `Nova data para ${ms.length} ${ms.length===1?"item":"itens"}` : `Reagendar ${ms.length} ${ms.length===1?"vencido":"vencidos"}`}</h3>
    <p class="meio-sub">Retornos, voltas à fila e lembretes vão para a data escolhida.${fica ? ` ${fica} ${fica===1?"item fica":"itens ficam"} (prazo fatal, perícia a confirmar, exigência e outros que pedem registro).` : ""}</p>
    <div class="conf-dias">${op.map(([r,d])=>`<button type="button" class="esp-it" onclick="aplicarReagendar('${d}')" title="${fmtBarra(d)}">${r}</button>`).join("")}
</div>${miniCal(hoje(), "")}`);
  ligarMiniCal(document.querySelector("#modal .mcal"), aplicarReagendar);
}
// a data nova de uma linha: a tarefa da anotação, a tarefa pessoal ou o casos.prazo (a volta à fila anda com o despacho e volta a
// ir ao To Do pela ponte, todo apagado; o retorno do To Do anda como no "Em análise": o To Do só o troca quando a data dele mudar)
function moverData(i, data){
  const pat = (tab, id, c) => api(`/rest/v1/${tab}?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify(c)});
  if(i.tc){ const t = i.tc, antes = t.lembrar_em; t.lembrar_em = data;
    return {p:pat("andamento_tarefas", t.id, {lembrar_em:data}), undo:()=>{ t.lembrar_em = antes; return pat("andamento_tarefas", t.id, {lembrar_em:antes}); }}; }
  if(i.t){ const t = i.t, antes = t.prazo; t.prazo = data;
    return {p:pat("tarefas", t.id, {prazo:data}), undo:()=>{ t.prazo = antes; return pat("tarefas", t.id, {prazo:antes}); }}; }
  const k = i.k, antes = {prazo:k.prazo, ronda:k.ronda}, d = (k.ronda||{}).despacho;
  const campos = {prazo:data, ...(i.selo==="Volta à fila" && d ? {ronda:{...(k.ronda||{}), despacho:{...d, prazo:data, todo:null}}} : {})};
  const p = patchCaso(k.id, campos); Object.assign(k, campos);
  return {p, undo:()=>{ Object.assign(k, antes); return patchCaso(k.id, {prazo:antes.prazo, ...(campos.ronda ? {ronda:antes.ronda||{}} : {})}); }};
}
async function aplicarReagendar(data){
  fecharCaixa();
  const ms = _reagVenc.filter(reagendavel); if(!ms.length || !data) return;
  const volta = [], grava = [], vistos = new Set(), notas = new Map();
  // F454 · cada caso recebe a anotação do que andou, porque o Reagendar em lote não deixava rastro no caso
  const nota = (casoId, rot, antes) => { if(!casoId || !antes || antes===data) return;
    const n = notas.get(casoId) || []; n.push(`${rot} levado de ${fmtBarra(antes)} para ${fmtBarra(data)}`); notas.set(casoId, n); };
  for(const i of ms){
    const ch = i.tc ? "tc"+i.tc.id : i.t ? "t"+i.t.id : "k"+i.k.id;
    if(vistos.has(ch)) continue; vistos.add(ch);
    if(i.tc) nota(i.tc.caso_id || (i.k||{}).id, i.tc.natureza==="lembrete" ? "Lembrete" : "Tarefa", i.tc.lembrar_em);
    else if(i.t) nota(i.t.caso_id, "Tarefa", i.t.prazo);
    else nota(i.k.id, i.selo==="Volta à fila" ? "Volta à fila" : "Prazo do Microsoft To Do", i.k.prazo);
    const m = moverData(i, data); grava.push(m.p); volta.push(m.undo);
  }
  const r = await Promise.allSettled(grava), falhas = r.filter(x=>x.status==="rejected").length;
  const quem = (eu.nome||"").split(" ")[0] || "a equipe", ands = [];
  await Promise.allSettled([...notas].map(async ([casoId, ns])=>{
    const [and] = await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:casoId, autor_id:eu.id, texto:`${ns.join("; ")} por ${quem} (reagendado em lote).`})});
    if(and){ ands.push(and); if(Array.isArray(D._andsFicha)) D._andsFicha.unshift(and); }
  }));
  _sel.clear(); montarSidebar(); render();
  if(falhas) aviso(`⚠ ${falhas} de ${grava.length} não gravaram: atualize a página e confira`);
  avisoDesfazer(`${grava.length - falhas} ${grava.length===1?"item reagendado":"itens reagendados"} para ${fmtBarra(data)}`, async ()=>{
    await Promise.allSettled([...volta.map(f=>f()), ...ands.map(a=>api(`/rest/v1/andamentos?id=eq.${a.id}`,{method:"DELETE"}))]);
    if(Array.isArray(D._andsFicha)) D._andsFicha = D._andsFicha.filter(a=>!ands.includes(a)); montarSidebar(); render(); aviso("Reagendamento desfeito", false);
  }, 30000);
}
// F443 · SELEÇÃO MÚLTIPLA NAS LISTAS (proposta 2 do Todoist, aprovada pelo Paulo em 08.11.2026)
// ══════════════════════════════════════════════════════════════════════════
// Shift+clique (no celular, tocar e segurar e escolher Selecionar; depois, cada toque marca) junta linhas do Meu Dia, do
// Planejado e das listas; a barra do pé age em todas: Concluir (por hoje, a janela da volta), Passar (a outra pessoa, com
// menção), Estrela e Data (a mesma regra do Reagendar). O clique simples continua abrindo a ficha. Nada do lote alcança
// prazo fatal: o Concluir deixa o caso cujo prazo fatal vence antes da volta, e a Data só move o que o Reagendar move.
const _sel = new Map(), _agIt = new Map();   // chave da linha → {cli, casos, it}; chave → item do Meu Dia e do Planejado
const chaveSel = el => el.dataset.sel || `c${el.dataset.cli}|${el.dataset.casos||""}`;
function alternarSel(el){
  if(!el.dataset.casos && !el.dataset.sel) return aviso("Esta linha não tem caso para agir em lote");
  const ch = chaveSel(el);
  if(_sel.has(ch)) _sel.delete(ch);
  else _sel.set(ch, {cli:el.dataset.cli, casos:(el.dataset.casos||"").split(",").filter(Boolean), it:el.dataset.sel ? _agIt.get(el.dataset.sel) || null : null});
  pintarSel();
}
function limparSel(){ _sel.clear(); pintarSel(); }
function pintarSel(){
  document.querySelectorAll(".cartao[data-cli], .kcard[data-casos]").forEach(el=>{ const on = _sel.has(chaveSel(el)); el.classList.toggle("sel", on); if(on) el.setAttribute("aria-selected","true"); else el.removeAttribute("aria-selected"); });
  let b = document.getElementById("sel-barra");
  if(!_sel.size){ if(b) b.remove(); return; }
  if(!b){ b = document.createElement("div"); b.id = "sel-barra"; b.setAttribute("role","toolbar"); b.setAttribute("aria-label","Ações nas linhas selecionadas"); document.body.appendChild(b); }
  const n = _sel.size, bt = (f, r, t) => `<button type="button" onclick="${f}()" title="${t}"><span aria-hidden="true">${r}</span><span class="sr-only">${t}</span></button>`;
  b.innerHTML = `<span class="sel-n" aria-live="polite">${n} ${n===1?"selecionada":"selecionadas"}</span>`
    + bt("loteConcluir","Concluir","Concluir por hoje os casos selecionados") + bt("lotePassar","Passar","Passar os casos selecionados a outra pessoa")
    + (visao==="quadro" ? bt("loteEtapa","Etapa","Declarar a etapa dos casos selecionados") : "")
    + bt("loteEstrela","Estrela","Marcar ou desmarcar a estrela dos casos selecionados") + bt("loteData","Data","Mudar a data dos retornos e lembretes selecionados")
    + `<button type="button" class="sel-x" onclick="limparSel()" title="Limpar a seleção (Esc)" aria-label="Limpar a seleção">✕</button>`;
}
document.addEventListener("keydown", e=>{ if(e.key==="Escape" && _sel.size && !modalAberto()) limparSel(); });
const casosDaSel = () => [...new Set([..._sel.values()].flatMap(x=>x.casos))].map(id=>D.casoPorId.get(id)).filter(k=>k && k.fase!=="encerrado");
function loteConcluir(){ const n = casosDaSel().length; if(!n) return aviso("Nenhum caso aberto na seleção"); despachar(null, null, n); }
async function gravarLote(s, nota){
  const vai = [], ficam = [];
  casosDaSel().forEach(k=>{ const f = fatalAbertoDe(k); (f && s.data > f ? ficam : vai).push(k); });
  const undos = [];
  for(const k of vai){ const u = await aplicarDespacho(k, s, nota, true); if(u) undos.push(u); }
  _sel.clear(); montarSidebar(); render(); if(clienteAberto) repintarFicha();
  const passou = s.para && D.colPorId.get(s.para);
  avisoDesfazer(`✔ ${undos.length} ${undos.length===1?"caso volta":"casos voltam"} em ${fmtBarra(s.data)}${passou?` · com ${passou.nome.split(" ")[0]}`:""}${ficam.length?` · ${ficam.length} com prazo fatal antes da volta ${ficam.length===1?"ficou":"ficaram"}`:""}`, async ()=>{
    for(const u of undos) await u(true);
    montarSidebar(); render(); if(clienteAberto) repintarFicha(); aviso("Desfeito: os casos voltaram à fila", false);
  }, 30000);
}
function lotePassar(){
  const n = casosDaSel().length; if(!n) return aviso("Nenhum caso aberto na seleção");
  caixa(`<h3 style="margin:0 0 6px">Passar ${n} ${n===1?"caso":"casos"}</h3>
    <p class="meio-sub">A pessoa escolhida entra como responsável e recebe uma menção por cliente; quem passa sai. As datas não mudam.</p>
    <div class="desp-quem">${equipeAtiva().filter(c=>c.id!==eu.id).map(c=>`<button type="button" class="btn-mini" onclick="lotePassarA('${c.id}')">${esc(c.nome.split(" ")[0])}</button>`).join("")}</div>`);
}
// a pessoa entra como responsável e quem passava (eu, ou quem estava atribuído) sai; devolve o desfazer, ou null se não gravou
async function passarComDesfazer(k, para, sai = eu.id){
  const atr = {method:"POST",headers:{Prefer:"return=minimal"}}, antes = [...(D.atrDoCaso.get(k.id)||[])];
  if(!antes.includes(para)) try{ await api(`/rest/v1/atribuicoes`, {...atr, body:JSON.stringify({caso_id:k.id, colaborador_id:para})}); }catch(e){ if(e.status!==409) return null; }
  const tira = sai && sai!==para && antes.includes(sai);
  if(tira) await api(`/rest/v1/atribuicoes?caso_id=eq.${k.id}&colaborador_id=eq.${sai}`,{method:"DELETE"}).catch(()=>{});
  D.atrDoCaso.set(k.id, [...new Set([...antes.filter(x=>!tira || x!==sai), para])]);
  return async ()=>{
    if(!antes.includes(para)) await api(`/rest/v1/atribuicoes?caso_id=eq.${k.id}&colaborador_id=eq.${para}`,{method:"DELETE"}).catch(()=>{});
    if(tira) await api(`/rest/v1/atribuicoes`, {...atr, body:JSON.stringify({caso_id:k.id, colaborador_id:sai})}).catch(()=>{});
    D.atrDoCaso.set(k.id, antes);
  };
}
async function lotePassarA(para){
  fecharCaixa();
  const p = D.colPorId.get(para), ks = casosDaSel(); if(!p || !ks.length) return;
  const undos = [], clis = new Map(), atr = {method:"POST",headers:{Prefer:"return=minimal"}};
  for(const k of ks){
    const u = await passarComDesfazer(k, para); if(!u) continue;
    if(!clis.has(k.cliente_id)) clis.set(k.cliente_id, k.id);
    undos.push(u);
  }
  clis.forEach((casoId, cliId)=>api(`/rest/v1/mencoes`, {...atr, body:JSON.stringify({de_id:eu.id, para_id:para, caso_id:casoId,
    texto:`👤 ${(eu.nome||"").split(" ")[0]} passou a você o cliente ${(D.cliPorId.get(cliId)||{}).nome||""}`})}).catch(()=>{}));
  _sel.clear(); montarSidebar(); render();
  avisoDesfazer(`${undos.length} ${undos.length===1?"caso passado":"casos passados"} a ${p.nome.split(" ")[0]}`, async ()=>{
    for(const u of undos) await u(); montarSidebar(); render(); aviso("Desfeito: os casos voltaram a quem tinha", false);
  }, 30000);
}
// F445 · a etapa em lote (no Quadro): só o catálogo da fase, e só com todos os casos na mesma fase (F119)
function loteEtapa(){
  const ks = casosDaSel(); if(!ks.length) return aviso("Nenhum caso aberto na seleção");
  const fs = [...new Set(ks.map(k=>faseEfetiva(k)))];
  if(fs.length>1) return aviso("Selecione casos da mesma fase para declarar a etapa");
  const lista = ETAPAS_POR_FASE[fs[0]]||[]; if(!lista.length) return aviso("Esta fase não tem etapas no catálogo");
  caixa(`<h3 style="margin:0 0 6px">Etapa de ${ks.length} ${ks.length===1?"caso":"casos"} · ${esc(NOME_FASE[fs[0]]||fs[0])}</h3>
    <div class="desp-quem">${lista.map((e,i)=>`<button type="button" class="btn-mini" onclick="loteEtapaA(${i})">${esc(e)}</button>`).join("")}</div>`);
}
async function loteEtapaA(i){
  fecharCaixa();
  const ks = casosDaSel(), et = (ETAPAS_POR_FASE[ks[0] && faseEfetiva(ks[0])]||[])[i]; if(!et) return;
  const undos = [];
  for(const k of ks.filter(k=>k.etapa!==et)){
    const antes = {etapa:k.etapa||null, trilha:k.trilha}, tr = trilhaSegueEtapa(k, et);
    try{ await patchCaso(k.id, {etapa:et, ...(tr?{trilha:tr}:{})}); }catch(e){ continue; }
    k.etapa = et; if(tr) k.trilha = tr;
    undos.push(async ()=>{ await patchCaso(k.id, {etapa:antes.etapa, ...(tr?{trilha:antes.trilha}:{})}).catch(()=>{}); k.etapa = antes.etapa; if(tr) k.trilha = antes.trilha; });
  }
  _sel.clear(); montarSidebar(); render();
  avisoDesfazer(`Etapa ${et} em ${undos.length} ${undos.length===1?"caso":"casos"}`, async ()=>{
    for(const u of undos) await u(); montarSidebar(); render(); aviso("Desfeito: as etapas voltaram", false);
  }, 30000);
}
async function loteEstrela(){
  const ks = casosDaSel(); if(!ks.length) return aviso("Nenhum caso aberto na seleção");
  const liga = ks.some(k=>!k.importante), muda = ks.filter(k=>!!k.importante!==liga);
  const r = await Promise.allSettled(muda.map(k=>patchCaso(k.id, {importante:liga}).then(()=>{ k.importante = liga; })));
  const ok = muda.filter((k,i)=>r[i].status==="fulfilled");
  _sel.clear(); montarSidebar(); render();
  avisoDesfazer(`⭐ ${liga?"Estrela marcada":"Estrela desmarcada"} em ${ok.length} ${ok.length===1?"caso":"casos"}`, async ()=>{
    await Promise.allSettled(ok.map(k=>patchCaso(k.id, {importante:!liga}).then(()=>{ k.importante = !liga; })));
    montarSidebar(); render(); aviso("Desfeito", false);
  }, 30000);
}
function loteData(){
  // a linha do Meu Dia e do Planejado leva o próprio item; a das listas, a volta à fila ou o retorno do To Do do caso
  _reagVenc = [..._sel.values()].flatMap(x=>x.it ? [x.it] : x.casos.map(id=>D.casoPorId.get(id)).filter(k=>k && k.prazo).map(k=>({k, data:k.prazo,
    selo:((k.ronda||{}).despacho||{}).prazo===k.prazo ? "Volta à fila" : prazoEhRetorno(k) ? "Prazo do Microsoft To Do" : null})));
  reagendarVencidas(true);
}
// F382 (12.40) · a carga de prazos por pessoa nos próximos 7 dias, no alto do Planejado (ideia do Lovable aprovada pelo
// Paulo). Conta o que o filtro "Prazos" conta; o retorno do To Do não entra (prazoEhRetorno). O nome filtra o Planejado
const CARGA_LIM = 6;   // limite semanal sugerido no protótipo aprovado; acima dele a barra fica vermelha
function blocoCarga(its){
  const hj = hoje(), fim = somaDias(hj, 6), eq = equipeAtiva(), n = new Map(eq.map(c=>[c.id, 0]));
  its.forEach(i=>{ if(natPlan(i)!=="prazos" || i.data<hj || i.data>fim) return; (i.donos||[]).forEach(id=>{ if(n.has(id)) n.set(id, n.get(id)+1); }); });
  const ls = eq.filter(c=>n.get(c.id)); if(!ls.length) return "";
  const max = Math.max(CARGA_LIM+2, ...ls.map(c=>n.get(c.id)));
  return `<section class="carga" aria-label="Prazos por pessoa nos próximos 7 dias"><h3 class="carga-t" title="A barra fica vermelha acima de ${CARGA_LIM} prazos">Prazos por pessoa · até ${fmtBarra(fim).slice(0,5)}</h3>${
    ls.map(c=>{ const q = n.get(c.id), alto = q>CARGA_LIM;
      return `<button type="button" class="carga-l${filtroPlanColab===c.id ? " on" : ""}" data-agcol="${c.id}" aria-pressed="${filtroPlanColab===c.id}" title="Ver o Planejado de ${esc(c.nome)}">${avPz(c.id)}<span class="carga-nome">${esc(c.nome.split(" ")[0])}</span><span class="carga-b" aria-hidden="true"><i class="${alto ? "alto" : ""}" style="width:${Math.round(100*q/max)}%"></i><em style="left:${Math.round(100*CARGA_LIM/max)}%"></em></span><span class="carga-q${alto ? " alto" : ""}">${q}<span class="sr-only"> ${q===1 ? "prazo" : "prazos"}</span></span></button>`; }).join("")}</section>`;
}
// 31.10.2026 · O MEU DIA AGRUPADO POR CLIENTE (decisão do Paulo): dentro de cada seção, o que é do
// mesmo cliente fica junto, sob o nome dele, na ordem da primeira data; o cliente de um item só
// continua como linha solta. As linhas não mudam (a caixa, a data e os selos de cada uma ficam)
function porClienteDia(g){
  const grupos = new Map();
  g.forEach((it, i)=>{ const ch = it.cli ? it.cli.id : "_"+i; if(!grupos.has(ch)) grupos.set(ch, []); grupos.get(ch).push(it); });
  // F335 · um de cada vez (pedido do Paulo, 01.11.2026): do cliente fica à vista o próximo (a primeira data; no empate,
  // o prazo fatal), e os demais ficam em "+N", fechado
  const pri = its => its.reduce((a,b)=> b.data<a.data || (b.data===a.data && b.fatal && !a.fatal) ? b : a);
  return [...grupos.values()].map(its=>{ if(its.length<2) return linhaAgenda(its[0]);
    const p = pri(its), resto = its.filter(x=>x!==p);
    return `<div class="ag-grupo-cli"><div class="ag-cli-cab cartao" data-cli="${its[0].cli.id}"><b>${esc(its[0].cli.nome)}</b> <span class="pl-n">${its.length}</span></div>`
      + linhaAgenda(p) + `<details class="ag-mais-cli"><summary title="outros itens deste cliente">+${resto.length}</summary>${resto.map(linhaAgenda).join("")}</details></div>`; }).join("");
}
function avisoSeMeuDia(planej){ return planej ? "" : avisoCRPS(); }
// F295 · o resumo de ontem (Onda D do fluxo do To Do): no último dia útil, quantas anotações eu fiz, em quantos
// clientes, e quem eu despachei, com a data de volta. Recolhido; abre no clique
function ultimoDiaUtil(){ let d = somaDias(hoje(), -1); while(!ehDiaUtil(d)) d = somaDias(d, -1); return d; }
function resumoOntem(quem, dia){
  const ands = (D.and30||[]).filter(a=>a.autor_id===quem && !ORIGENS_ROBO.includes(a.origem) && dataSP(a.criado_em)===dia);
  const cliDe = id => { const k = D.casoPorId.get(id); return k && k.cliente_id; };
  const clis = new Set(ands.map(a=>cliDe(a.caso_id)).filter(Boolean));
  const desp = ativos().filter(k=>{ const d = (k.ronda||{}).despacho; return d && d.por===quem && dataSP(d.em)===dia; });
  return {n: ands.length, clis: clis.size, desp};
}
function blocoOntem(){
  const dia = ultimoDiaUtil(), r = resumoOntem(eu.id, dia);
  if(!r.n && !r.desp.length) return "";
  const rot = dia===somaDias(hoje(), -1) ? "Ontem" : `${SIGLA_DIA[new Date(dia+"T12:00:00").getDay()]}, ${dia.slice(8,10)}/${dia.slice(5,7)}`;
  const partes = [r.n ? `${r.n} ${r.n===1?"anotação":"anotações"} em ${r.clis} ${r.clis===1?"cliente":"clientes"}` : "",
    r.desp.length ? `${r.desp.length} ${r.desp.length===1?"concluído":"concluídos"} por hoje` : ""].filter(Boolean).join(" · ");
  const linha = k => { const c = D.cliPorId.get(k.cliente_id), d = (k.ronda||{}).despacho||{};
    return `<div class="cartao ag-linha"${c?` data-cli="${c.id}"`:""}><span class="ag-slot"></span>
      <span class="ag-data">${d.prazo?`${d.prazo.slice(8,10)}/${d.prazo.slice(5,7)}`:""}</span>
      <div class="ag-txt"><b>${esc(c?c.nome:tituloCaso(k))}</b><span class="ag-res">, volta à fila${d.prazo?` em ${fmt(d.prazo)}`:""}${
        d.para && d.para!==eu.id ? ` com ${esc(((D.colPorId.get(d.para)||{}).nome||"").split(" ")[0])}` : ""}</span></div>
      <span class="ag-selos"><span class="ag-tipo">${esc(k.especie||NOME_FASE[k.fase]||"")}</span></span><span class="acoes">${estrelaDaLinha(k, null, c)}</span></div>`; };
  return `<details class="pl-grupo pl-dobra md-ontem" data-tom="ontem"><summary><h3 class="secao">${rot} <span class="pl-n">${partes}</span></h3></summary>`
    + (r.desp.length ? r.desp.map(linha).join("") : `<p class="meio-sub">Nenhum cliente concluído por hoje nesse dia.</p>`) + `</details>`;
}
