function faixaIncapacidade(k){
  if(!k) return "";
  const cliId = k.cliente_id, todos = D.casosDoCliente.get(cliId)||[];
  if(!ehIncap(k) && !todos.some(x=>x.fase!=="encerrado" && ehIncap(x))) return "";
  const rows = linhaIncapacidade(cliId); if(!rows.length) return "";
  // o resumo anuncia o aviso vencido ou o próximo passo com data a vir, nunca um passo que já passou
  const hj = hoje(), prox = rows.flatMap(r=>r.prox.map(p=>({...p, nb:r.nb}))).filter(p=>p.alerta || String(p.data)>=hj)
    .sort((a,b)=>(b.urgente?1:0)-(a.urgente?1:0) || String(a.data).localeCompare(String(b.data)))[0];
  const numHtml = (x, r) => { const fora = r.vivo && x.caso.id!==r.vivo.id && !nbsDoCaso(x.caso).some(n=>soDig(n)===r.nb);
    return `<span class="incap-num${fora?" fora":""}">${esc(TIPO_NUM[x.tipo])} ${esc(fmtNum(x.tipo, x.d))}${fora ? ` <small>· em outro caso</small>
      <button class="btn-mini" onclick="levarNumero('${x.tipo}','${x.d}','${x.caso.id}','${r.vivo.id}')" title="levar ao caso ${esc(rotCurtoCaso(r.vivo))}">trazer</button>` : ""}</span>`; };
  const item = r => `<li class="incap-it${r.casos.includes(k)?" atual":""}${r.vivo?"":" passado"}">
    <div class="incap-l1"><b>${r.nb ? `NB ${esc(fmtNb(r.nb))}` : "Sem NB"}</b>${r.esp?`<span class="chip neutro" title="${esc(nomeDaEspecie(r.esp)||"")}">${esc(r.esp)}</span>`:""}
      <span class="incap-per">${r.ini?fmtBarra(r.ini):"?"} → ${r.dcb?fmtBarra(r.dcb):"…"}</span><span class="incap-sit">${esc(r.sit)}</span></div>
    <div class="incap-l2">${r.casos.map(x=>`<button type="button" class="incap-caso${x.id===k.id?" on":""}" onclick="escolhido('${cliId}','${x.id}')"
        title="abrir o caso">${esc(NOME_FASE[x.fase]||x.fase)}${x.etapa?` · ${esc(x.etapa)}`:""}</button>`).join("")
      || `<span class="meio-sub">sem caso no CRM (${esc([...r.fontes].join(", "))})</span>`}${r.nums.map(x=>numHtml(x, r)).join("")}</div>
    ${r.prox.length ? `<div class="incap-prox">${r.prox.map(p=>`<span${p.alerta?' class="alerta"':""}>${esc(p.txt)}</span>`).join("")}</div>` : ""}</li>`;
  const aberta = _incapAberta.has(cliId);
  return `<details class="incap" ${aberta?"open":""} ontoggle="this.open?_incapAberta.add('${cliId}'):_incapAberta.delete('${cliId}')">
    <summary><span class="incap-tit">Linha da incapacidade</span><span class="incap-res">${rows.length} ${rows.length===1?"benefício":"benefícios"}${
      prox ? ` · próximo: ${esc(prox.txt)}${prox.nb?` (NB ${esc(fmtNb(prox.nb))})`:""}` : ""}</span></summary>
    <ol class="incap-lista">${rows.map(item).join("")}</ol></details>`;
}

