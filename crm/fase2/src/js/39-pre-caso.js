async function novoPreCaso(cliId){
  if(!podeAtender()) return aviso("O atendimento é aberto pelo advogado: a recepção faz o cadastro");
  mesaAberta.add("b1"); // F55 · atendimento novo nasce com o passo 1 à vista
  const pcs = [...precasosDe(D.cliPorId.get(cliId))];
  const id = "pc_"+Date.now().toString(36);
  pcs.push({id, especie:"", natureza:"", marc:{}, honorarios:"", quem:eu.id, em:hoje()});
  trocarPreCaso(cliId, id);
  if(await gravarPrecasos(cliId, pcs)) repintarFicha();
}
// F30 · o atendimento novo de quem já resolveu o anterior (caso gerado ou
// lembrete): abre um pré-caso limpo e leva direto para a mesa
async function novoAtendimento(cliId){
  if(!podeAtender()) return aviso("O atendimento é aberto pelo advogado: a recepção faz o cadastro");
  // F236 · com card de Aposentadorias futuras vivo, o atendimento pergunta se é dele: ligado ao card, o caso que nascer o fecha
  const cardV = cardsApos().find(l=>l.cliente_id===cliId && !["caso","arquivado"].includes(etapaDoCard(l)));
  if(cardV && await confirmar(`${(D.cliPorId.get(cliId)||{}).nome||"O cliente"} tem o card "${cardV.titulo||"Aposentadoria futura"}" em Aposentadorias futuras${(dd=>dd ? ` (direito ${dd.data<=hoje()?"desde":"em"} ${fmtBarra(dd.data)})` : "")(dataDireitoDoCard(cardV))}.\n\nEste atendimento é o desse card?`)) return abrirAtendimentoDoCard(cliId, cardV.id);
  // F220 · o atendimento é do cliente, não de um caso: sem a escolha do processo por cima
  abaAtiva = 0; if(casoSel==="__auto__") casoSel = null;
  const m = document.getElementById("modal"); if(m) m.style.display = "none";
  await novoPreCaso(cliId);
  const pcN = preCasoAberto(D.cliPorId.get(cliId)||{id:cliId}); if(pcN) _pcNovo.add(pcN.id);
  _atendAberto.add(cliId);
  // F205 · o atendimento abre no painel do Primeiro atendimento
  // F220 · com ou sem dossiê: sem ele, o painel mostra o relato e a escolha do benefício
  abaAtiva = 0; irSubCad("pa");
}
// F220 · da menção ou da lista direto ao atendimento: abre o que existe ou começa um
async function abrirAtendimentoDe(cliId, pcId){
  // teste 11.88, TRI-02: o cartão velho de um pré-caso que já virou caso ou foi encerrado abria um pré-caso novo e vazio
  const c0 = D.cliPorId.get(cliId);
  if(pcId && c0 && !precasosDe(c0).some(p=>p.id===pcId)){
    const k = (D.casosDoCliente.get(cliId)||[]).find(x=>(x.precaso||{}).id===pcId && !x.pre_caso && x.fase!=="encerrado");
    if(k) return abrirCasoDaMencao(cliId, k.id);
    await abrirFicha(cliId); return aviso("Este pré-caso já foi encerrado", false);
  }
  if(pcId) trocarPreCaso(cliId, pcId);
  await abrirFicha(cliId);
  const c = D.cliPorId.get(cliId); if(!c) return;
  document.getElementById("modal").style.display = "none";
  if(casoSel==="__auto__") casoSel = null;
  if(!podeAtender()) return;   // F277 · a recepção vê a ficha; o atendimento é do advogado
  if(!precasosDe(c).some(p=>!p.so_lembrete)) return novoAtendimento(cliId);
  abaAtiva = 0; _atendAberto.add(cliId); irSubCad("pa");
}
async function abrirCasoDaMencao(cliId, casoId, andId){
  await abrirFicha(cliId);
  document.getElementById("modal").style.display = "none";   // a escolha do processo, quando o cliente tem vários
  casoSel = casoId; abaAtiva = 2; subAba = "escritorio"; repintarFicha();
  if(andId) setTimeout(()=>qdIrParaAndamento(casoId, andId), 120);
}

