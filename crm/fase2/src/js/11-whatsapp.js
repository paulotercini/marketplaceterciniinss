// F367 · no iPhone, o teclado rola a página inteira para mostrar o campo e, fechado, a deixa rolada: o CRM, da altura
// da tela, sobe, o topo some e a metade de baixo fica em branco. No celular a página não rola, quem rola são as colunas
function voltarTopoPagina(){
  const a = document.activeElement;
  if(!document.getElementById("app")?.classList.contains("celular") || !window.scrollY) return;
  if(a && a.matches && a.matches("input,textarea,select,[contenteditable]")) return;
  window.scrollTo(0, 0);
}
document.addEventListener("focusout", ()=>setTimeout(voltarTopoPagina, 150));
window.visualViewport?.addEventListener("resize", ()=>setTimeout(voltarTopoPagina, 150));
window.addEventListener("scroll", voltarTopoPagina, {passive:true});
document.addEventListener("mouseover", e=>{   // o item da linha do tempo só fica arrastável com a conversa aberta
  const li = document.body.classList.contains("zap-aberto") && e.target.closest && e.target.closest(".timeline li");
  if(li && !li.draggable) li.draggable = true;
});
document.addEventListener("dragstart", e=>{
  const z = e.target.closest && e.target.closest("[data-zmsg]");
  if(z){ e.dataTransfer.setData("text/crm-zap", z.dataset.zmsg); e.dataTransfer.effectAllowed = "copy"; document.body.classList.add("arrasta-zap"); return; }
  const li = document.body.classList.contains("zap-aberto") && e.target.closest && e.target.closest(".timeline li");
  if(li){ e.dataTransfer.setData("text/crm-and", JSON.stringify(textoDoItemLinha(li))); e.dataTransfer.effectAllowed = "copy"; document.body.classList.add("arrasta-and"); }
});
document.addEventListener("dragend", ()=>document.body.classList.remove("arrasta-zap","arrasta-and"));
const destinoDoArrasto = (e, tipo) => tipo==="text/crm-zap"
  ? e.target.closest && (e.target.closest("#painel-prazo-esq") || e.target.closest(".escrever"))
  : tipo==="text/crm-and" ? e.target.closest && e.target.closest("#painel-prazo") : null;
document.addEventListener("dragover", e=>{
  const tipo = [...(e.dataTransfer.types||[])].find(t=>t==="text/crm-zap" || t==="text/crm-and");
  if(tipo && destinoDoArrasto(e, tipo)){ e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }
});
document.addEventListener("drop", e=>{
  const tipo = [...(e.dataTransfer.types||[])].find(t=>t==="text/crm-zap" || t==="text/crm-and"), alvo = tipo && destinoDoArrasto(e, tipo);
  if(!alvo) return;
  e.preventDefault(); document.body.classList.remove("arrasta-zap","arrasta-and");
  if(tipo==="text/crm-zap"){
    const m = _zapLado.get(e.dataTransfer.getData("text/crm-zap")); if(!m) return;
    const campo = alvo.id==="painel-prazo-esq" ? document.getElementById("pp-com") : document.getElementById("and-texto");
    if(!campo) return;
    colocarNoCampo(campo, `${rotZapLado(m)} em ${fmtTS(m.q)}: “${m.texto.trim()}”`);
    aviso(alvo.id==="painel-prazo-esq" ? "Confira e clique em Comentar" : "Complete e registre no caso", false);
  }else{
    const campo = document.getElementById("pp-zap-txt"); if(!campo) return;
    colocarNoCampo(campo, rascunhoParaCliente(JSON.parse(e.dataTransfer.getData("text/crm-and"))));
    aviso("Rascunho para o cliente: confira, ajuste e só então envie", false);
  }
});
function botaoZapCliente(cliId){
  const zs = D.zapFicha||[];
  if(!zs.length) return "";
  const n = zs.reduce((s,z)=>s+(z.nao_lidas||0),0);
  return `<button class="btn-mini" onclick="verZapCliente('${cliId}')"
    style="background:#EDF8F1;border-color:#BFE3CC;color:#128C4B;font-weight:500"
    title="ler as mensagens de WhatsApp deste cliente">${iconeFonte("zap")}${n?` <b>${n}</b><span class="sr-only"> nova${n>1?"s":""}</span>`:""}</button>`;
}
// F282 · o "Abrir ficha" do WhatsApp abre a ficha (o caso, quando há) com a conversa ao lado, como o botão WhatsApp da ficha
async function fichaComZap(cliId){ await abrirFicha(cliId); if(clienteAberto===cliId) await zapAoLado(cliId); }
// no celular não há "ao lado": a conversa cobriria a ficha que a pessoa pediu para ver (teste da colaboradora, 02.11.2026)
const zapAoLado = cliId => celular() ? null : verZapCliente(cliId);
async function verZapCliente(cliId){
  const zs = D.zapFicha||[]; if(!zs.length) return;
  const ids = zs.map(z=>z.id).join(",");
  const ms = await todas("zap_mensagens",
    `select=id,direcao,autor_id,por_bot,tipo,texto,midia_url,midia_nome,status,quando_wa,criado_em&conversa_id=in.(${ids})&direcao=neq.interna&status=neq.rascunho&order=momento.desc,seq.desc&limit=300`)
    .catch(()=>null);
  if(ms===null) return aviso("Não consegui carregar as mensagens");
  ms.reverse();
  let dia = "";
  const linhas = ms.map(m=>{
    const q = m.quando_wa||m.criado_em, d = fmtTS(q);
    const sep = d!==dia ? (dia=d, `<div class="meio-sub" style="text-align:center;margin:10px 0 4px">${d}</div>`) : "";
    const quem = m.direcao==="entrada" ? "" : m.por_bot&&!m.autor_id ? "robô" : (D.colPorId.get(m.autor_id)?.nome||"escritório");
    let corpo;
    // mídia antiga do histórico vem com o link vencido: só o registro chegou,
    // o arquivo continua no celular (a ponte grava "[mídia não baixada]")
    const semArq = !m.midia_url && m.tipo!=="texto";
    const resto = (m.texto||"").replace("[mídia não baixada]","").trim();
    if(semArq) corpo = `<span class="meio-sub">${m.tipo==="audio"?"🎤 áudio":"📎 "+esc(m.tipo)} antigo, não baixado — só no celular</span>`
      + (resto?`<div>${esc(resto)}</div>`:"");
    else if(m.tipo==="audio") corpo = playerZap(m.midia_url)
      + (m.texto ? `<i>🎤 ${esc(m.texto)}</i>` : `<span class="meio-sub">🎤 transcrevendo…</span>`);
    else if(m.midia_url && (m.tipo==="imagem"||m.tipo==="figurinha")) corpo = miniZap(m.midia_url, `abrirArquivoZap('${escJs(m.midia_url)}')`, m.tipo==="figurinha")
      + (m.texto?`<div>${esc(m.texto)}</div>`:"");
    else if(m.midia_url && m.tipo==="video") corpo = vidZap(m.midia_url) + (m.texto?`<div>${esc(m.texto)}</div>`:"");
    else if(m.midia_url) corpo = `<button class="btn-mini" onclick="abrirArquivoZap('${escJs(m.midia_url)}')">📎 ${esc(m.midia_nome||m.tipo)}</button>`
      + (m.texto?`<div>${esc(m.texto)}</div>`:"");
    else corpo = esc(m.texto||`[${m.tipo}]`);
    // só o que tem texto de verdade (a mensagem, ou o áudio já transcrito) vai ao caso; mídia antiga sem arquivo, não
    const acoes = podeGravarCaso() && (m.direcao==="entrada" || m.direcao==="saida") && !semArq && resto   // F387 · a enviada também vai ao caso
      ? `<span class="zl-acoes"><button onclick="anotarMsgZap('${m.id}','${cliId}')" title="registrar na linha do tempo do caso">anotar</button><button onclick="tarefaDaMsgZap('${m.id}')" title="levar ao campo de escrever no caso, com a data que estiver no texto"><span aria-hidden="true">Tarefa</span><span class="sr-only">virar tarefa</span></button></span>` : "";
    _zapLado.set(m.id, {texto: m.texto||"", q, dir: m.direcao});
    return sep + `<div class="zap-b ${m.direcao}" style="max-width:85%"${acoes ? ` draggable="true" data-zmsg="${m.id}" title="arraste para a tarefa ou para o campo de escrever no caso"` : ""}>
      ${quem?`<div class="autor">${esc(quem)}</div>`:""}<div class="txt">${corpo}</div>
      <div class="pe">${horaSP(q)}${m.status==="erro"?" · não enviou":""}</div>${acoes}</div>`;
  });
  // F261 · A CONVERSA AO LADO DA FICHA (decisão do Paulo, 24.10.2026): o mesmo painel lateral do prazo, sem cobrir a
  // ficha, para ler, responder e levar ao caso o que importa sem redigitar. A mensagem não vira andamento sozinha:
  // quem lê decide o que entra (o mesmo princípio da tela do WhatsApp)
  const cli = D.cliPorId.get(cliId), minha = zs.find(z=>z.cliente_id===cliId) || zs[0];
  painelPz = null; painelZapCli = cliId;
  document.body.classList.add("zap-aberto");   // F263 · com a conversa ao lado, a lista da esquerda recolhe e a ficha ganha a largura
  let el = document.getElementById("painel-prazo");
  if(!el){ el = document.createElement("aside"); el.id = "painel-prazo"; document.body.appendChild(el); }
  el.setAttribute("aria-label", "Conversa de WhatsApp"); el.classList.remove("pp-prazo","pp-sobre");
  (v => v && v.remove())(document.getElementById("pp-veu"));
  el.innerHTML = `<header><div><div class="pp-cli">${zs.map(z=>esc(z.cliente_id && z.cliente_id!==cliId
        ? `${z.telefone||""} (conversa de ${D.cliPorId.get(z.cliente_id)?.nome||z.nome_perfil||"outro contato"}${obsDoNumero(cliId,z.telefone)?", "+obsDoNumero(cliId,z.telefone):""})`
        : (z.telefone||""))).join(" · ")}</div><small class="pp-tag pp-zap">WhatsApp</small><h3>${esc(cli?.nome||"")}</h3></div>
      <button class="btn-mini pp-zap-tela" onclick="zapNaTela('${minha.id}')" title="Abrir esta conversa na tela do WhatsApp do CRM"><span aria-hidden="true">Tela</span><span class="sr-only">Abrir esta conversa na tela do WhatsApp do CRM</span></button>
      <button class="pp-x" onclick="fecharPainelPrazo()" aria-label="fechar">✕</button></header>
    ${(at => at && at.id!==eu.id ? `<div class="pp-zap-com" role="status">Em atendimento com <b>${esc(at.nome.split(" ")[0])}</b>. Você pode responder: ${esc(at.nome.split(" ")[0])} recebe o aviso e a conversa continua com ${esc(at.nome.split(" ")[0])}.</div>` : "")(minha.atendente_id && D.colPorId.get(minha.atendente_id))}
    <div class="zap-msgs pp-zap-msgs">${linhas.join("") || `<p class="meio-sub">Nenhuma mensagem ainda.</p>`}</div>
    <div id="pp-zap-pend" class="pp-zap-pend" hidden></div>
    <footer class="pp-zap-resp">
      <input type="file" id="pp-zap-arq" hidden onchange="escolherArquivoLado('${minha.id}',this)">
      <button class="pp-ic" onclick="document.getElementById('pp-zap-arq').click()" title="anexar documento: você confere e depois envia" aria-label="anexar documento">📎</button>
      <button class="pp-ic" id="pp-zap-rec" onclick="gravarAudioLado('${minha.id}')" title="gravar áudio: você ouve e depois envia" aria-label="gravar áudio">🎤</button>
      <details class="ze-emo"><summary class="pp-ic" title="emojis" aria-label="Emojis">😊</summary>
        <div class="ze-emo-grade" role="group" aria-label="Emojis">${EMOJIS_ESCREVER.map(e=>`<button type="button" onclick="emojiZap('${e}','pp-zap-txt')">${e}</button>`).join("")}</div></details>
      <textarea id="pp-zap-txt" rows="2" placeholder="Responder pelo WhatsApp…" onpaste="colarPrintLado(event,'${minha.id}')"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();responderZapLado('${minha.id}','${cliId}')}"></textarea>
      <button class="pp-pri" id="pp-zap-env" onclick="responderZapLado('${minha.id}','${cliId}')">Enviar</button></footer>`;
  if(zapLadoPend && zapLadoPend.conversa!==minha.id) descartarPendZap();
  pintarPendZap();
  requestAnimationFrame(()=>{ el.classList.add("aberto"); document.body.classList.add("lado-aberto"); });
  const caixaMsgs = el.querySelector(".zap-msgs"); if(caixaMsgs) caixaMsgs.scrollTop = caixaMsgs.scrollHeight;
  carregarMinis(caixaMsgs);
  zs.forEach(lerConversaZap);   // F483 · abrir a conversa ao lado é ler
}
// os 8 últimos dígitos de cada telefone da ficha: a mesma chave do zap_conversas
function chavesDoCliente(cliId){
  const c = D.cliPorId.get(cliId); if(!c) return [];
  return [...new Set([c.telefone, ...telefonesDe(c).map(t=>t.numero)]
    .map(n=>String(n||"").replace(/\D/g,"").slice(-8)).filter(k=>k.length===8))];
}
function obsDoNumero(cliId, tel){
  const c = D.cliPorId.get(cliId), k = String(tel||"").replace(/\D/g,"").slice(-8);
  const t = c && telefonesDe(c).find(t=>String(t.numero||"").replace(/\D/g,"").slice(-8)===k);
  return t && t.obs && t.obs!=="principal" ? t.obs : "";
}
// O áudio toca na própria conversa: o botão vira o tocador, sem abrir outra aba.
// Link de 1 h, para pausar e voltar no áudio longo sem o link vencer.
// 30.10.2026 · o áudio como no WhatsApp: ▶, a onda (o clique nela leva ao ponto), o tempo e a velocidade 1×, 1,5× e 2×
// shortcut: a onda é desenhada pelo caminho do arquivo, e não pelo som; decodificar cada áudio só para o desenho não compensa
function playerZap(caminho){
  let h = 0; for(const ch of String(caminho)) h = (h*31 + ch.charCodeAt(0)) >>> 0;
  const barras = Array.from({length:28}, (_, i)=>{ h = (h*1103515245 + 12345) >>> 0; return 25 + (h>>>16) % 70; });
  return `<span class="zap-player" data-p="${esc(caminho)}">
    <button class="zp-play" data-ouvir="${esc(caminho)}" onclick="ouvirAqui(this,'${escJs(caminho)}')" aria-label="Ouvir o áudio">▶</button>
    <span class="zp-onda" onclick="pularZap(event,this)" aria-hidden="true">${barras.map(a=>`<i style="height:${a}%"></i>`).join("")}</span>
    <span class="zp-tempo">0:00</span>
    <button class="zp-vel" onclick="velZap(this)" aria-label="Velocidade do áudio">1×</button></span>`;
}
const tempoZap = t => isFinite(t) ? `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,"0")}` : "0:00";
async function ouvirAqui(btn, caminho){
  const pl = btn.closest(".zap-player");
  let a = pl.querySelector("audio");
  if(a){ a.paused ? a.play().catch(()=>{}) : a.pause(); return; }
  if(!caminho || btn.disabled) return;
  btn.disabled = true;
  try{
    a = document.createElement("audio");
    a.preload = "auto"; a.dataset.ouvir = caminho; a.playbackRate = +(pl.dataset.vel||1);
    const onda = [...pl.querySelectorAll(".zp-onda i")], tempo = pl.querySelector(".zp-tempo");
    a.onplay = ()=>{ btn.textContent = "❚❚"; btn.setAttribute("aria-label","Pausar"); };
    a.onpause = a.onended = ()=>{ btn.textContent = "▶"; btn.setAttribute("aria-label","Ouvir o áudio"); };
    a.onloadedmetadata = ()=>{ tempo.textContent = tempoZap(a.duration); };
    a.ontimeupdate = ()=>{
      const p = isFinite(a.duration) && a.duration ? a.currentTime/a.duration : 0;
      onda.forEach((b,i)=>b.classList.toggle("on", i < p*onda.length));
      tempo.textContent = tempoZap(a.currentTime);
    };
    a.src = await linkArquivo(caminho, 3600);
    pl.appendChild(a);
    btn.disabled = false;
    a.play().catch(()=>{});
  }catch(e){ btn.disabled = false; aviso("Não consegui abrir o áudio"); }
}
function pularZap(ev, onda){
  const a = onda.closest(".zap-player").querySelector("audio");
  if(!a || !isFinite(a.duration)) return;
  const r = onda.getBoundingClientRect();
  a.currentTime = a.duration * Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
}
function velZap(b){
  const pl = b.closest(".zap-player"), v = {1:1.5, 1.5:2, 2:1}[pl.dataset.vel||1];
  pl.dataset.vel = v; b.textContent = String(v).replace(".", ",") + "×";
  const a = pl.querySelector("audio"); if(a) a.playbackRate = v;
}
async function abrirArquivoZap(caminho){
  if(!caminho) return;
  const guia = window.open("","_blank");
  try{ const u = await linkArquivo(caminho); if(guia) guia.location=u; else window.location=u; }
  catch(e){ if(guia) guia.close(); aviso("Não consegui abrir o arquivo"); }
}

