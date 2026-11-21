// F415 · os dias já concedidos por análise documental, somados desde a última perícia favorável (presencial ou por
// telemedicina), que reinicia a soma (Portaria Conjunta 13/2026, art. 3º, § 2º, com a redação da Portaria Conjunta 54/2026)
function _incSomaDocumental(x){
  const ls = (x.fd.laudos||[]).filter(l=>l.resultado==="incapaz").sort((a, b)=>isoBr(a.exame||"") < isoBr(b.exame||"") ? -1 : 1);
  let soma = 0;
  for(const l of ls){
    if(!/documental|atestmed/i.test(l.tipo||"")){ soma = 0; continue; }
    const de = isoBr(l.dii||""), ate = isoBr(l.dcb||"");
    if(de && ate && ate >= de) soma += Math.round((Date.parse(ate) - Date.parse(de)) / 864e5) + 1;
  }
  return soma;
}
// F232 · a data do direito das opções marcadas pelo motor de requisitos (filiação, escada
// da mulher, direito adquirido, transições do professor): a mais cedo; null se nenhuma se completa
function dataDoDireito(c){
  const ks = D.casosDoCliente.get(c.id)||[];
  return opcoesSel(c).filter(o=>(REQ_EXTRA[o.o]||{}).quando).map(o=>(requisitosDe(c, ks, o.o)||{}).quando).filter(Boolean).sort()[0] || null;
}
// a data em que a idade exigida pela opção marcada se completa (o "atinge em" do quadro Idade);
// a opção que o motor sabe datar não entra aqui (a idade fixa errava professor e mulher)
function idadeAtingeEm(c){
  const dn = dnIso(c.dn), id = idadeDe(c.dn); if(!dn || id==null) return null;
  const i = sexoDe(c)==="F" ? 1 : 0;
  const ds = opcoesSel(c).filter(o=>!(REQ_EXTRA[o.o]||{}).quando).map(o=>IDADE_EXIG[o.o]).filter(Boolean).map(e=>e[i]).filter(ex=>id < ex).map(ex=>somarAnos(dn, ex)).sort();
  return ds[0] || null;
}
// F235 · o desfecho de cada benefício marcado, uma linha por benefício, igual na Análise de Direito e em
// Documentos (antes seguia o último benefício clicado e as duas telas davam respostas opostas):
// caso (o ato cabe já, ou há prazo), Aposentadorias futuras (com a data; sem data, a projeção "voltando a
// pagar todo mês", dita na tela) ou o que falta para decidir
// F235 · o que a opção acrescenta à linha do Desfecho (o prazo e os 30 dias do salário-maternidade; a orientação do seguro-defeso negado)
const _desfExtra = (op, x, a) => { const f = (REQ_EXTRA[op]||{}).desfechoTxt; if(!f || !x) return ""; try{ return f(x, a) || ""; }catch(e){ return ""; } };
function desfechoPorBenef(c){
  const ks = D.casosDoCliente.get(c.id)||[], hj = hoje();
  let pz = []; try{ pz = prazosDoDossie(c); }catch(e){}
  const lsDesf = opcoesSel(c).map(o=>{
    let x = null, a = null; try{ x = reqCtx(c, ks, o.o); a = avaliarReq(o.o, x); }catch(e){}
    const imp = a && a.rs.find(r=>r.est==="impedido");
    if(imp) return {o, acao:"nada", txt:`não cabe: ${imp.txt}${_desfExtra(o.o, x, a)}`};
    const ve = a && x ? vereditoReq(o.o, x, a) : null;
    if(ve && ve.tom==="nao") return {o, acao:"nada", txt:ve.txt};
    // F235 · o catálogo pode ditar a linha do desfecho: o acerto que se pede já, a aposentadoria que espera o CNIS corrigido, a que se pede com a JA
    if(ve && ve.desf) return {o, ...ve.desf};
    // F235 · o prazo do próprio benefício (30 dias do auxílio, 90 da pensão e da reclusão) manda gerar o caso já
    const prz = a && a.rs.find(r=>ehPrazo(r) && r.est==="risco" && (!r.quando || r.quando >= hj));
    if(prz && !(ve && ve.tom==="ainda" && a.rs.some(r=>!ehPrazo(r) && ["risco","falta"].includes(r.est))))
      return {o, acao:"caso", prazo:true, quando:prz.quando || null, txt:`gere o caso já: ${prz.txt.replace(/^prazo correndo:\s*/i, "")}`};
    // F235 · o catálogo pode dar a linha do desfecho do benefício (a troca de espécie, a prorrogação com o valor que cai, o corte sem
    // decisão, a B93 que já paga como B21, a PcD que depende do grau, a conversão e o Tema 709): depois do prazo, que vale mais
    const dx = (REQ_EXTRA[o.o]||{}).desfecho; if(dx && x && a){ let r = null; try{ r = dx(x, a, ve); }catch(e){} if(r && typeof r==="object") return {o, ...r}; }
    if(DESF_IMEDIATO[o.o]){ const p = /^(b31|b32|acid|crps)$/.test(o.o) && pz[0];
      if(p) return {o, acao:"caso", txt:`gere o caso: ${p.texto} (${faltamTxt(p.fatal)}), ou a ação; a via é do advogado`};
      if(ve && ve.tom==="ainda" && a && ["risco","falta"].includes(a.pior)) return {o, acao:"", txt:`antes do caso, resolva: ${ve.txt}`};
      return {o, acao:"caso", txt:`gere o caso: ${DESF_IMEDIATO[o.o]}, o ato não espera data futura${_desfExtra(o.o, x, a)}`}; }
    // F235 · aposentadoria e BPC pagam desde o pedido (Lei 8.213/91, art. 49; LOAS): "direito desde" não é atrasado
    if(a && a.quando && a.quando <= hj) return {o, acao:"caso", txt:/^(def|idoso)$/.test(o.o)
      ? `gere o caso e peça já: pode pedir desde ${fmtBarra(a.quando)}, e o BPC é pago só a partir do pedido`
      : `gere o caso e peça já: cumpre os requisitos desde ${fmtBarra(a.quando)}; o pagamento começa no dia do pedido, e cada mês de espera se perde`};
    if(a && a.quando) return {o, acao:"lembrete", data:a.quando, txt:`envie a Aposentadorias futuras: direito em ${fmtBarra(a.quando)}`};
    const qf = (REQ_EXTRA[o.o]||{}).quando;
    if(x && qf && x.v.apo_segue!=="Sim" && !(a && a.rs.some(r=>r.est==="informar" && !(r.campos||[]).includes("apo_segue")))){ let q = null; try{ q = qf({...x, v:{...x.v, apo_segue:"Sim"}}); }catch(e){}
      // F235 · quem tem vínculo em aberto não "volta" a pagar: continua contribuindo
      if(q && q > hj) return {o, acao:"lembrete", data:q, suposto:true, txt:`envie a Aposentadorias futuras: direito previsto em ${fmtBarra(q)} ${(x.tempos||[]).some(r=>r.de && !r.ate) ? "se continuar contribuindo todo mês" : "se voltar a pagar o INSS todo mês"}`}; }
    if(o.o==="conv") return {o, acao:"", txt:"a conversão não é pedido à parte: entra na conta da aposentadoria por tempo (veja a linha dela)"};
    if(ve && ve.tom==="sim") return {o, acao:"caso", txt:`gere o caso e peça já: ${ve.txt.replace(/^(Sim|Pode ter direito hoje)[,:]?\s*/i, "")}`};
    const inf = a ? a.rs.filter(r=>r.est==="informar").map(r=>r.rot.replace(/\s*\?$/, "").replace(/^./, s=>s.toLowerCase())) : [];
    return {o, acao:"", txt: inf.length ? `falta responder na Análise de Direito: ${inf.slice(0, 3).join("; ")}${inf.length > 3 ? ` e mais ${inf.length - 3}` : ""}` : "complete a Análise de Direito: ainda sem data do direito"};
  }).map(l=>l && l.txt ? {...l, txt:semCodigo(l.txt)} : l);
  // F235 · a conversão que manda pedir já a aposentadoria por tempo leva a linha da B42 junto: as duas não se contradizem
  const cv = lsDesf.find(l=>l && l.o && l.o.o==="conv" && l.acao==="caso");
  return cv ? lsDesf.map(l=>l && l.o && l.o.o==="transicao" && l.acao!=="caso" ? {o:l.o, acao:"", txt:"vai no mesmo pedido da conversão (linha acima): com o tempo especial convertido, a aposentadoria por tempo se pede já"} : l) : lsDesf;
}
// F235 · o prazo que o Desfecho mostrou vira tarefa com data no caso gerado (a prorrogação, os 30 dias do pedido, o restabelecimento, o limbo)
function tarefasDoDesfecho(c){
  let ls = []; try{ ls = desfechoPorBenef(c); }catch(e){}
  return ls.flatMap(l=>(l.tarefas||[]).length ? l.tarefas : l.prazo && l.quando ? [{titulo:`⏰ ${l.o.rot}: ${cortaFrase(semCodigo(l.txt).replace(/^gere o caso já:\s*/i, ""), 160)}`, prazo:l.quando}] : [])
    .filter((t, i, a)=>t.prazo && t.prazo >= hoje() && a.findIndex(u=>u.titulo===t.titulo)===i).sort((p, q)=>p.prazo < q.prazo ? -1 : 1);
}
function baseDesfecho(c, a){
  const pc = preCasoAberto(c) || {}, d = (a && a.detalhes) || {}, m = a ? cenMelhor(a) : null, hj = hoje();
  const linhas = desfechoPorBenef(c), imedL = linhas.find(l=>l.acao==="caso");
  const proj = linhas.filter(l=>l.acao==="lembrete" && l.data).sort((x, y)=>x.data < y.data ? -1 : 1)[0];
  const motor = !d.data_direito && !(m && m.data) ? dataDoDireito(c) : null;
  // F235 · a linha que manda a Aposentadorias futuras já diz o plano (o acerto, a diferença): a data dela vale mais que a conta crua
  const data = d.data_direito || (m && m.data) || (proj && !proj.suposto && proj.data) || motor || idadeAtingeEm(c) || (proj && proj.data) || null;
  const suposto = !!(proj && proj.suposto && data===proj.data && !d.data_direito && !(m && m.data) && !motor);
  const fonte = d.data_direito ? `Análise de Direito de ${fmt(a.data_analise)}` : m && m.data ? `melhor cenário${m.regra ? ` (${m.regra})` : ""} da análise de ${fmt(a.data_analise)}`
    : motor ? "requisitos da Análise de Direito" : suposto ? "projeção da Análise de Direito, se voltar a pagar o INSS todo mês" : data ? "quadro Idade da análise" : "";
  const especie = (d.servico||{}).nome || pc.especie || ((imedL || proj || linhas[0] || {}).o || {}).rot || "Aposentadoria futura";
  const imed = pc.natureza==="revisao" ? DESF_IMEDIATO.rev : pc.natureza==="acerto" ? DESF_IMEDIATO.acerto : imedL ? (DESF_IMEDIATO[imedL.o.o] || "o pedido cabe já") : "";
  // F235 · com um benefício ainda sem conclusão, a data futura de outro não vira a sugestão (a PcD sem a DID não manda à B42 de 2034)
  const semConclusao = linhas.some(l=>!l.acao && /^falta responder/.test(l.txt));
  const sug = imed ? "caso" : data && !(semConclusao && data > hj && !d.data_direito) ? (data <= hj ? "caso" : "lembrete") : "";
  // F220 · idade já alcançada sem data na análise: diz o que falta conferir, em vez de "sem data"
  const al = !imed && !data ? idadeAlcancadaEm(c) : null;
  let pz = null; try{ pz = prazosDoDossie(c)[0]; }catch(e){}
  const motivo = imed ? `${imed}: o ato não espera data futura` : semConclusao && data && data > hj && !d.data_direito ? `ainda sem conclusão: responda o que falta abaixo; depois compare com a data provável de ${fmt(data)}`
    : data ? (data <= hj ? `direito desde ${fmt(data)} (${fonte})` : `direito em ${fmt(data)} (${fonte})`)
    : al ? `idade exigida (${al.anos} anos) alcançada em ${fmt(al.data)}; confira ${al.car ? `a carência de ${al.car} contribuições` : "os demais requisitos"} na Análise de Direito e registre a data do direito`
    : pz ? `há prazo correndo (${pz.texto}; ${faltamTxt(pz.fatal)}): não arquive, gere o caso ou registre a decisão do advogado`
    : linhas.some(l=>!l.acao && /^falta responder/.test(l.txt)) ? "ainda sem conclusão: responda o que falta, benefício a benefício, abaixo"
    : linhas.length && linhas.every(l=>l.acao==="nada") ? "nenhum dos benefícios escolhidos cabe: arquive com o motivo, ou escolha outro benefício"
    : "sem data de direito nem ato a praticar: complete a análise";
  return {pc, a, data, fonte, especie, imed, sug, motivo, linhas, suposto};
}
// a idade exigida pela opção marcada, quando já foi alcançada: a data, os anos e a carência da opção
function idadeAlcancadaEm(c){
  const dn = dnIso(c.dn), id = idadeDe(c.dn); if(!dn || id==null) return null;
  const i = sexoDe(c)==="F" ? 1 : 0;
  const op = opcoesSel(c).find(o=>!(REQ_EXTRA[o.o]||{}).quando && IDADE_EXIG[o.o] && id >= IDADE_EXIG[o.o][i]);
  return op ? {data:somarAnos(dn, IDADE_EXIG[op.o][i]), anos:IDADE_EXIG[op.o][i], car:CAR_EXIG[op.o]||null} : null;
}
// a análise registrada atualiza o card: etapa Analisado, data do direito, aviso D-90 (aposentadorias) e lembrete D-60
async function cardDaAnalise(cliId, lid, a, b){
  const extra = {};
  if(b.data && b.data > hoje()) extra.proximo_em = avisoDocs(b.data);
  const ok = await cardGravar(lid, x=>{ x.etapa = "analisado"; x.analise_id = a.id; if(b.data){ x.data_direito = b.data; x.data_fonte = b.fonte; } x.em = hoje(); x.quem = eu.id; }, extra);
  if(ok && b.data && b.data > hoje() && !(D.apos||[]).some(x=>x.cliente_id===cliId && x.data===b.data)) await lembrarApos(cliId, "auto", b.data, b.especie, avisoApos(b.data));
  return ok;
}
// ── o quadro Desfecho (Análise de Direito e Documentos) ──────────────────
function quadroDesfecho(c){
  const pc = preCasoAberto(c); if(!pc) return "";
  const a = analisesDaVez(c)[0] || null, b = baseDesfecho(c, a), lig = pc.lembrete_id;
  const podeLemb = lig ? !!a : !!(b.data && b.data > hoje()) || b.linhas.some(l=>l.acao==="lembrete" && l.data > hoje());
  const bt = (sug, rot, on, fn, tit) => `<button type="button" class="adr-bt${b.sug===sug?" adr-primario":""}" ${on?"":"disabled"} onclick="${fn}" title="${esc(tit)}">${rot}</button>`;
  // F227 · as três saídas do pré-caso, sempre na mesma ordem: arquivar, Aposentadorias futuras, gerar o caso
  return `<section class="adx-sec desf" id="desfecho" aria-labelledby="desf-t"><div class="adm-cab"><h3 id="desf-t">Criar caso${pc.especie?` · ${esc(pc.especie)}`:""}</h3>
      <span class="meio-sub">${a ? `análise de ${fmt(a.data_analise)}` : "nenhuma análise registrada ainda"}</span></div>
    <p class="desf-base"><b>${b.sug==="caso" ? "Caso" : b.sug==="lembrete" ? "Aposentadorias futuras" : "Sem desfecho sugerido"}</b> — ${esc(b.motivo)}.</p>
    ${b.linhas.length ? `<ul class="desf-linhas">${b.linhas.map(l=>`<li class="desf-${l.acao||"falta"}"><b>${esc(l.o.rot)}:</b> ${esc(l.txt)}</li>`).join("")}</ul>` : ""}
    ${(t=>t.length ? `<p class="meio-sub desf-tarefas">Ao gerar o caso, ${t.length===1 ? "este prazo vira tarefa" : "estes prazos viram tarefas"} com data: ${t.map(x=>fmtBarra(x.prazo)).join(", ")}.</p>` : "")(tarefasDoDesfecho(c))}
    ${pc.etapas && pc.etapas.analise ? "" : `<p class="meio-sub">Registre a Análise de Direito: a espécie decidida nela desce ao pré-caso e ao caso.</p>`}
    ${/* F277 · CRIAR CASO (pedido do Paulo, 25.10.2026): o caso nasce aqui, com o início (INSS, Conselho de Recursos ou
         Judicial) e o número do protocolo ou do processo; arquivar e Aposentadorias futuras seguem como as outras saídas */""}
    ${/* F278 · o fim do atendimento em três saídas lado a lado (pedido do Paulo, 25.10.2026): Criar caso, Criar aposentadoria
         futura ou Encerrar */""}
    <div class="desf-saidas">
    <div class="desf-saida ds-caso"><h4>Criar caso</h4>
      <div class="cc-form">
      <label>Início <select id="cc-inicio" onchange="document.getElementById('cc-num-rot').textContent=ROT_NUM_INICIO[this.value]||ROT_NUM_INICIO.inss">
        ${[["","escolha…"],["inss","INSS"],["conselho","Conselho de Recursos"],["judicial","Judicial"]].map(([v,r])=>`<option value="${v}"${(pc.inicio||(pc.via==="jud"?"judicial":""))===v?" selected":""}>${r}</option>`).join("")}</select></label>
      <label><span id="cc-num-rot">${ROT_NUM_INICIO[pc.inicio||(pc.via==="jud"?"judicial":"")] || ROT_NUM_INICIO.inss}</span>
        <input id="cc-num" value="${esc(pc.numero||"")}" placeholder="ex.: 123456789 ou 5001234-56.2026.4.03.6136" autocomplete="off"></label>
      <button type="button" class="adr-bt${b.sug==="caso"?" adr-primario":""}" ${(!!pc.especie || !!(a && (a.detalhes||{}).servico) || b.linhas.some(l=>l.acao==="caso"))?"":"disabled"} onclick="criarCasoDoAtend('${c.id}')"
        title="o pré-caso vira o caso, na lista do início escolhido; a procuração e o contrato saem em Documentos">Criar caso</button>
    </div>
    </div>
    <div class="desf-saida ds-af"><h4>Criar aposentadoria futura</h4><p class="meio-sub">Guarda a data do direito no quadro Aposentadoria e avisa 3 meses antes.</p>
      ${bt("lembrete", lig ? "Atualizar a aposentadoria futura" : "Criar aposentadoria futura", podeLemb, `desfechoLembrete('${c.id}')`, lig ? "grava no card a etapa Analisado, a data do direito, o aviso 3 meses antes e o pedido de documentos 60 dias antes" : "cria o card em Aposentadorias futuras com a data do direito; o pré-caso sai do Escritório")}
    </div>
    <div class="desf-saida ds-enc"><h4>Encerrar</h4><p class="meio-sub">O pré-caso sai da lista Escritório, com o motivo anotado.</p>
      <select class="card-arquivar" aria-label="Encerrar o atendimento: o motivo" onchange="if(this.value){desfechoConfirmarArquivo('${c.id}',this.value);this.value=''}"><option value="">o motivo…${b.linhas.some(l=>l.prazo) ? " (há prazo correndo: não encerre)" : ""}</option>${/* F235 · a isenção de IR é para aposentado: "Já aposentado" não é motivo de arquivá-la */""}${APOS_MOTIVOS.filter(m=>!(m==="Já aposentado" && opcoesSel(c).some(o=>o.o==="IIR"))).map(m=>`<option>${m}</option>`).join("")}</select>
    </div>
</div></section>`;
}
async function desfechoLembrete(cliId){
  const c = D.cliPorId.get(cliId), pc = c && preCasoAberto(c); if(!pc) return;
  const a = analisesDaVez(c)[0] || null, b = baseDesfecho(c, a);
  if(pc.lembrete_id){
    if(!a) return aviso("Registre a Análise de Direito primeiro");
    if(!await cardDaAnalise(cliId, pc.lembrete_id, a, b)) return;
    await mudarPreCasoCampos(cliId, pc.id, p=>{ p.so_lembrete = true; p.desfecho = {tipo:"lembrete", em:hoje(), quem:eu.id, ref:pc.lembrete_id}; });
    aviso("Card atualizado: analisado, com a data do direito ✔", false);
  }else{
    if(!(b.data && b.data > hoje())) return aviso("Sem data futura do direito: informe a data na análise ou gere o caso");
    const corpo = {cliente_id:cliId, tipo:"aposentadoria_futura", titulo:b.especie,
      detalhes:{origem:"precaso", precaso_id:pc.id, beneficio:b.especie, anotacoes:[], plano:((a&&a.detalhes)||{}).plano||[]},
      proximo_em:avisoDocs(b.data), intervalo_meses:6, criado_por:eu.id, ativo:true,
      crm:{etapa:"analisado", data_direito:b.data, data_fonte:b.fonte, analise_id:a?a.id:null, precaso_id:pc.id, em:hoje(), quem:eu.id}};
    let l;
    try{ [l] = await api(`/rest/v1/lembretes`,{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(corpo)}); }
    catch(e){ return aviso(/\bcrm\b|42703|PGRST204/.test(String(e.message||e)) ? "Rode o crm/fase2/schema_lembretes_crm.sql no Supabase — falta a coluna 'crm' em lembretes" : "Não consegui criar o lembrete — tente de novo"); }
    if(!l) return;
    (D.lembretes = D.lembretes||[]).push(l);
    if(!(D.apos||[]).some(x=>x.cliente_id===cliId && x.data===b.data)) await lembrarApos(cliId, "auto", b.data, b.especie, avisoApos(b.data));
    await mudarPreCasoCampos(cliId, pc.id, p=>{ p.so_lembrete = true; p.lembrete_id = l.id; p.desfecho = {tipo:"lembrete", em:hoje(), quem:eu.id, ref:l.id}; });
    aviso(`Enviado a Aposentadorias futuras — direito em ${fmt(b.data)}; documentos a partir de ${fmt(avisoDocs(b.data))} ✔`, false);
  }
  _atendAberto.delete(cliId); subCad = "identificacao"; guardar("crm_subcad","identificacao"); abaAtiva = 0;
  montarSidebar(); render(); abrirFicha(cliId);   // teste 11.88, TRI-01: a lista ao lado continuava com o pré-caso
}
// F220 · a procuração e o contrato do cliente já gerados no CRM (quadro Gerados e assinados)
function docsGeradosDo(cliId){
  // F236 · o contrato assinado anexado na aba Honorários ("Contrato assinado …") também conta
  const ds = (D.anexos||[]).filter(a=>a.cliente_id===cliId && (/^(gerado|assinado)$/.test(a.origem||"") || /^Contrato assinado/.test(a.nome||"")));
  return {proc:ds.some(a=>/procura/i.test(a.nome||"")), contr:ds.some(a=>/contrato/i.test(a.nome||""))};
}
async function desfechoCaso(cliId, forcar, ciente, espOk){
  const c = D.cliPorId.get(cliId), pc = c && preCasoAberto(c); if(!pc) return;
  // F235 · nenhum benefício escolhido cabe (o seguro-defeso de quem trabalhou entre os defesos): pergunta antes de gerar o caso
  const nada = desfechoPorBenef(c).filter(l=>l.acao==="nada");
  if(!ciente && nada.length && nada.length===opcoesSel(c).length)
    return caixa(`<div class="adr-modal" role="dialog" aria-labelledby="desf-nada"><h3 id="desf-nada">Gerar o caso sem direito?</h3>
      <p class="meio-sub desf-alerta" style="margin:0">${esc(nada.map(l=>`${l.o.rot}: ${l.txt}`).join(" "))}</p>
      <div class="adr-modal-bts"><button type="button" class="adr-bt adr-primario" onclick="fecharCaixa()">Voltar</button>
      <button type="button" class="adr-bt" onclick="fecharCaixa();desfechoCaso('${cliId}',${!!forcar},true)" title="Gerar o caso assim mesmo">Gerar<span class="sr-only"> o caso assim mesmo</span></button></div></div>`);
  // o caso nasce com a procuração e o contrato: sem eles, pergunta antes
  const g = docsGeradosDo(cliId);
  if(!forcar && !(g.proc && g.contr)){
    const falta = [!g.proc && "a procuração", !g.contr && "o contrato"].filter(Boolean).join(" e ");
    return caixa(`<div class="adr-modal" role="dialog" aria-labelledby="desf-sem"><h3 id="desf-sem">Gerar o caso sem ${falta}?</h3>
      <p class="meio-sub" style="margin:0">Falta gerar ${falta} em Documentos, no primeiro quadro. O caso nasce com eles assinados.</p>
      <div class="adr-modal-bts"><button type="button" class="adr-bt adr-primario" onclick="fecharCaixa();irSubCad('documentos');setTimeout(()=>{const q=document.getElementById('dq-assinar');if(q)q.scrollIntoView({block:'start'})},60)">Gerar os documentos</button>
      <button type="button" class="adr-bt" onclick="fecharCaixa();desfechoCaso('${cliId}',true,true)" title="Gerar o caso assim mesmo">Gerar<span class="sr-only"> o caso assim mesmo</span></button></div></div>`);
  }
  const a = analisesDaVez(D.cliPorId.get(cliId)||{id:cliId})[0], sv = a && (a.detalhes||{}).servico;
  if(!pc.especie && sv) await mudarPreCasoCampos(cliId, pc.id, p=>{ p.especie = sv.nome; p.cod = sv.cod; p.sub = sv.sub && sv.sub!==sv.cod ? sv.sub : null; });
  // F235 · sem análise registrada, a espécie é a do benefício cuja linha do desfecho pede o caso
  else if(!pc.especie){ const l = desfechoPorBenef(c).find(l=>l.acao==="caso");
    // F235 · a linha do desfecho pode trazer a espécie própria (a troca 32 → 92 nasce como B92)
    if(l){ const cod = l.cod || l.o.cod; await mudarPreCasoCampos(cliId, pc.id, p=>{ p.especie = (ESPECIES.find(e=>e[0]===cod)||[])[1] || l.o.rot; p.cod = cod; p.sub = !l.cod && l.o.sub && l.o.sub!==l.o.cod ? l.o.sub : null; }); } }
  // F220 · incapacidade pede a via; a mesa onde ela se escolhia não aparece na tela de atendimento
  const pcA = preCasoAberto(c) || pc;
  if(/incapacidade|auxilio doenca|invalidez/.test(dsa(pcA.especie||"")) && !pcA.via)
    return caixa(`<div class="adr-modal" role="dialog" aria-labelledby="desf-via"><h3 id="desf-via">Por qual via segue o caso?</h3>
      <p class="meio-sub" style="margin:0">Benefício por incapacidade: o caso nasce na lista da via escolhida.</p>
      <div class="adr-modal-bts"><button type="button" class="adr-bt" onclick="fecharCaixa();viaDoDesfecho('${cliId}','jud')">Judicial</button>
        <button type="button" class="adr-bt adr-primario" onclick="fecharCaixa();viaDoDesfecho('${cliId}','adm')">Administrativa (INSS)</button></div></div>`);
  // F236 · a espécie do pré-caso diverge da análise registrada: pergunta qual vale antes de gerar (antes valia a do pré-caso, calada)
  const pcB = preCasoAberto(c) || pc, oA = sv && opcaoDe(sv.sub || sv.cod || sv.nome), oP = opcaoDe(pcB.sub || pcB.cod || pcB.especie);
  const codA = sv && (sv.nome || sv.cod), codP = pcB.especie || pcB.cod;
  if(!espOk && oA && oP && oA.o!==oP.o)
    return caixa(`<div class="adr-modal" role="dialog" aria-labelledby="desf-esp"><h3 id="desf-esp">Qual espécie vale para o caso?</h3>
      <p class="meio-sub" style="margin:0">O pré-caso diz <b>${esc(pcB.especie||codP)}</b>, e a análise de ${fmtBarra(a.data_analise)} diz <b>${esc(sv.nome||codA)}</b>.</p>
      <div class="adr-modal-bts"><button type="button" class="adr-bt" onclick="fecharCaixa();desfechoEspecie('${cliId}',false)">${esc(pcB.especie||codP)} (o pré-caso)</button>
        <button type="button" class="adr-bt adr-primario" onclick="fecharCaixa();desfechoEspecie('${cliId}',true)">${esc(sv.nome||codA)} (a análise)</button></div></div>`);
  // F236 · outro benefício também pede caso: o caso nasce com este, e o aviso diz qual fica para outro pré-caso
  const opP = opcaoDe(pcB.sub || pcB.cod || pcB.especie), maisUm = desfechoPorBenef(c).filter(l=>l.acao==="caso" && l.o && l.o.o!==(opP||{}).o);
  const r = pc.lembrete_id ? await gerarCasoDoPreECard(cliId, pc.id, pc.lembrete_id) : await gerarCasoDoPre(cliId, pc.id);
  if(maisUm.length) aviso(`Caso gerado. ${maisUm.map(l=>l.o.rot).join(" e ")} também ${maisUm.length>1?"pedem":"pede"} caso: abra outro pré-caso (aba Pré-caso › Novo).`, false);
  return r;
}
// F277 · o botão Criar caso: o início e o número descem ao pré-caso (o início decide a lista e a via) e o caso nasce
const INICIO_FASE = {inss:"inss", conselho:"conselho", judicial:"judicial"};
// teste 11.88, TRI-05: o Conselho pede o NUP do recurso; o número é opcional (TRI-04)
const ROT_NUM_INICIO = {inss:"Número do protocolo (opcional)", conselho:"NUP do recurso (opcional)", judicial:"Número do processo (vazio: ação a ajuizar)"};
async function criarCasoDoAtend(cliId){
  const c = D.cliPorId.get(cliId), pc = c && preCasoAberto(c); if(!pc) return;
  const ini = (document.getElementById("cc-inicio")||{}).value||"", num = ((document.getElementById("cc-num")||{}).value||"").trim();
  if(!INICIO_FASE[ini]) return aviso("Escolha o início do caso: INSS, Conselho de Recursos ou Judicial");
  if(!await mudarPreCasoCampos(cliId, pc.id, p=>{ p.inicio = ini; p.numero = num; p.via = ini==="judicial" ? "jud" : "adm"; })) return;
  _pcNovo.delete(pc.id);
  return desfechoCaso(cliId);
}
async function desfechoEspecie(cliId, daAnalise){
  const c = D.cliPorId.get(cliId), pc = c && preCasoAberto(c); if(!pc) return;
  const a = analisesDaVez(c)[0], sv = a && (a.detalhes||{}).servico;
  if(daAnalise && sv && !await mudarPreCasoCampos(cliId, pc.id, p=>{ p.especie = sv.nome; p.cod = sv.cod; p.sub = sv.sub && sv.sub!==sv.cod ? sv.sub : null; })) return;
  return desfechoCaso(cliId, true, true, true);
}
async function viaDoDesfecho(cliId, via){
  const c = D.cliPorId.get(cliId), pc = c && preCasoAberto(c); if(!pc) return;
  if(!await mudarPreCasoCampos(cliId, pc.id, p=>{ p.via = via; })) return;
  return desfechoCaso(cliId, true, true);
}
// F235 · arquivar pergunta antes (escolher o motivo arquivava na hora) e avisa o prazo que ainda corre
function desfechoConfirmarArquivo(cliId, motivo){
  const c = D.cliPorId.get(cliId); if(!c) return;
  let pz = null; try{ pz = prazosDoDossie(c)[0]; }catch(e){}
  const lp = desfechoPorBenef(c).find(l=>l.prazo);
  const alerta = pz ? `Há prazo correndo: ${pz.texto} (${faltamTxt(pz.fatal)}).` : lp ? `Há prazo correndo: ${lp.o.rot}, ${lp.txt.replace(/^gere o caso já:\s*/, "")}.` : "";
  caixa(`<div class="adr-modal" role="dialog" aria-labelledby="desf-arq"><h3 id="desf-arq">Encerrar este atendimento: ${esc(motivo)}?</h3>
    ${alerta ? `<p class="meio-sub desf-alerta" style="margin:0">${esc(alerta)}</p>` : `<p class="meio-sub" style="margin:0">O pré-caso sai da mesa e a anotação registra o motivo.</p>`}
    <div class="adr-modal-bts"><button type="button" class="adr-bt adr-primario" onclick="fecharCaixa()">Voltar</button>
      <button type="button" class="adr-bt" onclick="fecharCaixa();desfechoArquivar('${cliId}','${esc(motivo).replace(/'/g, "&#39;")}')">Encerrar</button></div></div>`);
}
// arquivar: o pré-caso sai da mesa para campos.pc_arquivados, com o motivo, e a anotação registra; o card ligado arquiva junto
async function desfechoArquivar(cliId, motivo){
  const c = D.cliPorId.get(cliId), pc = c && preCasoAberto(c); if(!pc || !motivo) return;
  const arq = {...pc, desfecho:{tipo:"arquivado", motivo, em:hoje(), quem:eu.id}};
  c.campos = {...(c.campos||{}), pc_arquivados:[...((c.campos||{}).pc_arquivados||[]), arq],
    atendimento:[...((c.campos||{}).atendimento||[]), {em:new Date().toISOString(), quem:(eu.nome||"").split(" ")[0], autor_id:eu.id, precaso_id:pc.id,
      texto:`Atendimento arquivado: ${motivo}${pc.especie ? ` (${pc.especie})` : ""}.`}]};
  if(!await gravarPrecasos(cliId, precasosDe(c).filter(p=>p.id!==pc.id))) return;
  _atendAberto.delete(cliId); subCad = "identificacao"; guardar("crm_subcad","identificacao");
  if(pc.lembrete_id) return arquivarCard(pc.lembrete_id, motivo);
  aviso(motivo==="Faleceu" ? "Arquivado: faleceu — avalie a pensão por morte aos dependentes" : `Atendimento arquivado: ${motivo}`, motivo==="Faleceu");
  montarSidebar(); render(); abrirFicha(cliId);   // teste 11.88, TRI-01: a lista ao lado continuava com o pré-caso
}
// ── Documentos em seis quadros ───────────────────────────────────────────
// o benefício marcado na análise → o nome do catálogo documentos_beneficio (espelho do site interno)
const DOC_CAT = {idade:"Apos. por Idade", transicao:"Apos. Tempo de Contribuição", professor:"Apos. do Professor", pcd:"Apos. Tempo — Pessoa com Deficiência", pcd_idade:"Apos. Idade — Pessoa com Deficiência",
  b46:"Apos. Especial", conv:"Apos. Especial", idade_rural:"Rural", hibrida:"Apos. por Idade Híbrida", def:"BPC/LOAS", idoso:"BPC/LOAS — Idoso",
  morte:"Pensão por Morte", reclusao:"Auxílio-Reclusão", b31:"Aux. Incapacidade Temporária", b32:"Apos. por Incapacidade Permanente",
  acid:"Aux. Incapacidade Temporária Acidentária (B91)", b94:"Aux. Acidente", b36:"Aux. Acidente", urb:"Salário-Maternidade", rur:"Salário-Maternidade",
  rev:"Revisão", acerto:"Acerto de CNIS", B93:"Pensão por Morte"};   // F235 · a B93 usa a lista da pensão, com o acidente
