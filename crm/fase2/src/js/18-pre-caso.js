async function arquivarCard(lid, motivo){
  if(!motivo) return;
  if(!await cardGravar(lid, c=>{ c.etapa = "arquivado"; c.motivo = motivo; c.em = hoje(); c.quem = eu.id; }, {ativo:false})) return;
  D.lembretes = (D.lembretes||[]).filter(l=>l.ativo!==false);
  aviso(motivo==="Faleceu" ? "Card arquivado: faleceu — avalie a pensão por morte aos dependentes" : `Card arquivado: ${motivo}`, motivo==="Faleceu");
  montarSidebar(); if(clienteAberto) abrirFicha(clienteAberto); else render();
}
// o atendimento nasce do card: o pré-caso fica ligado a ele e a ficha abre na Identificação, em tela cheia
async function abrirAtendimentoDoCard(cliId, lid){
  const c = D.cliPorId.get(cliId), l = (D.lembretes||[]).find(x=>x.id===lid); if(!c || !l) return;
  if(await abrirCasoDoCard(l)) return;   // F236
  let pc = precasosDe(c).find(p=>p.lembrete_id===lid && !p.so_lembrete);
  if(!pc){
    pc = {id:"pc_"+Date.now().toString(36), especie:especieDoCard(l), natureza:"", marc:{}, honorarios:"", quem:eu.id, em:hoje(), lembrete_id:lid};
    if(!await gravarPrecasos(cliId, [...precasosDe(c), pc])) return;
  }
  await cardGravar(lid, x=>{ x.precaso_id = pc.id; if(!x.etapa || x.etapa==="monitorando" || x.etapa==="pronto") x.etapa = "atendimento"; });
  _atendAberto.add(cliId); abaAtiva = 0; subCad = "identificacao"; guardar("crm_subcad","identificacao");
  repintarFicha();
}
// gera o caso de um card do To Do: escolhe a espécie no catálogo, o pré-caso
// nasce ligado ao card, o caso sai por gerarCasoDoPre e o card se desliga
function gerarCasoDoCard(cliId, lid){
  const c = D.cliPorId.get(cliId), l = (D.lembretes||[]).find(x=>x.id===lid); if(!c || !l) return;
  if(casoDoCard(l)) return abrirCasoDoCard(l);   // F236 · sem isto, cada clique gerava mais um caso
  const pcL = precasosDe(c).find(p=>p.lembrete_id===lid);
  if(pcL && pcL.especie) return levarCardAoCriarCaso(cliId, pcL.id, lid);
  abrirCatalogoEspecies(l.titulo||"aposentadoria futura", {}, async (cod, chave, livre)=>{
    let corpo;
    if(cod){ const nome = (chave && nomeDaSubespecie(chave)) || nomeDaEspecie(cod); corpo = {especie:nome, cod, sub:(chave && chave!==cod) ? chave : null}; }
    else { const nome = String(livre||"").trim(); if(!nome) return aviso("Escreva o nome do pedido"); corpo = {especie:nome, cod:null, sub:null}; }
    fecharCaixa();
    const pc = pcL ? {...pcL, ...corpo} : {id:"pc_"+Date.now().toString(36), ...corpo, natureza:"", marc:{}, honorarios:"", quem:eu.id, em:hoje(), lembrete_id:lid};
    const pcs = pcL ? precasosDe(c).map(p=>p.id===pcL.id ? pc : p) : [...precasosDe(c), pc];
    if(!await gravarPrecasos(cliId, pcs)) return;
    await levarCardAoCriarCaso(cliId, pc.id, lid);
  });
}
// F236 · o card se fecha dentro do gerarCasoDoPre (fecharCardsDoCaso): o pré-caso já é linha de casos, e a conta de
// linhas novas que esta função fazia nunca achava o caso — o card ficava vivo, oferecendo gerar outro
async function gerarCasoDoPreECard(cliId, pcId, lid){
  const c = D.cliPorId.get(cliId), pc = c && precasosDe(c).find(p=>p.id===pcId);
  if(pc && lid && pc.lembrete_id!==lid && !await mudarPreCasoCampos(cliId, pcId, p=>{ p.lembrete_id = lid; })) return;
  return gerarCasoDoPre(cliId, pcId);
}
async function levarCardAoCriarCaso(cliId, pcId, lid){
  const c = D.cliPorId.get(cliId), pc = c && precasosDe(c).find(p=>p.id===pcId);
  if(pc && lid && pc.lembrete_id!==lid && !await mudarPreCasoCampos(cliId, pcId, p=>{ p.lembrete_id = lid; })) return;
  // teste 11.88, TRI-08: o card passa pelo mesmo Criar caso do atendimento (início, número, procuração e contrato),
  // e não mais direto ao gerarCasoDoPre, que fazia o caso nascer sem protocolo e sem as perguntas
  if(!podeAtender()) return aviso("Gerar o caso é do advogado");
  _pcSel.set(cliId, pcId); _atendAberto.add(cliId); abaAtiva = 0;
  if(clienteAberto!==cliId) await abrirFicha(cliId);
  irDesfecho();
}
// o cabeçalho do card na aba Lembretes: etapa, data provável com a fonte, ações e o checklist do To Do
function cabCard(l, c){
  if(!ehCardApos(l)) return "";
  const dd = dataDireitoDoCard(l), et = etapaDoCard(l), crm = cardCrm(l), d = l.detalhes||{}, cl = d.checklist||[];
  const pcLig = crm.precaso_id && precasosDe(c).find(p=>p.id===crm.precaso_id);
  const kCaso = et==="caso" && casoDoCard(l), al = alarmeDireito(l, c), vivo = !["caso","arquivado"].includes(et);
  return `<div class="card-apos-cab" data-lemb="${l.id}">
    ${al ? alarmeCardHtml(l, c, al) : ""}
    <span class="chip card-etapa et-${et}">${esc(rotEtapaCard(et))}</span>
    <span class="card-direito">${dd ? `Direito provável ${dd.data < hoje() ? "desde" : "em"} <b>${fmt(dd.data)}</b> <small>(${esc(dd.fonte)})</small>` : `<b>Sem data provável</b> <small>nem no checklist nem nas anotações</small>`}
      <label class="lembrar-caixa">corrigir <input type="date" value="${esc(dd && dd.crm ? dd.data : "")}" onchange="cardDataDireito('${l.id}',this.value)"></label></span>
    <span class="card-acoes">
      ${kCaso ? `<button class="btn-mini forte" onclick="irAoCaso('${kCaso.id}')" title="o pré-caso deste card virou caso: abre o caso">Abrir<span class="sr-only"> o caso</span></button>` : ""}
      ${vivo && !al ? `<button class="btn-mini${["pronto","documentacao"].includes(et) ? " forte" : ""}" onclick="abrirAtendimentoDoCard('${c.id}','${l.id}')" title="abre o atendimento ligado a este card, na Identificação em tela cheia">${pcLig ? "Continuar o atendimento" : "Abrir atendimento"}</button>` : ""}
      ${vivo && d.origem!=="precaso" ? `<button class="btn-mini" onclick="gerarCasoDoCard('${c.id}','${l.id}')" title="escolhe a espécie no catálogo, cria o caso e desliga este card">Gerar<span class="sr-only"> o caso</span></button>` : ""}
      ${vivo ? `<select class="card-arquivar" aria-label="Arquivar o card" onchange="if(this.value){arquivarCard('${l.id}',this.value)}"><option value="">Arquivar…</option>${APOS_MOTIVOS.map(m=>`<option>${m}</option>`).join("")}</select>` : ""}
    </span>
    ${cl.length ? `<ul class="card-check">${cl.map(i=>`<li class="${i.feito?"feito":""}">${i.feito?"☑":"☐"} ${esc(i.texto)}</li>`).join("")}</ul>` : ""}
  </div>`;
}
// a lista lateral "Aposentadorias futuras": os cards ativos por horizonte do lembrete e por etapa
let _cardsFiltro = null;   // F236 · sem escolha, abre nos vencidos quando há (senão, até 90 dias)
function cartaoApos(l){
  const c = D.cliPorId.get(l.cliente_id); if(!c) return "";
  const dd = dataDireitoDoCard(l), venc = l.proximo_em && l.proximo_em < hoje();
  return `<div class="cartao card-apos" data-lemb="${l.id}" onclick="abrirCardApos('${c.id}')">
    <span class="check" style="border-color:var(--verde)"></span>
    <div class="info"><div class="nome">${esc(c.nome)}</div>
      <div class="meta"><span class="chip fase">${esc(l.titulo||"Aposentadoria futura")}</span>
        <span>${dd ? `direito ${dd.data < hoje() ? "desde" : "em"} <b>${fmt(dd.data)}</b>` : "sem data provável"}</span>
        <span class="chip ${venc?"urg":"neutro"}">${l.proximo_em ? (venc ? "⏰ venceu " : "lembrete ") + fmt(l.proximo_em) : "sem lembrete"}</span>
        ${(al=>al ? `<span class="chip urg" title="a aposentadoria começa no dia do pedido (Lei 8.213/91, art. 49)">⏰ direito há ${plu(al.dias, "dia", "dias")} · protocolar já</span>` : "")(alarmeDireito(l, c))}</div></div></div>`;   // F236
}
async function abrirCardApos(cliId){ await abrirFicha(cliId); abaAtiva = 9; repintarFicha(); }
function renderCardsApos(){
  tituloLista("🙏 Aposentadorias futuras");
  const todos = cardsApos(), hs = [["vencido","Vencidos"],["90","Até 90 dias"],["ano","Até um ano"],["depois","Depois"],["sem","Sem data"],["todos","Todos"]];
  const n = Object.fromEntries(hs.map(([h])=>[h, h==="todos" ? todos.length : todos.filter(l=>horizonteDoCard(l)===h).length]));
  const sel = _cardsFiltro || (n.vencido ? "vencido" : "90"), lista = (sel==="todos" ? todos : todos.filter(l=>horizonteDoCard(l)===sel)).slice().sort((a, b)=>String(a.proximo_em||"9999").localeCompare(String(b.proximo_em||"9999")));
  document.getElementById("sub-lista").textContent = `${todos.length} cards ativos, mantidos pela sincronização com o To Do; o card abre a ficha no Cadastro, com o quadro Aposentadoria`;
  const porEtapa = APOS_ETAPAS.map(([e, rot])=>[e, rot, lista.filter(l=>etapaDoCard(l)===e)]).filter(x=>x[2].length);
  document.getElementById("conteudo-meio").innerHTML = `<div class="filtros">${hs.map(([h, rot])=>`<button class="fchip${sel===h?" on":""}" data-horiz="${h}" onclick="_cardsFiltro='${h}';render()">${rot} (${n[h]})</button>`).join("")}</div>`
    + (porEtapa.map(([e, rot, ls])=>`<h3 class="secao">${esc(rot)} (${ls.length})</h3>${ls.map(cartaoApos).join("")}`).join("") || "<p class='meio-sub'>Nenhum card neste horizonte.</p>");
}
function painelLembretes(c, naJanela){
  const ls = lembretesDo(c.id).sort((a,b)=>(a.proximo_em||"9999")<(b.proximo_em||"9999")?-1:1);
  const apos = aposDoCliente(c);
  // F30 · atendimento resolvido em LEMBRETE: as anotações vêm morar aqui —
  // a mesa do atendimento se recolheu, mas o que foi conversado não some
  const pcsL = precasosDe(c);
  const notasAt = ((c.campos||{}).atendimento||[]);
  const notasAqui = (!pcsL.some(p=>!p.so_lembrete) && pcsL.some(p=>p.so_lembrete)) ? notasAt : [];
  const linha = l=>{
    const resp = D.colPorId.get(l.responsavel_id);
    const venc = l.proximo_em && l.proximo_em<=hoje();
    const avisos=(l.lembrete_avisos||[]).slice().sort((a,b)=>a.em<b.em?1:-1);
    const ult=avisos[0], uco=ult&&D.colPorId.get(ult.colaborador_id);
    const d=l.detalhes||{};
    return `<div class="caso" style="${venc?"border-left:3px solid #E9B44C":""}">
      <div class="cab">
        <span class="titulo-caso">${rotuloTipoLembrete(l.tipo).slice(0,2)} ${esc(l.titulo)}</span>
        <span class="chip neutro">${l.intervalo_meses?`🔁 ${l.intervalo_meses===1?"todo mês":`a cada ${l.intervalo_meses} meses`}`:"aviso único"}</span>
        ${(l.detalhes||{}).origem==="precaso"?`<button class="btn-mini"
          title="a regra da volta: o pré-caso retorna à mesa do atendimento e este lembrete se desativa"
          onclick="voltarLembreteParaMesa('${c.id}','${esc((l.detalhes||{}).precaso_id||"")}')"><span aria-hidden="true">↺ Voltar</span><span class="sr-only">↺ voltar ao atendimento</span></button>
        <button class="btn-mini"
          title="o cliente resolveu assinar? Gera o caso direto daqui: o pré-caso vira caso, este lembrete se desativa e a ficha abre nos documentos para imprimir"
          onclick="gerarCasoDoLembrete('${c.id}','${esc((l.detalhes||{}).precaso_id||"")}')">Gerar<span class="sr-only"> o caso</span></button>`:""}
        <span class="chip ${venc?"urg":"neutro"}">${l.proximo_em?(venc?"⏰ venceu em ":"próximo: ")+fmt(l.proximo_em):"sem data"}</span>
        ${resp?`<span class="avatar mini" style="background:${resp.cor}" title="responsável: ${esc(resp.nome)}">${esc(resp.inicial)}</span>`:""}
      </div>
      ${cabCard(l, c)}
      ${l.tipo==="contribuicao"&&(d.codigo||d.valor)?`<div class="meio-sub" style="margin-top:3px">GPS ${d.codigo?`código ${esc(d.codigo)}`:""}${d.valor?` · R$ ${esc(String(d.valor))}`:""} · vence dia ${esc(String(d.dia||15))}</div>`:""}
      <div class="form-linha" style="margin-top:6px;align-items:center">
        <button class="btn-mini" onclick="lembreteAvisado('${l.id}','manual')"
          title="${l.intervalo_meses?`registra o aviso e rearma para daqui a ${l.intervalo_meses} mês(es)`:"registra e desliga (aviso único)"}"><span aria-hidden="true">✔ Avisado</span><span class="sr-only">✔ avisado hoje</span></button>
        ${c.telefone?`<button class="btn-mini" onclick="zapAvisoLembrete('${l.id}')" title="abre o WhatsApp com a mensagem pronta e registra o aviso">${iconeFonte("zap")}</button>`:""}
        <button class="btn-mini" onclick="copiar(${esc(JSON.stringify(msgLembrete(l,c)))},'Mensagem copiada 💬')" title="📋 copiar msg"><span aria-hidden="true">📋 Copiar</span><span class="sr-only">📋 copiar msg</span></button>
        <span class="lembrar-caixa">🗓 adiar para <input type="date" min="${hoje()}" onchange="adiarLembrete('${l.id}',this.value)"></span>
        <button class="btn-mini" style="margin-left:auto" onclick="desligarLembrete('${l.id}')"
          title="desliga sem apagar — o histórico de avisos fica guardado">✕ desligar</button>
      </div>
      ${avisos.length?`<div class="meio-sub" style="margin-top:4px">último aviso: ${fmtTS(ult.em)}${uco?` por ${esc(uco.nome.split(" ")[0])}`:""}${ult.canal==="zap"?" (WhatsApp)":""} · ${avisos.length} aviso(s) registrados</div>`:""}
      ${/* anotações trazidas do To Do (🙏 Aposentadorias Futuras não vira
           caso — 08.90): ficam aqui para leitura, e a análise manual decide
           o que é andamento de verdade e transfere para um caso */""}
      ${(d.anotacoes||[]).length?`<div style="margin-top:6px;border-top:1px dashed var(--borda);padding-top:6px">
        <div class="meio-sub" style="margin-bottom:3px">🗒 anotações do To Do — o que for andamento de verdade, transfira para um caso:</div>
        <ul class="mov-lista">
          ${(d.anotacoes||[]).map((a,i)=>`<li>
            <span class="mov-data">${a.data?fmt(a.data):"—"}</span>
            <span class="mov-txt">${a.inicial&&a.inicial!=="?"?`<b>${esc(a.inicial)}:</b> `:""}${esc(a.texto||"")}</span>
            ${a.caso_id?`<span class="chip neutro" title="esta anotação já foi copiada para os andamentos">✔ no caso</span>`
              :`<button class="btn-mini" onclick="anotacaoViraAndamento('${l.id}',${i})"
                  title="copia esta anotação para a linha do tempo de um caso do cliente (com a data original)">→ andamento</button>`}
          </li>`).join("")}
        </ul></div>`:""}
    </div>`;
  };
  // o quadro da aposentadoria provável vive AQUI (08.98): é aviso de data que
  // chega, e o lugar de aviso é esta aba — não o cadastro
  // ordem pedida pelo Paulo: aposentadoria provável no topo, os lembretes,
  // um botão só para criar, e as contas no pé. A aba é sobre DATA QUE CHEGA, e
  // tudo o que não é data que chega ficou de fora para a página não pesar.
  // F278 · na janela do quadro Aposentadoria, a aposentadoria provável já está no quadro e as anotações no alto da janela
  return `${naJanela ? "" : `<div class="apos-faixa" style="justify-content:flex-start">${caixaApos(c)}${caixaDossie(c)}</div>`}
    ${notasAqui.length && !naJanela?`<div class="caso" style="border-left:3px solid var(--verde)">
      <div class="rotulo-caso">Anotações do atendimento que virou lembrete</div>
      <ul class="mov-lista" style="margin-top:4px">${notasAqui.slice().reverse().map(n=>`<li>
        <span class="mov-data">${n.em?fmt(n.em.slice(0,10)):"—"}</span>
        <span class="mov-txt">${n.importante?"⭐ ":""}${n.urgente?"🔥 ":""}${
          n.quem?`<b>${esc(n.quem)}:</b> `:""}${esc(n.texto||"")}</span></li>`).join("")}
      </ul></div>`:""}
    ${ls.map(linha).join("") || `<p class="meio-sub">Nenhum lembrete ativo. É o lugar do
      "avisar de tempos em tempos": contribuição do INSS, cadastro para renovar, retomar contato.</p>`}
    ${/* o formulário era uma parede de seis campos, sempre aberta, entre os
         lembretes e o resto. Agora é um botão; as opções são as mesmas. */""}
    <details class="lb-novo">
      <summary>＋ novo lembrete</summary>
      <div class="form-linha" style="margin-top:6px">
        <select id="lb-tipo" onchange="document.getElementById('lb-gps').style.display=this.value==='contribuicao'?'flex':'none';
          var t=document.getElementById('lb-titulo'); if(!t.value||t.dataset.auto){t.value=this.options[this.selectedIndex].text.replace(/^\\S+\\s/,'');t.dataset.auto=1;}">
          ${LEMBRETE_TIPOS.map(([v,r])=>`<option value="${v}">${r}</option>`).join("")}
        </select>
        <input id="lb-titulo" placeholder="título — ex.: Contribuição trimestral" style="flex:1;min-width:180px"
          value="${esc(LEMBRETE_TIPOS[0][1].replace(/^\S+\s/,""))}" data-auto="1">
        <select id="lb-int" title="repetição">
          <option value="">aviso único</option><option value="1">todo mês</option>
          <option value="2">a cada 2 meses</option><option value="3" selected>a cada 3 meses</option>
          <option value="6">a cada 6 meses</option><option value="12">uma vez por ano</option>
        </select>
        <input type="date" id="lb-prox" value="${hoje()}" title="primeiro aviso em">
        <select id="lb-resp"><option value="">responsável…</option>
          ${equipeAtiva().map(x=>`<option value="${x.id}">${esc(x.nome)}</option>`).join("")}</select>
      </div>
      <div class="form-linha" id="lb-gps" style="display:flex">
        <select id="lb-cod"><option value="">categoria da GPS…</option>
          ${GPS_CATEGORIAS.map(([v,r])=>`<option value="${v}">${v} — ${r}</option>`).join("")}</select>
        <input id="lb-valor" type="number" step="0.01" placeholder="R$ valor" style="width:110px">
        <input id="lb-dia" type="number" min="1" max="28" value="15" title="dia do vencimento" style="width:80px">
        <span class="meio-sub">entram na mensagem pronta de WhatsApp</span>
      </div>
      <div class="form-linha"><button onclick="criarLembrete('${c.id}')" title="🔔 Criar lembrete"><span aria-hidden="true">🔔 Lembrete</span><span class="sr-only">🔔 Criar lembrete</span></button></div>
    </details>
    ${blocoContas(c)}`;
}
async function criarLembrete(cliId){
  const v=id=>{const e=document.getElementById(id);return e?e.value.trim():"";};
  const tipo=v("lb-tipo")||"geral", titulo=v("lb-titulo");
  if(!titulo) return aviso("Dê um título ao lembrete");
  const detalhes = tipo==="contribuicao"
    ? {codigo:v("lb-cod")||null, valor:v("lb-valor")||null, dia:v("lb-dia")||null} : {};
  try{
    const [l]=await api(`/rest/v1/lembretes`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({cliente_id:cliId, tipo, titulo, detalhes,
        intervalo_meses:v("lb-int")?+v("lb-int"):null, proximo_em:v("lb-prox")||hoje(),
        responsavel_id:v("lb-resp")||null, criado_por:eu.id})});
    if(l) (D.lembretes=D.lembretes||[]).push(l);
  }catch(e){ return aviso("Rode o crm/fase2/schema_por_em_dia.sql no Supabase — falta a tabela 'lembretes'"); }
  aviso("🔔 Lembrete criado", false);
  montarSidebar(); abrirFicha(cliId);
}
async function lembreteAvisado(id, canal){
  const l=(D.lembretes||[]).find(x=>x.id===id); if(!l) return;
  try{
    await api(`/rest/v1/lembrete_avisos`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({lembrete_id:id, colaborador_id:eu.id, canal:canal||"manual"})});
    const corpo = l.intervalo_meses ? {proximo_em:somaMeses(hoje(), l.intervalo_meses)} : {ativo:false};
    await api(`/rest/v1/lembretes?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify(corpo)});
    Object.assign(l, corpo);
    (l.lembrete_avisos=l.lembrete_avisos||[]).push({colaborador_id:eu.id, em:new Date().toISOString(), canal:canal||"manual"});
  }catch(e){ return aviso("Rode o crm/fase2/schema_por_em_dia.sql no Supabase — falta a tabela 'lembretes'"); }
  aviso(l.ativo===false?"✔ Registrado — era aviso único, desligado"
                       :`✔ Registrado — volta em ${fmt(l.proximo_em)}`, false);
  montarSidebar(); if(clienteAberto) abrirFicha(clienteAberto); else render();
}
function zapAvisoLembrete(id){
  const l=(D.lembretes||[]).find(x=>x.id===id); if(!l) return;
  const c=D.cliPorId.get(l.cliente_id); if(!c||!c.telefone) return;
  window.open(`https://wa.me/55${c.telefone.replace(/\D/g,"")}?text=${encodeURIComponent(msgLembrete(l,c))}`,"_blank");
  lembreteAvisado(id,"zap");
}
async function adiarLembrete(id, data){
  if(!data) return;
  const l=(D.lembretes||[]).find(x=>x.id===id); if(!l) return;
  // F236 · com o direito alcançado, adiar o card é adiar o pedido: a aposentadoria só começa nele (Lei 8.213/91, art. 49)
  const al = alarmeDireito(l, D.cliPorId.get(l.cliente_id)||{});
  if(al && !await confirmar(`O direito já foi alcançado em ${fmtBarra(al.desde)}. A aposentadoria só começa no dia do pedido (Lei 8.213/91, art. 49): adiar para ${fmtBarra(data)} custa cerca de ${moedaBR(al.porDia*Math.max(1, diasAte(data)))}.\n\nAdiar mesmo assim?`)) return repintarFicha();
  await api(`/rest/v1/lembretes?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({proximo_em:data})});
  l.proximo_em=data;
  aviso(`🗓 Adiado para ${fmt(data)}`, false);
  montarSidebar(); if(clienteAberto) abrirFicha(clienteAberto); else render();
}
async function desligarLembrete(id){
  const l=(D.lembretes||[]).find(x=>x.id===id); if(!l) return;
  if(!await confirmar(`Desligar o lembrete "${l.titulo}"? O histórico de avisos fica guardado.`)) return;
  await api(`/rest/v1/lembretes?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({ativo:false})});
  l.ativo=false;
  aviso("Lembrete desligado", false);
  montarSidebar(); if(clienteAberto) abrirFicha(clienteAberto); else render();
}
// ── anotação do To Do (🙏 Aposentadorias Futuras) -> andamento de um caso ──
// A análise é MANUAL de propósito: a anotação fica no lembrete até alguém
// decidir que é andamento de verdade. A cópia vai com a DATA ORIGINAL
// (criado_em = o dia da anotação), então entra no lugar certo da linha do
// tempo e não passa pelas Novidades. A anotação fica marcada (✔ no caso)
// para ninguém transferir duas vezes.
function anotacaoViraAndamento(lembId, i){
  const l=(D.lembretes||[]).find(x=>x.id===lembId); if(!l) return;
  const a=((l.detalhes||{}).anotacoes||[])[i]; if(!a||a.caso_id) return;
  const ks=(D.casosDoCliente.get(l.cliente_id)||[]).filter(k=>k.fase!=="encerrado");
  if(!ks.length) return aviso("Este cliente não tem caso aberto — crie o caso primeiro (aba ＋ da ficha) e transfira depois.");
  if(ks.length===1) return salvarAnotacaoNoCaso(lembId, i, ks[0].id);
  caixa(`<h3 style="margin:0 0 4px">→ Transferir para qual caso?</h3>
    <p class="meio-sub" style="margin:0 0 8px">“${esc(String(a.texto||"").slice(0,120))}${String(a.texto||"").length>120?"…":""}”</p>
    ${ks.map(k=>`<button class="btn-rap" style="display:block;width:100%;text-align:left;margin-top:6px"
      onclick="salvarAnotacaoNoCaso('${lembId}',${i},'${k.id}')">⚖️ ${esc(tituloCaso(k))} <small class="meio-sub">· ${esc(NOME_FASE[k.fase]||k.fase)}</small></button>`).join("")}`);
}
async function salvarAnotacaoNoCaso(lembId, i, casoId){
  fecharCaixa();
  const l=(D.lembretes||[]).find(x=>x.id===lembId); if(!l) return;
  const det={...(l.detalhes||{})}, anots=(det.anotacoes||[]).slice();
  const a=anots[i]; if(!a||a.caso_id) return;
  const texto=(a.inicial&&a.inicial!=="?"?a.inicial+": ":"")+(a.texto||"");
  try{
    await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({caso_id:casoId, autor_id:eu.id, origem:"app", publico:false,
        criado_em:(a.data||hoje())+"T12:00:00-03:00", texto})});
    anots[i]={...a, caso_id:casoId};
    det.anotacoes=anots;
    await api(`/rest/v1/lembretes?id=eq.${lembId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({detalhes:det})});
    l.detalhes=det;
  }catch(e){ return aviso("Não consegui transferir — tente de novo."); }
  aviso("✔ Anotação copiada para os andamentos do caso", false);
  if(clienteAberto) abrirFicha(clienteAberto);
}
// no Meu Dia: os lembretes que venceram, prontos para despachar dali mesmo.
// F123 · devolve só as LINHAS: elas entram na lista única do que vence hoje,
// junto do prazo fatal e do compromisso, em vez de morarem em seção à parte.
// [BUG 20.09.2026] o mesmo do aviso de aposentadoria: lembrete atrasado não é
// lembrete de hoje. Sai separado, e o atrasado fica no 🔴 vencidas.
function itensLembretes(){
  const venc=(D.lembretes||[]).filter(l=>l.ativo!==false && l.proximo_em && l.proximo_em<=hoje())
    .sort((a,b)=>a.proximo_em<b.proximo_em?-1:1);
  return { hoje: venc.filter(l=>l.proximo_em===hoje()).map(cartaoLembrete),
           antes: venc.filter(l=>l.proximo_em<hoje()).map(cartaoLembrete) };
}
// o cartão do lembrete, um só para o Meu Dia e para o Planejado
function cartaoLembrete(l){
    const c=D.cliPorId.get(l.cliente_id)||{};
    return `<div class="cartao" data-cli="${c.id||""}">
      <div class="info"><div class="nome">${esc(c.nome||"cliente sem ficha")}</div>
        <div class="meta"><span class="chip fase">${rotuloTipoLembrete(l.tipo)}</span>
          <span>${esc(l.titulo)}</span></div></div>
      <button class="btn-mini" style="flex:none" onclick="event.stopPropagation();lembreteAvisado('${l.id}','manual')"
        title="${l.intervalo_meses?`registra e rearma para daqui a ${l.intervalo_meses} mês(es)`:"registra e desliga (aviso único)"}">✔ avisado${l.intervalo_meses?` · ${l.intervalo_meses}m`:""}</button>
      ${c.telefone?`<button class="btn-mini" style="flex:none" title="WhatsApp com a mensagem pronta"
        onclick="event.stopPropagation();zapAvisoLembrete('${l.id}')">📲</button>`:""}
      <span class="lembrar-caixa" onclick="event.stopPropagation()" title="adiar">🗓
        <input type="date" min="${hoje()}" value="${l.proximo_em||""}"
          onchange="adiarLembrete('${l.id}',this.value)"></span>
    </div>`;
}
// migração combinada com o Paulo: os casos de 🙏 Aposentadorias Futuras que
// eram "avisar de tempos em tempos" viram lembrete — um clique por caso,
// nada automático. Cria o lembrete, encerra o caso de origem e registra.
async function casoViraLembrete(casoId){
  const k=D.casoPorId.get(casoId); if(!k) return;
  const c=D.cliPorId.get(k.cliente_id)||{};
  if(!await confirmar(`Transformar "${tituloCaso(k)}" em 🔔 lembrete de ${c.nome||"cliente"}?\n\nO lembrete nasce na aba 🙏 Aposentadorias futuras (a cada 6 meses — dá para ajustar lá) e este caso é encerrado.`)) return;
  try{
    const [l]=await api(`/rest/v1/lembretes`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({cliente_id:k.cliente_id, tipo:"geral", titulo:tituloCaso(k),
        intervalo_meses:6, proximo_em:k.prazo||somaMeses(hoje(),6),
        origem_caso:k.id, criado_por:eu.id})});
    if(l) (D.lembretes=D.lembretes||[]).push(l);
  }catch(e){ return aviso("Rode o crm/fase2/schema_por_em_dia.sql no Supabase — falta a tabela 'lembretes'"); }
  k.fase="encerrado"; k.encerrado_em=new Date().toISOString(); k.encerrado_por=eu.id;
  const corpo={fase:"encerrado", encerrado_em:k.encerrado_em, encerrado_por:eu.id};
  try{
    await patchCaso(k.id, corpo);
  }catch(e){
    delete corpo.encerrado_por; k.encerrado_por=null;
    await patchCaso(k.id, corpo);
  }
  await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({caso_id:k.id, autor_id:eu.id,
      texto:"Caso transformado em 🔔 lembrete do cliente — o acompanhamento periódico segue na aba Aposentadorias futuras."})}).catch(()=>{});
  aviso("🔔 Virou lembrete — o caso foi encerrado");
  abaAtiva=0; montarSidebar(); abrirFicha(k.cliente_id);
}

// F23 · aposentado + caso de aposentadoria programável = provável REVISÃO,
// não concessão. Sem este aviso o colaborador olha "Apos. Tempo de
// Contribuição" e imagina ato de concessão — e a peça sai errada. Derivado
// (não gravado): desmarcado o "já se aposentou", o aviso morre sozinho.
function provavelRevisao(k, c){
  if(!k || !c) return false;
  if(!(c.aposentado===1 || c.aposentado===true)) return false;
  const b = dsa(k.beneficio||"");
  if(!b) return false;
  if(/revis|recalcul|acerto|cnis|pens[aã]o|reclus|matern|bpc|loas|auxil|incapac|acidente/.test(b)) return false;
  return /apos|tempo de contribui|por idade|especial|professor|defici/.test(b);
}
function chipRevisao(k, c){
  return provavelRevisao(k, c)
    ? `<span class="chip laranja" title="o cliente está marcado como já aposentado: um caso de aposentadoria aqui tende a ser REVISÃO do benefício que ele já recebe, não concessão nova — confira antes de redigir">⚠ provável revisão, não concessão</span>`
    : "";
}
// ══════════════════════════════════════════════════════════════════════════
// ⚖️ F48 · ANÁLISE DE DIREITO — a memória dos atendimentos
// ══════════════════════════════════════════════════════════════════════════
// O cliente lembra da conversa de 2020; o escritório, com centenas de
// atendimentos, não. Cada análise registra QUANDO foi feita (pode ser
// retroativa), o que foi visto/combinado e os CENÁRIOS calculados na época:
// regra, data prevista de aposentadoria e valor estimado. O melhor caminho
// leva ⭐; data que já chegou fica verde ("✓ direito alcançado").
// Integrações deliberadas, nada duplicado: o aviso de época reusa a tabela
// aposentadorias + avisoApos (o 🎂 que entra no Meu Dia 3 meses antes); as
// anotações antigas do To Do (lista 🙏, espelhadas nos lembretes) aparecem
// aqui com "→ virar análise"; e toda análise nova grava um comentário nos
// andamentos de TODOS os casos ativos do cliente (pedido do Paulo).
const REGRAS_DIREITO = ["Pontos","Pedágio 50%","Pedágio 100%","Idade progressiva",
  "Idade urbana","Idade rural","Idade híbrida","Especial","PCD (LC 142)","Professor",
  "Direito adquirido (pré-EC 103)","Incapacidade","BPC/LOAS","Revisão"];
function analisesDe(cliId){ return (D.analisesPorCliente&&D.analisesPorCliente.get(cliId))||[]; }
// F231 · no atendimento, as análises do pré-caso escolhido: a que ele ligou nas etapas,
// a que traz detalhes.precaso_id e, sendo ele o único vivo, a registrada desde que nasceu
// sem pré-caso marcado. Fora do atendimento, e no pré-caso sem linha, as do cliente.
function analisesDaVez(c){
  const as = analisesDe(c.id), pc = _atendAberto.has(c.id) && preCasoAberto(c);
  if(!pc || !pc.caso_id) return as;
  const aid = ((pc.etapas||{}).analise||{}).analise_id, so = preCasosVivos(c).length===1, desde = String(pc.em||"").slice(0,10);
  return as.filter(a=>{ const p = (a.detalhes||{}).precaso_id; return p===pc.id || a.id===aid || (!p && so && (a.data_analise||"") >= desde); });
}
function moedaBR(v){ const n=Number(v);
  return (v!==""&&v!=null&&isFinite(n)) ? n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}) : ""; }
function cenMelhor(a){ const cs=a.cenarios||[];
  return cs.find(x=>x.melhor) || cs.filter(x=>x.data).sort((x,y)=>x.data<y.data?-1:1)[0] || cs[0] || null; }
function mesesAte(iso){ const h=hoje();
  return (+iso.slice(0,4)-+h.slice(0,4))*12 + (+iso.slice(5,7)-+h.slice(5,7)); }
// quem JÁ pode aposentar segundo a análise mais recente e ainda não aposentou
// — é o número da barra lateral, porque é o que exige ação
// F236 · o caso de aposentadoria com DER desde a data do direito: o pedido já foi feito
const pedidoApos = (cliId, dDir) => (D.casosDoCliente.get(cliId)||[]).find(k=>!k.pre_caso && k.fase!=="encerrado" && k.der && k.der>=dDir
  && (ESP_APOS.test(k.especie||"") || /^apos/i.test(k.beneficio||""))) || null;
const dataDoDireitoDe = a => ((a||{}).cenarios||[]).filter(x=>x.data && x.data<=hoje()).map(x=>x.data).sort()[0] || null;
function direitoAlcancado(){
  const r=[];
  for(const [cliId, as] of (D.analisesPorCliente||new Map())){
    const c=D.cliPorId.get(cliId);
    if(!c || c.aposentado===true) continue;
    // F236 · quem já pediu (caso de aposentadoria com DER desde o direito) não espera comunicação: sai da lista e do contador
    const dDir = dataDoDireitoDe(as[0]);
    if(dDir && !pedidoApos(cliId, dDir)) r.push({cliente:c, analise:as[0]});
  }
  return r;
}
function cartaoCenario(cn, cliId){
  const passou = cn.data && cn.data<=hoje();
  const m = cn.data ? mesesAte(cn.data) : null;
  return `<div class="ad-cen ${cn.melhor?"ad-melhor":""} ${passou?"ad-ok":""}">
    <div class="ad-cen-topo">${cn.melhor?"⭐ ":""}${esc(cn.regra||"—")}</div>
    ${cn.data?`<div class="ad-cen-data">${fmt(cn.data)}</div>
      <div class="ad-cen-quando">${passou?"✓ direito alcançado":m<=0?"é agora":m===1?"falta 1 mês":`faltam ${m} meses`}</div>`
      :`<div class="ad-cen-quando">sem data projetada</div>`}
    ${cn.valor?`<div class="ad-cen-valor">${moedaBR(cn.valor)}</div>`:""}
    ${cn.obs?`<div class="meio-sub" style="margin-top:3px">${esc(cn.obs)}</div>`:""}
    ${cn.data && !passou ? `<button class="btn-mini" style="margin-top:5px"
      title="cria o aviso 🎂 (entra no Meu Dia ${MESES_AVISO} meses antes da data) para comunicar o cliente"
      onclick="avisarCenario('${cliId}','${cn.data}','${escJs(cn.regra||"")}')"><span aria-hidden="true">🎂 Avisar</span><span class="sr-only">🎂 avisar na época</span></button>`:""}
  </div>`;
}
function resumoAnalise(a, c){
  const idade=idadeEm(c.dn, a.data_analise);
  const cab=`⚖️ Análise de Direito — ${c.nome}${idade!=null?` (${idade} anos na data da análise)`:""}, feita em ${fmt(a.data_analise)}`
    +((co=>co?` por ${co.nome}`:"")(D.colPorId.get(a.autor_id)));
  const cens=(a.cenarios||[]).map(x=>`• ${x.regra||"—"}${x.data?`: ${x.data<=hoje()?"direito desde":"aposenta em"} ${fmt(x.data)}`:""}${x.valor?` — ${moedaBR(x.valor)}`:""}${x.melhor?" ⭐":""}${x.obs?` (${x.obs})`:""}`);
  return [cab, ...(a.contexto?[a.contexto]:[]), ...cens].join("\n");
}
function copiarAnalise(id){
  const a=(D.analises||[]).find(x=>x.id===id); if(!a) return;
  const c=D.cliPorId.get(a.cliente_id)||{};
  copiar(resumoAnalise(a,c), "Análise copiada 📋 — cole no WhatsApp ou na petição");
}
function cartaoAnalise(a){
  const co=D.colPorId.get(a.autor_id), cs=a.cenarios||[];
  // F128 · a idade do segurado NA DATA da análise abre o cartão
  const cli=D.cliPorId.get(a.cliente_id)||{};
  const idade=idadeEm(cli.dn, a.data_analise);
  return `<div class="caso ad-analise">
    <div class="ad-lado">
      <div class="ad-ano">${(a.data_analise||"").slice(0,4)}</div>
      <div class="ad-dia">${fmt(a.data_analise)}</div>
      ${co?`<span class="avatar mini" style="background:${co.cor}" title="${esc(co.nome)}">${esc(co.inicial)}</span>`:""}
      ${a.fonte==="previus"?`<span class="chip neutro" title="cenários vindos de cálculo do Prévius">Prévius</span>`
        :a.fonte==="todo"?`<span class="chip neutro" title="nasceu de anotação antiga do To Do">To Do</span>`:""}
    </div>
    <div class="ad-corpo">
      <div class="ad-idade">${idade==null?"Idade na data da análise: sem data de nascimento na ficha":`Idade na data da análise: <b>${idade} anos</b>`}</div>
      ${a.contexto?`<div class="ad-contexto">${esc(a.contexto)}</div>`:""}
      ${cs.length?`<div class="ad-cens">${cs.map(x=>cartaoCenario(x, a.cliente_id)).join("")}</div>`:""}
      <div class="form-linha" style="margin-top:6px">
        <button class="btn-mini" onclick="copiarAnalise('${a.id}')">📋 copiar</button>
        <button class="btn-mini" style="margin-left:auto" onclick="apagarAnalise('${a.id}')"
          title="apaga a análise (os comentários já gravados nos casos ficam)">🗑</button>
      </div>
    </div>
  </div>`;
}
// formulário — adPre carrega a anotação do To Do que está virando análise
let adPre=null;
function linhaCenario(cn){
  return `<div class="ad-row form-linha">
    <input class="ad-regra" list="lista-regras" placeholder="regra — ex.: Pontos" style="flex:1;min-width:140px" value="${esc(cn&&cn.regra||"")}">
    <input class="ad-data" type="date" title="data prevista da aposentadoria" value="${cn&&cn.data||""}">
    <input class="ad-valor" type="number" step="0.01" min="0" placeholder="R$ valor" style="width:110px" value="${cn&&cn.valor||""}">
    <input class="ad-obs" placeholder="observação — ex.: falta averbar o rural" style="flex:1.4;min-width:150px" value="${esc(cn&&cn.obs||"")}">
    <label class="meio-sub" style="cursor:pointer" title="o melhor caminho — sai destacado no cartão"><input type="radio" name="ad-melhor" ${cn&&cn.melhor?"checked":""}> melhor</label>
    <button class="btn-mini" onclick="this.closest('.ad-row').remove()" title="tirar este cenário">${CAD_IC.fechar}</button>
  </div>`;
}
// F174 · os campos da análise dependem do SERVIÇO (espécie/subespécie). O
// mapa é pequeno de propósito: comum a todos, mais o que PCD, especial e
// rural acrescentam. Para crescer, some uma regra aqui.
const AD_ROT = {tempo:"Tempo de contribuição", carencia:"Carência", valor:"Valor do benefício",
  data_direito:"Atinge o direito em", recolhe:"Como recolhe hoje", ultima_contribuicao:"Última contribuição",
  did:"DID", grau:"Grau da deficiência", periodos_especiais:"Períodos especiais", periodos_rurais:"Períodos rurais"};
const AD_RECOLHE = [["empregado","Empregado"],["facultativo","Facultativo"],["ci","Contribuinte individual"],
  ["mei","MEI"],["desempregado","Desempregado"],["outro","Outro"]];
const rotRecolhe = v => (AD_RECOLHE.find(([k])=>k===v)||[,v||""])[1];
// F194 · A ANÁLISE PEDE POUCO, E O CERTO (pedido do Paulo, 11.10.2026): por
// espécie, só o que muda o direito ou o valor. O benefício por incapacidade
// não pede tempo nem data do direito; o acidentário e o auxílio-acidente não
// pedem carência (art. 26, I e II, da Lei 8.213/91); o BPC não pede valor. O
// resto do formulário fica a um clique, em "mostrar os outros campos".
const AD_CAMPOS_ESPECIE = {
  B31:["carencia","valor","recolhe"], B32:["tempo","carencia","valor","recolhe"], B91:["valor","recolhe"], B92:["valor","recolhe"],
  B36:["valor","recolhe"], B94:["valor","recolhe"], B21:["valor"], B93:["valor"], B25:["carencia","valor"], B26:["carencia","valor"],
  B80:["carencia","valor","recolhe"], B87:["recolhe"], B88:["recolhe"],
};
function camposDoServico(sv){
  const s=sv||{}, sub=s.sub||"", t=`${sub} ${s.nome||""}`;
  const pcd = /\.PCD/.test(sub) || /deficiência/i.test(t);
  const esp = s.cod==="B46" || /\.ESP/.test(sub) || /especia/i.test(t);
  const rur = /\.RUR/.test(sub) || /rura/i.test(t);
  const proprio = AD_CAMPOS_ESPECIE[s.cod];
  return [...(proprio || ["tempo","carencia","valor","data_direito","recolhe"]),
    ...(pcd?["did","grau"]:[]), ...(!proprio && (pcd||esp)?["periodos_especiais"]:[]), ...(rur?["periodos_rurais"]:[])];
}
// facultativo e contribuinte individual (o MEI é CI) podem planejar meses sem recolher
const recolheLivre = r => ["facultativo","ci","mei"].includes(r);
// como recolhe hoje: o que a análise registrou; sem ela, o vínculo da triagem
function recolheDe(c, a){
  const d=(a&&a.detalhes)||{};
  if(d.recolhe) return {tipo:d.recolhe, de:"analise"};
  const v=(triagemDe(c).vinculo||{}).tipo;
  const m={empregado:"empregado", ci:"ci", facultativo:"facultativo", sem:"desempregado", especial:"outro"}[v];
  return m ? {tipo:m, de:"triagem"} : null;
}
// Qualidade de segurado (art. 15, II e §4º, Lei 8.213/91), versão simples:
// facultativo tem 6 meses de graça, CI (e MEI) 12. A perda acontece no dia
// seguinte ao vencimento da contribuição do mês posterior ao fim da graça.
// Conta: competência paga + meses de graça + 1 mês; vence no dia 15 do mês
// seguinte a esse. Sem prorrogação por desemprego ou 120 contribuições.
function qualidadeAte(comp, recolhe){
  const g = recolhe==="facultativo" ? 6 : (recolhe==="ci"||recolhe==="mei") ? 12 : 0;
  const m = /^(\d{4})-(\d{2})/.exec(comp||""); if(!g || !m) return null;
  return new Date(Date.UTC(+m[1], +m[2]-1 + g + 2, 15)).toISOString().slice(0,10);
}
// F177 · O LEITOR DO PRÉVIUS. O relatório tem três partes que interessam:
// "Períodos Considerados no Cálculo" (cada linha: início, fim, Normal ou
// Especial, empresa e os tempos), "Análise dos Dados" (tempo e carência na
// DIB) e "Análise Por Espécie de Benefício" (um bloco por espécie: tempo,
// carência, situação, RMI, "Maior RMI" e "será/foi atingido em"). Lê linha a
// linha e devolve só o que achou; o resto o colaborador preenche.
const PREV_APOS = /^(41|42|46|57)\b/;   // espécies de aposentadoria viram cenário
// o PDF do Prévius sai com a fonte em Windows-1252 e o PDF.js lê como Mac
// Roman ("ContribuiÁ„o"): devolve cada letra trocada à certa
const PREV_ACENTOS = {"™":"ª","∞":"°","∫":"º","¿":"À","¡":"Á","¬":"Â","√":"Ã","«":"Ç","…":"É","Õ":"Í","”":"Ó","‘":"Ô","’":"Õ","⁄":"Ú","‡":"à","·":"á","‚":"â","„":"ã","Á":"ç","È":"é","Í":"ê","Ì":"í","Û":"ó","Ù":"ô","ı":"õ","˙":"ú","¸":"ü"};
const prevAcentos = t => /[„ı˙∫]|Á„/.test(t) ? t.replace(/[™∞∫¿¡¬√«…Õ”‘’⁄‡·‚„ÁÈÍÌÛÙı˙¸]/g, c=>PREV_ACENTOS[c]) : t;
// o cabeçalho de cada espécie: "42 - Aposentadoria …"; o PDF.js às vezes
// põe o parêntese do título antes do número ("(Considerando…)46 - …")
function cabEspecie(l){
  const m = l.match(/(\d{2}) - ((?:Aposentadoria|Auxílio|Invalidez|Pensão)[^()]*?)\s*(\(.*\))?\s*$/i);
  if(!m || /\d{2}\/\d{2}\/\d{4}/.test(l)) return null;
  const antes = l.slice(0, m.index).trim();
  return [m[0], m[1], [m[2].trim(), m[3]||antes].filter(Boolean).join(" ")];
}
function lerPrevius(texto){
  texto = prevAcentos(String(texto||""));
  const iso = d => { const m=String(d||"").match(/(\d{2})\/(\d{2})\/(\d{4})/); return m?`${m[3]}-${m[2]}-${m[1]}`:null; };
  const num = v => +String(v).replace(/\./g,"").replace(",",".");
  const linhas = String(texto||"").split(/\n/).map(l=>l.replace(/\s+/g," ").trim()).filter(Boolean);
  const r = {};
  // períodos especiais (sem repetir o mesmo intervalo, que a quebra de página duplica)
  const pe = [], vistos = new Set();
  let emCalculo = false;
  for(const l of linhas){
    if(/^Períodos Considerados no Cálculo/i.test(l)) emCalculo = true;
    else if(/^(Legenda|Análise dos Dados|Totais)/i.test(l)) emCalculo = emCalculo && !/^Análise/i.test(l);
    // o PDF.js às vezes põe a data de início depois da empresa, colada nela:
    // vale a menor e a maior data da linha, e a empresa é o que vem depois de
    // "Especial" até o primeiro número
    const datas = l.match(/\d{2}\/\d{2}\/\d{4}/g) || [];
    if(emCalculo && datas.length===2 && / Especial /.test(" "+l+" ")){
      const [a,b] = datas.map(iso).sort();
      const chave = a+b;
      const empresa = (l.split(/Especial /)[1]||"").replace(/\d{2}\/\d{2}\/\d{4}/g," ").replace(/#/g," ").replace(/\s\d.*$/,"").replace(/\s+/g," ").trim();
      if(!vistos.has(chave)){ vistos.add(chave); pe.push({inicio:a, fim:b, empresa}); }
    }
  }
  if(pe.length) r.periodos_especiais = pe;
  // tempo e carência na DIB
  const idx = linhas.findIndex(l=>/Tempo de Contribuição na D\.?I\.?B/i.test(l));
  if(idx>=0){ const t = linhas.slice(idx, idx+6).join(" ").match(/(\d+ anos?, \d+ m[eê]s(?:es)? e \d+ dias?)/i); if(t) r.tempo = t[1]; }
  const ic = linhas.findIndex(l=>/Número de Contribuições na D\.?I\.?B/i.test(l));
  if(ic>=0){ const c = linhas.slice(ic, ic+5).join(" ").match(/(\d+) contribuições/i); if(c) r.carencia = `${c[1]} contribuições`; }
  // um bloco por espécie
  // a DIB do cálculo: quem já atingiu o direito sem data própria, atingiu nela
  const iDib = linhas.findIndex(l=>/Início do Benefício \(DIB\)/i.test(l));
  const dib = iDib>=0 ? iso((linhas[iDib+1]||"").match(/\d{2}\/\d{2}\/\d{4}/)) : null;
  const cen = [];
  let naAnalise = false;
  for(let i=0;i<linhas.length;i++){
    if(/^Análise Por Espécie de Benefício/i.test(linhas[i])){ naAnalise = true; continue; }
    if(/^(Cálculo d|Relatório d)/i.test(linhas[i])) naAnalise = false;
    if(!naAnalise) continue;
    const h = cabEspecie(linhas[i]);
    if(!h) continue;
    const bloco = [];
    for(let j=i+1;j<linhas.length && j<i+12;j++){ if(cabEspecie(linhas[j]) || /^\* As projeções/.test(linhas[j])) break; bloco.push(linhas[j]); }
    const b = bloco.join(" ");
    if(!/Necessário|Requisito|Carência/i.test(b)) continue;
    const rmi = b.match(/R\$ ?([\d.]+,\d{2})/);
    const quando = b.match(/(será|foi) atingid[oa] em (\d{2}\/\d{2}\/\d{4})/i);
    const sit = /Não Atingiu/i.test(b) ? "não atingiu" : /Atingiu os Requisitos/i.test(b) ? "atingiu" : /Não Disponível/i.test(b) ? "não disponível" : "";
    if(!PREV_APOS.test(h[1])) continue;
    if(sit==="não disponível") continue;
    const valor = rmi ? num(rmi[1]) : null;
    cen.push({regra:`${h[1]} · ${h[2]}`.slice(0,120), data: quando ? iso(quando[2]) : (sit==="atingiu" ? dib : null),
      valor: valor || null, obs: sit || null, maior: /Maior RMI/i.test(b)});
  }
  // a aposentadoria por idade possível, quando o relatório a projeta
  const idade = linhas.join(" ").match(/Possível aposentadoria por idade: (\d{2}\/\d{2}\/\d{4}) \((\d+) anos\)/i);
  if(idade) cen.push({regra:`Aposentadoria por idade (${idade[2]} anos)`, data:iso(idade[1]), valor:null, obs:"projeção do Prévius"});
  if(cen.length){
    // melhor caminho: a maior RMI entre as que atingem o direito; sem isso, a primeira com data
    const ok = cen.filter(c=>c.obs==="atingiu" && c.valor);
    const melhor = ok.sort((a,b)=>b.valor-a.valor)[0] || cen.find(c=>c.data) || cen[0];
    melhor.melhor = true;
    cen.forEach(c=>delete c.maior);
    r.cenarios = cen;
    if(melhor.valor) r.valor = melhor.valor;
    if(melhor.data) r.data_direito = melhor.data;
  }
  return r;
}
const adPeriodo = (cls, p, terceiro) => `<div class="ad-per form-linha ${cls}">
    <input type="date" class="adp-ini" aria-label="início" value="${esc(p&&p.inicio||"")}">
    <input type="date" class="adp-fim" aria-label="fim" value="${esc(p&&p.fim||"")}">
    <input class="adp-onde" placeholder="${terceiro}" aria-label="${terceiro}" style="flex:1;min-width:150px" value="${esc(p&&(p.empresa||p.local)||"")}">
    <button type="button" class="btn-mini" aria-label="tirar este período" onclick="this.closest('.ad-per').remove()">${CAD_IC.fechar}</button></div>`;
const adPlano = p => `<div class="ad-pl form-linha" data-id="${esc(p&&p.id||"")}">
    <input type="date" class="adl-data" aria-label="data" value="${esc(p&&p.data||"")}">
    <input class="adl-txt" placeholder="o que fazer — ex.: pagar a competência 09/2026" aria-label="o que fazer" style="flex:1;min-width:200px" value="${esc(p&&p.texto||"")}">
    <button type="button" class="btn-mini" aria-label="tirar esta linha" onclick="this.closest('.ad-pl').remove()">${CAD_IC.fechar}</button></div>`;
// espécie e subespécie do formulário: o pré-caso aberto, a última análise ou o caso
function servicoInicial(c){
  const ab=adBenefAberto(c), oa=ab && opcoesSel(c).find(x=>x.o===ab);   // F234 · o benefício aberto manda no formulário
  if(oa && oa.cod) return {cod:oa.cod, sub:oa.sub||oa.cod};
  const pa=preCasoAberto(c), pc=pa && pa.cod ? pa : precasosDe(c).find(p=>!p.so_lembrete && p.cod);   // F231 · o escolhido primeiro
  if(pc) return {cod:pc.cod, sub:pc.sub||pc.cod};
  const sv=((analisesDaVez(c)[0]||{}).detalhes||{}).servico;
  if(sv && sv.cod) return {cod:sv.cod, sub:sv.sub||sv.cod};
  const k=(D.casosDoCliente.get(c.id)||[]).find(x=>x.especie && x.fase!=="encerrado");
  return k ? {cod:k.especie, sub:k.subespecie||k.especie} : {cod:"", sub:""};
}
const opcoesSub = (cod, sel) => subespeciesDe(cod).map(([ch,n])=>`<option value="${esc(ch)}" ${ch===sel?"selected":""}>${esc(n)}</option>`).join("");
function adTrocarEspecie(){
  const cod=(document.getElementById("ad-esp")||{}).value||"";
  const s=document.getElementById("ad-sub"); if(s) s.innerHTML=cod?opcoesSub(cod, cod):"";
  adMostrarCampos();
}
// mostra só os campos do serviço escolhido (os outros ficam no DOM, ocultos,
// para não perder o que já se digitou ao trocar a espécie)
function adMostrarCampos(){
  const cod=(document.getElementById("ad-esp")||{}).value||"", sub=(document.getElementById("ad-sub")||{}).value||"";
  const ks=camposDoServico({cod, sub, nome:nomeDaSubespecie(sub)||nomeDaEspecie(cod)||""});
  document.querySelectorAll("#ad-campos [data-campo]").forEach(e=>{ e.hidden=!ks.includes(e.dataset.campo); });
  const pl=document.getElementById("ad-plano-box");
  if(pl) pl.hidden=!recolheLivre((document.getElementById("ad-f-recolhe")||{}).value);
}
// o PDF do Prévius entra como anexo do cliente e o texto é lido aqui mesmo,
// com o leitor que o CNIS já usa
async function lerPdfPrevius(cliId, inp){
  const arq=inp&&inp.files&&inp.files[0]; if(!arq) return;
  inp.value="";
  const itens=await pedacosDoPdfOuAviso(arq); if(!itens) return;
  // F177 · linhas na ordem da página (por altura e depois da esquerda para a
  // direita), como o leitor do CNIS: é assim que o leitor do Prévius as espera
  const texto=linhasDoPdf(itens).map(l=>l.txt).join("\n");
  const box=document.getElementById("ad-previus-box"), pre=document.getElementById("ad-previus-txt");
  if(pre) pre.textContent=texto;
  if(box){ box.hidden=false; }
  const fonte=document.getElementById("ad-fonte"); if(fonte) fonte.value="previus";
  const lido=lerPrevius(texto);
  for(const [k,v] of Object.entries(lido)){ const e=document.getElementById("ad-f-"+k); if(e && v!=null && typeof v!=="object") e.value=v; }
  // períodos especiais e cenários entram como linhas do formulário
  if(lido.periodos_especiais){
    const box=document.getElementById("ad-pe"), cont=document.querySelector('#ad-campos [data-campo="periodos_especiais"]');
    if(box){ box.innerHTML=lido.periodos_especiais.map(p=>adPeriodo("pe", p, "empresa")).join(""); }
    if(cont) cont.hidden=false;
  }
  if(lido.cenarios){
    const cens=document.getElementById("ad-cens");
    if(cens) cens.innerHTML=lido.cenarios.map(c=>linhaCenario(c)).join("");
  }
  const achou=[lido.tempo&&"tempo", lido.carencia&&"carência", lido.cenarios&&`${lido.cenarios.length} regra(s)`,
    lido.periodos_especiais&&`${lido.periodos_especiais.length} período(s) especial(is)`].filter(Boolean);
  if(achou.length) aviso(`Prévius lido: ${achou.join(", ")} — confira antes de registrar`, false);
  try{
    const stamp=new Date().toISOString().replace(/[:.]/g,"-").toLowerCase();
    const caminho=`${cliId}/${stamp}-previus.pdf`;
    await subirArquivo(caminho, arq);
    const [an]=await api(`/rest/v1/anexos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:null, cliente_id:cliId, autor_id:eu.id,
        nome:`Prévius ${fmt(hoje())} - ${arq.name}`, caminho, tipo:"application/pdf", tamanho:arq.size})});
    if(an){ (D.anexos=D.anexos||[]).unshift(an);
      const h=document.getElementById("ad-previus-anexo"); if(h) h.value=an.id; }
    aviso("PDF do Prévius lido e guardado nos anexos do cliente", false);
  }catch(e){ aviso("Li o PDF, mas não consegui guardar o arquivo — tente de novo"); }
}
// abre o formulário na próxima pintura (os passos 2 e 3 do atendimento)
let adAbrir=false;
const adVisivel=new Set();   // clientes cuja Análise de Direito foi aberta por atalho
function formAnalise(c){
  const pre=adPre; adPre=null;   // consumo único: os valores passam a viver no DOM
  const abrir=adAbrir; adAbrir=false;
  const ant=(analisesDaVez(c)[0]||{}).detalhes||{};
  const sv=servicoInicial(c);
  const rec=(recolheDe(c, analisesDaVez(c)[0])||{}).tipo||"";
  const vis=camposDoServico({cod:sv.cod, sub:sv.sub, nome:nomeDaSubespecie(sv.sub)||nomeDaEspecie(sv.cod)||""});
  const oc=k=>vis.includes(k)?"":"hidden";
  const campo=(k, html)=>`<label class="adr-campo" data-campo="${k}" ${oc(k)}><span>${AD_ROT[k]} <em class="ad-est"></em></span>${html}<small class="ad-vai">vai para ${AD_VAI[k]}</small></label>`;
  setTimeout(adEstados, 0);
  return `<details class="lb-novo" id="ad-novo" data-pc="${esc((preCasoAberto(c)||{}).id||"")}" oninput="this.dataset.mexido=1" ${pre||abrir?"open":""}>
    <summary>+ registrar análise</summary>
    <div class="form-linha" style="margin-top:6px;align-items:center">
      <label class="meio-sub">feita em <input type="date" id="ad-data" value="${pre&&pre.data||hoje()}" max="${hoje()}"
        title="a análise antiga entra com a data original — a de 2020 entra como 2020"></label>
      <select id="ad-fonte" title="de onde saiu o cálculo">
        <option value="manual">análise manual</option>
        <option value="previus">cálculo do Prévius</option>
        <option value="todo" ${pre?"selected":""}>anotação do To Do</option>
      </select>
      <input type="hidden" id="ad-nota" value="${pre?`${pre.lembId}:${pre.i}`:""}">
    </div>
    <div class="adr-form-grupo">
      <div class="adr-form-tit">Serviço</div>
      <div class="form-linha">
        <label class="adr-campo" style="flex:1 1 260px"><span>Espécie</span>
          <select id="ad-esp" onchange="adTrocarEspecie()"><option value="">escolha a espécie</option>
            ${ESPECIES.map(([cod,n])=>`<option value="${esc(cod)}" ${cod===sv.cod?"selected":""}>${esc(cod)} · ${esc(n)}</option>`).join("")}</select></label>
        <label class="adr-campo" style="flex:1 1 260px"><span>Subespécie</span>
          <select id="ad-sub" onchange="adMostrarCampos()">${sv.cod?opcoesSub(sv.cod, sv.sub):""}</select></label>
      </div>
    </div>
    <div class="adr-form-grupo" id="ad-previus">
      <div class="adr-form-tit">PDF do Prévius</div>
      <label class="adr-arq"><input type="file" accept="application/pdf" id="ad-previus-arq"
        onchange="lerPdfPrevius('${c.id}', this)">Escolher o PDF do cálculo</label>
      <span class="meio-sub">Fica nos anexos do cliente. Sem o PDF, preencha à mão.</span>
      <input type="hidden" id="ad-previus-anexo" value="">
      <details id="ad-previus-box" hidden><summary class="meio-sub">texto lido do PDF</summary>
        <pre id="ad-previus-txt" class="adr-pre"></pre></details>
    </div>
    <div class="adr-form-grupo" id="ad-campos" oninput="adEstados()" onchange="adEstados()">
      <div class="adr-form-tit">O que falta você informar <span class="meio-sub" id="ad-falta"></span></div>
      <div class="adr-campos">
        ${campo("tempo", `<input id="ad-f-tempo" placeholder="ex.: 32 anos, 5 meses e 22 dias" value="${esc(ant.tempo||"")}">`)}
        ${campo("carencia", `<input id="ad-f-carencia" placeholder="ex.: 390 contribuições" value="${esc(ant.carencia||"")}">`)}
        ${campo("valor", `<input id="ad-f-valor" type="number" step="0.01" min="0" value="${esc(ant.valor??"")}">`)}
        ${campo("data_direito", `<input id="ad-f-data_direito" type="date" value="${esc(ant.data_direito||"")}">`)}
        ${campo("did", `<input id="ad-f-did" type="date" value="${esc(ant.did||"")}">`)}
        ${campo("grau", `<select id="ad-f-grau"><option value="">—</option>${["Leve","Moderada","Grave"].map(g=>`<option ${ant.grau===g?"selected":""}>${g}</option>`).join("")}</select>`)}
        ${campo("recolhe", `<select id="ad-f-recolhe" onchange="adMostrarCampos()"><option value="">—</option>${AD_RECOLHE.map(([v,r])=>`<option value="${v}" ${rec===v?"selected":""}>${r}</option>`).join("")}</select>`)}
        <label class="adr-campo" data-campo="recolhe" ${oc("recolhe")}><span>${AD_ROT.ultima_contribuicao} <em class="ad-est"></em></span>
          <input id="ad-f-ultima_contribuicao" type="month" value="${esc(ant.ultima_contribuicao||"")}"><small class="ad-vai">vai para ${AD_VAI.ultima_contribuicao}</small></label>
      </div>
      <div data-campo="periodos_especiais" class="adr-lista-form" ${oc("periodos_especiais")}><span class="adr-form-sub">${AD_ROT.periodos_especiais}</span>
        <div id="ad-pe">${(ant.periodos_especiais||[]).map(p=>adPeriodo("pe", p, "empresa")).join("")}</div>
        <button type="button" class="btn-mini" onclick="document.getElementById('ad-pe').insertAdjacentHTML('beforeend', adPeriodo('pe', null, 'empresa'))">+ período especial</button></div>
      <div data-campo="periodos_rurais" class="adr-lista-form" ${oc("periodos_rurais")}><span class="adr-form-sub">${AD_ROT.periodos_rurais}</span>
        <div id="ad-pr">${(ant.periodos_rurais||[]).map(p=>adPeriodo("pr", p, "local")).join("")}</div>
        <button type="button" class="btn-mini" onclick="document.getElementById('ad-pr').insertAdjacentHTML('beforeend', adPeriodo('pr', null, 'local'))">+ período rural</button></div>
      <div id="ad-plano-box" class="adr-lista-form" ${recolheLivre(rec)?"":"hidden"}><span class="adr-form-sub">Planejamento das contribuições</span>
        <div id="ad-plano">${(ant.plano||[]).map(adPlano).join("")}</div>
        <button type="button" class="btn-mini" onclick="document.getElementById('ad-plano').insertAdjacentHTML('beforeend', adPlano())">+ data</button></div>
      <button type="button" class="btn-mini" id="ad-outros" onclick="document.querySelectorAll('#ad-campos [data-campo]').forEach(e=>{ e.hidden=false; })"
        title="a espécie escolhida pede só os campos acima">mostrar os outros campos</button>
    </div>

    <textarea id="ad-contexto" placeholder="o que foi visto e combinado com o cliente — ex.: prefere esperar a regra dos pontos; avisar quando faltar 6 meses"
      style="width:100%;min-height:52px;margin-top:6px">${pre?esc(pre.texto||""):""}</textarea>
    <div id="ad-cens" style="margin-top:6px">${linhaCenario()}${linhaCenario()}</div>
    <div class="form-linha">
      <button class="btn-mini" onclick="document.getElementById('ad-cens').insertAdjacentHTML('beforeend', linhaCenario())">+ cenário</button>
      <button style="margin-left:auto" onclick="salvarAnalise('${c.id}')" title="Registrar análise">Registrar<span class="sr-only"> análise</span></button>
    </div>
    <datalist id="lista-regras">${REGRAS_DIREITO.map(r=>`<option value="${esc(r)}">`).join("")}</datalist>
  </details>`;
}
async function salvarAnalise(cliId){
  await admGravarAgora();   // F231
  const v=id=>{const e=document.getElementById(id);return e?e.value.trim():"";};
  const data=v("ad-data"), contexto=v("ad-contexto"), fonte=v("ad-fonte")||"manual";
  if(!data) return aviso("Diga a data em que a análise foi feita");
  const cenarios=[...document.querySelectorAll("#ad-cens .ad-row")].map(r=>({
    regra:r.querySelector(".ad-regra").value.trim()||null,
    data:r.querySelector(".ad-data").value||null,
    valor:(x=>x?+x:null)(r.querySelector(".ad-valor").value),
    obs:r.querySelector(".ad-obs").value.trim()||null,
    melhor:r.querySelector("input[type=radio]").checked||undefined,
  })).filter(x=>x.regra||x.data||x.valor||x.obs);
  const detalhes=adColherDetalhes();
  const temDet=adDetPreenchido(detalhes);
  { const cP=D.cliPorId.get(cliId), pcP=cP && preCasoAberto(cP); if(pcP && pcP.id!=="legado") detalhes.precaso_id=pcP.id; }   // F231
  if(!contexto && !cenarios.length && !temDet)
    return aviso("Registre pelo menos um cenário ou o que foi conversado");
  // F54 · a resposta da triagem (empregado desde / CI / facultativo) viaja
  // JUNTO com a análise — se o texto não a mencionar, ela é anexada
  let contextoFinal=contexto;
  const vinc=rotVinculo(triagemDe(D.cliPorId.get(cliId)||{}).vinculo);
  if(vinc && !/víncul|vincul/i.test(contexto))
    contextoFinal=(contexto?contexto+"\n":"")+`Vínculo (triagem): ${vinc}.`;
  let a;
  const corpo={cliente_id:cliId, autor_id:eu.id, data_analise:data,
    contexto:contextoFinal||null, fonte, cenarios};
  const postar=b=>api(`/rest/v1/analises_direito`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify(b)});
  try{
    // F174 · a coluna detalhes vem do schema_analise_detalhes.sql; sem ela, grava sem
    try{ [a]=await postar(Object.keys(detalhes).length ? {...corpo, detalhes} : corpo); }
    catch(e){ if(/detalhes|42703|PGRST204/.test(String(e.message||e))) [a]=await postar(corpo); else throw e; }
  }catch(e){ return aviso("Rode o crm/fase2/schema_analise_direito.sql no Supabase — falta a tabela 'analises_direito'"); }
  if(a){
    _analisesGravadas.set(a.id, {a, em:Date.now()});   // F244 · a carga que já estava a caminho não a apaga
    D.analises=D.analises||[]; D.analises.push(a);
    const as=D.analisesPorCliente.get(cliId)||[];
    as.push(a); as.sort((x,y)=>x.data_analise<y.data_analise?1:-1);
    D.analisesPorCliente.set(cliId, as);
  }
  // ⚖️ → 🏢 o comentário nos andamentos de TODOS os casos ativos do cliente;
  // F49 · no PRIMEIRO atendimento ainda não há caso — aí o registro vira
  // ANOTAÇÃO do atendimento (e, quando o pré-caso virar caso, as anotações
  // migram para os andamentos sozinhas, pela regra que já existe do F30)
  const ativosCli=D.casos.filter(k=>k.cliente_id===cliId && k.fase!=="encerrado" && !ehPreCaso(k));   // F226
  const m=cenMelhor({cenarios}), outros=cenarios.length-(m?1:0);
  const txt=`⚖️ Análise de Direito registrada (${fmt(data)})`
    +(m?` — melhor caminho: ${m.regra||"?"}${m.data?` em ${fmt(m.data)}`:""}${m.valor?`, ${moedaBR(m.valor)}`:""}`:"")
    +(outros>0?`; +${outros} cenário(s)`:"")+`. Detalhes na aba Análise de Direito.`;
  if(ativosCli.length){
    try{
      await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
        body:JSON.stringify(ativosCli.map(k=>({caso_id:k.id, autor_id:eu.id, origem:"app", texto:txt})))});
    }catch(e){}
  }else{
    const c=D.cliPorId.get(cliId);
    if(c){
      const notas=[...((c.campos||{}).atendimento||[]),
        {em:new Date().toISOString(), quem:(eu.nome||"").split(" ")[0], autor_id:eu.id,
         texto:txt, origem:"analise"}];
      c.campos={...(c.campos||{}), atendimento:notas};
      try{ await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",
        headers:{Prefer:"return=minimal"}, body:JSON.stringify({campos:c.campos})}); }catch(e){}
    }
  }
  // a anotação do To Do que originou esta análise ganha o carimbo "✔ virou"
  const nota=v("ad-nota");
  if(nota && a){
    const [lembId, i]=nota.split(":");
    const l=(D.lembretes||[]).find(x=>x.id===lembId);
    const dts=l?{...(l.detalhes||{})}:null;
    if(dts && (dts.anotacoes||[])[+i]){
      dts.anotacoes=dts.anotacoes.slice();
      dts.anotacoes[+i]={...dts.anotacoes[+i], analise_id:a.id};
      try{
        await api(`/rest/v1/lembretes?id=eq.${lembId}`,{method:"PATCH",
          headers:{Prefer:"return=minimal"}, body:JSON.stringify({detalhes:dts})});
        l.detalhes=dts;
      }catch(e){}
    }
  }
  // F174 · data do direito no futuro vira o aviso de época (o mesmo do
  // "avisar na época"), uma vez só por cliente e data
  const dd=detalhes.data_direito;
  if(dd && dd>hoje() && !(D.apos||[]).some(x=>x.cliente_id===cliId && x.data===dd))
    await avisarCenario(cliId, dd, (detalhes.servico||{}).nome||"Aposentadoria");
  // F219 · a análise devolve ao pré-caso aberto a espécie decidida e a etapa, e ao card ligado a data do direito
  const cA=D.cliPorId.get(cliId), pcA=cA && preCasoAberto(cA);
  if(a && pcA){
    const sv=detalhes.servico;
    await mudarPreCasoCampos(cliId, pcA.id, p=>{
      if(sv && !p.especie && !p.cod){ p.especie=sv.nome; p.cod=sv.cod; p.sub=sv.sub && sv.sub!==sv.cod ? sv.sub : null; }   // F234 · com vários benefícios, a espécie do pré-caso só nasce aqui
      p.etapas={...(p.etapas||{}), analise:{em:hoje(), quem:eu.id, analise_id:a.id}};
    });
    if(pcA.lembrete_id) await cardDaAnalise(cliId, pcA.lembrete_id, a, baseDesfecho(cA, a));
  }
  aviso("⚖️ Análise registrada", false);
  montarSidebar(); abrirFicha(cliId);
}
// lê os campos do formulário; só entra o que foi preenchido e está à vista
// F195 · para onde vai cada campo da análise, e o estado dele no formulário
const AD_VAI = {tempo:"o resumo da análise e Documentos", carencia:"a ficha da análise e Documentos", valor:"a ficha da análise e Documentos",
  data_direito:"o resumo e o aviso de época nas Aposentadorias futuras", did:"a ficha da análise e Documentos", grau:"a ficha da análise e Documentos",
  recolhe:"o resumo, com a qualidade de segurado, e o planejamento", ultima_contribuicao:"a qualidade de segurado no resumo"};
