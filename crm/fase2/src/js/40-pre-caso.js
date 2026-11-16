function mencionarRetorno(taId, boxId, cliId, id){
  const ta=document.getElementById(taId), c=D.colPorId.get(id); if(!ta || !c) return;
  ta.value = `${ta.value.trimEnd()} @${c.nome.split(" ")[0]}`; ta.focus(); sugerirRetorno(taId, boxId, cliId||null);
}
// a menção da anotação sem caso fica presa ao cliente (sem a coluna cliente_id, vai sem ela)
async function mencionarNoCliente(cliId, texto){
  const c = D.cliPorId.get(cliId);
  for(const co of equipeAtiva().filter(x=>x.id!==eu.id && new RegExp("@"+(x.nome||"").split(" ")[0]+"\\b","i").test(texto))){
    const corpo = {de_id:eu.id, para_id:co.id, cliente_id:cliId, texto:`${c?c.nome+": ":""}${texto.slice(0,200)}`};
    await api(`/rest/v1/mencoes`,{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(corpo)})
      .catch(()=>{ delete corpo.cliente_id; return api(`/rest/v1/mencoes`,{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(corpo)}).catch(()=>{}); });
  }
}
function arEscolher(cliId){
  arCliSel=cliId; arLead=null;
  document.getElementById("ar-achados").innerHTML="";
  document.getElementById("ar-busca").value=(D.cliPorId.get(cliId)||{}).nome||"";
  arMostrarAlvo();
  const ta=document.getElementById("ar-texto"); if(ta) ta.focus();
}
function arNaoCliente(){
  const nome=(document.getElementById("ar-busca").value||"").trim();
  if(!nome) return;
  arCliSel=null; arNovo=null; arLead={nome};
  document.getElementById("ar-achados").innerHTML="";
  arMostrarAlvo();
  const ta=document.getElementById("ar-texto"); if(ta) ta.focus();
}
function arMostrarAlvo(){
  const div=document.getElementById("ar-alvo"); if(!div) return;
  // F54 · quem entra novo (cliente ou interessado) entra com nome completo E
  // telefone — sem contato, o registro não serve para ligar de volta
  const telHtml=`<div class="form-linha" style="margin-top:6px;align-items:center">
    <input id="ar-tel" type="tel" placeholder="telefone com DDD" style="flex:1;min-width:170px">
  </div>`;
  if(arNovo){ div.innerHTML=`Cliente novo: <b>${esc(arNovo.nome)}</b>${telHtml}`; return; }
  if(arLead){ div.innerHTML=`Interessado: <b>${esc(arLead.nome)}</b>${telHtml}`; return; }
  if(!arCliSel){ div.innerHTML=""; return; }
  const ks=(D.casosDoCliente.get(arCliSel)||[]).filter(k=>k.fase!=="encerrado")
    .sort((a,b)=>(a.criado_em||"")<(b.criado_em||"")?1:-1);
  // F404 · sem escolher o caso, a anotação fica na ficha para distribuir depois (o botão do cabeçalho fica vermelho)
  div.innerHTML = ks.length
    ? `Caso: <select id="ar-caso" onchange="pintarCapturaAr()"><option value="">a distribuir</option>${ks.map(k=>`<option value="${k.id}">${esc(rotuloCasoEscolha(k))}</option>`).join("")}</select>`
    : `Sem caso: vai à ficha`;
}
// dois B31 abertos se distinguem pela fase e pelo número (teste 11.88, REC-05)
function rotuloCasoEscolha(k){
  const n = numerosDoCaso(k), [tipo, d] = n.proc[0] ? ["proc", n.proc[0]] : n.nup[0] ? ["nup", n.nup[0]]
          : n.nb[0] ? ["nb", n.nb[0]] : n.prot[0] ? ["prot", n.prot[0]] : [];
  return [k.apelido || tituloCaso(k), NOME_FASE[faseEfetiva(k)] || NOME_FASE[k.fase] || "", d ? fmtNum(tipo, d) : ""].filter(Boolean).join(" · ");
}
// F403 · o anexo da anotação rápida vai ao bucket e a anexos, preso ao cliente, ao caso e ao andamento quando houver
async function arSubir(cliId, casoId, andId, arqs){
  const feitos = [];
  for(const arq of arqs){
    if(arq.size > MAX_ARQ){ aviso("Arquivo grande demais (máximo 20 MB)"); continue; }
    const caminho = `${cliId}/${new Date().toISOString().replace(/[:.]/g,"-").toLowerCase()}-${nomeSeguro(arq.name)}`;
    try{ await subirArquivo(caminho, arq);
      const [an] = await api(`/rest/v1/anexos`,{method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({caso_id:casoId||null, cliente_id:cliId, autor_id:eu.id, nome:arq.name, caminho, tipo:arq.type||null, tamanho:arq.size,
          ...(andId ? {andamento_id:andId} : {})})});
      if(an){ (D.anexos = D.anexos||[]).unshift(an); feitos.push({id:an.id, nome:an.nome}); } }
    catch(e){ aviso("Um arquivo não subiu — anexe de novo"); }
  }
  return feitos;
}
async function salvarAnotacaoRapida(){
  const cli=arCliSel && D.cliPorId.get(arCliSel);
  const arqs=[...((document.getElementById("ar-arq")||{}).files||[])];
  if(arLead && arqs.length) return aviso("Interessado não recebe anexo: cadastre como cliente novo");
  if(!cli && !arLead && !arNovo)
    return aviso("Escolha o cliente na lista — ou crie o cadastro/interessado embaixo dela");
  const tCru=(document.getElementById("ar-texto").value||"").trim();
  const cap = capturaDoTexto(tCru, true), t = semEstrela(tCru);   // F446 · o * vira a ⭐ e sai do texto
  if(!t) return aviso("Escreva a anotação");
  // F53 · cliente NOVO no ato: cadastro mínimo (nome), a anotação já entra
  // como atendimento urgente, e a ficha abre para completar depois
  // F54 · telefone obrigatório para quem entra novo no sistema
  const arTelV=(document.getElementById("ar-tel")||{}).value||"";
  if((arNovo||arLead) && arTelV.replace(/\D/g,"").length<10)
    return aviso("Telefone com DDD é obrigatório para cadastrar");
  if(arNovo){
    const urg2=false;
    const imp2=document.getElementById("ar-imp").checked;
    let novoCli;
    try{
      [novoCli]=await api(`/rest/v1/clientes`,{method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({nome:arNovo.nome, telefone:arTelV.trim()})});
      if(!novoCli) throw new Error("sem retorno");
      const nota={em:new Date().toISOString(), quem:(eu.nome||"").split(" ")[0], autor_id:eu.id,
        texto:t, origem:"rapida"};
      if(urg2) nota.urgente=true;
      if(imp2) nota.importante=true;
      const anx = arqs.length ? await arSubir(novoCli.id, null, null, arqs) : [];
      if(anx.length) nota.anexos = anx;
      novoCli.campos={atendimento:[nota]};
      await api(`/rest/v1/clientes?id=eq.${novoCli.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({campos:novoCli.campos})});
    }catch(e){ return aviso("Não consegui cadastrar — tente de novo"); }
    D.clientes.push(novoCli); D.cliPorId.set(novoCli.id, novoCli);
    if(!D.casosDoCliente.has(novoCli.id)) D.casosDoCliente.set(novoCli.id, []);
    reindexarCliente(novoCli);
    arNovo=null; fecharCaixa(); plim();
    aviso(`Cliente novo cadastrado com a anotação${urg2?" 🔥":""} — complete a ficha`, false);
    montarSidebar(); abrirFicha(novoCli.id);
    return;
  }
  // F52 · não-cliente: vira interessado no funil, com a anotação como
  // interesse (o campo que o cartão do funil mostra) — nada se perde
  if(arLead){
    try{
      const [l]=await api(`/rest/v1/leads`,{method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({nome:arLead.nome, telefone:arTelV.trim()||null, origem:"ligação/balcão",
          beneficio_interesse:t.slice(0,80), responsavel_id:eu.id})});
      if(l) D.leads.unshift(l);
    }catch(e){ return aviso("Não consegui criar o interessado — tente de novo"); }
    arLead=null; fecharCaixa(); plim();
    aviso("Interessado no funil 💼 Vendas, com a anotação", false);
    montarSidebar(); render();
    return;
  }
  const urg=false;
  const imp=document.getElementById("ar-imp").checked;
  const selCaso=document.getElementById("ar-caso");
  try{
    if(selCaso && selCaso.value){
      const casoId=selCaso.value, k=D.casoPorId.get(casoId);
      const [and]=await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({caso_id:casoId, autor_id:eu.id, origem:"app", texto:t})})||[];
      if(and && /@\p{L}/u.test(t)) await criarMencoes(t, casoId, and.id);   // F236 · o @ da anotação rápida avisa a pessoa
      const lem = arLembrete() || (cap.data && cap.data.iso);   // F436 · o lembrete do ✨ Organizar; F446 · ou a data lida na frase
      const faz = cap.quem ? cap.quem.id : eu.id;   // F446 · o @ diz quem faz
      if(and && lem) try{ const [tf] = await api(`/rest/v1/andamento_tarefas`,{method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({andamento_id:and.id, caso_id:casoId, colaborador_id:faz, atribuido_por:eu.id, lembrar_em:lem, natureza:faz===eu.id ? "lembrete" : "compromisso"})}); tarefaNaMemoria(tf); }
        catch(e){ aviso("O lembrete não gravou: ponha a data no caso"); }
      const anx = arqs.length ? await arSubir(arCliSel, ehPreCaso(k) ? null : casoId, and && and.id, arqs) : [];
      // F403 · a cópia curta fica no cliente: é ela que o botão Anotações do cabeçalho lista e sinaliza
      const r = {em:new Date().toISOString(), quem:(eu.nome||"").split(" ")[0], autor_id:eu.id, texto:t, caso_id:casoId, and_id:and && and.id};
      if(imp) r.importante = true; if(anx.length) r.anexos = anx;
      cli.campos = {...(cli.campos||{}), rapidas:[...((cli.campos||{}).rapidas||[]), r].slice(-50)};
      await api(`/rest/v1/clientes?id=eq.${arCliSel}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({campos:cli.campos})}).catch(()=>{});
      if(urg||imp){
        const mud={}; if(urg) mud.urgente=true; if(imp) mud.importante=true;
        await api(`/rest/v1/casos?id=eq.${casoId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
          body:JSON.stringify(mud)});
        if(k) Object.assign(k, mud);
      }
      aviso(`Anotação registrada em ${k?tituloCaso(k):"caso"}${urg?" — caso marcado 🔥 URGENTE":imp?" — caso marcado ⭐":""}`, false);
    }else{
      const nota={em:new Date().toISOString(), quem:(eu.nome||"").split(" ")[0], autor_id:eu.id,
        texto:t, origem:"rapida"};
      if(urg) nota.urgente=true;
      if(imp) nota.importante=true;
      const anx = arqs.length ? await arSubir(arCliSel, null, null, arqs) : [];
      if(anx.length) nota.anexos = anx;
      const notas=[...((cli.campos||{}).atendimento||[]), nota];
      cli.campos={...(cli.campos||{}), atendimento:notas};
      await api(`/rest/v1/clientes?id=eq.${arCliSel}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({campos:cli.campos})});
      if(/@\p{L}/u.test(t)) await mencionarNoCliente(arCliSel, t);   // F236
      aviso(`Anotação${urg?" 🔥 urgente":""} guardada na ficha de ${(cli.nome||"").split(" ")[0]}`, false);
    }
  }catch(e){ return aviso("Não consegui guardar — tente de novo"); }
  const cliId=arCliSel; arCliSel=null;
  fecharCaixa(); plim();
  montarSidebar();
  if(clienteAberto===cliId) abrirFicha(cliId); else render();
}

