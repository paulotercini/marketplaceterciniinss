// F588 · Colaborador Claude: a pré-gravação (anotação, tarefa, peça, análise, Prazo da IA, regra proposta) só entra no caso com o ok
// do administrador ou do revisor indicado (rpc colab_aprovar). Caderno de regras e placar de 30 dias, só o administrador.
const COLAB_TIPO = {anotacao:"Anotação", tarefa:"Tarefa", peca:"Peça", analise:"Análise", prazo_ia:"Prazo da IA", regra:"Regra proposta"};
function colabAbertas(rows){
  return (rows||[]).filter(s=>s.estado==="aberta" && COLAB_TIPO[s.tipo] && (souAdmin() || (s.dados||{}).revisor===eu.id));
}
function secaoColab(rows){
  rows = rows||[];
  const ab = colabAbertas(rows), adm = souAdmin();
  const resumo = adm ? rows.find(s=>s.tipo==="resumo") : null;
  const regras = adm ? rows.filter(s=>s.tipo==="regra" && s.estado==="aprovada") : [];
  // F589 · o interno (anotação, tarefa, Prazo da IA) grava direto; fica aqui 48 h com o Desfazer
  const d48 = Date.now() - 48*36e5;
  const diretos = rows.filter(s=>s.estado==="aprovada" && (s.dados||{}).direto && s.decidido_em && new Date(s.decidido_em).getTime()>=d48
    && (adm || (s.dados||{}).revisor===eu.id));
  if(!ab.length && !resumo && !adm && !diretos.length) return "";
  const linkOk = u => /^https:\/\//.test(u||"") ? u : "";
  const cartao = s => { const d = s.dados||{}, c = D.cliPorId ? D.cliPorId.get(s.cliente_id) : null, lk = linkOk(d.link);
    const para = d.para ? (D.colaboradores||[]).find(x=>x.id===d.para) : null;
    return `<div class="cartao sug-colab" data-sug="${s.id}" style="display:block;padding:10px;margin:8px 0">
      <div><strong>${COLAB_TIPO[s.tipo]}</strong>${d.titulo ? ` · ${esc(d.titulo)}` : ""}${c ? ` · ${esc(c.nome)}` : ""}${d.data ? ` · ${esc(dataBR(String(d.data).slice(0,10)))}` : ""}${para ? ` · para ${esc(para.nome)}` : ""}${d.nota!=null ? ` · nota ${esc(String(d.nota))}` : ""}${s.motivo ? ` · <span class="meio-sub">${esc(s.motivo)}</span>` : ""}</div>
      <textarea class="sug-dia-txt" rows="${s.tipo==="peca"||s.tipo==="analise"?8:4}" style="width:100%;margin:6px 0">${esc(s.texto)}</textarea>
      <div><button type="button" class="btn-mini proc-pri" data-ac="aprovar" title="Aprovar: grava no caso com o texto acima">Aprovar</button>
        <button type="button" class="btn-mini" data-ac="descartar">Descartar</button>${lk ? ` <a class="btn-mini" href="${esc(lk)}" target="_blank" rel="noopener">Abrir</a>` : ""}${c ? ` <button type="button" class="btn-mini" data-ac="ficha">Ficha</button>` : ""}</div></div>`; };
  const gravado = s => { const d = s.dados||{}, c = D.cliPorId ? D.cliPorId.get(s.cliente_id) : null;
    return `<div class="cartao sug-colab" data-sug="${s.id}" style="display:block;padding:10px;margin:8px 0">
      <div><strong>${COLAB_TIPO[s.tipo]}</strong>${d.titulo ? ` · ${esc(d.titulo)}` : ""}${c ? ` · ${esc(c.nome)}` : ""}${d.data ? ` · ${esc(dataBR(String(d.data).slice(0,10)))}` : ""} · <span class="meio-sub">gravado ${esc(dataBR(String(s.decidido_em).slice(0,10)))}</span></div>
      <p style="white-space:pre-wrap;margin:6px 0">${esc(s.texto_final||s.texto)}</p>
      <div><button type="button" class="btn-mini" data-ac="desfazer" title="Desfazer: apaga do caso o que o Claude gravou">Desfazer</button>${c ? ` <button type="button" class="btn-mini" data-ac="ficha">Ficha</button>` : ""}</div></div>`; };
  const desde = Date.now() - 30*864e5, dec = rows.filter(s=>COLAB_TIPO[s.tipo] && s.tipo!=="regra" && s.decidido_em && new Date(s.decidido_em).getTime()>=desde);
  const dir30 = dec.filter(s=>(s.dados||{}).direto), desf = dir30.filter(s=>(s.dados||{}).desfeito).length;
  const placar = Object.keys(COLAB_TIPO).filter(t=>t!=="regra").map(t=>{ const l = dec.filter(s=>s.tipo===t && !(s.dados||{}).direto); if(!l.length) return "";
    const ap = l.filter(s=>s.estado==="aprovada"), ed = ap.filter(s=>(s.texto_final||"").trim()!==(s.texto||"").trim()).length;
    return `<li>${COLAB_TIPO[t]}: ${ap.length-ed} aprovada(s) sem mudança, ${ed} editada(s), ${l.length-ap.length} descartada(s)</li>`; }).join("");
  return `<h3 class="secao">Colaborador Claude · ${ab.length} em pré-gravação</h3>
    ${resumo ? `<details class="cartao" style="display:block;padding:10px;margin:8px 0" open><summary><strong>Resumo da rodada</strong> · <span class="meio-sub">${esc(dataBR(String(resumo.criado_em).slice(0,10)))}</span></summary><p style="white-space:pre-wrap;margin:6px 0">${esc(resumo.texto)}</p></details>` : ""}
    ${ab.length ? ab.map(cartao).join("") : `<p class="meio-sub">Nada em pré-gravação.</p>`}
    ${diretos.length ? `<h3 class="secao">Gravado pelo Claude · ${diretos.length} nas últimas 48 h</h3>${diretos.map(gravado).join("")}` : ""}
    ${adm ? `<details class="cartao colab-regras" style="display:block;padding:10px;margin:8px 0"><summary><strong>Caderno de regras</strong> · ${regras.length}</summary>
      ${regras.map(r=>`<div data-regra="${r.id}" style="margin:6px 0"><span style="white-space:pre-wrap">${esc(r.texto_final||r.texto)}</span> <button type="button" class="btn-mini" data-ac="revogar">Revogar</button></div>`).join("")}
      <textarea id="colab-regra-txt" rows="2" style="width:100%;margin:6px 0" placeholder="Regra nova para o colaborador"></textarea>
      <button type="button" class="btn-mini" data-ac="regra">Gravar</button>
      <p class="meio-sub" style="margin-top:10px">Placar dos últimos 30 dias</p><ul>${placar}${dir30.length ? `<li>Gravado direto: ${dir30.length}, ${desf} desfeito(s)</li>` : ""}${placar || dir30.length ? "" : "<li>Sem decisões no período.</li>"}</ul></details>` : ""}`;
}
async function cliqueColab(b, rows){
  const ac = b.dataset.ac, agora = () => ({decidido_em:new Date().toISOString(), decidido_por:eu.id});
  const descarta = id => api(`/rest/v1/sugestoes_rotina?id=eq.${id}&origem=eq.colaborador`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({estado:"descartada", ...agora()})});
  try{
    if(ac==="regra"){ const t = document.getElementById("colab-regra-txt").value.trim(); if(!t) return;
      await api(`/rest/v1/rpc/colab_regra`,{method:"POST",body:JSON.stringify({p_texto:t})}); aviso("Regra gravada"); return renderSugestoesDia(); }
    if(ac==="revogar"){ const r = b.closest("[data-regra]"); if(!confirm("Revogar esta regra?")) return; await descarta(r.dataset.regra); return r.remove(); }
    const el = b.closest(".sug-colab"), s = (rows||[]).find(x=>x.id===el.dataset.sug); if(!s) return;
    if(ac==="ficha") return abrirFicha(s.cliente_id);
    if(ac==="aprovar"){ const t = el.querySelector(".sug-dia-txt").value.trim(); if(!t) return;
      await api(`/rest/v1/rpc/colab_aprovar`,{method:"POST",body:JSON.stringify({p_id:s.id, p_texto:t})}); aviso("Aprovada"); }
    else if(ac==="descartar") await descarta(s.id);
    else if(ac==="desfazer"){ if(!confirm("Desfazer o que o Claude gravou neste caso?")) return;
      await api(`/rest/v1/rpc/colab_desfazer`,{method:"POST",body:JSON.stringify({p_id:s.id})}); aviso("Desfeito"); }
    else return;
    el.remove();
  }catch(e){ aviso(msgErro(e)); }
}
// F563 · Outra (sugestão em sentido diverso) e Aprofundar (consulta completa, só no clique). Nada é enviado.
// F578 · atalhos de direção: um clique pede a sugestão já com a orientação
const IA_ATALHOS = [["Curta","Mais curta, em até duas frases."],["Formal","Mais formal, no registro de carta do escritório."],
  ["Documento","Peça ao cliente o documento que falta, dizendo qual e como enviar."],["Prazo","Explique o prazo ou o tempo de espera em linguagem simples."],
  ["Encerrar","Encerre o assunto com cordialidade, sem abrir pergunta nova."]];
