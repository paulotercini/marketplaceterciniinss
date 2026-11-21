async function novaRotina(){
  const titulo=document.getElementById("rt-titulo").value.trim();
  if(!titulo) return aviso("Escreva o que precisa ser feito");
  const q=document.getElementById("rt-quando").value;
  const corpo={titulo, detalhe:document.getElementById("rt-detalhe").value.trim()||null,
    responsavel_id:document.getElementById("rt-resp").value||null,
    dias_semana: q==="dia"||q==="mes" ? [] : (q==="uteis" ? [1,2,3,4,5] : [+q]),
    dia_mes: q==="mes" ? +document.getElementById("rt-diames").value : null};
  try{
    const [r]=await api(`/rest/v1/rotinas`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify(corpo)});
    if(r) (D.rotinas=D.rotinas||[]).push(r);
  }catch(e){ return aviso("Rode o schema.sql mais novo no Supabase para usar a rotina"); }
  aviso("🔁 Rotina criada — aparece no Meu Dia no dia programado");
  montarSidebar(); render();
}
async function apagarRotina(id){
  if(!await confirmar("Tirar esta tarefa da rotina?")) return;
  await api(`/rest/v1/rotinas?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({ativo:false})});
  D.rotinas=(D.rotinas||[]).filter(r=>r.id!==id);
  aviso("Rotina removida"); montarSidebar(); render();
}

// ── qual processo? ────────────────────────────────────────────────────────
// Cliente com mais de um processo em aberto: antes de abrir a ficha, uma
// janela bloqueia o fundo e pede a escolha. É o que evita o pior erro do
// dia a dia — escrever o andamento no processo errado.
// F308 · A ESCOLHA DIZ QUAL É QUAL (decisão do Paulo, 30.10.2026): o mesmo cliente tem dois ou três casos do
// mesmo auxílio, e o título igual não separava um do outro. Os casos do mesmo NB ficam juntos, o mais adiantado
// primeiro; cada cartão diz onde corre, as datas que o identificam, a etapa, o próximo passo, o último andamento
// por extenso e quem cuida, com o botão do portal, que abre o processo sem escolher o caso. O ✎ dá um nome
// próprio ao caso (casos.apelido). As teclas 1 a 9 escolhem.
function nbDaEscolha(k, ev){
  const nb = nbsDoCaso(k).map(soDig).find(x=>x.length===10); if(nb) return nb;
  const n = numerosDoCaso(k);
  for(const t of ["proc","nup","prot"]) for(const d of n[t]){ const r = nbDoNumero(ev, t, d); if(r && r.nb) return r.nb; }
  return "";
}
function ondeCorre(k){
  const fe = faseEfetiva(k), jud = dadosJudiciais(k), just = justicaDoNumeroCnj(k.processo);
  if(fe==="judicial" || fe==="pagamento" || (jud && jud.orgao))
    return (jud && jud.orgao) || (just==="estadual" ? "Justiça Estadual de SP" : just==="federal" ? "Justiça Federal da 3ª Região" : "");
  if(fe==="conselho") return "Conselho de Recursos";
  return "";
}
function tituloDaEscolha(k){
  if(k.apelido) return k.apelido;
  const t = tituloCaso(k);
  return t==="Benefício não definido" && justicaDoNumeroCnj(k.processo)==="estadual" ? "Ação na Justiça Estadual, espécie não definida" : t;
}
function cartaoEscolha(cliId, k, i, meu, destaque, nb){
  const fe = faseEfetiva(k), hj = hoje();
  const datas = [k.der && `DER ${fmtBarra(k.der)}`, k.dib && `DIB ${fmtBarra(k.dib)}`, k.dcb && `DCB ${fmtBarra(k.dcb)}`,
    k.ajuizado_em && `Ajuizado ${fmtBarra(String(k.ajuizado_em).slice(0,10))}`].filter(Boolean);
  const velha = (trilhaDe(k)||{}).velha;
  const prox = proximosDoCaso(k)[0];
  const volta = k.prazo && ((k.ronda||{}).despacho||{}).prazo===k.prazo;
  const venc = k.prazo && k.prazo<hj;
  const selo = !k.prazo ? "" : volta || prazoEhRetorno(k)
    ? `<span class="esc-prz fila">${volta ? "volta à fila" : "retorno"} ${fmtBarra(k.prazo)}${venc?(volta?" · vencida":" · vencido"):""}</span>`
    : `<span class="esc-prz fatal${venc?" venc":""}" title="${esc(k.lembrar_motivo||"")}">prazo ${fmtBarra(k.prazo)}${venc?" · vencido":""}</span>`;
  const a = (D._andsFicha||[]).filter(x=>x.caso_id===k.id).sort((x,y)=>String(y.criado_em).localeCompare(String(x.criado_em)))[0];
  const quemAnd = a && (a.autor_id ? ((D.colPorId.get(a.autor_id)||{}).nome||"").split(" ")[0]
    : /^(PJe|eproc|e-SAJ)/.test(a.texto||"") ? sisCurtoDoMov(a) : ({pat:"PAT", crps:"e-Recursos", dou:"DOU"}[a.origem] || "portal"));
  const txtAnd = a ? String(a.texto||"").replace(/^(PJe|eproc TJSP|e-SAJ TJSP)\s*\([^)]*\)\s*:?\s*/,"").split("\n")[0] : "";
  const quem = donosDoCaso(k).map(id=>((D.colPorId.get(id)||{}).nome||"").split(" ")[0]).filter(Boolean).join(", ");
  const avisos = ["proc","nup","prot"].map(t=>avisoNumeroFora(k, t)).join("")
    + (!k.especie && !k.beneficio ? `<div class="num-fora" role="note"><span>Espécie não definida${justicaDoNumeroCnj(k.processo)==="estadual" ? ": o número 8.26 indica a Justiça Estadual, onde corre a ação acidentária" : ""}. Defina na ficha do caso.</span></div>` : "");
  const portal = acessosDoCaso(k).atual.join("");
  const faseCls = fe==="judicial" || fe==="pagamento" ? "jud" : fe==="conselho" ? "cons" : "inss";
  const urg = venc && !volta && !prazoEhRetorno(k);
  return `<div class="proc-op esc-caso ${faseCls}${destaque?" esc-meu":""}" data-caso="${k.id}" onclick="if(!event.target.closest('a,button,input'))escolhido('${cliId}','${k.id}')">
    <div class="esc-cab">
      <div class="esc-l0"><span class="esc-tecla" aria-hidden="true">${i<9?i+1:""}</span><span class="esc-nb"${nb&&nb.tit?` title="${esc(nb.tit)}"`:""}>${nb&&nb.nb?`NB ${esc(fmtNb(nb.nb))}`:"Sem NB"}</span></div>
      <span class="esc-fase ${faseCls}">${esc(NOME_FASE[fe]||fe||"")}</span>${ondeCorre(k)?`<span class="esc-onde">${esc(ondeCorre(k))}</span>`:""}
      <div class="proc-nome esc-tit" data-tit="${k.id}">${esc(tituloDaEscolha(k))}<button type="button" class="esc-ed" onclick="nomearCaso('${cliId}','${k.id}')" title="dar um nome próprio a este caso" aria-label="dar um nome próprio a este caso">✎</button></div>
      <span class="esc-voce">${meu?`você escreveu aqui em ${fmtTS(meu)}`:""}</span>
    </div>
    <div class="esc-cel"><span class="esc-rot">Agora</span>${prox?`<div class="esc-agora${urg?" venc":""}">${esc(prox.txt)}</div>`:selo?"":`<span class="esc-ult">sem próximo passo</span>`}${selo}${k.exigencia_prazo?`<div>${chipExig(k)}</div>`:""}</div>
    <div class="esc-cel"><span class="esc-rot">Etapa</span>${k.etapa?esc(k.etapa):`<span class="esc-ult">sem etapa</span>`}${velha?`<span class="esc-velha">desatualizada</span>`:""}</div>
    <div class="esc-cel"><span class="esc-rot">Datas</span><span class="proc-sub esc-datas">${datas.length?datas.map(d=>`<span>${esc(d)}</span>`).join(""):"sem datas"}</span></div>
    <div class="esc-cel"><span class="esc-rot">Último</span><span class="esc-ult">${a?`${fmtBarra(dataSP(a.criado_em))}, ${esc(quemAnd)}<span class="esc-ult-txt">: ${esc(txtAnd)}</span>`:"sem andamento"}</span></div>
    <div class="esc-avisos">${avisos}</div>
    <div class="esc-pe">${quem?`<span class="esc-resp">com ${esc(quem)}</span>`:""}${portal}
      <button type="button" class="btn-mini forte esc-abrir" onclick="escolhido('${cliId}','${k.id}')" title="Abrir este caso">Abrir<span class="sr-only"> este caso</span></button></div>
  </div>`;
}
function escolherProcesso(cliId, ativos){
  const c=D.cliPorId.get(cliId)||{}, ev = evidenciaNbs(ativos);
  const incap = (()=>{ try{ return linhaIncapacidade(cliId); }catch(e){ return []; } })();
  const grupos = new Map();
  for(const k of ativos){ const nb = nbDaEscolha(k, ev), ch = nb || "sem";
    if(!grupos.has(ch)) grupos.set(ch, {nb, ks:[]}); grupos.get(ch).ks.push(k); }
  const peso = k => ORDEM_FASE_ORG[faseEfetiva(k)] || 0;
  for(const g of grupos.values()) g.ks.sort((a,b)=>peso(b)-peso(a));
  const lista = [...grupos.values()].sort((a,b)=>(!a.nb)-(!b.nb) || peso(b.ks[0])-peso(a.ks[0]));
  const ordem = lista.flatMap(g=>g.ks);
  // o caso em que eu escrevi por último fica marcado: em regra é o que se procura
  const minhas = new Map(); for(const a of (D._andsFicha||[])) if(a.autor_id===eu.id && ordem.some(k=>k.id===a.caso_id))
    if(!minhas.has(a.caso_id) || a.criado_em>minhas.get(a.caso_id)) minhas.set(a.caso_id, a.criado_em);
  const meuId = ([...minhas].sort((a,b)=>String(b[1]).localeCompare(String(a[1])))[0]||[])[0];
  // o grupo do NB vira o rótulo da coluna: espécie, período e situação no title
  const nbDe = g => { if(!g.nb) return null;
    const r = incap.find(x=>x.nb===g.nb), esp = String((g.ks.find(k=>k.especie)||{}).especie||"");
    const per = r&&(r.ini||r.dcb) ? (r.ini && (!r.dcb || r.ini<=r.dcb) ? `${fmtBarra(r.ini)} a ${r.dcb?fmtBarra(r.dcb):"hoje"}` : `DCB ${fmtBarra(r.dcb)}`) : "";
    return {nb:g.nb, tit:[esp&&(nomeDaEspecie(esp)||esp), per, r&&r.sit].filter(Boolean).join(" · ")}; };
  let i = 0;
  document.getElementById("modal").innerHTML=`
    <div class="modal-fundo" onclick="event.stopPropagation()">
      <div class="modal-cx esc-cx" role="dialog" aria-labelledby="esc-t">
        <div class="modal-cab">
          <div id="esc-t"><strong>${esc(c.nome||"Cliente")}</strong> <span class="meio-sub">tem ${ativos.length} casos em aberto</span>
            <div class="esc-tit-sub">Em qual caso registrar?</div></div>
          <button class="btn-mini" onclick="fecharEscolha()" title="voltar para a lista">✕</button>
        </div>
        <div class="esc-cols">${lista.map(g=>{ const nb = nbDe(g); return g.ks.map(k=>cartaoEscolha(cliId, k, i++, minhas.get(k.id) || null, meuId===k.id, nb)).join(""); }).join("")}</div>
        <div class="proc-org"><span class="meio-sub">${ordem.length<10?`Teclas 1 a ${ordem.length} escolhem o caso.`:""}</span><button class="btn-mini" onclick="fecharEscolha();abrirOrganizar('${cliId}')"
          title="levar NB, protocolo, recurso e processo ao caso certo, ou juntar os casos que são o mesmo benefício">⇄ Organizar<span class="sr-only"> os números destes casos</span></button></div>
      </div>
    </div>`;
  document.getElementById("modal").style.display="block";
  _escOrdem = [cliId, ordem.map(k=>k.id)];
}
let _escOrdem = null;
document.addEventListener("keydown", e=>{
  const m = document.getElementById("modal");
  if(!_escOrdem || !m || m.style.display==="none" || !m.querySelector(".esc-caso") || e.ctrlKey || e.metaKey || e.altKey) return;
  if(/^(INPUT|TEXTAREA|SELECT)$/.test((e.target||{}).tagName||"")) return;
  const id = _escOrdem[1][+e.key-1];
  if(/^[1-9]$/.test(e.key) && id){ e.preventDefault(); escolhido(_escOrdem[0], id); }
});
function nomearCaso(cliId, casoId){
  const k = D.casoPorId.get(casoId), alvo = document.querySelector(`[data-tit="${casoId}"]`); if(!k || !alvo) return;
  alvo.innerHTML = `<input class="esc-nome" maxlength="80" placeholder="${esc(tituloCaso(k))}" value="${esc(k.apelido||"")}" aria-label="nome próprio do caso">
    <button type="button" class="btn-mini forte">Gravar</button>`;
  const inp = alvo.querySelector("input"), grava = async ()=>{
    const v = inp.value.trim() || null;
    try{ await patchCaso(casoId, {apelido: v}); }
    catch(e){ return aviso("Não gravou: rode o crm/fase2/migracoes/f308_apelido_caso.sql no Supabase"); }
    k.apelido = v; aviso(v ? "Nome do caso gravado ✔" : "O caso voltou ao nome da espécie", false);
    escolherProcesso(cliId, _escOrdem && _escOrdem[0]===cliId ? _escOrdem[1].map(id=>D.casoPorId.get(id)).filter(Boolean) : [k]);
  };
  alvo.querySelector("button").onclick = grava;
  inp.onkeydown = e=>{ if(e.key==="Enter") grava(); };
  inp.focus();
}
function escolhido(cliId, casoId){
  casoSel = casoId; subAba = "escritorio";   // F166
  document.getElementById("modal").style.display="none";
  if(cliId===clienteAberto) repintarFicha(); else abrirFicha(cliId);
}
// Caixa modal genérica, em cima do mesmo modal da escolha de processo: uma
// pergunta no meio da tela, com o fundo escurecido.
// F135 · CONFIRMAÇÃO DENTRO DA PÁGINA. O confirm() do navegador travava a
// tela inteira, não seguia o visual e treinava a clicar OK sem ler. O
// <dialog> nativo dá Esc, foco preso e fundo esmaecido sem código extra. O
// botão diz o verbo da própria pergunta ("Apagar", "Reabrir"...).
// ponytail: sob automação (navigator.webdriver) segue o confirm() nativo,
// que as provas antigas já respondem; a prova confirmar135.js liga o novo.
function confirmar(msg){
  if(navigator.webdriver && !window.__confirmarProprio) return Promise.resolve(confirm(msg));
  const verbo=(String(msg).match(/^([A-ZÁÉÍÓÚÂÊÔÃÕ][a-zçáéíóúâêôãõ]+)\b/)||[])[1];
  const perigo=/^(Apagar|Remover|Descartar|Tirar|Cancelar|Desligar)$/.test(verbo||"");
  return new Promise(res=>{
    const d=document.createElement("dialog"); d.className="confirmar";
    d.innerHTML=`<p class="confirmar-txt"></p><form method="dialog" class="confirmar-bts">
      <button value="nao" class="btn-rap">Voltar</button>
      <button value="sim" class="btn-rap ${perigo?"perigo":"forte"}" autofocus>${verbo||"Confirmar"}</button></form>`;
    d.querySelector(".confirmar-txt").textContent=msg;
    d.addEventListener("close",()=>{ res(d.returnValue==="sim"); d.remove(); });
    document.body.appendChild(d); d.showModal();
  });
}
function caixa(html){
  setTimeout(armarVoltar, 0);   // F458
  const m = document.getElementById("modal");
  m.style.display = "";
  m.innerHTML = `<div class="modal-fundo"><div class="modal-cx">
      <div class="modal-cab"><div style="flex:1">${html}</div>
        <button class="btn-mini" onclick="fecharCaixa()" title="fechar">✕</button></div>
    </div></div>`;
}
// F161 · ✦ CLAUDE NO CASO. O botão abre o Claude (site ou aplicativo de mesa)
// com o pedido já escrito, para revisar e enviar. O link leva SÓ os ids do
// caso e do cliente: nome, CPF e texto do cliente não passam por endereço,
// que fica em histórico e em registro de servidor. O Claude busca o resto
// pelo conector CRM Tercini (crm/fase2/mcp), com o login de quem clicou.
const CLAUDE_ESTILO = "Responda em português formal, com a conclusão primeiro, em parágrafos curtos.";
const CLAUDE_ACOES = [
  ["situacao", "Situação do caso", (k)=>`Use o conector CRM Tercini. Chame ficha_cliente com cliente_id ${k.cliente_id} e, para o caso ${k.id}, anotacoes_caso, tarefas_caso e documentos_caso. Diga onde o caso está (fase e etapa), o que foi feito por último, o que está pendente e com quem, e o próximo prazo.`],
  ["cliente", "Mensagem ao cliente sobre o andamento", (k)=>`Use o conector CRM Tercini. Leia ficha_cliente com cliente_id ${k.cliente_id} e anotacoes_caso do caso ${k.id}. Redija uma mensagem curta de WhatsApp ao cliente explicando em que pé está o caso, em linguagem simples, sem prometer resultado nem prazo que o INSS ou o juízo não tenham fixado.`],
  ["decisao", "Ler a última decisão e propor o resultado", (k)=>`Use o conector CRM Tercini. Para o caso ${k.id}, liste documentos_caso e leia com ler_documento a decisão mais recente; se não houver documento, procure a decisão em anotacoes_caso. Diga o que foi decidido, a data e o prazo de recurso. Proponha o resultado e a data da decisão e só grave com atualizar_caso depois que eu confirmar.`],
  ["proximos", "Próximas providências e tarefas", (k)=>`Use o conector CRM Tercini. Leia ficha_cliente com cliente_id ${k.cliente_id}, anotacoes_caso e tarefas_caso do caso ${k.id}, e equipe. Proponha as próximas providências com responsável, data e revisor, e crie com criar_tarefa só as que eu aprovar.`],
  ["atendimento", "Registrar o atendimento de hoje", (k)=>`Use o conector CRM Tercini, caso ${k.id} (cliente_id ${k.cliente_id}). Vou relatar um atendimento. Mostre o texto da anotação antes de gravar com registrar_anotacao e proponha as tarefas que decorrem dele, criando com criar_tarefa só as que eu aprovar.\n\nRelato: `],
];
function menuClaude(casoId){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const onde = ler("crm_claude_onde") || "web";
  caixa(`<h3 style="margin:0 0 4px">✦ Claude <small class="meio-sub">· ${esc(tituloCaso(k))}</small></h3>
    <p class="meio-sub" style="margin:0">Abre o Claude com o pedido escrito. Revise e envie; nada é gravado no CRM sem a sua confirmação.</p>
    <div class="esp-lista">${CLAUDE_ACOES.map(([id,rot])=>`<button class="esp-it" onclick="abrirClaude('${casoId}','${id}')">${esc(rot)}</button>`).join("")}
      ${documentosDoCaso(k).length?`<button class="esp-it" onclick="menuClaudeDocs('${casoId}',[])" title="Pedir a partir dos documentos do caso…"><span aria-hidden="true">Sugerir…</span><span class="sr-only">Pedir a partir dos documentos do caso…</span></button>`:""}</div>
    <div class="cl-onde" role="radiogroup" aria-label="onde abrir">
      <label><input type="radio" name="cl-onde" value="web" ${onde==="web"?"checked":""} onchange="guardar('crm_claude_onde','web')"> no navegador</label>
      <label><input type="radio" name="cl-onde" value="app" ${onde==="app"?"checked":""} onchange="guardar('crm_claude_onde','app')"> no aplicativo de mesa</label>
    </div>
    <p class="cl-ajuda">Primeira vez? O Claude precisa do conector do CRM: Configurações › Conectores › Adicionar conector personalizado, nome <b>CRM Tercini</b>, endereço <span class="cop" data-cop="${esc(CLAUDE_MCP_URL())}" data-cop-msg="endereço copiado" title="clique para copiar">${esc(CLAUDE_MCP_URL())}</span>. Entre com o mesmo e-mail e senha do CRM.</p>`);
}
const CLAUDE_MCP_URL = () => CONFIG.SUPABASE_URL.replace(/\/$/,"") + "/functions/v1/mcp-crm";
function linkClaude(k, acao, onde){
  const a = CLAUDE_ACOES.find(x=>x[0]===acao); if(!a) return null;
  const q = encodeURIComponent(a[2](k) + (acao==="atendimento" ? "" : `\n\n${CLAUDE_ESTILO}`));
  return (onde==="app" ? "claude://claude.ai/new?q=" : "https://claude.ai/new?q=") + q;
}
function abrirClaude(casoId, acao){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const onde = ler("crm_claude_onde") || "web", url = linkClaude(k, acao, onde);
  if(!url) return;
  fecharCaixa();
  if(onde==="app") location.href = url;          // esquema claude:// não abre em aba nova
  else window.open(url, "_blank", "noopener");
}
function fecharCaixa(){
  setTimeout(armarVoltar, 0);   // F458
  const m = document.getElementById("modal");
  m.style.display="none"; m.innerHTML="";
}
function fecharEscolha(){
  document.getElementById("modal").style.display="none";
  casoSel=null; fecharFicha();
}

// ── ficha do cliente ──────────────────────────────────────────────────────
// F150 · os seis pedidos da ficha, num lugar só: a abertura e o
// pré-carregamento usam a mesma busca
// F204 · O DOSSIÊ É DO CPF. A extensão grava cada PDF em dossie/<cpf>/… e, rodada
// de novo, não troca o dono da linha: a ficha refeita (ou a antiga que perdeu o
// CPF) ficava com os documentos e a nova, sem nada. Abrir a ficha adota o que é
// do CPF dela e, se ela não tem o resumo dos portais, traz o da ficha anterior.
async function adotarDossie(cliId, cpf){
  cpf = digitosCpf(cpf);
  if(cpf.length!==11) return 0;
  const orf = (await todas("anexos", `select=id,cliente_id,caminho&origem=eq.dossie&caminho=like.dossie/${cpf}/*&cliente_id=neq.${cliId}&order=criado_em.desc`).catch(()=>[]))
    .filter(a=>a.cliente_id!==cliId && String(a.caminho||"").startsWith(`dossie/${cpf}/`));
  if(!orf.length) return 0;
  try{ await api(`/rest/v1/anexos?id=in.(${orf.map(a=>a.id).join(",")})`, {method:"PATCH", headers:{Prefer:"return=minimal"}, body:JSON.stringify({cliente_id:cliId})}); }
  catch(e){ console.warn("dossiê: não adotado", e); return 0; }
  const c = D.cliPorId.get(cliId);
  if(c && !Object.keys(c.dossie||{}).length){
    const [ant] = await api(`/rest/v1/clientes?select=dossie&id=eq.${orf[0].cliente_id}`).catch(()=>[]) || [];
    if(ant && ant.dossie && Object.keys(ant.dossie).length){
      await api(`/rest/v1/clientes?id=eq.${cliId}`, {method:"PATCH", headers:{Prefer:"return=minimal"}, body:JSON.stringify({dossie:ant.dossie})}).catch(()=>{});
      c.dossie = ant.dossie;
    }
  }
  return orf.length;
}
function buscarFicha(cliId, ids){
  const adot = adotarDossie(cliId, (D.cliPorId.get(cliId)||{}).cpf).catch(()=>0);
  return Promise.all([
      ids?todas("andamentos",`select=*,andamentos_lidos(colaborador_id,lido_em)&caso_id=in.(${ids})&order=criado_em.desc`)
          .catch(()=>todas("andamentos",`select=*&caso_id=in.(${ids})&order=criado_em.desc`).catch(()=>[])):[],
      todas("credenciais",`select=id,tipo,cliente_id&cliente_id=eq.${cliId}`).catch(()=>[]),
      todas("vinculos",`select=*&or=(cliente_id.eq.${cliId},ligado_a.eq.${cliId})`).catch(()=>[]),
      adot.then(()=>todas("anexos",`select=*&cliente_id=eq.${cliId}&order=criado_em.desc`)).catch(()=>[]),
      todas("conversas",`select=criado_em,texto,de_cliente&cliente_id=eq.${cliId}&order=criado_em.desc`).catch(()=>[]),
      ids?todas("andamento_tarefas",`select=*&caso_id=in.(${ids})`).catch(()=>[]):[],
      // a conversa é de um cliente só, mas quem cuida do benefício de outro
      // (a namorada, o marido) tem o número na lista dele: aparece nas duas fichas
      todas("zap_conversas",`select=id,ultima_em,ultimo_texto,nao_lidas,telefone,nome_perfil,cliente_id,foto_url,contato_nome,contato_relacao,atendente_id&or=(${
        ["cliente_id.eq."+cliId, ...(chavesDoCliente(cliId).length?[`chave.in.(${chavesDoCliente(cliId).join(",")})`]:[])].join(",")
      })&order=ultima_em.desc.nullslast`).catch(()=>[]),
      // F285 · a linha do cliente de novo: a extensão grava o dossiê e o cadastro
      // depois que o CRM carregou a lista, e a ficha mostrava o da abertura
      adot.then(()=>api(`/rest/v1/clientes?select=*&id=eq.${cliId}`)).catch(()=>[]),
      casoInteiro(...(D.casosDoCliente.get(cliId)||[])).catch(()=>{}),   // F379
    ]);
}
// F285 · só o que a extensão escreve: o resumo dos portais e os campos vazios
// do cadastro (o que se digitou na ficha e ainda não voltou do banco fica)
const CAD_DO_DOSSIE = ["dn","nome_mae","sexo","pis_nit","rg","rg_orgao","logradouro","bairro","cidade","uf","cep"];
function fundirClienteDoBanco(cliId, row){
  const v = D.cliPorId.get(cliId); if(!v || !row || row.id!==cliId) return;
  if(row.dossie && Object.keys(row.dossie).length) v.dossie = row.dossie;
  for(const k of CAD_DO_DOSSIE) if(!v[k] && row[k]) v[k] = row[k];
}
// F285 · "Atualizar dossiê" na Identificação: busca de novo o que a extensão
// gravou para o CPF (adota o que estiver preso a outra ficha), relê o texto e
// completa os campos vazios com os dados cadastrais do CNIS. A caixa
// (Primeira Letra Maiúscula) é do gatilho clientes_caixa (F282).
async function atualizarDossie(cliId){
  if(semCadastro()) return;   // F396
  const c = D.cliPorId.get(cliId); if(!c) return;
  if(digitosCpf(c.cpf).length!==11) return aviso("A ficha não tem CPF. A extensão prende o dossiê pelo CPF: preencha o CPF e rode o dossiê de novo.");
  aviso("Buscando o dossiê deste CPF…", false);
  for(const a of docsDoDossie(cliId)){ _leitoresTentados.delete(a.id); _dossieFalhou.delete(a.id); }
  preFicha.delete(cliId);
  await abrirFicha(cliId);
  const cad = ((c.dossie||{}).meuinss||{}).cadastro || {}, novo = {};
  for(const k of CAD_DO_DOSSIE) if(!c[k] && cad[k]) novo[k] = cad[k];
  // F425 · o CNIS traz a rua com o número; a peça lê clientes.endereco (F9.3), que ficava em branco e o cadastro nunca se completava
  if(novo.logradouro && !c.endereco){
    const [rua, num] = enderecoArrumado(novo.logradouro, c.numero);
    novo.logradouro = rua; if(num && !c.numero) novo.numero = num;
    novo.endereco = enderecoMontado({logradouro:rua, numero:num, complemento:c.complemento});
  }
  let n = 0;
  if(Object.keys(novo).length){
    try{
      const [row] = await api(`/rest/v1/clientes?id=eq.${cliId}`, {method:"PATCH", headers:{Prefer:"return=representation"}, body:JSON.stringify(novo)}) || [];
      Object.assign(c, row || novo); n = Object.keys(novo).filter(k=>CAD_DO_DOSSIE.includes(k)).length;
      if(clienteAberto===cliId) repintarFicha();
    }catch(e){ console.warn("dossiê: cadastro não completado", e); }
  }
  const docs = docsDoDossie(cliId).length, portais = Object.keys(c.dossie||{}).length;
  aviso(docs || portais
    ? `Dossiê atualizado: ${docs} documento${docs===1?"":"s"}${n?` e ${n} campo${n===1?"":"s"} do cadastro preenchido${n===1?"":"s"}`:""}.`
    : "Nenhum dossiê deste CPF no CRM. Se a extensão rodou sem o login do CRM, os arquivos ficaram só no Drive: faça o login na extensão e rode o dossiê de novo.");
}
const preFicha = new Map();   // cliId -> {p, em, escritas}
function preCarregarFicha(cliId){
  if(!cliId || cliId===clienteAberto || preFicha.has(cliId) || !D.cliPorId.get(cliId)) return;
  const ids = (D.casosDoCliente.get(cliId)||[]).map(k=>k.id).join(",");
  const p = buscarFicha(cliId, ids); p.catch(()=>preFicha.delete(cliId));
  preFicha.set(cliId, {p, em:Date.now(), escritas});
  // não guarda mais que 6: quem passa o mouse pela lista inteira não enche a memória
  if(preFicha.size>6) preFicha.delete(preFicha.keys().next().value);
}
async function abrirFicha(cliId){
  // F262 · a conversa ao lado acompanha a ficha nas abas (INSS, Conselho, Judicial); trocar de CLIENTE fecha a do anterior
  if(painelZapCli && painelZapCli!==cliId) fecharPainelPrazo();
  const c = D.cliPorId.get(cliId);
  if(!c) return aviso("Cliente ainda carregando — tente de novo em instantes");
  const trocouCliente = clienteAberto !== cliId;
  if(trocouCliente){
    casoSel = "__auto__";
    mesaAberta.clear(); // F55 · ficha nova, mesa arrumada de novo
    // cliente novo: abre no 1º caso ativo — mas quem ainda não tem caso está
    // EM ATENDIMENTO, e a aba Casos abriria vazia; para esse, o começo é o
    // Cadastro, onde vivem as anotações e os documentos pedidos (08.99)
    const temCaso = (D.casosDoCliente.get(cliId)||[]).some(k=>k.fase!=="encerrado" && !ehPreCaso(k));   // F226 · o pré-caso abre no atendimento
    abaAtiva = temCaso ? 2 : 0;
    if(!temCaso && !SUB_CAD.some(([x])=>x===subCad)){
      const pcsA=precasosDe(c);
      // F172 · sem atendimento aberto e com anotações (lista 🙋 Escritório),
      // a ficha abre na Análise de Direito, onde elas estão
      const temNotas=notasDoTodo(c), vivosA=pcsA.some(p=>!p.so_lembrete);
      // F220 · atendimento em curso: a ficha abre na Identificação, onde está o "Abrir atendimento"
      subCad = (temNotas && !vivosA) ? "direito"
        : vivosA ? "identificacao"
        : !triagemFechada(c) ? "triagem"
        : (pcsA.some(p=>!p.so_lembrete)||!pcsA.length) ? "anotacoes" : "identificacao";
    }
    instSel = 0; tudoSoMarcos = false; filtroTudo = "tudo"; docsSel.clear();    // escolhas do cliente ANTERIOR não vazam
    procSel = ""; nupSel = ""; fonteCnj = ""; fontePat = ""; fonteCrps = "";   // idem: processo e fonte (F71: PJe padrão)
    subAba = "escritorio";   // F166 · abrir um caso é abrir os andamentos do Escritório (era o Caso completo, F45)
  }
  if(soIdentificacao()){ abaAtiva = 0; subCad = "identificacao"; _atendAberto.delete(cliId); }   // F249 · primeiro acesso: só a Identificação; F355 · o nível 1 também (a leitura dos portais passou ao nível 2)
  clienteAberto = cliId;
  document.getElementById("app").classList.add("detalhe-aberto");
  armarVoltar();
  // em rede lenta a coluna abria branca até as 6 consultas voltarem
  if(trocouCliente){
    const det=document.getElementById("detalhe");
    if(det) det.innerHTML = temaV10() ? esqueletoFicha() : `<p class="meio-sub" style="padding:20px">abrindo a ficha…</p>`;
  }
  aplicarMenu();
  const ks = (D.casosDoCliente.get(cliId)||[]).sort((a,b)=>(a.fase==="encerrado"?1:0)-(b.fase==="encerrado"?1:0));
  const ids = ks.map(k=>k.id).join(",");
  // F43 · a ficha NUNCA fica presa no "abrindo…": toda perna da busca tem
  // rede de proteção (credenciais era a única sem catch — um erro dela
  // rejeitava o conjunto e o placeholder ficava para sempre), e qualquer
  // exceção na pintura vira uma tela de erro com "tentar de novo".
  try{
    // F150 · se o cursor já parou sobre este cliente na lista, a busca saiu
    // antes do clique: usa a que está a caminho (só ao TROCAR de cliente;
    // repintar o mesmo cliente depois de gravar busca de novo, sempre)
    const pre = trocouCliente && preFicha.get(cliId);
    preFicha.delete(cliId);
    const esc0 = escritas;
    const [ands, creds, vincs, anexos, convs, tarefasF, zapsF, cliRow] = await
      ((pre && Date.now()-pre.em < 20000 && pre.escritas===escritas) ? pre.p : buscarFicha(cliId, ids));
    // F241 · o documento gravado enquanto a busca estava a caminho (gerado, assinado) não some da tela: a busca saiu antes dele
    const meio = escritas!==esc0 ? (D.anexos||[]).filter(a=>a.cliente_id===cliId && !anexos.some(b=>b.id===a.id)) : [];
    D.anexos = meio.length ? [...meio, ...anexos] : anexos;
    fundirClienteDoBanco(cliId, (cliRow||[])[0]);
    D.convFicha = convs;
    D.zapFicha = zapsF;
    // F191 · a foto do WhatsApp aparece na identificação do cliente
    await assinarFotosZap([...zapsF.filter(z=>z.cliente_id===cliId && !z.contato_nome),
      ...(D.cliPorId.get(cliId)?.foto_url ? [{foto_url:D.cliPorId.get(cliId).foto_url}] : [])]);
    D.tarefasFicha = tarefasF;
    D._andsFicha = ands;
    D._ficha = { cliId, creds, vincs };
    retraduzirCrps(ands);   // F236 · o movimento do e-Recursos gravado com a regra velha se lê pelo bloco relido   // o que a pintura usa além do D global
    pintarFicha();
    adotarDcbDosAutos(cliId).then(()=>adotarQuadro(cliId)).then(()=>adotarSuspensao(cliId)).catch(e=>console.warn("DCB dos autos / quadro:", e));   // F236, F321, F406
    repararCardsDoCliente(cliId).catch(e=>console.warn("cards:", e));   // F236
    repararCasosDoAtendimento(cliId).catch(e=>console.warn("natureza:", e));   // F236
    // ondas 0 e 1 · em segundo plano, sem esperar: o texto do dossiê e,
    // depois, o CNIS e a declaração pelos leitores do CRM
    if(SUB_DOSSIE_TUDO.has(subCad)) _dossieTudo.add(cliId);
    lerTextoDoDossie(cliId).then(()=>lerLeitoresDoDossie(cliId)).catch(e=>console.warn("dossiê:", e));
    lerPreviusPendentes(cliId).catch(e=>console.warn("prévius:", e));   // F618
  }catch(e){
    console.error("abrirFicha:", e);
    const det=document.getElementById("detalhe");
    if(det) det.innerHTML=`<div style="padding:24px;max-width:520px">
      <h3 style="margin:0 0 6px">A ficha não abriu</h3>
      <p class="meio-sub" style="margin:0 0 10px">${esc(String(e&&e.message||e).slice(0,180))}</p>
      <button class="novo-cli" style="width:auto;padding:9px 18px"
        onclick="abrirFicha('${cliId}')" title="↻ tentar de novo"><span aria-hidden="true">↻ Repetir</span><span class="sr-only">↻ tentar de novo</span></button>
      <button class="btn-mini" onclick="fecharFicha()" title="voltar à lista"><span aria-hidden="true">Voltar</span><span class="sr-only">voltar à lista</span></button>
    </div>`;
  }
}
// REPINTAR SEM REBUSCAR. Trocar de aba, sub-aba ou instância não é motivo
// para voltar à rede: as 6 consultas já foram feitas quando a ficha abriu, e
// no 4G cada clique de aba custava segundos. A navegação chama isto; quem
// GRAVA alguma coisa continua chamando abrirFicha() (que rebusca).
// F215 · repintar na mesma tela (um botão, uma chave) não volta ao topo: a
// rolagem fica onde estava; trocar de aba, de passo ou de cliente começa no topo
let _repintChave = "", _rolPend = null;
function repintarFicha(){
  if(D._ficha && D._ficha.cliId===clienteAberto && clienteAberto){
    const chave = [clienteAberto, abaAtiva, subCad, _pcSel.get(clienteAberto)||""].join("|"), mesma = chave===_repintChave; _repintChave = chave;
    const form = mesma && document.querySelector("#ad-novo[data-mexido]");   // F234
    const det = document.getElementById("detalhe"), rol = document.querySelector(".det-rolagem");
    // duas repinturas seguidas: vale a rolagem de antes da primeira
    const y = (mesma && _rolPend) || [det ? det.scrollTop : 0, rol ? rol.scrollTop : 0, window.scrollY];
    // e o que estava aberto (o formulário da análise, um detalhe) continua aberto
    const abertos = mesma ? [...document.querySelectorAll("#detalhe details[id][open]")].map(x=>x.id) : [];
    const rasc = mesma && (document.getElementById("atend-nota")||{}).value;   // F283 · a anotação ainda não gravada fica
    pintarFicha();
    { const ta = document.getElementById("atend-nota"); if(rasc && ta && !ta.value) ta.value = rasc; }
    for(const id of abertos){ const e = document.getElementById(id); if(e) e.open = true; }
    { const novo = document.getElementById("ad-novo"); if(form && novo && form.dataset.pc===novo.dataset.pc) novo.replaceWith(form); }
    if(mesma){ _rolPend = y; requestAnimationFrame(()=>{ const d = document.getElementById("detalhe"), r = document.querySelector(".det-rolagem");
      if(d) d.scrollTop = y[0]; if(r) r.scrollTop = y[1]; window.scrollTo(0, y[2]); _rolPend = null; }); }
  }
  else if(clienteAberto) abrirFicha(clienteAberto);
}
function pintarFicha(){
  { const d = document.getElementById("detalhe"); if(d) d.classList.remove("atend-tela","id-bege"); }   // F206 · o Cadastro religa
  respondeA=null;               // repintou = o chip de resposta se foi com o DOM
  atQuem=[];                    // e a seleção de responsáveis da anotação também
  const cliId = clienteAberto;
  const c = D.cliPorId.get(cliId); if(!c) return;
  const ks = (D.casosDoCliente.get(cliId)||[]).sort((a,b)=>(a.fase==="encerrado"?1:0)-(b.fase==="encerrado"?1:0));
  const ands = D._andsFicha||[];
  const creds = (D._ficha||{}).creds||[], vincs = (D._ficha||{}).vincs||[];
  tfQuem = null; tfData = undefined;   // cada pintura recomeça a escolha
  const evs = D.eventos.filter(e=>ks.some(k=>k.id===e.caso_id)).sort((a,b)=>a.data_hora<b.data_hora?1:-1);
  // F25 · o menu é dinâmico: se a aba apontada não existe para ESTE cliente
  // (sem caso → sem Casos/Honorários; sem perícia → sem Perícias), a ficha
  // abre no Cadastro em vez de numa aba invisível
  if((abaAtiva===2 || abaAtiva===4) && !ks.length && !(D.pagamentos||[]).some(p=>p.cliente_id===cliId)) abaAtiva=0;
  if(abaAtiva===3 && !evs.length && !periciasDoProcesso(ands, true).length) abaAtiva=0;   // F236
  // F29 · Lembretes só aparece depois da triagem (ou para quem já tem caso
  // ou lembrete ativo): cliente novo vê SÓ o Cadastro
  const temLemb = ks.length || triagemFechada(c) || lembretesDo(cliId).length;
  // F277 · as Aposentadorias futuras saíram do menu (pedido do Paulo, 25.10.2026): quem pedia a aba abre o Cadastro, com o
  // quadro Aposentadoria à vista e, havendo card, os cards abertos por cima
  if(abaAtiva===9){ abaAtiva = 0; subCad = "identificacao"; _atendAberto.delete(cliId); if(lembretesDo(cliId).length) queueMicrotask(()=>verAposFuturas(cliId)); }
  else queueMicrotask(()=>{ const am = document.querySelector("#modal .apos-modal");   // a janela aberta acompanha o que mudou
    if(am && am.dataset.cli===cliId) am.innerHTML = conteudoAposFuturas(c); });
  // o dinheiro é do CLIENTE: a lista 💵 Pagamentos do To Do é ESTA aba, não um
  // caso. Por isso a parcela entra tanto pelo caso (as antigas) quanto pelo
  // cliente (as que chegam sem processo — acerto de honorários, por exemplo).
  const pgs = D.pagamentos.filter(p=>p.cliente_id===cliId || ks.some(k=>k.id===p.caso_id));
  const pagK = ks.filter(k=>k.fase==="pagamento");
  const equipe = [...new Set(ks.flatMap(k=>D.atrDoCaso.get(k.id)||[]))];

  // F236 · o caso em Pagamentos não está no menu de casos, mas abre pelo "ver o processo" do cartão Em recebimento
  if(casoSel && casoSel!=="__auto__" && !ks.some(k=>k.id===casoSel)) casoSel=null;
  if(casoSel==="__auto__"){
    // F226 · a escolha é entre casos de verdade; o pré-caso abre sem perguntar
    const ativos=processosDe(ks).filter(k=>k.fase!=="encerrado" && !ehPreCaso(k));
    // com MAIS DE UM processo em aberto, ninguém adivinha em qual comentar:
    // o sistema pergunta antes de abrir (encerrados não contam para isso)
    if(ativos.length>1) return escolherProcesso(cliId, ativos);
    casoSel = ativos.length ? ativos[0].id : ((ks.find(ehPreCaso)||ks[0]||{}).id || null);
  }
  const andsVis = casoSel ? ands.filter(a=>a.caso_id===casoSel) : ands;
  // ATIVO ou INATIVO, ao lado do nome (pedido do Paulo): quem abre a ficha
  // precisa saber de cara se AINDA trabalhamos para esta pessoa. Vermelho =
  // todos os casos encerrados; verde diz quantos seguem em andamento; cinza
  // é o cliente cadastrado que nunca teve caso.
  // F226 · o pré-caso não é caso: o estado do cliente conta só os casos de verdade
  const ksR = ks.filter(k=>!k.pre_caso);
  const ativosCli = ksR.filter(k=>k.fase!=="encerrado");
  const encDesde = ksR.map(k=>k.encerrado_em).filter(Boolean).sort().slice(-1)[0];
  const lembCli = lembretesDo(cliId);
  // F236 · o card com o direito alcançado sobe ao alto da ficha, para quem estiver atendendo
  const alCli = lembCli.map(l=>[l, alarmeDireito(l, c)]).filter(x=>x[1]).sort((a, b)=>b[1].dias - a[1].dias)[0];
  const chipAlarme = alCli ? `<button type="button" class="cli-st alarme" onclick="abaAtiva=9;repintarFicha()" title="${esc(`${alCli[0].titulo||"Aposentadoria"}: direito desde ${fmtBarra(alCli[1].desde)}; a aposentadoria começa no dia do pedido (Lei 8.213/91, art. 49) — abre o card`)}">⏰ Direito ${alCli[1].dias ? `há ${plu(alCli[1].dias, "dia", "dias")}` : "hoje"} · protocolar já</button>` : "";
  // três estados a pedido do Paulo: verde = processo andando; amarelo = sem
  // processo, mas o escritório avisa (🔔 lembretes ativos — trabalho, só que
  // de outro tipo); vermelho = nada, nem aviso. Cinza é quem nunca teve caso.
  // F418 · todos os casos em andamento suspensos por tema: o selo muda de cor e diz o tema
  const suspCli = ativosCli.filter(suspensaoDe), todosSusp = suspCli.length && suspCli.length===ativosCli.length;
  const stCli = ativosCli.length
    ? `<span class="cli-st ${todosSusp?"susp":"ativo"}" title="${ativosCli.length} de ${ks.length} caso(s) em andamento${suspCli.length?` · ${suspCli.map(k=>`${tituloCaso(k)}: ${tituloSusp(suspensaoDe(k))}`).join("; ")}`:""}${lembCli.length?` · e ${lembCli.length} lembrete(s) na aba 🔔`:""}">${todosSusp
        ? `⏸ Cliente ativo · suspenso${(t=>t.length===1?` · ${t[0]}`:"")([...new Set(suspCli.map(k=>rotSusp(suspensaoDe(k))))])}`
        : `Cliente ativo · ${ativosCli.length} caso${ativosCli.length>1?"s":""}${suspCli.length?` · ${suspCli.length} suspenso${suspCli.length>1?"s":""}`:""}`}</span>`
    : lembCli.length
      ? `<span class="cli-st lemb" title="nenhum processo em andamento, mas o escritório avisa de tempos em tempos — veja o quadro Aposentadoria no Cadastro">🟡 Sem processo — ${lembCli.length} lembrete${lembCli.length>1?"s":""} ativo${lembCli.length>1?"s":""}</span>`
      : ksR.length && !precasosDe(c).some(p=>!p.so_lembrete)
        ? `<span class="cli-st inativo" title="nenhum trabalho em andamento para este cliente">🔴 Cliente inativo — ${ksR.length>1?`os ${ksR.length} casos`:"o único caso"} encerrado${ksR.length>1?"s":""}${encDesde?` (último em ${fmt(dataSP(encDesde))})`:""}</span>`
        : (n=>n?`<span class="cli-st atend" title="pré-caso em formação: gerar o caso é gerar a procuração e assinar o contrato — até lá, o cliente fica amarelo, na lista Escritório">🟡 Em formação — ${n} pré-caso${n>1?"s":""}</span>`
               :`<span class="cli-st atend" title="cliente em atendimento — ainda não virou caso; as anotações e os documentos pedidos ficam na aba Cadastro">🟡 Em atendimento — buscando documentos</span>`)(precasosDe(c).filter(p=>!p.so_lembrete).length);
  // F243 · no v10 o CPF, a senha do Meu INSS e o telefone vão na linha do nome, e o menu do cliente sobe (pedido do Paulo, 18.10.2026)
  const resumoIn = `      <span class="id-min"><b>CPF</b> ${c.cpf?`<span class="cop" data-cop="${esc(c.cpf)}" data-cop-msg="CPF copiado" title="clique para copiar">${fmtCpf(c.cpf)}</span>
        <button class="olho" title="copiar CPF" onclick="copiar('${c.cpf}','CPF copiado')">📋</button>`:"—"}</span>
      ${(cr=>cr?`<span class="id-min"><b>Meu INSS</b> ••••••
        <button class="olho" title="copiar senha (fica registrado)" onclick="copiarCred('${cr.id}')">📋</button>
        <button class="olho" title="ver (fica registrado)" onclick="verCred('${cr.id}')">👁</button>${c.cpf?`
        <button class="olho entrar-inss" title="entrar no Meu INSS: copia o CPF e abre o login do gov.br" onclick="entrarMeuInss('${cliId}')">↗</button>`:""}</span>`
        :`<span class="id-min"><b>Meu INSS</b> <span class="meio-sub">sem senha</span>${c.cpf?`
        <button class="olho entrar-inss" title="entrar no Meu INSS: copia o CPF e abre o login do gov.br" onclick="entrarMeuInss('${cliId}')">↗</button>`:""}</span>`)(creds.find(x=>x.tipo==="meu_inss"))}
      ${/* F86 · o telefone ao lado do CPF e da senha: é o terceiro dado que a
           equipe copia o dia inteiro (o protótipo o mostrava na faixa) */""}
      ${(temaV10() && c.telefone)?`<span class="id-min"><b>Telefone</b> <span class="cop" data-cop="${esc(c.telefone)}" data-cop-msg="Telefone copiado" title="clique para copiar">${esc(c.telefone)}</span>
        <button class="olho" title="copiar o telefone" onclick="copiar('${escJs(c.telefone)}','Telefone copiado')">📋</button>${botaoZapCliente(cliId)}</span>`:""}
      ${/* F56 · o "Concluir em" do To Do agora mora aqui: UMA data à vista
           dizendo quando este cliente volta — vencida grita em vermelho,
           futura avisa em azul, e a ausência de data também é informação */""}
      ${/* F108 · no tema v10 a pílula saiu (pedido do Paulo, 17.09): a data
           que cobra ação já mora nos quadros de prazo do caso */""}
      ${temaV10()?"":(pd=>pd.venceu
        ?`<button class="volta-pilula venceu" onclick="irParaData('${pd.venceu.tipo}')"
            title="${esc(pd.venceu.rotulo)} — esperando desde ${fmt(pd.venceu.data)}; clique para ir até lá">⏰ venceu ${fmt(pd.venceu.data)} · ${esc(pd.venceu.rotulo)}</button>`
        :pd.proxima
        ?`<button class="volta-pilula futura" onclick="irParaData('${pd.proxima.tipo}')"
            title="${esc(pd.proxima.rotulo)} — clique para ir até lá">📅 volta ${fmt(pd.proxima.data)} · ${esc(pd.proxima.rotulo)}</button>`
        :`<span class="volta-pilula vazia" title="nenhuma data marcada para este cliente — sem lembrete, ninguém é cobrado de voltar aqui">📅 sem próxima data — marque nas Anotações</span>`)(proximaDataDe(cliId))}
`;
  document.getElementById("detalhe").innerHTML=`
  <div class="det-principal"${temaV10() && celular() ? ` data-cel-aba="${celAba = celAbaNorm()}" data-cel-cad="${celCad}"` : ""}>
  <div class="det-rolagem">
  <div class="det-topo">
    <div class="linha1">
      <button class="cel-voltar so-cel" onclick="fecharFicha()" title="voltar para a lista">‹</button>
      ${/* o nome e a bolinha abrem o mapa dos casos (pedido do Paulo): em
           que lista está cada um, e um clique leva direto ao processo */""}
      <span class="cli-bloco"><span class="cli-casos" onclick="menuCasosDoCliente(event,'${cliId}')"
        title="ver os casos deste cliente e em que lista está cada um">
        ${(u=>u?`<img class="avatar foto-zap" src="${esc(u)}" alt="foto de ${esc(c.nome)} no WhatsApp" title="foto do WhatsApp — clique para ampliar" onclick="verFotoGrande(this.src)">`
          :`<span class="avatar" style="--av:${corDoNome(c.nome)}">${esc(c.nome[0])}</span>`)(fotoDoCliente(c.id))}<h2>${esc(c.nome)}</h2>
        <span class="cli-casos-seta">▾</span>
      </span>${temaV10() && celular() ? linhaAdvogado(c) : ""}</span>
      ${/* F278 · o copiar o nome volta ao lado do nome (pedido do Paulo, 25.10.2026) */""}
      <button class="olho" title="copiar o nome do cliente"
        onclick="copiar('${escJs(c.nome)}','Nome copiado')">📋</button>
      ${/* F101 · a parceria ao lado do nome, só quando existe: quem abre a
           ficha vê de cara que o caso é dividido com outro advogado */""}
      ${chipParceria(c, ks)}
      ${chipsParentes(c)}${chipEntregar(c)}
      ${temaV10() && c.telefone ? "" : botaoZapCliente(cliId)}
      ${/* F401 · CPF, Meu INSS, telefone, advogado e a situação na linha do nome, sem a segunda linha (pedido do Paulo, 05.11.2026) */""}
      ${temaV10() && !celular() ? `<span class="linha2"><span class="resumo resumo-lado">${resumoIn}</span>${linhaAdvogado(c)}${chipAlarme}${alCli && !ativosCli.length ? "" : stCli}</span>` : ""}
      ${temaV10() && celular() ? `<span class="resumo resumo-lado">${resumoIn}</span>` : ""}
      ${/* F403 · o ⋯ do cabeçalho saiu: no lugar, as Anotações rápidas do cliente; Separar e Não é cliente foram ao Cadastro (pedido do Paulo, 05.11.2026) */""}
      ${botaoGravarFicha(cliId)}<span class="det-mais-col">${botaoRapidas(c)}${botaoEstrelaFicha(cliId)}</span>
      ${/* F274 · a situação do cliente e o ✕ andam juntos no canto direito, mesmo quando a linha quebra */""}
      <span class="det-canto">${temaV10() && !celular() ? "" : `${chipAlarme}${alCli && !ativosCli.length ? "" : stCli}`}
      ${chipAgendaCliente(c)}
      <button class="fechar nao-cel" onclick="fecharFicha()" title="fechar a ficha" aria-label="fechar a ficha">✕</button></span></div>
    ${/* abaixo do nome só o que a equipe usa o tempo todo: CPF e a senha do
         Meu INSS. O resto do cadastro fica na aba 📇, sem poluir aqui. */""}
    ${temaV10() ? "" : `<div class="resumo">${resumoIn}</div>`}
    <div class="menu-topo">
      ${/* abas em pivot claro (espec. 7.2): texto limpo, sem emoji de ícone */""}
      ${/* Documentos saiu do menu (08.98): ele é passo do atendimento, e o
           atendimento começa no Cadastro — o botão está lá dentro */""}
      <button class="mt ${abaAtiva===0?"on":""}" data-vv="0">Cadastro${pontoAba(casoSel && D.casoPorId.get(casoSel), "cad")}</button>
      ${/* ⚖️ F48 · sempre visível: cliente sem análise vê o convite a fazer
           a primeira — é assim que o histórico começa a existir */""}
      ${/* F171 · a Análise de Direito mudou-se para dentro do Cadastro */""}
      ${/* F127 · o CNIS abre em outra aba de qualquer lugar da ficha */""}
      ${/* o menu tem só as cinco divisões do cliente (pedido do Paulo):
           Cadastro, Lembretes, Casos, Perícias e Honorários. O caso escolhido
           aparece no cartão de fatos, não no rótulo da aba. */""}
      ${/* F25 · o menu é DINÂMICO (pedido do Paulo): Casos só com caso,
           Perícias só com perícia, Honorários só com caso ou recebimento.
           Cliente em formação vê só Cadastro e Lembretes — menos abas,
           menos lugar para se perder. */""}
      ${/* F668 · a aba Pré-caso saiu (onda 1, 21.11.2026): o pré-caso é caso em formação, no Casos ▾;
           sem caso nem pré-caso, o advogado vê o ＋ Pré-caso */""}
      ${!ksR.length && !pcDaFicha(c).n && podeAtender() ? `<button class="mt mt-novopc" id="btn-novo-pc" title="Novo pré-caso">＋ Pré-caso</button>` : ""}
      ${ksR.length || pcDaFicha(c).n ? `<button class="mt mt-proc ${abaAtiva===2?"on":""}" id="btn-processos"
        title="${(kk=>kk?"caso aberto: "+esc(tituloCaso(kk)):"escolher o caso do cliente")(casoSel&&D.casoPorId.get(casoSel))}">Casos${
          (n=>n>1?` (${n})`:"")(processosDe(ksR).length + pcDaFicha(c).lista.length)} ▾</button>` : ""}
      ${/* P3 · a aba Prazos junta as datas de todos os casos e as do cliente (decisão do Paulo, 31.10.2026) */""}
      ${(z=>(z.total||abaAtiva===5) ? `<button class="mt ${abaAtiva===5?"on":""}" data-vv="5">Prazos${z.total?` <span class="mt-pzn">${z.total}</span>`:""}${z.venc?` <span class="mt-pzv">${z.venc} vencido${z.venc>1?"s":""}</span>`:""}</button>` : "")((()=>{ try{ return prazosDoCliente(cliId); }catch(e){ return {total:0, venc:0}; } })())}
      ${/* F170 · Perícias só com perícia AGENDADA (de hoje em diante, não
           cancelada). A anotação do caso "perícia agendada para 05/10 às
           9h40" já cria o agendamento (extrairEvento), e a aba aparece */""}
      ${/* F236 · e também com a que passou sem confirmação ou a que só o processo conhece, cada uma contada */""}
      ${(n=>(n.f||n.c||n.p||abaAtiva===3) ? `<button class="mt ${abaAtiva===3?"on":""}" data-vv="3">Perícias${n.f?` (${n.f})`:""}${n.c?` · ${n.c} a confirmar`:""}${n.p?` · ${n.p} a agendar`:""}${n.c?"":pontoAba(casoSel && D.casoPorId.get(casoSel), "per")}</button>` : "")({
        f:evs.filter(e=>dataSP(e.data_hora)>=hoje()&&e.status!=="cancelada").length,
        c:evs.filter(e=>dataSP(e.data_hora)<hoje()&&e.status==="agendada"&&(D.casoPorId.get(e.caso_id)||{}).fase!=="encerrado").length,
        p:periciasDoProcesso(ands, true).length})}
      ${(ks.length || pagK.length || pgs.length) ? `<button class="mt ${abaAtiva===4?"on":""}" data-vv="4">Honorários${(n=>n?` (${n})`:"")(pgs.filter(p=>p.status==="aberto").length)}${/* F236 · o vencido na própria aba */""}${(v=>v?` <span class="mt-venc">· ${v} vencido${v>1?"s":""}</span>`:"")(pgs.filter(p=>p.status==="aberto" && p.vencimento && p.vencimento<hoje() && !pgSemValor(p) && !valorSuspeito(p)).length)}${pontoAba(casoSel && D.casoPorId.get(casoSel), "hon")}</button>` : ""}
    </div>
    <button class="cel-tudo" onclick="fichaTudo()" title="⋯ mostrar tudo da ficha"><span aria-hidden="true">⋯ Tudo</span><span class="sr-only">⋯ mostrar tudo da ficha</span></button>
    ${temaV10() && celular() ? (k=>`${k ? `<p class="cel-sub">${esc([k.especie, NOME_FASE[faseEfetiva(k)]||NOME_FASE[k.fase], k.etapa].filter(Boolean).join(" · "))}</p>` : ""}${celAbasHtml(c, ks, k,
      evs.some(e=>dataSP(e.data_hora)>=hoje() && e.status!=="cancelada"), !!(ks.length || pagK.length || pgs.length))}`)(casoSel && D.casoPorId.get(casoSel)) : ""}
  </div>

  <div class="painel ${abaAtiva===0?"ativo":""}" data-p="0">
    ${temaV10() && celular() ? celPrincipalHtml(c, creds) : ""}
    ${painelCadastroFicha(c, ks, creds, vincs, evs)}
  </div>

  <div class="painel ${abaAtiva===2?"ativo":""}" data-p="2">
    ${(()=>{
      const k = casoSel && D.casoPorId.get(casoSel);
      if(!k){
        // só em recebimento: o lugar dele é a aba 💰, não esta. Vale também
        // para quem nunca teve processo e só tem o acerto de honorários — a
        // lista 💵 Pagamentos do To Do agora chega direto na aba, sem caso.
        if(!processosDe(ks).length && (pagK.length || pgs.length))
          return `<p class="meio-sub">Este cliente não tem processo em andamento — o que existe é
            <strong>recebimento</strong>. Veja a aba <strong>💰 Honorários</strong> aqui em cima.</p>`;
        return processosDe(ks).length>1?`<p class="meio-sub">Andamentos de todos os casos juntos — escolha um caso no menu ao lado para ver só o dele.</p>`:"";
      }
      // Ordem da tela: o sub-menu decide O QUE olhar; o cartão de fatos diz
      // DE QUE processo se trata; e só então vem o trabalho (escrever/ler).
      return `${quadroEmFormacao(c, k)}${(()=>{
          // ══════════════════════════════════════════════════════════════════
          // ABA SÓ APARECE COM O QUE MOSTRAR
          // ══════════════════════════════════════════════════════════════════
          // Antes, INSS e Recurso apareciam sempre — num caso puramente
          // judicial eram duas abas vazias em cima de toda ficha. Agora cada
          // uma pede o SEU gatilho, e o gatilho é o número: o do e-Sisrec e o
          // do processo judicial entram em ➕ mais informações, na aba
          // Escritório, e a aba nasce no mesmo instante.
          // A aba com a FASE ENCERRADA continua aparecendo, em cinza: o
          // histórico não some quando a etapa acaba.
          const visiveis = abasVisiveis(k, andsVis);
          const {inss:temINSS, crps:temCRPS, cnj:temCNJ} = visiveis;
          // F320 · no celular os rótulos são curtos (Escritório, INSS, CRPS, Judicial e Tudo)
          // F330 · INSS, CRPS e Judicial só aparecem com andamento ou número; o número entra pela gestão do caso (protocolo ou NB abre o INSS, e-Sisrec o CRPS, CNJ o Judicial; pedido do Paulo, 31.10.2026)
          const v10Cel = temaV10() && celular();
          // F405 · no computador as abas saem e o cartão da fase abre os andamentos dela (pedido do Paulo, 05.11.2026); a fase pedida abre mesmo sem dados
          const semMenu = temaV10() && !v10Cel && !!faseDaTrilha(k);
          const aba = visiveis[subAba] || (semMenu && abaPedida[k.id]===subAba) ? subAba : "escritorio";
          abaDoCaso = {id:k.id, aba};
          // a etiqueta da aba diz o estado sem abrir: ✔ quando a fase foi
          // encerrada à mão, 🗄 quando TODOS os processos daquela fonte estão
          // arquivados (um só arquivado não marca a aba — o outro segue vivo),
          // "(sem dados)" quando ainda não chegou nada.
          // Ordem fixa combinada com o Paulo: Escritório, INSS, Recurso, CNJ.
          const rot=(tem,arq,fim)=> fim?" <span class='meio-sub'>✔ fase encerrada</span>"
                              : arq?" <span class='meio-sub'>🗄 arquivado</span>"
                              : tem?"":" <span class='meio-sub'>(sem dados)</span>";
          const cls=(qual,fim)=>`${aba===qual?"on":""}${fim?" fase-fim":""}`;
          // F102/F103 · no tema v10 a ordem é: a LINHA DO CASO, o menu dos
          // andamentos (INSS / Recurso / Judicial, no mesmo cinza), o
          // comentário fixo, os prazos em quadros e só então o trabalho.
          const v10 = temaV10();
          const menu = `<div class="sub-menu${v10?" menu-andamentos":""}" style="width:100%">
          <button class="${aba==="escritorio"?"on":""}" onclick="irSubAba('escritorio')">${v10?"Escritório":"Andamentos do Escritório"}</button>
          ${temINSS?`<button class="${cls("inss",faseEncerrada(k,"pat"))}" onclick="irSubAba('inss')">${v10?"INSS":"Andamentos INSS"}${v10Cel?"":rot(comentariosPat(andsVis).length, abaPatArquivada(k), faseEncerrada(k,"pat"))}</button>`:""}
          ${temCRPS?`<button class="${cls("crps",faseEncerrada(k,"crps"))}" onclick="irSubAba('crps')">${v10Cel?"CRPS":"Recurso (CRPS)"}${v10Cel?"":rot(crpsTotalEventos(k), abaCrpsArquivada(k), faseEncerrada(k,"crps"))}</button>`:""}
          ${temCNJ?`<button class="${cls("cnj",faseEncerrada(k,"cnj"))}" onclick="irSubAba('cnj')">${v10?"Judicial":"Andamentos do CNJ"}${v10Cel?"":rot((k.datajud&&k.datajud.ultimo)||andamentosPje(andsVis).length, abaCnjArquivada(k), faseEncerrada(k,"cnj"))}</button>`:""}
          <button class="${aba==="tudo"?"on":""}" style="margin-left:auto" onclick="irSubAba('tudo')"
            title="todas as fontes juntas, em ordem cronológica">${v10Cel?"Tudo":v10?"Caso Completo":"Caso completo"}</button>
        </div>`;
          return (v10
        // F145 · duas colunas (pedido do Paulo, 27.09.2026): à esquerda, parada,
        // o caso (nome, placa, ➕ e prazos); à direita o trabalho, com o campo
        // de escrever em cima e os andamentos embaixo
        // F155 · o comentário fixo atravessa as duas colunas, em itálico, logo
        // acima delas: é a primeira coisa que se lê ao abrir o caso
        ? `${faixaFixo(k)}${faixaIncapacidade(k)}<div class="caso-2col caso-3col${!celular() && dirOculta() ? " dir-oculta" : !celular() && esqOculta() ? " esq-oculta" : ""}">${semMenu && !esqOculta() ? `<button type="button" class="caso-dir-alca" aria-expanded="${!dirOculta()}" title="${dirOculta() ? "mostrar os andamentos" : "recolher os andamentos"}" onclick="dirAlternar()"><span aria-hidden="true">${dirOculta() ? "‹" : "›"}</span><span class="sr-only">${dirOculta() ? "Mostrar os andamentos" : "Recolher os andamentos"}</span></button>` : ""}<aside class="caso-esq" aria-label="O caso">${/* F278 · três colunas (pedido do Paulo, 25.10.2026): o caso à esquerda, os andamentos no meio e os prazos à direita; com o WhatsApp aberto, os prazos descem para baixo do caso */""}${linhaCaso(k)}${quadroResumo(k)}${(h=>h && !lcNivel(k.id) ? h.replace('<section class="outras-abas"', '<section class="outras-abas" hidden') : h)(painelOutrasAbas(k))}${quadroDoAtendimento(k)}</aside>
           <div class="caso-dir${v10 && aba==="escritorio" && dashLigado() && !_dbAnt.get(k.id) ? " db-recolhido" : ""}">${semMenu && !dirOculta() ? `<button type="button" class="caso-esq-alca" aria-expanded="${!esqOculta()}" title="${esqOculta() ? "mostrar os prazos e o cartão do caso" : "recolher os prazos e o cartão do caso"}" onclick="esqAlternar()"><span aria-hidden="true">${esqOculta() ? "›" : "‹"}</span><span class="sr-only">${esqOculta() ? "Mostrar os prazos e o cartão do caso" : "Recolher os prazos e o cartão do caso"}</span></button>` : ""}${bannerAClassificar(k)}${semMenu ? "" : menu}${v10Cel ? alertaVencidoCel(k) : ""}${/* F242 · as abas vêm antes do campo de escrever, e nas abas dos portais (INSS, Recurso, Judicial) o campo some: lá não se escreve andamento (pedido do Paulo, 18.10.2026) */""}${/^(inss|crps|cnj)$/.test(aba) || (v10 && aba==="escritorio" && dashLigado()) ? "" : composerCaso(k)}${/* F486 · o cartão do Escritório fica abaixo do campo de escrever (pedido do Paulo, 09.11.2026) */""}${v10 && aba==="escritorio" && dashLigado() ? dashboardLado(k, andsVis, painelDaAba()) : painelDaAba()}</div>${(faixaPrazos(k), "")/* F666 · o quadro saiu do Caso (fica no menu Prazos); a lista segue montada para a janela lateral do prazo */}</div>`
        : `${menu}${blocoFatos(k)}${/* F236 · o que o atendimento decidiu vale também no clássico, o visual padrão da equipe */""}${quadroDoAtendimento(k, true)}${painelDaAba()}`);
          function painelDaAba(){ return aba==="cnj" ? abaComProcessos(k, "cnj", ()=>painelCNJ(k, andsVis)) : aba==="crps" ? abaComProcessos(k, "crps", ()=>painelCRPS(k))
            : aba==="inss" ? abaComProcessos(k, "inss", ()=>painelINSS(k, andsVis))
            : aba==="tudo" ? painelTudo(k, andsVis) : painelEscritorio(k, andsVis); }
        })()}
      <datalist id="lista-beneficios">${D.docs.map(d=>`<option value="${esc(d.beneficio)}">`).join("")}</datalist>
      <datalist id="lista-especies">${ESPECIES.map(([c,n])=>`<option value="${c}">${esc(n)}</option>`).join("")}</datalist>`;
    })()}
  </div>

  <div class="painel ${abaAtiva===5?"ativo":""}" data-p="5">
    ${abaAtiva===5 ? painelPrazosCliente(cliId) : ""}
  </div>

  <div class="painel ${abaAtiva===3?"ativo":""}" data-p="3">
    ${painelPericiasFicha(c, ks, evs)}
  </div>

  <div class="painel ${abaAtiva===4?"ativo":""}" data-p="4">
    ${painelPagamentosFicha(ks, ands, pgs, pagK, c)}
  </div>


  <div class="painel ${abaAtiva===7?"ativo":""}" data-p="7">
    <h3 style="margin-bottom:10px">＋ Novo caso para ${esc(c.nome)}</h3>
    <div class="form-linha">
      <input id="nk-ben" list="lista-beneficios-nk" placeholder="benefício/serviço pleiteado" style="flex:1;min-width:220px">
      <datalist id="lista-beneficios-nk">${D.docs.map(d=>`<option value="${esc(d.beneficio)}">`).join("")}</datalist>
      <select id="nk-fase">${["escritorio","inss","conselho","judicial","aposentadoria_futura","outro"]
        .map(f=>`<option value="${f}">${NOME_FASE[f]}</option>`).join("")}</select>
      <input type="date" id="nk-prazo" title="Lembrar em (opcional)">
      <button onclick="novoCaso('${c.id}')" title="Criar caso">Criar<span class="sr-only"> caso</span></button>
    </div>
    <p class="meio-sub">O caso nasce aqui e a sincronização cria a tarefa correspondente no To Do, na lista da fase.</p>
  </div>


  </div>

  </div>`;

  document.querySelectorAll(".mt[data-vv]").forEach(el=>el.onclick=()=>{
    abaAtiva=+el.dataset.vv;
    // F211 · o Cadastro abre sempre a Identificação normal; a tela cheia só pelo + atendimento
    if(abaAtiva===0){ _atendAberto.delete(cliId); subCad = "identificacao"; }
    repintarFicha();
  });
  // com o menu dinâmico o botão Casos pode nem existir (cliente sem caso)
  const btnProc=document.getElementById("btn-processos");
  if(btnProc) btnProc.onclick=ev=>menuProcessos(ev, ksR);
  document.querySelectorAll("#btn-novo-pc,[data-pc-novo]").forEach(b=>b.onclick=()=>novoAtendimento(cliId));
  document.querySelectorAll("[data-pc-abrir]").forEach(b=>b.onclick=()=>abrirAtendimentoDe(cliId, b.dataset.pcAbrir));
  document.querySelectorAll("[data-pc-ret-salvar]").forEach(b=>b.onclick=()=>{ const id = b.dataset.pcRetSalvar, q = s => document.querySelector(`[${s}="${id}"]`);
    gravarRetornoPc(id, (q("data-pc-ret")||{}).value, (q("data-pc-ret-mot")||{}).value); });
  document.querySelectorAll("[data-pc-proc-salvar]").forEach(b=>b.onclick=()=>{ const i = document.querySelector(`[data-pc-proc="${b.dataset.pcProcSalvar}"]`); gravarProcAnterior(b.dataset.pcProcSalvar, i ? i.value : ""); });
  document.querySelectorAll("[data-pc-mover]").forEach(b=>b.onclick=()=>{ const [id, e] = b.dataset.pcMover.split("|"); moverPreCaso(cliId, id, e); });
  const campoAnd=document.getElementById("and-texto");   // ausente em processo encerrado
  if(campoAnd){
    // Enter registra; Shift+Enter pula linha. O campo cresce até caber tudo.
    // O TETO É O MESMO DOS DOIS LADOS. O CSS do celular limita o campo a
    // 110px e o JS o fazia crescer até 220px com overflow:hidden: da quinta à
    // décima terceira linha o texto ficava escondido E sem rolagem — não dava
    // para reler o começo do próprio relato. Aqui o overflow é decidido pela
    // altura EFETIVA, então vale para qualquer teto, em qualquer tela.
    const crescer=()=>{ campoAnd.style.height="auto";
      campoAnd.style.height=Math.min(campoAnd.scrollHeight, celular()?110:220)+"px";
      campoAnd.style.overflowY = campoAnd.scrollHeight>campoAnd.clientHeight ? "auto" : "hidden";
      folgaComposer(); };
    campoAnd.onkeydown=e=>{
      if(e.key==="Enter" && !e.shiftKey){ e.preventDefault();
        document.querySelector(".escrever button[onclick^='novoAndamento']").click(); }
    };
    // ABRIR E FECHAR O COMPOSER (F8) — pelo mousedown/toque, nunca pelo foco.
    // O clique numa sugestão, no ✕ do lembrete ou no 📎 tirava o foco do campo
    // ANTES do mouseup: a barra sumia, o conteúdo saltava e o clique se perdia.
    // Aqui a barra abre no primeiro contato e só recolhe quando o campo está
    // vazio e o foco saiu de vez — rascunho escrito mantém as ferramentas.
    const cxEsc = campoAnd.closest(".escrever");
    if(cxEsc){
      const abrirEsc = ()=>{ if(!cxEsc.classList.contains("esc-aberto")){
        cxEsc.classList.add("esc-aberto");
        if(campoAnd.dataset.dica) campoAnd.placeholder = campoAnd.dataset.dica;   // F260 · a dica longa só com o quadro aberto
        setTimeout(()=>{
          folgaComposer();
          // no celular o composer aberto come 190px do rodapé: quem estava
          // lendo o último andamento via ele sumir atrás do campo. A folga
          // cresce, mas a rolagem tem que acompanhar.
          if(celular()){
            const rol=document.querySelector(".det-rolagem");
            if(rol && rol.scrollTop + rol.clientHeight > rol.scrollHeight - 260)
              rol.scrollTop = rol.scrollHeight;
          }
        },0); } };
      const fecharEsc = ()=>{
        if(campoAnd.value.trim() || cxEsc.contains(document.activeElement)) return;
        cxEsc.classList.remove("esc-aberto");
        campoAnd.placeholder = "Escrever no caso…";
        // as caixas que a barra abriu vão junto: sozinhas na tela, sem o botão
        // que as fecha (ele mora na barra), viravam painéis órfãos
        ["sug-box","preenche-box","exig-box","lembrar-box"].forEach(id=>{
          const b=document.getElementById(id); if(b) b.style.display="none";
        });
        const bs=document.getElementById("sug-abrir"); if(bs) bs.classList.remove("on");
        setTimeout(folgaComposer,0);
      };
      // F247 · os botões de um clique do campo fechado não abrem o campo: abrir empurrava o botão antes do clique
      const abrirSeNaoUmClique = e=>{ if(!(e.target.closest && e.target.closest(".tipo-sr,.tipo-pc"))) abrirEsc(); };
      cxEsc.addEventListener("mousedown", abrirSeNaoUmClique);
      cxEsc.addEventListener("touchstart", abrirSeNaoUmClique, {passive:true});
      campoAnd.addEventListener("focus", abrirEsc);
      // 150ms: tempo de o clique terminar (mouseup + click) antes de decidir
      cxEsc.addEventListener("focusout", ()=>setTimeout(fecharEsc, 150));
      // F182 · a frase "Ao registrar" acompanha cada clique e cada letra
      ["click","input","change"].forEach(ev=>cxEsc.addEventListener(ev, ()=>setTimeout(pintarFrase)));
      pintarFrase();
    }
    const kAtual=(casoSel&&D.casoPorId.get(casoSel)) || (ks.length===1?ks[0]:null);
    if(kAtual){
      prazoDetectado=null; prazoCancelado=false; prazoDespachar=false; capFora={};
      pintarSugestoes(kAtual); pintarPrazoDoTexto(kAtual);
      // O RASCUNHO NÃO PODE MORRER NUMA REPINTURA. Anexar uma foto, trocar de
      // sub-aba para conferir um protocolo, abrir o menu de processos — tudo
      // isso repinta a ficha, e o relato meio escrito ia embora sem aviso, no
      // meio do atendimento. Agora ele fica guardado por caso, na sessão, e
      // volta para a tela; some só quando o andamento é registrado.
      campoAnd.oninput=()=>{ crescer(); prazoCancelado=false;
        guardarRascunho(kAtual.id, campoAnd.value);
        pintarPrazoDoTexto(kAtual); pintarSugestoes(kAtual); folgaComposer(); };
      const rasc=lerRascunho(kAtual.id);
      if(rasc && !campoAnd.value){
        campoAnd.value=rasc;
        if(cxEsc) cxEsc.classList.add("esc-aberto");   // com texto, as ferramentas ficam à mão
        pintarPrazoDoTexto(kAtual); pintarSugestoes(kAtual);
      }
      crescer();
    }
  }
  folgaComposer();
  trCentrar();   // F183 · a etapa atual no meio da trilha

  document.querySelectorAll("[data-fase]").forEach(s=>s.onchange=async()=>{
    const k=D.casoPorId.get(s.dataset.fase);
    if(s.value==="encerrado") return janelaEncerrar(k.id);   // resultado -> honorários
    // fase = lista física do To Do: mudar aqui também move a tarefa de lista
    const lista=(LISTAS_MOVER.find(([,f])=>f===s.value)||[])[0];
    k.fase=s.value; if(lista) k.mover_para=lista;
    await patchCaso(k.id, {fase:k.fase, ...(lista?{mover_para:lista}:{})});
    aviso(lista?`Movido para ${lista} — o To Do acompanha na próxima sincronização`:"Fase atualizada");
    montarSidebar(); if(clienteAberto) abrirFicha(clienteAberto);
  });
  document.querySelectorAll("[data-resultado]").forEach(s=>s.onchange=async()=>{
    const k=D.casoPorId.get(s.dataset.resultado); k.resultado=s.value||null;
    await patchCaso(k.id, {resultado:k.resultado});
    if(k.resultado==="deferido"){
      await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({caso_id:k.id, autor_id:eu.id, texto:"Benefício CONCEDIDO. 🎉"})});
      aviso("Concedido 🎉 — considere mandar o modelo 'Benefício deferido' ao cliente");
    } else aviso("Resultado registrado");
  });
  document.querySelectorAll("[data-prazo]").forEach(i=>i.onchange=async()=>{
    const k=D.casoPorId.get(i.dataset.prazo); k.prazo=i.value||null;
    await patchCaso(k.id, {prazo:k.prazo});
    aviso("Data de lembrar atualizada 🗓"); montarSidebar();
  });
  document.querySelectorAll("[data-eq]").forEach(ch=>ch.onclick=async()=>{
    const colId=ch.dataset.eq, casosAtivos=ks.filter(k=>k.fase!=="encerrado");
    const tinha=ch.classList.toggle("on");
    for(const k of casosAtivos){
      if(tinha){
        try{ await api(`/rest/v1/atribuicoes`,{method:"POST",headers:{Prefer:"return=minimal"},
          body:JSON.stringify({caso_id:k.id,colaborador_id:colId})}); }catch(e){ if(e.status!==409) throw e; }
        if(!(D.atrDoCaso.get(k.id)||[]).includes(colId)){
          if(!D.atrDoCaso.has(k.id)) D.atrDoCaso.set(k.id,[]);
          D.atrDoCaso.get(k.id).push(colId);
        }
      }else{
        await api(`/rest/v1/atribuicoes?caso_id=eq.${k.id}&colaborador_id=eq.${colId}`,{method:"DELETE"});
        D.atrDoCaso.set(k.id,(D.atrDoCaso.get(k.id)||[]).filter(x=>x!==colId));
      }
    }
    // como o "atribuída a você" do To Do: quem recebe o cliente fica sabendo,
    // pelas Menções e pelo Meu Dia, em vez de descobrir quando abrir a lista
    if(tinha && colId!==eu.id && casosAtivos.length){
      const c = D.cliPorId.get(casosAtivos[0].cliente_id);
      await api(`/rest/v1/mencoes`,{method:"POST",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({de_id:eu.id, para_id:colId, caso_id:casosAtivos[0].id,
          texto:`👤 ${(eu.nome||"").split(" ")[0]} atribuiu a você o cliente ${c?c.nome:""}`.trim()})}).catch(()=>{});
    }
    aviso(tinha?(colId!==eu.id?"Atribuído · a pessoa foi avisada":"Atribuído"):"Atribuição removida"); montarSidebar();
    render();   // atualiza a coluna do meio na hora (avatar e cor do responsável)
  });
  // F236 · "recebido" pergunta o dia e o valor que entrou e, na parcela sem caso de quem tem dois ou mais, de qual caso
  // ela é (antes gravava hoje e o valor lançado, e escrevia a conferência no primeiro caso aberto)
  document.querySelectorAll("[data-recebe]").forEach(b=>b.onclick=()=>receberPgto(b.dataset.recebe));
  document.querySelectorAll("[data-confere]").forEach(b=>b.onclick=async()=>{
    const p=D.pagamentos.find(x=>x.id===b.dataset.confere);
    p.conferencias=[...(p.conferencias||[]),{c:eu.id,em:new Date().toISOString()}];
    await api(`/rest/v1/pagamentos?id=eq.${p.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({conferencias:p.conferencias})});
    aviso("Conferência registrada ✔");
    await elosDepoisDeConferir(casoDaParcela(p), `Pagamento de ${moeda(p.valor)} conferido`);
    abrirFicha(clienteAberto);
  });
  ligarChecklistFicha();
  ligarFasesCaso();   // F82
  if(abaAtiva===0 && subCad==="documentos") renderDocCatalogo();
}