// ══════════════════════════════════════════════════════════════════════════
// F34 · O CAMINHO DE VOLTA, refeito na F226
// ══════════════════════════════════════════════════════════════════════════
// o caso que não é caso VOLTA A PRÉ-CASO: a mesma linha, com andamentos,
// tarefas, anexos e agenda, passa à fase Escritório com pre_caso (docs/PRE-CASOS.md).
// Antes (F34) os andamentos viravam anotações do cadastro e o caso era apagado.
async function converterCasoEmAtendimento(k, c){
  const corpo = {pre_caso:true, fase:"escritorio", precaso:{...(k.precaso||{}), id:(k.precaso||{}).id||k.id,
    natureza:/revis/.test(dsa(k.beneficio||""))?"revisao":"", marc:{}, honorarios:"", quem:eu.id, em:hoje(), de_caso:k.id},
    // F236 · a linha que veio do To Do segue na fase escolhida aqui até a tarefa chegar à lista (respeitar_movidos)
    ...(k.todo_task_id ? {mover_para:"🙋 Escritório"} : {})};
  await api(`/rest/v1/casos?id=eq.${k.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"}, body:JSON.stringify(corpo)});
  Object.assign(k, corpo);
  reindexarCliente(c);
}
async function naoEhCaso(casoId){
  const k=D.casoPorId.get(casoId); if(!k) return;
  const c=D.cliPorId.get(k.cliente_id); if(!c) return;
  // F236 · o caso com pedido feito (protocolo, DER, NB, processo ou recurso) é caso: a confirmação diz isso antes de voltar
  const nums = [(k.protocolos||[])[0] && `protocolo ${(k.protocolos||[])[0]}`, k.der && `DER ${fmtBarra(k.der)}`, k.nb && `NB ${k.nb}`,
    k.processo && `processo ${k.processo}`, (k.crps_nups||[])[0] && `recurso ${(k.crps_nups||[])[0]}`].filter(Boolean);
  if(!await confirmar(`${nums.length ? `ATENÇÃO: este caso já tem ${nums.join(", ")}. Pedido feito é caso: para fechá-lo, use "Encerrar caso".\n\n` : ""}"${tituloCaso(k)}" NÃO é caso?\n\nEle volta a PRÉ-CASO na lista 🙋 Escritório, com as anotações, os documentos, as tarefas e a agenda.\n`
    +`O caso de verdade nasce no "Gerar caso" do atendimento. A tarefa no To Do não muda.`)) return;
  try{ await converterCasoEmAtendimento(k, c); }
  catch(e){ return aviso("Não consegui voltar a pré-caso — tente de novo"); }
  plim(); aviso("Voltou a pré-caso, com tudo o que tinha ✔");
  montarSidebar(); casoSel=null; abaAtiva=0;
  render(); abrirFicha(c.id);
}
// F30 · reabrir a triagem: o marcador de encerrada sai (fica o rastro), o
// botão Triagem volta e as Anotações se recolhem até novo encerramento
async function reabrirTriagem(cliId){
  const c=D.cliPorId.get(cliId); if(!c) return;
  const t={...triagemDe(c)};
  if(!t.atendimento) return;
  t.reaberta={em:hoje(), quem:eu.id, antes:t.atendimento};
  delete t.atendimento;
  if(!await salvarTriagem(cliId, t)) return aviso("Não consegui reabrir — tente de novo");
  subCad="triagem"; guardar("crm_subcad","triagem");
  repintarFicha();
  aviso("Triagem reaberta — confira e encerre de novo para voltar às Anotações");
}
async function mudarPreCaso(cliId, pcId, campo, valor){
  // F55 · mexeu no bloco, ele fica aberto até a ficha fechar — a mesa só se
  // arruma sozinha entre atendimentos, nunca embaixo da mão de quem edita
  mesaAberta.add(campo==="honorarios"?`hon-${pcId}`:"b1");
  const c = D.cliPorId.get(cliId);
  const pcs = precasosDe(c).map(p=>{
    if(p.id!==pcId) return p;
    const novo = {...p, quem:p.quem||eu.id, em:p.em||hoje()};
    if(campo==="marc"){ novo.marc={...(p.marc||{})}; novo.marc[valor]=!novo.marc[valor]; }
    else novo[campo]=valor;
    return novo;
  });
  // F30 · o combinado de honorários vale também para o CONTRATO impresso:
  // fica guardado por variante no cadastro e vira a "disposição expressa em
  // contrário" da cláusula — sobrevive ao pré-caso virar caso
  if(campo==="honorarios"){
    const pc = pcs.find(p=>p.id===pcId)||{};
    const aj = {...(((c.campos||{}).honor_ajuste)||{})};
    const vr = variantePorEspecie(pc.especie);
    if((valor||"").trim()) aj[vr]=valor.trim(); else delete aj[vr];
    c.campos = {...(c.campos||{}), honor_ajuste:aj};
  }
  if(await gravarPrecasos(cliId, pcs)) repintarFicha();
}
// F181 · guarda o combinado em campos no pré-caso e no cadastro (por
// variante, para o contrato) e acerta os lançamentos das parcelas
async function salvarHonEstrut(cliId, pcId, limpar){
  const c=D.cliPorId.get(cliId); if(!c) return;
  const box=document.getElementById("hn-"+pcId);
  let h=null;
  if(!limpar && box){
    h={};
    box.querySelectorAll("[data-hn]").forEach(e=>{ const v=e.value.trim();
      if(v && (e.type==="date" || +v>0)) h[e.dataset.hn]= e.type==="date" ? v : +v; });
    if(!(h.nben || h.pct || h.valor)) return aviso("Preencha os benefícios, o percentual ou o valor fixo");
    if(h.pct>100) return aviso("O percentual não pode passar de 100%");
    if(h.entrada && !h.valor) return aviso("A entrada só vale com valor fixo");
    if(h.entrada>h.valor) return aviso("A entrada não pode passar do valor fixo");
  }
  mesaAberta.add(`hon-${pcId}`);
  const pcs=precasosDe(c).map(p=>{
    if(p.id!==pcId) return p;
    const novo={...p, quem:p.quem||eu.id, em:p.em||hoje()};
    if(h) novo.hon=h; else delete novo.hon;
    return novo;
  });
  const pc=pcs.find(p=>p.id===pcId)||{};
  const est={...(((c.campos||{}).honor_estrut)||{})}, vr=variantePorEspecie(pc.especie);
  if(h) est[vr]=h; else delete est[vr];
  c.campos={...(c.campos||{}), honor_estrut:est};
  if(!await gravarPrecasos(cliId, pcs)) return;
  await sincronizarParcelasHon(c, pcId, h);
  aviso(h ? "Honorários guardados: o contrato e a aba Honorários seguem o combinado"
          : "Honorários de volta ao padrão do escritório", false);
  repintarFicha();
}
// as parcelas com data viram lançamentos "a receber", marcados em
// todo_item_id com "hon:<pré-caso>:<n>": guardar de novo atualiza a mesma
// linha; parcela que saiu do combinado e segue em aberto é removida; o que
// já foi recebido nunca é tocado
async function sincronizarParcelasHon(c, pcId, h){
  const pref=`hon:${pcId}:`;
  const ja=(D.pagamentos||[]).filter(p=>String(p.todo_item_id||"").startsWith(pref));
  const ks=D.casosDoCliente.get(c.id)||[];
  const casoId=(ks.find(k=>k.fase!=="encerrado")||{}).id||null;
  const novos=parcelasHon(h).filter(x=>x.venc);
  try{
    for(const x of novos){
      const tag=pref+x.k, p=ja.find(y=>y.todo_item_id===tag);
      const linha={descricao:x.desc, valor:x.valor, vencimento:x.venc};
      if(!p){
        const r=await api(`/rest/v1/pagamentos`,{method:"POST",headers:{Prefer:"return=representation"},
          body:JSON.stringify({...linha, caso_id:casoId, cliente_id:c.id, status:"aberto", pago_em:null,
            conferencias:[], todo_item_id:tag})});
        if(r && r[0]) D.pagamentos.push(r[0]);
      }else if(p.status==="aberto" && (+p.valor!==x.valor || p.vencimento!==x.venc || p.descricao!==x.desc)){
        await api(`/rest/v1/pagamentos?id=eq.${p.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
          body:JSON.stringify(linha)});
        Object.assign(p, linha);
      }
    }
    for(const p of ja.filter(y=>y.status==="aberto" && !novos.some(x=>pref+x.k===y.todo_item_id))){
      await api(`/rest/v1/pagamentos?id=eq.${p.id}`,{method:"DELETE"});
      D.pagamentos=D.pagamentos.filter(y=>y!==p);
    }
  }catch(e){ return aviso("Não consegui acertar as parcelas — guarde de novo"); }
  // F236 · as parcelas nascem com o lembrete de cobrança ligado; só o desligado à mão fica desligado
  if((((c.campos||{}).cobranca)||{}).lembrar!==false) await lembretesCobranca(c, true);
}
async function tirarPreCaso(cliId, pcId){
  if(!await confirmar("Tirar este pré-caso? As anotações dele continuam guardadas — e dá para restaurar pelo ↺ que fica na mesa.")) return;
  const c = D.cliPorId.get(cliId);
  const tirado = precasosDe(c).find(p=>p.id===pcId);
  const pcs = precasosDe(c).filter(p=>p.id!==pcId);
  // F35 · a regra da volta: o removido vai para a lixeira do cadastro, e a
  // mesa oferece restaurar — por erro ou por vontade
  if(tirado) c.campos = {...(c.campos||{}), pc_lixeira:{pc:tirado, em:hoje(), quem:eu.id}};
  if(await gravarPrecasos(cliId, pcs)) repintarFicha();
}
async function restaurarPreCaso(cliId){
  const c = D.cliPorId.get(cliId);
  const lix = ((c&&c.campos)||{}).pc_lixeira;
  if(!lix || !lix.pc) return;
  const pcs = [...precasosDe(c)];
  if(!pcs.some(p=>p.id===lix.pc.id)) pcs.push(lix.pc);
  c.campos = {...(c.campos||{})}; delete c.campos.pc_lixeira;
  if(await gravarPrecasos(cliId, pcs)){ aviso("Pré-caso restaurado ↺"); repintarFicha(); }
}
// F35 · o "Somente gerar lembrete" também tem volta: o pré-caso retorna à
// mesa e o lembrete criado a partir dele é desativado
async function voltarLembreteParaMesa(cliId, pcId){
  const pcs = precasosDe(D.cliPorId.get(cliId)).map(p=>{
    if(p.id!==pcId) return p;
    const novo={...p}; delete novo.so_lembrete; return novo;
  });
  for(const l of (D.lembretes||[]).filter(l=>l.cliente_id===cliId
      && ((l.detalhes||{}).origem==="precaso") && (l.detalhes||{}).precaso_id===pcId)){
    await api(`/rest/v1/lembretes?id=eq.${l.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({ativo:false})}).catch(()=>{});
    l.ativo=false;
  }
  D.lembretes=(D.lembretes||[]).filter(l=>l.ativo!==false);
  if(await gravarPrecasos(cliId, pcs)){
    aviso("De volta à mesa do atendimento — o lembrete foi desativado ↺");
    repintarFicha(); montarSidebar();
  }
}
// os tópicos que os marcadores abrem: os pontos das famílias da F17, sem
// duplicar conhecimento — rural/especial/deficiência apontam para as mesmas
// listas que a Triagem usa
function topicosDoMarcador(m){
  const fam = m==="rural" ? familiaDaEspecie("Rural")
            : m==="especial" ? familiaDaEspecie("Apos. Especial")
            : familiaDaEspecie("Apos. Tempo — Pessoa com Deficiência");
  return fam ? fam.pontos : [];
}
// aposentadoria futura: NÃO gera caso — vira lembrete com responsável, e o
// pré-caso fica aberto ("acompanhando"), como o Paulo descreveu
async function preCasoParaLembrete(cliId, pcId){
  const data = (document.getElementById("pcl-data-"+pcId)||{}).value;
  const resp = (document.getElementById("pcl-resp-"+pcId)||{}).value || null;
  if(!data) return aviso("Escolha a data do acompanhamento");
  const pc = precasosDe(D.cliPorId.get(cliId)).find(p=>p.id===pcId);
  try{
    const [l]=await api(`/rest/v1/lembretes`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({cliente_id:cliId, tipo:"geral",
        titulo:`${pc&&pc.especie?pc.especie:"Acompanhamento"} — atendimento virou lembrete`,
        detalhes:{origem:"precaso", precaso_id:pcId},
        proximo_em:data, responsavel_id:resp, criado_por:eu.id, ativo:true})});
    if(l) (D.lembretes=D.lembretes||[]).push(l);
  }catch(e){ return aviso("Rode o schema_por_em_dia.sql no Supabase — falta a tabela 'lembretes'"); }
  const pcs = precasosDe(D.cliPorId.get(cliId)).map(p=>p.id===pcId?{...p, so_lembrete:true}:p);
  await gravarPrecasos(cliId, pcs);
  // F30 · o atendimento se encerra: as Anotações se recolhem e as anotações
  // ficam à vista na aba Lembretes, junto do lembrete criado
  subCad="identificacao"; guardar("crm_subcad","identificacao");
  abaAtiva=0;
  aviso("Lembrete criado — as anotações do atendimento ficam na aba Aposentadorias futuras ✔");
  repintarFicha(); montarSidebar();
}
// GERAR O CASO deste pré-caso: as anotações dele viram andamentos com a data
// e o autor originais (decisão do Paulo), os honorários viram [DECISÃO], os
// documentos pedidos viram checklist, e o pré-caso se encerra
// F36 · quem está em Lembretes TAMBÉM gera caso (pedido do Paulo): o
// pré-caso acompanhado reativa e segue o MESMO gerar da mesa — o lembrete
// se desativa lá dentro, e a ficha abre nos documentos da assinatura
async function gerarCasoDoLembrete(cliId, pcId){
  const cli=D.cliPorId.get(cliId); if(!cli) return;
  const pcL=precasosDe(cli).find(p=>p.id===pcId);
  if(!pcL) return aviso("Não achei o pré-caso deste lembrete — abra as Anotações");
  if(pcL.so_lembrete){
    const pcs2=precasosDe(cli).map(p=>{
      if(p.id!==pcId) return p;
      const novo={...p}; delete novo.so_lembrete; return novo;
    });
    if(!await gravarPrecasos(cliId, pcs2)) return;
  }
  await gerarCasoDoPre(cliId, pcId);
}
async function gerarCasoDoPre(cliId, pcId){
  const c = D.cliPorId.get(cliId); if(!c) return;
  const pcs = precasosDe(c);
  const pc = pcs.find(p=>p.id===pcId);
  if(!pc || !pc.especie) return aviso("Defina a espécie deste pré-caso primeiro");
  // F36 · a via é requisito da FUNÇÃO, não só do botão: incapacidade sem via
  // não gera, venha o clique da mesa ou da aba Lembretes
  if(/incapacidade|auxilio doenca|invalidez/.test(dsa(pc.especie||"")) && !pc.via)
    return aviso("Benefício por incapacidade: escolha a via (administrativo ou judicial) na mesa do atendimento antes de gerar");
  // sem o select da mesa (gerando da aba Lembretes), a fase sai da via —
  // e nunca "escritorio", que desde a F34 não é lista de casos
  // F277 · o início escolhido no Criar caso manda na lista
  // teste 11.88, TRI-04: o Judicial sem número é a ação ainda por ajuizar, que nasce em Petições Iniciais "a redigir"
  const fase = (pc.inicio==="judicial" && !soDig(pc.numero||"") ? "peticao_inicial" : INICIO_FASE[pc.inicio]) || (document.getElementById("pcf-"+pcId)||{}).value
    || (pc.via==="jud" ? "peticao_inicial" : "inss");
  // F235 · os prazos que o Desfecho mostrou, lidos antes de o pré-caso virar caso
  const tarefasDesf = tarefasDoDesfecho(c);
  // F236 · o Desfecho fica gravado no caso (precaso.desfecho: benefício, data do direito, a linha de cada benefício e a
  // análise), lido aqui porque depois o atendimento fecha; o caso o mostra no quadro "Do atendimento"
  let desf = {};
  try{ if((preCasoAberto(c)||{}).id===pcId){ const a = analisesDaVez(c)[0] || null, b = baseDesfecho(c, a);
    desf = {beneficio:b.especie||pc.especie, sug:b.sug||"", motivo:b.motivo||"", data_direito:b.data||null, fonte:b.fonte||"", analise_id:a ? a.id : null,
      linhas:(b.linhas||[]).filter(l=>l && l.o).map(l=>({rot:l.o.rot, acao:l.acao||"", txt:l.txt}))}; } }catch(e){}
  const nat = pc.natureza==="revisao" ? "revisão" : pc.natureza==="acerto" ? "acerto" : "concessão";
  let k;
  // F128 · o código e a subespécie escolhidos no catálogo descem para o caso
  // (a coluna subespecie vem do schema_linha_caso.sql; sem ela, vai sem)
  const base = {cliente_id:cliId, titulo:c.nome,
    beneficio:pc.especie, fase, especie:pc.cod||null,
    origem_lista:(LISTAS_MOVER.find(([,f])=>f===fase)||["🙋 Escritório"])[0]};
  // F277 · o número do Criar caso: o processo no judicial, o NUP no Conselho de Recursos, o protocolo no INSS
  const linha0 = pc.caso_id && D.casoPorId.get(pc.caso_id), num = String(pc.numero||"").trim();
  if(num && pc.inicio==="judicial") Object.assign(base, {processo:fmtProc(num), processos:[{numero:fmtProc(num), nosso:true, acompanhar:true}]});
  else if(num && pc.inicio==="conselho") base.crps_nups = [...new Set([...((linha0||{}).crps_nups||[]), num])];
  else if(num) base.protocolos = [...new Set([...((linha0||{}).protocolos||[]), num])];
  // F226 · o pré-caso que já é linha de casos VIRA o caso (a mesma linha, com o
  // que ela já tem); o que ainda morava só no cadastro nasce como antes
  const linha = pc.caso_id && D.casoPorId.get(pc.caso_id);
  const {caso_id:_c, especie:_e, ...resto} = pc;
  const viraCaso = corpo => ({...corpo, pre_caso:false, precaso:{...resto, desfecho:{tipo:"caso", em:hoje(), quem:eu.id, via:pc.via||null, ...desf}},
    // a linha que veio do To Do não volta ao Escritório na sincronização seguinte (respeitar_movidos)
    ...(linha ? {mover_para:corpo.origem_lista} : {})});
  const criar = async corpo => linha
    ? (await api(`/rest/v1/casos?id=eq.${linha.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
        body:JSON.stringify(viraCaso(corpo))}), [Object.assign(linha, viraCaso(corpo))])
    : api(`/rest/v1/casos`,{method:"POST",headers:{Prefer:"return=representation"}, body:JSON.stringify(corpo)});
  // F236 · a etapa velha da linha (de antes de um "↩ não é caso") sai, e a petição inicial começa "a redigir"; a natureza e
  // os marcadores do atendimento viram campos do caso, e não só texto do [DECISÃO]. Banco sem alguma coluna: grava sem ela
  const MARC_CASO = {rural:"rural", especial:"especial", deficiencia:"pcd"};
  const extras = {etapa: fase==="peticao_inicial" ? "a redigir" : null, natureza: pc.natureza || (linha && linha.natureza) || "concessao",
    marcadores: [...new Set([...marcadoresDe(linha||{}), ...Object.entries(pc.marc||{}).filter(([m, v])=>v && MARC_CASO[m]).map(([m])=>MARC_CASO[m])])]};
  try{
    try{ [k]=await criar({...base, ...extras, ...(pc.sub ? {subespecie:pc.sub} : {})}); }
    catch(e){ if(/subespecie|natureza|marcadores|42703|PGRST204/.test(String(e.message||e))) [k]=await criar({...base, etapa:extras.etapa}); else throw e; }
  }catch(e){ return aviso("Não consegui criar o caso — tente de novo"); }
  if(!linha){
    D.casos.push(k); D.casoPorId.set(k.id,k);
    if(!D.casosDoCliente.has(cliId)) D.casosDoCliente.set(cliId,[]);
    D.casosDoCliente.get(cliId).push(k);
  }
  const marcas = Object.entries(pc.marc||{}).filter(([,v])=>v).map(([m])=>m);
  await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({caso_id:k.id, autor_id:eu.id,
      texto:`[DECISÃO] Caso gerado do pré-caso: ${pc.especie} · natureza ${nat}`
        + (pc.inicio ? ` · início ${({inss:"INSS", conselho:"Conselho de Recursos", judicial:"Judicial"})[pc.inicio]}${pc.numero ? ` nº ${pc.numero}` : ""}` : "")
        + (pc.via?` · via ${pc.via==="adm"?"administrativa":"judicial"}`:"")
        + (marcas.length?` · envolve ${marcas.join(", ")}`:"")
        + ((pc.honorarios || pc.hon)?` · honorários combinados: ${pc.honorarios || resumoHon(pc.hon)}`:"")   // F236 · o estruturado também
        + ((g=>g.proc && g.contr ? ` · procuração e contrato gerados no CRM.` : ` · procuração e contrato a gerar em Documentos.`)(docsGeradosDo(cliId)))})}).catch(()=>{});
  // as anotações DESTE pré-caso (e as sem dono, quando ele é o único)
  // F236 · só sai do cadastro a nota que gravou no caso (a falha engolida apagava a nota); importante e urgente vão na linha,
  // a pendência vira tarefa de quem a nota atribuía (ou de quem escreveu) e o checklist vai no texto; o autor é o autor_id gravado
  const notas = ((c.campos||{}).atendimento||[]);
  const unico = pcs.length===1;
  const vao = notas.filter(n=>n.precaso_id===pcId || (unico && !n.precaso_id));
  const foram = [];
  for(const n of vao){
    const co = (n.autor_id && D.colPorId.get(n.autor_id)) || D.colaboradores.find(x=>(x.nome||"").split(" ")[0]===n.quem);
    const ck = (n.checklist||[]).map(i=>`${i.feito?"☑":"☐"} ${i.texto||i.nome||i.t||""}`).join("\n");
    try{
      const [an] = await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({caso_id:k.id, autor_id:(co&&co.id)||eu.id, texto:n.texto + (ck ? "\n"+ck : ""), criado_em:n.em,
          ...(n.importante?{importante:true}:{}), ...(n.urgente?{urgente:true}:{})})}) || [];
      foram.push(n);
      if(an && ehNotaPendente(n)) for(const q of ((n.atribuidos||[]).length ? n.atribuidos : [(co&&co.id)||eu.id])){
        try{ const [tf] = await api(`/rest/v1/andamento_tarefas`,{method:"POST",headers:{Prefer:"return=representation"},
          body:JSON.stringify({andamento_id:an.id, caso_id:k.id, colaborador_id:q, atribuido_por:(co&&co.id)||eu.id, lembrar_em:n.lembrar_em||hoje()})});
          tarefaNaMemoria(tf); }catch(e){} }
    }catch(e){}
  }
  const ficam = notas.filter(n=>!foram.includes(n));
  // F236 · os pedidos deste pré-caso (o de outro pré-caso fica no cadastro); o entregue vira tarefa concluída e a "entrega
  // até" vira o prazo da tarefa; o pedido só sai do cadastro quando todos os itens gravaram
  let docs=0;
  const peds = (c.campos||{}).docs_pedidos||[], pedFeitos = [];
  for(const p of peds.filter(p=>p.precaso_id===pcId || (!p.precaso_id && unico))){
    let tudo = true;
    for(const it of (p.itens||[])){
      try{
        const [tf]=await api(`/rest/v1/tarefas`,{method:"POST",headers:{Prefer:"return=representation"},
          body:JSON.stringify({caso_id:k.id, titulo:`📄 ${String(it.nome||it).split(" — ")[0]}`,
            ...(it.entregue ? {concluida:true, concluida_em:`${it.entregue}T12:00:00-03:00`} : p.ate ? {prazo:p.ate} : {})})});
        if(tf){ D.tarefas.push(tf); if(!it.entregue) docs++; }
      }catch(e){ tudo = false; }
    }
    if(tudo) pedFeitos.push(p);
  }
  // F235 · o prazo do Desfecho vira tarefa com data no caso
  for(const t of tarefasDesf) if(!D.tarefas.some(x=>x.caso_id===k.id && dsa(x.titulo)===dsa(t.titulo))){
    try{ const [tf] = await api(`/rest/v1/tarefas`,{method:"POST",headers:{Prefer:"return=representation"}, body:JSON.stringify({caso_id:k.id, titulo:t.titulo, prazo:t.prazo})});
      if(tf){ D.tarefas.push(tf); docs++; } }catch(e){} }
  // o anexo que entrou no pré-caso passa a pertencer ao caso; o do dossiê
  // continua do cliente, porque serve a todos os casos dele
  // F236 · com outro pré-caso vivo, o anexo sem caso pode ser dele: fica no cliente (o que já está na linha do pré-caso vai com ela)
  if(unico) for(const a of (D.anexos||[]).filter(x=>!x.caso_id && x.origem!=="dossie" && (!x.cliente_id || x.cliente_id===cliId))){
    await api(`/rest/v1/anexos?id=eq.${a.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({caso_id:k.id})}).catch(()=>{});
    a.caso_id = k.id;
  }
  // F236 · o cadastro só perde o que foi para o caso; se a gravação falhar, a memória fica como o banco (nada some da tela)
  const restoPed = peds.filter(p=>!pedFeitos.includes(p));
  const camposN = {...(c.campos||{}), atendimento:ficam.length?ficam:undefined,
    docs_pedidos:restoPed.length?restoPed:undefined, especie:undefined,
    precasos:pcs.filter(p=>p.id!==pcId && !p.caso_id)};   // F226 · as linhas de casos não voltam ao cadastro
  if(!camposN.precasos.length) delete camposN.precasos;
  try{ await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"}, body:JSON.stringify({campos:camposN})}); c.campos = camposN; }
  catch(e){ aviso("O caso nasceu, mas o cadastro não foi limpo: as anotações seguem também no atendimento"); }
  // F236 · a análise registrada no atendimento se liga ao caso (detalhes.caso_id): o caso a mostra no quadro "Do atendimento"
  const aidEt = ((pc.etapas||{}).analise||{}).analise_id;
  for(const a of analisesDe(cliId).filter(a=>(a.detalhes||{}).precaso_id===pcId || (aidEt && a.id===aidEt) || (desf.analise_id && a.id===desf.analise_id))){
    const det = {...(a.detalhes||{}), caso_id:k.id};
    try{ await api(`/rest/v1/analises_direito?id=eq.${a.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({detalhes:det})}); a.detalhes = det; }catch(e){}
  }
  // F36 · o lembrete que nasceu deste pré-caso se desativa: o acompanhamento
  // acabou — agora existe caso de verdade
  // F236 · e o card de Aposentadorias futuras ligado a ele vira "Virou caso" (crm.etapa caso, crm.caso_id, desligado)
  await fecharCardsDoCaso(cliId, k, pc);
  reindexarCliente(c); plim();
  await avisarCasoNovo(k.id, cliId, (g=>g.proc && g.contr ? "o pré-caso virou caso (procuração e contrato gerados)" : "o pré-caso virou caso (procuração e contrato a gerar)")(docsGeradosDo(cliId)));
  aviso(`Caso criado — ${foram.length} anotação(ões) viraram andamentos${docs?`, ${docs} documento(s) no checklist`:""}${vao.length>foram.length?`; ${vao.length-foram.length} não gravaram e ficaram no atendimento`:""}. Imprima a procuração e o contrato em Documentos.`, false);
  // F236 · o atendimento fecha: sem isto, a ficha reabria no modo atendimento de um pré-caso que não existe mais
  _atendAberto.delete(cliId); _pcSel.delete(cliId);
  for(const m of [_paEsc, _paCartao, _paBloco, _paAnalise, _paForaBl, _mapaLente, _mapaFora]) m.delete(cliId);
  // F30 · gerado o caso, o botão Documentos aparece — e a ficha JÁ abre nele,
  // com as procurações e o contrato para imprimir e colher a assinatura
  montarSidebar(); casoSel=k.id; abaAtiva=0;
  subCad="documentos"; guardar("crm_subcad","documentos");
  render(); abrirFicha(cliId);   // teste 11.88, TRI-01: a lista do Escritório tira o pré-caso convertido
}
// ══════════════════════════════════════════════════════════════════════════
// F175 · os QUATRO PASSOS do atendimento (Serviço, PDF do Prévius, Análise de
// direito, Destino), lidos do estado do pré-caso — nada novo é gravado
// ══════════════════════════════════════════════════════════════════════════
const MANTIDO_ESCR = "Mantido em Escritório: faltam documentos";
function passosDoAtendimento(c, pc){
  const desde = String(pc.em||"").slice(0,10);
  const as = analisesDaVez(c);
  const previus = (D.anexos||[]).some(a=>(!a.cliente_id || a.cliente_id===c.id) && /pr[eé]vius/i.test(a.nome||""))
    || as.some(a=>a.fonte==="previus");
  const mantido = ((c.campos||{}).atendimento||[]).some(n=>String(n.texto||"").startsWith("Mantido em Escritório")
    && (!n.precaso_id || n.precaso_id===pc.id));
  return [
    {n:1, nome:"Serviço", feito:!!pc.especie, sub:pc.especie||"espécie e subespécie"},
    {n:2, nome:"PDF do Prévius", feito:previus, sub:previus?"PDF guardado":"opcional, preenche a análise"},
    {n:3, nome:"Análise de direito", feito:as.some(a=>(a.data_analise||"")>=desde), sub:"campos da espécie"},
    {n:4, nome:"Destino", feito:mantido, sub:mantido?"mantido em Escritório":"lista do caso"},
  ];
}
function passosAtendimentoHtml(c, pc){
  const ps = passosDoAtendimento(c, pc), atual = (ps.find(p=>!p.feito)||{}).n;
  return `<ol class="adr-passos" aria-label="Passos do atendimento">${ps.map(p=>`<li>
    <button type="button" class="adr-passo${p.feito?" feito":""}" ${p.n===atual?`aria-current="step"`:""}
      onclick="irPassoAtendimento(${p.n},'${c.id}','${pc.id}')">
      <span class="adr-bola">${p.n}</span>
      <span class="adr-passo-txt"><b>${p.nome}</b><small>${p.feito&&p.n!==1&&p.n!==4?"feito · ":""}${esc(p.sub)}</small></span>
    </button></li>`).join("")}</ol>`;
}
function irPassoAtendimento(n, cliId, pcId){
  const ir = sel => { const e=document.querySelector(sel); if(e){ e.scrollIntoView({block:"center"}); if(e.focus) e.focus(); } };
  if(n===1){
    const pc=precasosDe(D.cliPorId.get(cliId)||{}).find(p=>p.id===pcId);
    if(pc && !pc.especie) return escolherEspeciePre(cliId, pcId);
    mesaAberta.add("b1"); repintarFicha(); return ir(".mesa-b1");
  }
  if(n===4) return ir("#pcf-"+pcId);
  abrirAnaliseForm(cliId, n===2 ? "#ad-previus-arq" : "#ad-esp");
}
function abrirAnaliseForm(cliId, foco){
  adAbrir=true; adVisivel.add(cliId);
  abaAtiva=0; subCad="direito"; guardar("crm_subcad","direito"); repintarFicha();
  const e=document.querySelector(foco||"#ad-novo");
  if(e){ e.scrollIntoView({block:"center"}); if(e.focus) e.focus(); }
}
// o botão da decisão: lista escolhida gera o caso; "Manter em Escritório"
// só registra a anotação e o pré-caso continua
function destinoDoPre(cliId, pcId){
  const v=(document.getElementById("pcf-"+pcId)||{}).value;
  return v==="escritorio" ? manterEmEscritorio(cliId, pcId) : gerarCasoDoPre(cliId, pcId);
}
async function manterEmEscritorio(cliId, pcId){
  const c=D.cliPorId.get(cliId); if(!c) return;
  const nota={id:crypto.randomUUID(), em:new Date().toISOString(), quem:(eu.nome||"").split(" ")[0],
    autor_id:eu.id, texto:MANTIDO_ESCR, origem:"app", ...(pcId?{precaso_id:pcId}:{})};
  const campos={...(c.campos||{}), atendimento:[...((c.campos||{}).atendimento||[]), nota]};
  try{
    await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({campos})});
  }catch(e){ return aviso("Não consegui guardar — tente de novo"); }
  c.campos=campos; aviso("Cliente mantido em Escritório", false); repintarFicha();
}
// ══════════════════════════════════════════════════════════════════════════
// F176 · CLIENTE EM ESCRITÓRIO: novo andamento, procurações e criar caso
// ══════════════════════════════════════════════════════════════════════════
const semEmoji = l => String(l).replace(/^[^\p{L}\p{N}]+/u, "");
function barraEscritorio(c){
  return `<section class="adr-barra-esc" aria-label="Ações do cliente em Escritório">
    <p>Cliente mantido em <b>Escritório</b>. O acompanhamento corre pela Análise de Direito e por Aposentadorias futuras.</p>
    <button type="button" class="adr-bt" onclick="novoAndamentoDireito('${c.id}')" title="+ Novo andamento"><span aria-hidden="true">+ Andamento</span><span class="sr-only">+ Novo andamento</span></button>
    <button type="button" class="adr-bt" onclick="modalProcuracoes('${c.id}')" title="Gerar procurações"><span aria-hidden="true">Procurações</span><span class="sr-only">Gerar procurações</span></button>
    <button type="button" class="adr-bt adr-primario" onclick="modalCriarCaso('${c.id}')" title="Criar caso">Criar<span class="sr-only"> caso</span></button>
  </section>`;
}
function novoAndamentoDireito(cliId){
  adVisivel.add(cliId);
  abaAtiva=0; subCad="direito"; guardar("crm_subcad","direito"); repintarFicha();
  const ta=document.getElementById("ad-anot");
  if(ta){ ta.scrollIntoView({block:"center"}); ta.focus(); }
}
// termo de representação e declaração de não recebimento acompanham a
// procuração administrativa no INSS: saem marcados junto com as procurações
const PROC_MODELOS = ["proc_adm","proc_judicial","termo","beneficiario","pobreza","contrato"];
function modalProcuracoes(cliId){
  caixa(`<div class="adr-modal" role="dialog" aria-labelledby="adr-t-proc">
    <h3 id="adr-t-proc">Gerar procurações</h3>
    <p class="meio-sub" style="margin:0">Saem preenchidas com os dados da Identificação, prontas para imprimir.</p>
    ${PROC_MODELOS.map(ch=>`<label class="adr-ck"><input type="checkbox" class="proc-ck" value="${ch}" ${/^(proc_|termo|beneficiario)/.test(ch)?"checked":""}>
      ${esc(DOCS_ESCRITORIO[ch].rot)}</label>`).join("")}
    <div class="adr-modal-bts">
      <button type="button" class="adr-bt" onclick="fecharCaixa()">Cancelar</button>
      <button type="button" class="adr-bt adr-primario" onclick="imprimirProcuracoes('${cliId}')">Imprimir</button>
    </div></div>`);
}
function imprimirProcuracoes(cliId){
  const chaves=[...document.querySelectorAll(".proc-ck:checked")].map(x=>x.value);
  if(!chaves.length) return aviso("Marque ao menos um documento");
  fecharCaixa();
  gerarTodosDocs(cliId, chaves);   // uma janela, uma folha por documento
}
const LISTAS_CRIAR = () => LISTAS_MOVER.filter(([,f])=>f!=="aposentadoria_futura" && f!=="pagamento");
function modalCriarCaso(cliId){
  const c=D.cliPorId.get(cliId); if(!c) return;
  const sv=servicoInicial(c);
  caixa(`<div class="adr-modal" role="dialog" aria-labelledby="adr-t-caso">
    <h3 id="adr-t-caso">Criar caso</h3>
    <label class="adr-campo"><span>Espécie</span>
      <select id="cc-esp" onchange="document.getElementById('cc-sub').innerHTML=this.value?opcoesSub(this.value,this.value):''">
        <option value="">escolha a espécie</option>
        ${ESPECIES.map(([cod,n])=>`<option value="${esc(cod)}" ${cod===sv.cod?"selected":""}>${esc(cod)} · ${esc(n)}</option>`).join("")}</select></label>
    <label class="adr-campo"><span>Subespécie</span>
      <select id="cc-sub">${sv.cod?opcoesSub(sv.cod, sv.sub):""}</select></label>
    <label class="adr-campo"><span>Lista</span>
      <select id="cc-lista">${LISTAS_CRIAR().map(([l,f])=>`<option value="${f}" ${f==="inss"?"selected":""}>${esc(semEmoji(l))}</option>`).join("")}</select></label>
    <div class="adr-modal-bts">
      <button type="button" class="adr-bt" onclick="fecharCaixa()">Cancelar</button>
      <button type="button" class="adr-bt adr-primario" onclick="criarCasoEscritorio('${cliId}')" title="Criar caso">Criar<span class="sr-only"> caso</span></button>
    </div></div>`);
}
async function criarCasoEscritorio(cliId){
  const c=D.cliPorId.get(cliId); if(!c) return;
  const v=id=>(document.getElementById(id)||{}).value||"";
  const cod=v("cc-esp"), chave=v("cc-sub"), fase=v("cc-lista")||"inss";
  if(!cod) return aviso("Escolha a espécie");
  const nome=nomeDaSubespecie(chave)||nomeDaEspecie(cod)||cod;
  const lista=(LISTAS_MOVER.find(([,f])=>f===fase)||["🙋 Escritório"])[0];
  const sub=chave && chave!==cod ? chave : null;
  // o mesmo caminho do gerarCasoDoPre: sem a coluna subespecie, vai sem
  const base={cliente_id:cliId, titulo:c.nome, beneficio:nome, fase, especie:cod, origem_lista:lista};
  const criar=corpo=>api(`/rest/v1/casos`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify(corpo)});
  let k;
  try{
    try{ [k]=await criar(sub ? {...base, subespecie:sub} : base); }
    catch(e){ if(sub && /subespecie|42703|PGRST204/.test(String(e.message||e))) [k]=await criar(base); else throw e; }
  }catch(e){ return aviso("Não consegui criar o caso — tente de novo"); }
  if(!k) return aviso("Não consegui criar o caso — tente de novo");
  fecharCaixa();
  D.casos.push(k); D.casoPorId.set(k.id,k);
  if(!D.casosDoCliente.has(cliId)) D.casosDoCliente.set(cliId,[]);
  D.casosDoCliente.get(cliId).push(k);
  await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({caso_id:k.id, autor_id:eu.id,
      texto:`[DECISÃO] Caso criado a partir do Escritório: ${nome} · lista ${semEmoji(lista)}.`})}).catch(()=>{});
  reindexarCliente(c); plim();
  // F236 · o caso de aposentadoria criado aqui pode ser o do card: ligado, o card vira "Virou caso" e não oferece gerar outro
  const cardV = ESP_APOS.test(cod) && cardsApos().find(l=>l.cliente_id===cliId && !["caso","arquivado"].includes(etapaDoCard(l)));
  if(cardV && await confirmar(`Este caso é a aposentadoria do card "${cardV.titulo||"Aposentadoria futura"}" de Aposentadorias futuras?\n\nO card vira "Virou caso" e se desliga.`)){
    await cardGravar(cardV.id, x=>{ x.etapa = "caso"; x.caso_id = k.id; x.em = hoje(); x.quem = eu.id; }, {ativo:false});
    separarCardsViraram();
  }
  await avisarCasoNovo(k.id, cliId, "criado a partir do Escritório");
  aviso(`Caso criado — ${nome}`, false);
  montarSidebar(); casoSel=k.id; abaAtiva=2; abrirFicha(cliId);
}
// anexo do pré-caso: o arquivo do cliente que ainda não tem caso
async function anexarPreCaso(cliId, inpId){
  const inp=document.getElementById(inpId||"pc-arq"), arq=inp&&inp.files&&inp.files[0];
  if(!arq) return;
  inp.value="";
  if(arq.size > MAX_ARQ) return aviso("Arquivo grande demais (máximo 20 MB)");
  const stamp=new Date().toISOString().replace(/[:.]/g,"-").toLowerCase();
  const caminho=`${cliId}/${stamp}-${nomeSeguro(arq.name)}`;
  aviso("Enviando o arquivo…", false);
  try{
    await subirArquivo(caminho, arq);
    const [an]=await api(`/rest/v1/anexos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:null, cliente_id:cliId, autor_id:eu.id,
        nome:arq.name, caminho, tipo:arq.type||null, tamanho:arq.size})});
    if(an) (D.anexos=D.anexos||[]).unshift(an);
    aviso("📎 Arquivo anexado ao atendimento");
    repintarFicha();
  }catch(e){
    aviso(/40[34]|bucket/i.test(e.message)
      ? "Rode o schema.sql mais novo no Supabase para usar os anexos"
      : "Não consegui enviar o arquivo — tente de novo");
  }
}
// a nota ganha corpo: importante, urgente, de qual pré-caso, atribuir e
// lembrar (lembrar cria LEMBRETE de aviso único com responsável — a
// estrutura pronta para o aviso de WhatsApp que já existe nos lembretes)
// F41 · quem recebe a anotação: multi, como no composer do caso
let atQuem=[];
// F55 · a mesa que se arruma sozinha: bloco resolvido recolhe numa linha
// verde que informa a decisão; quem quiser mexer clica e ele reabre. O que
// o usuário abriu à mão fica aberto entre repinturas (Set em memória).
const mesaAberta = new Set();
function mesaDobra(chave, aberto){ aberto ? mesaAberta.add(chave) : mesaAberta.delete(chave); }
// F55 · a frase-viva: o rodapé da anotação DIZ em português o que vai
// acontecer ao guardar — o leigo confirma lendo, não decifrando controles
function fraseAcao({quem=[], lembrar="", prazo="", urg=false, pend=false}){
  const nomes = quem.map(id=>{const co=D.colPorId.get(id);return co?co.nome.split(" ")[0]:"";})
    .filter(Boolean);
  const p=["registra a anotação"];
  if(urg) p.push("marca <b>🔥 urgente</b>");
  if(pend) p.push("prende no quadro de <b>pendências</b> até resolver");
  if(nomes.length) p.push(`avisa <b>${nomes.join(", ")}</b>`);
  if(lembrar) p.push(`cria lembrete para <b>${fmt(lembrar)}</b>${nomes.length?"":" (para quem escreveu)"}`);
  if(prazo) p.push(`marca <b>PRAZO FATAL ${fmt(prazo)}</b> e move o caso para 🗓 Tarefas com Prazo`);
  return "Ao guardar: " + p.join("; ") + ".";
}
function atualizarFraseNota(){
  const el=document.getElementById("at-frase"); if(!el) return;
  const v=id=>{const e=document.getElementById(id);return e?e.value:"";};
  const m=id=>{const e=document.getElementById(id);return !!(e&&e.checked);};
  el.innerHTML = fraseAcao({quem:atQuem, lembrar:v("at-lembrar"), prazo:v("at-prazo"),
    urg:m("at-urg"), pend:m("at-pend")});
}
function atQuemToggle(id){ atQuem = atQuem.includes(id) ? atQuem.filter(x=>x!==id) : [...atQuem, id]; atualizarFraseNota(); }
function atQuemTodos(){
  const todos=equipeAtiva().map(c=>c.id);
  const liga = atQuem.length!==todos.length;
  atQuem = liga ? todos : [];
  document.querySelectorAll(".at-eq").forEach(b=>b.classList.toggle("on", liga));
  atualizarFraseNota();
}
function atLembrarDia(d){
  const e=document.getElementById("at-lembrar"); if(e) e.value=d;
  atualizarFraseNota();
}
async function salvarNotaAtendimento2(cliId){
  const c=D.cliPorId.get(cliId), ta=document.getElementById("at-nota");
  if(!c||!ta) return;
  const t=(ta.value||"").trim(); if(!t) return aviso("Escreva a anotação");
  const v=id=>{const e=document.getElementById(id);return e?e.value:"";};
  const marcado=id=>{const e=document.getElementById(id);return !!(e&&e.checked);};
  // F55 · prazo fatal direto da anotação: com um caso em andamento, a data
  // move o caso para 🗓 Tarefas com Prazo (o mesmo efeito do 📌 seguimento)
  const prazoFatal=v("at-prazo");
  const ksAtivos=(D.casosDoCliente.get(cliId)||[]).filter(k=>k.fase!=="encerrado" && !ehPreCaso(k));   // F226 · prazo fatal é de caso de verdade
  if(prazoFatal && ksAtivos.length!==1)
    return aviso(ksAtivos.length?"Mais de um caso em andamento — marque o prazo pelo 📌 do próprio caso":"Prazo fatal pede caso em andamento — sem caso, use o marcador pendência");
  const nota={em:new Date().toISOString(), quem:(eu.nome||"").split(" ")[0],
              autor_id:eu.id, texto:(prazoFatal?`⏰ [PRAZO ${fmt(prazoFatal)}] ${carimboCatalogo("at", prazoFatal)}`:"")+t};
  delete catPrazo.at;
  const pcSel=v("at-pc"); if(pcSel) nota.precaso_id=pcSel;
  if(marcado("at-imp")) nota.importante=true;
  if(marcado("at-urg")) nota.urgente=true;
  if(marcado("at-pend")) nota.pendente=true;   // F54 · presa nas Pendências até resolver
  const atribs=[...atQuem], lembrar=v("at-lembrar");
  if(atribs.length){ nota.atribuidos=atribs; nota.atribuido=atribs[0]; }
  if(lembrar){
    nota.lembrar_em=lembrar;
    // a regra do composer vale aqui: data sem pessoa = lembrete de quem
    // escreveu; com pessoas, um lembrete por responsável
    const donos = atribs.length ? atribs : [eu.id];
    for(const dono of donos){
      try{
        const [l]=await api(`/rest/v1/lembretes`,{method:"POST",headers:{Prefer:"return=representation"},
          body:JSON.stringify({cliente_id:cliId, tipo:"geral",
            titulo:`Anotação: ${t.slice(0,60)}`, detalhes:{origem:"anotacao"},
            proximo_em:lembrar, responsavel_id:dono, criado_por:eu.id, ativo:true})});
        if(l) (D.lembretes=D.lembretes||[]).push(l);
      }catch(e){ aviso("A anotação vale, mas o lembrete não gravou (rode o schema_por_em_dia.sql)"); break; }
    }
  }
  const notas=[...((c.campos||{}).atendimento||[]), nota];
  c.campos={...(c.campos||{}), atendimento:notas};
  try{
    await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({campos:c.campos})});
  }catch(e){ return aviso("Não consegui guardar a anotação — tente de novo"); }
  if(/@\p{L}/u.test(t)) await mencionarNoCliente(cliId, t);   // F236 · o @ da anotação do atendimento avisa a pessoa
  if(prazoFatal){
    const k=ksAtivos[0];
    const corpoK={prazo:prazoFatal, mover_para:"🗓 Tarefas com Prazo", fase:"outro"};
    try{
      await api(`/rest/v1/casos?id=eq.${k.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
        body:JSON.stringify(corpoK)});
      Object.assign(k, corpoK);
    }catch(e){ aviso("A anotação valeu, mas o prazo não gravou no caso — tente pelo 📌"); }
  }
  ta.value=""; atQuem=[];
  const quantos=atribs.length;
  aviso(`Anotação guardada 📝${quantos?` — atribuída a ${quantos} colaborador(es)`:""}${lembrar?` · 🗓 ${fmt(lembrar)}`:""}${prazoFatal?` · ⏰ PRAZO ${fmt(prazoFatal)}`:""}`, false);
  repintarFicha();
}
// ══════════════════════════════════════════════════════════════════════════
// ⏳ F54 · PENDÊNCIAS EM ABERTO — a anotação antiga que não se resolve não
// pode sumir na pilha (pedido do Paulo: "a primeira anotação fica esquecida")
// ══════════════════════════════════════════════════════════════════════════
// Uma anotação é PENDENTE enquanto não for resolvida e (a) tiver sido marcada
// ⏳, (b) for urgente (a ligação da anotação rápida), ou (c) tiver item de
// checklist por fazer. As pendentes ficam PRESAS num quadro no topo das
// Anotações, com o ✔ resolver ali mesmo — em vez de reanotar, resolve-se.
function ehNotaPendente(n){
  // F56 · data de volta que passou sem resolução também é pendência — a
  // anotação "volta 20.08" não pode morrer calada quando 20.08 passa
  return !n.resolvida && (n.pendente===true || n.urgente===true ||
    (n.checklist||[]).some(i=>!i.feito) ||
    (n.lembrar_em && n.lembrar_em < hoje()));
}
async function resolverNotaAtendimento(cliId, idx){
  const c=D.cliPorId.get(cliId); if(!c) return;
  const notas=[...((c.campos||{}).atendimento||[])];
  if(!notas[idx]) return;
  notas[idx]={...notas[idx], resolvida:{em:hoje(), quem:(eu.nome||"").split(" ")[0]}};
  c.campos={...(c.campos||{}), atendimento:notas};
  await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({campos:c.campos})}).catch(()=>{});
  plim(); aviso("Pendência resolvida ✔", false);
  repintarFicha();
}
function quadroPendencias(c){
  const notas=((c.campos||{}).atendimento||[]);
  const pend=notas.map((n,idx)=>({n,idx})).filter(x=>ehNotaPendente(x.n));
  if(!pend.length) return "";
  return `<div class="caso" style="border-left:3px solid #E9B44C;margin-bottom:8px">
    <div class="rotulo-caso">Pendências em aberto (${pend.length})</div>
    <p class="meio-sub" style="margin:2px 0 4px">Ficam aqui em cima até alguém resolver — a anotação
      antiga não se perde na pilha.</p>
    <ul class="mov-lista">${pend.map(({n,idx})=>`<li>
      <span class="mov-data">${n.em?fmt(n.em.slice(0,10)):"—"}</span>
      <span class="mov-txt">${n.urgente?"🔥 ":""}${n.lembrar_em?(n.lembrar_em<hoje()
          ?`<span class="chip venceu-chip">⏰ venceu ${fmt(n.lembrar_em)}</span> `
          :`<span class="chip volta-chip">📅 volta ${fmt(n.lembrar_em)}</span> `):""}${n.quem?`<b>${esc(n.quem)}:</b> `:""}${esc(n.texto||"")}
        ${(n.checklist||[]).some(i=>!i.feito)?`<span class="chip neutro">${(n.checklist||[]).filter(i=>!i.feito).length} item(ns) do checklist por fazer</span>`:""}</span>
      <button class="btn-mini" onclick="resolverNotaAtendimento('${c.id}',${idx})"
        title="marca como resolvida — sai daqui e ganha o selo na lista">Resolvida</button>
    </li>`).join("")}</ul></div>`;
}
// F35 · a regra da volta vale para a própria anotação: quem escreveu apaga
// (só o autor — o × não aparece nas anotações dos outros)
async function apagarNotaAtendimento(cliId, idx){
  const c=D.cliPorId.get(cliId); if(!c) return;
  const notas=[...((c.campos||{}).atendimento||[])];
  const n=notas[idx]; if(!n) return;
  if(n.autor_id ? n.autor_id!==eu.id : n.quem!==(eu.nome||"").split(" ")[0])
    return aviso("Só quem escreveu apaga");
  if(!await confirmar(`Apagar esta anotação sua?\n\n"${(n.texto||"").slice(0,120)}"`)) return;
  notas.splice(idx,1);
  c.campos={...(c.campos||{}), atendimento:notas};
  await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({campos:c.campos})}).catch(()=>{});
  aviso("Anotação apagada", false); repintarFicha();
}
// checklist dentro da anotação: itens marcáveis, com autor no risco
async function notaChecklistItem(cliId, idx){
  const el=document.getElementById("nck-"+idx);
  const t=(el&&el.value||"").trim(); if(!t) return;
  const c=D.cliPorId.get(cliId);
  const notas=[...((c.campos||{}).atendimento||[])];
  const n={...notas[idx]}; n.checklist=[...(n.checklist||[]), {t, feito:false}];
  notas[idx]=n;
  c.campos={...(c.campos||{}), atendimento:notas};
  await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({campos:c.campos})}).catch(()=>{});
  repintarFicha();
}
async function notaChecklistToggle(cliId, idx, ci){
  const c=D.cliPorId.get(cliId);
  const notas=[...((c.campos||{}).atendimento||[])];
  const n={...notas[idx]}; const ck=[...(n.checklist||[])];
  ck[ci]={...ck[ci], feito:!ck[ci].feito, quem:(eu.nome||"").split(" ")[0], em:hoje()};
  n.checklist=ck; notas[idx]=n;
  c.campos={...(c.campos||{}), atendimento:notas};
  await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({campos:c.campos})}).catch(()=>{});
  repintarFicha();
}