// ── catálogo de documentos (espelho do site interno) ──────────────────────
function docPorNome(nome){ return D.docs.find(d=>d.beneficio===nome); }
let _docLinhas=[];   // linhas exibidas no catálogo (índice = checkbox)
function renderDocCatalogo(){
  const alvo=document.getElementById("doc-conteudo"); if(!alvo) return;
  const d=docPorNome(document.getElementById("doc-ben").value);
  if(!d){ alvo.innerHTML="<p class='meio-sub'>Escolha um benefício.</p>"; return; }
  _docLinhas=[];
  const linha=(txt,marcado)=>{
    if(txt.startsWith("▸ "))
      return `<div class="cc-tit" style="color:var(--cinza);padding:8px 0 3px">${esc(txt.slice(2))}</div>`;
    const i=_docLinhas.push(txt)-1;
    return `<label style="display:flex;gap:8px;align-items:flex-start;font-size:13px;padding:3px 0;cursor:pointer">
      <input type="checkbox" class="doc-it" data-di="${i}" ${marcado?"checked":""} style="margin-top:3px">
      <span>${esc(txt)}</span></label>`;
  };
  const base=(d.itens||"").split("\n").filter(x=>x.trim());
  const extras=(d.extras||"").split("\n").filter(x=>x.trim());
  alvo.innerHTML =
    base.map(l=>linha(l,true)).join("")
    + (extras.length?`<div class="cc-tit" style="color:var(--laranja);padding:12px 0 3px">Conforme a atividade do cliente — marque o que se aplica</div>`
        + extras.map(l=>linha(l,false)).join(""):"")
    + ((d.observacoes)?`<p class="meio-sub" style="white-space:pre-wrap;margin-top:10px;background:var(--fundo);border-radius:8px;padding:10px">${esc(d.observacoes)}</p>`:"")
    + `<div class="form-linha" style="margin-top:10px">
        <button onclick="solicitarDocsCatalogo()" title="Imprimir e solicitar (vira checklist)"><span aria-hidden="true">Solicitar</span><span class="sr-only">Imprimir e solicitar (vira checklist)</span></button>
      </div>`;
}
async function solicitarDocsCatalogo(){
  const ben=document.getElementById("doc-ben").value;
  const dest=document.getElementById("doc-destino").value;
  const itens=[...document.querySelectorAll("#doc-conteudo .doc-it:checked")]
    .map(x=>_docLinhas[+x.dataset.di]).filter(Boolean);
  if(!itens.length) return aviso("Marque ao menos um documento");
  let casoId=dest, k;
  if(dest==="__novo__"){
    const c=D.cliPorId.get(clienteAberto);
    const [nk]=await api(`/rest/v1/casos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({cliente_id:clienteAberto, titulo:c.nome,
        beneficio:ben, fase:"escritorio", origem_lista:"🙋 Escritório"})});
    D.casos.push(nk); D.casoPorId.set(nk.id,nk);
    if(!D.casosDoCliente.has(clienteAberto)) D.casosDoCliente.set(clienteAberto,[]);
    D.casosDoCliente.get(clienteAberto).push(nk);
    casoId=nk.id; k=nk;
  } else k=D.casoPorId.get(casoId);
  if(!k) return aviso("Escolha o caso de destino");
  imprimirListaDocs(D.cliPorId.get(k.cliente_id), ben, itens, (docPorNome(ben)||{}).observacoes);
  let novos=0;
  for(const it of itens){
    const titulo=`📄 ${it.split(" — ")[0]}`;
    if(D.tarefas.some(t=>t.caso_id===casoId && t.titulo===titulo && !t.concluida)) continue;
    const [tf]=await api(`/rest/v1/tarefas`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:casoId, titulo})});
    if(tf){ D.tarefas.push(tf); novos++; }
  }
  // sem dois-pontos de propósito: o padrão "documentos solicitados: X" é o
  // gatilho do checklist automático — aqui os itens já foram criados acima
  await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({caso_id:casoId, autor_id:eu.id,
      texto:`📄 Lista de documentos de ${ben} impressa e solicitada ao cliente — ${itens.length} item(ns) no checklist do caso.`})});
  plim();
  aviso(dest==="__novo__"?`Caso novo criado + checklist com ${novos} documento(s) 📄`:`Checklist criado: ${novos} documento(s) 📄`);
  montarSidebar(); casoSel=casoId; abaAtiva=2; abrirFicha(clienteAberto);
}

async function cumprirExigencia(casoId){
  const k=D.casoPorId.get(casoId);
  // 11.92 · JUR-06: o que o clique muda, para o desfazer
  const antes = {exigencia_prazo:k.exigencia_prazo, exigencia_descricao:k.exigencia_descricao, ronda:k.ronda||null, etapa:k.etapa||null};
  k.exigencia_prazo=null; k.exigencia_descricao=null;
  await patchCaso(casoId, {exigencia_prazo:null, exigencia_descricao:null});
  // F236 · a nota diz a data da entrega e entra na memória da ficha: é o fato "aguardando análise" que a placa lê (fatosDaEtapa)
  const [na] = await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify({caso_id:casoId, autor_id:eu.id, texto:`Exigência cumprida e protocolada em ${fmtBarra(hoje())} no INSS.`})}) || [];
  if(na && Array.isArray(D._andsFicha) && clienteAberto===k.cliente_id){ na.andamentos_lidos = [{colaborador_id:eu.id}]; D._andsFicha.unshift(na); }
  // e fica marcada no caso (casos.ronda), que a coleta do PAT lê sem as anotações: sem isso, a próxima coleta via de novo "Em exigência"
  try{ const ronda = {...(k.ronda||{}), exig_cumprida:hoje()}; await patchCaso(casoId, {ronda}); k.ronda = ronda; }catch(e){}
  // F236 · a etapa "em exigência" ficava depois do cumprimento e ia ao portal
  if(k.etapa==="em exigência") await marcarEtapa(casoId, "aguardando análise");
  // o painel do prazo cumprido ficava aberto e desatualizado (teste 11.88, JUR-01)
  if(painelZapCli) fecharPrazoEsq(); else if(painelPz) fecharPainelPrazo();
  avisoDesfazer("Exigência cumprida ✔", async ()=>{
    Object.assign(k, {exigencia_prazo:antes.exigencia_prazo, exigencia_descricao:antes.exigencia_descricao, ronda:antes.ronda});
    await patchCaso(casoId, {exigencia_prazo:antes.exigencia_prazo, exigencia_descricao:antes.exigencia_descricao, ronda:antes.ronda});
    if(antes.etapa!==k.etapa) await marcarEtapa(casoId, antes.etapa);
    if(na) await api(`/rest/v1/andamentos?id=eq.${na.id}`,{method:"DELETE"});
    if(Array.isArray(D._andsFicha)) D._andsFicha = D._andsFicha.filter(a=>a!==na);
    aviso("Desfeito"); abrirFicha(clienteAberto);
  });
  abrirFicha(clienteAberto);
}
async function copiarMsgExigencia(casoId){
  const k=D.casoPorId.get(casoId), c=D.cliPorId.get(k.cliente_id);
  // F236 · sem a nota interna do prazo estimado; na diligência do CRPS, o que a Junta pediu, inteiro, em mensagem à cliente
  if(faseEfetiva(k)==="conselho" || /dilig[êe]ncia/i.test(k.exigencia_descricao||""))
    return copiar(`Olá, ${(c.nome||"").split(" ")[0]}! No seu recurso, o julgador pediu mais documentos (diligência), e a resposta tem de ser entregue até ${fmtBarra(k.exigencia_prazo)}. O pedido: ${pedidoDaDiligencia(k)} Pode nos mandar o que tiver por aqui ou trazer ao escritório? Qualquer dúvida, estamos à disposição. Escritório Tercini.`,
      "Mensagem da diligência copiada 💬");
  const m=modeloPor("exigencia");
  await copiar(preencher(m.texto, c, null, k.exigencia_prazo)+String(k.exigencia_descricao||"").replace(/\s*·\s*prazo estimado:[\s\S]*$/i,""),
    "Mensagem de exigência copiada 💬");
}
function agendarAtendimento(cliId){
  const c=D.cliPorId.get(cliId);
  const data=document.getElementById("ag-data").value;
  if(!data) return aviso("Escolha a data");
  const cod=document.getElementById("ag-tipo").value;
  window.open(gcal(`${cod} - ${c.nome}`, data, document.getElementById("ag-hora").value||"09:00",
    60, `Atendimento${c.telefone?" · "+c.telefone:""}`, "Escritório"), "_blank");
  // agendou -> a lista do que o cliente deve TRAZER vem junto (pedido do
  // Paulo): a aba 🖨 abre no benefício do caso, com a sugestão do sistema
  // pronta para marcar, imprimir e virar checklist
  abaAtiva=0; subCad="documentos"; repintarFicha();
  aviso("📋 Marque os documentos que o cliente deve trazer — imprima a lista; cada item vira checklist do caso", false);
}
async function novoModelo(){
  const t=document.getElementById("nm-titulo").value.trim(),
        x=document.getElementById("nm-texto").value.trim();
  if(!t||!x) return aviso("Preencha título e texto");
  const [m]=await api(`/rest/v1/modelos_mensagem`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify({titulo:t, texto:x, contexto:document.getElementById("nm-ctx").value})});
  D.modelos.push(m); aviso("Modelo salvo"); abrirFicha(clienteAberto);
}
// pasta do cliente — Drive (navegador) e Windows Explorer (protocolo crmpasta:)
function abrirDrive(cliId){
  const c=D.cliPorId.get(cliId), url=(c.campos||{}).pasta_drive;
  window.open(url || "https://drive.google.com/drive/search?q="+encodeURIComponent('"'+c.nome+'"'), "_blank");
}
function abrirExplorer(cliId){
  const c=D.cliPorId.get(cliId);
  location.href="crmpasta:"+encodeURIComponent(c.nome);
  aviso("Abrindo no Explorer… (precisa do atalho instalado nesta máquina — ver crm/fase2/atalho-explorer)");
}
async function salvarPasta(cliId){
  const c=D.cliPorId.get(cliId), v=document.getElementById("pd-url").value.trim();
  c.campos={...(c.campos||{}), pasta_drive:v||undefined};
  await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({campos:c.campos})});
  aviso(v?"Pasta vinculada 📁":"Vínculo removido — o 📁 volta a pesquisar pelo nome");
}

// checklist-modelo por benefício -> caso novo já nasce com o passo a passo
function cklDe(beneficio){
  if(!beneficio) return null;
  const b=dsa(beneficio);
  return D.ckls.find(x=>dsa(x.beneficio)===b)
      || D.ckls.find(x=>b.includes(dsa(x.beneficio)) || dsa(x.beneficio).includes(b));
}
async function aplicarChecklistCaso(caso, silencioso){
  const modelo=cklDe(caso.beneficio);
  if(!modelo) return 0;
  const existentes=new Set(D.tarefas.filter(t=>t.caso_id===caso.id).map(t=>dsa(t.titulo)));
  const novos=modelo.itens.split("\n").map(x=>x.trim()).filter(x=>x && !existentes.has(dsa(x)));
  for(const titulo of novos){
    const [t]=await api(`/rest/v1/tarefas`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:caso.id, titulo})});
    D.tarefas.push(t);
  }
  if(!silencioso && novos.length) aviso(`Checklist do benefício aplicado — ${novos.length} etapas 📋`);
  return novos.length;
}

// ══════════════════════════════════════════════════════════════════════════
// 📇 ATENDIMENTO — o cadastro é a PRIMEIRA tela do cliente (08.98)
// ══════════════════════════════════════════════════════════════════════════
// O caso nasce aqui, não numa aba separada: quem atende anota o que o cliente
// contou, define a espécie do benefício/serviço (ou deixa "ainda não
// definido"), pede os documentos — que saem impressos para o cliente e ficam
// registrados no CRM — e só então vira caso. Indicação de pagamento ao INSS
// não é caso: vira lembrete com o cronograma inteiro (pedido do Paulo).

// os dados civis moram em clientes.campos.civil: o cadastro do banco tem só
// nome/CPF/nascimento/telefone/endereço, e procuração e contrato precisam de
// RG, estado civil, profissão e o endereço quebrado em bairro/cidade/UF/CEP
const ESPECIE_PAGAMENTOS = "Indicação de pagamentos ao INSS";   // não vira caso: vira lembrete
// os dados civis moram nas colunas de `clientes` (schema_f9_cadastro.sql),
// com `campos.civil` de reserva enquanto a migração não roda — quem monta a
// tela é fichaIdentificacao(); quem lê para os documentos é civilDe()

// ══════════════════════════════════════════════════════════════════════════
// F9.1 · IDENTIFICAÇÃO — a grade de 12 colunas do Cadastro
// ══════════════════════════════════════════════════════════════════════════
// O nome do cliente é a identidade e vinha em quinto lugar, atrás da senha do
// Meu INSS numa caixa amarela — amarelo que, no sistema de tokens, quer dizer
// prazo. Agora o nome abre a grade, ocupando 8 das 12 colunas.
//
// ONDE MORA O DADO: cada campo tenta a COLUNA de `clientes` (criada pelo
// crm/fase2/schema_f9_cadastro.sql) e, se o banco ainda não tiver a coluna,
// cai em `campos.civil` — o mesmo lugar onde a 08.98 guardou. Assim a tela
// funciona antes e depois da migração, e o que foi escrito antes continua
// aparecendo. Ler é `valCli`; gravar é `salvarCliCampo`, que troca de destino
// sozinho quando o banco recusa a coluna.
// F160 · ORIGEM DO CLIENTE (lição do Tramitação Inteligente, 03.10.2026). A
// chave é a palavra que o funil 💼 Vendas já grava em leads.origem; o rótulo
// é o que a ficha e o painel mostram. "parceiro" e "cliente antigo" entram
// porque são as duas portas do escritório que o funil não tinha.
const ORIGENS_CLIENTE = [["indicação","Indicação"],["cliente antigo","Cliente antigo ou família"],
  ["parceiro","Advogado parceiro"],["site","Site"],["redes sociais","Redes sociais"],
  ["anúncio","Anúncio"],["outro","Outro"]];
const origemDe = c => valCli(c, "origem");
const CAD_CAMPOS = {
  sexo:         {rot:"Sexo",              col:6, tipo:"opcao", ops:[["F","Feminino"],["M","Masculino"]]},
  estado_civil: {rot:"Estado civil",      col:6, tipo:"opcao",
                 ops:[["solteiro","Solteiro(a)"],["casado","Casado(a)"],["uniao","União estável"],
                      ["viuvo","Viúvo(a)"],["divorciado","Divorciado(a)"]]},
  profissao:    {rot:"Profissão",         col:6, tipo:"texto"},
  nome_mae:     {rot:"Nome da mãe",       col:6, tipo:"texto", opcional:true},
  pis_nit:      {rot:"PIS / NIT",         col:6, tipo:"texto", opcional:true},
  // F160 · de onde o cliente veio. O mesmo vocabulário do funil 💼 Vendas,
  // para a origem do prospecto descer ao cadastro sem tradução
  origem:       {rot:"Origem",            col:4, tipo:"opcao", opcional:true, ops:ORIGENS_CLIENTE},
};
// o que a procuração, o contrato e as declarações exigem para sair prontos
// F236 · uma régua só: a Identificação conta as mesmas lacunas que a peça (faltaParaDocs lê daqui). Bairro, cidade, UF e
// CEP entram porque a qualificação os pede: a procuração saía com 9 lacunas enquanto a régua contava 5
const CAD_PRECISA = ["nome","cpf","dn","estado_civil","profissao","endereco","bairro","cidade","uf","cep"];
const CAD_ENDERECO = ["endereco","bairro","cidade","uf","cep"];
const ROT_CAMPO = {nome:"nome completo", cpf:"CPF", dn:"nascimento", endereco:"endereço", bairro:"bairro", cidade:"cidade", uf:"UF", cep:"CEP"};

function valCli(c, campo){
  if(!c) return "";
  const v = c[campo];
  if(v !== undefined && v !== null && v !== "") return v;
  return ((c.campos||{}).civil||{})[campo] || "";
}
function rotuloValor(campo, v){
  const cfg = CAD_CAMPOS[campo];
  if(!cfg || cfg.tipo!=="opcao") return v;
  return (cfg.ops.find(([k])=>k===v)||[null,v])[1];
}
// quais campos das peças estão em branco — o contador do título e o title
function cadFaltandoChaves(c){ return CAD_PRECISA.filter(k=>!valCli(c,k)); }
function cadFaltando(c){
  return cadFaltandoChaves(c)
    .map(k=>ROT_CAMPO[k] || ((CAD_CAMPOS[k]||{}).rot||k).toLowerCase());
}
// F180 · o chip vermelho do topo leva ao campo e já abre o editor dele
function abrirCampoFaltando(campo, cliId){
  if(CAD_ENDERECO.includes(campo)) campo = "endereco";   // F236 · as partes do endereço abrem o editor do endereço
  const alvo = document.getElementById(({cpf:"campo-cpf", dn:"campo-dn", nome:"campo-nome", endereco:"campo-endereco"})[campo] || "cad-"+campo);
  if(!alvo) return;
  const linha = alvo.closest(".cad-campo") || alvo;
  if(linha.scrollIntoView) linha.scrollIntoView({block:"center", behavior:"smooth"});
  if(campo==="endereco") editarEndereco(cliId);
  else if(["cpf","dn","nome"].includes(campo)) editarCampo(campo, cliId);
  else editarCad(campo, cliId);
}
// grava na coluna; banco sem a coluna (PGRST204/42703) cai em campos.civil
async function salvarCliCampo(cliId, campo, valor){
  const c = D.cliPorId.get(cliId); if(!c) return false;
  const v = valor === "" ? null : valor;
  try{
    await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({[campo]: v})});
    c[campo] = v;
    return true;
  }catch(e){
    const msg = String((e && e.message) || e);
    if(!/PGRST204|42703|does not exist|schema cache/i.test(msg)){
      aviso("Não consegui guardar — tente de novo"); return false;
    }
    const civil = {...(((c.campos||{}).civil)||{})};
    if(v === null) delete civil[campo]; else civil[campo] = v;
    c.campos = {...(c.campos||{}), civil};
    try{
      await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({campos: c.campos})});
    }catch(e2){ aviso("Não consegui guardar — tente de novo"); return false; }
    return true;
  }
}
// editor no lugar: o campo vira input/select sem sair da grade
function editarCad(campo, cliId){
  if(semCadastro()) return;   // F396
  const c = D.cliPorId.get(cliId), cx = document.getElementById("cad-"+campo);
  if(!c || !cx) return;
  const cfg = CAD_CAMPOS[campo] || {rot:campo, tipo:"texto"};
  const v = valCli(c, campo);
  cx.innerHTML = cfg.tipo==="opcao"
    ? `<select id="cad-ed" style="flex:1;min-width:110px;font-size:13px"><option value="">—</option>
        ${cfg.ops.map(([k,r])=>`<option value="${k}" ${v===k?"selected":""}>${esc(r)}</option>`).join("")}</select>
       <button class="cad-mini" onclick="guardarCad('${campo}','${cliId}')">Guardar</button>`
    : `<input id="cad-ed" value="${esc(v)}" ${cfg.dica?`placeholder="${esc(cfg.dica)}"`:""}
        style="flex:1;min-width:90px;font-size:13px">
       <button class="cad-mini" onclick="guardarCad('${campo}','${cliId}')">Guardar</button>`;
  const inp = document.getElementById("cad-ed");
  inp.focus(); if(inp.select) inp.select();
  inp.onkeydown = e => { if(e.key==="Enter") guardarCad(campo, cliId);
                         if(e.key==="Escape") abrirFicha(cliId); };
  if(cfg.tipo==="opcao") inp.onchange = () => guardarCad(campo, cliId);
}
async function guardarCad(campo, cliId){
  const inp = document.getElementById("cad-ed"); if(!inp) return;
  const ok = await salvarCliCampo(cliId, campo, (inp.value||"").trim());
  if(!ok) return;
  aviso(`${(CAD_CAMPOS[campo]||{}).rot||campo} guardado`, false);
  abrirFicha(cliId);
}
// ── telefones em lista ────────────────────────────────────────────────────
// `telefone` continua sendo o principal (é dele que o WhatsApp sai); a lista
// guarda os outros: o do filho, o do trabalho, o de recado.
function telefonesDe(c){
  const lista = Array.isArray(c.telefones) ? c.telefones
              : Array.isArray((c.campos||{}).telefones) ? c.campos.telefones : [];
  if(!lista.length) return c.telefone ? [{numero:c.telefone, obs:"principal", zap:true}] : [];
  // o mesmo número gravado em dois formatos ("16) 99999-0001" e "16999990001") é um telefone só
  const vistos = new Map(), out = [];
  for(const t of lista){
    const k = String(t.numero||"").replace(/\D/g,"").replace(/^55(?=\d{10,11}$)/,"");
    const ja = k && vistos.get(k);
    if(ja){ ja.zap = ja.zap || t.zap; ja.obs = ja.obs || t.obs; continue; }
    const n = {...t}; out.push(n); if(k) vistos.set(k, n);
  }
  return out;
}
async function salvarTelefones(cliId, lista){
  const c = D.cliPorId.get(cliId); if(!c) return;
  try{
    await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({telefones:lista})});
    c.telefones = lista;
  }catch(e){
    const msg = String((e && e.message) || e);
    if(!/PGRST204|42703|does not exist|schema cache/i.test(msg))
      return aviso("Não consegui guardar o telefone — tente de novo");
    c.campos = {...(c.campos||{}), telefones:lista};
    await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({campos:c.campos})}).catch(()=>aviso("Não consegui guardar o telefone"));
  }
  // o principal é o primeiro marcado como WhatsApp — é dele que sai a conversa
  const p = lista.find(t=>t.zap) || lista[0];
  if(p && p.numero !== c.telefone) await salvarCliCampo(cliId, "telefone", p.numero);
  reindexarCliente(c);
  abrirFicha(cliId);
}
function novoTelefone(cliId){
  if(semCadastro()) return;   // F396
  const c = D.cliPorId.get(cliId); if(!c) return;
  const num = (document.getElementById("cad-tel-novo")||{}).value||"";
  const obs = (document.getElementById("cad-tel-obs")||{}).value||"";
  if(!num.trim()) return aviso("Escreva o número");
  const lista = telefonesDe(c).concat([{numero:num.trim(), obs:obs.trim(), zap:!telefonesDe(c).length}]);
  salvarTelefones(cliId, lista);
}
function removerTelefone(cliId, i){
  if(semCadastro()) return;   // F396
  const c = D.cliPorId.get(cliId); if(!c) return;
  const lista = telefonesDe(c).filter((_,n)=>n!==i);
  salvarTelefones(cliId, lista);
}
// o telefone se corrige no lugar: número e de quem é
function editarTelefone(cliId, i){
  if(semCadastro()) return;   // F396
  const c = D.cliPorId.get(cliId); if(!c) return;
  const t = telefonesDe(c)[i]; if(!t) return;
  caixa(`<h3>Editar telefone</h3>
    <input id="et-num" value="${esc(foneZap(t.numero))}" inputmode="tel" aria-label="Telefone com DDD" style="width:100%">
    <input id="et-obs" value="${esc(t.obs||"")}" placeholder="de quem é (recado, filha…)" aria-label="De quem é o telefone" style="width:100%;margin-top:8px">
    <div class="form-linha" style="margin-top:10px"><button class="btn-sal" id="et-ok" title="Salvar o telefone">Salvar</button></div>`);
  const ok = () => {
    const num = document.getElementById("et-num").value.trim();
    if(!num) return aviso("Escreva o número");
    const lista = telefonesDe(c).map((x,n)=> n===i ? {...x, numero:num, obs:document.getElementById("et-obs").value.trim()} : x);
    fecharCaixa(); salvarTelefones(cliId, lista);
  };
  document.getElementById("et-ok").onclick = ok;
  ["et-num","et-obs"].forEach(id => document.getElementById(id).onkeydown = e => { if(e.key==="Enter") ok(); });
}
// "Conversa" abre a conversa do número no WhatsApp do CRM (o SMBot e o WhatsApp Web saíram em 06.11.2026)
async function zapDoTelefone(cliId, i){
  const c = D.cliPorId.get(cliId), t = c && telefonesDe(c)[i]; if(t) return zapDoNumero(t.numero);
}
async function zapDoNumero(numero){
  const fone = foneZapNovo(numero);
  if(!fone) return aviso("Número inválido: corrija o telefone com o DDD", true);
  let conv; try{ conv = await abrirContatoZap(fone, null); }catch(e){ return aviso("Não abri a conversa: "+msgErro(e)); }
  await recarregarZap(true).catch(()=>{});
  fecharPainelPrazo();
  if(visao!=="whatsapp") irPara("whatsapp");
  abrirConversa(conv, true);
}
function marcarZap(cliId, i){
  if(semCadastro()) return;   // F396
  const c = D.cliPorId.get(cliId); if(!c) return;
  const lista = telefonesDe(c).map((t,n)=>({...t, zap:n===i}));
  salvarTelefones(cliId, lista);
}

// ── a grade ───────────────────────────────────────────────────────────────
const CAD_IC = {
  fechar: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
  cadeado:`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.2a4 4 0 0 1 8 0v3.3M12 14.5v2.5"/></svg>`,
  olho:   `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/></svg>`,
  pasta:  `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3.5 7.5a2 2 0 0 1 2-2h3.4l2 2.4h7.6a2 2 0 0 1 2 2v8.1a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2Z"/></svg>`,
  tela:   `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="11" rx="2"/><path d="M9 20h6M12 15.5V20"/></svg>`,
  doc:    `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6.5 3.5h7l4.5 4.5v12a1 1 0 0 1-1 1h-10.5a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z"/><path d="M13.5 3.5V8h4.5"/></svg>`,
  duplas: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c.6-2.8 2.9-4.4 5.5-4.4s5 1.6 5.5 4.4"/><path d="M16 6.2a3 3 0 0 1 0 5.6M17.5 19c-.2-1.4-.7-2.6-1.5-3.5"/></svg>`,
  engren: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6.2 6.2l1.4 1.4M16.4 16.4l1.4 1.4M17.8 6.2l-1.4 1.4M7.6 16.4l-1.4 1.4"/></svg>`,
  agenda: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3.8" y="5.2" width="16.4" height="15" rx="2"/><path d="M8 3.5v3.4M16 3.5v3.4M3.8 10h16.4"/></svg>`,
  pessoa: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c.8-3.4 3.6-5.2 7-5.2s6.2 1.8 7 5.2"/></svg>`,
  lapis:  `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z"/></svg>`,
  copiar: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 8.5V5.3a1.8 1.8 0 0 0-1.8-1.8H5.3a1.8 1.8 0 0 0-1.8 1.8v8.4a1.8 1.8 0 0 0 1.8 1.8h3.2"/></svg>`,
  mais:   `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  zap:    `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M20 12a8 8 0 0 1-11.9 7L4 20l1.1-4A8 8 0 1 1 20 12Z"/></svg>`,
};
// um campo da grade: cheio mostra o valor; vazio mostra borda tracejada e o
// convite "clique para preencher" — travessão não diz o que fazer
function cadCampo(c, campo, colunas, conteudo, opcoes){
  const o = opcoes || {};
  const v = conteudo !== undefined ? conteudo : esc(rotuloValor(campo, valCli(c, campo)));
  const vazio = !v;
  const rot = o.rot || (CAD_CAMPOS[campo]||{}).rot || campo;
  return `<div class="cad-campo cad-c${colunas}${vazio?" vazio":""}"
      ${o.editavel===false?"":`onclick="if(!this.querySelector('#cad-ed'))editarCad('${campo}','${c.id}')" style="cursor:pointer"`}>
    <label>${esc(rot)}${o.editavel===false?"":`<button class="cad-lap" title="alterar">${CAD_IC.lapis}</button>`}</label>
    <div class="cad-v${o.grande?" grande":""}" id="cad-${campo}">${vazio?'<button type="button" class="cad-preencher">preencher</button>':v}</div>
  </div>`;
}
// RG e órgão emissor: um campo na tela, duas colunas no banco
// ══════════════════════════════════════════════════════════════════════════
// F9.3 · ENDEREÇO — capturado pela primeira vez, não migrado
// ══════════════════════════════════════════════════════════════════════════
// As sete colunas (logradouro, numero, complemento, bairro, cidade, uf, cep)
// já existiam no banco, TODAS zeradas, e o campo antigo de texto livre
// `clientes.endereco` também: zero de 1.890 clientes. Não há legado para
// migrar, o trabalho é capturar.
//
// O espelho existe por um motivo concreto: <ENDERECO> da procuração e do
// contrato lê `clientes.endereco` (preencherModeloDoc), enquanto <BAIRRO>,
// <CIDADE>, <ESTADO> e <CEP> leem as colunas novas. Gravar só as colunas
// deixaria a linha da rua em branco em nove dos dez modelos. Por isso toda
// gravação monta a linha e escreve nos dois lugares.
const UF_NOME = {AC:"Acre",AL:"Alagoas",AM:"Amazonas",AP:"Amapá",BA:"Bahia",CE:"Ceará",
  DF:"Distrito Federal",ES:"Espírito Santo",GO:"Goiás",MA:"Maranhão",MG:"Minas Gerais",
  MS:"Mato Grosso do Sul",MT:"Mato Grosso",PA:"Pará",PB:"Paraíba",PE:"Pernambuco",
  PI:"Piauí",PR:"Paraná",RJ:"Rio de Janeiro",RN:"Rio Grande do Norte",RO:"Rondônia",
  RR:"Roraima",RS:"Rio Grande do Sul",SC:"Santa Catarina",SE:"Sergipe",
  SP:"São Paulo",TO:"Tocantins"};
const UFS = Object.keys(UF_NOME).sort();
const soDigitos = s => String(s||"").replace(/\D/g,"");
const fmtCep = s => { const d=soDigitos(s); return d.length===8 ? d.slice(0,5)+"-"+d.slice(5) : (s||""); };
// o que vai para <ENDERECO>: rua, número e complemento, na ordem da qualificação
function enderecoMontado(v){
  const rua = [v.logradouro, v.numero?`nº ${v.numero}`:""].filter(Boolean).join(", ");
  return [rua, v.complemento].filter(Boolean).join(", ");
}
// "na Rua Rui Barbosa" mas "no Sítio Boa Esperança". A qualificação trazia a
// preposição fixa em "na", o que erra em todo logradouro masculino — e o
// rural do escritório é cheio deles. Quem não é nem um nem outro (o cliente
// que escreve só "Boa Esperança") sai com "em", que serve para os dois.
const LOGRADOURO_M = ["sitio","largo","loteamento","jardim","parque","conjunto","beco",
  "bairro","nucleo","assentamento","condominio","distrito","povoado","recanto",
  "residencial","morro","campo","bosque","vale","ramal","trevo","setor","km","lote",
  "patio","porto","engenho","caminho","corredor","acesso","anel","balneario","cais",
  "trecho","viaduto","aeroporto","bloco"];
const LOGRADOURO_F = ["rua","avenida","av","travessa","estrada","alameda","praca","praça",
  "rodovia","vila","colonia","ladeira","passagem","servidao","area","quadra","granja",
  "fazenda","comunidade","regiao","subida","esplanada","marginal","viela","ilha","lagoa",
  "gleba","linha","descida","circular","transversal","paralela","chacara","sesmaria"];
function prepEndereco(texto){
  const primeira = dsa(String(texto||"").trim()).split(/[\s,.]+/)[0] || "";
  if(LOGRADOURO_F.includes(primeira)) return "na";
  if(LOGRADOURO_M.includes(primeira)) return "no";
  return "em";
}
// a linha que aparece no campo da grade, com o resto do endereço junto
function enderecoLinha(c){
  const v = civilDe(c);
  const partes = [enderecoMontado(v), v.bairro,
                  [v.cidade, v.uf].filter(Boolean).join("/"), v.cep?`CEP ${fmtCep(v.cep)}`:""];
  return partes.filter(Boolean).join(" · ") || (c.endereco||"");
}
function cadCampoEndereco(c){
  const linha = enderecoLinha(c);
  return `<div class="cad-campo cad-c6${linha?"":" vazio"}"
      onclick="if(!this.querySelector('#end-cep'))editarEndereco('${c.id}')" style="cursor:pointer">
    <label>Endereço <button class="cad-lap" title="alterar">${CAD_IC.lapis}</button></label>
    <div class="cad-v" id="campo-endereco" style="font-weight:500;font-size:14px">${
      linha?esc(linha):'<button type="button" class="cad-preencher">preencher</button>'}</div>
  </div>`;
}
// sete campos no lugar, sem sair da grade — o mesmo caminho que o RG já usa
function editarEndereco(cliId){
  if(semCadastro()) return;   // F396
  const c = D.cliPorId.get(cliId), cx = document.getElementById("campo-endereco");
  if(!c || !cx) return;
  const v = civilDe(c);
  const cp = (id, val, dica, larg) =>
    `<input id="${id}" value="${esc(val||"")}" placeholder="${esc(dica)}" style="width:${larg}">`;
  cx.innerHTML = `<div class="cad-end" onclick="event.stopPropagation()">
    <div class="cad-linha" style="margin-top:0">
      ${cp("end-cep", fmtCep(v.cep), "00000-000", "104px")}
      <button class="cad-mini" onclick="buscarCep('${cliId}')" title="preenche rua, bairro, cidade e UF pelo CEP">buscar</button>
      <span id="end-recado" class="cad-apoio"></span>
    </div>
    <div class="cad-linha">
      ${cp("end-logradouro","", "rua, avenida, estrada…", "100%")}
    </div>
    <div class="cad-linha">
      ${cp("end-numero", v.numero, "nº", "72px")}
      ${cp("end-complemento", v.complemento, "apto, fundos, quadra…", "170px")}
    </div>
    <div class="cad-linha">
      ${cp("end-bairro", v.bairro, "bairro", "160px")}
      ${cp("end-cidade", v.cidade, "cidade", "160px")}
      <select id="end-uf" style="width:74px"><option value="">UF</option>
        ${UFS.map(u=>`<option value="${u}" ${v.uf===u?"selected":""}>${u}</option>`).join("")}</select>
    </div>
    <div class="cad-linha">
      <button class="cad-mini" onclick="guardarEndereco('${cliId}')">Guardar</button>
      <button class="cad-mini" onclick="abrirFicha('${cliId}')">cancelar</button>
    </div>
  </div>`;
  const log = document.getElementById("end-logradouro");
  log.value = v.logradouro || "";
  const cep = document.getElementById("end-cep");
  cep.focus(); cep.select();
  // Enter no CEP busca; Enter em qualquer outro campo guarda
  cep.onkeydown = e => { if(e.key==="Enter"){ e.preventDefault(); buscarCep(cliId); }
                         if(e.key==="Escape") abrirFicha(cliId); };
  ["end-logradouro","end-numero","end-complemento","end-bairro","end-cidade"].forEach(id=>{
    const el = document.getElementById(id);
    el.onkeydown = e => { if(e.key==="Enter"){ e.preventDefault(); guardarEndereco(cliId); }
                          if(e.key==="Escape") abrirFicha(cliId); };
  });
}
// A consulta é por BOTÃO, não a cada tecla (decisão do Paulo): sai o CEP e
// nada mais — nome, CPF e telefone do cliente não saem daqui.
async function buscarCep(cliId){
  const el = document.getElementById("end-cep"), recado = document.getElementById("end-recado");
  if(!el) return;
  const d = soDigitos(el.value);
  if(d.length !== 8){ recado.textContent = "o CEP tem 8 dígitos"; return; }
  recado.textContent = "buscando…";
  try{
    const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
    if(!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    if(j.erro){ recado.textContent = "CEP não encontrado — preencha à mão"; return; }
    const por = (id, val) => { const e2=document.getElementById(id); if(e2 && val) e2.value = val; };
    por("end-logradouro", j.logradouro);
    por("end-bairro", j.bairro);
    por("end-cidade", j.localidade);
    const uf = document.getElementById("end-uf"); if(uf && j.uf) uf.value = j.uf;
    el.value = fmtCep(d);
    recado.textContent = j.logradouro ? "" : "CEP de cidade inteira — digite a rua";
    const n = document.getElementById("end-numero"); if(n) n.focus();
  }catch(e){
    recado.textContent = "não consegui consultar o CEP — preencha à mão";
  }
}
// uma gravação só, com os oito campos. Banco sem as colunas novas
// (PGRST204/42703) cai em campos.civil, como salvarCliCampo já fazia —
// `endereco` é coluna antiga e existe nos dois casos. Devolve true quando
// gravou; é o mesmo caminho da ficha e da importação em massa.
async function gravarEnderecoCli(cliId, dados){
  const c = D.cliPorId.get(cliId); if(!c) return false;
  const endereco = enderecoMontado(dados);
  const corpo = {}; for(const k in dados) corpo[k] = dados[k] || null;
  corpo.endereco = endereco || null;
  try{
    await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify(corpo)});
    Object.assign(c, corpo);
    return true;
  }catch(e){
    const msg = String((e && e.message) || e);
    if(!/PGRST204|42703|does not exist|schema cache/i.test(msg)) return false;
    const civil = {...(((c.campos||{}).civil)||{})};
    for(const k in dados){ if(dados[k]) civil[k]=dados[k]; else delete civil[k]; }
    c.campos = {...(c.campos||{}), civil};
    try{
      await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({campos:c.campos, endereco: endereco || null})});
      c.endereco = endereco || null;
      return true;
    }catch(e2){ return false; }
  }
}
async function guardarEndereco(cliId){
  const val = id => ((document.getElementById(id)||{}).value||"").trim();
  const dados = {logradouro:val("end-logradouro"), numero:val("end-numero"),
                 complemento:val("end-complemento"), bairro:val("end-bairro"),
                 cidade:val("end-cidade"), uf:val("end-uf"), cep:soDigitos(val("end-cep"))};
  if(dados.cep && dados.cep.length!==8) return aviso("O CEP tem 8 dígitos");
  if(!await gravarEnderecoCli(cliId, dados))
    return aviso("Não consegui guardar o endereço — tente de novo");
  aviso(enderecoMontado(dados) ? "Endereço guardado" : "Endereço apagado", false);
  abrirFicha(cliId);
}