// aba 0 da ficha — extraída da pintarFicha (era um literal de 91 linhas)
function painelCadastroFicha(c, ks, creds, vincs, evs){
  // o Cadastro é o ponto de partida do advogado e cresceu: anotações do
  // atendimento, dados do cliente, documentos e consulta. Sub-menu para não
  // virar rolagem infinita (pedido do Paulo) — sem caso, abre nas anotações.
  const semCaso = !(ks||[]).length;
  // F29/F30 · o trilho é um FLUXO com estados: a Triagem existe enquanto
  // aberta; encerrada, ela some e as Anotações abrem (com o resumo no topo e
  // o botão de reabrir); resolvido o atendimento (caso gerado ou lembrete),
  // as Anotações somem também; Documentos nasce junto com o caso.
  const pcsAll = precasosDe(c);
  const pcsVivos = pcsAll.filter(p=>!p.so_lembrete);
  const triFechada = triagemFechada(c);
  const depois = triFechada || !semCaso;   // documentos/mensagens: depois do portão
  const vis = {identificacao:true,
    triagem: !triFechada,
    anotacoes: pcsVivos.length>0 || (triFechada && semCaso && !pcsAll.length),
    documentos: depois,   // F31: carrega a Consulta junto — abre com o portão
    mensagens: depois};
  // F165 · sem atendimento em curso a ficha mostra só a Identificação (com ou
  // sem caso): Anotações, Triagem, Documentos e Mensagens surgem quando se
  // abre o + atendimento — é o fluxo que o colaborador segue
  if(!pcsVivos.length){
    vis.triagem = vis.mensagens = false;
    // F220 · com caso em andamento, Documentos fica: é onde estão a procuração,
    // o contrato e o que falta ao caso, e o "Nas outras abas" do caso leva até lá
    vis.documentos = ks.some(k=>k.fase!=="encerrado");
    // pré-caso recém-removido: as Anotações ficam, porque o ↺ restaurar mora na mesa
    vis.anotacoes = !!(c.campos||{}).pc_lixeira;
  }
  if(triVisivel.has(c.id)) vis.triagem = true;   // etapa 3 · reaberta pela Análise
  // F171 · Análise de Direito: com caso, com análise já salva, ou no
  // atendimento depois da triagem encerrada (a análise vem depois da triagem e dos documentos)
  vis.direito = !semCaso || analisesDe(c.id).length>0 || (pcsVivos.length>0 && triFechada) || !!adPre
    || notasDoTodo(c)   // F172 · anotações vindas da lista 🙋 Escritório do To Do
    || adVisivel.has(c.id) || adAbrir;   // F176 · aberta por atalho (Novo andamento, passos 2 e 3)
  // onda 2b · o mapa existe quando há o que mapear: documento do dossiê ou CNIS lido
  vis.mapa = docsDoDossie(c.id).length>0 || !!cnisDe(c);
  vis.pa = vis.mapa;   // F196 · o painel do primeiro atendimento lê o mesmo dossiê
  // F205 · sem atendimento aberto a ficha mostra só a Identificação: o Primeiro
  // atendimento, o Mapa e a Análise de Direito nascem do "+ atendimento"
  if(!pcsVivos.length){ vis.pa = vis.mapa = false; }
  // F209 · no modo atendimento os quatro passos sempre abrem, e abrem na tela cheia
  // F220 · e o Primeiro atendimento abre mesmo sem dossiê: é onde se escolhe o benefício
  else if(_atendAberto.has(c.id)){ vis.direito = vis.documentos = vis.pa = true; }
  // valores antigos gravados: "atendimento" era o trilho interno de
  // Anotações; "consulta" virou seção do painel Documentos (F31)
  let cd = subCad==="atendimento" ? "anotacoes"
         : subCad==="consulta" ? "documentos"
         : SUB_CAD.some(([v])=>v===subCad) ? subCad
         : (semCaso ? "anotacoes" : "identificacao");
  if(!vis[cd]) cd = cd==="triagem" ? (vis.anotacoes?"anotacoes":"identificacao")
              : cd==="anotacoes" ? (vis.triagem?"triagem":"identificacao")
              : "identificacao";
  // F206 · a TELA DE ATENDIMENTO: com atendimento aberto, Primeiro atendimento,
  // Mapa, Análise de Direito e Documentos abrem em tela cheia, que se fecha a
  // qualquer tempo (e fechar registra na Análise de Direito o que foi preenchido)
  // só na aba Cadastro e só depois do + atendimento (ou Abrir atendimento)
  const tela = abaAtiva===0 && pcsVivos.length>0 && _atendAberto.has(c.id) && (ATEND_SUBS.has(cd) || cd==="identificacao");
  queueMicrotask(()=>{ const d = document.getElementById("detalhe"); if(d){ d.classList.toggle("atend-tela", tela); d.classList.toggle("notas-on", tela && notasAbertas()); d.classList.toggle("id-bege", abaAtiva===0 && ["identificacao","direito","documentos"].includes(cd)); } });
  if(tela) for(const v of Object.keys(vis)) if(v!=="identificacao" && !ATEND_SUBS.has(v)) vis[v] = false;
  if(soIdentificacao()) for(const v of Object.keys(vis)) vis[v] = v==="identificacao";   // F249 · primeiro acesso; F355 · e o nível 1
  return `
    ${tela ? cabecalhoAtendimento(c, cd, vis) : ""}
    <div class="sub-menu" style="width:100%">
      ${/* F277 · fora da tela de atendimento, o Cadastro é só a Identificação (pedido do Paulo); o que se abriu por um atalho
           (Documentos pelo "Nas outras abas") aparece enquanto está aberto */""}
      ${SUB_CAD.filter(([v])=>vis[v] && (tela || v==="identificacao" || v===cd))
        .map(([v,r])=>`<button class="${cd===v?"on":""}" onclick="irSubCad('${v}')">${r}${
        v==="direito"&&analisesDe(c.id).length?` (${analisesDe(c.id).length})`:""}${
        v==="anotacoes"&&semCaso?` <span class="meio-sub">•</span>`:""}</button>`).join("")}
      ${soIdentificacao() || !podeAtender() ? "" : !pcsVivos.length ? `<button class="trilho-mais atend-novo" style="align-self:center;margin-left:auto"
        title="abrir um atendimento novo — pode virar caso novo ou só lembrete"
        onclick="novoAtendimento('${c.id}')">+ atendimento</button>`
        : !tela ? `<button class="trilho-mais atend-novo" style="align-self:center;margin-left:auto"
        title="abre a tela do atendimento em curso" onclick="_atendAberto.add('${c.id}');irSubCad('pa')"><span aria-hidden="true">Atender</span><span class="sr-only">Abrir atendimento</span></button>` : ""}
    </div>
    ${/* F176 · cliente mantido em Escritório: as três saídas no topo */""}
    ${/* F220 · na tela de atendimento o Desfecho e a Documentos fazem o papel da barra */""}
    ${!tela && (cd==="anotacoes"||cd==="direito") && (!ks.some(k=>k.fase!=="encerrado") || ks.some(k=>k.fase==="escritorio") || pcsVivos.length>0)
      ? barraEscritorio(c) : ""}
    ${cd==="triagem" ? painelTriagemFicha(c, ks) : ""}
    ${cd==="documentos" ? painelDocumentosAtend(c, ks) : ""}
    ${cd==="anotacoes" ? caixaAtendimento(c, ks) : ""}
    ${cd==="mensagens" ? painelMensagensFicha(c, ks, evs) : ""}
    ${cd==="pa" ? painelPA(c, ks) : ""}
    ${cd==="mapa" ? painelMapa(c, ks) : ""}
    ${cd==="direito" ? painelDireito(c) : ""}
    ${cd!=="identificacao" ? "" : `
    ${/* a aposentadoria provável mudou-se para a aba 🔔 Lembretes: é aviso de
         data que chega, não dado de cadastro (pedido do Paulo) */""}
    ${civilDoDossieCaixa(c)}
    ${qualificacaoCaixa(c)}
    ${fichaIdentificacao(c, creds)}
    ${(()=>{
      const prots = [...new Set(ks.flatMap(k=>k.protocolos||[]))];
      return `
    ${/* segundo cartão: quem este cliente é para o INSS e a quem ele se liga.
         Eram três blocos soltos, cada um com moldura própria, empilhados
         abaixo do cartão. Agora falam a mesma língua visual do de cima. */""}
    ${/* F164 · o cartão inteiro só abre no ＋ (pedido do Paulo: tela limpa) */""}
    ${!parentesAbertos.has(c.id) ? `<button class="cad-mini" style="margin-top:10px" aria-expanded="false"
        onclick="parentesAbertos.add('${c.id}');repintarFicha()">${CAD_IC.mais}Parentes ou amigos</button>` : `
    <div class="cad-cartao">
      <div class="cad-tit"><span class="cad-ic">${CAD_IC.duplas}</span>Parentes ou Amigos
        <button class="cad-mini" style="margin-left:auto" aria-expanded="true" title="recolher"
          onclick="parentesAbertos.delete('${c.id}');repintarFicha()">− recolher</button></div>
      ${/* O protocolo NÃO mora mais aqui. Ele é do CASO, não do cliente: cada
           protocolo é um requerimento, com a sua DER, o seu benefício e o seu
           desfecho. Achatados numa fileira só, três protocolos de três casos
           viravam três números sem dono, e ninguém sabia qual era de qual.
           Onde eles vivem agora, os dois com propósito: na trilha do processo
           ("De onde partiu"), ao lado do NB e da DER daquele caso; e no passo
           Requerimentos anteriores da Triagem, consolidados, que é onde a
           conferência do Tema 350 acontece. A pesquisa continua achando o
           cliente pelo protocolo — ela lê o campo do caso, não este cartão. */""}
      ${prots.length?`<div class="id-secao"><label>Protocolos no INSS <small>(${prots.length} — moram no processo a que pertencem)</small></label>
        <span style="font-size:13px;color:var(--cinza)">Cada protocolo está na aba
          <b>Casos</b> do processo dele, em "De onde partiu", e todos juntos na
          <b>Triagem</b>, no passo "Requerimentos anteriores".</span></div>`:""}
      ${/* F169 · a parceria saiu daqui: já está no canto direito do nome */""}
      <div class="id-secao"><label>Parentes ou amigos <small>(cliente da base abre a ficha; outra pessoa fica anotada)</small></label>
        ${blocoParentes(c, vincs, "cad")}
      </div>
    </div>`}
    <details id="mais-opcoes" style="margin-top:14px"><summary style="cursor:pointer;color:var(--cinza)"><span class="cad-ic">${CAD_IC.engren}</span> Mais opções: cadastrar outra credencial, vincular pasta, agendar atendimento</summary>
      ${/* F23 · a credencial saiu daqui (a senha do Meu INSS já se cadastra no
           próprio campo da grade). No lugar, o registro avulso: a observação
           que não é andamento de caso nenhum — "prefere ligação de tarde",
           "surdo do ouvido esquerdo", "quem ajuda é o sobrinho José". */""}
      <div class="form-linha" style="margin-top:8px">
        <input id="ra-texto" placeholder="registrar algo avulso sobre o cliente (não é andamento de caso)"
          style="flex:1;min-width:240px"
          onkeydown="if(event.key==='Enter'){event.preventDefault();novoRegistroAvulso('${c.id}');}">
        <button onclick="novoRegistroAvulso('${c.id}')">Registrar</button>
      </div>
      ${(()=>{ const rs=((c.campos||{}).registros||[]);
        return rs.length?`<ul class="reg-avulso">${rs.slice().reverse().map((r,ri)=>{
          const quem=D.colPorId.get(r.quem);
          const idx=rs.length-1-ri;   // índice real no array (a lista sai invertida)
          return `<li><span class="q-dt">${fmt(r.em)}</span> ${esc(r.texto)}
            <small>${quem?esc(quem.nome.split(" ")[0]):""}</small>
            ${r.quem===eu.id?`<button class="cad-lap" title="registro seu, por engano? apaga"
              onclick="apagarRegistroAvulso('${c.id}',${idx})">${CAD_IC.fechar}</button>`:""}</li>`;}).join("")}</ul>`:"";
      })()}
      <div class="form-linha">
        <input id="pd-url" placeholder="colar o link da pasta deste cliente no Drive (opcional — sem link, a busca é pelo nome)"
          value="${esc((c.campos||{}).pasta_drive||"")}" style="flex:1;min-width:260px">
        <button onclick="salvarPasta('${c.id}')" title="Vincular pasta">Vincular<span class="sr-only"> pasta</span></button>
      </div>
      <div class="form-linha" style="align-items:center">
        <span style="font-size:13px;color:var(--cinza)">${CAD_IC.agenda} Agendar atendimento:</span>
        <select id="ag-tipo"><option value="002">002 — cliente antigo</option><option value="001">001 — cliente novo</option></select>
        <input type="date" id="ag-data"><input type="time" id="ag-hora" value="09:00">
        <button onclick="agendarAtendimento('${c.id}')" aria-label="Abrir no Google Agenda">${iconeFonte("gcal")} Abrir</button>
        <button class="btn-mini" onclick="irSubCad('documentos')"
          title="a lista do benefício, sugerida pelo sistema — marcar, imprimir e cada item vira checklist do caso">${CAD_IC.doc} documentos para trazer</button>
      </div>
      <p style="margin-top:8px;font-size:12px;color:var(--cinza)">Toda visualização de senha é registrada (quem e quando).</p>
    </details>`;
    })()}`}
    ${tela ? conversaAtendimento(c) : ""}`;
}
// as divisões do Cadastro, na ordem em que o atendimento acontece
// ordem da especificação F9 §2 — a do atendimento real. Mensagens fica no
// fim: saiu do menu de cima na 08.99 e não é passo do atendimento.
// F25 · o Cadastro tem TRÊS divisões (pedido do Paulo): Identificação,
// Triagem e Anotações. Documentos, Consulta e Mensagens não sumiram —
// viraram trilhos DENTRO de Anotações, porque servem ao atendimento e é lá
// que o atendimento acontece.
// F30 · o trilho do Cadastro é o próprio FLUXO: Triagem enquanto aberta;
// Anotações (a mesa do atendimento) da triagem encerrada até a decisão;
// Documentos nasce com o caso (procuração e contrato para imprimir);
// Consulta e Mensagens ganharam casa própria — o trilho interno acabou
// F31 · a Consulta mora DENTRO de Documentos (pedido do Paulo) — um botão a
// menos no trilho, e o painel traz documentos, catálogo e consulta juntos
const SUB_CAD = [["identificacao","Identificação"],["triagem","Triagem"],
                 ["anotacoes","Anotações"],["documentos","Documentos"],
                 ["pa","Primeiro atendimento"],["mapa","Mapa do dossiê"],
                 ["direito","Análise de Direito"],["mensagens","Mensagens"]];
