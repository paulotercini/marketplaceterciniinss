function verAposFuturas(cliId){
  const c = D.cliPorId.get(cliId); if(!c) return;
  caixa(`<div class="apos-modal" data-cli="${c.id}">${conteudoAposFuturas(c)}</div>`);
}
// marcar à mão: 1 = já se aposentou, 0 = não, null = voltar à dúvida
async function marcarAposentado(cliId, valor){
  const c=D.cliPorId.get(cliId); if(!c) return;
  const v = valor===null ? null : !!Number(valor);
  const dados = v===null
    ? {aposentado:null, aposentado_fonte:null, aposentado_em:null, aposentado_prova:null}
    : {aposentado:v, aposentado_fonte:"manual", aposentado_em:hoje(), aposentado_prova:null};
  try{
    await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify(dados)});
  }catch(e){ return aviso("Rode o schema.sql mais novo no Supabase"); }
  Object.assign(c, dados);
  aviso(v===null ? "Voltou para conferir" : v ? "✔ Marcado como já aposentado"
                                             : "Marcado como não aposentado");
  // chamado do Meu Dia, fica no Meu Dia; da ficha, redesenha a ficha
  if(clienteAberto) abrirFicha(clienteAberto);
  else { montarSidebar(); render(); }
}
function novaApos(cliId, data, especie){
  document.getElementById("apos-form").innerHTML=`
    <div class="form-linha" style="margin-top:8px">
      <input type="date" id="ap-data" value="${data||""}">
      <input id="ap-esp" list="lista-especies" placeholder="espécie" value="${especie||""}" style="min-width:150px">
      <datalist id="lista-especies">${ESPECIES_APOS.map(e=>`<option value="${e}">`).join("")}</datalist>
      <button onclick="salvarApos('${cliId}')">Guardar</button>
      <button class="btn-mini" onclick="document.getElementById('apos-form').innerHTML=''">cancelar</button>
    </div>`;
  document.getElementById("ap-data").focus();
}
async function salvarApos(cliId){
  const data=document.getElementById("ap-data").value;
  const especie=document.getElementById("ap-esp").value.trim();
  if(!data||!especie) return aviso("Preencha a data e a espécie");
  const [a]=await api(`/rest/v1/aposentadorias`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify({cliente_id:cliId, data, especie, autor_id:eu.id})});
  if(a) (D.apos=D.apos||[]).push(a);
  aviso(`🎂 Guardado — avisa em ${fmt(avisoApos(data))}`);
  abrirFicha(cliId);
}
async function apagarApos(id){
  await api(`/rest/v1/aposentadorias?id=eq.${id}`,{method:"DELETE"});
  D.apos=(D.apos||[]).filter(a=>a.id!==id);
  aviso("Data apagada");
  if(clienteAberto) abrirFicha(clienteAberto);
}
async function definirSexo(cliId, sexo){
  const c=D.cliPorId.get(cliId); if(!c) return;
  await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({sexo})});
  c.sexo=sexo;
  abrirFicha(cliId);
}

// ── alterar o cadastro ────────────────────────────────────────────────────
// Telefone muda, CPF entra errado, nome de casada muda. O ✎ de cada campo
// troca o valor por um campo de digitação ali mesmo — sem tela nova, sem
// formulário de cadastro inteiro para corrigir um dígito.
const CAMPOS_CLI = {
  nome:     {rot:"Nome completo", tipo:"text"},
  cpf:      {rot:"CPF",           tipo:"text",  dica:"só números"},
  telefone: {rot:"Telefone",      tipo:"tel",   dica:"(16) 99999-0000"},
  dn:       {rot:"Nascimento",    tipo:"date"},
  endereco: {rot:"Endereço",      tipo:"text"},
};
function editarCampo(campo, cliId){
  if(semCadastro()) return;   // F425 · o clique no campo também abria o editor nos níveis 0 e 1
  const c=D.cliPorId.get(cliId), cx=document.getElementById("campo-"+campo);
  if(!c || !cx || !CAMPOS_CLI[campo]) return;
  const cfg=CAMPOS_CLI[campo];
  let valor=c[campo]||"";
  if(campo==="dn") valor = dnIso(c.dn) || "";           // input date quer AAAA-MM-DD
  if(campo==="cpf") valor = digitosCpf(valor);
  cx.innerHTML=`<div class="form-linha" style="margin:0;gap:6px">
    <input id="ed-campo" type="${cfg.tipo}" value="${esc(valor)}" ${cfg.dica?`placeholder="${cfg.dica}"`:""}
      style="flex:1;min-width:120px;font-size:14px">
    <button class="btn-mini" onclick="salvarCampo('${campo}','${cliId}')">Guardar</button>
    <button class="btn-mini" onclick="abrirFicha('${cliId}')">cancelar</button></div>`;
  const inp=document.getElementById("ed-campo");
  inp.focus(); inp.select();
  inp.onkeydown=e=>{ if(e.key==="Enter") salvarCampo(campo, cliId);
                     if(e.key==="Escape") abrirFicha(cliId); };
}
async function salvarCampo(campo, cliId){
  const c=D.cliPorId.get(cliId), inp=document.getElementById("ed-campo");
  if(!c || !inp) return;
  let v=(inp.value||"").trim();
  if(campo==="cpf"){
    v=digitosCpf(v);
    if(v && v.length!==11) return aviso("O CPF tem 11 dígitos");
    // dois cadastros com o mesmo CPF é o que a janela de duplicado evita
    let outro=v && D.clientes.find(x=>x.id!==cliId && digitosCpf(x.cpf)===v);
    if(v && !outro){ const r = await api(`/rest/v1/clientes?select=*&cpf=eq.${v}`).catch(()=>[]);
      if(r && r[0]){ outro = r[0]; D.clientes.push(outro); D.cliPorId.set(outro.id, outro); reindexarCliente(outro); } }
    // F542 · o CPF de outra ficha é a mesma pessoa em dois cadastros: junta esta na que tem o CPF
    if(outro){
      if(!confirm(`Esse CPF já é de ${outro.nome}. Juntar esta ficha à dela? As anotações, os telefones e o que estiver preso a esta ficha passam para lá, e nada é apagado.`)) return;
      if(await juntarFichas(cliId, outro.id)){ montarSidebar(); abrirFicha(outro.id); }
      return;
    }
  }
  if(campo==="dn"){
    if(v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return aviso("Data inválida");
    v = v ? v.slice(8,10)+v.slice(5,7)+v.slice(0,4) : null;   // volta a DDMMAAAA
  }
  if(campo==="nome" && !v) return aviso("O nome não pode ficar vazio");
  const novo = v || null;
  try{
    await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({[campo]:novo})});
  }catch(e){ return aviso(/duplicate|unique/i.test(e.message) ? "Esse CPF já está em outro cadastro"
                                                             : "Não consegui guardar — tente de novo"); }
  c[campo]=novo;
  reindexarCliente(c);
  aviso(`${CAMPOS_CLI[campo].rot} atualizado ✔`);
  montarSidebar(); abrirFicha(cliId);
}
// o índice da pesquisa guarda nome, CPF e telefone: mudou o cadastro, refaz
function reindexarCliente(c){
  const ks = D.casosDoCliente.get(c.id)||[];
  // todos os números do caso: o segundo processo, o NB extra e o NUP do CRPS também (teste 11.88, REC-03)
  const nums = k => { try{ return Object.values(numerosDoCaso(k)).flat().join(" "); }catch(e){ return ""; } };
  const texto = dsa([c.nome,c.cpf,c.telefone,telefonesDe(c).map(t=>t.numero).join(" "),ks.map(k=>k.titulo+" "+(k.processo||"")+" "+(k.nb||"")+" "+
    (k.beneficio||"")+" "+rotuloDoPedido(k)+" "+(k.parceria||"")+" "+((s=>s?`suspenso tema ${s.tema} ${s.trib} ${s.assunto||""}`:"")(suspensaoDe(k)))+" "+((k.protocolos||[]).join(" "))+" "+nums(k)).join(" ")].join(" "));
  // guarda também só os dígitos: acha o processo tanto por "0000001-14" quanto por "000000114"
  c._ix = texto + " " + texto.replace(/\D/g, "");
  c._nome_ix = dsa(c.nome);
}
// guarda a senha e apaga a antiga. Sem credId é cadastro novo — é por aqui
// que o campo em branco da grade convida a preencher (F9.2)
async function trocarSenha(cliId, tipo, credId){
  if(semCadastro()) return;   // F425
  const nova = prompt(credId ? "Nova senha do Meu INSS (fica guardada com registro de quem acessa):"
                             : "Senha do Meu INSS (fica guardada com registro de quem acessa):");
  if(nova===null) return;
  const v=nova.trim(); if(!v) return;
  await api(`/rest/v1/credenciais`,{method:"POST",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({cliente_id:cliId, tipo, valor:v})});
  if(credId) await api(`/rest/v1/credenciais?id=eq.${credId}`,{method:"DELETE"}).catch(()=>{});
  aviso(credId ? "Senha trocada" : "Senha guardada"); abrirFicha(cliId);
}