// ══════════════════════════════════════════════════════════════════════════
// F160 · REPRESENTANTE LEGAL (lição do Tramitação Inteligente, 03.10.2026)
// ══════════════════════════════════════════════════════════════════════════
// O curador do interditado, a mãe do menor, o tutor: quem assina a procuração
// e o contrato quando o segurado não assina. Mora em clientes.campos.
// representante {nome, cpf, qualidade} e sai na qualificação das peças como
// "neste ato representado(a) por …". Sem representante, as peças não mudam.
const QUALIDADES_REP = ["curadora","curador","mãe","pai","tutora","tutor","procuradora","procurador"];
function representanteDe(c){ const r=((c||{}).campos||{}).representante; return r && r.nome ? r : null; }
function linhaRepresentante(r){
  return [r.nome, r.cpf?`CPF ${fmtCpf(r.cpf)}`:"", r.qualidade].filter(Boolean).join(" · ");
}
// o trecho que entra depois do CEP na qualificação: concorda com o sexo do
// cliente, porque é ELE quem é representado
function fraseRepresentante(c){
  const r = representanteDe(c); if(!r) return "";
  const sexo = civilDe(c).sexo;
  const rep = sexo==="F" ? "representada" : sexo==="M" ? "representado" : "representado(a)";
  return `, neste ato ${rep} por ${r.nome}${r.cpf?`, inscrito(a) no CPF nº ${fmtCpf(r.cpf)}`:""}${
    r.qualidade?`, na qualidade de ${r.qualidade}`:""}`;
}
// F163 · o representante mora sob o nome: o ＋ ao lado do nome abre os campos
// aqui, e preenchido ele aparece numa linha que se edita no clique
function cadLinhaRepresentante(c){
  const r = representanteDe(c);
  return `<div class="cad-rep" id="campo-representante" onclick="event.stopPropagation();if(!this.querySelector('#rep-nome'))editarRepresentante('${c.id}')"
      ${r?`title="alterar o representante legal"`:`hidden`}>${r?`<span class="cad-apoio">${({F:"representada",M:"representado"})[civilDe(c).sexo]||"representado(a)"} por</span> ${esc(linhaRepresentante(r))}
      <button class="cad-lap" title="alterar">${CAD_IC.lapis}</button>`:""}</div>`;
}
function editarRepresentante(cliId){
  if(semCadastro()) return;   // F396
  const c = D.cliPorId.get(cliId), cx = document.getElementById("campo-representante");
  if(!c || !cx) return;
  const r = representanteDe(c) || {};
  cx.hidden = false;
  cx.innerHTML = `<div class="cad-end" onclick="event.stopPropagation()">
    <div class="cad-linha" style="margin-top:0">
      <input id="rep-nome" value="${esc(r.nome||"")}" placeholder="nome completo de quem assina" style="flex:1;min-width:200px">
    </div>
    <div class="cad-linha">
      <input id="rep-cpf" value="${esc(r.cpf?fmtCpf(r.cpf):"")}" placeholder="CPF" inputmode="numeric" style="width:140px">
      <input id="rep-qual" list="lista-qualidades" value="${esc(r.qualidade||"")}" placeholder="curadora, mãe, tutor…" style="width:170px">
      <datalist id="lista-qualidades">${QUALIDADES_REP.map(q=>`<option value="${q}">`).join("")}</datalist>
    </div>
    <div class="cad-linha">
      <button class="cad-mini" onclick="guardarRepresentante('${cliId}')">Guardar</button>
      ${r.nome?`<button class="cad-mini" onclick="guardarRepresentante('${cliId}', true)" title="o cliente volta a assinar por si">tirar</button>`:""}
      <button class="cad-mini" onclick="abrirFicha('${cliId}')">cancelar</button>
    </div>
  </div>`;
  const nome = document.getElementById("rep-nome"); nome.focus();
  ["rep-nome","rep-cpf","rep-qual"].forEach(id=>{
    document.getElementById(id).onkeydown = e => {
      if(e.key==="Enter"){ e.preventDefault(); guardarRepresentante(cliId); }
      if(e.key==="Escape") abrirFicha(cliId); };
  });
}
async function guardarRepresentante(cliId, tirar){
  const c = D.cliPorId.get(cliId); if(!c) return;
  const val = id => ((document.getElementById(id)||{}).value||"").trim();
  const nome = tirar ? "" : val("rep-nome"), cpf = soDigitos(val("rep-cpf")), qualidade = val("rep-qual");
  if(!tirar && !nome) return aviso("Escreva o nome de quem assina pelo cliente");
  if(!tirar && cpf && cpf.length!==11) return aviso("O CPF tem 11 dígitos");
  const campos = {...(c.campos||{})};
  if(nome) campos.representante = {nome, cpf, qualidade}; else delete campos.representante;
  try{
    await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({campos})});
  }catch(e){ return aviso("Não consegui guardar o representante — tente de novo"); }
  c.campos = campos;
  aviso(nome ? "Representante legal guardado" : "Representante retirado", false);
  abrirFicha(cliId);
}

