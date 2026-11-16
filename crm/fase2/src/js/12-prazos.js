// F450 · ARRASTAR PARA OUTRO DIA NO PLANEJADO (proposta 6 do Todoist, aprovada pelo Paulo em 08.11.2026)
// No Mês, o retorno do To Do, a volta à fila, o lembrete da anotação e a tarefa pessoal vão ao dia em que se soltam, pela
// mesma gravação do Reagendar (com desfazer). Prazo fatal, prazo do tribunal, recurso e exigência não mudam de data assim:
// soltos, abrem a janela do prazo na aba Prazos do cliente. Perícia e audiência não se arrastam.
function ligarArrastoCal(){
  document.querySelectorAll(".cal-it[data-ci]").forEach(el=>{
    el.ondragstart = e=>{ e.dataTransfer.setData("text/plain", el.dataset.ci); e.dataTransfer.effectAllowed = "move"; el.classList.add("arrastando"); };
    el.ondragend = ()=>{ el.classList.remove("arrastando"); document.querySelectorAll(".cal-dia.alvo").forEach(d=>d.classList.remove("alvo")); };
  });
  document.querySelectorAll(".cal-dia[data-dia]").forEach(d=>{
    d.ondragover = e=>{ e.preventDefault(); d.classList.add("alvo"); };
    d.ondragleave = ()=>d.classList.remove("alvo");
    d.ondrop = e=>{ e.preventDefault(); d.classList.remove("alvo"); soltarNoDia(_calIt[+e.dataTransfer.getData("text/plain")], d.dataset.dia); };
  });
}
function soltarNoDia(i, dia){
  if(!i || !dia || dia===i.dia) return;
  if(i.pz) return abrirPrazoDoCal(i.cliId, i.pz.casoId, i.dia);
  if(dia < hoje()) return aviso("Escolha hoje ou um dia adiante");
  _reagVenc = [i.mov]; aplicarReagendar(dia);
}
async function abrirPrazoDoCal(cliId, casoId, data){
  aviso("Prazo fatal não muda de data pelo calendário: confira na janela do prazo", false);
  await abrirFicha(cliId); if(clienteAberto!==cliId || soIdentificacao()) return;
  abaAtiva = 5; repintarFicha();
  const j = (_pzCli||[]).findIndex(x=>x.data===data && (!x.casoId || x.casoId===casoId));
  if(j>=0) abrirPainelPrazo(j, "cli");
}
function irMes(m){ calMes=m; calVisao="mes"; guardar("crm_cal_visao","mes"); render(); }

// ── escolher o fundo da lista ─────────────────────────────────────────────
// O To Do deixa cada lista com a sua cara. Aqui a escolha é do escritório,
// não de cada pessoa: quem diz "está na lista amarela" por telefone precisa
// que o outro veja a mesma coisa.
function abrirFundos(){
  const chave = buscaTxt ? "dashboard" : visao;
  const atual = fundoDaLista(chave) || "";
  const nome = (document.getElementById("titulo-lista").textContent||"esta lista").trim();
  document.getElementById("modal").innerHTML=`
    <div class="modal-fundo">
      <div class="modal-cx">
        <div class="modal-cab">
          <div><strong>🎨 Fundo de ${esc(nome)}</strong>
            <div class="meio-sub">Vale para todo o escritório — todos veem a mesma lista da mesma cor.</div></div>
          <button class="btn-mini" onclick="fecharCaixa()">✕</button>
        </div>
        <div class="fundos-grade">
          ${FUNDOS_PRONTOS.map(([n,v])=>`<button class="fundo-op ${atual===v?"sel":""}"
            onclick="salvarFundo('${chave}', ${JSON.stringify(v).replace(/"/g,"&quot;")})"
            style="background:${v||"var(--fundo)"}"><span>${esc(n)}</span></button>`).join("")}
        </div>
        <div class="form-linha" style="margin-top:14px;align-items:center">
          <label class="btn-mini" style="cursor:pointer">🖼 Enviar uma imagem
            <input type="file" accept="image/*" style="display:none" onchange="subirFundo('${chave}')" id="fundo-arq"></label>
          ${atual&&/^https?:/.test(atual)?`<span class="meio-sub">imagem em uso</span>`:""}
          <button class="btn-mini" style="margin-left:auto" onclick="salvarFundo('${chave}','')" title="voltar ao padrão"><span aria-hidden="true">Restaurar</span><span class="sr-only">voltar ao padrão</span></button>
        </div>
      </div>
    </div>`;
  document.getElementById("modal").style.display="block";
}
async function salvarFundo(chave, valor){
  try{
    await api(`/rest/v1/lista_pref`,{method:"POST",
      headers:{Prefer:"resolution=merge-duplicates,return=minimal"},
      body:JSON.stringify({chave, fundo:valor||null})});
  }catch(e){ return aviso("Rode o schema.sql mais novo no Supabase para usar os fundos"); }
  const p=(D.prefPorLista||new Map()).get(chave)||{chave};
  p.fundo=valor||null; D.prefPorLista.set(chave,p);
  // fecharCaixa, não fecharEscolha: trocar papel de parede não pode derrubar
  // a ficha do cliente que estava aberta ao lado
  fecharCaixa(); render();
  aviso(valor?"Fundo trocado 🎨":"Fundo de volta ao padrão");
}
async function subirFundo(chave){
  const inp=document.getElementById("fundo-arq"), arq=inp&&inp.files&&inp.files[0];
  if(!arq) return;
  if(arq.size > 5*1024*1024) return aviso("Imagem grande demais (máximo 5 MB)");
  const caminho=`${chave.replace(/[^a-z0-9]+/gi,"-")}-${Date.now()}-${nomeSeguro(arq.name)}`;
  aviso("Enviando a imagem…", false);
  try{
    const r=await fetch(`${CONFIG.SUPABASE_URL.replace(/\/$/,"")}/storage/v1/object/fundos/${caminho}`,{
      method:"POST", headers:{apikey:CONFIG.ANON_KEY,
        Authorization:"Bearer "+(sessao?sessao.access_token:CONFIG.ANON_KEY),
        "Content-Type":arq.type||"application/octet-stream"}, body:arq});
    if(!r.ok) throw new Error(await r.text());
    await salvarFundo(chave, `${CONFIG.SUPABASE_URL.replace(/\/$/,"")}/storage/v1/object/public/fundos/${caminho}`);
  }catch(e){ aviso("Não consegui enviar a imagem"); }
}

// ── arrastar ──────────────────────────────────────────────────────────────
// Arrastar o cliente para uma lista do menu move o caso; arrastar as listas
// entre si muda a ordem do menu. O botão direito continua funcionando para
// quem já pegou o costume.
let arrastando = null;                       // {tipo:"cliente"|"lista", id}
function ligarArrasteCartoes(){
  document.querySelectorAll(".cartao[data-cli]").forEach(el=>{
    el.draggable = true;
    el.ondragstart = e=>{
      arrastando = {tipo:"cliente", id:el.dataset.cli};
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", el.dataset.cli);
      el.classList.add("arrastando");
    };
    el.ondragend = ()=>{ el.classList.remove("arrastando"); arrastando=null;
      document.querySelectorAll(".lista-item.alvo").forEach(x=>x.classList.remove("alvo")); };
  });
}
function ligarArrasteListas(){
  document.querySelectorAll(".lista-item[data-v]").forEach(el=>{
    const v = el.dataset.v;
    // as listas do escritório podem ser reordenadas entre si
    if(v.startsWith("fase:")){
      el.draggable = true;
      el.ondragstart = e=>{ arrastando={tipo:"lista", id:v};
        e.dataTransfer.effectAllowed="move"; e.dataTransfer.setData("text/plain", v);
        el.classList.add("arrastando"); };
      el.ondragend = ()=>{ el.classList.remove("arrastando"); arrastando=null;
        document.querySelectorAll(".lista-item.alvo").forEach(x=>x.classList.remove("alvo")); };
    }
    el.ondragover = e=>{
      if(!arrastando) return;
      if(arrastando.tipo==="cliente" && !v.startsWith("fase:")) return;   // cliente só cai em lista de fase
      if(arrastando.tipo==="lista" && !v.startsWith("fase:")) return;
      if(arrastando.tipo==="lista" && v===arrastando.id) return;
      e.preventDefault(); e.dataTransfer.dropEffect="move"; el.classList.add("alvo");
    };
    el.ondragleave = ()=>el.classList.remove("alvo");
    el.ondrop = async e=>{
      e.preventDefault(); el.classList.remove("alvo");
      const a=arrastando; arrastando=null;
      if(!a) return;
      if(a.tipo==="cliente") return soltarClienteNaLista(a.id, v.slice(5));
      if(a.tipo==="lista")   return reordenarListas(a.id, v);
    };
  });
}
// solta o cliente numa lista: move os casos ativos dele para aquela fase
async function soltarClienteNaLista(cliId, fase){
  const c=D.cliPorId.get(cliId); if(!c) return;
  const ks=(D.casosDoCliente.get(cliId)||[]).filter(k=>k.fase!=="encerrado" && k.fase!==fase);
  if(!ks.length) return aviso("Este cliente já está nessa lista");
  const alvo = ks.length===1 ? ks[0]
    : ks.find(k=>k.id===casoSel) || null;
  if(!alvo){                                  // mais de um processo: perguntar em qual
    arrastando=null;
    return escolherProcessoParaMover(cliId, ks, fase);
  }
  const lista=(LISTAS_MOVER.find(([,f])=>f===fase)||[])[0];
  alvo.fase=fase; if(lista) alvo.mover_para=lista;
  await patchCaso(alvo.id, {fase, ...(lista?{mover_para:lista}:{})});
  montarSidebar(); render();
  aviso(`${c.nome} → ${(FASES.find(x=>x[0]===fase)||[])[1]||fase}`);
}
function escolherProcessoParaMover(cliId, ks, fase){
  const c=D.cliPorId.get(cliId)||{};
  const rot=(FASES.find(x=>x[0]===fase)||[])[1]||fase;
  document.getElementById("modal").innerHTML=`
    <div class="modal-fundo">
      <div class="modal-cx">
        <div class="modal-cab">
          <div><strong>${esc(c.nome||"Cliente")}</strong> tem mais de um processo
            <div class="meio-sub">Qual deles vai para <strong>${esc(rot)}</strong>?</div></div>
          <button class="btn-mini" onclick="fecharEscolha()">✕</button>
        </div>
        ${ks.map(k=>`<button class="proc-op" onclick="moverProcessoSolto('${k.id}','${fase}')">
          <span class="proc-lista">${esc(listaDe(k))}</span>
          <span class="proc-nome">${esc(tituloCaso(k))}</span>
          <span class="proc-sub">${esc(NOME_FASE[k.fase]||k.fase)}</span></button>`).join("")}
      </div>
    </div>`;
  document.getElementById("modal").style.display="block";
}
async function moverProcessoSolto(casoId, fase){
  fecharEscolha();
  const k=D.casoPorId.get(casoId); if(!k) return;
  const lista=(LISTAS_MOVER.find(([,f])=>f===fase)||[])[0];
  k.fase=fase; if(lista) k.mover_para=lista;
  await patchCaso(casoId, {fase, ...(lista?{mover_para:lista}:{})});
  montarSidebar(); render();
  aviso(`Movido para ${(FASES.find(x=>x[0]===fase)||[])[1]||fase}`);
}
// ordem das listas do escritório: guardada no banco, vale para todos
function ordemDasFases(){
  const pos = v => { const p=(D.prefPorLista||new Map()).get("fase:"+v);
    return (p && p.ordem!=null) ? p.ordem : FASES.findIndex(x=>x[0]===v); };
  return FASES.slice().sort((a,b)=>pos(a[0])-pos(b[0]));
}
async function reordenarListas(origem, destino){
  const atual=ordemDasFases().map(x=>"fase:"+x[0]);
  const de=atual.indexOf(origem), para=atual.indexOf(destino);
  if(de<0 || para<0 || de===para) return;
  atual.splice(para, 0, atual.splice(de,1)[0]);
  const linhas=atual.map((chave,i)=>({chave, ordem:i,
    fundo:((D.prefPorLista||new Map()).get(chave)||{}).fundo||null}));
  try{
    await api(`/rest/v1/lista_pref`,{method:"POST",
      headers:{Prefer:"resolution=merge-duplicates,return=minimal"}, body:JSON.stringify(linhas)});
  }catch(e){ return aviso("Rode o schema.sql mais novo no Supabase para reordenar as listas"); }
  linhas.forEach(l=>{ const p=D.prefPorLista.get(l.chave)||{chave:l.chave};
    p.ordem=l.ordem; D.prefPorLista.set(l.chave,p); });
  montarSidebar();
  aviso("Ordem das listas guardada");
}