// ── anexar o documento (é para isto que o celular vai à casa do cliente) ──
// O 📷 abre a câmera direto no aparelho; no computador vira "escolher
// arquivo". O arquivo sobe para o bucket privado e entra na ficha como um
// andamento — quem anexou, quando e em qual processo fica registrado.
const MAX_ARQ = 20 * 1024 * 1024;
function nomeSeguro(n){
  return dsa(n).replace(/[^a-z0-9.\-_]+/g,"-").replace(/-+/g,"-").slice(-80) || "arquivo";
}
async function anexar(casoId, cliId){
  const inp=document.getElementById("arq-inp"), arq=inp&&inp.files&&inp.files[0];
  if(!arq) return;
  inp.value="";                                   // permite mandar o mesmo de novo
  await anexarArquivo(casoId, cliId, arq);
}
// F832 · o mesmo envio, com o nome que diz o que é (o laudo, a manifestação, os quesitos do cartão da perícia)
async function anexarArquivo(casoId, cliId, arq, nome=arq.name){
  if(arq.size > MAX_ARQ) return aviso("Arquivo grande demais (máximo 20 MB)");
  const stamp=new Date().toISOString().replace(/[:.]/g,"-").toLowerCase();
  const caminho=`${cliId}/${stamp}-${nomeSeguro(arq.name)}`;
  aviso("Enviando o arquivo…", false);
  try{
    await subirArquivo(caminho, arq);
    const [an]=await api(`/rest/v1/anexos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:casoId, cliente_id:cliId, autor_id:eu.id,
        nome, caminho, tipo:arq.type||null, tamanho:arq.size})});
    await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({caso_id:casoId, autor_id:eu.id, texto:`📎 Anexou: ${nome}`})});
    if(an) (D.anexos=D.anexos||[]).unshift(an);
    aviso("📎 Arquivo anexado");
    if(clienteAberto) abrirFicha(clienteAberto);
  }catch(e){
    aviso(/40[34]|bucket/i.test(e.message)
      ? "Rode o schema.sql mais novo no Supabase para usar os anexos"
      : "Não consegui enviar o arquivo — tente de novo");
  }
}
async function apagarAnexo(id){
  const a=(D.anexos||[]).find(x=>x.id===id); if(!a) return;
  if(!await confirmar(`Apagar "${a.nome}"? O arquivo sai do sistema.`)) return;
  await api(`/storage/v1/object/${BUCKET}/${a.caminho}`,{method:"DELETE"}).catch(()=>{});
  await api(`/rest/v1/anexos?id=eq.${id}`,{method:"DELETE"});
  D.anexos=D.anexos.filter(x=>x.id!==id);
  aviso("Arquivo apagado");
  if(clienteAberto) abrirFicha(clienteAberto);
}
const tamArq = n => n==null ? "" : n>=1048576 ? (n/1048576).toFixed(1).replace(".",",")+" MB"
                                              : Math.max(1,Math.round(n/1024))+" KB";
// ══════════════════════════════════════════════════════════════════════════
// F185 · A ABA DOCUMENTOS. As peças que a extensão traz (PJe, eproc, e-SAJ,
// PAT) e os acórdãos do CRPS moram aqui, por origem e em ordem de data — e não
// mais na caixa de arquivos do Escritório, que volta a ser só o que a equipe
// anexou à mão. Dois botões levam o caso inteiro para fora: o .zip com os
// originais e o PACOTE PARA O CLAUDE, um .md único com o texto de tudo.
// ══════════════════════════════════════════════════════════════════════════
const ORIGEM_DOC = { pje:"Judicial · PJe", eproc:"Judicial · eproc", esaj:"Judicial · e-SAJ",
                     pat:"INSS", crps:"Recurso (CRPS)", escritorio:"Escritório", dossie:"Dossiê do cliente",
                     gerado:"Gerado pelo escritório", assinado:"Assinado pelo cliente" };   // F219
// todos os documentos do caso, num formato só: {nome, caminho, tipo, tamanho,
// texto, data, origem, id?} — id existe para os de `anexos`; o acórdão do
// CRPS mora em casos.crps e abre pelo caminho
// "eproc TJSP (1º grau): Despacho/Decisão · 📎 DESPADEC1 — em 07/10/2025 — …"
// → "Despacho/Decisão"
function eventoDoAndamento(and){
  const t = String((and && and.texto) || "");
  const m = t.match(/^[^:]{0,60}:\s*(.+?)(?:\s+·\s+|\s+—\s+em\s+|$)/);
  const e = m ? m[1].replace(/^📎.*/, "").trim() : "";
  return e && e.length <= 120 ? e : "";
}
// a data do MOVIMENTO, e não a da gravação: o andamento do acervo nasce com
// criado_em = hora da importação (de propósito, para entrar nas Novidades), e
// a data verdadeira mora na chave — mov:processo:2026-08-12T13:44
function dataDoMovimento(and){
  if(!and) return "";
  const m = String(and.origem_id||"").match(/:(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return m ? `${m[1]}T${m[2]}:00` : (and.criado_em || "");
}
// F567 · Resumo do Caso (planejamento de 11.11.2026, variação 4 de 12.11.2026): o que o caso pede, com cada período, lido da peça
// do escritório. Aparece só fora do pré-caso e nas fases Conselho (recurso), Judicial e Pagamento (petição inicial); INSS fica sem.
// F570 · sem /i: o "do pedido de revisão" do corpo do pedido virava a última âncora e o recorte perdia os períodos
const RS_ANCORA = /DOS\s+PEDIDOS|DO\s+PEDIDO\b|DOS\s+REQUERIMENTOS|\bREQUERIMENTOS?\b(?!\s+ADMINISTRATIV)|\b(?:[Aa]nte|ANTE)\s+[oO]\s+(?:exposto|EXPOSTO)|\b(?:[Dd]iante|DIANTE)\s+(?:do|DO)\s+(?:exposto|EXPOSTO)/g;
// o rodapé de cada folha do e-SAJ e do PJe cai no meio do pedido
const rsLimpo = t => String(t||"").replace(/Este documento [ée] c[óo]pia do original[\s\S]{0,400}?c[óo]digo\s+\S+(?:\s*fls\.?\s*\d+)?/gi, " ")
  .replace(/^[^\S\n]*fls\.?\s*\d+[^\S\n]*$/gim, "").replace(/^[^\S\n]*\d{1,3}[^\S\n]*$/gm, "")
  .replace(/^.*Num\.\s*\d+\s*-\s*P[áa]g\.\s*\d+.*$/gim, "").replace(/^.*Assinado eletronicamente por.*$/gim, "").replace(/\n{3,}/g, "\n\n");
const RS_FASES = ["conselho", "judicial", "pagamento"];
const rsLigado = k => !!k && !k.pre_caso && ehPrev(k) && RS_FASES.includes(faseEfetiva(k));
const rsAssinada = d => d && typeof d.texto==="string" && d.texto.length>400 && /331[.\s]?110/.test(d.texto) && (RS_ANCORA.lastIndex=0, RS_ANCORA.test(d.texto))
  && !/processo administrativo integral|outros documentos/i.test(d.nome||"");
function fonteDoResumo(k){
  if(!rsLigado(k)) return null;
  const docs = documentosDoCaso(k).filter(rsAssinada), topo = d => d.texto.slice(0, 4000);
  if(faseEfetiva(k)==="conselho"){
    const d = docs.find(d=>/RECURSO ESPECIAL|C[âa]mara de Julgamento/i.test(topo(d))) || docs.find(d=>/RECURSO ORDIN[ÁA]RIO|Junta de Recursos/i.test(topo(d)));
    return d ? {docs:[d], id:d.id, nome:d.nome, data:d.data, rot:/RECURSO ESPECIAL|C[âa]mara/i.test(topo(d)) ? "Recurso especial" : "Recurso ordinário"} : null;
  }
  const naoInicial = /contrarraz|recurso|embargos|manifesta|r[ée]plica|impugna/i;
  const ini = docs.find(d=>d.inicial) || [...docs].reverse().find(d=>/EXCELENT/i.test(topo(d)) && !naoInicial.test(d.nome||"") && !naoInicial.test(d.texto.slice(0, 1500)));
  if(!ini) return null;
  const emendas = docs.filter(d=>d!==ini && (/emenda/i.test(d.nome||"") || /emenda/i.test(d.texto.slice(0, 1500))));
  return {docs:[ini, ...emendas], id:ini.id, nome:ini.nome, data:ini.data, rot:"Petição inicial" + (emendas.length ? " e emenda" : "")};
}
function recorteDoPedido(t){
  t = rsLimpo(t); RS_ANCORA.lastIndex = 0; // o test() de rsAssinada deixa o lastIndex adiante e o matchAll o copia
  const ms = [...t.matchAll(RS_ANCORA)]; if(!ms.length) return "";
  let ini = ms[ms.length-1].index;
  const antes = t.slice(Math.max(0, ini-3000), ini), cab = [...antes.matchAll(/(?:\b[IVX\d]{1,4}\s*[.)–-]\s*)?(?:DOS\s+PEDIDOS|DOS\s+REQUERIMENTOS|\bREQUERIMENTOS\b)/g)].pop();
  if(cab) ini = ini - antes.length + cab.index;
  const resto = t.slice(ini), fecho = resto.search(/Pede\s+deferimento|Nestes\s+termos|Termos\s+em\s+que/i);
  let fim = resto.length;
  if(fecho>=0){ const ass = resto.slice(fecho).search(/331[.\s]?110/); fim = ass>=0 ? fecho + ass + 7 : fecho + 200; }
  const ped = resto.slice(0, Math.min(fim, 9000));
  return t.slice(0, 500) + "\n[…]\n" + rsContexto(t.slice(0, ini), ped, 500) + ped;
}
// F570 · o pedido diz só as datas; a empresa e o agente estão na fundamentação, no trecho que cita a mesma data
function rsContexto(corpo, ped, desde = 0){
  const datas = [...new Set([...ped.matchAll(/\b\d{2}[./]\d{2}[./]\d{4}\b/g)].map(m=>m[0]))], jan = [];
  for(const d of datas){
    const rx = new RegExp(d.replace(/[./]/g, "[./]"), "g"); let m;
    while((m = rx.exec(corpo))){ if(m.index+550>desde) jan.push([Math.max(desde, m.index-250), Math.min(corpo.length, m.index+550)]); if(jan.length>40) break; }
  }
  jan.sort((a,b)=>a[0]-b[0]);
  const junt = []; for(const j of jan){ const u = junt[junt.length-1]; if(u && j[0]<=u[1]) u[1] = Math.max(u[1], j[1]); else junt.push([...j]); }
  let out = "", n = 0;
  for(const [a,b] of junt){ if(n + b - a > 6000) break; out += "[fundamentação] …" + corpo.slice(a, b) + "…\n"; n += b - a; }
  return out ? out + "[pedido]\n" : "";
}
let _rsAberto = (()=>{ try{ return localStorage.getItem("crm_resumo_aberto")==="1"; }catch(e){ return false; } })();
const _rsGerando = new Set();
function rsAlternar(){ _rsAberto = !_rsAberto; try{ localStorage.setItem("crm_resumo_aberto", _rsAberto ? "1" : "0"); }catch(e){} repintarFicha(); }
const rsCor = n => `var(--rs-${["rural","especial","comum","deficiencia","incapacidade"].includes(n) ? n : "outro"})`;
const rsMes = s => { const [a, m] = String(s||"").split("-"); return a ? `${m}/${a}` : ""; };
function rsBarra(ps, leg){
  if(!ps.length) return "";
  const t = s => Date.parse(s+"T00:00:00Z"), a = Math.min(...ps.map(p=>t(p.ini))), b = Math.max(...ps.map(p=>t(p.fim_iso))), tot = Math.max(b-a, 1);
  const segs = ps.map(p=>`<span class="rs5-seg" style="left:${((t(p.ini)-a)/tot*100).toFixed(2)}%;width:${((t(p.fim_iso)-t(p.ini))/tot*100).toFixed(2)}%;background:${rsCor(p.natureza)}" title="${esc(`${rsMes(p.ini)} a ${rsMes(p.fim_iso)} · ${p.dur} ${p.natureza}`)}"></span>`).join("");
  const y1 = new Date(a).getUTCFullYear(), y2 = new Date(b).getUTCFullYear(), meio = y2-y1>=2 ? `<span>${Math.round((y1+y2)/2)}</span>` : "";
  const nats = [...new Set(ps.map(p=>p.natureza))];
  return `<div class="rs5-barra" role="img" aria-label="${esc(ps.map(p=>`${p.dur} ${p.natureza}`).join("; "))}">${segs}</div>
    <div class="rs5-eixo" aria-hidden="true"><span>${y1}</span>${meio}<span>${y2}</span></div>
    ${leg ? `<div class="rs5-leg">${nats.map(n=>`<span><i class="rs5-pt" style="background:${rsCor(n)}"></i>${esc(maiusc1(n))}</span>`).join("")}</div>` : ""}`;
}
const maiusc1 = s => { s = String(s||""); return s.charAt(0).toUpperCase() + s.slice(1); };
const rsLink = (txt, js, extra) => `<button type="button" class="rs5-lk" ${extra||""} onclick="${js}">${txt}</button>`;
// F570 · o quadro segue a variação 4 do protótipo aprovado (c-280.html): cabeçalho com o link na cor da fase,
// o pedido, a linha do tempo com o eixo e, aberto, uma linha por período e a fonte com Copiar, Editar e Atualizar
// F612 · espécie de serviço que não é revisão do benefício (isenção de IR, CTC…): o resumo segue a espécie, e não vira "Ação de revisão"
const RS_SERVICO = ["CNIS","CTC","COPIA","JA","IIR","GPS","SD"];
const rsServico = k => RS_SERVICO.includes(k.especie) ? nomeDaEspecie(k.especie) : "";
const rsEspecie = k => k.especie || k.beneficio || "";
const rsVelho = (k, r) => !!(r && r.texto) && (r.especie !== undefined ? r.especie !== rsEspecie(k) : !!rsServico(k) && r.tipo === "Ação de revisão");
function quadroResumo(k){
  if(!rsLigado(k)) return "";
  const r = k.resumo, f = fonteDoResumo(k), gera = podeGravarCaso(), id = k.id, velho = rsVelho(k, r), tem = !!(r && r.texto) && !velho;
  const cor = (LC_FASE[faseEfetiva(k)] || LC_FASE.judicial)[0];
  const lk = _rsGerando.has(id) ? "" : tem ? rsLink(_rsAberto ? "Recolher" : "Abrir", "rsAlternar()", `aria-expanded="${_rsAberto}"`) : f && gera ? rsLink("Gerar", `gerarResumo('${id}')`) : "";
  const cx = corpo => `<section class="rs5" style="--rs-fase:${cor}" aria-label="Resumo do caso"><div class="rs5-cab"><b>Resumo do caso</b>${lk}</div>${corpo}</section>`;
  if(_rsGerando.has(id)) return cx(`<p class="rs5-falta">Lendo o pedido da peça…</p>`);
  if(velho) return cx(`<p class="rs5-falta">${f && gera ? "O resumo era de outra espécie; gere de novo pela espécie atual." : "Ainda não gerado."}</p>`);
  if(!tem) return cx(`<p class="rs5-falta">${f ? (gera ? `Pelo pedido da ${esc(f.rot.toLowerCase())}.` : "Ainda não gerado.") : "Sem documento do pedido no CRM."}</p>`);
  const ps = (r.periodos||[]).filter(p=>p.ini && p.fim_iso).sort((a,b)=>a.ini.localeCompare(b.ini));
  // F605 · revisão, DII pedida (com as alternativas) e pedido acessório: uma linha cada, fora da linha do tempo
  const revs = (r.objetos||[]).filter(o=>(o.natureza==="revisao" && o.motivo) || o.natureza==="outro" && o.motivo || (o.natureza==="incapacidade" && o.inicio && (o.subsidiario || !o.fim)));
  const ped = [r.tipo==="Ação de revisão" ? "Revisão" : "", maiusc1(r.beneficio), r.der ? `DER ${r.der}` : ""].filter(Boolean).join(" · ");
  const novo = f && r.fonte && f.id!==r.fonte.id && !(r.recusou||[]).includes(f.id) && !r.proposta;
  let aberto = "";
  if(_rsAberto){
    const lins = ps.map(p=>`<li><i class="rs5-pt" style="background:${rsCor(p.natureza)}"></i><span>${rsMes(p.ini)} a ${rsMes(p.fim_iso)}</span><span class="rs5-dur">${esc(p.dur)} ${esc(p.natureza)}</span>${p.local||p.motivo ? `<span class="rs5-sub">${esc([p.local, p.motivo].filter(Boolean).join(" · "))}</span>` : ""}</li>`)
      .concat(revs.map((o, i)=>{ const inc = o.natureza==="incapacidade", sub = o.subsidiario || (o.natureza==="revisao" && revs.slice(0, i).some(x=>x.natureza==="revisao"));
        return `<li><i class="rs5-pt" style="background:var(--rs-fase)"></i><span>${esc(inc ? `Incapacidade ${o.fim ? `com início entre ${o.inicio} e ${o.fim}` : `desde ${o.inicio}`}` : maiusc1(o.motivo))}</span><span class="rs5-dur">${sub ? "subsidiário" : "pedido"}</span>${inc ? (o.motivo ? `<span class="rs5-sub">${esc(o.motivo)}</span>` : "") : o.inicio ? `<span class="rs5-sub">desde ${esc(o.inicio)}</span>` : ""}</li>`; })).join("");
    const rot = r.fonte ? String(r.fonte.rot||"") : "", art = /^Recurso/.test(rot) ? "do" : "da";
    aberto = `${lins ? `<ul class="rs5-lins">${lins}</ul>` : ""}<div id="rs5-frase-${id}"></div>
      ${(r.faltas||[]).length ? `<p class="rs5-falta">Não localizado: ${esc(r.faltas.join("; "))}.</p>` : ""}
      ${(r.avisos||[]).map(a=>`<p class="rs5-aviso">${esc(a)}</p>`).join("")}
      <div class="rs5-fonte">${r.fonte ? `Lido ${art} <button type="button" class="rs5-doc" onclick="abrirAnexo('${esc(r.fonte.id)}')">${esc(rot.toLowerCase())}</button>${r.fonte.data ? `, ${esc(dataBR(String(r.fonte.data).slice(0,10)))}` : ""}${r.travado ? `, editado por ${esc(r.autor||"")}` : ""} · ` : ""}${rsLink("Copiar texto", `copiarResumo('${id}')`)}${podeAtender() ? ` · ${rsLink("Editar", `editarResumoCaso('${id}')`)}` : ""}${novo && gera ? ` · ${rsLink("Atualizar", `gerarResumo('${id}', true)`, 'title="Há peça mais nova: gerar uma proposta"')}` : ""}</div>`;
  }
  const prop = r.proposta ? `<div class="rs5-prop"><b>Proposta pela peça nova:</b> ${esc(r.proposta.texto)}<div class="rs5-acoes">${rsLink("Aceitar", `aceitarResumo('${id}')`)}${rsLink("Manter", `manterResumo('${id}')`)}</div></div>` : "";
  return cx(`<div class="rs5-ped">${esc(ped || "Pedido não localizado")}</div>${rsBarra(ps, !_rsAberto)}${aberto}${prop}`);
}
async function rsGravar(k, resumo){ k.resumo = resumo; try{ await patchCaso(k.id, {resumo}); }catch(e){ aviso("Não gravei o resumo: " + msgErro(e), true); } repintarFicha(); }
async function gerarResumo(casoId, comoProposta){
  const k = D.casoPorId.get(casoId); if(!k || !podeGravarCaso()) return;
  const f = fonteDoResumo(k); if(!f) return aviso("Sem documento do pedido no CRM.", true);
  const recorte = f.docs.map(d=>recorteDoPedido(d.texto)).filter(Boolean).join("\n\n=== emenda ===\n\n");
  _rsGerando.add(casoId); repintarFicha();
  let r; try{ r = await api("/functions/v1/caso_resumo", {method:"POST", body:JSON.stringify({recorte, hoje:hoje(), fase:faseEfetiva(k), der_caso:k.der||"", beneficio_caso:k.beneficio||""})}); }
  catch(e){ r = {erro: msgErro(e)}; }
  _rsGerando.delete(casoId);
  if(!r || r.erro){ repintarFicha(); return aviso("Não gerei o resumo: " + ((r && r.erro) || "sem resposta"), true); }
  const sv = rsServico(k), objs = (r.objetos||[]).filter(o=>["revisao","incapacidade","outro"].includes(o.natureza)).map(o=>sv && o.natureza==="revisao" ? {...o, natureza:"outro"} : o);
  const fonte = {id:f.id, nome:f.nome, data:f.data, rot:f.rot}, base = {texto:r.texto, periodos:r.periodos||[], objetos:objs, beneficio:sv || r.beneficio, der:r.der, tipo:sv || r.tipo, especie:rsEspecie(k), faltas:r.faltas||[], avisos:r.avisos||[], fonte};
  const atual = k.resumo;
  if(atual && atual.texto && (comoProposta || atual.travado)) return rsGravar(k, {...atual, proposta:{...base, em:new Date().toISOString()}});
  rsGravar(k, {...base, autor:eu && eu.nome, em:new Date().toISOString(), travado:false, versoes:(atual && atual.versoes)||[], recusou:(atual && atual.recusou)||[]});
}
function aceitarResumo(casoId){
  const k = D.casoPorId.get(casoId), r = k && k.resumo; if(!r || !r.proposta) return;
  const antes = JSON.parse(JSON.stringify(r)), {em, ...p} = r.proposta;
  rsGravar(k, {...r, ...p, proposta:null, travado:false, autor:eu && eu.nome, em:new Date().toISOString(), versoes:[...(r.versoes||[]), {texto:r.texto, em:r.em, autor:r.autor}].slice(-10)});
  avisoDesfazer("Resumo atualizado pela peça nova.", ()=>rsGravar(k, antes));
}
function manterResumo(casoId){
  const k = D.casoPorId.get(casoId), r = k && k.resumo; if(!r || !r.proposta) return;
  rsGravar(k, {...r, proposta:null, recusou:[...new Set([...(r.recusou||[]), r.proposta.fonte && r.proposta.fonte.id].filter(Boolean))]});
}
function copiarResumo(casoId){
  const r = (D.casoPorId.get(casoId)||{}).resumo; if(!r) return;
  navigator.clipboard.writeText(r.texto).then(()=>aviso("Texto copiado"), ()=>aviso("Não foi possível copiar", true));
}
function editarResumoCaso(casoId){
  const k = D.casoPorId.get(casoId), r = k && k.resumo; if(!r || !podeAtender()) return;
  const el = document.getElementById("rs5-frase-"+casoId); if(!el) return;
  el.outerHTML = `<div class="rs5-frase"><textarea id="rs5-ed-${casoId}" aria-label="Texto do resumo">${esc(r.texto)}</textarea><div class="rs5-acoes">${rsLink("Salvar", `salvarResumoCaso('${casoId}')`)}${rsLink("Cancelar", "repintarFicha()")}</div></div>`;
  document.getElementById("rs5-ed-"+casoId).focus();
}
function salvarResumoCaso(casoId){
  const k = D.casoPorId.get(casoId), r = k && k.resumo, t = (document.getElementById("rs5-ed-"+casoId)||{}).value;
  if(!r || !t || !t.trim() || t.trim()===r.texto) return repintarFicha();
  rsGravar(k, {...r, texto:t.trim(), travado:true, autor:eu && eu.nome, em:new Date().toISOString(), versoes:[...(r.versoes||[]), {texto:r.texto, em:r.em, autor:r.autor}].slice(-10)});
}
function documentosDoCaso(k){
  const andPorId = new Map((D._andsFicha||[]).map(a=>[a.id, a]));
  // onda 0 do dossiê · o documento preso ao CLIENTE (dossiê, anexo do pré-caso)
  // vale para todo caso dele: entra no .zip, no pacote e no pedido ao Claude
  const docs = (D.anexos||[]).filter(a=>a.caso_id===k.id || (!a.caso_id && a.cliente_id===k.cliente_id)).map(a=>({
    id:a.id, nome:a.nome, caminho:a.caminho, tipo:a.tipo, tamanho:a.tamanho, texto:a.texto,
    paginas:a.paginas, paginas_imagem:a.paginas_imagem,
    origem:a.origem||"escritorio",
    // a data do MOVIMENTO, quando o documento é de um; senão a do upload
    data:dataDoMovimento(a.andamento_id && andPorId.get(a.andamento_id)) || a.criado_em,
    // o que o movimento diz ("Despacho/Decisão", "Distribuído por sorteio"):
    // no eproc o nome do arquivo é só código (DESPADEC1, COMP6)
    evento:eventoDoAndamento(a.andamento_id && andPorId.get(a.andamento_id)), and_id:a.andamento_id }));
  for(const b of crpsBlocos(k)) for(const e of (b.eventos||[])) for(const f of (e.arquivos||[]))
    if(f.storage && !docs.some(d=>d.caminho===f.storage))
      docs.push({ nome:f.nome||"acórdão", caminho:f.storage, tipo:"application/pdf", tamanho:f.bytes||null,
                  texto:null, origem:"crps", data:isoCrps(e.data)||e.data||null });
  marcarIniciais(docs);
  return docs.sort((a,b)=>ordemPeca(b, a));
}
// F386 · a ordem da juntada no mesmo dia vem do número do documento no
// tribunal (fim do caminho), e não do nome: "Documentos Diversos" vinha antes
// da petição que ele acompanha
const idDaPeca = d => String(d.caminho||"").split("/").pop().replace(/\D/g,"").padStart(40,"0");
const ordemPeca = (a,b) => String(a.data||"").slice(0,10).localeCompare(String(b.data||"").slice(0,10))
  || (DOCS_JUDICIAIS.includes(a.origem) && a.origem===b.origem ? idDaPeca(a).localeCompare(idDaPeca(b)) : String(a.data||"").localeCompare(String(b.data||"")));
// a petição inicial pelo que o tribunal mostra: o eproc dá o código INIC, o
// e-SAJ a junta com o tipo escolhido no protocolo ("Petição (Outras)") e só a
// folha 1 da pasta a identifica; vale para a primeira peça do processo
const RX_TIPO_PETICAO = /^(peti[cç][aã]o( \(outras\))?|PET\d+)$/i;
function marcarIniciais(docs){
  const prim = new Map();
  for(const d of docs){
    if(!DOCS_JUDICIAIS.includes(d.origem)) continue;
    if(d.origem==="eproc" && /^INIC\d*$/.test(String(d.nome||"").trim())){ d.inicial = true; continue; }
    const p = String(d.caminho||"").split("/").slice(0,2).join("/"), q = prim.get(p);
    if(!q || ordemPeca(d, q) < 0) prim.set(p, d);
  }
  for(const d of prim.values()) if(!d.inicial && RX_TIPO_PETICAO.test(String(d.nome||"").trim())
    && (d.origem!=="esaj" || !d.texto || /^\s*fls\.?\s*1\b/i.test(d.texto))) d.inicial = true;
}
// F185 · cada aba mostra os SEUS documentos (Judicial: PJe/eproc/e-SAJ; INSS:
// PAT); os botões de levar para fora pegam o caso inteiro
const DOCS_JUDICIAIS = ["pje","eproc","esaj"];
const docsDaOrigem = (k, origens) => documentosDoCaso(k).filter(d=>!origens || origens.includes(d.origem));
function botaoDocs(k, origens, ativo, onclick){
  const n = docsDaOrigem(k, origens).length;
  return n ? `<button class="${ativo?"on":""}" onclick="${onclick}" title="as peças guardadas no CRM — abrir, baixar ou levar para o Claude">${temaV10()?"":"📂 "}Documentos (${n})</button>` : "";
}
// F190 · a seleção de documentos: o que vai para o .zip, o pacote e o Claude.
// A chave é a mesma que o conector do CRM entende (documentos_caso/ler_documento).
const docsSel = new Set();
const chaveDoc = d => d.id ? `anexo:${d.id}` : `crps:${d.caminho}`;
const docsEscolhidos = (k, soSel) => documentosDoCaso(k).filter(d=>!soSel || docsSel.has(chaveDoc(d)));
function marcarDoc(ch, on){ on ? docsSel.add(ch) : docsSel.delete(ch); repintarFicha(); }
async function pacoteSelecionados(casoId){
  const k = D.casoPorId.get(casoId); if(!k) return;
  await pacoteClaude(casoId, true);
  if(docsEscolhidos(k, true).some(d=>!d.texto || (Array.isArray(d.paginas_imagem) && d.paginas_imagem.length)))
    await digitalizadosClaude(casoId, true);
}
// O QUE PEDIR AO CLAUDE com os documentos: o pedido sai escrito, com a lista
// dos documentos pelo identificador do conector; o Claude os lê pelo CRM.
const PEDIDOS_DOCS = [
  ["resumo",   "Ler e resumir",                          "Leia e resuma: o que cada documento decide ou pede, os prazos que abre e o próximo passo do escritório."],
  ["laudo",    "Manifestação sobre o laudo pericial",    "Redija a manifestação sobre o laudo pericial: aponte as falhas técnicas, os quesitos não respondidos e a contradição com os documentos médicos do caso."],
  ["recurso",  "Recurso ou contrarrazões da decisão",    "Analise a decisão e minute a peça cabível (recurso, contrarrazões ou embargos de declaração), dizendo o prazo e o fundamento."],
  ["exigencia","Cumprimento de exigência do INSS",       "Prepare o cumprimento da exigência do INSS: o que foi pedido, quais documentos do cliente atendem e o texto da resposta."],
  ["crps",     "Recurso ao CRPS",                        "Minute o recurso ao CRPS contra a decisão, com os fundamentos de fato e de direito."],
  ["cliente",  "Resumo para o cliente",                  "Escreva um resumo para o cliente, em linguagem simples, pronto para enviar pelo WhatsApp."],
];
// os pedidos do processo inteiro citam cada fato pela peça e pelas fls.
const PEDIDOS_PROCESSO = [
  ["p_resumo",  "Resumo do processo",                          "Resuma o processo em ordem cronológica: o que cada parte pediu, o que o juízo decidiu e em que fase está, citando as fls. de cada peça."],
  ["p_recurso", "Pontos para o recurso",                       "Aponte os pontos da última decisão que se atacam em recurso: o erro de fato ou de direito, a prova dos autos que o demonstra, com as fls., e o recurso cabível com o prazo."],
  ["p_prazos",  "Conferência de prazos",                       "Confira os prazos do processo: cada intimação, o prazo que abriu, o termo final e se já foi cumprido, citando as fls."],
  ["p_laudo",   "Confronto do laudo com os documentos médicos", "Confronte o laudo pericial com os documentos médicos dos autos: as divergências de diagnóstico, de data de início da incapacidade e de limitação, com as fls. de cada um."],
  ["p_minuta",  "Minuta da próxima peça",                      "Diga qual é a próxima peça do escritório neste processo e redija a minuta, com os fatos e as provas citados pelas fls."],
];
// F497 · o botão IA de cada documento: pedidos curtos sobre um documento só (Laudo só no laudo)
const PEDIDOS_DOC1 = [
  ["d_resumo", "Resumo",  "Resuma este documento: o que decide ou pede, as datas e o próximo passo do escritório."],
  ["d_prazo",  "Prazo",   "Diga se este documento abre prazo: qual ato, a data da intimação ou ciência, o termo final contado e a providência cabível."],
  ["d_pontos", "Pontos",  "Aponte os pontos deste documento favoráveis e desfavoráveis ao segurado, e como enfrentar os desfavoráveis com a prova dos autos."],
  ["d_laudo",  "Laudo",   "Analise este laudo pericial: falhas técnicas, quesitos não respondidos, data de início da incapacidade e contradições com os documentos médicos do caso."],
];
let _docsClaude = null;
function menuClaudeDocs(casoId, chaves, modo){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const todos = documentosDoCaso(k);
  const lista = (chaves && chaves.length) ? todos.filter(d=>chaves.includes(chaveDoc(d))) : todos;
  _docsClaude = {casoId, chaves: lista.map(chaveDoc), modo};
  const pedidos = modo==="processo" ? PEDIDOS_PROCESSO
    : modo==="doc" ? PEDIDOS_DOC1.filter(x=>x[0]!=="d_laudo" || /laudo/i.test((lista[0]||{}).nome||""))
    : PEDIDOS_DOCS;
  const semTexto = lista.filter(d=>!d.texto && !["crps","escritorio"].includes(d.origem));
  const onde = ler("crm_claude_onde") || "web";
  caixa(`<h3 style="margin:0 0 4px">Pedir ao Claude</h3>
    <p class="meio-sub" style="margin:0 0 8px">${lista.length===1?`Documento: <b>${esc(lista[0].nome||"documento")}</b>.`:modo==="processo"?`${lista.length} peça${lista.length>1?"s":""} do processo, com as fls.`:`${lista.length} documento${lista.length>1?"s":""} do caso.`}
      O Claude lê pelo conector do CRM. Revise o pedido antes de enviar; nada volta ao CRM sem a sua confirmação.</p>
    ${semTexto.length?`<p class="meio-sub" style="margin:0 0 8px;color:var(--prox)">${semTexto.length===1?"1 documento digitalizado, sem texto: o CRM baixa o PDF dele":`${semTexto.length} documentos digitalizados, sem texto: o CRM baixa o PDF deles`} para você anexar na conversa.</p>`:""}
    <div class="esp-lista">${pedidos.map(([id,rot])=>`<button class="esp-it" onclick="abrirClaudeDocs('${id}')">${esc(rot)}</button>`).join("")}</div>
    <label class="meio-sub" style="display:block;margin-top:10px">Pergunta livre sobre ${modo==="processo"?"o processo":"os documentos"}
      <textarea id="cl-livre" rows="2" style="width:100%;font:inherit;padding:8px;border:1px solid var(--borda);border-radius:8px;margin-top:4px" placeholder="ex.: o laudo responde ao quesito sobre a data de início da incapacidade?"></textarea></label>
    <div class="form-linha" style="margin-top:8px">
      <span class="cl-onde" role="radiogroup" aria-label="onde abrir">
        <label><input type="radio" name="cl-onde" value="web" ${onde==="web"?"checked":""} onchange="guardar('crm_claude_onde','web')"> no navegador</label>
        <label><input type="radio" name="cl-onde" value="app" ${onde==="app"?"checked":""} onchange="guardar('crm_claude_onde','app')"> no aplicativo de mesa</label>
      </span>
      <button class="tl-bt forte" style="margin-left:auto" onclick="abrirClaudeDocs('livre')">Perguntar</button>
    </div>`);
}
function pedidoClaudeDocs(k, chaves, instrucao, modo){
  if(modo==="processo") return `Use o conector CRM Tercini. No processo do caso ${k.id} (cliente_id ${k.cliente_id}), leia com ler_documento (caso_id ${k.id}) as peças abaixo, em ordem cronológica, com a folha que o CRM contou para cada uma:
${indiceDoProcesso(k, chaves)}
Cite cada fato pela peça e pelas fls. Para as demais peças, use documentos_caso. Se precisar, consulte ficha_cliente e anotacoes_caso. Peça digitalizada sem texto vai anexada nesta conversa, quando houver.

${instrucao}

${CLAUDE_ESTILO}`;
  return `Use o conector CRM Tercini. No caso ${k.id} (cliente_id ${k.cliente_id}), leia com ler_documento (caso_id ${k.id}) estes documentos: ${chaves.join("; ")}. `
    + `Se precisar, consulte ficha_cliente e anotacoes_caso. Documento digitalizado sem texto vai anexado nesta conversa, quando houver.

${instrucao}

${CLAUDE_ESTILO}`;
}
async function abrirClaudeDocs(pedido){
  const s = _docsClaude; if(!s) return;
  const k = D.casoPorId.get(s.casoId); if(!k) return;
  const instr = pedido==="livre" ? ((document.getElementById("cl-livre")||{}).value||"").trim()
    : ([...PEDIDOS_DOCS, ...PEDIDOS_PROCESSO, ...PEDIDOS_DOC1].find(x=>x[0]===pedido)||[])[2];
  if(!instr) return aviso("Escreva a pergunta");
  const onde = ler("crm_claude_onde") || "web";
  const url = (onde==="app" ? "claude://claude.ai/new?q=" : "https://claude.ai/new?q=") + encodeURIComponent(pedidoClaudeDocs(k, s.chaves, instr, s.modo));
  fecharCaixa();
  if(onde==="app") location.href = url; else window.open(url, "_blank", "noopener");
  const semTexto = documentosDoCaso(k).filter(d=>s.chaves.includes(chaveDoc(d)) && !d.texto && !["crps","escritorio"].includes(d.origem));
  if(semTexto.length){
    const antes = new Set(docsSel); docsSel.clear(); s.chaves.forEach(c=>docsSel.add(c));
    try{ await digitalizadosClaude(s.casoId, true); } finally { docsSel.clear(); antes.forEach(c=>docsSel.add(c)); }
  }
}
function painelDocumentos(k, origens){
  const docs = docsDaOrigem(k, origens);
  if(!docs.length) return `<div class="caso"><p class="meio-sub">Nenhum documento aqui ainda.
    As peças chegam pela extensão: abra o processo no portal e clique nela.</p></div>`;
  const grupos = new Map();
  for(const d of docs){ if(!grupos.has(d.origem)) grupos.set(d.origem, []); grupos.get(d.origem).push(d); }
  const total = docs.reduce((s,d)=>s+(+d.tamanho||0),0);
  // F190 · no tema, os botões do quadro seguem o cartão: contorno para o que
  // baixa, cheio só para pedir ao Claude
  const bt = temaV10() ? "tl-bt" : "btn-mini";
  return `<div class="caso docs-painel">
    <div class="rotulo-caso">${temaV10()?"":"📂 "}${docs.length} documento${docs.length>1?"s":""}${total?` · ${tamArq(total)}`:""}</div>
    <div class="form-linha docs-acoes" style="align-items:center;gap:8px;flex-wrap:wrap;margin-top:6px">
      ${origens===DOCS_JUDICIAIS?`<button class="${temaV10()?"tl-bt forte":"btn-mini"}" onclick="abrirProcessoInteiro('${k.id}')" title="as peças judiciais em ordem cronológica, uma depois da outra, com a árvore ao lado">${temaV10()?"":"📖 "}<span aria-hidden="true">Processo</span><span class="sr-only">Abrir o processo inteiro</span></button>`:""}
      <button class="${bt}" onclick="baixarDocsZip('${k.id}')" title="os arquivos originais do caso inteiro (judicial, INSS, recurso e escritório), em pastas por origem">${temaV10()?"":"⬇ "}Baixar<span class="sr-only"> tudo (.zip)</span></button>
      <button class="${bt}" onclick="pacoteClaude('${k.id}')" title="um arquivo .md com o texto de todos os documentos do caso — arraste para uma conversa do Claude">${temaV10()?"":"🤖 "}Pacote<span class="sr-only"> para o Claude (.md)</span></button>
      <button class="${bt}" onclick="digitalizadosClaude('${k.id}')" title="os documentos sem texto (scan, foto) num PDF só, numerados como no pacote — o Claude os lê pela imagem">${temaV10()?"":"📎 "}Digitalizados<span class="sr-only"> para o Claude (PDF)</span></button>
      <button class="${temaV10()?"tl-bt forte":"btn-mini"}" style="margin-left:auto" onclick="menuClaudeDocs('${k.id}',[])" title="abre o Claude com um pedido pronto sobre todos os documentos do caso">${IC_SVG.claude} <span aria-hidden="true">Claude</span><span class="sr-only">Pedir ao Claude</span></button>
    </div>
    ${(n=>n?`<div class="docs-sel-barra" role="region" aria-label="documentos selecionados">
      <b>${n} selecionado${n>1?"s":""}${(m=>m!==n?` no caso · ${m} nesta aba`:"")(docs.filter(d=>docsSel.has(chaveDoc(d))).length)}</b>
      <button class="${bt}" onclick="baixarDocsZip('${k.id}',true)" title="Baixar (.zip)">Baixar<span class="sr-only"> (.zip)</span></button>
      <button class="${bt}" onclick="pacoteSelecionados('${k.id}')" title="o .md com o texto e, se houver digitalizado, o PDF dele">Pacote<span class="sr-only"> dos selecionados (.md + PDF)</span></button>
      <button class="${temaV10()?"tl-bt forte":"btn-mini"}" style="margin-left:auto" onclick="menuClaudeDocs('${k.id}',[...docsSel])" title="Pedir ao Claude com estes"><span aria-hidden="true">Claude</span><span class="sr-only">Pedir ao Claude com estes</span></button>
      <button class="${bt}" onclick="docsSel.clear();repintarFicha()">Limpar</button></div>`:"")(documentosDoCaso(k).filter(d=>docsSel.has(chaveDoc(d))).length)}
    ${[...grupos].map(([o, ds])=>`<div style="margin-top:10px">
      <div class="meio-sub" style="font-weight:600;margin-bottom:4px">${esc(ORIGEM_DOC[o]||o)} (${ds.length})</div>
      ${ds.map(d=>`<div class="arq-it">
        <input type="checkbox" class="doc-ck" aria-label="selecionar ${esc(d.nome||"documento")}" ${docsSel.has(chaveDoc(d))?"checked":""}
          onchange="marcarDoc('${escJs(chaveDoc(d))}', this.checked)">
        <button class="arq-abrir" onclick="${d.id?`abrirAnexo('${escJs(d.id)}')`:`abrirDecisao('${escJs(d.caminho)}')`}" title="abrir o documento">
          ${(d.tipo||"").startsWith("image/")?"🖼":"📄"} ${esc(d.inicial?"Petição inicial":d.nome||"documento")}</button>
        <span class="meio-sub">${d.data?fmt(String(d.data).slice(0,10)):""}${d.tamanho?" · "+tamArq(d.tamanho):""}${
          d.origem==="escritorio"||d.origem==="crps" ? "" : !d.texto && !d.tipo ? " · texto em leitura" : !d.texto ? " · digitalizado" : (paginasImagem(d)||[]).length ? ` · ${paginasImagem(d).length} de ${d.paginas} pág. em imagem` : " · com texto"}</span>
        <button class="${bt} doc-claude" onclick="menuClaudeDocs('${k.id}',['${escJs(chaveDoc(d))}'])">${temaV10()?IC_SVG.claude+" ":"✦ "}<span aria-hidden="true">Claude</span><span class="sr-only">Ler com Claude</span></button>
      </div>`).join("")}
    </div>`).join("")}
  </div>`;
}
// F289 · O PROCESSO INTEIRO. As peças judiciais do caso (as mesmas de
// Documentos) uma depois da outra, da mais antiga à mais nova, com a árvore
// de peças e a folha contínua, como nos autos do e-SAJ e do eproc. Nada se
// junta num PDF: cada peça se busca e se desenha só quando chega perto da tela.
function pecasDoProcesso(k){
  return docsDaOrigem(k, DOCS_JUDICIAIS).slice()
    .sort(ordemPeca);
}
// a folha (fls.) de cada peça: a contagem só vale onde o número de páginas é conhecido
function flsDasPecas(pecas){
  let fl = 1, conhecido = true;
  return pecas.map(d=>{ const n = d.tipo==="application/pdf" ? +d.paginas||0 : 1;
    const r = conhecido ? fl : null; if(!n) conhecido = false; fl += n; return r; });
}
const rotPeca = d => d.inicial ? "Petição inicial" : d.evento || String(d.nome||"documento").replace(/\.(pdf|html?)$/i,"");
function indiceDoProcesso(k, chaves){
  const pecas = pecasDoProcesso(k), fls = flsDasPecas(pecas);
  return pecas.map((d,i)=>chaves.includes(chaveDoc(d))
    ? `- ${rotPeca(d)}${d.data?` (${fmt(String(d.data).slice(0,10))})`:""}${fls[i]?`, fls. ${fls[i]}`:""}: ${chaveDoc(d)}` : "")
    .filter(Boolean).join("\n");
}
// Pedir ao Claude no processo inteiro: uma peça (i), as marcadas na árvore ou todas
function piClaude(i){
  const el = document.getElementById("proc-inteiro"); if(!el) return;
  const k = D.casoPorId.get(el.dataset.caso); if(!k) return;
  const pecas = el._pecas || pecasDoProcesso(k);
  const marcadas = [...el.querySelectorAll(".pi-it input:checked")].map(x=>pecas[+x.dataset.i]);
  const sel = i!=null ? [pecas[i]] : (marcadas.length ? marcadas : pecas);
  menuClaudeDocs(k.id, sel.filter(Boolean).map(chaveDoc), "processo");
}
function piMarcou(){
  const el = document.getElementById("proc-inteiro"); if(!el) return;
  const n = el.querySelectorAll(".pi-it input:checked").length;
  el.querySelector(".pi-claude-n").textContent = n ? ` (${n} peça${n>1?"s":""})` : "";
  const tudo = el.querySelector(".pi-tudo"), todas = n && n===el.querySelectorAll(".pi-it input").length;
  if(tudo){ const f = todas ? "Desmarcar tudo" : "Selecionar tudo";
    tudo.title = f; tudo.innerHTML = `<span aria-hidden="true">${todas?"Limpar":"Tudo"}</span><span class="sr-only">${f}</span>`; }
}
// F439 · marca ou desmarca todas as peças para o Claude
function piTudo(){
  const el = document.getElementById("proc-inteiro"); if(!el) return;
  const cx = [...el.querySelectorAll(".pi-it input")], marcar = cx.some(x=>!x.checked);
  cx.forEach(x=>{ x.checked = marcar; });
  piMarcou();
}
// F439 · a seta da lista de peças leva à última folha do processo; as folhas que crescem ao carregar não a tiram de lá
function piFim(){
  const el = document.getElementById("proc-inteiro"); if(!el) return;
  el.classList.remove("arvore-on");
  const autos = el.querySelector(".pi-autos"); autos.scrollTop = autos.scrollHeight;
  el._alvo = "fim";
}
let _piObs = null;
function fecharProcessoInteiro(){
  setTimeout(armarVoltar, 0);   // F458
  if(_piObs){ _piObs.disconnect(); _piObs = null; }
  const el = document.getElementById("proc-inteiro"); if(el){ if(el._longe) el._longe.disconnect(); soltarPdfs(el); el.remove(); }
  document.body.style.overflow = "";
  document.removeEventListener("keydown", _piTecla, true);
}
function _piTecla(e){
  // o Esc fecha só o processo inteiro, e não a ficha que está por baixo
  if(e.key==="Escape" && !document.querySelector("#modal:not([style*='none']) *")){ e.preventDefault(); e.stopImmediatePropagation(); return fecharProcessoInteiro(); }
  // F392 · zoom pelo teclado: + e - aumentam e diminuem, 0 volta a 100 %
  if(/^(input|textarea|select)$/i.test((e.target||{}).tagName||"") || e.altKey) return;
  const z = {"+":1, "=":1, "-":-1, "0":0}[e.key];
  if(z!==undefined){ e.preventDefault(); piZoom(z); }
}
// F392 · zoom das peças no leitor (pedido do Paulo, 04.11.2026): de 50 % a 300 %, guardado no navegador
const PI_ZOOM = [.5,.67,.8,.9,1,1.1,1.25,1.5,1.75,2,2.5,3];
function piZoom(passo){
  const el = document.getElementById("proc-inteiro") || document.querySelector(".proc-leitor .pl-corpo"); if(!el) return;
  const pane = el.closest(".proc-leitor") || el;
  let z = +el.style.getPropertyValue("--pi-zoom") || 1;
  if(passo===0) z = 1;
  else { const i = PI_ZOOM.findIndex(v=>v>=z-.001); z = PI_ZOOM[Math.max(0, Math.min(PI_ZOOM.length-1, (i<0?PI_ZOOM.length-1:i) + passo))]; }
  piZoomPara(z, true);
}
// F441b · no toque a folha nunca fica mais estreita que a tela: o mínimo é 100 %
function piZoomMin(){ try{ return matchMedia("(pointer:coarse)").matches ? 1 : .5; }catch(e){ return .5; } }
function piZoomSalvo(){ let z = 1; try{ z = +localStorage.getItem("crm_pi_zoom") || 1; }catch(e){} return Math.max(piZoomMin(), Math.min(3, z)); }
// F439 · o zoom num valor qualquer (a pinça), de 50 % a 300 %; guardar só no fim do gesto
function piZoomPara(z, guardar, foco){
  const el = document.getElementById("proc-inteiro") || document.querySelector(".proc-leitor .pl-corpo"); if(!el) return;
  const pane = el.closest(".proc-leitor") || el;
  z = Math.round(Math.max(piZoomMin(), Math.min(3, z)) * 100) / 100;
  const autos = el.querySelector(".pi-autos") || (el.classList.contains("pl-corpo") ? el : null);
  // o ponto sob os dedos (ou o alto da tela, sem foco) fica no mesmo lugar depois do zoom
  let fx = 0, fy = 0, px = 0, py = 0;
  if(autos){
    const r = autos.getBoundingClientRect();
    if(foco){ fx = foco.x - r.left; fy = foco.y - r.top; }
    px = autos.scrollWidth ? (autos.scrollLeft + fx) / autos.scrollWidth : 0;
    py = autos.scrollHeight ? (autos.scrollTop + fy) / autos.scrollHeight : 0;
  }
  el.style.setProperty("--pi-zoom", z);
  const o = pane.querySelector(".pi-zoom output"); if(o) o.textContent = Math.round(z*100) + " %";
  if(autos){ autos.scrollTop = py * autos.scrollHeight - fy; autos.scrollLeft = px * autos.scrollWidth - fx; }
  if(guardar) try{ localStorage.setItem("crm_pi_zoom", z); }catch(e){}
}
// F497 · a barra do pé da árvore: o processo sai do CRM para o Claude ou outra inteligência
const COR_FASE_DB = {inss:"#4F78B0", crps:"#8A5A1E", cnj:"#6B3FA0"};
function barraArvore(){
  const b = (fn, rot, frase, cls="") => `<button class="db-bt ${cls}" onclick="${fn}" title="${frase}"><span aria-hidden="true">${rot}</span><span class="sr-only">${frase}</span>${cls.includes("pi-claude")?'<span class="pi-claude-n"></span>':""}</button>`;
  return `<div class="pi-arv-pe" role="group" aria-label="levar o processo">${b("piBaixar(false)","Baixar","Baixar o processo inteiro em .zip")}${b("piBaixar(true)","Marcadas","Baixar as peças marcadas em .zip")}${b("piMd(false)","MD","Baixar o processo em um arquivo .md, para o Claude ou outra inteligência")}${b("piImagens()","Imagens","Baixar as folhas em imagens JPG")}${b("piClaude()","Claude","Pedir ao Claude pelo conector, sobre as peças marcadas ou todas","pri pi-claude")}${b("piMd(true)","Projeto","Baixar o .md e abrir os projetos do Claude")}</div>`;
}
// as peças marcadas na árvore; sem marca, todas (soMarcadas: só as marcadas)
function piEscolha(soMarcadas){
  const el = document.getElementById("proc-inteiro"); if(!el) return null;
  const k = D.casoPorId.get(el.dataset.caso); if(!k) return null;
  const pecas = el._pecas || pecasDoProcesso(k);
  const marcadas = [...el.querySelectorAll(".pi-it input:checked")].map(x=>pecas[+x.dataset.i]).filter(Boolean);
  return {k, pecas: marcadas.length || soMarcadas ? marcadas : pecas};
}
function piBaixar(soMarcadas){
  const e = piEscolha(soMarcadas); if(!e) return;
  if(!e.pecas.length) return aviso("Marque as peças na árvore");
  baixarDocsZip(e.k.id, false, e.pecas);
}
// o .md é o pacote do Claude (F188) só com as peças do processo; o Projeto abre os projetos do claude.ai, onde o arquivo se anexa
async function piMd(projeto){
  const e = piEscolha(false); if(!e || !e.pecas.length) return;
  const antes = new Set(docsSel); docsSel.clear(); e.pecas.forEach(d=>docsSel.add(chaveDoc(d)));
  try{ await pacoteClaude(e.k.id, true); } finally { docsSel.clear(); antes.forEach(c=>docsSel.add(c)); }
  if(projeto){ window.open("https://claude.ai/projects", "_blank", "noopener"); aviso("Crie ou abra o projeto e anexe o arquivo .md baixado"); }
}
// as folhas em JPG, num .zip: o PDF desenhado pelo pdf.js, a imagem como veio
async function piImagens(){
  const e = piEscolha(false); if(!e || !e.pecas.length) return;
  const pecas = e.pecas.filter(d=>/pdf|jpe?g|png/.test(d.tipo||""));
  if(!pecas.length) return aviso("Nenhuma peça em PDF ou imagem");
  const total = pecas.reduce((s,d)=>s + (+d.paginas || 1), 0);
  if(total > 100 && !confirm(`São cerca de ${total} folhas em imagem. Baixar assim mesmo?`)) return;
  aviso("Desenhando as folhas…", false);
  try{
    if(!window.JSZip) await new Promise((ok, erro)=>{
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      s.onload = ok; s.onerror = ()=>erro(new Error("não consegui carregar o compactador"));
      document.head.appendChild(s);
    });
    const zip = new JSZip(); let falhas = 0, n = 0;
    for(const [i, d] of pecas.entries()){
      const base = `${String(i+1).padStart(3,"0")} ${nomeSeguro(rotPeca(d))}`;
      try{
        const r = await fetch(await linkArquivo(d.caminho, 300)); if(!r.ok) throw new Error(r.status);
        if(!/pdf/.test(d.tipo||"")){ zip.file(`${base}.${/png/.test(d.tipo)?"png":"jpg"}`, await r.blob()); n++; continue; }
        const lib = await carregarPdfJs();
        const pdf = await lib.getDocument({data: new Uint8Array(await r.arrayBuffer())}).promise;
        for(let p=1; p<=pdf.numPages; p++){
          aviso(`Desenhando as folhas: peça ${i+1} de ${pecas.length}, folha ${p}…`, false);
          const pg = await pdf.getPage(p), vp = pg.getViewport({scale: 2});
          const cv = document.createElement("canvas"); cv.width = vp.width; cv.height = vp.height;
          await pg.render({canvasContext: cv.getContext("2d"), viewport: vp}).promise;
          zip.file(`${base} fl ${String(p).padStart(3,"0")}.jpg`, await new Promise(ok=>cv.toBlob(ok, "image/jpeg", 0.85)));
          cv.width = cv.height = 0; n++;
        }
        pdf.destroy();
      }catch(err){ falhas++; }
    }
    salvarBlob(`${rotuloDoCaso(e.k).arquivo}-folhas.zip`, await zip.generateAsync({type:"blob"}));
    aviso(falhas ? `⬇ ${n} folhas; ${falhas} peça(s) não baixaram` : `⬇ ${n} folhas em JPG`);
  }catch(err){ aviso("Não consegui montar as imagens: " + err.message); }
}
// F497 · o botão IA de um documento: Resumo, Prazo, Pontos e, no laudo, Laudo
function botaoIaDoc(casoId, chave, nome, cls){
  return `<button class="${cls||"db-bt"}" onclick="event.stopPropagation();menuClaudeDocs('${casoId}',[${esc(JSON.stringify(chave))}],'doc')" title="Pedir à IA sobre este documento"><span aria-hidden="true">IA</span><span class="sr-only">Pedir à IA sobre este documento</span></button>`;
}
function abrirProcessoInteiro(casoId, lista, caminho, titulo, aba){
  setTimeout(armarVoltar, 0);   // F458
  const k = D.casoPorId.get(casoId); if(!k) return;
  const pecas = lista || pecasDoProcesso(k); if(!pecas.length) return aviso(lista ? "Nenhum documento neste processo" : "Nenhuma peça judicial no CRM");
  fecharProcessoInteiro();
  const c = D.cliPorId.get(k.cliente_id) || {};
  const fls = flsDasPecas(pecas), rot = rotPeca;
  const el = document.createElement("div");
  el.id = "proc-inteiro"; el.dataset.caso = k.id; el.style.setProperty("--db-cor", COR_FASE_DB[aba] || COR_FASE_DB.cnj); el.setAttribute("role","dialog"); el.setAttribute("aria-label","processo inteiro");
  el.innerHTML = `<div class="pi-cab">
      <button class="btn-mini pi-ver-arvore" onclick="this.closest('#proc-inteiro').classList.toggle('arvore-on')">Peças</button>
      <b>${esc(c.nome||"cliente")}${titulo?` · ${esc(titulo)}`:k.processo?` · ${esc(k.processo)}`:""} · ${pecas.length} peça${pecas.length>1?"s":""}</b>
      <span class="pi-zoom" role="group" aria-label="zoom das peças"><button class="btn-mini" onclick="piZoom(-1)" title="diminuir (tecla -)" aria-label="diminuir o zoom">−</button><output aria-live="polite">100 %</output><button class="btn-mini" onclick="piZoom(1)" title="aumentar (tecla +)" aria-label="aumentar o zoom">+</button><button class="btn-mini" onclick="piZoom(0)" title="voltar a 100 % (tecla 0)"><span aria-hidden="true">100%</span><span class="sr-only">voltar o zoom a 100 %</span></button></span>
      <button class="btn-mini" onclick="fecharProcessoInteiro()" title="fechar (Esc)">✕</button></div>
    <div class="pi-corpo">
      <nav class="pi-arvore" aria-label="peças do processo"><div class="pi-arv-cab"><button class="btn-mini pi-tudo" onclick="piTudo()" title="Selecionar tudo"><span aria-hidden="true">Tudo</span><span class="sr-only">Selecionar tudo</span></button><button class="btn-mini pi-fim" onclick="piFim()" title="Ir à última folha" aria-label="Ir à última folha">↓</button></div>${pecas.map((d,i)=>`<div class="pi-it"><input type="checkbox" data-i="${i}" onchange="piMarcou()" aria-label="marcar ${esc(rot(d))} para o Claude"><button data-i="${i}" onclick="piIr(${i})">
        ${esc(rot(d))}<small>${d.data?fmt(String(d.data).slice(0,10)):""}${fls[i]?` · fls. ${fls[i]}`:""}${d.evento&&d.nome?` · ${esc(d.nome)}`:""}</small></button></div>`).join("")}${barraArvore()}</nav>
      <div class="pi-autos">${pecas.map((d,i)=>`<section class="pi-peca" id="pi-${i}" data-i="${i}">
        <h4>${botaoIaDoc(k.id, chaveDoc(d), d.nome, "db-bt pi-ler")}${esc(rot(d))}${d.data?` · ${fmt(String(d.data).slice(0,10))}`:""}${fls[i]?` · fls. ${fls[i]}`:""}</h4>
        <div class="pi-folha"><p class="meio-sub">Carregando…</p></div></section>`).join("")}</div>
    </div><div class="pi-fls" aria-hidden="true"></div>`;
  el._pecas = pecas;
  document.body.appendChild(el);
  const z0 = piZoomSalvo();
  if(z0!==1){ el.style.setProperty("--pi-zoom", z0); el.querySelector(".pi-zoom output").textContent = Math.round(z0*100) + " %"; }
  document.body.style.overflow = "hidden";
  document.addEventListener("keydown", _piTecla, true);   // captura: vê a caixa aberta antes de outro Esc a fechar
  const autos = el.querySelector(".pi-autos");
  // Ctrl + roda do mouse (e a pinça do touchpad) aumentam só as peças, não a página
  autos.addEventListener("wheel", e=>{ if(!e.ctrlKey) return; e.preventDefault(); piZoom(e.deltaY<0 ? 1 : -1); }, {passive:false});
  // F439 · a pinça no celular dá o zoom das peças (pedido do Paulo, 08.11.2026)
  let pin = null;
  const dist = t=>Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  autos.addEventListener("touchstart", e=>{ if(e.touches.length===2) pin = {d: dist(e.touches) || 1, z: +el.style.getPropertyValue("--pi-zoom") || 1}; }, {passive:true});
  autos.addEventListener("touchmove", e=>{
    if(!pin || e.touches.length!==2) return;
    e.preventDefault();
    pin.alvo = pin.z * dist(e.touches) / pin.d;
    pin.foco = {x:(e.touches[0].clientX + e.touches[1].clientX) / 2, y:(e.touches[0].clientY + e.touches[1].clientY) / 2};
    if(!pin.raf) pin.raf = requestAnimationFrame(()=>{ if(pin){ pin.raf = 0; piZoomPara(pin.alvo, false, pin.foco); } });
  }, {passive:false});
  autos.addEventListener("touchend", e=>{ if(pin && e.touches.length<2){ piZoomPara(pin.alvo || pin.z, true, pin.foco); pin = null; toque = null; } }, {passive:true});
  // F440 · com um dedo: o toque duplo alterna 100 % e 200 %, e o deslizar de lado leva à peça seguinte ou à anterior
  let toque = null, ultimo = null;
  autos.addEventListener("touchstart", e=>{ toque = e.touches.length===1 ? {x:e.touches[0].clientX, y:e.touches[0].clientY, t:Date.now()} : null; }, {passive:true});
  autos.addEventListener("touchend", e=>{
    if(!toque || e.touches.length || !e.changedTouches.length) return;
    const t = e.changedTouches[0], dx = t.clientX - toque.x, dy = t.clientY - toque.y, dt = Date.now() - toque.t; toque = null;
    if(Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 300){
      if(ultimo && Date.now() - ultimo.t < 320 && Math.hypot(t.clientX - ultimo.x, t.clientY - ultimo.y) < 30){
        ultimo = null; piZoomPara((+el.style.getPropertyValue("--pi-zoom") || 1) > 1.05 ? 1 : 2, true, {x:t.clientX, y:t.clientY});
      } else ultimo = {x:t.clientX, y:t.clientY, t:Date.now()};
      return;
    }
    ultimo = null;
    // de lado só quando a folha cabe na largura: com zoom, o dedo anda pela folha
    if(Math.abs(dx) > 70 && Math.abs(dy) < Math.abs(dx) / 2 && dt < 600 && autos.scrollWidth <= autos.clientWidth + 2){
      const cur = el.querySelector(".pi-it button.on"), i = cur ? +cur.dataset.i : 0, j = i + (dx < 0 ? 1 : -1);
      if(j >= 0 && j < pecas.length) piIr(j);
    }
  }, {passive:true});
  el.addEventListener("gesturestart", e=>e.preventDefault());   // o Safari do iPhone não amplia a página por cima
  // a peça que entra na tela se desenha e acende na árvore
  _piObs = new IntersectionObserver(ents=>{
    for(const e of ents){
      if(!e.isIntersecting) continue;
      const i = +e.target.dataset.i, sec = e.target;
      if(!sec.dataset.feito){ sec.dataset.feito = "1"; desenharPeca(pecas[i], sec.querySelector(".pi-folha")); }
    }
  }, {root:autos, rootMargin:"600px 0px"});
  autos.querySelectorAll(".pi-peca").forEach(x=>_piObs.observe(x));
  // a peça que ficou longe da tela é solta inteira (o PDF, o HTML do PJe), com a altura guardada,
  // e se desenha de novo ao voltar: o processo de centenas de peças não enche a memória
  const longe = new IntersectionObserver(ents=>{
    for(const e of ents){ const sec = e.target;
      if(e.isIntersecting || !sec.dataset.feito) continue;
      const h = sec.offsetHeight; soltarPdfs(sec);
      sec.querySelectorAll(".pi-pag").forEach(x=>x._obs && x._obs.unobserve(x));
      sec.querySelectorAll(".pi-pag,.pi-folha").forEach(x=>{ x._fora = 1; x.remove(); });
      sec.insertAdjacentHTML("beforeend", `<div class="pi-folha" style="min-height:${Math.max(0, h - (sec.querySelector("h4")?.offsetHeight||0))}px"></div>`);
      delete sec.dataset.feito; }
  }, {root:autos, rootMargin:"5000px 0px"});
  autos.querySelectorAll(".pi-peca").forEach(x=>longe.observe(x));
  el._longe = longe;
  // a árvore acende a peça que está no alto da leitura
  const secs = [...autos.querySelectorAll(".pi-peca")], bts = [...el.querySelectorAll(".pi-it button")], flsEl = el.querySelector(".pi-fls");
  const nPag = d=>d.tipo==="application/pdf" ? +d.paginas||0 : 1, total = pecas.every(nPag) ? pecas.reduce((s,d)=>s+nPag(d), 0) : 0;
  const acender = ()=>{ const topo = autos.getBoundingClientRect().top + 80;
    let i = 0; secs.forEach((x,j)=>{ if(x.getBoundingClientRect().top <= topo) i = j; });
    const fim = autos.scrollTop > 0 && autos.scrollTop + autos.clientHeight >= autos.scrollHeight - 2;
    if(fim) i = secs.length - 1;   // a última não sobe ao alto
    bts.forEach((b,j)=>b.classList.toggle("on", j===i));
    // F440 · a folha do alto da leitura: o início da peça mais a folha dela que está no alto
    let n = 1; secs[i] && secs[i].querySelectorAll(".pi-pag").forEach(f=>{ if(f.getBoundingClientRect().top <= topo) n = f._n; });
    if(fim && secs[i]) n = secs[i].querySelectorAll(".pi-pag").length || 1;
    flsEl.textContent = fls[i] ? `fls. ${fls[i] + n - 1}${total ? ` de ${total}` : ""}` : `peça ${i+1} de ${pecas.length}`; };
  autos.addEventListener("scroll", acender, {passive:true}); acender();
  for(const ev of ["wheel","touchstart","keydown"]) autos.addEventListener(ev, ()=>{ el._alvo = null; }, {passive:true});
  el._acender = acender;   // a folha que cresce ao carregar muda quem está no alto
  if(caminho){ const i = pecas.findIndex(d=>d.caminho===caminho); if(i>0) piIr(i); }
}
function piIr(i){
  const el = document.getElementById("proc-inteiro"); if(!el) return;
  el.classList.remove("arvore-on");
  const sec = document.getElementById("pi-"+i); if(sec) sec.scrollIntoView({block:"start"});
  // as peças de cima que terminam de carregar crescem e empurram a escolhida:
  // até a pessoa rolar por conta própria, a leitura volta a ela
  el._alvo = sec;
}
const piAcender = ()=>{ const el = document.getElementById("proc-inteiro"); if(!el) return;
  if(el._alvo==="fim"){ const a = el.querySelector(".pi-autos"); a.scrollTop = a.scrollHeight; }
  else if(el._alvo) el._alvo.scrollIntoView({block:"start"});
  if(el._acender) el._acender(); };
// F400 · as folhas do PDF: um observador por área de leitura, uma folha desenhada por vez
function obsFolhas(root){
  if(!root) return null;
  if(!root._obsFolhas) root._obsFolhas = new IntersectionObserver(ents=>{
    for(const e of ents) e.isIntersecting ? desenharFolha(e.target) : soltarFolha(e.target);
  }, {root, rootMargin:"1200px 0px"});
  return root._obsFolhas;
}
let _filaFolhas = Promise.resolve();
function desenharFolha(f){
  if(f._viva) return; f._viva = 1;
  _filaFolhas = _filaFolhas.then(async ()=>{
    if(!f._viva || !f.isConnected) return;
    try{
      const pag = await f._pdf.getPage(f._n), vp1 = pag.getViewport({scale:1});
      const larg = Math.min(f.clientWidth || 900, 900) * Math.min(Math.max(window.devicePixelRatio||1, 1.5), 2);   // folga para o zoom
      const vp = pag.getViewport({scale: larg / vp1.width});
      const cv = document.createElement("canvas"); cv.width = vp.width; cv.height = vp.height;
      f._task = pag.render({canvasContext:cv.getContext("2d"), viewport:vp});
      await f._task.promise; f._task = null;
      if(f._viva && f.isConnected){ f.style.aspectRatio = `${vp1.width} / ${vp1.height}`; f.replaceChildren(cv); }
      else { cv.width = cv.height = 0; }
    }catch(e){ f._task = null; f._viva = 0; }
  });
}
function soltarFolha(f){
  if(!f._viva) return; f._viva = 0;
  if(f._task){ try{ f._task.cancel(); }catch(e){} }
  const cv = f.querySelector("canvas"); if(cv){ cv.width = cv.height = 0; cv.remove(); }
}
// fechar ou trocar de documento solta os PDFs abertos e as folhas
function soltarPdfs(el){
  if(!el) return;
  el.querySelectorAll(".pi-pag").forEach(soltarFolha);
  [el, ...el.querySelectorAll(".pi-peca")].forEach(x=>{ (x._pdfs||[]).forEach(d=>{ try{ d.destroy(); }catch(e){} }); x._pdfs = null; });
  for(const r of [el, ...el.querySelectorAll(".pi-autos,.pl-corpo")]) if(r._obsFolhas){ r._obsFolhas.disconnect(); r._obsFolhas = null; }
}
async function desenharPeca(d, caixaEl){
  const sec = caixaEl.parentElement;
  try{
    const url = await linkArquivo(d.caminho, 600);
    const r = await fetch(url); if(!r.ok) throw new Error(r.status);
    // F590 · o documento novo nasce sem tipo até a leitura do texto: vale o que o Storage responde
    const tipo = d.tipo || (r.headers.get("content-type")||"").split(";")[0];
    if(/^image\//.test(tipo)){ caixaEl.innerHTML = `<img alt="${esc(d.nome||"imagem")}" src="${url}">`; return; }
    if(/^text\//.test(tipo)){
      // o HTML do PJe sem script nenhum (sandbox sem allow-scripts); a mesma
      // origem serve só para medir a altura da folha
      const html = await r.text(); if(caixaEl._fora) return;
      const f = document.createElement("iframe");
      f.setAttribute("sandbox","allow-same-origin"); f.srcdoc = html;
      f.onload = ()=>{ try{ f.style.height = (f.contentDocument.documentElement.scrollHeight+20)+"px"; }catch(e){} piAcender(); };
      caixaEl.replaceChildren(f); return;
    }
    const lib = await carregarPdfJs();
    const pdf = await lib.getDocument({data:new Uint8Array(await r.arrayBuffer()), isEvalSupported:false}).promise;
    if(!sec.isConnected || caixaEl._fora){ pdf.destroy(); return; }
    (sec._pdfs = sec._pdfs || []).push(pdf);
    // F400 · cada folha nasce vazia, do tamanho certo, e só se desenha perto da tela; a que se afasta
    // é solta. Antes todas as folhas de todas as peças ficavam desenhadas e o processo grande travava.
    const vp1 = (await pdf.getPage(1)).getViewport({scale:1});
    const obs = obsFolhas(sec.closest(".pi-autos,.pl-corpo"));
    caixaEl.remove();
    for(let n=1; n<=pdf.numPages; n++){
      const folha = document.createElement("div"); folha.className = "pi-folha pi-pag";
      folha.style.aspectRatio = `${vp1.width} / ${vp1.height}`; folha._pdf = pdf; folha._n = n;
      sec.appendChild(folha); folha._obs = obs; if(obs) obs.observe(folha); else desenharFolha(folha);
    }
    piAcender();
  }catch(e){
    if(caixaEl._fora) return;
    if(!caixaEl.isConnected) sec.appendChild(caixaEl);
    caixaEl.innerHTML = `<p class="meio-sub">Não consegui mostrar esta peça. <button class="btn-mini" onclick="${d.id?`abrirAnexo('${escJs(d.id)}')`:`abrirDecisao('${escJs(d.caminho)}')`}" title="Abrir em outra guia"><span aria-hidden="true">Abrir ↗</span><span class="sr-only">Abrir em outra guia</span></button></p>`;

    piAcender();
  }
}
function salvarBlob(nome, blob){
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 60000);
}
function rotuloDoCaso(k){
  const c = D.cliPorId.get(k.cliente_id) || {};
  // o título do caso costuma ser o próprio nome do cliente: não repete
  // "Fulano de Tal #B87" → "#B87"
  let tit = String(k.titulo||"").trim();
  if(c.nome && dsa(tit).startsWith(dsa(c.nome))) tit = tit.slice(c.nome.length).replace(/^[\s—–\-:·]+/, "");
  tit = tit || k.especie || k.beneficio || "";
  return { cliente:c.nome||"cliente", titulo:tit, arquivo:nomeSeguro(tit ? `${c.nome||"cliente"}-${tit}` : (c.nome||"cliente")) };
}
async function baixarDocsZip(casoId, soSel, lista, extras=[]){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const docs = lista || docsEscolhidos(k, soSel);
  aviso(`Juntando ${docs.length} documento(s)…`, false);
  try{
    if(!window.JSZip) await new Promise((ok, erro)=>{
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      s.onload = ok; s.onerror = ()=>erro(new Error("não consegui carregar o compactador"));
      document.head.appendChild(s);
    });
    const zip = new JSZip(), usados = new Set();
    let falhas = 0;
    for(const d of docs){
      try{
        const r = await fetch(await linkArquivo(d.caminho, 300));
        if(!r.ok) throw new Error(r.status);
        const tipo = d.tipo || (r.headers.get("content-type")||"").split(";")[0];   // F590 · sem tipo até a leitura do texto
        const ext = /pdf/.test(tipo) ? ".pdf" : /^text\//.test(tipo) ? ".html"
                  : /jpe?g/.test(tipo) ? ".jpg" : /png/.test(tipo) ? ".png" : "";
        let nome = `${ORIGEM_DOC[d.origem]||d.origem}/${String(d.data||"").slice(0,10)} ${nomeSeguro(d.nome).replace(/\.(pdf|html?|jpe?g|png)$/i,"")}${ext}`;
        for(let i=2; usados.has(nome); i++) nome = nome.replace(/( \(\d+\))?(\.\w+)?$/, ` (${i})$2`);
        usados.add(nome);
        zip.file(nome, await r.blob());
      }catch(e){ falhas++; }
    }
    extras.forEach(([nome, conteudo])=>zip.file(nome, conteudo));   // F848 · a tela de Expedientes vai junto
    salvarBlob(`${rotuloDoCaso(k).arquivo}.zip`, await zip.generateAsync({type:"blob"}));
    aviso(falhas ? `⬇ zip pronto — ${falhas} documento(s) não baixaram` : "⬇ zip pronto");
  }catch(e){ aviso("Não consegui montar o zip: "+e.message); }
}
// O PACOTE PARA O CLAUDE: um .md único (o formato que ele lê inteiro de uma
// vez), com o caso no topo, os LIMITES do que está ali, o índice e o texto de
// cada documento em ordem cronológica. É cópia literal da camada de texto do
// documento — nada resumido nem reescrito —, mas o que não tem texto
// (digitalizado) entra só no índice, e tabela pode sair com a ordem trocada.
// A numeração do índice é a mesma do PDF dos digitalizados: "doc 7" é o
// mesmo documento nos dois arquivos.
// as páginas que são imagem: [] = nenhuma; null = não se sabe (não analisado)
const paginasImagem = d => Array.isArray(d.paginas_imagem) ? d.paginas_imagem : null;
async function partesDoPacote(k, soSel){
  const docs = docsEscolhidos(k, soSel).slice().reverse();          // do mais antigo ao mais novo
  const partes = [];
  for(const [i, d] of docs.entries()){
    let texto = d.texto;
    // o acórdão do CRPS e o anexo da equipe não passaram pela importação:
    // o texto sai agora (imagem é digitalizada por definição)
    // PDF com texto e ainda sem a contagem de páginas (importado antes da
    // F188), ou que não passou pela importação (acórdão do CRPS, anexo da
    // equipe): lê agora, página por página, e guarda — só na primeira vez
    if(/pdf/.test(d.tipo||"") && (d.texto ? !Array.isArray(d.paginas_imagem) : (d.origem==="crps" || d.origem==="escritorio"))){
      aviso(`Conferindo as páginas: documento ${i+1} de ${docs.length}…`, false);
      try{
        const lido = await textoDoDocumento(d.caminho);
        texto = texto || lido.texto;
        d.paginas = lido.paginas; d.paginas_imagem = lido.paginas_imagem;
        if(d.id && lido.paginas){
          await api(`/rest/v1/anexos?id=eq.${d.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
            body:JSON.stringify({paginas:lido.paginas, paginas_imagem:lido.paginas_imagem||[]})}).catch(()=>{});
          const a = (D.anexos||[]).find(x=>x.id===d.id);
          if(a){ a.paginas = lido.paginas; a.paginas_imagem = lido.paginas_imagem; }
        }
      }catch(e){}
    }
    if(!texto && d.origem==="escritorio" && /^text\//.test(d.tipo||"")){
      try{ texto = (await textoDoDocumento(d.caminho)).texto; }catch(e){}
    }
    // F188 · PDF ESCANEADO COM UM POUCO DE TEXTO. O processo administrativo do
    // INSS (55 e 100 páginas) tinha texto só nas folhas de protocolo do
    // sistema, e o resto era imagem: passava por "com texto" e ficava fora do
    // PDF dos digitalizados. Grande e com pouco texto para o tamanho é
    // escaneado. ponytail: bytes por caractere (500) e tamanho (300 kB) são
    // chute medido num caso real (PA: 1.150 e 3.180; peças: até 140); o certo
    // seria contar as páginas sem texto na extração
    // `imagem`: as páginas que vão para o PDF dos digitalizados (todas, se não há texto)
    const pi = paginasImagem(d);
    const imagem = !texto ? null : (pi && pi.length ? pi : []);
    partes.push({ i:i+1, d, texto, imagem, escaneado: !!(imagem && imagem.length) });
  }
  return partes;
}
// o que vai no PDF dos digitalizados: sem texto nenhum, ou com páginas que são imagem
const paraImagem = p => !p.texto || p.escaneado;
// "páginas 3, 7 a 12" — para o .md e a folha de rosto
function faixasDePaginas(lista){
  const n = [...new Set(lista||[])].sort((a,b)=>a-b), out = [];
  for(let i=0; i<n.length; i++){ let j=i; while(j+1<n.length && n[j+1]===n[j]+1) j++; out.push(i===j?`${n[i]}`:`${n[i]} a ${n[j]}`); i=j; }
  return out.join(", ");
}
const notaImagem = p => p.escaneado
  ? `${p.imagem.length === p.d.paginas ? "todas as" : p.imagem.length} de ${p.d.paginas} página(s) são imagem (${faixasDePaginas(p.imagem)})` : "";