// ── importação em massa ───────────────────────────────────────────────────
// Preencher 1.890 endereços um a um é trabalho de semanas. Quem já tem a
// lista fora do CRM (planilha do escritório, exportação do contador) cola
// aqui. Colunas separadas por TAB, que é o que o Excel entrega no Ctrl+C;
// ponto e vírgula também vale. Vírgula NÃO, porque endereço tem vírgula.
//
// Nada é gravado antes da conferência: a tela mostra linha a linha o que o
// sistema entendeu e quem ele achou, e quem já tem endereço fica de fora
// salvo ordem expressa.
const IMP_COLUNAS = ["cpf","cep","logradouro","numero","complemento","bairro","cidade","uf"];
let _impEnd = [];
function janelaImportarEnderecos(){
  caixa(`<h3>Importar endereços de uma planilha</h3>
    <p class="meio-sub">Uma linha por cliente, colunas nesta ordem, separadas por TAB (Ctrl+C do Excel
      já vem assim) ou por ponto e vírgula. Só o CPF e o logradouro são obrigatórios.</p>
    <ol class="imp-colunas">${IMP_COLUNAS.map(x=>`<li>${x==="cpf"?"CPF":x==="cep"?"CEP":x==="uf"?"UF":esc(x)}</li>`).join("")}</ol>
    ${/* white-space:pre — a planilha colada tem linhas longas, e com quebra
         automática as colunas viravam sopa e ninguém conferia nada */""}
    <textarea id="imp-txt" rows="8" style="width:100%;resize:vertical;font-family:var(--f-mono,ui-monospace,Consolas,monospace);font-size:12px;white-space:pre;overflow-x:auto"
      placeholder="123.456.789-09&#9;15910-000&#9;Rua Rui Barbosa&#9;663&#9;sala 2&#9;Centro&#9;Monte Alto&#9;SP"></textarea>
    <div class="form-linha" style="margin-top:8px">
      <button onclick="conferirImportacao()">Conferir</button>
      <button class="btn-mini" onclick="fecharCaixa()">cancelar</button>
    </div>
    <div id="imp-res"></div>`);
}
function conferirImportacao(){
  const txt = (document.getElementById("imp-txt")||{}).value||"";
  _impEnd = [];
  txt.split(/\r?\n/).forEach(linha=>{
    if(!linha.trim()) return;
    const cel = linha.split(/\t|;/).map(x=>x.trim());
    const cpf = soDigitos(cel[0]);
    if(cpf.length !== 11) return;            // cabeçalho e lixo saem daqui
    const dados = {};
    IMP_COLUNAS.slice(1).forEach((nome,i)=>{ dados[nome] = cel[i+1] || ""; });
    dados.cep = soDigitos(dados.cep);
    dados.uf = (dados.uf||"").toUpperCase();
    const c = D.clientes.find(x=>digitosCpf(x.cpf)===cpf);
    let estado = "ok";
    if(!c) estado = "sem_cadastro";
    else if(enderecoLinha(c)) estado = "ja_tem";
    else if(!dados.logradouro) estado = "sem_rua";
    if(dados.cep && dados.cep.length!==8) estado = "cep_ruim";
    if(dados.uf && !UF_NOME[dados.uf]) estado = "uf_ruim";
    _impEnd.push({cpf, dados, cliente:c, estado});
  });
  const conta = e => _impEnd.filter(x=>x.estado===e).length;
  const bons = conta("ok"), jaTem = conta("ja_tem");
  const ROTULO = {ok:"pronto para gravar", ja_tem:"já tem endereço",
    sem_cadastro:"CPF não está no CRM", sem_rua:"sem logradouro na linha",
    cep_ruim:"CEP não tem 8 dígitos", uf_ruim:"UF não existe"};
  document.getElementById("imp-res").innerHTML = !_impEnd.length
    ? `<p class="meio-sub" style="margin-top:10px">Nenhuma linha com CPF de 11 dígitos.
       Confira se as colunas estão separadas por TAB.</p>`
    : `<p class="meio-sub" style="margin-top:10px">${_impEnd.length} linha(s) lidas ·
        <b>${bons}</b> pronta(s) para gravar${jaTem?` · ${jaTem} com endereço já preenchido`:""}.</p>
      ${/* linha que não vai ser gravada fica recuada: o que a tela precisa
           responder num relance é "o que vai acontecer quando eu clicar" */""}
      <div style="max-height:34vh;max-height:34dvh;overflow:auto;margin-top:6px">
        ${_impEnd.map(l=>`<div class="caso imp-linha${l.estado==="ok"?"":" fora"}">
          <span class="titulo-caso">${l.cliente?esc(l.cliente.nome):fmtCpf(l.cpf)}</span>
          <span class="meio-sub">${esc(enderecoMontado(l.dados)||"sem logradouro")}${
            l.dados.cidade?` · ${esc(l.dados.cidade)}${l.dados.uf?"/"+esc(l.dados.uf):""}`:""}</span>
          <span class="chip ${l.estado==="ok"?"verde":"neutro"}">${ROTULO[l.estado]}</span>
        </div>`).join("")}
      </div>
      ${jaTem?`<label class="cfg-ck" style="margin-top:8px">
        <input type="checkbox" id="imp-subst"> substituir também os ${jaTem} que já têm endereço</label>`:""}
      <div class="form-linha" style="margin-top:8px">
        <button onclick="gravarImportacao()" ${bons||jaTem?"":"disabled"}>Gravar</button>
        <button class="btn-mini" onclick="fecharCaixa()">cancelar</button>
      </div>`;
}
async function gravarImportacao(){
  const subst = (document.getElementById("imp-subst")||{}).checked;
  const fila = _impEnd.filter(l=>l.estado==="ok" || (subst && l.estado==="ja_tem"));
  if(!fila.length) return aviso("Nada para gravar");
  const res = document.getElementById("imp-res");
  let feitos = 0; const falhas = [];
  for(const l of fila){
    res.innerHTML = `<p class="meio-sub" style="margin-top:10px">gravando ${feitos+1} de ${fila.length}…</p>`;
    if(await gravarEnderecoCli(l.cliente.id, l.dados)) feitos++;
    else falhas.push(l.cliente.nome);
  }
  fecharCaixa();
  plim();
  aviso(falhas.length
    ? `${feitos} endereço(s) gravados · ${falhas.length} falharam (${falhas.slice(0,3).join(", ")})`
    : `${feitos} endereço(s) gravados`, false);
  montarSidebar(); render();
}