// Cliente que escreve de outro número (o da filha, o do vizinho) não casa pelo
// telefone. Quem atende sabe quem é: liga a conversa à ficha na mão.
// F191 · um número pode falar por mais de um cliente (a namorada que cuida do
// benefício do namorado e da sogra): o primeiro marcado fica dono da conversa;
// nos outros o número entra na lista de telefones da ficha (sem virar o
// principal), e a conversa aparece na ficha de cada um.
// F268 · quem fala na conversa representa outros clientes: o representante gravado na ficha
// deles (campos.representante, pelo CPF ou pelo nome) ou o número desta conversa na lista de telefones deles
function representadosDe(cli, chave8){
  const dig = v => String(v||"").replace(/\D/g,""), cpf = dig(cli.cpf), nome = dsa(cli.nome).trim();
  return (D.clientes||[]).filter(x=>x.id!==cli.id).map(x=>{
    const r = representanteDe(x);
    // com CPF nos dois lados vale o CPF; sem ele, o nome igual
    if(r && (cpf && dig(r.cpf) ? dig(r.cpf)===cpf : nome && dsa(r.nome).trim()===nome))
      return {x, por:r.qualidade ? `representante (${r.qualidade})` : "representante"};
    const t = chave8 && telefonesDe(x).find(t=>String(t.numero||"").replace(/\D/g,"").slice(-8)===chave8);
    return t ? {x, por:t.obs && t.obs!=="principal" ? t.obs : "mesmo WhatsApp"} : null;
  }).filter(Boolean).sort((a,b)=>String(a.x.nome).localeCompare(String(b.x.nome)));
}
function sugestoesVinculo(c){
  const nome = String(c.nome_perfil||"").replace(/[^\p{L} ]/gu," ").trim();
  return nome.length >= 3 ? pesquisar(nome).filter(x=>x.id!==c.cliente_id).slice(0, 4) : [];
}
function vincularConversa(preId){
  const c = zapConvs.find(x=>x.id===zapAberta); if(!c) return;
  const sel = [...new Set([c.cliente_id, preId].filter(Boolean))];
  const item = x => `<button class="zv-item ${sel.includes(x.id)?"on":""}" data-zv="${x.id}" aria-pressed="${sel.includes(x.id)}">
      ${esc(x.nome)}${x.cidade?` <span class="meio-sub">· ${esc(x.cidade)}</span>`:""}${x.cpf?` <span class="meio-sub mono">${esc(cpfMascarado(x.cpf))}</span>`:""}</button>`;
  const sug = sugestoesVinculo(c);
  caixa(`<h3>Vincular a conversa a cliente(s)</h3>
    <p class="meio-sub">Marque um ou mais. O primeiro fica como dono da conversa; nos outros, o número
       ${esc(foneZap(c.telefone))} entra na lista de telefones da ficha, com a observação abaixo.</p>
    ${sug.length?`<p class="zx-rot">Sugestões pelo nome do contato (${esc(c.nome_perfil||"")})</p><div class="zv-lista">${sug.map(item).join("")}</div>`:""}
    <p class="zx-rot">Buscar</p>
    <input id="zv-busca" placeholder="nome ou CPF" style="width:100%" autocomplete="off">
    <div id="zv-res" class="zv-lista"></div>
    <p class="zx-rot">Marcados</p><div id="zv-sel" class="meio-sub"></div>
    <input id="zv-obs" placeholder="observação do número nas outras fichas (ex.: é a namorada, cuida do benefício)" style="width:100%;margin-top:6px">
    <div class="form-linha" style="margin-top:10px"><button class="btn-rap" id="zv-ok">Vincular</button></div>`);
  const inp = document.getElementById("zv-busca"), res = document.getElementById("zv-res");
  const pintaSel = () => {
    document.getElementById("zv-sel").innerHTML = sel.length
      ? sel.map((id,i)=>`${i?"":"<b>dono:</b> "}${esc(D.cliPorId.get(id)?.nome||"")}`).join(" · ") : "nenhum ainda";
    document.querySelectorAll("[data-zv]").forEach(b=>{ const on = sel.includes(b.dataset.zv);
      b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
  };
  const ligar = () => document.querySelectorAll("[data-zv]").forEach(b=>b.onclick=()=>{
    const k = sel.indexOf(b.dataset.zv); if(k>=0) sel.splice(k,1); else sel.push(b.dataset.zv); pintaSel(); });
  inp.oninput = () => {
    const achados = pesquisar(inp.value).slice(0, 8);
    res.innerHTML = achados.map(item).join("") || (inp.value.trim().length>2 ? `<p class="meio-sub">ninguém com esse nome</p>` : "");
    ligar();
  };
  ligar(); pintaSel(); inp.focus();
  document.getElementById("zv-ok").onclick = async ()=>{
    if(!sel.length) return aviso("Marque ao menos um cliente");
    const obs = (document.getElementById("zv-obs").value||"").trim() || `WhatsApp de ${c.nome_perfil||"outra pessoa"}`;
    fecharCaixa();
    try{
      if(c.cliente_id!==sel[0])
        await api(`/rest/v1/zap_conversas?id=eq.${zapAberta}`,{method:"PATCH",
          headers:{Prefer:"return=minimal"}, body:JSON.stringify({cliente_id:sel[0], lead_id:null})});
      const chave = String(c.telefone||"").replace(/\D/g,"").slice(-8);
      for(const id of sel.slice(1)){
        const cli = D.cliPorId.get(id); if(!cli) continue;
        const lista = telefonesDe(cli);
        if(lista.some(t=>String(t.numero||"").replace(/\D/g,"").slice(-8)===chave)) continue;
        await salvarTelefones(id, [...lista, {numero:foneZap(c.telefone), obs, zap:false}]);
      }
    }catch(e){ return aviso(msgErro(e)); }
    aviso(sel.length>1 ? `Conversa ligada a ${sel.length} clientes ✔` : `Conversa vinculada a ${D.cliPorId.get(sel[0])?.nome||"cliente"} ✔`);
    await recarregarZap();
  };
}

function ajudaQR(){ abrirConexaoZap(); }


// ── 💰 Quando o benefício cai na conta ────────────────────────────────────
// O final é o último algarismo do NB ANTES do traço: o dígito depois do hífen
// é verificador e não entra na conta. Em 0104-7, o final é 4.
//
// Como o NB nem sempre vem com o hífen, a regra é: tira tudo que não é
// número, joga fora o último (o verificador) e pega o último que sobrou. E o
// sistema MOSTRA qual dígito usou — assim quem conferir vê na hora se o
// número foi cadastrado sem o verificador.
function finalDoNB(nb){
  const d = String(nb||"").replace(/\D/g,"");
  if(d.length < 2) return null;
  return +d.slice(0,-1).slice(-1);
}
// próximos N pagamentos daquele final, a partir de hoje
function pagamentosDoNB(nb, acima, quantos=3){
  const f = finalDoNB(nb); if(f===null) return null;
  const faixa = acima ? "acima" : "ate";
  return (D.inssCal||[])
    .filter(x=>x.faixa===faixa && x.final===f && x.pagamento>=hoje())
    .sort((a,b)=>a.pagamento<b.pagamento?-1:1)
    .slice(0,quantos);
}
// até onde a tabela cadastrada alcança — passou disso, ninguém chuta data.
// São duas pontas diferentes: a última competência coberta e o último dia em
// que ainda cai dinheiro (que já é do ano seguinte).
const ultimaCompetencia = () => (D.inssCal||[]).reduce((m,x)=>x.competencia>m?x.competencia:m,"");
const ultimoPagamento   = () => (D.inssCal||[]).reduce((m,x)=>x.pagamento>m?x.pagamento:m,"");
const mesPorExtenso = iso => new Date(iso+"T12:00:00")
  .toLocaleDateString(IDIOMA,{month:"long",year:"numeric"});

async function salvarFaixaRenda(casoId, acima){
  await patchCaso(casoId, {renda_acima_minimo:acima});
  const k = D.casoPorId.get(casoId); if(k) k.renda_acima_minimo = acima;
  aviso(acima?"Passa a usar o calendário de quem recebe acima do mínimo"
             :"Volta para o calendário de até 1 salário mínimo", false);
  if(clienteAberto) abrirFicha(clienteAberto);
}

// ── ⚙️ Configurações: o que antes só se mudava no banco ───────────────────
// Tudo aqui é do ESCRITÓRIO, não de cada um: quem mexe, mexe para todo mundo.
// Está tudo numa tela só de propósito — são as coisas que se ajustam uma vez
// e se esquece, e caçá-las espalhadas pelo sistema seria pior.
const DIAS_CFG = [["1","seg"],["2","ter"],["3","qua"],["4","qui"],["5","sex"],["6","sáb"],["7","dom"]];
let cfgAvisos = [], cfgPassos = [], cfgSetores = [], cfgColabSet = [];

// F436 · a tabela do tempo estimado da conta do Meu Dia, em minutos, para o escritório inteiro
function cfgDuracoes(){
  return `<h3 class="secao">⏱ Tempo estimado no Meu Dia</h3><p class="meio-sub">Minutos de cada natureza, somados na conta do dia.</p>
    <div class="cfg-cx">${durTabela().map(x=>`<label class="cfg-linha"><b style="min-width:190px">${esc(x.rot)}</b><input type="number" min="1" max="600" value="${x.min}" data-dur="${x.id}" style="width:80px" onchange="gravarDuracao(this)"> min</label>`).join("")}</div>`;
}
async function gravarDuracao(inp){
  const o = Object.fromEntries(durTabela().map(x=>[x.id, x.min])), v = Math.round(+inp.value);
  if(!(v>0 && v<=600)) return aviso("Escreva um número de 1 a 600");
  o[inp.dataset.dur] = v;
  try{ await guardarCfgApp("dur_tarefas", JSON.stringify(o)); aviso("Tempo guardado"); }catch(e){ aviso("Não consegui guardar"); }
}
async function renderConfig(){
  tituloLista("⚙️ Configurações");
  document.getElementById("sub-lista").textContent=
    "Quem atende, o que o robô diz e quando os avisos saem. Vale para o escritório inteiro.";
  const meio = document.getElementById("conteudo-meio");
  meio.innerHTML = `<p class="meio-sub">carregando…</p>`;
  [cfgAvisos, cfgPassos, cfgSetores, cfgColabSet] = await Promise.all([
    todas("zap_avisos","select=*&order=ordem").catch(()=>[]),
    todas("zap_bot_passos","select=*&order=ordem").catch(()=>[]),
    todas("zap_setores","select=*&order=ordem,nome").catch(()=>[]),
    todas("colaborador_setores","select=colaborador_id,setor_id").catch(()=>[]),
  ]);
  const setAtivos = cfgSetores.filter(x=>x.ativo);
  const ehMembro = (c, st) => cfgColabSet.some(x=>x.colaborador_id===c && x.setor_id===st);
  const p = estadoPonte();
  const dias = (cfgApp("zap_dias_uteis")||"1,2,3,4,5").split(",");

  meio.innerHTML =
    // F151 · a agenda de quarta: o endereço do Apps Script e o token do Paulo
    `<h3 class="secao">📅 Agenda de atendimentos</h3>${cardLigarAgenda()}`
    + cfgDuracoes()
    + cfgRegrasModelos()
    +     // ── quem atende ──────────────────────────────────────────────────────
    `<h3 class="secao">👥 Quem atende o WhatsApp</h3>
     <p class="meio-sub">Não é cadastro novo: é a mesma equipe do CRM. Quem não
        estiver marcado nunca recebe conversa, e quem já cuida do cliente tem
        preferência sobre o setor.</p>
     <div class="cfg-cx">${equipeAtiva().map(c=>
       `<div class="cfg-linha">
          <span class="eq-ini ${c.atende_zap?"on":""}" style="--cor-eq:${c.cor}">${esc(c.inicial)}</span>
          <b style="min-width:110px">${esc(c.nome)}</b>
          <label class="cfg-ck"><input type="checkbox" data-atende="${c.id}"
            ${c.atende_zap?"checked":""}> atende</label>
          ${/* F10: quem recebe menção quando nasce caso novo. Marcado sozinho
               para quem tem cargo de advogado, enquanto ninguém escolher. */""}
          <label class="cfg-ck" title="recebe uma menção sempre que um caso novo é criado na tela">
            <input type="checkbox" data-casonovo="${c.id}"
              ${quemAvisaCasoNovo().some(x=>x.id===c.id)?"checked":""}> caso novo</label>
          ${/* F187 · papel no WhatsApp e setores de que a pessoa faz parte */""}
          <select data-papel="${c.id}" title="Gestor vê e transfere todas as conversas e tem o painel da equipe; administrador é gestor e tem também as Configurações do CRM">
            <option value="colaborador" ${c.papel!=="admin"&&!c.gestor_zap?"selected":""}>atendente</option>
            <option value="gestor" ${c.papel!=="admin"&&c.gestor_zap?"selected":""}>gestor</option>
            <option value="admin" ${c.papel==="admin"?"selected":""}>administrador</option>
          </select>
          <span class="cfg-sets">${setAtivos.map(st=>`<label class="cfg-ck" title="faz parte do setor ${esc(st.nome)}">
            <input type="checkbox" data-cs="${c.id}|${st.id}" ${ehMembro(c.id, st.id)?"checked":""}>${esc(st.nome)}</label>`).join("")}</span>
          <input data-assin="${c.id}" value="${esc(c.assinatura_zap||"")}" placeholder="assina como (ex.: Dr. Paulo)"
            title="o nome que o cliente vê em cima da mensagem no WhatsApp; vazio usa o nome" style="min-width:150px">
          <input type="email" data-email="${c.id}" value="${esc(c.email||"")}" placeholder="e-mail de login"
            title="o mesmo e-mail cadastrado em Authentication → Users no Supabase; ao criar o usuário lá, o CRM liga sozinho"
            style="min-width:200px">
          <span class="meio-sub" title="${c.auth_id?"login ligado":"sem login ainda"}">${c.auth_id?"🔑":"—"}</span>
          <select data-cargo="${c.id}">
            <option value="">cargo…</option>
            ${[["advogado","advogado(a)"],["estagiario","estagiário(a)"],["recepcao","recepção"],["assistente","assistente (IA)"]]
              .map(([v,r])=>`<option value="${v}" ${c.cargo===v?"selected":""}>${r}</option>`).join("")}
          </select>
        </div>`).join("")}</div>`

    // ── F187 · setores do WhatsApp ───────────────────────────────────────
    + `<h3 class="secao">🏷 Setores do WhatsApp</h3>
       <p class="meio-sub">Os setores da transferência e da fila. Quem faz parte do setor (marcado acima)
          vê as conversas pendentes dele e recebe o aviso quando chega uma.</p>
       <div class="cfg-cx">${cfgSetores.map(st=>`<div class="cfg-linha">
           <input type="color" data-stcor="${st.id}" value="${esc(st.cor||"#5b7fd6")}" title="cor">
           <input data-stnome="${st.id}" value="${esc(st.nome)}" style="min-width:160px">
           <label class="cfg-ck">ordem <input type="number" data-stordem="${st.id}" value="${st.ordem||0}" style="width:60px"></label>
           <label class="cfg-ck"><input type="checkbox" data-stativo="${st.id}" ${st.ativo?"checked":""}> ativo</label>
         </div>`).join("")}
         <div class="cfg-linha"><input id="cf-setor-novo" placeholder="novo setor (ex.: Perícias)" style="min-width:220px">
           <button class="btn-mini" id="cf-setor-criar" title="＋ criar setor"><span aria-hidden="true">＋ Setor</span><span class="sr-only">＋ criar setor</span></button></div>
       </div>`
    // ── horário e interruptores ──────────────────────────────────────────
    + `<h3 class="secao">🕗 Horário e interruptores</h3>
       <div class="cfg-cx">
         <div class="cfg-linha">
           <b style="min-width:110px">Atendimento</b>
           <label class="cfg-ck">das <input type="time" id="cf-ini"
             value="${esc(cfgApp("zap_hora_inicio")||"08:00")}"></label>
           <label class="cfg-ck">às <input type="time" id="cf-fim"
             value="${esc(cfgApp("zap_hora_fim")||"18:00")}"></label>
           ${DIAS_CFG.map(([n,r])=>`<label class="cfg-ck"><input type="checkbox"
              data-dia="${n}" ${dias.includes(n)?"checked":""}>${r}</label>`).join("")}
         </div>
         <p class="meio-sub" style="margin:0 0 8px">Fora desse horário o robô avisa que
            responde no próximo dia útil, e nenhum aviso automático dispara.</p>
         <div class="cfg-linha">
           <label class="cfg-ck"><input type="checkbox" id="cf-bot"
             ${(cfgApp("zap_bot_ligado")||"sim")==="sim"?"checked":""}> 🤖 robô ligado</label>
           <label class="cfg-ck" title="o robô de triagem do SMBot: pede o nome de quem não é cliente, mostra o mesmo menu de 5 opções e deixa a conversa na fila do setor (Agendamentos, Atendimento, Financeiro ou Jurídico), sem atendente; desmarcado, vale o robô do CRM"><input type="checkbox" id="cf-robo-smbot"
             ${cfgApp("zap_robo_modelo")==="smbot"?"checked":""}> robô igual ao do SMBot</label>
           <label class="cfg-ck"><input type="checkbox" id="cf-avisos"
             ${(cfgApp("zap_avisos_ligado")||"sim")==="sim"?"checked":""}> 🔔 avisos automáticos ligados</label>
           <label class="cfg-ck" title="o robô responde a situação do processo com a etapa pública e manda o lembrete do menu sem resposta"><input type="checkbox" id="cf-robo-novo"
             ${cfgApp("zap_robo_novo")==="sim"?"checked":""}> robô responde a situação do processo e lembra quem não respondeu</label>
           <label class="cfg-ck" title="quando o cliente escreve no menu em vez de digitar o número, a IA escolhe a opção; exige a chave ANTHROPIC_API_KEY na função zap_triagem do Supabase"><input type="checkbox" id="cf-robo-ia"
             ${cfgApp("zap_robo_ia")==="sim"?"checked":""}> IA lê o texto livre e escolhe a opção do menu</label>
           <label class="cfg-ck" title="robô de banco, loja ou concessionária que responde ao menu com o menu dele: a conversa sai da fila e o robô não responde (só conversa sem cliente na ficha)"><input type="checkbox" id="cf-filtro-auto"
             ${cfgApp("zap_filtro_auto")==="sim"?"checked":""}> tira da fila a mensagem automática de outra empresa</label>
           <label class="cfg-ck" title="botões ✨ na conversa: resumo, rascunho de resposta e identificar o documento recebido; exige a chave ANTHROPIC_API_KEY na função zap_assistente"><input type="checkbox" id="cf-ia-equipe"
             ${cfgApp("zap_ia_equipe")==="sim"?"checked":""}> IA ajuda a equipe (resumo, rascunho e documento recebido)</label>
           <label class="cfg-ck" title="a IA oferece e marca horário pelas vagas do Google Agenda em todas as conversas e remarca quem responde NÃO à confirmação; desligada, nenhuma das duas acontece"><input type="checkbox" id="cf-robo-agenda"
             ${cfgApp("zap_robo_agenda")==="sim"?"checked":""}> Agenda da IA: marca em todas as conversas e remarca quem responde NÃO</label>
           <label class="cfg-ck" title="a IA põe na lista de espera quem pede data mais cedo e oferece pelo WhatsApp a vaga liberada pelo cancelamento ou pela remarcação, uma pessoa por vez, no expediente"><input type="checkbox" id="cf-ia-espera"
             ${cfgApp("zap_ia_espera")==="sim"?"checked":""}> IA usa a lista de espera</label>
           <label class="cfg-ck" title="fora do expediente, quem escolhe caso novo conta o caso por escrito ou por áudio, e o relato fica como nota da equipe"><input type="checkbox" id="cf-robo-noturno"
             ${cfgApp("zap_robo_noturno")==="sim"?"checked":""}> fora do expediente, robô colhe o relato do caso novo</label>
           <label class="cfg-ck" title="quem não está em conversa com a equipe conversa com a IA na hora (dúvidas, caso novo, agenda); com a equipe na conversa, a mensagem sem resposta no prazo abaixo vai à IA, que tranquiliza dizendo qual advogado vai responder; todo aviso vai a todos os advogados e à recepção no CRM; agradecimento e conversa entre colegas ficam sem resposta; nunca dá parecer, chance ou valor"><input type="checkbox" id="cf-ia-plantao"
             ${cfgApp("zap_ia_plantao")==="sim"?"checked":""}> IA responde quem ficou sem resposta e atende o caso novo</label>
           <label class="cfg-ck">a IA responde depois de
             <input type="number" id="cf-plantao-min" min="1" max="240" style="width:64px"
               value="${esc(cfgApp("zap_plantao_min")||"20")}"> min no expediente e</label>
           <label class="cfg-ck"><input type="number" id="cf-plantao-fora-min" min="1" max="240" style="width:64px"
               value="${esc(cfgApp("zap_plantao_fora_min")||"5")}"> min fora dele</label>
           <label class="cfg-ck" title="o advogado responsável do caso novo e do cliente sem advogado na ficha nem na conversa; todo aviso vai a todos os advogados e à recepção">caso novo vai para
             <select id="cf-plantao-lead">${[["todos","os três advogados"],["Paulo","Paulo"],["Marcos","Marcos"],["Amanda","Amanda"]].map(([v,n])=>`<option value="${v}" ${(cfgApp("zap_plantao_lead")||"todos")===v?"selected":""}>${n}</option>`).join("")}</select></label>
           <label class="cfg-ck" title="sem mensagem da equipe nesse prazo (e sem atendente), a IA conversa na hora com a pessoa, tira dúvidas, colhe o caso e agenda; com a equipe na conversa, ela espera o prazo acima e só tranquiliza">a IA conversa na hora com quem não falou com a equipe nos últimos
             <input type="number" id="cf-plantao-aberta-dias" min="0" max="60" style="width:64px"
               value="${esc(cfgApp("zap_plantao_aberta_dias")||"0")}"> dias (0 desliga)</label>
           <label class="cfg-ck" title="chamada direta: a função lê a conversa e responde a cada vez; Managed Agents: o agente fica cadastrado e versionado no Console da Anthropic, e cada conversa tem a sua sessão, com o histórico, que se acompanha no Console">motor da IA do WhatsApp
             <select id="cf-ia-motor">${[["mensagens","chamada direta"],["agentes","Managed Agents (beta)"]].map(([v,n])=>`<option value="${v}" ${(cfgApp("zap_ia_motor")||"mensagens")===v?"selected":""}>${n}</option>`).join("")}</select></label>
           <label class="cfg-ck" style="display:block" title="o que a IA deve saber e seguir no WhatsApp: endereço, horário, como o escritório atende, o que responder; as proibições (parecer, chance, valor) continuam valendo">instruções do escritório para a IA do WhatsApp
             <textarea id="cf-ia-txt-plantao" rows="5" style="width:100%" placeholder="Ex.: endereço do escritório, dias e horário de atendimento, o que levar ao primeiro atendimento">${esc(cfgApp("zap_ia_txt_plantao")||"")}</textarea></label>
           <label class="cfg-ck" style="display:block" title="o que o ✨ Rascunho deve seguir ao escrever a resposta para a equipe conferir">instruções do escritório para o ✨ Rascunho
             <textarea id="cf-ia-txt-rascunho" rows="3" style="width:100%">${esc(cfgApp("zap_ia_txt_rascunho")||"")}</textarea></label>
           <label class="cfg-ck"><input type="checkbox" id="cf-zap-visual"
             ${cfgApp("zap_visual")==="escritorio"?"":"checked"}> conversa com a aparência do WhatsApp</label>
           <label class="cfg-ck">🔄 revisar o acervo a cada
             <input type="number" id="cf-rev-dias" min="15" max="365" style="width:64px"
               value="${esc(cfgApp("revisao_dias")||"90")}"> dias,</label>
           <label class="cfg-ck">em doses de
             <input type="number" id="cf-rev-dose" min="1" max="30" style="width:56px"
               value="${esc(cfgApp("revisao_dose")||"5")}"> por dia</label>
           <label class="cfg-ck">silêncio do robô entre falas:
             <input type="number" id="cf-pausa" min="0" max="300" style="width:70px"
               value="${esc(cfgApp("zap_pausa_bot")||"15")}"> s</label>
           ${/* F578 · os dois tempos do WhatsApp, com a explicação à vista */""}
           <label class="cfg-ck" style="flex-basis:100%;flex-wrap:wrap">⏱ mensagem do Offline depois de
             <input type="number" id="cf-offline-min" min="0" max="1440" style="width:70px"
               value="${esc(cfgApp("zap_offline_min")||"15")}"> min sem a equipe
             <small style="flex-basis:100%;font-size:12px;color:var(--muted,#666)">Com o atendente Offline, a mensagem automática de ausência só sai se ninguém da equipe escreveu na conversa nesse prazo. Zero envia sempre.</small></label>
           <label class="cfg-ck" style="flex-basis:100%;flex-wrap:wrap">🔁 conversa volta ao robô e à IA depois de
             <input type="number" id="cf-volta-min" min="0" max="1440" style="width:70px"
               value="${esc(cfgApp("zap_volta_min")||"30")}"> min
             <small style="flex-basis:100%;font-size:12px;color:var(--muted,#666)">Contados da última mensagem da equipe ou do encerramento. Antes disso, quem escreve continua com o atendente; depois, a conversa volta ao robô e à IA. Zero devolve na hora.</small></label>
           ${/* F92 · os feriados que o catálogo de prazos não conhece: os da
                comarca e os forenses. Os nacionais (fixos e móveis) já estão
                no programa. */""}
           <label class="cfg-ck" style="flex-basis:100%" title="feriados locais e forenses, para a contagem dos prazos em dias úteis. Os nacionais já estão no programa. Formato: dd/mm (todo ano) ou dd/mm/aaaa, separados por vírgula">
             📅 feriados locais (contagem de prazos):
             <input id="cf-feriados" placeholder="ex.: 09/07, 20/01, 15/08/2026" style="flex:1;min-width:240px"
               value="${esc(cfgApp("feriados_extra")||"")}"></label>
         </div>
       </div>`

    // ── avisos ───────────────────────────────────────────────────────────
    + `<h3 class="secao">🔔 Avisos automáticos (${cfgAvisos.length})</h3>
       <p class="meio-sub">Use <code>{nome}</code>, <code>{data}</code>, <code>{hora}</code>,
          <code>{local}</code>: o sistema troca na hora de enviar. <b>Conferir antes</b>
          faz a mensagem virar rascunho em vez de sair: bom enquanto ninguém confia no robô.</p>
       ${cfgAvisos.map(a=>`<div class="cfg-reg ${a.ativo?"":"off"}">
          <div class="cfg-linha">
            <input type="checkbox" data-av-ativo="${a.chave}" ${a.ativo?"checked":""}
              title="ligar ou desligar esta regra">
            <input data-av-desc="${a.chave}" value="${esc(a.descricao)}"
              style="flex:1;min-width:180px;font-weight:700" title="o nome é só para vocês">
            <label class="cfg-ck"><input type="number" data-av-dias="${a.chave}" min="0" max="365"
              style="width:60px" value="${a.dias_antes}"> dias antes</label>
            <label class="cfg-ck"><input type="checkbox" data-av-rev="${a.chave}"
              ${a.revisar?"checked":""}> conferir antes de enviar</label>
          </div>
          <textarea data-av-txt="${a.chave}" rows="4">${esc(a.texto)}</textarea>
        </div>`).join("") || `<p class="meio-sub">Nenhuma regra. Rode o schema.sql.</p>`}`

    // ── o robô ───────────────────────────────────────────────────────────
    + `<h3 class="secao">🤖 O que o robô diz (${cfgPassos.length})</h3>
       <p class="meio-sub">O robô só cumprimenta, pergunta do que se trata e chama alguém.
          Ele não responde pergunta jurídica, e isso é de propósito: robô opinando sobre
          direito sai caro para o cliente e para o escritório.</p>
       ${cfgPassos.map(s=>`<div class="cfg-reg ${s.ativo?"":"off"}">
          <div class="cfg-linha">
            <label class="cfg-ck"><input type="checkbox" data-bp-ativo="${s.chave}"
              ${s.ativo?"checked":""}> <b>${esc(s.chave)}</b></label>
            ${s.entrega_setor?`<span class="chip ben">entrega para ${esc(s.entrega_setor)}</span>`
              :`<span class="chip neutro">menu</span>`}
          </div>
          <textarea data-bp-txt="${s.chave}" rows="${s.chave==="inicio"?9:3}">${esc(s.texto)}</textarea>
        </div>`).join("")}`

    // ── a ponte ──────────────────────────────────────────────────────────
    + `<h3 class="secao">🔌 A ponte do WhatsApp</h3>
       <div class="cfg-cx">
         <div class="cfg-linha"><span class="zap-estado" style="margin:0">
           <i style="background:${p.cor}"></i>${esc(p.txt)}</span>
           ${cfgApp("zap_visto_em")?`<span class="meio-sub">sinal de vida em
             ${fmtTS(cfgApp("zap_visto_em"))} às ${horaSP(cfgApp("zap_visto_em"))}</span>`:""}
           <button class="btn-mini" onclick="ajudaQR()" title="como ligar / ler o QR"><span aria-hidden="true">Ajuda</span><span class="sr-only">como ligar / ler o QR</span></button>
         </div>
       </div>`

    // ── o robô dos recursos (CRPS) ───────────────────────────────────────
    + (()=>{ const e = estadoCRPS();
      return `<h3 class="secao">🖥 Recurso administrativo (CRPS)</h3>
       <div class="cfg-cx">
         <div class="cfg-linha"><span class="zap-estado" style="margin:0">
           <i style="background:${e.cor}"></i>${esc(e.txt)}</span>
           ${cfgApp("crps_sync_em")?`<span class="meio-sub">última varredura em
             ${fmtTS(cfgApp("crps_sync_em"))} às ${horaSP(cfgApp("crps_sync_em"))}</span>`:""}
         </div>
         <p class="meio-sub" style="margin:8px 0">O robô consulta os recursos no e-Recursos do
            INSS e escreve os andamentos nas fichas. O login do gov.br não pode ser automatizado,
            então ele usa um <b>crachá</b> que você renova quando cai:</p>
         <ol class="meio-sub" style="margin:0 0 8px 18px;line-height:1.7">
           <li>Entre no <b>gov.br</b> (consultaprocessos.inss.gov.br) e faça login.</li>
           <li>Clique no atalho <b>Copiar crachá do CRPS</b>: arraste este botão para a barra de
               favoritos uma vez: <a class="btn-mini" href="${BOOKMARKLET_CRPS}"
               onclick="return false" style="cursor:grab">🔖 Copiar crachá do CRPS</a></li>
           <li>Volte aqui, cole no campo abaixo e salve.</li>
         </ol>
         <textarea id="cf-crps-cracha" rows="3" placeholder="cole aqui o crachá copiado"
           style="width:100%;font-family:var(--f-mono,ui-monospace,Consolas,monospace);font-size:11px"></textarea>
         <div class="form-linha" style="margin-top:6px">
           <button class="btn" id="cf-crps-salvar" title="Salvar crachá">Salvar<span class="sr-only"> crachá</span></button>
           <span class="meio-sub">o crachá fica guardado num cofre que só o robô abre e não aparece nas telas.</span>
         </div>
       </div>`; })()

    + `<p class="meio-sub" style="margin-top:14px">As mudanças são guardadas assim que você
          sai do campo. Não há botão de salvar nem desfazer.</p>`;

  ligarConfig();
}

// estado do robô do CRPS, lido do config (nunca o crачhá em si)
function estadoCRPS(){
  const e = cfgApp("crps_estado")||"sem_cracha";
  if(e==="ok")     return {cor:"#2e7d32", txt:"crachá ativo — o robô está consultando"};
  if(e==="vencido")return {cor:"#c62828", txt:"crachá vencido — cole um novo para religar"};
  return {cor:"#9e9e9e", txt:"sem crachá ainda; cole um para começar"};
}
// o atalho que copia o crачhá do gov.br: lê o login e joga na área de transferência
const BOOKMARKLET_CRPS = "javascript:(function(){var t=localStorage.getItem('ifs_auth');"
  + "if(!t){alert('Faça login no gov.br (consultaprocessos.inss.gov.br) primeiro.');return;}"
  + "navigator.clipboard.writeText(t).then(function(){alert('Crachá copiado! Cole no CRM em "
  + "Configurações → Recurso CRPS.');},function(){prompt('Copie o crachá:',t);});})()";

function ligarConfig(){
  const guarda = (sel, fn) => document.querySelectorAll(sel).forEach(fn);
  // quem atende
  guarda("[data-atende]", el => el.onchange = async ()=>{
    const c = D.colPorId.get(el.dataset.atende);
    await api(`/rest/v1/colaboradores?id=eq.${el.dataset.atende}`,{method:"PATCH",
      headers:{Prefer:"return=minimal"}, body:JSON.stringify({atende_zap:el.checked})});
    if(c) c.atende_zap = el.checked;
    aviso(el.checked?"Passa a receber conversas 💬":"Deixa de receber conversas", false);
  });
  // quem é avisado de caso novo: a lista inteira vai para uma chave só, para
  // não precisar de coluna nova em colaboradores
  guarda("[data-casonovo]", el => el.onchange = async ()=>{
    const marcados = [...document.querySelectorAll("[data-casonovo]")]
      .filter(x=>x.checked).map(x=>x.dataset.casonovo);
    await guardarCfgApp("avisar_caso_novo", marcados.join(","));
    aviso(marcados.length ? `${marcados.length} pessoa(s) avisadas de caso novo`
                          : "Ninguém será avisado de caso novo", false);
  });
  guarda("[data-email]", el => el.onchange = async ()=>{
    const c = D.colPorId.get(el.dataset.email);
    const email = (el.value||"").trim().toLowerCase() || null;
    try{
      await api(`/rest/v1/colaboradores?id=eq.${el.dataset.email}`,{method:"PATCH",
        headers:{Prefer:"return=minimal"}, body:JSON.stringify({email})});
    }catch(e){ return aviso("Não gravou — só o administrador altera a equipe."); }
    if(c) c.email = email;
    aviso("E-mail guardado ✔ — crie o usuário com esse e-mail no Supabase (Authentication → Users) e o login liga sozinho", false);
  });
  // F188 · como a pessoa assina no WhatsApp ("*Dr. Paulo Tercini:*")
  guarda("[data-assin]", el => el.onchange = async ()=>{
    const c = D.colPorId.get(el.dataset.assin), v = (el.value||"").trim() || null;
    try{ await api(`/rest/v1/colaboradores?id=eq.${el.dataset.assin}`,{method:"PATCH",
      headers:{Prefer:"return=minimal"}, body:JSON.stringify({assinatura_zap:v})}); }
    catch(e){ return aviso("Não gravou — só o gestor altera a equipe."); }
    if(c) c.assinatura_zap = v;
    aviso(`Assinatura guardada ✔ — o cliente verá "${v || (c&&c.nome)}:" em cima das mensagens`, false);
  });
  guarda("[data-cargo]", el => el.onchange = async ()=>{
    const c = D.colPorId.get(el.dataset.cargo);
    await api(`/rest/v1/colaboradores?id=eq.${el.dataset.cargo}`,{method:"PATCH",
      headers:{Prefer:"return=minimal"}, body:JSON.stringify({cargo:el.value||null})});
    if(c) c.cargo = el.value||null;
    aviso("Cargo guardado ✔", false);
  });
  // F187 · papel (gestor/atendente) e setores de cada pessoa
  guarda("[data-papel]", el => el.onchange = async ()=>{
    const c = D.colPorId.get(el.dataset.papel);
    if(c && c.id===eu.id && el.value!=="admin"
       && !await confirmar("Tirar o seu próprio papel de administrador? Você perde as Configurações.")){
      el.value = "admin"; return; }
    // F368 · gestor do WhatsApp (gestor_zap) sem ser administrador do CRM
    const corpo = el.value==="admin" ? {papel:"admin"}
      : {papel: c && c.papel!=="admin" ? c.papel : "colaborador", gestor_zap: el.value==="gestor"};
    try{
      await api(`/rest/v1/colaboradores?id=eq.${el.dataset.papel}`,{method:"PATCH",
        headers:{Prefer:"return=minimal"}, body:JSON.stringify(corpo)});
    }catch(e){ el.value = c ? (c.papel==="admin"?"admin":c.gestor_zap?"gestor":"colaborador") : el.value; return aviso("Não gravou: apenas o administrador altera a equipe."); }
    if(c) Object.assign(c, corpo);
    aviso(`${c?c.nome:"A pessoa"} agora é ${el.value==="admin"?"administrador":el.value==="gestor"?"gestor":"atendente"} ✔`, false);
  });
  guarda("[data-cs]", el => el.onchange = async ()=>{
    const [colab, setor] = el.dataset.cs.split("|");
    try{
      if(el.checked) await api(`/rest/v1/colaborador_setores`,{method:"POST",
        headers:{Prefer:"resolution=ignore-duplicates,return=minimal"}, body:JSON.stringify({colaborador_id:colab, setor_id:setor})});
      else await api(`/rest/v1/colaborador_setores?colaborador_id=eq.${colab}&setor_id=eq.${setor}`,{method:"DELETE",
        headers:{Prefer:"return=minimal"}});
    }catch(e){ el.checked = !el.checked; return aviso(msgErro(e)); }
    aviso(el.checked ? "Entrou no setor ✔" : "Saiu do setor", false);
  });
  const mudarSetor = async (id, campos) => {
    try{ await api(`/rest/v1/zap_setores?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify(campos)}); }
    catch(e){ return aviso(msgErro(e)); }
    aviso("Setor guardado ✔", false);
  };
  guarda("[data-stnome]", el => el.onchange = ()=> el.value.trim() && mudarSetor(el.dataset.stnome, {nome:el.value.trim()}));
  guarda("[data-stcor]", el => el.onchange = ()=> mudarSetor(el.dataset.stcor, {cor:el.value}));
  guarda("[data-stordem]", el => el.onchange = ()=> mudarSetor(el.dataset.stordem, {ordem:Number(el.value)||0}));
  guarda("[data-stativo]", el => el.onchange = ()=> mudarSetor(el.dataset.stativo, {ativo:el.checked}));
  const btSetor = document.getElementById("cf-setor-criar");
  if(btSetor) btSetor.onclick = async ()=>{
    const nome = (document.getElementById("cf-setor-novo").value||"").trim(); if(!nome) return;
    try{ await api(`/rest/v1/zap_setores`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({nome, ordem:cfgSetores.length+1})}); }
    catch(e){ return aviso(msgErro(e)); }
    aviso(`Setor ${nome} criado ✔`); renderConfig();
  };
  // horário e interruptores
  const cfgSalva = (id, chave, valor) => {
    const el = document.getElementById(id); if(!el) return;
    el.onchange = async ()=>{ await guardarCfgApp(chave, valor(el)); aviso("Guardado ✔", false); };
  };
  // salvar o crachá do CRPS: vai para o cofre (RPC), nunca para uma coluna lida
  const btCrps = document.getElementById("cf-crps-salvar");
  if(btCrps) btCrps.onclick = async ()=>{
    const t = (document.getElementById("cf-crps-cracha").value||"").trim();
    if(!t) return aviso("Cole o crachá antes de salvar");
    try{
      await api("/rest/v1/rpc/crps_guardar_cracha",{method:"POST",
        headers:{Prefer:"return=minimal"}, body:JSON.stringify({p_cracha:t})});
      (D.config=D.config||new Map()).set("crps_estado","ok");
      aviso("Crachá guardado ✔ — o robô volta a consultar na próxima rodada", false);
      renderConfig();
    }catch(e){ aviso("Não consegui guardar o crachá"); }
  };
  cfgSalva("cf-ini","zap_hora_inicio", el=>el.value||"08:00");
  cfgSalva("cf-fim","zap_hora_fim",    el=>el.value||"18:00");
  cfgSalva("cf-pausa","zap_pausa_bot", el=>String(Math.max(0, +el.value||0)));
  cfgSalva("cf-volta-min","zap_volta_min", el=>String(Math.max(0, Math.round(+el.value||0))));
  cfgSalva("cf-offline-min","zap_offline_min", el=>String(Math.max(0, Math.round(+el.value||0))));
  cfgSalva("cf-bot","zap_bot_ligado",  el=>el.checked?"sim":"nao");
  cfgSalva("cf-robo-smbot","zap_robo_modelo", el=>el.checked?"smbot":"crm");
  cfgSalva("cf-avisos","zap_avisos_ligado", el=>el.checked?"sim":"nao");
  cfgSalva("cf-robo-novo","zap_robo_novo", el=>el.checked?"sim":"nao");
  cfgSalva("cf-robo-ia","zap_robo_ia", el=>el.checked?"sim":"nao");
  cfgSalva("cf-filtro-auto","zap_filtro_auto", el=>el.checked?"sim":"nao");
  cfgSalva("cf-ia-equipe","zap_ia_equipe", el=>el.checked?"sim":"nao");
  cfgSalva("cf-robo-agenda","zap_robo_agenda", el=>el.checked?"sim":"nao");
  cfgSalva("cf-ia-espera","zap_ia_espera", el=>el.checked?"sim":"nao");
  cfgSalva("cf-robo-noturno","zap_robo_noturno", el=>el.checked?"sim":"nao");
  cfgSalva("cf-ia-plantao","zap_ia_plantao", el=>el.checked?"sim":"nao");
  cfgSalva("cf-plantao-min","zap_plantao_min", el=>String(Math.min(240, Math.max(1, Math.round(+el.value||20)))));
  cfgSalva("cf-plantao-fora-min","zap_plantao_fora_min", el=>String(Math.min(240, Math.max(1, Math.round(+el.value||5)))));
  cfgSalva("cf-plantao-aberta-dias","zap_plantao_aberta_dias", el=>String(Math.min(60, Math.max(0, Math.round(+el.value||0)))));
  cfgSalva("cf-ia-txt-plantao","zap_ia_txt_plantao", el=>el.value.trim().slice(0, 4000));
  cfgSalva("cf-ia-txt-rascunho","zap_ia_txt_rascunho", el=>el.value.trim().slice(0, 2000));
  cfgSalva("cf-plantao-lead","zap_plantao_lead", el=>el.value||"todos");
  cfgSalva("cf-ia-motor","zap_ia_motor", el=>el.value==="agentes"?"agentes":"mensagens");
  cfgSalva("cf-zap-visual","zap_visual", el=>el.checked?"whatsapp":"escritorio");
  cfgSalva("cf-rev-dias","revisao_dias", el=>String(Math.max(15, +el.value||90)));
  cfgSalva("cf-rev-dose","revisao_dose", el=>String(Math.max(1, +el.value||5)));
  // F92 · só o que tem cara de data entra; o resto é descartado em silêncio
  cfgSalva("cf-feriados","feriados_extra", el=>String(el.value||"").split(/[,;\s]+/)
    .filter(x=>/^\d{2}\/\d{2}(\/\d{4})?$/.test(x)).join(", "));
  guarda("[data-dia]", el => el.onchange = async ()=>{
    const dias = [...document.querySelectorAll("[data-dia]")].filter(x=>x.checked)
                   .map(x=>x.dataset.dia).join(",");
    await guardarCfgApp("zap_dias_uteis", dias);
    aviso(dias?"Dias de atendimento guardados ✔":"Sem dia marcado: nada dispara", false);
  });
  // avisos e passos do robô — a chave é o id, então dá para tratar igual
  const linha = (attr, tabela, campo, ler) => guarda(`[${attr}]`, el => {
    const evento = el.tagName==="TEXTAREA" ? "onblur" : "onchange";
    el[evento] = async ()=>{
      await api(`/rest/v1/${tabela}?chave=eq.${encodeURIComponent(el.getAttribute(attr))}`,
        {method:"PATCH", headers:{Prefer:"return=minimal"},
         body:JSON.stringify({[campo]: ler(el)})});
      aviso("Guardado ✔", false);
      if(campo==="ativo") el.closest(".cfg-reg").classList.toggle("off", !el.checked);
    };
  });
  linha("data-av-ativo","zap_avisos","ativo",  el=>el.checked);
  linha("data-av-desc", "zap_avisos","descricao", el=>el.value.trim()||"aviso");
  linha("data-av-rev",  "zap_avisos","revisar",el=>el.checked);
  linha("data-av-dias", "zap_avisos","dias_antes", el=>Math.max(0, +el.value||0));
  linha("data-av-txt",  "zap_avisos","texto",  el=>el.value);
  linha("data-bp-ativo","zap_bot_passos","ativo", el=>el.checked);
  linha("data-bp-txt",  "zap_bot_passos","texto", el=>el.value);
}

// ── 📣 Marketing (o que estamos trabalhando + público por benefício) ──────
function renderMarketing(){
  tituloLista("📣 Marketing");
  document.getElementById("sub-lista").textContent=
    "Onde o escritório está trabalhando mais (últimos 30 dias) — use para pautar posts e enviar material certo para o cliente certo.";
  const atividade={};
  D.and30.forEach(a=>{
    const k=D.casoPorId.get(a.caso_id);
    if(k&&k.beneficio) atividade[k.beneficio]=(atividade[k.beneficio]||0)+1;
  });
  const publico={};
  ativos().forEach(k=>{
    if(!k.beneficio) return;
    const c=D.cliPorId.get(k.cliente_id);
    if(!publico[k.beneficio]) publico[k.beneficio]=new Map();
    if(c) publico[k.beneficio].set(c.id, c);
  });
  const ranking=Object.entries(atividade).sort((a,b)=>b[1]-a[1]);
  const max=Math.max(...ranking.map(r=>r[1]),1);
  document.getElementById("conteudo-meio").innerHTML =
    ranking.map(([ben,n],i)=>{
      const cs=[...(publico[ben]||new Map()).values()];
      const tels=cs.filter(c=>c.telefone).map(c=>c.telefone);
      return `<div class="mkt"><strong>${i+1}º ${esc(ben)}</strong>
        <div class="tubo" style="flex:1;height:10px;background:var(--fundo);border-radius:5px;overflow:hidden"><i style="display:block;height:100%;width:${n/max*100}%;background:var(--azul);border-radius:5px"></i></div>
        <span class="chip neutro">${n} andamentos/30d</span>
        <span class="chip fase">${cs.length} clientes ativos</span>
        ${tels.length?`<button class="btn-mini" onclick="copiar(${esc(JSON.stringify(tels.join("\n")))},'${tels.length} telefones copiados, lista de transmissão 📣')">📋 telefones (${tels.length})</button>`:""}
      </div>`;
    }).join("") || "<p class='meio-sub'>Sem atividade registrada nos últimos 30 dias.</p>";
}

// ── agenda e dashboard ────────────────────────────────────────────────────
// F250 · todos os clientes do escritório, em ordem de nome, com um filtro; o clique abre a ficha (no nível 0, só a Identificação)
// F252 · o índice de A a Z no alto: a letra mostra só os nomes dela (a letra sem cliente fica apagada); digitar procura em todos
let _cliFiltro = "", _cliLetra = "", _cliSemTel = false;
// sem telefone não há WhatsApp nem foto: o filtro põe primeiro quem tem caso aberto, e o número se completa ali mesmo
const semTelefone = c => String(c.telefone||"").replace(/\D/g,"").length < 10;
const temCasoAberto = c => (D.casosDoCliente.get(c.id)||[]).some(k=>k.fase!=="encerrado");
const letraDoNome = n => { const l = dsa(String(n||"").trim()).charAt(0).toUpperCase(); return /[A-Z]/.test(l) ? l : "#"; };
const LETRAS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", "#"];
function renderClientesTodos(){
  tituloLista(temaV10() ? "Clientes" : "👥 Clientes");
  document.getElementById("sub-lista").textContent = `${(D.clientes||[]).filter(c=>c.nome && ehClienteDaLista(c)).length} clientes do escritório. Escolha a letra ou digite parte do nome, o CPF ou o telefone.`;
  document.getElementById("conteudo-meio").innerHTML = `<div class="cli-todos">
    <nav class="cli-az" id="cli-az" aria-label="Índice de A a Z"></nav>
    <input id="cli-filtro" class="aq-inp" placeholder="Filtrar por nome, CPF ou telefone" value="${esc(_cliFiltro)}" autocomplete="off">
    <button type="button" id="cli-semtel" class="cli-az-l cli-semtel" aria-pressed="${_cliSemTel}"></button>
    <ul class="cli-todos-l" id="cli-todos-l"></ul><p class="meio-sub" id="cli-todos-n"></p></div>`;
  const inp = document.getElementById("cli-filtro");
  inp.oninput = () => { _cliFiltro = inp.value; if(_cliFiltro.trim()) _cliLetra = ""; pintarClientesTodos(); };
  document.getElementById("cli-semtel").onclick = () => { _cliSemTel = !_cliSemTel; pintarClientesTodos(); };
  pintarClientesTodos();
}
async function completarTelefone(cliId){
  const inp = document.querySelector(`[data-tel="${cliId}"]`), c = D.cliPorId.get(cliId); if(!inp || !c) return;
  let d = inp.value.replace(/\D/g,""); if(d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if(d.length === 8 || d.length === 9) d = "16" + d;           // como no Novo Cliente: sem DDD, é 16
  if(d.length < 10 || d.length > 11) return aviso("Número incompleto: escreva o DDD e o número");
  const r = telRecado(d); if(r) return aviso(r);
  if(!await salvarCliCampo(cliId, "telefone", fmtTelBR(d))) return;
  reindexarCliente(c);
  aviso(`📞 Telefone de ${c.nome.split(" ")[0]} guardado. A foto do WhatsApp chega em instantes.`, false);
  pintarClientesTodos();
}
function escolherLetra(l){
  _cliLetra = _cliLetra===l ? "" : l; _cliFiltro = "";
  const inp = document.getElementById("cli-filtro"); if(inp) inp.value = "";
  pintarClientesTodos();
  const lista = document.getElementById("cli-todos-l"); if(lista && lista.scrollIntoView) lista.scrollIntoView({block:"nearest"});
}
// F254 · QUEM É CLIENTE NA LISTA. O To Do trazia como "cliente" toda tarefa sem CPF ("Imprimir", "iCloud", "Comprar balas"),
// e apagar a tarefa lá só encerra o caso: o cadastro fica. Na lista vale: quem tem CPF; sem CPF, quem tem nome e sobrenome
// que não sejam de tarefa; nunca quem o Paulo marcou "Não é cliente" (campos.nao_cliente), e sempre quem ele marcou "É cliente".
const RX_NAO_PESSOA = /(^|[^a-z])(imprimir|icloud|agenda|agendar|protocolos?|analise|contratos?|documentos|peticoes|replica|ouvidoria|ver|ligar|comprar|conferencia|holerites|mascara|qrcode|procon|termo|medidas|anotacoes|doc|calculo|embargos|incapacidade|deficiencia|atividades?|auxilio-acidente|impugnacao|md|digitalizar|processo|aviso|colocar|comprovantes|ressonancia|cumprir|verificar|ultima|auditoria|esclarecimentos|estrategia|diagnostico|ruptura|recurso|escolha|acerto|advogad[oa]|forum|depoente|laudo|pdfs?|adicionar|descobrir|redimensionar|e-?mail|jurisprudencias?|procuracao|condominio|despejo|etiquetas)([^a-z]|$)/;
const palavrasDoNome = n => String(n||"").trim().split(/\s+/).filter(Boolean);
const naoPareceCliente = c => { const n = dsa(c.nome||"").replace(/[()"'+,]/g," ");
  // nome de pessoa não tem número; o nome de quem é da equipe também não é de cliente
  return RX_NAO_PESSOA.test(n) || /\d/.test(n) || /^(a|aa|i ?m|pai|mae)$/.test(n.trim()) || /(^|\s)tercini(\s|$)/.test(n)
    || (D.colaboradores||[]).some(co=>{ const e = dsa(co.nome||"").trim(); return e.split(/\s+/).length>=2 && n.trim().startsWith(e); }); };
// F614 · a tarefa da lista Marcos sem #CPF chega com a nota "falta_cpf" (migrar.py): é cliente e fica à vista até ter CPF
const faltaCpf = c => String(c.cpf||"").replace(/\D/g,"").length!==11 && ((c.campos||{}).notas_todo||[]).some(n=>n && n.tipo==="falta_cpf");
function ehClienteDaLista(c){
  const k = c.campos || {};
  if(k.nao_cliente) return false;
  if(k.e_cliente || faltaCpf(c) || String(c.cpf||"").replace(/\D/g,"").length===11) return true;
  return palavrasDoNome(c.nome).length >= 2 && !naoPareceCliente(c);
}
async function marcarNaoCliente(cliId, nao){
  const c = D.cliPorId.get(cliId); if(!c || !souAdmin()) return;
  const campos = {...(c.campos||{})};
  if(nao){ campos.nao_cliente = true; delete campos.e_cliente; } else { delete campos.nao_cliente; campos.e_cliente = true; }
  try{ await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({campos})}); }
  catch(e){ return aviso("Não gravou — tente de novo"); }
  c.campos = campos;
  aviso(nao ? `“${c.nome}” saiu da lista Clientes` : `“${c.nome}” volta à lista Clientes`, false);
  if(clienteAberto===cliId) repintarFicha(); else render();
}
// F255 · a situação do cliente na lista: caso andando (verde), só atendimento ou pré-caso no Escritório (amarelo), nenhum aberto (vermelho)
function situacaoDaLista(c){
  const abertos = (D.casosDoCliente.get(c.id)||[]).filter(k=>k.fase!=="encerrado");
  if(abertos.some(k=>k.fase!=="escritorio")) return ["ativo","Caso ativo"];
  if(abertos.length || ((c.campos||{}).precasos||[]).length) return ["formacao","Em formação"];
  return ["inativo","Inativo"];
}
// F586 · CONTATOS QUE NÃO SÃO CLIENTES: advogado, fornecedor, gerente do banco, órgão público, parceiro.
// O contato é linha de clientes com campos.nao_cliente (fica fora da lista Clientes e das contas) e campos.contato = {cat, empresa, obs};
// a conversa do WhatsApp do número dele não recebe robô, menu nem IA (gatilhos da migração f586_contatos.sql).
const CAT_CONTATO = ["Advogado","Fornecedor","Banco","Órgão público","Parceiro","Outro"];
const ehContato = c => !!(c && (c.campos||{}).contato);
const rotContato = c => `Contato${(c.campos.contato||{}).cat ? " · " + c.campos.contato.cat : ""}`;
const seloContato = c => ehContato(c) ? `<span class="chip neutro ct-selo">${esc(rotContato(c))}</span>` : "";
function formContato(pre){
  const k = pre || {};
  return `<label class="ct-l">Nome<input id="ct-nome" value="${esc(k.nome||"")}" autocomplete="off" style="width:100%"></label>
    <label class="ct-l">Categoria<select id="ct-cat">${CAT_CONTATO.map(x=>`<option${x===(k.cat||"Outro")?" selected":""}>${x}</option>`).join("")}</select></label>
    <label class="ct-l">Empresa ou órgão<input id="ct-emp" value="${esc(k.empresa||"")}" style="width:100%"></label>
    ${k.semTel ? "" : `<label class="ct-l">Telefone<input id="ct-tel" value="${esc(k.tel||"(16) ")}" inputmode="tel" style="width:100%"></label>`}
    <label class="ct-l">Observação<textarea id="ct-obs" rows="2" style="width:100%">${esc(k.obs||"")}</textarea></label>`;
}
const lerContato = () => ({cat: document.getElementById("ct-cat").value,
  empresa: document.getElementById("ct-emp").value.trim(), obs: document.getElementById("ct-obs").value.trim()});
// F586 · o número do WhatsApp vira contato: a ficha nasce com ele, e o gatilho do banco prende a conversa e cala a IA
function contatoDoNumero(fone, nome){
  novoContato({nome, tel: fone.slice(2), depois: async ()=>{
    let conv; try{ conv = await abrirContatoZap(fone, nome); }catch(e){ return aviso("Contato salvo; não abri a conversa: "+msgErro(e)); }
    await recarregarZap(true).catch(()=>{});
    if(visao!=="whatsapp") irPara("whatsapp");
    abrirConversa(conv, true);
  }});
}
function contatoDaConversa(){
  const c = zapConvs.find(x=>x.id===zapAberta); if(!c) return;
  const fone = String(c.telefone||"").replace(/\D/g,"");
  contatoDoNumero(fone.length>=12 ? fone : "55"+fone, c.contato_nome||c.nome_perfil||"");
}
function novoContato(pre){
  if(semCadastro()) return;
  caixa(`<h3>Novo contato</h3><p class="meio-sub">Para quem não é cliente: advogado, fornecedor, banco, órgão público, parceiro. Não entra na lista Clientes, e o WhatsApp do número fica sem robô e sem IA.</p>
    ${formContato(pre)}<div class="form-linha" style="margin-top:10px"><button class="btn-sal" id="ct-ok">Salvar</button></div>`);
  document.getElementById("ct-nome").focus();
  document.getElementById("ct-ok").onclick = async ()=>{
    const nome = document.getElementById("ct-nome").value.trim(); if(!nome) return aviso("Escreva o nome do contato");
    let d = document.getElementById("ct-tel").value.replace(/\D/g,""); if(d.startsWith("55") && d.length>=12) d = d.slice(2);
    if(d.length===8 || d.length===9) d = "16" + d;
    if(d.length===2) d = "";
    if(d && (d.length<10 || d.length>11)) return aviso("Telefone incompleto: escreva o DDD e o número");
    const ja = d ? clientesDoTelefone(d) : [];
    if(ja.length && !confirm(`Este número já está na ficha de ${ja[0].nome}. Criar o contato mesmo assim?`)) return;
    let cli;
    try{ [cli] = await api("/rest/v1/clientes",{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({nome, telefone: d ? fmtTelBR(d) : null, campos:{nao_cliente:true, contato:lerContato()}})}); }
    catch(e){ return aviso("Não gravou o contato: "+msgErro(e)); }
    D.clientes.push(cli); D.cliPorId.set(cli.id, cli); reindexarCliente(cli);
    fecharCaixa(); aviso(`📇 ${nome} guardado em Contatos`, false);
    if(pre && pre.depois) return pre.depois(cli);
    montarSidebar(); if(visao==="contatos") pintarContatos();
  };
}
// a ficha vira contato ou volta a cliente; com caso aberto não vira, porque o caso é de cliente
function virarContato(cliId){
  const c = D.cliPorId.get(cliId); if(!c || semCadastro()) return;
  if(temCasoAberto(c)) return aviso(`${c.nome} tem caso aberto: encerre o caso antes de transformar a ficha em contato`);
  caixa(`<h3>${esc(c.nome)} como contato</h3>${formContato({...(c.campos.contato||{}), nome:c.nome, semTel:true})}
    <div class="form-linha" style="margin-top:10px"><button class="btn-sal" id="ct-ok">Salvar</button></div>`);
  document.getElementById("ct-nome").disabled = true;
  document.getElementById("ct-ok").onclick = ()=>gravarContato(cliId, lerContato());
}
async function gravarContato(cliId, ct){
  const c = D.cliPorId.get(cliId); if(!c) return;
  const campos = {...(c.campos||{})};
  if(ct){ campos.contato = ct; campos.nao_cliente = true; delete campos.e_cliente; }
  else { delete campos.contato; delete campos.nao_cliente; campos.e_cliente = true; }
  try{ await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({campos})}); }
  catch(e){ return aviso("Não gravou: "+msgErro(e)); }
  c.campos = campos; fecharCaixa();
  aviso(ct ? `📇 ${c.nome} passou a Contatos` : `${c.nome} volta a ser cliente`, false);
  montarSidebar(); if(clienteAberto===cliId) repintarFicha(); else render();
}
function itemContato(c){
  if(!podeCadastrar()) return "";
  return ehContato(c)
    ? `<button class="cad-mini" style="margin-top:6px" onclick="virarContato('${c.id}')" title="mudar a categoria, a empresa ou a observação do contato">Editar<span class="sr-only"> contato</span></button>
       <button class="cad-mini" style="margin-top:6px" onclick="gravarContato('${c.id}',null)" title="esta pessoa passou a ser cliente: volta à lista Clientes e o WhatsApp volta ao robô e à IA">Cliente<span class="sr-only">: voltar a ser cliente</span></button>`
    : temCasoAberto(c) ? "" : `<button class="cad-mini" style="margin-top:6px" onclick="virarContato('${c.id}')" title="esta pessoa não é cliente (advogado, fornecedor, banco…): sai da lista Clientes e o WhatsApp fica sem robô e sem IA">Contato<span class="sr-only">: não é cliente</span></button>`;
}
let _ctFiltro = "", _ctCat = "";
function renderContatos(){
  tituloLista(temaV10() ? "Contatos" : "📇 Contatos");
  document.getElementById("sub-lista").textContent = "Quem não é cliente: advogados, fornecedores, bancos, órgãos públicos, parceiros.";
  document.getElementById("conteudo-meio").innerHTML = `<div class="cli-todos">
    <nav class="cli-az" id="ct-cats" aria-label="Categorias"></nav>
    <div class="form-linha"><input id="ct-filtro" class="aq-inp" placeholder="Filtrar por nome, empresa ou telefone" value="${esc(_ctFiltro)}" autocomplete="off">
    ${podeCadastrar() ? `<button class="btn-sal" id="ct-novo" title="Cadastrar um contato que não é cliente">＋ Contato</button>` : ""}</div>
    <ul class="cli-todos-l" id="ct-l"></ul></div>`;
  const inp = document.getElementById("ct-filtro"); inp.oninput = () => { _ctFiltro = inp.value; pintarContatos(); };
  const nv = document.getElementById("ct-novo"); if(nv) nv.onclick = () => novoContato();
  pintarContatos();
}
function pintarContatos(){
  const todos = (D.clientes||[]).filter(c=>c.nome && ehContato(c)).sort((a, b)=>dsa(a.nome).localeCompare(dsa(b.nome)));
  const cats = document.getElementById("ct-cats"); if(!cats) return;
  cats.innerHTML = ["", ...CAT_CONTATO].map(x=>{ const n = x ? todos.filter(c=>c.campos.contato.cat===x).length : todos.length;
    return `<button type="button" class="cli-az-l${_ctCat===x?" on":""}" data-cat="${esc(x)}" aria-pressed="${_ctCat===x}" ${n||!x?"":"disabled"}>${x||"Todos"} (${n})</button>`; }).join("");
  cats.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{ _ctCat = _ctCat===b.dataset.cat ? "" : b.dataset.cat; pintarContatos(); });
  const q = dsa(_ctFiltro).trim(), dig = _ctFiltro.replace(/\D/g,"");
  const achados = todos.filter(c=>!_ctCat || c.campos.contato.cat===_ctCat)
    .filter(c=>!q || dsa(c.nome + " " + (c.campos.contato.empresa||"")).includes(q) || (dig.length>=3 && String(c.telefone||"").replace(/\D/g,"").includes(dig)));
  const l = document.getElementById("ct-l");
  l.innerHTML = achados.map(c=>{ const k = c.campos.contato;
    return `<li><button type="button" class="cli-todos-it" data-cli="${c.id}"><span class="avatar" style="--av:${corDoNome(c.nome)}">${esc(c.nome[0])}</span>
      <span class="cli-todos-tx"><b>${esc(c.nome)}</b><span>${esc([k.cat, k.empresa, c.telefone ? fmtTelBR(c.telefone) : "", k.obs].filter(Boolean).join(" · "))}</span></span></button></li>`; }).join("")
    || `<li class="meio-sub">${todos.length ? "Nenhum contato com esse filtro." : "Nenhum contato ainda. Use ＋ Contato."}</li>`;
  l.querySelectorAll("[data-cli]").forEach(b=>b.onclick=()=>abrirFicha(b.dataset.cli));
}
// F602 · 💰 Contribuições: quem paga o INSS por plano (qualidade_planos). No To Do continua em 🙏 Aposentadorias Futuras.
function clientesContrib(){
  const por = new Map();
  (D.qualidade||[]).filter(q=>q.ativo!==false).forEach(q=>{ const px = qualidadeProximos(q, 1)[0] || "";
    const a = por.get(q.cliente_id); if(!a || (px && (!a.px || px < a.px))) por.set(q.cliente_id, {q, px}); });
  return [...por.entries()].map(([id, v])=>({c: (D.clientes||[]).find(c=>c.id===id), ...v})).filter(x=>x.c)
    .sort((a, b)=>(a.px||"9999").localeCompare(b.px||"9999") || dsa(a.c.nome).localeCompare(dsa(b.c.nome)));
}
function itemContrib(rotu){
  if(visaoColab() && !listasDoColab().includes("contribuicoes")) return "";
  const n = clientesContrib().length;
  return `<div class="lista-item" role="button" tabindex="0" data-v="contribuicoes" aria-label="Contribuições">${rotu("💰 Contribuições")}${n?`<span class="cont">${n}</span>`:""}</div>`;
}
function renderContribuicoes(){
  tituloLista(temaV10() ? "Contribuições" : "💰 Contribuições");
  document.getElementById("sub-lista").textContent = "Quem paga o INSS por plano. No Microsoft To Do, continuam em Aposentadorias Futuras.";
  const meio = document.getElementById("conteudo-meio");
  if(D.qualidade===null){ meio.innerHTML = `<p class="meio-sub">A tabela dos planos não existe no banco: rode crm/fase2/schema_qualidade.sql.</p>`; return; }
  const l = clientesContrib(), h = hoje();
  meio.innerHTML = `<div class="cli-todos"><ul class="cli-todos-l" id="ctb-l">${l.map(({c, q, px})=>
    `<li><button type="button" class="cli-todos-it" data-cli="${c.id}"><span class="avatar" style="--av:${corDoNome(c.nome)}">${esc(c.nome[0])}</span>
      <span class="cli-todos-tx"><b>${esc(c.nome)}</b><span>${esc([qualFim(q), qualGuia(q), qualValor(q.valor)].filter(Boolean).join(" · "))}</span></span>
      <span class="ctb-px${px && px<=h ? " venc" : ""}">${px ? `pagar até ${fmtBarra(px)}` : "sem pagamento por vir"}</span></button>
      <button type="button" class="cad-mini" data-plano="${c.id}" title="ver o plano de pagamento">Plano</button></li>`).join("")
    || `<li class="meio-sub">Nenhum cliente com plano de pagamento ativo.</li>`}</ul></div>`;
  meio.querySelectorAll("[data-cli]").forEach(b=>b.onclick=()=>abrirFicha(b.dataset.cli));
  meio.querySelectorAll("[data-plano]").forEach(b=>b.onclick=()=>verQualidade(b.dataset.plano));
}
function pintarClientesTodos(){
  const q = dsa(_cliFiltro).replace(/\s+/g," ").trim(), dig = _cliFiltro.replace(/\D/g,""), partes = q.split(" ").filter(Boolean);
  const todos = (D.clientes||[]).filter(c=>c.nome && ehClienteDaLista(c)).slice().sort((a, b)=>dsa(a.nome).localeCompare(dsa(b.nome)));   // F254
  const porLetra = new Map(); todos.forEach(c=>{ const l = letraDoNome(c.nome); porLetra.set(l, (porLetra.get(l)||0) + 1); });
  const az = document.getElementById("cli-az");
  if(az) az.innerHTML = `<button type="button" class="cli-az-l${!_cliLetra?" on":""}" data-letra="" aria-pressed="${!_cliLetra}">Todos</button>`
    + LETRAS.map(l=>{ const n = porLetra.get(l)||0;
      return `<button type="button" class="cli-az-l${_cliLetra===l?" on":""}" data-letra="${l}" aria-pressed="${_cliLetra===l}" ${n?"":"disabled"} title="${n} cliente${n===1?"":"s"}">${l}</button>`; }).join("");
  if(az) az.querySelectorAll("[data-letra]").forEach(b=>b.onclick=()=>escolherLetra(b.dataset.letra));
  const semTel = todos.filter(semTelefone), bt = document.getElementById("cli-semtel");
  if(bt){ bt.textContent = `Sem telefone (${semTel.length})`; bt.classList.toggle("on", _cliSemTel); bt.setAttribute("aria-pressed", _cliSemTel); }
  const achados = (_cliSemTel ? semTel : todos).filter(c=>!q || (()=>{ const n = dsa(c.nome);
      return partes.every(p=>n.includes(p)) || (dig.length>=3 && (String(c.cpf||"").includes(dig) || String(c.telefone||"").replace(/\D/g,"").includes(dig))); })())
    .filter(c=>q || !_cliLetra || letraDoNome(c.nome)===_cliLetra);
  if(_cliSemTel) achados.sort((a, b)=>temCasoAberto(b) - temCasoAberto(a));   // estável: dentro de cada grupo, a ordem do nome
  const MAX = 200, l = document.getElementById("cli-todos-l"); if(!l) return;
  // sem filtro, a lista ganha o separador de cada letra
  let antes = "";
  l.innerHTML = achados.slice(0, MAX).map(c=>{ const le = letraDoNome(c.nome), sep = !q && !_cliSemTel && le!==antes ? `<li class="cli-letra" id="cli-letra-${le==="#"?"outros":le}">${le}</li>` : ""; antes = le;
    const u = c.foto_url && zapFotos.get(c.foto_url);
    return `${sep}<li><button type="button" class="cli-todos-it" data-cli="${c.id}">${u
      ? `<img class="avatar foto-zap" src="${esc(u)}" alt="">` : `<span class="avatar" style="--av:${corDoNome(c.nome)}"${c.foto_url?` data-foto="${esc(c.foto_url)}"`:""}>${esc(c.nome[0])}</span>`}
    <span class="cli-todos-tx">${(([cl, rot])=>`<b><span class="cli-sit ${cl}" title="${rot}"></span>${esc(c.nome)}</b>
    <span><em class="cli-sit-t ${cl}">${rot}</em> · `)(situacaoDaLista(c))}${cpfMascarado(c.cpf)}${c.telefone?` · ${esc(fmtTelBR(c.telefone))}`:""}${_cliSemTel && temCasoAberto(c)?` · <em class="cli-aberto">caso aberto</em>`:""}</span></span></button>${_cliSemTel
      ? `<span class="cli-tel-form"><input data-tel="${c.id}" inputmode="tel" placeholder="(16) 9____-____" aria-label="telefone de ${esc(c.nome)}">
         <button type="button" class="btn-mini" data-salvatel="${c.id}">Guardar</button></span>` : ""}</li>`; }).join("")
    || `<li class="meio-sub">Ninguém com “${esc(_cliFiltro)}”.</li>`;
  document.getElementById("cli-todos-n").textContent = achados.length > MAX
    ? `Mostrando ${MAX} de ${achados.length}: escolha a letra ou digite mais para achar.` : (_cliLetra && !q ? `${achados.length} na letra ${_cliLetra}.` : "");
  l.querySelectorAll("[data-cli]").forEach(b=>b.onclick=()=>abrirFicha(b.dataset.cli));
  l.querySelectorAll("[data-salvatel]").forEach(b=>b.onclick=()=>completarTelefone(b.dataset.salvatel));
  l.querySelectorAll("[data-tel]").forEach(i=>i.onkeydown=e=>{ if(e.key==="Enter") completarTelefone(i.dataset.tel); });
  // a foto do WhatsApp (clientes.foto_url) entra depois, no lugar da inicial, sem repintar a lista
  if(l.querySelector("[data-foto]")) assinarFotosZap(achados.slice(0, MAX)).then(()=>l.querySelectorAll("[data-foto]").forEach(a=>{
    const u = zapFotos.get(a.dataset.foto); if(u) a.outerHTML = `<img class="avatar foto-zap" src="${esc(u)}" alt="">`; }));
}
// 11.93 · DAD-12: o número do menu é o da tela: as futuras e as passadas sem confirmação de caso aberto
function quantasPericias(){ const hj = hoje();
  return D.eventos.filter(e=>e.status==="agendada" && (dataSP(e.data_hora)>=hj || (k=>!!k && k.fase!=="encerrado")(D.casoPorId.get(e.caso_id)))).length; }
function renderAgenda(){
  tituloLista("🩺 Perícias & Audiências");
  document.getElementById("sub-lista").textContent="Agenda estruturada — adicione novas pela ficha do cliente.";
  const evs=D.eventos.slice().sort((a,b)=>a.data_hora<b.data_hora?-1:1), hj=hoje();
  const fut=evs.filter(e=>dataSP(e.data_hora)>=hj && e.status!=="cancelada");
  // F236 · a que passou e segue "agendada" (de caso aberto) sai das passadas e pergunta "aconteceu?"
  const vivo=e=>{ const k=D.casoPorId.get(e.caso_id); return !!k && k.fase!=="encerrado"; };
  const conf=evs.filter(e=>dataSP(e.data_hora)<hj && e.status==="agendada" && vivo(e)).reverse();
  const pas=evs.filter(e=>dataSP(e.data_hora)<hj && !conf.includes(e)).reverse().slice(0,60);
  const proc=periciasDoProcesso(D.novid||[]);
  const bloco=e=>{
    const k=D.casoPorId.get(e.caso_id), c=k&&D.cliPorId.get(k.cliente_id), passou=dataSP(e.data_hora)<hj, pend=conf.includes(e);
    return `<div class="evento ${passou?"passado":"futuro"}${pend?" confirmar":""}${e.status==="cancelada"?" cancelada":""}" data-cli="${c?c.id:""}" style="cursor:pointer">
      <div class="data-box">${fmtTS(e.data_hora).slice(0,5)}<small>${dataSP(e.data_hora).slice(0,4)}</small><small>${horaSP(e.data_hora)}</small></div>
      <div class="oque"><strong>${esc(e.tipo)}: ${esc(c?c.nome:"?")}</strong>
        <span>${esc([e.local,e.obs].filter(Boolean).join(" · "))} · ${esc(pend?"aconteceu? confirme":nomeStatusEvento(e.status))}${/* F236 · faltam N dias */""}${!passou && e.status==="agendada" ? ` · ${(n=>n===0?"hoje":n===1?"amanhã":`faltam ${n} dias`)(diasAte(dataSP(e.data_hora)))}` : ""}</span></div>
      ${pend ? botoesDoPassado(e, "event.stopPropagation();")
        : passou || e.status!=="agendada" || !pedeAviso(e) ? ""
        : evAvisado(e) ? `<span class="chip neutro" title="o cliente já foi avisado deste agendamento">📞 avisado ✓</span>`
        : c&&c.telefone?`<a class="chip per" href="https://wa.me/55${c.telefone.replace(/\D/g,"")}" target="_blank" rel="noopener" onclick="event.stopPropagation()">💬 avisar cliente</a>`:""}
    </div>`;
  };
  const blocoProc=({a, k, ev})=>{ const c=D.cliPorId.get(k.cliente_id);
    return `<div class="evento confirmar" data-cli="${c?c.id:""}" style="cursor:pointer">
      <div class="data-box">${fmt(ev.data).slice(0,5)}<small>${ev.data.slice(0,4)}</small><small>${ev.hora}</small></div>
      <div class="oque"><strong>${esc(ev.tipo)}: ${esc(c?c.nome:"?")}</strong>
        <span>${esc([localNoTexto(a.texto), "marcada no processo, ainda sem agendamento nem aviso ao cliente"].filter(Boolean).join(" · "))}</span></div>
      <button class="btn-mini" onclick="event.stopPropagation();periciaRapida(${segRegistrar(a.caso_id, a.texto, a.id)})"
        title="agenda na aba 🩺, com o aviso ao cliente hoje e a mensagem da véspera"><span aria-hidden="true">🩺 Agendar</span><span class="sr-only">🩺 agendar com aviso</span></button>
    </div>`; };
  document.getElementById("conteudo-meio").innerHTML =
    (proc.length?`<h3 class="secao">Marcadas nos processos, sem agendamento (${proc.length})</h3>`+proc.map(blocoProc).join(""):"")
    +`<h3 class="secao">Próximas (${fut.length})</h3>`+(fut.map(bloco).join("")||"<p class='meio-sub'>Nenhuma futura.</p>")
    +(conf.length?`<h3 class="secao">Aconteceu? Confirme (${conf.length})</h3>`+conf.map(bloco).join(""):"")
    +`<h3 class="secao">Passadas recentes</h3>`+pas.map(bloco).join("");
  document.querySelectorAll(".evento[data-cli]").forEach(el=>el.onclick=()=>{ if(el.dataset.cli) abrirFicha(el.dataset.cli); });
}

// ── 📅 Calendário (o mês inteiro numa tela, como a agenda do Google) ──────
// Junta tudo o que tem data: lembrete de processo, perícia/audiência, tarefa
// com prazo e o aviso de aposentadoria: cada tipo na sua cor, para bater o
// olho e saber o que é. O de aposentadoria é verde e é o único que não vem
// de uma pendência: é oportunidade, não prazo.
const TIPOS_CAL = {
  apos:    {cor:"#1E6F50", fundo:"#E8F4EC", icone:"🎂", nome:"Aposentadoria"},
  lembre:  {cor:"#2B5FC7", fundo:"#E7EEFB", icone:"🗓", nome:"Lembrete do processo"},
  evento:  {cor:"#5C2E91", fundo:"#F0E9F8", icone:"🩺", nome:"Perícia / audiência"},
  tarefa:  {cor:"#5B6069", fundo:"#ECEDEF", icone:"📋", nome:"Tarefa"},
  exig:    {cor:"#B3261E", fundo:"#FBE9E9", icone:"⚠", nome:"Exigência do INSS"},
  // o CadÚnico é o único que sobrevive ao encerramento do caso, e por isso
  // tem cor só dele: não se confunde com prazo nosso nenhum
  cadunico:{cor:"#A5187F", fundo:"#FBE9F5", icone:"🧓", nome:"CadÚnico (LOAS idoso)"},
  dcb:     {cor:"#C2410C", fundo:"#FDEBDD", icone:"⏳", nome:"DCB: cessação do benefício"},
  prorrog: {cor:"#B4530A", fundo:"#FBEEE1", icone:"🔁", nome:"Pedir prorrogação"},
  // F236 · PRAZO: o do tribunal (PJe, eproc, e-SAJ) e o de recorrer (30 dias da decisão), os que não
  // se podem perder, em vermelho e numa cor só
  prazo:   {cor:"#8E1B16", fundo:"#FBE4E2", icone:"⏰", nome:"Prazo (fatal, tribunal e recurso)"},
  // F236 · o atendimento presencial da agenda de quarta
  atend:   {cor:"#0E5C58", fundo:"#E6F0EF", icone:"🤝", nome:"Atendimento presencial"},
};
let calMes = null;                              // "AAAA-MM"; nulo = mês de hoje
function mesAtual(){ return calMes || hoje().slice(0,7); }
function itensDoCalendario(){
  const it=[];
  const push=(dia,tipo,texto,cliId,extra)=>{ if(dia) it.push({dia,tipo,texto,cliId,...extra}); };
  ativos().forEach(k=>{
    const c=D.cliPorId.get(k.cliente_id); if(!c || foraDoFluxo(k)) return;   // F236 · a lista pessoal do To Do não é agenda do escritório
    // F236 · o prazo fatal é prazo, e não lembrete: vai na cor dos prazos (era o azul do lembrete); no dia de um prazo que o
    // CRM já conhece (recorrer até, exigência) é um item só, como no quadro do caso e no Planejado
    const rec = recorrerAte(k), igual = !k.prazo ? "" : rec===k.prazo ? "rec" : k.exigencia_prazo===k.prazo ? "exig" : "";
    // F450 · o retorno e a volta à fila se arrastam a outro dia; o prazo fatal, arrastado, abre a janela do prazo
    const desp = (k.ronda||{}).despacho, pz = {pz:{casoId:k.id}};
    if(k.prazo && !igual) push(k.prazo, prazoEhRetorno(k) ? "lembre" : "prazo",
      `${c.nome}: ${k.lembrar_motivo||tituloCaso(k)} (${prazoEhRetorno(k) ? "retorno" : "prazo fatal"})`, c.id,
      prazoEhRetorno(k) ? {mov:{k, selo: desp && desp.prazo===k.prazo ? "Volta à fila" : "Retorno"}} : pz);
    if(k.exigencia_prazo) push(k.exigencia_prazo,"exig",`${c.nome}: exigência vence${igual==="exig"?" (prazo fatal)":""}`,c.id,pz);
    if(k.dcb && !k.dcb_prorrogacao_pedida){
      push(k.dcb,"dcb",`${c.nome}: benefício cessa (pedir prorrogação)`,c.id);
      // a data de PEDIR vem antes da data de cessar: é ela que salva o cliente.
      // F115 · existe sempre que existe DCB, preenchida ou não
      push(prorrogarEm(k),"prorrog",`${c.nome}: já dá para pedir a prorrogação`,c.id);
    }
    if(rec) push(rec,"prazo",`${c.nome}: último dia para recorrer${igual==="rec"?" (prazo fatal)":""}`,c.id,pz);
    // F236 · o prazo do tribunal com fim (ou a ciência tácita) entra no dia em que cobra
    (k.prazos_tribunal||[]).forEach(p=>{ const d=dataDoPrazo(p);
      if(d && !(p.fim && p.fim===k.prazo) && !respostaAoPrazo(k, p)) push(d,"prazo",`${c.nome}: ${ROT_PRAZO[p.sistema]||p.sistema||"tribunal"}: ${p.ato||"intimação"}${p.situacao==="findo"?" (venceu sem resposta)":""}`,c.id,pz); });
  });
  (D.clientes||[]).forEach(c=>{ const a=(c.campos||{}).agenda_quarta;
    if(a && a.data) push(a.data,"atend",`${c.nome}: atendimento presencial`,c.id,{hora:a.inicio||""}); });
  (D.eventos||[]).filter(e=>e.status!=="cancelada").forEach(e=>{
    const k=D.casoPorId.get(e.caso_id), c=k&&D.cliPorId.get(k.cliente_id);
    push(dataSP(e.data_hora),"evento",`${e.tipo}: ${c?c.nome:"?"}`,c?c.id:null,
         {hora:horaSP(e.data_hora)});
  });
  (D.tarefas||[]).filter(t=>!t.concluida && t.prazo).forEach(t=>{
    const k=t.caso_id&&D.casoPorId.get(t.caso_id), c=D.cliPorId.get(t.cliente_id||(k&&k.cliente_id));
    push(t.prazo,"tarefa",`${c?c.nome+": ":""}${t.titulo}`,c?c.id:null,{mov:{t}}); });   // F236 · de quem é a tarefa
  // tarefas dos comentários: o lembrete de cada pessoa, com a inicial dela —
  // duas pessoas no mesmo comentário com datas diferentes são DOIS itens
  [...(D.tarefasPorCaso||new Map()).values()].flat().forEach(t=>{
    const k=D.casoPorId.get(t.caso_id); if(!k||k.fase==="encerrado"||foraDoFluxo(k)) return;
    const c=D.cliPorId.get(k.cliente_id), co=D.colPorId.get(t.colaborador_id);
    // F236 · o que a pessoa tem de fazer, e não só "(tarefa)"
    push(t.lembrar_em,"lembre",`${co?co.inicial+": ":""}${c?c.nome:"?"}: ${resumoAgenda(textoDoAndamento(t.andamento_id), co)||"tarefa"}`,c?c.id:null,
      t.natureza==="fatal" ? {pz:{casoId:k.id}} : t.concluida_em ? {} : {mov:{tc:t}});
  });
  // CadÚnico: percorre TODOS os casos, encerrados inclusive
  (D.casos||[]).forEach(k=>{
    const c=D.cliPorId.get(k.cliente_id);
    if(!c || !ehLoas(k)) return;
    const venc=renovaCadunico(k);
    if(venc) push(venc,"cadunico",`${c.nome}: renovar CadÚnico`,c.id);
  });
  lembretesApos().forEach(a=>
    push(a.aviso,"apos",`${a.cliente.nome}: ${a.especie} em ${fmt(a.data)}`,a.cliente.id,
         {automatica:a.automatica}));
  return it;
}
const MESES_NOME = ["janeiro","fevereiro","março","abril","maio","junho","julho",
  "agosto","setembro","outubro","novembro","dezembro"];
// um dia, três dias ou o mês inteiro: "hoje" precisava ser uma visão, não um
// botão que devolve ao mês corrente e parece não fazer nada quando já se está nele
let calVisao = ler("crm_cal_visao") || "mes";
let calFiltro = null;                           // um tipo por vez, ou tudo
function irVisaoCal(v){
  calVisao=v; guardar("crm_cal_visao",v);
  // "Hoje" é a âncora: volta o mês para o corrente, senão trocar para Mês
  // depois devolveria a novembro de 2028 e pareceria que o botão não fez nada
  if(v!=="mes") calMes=null;
  render();
}
function filtrarCal(t){ calFiltro = (calFiltro===t) ? null : t; render(); }
let _calIt = [];   // F450 · os itens arrastáveis do mês, pelo índice do data-ci
function itemCal(i){
  const t=TIPOS_CAL[i.tipo], arr = calVisao==="mes" && (i.mov || i.pz) ? _calIt.push(i)-1 : -1;
  return `<div class="cal-it${arr>=0?" cal-arr":""}" style="background:${t.fundo};border-left-color:${t.cor}"
    ${i.cliId?`data-cli="${i.cliId}"`:""}${arr>=0?` draggable="true" data-ci="${arr}"`:""} title="${esc(t.nome)}: ${esc(i.texto)}${arr>=0?(i.mov?" · arraste a outro dia para mudar a data":" · arraste para abrir o prazo"):""}">
    ${t.icone} ${i.hora?`<b>${i.hora}</b> `:""}${esc(i.texto)}</div>`;
}
function renderCalendario(){
  tituloLista("📅 Calendário");
  document.getElementById("sub-lista").textContent=
    "Tudo o que tem data. Cada cor é um tipo — clique numa cor para ver só ela.";
  let itens=itensDoCalendario();
  if(calFiltro) itens=itens.filter(i=>i.tipo===calFiltro);
  buscarTextosAgenda([...(D.tarefasPorCaso||new Map()).values()].flat().map(t=>t.andamento_id));   // F236 · o texto das tarefas
  const ordena=a=>a.sort((x,y)=>(x.hora||"99")<(y.hora||"99")?-1:1);
  const porDia=new Map();
  itens.forEach(i=>{ if(!porDia.has(i.dia)) porDia.set(i.dia,[]); porDia.get(i.dia).push(i); });

  const legenda=Object.entries(TIPOS_CAL).map(([id,t])=>
    `<button class="cal-leg ${calFiltro===id?"on":""}" onclick="filtrarCal('${id}')"
      title="ver só ${esc(t.nome.toLowerCase())}"><i style="background:${t.cor}"></i>${t.icone} ${t.nome}</button>`).join("")
    + (calFiltro?`<button class="cal-leg limpar" onclick="filtrarCal('${calFiltro}')" title="✕ ver tudo"><span aria-hidden="true">✕ Tudo</span><span class="sr-only">✕ ver tudo</span></button>`:"");
  const abas=[["hoje","Hoje"],["3dias","Próximos 3 dias"],["mes","Mês"]].map(([v,r])=>
    `<button class="cal-aba ${calVisao===v?"on":""}" onclick="irVisaoCal('${v}')">${r}</button>`).join("");

  let corpo="", barra="", quantos=0;
  _calIt = [];
  if(calVisao==="mes"){
    const mes=mesAtual(), [ano,mm]=mes.split("-").map(Number);
    const doMes=itens.filter(i=>i.dia.slice(0,7)===mes); quantos=doMes.length;
    const primeiro=new Date(ano, mm-1, 1, 12), ultimo=new Date(ano, mm, 0, 12);
    const vizinho=n=>{ const d=new Date(ano, mm-1+n, 1, 12);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };
    const anoHoje=+hoje().slice(0,4);
    const anos=[]; for(let a=anoHoje-3; a<=anoHoje+8; a++) anos.push(a);
    if(!anos.includes(ano)) anos.unshift(ano);
    barra=`<button class="btn-mini" onclick="irMes('${vizinho(-1)}')" title="mês anterior">‹</button>
      <select id="cal-mes-sel" title="escolher o mês">${MESES_NOME.map((n,j)=>
        `<option value="${j+1}" ${j+1===mm?"selected":""}>${n[0].toUpperCase()+n.slice(1)}</option>`).join("")}</select>
      <select id="cal-ano-sel" title="escolher o ano">${anos.sort((a,b)=>a-b).map(a=>
        `<option value="${a}" ${a===ano?"selected":""}>${a}</option>`).join("")}</select>
      <button class="btn-mini" onclick="irMes('${vizinho(1)}')" title="próximo mês">›</button>
      <strong class="cal-mes">${MESES_NOME[mm-1][0].toUpperCase()+MESES_NOME[mm-1].slice(1)} de ${ano}</strong>`;
    const cels=[];
    for(let i=0;i<primeiro.getDay();i++) cels.push(`<div class="cal-dia vazio"></div>`);
    for(let d=1; d<=ultimo.getDate(); d++){
      const iso=`${mes}-${String(d).padStart(2,"0")}`;
      const dd=ordena((porDia.get(iso)||[]).slice());
      cels.push(`<div class="cal-dia ${iso===hoje()?"hoje":""}" data-dia="${iso}">
        <div class="cal-num">${d}</div>
        ${dd.slice(0,4).map(itemCal).join("")}
        ${dd.length>4?`<div class="cal-mais">+${dd.length-4} neste dia</div>`:""}
      </div>`);
    }
    corpo=`<div class="cal-grade">
      ${["dom","seg","ter","qua","qui","sex","sáb"].map(d=>`<div class="cal-cab">${d}</div>`).join("")}
      ${cels.join("")}</div>`;
  } else {
    // Hoje e Próximos 3 dias: lista por dia, com o dia por extenso
    const n = calVisao==="hoje" ? 1 : 3;
    const dias=[];
    for(let j=0;j<n;j++){ const d=new Date(hoje()+"T12:00:00"); d.setDate(d.getDate()+j);
      dias.push(d.toLocaleDateString("sv")); }
    quantos=dias.reduce((s,d)=>s+(porDia.get(d)||[]).length,0);
    barra=`<strong class="cal-mes">${calVisao==="hoje"?"Hoje":"De hoje a "+fmt(dias[dias.length-1])}</strong>`;
    corpo=`<div class="cal-dias">${dias.map(iso=>{
      const dd=ordena((porDia.get(iso)||[]).slice());
      const rot=new Date(iso+"T12:00:00").toLocaleDateString(IDIOMA,{weekday:"long",day:"numeric",month:"long"});
      return `<div class="cal-bloco ${iso===hoje()?"hoje":""}">
        <div class="cal-bloco-cab">${iso===hoje()?"Hoje · ":""}${rot}</div>
        ${dd.length ? dd.map(itemCal).join("")
          : `<p class="meio-sub" style="margin:0">Nada marcado neste dia.</p>`}
      </div>`; }).join("")}</div>`;
  }

  // F67 · o banner da desconfiança: agendamentos futuros que nasceram de
  // texto SEM palavra de agendamento — provável fantasma do leitor antigo
  const susp=evSuspeitos();
  const banner=!susp.length?"":`<div class="cal-susp">
    <strong>🕵️ ${susp.length} agendamento(s) para conferir</strong> — nasceram
    de um comentário que não fala em "agendada/marcada"; podem ser fantasmas
    do leitor antigo (ex.: data passada empurrada para o ano seguinte).
    ${susp.sort((a,b)=>a.data_hora<b.data_hora?-1:1).map(e=>{
      const k=D.casoPorId.get(e.caso_id), c=k&&D.cliPorId.get(k.cliente_id);
      return `<div class="cal-susp-linha">
        <b>${fmt(dataSP(e.data_hora))}</b> · ${esc(e.tipo||"Perícia")} ·
        <a onclick="abrirFicha('${c?c.id:""}')">${c?esc(c.nome):"?"}</a>
        <span class="meio-sub">“${esc((e.obs||"").slice(0,90))}”</span>
        <button class="btn-mini" onclick="cancelarEvento('${e.id}')"
          title="nunca existiu — cancela e some das listas">✕ fantasma</button>
        <button class="btn-mini" onclick="manterEvento('${e.id}')"
          title="existe mesmo — confirma e para de desconfiar"><span aria-hidden="true">✔ Real</span><span class="sr-only">✔ é real</span></button>
      </div>`; }).join("")}</div>`;
  document.getElementById("conteudo-meio").innerHTML=`
    <div class="cal-abas">${abas}</div>
    <div class="cal-topo">${barra}
      <span class="meio-sub" style="margin-left:auto">${quantos} compromisso(s)${
        calFiltro?` · só ${esc(TIPOS_CAL[calFiltro].nome.toLowerCase())}`:""}</span>
    </div>
    <div class="cal-legenda">${legenda}</div>
    ${banner}${corpo}`;
  const ms=document.getElementById("cal-mes-sel"), as=document.getElementById("cal-ano-sel");
  if(ms) ms.onchange=as.onchange=()=>irMes(`${as.value}-${String(ms.value).padStart(2,"0")}`);
  document.querySelectorAll(".cal-it[data-cli]").forEach(el=>
    el.onclick=()=>abrirFicha(el.dataset.cli));
  ligarArrastoCal();
}