const rotDoc = p => `${String(p.d.data||"").slice(0,10)} · ${ORIGEM_DOC[p.d.origem]||p.d.origem} · ${p.d.nome}${p.d.evento?` (movimento: ${p.d.evento})`:""}`;
async function pacoteClaude(casoId, soSel){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const {cliente, titulo, arquivo} = rotuloDoCaso(k);
  aviso(`Montando o pacote…`, false);
  const partes = await partesDoPacote(k, soSel);
  const semTexto = partes.filter(paraImagem);
  const proc = processosDoCaso(k).map(p=>p.numero).join(", ");
  const md = [
    `# ${cliente}${titulo?` — ${titulo}`:""}`, "",
    `- Espécie: ${k.especie||"—"}  `, `- Benefício: ${k.beneficio||"—"}  `,
    `- Processo(s): ${proc||"—"}  `, `- Protocolo(s) INSS: ${(k.protocolos||[]).join(", ")||"—"}  `,
    `- Gerado pelo CRM em ${new Date().toLocaleString("pt-BR")}`, "",
    "## Como ler este pacote", "",
    "- O texto de cada documento é **cópia literal** da camada de texto do arquivo original (nada foi resumido ou reescrito). Ainda assim, confira no original qualquer ponto decisivo antes de usá-lo em peça.",
    "- **Tabelas** (CNIS, PPP, planilhas de cálculo) podem aparecer com a ordem das colunas trocada: valores, datas e competências devem ser conferidos no PDF.",
    "- PDF de scan que já veio com OCR do tribunal carrega os erros desse OCR.",
    "- A data do índice é a do movimento no sistema (ou da importação), não necessariamente a da assinatura. Entre parênteses, o que o movimento diz.",
    "- No eproc o nome do documento é um código: INIC = petição inicial, EMENDAINIC = emenda à inicial, PROC = procuração, COMP = documento comprobatório, END = comprovante de endereço, DESPADEC = despacho ou decisão, SENT = sentença, PET = petição, OUT = outros documentos, ANEXO = anexo da petição do mesmo movimento, CON_EXT_SISBA e IMP_SISB = resultado do SISBAJUD. O número no fim é a ordem dentro do movimento.",
    "- Não estão aqui: certidões, intimações e demais atos de expediente; no e-SAJ, peças anteriores às 5 movimentações mais recentes; no CRPS, o que não é acórdão ou decisão monocrática.",
    semTexto.length
      ? `- **${semTexto.length} documento(s) com páginas DIGITALIZADAS** — sem texto, ou com algumas páginas que são só imagem (lista abaixo, com as páginas). Eles vão no PDF "digitalizados" gerado pelo CRM, com a mesma numeração; se não foi enviado junto, peça-o antes de concluir qualquer ponto que dependa deles.`
      : "- Todos os documentos têm texto neste arquivo.", "",
    ...(semTexto.length ? ["## Documentos digitalizados (leia pelo PDF)", "", ...semTexto.map(p=>`- doc ${p.i} · ${rotDoc(p)}${p.escaneado?` — ${notaImagem(p)}`:" — inteiro"}`), ""] : []),
    "## Índice", "",
    ...partes.map(p=>`${p.i}. ${rotDoc(p)}${!p.texto?" — DIGITALIZADO, sem texto":p.escaneado?` — ${notaImagem(p)}`:""}`), "",
    ...(()=>{ const visto = new Map();      // o mesmo arquivo juntado duas vezes (acontece no PJe) entra uma vez
      return partes.filter(p=>p.texto).flatMap(p=>{
        const ch = p.texto.trim(), igual = visto.get(ch);
        if(!igual) visto.set(ch, p.i);
        return [`---`, "", `## ${p.i}. ${p.d.nome}${p.d.evento?` — ${p.d.evento}`:""}`, "", `*${String(p.d.data||"").slice(0,10)} · ${ORIGEM_DOC[p.d.origem]||p.d.origem}*`, "",
                ...(p.escaneado ? [`> ATENÇÃO: ${notaImagem(p)}. O texto abaixo é só o das outras páginas; as que são imagem estão no PDF dos digitalizados, com a mesma numeração.`, ""] : []),
                igual ? `*(mesmo conteúdo do doc ${igual} — o arquivo foi juntado de novo)*` : ch, ""];
      }); })(),
  ].join("\n");
  salvarBlob(`${arquivo}-para-o-claude.md`, new Blob([md], {type:"text/markdown;charset=utf-8"}));
  aviso(semTexto.length
    ? `🤖 Pacote pronto — ${semTexto.length} documento(s) digitalizado(s) estão no 📎 Digitalizados; arraste os dois para o Claude`
    : `🤖 Pacote pronto — arraste o arquivo para uma conversa do Claude`);
}
// 📎 OS DIGITALIZADOS PARA O CLAUDE. O Claude lê PDF escaneado e imagem
// olhando a página — mas não abre .zip. Então os documentos sem texto viram UM
// PDF, com uma folha de rosto por documento ("doc 7 · data · origem · nome",
// a mesma numeração do .md). Passando de ~90 páginas ou ~25 MB (o Claude lê
// até 100 páginas / 32 MB por PDF), divide em partes.
async function digitalizadosClaude(casoId, soSel){
  const k = D.casoPorId.get(casoId); if(!k) return;
  aviso("Separando os documentos digitalizados…", false);
  const semTexto = (await partesDoPacote(k, soSel)).filter(paraImagem);
  if(!semTexto.length) return aviso("Este caso não tem documento digitalizado: o 🤖 Pacote já leva tudo.");
  try{
    if(!window.PDFLib) await new Promise((ok, erro)=>{
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js";
      s.onload = ok; s.onerror = ()=>erro(new Error("não consegui carregar o montador de PDF"));
      document.head.appendChild(s);
    });
    const {PDFDocument, StandardFonts, rgb} = window.PDFLib;
    const {arquivo} = rotuloDoCaso(k);
    // Helvetica só escreve Latin-1: o resto vira "?"
    const latin1 = t => String(t||"").replace(/[–—]/g,"-").replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/[^\x20-\xFF]/g,"?");
    const LIM_PAG = 90, LIM_BYTES = 25*1048576;
    let doc = null, fonte = null, bytes = 0, falhas = 0;
    const arquivos = [];
    const fechar = async () => { if(doc && doc.getPageCount()) arquivos.push(await doc.save()); doc = null; };
    const abrir = async () => { doc = await PDFDocument.create(); fonte = await doc.embedFont(StandardFonts.Helvetica); bytes = 0; };
    for(const p of semTexto){
      const tipo = p.d.tipo||"";
      let bin;
      try{
        const r = await fetch(await linkArquivo(p.d.caminho, 300));
        if(!r.ok) throw new Error(r.status);
        bin = new Uint8Array(await r.arrayBuffer());
      }catch(e){ falhas++; continue; }
      let origem = null, nPag = 1;
      if(/pdf/.test(tipo)){ try{ origem = await PDFDocument.load(bin, {ignoreEncryption:true}); nPag = origem.getPageCount(); }catch(e){ falhas++; continue; } }
      else if(!/jpe?g|png/.test(tipo)){ falhas++; continue; }
      // a folha de rosto: é ela que deixa o Claude dizer "o doc 7 diz…"
      const capa = (parte, partes) => {
        const c = doc.addPage([595, 842]);
        c.drawText(latin1(`doc ${p.i}${partes>1?` (parte ${parte} de ${partes})`:""}`), {x:60, y:740, size:28, font:fonte, color:rgb(0.1,0.1,0.1)});
        (latin1(rotDoc(p)).match(/.{1,70}(\s|$)/g)||[]).forEach((l,n)=>c.drawText(l.trim(), {x:60, y:700-n*18, size:13, font:fonte}));
        c.drawText(latin1(p.escaneado ? `Paginas ${faixasDePaginas(p.imagem)} de ${p.d.paginas} - sao imagem; as demais tem texto no pacote .md.`
                                      : "Documento digitalizado (sem texto no pacote .md) - leia pela imagem."), {x:60, y:640, size:10, font:fonte, color:rgb(0.4,0.4,0.4)});
      };
      if(origem){
        // documento maior que uma parte (o PA de 100 páginas) se divide: o
        // Claude lê até 100 páginas por PDF
        // só as páginas que são imagem; documento sem texto vai inteiro
        const todas = origem.getPageIndices();
        const idx = p.escaneado ? p.imagem.map(n=>n-1).filter(n=>n>=0 && n<todas.length) : todas;
        const porParte = LIM_PAG - 1;
        const pedacos = Math.ceil(idx.length / porParte);
        for(let j = 0; j < pedacos; j++){
          const fatia = idx.slice(j*porParte, (j+1)*porParte);
          const pesoFatia = bin.length * fatia.length / todas.length;
          if(!doc || (doc.getPageCount() && (doc.getPageCount()+fatia.length+1 > LIM_PAG || bytes+pesoFatia > LIM_BYTES))){ await fechar(); await abrir(); }
          capa(j+1, pedacos);
          for(const pg of await doc.copyPages(origem, fatia)) doc.addPage(pg);
          bytes += pesoFatia;
        }
        continue;
      }else{
        if(!doc || (doc.getPageCount() && (doc.getPageCount()+2 > LIM_PAG || bytes+bin.length > LIM_BYTES))){ await fechar(); await abrir(); }
        capa(1, 1);
        const img = /png/.test(tipo) ? await doc.embedPng(bin) : await doc.embedJpg(bin);
        const f = Math.min(555/img.width, 802/img.height, 1);
        const pg = doc.addPage([595, 842]);
        pg.drawImage(img, {x:20, y:842-20-img.height*f, width:img.width*f, height:img.height*f});
      }
      bytes += bin.length;
    }
    await fechar();
    if(!arquivos.length) return aviso("Não consegui montar o PDF dos digitalizados.");
    arquivos.forEach((b, n)=>salvarBlob(`${arquivo}-digitalizados${arquivos.length>1?`-parte${n+1}`:""}.pdf`, new Blob([b], {type:"application/pdf"})));
    aviso(`📎 ${semTexto.length-falhas} digitalizado(s) em ${arquivos.length} PDF${arquivos.length>1?"s":""}`
      + `${falhas?` — ${falhas} não entraram (formato que não abre)`:""} — arraste junto com o 🤖 Pacote`);
  }catch(e){ aviso("Não consegui montar o PDF: "+e.message); }
}
function caixaArquivos(k){
  // F185 · aqui fica só o que a equipe anexou; o que veio dos portais tem a aba Documentos
  const as=(D.anexos||[]).filter(a=>a.caso_id===k.id && !a.origem);
  if(!as.length) return "";
  return `<div class="caso caso-arq">
    <div class="rotulo-caso">📎 Arquivos deste processo (${as.length})</div>
    ${as.map(a=>{ const co=D.colPorId.get(a.autor_id);
      return `<div class="arq-it">
        <button class="arq-abrir" onclick="abrirAnexo('${a.id}')" title="abrir o arquivo">
          ${(a.tipo||"").startsWith("image/")?"🖼":"📄"} ${esc(a.nome)}</button>
        <span class="meio-sub">${co?esc(co.nome)+" · ":""}${fmtTS(a.criado_em)}${a.tamanho?" · "+tamArq(a.tamanho):""}</span>
        ${a.autor_id===eu.id?`<button class="apaga-arq" title="apagar" onclick="apagarAnexo('${a.id}')">✕</button>`:""}
      </div>`;}).join("")}
  </div>`;
}