function iaSugestaoZap(acao){
  const c = zapConvs.find(x=>x.id===zapAberta); if(!c) return;
  const fundo = acao==="aprofundar";
  caixa(`<strong>${fundo?"Aprofundar a sugestão":"Outra sugestão"}</strong>
    <p class="meio-sub">${fundo?"A IA consulta as anotações, os andamentos do INSS, do CRPS e do Judicial, os prazos, as perícias, a agenda e as mensagens. Leva mais tempo.":"A IA escreve outra resposta, sem repetir a sugestão atual."} Nada é enviado ao cliente.</p>
    <div class="ia-atalhos" style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0">${IA_ATALHOS.map(([r,o])=>`<button class="btn-mini" title="${esc(o)}" onclick="document.getElementById('ia-orient').value=${esc(JSON.stringify(o))};pedirSugestaoZap('${fundo?"aprofundar":"outra"}')">${r}</button>`).join("")}</div>
    <label style="display:block">Orientação (opcional)<textarea id="ia-orient" rows="2" style="width:100%" placeholder="Ex.: mais curta, explicar a perícia"></textarea></label>
    <div class="form-linha" style="margin-top:8px"><button class="btn-rap" onclick="pedirSugestaoZap('${fundo?"aprofundar":"outra"}')">Pedir<span class="sr-only"> a sugestão</span></button></div>`);
  setTimeout(()=>document.getElementById("ia-orient")?.focus(), 30);
}
async function pedirSugestaoZap(acao){
  const conv = zapAberta, c = zapConvs.find(x=>x.id===conv); if(!c) return;
  const orientacao = (document.getElementById("ia-orient")?.value || "").trim(); fecharCaixa();
  const corpo = {acao, conversa_id: conv, anterior: c.sugestao_ia?.texto || "", orientacao};
  const cli = clienteDaConversa(c);
  if(acao==="aprofundar" && cli){
    try{ const a = atendimentosDe({id: cli.id, nome: cli.nome});
      if(a && !a.carregando) corpo.agenda = [...(a.fut||[]).map(e=>"agendado: "+linhaAtendTxt(e)), ...(a.ant||[]).slice(0,3).map(e=>"já veio: "+linhaAtendTxt(e))]; }catch(e){}
    try{ corpo.prazos = prazosDoCliente(cli.id).lista.filter(x=>x.data>=hoje()).slice(0,8).map(x=>`${dataBR(x.data)}: ${tituloDaLinha(x)}`); }catch(e){}
  }
  aviso(acao==="aprofundar" ? "Consultando o caso para a sugestão…" : "Pedindo outra sugestão…", false);
  let r; try{ r = await api("/functions/v1/zap_assistente",{method:"POST", body:JSON.stringify(corpo)}); }
  catch(e){ r = {erro: msgErro(e)}; }
  if(!r || !r.texto) return aviso("A IA não sugeriu: " + ((r&&r.erro) || "sem resposta"));
  const sug = {texto: r.texto, em: new Date().toISOString(), urgente: false, modo: acao, bases: r.bases || [], pendencias: r.pendencias || [], providencia: r.providencia || null};
  try{ await api(`/rest/v1/zap_conversas?id=eq.${conv}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({sugestao_ia:sug})}); }
  catch(e){ return aviso(msgErro(e)); }
  c.sugestao_ia = sug; aviso("Sugestão pronta acima do campo de escrever");
  if(zapAberta===conv) pintarConversaGuardando();
}
// F580 · a próxima providência do Aprofundar abre o campo de escrever do caso já preenchido; nada se grava sem o Registrar
const PROV_ROT = {prazo: "Prazo", lembrete: "Lembrete", tarefa: "Tarefa"};
function botaoProvidencia(p){
  if(!p || !PROV_ROT[p.tipo] || !D.casoPorId.get(p.caso_id)) return "";
  const frase = `${p.tipo==="prazo"?"Criar prazo":p.tipo==="lembrete"?"Criar lembrete":"Criar tarefa"} até ${dataBR(p.data)}: ${p.rotulo}`;
  return `<button class="btn-rap" onclick="providenciaZap()" title="${esc(frase)}. Abre o caso com o campo de escrever preenchido para conferir e registrar."><span aria-hidden="true">${PROV_ROT[p.tipo]} ${esc(dataBR(p.data).slice(0,5))}</span><span class="sr-only">${esc(frase)}</span></button>`;
}
async function providenciaZap(){
  const c = zapConvs.find(x=>x.id===zapAberta), p = c?.sugestao_ia?.providencia, cli = c && clienteDaConversa(c);
  if(!p || !cli) return;
  await casoComZap(cli.id, p.caso_id);
  if(casoSel!==p.caso_id) return;
  setTimeout(()=>{
    const tx = document.getElementById("and-texto"); if(!tx) return aviso("Abra o caso no Escritório para registrar");
    tx.closest(".escrever")?.classList.add("esc-aberto");
    if(p.tipo==="prazo"){
      const ck = document.getElementById("and-prazo-ck"); if(!ck) return;
      ck.checked = true; pzToggle(ck);
      const d = document.getElementById("and-prazo-data"); if(d){ d.value = p.data; pzxPintar(); }
    }else{
      const nat = p.tipo==="lembrete" ? "lembrete" : "compromisso", bt = document.querySelector(`.esc-tg.tf-nt[data-nat="${nat}"]`);
      if(bt && tfNatureza!==nat) tfNat(nat, bt);
      tfDia(p.data);
    }
    if(!tx.value.trim()) tx.value = `${p.rotulo}.`;
    tx.focus(); tx.scrollIntoView({block:"center"});
  });
}
// F582 · usada, editada ou descartada: o par sugestão e texto enviado vai a zap_sugestao_retorno, e o zap_assistente lê as últimas
const _sugUsada = new Map();   // conversa → sugestão levada ao campo, até o envio
function retornoSugestao(conv, sug, enviado, acao){
  if(!sug || !sug.texto) return;
  api(`/rest/v1/zap_sugestao_retorno`,{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({conversa_id:conv,
    modo: sug.modo || (sug.sugestao_id ? "iniciativa" : "plantao"), sugestao: sug.texto, enviado, acao, por: eu.id})}).catch(()=>{});
}
function usarSugestaoZap(){
  const c = zapConvs.find(x=>x.id===zapAberta); if(!c || !c.sugestao_ia) return;
  const txt = c.sugestao_ia.texto;
  _sugUsada.set(c.id, c.sugestao_ia);
  descartarSugestaoZap(true);
  document.querySelector(".ze-sug-ia")?.remove();
  const t = document.getElementById("zap-txt"); if(!t) return;
  t.value = txt; t.dispatchEvent(new Event("input")); t.focus();
}
async function enviarZap(){
  const t = document.getElementById("zap-txt"), txt = (t.value||"").trim();
  const conv = zapAberta;   // F517 · a conversa do início vale até o fim, mesmo que a tela mude durante a gravação
  if(!txt || !conv) return;
  if(!zapNota && barraAssumir(zapConvs.find(x=>x.id===conv))) return;
  if(_zapDesf){ clearTimeout(_zapDesf.timer); _zapDesf = null; document.querySelector(".ze-desf")?.remove(); }
  if(!zapNota && /\{[a-z_]+\}/.test(txt)){ travaZap(); return aviso("Há dado do caso sem preencher na mensagem"); }
  t.value=""; t.style.height=""; guardarRascZap(conv, "");
  // nota interna nasce com direcao E status 'interna' — o banco recusa
  // qualquer nota que tente entrar na fila de envio
  try{
    await api(`/rest/v1/zap_mensagens`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify(zapNota
        ? {conversa_id:conv, direcao:"interna", autor_id:eu.id,
           texto:txt, status:"interna"}
        : {conversa_id:conv, direcao:"saida", autor_id:eu.id,
           texto:txt, status:"fila", responde_a:zapResponder||null})});
  }catch(e){ t.value = txt; travaZap(); guardarRascZap(conv, txt); return aviso(msgErro(e)); }
  if(!zapNota && _sugUsada.has(conv)){
    const sug = _sugUsada.get(conv); _sugUsada.delete(conv);
    retornoSugestao(conv, sug, txt, txt===sug.texto.trim() ? "usada" : "editada");
  }
  // F187 · @Fulano na nota chama a pessoa. F357 · toda nota é menção: sem @, vai a quem
  // atende a conversa e ao advogado responsável pelo cliente (decisão do Paulo, 01.11.2026)
  if(zapNota){
    const c = zapConvs.find(x=>x.id===conv), cli = clienteDaConversa(c);
    const quem = /@\p{L}/u.test(txt) ? [] : [c&&c.atendente_id, ...(cli?advogadoDoCliente(cli.id):[])].filter(Boolean);
    await criarMencoes(`💬 Nota na conversa com ${c?nomeDaConversa(c):"cliente"}: ${txt}`, null, null, quem, conv).catch(()=>{});
  }
  if(!zapNota){
    const c = zapConvs.find(x=>x.id===conv);
    if(c){ c.bot_ativo=false; }
  }
  if(zapAberta===conv){ zapResponder = null; await abrirConversa(conv); focarCampoZap(); }
  if(zapNota) aviso("Anotado — só a equipe vê 🕵", false);
  else if(estadoPonte().txt!=="WhatsApp conectado")
    aviso("Guardado na fila — a ponte está fora do ar e envia quando voltar", false);
}

// O tipo importa: foto tem de chegar como FOTO, não como arquivo para baixar.
// É o que o cliente espera ver, e é o que faz ele responder na hora.
function tipoDoArquivo(f){
  const m = (f.type||"").toLowerCase();
  if(m.startsWith("image/")) return "imagem";
  if(m.startsWith("video/")) return "video";
  if(m.startsWith("audio/")) return "audio";
  return "documento";
}
// F517 · a conversa é a do início: quem troca de conversa durante o upload não leva o anexo e a legenda à outra
async function mandarArquivoZap(colado, conv = zapAberta){
  const inp = document.getElementById("zap-arq");
  const arq = colado || (inp && inp.files && inp.files[0]);
  if(!arq || !conv) return;
  if(inp) inp.value = "";                       // permite mandar o mesmo de novo
  // 60 MB é o teto do WhatsApp; barrar aqui evita o arquivo subir para nada
  if(arq.size > 60*1024*1024) return aviso("Arquivo grande demais para o WhatsApp (máx. 60 MB)");
  if(barraAssumir(zapConvs.find(x=>x.id===conv))) return;
  const campo = () => zapAberta===conv ? document.getElementById("zap-txt") : null;   // o campo só é desta conversa enquanto ela está aberta
  const nome = nomeSeguro(arq.name || "arquivo");
  const caminho = `zap/${conv}/enviados/${Date.now()}-${nome}`;
  const legenda = ((campo() ? campo().value : rascZap()[conv]) || "").trim();
  aviso("Enviando "+nome+"…", false);
  try{ await subirArquivo(caminho, arq); }
  catch(e){ return aviso("Não consegui subir o arquivo: "+e.message); }
  if(campo()) campo().value = "";
  guardarRascZap(conv, "");
  try{
    await api(`/rest/v1/zap_mensagens`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({conversa_id:conv, direcao:"saida", autor_id:eu.id,
        tipo:tipoDoArquivo(arq), texto:legenda||null, midia_url:caminho,
        midia_nome:arq.name||nome, midia_mime:arq.type||null, status:"fila"})});
  }catch(e){
    // a legenda volta ao campo, ou ao rascunho da conversa, para não se perder
    if(campo()) campo().value = legenda;
    guardarRascZap(conv, legenda);
    return aviso("Não enviei o arquivo: "+msgErro(e));
  }
  const c = zapConvs.find(x=>x.id===conv);
  if(c){ c.bot_ativo=false; }
  if(zapAberta!==conv) return aviso("Arquivo enviado à conversa com "+(c?nomeDaConversa(c):"o cliente"), false);
  await abrirConversa(conv);
  focarCampoZap();
}
// F387 · depois de enviar, o cursor volta ao campo de escrever (a repintura o tirava); no toque, não reabre o teclado
function focarCampoZap(){
  if(matchMedia("(pointer:coarse)").matches) return;
  const t = document.getElementById("zap-txt"); if(t) t.focus();
}
// Preenche um modelo com quem está DO OUTRO LADO da conversa. O que não der
// para preencher (dois processos, benefício sem cadastro) fica visível como
// {placeholder} — melhor um buraco à vista do que um chute enviado.
// F411 · os dados do caso nas mensagens prontas (Onda 1 do plano de 05.11.2026, decisões do Paulo):
// o campo sem dado fica entre chaves no texto, e o Enviar não sai enquanto houver um
const RX_CAMPO_ZAP = /\{[a-z_]+\}/g;
const RX_CAMPO_CASO = /\{(beneficio|nb|processo|protocolo|etapa|der|dib|dcb|pericia_\w+|audiencia_\w+|prazo|documentos)\}/;
const casosZap = cli => cli ? processosDe(D.casosDoCliente.get(cli.id)||[]).filter(k=>k.fase!=="encerrado" && !ehPreCaso(k)) : [];
// a mesma barreira do portal e do robô: só a etapa do catálogo da fase atual, e não a desatualizada
const etapaPublicaZap = k => k && k.etapa && etapasDaFase(k).includes(k.etapa) && !trilhaDe(k).velha ? k.etapa : "";
const proxEventoZap = (k, rx) => k ? eventosFuturos(k.id).filter(e=>rx.test(tipoEv(e.tipo)))
  .sort((a,b)=>String(a.data_hora).localeCompare(String(b.data_hora)))[0] || null : null;
const hZap = h => String(h||"").replace(/^0?(\d{1,2}):(\d{2})$/, (x, hh, mm)=>`${hh}h${mm==="00"?"":mm}`);
const horaZap = ts => hZap(horaSP(ts));
// o próximo atendimento da Agenda (o que já está carregado), pela ficha ou pelo telefone da conversa
function atendimentoZap(cli, c0){
  const hj = hoje(), u8 = ultimos8(c0 && c0.telefone);
  return Object.entries(agq.cache||{}).filter(([p])=>p!=="todos").flatMap(([, r])=>(r&&r.dias||[]).flatMap(d=>(d.eventos||[])
    .filter(e=>e.atendimento && d.data>=hj && ((cli && clienteDoEvento(e)===cli) || (u8.length===8 && ultimos8(e.telefone)===u8)))
    .map(e=>({data:d.data, hora:e.inicio}))))
    .sort((a,b)=>(a.data+a.hora).localeCompare(b.data+b.hora))[0] || null;
}
function docsZap(cli, k){
  if(!cli || !k) return "";
  const {grupos, pessoais} = pedidosDoBalcao(cli.id), g = grupos.find(x=>x.k.id===k.id);
  return [...(g?g.itens:[]), ...pessoais].map((it, i)=>`${i+1}. ${it.nome}`).join("\n");
}
// shortcut: Dr./Dra. pela última letra do primeiro nome, até o cadastro da equipe ter o tratamento
const advZap = cli => { const n = cli ? ((D.colPorId.get((advogadoDoCliente(cli.id)||[])[0])||{}).nome||"").split(" ")[0] : "";
  return n ? `${/a$/i.test(n)?"Dra.":"Dr."} ${n}` : ""; };
function preencheZap(txt, k, ctx){
  const c0 = zapConvs.find(x=>x.id===zapAberta);
  const cli = c0 && c0.cliente_id && D.cliPorId.get(c0.cliente_id);
  if(k===undefined){ const ks = casosZap(cli); k = ks.length===1 ? ks[0] : null; }
  const nome = (c0 && c0.contato_nome) || (cli && cli.nome) || (c0 && c0.nome_perfil) || "";
  const per = proxEventoZap(k, /per[íi]cia/i), aud = proxEventoZap(k, /audi[êe]ncia/i), at = atendimentoZap(cli, c0);
  const ev = ctx==="pericia" ? per : ctx==="audiencia" ? aud : null;
  const docPrazo = cli && k ? (((cli.campos||{}).docs_pedidos)||[]).filter(p=>p.ate && (!p.caso_id || p.caso_id===k.id) && (p.itens||[]).some(i=>i && !i.entregue)).map(p=>p.ate).sort()[0] : "";
  const map = {
    "{cliente}": (cli && cli.nome) || "",
    "{nome}": nome, "{primeiro_nome}": (nome||"").trim().split(/\s+/)[0]||"",
    "{data}": ev ? fmtBarra(dataSP(ev.data_hora)) : ctx==="pericia"||ctx==="audiencia" ? "" : fmtBarra(hoje()),
    "{hora}": ev ? horaZap(ev.data_hora) : "", "{local}": ev ? (ev.local||"") : "",
    "{beneficio}": especieDoCaso(k), "{processo}": (k&&k.processo)||"", "{nb}": (k&&k.nb)||"",
    "{protocolo}": (k && (k.protocolos||[]).slice(-1)[0]) || "",
    "{etapa}": etapaPublicaZap(k),
    "{der}": k&&k.der ? fmtBarra(k.der) : "", "{dib}": k&&k.dib ? fmtBarra(k.dib) : "", "{dcb}": k&&k.dcb ? fmtBarra(k.dcb) : "",
    "{pericia_data}": per ? fmtBarra(dataSP(per.data_hora)) : "", "{pericia_hora}": per ? horaZap(per.data_hora) : "", "{pericia_local}": (per && per.local) || "",
    "{audiencia_data}": aud ? fmtBarra(dataSP(aud.data_hora)) : "", "{audiencia_hora}": aud ? horaZap(aud.data_hora) : "", "{audiencia_local}": (aud && aud.local) || "",
    "{prazo}": k && k.exigencia_prazo ? fmtBarra(k.exigencia_prazo) : docPrazo ? fmtBarra(docPrazo) : "",
    "{documentos}": docsZap(cli, k), "{advogado}": advZap(cli),
    "{atendimento_data}": at ? fmtBarra(at.data) : "", "{atendimento_hora}": at ? hZap(at.hora) : "",
  };
  return Object.entries(map).reduce((t,[a,v])=>v?t.split(a).join(v):t, txt);
}
// com mais de um caso aberto, o modelo que usa dado de caso pergunta de qual caso é, antes de preencher
function usarModeloZap(m){
  const c0 = zapConvs.find(x=>x.id===zapAberta), cli = c0 && c0.cliente_id && D.cliPorId.get(c0.cliente_id), ks = casosZap(cli);
  const poe = k => { const t = document.getElementById("zap-txt"); if(!t) return;
    t.value = preencheZap(m.texto, k, m.contexto); fecharCaixa(); t.focus(); t.dispatchEvent(new Event("input")); };
  if(ks.length<2 || !RX_CAMPO_CASO.test(m.texto) && !/^(pericia|audiencia)$/.test(m.contexto||"")) return poe(undefined);
  caixa(`<h3>De qual caso é a mensagem?</h3><p class="meio-sub">${esc(m.titulo)}</p>
    <div class="form-linha">${ks.map((k, i)=>`<button class="btn-rap" data-zk="${i}">${esc(especieDoCaso(k)||"caso")} · ${esc(NOME_FASE[faseEfetiva(k)]||k.fase||"")}</button>`).join("")}</div>`);
  document.querySelectorAll("[data-zk]").forEach(b=>b.onclick=()=>poe(ks[+b.dataset.zk]));
}
// o trecho entre chaves que ficou é o dado que o CRM não tem: trava o Enviar e diz qual falta
function travaZap(){
  const t = document.getElementById("zap-txt"), b = document.getElementById("zap-enviar"), av = document.getElementById("zap-falta");
  if(!t || !b) return;
  t.closest(".ze-linha")?.classList.toggle("ze-vazio", !t.value);   // F573: no lugar do :has(:placeholder-shown)
  const faltam = zapNota ? [] : [...new Set((t.value||"").match(RX_CAMPO_ZAP)||[])];
  b.disabled = !!faltam.length;
  if(av){ av.hidden = !faltam.length; av.textContent = faltam.length ? `Preencha ou apague antes de enviar: ${faltam.join(", ")}` : ""; }
}
// O ⚡ mostra as mensagens PARA O CLIENTE (modelos), não a taquigrafia
// interna do composer — "Cliente orientado por telefone sobre __" enviada ao
// cliente seria um vexame. Cada título entra no campo já preenchido.
const CTX_ROTULO = {geral:"💬 Gerais", protocolo:"📄 Protocolos", resultado:"📢 Resultados",
                    documentos:"📎 Documentos", pericia:"🩺 Perícia", audiencia:"⚖️ Audiência",
                    exigencia:"⚠ Exigência"};
function frasesZap(){
  const ms = D.modelos||[], docs = D.docs||[];
  if(!ms.length && !docs.length) return aviso("Nenhum modelo cadastrado ainda");
  const grupos = new Map();
  ms.forEach(m=>{ const g=m.contexto||"geral";
                  if(!grupos.has(g)) grupos.set(g,[]); grupos.get(g).push(m); });
  caixa(`<h3>📨 Mensagens para o cliente</h3>
    <p class="meio-sub">Já saem com o nome (e o benefício, quando é um só) preenchidos.
       Entram no campo para você conferir antes de mandar.</p>
    ${[...grupos].map(([g,list])=>`<h4 class="zap-gr">${CTX_ROTULO[g]||g}</h4>
      <div class="form-linha">${list.map(m=>`<button class="btn-rap" data-mz="${m.id}"
        title="${esc(preencheZap(m.texto, undefined, m.contexto).slice(0,220))}">${esc(m.titulo)}</button>`).join("")}</div>`).join("")}
    ${docs.length?`<h4 class="zap-gr">📄 Lista de documentos do benefício</h4>
      <select id="zap-doc" style="width:100%;padding:7px">
        <option value="">escolha o benefício…</option>
        ${docs.map((d,i)=>`<option value="${i}">${esc(d.beneficio)}</option>`).join("")}
      </select>`:""}`);
  document.querySelectorAll("[data-mz]").forEach(b=>b.onclick=()=>{
    const m = ms.find(x=>x.id===b.dataset.mz); if(!m) return;
    usarModeloZap(m);
  });
  const sel = document.getElementById("zap-doc");
  if(sel) sel.onchange = ()=>{
    const d = docs[+sel.value]; if(!d) return;
    document.getElementById("zap-txt").value = msgDocumentos(d); travaZap();
    fecharCaixa(); document.getElementById("zap-txt").focus();
  };
}
// A lista sai numerada e sem juridiquês: quem vai juntar os papéis é o
// cliente, muitas vezes com o celular na mão e a filha lendo em voz alta.
function msgDocumentos(d){
  const itens = (d.itens||"").split("\n").map(x=>x.trim()).filter(Boolean);
  const c = zapConvs.find(x=>x.id===zapAberta);
  const nome = c ? (nomeDaConversa(c)||"").split(/\s+/)[0] : "";
  return `Olá${nome?", "+nome:""}! Aqui é do escritório Paulo R. Tercini Filho.\n\n`
    + `Para dar andamento no ${c&&c.contato_nome&&clienteDaConversa(c)?`pedido de *${d.beneficio}* de ${clienteDaConversa(c).nome.split(" ")[0]}`:`seu pedido de *${d.beneficio}*`}, precisamos destes documentos:\n\n`
    + itens.map((x,i)=>`${i+1}. ${x}`).join("\n")
    + (d.observacoes?`\n\n${d.observacoes}`:"")
    + `\n\nPode mandar por aqui mesmo — foto pelo celular serve, desde que dê para ler. 🙏`;
}

async function mudarConversa(campos){
  if(!zapAberta) return;
  try{
    await api(`/rest/v1/zap_conversas?id=eq.${zapAberta}`,{method:"PATCH",
      headers:{Prefer:"return=minimal"}, body:JSON.stringify(campos)});
  }catch(e){ return aviso(msgErro(e)); }
  Object.assign(zapConvs.find(x=>x.id===zapAberta)||{}, campos);
  // F575 · repinta depois do clique, e não dentro dele
  requestAnimationFrame(()=>{ pintarConversa(); pintarListaZap(); });
}
// F551 · quem cobre a conversa no Offline (plantão), à vista de todos na lista e no topo
function plantaoZap(c){ if(!c||!c.cobertura||!c.cobertura.cobre||c.status==="resolvida") return null; return (D.colaboradores||[]).find(k=>k.id===c.cobertura.cobre)||null; }
// F542 · a conversa vai ou não à substituta durante o Offline; o banco encerra a cobertura aberta com nota interna
async function semCoberturaZap(sem){
  await mudarConversa({sem_cobertura:sem});
  const c = zapConvs.find(x=>x.id===zapAberta);
  if(sem && c && c.cobertura){ c.cobertura = null; pintarConversa(); pintarListaZap(); }
}
// F286 · a ponte pede ao celular as mensagens anteriores à mais antiga da conversa (até 1 minuto)
async function pedirHistoricoZap(){
  await mudarConversa({historico_pedido:new Date().toISOString(), historico_feito:null, historico_resultado:null});
  aviso("Pedido enviado ao celular. As mensagens antigas aparecem na conversa em até 1 minuto.");
}
// F490 · o mesmo pedido em todas as conversas com movimento nos últimos 3 dias; a ponte atende 3 a cada 30 s
async function historicoTodasZap(){
  zapMaisAberto = false;
  const desde = new Date(Date.now()-3*864e5).toISOString(), agora = new Date().toISOString();
  if(!confirm("Pedir ao celular as mensagens que faltam em todas as conversas dos últimos 3 dias?")) return;
  let n = 0;
  try{
    const r = await api(`/rest/v1/zap_conversas?ultima_em=gte.${desde}&automatica=not.is.true&select=id`,{method:"PATCH",
      headers:{Prefer:"return=representation"}, body:JSON.stringify({historico_pedido:agora, historico_feito:null, historico_resultado:null})});
    n = (r||[]).length;
  }catch(e){ return aviso(msgErro(e)); }
  zapConvs.forEach(c=>{ if(c.ultima_em>=desde && !c.automatica) Object.assign(c,{historico_pedido:agora, historico_feito:null, historico_resultado:null}); });
  pintarListaZap();
  aviso(`Pedido enviado ao celular para ${n} conversa(s). As mensagens que faltam aparecem em cerca de ${Math.max(1,Math.ceil(n/6))} minuto(s).`);
}
async function assumirConversa(){
  if(!zapAberta) return;
  if(comIaZap(zapConvs.find(x=>x.id===zapAberta)) && !await confirmar("A IA continua a responder até você escrever ao cliente. Assumir a conversa?")) return;
  try{ await api(`/rest/v1/rpc/zap_assumir`,{method:"POST", body:JSON.stringify({p_conversa:zapAberta})}); }
  catch(e){ return aviso(msgErro(e)); }
  zapNota = false;
  aviso("A conversa agora é sua ✔", false);
  await recarregarZap();
}
const alternarBot = () => { const c=zapConvs.find(x=>x.id===zapAberta);
                            return mudarConversa({bot_ativo:!(c&&c.bot_ativo)}); };
const reabrirConversa = () => mudarConversa({status:"aberta"});

// F258 · o robô conduzido pela equipe (do Kapso): ver em que passo a conversa
// está e levá-lo a outro, inclusive devolver ao menu a conversa que alguém assumiu
const ROT_PASSO = {inicio:"menu inicial", processo:"processo", novo:"consulta nova", pericia:"perícia ou audiência",
  documentos:"documentos", financeiro:"financeiro", humano:"falar com alguém", nao_entendi:"não entendeu",
  fora_horario:"fora do horário", situacao:"respondeu a situação do processo", lembrete:"lembrete do menu"};
// F348: o passo do robô igual ao SMBot vem como "smb:<chave>"
const rotPasso = k => ROT_PASSO[k] || (String(k).startsWith("smb:") ? "SMBot · " + String(k).slice(4).replace("_"," ") : k);
function levarRobo(){
  if(!podeGravarCaso()) return;   // F355 · o nível 1 conversa, mas não grava no caso
  caixa(`<h3>Levar o robô a um passo</h3>
    <p class="meio-sub">O cliente recebe o texto do passo e a conversa volta ao robô, sem atendente.
       O passo que chama a equipe entrega a conversa ao setor dele. Fica uma nota de quem levou.</p>
    <div class="form-linha">${zapAux.passos.map(x=>`<button class="btn-rap" data-zbp="${esc(x.chave)}">${esc(rotPasso(x.chave))}</button>`).join("")}</div>`);
  document.querySelectorAll("[data-zbp]").forEach(b=>b.onclick=async()=>{
    fecharCaixa();
    try{ await api(`/rest/v1/rpc/zap_bot_ir`,{method:"POST", body:JSON.stringify({p_conversa:zapAberta, p_passo:b.dataset.zbp})}); }
    catch(e){ return aviso(msgErro(e)); }
    aviso("O robô foi levado ao passo ✔");
    await recarregarZap();
  });
}   // o banco abre um atendimento novo

// Encerrar como no SMBot: observação opcional, que fica no atendimento (com o
// protocolo) e, se o cliente tem um processo só, pode ir para o histórico dele
function encerrarConversa(){
  const c = zapConvs.find(x=>x.id===zapAberta); if(!c) return;
  const cli = c.cliente_id && D.cliPorId.get(c.cliente_id);
  const ks = cli ? processosDe(D.casosDoCliente.get(cli.id)||[]).filter(k=>k.fase!=="encerrado") : [];
  caixa(`<h3>Encerrar o atendimento</h3>
    <textarea id="ze-obs" rows="3" style="width:100%" placeholder="observação (opcional): o que foi resolvido"></textarea>
    ${ks.length===1?`<label style="display:block;margin-top:6px;font-size:13px"><input type="checkbox" id="ze-caso">
       registrar a observação no histórico de ${esc(ks[0].titulo||"processo")}</label>`:""}
    <div class="form-linha" style="margin-top:10px"><button class="btn-rap" id="ze-ok">✔ encerrar</button></div>`);
  document.getElementById("ze-ok").onclick = async()=>{
    const obs = (document.getElementById("ze-obs").value||"").trim();
    const noCaso = document.getElementById("ze-caso")?.checked;
    fecharCaixa();
    const num = await api(`/rest/v1/rpc/zap_encerrar`,{method:"POST",
      body:JSON.stringify({p_conversa:zapAberta, p_obs:obs||null, p_autor:eu.id})}).catch(e=>{ aviso("Não consegui encerrar: "+e.message); return undefined; });
    if(num===undefined) return;
    if(obs && noCaso) await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({caso_id:ks[0].id, autor_id:eu.id, origem:"whatsapp",
        texto:`Atendimento pelo WhatsApp${num?` #${num}`:""} encerrado: ${obs}`})}).catch(()=>{});
    aviso(`Atendimento${num?` #${num}`:""} encerrado ✔`);
    await recarregarZap();
  };
}

function escolherSetor(){
  if(!zapAux.setores.length) return aviso("Nenhum setor cadastrado ainda");
  caixa(`<h3>Setor da conversa</h3><div class="form-linha">
    ${zapAux.setores.map(s=>`<button class="btn-rap" data-zs="${s.id}" style="border-color:${esc(s.cor)};color:${esc(s.cor)}">${esc(s.nome)}</button>`).join("")}
    <button class="btn-mini" data-zs="">sem setor</button></div>`);
  document.querySelectorAll("[data-zs]").forEach(b=>b.onclick=()=>{
    const s = zapAux.setores.find(x=>x.id===b.dataset.zs);
    fecharCaixa(); mudarConversa({setor_id:s?s.id:null, setor:s?s.nome:null});
  });
}

function editarEtiquetas(){
  if(!zapAux.etiquetas.length) return aviso("Nenhuma etiqueta cadastrada ainda");
  const tem = new Set(zapAux.convEtq.get(zapAberta)||[]);
  caixa(`<h3>🏷 Etiquetas</h3><p class="meio-sub">Clique para pôr ou tirar.</p>
    <div class="form-linha" style="flex-wrap:wrap;gap:6px">${zapAux.etiquetas.map(e=>
      `<button data-ze="${e.id}" class="zap-etq" style="background:${esc(e.cor)};border:0;cursor:pointer;opacity:${tem.has(e.id)?1:.35};font-size:12px;padding:3px 9px">${tem.has(e.id)?"✓ ":""}${esc(e.texto)}</button>`).join("")}</div>`);
  document.querySelectorAll("[data-ze]").forEach(b=>b.onclick=async()=>{
    const id = b.dataset.ze, por = !tem.has(id);
    if(por) await api(`/rest/v1/zap_conversa_etiquetas`,{method:"POST",headers:{Prefer:"return=minimal,resolution=ignore-duplicates"},
      body:JSON.stringify({conversa_id:zapAberta, etiqueta_id:id})});
    else await api(`/rest/v1/zap_conversa_etiquetas?conversa_id=eq.${zapAberta}&etiqueta_id=eq.${id}`,{method:"DELETE",headers:{Prefer:"return=minimal"}});
    por ? tem.add(id) : tem.delete(id);
    zapAux.convEtq.set(zapAberta,[...tem]);
    b.style.opacity = por?1:.35; b.textContent = (por?"✓ ":"")+(zapAux.etiquetas.find(e=>e.id===id)||{}).texto;
    pintarConversaGuardando(); pintarListaZap();
  });
}

const alternarFixar = () => { const c=zapConvs.find(x=>x.id===zapAberta); return mudarConversa({fixada:!(c&&c.fixada)}); };

// "Responder depois": dia, hora e quem; na hora, chega uma menção para essa pessoa
function novoRetorno(){
  const c = zapConvs.find(x=>x.id===zapAberta); if(!c) return;
  const r = retornoDe(c);
  const amanha = new Date(Date.now()+864e5); const dia = amanha.toLocaleDateString("sv");
  caixa(`<h3>⏰ Retorno</h3>
    ${r?`<p class="meio-sub">Marcado para ${fmtTS(r.quando)} às ${horaSP(r.quando)}${r.nota?` — ${esc(r.nota)}`:""}</p>`:""}
    <div class="form-linha"><input type="date" id="zr-dia" value="${r?String(r.quando).slice(0,10):dia}">
      <input type="time" id="zr-hora" value="${r?horaSP(r.quando):"09:00"}">
      <select id="zr-quem">${equipeAtiva().map(p=>`<option value="${p.id}" ${(r?r.colaborador_id:(c.atendente_id||eu.id))===p.id?"selected":""}>${esc(p.nome)}</option>`).join("")}</select></div>
    <input id="zr-nota" style="width:100%;margin-top:6px" placeholder="nota (opcional): o que responder" value="${esc(r?r.nota||"":"")}">
    <div class="form-linha" style="margin-top:10px"><button class="btn-rap" id="zr-ok">${r?"alterar":"marcar"}</button>
      ${r?`<button class="btn-mini" id="zr-feito" title="✔ já respondi"><span aria-hidden="true">✔ Respondido</span><span class="sr-only">✔ já respondi</span></button>`:""}</div>`);
  document.getElementById("zr-ok").onclick = async()=>{
    const d = document.getElementById("zr-dia").value, h = document.getElementById("zr-hora").value||"09:00";
    if(!d) return aviso("Escolha o dia");
    const quando = new Date(`${d}T${h}:00-03:00`).toISOString();
    const dados = {quando, colaborador_id:document.getElementById("zr-quem").value||null,
                   nota:(document.getElementById("zr-nota").value||"").trim()||null, avisado_em:null};
    if(r) await api(`/rest/v1/zap_retornos?id=eq.${r.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify(dados)});
    else await api(`/rest/v1/zap_retornos`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({...dados, conversa_id:zapAberta, criado_por:eu.id})});
    fecharCaixa(); aviso(`Retorno marcado para ${fmtTS(quando)} às ${h} ⏰`);
    await recarregarZap();
  };
  const f = document.getElementById("zr-feito");
  if(f) f.onclick = async()=>{
    await api(`/rest/v1/zap_retornos?id=eq.${r.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({feito_em:new Date().toISOString()})});
    fecharCaixa(); aviso("Retorno concluído ✔"); await recarregarZap();
  };
}

// Agendar: o texto do campo sai no dia e hora escolhidos (a ponte libera)
function agendarZap(){
  const t = document.getElementById("zap-txt"), txt = (t&&t.value||"").trim();
  if(!txt) return aviso("Escreva a mensagem antes de agendar");
  if(barraAssumir(zapConvs.find(x=>x.id===zapAberta))) return;
  const amanha = new Date(Date.now()+864e5).toLocaleDateString("sv");
  caixa(`<h3>🗓 Agendar o envio</h3><p class="meio-sub">${esc(txt.slice(0,160))}</p>
    <div class="form-linha"><input type="date" id="za-dia" value="${amanha}"><input type="time" id="za-hora" value="09:00"></div>
    <div class="form-linha" style="margin-top:10px"><button class="btn-rap" id="za-ok">agendar</button></div>`);
  document.getElementById("za-ok").onclick = async()=>{
    const d = document.getElementById("za-dia").value, h = document.getElementById("za-hora").value||"09:00";
    const quando = new Date(`${d}T${h}:00-03:00`);
    if(!d || quando.getTime() < Date.now()+60000) return aviso("Escolha um horário no futuro");
    fecharCaixa();
    await api(`/rest/v1/zap_mensagens`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({conversa_id:zapAberta, direcao:"saida", autor_id:eu.id, texto:txt,
        status:"agendada", enviar_em:quando.toISOString(), responde_a:zapResponder||null})});
    zapResponder = null; t.value = ""; guardarRascZap(zapAberta, "");
    aviso(`Agendada para ${fmtTS(quando.toISOString())} às ${h} 🗓`);
    await abrirConversa(zapAberta);
  };
}
async function cancelarAgendada(id){
  if(!await confirmar("Cancelar esta mensagem agendada? Ela não será enviada.")) return;
  await api(`/rest/v1/zap_mensagens?id=eq.${id}&status=eq.agendada`,{method:"DELETE",headers:{Prefer:"return=minimal"}});
  await abrirConversa(zapAberta);
}

// toque no balão mostra as ações dele e esconde as dos outros; tocar de novo, ou em outro lugar, esconde
document.addEventListener("click", e => {
  if(e.target.closest("button,a,audio,video,input,textarea,select,summary,.zap-cit,.zap-player")) return;
  const b = e.target.closest(".zap-b"), ant = document.querySelector(".zap-b.toque");
  if(ant && ant!==b) ant.classList.remove("toque");
  if(b && b.querySelector(".zap-acoes,.virar")) b.classList.toggle("toque");
});
// F320 · no celular, as ações do andamento (Responder, + prazo, ⋯) aparecem só no cartão tocado, como no balão do WhatsApp
document.addEventListener("click", e => {
  if(!document.querySelector(".app.celular") || e.target.closest("button,a,input,textarea,select,summary,details,.tl-cab-fim")) return;
  const li = e.target.closest(".caso-dir .timeline > li"), ant = document.querySelector(".caso-dir .timeline > li.toque");
  if(ant && ant!==li) ant.classList.remove("toque");
  if(li) li.classList.toggle("toque");
});
let zapArrasto = null;
document.addEventListener("touchstart", e=>{
  const b = e.target.closest("#zap-msgs .zap-b");
  if(!b || !b.querySelector('[onclick^="responderMsg"]') || e.touches.length>1) return;
  zapArrasto = {b, x:e.touches[0].clientX, y:e.touches[0].clientY, dx:0,
    seg: setTimeout(()=>{ if(zapArrasto && zapArrasto.b===b && zapArrasto.dx<8){ zapArrasto = null; b.style.transform = ""; menuBalaoZap(b.id.slice(3)); } }, 500)};
}, {passive:true});
document.addEventListener("touchmove", e=>{
  const z = zapArrasto; if(!z) return;
  const dx = e.touches[0].clientX - z.x, dy = e.touches[0].clientY - z.y;
  if(Math.abs(dx) > 8 || Math.abs(dy) > 8) clearTimeout(z.seg);   // dedo que anda não é segurar
  if(!z.dx && Math.abs(dy) > Math.abs(dx)){ zapArrasto = null; return; }   // rolar a conversa não é responder
  z.dx = Math.max(0, dx);
  z.b.style.transition = "none"; z.b.style.transform = `translateX(${Math.min(z.dx, 80)}px)`;
}, {passive:true});
document.addEventListener("touchend", ()=>{
  const z = zapArrasto; zapArrasto = null; if(!z) return;
  clearTimeout(z.seg);
  z.b.style.transition = ""; z.b.style.transform = "";
  if(z.dx > 60) responderMsg(z.b.id.slice(3));
});
function responderMsg(id){ zapResponder = id; pintarConversaGuardando(); const t=document.getElementById("zap-txt"); if(t) t.focus(); }

const EMOJIS_ZAP = ["👍","❤️","😂","😮","😢","🙏","✅"];
function reagirMsg(id){
  const minha = (zapReacoes.get(id)||[]).find(r=>r.de==="escritorio");
  caixa(`<h3>Reagir</h3><div class="form-linha" style="font-size:22px">${EMOJIS_ZAP.map(e=>
      `<button class="btn-mini" style="font-size:20px" data-zr="${e}">${e}</button>`).join("")}
    ${minha?`<button class="btn-mini" data-zr="" title="tirar reação"><span aria-hidden="true">Remover</span><span class="sr-only">tirar reação</span></button>`:""}</div>`);
  document.querySelectorAll("[data-zr]").forEach(b=>b.onclick=()=>reagirCom(id, b.dataset.zr));
}
async function reagirCom(id, emoji){
  fecharCaixa();
  await api(`/rest/v1/zap_reacoes?on_conflict=mensagem_id,de`,{method:"POST",
    headers:{Prefer:"resolution=merge-duplicates,return=minimal"},
    body:JSON.stringify({mensagem_id:id, de:"escritorio", autor_id:eu.id, emoji, status:"fila"})});
  await carregarReacoes(); pintarConversaGuardando();
}
// F324 · tocar e segurar o balão abre, como no aplicativo, a fileira de emojis e as ações dele
function menuBalaoZap(id){
  const m = zapMsgs.find(x=>x.id===id); if(!m) return;
  const b = document.getElementById("zb-"+id);
  const tem = sel => b && b.querySelector(sel);
  const minha = (zapReacoes.get(id)||[]).find(r=>r.de==="escritorio");
  caixa(`<div class="zm-emojis" role="group" aria-label="Reagir">${EMOJIS_ZAP.map(e=>
      `<button class="${minha&&minha.emoji===e?"on":""}" data-zm-r="${e}" aria-label="Reagir com ${e}">${e}</button>`).join("")}</div>
    <div class="zm-acoes" role="menu">
      ${tem('[onclick^="responderMsg"]')?`<button role="menuitem" data-zm="r">↩ Responder</button>`:""}
      ${m.texto?`<button role="menuitem" data-zm="c">Copiar</button>`:""}
      ${tem('[onclick^="encaminharMsg"]')?`<button role="menuitem" data-zm="e">↪ Encaminhar</button>`:""}
      ${tem('[onclick^="virarAndamento"]')?`<button role="menuitem" data-zm="a" title="Registrar como andamento">Registrar<span class="sr-only"> como andamento</span></button>`:""}
      ${minha?`<button role="menuitem" data-zm="x" title="Tirar reação"><span aria-hidden="true">Remover</span><span class="sr-only">Tirar reação</span></button>`:""}
      ${m.direcao!=="interna"?`<button role="menuitem" data-zm="f">${m.favorita_em?"Tirar dos favoritos":"★ Favoritar"}</button>`:""}
      ${podeAlterarZap(m,"editar")?`<button role="menuitem" data-zm="ed" title="Editar para todos (até 15 minutos depois do envio)">Editar</button>`:""}
      ${podeAlterarZap(m,"apagar")?`<button role="menuitem" data-zm="ap" title="Apagar para todos (até 2 dias depois do envio)">Apagar</button>`:""}
    </div>`);
  document.querySelectorAll("[data-zm-r]").forEach(x=>x.onclick=()=>reagirCom(id, x.dataset.zmR));
  document.querySelectorAll("[data-zm]").forEach(x=>x.onclick=()=>{
    const k = x.dataset.zm; fecharCaixa();
    if(k==="r") responderMsg(id);
    else if(k==="c") navigator.clipboard.writeText(m.texto).then(()=>aviso("Texto copiado"), ()=>aviso("Não foi possível copiar", true));
    else if(k==="e") encaminharMsg(id);
    else if(k==="a") virarAndamento(id);
    else if(k==="x") reagirCom(id, "");
    else if(k==="f") favoritarMsg(id);
    else if(k==="ed") editarMsgZap(id);
    else if(k==="ap") apagarMsgZap(id);
  });
}
// F343 · apagar para todos e editar a mensagem enviada: o CRM grava o pedido em `alterar`
// e a ponte o cumpre. Prazos do WhatsApp: apagar até cerca de 2 dias, editar até 15 minutos.
const ZAP_APAGAR_MS = 2*864e5, ZAP_EDITAR_MS = 15*6e4;
function podeAlterarZap(m, acao){
  if(!m || m.direcao!=="saida" || !m.externo_id || m.apagada_em || (m.alterar&&m.alterar.status==="fila")) return false;
  const t = Date.now() - new Date(m.enviada_em||m.quando_wa||m.criado_em).getTime();
  return acao==="editar" ? (!m.midia_url && !!m.texto && t < ZAP_EDITAR_MS) : t < ZAP_APAGAR_MS;
}
async function pedirAlteracaoZap(id, acao, texto){
  const m = zapMsgs.find(x=>x.id===id); if(!m) return;
  const alterar = {acao, ...(texto?{texto}:{}), status:"fila", por:eu.id, em:new Date().toISOString()};
  try{ await api(`/rest/v1/zap_mensagens?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"}, body:JSON.stringify({alterar})}); }
  catch(e){ return aviso(msgErro(e), true); }
  m.alterar = alterar; pintarConversaGuardando();
  aviso(acao==="apagar" ? "A mensagem será apagada para todos" : "A edição vai ao WhatsApp");
}
async function apagarMsgZap(id){
  if(await confirmar("Apagar esta mensagem para todos? Ela some do celular do cliente; no CRM continua, riscada.")) pedirAlteracaoZap(id, "apagar");
}
function editarMsgZap(id){
  const m = zapMsgs.find(x=>x.id===id); if(!m) return;
  caixa(`<h3>Editar mensagem</h3><textarea id="zx-txt" rows="4" style="width:100%">${esc(m.texto||"")}</textarea>
    <p class="meio-sub">O cliente vê a mensagem com a marca "Editada". O WhatsApp aceita a edição até 15 minutos depois do envio.</p>
    <button class="btn-rap forte" id="zx-ok" title="Salvar a edição">Salvar</button>`);
  const tx = document.getElementById("zx-txt"); tx.focus();
  document.getElementById("zx-ok").onclick = ()=>{
    const t = tx.value.trim(); fecharCaixa();
    if(t && t!==m.texto) pedirAlteracaoZap(id, "editar", t);
  };
}

// Encaminhar: copia a mensagem (texto e arquivo, que já está no Storage) para outra conversa
function encaminharMsg(id){
  const m = zapMsgs.find(x=>x.id===id); if(!m) return;
  caixa(`<h3>↪ Encaminhar</h3><p class="meio-sub">${esc(textoCurto(m))}</p>
    <input id="zf-busca" style="width:100%" placeholder="nome ou telefone de quem vai receber" autocomplete="off">
    <div id="zf-res" style="margin-top:8px;max-height:300px;overflow:auto"></div>`);
  const inp = document.getElementById("zf-busca"), res = document.getElementById("zf-res");
  const pinta = ()=>{
    const q = (inp.value||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
    const lista = zapConvs.filter(c=>c.id!==zapAberta && (!q || (nomeDaConversa(c)+" "+(c.telefone||"")).toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g,"").includes(q))).slice(0,15);
    res.innerHTML = lista.map(c=>`<button class="btn-rap" data-zfw="${c.id}" style="display:block;width:100%;margin:4px 0;text-align:left">
      ${esc(nomeDaConversa(c))} <span class="meio-sub">· ${esc(c.telefone||"")}</span></button>`).join("") || `<p class="meio-sub">ninguém encontrado</p>`;
    res.querySelectorAll("[data-zfw]").forEach(b=>b.onclick=async()=>{
      fecharCaixa();
      await api(`/rest/v1/zap_mensagens`,{method:"POST",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({conversa_id:b.dataset.zfw, direcao:"saida", autor_id:eu.id, tipo:m.tipo||"texto",
          texto:m.texto, midia_url:m.midia_url, midia_nome:m.midia_nome, midia_mime:m.midia_mime,
          status:"fila", encaminhada_de:m.id})});
      aviso("Mensagem encaminhada ✔");
    });
  };
  inp.oninput = pinta; pinta(); inp.focus();
}

// Gravar áudio: o navegador grava (WebM), sobe para o Storage e entra na fila;
// a ponte converte para OGG e manda como mensagem de voz
let zapGravador = null;
async function gravarAudioZap(){
  const btn = document.getElementById("zap-rec");
  if(zapGravador){ zapGravador.stop(); return; }
  if(!navigator.mediaDevices || !window.MediaRecorder) return aviso("Este navegador não grava áudio");
  let stream;
  try{ stream = await navigator.mediaDevices.getUserMedia({audio:true}); }
  catch(e){ return aviso("Sem permissão para usar o microfone"); }
  const tipo = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "";
  const rec = new MediaRecorder(stream, tipo?{mimeType:tipo}:undefined), partes = [];
  const conversa = zapAberta;
  rec.ondataavailable = e=>{ if(e.data.size) partes.push(e.data); };
  rec.onstop = async()=>{
    stream.getTracks().forEach(t=>t.stop());
    zapGravador = null;
    const b = document.getElementById("zap-rec"); if(b){ b.classList.remove("gravando"); b.innerHTML=zic("mic"); }
    const blob = new Blob(partes, {type: rec.mimeType||"audio/webm"});
    if(blob.size < 1500) return aviso("Áudio curto demais");
    // F188 · nada sai sem querer: o áudio fica para ouvir, e só vai no "Enviar áudio"
    descartarAudioZap();
    zapAudio = {blob, conversa, url: URL.createObjectURL(blob)};
    if(conversa===zapAberta) pintarConversaGuardando();
  };
  rec.start(); zapGravador = rec;
  if(btn){ btn.classList.add("gravando"); btn.textContent="Parar"; btn.title="parar a gravação (o envio é depois, no botão Enviar áudio)"; }
}
let zapAudio = null;
function descartarAudioZap(){
  if(zapAudio){ URL.revokeObjectURL(zapAudio.url); zapAudio = null; }
}
async function enviarAudioZap(){
  if(!zapAudio) return;
  if(barraAssumir(zapConvs.find(x=>x.id===zapAudio.conversa))) return;
  const {blob, conversa} = zapAudio;
  descartarAudioZap(); pintarConversaGuardando();
  const caminho = `zap/${conversa}/enviados/${Date.now()}-audio.webm`;
  aviso("Enviando o áudio…", false);
  try{
    await subirArquivo(caminho, new File([blob], "audio.webm", {type: blob.type}));
    await api(`/rest/v1/zap_mensagens`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({conversa_id:conversa, direcao:"saida", autor_id:eu.id, tipo:"audio",
        midia_url:caminho, midia_nome:"audio.webm", midia_mime:blob.type||"audio/webm", status:"fila",
        responde_a: conversa===zapAberta ? (zapResponder||null) : null})});
  }catch(e){ return aviso("Não enviei o áudio: "+msgErro(e)); }
  if(conversa===zapAberta){ zapResponder = null; await abrirConversa(conversa); }
}