// A senha do Meu INSS morava numa caixa amarela ao lado do cartão — e amarelo,
// no sistema de tokens, quer dizer PRAZO. Senha não tem prazo. Agora ela é o
// penúltimo campo da própria grade, com a mesma moldura dos outros: sem senha,
// a borda tracejada convida a cadastrar, como todo campo em branco da tela.
function cadCampoSenha(c, tipo, rot, cr, colunas, extra){
  return `<div class="cad-campo cad-c${colunas||6}${extra?" "+extra:""}${cr?"":" vazio"}"
      ${cr?"":`onclick="trocarSenha('${c.id}','${tipo}','')" style="cursor:pointer"`}>
    <label><span class="cad-ic">${CAD_IC.cadeado}</span>${esc(rot)}</label>
    <div class="cad-v">${cr?`<span class="cad-segredo" id="cred-${cr.id}">••••••••</span>
      <button class="cad-mini" title="copiar — fica registrado quem copiou" onclick="copiarCred('${cr.id}')">${CAD_IC.copiar}copiar</button>
      <button class="cad-mini" title="ver — fica registrado" onclick="verCred('${cr.id}')">${CAD_IC.olho}ver</button>
      <button class="cad-mini" title="guardar uma senha nova no lugar desta" onclick="trocarSenha('${c.id}','${tipo}','${cr.id}')">${CAD_IC.lapis}trocar</button>`
    :'<button type="button" class="cad-preencher">preencher</button>'}${tipo==="meu_inss" && (c.campos||{}).gov ? `<span class="cad-apoio">${esc(govTxt(c.campos.gov))}</span>` : ""}</div>
  </div>`;
}
// a pasta do cliente fecha a grade: é onde o documento assinado vai parar
function cadCampoPasta(c){
  return `<div class="cad-campo cad-c6">
    <label><span class="cad-ic">${CAD_IC.pasta}</span>Pasta do cliente</label>
    <div class="cad-v">
      <button class="cad-mini" onclick="abrirDrive('${c.id}')" title="abre no Google Drive (navegador)">${CAD_IC.pasta}Drive</button>
      <button class="cad-mini" onclick="abrirExplorer('${c.id}')" title="abre no Windows Explorer (requer o atalho instalado)">${CAD_IC.tela}Explorer</button>
      ${(c.campos||{}).pasta_drive?"":`<span class="cad-apoio">sem link fixo; a busca vai pelo nome</span>`}</div>
  </div>`;
}
// F23 · registro avulso: anotação de cliente que não pertence a caso nenhum.
// Fica em clientes.campos.registros, com autor e data — o rastro em tudo.
// F23 → F127 · a parceria passou a ser escolhida na lista de parceiros
// (definirParceriaCliente), ao lado do nome e na Análise de Direito
// F35 · a regra da volta: registro avulso do próprio autor se apaga
async function apagarRegistroAvulso(cliId, idx){
  const c=D.cliPorId.get(cliId); if(!c) return;
  const rs=[...(((c.campos||{}).registros)||[])];
  const r=rs[idx]; if(!r) return;
  if(r.quem!==eu.id) return aviso("Só quem registrou apaga");
  if(!await confirmar(`Apagar este registro seu?\n\n"${(r.texto||"").slice(0,120)}"`)) return;
  rs.splice(idx,1);
  c.campos={...(c.campos||{}), registros:rs};
  await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({campos:c.campos})}).catch(()=>{});
  aviso("Registro apagado", false); repintarFicha();
}
async function novoRegistroAvulso(cliId){
  const el = document.getElementById("ra-texto");
  const texto = (el && el.value || "").trim();
  if(!texto) return aviso("Escreva o que quer registrar");
  const c = D.cliPorId.get(cliId); if(!c) return;
  const registros = [...(((c.campos||{}).registros)||[]), {texto, quem:eu.id, em:hoje()}];
  c.campos = {...(c.campos||{}), registros};
  try{
    await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({campos:c.campos})});
  }catch(e){ return aviso("Não consegui guardar o registro — tente de novo"); }
  aviso("Registro guardado ✔"); repintarFicha();
}
// ══════════════════════════════════════════════════════════════════════════
// F127 · PARCERIA — a lista de advogados parceiros do escritório
// ══════════════════════════════════════════════════════════════════════════
// Os nomes vêm do To Do (etiquetas #Nome e "com a Dra. …" nos títulos) e da
// lista do Paulo; "outro…" acrescenta um nome novo à lista de todos. A
// escolha vale para o CLIENTE (campos.parceria) e desce para os casos ativos
// (k.parceria), que é o campo que a pesquisa e a lista 🤝 Parcerias leem.
const PARCEIROS_PADRAO = ["João Eduardo","Laís","Flávio","Natieli","Walter","Amanda","Marcos","Márcio",
  "Anderson","Mayara","Larissa","Alessandra","Fernanda","Cibele","Carlos Eduardo","Patrícia","João Álvaro"];