// ══════════════════════════════════════════════════════════════════════════
// ⚡ F50 · ANOTAÇÃO RÁPIDA — o botão que atende o telefone
// ══════════════════════════════════════════════════════════════════════════
// O cliente liga ou aparece no balcão, e o colaborador anota AGORA, sem
// procurar ficha, aba nem caso: nome, texto, guardar. O registro nasce
// URGENTE por padrão (pedido do Paulo): com caso em andamento, vira
// andamento e o caso é marcado 🔥 (sobe em toda lista, com contador); sem
// caso, vira anotação urgente do atendimento na ficha — e nada se perde.
let arCliSel=null, arLead=null, arNovo=null;
// F290 · SUGESTÕES DA EQUIPE. Qualquer colaborador anota um erro, uma correção ou uma melhoria, com a tela
// em que estava; somente o titular lê (RLS em schema_sugestoes.sql). Quem escreve não lê nem o que gravou,
// por isso o POST vai com return=minimal
// F313 · AJUDA (pedido do Paulo de 31.10.2026: "botões de ajuda em tudo para que o
// colaborador possa aprender a mexer"). O "?" ao lado do título da lista, o "? Ajuda"
// fixo no canto e o "?" pequeno das barras e quadros abrem o texto do assunto, com a
// lista de todos os assuntos no pé. Os textos moram em AJUDA; os lugares, em AJUDA_ALVOS.
const AJUDA = {
  // as listas do menu
  meudia: ["Meu Dia", `<p>Reúne o que você deve fazer hoje: as tarefas que vencem hoje, as vencidas, os prazos dos tribunais, as perícias sem confirmação e as menções.</p>
    <p>Clique no nome do cliente para abrir a ficha. O resumo do último dia útil fica no alto, recolhido. Use os botões das pessoas para ver o dia de outro colega.</p>`],
  mencoes: ["Menções", `<p>Lista as anotações em que alguém escreveu @ e o seu nome. Responda com <b>Ok</b> ou <b>Feito</b>: a resposta entra no caso e quem citou recebe o aviso.</p>`],
  novidades: ["Novidades", `<p>Mostra o que os portais trouxeram e ninguém leu: movimentos do PJe, do e-SAJ, do eproc, do e-Recursos e do Meu INSS. O que pede ação (perícia, audiência ou julgamento a agendar) aparece em destaque.</p>
    <p>Leia, tome a providência no caso e marque como lida.</p>`],
  planejado: ["Planejado", `<p>Mostra, por data, tudo o que tem dia marcado: casos com prazo, tarefas e lembretes. Serve para ver a semana e o mês antes de chegarem.</p><p>As abas do alto trocam a visão: Lista (por dia, com os filtros Prazos, Perícias, Tarefas, Retornos e Lembretes), Mês (o calendário), Perícias (perícias e audiências, inclusive as que pedem confirmação) e Casos (a lista Tarefas com Prazo, pela data fatal). A 📅 Agenda dos atendimentos continua à parte.</p>`],
  agendaq: ["Agenda", `<p>É a agenda do Google do escritório. Os horários tracejados são <b>vagas</b>: clique na vaga para agendar o cliente nela. O 001 é o primeiro atendimento (45 minutos) e o 002 é o retorno de quem já é cliente (30 minutos).</p>
    <p>No atendimento marcado, use <b>Editar</b> para corrigir nome e telefone, ou remarque e cancele: a vaga volta a ficar livre. A opção <b>Completa</b> junta as agendas do Paulo, do Marcos e da Amanda.</p>`],
  minhas: ["Atribuídas a mim", `<p>Lista os casos em que você é responsável ou tem tarefa. Abra o caso, faça o que a tarefa pede e conclua a tarefa no próprio andamento.</p>`],
  importante: ["Importante", `<p>Lista os casos e as anotações marcados com a estrela. Quem acende e apaga a estrela é a pessoa: o <b>Concluir por hoje</b> não a apaga. A estrela do canto da ficha marca todos os casos abertos do cliente, e a estrela vai junto à tarefa do Microsoft To Do.</p>`],
  particulares: ["Minhas Tarefas", `<p>São as suas tarefas pessoais, que somente você vê. A tarefa com data entra também no seu Meu Dia.</p>`],
  rotinas: ["Organizacional", `<p>São as rotinas do escritório que se repetem (semanal, mensal). Marque como feita quando cumprir; ela volta na próxima data.</p>`],
  acervo: ["Cuidar do acervo", `<p>Reúne as filas de arrumação: clientes com mais de um caso aberto, cadastros sem CPF, casos sem etapa. Cada fila diz o que conferir e oferece o botão que resolve.</p>`],
  calendario: ["Calendário", `<p>Mostra o mês com as perícias, audiências, prazos e tarefas. Clique no dia para ver o que há nele.</p>`],
  checagem: ["Checagem manual", `<p>São os casos que nenhum robô acompanha (por exemplo, o e-SISREC com a senha do cliente). Confira o portal e registre a checagem pelo botão do cartão do caso. Os nunca checados vêm primeiro.</p>`],
  "fase:prazo": ["Tarefas com Prazo", `<p>Casos com prazo fatal, na ordem da data: o mais urgente no alto. Ao cumprir, use o botão de feito do caso, que o devolve à lista de origem.</p>`],
  "fase:escritorio": ["Escritório", `<p>São os clientes em atendimento no escritório, antes de o pedido chegar ao INSS: pré-casos e casos em formação. O selo do cartão diz em que passo do atendimento está.</p>`],
  "fase:inss": ["INSS", `<p>São os casos com pedido em andamento no INSS. Abra o caso, confira o Meu INSS e registre o resultado: <b>Em análise</b> quando nada mudou, <b>Movimentou</b> quando houve exigência, perícia ou decisão.</p>`],
  "fase:conselho": ["Conselho de Recursos", `<p>São os casos com recurso no CRPS (e-Recursos). A aba Recurso do caso mostra o que o portal trouxe; a pauta de julgamento propõe agendar o julgamento e a sustentação oral.</p>`],
  "fase:judicial": ["Judicial", `<p>São os processos na Justiça. A aba Judicial do caso mostra os movimentos do PJe, do e-SAJ e do eproc, e os prazos aparecem no quadro Prazos à direita.</p>`],
  "fase:peticao_inicial": ["Petições Iniciais", `<p>São os casos em que a petição inicial está em preparo. Ao protocolar, informe o número do processo no caso, e ele passa ao Judicial.</p>`],
  "fase:aposentadoria_futura": ["Aposentadorias futuras", `<p>São os clientes que ainda não têm direito e aguardam a data. Cada cartão mostra a data provável do direito e a fonte dela. Três meses antes, o CRM avisa para reunir os documentos.</p>`],
  direito: ["Análise de Direito", `<p>Lista os clientes cuja análise mais recente diz que o direito já foi alcançado. São os que pedem ação: protocolar o pedido.</p>`],
  clientes: ["Clientes", `<p>Lista todos os clientes em ordem de nome. Use as letras de A a Z ou digite nome, CPF ou telefone. A bolinha diz a situação: verde com caso ativo, amarela em formação, vermelha sem caso aberto.</p>`],
  claude: ["Claude", `<p>Reúne os pedidos e as sugestões do Claude sobre os casos. O pedido abre no Claude já escrito, para revisar e enviar.</p>`],
  docmodelos: ["Modelos", `<p>São os modelos de documento do escritório (procuração, contrato, declarações). O modelo gera o documento já preenchido com os dados do cliente.</p>`],
  quadro: ["Quadro", `<p>Mostra os casos em colunas. Use "Agrupar por" para trocar a coluna (fase, etapa, responsável) e arraste o cartão para mudá-lo de coluna.</p>`],
  tabela: ["Tabela", `<p>Mostra os casos abertos numa tabela. O cabeçalho ordena, o campo de cima filtra por nome, etapa, espécie ou responsável, e os botões filtram pela fase.</p><p>A etapa e o responsável se trocam na própria linha, com desfazer. A etapa oferece apenas as do catálogo da fase; a escrita à mão aparece, mas se troca na ficha.</p>`],
  pessoas: ["Pessoas", `<p>Mostra, em linhas, o que cada pessoa tem por dia nas próximas três semanas, com os vencidos à esquerda. É a mesma conta da Lista do Planejado.</p><p>O ponto vermelho indica prazo fatal e o roxo, perícia ou audiência. O clique no dia mostra os itens e abre a ficha.</p>`],
  vendas: ["Vendas", `<p>São os contatos que ainda não contrataram, em etapas até fechado ou perdido. Mova o contato de etapa conforme a conversa avança.</p>`],
  whatsapp: ["WhatsApp", `<p>São as conversas do WhatsApp do escritório. Assuma a conversa para responder, transfira a quem cuida do assunto e encerre ao terminar. O balão pode virar andamento do caso, e a nota interna não vai ao cliente.</p>
    <p>À direita fica a ficha de quem fala e dos clientes que essa pessoa representa.</p>`],
  parcerias: ["Parcerias", `<p>São os casos que vieram de parceiros, com o que cabe a cada um.</p>`],
  marketing: ["Marketing", `<p>Reúne as ações de divulgação do escritório e os números delas.</p>`],
  recebimentos: ["Recebimentos", `<p>Lista os honorários parcela por parcela, com o vencido mais antigo primeiro. Registre o recebimento na própria parcela; valor marcado "conferir valor" fica fora dos totais até ser corrigido.</p>`],
  agenda: ["Perícias e Audiências", `<p>Lista as perícias, audiências e julgamentos marcados. Depois da data, o CRM pergunta <b>Compareceu?</b>: responda para registrar o andamento e seguir a etapa do caso.</p>`],
  dashboard: ["Dashboard", `<p>Mostra os números do escritório: casos por fase, entradas, concessões e recebimentos.</p>`],
  patinss: ["Importar", `<p>Recebe o que as extensões coletaram nos portais (Meu INSS, PJe, e-SAJ, eproc, e-Recursos). Confira cada coleta e aplique: os andamentos entram nos casos certos. Com várias coletas, use "conferir e aplicar todas".</p>`],
  config: ["Configurações", `<p>Ajustes do escritório: equipe, WhatsApp, robô e IA, avisos e níveis da equipe. Somente o administrador vê esta tela.</p>`],
  novocliente: ["Novo Cliente", `<p>A etapa 1 pede apenas o CPF, a senha do gov.br e o telefone, e abre os portais para a extensão do dossiê baixar os documentos. A etapa 2 confere o que o dossiê trouxe e completa o cadastro.</p>`],
  busca: ["Pesquisa", `<p>Procure por nome, CPF, NB, protocolo ou número do processo. Se a pessoa não estiver no CRM, use <b>+ Cliente</b> para cadastrá-la.</p>`],
  // a ficha e o caso
  ficha: ["Ficha do cliente", `<p>As abas da ficha:</p><ul>
    <li><b>Cadastro</b>: identificação, contato, aposentadoria e o botão <b>+ atendimento</b>.</li>
    <li><b>Casos</b>: os casos do cliente; com mais de um, a seta escolhe qual abrir.</li>
    <li><b>Perícias</b>: as perícias e audiências do cliente.</li>
    <li><b>Honorários</b>: as parcelas do contrato.</li></ul>
    <p>O menu do cabeçalho tem <b>Trouxe documentos</b> e <b>Imprimir e separar para o cliente</b>.</p>`],
  "ficha:cadastro": ["Cadastro", `<p>Mostra a identificação do cliente. <b>Atualizar dossiê</b> busca de novo o que a extensão baixou e preenche os campos vazios, sem apagar o que foi digitado. O quadro Aposentadoria mostra a data provável da aposentadoria por idade.</p>
    <p>Para atender o cliente, use <b>+ atendimento</b> (somente o advogado).</p>`],
  "ficha:caso": ["Caso", `<p>À esquerda fica o cartão do caso (espécie, números e tramitação); no meio, os andamentos; à direita, os prazos.</p>
    <p>Nas abas, <b>Escritório</b> traz as anotações da equipe; <b>INSS</b>, <b>Recurso</b> e <b>Judicial</b>, o que veio dos portais; <b>Caso Completo</b>, tudo junto.</p>
    <p>Escreva a anotação no campo do alto. Ao terminar o que havia a fazer hoje, use <b>Concluir por hoje</b> e escolha quando o cliente volta à fila.</p>`],
  "ficha:prazos": ["Prazos do cliente", `<p>Junta numa tela as datas de todos os casos do cliente e as que são do cliente: qualidade de segurado, decadência da revisão, contribuições a pagar e o card das Aposentadorias futuras. Cada caso continua com o seu quadro Prazos.</p>`],
  "ficha:pericias": ["Perícias", `<p>Lista as perícias e audiências do cliente. Agende com aviso para o cliente ser avisado; depois da data, responda se compareceu.</p>`],
  "ficha:honorarios": ["Honorários", `<p>Lista as parcelas dos honorários de cada caso. Registre o recebimento na parcela; a concessão do benefício propõe as parcelas do contrato.</p>`],
  "ficha:novocaso": ["Novo caso", `<p>Informe o benefício ou serviço pedido para abrir um caso novo para o cliente.</p>`],
  "caso:abas": ["Abas do caso", `<ul>
    <li><b>Escritório</b>: as anotações da equipe e o campo de escrever.</li>
    <li><b>INSS</b>, <b>Recurso</b> e <b>Judicial</b>: somente o que veio dos portais, sem campo de escrever.</li>
    <li><b>Caso Completo</b>: tudo junto, por fase e por mês.</li></ul>`],
  "caso:prazos": ["Prazos", `<p>Lista as datas do caso: prazo fatal, perícia, volta à fila e o que vence em sete dias. O prazo fatal mostra quanto falta. "Ver mais datas" abre as que ficam mais adiante.</p>
<p>Anotação com ⏰ cria o prazo fatal; anotação com data cria o lembrete; Concluir por hoje marca a volta à fila.</p>
    <p>No caso do INSS, do Conselho e do Judicial, <b>Em análise</b> registra que o portal não mudou e <b>Movimentou</b> registra o que aconteceu.</p>`],
  "caso:cartao": ["Cartão do caso", `<p>Mostra a espécie, a fase e a tramitação; a tramitação é o link do portal. A seta no pé abre os números do caso (NB, protocolo, processo) e a gestão.</p>`],
  "caso:etapas": ["Fases e etapas", `<p>A faixa mostra as fases do caso e a etapa atual. Quando um fato novo contradiz a etapa, aparece a sugestão com <b>Aceitar</b>. A etapa é a que o cliente lê no portal.</p>`],
  "caso:escrever": ["Escrever no caso", `<p>Escreva a anotação e escolha o tipo. Uma data escrita no texto vira lembrete. Escreva @ e o nome para avisar um colega.</p>
    <p><b>Sem resposta</b> registra a tentativa de contato e marca a próxima. <b>Pedir ao cliente</b> registra o documento pedido e a data de entrega.</p>`],
  "caso:concluir": ["Concluir por hoje", `<p>Use quando terminou o que havia a fazer no caso hoje. Escolha quando o cliente volta à fila (amanhã, próxima semana, 15 dias, um mês ou uma data); a estrela fica e, se quiser, o caso passa a outra pessoa.</p>`],
  "caso:conferir": ["Conferir o caso", `<p><b>Em análise</b>: o portal não mudou; o CRM anota e marca nova conferência (a seta ▾ escolhe 3, 7, 15 ou 30 dias). <b>Movimentou</b>: houve exigência, perícia, decisão ou implantação; escolha o que aconteceu e o CRM grava a anotação, a etapa e o lembrete.</p>`],
  trouxe: ["Trouxe documentos", `<p>No balcão, marque o que o cliente entregou. O CRM junta o papel ao caso que o pediu e avisa o advogado. O papel que ninguém pediu recebe a sugestão do caso ou fica "a classificar".</p>`],
  // o atendimento
  atend: ["Atendimento", `<p>O atendimento tem quatro passos: <b>Identificação</b>, <b>Primeiro atendimento</b>, <b>Análise de Direito</b> e <b>Documentos</b>. As anotações do atendimento ficam à direita.</p>
    <p><b>Salvar pré-caso</b> grava o que foi feito. O fim de Documentos tem as saídas: criar o caso, enviar a Aposentadorias futuras ou encerrar.</p>`],
  "atend:identificacao": ["Identificação", `<p>Confira os dados do cliente que o dossiê trouxe e complete o que falta. Em seguida, passe ao Primeiro atendimento.</p>`],
  "atend:pa": ["Primeiro atendimento", `<p>É a leitura do dossiê, um quadro por documento: CNIS, RAIS, CNPJs, pedidos ao INSS, benefícios, saúde, CadÚnico. Os itens marcados vão à Análise de Direito; desmarque o que não importa.</p>
    <p>No último passo, escolha os benefícios e use <b>Concluir e levar à Análise de Direito</b>.</p>`],
  "atend:direito": ["Análise de Direito", `<p>Os passos: <b>Pendências</b> (o que o cliente ou o escritório deve providenciar), <b>Análise do Benefício</b> (requisitos já cumpridos e os que faltam) e <b>Conclusão</b>.</p>
    <p>Responda os campos que faltam; o veredito se recalcula na hora. O desfecho fica no fim de Documentos.</p>`],
  "atend:documentos": ["Documentos", `<p>Os passos: <b>Assinar</b> (procuração e contrato), <b>Pedir ao cliente</b> (o que falta, com a data de entrega), <b>Guia do pedido</b> e <b>Desfecho</b>.</p>
    <p>No Desfecho, escolha <b>Criar caso</b>, <b>Criar aposentadoria futura</b> ou <b>Encerrar</b>. As consultas ficam na gaveta Ferramentas.</p>`],
  // os botões fixos
  sugestoes: ["Sugestões", `<p>O botão Sugestões, no canto, serve para anotar um erro, uma correção ou uma melhoria do CRM, com print ou vídeo. Somente o Paulo lê.</p>`],
  agendaflut: ["Agenda flutuante", `<p>O botão Agenda, no canto, mostra as vagas dos próximos dias sem sair da tela. Clique na vaga para agendar.</p>`],
  rapida: ["Anotação rápida", `<p>O botão do raio, no canto, abre a anotação rápida: escolha o cliente e escreva, sem abrir a ficha.</p>`],
  atalhos: ["Atalhos de teclado", `<p>No computador, <b>Ctrl+K</b> abre a paleta: escreva parte do nome de uma lista, de uma ação ou de um cliente e tecle Enter. As setas escolhem e Esc fecha.</p>
    <p><b>N</b> abre a anotação rápida (com a ficha aberta, já para aquele cliente), <b>/</b> vai à pesquisa, <b>G</b> e depois <b>D</b> vai ao Meu Dia, <b>G</b> e depois <b>P</b> vai ao Planejado, e <b>?</b> mostra a lista dos atalhos. Os atalhos de uma tecla não valem dentro de um campo de texto.</p>`],
};
// os grupos da lista de assuntos, na ordem em que se aprende
const AJUDA_GRUPOS = [
  ["O dia", ["meudia","mencoes","novidades","planejado","pessoas","agendaq","minhas","importante","particulares","calendario","agenda"]],
  ["As listas", ["fase:escritorio","fase:inss","fase:conselho","fase:judicial","fase:peticao_inicial","fase:aposentadoria_futura","fase:prazo","checagem","clientes","direito","rotinas","acervo"]],
  ["A ficha e o caso", ["busca","novocliente","ficha","ficha:cadastro","ficha:caso","caso:abas","caso:cartao","caso:etapas","caso:prazos","caso:escrever","caso:concluir","caso:conferir","trouxe","ficha:prazos","ficha:pericias","ficha:honorarios","ficha:novocaso"]],
  ["O atendimento", ["atend","atend:identificacao","atend:pa","atend:direito","atend:documentos"]],
  ["Outras telas", ["whatsapp","recebimentos","patinss","quadro","tabela","vendas","parcerias","marketing","dashboard","claude","docmodelos","config"]],
  ["Os botões do canto", ["sugestoes","agendaflut","rapida"]],
  ["O teclado", ["atalhos"]],
];
// o assunto da tela em que a pessoa está
function ajudaChave(){
  if(clienteAberto){
    if(abaAtiva===0){
      if(!_atendAberto.has(clienteAberto)) return "ficha:cadastro";
      return {pa:"atend:pa", mapa:"atend:pa", direito:"atend:direito", documentos:"atend:documentos"}[subCad] || "atend:identificacao";
    }
    return {2:"ficha:caso", 5:"ficha:prazos", 3:"ficha:pericias", 4:"ficha:honorarios", 7:"ficha:novocaso"}[abaAtiva] || "ficha";
  }
  if(buscaTxt) return "busca";
  return AJUDA[visao] ? visao : "meudia";
}
function ajuda(chave, ev){
  if(ev){ ev.preventDefault(); ev.stopPropagation(); }
  const k = AJUDA[chave] ? chave : ajudaChave(), [t, x] = AJUDA[k];
  caixa(`<h3 style="margin:0 0 6px">Ajuda: ${esc(t)}</h3><div class="ajuda-txt">${x}</div>
    <details class="ajuda-outros"><summary>Outros assuntos</summary>${AJUDA_GRUPOS.map(([g, ks])=>
      `<p class="meio-sub" style="margin:8px 0 4px">${g}</p><div class="ajuda-lista">${ks.map(c=>
        `<button class="btn-mini${c===k?" on":""}" onclick="ajuda('${c}')">${esc(AJUDA[c][0])}</button>`).join("")}</div>`).join("")}</details>`);
}
// o "?" fica fora das abas do caso, do campo de escrever, do cartão do caso, dos botões de conferir e da faixa
// das fases (que já tem o seu): lá ele virava aba, alongava o campo fixo do celular ou quebrava a linha; esses
// assuntos abrem pelo "? Ajuda" fixo e pela lista de assuntos
// onde o "?" pequeno entra: o seletor e o assunto (null = o assunto da tela)
const AJUDA_ALVOS = [
  [".menu-topo", "ficha"], [".atend-cab", null],
  [".tp-trilha", null], [".fp-cab", "caso:prazos"],
];
function pintarAjudas(){
  for(const [sel, chave] of AJUDA_ALVOS) document.querySelectorAll(sel).forEach(el=>{
    if(el.dataset.ajuda) return; el.dataset.ajuda = "1";
    const b = document.createElement("button");
    b.className = "ajuda-bt"; b.type = "button"; b.textContent = "?";
    b.setAttribute("aria-label", "Ajuda" + (chave ? ": " + AJUDA[chave][0] : ""));
    b.title = "como usar" + (chave ? ": " + AJUDA[chave][0] : " esta tela");
    b.setAttribute("onclick", chave ? `ajuda('${chave}',event)` : "ajuda(null,event)");
    el.appendChild(b);
  });
}
{ let fila = 0;   // um passo por quadro, por mais que a tela se repinte
  new MutationObserver(()=>{ if(!fila) fila = requestAnimationFrame(()=>{ fila = 0; pintarAjudas(); }); })
    .observe(document.body, {childList:true, subtree:true}); }