// "/" no começo do campo abre as mensagens prontas pelo atalho ou pelo título
function sugerirFrases(){
  const t = document.getElementById("zap-txt"), sug = document.getElementById("zap-sug");
  if(!t || !sug) return;
  const m = /^\/(\S*)$/.exec(t.value||"");
  if(!m || zapNota){ sug.hidden = true; return; }
  const q = m[1].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
  const lista = (D.modelos||[]).filter(x=>!q || ((x.atalho||"")+" "+x.titulo).toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g,"").includes(q)).slice(0,8);
  if(!lista.length){ sug.hidden = true; return; }
  sug.innerHTML = lista.map(x=>`<button data-zsg="${x.id}"><b>/${esc(x.atalho||x.titulo)}</b> ${esc(preencheZap(x.texto).slice(0,70))}…</button>`).join("");
  sug.hidden = false;
  sug.querySelectorAll("[data-zsg]").forEach(b=>b.onclick=()=>{
    const x = (D.modelos||[]).find(y=>y.id===b.dataset.zsg); if(!x) return;
    sug.hidden = true; t.value = ""; usarModeloZap(x);
  });
}

async function transferirConversa(){
  const eqs = equipeAtiva().filter(c=>c.id!==eu.id);
  if(!eqs.length && !zapAux.setores.length) return aviso("Não há outro colaborador ativo");
  caixa(`<h3>Transferir a conversa</h3>
    <p class="meio-sub">Para uma pessoa, ou para um setor (o CRM escolhe quem está livre nele). Quem recebe
       ganha um aviso em Menções, e fica uma nota na conversa dizendo de quem para quem e por quê.</p>
    <p class="zx-rot">Pessoa</p>
    <div class="form-linha">${eqs.map(c=>{ const ja = zapConvs.find(x=>x.id===zapAberta)?.atendente_id===c.id;
      return `<button class="btn-rap" data-zt="${c.id}"${ja?` disabled title="${esc(c.nome)} já atende esta conversa"`:""}>${esc(c.nome)}${ja?" (já atende)":""}</button>`; }).join("")}</div>
    ${zapAux.setores.length?`<p class="zx-rot">Setor</p><div class="form-linha">${zapAux.setores.map(s=>
      `<button class="btn-rap" data-zts="${s.id}" style="border-color:${esc(s.cor)};color:${esc(s.cor)}">${esc(s.nome)}</button>`).join("")}</div>`:""}
    <input id="zt-motivo" placeholder="motivo (opcional): é caso judicial…" style="width:100%;margin-top:10px">`);
  const enviar = async (para, setor) => {
    const mt = (document.getElementById("zt-motivo").value||"").trim(); fecharCaixa();
    try{
      await api(`/rest/v1/rpc/zap_transferir`,{method:"POST",
        body:JSON.stringify({p_conversa:zapAberta, p_para:para||null, p_setor:setor||null, p_motivo:mt||null})});
    }catch(e){ return aviso(msgErro(e)); }
    aviso("Conversa transferida ✔ — quem recebe foi avisado");
    await recarregarZap();
  };
  document.querySelectorAll("[data-zt]").forEach(b=>b.onclick=()=>enviar(b.dataset.zt, null));
  document.querySelectorAll("[data-zts]").forEach(b=>b.onclick=()=>enviar(null, b.dataset.zts));
}