function caixaAtendimento(c, ks){
  const semCaso = !(ks||[]).length;
  const campos=c.campos||{};
  // F30 · o fluxo do atendimento vale para TODO cliente: o novo (sem caso),
  // o que volta com caso andando e o que é só questão de lembretes — o
  // pré-caso novo pode nascer em qualquer um deles
  const pcs = precasosDe(c);
  const pcsVivos = pcs.filter(p=>!p.so_lembrete);
  const esp=(pcsVivos.find(p=>p.especie)||pcs[0]||{}).especie||campos.especie||"";
  const notas=campos.atendimento||[];
  const pedidos=campos.docs_pedidos||[];
  // F219 · onda 5: o pré-caso com etapas segue o modo atendimento; a mesa antiga recolhe documentos, análise e decisão
  // (a análise registrada pela própria mesa também grava etapas.analise; só o Concluir do modo atendimento muda o fluxo)
  const novoFluxo = pcsVivos.some(p=>p.etapas && Object.keys(p.etapas).some(k=>k!=="analise"));
  const cat=docDe(esp);
  const itens=((cat&&cat.itens)||"").split("\n").map(x=>x.trim()).filter(x=>x&&!x.startsWith("▸ "));
  const extras=((cat&&cat.extras)||"").split("\n").map(x=>x.trim()).filter(x=>x&&!x.startsWith("▸ "));
  const ehPgto = esp===ESPECIE_PAGAMENTOS;
  const ehIncap = e => /incapacidade|auxilio[ -]?doenca|invalidez/.test(dsa(e||""));
  const APOS_RX = /apos|tempo de contribui|por idade|especial|professor/i;
  // F55 · bloco resolvido recolhe numa linha verde que INFORMA a decisão
  // (o corpo fica no DOM; clicar na linha reabre — e o aberto persiste na
  // repintura via mesaAberta). Bloco pendente fica aberto como sempre.
  const dobra=(chave,feito,resumo,corpo)=>!feito?corpo
    :`<details class="mesa-feito" ${mesaAberta.has(chave)?"open":""} ontoggle="mesaDobra('${chave}',this.open)">
      <summary><span class="mf-ok">✔</span><span>${resumo}</span><span class="mf-troca">alterar</span></summary>${corpo}</details>`;
  const pcCompleto = p => !!(p.especie && p.natureza && (!ehIncap(p.especie)||(p.via&&p.cidade)));
  const NAT_ROT={concessao:"concessão",revisao:"revisão",acerto:"acerto"};

  // ── 1º · a espécie do benefício/serviço (com "outros") e a natureza ─────
  const card = pc => {
    const marcas = pc.marc||{};
    const eApos = APOS_RX.test(pc.especie||"");
    const quem = pc.quem && D.colPorId.get(pc.quem);
    const topicos = ["rural","especial","deficiencia"].filter(m=>marcas[m])
      .flatMap(m=>topicosDoMarcador(m).map(([,r,d])=>({m,r,d})));
    return `<div class="pc-cartao${pc.so_lembrete?" pc-lemb":""}">
      <div class="pc-cab">
        ${/* F128 · a espécie sai do MESMO catálogo do caso (famílias e
             subespécies); o clique abre a janela de escolher */""}
        <span class="esp-escolhida${pc.especie?"":" vazia"}">
          ${pc.especie
            ? `${pc.cod?`<span class="esp-cod-mini">${esc(pc.cod)}</span>`:""}<b>${esc(pc.especie)}</b>`
            : `<b>espécie ainda não definida</b>`}
          <button class="cad-mini" onclick="escolherEspeciePre('${c.id}','${pc.id}')"
            title="escolher no catálogo de espécies e subespécies do escritório">${pc.especie?"trocar":"escolher a espécie"}</button>
        </span>
        <span class="pc-nat">${[["concessao","concessão"],["revisao","revisão"],["acerto","acerto"]]
          .map(([v,r])=>`<button class="tri-e${pc.natureza===v?" on ok":""}"
            onclick="mudarPreCaso('${c.id}','${pc.id}','natureza','${pc.natureza===v?"":v}')">${r}</button>`).join("")}</span>
        ${pc.so_lembrete?`<span class="chip verde" title="virou lembrete — acompanhamos a data sem gerar caso">acompanhando em Aposentadorias futuras</span>
          <button class="cad-mini" onclick="voltarLembreteParaMesa('${c.id}','${pc.id}')"
            title="desfaz: o pré-caso volta à mesa do atendimento e o lembrete criado é desativado"><span aria-hidden="true">↺ Voltar</span><span class="sr-only">↺ voltar à mesa</span></button>`:""}
        <button class="cad-lap" style="margin-left:auto" title="tirar este pré-caso"
          onclick="tirarPreCaso('${c.id}','${pc.id}')">${CAD_IC.fechar}</button>
      </div>
      ${ehIncap(pc.especie)?`<div class="pc-marcas" style="border:1px solid var(--borda);border-left:3px solid var(--laranja);border-radius:8px;padding:6px 10px">
        <b>Benefício por incapacidade — qual a via?</b>
        ${[["adm","somente administrativo"],["jud","judicial"]].map(([v,r])=>
          `<button class="tri-e${pc.via===v?" on ok":""}"
            onclick="mudarPreCaso('${c.id}','${pc.id}','via','${pc.via===v?"":v}')">${r}</button>`).join("")}
        <span class="meio-sub">${pc.via==="adm"?"20% sobre as parcelas recebidas — procuração e contrato próprios"
          :pc.via==="jud"?"procuração e contrato judiciais"
          :"a via define os honorários e a procuração/contrato certos"}</span>
        <div class="form-linha" style="margin-top:6px;align-items:center">
          <label class="meio-sub" style="display:inline-flex;align-items:center;gap:4px">em qual cidade?
            <input value="${esc(pc.cidade||"")}" placeholder="cidade do cliente"
              style="min-width:160px" onchange="mudarPreCaso('${c.id}','${pc.id}','cidade',this.value.trim())"
              title="define a competência (Catanduva, Araraquara ou Ribeirão Preto) e o local da perícia"></label>
          ${pc.cidade?`<span class="meio-sub">a lista de documentos está no passo 2, já aberta</span>`:""}
        </div></div>`:""}
      ${eApos?`<div class="pc-marcas">envolve:
        ${[["rural","rural"],["especial","especial"],["deficiencia","deficiência"]].map(([m,r])=>
          `<label class="conta-ck"><input type="checkbox" ${marcas[m]?"checked":""}
            onchange="mudarPreCaso('${c.id}','${pc.id}','marc','${m}')">${r}</label>`).join("")}</div>`:""}
      ${topicos.length?`<ul class="pc-topicos">${topicos.map(t=>
        `<li><b>${esc(t.r)}</b> — ${esc(t.d)}</li>`).join("")}</ul>`:""}
      ${quem?`<div class="tri-assin">${esc(quem.nome)} · ${fmt(pc.em)}</div>`:""}
    </div>`;
  };

  // ── 4º · honorários: o padrão do escritório (o texto do contrato) e o
  //         ajuste combinado, que entra no contrato impresso ───────────────
  const blocoHonor = pc => {
    if(!pc || pc.so_lembrete || pc.especie===ESPECIE_PAGAMENTOS) return "";
    const vr = variantePorEspecie(pc.especie);
    const v = CONTRATO_VARIANTES[vr];
    // F55 · honorários é informação, não tarefa: vive recolhido numa linha
    // que já diz o combinado (padrão da casa ou o ajuste); abre só p/ mexer
    return dobra(`hon-${pc.id}`, true,
      `Honorários${pcsVivos.length>1?` — ${esc(pc.especie||"")}`:""} — ${pc.honorarios||pc.hon
        ?`combinado diferente: ${esc([resumoHon(pc.hon), pc.honorarios].filter(Boolean).join(" · "))}`
        :`Padrão do escritório: ${esc(HONOR_RESUMO[vr]||"")}${ehIncap(pc.especie)&&pc.via==="adm"?" (via administrativa: 20% sobre as parcelas recebidas)":""}`}`, `
    <div class="mesa-bloco mesa-b5">
      <div class="rotulo-caso">Honorários${pcsVivos.length>1?` — ${esc(pc.especie||"sem espécie")}`:""}</div>
      <p class="meio-sub" style="margin:2px 0 4px">Padrão do escritório para <b>${esc(v.rot)}</b>:
        ${esc(HONOR_RESUMO[vr]||"")}${ehIncap(pc.especie)&&pc.via==="adm"?" — <b>via administrativa: 20% sobre as parcelas recebidas</b>":""}</p>
      <details style="margin:2px 0 6px"><summary class="meio-sub" style="cursor:pointer">ver a cláusula completa do contrato</summary>
        <div class="meio-sub" style="white-space:pre-wrap;border-left:2px solid var(--borda);padding-left:8px;margin-top:4px">${esc(v.honor)}</div></details>
      <div class="form-linha">
        <input value="${esc(pc.honorarios||"")}" placeholder="alterar o combinado? escreva aqui — entra no contrato como disposição expressa em contrário"
          style="flex:1;min-width:240px"
          onchange="mudarPreCaso('${c.id}','${pc.id}','honorarios',this.value)">
      </div>
      ${pc.honorarios?`<p class="meio-sub" style="color:var(--verde);margin:2px 0 0">✓ o contrato impresso sai com este ajuste na cláusula de honorários</p>`:""}
      ${/* F181 · o combinado em campos: vira a cláusula do contrato e, com
           valor fixo e datas, os lançamentos da aba Honorários */""}
      <div class="hon-estr" id="hn-${pc.id}">
        <p class="meio-sub" style="margin:10px 0 6px">Combinado em campos — substitui a cláusula padrão no contrato;
          valor fixo com datas vira lançamento na aba Honorários.</p>
        <div class="adr-campos">
          ${[["nben","Primeiros benefícios (nº)","number","1"],["pct","% dos atrasados","number","0.5"],
             ["valor","Valor fixo (R$)","number","0.01"],["entrada","Entrada (R$)","number","0.01"],
             ["entrada_em","Data da entrada","date",""],["parcelas","Parcelas mensais (nº)","number","1"],
             ["primeira_em","1º vencimento","date",""]].map(([k,r,t,st])=>
            `<label class="adr-campo">${r}<input type="${t}" ${st?`step="${st}" min="0"`:""} data-hn="${k}"
              value="${esc(String(((pc.hon||{})[k])??""))}"></label>`).join("")}
        </div>
        <div class="form-linha" style="margin-top:8px">
          <button class="adr-bt adr-primario" onclick="salvarHonEstrut('${c.id}','${pc.id}')" title="Guardar no contrato">Guardar<span class="sr-only"> no contrato</span></button>
          ${pc.hon?`<button class="adr-bt" onclick="salvarHonEstrut('${c.id}','${pc.id}',true)" title="voltar ao padrão"><span aria-hidden="true">Restaurar</span><span class="sr-only">voltar ao padrão</span></button>`:""}
        </div>
        ${pc.hon?`<p class="meio-sub hon-estr-ok" style="margin:4px 0 0">O contrato sai com: ${esc(resumoHon(pc.hon))}</p>`:""}
      </div>
    </div>`);
  };

  // ── 5º · a decisão, por último: gerar o caso, só lembrete, ou não gerar ─
  const blocoDecisao = pc => {
    if(!pc || pc.so_lembrete) return "";
    if(pc.especie===ESPECIE_PAGAMENTOS) return "";
    const semVia = ehIncap(pc.especie) && !pc.via;
    const trava = !pc.especie ? "defina a espécie" : semVia ? "escolha a via (administrativo ou judicial)" : "";
    return `<div class="mesa-bloco mesa-b5">
      <div class="rotulo-caso">E agora?${pcsVivos.length>1?` — ${esc(pc.especie||"sem espécie")}`:""}</div>
      <p class="meio-sub" style="margin:2px 0 6px"><b>O caso será gerado somente quando o cliente assinar a
        procuração.</b> Gerar o caso abre o botão de documentos com as procurações e o contrato para imprimir.</p>
      <div class="form-linha pc-acao">
        ${/* F175 · o destino: as listas do caso, ou manter em Escritório */""}
        <select id="pcf-${pc.id}" aria-label="destino" onchange="const b=document.getElementById('pcb-${pc.id}');if(b)b.textContent=this.value==='escritorio'?'Manter em Escritório':'Gerar o caso'">${
          LISTAS_MOVER.filter(([,f])=>["inss","conselho","judicial","peticao_inicial"].includes(f))
          .map(([l,f])=>`<option value="${f}" ${(pc.via==="adm"&&f==="inss")||(pc.via==="jud"&&f==="peticao_inicial")?"selected":""}>${esc(semEmoji(l))}</option>`).join("")}
          <option value="escritorio">Manter em Escritório</option></select>
        <button id="pcb-${pc.id}" onclick="destinoDoPre('${c.id}','${pc.id}')" ${trava?`disabled title="${esc(trava)}"`:""}
          title="a procuração assinada gera o caso; as anotações viram andamentos com data e autor originais">
          Gerar<span class="sr-only"> o caso</span></button>
        <span class="pc-ou">ou</span>
        <input type="date" id="pcl-data-${pc.id}" min="${hoje()}" title="acompanhar em">
        <select id="pcl-resp-${pc.id}" title="quem avisa o cliente na data"><option value="">responsável…</option>
          ${equipeAtiva().map(x=>`<option value="${x.id}">${esc(x.nome.split(" ")[0])}</option>`).join("")}</select>
        <button class="btn-mini" onclick="preCasoParaLembrete('${c.id}','${pc.id}')"
          title="não gera caso: cria o lembrete (aposentadoria futura, pagar contribuições…) e abre a aba Aposentadorias futuras para as anotações de acompanhamento">
          <span aria-hidden="true">Lembrete</span><span class="sr-only">Somente gerar lembrete</span></button>
        <span class="pc-ou">ou</span>
        <button class="btn-mini" onclick="tirarPreCaso('${c.id}','${pc.id}')"
          title="o cliente não fechou: tira este pré-caso (as anotações ficam guardadas)">Não gerar</button>
      </div>
    </div>`;
  };

  // F30 · a triagem encerrada é a PRIMEIRA informação das Anotações — com o
  // botão de reabrir, porque o botão Triagem sumiu do trilho
  const t = triagemDe(c), tA = t.atendimento;
  const atencaoTri = tA ? triagemPassosDe(c, ks).filter(([k])=>(t[k]||{}).estado==="atencao") : [];
  return `<div class="caso caixa-atend" style="margin-bottom:12px;border-left:3px solid var(--azul)">
    <div class="rotulo-caso" style="display:flex;align-items:center;gap:10px">Atendimento${semCaso?` — ${esc(c.nome.split(" ")[0])} ainda não tem caso`:""}
      <span style="margin-left:auto">${botaoAbrirCnis(c, false)}</span></div>
    ${pcsVivos.length ? passosAtendimentoHtml(c, pcsVivos[0]) : ""}
    ${tA?`<div class="tri-resumo-anot" style="border:1px solid var(--borda);border-left:3px solid var(--verde);border-radius:8px;padding:8px 12px;margin:6px 0 10px;font-size:13px">
      <b>Triagem encerrada</b> em ${fmt(tA.em)}${(q=>q?` por ${esc(q.nome.split(" ")[0])}`:"")(D.colPorId.get(tA.quem)||null)}
      — ${tA.conferidos} de ${tA.passos} passos conferidos.
      ${atencaoTri.length?`<div style="margin-top:3px;color:var(--laranja)"><b>Atenção:</b> ${atencaoTri.map(([k2,r])=>esc(r)+((t[k2]||{}).nota?` (${esc(t[k2].nota)})`:"")).join("; ")}</div>`:""}
      <button class="cad-mini" style="margin-top:4px" onclick="reabrirTriagem('${c.id}')"
        title="o botão Triagem volta ao trilho para nova conferência"><span aria-hidden="true">Reabrir</span><span class="sr-only">reabrir triagem</span></button>
    </div>`:""}
    ${/* F55 · a linha-guia: UMA frase com o que falta neste atendimento —
         quem tem pouco contato lê o topo e sabe onde clicar */""}
    ${(()=>{
      const faltas=[];
      if(!pcsVivos.length) faltas.push("abrir o atendimento no passo 1 (+ novo caso/atendimento)");
      pcsVivos.forEach(p=>{
        const rot=p.especie?` de ${esc(p.especie)}`:"";
        if(!p.especie) faltas.push("definir a espécie (passo 1)");
        else if(!p.natureza) faltas.push(`marcar concessão/revisão${rot}`);
        if(p.especie&&ehIncap(p.especie)&&!p.via) faltas.push(`escolher a via${rot}`);
        if(p.especie&&ehIncap(p.especie)&&!p.cidade) faltas.push(`dizer a cidade${rot}`);
      });
      if(!novoFluxo && D.analises!==null && (analisesDe(c.id)[0]||{}).data_analise!==hoje())
        faltas.push("registrar a análise de direito (passo 4)");
      const nPend=(campos.atendimento||[]).filter(ehNotaPendente).length;
      if(nPend) faltas.push(`resolver ${nPend} pendência${nPend>1?"s":""} (passo 3)`);
      return faltas.length
        ?`<div class="mesa-guia falta"><b>Falta fazer:</b> ${faltas.join(" · ")}.</div>`
        :`<div class="mesa-guia pronta"><b>Fluxo em ordem</b> — só resta a decisão final, no fim da página (E agora?).</div>`;
    })()}
    <p class="meio-sub" style="margin:2px 0 8px">${semCaso
      ? `Isto <b>não é um caso</b>: fica guardado no cadastro enquanto o cliente busca os documentos.`
      : `O cliente já tem caso — um atendimento novo pode virar caso novo pelo +.`}</p>

    ${dobra("b1", pcsVivos.length>0 && pcsVivos.every(pcCompleto),
      `1 · De que se trata — ${pcsVivos.map(p=>[esc(p.especie),NAT_ROT[p.natureza]||"",
        p.via?(p.via==="adm"?"administrativo":"judicial"):"", p.cidade?esc(p.cidade):""]
        .filter(Boolean).join(" · ")).join("  |  ")}`, `
    <div class="pc-bloco mesa-bloco mesa-b1">
      <div class="rotulo-caso">1 · De que se trata${pcs.length>1?` (${pcs.length})`:""}</div>
      ${pcs.map(card).join("") || `<p class="meio-sub">Nenhum atendimento aberto — acrescente pelo +.</p>`}
      ${(lx=>lx&&lx.pc?`<p class="meio-sub" style="margin:4px 0"><button class="cad-mini"
        onclick="restaurarPreCaso('${c.id}')" title="a regra da volta: o que se tira se restaura">↺ restaurar o pré-caso
        removido</button> (${esc(lx.pc.especie||"sem espécie")} · tirado em ${fmt(lx.em)})</p>`:"")(campos.pc_lixeira)}
      <button class="cad-mini" onclick="novoPreCaso('${c.id}')" title="+ novo caso/atendimento"><span aria-hidden="true">+ Novo</span><span class="sr-only">+ novo caso/atendimento</span></button>
      <label class="cad-mini" style="cursor:pointer" title="anexar documento do cliente (o arquivo passa para o caso quando ele for gerado)">
        <input type="file" id="pc-arq" accept="image/*,application/pdf" style="display:none"
          onchange="anexarPreCaso('${c.id}')">📎 anexar documento</label>
      ${(D.anexos||[]).filter(a=>!a.caso_id).length?`<ul class="reg-avulso">${
        (D.anexos||[]).filter(a=>!a.caso_id).map(a=>`<li>
          <button class="arq-abrir" onclick="abrirAnexo('${a.id}')">${esc(a.nome)}</button>
          <small>${fmtTS(a.criado_em)}</small></li>`).join("")}</ul>`:""}
    </div>`)}
    ${/* F129 · parentes ou amigos: quem acompanha o cliente, também aqui */""}
    <div class="mesa-bloco mesa-b2">
      <div class="rotulo-caso">Parentes ou amigos</div>
      ${blocoParentes(c, null, "anot")}
    </div>

    ${ehPgto?`
    <div style="margin-top:10px;border-top:1px dashed var(--borda);padding-top:8px">
      <div class="rotulo-caso">Cronograma de pagamentos ao INSS</div>
      <p class="meio-sub" style="margin:2px 0 6px">Isto <b>não gera caso</b>: gera um lembrete com todas as
        competências, para avisar o cliente a cada vencimento.</p>
      <div class="form-linha" style="flex-wrap:wrap;align-items:center">
        <select id="at-gps"><option value="">categoria da GPS…</option>
          ${GPS_CATEGORIAS.map(([v,r])=>`<option value="${v}">${v} — ${r}</option>`).join("")}</select>
        <input id="at-valor" type="number" step="0.01" placeholder="R$ por parcela" style="width:130px">
        <input id="at-dia" type="number" min="1" max="28" value="15" title="dia do vencimento" style="width:70px">
        <label style="font-size:12px;color:var(--cinza)">1ª competência
          <input type="month" id="at-comp" value="${hoje().slice(0,7)}" style="display:block"></label>
        <label style="font-size:12px;color:var(--cinza)">parcelas
          <input type="number" id="at-qtd" min="1" max="60" value="12" style="display:block;width:80px"></label>
        <select id="at-passo" title="de quanto em quanto tempo">
          <option value="1" selected>mensal</option><option value="3">trimestral</option>
          <option value="6">semestral</option><option value="12">anual</option></select>
        <button onclick="criarCronogramaINSS('${c.id}')" title="Criar o lembrete com o cronograma"><span aria-hidden="true">Lembrete</span><span class="sr-only">Criar o lembrete com o cronograma</span></button>
      </div>
    </div>`:`
    ${/* F33 · o bloco nasce FECHADO (pedido do Paulo): a lista só aparece no
         clique, e o título resume o que há dentro — tela mais limpa */""}
    ${/* F54 · benefício por incapacidade: o checklist de documentos já nasce
         ABERTO — é o momento de pedir tudo, não de procurar onde clicar */""}
    ${novoFluxo ? `<div class="mesa-guia pronta mesa-novo"><b>Este atendimento segue no modo atendimento</b> — a lista de documentos, a análise e o desfecho estão em Documentos e na Análise de Direito.
      <button class="cad-mini" onclick="_atendAberto.add('${c.id}');irSubCad('documentos')" title="Abrir Documentos"><span aria-hidden="true">Documentos</span><span class="sr-only">Abrir Documentos</span></button></div>` : `
    <details ${ehIncap(esp)?"open":""} class="mesa-bloco mesa-b2">
      <summary class="rotulo-caso" style="cursor:pointer;display:list-item">2 · Documentos que o cliente vai trazer${
        esp&&(itens.length||extras.length)?` <span class="meio-sub" style="text-transform:none">— lista de ${itens.length+extras.length} itens${pedidos.length?` · já pedimos ${pedidos.reduce((n,p)=>n+(p.itens||[]).length,0)}`:""} (abre e fecha no toque)</span>`
        :` <span class="meio-sub" style="text-transform:none">— abre e fecha no toque</span>`}</summary>
      ${esp&&(itens.length||extras.length)?`
        <p class="meio-sub" style="margin:2px 0 6px">Marque, imprima para o cliente levar — e fica registrado no CRM o que pedimos.</p>
        <div id="at-docs" style="max-height:34vh;max-height:34dvh;overflow:auto">
          ${itens.map((it,i)=>`<label style="display:flex;gap:8px;align-items:flex-start;font-size:13px;padding:2px 0;cursor:pointer">
            <input type="checkbox" class="at-doc" checked value="${esc(it)}" style="margin-top:3px"><span>${esc(it)}</span></label>`).join("")}
          ${extras.length?`<div class="cc-tit" style="color:var(--laranja);padding:8px 0 3px">Conforme a atividade do cliente — marque o que se aplica</div>
            ${extras.map(it=>`<label style="display:flex;gap:8px;align-items:flex-start;font-size:13px;padding:2px 0;cursor:pointer">
              <input type="checkbox" class="at-doc" value="${esc(it)}" style="margin-top:3px"><span>${esc(it)}</span></label>`).join("")}`:""}
        </div>
        <div class="form-linha" style="margin-top:6px;align-items:center">
          <input id="at-doc-extra" placeholder="outro documento — Enter acrescenta" style="flex:1;min-width:200px"
            onkeydown="if(event.key==='Enter'){event.preventDefault();docExtraAtendimento();}">
          <label class="meio-sub" title="F93 · vencida a data, o pedido aparece no Meu Dia para cobrar">entrega até
            <input type="date" id="at-doc-ate" min="${hoje()}" value="${somaDias(hoje(),15)}"></label>
          <button onclick="pedirDocsAtendimento('${c.id}')" title="Imprimir e registrar o pedido">Imprimir<span class="sr-only"> e registrar o pedido</span></button>
        </div>`
      :`<p class="meio-sub">${esp?"Não há catálogo cadastrado para esta espécie — acrescente à mão o que o cliente precisa trazer."
        :"Defina a espécie acima para o sistema sugerir a lista do benefício."}</p>
        <div class="form-linha" style="margin-top:4px;align-items:center">
          <div id="at-docs"></div>
          <input id="at-doc-extra" placeholder="documento — Enter acrescenta" style="flex:1;min-width:200px"
            onkeydown="if(event.key==='Enter'){event.preventDefault();docExtraAtendimento();}">
          <label class="meio-sub" title="F93 · vencida a data, o pedido aparece no Meu Dia para cobrar">entrega até
            <input type="date" id="at-doc-ate" min="${hoje()}" value="${somaDias(hoje(),15)}"></label>
          <button onclick="pedirDocsAtendimento('${c.id}')" title="Imprimir e registrar o pedido">Imprimir<span class="sr-only"> e registrar o pedido</span></button>
        </div>`}
      ${pedidos.length?`<div style="margin-top:8px">
        <div class="meio-sub" style="margin-bottom:3px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">Já pedimos a ${esc(c.nome.split(" ")[0])}:
          ${pedidos.some(p=>(p.itens||[]).some(i=>!i.entregue))?`<button class="btn-mini" onclick="cobrarDocs('${c.id}','')"
            title="mensagem pronta no WhatsApp com os pendentes; a cobrança fica nas anotações"><span aria-hidden="true">📲 Cobrar</span><span class="sr-only">📲 cobrar pendentes</span></button>`:""}</div>
        <ul class="mov-lista">
          ${pedidos.map((p,pi)=>(p.itens||[]).map((it,ii)=>`<li>
            <span class="mov-data">${p.em?fmt(p.em.slice(0,10)):"—"}</span>
            <span class="mov-txt" style="${it.entregue?"text-decoration:line-through;color:var(--cinza)":""}">${esc(it.nome||it)}</span>
            ${p.ate&&!it.entregue?chipPrazo(p.ate, "entrega combinada até"):""}
            ${it.entregue?`<span class="chip verde" style="cursor:pointer" onclick="docEntregue('${c.id}',${pi},${ii})"
                title="marcado por engano? clique para desfazer">entregue ${fmt(it.entregue)} ↺</span>`
              :`<button class="btn-mini" onclick="docEntregue('${c.id}',${pi},${ii})">entregue</button>`}
          </li>`).join("")).join("")}
        </ul></div>`:""}
    </details>`}`}

    <div class="mesa-bloco mesa-b3">
      <div class="rotulo-caso">3 · Anotações deste atendimento</div>
      ${quadroPendencias(c)}
      <textarea id="at-nota" rows="3" placeholder="a anotação deste atendimento — cada assunto pode ser uma anotação separada; o + guarda e abre espaço para a próxima"
        style="width:100%;resize:vertical" oninput="sugerirRetorno('at-nota','at-sug','${c.id}')"></textarea>
      <div id="at-sug" class="meio-sub"></div>
      ${/* F55 · o rodapé em cápsulas: cada grupo faz UMA pergunta em bom
           português, e a frase-viva confirma o efeito antes do clique —
           quem tem pouco contato com o CRM lê e entende (pedido do Paulo) */""}
      <div class="caps-linha">
        ${pcs.length>1?`<div class="capsula"><span class="cap-perg">Sobre o quê?</span>
          <div class="cap-ctl"><select id="at-pc" onchange="atualizarFraseNota()">
            <option value="">(geral)</option>
            ${pcs.map(p=>`<option value="${p.id}">${esc(p.especie||"sem espécie")}</option>`).join("")}</select></div></div>`
          :`<input type="hidden" id="at-pc" value="">`}
        <div class="capsula"><span class="cap-perg">Como marcar?</span>
          <div class="cap-ctl">
            <label class="chip-marca"><input type="checkbox" id="at-imp" onchange="atualizarFraseNota()">⭐ importante</label>
            <label class="chip-marca fogo"><input type="checkbox" id="at-urg" onchange="atualizarFraseNota()">🔥 urgente</label>
            <label class="chip-marca" title="fica presa no quadro de pendências até alguém resolver"><input type="checkbox" id="at-pend" onchange="atualizarFraseNota()">⏳ pendência</label>
          </div></div>
        <div class="capsula"><span class="cap-perg">Quem cuida disso?</span>
          <div class="cap-ctl">
            ${equipeAtiva().map(x=>`<button class="at-eq-nome at-eq" data-atq="${x.id}"
              title="atribuir a ${esc(x.nome)}"
              onclick="this.classList.toggle('on');atQuemToggle('${x.id}')"><span class="fx-av tf-eq" style="--cor-eq:${x.cor}">${esc(x.inicial)}</span>${esc(x.nome.split(" ")[0])}</button>`).join("")}
            <button class="btn-rap" onclick="atQuemTodos()" title="a equipe inteira">👥 todos</button>
          </div>
          <span class="cap-dica">sem ninguém marcado, fica com quem escreveu</span></div>
        <div class="capsula"><span class="cap-perg">Lembrar quando?</span>
          <div class="cap-ctl">
            <button class="btn-rap" onclick="atLembrarDia(hoje())">Hoje</button>
            <button class="btn-rap" onclick="atLembrarDia(maisDias(1))">Amanhã</button>
            <button class="btn-rap" onclick="atLembrarDia(maisDias(7))">+7 dias</button>
            <input type="date" id="at-lembrar" min="${hoje()}" onchange="atualizarFraseNota()"
              title="cria o lembrete no Meu Dia dos responsáveis marcados">
          </div></div>
        <div class="capsula"><span class="cap-perg">⏰ Prazo fatal?</span>
          <div class="cap-ctl"><input type="date" id="at-prazo" min="${hoje()}" onchange="atualizarFraseNota()"
            title="prazo processual: a anotação sai com [PRAZO] e o caso vai para 🗓 Tarefas com Prazo">
            ${catalogoPrazoHtml("at")}</div>
          <span class="cap-dica">move o caso para 🗓 Tarefas com Prazo</span></div>
      </div>
      <div class="caps-linha" style="align-items:center">
        <span class="frase-viva" id="at-frase">Ao guardar: registra a anotação.</span>
        <label class="cad-mini" style="cursor:pointer" title="anexar documento junto desta conversa">
          <input type="file" id="pc-arq2" accept="image/*,application/pdf" style="display:none"
            onchange="anexarPreCaso('${c.id}','pc-arq2')">📎 anexar</label>
        <button class="btn-mini" onclick="salvarNotaAtendimento2('${c.id}')" title="+ Guardar anotação">+ Guardar<span class="sr-only"> anotação</span></button>
      </div>
      ${notas.length?`<ul class="mov-lista" style="margin-top:6px">
        ${notas.map((n,idx)=>({n,idx})).reverse().map(({n,idx})=>{
          const atrs = (n.atribuidos||[n.atribuido]).filter(Boolean)
            .map(id=>D.colPorId.get(id)).filter(Boolean);
          const pcDe = n.precaso_id && pcs.find(p=>p.id===n.precaso_id);
          return `<li>
          <span class="mov-data">${n.em?fmt(n.em.slice(0,10)):"—"}</span>
          <span class="mov-txt">${n.importante?"⭐ ":""}${n.urgente?"🔥 ":""}${
            /* F56 · a data de volta abre a linha com cor — futura em azul,
               vencida em vermelho; resolvida dispensa cobrança */
            n.lembrar_em&&!n.resolvida?(n.lembrar_em<hoje()
              ?`<span class="chip venceu-chip">⏰ venceu ${fmt(n.lembrar_em)}</span> `
              :`<span class="chip volta-chip">📅 volta ${fmt(n.lembrar_em)}</span> `):""}${
            n.quem?`<b>${esc(n.quem)}:</b> `:""}${esc(n.texto||"")}
            ${n.resolvida?`<span class="chip verde" title="resolvida por ${esc(n.resolvida.quem||"")}">resolvida ${fmt(n.resolvida.em)}</span>`
              :ehNotaPendente(n)?`<span class="chip laranja">pendente</span>`:""}
            ${pcDe?`<span class="chip ben">${esc(pcDe.especie||"pré-caso")}</span>`:""}
            ${atrs.map(at=>`<span class="avatar mini" style="background:${at.cor}" title="atribuída a ${esc(at.nome)}">${esc(at.inicial)}</span>`).join("")}
            ${n.lembrar_em&&n.resolvida?`<span class="chip neutro" title="tinha lembrete para esta data">🗓 ${fmt(n.lembrar_em)}</span>`:""}
            ${(n.checklist||[]).length?`<span class="nck-lista">${(n.checklist||[]).map((ck,ci)=>
              `<label class="conta-ck"><input type="checkbox" ${ck.feito?"checked":""}
                onchange="notaChecklistToggle('${c.id}',${idx},${ci})"><span style="${ck.feito?"text-decoration:line-through;color:var(--cinza-claro)":""}">${esc(ck.t)}</span></label>`).join("")}</span>`:""}
            <span class="nck-add"><input id="nck-${idx}" placeholder="+ item do checklist"
              onkeydown="if(event.key==='Enter'){event.preventDefault();notaChecklistItem('${c.id}',${idx});}"></span>
            ${(n.autor_id ? n.autor_id===eu.id : n.quem===(eu.nome||"").split(" ")[0])?`<button class="cad-lap" style="float:right"
              title="anotação sua, escrita por engano? apaga (a regra da volta)"
              onclick="apagarNotaAtendimento('${c.id}',${idx})">${CAD_IC.fechar}</button>`:""}
          </span></li>`;}).join("")}
      </ul>`:""}
    </div>

    ${/* F49 · a análise de direito NASCE AQUI, no primeiro atendimento, junto
         das anotações (pedido do Paulo) — os campos preenchíveis são os
         mesmos da aba ⚖️ (formAnalise), renderizados uma vez só: quando a
         aba 8 está ativa o formulário vive lá, não aqui (IDs únicos) */""}
    ${novoFluxo ? "" : dobra("b4", D.analises!==null && (analisesDe(c.id)[0]||{}).data_analise===hoje(),
      (()=>{const u=(analisesDe(c.id)||[])[0]||{},m=u.id?cenMelhor(u):null;
        return `4 · Análise de Direito — registrada hoje${m?` — melhor caminho: ${esc(m.regra||"")}${m.data?` em ${fmt(m.data)}`:""}`:""}`;})(), `
    <div class="mesa-bloco mesa-b4">
      <div class="rotulo-caso">4 · Análise de Direito deste atendimento</div>
      ${statusAnalise(c)}
      ${abaAtiva!==8 ? formAnalise(c)
        : `<p class="meio-sub">o formulário está aberto na aba Análise de Direito.</p>`}
    </div>`)}

    ${pcsVivos.map(blocoHonor).join("")}
    ${novoFluxo ? "" : pcsVivos.map(blocoDecisao).join("")}
    ${/* F31 · os documentos do escritório LOGO ABAIXO do criar caso: quem
         está gerando imprime a procuração, a declaração de pobreza e o
         contrato aqui mesmo, colhe a assinatura e clica Gerar o caso */""}
    ${(pcsVivos.length && !ehPgto && !novoFluxo) ? `<div style="margin-top:10px;border-top:1px dashed var(--borda);padding-top:8px">
      ${caixaDocumentos(c, ks)}
    </div>` : ""}
  </div>`;
}
function docExtraAtendimento(){
  const inp=document.getElementById("at-doc-extra");
  const v=(inp.value||"").trim(); if(!v) return;
  const lista=document.getElementById("at-docs"); if(!lista) return;
  lista.insertAdjacentHTML("beforeend",
    `<label style="display:flex;gap:8px;align-items:flex-start;font-size:13px;padding:2px 0;cursor:pointer">
      <input type="checkbox" class="at-doc" checked value="${esc(v)}" style="margin-top:3px"><span>${esc(v)}</span></label>`);
  inp.value=""; inp.focus();
}
// imprime a lista para o cliente levar E registra no CRM o que pedimos
// F219 · o quadro "Para o cliente providenciar" passa a espécie (uma ou mais, do catálogo)
async function pedirDocsAtendimento(cliId, espDada){
  const c=D.cliPorId.get(cliId); if(!c) return;
  // F235 · o que a análise pediu (quadro "Pedir ao cliente") entra na lista impressa junto com o catálogo
  const itens=[...document.querySelectorAll("#dq-prov .doc-pedidos .at-doc:checked, #at-docs .at-doc:checked")].map(x=>x.value).filter(Boolean);
  if(!itens.length) return aviso("Marque ao menos um documento");
  const esp=espDada||(c.campos||{}).especie||especieDoContrato(c, D.casosDoCliente.get(cliId)||[])||"benefício a definir";
  imprimirListaDocs(c, esp, itens, (docPorNome(esp)||{}).observacoes);
  const ate=(document.getElementById("at-doc-ate")||{}).value||null;   // F93
  const pedidos=[...((c.campos||{}).docs_pedidos||[]),
    {em:new Date().toISOString(), quem:(eu.nome||"").split(" ")[0], especie:esp,
     ...((pc0=>pc0 && pc0.id!=="legado" ? {precaso_id:pc0.id} : {})(preCasoAberto(c))),   // F236
     ...(ate?{ate}:{}), itens:itens.map(nome=>({nome, entregue:null}))}];
  c.campos={...(c.campos||{}), docs_pedidos:pedidos};
  try{
    await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({campos:c.campos})});
  }catch(e){ return aviso("Imprimiu, mas não consegui registrar o pedido — tente de novo"); }
  aviso(`${itens.length} documento(s) impressos e registrados como pedidos ao cliente`, false);
  abrirFicha(cliId);
}
async function docEntregue(cliId, pi, ii){
  const c=D.cliPorId.get(cliId); if(!c) return;
  const pedidos=JSON.parse(JSON.stringify((c.campos||{}).docs_pedidos||[]));
  if(!pedidos[pi] || !pedidos[pi].itens[ii]) return;
  // F35 · a regra da volta: marcar de novo DESMARCA — entregue por engano
  // volta a ser pendência do cliente
  pedidos[pi].itens[ii].entregue = pedidos[pi].itens[ii].entregue ? null : hoje();
  c.campos={...(c.campos||{}), docs_pedidos:pedidos};
  try{
    await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({campos:c.campos})});
  }catch(e){ return aviso("Não consegui gravar — tente de novo"); }
  abrirFicha(cliId);
}


