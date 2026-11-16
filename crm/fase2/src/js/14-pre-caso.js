// F283 · os documentos a pedir, anotados durante o atendimento: um pedido do pré-caso em `campos.docs_pedidos`
// (origem "anotacoes"), o mesmo lugar que o Trouxe documentos e o Pedir ao cliente leem
const pcDoPedido = pc => pc && pc.id!=="legado" ? pc.id : null;
const docsAnotadosDe = (c, pc) => ((c.campos||{}).docs_pedidos||[]).find(p=>p.origem==="anotacoes" && (p.precaso_id||null)===pcDoPedido(pc));
function docsAnotadosHtml(c, pc){
  const its = (docsAnotadosDe(c, pc)||{}).itens||[];
  return `<div class="atend-docs atend-bloco"><h4>Documentos a pedir${its.length?` (${its.length})`:""}</h4>
    ${its.length ? `<ul>${its.map((it, i)=>`<li${it.entregue?' class="entregue"':""}>${esc(it.nome)}${it.entregue ? ` <small class="meio-sub">entregue em ${esc(fmtBarra(it.entregue))}</small>` : ` <button type="button" class="olho" title="tirar da lista" aria-label="tirar ${esc(it.nome)} da lista" onclick="docDesanotar('${c.id}',${i})">✕</button>`}</li>`).join("")}</ul>` : ""}
    <div class="atend-conv-nova"><input id="atend-doc" type="text" placeholder="Ex.: laudo do ortopedista atualizado" onkeydown="if(event.key==='Enter')docAnotar('${c.id}')">
      <button type="button" class="adr-bt" onclick="docAnotar('${c.id}')">Pedir</button></div></div>`;
}
async function gravarDocsAnotados(c, muda){
  const pc = preCasoAberto(c), peds = JSON.parse(JSON.stringify((c.campos||{}).docs_pedidos||[]));
  let p = peds.find(x=>x.origem==="anotacoes" && (x.precaso_id||null)===pcDoPedido(pc));
  if(!p){ p = {em:new Date().toISOString(), quem:(eu.nome||"").split(" ")[0], origem:"anotacoes", especie:(pc && pc.especie) || "benefício a definir", ...(pcDoPedido(pc) ? {precaso_id:pc.id} : {}), itens:[]}; peds.push(p); }
  muda(p.itens);
  // P4 · o pedido anotado ganha a data de entrega pelo papel mais demorado (o que já tinha data a mantém)
  if(!p.ate && p.itens.some(i=>!i.entregue)) p.ate = p.itens.filter(i=>!i.entregue).map(i=>prazoDocPadrao(i.nome)).sort().pop();
  const campos = {...(c.campos||{}), docs_pedidos:peds.filter(x=>x!==p || x.itens.length)};
  try{ await api(`/rest/v1/clientes?id=eq.${c.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({campos})}); }
  catch(e){ aviso("Não consegui gravar o documento — tente de novo"); return false; }
  c.campos = campos; repintarFicha(); return true;
}
async function docAnotar(cliId){
  const c = D.cliPorId.get(cliId), inp = document.getElementById("atend-doc"); if(!c || !inp) return;
  const t = (inp.value||"").trim(); if(!t) return aviso("Escreva o documento");
  await gravarDocsAnotados(c, its=>{ if(!its.some(i=>dsa(i.nome)===dsa(t))) its.push({nome:t, entregue:null}); });
}
async function docDesanotar(cliId, i){ const c = D.cliPorId.get(cliId); if(c) await gravarDocsAnotados(c, its=>its.splice(i, 1)); }
// F283b · as PENDÊNCIAS da Análise de Direito: o que o Primeiro atendimento marcou em vermelho ou amarelo, escrito como a
// providência a tomar e por quem (escritório ou cliente), para arrastar às anotações (pedido do Paulo, 26.10.2026)
// as competências em faixas: 03/2021, 04/2021, 05/2021 → "03/2021 a 05/2021"
function faixasDeComps(comps){
  const ks = [...new Set(comps.map(chaveComp))].sort(), out = [];
  for(const k of ks){ const u = out[out.length-1]; if(u && mesesEntreYm(u[1], k)===2) u[1] = k; else out.push([k, k]); }
  const br = k => k.split("-").reverse().join("/");
  return out.map(([a, b])=>a===b ? br(a) : `${br(a)} a ${br(b)}`);
}
const juntaE = xs => xs.length < 2 ? (xs[0]||"") : `${xs.slice(0, -1).join(", ")} e ${xs[xs.length-1]}`;
// o verbo da instrução que o texto já traz ("Peça a carteira…") vira a providência ("Deve pedir a carteira…")
const IMPERATIVO = {"peça":"pedir", "pedir":"pedir", "confira":"conferir", "junte":"juntar", "pergunte":"perguntar", "baixe":"baixar", "traga":"trazer", "rode":"rodar", "atualize":"atualizar"};
function instrucaoDoTexto(t){
  const m = String(t).match(/(?:^|[.;:]\s+)(Pe[çc]a|Pedir|Confira|Junte|Pergunte|Baixe|Traga|Rode|Atualize)\b([^.;]*)/i);
  return m ? `Deve ${IMPERATIVO[m[1].toLowerCase()]}${m[2]}` : "";
}
function providenciaDe(p, ctx){
  const k = p.k || "", t = String(p.txt || ""), esc_ = "Escritório", cli = "Cliente";
  if(k==="cnis.qual"){ const at = t.match(/pode pagar os meses atrasados \(([^)]+)\)/), ate = (t.match(/até (\d{2}\/\d{2}\/\d{4})/)||[])[1];
    if(at && !/Perdeu/.test(t)) return [cli, `Deve pagar os meses atrasados (${at[1]})${ate ? ` até ${ate}` : ""}, para não perder a qualidade de segurado`];
    const perda = (t.match(/em (\d{2}\/\d{2}\/\d{4})/)||[])[1];
    return [esc_, /Pergunte/.test(t) ? `Deve perguntar se a pessoa ficou desempregada depois do último mês pago (seguro-desemprego ou cadastro no SINE estendem a graça em 12 meses); sem isso, a qualidade foi perdida${perda ? ` em ${perda}` : ""}`
      : `Deve avaliar o reingresso: a qualidade foi perdida${perda ? ` em ${perda}` : ""} e só volta com novas contribuições`]; }
  if(/^cad:/.test(k) && /sem a data do CadÚnico/.test(t)) return [esc_, `Deve anotar a data de inscrição ou de atualização do CadÚnico, pelo comprovante do CRAS`];
  if(k==="cnis.min"){ const fx = faixasDeComps(((ctx.an||{}).abaixo||[]).map(x=>x.comp));
    return [cli, `Deve pagar a complementação das competências ${juntaE(fx)}, que estão abaixo do mínimo (o escritório gera a guia)`]; }
  if(/^cnis\.ind:PEXT/.test(k) && !/não peça a carteira/.test(t)) return [cli, `Deve trazer a carteira de trabalho (contrato e saída), a rescisão e os holerites do vínculo que entrou fora do prazo; depois, pedir o acerto do CNIS`];
  if(/^cnis\.(ctps|papeis):/.test(k)) return [esc_, `Deve pedir o acerto do CNIS para incluir o vínculo, com a carteira de trabalho e os papéis da época: ${t.replace(/^[^:]*:\s*/, "").replace(/\.\s*Pe.*$/, "")}`];
  if(/^cnis\.aberto:/.test(k)) return /Pedir a correção/.test(t) ? [esc_, `Deve pedir a correção da data de saída no CNIS com a carteira de trabalho (RAC Vínculos): ${t.split(";")[0].replace(/^[^:]*:\s*/, "")}`]
    : [esc_, `Deve confirmar com a pessoa se ainda trabalha em ${t.replace(/^[^:]*:\s*/, "").split(",")[0]}; se saiu, pedir a correção da data de saída no CNIS com a carteira de trabalho`];
  if(/^cnis\.limbo:/.test(k)) return [cli, `Deve pedir à empresa a declaração escrita de que recusou a volta ao trabalho; com ela, o escritório avalia o novo pedido ao INSS ou a ação contra a empresa`];
  if(/^rais\.lic:/.test(k)) return [esc_, `Deve confirmar com a pessoa a ${t.split(":")[0].toLowerCase()}; se não houve, pedir ao empregador a retificação da RAIS`];
  if(/^rais\.vinc:/.test(k)) return [cli, `Deve trazer a carteira de trabalho ou a rescisão com a data de saída do ${t.split(":")[0].replace(/^Vínculo/, "vínculo")}`];
  if(/^cnpj\.pergunta:/.test(k)) return [esc_, `Deve perguntar se a empresa ainda funciona; se parou, a pessoa deve pedir a baixa do CNPJ, porque o INSS presume a atividade`];
  if(/^ppp:/.test(k)){ const emp = (t.match(/^PPP de ([^,]+)/)||[])[1] || "do empregador";
    return [cli, /falta o PPP de/.test(t) ? `Deve pedir à ${emp} o PPP do período que falta: ${(t.match(/falta o PPP de ([^:.,]+)/)||[])[1]||""}`
      : /EPI/.test(t) ? `Deve pedir à ${emp} o LTCAT do período, para provar que o EPI declarado eficaz no PPP não protegia`
      : `Deve pedir à ${emp} a retificação do PPP (agente, intensidade ou período): ${t.replace(/^PPP de [^:]*:\s*/, "")}`]; }
  if(/^ped\.semprorrog:/.test(k)) return [esc_, `Deve fazer novo pedido do benefício, porque não houve pedido de prorrogação antes do corte`];
  if(/^ped\./.test(k)) return [esc_, `Deve cumprir o prazo: ${t}`];
  if(/^ben\.dec:/.test(k)) return [esc_, `Deve pedir a revisão antes do fim do prazo de decadência: ${t}`];
  if(/^ben\.cota:/.test(k)) return [esc_, `Deve avaliar o recurso ou a ação contra o corte da cota da pensão: ${t}`];
  if(/^saude/.test(k)) return [cli, `Deve trazer relatório médico atual, com data, CID e o que impede o trabalho`];
  if(k==="cad.atualizacao") return [cli, `Deve atualizar o CadÚnico no CRAS antes do pedido, porque o cadastro passou de 24 meses`];
  if(/^falta:/.test(k)){
    if(/Emprega Brasil|CTPS, RAIS/i.test(t)) return [esc_, `Deve rodar o Emprega Brasil na extensão do dossiê (carteira de trabalho, RAIS e CAGED)`];
    if(/HC Ribeir/i.test(t)) return [esc_, `Deve rodar o portal do HC Ribeirão na extensão do dossiê, se a pessoa se trata lá`];
    if(/Redesim|CNPJ/i.test(t)) return [esc_, `Deve rodar a Redesim na extensão do dossiê, para conferir as empresas em nome da pessoa`];
    // TRI-10 · a pendência leva a condição do quadro ("se houve atividade especial", "se envolver doença")
    if(/PPP/.test(t)) return [cli, /se houve atividade especial/i.test(t) ? `Se houve atividade especial, deve pedir ao empregador o PPP de cada vínculo com ela` : `Deve pedir ao empregador o PPP de cada vínculo com atividade especial`];
    if(/laudo m[ée]dico|relat[óo]rio m[ée]dico/i.test(t)) return [cli, `${/só importa se/i.test(t) ? "Se o pedido envolver doença, deve" : "Deve"} trazer laudo e relatório médico atuais, com data, CID e o que impede o trabalho`];
    if(/Extrato de pagamento/i.test(t)) return [esc_, `Deve baixar no Meu INSS o ${t.split(":")[0].replace(/^Extrato/, "extrato")}`];
    if(/c[óo]pia/i.test(t) && /agendamento/i.test(t)) return [esc_, `Deve agendar no INSS a cópia do processo do benefício concedido`];
    if(/pedido administrativo|processo|Laudo da per[íi]cia/i.test(t)) return [esc_, `Deve baixar no Meu INSS a cópia integral do processo administrativo`];
  }
  return [esc_, instrucaoDoTexto(t) || `Deve conferir e resolver: ${t}`];
}
function problemasDoPA(c, ks){
  let r = null; try{ r = quadrosDoPA(c, ks); }catch(e){ return []; }
  const ruim = e => e==="crit" || e==="warn";
  // os blocos do alto do CNIS repetem itens (a qualidade é o cnis.qual): só os itens viram pendência
  return r.quadros.flatMap(q=>q.itens.filter(x=>ruim(x.est))
    .map(x=>{ const [quem, acao] = providenciaDe(x, r); return {txt:x.txt, est:x.est, q:q.rot, quem, acao}; }))
    .sort((a, b)=>(a.est==="crit" ? 0 : 1) - (b.est==="crit" ? 0 : 1));
}
function quadroProblemasPA(c, ks){
  const ps = problemasDoPA(c, ks);
  if(!ps.length) return `<section class="pa-prob vazio" aria-label="Pendências"><h3>Pendências</h3><p class="meio-sub">Nenhuma pendência vista no Primeiro atendimento.</p></section>`;
  return `<section class="pa-prob" aria-label="Pendências">
    <h3>Pendências (${ps.length})</h3>
    <p class="meio-sub">O que deve ser feito, e por quem. Arraste uma pendência para as anotações, ou use "anotar".</p>
    <ul>${ps.map(p=>`<li class="${p.est}" draggable="true" data-txt="${esc(p.acao)}" ondragstart="event.dataTransfer.setData('text/plain', this.dataset.txt)">
      <span class="pp-quem ${p.quem==="Cliente" ? "cli" : "esc"}">${p.quem}</span>
      <span class="pp-corpo"><b>${esc(p.acao)}</b><small>${esc(p.q)} · ${esc(p.txt)}</small></span>
      <button type="button" class="btn-mini" onclick="probParaNota(this.closest('li').dataset.txt)">anotar</button></li>`).join("")}</ul></section>`;
}
// F498 · a conversa do atendimento gravada vai à função atendimento_transcricao (ElevenLabs, falantes separados) e o texto volta ao campo para conferir antes do Anotar
// F537 · no celular: a tela fica acesa enquanto grava (Wake Lock) e cada trecho de 5 s fica guardado no aparelho (IndexedDB);
// a gravação interrompida (saiu do app, recarregou a página) volta com Continuar, e os trechos vão juntos a um resumo só
let atendRec = null, atendGravado = null, atendEnviando = false, atendParou = false, atendTela = null;
const GRAV_BANCO = "crm_gravacao";
function gravBanco(){ return new Promise((ok, erro)=>{ const r = indexedDB.open(GRAV_BANCO, 1);
  r.onupgradeneeded = ()=>{ r.result.createObjectStore("partes", {autoIncrement:true}); r.result.createObjectStore("meta"); };
  r.onsuccess = ()=>ok(r.result); r.onerror = ()=>erro(r.error); }); }
async function gravOp(loja, modo, fn){
  try{ const db = await gravBanco(); return await new Promise((ok, erro)=>{ const tx = db.transaction(loja, modo), r = fn(tx.objectStore(loja));
    tx.oncomplete = ()=>{ db.close(); ok(r && r.result); }; tx.onerror = ()=>erro(tx.error); }); }
  catch(e){ return null; }   // sem IndexedDB (aba privada) a gravação segue só na memória, como antes
}
const gravLimpar = ()=>Promise.all([gravOp("partes", "readwrite", s=>s.clear()), gravOp("meta", "readwrite", s=>s.delete("atual"))]);
async function verGravacaoGuardada(){
  if(atendRec || atendGravado || atendEnviando) return;
  const m = await gravOp("meta", "readonly", s=>s.get("atual")); if(!m) return;
  const ps = await gravOp("partes", "readonly", s=>s.getAll()) || [], segs = [];
  for(const p of ps) (segs[p.seg] ||= {tipo: p.tipo, dados: []}).dados.push(p.data);
  const blobs = segs.filter(Boolean).map(s=>new Blob(s.dados, {type: s.tipo})).filter(b=>b.size >= 2000);
  if(!blobs.length){ gravLimpar(); return; }
  atendGravado = {segs: blobs, inicio: m.inicio, cli: m.cli, caso: m.caso, nseg: m.nseg || blobs.length, interrompida: true};
  pintarGravarAtend();
  aviso("Há uma gravação do atendimento interrompida. Toque em Continuar para seguir gravando, ou em Transcrever");
}
async function telaAcesa(){ try{ if(navigator.wakeLock) atendTela = await navigator.wakeLock.request("screen"); }catch(e){} }
function telaSoltar(){ try{ atendTela && atendTela.release(); }catch(e){} atendTela = null; }
document.addEventListener("visibilitychange", ()=>{
  if(!atendRec) return;
  if(document.hidden){ try{ atendRec.requestData(); }catch(e){} }   // guarda o que já foi gravado antes de o aparelho suspender a página
  else telaAcesa();   // o celular solta a tela acesa ao sair do app
});
function botaoGravarAtend(){
  const g = atendGravado, cont = g && g.interrompida;
  const [rot, frase] = atendEnviando ? ["Transcrevendo", "transcrevendo a gravação"]
    : atendRec ? ["Parar", "parar a gravação e transcrever"]
    : cont ? ["Continuar", "continuar a gravação interrompida"]
    : g ? ["Repetir", "enviar de novo a última gravação"]
    : ["Gravar", "gravar a conversa do atendimento e transcrever"];
  return `<button type="button" id="atend-gravar" class="adr-bt${atendRec?" gravando":""}" title="${frase}" ${atendEnviando?"disabled":""} onclick="if(!atendRec&&!atendGravado)atendCaso=null;gravarAtendimento()"><span aria-hidden="true">${rot}</span><span class="sr-only">${frase}</span></button>`
    + (cont && !atendEnviando && !atendRec ? `<button type="button" id="atend-transcrever" class="adr-bt" title="transcrever o que já foi gravado" onclick="transcreverAtendimento()">Transcrever</button>` : "")
    + (g && !atendEnviando && !atendRec ? `<button type="button" id="atend-descartar" class="adr-bt" title="descartar a gravação" onclick="descartarGravacao()">Descartar</button>` : "");
}
function descartarGravacao(){ atendGravado = null; gravLimpar(); pintarGravarAtend(); }
function pintarGravarAtend(){ ["atend-descartar", "atend-transcrever"].forEach(i=>document.getElementById(i)?.remove());
  const b = document.getElementById("atend-gravar"); if(b) b.outerHTML = botaoGravarAtend();
  const f = document.getElementById("ficha-gravar"); if(f) f.outerHTML = botaoGravarFicha(f.dataset.cli);
  const k = document.getElementById("caso-gravar"); if(k) k.outerHTML = botaoGravarCaso(D.casoPorId.get(k.dataset.caso)); }
// F532 · o Gravar também no canto da ficha, ao lado da ⭐ (pedido do Paulo, 11.11.2026): fora do atendimento,
// a transcrição abre na ⚡ anotação rápida já com o cliente da ficha, para conferir e gravar
const IC_MIC = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>`;
let atendCli = null, atendCaso;   // atendCaso: id do caso; null = sem caso; undefined = gravação antiga (F539)
function botaoGravarFicha(cliId){
  if(!cliId || !podeGravarCaso()) return "";
  const g = atendGravado;
  const [rot, frase] = atendEnviando ? ["Transcrevendo", "transcrevendo a gravação"]
    : atendRec ? ["Parar", "parar a gravação e transcrever"]
    : g && g.interrompida ? ["Continuar", "continuar a gravação interrompida"]
    : g ? ["Repetir", "enviar de novo a última gravação"]
    : ["Gravar", "gravar o atendimento e transcrever"];
  return `<button type="button" id="ficha-gravar" data-cli="${cliId}" class="det-imp det-grav${atendRec?" gravando":""}${g&&g.interrompida&&!atendRec?" pendente":""}" title="${rot}: ${frase}" aria-label="${frase}" ${atendEnviando?"disabled":""} onclick="gravarDaFicha('${cliId}')">${IC_MIC}</button>`;
}
// F543 · o microfone ao lado de Escrever no caso grava direto naquele caso (pedido do Paulo, 11.11.2026)
function botaoGravarCaso(k){
  if(!k || !podeGravarCaso()) return "";
  const g = atendGravado, [rot, frase] = atendEnviando ? ["Transcrevendo", "transcrevendo a gravação"]
    : atendRec ? ["Parar", "parar a gravação e transcrever"]
    : g && g.interrompida ? ["Continuar", "continuar a gravação interrompida"]
    : g ? ["Repetir", "enviar de novo a última gravação"]
    : ["Gravar", "gravar o atendimento e salvar o resumo neste caso"];
  return `<button type="button" id="caso-gravar" data-caso="${k.id}" class="esc-ic esc-grav${atendRec?" gravando":""}${g&&g.interrompida&&!atendRec?" pendente":""}" title="${rot}: ${frase}" aria-label="${frase}" ${atendEnviando?"disabled":""} onclick="if(!atendRec&&!atendGravado){atendCli='${k.cliente_id}';atendCaso='${k.id}'}gravarAtendimento()">${IC_MIC}</button>`;
}
// F543 · no topo da ficha a gravação pergunta antes em qual caso salvar (pedido do Paulo, 11.11.2026)
async function gravarDaFicha(cliId){
  if(!atendRec && !atendEnviando && !atendGravado){
    const r = await escolherCasoGravacao(cliId); if(r === undefined) return;
    atendCli = cliId; atendCaso = r;
  }
  gravarAtendimento();
}
function escolherCasoGravacao(cliId){
  const ks = (D.casosDoCliente.get(cliId)||[]).filter(k=>k.fase!=="encerrado");
  if(!ks.length) return Promise.resolve(null);
  return new Promise(res=>{
    const d = document.createElement("dialog"); d.className = "confirmar";
    d.innerHTML = `<p class="confirmar-txt">Em qual caso salvar o resumo do atendimento?</p><form method="dialog" class="confirmar-bts grav-casos">
      ${ks.map(k=>`<button value="${k.id}" class="btn-rap">${esc(rotuloCasoEscolha(k))}</button>`).join("")}
      <button value="sem" class="btn-rap">Sem caso</button><button value="" class="btn-rap">Voltar</button></form>`;
    d.addEventListener("close", ()=>{ const v = d.returnValue; res(v === "sem" ? null : v || undefined); d.remove(); });
    document.body.appendChild(d); d.showModal();
  });
}
async function gravarAtendimento(){
  if(atendEnviando) return;
  if(atendRec){ atendParou = true; return atendRec.stop(); }
  const ant = atendGravado && atendGravado.interrompida ? atendGravado : null;
  if(atendGravado && !ant) return transcreverAtendimento();
  if(!navigator.mediaDevices || !window.MediaRecorder) return aviso("Este navegador não grava áudio");
  let stream;
  try{ stream = await navigator.mediaDevices.getUserMedia({audio:true}); }
  catch(e){ return aviso("Sem permissão para usar o microfone"); }
  const tipo = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "";
  const rec = new MediaRecorder(stream, tipo ? {mimeType: tipo} : undefined), partes = [];
  const inicio = ant ? ant.inicio : Date.now(), seg = ant ? ant.nseg : 0, antes = ant ? ant.segs : [], cli = ant ? (ant.cli || atendCli) : atendCli;
  const caso = ant ? ant.caso : atendCaso;
  const tipoBlob = (rec.mimeType || "audio/webm").split(";")[0];
  if(!ant) await gravLimpar();
  gravOp("meta", "readwrite", s=>s.put({inicio, cli, caso, nseg: seg + 1}, "atual"));
  atendGravado = null; atendCli = cli; atendCaso = caso;
  rec.ondataavailable = e=>{ if(e.data.size){ partes.push(e.data); gravOp("partes", "readwrite", s=>s.add({seg, data: e.data, tipo: tipoBlob})); } };
  const trilha = stream.getTracks()[0];
  if(trilha) trilha.onended = ()=>{ if(rec.state !== "inactive") rec.stop(); };   // o iPhone encerra o microfone ao sair do app
  rec.onerror = ()=>{ if(rec.state !== "inactive") rec.stop(); };
  rec.onstop = ()=>{
    stream.getTracks().forEach(t=>t.stop());
    atendRec = null; telaSoltar();
    const parou = atendParou; atendParou = false;
    const segs = antes.concat(new Blob(partes, {type: tipoBlob})).filter(b=>b.size >= 2000);
    if(!segs.length){ gravLimpar(); pintarGravarAtend(); return aviso("Gravação curta demais"); }
    atendGravado = {segs, inicio, cli, caso, nseg: seg + 1, interrompida: !parou};
    if(parou) return transcreverAtendimento();
    pintarGravarAtend();
    aviso("A gravação parou ao sair da tela. O gravado está guardado: toque em Continuar");
  };
  rec.start(5000); atendRec = rec;   // trechos de 5 s, cada um guardado no aparelho assim que sai
  telaAcesa(); ouvirMicrofone(stream, rec);
  pintarGravarAtend();
  aviso(ant ? "Gravação retomada. Toque em Parar ao terminar" : "Gravando o atendimento. Toque em Parar ao terminar");
}
// F540: o microfone mudo (outra entrada escolhida, permissão sem som) avisa em 6 s, em vez de gravar silêncio até o Parar
function ouvirMicrofone(stream, rec){
  let ctx, an, buf;
  try{ ctx = new (window.AudioContext || window.webkitAudioContext)(); an = ctx.createAnalyser(); buf = new Uint8Array(an.fftSize); ctx.createMediaStreamSource(stream).connect(an); }
  catch(e){ try{ ctx && ctx.close(); }catch(_){} return; }
  let pico = 0, n = 0;
  const t = setInterval(()=>{
    if(rec.state === "inactive"){ clearInterval(t); ctx.close().catch(()=>{}); return; }
    an.getByteTimeDomainData(buf); for(const v of buf) pico = Math.max(pico, Math.abs(v - 128));
    if(++n === 12 && pico < 3) aviso("O microfone não está captando som. Confira a entrada de áudio do aparelho e toque em Parar", false);
  }, 500);
}
async function transcreverAtendimento(){
  const g = atendGravado; if(!g || atendEnviando) return;
  atendEnviando = true; pintarGravarAtend();
  try{
    const url = CONFIG.SUPABASE_URL.replace(/\/$/,"") + "/functions/v1/atendimento_transcricao";
    const post = async (q, body, tipo)=>{
      const enviar = ()=>fetch(url + q, {method:"POST", body, headers:{apikey:CONFIG.ANON_KEY,
        Authorization:"Bearer " + (sessao ? sessao.access_token : CONFIG.ANON_KEY), "Content-Type": tipo}});
      let r = await enviar();
      if(r.status === 401 && sessao && await renovar()) r = await enviar();
      const d = await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(d.erro || `erro ${r.status}`);
      return d;
    };
    let d;
    if(g.segs.length === 1) d = await post("", g.segs[0], g.segs[0].type || "audio/webm");
    else {   // F537: cada trecho da gravação interrompida se transcreve com o tempo contado do início, e o resumo sai do texto inteiro
      const textos = []; let seg = 0, fal = 0;
      for(const b of g.segs){
        let x; try{ x = await post(`?resumo=nao&desde=${Math.round(seg)}`, b, b.type || "audio/webm"); }
        catch(e){ if(/nenhuma fala|curta demais/.test(e.message)) continue; throw e; }
        if(x.texto) textos.push(x.texto);
        seg += x.segundos || (x.minutos || 0) * 60; fal = Math.max(fal, x.falantes || 1);
      }
      if(!textos.length) throw new Error("nenhuma fala reconhecida na gravação");
      const texto = textos.join("\n"), r2 = await post("", JSON.stringify({texto}), "application/json").catch(()=>({}));
      d = {texto, minutos: Math.max(1, Math.round(seg / 60)), falantes: fal, resumo: r2.resumo};
    }
    if(!d.texto) throw new Error(d.erro || "nenhuma fala reconhecida na gravação");
    const dia = new Date(g.inicio).toLocaleDateString("pt-BR");
    const cab = `(${dia}, ${d.minutos||1} min, ${d.falantes||1} falante${d.falantes>1?"s":""})`;
    if(g.cli) atendCli = g.cli;
    // F529: o resumo no padrão das anotações vem primeiro, e a transcrição inteira fica abaixo dele
    const txt = d.resumo ? `${d.resumo}\n\nTranscrição completa ${cab}:\n${d.texto}` : `Transcrição do atendimento ${cab}:\n${d.texto}`;
    atendGravado = null; gravLimpar();
    // F539/F543: o resumo grava sozinho como anotação (do caso escolhido ou do cliente) e a transcrição vai a um anexo; com falha, volta ao campo
    const gravou = await gravarTranscricao(atendCli || clienteAberto, g.caso, d.resumo, d.texto, cab, dia);
    if(!gravou){
      probParaNota(txt);
      aviso(document.getElementById("atend-nota") ? "Não gravei sozinho. A transcrição está no campo: toque em Anotar" : "Não gravei sozinho. A transcrição está na anotação rápida: grave");
    }
  }catch(e){
    if(/nenhuma fala|curta demais/.test(String(e.message))){   // F540: silêncio não se repete; o botão volta a Gravar
      atendGravado = null; gravLimpar();
      aviso("Nenhuma fala foi captada na gravação. Confira o microfone e toque em Gravar de novo");
    } else {
      aviso("A transcrição falhou (" + String(e.message||e).slice(0,120) + "). Toque em Repetir");
      if(atendGravado) atendGravado.interrompida = false;
    }
  }finally{ atendEnviando = false; pintarGravarAtend(); }
}
async function gravarTranscricao(cliId, casoId, resumo, texto, cab, dia){
  const c = cliId && D.cliPorId.get(cliId); if(!c || !texto) return false;
  const k = casoId && D.casoPorId.get(casoId);
  const nota = resumo || `Transcrição do atendimento ${cab}.`, integral = `${nota}\n\nTranscrição completa ${cab}:\n${texto}`;
  let and = null;
  if(k){   // F543: com caso, o resumo é anotação do caso
    try{ [and] = await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:k.id, autor_id:eu.id, origem:"app", texto:nota})}) || []; }catch(e){}
    if(!and) return false;
    api(`/rest/v1/andamentos_lidos`,{method:"POST",headers:{Prefer:"return=minimal,resolution=merge-duplicates"},
      body:JSON.stringify({andamento_id:and.id, colaborador_id:eu.id})}).catch(()=>{});
    if(Array.isArray(D._andsFicha) && clienteAberto===cliId) D._andsFicha.unshift(and);
    _ultAnot.clear();
  }
  // F543: a transcrição inteira vai a um anexo do cliente (origem "transcricao"), preso à anotação; é o link abaixo do resumo
  const corpo = `Transcrição do atendimento ${cab}\n\n${texto}`;
  const caminho = `${cliId}/transcricao-${new Date().toISOString().replace(/[:.]/g,"-").toLowerCase()}.txt`, arq = new Blob([corpo], {type:"text/plain;charset=utf-8"});
  let an = null;
  try{ await subirArquivo(caminho, arq); }catch(e){}   // shortcut: sem o arquivo no bucket, o texto do anexo basta para ler
  try{ [an] = await api(`/rest/v1/anexos`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify({caso_id: k && !ehPreCaso(k) ? k.id : null, cliente_id:cliId, autor_id:eu.id, nome:`Transcrição do atendimento ${dia}`,
      caminho, tipo:"text/plain", tamanho:arq.size, origem:"transcricao", texto:corpo, ...(and ? {andamento_id:and.id} : {})})}) || []; }catch(e){ an = null; }
  if(an) (D.anexos = D.anexos||[]).unshift(an);
  if(k){
    if(!an){   // sem o anexo, a transcrição fica na própria anotação para não se perder
      try{ await api(`/rest/v1/andamentos?id=eq.${and.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({texto:integral})}); and.texto = integral; }catch(e){}
    }
    aviso(`Resumo do atendimento gravado em ${tituloCaso(k)}`, false);
    if(clienteAberto === cliId) repintarFicha();
    return true;
  }
  const noAtend = !!document.getElementById("atend-nota"), pc = noAtend ? preCasoAberto(c) : null;
  const n = {em:new Date().toISOString(), quem:(eu.nome||"").split(" ")[0], autor_id:eu.id, texto: an ? nota : integral, gravacao:true,
    ...(an ? {anexos:[{id:an.id, nome:an.nome}]} : {}),
    ...(noAtend ? (pc ? {precaso_id:pc.id} : {}) : {origem:"rapida"})};   // fora do atendimento fica "para distribuir" (F404)
  const campos = {...(c.campos||{}), atendimento:[...((c.campos||{}).atendimento||[]), n]};
  try{ await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({campos})}); }
  catch(e){ return false; }
  c.campos = campos;
  aviso(noAtend ? "Resumo do atendimento gravado nas anotações do atendimento"
    : `Resumo do atendimento gravado nas anotações de ${(c.nome||"").split(" ")[0]}. Distribua ao caso pelo ícone das Anotações`, false);
  if(clienteAberto === cliId) repintarFicha();
  return true;
}
// F543 · a transcrição abre aqui mesmo, pelo texto guardado no anexo
function verTranscricao(id){
  const a = (D.anexos||[]).find(x=>x.id===id); if(!a) return;
  const k = a.caso_id && D.casoPorId.get(a.caso_id), autor = (D.colPorId.get(a.autor_id)||{}).nome;
  caixa(`<h3 class="adr-h">${esc(a.nome||"Transcrição do atendimento")}</h3>
    <p class="meio-sub">${esc([k ? tituloCaso(k) : "", autor ? autor.split(" ")[0] : "", a.criado_em ? fmtTS(a.criado_em) : ""].filter(Boolean).join(" · "))}</p>
    <div class="transc-txt">${esc(a.texto||"")}</div>`);
}
function caixaTranscricoes(c){
  const ts = (D.anexos||[]).filter(a=>a.cliente_id===c.id && a.origem==="transcricao")
    .sort((x,y)=>String(y.criado_em||"").localeCompare(String(x.criado_em||"")));
  const casoDe = a => D.casoPorId.get(a.caso_id || ((D._andsFicha||[]).find(x=>x.id===a.andamento_id)||{}).caso_id);
  return `<section class="idf-card idf-transc" aria-labelledby="idf-transc"><h3 class="adr-h" id="idf-transc">Transcrições de Atendimentos${ts.length?` (${ts.length})`:""}</h3>
    ${ts.length ? `<ul class="ac-lista">${ts.map(a=>{ const k = casoDe(a), autor = (D.colPorId.get(a.autor_id)||{}).nome;
      return `<li class="ac-it"><b>${esc(a.criado_em ? fmtTS(a.criado_em) : a.nome||"")}</b><small>${esc([k ? tituloCaso(k) : "Sem caso", autor ? autor.split(" ")[0] : ""].filter(Boolean).join(" · "))}</small>
        <button class="btn-mini" onclick="verTranscricao('${a.id}')">Abrir</button></li>`; }).join("")}</ul>`
      : `<p class="meio-sub">Nenhuma transcrição ainda. O microfone ao lado de Escrever no caso grava o atendimento.</p>`}</section>`;
}
function probParaNota(txt){
  if(!txt) return;
  const ta = document.getElementById("atend-nota");
  if(!ta){   // F532: fora do atendimento, a transcrição vai à ⚡ anotação rápida do cliente que gravou
    const cli = atendCli || clienteAberto;
    anotacaoRapida(null, cli);
    if(cli && D.cliPorId.get(cli)) arEscolher(cli);
    const t = document.getElementById("ar-texto"); if(t){ t.value = txt; t.rows = 12; t.focus(); }
    return;
  }
  ta.value = (ta.value.trim() ? ta.value.trim() + "\n" : "") + txt; ta.focus();
}
function probSoltar(ev){ ev.preventDefault(); probParaNota(ev.dataTransfer.getData("text/plain")); }
async function notaDoAtendimento(cliId){
  const c = D.cliPorId.get(cliId), ta = document.getElementById("atend-nota"); if(!c || !ta) return;
  const t = (ta.value||"").trim(); if(!t) return aviso("Escreva a anotação");
  const pc = preCasoAberto(c);
  const nota = {em:new Date().toISOString(), quem:(eu.nome||"").split(" ")[0], autor_id:eu.id, texto:t, ...(pc?{precaso_id:pc.id}:{})};
  const campos = {...(c.campos||{}), atendimento:[...((c.campos||{}).atendimento||[]), nota]};
  try{ await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({campos})}); }
  catch(e){ return aviso("Não consegui guardar a anotação — tente de novo"); }
  c.campos = campos; ta.value = "";
  // @nome vira menção presa ao cliente (sem a coluna cliente_id, vai sem ela)
  const alvos = equipeAtiva().filter(co=>co.id!==eu.id && new RegExp("@"+(co.nome||"").split(" ")[0]+"\\b","i").test(t));
  for(const co of alvos){
    const corpo = {de_id:eu.id, para_id:co.id, cliente_id:cliId, texto:`${c.nome}: ${t.slice(0,200)}`};
    await api(`/rest/v1/mencoes`,{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(corpo)})
      .catch(()=>{ delete corpo.cliente_id; return api(`/rest/v1/mencoes`,{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(corpo)}).catch(()=>{}); });
  }
  aviso(`Anotação guardada${alvos.length?` — ${alvos.map(x=>x.nome.split(" ")[0]).join(", ")} avisado(s)`:""}`, false);
  repintarFicha();
}
// fechar a tela de atendimento: o que foi escrito na Análise de Direito é registrado antes
// F277 · sair sem ter salvo o pré-caso aberto agora pergunta, e o descarta: o pré-caso só fica quando se salva
async function sairModoAtendimento(cliId, semGravar){
  const c = D.cliPorId.get(cliId), pc = c && preCasoAberto(c);
  const rascunho = !!pc && _pcNovo.has(pc.id) && !Object.keys(pc.etapas||{}).length;
  if(rascunho && !semGravar){
    if(!await confirmar("Sair sem gravar? O atendimento ainda não foi salvo e o pré-caso será descartado. Para guardar, use Salvar pré-caso.")) return;
    return sairModoAtendimento(cliId, true);
  }
  if(rascunho) await descartarPreCaso(cliId, pc);
  else { await admGravarAgora(); await salvarAnaliseSePreenchida(cliId); }
  _atendAberto.delete(cliId);
  irSubCad("identificacao");
}
async function descartarPreCaso(cliId, pc){
  _pcNovo.delete(pc.id);
  const k = pc.caso_id && D.casoPorId.get(pc.caso_id);
  let apagou = false;
  if(k && k.pre_caso){
    // a linha nasceu agora e não foi salva: sai do banco; com algo ligado a ela (o banco recusa), encerra como antes
    try{ apagou = ((await api(`/rest/v1/casos?id=eq.${k.id}`,{method:"DELETE",headers:{Prefer:"return=representation"}}))||[]).length>0; }catch(e){}
    if(apagou){
      const i = D.casos.indexOf(k); if(i>=0) D.casos.splice(i,1);
      D.casoPorId.delete(k.id);
      D.casosDoCliente.set(cliId, (D.casosDoCliente.get(cliId)||[]).filter(x=>x!==k));
    }
  }
  if(!apagou) await gravarPrecasos(cliId, precasosDe(D.cliPorId.get(cliId)).filter(p=>p.id!==pc.id));
  aviso("Saiu sem gravar: o pré-caso foi descartado", false);
}
// F219 · o formulário da Análise de Direito com algo escrito é registrado antes de sair ou de concluir o passo
async function salvarAnaliseSePreenchida(cliId){
  const ctx = document.getElementById("ad-contexto"); if(!ctx) return;
  const cen = [...document.querySelectorAll("#ad-cens .ad-row")].some(r=>[...r.querySelectorAll("input,select,textarea")].some(e=>e.type!=="radio" && String(e.value||"").trim()));
  const det = adDetPreenchido(adColherDetalhes());
  if(ctx.value.trim() || cen || det){
    const d = document.getElementById("ad-data"); if(d && !d.value) d.value = hoje();
    await salvarAnalise(cliId);
  }
}
function irSubCad(qual){
  if(qual==="atendimento") qual="anotacoes";   // nome antigo do trilho interno
  const consulta = qual==="consulta";
  if(consulta) qual="documentos";     // F31: a Consulta mora em Documentos
  subCad = qual; guardar("crm_subcad", qual); repintarFicha();
  // F240 · em passos, a Consulta mora na gaveta Ferramentas: pedir a Consulta abre a gaveta
  const ferr = consulta && document.getElementById("dq-ferramentas"); if(ferr){ ferr.open = true; ferr.scrollIntoView({block:"start"}); }
  if(SUB_DOSSIE_TUDO.has(qual)) lerDossieTodo(clienteAberto);
}
// compatibilidade: o trilho interno de Anotações acabou na F30 — Consulta,
// Mensagens e Documentos são botões do trilho principal agora
function irSubAnot(qual){ irSubCad(qual==="atendimento" ? "anotacoes" : qual); }

// ══════════════════════════════════════════════════════════════════════════
// F10 · TRIAGEM — os oito passos, com o que o CRM já sabe responder sozinho
// ══════════════════════════════════════════════════════════════════════════
// A diferença entre checklist e triagem é quem responde. Cinco dos oito
// passos o sistema lê do que já tem no banco: processo judicial, recurso no
// CRPS, CadÚnico, benefício ativo e protocolos. Quem atende confirma ou
// contraria, e o que ele escreve fica com autoria e data.
//
// ONDE MORA: `clientes.triagem` quando o banco tem a coluna, `campos.triagem`
// quando não tem — o mesmo caminho da F9.1, para a tela funcionar antes e
// depois da migração.
// F127 · a ordem é a do atendimento com o CNIS na mão (pedido do Paulo,
// 20.09): o que o extrato responde vem primeiro, e as explicações saíram — a
// tela mostra UM passo por vez, limpa.
const TRIAGEM_PASSOS = [
  // F178 · a terceira coluna é a pergunta que o cartão do passo mostra
  ["cnis",       "CNIS",                     "O extrato está completo e legível?"],
  ["indicadores","Indicadores",              "Há indicador que exige acerto antes do pedido?"],
  ["beneficio",  "Benefício ativo",          "O cliente recebe algum benefício hoje?"],
  ["vinculo",    "Vínculo com a Previdência hoje", "Como o cliente contribui hoje?"],
  ["parentes",   "Parentes ou amigos",       "Há parente ou amigo que já é cliente?"],
  ["judicial",   "Ação judicial anterior",   "Existe ação anterior sobre o mesmo pedido?"],
  ["crps",       "Recurso no CRPS",          "Há recurso administrativo em curso?"],
  ["cadunico",   "CadÚnico",                 "O cadastro está atualizado?"],
  ["requerimento","Requerimentos anteriores","Quais pedidos já foram feitos, e a DER de cada um?"],
  ["conclusao",  "Conclusão",                "O que a triagem decide?"],
];
// ══════════════════════════════════════════════════════════════════════════
// F17 · O QUE A ESPÉCIE EXIGE — as skills do escritório dentro da triagem
// ══════════════════════════════════════════════════════════════════════════
// As 204 skills do escritório vivem fora do CRM e continuam lá: elas são o
// raciocínio, e raciocínio não cabe numa tabela. O que desce para cá é a
// parte que muda a decisão NO ATENDIMENTO — o ponto que, se ninguém conferir
// enquanto o cliente está na cadeira, vira exigência, indeferimento ou
// petição devolvida três meses depois.
//
// Os oito passos da F10 valem para todo mundo. Estes valem para a espécie do
// caso, e entram entre o passo 7 e a conclusão. Cada família nomeia a skill
// de onde veio, para quem quiser o inteiro teor saber onde procurar.
const PONTOS_ESPECIE = [
  { chave:"bpc", teste:/lo?as|bpc|assistencial|amparo social/i, rot:"BPC/LOAS",
    skill:"base-bpc-loas-requisitos, base-bpc-renda-per-capita-miserabilidade",
    ferramenta:["Calculadora de renda per capita", "https://advprevidenciaria.netlify.app/"],
    pontos:[
      ["bpc_renda","Renda per capita do grupo familiar",
       "1/4 do salário mínimo é o critério legal; acima disso, provar a miserabilidade pelo gasto (saúde, fralda, alimentação especial)"],
      ["bpc_grupo","Quem entra no grupo familiar",
       "a lista do art. 20, §1º é fechada — filho casado, neto e genro não entram só por morarem juntos"],
      ["bpc_cadunico","CadÚnico e Cadastro Domiciliar",
       "obrigatório, renovado a cada 2 anos, e a entrevista domiciliar do Decreto 12.534/2025"],
      ["bpc_avaliacao","Avaliação médica e social do BPC (instrumento próprio, pela CIF)",
       "impedimento de longo prazo de 2 anos; no menor de 16, o critério do Tema 299/TNU"],
    ]},
  { chave:"crps", teste:/recurso|conselho|crps|incidente|c[óo]pia de processo|justifica[çc][ãa]o/i, rot:"Recurso, cópia e justificação",
    skill:"base-recurso-crps-peca-enxuta, admissibilidade-barreiras-crps",
    pontos:[
      ["crp_prazo","Tempestividade, com a data na mão",
       "30 dias da ciência; intempestivo não se conhece, e o mérito nem é lido"],
      ["crp_enunciado","O Enunciado do CRPS que decide o caso",
       "a Junta decide por norma e por enunciado, não por jurisprudência judicial"],
      ["crp_motivo","O motivo EXATO do indeferimento",
       "recurso que não ataca o motivo escrito na decisão é desprovido sem discussão"],
    ]},
  { chave:"especial", teste:/apos\w*\.?\s*especial|aposentadoria especial|insalubr|agente nocivo/i,
    rot:"Aposentadoria especial",
    skill:"auditoria-ppp, base-especial-ruido, base-especial-epi",
    ferramenta:["Calculadora de ruído", "https://advprevidenciaria.netlify.app/"],
    pontos:[
      ["esp_ppp","PPP período a período",
       "agente, dose, técnica de medição, EPI e CA, responsável pelos registros, extemporaneidade — cada período enquadra ou não por si"],
      ["esp_epi","EPI declarado eficaz",
       "não neutraliza ruído acima do limite (Tema 555/STF); nos demais agentes, exigir a prova da eficácia real"],
      ["esp_ltcat","LTCAT ou laudo que sustente o PPP",
       "PPP sem laudo de base é impugnado pelo INSS; pedir na empresa antes de protocolar"],
      ["esp_conversao","Conversão e regra de transição",
       "o que é anterior a 13.11.2019 converte; depois disso, só a especial pura da EC 103"],
    ]},
  { chave:"incapacidade", teste:/incapacidade|auxilio.doenca|auxílio.doença|invalidez|restabelec|esp[ée]cie 3[12]|esp[ée]cie 9[12]/i,
    rot:"Incapacidade",
    skill:"base-incapacidade-b31-temporaria, analise-documental-incapacidade",
    ferramenta:["Indicadores do CNIS", "https://advprevidenciaria.netlify.app/"],
    pontos:[
      ["inc_dii","DID e DII, uma ao lado da outra",
       "doença anterior à filiação não bloqueia se a INCAPACIDADE veio depois por agravamento (art. 27-A e Enunciado 7 do CRPS)"],
      ["inc_carencia","Carência, ou a dispensa do art. 151",
       "a lista de doenças isentas dispensa os 12 meses — confira antes de desistir do caso"],
      ["inc_qualidade","Qualidade de segurado na DII",
       "período de graça, prorrogações do art. 15, e a data exata em que a incapacidade começou"],
      ["inc_pericia","A perícia médica federal do PA",
       "é o documento a desconstituir ponto a ponto: o que o perito examinou, o que ignorou e o que contraria o laudo assistente"],
    ]},
  { chave:"b94", teste:/aux.*acidente|esp[ée]cie 94/i, rot:"Auxílio-acidente",
    skill:"base-auxilio-acidente-b94-pos-reforma, base-b94-nexo-acidentario-ntep",
    pontos:[
      ["b94_sequela","Sequela consolidada, com redução da capacidade",
       "o Anexo III do Decreto 3.048/99 e a sequela mínima do Tema 201 — redução não precisa impedir o trabalho"],
      ["b94_nexo","Nexo, inclusive por concausa",
       "art. 21, I: doença degenerativa não exclui o nexo quando o trabalho contribuiu"],
      ["b94_acumulacao","Acumulação e cessação",
       "vedada a acumulação com aposentadoria; integra o salário-de-benefício (Tema 862)"],
    ]},
  { chave:"rural", teste:/rural|segurado especial|h[íi]brida|boia.fria|seguro.defeso|pescador/i, rot:"Rural, híbrida e seguro-defeso",
    skill:"segurado-especial-rural, base-tempo-rural-anterior-1991",
    pontos:[
      ["rur_prova","Início de prova material contemporâneo",
       "documento do período, não declaração feita hoje; certidões que citem lavrador valem por toda a família"],
      ["rur_auto","Autodeclaração rural e as bases do INSS",
       "arts. 92 a 94 da IN 128: a autodeclaração é confrontada com CAR, ITR, sindicato e escola"],
      ["rur_teste","Testemunhas nomeadas, com o que cada uma viu",
       "prova exclusivamente testemunhal não sustenta (Súmula 149/STJ), mas sem testemunha o início de prova morre"],
      ["rur_genero","A mulher rural e o documento em nome do marido",
       "trabalho feminino registrado como 'do lar' é o padrão da época, não ausência de trabalho"],
    ]},
  { chave:"pensao", teste:/pens[ãa]o por morte|aux.*reclus[ãa]o|esp[ée]cie 21|esp[ée]cie 2[35]/i,
    rot:"Dependentes",
    skill:"base-pensao-por-morte-pos-reforma, base-pensao-por-morte-uniao-estavel-prova",
    pontos:[
      ["dep_qualidade","Qualidade de segurado do falecido na data do óbito",
       "perdida a qualidade, ainda cabe pensão se ele já tinha reunido os requisitos de alguma aposentadoria"],
      ["dep_prova","Prova da união estável ou da dependência",
       "documento contemporâneo à convivência; a prova só testemunhal é o ponto que o INSS ataca primeiro"],
      ["dep_cota","Cotas e duração da pensão",
       "a duração pela idade do cônjuge e o rateio entre dependentes mudam o valor do que se pede"],
    ]},
  { chave:"tempo", teste:/^(?!.*certid).*(?:tempo de contribui|por idade|professor|defici[êe]ncia|planejamento)/i,
    rot:"Aposentadoria programável",
    skill:"base-aposentadoria-transicao-ec103, base-calculo-rmi-ec103",
    ferramenta:["Simulador de regras da EC 103", "https://advprevidenciaria.netlify.app/"],
    pontos:[
      ["apo_der","A melhor DER entre as regras possíveis",
       "direito adquirido pré-reforma, cada transição e a permanente — comparadas, não presumidas"],
      ["apo_minimo","Competências abaixo do mínimo",
       "complementação ou agrupamento da EC 103 antes de protocolar, senão o mês some da contagem"],
      ["apo_reciproca","Tempo de outro regime, militar ou aluno-aprendiz",
       "CTC pedida e averbada antes do requerimento; averbação pendente trava o benefício inteiro"],
    ]},
  { chave:"maternidade", teste:/maternidade|sal[áa]rio.matern/i, rot:"Salário-maternidade",
    skill:"base-salario-maternidade-pos-reforma",
    pontos:[
      ["mat_qualidade","Qualidade de segurada na data do parto",
       "período de graça alcança o parto em muitos casos; a desempregada mantém o direito dentro dele"],
      ["mat_carencia","Sem carência para nenhuma categoria",
       "a carência de 10 contribuições da CI e da facultativa é inexigível (Enunciado 19 do CRPS; IN 128, art. 357); basta a qualidade de segurada no fato"],
      ["mat_rural","Rural: os 12 meses de atividade antes do parto, não de contribuição",
       "a segurada especial prova exercício, e o documento costuma estar em nome do marido ou do pai"],
    ]},
  { chave:"revisao", teste:/revis[ãa]o|recalcul|isen[çc][ãa]o|imposto de renda/i, rot:"Revisão e isenção de IR",
    skill:"decadencia-revisao-previdenciaria, base-revisao-art29-melhor-beneficio",
    pontos:[
      ["rev_decadencia","Decadência do art. 103",
       "dez anos do primeiro pagamento; com menos de 12 meses para o fim, a revisão vira urgência"],
      ["rev_tese","Qual revisão, exatamente",
       "teto, IRSM, ORTN/OTN, art. 29, concomitantes — cada uma tem prova e cálculo próprios"],
      ["rev_calculo","O cálculo do Prévius, antes da peça",
       "revisão sem diferença apurada não se protocola"],
    ]},
  { chave:"cnis", teste:/acerto de cnis|cnis|v[íi]nculo|certid[ãa]o de tempo|regulariza|\bGPS\b|\bCTC\b/i, rot:"CNIS e contribuições",
    skill:"base-cnis-acerto-indicadores, base-documentos-comprobatorios-in128",
    ferramenta:["Indicadores do CNIS", "https://advprevidenciaria.netlify.app/"],
    pontos:[
      ["cni_indicador","Cada indicador do extrato, um a um",
       "PEXT, PREC-MENOR, IEAN e companhia: o indicador diz qual Anexo da IN 128 abre a RAC"],
      ["cni_anexo","RAC pelo Anexo certo",
       "Anexo errado volta como exigência e queima o prazo"],
      ["cni_prova","A prova do vínculo que falta",
       "CTPS, ficha de registro, holerite, reclamatória trabalhista com início de prova material"],
    ]},
];
// a família da espécie do caso — a primeira que casar
function familiaDaEspecie(esp){
  const t = String(esp||"").trim();
  if(!t) return null;
  return PONTOS_ESPECIE.find(f=>f.teste.test(t)) || null;
}
// os passos da triagem DESTE cliente: os oito fixos, com os da espécie
// entrando antes da conclusão
// F24 · a porta de entrada: a advogada que atende nem sempre sabe de que
// caso se trata. A espécie vem, nesta ordem, do CASO (quando já existe), da
// RESPOSTA dada na porta ("de qual caso se trata?"), ou de lugar nenhum —
// e sem resposta ficam só os passos padrão, que valem para qualquer caso.
function familiaDaTriagem(c, ks){
  const doCaso = familiaDaEspecie(especieDoCliente(c, ks));
  if(doCaso) return doCaso;
  const porta = (triagemDe(c).porta||{});
  if(porta.sei === false) return null;
  if(porta.especie) return familiaDaEspecie(porta.especie);
  // F29 · o benefício que a recepção anotou (pré-caso) já responde a porta:
  // a triagem abre com os pontos da família sem perguntar de novo
  const pcs = precasosDe(c).filter(p=>p.especie && !p.so_lembrete);
  return pcs.length===1 ? familiaDaEspecie(pcs[0].especie) : null;
}
// as perguntas que o ESCRITÓRIO acrescentou, e que valem para todos os
// clientes: só a vivência do dia a dia diz o que importa (pedido do Paulo).
// Moram em config_app, chave triagem_extra, com autor e data.
function perguntasDoEscritorio(){
  try{ const v = cfgApp("triagem_extra"); return Array.isArray(v) ? v : (v ? JSON.parse(v) : []); }
  catch(e){ return []; }
}
function triagemPassosDe(c, ks){
  const fam = familiaDaTriagem(c, ks);
  const fixos = TRIAGEM_PASSOS.slice(0, TRIAGEM_PASSOS.length-1);
  const conc  = TRIAGEM_PASSOS[TRIAGEM_PASSOS.length-1];
  const extras = perguntasDoEscritorio().map(q=>[q.chave, q.rot, q.dica||"", "escritório"]);
  return fixos
    .concat(extras)
    .concat(fam ? fam.pontos.map(([k,r,d])=>[k,r,d,fam.rot]) : [])
    .concat([conc]);
}
// gravar e desfazer a resposta da porta
async function responderPorta(cliId, especie, sei){
  const c = D.cliPorId.get(cliId); if(!c) return;
  const t = {...triagemDe(c)};
  t.porta = especie===null && sei===null ? undefined
    : {especie: especie||null, sei: sei!==false, quem: eu.id, em: hoje()};
  if(t.porta===undefined) delete t.porta;
  if(!await salvarTriagem(cliId, t)) return aviso("Não consegui guardar — tente de novo");
  repintarFicha();
}
// acrescentar e tirar pergunta do escritório
async function novaPerguntaEscritorio(){
  const el = document.getElementById("tq-nova");
  const rot = (el && el.value || "").trim();
  if(!rot) return aviso("Escreva a pergunta");
  const lista = perguntasDoEscritorio();
  const chave = "esc_" + Date.now().toString(36);
  lista.push({chave, rot, quem: eu.id, em: hoje()});
  try{ await guardarCfgApp("triagem_extra", lista); }
  catch(e){ return aviso("Não consegui guardar a pergunta — tente de novo"); }
  aviso("Pergunta acrescentada — vale para todos os clientes ✔");
  repintarFicha();
}
async function tirarPerguntaEscritorio(chave){
  const lista = perguntasDoEscritorio().filter(q=>q.chave!==chave);
  try{ await guardarCfgApp("triagem_extra", lista); }
  catch(e){ return aviso("Não consegui tirar — tente de novo"); }
  aviso("Pergunta retirada de todos os clientes");
  repintarFicha();
}
const TRIAGEM_ESTADOS = [["ok","sem pendência"],["atencao","atenção"],["pendente","não conferido"]];
// F178 · a linha de apoio de cada resposta, no botão grande
const TRIAGEM_ESTADOS_SUB = {ok:"segue o atendimento", atencao:"precisa de providência", pendente:"voltar depois"};
const TRIAGEM_PROXIMO = [["inicial","Pronto para a inicial judicial"],
                         ["inss","Pronto para o protocolo no INSS"],
                         ["aguardando","Aguardando (falta o que está anotado acima)"]];
function triagemDe(c){
  return (c && (c.triagem || ((c.campos||{}).triagem))) || {};
}
// F29 · a triagem encerrada é o portão: antes dela o cliente novo vê só o
// Cadastro (sem Lembretes) e, dentro dele, só Identificação e Triagem
const triagemFechada = c => !!(triagemDe(c).atendimento);
// a leitura automática de cada passo: o que o CRM já sabe, sem perguntar
function triagemLeitura(passo, c, ks){
  const vivos = (ks||[]).filter(k=>k.fase!=="encerrado");
  if(passo==="judicial"){
    const jud = (ks||[]).filter(k=>k.processo || (k.processos||[]).length || k.fase==="judicial"
      || (k.datajud && (k.datajud.ultimo || (k.datajud.instancias||[]).length)));
    return jud.length
      ? {cor:"alerta", txt:`${jud.length} caso(s) com processo judicial — confira litispendência e coisa julgada`,
         det: jud.map(k=>tituloCaso(k)+(k.processo?` · ${fmtProc(k.processo)}`:"")).join(" · ")}
      : {cor:"neutro", txt:"nenhum processo judicial no CRM — pergunte ao cliente se já processou o INSS antes"};
  }
  if(passo==="crps"){
    const nups = (ks||[]).flatMap(k=>crpsNups(k));
    return nups.length
      ? {cor:"alerta", txt:`${nups.length} recurso(s) no Conselho`, det: nups.map(formatarNup).join(" · ")}
      : {cor:"neutro", txt:"nenhum recurso administrativo registrado"};
  }
  if(passo==="cadunico"){
    const loas = (ks||[]).filter(k=>ehLoas(k));
    if(!loas.length) return {cor:"neutro", txt:"nenhum caso de BPC/LOAS; o CadÚnico não é exigido aqui"};
    const comData = loas.filter(k=>k.cadunico);
    if(!comData.length) return {cor:"alerta", txt:"caso de BPC sem a data do CadÚnico anotada"};
    const venc = comData.map(k=>renovaCadunico(k)).filter(Boolean).sort()[0];
    const d = venc ? diasAte(venc) : null;
    return d==null ? {cor:"neutro", txt:"CadÚnico anotado"}
      : d<0 ? {cor:"alerta", txt:`CadÚnico venceu em ${fmt(venc)}, há ${-d} dias`}
      : d<=90 ? {cor:"alerta", txt:`CadÚnico vence em ${fmt(venc)}, faltam ${d} dias`}
      : {cor:"ok", txt:`CadÚnico em dia até ${fmt(venc)}`};
  }
  if(passo==="beneficio"){
    // F127 · o CNIS responde: benefício sem cessação é benefício ativo
    const g = cnisDe(c);
    if(g && g.analise){
      const at = g.analise.benefAtivos || [];
      if(!at.length) return {cor:"ok", estado:"ok",
        txt:`Pelo CNIS de ${fmt(g.em)}: nenhum benefício ativo.`};
      return {cor:"alerta", estado:"atencao",
        txt:`Pelo CNIS de ${fmt(g.em)}: ${at.length} benefício(s) ativo(s). Confira a acumulação (art. 24 da EC 103).`,
        det: at.map(b=>`espécie ${b.especie}${b.origem?` ${b.origem}`:""}${b.nb?` · NB ${b.nb}`:""} desde ${b.inicio}${b.situacao?` · ${b.situacao}`:""}`).join(" · ")};
    }
    const pagando = (ks||[]).filter(k=>k.fase==="pagamento" || k.nb);
    const apos = c.aposentado===1 || c.aposentado===true;
    if(!pagando.length && !apos)
      return {cor:"neutro", txt:"nenhum benefício ativo registrado no CRM — insira o CNIS para a resposta sair do extrato"};
    return {cor:"alerta",
      txt:`${apos?"cliente marcado como aposentado":""}${apos&&pagando.length?" · ":""}${
        pagando.length?`${pagando.length} caso(s) com NB ou em pagamento`:""} — confira a acumulação do art. 24 da EC 103`,
      det: pagando.map(k=>tituloCaso(k)+(k.nb?` · NB ${esc(k.nb)}`:"")).join(" · ")};
  }
  if(passo==="parentes"){
    // F129 · quem é da família ou de confiança: cliente vinculado ou anotado
    const txt = parentesTexto(c);
    return txt ? {cor:"ok", txt:`Anotados: ${txt}.`}
               : {cor:"neutro", txt:"Nenhum parente ou amigo anotado. Pergunte quem acompanha o cliente (cônjuge, filho, quem indicou)."};
  }
  if(passo==="vinculo"){
    // F127 · o mês anterior à data da triagem, lido do CNIS
    const g = cnisDe(c);
    if(!(g && g.analise)) return {cor:"neutro", txt:"insira o CNIS para o CRM ler como o cliente contribui hoje"};
    const a = g.analise.agora || {};
    const nomes = {empregado:"Empregado (CLT)", ci:"Contribuinte individual", facultativo:"Facultativo", especial:"Segurado especial"};
    if(a.tipo==="sem"){
      const u = a.ultima;
      return {cor:"alerta", estado:"atencao",
        txt:`Sem contribuição em ${g.analise.mesAnt} (desempregado ou sem recolhimento). `
          + (u ? `Última contribuição ao INSS em ${u.comp}, como ${u.tipo}${u.origem?` (${u.origem})`:""}.`
               : "Nenhuma contribuição encontrada no extrato.")};
    }
    if(a.aberto)
      return {cor:"ok", estado:"ok",
        txt:`${nomes[a.tipo]||a.tipo}${a.origem?` na ${a.origem}`:""}, vínculo em aberto no CNIS desde ${a.desde||"?"}`
          + (a.ultRemun?` (última remuneração informada: ${a.ultRemun})`:"") + "."};
    return {cor:"ok", estado:"ok",
      txt:`${nomes[a.tipo]||a.tipo}${a.origem?` (${a.origem})`:""}: há contribuição em ${a.comp}, o mês anterior à análise.`};
  }
  if(passo==="requerimento"){
    // protocolo solto não serve para nada: o que responde ao Tema 350 é o
    // requerimento COM o pedido dele. Cada um sai com o caso a que pertence
    // e com a DER, quando o caso tem DER anotada.
    const pares = (ks||[]).flatMap(k=>(k.protocolos||[]).map(pr=>({pr, k})));
    const vistos = new Set();
    const unicos = pares.filter(x=> vistos.has(x.pr) ? false : (vistos.add(x.pr), true));
    return unicos.length
      ? {cor:"ok", txt:`${unicos.length} protocolo(s) no INSS — há prévio requerimento (Tema 350)`,
         det: unicos.map(({pr,k})=>`${pr} · ${tituloCaso(k)}`
           + (k.der?` · DER ${fmt(k.der)}`:"")).join(" · ")}
      : {cor:"alerta", txt:"nenhum protocolo do INSS no CRM — sem prévio requerimento a ação é extinta (Tema 350)"};
  }
  if(passo==="cnis"){
    // F127 · vínculo em aberto, erro no empregador e competência abaixo do
    // mínimo — o que o extrato diz sem ninguém ler linha por linha
    const g = cnisDe(c);
    if(!g) return {cor:"neutro", txt:"CNIS ainda não inserido — insira pelo botão acima para o CRM conferir o extrato"};
    const an = g.analise;
    if(!an) return {cor:"neutro", txt:`CNIS lido em ${fmt(g.em)}: ${g.paginas} página(s). Insira de novo para a conferência automática.`};
    const probs = [];
    // onda 1 · o vínculo sem saída termina na última remuneração; o em curso
    // (remuneração recente) não é problema, e o CAGED ou a RAIS do dossiê,
    // quando têm o desligamento, já dizem a data que falta
    const semSaida = vinculosSemSaida(g).filter(v=>!v.emCurso);
    if(semSaida.length){
      const f = fontesDoDossie(c.id);
      probs.push(`${semSaida.length} vínculo(s) sem data de saída, encerrado(s) pelo CRM no último dia do mês da última remuneração até o acerto: `
        + semSaida.map(v=>{ const fe = fechoDoVinculo(v, f);
          return `${v.origem||"?"} (${v.tipo}, desde ${v.inicio||"?"}, ${v.fimPresumido?`fim presumido em ${v.fimPresumido}`:"sem remuneração informada"}${fe?`; ${fe.fonte} do dossiê mostra desligamento em ${fe.data}`:""})`; }).join("; ") + ".");
    }
    if(an.errosEmp.length)
      probs.push(`Erro no cadastro do empregador: ` + [...new Set(an.errosEmp.map(e=>`${e.cod} em ${e.origem||"?"}`))].join("; ") + ".");
    if(an.abaixo.length)
      probs.push(`${an.abaixo.length} competência(s) abaixo do salário mínimo: `
        + an.abaixo.map(x=>`${x.comp} (${moedaBR(x.valor)} de ${moedaBR(x.minimo)}, ${x.tipo}${x.origem?` ${x.origem}`:""})`).join("; ") + ".");
    // onda 3 · a contagem do extrato, na mesma leitura
    const ct = an.contagem, conta = ct ? `Carência pelo CNIS: ${ct.carencia} contribuições; tempo de ${anosMeses(ct.anos, ct.meses)}, contado por competência.` : "";
    if(!probs.length)
      return {cor:"ok", estado:"ok", txt:`CNIS lido em ${fmt(g.em)}: ${g.paginas} página(s). Sem erros.${conta?" "+conta:""}`};
    return {cor:"alerta", estado:"atencao", txt:`CNIS lido em ${fmt(g.em)}: ${g.paginas} página(s).\n` + probs.join("\n") + (conta?"\n"+conta:"")};
  }
  if(passo==="indicadores"){
    const g = cnisDe(c);
    if(!g) return {cor:"neutro", txt:"insira o CNIS para os indicadores do extrato aparecerem aqui, com a legenda"};
    const inds = (g.indicadores||[]).map(i=>typeof i==="string" ? {codigo:i} : i);
    if(!inds.length) return {cor:"ok", estado:"ok", txt:`Nenhum indicador na legenda do CNIS de ${fmt(g.em)}.`};
    const tipos = inds.map(i=>tipoIndicador(i.codigo));
    // F235 · o IEAN (exposição a agente nocivo informada pelo empregador) conta como alerta, mas não é erro: não pede acerto (RAC)
    const soInfo = inds.filter(i=>/^IEAN/i.test(String(i.codigo||""))).length;
    const nP = tipos.filter(x=>x==="P").length, nI = tipos.filter(x=>x==="I").length, aten = nP || nI - soInfo;
    const txt = `${inds.length} indicador(es) no CNIS de ${fmt(g.em)}: ${nP} pendência(s), ${nI} alerta(s), ${inds.length-nP-nI} acerto(s)${soInfo ? "; o IEAN (exposição a agente nocivo informada pelo empregador) não é erro: ajuda a aposentadoria especial, e a prova é o PPP" : ""}. Confira no extrato se todos estão aqui.`;
    return {cor: aten ? "alerta" : "ok", estado: aten ? "atencao" : "ok", txt, legenda: inds};
  }
  if(passo==="conclusao"){
    const t = triagemDe(c);
    const antes = triagemPassosDe(c, ks).slice(0,-1);
    const feitos = antes.filter(([k])=>(t[k]||{}).estado && t[k].estado!=="pendente").length;
    return feitos===antes.length
      ? {cor:"ok", txt:`os ${antes.length} passos anteriores estão conferidos`}
      : {cor:"neutro", txt:`${feitos} de ${antes.length} passos conferidos antes desta conclusão`};
  }
  return {cor:"neutro", txt:""};
}
// ══════════════════════════════════════════════════════════════════════════
// F18 · LER O PDF DO INSS — o CNIS e a Declaração de Benefícios
// ══════════════════════════════════════════════════════════════════════════
// O arquivo NÃO sai da máquina. O PDF é lido no próprio navegador, por
// `FileReader` e `pdf.js`; nada é enviado a servidor nenhum, nem ao Supabase,
// enquanto ninguém mandar. O que atravessa a rede é só a biblioteca, buscada
// uma vez do cdnjs quando o primeiro PDF é aberto.
//
// Os dois documentos saem do Meu INSS gerados por iText, em fonte de
// codificação Identity com CMap ToUnicode. Extrair o texto à mão exigiria
// resolver o CMap; a biblioteca resolve, e o que fica aqui é a parte que
// interessa, a leitura do LAYOUT.
const PDFJS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
let _pdfjs = null;
async function carregarPdfJs(){
  if(_pdfjs) return _pdfjs;
  if(!window.pdfjsLib){
    await new Promise((ok, erro)=>{
      const s = document.createElement("script");
      s.src = PDFJS_CDN + "pdf.min.js";
      s.onload = ok;
      s.onerror = ()=>erro(new Error("cdn"));
      document.head.appendChild(s);
    });
  }
  if(!window.pdfjsLib) throw new Error("cdn");
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_CDN + "pdf.worker.min.js";
  return (_pdfjs = window.pdfjsLib);
}
// devolve cada pedaço de texto com a posição na folha. y cresce para BAIXO
// aqui, ao contrário do PDF, para as linhas saírem na ordem de leitura.
async function itensDoPdf(arquivo){
  const lib = await carregarPdfJs();
  const dados = new Uint8Array(await arquivo.arrayBuffer());
  const doc = await lib.getDocument({data:dados, isEvalSupported:false}).promise;
  const itens = [];
  for(let p=1; p<=doc.numPages; p++){
    const pag = await doc.getPage(p);
    // [BUG 20.09.2026] O EXTRATO EM PAISAGEM. O Meu INSS passou a gerar o CNIS
    // com a página girada (/Rotate 90). Lendo a posição crua do texto, os eixos
    // ficavam trocados: o que era coluna virava linha, o cabeçalho da página
    // caía na mesma "linha" da legenda, nenhum vínculo casava e a legenda de
    // indicadores saía vazia. A posição passa pela mesma transformação que o
    // visualizador usa para desenhar a página, e aí x e y são os da folha
    // como se lê, girada ou não.
    const vp = pag.getViewport({scale:1});
    const c = await pag.getTextContent();
    for(const i of c.items){
      const t = (i.str||"").trim();
      if(!t) continue;
      const [x, y] = vp.convertToViewportPoint(i.transform[4], i.transform[5]);
      itens.push({t, x:Math.round(x), y:Math.round(y), w:Math.round(i.width||0), p});
    }
  }
  try{ await doc.destroy(); }catch(e){}
  return colarPedacosDoPdf(itens);
}
// [BUG 20.09.2026] "NÃO RECONHECI ESTE ARQUIVO COMO UM CNIS". Há PDFs do Meu
// INSS em que o gerador entrega o texto LETRA POR LETRA, cada glifo um pedaço.
// Aí "NIT:" chega como N, I, T e dois-pontos, "IREC-INDPEND" vira doze pedaços,
// e nenhuma expressão casa: nem o NIT, nem a legenda, e o extrato é recusado.
// Esta passada cola os pedaços vizinhos da mesma linha quando o vão entre eles
// é menor que uma letra; um vão maior é espaço de verdade e continua separando.
function colarPedacosDoPdf(itens){
  const ord = itens.slice().sort((a,b)=> a.p-b.p || a.y-b.y || a.x-b.x);
  const fora = [];
  for(const i of ord){
    const u = fora[fora.length-1];
    if(u && u.p===i.p && Math.abs(u.y-i.y)<=2 && u.w>0){
      const vao = i.x - (u.x + u.w);
      if(vao <= 1 && !/\s$/.test(u.t) && !/^\s/.test(i.t)){
        u.t += i.t; u.w = (i.x + (i.w||0)) - u.x; continue;
      }
    }
    fora.push({...i});
  }
  return fora;
}
// O pdf.js devolve PEDAÇOS de texto, não palavras: um pedaço pode trazer
// "123.456.789-0 CESSADO" junto, e aí nenhuma comparação de palavra casa. Aqui
// tudo vira palavra, com o x repartido pela largura — assim o extrator não
// depende de como o gerador do PDF picotou a linha.
function palavrasDoPdf(itens){
  const fora = [];
  for(const i of itens){
    const ps = String(i.t).split(/\s+/).filter(Boolean);
    if(ps.length <= 1){ fora.push(i); continue; }
    const total = ps.reduce((a,x)=>a+x.length,0) + (ps.length-1);
    const larg = i.w || total * 5;
    let corrido = 0;
    for(const pal of ps){
      fora.push({...i, t:pal, x:Math.round(i.x + larg*corrido/total),
                 w:Math.round(larg*pal.length/total)});
      corrido += pal.length + 1;
    }
  }
  return fora;
}
// agrupa em linhas de leitura: mesma folha, alturas próximas, ordenado pelo x
function linhasDoPdf(itens, folga){
  const f = folga==null ? 3 : folga;
  const linhas = [];
  for(const i of itens.slice().sort((a,b)=> a.p-b.p || a.y-b.y || a.x-b.x)){
    const ult = linhas[linhas.length-1];
    if(ult && ult.p===i.p && Math.abs(ult.y - i.y) <= f){ ult.itens.push(i); ult.y=(ult.y+i.y)/2; }
    else linhas.push({p:i.p, y:i.y, itens:[i]});
  }
  return linhas.map(l=>({...l, itens:l.itens.sort((a,b)=>a.x-b.x),
                         txt:l.itens.sort((a,b)=>a.x-b.x).map(x=>x.t).join(" ")}));
}
// ── CNIS ────────────────────────────────────────────────────────────────
// A Legenda de Indicadores, no fim do extrato, é a lista FECHADA dos códigos
// que aquele extrato usa, com a descrição oficial ao lado. É de onde vem a
// verdade: contar códigos soltos no corpo pega texto de rodapé e cabeçalho.
const RX_IND = /^[A-Z]{3,}(?:-[A-Z0-9]{2,})*$/;
// ══════════════════════════════════════════════════════════════════════════
// F127 · A LEGENDA DOS INDICADORES — pendência, alerta ou acerto
// ══════════════════════════════════════════════════════════════════════════
// A tabela vem da lista pública de indicadores do CNIS (planilha da
// Tramitação Inteligente, atualizada até 09/2026) e segue a convenção do
// próprio INSS: código começado em P é pendência (vermelho), em I é
// indicador de alerta (amarelo), em A é acerto (verde). As exceções ao prefixo
// ficam em IND_TIPO_FIXO. A descrição do extrato, quando vem, prevalece.
const IND_TIPO_FIXO = {"PCTC-NTR":"I", "NDET":"P", "GFIP":"I"};
function tipoIndicador(cod){
  const c = String(cod||"").toUpperCase();
  if(IND_TIPO_FIXO[c]) return IND_TIPO_FIXO[c];
  if(/^FBR-AUT/.test(c)) return "P";
  return c[0]==="P" ? "P" : c[0]==="A" ? "A" : "I";
}
const IND_TIPO_ROT = {P:"pendência", I:"alerta", A:"acerto"};
const IND_CNIS = {
"ACNISVR":"Acerto realizado pelo INSS",
"ADIV-DADOS-GFIP":"Validação de vínculo ou remuneração com divergência de dado cadastral do trabalhador em GFIP",
"AEXT-IND":"Vínculo extemporâneo não confirmado pelo INSS",
"AEXT-INDJ":"Vínculo extemporâneo não confirmado por decisão judicial",
"AEXT-INDR":"Vínculo extemporâneo não confirmado por decisão recursal",
"AEXT-VI":"Vínculo extemporâneo não confirmado pelo INSS",
"AEXT-VP":"Vínculo extemporâneo confirmado parcialmente pelo INSS",
"AEXT-VPR":"Vínculo extemporâneo confirmado parcialmente por decisão recursal",
"AEXT-VPT":"Vínculo extemporâneo confirmado parcialmente por decisão judicial",
"AEXT-VT":"Vínculo extemporâneo confirmado pelo INSS",
"AEXT-VTJ":"Vínculo extemporâneo confirmado por decisão judicial",
"AEXT-VTR":"Vínculo extemporâneo confirmado por decisão recursal",
"ASE-DEF":"Acerto de período de segurado especial deferido",
"ASE-DEFJ":"Acerto de período de segurado especial deferido judicial",
"ASE-DEFR":"Acerto de período de segurado especial deferido recursal",
"ASEF-DEF":"Acerto de período de segurado especial FUNAI deferido",
"ASEF-DEFJ":"Acerto de período de segurado especial FUNAI deferido judicial",
"ASE-IND":"Acerto de período de segurado especial indeferido",
"ASE-INDR":"Acerto de período de segurado especial indeferido recursal",
"ASE-NSE":"Acerto de período não segurado especial",
"ASE-RNEG":"Acerto de período de segurado especial negativo ratificado",
"ASE-RPOS":"Acerto de período de segurado especial positivo ratificado",
"AVR-AGPVINC":"Acerto de agrupamento de vínculos",
"AVRC-AGPVINC":"Acerto de agrupamento de vínculos",
"AVRC-DEF":"Acerto confirmado pelo INSS",
"AVRC-DEFJ":"Acerto confirmado por decisão judicial",
"AVRC-DEFR":"Acerto confirmado por decisão recursal",
"AVRC-DGPVINC":"Acerto de desagrupamento de vínculos",
"AVRC-IND":"Acerto negado pelo INSS",
"AVRC-INDJ":"Acerto negado por decisão judicial",
"AVRC-INDR":"Acerto negado por decisão recursal",
"FBR-AUT-BAT":"Recolhimento de facultativo de baixa renda com atualização cadastral no CNIS aguardando batimentos",
"FBR-AUT-CONCBEN":"Recolhimento de facultativo de baixa renda concomitante com benefício incompatível (previdenciário, BPC ou PA)",
"FBR-AUT-CONCQSA":"Recolhimento de facultativo de baixa renda participante de quadro societário de empresa",
"FBR-AUT-CONCSD":"Recolhimento de facultativo de baixa renda concomitante com seguro-desemprego",
"FBR-AUT-DUPGRUPFAM":"Recolhimento de facultativo de baixa renda com duplicidade de grupo familiar",
"FBR-AUT-EXPCAD":"Recolhimento de facultativo de baixa renda sem atualização bienal no CadÚnico",
"FBR-AUT-FACULTCONC":"Recolhimento de facultativo de baixa renda concomitante com filiação incompatível (segurado obrigatório)",
"FBR-AUT-OBITO":"Recolhimento de facultativo de baixa renda com óbito anterior à competência ou ao pagamento",
"FBR-AUT-PENDCAD":"Recolhimento de facultativo de baixa renda sem cadastro no CadÚnico",
"FBR-AUT-PENDPROCES":"Recolhimento de facultativo de baixa renda pendente de processamento no CadÚnico",
"FBR-AUT-RENPES":"Recolhimento de facultativo de baixa renda com renda pessoal informada no CadÚnico",
"FBR-AUT-RENSUP":"Recolhimento de facultativo de baixa renda com renda familiar superior a 2 salários mínimos",
"GFIP":"Remuneração da competência declarada em GFIP",
"IAGRU-MIN-SM-EC103":"Competência agrupada que recebeu valor mas permaneceu abaixo do mínimo (favorecida)",
"IAGRUP-MN-SM-EC103":"Competência agrupada que recebeu de outra competência mas permaneceu abaixo do mínimo (favorecida)",
"IAGRUP-SM-EC103":"Competência agrupada que resultou em salário de contribuição igual ao mínimo (favorecida)",
"IAGRUP-VR-EC103":"Competência agrupada em que restou valor residual (desfavorecida)",
"IAGRUP-ZER-EC103":"Competência agrupada que restou zerada (desfavorecida)",
"IAGRU-SP-M-SM-EC103":"Competência agrupada que resultou em salário de contribuição igual ao mínimo (favorecida)",
"ICED-VR-EXC-EC103":"Competência que cedeu valor excedente para outra competência",
"ICOMPL-VR-SM-EC103":"Competência com recolhimento de complementação para o valor mínimo",
"IDARF-ALT-CODRECEITA":"DARF incluído por alteração de código de receita aplicável pelo INSS",
"IDARF-ALT-COMPETENCIA":"DARF incluído por alteração de competência dentro do período de vigência",
"IDARF-ALT-CPF":"DARF alterado pela RFB para o CPF do titular",
"IDARF-ALT-DADOS":"DARF incluído por alteração de dados",
"IDARF-CPF-NAO-INF":"DARF para CPF não informado no evento",
"IDARF-DESFAZ-CANCEL":"DARF com cancelamento desfeito",
"IDARF-DESFAZ-RESTIT-PARCIAL":"DARF com valor restituído parcial desfeito",
"IDARF-DESFAZRESTITPARCIAL":"DARF com valor restituído parcial desfeito",
"IDARF-DESFAZ-RESTIT-TOTAL":"DARF com valor restituído total desfeito",
"IDARF-DESFAZRESTITTOTAL":"DARF com valor restituído total desfeito",
"IDARF-ESPECIE-CI-INVALIDA":"DARF para espécie de CI inválida na competência",
"IDARF-EXT-SEM-ANO-CIV":"DARF sem ano civil presente no extrato",
"IDARF-FIL-CAD-DIV":"DARF para filiado com dados cadastrais divergentes entre CNIS e RFB",
"IDARF-FIL-NAO-ENC":"DARF para filiado não encontrado no cadastro de pessoas físicas",
"IDARF-SEM-EMISS-ANT":"DARF sem emissão registrada anteriormente",
"IDARF-TIPO-FILIADO-INVALIDO":"DARF para tipo de filiado inválido na competência",
"IDARF-TIPO-FILIADO-NAO-INFORMADO":"DARF para tipo de filiado não informado na competência",
"IDESINDEXA":"Contribuição da competência desindexada",
"IDT":"Demanda de natureza trabalhista",
"IEAN":"Exposição a agente nocivo informada pelo empregador, passível de comprovação",
"IREC-DESINDEXA":"Contribuição da competência desindexada",
"IREC-FBR":"Recolhimento de facultativo de baixa renda (Lei 12.470/2011)",
"IREC-FBR-DEF":"Recolhimento de facultativo de baixa renda deferido/válido via Portal CNIS",
"IREC-FBR-IND":"Recolhimento de facultativo de baixa renda indeferido/inválido via Portal CNIS",
"IREC-INDPEND":"Recolhimentos com indicadores ou pendências",
"IREC-LC123":"Recolhimento no Plano Simplificado de Previdência Social (LC 123/2006)",
"IREC-LC123-SUP":"Recolhimento no Plano Simplificado (LC 123/2006) superior ao salário mínimo",
"IREC-LIM-SM":"Contribuição da competência limitada ao salário mínimo",
"IREC-MEI":"Contribuição da competência recolhida com código MEI",
"IRECOL":"Contribuição da competência é recolhimento",
"IREL-PREV-POSSUI-COMP-AJUST":"Relação previdenciária com competência ajustada (favorecida ou desfavorecida)",
"IREL-PREV-POSSUI-COMPA-JUST":"Relação previdenciária com competência ajustada (favorecida ou desfavorecida)",
"IREM-ACD":"Remuneração com parcela de acordo, convenção ou dissídio coletivo",
"IREM-INDPEND":"Remunerações com indicadores ou pendência",
"IREM-SEM-DIAS-INTERM":"Remuneração do trabalhador intermitente sem dias trabalhados informados",
"IREM-PARC-CEDIDO":"Remuneração com parcela decorrente de trabalhador cedido",
"IREM-PARC-DIR-SIND":"Remuneração com parcela decorrente de dirigente sindical",
"IREM-PARC-DIRSIND":"Remuneração com parcela decorrente de dirigente sindical",
"IREM-PERQRT":"Remuneração em período de quarentena",
"IREM-PER-QUARENTENA":"Remuneração informada após o desligamento, referente ao período de quarentena",
"IREM-RECL-TRAB":"Remuneração com parcela de reclamatória trabalhista",
"IREM-REINTEG-PARC-PROC-TRAB":"Remuneração de período de reintegração parcial oriunda de processo trabalhista",
"IREM-REINTEG-TOT-PROC-TRAB":"Remuneração de período de reintegração total oriunda de processo trabalhista",
"IREM-TRAB-INTERM":"Remuneração relacionada a trabalho intermitente",
"IREM-TRAB-VERDE-AMARELO":"Remuneração de vínculo com período de categoria da carteira verde e amarela",
"IREM-TRANSF-TSVE-PROC-TRAB":"Remunerações transferidas para o vínculo por unicidade contratual de TSVE em processo trabalhista",
"IREM-TSVE-PER-QUARENTENA":"Remuneração informada após o término do TSVE, referente ao período de quarentena",
"IREM-VINC-PROC-TRAB":"Remuneração no vínculo oriunda de processo trabalhista",
"ISALMIN":"Contribuição da competência limitada ao salário mínimo",
"ISE-CVU":"Período de segurado especial concomitante com outro período urbano",
"IUTILIZ-EXC-EC103":"Competência favorecida por valor excedente de outra competência",
"IUTILIZ-EXC-MN-SM-EC103":"Competência favorecida por valor excedente de outra competência, mas ainda inferior ao mínimo",
"IVIN-AGRUP-VINC":"Vínculo gerado pelo serviço de agrupamento de vínculos",
"IVIN-AGRUP-VINC-PART":"Vínculo que foi alvo do serviço de agrupamento de vínculos",
"IVIN-DESLIG-JUSTICA-TRAB":"Data de desligamento incluída pela Justiça do Trabalho (evento S-8299 do eSocial)",
"IVIN-DESLIG-JUSTIÇA-TRAB":"Data de desligamento incluída pela Justiça do Trabalho (evento S-8299 do eSocial)",
"IVIN-JORN-DIFERENCIADA":"Vínculo com regime de jornada diferenciada",
"IVIN-MAND-ELETIVO-PARCIAL":"Vínculo parcialmente caracterizado como mandato eletivo",
"IVIN-POSSUI-REG-PRELIM":"Relação trabalhista com registro preliminar informado anteriormente no eSocial",
"IVIN-POSSUI-REM-TRAB-INTERM":"Relação trabalhista com remunerações de trabalho intermitente",
"IVIN-POSSUI-REM-TRANS":"Vínculo com remuneração transferida por cessionário de dirigente sindical ou trabalhador cedido",
"IVIN-PROC-TRAB":"Vínculo com processo trabalhista",
"IVIN-REG-PRELIM":"Relação trabalhista que é registro preliminar de vínculo no eSocial",
"IVIN-REINTEG":"Vínculo com reintegração no último desligamento (decisão judicial, reversão, recondução ou reinclusão)",
"IVIN-REINTEG-ANISTIA":"Reintegração por anistia legal",
"IVIN-REINTEG-OUTROSTIPOS":"Vínculo com reintegração por iniciativa do empregador ou por outros motivos",
"IVIN-REINTEG-PARC":"Sentença trabalhista determinando reintegração e pagamento de remunerações de período parcial",
"IVIN-REINTEG-PARC-PROC-TRAB":"Vínculo com reintegração parcial oriunda de processo trabalhista",
"IVIN-REINTEG-PROC-TRAB":"Vínculo com reintegração no último desligamento oriunda de processo trabalhista",
"IVIN-REINTEG-TOT":"Sentença trabalhista determinando reintegração e pagamento retroativo do período total",
"IVIN-REINTEG-TOT-PROC-TRAB":"Vínculo com reintegração total oriunda de processo trabalhista",
"IVIN-TRAB-INTERM":"Vínculo com informações de trabalho intermitente",
"IVIN-TRAB-VERDE-AMARELO":"Vínculo com período de categoria da carteira verde e amarela",
"IVIN-UNIC-CONTR-PROC-TRAB":"Vínculo com unicidade contratual oriunda de processo trabalhista",
"IVIN-UNIC-CONTR-TSVE-PROC-TRAB":"Vínculo com unicidade contratual do período de TSVE oriunda de processo trabalhista",
"IVLR-DARF-LIMITADO":"Valor do DARF limitado para a competência não ultrapassar o salário mínimo",
"NDET":"Data de início de atividade estimada na migração",
"PADM-EMPR":"Data de admissão incompatível com o período de atividade do empregador",
"PCEI-EQP-INV":"Empregador com identificador inválido",
"PCTC-NTR":"Certidão de Tempo de Contribuição pendente de análise do INSS",
"PDARF-ALT-COMP-FORA-VIG":"DARF incluído por alteração de competência fora do período de vigência",
"PDARF-ALT-CPF":"DARF desassociado do CPF originário pela RFB",
"PDARF-EVENTO-INCONSISTENTE":"Evento inconsistente",
"PDARF-INV-ALT-CODRECEITA":"DARF invalidado por alteração pela RFB para código de receita não tratado",
"PDARF-RESTIT-PARCIAL":"DARF com valor restituído parcial",
"PDARF-RESTIT-TOTAL":"DARF com valor restituído total",
"PDESFAZ-AJ-EC103":"Pendência por desfazimento de agrupamento ou utilização",
"PDIV-DADOS-GFIP":"Vínculo ou remuneração pendente por divergência de dado cadastral do trabalhador em GFIP",
"PDT-NASC-FIL-INV":"Idade do filiado menor que a permitida pela legislação",
"PDT-NASC-FIL-MENOR-INV":"Idade do filiado menor aprendiz menor que a permitida pela legislação",
"PEMP-CAD":"Faltam dados cadastrais do empregador (CNPJ ou CEI)",
"PEMP-IDINV":"Empregador com identificador inválido",
"PEXT":"Vínculo com informação extemporânea, passível de comprovação",
"PMOV-INCONSIST":"Registro inconsistente de movimentação entre competências",
"PNIT-0094":"NIT invalidado pertencente à faixa crítica do tipo Ofício INSS 094",
"PNIT-CRIT":"NIT em faixa crítica",
"PNIT-IND":"NIT indeterminado",
"PNIT-O094":"NIT invalidado pertencente à faixa crítica do tipo Ofício INSS 094",
"PNIT-SC":"NIT não encontrado no cadastro ou inexistente",
"PNIT-SUP":"NIT com indício de superposição de dados",
"PREC-CDCONC":"Recolhimento ou período de contribuinte em dobro concomitante com outro tipo de filiado no vínculo",
"PREC-CDONC":"Recolhimento ou período de contribuinte em dobro concomitante com outro tipo de filiação no vínculo",
"PREC-COD1821":"Recolhimento com código de pagamento 1821 (mandato eletivo)",
"PREC-COD1821_FORA_VIG":"Recolhimento com código de pagamento 1821 (mandato eletivo) fora da vigência",
"PREC-CSE":"Recolhimento de segurado especial pendente de comprovação da atividade",
"PREC-FACULTCONC":"Recolhimento ou período de facultativo concomitante com outros vínculos",
"PREC-FAUCULTCONC":"Recolhimento ou período de facultativo concomitante com outros vínculos",
"PREC-FBR":"Recolhimento de facultativo de baixa renda não validado",
"PREC-FBR-ANT":"Recolhimento de facultativo de baixa renda anterior a 09/2011 (inválido)",
"PREC-LC123-ANT":"Recolhimento no Plano Simplificado (LC 123/2006) anterior à competência 04/2007",
"PREC-LC150-DOM":"Pagamento de doméstica em GPS em período de remuneração de fonte INSS/eSocial",
"PREC-MENOR-MIN":"Recolhimento abaixo do valor mínimo",
"PREC-OBITO":"Competência do recolhimento posterior ao mês do óbito",
"PREC-PMIG-DOM":"Recolhimento de empregado doméstico sem comprovação de vínculo",
"PREM-BLOQ-EC103":"Bloqueio de remuneração ou contribuição para ajuste entre competências",
"PREM-EMPR":"Remunerações incompatíveis com o período de atividade do empregador",
"PREM-EXT":"Remuneração informada fora do prazo, passível de comprovação",
"PREM_EXT":"Remuneração informada fora do prazo, passível de comprovação",
"PREM-FORA-ATIV-INTERM":"Remuneração de trabalho intermitente fora do período de atividade",
"PREM-FORA-CONVOC":"Remuneração de trabalho intermitente não coberta por convocatória",
"PREM-FORA-REINTEG-ANISTIA":"Remuneração fora do período da reintegração por anistia legal",
"PREM-FORA-REINTEG-OUTROSTIPOS":"Remuneração fora do período da reintegração por iniciativa do empregador ou outros motivos",
"PREM-FORA-REINTEG-PROC-TRAB":"Remuneração fora do período da reintegração oriunda de processo trabalhista",
"PREM-FVIN":"Remuneração após o fim do vínculo",
"PREM-IVIN":"Remuneração antes do início do vínculo",
"PREM-NASC":"Remuneração antes da data de nascimento do filiado",
"PREM-OBITO":"Remuneração após o óbito",
"PREM-PER-DESLIG-APOSENT":"Remuneração após o desligamento por aposentadoria de servidor, com competência já informada no eSocial",
"PREM-PER-DESLIG-JUD":"Remuneração após o desligamento reconhecido judicialmente, com competência já informada no eSocial",
"PREM-PER-QUARENTENA":"Remuneração informada após o desligamento, referente ao período de quarentena",
"PREM-POS-DESLIG-APOSENT":"Remuneração após o período entre o desligamento por aposentadoria de servidor e o último dia trabalhado",
"PREM-POS-DESLIG-JUD":"Remuneração após o período entre o desligamento e o último dia trabalhado",
"PREM-POSGRT":"Remuneração posterior ao período de quarentena",
"PREM-POSQRT":"Remuneração posterior ao período de quarentena",
"PREM-POS-QUARENTENA":"Remuneração informada após o período de quarentena",
"PREM-REINTEG-ANISTIA":"Pendência em remuneração de período de anistia legal",
"PREM-REINTEG-OUTROSTIPOS":"Pendência em remuneração de reintegração por iniciativa do empregador ou outros motivos",
"PREM-TSVE-PER-QUARENTENA":"Remuneração informada após o término do TSVE, referente ao período de quarentena",
"PREM-TSVE-PER-TERM-JUD":"Remuneração após o término do TSVE reconhecido judicialmente, com competências já informadas no eSocial",
"PREM-TSVE-POS-QUARENTENA":"Remuneração informada para TSVE após o período de quarentena",
"PREM-TSVE-POS-TERM-JUD":"Remuneração após o período entre o término do TSVE e o último dia trabalhado",
"PREM-TSVE-PROC-TRAB":"Reconhecimento de remuneração de trabalhador sem vínculo oriundo de processo trabalhista",
"PREM-TSVE-RESP-INDIRETO-PROC-TRAB":"Remuneração de TSVE informada por responsável indireto em processo trabalhista",
"PREM-VINC-PROC-TRAB":"Reconhecimento de remuneração no vínculo oriunda de processo trabalhista",
"PREM-VINV":"Remuneração antes do início do vínculo",
"PRES-EMPR":"Data de rescisão incompatível com o período de atividade do empregador",
"PRPPS":"Vínculo de empregado com informações de Regime Próprio (servidor público)",
"PRPSE":"Vínculo de empregado de regime de previdência no exterior (não utilizável pelo RGPS)",
"PSC-MEN-SM-EC103":"Competência com salário de contribuição menor que o mínimo, não tratada; passível de complementação, utilização ou agrupamento",
"PSE-NEG":"Período de segurado especial negativo",
"PSE-PEN":"Período de segurado especial pendente",
"PSE-POS":"Período de segurado especial positivo",
"PSUC-DIVERG-DT-ADM":"Vínculo sucessor com divergência na data de admissão em relação ao vínculo sucedido",
"PVIN-ADMISSAO-DESLIG-PROC-TRAB":"Alteração da data de admissão e inclusão ou alteração da data de desligamento em processo trabalhista",
"PVIN-ADMISSAO-PROC-TRAB":"Alteração da data de admissão oriunda de processo trabalhista",
"PVIN-ADM-OBITO":"Data de admissão posterior ao óbito",
"PVIN-AGRUP-INC":"Inconsistência em vínculo agrupador: nem todos os vínculos agrupados foram encontrados",
"PVIN-CAGED":"Vínculo oriundo da fonte CAGED",
"PVIN-DESLIG-JUSTIÇA-TRAB":"Data de desligamento incluída pela Justiça do Trabalho (evento S-8299 do eSocial)",
"PVIN-DESLIG-OBITO":"Data do desligamento posterior à data do óbito",
"PVIN-DESLIG-PROC-TRAB":"Inclusão ou alteração da data de desligamento oriunda de processo trabalhista",
"PVIN-IRREG":"Vínculo em situação de irregularidade",
"PVIN-MAND-ELETIVO-TOTAL":"Vínculo totalmente caracterizado como mandato eletivo",
"PVIN-ME":"Vínculo de mandato eletivo, passível de comprovação",
"PVIN-OBITO":"Data de admissão posterior ao óbito",
"PVIN-RE":"Causa de rescisão estimada, por não ter sido informada pela fonte (RAIS, FGTS ou GRE)",
"PVIN-REC-PROC-TRAB":"Reconhecimento de vínculo oriundo de processo trabalhista",
"PVIN-RESP-INDIRETO-PROC-TRAB":"Reconhecimento de vínculo informado por responsável indireto em processo trabalhista",
"PVIN-SUBSTIT-INC":"Inconsistência em vínculo prevalente: nem todos os vínculos relacionados foram encontrados",
"PVIN-TRAB-INTERM":"Pendência em vínculo com informações de trabalho intermitente",
"PVIN-UNIC-CONTR-PROC-TRAB":"Vínculo com unicidade contratual oriunda de processo trabalhista",
"PVIN-UNIC-CONTR-TSVE-PROC-TRAB":"Vínculo com unicidade contratual do período de TSVE oriunda de processo trabalhista",
};
function descIndicador(cod, doExtrato){
  return (doExtrato||"").trim() || IND_CNIS[String(cod||"").toUpperCase()] || "descrição não catalogada — conferir no extrato";
}
// o salário mínimo por competência, desde o Real. Conferido em 20.09.2026 no
// DIEESE, no gov.br e na tabela do Portal Contábeis (contabeis.com.br/tabelas/
// salario-minimo, com o ato legal de cada valor) — as três batem, linha a
// linha. Antes de 07/1994 a moeda é outra e a conferência não vale.
const SAL_MIN = [["1994-07",64.79],["1994-09",70],["1995-05",100],["1996-05",112],["1997-05",120],
  ["1998-05",130],["1999-05",136],["2000-04",151],["2001-04",180],["2002-04",200],["2003-04",240],
  ["2004-05",260],["2005-05",300],["2006-04",350],["2007-04",380],["2008-03",415],["2009-02",465],
  ["2010-01",510],["2011-01",540],["2011-03",545],["2012-01",622],["2013-01",678],["2014-01",724],
  ["2015-01",788],["2016-01",880],["2017-01",937],["2018-01",954],["2019-01",998],["2020-01",1039],
  ["2020-02",1045],["2021-01",1100],["2022-01",1212],["2023-01",1302],["2023-05",1320],
  ["2024-01",1412],["2025-01",1518],["2026-01",1621]];
// ponytail: tabela fixa; competência depois da última linha usa o último valor
function salarioMinimo(comp){
  const [m, a] = String(comp||"").split("/"); if(!m || !a) return null;
  const k = `${a}-${m}`; let v = null;
  for(const [ini, val] of SAL_MIN){ if(ini <= k) v = val; else break; }
  return v;
}