// F370 · conversar com um número novo (pedido do Paulo de 02.11.2026): o número de cliente avisa e abre a ficha com a
// conversa ao lado; o número desconhecido abre a conversa e oferece criar o cliente. A ponte envia pelo telefone da conversa
function foneZapNovo(t){
  let d = String(t||"").replace(/\D/g,"").replace(/^0+/,"");
  if(d.length===8 || d.length===9) d = "16"+d;   // o DDD 16 é o padrão do escritório
  if(d.length===10 || d.length===11) d = "55"+d;
  return /^55\d{10,11}$/.test(d) ? d : "";
}
// F397 · Online e Offline: offline, o contato que eu assumi recebe uma vez a mensagem automática que eu escrevi
const offlinePadrao = () => `Olá! ${(eu.nome||"").trim().split(" ")[0]||"Quem atende você"} está fora do atendimento no momento e responderá a sua mensagem assim que retornar.`;
const feriasPadrao = () => `Olá! Neste período o ${(eu.assinatura_zap||eu.nome||"").replace(/:$/,"")} não acompanhará as mensagens do WhatsApp. Por isso, a sua mensagem está sendo repassada à Dra. Amanda Garcez, que dará andamento ao seu atendimento.`;
async function gravarEstadoZap(off, msg, ferias){
  // F679 · férias: Offline com data de retorno; a substituta recebe a conversa já na primeira mensagem
  if(off && ferias === "") return aviso("Informe a data de retorno das férias");
  const ate = off && ferias ? new Date(ferias + "T08:00:00-03:00").toISOString() : null;
  try{ await api(`/rest/v1/rpc/${ate?"zap_minhas_ferias":"zap_meu_offline"}`,{method:"POST",
         body:JSON.stringify(ate ? {p_ate:ate, p_msg:msg||null} : {p_offline:off, p_msg:msg||null})}); }
  catch(e){ return aviso(ate ? "Não gravou: confira a data de retorno" : "Não gravou: tente de novo"); }
  eu.zap_offline_desde = off ? (eu.zap_offline_desde || new Date().toISOString()) : null;
  eu.zap_ferias_ate = ate;
  if(msg){ eu.zap_offline_msg = msg; eu.zap_offline_salvas = [msg, ...(eu.zap_offline_salvas||[]).filter(x => x !== msg)].slice(0,20); }
  fecharCaixa(); pintarListaZap();
  if(zapAberta && document.getElementById("zap-txt")) pintarConversaGuardando();   // F534: o aviso vermelho do campo de escrever acompanha
  aviso(off ? "Offline: a mensagem automática vai ao contato que você assumiu" : "Online");
}
function estadoZap(){
  const off = !!eu.zap_offline_desde;
  caixa(`<h3>${off?"Você está offline":"Ficar offline"}</h3>
    <p class="meio-sub">Offline, quem escrever numa conversa que você assumiu recebe esta mensagem, uma vez por conversa, até você voltar.</p>
    <textarea id="zof-msg" rows="4" style="width:100%" aria-label="Mensagem automática">${esc(eu.zap_offline_msg||offlinePadrao())}</textarea>
    <label class="cfg-ck" style="margin-top:6px"><input type="checkbox" id="zof-fer"${eu.zap_ferias_ate?" checked":""}> Férias, retorno em
      <input type="date" id="zof-ate" value="${eu.zap_ferias_ate?new Date(eu.zap_ferias_ate).toLocaleDateString("sv-SE",{timeZone:"America/Sao_Paulo"}):""}"></label>
    <p class="meio-sub" style="margin:2px 0 0">Nas férias, a mensagem acima vai a toda conversa sua com mensagem nova e a substituta a recebe já na primeira. Na data, você volta ao Online sozinho.</p>
    ${(eu.zap_offline_salvas||[]).length ? `<div class="zof-salvas"><b>Mensagens salvas</b>${eu.zap_offline_salvas.map((m,i) =>
      `<div class="zof-it"><button class="btn-mini" data-zof-usar="${i}" title="Usar esta mensagem">${esc(m)}</button><button class="btn-mini" data-zof-tirar="${i}" title="Tirar da lista" aria-label="Tirar da lista">✕</button></div>`).join("")}</div>` : ""}
    <div class="form-linha" style="margin-top:10px">
      ${off?`<button class="btn-sal" id="zof-on" title="Voltar a ficar online">Online</button>
             <button class="btn-sec" id="zof-sal" title="Salvar a mensagem e continuar offline">Salvar</button>`
           :`<button class="btn-sal" id="zof-off" title="Ficar offline com esta mensagem">Offline</button>`}
    </div>`);
  const txt = () => document.getElementById("zof-msg").value.trim();
  const b = id => document.getElementById(id);
  const fer = () => b("zof-fer").checked ? b("zof-ate").value : null;
  // F679 · o cliente não lê "férias": apenas que a mensagem vai à substituta
  b("zof-fer").onchange = () => { if(b("zof-fer").checked && txt() === offlinePadrao()) b("zof-msg").value = feriasPadrao(); };
  if(b("zof-on")) b("zof-on").onclick = () => gravarEstadoZap(false, txt());
  if(b("zof-sal")) b("zof-sal").onclick = () => gravarEstadoZap(true, txt(), fer());
  if(b("zof-off")) b("zof-off").onclick = () => gravarEstadoZap(true, txt(), fer());
  // F519 · a mensagem salva volta ao campo no clique; o ✕ a tira da lista
  document.querySelectorAll("[data-zof-usar]").forEach(x => x.onclick = () => { b("zof-msg").value = eu.zap_offline_salvas[+x.dataset.zofUsar]; });
  document.querySelectorAll("[data-zof-tirar]").forEach(x => x.onclick = async () => {
    const m = eu.zap_offline_salvas[+x.dataset.zofTirar];
    try{ await api(`/rest/v1/rpc/zap_offline_esquecer`,{method:"POST", body:JSON.stringify({p_msg:m})}); }
    catch(e){ return aviso("Não tirou: tente de novo"); }
    eu.zap_offline_salvas = eu.zap_offline_salvas.filter(y => y !== m); const t = txt(); estadoZap(); b("zof-msg").value = t;
  });
}
// F399 · o horário dos avisos no aparelho, de cada pessoa (colaboradores.push_de e push_ate; vazio = a qualquer hora)
const hhmm = t => (t||"").slice(0,5);
function horaAvisosTxt(){ return eu && eu.push_de && eu.push_ate ? `${hhmm(eu.push_de)} às ${hhmm(eu.push_ate)}` : "a qualquer hora"; }
function horarioAvisos(){
  const tem = !!(eu.push_de && eu.push_ate);
  caixa(`<h3>Horário dos avisos</h3>
    <p class="meio-sub">Fora do horário, mensagem e menção não avisam no aparelho; quando ele abre, chega o resumo do que veio. Com horário, só de segunda a sexta, sem feriado. A perícia, a audiência e a tarefa com hora avisam na véspera às 8h, 2 horas antes e 30 minutos antes, também só dentro do horário.</p>
    <label><input type="checkbox" id="zh-livre"${tem?"":" checked"}> A qualquer hora</label>
    <div class="form-linha" style="margin-top:8px">
      <label>Das <input type="time" id="zh-de" value="${hhmm(eu.push_de)||"08:00"}"${tem?"":" disabled"}></label>
      <label>às <input type="time" id="zh-ate" value="${hhmm(eu.push_ate)||"18:00"}"${tem?"":" disabled"}></label>
    </div>
    <div class="form-linha" style="margin-top:10px"><button class="btn-sal" id="zh-ok" title="Salvar o horário dos avisos">Salvar</button></div>`);
  const b = id => document.getElementById(id);
  b("zh-livre").onchange = () => { b("zh-de").disabled = b("zh-ate").disabled = b("zh-livre").checked; };
  b("zh-ok").onclick = async () => {
    const livre = b("zh-livre").checked, de = b("zh-de").value, ate = b("zh-ate").value;
    if(!livre && !(de && ate && de < ate)) return aviso("O início precisa vir antes do fim", true);
    try{ await api(`/rest/v1/rpc/push_meu_horario`,{method:"POST", body:JSON.stringify({p_de: livre?null:de, p_ate: livre?null:ate})}); }
    catch(e){ return aviso("Não gravou: tente de novo"); }
    eu.push_de = livre ? null : de; eu.push_ate = livre ? null : ate;
    fecharCaixa(); pintarListaZap();
    aviso(`Avisos ${horaAvisosTxt()}`);
  };
}
// F409 · silenciar a conversa por um tempo, só para mim (zap_silencio; o zap_push e o aviso do navegador respeitam)
let zapSilencio = new Map(), zapSilencioLido = false;
function silenciadaZap(id){ const t = zapSilencio.get(id); return !!t && new Date(t) > new Date(); }
async function lerSilencioZap(){
  if(zapSilencioLido) return; zapSilencioLido = true;
  const r = await todas("zap_silencio",`select=conversa_id,ate&colaborador_id=eq.${eu.id}&ate=gt.${new Date().toISOString()}`).catch(()=>[]);
  r.forEach(x=>zapSilencio.set(x.conversa_id, x.ate));
}
function silenciarZap(){
  const id = zapAberta, on = silenciadaZap(id);
  const amanha = new Date(); amanha.setDate(amanha.getDate()+1); amanha.setHours(8,0,0,0);
  const op = (rot, ms, t) => `<button class="btn-sec" data-ate="${ms ? new Date(Date.now()+ms).toISOString() : amanha.toISOString()}" title="${t}">${rot}</button>`;
  caixa(`<h3>Silenciar a conversa</h3>
    <p class="meio-sub">Sem aviso no aparelho e no navegador, só para você. As mensagens continuam chegando.</p>
    <div class="form-linha">${op("1 hora",3600e3,"Silenciar por 1 hora")}${op("8 horas",8*3600e3,"Silenciar por 8 horas")}${op("Amanhã",0,"Silenciar até amanhã às 8h")}
    ${on?`<button class="btn-sal" data-ate="" title="Voltar a avisar desta conversa">Reativar</button>`:""}</div>`);
  document.querySelectorAll("#modal [data-ate]").forEach(b => b.onclick = async () => {
    const ate = b.dataset.ate;
    try{
      if(ate) await api(`/rest/v1/zap_silencio?on_conflict=colaborador_id,conversa_id`,{method:"POST", headers:{Prefer:"resolution=merge-duplicates,return=minimal"}, body:JSON.stringify({colaborador_id:eu.id, conversa_id:id, ate})});
      else await api(`/rest/v1/zap_silencio?colaborador_id=eq.${eu.id}&conversa_id=eq.${id}`,{method:"DELETE"});
    }catch(e){ return aviso("Não gravou: tente de novo"); }
    if(ate) zapSilencio.set(id, ate); else zapSilencio.delete(id);
    fecharCaixa(); pintarConversa();
    aviso(ate ? "Conversa silenciada" : "Avisos desta conversa reativados");
  });
}
function novoContatoZap(){
  caixa(`<h3>Novo contato</h3>
    <p class="meio-sub">Digite o número com DDD. O CRM confere se ele já está numa ficha ou numa conversa.</p>
    <input id="znc-tel" value="(16) " inputmode="tel" aria-label="Telefone com DDD" style="width:100%">
    <input id="znc-nome" placeholder="nome (opcional)" aria-label="Nome do contato" style="width:100%;margin-top:8px">
    <div id="znc-res" role="status" style="margin-top:10px"></div>
    <div class="form-linha" style="margin-top:10px"><button class="btn-sal" id="znc-ok" title="Conferir o número">Conferir</button></div>`);
  const t = document.getElementById("znc-tel"); t.focus(); t.setSelectionRange(t.value.length, t.value.length);
  t.onkeydown = e => { if(e.key==="Enter") conferirContatoZap(); };
  document.getElementById("znc-ok").onclick = conferirContatoZap;
}
async function abrirContatoZap(fone, nome){
  const id = await api(`/rest/v1/rpc/zap_abrir`,{method:"POST", body:JSON.stringify({p_telefone:fone, p_nome:nome||null})});
  return typeof id==="string" ? id : (id && id.zap_abrir) || id;
}
async function conferirContatoZap(){
  const res = document.getElementById("znc-res"), fone = foneZapNovo(document.getElementById("znc-tel").value);
  const nome = (document.getElementById("znc-nome").value||"").trim();
  if(!fone){ res.innerHTML = `<p class="meio-sub" style="color:var(--vermelho,#c0392b)">Número inválido: use o DDD e o número, como (16) 99999-9999.</p>`; return; }
  const clis = clientesDoTelefone(fone);
  if(clis.length===1){
    let conv; try{ conv = await abrirContatoZap(fone, nome); }catch(e){ return aviso("Não abri a conversa: "+msgErro(e)); }
    fecharCaixa();
    aviso(`Este número já é de ${clis[0].nome}: abri a ficha com a conversa ao lado`, false);
    await recarregarZap(true).catch(()=>{});
    return fichaComZap(clis[0].id);
  }
  if(clis.length>1){
    res.innerHTML = `<p>Este número já está em ${clis.length} fichas. Escolha qual abrir:</p><div class="form-linha">${clis.map(c=>
      `<button class="btn-rap" data-znc-cli="${c.id}">${esc(c.nome)}</button>`).join("")}</div>`;
    res.querySelectorAll("[data-znc-cli]").forEach(b=>b.onclick = async ()=>{
      try{ await abrirContatoZap(fone, nome); }catch(e){ return aviso("Não abri a conversa: "+msgErro(e)); }
      fecharCaixa(); await recarregarZap(true).catch(()=>{}); fichaComZap(b.dataset.zncCli); });
    return;
  }
  const ja = zapConvs.find(c=>ultimos8(c.telefone)===ultimos8(fone));
  res.innerHTML = `<p>${ja?`Já existe conversa com este número (${esc(nomeDaConversa(ja))}), sem ficha de cliente.`:"Este número não está em nenhuma ficha."}</p>
    <div class="form-linha"><button class="btn-sal" id="znc-conv" title="Abrir a conversa com este número">Conversar</button>
    <button class="btn-rap" id="znc-cli" title="Criar a ficha de cliente com este número">Cliente</button>
    <button class="btn-rap" id="znc-ct" title="Cadastrar este número como contato que não é cliente (advogado, fornecedor, banco)"><span aria-hidden="true">Contato</span><span class="sr-only">Cadastrar como contato que não é cliente</span></button></div>`;
  document.getElementById("znc-ct").onclick = ()=>{ fecharCaixa(); contatoDoNumero(fone, nome); };
  document.getElementById("znc-conv").onclick = async ()=>{
    let conv; try{ conv = ja ? ja.id : await abrirContatoZap(fone, nome); }catch(e){ return aviso("Não abri a conversa: "+msgErro(e)); }
    fecharCaixa();
    if(!ja) await api(`/rest/v1/zap_conversas?id=eq.${conv}`,{method:"PATCH", headers:{Prefer:"return=minimal"},
      body:JSON.stringify({atendente_id:eu.id, bot_ativo:false})}).catch(()=>{});
    await recarregarZap(true).catch(()=>{});
    zapFiltro = "minhas";
    if(visao!=="whatsapp") irPara("whatsapp");
    abrirConversa(conv, true);
  };
  document.getElementById("znc-cli").onclick = ()=>{
    fecharCaixa();
    _ncl = {etapa:1, id:null, nomeBusca: nome && termosBusca(nome).length>=2 ? tituloOrgao(nome.toUpperCase()) : ""};
    irNovoCliente();
    const i = document.getElementById("ncl-tel"); if(!i) return;
    i.value = `(${fone.slice(2,4)}) ${fone.slice(4,-4)}-${fone.slice(-4)}`; nclConferirTel();
  };
}