// ── ＋ Adicionar, fixo no pé da lista ─────────────────────────────────────
// No To Do é assim que quase toda tarefa nasce: o campo está sempre ali, você
// digita e dá Enter. Aqui ele cria o cliente e o primeiro caso já na lista
// aberta. Aceita o formato do To Do — "Nome #CPF" — porque a equipe já digita
// assim há anos.
function mostrarAddRodape(){
  const el=document.getElementById("add-rodape");
  if(!el) return;
  const mostra = !buscaTxt && visao.startsWith("fase:");
  el.style.display = mostra ? "" : "none";
  if(mostra){
    const f=visao.slice(5), rot=(FASES.find(x=>x[0]===f)||[])[1]||"";
    document.getElementById("add-nome").placeholder =
      `Adicionar em ${rot.replace(/^\S+\s/,"")} (nome, ou Nome #CPF)`;
  }
}
async function addNaLista(){
  const inp=document.getElementById("add-nome"), bi=document.getElementById("add-ben");
  const bruto=(inp.value||"").trim();
  if(!bruto) return inp.focus();
  const fase=visao.slice(5);
  // "Maria dos Santos #12345678900" -> nome + CPF, como as tarefas do To Do
  const m=bruto.match(/^(.*?)\s*#\s*([\d.\-]+)\s*$/);
  const nome=(m?m[1]:bruto).trim(), cpf=m?digitosCpf(m[2]):null;
  if(!nome) return aviso("Falta o nome");
  if(cpf && cpf.length!==11) return aviso("O CPF tem 11 dígitos");
  if(cpf){
    let ja=D.clientes.find(x=>digitosCpf(x.cpf)===cpf);
    if(!ja){ const achados=await api(`/rest/v1/clientes?select=*&cpf=eq.${cpf}`).catch(()=>[]);
             if(achados&&achados.length){ ja=achados[0]; D.clientes.push(ja); D.cliPorId.set(ja.id,ja); } }
    if(ja) return avisoCpfRepetido(ja, nome);
  }
  const beneficio=(bi.value||"").trim() || null;
  const [cli]=await api(`/rest/v1/clientes`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify({nome, cpf})});
  const [caso]=await api(`/rest/v1/casos`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify({cliente_id:cli.id, titulo:nome, beneficio, fase})});
  await api(`/rest/v1/atribuicoes`,{method:"POST",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({caso_id:caso.id, colaborador_id:eu.id})}).catch(()=>{});
  if(beneficio) await aplicarChecklistCaso(caso, true).catch(()=>{});
  inp.value=""; bi.value="";
  await carregar(); montarSidebar(); render();
  await avisarCasoNovo(caso.id, cli.id, "＋ Adicionar, no pé da lista");
  inp.focus();                                  // pronto para o próximo, sem tirar a mão
  aviso(`✔ ${nome} entrou na lista`);
}

function renderParcerias(){
  tituloLista("🤝 Parcerias");
  document.getElementById("sub-lista").textContent=
    "Casos em parceria com advogados externos — vêm das etiquetas #Nome no título do To Do (ex.: #Laís).";
  const com = D.casos.filter(k=>k.parceria && k.fase!=="encerrado");
  const porParceiro = {};
  com.forEach(k=>k.parceria.split(",").map(p=>p.trim()).filter(Boolean)
    .forEach(p=>{ (porParceiro[p]=porParceiro[p]||[]).push(k); }));
  const nomes = Object.keys(porParceiro).sort((a,b)=>porParceiro[b].length-porParceiro[a].length);
  document.getElementById("conteudo-meio").innerHTML =
    nomes.map(n=>`<h3 class="secao">🤝 ${esc(n)} (${porParceiro[n].length})</h3>`
      + grupoClientes(porParceiro[n]).map(([c,ks])=>cartaoCliente(c,ks)).join("")).join("")
    || "<p class='meio-sub'>Nenhum caso com parceria. Marque com #Nome no título do To Do (ex.: #Laís) ou defina na ficha.</p>";
  ligarCartoes();
}

