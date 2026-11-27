// F250e · a agenda Completa junta as três: os dias de todos, os eventos sem repetir (o almoço é de todos) e as vagas de cada um
const PROFS_AGENDA = ["paulo", "marcos", "amanda"];
async function carregarCompleta(){
  await Promise.all(PROFS_AGENDA.map(pr=>carregarAgenda(pr)));
  return juntarCompleta();
}
// F250g · junta o que já está guardado, sem ir ao Google: a Completa abre na hora quando as três já carregaram
function juntarCompleta(){
  const partes = PROFS_AGENDA.map(pr=>agq.cache[pr]).filter(Boolean);
  if(!partes.length){ if(agq.prof==="todos") agq.disp = null; return null; }
  const dias = juntarDias(partes);
  agq.cache.todos = {...partes[0], profissional:"todos", dias, alerta:null};
  if(agq.prof==="todos"){ agq.disp = agq.cache.todos;
    if(!agq.sel || !dias.some(d=>d.data===agq.sel)) agq.sel = (dias.find(d=>!d.bloqueado)||dias[0]||{}).data || null; }
  return agq.cache.todos;
}
function juntarDias(partes){
  const datas = [...new Set(partes.flatMap(r=>r.dias.map(d=>d.data)))].sort();
  const dias = datas.map(data=>{
    const ds = partes.map(r=>({r, d:r.dias.find(x=>x.data===data)})).filter(x=>x.d);
    const vistos = new Set(), eventos = [];
    ds.forEach(({r, d})=>(d.eventos||[]).forEach(e=>{ if(vistos.has(e.id)) return; vistos.add(e.id);
      eventos.push({...e, profissional: e.profissional || ((e.atendimento||e.vaga) ? r.profissional : null)}); }));
    const livres = {"001":[], "002":[]};
    ds.forEach(({r, d})=>["001","002"].forEach(t=>(d.livres[t]||[]).forEach(s=>livres[t].push({...s, profissional:s.profissional||r.profissional}))));
    return {data, diaSemana:ds[0].d.diaSemana, limite:null, bloqueado:ds.every(x=>x.d.bloqueado), lotado:false,
      atendimentos:ds.reduce((n, x)=>n + (x.d.atendimentos||0), 0), eventos, livres, reservas:[], janelas:ds[0].d.janelas};
  });
  return dias;
}
// F250g · com a agenda aberta, as dos outros profissionais carregam em segundo plano: trocar de Paulo para Marcos ou Amanda fica imediato
function preCarregarAgendas(){ PROFS_AGENDA.filter(pr=>pr!==agq.prof && !agq.cache[pr] && !agq.carregando[pr]).forEach(pr=>carregarAgenda(pr).catch(()=>{})); }
function nomeProf(id){ if(id==="todos") return "Completa"; const l = ((agq.disp||agq.cache.paulo||{}).profissionais)||[]; return (l.find(x=>x.id===id)||{}).nome || (id ? id[0].toUpperCase()+id.slice(1) : ""); }
function tratamentoProf(id){ const l = ((agq.disp||agq.cache.paulo||{}).profissionais)||[]; return (l.find(x=>x.id===id)||{}).tratamento || "o Dr. Paulo Roberto Tercini Filho"; }
// o contador da barra: a ocupação do próximo dia de atendimento do Paulo ("9/14")
// 11.92 · ADM-05 e DAD-15: o número é da agenda de quem está logado (o titular e quem não atende veem a do Paulo), com ⚠ acima do limite
function contadorAgenda(){
  const meu = semAcento(String((eu&&eu.nome)||"").split(" ")[0]).toLowerCase();
  const r = agq.cache[PROFS_AGENDA.includes(meu) ? meu : "paulo"], d = r && r.dias.find(x=>!x.bloqueado);
  return d ? (d.limite ? `${d.atendimentos}/${d.limite}${d.atendimentos>d.limite?" ⚠":""}` : `${d.atendimentos}`) : null;
}
const hmMin = hm => { const [h,m] = String(hm).split(":").map(Number); return h*60+m; };
const hmTxt = hm => String(hm).replace(":","h");
const dataBR = iso => `${iso.slice(8,10)}/${iso.slice(5,7)}/${iso.slice(0,4)}`;
const DIA_EXTENSO = ["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
const diaExt = iso => DIA_EXTENSO[new Date(iso+"T12:00:00").getDay()];
const siglaData = iso => `${SIGLA_DIA[new Date(iso+"T12:00:00").getDay()]} ${iso.slice(8,10)}/${iso.slice(5,7)}`;
function msgAgendaWhats(nome, data, inicio, tipo, prof){
  const dur = tipo==="001" ? 45 : 30;
  return `Olá, ${String(nome||"").trim().split(" ")[0]}. Seu atendimento com ${tratamentoProf(prof||"paulo")} está agendado para ${diaExt(data)}, ${dataBR(data)}, às ${hmTxt(inicio)}, com duração prevista de ${dur} minutos.\n\n`
    + (prof==="marcos" ? "" : `Pedimos que traga a senha do Meu INSS (conta gov.br) atualizada.\n\n`)   // F422af · o atendimento do Dr. Marcos não pede a senha
    + `O horário é reservado exclusivamente para você. Se outra pessoa da família também precisar de atendimento, é necessário agendar um horário próprio para ela.\n\n`
    + `Em caso de imprevisto, pedimos que nos avise com antecedência.`;
}
const fmtTelBR = t => { const d=String(t||"").replace(/\D/g,""); return d.length===11 ? `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}` : d.length===10 ? `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}` : d; };
function mascararTel(inp){ const d=inp.value.replace(/\D/g,"").slice(0,11);
  inp.value = d.length>6 ? `(${d.slice(0,2)}) ${d.slice(2,d.length>10?7:6)}-${d.slice(d.length>10?7:6)}` : d.length>2 ? `(${d.slice(0,2)}) ${d.slice(2)}` : d; }
const cpfMascarado = c => { const d=String(c||"").replace(/\D/g,""); return d.length===11 ? `***.${d.slice(3,6)}.${d.slice(6,9)}-**` : "sem CPF"; };

// F153 · passo a passo do Paulo para dar ou tirar o acesso de alguém à agenda.
// Só o dono do Apps Script consegue; por isso aparece só para o admin.
const AGENDA_SCRIPT_EDITOR = "https://script.google.com/home/projects/1cfpCFFmgQfdPC0RuZxMag1EL5m2_d19Beq2wFjRfOPD7wNXDIB5TekKK/edit";
// F154 · o telefone digitado na agenda vira o principal do cadastro: grava
// `telefone` e, quando o cliente já tem a lista de telefones, troca nela o
// número do WhatsApp (ou acrescenta), para a ficha mostrar o mesmo número.
async function gravarTelefoneAgenda(c, digitos){
  const tl = fmtTelBR(digitos), hdr = {Prefer:"return=minimal"};
  await api(`/rest/v1/clientes?id=eq.${c.id}`,{method:"PATCH",headers:hdr,body:JSON.stringify({telefone:tl})});
  c.telefone = tl;
  const naColuna = Array.isArray(c.telefones), noCampos = Array.isArray((c.campos||{}).telefones);
  const lista = naColuna ? c.telefones : noCampos ? c.campos.telefones : null;
  if(lista && lista.length){
    const i = Math.max(0, lista.findIndex(t=>t.zap));
    const nova = lista.map((t,n)=>n===i ? {...t, numero:tl} : t);
    if(naColuna){ await api(`/rest/v1/clientes?id=eq.${c.id}`,{method:"PATCH",headers:hdr,body:JSON.stringify({telefones:nova})}); c.telefones = nova; }
    else { c.campos = {...c.campos, telefones:nova}; await api(`/rest/v1/clientes?id=eq.${c.id}`,{method:"PATCH",headers:hdr,body:JSON.stringify({campos:c.campos})}); }
  }
  if(typeof reindexarCliente==="function") reindexarCliente(c);
}
function passoColaboradorAgenda(){
  return `<details class="aq-passos"><summary>Como dar acesso à agenda a um colaborador novo</summary>
    <ol>
      <li>Abra o <a href="${AGENDA_SCRIPT_EDITOR}" target="_blank" rel="noopener">projeto “Agenda Quarta CRM” no Apps Script</a>, com a conta paulotercini@gmail.com.</li>
      <li>No arquivo Código.gs, localize a linha <code>const COLABORADOR = { nome: '', papel: 'equipe' };</code> e escreva o nome entre as aspas, por exemplo <code>nome: 'Fulana'</code>. Para outro administrador, troque <code>'equipe'</code> por <code>'admin'</code>.</li>
      <li>Salve com o ícone de disquete ou com Ctrl+S.</li>
      <li>No menu de funções, ao lado de “Depuração”, escolha <b>adicionarColaborador</b> e clique em <b>Executar</b>.</li>
      <li>Copie o token que aparece no Registro de execução. Se o registro mostrar só “Execução iniciada” e “Execução concluída”, escolha a função de novo e execute outra vez.</li>
      <li>Entregue o token só à própria pessoa, nunca em grupo. Ela abre Configurações no CRM, cola o token em “Seu token da agenda” e clica em Conectar.</li>
      <li>Apague o nome da linha <code>COLABORADOR</code> e salve, para não repetir o cadastro por engano.</li>
    </ol>
    <p class="meio-sub">Os tokens dos demais continuam valendo, e não é preciso nova implantação. Para tirar o acesso de quem saiu, faça os passos 1 a 3 com o nome dessa pessoa e execute <b>revogarColaborador</b>. Para reenviar o token a quem perdeu, execute <b>listarColaboradores</b>.</p>
  </details>`;
}

// ── a tela ─────────────────────────────────────────────────────────────
function cardLigarAgenda(msg){
  const admin = souAdmin();
  return `<section class="aq-ligar">
    <h3>Ligar a agenda de atendimentos</h3>
    <p class="meio-sub">${esc(msg||"A agenda grava no Google Agenda do Paulo por meio de um Apps Script. Cada pessoa usa o próprio token, que o Paulo entrega individualmente.")}</p>
    ${admin?`<label class="aq-campo">Endereço do Apps Script (vale para o escritório)
      <input id="aq-url" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(agendaUrl())}"></label>`
      : (agendaUrl()?"":`<p class="meio-sub">O Paulo ainda precisa informar o endereço do Apps Script.</p>`)}
    <label class="aq-campo">Seu token da agenda
      <input id="aq-token" type="password" autocomplete="off" placeholder="cole aqui o token que você recebeu" value="${esc(agendaToken())}"></label>
    <div class="form-linha"><button class="btn-mini forte" onclick="salvarLigacaoAgenda()">Conectar</button>
      <span class="meio-sub" id="aq-quem"></span></div>
    ${admin?passoColaboradorAgenda():""}
  </section>`;
}
async function salvarLigacaoAgenda(){
  const u = document.getElementById("aq-url"), t = document.getElementById("aq-token");
  try{ if(u && souAdmin() && u.value.trim()!==agendaUrl()) await guardarCfgApp("agenda_url", u.value.trim()); }
  catch(e){ return aviso("Não gravou o endereço: "+String(e.message||e).slice(0,80)); }
  guardar("crm_agenda_token", (t.value||"").trim());
  const q = document.getElementById("aq-quem");
  try{ const r = await agendaApi("quemSouEu"); if(q) q.textContent = `Conectado como ${r.usuario} (${r.papel})`;
    aviso(`Agenda conectada como ${r.usuario}`, false); agq.disp=null; renderAgendaQuarta(); }
  catch(e){ if(q) q.textContent = e.message; }
}
// F828 · sem o Google ligado, a Agenda não prende no formulário: mostra o que o CRM tem com data (o Calendário) e um aviso discreto
const avisoLigarAgenda = () => `<p class="meio-sub aq-semgoogle">Agenda do Google não ligada: aqui ficam os prazos e atendimentos do CRM. <button type="button" class="btn-mini" onclick="document.getElementById('conteudo-meio').innerHTML=cardLigarAgenda()" title="Ligar a agenda do Google">Ligar</button></p>`;
function renderAgendaQuarta(){
  if(!agendaUrl() || !agendaToken()){
    renderCalendario(); tituloLista(temaV10() ? "Agenda" : "📅 Agenda");
    document.getElementById("conteudo-meio").insertAdjacentHTML("afterbegin", avisoLigarAgenda()); return;
  }
  tituloLista(temaV10() ? "Agenda" : "📅 Agenda");
  const meio = document.querySelector(".meio"); if(temaV10()) meio.classList.add("ag-v10");
  document.getElementById("sub-lista").textContent = "Atendimentos presenciais, das 08h00 às 12h30 e das 13h30 às 18h30. Cada profissional tem a sua cor.";
  const alvo = document.getElementById("conteudo-meio");
  pintarTopoAgenda();
  carregarEspera(true).then(()=>{ if(visao==="agendaq" && agq.disp) pintarAgenda(); });   // F456
  agq.disp = agq.cache[agq.prof] || null;
  if(!agq.disp){
    alvo.innerHTML = `<div class="aq" aria-busy="true"><div class="aq-faixa">${Array.from({length:6},()=>`<span class="aq-dia sk-caixa">${skl("60%",11)}${skl("40%",10)}</span>`).join("")}</div>${esqueletoLista(8)}</div>`;
    carregarAgenda().then(()=>{ if(visao==="agendaq") { montarSidebar(); pintarTopoAgenda(); pintarAgenda(); } preCarregarAgendas(); });
  } else { pintarAgenda(); preCarregarAgendas(); }
  // 60 s, só com a aba à vista e a tela aberta
  clearInterval(agq.timer);
  agq.timer = setInterval(async ()=>{
    if(visao!=="agendaq"){ clearInterval(agq.timer); return; }
    if(document.visibilityState!=="visible") return;
    await carregarAgenda(); if(agq.prof!=="paulo") await carregarAgenda("paulo");
    if(visao==="agendaq"){ montarSidebar(); pintarAgenda(); }
  }, 60000);
}
function pintarTopoAgenda(){
  const lista = ((agq.disp||agq.cache.paulo||{}).profissionais) || [{id:"paulo",nome:"Paulo"},{id:"marcos",nome:"Marcos"},{id:"amanda",nome:"Amanda"}];
  document.getElementById("topo-extra").innerHTML = `<div class="aq-topo">
    <div class="seg-colab aq-profs" role="group" aria-label="Profissional">${[...lista, {id:"todos", nome:"Completa"}].map(x=>`<button data-aqprof="${x.id}" aria-pressed="${agq.prof===x.id}" class="${agq.prof===x.id?"on":""}"><i class="aq-bola p-${x.id}"></i>${esc(x.nome)}</button>`).join("")}</div>
    ${((agq.disp||agq.cache.paulo||{}).papel==="admin")?`<button class="btn-rap" onclick="abrirDiasAgenda()">Dias de atendimento</button>`:""}
    <button class="btn-rap aq-pesq" onclick="pesquisarAgenda()" title="Pesquisar atendimento pelo nome ou telefone" aria-label="Pesquisar atendimento"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></button>
    <button class="aq-agendar" onclick="abrirFluxoAgenda()">+ Agendar</button></div>`;
  document.querySelectorAll("[data-aqprof]").forEach(b=>b.onclick=async()=>{ agq.prof=b.dataset.aqprof;
    if(agq.prof==="todos" && PROFS_AGENDA.every(pr=>agq.cache[pr])) juntarCompleta();   // F250g · a Completa sai do que já está guardado
    agq.disp=agq.cache[agq.prof]||null; agq.sel=null; pintarTopoAgenda();
    if(!agq.disp){ document.getElementById("conteudo-meio").innerHTML = esqueletoLista(8); await carregarAgenda(); } else carregarAgenda().then(()=>visao==="agendaq"&&pintarAgenda());
    if(!agq.sel && agq.disp) agq.sel=(agq.disp.dias.find(d=>!d.bloqueado)||agq.disp.dias[0]||{}).data;
    if(visao==="agendaq") pintarAgenda(); });
}
// F507 · a lupa da Agenda: procura o atendimento pelo nome ou pelo telefone em todos os dias carregados das três agendas
// (Paulo, Marcos e Amanda; o Apps Script devolve os próximos dias de atendimento de cada um), e o clique abre o dia
function achadosAgenda(q){
  const t = semAcento(q).toLowerCase().trim(), dig = q.replace(/\D/g,"");
  if(t.length<2 && dig.length<4) return [];
  const vistos = new Set(), res = [];
  PROFS_AGENDA.forEach(pr=>((agq.cache[pr]||{}).dias||[]).forEach(d=>(d.eventos||[]).forEach(e=>{
    if(!e.atendimento || vistos.has(e.id)) return;
    const nome = nomeDoEvento(e), tel = String(e.telefone||"").replace(/\D/g,"");
    const bate = (t.length>=2 && semAcento(nome+" "+e.titulo).toLowerCase().includes(t)) || (dig.length>=4 && tel.includes(dig));
    if(bate){ vistos.add(e.id); res.push({...e, data:e.data||d.data, nome, profissional:e.profissional||pr}); }
  })));
  return res.sort((a,b)=>(a.data+a.inicio).localeCompare(b.data+b.inicio));
}
function pesquisarAgenda(){
  caixa(`<div class="aq-fluxo aq-pesquisa"><h3>Pesquisar na agenda</h3>
    <label class="aq-campo">Nome ou telefone do cliente<input id="aq-pq" class="aq-inp" autocomplete="off" placeholder="Digite ao menos 2 letras"></label>
    <div id="aq-pq-res" aria-live="polite"></div>
    <button class="btn-mini aq-pq-ant-bt" title="Procurar nos atendimentos que já passaram"><span aria-hidden="true">Anteriores</span><span class="sr-only">Procurar nos atendimentos que já passaram</span></button>
    <div id="aq-pq-ant" aria-live="polite"></div></div>`);
  const inp = document.getElementById("aq-pq"), out = document.getElementById("aq-pq-res"), ant = document.getElementById("aq-pq-ant");
  // F510 · o passado só vem a pedido, pelo Apps Script (até 5 anos), para não pesar a agenda nem a primeira tela
  document.querySelector(".aq-pq-ant-bt").onclick = async () => {
    const q = inp.value.trim();
    if(q.replace(/\s/g,"").length<2){ ant.innerHTML = `<p class="aq-vazio">Digite ao menos 2 letras.</p>`; inp.focus(); return; }
    ant.innerHTML = `<p class="meio-sub">Procurando nos atendimentos anteriores…</p>`;
    try{
      const r = (await agendaApi("historico", {q})).atendimentos || [];
      if(inp.value.trim()!==q) return;
      // F554 · o atendimento de quem tem ficha abre a ficha
      ant.innerHTML = `<h4>Atendimentos anteriores</h4>` + (r.length ? `<ul class="aq-pq-lista">${r.map(e=>{ const cli = cliDoEvento(e);
        const miolo = `<i class="aq-bola p-${e.profissional||"paulo"}"></i>
        <b>${esc(nomeDoEvento(e))}</b><span>${diaExt(e.data)}, ${dataBR(e.data)} às ${hmTxt(e.inicio)} · ${esc(nomeProf(e.profissional||"paulo"))} · ${esc(e.tipo||"")}${cli?" · abrir a ficha":""}</span>`;
        return `<li>${cli ? `<button class="aq-pq-ficha" onclick="fecharCaixa();abrirFicha('${cli.id}')" title="Abrir a ficha de ${esc(cli.nome)}">${miolo}</button>` : `<span class="aq-pq-it">${miolo}</span>`}</li>`; }).join("")}</ul>`
        : `<p class="aq-vazio">Nenhum atendimento anterior encontrado.</p>`);
    }catch(e){
      if(inp.value.trim()!==q) return;
      ant.innerHTML = `<p class="aq-vazio">${e.codigo==="ACAO_INVALIDA" ? "A agenda do Google ainda está na versão antiga: falta publicar a versão nova do Apps Script." : esc(e.message)}</p>`;
    }
  };
  const pintar = () => {
    const q = inp.value, falta = PROFS_AGENDA.filter(pr=>!agq.cache[pr]);
    const r = achadosAgenda(q);
    const dias = PROFS_AGENDA.flatMap(pr=>((agq.cache[pr]||{}).dias||[]).map(d=>d.data)).sort();
    const nota = dias.length ? `<p class="meio-sub">Procura nos dias carregados, de ${dataBR(dias[0])} a ${dataBR(dias[dias.length-1])}${falta.length?`; ainda carregando a agenda de ${falta.map(nomeProf).join(" e ")}`:""}.</p>` : "";
    if(!q.trim()){ out.innerHTML = nota; return; }
    out.innerHTML = (r.length ? `<ul class="aq-pq-lista">${r.map(e=>`<li><button data-aqpq="${esc(e.id)}"><i class="aq-bola p-${e.profissional}"></i>
        <b>${esc(e.nome)}</b><span>${diaExt(e.data)}, ${dataBR(e.data)} às ${hmTxt(e.inicio)} · ${esc(nomeProf(e.profissional))} · ${esc(e.tipo||"")} · ${e.confirmado?"Confirmado":"Não confirmado"}</span></button></li>`).join("")}</ul>`
      : `<p class="aq-vazio">Nenhum atendimento encontrado.</p>`) + nota;
    out.querySelectorAll("[data-aqpq]").forEach(b=>b.onclick=()=>irAoAtendimento(r.find(e=>e.id===b.dataset.aqpq)));
  };
  inp.oninput = () => { ant.innerHTML = ""; pintar(); }; inp.focus(); pintar();
  // as agendas que ainda não vieram carregam agora, e a lista se refaz quando chegam
  PROFS_AGENDA.filter(pr=>!agq.cache[pr]).forEach(pr=>carregarAgenda(pr).then(()=>{ if(document.getElementById("aq-pq")===inp) pintar(); }).catch(()=>{}));
}
function irAoAtendimento(e){
  if(!e) return;
  fecharCaixa();
  if(agq.prof!=="todos") agq.prof = e.profissional;
  if(agq.prof==="todos") juntarCompleta();
  agq.disp = agq.cache[agq.prof] || agq.disp; agq.sel = e.data;
  if(visao!=="agendaq"){ irPara("agendaq"); return; }
  pintarTopoAgenda(); pintarAgenda();
  const b = document.querySelector(`[data-aqev="${CSS.escape(e.id)}"]`);
  if(b){ b.scrollIntoView({block:"center"}); b.classList.add("aq-achado"); b.focus({preventScroll:true}); setTimeout(()=>b.classList.remove("aq-achado"), 2500); }
}
// F554 · os atendimentos presenciais da pessoa: os próximos (agendamentosFuturos e a agenda já carregada) e os
// anteriores (historico do Apps Script, 5 anos); um pedido por pessoa a cada 10 minutos, guardado na sessão.
// o = {id, nome, tel}: com ficha vale o clienteId do evento ou o nome; sem ficha, o telefone (os próximos) e o nome.
const _atendCli = new Map();
const chaveAtend = o => o.id ? "c:"+o.id : o.tel ? "t:"+String(o.tel).replace(/\D/g,"").slice(-8) : "n:"+semAcento(o.nome||"").toLowerCase().trim();
const palavrasNome = n => semAcento(n||"").toLowerCase().split(/\s+/).filter(p=>p.length>2 && !["das","dos"].includes(p));
function eventoDaPessoa(e, o){
  if(o.id && e.clienteId) return e.clienteId===o.id;
  const t8 = String(o.tel||"").replace(/\D/g,"").slice(-8);
  if(!o.id && t8.length===8 && String(e.telefone||"").replace(/\D/g,"").endsWith(t8)) return true;
  const pal = palavrasNome(o.nome); if(pal.length<2) return false;
  const n = semAcento(nomeDoEvento(e)).toLowerCase();
  return n.includes(pal[0]) && n.includes(pal[pal.length-1]);
}
function atendimentosDe(o){
  const k = chaveAtend(o), m = _atendCli.get(k);
  if(m && (m.carregando || Date.now()-m.em < 600000)) return m;
  const novo = {o, k, carregando:true, em:Date.now(), fut:[], ant:[], erro:null};
  _atendCli.set(k, novo);
  let tel = String(o.tel||"").replace(/\D/g,""); if(tel.length>11 && tel.startsWith("55")) tel = tel.slice(2);
  const pal = palavrasNome(o.nome), q = pal.length>=2 ? pal[0]+" "+pal[pal.length-1] : "";
  const pFut = (o.id || tel.length>=10) ? agendaApi("agendamentosFuturos", o.id ? {clienteId:o.id} : {telefone:tel}).then(r=>r.agendamentos||[]).catch(()=>[]) : Promise.resolve([]);
  const pAnt = q ? agendaApi("historico", {q}).then(r=>r.atendimentos||[]).catch(e=>{ novo.erro = e.codigo==="ACAO_INVALIDA" ? "antiga" : "falha"; return []; }) : Promise.resolve([]);
  Promise.all([pFut, pAnt]).then(([fut, ant])=>{
    const h = hoje(), vistos = new Set(), unico = e => !vistos.has(e.id) && vistos.add(e.id);
    const daAgenda = PROFS_AGENDA.flatMap(pr=>((agq.cache[pr]||{}).dias||[]).flatMap(d=>(d.eventos||[])
      .filter(e=>e.atendimento).map(e=>({...e, data:e.data||d.data, profissional:e.profissional||pr}))));
    novo.fut = fut.filter(e=>e.atendimento!==false && e.data>=h).concat(daAgenda.filter(e=>e.data>=h && eventoDaPessoa(e, o)))
      .filter(unico).sort((a,b)=>(a.data+a.inicio).localeCompare(b.data+b.inicio));
    novo.ant = ant.filter(e=>e.data<=h && eventoDaPessoa(e, o)).filter(unico).sort((a,b)=>(b.data+b.inicio).localeCompare(a.data+a.inicio));
    novo.carregando = false; novo.em = Date.now();
    document.querySelectorAll("[data-atend]").forEach(el=>{ if(el.dataset.atend===k) el.outerHTML = htmlAtend(novo, el.dataset.modo); });
  });
  return novo;
}
// a ficha do atendimento: o clienteId do evento ou, sem ele, o cliente de nome igual ao do evento
const cliDoEvento = e => (e.clienteId && D.cliPorId.get(e.clienteId)) || (D.clientes||[]).find(c=>c.nome && ehClienteDaLista(c) && semAcento(c.nome).toLowerCase()===semAcento(nomeDoEvento(e)).toLowerCase().trim());
const linhaAtendTxt = e => `${diaExt(e.data)}, ${dataBR(e.data)} às ${hmTxt(e.inicio)} · ${nomeProf(e.profissional||"paulo")}${e.tipo?` · ${e.tipo}`:""}`;
function htmlAtend(m, modo){
  const k = esc(m.k), fut = m.fut, ant = m.ant;
  if(modo==="zap"){
    const e = fut[0];
    return `<span class="zt-agend${e?"":" vazio"}" data-atend="${k}" data-modo="zap"${e?` title="${esc(linhaAtendTxt(e))}${e.confirmado?" · confirmado":""}${fut.length>1?` · e mais ${fut.length-1}`:""}"`:""}>${e
      ? `Agendado: <b>${dataBR(e.data).slice(0,5)} às ${hmTxt(e.inicio)}</b> · ${esc(nomeProf(e.profissional||"paulo"))}${fut.length>1?` (+${fut.length-1})`:""}` : ""}</span>`;
  }
  if(modo==="aq"){   // o agendamento do primeiro atendimento (001) de quem já veio antes
    const e = ant[0]; if(!e) return `<div data-atend="${k}" data-modo="aq"></div>`;
    const cli = cliDoEvento(e);
    return `<div class="aq-msg aq-ja" role="status" data-atend="${k}" data-modo="aq">Já atendido em ${dataBR(e.data)} com ${esc(nomeProf(e.profissional||"paulo"))}${ant.length>1?` (${ant.length} atendimentos)`:""}.
      ${cli ? `Se for ${esc(cli.nome)}, o atendimento é de cliente (002). <button class="btn-mini" onclick="aqEhCliente('${cli.id}')" title="Agendar como cliente do escritório (002)"><span aria-hidden="true">Cliente</span><span class="sr-only">Agendar como cliente do escritório (002)</span></button>`
        : `Se for a mesma pessoa, cadastre a ficha para agendar como cliente (002).`}</div>`;
  }
  if(modo==="per" || modo==="perprev"){   // F562 · a tela Perícias: o atendimento presencial já agendado do cliente
    const e = fut[0];
    if(!e) return `<div class="${modo==="per"?"l4":"aviso"}" data-atend="${k}" data-modo="${modo}" hidden></div>`;
    const txt = `${dataBR(e.data)} às ${hmTxt(e.inicio)} com ${esc(nomeProf(e.profissional||"paulo"))}${e.confirmado?", confirmado":""}${fut.length>1?` (e mais ${fut.length-1})`:""}`;
    return modo==="per"
      ? `<div class="l4 ja-at" data-atend="${k}" data-modo="per" title="${esc(linhaAtendTxt(e))}">Atendimento presencial já agendado: <b>${txt}</b>.</div>`
      : `<div class="aviso forte ja-at" data-atend="${k}" data-modo="perprev">O cliente já tem atendimento presencial agendado: <b>${txt}</b>. Ao ligar, saem apenas os lembretes, sem a oferta do atendimento.</div>`;
  }
  if(modo==="aqcli"){
    const e = ant[0];
    return `<p class="meio-sub" data-atend="${k}" data-modo="aqcli">${e ? `Último atendimento: ${esc(linhaAtendTxt(e))}.` : ""}</p>`;
  }
  const li = (e, fut) => `<li class="ac-it"><b>${dataBR(e.data)} às ${hmTxt(e.inicio)}</b><span class="ac-data">${esc(nomeProf(e.profissional||"paulo"))}</span>
      ${fut ? `<button class="btn-mini" onclick='verAtendAgenda(${esc(JSON.stringify({id:e.id, data:e.data, profissional:e.profissional||"paulo"}))})' title="Abrir o dia na Agenda"><span aria-hidden="true">Agenda</span><span class="sr-only">Abrir o dia na Agenda</span></button>` : "<span></span>"}
      <small>${diaExt(e.data)}${e.tipo?` · ${e.tipo==="001"?"primeiro atendimento":"cliente"} (${e.tipo})`:""}${fut ? ` · ${e.confirmado?"confirmado":"não confirmado"}` : ""}</small></li>`;
  return `<section class="idf-card idf-atend" aria-labelledby="idf-atend" data-atend="${k}" data-modo="idf"><h3 class="adr-h" id="idf-atend">Atendimentos presenciais${!m.carregando?` (${fut.length+ant.length})`:""}</h3>
    ${m.carregando ? `<p class="meio-sub">Consultando a agenda…</p>` : `
    <h4>Próximos</h4>${fut.length ? `<ul class="ac-lista">${fut.map(e=>li(e, true)).join("")}</ul>` : `<p class="meio-sub">Nenhum atendimento agendado.</p>`}
    <h4>Anteriores</h4>${ant.length ? `<ul class="ac-lista">${ant.slice(0,12).map(e=>li(e, false)).join("")}</ul>${ant.length>12?`<p class="meio-sub">e mais ${ant.length-12}.</p>`:""}`
      : `<p class="meio-sub">${m.erro==="antiga" ? "A agenda do Google ainda está na versão antiga: falta publicar a versão nova do Apps Script." : m.erro ? "Não consegui ler os atendimentos anteriores." : "Nenhum atendimento anterior nos últimos 5 anos."}</p>`}`}
  </section>`;
}
const caixaAtendimentos = c => htmlAtend(atendimentosDe({id:c.id, nome:c.nome}), "idf");
function zapAgendHtml(c){
  const cli = clienteDaConversa(c);
  if(!cli && !c.telefone) return "";
  return htmlAtend(atendimentosDe(cli ? {id:cli.id, nome:cli.nome} : {tel:c.telefone, nome:c.contato_nome||""}), "zap");
}
function aqEhCliente(id){
  const f = fluxo, c = D.cliPorId.get(id); if(!f || !c) return;
  f.cli=c; f.novo=false; f.tipo=(f.vaga&&f.vaga.tipo)||"002"; f.nome=c.nome; f.tel=(c.telefone||"").replace(/\D/g,"") || f.tel; f.corrigir=false; f.msg=""; pintarFluxo();
}
async function verAtendAgenda(e){
  if(clienteAberto) fecharFicha();
  if(!agq.cache[e.profissional]) await carregarAgenda(e.profissional).catch(()=>{});
  irAoAtendimento(e);
}
function pintarAgenda(){
  const alvo = document.getElementById("conteudo-meio");
  if(agq.erro && !agq.disp){
    if(["NAO_AUTORIZADO","SEM_URL"].includes(agq.erro.codigo)) { alvo.innerHTML = cardLigarAgenda(agq.erro.message); return; }
    alvo.innerHTML = `<p class="meio-sub">${esc(agq.erro.message)} <button class="btn-mini" onclick="agq.disp=null;renderAgendaQuarta()" title="tentar de novo"><span aria-hidden="true">Repetir</span><span class="sr-only">tentar de novo</span></button></p>`; return;
  }
  const r = agq.disp; if(!r) return;
  const dia = r.dias.find(d=>d.data===agq.sel) || r.dias[0];
  // F406b · o dia em que as vagas foram tiradas no Google e nada foi marcado diz "Sem vagas", em vez de 0/14
  const semVagas = d => !d.bloqueado && !d.atendimentos && !vagasDoDia(d).length;
  const faixa = r.dias.map(d=>`<button class="aq-dia${d.data===agq.sel?" on":""}${d.bloqueado||semVagas(d)?" bloq":lotDia(d)?" lot":""}" data-aqdia="${d.data}">
      <b>${siglaData(d.data)}</b>
      <span>${d.bloqueado?"Feriado ou férias":semVagas(d)?"Sem vagas":d.limite?`${d.atendimentos}/${capDia(d)}${lotDia(d)?" · lotado":""}`:`${d.atendimentos} ${d.atendimentos===1?"atendimento":"atendimentos"}${lotDia(d)?" · lotado":""}`}</span>${(n=>n?`<span class="aq-dia-livres">${n} ${n===1?"vaga":"vagas"}</span>`:"")(vagasDoDia(d).length)}</button>`).join("");
  alvo.innerHTML = `<div class="aq">
    ${r.alerta?`<div class="aq-alerta" role="alert">${esc(r.alerta)}</div>`:""}
    <div class="aq-faixa" role="tablist" aria-label="Próximos dias de atendimento de ${esc(nomeProf(agq.prof))}">${faixa}</div>
    ${faixaLiberada()}
    ${dia ? listaVagas(dia) : ""}
    ${quadroEspera(dia)}
    ${dia ? linhaDoTempoAgenda(dia, r) : ""}
    <p class="meio-sub">Conectado como ${esc(r.usuario||"")} (${esc(r.papel||"")}). A agenda se atualiza sozinha a cada minuto.
      <a href="#" onclick="event.preventDefault();document.getElementById('conteudo-meio').innerHTML=cardLigarAgenda()">trocar token</a></p>
  </div>`;
  alvo.querySelectorAll("[data-aqdia]").forEach(b=>b.onclick=()=>{ agq.sel=b.dataset.aqdia; pintarAgenda(); });
  alvo.querySelectorAll("[data-aqev]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); menuEventoAgenda(b, dia.eventos.find(x=>x.id===b.dataset.aqev)); });
  alvo.querySelectorAll("[data-aqvaga]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); agendarNaVaga(dia, b.dataset.aqvaga); });
}
// F250 · A VAGA DO GOOGLE AGENDA. O escritório deixa no Google Agenda os horários disponíveis com o título do tipo
// ("001", 45 minutos, ou "002", 30 minutos) e quem agenda troca esse título pelo nome do cliente. O Apps Script
// devolve essas vagas em livres[tipo] com vaga:true e o eventoId; agendar nelas troca o título do mesmo evento.
// F557: a vaga cujo horário já passou não é livre (a agenda carregada de manhã seguia oferecendo as das 9h às 10h43)
const vagaPassou = (data, inicio) => data < hoje() || (data===hoje() && hmMin(inicio) <= new Date().getHours()*60 + new Date().getMinutes());
const vagasDoDia = d => d && !d.bloqueado ? ["001", "002"].flatMap(t=>(d.livres[t]||[]).filter(s=>s.vaga && !vagaPassou(d.data, s.inicio)).map(s=>({...s, tipo:s.tipo||t})))
  .sort((a, b)=>hmMin(a.inicio)-hmMin(b.inicio)) : [];
// F607: no dia só de vagas do Google o total é atendimentos + vagas livres, e sem vaga livre o dia está lotado (mostrava 7/14 com tudo ocupado)
const soVagasDia = d => !["001", "002"].some(t=>((d.livres||{})[t]||[]).some(s=>!s.vaga));
const capDia = d => soVagasDia(d) ? d.atendimentos + vagasDoDia(d).length : d.limite;
const lotDia = d => !!d.lotado || (!d.bloqueado && !!d.atendimentos && soVagasDia(d) && !vagasDoDia(d).length);
// com vagas no dia, valem elas (dos dois tipos); sem vagas, os horários calculados do tipo escolhido, como antes
const livresDoDia = (d, tipo) => { const v = vagasDoDia(d); return v.length ? v : (d && d.livres[tipo]) || []; };
const minDoTipo = t => t==="001" ? 45 : 30;
// F250f · o rótulo da vaga: com código, "001 · 45 min"; a "LIVRE" do Marcos e da Amanda, "Livre · 30 min" (o tipo vem do cliente)
const minDaVaga = s => hmMin(s.fim) - hmMin(s.inicio);
const rotVaga = s => s.tipoFixo===false ? `Livre · ${minDaVaga(s)} min` : `${s.tipo} · ${minDoTipo(s.tipo)} min`;
function listaVagas(dia){
  const v = vagasDoDia(dia); if(!v.length) return "";
  return `<section class="aq-vagas" aria-label="Vagas livres"><h4>Vagas livres · ${v.length}</h4>
    <div class="aq-vagas-l">${v.map(s=>`<button type="button" class="aq-vaga p-${s.profissional||agq.prof} t${s.tipo}" data-aqvaga="${esc(s.eventoId)}" title="agendar o cliente neste horário${agq.prof==="todos"?` · ${esc(nomeProf(s.profissional||"paulo"))}`:""}">
      <b>${s.inicio}</b><span>${rotVaga(s)}${agq.prof==="todos"?` · ${esc(nomeProf(s.profissional||"paulo"))}`:""}</span></button>`).join("")}</div></section>`;
}
// F456 · LISTA DE ESPERA DA AGENDA (projeto aprovado pelo Paulo em 08.11.2026, onda 1, https://claude.ai/artifact/4bMHJrsaQjtVULDSdZxC1x):
// quem quer horário mais cedo ou não achou vaga entra na lista; a vaga liberada (cancelar ou remarcar) é oferecida, pelo
// clique da recepção, a quem cabe, na ordem de entrada, uma pessoa por vez, com 30 minutos para responder (15 no dia ou na véspera).
const ESP_PROF = {paulo:"o Dr. Paulo", marcos:"o Dr. Marcos", amanda:"a Dra. Amanda"};
async function carregarEspera(forcar){
  if(agq.espera && !forcar) return agq.espera;
  try{ agq.espera = await api(`/rest/v1/agenda_espera?estado=in.(aguardando,oferta)&order=criado_em.asc`); agq.esperaErro = null; }
  catch(e){ agq.espera = []; agq.esperaErro = msgErro(e); }
  return agq.espera;
}
const periodoDe = h => hmMin(h) < 750 ? "manha" : "tarde";
const profDaVaga = s => s.profissional || (agq.prof==="todos" ? "paulo" : agq.prof);
function esperaCabe(e, s, data){
  if((e.ate && data > e.ate) || (e.marcado && data >= e.marcado)) return false;
  if(!(e.profs||[]).includes(profDaVaga(s))) return false;
  if(s.tipoFixo!==false && s.tipo!==e.tipo) return false;
  if((e.dias||[]).length && !e.dias.includes(new Date(data+"T12:00:00").getDay())) return false;
  return !(e.periodos||[]).length || e.periodos.includes(periodoDe(s.inicio));
}
// vaga que começa em menos de 2 horas fica para o encaixe por telefone
const ofertavel = (data, s) => data > hoje() || (data===hoje() && hmMin(s.inicio) - (new Date().getHours()*60 + new Date().getMinutes()) >= 120);
// ordem de entrada pelo dia; no mesmo dia, quem está sem horário vem antes de quem quer antecipar
const ordemEspera = l => [...l].sort((a, b)=>(a.criado_em||"").slice(0,10).localeCompare((b.criado_em||"").slice(0,10)) || (!!a.marcado - !!b.marcado) || (a.criado_em||"").localeCompare(b.criado_em||""));
const ultOferta = e => (e.ofertas||[]).slice(-1)[0] || null;
const emOferta = () => new Set((agq.espera||[]).filter(e=>e.estado==="oferta").map(e=>(ultOferta(e)||{}).eventoId));
function quemCabe(dia, s){ return ordemEspera(agq.espera||[]).filter(e=>e.estado==="aguardando" && esperaCabe(e, s, dia.data)); }
// F527 · com a IA da lista de espera ligada, a vaga liberada vai ao banco e a assistente a oferece pelo WhatsApp
const iaEspera = () => cfgApp("zap_ia_espera")==="sim";
function registrarLiberada(ev){
  if(!ev || !ev.id || !iaEspera()) return;
  api(`/rest/v1/rpc/agenda_liberada_registrar`,{method:"POST", body:JSON.stringify({p_evento:ev.id, p_prof:ev.profissional, p_data:ev.data})}).catch(()=>{});
}
function faixaLiberada(){
  const L = agq.liberada; if(!L || !agq.disp) return "";
  const dia = agq.disp.dias.find(d=>d.data===L.data), s = dia && vagasDoDia(dia).find(x=>x.eventoId===L.id);
  if(!s || emOferta().has(s.eventoId) || !ofertavel(dia.data, s)) return "";
  const l = quemCabe(dia, s);
  return `<div class="aq-lib" role="status"><span class="t"><b>Vaga liberada: ${siglaData(dia.data)} às ${hmTxt(s.inicio)}, ${esc(nomeProf(profDaVaga(s)))}${s.tipoFixo===false?"":`, ${s.tipo}`}.</b>
    ${l.length ? ` ${l.length===1?"Uma pessoa da lista cabe":`${l.length} pessoas da lista cabem`}; a primeira é ${esc(l[0].nome)}.` : " Ninguém da lista cabe neste horário."}</span>
    ${l.length && iaEspera() ? " A assistente virtual oferece este horário pelo WhatsApp, uma pessoa por vez." : ""}
    ${l.length && !iaEspera()?`<button class="btn-rap forte" onclick="oferecerEspera('${l[0].id}','${esc(s.eventoId)}','${dia.data}')" title="oferecer este horário a ${esc(l[0].nome)}">Oferecer<span class="sr-only"> a ${esc(l[0].nome)}</span></button>`:""}
    <button class="btn-rap" onclick="agq.liberada=null;pintarAgenda()" title="deixar o horário livre na agenda">Livre<span class="sr-only"> na agenda</span></button></div>`;
}
function quadroEspera(dia){
  if(!agq.espera) return `<section class="aq-esp"><p class="aq-esp-vazio">carregando a lista de espera…</p></section>`;
  const l = ordemEspera(agq.espera), ofert = emOferta();
  const vs = dia ? vagasDoDia(dia).filter(s=>!ofert.has(s.eventoId) && ofertavel(dia.data, s)) : [];
  const linha = (e, i) => {
    const venc = e.ate && e.ate < hoje(), o = e.estado==="oferta" ? ultOferta(e) : null;
    const s = !o && !venc && e.estado==="aguardando" ? vs.find(x=>esperaCabe(e, x, dia.data)) : null;
    const desc = `${e.tipo} · ${(e.profs||[]).map(nomeProf).join(" ou ")} · ${(e.periodos||[]).length===2?"qualquer período":(e.periodos||[]).map(p=>p==="manha"?"manhã":"tarde").join("")} · desde ${dataBR((e.criado_em||"").slice(0,10))}${e.ate?` · até ${dataBR(e.ate)}`:""}`;
    const extra = o ? `oferecida ${siglaData(o.data)} às ${hmTxt(o.inicio)}; responde até ${new Date(o.ate).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}${new Date(o.ate) < new Date()?" (prazo vencido)":""}`
      : e.marcado ? `tem atendimento em ${dataBR(e.marcado)}, quer antecipar` : "sem horário marcado";
    const bts = o ? `<button class="btn-mini" onclick="aceitouEspera('${e.id}')" title="aceitou: agendar neste horário">Aceitou</button><button class="btn-mini" onclick="recusouEspera('${e.id}')" title="recusou ou não respondeu no prazo: volta à lista">Recusou</button>`
      : s ? `<button class="btn-mini" onclick="oferecerEspera('${e.id}','${esc(s.eventoId)}','${dia.data}')" title="oferecer ${hmTxt(s.inicio)} a ${esc(e.nome)}">Oferecer<span class="sr-only"> ${hmTxt(s.inicio)}</span></button>` : "";
    return `<div class="aq-esp-it${s?" cabe":""}${venc?" venc":""}"><span class="aq-esp-o">${i+1}</span>
      <span><b>${esc(e.nome)}</b>${e.telefone?` · ${esc(fmtTelBR(e.telefone))}`:""}<small>${esc(desc)}</small><small>${esc(extra)}${e.obs?` · ${esc(e.obs)}`:""}</small></span>
      <span class="aq-esp-bts">${o?`<span class="aq-esp-pill of">em oferta</span>`:s?`<span class="aq-esp-pill">cabe às ${hmTxt(s.inicio)}</span>`:venc?`<span class="aq-esp-pill of">vencida</span>`:""}${bts}
        <button class="btn-mini" onclick="retirarEspera('${e.id}')" title="tirar ${esc(e.nome)} da lista de espera" aria-label="Retirar ${esc(e.nome)} da lista">✕</button></span></div>`;
  };
  return `<section class="aq-esp" aria-label="Lista de espera"><div class="aq-esp-cab"><h4>Lista de espera · ${l.length}</h4>
    <button class="btn-rap" onclick="incluirEspera()" title="incluir uma pessoa na lista de espera">Incluir<span class="sr-only"> na lista de espera</span></button></div>
    ${agq.esperaErro?`<p class="aq-esp-vazio">${esc(agq.esperaErro)}</p>`:l.length?l.map(linha).join(""):`<p class="aq-esp-vazio">Ninguém na lista. Inclua quem quer um horário mais cedo ou não achou vaga.</p>`}</section>`;
}
function incluirEspera(op={}){
  const c = op.cli || null, at = new Date(Date.now()+30*864e5).toISOString().slice(0,10);
  const profs = op.prof ? [op.prof] : ["amanda","paulo"];
  const ck = (nome, v, on, rot) => `<label class="aq-ck"><input type="checkbox" data-esp${nome}="${v}" ${on?"checked":""}> ${rot}</label>`;
  caixa(`<div class="aq-fluxo aq-esp-form"><h3>Incluir na lista de espera</h3>
    <label class="aq-campo">Nome<input id="esp-nome" class="aq-inp" value="${esc((c&&c.nome)||op.nome||"")}"></label>
    <label class="aq-campo">Telefone com DDD<input id="esp-tel" class="aq-inp" inputmode="tel" value="${esc(fmtTelBR((c&&c.telefone)||op.tel||""))}" oninput="mascararTel(this)"></label>
    <h4>Tipo</h4><div class="aq-semana">${["001","002"].map(t=>`<label class="aq-ck"><input type="radio" name="esp-tipo" value="${t}" ${(op.tipo||(c?"002":"001"))===t?"checked":""}> ${t}</label>`).join("")}</div>
    <h4>Com</h4><div class="aq-semana">${PROFS_AGENDA.map(pr=>ck("prof", pr, profs.includes(pr), esc(nomeProf(pr)))).join("")}</div>
    <h4>Dias</h4><div class="aq-semana">${[1,2,3,4,5].map(n=>ck("dia", n, true, DIA_EXTENSO[n].replace("-feira",""))).join("")}</div>
    <h4>Período</h4><div class="aq-semana">${ck("per","manha",true,"manhã")}${ck("per","tarde",true,"tarde")}</div>
    <label class="aq-campo">Até<input id="esp-ate" type="date" class="aq-inp" min="${hoje()}" value="${at}"></label>
    <label class="aq-campo">Já tem atendimento em (opcional)<input id="esp-marc" type="date" class="aq-inp" min="${hoje()}" value="${esc(op.marcado||"")}"></label>
    <label class="aq-campo">Observação (opcional)<input id="esp-obs" class="aq-inp"></label>
    <div class="aq-bts"><button class="btn-rap" onclick="fecharCaixa()">Cancelar</button><button class="btn-rap forte" id="esp-salvar">Incluir</button></div></div>`);
  document.getElementById("esp-salvar").onclick = async ()=>{
    const v = id => document.getElementById(id).value.trim(), nome = v("esp-nome").replace(/\s+/g," "), tel = v("esp-tel").replace(/\D/g,"");
    const lis = a => [...document.querySelectorAll(`[data-esp${a}]:checked`)].map(i=>i.dataset["esp"+a]);
    if(nome.length<3) return aviso("Informe o nome.");
    if(tel.length<10) return aviso("Informe o telefone com o DDD, para a oferta pelo WhatsApp.");
    const pr = lis("prof"), dias = lis("dia").map(Number), per = lis("per");
    if(!pr.length || !dias.length || !per.length) return aviso("Escolha ao menos um profissional, um dia e um período.");
    const achados = c ? [c] : D.clientes.filter(x=>dsa(x.nome).trim()===dsa(nome));
    const corpo = {nome, telefone:tel, cliente_id:achados.length===1?achados[0].id:null, tipo:(document.querySelector('[name="esp-tipo"]:checked')||{}).value||"001",
      profs:pr, dias, periodos:per, ate:v("esp-ate")||null, marcado:v("esp-marc")||null, obs:v("esp-obs")||null, criado_por:eu.id};
    try{ await api(`/rest/v1/agenda_espera`,{method:"POST",headers:{Prefer:"return=minimal"}, body:JSON.stringify(corpo)}); }
    catch(e){ return aviso("Não incluí na lista: "+msgErro(e)); }
    fecharCaixa(); aviso(`${nome} entrou na lista de espera`, false);
    await carregarEspera(true); if(visao==="agendaq") pintarAgenda();
  };
}
async function mudarEspera(id, corpo){
  await api(`/rest/v1/agenda_espera?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"}, body:JSON.stringify({...corpo, atualizado_em:new Date().toISOString()})});
  await carregarEspera(true); if(visao==="agendaq") pintarAgenda();
}
function msgOferta(e, s, data, ate){
  const h = new Date().getHours(), pn = (e.nome||"").split(" ")[0];
  return `${h<12?"Bom dia":h<18?"Boa tarde":"Boa noite"}, ${pn}. Surgiu um horário com ${ESP_PROF[profDaVaga(s)]||nomeProf(profDaVaga(s))} na ${diaExt(data)}, dia ${dataBR(data).slice(0,5)}, às ${hmTxt(s.inicio)}, no escritório. Podemos agendar o seu atendimento nesse horário?.`;
}
async function oferecerEspera(id, eventoId, data){
  const e = (agq.espera||[]).find(x=>x.id===id), dia = agq.disp && agq.disp.dias.find(d=>d.data===data);
  const s = dia && vagasDoDia(dia).find(x=>x.eventoId===eventoId);
  if(!e || !s) return aviso("A vaga ou a pessoa não está mais disponível. Atualize a agenda.");
  const amanha = new Date(Date.now()+864e5).toISOString().slice(0,10);
  const ate = new Date(Date.now() + (data<=amanha ? 15 : 30)*60000);
  const msg = msgOferta(e, s, data, ate);
  const oferta = {eventoId, data, inicio:s.inicio, prof:profDaVaga(s), tipo:s.tipoFixo===false?e.tipo:s.tipo, em:new Date().toISOString(), ate:ate.toISOString(), por:eu.id};
  try{ await mudarEspera(id, {estado:"oferta", ofertas:[...(e.ofertas||[]), oferta]}); }catch(err){ return aviso("Não registrei a oferta: "+msgErro(err)); }
  if(agq.liberada && agq.liberada.id===eventoId) agq.liberada = null;
  let copiou = false; try{ await navigator.clipboard.writeText(msg); copiou = true; }catch(err){}
  if(!e.telefone) return aviso(copiou ? "Oferta registrada e mensagem copiada. A pessoa não tem telefone na lista." : msg);
  await zapDoNumero(e.telefone);
  setTimeout(()=>{ const t = document.getElementById("zap-txt");
    if(t && !t.value){ t.value = msg; t.dispatchEvent(new Event("input", {bubbles:true})); }
    else aviso(copiou ? "Mensagem da oferta copiada: cole na conversa." : msg, false); }, 700);
}
function aceitouEspera(id){
  const e = (agq.espera||[]).find(x=>x.id===id), o = e && ultOferta(e); if(!o) return;
  const cli = e.cliente_id ? D.cliPorId.get(e.cliente_id) : null;
  abrirFluxoAgenda({data:o.data, inicio:o.inicio, prof:o.prof, vaga:{eventoId:o.eventoId, tipo:o.tipo}, cli, busca:cli?"":e.nome, tel:e.telefone||""});
  fluxo.espera = id; if(!cli) pintarFluxo();
}
async function recusouEspera(id){
  const e = (agq.espera||[]).find(x=>x.id===id); if(!e) return;
  const of = [...(e.ofertas||[])]; if(of.length) of[of.length-1] = {...of[of.length-1], resposta:"recusou", resp_em:new Date().toISOString()};
  const o = ultOferta(e);
  try{ await mudarEspera(id, {estado:"aguardando", ofertas:of}); }catch(err){ return aviso(msgErro(err)); }
  if(o) agq.liberada = {id:o.eventoId, data:o.data};   // o horário passa ao próximo da lista
  if(visao==="agendaq") pintarAgenda();
}
async function retirarEspera(id){
  const e = (agq.espera||[]).find(x=>x.id===id); if(!e) return;
  if(!await confirmar(`Tirar ${e.nome} da lista de espera?`)) return;
  try{ await mudarEspera(id, {estado:"retirado"}); aviso("Retirado da lista", false); }catch(err){ aviso(msgErro(err)); }
}
function agendarNaVaga(dia, eventoId){
  const s = vagasDoDia(dia).find(x=>x.eventoId===eventoId); if(!s) return;
  abrirFluxoAgenda({data:dia.data, inicio:s.inicio, prof:s.profissional || (agq.prof==="todos" ? "paulo" : agq.prof), vaga:{eventoId, tipo:s.tipoFixo===false ? null : s.tipo}});
}
// F281 · A AGENDA NO WHATSAPP (pedido do Paulo, 26.10.2026): no canto de baixo à direita da tela do WhatsApp, os dias
// com vaga do Paulo, do Marcos e da Amanda, cada um na sua cor, e o clique na vaga abre o agendamento ali mesmo, já com
// o cliente da conversa aberta (ou o nome e o telefone do contato, se não for cliente). Lê a agenda Completa.
let zag = { aberta:null, prof:"todos", dia:null, desde:null, longe:null, longePor:null, longeErro:null, longeCarr:false };
function zagAberta(){ if(visao!=="whatsapp") return !!zag.fora; if(zag.aberta===null){ const v = ler("crm_zap_agenda"); zag.aberta = v==="1"; /* F377 · nasce recolhida: aberta, cobria a ficha do cliente e a conversa */ } return zag.aberta; }
function zagAlternar(){
  if(visao==="whatsapp"){ zag.aberta = !zagAberta(); guardar("crm_zap_agenda", zag.aberta ? "1" : "0"); } else zag.fora = !zag.fora;
  pintarAgendaZap(); if(zagAberta()) zagCarregar();
}
function zagProf(pr){ zag.prof = pr; zag.dia = null; pintarAgendaZap(); }
function zagDia(d){ zag.dia = zag.dia===d ? "" : d; pintarAgendaZap(); }
// as vagas da Completa por dia, só dos profissionais escolhidos
function zagDias(){
  const r = zag.desde ? zag.longe : agq.cache.todos; if(!r) return [];
  return r.dias.map(d=>({d, v:vagasDoDia(d).map(s=>({...s, profissional:s.profissional||"paulo"})).filter(s=>zag.prof==="todos" || s.profissional===zag.prof)}))
    .filter(x=>x.v.length);
}
function zagConversa(){ return visao==="whatsapp" && zapAberta ? zapConvs.find(c=>c.id===zapAberta) || null : null; }
const telDaConversa = c => { const d = String((c&&c.telefone)||"").replace(/\D/g,""); return /^55\d{10,11}$/.test(d) ? d.slice(2) : d; };
function pintarAgendaZap(){
  const el = document.getElementById("zap-ag"); if(!el) return;
  el.hidden = visao==="agendaq";   // na própria Agenda o botão sobra
  const profs = PROFS_AGENDA, todos = zag.desde ? !!zag.longe : profs.every(pr=>agq.cache[pr]);
  const dias = zagDias(), total = dias.reduce((n, x)=>n + x.v.length, 0);
  if(!zagAberta()){
    el.innerHTML = `<button class="zag-pilula" onclick="zagAlternar()" aria-expanded="false" aria-label="Agenda de atendimentos" title="abrir a agenda de atendimentos">
      ${zic("agenda",20)}<span class="zag-t">${profs.map(pr=>`<i class="aq-bola p-${pr}"></i>`).join("")}Agenda${todos?` · ${total} ${total===1?"vaga":"vagas"}`:""}</span></button>`;
    return;
  }
  let corpo;
  if(!agendaUrl() || !agendaToken()) corpo = `<p class="zag-vazio">A agenda não está conectada neste navegador. <a href="#" onclick="event.preventDefault();irPara('agendaq')">Conectar na Agenda</a></p>`;
  else if(zag.desde && zag.longeErro) corpo = `<p class="zag-vazio">${esc(zag.longeErro)}</p>`;
  else if(zag.desde && !todos) corpo = `<p class="zag-vazio">procurando as vagas a partir de ${dataBR(zag.desde)}…</p>`;
  else if(agq.erro && !todos) corpo = `<p class="zag-vazio">${esc(agq.erro.message)} <button class="btn-mini" onclick="zagCarregar(true)" title="tentar de novo"><span aria-hidden="true">Repetir</span><span class="sr-only">tentar de novo</span></button></p>`;
  else if(!todos) corpo = `<p class="zag-vazio">carregando as vagas…</p>`;
  else if(!dias.length) corpo = `<p class="zag-vazio">Nenhuma vaga livre ${zag.desde?`a partir de ${dataBR(zag.desde)}`:"nos próximos dias"}${zag.prof==="todos"?"":` de ${esc(nomeProf(zag.prof))}`}.</p>${zagMais()}`;
  else {
    if(zag.dia===null || (zag.dia && !dias.some(x=>x.d.data===zag.dia))) zag.dia = dias[0].d.data;
    corpo = dias.map(({d, v})=>{
      const por = profs.map(pr=>[pr, v.filter(s=>s.profissional===pr)]).filter(([, l])=>l.length);
      const aberto = d.data===zag.dia;
      return `<button class="zag-dia" data-zagdia="${d.data}" aria-expanded="${aberto}" onclick="zagDia('${d.data}')"><b>${siglaData(d.data)}</b>
          <span class="zag-conta">${por.map(([pr, l])=>`<span class="zag-n p-${pr}" title="${esc(nomeProf(pr))}: ${l.length} ${l.length===1?"vaga":"vagas"}">${esc(nomeProf(pr))} ${l.length}</span>`).join("")}</span></button>
        ${aberto ? `<div class="zag-vagas">${por.map(([pr, l])=>`<div class="zag-prof"><span><i class="aq-bola p-${pr}"></i>${esc(nomeProf(pr))}</span>
          <div class="zag-hs">${l.map(s=>`<button class="zag-vaga p-${pr} t${s.tipo}" data-zagvaga="${esc(s.eventoId)}" onclick="agendarPeloZap('${d.data}','${esc(s.eventoId)}')"
            title="agendar com ${esc(nomeProf(pr))} em ${dataBR(d.data)} às ${s.inicio}">${s.inicio}<small>${s.tipoFixo===false ? `${minDaVaga(s)} min` : s.tipo}</small></button>`).join("")}</div></div>`).join("")}</div>` : ""}`;
    }).join("") + zagMais();
  }
  const c = zagConversa(), cli = c && c.cliente_id && D.cliPorId.get(c.cliente_id);
  el.innerHTML = `<section class="zag-cx" aria-label="Agenda de atendimentos">
    <div class="zag-cab"><h3>Agenda de atendimentos</h3>
      <button onclick="zagCarregar(true)" title="atualizar as vagas" aria-label="Atualizar as vagas">↻</button>
      <button onclick="zagAlternar()" title="recolher a agenda" aria-label="Recolher a agenda">▾</button></div>
    <div class="zag-profs" role="group" aria-label="Profissional">${[["todos","Todos"], ...profs.map(pr=>[pr, nomeProf(pr)])].map(([id, nm])=>
      `<button data-zagprof="${id}" aria-pressed="${zag.prof===id}" onclick="zagProf('${id}')">${id==="todos"?"":`<i class="aq-bola p-${id}"></i>`}${esc(nm)}</button>`).join("")}</div>
    <div class="zag-desde"><label for="zag-desde">A partir de</label>
      <input type="date" id="zag-desde" min="${hoje()}" value="${zag.desde||""}" onchange="zagBuscar(this.value)">
      ${zag.desde?`<button class="zl-link" onclick="zagBuscar('')" title="voltar às próximas"><span aria-hidden="true">Próximas</span><span class="sr-only">voltar às próximas</span></button>`:""}</div>
    <p class="zag-para">${c ? `Agendar para: <b>${esc(cli ? cli.nome : (c.nome_perfil || fmtTelBR(telDaConversa(c))))}</b>${cli?"":" (não é cliente)"}` : "Clique na vaga para agendar sem sair do WhatsApp."}</p>
    <div class="zag-corpo">${corpo}</div></section>`;
}
// "Mais datas": continua do dia seguinte ao último que a busca trouxe
function zagMais(){
  const r = zag.desde ? zag.longe : agq.cache.todos, ult = r && r.dias.length && r.dias[r.dias.length-1].data;
  if(!ult || zag.longeErro) return "";
  const dep = new Date(ult+"T12:00:00"); dep.setDate(dep.getDate()+1);
  return `<button class="zag-mais" onclick="zagBuscar('${dep.toISOString().slice(0,10)}')">Mais datas, depois de ${dataBR(ult)}</button>`;
}
// F281 · procurar a partir de uma data adiante (o cliente que quer janeiro): as três agendas a partir dela, sem mexer na agenda de hoje
async function zagBuscar(desde){
  desde = desde && desde > hoje() ? desde : "";
  Object.assign(zag, {desde:desde||null, longe:null, longePor:null, longeErro:null, dia:null});
  pintarAgendaZap();
  if(!desde) return;
  try{
    const rs = await Promise.all(PROFS_AGENDA.map(pr=>agendaApi("disponibilidade", {profissional:pr, desde, dias: pr==="paulo" ? 5 : 25})));
    if(zag.desde!==desde) return;
    // a versão antiga do Apps Script não conhece o "desde" e devolve as datas de hoje
    if(rs.some(r=>r.dias.length && r.dias[0].data < desde)) zag.longeErro = "Para procurar datas adiante, a agenda do Google precisa da versão nova do Apps Script (F281). Até lá, aparecem só as próximas datas.";
    else { zag.longePor = Object.fromEntries(PROFS_AGENDA.map((pr, i)=>[pr, rs[i]])); zag.longe = {dias: juntarDias(rs)}; }
  }catch(e){ if(zag.desde===desde) zag.longeErro = e.message; }
  if(zag.desde===desde) pintarAgendaZap();
}
// as três agendas: a primeira vez, e de novo quando passou um minuto (ou no ↻)
async function zagCarregar(forcar){
  if(!agendaUrl() || !agendaToken()) return pintarAgendaZap();
  const velho = !PROFS_AGENDA.every(pr=>agq.cache[pr]) || Date.now() - (agq.em||0) > 60000;
  if(!forcar && !velho){ if(!agq.cache.todos){ juntarCompleta(); pintarAgendaZap(); } return; }
  pintarAgendaZap();
  await carregarCompleta().catch(()=>{});
  pintarAgendaZap();
}
function agendarPeloZap(data, eventoId){
  const dia = ((zag.desde ? zag.longe : agq.cache.todos)||{dias:[]}).dias.find(d=>d.data===data);
  const s = vagasDoDia(dia).find(x=>x.eventoId===eventoId); if(!s) return;
  // a data adiante entra na agenda do profissional, que é de onde o passo do horário lê os dias
  const pr = s.profissional||"paulo", dPr = zag.longePor && zag.longePor[pr] && zag.longePor[pr].dias.find(d=>d.data===data);
  if(dPr && agq.cache[pr] && !agq.cache[pr].dias.some(d=>d.data===data))
    agq.cache[pr] = {...agq.cache[pr], dias:[...agq.cache[pr].dias, dPr].sort((a, b)=>a.data<b.data?-1:1)};
  const c = zagConversa(), cli = c && c.cliente_id && D.cliPorId.get(c.cliente_id);
  abrirFluxoAgenda({data, inicio:s.inicio, prof:s.profissional||"paulo", vaga:{eventoId, tipo:s.tipoFixo===false ? null : s.tipo},
    cli, tel:telDaConversa(c), busca:c && !cli ? (c.nome_perfil||"") : ""});
}
const AQ_INI = 8*60, AQ_FIM = 18*60+30, AQ_PX = 24;   // 24 px a cada 15 minutos
function linhaDoTempoAgenda(dia, r){
  if(dia.bloqueado) return `<div class="aq-vazio">Dia bloqueado por feriado ou férias.</div>`;
  const y = hm => (hmMin(hm)-AQ_INI)/15*AQ_PX;
  const alto = (AQ_FIM-AQ_INI)/15*AQ_PX;
  const horas = []; for(let m=AQ_INI; m<=AQ_FIM; m+=30) horas.push(m);
  // sobreposições antigas (lançadas à mão) lado a lado, em raias
  const evs = dia.eventos.filter(e=>hmMin(e.fim)>AQ_INI && hmMin(e.inicio)<AQ_FIM).slice().sort((a,b)=>hmMin(a.inicio)-hmMin(b.inicio));
  const raias = []; evs.forEach(e=>{ let i=raias.findIndex(f=>f<=hmMin(e.inicio)); if(i<0){ i=raias.length; raias.push(0); } raias[i]=hmMin(e.fim); e._raia=i; });
  const nR = Math.max(1, raias.length);
  const bloco = e => {
    const por = autoriaAgenda(e);
    const top = Math.max(0,y(e.inicio)), h = Math.max(AQ_PX-2, y(e.fim)-Math.max(0,y(e.inicio))-2);
    if(e.vaga && vagaPassou(dia.data, e.inicio)) return `<div class="aq-ev outro" style="top:${top}px;height:${h}px;left:calc(${e._raia}*100%/${nR});width:calc(100%/${nR} - 4px)" title="vaga não usada · ${e.inicio} às ${e.fim} · o horário já passou"><span class="aq-ev-h">${e.inicio}–${e.fim}</span><b>Horário passado</b></div>`;
    if(e.vaga) return `<button class="aq-ev aq-ev-vaga p-${e.profissional||(agq.prof==="todos"?"paulo":agq.prof)} t${e.tipo}" data-aqvaga="${esc(e.id)}" style="top:${top}px;height:${h}px;left:calc(${e._raia}*100%/${nR});width:calc(100%/${nR} - 4px)"
      title="vaga livre ${esc(e.tipoFixo===false?"":e.tipo||"")} · ${e.inicio} às ${e.fim} · clique para agendar${por.longa?" · "+esc(por.longa):""}"><span class="aq-ev-h">${e.inicio}–${e.fim}${e.tipoFixo===false?"":` · ${esc(e.tipo||"")}`}</span><b>Livre · agendar</b>${por.curta?`<span class="aq-ev-por">${esc(por.curta)}</span>`:""}</button>`;
    // a cor é do profissional; compromisso que não é atendimento fica cinza
    const cls = e.atendimento ? `aq-ev p-${e.profissional||(agq.prof==="todos"?"paulo":agq.prof)} t${e.tipo}` : "aq-ev outro";
    const nome = e.atendimento ? (e.nome || e.titulo.replace(/^\s*00[12]\s*-\s*/,"").replace(/\s*-\s*(n[ãa]o confirmado|confirmado)\s*$/i,"")) : e.titulo;
    // F422ab: o evento de 15 minutos põe o nome na linha da hora, porque a segunda linha ficava cortada
    const curto = hmMin(e.fim)-hmMin(e.inicio) <= 15 ? " aq-curto" : "";
    return `<button class="${cls}${curto}" data-aqev="${esc(e.id)}" style="top:${top}px;height:${h}px;left:calc(${e._raia}*100%/${nR});width:calc(100%/${nR} - 4px)"
      ${e.atendimento?"":"tabindex=\"-1\""} title="${esc(e.titulo)} · ${e.inicio} às ${e.fim}${por.longa?" · "+esc(por.longa):""}">
      <span class="aq-ev-h">${e.inicio}–${e.fim}${e.atendimento?` · ${e.tipo}<span class="aq-selo ${e.confirmado?"ok":""}">${e.confirmado?"Confirmado":"Não confirmado"}</span>`:""}</span>
      <b>${esc(nome)}</b>${por.curta?`<span class="aq-ev-por">${esc(por.curta)}</span>`:""}</button>`;
  };
  const reservas = (r.dias.find(d=>d.data===dia.data)||{}).reservas || dia.reservas || [];
  const cab = dia.limite ? `${dia.atendimentos} de ${capDia(dia)} atendimentos${lotDia(dia)?" · lotado":""}` : `${dia.atendimentos} ${dia.atendimentos===1?"atendimento":"atendimentos"}${lotDia(dia)?" · lotado":""}`;
  return `<div class="aq-tempo-cab"><b>${nomeProf(agq.prof)} · ${diaExt(dia.data)}, ${dataBR(dia.data)}</b><span>${cab}</span>
      <span class="aq-leg">${(agq.prof==="todos" ? ["paulo","marcos","amanda"] : [agq.prof]).map(pr=>`<span class="aq-leg-tipos">${esc(nomeProf(pr))}:
        <span><i class="aq-sw p-${pr} t001"></i>001 · 45 min</span>
        <span><i class="aq-sw p-${pr} t002"></i>002 · 30 min</span></span>`).join("")}
        <i class="outro"></i>outro compromisso · tracejado = vaga livre</span></div>
    <div class="aq-tempo" style="height:${alto}px">
      <div class="aq-horas">${horas.map(m=>`<span style="top:${(m-AQ_INI)/15*AQ_PX}px">${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}</span>`).join("")}</div>
      <div class="aq-trilho">
        ${horas.map(m=>`<i class="aq-linha${m%60?" meia":""}" style="top:${(m-AQ_INI)/15*AQ_PX}px"></i>`).join("")}
        ${agq.prof==="paulo" ? `<div class="aq-almoco" style="top:${y("12:30")}px;height:${y("13:30")-y("12:30")}px"><span>Almoço, sem agendamento</span></div>` : ""}
        ${reservas.map(v=>`<div class="aq-reserva" style="top:${y(v.inicio)}px;height:${y(v.fim)-y(v.inicio)}px"><span>Encaixe urgente, somente Paulo</span></div>`).join("")}
        <div class="aq-evs">${evs.map(bloco).join("")}</div>
      </div>
    </div>`;
}
// F406 · quem incluiu, quem alterou por último e, na vaga devolvida, quem a liberou (gravado pelo Apps Script no evento)
function autoriaAgenda(e){
  const em = d => d ? ` em ${d}` : "";
  if(e.vaga) return e.liberadoPor ? {curta:`liberada por ${e.liberadoPor}`, longa:`liberada por ${e.liberadoPor}${em(e.liberadoEm)}`} : {curta:"", longa:""};
  const curta = [e.agendadoPor && `por ${e.agendadoPor}`, e.alteradoPor && `${e.alteradoPor} ${e.alteracao||"alterou"}`].filter(Boolean).join(" · ");
  const longa = [e.agendadoPor && `Agendado por ${e.agendadoPor}${em(e.agendadoEm)}`, e.alteradoPor && `${e.alteradoPor} ${e.alteracao||"alterou"}${em(e.alteradoEm)}`].filter(Boolean).join(". ");
  return {curta, longa};
}
function menuEventoAgenda(el, ev){
  if(!ev || !ev.atendimento) return;
  document.querySelectorAll(".aq-menu").forEach(m=>m.remove());
  // lançado à mão no Google Agenda: só Confirmar e Abrir cliente (instrução 5.3.4)
  const podeMexer = ev.origemCrm;
  const m = document.createElement("div"); m.className = "aq-menu"; m.setAttribute("role","menu");
  const op = (acao, rot) => `<button role="menuitem" data-aqop="${acao}">${rot}</button>`;
  const por = autoriaAgenda(ev).longa;
  m.innerHTML = (por ? `<div class="aq-menu-por">${esc(por)}</div>` : "") + op("editar","Editar") + (ev.confirmado ? "" : op("confirmar","Confirmar"))
    + (podeMexer ? op("remarcar","Remarcar") : "")
    + (podeMexer ? op("cancelar","Cancelar") : "")
    + (podeCadastrar() ? op("chegou","Chegou para o atendimento") : "")
    + op("abrir","Abrir cliente")
    + (ev.origemCrm ? op("whats","Copiar mensagem de WhatsApp") : "");
  document.body.appendChild(m);
  const r = el.getBoundingClientRect();
  m.style.top = Math.min(window.innerHeight-m.offsetHeight-8, r.top)+"px";
  m.style.left = Math.min(window.innerWidth-m.offsetWidth-8, r.right+6)+"px";
  const fora = e => { if(!m.contains(e.target)){ m.remove(); document.removeEventListener("click", fora, true); } };
  setTimeout(()=>document.addEventListener("click", fora, true));
  m.querySelectorAll("[data-aqop]").forEach(b=>b.onclick=async()=>{ m.remove(); await acaoEventoAgenda(b.dataset.aqop, ev); });
}
// F250e · Editar o atendimento já marcado, também o lançado à mão no Google Agenda: o nome e o telefone; o tipo e o status ficam
const nomeDoEvento = ev => ev.nome || ev.titulo.replace(/^\s*00[12]\s*-\s*/,"").replace(/\s*-\s*(n[ãa]o confirmado|confirmado)\s*$/i,"");
function editarEventoAgenda(ev){
  caixa(`<div class="aq-fluxo"><h3>Editar o atendimento <span class="aq-tipo">${esc(ev.tipo||"")} · ${dataBR(ev.data)} às ${hmTxt(ev.inicio)}</span></h3>
    <label class="aq-campo">Nome do cliente<input id="aq-ed-nome" class="aq-inp" value="${esc(nomeDoEvento(ev))}"></label>
    <label class="aq-campo">Telefone com DDD<input id="aq-ed-tel" class="aq-inp" inputmode="tel" value="${esc(fmtTelBR(ev.telefone||""))}" oninput="mascararTel(this)"></label>
    <div class="aq-bts"><button class="btn-rap" onclick="fecharCaixa()">Cancelar</button><button class="btn-rap forte" id="aq-ed-salvar">Salvar</button></div></div>`);
  document.getElementById("aq-ed-salvar").onclick = async ()=>{
    const nome = document.getElementById("aq-ed-nome").value.replace(/\s+/g," ").trim(), tel = document.getElementById("aq-ed-tel").value.replace(/\D/g,"");
    if(nome.length<3) return aviso("Informe o nome do cliente.");
    try{ await agendaApi("editar", {eventId:ev.id, nome, telefone:tel}); }
    catch(e){ return aviso(e.codigo==="ACAO_INVALIDA" ? "O Apps Script da agenda ainda está na versão antiga: implante a F250e para poder editar." : e.message); }
    fecharCaixa(); aviso("Atendimento atualizado", false);
    await carregarAgenda(); montarSidebar(); if(visao==="agendaq") pintarAgenda();
  };
  // F253 · o cursor vai ao nome só se ninguém já começou a digitar em outro campo da janela
  setTimeout(()=>{ const i = document.getElementById("aq-ed-nome"), a = document.activeElement; if(i && !(a && a.matches && a.matches("input,textarea,select"))){ i.focus(); i.select(); } }, 30);
}
function clienteDoEvento(ev){
  if(ev.clienteId && D.cliPorId.get(ev.clienteId)) return D.cliPorId.get(ev.clienteId);
  const nome = dsa((ev.nome || ev.titulo.replace(/^\s*00[12]\s*-\s*/,"").replace(/\s*-\s*(n[ãa]o confirmado|confirmado)\s*$/i,"")).trim());
  const achados = D.clientes.filter(c=>dsa(c.nome).trim()===nome);
  return achados.length===1 ? achados[0] : null;
}
async function acaoEventoAgenda(acao, ev){
  try{
    if(acao==="confirmar"){ await agendaApi("confirmar",{eventId:ev.id}); aviso("Atendimento confirmado", false); }
    else if(acao==="cancelar"){
      if(!await confirmar(`Cancelar o atendimento de ${ev.nome||ev.titulo} em ${dataBR(ev.data)} às ${hmTxt(ev.inicio)}?`)) return;
      await agendaApi("cancelar",{eventId:ev.id});
      agq.liberada = {id:ev.id, data:ev.data};   // F456 · a vaga volta e é oferecida à lista de espera
      registrarLiberada(ev);
      const c = clienteDoEvento(ev);
      if(c) await registrarAgendaNoCliente(c, `Atendimento presencial com ${nomeProf(ev.profissional)} de ${dataBR(ev.data)} às ${hmTxt(ev.inicio)} (${ev.tipo}) cancelado, por ${(eu.nome||"").split(" ")[0]}.`, null);
      aviso("Atendimento cancelado", false);
    }
    else if(acao==="remarcar"){ return abrirFluxoAgenda({remarcar:ev}); }
    else if(acao==="editar"){ return editarEventoAgenda(ev); }
    else if(acao==="chegou"){   // F425 · o cliente chegou: a ficha e a janela do balcão (CPF, senha do gov.br, dossiê, aviso)
      const c = clienteDoEvento(ev);
      if(!c) return chegouNovo(ev);
      await abrirFicha(c.id); return chegouAtendimento(c.id);
    }
    else if(acao==="abrir"){ const c = clienteDoEvento(ev); return c ? abrirFicha(c.id) : aviso("Não achei este cliente no CRM pelo nome do evento."); }
    else if(acao==="whats"){ try{ await navigator.clipboard.writeText(msgAgendaWhats(ev.nome, ev.data, ev.inicio, ev.tipo, ev.profissional)); }catch(e){} aviso("Mensagem copiada", false); return; }
  }catch(e){ aviso(e.message); }
  await carregarAgenda(); if(agq.prof!=="paulo") await carregarAgenda("paulo"); montarSidebar(); if(visao==="agendaq") pintarAgenda();
}
// ── F152 · os dias de atendimento (só o Paulo): dias fixos e trocas pontuais
async function abrirDiasAgenda(prof){
  prof = prof || agq.prof;
  const r = agq.cache[prof] || await carregarAgenda(prof);
  if(!r) return aviso("A agenda não respondeu.");
  const aj = r.ajustes || {dias:[], extras:[], folgas:[]};
  const lista = r.profissionais || [];
  const hojeIso = hoje(), proximos = r.dias.map(d=>d.data);
  caixa(`<div class="aq-fluxo aq-diasfixos">
    <h3>Dias de atendimento</h3>
    <div class="aq-profsel">${lista.map(x=>`<button class="${prof===x.id?"on":""}" data-djprof="${x.id}"><i class="aq-bola p-${x.id}"></i>${esc(x.nome)}</button>`).join("")}</div>
    <h4>Toda semana</h4>
    <div class="aq-semana">${[1,2,3,4,5,6,0].map(n=>`<label class="aq-ck"><input type="checkbox" data-djdia="${n}" ${aj.dias.includes(n)?"checked":""}> ${DIA_EXTENSO[n]}</label>`).join("")}</div>
    <div class="aq-bts"><button class="btn-rap forte" id="dj-salvar" title="Salvar os dias fixos">Salvar<span class="sr-only"> os dias fixos</span></button></div>
    <h4>Trocar um dia</h4>
    <div class="aq-troca">
      <label class="aq-campo">Não atende em<select id="dj-de" class="aq-inp"><option value="">(nenhum)</option>${proximos.map(d=>`<option value="${d}">${siglaData(d)}</option>`).join("")}</select></label>
      <label class="aq-campo">Atende em<input id="dj-para" type="date" class="aq-inp" min="${hojeIso}"></label>
      <button class="btn-rap forte" id="dj-trocar">Trocar</button>
    </div>
    ${(aj.extras.length||aj.folgas.length)?`<h4>Trocas marcadas</h4><div class="aq-ajustes">${
      aj.folgas.map(d=>`<span>não atende ${siglaData(d)} <button class="btn-mini" data-djdesf="${d}">desfazer</button></span>`).join("")
      + aj.extras.map(d=>`<span>atende ${siglaData(d)} <button class="btn-mini" data-djdesf="${d}">desfazer</button></span>`).join("")}</div>`:""}
    <div class="aq-bts"><button class="btn-rap" onclick="fecharCaixa()">Fechar</button></div></div>`);
  const depois = async (msg) => { delete agq.cache[prof]; await carregarAgenda(prof); if(prof===agq.prof) agq.disp=agq.cache[prof];
    montarSidebar(); if(visao==="agendaq"){ agq.sel=null; if(agq.disp) agq.sel=(agq.disp.dias.find(d=>!d.bloqueado)||agq.disp.dias[0]||{}).data; pintarAgenda(); }
    if(msg) aviso(msg, false); abrirDiasAgenda(prof); };
  document.querySelectorAll("[data-djprof]").forEach(b=>b.onclick=()=>abrirDiasAgenda(b.dataset.djprof));
  document.getElementById("dj-salvar").onclick = async ()=>{
    const dias = [...document.querySelectorAll("[data-djdia]:checked")].map(i=>+i.dataset.djdia);
    try{ await agendaApi("definirDias", {profissional:prof, dias}); await depois("Dias de atendimento salvos"); }catch(e){ aviso(e.message); } };
  document.getElementById("dj-trocar").onclick = async ()=>{
    const de = document.getElementById("dj-de").value, para = document.getElementById("dj-para").value;
    if(!de && !para) return aviso("Escolha o dia que sai e o dia que entra.");
    try{ const x = await agendaApi("trocarDia", {profissional:prof, de, para});
      await depois(x.atendimentosNoDiaQueSai ? `Troca feita. Há ${x.atendimentosNoDiaQueSai} atendimento(s) em ${dataBR(de)}: remarque-os.` : "Troca feita"); }
    catch(e){ aviso(e.message); } };
  document.querySelectorAll("[data-djdesf]").forEach(b=>b.onclick=async()=>{
    try{ await agendaApi("desfazerAjuste", {profissional:prof, data:b.dataset.djdesf}); await depois("Troca desfeita"); }catch(e){ aviso(e.message); } });
}
// o registro no cliente: andamento no caso ativo; sem caso, anotação do atendimento
async function registrarAgendaNoCliente(c, texto, marca){
  const k = (D.casosDoCliente.get(c.id)||[]).find(x=>x.fase!=="encerrado");
  c.campos = {...(c.campos||{})};
  if(marca!==undefined) c.campos.agenda_quarta = marca;
  try{
    if(k){
      await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({caso_id:k.id, autor_id:eu.id, origem:"app", publico:false, texto})});
    } else {
      c.campos.atendimento = [...(c.campos.atendimento||[]), {em:new Date().toISOString(), quem:(eu.nome||"").split(" ")[0], autor_id:eu.id, texto}];
    }
    await api(`/rest/v1/clientes?id=eq.${c.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"}, body:JSON.stringify({campos:c.campos})});
  }catch(e){ aviso("A agenda gravou, mas o registro no cliente falhou: "+String(e.message||e).slice(0,80)); }
}
// o próximo atendimento, na ficha do cliente
function chipAgendaCliente(c){
  const a = (c.campos||{}).agenda_quarta;
  if(!a || !a.data || a.data<hoje()) return "";
  return `<button class="chip aq-chip" onclick="agq.prof='${a.profissional||"paulo"}';agq.disp=agq.cache[agq.prof]||null;agq.sel='${a.data}';irPara('agendaq')" title="abrir a agenda nesse dia">Atendimento ${a.modalidade==="online"?"Online":"Presencial"} ${siglaData(a.data)} às ${hmTxt(a.inicio)}${a.profissional?` · ${esc(nomeProf(a.profissional))}`:""}</button>`;
}

// ── o fluxo de agendamento, em etapas ────────────────────────────────────
let fluxo = null;
function abrirFluxoAgenda(op={}){
  fluxo = { etapa: op.remarcar ? 5 : 1, cli:null, novo:false, tipo: op.remarcar ? op.remarcar.tipo : null,
    prof: (op.remarcar && op.remarcar.profissional) || op.prof || (agq.prof==="todos" ? "paulo" : agq.prof),
    nome:"", tel:"", telOk:false, acomp:null, data: op.data || agq.sel, inicio: op.inicio || null, obs:"",
    o1:false, o2:false, remarcar: op.remarcar || null, sugerir: op.sugerir || null, msg:"", feito:null, busca:"",
    vaga: op.vaga || null, eventoId: (op.vaga||{}).eventoId || null };   // F250
  if(op.vaga) fluxo.tipo = op.vaga.tipo;
  // F281 · do WhatsApp: o cliente da conversa vai direto à conferência do telefone; quem não é cliente, com o nome e o número
  if(op.cli){ Object.assign(fluxo, {cli:op.cli, tipo:fluxo.tipo||"002", nome:op.cli.nome, tel:(op.cli.telefone||"").replace(/\D/g,"") || op.tel || "", etapa:2}); }
  else { if(op.busca) fluxo.busca = op.busca; if(op.tel) fluxo.tel = op.tel; }
  if(op.remarcar){ const c = clienteDoEvento(op.remarcar); fluxo.cli = c; fluxo.nome = op.remarcar.nome || (c&&c.nome) || ""; fluxo.tel = op.remarcar.telefone || (c&&c.telefone) || ""; }
  pintarFluxo();
}
// F257 · o nome escrito de outro jeito também aparece (Luiz e Luis, Colatrelli e Collatrelli, Souza e Sousa): cada
// palavra vira a chave do som (sem acento, z = s, y = i, ph = f, letra dobrada simples) e aceita uma letra trocada
const chaveSom = w => dsa(w).replace(/ph/g,"f").replace(/y/g,"i").replace(/z/g,"s").replace(/(.)\1+/g,"$1");
function quaseIgual(a, b){   // b começa por a, com no máximo uma letra a mais, a menos ou trocada
  if(b.startsWith(a)) return true;
  if(a.length < 4) return false;
  const c = b.slice(0, a.length), d = b.slice(0, a.length + 1), e = b.slice(0, a.length - 1);
  const um = (x, y) => { if(Math.abs(x.length - y.length) > 1) return false; let i = 0, j = 0, dif = 0;
    while(i < x.length && j < y.length){ if(x[i]===y[j]){ i++; j++; continue; } if(++dif > 1) return false;
      if(x.length > y.length) i++; else if(y.length > x.length) j++; else { i++; j++; } }
    return dif + (x.length - i) + (y.length - j) <= 1; };
  return um(a, c) || um(a, d) || um(a, e);
}
const ultimos8 = t => String(t||"").replace(/\D/g,"").slice(-8);
function clientesDoTelefone(tel){   // quem já tem esse número, pelos 8 últimos dígitos (o DDD e o 9 variam)
  const u = ultimos8(tel); if(u.length < 8) return [];
  return D.clientes.filter(c => c.nome && [c.telefone, ...telefonesDe(c).map(t=>t.numero)].some(n => ultimos8(n) === u));
}
function buscarClientesAgenda(q){
  const n = dsa(q).replace(/\s+/g," ").trim(); if(n.replace(/\D/g,"").length<3 && n.length<3) return [];
  const partes = n.split(" ").filter(Boolean), dig = q.replace(/\D/g,"");
  if(dig.length >= 3 && !/[a-z]/.test(n))
    return D.clientes.filter(c => String(c.cpf||"").includes(dig) || (dig.length >= 4 && [c.telefone, ...telefonesDe(c).map(t=>t.numero)].some(t => String(t||"").replace(/\D/g,"").includes(dig))))
      .slice(0,8).map(c => ({c, como: String(c.cpf||"").includes(dig) ? "" : "telefone"}));
  const sons = partes.map(chaveSom);
  const iguais = [], parecidos = [];
  for(const c of D.clientes){ if(!c.nome) continue;
    const nome = dsa(c.nome).replace(/\s+/g," ");
    if(partes.every(p=>nome.includes(p))){ iguais.push({c, como:""}); continue; }
    const pals = nome.split(" ").map(chaveSom);
    if(sons.every(sp => pals.some(w => quaseIgual(sp, w)))) parecidos.push({c, como:"parecido"}); }
  return [...iguais.slice(0,8), ...parecidos.slice(0, Math.max(3, 8 - iguais.length))];
}
function sugAgendaHtml(f){
  const achados = buscarClientesAgenda(f.busca), temParecido = achados.some(a=>a.como==="parecido");
  return achados.map(({c, como})=>`${como==="parecido" && achados.find(a=>a.como==="parecido").c===c ? `<p class="aq-sug-t">Nome parecido: confira se não é a mesma pessoa</p>` : ""}<button data-aqcli="${c.id}"${como?` class="aq-${como}"`:""}><b>${esc(c.nome)}</b><span>${cpfMascarado(c.cpf)}${c.telefone?` · ${esc(fmtTelBR(c.telefone))}`:""} · ${esc(civilDe(c).cidade||"cidade não informada")}</span></button>`).join("")
    + (f.busca.trim().length>=3 ? `<button class="aq-novo" data-aqnovo="1"><b>Nenhum destes, é primeiro atendimento</b><span>cria o pré-cadastro e agenda ${f.vaga&&f.vaga.tipo?f.vaga.tipo:"001"}</span></button>` : "");
}
// F257 · o telefone do primeiro atendimento que já está num cadastro: pode ser a mesma pessoa (agenda como cliente)
// ou alguém pedindo para um familiar ou amigo (segue como primeiro atendimento)
function telJaCadastrado(f){
  const l = clientesDoTelefone(f.tel); if(!l.length) return "";
  return `<div class="aq-teljá" role="status"><b>Este telefone já está no cadastro de:</b>
    <div class="aq-sug">${l.slice(0,4).map(c=>`<button data-aqmesmo="${c.id}"><b>${esc(c.nome)}</b><span>É esta pessoa: agendar como cliente do escritório</span></button>`).join("")}</div>
    <p class="meio-sub">Se quem vem é outra pessoa (familiar ou amigo de quem ligou), continue como primeiro atendimento.</p></div>`;
}
function ligarTelJa(f){
  document.querySelectorAll("[data-aqmesmo]").forEach(b=>b.onclick=()=>{ const c = D.cliPorId.get(b.dataset.aqmesmo); if(!c) return;
    f.cli=c; f.novo=false; f.tipo=(f.vaga&&f.vaga.tipo)||"002"; f.nome=c.nome; f.tel=(c.telefone||"").replace(/\D/g,"") || f.tel; f.corrigir=false; f.msg=""; pintarFluxo(); });
}
function ligarSugAgenda(f){
  document.querySelectorAll("[data-aqcli]").forEach(b=>b.onclick=()=>{ f.cli=D.cliPorId.get(b.dataset.aqcli); f.novo=false; f.tipo=(f.vaga&&f.vaga.tipo)||"002"; f.nome=f.cli.nome; f.tel=(f.cli.telefone||"").replace(/\D/g,""); f.corrigir=false; f.etapa=2; f.msg=""; pintarFluxo(); });
  document.querySelectorAll("[data-aqnovo]").forEach(b=>b.onclick=()=>{ f.nome=f.busca.replace(/\d/g,"").replace(/\s+/g," ").trim() || (f.cli ? "" : f.nome); f.cli=null; f.novo=true; f.tipo=(f.vaga&&f.vaga.tipo)||"001"; f.etapa=2; f.msg=""; pintarFluxo(); });
}
function pintarFluxo(){
  const f = fluxo; if(!f) return;
  const passos = ["Quem","Tipo","Agendamentos","Acompanhante","Horário","Orientações"];
  const cab = `<div class="aq-passos">${passos.map((p,i)=>`<span class="${i+1===f.etapa?"on":i+1<f.etapa?"feito":""}">${i+1}. ${p}</span>`).join("")}</div>`;
  let corpo = "";
  const msg = f.msg ? `<div class="aq-msg" role="alert">${esc(f.msg)}</div>` : "";
  if(f.feito){ corpo = sucessoFluxo(); }
  else if(f.etapa===1){
    corpo = `<h3>Quem vem ao atendimento?${f.vaga?` <span class="aq-tipo">${f.vaga.tipo||"livre"} · ${dataBR(f.data)} às ${hmTxt(f.inicio)}</span>`:""}</h3>
      <input id="aq-busca" class="aq-inp" placeholder="Nome, CPF ou telefone" value="${esc(f.busca)}" autocomplete="off">
      <div class="aq-sug">${sugAgendaHtml(f)}</div>`;
  } else if(f.etapa===2){
    corpo = f.novo ? `<h3>Primeiro atendimento <span class="aq-tipo">001 · 45 minutos</span></h3>
        <label class="aq-campo">Nome completo<input id="aq-nome" class="aq-inp" value="${esc(f.nome)}"></label>
        <label class="aq-campo">Telefone com DDD<input id="aq-tel" class="aq-inp" inputmode="tel" placeholder="(16) 99999-9999" value="${esc(fmtTelBR(f.tel))}"></label>
        <div id="aq-tel-de">${telJaCadastrado(f)}</div>
        <div id="aq-ja">${htmlAtend(atendimentosDe({nome:f.nome}), "aq")}</div>
        <div class="aq-bts"><button class="btn-rap" data-aqvolta="1">Voltar</button><button class="btn-rap forte" id="aq-seg2">${clientesDoTelefone(f.tel).length?"É outra pessoa, continuar":"Continuar"}</button></div>`
      : `<h3>${esc(f.cli.nome)} <span class="aq-tipo">002 · 30 minutos</span> <button class="btn-mini" id="aq-trocar" title="Agendar para outra pessoa">Trocar<span class="sr-only"> a pessoa a ser atendida</span></button></h3>
        <p class="meio-sub">Cliente do escritório. Confira o telefone antes de seguir.</p>
        ${htmlAtend(atendimentosDe({id:f.cli.id, nome:f.cli.nome}), "aqcli")}
        ${f.corrigir||!f.tel ? `<label class="aq-campo">${f.tel?"Telefone com DDD":"Sem telefone no cadastro. Informe o telefone com DDD, que ele fica gravado no cliente"}<input id="aq-tel" class="aq-inp" inputmode="tel" placeholder="(16) 99999-9999" value="${esc(fmtTelBR(f.tel))}"></label>`
          : `<p class="aq-tel-atual">${esc(fmtTelBR(f.tel))}</p>`}
        <div class="aq-bts"><button class="btn-rap" data-aqvolta="1">Voltar</button>
          ${f.corrigir||!f.tel ? `<button class="btn-rap forte" id="aq-seg2" title="Salvar telefone e continuar"><span aria-hidden="true">Continuar</span><span class="sr-only">Salvar telefone e continuar</span></button>`
            : `<button class="btn-rap" id="aq-corrigir">Corrigir</button><button class="btn-rap forte" id="aq-seg2" title="Confirmar telefone">Confirmar<span class="sr-only"> telefone</span></button>`}</div>`;
  } else if(f.etapa===3){
    corpo = `<h3>Esta pessoa já tem atendimento marcado</h3>
      ${f.futuros.map(a=>`<p class="aq-futuro">Atendimento em ${dataBR(a.data)} às ${hmTxt(a.inicio)} (${a.tipo||""})</p>`).join("")}
      <div class="aq-bts"><button class="btn-rap" id="aq-remarcar-esse" title="Remarcar esse">Remarcar<span class="sr-only"> esse</span></button><button class="btn-rap forte" id="aq-seguir" title="Continuar mesmo assim">Continuar<span class="sr-only"> mesmo assim</span></button></div>`;
  } else if(f.etapa===4){
    corpo = `<h3>Alguém virá junto com assunto previdenciário próprio (cônjuge, familiar)?</h3>
      <div class="aq-bts"><button class="btn-rap ${f.acomp==="nao"?"forte":""}" data-aqacomp="nao">Não</button><button class="btn-rap ${f.acomp==="sim"?"forte":""}" data-aqacomp="sim">Sim</button></div>
      ${f.acomp==="sim"?`<div class="aq-msg">O agendamento é individual. A segunda pessoa precisa de horário próprio.</div>`:""}
      <div class="aq-bts"><button class="btn-rap" data-aqvolta="1">Voltar</button><button class="btn-rap forte" id="aq-seg4" ${f.acomp?"":"disabled"}>Continuar</button></div>`;
  } else if(f.etapa===5){
    const dispP = agq.cache[f.prof];
    const lista = ((dispP||agq.disp||{}).profissionais) || [];
    const dias = (dispP&&dispP.dias||[]).filter(d=>!d.bloqueado);
    // dia sem vaga (hoje depois do expediente, ou lotado) não serve de ponto de
    // partida: o fluxo abre no primeiro dia que tem horário livre
    if(!f.livre && dias.length && (!f.data || !dias.some(d=>d.data===f.data && livresDoDia(d, f.tipo).length)))
      f.data = (dias.find(d=>livresDoDia(d, f.tipo).length)||dias[0]||{}).data;
    const dia = dias.find(d=>d.data===f.data);
    const livres = dia ? livresDoDia(dia, f.tipo) : [], soVagas = livres.some(s=>s.vaga);
    const grupo = (tit, l) => l.length ? `<h4>${tit}</h4><div class="aq-horarios">${l.map(s=>`<button class="${s.inicio===f.inicio&&(!s.vaga||s.eventoId===f.eventoId)?"on":""}${f.sugerir&&s.inicio===f.sugerir.depoisDe?" sugerido":""}" data-aqhora="${s.inicio}"${s.vaga?` data-aqvev="${esc(s.eventoId)}"${s.tipoFixo===false?"":` data-aqtipo="${s.tipo}"`}`:""}>${s.inicio}${s.vaga?` <small>${rotVaga(s)}</small>`:""}</button>`).join("")}</div>` : "";
    corpo = `<h3>${f.remarcar?"Novo horário para "+esc(f.nome):"Escolha o horário"} <span class="aq-tipo">${f.tipo} · ${f.tipo==="001"?45:30} minutos</span></h3>
      <div class="aq-profsel" role="group" aria-label="Com quem">${lista.map(x=>`<button class="${f.prof===x.id?"on":""}" data-aqfprof="${x.id}" ${f.remarcar?"disabled":""}><i class="aq-bola p-${x.id}"></i>${esc(x.nome)}</button>`).join("")}</div>
      ${!dispP?`<p class="meio-sub">carregando a agenda de ${esc(nomeProf(f.prof))}…</p>`:""}
      <div class="aq-diasel">${dias.map(d=>`<button class="${d.data===f.data?"on":""}" data-aqdata="${d.data}" ${livresDoDia(d, f.tipo).length?"":"disabled"}>${siglaData(d.data)}<small>${(n=>`${n} livre${n===1?"":"s"}`)(livresDoDia(d, f.tipo).length)}</small></button>`).join("")}</div>
      ${soVagas ? grupo("Vagas livres no Google Agenda", livres) : grupo("Horários recomendados", livres.filter(s=>s.encaixado && !s.reserva))}
      ${soVagas ? "" : grupo("Outros horários", livres.filter(s=>!s.encaixado && !s.reserva))}
      ${grupo("Encaixe urgente", livres.filter(s=>s.reserva))}
      ${!livres.length && !f.livre?`<p class="meio-sub">Sem vaga livre neste dia.</p>`:""}
      ${((dispP||agq.disp||{}).papel==="admin") ? `<details class="aq-livre"${f.livre?" open":""}><summary>outro horário</summary>
        <p class="meio-sub">Fora das vagas, só para caso específico.</p>
        <input type="date" id="aq-ldata" class="aq-inp" value="${esc(f.livre?f.data:"")}"> <input type="time" id="aq-lhora" class="aq-inp" step="300" value="${esc(f.livre?f.inicio:"")}">
        <button class="btn-rap" id="aq-lusar" title="Usar este horário">Usar<span class="sr-only"> este horário</span></button></details>` : ""}
      <div class="aq-bts"><button class="btn-rap" data-aqvolta="1" ${f.remarcar?"hidden":""}>Voltar</button>
        ${f.remarcar||f.espera?"":`<button class="btn-rap" id="aq-espera" title="Incluir na lista de espera, para receber a vaga que abrir">Espera<span class="sr-only"> (incluir na lista de espera)</span></button>`}
        <button class="btn-rap forte" id="aq-seg5" ${f.inicio?"":"disabled"}>${f.remarcar?"Remarcar":"Continuar"}</button></div>`;
  } else if(f.etapa===6){
    corpo = `<h3>Orientações ao cliente</h3>
      <p class="meio-sub">${esc(f.nome)} · com ${esc(nomeProf(f.prof))} · ${diaExt(f.data)}, ${dataBR(f.data)} às ${hmTxt(f.inicio)} · ${f.tipo}</p>
      ${f.tipo==="002"
        // pedido do Paulo de 30.10.2026: no 002 o cliente já conhece a rotina, basta lembrar
        ? `<div class="aq-msg" id="aq-aviso002">Lembre o cliente: trazer a senha do Meu INSS atualizada. O atendimento é individual; outra pessoa com assunto próprio precisa de horário separado.</div>`
        : `<label class="aq-ck"><input type="checkbox" id="aq-o1" ${f.o1?"checked":""}> Orientei o cliente a trazer a senha do Meu INSS (conta gov.br) atualizada.</label>
      <label class="aq-ck"><input type="checkbox" id="aq-o2" ${f.o2?"checked":""}> Informei que o agendamento é individual e que outra pessoa com assunto próprio precisa de horário separado.</label>`}
      <label class="aq-campo">Observações (opcional)<textarea id="aq-obs" rows="2" class="aq-inp">${esc(f.obs)}</textarea></label>
      <div class="aq-bts"><button class="btn-rap" data-aqvolta="1">Voltar</button><button class="btn-rap forte" id="aq-gravar" ${orientou(f)?"":"disabled"}>Agendar</button></div>`;
  }
  caixa(`<div class="aq-fluxo">${f.feito?"":cab}${msg}${corpo}</div>`);
  ligarFluxo();
}
const orientou = f => f.tipo==="002" || (f.o1 && f.o2);
function sucessoFluxo(){
  const f = fluxo, e = f.feito, msg = msgAgendaWhats(f.nome, e.data, e.inicio, f.tipo, f.prof);
  return `<h3>${f.remarcar?"Atendimento remarcado":"Atendimento agendado"}</h3>
    <p class="aq-resumo"><b>${esc(f.nome)}</b> · com ${esc(nomeProf(f.prof))} · ${diaExt(e.data)}, ${dataBR(e.data)} às ${hmTxt(e.inicio)} · ${f.tipo} · ${f.tipo==="001"?45:30} minutos</p>
    <pre class="aq-whats">${esc(msg)}</pre>
    <div class="aq-bts"><button class="btn-rap" id="aq-copiar">Copiar</button>
      ${visao==="whatsapp" && zapAberta ? `<button class="btn-rap forte" id="aq-naconversa" title="Pôr na conversa"><span aria-hidden="true">Inserir</span><span class="sr-only">Pôr na conversa</span></button>` : ""}
      ${f.tel && !(visao==="whatsapp" && zapAberta)?`<a class="btn-rap" target="_blank" rel="noopener" href="https://wa.me/55${String(f.tel).replace(/\D/g,"")}?text=${encodeURIComponent(msg)}" aria-label="Abrir no WhatsApp">${iconeFonte("zap")} Abrir</a>`:""}
      ${f.acomp==="sim"?`<button class="btn-rap forte" id="aq-segunda" title="Agendar a segunda pessoa">Agendar<span class="sr-only"> a segunda pessoa</span></button>`:""}
      <button class="btn-rap" onclick="fecharCaixa()">Fechar</button></div>`;
}
function ligarFluxo(){
  const f = fluxo, $ = id => document.getElementById(id);
  const on = (id, fn) => { const el=$(id); if(el) el.onclick=fn; };
  document.querySelectorAll("[data-aqvolta]").forEach(b=>b.onclick=()=>{ f.msg="";
    const volta = {2:1, 3:2, 4:(f.futuros&&f.futuros.length?3:2), 5:4, 6:5}; f.etapa = volta[f.etapa]||1; pintarFluxo(); });
  const busca = $("aq-busca");
  if(busca){ busca.focus(); busca.setSelectionRange(busca.value.length, busca.value.length);
    // F250e · a cada letra só a lista de sugestões muda: repintar a janela inteira fazia a tela piscar em branco
    busca.oninput = () => { f.busca = busca.value; const box = document.querySelector(".aq-fluxo .aq-sug"); if(box){ box.innerHTML = sugAgendaHtml(f); ligarSugAgenda(f); } }; }
  ligarSugAgenda(f);
  const tel = $("aq-tel"); if(tel) tel.oninput = () => { mascararTel(tel);
    if(f.novo){ f.tel = tel.value.replace(/\D/g,""); const box = $("aq-tel-de"); if(box){ box.innerHTML = telJaCadastrado(f); ligarTelJa(f); }
      const seg = $("aq-seg2"); if(seg) seg.textContent = clientesDoTelefone(f.tel).length ? "É outra pessoa, continuar" : "Continuar"; } };
  ligarTelJa(f);
  // F554 · quem já veio antes: o aviso segue o nome digitado
  const nomeAq = $("aq-nome"); if(nomeAq) nomeAq.onchange = () => { f.nome = nomeAq.value.replace(/\s+/g," ").trim();
    const box = $("aq-ja"); if(box) box.innerHTML = htmlAtend(atendimentosDe({nome:f.nome}), "aq"); };
  on("aq-corrigir", ()=>{ f.corrigir=true; pintarFluxo(); });
  // F477 · a agenda aberta pela conversa já traz o cliente dela; quem escreve pode pedir por outra pessoa
  on("aq-trocar", ()=>{ f.cli=null; f.novo=false; f.nome=""; f.busca=""; f.corrigir=false; f.etapa=1; f.msg=""; pintarFluxo(); });
  on("aq-seg2", async ()=>{
    if(f.novo){ f.nome = ($("aq-nome").value||"").replace(/\s+/g," ").trim(); }
    if($("aq-tel")) f.tel = $("aq-tel").value.replace(/\D/g,"");
    if(f.novo && (f.nome.length<5 || !f.nome.includes(" "))){ f.msg="Informe o nome completo."; return pintarFluxo(); }
    if(!/^\d{10,11}$/.test(f.tel)){ f.msg="Telefone inválido. Informe DDD e número."; return pintarFluxo(); }
    // a correção do telefone vai para o cadastro do cliente
    if(!f.novo && f.tel!==(f.cli.telefone||"").replace(/\D/g,"")){
      try{ await gravarTelefoneAgenda(f.cli, f.tel); }
      catch(e){ f.msg="Não gravou o telefone no cadastro: "+String(e.message||e).slice(0,80); return pintarFluxo(); }
    }
    f.msg=""; f.corrigir=false;
    try{ const r = await agendaApi("agendamentosFuturos", f.cli ? {clienteId:f.cli.id} : {telefone:f.tel}); f.futuros = r.agendamentos||[]; }
    catch(e){ f.futuros = []; }
    f.etapa = f.futuros.length ? 3 : 4; pintarFluxo();
  });
  on("aq-remarcar-esse", ()=>{ const ev=f.futuros[0]; fluxo=null; abrirFluxoAgenda({remarcar:{...ev, nome:ev.nome||f.nome, telefone:f.tel}}); });
  on("aq-seguir", ()=>{ f.etapa=4; pintarFluxo(); });
  document.querySelectorAll("[data-aqacomp]").forEach(b=>b.onclick=()=>{ f.acomp=b.dataset.aqacomp; pintarFluxo(); });
  on("aq-seg4", async ()=>{ f.etapa=5; pintarFluxo(); if(!agq.cache[f.prof]){ await carregarAgenda(f.prof); pintarFluxo(); } });
  document.querySelectorAll("[data-aqfprof]").forEach(b=>b.onclick=async()=>{ f.prof=b.dataset.aqfprof; f.data=null; f.inicio=null; pintarFluxo();
    if(!agq.cache[f.prof]){ await carregarAgenda(f.prof); } if(fluxo===f && f.etapa===5) pintarFluxo(); });
  document.querySelectorAll("[data-aqdata]").forEach(b=>b.onclick=()=>{ f.data=b.dataset.aqdata; f.inicio=null; f.eventoId=null; f.livre=false; pintarFluxo(); });
  document.querySelectorAll("[data-aqhora]").forEach(b=>b.onclick=()=>{ f.inicio=b.dataset.aqhora; f.livre=false;
    f.eventoId = b.dataset.aqvev || null; if(b.dataset.aqtipo) f.tipo = b.dataset.aqtipo; pintarFluxo(); });   // F250 · a vaga leva o tipo dela
  // F309 · o horário livre (fora das vagas), só do administrador: o Apps Script confere de novo
  on("aq-lusar", ()=>{ const d=$("aq-ldata").value, h=$("aq-lhora").value;
    if(!d || !h){ f.msg="Informe a data e o horário."; return pintarFluxo(); }
    Object.assign(f, {data:d, inicio:h, eventoId:null, livre:true, sobrepor:false, msg:""}); pintarFluxo(); });
  on("aq-seg5", async ()=>{ if(!f.remarcar){ f.etapa=6; return pintarFluxo(); } await gravarFluxo(); });
  const o1=$("aq-o1"), o2=$("aq-o2"), obs=$("aq-obs");
  if(o1) o1.onchange=()=>{ f.o1=o1.checked; $("aq-gravar").disabled=!orientou(f); };
  if(o2) o2.onchange=()=>{ f.o2=o2.checked; $("aq-gravar").disabled=!orientou(f); };
  if(obs) obs.oninput=()=>{ f.obs=obs.value; };
  on("aq-gravar", ()=>gravarFluxo());
  on("aq-espera", ()=>{ const g = {cli:f.cli||f.preCli, nome:f.nome, tel:f.tel, tipo:f.tipo, prof:f.prof}; fluxo=null; fecharCaixa(); incluirEspera(g); });
  on("aq-copiar", async ()=>{ try{ await navigator.clipboard.writeText(msgAgendaWhats(f.nome, f.feito.data, f.feito.inicio, f.tipo, f.prof)); }catch(e){} aviso("Mensagem copiada", false); });
  on("aq-naconversa", ()=>{ const t = $("zap-txt"); if(!t) return; t.value = msgAgendaWhats(f.nome, f.feito.data, f.feito.inicio, f.tipo, f.prof);
    t.dispatchEvent(new Event("input", {bubbles:true})); fecharCaixa(); t.focus(); });
  on("aq-segunda", ()=>{ const e=f.feito; fecharCaixa(); abrirFluxoAgenda({data:e.data, prof:f.prof, sugerir:{depoisDe:e.fim}}); });
}
async function gravarFluxo(){
  const f = fluxo, bt = document.getElementById(f.remarcar?"aq-seg5":"aq-gravar");
  if(bt){ bt.disabled = true; bt.textContent = "Gravando…"; }
  try{
    let r;
    if(f.remarcar){
      r = await agendaApi("remarcar", {eventId:f.remarcar.id, profissional:f.prof, data:f.data, inicio:f.inicio, eventoId:f.eventoId||"", foraDaVaga:!!f.livre, sobrepor:!!f.sobrepor});
    } else {
      // primeiro atendimento: o pré-cadastro nasce antes, para o evento já levar o cliente
      if(f.novo && !f.preCli){
        const nota = {em:new Date().toISOString(), quem:(eu.nome||"").split(" ")[0], autor_id:eu.id, texto:"Primeiro atendimento agendado pela agenda de quarta."};
        const [c] = await api(`/rest/v1/clientes`,{method:"POST",headers:{Prefer:"return=representation"},
          body:JSON.stringify({nome:f.nome, telefone:f.tel, campos:{primeiro_atendimento:"agendado", atendimento:[nota]}})});
        c._ix = dsa(c.nome+" "+(c.telefone||"")); c._nome_ix = dsa(c.nome);
        D.clientes.push(c); D.cliPorId.set(c.id, c); f.preCli = c;
      }
      const cli = f.cli || f.preCli;
      r = await agendaApi("agendar", {profissional:f.prof, tipo:f.tipo, nome:f.nome, telefone:f.tel, clienteId:cli?cli.id:"",
        data:f.data, inicio:f.inicio, eventoId:f.eventoId||"", observacoes:f.obs, orientacoesConfirmadas: orientou(f), foraDaVaga:!!f.livre, sobrepor:!!f.sobrepor});
    }
    const ev = r.evento; f.feito = ev; f.msg = "";
    // F422af · agendado para o mesmo dia já fica confirmado na agenda (pedido do Paulo, 09.11.2026)
    if(ev && ev.data===hoje() && !ev.confirmado){ const rc = await agendaApi("confirmar",{eventId:ev.id}).catch(()=>null); if(rc && rc.evento) f.feito = rc.evento; }
    if(f.remarcar){ agq.liberada = {id:f.remarcar.id, data:f.remarcar.data}; registrarLiberada(f.remarcar); }   // F456, F527
    if(f.espera){ const o = ((agq.espera||[]).find(x=>x.id===f.espera)||{}).ofertas||[];
      if(o.length) o[o.length-1] = {...o[o.length-1], resposta:"aceitou", resp_em:new Date().toISOString()};
      await mudarEspera(f.espera, {estado:"agendado", ofertas:o}).catch(()=>{}); }
    const c = f.cli || f.preCli || clienteDoEvento(ev);
    if(c) await registrarAgendaNoCliente(c, `Atendimento presencial com ${nomeProf(f.prof)} ${f.remarcar?"remarcado para":"agendado para"} ${dataBR(ev.data)} às ${hmTxt(ev.inicio)} (${f.tipo}), por ${(eu.nome||"").split(" ")[0]}.`,
      {eventId:ev.id, data:ev.data, inicio:ev.inicio, tipo:f.tipo, profissional:f.prof});
    if(agq.prof===f.prof) agq.sel = ev.data;
  }catch(e){
    f.msg = e.message;
    // F309b · horário livre que bate com outro atendimento: o administrador confirma e agenda junto
    if(e.codigo==="SOBREPOSICAO" && f.livre && !f.sobrepor && confirm(`${e.message} Agendar mesmo assim?`)){ f.sobrepor = true; f.msg = ""; return gravarFluxo(); }
    if(e.codigo==="SOBREPOSICAO"){ f.sobrepor = false; f.etapa = 5; }
    if(e.codigo==="HORARIO_INDISPONIVEL"){ f.inicio=null; f.eventoId=null; f.livre=false; f.etapa=5; await carregarAgenda(f.prof); }
  }
  pintarFluxo();
  await carregarAgenda(f.prof); if(f.prof!==agq.prof) await carregarAgenda(); if(f.prof!=="paulo") await carregarAgenda("paulo");
  montarSidebar(); if(visao==="agendaq") pintarAgenda();
  juntarCompleta(); if(zag.desde) zagBuscar(zag.desde); else pintarAgendaZap();
}

// ── atalhos de teclado ────────────────────────────────────────────────────
// Ctrl+F (ou ⌘F) e "/" levam à pesquisa; Esc fecha o que estiver aberto.
function irParaPesquisa(){
  const app=document.getElementById("app");
  app.classList.add("busca-aberta"); aplicarMenu();
  const b=document.getElementById("busca"); b.focus(); b.select();
}
function digitando(){
  const a=document.activeElement, tag=(a&&a.tagName)||"";
  return tag==="INPUT" || tag==="TEXTAREA" || tag==="SELECT" || (a&&a.isContentEditable);
}
document.addEventListener("keydown",e=>{
  const busca=document.getElementById("busca");
  // 11.92 · VCP-02: o item do menu (div com role="button") abre com Enter e Espaço, como um botão
  if((e.key==="Enter" || e.key===" ") && e.target.matches && e.target.matches('.lista-item[role="button"]')){ e.preventDefault(); return e.target.click(); }
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==="f" && busca){
    e.preventDefault(); return irParaPesquisa();          // no lugar do localizar do navegador
  }
  if(e.key==="/" && !e.ctrlKey && !e.altKey && !e.metaKey && !digitando() && busca){
    e.preventDefault(); return irParaPesquisa();
  }
  // F14 · a lista anda com o teclado, mas só com a ficha fechada: dentro dela
  // as setas pertencem ao texto que se está escrevendo
  if(!digitando() && !clienteAberto && atalhoDeLista(e)) return;
  if(e.key==="?" && !digitando()){ e.preventDefault(); return janelaAtalhos(); }
  if(atalhoGeral(e)) return;
  if(e.key==="Escape"){
    // "aberto" é ter conteúdo e não estar escondido — caixa() abre com
    // display:"" e o teste antigo ("block") deixava o Esc passar reto e
    // fechar a FICHA por trás do modal, com o modal ainda na tela
    const modal=document.getElementById("modal");
    if(modal && modal.innerHTML && modal.style.display!=="none") return fecharCaixa();
    if(busca && busca.value){ busca.value=""; buscaTxt="";
      document.getElementById("busca-x").style.display="none"; return render(); }
    if(document.activeElement===busca) return busca.blur();
    if(digitando()) return document.activeElement.blur();   // Esc no campo só tira o foco
    if(clienteAberto) return fecharFicha();
    // F827 · no computador, Esc com a conversa aberta fecha a conversa (o painel do cliente tem o próprio Esc)
    if(zapAberta && !_pcli && !modalAberto() && document.getElementById("zap-dir") && !document.getElementById("app").classList.contains("celular")) return voltarListaZap();
  }
});
// ══════════════════════════════════════════════════════════════════════════
// F14 · O TECLADO, COMO NO TO DO
// ══════════════════════════════════════════════════════════════════════════
// Trabalhar a fila do dia exigia mouse para tudo. Agora a lista do meio anda
// com as setas, Enter abre a ficha, Espaço conclui a tarefa daquele caso e N
// põe o cursor na linha de acrescentar. Só vale com a ficha FECHADA: dentro
// dela as setas pertencem ao texto que se está escrevendo.
let cursorLista = -1;
function cartoesDaLista(){
  return [...document.querySelectorAll("#conteudo-meio .cartao[data-cli]")];
}
function pintarCursor(){
  const cs = cartoesDaLista();
  // 11.92 · VCP-03: o leitor de tela sabe qual linha o cursor marca
  cs.forEach((el,i)=>{ el.classList.toggle("no-cursor", i===cursorLista);
    if(i===cursorLista) el.setAttribute("aria-current","true"); else el.removeAttribute("aria-current"); });
  const alvo = cs[cursorLista];
  if(alvo) alvo.scrollIntoView({block:"nearest"});
}
function moverCursor(passo){
  const cs = cartoesDaLista();
  if(!cs.length) return false;
  cursorLista = cursorLista < 0 ? (passo > 0 ? 0 : cs.length-1)
                                : Math.max(0, Math.min(cs.length-1, cursorLista + passo));
  pintarCursor();
  return true;
}
// a tarefa daquele caso que é MINHA e está aberta. Uma só: com duas, o Espaço
// estaria escolhendo por mim qual das duas dar por feita.
function minhaTarefaDoCartao(cliId){
  const ks = D.casosDoCliente.get(cliId) || [];
  const minhas = ks.flatMap(k=>(D.tarefasPorCaso.get(k.id)||[])
    .filter(t=>!t.concluida_em && t.colaborador_id===eu.id));
  return minhas.length===1 ? minhas[0] : null;
}
function atalhoDeLista(e){
  if(e.ctrlKey || e.metaKey || e.altKey) return false;
  if(e.key==="ArrowDown"){ e.preventDefault(); return moverCursor(1); }
  if(e.key==="ArrowUp"){ e.preventDefault(); return moverCursor(-1); }
  const cs = cartoesDaLista();
  if(!cs.length || cursorLista < 0 || !cs[cursorLista]) return false;
  const cliId = cs[cursorLista].dataset.cli;
  if(e.key==="Enter"){ e.preventDefault(); abrirFicha(cliId); return true; }
  if(e.key===" "){
    e.preventDefault();
    const t = minhaTarefaDoCartao(cliId);
    if(!t){ aviso("Sem tarefa sua em aberto neste caso, ou há mais de uma — abra a ficha", false); return true; }
    concluirDeVez(t.id);
    return true;
  }
  return false;
}
function janelaAtalhos(){
  const linhas=[["↑ ↓","andar pelos cartões da lista"],["Enter","abrir a ficha do cartão"],
    ["Espaço","concluir a sua tarefa daquele caso"],["N","escrever na linha de acrescentar"],
    ["/ ou Ctrl+F","ir para a pesquisa"],["Ctrl+K","paleta: listas, ações e clientes"],
    ["N","anotação rápida (com a ficha aberta, para este cliente)"],
    ["G e D","ir ao Meu Dia"],["G e P","ir ao Planejado"],["Esc","fechar o que estiver aberto"],
    ["?","esta lista"]];
  caixa(`<h3>Atalhos de teclado</h3>
    <p class="meio-sub">As setas, Enter e Espaço valem na lista, com a ficha fechada. Dentro de um campo de texto
      o teclado é do texto. No celular não há atalhos.</p>
    <div class="atalhos">${linhas.map(([k,r])=>
      `<div><kbd>${esc(k)}</kbd><span>${esc(r)}</span></div>`).join("")}</div>`);
}

// F451 (12.92) · Ctrl+K e os atalhos de uma tecla, como no Todoist, só no computador
let _gEm = 0;
const caixaAberta = () => { const m = document.getElementById("modal"); return !!(m && m.innerHTML && m.style.display!=="none"); };
const podeRapida = () => !!document.getElementById("fab-rapida")?.getClientRects().length;   // fixo: offsetParent é sempre nulo   // o nível que não tem o ⚡ não tem o N
function atalhoGeral(e){
  if(celular()) return false;
  if((e.ctrlKey||e.metaKey) && !e.altKey && e.key.toLowerCase()==="k"){ e.preventDefault(); abrirPaleta(); return true; }
  if(e.ctrlKey || e.metaKey || e.altKey || digitando() || caixaAberta() || document.getElementById("paleta")) return false;
  const t = e.key.toLowerCase();
  if(_gEm && Date.now()-_gEm < 1200 && (t==="d" || t==="p")){ _gEm = 0; e.preventDefault(); irPara(t==="d" ? "meudia" : "planejado"); return true; }
  _gEm = t==="g" ? Date.now() : 0;
  if(t==="g"){ e.preventDefault(); return true; }
  if(t==="n" && podeRapida()){ e.preventDefault(); anotacaoRapida(null, clienteAberto || undefined); return true; }
  return false;
}
function itensPaleta(q){
  const n = s => semAcento(String(s||"")).toLowerCase(), qq = n(q).trim(), dq = soDig(q);
  const vistos = new Set(), listas = [...document.querySelectorAll(".lista-item[data-v]")].filter(el=>!el.closest("[hidden]") && !vistos.has(el.dataset.v) && vistos.add(el.dataset.v))
    .map(el=>({tipo:"Lista", rot:el.getAttribute("aria-label")||el.textContent.trim(), ir:()=>el.click()}));
  const acoes = [
    podeRapida() && {tipo:"Ação", rot:"Anotação rápida", ir:()=>anotacaoRapida()},
    document.getElementById("btn-novo-cli") && {tipo:"Ação", rot:"Novo cliente", ir:()=>document.getElementById("btn-novo-cli").click()},
    {tipo:"Ação", rot:"Pesquisar", ir:irParaPesquisa},
    {tipo:"Ação", rot:"Atalhos de teclado", ir:janelaAtalhos},
  ].filter(Boolean);
  const casa = i => !qq || n(i.rot).includes(qq);
  const clientes = qq.length < 2 && dq.length < 3 ? [] : (D.clientes||[]).filter(c=>ehClienteDaLista(c) && (n(c.nome).includes(qq) || (dq.length>=3 && soDig(c.cpf).includes(dq))))
    .slice(0, 8).map(c=>({tipo:"Cliente", rot:c.nome, ir:()=>abrirFicha(c.id)}));
  return [...acoes.filter(casa), ...listas.filter(casa), ...clientes].slice(0, 14);
}
let _palIt = [], _palI = 0;
function abrirPaleta(){
  if(document.getElementById("paleta")) return document.querySelector("#paleta input").focus();
  const d = document.createElement("div"); d.id = "paleta"; d.setAttribute("role","dialog"); d.setAttribute("aria-label","Paleta de comandos");
  d.innerHTML = `<div class="pal-caixa"><input type="text" placeholder="Lista, ação ou cliente" autocomplete="off" aria-label="procurar lista, ação ou cliente" aria-controls="pal-lista">
    <ul id="pal-lista" role="listbox"></ul><p class="pal-pe">↑ ↓ escolhem · Enter abre · Esc fecha</p></div>`;
  document.body.appendChild(d);
  const inp = d.querySelector("input");
  d.onclick = e=>{ if(e.target===d) fecharPaleta(); };
  inp.oninput = ()=>pintarPaleta(inp.value, 0);
  inp.onkeydown = e=>{
    if(e.key==="Escape"){ e.preventDefault(); e.stopPropagation(); return fecharPaleta(); }
    if(e.key==="ArrowDown" || e.key==="ArrowUp"){ e.preventDefault(); return pintarPaleta(inp.value, Math.max(0, Math.min(_palIt.length-1, _palI + (e.key==="ArrowDown"?1:-1)))); }
    if(e.key==="Enter"){ e.preventDefault(); usarPaleta(_palI); }
  };
  pintarPaleta("", 0); inp.focus();
}