// F369 · quem não atende pede a transferência: menção a quem atende e aos gestores, com o link da conversa;
// quem recebe transfere pelo Transferir de sempre (pedido do Paulo de 02.11.2026)
function pedirTransferencia(){
  const c = zapConvs.find(x=>x.id===zapAberta), at = c && D.colPorId.get(c.atendente_id);
  if(!c || !at) return;
  const eqs = equipeAtiva().filter(x=>x.id!==at.id && x.papel!=="assistente_ia");
  caixa(`<h3>Pedir a transferência</h3>
    <p class="meio-sub">A conversa está com ${esc(at.nome)}. O pedido vai a ${esc(at.nome)} e aos gestores em Menções, com o link da conversa.</p>
    <p class="zx-rot">Para quem</p>
    <div class="form-linha">${eqs.map(x=>`<button class="btn-rap ${x.id===eu.id?"on":""}" data-zpp="${x.id}">${x.id===eu.id?"Para mim":esc(x.nome)}</button>`).join("")}</div>
    <input id="zpp-motivo" placeholder="motivo (opcional): o cliente é meu…" style="width:100%;margin-top:10px">
    <div class="form-linha" style="margin-top:10px"><button class="btn-sal" id="zpp-ok">Pedir</button></div>`);
  let para = eu.id;
  document.querySelectorAll("[data-zpp]").forEach(b=>b.onclick=()=>{
    para = b.dataset.zpp; document.querySelectorAll("[data-zpp]").forEach(x=>x.classList.toggle("on", x===b)); });
  document.getElementById("zpp-ok").onclick = async ()=>{
    const mt = (document.getElementById("zpp-motivo").value||"").trim(); fecharCaixa();
    const dest = D.colPorId.get(para), nome = nomeDaConversa(c);
    const texto = `💬 ${eu.nome} pede que a conversa com ${nome} seja transferida para ${para===eu.id?"ele(a)":dest?dest.nome:"outra pessoa"}`
      + (mt?` — ${mt}`:"") + `. Para atender, abra a conversa e use Transferir.`;
    const alvos = [...new Set([at.id, ...equipeAtiva().filter(x=>x.papel==="admin"||x.gestor_zap).map(x=>x.id)])].filter(id=>id!==eu.id);
    try{
      await api(`/rest/v1/mencoes`,{method:"POST", headers:{Prefer:"return=minimal"},
        body:JSON.stringify(alvos.map(id=>({de_id:eu.id, para_id:id, conversa_id:c.id, texto})))});
      await api(`/rest/v1/zap_mensagens`,{method:"POST", headers:{Prefer:"return=minimal"},
        body:JSON.stringify({conversa_id:c.id, direcao:"interna", status:"interna", autor_id:eu.id,
          texto:`↪ ${eu.nome} pediu a transferência para ${para===eu.id?eu.nome:dest?dest.nome:"outra pessoa"}${mt?": "+mt:""}`})});
    }catch(e){ return aviso("Não gravou o pedido: "+msgErro(e)); }
    aviso(`Pedido enviado a ${alvos.map(id=>(D.colPorId.get(id)||{}).nome).filter(Boolean).join(", ")} ✔`, false);
    abrirConversa(c.id);
  };
}