function barras(pares){
  const max=Math.max(...pares.map(p=>p[1]),1);
  return pares.map(([r,q])=>`<div class="barra"><span class="rot" title="${esc(r)}">${esc(r)}</span><div class="tubo"><i style="width:${q/max*100}%"></i></div><span class="qt">${q}</span></div>`).join("");
}
// ══ F148 · A DASHBOARD DO VISUAL NOVO (blueprint aprovado pelo Paulo, 27.09.2026)
// Três perguntas numa tela: o que vence, quanto entra, como anda a carteira.
// Tudo sai do que já está carregado em D; nenhuma coluna nova no banco.
// Performance percebida: o esqueleto entra no MESMO quadro em que se clica
// (com a geometria final, sem salto de layout), mas só aparece depois de 150 ms,
// então carga rápida não pisca cinza. Os blocos entram um a um, na ordem de
// leitura, cada um numa tarefa própria, e a troca de tela cancela o que falta.
let dashPer = 90, dashCol = null, dashVez = 0;
const DASH_PER = [[30,"30 dias"],[90,"90 dias"],[365,"12 meses"]];
function isoMais(n, base){ const d=new Date((base||hoje())+"T12:00:00"); d.setDate(d.getDate()+n); return d.toLocaleDateString("sv"); }
function mesDe(iso){ return String(iso||"").slice(0,7); }
function mesesAtras(n){ const d=new Date(hoje()+"T12:00:00"); d.setDate(1); d.setMonth(d.getMonth()-n); return d.toLocaleDateString("sv").slice(0,7); }
const MES_CURTO = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const rotMes = m => MES_CURTO[+m.slice(5,7)-1];
const reais = v => Number(v||0).toLocaleString(IDIOMA,{style:"currency",currency:"BRL",maximumFractionDigits:0});
// natureza da linha da agenda: é ela que pinta a régua de prazos
function natDoItem(it){
  if(it.fatal) return "fatal";
  if(it.ev || (it.tc && (it.tc.natureza||"compromisso")==="compromisso") || /prorrogação/.test(it.resumo||"")) return "compromisso";
  return "lembrete";
}
function dataDoResultado(k){ return k.decisao_em || k.dib || (k.encerrado_em||"").slice(0,10) || null; }
const viaJudicial = k => !!(soDig(k.processo) || (Array.isArray(k.processos) && k.processos.length));
// A CONTA INTEIRA, pura: recebe o filtro e devolve todos os números da tela.
// É o que os testes conferem com dados fictícios.
function metricasDash(col, dias){
  const hj = hoje(), e7 = isoMais(7), e30 = isoMais(30), desde = isoMais(-dias);
  const meses = dias<=30 ? 3 : dias<=90 ? 6 : 12;
  const ms = Array.from({length:meses},(_,i)=>mesesAtras(meses-1-i));
  const itens = itensAgenda(col);
  const casos = ativos().filter(k=>!col || (D.atrDoCaso.get(k.id)||[]).includes(col));
  const pgs = (D.pagamentos||[]).filter(p=>p.status!=="cancelado" && !valorSuspeito(p));   // F236 · o valor a conferir fica fora
  const abertos = pgs.filter(p=>p.status==="aberto");
  // prazos
  const venc = itens.filter(i=>i.data<hj), sete = itens.filter(i=>i.data>=hj && i.data<=e7);
  const regua = Array.from({length:30},(_,i)=>{ const d=isoMais(i);
    const n={fatal:0,compromisso:0,lembrete:0}; itens.filter(x=>x.data===d).forEach(x=>n[natDoItem(x)]++); return {d, ...n}; });
  const urgentes = [...venc, ...sete].sort((a,b)=>(b.fatal?1:0)-(a.fatal?1:0) || (a.data<b.data?-1:1)).slice(0,5);
  // financeiro
  const aReceber30 = abertos.filter(p=>p.vencimento && p.vencimento>=hj && p.vencimento<=e30).reduce((s,p)=>s+Number(p.valor||0),0);
  const fin = ms.map(m=>({m,
    recebido: pgs.filter(p=>p.status==="recebido" && mesDe(p.pago_em)===m).reduce((s,p)=>s+Number(p.valor||0),0),
    previsto: pgs.filter(p=>mesDe(p.vencimento)===m).reduce((s,p)=>s+Number(p.valor||0),0)}));
  const atraso = p => Math.round((new Date(hj+"T12:00:00")-new Date(p.vencimento+"T12:00:00"))/864e5);
  // teste 11.88, ADM-03: o critério do 💰 Recebimentos (a parcela sem valor é "a calcular", não atraso; a sem data não "vence")
  const venceu = p => !pgSemValor(p) && p.vencimento && p.vencimento<hj;
  const aging = [["A vencer", p=>!pgSemValor(p) && p.vencimento && p.vencimento>=hj, "ok"],
    ["Até 30 dias", p=>venceu(p) && atraso(p)<=30, "aviso"],
    ["31 a 90 dias", p=>venceu(p) && atraso(p)>30 && atraso(p)<=90, "serio"],
    ["Mais de 90 dias", p=>venceu(p) && atraso(p)>90, "critico"],
    ["Sem data", p=>!pgSemValor(p) && !p.vencimento, "ok"]]
    .map(([rot,f,tom])=>{ const l=abertos.filter(f); return {rot, tom, n:l.length, v:l.reduce((s,p)=>s+Number(p.valor||0),0)}; });
  const nCalc = abertos.filter(pgSemValor).length;
  if(nCalc) aging.push({rot:`A calcular (${nCalc})`, tom:"ok", n:nCalc, v:0});
  // benefícios
  const conc = D.casos.filter(k=>k.resultado==="deferido" && dataDoResultado(k));
  const concMes = m => conc.filter(k=>mesDe(dataDoResultado(k))===m).length;
  const mAtual = mesDe(hj), mAnt = mesesAtras(1);
  const FUNIL = [["escritorio","Escritório"],["peticao_inicial","Petições iniciais"],["inss","INSS"],["conselho","Conselho de Recursos"],["judicial","Judicial"],["pagamento","Pagamento"]];
  const funil = FUNIL.map(([f,rot])=>({f, rot, n:casos.filter(k=>k.fase===f).length}));
  const comRes = D.casos.filter(k=>["deferido","indeferido","acordo"].includes(k.resultado));
  const exito = l => { const r=l.filter(k=>["deferido","indeferido","acordo"].includes(k.resultado));
    return r.length>=5 ? Math.round(100*r.filter(k=>k.resultado!=="indeferido").length/r.length) : null; };
  const porEsp = {}; casos.forEach(k=>{ const e=k.especie||"sem espécie"; porEsp[e]=(porEsp[e]||0)+1; });
  const especies = Object.entries(porEsp).sort((a,b)=>b[1]-a[1]).slice(0,8)
    .map(([e,n])=>({e, nome: e==="sem espécie"?e:(nomeDaEspecie(e)||e), n, exito: exito(D.casos.filter(k=>(k.especie||"sem espécie")===e))}));
  // os cinco indicadores a mais
  const cessam = casos.filter(k=>k.dcb && k.dcb>=hj && k.dcb<=e30 && !k.dcb_prorrogacao_pedida);
  const exig = casos.filter(k=>k.exigencia_prazo);
  const limRev = isoMais(-(+(cfgApp("revisao_dias")||90)));
  const parados = casos.filter(k=>!k.revisado_em || k.revisado_em<=limRev);
  const semAcao = casos.filter(k=>!k.prazo && !k.exigencia_prazo && !(D.tarefasPorCaso.get(k.id)||[]).length);
  const noPer = comRes.filter(k=>(dataDoResultado(k)||"")>=desde);
  const futuras = (D.apos||[]).filter(a=>a.data>=hj && a.data<=isoMais(365));
  const lembs12 = (D.lembretes||[]).filter(l=>l.ativo!==false && l.proximo_em>=hj && l.proximo_em<=isoMais(365));
  // F160 · a carga é o que cada um TEM NA MÃO (lição do Tramitação Inteligente):
  // tarefas abertas, as de hoje e as vencidas, por pessoa. Uma tarefa com dois
  // responsáveis conta para os dois, de propósito. Os andamentos escritos em
  // 30 dias continuam como medida de movimento.
  const tarefasAbertas = [...(D.tarefasPorCaso||new Map()).values()].flat().filter(t=>!t.concluida_em && t.lembrar_em);
  const equipe = equipeAtiva().map(c=>{ const minhas = tarefasAbertas.filter(t=>t.colaborador_id===c.id); return {c,
    ands: (D.and30||[]).filter(a=>a.autor_id===c.id).length,
    abertas: minhas.length, hojeN: minhas.filter(t=>t.lembrar_em===hj).length,
    venc: minhas.filter(t=>t.lembrar_em<hj).length}; }).sort((a,b)=>b.abertas-a.abertas || b.ands-a.ands);
  // F160 · de onde vêm os clientes que entraram no período, pela origem do cadastro
  const novos = (D.clientes||[]).filter(c=>(c.criado_em||"").slice(0,10)>=desde);
  const porOrigem = {}; novos.forEach(c=>{ const o=origemDe(c)||""; porOrigem[o]=(porOrigem[o]||0)+1; });
  const origens = ORIGENS_CLIENTE.map(([v,r])=>({v, rot:r, n:porOrigem[v]||0})).filter(x=>x.n).sort((a,b)=>b.n-a.n);
  const semOrigem = porOrigem[""]||0;
  return {
    kpi: { vencidos: venc.length, vencFatal: venc.filter(i=>i.fatal).length, sete: sete.length,
      aReceber30, conc: concMes(mAtual), concAnt: concMes(mAnt),
      trilhaSete: regua.slice(0,14).map(r=>r.fatal+r.compromisso+r.lembrete),
      trilhaConc: ms.map(concMes),
      trilhaRec: Array.from({length:8},(_,i)=>abertos.filter(p=>p.vencimento>=isoMais(i*7) && p.vencimento<isoMais(i*7+7)).reduce((s,p)=>s+Number(p.valor||0),0)) },
    regua, urgentes, fin, aging, funil, especies, origens, semOrigem, novosClientes: novos.length,
    extra: { cessam: cessam.length, exig: exig.length, parados: parados.length, semAcao: semAcao.length,
      exitoAdm: exito(noPer.filter(k=>!viaJudicial(k))), exitoJud: exito(noPer.filter(k=>viaJudicial(k))),
      nRes: noPer.length, futuras: futuras.length, lembs12: lembs12.length, equipe },
    semFinanceiro: !pgs.length,
  };
}
// ── os desenhos: SVG e CSS puros, sem biblioteca ─────────────────────────
function trilhaSvg(vals, cls){
  const w=96, h=24, mx=Math.max(1,...vals), n=vals.length;
  if(n<2) return "";
  const pts=vals.map((v,i)=>`${(i*(w-2)/(n-1)+1).toFixed(1)},${(h-2-(v/mx)*(h-4)).toFixed(1)}`).join(" ");
  return `<svg class="dk-trilha ${cls||""}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}
function variacao(atual, antes){
  if(!antes && !atual) return `<span class="dk-var">sem movimento no mês anterior</span>`;
  if(!antes) return `<span class="dk-var sobe">novo neste mês</span>`;
  const p = Math.round(100*(atual-antes)/antes);
  return `<span class="dk-var ${p>0?"sobe":p<0?"desce":""}">${p>0?"+":""}${p}% sobre ${rotMes(mesesAtras(1))}</span>`;
}
function cartaoKpi(rot, valor, sub, trilha, ir, tom){
  return `<button class="dk-kpi dk-entra${tom?" "+tom:""}" data-ir="${ir}" title="abrir a lista">
    <span class="dk-rot">${rot}</span><b class="dk-num">${valor}</b>
    <span class="dk-kpi-pe">${sub}${trilha}</span></button>`;
}
function blocoKpis(m){
  return cartaoKpi("Prazos vencidos", m.kpi.vencidos, `<span class="dk-var">${m.kpi.vencFatal} ${m.kpi.vencFatal===1?"prazo fatal":"prazos fatais"}</span>`, "", "planejado", m.kpi.vencidos?"dk-alerta":"")
    + cartaoKpi("Vencem em 7 dias", m.kpi.sete, `<span class="dk-var">próximos 14 dias</span>`, trilhaSvg(m.kpi.trilhaSete), "planejado")
    + cartaoKpi("A receber em 30 dias", reais(m.kpi.aReceber30), `<span class="dk-var">próximas 8 semanas</span>`, trilhaSvg(m.kpi.trilhaRec), "recebimentos")
    + cartaoKpi("Concessões no mês", m.kpi.conc, variacao(m.kpi.conc, m.kpi.concAnt), trilhaSvg(m.kpi.trilhaConc), "");
}
function blocoPrazos(m){
  const mx = Math.max(1,...m.regua.map(r=>r.fatal+r.compromisso+r.lembrete));
  const col = r => { const t=r.fatal+r.compromisso+r.lembrete;
    const seg = (n,c)=> n?`<i class="${c}" style="height:${(n/mx*100).toFixed(1)}%"></i>`:"";
    return `<span class="dk-dia${r.d===hoje()?" hj":""}" title="${fmtBarra(r.d)} · ${t} ${t===1?"data":"datas"}: ${r.fatal} prazo fatal, ${r.compromisso} compromisso, ${r.lembrete} lembrete">
      ${seg(r.fatal,"n-fatal")}${seg(r.compromisso,"n-comp")}${seg(r.lembrete,"n-lemb")}</span>`; };
  return `<section class="dk-bloco dk-prazos dk-entra"><header class="dk-cab"><h3>Prazos</h3>
      <span class="dk-leg"><i class="n-fatal"></i>Prazo fatal<i class="n-comp"></i>Compromisso<i class="n-lemb"></i>Lembrete</span></header>
    <div class="dk-regua" role="img" aria-label="Datas dos próximos 30 dias por natureza">${m.regua.map(col).join("")}</div>
    <div class="dk-eixo"><span>hoje</span><span>+10</span><span>+20</span><span>+30 dias</span></div>
    <h4 class="dk-sub">Os mais urgentes</h4>
    <div class="dk-urg">${m.urgentes.map(linhaAgenda).join("") || `<p class="dk-vazio">Nada vencido nem para os próximos 7 dias.</p>`}</div>
  </section>`;
}
function blocoFinanceiro(m){
  if(m.semFinanceiro) return `<section class="dk-bloco dk-fin dk-entra"><header class="dk-cab"><h3>Financeiro</h3></header>
    <p class="dk-vazio">Nenhum pagamento lançado ainda. Lance honorários, RPV e precatórios na aba Honorários de cada cliente para este quadro ganhar vida.</p></section>`;
  const mx = Math.max(1,...m.fin.flatMap(x=>[x.recebido,x.previsto]));
  const tot = m.aging.reduce((s,a)=>s+a.v,0) || 1;
  return `<section class="dk-bloco dk-fin dk-entra"><header class="dk-cab"><h3>Financeiro</h3>
      <span class="dk-leg"><i class="f-rec"></i>Recebido<i class="f-prev"></i>Previsto</span></header>
    <div class="dk-meses" role="img" aria-label="Recebido e previsto por mês">${m.fin.map(x=>`<span class="dk-mes" title="${rotMes(x.m)}: recebido ${reais(x.recebido)} de ${reais(x.previsto)} previsto">
      <span class="dk-par"><i class="f-rec" style="height:${(x.recebido/mx*100).toFixed(1)}%"></i><i class="f-prev" style="height:${(x.previsto/mx*100).toFixed(1)}%"></i></span>
      <small>${rotMes(x.m)}</small></span>`).join("")}</div>
    <h4 class="dk-sub">Em aberto, por atraso</h4>
    <div class="dk-aging">${m.aging.map(a=>`<div class="dk-ag-linha ag-${a.tom}"><span>${a.rot}</span>
      <span class="dk-ag-barra"><i style="width:${(a.v/tot*100).toFixed(1)}%"></i></span><b>${reais(a.v)}</b></div>`).join("")}</div>
  </section>`;
}
function blocoBeneficios(m){
  const mf = Math.max(1,...m.funil.map(x=>x.n)), me = Math.max(1,...m.especies.map(x=>x.n));
  const mo = Math.max(1,...m.origens.map(x=>x.n));
  return `<section class="dk-bloco dk-ben dk-entra"><header class="dk-cab"><h3>Benefícios e serviços</h3>
      <span class="dk-leg">${m.funil.reduce((s,x)=>s+x.n,0)} casos ativos</span></header>
    <div class="dk-duas dk-tres">
      <div><h4 class="dk-sub">Carteira por fase</h4>
        ${m.funil.map(x=>`<button class="dk-hbar" data-ir="fase:${x.f}"><span class="dk-hrot">${x.rot}</span>
          <span class="dk-htrilho"><i style="width:${(x.n/mf*100).toFixed(1)}%"></i></span><b>${x.n}</b></button>`).join("")}</div>
      <div><h4 class="dk-sub">Espécies mais frequentes <span class="dk-dica">e taxa de êxito</span></h4>
        ${m.especies.map(x=>`<div class="dk-hbar"><span class="dk-hrot" title="${esc(x.nome)}">${esc(x.e)}${x.e!==x.nome?` <small>${esc(x.nome)}</small>`:""}</span>
          <span class="dk-htrilho"><i style="width:${(x.n/me*100).toFixed(1)}%"></i></span><b>${x.n}</b>
          <span class="dk-exito" title="deferidos e acordos sobre os casos com resultado">${x.exito==null?"—":x.exito+"%"}</span></div>`).join("")
          || `<p class="dk-vazio">Nenhum caso ativo com espécie.</p>`}</div>
      ${/* F160 · de onde vêm os clientes novos do período, pela Origem do
           cadastro (lição do Tramitação Inteligente). Quem está sem origem
           aparece como número, para a equipe ir preenchendo. */""}
      <div class="dk-origem"><h4 class="dk-sub">De onde vêm os clientes <span class="dk-dica">${m.novosClientes} ${m.novosClientes===1?"novo":"novos"} no período</span></h4>
        ${m.origens.map(x=>`<div class="dk-hbar"><span class="dk-hrot">${esc(x.rot)}</span>
          <span class="dk-htrilho"><i style="width:${(x.n/mo*100).toFixed(1)}%"></i></span><b>${x.n}</b>
          <span class="dk-exito">${Math.round(100*x.n/Math.max(1,m.novosClientes))}%</span></div>`).join("")
          || (m.novosClientes ? "" : `<p class="dk-vazio">Nenhum cliente novo no período.</p>`)}
        ${m.semOrigem?`<p class="dk-vazio">${m.semOrigem} sem origem no cadastro${m.origens.length?"":" — preencha a Origem na Identificação"}.</p>`:""}</div>
    </div></section>`;
}
function blocoExtras(m){
  const e = m.extra, mxE = Math.max(1,...e.equipe.map(x=>x.abertas));
  const pct = v => v==null ? "—" : v+"%";
  const card = (rot, num, sub, ir, tom) => `<button class="dk-mini dk-entra${tom?" "+tom:""}"${ir?` data-ir="${ir}"`:""}>
    <span class="dk-rot">${rot}</span><b class="dk-num">${num}</b><span class="dk-var">${sub}</span></button>`;
  return `<div class="dk-extras">
    ${card("Risco de cessação", e.cessam, `DCB em 30 dias sem prorrogação · ${e.exig} ${e.exig===1?"exigência":"exigências"} do INSS`, "planejado", e.cessam?"dk-alerta":"")}
    ${card("Carteira parada", e.parados, `sem revisão no prazo · ${e.semAcao} sem próxima ação`, "acervo")}
    ${card("Êxito por via", `${pct(e.exitoAdm)} <small>adm.</small> · ${pct(e.exitoJud)} <small>jud.</small>`, `${e.nRes} resultados no período`, "")}
    ${card("Receita futura", e.futuras, `aposentadorias em 12 meses · ${e.lembs12} lembretes`, "fase:aposentadoria_futura")}
    ${/* F160 · a carga em linha inteira, como uma tabela: a barra é o que cada
         um tem na mão, e as colunas dizem o que pede atenção hoje. Zero sai em
         cinza-claro, para a coluna existir sem gritar. */""}
    <section class="dk-mini dk-equipe dk-entra"><span class="dk-rot">Carga da equipe <small>tarefas por pessoa, no momento</small></span>
      <div class="dk-hbar dk-eq-cab"><span></span><span></span><span>abertas</span><span>hoje</span><span>vencidas</span></div>
      ${e.equipe.slice(0,6).map(x=>`<div class="dk-hbar" title="${esc((x.c.nome||"").split(" ")[0])}: ${x.abertas} ${x.abertas===1?"tarefa aberta":"tarefas abertas"}, ${x.hojeN} para hoje, ${x.venc} ${x.venc===1?"vencida":"vencidas"} · ${x.ands} andamentos escritos em 30 dias">
        <span class="dk-hrot"><span class="avatar mini" style="background:${x.c.cor}">${esc(x.c.inicial)}</span>${esc((x.c.nome||"").split(" ")[0])}</span>
        <span class="dk-htrilho"><i style="width:${(x.abertas/mxE*100).toFixed(1)}%"></i></span><b>${x.abertas}</b>
        <span class="dk-exito${x.hojeN?" hj":" zero"}">${x.hojeN||"–"}</span>
        <span class="dk-exito${x.venc?" venc":" zero"}">${x.venc||"–"}</span></div>`).join("")}
    </section></div>`;
}
// o esqueleto: a MESMA grade da tela pronta, com as mesmas alturas
function esqueletoDash(){
  const ln = (w,h) => `<span class="sk" style="width:${w};height:${h||12}px"></span>`;
  const kpi = `<div class="dk-kpi sk-caixa">${ln("55%",10)}${ln("40%",28)}${ln("70%",10)}</div>`;
  const barras = n => `<div class="sk-barras">${Array.from({length:n},(_,i)=>`<span class="sk" style="height:${25+((i*37)%60)}%"></span>`).join("")}</div>`;
  const linhas = n => Array.from({length:n},()=>`<div class="sk-linha">${ln("18px",18)}${ln("40px")}${ln("45%")}${ln("22px",22)}</div>`).join("");
  return `<div class="dk-kpis" data-dk="kpis">${kpi.repeat(4)}</div>
    <div class="dk-faixa">
      <div class="dk-bloco dk-prazos sk-caixa" data-dk="prazos">${ln("30%",14)}${barras(30)}${linhas(5)}</div>
      <div class="dk-bloco dk-fin sk-caixa" data-dk="fin">${ln("40%",14)}${barras(6)}${linhas(4)}</div>
    </div>
    <div class="dk-bloco dk-ben sk-caixa" data-dk="ben">${ln("25%",14)}<div class="dk-duas dk-tres"><div>${linhas(6)}</div><div>${linhas(6)}</div><div>${linhas(4)}</div></div></div>
    <div class="dk-extras sk-extras" data-dk="extras">${`<div class="dk-mini sk-caixa">${ln("60%",10)}${ln("35%",24)}${ln("80%",10)}</div>`.repeat(4)}<div class="dk-mini dk-equipe sk-caixa">${linhas(4)}</div></div>`;
}
// F149 · o mesmo esqueleto nas outras esperas de rede: a abertura do CRM
// (lista e barra lateral) e a abertura da ficha (cabeçalho, coluna do caso e
// linha do tempo). Mesma regra da dashboard: geometria final, 150 ms de atraso.
const skl = (w,h,extra) => `<span class="sk${extra?" "+extra:""}" style="width:${w};height:${h||12}px"></span>`;
function esqueletoLista(n){
  const linha = i => `<div class="sk-ag">${skl("18px",18)}${skl("40px")}${skl((38+(i*17)%35)+"%")}<i></i>${skl("24px",24,"sk-redondo")}</div>`;
  return `<div class="sk-caixa sk-lista"><div class="pl-grupo">${`<div class="sk-ag-cab">${skl("90px",11)}</div>`}${
    Array.from({length:n},(_,i)=>linha(i)).join("")}</div></div>`;
}
function esqueletoLateral(n){
  return `<div class="sk-caixa sk-lat">${Array.from({length:n},(_,i)=>`<div class="sk-lat-item">${skl("16px",16)}${skl((45+(i*23)%35)+"%")}</div>`).join("")}</div>`;
}
function esqueletoFicha(){
  const tl = Array.from({length:4},(_,i)=>`<div class="sk-tl">${skl("64px")}<div class="sk-tl-txt">${skl("30%",11)}${skl((70+(i*13)%25)+"%")}${i%2?skl("45%"):""}</div></div>`).join("");
  return `<div class="sk-caixa sk-ficha" aria-busy="true" aria-label="abrindo a ficha">
    <div class="sk-f-cab">${skl("40px",40)}${skl("220px",22)}<i></i>${skl("140px",20)}</div>
    <div class="sk-f-sub">${skl("150px",11)}${skl("110px",11)}</div>
    <div class="sk-f-abas">${skl("70px")}${skl("80px")}${skl("110px")}${skl("60px")}${skl("80px")}</div>
    <div class="sk-f-corpo">
      <div class="sk-f-esq">${skl("70%",18)}<div class="sk-f-placa">${skl("100%",52)}${skl("100%",52)}${skl("100%",52)}${skl("100%",52)}</div>
        ${skl("100%",30)}<div class="sk-f-pz">${skl("100%",14)}${skl("100%",14)}${skl("100%",14)}</div></div>
      <div class="sk-f-dir">${skl("100%",96)}<div class="sk-f-abas">${skl("80px")}${skl("60px")}<i></i>${skl("100px")}</div>${tl}</div>
    </div></div>`;
}
function renderDashV10(){
  tituloLista("Dashboard");
  document.querySelector(".meio").classList.add("ag-v10");
  document.getElementById("sub-lista").innerHTML = `Ao vivo, com o que está no CRM. <span class="dk-per" role="group" aria-label="Período">${
    DASH_PER.map(([d,r])=>`<button data-dper="${d}" aria-pressed="${dashPer===d}" class="${dashPer===d?"on":""}">${r}</button>`).join("")}</span>`;
  document.getElementById("topo-extra").innerHTML = `<div class="seg-colab" role="group" aria-label="Filtrar por pessoa">`
    + [["","Todos"], ...equipeAtiva().map(c=>[c.id,(c.nome||"").split(" ")[0]])].map(([id,n])=>
      `<button data-dcol="${id}" aria-pressed="${(dashCol||"")===id}" class="${(dashCol||"")===id?"on":""}">${esc(n)}</button>`).join("") + `</div>`;
  const alvo = document.getElementById("conteudo-meio");
  alvo.innerHTML = `<div class="dk" aria-busy="true">${esqueletoDash()}</div>`;
  document.querySelectorAll("[data-dper]").forEach(b=>b.onclick=()=>{ dashPer=+b.dataset.dper; render(); });
  document.querySelectorAll("[data-dcol]").forEach(b=>b.onclick=()=>{ dashCol=b.dataset.dcol||null; render(); });
  const vez = ++dashVez;
  const proxima = () => new Promise(r=>setTimeout(r,0));
  (async()=>{
    // espera o navegador pintar o esqueleto antes de fazer a conta
    await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)));
    if(vez!==dashVez || visao!=="dashboard") return;
    const m = metricasDash(dashCol, dashPer);
    window.__dash = m;
    const troca = (chave, html) => { if(vez!==dashVez) return false;
      const el = alvo.querySelector(`[data-dk="${chave}"]`); if(!el) return false;
      const t = document.createElement("div"); t.innerHTML = html;
      el.replaceWith(...t.childNodes); return true; };
    for(const [ch, f] of [["kpis", ()=>`<div class="dk-kpis">${blocoKpis(m)}</div>`],
        ["prazos", ()=>blocoPrazos(m)], ["fin", ()=>blocoFinanceiro(m)],
        ["ben", ()=>blocoBeneficios(m)], ["extras", ()=>blocoExtras(m)]]){
      if(!troca(ch, f())) return;
      await proxima();
    }
    const dk = alvo.querySelector(".dk"); if(dk) dk.setAttribute("aria-busy","false");
    alvo.querySelectorAll("[data-ir]").forEach(b=>{ if(b.dataset.ir) b.onclick=e=>{ e.stopPropagation(); irPara(b.dataset.ir); }; });
    ligarCartoes(); ligarTarefas();
    alvo.querySelectorAll("[data-conclui-and]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); concluirDeVez(b.dataset.concluiAnd); });
    alvo.querySelectorAll("[data-avisado]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); lembreteAvisado(b.dataset.avisado,"manual"); });
  })();
}

function renderDash(){
  if(temaV10()) return renderDashV10();
  tituloLista("📊 Dashboard");
  document.getElementById("sub-lista").textContent="Ao vivo, direto do banco.";
  const at=ativos();
  const em7=new Date(); em7.setDate(em7.getDate()+7);
  const lim=em7.toLocaleDateString("sv",{timeZone:"America/Sao_Paulo"});
  const porAutor={};
  D.and30.forEach(a=>{ const c=D.colPorId.get(a.autor_id); if(c) porAutor[c.nome]=(porAutor[c.nome]||0)+1; });
  const abertos=D.pagamentos.filter(p=>p.status==="aberto");
  const recebiveis=abertos.reduce((s,p)=>s+Number(p.valor||0),0);
  document.getElementById("conteudo-meio").innerHTML=`<div class="dash">
    <div class="card"><h4>Clientes</h4><div class="num">${D.clientes.length}</div></div>
    <div class="card"><h4>Casos ativos</h4><div class="num">${at.length}</div></div>
    <div class="card"><h4>Prazos próximos 7 dias</h4><div class="num" style="color:var(--laranja)">${at.filter(k=>k.prazo&&k.prazo>=hoje()&&k.prazo<=lim).length}</div></div>
    <div class="card"><h4>Prazos vencidos</h4><div class="num" style="color:var(--vermelho)">${at.filter(k=>k.prazo&&k.prazo<hoje()).length}</div></div>
    <div class="card"><h4>Perícias/audiências futuras</h4><div class="num" style="color:var(--roxo)">${D.eventos.filter(e=>e.status==="agendada"&&dataSP(e.data_hora)>=hoje()).length}</div></div>
    <div class="card"><h4>⚠ Exigências INSS em aberto</h4><div class="num" style="color:var(--vermelho)">${at.filter(k=>k.exigencia_prazo).length}</div></div>
    <div class="card"><h4>💼 Vendas em andamento</h4><div class="num">${D.leads.filter(l=>!["fechado","perdido"].includes(l.etapa)).length}</div></div>
    <div class="card"><h4>✅ Concedidos</h4><div class="num" style="color:var(--verde)">${D.casos.filter(k=>k.resultado==="deferido").length}</div></div>
    <div class="card"><h4>Taxa de êxito (com resultado)</h4><div class="num">${(()=>{const r=D.casos.filter(k=>["deferido","indeferido","acordo"].includes(k.resultado));return r.length?Math.round(100*r.filter(k=>k.resultado!=="indeferido").length/r.length)+"%":"—";})()}</div></div>
    <div class="card"><h4>📥 Menções pendentes (minhas)</h4><div class="num" style="color:var(--laranja)">${D.mencoes.length}</div></div>
    <div class="card"><h4>A receber (lançado)</h4><div class="num" style="color:var(--verde);font-size:22px">${moeda(recebiveis)}</div></div>
    <div class="card" style="grid-column:1/-1"><h4>Andamentos por colaborador — últimos 30 dias</h4>
      ${barras(Object.entries(porAutor).sort((a,b)=>b[1]-a[1]))}</div>
    <div class="card" style="grid-column:1/-1"><h4>Casos ativos por fase</h4>
      ${barras(Object.entries(NOME_FASE).map(([f,n])=>[n,at.filter(k=>k.fase===f).length]).filter(p=>p[1]))}</div>
    <div class="card" style="grid-column:1/-1"><h4>Casos ativos por benefício</h4>
      ${barras(Object.entries(at.reduce((m,k)=>{ if(k.beneficio) m[k.beneficio]=(m[k.beneficio]||0)+1; return m; },{}))
        .sort((a,b)=>b[1]-a[1]).slice(0,10))}</div>
    ${/* o que o escritório de fato pede — a conta que o "benefício" sozinho
         não dá, porque quase tudo cai em B42. Um caso conta em cada marcador
         que tem: rural + especial aparece nas duas barras, de propósito. */""}
    <div class="card" style="grid-column:1/-1"><h4>O que estamos pedindo (marcadores)</h4>
      ${barras(MARCADORES.map(m=>[`${m.icone} ${m.rot}`,
        at.filter(k=>marcadoresDe(k).includes(m.slug)).length]).filter(p=>p[1])
        .sort((a,b)=>b[1]-a[1]))
        || "<p class='meio-sub'>Nenhum caso marcado ainda — marque na ficha, na linha PEDIDO.</p>"}
      ${(()=>{ const combi = at.filter(k=>marcadoresDe(k).length>1).length;
        return combi?`<p class="meio-sub" style="margin-top:6px">${combi} caso(s) somam mais de um pedido.</p>`:""; })()}</div>
  </div>`;
}

// ── quem já leu o comentário ("visto" da equipe) ──────────────────────────
// Cinza = ninguém confirmou ainda. Cada um que marca entra com o próprio
// avatar colorido — com 6 pessoas, a inicial é mais rápida de ler do que
// decorar qual cor é de quem. O tooltip diz o nome, o dia e a hora.
function lidosDe(a){ return (a.andamentos_lidos)||[]; }
function euLi(a){ return lidosDe(a).some(l=>l.colaborador_id===eu.id); }
// hora sempre no fuso de Franca: o banco grava em UTC e três horas de
// diferença num "leu às" atrapalham mais do que ajudam
function horaLocal(iso){
  if(!iso) return "";
  const d=new Date(iso);
  if(isNaN(d)) return "";
  const p=new Intl.DateTimeFormat(IDIOMA,{timeZone:FUSO,day:"2-digit",
    month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).formatToParts(d)
    .reduce((o,x)=>(o[x.type]=x.value,o),{});
  return `${p.day}/${p.month}/${p.year} às ${p.hour}:${p.minute}`;
}
function tarefasDe(a){ return (D.tarefasFicha||[]).filter(t=>t.andamento_id===a.id); }
function vistos(a){
  // uma marca por pessoa: quem TEM tarefa neste comentário aparece com o
  // estado dela (pendente/concluída) no lugar do visto de leitura; quem não
  // tem, continua com o ✓ de sempre. "Li" e "fiz" não disputam espaço.
  const ts = tarefasDe(a);
  const comTarefa = new Set(ts.map(t=>t.colaborador_id));
  const ls = lidosDe(a).filter(l=>!comTarefa.has(l.colaborador_id))
    .sort((x,y)=>(x.lido_em||"")<(y.lido_em||"")?-1:1);
  // F182 · no tema v10 a tarefa tem faixa própria no cartão (tarefasCartao) e
  // os botões dela moram na barra de ações: aqui ficam só os vistos de leitura
  const v12 = temaV10();
  const minha = !v12 && ts.find(t=>t.colaborador_id===eu.id && !t.concluida_em);
  return `<span class="vistos" id="visto-${a.id}">
    ${v12?"":ts.map(t=>{ const c=D.colPorId.get(t.colaborador_id); if(!c) return "";
      const atras = !t.concluida_em && t.lembrar_em < hoje();
      const rev = t.papel==="revisa";   // F160 · o revisor leva a marca no chip
      return `<span class="tf-chip ${t.concluida_em?"feita":atras?"atras":""}${rev?" rev":""}"
        title="${esc(c.nome)} — ${rev?"revisa · ":""}${t.concluida_em?`concluída em ${horaLocal(t.concluida_em)}`
                :`tarefa para ${fmt(t.lembrar_em)}`}">
        <b style="background:${c.cor}">${esc(c.inicial)}</b>
        ${rev?`<small>revisa</small> `:""}${t.concluida_em?"✔":`🗓 ${fmt(t.lembrar_em).slice(0,5)}${t.lembrar_hora?` ⏰ ${String(t.lembrar_hora).slice(0,5)}`:""}`}</span>`;}).join("")}
    ${/* F14 · o círculo do To Do: um clique conclui e a faixa oferece desfazer
         por oito segundos. Quem quiser escrever o que fez continua tendo a
         janela, agora no botão ao lado, que não é mais o caminho obrigatório
         da baixa mais comum do dia. */""}
    ${minha?`<button class="tf-ok" onclick="concluirDeVez('${minha.id}')"
        title="concluir agora — dá para desfazer logo depois"
        aria-label="concluir a sua tarefa"></button>
      <button class="btn-mini tf-acao" onclick="concluirTarefa('${minha.id}')"
        title="concluir escrevendo o que foi feito, com protocolo e repetição"><span aria-hidden="true">Anotar</span><span class="sr-only">concluir e escrever</span></button>
      <button class="btn-mini tf-acao" onclick="adiarTarefa('${minha.id}')">⏩ adiar</button>`:""}
    ${ls.map(l=>{ const c=D.colPorId.get(l.colaborador_id); if(!c) return "";
      return `<span class="visto-av" style="background:${c.cor}"
        title="${esc(c.nome)} leu em ${horaLocal(l.lido_em)}">${esc(c.inicial)}</span>`;}).join("")}
    ${comTarefa.has(eu.id)?"":(meu=>`<button class="visto-bt ${meu?"on":""}" onclick="marcarLido('${a.id}',${meu?1:0})"
      title="${meu ? `Você leu em ${horaLocal(meu.lido_em)} — clique para desfazer`
                   : "marcar que você leu"}">✓</button>`
     )(lidosDe(a).find(l=>l.colaborador_id===eu.id))}
    ${v12?"":`<button class="visto-bt tf-mais" onclick="novaTarefaComentario('${a.id}','${a.caso_id}')"
      title="mais uma tarefa neste comentário — outra pessoa, outra data">＋</button>`}
  </span>`;
}

// ── o ＋ do comentário: o mesmo assunto pode ter dois prazos ───────────────
let ntSel = [], ntData = null;
function novaTarefaComentario(andId, casoId){
  ntSel=[]; ntData=null;
  caixa(`<h3>➕ Mais uma tarefa neste comentário</h3>
    <p class="meio-sub">Outra pessoa, outra data — sem escrever o assunto de novo.</p>
    <div class="form-linha">${equipeAtiva().map(c=>
      `<button class="eq-ini" data-nt="${c.id}" style="--cor-eq:${c.cor}" title="${esc(c.nome)}"
        onclick="this.classList.toggle('on');ntToggle('${c.id}')">${esc(c.inicial)}</button>`).join("")}
      <button class="btn-rap" onclick="ntTodos()" title="a equipe inteira">👥 todos</button>
      ${seletorRevisor("nt-rev")}</div>
    <div class="form-linha" style="margin-top:8px;align-items:center">
      <button class="btn-rap tf-dt" onclick="ntDia(hoje(),this)">Hoje</button>
      <button class="btn-rap tf-dt" onclick="ntDia(maisDias(1),this)">Amanhã</button>
      <button class="btn-rap tf-dt" onclick="ntDia(maisDias(7),this)">+7 dias</button>
      <input type="date" onchange="ntDia(this.value,this)">
      <button class="btn-rap" style="margin-left:auto" id="nt-salvar"
        onclick="ntSalvar('${andId}','${casoId}')" title="📌 Criar tarefa"><span aria-hidden="true">📌 Tarefa</span><span class="sr-only">📌 Criar tarefa</span></button>
    </div>`);
}
function ntToggle(id){ ntSel = ntSel.includes(id) ? ntSel.filter(x=>x!==id) : [...ntSel, id]; }
function ntTodos(){
  const todos=equipeAtiva().map(c=>c.id);
  const liga = ntSel.length!==todos.length;
  ntSel = liga ? todos : [];
  document.querySelectorAll(".modal-cx [data-nt]").forEach(b=>b.classList.toggle("on", liga));
}
function ntDia(d, el){
  ntData = d || null;
  document.querySelectorAll(".modal-cx .tf-dt.on").forEach(b=>b.classList.remove("on"));
  if(el && el.tagName==="BUTTON") el.classList.add("on");
}
async function ntSalvar(andId, casoId){
  const revisor = (document.getElementById("nt-rev")||{}).value||"";
  // F160 · só o revisor também vale: é o jeito de pôr quem confere numa
  // tarefa que já tem executor
  if(!ntSel.length && !revisor) return aviso("Escolha para quem é a tarefa");
  if(!ntData) return aviso("Escolha a data — tarefa sem data não existe");
  fecharCaixa();
  const pessoas = [...ntSel.map(id=>({id})), ...(revisor && !ntSel.includes(revisor) ? [{id:revisor, papel:"revisa"}] : [])];
  for(const p of pessoas){
    try{
      tarefaNaMemoria(await criarTarefa({andamento_id:andId, caso_id:casoId, colaborador_id:p.id,
        atribuido_por:eu.id, lembrar_em:ntData, ...(p.papel?{papel:p.papel}:{})}));
    // a pessoa já tem tarefa neste comentário: o banco recusa, e tudo bem
    }catch(e){ aviso("Essa pessoa já tem tarefa neste comentário"); }
  }
  aviso("Tarefa criada 📌", false);
  if(clienteAberto) abrirFicha(clienteAberto);
}

// ── concluir: a baixa é sua, e o que você fez vira comentário ─────────────
const CONCLUIR_PRESETS = [
  "Feito", "Solicitei o benefício", "Protocolei o recurso",
  "Cumpri a exigência", "Juntei os documentos",
  "Verifiquei — ainda não disponível",
];
// o padrão nº 1 do escritório é o ciclo de vigilância: tentei, não estava
// pronto, tentar de novo. ctRep guarda a data da PRÓXIMA rodada.
let ctRep = null;   // F449 · null = segue a regra da tarefa; false = não repete desta vez
function ctRepetir(d, el){
  ctRep = d===false ? false : (d || null);
  document.querySelectorAll(".modal-cx .ct-rep.on").forEach(b=>b.classList.remove("on"));
  if(el && el.tagName==="BUTTON") el.classList.add("on");
}
// F449 · A TAREFA QUE SE REPETE (ideia do Todoist): a regra mora em andamento_tarefas.repetir = {n, un: "d"|"m",
// apos}; sem "apos", a próxima conta da data da tarefa (pulando as que já passaram); com "apos", da conclusão.
// Prazo fatal nunca se repete.
const REPETIR_OPC = [["","Não repete"],["1d","Todo dia"],["7d","Toda semana"],["15d","A cada 15 dias"],
  ["1m","Todo mês"],["3m","A cada 3 meses"],["6m","A cada 6 meses"],["12m","Todo ano"]];
function regraRepetir(cod, apos){
  const m = /^(\d+)([dm])$/.exec(cod||""); return m ? {n:+m[1], un:m[2], apos:!!apos} : null;
}
function rotRepetir(r){
  if(!r) return "";
  const o = REPETIR_OPC.find(([c])=>c===r.n+r.un);
  return (o ? o[1].toLowerCase() : `a cada ${r.n} ${r.un==="m"?"meses":"dias"}`) + (r.apos?" depois de concluir":"");
}
function somarRepetir(iso, r){
  if(r.un==="d") return maisDiasISO(iso, r.n);
  const [a,m,d] = iso.split("-").map(Number), alvo = new Date(Date.UTC(a, m-1+r.n, 1));
  const ult = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth()+1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(d, ult)); return alvo.toISOString().slice(0,10);
}
function proximaRepeticao(t, hj){
  const r = t && t.repetir; if(!r || !r.n || t.natureza==="fatal") return null;
  hj = hj || hoje();
  let d = somarRepetir(r.apos || !t.lembrar_em ? hj : t.lembrar_em, r);
  for(let i=0; d<=hj && i<500; i++) d = somarRepetir(d, r);
  return d;
}
// F247 · o "feito" diz o que foi feito, pelo que a tarefa pedia: "Apresentar réplica" concluída vira "Réplica
// protocolada", e não "Tarefa concluída". Vale a primeira peça citada no pedido; o lembrete e a revisão ficam genéricos.
const FEITO_DA_TAREFA = [
  [/r[ée]plica/i, "Réplica protocolada"],
  [/embargos de declara/i, "Embargos de declaração protocolados"],
  [/contrarraz/i, "Contrarrazões protocoladas"],
  [/recurso inominado/i, "Recurso inominado protocolado"],
  [/apela[çc][ãa]o/i, "Apelação protocolada"],
  [/recurso ordin[áa]rio/i, "Recurso ordinário protocolado"],
  [/recurso especial/i, "Recurso especial protocolado"],
  [/quesitos/i, "Quesitos apresentados"],
  [/sobre o laudo|laudo pericial/i, "Manifestação sobre o laudo protocolada"],
  [/c[áa]lculos/i, "Manifestação sobre os cálculos protocolada"],
  [/cumprimento de senten[çc]a/i, "Cumprimento de sentença protocolado"],
  [/exig[êe]ncia/i, "Exigência cumprida"],
  [/(solicitar|requerer|pedir) (o |a )?(benef[íi]cio|aposentadoria|aux[íi]lio|pens[ãa]o|bpc)/i, "Benefício solicitado no INSS"],
  [/\bjuntar\b|juntada/i, "Documentos juntados"],
  [/peti[çc][ãa]o|manifestar|manifesta[çc][ãa]o/i, "Petição protocolada"],
];
/* F622 · "Avaliar apelação…" não é apelação protocolada: verbo de exame antes da peça, sem verbo de fazer, não vale */
const RX_FEITO_EXAME = /\b(avaliar|conferir|verificar|analisar|estudar|ler|acompanhar|aguardar|checar|revisar|consultar|ver se|decidir|pensar|discutir|explicar|orientar|informar|avisar|falar|ligar)\b/i;
const RX_FEITO_FAZER = /\b(protocolar|apresentar|interpor|opor|elaborar|redigir|fazer|preparar|minutar|peticionar|cumprir|distribuir|ajuizar)\b/i;
const feitoValido = (t, i) => { const antes = t.slice(0, i); return !RX_FEITO_EXAME.test(antes) || RX_FEITO_FAZER.test(antes); };
function feitoDaTarefa(texto){
  const t = String(texto||"").slice(0, 300); let melhor = null;
  // a peça nomeada vence o "manifestar" genérico, que é a última regra
  for(const [rx, frase] of FEITO_DA_TAREFA.slice(0, -1)){ const m = rx.exec(t); if(m && feitoValido(t, m.index) && (!melhor || m.index<melhor.i)) melhor = {i:m.index, frase}; }
  const [rxG, fraseG] = FEITO_DA_TAREFA[FEITO_DA_TAREFA.length-1];
  if(melhor) return melhor.frase;
  const g = rxG.exec(t);
  return g && feitoValido(t, g.index) ? fraseG : null;
}
const feitoDe = t => t && t.natureza!=="lembrete" && t.papel!=="revisa"
  ? feitoDaTarefa(((D._andsFicha||[]).find(a=>a.id===t.andamento_id)||{}).texto) : null;
function concluirTarefa(id){
  const tt=(D.tarefasFicha||[]).find(x=>x.id===id), fd=feitoDe(tt);
  const pr = proximaRepeticao(tt);   // F449 · a regra já escolhe a próxima rodada; Parar encerra a repetição
  caixa(`<h3>✔ Concluir a sua parte</h3>
    <p class="meio-sub">O que você fez vira um comentário no processo — o histórico continua.</p>
    <div class="form-linha">${(fd?[fd]:[]).concat(CONCLUIR_PRESETS).map(t=>
      `<button class="btn-rap" onclick="document.getElementById('ct-txt').value=this.textContent">${t}</button>`).join("")}</div>
    <textarea id="ct-txt" rows="2" placeholder="ou escreva o que foi feito…"
      style="width:100%;margin-top:8px;font:inherit;padding:8px;border:1px solid var(--borda);border-radius:8px"></textarea>
    <div class="form-linha" style="margin-top:6px;align-items:center">
      <label class="meio-sub">nº de protocolo (se houver):
        <input id="ct-prot" inputmode="numeric" placeholder="fica guardado na ficha"
          style="width:220px"></label>
    </div>
    <div class="form-linha" style="margin-top:6px;align-items:center">
      <span class="rotulo-rap">🔁 REPETIR EM:</span>
      ${pr ? `<button class="btn-rap ct-rep on" onclick="ctRepetir(null,this)" title="repete ${esc(rotRepetir(tt.repetir))}: próxima em ${fmt(pr)}"><span aria-hidden="true">Regra</span><span class="sr-only">pela regra, em ${fmt(pr)}</span></button>
      <button class="btn-rap ct-rep" onclick="ctRepetir(false,this)" title="encerrar a repetição"><span aria-hidden="true">Parar</span><span class="sr-only">parar de repetir</span></button>`
      : `<button class="btn-rap ct-rep on" onclick="ctRepetir(null,this)" title="não repetir"><span aria-hidden="true">Ignorar</span><span class="sr-only">não repetir</span></button>`}
      <button class="btn-rap ct-rep" onclick="ctRepetir(maisDias(15),this)">+15 dias</button>
      <button class="btn-rap ct-rep" onclick="ctRepetir(maisDias(30),this)">+30 dias</button>
      <button class="btn-rap ct-rep" onclick="ctRepetir(maisDias(45),this)">+45 dias</button>
      <input type="date" onchange="ctRepetir(this.value,this)">
      <button class="btn-rap" style="margin-left:auto" onclick="fecharTarefa('${id}')">✔ Concluir</button>
    </div>`);
  ctRep = null;
}
async function fecharTarefa(id){
  const txt=(document.getElementById("ct-txt").value||"").trim();
  const prot=(document.getElementById("ct-prot").value||"").replace(/\D/g,"");
  fecharCaixa();
  return concluirDeVez(id, txt, prot);
}
// F14 · CONCLUIR EM UM CLIQUE
// O miolo da conclusão, separado da janela. Com o texto vazio ele escreve
// "Tarefa concluída", que é o que o clique único manda — o histórico continua
// existindo, só não exige digitação para a baixa mais comum do dia.
async function concluirDeVez(id, txt, prot){
  const t=(D.tarefasFicha||[]).find(x=>x.id===id)
       || [...(D.tarefasPorCaso||new Map()).values()].flat().find(x=>x.id===id);
  if(!t) return;
  txt=(txt||"").trim(); prot=(prot||"").replace(/\D/g,"");
  // F247 · o clique único escreve o que foi feito, pelo pedido da tarefa (o pedido de fora da ficha vem do banco)
  if(!txt && t.natureza!=="lembrete" && t.papel!=="revisa"){
    const orig=(D._andsFicha||[]).find(x=>x.id===t.andamento_id)
      || (await api(`/rest/v1/andamentos?id=eq.${t.andamento_id}&select=texto`).catch(()=>[]))[0];
    txt=feitoDaTarefa(orig && orig.texto) || "";
  }
  await api(`/rest/v1/andamento_tarefas?id=eq.${id}`,{method:"PATCH",
    headers:{Prefer:"return=minimal"},
    body:JSON.stringify({concluida_em:new Date().toISOString()})});
  let corpo = "✔ " + (txt || "Tarefa concluída");
  if(prot.length>=6) corpo += ` — Protocolo: ${prot}`;
  // a conclusão responde o comentário que pediu a tarefa: é o que diz DE QUAL
  // tarefa é este "feito" quando o processo tem três abertas ao mesmo tempo
  const [and]=await api(`/rest/v1/andamentos`,{method:"POST",
    headers:{Prefer:"return=representation"},
    body:JSON.stringify({caso_id:t.caso_id, autor_id:eu.id, texto:corpo,
                         responde_a:t.andamento_id})}).catch(()=>[]);
  if(and) await api(`/rest/v1/andamentos_lidos`,{method:"POST",
    headers:{Prefer:"return=minimal,resolution=merge-duplicates"},
    body:JSON.stringify({andamento_id:and.id, colaborador_id:eu.id})}).catch(()=>{});
  // teste 11.88, REC-07: quem delegou fica sabendo que a tarefa foi feita
  if(and && t.atribuido_por && t.atribuido_por!==eu.id)
    await criarMencoes(corpo, t.caso_id, and.id, [t.atribuido_por]).catch(()=>{});
  // o protocolo digitado aqui é o que ninguém pode esquecer: vai para a ficha
  const k=D.casoPorId.get(t.caso_id);
  const cpT = prot.length>=6 && k && corpoProtocolos(k, [prot]);
  if(cpT){ await patchCaso(t.caso_id, cpT); Object.assign(k, cpT); }
  // F64 · concluir a tarefa que nasceu do prazo fatal baixa o prazo JUNTO —
  // ninguém precisa clicar em ✔ feito de novo na linha do prazo. A certidão do
  // vínculo é o carimbo [PRAZO dd.mm.aaaa] no comentário de origem batendo com
  // o prazo vigente do caso. Se a F38 tinha movido o caso para 🗓 Tarefas com
  // Prazo, ele volta sozinho para a lista de onde veio (regra da volta, sem
  // perguntar). O desfazer devolve tudo como estava.
  let prazoBaixado=null, prazoAntes=null;
  // F236 · quem baixa o prazo é a conclusão de quem EXECUTA, e só a última delas: a revisão concluída antes do
  // protocolo não dá o prazo por cumprido
  const outraAberta = (D.tarefasFicha||[]).some(x=>x.id!==t.id && x.andamento_id===t.andamento_id && !x.concluida_em && x.papel!=="revisa");
  if(k && k.prazo && t.papel!=="revisa" && !outraAberta){
    const orig=(D._andsFicha||[]).find(x=>x.id===t.andamento_id)
      || (await api(`/rest/v1/andamentos?id=eq.${t.andamento_id}&select=texto`).catch(()=>[]))[0];
    if(orig && (orig.texto||"").includes(`[PRAZO ${fmt(k.prazo)}]`)){
      prazoAntes={prazo:k.prazo, fase:k.fase, mover_para:k.mover_para||null, ronda:k.ronda||null};
      const corpo={prazo:null};
      if(k.mover_para==="🗓 Tarefas com Prazo"){
        const de=(k.ronda||{}).prazo_de;
        const lista=LISTAS_VOLTA.some(([l])=>l===de) ? de
          : (LISTAS_VOLTA.some(([l])=>l===k.origem_lista) ? k.origem_lista : "👪 Judicial");
        corpo.fase=(LISTAS_VOLTA.find(([l])=>l===lista)||[])[1]||"outro";
        corpo.mover_para=lista;
        corpo.ronda={...(k.ronda||{})}; delete corpo.ronda.prazo_de;
      }
      try{ await patchCaso(t.caso_id, corpo); Object.assign(k, corpo); prazoBaixado=prazoAntes.prazo; }
      catch(e){ prazoAntes=null; }
    }
  }
  // repetir: a próxima rodada nasce pendurada no comentário da conclusão —
  // o ciclo fica visível na linha do tempo
  // F449 · a tarefa com regra de repetição renasce sozinha, com a mesma pessoa, natureza e regra
  const regra = ctRep!==false && t.repetir && t.natureza!=="fatal" ? t.repetir : null;
  const prox = ctRep || (regra ? proximaRepeticao(t) : null);
  if(prox && and){
    try{
      const tf = await criarTarefa({andamento_id:and.id, caso_id:t.caso_id,
        colaborador_id: regra ? t.colaborador_id : eu.id, atribuido_por:eu.id, lembrar_em:prox,
        ...(regra ? {repetir:regra, ...(t.natureza?{natureza:t.natureza}:{}), ...(t.papel?{papel:t.papel}:{})} : {})});
      tarefaNaMemoria(tf);
    }catch(e){ aviso("⚠ a nova rodada não gravou: "+String(e.message||e).slice(0,80)); }
  }
  t.concluida_em=new Date().toISOString();
  D.tarefasPorCaso.set(t.caso_id,(D.tarefasPorCaso.get(t.caso_id)||[]).filter(x=>x.id!==id));
  if(t.colaborador_id===eu.id){ await baixarMencoes([t.andamento_id]); montarSidebar(); }   // F236
  // F236 · o "📞 Avisar" concluído é o aviso feito: a perícia fica avisada (o 📞 avisado do evento) e sai da fila da recepção
  const av = await avisoPelaTarefa(t).catch(()=>null);
  if(av) montarSidebar();
  plim();
  const repetiu = and ? prox : null;
  ctRep = null;
  avisoDesfazer((repetiu?`Concluída — nova rodada em ${fmt(repetiu)}`:"Concluída")
    + (prazoBaixado?` · ⏰ prazo fatal de ${fmt(prazoBaixado)} baixado junto`:"")
    + (av?` · ${(av.e.tipo||"perícia").toLowerCase()} de ${fmt(dataSP(av.e.data_hora)).slice(0,5)} avisada`:""),
    async () => { if(av) await desfazerAvisoDoEvento(av); return desfazerConclusao(t, and, prazoAntes); });
  if(prazoBaixado) montarSidebar();   // o caso pode ter trocado de lista
  if(clienteAberto) abrirFicha(clienteAberto);
}
// a volta: reabre a tarefa e apaga o comentário que a conclusão escreveu.
// O que ela NÃO desfaz é o protocolo que foi para a ficha, porque protocolo
// certo continua certo, e a nova rodada, que já é outra tarefa com vida.
async function desfazerConclusao(t, and, prazoAntes){
  try{
    await api(`/rest/v1/andamento_tarefas?id=eq.${t.id}`,{method:"PATCH",
      headers:{Prefer:"return=minimal"}, body:JSON.stringify({concluida_em:null})});
    if(and) await api(`/rest/v1/andamentos?id=eq.${and.id}`,{method:"DELETE"}).catch(()=>{});
    // F64: se a conclusão baixou o prazo fatal, o desfazer devolve o caso
    // exatamente como estava (prazo, fase, lista e ronda)
    if(prazoAntes){
      await patchCaso(t.caso_id, prazoAntes).catch(()=>{});
      const k=D.casoPorId.get(t.caso_id); if(k) Object.assign(k, prazoAntes);
    }
    t.concluida_em=null;
    tarefaNaMemoria(t);
    aviso("Tarefa reaberta", false);
  }catch(e){ aviso("Não consegui reabrir a tarefa — atualize a tela"); }
  if(clienteAberto) abrirFicha(clienteAberto); else { montarSidebar(); render(); }
}
function adiarTarefa(id){
  caixa(`<h3>⏩ Adiar o lembrete</h3>
    <p class="meio-sub">Adiar é honesto; concluir sem fazer, não.</p>
    <div class="form-linha">
      <button class="btn-rap" onclick="mudarLembrar('${id}', maisDias(1))">+1 dia útil</button>
      <button class="btn-rap" onclick="mudarLembrar('${id}', maisDias(7))">+1 semana</button>
    </div>${miniCal(hoje(), "")}
    <h3>⏰ Avisar na hora</h3>
    <p class="meio-sub">Na data do lembrete, o CRM avisa no horário escolhido, mesmo com a aba escondida.</p>
    <div class="form-linha">
      <button class="btn-rap" onclick="sonecaTarefa('${id}', 60)">Daqui a 1 hora</button>
      <input type="time" onchange="mudarHoraLembrar('${id}', this.value)">
      <button class="btn-mini" onclick="mudarHoraLembrar('${id}', null)" title="tirar o horário"><span aria-hidden="true">Limpar</span><span class="sr-only">tirar o horário</span></button>
    </div>`);  ligarMiniCal(document.querySelector("#modal .mcal"), d => mudarLembrar(id, d));
}
// ── LEMBRETE COM HORÁRIO (como o To Do) ──────────────────────────────────
// O To Do guarda data e hora do lembrete e dispara um aviso do Windows na
// hora, com "adiar". Aqui a data continua em lembrar_em e a hora, opcional,
// em lembrar_hora (schema_funcoes_todo.sql). O aviso sai uma vez por
// tarefa/data/hora: a marca fica neste navegador, para não repetir a cada volta.
function tarefaAberta(id){
  return (D.tarefasFicha||[]).find(x=>x.id===id)
    || [...(D.tarefasPorCaso||new Map()).values()].flat().find(x=>x.id===id);
}
async function gravarLembrar(id, campos, msg){
  fecharCaixa();
  try{
    await api(`/rest/v1/andamento_tarefas?id=eq.${id}`,{method:"PATCH",
      headers:{Prefer:"return=minimal"}, body:JSON.stringify(campos)});
  }catch(e){
    return aviso(/lembrar_hora|iniciada_em|etapas/.test(String(e.message||e))
      ? "⚠ O banco ainda não tem esta coluna: execute o schema_funcoes_todo.sql no Supabase"
      : "Não consegui gravar o lembrete");
  }
  // a ficha e a faixa de prazos guardam cópias separadas da tarefa: as duas recebem a mudança
  for(const t of [...(D.tarefasFicha||[]), ...[...(D.tarefasPorCaso||new Map()).values()].flat()]) if(t.id===id) Object.assign(t, campos);
  if(campos.lembrar_hora && window.Notification && Notification.permission==="default")
    Notification.requestPermission().catch(()=>{});
  aviso(msg, false);
  if(clienteAberto) abrirFicha(clienteAberto); else render();
}
function alternarAndamento(id){
  const t = tarefaAberta(id); if(!t) return;
  return gravarLembrar(id, {iniciada_em: t.iniciada_em ? null : new Date().toISOString()},
    t.iniciada_em ? "Tarefa voltou para não iniciada" : "Em andamento: a equipe vê que você começou");
}
function novaEtapaTarefa(id){
  caixa(`<h3>Nova etapa</h3>
    <p class="meio-sub">Um passo para cumprir a tarefa. A equipe vê quantas etapas já foram feitas.</p>
    <div class="form-linha"><input id="et-txt" style="flex:1" placeholder="Ex.: pedir o PPP à empresa"
      onkeydown="if(event.key==='Enter')gravarEtapaTarefa('${id}')"><button class="btn-rap" onclick="gravarEtapaTarefa('${id}')">Acrescentar</button></div>`);
  setTimeout(()=>{ const i=document.getElementById("et-txt"); if(i) i.focus(); });
}
function gravarEtapaTarefa(id){
  const i = document.getElementById("et-txt"), v = (i && i.value || "").trim(), t = tarefaAberta(id);
  if(!v || !t) return;
  return gravarLembrar(id, {etapas: [...(t.etapas||[]), {t: v, feito: false}]}, "Etapa acrescentada");
}
// shortcut: a lista inteira é regravada; duas pessoas marcando a mesma tarefa no mesmo segundo, vale a última
function marcarEtapaTarefa(id, j, ok){
  const t = tarefaAberta(id); if(!t) return;
  const ets = (t.etapas||[]).map((e,i)=>i===j ? {...e, feito: ok, por: ok ? eu.id : null, em: ok ? new Date().toISOString() : null} : e);
  const r = gravarLembrar(id, {etapas: ets}, ok ? `Etapa feita · ${ets.filter(e=>e.feito).length} de ${ets.length}` : "Etapa reaberta");
  // F454 · a última etapa feita oferece concluir a tarefa no mesmo lugar, como o checklist completo do Trello
  if(ok && ets.length && ets.every(e=>e.feito) && !t.concluida_em) Promise.resolve(r).then(()=>caixa(`<h3>Todas as etapas feitas</h3>
    <p class="meio-sub">A tarefa tem ${ets.length} ${ets.length===1?"etapa feita":"etapas feitas"}. Concluir a tarefa agora?</p>
    <div class="form-linha"><button class="btn-rap" id="et-concluir" onclick="fecharCaixa();concluirDeVez('${id}')" title="Concluir a tarefa">Concluir</button>
      <button class="btn-mini" onclick="fecharCaixa()" title="Deixar a tarefa aberta">Depois</button></div>`));
  return r;
}
function mudarHoraLembrar(id, hora){
  return gravarLembrar(id, {lembrar_hora: hora || null},
    hora ? `Aviso marcado para as ${hora} ⏰` : "Lembrete sem horário");
}
// a "soneca" do To Do: o aviso volta daqui a N minutos, hoje
function sonecaTarefa(id, min){
  const d = agoraSP(); d.setMinutes(d.getMinutes()+min);
  if(d.toLocaleDateString("sv")!==hoje()) return mudarLembrar(id, maisDias(1));
  const hora = d.toTimeString().slice(0,5);
  return gravarLembrar(id, {lembrar_em: hoje(), lembrar_hora: hora}, `Aviso adiado para as ${hora} ⏰`);
}
// a tarefa minha de hoje cuja hora chegou e que ainda não avisou
function lembretesNaHora(tarefas, hojeIso, horaAgora, avisados){
  return tarefas.filter(t=>!t.concluida_em && t.lembrar_hora && t.lembrar_em===hojeIso
    && String(t.lembrar_hora).slice(0,5)<=horaAgora
    && !avisados.has(`${t.id}|${t.lembrar_em}|${String(t.lembrar_hora).slice(0,5)}`));
}
// F297 · a sincronização parada avisa o administrador uma vez por carimbo velho: com a
// rodada de 10 em 10 minutos, o atraso de syncAtrasada são duas rodadas seguidas sem entrar
function avisoSyncParada(agora = Date.now()){
  const t = cfgApp("todo_sync_em");
  if(!souAdmin() || !t || ler("crm_aviso_sync")===t) return null;
  const min = Math.round((agora - new Date(t))/60000);
  if(!syncAtrasada(min)) return null;
  guardar("crm_aviso_sync", t);
  const txt = `A sincronização do To Do não entra desde ${fmtTS(t)} às ${horaSP(t)}. Veja no 🩺 qual passo falhou.`;
  aviso(`⚠ ${txt}`, false);
  if(window.Notification && Notification.permission==="granted") try{
    const n = new Notification("⚠ Sincronização parada · CRM", {body: txt, tag: "crm-sync-parada"});
    n.onclick = ()=>{ window.focus(); saudeSync(); n.close(); };
  }catch(e){}
  return txt;
}
function vigiarLembretes(){
  if(!eu || !D || !D.tarefasPorCaso) return;
  atualizarBadge(); avisoDas8(); avisoSyncParada();
  const avisados = new Set(JSON.parse(ler("crm_lemb_avisados")||"[]"));
  const minhas = [...D.tarefasPorCaso.values()].flat().filter(t=>t.colaborador_id===eu.id);
  const vez = lembretesNaHora(minhas, hoje(), agoraSP().toTimeString().slice(0,5), avisados);
  for(const t of vez){
    avisados.add(`${t.id}|${t.lembrar_em}|${String(t.lembrar_hora).slice(0,5)}`);
    const k = D.casoPorId.get(t.caso_id), c = k && D.cliPorId.get(k.cliente_id);
    const txt = `${c ? c.nome : "Tarefa"} · ${String(t.lembrar_hora).slice(0,5)}`;
    plim(); aviso(`⏰ Lembrete: ${txt}`, false);
    notificarLembrete(t, c, txt);
  }
  if(vez.length) guardar("crm_lemb_avisados", JSON.stringify([...avisados].slice(-300)));
}
// Com o programa guardado (sw.js), o aviso traz os botões do To Do: concluir
// e adiar 1 hora sem abrir o CRM. Sem ele, o aviso simples abre a ficha.
async function notificarLembrete(t, c, txt){
  if(!window.Notification || Notification.permission!=="granted") return;
  const titulo = "⏰ Lembrete · CRM", base = {body: txt, tag: "crm-lemb-"+t.id, requireInteraction: true};
  try{
    if(navigator.serviceWorker && navigator.serviceWorker.controller){
      const reg = await navigator.serviceWorker.ready;
      return await reg.showNotification(titulo, {...base, data: {tarefa: t.id, cliente: c ? c.id : null},
        actions: [{action: "concluir", title: "✔ Concluir"}, {action: "adiar", title: "⏰ Adiar 1 hora"}]});
    }
    const n = new Notification(titulo, base);
    n.onclick = ()=>{ window.focus(); if(c) abrirFicha(c.id); n.close(); };
  }catch(e){}
}
function cliqueNoAviso(d){
  if(d && d.crm==="zap"){ if(d.conversa) abrirConversaDaMencao(d.conversa, d.acao, d.mensagem); else { visao="whatsapp"; render(); } return; }
  if(d && d.crm==="mencao"){ irPara("mencoes"); return; }
  if(!d || d.crm!=="lembrete") return;
  if(d.acao==="concluir") concluirDeVez(d.tarefa);
  else if(d.acao==="adiar") sonecaTarefa(d.tarefa, 60);
  else if(d.cliente) abrirFicha(d.cliente);
}
// O NÚMERO NO ÍCONE (o "badge" do To Do): quem instalou o CRM como aplicativo
// vê no ícone quanto há no Meu Dia, ou só as vencidas. A escolha é deste
// navegador, como no To Do, e o padrão é o Meu Dia.
// o "Mostrar no Meu Dia as tarefas que vencem hoje" do To Do: desligado, o
// Meu Dia fica só com o que a pessoa pôs nele (e as menções a ela)
function mdMostraVence(){ return ler("crm_md_vence") !== "0"; }
const BADGE_OPCOES = [["meudia","Meu Dia"],["vencidas","Só as vencidas"],["nada","Desligado"]];
function contarVencidas(){
  const hj = hoje();
  return [...(D.tarefasPorCaso||new Map()).values()].flat()
    .filter(t=>t.colaborador_id===eu.id && !t.concluida_em && t.lembrar_em && t.lembrar_em<hj).length;
}
function atualizarBadge(){
  if(!navigator.setAppBadge || !eu || !D) return;
  const modo = ler("crm_badge") || "meudia";
  const n = modo==="nada" ? 0 : modo==="vencidas" ? contarVencidas() : quantosNoMeuDia();
  (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(()=>{});
}
function escolherBadge(){
  const atual = ler("crm_badge") || "meudia";
  caixa(`<h3>🔢 Número no ícone do CRM</h3>
    <p class="meio-sub">Aparece no ícone de quem instalou o CRM como aplicativo.</p>
    <div class="form-linha">${BADGE_OPCOES.map(([v,r])=>
      `<button class="btn-rap${v===atual?" on":""}" onclick="guardar('crm_badge','${v}');fecharCaixa();atualizarBadge();aviso('Número do ícone: ${r}',false)">${r}</button>`).join("")}</div>`);
}
async function mudarLembrar(id, data){
  if(!data) return;
  fecharCaixa();
  await api(`/rest/v1/andamento_tarefas?id=eq.${id}`,{method:"PATCH",
    headers:{Prefer:"return=minimal"}, body:JSON.stringify({lembrar_em:data})});
  const t=(D.tarefasFicha||[]).find(x=>x.id===id); if(t) t.lembrar_em=data;
  const ab=t && (D.tarefasPorCaso.get(t.caso_id)||[]).find(x=>x.id===id);
  if(ab) ab.lembrar_em=data;
  aviso(`Lembrete adiado para ${fmt(data)} 🗓`, false);
  if(clienteAberto) abrirFicha(clienteAberto);
}
async function marcarLido(andId, jaLi){
  const a=(D._andsFicha||[]).find(x=>x.id===andId);
  if(jaLi){
    await api(`/rest/v1/andamentos_lidos?andamento_id=eq.${andId}&colaborador_id=eq.${eu.id}`,{method:"DELETE"});
    if(a) a.andamentos_lidos=lidosDe(a).filter(l=>l.colaborador_id!==eu.id);
  } else {
    const agora=new Date().toISOString();
    try{
      await api(`/rest/v1/andamentos_lidos`,{method:"POST",
        headers:{Prefer:"return=minimal,resolution=merge-duplicates"},
        body:JSON.stringify({andamento_id:andId, colaborador_id:eu.id})});
    }catch(e){ return aviso("Rode o schema.sql mais novo no Supabase para usar o visto"); }
    if(a) (a.andamentos_lidos=lidosDe(a)).push({colaborador_id:eu.id, lido_em:agora});
    // marcar que leu já baixa a menção deste comentário: um controle só
    const m=(D.mencoes||[]).find(x=>x.andamento_id===andId && x.para_id===eu.id && !x.lida_em);
    if(m){
      await api(`/rest/v1/mencoes?id=eq.${m.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({lida_em:agora})});
      D.mencoes=D.mencoes.filter(x=>x.id!==m.id);
      montarSidebar();
    }
  }
  // redesenha só o próprio visto: recarregar a ficha inteira perderia a
  // rolagem e o texto meio escrito no campo de comentário
  const el=document.getElementById("visto-"+andId);
  if(el && a) el.outerHTML = vistos(a);
}