const SUG_TIPOS = [["erro","Erro"],["correcao","Correção"],["melhoria","Melhoria"]];
function telaAtual(){
  const c = clienteAberto && D.cliPorId && D.cliPorId.get(clienteAberto);
  return visao + (c ? ` · ficha de ${c.nome} (aba ${abaAtiva})` : "");
}
const souTitular = () => !!eu && eu.inicial==="P";
function abrirSugestao(){
  caixa(`<h3 style="margin:0 0 2px">✎ Sugestões para o CRM</h3>
    <p class="meio-sub" style="margin:0 0 4px">Anote um erro, uma correção ou uma melhoria. Somente o Paulo lê.</p>
    <div class="sug-tipos" role="radiogroup" aria-label="tipo">${SUG_TIPOS.map(([v,r],i)=>
      `<label><input type="radio" name="sug-tipo" value="${v}" ${i?"":"checked"}> ${r}</label>`).join("")}</div>
    <textarea id="sug-texto" rows="4" style="width:100%;resize:vertical"
      placeholder="o que aconteceu, onde e o que deveria acontecer"></textarea>
    <label class="meio-sub" style="display:block;margin:6px 0">Anexar print ou vídeo (até 50 MB cada):
      <input type="file" id="sug-arq" accept="image/*,video/*" multiple></label>
    <p class="meio-sub" style="margin:4px 0">Tela: ${esc(telaAtual())}</p>
    <div class="form-linha"><button style="margin-left:auto" onclick="salvarSugestao()" title="Enviar ao Paulo">Enviar<span class="sr-only"> ao Paulo</span></button></div>
    ${souTitular()?`<div id="sug-lista" style="margin-top:10px"><p class="meio-sub">Carregando as recebidas…</p></div>`:""}`);
  document.getElementById("sug-texto").focus();
  if(souTitular()) carregarSugestoes();
}
async function salvarSugestao(){
  const t = (document.getElementById("sug-texto").value||"").trim();
  if(!t){ aviso("Escreva a sugestão"); return; }
  const tipo = (document.querySelector('input[name="sug-tipo"]:checked')||{}).value || "erro";
  const arqs = [...((document.getElementById("sug-arq")||{}).files||[])];
  if(arqs.some(f=>f.size > 50*1024*1024)){ aviso("Cada arquivo pode ter até 50 MB"); return; }
  try{
    // o arquivo vai ao bucket privado "sugestoes", que somente o titular lê
    const pasta = crypto.randomUUID(), arquivos = [];
    if(arqs.length) aviso("Enviando os anexos…", false);
    for(const f of arqs){
      const caminho = `${pasta}/${f.name.replace(/[^\w.\-]+/g,"_")}`;
      await subirArquivo(caminho, f, "sugestoes");
      arquivos.push({caminho, nome:f.name, tipo:f.type});
    }
    await api(`/rest/v1/sugestoes_equipe`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({tipo, texto:t, tela:telaAtual().slice(0,300), autor:eu.id, arquivos})});
    fecharCaixa(); aviso("Sugestão enviada ao Paulo");
  }catch(e){ aviso(e.status===404 ? "Falta rodar o schema_sugestoes.sql no Supabase" : "Não foi possível enviar: "+e.message); }
}
async function carregarSugestoes(){
  const div = document.getElementById("sug-lista"); if(!div) return;
  let ls;
  try{ ls = await api(`/rest/v1/sugestoes_equipe?select=*&order=criado_em.desc&limit=100`); }
  catch(e){ div.innerHTML = `<p class="meio-sub">Não foi possível ler as recebidas: ${esc(e.message)}</p>`; return; }
  const rot = Object.fromEntries(SUG_TIPOS);
  div.innerHTML = `<b>Recebidas (${ls.filter(x=>!x.lida_em).length} novas)</b>` + (ls.length ? ls.map(x=>{
    const a = D.colPorId && D.colPorId.get(x.autor);
    return `<div class="sug-it${x.lida_em?"":" nova"}"><b>${esc(rot[x.tipo]||x.tipo)}</b> · ${esc(a?a.nome:"?")} · ${esc(new Date(x.criado_em).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"}))}
      ${x.lida_em?"":`<button class="btn-mini" onclick="lerSugestao('${x.id}')" title="marcar como lida"><span aria-hidden="true">Lida</span><span class="sr-only">marcar como lida</span></button>`}
      <div style="white-space:pre-wrap">${esc(x.texto)}</div>
      ${(x.arquivos||[]).map(a=>`<button class="btn-mini" onclick="abrirAnexoSug('${esc(a.caminho)}')">📎 ${esc(a.nome)}</button>`).join(" ")}
      <div class="meio-sub">${esc(x.tela||"")}</div></div>`;
  }).join("") : `<p class="meio-sub">Nenhuma ainda.</p>`);
}
async function abrirAnexoSug(caminho){
  const guia = window.open("", "_blank");   // abrir agora: depois do await o navegador bloqueia
  try{ const u = await linkArquivo(caminho, 600, "sugestoes"); if(guia) guia.location = u; else location.href = u; }
  catch(e){ if(guia) guia.close(); aviso("Não foi possível abrir o anexo: "+e.message); }
}
async function lerSugestao(id){
  try{ await api(`/rest/v1/sugestoes_equipe?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({lida_em:new Date().toISOString()})}); }
  catch(e){ aviso("Não foi possível marcar: "+e.message); return; }
  carregarSugestoes();
}
// F403 · a anotação rápida do cliente: a da ficha (campos.atendimento) e a do caso (campos.rapidas, cópia curta do andamento)
function rapidasDoCliente(c){
  const cp = (c && c.campos) || {};
  return [...(cp.atendimento||[]).filter(n=>n.origem==="rapida"), ...(cp.rapidas||[])].sort((a,b)=>(b.em||"").localeCompare(a.em||""));
}
// F404 · a anotação rápida que ficou na ficha espera ser distribuída a um caso; enquanto espera, o botão fica vermelho
const rapidaPendente = n => n && n.origem==="rapida" && !n.distribuida;
const rapidasPendentes = c => (((c && c.campos) || {}).atendimento || []).filter(rapidaPendente);
const IC_NOTA = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M8 13h5M8 17h7"/><path d="m18.4 2.6 3 3L14 13l-4 1 1-4 7.4-7.4Z"/></svg>`;
function botaoRapidas(c){
  const p = rapidasPendentes(c).length;
  const t = p ? `Anotações rápidas: ${p} para distribuir a um caso` : "Anotações rápidas";
  return `<button class="det-imp det-notas${p?" on":""}" onclick="verRapidas('${c.id}')" title="${t}" aria-label="${t}">${IC_NOTA}</button>`;
}
function verRapidas(cliId){
  const c = D.cliPorId.get(cliId); if(!c) return;
  const at = (c.campos||{}).atendimento || [];
  const ks = (D.casosDoCliente.get(cliId)||[]).filter(k=>k.fase!=="encerrado");
  const an = id => (D.anexos||[]).find(a=>a.id===id);
  const quando = n => esc(new Date(n.em).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"}));
  const anexos = n => (n.anexos||[]).map(a=>`<button class="btn-mini" onclick="abrirAnexo('${a.id}')">📎 ${esc((an(a.id)||a).nome||"anexo")}</button>`).join(" ");
  const casoDe = n => { const id = n.caso_id || (n.distribuida||{}).caso_id, k = id && D.casoPorId.get(id); return k ? ` · ${esc(tituloCaso(k))}` : ""; };
  const pend = at.map((n,i)=>[n,i]).filter(([n])=>rapidaPendente(n)).sort((a,b)=>(b[0].em||"").localeCompare(a[0].em||""));
  const feitas = rapidasDoCliente(c).filter(n=>!rapidaPendente(n));
  caixa(`<h3 style="margin:0 0 8px">Anotações rápidas <small class="meio-sub">· ${esc(c.nome)}</small></h3>
    <div class="form-linha"><button style="margin-left:auto" onclick="anotacaoRapida(null,'${cliId}')" title="Nova anotação rápida">Nova<span class="sr-only"> anotação rápida</span></button></div>
    ${pend.length ? `<h4 style="margin:8px 0 4px;color:#d64570">Para distribuir · ${pend.length}</h4>` + pend.map(([n,i])=>`<div class="sug-it rp-pend">
      <b>${esc(n.quem||"")}</b> · ${quando(n)}${n.importante?" · ⭐":""}
      <div style="white-space:pre-wrap">${esc(n.texto||"")}</div>${anexos(n)}
      <div class="form-linha" style="margin-top:4px;align-items:center">
        ${ks.length ? `<select id="rp-caso-${i}" aria-label="caso que recebe a anotação">${ks.map(k=>`<option value="${k.id}">${esc(rotuloCasoEscolha(k))}</option>`).join("")}</select>
        <button onclick="distribuirRapida('${cliId}',${i})" title="Levar a anotação e os anexos ao caso escolhido">Distribuir<span class="sr-only"> ao caso escolhido</span></button>` : `<span class="meio-sub">Sem caso aberto.</span>`}
        <button class="btn-mini" onclick="distribuirRapida('${cliId}',${i},true)" title="Deixar na ficha, sem caso">Concluir<span class="sr-only"> sem levar a caso</span></button>
      </div></div>`).join("") : ""}
    ${feitas.length ? `<h4 style="margin:10px 0 4px">Distribuídas</h4>` + feitas.map(n=>`<div class="sug-it"><b>${esc(n.quem||"")}</b> · ${quando(n)}${n.importante?" · ⭐":""}${casoDe(n)}
      <div style="white-space:pre-wrap">${esc(n.texto||"")}</div>${anexos(n)}</div>`).join("") : ""}
    ${!pend.length && !feitas.length ? `<p class="meio-sub">Nenhuma anotação rápida.</p>` : ""}`);
}
// F404 · leva a anotação da ficha ao caso (andamento com o autor e a data de origem, anexos junto, ⭐ no caso) ou a conclui sem caso
async function distribuirRapida(cliId, i, semCaso){
  const c = D.cliPorId.get(cliId); if(!c) return;
  const at = [...((c.campos||{}).atendimento || [])], n = at[i]; if(!rapidaPendente(n)) return;
  const casoId = semCaso ? null : (document.getElementById(`rp-caso-${i}`)||{}).value, k = casoId && D.casoPorId.get(casoId);
  if(!semCaso && !k) return aviso("Escolha o caso");
  const d = {em:new Date().toISOString(), por:eu.id};
  try{
    if(k){
      const data = new Date(n.em).toLocaleDateString("pt-BR",{timeZone:"America/Sao_Paulo"});
      const [and] = await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({caso_id:casoId, autor_id:eu.id, origem:"app", texto:`Anotação rápida de ${n.quem||"—"} (${data}): ${n.texto||""}`})}) || [];
      d.caso_id = casoId; if(and) d.and_id = and.id;
      const ids = (n.anexos||[]).map(a=>a.id);
      if(ids.length){
        const mud = {caso_id: ehPreCaso(k) ? null : casoId, ...(and ? {andamento_id:and.id} : {})};
        await api(`/rest/v1/anexos?id=in.(${ids.join(",")})`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify(mud)});
        (D.anexos||[]).forEach(a=>{ if(ids.includes(a.id)) Object.assign(a, mud); });
      }
      if(n.importante && !k.importante){
        await api(`/rest/v1/casos?id=eq.${casoId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({importante:true})});
        k.importante = true;
      }
    }
    at[i] = {...n, distribuida:d};
    c.campos = {...(c.campos||{}), atendimento:at};
    await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({campos:c.campos})});
  }catch(e){ return aviso("Não gravou — tente de novo"); }
  aviso(k ? `Anotação levada a ${tituloCaso(k)}` : "Anotação concluída", false);
  document.querySelectorAll(".det-notas").forEach(b=>{ const x=document.createElement("span"); x.innerHTML=botaoRapidas(c); b.replaceWith(x.firstChild); });
  rapidasPendentes(c).length ? verRapidas(cliId) : fecharCaixa();
  if(k && clienteAberto===cliId) repintarFicha();
}
function arArquivos(el){
  const n = (el.files||[]).length, r = document.getElementById("ar-arq-n");
  if(r) r.textContent = n ? (n>1 ? `${n} arquivos` : el.files[0].name) : "";
}
function anotacaoRapida(pre, cliId){
  arCliSel=null; arLead=null; arNovo=null; capFora={};
  const aberto = !cliId && clienteAberto && D.cliPorId.get(clienteAberto);
  caixa(`<h3 style="margin:0 0 6px">⚡ Anotação rápida</h3>
    ${aberto ? `<button type="button" class="btn-mini ar-cli" style="margin-bottom:4px" onclick="arEscolher('${aberto.id}')" title="anotar para o cliente desta ficha">${esc(aberto.nome)}</button>` : ""}
    <input id="ar-busca" placeholder="cliente" autocomplete="off" style="width:100%"
      oninput="arProcurar(this.value)">
    <div id="ar-achados" style="margin-top:4px;max-height:180px;overflow:auto"></div>
    <div id="ar-alvo" class="meio-sub" style="margin-top:6px"></div>
    <textarea id="ar-texto" rows="3" placeholder="anotação"
      style="width:100%;margin-top:6px;resize:vertical" oninput="sugerirRetorno('ar-texto','ar-sug',arCliSel);pintarCapturaAr()"
      onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();salvarAnotacaoRapida();}"></textarea>
    <div id="ar-cap" style="margin-top:4px"></div>
    <div id="ar-sug" class="meio-sub" style="margin-top:4px"></div>
    <div class="form-linha" style="margin-top:4px;align-items:center;gap:6px">${window.SpeechRecognition || window.webkitSpeechRecognition ? `
      <button type="button" class="btn-mini" onclick="arDitar(this)" title="Ditar a anotação"><span aria-hidden="true">🎤 Ditar</span><span class="sr-only">Ditar a anotação</span></button>` : ""}
      <button type="button" class="btn-mini" onclick="arOrganizar()" title="A IA propõe cliente, caso, anotação, lembrete e juntada; nada grava sem o seu Gravar"><span aria-hidden="true">✨ Organizar</span><span class="sr-only">Organizar com a IA</span></button>
    </div>
    <div id="ar-ia"></div>
    <div class="form-linha" style="margin-top:6px;align-items:center">
      <label class="conta-ck"><input type="checkbox" id="ar-imp" checked>⭐ importante</label>
      <label class="btn-mini" title="carregar anexo">📎 Anexo<input type="file" id="ar-arq" multiple hidden onchange="arArquivos(this)"></label>
      <span id="ar-arq-n" class="meio-sub"></span>
      <button style="margin-left:auto" onclick="salvarAnotacaoRapida()" title="Guardar agora">Guardar<span class="sr-only"> agora</span></button>
    </div>`);
  const b=document.getElementById("ar-busca");
  if(cliId && D.cliPorId.get(cliId)){ arEscolher(cliId); return; }
  if(b){ b.focus(); if(pre&&String(pre).trim()){ b.value=String(pre); arProcurar(b.value); } }
}
// F436 · ⚡ COM IA (ideia do Tiimo aprovada pelo Paulo, 07.11.2026): o texto livre vai à Edge Function `anotacao_ia`, com os
// números longos mascarados, e volta como PROPOSTA (cliente, caso, anotação, lembrete, juntada). Gravar usa o mesmo
// salvarAnotacaoRapida; Corrigir devolve o texto ao campo. A data duvidosa vem marcada para conferir
let arIa = null;
const arLembrete = () => { const ck = document.getElementById("ar-lem-ck"), d = document.getElementById("ar-lem");
  return ck && ck.checked && d && /^\d{4}-\d{2}-\d{2}$/.test(d.value) ? d.value : null; };
function arDitar(bt){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition, ta = document.getElementById("ar-texto"); if(!SR || !ta) return;
  const r = new SR(); r.lang = "pt-BR"; r.interimResults = false;
  r.onresult = e => { ta.value = `${ta.value.trim()} ${[...e.results].map(x=>x[0].transcript).join(" ")}`.trim(); };
  r.onend = r.onerror = () => bt.classList.remove("on");
  bt.classList.add("on"); try{ r.start(); }catch(e){ bt.classList.remove("on"); }
}
async function arOrganizar(){
  const ta = document.getElementById("ar-texto"), box = document.getElementById("ar-ia"); if(!ta || !box) return;
  const texto = (ta.value||"").trim(); if(!texto) return aviso("Escreva ou dite a anotação");
  const cli = arCliSel && D.cliPorId.get(arCliSel);
  const casos = cli ? (D.casosDoCliente.get(cli.id)||[]).filter(k=>k.fase!=="encerrado")
    .map(k=>({id:k.id, rot:[k.especie||k.beneficio||"", NOME_FASE[faseEfetiva(k)]||NOME_FASE[k.fase]||""].filter(Boolean).join(" · ")})) : [];
  box.innerHTML = `<p class="meio-sub">Organizando…</p>`;
  let r; try{ r = await api("/functions/v1/anotacao_ia", {method:"POST", body:JSON.stringify({texto, hoje:hoje(), cliente:cli ? cli.nome : "", casos})}); }
  catch(e){ r = {erro: msgErro(e)}; }
  if(!document.getElementById("ar-ia")) return;
  if(!r || r.erro){ box.innerHTML = `<p class="meio-sub">Não organizou: ${esc((r && r.erro) || "sem resposta")}. Grave como está ou tente de novo.</p>`; return; }
  arIa = r;
  if(!cli && r.cliente){ document.getElementById("ar-busca").value = r.cliente; arProcurar(r.cliente); }
  const sel = document.getElementById("ar-caso"); if(sel && r.caso_id) sel.value = r.caso_id;
  const k = r.caso_id && D.casoPorId.get(r.caso_id);
  box.innerHTML = `<div class="ar-ia" role="group" aria-label="Proposta da IA">
    <div><b>Cliente:</b> ${cli ? esc(cli.nome) : r.cliente ? `${esc(r.cliente)} <span class="meio-sub">(escolha na lista acima)</span>` : `<span class="meio-sub">escolha na lista acima</span>`}</div>
    ${k ? `<div><b>Caso:</b> ${esc(rotuloCasoEscolha(k))}</div>` : ""}
    <div><b>Anotação:</b> ${esc(r.anotacao||texto)}</div>
    ${r.juntada ? `<div><b>Juntada</b> de documento</div>` : ""}
    ${r.lembrete_data || r.data_duvidosa ? `<label class="ar-ia-lem"><input type="checkbox" id="ar-lem-ck"${r.lembrete_data ? " checked" : ""}> Lembrete em <input type="date" id="ar-lem" value="${esc(r.lembrete_data||"")}">${r.lembrete_texto ? ` <span class="meio-sub">${esc(r.lembrete_texto)}</span>` : ""}</label>` : ""}
    ${r.data_duvidosa ? `<div class="ar-ia-duv">Conferir a data: ${esc(r.motivo_duvida || "o texto não a deixa clara")}</div>` : ""}
    <div class="form-linha" style="gap:6px;margin-top:6px"><button type="button" onclick="arIaGravar()" title="Gravar a proposta">Gravar</button><button type="button" class="btn-mini" onclick="arIaCorrigir()" title="Corrigir o texto antes de gravar">Corrigir</button></div></div>`;
}
function arIaGravar(){
  const ta = document.getElementById("ar-texto"); if(!ta || !arIa) return;
  if(arLembrete() && !((document.getElementById("ar-caso")||{}).value)) return aviso("O lembrete precisa do caso: escolha o caso");
  if(arIa.anotacao) ta.value = arIa.anotacao;
  salvarAnotacaoRapida();
}
function arIaCorrigir(){
  const ta = document.getElementById("ar-texto"), box = document.getElementById("ar-ia");
  if(ta && arIa && arIa.anotacao) ta.value = arIa.anotacao;
  if(box) box.innerHTML = ""; arIa = null; ta && ta.focus();
}
function arProcurar(txt){
  const div=document.getElementById("ar-achados"); if(!div) return;
  arCliSel=null; arLead=null; arNovo=null; arMostrarAlvo();
  const t=(txt||"").trim();
  if(t.length<2){ div.innerHTML=""; return; }
  const achados=pesquisar(t).slice(0,6);
  // F53 · pedido do Paulo: qualquer parte do nome lista embaixo — e SEMPRE
  // há saída embaixo da lista: criar CLIENTE novo ou criar INTERESSADO.
  // Nenhuma ligação fica sem registro por falta de cadastro.
  div.innerHTML = (achados.length ? achados.map(c=>`<button class="proc-op" style="padding:6px 10px"
      onclick="arEscolher('${c.id}')"><span class="proc-nome">${esc(c.nome)}</span>
      <span class="proc-sub">${c.cpf?`CPF ${esc(c.cpf)}`:"sem CPF"}</span></button>`).join("")
    : `<p class="meio-sub" style="margin:2px 0 4px">Ninguém com esse nome.</p>`)
    + (t.length>=3 ? `
      <button class="proc-op" style="padding:6px 10px;border-top:1px dashed var(--borda)" onclick="arNovoCliente()">
        <span class="proc-nome">➕ Cliente novo: “${esc(t)}”</span>
      </button>
      <button class="proc-op" style="padding:6px 10px" onclick="arNaoCliente()">
        <span class="proc-nome">➕ Interessado: “${esc(t)}”</span>
      </button>` : "");
}
function arNovoCliente(){
  const nome=(document.getElementById("ar-busca").value||"").trim();
  if(!nome) return;
  // F54 · cadastro exige NOME COMPLETO (pedido do Paulo)
  if(nome.split(/\s+/).length<2){ aviso("Escreva o nome COMPLETO (nome e sobrenome)"); return; }
  arCliSel=null; arLead=null; arNovo={nome};
  document.getElementById("ar-achados").innerHTML="";
  arMostrarAlvo();
  const tel=document.getElementById("ar-tel"); if(tel) tel.focus();
}
// F236 · RECADO SEM DESTINATÁRIO. "Pedi para aguardar o retorno do Dr. Paulo" sem @Paulo não chega a
// ninguém: o pedido de retorno sugere a menção a quem foi nomeado (ou ao advogado do cliente)
function quemDaRetorno(texto, cliId){
  const t = String(texto||"");
  if(/@\p{L}/u.test(t) || !/retorn|ligar de volta/i.test(t)) return [];
  const eq = equipeAtiva().filter(c=>c.id!==eu.id);
  const nomeados = eq.filter(c=>new RegExp(`\\b${dsa((c.nome||"").split(" ")[0])}\\b`).test(dsa(t)));
  if(nomeados.length) return nomeados;
  return cliId ? advogadoDoCliente(cliId).map(id=>D.colPorId.get(id)).filter(c=>c && c.id!==eu.id) : [];
}
// vale para a anotação rápida e para as anotações do atendimento (cliente sem caso); o compositor do caso
// já tem o @ com a lista da equipe
function sugerirRetorno(taId, boxId, cliId){
  const ta=document.getElementById(taId), box=document.getElementById(boxId); if(!ta || !box) return;
  const qs = quemDaRetorno(ta.value, cliId);
  box.innerHTML = qs.length ? `Pede retorno de alguém? ${qs.map(c=>`<button type="button" class="btn-mini" onclick="mencionarRetorno('${taId}','${boxId}','${cliId||""}','${c.id}')">@${esc(c.nome.split(" ")[0])} recebe o recado</button>`).join(" ")}` : "";
}