// A mensagem NÃO vira andamento sozinha: se virasse, o histórico do processo
// encheria de "bom dia" e "obrigado". Quem lê é quem decide o que importa —
// e em qual processo entra, porque o cliente pode ter três.
// F272 · a IA da equipe (Edge Function zap_assistente): só a equipe lê, nada vai ao cliente
async function iaZap(acao){
  const conv = zapAberta; if(!conv) return;
  aviso(acao==="resumo" ? "Resumindo a conversa…" : "Escrevendo o rascunho…", false);
  let r;
  try{ r = await api("/functions/v1/zap_assistente",{method:"POST", body:JSON.stringify({acao, conversa_id:conv})}); }
  catch(e){ return aviso("A IA não respondeu: "+msgErro(e)); }
  if(!r || !r.texto) return aviso((r&&r.erro) || "A IA não respondeu");
  if(acao==="resumo") return caixa(`<h3>Resumo da conversa</h3><p class="meio-sub">Feito pela IA, para a equipe. Confira nas mensagens antes de agir.</p>
    <div style="white-space:pre-wrap">${esc(r.texto)}</div>`);
  const t = document.getElementById("zap-txt");
  if(!t || zapAberta!==conv) return;
  if(t.value.trim() && !confirm("Trocar o que está escrito pelo rascunho da IA?")) return;
  t.value = r.texto; t.focus(); t.dispatchEvent(new Event("input"));
  aviso("Rascunho da IA no campo: confira e ajuste antes de enviar", false);
}
async function naoEhAutomatica(){
  if(!zapAberta) return;
  try{ await api(`/rest/v1/zap_conversas?id=eq.${zapAberta}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
         body:JSON.stringify({automatica:false, status:"aberta"})}); }
  catch(e){ return aviso("Não consegui desfazer: "+msgErro(e)); }
  const c = zapConvs.find(x=>x.id===zapAberta); if(c){ c.automatica=false; c.status="aberta"; }
  aviso("A conversa voltou à fila", false);
  abrirConversa(zapAberta);
}
async function identificarDocZap(msgId){
  if(!podeGravarCaso()) return;   // F355 · o nível 1 conversa, mas não grava no caso
  const m = zapMsgs.find(x=>x.id===msgId), c = zapConvs.find(x=>x.id===zapAberta);
  const cli = c && c.cliente_id && D.cliPorId.get(c.cliente_id);
  if(!m || !cli) return;
  const ks = processosDe(D.casosDoCliente.get(cli.id)||[]);
  if(!ks.length) return aviso("Este cliente ainda não tem processo");
  aviso("A IA está lendo o documento…", false);
  let r;
  try{ r = await api("/functions/v1/zap_assistente",{method:"POST", body:JSON.stringify({acao:"documento", mensagem_id:msgId})}); }
  catch(e){ return aviso("A IA não respondeu: "+msgErro(e)); }
  if(!r || r.erro) return aviso((r&&r.erro) || "A IA não respondeu");
  caixa(`<h3>Juntar ao caso</h3>
    <p class="meio-sub">A IA leu como <b>${esc(r.tipo||"documento")}</b>${r.motivo?`: ${esc(r.motivo)}`:""}. Confira antes de juntar.</p>
    <label class="cfg-ck" style="display:block;margin:8px 0">Nome do documento
      <input id="jz-nome" style="width:100%" value="${esc(r.nome||r.tipo||m.midia_nome||"Documento do WhatsApp")}"></label>
    <label class="cfg-ck" style="display:block;margin:8px 0">Caso
      <select id="jz-caso" style="width:100%"><option value="">escolha o caso</option>
      ${ks.map(k=>`<option value="${k.id}" ${k.id===r.caso_id?"selected":""}>${esc(k.titulo||k.beneficio||"processo")}</option>`).join("")}</select></label>
    <button class="btn-rap" id="jz-ok" title="Juntar ao caso">Juntar<span class="sr-only"> ao caso</span></button>`);
  document.getElementById("jz-ok").onclick = async ()=>{
    const casoId = document.getElementById("jz-caso").value, nome = document.getElementById("jz-nome").value.trim();
    if(!casoId) return aviso("Escolha o caso");
    fecharCaixa();
    try{
      const andId = await api(`/rest/v1/rpc/zap_virar_andamento`,{method:"POST",
        body:JSON.stringify({p_mensagem:msgId, p_caso:casoId, p_autor:eu.id})});
      await api(`/rest/v1/anexos?on_conflict=caminho`,{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},
        body:JSON.stringify({caso_id:casoId, cliente_id:cli.id, autor_id:eu.id, nome:nome||"Documento do WhatsApp",
          caminho:m.midia_url, tipo:m.midia_mime||null, origem:"whatsapp", andamento_id:andId||null})});
    }catch(e){ return aviso("Não consegui juntar: "+msgErro(e)); }
    aviso("Documento juntado ao caso ✔", false);
  };
}
async function virarAndamento(msgId){
  if(!podeGravarCaso()) return;   // F355 · o nível 1 conversa, mas não grava no caso
  const c = zapConvs.find(x=>x.id===zapAberta);
  const cli = c && c.cliente_id && D.cliPorId.get(c.cliente_id);
  if(!cli) return aviso("Só dá para registrar no histórico de quem já é cliente");
  const ks = processosDe(D.casosDoCliente.get(cli.id)||[]);
  if(!ks.length) return aviso("Este cliente ainda não tem processo");
  const gravar = async casoId => {
    fecharCaixa();
    await api(`/rest/v1/rpc/zap_virar_andamento`,{method:"POST",
      body:JSON.stringify({p_mensagem:msgId, p_caso:casoId, p_autor:eu.id})});
    aviso("Registrado no histórico do processo ✔");
  };
  if(ks.length===1) return gravar(ks[0].id);
  caixa(`<h3>Em qual processo?</h3>
    <p class="meio-sub">${esc(cli.nome)} tem mais de um — o histórico é de cada processo.</p>
    ${ks.map(k=>`<button class="btn-rap" data-zk="${k.id}" style="display:block;width:100%;margin:6px 0;text-align:left">
       ${esc(k.titulo||k.beneficio||"processo")} ${k.processo?`<span class="chip neutro">${esc(k.processo)}</span>`:""}
     </button>`).join("")}`);
  document.querySelectorAll("[data-zk]").forEach(b=>b.onclick=()=>gravar(b.dataset.zk));
}

// ── As mensagens do cliente, só para ler, a partir da ficha ───────────────
// Quem abre a ficha não precisa ir ao WhatsApp: o botão ao lado do nome abre
// tudo o que o cliente mandou e o que o escritório respondeu, em ordem. Áudio
// vem transcrito (crm/fase2/ponte/transcrever.py, Whisper nesta máquina);
// enquanto a transcrição não chega, aparece "transcrevendo…".
const rotZapLado = m => m.dir==="saida" ? "WhatsApp enviado ao cliente" : "WhatsApp do cliente";
const _zapLado = new Map();   // as mensagens que o painel mostra, para anotar sem buscar de novo
async function responderZapLado(convId, cliId){
  const t = document.getElementById("pp-zap-txt"), txt = (t && t.value || "").trim(), pend = zapLadoPend;
  if(!txt && !pend) return;
  if(zapLadoRec) return aviso("Pare a gravação antes de enviar", false);
  if(!zapGestor()){
    const cv = (await todas("zap_conversas",`select=atendente_id,status,plantao&id=eq.${convId}`).catch(()=>[]))[0];
    // F566 · ao lado da ficha, a conversa de outro colega se responde sem assumir: o responsável continua e a mensagem leva o autor_id de quem enviou
    if(cv && !cv.atendente_id){
      if(!await confirmar("Para responder, a conversa passa a ser sua. Assumir?")) return;
      if(comIaZap(cv) && !await confirmar("A IA continua a responder até você escrever ao cliente. Assumir a conversa?")) return;
      try{ await api(`/rest/v1/rpc/zap_assumir`,{method:"POST", body:JSON.stringify({p_conversa:convId})}); }
      catch(e){ return aviso(msgErro(e)); }
    }
  }
  t.value = "";
  const msg = corpo => api(`/rest/v1/zap_mensagens`,{method:"POST",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({conversa_id:convId, direcao:"saida", autor_id:eu.id, status:"fila", ...corpo})});
  try{
    if(pend){
      const arq = pend.tipo==="audio" ? new File([pend.blob], "audio.webm", {type: pend.blob.type||"audio/webm"}) : pend.file;
      const caminho = `zap/${convId}/enviados/${Date.now()}-${nomeSeguro(arq.name || "arquivo")}`;
      aviso(pend.tipo==="audio" ? "Enviando o áudio…" : `Enviando ${arq.name}…`, false);
      await subirArquivo(caminho, arq);
      await msg({tipo: pend.tipo==="audio" ? "audio" : tipoDoArquivo(arq), texto: pend.tipo==="audio" ? null : (txt||null),
        midia_url: caminho, midia_nome: arq.name, midia_mime: arq.type||null});
      descartarPendZap();
      if(pend.tipo==="audio" && txt) await msg({texto: txt});
    }else await msg({texto: txt});
  }catch(e){ t.value = txt; return aviso(msgErro(e)); }
  if(estadoPonte().txt!=="WhatsApp conectado") aviso("Guardado na fila: a ponte está fora do ar e envia quando voltar", false);
  await verZapCliente(cliId);
  if(!matchMedia("(pointer:coarse)").matches) document.getElementById("pp-zap-txt")?.focus();   // F387
}
// "anotar": a mensagem vai à linha do tempo do caso, pelo mesmo caminho do "virar andamento" da tela do WhatsApp
async function anotarMsgZap(msgId, cliId){
  if(!podeGravarCaso()) return;   // F355 · o nível 1 conversa, mas não grava no caso
  const ks = processosDe(D.casosDoCliente.get(cliId)||[]);
  if(!ks.length) return aviso("Este cliente ainda não tem processo");
  const gravar = async casoId => {
    fecharCaixa();
    try{ await api(`/rest/v1/rpc/zap_virar_andamento`,{method:"POST",
      body:JSON.stringify({p_mensagem:msgId, p_caso:casoId, p_autor:eu.id})}); }
    catch(e){ return aviso("Não consegui anotar: "+msgErro(e)); }
    aviso("Anotado na linha do tempo do caso ✔", false);
    if(clienteAberto) abrirFicha(clienteAberto);
  };
  if(ks.length===1) return gravar(ks[0].id);
  caixa(`<h3>Em qual processo?</h3><p class="meio-sub">O cliente tem mais de um, e o histórico é de cada processo.</p>
    ${ks.map(k=>`<button class="btn-rap" data-zk="${k.id}" style="display:block;width:100%;margin:6px 0;text-align:left">${esc(k.titulo||k.beneficio||"processo")}</button>`).join("")}`);
  document.querySelectorAll("[data-zk]").forEach(b=>b.onclick=()=>gravar(b.dataset.zk));
}
// "virar tarefa": leva o texto ao campo de escrever no caso, que já lê a data do texto e pede quem faz e quando
function tarefaDaMsgZap(msgId){
  if(!podeGravarCaso()) return;   // F355 · o nível 1 conversa, mas não grava no caso
  const m = _zapLado.get(msgId), campo = document.getElementById("and-texto");
  if(!m || !campo) return aviso("Abra o caso na ficha para criar a tarefa");
  campo.value = `${rotZapLado(m)} em ${fmtTS(m.q)}: “${m.texto.trim()}” — `;
  campo.focus();
  if(campo.oninput) campo.oninput();
  campo.setSelectionRange(campo.value.length, campo.value.length);
  campo.scrollIntoView({block:"center"});
  aviso("Complete com o que fazer e escolha quem faz e quando", false);
}
// F266 · ÁUDIO E ANEXO NO PAINEL, SEM SAIR DE PLANO (pedido do Paulo, 24.10.2026): gravar e escolher o arquivo
// só PREPARAM a mensagem; ela fica na prévia, para ouvir ou conferir, e sai no Enviar (ou some no Descartar)
let zapLadoPend = null, zapLadoRec = null;
function pintarPendZap(){
  const box = document.getElementById("pp-zap-pend"), env = document.getElementById("pp-zap-env"), p = zapLadoPend;
  if(env) env.textContent = !p ? "Enviar" : p.tipo==="audio" ? "Enviar áudio" : "Enviar arquivo";
  if(!box) return;
  box.hidden = !p;
  const kb = n => n > 1048576 ? `${(n/1048576).toFixed(1).replace(".",",")} MB` : `${Math.max(1, Math.round(n/1024))} KB`;
  box.innerHTML = !p ? "" : (p.tipo==="audio"
      ? `<span class="pp-rot">Áudio pronto: ouça antes de enviar</span><audio controls src="${p.url}"></audio>`
      : `<span class="pp-rot">Arquivo pronto: confira antes de enviar</span><span class="pp-zap-arq">📎 ${esc(p.nome)} <small>${kb(p.file.size)}</small></span>`)
    + `<button class="pp-sec-bt" onclick="descartarPendZap()">Descartar</button>`;
}
function descartarPendZap(){
  if(zapLadoPend && zapLadoPend.url) URL.revokeObjectURL(zapLadoPend.url);
  zapLadoPend = null; pintarPendZap();
}
async function gravarAudioLado(convId){
  if(zapLadoRec) return zapLadoRec.stop();
  if(!navigator.mediaDevices || !window.MediaRecorder) return aviso("Este navegador não grava áudio");
  let stream;
  try{ stream = await navigator.mediaDevices.getUserMedia({audio:true}); }
  catch(e){ return aviso("Sem permissão para usar o microfone"); }
  const tipo = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "";
  const rec = new MediaRecorder(stream, tipo ? {mimeType: tipo} : undefined), partes = [];
  rec.ondataavailable = e=>{ if(e.data.size) partes.push(e.data); };
  rec.onstop = ()=>{
    stream.getTracks().forEach(t=>t.stop());
    zapLadoRec = null;
    const b = document.getElementById("pp-zap-rec"); if(b){ b.classList.remove("gravando"); b.textContent = "🎤"; }
    const blob = new Blob(partes, {type: rec.mimeType || "audio/webm"});
    if(blob.size < 1500) return aviso("Áudio curto demais");
    descartarPendZap();
    zapLadoPend = {tipo: "audio", blob, url: URL.createObjectURL(blob), conversa: convId};
    pintarPendZap();
  };
  rec.start(); zapLadoRec = rec;
  const b = document.getElementById("pp-zap-rec");
  if(b){ b.classList.add("gravando"); b.textContent = "■"; b.title = "parar a gravação (o envio é depois, no Enviar)"; }
}
// F387 · o print colado (Ctrl+V) na conversa ao lado da ficha fica à espera, como o anexo do 📎: confere e envia
function colarPrintLado(e, convId){
  const it = [...((e.clipboardData && e.clipboardData.items) || [])].find(i=>i.kind==="file" && /^image\//.test(i.type));
  const f = it && it.getAsFile(); if(!f) return;
  e.preventDefault();
  const ext = (f.type.split("/")[1]||"png").replace("jpeg","jpg");
  descartarPendZap();
  zapLadoPend = {tipo: "arquivo", file: new File([f], `print-${Date.now()}.${ext}`, {type: f.type}), nome: "print colado", conversa: convId};
  pintarPendZap();
}
// F387 · a conversa ao lado abre na tela do WhatsApp do CRM, pelo mesmo caminho da menção
function zapNaTela(convId){
  fecharPainelPrazo();
  zapAberta = convId; zapPainelAberto = false; zapLerAoAbrir = convId;
  irPara("whatsapp");
}
function escolherArquivoLado(convId, inp){
  const f = inp.files && inp.files[0]; inp.value = "";
  if(!f) return;
  if(f.size > 60*1024*1024) return aviso("Arquivo grande demais para o WhatsApp (máx. 60 MB)");
  descartarPendZap();
  zapLadoPend = {tipo: "arquivo", file: f, nome: f.name || "arquivo", conversa: convId};
  pintarPendZap();
}
// F267 · ARRASTAR ENTRE AS PARTES (pedido do Paulo, 24.10.2026). Nada se grava nem se envia sozinho: soltar só
// PREENCHE o campo de destino, para conferir e confirmar.
//  · a mensagem do WhatsApp (direita) → o "Comentar neste prazo" da tarefa (esquerda) ou o campo de escrever no caso
//  · o andamento da linha do tempo (meio) → o campo de resposta do WhatsApp, como rascunho para o cliente
function textoDoItemLinha(li){
  const v = li.querySelector('[id^="visto-"]'), id = v && v.id.slice(6);
  const a = id && (D._andsFicha||[]).find(x=>x.id===id);
  const bruto = a ? a.texto : ((li.querySelector(".texto") || li).innerText || "");
  const texto = String(bruto).replace(/^[⏰🔥\s]*\[PRAZO [0-9.]+\]\s*/u, "").replace(/\s+/g, " ").trim();
  return {texto, quando: a ? a.criado_em : null};
}
function rascunhoParaCliente(item){
  const cli = D.cliPorId.get(clienteAberto), nome = cli ? String(cli.nome).split(" ")[0] : "";
  return `Olá${nome ? ", " + nome : ""}! Uma novidade do seu processo${item.quando ? ` (${fmtTS(item.quando)})` : ""}: ${cortaFrase(item.texto, 300)}\n\nSe tiver qualquer dúvida, é só responder por aqui.`;
}
function colocarNoCampo(campo, texto){
  campo.value = campo.value.trim() ? `${campo.value.trim()}\n${texto}` : texto;
  campo.style.height = Math.min(Math.max(campo.scrollHeight + 2, 40), 180) + "px";   // o rascunho inteiro à vista
  campo.focus(); campo.setSelectionRange(campo.value.length, campo.value.length);
  if(campo.oninput) campo.oninput();
  campo.dispatchEvent(new Event("input", {bubbles: true}));
}
