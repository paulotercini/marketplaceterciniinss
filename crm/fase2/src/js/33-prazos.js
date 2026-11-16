async function balcaoCpf(cliId){
  const c = D.cliPorId.get(cliId), msg = document.getElementById("bal-msg");
  const cpf = soDig((document.getElementById("bal-cpf")||{}).value);
  if(!cpfValido(cpf)) return msg.textContent = "CPF inválido: confira os números.";
  let outro = D.clientes.find(x=>x.id!==cliId && digitosCpf(x.cpf)===cpf);
  if(!outro){ const r = await api(`/rest/v1/clientes?select=*&cpf=eq.${cpf}`).catch(()=>[]); if(r && r[0]){ outro = r[0]; D.clientes.push(outro); D.cliPorId.set(outro.id, outro); reindexarCliente(outro); } }
  if(outro){
    msg.innerHTML = `Este CPF já é de <b>${esc(outro.nome)}</b>, que já é cliente. <button class="btn-rap forte" onclick="balcaoJuntar('${cliId}','${outro.id}')" title="Levar as notas desta ficha à de ${esc(outro.nome)} e abri-la">Abrir<span class="sr-only"> a ficha de ${esc(outro.nome)}</span></button>`;
    return;
  }
  try{ await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({cpf})}); }
  catch(e){ return msg.textContent = "Não consegui guardar o CPF. Tente de novo."; }
  c.cpf = cpf; reindexarCliente(c); await abrirFicha(cliId); dossieDoAtendimento(cliId);
}
// o pré-cadastro da agenda era de quem já é cliente: as notas vão à ficha de verdade e o pré-cadastro sai da lista (F254, F256)
async function balcaoJuntar(preId, cliId){
  if(!await juntarFichas(preId, cliId)) return;
  fecharCaixa(); await abrirFicha(cliId); dossieDoAtendimento(cliId, false);
}
// F542 · duas fichas da mesma pessoa viram uma: as anotações, os telefones, os campos que faltam e as linhas
// presas ao cliente (casos, documentos, conversas, senhas, tarefas) passam à ficha com CPF; a outra fica
// marcada (nao_cliente, fundido_para) e sai da pesquisa. Nada é apagado.
const TAB_DO_CLIENTE = ["casos","anexos","credenciais","zap_conversas","aposentadorias","lembretes","tarefas","pagamentos",
  "analises_direito","qualidade_planos","agenda_espera","mencoes","conversas","leads","zap_pedidos_foto"];