// ── rotina do escritório ──────────────────────────────────────────────────
// Tarefas que se repetem e não são de cliente nenhum: conferir e-mail, fechar
// o caixa, olhar o DOU. Cada uma tem dono e volta sozinha no dia seguinte
// programado — quem faz só marca "já fiz".
const DIAS_NOMES = ["domingo","segunda","terça","quarta","quinta","sexta","sábado"];
function rotinaVenceHoje(r, iso){
  const d = new Date((iso||hoje())+"T12:00:00");
  if(r.dia_mes){                       // mensal: no dia certo, ou no último do mês
    const ultimo = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
    return d.getDate() === Math.min(r.dia_mes, ultimo);
  }
  const dias = r.dias_semana || [];
  return dias.length ? dias.includes(d.getDay()) : true;   // sem dias = todo dia
}
function rotinaFeitaHoje(r){
  return (D.rotinasFeitas||[]).some(f=>f.rotina_id===r.id && f.dia===hoje());
}
function quandoRotina(r){
  if(r.dia_mes) return `todo dia ${r.dia_mes}`;
  const dias = r.dias_semana || [];
  if(!dias.length) return "todo dia";
  if(dias.length===5 && [1,2,3,4,5].every(x=>dias.includes(x))) return "dias úteis";
  return dias.slice().sort().map(x=>DIAS_NOMES[x]).join(", ");
}
function rotinasDoDia(){
  return (D.rotinas||[])
    .filter(r=>r.ativo!==false && rotinaVenceHoje(r))
    .filter(r=>!filtroColab || r.responsavel_id===filtroColab || !r.responsavel_id);
}
function blocoRotinas(){
  const rs = rotinasDoDia();
  if(!rs.length) return "";
  const pend = rs.filter(r=>!rotinaFeitaHoje(r));
  return `<h3 class="secao">🔁 Rotina do escritório (${pend.length} para fazer)</h3>
    ${rs.map(r=>{
      const feita=rotinaFeitaHoje(r), co=D.colPorId.get(r.responsavel_id);
      return `<div class="rotina ${feita?"feita":""}">
        <button class="rot-ok" onclick="marcarRotina('${r.id}',${feita?1:0})"
          title="${feita?"desmarcar":"marcar como feita"}">${feita?"✔":"○"}</button>
        <div class="rot-txt">
          <div class="rot-tit">${esc(r.titulo)}</div>
          <div class="meio-sub">${esc(quandoRotina(r))}${r.detalhe?` · ${esc(r.detalhe)}`:""}</div>
        </div>
        ${co?`<span class="avatar mini" style="background:${co.cor}" title="${esc(co.nome)}">${esc(co.inicial)}</span>`:""}
        ${feita?"":`<button class="btn-mini" onclick="marcarRotina('${r.id}',0)" title="✔ Já fiz"><span aria-hidden="true">✔ Feito</span><span class="sr-only">✔ Já fiz</span></button>`}
      </div>`;
    }).join("")}`;
}
async function marcarRotina(id, jaFeita){
  const dia=hoje();
  if(jaFeita){
    await api(`/rest/v1/rotinas_feitas?rotina_id=eq.${id}&dia=eq.${dia}`,{method:"DELETE"});
    D.rotinasFeitas=(D.rotinasFeitas||[]).filter(f=>!(f.rotina_id===id && f.dia===dia));
  } else {
    await api(`/rest/v1/rotinas_feitas`,{method:"POST",headers:{Prefer:"return=minimal,resolution=merge-duplicates"},
      body:JSON.stringify({rotina_id:id, dia, colaborador_id:eu.id})});
    (D.rotinasFeitas=D.rotinasFeitas||[]).push({rotina_id:id, dia, colaborador_id:eu.id});
    plim(); aviso("✔ Rotina feita — volta no próximo dia programado");
  }
  // re-render mantendo a rolagem: dar baixa na 12ª rotina não pode devolver
  // a tela ao topo do Meu Dia
  const m=document.querySelector(".meio"), sc=m?m.scrollTop:0;
  render();
  if(m) m.scrollTop=sc;
}