// Catálogo × dossiê (pesquisa de 12.10.2026). classe: A traz · A? pode trazer · B cadastro · C cliente · C* escritório · N nota.
// A primeira regra que casa vence; rx roda sobre dsa(linha antes do " — "); tem sobre anexos.nome do dossiê; neg sobre
// clientes.dossie.<portal>.inexistentes. Linha sem regra fica com o cliente. As regexes "tem" pressupõem o nome que
// a extensão grava hoje ("<fonte> · <arquivo>", sem acento) e falham se o rótulo mudar.
const DOC_FONTE = [
  // F235 · o CadÚnico da família vem no dossiê: "com CPF de todos" não é documento de terceiro
  {rx:/^cadunico atualizado/, classe:"A?", tem:c=>!!familiaCadunico(c), quem:"o dossiê traz a ficha do CadÚnico quando o cliente tem o gov.br; sem ela, o CRAS"},
  // F235 · o CadÚnico "com CPF de todos" está na ficha da família, não é papel de terceiro
  {rx:/^(?!.*cadunico).*(?:do falecido|do preso|pelo preso|com o preso|de cada dependente|do dependente|de cada filho|de todos|dos moradores|de cada morador|dos parentes|de quem trabalha|anteriores? a prisao|antes da prisao|outro idoso|pcd da familia|do cuidador|\bdecore\b)/, classe:"C", quem:"de terceiro: o dossiê é só do CPF do cliente"},
  {rx:/^rg(,| e |\/| )|^cpf$|^rg$/, classe:"B", tem:c=>!!(civilDe(c).rg && c.cpf)},
  // F235 · a revisão pelo tempo especial (PPP no dossiê) não pede os papéis das teses que não servem (teto, IRSM, URV, vida toda, concomitantes)
  {rx:/glosa pelo teto|irsm|conversao para urv|anteriores a julho de 1994|anteriores a 03\/1994|vinculos simultaneos|historico de remuneracoes no pa|microficha/, classe:"N",
   se:c=>opcoesSel(c).some(o=>o.o==="rev") && (fontesDoDossie(c.id).ppps||[]).length > 0},
  // F235 · a certidão de casamento não se pede de quem viveu em união estável, sem casar
  {rx:/^certidao de casamento$/, classe:"N", se:c=>/sem casar|n[ãa]o (eram|era|foram) casad|uni[ãa]o est[áa]vel/i.test(relatoDe(c))},
  // F236 · "o endereço está na ficha" só quando está
  {rx:/comprovante de residencia/, classe:"B?", tem:c=>(D.anexos||[]).some(a=>a.cliente_id===c.id && /declara[çc][ãa]o de resid[êe]ncia/i.test(a.nome||"")),
   cobre:()=>"a Declaração de Residência gerada no CRM", quem:c=>`${valCli(c, "endereco") ? "o endereço está na ficha e o INSS o aceita" : "o INSS aceita o endereço"} por declaração (art. 32, § 2º, III, da IN 128); a conta em nome do cliente serve à ação judicial`},
  {rx:/biometria/, classe:"C", quem:"o cliente confere no TRE"},
  {rx:/^se ainda gestante|declaracao (da|de) empresa|declaracao medica|^laudo do medico do trabalho|carta da empresa/, classe:"C"},
  {rx:/holerite|contracheque|extrato de pagamento de cooperativa|recibos de pagamento/, classe:"C", nota:"o CNIS completo traz as remunerações desde 07/1994"},
  {rx:/anotacao na ctps/, classe:"C"},
  {rx:/sorologia|laboratori|goniometria|\bbera\b|acuidade visual|snellen|receit|prescricao|atestado|detran|apae|caps\b|escola|\baee\b|professor|educacional|intervencao precoce|pedagog|historico de quedas|insalubridade|periculosidade|ltcat|ppra|\bpgr\b|pcmso|pcmat|laudos ambientais|sb-40|dss-8030|dirben|dises|\bepi\b|passe livre|cadeira de rodas|fraldas|medicamentos|plano de saude|despesas|avaliacao (do rh|de habilidades)|cota pcd|carteira de vacinacao|cartao da gestante|caderneta/, classe:"C"},
  {rx:/^laudo medico|^laudo do medico (que acompanha|assistente)|laudo descrevendo|laudo psiquiatrico atualizado/, classe:"C", quem:"médico assistente, no modelo do escritório"},
  {rx:/auxilio-doenca ativo|numero do beneficio|^salario-maternidade rural/, classe:"A?", tem:/^(Cartas de concessao|Extrato do beneficio|Declaracao · Declaracao de beneficiario)/},
  {rx:/microficha/, classe:"C*"},
  {rx:/(^|extrato (do )?|ou extrato )cnis\b/, classe:"A", tem:/^CNIS · /},
  {rx:/carta de concessao/, classe:"A?", tem:/^Cartas de concessao · /, neg:/^Cartas de concessao/},
  {rx:/laudos? (de afastamento|do inss)/, classe:"A?", tem:/^Laudos · /, neg:/^Laudos/},
  {rx:/hiscre|historico de credito/, classe:"A?", tem:/^Extrato de pagamento · /, neg:/^Extrato de pagamento/, nota:"só 12 meses"},
  {rx:/documentos administrativos do pa|historico completo do afastamento|encaminhamento da pmf|programa de reabilitacao|notificacao de cessacao|termo de exigencia|carta de justificativa|comparecimento ao programa/, classe:"A?", tem:/^(Processos administrativos|Extrato do beneficio) · /, neg:/^Extrato do beneficio/},
  {rx:/processo administrativo de familiar/, classe:"C", quem:"de terceiro"},
  // F235 · a carteira do município ou do estado não é o certificado do INSS: o "não possui deficiência" do Meu INSS não fala dela
  {rx:/carteira de identificacao de pessoa com deficiencia/, classe:"C"},
  {rx:/certificado da pessoa com deficiencia/, classe:"A?", tem:/^Declaracao · Certificado da pessoa com deficiencia/, neg:/Certificado da pessoa com deficiencia/, negTxt:CERT_PCD_NAO},
  {rx:/\bcat\b|comunicacao de acidente/, classe:"A?", tem:/^CAT · /, neg:/^CAT/},
  // F235 · o "PPP eletrônico" é o arquivo do Meu INSS, e não o PPP de papel; o PPP do dossiê diz o período que cobre e o que falta
  {rx:/^ppp eletronico/, classe:"A?", tem:/^PPP · (?!PPP de papel)/i, neg:/^PPP/},
  {rx:/\bppp\b|perfil profissiogr|historico de exposicao (ao ruido|ocupacional)/, classe:"A?", tem:/^PPP · /, neg:/^PPP/,
   cobre:c=>{ const fd = fontesDoDossie(c.id), ls = lacunasPpp(cnisDe(c), fd.ppps);
     const cob = fd.ppps.map(p=>`${tituloOrgao(p.empresa||"")}, ${ivsTxt(fundirIvs((p.riscos||[]).map(r=>[isoBr(r.ini||""), isoBr(r.fim||"")]).filter(([a, b])=>a && b)))}`).join("; ");
     const dias = ivs => ivs.reduce((t, [a, b])=>t + durDias(durCal(a, b)), 0);
     return cob ? `cobre ${cob}${ls.map(l=>`; falta o PPP de ${ivsTxt(l.falta)} (${l.onde}): o do dossiê cobre ${tempoFmt(dias(l.cob))} dos ${tempoFmt(dias([[l.de, l.ate]]))} do vínculo`).join("")}` : ""; }},
  {rx:/certidao de tempo de contribuicao|\bctc\b/, classe:"C*", tem:/^CTC · /, neg:/^CTC/, nota:"a do RPPS vem do órgão; o dossiê traz só a que o INSS emitiu"},
  {rx:/\bdtc\b|declaracao de tempo de contribuicao|justificacao administrativa/, classe:"C*"},
  {rx:/carteira de trabalho|\bctps\b/, classe:"A?", tem:/^CTPS RAIS CAGED · CTPS /, neg:/^CTPS/, nota:"a física continua para vínculo antigo, jornada e rural"},
  {rx:/\brais\b/, classe:"A", tem:/^CTPS RAIS CAGED · Extrato RAIS/, neg:/^Extrato RAIS/},
  {rx:/\bcaged\b/, classe:"A", tem:/^CTPS RAIS CAGED · Extrato CAGED/, neg:/^Extrato CAGED/},
  {rx:/seguro-desemprego/, classe:"A", tem:/^CTPS RAIS CAGED · Seguro-desemprego/, neg:/^Seguro-desemprego/},
  {rx:/defeso/, classe:"A?", tem:/^CTPS RAIS CAGED · Seguro-desemprego/, neg:/^Seguro-desemprego/},
  {rx:/cartao de pis|pis\/pasep/, classe:"C"},
  // F235 · a consulta da Redesim prova o CNPJ e a situação, mas não é o contrato social: este o cliente traz
  {rx:/contrato social|alteracao contratual/, classe:"C", quem:"a Redesim mostra o CNPJ e a situação; o contrato social em si o cliente traz"},
  {rx:/contrato social|alteracao contratual|ccmei|certificado de microempreendedor|atividade de socio|\bcnpj\b/, classe:"A?", tem:/^CNPJ · /, neg:/^CNPJ/, nota:"prova o vínculo e a situação; o contrato social em si o cliente traz"},
  {rx:/nao aparece(m)? no cnis|fora do cnis/, classe:"C", quem:"só o cliente tem: é o que o CNIS não mostra"},
  {rx:/comercializacao/, classe:"C", quem:"o CNIS só mostra a contribuição sobre a venda quando o comprador a informa; sem ela, as notas de produtor provam a venda"},
  // F235 · guia e DAS só para quem o CNIS mostra recolhendo como contribuinte individual, facultativo ou MEI (sem o CNIS lido, e na regularização e no acerto, ficam)
  {rx:/\bgps\b|carne|darf|das do mei|contribuicoes como autonomo/, classe:"A?", tem:/^CNIS · CNIS completo/, so:c=>((cnisDe(c)||{}).vinculos||[]).some(v=>/Individual|Facultativ/i.test(v.tipo||"")), nota:"pedir a guia só da competência que falta no CNIS", se:(c, cat)=>{ if(/regulariza|acerto/i.test((cat||{}).beneficio||"")) return true; const g = cnisDe(c); return !g || (g.vinculos||[]).some(v=>/individual|facultativ|\bMEI\b/i.test(v.tipo||"") || (v.indicadores||[]).some(i=>/LC123|IREC-MEI/.test(String(i)))); }},
  {rx:/ultimas contribuicoes|comprovantes? (das ultimas|de recolhimento|de contribuicao|original)/, classe:"A?", tem:/^CNIS · CNIS completo/, so:c=>((cnisDe(c)||{}).vinculos||[]).some(v=>v.tipo!=="Benefício" && !/Segurado Especial/i.test(v.tipo||"")), nota:"pedir a guia só da competência que falta no CNIS", se:(c, cat)=>{ if(/regulariza|acerto/i.test((cat||{}).beneficio||"")) return true; const g = cnisDe(c); return !g || (g.vinculos||[]).some(v=>/individual|facultativ|\bMEI\b/i.test(v.tipo||"") || (v.indicadores||[]).some(i=>/LC123|IREC-MEI/.test(String(i)))); }},
  {rx:/ressonancia|\brm\b/, classe:"A?", tem:/^HC Ribeirao\/Exames · .*RESSON/i, neg:/exame de imagem ainda sem laudo|em processamento no HC/},
  {rx:/radiografia|raio[ -]?x/, classe:"A?", tem:/^HC Ribeirao\/Exames · .*(RADIOGRAF|\bRX\b|RAIO)/i},
  {rx:/tomografia|\boct\b/, classe:"A?", tem:/^HC Ribeirao\/Exames · .*TOMOGRAF/i},
  {rx:/eletroneuromiografia|\benmg\b/, classe:"A?", tem:/^HC Ribeirao\/Exames · .*NEUROMIOGRAF/i},
  // F235 · cada exame só pelo dele: a audiometria não é imitanciometria nem exame de imagem
  {rx:/imitanciometria/, classe:"A?", tem:/^HC Ribeirao\/Exames · .*IMITANCIOMETR/i},
  {rx:/audiometria/, classe:"A?", tem:/^HC Ribeirao\/Exames · .*AUDIOMETR/i},
  {rx:/campimetria|retinografia|angio/, classe:"A?", tem:/^HC Ribeirao\/Exames · .*(CAMPIMETR|RETINOGRAF|ANGIO)/i},
  {rx:/ultrassom/, classe:"A?", tem:/^HC Ribeirao\/Exames · .*ULTRA/i},
  // F235 · exame de imagem só pelos de imagem (a audiometria não é)
  {rx:/exames? de imagem/, classe:"A?", tem:/^HC Ribeirao\/Exames · .*(RESSON|TOMOGRAF|RADIOGRAF|RAIO|ULTRASS|\bRX\b|ECOGRAF|MAMOGRAF|DENSITOM)/i},
  {rx:/exames? (que|de apoio|comprobat|complement)/, classe:"A?", tem:/^HC Ribeirao\/Exames · /},
  // F235 · o que fala em internação só se dá por tido com a internação no dossiê (o relatório não é histórico de internações)
  {rx:/internac/, classe:"A?", tem:/^HC Ribeirao\/Internacoes · /},
  {rx:/prontuario|historico (do tratamento|de tratamentos)|atendimentos de emergencia/, classe:"A?", tem:/^HC Ribeirao\/(Internacoes|Relatorios) · /},
  // F235 · o relatório de bloqueio ou de infiltração só vale se o relatório do dossiê fala disso (o da cirurgia não é)
  {rx:/bloqueio|infiltrac/, classe:"A?", tem:c=>docsDoDossie(c.id).some(a=>/^HC Ribeirao\/Relatorios · /.test(a.nome||"") && /bloqueio|infiltra/i.test(a.texto||""))},
  // F235 · o relatório do médico que o cliente trouxe (em qualquer pasta) também é "já temos", pela especialidade dele
  {rx:/relatorio|laudo|avaliacao (neuropsicologica|multidisciplinar|de fisiatra)/, classe:"A?", tem:/^HC Ribeirao\/Relatorios · |^(?!Laudos)[^·]+ · .*relat[óo]rio m[ée]dic/i},
  {rx:/hisben|historico de pagamentos|conbas|memorial de calculo|calculo independente|historico de remuneracoes no pa|salarios-de-contribuicao anteriores|conversao para urv|gfip|esocial/, classe:"C*"},
  {rx:/^(atencao|ate 13\/10|de 14\/10|a partir de|coluna|joelho|ombro|auditiva|visual|intelectual\/mental\/autismo|conjuge|companheiro\(a\)|filhos|filho inv|pais \(classe|irmao inv|ecs 20|revisao pelo art|auxilio-inclusao|comprovacao de dependencia economica|demonstracao de que|comparativo entre|confirmacao de que|identificacao do periodo|descricao detalhada|qualquer documento|documentos que comprovem o requisito|justificativa de impossibilidade|documentos de forca maior|historico de (atividades repetitivas|tentativas|comunicacoes))|informe seu advogado|^se (a empresa|alguem)/, classe:"N"},
  {rx:/lavrador|rural|\bdap\b|\bcaf\b|bloco de notas|\bccir\b|\bitr\b|sindicato|pronaf|agro amigo|arrendamento|parceria|comodato|producao|agricol|pesca|autodeclaracao|cooperativa|insumos|implementos|area plantada|comercializacao|extensao rural|programas governamentais|federativa|associacoes de produtores|aforamento|incra/, classe:"C", quem:"prova material rural (art. 106 da Lei 8.213/91; art. 116 da IN 128)"},
  // F235 · a ficha do dossiê só vale como "já temos" dentro dos 24 meses da última atualização
  {rx:/^(?!.*(comprovante|visita)).*(cadunico|folha resumo|cras\b|nis familiar|bolsa familia)/, classe:"A?", tem:c=>{ const fz = familiaCadunico(c), at = fz && (isoBr(fz.atualizada_em) || String(fz.atualizada_em||"").slice(0,10));
    return !!fz && !(at && somarMeses(at, 24) < hoje()); }, quem:"o dossiê traz a ficha do CadÚnico quando o cliente tem o gov.br; sem ela, o CRAS"},
];
// F235 · o perfil do cliente pelo CNIS, pelo dossiê e pelo relato: o que a lista de documentos dele precisa ter
function perfilDocs(c){
  const g = cnisDe(c), vs = ((g||{}).vinculos||[]).filter(v=>v.tipo!=="Benefício"), fd = fontesDoDossie(c.id), rel = relatoDe(c);
  const tc = [linhaClinica(c.id).map(i=>`${i.titulo} ${i.resumo} ${(i.cids||[]).join(" ")}`).join(" "), rel].join(" ");
  const aud = /\bH9[0-3]|auditiv|audiometr|\bsurd|otorrino/i.test(tc), vis = /\bH(1[6-9]|[2-5]\d)|\bvis[ãa]o\b|oftalm|campimetr|cegueira|\bcego\b|retin/i.test(tc);
  const fis = /amputa|pr[óo]tese|hemipar|parapleg|tetrapleg|\bI69|\bAVC\b|cadeirante|muleta|coluna|joelho|ombro/i.test(tc), men = /\bF[0-9]\d|intelectual|autis/i.test(tc);
  const tipos = [aud && "audição", vis && "visão", fis && "física", men && "mental"].filter(Boolean);
  return {lido: !!g, texto: tc, tipo: tipos.length===1 ? tipos[0] : null, pcd: sinalPcd(c),
    ci: vs.some(v=>/individual|facultativ|\bMEI\b/i.test(v.tipo||"") || (v.indicadores||[]).some(i=>/LC123|IREC-MEI/.test(String(i)))) || (fd.cnpjs||[]).length > 0,
    rural: papeisRurais(c.id).length > 0 || vs.some(v=>/segurado especial|rural/i.test(v.tipo||"")) || /\bro[çc]a\b|lavoura|\bs[íi]tio\b|pescador|trabalho rural|lavrador/i.test(rel),
    especial: (fd.ppps||[]).length > 0 || vs.some(v=>(v.indicadores||[]).some(i=>/^IEAN/.test(String(i)))) || opcoesSel(c).some(o=>/^(b46|conv)$/.test(o.o)) || /insalubr|barulho|\bru[íi]do\b|especial|enfermag|qu[íi]mic/i.test(rel),
    rpps: vs.some(v=>/RPPS|regime pr[óo]prio|servidor/i.test(`${v.tipo} ${v.origem}`) || (v.indicadores||[]).some(i=>/^PRPPS/.test(String(i)))) || /servidor p[úu]blico|concursad|prefeitura/i.test(rel),
    jornada: /hora[s]? extra|jornada|12x36|plant[ãa]o/i.test(rel)};
}
// a seção que fica fora: o autônomo, a roça, o especial, a deficiência, o servidor e a jornada só com o sinal deles (com o
// CNIS lido); na PcD, o tipo de deficiência e a região do corpo
function secaoForaDoPerfil(sec, p, ben){
  if(!sec) return false;
  if(/jornada/.test(sec)) return !p.jornada;
  if(/autonomo|\bmei\b/.test(sec)) return p.lido && !p.ci;
  if(/periodos rurais/.test(sec)) return p.lido && !p.rural;
  if(/atividade especial/.test(sec)) return p.lido && !p.especial;
  if(/periodos com deficiencia/.test(sec)) return !p.pcd;
  if(/servidor publico/.test(sec)) return p.lido && !p.rpps;
  if(!/pessoa com deficiencia/.test(dsa(ben||"")) || !p.tipo) return false;
  if(/deficiencia auditiva/.test(sec)) return p.tipo!=="audição";
  if(/deficiencia visual/.test(sec)) return p.tipo!=="visão";
  if(/intelectual|mental|autismo/.test(sec)) return p.tipo!=="mental";
  if(/coluna/.test(sec)) return p.tipo!=="física" || !/coluna|lombar|cervical|h[ée]rnia|espondil/i.test(p.texto);
  if(/joelho/.test(sec)) return p.tipo!=="física" || !/joelho|menisco/i.test(p.texto);
  if(/ombro/.test(sec)) return p.tipo!=="física" || !/ombro|manguito/i.test(p.texto);
  if(/outra deficiencia fisica/.test(sec)) return p.tipo!=="física";
  return false;
}
// seção do catálogo que é de terceiro (pensão, reclusão, BPC): tudo abaixo dela é do cliente, salvo "requerente"
const SEC_TERCEIRO = /preso|falec|dependentes|moram na casa|composicao da familia|renda da familia|renda do preso|filhos e equiparados|prisao|beneficios excluidos/;
// F235 · as regiões e as especialidades que o catálogo da incapacidade mistura: o exame de outra região não se pede, e
// o documento só vale pelo item da mesma especialidade
const REGIAO_DOC = [["coluna", /coluna|lombar|cervical|dorsal/], ["ombro", /ombro/], ["membro inferior", /joelho|quadril|tornozelo|\bpe\b|fem[uo]r|tibia/],
  ["mão, punho e cotovelo", /punho|\bmao\b|maos|cotovelo|dedo/], ["visão", /oftalm|acuidade|snellen|campimetr|retin/], ["audição", /audiometr|\bbera\b|otorrino|auditiv|imitanciometr/],
  ["psiquiatria", /psiqui|psicolog|neuropsicol/]];
// F235 · também o tipo do relatório: o relatório médico comum não é o de bloqueios, o funcional, o do terapeuta nem o do aparelho auditivo
// F235 · o terapeuta, o procedimento (bloqueio, infiltração) e "outros profissionais" também pedem o documento deles: o relatório
// do médico não vale por eles
const ESPEC_DOC = /oftalm|otorrino|psiqui|psicolog|fisioterap|cirurg|fonoaud|neurolog|ortoped|cardiol|oncolog|reumat|terapia ocupacional|assistente social|multiprofission|bloqueio|infiltra|rizotomia|funcional|terapeuta|mobilidade|aparelho auditivo|outros profissionais/;
// F235 · o papel que o cliente trouxe e já está no dossiê: casa pelo nome do arquivo e pelo começo do texto. A certidão
// pedida "com profissão de lavrador" só conta se a do dossiê fala da roça
const DOC_DOSSIE = [
  {rx:/escritura.*uniao|uniao.*escritura/, doc:/escritura[\s\S]{0,300}uniao/}, {rx:/escritura/, doc:/escritura/}, {rx:/titulo de propriedade/, doc:/titulo de propriedade|matricula do imovel/},
  {rx:/\bccir\b/, doc:/\bccir\b/}, {rx:/\bitr\b/, doc:/\bd?itr\b/}, {rx:/\bdap\b|\bcaf\b/, doc:/\bdap\b|\bcaf\b/},
  {rx:/bloco de notas|notas fiscais de entrada/, doc:/notas? (fiscais )?de produtor|nota fiscal de produtor/},
  {rx:/sindicato/, doc:/sindicato/}, {rx:/contrato de arrendamento|parceria|comodato/, doc:/arrendamento|parceria agricola|comodato/},
  // F235 · a pensão, a reclusão, a B93 e o BPC: os papéis que o cliente trouxe (a averbação antes da certidão de casamento)
  {rx:/averbacao do divorcio/, doc:/averbac[\s\S]{0,80}divorci|divorci[\s\S]{0,80}averbad/},
  {rx:/certidao judicial/, doc:/poder judiciario[\s\S]{0,400}recolhid|certidao de recolhimento prisional/},
  {rx:/certidao de carcere|declaracao de reclusao|atestado de (permanencia|carcere)/, doc:/recolhimento prisional|deu entrada nesta unidade|permanece recolhid|atestado de carcere/},
  {rx:/^conjuge$/, doc:/certidao de casamento/},
  {rx:/negativa (por escrito )?do sus/, doc:/(negativa|nao (oferece|fornece))[\s\S]{0,300}(sus|saude|farmac|medicament|terapia)|(secretaria|farmac)[\s\S]{0,300}nao (oferece|fornece)/},
  {rx:/tratamento (e )?continuo/, doc:/tratamento continuo/},
  {rx:/^cat\b|comunicacao de acidente/, doc:/comunicacao de acidente de trabalho/},
  {rx:/boletim de ocorrencia/, doc:/boletim de ocorrencia/},
  {rx:/laudo do iml|exame necroscopico/, doc:/instituto medico legal|\biml\b|necroscop/},
  {rx:/certidao de casamento(?! religioso)/, doc:/certidao de casamento/, rural:true}, {rx:/certidao de nascimento/, doc:/certidao de nascimento/, rural:true},
  {rx:/certidao de obito/, doc:/certidao de obito/},
];
// F235 · os papéis do pescador, o cartão da gestante, o título de eleitor, o certificado militar e o histórico escolar que o cliente trouxe
DOC_DOSSIE.push({rx:/\brgp\b|registro geral da atividade pesqueira/, doc:/registro geral da atividade pesqueira/}, {rx:/\breap\b|relatorio anual da atividade pesqueira/, doc:/relatorio anual da atividade pesqueira/},
  {rx:/venda do pescado/, doc:/venda do pescado/}, {rx:/documento com biometria/, doc:/carteira de identidade nacional[\s\S]{0,200}biometria/},
  {rx:/cartao da gestante/, doc:/caderneta da gestante|cartao da gestante/}, {rx:/titulo de eleitor/, doc:/titulo eleitoral|titulo de eleitor/},
  {rx:/reservista|dispensa de incorporacao|alistamento militar/, doc:/dispensa de incorporacao|reservista|alistamento militar/},
  {rx:/historico (ou ficha )?(da )?escola|ficha da escola|boletim escolar|comprovante de matricula/, doc:/historico escolar|escola (estadual )?rural/},
  {rx:/inscricao como autonoma|\bccmei\b|microempreendedor/, doc:/certificado da condicao de microempreendedor|\bccmei\b/});
const _txtDoc = a => dsa(`${a.nome} ${String(a.texto||"").slice(0, 1200)}`);
// F235 · o profissional que assina, para cada especialidade do catálogo
const PROF_DOC = {fisioterap:/fisioterapeut/, psiqui:/psiquiatr/, psicolog:/psicolog[oa]\b/, fonoaud:/fonoaudiolog[oa]\b/, oftalm:/oftalmologist/, otorrino:/otorrinolaringologist|otorrino\b/,
  neurolog:/neurologist/, ortoped:/ortopedist/, cardiol:/cardiologist/, oncolog:/oncologist/, reumat:/reumatologist/,
  cirurg:/relatorio cirurgico|descricao cirurgica|ato cirurgico|boletim cirurgico/};
// F235 · os papéis trazidos que respondem itens dos catálogos: o PPP que estava no pedido, a carteira física e a rescisão, o início de
// prova da justificação, os papéis da união (mesmo domicílio, ficha de tratamento, vida em comum) e o pedido negado
DOC_DOSSIE.push(
  {rx:/tempo especial|\bppp\b|perfil profissiogr/, doc:/perfil profissiografico previdenciario/},
  {rx:/carteira de trabalho|\bctps\b/, doc:/carteira de trabalho e previdencia social \(fotos|ctps fisica/},
  {rx:/termos? de rescisao|\btrct\b/, doc:/termo de rescisao/},
  {rx:/inicio de prova material/, doc:/holerite|recibo de pagamento|aviso previo|contrato de (locacao|aluguel)|ficha de (internacao|cadastro)/},
  {rx:/mesmo domicilio/, doc:/contrato de (locacao|aluguel)|locatarios|moradores:/},
  {rx:/ficha de tratamento/, doc:/ficha de internacao|responsavel pelo paciente|ficha de cadastro domiciliar/},
  {rx:/vida em comum/, doc:/locatarios|moradores:|responsavel pelo paciente/},
  {rx:/comunicacao de decisao/, doc:/comunicacao de decisao/},
  {rx:/copia do processo do pedido/, doc:/protocolo de requerimento/});
function docsContraDossie(c, cat){
  // F235 · o papel do sogro ou de quem não é do grupo familiar não conta como "já temos" a prova da roça
  const docs = docsDoDossie(c.id), dz = c.dossie || {}, deTerceiro = new Set(papeisDaRoca(c).filter(p=>/^(sogro|outro)$/.test(p.titular)).map(p=>p.a.id));
  const neg = Object.values(dz).flatMap(p=>(p && p.inexistentes) || []);
  const out = {temos:[], cliente:[], escritorio:[], fora:0};
  let area = null; try{ const ac = areaClinica(linhaClinica(c.id)); area = ac && ac.rot; }catch(e){}
  // F235 · "visão e audição" é uma área só no leitor clínico; o CID separa: H00 a H59 é visão, H60 a H95 é audição
  const cidsCli = (()=>{ try{ return linhaClinica(c.id).flatMap(i=>i.cids||[]); }catch(e){ return []; } })(), vis = cidsCli.some(x=>/^H[0-5]/.test(x)), aud = cidsCli.some(x=>/^H[6-9]/.test(x));
  const sentidos = vis && !aud ? ["visão"] : aud && !vis ? ["audição"] : ["visão","audição"];
  const regDa = n => REGIAO_DOC.filter(([, rx])=>rx.test(n)).map(([r])=>r);
  let sec = "";
  // F235 · a seção do catálogo que não é do perfil do cliente fica fora da lista dele (sem o dado, fica)
  const perfil = perfilDocs(c);
  const linhas = [...String(cat.itens||"").split("\n").map(l=>[l.trim(), true]), ...String(cat.extras||"").split("\n").map(l=>[l.trim(), false])].filter(x=>x[0]);
  for(const [l, base] of linhas){
    if(l.startsWith("▸")){ sec = dsa(l); continue; }
    // F235 · a seção (ou o item de jornada) fora do perfil não entra
    if(secaoForaDoPerfil(sec, perfil, cat.beneficio) || (/^\[jornada\]/i.test(l) && !perfil.jornada)) continue;
    const n = dsa(l.split(" — ")[0]);
    const dd = DOC_DOSSIE.find(x=>x.rx.test(n)), rur = dd && dd.rural && /agricultor|lavrador|rural|pescador/.test(dsa(l));
    const tidos = dd ? docs.filter(a=>dd.doc.test(_txtDoc(a)) && (!rur || /lavrador|agricultor|rural|pescador/.test(_txtDoc(a))) && !deTerceiro.has(a.id)) : [];
    if(tidos.length){ out.temos.push({l, r:{classe:"A"}, base, anexos:tidos}); continue; }
    const r = (SEC_TERCEIRO.test(sec) && !/requerente/.test(n)) ? {classe:"C", quem:"de terceiro: o dossiê é só do CPF do cliente"} : DOC_FONTE.find(x=>x.rx.test(n) && (!x.se || x.se(c))) || {classe:"C"};   // F235 · a regra pode valer só para o caso (se)
    if(r.classe==="N") continue;
    // exame ou laudo de outra região do corpo: fora da lista do caso (a área vem dos documentos médicos do dossiê)
    // F235 · na doença grave e na reumatologia o exame de qualquer região serve, menos o de visão e o de audição (o aparelho auditivo da paciente com câncer)
    const regs = regDa(n), permitidas = area==="visão e audição" ? sentidos : /reumato|graves/.test(area||"") ? REGIAO_DOC.map(r=>r[0]).filter(r=>!/^(visão|audição)$/.test(r)) : area ? [area] : null;
    if(permitidas && regs.length && !regs.some(g=>permitidas.includes(g))){ out.fora++; continue; }
    let tem = typeof r.tem==="function" ? r.tem(c) : !!(r.tem && docs.some(a=>r.tem.test(a.nome||"")));
    let anexos = r.tem instanceof RegExp ? docs.filter(a=>r.tem.test(a.nome||"")) : [];
    // F235 · o item que só vale em certo perfil (a guia e o DAS só de quem recolhe como contribuinte individual ou MEI) sai da lista
    if(r.se && !r.se(c, cat)) continue;
    if(tem && r.so && !r.so(c)){ tem = false; anexos = []; }   // F235 · a regra que só vale com o dado no CNIS (a guia de quem pagou carnê)
    // F235 · a especialidade vale pelo profissional (o "em fisioterapia" do relatório do ortopedista não é relatório de fisioterapeuta),
    // e o exame de uma região só pelo item da mesma região (a ressonância do crânio não é a do joelho)
    // F235 · a terapia citada no meio do relatório do médico não faz dele o relatório da fono ou da psicologia: só o começo vale
    const esp = (n.match(ESPEC_DOC)||[])[0], cab = /fonoaud|fisioterap|psicolog|terapia ocupacional/.test(esp||"") ? 300 : 1500;
    if(esp && tem){ const rxE = PROF_DOC[esp] || new RegExp(esp, "i"); anexos = anexos.filter(a=>rxE.test(dsa(`${a.nome} ${String(a.texto||"").slice(0, cab)}`))); tem = anexos.length > 0; }
    // F235 · o papel só cobre o item da região dele (o relatório da retina não é o do aparelho auditivo)
    if(regs.length && tem && anexos.length){ anexos = anexos.filter(a=>REGIAO_DOC.some(([g, rx])=>regs.includes(g) && rx.test(dsa(`${a.nome} ${String(a.texto||"").slice(0, 600)}`)))); tem = anexos.length > 0; }
    if(r.classe==="C*") out.escritorio.push({l, r, base});
    else if(tem) out.temos.push({l, r, base, anexos});
    // F235 · o fato negativo do portal sai traduzido quando a regra traz a tradução (negTxt)
    else out.cliente.push({l, r: typeof r.quem==="function" ? {...r, quem:r.quem(c)} : r, base, negativo:(r.neg && neg.find(x=>r.neg.test(x)) && (r.negTxt || neg.find(x=>r.neg.test(x)))) || null});
  }
  return out;
}
// F235 · os serviços (certidão, restabelecimento, isenção, regularização, seguro-defeso, cópia e justificação) não
// tinham lista de documentos nem guia: Documentos pedia "marque um benefício". Fonte: o gabarito do teste por espécie
// (16.10.2026), conferido nas normas citadas em cada nota; o que não foi conferido diz "conferir".
const SERV_CAT = {
  CTC:{beneficio:"Certidão de Tempo de Contribuição", itens:["Declaração do RH do órgão de destino e o ato de nomeação ou posse","Extrato do CNIS — com os vínculos e o vínculo público marcado","Carteira de Trabalho — dos vínculos privados","Guias da complementação — dos meses a 5 %, 11 % ou 12 % e dos abaixo do mínimo, depois do cálculo do INSS","PPP — dos períodos especiais, se forem sair discriminados","Carta de concessão — se já aposentado pelo INSS"].join("\n"), extras:"", observacoes:""},
  REST:{beneficio:"Restabelecimento de benefício", itens:["Carta de concessão — e a comunicação do corte","Laudo médico pericial — da última perícia","Extrato de pagamento — com o último crédito","Relatório médico atual — depois do corte, com CID, data, assinatura e CRM, dizendo que a incapacidade continua","Exames recentes","Extrato do CNIS","Documento de identificação com foto"].join("\n"),
    extras:["ASO de retorno (inapto) e prova de que se apresentou à empresa — empregado; nunca pedir a baixa do vínculo"].join("\n"), observacoes:""},
  IIR:{beneficio:"Isenção de Imposto de Renda", itens:["Laudo de serviço médico oficial — SUS, HC ou hospital público, com o CID e a data do diagnóstico","Exame que confirmou a doença — biópsia, anatomopatológico, e relatórios do tratamento","Informe de rendimentos — dos últimos 5 anos","Extrato de pagamento — com o desconto do IR","Carta de concessão","Declarações de IR — dos últimos 5 anos","Documento de identificação com foto"].join("\n"), extras:"", observacoes:""},
  // F235 · o que serve a quem paga carnê: o 5 % pede o CadÚnico atualizado, e a prova da atividade é só do autônomo
  GPS:{beneficio:"Regularização de contribuições", itens:["Extrato do CNIS — com os recolhimentos, a data de pagamento e os indicadores","Carnês e guias pagos que não aparecem no CNIS — se houver"].join("\n"),
    extras:["Comprovante de atualização do cadastro único da família — só para quem paga o carnê de 5 % (baixa renda)","Prova da atividade do período em atraso — só do autônomo: notas, recibos, contratos, inscrição municipal, conselho de classe","Comprovante de parcelamento na Receita — se houver"].join("\n"), observacoes:""},
  SD:{beneficio:"Seguro-defeso", itens:["Documento com biometria e CPF, e o acesso ao gov.br","RGP ativo — com a data de emissão","Relatório anual da atividade pesqueira (REAP) entregue","Notas de venda do pescado — de pelo menos 6 dos 12 meses antes do defeso","Comprovante de residência — no município do defeso ou vizinho","Ficha do CadÚnico — atualizada","Extrato do CNIS e Carteira de Trabalho Digital — mostram emprego ou benefício no período"].join("\n"),
    extras:["Carteira da colônia ou associação de pescadores"].join("\n"), observacoes:""},
  COPIA:{beneficio:"Cópia de processo administrativo", itens:["Procuração do titular para o escritório — com o consentimento para o laudo social, se houver","Documento de identificação com foto — do titular e de quem vier por ele","Número do protocolo ou do NB — ou a carta de decisão","Acesso gov.br prata ou ouro do titular — para a extensão baixar a cópia integral"].join("\n"), extras:"", observacoes:""},
  // F235 · quem não pode testemunhar, por inteiro; na justificação de tempo de serviço, a prova de que a empresa existiu entra marcada
  JA:{beneficio:"Justificação Administrativa", de: c => empregosDosPapeis(c.id).length ? {...SERV_CAT.JA, itens: SERV_CAT.JA.itens + "\nProva de que a empresa existiu no período — certidão da Junta Comercial, da Prefeitura ou da Fazenda, com nome, endereço e a data em que fechou (IN 128, art. 571, §§ 1º e 2º)"} : SERV_CAT.JA,
    itens:["Relato escrito dos fatos — período, lugar e pessoas","Nome, CPF, endereço e telefone de 2 a 6 testemunhas — de fora da família: não podem o menor de 16, o cônjuge ou companheiro e os parentes até o 3º grau (IN 128, art. 570)","Início de prova material do fato — documento da época, com data"].join("\n"),
    extras:["Certidão de óbito ou de recolhimento à prisão — quando a JA prova união ou dependência","Prova de que a empresa existiu no período — Junta Comercial, Prefeitura ou Fazenda, quando a JA prova tempo de serviço"].join("\n"), observacoes:""},
};
const GUIAS_SERV = {
  CTC:{servico:"Emitir Certidão de Tempo de Contribuição — Meu INSS", nota:"Só sai na CTC o que o CNIS prova: o mês pago a alíquota reduzida ou abaixo do mínimo precisa ser completado antes. O tempo usado aqui não conta duas vezes."},
  REST:{servico:"Pedido novo pela mesma doença, ou recurso ao CRPS se houve decisão — Meu INSS", nota:"Com decisão (a prorrogação negada), o recurso em 30 dias e a ação devolvem o auxílio desde o corte. O pedido novo pela mesma doença, começando até 60 dias do corte, também restabelece o anterior desde o corte (IN 128, art. 347); depois disso, paga só desde o pedido. Sem pedido de prorrogação não há decisão para recorrer."},
  IIR:{servico:"Solicitar Isenção de Imposto de Renda — Meu INSS", nota:"Com o laudo de serviço médico oficial; sem ele, a Perícia Médica Federal pode emitir com a documentação médica. A isenção começa na data do diagnóstico, se o laudo a trouxer (Portaria DIRBEN/INSS 992/2022, art. 291)."},
  // F235 · as guias só dos meses que ainda contam
  GPS:{servico:"Cálculo e guias, só dos meses que ainda contam (veja abaixo) — Meu INSS (SAL) e Receita Federal", nota:"Antes de pagar atrasado, confira se o mês conta: pagamento em atraso de contribuinte individual ou facultativo depois de perder a qualidade não conta para a carência (Lei 8.213/91, art. 27, II)."},
  SD:{servico:"Seguro-defeso — gov.br ou aplicativo Carteira de Trabalho Digital (Ministério do Trabalho)", nota:"Desde a Lei 15.265/2025 o pedido não é mais feito no INSS. Os prazos do pedido e do recurso vêm de resolução do Codefat: conferir antes de orientar."},
  COPIA:{servico:"Cópia de processo — Meu INSS (baixar a cópia integral)", nota:"Com gov.br prata ou ouro do titular, a extensão Dossiê baixa a cópia; sem ele, o pedido exige procuração. O prazo de recurso não espera a cópia."},
  JA:{servico:"Justificação Administrativa — pedida dentro do processo do benefício", nota:"Não podem testemunhar o menor de 16, o cônjuge ou companheiro e os parentes até o 3º grau, de sangue ou por casamento (IN 128, art. 570, parágrafo único). O INSS não intima as testemunhas: a pessoa as avisa e leva no dia marcado (Portaria DIRBEN 993, art. 89, § 1º). A JA julgada não se repete para o mesmo fato (art. 101)."},
};
// o serviço do pré-caso aberto (código ou nome do catálogo de espécies)
function servicoDoPreCaso(c){
  const pc = preCasoAberto(c); if(!pc) return "";
  const e = String(pc.cod || pc.especie || "").trim(), cod = (ESPECIES.find(x=>x[0]===e || x[1]===e)||[])[0] || e;
  return SERV_CAT[cod] ? cod : "";
}
// F235 · o catálogo do banco é um só por espécie; a lista do caso acrescenta (marcado) o papel que a análise mostrou que
// decide (as negativas do SUS, o contrato de aprendizagem, a certidão de quem sai do grupo, o seguro-desemprego do preso,
// a CAT, o boletim e o laudo do IML), troca a frase que dizia errado, tira o que não cabe na classe de quem pede e não repete
function docAjusteCat(c, cat){
  const nome = cat.beneficio || "", ops = opcoesSel(c).map(o=>o.o), b93 = ops.includes("B93");
  if(!/^(BPC|Pensão por Morte|Auxílio-Reclusão)/.test(nome) && !(nome==="Revisão" && b93)) return cat;
  const ks = D.casosDoCliente.get(c.id)||[], add = [];
  let ls = String(cat.itens||"").split("\n"), ex = String(cat.extras||"").split("\n");
  const muda = (rx, s) => { ls = ls.map(l=>l.replace(rx, s)); ex = ex.map(l=>l.replace(rx, s)); };
  const tira = rx => { const fora = ls.filter(l=>rx.test(l)); ls = ls.filter(l=>!rx.test(l)); ex = [...ex, ...fora]; };   // vai para "conforme a atividade"
  const some = rx => { ls = ls.filter(l=>!rx.test(l)); ex = ex.filter(l=>!rx.test(l)); };
  const nomeF = k => k.curto || fraseClinica(k.nome).split(" ")[0];
  const filhos = (x, f) => (typeof depFilhosX==="function" && f ? depFilhosX(x) : []).filter(k=>{ const id = k.nasc ? idadeEm(k.nasc, f) : k.idadeFato; return id!=null && id < 21; });
  const prova = (f, oque) => `Prova da união estável: 2 papéis com data, 1 deles ${f ? `de ${fmtBarra(somarMeses(f, -24))} a ${fmtBarra(f)}` : `dos 24 meses antes ${oque}`} — não precisa de escritura nem de ação na Justiça; testemunha só complementa`;
  try{
    if(/^BPC/.test(nome)){ const r = typeof bpcContaDe==="function" ? bpcContaDe(c) : null;
      muda(/^▸ Documentos de todos que moram na casa/, "▸ Documentos de quem pede e da casa");
      if(((familiaCadunico(c)||{}).membros||[]).some(m=>m.cpf)) muda(/^RG\/CIN e CPF de TODOS da casa.*$/, "Documento com foto e CPF de quem pede e do responsável — dos outros moradores basta o CPF, que já está no CadÚnico");
      muda(/^Comprovante de renda de todos que moram na mesma casa.*$/, "Comprovante de renda de quem entra na conta — holerite, extrato ou declaração de renda informal");
      if(((familiaCadunico(c)||{}).membros||[]).some(m=>m.cpf)) muda(/^CPF de todos da casa.*$/, "CPF de quem mora na casa, que já está no CadÚnico — confira se está regular");
      muda(/^Comprovação de auxílio Bolsa Família.*$/, "Comprovação do Bolsa Família — entra na conta da renda desde o Decreto 12.534/2025, como na Análise de Direito");
      muda(/ — exclui o valor do cômputo \(Estatuto do Idoso\)/, " — fica fora da conta (LOAS, art. 20, § 14)");
      muda(/^Despesas com (plano de saúde|aluguel).*$/, "Despesas com $1 — não descontam no INSS; servem só como prova da miserabilidade numa ação");
      if(r){
        if((r.ded && r.ded.valor) || docsDoDossie(c.id).some(a=>/negativ/i.test(a.nome||""))) add.push("▸ Gastos de saúde que o SUS não dá",
          "Negativa por escrito do SUS para cada remédio ou terapia — do posto, da farmácia ou da Secretaria da Saúde; junte ao pedido, senão o INSS não desconta o gasto",
          "Relatório médico dizendo que o tratamento é contínuo — com cada remédio e cada terapia",
          "Receita do remédio de uso contínuo",
          "Recibos dos 12 meses anteriores ao pedido — só se o gasto real for maior que o valor fixo de cada tipo");
        const apr = (r.det||[]).filter(d=>d.apr).map(d=>tituloOrgao(d.m.nome)), jov = (r.jovens||[]).map(m=>tituloOrgao(m.nome));
        if(apr.length || jov.length) add.push(`Contrato de aprendizagem ou termo de estágio de ${[...apr, ...jov].join(" e ")} — esse salário sai da conta (LOAS, art. 20, § 9º)`);
        for(const m of r.tirados||[]) add.push(`Certidão de casamento de ${tituloOrgao(m.nome)} com a averbação do divórcio, da separação ou do óbito do cônjuge — prova que não entra na conta da renda (só filho solteiro entra)`);
      }
    }
    if(nome==="Pensão por Morte"){ const op = b93 ? "B93" : "morte", x = reqCtx(c, ks, op), cl = x.v.dep_classe || "", f = x.v.dep_fato;
      if(/^Companheiro/.test(cl)){ add.push(prova(f, "do óbito")); some(/^Certidão de casamento — Documento suficiente/); }
      if(cl==="Cônjuge"){ add.push("Certidão de casamento — atualizada; basta para provar a dependência"); some(/^Certidão de casamento — Documento suficiente/); }
      const fs = filhos(x, f);
      if(fs.length) add.push(`Certidão de nascimento de ${fs.map(nomeF).join(" e ")} — a parte ${fs.length > 1 ? "deles" : "dele"} se pede junto; pelo menor de 16 assina a mãe ou o pai`);
      if(b93){ muda(/^Certidão de óbito — .*$/, "Certidão de óbito — com a causa da morte");
        add.push("▸ Acidente do trabalho (B93)", "CAT do acidente — se a empresa não fez, a família faz no Meu INSS (Lei 8.213, art. 22, § 2º)", "Boletim de ocorrência do acidente",
          "Laudo do IML — o exame feito no corpo", "Prova do vínculo no dia: carteira de trabalho, holerite ou ficha de registro"); }
    }
    if(nome==="Auxílio-Reclusão"){ const x = reqCtx(c, ks, "reclusao"), cl = x.v.dep_classe || "", f = x.v.dep_fato, d = typeof relatoDepDe==="function" ? relatoDepDe(x) : {};
      muda(/^Último contracheque ou documento de renda do preso.*$/, "Holerites dos 12 meses antes do mês da prisão — a média deles decide a baixa renda (Lei 8.213, art. 80, § 4º)");
      muda(/^▸ Renda do preso \(Tema 89 STF\)/, "▸ Renda do preso");
      muda(/^Cônjuge — certidão de casamento$/, "Certidão de casamento — basta para provar a dependência do cônjuge");
      muda(/^Certidão de Cárcere ou Declaração de Reclusão — /, "Certidão de Cárcere (Declaração de Reclusão) — ");
      muda(/^Comprovante de desemprego antes da prisão.*$/, "Prova de que ele não teve salário nos 12 meses antes da prisão (rescisão, carteira de trabalho) — sem salário nesse período, é baixa renda (IN 128, art. 383, § 5º)");
      some(/^Holerites (ou contracheques )?dos 12 meses anteriores à prisão/);
      if(x.v.ins_desemprego==="Sim" || d.sd) add.push("Comprovante do seguro-desemprego do preso — requerimento e parcelas, com as datas: prova o desemprego e dá mais 12 meses de cobertura (IN 128, art. 184, § 5º)");
      if(x.v.rec_comps_12==="0" || d.semTrab) add.push("Prova de que ele não teve salário nos 12 meses antes da prisão (rescisão, carteira de trabalho) — sem salário nesse período, é baixa renda (IN 128, art. 383, § 5º)");
      if(cl==="Cônjuge") tira(/^Companheiro\(a\) — documentos de união estável/);
      if(/^Companheiro/.test(cl)){ tira(/^Certidão de casamento — basta para provar a dependência do cônjuge/); add.push(prova(f, "da prisão")); }
      if(cl || filhos(x, f).length){ tira(/^Filho inválido acima de 21 anos/); tira(/^Pais \(classe 2\)/); }
      const cs = (x.cert||[]).filter(ce=>ce.prisao);
      if(cs.length && cs.every(ce=>ce.rot==="declaração da unidade prisional")) add.push("Certidão judicial do recolhimento à prisão — do fórum do processo: a lei a pede no pedido (Lei 8.213, art. 80, § 1º), e a declaração do presídio serve para provar, a cada 90 dias, que ele continua preso (IN 128, art. 390)");
    }
    if(nome==="Revisão" && typeof b93MesmaDe==="function"){ const x = reqCtx(c, ks, "B93");
      if(b93MesmaDe(x)){ some(/irsm|urv|teto|1994|concomitant|simult|duas atividades|atividade principal|tempo especial|rural|fgts|holerites antigos|memorial|glosa|vida toda|buraco negro/i);
        add.push("▸ Troca da pensão comum (B21) para a do acidente do trabalho (B93)", "CAT feita pela família — a empresa não fez (Lei 8.213, art. 22, § 2º)", "Boletim de ocorrência do acidente",
          "Laudo do IML — o exame feito no corpo", "Certidão de óbito — com a causa da morte", "Prova do vínculo no dia: carteira de trabalho, holerite ou ficha de registro"); }
    }
  }catch(e){}
  // sem repetir: o item igual a outro (pelo começo, antes do " — ") sai; o título de seção fica
  const chave = l => dsa(String(l).split(" — ")[0]).trim(), visto = new Set();
  const unico = l => { if(!l.trim() || l.startsWith("▸")) return true; const k = chave(l); if(visto.has(k)) return false; visto.add(k); return true; };
  const itens = [...add, ...ls].filter(unico);
  return {...cat, itens:itens.join("\n"), extras:ex.filter(unico).join("\n")};
}
// os catálogos dos benefícios marcados na análise; sem marcação, o da espécie do contrato
function catalogosDaAnalise(c){
  // F235 · o catálogo pode trocar a lista pela do caso (a troca 32 → 92 não é pedido de auxílio novo)
  const proprio = o => { const f = (REQ_EXTRA[o.o]||{}).docCat; try{ return f ? f(c) : null; }catch(e){ return null; } };
  // F235 · o benefício negado com o recurso no prazo não pede a lista do pedido novo: entra a do recurso
  const ops = opcoesSel(c), fdR = ops.some(o=>o.o==="crps") ? {fd:fontesDoDossie(c.id), hoje:hoje()} : null;
  const emRec = fdR ? ops.filter(o=>RE_RECURSO[o.o] && recursoDoBenef(fdR, RE_RECURSO[o.o])).map(o=>o.o) : [];
  // F235 · com o acerto do CNIS em análise (carteira fora do CNIS ou pendência), a aposentadoria se pede depois: a lista dela fica para lá
  const acertoAntes = ops.some(o=>o.o==="acerto") && (ctpsForaDoCnis(c).length || ((cnisDe(c)||{}).vinculos||[]).some(v=>(v.indicadores||[]).some(i=>/^PEXT/.test(String(i)))));
  const nomes = [...new Set(ops.filter(o=>!emRec.includes(o.o) && !(acertoAntes && /^(idade|transicao|professor|hibrida|b46|conv|pcd|pcd_idade)$/.test(o.o))).map(o=>proprio(o) || DOC_CAT[o.o]).filter(Boolean))];
  let cats = nomes.map(n=>typeof n==="object" ? n : docPorNome(n)).filter(Boolean).map(k=>docAjusteCat(c, k));   // F235 · a lista ajustada ao caso
  // F235 · a opção ajusta a lista do catálogo ao caso (REQ_EXTRA[op].docs): tira o que não cabe e põe à frente o que o caso pede
  const ksD = D.casosDoCliente.get(c.id)||[];
  cats = cats.map(k=>{ const os = opcoesSel(c).filter(o=>DOC_CAT[o.o]===k.beneficio), f = os.length===1 && (REQ_EXTRA[os[0].o]||{}).docs; if(!f) return k;
    let d = null; try{ d = f(reqCtx(c, ksD, os[0].o)); }catch(e){} if(!d) return k;
    const fica = s => String(s||"").split("\n").filter(l=>!(d.tira && d.tira.test(dsa(l))));
    return {...k, itens:[...(d.topo||[]), ...fica(k.itens)].join("\n"), extras:[...fica(k.extras), ...(d.mais||[])].join("\n")}; });
  if(!cats.length && !fdR){ const d = docDe(especieDoContrato(c, D.casosDoCliente.get(c.id)||[])); if(d) cats = [d]; }
  if(fdR) cats.push(catRecurso(c, fdR.fd));
  if(ops.some(o=>o.o==="rev")){ const ex = catRevisao(c); if(ex) cats.push(ex); }
  const sv = servicoDoPreCaso(c); if(sv && !cats.some(k=>k.beneficio===SERV_CAT[sv].beneficio)) cats.push(SERV_CAT[sv].de ? SERV_CAT[sv].de(c) : SERV_CAT[sv]);
  return cats;
}
// F235 · a lista do recurso: a decisão e a cópia do pedido (que o dossiê costuma ter), a prova contra o motivo e a procuração
function catRecurso(c, fd){
  return {beneficio:"Recurso ao CRPS", itens:["Comunicação de decisão — a carta do INSS com o motivo da negativa", "Cópia do processo do pedido negado — com os documentos anexados",
    ...((fd.seguros||[]).length ? ["Seguro-desemprego — prova o desemprego e estende a qualidade de segurado"] : []), "Procuração e termo de representação — assinados"].join("\n"),
    extras:["Relatório médico atualizado — se o advogado pedir, na matéria médica", "Documento novo contra o motivo — vale da entrega, e não do pedido (IN 128, art. 566, §§ 7º e 8º)"].join("\n"), observacoes:""};
}
// F235 · a revisão sem a cópia do processo de concessão no dossiê: o escritório a pede por agendamento, sem esperar por ela
function catRevisao(c){
  const fd = fontesDoDossie(c.id), ca = (fd.cartas||[])[0]; if(!ca || (fd.processos||[]).some(p=>!p.nb || p.nb===ca.nb)) return null;
  return {beneficio:"Cópia do processo de concessão", itens:`Cópia integral do processo de concessão${ca.der ? ` de ${ca.der.slice(-4)}` : ""} — não está no Meu INSS: agendar o serviço de cópia de processo, sem esperar por ela para protocolar a revisão; mostra se o PPP foi entregue`, extras:"", observacoes:""};
}
// o que a base do escritório sustenta por espécie (pesquisa de 12.10.2026): anexo da IN 128, serviço da Carta de
// Serviços 2025 e o campo vinculante do formulário. Anexo fora de ANEXOS_IN128 abre a página de anexos do portal.
const GUIA_RAC = ["RAC Completo (Anexo I)","RAC Acerto de Dados (Anexo I-A)","RAC Vínculos (Anexo I-B)","RAC Remunerações CI (Anexo I-D)","RAC Reconhecimento (Anexo I-E)","RAC Acerto de Contribuições (Anexo I-F)"];
const NOTA_FORM = "RAC só se o CNIS tiver indicador: requerer com o CNIS limpo. No formulário, responder sim a todo período que o caso pede.";
const GUIAS_ESPECIE = {
  idade:{anexos:GUIA_RAC, servico:"Pedir Aposentadoria (todas as modalidades urbanas) — Meu INSS", nota:NOTA_FORM},
  transicao:{anexos:[...GUIA_RAC, "CTC do RPPS (Anexo IX da Portaria MTP 1.467/2022) com a Relação das Bases de Cálculo (Anexo X)"], servico:"Pedir Aposentadoria (todas as modalidades urbanas) — Meu INSS", nota:NOTA_FORM+" Tempo em regime próprio entra pela CTC do Anexo IX da Portaria MTP 1.467/2022, com a Relação das Bases de Cálculo do Anexo X para o período posterior a 06/1994 (art. 70 da IN 128, redação da IN 167/2024)."},
  professor:{anexos:[], servico:"Pedir Aposentadoria (todas as modalidades urbanas) — Meu INSS", nota:"Sem anexo próprio na base: atestado da escola e CTPS com função de magistério; responder sim a professor no formulário."},
  // F235 · a PcD pede direto a aposentadoria: a avaliação (médico e assistente social) é marcada depois do pedido, e o
  // certificado pedido antes, sem avaliação, só devolve "não possui deficiência"
  pcd:{anexos:[], servico:"Aposentadoria da PCD por Tempo — Meu INSS (a avaliação com médico e assistente social é marcada depois do pedido)", nota:"Não peça o Certificado PcD antes: sem a avaliação ele só diz \"não possui deficiência\". Junte o relatório do médico, com o que a deficiência limita e as barreiras, e os documentos desde a DID; antes de 11/2013, só documento prova a data (art. 305, § 5º, da IN 128). Sem anexo da IN 128 na base."},
  pcd_idade:{anexos:[], servico:"Aposentadoria da PCD por Idade — Meu INSS (a avaliação com médico e assistente social é marcada depois do pedido)", nota:"60 anos (homem) ou 55 (mulher) e 15 anos de contribuição na condição de pessoa com deficiência (art. 311 da IN 128). Não peça o Certificado PcD antes: a avaliação vem depois do pedido. Junte o relatório do médico e os documentos desde a DID; antes de 11/2013, só documento prova a data."},
  b46:{anexos:["PPP (Anexo XVII)"], servico:"Pedir Aposentadoria (Aposentadoria Especial) — Meu INSS", nota:"PPP para os períodos desde 01/01/2004 e PPP emitido a partir de 18/07/2002 também para os anteriores; os antigos formulários (SB-40, DISES BE 5235, DSS-8030) até 31/12/2003, com LTCAT para ruído (arts. 272 e 274 da IN 128); o enquadramento segue o Anexo XVI (art. 269); responder sim a tempo especial."},
  conv:{anexos:["PPP (Anexo XVII)"], servico:"Pedir Aposentadoria (todas as modalidades urbanas) — Meu INSS", nota:"PPP por vínculo especial; a conversão vale só até 13/11/2019; responder sim a tempo especial."},
  // F235 · não há entrevista rural desde 07/08/2017 (Portaria DIRBEN 990/2022, art. 89): a prova é a autodeclaração com os papéis e as bases do governo
  idade_rural:{anexos:["Autodeclaração Rural (Anexo VIII)","RAC Reconhecimento (Anexo I-E)","RAC Acerto de Contribuições (Anexo I-F)"], servico:"Aposentadoria Rural — Meu INSS (pode exigir agendamento presencial)", nota:"Autodeclaração do segurado especial (Anexo VIII, art. 115, § 1º, da IN 128) com o maior número de documentos do art. 116. Não há entrevista rural (Portaria DIRBEN 990/2022, art. 89): a prova é a autodeclaração confirmada pelos papéis e pelas bases do governo; se faltar papel de algum período, o advogado avalia a justificação administrativa, com testemunhas."},
  hibrida:{anexos:["Autodeclaração Rural (Anexo VIII)","RAC Reconhecimento (Anexo I-E)"], servico:"Aposentadoria Rural — Meu INSS (pode exigir agendamento presencial)", nota:"No pedido, responda SIM à pergunta do tempo rural: com não, o INSS nem olha a roça. Junte a autodeclaração (Anexo VIII) de cada período de roça, com os papéis dele."},
  // F235 · o Anexo XXIX é do administrador provisório (IN 128, art. 527, §§ 6º e 7º): não é papel de todo pedido
  def:{anexos:[], servico:"Pedir BPC à Pessoa com Deficiência — Meu INSS (avaliação social presencial)", nota:"CadÚnico atualizado em até 24 meses. O Termo de Compromisso (Anexo XXIX) só quando quem pede não pode responder por si e ainda não tem tutor, curador ou guarda: assina o parente que pede por ele, como administrador provisório (IN 128, art. 527, §§ 6º e 7º); pai ou mãe de criança não precisa dele."},
  idoso:{anexos:[], servico:"Pedir BPC ao Idoso — Meu INSS", nota:"CadÚnico atualizado em até 24 meses. O Termo de Compromisso (Anexo XXIX) só quando o idoso não pode responder por si e ainda não tem curador: assina o parente que pede por ele, como administrador provisório (IN 128, art. 527, §§ 6º e 7º)."},
  b31:{anexos:[], servico:"Pedir Auxílio por Incapacidade Temporária — Meu INSS (só com atestado, o Atestmed, ou com perícia)", nota:"No Meu INSS, escreva com cuidado quando os sintomas começaram e quais são: o INSS fica preso ao que foi escrito. Negado por análise documental: pedir a reanálise em 10 dias da ciência, com relatório médico novo, antes do recurso; recorrer dentro dos 10 dias sem pedir a reanálise a impede."},
  b32:{anexos:[], servico:"Pedir Aposentadoria por Incapacidade Permanente — Meu INSS (perícia presencial)", nota:"Sem anexo; o acréscimo de 25 % é pedido à parte."},
  acid:{anexos:[], servico:"Cadastrar CAT e Pedir Auxílio por Incapacidade — Meu INSS", nota:"Sem CAT da empresa, requerer a CAT equiparada (art. 22, § 2º, da Lei 8.213/91)."},
  b94:{anexos:[], servico:"Pedir Auxílio-Acidente — Meu INSS", nota:"O INSS confere antes o relatório médico com os 7 itens (análise documental prévia, Portaria Conjunta 15/2026, art. 2º); passando, marca a perícia presencial, e o prazo de análise é de 60 dias (acordo do RE 1.171.152, conferir). Se negar: recurso em 30 dias ou ação acidentária na Justiça Estadual, nunca no Juizado Federal."},
  b36:{anexos:[], servico:"Pedir Auxílio-Acidente — Meu INSS", nota:"O INSS confere antes o relatório médico com os 7 itens (análise documental prévia, Portaria Conjunta 15/2026, art. 2º); passando, marca a perícia presencial, e o prazo de análise é de 60 dias (acordo do RE 1.171.152, conferir). Se negar: recurso em 30 dias ou ação no Juizado Especial Federal, e não na Justiça Estadual."},
  morte:{anexos:["Benefício em outro regime (Anexo XXIV)"], servico:"Pedir Pensão por Morte — Meu INSS ou 135", nota:"Sem carência (art. 195, III, da IN 128). O Anexo XXIV é a declaração de recebimento de benefício em outro regime (art. 669), para a acumulação."},
  reclusao:{anexos:[], servico:"Solicitar Auxílio-Reclusão — Meu INSS ou 135", nota:"Regime fechado, baixa renda pela média dos salários de contribuição dos 12 meses anteriores ao mês da prisão até o valor da Portaria da data, e 24 contribuições do instituidor (arts. 383 e 198 da IN 128). No pedido, a certidão judicial do recolhimento (Lei 8.213, art. 80, § 1º); depois, a cada 90 dias, o atestado ou a declaração do presídio (IN 128, art. 390)."},
  // F235 · a pensão acidentária: a CAT (pela família, se a empresa não fez) vem antes do pedido
  B93:{anexos:[], servico:"Cadastrar a CAT (pela família, se a empresa não fez) e Pedir Pensão por Morte — Meu INSS", nota:"A CAT liga a morte ao trabalho: sem a da empresa, a família faz (Lei 8.213, art. 22, § 2º). Junte o boletim de ocorrência, o laudo do IML e a certidão de óbito com a causa. Se a pensão já saiu como comum (B21), o pedido é revisão com troca para B93."},
  urb:{anexos:[], servico:"Pedir Salário-Maternidade (urbano) — Meu INSS", nota:"Só a empregada com carteira ativa recebe pela empresa. MEI, autônoma, facultativa, doméstica, empregada de MEI e desempregada em graça recebem direto do INSS, pelo Meu INSS."},
  rur:{anexos:["Autodeclaração Rural (Anexo VIII)"], servico:"Pedir Salário-Maternidade (rural) — Meu INSS (pode exigir agendamento)", nota:"Usa a autodeclaração do segurado especial, com ao menos um papel da roça de antes do parto, no nome dela ou do marido; se o CNIS já tem o período de segurada especial, ele basta."},   // F235 · a regra do papel anterior ao parto
  // F235 · revisão não é recurso (o recurso tem 30 dias e vai ao Conselho); o acerto se pede no Meu INSS, com o RAC anexado (IN 128, art. 12, § 1º)
  rev:{anexos:[], servico:"Revisão do benefício — Meu INSS (é revisão, e não recurso; conferir o nome exato do serviço antes de orientar)", nota:"Anexe a prova da tese (no tempo especial, o PPP) e peça o período como especial, com a conversão e o novo cálculo da renda; junte a carta de concessão. Não cabe reafirmação da DER em revisão."},
  acerto:{anexos:[...GUIA_RAC, "Declaração da empresa ou do OGMO (Anexo II e II-A)", "Cálculo em Atraso (Anexo VII)"], servico:"Atualização do CNIS (acerto de vínculos e remunerações) — Meu INSS, com o RAC anexado quando faltar campo no formulário (IN 128, art. 12, § 1º); se o serviço não aparecer, pelo 135", nota:"Um acerto por vínculo, com a prova de cada um; vínculo de empregado no RAC Vínculos (Anexo I-B). Sem pedir benefício e sem prazo."},
  crps:{anexos:[], servico:"Apresentar Recurso Ordinário (Inicial) — Meu INSS", nota:"Prazo de 30 dias da ciência (art. 305 do Decreto 3.048/99)."},
};
const PORTAL_ANEXOS = "https://portalin.inss.gov.br/anexos";
// F236 · o que o caso ainda espera, no alto de Documentos: as tarefas abertas do caso (📄 documentos e as demais), com a
// data, e a exigência do INSS; é para onde leva a linha Documentos do "Nas outras abas" (antes o item não estava à vista)
function quadroPendCaso(c, ks){
  if(_atendAberto.has(c.id) && preCasoAberto(c)) return "";
  const bl = (ks||[]).filter(k=>!k.pre_caso && k.fase!=="encerrado").map(k=>{
    const ts = (D.tarefas||[]).filter(t=>t.caso_id===k.id && !t.concluida).sort((a, b)=>(a.prazo||"9")<(b.prazo||"9") ? -1 : 1);
    // F236 · a diligência do CRPS com o nome dela; a nota interna do prazo estimado vira "estimado" ao lado da data
    const exD = String(k.exigencia_descricao||""), exEst = /prazo estimado/i.test(exD), exDil = faseEfetiva(k)==="conselho" || /dilig[êe]ncia/i.test(exD);
    const ex = emExigencia(k) && exD ? `<p class="dq-exig"><b>${exDil ? "Diligência do CRPS" : "Exigência do INSS"}${k.exigencia_prazo ? ` (até ${fmtBarra(k.exigencia_prazo)}${exEst ? ", estimado" : ""})` : ""}:</b> ${esc(exD.replace(/\s*·\s*prazo estimado:[\s\S]*$/i, ""))}</p>` : "";
    if(!ts.length && !ex) return "";
    const ehDoc = t => /^📄/.test(t.titulo||""), nDocs = ts.filter(ehDoc).length;
    return `<div class="dq-pend-caso"><b>${esc(tituloCaso(k))}</b> <span class="meio-sub">· ${esc(NOME_FASE[k.fase]||k.fase||"")}</span>
      ${nDocs ? `<button class="btn-mini" onclick="cobrarDocs('${c.id}','${k.id}')" title="mensagem pronta no WhatsApp com os documentos pendentes">📲 cobrar ${nDocs} pendente${nDocs>1?"s":""}</button>` : ""}
      ${ex}${ts.map(t=>`<div class="cl"><span class="box" data-subt="${t.id}" style="cursor:pointer" title="marcar como feito"></span><span>${esc(t.titulo)}</span>
        ${t.prazo ? chipPrazo(t.prazo, ehDoc(t) ? "o cliente entrega até" : "fazer até") : ""}
        ${ehDoc(t) ? `<button class="btn-mini" style="padding:1px 6px" onclick="prazoDoDoc('${t.id}')" title="${t.prazo ? "trocar a data de entrega" : "dar data de entrega: vencida, entra no Meu Dia para cobrar"}">📅</button>` : ""}</div>`).join("")}</div>`; }).filter(Boolean);
  return bl.length ? `<section class="doc-quadro" id="dq-pend-caso"><div class="rotulo-caso">Pendências do caso</div>${bl.join("")}</section>` : "";
}
// F236 · o documento do escritório já gerado ou assinado: pelo nome exato no "Gerado · …", pelo tipo no assinado e no
// contrato anexado pela aba Honorários (nome "Contrato assinado …")
const RX_DOC_FEITO = {proc_adm:/procura[çc][ãa]o(?![\s_-]*judicial)/i, b31_proc:/procura[çc][ãa]o(?![\s_-]*judicial)/i, proc_judicial:/procura[çc][ãa]o[\s_-]*judicial|ad judicia/i,
  contrato:/contrato/i, b31_contrato:/contrato/i, termo:/termo[\s_-]*de[\s_-]*representa/i, beneficiario:/n[ãa]o[\s_-]*recebimento/i, pobreza:/pobreza|hipossufici/i};
function docFeitoDe(c, jud){
  const as = (D.anexos||[]).filter(a=>a.cliente_id===c.id && (/^(gerado|assinado)$/.test(a.origem||"") || /^Contrato assinado/.test(a.nome||"")))
    .sort((p, q)=>String(q.criado_em||"").localeCompare(String(p.criado_em||"")));
  // na Justiça, a procuração sem tipo no nome do arquivo é a judicial; no INSS, a administrativa
  const rxDe = ch => jud && ch==="proc_judicial" ? /procura[çc][ãa]o(?![\s_-]*adm)/i : jud && /^(proc_adm|b31_proc)$/.test(ch) ? /procura[çc][ãa]o[\s_-]*adm/i : RX_DOC_FEITO[ch];
  return ch => { const rot = (DOCS_ESCRITORIO[ch]||{}).rot||"", rx = rxDe(ch);
    const ass = rx && as.find(a=>a.origem!=="gerado" && rx.test(a.nome||""));
    const ger = as.find(a=>a.origem==="gerado" && (String(a.nome||"").replace(/\s*\(lacunas:.*$/, "").split(/[·;]\s*/).map(s=>s.trim()).includes(rot) || (rx && rx.test(a.nome||""))));
    const x = ass || ger; return x ? {assinado:!!ass, em:String(x.criado_em||"").slice(0,10)} : null; };
}
function painelDocumentosAtend(c, ks){
  const pc = preCasoAberto(c);
  // F240 · no atendimento, Documentos em passos: assinar, pedir ao cliente, guia do pedido e desfecho; o que é
  // consulta (catálogo, consultas com o CPF, anexos da IN 128, site interno) vai para a gaveta Ferramentas
  if(_atendAberto.has(c.id) && pc){
    if(telaSimples("doc", c)) return docSimples(c, ks);   // F249 · nível 1 e 2 antes da onda 5
    let urg = false; try{ urg = limitesDaEntrega(c, casoDaVez(c)).length > 0; }catch(e){}
    const tp = passosDaTela("doc", c, [{id:"assinar", rot:"Assinar", conta:"", alerta:false}, {id:"pedir", rot:"Pedir ao cliente", conta:"", alerta:urg},
      {id:"guias", rot:"Guia do pedido", conta:"", alerta:false}, {id:"desfecho", rot:"Criar caso", conta:"", alerta:false}]);
    const oc = id => !tp.tudo && id!==tp.at ? " hidden" : "";
    return `<div class="doc-quadros tp-raiz${tp.tudo ? " tp-tudo" : ""}"${tp.attrs}>${tp.trilha}
    <div class="tp-passo" data-passo="assinar"${oc("assinar")}><section class="doc-quadro" id="dq-assinar">${caixaDocumentos(c, ks)}</section>${quadroGerados(c)}</div>
    <div class="tp-passo" data-passo="pedir"${oc("pedir")}>${quadroProvidenciar(c)}</div>
    <div class="tp-passo" data-passo="guias"${oc("guias")}>${quadroGuias(c)}${quadroManutencaoDoc(c)}</div>
    <div class="tp-passo" data-passo="desfecho"${oc("desfecho")}><section class="doc-quadro" id="dq-desfecho">${quadroDesfecho(c)}</section></div>
    <div class="tp-pe">${tp.nav}</div>
    <details class="doc-quadro doc-ferr" id="dq-ferramentas"><summary>Ferramentas: catálogo completo de documentos, consultas com o CPF, anexos da IN 128 e site interno</summary>
      <details class="doc-quadro doc-catalogo"><summary>Catálogo completo de documentos para o INSS — outro benefício, checklist do caso</summary>${catalogoNoCadastro(c, ks)}</details>
      ${painelConsulta(c)}</details>
  </div>`;
  }
  return `<div class="doc-quadros">
    ${quadroPendCaso(c, ks)}
    <section class="doc-quadro" id="dq-assinar">${caixaDocumentos(c, ks)}</section>
    ${quadroProvidenciar(c)}
    ${quadroGuias(c)}
    ${quadroGerados(c)}
    ${pc ? `<section class="doc-quadro" id="dq-desfecho">${quadroDesfecho(c)}</section>` : ""}
    <details class="doc-quadro doc-catalogo"><summary>Catálogo completo de documentos para o INSS — outro benefício, checklist do caso</summary>${catalogoNoCadastro(c, ks)}</details>
    ${painelConsulta(c)}
  </div>`;
}
// o que já pedimos ao cliente, com a entrega marcável — na mesa e no quadro
function pedidosHtml(c, pedidos){
  return `<div style="margin-top:8px">
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
    </ul></div>`;
}
// F235 · o que a análise e a leitura do dossiê já pediram ao cliente: as frases "peça…" e "traga…" dos requisitos
// em aberto e do quadro "Não encontrado no dossiê", uma vez cada. Só dos benefícios escolhidos; o documento médico só
// quando o benefício olha a saúde; a instrução à equipe ("traga do CNIS ao quadro Tempos") não é pedido ao cliente
const OPS_SAUDE = /^(b31|b32|acid|b94|b36|def|pcd|pcd_idade|REST|IIR)$/;
function pedidosDaAnalise(c){
  const ks = D.casosDoCliente.get(c.id)||[], out = [], visto = new Set(), ops = opcoesSel(c);
  if(!ops.length) return out;
  const saude = ops.some(o=>OPS_SAUDE.test(o.o));
  // F236 · o laudo da perícia não se pede ao cliente quando a perícia ainda não houve, quando ele já está no dossiê ou nos
  // anexos, nem no caso que já está na Justiça (o laudo judicial está nos autos)
  const kV = casoDaVez(c), evK = kV ? (D.eventos||[]).filter(e=>e.caso_id===kV.id && ehPericiaInss(e) && !/cancel/.test(e.status||"")) : [];
  const semLaudo = (evK.length && evK.every(e=>e.status!=="realizada" && dataSP(e.data_hora)>=hoje())) || !!(kV && /^(judicial|peticao_inicial|pagamento)$/.test(kV.fase))
    || (fontesDoDossie(c.id).laudos||[]).length > 0 || (D.anexos||[]).some(a=>a.cliente_id===c.id && /laudo/i.test(a.nome||"") && /per[íi]ci|pericial/i.test(a.nome||""));
  const poe = (t, sujeito) => { t = String(t||""); if(/traga (os vínculos )?do CNIS|quadro Tempos/i.test(t)) return;
    if(semLaudo) t = t.replace(/\s*\((?:ou )?traga o laudo da per[íi]cia\)/gi, "").replace(/\btraga o laudo da per[íi]cia\b[^.;)]*/gi, "");
    const m = t.match(/\b(peça|pe[çc]a|traga|pedir ao cliente|baixe)\b[^.;)]*/i); if(!m) return;
    let s = m[0].trim(); if(sujeito && s.length < 40) s = `${sujeito}: ${s.charAt(0).toLowerCase()}${s.slice(1)}`;
    s = cap1(s); const k = dsa(s).slice(0, 60); if(!visto.has(k)){ visto.add(k); out.push(s); } };
  for(const o of ops){ let a = null; try{ a = requisitosDe(c, ks, o.o); }catch(e){}
    for(const r of (a||{rs:[]}).rs.filter(r=>["provar","falta","informar","risco"].includes(r.est))) poe(r.txt); }
  try{ for(const t of paFaltas(c, fontesDoDossie(c.id))) if(saude || !/m[ée]dic|laudo|per[íi]cia/i.test(t)) poe(t, String(t).split(/[:(]/)[0].trim()); }catch(e){}
  return out;
}
// F236 · as datas que a entrega dos documentos não pode passar: o recurso do dossiê e o pedido do Desfecho (F235) e, do caso,
// o prazo fatal (casos.prazo), o da exigência, os do tribunal e a perícia marcada, porque os papéis vão a ela
function limitesDaEntrega(c, k){
  const hj = hoje(), out = [], pus = (d, txt, ne) => { if(d && d >= hj) out.push({d, txt, ne:ne||""}); };
  try{ for(const p of prazosDoDossie(c)) pus(p.fatal, `O recurso tem de sair até ${fmtBarra(p.fatal)}`, "o recurso"); }catch(e){}
  try{ for(const l of desfechoPorBenef(c).filter(l=>l.prazo)){ const b = (l.txt.match(/até (\d{2}\/\d{2}\/\d{4})/)||[])[1]; if(b) pus(isoBr(b), `O pedido tem de sair até ${b}`, "o pedido"); } }catch(e){}
  if(k){
    pus(k.prazo, `O prazo do caso vence em ${fmtBarra(k.prazo)}`);
    pus(k.exigencia_prazo, `A exigência tem de ser cumprida até ${fmtBarra(k.exigencia_prazo)}`);
    for(const p of (k.prazos_tribunal||[])){ const d = dataDoPrazo(p); let fav = null; try{ fav = atoFavoravelDoPrazo(k, p); }catch(e){}
      if(d && p.situacao!=="findo" && !fav) pus(d, `O prazo do ${ROT_PRAZO[p.sistema]||p.sistema||"tribunal"} vence em ${fmtBarra(d)}`); }
    const ev = (D.eventos||[]).filter(e=>e.caso_id===k.id && !/cancel|realiz/.test(e.status||"") && dataSP(e.data_hora)>=hj && !ehJulgamentoEv(e))
      .sort((a, b)=>a.data_hora<b.data_hora ? -1 : 1)[0];
    if(ev) pus(dataSP(ev.data_hora), `A ${tipoEv(ev.tipo).toLowerCase()} é em ${fmtBarra(dataSP(ev.data_hora))}`);
  }
  return out.sort((a, b)=>a.d<b.d ? -1 : a.d>b.d ? 1 : 0);
}
function quadroProvidenciar(c){
  // F236 · o caso em Pagamentos (implantado, RPV ou precatório) não tem pedido novo a montar: a lista de pedido criava tarefa
  // de documento com prazo num caso que só espera o crédito e os honorários
  const kV = casoDaVez(c);
  if(kV && kV.fase==="pagamento") return `<section class="doc-quadro" id="dq-prov"><div class="rotulo-caso">Para o cliente providenciar</div>
    <p class="meio-sub">O caso ${esc(tituloCaso(kV))} está em Pagamentos: não há pedido novo a montar. O que vale nesta fase é o contrato (a cláusula dos honorários, na aba Honorários), a requisição e o comprovante do depósito, que chegam pelos autos.</p></section>`;
  const cats = catalogosDaAnalise(c), ped = pedidosDaAnalise(c);
  // F236 · "pelo que a análise viu" só com análise registrada; sem ela, a lista vem dos requisitos da espécie (do caso, sem pré-caso)
  const tituloPed = analisesDaVez(c)[0] ? "Pedir ao cliente, pelo que a análise viu"
    : `Pedir ao cliente, pelos requisitos ${kV ? `da espécie do caso${kV.especie ? ` (${kV.especie})` : ""}` : "do benefício marcado"}; nenhuma análise registrada`;
  // F235 · com catálogo, o pedido da análise vai como caixa marcada dentro da lista impressa (#at-docs); este bloco fica para quando não há catálogo
  const blocoPed = ped.length ? `<div class="doc-pedidos"><b>${esc(tituloPed)}</b><ul>${ped.map(t=>`<li>${esc(t)}</li>`).join("")}</ul></div>` : "";
  if(!cats.length) return `<section class="doc-quadro" id="dq-prov"><div class="rotulo-caso">Para o cliente providenciar</div>${blocoPed}
    <p class="meio-sub">${opcoesSel(c).length ? `O catálogo de documentos ainda não tem ${esc(opcoesSel(c).map(o=>o.rot).join(", "))}: use o catálogo completo, abaixo.` : "Marque um benefício no Primeiro atendimento ou na Análise de Direito para a lista aparecer."}</p></section>`;
  const cli = [], temos = [], escr = []; let fora = 0;
  // F235 · a entrega não pode passar do prazo do pedido: o papel impresso marcava hoje + 15 dias depois do vencimento
  // F236 · nem do prazo do caso, do tribunal, da exigência ou da perícia marcada (limitesDaEntrega), e cai em dia útil
  const lim = limitesDaEntrega(c, kV)[0] || null, hjE = hoje();
  let entrega = lim && lim.d <= somaDias(hjE, 15) ? somaDias(lim.d, -1) : somaDias(hjE, 15);
  while(entrega > hjE && !ehDiaUtil(entrega)) entrega = somaDias(entrega, -1);
  if(entrega < hjE) entrega = hjE;
  // F235 · nas aposentadorias urbanas, a lista para o cliente segue o dossiê: a CTPS vai marcada a quem foi empregado (no tempo de
  // contribuição, só com vínculo pendente), e as seções e os papéis de autônomo, empresa, rural, especial, deficiência, servidor, acerto
  // e jornada só aparecem com sinal no CNIS, nos papéis, no PPP ou na análise; o mesmo papel em duas aposentadorias sai uma vez
  const RX_URB = /^Apos\. (por Idade|Tempo de Contribuição|do Professor)$/;
  let sinal = null, pendEmp = false;
  if(cats.some(cat=>RX_URB.test(cat.beneficio||""))) try{
    const g0 = cnisDe(c) || {}, vs0 = (g0.vinculos||[]).filter(v=>v.tipo!=="Benefício"), fd0 = fontesDoDossie(c.id), adm0 = admDe(c), ops0 = opcoesSel(c).map(o=>o.o), val0 = adm0.valores || {}, tp0 = adm0.tempos || [];
    const pendP = v => (v.indicadores||[]).some(i=>tipoIndicador(i.codigo||i)==="P");
    let parados = []; try{ parados = vinculosSemSaida(g0).filter(v=>!v.emCurso && !v.servidor && !v.suspenso); }catch(e){}
    pendEmp = parados.length > 0 || vs0.some(v=>/empregad/i.test(v.tipo||"") && pendP(v));
    sinal = {emp: vs0.some(v=>/empregad/i.test(v.tipo||"")), ci: vs0.some(v=>/individual/i.test(v.tipo||"")) || (fd0.cnpjs||[]).length > 0,
      empresa: (fd0.cnpjs||[]).length > 0 || vs0.some(v=>/\bMEI\b/.test(`${v.tipo} ${(v.indicadores||[]).map(i=>i.codigo||i).join(" ")}`)),
      carne: vs0.some(v=>/individual|facultativ/i.test(v.tipo||"")), rural: papeisRurais(c.id).length > 0 || tp0.some(r=>r.nat==="rural"),
      esp: (fd0.ppps||[]).length > 0 || tp0.some(r=>r.nat==="especial") || /^Sim/.test(val0.tra_especial||"") || ops0.some(o=>/^(b46|conv)$/.test(o)),
      def: ops0.some(o=>/^pcd/.test(o)) || tp0.some(r=>r.nat==="defic"),
      serv: vs0.some(v=>/RPPS|regime pr[óo]prio|servidor|prefeitura|munic[íi]pio|secretaria|governo do estado/i.test(`${v.tipo} ${v.origem}`)) || tp0.some(r=>r.nat==="rpps"),
      acerto: pendEmp || vs0.some(pendP)};
  }catch(e){ sinal = null; }
  const SEC_SINAL = [[/autonomo|\bmei\b/, "ci"], [/rura/, "rural"], [/especial|\bppp\b/, "esp"], [/deficien/, "def"], [/servidor/, "serv"], [/acerto de cnis/, "acerto"], [/jornada|horas extras/, ""], [/vinculos clt|trabalho urbano/, "emp"]];
  const tres = l => dsa(l.split(" — ")[0]).replace(/\bir\b/g, "imposto").replace(/[^a-z0-9]+/g, " ").trim().split(" ").slice(0, 3).map(w=>w.length > 3 ? w.replace(/s$/, "") : w).join(" ");
  const declEscola = ped.some(t=>/declara/i.test(t) && /escola/i.test(t));
  const valeUrb = (cat, x) => { const secDe = new Map(); let s = "";
    for(const l of String(cat.extras||"").split("\n").map(z=>z.trim())){ if(l.startsWith("▸")) s = dsa(l); else if(l) secDe.set(l, s); }
    const sec = secDe.get(x.l) || "", n = dsa(x.l.split(" — ")[0]), rg = SEC_SINAL.find(([rx])=>rx.test(sec));
    if(/extrato do cnis|\bdtc\b/.test(n)) return true;
    if(!sinal.empresa && /ccmei|microempreendedor|das do mei|alvara|contrato social|\bsocio\b/.test(n)) return false;
    if(/\bgps\b/.test(n) && (!rg || rg[1]==="ci")) return sinal.carne;
    if(rg && !(rg[1] && sinal[rg[1]])) return false;
    if(!sec && !sinal.ci && /notas fiscais emitidas|inscricao em orgao|inscricao no iss|\brpa\b|recibo de prestacao|prestacao de servico|pro-labore|cooperativa|gfip com/.test(n)) return false;
    if(declEscola && /declaracao do estabelecimento de ensino/.test(n)) return false;
    return sinal.serv || !/portarias? de nomeacao|ata de posse|historico funcional/.test(n); };
  const ctpsBase = cat => sinal.emp && (cat.beneficio!=="Apos. Tempo de Contribuição" || pendEmp);
  for(const cat of cats){ const r = docsContraDossie(c, cat); fora += r.fora || 0;
    if(sinal && RX_URB.test(cat.beneficio||"")) r.cliente = r.cliente.filter(x=>valeUrb(cat, x)).map(x=>{
      const y = !x.base && cli.find(z=>!z.base && z.bens.some(b=>RX_URB.test(b)) && tres(z.l)===tres(x.l));
      return {...x, l: y ? y.l : x.l, base: x.base || (ctpsBase(cat) && /carteira de trabalho|\bctps\b/.test(dsa(x.l)))}; });
    for(const [lista, dest] of [[r.cliente, cli],[r.temos, temos],[r.escritorio, escr]]) for(const x of lista){
      const k = dsa(x.l.split(" — ")[0]), j = dest.find(y=>y.k===k);
      if(j){ j.bens.push(cat.beneficio); j.base = j.base || x.base; continue; }
      dest.push({...x, k, bens:[cat.beneficio]}); } }
  // F235 · o mesmo arquivo do dossiê respondia várias linhas (a carta três vezes, o CNIS três): fica a primeira
  const kTem = t => (t.anexos||[]).map(a=>a.id).join() + "|" + dsa(t.l).split(/\s+/)[0];
  temos.splice(0, temos.length, ...temos.filter((t, i)=>!(t.anexos||[]).length || temos.findIndex(u=>kTem(u)===kTem(t))===i));
  const pedidos = (c.campos||{}).docs_pedidos||[], jaPedido = new Set(pedidos.flatMap(p=>(p.itens||[]).map(i=>dsa(i.nome||i))));
  // F236 · o documento que o caso já pediu (o 📄 aberto, com o título da lista) fica "já pedido" e não vem marcado de novo:
  // "Imprimir e registrar o pedido" duplicava o checklist do caso
  if(kV) for(const t of (D.tarefas||[])) if(t.caso_id===kV.id && !t.concluida && /^📄/.test(t.titulo||"")) jaPedido.add(dsa(semEmoji(t.titulo).trim()));
  // F236 · o pedido já feito (INSS ou Conselho) já usou os papéis de base: a lista vem desmarcada, e no alto vai o que a
  // exigência (ou a diligência) pede, marcado, com a declaração de que não tem outros documentos (IN 128, art. 566, §§ 3º e 5º)
  const feitoEm = kV && /^(inss|conselho)$/.test(faseEfetiva(kV)||kV.fase) && (kV.der || (kV.protocolos||[]).length) ? (kV.der || "-") : null;
  // a ação já distribuída também já usou os papéis de base (a inicial foi com eles)
  const distrib = !!(kV && faseEfetiva(kV)==="judicial" && (kV.ajuizado_em || processosDoCaso(kV).some(p=>p.nosso)));
  const exigTxt = feitoEm && emExigencia(kV) ? String(kV.exigencia_descricao||"").replace(/\s*·\s*prazo estimado:[\s\S]*$/i, "").replace(/\s+/g, " ").trim() : "";
  const dilig = !!exigTxt && (faseEfetiva(kV)==="conselho" || /dilig[êe]ncia/i.test(exigTxt));
  const blocoExig = !exigTxt ? "" : `<div class="doc-pedidos"><b>O que ${dilig ? "a diligência do CRPS" : "a exigência do INSS"} pede</b> <small class="meio-sub">· marcado para a lista impressa</small>
    <label class="doc-it base"><input type="checkbox" class="at-doc" value="${esc(`${dilig ? "Diligência do CRPS" : "Exigência do INSS"}: ${exigTxt}`)}" checked><span>${esc(exigTxt)}</span></label>
    ${dilig ? "" : `<label class="doc-it"><input type="checkbox" class="at-doc" value="Declaração do cliente de que não tem outros documentos"><span>Declaração do cliente de que não tem outros documentos — se não conseguir o que foi pedido: com ela, o INSS decide o mérito com o que há (IN 128, art. 566, §§ 3º e 5º)</span></label>`}</div>`;
  const linha = x => `<label class="doc-it${x.base?" base":""}" title="${esc(x.bens.join(" · "))}"><input type="checkbox" class="at-doc" value="${esc(x.l)}" ${x.base && !jaPedido.has(x.k) && !feitoEm && !distrib?"checked":""}><span>${esc(x.l)}${
    x.r.quem ? ` <small class="doc-quem">· ${esc(x.r.quem)}</small>` : ""}${x.negativo ? ` <small class="doc-neg">· o portal informou: ${esc(x.negativo)}</small>` : ""}${jaPedido.has(x.k) ? ` <small class="doc-ja">· já pedido</small>` : ""}</span></label>`;
  const base = cli.filter(x=>x.base), extras = cli.filter(x=>!x.base), nomes = cats.map(x=>x.beneficio).join(" · ");
  return `<section class="doc-quadro" id="dq-prov"><div class="rotulo-caso">Para o cliente providenciar <span class="meio-sub">${esc(nomes)} · ${cli.length} itens</span></div>
    <p class="meio-sub">A lista da espécie, sem o que já veio pelos portais (está no quadro seguinte)${fora ? `; ${plu(fora, "exame de outra região do corpo ficou", "exames de outras regiões do corpo ficaram")} de fora` : ""}.</p>
    ${lim ? `<p class="doc-prazo">${esc(lim.txt)} (${faltamTxt(lim.d)}): a entrega dos documentos é antes dessa data${lim.ne ? `, e ${lim.ne} não espera por eles` : ""}.</p>` : ""}
    ${feitoEm || distrib ? `<p class="meio-sub">${distrib ? "A ação já foi distribuída" : `O pedido já foi feito${feitoEm!=="-" ? ` em ${fmtBarra(feitoEm)}` : ""}`}: a lista da espécie vem desmarcada; marque só o que ainda falta trazer.</p>` : ""}
    <div id="at-docs" class="doc-lista">${blocoExig}${ped.length ? `<div class="doc-pedidos"><b>${esc(tituloPed)}</b> <small class="meio-sub">· já marcados para a lista impressa</small>${ped.map(t=>`<label class="doc-it base"><input type="checkbox" class="at-doc" value="${esc(t)}" checked><span>${esc(t)}</span></label>`).join("")}</div>` : ""}${base.map(linha).join("")}${extras.length > 8
      ? `<details class="doc-mais"><summary class="cc-tit" style="color:var(--laranja);padding:8px 0 3px;cursor:pointer">Conforme a atividade do cliente: mais ${extras.length} papéis que também servem — abra para marcar o que a pessoa tem</summary>${extras.map(linha).join("")}</details>`
      : extras.length ? `<div class="cc-tit" style="color:var(--laranja);padding:8px 0 3px">Conforme a atividade do cliente — marque o que se aplica</div>${extras.map(linha).join("")}` : ""}</div>
    <div class="form-linha" style="margin-top:6px;align-items:center">
      <input id="at-doc-extra" placeholder="outro documento — Enter acrescenta" style="flex:1;min-width:200px" onkeydown="if(event.key==='Enter'){event.preventDefault();docExtraAtendimento();}">
      <label class="meio-sub" title="vencida a data, o pedido aparece no Meu Dia para cobrar">entrega até <input type="date" id="at-doc-ate" min="${hoje()}" value="${entrega}"></label>
      <button onclick="pedirDocsAtendimento('${c.id}','${escJs(nomes)}')" title="Imprimir e registrar o pedido">Imprimir<span class="sr-only"> e registrar o pedido</span></button></div>
    ${pedidos.length ? pedidosHtml(c, pedidos) : ""}
    ${escr.length ? `<div class="doc-escr"><b>O escritório obtém</b><ul>${escr.map(x=>`<li>${esc(x.l.split(" — ")[0])}${x.r.nota?` <small>· ${esc(x.r.nota)}</small>`:""}</li>`).join("")}</ul></div>` : ""}
  </section>
  <section class="doc-quadro" id="dq-temos"><div class="rotulo-caso">Já temos no dossiê <span class="meio-sub">${temos.length} ${temos.length===1?"item":"itens"}</span></div>
    ${temos.length ? `<ul class="doc-temos">${temos.map(x=>`<li>${esc(x.l.split(" — ")[0])}${(c0=>c0 ? ` <small>· ${esc(c0)}</small>` : "")([x.r.cobre ? x.r.cobre(c) : "", provaPcdNoDoc(c, x.anexos)].filter(Boolean).join("; "))}${x.anexos.length ? ` <span>${x.anexos.slice(0,3).map(a=>`<button class="arq-abrir" onclick="abrirAnexo('${a.id}')">ver ${esc(String(a.nome||"").split(" · ").pop().replace(/\.(pdf|txt)$/i,""))}</button>`).join("")}</span>` : " <small>· na ficha</small>"}</li>`).join("")}</ul>`
      : `<p class="meio-sub">${docsDoDossie(c.id).length ? "Nenhum item do catálogo veio pelo dossiê." : "O dossiê ainda não foi baixado: rode a extensão com o gov.br do cliente."}</p>`}
  </section>`;
}
// F236 · a guia do pedido já feito (no INSS ou no Conselho): no lugar do "Ainda não pedir", o que decide o pedido e, na
// exigência, a conta com o período que ela discute (o vínculo que o CNIS não traz)
function mesesDaExigencia(k, x){
  const m = String(k.exigencia_descricao||"").match(/(\d{2})\/(\d{2})\/(\d{4})\s*(?:a|até)\s*(\d{2})\/(\d{2})\/(\d{4})/);
  if(!m) return null;
  const ini = `${m[3]}-${m[2]}`, fim = `${m[6]}-${m[5]}`; if(ini > fim) return null;
  const ps = ((x && x.ct)||{}).periodos||[];
  let n = 0;
  for(let ym = ini; ym <= fim; ym = somarMeses(`${ym}-01`, 1).slice(0,7)) if(!ps.some(([a, b])=>a<=ym && ym<=b)) n++;
  return {de:`${m[1]}/${m[2]}/${m[3]}`, ate:`${m[4]}/${m[5]}/${m[6]}`, meses:n};
}
function decideDoPedido(k, txt, x){
  // a pergunta do planejamento ("Responda … para ver a data") não serve ao pedido já feito
  const t = cap1(String(txt||"").replace(/^(?:[^?.]*\?\s*)?(?:Ainda não|Não cabe)[.:]?\s*/i, "").replace(/\s*Responda\s+["“][^"”]*["”][^.]*\./g, "").trim()), exig = emExigencia(k);
  const ex = exig ? mesesDaExigencia(k, x) : null, car = x && x.ct ? x.ct.carencia : null;
  const conta = ex && ex.meses && car!=null ? ` Com o período que a exigência discute (${ex.de} a ${ex.ate}, ${plu(ex.meses, "mês", "meses")} que o CNIS não traz), são ${car + ex.meses} contribuições.` : "";
  return `<p class="doc-decide"><b>Pedido feito${k.der ? ` em ${fmtBarra(k.der)}` : ""}${exig ? ", em exigência" : ""}; o que decide:</b> ${esc(t)}${esc(conta)}${
    exig ? esc(` Cumprir a exigência${k.exigencia_prazo ? ` até ${fmtBarra(k.exigencia_prazo)}` : ""} com a prova pedida é o que pode mudar a conta.`) : ""}</p>`;
}
function quadroGuias(c){
  const ks = D.casosDoCliente.get(c.id)||[], g0 = cnisDe(c) || {};
  // F236 · o caso em Pagamentos não pede guia de pedido novo
  const kV = casoDaVez(c);
  if(kV && kV.fase==="pagamento") return `<section class="doc-quadro" id="dq-guias"><div class="rotulo-caso">Guias e formulários</div>
    <p class="meio-sub">O caso está em Pagamentos: as guias de pedido não servem a ele. Para um pedido novo, abra um atendimento.</p></section>`;
  // o pedido feito do MESMO benefício da guia (a guia do pré-caso novo não fala do pedido de outro caso)
  const kpDe = op => _atendAberto.has(c.id) && preCasoAberto(c) ? null
    : [kV, ...ks].find(k=>k && !k.pre_caso && k.fase!=="encerrado" && /^(inss|conselho)$/.test(faseEfetiva(k)||k.fase) && (k.der || (k.protocolos||[]).length)
      && (opcaoDe(k.subespecie || k.especie || k.beneficio)||{}).o===op) || null;
  const temRpps = (g0.vinculos||[]).some(v=>/RPPS|regime pr[óo]prio|servidor|prefeitura|munic[íi]pio|secretaria|governo do estado/i.test(`${v.tipo} ${v.origem}`));
  const pext = (g0.vinculos||[]).filter(v=>(v.indicadores||[]).includes("PEXT"));
  // F235 · o RAC só para pendência que se corrige por formulário (o IEAN, o PRPPS e o carnê reduzido não se corrigem assim)
  const pendRac = [...(g0.indicadores||[]).map(i=>String(i.codigo||i)), ...(g0.vinculos||[]).flatMap(v=>(v.indicadores||[]).map(String))]
    .some(k=>tipoIndicador(k)!=="I" && !/^(IEAN|PRPPS|IREC|PREC-FBR|PREC-MENOR)/.test(k));
  const ieanRac = (g0.vinculos||[]).some(v=>(v.indicadores||[]).some(i=>/^IEAN/.test(String(i)))) || (g0.indicadores||[]).some(i=>/^IEAN/.test(String(i.codigo||i)));
  // F235 · por benefício: o que dá para fazer neste caso (o mesmo quadro da Análise de Direito) e, sem o direito, "ainda não pedir"
  const doCaso = o => { let x = null, a = null; try{ x = reqCtx(c, ks, o.o); a = avaliarReq(o.o, x); }catch(e){ return {}; }
    let agora = []; try{ agora = ((REQ_EXTRA[o.o]||{}).agora ? REQ_EXTRA[o.o].agora(x, a) : []) || []; }catch(e){}
    const ve = a ? vereditoReq(o.o, x, a) : null, apos = /^(idade|transicao|professor|pcd|pcd_idade|b46|conv|idade_rural|hibrida)$/.test(o.o);
    // F235 · o catálogo pode dizer "ainda não pedir" fora das aposentadorias (o auxílio-doença sem qualidade na DII) e dar a guia do caso (a troca 32 → 92)
    let np = "", gx = null; try{ const ex = REQ_EXTRA[o.o]||{}; np = ex.naoPedir ? ex.naoPedir(x, a) || "" : ""; gx = ex.guia ? ex.guia(x, a) : null; }catch(e){}
    // F235 · a conversão que manda pedir já (com o PPP que falta) vai dentro da B42: a guia da B42 não diz "Ainda não pedir"
    let pelaConv = false; try{ pelaConv = o.o==="transicao" && opcoesSel(c).some(z=>z.o==="conv") && !!((REQ_EXTRA.conv||{}).desfecho && REQ_EXTRA.conv.desfecho(reqCtx(c, ks, "conv"), null)); }catch(e){}
    return {agora, x, naoPedir: apos && ve && (ve.tom==="ainda" || ve.tom==="nao") && !pelaConv ? ve.txt : np, ...(gx ? {g:gx} : {}), guia: (ve && ve.guia) || ""}; };   // F235 · o catálogo pode trocar a guia
  const gs = opcoesSel(c).map(o=>({o, g:GUIAS_ESPECIE[o.o], ...doCaso(o)})).filter(x=>x.g)
    .map(x=>({...x, anexos: x.g.anexos.filter(n=>temRpps || !/CTC do RPPS/.test(n))}));
  const sv = servicoDoPreCaso(c);
  // F235 · o serviço do pré-caso leva às guias o mesmo "o que dá para fazer agora" da Análise de Direito
  if(sv) gs.unshift({o:{rot:SERV_CAT[sv].beneficio}, g:{...GUIAS_SERV[sv], anexos:[]}, anexos:[], agora:(doCaso({o:sv}).agora||[]), naoPedir:""});
  const link = rot => { const a = ANEXOS_IN128.find(x=>x[0]===rot);
    return a ? `<a class="cad-mini" style="text-decoration:none" href="${IN128_BASE}${a[1]}" target="_blank" rel="noopener" title="${esc(a[2] ? "IN 128, "+a[2] : "sem artigo da IN 128 localizado")}">${esc(rot)}</a>`
             : `<a class="cad-mini" style="text-decoration:none" href="${PORTAL_ANEXOS}" target="_blank" rel="noopener" title="localizar na página de anexos do portal">${esc(rot)} ↗</a>`; };
  return `<section class="doc-quadro" id="dq-guias"><div class="rotulo-caso">Guias e formulários <span class="meio-sub">${gs.length ? "por benefício e serviço em análise" : "marque um benefício no Primeiro atendimento ou na Análise de Direito"}</span></div>
    ${gs.map(({o, g, anexos, agora, naoPedir, guia, x})=>`<div class="doc-guia"><b>${esc(o.rot)}</b>
      ${naoPedir ? (kp=>kp ? decideDoPedido(kp, naoPedir, x) : `<p class="doc-nao-pedir"><b>Ainda não pedir.</b> ${esc(naoPedir)}</p>`)(kpDe(o.o)) : `<span class="meio-sub">${esc(guia || g.servico)}</span>`}
      ${agora.length ? `<ol class="doc-agora">${agora.map(t=>`<li>${esc(t)}</li>`).join("")}</ol>` : ""}
      ${!naoPedir && !guia && anexos.length ? `<div class="form-linha" style="flex-wrap:wrap;margin-top:4px">${anexos.map(link).join("")}</div>` : ""}
      ${!naoPedir && !guia && !pendRac && o.o!=="acerto" && anexos.some(n=>/^RAC /.test(n)) ? `<p class="meio-sub">O CNIS não tem pendência que se corrija por RAC: os anexos ficam só para o caso de aparecer alguma${ieanRac ? " (o IEAN só informa a exposição a agente nocivo, e não é erro)" : ""}.</p>` : ""}
      ${!naoPedir && !guia && pext.length && anexos.some(n=>/Anexo I-B/.test(n)) ? `<p class="meio-sub">Para o vínculo lançado fora do prazo (PEXT) ${esc(pext.map(v=>`na ${tituloOrgao(v.origem||"empresa")}`).join(" e "))}: RAC Vínculos (Anexo I-B), com a carteira de trabalho e os holerites (conferir com o advogado).</p>` : ""}
      ${!naoPedir && !guia && g.nota ? `<p class="meio-sub">${esc(g.nota)}</p>` : ""}</div>`).join("")}
    ${/* F236 · depois do protocolo, o texto diz o protocolo e a DER, e não "antes de protocolar" */""}${(kp=>kp ? `<p class="meio-sub">Protocolado${kp.der ? ` em ${fmtBarra(kp.der)}` : ""}${(kp.protocolos||[]).length ? ` (protocolo ${esc(kp.protocolos[0])})` : ""}: guarde nos anexos do caso o comprovante e a tela de resumo do pedido; o que se declarou no formulário vale como prova e é o que o juiz vai conferir depois. Os demais anexos ficam no catálogo completo, abaixo.</p>`
      : ks.some(k=>!(_atendAberto.has(c.id) && preCasoAberto(c)) && !k.pre_caso && ["judicial","peticao_inicial"].includes(k.fase)) ? `<p class="meio-sub">O caso já está na Justiça: estas guias servem a um pedido administrativo novo. Os demais anexos ficam no catálogo completo, abaixo.</p>`
      : `<p class="meio-sub">Antes de protocolar, guarde o comprovante e a tela de resumo do pedido: o que se declara no formulário vale como prova e é o que o juiz vai conferir depois. Os demais anexos ficam no catálogo completo, abaixo.</p>`)(_atendAberto.has(c.id) && preCasoAberto(c) ? null : ks.find(k=>!k.pre_caso && k.fase!=="encerrado" && (k.der || (k.protocolos||[]).length)))}</section>`;
}
function quadroGerados(c){
  // F236 · entra o contrato assinado anexado na aba Honorários (o anexo "Contrato assinado …", das versões sem origem)
  const assin = a => a.origem==="assinado" || /^Contrato assinado/.test(a.nome||"");
  const ds = (D.anexos||[]).filter(a=>a.cliente_id===c.id && (a.origem==="gerado" || assin(a))).sort((p, q)=>String(q.criado_em||"").localeCompare(String(p.criado_em||"")));
  const temProc = ds.some(a=>/procura/i.test(a.nome||"")), temContr = ds.some(a=>/contrato/i.test(a.nome||""));
  const quem = a => { const co = D.colPorId.get(a.autor_id); return co ? co.nome.split(" ")[0] : ""; };
  return `<section class="doc-quadro" id="dq-gerados"><div class="rotulo-caso">Gerados e assinados <span class="meio-sub">${ds.length} ${ds.length===1?"documento":"documentos"}</span></div>
    ${ds.length ? `<ul class="mov-lista">${ds.map(a=>`<li><span class="mov-data">${fmtTS(a.criado_em)}</span><span class="mov-txt">${assin(a)?"✍ ":"🖨 "}${esc(a.nome)}${quem(a)?` <small>· ${esc(quem(a))}</small>`:""}</span>
      <button class="btn-mini" onclick="abrirAnexo('${a.id}')">${assin(a)?"abrir":"abrir e reimprimir"}</button>
      <button class="btn-mini" onclick="docAoZap('${a.id}')" title="mandar ao cliente pelo WhatsApp, em PDF">${iconeFonte("zap")}</button></li>`).join("")}</ul>`
      : `<p class="meio-sub">Nada gerado ainda. Cada documento gerado no primeiro quadro fica guardado aqui, com as lacunas que saíram em branco.</p>`}
    <div class="form-linha" style="margin-top:6px;align-items:center">
      <label class="cad-mini" style="cursor:pointer" title="o PDF ou a foto do documento assinado pelo cliente"><input type="file" id="doc-assinado" accept="image/*,application/pdf" style="display:none" onchange="anexarAssinado('${c.id}','doc-assinado')">Anexar o assinado</label>
      <span class="meio-sub">${(D.casosDoCliente.get(c.id)||[]).some(k=>!k.pre_caso && k.fase!=="encerrado") && !(_atendAberto.has(c.id) && preCasoAberto(c)) ? "o caso já existe: o que for assinado daqui em diante fica guardado aqui"
        : temProc && temContr ? "procuração e contrato gerados: o caso pode nascer" : "o caso nasce com a procuração e o contrato gerados e assinados"}</span></div></section>`;
}

// ── O QUADRO DO ATENDIMENTO ───────────────────────────────────────────────
// Cliente sem caso anotado: é aqui que o atendimento vive até virar caso.
// Anotação do que o cliente contou + a espécie do benefício/serviço (que pode
// ficar "ainda não definido") + a lista de documentos que o cliente vai
// trazer — impressa para ele e registrada no CRM.
// ══════════════════════════════════════════════════════════════════════════
// F25 · O PRÉ-CASO — a mesa do primeiro atendimento (pedido do Paulo)
// ══════════════════════════════════════════════════════════════════════════
// "Gerado o caso" é quando saem as procurações e o cliente assina o contrato.
// Antes disso existe o pré-caso: a espécie que se desenha, os marcadores
// (rural, especial, deficiência), a natureza (concessão, revisão, acerto),
// os honorários combinados e as anotações de cada conversa. Tudo com autor.
// Mora em clientes.campos.precasos; o cliente fica AMARELO, na lista
// Escritório, até o caso nascer — e pode haver mais de um pré-caso.
// F226 · o pré-caso é LINHA DE CASOS (pre_caso = true, fase Escritório), com o
// objeto em casos.precaso e a espécie em beneficio (docs/PRE-CASOS.md). O id do
// objeto continua o de antes (pc_…), porque anotações e cards o citam. O que
// ainda estiver em campos.precasos é lido até a primeira gravação.
const ehPreCaso = k => !!(k && k.pre_caso && k.fase==="escritorio");
// o passo do atendimento em que o pré-caso está (as etapas que concluirEtapa grava)
function passoDoPreCaso(k){
  const e = (k.precaso||{}).etapas||{};
  const p = [["identificacao","Identificação"],["pa","Primeiro atendimento"],["analise","Análise de Direito"],["documentos","Documentos"]].find(([x])=>!e[x]);
  return p ? p[1] : "Criar caso";
}
function linhasPreCaso(cliId){
  return (D.casosDoCliente.get(cliId)||[]).filter(k=>k.pre_caso && (k.fase==="escritorio" || (k.precaso||{}).so_lembrete))
    .sort((a,b)=>String((a.precaso||{}).em||a.criado_em||"").localeCompare(String((b.precaso||{}).em||b.criado_em||"")));
}
function precasosDe(c){
  const cp = c.campos||{};
  const linhas = linhasPreCaso(c.id).map(k=>({...(k.precaso||{}), id:(k.precaso||{}).id||k.id, especie:k.beneficio||"", caso_id:k.id}));
  const ids = new Set(linhas.map(p=>p.id));
  const pcs = [...linhas, ...(cp.precasos||[]).filter(p=>!ids.has(p.id))];
  // legado: a espécie única de antes vira o primeiro pré-caso, na leitura
  if(!pcs.length && cp.especie && cp.especie!==ESPECIE_PAGAMENTOS)
    return [{id:"legado", especie:cp.especie, natureza:"", marc:{}, honorarios:"", quem:null, em:null}];
  return pcs;
}
// F601 · os pré-casos da ficha: vivos (sem o "legado" da espécie única) e arquivados
// F602 · o arquivado também é a linha de casos encerrada com precaso.arquivo (pelo CRM ou concluída no To Do)
function pcDaFicha(c){
  const vivos = precasosDe(c).filter(p=>p.id!=="legado" && !p.arquivo);
  const linhasArq = (D.casosDoCliente.get(c.id)||[]).filter(k=>k.pre_caso && k.fase==="encerrado" && (k.precaso||{}).arquivo)
    .map(k=>{ const p = k.precaso||{}, a = p.arquivo||{};
      return {...p, id:p.id||k.id, especie:k.beneficio||"", caso_id:k.id,
        desfecho:{motivo:a.motivo || (a.origem==="todo" ? "concluída no To Do" : ""), em:a.em}}; });
  const ids = new Set([...vivos, ...linhasArq].map(p=>p.id));
  const arq = [...linhasArq, ...((c.campos||{}).pc_arquivados||[]).filter(p=>!ids.has(p.id))];
  return {lista:vivos, arq, vivos:vivos.filter(p=>!p.so_lembrete).length, n:vivos.length+arq.length};
}
const PC_MOVER_LIGADO = false;
const PC_ESTADOS = [["ativo","Ativo"],["futuro","Futuro"],["arquivo","Arquivo"],["caso","Gerar caso"]];
function estadoPc(p, fora){ return fora ? "arquivo" : p.so_lembrete ? "futuro" : "ativo"; }
// F668 · onda 1 do caso em formação (aprovada pelo Paulo em 21.11.2026): a aba Pré-caso saiu do menu; o pré-caso
// é o próprio caso, com o selo "Em formação" no Casos ▾ e este quadro no alto da tela do caso
const nomePc = e => esc(e ? ((ESPECIES.find(([x])=>x===e)||[])[1] ? `${e} · ${ESPECIES.find(([x])=>x===e)[1]}` : e) : "Benefício a definir");
const PC_PASSOS = [["identificacao","Identificação"],["pa","1º atendimento"],["analise","Análise de Direito"],["documentos","Documentos"]];
// F602b · até 31/12/2026 o estado vem só da lista do To Do (ordem do Paulo de 15.11.2026): sem botões de mover
function botoesMoverPc(p, fora){
  if(!PC_MOVER_LIGADO) return "";
  if(!p.caso_id || !D.casoPorId.get(p.caso_id) || !podeAtender()) return "";
  const at = estadoPc(p, fora);
  return `<div class="pc-mover" role="group" aria-label="Mover este pré-caso">${PC_ESTADOS.map(([e,r])=>
    e===at ? `<span class="pc-est on" aria-current="true">${r}</span>`
    : (fora && e==="caso") ? "" : `<button class="btn-mini" data-pc-mover="${esc(p.caso_id)}|${e}">${r}</button>`).join("")}</div>`;
}
function quadroEmFormacao(c, k){
  if(!k || !k.pre_caso || !c) return "";
  const z = pcDaFicha(c), id = x => x.caso_id===k.id;
  const p = z.lista.find(id), pa = !p && z.arq.find(id);
  if(!p && !pa) return "";
  const fora = !!pa, q = p || pa, d = q.desfecho||{}, et = (k.precaso||{}).etapas||{};
  const at = PC_PASSOS.findIndex(([x])=>!et[x]);
  const passos = fora || q.so_lembrete ? "" : `<ol class="pcq-passos" aria-label="Passos do atendimento">${PC_PASSOS.map(([x, r], i)=>
    `<li class="${et[x] ? "ok" : i===at ? "at" : ""}"${i===at ? ' aria-current="step"' : ""}>${et[x] ? "✓ " : ""}${r}</li>`).join("")}</ol>`;
  const est = fora ? "Pré-caso encerrado" : q.so_lembrete ? "Futuro · Aposentadorias futuras" : "Caso em formação";
  return `<section class="pc-quadro${fora ? " pc-arq" : ""}" aria-label="${est}">
    <div class="pcq-cab"><b>${est}</b> · ${nomePc(q.especie)}<span class="selo-form">${fora ? "Encerrado" : q.so_lembrete ? "Futuro" : "Em formação"}</span></div>
    <div class="pcq-corpo">${passos}
      ${fora ? `<div>${esc(d.motivo||"sem motivo registrado")}${d.em?` · ${fmt(String(d.em).slice(0,10))}`:""}</div>`
        : `<div>Lista no To Do: <b>${esc(listaDe(k)!=="—" ? listaDe(k) : q.so_lembrete ? "🙏 Aposentadorias Futuras" : "🙋 Escritório")}</b>${q.data_direito?` · direito provável em ${fmt(q.data_direito)}`:""}</div>`}
      ${!fora && !q.so_lembrete && podeAtender() ? `<div><button class="btn-mini pcq-cont" data-pc-abrir="${esc(q.id)}">Continuar atendimento</button></div>` : ""}
      ${botoesMoverPc(q, fora)}</div>
    ${retornoPcHtml(q, k, fora)}
    ${procAnteriorHtml(q, k, fora)}
    ${(ts=>ts.length?`<details class="pc-notas"${fora?"":" open"}><summary>Anotações do Microsoft To Do (${ts.length})</summary>${notasTodoHtml(ts)}</details>`:"")(notasTodoDoPc(c, q))}
  </section>`;
}
// F604 · o processo judicial anterior, de outro escritório (pedido do Paulo de 15.11.2026): fica no pré-caso,
// em casos.precaso.proc_anterior, só no CRM; serve à conferência de litispendência e coisa julgada
function procAnteriorHtml(p, k, fora){
  if(!k) return "";
  const v = (p.proc_anterior||{}).numero||"";
  if(fora || !(podeAtender() || podeCadastrar()))
    return v ? `<div class="pc-proc">Processo judicial anterior (outro escritório): <b>${esc(v)}</b></div>` : "";
  return `<div class="pc-proc"><label>Processo judicial anterior (outro escritório)
    <input type="text" data-pc-proc="${esc(k.id)}" value="${esc(v)}" maxlength="300" placeholder="Número do processo, se houver"></label>
    <button class="btn-mini" data-pc-proc-salvar="${esc(k.id)}">Salvar</button></div>`;
}
// F606 · a data de retorno do pré-caso (pedido do Paulo de 15.11.2026, a última linha do padrão das anotações):
// fica em casos.precaso.retorno = {data, motivo, em, por}, só no CRM, e entra no Meu Dia e na aba Prazos
function retornoPcHtml(p, k, fora){
  if(!k || fora) return "";
  const r = p.retorno||{};
  if(!(podeAtender() || podeCadastrar()))
    return r.data ? `<div class="pc-proc">Retorno: <b>${fmt(r.data)}</b>${r.motivo?` · ${esc(r.motivo)}`:""}</div>` : "";
  return `<div class="pc-proc"><label>Data de retorno
    <input type="date" data-pc-ret="${esc(k.id)}" value="${esc(r.data||"")}"></label>
    <label>Para quê <input type="text" data-pc-ret-mot="${esc(k.id)}" value="${esc(r.motivo||"")}" maxlength="200" placeholder="Opcional"></label>
    <button class="btn-mini" data-pc-ret-salvar="${esc(k.id)}">Salvar</button></div>`;
}
async function gravarRetornoPc(casoId, data, motivo){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const antes = k.precaso||{}, precaso = {...antes}, r0 = antes.retorno||{};
  const d = /^\d{4}-\d{2}-\d{2}$/.test(data||"") ? data : "", m = String(motivo||"").trim();
  if(d === (r0.data||"") && m === (r0.motivo||"")) return aviso("Sem alteração");
  if(d) precaso.retorno = {data:d, motivo:m||undefined, em:new Date().toISOString(), por:(eu||{}).id||null};
  else delete precaso.retorno;
  try { await patchCaso(casoId, {precaso}); } catch(e){ return aviso("Não gravei o retorno: " + (e.message||e)); }
  k.precaso = precaso;
  aviso(d ? `Retorno em ${fmt(d)} gravado` : "Retorno apagado");
}
async function gravarProcAnterior(casoId, valor){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const antes = k.precaso||{}, precaso = {...antes};
  const v = String(valor||"").trim();
  if(v === ((antes.proc_anterior||{}).numero||"")) return aviso("Sem alteração");
  if(v) precaso.proc_anterior = {numero:v, em:new Date().toISOString(), por:(eu||{}).id||null};
  else delete precaso.proc_anterior;
  try { await patchCaso(casoId, {precaso}); } catch(e){ return aviso("Não gravei o processo anterior: " + (e.message||e)); }
  k.precaso = precaso;
  aviso(v ? "Processo anterior gravado" : "Processo anterior apagado");
}
// F602 · Ativo, Futuro, Arquivo e Gerar caso: grava a linha na hora (com desfazer) e põe mover_para, que a
// ponte_precaso.py leva ao Microsoft To Do (cria na lista nova, conclui ou reabre) e menciona o Paulo
const PC_MOVER_PARA = {ativo:"🙋 Escritório", futuro:"🙏 Aposentadorias Futuras", arquivo:"concluir"};
function pedirPc(titulo, corpo, ok){
  return new Promise(res=>{
    caixa(`<div class="adr-modal" role="dialog" aria-label="${esc(titulo)}"><h3>${esc(titulo)}</h3>${corpo}
      <div class="adr-modal-bts"><button class="adr-bt" id="pcm-nao">Cancelar</button><button class="adr-bt adr-primario" id="pcm-ok">${esc(ok)}</button></div></div>`);
    const fim = v => { fecharCaixa(); res(v); };
    document.getElementById("pcm-nao").onclick = ()=>fim(null);
    document.getElementById("pcm-ok").onclick = ()=>{
      const vals = {}; document.querySelectorAll("[data-pcm]").forEach(i=>vals[i.dataset.pcm] = i.value.trim());
      const falta = [...document.querySelectorAll("[data-pcm][required]")].find(i=>!i.value.trim());
      if(falta){ falta.focus(); return aviso("Preencha o campo pedido"); }
      fim(vals);
    };
  });
}
async function moverPreCaso(cliId, casoId, estado){
  const k = D.casoPorId.get(casoId); if(!k || !podeAtender()) return;
  const antes = {fase:k.fase, pre_caso:k.pre_caso, precaso:k.precaso||{}, mover_para:k.mover_para||null, encerrado_em:k.encerrado_em||null};
  const p = {...antes.precaso}, sem = o => { const n = {...o}; delete n.so_lembrete; delete n.lembrete_id; delete n.arquivo; return n; };
  const voltar = async () => { await patchCaso(casoId, antes); Object.assign(k, antes); montarSidebar(); render(); abrirFicha(cliId); };
  let muda, msg;
  if(estado==="ativo"){
    muda = {fase:"escritorio", pre_caso:true, encerrado_em:null, precaso:sem(p), mover_para:PC_MOVER_PARA.ativo};
    msg = "Pré-caso em Ativo (🙋 Escritório)";
  } else if(estado==="futuro"){
    const v = await pedirPc("Mover para Futuro", `<label>Data provável do direito <input type="date" data-pcm="data" value="${esc(p.data_direito||"")}" required></label>`, "Mover");
    if(!v) return;
    muda = {fase:"encerrado", pre_caso:true, encerrado_em:antes.encerrado_em||new Date().toISOString(),
      precaso:{...sem(p), so_lembrete:true, lembrete_id:p.lembrete_id||null, data_direito:v.data}, mover_para:PC_MOVER_PARA.futuro};
    if(!muda.precaso.lembrete_id) delete muda.precaso.lembrete_id;
    if(p.lembrete_id) cardGravar(p.lembrete_id, cc=>{ cc.data_direito = v.data; cc.data_fonte = "informada no CRM"; });
    msg = "Pré-caso em Futuro (🙏 Aposentadorias Futuras)";
  } else if(estado==="arquivo"){
    const v = await pedirPc("Arquivar o pré-caso", `<label>Motivo <input type="text" data-pcm="motivo" required placeholder="por que não segue"></label>`, "Arquivar");
    if(!v) return;
    muda = {fase:"encerrado", pre_caso:true, encerrado_em:new Date().toISOString(),
      precaso:{...sem(p), arquivo:{em:hoje(), origem:"crm", motivo:v.motivo}}, mover_para:PC_MOVER_PARA.arquivo};
    msg = "Pré-caso arquivado (concluído no To Do)";
  } else if(estado==="caso"){
    const v = await pedirPc("Gerar o caso", `<label>Início <select data-pcm="inicio">${Object.keys(INICIO_FASE).map(x=>
        `<option value="${x}">${{inss:"INSS",conselho:"Conselho de Recursos",judicial:"Judicial"}[x]}</option>`).join("")}</select></label>
      <label>Número <input type="text" data-pcm="numero" placeholder="${esc(ROT_NUM_INICIO.inss)}"></label>`, "Gerar");
    if(!v) return;
    if(p.so_lembrete || p.arquivo || k.fase!=="escritorio"){
      const ativo = {fase:"escritorio", pre_caso:true, encerrado_em:null, precaso:sem(p)};
      await patchCaso(casoId, ativo); Object.assign(k, ativo);
    }
    const pcId = (k.precaso||{}).id || k.id;
    await mudarPreCasoCampos(cliId, pcId, x=>{ x.inicio = v.inicio; x.numero = v.numero; x.via = v.inicio==="judicial" ? "jud" : "adm"; });
    await gerarCasoDoPre(cliId, pcId);
    if(k.pre_caso) return;   // o gerarCasoDoPre recusou (espécie ou via a definir) e já avisou
    avisoDesfazer("Caso gerado do pré-caso", voltar, 30000);
    return;
  } else return;
  await patchCaso(casoId, muda); Object.assign(k, muda);
  avisoDesfazer(msg, voltar, 30000);
  montarSidebar(); render(); abrirFicha(cliId);
}
async function gravarPrecasos(cliId, pcs){
  const c = D.cliPorId.get(cliId); if(!c) return false;
  const antes = precasosDe(c);
  const linhaDe = pc => (pc.caso_id && D.casoPorId.get(pc.caso_id)) || linhasPreCaso(cliId).find(k=>((k.precaso||{}).id||k.id)===pc.id);
  try{
    for(const pc of pcs){
      const {caso_id, especie, ...precaso} = pc;
      const corpo = {beneficio:especie||null, precaso, fase:pc.so_lembrete ? "encerrado" : "escritorio"};
      const k = linhaDe(pc);
      if(k){
        if(k.beneficio===corpo.beneficio && k.fase===corpo.fase && JSON.stringify(k.precaso||{})===JSON.stringify(precaso)) continue;
        await api(`/rest/v1/casos?id=eq.${k.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"}, body:JSON.stringify(corpo)});
        Object.assign(k, corpo);
      } else {
        // o id nasce aqui: a linha entra na memória sem esperar a volta do banco
        const n = {...corpo, id:crypto.randomUUID(), cliente_id:cliId, titulo:c.nome, pre_caso:true, origem_lista:"🙋 Escritório", criado_em:new Date().toISOString()};
        await api(`/rest/v1/casos`,{method:"POST",headers:{Prefer:"return=minimal"}, body:JSON.stringify(n)});
        D.casos.push(n); D.casoPorId.set(n.id, n);
        if(!D.casosDoCliente.has(cliId)) D.casosDoCliente.set(cliId, []);
        D.casosDoCliente.get(cliId).push(n);
      }
    }
    // o que saiu da lista (arquivado, virou caso) encerra a linha
    for(const p of antes){
      if(pcs.some(x=>x.id===p.id)) continue;
      const k = linhaDe(p);
      if(!k || !k.pre_caso || k.fase==="encerrado") continue;
      const corpo = {fase:"encerrado", encerrado_em:new Date().toISOString()};
      await api(`/rest/v1/casos?id=eq.${k.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"}, body:JSON.stringify(corpo)});
      Object.assign(k, corpo);
    }
    // o cadastro grava junto, como antes (quem chama pode ter mexido em c.campos, ex.: honor_ajuste);
    // a linha passou a ser a fonte: campos.precasos (e a espécie única do legado) saem dele
    const campos = {...(c.campos||{})}; delete campos.precasos;
    if(pcs.some(p=>p.id==="legado")) delete campos.especie;
    await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"}, body:JSON.stringify({campos})});
    c.campos = campos;
    return true;
  }catch(e){ aviso("Não consegui guardar — tente de novo"); return false; }
}