async function juntarFichas(preId, cliId){
  const pre = D.cliPorId.get(preId), c = D.cliPorId.get(cliId);
  if(!pre || !c || preId===cliId) return false;
  const pc = pre.campos||{}, notas = pc.atendimento||[];
  const ids = new Set(((c.campos||{}).atendimento||[]).map(n=>n.id||n.em+"|"+n.texto));
  const vem = notas.filter(n=>!ids.has(n.id||n.em+"|"+n.texto));
  const {nao_cliente, fundido_em, fundido_para, atendimento, ...resto} = pc;
  try{
    await gravarCamposBalcao(c, x=>({...resto, ...x, atendimento:[...(x.atendimento||[]), ...vem]}));
    const dig = t => String(t||"").replace(/\D/g,"").slice(-8);
    const tels = telefonesDe(c), novos = telefonesDe(pre).filter(t=>dig(t.numero) && !tels.some(u=>dig(u.numero)===dig(t.numero)));
    if(novos.length){
      const lista = tels.concat(novos.map(t=>({numero:t.numero, obs:t.obs==="principal"?"":(t.obs||""), zap:!tels.length && !!t.zap})));
      await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({telefones:lista})})
        .then(()=>{ c.telefones = lista; }).catch(()=>{});
      if(!c.telefone && lista[0]) await salvarCliCampo(cliId, "telefone", lista[0].numero);
    }
    await gravarCamposBalcao(pre, x=>({...x, nao_cliente:true, fundido_em:new Date().toISOString(), fundido_para:cliId}));
  }catch(e){ aviso("Não consegui juntar as fichas. Tente de novo."); return false; }
  // a tabela que não tem a linha, ou que a RLS barra, não impede o resto
  for(const t of TAB_DO_CLIENTE)
    await api(`/rest/v1/${t}?cliente_id=eq.${preId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({cliente_id:cliId})}).catch(()=>{});
  const ks = D.casosDoCliente.get(preId)||[];
  if(ks.length){ ks.forEach(k=>{ k.cliente_id = cliId; }); D.casosDoCliente.set(cliId, (D.casosDoCliente.get(cliId)||[]).concat(ks)); D.casosDoCliente.delete(preId); }
  reindexarCliente(c); reindexarCliente(pre);
  aviso(`Fichas juntadas na de ${c.nome}`, false);
  return true;
}
// ficha juntada a outra (F256, F542) não aparece na pesquisa
const fichaJuntada = c => { const x = c.campos||{}; return !!(x.nao_cliente && (x.fundido_para || x.fundido_em)); };
async function balcaoSemCpf(cliId){
  const c = D.cliPorId.get(cliId);
  try{ await gravarCamposBalcao(c, x=>({...x, atendimento:[...(x.atendimento||[]), notaBalcao("Chegou sem saber o CPF e sem documento com ele. O dossiê fica para o retorno.")]})); }
  catch(e){ return aviso("Não consegui registrar. Tente de novo."); }
  document.getElementById("bal-msg").innerHTML = `Registrado. Peça que traga um documento com o CPF (RG novo, CNH, carteira de trabalho, título de eleitor, cartão do SUS ou do banco). O advogado atende assim mesmo. <button class="btn-rap forte" onclick="balcaoPronto('${cliId}')" title="Avisar os advogados">Pronto<span class="sr-only"> para o advogado</span></button>`;
}
async function balcaoSenha(cliId){
  const v = ((document.getElementById("bal-senha")||{}).value||"").trim(); if(!v) return;
  const c = D.cliPorId.get(cliId), velha = credInssDe(c);
  try{
    await api(`/rest/v1/credenciais`,{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({cliente_id:cliId, tipo:"meu_inss", valor:v})});
    if(velha) await api(`/rest/v1/credenciais?id=eq.${velha.id}`,{method:"DELETE"}).catch(()=>{});
  }catch(e){ return aviso("Não consegui guardar a senha. Tente de novo."); }
  aviso("Senha guardada", false); await abrirFicha(cliId); dossieDoAtendimento(cliId, false);
}
async function balcaoGov(cliId, r){
  const c = D.cliPorId.get(cliId), msg = document.getElementById("bal-msg");
  if(r==="errada"){
    msg.innerHTML = `Peça a senha atual ao cliente e guarde-a. Se ele não lembrar, recupere no próprio gov.br, em <b>Esqueci minha senha</b> (pelo aplicativo gov.br, pelo banco ou pelo e-mail ou celular cadastrado).
      <div class="form-linha" style="margin-top:6px"><input id="bal-senha" placeholder="senha nova" autocomplete="off" style="width:200px">
      <button class="btn-rap forte" onclick="balcaoSenha('${cliId}')" title="Guardar a senha nova">Guardar<span class="sr-only"> a senha nova</span></button></div>`;
    return;
  }
  const gov = {em:new Date().toISOString(), quem:(eu.nome||"").split(" ")[0], ...(r==="sem"?{sem:true}:{})};
  try{ await gravarCamposBalcao(c, x=>({...x, gov, ...(r==="sem" ? {atendimento:[...(x.atendimento||[]), notaBalcao("Sem acesso ao gov.br no balcão: o dossiê não foi baixado.")]} : {})})); }
  catch(e){ return aviso("Não consegui registrar. Tente de novo."); }
  const s = document.querySelector(".bal-gov"); if(s) s.textContent = govTxt(gov);
  msg.innerHTML = r==="sem"
    ? `Registrado. Se o cliente puder, crie ou recupere a conta em acesso.gov.br agora e rode o dossiê. Se não, o advogado atende com os papéis que ele trouxe; o CNIS em PDF entra pelo <b>Inserir</b> do quadro CNIS.`
    : `Senha conferida. Rode a extensão do dossiê.`;
}
async function balcaoPronto(cliId){
  const c = D.cliPorId.get(cliId);
  const docs = docsDoDossie(cliId).length, falta = cadFaltando(c), g = (c.campos||{}).gov;
  const estado = docs ? `dossiê com ${docs} documento${docs===1?"":"s"}` : !c.cpf ? "sem CPF, sem dossiê" : g && g.sem ? "sem gov.br, sem dossiê" : "dossiê ainda não baixado";
  const n = await avisarClienteNovo(cliId, `${c.nome} está na recepção, pronto para o atendimento: ${estado}; ${falta.length ? `falta no cadastro: ${falta.join(", ")}` : "cadastro completo"}.`);
  fecharCaixa(); aviso(n ? `${n} advogado${n===1?"":"s"} avisado${n===1?"":"s"}` : "Ninguém a avisar", false);
}
// F468 · Chegou para o atendimento (pedido do Paulo de 09.11.2026): a janela da agenda só testa a senha do Meu INSS de quem já
// tem CPF e senha, ou pede o que falta (CPF, senha) e, sem ficha, cria o cliente; o dossiê fica no botão Dossiê da Identificação
function chegouAtendimento(cliId, msg=""){
  const c = D.cliPorId.get(cliId); if(!c || semCadastro()) return;
  const cr = credInssDe(c), g = (c.campos||{}).gov;
  if(c.cpf && cr) return caixa(`<h3 style="margin:0 0 6px">Chegou: ${esc(c.nome||"")}</h3>
    <p class="meio-sub" style="margin:0 0 8px">Teste a senha do Meu INSS: o CPF vai copiado e o portal abre. ${g ? `<span class="bal-gov">${esc(govTxt(g))}</span>` : ""}</p>
    <div class="form-linha" style="margin:0 0 8px"><span class="mono">${fmtCpf(digitosCpf(c.cpf))}</span>
      <button class="btn-rap" onclick="copiar('${c.cpf}','CPF copiado')" title="Copiar o CPF">CPF</button>
      <button class="btn-rap" onclick="copiarCred('${cr.id}')" title="Copiar a senha do Meu INSS">Senha</button>
      <button class="btn-rap forte" onclick="entrarMeuInss('${c.id}')" title="Copiar o CPF e abrir o Meu INSS">Testar</button></div>
    <div class="form-linha"><button class="btn-rap" onclick="chegouGov('${c.id}')" title="A senha entrou no Meu INSS">Entrou</button>
      <button class="btn-rap" onclick="chegouErrada('${c.id}')" title="A senha não entrou">Errada</button></div>
    <div id="bal-msg" class="meio-sub" style="margin-top:8px">${msg}</div>`);
  caixa(`<h3 style="margin:0 0 6px">Chegou: ${esc(c.nome||"")}</h3>
    <p class="meio-sub" style="margin:0 0 8px">Preencha o que falta para testar o Meu INSS.</p>
    <div class="form-linha">${c.cpf ? `<span class="mono">${fmtCpf(digitosCpf(c.cpf))}</span>` : `<input id="bal-cpf" placeholder="CPF" maxlength="14" inputmode="numeric" style="width:160px">`}
      ${cr ? "" : `<input id="bal-senha" placeholder="senha do Meu INSS" autocomplete="off" style="width:190px">`}
      <button class="btn-rap forte" onclick="chegouSalvar('${c.id}')" title="Guardar o CPF e a senha">Salvar</button></div>
    <div id="bal-msg" class="meio-sub" style="margin-top:8px">${msg}</div>`);
}
async function chegouSalvar(cliId){
  const c = D.cliPorId.get(cliId), msg = document.getElementById("bal-msg");
  const iCpf = document.getElementById("bal-cpf"), cpf = iCpf ? soDig(iCpf.value) : "";
  const senha = ((document.getElementById("bal-senha")||{}).value||"").trim();
  if(iCpf){
    if(!cpfValido(cpf)) return msg.textContent = "CPF inválido: confira os números.";
    let outro = D.clientes.find(x=>x.id!==cliId && digitosCpf(x.cpf)===cpf);
    if(!outro){ const r = await api(`/rest/v1/clientes?select=*&cpf=eq.${cpf}`).catch(()=>[]); if(r && r[0]){ outro = r[0]; D.clientes.push(outro); D.cliPorId.set(outro.id, outro); reindexarCliente(outro); } }
    if(outro){ msg.innerHTML = `Este CPF já é de <b>${esc(outro.nome)}</b>. <button class="btn-rap forte" onclick="chegouJuntar('${cliId}','${outro.id}')" title="Levar as notas desta ficha à de ${esc(outro.nome)} e testar a senha dele">Abrir</button>`; return; }
    try{ await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({cpf})}); }
    catch(e){ return msg.textContent = "Não consegui guardar o CPF. Tente de novo."; }
    c.cpf = cpf; reindexarCliente(c);
  }
  if(senha){
    const velha = credInssDe(c);
    try{
      await api(`/rest/v1/credenciais`,{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({cliente_id:cliId, tipo:"meu_inss", valor:senha})});
      if(velha) await api(`/rest/v1/credenciais?id=eq.${velha.id}`,{method:"DELETE"}).catch(()=>{});
    }catch(e){ return msg.textContent = "Não consegui guardar a senha. Tente de novo."; }
  }
  await abrirFicha(cliId); chegouAtendimento(cliId);
}
async function chegouJuntar(preId, cliId){
  if(!await juntarFichas(preId, cliId)) return;
  fecharCaixa(); await abrirFicha(cliId); chegouAtendimento(cliId);
}
async function chegouGov(cliId){
  const c = D.cliPorId.get(cliId), gov = {em:new Date().toISOString(), quem:(eu.nome||"").split(" ")[0]};
  try{ await gravarCamposBalcao(c, x=>({...x, gov})); }catch(e){ return aviso("Não consegui registrar. Tente de novo."); }
  fecharCaixa(); aviso("Senha conferida", false);
}
function chegouErrada(cliId){
  document.getElementById("bal-msg").innerHTML = `Peça a senha atual ao cliente. Se ele não lembrar, recupere no gov.br, em <b>Esqueci minha senha</b>.
    <div class="form-linha" style="margin-top:6px"><input id="bal-senha" placeholder="senha nova" autocomplete="off" style="width:190px">
    <button class="btn-rap forte" onclick="chegouSalvar('${cliId}')" title="Guardar a senha nova">Salvar</button></div>`;
}
// sem ficha no CRM: nome do evento, CPF e senha criam o cliente
function chegouNovo(ev){
  caixa(`<h3 style="margin:0 0 6px">Chegou: cliente novo</h3>
    <p class="meio-sub" style="margin:0 0 8px">Preencha CPF e senha do Meu INSS para criar o cliente.</p>
    <div class="form-linha" style="flex-wrap:wrap"><input id="bal-nome" placeholder="nome completo" value="${esc(nomeDoEvento(ev))}" style="width:240px">
      <input id="bal-cpf" placeholder="CPF" maxlength="14" inputmode="numeric" style="width:160px">
      <input id="bal-senha" placeholder="senha do Meu INSS" autocomplete="off" style="width:190px">
      <button class="btn-rap forte" id="bal-criar" title="Criar o cliente">Criar</button></div>
    <div id="bal-msg" class="meio-sub" style="margin-top:8px"></div>`);
  document.getElementById("bal-criar").onclick = async ()=>{
    const msg = document.getElementById("bal-msg"), nome = document.getElementById("bal-nome").value.replace(/\s+/g," ").trim();
    const cpf = soDig(document.getElementById("bal-cpf").value), senha = document.getElementById("bal-senha").value.trim();
    if(nome.length<3) return msg.textContent = "Informe o nome.";
    if(!cpfValido(cpf)) return msg.textContent = "CPF inválido: confira os números.";
    let outro = D.clientes.find(x=>digitosCpf(x.cpf)===cpf);
    if(!outro){ const r = await api(`/rest/v1/clientes?select=*&cpf=eq.${cpf}`).catch(()=>[]); if(r && r[0]){ outro = r[0]; D.clientes.push(outro); D.cliPorId.set(outro.id, outro); reindexarCliente(outro); } }
    if(outro){ msg.innerHTML = `Este CPF já é de <b>${esc(outro.nome)}</b>. <button class="btn-rap forte" onclick="fecharCaixa();abrirFicha('${outro.id}').then(()=>chegouAtendimento('${outro.id}'))" title="Testar a senha de ${esc(outro.nome)}">Abrir</button>`; return; }
    const tel = soDig(ev.telefone||"");
    let cli;
    try{ [cli] = await api(`/rest/v1/clientes`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({nome, cpf, telefone: tel.length>2 ? fmtTelBR(tel) : null, campos:{atendimento:[notaBalcao("Cliente cadastrado na recepção, na chegada ao atendimento.")]}})}); }
    catch(e){ return msg.textContent = "Não consegui criar o cliente. Tente de novo."; }
    D.clientes.push(cli); D.cliPorId.set(cli.id, cli); reindexarCliente(cli);
    if(senha) await api(`/rest/v1/credenciais`,{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({cliente_id:cli.id, tipo:"meu_inss", valor:senha})})
      .catch(()=>aviso("O cliente gravou, mas a senha não: cadastre de novo pela ficha"));
    fecharCaixa(); await abrirFicha(cli.id); chegouAtendimento(cli.id);
  };
}
function entrarMeuInss(cliId){
  const c = D.cliPorId.get(cliId); if(!c || !c.cpf) return aviso("Sem CPF no cadastro");
  copiar(c.cpf, "CPF copiado: cole no gov.br. A senha copia no 📋 ao lado");
  window.open(MEU_INSS, "_blank", "noopener");
}
// o que costuma acontecer em cada fase: [rótulo, etapa declarada, efeito]
const MOV_FASE = {
  inss:[["Exigência", "em exigência", "exig"], ["Perícia marcada", "aguardando perícia", "data"], ["Deferido", "decidido", "deferido"],
    ["Indeferido", "decidido", "indeferido"], ["Outro", null, ""]],
  conselho:[["Em pauta", "em pauta", "data"], ["Diligência", "em diligência", ""], ["Julgado", "julgado", ""], ["Outro", null, ""]],
  judicial:[["Perícia designada", "perícia designada", "data"], ["Laudo juntado", "perícia realizada", ""], ["Sentença", "sentença publicada", ""],
    ["Recurso ou acórdão", "em recurso", ""], ["Outro", null, ""]],
  pagamento:[["Benefício implantado", "benefício implantado", ""], ["RPV expedida", "RPV expedida", ""], ["Pago", "recebido", ""], ["Outro", null, ""]],
};
function movimentou(casoId, ev){
  if(ev) ev.stopPropagation();
  const k = D.casoPorId.get(casoId); if(!k) return;
  const ops = movOps(k), adv = D.colPorId.get(advogadoDoCliente(k.cliente_id, k)[0]), impl = confDaFase(k).impl;
  const cli = D.cliPorId.get(k.cliente_id) || {};
  caixa(`<h3 style="margin:0 0 4px">O que aconteceu? <small class="meio-sub">· ${esc(cli.nome||"")} · ${esc(tituloCaso(k))}</small></h3>
    <p class="meio-sub" style="margin:0 0 10px">Escreva o detalhe, se quiser, e clique no que aconteceu: vira anotação com ⭐${adv && adv.id!==eu.id ? ` e ${esc(adv.nome.split(" ")[0])} é avisado` : ""}.</p>
    <div class="form-linha mov-campos"><input id="mov-txt" placeholder="detalhe (opcional): o que pediram, a data, o resultado" style="flex:1;min-width:220px">
      <label class="meio-sub">data <input type="date" id="mov-data" title="a data da perícia, da pauta ou do prazo da exigência"></label></div>
    ${impl ? `<div class="form-linha mov-impl"><span class="meio-sub">Se implantou:</span>
      <input id="mov-nb" inputmode="numeric" placeholder="NB" style="width:130px" value="${esc(k.nb||"")}">
      <label class="meio-sub">DIB <input type="date" id="mov-dib" value="${esc(k.dib||"")}"></label>
      <input id="mov-rmi" inputmode="decimal" placeholder="renda R$" style="width:110px"></div>` : ""}
    <div class="esp-lista mov-ops">${ops.map(([r], i)=>`<button type="button" class="esp-it" onclick="registrarMovimento('${casoId}',${i})">${esc(r)}</button>`).join("")}</div>`);
  setTimeout(()=>{ const i = document.getElementById("mov-txt"), a = document.activeElement; if(i && !(a && a.matches && a.matches("input,textarea,select"))) i.focus(); }, 30);
}
async function registrarMovimento(casoId, i){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const [rot, etapa, efeito] = movOps(k)[i] || [];
  if(!rot) return;
  let det = ((document.getElementById("mov-txt")||{}).value||"").trim();
  const data = ((document.getElementById("mov-data")||{}).value||"");
  if(rot==="Outro" && !det) return aviso("Escreva o que aconteceu");
  // F247 · a implantação leva NB, DIB e renda para a anotação e o NB e a DIB para o caso
  const vl = id => ((document.getElementById(id)||{}).value||"").trim();
  const nb = efeito==="impl" ? vl("mov-nb").replace(/\D/g,"") : "", dib = efeito==="impl" ? vl("mov-dib") : "", rmi = efeito==="impl" ? vl("mov-rmi") : "";
  if(efeito==="impl") det = [nb && `NB ${fmtNb(nb)}`, dib && `DIB ${fmtBarra(dib)}`, rmi && `renda R$ ${rmi.replace(/^R\$\s*/,"")}`, det].filter(Boolean).join(", ");
  const advId = advogadoDoCliente(k.cliente_id, k)[0], adv = D.colPorId.get(advId);
  const texto = `${rot==="Outro" ? "" : `${rot}`}${det ? `${rot==="Outro" ? "" : ": "}${det}` : ""}${data ? ` (${fmtBarra(data)})` : ""}${rot==="Outro" ? "" : "."}`.replace(/\.\.$/, ".");
  let and = null;
  try{ [and] = await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify({caso_id:casoId, autor_id:eu.id, texto, importante:true})}); }
  catch(e){ return aviso("Não gravou — tente de novo"); }
  if(!and) return;
  fecharCaixa();
  if(Array.isArray(D._andsFicha) && clienteAberto===k.cliente_id) D._andsFicha.unshift(and);
  if(and.importante) (D.sinalizados = D.sinalizados || []).unshift(and);
  const muda = {};   // F291 · a anotação leva ⭐, mas a do caso só a pessoa acende (a fila de hoje, como no To Do)
  if(etapa && etapasDaFase(k).includes(etapa)) muda.etapa = etapa;
  if(efeito==="deferido" || efeito==="indeferido"){ muda.resultado = efeito; muda.decisao_em = data || hoje(); }
  if(/^reanl_/.test(efeito)){ const r = {...((k.ronda||{}).reanalise||{})};
    if(efeito==="reanl_ped") r.pedida_em = data || hoje(); else { r.decidida_em = data || hoje(); r.resultado = efeito==="reanl_def" ? "deferido" : "indeferido"; }
    muda.ronda = {...(k.ronda||{}), reanalise:r};
    if(efeito==="reanl_def"){ muda.resultado = "deferido"; muda.decisao_em = r.decidida_em; } }
  if(efeito==="exig"){ muda.exigencia_prazo = data || proxDiaUtilAdm(somaDias(hoje(), 30)); muda.exigencia_descricao = det || "Exigência do INSS"; }
  if(efeito==="impl"){
    if(nb && nb!==soDig(k.nb||"") && !(k.nbs||[]).map(soDig).includes(nb)) Object.assign(muda, k.nb ? {nbs:[...(Array.isArray(k.nbs)?k.nbs:[]), nb]} : {nb});
    if(dib && !k.dib) muda.dib = dib;
    muda.ronda = {...(k.ronda||{}), implantado:hoje()};
  }
  const antes = Object.fromEntries(Object.keys(muda).map(c=>[c, k[c]===undefined ? null : k[c]]));   // 11.92 · JUR-06
  Object.assign(k, muda);
  if(Object.keys(muda).length) await patchCaso(casoId, muda).catch(()=>{});
  // a data da perícia ou da pauta vira lembrete do advogado responsável, nesse dia
  if(data && efeito==="data") try{ const [tf] = await api(`/rest/v1/andamento_tarefas`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({andamento_id:and.id, caso_id:casoId, colaborador_id:advId || eu.id, atribuido_por:eu.id, lembrar_em:data, natureza:"lembrete"})}); tarefaNaMemoria(tf); }catch(e){}
  if(advId && advId!==eu.id) criarMencoes(texto, casoId, and.id, [advId]).catch(()=>{});
  montarSidebar(); render(); if(clienteAberto===k.cliente_id) repintarFicha();
  // 11.92 · JUR-06: desfazer como no "Em análise": o caso volta e a anotação sai (com a menção e o lembrete, em cascata no banco)
  avisoDesfazer(`${rot}${adv && adv.id!==eu.id ? ` · ${adv.nome.split(" ")[0]} avisado` : ""}`, async ()=>{
    Object.assign(k, antes);
    if(Object.keys(antes).length) await patchCaso(casoId, antes).catch(()=>{});
    await api(`/rest/v1/andamentos?id=eq.${and.id}`,{method:"DELETE"}).catch(()=>{});
    if(Array.isArray(D._andsFicha)) D._andsFicha = D._andsFicha.filter(a=>a.id!==and.id);
    D.sinalizados = (D.sinalizados||[]).filter(a=>a.id!==and.id);
    const ts = D.tarefasPorCaso.get(casoId); if(ts) D.tarefasPorCaso.set(casoId, ts.filter(t=>t.andamento_id!==and.id));
    aviso("Desfeito"); montarSidebar(); render(); if(clienteAberto===k.cliente_id) repintarFicha();
  });
}
// o advogado responsável, abaixo do nome do cliente: o escolhido ou o advogado dos casos
function linhaAdvogado(c){
  const id = advogadoDoCliente(c.id)[0], co = D.colPorId.get(id);
  // F254 · o "fora da lista" segue à vista; o botão de mudar foi ao ⋯ do cabeçalho (F274, itemNaoCliente)
  const nc = ehContato(c) ? ` · ${seloContato(c)}` : souAdmin() && !ehClienteDaLista(c) ? ` · <span class="chip neutro">fora da lista Clientes</span>` : "";
  return `<span class="cli-adv">Advogado<span class="fp2-sr"> responsável:</span> <button type="button" class="cli-adv-bt" onclick="escolherAdvogado('${c.id}')"
    title="trocar o advogado responsável por este cliente: é quem a ⭐ e a movimentação avisam">${esc(co ? co.nome : "escolher")} ▾</button>${nc}</span>`;
}
function itemNaoCliente(c){
  if(!souAdmin()) return "";
  return ehClienteDaLista(c)
    ? `<button class="tl-mais-it cli-nao" role="menuitem" onclick="marcarNaoCliente('${c.id}',true)" title="tira este cadastro da lista Clientes (não apaga nada)">Não é cliente</button>`
    : `<button class="tl-mais-it cli-sim" role="menuitem" onclick="marcarNaoCliente('${c.id}',false)" title="volta este cadastro à lista Clientes">É cliente</button>`;
}
function escolherAdvogado(cliId){
  const c = D.cliPorId.get(cliId); if(!c) return;
  const atual = advogadoDoCliente(cliId)[0], advs = equipeAtiva().filter(x=>x.cargo==="advogado" || x.papel==="admin");
  caixa(`<h3 style="margin:0 0 8px">Advogado responsável <small class="meio-sub">· ${esc(c.nome)}</small></h3>
    <div class="esp-lista">${(advs.length ? advs : equipeAtiva()).map(x=>`<button type="button" class="esp-it${x.id===atual?" on":""}" onclick="gravarAdvogado('${cliId}','${x.id}')">${esc(x.nome)}</button>`).join("")}</div>`);
}
async function gravarAdvogado(cliId, colId){
  const c = D.cliPorId.get(cliId); if(!c) return;
  c.campos = {...(c.campos||{}), advogado_id:colId};
  try{ await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({campos:c.campos})}); }
  catch(e){ return aviso("Não gravou — tente de novo"); }
  fecharCaixa(); aviso(`Advogado responsável: ${(D.colPorId.get(colId)||{}).nome||""}`, false); repintarFicha();
}
// F247 · TENTEI CONTATO, SEM RESPOSTA. O ciclo mais escrito à mão ("Entrei em contato", "não retornou", "Aguardar
// até…"): um clique anota a tentativa, conta quantas seguidas já foram e marca a próxima para 2 dias úteis; da
// terceira em diante, oferece a mensagem pronta no WhatsApp. Dá para desfazer.
const RX_SEM_RESPOSTA = /^\[CONTATO\] Sem resposta/;
function tentativasSemResposta(casoId){
  const ands = (D._andsFicha||[]).filter(a=>a.caso_id===casoId && !a.excluir && !ehOficial(a))
    .sort((x,y)=>x.criado_em<y.criado_em?1:-1);
  let n = 0; for(const a of ands){ if(RX_SEM_RESPOSTA.test(a.texto||"")) n++; else break; }
  return n;
}
function msgRetorno(c){
  return `Olá, ${(c.nome||"").split(" ")[0]}! Aqui é ${(eu.nome||"").split(" ")[0]}, do escritório Paulo Tercini. Tentamos falar com você sobre o seu processo. Pode nos retornar quando puder?`;
}
async function semResposta(casoId, canal){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const c = D.cliPorId.get(k.cliente_id) || {}, n = tentativasSemResposta(casoId) + 1;
  const quando = proxDiaUtil(somaDias(hoje(), 2));
  const texto = `[CONTATO] Sem resposta (${n}ª tentativa, ${canal||"telefone"}). Tentar de novo em ${fmtBarra(quando)}.`;
  let and = null, tf = null;
  try{ [and] = await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify({caso_id:casoId, autor_id:eu.id, texto})}); }
  catch(e){ return aviso("Não gravou — tente de novo"); }
  if(!and) return;
  fecharCaixa();
  api(`/rest/v1/andamentos_lidos`,{method:"POST",headers:{Prefer:"return=minimal,resolution=merge-duplicates"},
    body:JSON.stringify({andamento_id:and.id, colaborador_id:eu.id})}).catch(()=>{});
  if(Array.isArray(D._andsFicha)) D._andsFicha.unshift(and);
  try{ [tf] = await api(`/rest/v1/andamento_tarefas`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify({andamento_id:and.id, caso_id:casoId, colaborador_id:eu.id, atribuido_por:eu.id, lembrar_em:quando, natureza:"lembrete"})});
    tarefaNaMemoria(tf); }catch(e){}
  const repinta = () => { montarSidebar(); render(); if(clienteAberto===k.cliente_id) repintarFicha(); };
  repinta();
  avisoDesfazer(`${n}ª tentativa sem resposta · tentar de novo em ${fmtBarra(quando)}`, async ()=>{
    await api(`/rest/v1/andamentos?id=eq.${and.id}`,{method:"DELETE"}).catch(()=>{});
    if(Array.isArray(D._andsFicha)) D._andsFicha = D._andsFicha.filter(a=>a.id!==and.id);
    if(tf){ api(`/rest/v1/andamento_tarefas?id=eq.${tf.id}`,{method:"DELETE"}).catch(()=>{});
      D.tarefasPorCaso.set(casoId, (D.tarefasPorCaso.get(casoId)||[]).filter(t=>t.id!==tf.id)); }
    repinta(); aviso("Tentativa desfeita", false);
  });
  // F447 · três tentativas seguidas sem resposta: o advogado do cliente fica sabendo
  const adv = n===3 && advogadoDoCliente(k.cliente_id, k)[0];
  if(adv && adv!==eu.id) api(`/rest/v1/mencoes`,{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({de_id:eu.id, para_id:adv, caso_id:casoId, andamento_id:and.id,
    texto:`☎ ${c.nome||"O cliente"} não respondeu a 3 tentativas de contato (${canal||"telefone"}).`})}).catch(()=>{});
  const tel = soDig(c.telefone);
  if(n>=3 && tel) caixa(`<h3 style="margin:0 0 6px">${n}ª tentativa sem resposta</h3>
    <p class="meio-sub" style="margin:0 0 10px">Mande a mensagem pronta pelo WhatsApp:</p>
    <p class="sr-msg" style="background:var(--fundo2,#f5f5f2);padding:10px;border-radius:8px;margin:0 0 10px">${esc(msgRetorno(c))}</p>
    <a class="btn-rap sr-zap" target="_blank" rel="noopener" onclick="fecharCaixa()" href="https://wa.me/55${tel}?text=${encodeURIComponent(msgRetorno(c))}" aria-label="Abrir no WhatsApp">${iconeFonte("zap")} Abrir</a>`);
}
function semRespostaMenu(casoId){
  const n = tentativasSemResposta(casoId);
  caixa(`<h3 style="margin:0 0 4px">Tentei contato, sem resposta</h3>
    <p class="meio-sub" style="margin:0 0 10px">${n ? `Já são ${n} tentativa(s) seguida(s). ` : ""}Anota a tentativa e marca a próxima para daqui a 2 dias úteis.</p>
    <div class="esp-lista">${["telefone","WhatsApp","e-mail"].map(x=>`<button type="button" class="esp-it" onclick="semResposta('${casoId}','${x}')">${x}</button>`).join("")}</div>`);
}
// F247 · PEDIR AO CLIENTE no caso em andamento. O pedido entra em `campos.docs_pedidos` preso ao caso (caso_id), com a
// data de entrega: aparece no "Trouxe documentos" e baixa sozinho quando o papel chega. Na data, um lembrete cobra.
function pedirAoCliente(casoId){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const c = D.cliPorId.get(k.cliente_id) || {};
  caixa(`<h3 style="margin:0 0 4px">Pedir ao cliente <small class="meio-sub">· ${esc(c.nome||"")} · ${esc(tituloCaso(k))}</small></h3>
    <p class="meio-sub" style="margin:0 0 8px">Um documento por linha. Quando chegar, a recepção marca no “Trouxe documentos” e o pedido baixa.</p>
    <textarea id="pc-itens" rows="3" style="width:100%;font:inherit;padding:8px;border:1px solid var(--borda);border-radius:8px" placeholder="Relatório médico atualizado&#10;Senha do Meu INSS"></textarea>
    <div class="form-linha" style="margin-top:8px;align-items:center">
      <label class="meio-sub">entregar até <input type="date" id="pc-ate" value="${proxDiaUtil(somaDias(hoje(), 15))}"></label>
      <button class="btn-rap" style="margin-left:auto" onclick="gravarPedidoAoCliente('${casoId}')" title="Registrar o pedido">Registrar<span class="sr-only"> o pedido</span></button></div>`);
  setTimeout(()=>{ const i = document.getElementById("pc-itens"); if(i) i.focus(); }, 30);
}
// a recepção do escritório: o cargo recepção e, sem ninguém nele, os estagiários (que fazem a recepção hoje)
function recepcaoAtiva(){
  const eq = equipeAtiva(), r = eq.filter(x=>x.cargo==="recepcao");
  return r.length ? r : eq.filter(x=>x.cargo==="estagiario");
}
async function gravarPedidoAoCliente(casoId){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const c = D.cliPorId.get(k.cliente_id); if(!c) return;
  const itens = linhasDe((document.getElementById("pc-itens")||{}).value);
  if(!itens.length) return aviso("Escreva ao menos um documento");
  const ate = (document.getElementById("pc-ate")||{}).value || null;
  const pedidos = [...((c.campos||{}).docs_pedidos||[]), {em:new Date().toISOString(), quem:(eu.nome||"").split(" ")[0],
    caso_id:casoId, ...(ate?{ate}:{}), itens:itens.map(nome=>({nome, entregue:null}))}];
  const texto = `[DOCUMENTOS] Pedido ao cliente: ${itens.join("; ")}.${ate ? ` Entregar até ${fmtBarra(ate)}.` : ""}`;
  let and = null;
  try{
    await api(`/rest/v1/clientes?id=eq.${c.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({campos:{...(c.campos||{}), docs_pedidos:pedidos}})});
    c.campos = {...(c.campos||{}), docs_pedidos:pedidos};
    [and] = await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:casoId, autor_id:eu.id, texto})});
  }catch(e){ return aviso("Não gravou o pedido — tente de novo"); }
  fecharCaixa();
  if(and && Array.isArray(D._andsFicha)) D._andsFicha.unshift(and);
  if(and && ate) try{ const [tf] = await api(`/rest/v1/andamento_tarefas`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({andamento_id:and.id, caso_id:casoId, colaborador_id:eu.id, atribuido_por:eu.id, lembrar_em:ate, natureza:"lembrete"})}); tarefaNaMemoria(tf); }catch(e){}
  // F447 · quem fala com o cliente é a recepção: o pedido do advogado chega a ela
  if(and) for(const r of recepcaoAtiva().filter(x=>x.id!==eu.id))
    api(`/rest/v1/mencoes`,{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({de_id:eu.id, para_id:r.id, caso_id:casoId, andamento_id:and.id,
      texto:`📄 ${(eu.nome||"").split(" ")[0]} pediu a ${c.nome}: ${itens.join("; ")}.${ate ? ` Entregar até ${fmtBarra(ate)}.` : ""} Avisar o cliente.`})}).catch(()=>{});
  montarSidebar(); render(); if(clienteAberto===k.cliente_id) repintarFicha();
  aviso(`${itens.length} documento(s) pedido(s) ao cliente${ate ? ` até ${fmtBarra(ate)}` : ""}`, false);
}
// ══════════════════════════════════════════════════════════════════════════
// F248 · OUVIDORIA E ACORDO EM UM CLIQUE (a segunda leva do levantamento de 20.10.2026: "Fazer reclamação na
// ouvidoria", "Resposta da ouvidoria…", "Foi oferecida proposta de acordo", "Aceitei a proposta", "Concordei com os
// cálculos"). O CRM só registra o que a pessoa fez no portal; nada é enviado daqui.
// ══════════════════════════════════════════════════════════════════════════
// a anotação de um clique, com o lembrete opcional e o desfazer
async function anotarUmClique(casoId, texto, o={}){
  const k = D.casoPorId.get(casoId); if(!k) return null;
  let and = null, tf = null;
  try{ [and] = await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify({caso_id:casoId, autor_id:eu.id, texto, ...(o.responde_a?{responde_a:o.responde_a}:{}), ...(o.importante?{importante:true}:{})})}); }
  catch(e){ aviso("Não gravou — tente de novo"); return null; }
  if(!and) return null;
  fecharCaixa();
  api(`/rest/v1/andamentos_lidos`,{method:"POST",headers:{Prefer:"return=minimal,resolution=merge-duplicates"},
    body:JSON.stringify({andamento_id:and.id, colaborador_id:eu.id})}).catch(()=>{});
  if(Array.isArray(D._andsFicha)) D._andsFicha.unshift(and);
  if(o.lembrarEm) try{ [tf] = await api(`/rest/v1/andamento_tarefas`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify({andamento_id:and.id, caso_id:casoId, colaborador_id:eu.id, atribuido_por:eu.id, lembrar_em:o.lembrarEm, natureza:"lembrete"})});
    tarefaNaMemoria(tf); }catch(e){}
  const repinta = () => { montarSidebar(); render(); if(clienteAberto===k.cliente_id) repintarFicha(); };
  repinta();
  avisoDesfazer(o.rot || "Anotado", async ()=>{
    await api(`/rest/v1/andamentos?id=eq.${and.id}`,{method:"DELETE"}).catch(()=>{});
    if(Array.isArray(D._andsFicha)) D._andsFicha = D._andsFicha.filter(a=>a.id!==and.id);
    if(tf){ api(`/rest/v1/andamento_tarefas?id=eq.${tf.id}`,{method:"DELETE"}).catch(()=>{});
      D.tarefasPorCaso.set(casoId, (D.tarefasPorCaso.get(casoId)||[]).filter(t=>t.id!==tf.id)); }
    repinta(); aviso("Desfeito", false);
  });
  return and;
}
// a Ouvidoria responde em até 30 dias, prorrogáveis (Lei 13.460/2017, art. 16)
const RX_OUVIDORIA = /^\[OUVIDORIA\]/;
const ouvidoriaDoCaso = k => (D._andsFicha||[]).some(a=>a.caso_id===k.id && !a.excluir && RX_OUVIDORIA.test(a.texto||"") && (!k.der || dataSP(a.criado_em)>=k.der));
// F623 · encerra a linha do prazo de análise do INSS (compromisso, não prazo fatal) sem mexer no prazo calculado
function botaoMoraFora(k, data){
  return `<button class="btn-mini mora-fora" onclick="fecharCaixa();concluirMora('${k.id}','${data}')" title="encerra esta linha do prazo de análise do INSS; volta se o prazo mudar"><span aria-hidden="true">Concluir</span><span class="sr-only">Concluir o prazo de análise do INSS</span></button>`;
}
function concluirMora(casoId, data){
  const k = D.casoPorId.get(casoId); if(!k) return;
  if(typeof fecharPainelPrazo==="function") fecharPainelPrazo();
  return gravarRonda(k, {...(k.ronda||{}), mora_fora:{data, por:(eu&&eu.id)||null, em:new Date().toISOString()}}, "Prazo de análise concluído");
}
function botaoOuvidoria(k){
  return ouvidoriaDoCaso(k)
    ? `<button class="btn-mini ouv-resp" onclick="fecharCaixa();ouvidoriaRespondeu('${k.id}')" title="anota que a Ouvidoria respondeu e o pedido segue em análise; confere de novo em 15 dias">Ouvidoria respondeu · +15 d</button>`
    : `<button class="btn-mini ouv-abrir" onclick="fecharCaixa();abrirOuvidoria('${k.id}')" title="registra a reclamação feita no Fala.BR e marca a resposta para 30 dias"><span aria-hidden="true">Ouvidoria</span><span class="sr-only">Abrir Ouvidoria</span></button>`;
}
function abrirOuvidoria(casoId){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const c = D.cliPorId.get(k.cliente_id) || {};
  caixa(`<h3 style="margin:0 0 4px">Reclamação na Ouvidoria <small class="meio-sub">· ${esc(c.nome||"")} · ${esc(tituloCaso(k))}</small></h3>
    <p class="meio-sub" style="margin:0 0 8px">Abra a reclamação no Fala.BR (prazo de análise do INSS vencido) e registre aqui o número; a resposta fica marcada para 30 dias.</p>
    <div class="form-linha" style="align-items:center"><input id="ouv-num" placeholder="nº da manifestação (opcional)" style="width:240px">
      <a class="btn-rap" href="https://falabr.cgu.gov.br/" target="_blank" rel="noopener" aria-label="Abrir o Fala.BR">${iconeFonte("falabr")} Abrir</a>
      <button class="btn-rap" style="margin-left:auto" onclick="gravarOuvidoria('${casoId}')" title="Registrar a reclamação">Registrar<span class="sr-only"> a reclamação</span></button></div>`);
}
function gravarOuvidoria(casoId){
  const num = ((document.getElementById("ouv-num")||{}).value||"").trim(), quando = proxDiaUtil(somaDias(hoje(), 30));
  return anotarUmClique(casoId, `[OUVIDORIA] Reclamação aberta na Ouvidoria pelo prazo de análise vencido${num?` (nº ${num})`:""}. Ver a resposta em ${fmtBarra(quando)}.`,
    {lembrarEm:quando, rot:`Ouvidoria aberta · resposta em ${fmtBarra(quando)}`});
}
function ouvidoriaRespondeu(casoId){
  const quando = proxDiaUtil(somaDias(hoje(), 15));
  return anotarUmClique(casoId, `[OUVIDORIA] A Ouvidoria respondeu: o pedido segue em análise. Conferir de novo em ${fmtBarra(quando)}.`,
    {lembrarEm:quando, rot:`Ouvidoria respondeu · conferir em ${fmtBarra(quando)}`});
}
// a proposta de acordo e os cálculos do movimento judicial: o que se fez no processo, num clique
const RX_ACORDO_FEITO = /^(Aceitei|Recusei) o acordo|^Proposta de acordo: falar com o cliente|^Concordei com os cálculos/;
function botoesAcordo(a){
  const mv = movimentoJudicial(a.texto); if(!mv || mv.fonte==="CRPS") return "";
  const t = dsa(mv.ato);
  if((D._andsFicha||[]).some(x=>x.responde_a===a.id && RX_ACORDO_FEITO.test(x.texto||""))) return "";
  const bt = (rot, tipo, forte, tit) => `<button class="tl-bt${forte?" forte":""} acordo-bt" onclick="respostaAcordo('${a.id}','${tipo}')" title="${esc(tit)}">${rot}</button>`;
  if(/acordo/.test(t) && !/homolog/.test(t))
    return bt("Aceitei o acordo", "aceitei", true, "registra que a proposta foi aceita no processo") + bt("Recusei", "recusei", false, "registra a recusa; o processo segue")
      + bt("Falar com o cliente", "cliente", false, "anota e lembra você de responder em 2 dias úteis");
  if(/calculo/.test(t) && !/homolog|contadoria/.test(t))
    return bt("Concordei com os cálculos", "calculos", true, "registra a concordância com os cálculos no processo");
  return "";
}
function respostaAcordo(andId, tipo){
  const a = (D._andsFicha||[]).find(x=>x.id===andId); if(!a) return;
  const em2 = proxDiaUtil(somaDias(hoje(), 2));
  const T = {aceitei:"Aceitei o acordo proposto pelo INSS.", recusei:"Recusei o acordo proposto pelo INSS; o processo segue.",
    cliente:`Proposta de acordo: falar com o cliente antes de responder. Responder até ${fmtBarra(em2)}.`, calculos:"Concordei com os cálculos."}[tipo];
  if(!T) return;
  return anotarUmClique(a.caso_id, T, {responde_a:a.id, importante:tipo==="aceitei" || tipo==="calculos", lembrarEm:tipo==="cliente" ? em2 : null, rot:T.replace(/\.$/,"")});
}
// ══════════════════════════════════════════════════════════════════════════
// F249 · A TRANSIÇÃO EM NÍVEIS (crm/fase2/docs/TRANSICAO.md, decisões do Paulo de 20.10.2026). O To Do era só escrever
// a anotação; o CRM tem muito mais. Cada colaborador tem um nível (1 · WhatsApp, 2 · anotação e andamentos dos portais,
// 3 · completo) e a onda diz quais recursos já foram ligados para os níveis 1 e 2. A anotação é o centro em todos:
// o que o CRM calcula continua por trás, e o que se escreve no 1 aparece igual no 3. Sem a transição ligada, todos
// veem o completo, como antes.
// ══════════════════════════════════════════════════════════════════════════
const TRANS_CHAVE = "crm_transicao";
const ONDAS = [[1, "Lembrar em, “Em análise · +7 d” e Concluir"], [2, "Sem resposta, Pedir ao cliente e Trouxe documentos"],
  [3, "Perícia: agendar, avisar e compareceu"], [4, "Movimentou, acordo e Ouvidoria"], [5, "Primeiro atendimento em quadros e Documentos completo"],
  [6, "Análise de Direito por requisitos"]];