function renderRotinas(){
  tituloLista("🔁 Organizacional");
  document.getElementById("sub-lista").textContent=
    "Tarefas do escritório que se repetem — não são de cliente. Aparecem no ☀️ Meu Dia de quem é responsável, no dia programado.";
  const rs=(D.rotinas||[]).filter(r=>r.ativo!==false);
  const linhas = rs.map(r=>{
    const co=D.colPorId.get(r.responsavel_id);
    return `<div class="rotina">
      <div class="rot-txt">
        <div class="rot-tit">${esc(r.titulo)}</div>
        <div class="meio-sub">🔁 ${esc(quandoRotina(r))}${r.detalhe?` · ${esc(r.detalhe)}`:""}
          ${rotinaVenceHoje(r)?` · <b>é hoje</b>`:""}</div>
      </div>
      ${co?`<span class="equipe-chip on"><span class="avatar mini" style="background:${co.cor}">${esc(co.inicial)}</span>${esc(co.nome)}</span>`
          :`<span class="meio-sub">sem responsável</span>`}
      <button class="btn-mini" onclick="apagarRotina('${r.id}')" title="tirar da rotina">✕</button>
    </div>`;
  }).join("") || "<p class='meio-sub'>Nenhuma rotina cadastrada ainda.</p>";
  document.getElementById("conteudo-meio").innerHTML = linhas + `
    <div class="caso" style="margin-top:12px">
      <div class="rotulo-caso">＋ nova tarefa da rotina</div>
      <div class="form-linha" style="margin-top:6px">
        <input id="rt-titulo" placeholder="o que precisa ser feito? (ex.: conferir a caixa de e-mail)" style="flex:1;min-width:240px">
        <select id="rt-resp">
          <option value="">quem faz? (todos)</option>
          ${equipeAtiva().map(c=>`<option value="${c.id}" ${c.id===eu.id?"selected":""}>${esc(c.nome)}</option>`).join("")}
        </select>
      </div>
      <div class="form-linha" style="align-items:center">
        <span class="rotulo-rap">🔁 QUANDO:</span>
        <select id="rt-quando" onchange="document.getElementById('rt-diames').style.display=this.value==='mes'?'':'none'">
          <option value="dia">todo dia</option>
          <option value="uteis" selected>todo dia útil</option>
          <option value="1">toda segunda-feira</option>
          <option value="2">toda terça-feira</option>
          <option value="3">toda quarta-feira</option>
          <option value="4">toda quinta-feira</option>
          <option value="5">toda sexta-feira</option>
          <option value="mes">uma vez por mês</option>
        </select>
        <input type="number" id="rt-diames" min="1" max="31" value="5" style="display:none;width:70px" title="dia do mês">
        <input id="rt-detalhe" placeholder="observação (opcional)" style="flex:1;min-width:180px">
        <button onclick="novaRotina()">Criar</button>
      </div>
    </div>`;
}