function parceiros(){
  try{ const v = cfgApp("parceiros"); const l = Array.isArray(v) ? v : (v ? JSON.parse(v) : null);
       return l && l.length ? l : PARCEIROS_PADRAO; }
  catch(e){ return PARCEIROS_PADRAO; }
}
// "com a Dra. Lais #Laís" → "Laís"; "com o Dr. Flávio" → "Flávio"
function limparParceria(s){
  const t = String(s||"").trim(); if(!t) return "";
  const tag = t.match(/#([\wÀ-ú]+)/);
  if(tag) return tag[1].replace(/([a-zà-ú])([A-ZÀ-Ú])/g, "$1 $2");
  return t.replace(/^com\s+(a|o)\s+/i, "").replace(/^dr\.?a?\.?\s+/i, "").split(",")[0].trim();
}
function parceriaDe(c, ks){
  const p = (c.campos||{}).parceria; if(p) return p;
  const k = (ks||[]).find(x=>x.parceria && x.fase!=="encerrado") || (ks||[]).find(x=>x.parceria);
  return k ? limparParceria(k.parceria) : "";
}
async function definirParceriaCliente(cliId, nome){
  const c = D.cliPorId.get(cliId); if(!c) return;
  nome = (nome||"").trim();
  if(nome === "__outro"){
    nome = (prompt("Nome do advogado parceiro")||"").trim();
    if(!nome) return repintarFicha();
    const lista = parceiros();
    if(!lista.includes(nome)){ try{ await guardarCfgApp("parceiros", lista.concat([nome])); }catch(e){} }
  }
  c.campos = {...(c.campos||{}), parceria: nome||null};
  try{ await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({campos:c.campos})}); }
  catch(e){ return aviso("Não consegui gravar a parceria — tente de novo"); }
  for(const k of (D.casosDoCliente.get(cliId)||[]).filter(x=>x.fase!=="encerrado")){
    try{ await patchCaso(k.id, {parceria: nome||null}); k.parceria = nome||null; }catch(e){}
  }
  reindexarCliente(c);
  aviso(nome ? `Parceria com ${nome} registrada ✔` : "Parceria retirada", false);
  repintarFicha(); montarSidebar();
}
function seletorParceria(c, ks, id){
  const atual = parceriaDe(c, ks);
  const lista = parceiros();
  const ops = atual && !lista.includes(atual) ? [atual].concat(lista) : lista;
  return `<select class="parc-sel" id="${id}" onclick="event.stopPropagation()"
      onchange="event.stopPropagation();definirParceriaCliente('${c.id}', this.value)" title="advogado parceiro neste cliente">
    <option value="">sem parceria</option>
    ${ops.map(p=>`<option value="${esc(p)}" ${p===atual?"selected":""}>${esc(p)}</option>`).join("")}
    <option value="__outro">outro…</option>
  </select>`;
}
function chipParceria(c, ks){
  const p = parceriaDe(c, ks); if(!p) return "";
  return `<span class="chip parc cli-parc" title="caso em parceria com ${esc(p)}"><span class="cli-parc-k">parceria</span>${esc(p)}</span>`;
}
// F127 · o CNIS na Identificação: quando foi lido, e o botão de abrir
function cadCampoCnis(c){
  const g = cnisDe(c);
  return `<div class="cad-campo cad-c4${g?"":" vazio"}">
    <label>CNIS</label>
    <div class="cad-v">${g ? `lido em ${esc(fmt(g.em))} · ${g.paginas} pág. · ${g.qtVinculos} vínculo(s)` : "não inserido"}
      ${g && g.caminho ? botaoAbrirCnis(c, false) : ""}
      ${botaoInserirCnis(c)}</div>
  </div>`;
}
const parentesAbertos = new Set();   // F164 · clientes com o cartão Parentes ou amigos aberto
function fichaIdentificacao(c, creds){
  const falta = cadFaltandoChaves(c);
  const rotFalta = cadFaltando(c);
  const pct = Math.round((CAD_PRECISA.length - falta.length) * 100 / CAD_PRECISA.length);
  // F236 · as partes do endereço contam uma a uma (é o que a peça deixa em branco) e viram um chip só, que abre o editor
  const endF = falta.filter(k=>CAD_ENDERECO.includes(k)), rotDe = k => rotFalta[falta.indexOf(k)];
  const chipsFalta = [...falta.filter(k=>!CAD_ENDERECO.includes(k)).map(k=>[k, rotDe(k), ""]),
    ...(endF.length ? [["endereco", endF.includes("endereco") ? "endereço" : `endereço: ${endF.map(rotDe).join(", ")}`, `falta no endereço: ${endF.map(rotDe).join(", ")}`]] : [])];
  const tels = telefonesDe(c);
  const idade = idadeDe(c.dn);
  const credInss = (creds||[]).find(cr=>cr.tipo==="meu_inss");
  const outrasCreds = (creds||[]).filter(cr=>cr.tipo!=="meu_inss");
  const ks = D.casosDoCliente.get(c.id) || [];
  // F180 · o topo diz quanto do cadastro está pronto para as peças; cada
  // chip vermelho é um campo em branco e leva ao editor dele. Os campos se
  // agrupam em três cartões (Documentos e acesso, Dados pessoais, Contato),
  // uma linha por campo: rótulo à esquerda, valor ou ação à direita.
  return `<div class="cad-cartao idf">
    <section class="idf-comp" aria-label="Cadastro completo?">
      <span class="cad-cont${falta.length?"":" cad-ok"}">${falta.length?`Cadastro ${pct}% completo · ${falta.length===1?"falta 1 dado":`faltam ${falta.length} dados`} para as peças`:"Cadastro completo"}</span>
      <span class="adr-barra" role="progressbar" aria-label="cadastro preenchido" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></span>
      ${falta.length?`<span class="idf-chips">${chipsFalta.map(([k, rot, tit])=>`<button type="button" class="idf-chip" data-falta="${k}"${tit ? ` title="${esc(tit)}"` : ""}
        onclick="abrirCampoFaltando('${k}','${c.id}')">${esc(rot)}</button>`).join("")}</span>`:""}
    </section>
    <div class="cad-grade idf-grade">
      ${/* F127 · a parceria em VERDE ao lado do nome, com a lista para trocar */""}
      <div class="cad-campo cad-c12 idf-nome" onclick="if(!this.querySelector('#ed-campo'))editarCampo('nome','${c.id}')" style="cursor:pointer">
        <label>Nome completo <button class="cad-lap" title="alterar">${CAD_IC.lapis}</button></label>
        <div class="cad-v grande" id="campo-nome">${esc(c.nome)}
          ${representanteDe(c)?"":`<button class="cad-mini" title="inserir o representante legal (curador, mãe, tutor)"
            onclick="event.stopPropagation();editarRepresentante('${c.id}')">${CAD_IC.mais}representante legal</button>`}
          ${/* F163 · a parceria no canto direito do cartão do nome */""}
          <span class="cad-parc">${chipParceria(c, ks)}${seletorParceria(c, ks, "parc-sel-id")}</span></div>
        ${cadLinhaRepresentante(c)}
      </div>

      <section class="idf-card" aria-labelledby="idf-doc">
        <h3 class="adr-h" id="idf-doc">Documentos e acesso</h3>
        <div class="cad-campo cad-c4${c.cpf?"":" vazio"}"
          onclick="if(!this.querySelector('#ed-campo'))editarCampo('cpf','${c.id}')" style="cursor:pointer">
          <label>CPF <button class="cad-lap" title="alterar">${CAD_IC.lapis}</button></label>
          <div class="cad-v" id="campo-cpf">${c.cpf?fmtCpf(c.cpf):'<button type="button" class="cad-preencher">preencher</button>'}
            ${c.cpf?`<button class="cad-mini" onclick="event.stopPropagation();copiar('${c.cpf}','CPF copiado')">${CAD_IC.copiar}copiar</button>`:""}</div>
        </div>
        ${cadCampoSenha(c, "meu_inss", "Senha Meu INSS", credInss, 4)}
        ${cadCampo(c, "pis_nit", 4, undefined, {rot:"PIS / NIT (todos)"})}
        ${cadCampoCnis(c)}
        ${outrasCreds.map(cr=>cadCampoSenha(c, cr.tipo, "Senha "+esc(cr.tipo.replace("_"," ")), cr)).join("")}
        ${cadCampoPasta(c)}
      </section>

      <section class="idf-card" aria-labelledby="idf-pes">
        <h3 class="adr-h" id="idf-pes">Dados pessoais</h3>
        <div class="cad-campo cad-c4${c.dn?"":" vazio"}"
          onclick="if(!this.querySelector('#ed-campo'))editarCampo('dn','${c.id}')" style="cursor:pointer">
          <label>Nascimento <button class="cad-lap" title="alterar">${CAD_IC.lapis}</button></label>
          <div class="cad-v" id="campo-dn">${c.dn?`${(dnIso(c.dn)||"").slice(8,10)}.${(dnIso(c.dn)||"").slice(5,7)}.${(dnIso(c.dn)||"").slice(0,4)}
            ${idade==null?"":`<span class="cad-apoio">${idade} anos</span>`}`:'<button type="button" class="cad-preencher">preencher</button>'}</div>
        </div>
        ${cadCampo(c, "sexo", 4)}
        ${cadCampo(c, "estado_civil", 4)}
        ${cadCampo(c, "profissao", 4)}
        ${cadCampo(c, "nome_mae", 4)}
        ${/* F163 · o representante legal subiu para o cartão do nome */""}
        ${cadCampo(c, "origem", 4)}
      </section>

      <section class="idf-card" aria-labelledby="idf-con">
        <h3 class="adr-h" id="idf-con">Contato</h3>
        <div class="cad-campo cad-c6 idf-bloco${tels.length?"":" vazio"}">
          <label>Telefones</label>
          ${tels.map((t,i)=>`<div class="cad-tel">
            <span class="cad-tel-n">${esc(foneZap(t.numero))}</span>
            <button class="cad-lap" title="editar o telefone" aria-label="editar ${esc(foneZap(t.numero))}" onclick="editarTelefone('${c.id}',${i})">${CAD_IC.lapis}</button>
            ${t.zap?`<span class="cad-tag">WhatsApp</span>`
              :`<button class="cad-mini" title="marcar como o WhatsApp do cliente" onclick="marcarZap('${c.id}',${i})">${CAD_IC.zap}é o WhatsApp</button>`}
            ${t.obs?`<span class="cad-tel-obs">${esc(t.obs)}</span>`:""}
            <button class="cad-mini" style="margin-left:auto" title="abrir a conversa no WhatsApp do CRM" onclick="zapDoTelefone('${c.id}',${i})"><span aria-hidden="true">Conversa</span><span class="sr-only">abrir conversa no WhatsApp do CRM</span></button>
            <button class="cad-lap" title="remover" aria-label="remover ${esc(t.numero||"")}" onclick="removerTelefone('${c.id}',${i})">${CAD_IC.fechar}</button>
          </div>`).join("") || `<div class="cad-v">nenhum telefone anotado</div>`}
          <div class="cad-linha">
            <input id="cad-tel-novo" placeholder="(16) 99999-0000" aria-label="telefone novo" style="width:130px"
              onkeydown="if(event.key==='Enter'){event.preventDefault();novoTelefone('${c.id}');}">
            <input id="cad-tel-obs" placeholder="de quem é (recado, filha…)" aria-label="de quem é o telefone" style="flex:1;min-width:110px"
              onkeydown="if(event.key==='Enter'){event.preventDefault();novoTelefone('${c.id}');}">
            <button class="cad-mini" onclick="novoTelefone('${c.id}')">${CAD_IC.mais}telefone</button>
          </div>
          ${ultimoZap()}
        </div>
        ${cadCampoEndereco(c)}
      </section>
      ${caixaAposCadastro(c)}
      ${caixaAtendimentos(c)}
      ${caixaNotasTodo(c)}
      ${caixaTranscricoes(c)}
      ${caixaQualidade(c)}
      ${/* onda 0 · o dossiê também na Identificação, que está sempre à vista */""}
      <div class="idf-dossie">${caixaDossie(c)}
        <button class="cad-mini idf-dz-run" style="margin-top:6px" title="Rodar o dossiê antes do atendimento: copia o CPF e abre o Meu INSS e o Emprega Brasil"
          onclick="dossieDoAtendimento('${c.id}')"><span aria-hidden="true">Dossiê</span><span class="sr-only">Rodar o dossiê antes do atendimento</span></button>
        <button class="cad-mini" style="margin-top:6px" title="busca de novo o que a extensão do gov.br baixou para este CPF"
          onclick="atualizarDossie('${c.id}')">Atualizar<span class="sr-only"> dossiê</span></button>
        ${casoDoDoc(c.id) ? `<button class="cad-mini sep-abrir" style="margin-top:6px" onclick="separarParaCliente('${c.id}')" title="Imprimir e separar para o cliente"><span aria-hidden="true">Separar</span><span class="sr-only">Imprimir e separar para o cliente</span></button>` : ""}
        ${ehContato(c) ? "" : itemNaoCliente(c).replace('class="tl-mais-it', 'style="margin-top:6px" class="cad-mini').replace(' role="menuitem"', "")}${itemContato(c)}</div>
    </div>
  </div>`;
}
// ══════════════════════════════════════════════════════════════════════════
// F129 · PARENTES OU AMIGOS — um bloco só, que serve à Identificação, à
// Triagem (é pergunta) e às Anotações
// ══════════════════════════════════════════════════════════════════════════
// Duas fontes: o VÍNCULO com outro cliente da base (tabela vinculos, clique
// abre a ficha) e a pessoa ESCRITA à mão (campos.parentes), que não é
// cliente. O mesmo formulário resolve os dois: nome da lista vira vínculo,
// nome fora da lista vira parente anotado.
function parentesDe(c){ return ((c.campos||{}).parentes)||[]; }
function vincsDoCliente(c){
  return (D._ficha && D._ficha.cliId===c.id) ? (D._ficha.vincs||[]) : [];
}
function blocoParentes(c, vincs, pref){
  vincs = vincs || vincsDoCliente(c);
  const lig = vincs.map(v=>{
    const outroId = v.cliente_id===c.id ? v.ligado_a : v.cliente_id;
    const o = D.cliPorId.get(outroId); if(!o) return "";
    return `<span class="chip neutro" style="cursor:pointer" onclick="abrirFicha('${o.id}')" title="cliente do escritório — abre a ficha">${CAD_IC.pessoa} ${esc(o.nome)}${v.relacao?" · "+esc(v.relacao):""}</span>
      <button class="cad-lap" title="desvincular" onclick="removerVinculo('${v.id}')">${CAD_IC.fechar}</button>`;
  }).join(" ");
  const livres = parentesDe(c).map((p,i)=>`<span class="chip neutro" title="anotado à mão${p.quem?` por ${esc(p.quem)}`:""}">${esc(p.nome)}${p.relacao?" · "+esc(p.relacao):""}${p.telefone?" · "+esc(p.telefone):""}</span>
      <button class="cad-lap" title="tirar" onclick="tirarParente('${c.id}',${i})">${CAD_IC.fechar}</button>`).join(" ");
  return `<div class="parentes-cx">
    <div class="parentes-lista">${[lig, livres].filter(Boolean).join(" ") || `<span class="meio-sub">nenhum parente ou amigo anotado</span>`}</div>
    <div class="form-linha" style="margin-top:6px">
      <input id="${pref}-par-nome" list="lista-clientes-${pref}" placeholder="nome (cliente da lista ou outra pessoa)" style="flex:1;min-width:180px"
        onkeydown="if(event.key==='Enter'){event.preventDefault();novoParente('${c.id}','${pref}');}">
      <input id="${pref}-par-rel" placeholder="relação (esposa, filho, indicou…)" style="width:170px"
        onkeydown="if(event.key==='Enter'){event.preventDefault();novoParente('${c.id}','${pref}');}">
      <input id="${pref}-par-tel" placeholder="telefone (opcional)" style="width:150px"
        onkeydown="if(event.key==='Enter'){event.preventDefault();novoParente('${c.id}','${pref}');}">
      <button class="cad-mini" onclick="novoParente('${c.id}','${pref}')">${CAD_IC.mais}acrescentar</button>
    </div>
    <datalist id="lista-clientes-${pref}">${D.clientes.map(x=>x.id!==c.id?`<option value="${esc(x.nome)}">`:"").join("")}</datalist>
  </div>`;
}
async function novoParente(cliId, pref){
  const c = D.cliPorId.get(cliId); if(!c) return;
  const v = id => ((document.getElementById(`${pref}-par-${id}`)||{}).value||"").trim();
  const nome = v("nome"), relacao = v("rel"), telefone = v("tel");
  if(!nome) return aviso("Escreva o nome");
  const outro = D.clientes.find(x=>x.id!==cliId && x.nome.toLowerCase()===nome.toLowerCase());
  if(outro){
    try{ await api(`/rest/v1/vinculos`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({cliente_id:cliId, ligado_a:outro.id, relacao:relacao||null})}); }
    catch(e){ if(e.status!==409) return aviso("Não consegui vincular — tente de novo"); }
    aviso(`${outro.nome.split(" ")[0]} vinculado como cliente 👪`, false);
    return abrirFicha(cliId);
  }
  const parentes = parentesDe(c).concat([{nome, relacao:relacao||null, telefone:telefone||null,
    quem:(eu.nome||"").split(" ")[0], em:hoje()}]);
  c.campos = {...(c.campos||{}), parentes};
  try{ await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({campos:c.campos})}); }
  catch(e){ return aviso("Não consegui guardar — tente de novo"); }
  aviso("Anotado ✔", false); repintarFicha();
}
async function tirarParente(cliId, i){
  const c = D.cliPorId.get(cliId); if(!c) return;
  const parentes = parentesDe(c).filter((_,n)=>n!==i);
  c.campos = {...(c.campos||{}), parentes};
  try{ await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({campos:c.campos})}); }
  catch(e){ return aviso("Não consegui guardar — tente de novo"); }
  repintarFicha();
}
// o texto de uma linha, para a triagem e a análise
function parentesTexto(c, vincs){
  const lig = (vincs||vincsDoCliente(c)).map(v=>{
    const o = D.cliPorId.get(v.cliente_id===c.id ? v.ligado_a : v.cliente_id);
    return o ? o.nome + (v.relacao?` (${v.relacao})`:"") + " · cliente" : ""; }).filter(Boolean);
  const livres = parentesDe(c).map(p=>p.nome + (p.relacao?` (${p.relacao})`:""));
  return lig.concat(livres).join("; ");
}