// o que fica escondido nos níveis 1 e 2 enquanto a onda dele não chega
const REC_ONDA = {2:".tipo-sr,.tipo-pc,.td-abrir", 3:".tl-pericia .tl-barra-of", 4:".conf-mov,.acordo-bt,.ouv-abrir,.ouv-resp"};
const ONDA_TELA = {pa:5, doc:5, ad:6};
// config_app.valor é texto: a transição vai em JSON
// F396 · o nível 2 passou a ser cadastro e dossiê (decisão do Paulo de 06.11.2026): a gravação antiga (sem v) tinha
// 2 · anotação e 3 · completo, que se leem como 3 e 4
const NV_MAX = 4, NIVEIS = [0, 1, 2, 3, 4];
function lerTransicao(){
  const v = cfgApp(TRANS_CHAVE); let t;
  if(v && typeof v==="object") t = v; else { try{ t = v ? JSON.parse(v) : null; }catch(e){ t = null; } }
  if(!t || (t.v||1) >= 2) return t;
  const niveis = {}; for(const [k, n] of Object.entries(t.niveis||{})) niveis[k] = n>=2 ? n + 1 : n;
  return {...t, niveis, v:2};
}
function transicao(){ const t = lerTransicao(); return t && t.ligada ? t : null; }
function nivelDe(colId){
  const t = transicao(); if(!t) return NV_MAX;
  const n = (t.niveis||{})[colId], co = D.colPorId && D.colPorId.get(colId);
  return NIVEIS.includes(n) ? n : (co && co.papel==="admin" ? NV_MAX : 0);
}
// o administrador pode olhar o CRM como um nível, nesta sessão, sem trocar de usuário
const verNivel = () => { try{ const v = sessionStorage.getItem("crm_ver_nivel"); return v==null || v==="" ? null : +v; }catch(e){ return null; } };
const meuNivel = () => !eu ? NV_MAX : (souAdmin() && transicao() && verNivel()!=null) ? verNivel() : nivelDe(eu.id);
function verComoNivel(n){
  try{ if(n==null) sessionStorage.removeItem("crm_ver_nivel"); else sessionStorage.setItem("crm_ver_nivel", String(n)); }catch(e){}
  fecharCaixa(); aplicarNivel(); if(clienteAberto) fecharFicha(false); visao = "meudia"; montarSidebar(); render();
  aviso(n==null ? "De volta à sua visão" : `Você está vendo o CRM como o nível ${n}. Para voltar, use a faixa no alto da tela.`, false);
}
const ondaAtual = () => (transicao()||{}).onda || ONDAS.length;
const _verCompleto = new Set();   // as telas abertas por inteiro nesta sessão
const telaSimples = (tela, c) => meuNivel()<NV_MAX && ondaAtual()<ONDA_TELA[tela] && _atendAberto.has(c.id) && !_verCompleto.has(tela);
function verCompleto(tela){ _verCompleto.add(tela); repintarFicha(); }
function aplicarNivel(){
  const n = meuNivel(), o = ondaAtual(), h = document.documentElement;
  // F253 · o administrador que olha como outro nível vê sempre a faixa para voltar
  let fx = document.getElementById("ver-nivel-faixa");
  if(souAdmin() && transicao() && verNivel()!=null){
    if(!fx){ fx = document.createElement("div"); fx.id = "ver-nivel-faixa"; document.body.appendChild(fx); }
    fx.innerHTML = `<span>Você está vendo o CRM como o <b>nível ${verNivel()}</b>.</span><button type="button" onclick="verComoNivel(null)" title="Voltar à minha visão">Voltar<span class="sr-only"> à minha visão</span></button>`;
  } else if(fx) fx.remove();
  if(n<NV_MAX) h.setAttribute("data-nivel", String(n)); else h.removeAttribute("data-nivel");
  if(podeCadastrar()) h.removeAttribute("data-sem-cad"); else h.setAttribute("data-sem-cad", "");   // F396
  const css = n<NV_MAX ? Object.entries(REC_ONDA).filter(([w])=>n<=2 || o < +w)
    .map(([, sel])=>sel.split(",").map(x=>`html[data-nivel] ${x}`).join(",") + "{display:none!important}").join("\n") : "";
  let st = document.getElementById("css-ondas");
  if(!st){ st = document.createElement("style"); st.id = "css-ondas"; document.head.appendChild(st); }
  st.textContent = css;
}
const linkCompleto = (tela, rot) => `<button type="button" class="tl-bt nv-completo" onclick="verCompleto('${tela}')" title="mostra a tela inteira nesta sessão">${rot}</button>`;
function paSimples(c, ks){
  const docs = docsDoDossie(c.id);
  return `<div class="nv-simples" id="pa-simples"><h3>Primeiro atendimento</h3>
    <p class="meio-sub">Escreva o relato do atendimento na <b>Conversa da equipe</b>, logo abaixo, como no To Do. Escolha aqui o benefício que vai à Análise de Direito.</p>
    ${faixaBeneficios(c, null)}
    ${docs.length ? `<details class="nv-docs"><summary>O que o dossiê trouxe (${docs.length} documento${docs.length>1?"s":""})</summary>
      <ul>${docs.map(a=>`<li><button type="button" class="adr-link" onclick="abrirAnexo('${a.id}')">${esc(fonteDoDossie(a)[1])}</button></li>`).join("")}</ul></details>`
      : `<p class="meio-sub">Sem dossiê ainda.</p>`}
    ${previusLinha(c)}
    ${linkCompleto("pa", "Ver o Primeiro atendimento completo")}</div>`;
}
function adSimples(c){
  const ks = D.casosDoCliente.get(c.id)||[];
  return `<div class="adr"><div class="nv-simples" id="ad-simples"><h3>Análise de Direito</h3>
    <p class="meio-sub">O CRM mostra o veredito de cada benefício escolhido; clique num deles para ver os requisitos. O parecer é seu, em texto livre.</p>
    ${quadradoBeneficios(c, ks)}<div id="ad-benef"></div>
    ${caixaConsideracoes(c)}${linhaDesfecho(c)}
    ${linkCompleto("ad", "Ver a Análise de Direito completa")}</div></div>`;
}
function docSimples(c, ks){
  return `<div class="doc-quadros nv-simples" id="doc-simples">
    <section class="doc-quadro" id="dq-assinar">${caixaDocumentos(c, ks)}</section>${quadroGerados(c)}
    <section class="doc-quadro" id="dq-desfecho">${quadroDesfecho(c)}</section>
    ${linkCompleto("doc", "Ver Documentos completo")}</div>`;
}
// o painel do Paulo: a onda e o nível de cada um
function abrirTransicao(){
  if(!souAdmin()) return;
  // o painel é o mesmo ligada ou não: com ela desligada, os números mostram onde cada um vai ficar, e escolher um
  // nível ou uma onda já liga a transição (antes só havia "Ligar", e os números do texto não eram botões)
  const t = transicao(), atual = lerTransicao() || {}, onda = t ? t.onda : 1;
  const nv = id => { const n = (atual.niveis||{})[id], co = D.colPorId.get(id);
    return NIVEIS.includes(n) ? n : (co && co.papel==="admin" ? NV_MAX : 0); };
  caixa(`<h3 style="margin:0 0 6px">Transição do To Do · <span class="trn-estado">${t ? "ligada" : "desligada"}</span></h3>
    <p class="meio-sub" style="margin:0 0 8px">${t ? "Cada colaborador vê o CRM do nível dele." : "Hoje todos veem o CRM completo. Escolher um nível ou uma onda, ou o botão abaixo, liga a transição."}</p>
    <p class="meio-sub" style="margin:0">Onda em vigor para os níveis 1 e 2:</p>
    <div class="trn-ondas">${ONDAS.map(([n, r])=>`<button type="button" class="esp-it trn-onda${n===onda?" on":""}" onclick="gravarTransicao({onda:${n}})">${n} · ${esc(r)}</button>`).join("")}</div>
    <p class="meio-sub" style="margin:0">Nível de cada um (0 · Agenda e Identificação, 1 · WhatsApp, 2 · cadastro e dossiê, 3 · anotação e andamentos dos portais, 4 · completo):</p>
    <ul class="trn-lista">${equipeAtiva().map(co=>`<li><b>${esc(co.nome)}</b>${NIVEIS.map(n=>`<button type="button" class="btn-mini trn-nv${nv(co.id)===n?" on":""}" data-col="${co.id}" data-n="${n}" aria-pressed="${nv(co.id)===n}" onclick="gravarTransicao({col:'${co.id}', n:${n}})">${n}</button>`).join("")}</li>`).join("")}</ul>
    ${t ? `<p class="meio-sub" style="margin:10px 0 4px">Ver o CRM como o colaborador vê (só para você, nesta sessão):</p>
      <div class="form-linha trn-ver">${[0, 1, 2, 3].map(n=>`<button type="button" class="btn-mini trn-ver-n${verNivel()===n?" on":""}" onclick="verComoNivel(${n})">nível ${n}</button>`).join("")}
        ${verNivel()!=null ? `<button type="button" class="btn-mini trn-ver-volta" onclick="verComoNivel(null)" title="Voltar à minha visão">Voltar<span class="sr-only"> à minha visão</span></button>` : ""}</div>` : ""}
    ${t ? `<button class="btn-rap trn-desligar" onclick="gravarTransicao({ligada:false})" title="Desligar a transição">Desligar<span class="sr-only"> a transição</span></button>`
        : `<button class="btn-rap trn-ligar" onclick="gravarTransicao({ligada:true, onda:1})" title="Ligar a transição">Ligar<span class="sr-only"> a transição</span></button>`}`);
}
async function gravarTransicao(o){
  const atual = lerTransicao() || {}, t = {...atual, niveis:{...(atual.niveis||{})}, v:2};
  if("ligada" in o) t.ligada = o.ligada;
  else if(!t.ligada) t.ligada = true;   // escolher um nível ou uma onda com ela desligada liga a transição
  if(t.ligada){ t.onda = o.onda || t.onda || 1; if(t.niveis[eu.id]==null) t.niveis[eu.id] = NV_MAX; }
  if(o.col) t.niveis[o.col] = o.n;
  try{ await guardarCfgApp(TRANS_CHAVE, JSON.stringify(t)); }catch(e){ return aviso("Não gravou — tente de novo"); }
  aplicarNivel(); montarSidebar(); render(); if(clienteAberto) repintarFicha();
  if(t.ligada) abrirTransicao(); else { fecharCaixa(); aviso("Transição desligada: todos veem o CRM completo", false); }
}
async function toggleUrg(casoId){
  const k=D.casoPorId.get(casoId); if(!k) return;
  k.urgente=!k.urgente;
  await patchCaso(casoId, {urgente:k.urgente});
  aviso(k.urgente?"🔥 Marcado como URGENTE":"Urgência removida");
  montarSidebar(); if(clienteAberto) abrirFicha(clienteAberto);
}
async function moverFase(casoId, fase){
  const k=D.casoPorId.get(casoId); if(!k || k.fase===fase) return;
  const lista=(LISTAS_MOVER.find(([,f])=>f===fase)||[])[0];
  // F236 · a etapa da fase anterior não vai junto (o portal publicaria "aguardando perícia" num caso no Conselho);
  // a da fase nova vem como sugestão na placa, pelos fatos oficiais
  const limpa = !!k.etapa && !etapasAceitas(fase).includes(k.etapa);
  k.fase=fase; if(lista) k.mover_para=lista; if(limpa) k.etapa=null;
  await patchCaso(casoId, {fase, ...(lista?{mover_para:lista}:{}), ...(limpa?{etapa:null}:{})});
  aviso(`Movido para ${lista||NOME_FASE[fase]} — a sincronização do To Do não desfaz a mudança${limpa?"; a etapa da fase anterior saiu":""}`);
  montarSidebar(); if(clienteAberto) abrirFicha(clienteAberto);
}
async function salvarBeneficio(casoId){
  const v=document.getElementById("ben-"+casoId).value.trim()||null;
  const k=D.casoPorId.get(casoId); k.beneficio=v;
  await patchCaso(casoId, {beneficio:v});
  aviso("Benefício do caso definido ✔"); abaAtiva=2; abrirFicha(clienteAberto);
}