function adEstados(){
  const ls = [...document.querySelectorAll("#ad-campos .adr-campo[data-campo]")].filter(l=>!l.hidden);
  let falta = 0;
  for(const l of ls){
    const e = l.querySelector("input,select"), em = l.querySelector(".ad-est"); if(!e || !em) continue;
    const v = (e.value||"").trim(), est = !v ? "falta" : e.dataset.pre && e.dataset.pre===v ? "pre" : "ok";
    if(est==="falta") falta++;
    em.textContent = {falta:"falta informar", pre:"do dossiê · confira", ok:"informado"}[est];
    l.dataset.est = est;
  }
  const s = document.getElementById("ad-falta");
  if(s) s.textContent = !ls.length ? "" : falta ? `${falta} de ${ls.length} a informar` : "tudo informado";
}
// F231 · escolher benefício ou deixar item de fora não é análise: conta o que se digitou
function adDetPreenchido(d){
  const m = d.modulos;
  return Object.keys(d).some(k=>!["servico","modulos","precaso_id","beneficio","levados"].includes(k))
    || !!(m && (Object.values(m.valores||{}).some(v=>String(v??"").trim()) || (m.tempos||[]).some(r=>r.de||r.ate||r.onde)));
}
function adColherDetalhes(){
  const v=id=>{const e=document.getElementById(id);return e?e.value.trim():"";};
  const visivel=k=>{ const e=document.querySelector(`#ad-campos [data-campo="${k}"]`); return !!e && !e.hidden; };
  const d={};
  const cod=v("ad-esp"), sub=v("ad-sub");
  if(cod) d.servico={cod, sub:sub||cod, nome:nomeDaSubespecie(sub)||nomeDaEspecie(cod)||cod};
  for(const k of ["tempo","carencia","data_direito","did","grau","recolhe"])
    if(visivel(k) && v("ad-f-"+k)) d[k]=v("ad-f-"+k);
  if(visivel("valor") && v("ad-f-valor")) d.valor=+v("ad-f-valor");
  if(visivel("recolhe") && v("ad-f-ultima_contribuicao")) d.ultima_contribuicao=v("ad-f-ultima_contribuicao");
  const per=(sel, chave)=>[...document.querySelectorAll(sel)].map(r=>({inicio:r.querySelector(".adp-ini").value||null,
    fim:r.querySelector(".adp-fim").value||null, [chave]:r.querySelector(".adp-onde").value.trim()||null}))
    .filter(p=>p.inicio||p.fim||p[chave]);
  if(visivel("periodos_especiais")){ const pe=per("#ad-pe .ad-per","empresa"); if(pe.length) d.periodos_especiais=pe; }
  if(visivel("periodos_rurais")){ const pr=per("#ad-pr .ad-per","local"); if(pr.length) d.periodos_rurais=pr; }
  const box=document.getElementById("ad-plano-box");
  if(box && !box.hidden){
    const pl=[...document.querySelectorAll("#ad-plano .ad-pl")].map(r=>({id:r.dataset.id||crypto.randomUUID(),
      data:r.querySelector(".adl-data").value||null, texto:r.querySelector(".adl-txt").value.trim()}))
      .filter(p=>p.data||p.texto);
    if(pl.length) d.plano=pl;
  }
  if(v("ad-previus-anexo")) d.previus_anexo_id=v("ad-previus-anexo");
  const cAd = D.cliPorId.get(clienteAberto), snap = cAd && admSnapshot(cAd); if(snap) d.modulos = snap;   // F217
  const abD = cAd && adBenefAberto(cAd);   // F234 · o benefício aberto, o estado de cada requisito e o que veio do Primeiro atendimento
  if(abD){ const ks = D.casosDoCliente.get(cAd.id)||[], rq = requisitosDe(cAd, ks, abD); d.beneficio = abD;
    if(rq) d.modulos = {...(d.modulos||{}), requisitos: rq.rs.map(r=>({id:r.id, est:r.est, txt:r.txt||""})), quando: rq.quando};
    d.levados = itensLevados(cAd, ks).map(({k, txt, fonte})=>({k, txt, fonte})); }
  return d;
}
async function apagarAnalise(id){
  const a=(D.analises||[]).find(x=>x.id===id); if(!a) return;
  if(!await confirmar("Apagar esta análise? Os comentários já gravados nos casos ficam.")) return;
  try{ await api(`/rest/v1/analises_direito?id=eq.${id}`,{method:"DELETE"}); }
  catch(e){ return aviso("Não consegui apagar — tente de novo."); }
  D.analises=D.analises.filter(x=>x.id!==id); _analisesGravadas.delete(id);
  const as=(D.analisesPorCliente.get(a.cliente_id)||[]).filter(x=>x.id!==id);
  if(as.length) D.analisesPorCliente.set(a.cliente_id, as); else D.analisesPorCliente.delete(a.cliente_id);
  aviso("Análise apagada", false);
  montarSidebar(); if(clienteAberto) abrirFicha(clienteAberto); else render();
}
function notaViraAnalise(lembId, i){
  const l=(D.lembretes||[]).find(x=>x.id===lembId); if(!l) return;
  const n=((l.detalhes||{}).anotacoes||[])[i]; if(!n) return;
  adPre={data:n.data||hoje(), texto:n.texto||"", lembId, i};
  abaAtiva=0; subCad="direito"; repintarFicha();   // F171
  const d=document.getElementById("ad-novo"); if(d) d.scrollIntoView({block:"start"});
}
// o aviso de época reusa a máquina que já existe: aposentadorias + avisoApos
// (🎂 no Meu Dia 3 meses antes) — nada novo para manter
async function avisarCenario(cliId, data, regra){
  await lembrarApos(cliId, null, data, regra||"Aposentadoria", avisoApos(data));
}
// F49 · a linha de estado que liga triagem, anotações e análise: verde com a
// última análise (e o melhor caminho) ou âmbar dizendo que ainda não há.
// naTriagem=true acrescenta o atalho para as Anotações, onde o form vive.
// F54 · o vínculo respondido na triagem, por extenso — vai para a análise
function rotVinculo(v){
  if(!v || !v.tipo) return "";
  const nomes={empregado:"Empregado (CLT)", ci:"Contribuinte individual",
    facultativo:"Facultativo", especial:"Segurado especial", sem:"Não contribui"};
  return (nomes[v.tipo]||v.tipo) + (v.tipo==="empregado" && v.desde ? ` desde ${v.desde.split("-").reverse().join("/")}` : "");
}
async function salvarVinculoTriagem(cliId){
  const c=D.cliPorId.get(cliId); if(!c) return;
  const tipo=(document.getElementById("tri-vinc")||{}).value||"";
  const desde=(document.getElementById("tri-vinc-desde")||{}).value||"";
  const t={...triagemDe(c)};
  t.vinculo = tipo ? {tipo, desde:tipo==="empregado"?desde:null, em:hoje(), quem:eu.id} : undefined;
  if(!t.vinculo) delete t.vinculo;
  if(!await salvarTriagem(cliId, t)) return aviso("Não consegui guardar o vínculo — tente de novo");
  aviso("Vínculo registrado na triagem", false);
}
function statusAnalise(c, naTriagem){
  // sem pictograma: os dois lugares desta linha (triagem e anotações) moram
  // na aba Cadastro, que é LIMPA por regra da casa (emoji.js vigia)
  if(D.analises===null)
    return `<p class="meio-sub">Rode o <b>crm/fase2/schema_analise_direito.sql</b> no Supabase para
      registrar análises de direito.</p>`;
  const as=analisesDe(c.id), ult=as[0];
  // F127 · cada passo respondido já está na Análise de Direito; o botão leva
  // até lá, e o do CNIS abre o extrato ao lado
  const bts=`<button class="btn-mini" onclick="abrirDireitoDe('${c.id}')" style="margin-left:6px" title="ver a Análise de Direito"><span aria-hidden="true">Análise</span><span class="sr-only">ver a Análise de Direito</span></button> ${botaoAbrirCnis(c, false)}`;
  if(!ult) return `<div class="ad-status pendente"><b>Cenários de aposentadoria ainda não registrados.</b>
    ${naTriagem?"Os passos respondidos aqui já aparecem na Análise de Direito.":"Os campos estão aqui embaixo."} ${bts}</div>`;
  const m=cenMelhor(ult);
  return `<div class="ad-status feita"><b>Análise de ${fmt(ult.data_analise)}</b>${
    m?` — melhor caminho: ${esc(m.regra||"—")}${m.data?` em ${fmt(m.data)}`:""}${m.valor?` (${moedaBR(m.valor)})`:""}`:""}${
    as.length>1?` · ${as.length} análises no histórico`:""} ${bts}</div>`;
}
// F127 · o feed da Análise de Direito: cada passo respondido na triagem e
// cada anotação do atendimento, do mais novo ao mais velho, com quem fez
// F129 · dois quadros separados: a TRIAGEM, agrupada pela cor da resposta
// (atenção em vermelho, não conferido em amarelo, sem pendência em verde,
// a cor anotada uma vez no grupo), e as ANOTAÇÕES do atendimento
function feedTriagem(c, ks){
  const t = triagemDe(c);
  const grupos = {atencao:[], pendente:[], ok:[]};
  for(const [k, rot] of triagemPassosDe(c, ks)){
    const p = t[k]||{};
    if(!p.feito && !(p.estado && !p.auto)) continue;
    const quem = D.colPorId.get(p.quem);
    const g = p.estado==="ok" ? "ok" : p.estado==="atencao" ? "atencao" : "pendente";
    grupos[g].push({ts: p.feito || Date.parse(p.em||"")||0, rot,
      texto: [p.texto||"", p.nota?`Anotação: ${p.nota}`:""].filter(Boolean).join(" "),
      quem: quem ? quem.nome : "", em: p.em});
  }
  for(const g of Object.values(grupos)) g.sort((a,b)=>b.ts-a.ts);
  return grupos;
}
function feedAnotacoes(c){
  // F172 · junto das anotações do cadastro, os andamentos dos casos que ainda
  // estão na fase Escritório (a lista 🙋 Escritório do To Do de antes da 08.99)
  const doEscr = (D._andsFicha||[]).filter(a=>{ const k=D.casoPorId.get(a.caso_id);
      return k && k.cliente_id===c.id && a.texto && (k.fase==="escritorio" || /^⚖️ Análise/.test(a.texto)); })
    .map(a=>({ts: Date.parse(a.criado_em)||0, texto: a.texto, em: a.criado_em,
      quem: ((D.colPorId.get(a.autor_id)||{}).nome||"").split(" ")[0]}));
  return [...((c.campos||{}).atendimento||[])
    .map(n=>({ts: Date.parse(n.em)||0, texto: n.texto||"", quem: n.quem||"", em: n.em})), ...doEscr]
    .sort((a,b)=>b.ts-a.ts);
}
// F173 · o To Do guarda o bloco datado e, quando o colaborador completa o
// texto, a sincronização trazia a versão nova COM OUTRO id e a antiga ficava:
// a mesma anotação aparecia duas vezes, uma cortada. Some a versão que é
// começo de outra do mesmo dia e do mesmo autor (nada se perde: a longa
// contém a curta). Vale na leitura; a próxima gravação já sai limpa.
function notasSemRepeticao(notas){
  const norm = t => String(t||"").replace(/\s+/g," ").trim();
  const dia = n => String(n.em||"").slice(0,10);
  return notas.filter((n,i)=>{ const t=norm(n.texto); if(!t) return true;
    return !notas.some((m,j)=>{ if(j===i || dia(m)!==dia(n) || (m.quem||"")!==(n.quem||"")) return false;
      const u=norm(m.texto); return u.length>t.length ? u.startsWith(t) : (u===t && j<i); }); });
}
// F172 · o cliente tem anotações vindas do To Do (lista 🙋 Escritório)?
const notasDoTodo = c => ((c.campos||{}).atendimento||[]).some(n=>n.origem==="todo");
async function anotarNoDireito(cliId){
  const c = D.cliPorId.get(cliId), ta = document.getElementById("ad-anot"); if(!c || !ta) return;
  const texto = (ta.value||"").trim(); if(!texto) return aviso("Escreva a anotação");
  // integração · com caso ativo, o andamento da Análise vai para o caso (com
  // a marca "⚖️ Análise ·"), onde a equipe o lê; sem caso, segue no cadastro
  // F226 · no pré-caso a análise segue como anotação do atendimento (onda 3 a leva à linha)
  const vivos = (D.casosDoCliente.get(cliId)||[]).filter(k=>k.fase!=="encerrado" && !ehPreCaso(k));
  const k = vivos.find(x=>x.id===casoSel) || vivos[0];
  if(k){
    let and;
    try{
      [and] = await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({caso_id:k.id, autor_id:eu.id, origem:"app", publico:false, texto:`⚖️ Análise · ${texto}`})})||[];
    }catch(e){ return aviso("Não consegui guardar o andamento — tente de novo"); }
    if(and){ and.andamentos_lidos=[{colaborador_id:eu.id}]; (D._andsFicha=D._andsFicha||[]).unshift(and); }
    aviso(`Andamento guardado no caso ${tituloCaso(k)}`, false);
    try{ await criarMencoes(`⚖️ Análise · ${texto}`, k.id, and && and.id); }catch(e){}   // F236 · o @nome vira menção
    return repintarFicha();
  }
  const nota = {id: crypto.randomUUID(), em: new Date().toISOString(), quem: (eu.nome||"").split(" ")[0], texto, origem: "app"};
  const campos = {...(c.campos||{}), atendimento: [...((c.campos||{}).atendimento||[]), nota]};
  try{
    await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({campos})});
  }catch(e){ return aviso("Não consegui guardar a anotação — tente de novo"); }
  c.campos = campos; aviso("Anotação guardada", false);
  try{ await mencionarNoCliente(cliId, texto); }catch(e){}   // F236 · o @nome vira menção, presa ao cliente
  repintarFicha();
}
const triVisivel = new Set();   // clientes com caso cuja Triagem foi reaberta pela Análise
function abrirTriagemDoCaso(cliId){ triVisivel.add(cliId); irSubCad("triagem"); }
function quadroTriagemDireito(c, ks){
  const tri = feedTriagem(c, ks);
  const t = triagemDe(c), passos = (ks||[]).length ? triagemPassosDe(c, ks) : [];
  const faltam = passos.filter(([k])=>{ const p = t[k]||{}; return !p.feito && !(p.estado && !p.auto); }).length;
  // F236 · com o caso já protocolado (ou na Justiça), os pontos em aberto são do começo do atendimento: deixam de soar como pendência
  const protocolado = (ks||[]).some(k=>!k.pre_caso && k.fase!=="encerrado" && (k.der || (k.protocolos||[]).length || k.processo));
  const responder = faltam && (ks||[]).length ? `<p class="adr-sub" style="margin:0">${protocolado ? `A triagem do atendimento ficou com ${faltam} ${faltam===1?"ponto":"pontos"} em aberto; o caso já foi protocolado.` : `${faltam} ${faltam===1?"ponto":"pontos"} sem resposta`}
      <button type="button" class="adr-link" onclick="abrirTriagemDoCaso('${c.id}')" title="Responder na triagem">Responder<span class="sr-only"> na triagem</span></button></p>` : "";
  const grupo = (cls, tit, itens) => !itens.length ? "" : `<div class="ad-grupo ${cls}">
    <div class="ad-grupo-tit">${tit}</div>
    <ul>${itens.map(f=>`<li><b>${esc(f.rot)}:</b> ${esc(f.texto)} <span class="ad-quem">— ${f.quem?esc(f.quem):"—"}${f.em?`, ${esc(fmt(f.em))}`:""}</span></li>`).join("")}</ul>
  </div>`;
  if(!(tri.atencao.length || tri.pendente.length || tri.ok.length)) return responder
    ? `<section class="adr-card ad-q-tri" aria-labelledby="adr-t-tri"><h2 class="adr-h" id="adr-t-tri">O que se apurou na triagem</h2>${responder}</section>` : "";
  // integração · leitura: fica na Análise mesmo depois que a aba Triagem some
  return `<section class="adr-card ad-q-tri" aria-labelledby="adr-t-tri">
      <h2 class="adr-h" id="adr-t-tri">O que se apurou na triagem</h2>
      ${grupo("atencao", "Atenção", tri.atencao)}
      ${grupo("pendente", "Não conferido", tri.pendente)}
      ${grupo("ok", "Sem pendência", tri.ok)}
      ${responder}
    </section>`;
}
// F172 · as anotações do cliente (inclusive as que vieram da lista 🙋
// Escritório do To Do) ficam aqui, e se anota daqui mesmo. F174 · o quadro
// chama-se Andamentos e tem âncora (#ad-anotar) para o "Novo andamento".
function quadroAndamentos(c){
  const anot = notasSemRepeticao(feedAnotacoes(c));
  return `<section class="adr-card ad-q-anot" id="ad-anotar" aria-labelledby="adr-t-anot">
      <h2 class="adr-h" id="adr-t-anot">Andamentos</h2>
      <label for="ad-anot" class="sr-so">Novo andamento</label>
      <div id="ad-anot-sug" class="meio-sub" style="order:2"></div>
      <textarea id="ad-anot" rows="2" placeholder="Novo andamento" oninput="sugerirRetorno('ad-anot','ad-anot-sug','${c.id}')"
        onkeydown="if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();anotarNoDireito('${c.id}');}"></textarea>
      <button type="button" class="btn-mini forte adr-bt adr-primario" style="align-self:flex-end" onclick="anotarNoDireito('${c.id}')">Anotar</button>
      ${anot.length ? `<ul class="ad-feed">${anot.map(f=>`<li class="anot">${esc(f.texto)}<span class="ad-quem">${f.quem?esc(f.quem):"—"}${f.em?` · ${esc(fmt(f.em))}`:""}</span></li>`).join("")}</ul>`
        : (kc=>kc ? `<p class="meio-sub" style="margin:0">As anotações do caso ficam na aba Casos. <button type="button" class="adr-link" onclick="irAoCaso('${kc.id}')" title="Abrir o caso">Abrir<span class="sr-only"> o caso</span></button></p>`
          : `<p class="meio-sub" style="margin:0">nenhuma anotação ainda</p>`)((D.casosDoCliente.get(c.id)||[]).find(k=>!k.pre_caso && k.fase!=="encerrado"))}
    </section>`;
}
// ── F174 · a Análise de Direito em quadros: resumo, ficha, regras,
// planejamento, pendências e andamentos (o desenho aprovado em 04.10.2026)
function mesesDeVida(dn){
  const d=dnIso(dn); if(!d) return null;
  const h=hoje(); let m=(+h.slice(0,4)-+d.slice(0,4))*12 + (+h.slice(5,7)-+d.slice(5,7));
  if(+h.slice(8,10) < +d.slice(8,10)) m--;
  return m>=0 ? m : null;
}
const tile = (rot, valor, sub, cls="") => `<div class="adr-tile ${cls}">
    <span class="adr-tile-rot">${rot}</span><span class="adr-tile-val">${valor}</span>
    ${sub?`<span class="adr-tile-sub">${sub}</span>`:""}</div>`;