// os documentos leem daqui: a COLUNA de `clientes` quando o banco já tem
// (crm/fase2/schema_f9_cadastro.sql) e o `campos.civil` como reserva — a
// ficha grava num caminho ou no outro conforme o banco aceitar, e a peça não
// pode saber a diferença
function civilDe(c){
  if(!c) return {};
  const guardado = {...(((c.campos||{}).civil)||{})};
  for(const ch of ["rg","rg_orgao","sexo","estado_civil","profissao","nome_mae","pis_nit",
                   "logradouro","numero","complemento","bairro","cidade","uf","cep"])
    if(c[ch]) guardado[ch] = c[ch];
  return guardado;
}
// o que ainda falta para os documentos saírem sem lacuna. Sexo não entra:
// não é marcador de modelo nenhum — serve à flexão do texto, assunto da F12.
// F236 · a mesma régua da Identificação (CAD_PRECISA): a régua e a peça contam as mesmas lacunas
function faltaParaDocs(c){ return cadFaltando(c); }

// ── OS DOCUMENTOS DO ESCRITÓRIO ───────────────────────────────────────────
// Texto fiel aos modelos .docx do escritório. Só o contrato e o termo de
// representação mudam conforme a espécie — o resto é sempre igual.
// A profissão era pedida no cadastro, entrava em CAD_PRECISA e no contador de
// campos em branco, e não aparecia em peça nenhuma além da procuração do B31.
// Ou ela está na qualificação, ou não se cobra o campo. (F11)
// F23 · o RG saiu da qualificação (pedido do Paulo, 16.08.2026): documento
// em desuso — CPF identifica sozinho, e é o que o INSS usa.
const QUALIF = "<NOMESEGURADO>, brasileiro(a), nascido(a) em <DATANASCIMENTO>, <ESTADOCIVIL>, <PROFISSAO>, inscrito(a) no CPF nº <CPF>, residente e domiciliado(a) <ENDERECO>, <BAIRRO>, na cidade de <CIDADE>, Estado de <ESTADO>, CEP <CEP>";
const ESCRITORIO_RODAPE = "Rua Rui Barbosa, nº 663, Centro, Monte Alto/SP, CEP 15.910-000, fone (16) 3242-2908 – Cel (16) 98140-9271";