const SUB_ANOT = [["atendimento","Atendimento"],
                  ["consulta","Consulta"],["mensagens","Mensagens"]];
let subAnot = ler("crm_subanot") || "atendimento";
// F208 · o topo da tela de atendimento, como no protótipo: nome, CPF, nascimento
// e idade, telefone, senha do Meu INSS, WhatsApp e os quatro passos
function cabecalhoAtendimento(c, cd, vis){
  const cr = ((D._ficha||{}).creds||[]).find(x=>x.tipo==="meu_inss"), dn = dnIso(c.dn), tel = String(c.telefone||"").replace(/\D/g,"");
  const zap = (D.zapFicha||[]).length ? `verZapCliente('${c.id}')` : tel ? `zapDoNumero('${tel}')` : "";
  // F219 · o passo fechado mostra quem fechou e quando (precaso.etapas); o botão conclui o passo aberto
  const pc = preCasoAberto(c), et = (pc && pc.etapas) || {};
  const feita = v => et[ETAPA_DE[v]];
  const quemFez = e => { const co = D.colPorId.get(e.quem); return `✔ ${co ? co.nome.split(" ")[0] : "concluída"}, ${fmt(e.em)}`; };
  const passo = (n, v, rot, sub) => vis[v]===false ? "" : `<button type="button" class="pa-passo${cd===v?" cur":""}${feita(v)?" feita":""}" ${cd===v?'aria-current="step"':""} onclick="irSubCad('${v}')"><i>${feita(v)?"✔":n}</i><span title="${esc(feita(v) ? quemFez(feita(v)) : sub)}"><b>${rot}</b><small>${esc(feita(v) ? quemFez(feita(v)) : sub)}</small></span></button>`;
  const concluir = pc && ETAPA_DE[cd] && !feita(cd) ? `<button type="button" class="btn-mini atend-concluir" onclick="concluirEtapa('${c.id}','${cd}')" title="grava o pré-caso (vai para a lista Escritório), marca quem concluiu este passo e abre o seguinte"><span aria-hidden="true">Salvar →</span><span class="sr-only">Salvar pré-caso →</span></button>` : "";
  // F320 · o cabeçalho mínimo da imagem aprovada: nome, CPF e idade; à direita Anotações, Salvar pré-caso e Sair.
  // Telefone, Meu INSS e WhatsApp ficam numa linha menor, sem o selo "Modo atendimento" e sem o avatar.
  const nNotas = ((c.campos||{}).atendimento||[]).filter(n=>!pc || !n.precaso_id || n.precaso_id===pc.id).length;
  return `<div class="atend-cab">
    <div class="atend-id"><div class="atend-l1"><h2 class="atend-nome">${esc(c.nome||"")}</h2>
      <span class="mono">${c.cpf ? `<span class="cop" data-cop="${esc(c.cpf)}" data-cop-msg="CPF copiado" title="clique para copiar">${fmtCpf(c.cpf)}</span>` : "CPF —"}</span>
      ${dn ? `<span class="meio-sub" title="${esc(fmt(dn))}">${idadeDe(c.dn)} anos</span>` : ""}</div>
      <div class="atend-dados">${c.telefone ? `${esc(c.telefone)} · ` : ""}${cr ? `Meu INSS com senha guardada <button class="olho" title="copiar senha (fica registrado)" onclick="copiarCred('${cr.id}')">📋</button><button class="olho" title="ver (fica registrado)" onclick="verCred('${cr.id}')">👁</button>` : `Meu INSS: senha não guardada <button type="button" class="adr-link" onclick="irSubCad('identificacao')">Guardar</button>`}</div></div>
    <span class="atend-acoes">${zap ? `<button type="button" class="btn-mini" onclick="${zap}" title="${(D.zapFicha||[]).length ? "ler o histórico do WhatsApp" : "abrir o WhatsApp"}" aria-label="WhatsApp">${iconeFonte("zap")}</button>` : ""}
      <button type="button" class="btn-mini atend-notas-bt" onclick="atendNotas()" aria-controls="atend-conversa" aria-expanded="${notasAbertas()}">Anotações ${nNotas}</button>
      ${concluir}
      <button type="button" class="btn-mini" onclick="sairModoAtendimento('${c.id}')" title="Sair do modo atendimento">Sair<span class="fp2-sr"> do modo atendimento</span></button></span>
  </div>
  <nav class="pa-passos atend-passos" aria-label="Passos do atendimento">
    ${passo("1","identificacao","Identificação","dados do cliente")}${passo("2","pa","Primeiro atendimento","situação e benefícios")}
    ${passo("3","direito","Análise de Direito",(n=>n ? `${n} ${n===1?"benefício":"benefícios"} em análise` : "trabalhos e planejamento")(Object.keys(benefSel(c)).length))}${passo("4","documentos","Documentos","pedido, guias e geração")}
  </nav>${faixaAtendimento(c, pc)}${(vs=>vs.length>1 ? `<nav class="pc-escolha" aria-label="Pré-caso em atendimento"><span class="meio-sub">Pré-caso:</span>${vs.map(p=>
      `<button type="button" class="pc-esc-bt${pc && p.id===pc.id?" on":""}" ${pc && p.id===pc.id?'aria-current="true"':""} onclick="escolherPreCaso('${c.id}','${escJs(p.id)}')">${esc(p.especie||"Em formação")}</button>`).join("")}</nav>` : "")(preCasosVivos(c))}`;
}
// F235 · o alto da tela de atendimento, em todos os passos: por que a pessoa veio e o prazo que corre,
// antes de qualquer quadro (o relato da recepção ficava no pé da página e o prazo no 4º quadro)
// F235 · o prazo do recurso que só o relato traz (a carta da decisão com aviso de recebimento): 30 dias da ciência, no 1º dia útil
function prazoDoRelato(c){
  const t = relatoDe(c), m = t.match(/\b(?:AR|aviso de recebimento|ci[êe]ncia)\b[^.\n]{0,50}?(\d{2}\/\d{2}\/\d{4})/i);
  if(!m || !/negad|indeferid|cessad|cortad/i.test(t)) return null;
  const ci = isoBr(m[1]); if(!ci) return null;
  const f = proxDiaUtilAdm(somaDias(ci, 30));
  return f >= hoje() ? {fatal:f, ciencia:ci, texto:`recurso ao CRPS até ${fmtBarra(f)}, contado da ciência em ${fmtBarra(ci)} (aviso de recebimento, pelo relato da recepção)`} : null;
}
// F235 · o parente ou o amigo que veio sem procuração não leva cópia nem detalhe do processo (IN 128, art. 602, § 2º)
function terceiroSemProcuracao(c){
  const t = relatoDe(c); if(!/sem procura|n[ãa]o (assinou|tem|trouxe) procura/i.test(t)) return "";
  const m = t.match(/\b(a filha|o filho|a irm[ãa]|o irm[ãa]o|a esposa|o marido|a m[ãa]e|o pai|a neta|o neto|a sobrinha|o sobrinho|a nora|o genro|a cunhada|o cunhado|um parente|uma parente|um familiar|a vizinha|o vizinho)\b[^.\n]{0,60}?\bveio\b/i);
  if(!m) return "";
  const quem = m[1].toLowerCase().replace(/^a /, "à ").replace(/^o /, "ao ").replace(/^(um|uma) /, "a $1 "), tit = String(c.nome||"").split(" ")[0] || "o titular";
  return `O processo é de ${tit}. Não entregue cópia nem detalhe do processo ${quem}, que veio sem procuração, e não peça a senha do gov.br de ${tit}: só o titular ou o advogado com procuração recebem (IN 128, art. 602, § 2º). Gere a procuração para ${tit} assinar em casa; quem veio leva e traz.`;
}
function faixaAtendimento(c, pc){
  const notas = ((c.campos||{}).atendimento||[]).filter(n=>n && n.texto && (!pc || !n.precaso_id || n.precaso_id===pc.id));
  const nota = notas.slice().sort((a, b)=>String(a.em||"").localeCompare(String(b.em||"")))[0];
  let prazos = []; try{ prazos = prazosDoDossie(c); }catch(e){}
  // F235 · sem a cópia no dossiê, o prazo vem do relato; e o aviso de quem veio sem procuração fica no alto, em todos os passos
  if(!prazos.length){ const pr = prazoDoRelato(c); if(pr) prazos = [pr]; }
  // F235 · a certidão de óbito ou de prisão trazida dá o prazo da pensão ou do auxílio-reclusão desde o fato (90 dias, Lei 8.213, art. 74, I)
  try{ for(const ce of certidoesDoDossie(c.id)){ const f = ce.obito || ce.prisao; if(!f || f < "2019-01-18") continue; const lim = somaDias(f, 90);
    if(lim >= hoje()) prazos.push({fatal:lim, texto:`pedir ${ce.obito ? "a pensão por morte" : "o auxílio-reclusão"} até ${fmtBarra(lim)} (90 dias ${ce.obito ? "do óbito" : "da prisão"}, em ${fmtBarra(f)}) para receber desde ${ce.obito ? "o óbito" : "a prisão"}; filho menor de 16 tem 180 dias`}); } }catch(e){}
  const terc = terceiroSemProcuracao(c);
  if(!nota && !prazos.length && !terc) return "";
  const t = nota ? String(nota.texto) : "";
  // F320 · com o prazo correndo, a faixa é só ele, em vermelho, uma vez; o relato da recepção fica nas Anotações
  if(prazos.length) return `<div class="atend-faixa atend-faixa-prazo" role="note">${prazos.map(p=>`<p class="atend-prazo"><b>Prazo correndo:</b> ${esc(p.texto)} · <b>${esc(faltamTxt(p.fatal))}</b></p>`).join("")}
    ${terc ? `<p class="atend-prazo" role="alert"><b>Quem veio não é o titular.</b> ${esc(terc)}</p>` : ""}</div>`;
  return `<div class="atend-faixa" role="note">${nota ? (t.length > 280 ? `<details class="atend-relato"><summary><b>Por que veio:</b> ${esc(t.slice(0, 220).replace(/\s+\S*$/, ""))}… <span class="meio-sub">ver tudo</span></summary><p>${esc(t)}</p></details>` : `<p><b>Por que veio:</b> ${esc(t)}</p>`) : ""}
    ${prazos.map(p=>`<p class="atend-prazo"><b>Prazo:</b> ${esc(cap1(p.texto))} · <b>${esc(faltamTxt(p.fatal))}</b></p>`).join("")}
    ${terc ? `<p class="atend-prazo" role="alert"><b>Quem veio não é o titular.</b> ${esc(terc)}</p>` : ""}</div>`;
}
const _atendAberto = new Set();
// F277 · o atendimento é do advogado (pedido do Paulo, 25.10.2026): a recepção faz o cadastro, e o + atendimento, o pré-caso
// e o caso ficam com quem tem o cargo de advogado (ou administra)
function podeAtender(){ return !!eu && (eu.cargo==="advogado" || souAdmin()); }
// o pré-caso aberto nesta sessão que ainda não foi salvo: sair do atendimento sem salvar o descarta
const _pcNovo = new Set();
const ATEND_SUBS = new Set(["pa","mapa","direito","documentos"]);
// F220 · a conversa da equipe dentro da tela de atendimento: as mesmas
// anotações do atendimento (campos.atendimento), com @nome que vira menção,
// sem sair da tela. Gerado o caso, elas viram andamentos dele, como sempre.
// F603 · as anotações da tarefa do 🙋 Escritório no Microsoft To Do: desde a F602 são andamentos (origem todo) da
// própria linha do pré-caso, que a ficha já carrega em D._andsFicha; só leitura (pedido do Paulo de 15.11.2026)
function notasTodoDoPc(c, pc){
  if(!pc || !pc.caso_id || (D._ficha||{}).cliId!==c.id) return [];
  return (D._andsFicha||[]).filter(a=>a.caso_id===pc.caso_id && a.origem==="todo")
    .sort((a, b)=>String(b.criado_em||"").localeCompare(String(a.criado_em||"")));
}
function notasTodoHtml(ts){
  return `<ol class="atend-notas">${ts.map(a=>`<li class="atend-nota"><div class="atend-nota-cab"><b>${esc(((D.colPorId.get(a.autor_id)||{}).nome||"").split(" ")[0] || "Microsoft To Do")}</b><span class="meio-sub">${a.criado_em?esc(fmt(String(a.criado_em).slice(0,10))):""} · Microsoft To Do</span></div><div class="atend-nota-txt">${esc(String(a.texto||""))}</div></li>`).join("")}</ol>`;
}
function conversaAtendimento(c){
  const pc = preCasoAberto(c), todo = notasTodoDoPc(c, pc), idsTodo = new Set(todo.map(a=>a.id));
  const ns = ((c.campos||{}).atendimento||[]).filter(n=>(!pc || !n.precaso_id || n.precaso_id===pc.id) && !(n.origem==="todo" && idsTodo.has(n.id))).slice(-30).reverse();
  // F283 · no modo atendimento as anotações ficam abertas, fixas à direita em todos os passos (pedido do Paulo, 26.10.2026)
  return `<details class="atend-conversa${notasAbertas() ? "" : " gaveta-fechada"}" id="atend-conversa" open ondragover="event.preventDefault()" ondrop="probSoltar(event)">
    <summary>Anotações do atendimento${ns.length?` (${ns.length})`:""} <span class="meio-sub">@nome avisa a pessoa</span></summary>
    <div class="atend-conv-corpo">
      ${/* F283b · o campo de escrever primeiro e maior; as anotações em cartões; os documentos em bloco próprio */""}
      <div class="atend-conv-nova"><textarea id="atend-nota" rows="6" placeholder="Anote o que deve ser feito. Arraste aqui uma pendência; @Amanda avisa a Amanda"></textarea>
        <button type="button" class="adr-bt adr-primario" onclick="notaDoAtendimento('${c.id}')">Anotar</button>
        ${botaoGravarAtend()}</div>
      <div class="atend-bloco"><h4>Anotações${ns.length?` (${ns.length})`:""}</h4>
      ${ns.length ? `<ol class="atend-notas">${ns.map(n=>`<li class="atend-nota"><div class="atend-nota-cab"><b>${esc(n.quem||"")}</b><span class="meio-sub">${n.em?esc(fmtTS(n.em)):""}</span></div><div class="atend-nota-txt">${destacarMencoes(esc(String(n.texto||"")))}</div>${(n.anexos||[]).map(a=>`<button class="btn-mini" onclick="abrirAnexo('${a.id}')">📎 ${esc(a.nome||"anexo")}</button>`).join(" ")}</li>`).join("")}</ol>`
        : `<p class="meio-sub">Nenhuma anotação ainda neste atendimento.</p>`}</div>
      ${todo.length ? `<div class="atend-bloco atend-todo"><h4>Do Microsoft To Do (${todo.length})</h4>${notasTodoHtml(todo)}</div>` : ""}
      ${docsAnotadosHtml(c, pc)}
      ${atalhosDossie(c)}
    </div></details>
    <button type="button" class="atend-aba-notas" onclick="atendNotas()" aria-controls="atend-conversa" aria-expanded="${notasAbertas()}">Anotações · Documentos a pedir</button>`;
}
// F320 · as anotações viram gaveta à direita (imagem aprovada): fechada, fica a aba vertical; abre pelo botão do cabeçalho.
// A escolha fica no navegador. Abaixo de 1100 px continuam no pé, sempre abertas.
const notasAbertas = () => ler("crm_atend_notas")==="1";
function atendNotas(abrir){
  const on = abrir==null ? !notasAbertas() : !!abrir; guardar("crm_atend_notas", on ? "1" : "0");
  const g = document.getElementById("atend-conversa"); if(g) g.classList.toggle("gaveta-fechada", !on);
  document.querySelectorAll('[aria-controls="atend-conversa"]').forEach(b=>b.setAttribute("aria-expanded", String(on)));
  const d = document.getElementById("detalhe"); if(d) d.classList.toggle("notas-on", on);
  if(on){ const ta = document.getElementById("atend-nota"); if(ta) ta.focus(); }
}
// F283c · no pé das anotações, os três papéis que mais se consultam no atendimento, direto do dossiê (pedido do Paulo, 26.10.2026)
const ATALHOS_DZ = [["CNIS Resumido", /CNIS resumido/i], ["CNIS Completo", /CNIS completo/i], ["Declaração de Beneficiário", /declara[çc][ãa]o de benefici/i]];
function atalhosDossie(c){
  const ds = docsDoDossie(c.id).sort((a, b)=>String(b.criado_em||"").localeCompare(String(a.criado_em||"")));
  return `<div class="atend-atalhos">${ATALHOS_DZ.map(([rot, rx])=>{ const a = ds.find(d=>rx.test(fonteDoDossie(d)[1]));
    return a ? `<button type="button" class="adr-bt" onclick="abrirAnexo('${a.id}')">${rot}</button>`
      : `<button type="button" class="adr-bt" disabled title="não está no dossiê">${rot}</button>`; }).join("")}</div>`;
}