// ── Fatos do benefício ────────────────────────────────────────────────────
// As siglas que a equipe realmente escreve (medidas no To Do): DER 418,
// DIB 66, DCB 49, DII 44. Documento (PPP, CNIS, CTPS) não vira campo: vai no
// checklist. Onde o processo está (JR, CRPS, JEF) não vira campo: é a fase.
// RMI/DIP/RMA moram na aba 💰, que é onde o honorário se decide.
const ESPECIES = [
  ["B31","Auxílio por incapacidade temporária"],["B32","Aposentadoria por incapacidade permanente"],
  ["B91","Auxílio por incapacidade acidentário"],["B92","Aposentadoria por incapacidade acidentária"],
  ["B36","Auxílio-acidente previdenciário"],["B94","Auxílio-acidente acidentário (acidente de trabalho)"],
  ["B41","Aposentadoria por idade"],["B42","Aposentadoria por tempo de contribuição"],
  ["B46","Aposentadoria especial"],["B57","Aposentadoria de professor"],
  ["B21","Pensão por morte"],["B93","Pensão por morte acidentária"],
  ["B25","Auxílio-reclusão"],["B26","Auxílio-reclusão (espécie 26)"],
  ["B80","Salário-maternidade"],["B87","BPC/LOAS — deficiência"],["B88","BPC/LOAS — idoso"],
  // serviços do INSS (não são benefício, mas são caso — pedido do Paulo):
  ["CNIS","Acerto de CNIS"],
  ["CTC","Certidão de Tempo de Contribuição"],
  ["REV","Revisão de benefício"],
  ["REST","Restabelecimento de benefício"],
  ["COPIA","Cópia de processo administrativo"],
  ["JA","Justificação Administrativa"],
  ["IIR","Isenção de Imposto de Renda"],
  ["GPS","Regularização de contribuições (GPS)"],
  ["SD","Seguro-defeso (pescador artesanal)"],
];
// ══════════════════════════════════════════════════════════════════════════
// F113 · O CATÁLOGO DE ESPÉCIES DO ESCRITÓRIO. Maior que o do INSS de
// propósito (pedido do Paulo, 17.09): a espécie do INSS (B42) ganha as
// SUBESPÉCIES que o escritório distingue e o INSS não nomeia — é por elas
// que, no futuro, o CRM vai trazer as regras específicas de cada pedido.
// A subespécie fica em casos.subespecie (chave estável, ex.: "B42.PCD.ESP");
// o nome vira o título do caso. Pedido fora do catálogo (Repetição de
// Indébito, ação não previdenciária) se escreve à mão: especie vazia e o
// benefício com o texto — o título é o texto.
// Códigos do INSS conferidos no conhecimento geral das espécies; conferir
// na tabela oficial ao acrescentar código novo.
// ══════════════════════════════════════════════════════════════════════════
const FAMILIAS_ESPECIE = [
  ["Incapacidade", ["B31","B91","B32","B92","B36","B94"]],
  ["Aposentadorias", ["B41","B42","B46","B57"]],
  ["Pensão e reclusão", ["B21","B93","B25","B26"]],
  ["Maternidade e família", ["B80"]],
  ["Assistenciais", ["B87","B88","B30","B40"]],
  ["Rurais e especiais (espécies antigas)", ["B01","B04","B07","B08","B52","B29","B56","B89","B96"]],
  ["Serviços e revisões", ["CNIS","CTC","REV","REST","COPIA","JA","IIR","GPS","SD"]],
];
const ESPECIES_MAIS = [
  ["B01","Pensão por morte de trabalhador rural"],
  ["B04","Aposentadoria por invalidez de trabalhador rural"],
  ["B07","Aposentadoria por idade de trabalhador rural"],
  ["B08","Aposentadoria por idade de empregador rural"],
  ["B52","Auxílio-doença de trabalhador rural"],
  ["B29","Pensão especial de ex-combatente"],
  ["B30","Renda mensal vitalícia por invalidez"],
  ["B40","Renda mensal vitalícia por idade"],
  ["B56","Pensão vitalícia dos seringueiros (soldados da borracha)"],
  ["B89","Pensão especial aos portadores da síndrome da Talidomida"],
  ["B96","Pensão especial aos portadores de hanseníase (Lei 11.520/2007)"],
];
for(const e of ESPECIES_MAIS) if(!ESPECIES.some(([c])=>c===e[0])) ESPECIES.push(e);
// as subespécies, por código do INSS: [chave, nome completo]
const SUBESPECIES = {
  B31:[["B31","Auxílio por incapacidade temporária"],
       ["B31.RURAL","Auxílio por incapacidade temporária do segurado especial (rural)"],
       ["B31.PREEX","Auxílio por incapacidade temporária por doença preexistente agravada"]],
  B91:[["B91","Auxílio por incapacidade acidentário (acidente de trabalho)"],
       ["B91.OCUP","Auxílio por incapacidade acidentário por doença ocupacional"],
       ["B91.TRAJETO","Auxílio por incapacidade acidentário por acidente de trajeto"]],
  B32:[["B32","Aposentadoria por incapacidade permanente"],
       ["B32.25","Aposentadoria por incapacidade permanente com acréscimo de 25% (grande invalidez)"],
       ["B32.CONV","Aposentadoria por incapacidade permanente por conversão do auxílio (B31)"]],
  B92:[["B92","Aposentadoria por incapacidade acidentária"],
       ["B92.25","Aposentadoria por incapacidade acidentária com acréscimo de 25%"]],
  B36:[["B36","Auxílio-acidente previdenciário"],
       ["B36.CONS","Auxílio-acidente previdenciário após consolidação das lesões (pedido sucessivo ao B31)"]],
  B94:[["B94","Auxílio-acidente acidentário (acidente de trabalho)"],
       ["B94.OCUP","Auxílio-acidente acidentário por doença ocupacional"]],
  B41:[["B41","Aposentadoria por idade urbana"],
       ["B41.RURAL","Aposentadoria por idade rural (segurado especial)"],
       ["B41.HIBRIDA","Aposentadoria por idade híbrida (tempo urbano e rural)"],
       ["B41.PCD","Aposentadoria por idade da pessoa com deficiência (LC 142/2013)"],
       ["B41.ESP","Aposentadoria por idade urbana com períodos especiais"],
       ["B41.RUR","Aposentadoria por idade urbana com períodos rurais"]],
  B42:[["B42","Aposentadoria por tempo de contribuição"],
       ["B42.PCD","Aposentadoria por tempo de contribuição da pessoa com deficiência"],
       ["B42.PCD.ESP","Aposentadoria por tempo de contribuição da pessoa com deficiência e períodos especiais"],
       ["B42.PCD.RUR","Aposentadoria por tempo de contribuição da pessoa com deficiência e períodos rurais"],
       ["B42.PCD.ESP.RUR","Aposentadoria por tempo de contribuição da pessoa com deficiência, períodos especiais e rurais"],
       ["B42.ESP","Aposentadoria por tempo de contribuição com períodos especiais"],
       ["B42.ESP.RUR","Aposentadoria por tempo de contribuição com períodos especiais e rurais"],
       ["B42.RUR","Aposentadoria por tempo de contribuição com períodos rurais"],
       ["B42.APRENDIZ","Aposentadoria por tempo de contribuição com tempo de aluno-aprendiz"],
       ["B42.MILITAR","Aposentadoria por tempo de contribuição com tempo de serviço militar"],
       ["B42.RECIPROCA","Aposentadoria por tempo de contribuição com contagem recíproca (RPPS)"],
       ["B42.DIREITO","Aposentadoria por tempo de contribuição por direito adquirido (regras anteriores à EC 103)"]],
  B46:[["B46","Aposentadoria especial"],
       ["B46.RUR","Aposentadoria especial com períodos rurais"],
       ["B46.RECIPROCA","Aposentadoria especial com contagem recíproca (RPPS)"],
       ["B46.CONV","Conversão de tempo especial em comum (para outra aposentadoria)"]],
  B57:[["B57","Aposentadoria de professor"],
       ["B57.INFANTIL","Aposentadoria de professor com tempo de educação infantil (Lei 15.326/2026)"],
       ["B57.ESP","Aposentadoria de professor com períodos especiais"],
       ["B57.EC20","Aposentadoria de professor por direito adquirido (EC 20/1998)"]],
  B21:[["B21","Pensão por morte"],
       ["B21.CONJ","Pensão por morte ao cônjuge"],
       ["B21.COMP","Pensão por morte ao companheiro (união estável)"],
       ["B21.FILHO","Pensão por morte ao filho menor"],
       ["B21.INVAL","Pensão por morte ao filho inválido ou com deficiência"],
       ["B21.GUARDA","Pensão por morte ao menor sob guarda"],
       ["B21.PAIS","Pensão por morte aos pais (dependência econômica)"],
       ["B21.EX","Pensão por morte ao ex-cônjuge com alimentos"],
       ["B21.RURAL","Pensão por morte de segurado especial (rural)"]],
  B93:[["B93","Pensão por morte acidentária"]],
  B25:[["B25","Auxílio-reclusão"],["B25.RURAL","Auxílio-reclusão de segurado especial (rural)"]],
  B80:[["B80","Salário-maternidade"],
       ["B80.EMP","Salário-maternidade da empregada"],
       ["B80.CI","Salário-maternidade da contribuinte individual ou facultativa"],
       ["B80.RURAL","Salário-maternidade da segurada especial (rural)"],
       ["B80.ADOCAO","Salário-maternidade por adoção ou guarda"],
       ["B80.DESEMP","Salário-maternidade da desempregada (período de graça)"]],
  B87:[["B87","BPC/LOAS à pessoa com deficiência"],
       ["B87.TEA","BPC/LOAS à pessoa com deficiência — autismo (TEA)"],
       ["B87.FIBRO","BPC/LOAS à pessoa com deficiência — fibromialgia (Lei 15.176/2025)"],
       ["B87.MENOR","BPC/LOAS à criança ou adolescente com deficiência"]],
  B88:[["B88","BPC/LOAS ao idoso"]],
  REV:[["REV","Revisão de benefício"],
       ["REV.ART29","Revisão pelo art. 29, II (melhor benefício)"],
       ["REV.TETO","Revisão do teto (buraco negro e verde)"],
       ["REV.IRSM","Revisão pelo IRSM de fevereiro/1994"],
       ["REV.RVT","Revisão da vida toda"],
       ["REV.CONCOM","Revisão por atividades concomitantes (Tema 1070)"],
       ["REV.ESP","Revisão por reconhecimento de tempo especial"],
       ["REV.RUR","Revisão por reconhecimento de tempo rural"],
       ["REV.PCD","Revisão por aposentadoria da pessoa com deficiência (LC 142)"],
       ["REV.INDEB","Repetição de indébito / devolução de valores"]],
};