// ══════════════════════════════════════════════════════════════════════════
// F246 · TROUXE DOCUMENTOS (pedido do Paulo, 19.10.2026). O cliente de dois ou três casos deixa papéis no balcão e a
// recepção não sabe de qual caso são. A janela junta o que cada caso pediu (os itens 📄 do checklist do caso e os
// pedidos do atendimento, `campos.docs_pedidos`, presos ao pré-caso); a recepção marca o que chegou e cada papel vai
// ao caso que o pediu: a juntada nasce lá, o pedido baixa, quem cuida é avisado. Papel do cliente (RG, CPF, endereço)
// vale para todos; papel que ninguém pediu ganha a sugestão do caso e o "Não sei de qual caso", que fica a classificar
// pelo advogado responsável. Ligações: a exigência do INSS oferece "cumprida", o papel médico lembra a perícia marcada
// e o aviso leva o prazo do caso; o contrato ou a procuração assinados entram em "Gerados e assinados".
// ══════════════════════════════════════════════════════════════════════════
const RX_DOC_PESSOAL = /^(rg|cpf|cnh|cin\b|carteira de identidade|documento de identidade|comprovante de (endere|resid)|certid[ãa]o de (nascimento|casamento)|t[íi]tulo de eleitor|biometria)/i;
const RX_DOC_MEDICO = /m[ée]dic|laudo|exame|relat[óo]rio|receita|resson[âa]ncia|eletroneuro|raio|tomografia|atestado|ultrass|ortoped|psiqui|cardio|neuro/i;
const RX_DOC_TEMPO = /ctps|carteira de trabalho|ppp|ltcat|carn[êe]|guia|gps|contribui|holerite|rais|v[íi]nculo|rescis/i;
let _td = null;   // {cliId, marc:Set, outros:[{nome, dest}], dest, assin}
function casosDoBalcao(cliId){
  const ks = (D.casosDoCliente.get(cliId)||[]).filter(k=>k.fase!=="encerrado");
  return ks.filter(k=>!ehPreCaso(k)).concat(ks.filter(ehPreCaso));
}
const rotTd = k => ehPreCaso(k) ? `Atendimento · ${(k.beneficio||((k.precaso||{}).especie)||"benefício a definir")}` : `${k.especie||""}${k.especie?" · ":""}${NOME_FASE[faseEfetiva(k)]||k.fase}`;
// os pedidos abertos do cliente, por caso: o checklist 📄 do caso e o pedido do atendimento (do pré-caso dele)
function pedidosDoBalcao(cliId){
  const c = D.cliPorId.get(cliId) || {}, ks = casosDoBalcao(cliId), grupos = new Map(), pessoais = new Map();
  const grupo = k => { if(!grupos.has(k.id)) grupos.set(k.id, {k, itens:[]}); return grupos.get(k.id); };
  const poe = (k, ref, nome, ate, pedido) => {
    if(RX_DOC_PESSOAL.test(nome)){ const ch = dsa(nome); if(!pessoais.has(ch)) pessoais.set(ch, {ch:`p:${ch}`, nome, ate, pedido, refs:[]});
      pessoais.get(ch).refs.push({...ref, casoId:k.id}); return; }
    const g = grupo(k), ch = `${k.id}:${dsa(nome)}`, ja = g.itens.find(x=>x.ch===ch);
    if(ja) ja.refs.push({...ref, casoId:k.id}); else g.itens.push({ch, nome, ate, pedido, refs:[{...ref, casoId:k.id}]}); };
  for(const k of ks.filter(k=>!ehPreCaso(k)))
    for(const t of (D.tarefas||[]).filter(t=>t.caso_id===k.id && !t.concluida && /^📄/.test(t.titulo||"")))
      poe(k, {tipo:"tarefa", id:t.id}, t.titulo.replace(/^📄\s*/, ""), t.prazo||null, "no checklist do caso");
  const pres = ks.filter(ehPreCaso);
  ((c.campos||{}).docs_pedidos||[]).forEach((p, pi)=>{
    const k = (p.caso_id && ks.find(x=>x.id===p.caso_id))   // F247 · o pedido feito no caso em andamento
      || pres.find(x=>(x.precaso||{}).id===p.precaso_id) || (pres.length===1 ? pres[0] : null) || pres[0] || ks[0]; if(!k) return;
    (p.itens||[]).forEach((it, ii)=>{ if(it && !it.entregue) poe(k, {tipo:"pedido", pi, ii}, String(it.nome||it), p.ate||null, `pedido em ${p.em ? fmt(String(p.em).slice(0,10)) : "atendimento"}${p.quem ? ` por ${p.quem}` : ""}`); }); });
  return {ks, grupos:[...grupos.values()], pessoais:[...pessoais.values()]};
}
// o caso que o papel não pedido provavelmente é: o médico vai ao de incapacidade; CTPS, PPP e carnê, ao de aposentadoria
function sugestaoDoBalcao(nome, ks){
  const vivos = ks.filter(k=>!ehPreCaso(k)).length ? ks.filter(k=>!ehPreCaso(k)) : ks;
  if(vivos.length===1) return vivos[0].id;
  if(RX_DOC_MEDICO.test(nome)){ const k = vivos.find(x=>ehIncap(x) || /bpc|loas|defici/i.test(x.beneficio||"")); if(k) return k.id; }
  if(RX_DOC_TEMPO.test(nome)){ const k = vivos.find(x=>/apos|tempo|idade|especial|ctc|revis/i.test(`${x.beneficio||""} ${x.especie||""}`) && !ehIncap(x)); if(k) return k.id; }
  return "";
}
function trouxeDocumentos(cliId){
  _td = {cliId, marc:new Set(), outros:[], dest:"", assin:false};
  pintarTrouxe();
}
function pintarTrouxe(){
  if(!_td) return;
  const c = D.cliPorId.get(_td.cliId); if(!c) return;
  const {ks, grupos, pessoais} = pedidosDoBalcao(_td.cliId), hj = hoje();
  const linha = it => { const on = _td.marc.has(it.ch);
    return `<button type="button" class="td-it${on?" on":""}" aria-pressed="${on}" onclick="tdMarcar('${esc(it.ch)}')"><span class="td-cx" aria-hidden="true">${on?"✓":""}</span>
      <span class="td-nm"><b>${esc(it.nome)}</b><small>${esc(it.pedido||"")}</small></span>${it.ate?`<span class="td-ate${it.ate<=somaDias(hj,3)?" perto":""}">até ${esc(fmtBarra(it.ate).slice(0,5))}</span>`:""}</button>`; };
  const bloco = (rot, nota, itens, cls) => itens.length ? `<section class="td-g"><div class="td-g-cab"><span class="td-selo ${cls||""}">${esc(rot)}</span><span class="meio-sub">${esc(nota)}</span></div>${itens.map(linha).join("")}</section>` : "";
  const nada = !grupos.some(g=>g.itens.length) && !pessoais.length;
  const destOps = ks.map(k=>`<option value="${k.id}">${esc(rotTd(k))}</option>`).join("");
  const sug = _td.outroTxt ? sugestaoDoBalcao(_td.outroTxt, ks) : "";
  const vai = resumoTrouxe(ks, grupos, pessoais);
  // aberta, troca só o conteúdo (o caixa() de novo repetia a animação de abrir a cada clique)
  const ja = document.querySelector("#modal .td"), rolagem = ja ? ja.closest(".modal-cx") : null, y = rolagem ? rolagem.scrollTop : 0;
  (ja ? (h => { ja.outerHTML = h; if(rolagem) rolagem.scrollTop = y; }) : caixa)(`<div class="td" role="dialog" aria-labelledby="td-t">
    <h3 id="td-t" style="margin:0 0 4px">O que ${esc((c.nome||"").split(" ")[0])} trouxe?</h3>
    <p class="meio-sub" style="margin:0 0 10px">Marque o que chegou. Cada papel já sabe de qual caso é, pelo que o caso pediu: não precisa escolher o caso.</p>
    ${nada ? `<p class="meio-sub td-vazio">Nenhum caso deste cliente tem papel pedido em aberto. Escreva abaixo o que chegou.</p>` : ""}
    ${grupos.map(g=>bloco(rotTd(g.k), ehPreCaso(g.k) ? "pedido no atendimento" : (g.k.etapa||""), g.itens, ehPreCaso(g.k) ? "pre" : faseEfetiva(g.k))).join("")}
    ${bloco(ks.length>1 ? "Do cliente · todos os casos" : "Do cliente", "papel pessoal, vale para todos", pessoais, "cli")}
    <div class="td-outro">
      <label for="td-outro-txt">Outro papel</label>
      <input id="td-outro-txt" value="${esc(_td.outroTxt||"")}" placeholder="o que não estava pedido, por exemplo receita do ortopedista" oninput="_td.outroTxt=this.value;tdOutroSel()">
      <span id="td-outro-box"${(_td.outroTxt||"").trim() ? "" : " hidden"}><select id="td-outro-dest" aria-label="de qual caso é" onchange="_td.dest=this.value;_td.destMao=true;tdResumo()">
        <option value="">escolha o caso…</option>${destOps}<option value="naosei">Não sei de qual caso</option></select>
        <button type="button" class="btn-mini" onclick="tdOutroAdd()">acrescentar</button></span>
    </div>
    ${_td.outros.length ? `<ul class="td-outros">${_td.outros.map((o, i)=>`<li><b>${esc(o.nome)}</b> → ${o.dest==="naosei" ? "a classificar pelo advogado responsável" : esc(rotTd(D.casoPorId.get(o.dest)||{}))}
      <button type="button" class="adr-link" onclick="_td.outros.splice(${i},1);pintarTrouxe()">tirar</button></li>`).join("")}</ul>` : ""}
    <div class="td-arq"><label class="btn-mini" for="td-arq">Fotografar ou anexar</label>
      <input type="file" id="td-arq" accept="image/*,application/pdf" capture="environment" multiple style="display:none" onchange="_td.arqs=[...this.files];pintarTrouxeArq()">
      <span id="td-arq-n" class="meio-sub">${(_td.arqs||[]).length ? `${_td.arqs.length} arquivo(s) para juntar` : "opcional: a foto ou o PDF vai junto da juntada"}</span>
      <label class="td-assin"><input type="checkbox" ${_td.assin?"checked":""} onchange="_td.assin=this.checked"> é contrato ou procuração assinados</label></div>
    <div class="td-pe"><span><small class="meio-sub">Vai para</small><br><span class="td-vai">${esc(vai || "nada marcado ainda")}</span></span>
      <button type="button" class="pa-prim td-reg" ${vai?"":"disabled"} onclick="registrarTrouxe()" title="Registrar a entrega">Registrar<span class="sr-only"> a entrega</span></button></div>
  </div>`);
  const sel = document.getElementById("td-outro-dest"); if(sel){ sel.value = _td.dest || sug; _td.dest = sel.value; }
}
// o papel não pedido: a caixa do caso aparece com a sugestão, sem redesenhar a janela (o redesenho no meio do clique perdia o clique)
function tdOutroSel(){
  const box = document.getElementById("td-outro-box"), sel = document.getElementById("td-outro-dest"); if(!box || !sel || !_td) return;
  const txt = String(_td.outroTxt||"").trim(); box.hidden = !txt;
  if(!_td.destMao){ _td.dest = txt ? sugestaoDoBalcao(txt, casosDoBalcao(_td.cliId)) : ""; sel.value = _td.dest; }
  tdResumo();
}
function tdResumo(){
  const el = document.querySelector(".td-pe .td-vai"), bt = document.querySelector(".td-reg"); if(!el || !_td) return;
  const {ks, grupos, pessoais} = pedidosDoBalcao(_td.cliId), v = resumoTrouxe(ks, grupos, pessoais);
  el.textContent = v || "nada marcado ainda"; if(bt) bt.disabled = !v;
}
function pintarTrouxeArq(){ const n = document.getElementById("td-arq-n"); if(n) n.textContent = `${(_td.arqs||[]).length} arquivo(s) para juntar`; }
function tdMarcar(ch){ if(!_td) return; _td.marc.has(ch) ? _td.marc.delete(ch) : _td.marc.add(ch); pintarTrouxe(); }
function tdOutroAdd(){
  const nome = String(_td.outroTxt||"").trim(); if(!nome) return;
  if(!_td.dest) return aviso("Escolha de qual caso é, ou “Não sei de qual caso”");
  _td.outros.push({nome, dest:_td.dest}); _td.outroTxt = ""; _td.dest = ""; _td.destMao = false; pintarTrouxe();
}
// para onde vai cada coisa marcada: {casoId: [nomes]}, e os a classificar
function destinoTrouxe(ks, grupos, pessoais){
  const por = new Map(), add = (id, nome) => { if(!por.has(id)) por.set(id, []); if(!por.get(id).includes(nome)) por.get(id).push(nome); };
  for(const g of grupos) for(const it of g.itens) if(_td.marc.has(it.ch)) add(g.k.id, it.nome);
  const vivos = ks.filter(k=>!ehPreCaso(k)).length ? ks.filter(k=>!ehPreCaso(k)) : ks;
  for(const it of pessoais) if(_td.marc.has(it.ch)) for(const k of vivos) add(k.id, it.nome);
  const pendente = String(_td.outroTxt||"").trim() && _td.dest ? [{nome:_td.outroTxt.trim(), dest:_td.dest}] : [];
  const naosei = [];
  for(const o of _td.outros.concat(pendente)) o.dest==="naosei" ? naosei.push(o.nome) : add(o.dest, o.nome);
  return {por, naosei};
}
function resumoTrouxe(ks, grupos, pessoais){
  const {por, naosei} = destinoTrouxe(ks, grupos, pessoais);
  return [...[...por].map(([id, ns])=>`${rotTd(D.casoPorId.get(id)||{})} (${ns.length})`), naosei.length ? `a classificar (${naosei.length})` : ""].filter(Boolean).join(" · ");
}
async function registrarTrouxe(){
  if(!_td) return;
  const cliId = _td.cliId, c = D.cliPorId.get(cliId); if(!c) return;
  const {ks, grupos, pessoais} = pedidosDoBalcao(cliId), {por, naosei} = destinoTrouxe(ks, grupos, pessoais);
  if(!por.size && !naosei.length) return aviso("Marque o que chegou");
  const btn = document.querySelector(".td-reg"); if(btn){ btn.disabled = true; btn.textContent = "Registrando…"; }
  const hj = hoje(), agora = new Date().toISOString(), advId = advogadoDoCliente(cliId)[0];
  // 1 · a baixa nos pedidos: o item 📄 do caso é concluído e o pedido do atendimento ganha a data da entrega
  const marcados = [...grupos.flatMap(g=>g.itens), ...pessoais].filter(it=>_td.marc.has(it.ch));
  const camposPed = JSON.parse(JSON.stringify((c.campos||{}).docs_pedidos||[])); let mudouPed = false;
  for(const it of marcados) for(const r of it.refs){
    if(r.tipo==="tarefa"){ const t = (D.tarefas||[]).find(x=>x.id===r.id); if(t){ t.concluida = true; t.concluida_em = agora; }
      await api(`/rest/v1/tarefas?id=eq.${r.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({concluida:true, concluida_em:agora})}).catch(()=>{}); }
    else if(camposPed[r.pi] && camposPed[r.pi].itens[r.ii]){ camposPed[r.pi].itens[r.ii].entregue = hj; mudouPed = true; } }
  if(mudouPed){ c.campos = {...(c.campos||{}), docs_pedidos:camposPed};
    await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({campos:c.campos})}).catch(()=>{}); }
  // 2 · a juntada em cada caso, com o que importa a quem cuida: a perícia marcada e o prazo do caso
  const juntadas = [], exig = [];
  const lista = ns => ns.length===1 ? ns[0] : `${ns.slice(0, -1).join(", ")} e ${ns[ns.length-1]}`;
  for(const [casoId, nomes] of por){
    const k = D.casoPorId.get(casoId); if(!k) continue;
    const per = (D.eventos||[]).filter(e=>e.caso_id===casoId && ehPericiaInss(e) && !/cancel/.test(e.status||"") && dataSP(e.data_hora)>=hj).sort((a,b)=>String(a.data_hora).localeCompare(String(b.data_hora)))[0];
    const pz = [k.exigencia_prazo, k.prazo].filter(d=>d && d>=hj).sort()[0];
    const adv = D.colPorId.get(advId);
    const texto = `Juntada: ${lista(nomes)}, entregue${nomes.length>1?"s":""} pela cliente no balcão.`
      + (per && nomes.some(n=>RX_DOC_MEDICO.test(n)) ? ` Levar na perícia de ${fmtBarra(dataSP(per.data_hora))}.` : "")
      + (pz ? ` Prazo do caso: ${fmtBarra(pz)}.` : "")
      + (adv && adv.id!==eu.id ? ` @${adv.nome.split(" ")[0]}` : "");
    let and = null;
    try{ [and] = await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({caso_id:casoId, autor_id:eu.id, texto})}); }catch(e){}
    if(!and) continue;
    juntadas.push({k, and});
    if(adv && adv.id!==eu.id) criarMencoes(texto, casoId, and.id, [adv.id]).catch(()=>{});
    if(emExigencia(k)) exig.push(k);
  }
  // 3 · o papel que ninguém sabe de qual caso é: fica a classificar, e o advogado responsável decide
  if(naosei.length){
    const k0 = ks.find(k=>!ehPreCaso(k)) || ks[0];
    if(k0){ const adv = D.colPorId.get(advId);
      const texto = `A classificar: ${lista(naosei)}, entregue${naosei.length>1?"s":""} pela cliente no balcão. De qual caso é?${adv && adv.id!==eu.id ? ` @${adv.nome.split(" ")[0]}` : ""}`;
      let and = null;
      try{ [and] = await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({caso_id:k0.id, autor_id:eu.id, texto, importante:true})}); }catch(e){}
      if(and){ juntadas.push({k:k0, and, classificar:true});
        if(adv && adv.id!==eu.id) criarMencoes(texto, k0.id, and.id, [adv.id]).catch(()=>{});
        const lst = [...(((c.campos||{}).a_classificar)||[]), {and_id:and.id, nomes:naosei, em:hj, quem:(eu.nome||"").split(" ")[0]}];
        c.campos = {...(c.campos||{}), a_classificar:lst};
        await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({campos:c.campos})}).catch(()=>{}); } }
  }
  // 4 · os arquivos vão junto da juntada do caso com mais papéis; contrato ou procuração assinados entram em Gerados e assinados
  const alvo = juntadas.filter(j=>!j.classificar).sort((a,b)=>(por.get(b.k.id)||[]).length - (por.get(a.k.id)||[]).length)[0] || juntadas[0];
  for(const arq of (_td.arqs||[])){
    if(!alvo) break;
    if(arq.size > MAX_ARQ){ aviso("Arquivo grande demais (máximo 20 MB)"); continue; }
    const stamp = new Date().toISOString().replace(/[:.]/g,"-").toLowerCase();
    const caminho = _td.assin ? `assinados/${cliId}/${hj}-${nomeSeguro(arq.name)}` : `${cliId}/${stamp}-${nomeSeguro(arq.name)}`;
    const nome = _td.assin ? `${/procura/i.test(arq.name) ? "Procuração assinada" : "Contrato assinado"} · ${arq.name}` : arq.name;
    try{ await subirArquivo(caminho, arq);
      const [an] = await api(`/rest/v1/anexos`,{method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({caso_id:ehPreCaso(alvo.k) ? null : alvo.k.id, cliente_id:cliId, autor_id:eu.id, nome, caminho, tipo:arq.type||null, tamanho:arq.size,
          andamento_id:alvo.and.id, ...(_td.assin ? {origem:"assinado"} : {})})});
      if(an) (D.anexos = D.anexos||[]).unshift(an); }
    catch(e){ aviso("Um arquivo não subiu — anexe de novo pelo caso"); }
  }
  _td = null;
  fecharCaixa();
  if(clienteAberto===cliId) await abrirFicha(cliId); else { montarSidebar(); render(); }
  const msg = `Entrega registrada em ${juntadas.filter(j=>!j.classificar).length} ${juntadas.filter(j=>!j.classificar).length===1?"caso":"casos"}${naosei.length?" · 1 papel a classificar":""}`;
  // a exigência do INSS: entregue o papel, falta protocolar; o botão marca quando protocolar
  if(exig.length) caixa(`<h3 style="margin:0 0 6px">${esc(msg)}</h3>
    <p class="meio-sub" style="margin:0 0 10px">${exig.length===1?"Este caso está":"Estes casos estão"} em exigência do INSS. Depois de protocolar os papéis no Meu INSS, marque a exigência como cumprida.</p>
    <div class="esp-lista">${exig.map(k=>`<button type="button" class="esp-it" onclick="fecharCaixa();cumprirExigencia('${k.id}')">✔ Exigência cumprida · ${esc(rotTd(k))}${k.exigencia_prazo?` (até ${fmtBarra(k.exigencia_prazo)})`:""}</button>`).join("")}</div>`);
  else aviso(msg, false);
}
// o papel a classificar aparece em todos os casos do cliente, com um botão por caso
function bannerAClassificar(k){
  const c = k && D.cliPorId.get(k.cliente_id), lst = (((c||{}).campos||{}).a_classificar)||[];
  if(!lst.length) return "";
  const ks = casosDoBalcao(k.cliente_id).filter(x=>!ehPreCaso(x));
  return lst.map((x, i)=>`<div class="td-classif" role="note"><span class="td-selo pre">a classificar</span>
    <span>${esc((x.nomes||[]).join(", "))} · entregue em ${esc(fmtBarra(x.em))}${x.quem?` (${esc(x.quem)})`:""}. De qual caso é?</span>
    <span class="td-classif-bts">${ks.map(y=>`<button type="button" class="btn-mini" onclick="classificarPapel('${k.cliente_id}',${i},'${y.id}')">${esc(rotTd(y))}</button>`).join("")}</span></div>`).join("");
}
async function classificarPapel(cliId, i, casoId){
  const c = D.cliPorId.get(cliId); if(!c) return;
  const lst = [...(((c.campos||{}).a_classificar)||[])], x = lst[i]; if(!x) return;
  lst.splice(i, 1);
  c.campos = {...(c.campos||{}), a_classificar:lst.length ? lst : undefined};
  await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({campos:c.campos})}).catch(()=>{});
  const a = (D._andsFicha||[]).find(y=>y.id===x.and_id);
  if(a && a.caso_id!==casoId) return levarAndamento(x.and_id, casoId);
  aviso("Classificado ✔", false); repintarFicha();
}
// modelos de documentos ({nome},{cpf},{nb}... preenchidos com o cliente)
function preencherDoc(conteudo, c, k){
  const dataExt=new Date(hoje()+"T12:00:00").toLocaleDateString(IDIOMA,{day:"numeric",month:"long",year:"numeric"});
  const mapa={
    "{nome}": c?c.nome:"", "{primeiro_nome}": c?c.nome.split(" ")[0]:"",
    "{cpf}": c?fmtCpf(c.cpf):"", "{endereco}": (c&&c.endereco)||"____________________",
    "{telefone}": (c&&c.telefone)||"", "{nb}": (k&&k.nb)||"____________",
    "{processo}": (k&&k.processo)||"____________", "{beneficio}": (k&&k.beneficio)||"benefício previdenciário",
    "{data}": dataExt,
  };
  return Object.entries(mapa).reduce((t,[ph,v])=>t.split(ph).join(v), conteudo);
}
function gerarDocumento(modeloId, cliId){
  const m=D.docModelos.find(x=>x.id===modeloId), c=D.cliPorId.get(cliId);
  if(!m||!c) return;
  const k=(D.casosDoCliente.get(cliId)||[]).find(x=>x.fase!=="encerrado");
  const corpo=preencherDoc(m.conteudo, c, k);
  const w=window.open("","_blank");
  if(!w) return aviso("O navegador bloqueou a janela — libere os pop-ups deste site");
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
  <title>${esc(m.titulo)} — ${esc(c.nome)}</title><style>
    body{font-family:var(--f-tit,Georgia,serif);max-width:700px;margin:40px auto;color:#111;line-height:1.8;font-size:15px}
    pre{white-space:pre-wrap;font:inherit}
    @media print{body{margin:15mm}}
  </style></head><body><pre>${esc(corpo)}</pre>
  <script>window.print()<\/script></body></html>`);
  w.document.close();
}

// documentos por benefício -> carta imprimível para o cliente
function docDe(beneficio){
  if(!beneficio) return null;
  const b=dsa(beneficio);
  return D.docs.find(d=>dsa(d.beneficio)===b)
      || D.docs.find(d=>b.includes(dsa(d.beneficio)) || dsa(d.beneficio).includes(b));
}
// ── 📄 SOLICITAR DOCUMENTOS NO MEIO DA ANOTAÇÃO (pedido do Paulo) ────────
// Atendendo um cliente ANTIGO, a solicitação de documentos nasce onde a
// anotação está sendo escrita: a janelinha lista o catálogo do benefício,
// o que for marcado entra na anotação ("Solicitei os documentos: ...") e
// vira checklist do caso NA HORA — e o texto já digitado fica intacto
// (nada de repintar a ficha no meio do atendimento).
function janelaDocsAnotacao(){
  const k = casoSel && casoSel!=="__auto__" && D.casoPorId.get(casoSel);
  if(!k) return aviso("Escolha um processo no menu ⚖️ primeiro");
  const cat = docDe(k.beneficio);
  const itens = ((cat&&cat.itens)||"").split("\n").map(x=>x.trim())
    .filter(x=>x && !x.startsWith("▸ "));
  const ja = new Set(D.tarefas.filter(t=>t.caso_id===k.id).map(t=>dsa(t.titulo)));
  caixa(`<h3 style="margin:0 0 4px">📄 Solicitar documentos — ${esc(tituloCaso(k))}</h3>
    <p class="meio-sub" style="margin:0 0 8px">O que marcar entra na anotação e no checklist do caso.
      ${itens.length?"Sugestão do catálogo do benefício:":"Sem catálogo para este benefício — acrescente à mão."}</p>
    <div id="jd-lista" style="max-height:44vh;max-height:44dvh;overflow:auto">
      ${itens.map(it=>`<label style="display:flex;gap:8px;padding:3px 0;font-size:13px;align-items:baseline">
        <input type="checkbox" class="jd-doc" value="${esc(it)}">${esc(it)}${
        ja.has(dsa(it))?` <small style="color:var(--cinza)">(já no checklist)</small>`:""}</label>`).join("")}
    </div>
    <div class="form-linha" style="margin-top:8px">
      <input id="jd-extra" placeholder="＋ outro documento — Enter acrescenta" style="flex:1"
        onkeydown="if(event.key==='Enter'){event.preventDefault();docExtraAnotacao();}">
    </div>
    ${/* F93 · o pedido tem data: vencida, o item aparece no Meu Dia para
         cobrar — a cobrança deixa de depender de alguém lembrar */""}
    <div class="form-linha" style="margin-top:8px;align-items:center">
      <span class="cap-perg">O cliente entrega até</span>
      <input type="date" id="jd-ate" min="${hoje()}" value="${somaDias(hoje(),15)}">
      <button class="btn-mini" onclick="document.getElementById('jd-ate').value='${somaDias(hoje(),7)}'">+7 dias</button>
      <button class="btn-mini" onclick="document.getElementById('jd-ate').value='${somaDias(hoje(),15)}'">+15 dias</button>
      <button class="btn-mini" onclick="document.getElementById('jd-ate').value='${somaDias(hoje(),30)}'">+30 dias</button>
      <span class="meio-sub">sem data, o item fica no checklist sem cobrança</span>
    </div>
    <div class="form-linha" style="margin-top:12px">
      <button class="btn-rap" onclick="fecharCaixa()">cancelar</button>
      <button style="margin-left:auto;padding:9px 18px;border:none;border-radius:8px;background:var(--azul);color:#fff;font-weight:600;cursor:pointer"
        onclick="solicitarDocsAnotacao('${k.id}')" title="Solicitar (anotação + checklist)">Solicitar<span class="sr-only"> (anotação + checklist)</span></button>
    </div>`);
}
function docExtraAnotacao(){
  const inp=document.getElementById("jd-extra");
  const v=(inp.value||"").trim(); if(!v) return;
  document.getElementById("jd-lista").insertAdjacentHTML("beforeend",
    `<label style="display:flex;gap:8px;padding:3px 0;font-size:13px;align-items:baseline">
      <input type="checkbox" class="jd-doc" checked value="${esc(v)}">${esc(v)}</label>`);
  inp.value=""; inp.focus();
}
async function solicitarDocsAnotacao(casoId){
  const sel=[...document.querySelectorAll(".jd-doc:checked")].map(x=>x.value);
  if(!sel.length) return aviso("Marque ao menos um documento");
  const ja=new Set(D.tarefas.filter(t=>t.caso_id===casoId).map(t=>dsa(t.titulo)));
  const ate=(document.getElementById("jd-ate")||{}).value||null;   // F93
  let novos=0;
  try{
    for(const titulo of sel){
      if(ja.has(dsa(titulo))) continue;            // repetir não duplica
      const [t]=await api(`/rest/v1/tarefas`,{method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({caso_id:casoId, titulo, ...(ate?{prazo:ate}:{})})});
      if(t){ D.tarefas.push(t); novos++; }
    }
  }catch(e){ return aviso("Não consegui criar o checklist: "+String(e.message||e).slice(0,100)); }
  // entra na ANOTAÇÃO em curso, preservando o que já estava digitado — o
  // migrar reconhece a frase e não recria os itens na sincronização
  const ta=document.getElementById("and-texto");
  if(ta){
    // a data vai ANTES dos dois-pontos: o migrar.py separa os itens por ";"
    // depois deles, e uma data colada no último item viraria item novo
    const frase=`Solicitei os documentos${ate?` (entrega até ${fmt(ate)})`:""}: ${sel.join("; ")}.`;
    ta.value=(ta.value.trim()?ta.value.trim()+"\n":"")+frase;
    ta.dispatchEvent(new Event("input"));
    ta.focus();
  }
  fecharCaixa(); plim();
  aviso(`📄 ${sel.length} documento(s) na anotação${novos?` · ${novos} novo(s) no checklist`:""} — termine e clique Registrar`, false);
}
function imprimirDocs(casoId){
  const k=D.casoPorId.get(casoId), doc=docDe(k.beneficio);
  if(!doc) return aviso("Sem lista cadastrada para este benefício");
  imprimirListaDocs(D.cliPorId.get(k.cliente_id), k.beneficio,
    (doc.itens||"").split("\n").filter(x=>x.trim()&&!x.startsWith("▸ ")), doc.observacoes);
}
function imprimirListaDocs(c, beneficio, itens, obs){
  const hojeBr=fmt(hoje());
  const w=window.open("","_blank");
  if(!w) return aviso("O navegador bloqueou a janela — libere os pop-ups deste site");
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
  <title>Documentos — ${esc(c.nome)}</title><style>
    body{font-family:Georgia,serif;max-width:680px;margin:40px auto;color:#222;line-height:1.6}
    header{text-align:center;border-bottom:2px solid #1e4fa3;padding-bottom:12px;margin-bottom:24px}
    header h1{font-size:20px;color:#1e4fa3;margin:0}
    header p{margin:2px 0;font-size:13px;color:#555}
    h2{font-size:16px} .cli{margin:14px 0;font-size:15px}
    ul{list-style:none;padding:0} li{margin:9px 0;font-size:15px}
    li::before{content:"☐  "} .obs{background:#f4f1ea;padding:10px 14px;border-radius:6px;font-size:13px;margin-top:16px}
    footer{margin-top:34px;font-size:13px;color:#555;border-top:1px solid #ccc;padding-top:10px}
    @media print{body{margin:10mm}}
  </style></head><body>
  <header><h1>Paulo R. Tercini Filho — Advocacia Previdenciária</h1>
  <p>Documentos necessários para o seu processo</p></header>
  <div class="cli"><b>Cliente:</b> ${esc(c.nome)}<br><b>Benefício:</b> ${esc(beneficio)}<br><b>Data:</b> ${hojeBr}</div>
  <h2>Providenciar e trazer ao escritório:</h2>
  <ul>${itens.map(i=>`<li>${esc(i)}</li>`).join("")}</ul>
  ${obs?`<div class="obs">💡 ${esc(obs).replace(/\n/g,"<br>")}</div>`:""}
  <footer>Dúvidas? Fale conosco pelo WhatsApp. Pode enviar fotos dos documentos por lá, desde que legíveis.</footer>
  <script>window.print()<\/script></body></html>`);
  w.document.close();
}
async function salvarDocs(casoId){
  const k=D.casoPorId.get(casoId), doc=docDe(k.beneficio);
  doc.itens=document.getElementById("doc-txt-"+casoId).value;
  doc.observacoes=document.getElementById("doc-obs-"+casoId).value||null;
  await api(`/rest/v1/documentos_beneficio?id=eq.${doc.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({itens:doc.itens, observacoes:doc.observacoes})});
  aviso("Lista de documentos atualizada 📋"); abrirFicha(clienteAberto);
}
// F140 · o tom da inicial do cliente sai do próprio nome: o mesmo cliente tem
// sempre a mesma cor, e dois clientes abertos em seguida não se confundem.
// Seis tons escuros e sóbrios, todos com contraste alto para a letra branca.
const TONS_NOME = ["#0E5C58","#3A6491","#4F5F2A","#6E4A66","#7F5236","#3F4A55"];
function corDoNome(nome){
  let h = 0; for(const ch of String(nome||"")) h = (h*31 + ch.codePointAt(0)) >>> 0;
  return TONS_NOME[h % TONS_NOME.length];
}
// F141 · o símbolo de cada sistema de origem. O ícone é o próprio favicon do
// site oficial, servido pelo serviço de ícones do Google (só o domínio vai na
// requisição, nenhum dado do caso); se não carregar, entra a sigla em cinza.
// O eproc não publica favicon acessível, então usa a sigla direto.
const FONTES_SIS = {
  pje:  {d:"pje1g.trf3.jus.br",             n:"PJe"},
  esaj: {d:"esaj.tjsp.jus.br",              n:"e-SAJ"},
  eproc:{d:null,                            n:"eproc", m:"ep"},
  inss: {d:"meu.inss.gov.br",               n:"INSS"},
  crps: {d:"consultaprocessos.inss.gov.br", n:"e-Sisrec"},
  // F301 · as marcas dos botões de serviço: o ícone conhecido no lugar da palavra (pedido do Paulo, 30.10.2026)
  // o WhatsApp é desenhado aqui (o botão mais usado não espera a rede): o balão verde com o fone
  zap:  {n:"WhatsApp", svg:`<svg class="fonte-ic" width="16" height="16" viewBox="0 0 24 24" role="img" aria-label="WhatsApp"><title>WhatsApp</title><path fill="#25D366" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z"/><path fill="#fff" d="M8.6 7.3c.3-.6.6-.6.9-.6h.6c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .6l-.5.7c-.1.2-.2.3 0 .6.7 1.1 1.6 2 2.7 2.6.3.2.4.1.6 0l.7-.8c.2-.2.4-.2.6-.1l1.9.9c.3.1.4.2.4.4 0 .5-.2 1.4-.9 1.8-.6.4-1.5.6-2.6.3-1.7-.5-3.5-1.8-4.7-3.4-.9-1.3-1.5-2.7-1.4-3.8 0-.7.1-1.2.3-1.6z"/></svg>`},
  gcal: {d:"calendar.google.com",           n:"Google Agenda", m:"GA"},
  falabr:{d:"falabr.cgu.gov.br",            n:"Fala.BR", m:"FB"},
  cnj:  {d:"www.cnj.jus.br",                n:"CNJ"},
};
function fonteDoItem(x){
  const c = String(x.chip||"");
  if(/INSS/.test(c) || c.startsWith("🩺")) return "inss";
  // a coleta do PJe também traz e-SAJ e eproc: o sistema vem no começo do texto
  if(/PJe/.test(c)){ const sa = sistemaDoAndamentoPje(x.and || x);
    return /e-SAJ/.test(sa||"") ? "esaj" : /eproc/.test(sa||"") ? "eproc" : "pje"; }
  if(/Recurso/.test(c)) return "crps";
  if(/CNJ/.test(c)){
    const sis = String(x.sis||"");
    return /pje/i.test(sis) ? "pje" : /eproc/i.test(sis) ? "eproc" : /saj/i.test(sis) ? "esaj" : "cnj";
  }
  return null;
}
function iconeFonte(chave){
  const f = FONTES_SIS[chave]; if(!f) return "";
  if(f.svg) return f.svg;
  const sg = f.m || f.n.replace(/[^A-Za-z]/g,"").slice(0,2);
  return f.d
    ? `<img class="fonte-ic" src="https://www.google.com/s2/favicons?domain=${f.d}&amp;sz=32" alt="${f.n}" title="${f.n}"
         data-s="${sg}" width="14" height="14" loading="lazy" referrerpolicy="no-referrer" onerror="semIcone(this)">`
    : `<b class="fonte-mono" title="${f.n}">${sg}</b>`;
}
function semIcone(img){
  const b = document.createElement("b"); b.className = "fonte-mono";
  b.title = img.alt; b.textContent = img.dataset.s || ""; img.replaceWith(b);
}
async function copiar(texto, msg){
  try{ await navigator.clipboard.writeText(texto); }
  catch{  // fallback (contexto sem clipboard API)
    const ta=document.createElement("textarea");
    ta.value=texto; document.body.appendChild(ta); ta.select();
    document.execCommand("copy"); ta.remove();
  }
  aviso(msg||"Copiado 📋");
}
// F101 · COPIAR NO CLIQUE. Todo dado de máquina (CPF, telefone, NB, protocolo,
// número do recurso, do processo) copia ao ser clicado — é o .cop com
// data-cop; a mensagem vem de data-cop-msg. Um ouvinte só, delegado, vale
// para o que já existe e para o que ainda vai ser desenhado.
document.addEventListener("click", ev=>{
  const el = ev.target.closest && ev.target.closest("[data-cop]");
  if(!el || ev.target.closest("button,a,input,select,textarea,.lapis")) return;
  ev.preventDefault(); ev.stopPropagation();
  copiar(el.dataset.cop, el.dataset.copMsg || "Copiado 📋");
  // F140 · a confirmação nasce no próprio número copiado, e não só no aviso
  // do canto: o olho está no número, e é ali que precisa ver que deu certo
  el.classList.remove("copiado"); void el.offsetWidth; el.classList.add("copiado");
  clearTimeout(el._copT); el._copT = setTimeout(()=>el.classList.remove("copiado"), 1100);
});
async function copiarCred(id){
  const [cr]=await api(`/rest/v1/credenciais?id=eq.${id}&select=valor`);
  await copiar(cr.valor,"Senha copiada 📋");
  api(`/rest/v1/credencial_vis`,{method:"POST",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({credencial_id:id,colaborador_id:eu.id})});
}
async function verCred(id){
  const [cr]=await api(`/rest/v1/credenciais?id=eq.${id}&select=valor`);
  document.getElementById("cred-"+id).textContent=cr.valor;
  api(`/rest/v1/credencial_vis`,{method:"POST",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({credencial_id:id,colaborador_id:eu.id})});
  setTimeout(()=>{const el=document.getElementById("cred-"+id); if(el) el.textContent="••••••••";},15000);
}

// ── arranque ──────────────────────────────────────────────────────────────
let timerBusca=null;
document.getElementById("busca").addEventListener("input",e=>{
  clearTimeout(timerBusca);
  document.getElementById("busca-x").style.display = e.target.value ? "block" : "none";
  timerBusca=setTimeout(()=>{
    buscaTxt=e.target.value.trim();
    // pesquisar é procurar OUTRO cliente: a ficha aberta sai da frente para
    // o resultado usar a tela inteira (senão parecia que a busca não achava)
    if(buscaTxt && clienteAberto){
      clienteAberto=null; abaAtiva=2;
      document.getElementById("app").classList.remove("detalhe-aberto","busca-aberta");
      aplicarMenu();
    }
    render();
  },200);
});
// 11.92 · VCP-03: Enter na pesquisa abre o primeiro cliente achado ("/", o nome e Enter)
document.getElementById("busca").addEventListener("keydown",e=>{
  if(e.key!=="Enter" || e.isComposing) return;
  e.preventDefault();
  const v=e.target.value.trim(); if(!v) return;
  if(v!==buscaTxt){ clearTimeout(timerBusca); e.target.dispatchEvent(new Event("input")); clearTimeout(timerBusca);
    buscaTxt=v; if(clienteAberto){ clienteAberto=null; abaAtiva=2;
      document.getElementById("app").classList.remove("detalhe-aberto","busca-aberta"); aplicarMenu(); }
    render(); }
  const c=document.querySelector("#conteudo-meio .cartao[data-cli]"); if(c) c.click();
});
// com o menu recolhido a pesquisa vira uma lupa: clicar estende o menu
document.getElementById("busca").addEventListener("mousedown",e=>{
  const app=document.getElementById("app");
  // F224 · com o campo já aberto, o clique é do texto: selecionar uma parte para apagar
  // (antes o preventDefault valia sempre que a ficha estava aberta e travava a seleção)
  if(e.target.getBoundingClientRect().width >= 80 || app.classList.contains("busca-aberta")) return;
  if(app.classList.contains("mini-lateral") || app.classList.contains("detalhe-aberto")){
    e.preventDefault();
    app.classList.add("busca-aberta"); aplicarMenu();
    setTimeout(()=>document.getElementById("busca").focus(),50);
  }
});
// Estado do menu lateral em UM lugar só. A ficha aberta apenas muda o PADRÃO
// (com quatro colunas na tela, o menu em ícones é o que faz sentido); quem
// clicou no ☰ tem a última palavra, e a pesquisa sempre precisa do menu
// aberto para caber o campo.
// F22 · com a FICHA aberta a lateral encolhe SEMPRE (pedido do Paulo): a
// ficha é a área de trabalho e o menu cheio só rouba largura dela. O ☰ vira
// exceção da sessão, não preferência gravada — fechou a ficha, a exceção
// morre e a próxima ficha abre com o menu recolhido de novo.
let menuFichaSessao = null;   // null (recolhe) | "cheio" (o ☰ abriu nesta ficha)
function aplicarMenu(){
  const app=document.getElementById("app");
  if(!app) return;
  const pref=ler("crm_menu");                     // "mini" | "cheio" | vazio
  const mini = app.classList.contains("busca-aberta") ? false
             : app.classList.contains("detalhe-aberto") ? menuFichaSessao!=="cheio"
             : pref ? pref==="mini"
             : false;
  app.classList.toggle("mini-lateral", mini);
  if(!mini) esconderEtiqueta();   // menu aberto já mostra o nome; o balão sobra
}

// F150 · o programa guardado no navegador (sw.js, ao lado da página).
// Só em https (o site publicado) ou com crm_sw=1 (as provas). Quando o site
// tem versão nova, o sw.js avisa e a página oferece recarregar.
(function(){
  if(!("serviceWorker" in navigator)) return;
  let liga = location.protocol==="https:";
  try{ if(localStorage.getItem("crm_sw")==="1") liga = true; }catch(e){}
  if(!liga) return;
  navigator.serviceWorker.register("sw.js").catch(()=>{});
  navigator.serviceWorker.addEventListener("message", e=>{
    if(e.data==="crm-nova-versao" || (e.data && e.data.crm==="nova-versao")) avisoNovaVersao(e.data); else cliqueNoAviso(e.data); });
})();
// F503 · o aviso só aparece quando o site tem versão MAIS NOVA que a desta página
// (antes, a página já recarregada recebia o aviso de novo e ele não saía)
function minhaVersao(){
  const m = /versão (\d+)\.(\d+)/.exec((document.querySelector(".versao")||{}).textContent || "");
  return m ? m[1] + "." + m[2] : "";
}
function meuPrograma(){
  const sc = [...document.scripts].find(x => /app\.[0-9a-f]{12}\.js/.test(x.src||""));
  return sc ? sc.src.match(/app\.[0-9a-f]{12}\.js/)[0] : "";
}
function versaoMaisNova(a, b){
  const [x1, y1] = a.split(".").map(Number), [x2, y2] = b.split(".").map(Number);
  return (x1 - x2 || y1 - y2) > 0;
}
function avisoNovaVersao(d0){
  if(d0 && typeof d0 === "object"){
    const mv = minhaVersao(), v = d0.versao || "";
    if(v && mv && v !== mv){ if(!versaoMaisNova(v, mv)) return; }
    else if((d0.prog || meuPrograma()) && d0.prog === meuPrograma()) return;   // é o programa que já está aberto
  }
  if(document.getElementById("nova-versao")) return;
  const d = document.createElement("div");
  d.id = "nova-versao"; d.setAttribute("role","status");
  d.innerHTML = `<span>Há uma versão nova do CRM.</span><button onclick="location.reload()">Recarregar</button>`
    + `<button class="nv-fechar" aria-label="Fechar o aviso" title="Fechar" onclick="this.parentNode.remove()">✕</button>`;
  document.body.appendChild(d);
}

// ══ F151 · AGENDA DE QUARTA (instrução do Paulo, 27.09.2026) ══════════════
// Os atendimentos presenciais são às quartas. O Google Agenda do Paulo é a
// fonte única; quem grava nele é um Apps Script na conta do Paulo
// (crm/agenda-quarta/Code.gs), que confere o horário e grava sob bloqueio,
// então duas pessoas não conseguem o mesmo horário. O CRM só consulta e pede.
// A URL do script vale para o escritório (config_app agenda_url); o token é
// de cada colaborador e fica só neste navegador.
const AGENDA_URL_PADRAO = "https://script.google.com/macros/s/AKfycbwO6RbGD4WvH2q0cleS1ACXY1EWyrVu-jfBYgB3KbVTXJtkifZIu5Pf7KFfk79x7MH9/exec"; // implantação v1, 27.09.2026
function agendaUrl(){ return (cfgApp("agenda_url")||AGENDA_URL_PADRAO||"").trim(); }
function agendaToken(){ return (ler("crm_agenda_token")||"").trim(); }
async function agendaApi(acao, dados={}){
  if(!agendaUrl()){ const e=new Error("A agenda ainda não foi ligada: falta o endereço do Apps Script."); e.codigo="SEM_URL"; throw e; }
  if(!agendaToken()){ const e=new Error("Falta o seu token da agenda."); e.codigo="NAO_AUTORIZADO"; throw e; }
  let json;
  try{
    const resp = await fetch(agendaUrl(), { method:"POST", headers:{ "Content-Type":"text/plain;charset=utf-8" },
      body: JSON.stringify({ acao, token: agendaToken(), ...dados }) });
    json = await resp.json();
  }catch(err){ const e=new Error("Não consegui falar com a agenda. Confira a internet e tente de novo."); e.codigo="REDE"; throw e; }
  if(!json.ok){ const e=new Error(json.erro||"Erro na agenda"); e.codigo=json.codigo; throw e; }
  return json;
}
// F152 · três profissionais na MESMA agenda do Google, cada um com a sua cor
// (Paulo azul, Marcos verde, Amanda amarela). A disponibilidade é por
// profissional; agq.disp é a de quem está escolhido na tela.
let agq = { prof:"paulo", cache:{}, disp:null, sel:null, erro:null, carregando:{}, pend:{}, em:0, timer:null };
const COR_PROF = { paulo:"azul", marcos:"verde", amanda:"amarelo" };
async function carregarAgenda(prof){
  prof = prof || agq.prof;
  if(prof==="todos") return carregarCompleta();   // F250e
  // F281 · quem chega com a carga em curso espera a mesma: devolver o cache vazio fazia a Completa sair sem o profissional
  if(agq.carregando[prof]) return agq.pend[prof];
  agq.carregando[prof] = true;
  let fim; agq.pend[prof] = new Promise(r=>{ fim = r; });
  try{ agq.cache[prof] = await agendaApi("disponibilidade", {profissional:prof}); agq.erro = null; agq.em = Date.now(); }
  catch(e){ agq.erro = e; }
  finally{ agq.carregando[prof] = false; fim(agq.cache[prof]); }
  if(prof===agq.prof){ agq.disp = agq.cache[prof] || null;
    if(agq.disp && (!agq.sel || !agq.disp.dias.some(d=>d.data===agq.sel))) agq.sel = (agq.disp.dias.find(d=>!d.bloqueado)||agq.disp.dias[0]||{}).data || null; }
  return agq.cache[prof];
}