const CONTRATO_PARTES = `CONTRATANTE: ${QUALIF};

CONTRATADOS: PAULO ROBERTO TERCINI FILHO, brasileiro, solteiro, advogado inscrito na OAB/SP sob o nº 331.110 e no CPF/MF nº 224.627.048-09, MARCOS HENRIQUE DE PÁDUA AMORIM, brasileiro, solteiro, advogado inscrito na OAB/SP sob o nº 464.306 e no CPF/MF nº 105.950.296-80; AMANDA CRISTIANE CARNEIRO GARCEZ, brasileira, solteira, advogada, inscrita no CPF nº. 381.533.048-36, inscrita na OAB/SP sob o nº. 511.528, todos com escritório profissional na ${ESCRITORIO_RODAPE}, onde recebem notificações e intimações em geral.

CLÁUSULA PRIMEIRA: O Contratante, neste ato, contrata os serviços profissionais dos Advogados Contratados, acima nominados, para defesa de seus interesses, em PEDIDO ADMINISTRATIVO DE CONCESSÃO OU REVISÃO DE BENEFÍCIO PREVIDENCIÁRIO e para ingressar judicialmente com AÇÃO PREVIDENCIÁRIA DE CONCESSÃO OU REVISÃO DE BENEFÍCIO PREVIDENCIÁRIO, tendo como requerido o INSS – Instituto Nacional do Seguro Social;

CLÁUSULA SEGUNDA: O Contratado se obriga a patrocinar os interesses do Contratante nos processos supra, em todos os seus termos até final conclusão, velando da melhor forma possível pelos interesses do Contratante;

CLÁUSULA TERCEIRA: Pela contraprestação dos serviços prestados pelo Contratado, fica justo e acertado que o Contratante pagará os honorários advocatícios da seguinte forma:`;

const CONTRATO_ATRASADOS = "30% (trinta por cento) sobre o valor bruto dos atrasados que serão recebidos por meio de Requisição de Pequeno Valor (RPV) ou Precatório, com vencimento na data do recebimento da RPV ou do Precatório.";
const PAR_BRUTO = "PARÁGRAFO PRIMEIRO: Entende-se como valor bruto, descrito no item 2, ‘b’, aquele recebido por meio de Requisição de Pequeno Valor e/ou Precatório na forma integral, sem desconto de imposto de renda.";
const PAR_NOVO_BEN = "PARÁGRAFO SEGUNDO: Se, durante o trâmite do processo administrativo ou judicial, for solicitado e concedido novo benefício ao CONTRATANTE, será devida a quantia de 30% sobre cada parcela recebida deste novo benefício até o momento que ocorrer o trânsito em julgado do pedido anterior, com vencimento na data de recebimento de cada benefício, bem como 30% (trinta por cento) sobre o valor bruto dos atrasados do benefício anterior que serão recebidos por meio de Requisição de Pequeno Valor (RPV) ou Precatório, com vencimento na data do recebimento da RPV ou do Precatório.";

const CONTRATO_FIM = `CLÁUSULA QUARTA: O contratante autoriza a separação dos honorários contratados do valor principal, por ocasião da expedição do respectivo requisitório de pagamento ou precatório, nos termos do art. 22, §4º do Estatuto da Advocacia e da OAB (Lei nº 8.906/94).

CLÁUSULA QUINTA: As despesas efetuadas pelo Contratado, decorrentes direta ou indiretamente do processo administrativo e/ou judicial, serão reembolsadas pelo Contratante no momento em que forem realizadas, mediante apresentação de demonstrativo consolidado de custas e despesas acompanhado dos respectivos comprovantes de pagamento.
§1º: As despesas incluem custas judiciais, viagens, fotocópias, autenticações de documentos, expedição de certidões, assistentes técnicos, deslocamentos, interurbanos e quaisquer outras que decorrerem dos serviços prestados, objeto deste contrato.
§2º: A não apresentação do demonstrativo consolidado de despesas ou dos comprovantes de pagamento desobriga o Contratante a reembolsar respectivas custas e despesas.

CLÁUSULA SEXTA: O não pagamento dos honorários nas datas aprazadas importará em multa contratual de 10% (dez por cento) sobre os valores devidos, atualização monetária pelo INPC e juros moratórios de 1% ao mês.

CLÁUSULA SÉTIMA: Em caso de desistência da ação, expressa ou tácita, ou substituição do Advogado Contratado por parte do Contratante, os Honorários Advocatícios pactuados serão devidos integralmente, sendo que será apurado mediante cálculo aritmético simples, projetado sobre o montante que poderá ser auferido com a demanda em questão, independentemente do estado em que se encontrar o processo em epígrafe;
PARÁGRAFO ÚNICO: A ausência injustificada do Contratante em audiências será considerada desistência do processo.

CLÁUSULA OITAVA: Na hipótese de acordo judicial ou extrajudicial, decorrentes de ato de vontade do contratante, não inviabiliza a exigência dos honorários contratados com base no valor acordado ou na liquidação dos pedidos, nos termos do art. 22, §4º da Lei 8.906/94.

CLÁUSULA NONA: Em caso de inadimplemento do pagamento dos honorários contratados, o Contratado poderá realizar notificação extrajudicial ao Contratante, concedendo prazo para quitação da dívida. A notificação extrajudicial será documento hábil para a execução do presente contrato.

CLÁUSULA DÉCIMA: O não pagamento dos honorários nas datas aprazadas importará em multa contratual de 10% (dez por cento) sobre os valores devidos, atualização monetária pelo INPC e juros moratórios de 1% ao mês.

CLÁUSULA DÉCIMA PRIMEIRA: A possibilidade de propositura de outras ações próprias e seus valores correspondentes será objeto de novo contrato de honorários advocatícios ou aditivo a este, mediante prévia e expressa concordância das partes.

CLÁUSULA DÉCIMA SEGUNDA: O Contratante permite que os Contratados utilizem a senha GOV.BR para acessar o sistema do MEUINSS.

CLÁUSULA DÉCIMA TERCEIRA: Os canais oficiais de comunicação do escritório são o telefone fixo (16) 3242-2908, o celular (16) 98140-9271 e o endereço Rua Rui Barbosa, 663, Centro, na cidade de Monte Alto - SP. O Contratante se compromete a não aceitar ligações ou comunicações de outros números ou advogados que não sejam os expressamente previstos neste contrato.

CLÁUSULA DÉCIMA QUARTA: Estipulam o Foro da comarca de Monte Alto - SP, para dirimir litígios decorrentes do presente contrato.

E, por estarem assim contratados assinam o presente contrato em duas vias de igual teor.

<DATAEXTENSO>

_____________________________________
<NOMESEGURADO>
Contratante

_____________________________________
PAULO ROBERTO TERCINI FILHO
MARCOS HENRIQUE DE PÁDUA AMORIM
AMANDA CRISTIANE CARNEIRO GARCEZ
Advogados Contratados`;

// as 4 variantes do contrato: muda a CLÁUSULA TERCEIRA (os honorários) e,
// na revisão, cai o parágrafo do "novo benefício"
const CONTRATO_VARIANTES = {
  padrao: {rot:"Aposentadoria · Pensão por morte · Auxílio-reclusão",
    honor:`Se a concessão do benefício ocorrer quando do pedido junto ao INSS será devido, após a implantação do benefício, o valor correspondente a 3 (três) primeiros benefícios, na forma integral e com valor atualizado, com vencimento na data do recebimento de cada benefício;

Se a concessão do benefício ocorrer no âmbito de Recurso Administrativo ou na esfera Judicial será devido:
Os 3 (três) primeiros benefícios, na forma integral e com valor atualizado, após a implantação do benefício, com vencimento na data do recebimento de cada benefício; e,

${CONTRATO_ATRASADOS}`, novoBen:true},
  acidente: {rot:"Auxílio-acidente",
    honor:`Os 3 (três) primeiros benefícios, na forma integral e com valor atualizado, após a implantação do benefício, com vencimento na data do recebimento de cada benefício; e,

${CONTRATO_ATRASADOS}`, novoBen:true},
  incapacidade: {rot:"Benefícios por incapacidade",
    honor:`Se a concessão do benefício ocorrer quando do pedido junto ao INSS será devido, após a implantação do benefício, o valor correspondente a 20% (vinte por cento) sobre 06 (seis) primeiros benefícios, na forma integral e com valor atualizado, com vencimento na data do recebimento de cada benefício;

Se a concessão do benefício ocorrer no âmbito de Recurso Administrativo ou na esfera Judicial será devido:
30% (trinta por cento) sobre 06 (seis) primeiros benefícios atualizados, com vencimento na data do recebimento de cada benefício. Se o benefício for pago por período menor do que 06 (seis) meses após a sua implantação, os honorários serão correspondentes a 30% sobre o número de meses que for pago o benefício; e,

${CONTRATO_ATRASADOS}`, novoBen:true},
  servico: {rot:"Serviço (honorários combinados no atendimento)",
    honor:`Pelo serviço contratado, os honorários são de R$ ____________ (________________________), pagos da seguinte forma: ________________________________________.

Havendo valores a receber em razão do serviço (restituição, atrasados ou diferenças), serão devidos ainda ____% (________ por cento) sobre eles, com vencimento na data do recebimento.`, novoBen:false},
  revisao: {rot:"Revisões",
    honor:`As 3 (três) primeiras diferenças obtidas com a revisão da aposentadoria, iniciadas após a implantação do novo benefício, com vencimento na data do recebimento de cada benefício; e,

${CONTRATO_ATRASADOS}`, novoBen:false},
};