// checklist do caso (o "0 de 4" do To Do)
function subtarefasDe(casoId){ return D.tarefas.filter(t=>t.caso_id===casoId); }
function checklistCaso(k){
  const st=subtarefasDe(k.id), feitas=st.filter(t=>t.concluida).length;
  const abertas=st.filter(t=>!t.concluida);
  const c=D.cliPorId.get(k.cliente_id)||{};
  // F93 · cada pedido tem estado (pendente, vence hoje, vencido, recebido) e
  // data, e os pendentes se cobram num clique — a mensagem sai pronta
  return `<div style="margin-top:10px">
    ${st.length?`<div class="meio-sub" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">📄 Checklist de Documentos Solicitados — ${feitas} de ${st.length}
      ${abertas.length?`<button class="btn-mini" onclick="cobrarDocs('${k.cliente_id}','${k.id}')"
        title="${c.telefone?"abre o WhatsApp com a lista dos pendentes e registra a cobrança no caso":"cliente sem telefone: copia a mensagem e registra a cobrança"}">📲 cobrar ${abertas.length} pendente${abertas.length>1?"s":""}</button>`:""}</div>`:""}
    ${!st.length&&cklDe(k.beneficio)?`<button class="btn-mini" onclick='aplicarChecklistCaso(D.casoPorId.get("${k.id}")).then(()=>{abaAtiva=2;abrirFicha(clienteAberto);})'>📋 Aplicar checklist do benefício</button>`:""}
    ${abertas.map(t=>`<div class="cl"><span class="box" data-subt="${t.id}" style="cursor:pointer"></span><span>${esc(t.titulo)}</span>
      ${t.prazo?chipPrazo(t.prazo, "o cliente entrega até"):""}
      <button class="btn-mini" style="padding:1px 6px" onclick="prazoDoDoc('${t.id}')" title="${t.prazo?"trocar a data de entrega":"dar data de entrega: vencida, entra no Meu Dia para cobrar"}">📅</button></div>`).join("")}
    ${feitas?`<details><summary style="cursor:pointer;color:var(--cinza);font-size:12px;padding:2px 0">✔ Concluídas (${feitas}) — clique na caixinha para desfazer</summary>
      ${st.filter(t=>t.concluida).map(t=>`<div class="cl feito"><span class="box" data-subt="${t.id}" style="cursor:pointer"></span><span>${esc(t.titulo)}</span></div>`).join("")}</details>`:""}
    <div class="form-linha"><input id="nsub-${k.id}" placeholder="＋ item do checklist deste caso" style="flex:1"
      onkeydown="if(event.key==='Enter')novaSubtarefa('${k.id}')">
    <button onclick="novaSubtarefa('${k.id}')">Adicionar</button></div>
  </div>`;
}
async function novaSubtarefa(casoId){
  const inp=document.getElementById("nsub-"+casoId);
  if(!inp.value.trim()) return;
  const [t]=await api(`/rest/v1/tarefas`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify({caso_id:casoId, titulo:inp.value.trim()})});
  D.tarefas.push(t); abaAtiva=2; abrirFicha(clienteAberto);
}
function ligarChecklistFicha(){
  document.querySelectorAll("[data-subt]").forEach(el=>el.onclick=async()=>{
    const t=D.tarefas.find(x=>x.id===el.dataset.subt); if(!t) return;
    t.concluida=!t.concluida;
    if(t.concluida) plim(); else aviso("Conclusão desfeita ↩", false);
    await api(`/rest/v1/tarefas?id=eq.${t.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({concluida:t.concluida, concluida_em:t.concluida?new Date().toISOString():null})});
    // SÓ o risco no item, em vez de reabrir a ficha inteira: o abrirFicha
    // daqui refazia 6 consultas e APAGAVA o andamento meio digitado no campo
    // (e a rolagem voltava ao topo). O item muda de seção no próximo render
    // natural; o que importa agora é o ✓ visível e o texto do colega intacto.
    el.parentElement.classList.toggle("feito", t.concluida);
  });
}

// ══════════════════════════════════════════════════════════════════════════
// F93 · O PEDIDO DE DOCUMENTO COM ESTADO. O checklist já dizia O QUE foi
// pedido e se chegou; faltava QUANDO tem de chegar e QUEM lembra de cobrar.
// Agora o pedido tem data de entrega (a coluna `tarefas.prazo`, que já
// existia), o item vencido sobe ao Meu Dia como qualquer prazo, e a cobrança
// é um clique: a mensagem sai pronta no WhatsApp com a lista dos pendentes, e
// fica registrada no caso com data e autor. Recebido = a caixinha do
// checklist, como sempre foi. No pré-caso (cliente ainda sem caso) vale o
// mesmo, sobre `docs_pedidos`.
// ══════════════════════════════════════════════════════════════════════════
async function prazoDoDoc(id){
  const t=D.tarefas.find(x=>x.id===id); if(!t) return;
  caixa(`<h3 style="margin:0 0 4px">📅 Entrega de “${esc(t.titulo)}”</h3>
    <p class="meio-sub" style="margin:0 0 8px">Vencida a data, o pedido aparece no Meu Dia para cobrar.</p>
    <div class="form-linha" style="align-items:center">
      <input type="date" id="pd-data" value="${t.prazo||somaDias(hoje(),15)}">
      <button class="btn-mini" onclick="document.getElementById('pd-data').value='${somaDias(hoje(),7)}'">+7 dias</button>
      <button class="btn-mini" onclick="document.getElementById('pd-data').value='${somaDias(hoje(),15)}'">+15 dias</button>
      <button class="btn-mini" onclick="document.getElementById('pd-data').value='${somaDias(hoje(),30)}'">+30 dias</button>
    </div>
    <div class="form-linha" style="margin-top:12px">
      <button class="btn-rap" onclick="fecharCaixa()">cancelar</button>
      ${t.prazo?`<button class="btn-rap" onclick="gravarPrazoDoc('${t.id}',null)">sem data</button>`:""}
      <button class="btn-mini forte" style="margin-left:auto" onclick="gravarPrazoDoc('${t.id}',document.getElementById('pd-data').value)">Guardar</button>
    </div>`);
}
async function gravarPrazoDoc(id, data){
  const t=D.tarefas.find(x=>x.id===id); if(!t) return;
  try{
    await api(`/rest/v1/tarefas?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({prazo:data||null})});
  }catch(e){ return aviso("Não consegui gravar a data — tente de novo"); }
  t.prazo=data||null; fecharCaixa();
  aviso(data?`📅 entrega até ${fmt(data)}`:"Pedido sem data", false);
  if(clienteAberto) abrirFicha(clienteAberto); else render();
}
// os pendentes de um cliente: do checklist do caso, ou do pré-caso
function docsPendentes(cliId, casoId){
  if(casoId) return D.tarefas.filter(t=>t.caso_id===casoId && !t.concluida)
    .map(t=>({nome:t.titulo.replace(/^📄\s*/,""), ate:t.prazo||null}));
  const c=D.cliPorId.get(cliId)||{};
  return ((c.campos||{}).docs_pedidos||[]).flatMap(p=>(p.itens||[])
    .filter(i=>!i.entregue).map(i=>({nome:i.nome||i, ate:p.ate||null})));
}
function msgCobrancaDocs(c, itens, k){
  const nome=(c.nome||"").split(" ")[0];
  const lista=itens.map(i=>`• ${i.nome}${i.ate?` (até ${fmt(i.ate)})`:""}`).join("\n");
  return `Olá, ${nome}! Aqui é do escritório Paulo R. Tercini Filho.\n\n`+
    `Para dar andamento ao seu ${k?tituloCaso(k).toLowerCase():"atendimento"}, ainda precisamos de:\n${lista}\n\n`+
    `Pode nos enviar por aqui mesmo (foto legível) ou trazer ao escritório. Qualquer dúvida, é só chamar. 🙏`;
}
async function cobrarDocs(cliId, casoId){
  const c=D.cliPorId.get(cliId); if(!c) return;
  const k=casoId?D.casoPorId.get(casoId):null;
  const itens=docsPendentes(cliId, casoId);
  if(!itens.length) return aviso("Nada pendente — tudo recebido");
  const msg=msgCobrancaDocs(c, itens, k);
  const tel=(c.telefone||"").replace(/\D/g,"");
  if(tel) window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`,"_blank");
  else{ try{ await navigator.clipboard.writeText(msg); }catch(e){} }
  // o registro: no caso é andamento; no pré-caso é anotação do atendimento
  const texto=`📲 Cobrados de ${c.nome.split(" ")[0]} os documentos pendentes: ${itens.map(i=>i.nome).join("; ")}.`;
  try{
    if(k){
      const [and]=await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({caso_id:k.id, autor_id:eu.id, origem:"app", publico:false, texto})})||[];
      if(and) await api(`/rest/v1/andamentos_lidos`,{method:"POST",
        headers:{Prefer:"return=minimal,resolution=merge-duplicates"},
        body:JSON.stringify({andamento_id:and.id, colaborador_id:eu.id})}).catch(()=>{});
    } else {
      const nota={em:new Date().toISOString(), quem:(eu.nome||"").split(" ")[0], autor_id:eu.id, texto};
      c.campos={...(c.campos||{}), atendimento:[...((c.campos||{}).atendimento||[]), nota]};
      await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({campos:c.campos})});
    }
  }catch(e){ return aviso("A mensagem abriu, mas a cobrança não ficou registrada: "+String(e.message||e).slice(0,80)); }
  aviso(tel?`📲 Cobrança registrada — ${itens.length} documento(s)`:"📋 Cliente sem telefone: mensagem copiada, cobrança registrada", false);
  if(clienteAberto===cliId) abrirFicha(cliId);
}
// no Meu Dia: os pedidos do pré-caso com data, ao lado dos do checklist. São
// cartões virtuais (não têm linha em `tarefas`): sem caixinha de concluir —
// o "entregue" fica na ficha, onde o item mora.
function docsPreCasoComData(){
  const out=[];
  for(const c of (D.clientes||[])){
    const kAtivo=(D.casosDoCliente.get(c.id)||[]).some(k=>k.fase!=="encerrado" && !ehPreCaso(k));
    if(kAtivo) continue;   // com caso, o checklist do caso é que vale
    ((c.campos||{}).docs_pedidos||[]).forEach((p,pi)=>{
      if(!p.ate) return;
      const pend=(p.itens||[]).filter(i=>!i.entregue);
      if(!pend.length) return;
      out.push({id:`pc|${c.id}|${pi}`, cliente_id:c.id, virtual:true, prazo:p.ate,
        titulo:`📄 ${pend.map(i=>i.nome||i).join("; ")}`});
    });
  }
  return out;
}

// P4 (prazos, 31.10.2026) · o pedido de documento nasce com data de entrega: 15 dias para o que o cliente tem em casa,
// 30 para o que depende de terceiro (empresa, hospital, cartório, sindicato), sempre em dia útil
const RX_DOC_TERCEIRO = /\bppp\b|ltcat|pcmso|prontu[aá]rio|hospital|empresa|empregador|cart[oó]rio|inteiro teor|sindicato|prefeitura|escola|declara[cç][aã]o d[aeo] (empresa|empregador|escola|sindicato|prefeitura)|ficha de registro|laudo t[eé]cnico/i;
const diasDoDoc = nome => RX_DOC_TERCEIRO.test(String(nome||"")) ? 30 : 15;
const prazoDocPadrao = nome => proxDiaUtil(somaDias(hoje(), diasDoDoc(nome)));
// a fila do 🧹 Cuidar do acervo: o 📄 do caso aberto sem data (vieram do To Do e das anotações, todos sem data)
function docsSemData(){
  return (D.tarefas||[]).filter(t=>!t.concluida && !t.prazo && !t.particular_de && /^📄/.test(t.titulo||""))
    .map(t=>({t, k:D.casoPorId.get(t.caso_id)})).filter(x=>x.k && x.k.fase!=="encerrado" && !ehPreCaso(x.k))
    .map(x=>({...x, cli:D.cliPorId.get(x.k.cliente_id), nome:x.t.titulo.replace(/^📄\s*/, ""), sug:prazoDocPadrao(x.t.titulo)}))
    .filter(x=>x.cli).sort((a, b)=>dsa(a.cli.nome).localeCompare(dsa(b.cli.nome)));
}
function blocoDocsSemData(){
  const xs = docsSemData(); if(!xs.length) return "";
  return `<details class="sem-acao neutro" id="acervo-docsdata"><summary>Documentos pedidos sem data (${xs.length}) — sem data o pedido não cobra ninguém</summary>
    <p class="meio-sub" style="margin:8px 0 4px">A data sugerida é de 15 dias para o papel que o cliente tem e de 30 para o que depende de empresa, hospital ou cartório. Com data, o pedido entra no quadro Prazos do caso e no Meu Dia.</p>
    <p><button class="btn-mini forte" onclick="datarDocs()">Dar a data sugerida aos ${xs.length}</button></p>
    ${xs.map(x=>`<div class="semcpf-it docdata" data-tarefa="${x.t.id}"><b class="semcpf-nome" style="cursor:pointer" onclick="abrirFicha('${x.cli.id}')">${esc(x.cli.nome)}</b>
      <span class="meio-sub">${esc(cortaFrase(x.nome, 120))} · ${esc(tituloCaso(x.k))}</span>
      <span><input type="date" value="${x.sug}" aria-label="entrega até" onchange="datarDocs(['${x.t.id}'], this.value)">
      <button class="btn-mini" onclick="datarDocs(['${x.t.id}'])">Dar ${fmt(x.sug).slice(0,5)}</button>
      <button class="btn-mini" onclick="concluirTarefaSolta('${x.t.id}')">Já recebido</button></span></div>`).join("")}
  </details>`;
}
// grava a data de entrega dos pedidos (todos os da fila sem argumento); um PATCH por data, para o lote não pesar
async function datarDocs(ids, data){
  const fila = docsSemData().filter(x=>!ids || ids.includes(x.t.id));
  if(!fila.length) return;
  const porData = new Map();
  for(const x of fila){ const d = data || x.sug; if(!porData.has(d)) porData.set(d, []); porData.get(d).push(x.t.id); }
  try{
    for(const [d, ts] of porData)
      await api(`/rest/v1/tarefas?id=in.(${ts.join(",")})`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({prazo:d})});
  }catch(e){ return aviso("Não consegui gravar as datas — tente de novo"); }
  for(const [d, ts] of porData) for(const id of ts){ const t = D.tarefas.find(x=>x.id===id); if(t) t.prazo = d; }
  aviso(fila.length>1 ? `📅 ${fila.length} pedidos com data de entrega` : `📅 entrega até ${fmt(data || fila[0].sug)}`, false);
  render();
}

// datas em linguagem natural ("amanhã", "sexta", "dia 15") no adicionar tarefa
const DIAS_SEMANA={domingo:0,segunda:1,terca:2,"terça":2,quarta:3,quinta:4,sexta:5,sabado:6,"sábado":6};
function dataNatural(texto){
  const t0=new Date(hoje()+"T12:00:00");
  const tenta=[
    [/\bhoje\b/i, ()=>0],
    [/\bamanh[ãa](?![a-zà-ÿ])/i, ()=>1],
    [/\b(domingo|segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado)\b/i,
      m=>{ const alvo=DIAS_SEMANA[dsa(m[1])]; let d=(alvo-t0.getDay()+7)%7; return d||7; }],
    [/\bdia (\d{1,2})\b/i, m=>{ const d=new Date(t0); d.setDate(+m[1]); if(d<=t0) d.setMonth(d.getMonth()+1);
      return Math.round((d-t0)/864e5); }],
    [/\b(\d{1,2})[\/.](\d{1,2})\b/, m=>{ const d=new Date(t0.getFullYear(),+m[2]-1,+m[1],12);
      if(d<t0) d.setFullYear(d.getFullYear()+1); return Math.round((d-t0)/864e5); }],
  ];
  for(const [re,calc] of tenta){
    const m=texto.match(re);
    if(m){
      const d=new Date(t0); d.setDate(d.getDate()+calc(m));
      return {titulo:texto.replace(re,"").replace(/\s{2,}/g," ").trim(),
              prazo:d.toLocaleDateString("sv")};
    }
  }
  return {titulo:texto, prazo:null};
}

function fecharFicha(rerender=true){
  { const d = document.getElementById("detalhe"); if(d) d.classList.remove("atend-tela"); }
  clienteAberto=null; abaAtiva=2;
  // sem ficha, a conversa e o prazo ao lado não têm com o que conversar (o prazo aberto espremia o WhatsApp, teste 11.88, JUR-01)
  if(painelZapCli || painelPz) fecharPainelPrazo();
  menuFichaSessao=null;   // a exceção do ☰ morre com a ficha
  document.getElementById("app").classList.remove("detalhe-aberto","ficha-tudo");
  aplicarMenu();
  if(rerender) render();
}

// F458 · o voltar do aparelho (pedido do Paulo de 08.11.2026: "no iPhone não funciona o voltar pela borda
// esquerda"). O CRM é uma página só e não gravava nada no histórico, então a borda do Safari saía do CRM ou
// não fazia nada, e no CRM instalado na tela de início (standalone) o iOS não tem gesto de voltar. Agora, com
// algo aberto por cima (ficha, conversa, janela, prazo, processo inteiro) ou fora da lista inicial, fica UMA
// entrada a mais no histórico (`armarVoltar`); o voltar a consome e fecha a camada de cima (`voltarUmPasso`),
// e a entrada volta se ainda houver o que fechar. No standalone, o deslizar da borda esquerda chama o voltar.
// var e function: o render pode rodar antes desta linha na carga, e const/let ainda não existiriam
var _voltarDesarmando = false, _voltarPop = 0;
function voltarLigado(){ try{ return !navigator.webdriver || localStorage.getItem("crm_voltar")==="1"; }catch(e){ return !navigator.webdriver; } }
function inicioVoltar(){ return soIdentificacao() ? "agendaq" : "meudia"; }
function modalAberto(){ const m = document.getElementById("modal"); return !!(m && m.innerHTML && m.style.display!=="none"); }
function temVoltar(){
  return !!(document.getElementById("proc-inteiro") || modalAberto() || painelPz || painelZapCli
    || document.getElementById("app")?.classList.contains("zap-conv-aberta") || clienteAberto || visao!==inicioVoltar());
}
function armarVoltar(){
  if(!voltarLigado() || _voltarDesarmando) return;
  const armado = history.state && history.state.crm==="voltar";
  try{
    if(temVoltar() && !armado) history.pushState({crm:"voltar"}, "");
    // fechou pelo botão: a entrada sobrando custaria um voltar sem efeito
    else if(!temVoltar() && armado){ _voltarDesarmando = true; history.back(); }
  }catch(e){}
}
function voltarUmPasso(){
  if(document.getElementById("proc-inteiro")) return fecharProcessoInteiro();
  if(modalAberto()) return fecharCaixa();
  if(painelPz || painelZapCli) return fecharPainelPrazo();
  if(document.getElementById("app")?.classList.contains("zap-conv-aberta")) return voltarListaZap();
  if(clienteAberto){
    if(document.getElementById("detalhe")?.classList.contains("atend-tela")) return sairModoAtendimento(clienteAberto);
    return fecharFicha();
  }
  if(visao!==inicioVoltar()) return irPara(inicioVoltar());
}
window.addEventListener("popstate", e=>{
  if(!voltarLigado()) return;
  _voltarPop = Date.now();
  if(e.state && e.state.crm==="voltar") return;   // avançar: nada a fazer
  if(_voltarDesarmando){ _voltarDesarmando = false; return armarVoltar(); }
  Promise.resolve(voltarUmPasso()).finally(()=>setTimeout(armarVoltar, 0));
});
// standalone do iOS: sem gesto nativo, a borda esquerda desliza para voltar (ignorado se o próprio iOS já voltou)
if(voltarLigado() && navigator.standalone===true){
  let ini = null;
  document.addEventListener("touchstart", e=>{
    const t = e.touches[0];
    ini = (e.touches.length===1 && t.clientX<=24) ? {x:t.clientX, y:t.clientY, em:Date.now()} : null;
  }, {passive:true});
  document.addEventListener("touchend", e=>{
    if(!ini) return; const t = e.changedTouches[0], dx = t.clientX-ini.x, dy = Math.abs(t.clientY-ini.y), em = ini.em; ini = null;
    if(dx>=70 && dy<dx/2 && _voltarPop<em && history.state && history.state.crm==="voltar") history.back();
  }, {passive:true});
}

// ── celular ───────────────────────────────────────────────────────────────
// No aparelho a tela não comporta as quatro colunas do computador. Em vez de
// espremer tudo, o celular mostra UMA tela por vez e leva na barra de baixo
// as quatro coisas que se faz na rua: o dia, achar o cliente, as menções e
// as listas. A ficha abre por cima e volta pelo "‹".
const CEL = window.matchMedia("(max-width:760px), (pointer:coarse) and (max-height:500px)");
function celular(){ return CEL.matches; }
function marcarCelular(){
  const app=document.getElementById("app");
  app.classList.toggle("celular", celular());
  if(!celular()) fecharMenuCel();
}
CEL.addEventListener("change", marcarCelular);
function fecharMenuCel(){ document.getElementById("app").classList.remove("menu-aberto"); }
// a ficha de celular abre enxuta (identidade, processo, comentários); o resto
// — cadastro, perícias, pagamentos, trilha, checklist — vem neste botão
function fichaTudo(){
  const app=document.getElementById("app");
  const tudo=app.classList.toggle("ficha-tudo");
  const b=document.querySelector(".cel-tudo");
  if(b) b.textContent = tudo ? "⌃ mostrar só o essencial" : "⋯ mostrar tudo da ficha";
}
function irCel(destino){
  const app=document.getElementById("app");
  if(destino==="menu"){ app.classList.toggle("menu-aberto"); return; }
  fecharMenuCel();
  if(destino==="busca"){
    fecharFicha(false);
    const b=document.getElementById("busca-cel");
    b.focus(); b.select(); render(); return marcarBarraCel();
  }
  visao=destino; limparBusca();
  fecharFicha(false); montarSidebar(); render(); marcarBarraCel();
}
// no celular o campo de escrever fica preso no rodapé; a folga no fim da
// rolagem acompanha a altura dele, senão o último comentário fica embaixo
function folgaComposer(){
  const rol=document.querySelector(".det-rolagem"), esc=document.querySelector(".escrever");
  if(!rol) return;
  const noCel = celular();
  // sem composer (sub-aba de leitura) a folga é mínima: a regra base do CSS
  // reservava espaço para um campo que nem está lá
  rol.style.paddingBottom = !noCel ? "" : esc ? (esc.offsetHeight + 18) + "px" : "12px";
  // o aviso sobe junto com o composer: parado em 200px, ele caía dentro do
  // campo aberto e cobria os botões que o próprio aviso manda usar
  const av=document.getElementById("aviso");
  if(av) av.style.bottom = (noCel && esc && document.getElementById("app").classList.contains("detalhe-aberto"))
    ? (esc.offsetHeight + 16) + "px" : "";
}
// girar o aparelho, abrir o teclado ou cruzar os 760px muda tudo isto: sem
// recalcular, a folga do celular ficava presa na ficha do computador (até
// 311px de vão morto) e o último andamento ficava inalcançável no celular
let _timerFolga=null;
window.addEventListener("resize", ()=>{
  clearTimeout(_timerFolga);
  _timerFolga=setTimeout(folgaComposer, 120);
});
function marcarBarraCel(){
  const foco = buscaTxt ? "busca" : visao;
  document.querySelectorAll("#barra-cel button").forEach(b=>
    b.classList.toggle("on", b.dataset.cel===foco));
  const s=document.getElementById("selo-menc"), n=(D.mencoes||[]).length;
  if(s){ s.textContent=n; s.style.display = n ? "block" : "none"; }
  // F306 · o mesmo contador do 💬 WhatsApp do menu
  const z=document.getElementById("selo-zap"), nz=D.zapResumo||0;
  if(z){ z.textContent=nz; z.style.display = nz ? "block" : "none"; }
}

// "Perícia agendada para 19/08/2026 às 8:50..." no andamento -> evento na hora
// aceita "12/08/2026", "12/08" (ano deduzido: o próximo 12/08), "às 07h40",
// "às 7h" — e extrai TODOS os agendamentos do texto, não só o primeiro.
// F67 · o gatilho EXIGE palavra de agendamento entre o tipo e a data
// (agendada/marcada/remarcada/designada): "a perícia foi indeferida em 24/07"
// e "recorrer da perícia até 24/07" criavam agendamento fantasma — e a data
// sem ano já passada era empurrada para o ANO SEGUINTE (o 24/07/2027 do
// caso real que nunca teve perícia; a "20.04.2027" antiga era o mesmo furo)
const RE_EVENTO_JS=/(per[íi]cia|audi[êe]ncia|avalia[çc][ãa]o social)[^\n]{0,80}?(?:agendad|marcad|remarcad|reagendad|designad)[^\n]{0,60}?\b(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{4}))?(?:[^\n]{0,20}?\b(\d{1,2})[:hH](\d{2})?)?/gi;
async function extrairEvento(texto, casoId){
  const criados=[];
  for(const m of texto.matchAll(RE_EVENTO_JS)){
    const tipo=/aud/i.test(m[1])?"Audiência":/avalia/i.test(m[1])?"Avaliação social":"Perícia";
    const dia=m[2].padStart(2,"0"), mes=m[3].padStart(2,"0");
    let data;
    if(m[4]) data=`${m[4]}-${mes}-${dia}`;
    else{
      data=`${hoje().slice(0,4)}-${mes}-${dia}`;             // sem ano = o próximo
      if(data<hoje()) data=`${+hoje().slice(0,4)+1}-${mes}-${dia}`;
    }
    const hora=m[5]?`${m[5].padStart(2,"0")}:${m[6]||"00"}`:"09:00";
    if(isNaN(new Date(data+"T00:00:00").getTime())) continue;
    if(D.eventos.some(e=>e.caso_id===casoId && tipoEv(e.tipo)===tipo && dataSP(e.data_hora)===data)) continue;   // F236 · "Perícia" = "Perícia médica"
    try{
      const [ev]=await api(`/rest/v1/eventos`,{method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({caso_id:casoId, tipo, data_hora:`${data}T${hora}:00-03:00`,
          obs:texto.slice(0,160), status:data>=hoje()?"agendada":"realizada"})});
      D.eventos.push(ev);
      criados.push({tipo, data});
    }catch(e){}   // já existia (dedupe do banco) — segue o jogo
  }
  return criados.length?criados:null;
}
// ── DCB: a data em que o benefício cessa sozinho ──────────────────────────
const ehIncapacidade = k => /incapacidade|auxílio|auxilio|doença|doenca|acidente/i
  .test(k.beneficio||"");
// F115 · O LEMBRETE DA PRORROGAÇÃO É OBRIGATÓRIO (pedido do Paulo, 18.09).
// Havendo DCB, o lembrete existe 15 dias antes dela, que é quando a
// prorrogação pode ser pedida, e não depende de ninguém ter preenchido o
// campo. O Paulo muda a data e a dele prevalece; marcada a prorrogação como
// pedida, o lembrete se desliga. É esta função que todo o CRM consulta —
// ficha, calendário e Planejado — para não haver duas contas diferentes.
const DIAS_PRORROG = 15;
// F236 · no recurso e na ação, a DCB que já passou é a cessação discutida (o restabelecimento corre desde o dia
// seguinte): não pede prorrogação, não acende alarme no caso, no Planejado nem no Meu Dia
const dcbPassadaForaDoInss = k => !!k.dcb && k.dcb < hoje() && !["inss","escritorio"].includes(faseEfetiva(k));
const prorrogarEm = k => (!k || !k.dcb || k.dcb_prorrogacao_pedida || k.fase==="encerrado" || dcbPassadaForaDoInss(k)) ? null
  : (k.dcb_prorrogar_em || somaDias(k.dcb, -DIAS_PRORROG));
function chipDcb(k){
  if(!k.dcb || k.dcb_prorrogacao_pedida || k.fase==="encerrado" || dcbPassadaForaDoInss(k)) return "";
  const d = diasAte(k.dcb);
  return `<span class="chip prazo ${d<=15?"venc":"ok"}"
    title="cessação programada do benefício${d<0?" — JÁ CESSOU e a prorrogação não foi pedida":
           d<=15?" — hora de pedir a prorrogação":""}">⏳ DCB ${fmt(k.dcb).slice(0,5)}${
           d<0?" ⚠":""}</span>`;
}
async function salvarDCB(casoId, data){
  const k=D.casoPorId.get(casoId); if(!k) return;
  k.dcb = data||null;
  // DCB nova rearma o alarme: a prorrogação pedida era da DCB antiga
  k.dcb_prorrogacao_pedida = false;
  k.dcb_prorrogar_em = data ? somaDias(data, -DIAS_PRORROG) : null;
  await patchCaso(casoId, {dcb:k.dcb, dcb_prorrogacao_pedida:false, dcb_prorrogar_em:k.dcb_prorrogar_em});
  aviso(data?`DCB anotada — lembrete em ${fmt(k.dcb_prorrogar_em)}, ${DIAS_PRORROG} dias antes 🩸`:"DCB apagada", false);
  if(clienteAberto) abrirFicha(clienteAberto);
}
async function salvarProrrog(casoId, pedida){
  const k=D.casoPorId.get(casoId); if(!k) return;
  k.dcb_prorrogacao_pedida = pedida;
  await patchCaso(casoId, {dcb_prorrogacao_pedida:pedida});
  aviso(pedida?"Prorrogação pedida — alarme desligado ✔":"Alarme da DCB religado", false);
  if(clienteAberto) abrirFicha(clienteAberto);
}

// ── a escolha obrigatória do comentário ───────────────────────────────────
// tfQuem: null = ainda não escolheu · [] = "ninguém" · [ids] = pessoas
// tfData: undefined = ainda não escolheu · null = "sem lembrete" · data
let tfQuem = null, tfData;
// F116 · a natureza da data escolhida no compositor. Compromisso é trabalho
// marcado; lembrete é aviso. O prazo fatal não passa por aqui, ele tem o ⏰.
let tfNatureza = "compromisso", tfTocado = false;
function tfNat(v, bt){
  tfTocado = true;
  // F182 · no compositor novo as naturezas são chaves: clicar na acesa desliga,
  // e a anotação vai sem tarefa (ninguém, sem data)
  const chave = !!document.getElementById("esc-pnl-tf");
  if(chave && tfNatureza===v){
    tfNatureza = null; tfQuem = []; tfData = null;
    document.querySelectorAll("#tf-box .tf-eq.on,#tf-box .tf-dt.on").forEach(b=>b.classList.remove("on"));
  }else{
    if(chave && tfNatureza===null){ tfQuem = null; tfData = undefined; }
    tfNatureza = v;
  }
  document.querySelectorAll(".tf-nt").forEach(b=>{ const on = b.dataset.nat===tfNatureza;
    b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
  const pnl = document.getElementById("esc-pnl-tf"); if(pnl) pnl.hidden = !tfNatureza;
  pintarFrase();
}
// F326 · O PRAZO FATAL NO CAMPO DE ESCREVER (desenho aprovado em 31.10.2026): do que é (o catálogo), contado de quando,
// o resultado com o dia da semana e quanto falta (a data se corrige à mão), quem faz e quem revisa. Os ids and-cat, and-de,
// and-prazo-data e and-prazo-mais continuam, porque o cálculo (aplicarCatalogoPrazo) e o carimbo (carimboCatalogo) são os mesmos.
function painelPrazoEscrever(k){
  const ex = advogadoDoCliente(k.cliente_id, k)[0], adm = (colAdmin()||{}).id, rev = adm && adm!==ex ? adm : "";
  return `<div class="esc-pnl esc-pnl-pz pzx" id="esc-pnl-pz" hidden>
    <div class="pzx-grade">
      <label class="pzx-r" for="and-cat">Do que é</label>
      <span id="and-prazo-mais" class="cat-prazo pzx-cat" data-alvo="and-prazo-data"><select id="and-cat" onchange="aplicarCatalogoPrazo('and');pzxPintar()">
        <option value="">Outro prazo: digito a data</option>
        ${PRAZOS_CATALOGO.map(x=>`<option value="${x.id}">${esc(x.rot)} · ${x.n} dias${x.uteis?" úteis":""}</option>`).join("")}</select></span>
      <label class="pzx-r" for="and-de">Contado de</label>
      <span class="pzx-de"><input type="date" id="and-de" value="${hoje()}" max="${hoje()}" onchange="aplicarCatalogoPrazo('and');pzxPintar()"><small id="pzx-de-txt">escolha do que é o prazo</small></span>
    </div>
    <div class="pzx-res" id="and-pz-res">
      <div class="pzx-res-o"><label class="pzx-vence">Vence <input type="date" id="and-prazo-data" min="${hoje()}" title="a data fatal do prazo; corrija à mão se precisar" onchange="pzxPintar()"></label>
        <small id="pzx-expl">Escolha do que é o prazo, ou digite a data.</small></div>
      <div class="pzx-res-n" id="pzx-n" aria-live="polite"></div>
    </div>
    <div class="pzx-quem"><span class="pzx-r">Quem faz</span>${equipeAtiva().map(co=>`<button type="button" class="pzx-q${co.id===ex?" on":""}" data-pzq="${co.id}" aria-pressed="${co.id===ex}" onclick="pzxQuem(this)">${esc(co.nome.split(" ")[0])}</button>`).join("")}
      <span class="pzx-esp"></span><label class="pzx-rv" for="pz-rev">Revisa</label>${seletorRevisor("pz-rev", rev)}</div>
  </div>`;
}
function pzxQuem(bt){
  const on = !bt.classList.contains("on");
  document.querySelectorAll("#esc-pnl-pz .pzx-q").forEach(b=>{ b.classList.toggle("on", on && b===bt); b.setAttribute("aria-pressed", on && b===bt); });
  pintarFrase();
}
// o resultado: o dia da semana, a conta do catálogo e quanto falta, em dias úteis
function pzxPintar(){
  const d = (document.getElementById("and-prazo-data")||{}).value, c = catPrazo.and, n = document.getElementById("pzx-n"), ex = document.getElementById("pzx-expl"),
        de = document.getElementById("pzx-de-txt");
  if(de) de.textContent = c ? (c.uteis ? "intimação (o dia da intimação não conta)" : "ciência da decisão") : "escolha do que é o prazo";
  if(ex) ex.textContent = !d ? "Escolha do que é o prazo, ou digite a data."
    : `${diaLongoPz(d)}. ${c && c.fatal===d ? textoContagemPz(c.n, c.uteis, c.de, d, c.dec, c.jf) + ` Base: ${c.base}.` : "Data digitada à mão."}`;
  const f = d ? faltaPz({data: d, natureza: "fatal"}) : null;
  if(n) n.innerHTML = f ? `<b class="pzx-u-${f.urg}">${esc(String(f.n))}</b><small>${esc(f.urg==="venc" ? "dias úteis vencido" : f.un || f.txt)}</small>` : "";
  document.getElementById("and-pz-res")?.classList.toggle("pzx-venc", !!f && f.urg==="venc");
  pintarFrase();
}
// F182 · o Prazo fatal do compositor novo é uma chave que abre o quadro da data
function pzToggle(ck){
  const pnl = document.getElementById("esc-pnl-pz"); if(pnl) pnl.hidden = !ck.checked;
  ck.closest(".esc-tg")?.classList.toggle("on", ck.checked);
  const d = document.getElementById("and-prazo-data");
  if(ck.checked && d && prazoDetectado && !d.value) d.value = prazoDetectado;
  if(document.getElementById("pzx-n")) pzxPintar(); else pintarFrase();
}
// a frase "Ao registrar": o que o clique em Registrar vai criar, dito antes
function fraseRegistro(){
  const t = ((document.getElementById("and-texto")||{}).value||"").trim();
  const m = RX_TIPO_ANOT.exec(t);
  const nomes = ids => ids.map(id=>((D.colPorId.get(id)||{}).nome||"").split(" ")[0]).filter(Boolean);
  const lista = xs => xs.length>1 ? xs.slice(0,-1).join(", ")+" e "+xs[xs.length-1] : xs[0]||"";
  const dia = tfData ? fmtBarra(tfData).slice(0,5) : "";
  const p = [respondeA ? "responde ao comentário marcado" : m ? `anota como ${m[1].toLowerCase()}` : "anota no Escritório"];
  if(tfNatureza==="compromisso")
    p.push(tfQuem&&tfQuem.length ? `cria tarefa para ${lista(nomes(tfQuem))}${dia?` em ${dia}`:" (falta quando)"}` : "cria tarefa (falta quem faz)");
  if(tfNatureza==="lembrete")
    p.push(`agenda lembrete para ${tfQuem&&tfQuem.length?lista(nomes(tfQuem)):"você"}${dia?` em ${dia}`:" (falta quando)"}`);
  const ck = document.getElementById("and-prazo-ck"), pd = (document.getElementById("and-prazo-data")||{}).value;
  if(ck && ck.checked){
    // F326 · quem faz e quem revisa o prazo fatal entram na frase
    const q = document.querySelector("#esc-pnl-pz .pzx-q.on"), rv = (document.getElementById("pz-rev")||{}).value;
    p.push((pd ? `marca prazo fatal em ${fmtBarra(pd)}` : "marca prazo fatal (falta a data)")
      + (q ? `, com a tarefa de ${nomes([q.dataset.pzq])[0]}${rv && rv!==q.dataset.pzq ? ` e a revisão de ${nomes([rv])[0]}` : ""}` : ""));
  }
  else if(!tfNatureza && prazoDetectado && !prazoCancelado) p.push(`${prazoDespachar?"volta à fila em":"lembra você em"} ${fmtBarra(prazoDetectado).slice(0,5)}`);
  return p.join(", ");
}
function pintarFrase(){
  const el = document.getElementById("esc-frase");
  if(el) el.innerHTML = `Ao registrar: <b>${esc(fraseRegistro())}</b>`;
}
// pula também o feriado nacional e o do escritório (teste 11.88, JUR-02/04/05: 20/11 e 02/11 passavam)
function proxDiaUtil(iso){
  let d = iso;
  while(!ehDiaUtil(d)) d = somaDias(d, 1);
  return d;
}
function maisDias(n){
  const d=new Date(hoje()+"T12:00:00"); d.setDate(d.getDate()+n);
  return proxDiaUtil(d.toLocaleDateString("sv"));
}
// soma dias a UMA DATA qualquer (maisDias conta sempre a partir de hoje).
// Aceita negativo: somaDias(dcb,-15) é "quinze dias antes da cessação".
function somaDias(iso, n){
  if(!iso) return null;
  const d=new Date(iso+"T12:00:00"); if(isNaN(d)) return null;
  d.setDate(d.getDate()+n);
  return d.toLocaleDateString("sv");
}

// ══════════════════════════════════════════════════════════════════════════
// F92 · O CATÁLOGO DE PRAZOS. A data fatal era digitada à mão, e a conta
// (dias úteis, feriado, recesso, prorrogação do vencimento) ficava na cabeça
// de quem anotava. Agora o prazo é ESCOLHIDO pelo nome e CONTADO a partir da
// intimação, com a regra de cada rito: os judiciais em dias úteis (art. 219
// do CPC; no JEF, art. 12-A da Lei 9.099/95), suspensos no recesso de 20/12 a
// 20/01 (art. 220 do CPC); os administrativos em dias corridos, prorrogados
// para o dia útil seguinte quando o vencimento cai em dia sem expediente
// (art. 78, § 4º, do RICRPS; art. 66, § 1º, da Lei 9.784/99); o decadencial
// do mandado de segurança NÃO prorroga — cai em dia sem expediente, antecipa.
// O dia da intimação é excluído da contagem (art. 224 do CPC; art. 78 do
// RICRPS). O carimbo da anotação passa a dizer de que é o prazo e de onde a
// data saiu (F85), sem ninguém escrever.
//
// Feriados: os nacionais (fixos e os móveis, pela Páscoa) estão aqui; os
// locais e forenses da comarca entram em Configurações ("feriados_extra").
// ══════════════════════════════════════════════════════════════════════════
const PRAZOS_CATALOGO = [
  {id:"ed",    rot:"Embargos de declaração",              n:5,   uteis:true,  base:"art. 1.023 do CPC; art. 49 da Lei 9.099/95"},
  {id:"ri",    rot:"Recurso inominado (JEF)",             n:10,  uteis:true,  base:"art. 42 da Lei 9.099/95"},
  {id:"cri",   rot:"Contrarrazões ao recurso inominado",  n:10,  uteis:true,  base:"art. 42, § 2º, da Lei 9.099/95"},
  {id:"ap",    rot:"Apelação",                            n:15,  uteis:true,  base:"art. 1.003, § 5º, do CPC"},
  {id:"cap",   rot:"Contrarrazões de apelação",           n:15,  uteis:true,  base:"art. 1.010, § 1º, do CPC"},
  {id:"ai",    rot:"Agravo de instrumento",               n:15,  uteis:true,  base:"art. 1.003, § 5º, do CPC"},
  {id:"rep",   rot:"Réplica à contestação",               n:15,  uteis:true,  base:"arts. 350 e 351 do CPC"},
  {id:"laudo", rot:"Manifestação sobre o laudo pericial", n:15,  uteis:true,  base:"art. 477, § 1º, do CPC"},
  {id:"ques",  rot:"Quesitos e assistente técnico",       n:15,  uteis:true,  base:"art. 465, § 1º, do CPC"},
  {id:"quesj", rot:"Quesitos e assistente técnico (JEF)", n:10,  uteis:true,  base:"art. 12, § 2º, da Lei 10.259/2001; art. 12-A da Lei 9.099/95"},   // F236
  {id:"emen",  rot:"Emenda da inicial",                   n:15,  uteis:true,  base:"art. 321 do CPC"},
  // F384 · os recursos às cortes superiores (o segurado conta simples; o dobro é do INSS, art. 183 do CPC)
  {id:"resp",  rot:"Recurso especial ou extraordinário",  n:15,  uteis:true,  base:"art. 1.003, § 5º, do CPC"},
  {id:"aresp", rot:"Agravo em recurso especial ou extraordinário", n:15, uteis:true, base:"arts. 1.003, § 5º, e 1.042 do CPC"},
  {id:"aint",  rot:"Agravo interno",                      n:15,  uteis:true,  base:"art. 1.070 do CPC"},
  {id:"u5",    rot:"Outro prazo judicial de 5 dias úteis",  n:5,  uteis:true, base:"art. 219 do CPC"},
  {id:"u10",   rot:"Outro prazo judicial de 10 dias úteis", n:10, uteis:true, base:"art. 219 do CPC"},
  {id:"u15",   rot:"Outro prazo judicial de 15 dias úteis", n:15, uteis:true, base:"art. 219 do CPC"},
  {id:"u30",   rot:"Outro prazo judicial de 30 dias úteis", n:30, uteis:true, base:"art. 219 do CPC"},
  {id:"crps",  rot:"Recurso ao CRPS (ordinário ou especial)", n:30, uteis:false, base:"art. 77 do Regimento Interno do CRPS"},
  {id:"ccrps", rot:"Contrarrazões no CRPS",               n:30,  uteis:false, base:"art. 77 do Regimento Interno do CRPS"},
  // F384 · contados da ciência do acórdão ou do despacho (Regimento Interno do CRPS, Portaria MPS 125/2026)
  {id:"edcrps",rot:"Embargos de declaração no CRPS",      n:30,  uteis:false, base:"art. 92, § 2º, do Regimento Interno do CRPS"},
  {id:"rclcrps",rot:"Reclamação ao Conselho Pleno",       n:30,  uteis:false, base:"art. 123, § 1º, do Regimento Interno do CRPS"},
  {id:"agcrps",rot:"Agravo no CRPS (inadmissão de uniformização ou reclamação)", n:30, uteis:false, base:"art. 93, § 1º, do Regimento Interno do CRPS"},
  // F415 · contados em dias corridos da ciência, como o art. 66 da Lei 9.784/99; a Portaria não diz como se contam (conferir)
  {id:"reanl", rot:"Reanálise da análise documental (B31)", n:10, uteis:false, base:"art. 8º-A da Portaria Conjunta MPS/INSS 13/2026, incluído pela Portaria Conjunta 54/2026; Lei 9.784/99, art. 66"},
  {id:"exig",  rot:"Cumprimento de exigência do INSS",    n:30,  uteis:false, base:"art. 566, caput, da IN 128/2022"},
  {id:"ms",    rot:"Mandado de segurança (decadência)",   n:120, uteis:false, dec:true, base:"art. 23 da Lei 12.016/2009"},
];
// feriados nacionais fixos (Lei 662/1949, Lei 6.802/1980, Lei 14.759/2023)
const FERIADOS_FIXOS = ["01-01","04-21","05-01","09-07","10-12","11-02","11-15","11-20","12-25"];
function pascoa(ano){   // Meeus/Jones/Butcher
  const a=ano%19, b=Math.floor(ano/100), c=ano%100, d=Math.floor(b/4), e=b%4,
        f=Math.floor((b+8)/25), g=Math.floor((b-f+1)/3), h=(19*a+b-d-g+15)%30,
        i=Math.floor(c/4), k=c%4, l=(32+2*e+2*i-h-k)%7, m=Math.floor((a+11*h+22*l)/451),
        mes=Math.floor((h+l-7*m+114)/31), dia=((h+l-7*m+114)%31)+1;
  return `${ano}-${String(mes).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
}