// o aviso de época já existe para esta data? (aposentadorias com lembrete ou
// lembrete de aposentadoria futura com a mesma data)
const temAvisoApos = (cliId, data) => (D.apos||[]).some(x=>x.cliente_id===cliId && x.data===data)
  || lembretesDo(cliId).some(l=>l.tipo==="aposentadoria_futura" && (l.proximo_em===data || (l.detalhes||{}).data===data));
function resumoDireito(c, ult){
  const d=(ult&&ult.detalhes)||{};
  const mv=mesesDeVida(c.dn);
  const idade = mv==null
    ? tile("Idade hoje", "—", `data de nascimento faltando — preencher na Identificação`)
    : tile("Idade hoje", `${Math.floor(mv/12)} <small>anos e</small> ${mv%12} <small>${mv%12===1?"mês":"meses"}</small>`,
        `${({F:"nascida",M:"nascido"})[civilDe(c).sexo]||"nascido(a)"} em ${esc(fmt(dnIso(c.dn)))}`, "adr-t-idade");
  const tempo = d.tempo ? tile("Tempo de contribuição", esc(d.tempo), ult.fonte==="previus"?"do cálculo do Prévius":`da análise de ${esc(fmt(ult.data_analise))}`, "adr-t-texto")
    : tile("Tempo de contribuição", "—", "registre a análise ou leia o CNIS");
  const r=recolheDe(c, ult);
  const qa = r && d.ultima_contribuicao ? qualidadeAte(d.ultima_contribuicao, r.tipo) : null;
  const recolhe = r ? tile("Como recolhe hoje", esc(rotRecolhe(r.tipo)),
      qa ? `qualidade de segurado até ${esc(fmt(qa))}` : r.de==="triagem" ? "da triagem" : "", "adr-t-texto")
    : tile("Como recolhe hoje", "—", "responda o vínculo na análise", "adr-t-texto");
  const m=ult?cenMelhor(ult):null, data=(m&&m.data)||d.data_direito||null;
  const direito = !data ? tile("Atinge o direito", "—", ult?"sem data projetada":"nenhuma análise registrada")
    : tile("Atinge o direito", esc(fmt(data)),
        data<=hoje() ? "direito alcançado" : temAvisoApos(c.id, data) ? "em Aposentadorias futuras · aviso antes da data"
          : (n=>n<=1?"falta 1 mês":`faltam ${n} meses`)(mesesAte(data)), "adr-t-direito");
  return `<section class="adr-resumo" aria-label="Resumo do segurado">${idade}${tempo}${recolhe}${direito}</section>`;
}
function fichaDaAnalise(a){
  const d=a.detalhes||{}, sv=d.servico||{};
  const co=D.colPorId.get(a.autor_id);
  const cli=D.cliPorId.get(a.cliente_id)||{};
  const idade=idadeEm(cli.dn, a.data_analise);
  const fonte={previus:"Prévius", todo:"To Do"}[a.fonte]||"Manual";
  const fmtv={valor:moedaBR, data_direito:fmt, did:fmt, recolhe:rotRecolhe,
    ultima_contribuicao:x=>String(x).split("-").reverse().join("/")};
  const itens=["did","grau","tempo","carencia","valor","data_direito","recolhe","ultima_contribuicao"]
    .filter(k=>d[k]!=null && d[k]!=="")
    .map(k=>`<div><dt>${AD_ROT[k]}</dt><dd>${esc((fmtv[k]||String)(d[k]))}</dd></div>`).join("");
  const lista=(k, chave)=>(d[k]||[]).length ? `<div class="adr-per"><span class="adr-dt">${AD_ROT[k]}</span><ul>${
    d[k].map(p=>`<li>${p.inicio?esc(fmt(p.inicio)):"—"} a ${p.fim?esc(fmt(p.fim)):"—"}${p[chave]?` · ${esc(p[chave])}`:""}</li>`).join("")}</ul></div>` : "";
  return `<section class="adr-card adr-ficha" aria-labelledby="adr-t-ficha">
    <div class="adr-cab"><h2 class="adr-h" id="adr-t-ficha">${esc(sv.nome||"Análise de direito")}</h2>
      <span class="adr-chip">${fonte} · ${esc(fmt(a.data_analise))}${co?` · ${esc(co.nome.split(" ")[0])}`:""}</span>
      <span class="adr-acoes"><button type="button" class="adr-bt" onclick="copiarAnalise('${a.id}')">copiar</button>
        <button type="button" class="adr-bt" onclick="apagarAnalise('${a.id}')" title="apaga a análise (os comentários já gravados nos casos ficam)">apagar</button></span></div>
    <div class="ad-idade">${idade==null?"Idade na data da análise: sem data de nascimento na ficha":`Idade na data da análise: <b>${idade} anos</b>`}</div>
    ${a.contexto?`<div class="ad-contexto">${esc(a.contexto)}</div>`:""}
    ${itens?`<dl class="adr-dl">${itens}</dl>`:""}
    ${lista("periodos_especiais","empresa")}${lista("periodos_rurais","local")}
    ${d.modulos ? `<div class="adr-per adr-modulos"><span class="adr-dt">Análise por benefício</span><ul>
      <li>${esc(Object.entries(d.modulos.beneficios||{}).flatMap(([f, os])=>os.map(o=>(benefOpcao(f, o)||[,o])[1])).join("; ") || "sem benefício marcado")}</li>
      ${d.modulos.tempos && d.modulos.tempos.length ? `<li>${d.modulos.tempos.length} ${d.modulos.tempos.length===1?"período":"períodos"} de tempo · total para tempo comum ${esc(tempoFmt((d.modulos.totais||{}).comum||0))}</li>` : ""}</ul></div>` : ""}
    ${/* F236 · o que a análise gravou e a ficha não mostrava: o benefício aberto, os requisitos, a data do direito e os itens levados */""}
    ${(d.modulos||{}).requisitos ? `<div class="adr-per"><span class="adr-dt">Requisitos registrados${d.beneficio ? ` · ${esc(rotDaOpcao(d.beneficio))}` : ""}${d.modulos.quando ? ` · direito ${d.modulos.quando <= hoje() ? "desde" : "em"} ${esc(fmtBarra(d.modulos.quando))}` : ""}</span>${reqGravadosHtml(d)}</div>` : ""}
    ${(d.levados||[]).length ? `<details class="adr-per"><summary class="adr-dt">Levados do Primeiro atendimento (${d.levados.length})</summary><ul>${d.levados.map(x=>`<li>${esc(x.txt)}${x.fonte ? ` <small>· ${esc(x.fonte)}</small>` : ""}</li>`).join("")}</ul></details>` : ""}
  </section>`;
}
// barra de cada regra: 100% com o direito alcançado; antes, quanto do
// caminho entre a análise e a data já passou (entre 5% e 95%)
function pctRegra(cn, desde){
  if(!cn.data) return 0;
  if(cn.data<=hoje()) return 100;
  const total=(+cn.data.slice(0,4)-+desde.slice(0,4))*12 + (+cn.data.slice(5,7)-+desde.slice(5,7));
  if(total<=0) return 5;
  return Math.round(Math.min(95, Math.max(5, (1 - mesesAte(cn.data)/total)*100)));
}
function regrasDireito(a){
  const cs=a.cenarios||[]; if(!cs.length) return "";
  const m=cenMelhor(a);
  return `<section class="adr-card adr-regras" aria-labelledby="adr-t-regras">
    <div class="adr-cab"><h2 class="adr-h" id="adr-t-regras">Regras de aposentadoria</h2>
      <span class="meio-sub">quando cada regra é atingida, e o valor</span></div>
    <ol class="adr-regras-lista">${cs.map(cn=>{
      const pct=pctRegra(cn, a.data_analise||hoje()), ok=cn.data && cn.data<=hoje(), n=cn.data?mesesAte(cn.data):null;
      const sit=!cn.data ? "sem data projetada" : ok ? "direito alcançado" : n<=0 ? "é agora" : n===1 ? "falta 1 mês" : `faltam ${n} meses`;
      return `<li class="adr-regra${cn===m?" adr-melhor":""}${ok?" adr-ok":""}">
        <span class="adr-regra-nome"><b>${esc(cn.regra||"—")}</b>
          <span class="adr-sit">${cn===m?"melhor caminho · ":""}${sit}</span></span>
        <span class="adr-barra" role="img" aria-label="${esc(cn.regra||"regra")}: ${pct}% do caminho"><span style="width:${pct}%"></span></span>
        <span class="adr-data">${cn.data?esc(fmt(cn.data)):"—"}</span>
        <span class="adr-valor">${cn.valor?moedaBR(cn.valor):"—"}</span>
        <span class="adr-regra-acao">${cn.data && !ok ? (temAvisoApos(a.cliente_id, cn.data)
          ? `<span class="adr-chip ok">em Aposentadorias futuras</span>`
          : `<button type="button" class="adr-bt" title="cria o aviso no Meu Dia ${MESES_AVISO} meses antes da data, para comunicar o cliente"
            onclick="avisarCenario('${a.cliente_id}','${cn.data}','${escJs(cn.regra||"")}')"><span aria-hidden="true">Avisar</span><span class="sr-only">avisar na época</span></button>`) : ""}</span>
      </li>`; }).join("")}</ol>
  </section>`;
}
function planejamentoDireito(c, ult){
  const r=recolheDe(c, ult); if(!r || !recolheLivre(r.tipo)) return "";
  const pl=((ult&&ult.detalhes)||{}).plano||[];
  const lembs=lembretesDo(c.id);
  return `<section class="adr-card adr-plano" aria-labelledby="adr-t-plan">
    <h2 class="adr-h" id="adr-t-plan">Planejamento das contribuições</h2>
    <p class="adr-nota">Facultativo pode ficar até 6 meses sem recolher; contribuinte individual, até 12, mantendo a qualidade de segurado.</p>
    ${pl.length ? `<ul class="adr-plano-lista">${pl.slice().sort((x,y)=>(x.data||"")<(y.data||"")?-1:1).map(p=>{
      const tem=lembs.some(l=>(l.detalhes||{}).plano_item===p.id);
      return `<li><span class="adr-data">${p.data?esc(fmt(p.data)):"—"}</span><span class="adr-plano-txt">${esc(p.texto||"")}</span>
        ${tem?`<span class="adr-chip ok">em Aposentadorias futuras</span>`
          :p.data?`<button type="button" class="adr-bt" onclick="planoParaLembrete('${c.id}','${ult.id}','${escJs(p.id)}')" title="levar a Aposentadorias futuras"><span aria-hidden="true">Aposentadorias</span><span class="sr-only">levar a Aposentadorias futuras</span></button>`:""}</li>`; }).join("")}</ul>`
      : `<p class="meio-sub" style="margin:0">Nenhuma data planejada — registre no formulário da análise.</p>`}
  </section>`;
}
