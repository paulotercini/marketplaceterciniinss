// F436 · IDEIAS DO TIIMO (propostas 1, 3 e 4 aprovadas pelo Paulo em 07.11.2026)
// 3 · o Hoje do Meu Dia por período: perícia, audiência e o atendimento da 📅 Agenda na hora deles; prazo e retorno em
// "A qualquer hora". Sem nada com hora, o Hoje fica como era (agrupado por cliente)
let _mdAgPedida = false;
function atendimentosHoje(quem){
  const p = dsa(((D.colPorId.get(quem)||{}).nome||"").split(" ")[0]);
  if(!PROFS_AGENDA.includes(p)) return [];
  const r = agq.cache[p];
  // shortcut: a agenda do Google se lê uma vez por sessão ao abrir o Meu Dia; o atendimento marcado depois aparece ao abrir a 📅 Agenda
  if(!r){ if(!_mdAgPedida && !agq.carregando[p]){ _mdAgPedida = true;
    carregarAgenda(p).then(x=>{ if(x && visao==="meudia" && !clienteAberto) render(); }).catch(()=>{}); } return []; }
  const d = (r.dias||[]).find(x=>x.data===hoje());
  return ((d && d.eventos)||[]).filter(e=>e.atendimento && !e.vaga).map(e=>({atend:true, hora:e.inicio||"", tipo:e.tipo, cli:clienteDoEvento(e),
    nome:String(e.nome||e.titulo||"").replace(/^\s*00[12]\s*-\s*/,"")}));
}
function linhaAtendimento(a){
  return `<div class="cartao ag-linha md-atend"${a.cli?` data-cli="${a.cli.id}"`:""}><span class="ag-slot"></span><span class="ag-data hoje">${esc(a.hora)}</span>
    <div class="ag-txt"><b>${esc(a.cli ? a.cli.nome : a.nome || "Atendimento")}</b><span class="ag-res"> · atendimento ${esc(a.tipo||"")}</span></div>
    <span class="ag-selos"><span class="ag-tipo">Atendimento</span></span><span class="acoes">${estrelaDaLinha(null, null, a.cli)}</span></div>`;
}
const horaDoItem = it => it.atend ? it.hora : it.ev && it.ev.data_hora ? horaSP(it.ev.data_hora) : "";
// "Manhã e tarde" ou "Sem divisão": a escolha fica no navegador (crm_periodos) e o menu ⋯ da lista a troca
const periodosLigados = () => opcLista("per")!=="nao";
// F437 · O MENU ⋯ DAS LISTAS (proposta C, aprovada pelo Paulo em 08.11.2026): Agrupar, Ordenar, Visualizar e Períodos,
// como no Microsoft To Do. Cada escolha fica no navegador, por lista ("crm_ordem:fase:inss"); a lista sem escolha usa a última feita em qualquer uma
const OPC_LISTA = {
  agrupar: ["crm_agrupar", [["data","Data"],["lista","Lista"],["resp","Responsável"],["esp","Espécie"]]],
  ordem: ["crm_ordem", [["prazo","Data"],["alfa","Nome"],["imp","Importante"]]],
  vis: ["crm_vis", [["compacta","Compacta"],["cartoes","Cartões"]]],
  per: ["crm_periodos", [["sim","Manhã e tarde"],["nao","Sem divisão"]]],
};
const opcLista = q => { const [ch, ops] = OPC_LISTA[q], v = ler(ch+":"+visao) || ler(ch); return ops.some(o=>o[0]===v) ? v : ops[0][0]; };
function pintarOpcLista(){
  const el = document.getElementById("lista-opc"); if(!el) return;
  const agenda = visao==="meudia" || visao==="planejado", fase = String(visao).startsWith("fase:");
  // Agrupar: no Meu Dia a data e o período mandam; numa lista de fase, agrupar pela própria lista não divide nada
  const linhas = [["agrupar", "Agrupar", visao==="planejado" || fase || ["minhas","importante"].includes(visao), fase ? ["lista"] : []],
    ["ordem", "Ordenar", true, []], ["vis", "Visualizar", temaV10(), []], ["per", "Períodos", agenda, []]];
  el.innerHTML = linhas.filter(l=>l[2]).map(([q, rot, , fora])=>`<div class="lo-ln"><span>${rot}</span><div class="lo-seg" role="group" aria-label="${rot}">${
    OPC_LISTA[q][1].filter(o=>!fora.includes(o[0])).map(([v, r])=>`<button type="button" data-lopc="${q}" data-v="${v}" aria-pressed="${opcLista(q)===v}">${r}</button>`).join("")}</div></div>`).join("");
  // F448 · Salvar guarda a lista com estas escolhas e os filtros num item do menu lateral; Excluir tira a visão salva aberta
  const sv = visoesSalvas().find(x=>x.id===_salvaAtiva && x.visao===visao);
  el.innerHTML += `<div class="lo-ln"><span>Visão</span><div class="lo-seg" role="group" aria-label="Visão salva"><button type="button" onclick="event.stopPropagation();salvarVisao()" title="guardar esta lista, com as escolhas acima e os filtros, no menu lateral"><span aria-hidden="true">Salvar</span><span class="sr-only">Salvar esta visão</span></button>${
    sv ? `<button type="button" onclick="event.stopPropagation();excluirVisaoSalva('${sv.id}')" title="tirar &quot;${esc(sv.nome)}&quot; do menu lateral"><span aria-hidden="true">Excluir</span><span class="sr-only">Excluir a visão salva ${esc(sv.nome)}</span></button>` : ""}</div></div>`;
  el.querySelectorAll("[data-lopc]").forEach(b=>b.onclick=e=>{ e.stopPropagation();
    const q = b.dataset.lopc; guardar(OPC_LISTA[q][0]+":"+visao, b.dataset.v); guardar(OPC_LISTA[q][0], b.dataset.v);
    if(q==="ordem") document.getElementById("ordem").value = b.dataset.v;
    limAg = {}; render(); });
  if(temaV10()) document.getElementById("ordem").value = opcLista("ordem");
  const cm = document.getElementById("conteudo-meio"); if(cm) cm.classList.toggle("vis-cartoes", temaV10() && opcLista("vis")==="cartoes");
}
// F448 · VISÕES SALVAS (etapa 4 das ideias do Todoist, 08.11.2026): a lista, as escolhas do ⋯ e os filtros (pessoa do Meu Dia,
// pessoa das listas, natureza do Planejado) num item do menu lateral. Fica no navegador (crm_visoes), como as escolhas do ⋯
let _salvaAtiva = null;
function visoesSalvas(){ try{ const l = JSON.parse(ler("crm_visoes")||"[]"); return Array.isArray(l) ? l : []; }catch(e){ return []; } }
const rotDaVisao = v => (document.querySelector(`.lista-item[data-v="${ehAbaPlan(v) ? "planejado" : v}"] .txt`)||{}).textContent || "Lista";
function salvarVisao(){
  document.getElementById("topo-mais")?.removeAttribute("open");
  const fil = [filtroDia || filtroColab ? "a pessoa escolhida" : "", visao==="planejado" && filtroPlanNat ? "a natureza escolhida" : ""].filter(Boolean);
  caixa(`<h3 style="margin:0 0 6px">Salvar esta visão</h3>
    <p class="meio-sub">${esc(rotDaVisao(visao))}, com a ordem, o agrupamento e a visualização escolhidos${fil.length ? `, e ${fil.join(" e ")}` : ""}. Fica no menu lateral, em Visões salvas, neste navegador.</p>
    <input id="vs-nome" maxlength="40" value="${esc(rotDaVisao(visao))}" aria-label="Nome da visão" style="width:100%;margin:6px 0 10px" onkeydown="if(event.key==='Enter')gravarVisao()">
    <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn-mini" onclick="fecharCaixa()">Cancelar</button><button class="btn-mini forte" onclick="gravarVisao()">Salvar</button></div>`);
  setTimeout(()=>{ const i = document.getElementById("vs-nome"); if(i){ i.focus(); i.select(); } }, 30);
}
function gravarVisao(){
  const nome = (document.getElementById("vs-nome")?.value||"").trim();
  if(!nome) return aviso("Dê um nome à visão");
  const op = {}; Object.keys(OPC_LISTA).forEach(q=>op[q] = opcLista(q));
  const v = {id: "v"+Date.now().toString(36), nome, visao, op, dia: filtroDia, colab: filtroColab, nat: visao==="planejado" ? filtroPlanNat : ""};
  guardar("crm_visoes", JSON.stringify([...visoesSalvas(), v]));
  _salvaAtiva = v.id; fecharCaixa(); montarSidebar(); pintarOpcLista();
  aviso(`"${nome}" está no menu lateral, em Visões salvas`, false);
}
function abrirVisaoSalva(id){
  const v = visoesSalvas().find(x=>x.id===id); if(!v) return;
  Object.keys(OPC_LISTA).forEach(q=>{ if(v.op && v.op[q]) guardar(OPC_LISTA[q][0]+":"+v.visao, v.op[q]); });
  filtroDia = v.dia ?? null; filtroColab = v.colab ?? null; filtroPlanNat = v.nat || "";
  _salvaAtiva = id; limAg = {}; fecharMenuCel(); irPara(v.visao);
}
function excluirVisaoSalva(id){
  const l = visoesSalvas(), v = l.find(x=>x.id===id); if(!v) return;
  guardar("crm_visoes", JSON.stringify(l.filter(x=>x.id!==id)));
  if(_salvaAtiva===id) _salvaAtiva = null;
  montarSidebar(); pintarOpcLista();
  avisoDesfazer(`"${v.nome}" saiu de Visões salvas`, ()=>{ guardar("crm_visoes", JSON.stringify([...visoesSalvas(), v])); montarSidebar(); pintarOpcLista(); });
}
// a chave de cada agrupamento: no Planejado sai do item da agenda, na lista de clientes do primeiro caso
const chaveGrupo = (q, k, quem) => q==="lista" ? (k ? semEmoji(listaDe(k)).trim() || NOME_FASE[k.fase] || "Sem lista" : "Sem caso")
  : q==="resp" ? ((quem||[])[0] ? quem[0].nome : "Sem responsável") : (k && k.especie) || "Sem espécie";
function emGrupos(lista, chave, pinta){
  const g = new Map(); lista.forEach(x=>{ const c = chave(x); if(!g.has(c)) g.set(c, []); g.get(c).push(x); });
  return [...g].sort((a,b)=>a[0].localeCompare(b[0],"pt")).map(([c, xs])=>
    `<section class="pl-grupo"><h3 class="secao">${esc(c)} <span class="pl-n">${xs.length}</span></h3>${xs.map(pinta).join("")}</section>`).join("");
}
function hojePorPeriodo(g, ats, planej){
  const solto = l => planej ? l.map(linhaAgenda).join("") : porClienteDia(l);
  const m = [], t = [], q = [];
  [...g, ...ats].forEach(it=>{ const h = horaDoItem(it); (!h ? q : h<"12:00" ? m : t).push(it); });
  if(!periodosLigados() || (!m.length && !t.length)) return solto(g) + ats.map(linhaAtendimento).join("");
  const lin = l => l.sort((a,b)=>horaDoItem(a).localeCompare(horaDoItem(b))).map(x=>x.atend ? linhaAtendimento(x) : linhaAgenda(x)).join("");
  return [["Manhã", m], ["Tarde", t]].filter(([,l])=>l.length).map(([r,l])=>`<h4 class="md-per">${r}</h4>${lin(l)}`).join("")
    + (q.length ? `<h4 class="md-per">A qualquer hora</h4>${solto(q)}` : "");
}
// 4 · o tempo estimado pela natureza do item e a conta do dia; a tabela se ajusta nas Configurações (config_app.dur_tarefas)
const DUR_TAREFAS = [["conferir","Conferir ou em análise",5,/confer|em an[aá]lise|verificar/i], ["juntada","Juntada",15,/junt/i],
  ["replica","Réplica ou impugnação",120,/r[ée]plica|impugna/i], ["recurso","Recurso ou apelação",180,/recurs|apela/i],
  ["evento","Perícia ou audiência",60,null], ["a001","Atendimento 001",45,null], ["a002","Atendimento 002",30,null], ["outro","Demais itens",15,null]];
function durTabela(){
  let o = {}; try{ o = JSON.parse(cfgApp("dur_tarefas")||"{}")||{}; }catch(e){}
  return DUR_TAREFAS.map(([id, rot, min, rx])=>({id, rot, rx, min: +o[id]>0 ? +o[id] : min}));
}
function minutosDe(it, tab = durTabela()){
  const m = id => tab.find(x=>x.id===id).min;
  if(it.atend) return m(String(it.tipo)==="002" ? "a002" : "a001");
  if(it.ev) return m("evento");
  const txt = [it.selo, it.resumo, it.t && it.t.titulo].filter(Boolean).join(" ");
  const r = tab.find(x=>x.rx && x.rx.test(txt)); return r ? r.min : m("outro");
}
const fmtMin = n => n<60 ? `${n} min` : `${Math.floor(n/60)} h${n%60 ? ` ${n%60} min` : ""}`;
// o concluído de hoje: as tarefas que a pessoa concluiu hoje (as de outra sessão vêm do banco, uma vez por dia) e os casos
// concluídos por hoje
let _feitosHoje = {dia:null, quem:null, ids:new Set()};
function feitosHoje(quem){
  const hj = hoje();
  if(_feitosHoje.dia!==hj || _feitosHoje.quem!==quem){ _feitosHoje = {dia:hj, quem, ids:new Set()};
    todas("andamento_tarefas", `select=id&colaborador_id=eq.${quem}&concluida_em=gte.${hj}T03:00:00Z`)
      .then(r=>{ if(!(r||[]).length) return; r.forEach(t=>_feitosHoje.ids.add(t.id)); if(visao==="meudia" && !clienteAberto) render(); }).catch(()=>{}); }
  const ids = new Set(_feitosHoje.ids);
  for(const ts of D.tarefasPorCaso.values()) ts.forEach(t=>{ if(t.colaborador_id===quem && t.concluida_em && dataSP(t.concluida_em)===hj) ids.add(t.id); });
  return ids.size + ativos().filter(k=>{ const d = (k.ronda||{}).despacho; return d && d.por===quem && d.em && dataSP(d.em)===hj; }).length;
}
function contaDoDia(its, ats, quem){
  const feitos = feitosHoje(quem), n = its.length + ats.length; if(!n && !feitos) return "";
  const tab = durTabela(), min = [...its, ...ats].reduce((s, i)=>s + minutosDe(i, tab), 0), pct = Math.round(100*feitos/(feitos+n));
  return `<div class="md-conta" role="group" aria-label="Conta do dia"><span><b>${n}</b> ${n===1?"item":"itens"} hoje</span><span><b>${feitos}</b> ${feitos===1?"concluído":"concluídos"}</span>`
    + (min ? `<span title="estimativa pela natureza de cada item; a tabela fica nas Configurações">cerca de <b>${fmtMin(min)}</b></span>` : "")
    + `<span class="md-barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${pct}% do dia concluído"><i style="width:${pct}%"></i></span></div>`;
}
// 1 · SUGERIDAS PARA HOJE: o que o CRM já sabe dos casos da pessoa e ninguém pôs no dia. Nada grava sozinho: Adicionar põe o
// caso no Meu Dia (o cliente sem caso abre a ficha), Dispensar a tira deste navegador. A chave leva o motivo, por isso a
// sugestão volta quando o motivo muda (outra etapa, outra data)
const sugFora = () => { try{ return new Set(JSON.parse(ler("crm_sug_fora")||"[]")); }catch(e){ return new Set(); } };
function sugeridasDoDia(quem){
  const hj = hoje(), fora = sugFora(), noDia = new Set(D.meudia.filter(m=>m.colaborador_id===quem).map(m=>m.caso_id)), out = [];
  const meu = k => donosDoCaso(k).includes(quem);
  const add = (ch, cli, k, txt, regra) => { if(cli && !fora.has(ch) && !(k && noDia.has(k.id) && !regra) && !out.some(s=>s.ch===ch)) out.push({ch, cli, k, txt, regra}); };
  for(const k of ativos()){
    if(ehPreCaso(k) || !meu(k)) continue;
    const cli = D.cliPorId.get(k.cliente_id);
    try{
      if(k.trilha && k.trilha.velha) add(`etapa:${k.id}:${k.etapa}`, cli, k, `Etapa “${k.etapa}” desatualizada: conferir a sugestão do caso`);
      const s = k.etapa && prazoDaEtapa(k);
      if(s && s.fatal>=hj && !(k.prazo && k.prazo>=hj) && !_pzEtapaFora.has(k.id+"|"+k.etapa))
        add(`pzetapa:${k.id}:${k.etapa}`, cli, k, `Criar o prazo da etapa: ${s.item.rot}, até ${fmt(s.fatal).slice(0,5)}`);
      const mo = prazoMora(k);
      if(mo && mo.vencido) add(`mora:${k.id}:${mo.data}`, cli, k, `Prazo de análise do INSS vencido em ${fmt(mo.data).slice(0,5)}: abrir a Ouvidoria`);
      if(k.resultado==="deferido" && propostaHonorarios(cli, k)) add(`hon:${k.id}`, cli, k, "Concessão: lançar os honorários do contrato");
    }catch(e){}
  }
  for(const k of ativos()){   // F441 · regras por etapa: a quem cuida do caso e a quem fará a tarefa
    let rs = []; try{ rs = regrasDoCaso(k); }catch(e){}
    for(const r of rs) if(meu(k) || alvosDaRegra(r, k).includes(quem))
      add(`regra:${k.id}:${r.id}:${k.etapa}`, D.cliPorId.get(k.cliente_id), k, `${r.tarefa} (etapa ${k.etapa})`, r.id);
  }
  for(const x of docsSemData()) if(meu(x.k)) add(`doc:${x.t.id}`, x.cli, x.k, `Documento pedido sem data: ${cortaFrase(x.nome, 60)}`);
  for(const r of direitoAlcancado()) if((advogadoDoCliente(r.cliente.id)||[]).includes(quem))
    add(`dir:${r.cliente.id}`, r.cliente, null, "Direito à aposentadoria alcançado: falar com o cliente");
  return out;
}
function secaoSugeridas(){
  if(!podeGravarCaso()) return "";
  let ss = []; try{ ss = sugeridasDoDia(eu.id); }catch(e){} if(!ss.length) return "";
  const lim = limAg["Sugeridas"]||6;
  return `<section class="pl-grupo md-sug" data-tom="sug"><h3 class="secao dica-tit" title="O que o CRM encontrou nos seus casos e ninguém pôs no dia. Nada é gravado sem o seu clique.">Sugeridas para hoje <span class="pl-n">${ss.length}</span></h3>`
    + ss.slice(0, lim).map(s=>`<div class="cartao ag-linha md-sug-l" data-cli="${s.cli.id}"><span class="ag-slot"></span>
      <div class="ag-txt"><b>${esc(s.cli.nome)}</b><span class="ag-res"> · ${esc(s.txt)}</span></div>
      <span class="acoes">${s.regra ? `<button class="btn-mini" data-sug-regra="${esc(s.regra)}" data-sug-caso="${s.k.id}" title="Criar a tarefa da regra desta etapa">Criar</button>` : `<button class="btn-mini" data-sug-add="${esc(s.ch)}" data-sug-caso="${s.k ? s.k.id : ""}" data-sug-cli="${s.cli.id}" title="${s.k ? "Pôr este caso no meu Meu Dia" : "Abrir a ficha"}">${s.k ? "Adicionar" : "Abrir"}</button>`}<button class="btn-mini md-sug-x" data-sug-fora="${esc(s.ch)}" aria-label="Dispensar a sugestão" title="Dispensar">✕</button>${estrelaDaLinha(s.k, null, s.cli)}</span></div>`).join("")
    + (ss.length>lim ? `<button class="btn-rap mais-plan" data-mais="Sugeridas">Mostrar mais ${ss.length-lim}</button>` : "") + `</section>`;
}
// F295 · o aviso das 8h: uma vez por dia útil, a partir das 8h, o que vence hoje e o que está vencido no meu dia
function avisoDas8(agora = agoraSP()){
  const hj = hoje();
  if(!ehDiaUtil(hj) || agora.toTimeString().slice(0,5) < "08:00" || ler("crm_aviso8")===hj) return null;
  guardar("crm_aviso8", hj);
  const its = itensAgenda(eu.id), nH = its.filter(i=>i.data===hj).length, nV = its.filter(i=>i.data<hj).length;
  const txt = `${nH} para hoje${nV ? ` e ${nV} ${nV===1?"vencida":"vencidas"}` : ""}`;
  const h = agora.getHours();
  aviso(`☀️ ${h<12 ? "Bom dia" : h<18 ? "Boa tarde" : "Boa noite"}. Meu Dia: ${txt}`, false);
  if(window.Notification && Notification.permission==="granted") try{
    const n = new Notification("☀️ Meu Dia · CRM", {body: txt, tag: "crm-aviso8"});
    n.onclick = ()=>{ window.focus(); irPara("meudia"); n.close(); };
  }catch(e){}
  return txt;
}
// F236 · a menção a mim no Meu Dia: quem citou, de qual cliente, o pedido; a caixa dá por lida
function linhaMencaoDia(m){
  const de = D.colPorId.get(m.de_id), k = m.caso_id && D.casoPorId.get(m.caso_id),
        c = (k && D.cliPorId.get(k.cliente_id)) || (m.cliente_id && D.cliPorId.get(m.cliente_id)) || null;
  const hj = hoje(), d = m.criado_em ? dataSP(m.criado_em) : hj;
  return `<div class="cartao ag-linha"${c?` data-cli="${c.id}"`:""}>
    <span class="ag-slot"><button class="check" data-menc-lida="${m.id}" aria-label="marcar como lida" title="lida — sai daqui e das Menções"></button></span>
    <span class="ag-data${d===hj?" hoje":""}">${d===hj?"hoje":`${d.slice(8,10)}/${d.slice(5,7)}`}</span>
    <div class="ag-txt"><b>${esc(c?c.nome:"Menção")}</b><span class="ag-res"> · ${de?`${esc(de.nome.split(" ")[0])}: `:""}${esc(resumoAgenda(m.texto, eu)||m.texto||"")}</span></div>
    <span class="acoes">${m.caso_id?botoesResposta(m):""}${estrelaDaLinha(k, null, c)}</span>
  </div>`;
}
// F378 · O PLANEJADO JUNTA AS VISÕES DE DATA (decisão do Paulo, 02.11.2026): Calendário, Perícias & Audiências e Tarefas com
// Prazo saem do menu e viram abas do Planejado; a 📅 Agenda (os atendimentos) continua à parte, para não se confundir com ele
const PLAN_ABAS = [["planejado","Lista","tudo o que tem data, por dia"],["calendario","Mês","o calendário do mês"],
  ["agenda","Perícias","perícias e audiências, futuras, a confirmar e passadas"],["fase:prazo","Casos","os casos da lista Tarefas com Prazo, pela data fatal"],
  ["pessoas","Pessoas","o que cada pessoa tem por dia nas próximas três semanas"]];
const ehAbaPlan = v => PLAN_ABAS.some(a=>a[0]===v);
function barraPlanejado(){
  const pode = visaoColab() ? listasDoColab() : null;
  const abas = PLAN_ABAS.filter(([v])=>!pode || pode.includes(v));
  const h = document.getElementById("titulo-lista"); if(h) h.textContent = "Planejado";
  const m = document.getElementById("conteudo-meio"); if(!m || m.querySelector(":scope > .plan-abas")) return;
  m.insertAdjacentHTML("afterbegin", `<div class="plan-abas" role="tablist" aria-label="Visões do Planejado">${abas.map(([v,r,t])=>
    `<button role="tab" aria-selected="${v===visao}" class="${v===visao?"on":""}" data-plan-aba="${v}" title="${esc(t)}">${r}</button>`).join("")}</div>`);
  m.querySelectorAll("[data-plan-aba]").forEach(b=>b.onclick=()=>{ if(b.dataset.planAba!==visao) irPara(b.dataset.planAba); });
}
// a natureza de cada item da Lista, para os filtros do alto
const PLAN_NAT = [["prazos","Prazos","prazos fatais, recursos, exigências e prazos dos tribunais"],["pericias","Perícias","perícias, audiências e julgamentos"],
  ["tarefas","Tarefas","tarefas das anotações e tarefas soltas"],["fila","Retornos","casos que voltam à fila (Concluir por hoje)"],["lembretes","Lembretes","lembretes, cards, honorários e o resto"]];
const natPlan = i => i.ev||i.evPassado||i.avisar||i.novEv||i.selo==="Pauta" ? "pericias" : i.selo==="Volta à fila"||i.selo==="Prazo do Microsoft To Do" ? "fila"
  : i.fatal||i.prazo ? "prazos" : i.tc||i.t||i.rotina ? "tarefas" : "lembretes";
let filtroPlanNat = "";
function alternarFabs(){ const a=document.getElementById("app"), on=a.classList.toggle("fabs-on"), b=document.getElementById("fab-juntos"); if(b){ b.textContent=on?"✕":"⋯"; b.setAttribute("aria-expanded", on); } if(!on && visao==="whatsapp" && zagAberta()) zagAlternar(); }
// F558 · os flutuantes se arrastam (mouse e toque); clique simples continua abrindo. Posição por aparelho, uma para o celular e outra para o computador.
const FAB_ARRASTA = ["fab-rapida","fab-sug","zap-ag","fab-juntos"];
const fabChave = () => "crm_fab_pos" + (document.getElementById("app")?.classList.contains("celular") ? "_cel" : "");
function fabLer(){ try{ return JSON.parse(localStorage.getItem(fabChave())||"{}")||{}; }catch(e){ return {}; } }
function fabGravar(p){ try{ localStorage.setItem(fabChave(), JSON.stringify(p)); }catch(e){} }
// aplica o deslocamento guardado sem deixar o botão sair da tela (translate não mexe nas regras de bottom/right de cada tela)
function fabPor(el, dx, dy){
  el.style.translate = "";
  const r = el.getBoundingClientRect();
  if(r.width){ dx = Math.min(Math.max(dx, 4 - r.left), innerWidth - 4 - r.right); dy = Math.min(Math.max(dy, 4 - r.top), innerHeight - 4 - r.bottom); }
  if(dx || dy) el.style.translate = `${Math.round(dx)}px ${Math.round(dy)}px`;
  return [dx, dy];
}
function fabArrumar(){ const p = fabLer(); FAB_ARRASTA.forEach(id=>{ const el = document.getElementById(id); if(el) fabPor(el, ...(p[id]||[0,0])); }); }
let _fabArr = null;
function ligarArrastoFabs(){
  FAB_ARRASTA.forEach(id=>{
    const el = document.getElementById(id); if(!el) return;
    el.addEventListener("pointerdown", e=>{
      if(e.button>0) return;
      // na agenda aberta, só o cabeçalho e a pílula arrastam: o resto é para clicar e digitar
      if(id==="zap-ag" && !e.target.closest(".zag-pilula,.zag-cab") || e.target.closest("input,select,textarea")) return;
      const ini = fabLer()[id]||[0,0];
      _fabArr = {el, id, x:e.clientX, y:e.clientY, ini, movido:false};
    });
  });
  addEventListener("pointermove", e=>{
    const a = _fabArr; if(!a) return;
    const dx = e.clientX - a.x, dy = e.clientY - a.y;
    if(!a.movido && Math.hypot(dx, dy) < 6) return;
    if(!a.movido){ a.movido = true; a.el.classList.add("fab-arrastando"); try{ a.el.setPointerCapture(e.pointerId); }catch(_){} }
    e.preventDefault();
    a.pos = fabPor(a.el, a.ini[0] + dx, a.ini[1] + dy);
  }, {passive:false});
  const soltar = ()=>{
    const a = _fabArr; _fabArr = null; if(!a || !a.movido) return;
    a.el.classList.remove("fab-arrastando");
    const p = fabLer(); p[a.id] = a.pos; fabGravar(p);
    // o clique que vem do soltar não abre a função
    const barra = ev=>{ ev.stopPropagation(); ev.preventDefault(); };
    addEventListener("click", barra, {capture:true, once:true});
    setTimeout(()=>removeEventListener("click", barra, {capture:true}), 300);
  };
  addEventListener("pointerup", soltar); addEventListener("pointercancel", soltar);
  addEventListener("resize", ()=>requestAnimationFrame(fabArrumar));
  const ag = document.getElementById("zap-ag"); if(ag) new MutationObserver(()=>requestAnimationFrame(fabArrumar)).observe(ag, {childList:true});
  new MutationObserver(()=>requestAnimationFrame(fabArrumar)).observe(document.getElementById("app"), {attributes:true, attributeFilter:["class"]});
  fabArrumar();
}
ligarArrastoFabs();
function irPara(v){ visao=v; _sel.clear(); zag.fora=false; limparBusca(); fecharFicha(false); montarSidebar(); render(); pintarAgendaZap(); if(document.getElementById("app")?.classList.contains("fabs-on")) alternarFabs(); }

// ── 🗓️ Planejado (a agenda: filtros por período e por colaborador) ────────
let filtroPlan="todas", filtroPlanColab=null;   // Planejado abre mostrando tudo, em seções
// o número da barra lateral tem de ser o mesmo que a tela conta, senão o menu
// promete uma agenda e a tela entrega outra
function quantosNoPlanejado(){
  if(temaV10()) return itensAgenda(null).length;
  return ativos().filter(k=>k.prazo || (D.tarefasPorCaso.get(k.id)||[]).some(t=>t.lembrar_em)
                              || prorrogarEm(k)).length
    + D.tarefas.filter(t=>!t.concluida && t.prazo).length
    + (D.lembretes||[]).filter(l=>l.ativo!==false && l.proximo_em).length;
}
let limPlan = {};   // F135 · quantos cartões cada seção do Planejado mostra
function renderPlanejado(){
  if(temaV10()) return renderAgendaV10("planejado");
  tituloLista("🗓️ Planejado");
  document.getElementById("sub-lista").textContent=
    "A agenda do escritório — tudo que tem data para lembrar (último dia de prazo, contato com cliente, prorrogação...).";
  const per=[["venc","Vencidas"],["hoje","Hoje"],["3","3 dias"],["7","7 dias"],["todas","Todas"]];
  const em = d=>{ const x=new Date(hoje()+"T12:00:00"); x.setDate(x.getDate()+d); return x.toLocaleDateString("sv"); };
  // a "data" de um caso no Planejado é a mais próxima entre o prazo do caso
  // e as tarefas de comentário — e o filtro por pessoa olha a tarefa DELA
  const dataDe = k => {
    const ts=(D.tarefasPorCaso.get(k.id)||[])
      .filter(t=>!filtroPlanColab || t.colaborador_id===filtroPlanColab);
    const dmin = ts.map(t=>t.lembrar_em).sort()[0];
    const doCaso = !filtroPlanColab || (D.atrDoCaso.get(k.id)||[]).includes(filtroPlanColab);
    const pz = doCaso ? k.prazo : null;
    // F115 · no Planejado o caso aparece no dia de PEDIR, não no dia de cessar
    const db = doCaso ? prorrogarEm(k) : null;
    return [dmin, pz, db].filter(Boolean).sort()[0] || null;
  };
  // F124 · O PLANEJADO É O DO TO DO: TODA DATA, NÃO SÓ A DO CASO (decisão do
  // Paulo, 20.09.2026). No To Do, Planejado reúne toda tarefa com data, venha
  // da lista que vier. Aqui entram as três origens que têm data, o caso, a
  // tarefa (inclusive o documento pedido ao cliente) e o lembrete — que é onde
  // moram as aposentadorias futuras desde a migração.
  const noPeriodo = d => filtroPlan==="venc" ? d<hoje()
    : filtroPlan==="hoje" ? d===hoje()
    : filtroPlan==="3" ? (d>=hoje() && d<=em(3))
    : filtroPlan==="7" ? (d>=hoje() && d<=em(7)) : true;
  const tCol = t => !filtroPlanColab || t.particular_de===filtroPlanColab || !t.particular_de;
  const tarefasPlan = [...D.tarefas.filter(t=>!t.concluida && t.prazo),
                       ...docsPreCasoComData()].filter(tCol)
    .filter(t=>noPeriodo(t.prazo)).sort((a,b)=>a.prazo<b.prazo?-1:1);
  // lembrete não tem dono; com o filtro por pessoa ligado, ele sai de cena
  const lembPlan = (filtroPlanColab ? [] : (D.lembretes||[])
    .filter(l=>l.ativo!==false && l.proximo_em && noPeriodo(l.proximo_em)))
    .sort((a,b)=>a.proximo_em<b.proximo_em?-1:1);
  let base = ativos().map(k=>{ k._dplan = dataDe(k); return k; })
    .filter(k=>k._dplan && noPeriodo(k._dplan));
  const chipsPer = per.map(([v,r])=>`<button class="fchip ${filtroPlan===v?"on":""}" data-per="${v}"${
    /^\d/.test(v)?` title="próximos ${v} dias"`:""} aria-pressed="${filtroPlan===v}">${r}</button>`).join("");
  const chipsCol = [`<button class="fchip ${filtroPlanColab===null?"on":""}" data-pcol="">Todos</button>`]
    .concat(equipeAtiva().map(c=>
      `<button class="fchip fchip-ini ${filtroPlanColab===c.id?"on":""}" data-pcol="${c.id}" title="${esc(c.nome)}">`+
      `<span class="avatar mini" style="background:${c.cor}">${esc(c.inicial)}</span></button>`)).join("");
  base = base.slice().sort((a,b)=>a._dplan<b._dplan?-1:1);
  document.getElementById("ordem").value="prazo";   // agenda em ordem cronológica
  // seções estilo To Do: vencidas → hoje → amanhã → semana → mais tarde
  // F144 · cada seção é um bloco com faixa de cor no cabeçalho (vermelho
  // para o que venceu, âmbar para hoje, neutro para o resto)
  const secoes=[
    ["Vencidas",           d=>d<hoje(),                "venc"],
    ["Hoje",               d=>d===hoje(),              "hoje"],
    ["Amanhã",             d=>d===em(1),               ""],
    ["Próximos sete dias", d=>d>em(1) && d<=em(7),     ""],
    ["Mais tarde",         d=>d>em(7),                 ""],
  ];
  const total = base.length + tarefasPlan.length + lembPlan.length;
  document.getElementById("conteudo-meio").innerHTML =
    `<div class="filtros seg-per" role="group" aria-label="Período">${chipsPer}</div><div class="filtros">${chipsCol}</div>`
    + `<div class="meio-sub">${total} ${total===1?"data":"datas"} neste filtro · casos, tarefas e lembretes</div>`
    + secoes.map(([tit,f,tom])=>{
        const g=base.filter(k=>f(k._dplan));
        const tg=tarefasPlan.filter(t=>f(t.prazo));
        const lg=lembPlan.filter(l=>f(l.proximo_em));
        const n=g.length+tg.length+lg.length;
        if(!n) return "";
        // F135 · 50 por seção e "mostrar mais": a agenda inteira de uma vez
        // montava 71 mil elementos e travava a tela por quase 300 ms
        const lim=limPlan[tit]||50;
        const cartoes=[...grupoClientes(g).map(([c,ks])=>()=>cartaoCliente(c,ks)),
          ...tg.map(t=>()=>cartaoTarefa(t)), ...lg.map(l=>()=>cartaoLembrete(l))];
        return `<section class="pl-grupo"${tom?` data-tom="${tom}"`:""}><h3 class="secao">${tit} <span class="pl-n">${n}</span></h3>`
          + cartoes.slice(0,lim).map(f=>f()).join("")
          + (cartoes.length>lim ? `<button class="btn-rap mais-plan" data-mais="${esc(tit)}">Mostrar mais ${Math.min(200,cartoes.length-lim)} de ${cartoes.length-lim}</button>` : "")
          + `</section>`;
      }).join("")
    + (total? "" : "<p class='meio-sub'>Nada por aqui — agenda limpa. ✨</p>");
  document.querySelectorAll("[data-per]").forEach(b=>b.onclick=()=>{ filtroPlan=b.dataset.per; limPlan={}; render(); });
  document.querySelectorAll("[data-mais]").forEach(b=>b.onclick=()=>{ const t=b.dataset.mais; limPlan[t]=(limPlan[t]||50)+200; render(); });
  document.querySelectorAll("[data-pcol]").forEach(b=>b.onclick=()=>{ filtroPlanColab=b.dataset.pcol||null; render(); });
  ligarCartoes(); ligarTarefas();
}

// ── Minhas Tarefas (particulares) ─────────────────────────────────────────
function cartaoTarefa(t){
  // F93 · item de checklist do caso (ou pedido do pré-caso) é DOCUMENTO
  // pedido ao cliente: o cartão diz de quem é, abre a ficha e cobra
  const k=t.caso_id?D.casoPorId.get(t.caso_id):null;
  const c=D.cliPorId.get(t.cliente_id||(k&&k.cliente_id));
  const doc=!!(c && (k || t.virtual));
  return `<div class="cartao ${t.concluida?"feita":""}${t.concluida&&window.__risca===t.id?" risca":""}" data-tarefa="${t.id}">
    ${t.virtual?`<span class="check" style="visibility:hidden"></span>`:`<span class="check" data-conclui="${t.id}"></span>`}
    <div class="info"><div class="nome">${doc?`<a href="#" style="color:inherit" onclick="event.preventDefault();abrirFicha('${c.id}')">${esc(c.nome)}</a> · `:""}${esc(t.titulo)}</div>
      <div class="meta">
        ${t.particular_de?`<span class="chip per">🔒 particular</span>`:""}
        ${t.prazo?(t.concluida?`<span class="chip prazo">⏰ ${fmt(t.prazo)}</span>`:chipPrazo(t.prazo, doc?"o cliente entrega até":"")):""}
        ${doc&&!t.concluida?`<button class="btn-mini" onclick="event.stopPropagation();cobrarDocs('${c.id}','${k?k.id:""}')"
          title="mensagem pronta no WhatsApp com os pendentes; a cobrança fica registrada">📲 cobrar</button>`:""}
      </div></div></div>`;
}
function ligarTarefas(){
  document.querySelectorAll("[data-conclui]").forEach(el=>el.onclick=async e=>{
    e.stopPropagation();
    const t = D.tarefas.find(x=>x.id===el.dataset.conclui);
    t.concluida = !t.concluida;
    if(t.concluida) plim(); else aviso("Conclusão desfeita ↩", false);
    // F140 · só o cartão que acabou de ser concluído anima o risco; nas
    // repinturas seguintes ele aparece riscado e parado
    window.__risca = t.concluida ? t.id : null;
    setTimeout(()=>{ window.__risca = null; }, 600);
    await api(`/rest/v1/tarefas?id=eq.${t.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({concluida:t.concluida, concluida_em:t.concluida?new Date().toISOString():null})});
    render();
  });
}
function renderParticulares(){
  tituloLista("📋 Minhas Tarefas");
  document.getElementById("sub-lista").textContent="🔒 Só você vê esta lista. Tarefas com prazo de hoje aparecem no seu Meu Dia.";
  const minhas = D.tarefas.filter(t=>t.particular_de===eu.id)
    .sort((a,b)=>((a.prazo||"9999")<(b.prazo||"9999")?-1:1));
  const abertas = minhas.filter(t=>!t.concluida);
  const feitas = minhas.filter(t=>t.concluida)
    .sort((a,b)=>(a.concluida_em||"")<(b.concluida_em||"")?1:-1);
  document.getElementById("conteudo-meio").innerHTML =
    `<div class="nova"><input id="nt-titulo" placeholder="＋ Adicionar tarefa… (entende 'amanhã', 'sexta', 'dia 15')">
     <input id="nt-prazo" type="date"><button onclick="novaTarefa()">Adicionar</button></div>`
    + abertas.map(cartaoTarefa).join("")
    + (feitas.length?`<details style="margin-top:12px"><summary style="cursor:pointer;color:var(--cinza);padding:6px 2px">✔ Concluídas (${feitas.length}) — concluiu por engano? Abra e clique na bolinha para desfazer</summary>
        ${feitas.map(cartaoTarefa).join("")}</details>`:"");
  ligarTarefas();
  document.getElementById("nt-titulo").onkeydown=e=>{ if(e.key==="Enter") novaTarefa(); };
}
async function novaTarefa(){
  const ti=document.getElementById("nt-titulo"), pz=document.getElementById("nt-prazo");
  if(!ti.value.trim()) return;
  // "renovar OAB amanhã" / "ligar dia 15" -> data extraída do texto (estilo Todoist)
  const nat=dataNatural(ti.value.trim());
  const escolheuData=!!pz.value;         // antes de limpar — o campo vence o texto
  const [linha] = await api(`/rest/v1/tarefas`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify({titulo:nat.titulo, prazo:pz.value||nat.prazo||null, particular_de:eu.id})});
  D.tarefas.push(linha); ti.value=""; pz.value="";
  if(!escolheuData&&nat.prazo) aviso("Prazo entendido: "+fmt(nat.prazo)+" 🗓");
  render();
}

// ── F28: os CEPs de Monte Alto (arquivo do Paulo, 2025) ──────────────────
// A recepção escolhe a rua e o CEP, o bairro e a cidade saem sozinhos —
// serve à procuração e aos demais documentos. Lista local, nada sai daqui.
const CEPS_MONTE_ALTO=[["15910-001","Rua dos Lirios","Centro"],["15910-003","Rua Antonio da Silva","Centro"],["15910-005","Rua Doutor Carlos Kiellander","Centro"],["15910-007","Rua Coronel Medeiros","Centro"],["15910-009","Rua Luiz Cestari","Centro"],["15910-011","Rua Gustavo de Godoy","Centro"],["15910-013","Rua Rui Barbosa","Centro"],["15910-015","Rua Herculano do Livramento","Centro"],["15910-017","Travessa Francisco Pelloso","Centro"],["15910-019","Rua José Cuppertino Botto","Centro"],["15910-021","Rua Antonio Prado","Centro"],["15910-023","Avenida José Luiz Franco da Rocha","Centro"],["15910-025","Rua Coronel Pires Penteado","Centro"],["15910-027","Travessa São Luiz","Centro"],["15910-029","Rua Yoshimassa Fugita","Centro"],["15910-031","Rua Sabino de Camargo","Centro"],["15910-033","Rua Porfirio Pimentel","Centro"],["15910-035","Rua Braz Florenzano","Centro"],["15910-037","Rua Monte Líbano","Centro"],["15910-039","Rua Dante Borghi","Centro"],["15910-041","Rua 7 de Setembro","Centro"],["15910-043","Travessa da Saudade","Centro"],["15910-045","Rua Benjamin Constant","Centro"],["15910-047","Rua Floriano Peixoto","Centro"],["15910-049","Avenida 15 de Maio","Centro"],["15910-051","Praça Humberto Caracio","Centro"],["15910-053","Praça Centenário","Centro"],["15910-055","Rua Tabarana","Centro"],["15910-057","Avenida Comendador Bonfiglioli","Centro"],["15910-059","Avenida Comendador Castro Ribeiro","Centro"],["15910-061","Travessa Darcizio Donega","Centro"],["15910-063","Rua Ananias de Carvalho","Centro"],["15910-065","Travessa Olavo Bilac","Centro"],["15910-067","Rua Doutor Raul da Rocha Medeiros","Centro"],["15910-069","Praça Doutor Luiz Zacharias de Lima","Centro"],["15910-071","Praça da Bandeira","Centro"],["15910-073","Rua Cica","Centro"],["15910-075","Rua Nhonhô do Livramento","Centro"],["15910-077","Praça São Benedito","Centro"],["15910-079","Travessa Santo Agostinho","Centro"],["15910-081","Rua Jeremias de Paula Eduardo","Centro"],["15910-083","Rua Campos Sales","Centro"],["15910-085","Rua Florindo Cestari","Centro"],["15910-087","Travessa M. M. D. C.","Centro"],["15910-089","Rua Marechal Deodoro da Fonseca","Centro"],["15910-100","Rua São Benedito","Parque Cosmo"],["15910-102","Rua Benedito Aparecido de Carvalho","Parque Cosmo"],["15910-104","Rua São Lucas","Parque Cosmo"],["15910-106","Rua São Marcos","Parque Cosmo"],["15910-108","Rua Cabo Silva","Parque Cosmo"],["15910-110","Avenida Cosmo Inforçatti","Parque Cosmo"],["15910-112","Rua Antonio Prado","Parque Cosmo"],["15910-114","Avenida José Luiz Franco da Rocha","Parque Cosmo"],["15910-116","Rua Coronel Pires Penteado","Parque Cosmo"],["15910-120","Rua Aldemir Bandeira","Vila São Francisco"],["15910-122","Rua Antonio Prado","Vila São Francisco"],["15910-124","Avenida José Luiz Franco da Rocha","Vila São Francisco"],["15910-126","Rua Coronel Pires Penteado","Vila São Francisco"],["15910-128","Rua Sabino de Camargo","Vila São Francisco"],["15910-130","Travessa São Matheus","Vila São Francisco"],["15910-132","Rua Lenine Martinelli","Vila São Francisco"],["15910-134","Rua Porfirio Pimentel","Vila São Francisco"],["15910-136","Rua Braz Florenzano","Vila São Francisco"],["15910-138","Rua Cabo Silva","Vila São Francisco"],["15910-140","Rua São Marcos","Vila São Francisco"],["15910-142","Rua São Lucas","Vila São Francisco"],["15910-144","Rua São João","Vila São Francisco"],["15910-146","Rua São Benedito","Vila São Francisco"],["15910-150","Rua São Benedito","Vila Oliveira"],["15910-152","Rua São João","Vila Oliveira"],["15910-154","Rua Braz Florenzano","Vila Oliveira"],["15910-156","Rua Dante Borghi","Vila Oliveira"],["15910-160","Rua São João","Jardim São Marcos"],["15910-162","Rua São Lucas","Jardim São Marcos"],["15910-164","Rua São Marcos","Jardim São Marcos"],["15910-166","Rua São Francisco","Jardim São Marcos"],["15910-168","Rua São Thiago","Jardim São Marcos"],["15910-170","Rua Braz Florenzano","Jardim São Marcos"],["15910-172","Rua Dante Borghi","Jardim São Marcos"],["15910-174","Rua 07 de Setembro","Jardim São Marcos"],["15910-180","Rua São Lucas","Vila Ramos"],["15910-182","Rua São João","Vila Ramos"],["15910-184","Travessa São Pedro","Vila Ramos"],["15910-186","Rua São Benedito","Vila Ramos"],["15910-188","Rua Dante Borghi","Vila Ramos"],["15910-190","Rua 07 de Setembro","Vila Ramos"],["15910-220","Avenida 15 de Maio","Vila Municipal"],["15910-222","Rua José Rodrigues de Arruda Jr.","Vila Municipal"],["15910-224","Rua das Esmeraldas","Vila Municipal"],["15910-226","Rua dos Topazios","Vila Municipal"],["15910-228","Rua dos Diamantes","Vila Municipal"],["15910-230","Rua Duque de Caxias","Vila Municipal"],["15910-232","Rua Santos Dumont","Vila Municipal"],["15910-234","Travessa dos Rubis","Vila Municipal"],["15910-236","Rua José Soares de Mello","Vila Municipal"],["15910-238","Rua Oswaldo Cruz","Vila Municipal"],["15910-240","Rua José Carlos Pauletti","Central Park"],["15910-242","Rua Antônio Calió","Central Park"],["15910-244","Rua José Del Vaz","Central Park"],["15910-246","Rua José Leonso Nogales","Central Park"],["15910-248","Rua Zulmira Marcussi Zacarin","Central Park"],["15910-250","Rua João Mouri","Central Park"],["15910-260","Rua Monteiro Lobato","Vila Izildinha"],["15910-262","Rua Marechal Rondon","Vila Izildinha"],["15910-264","Avenida Presidente Vargas","Vila Izildinha"],["15910-266","Rua Presidente Dutra","Vila Izildinha"],["15910-268","Rua Waldemar Simões","Vila Izildinha"],["15910-270","Rua Waldemar Simões","Vila Gadini"],["15910-272","Rua Presidente Dutra","Vila Gadini"],["15910-274","Avenida Presidente Vargas","Vila Gadini"],["15910-276","Rua Marechal Rondon","Vila Gadini"],["15910-278","Rua 07 de Setembro","Vila Gadini"],["15910-280","Rua Benjamin Constant","Vila Gadini"],["15910-290","Rua Benjamin Constant","Vila Santo Antônio"],["15910-292","Rua Floriano Peixoto","Vila Santo Antônio"],["15910-294","Rodovia José Pizarro","Vila Santo Antônio"],["15910-296","Rua Marechal Rondon","Vila Santo Antônio"],["15910-298","Avenida Presidente Vargas","Vila Santo Antônio"],["15910-300","Rua Presidente Dutra","Vila Santo Antônio"],["15910-302","Rua Waldemar Simões","Vila Santo Antônio"],["15910-304","Travessa Orlando Alvarenga","Vila Santo Antônio"],["15910-306","Avenida Castelo Branco","Vila Santo Antônio"],["15910-310","Avenida Castelo Branco","Vila São Guilherme"],["15910-312","Rua Floriano Peixoto","Vila São Guilherme"],["15910-314","Rua São Paulo","Vila São Guilherme"],["15910-316","Travessa São Domingos","Vila São Guilherme"],["15910-318","Rua Minas Gerais","Vila São Guilherme"],["15910-320","Rua Bahia","Vila São Guilherme"],["15910-322","Rua Paraná","Vila São Guilherme"],["15910-324","Rua Amazonas","Vila São Guilherme"],["15910-326","Rua Piauí","Vila São Guilherme"],["15910-328","Rua Espanha","Vila São Guilherme"],["15910-330","Rua França","Vila São Guilherme"],["15910-332","Rua Japão","Vila São Guilherme"],["15910-334","Rua Suiça","Vila São Guilherme"],["15910-336","Marginal Ítalo Lanfredi","Vila São Guilherme"],["15910-338","Rua Presidente Dutra","Vila São Guilherme"],["15910-340","Rua Waldemar Simões","Vila São Guilherme"],["15910-342","Rua Ananias de Carvalho","Vila São Guilherme"],["15910-344","Rua Doutor Raul da Rocha Medeiros","Vila São Guilherme"],["15910-346","Rua Nhonhô do Livramento","Vila São Guilherme"],["15910-348","Rua Jeremias de Paula Eduardo","Vila São Guilherme"],["15910-350","Avenida Pedro Vital","Vila São Guilherme"],["15910-360","Avenida Pedro Vital","Jardim Santana"],["15910-362","Rua Jeremias de Paula Eduardo","Jardim Santana"],["15910-364","Rua José Penhalbel Molina","Jardim Santana"],["15910-366","Rua Portugal","Jardim Santana"],["15910-368","Rua Brasil","Jardim Santana"],["15910-370","Rua Júlio Vieira","Jardim Santana"],["15910-372","Rua Itália","Jardim Santana"],["15910-374","Avenida Raposo Tavares","Jardim Santana"],["15910-376","Rua Dona Maria José","Jardim Santana"],["15910-378","Rua John Kennedy","Jardim Santana"],["15910-380","Rua Antonio Gonçalves Pires","Jardim Santana"],["15910-382","Rua Dona Aurea","Jardim Santana"],["15910-384","Rua Dona Francisca","Jardim Santana"],["15910-386","Rua Dona Claudina","Jardim Santana"],["15910-388","Rua Dona Rita","Jardim Santana"],["15910-390","Rua Batista Daneluzzi","Jardim Santana"],["15910-392","Rua Otoni Bertoz","Jardim Santana"],["15910-394","Rua Alemanha","Jardim Santana"],["15910-396","Rua Belgica","Jardim Santana"],["15910-398","Rua Inglaterra","Jardim Santana"],["15910-400","Rua Néllio Della Vechia","Jardim Santana"],["15910-410","Rua Raposo Tavares","Conjunto Habitacional Bandeirantes"],["15910-412","Avenida Fernão Dias","Conjunto Habitacional Bandeirantes"],["15910-414","Avenida Borba Gato","Conjunto Habitacional Bandeirantes"],["15910-416","Avenida Bartolomeu Bueno","Conjunto Habitacional Bandeirantes"],["15910-418","Rua Batista Daneluzzi","Conjunto Habitacional Bandeirantes"],["15910-420","Rua Otoni Bertoz","Conjunto Habitacional Bandeirantes"],["15910-422","Rua Florencio Daneluzzi","Conjunto Habitacional Bandeirantes"],["15910-424","Rua Domingos Barroso","Conjunto Habitacional Bandeirantes"],["15910-426","Rua Henrique de Oliveira Nunes","Conjunto Habitacional Bandeirantes"],["15910-428","Praça Antonio Drausio Serralha","Conjunto Habitacional Bandeirantes"],["15910-430","Rua José Pagnan","Conjunto Habitacional Bandeirantes"],["15910-432","Rua Assenço de Oliveira","Conjunto Habitacional Bandeirantes"],["15910-434","Rua Antonio Gambarini","Conjunto Habitacional Bandeirantes"],["15910-436","Rua Henrique Damato","Conjunto Habitacional Bandeirantes"],["15910-438","Rua Bento Manoel de Siqueira","Conjunto Habitacional Bandeirantes"],["15910-440","Rua Deputado Aldo Lupo","Conjunto Habitacional Bandeirantes"],["15910-442","Rua Delphino Artioli","Conjunto Habitacional Bandeirantes"],["15910-444","Avenida Antonio Inforçatti","Conjunto Habitacional Bandeirantes"],["15910-450","Avenida Antonio Inforçatti","Parque Industrial das Nações"],["15910-452","Rua Antonio Bernardes da Fonseca","Parque Industrial das Nações"],["15910-454","Travessa Pedro Ferreira de Toledo","Parque Industrial das Nações"],["15910-456","Travessa Antônio de Natal","Parque Industrial das Nações"],["15910-458","Avenida Doutor José de Paula Eduardo","Parque Industrial das Nações"],["15910-460","Travessa Augusto de Natale","Parque Industrial das Nações"],["15910-462","Rua José Amauri Augusto","Parque Industrial das Nações"],["15910-464","Rua Aite Zanelato","Parque Industrial das Nações"],["15910-466","Rua Antonio Roberto Dellavechia","Parque Industrial das Nações"],["15910-468","Rua Denis Françolin","Parque Industrial das Nações"],["15910-470","Rodovia SP 305","Parque Industrial das Nações"],["15910-472","Avenida Wilson Folador","Parque Industrial das Nações"],["15910-474","Rua Manoel Fernandes","Parque Industrial das Nações"],["15910-476","Rua Vereador Valentin Dalseno","Parque Industrial das Nações"],["15910-478","Rua Thomaz Tudi","Parque Industrial das Nações"],["15910-480","Rua José Renato Menani","Parque Industrial das Nações"],["15910-482","Rua Aparecida Ferreira Piccolo","Parque Industrial das Nações"],["15910-484","Rua Sidinaldo Marchesini","Parque Industrial das Nações"],["15910-486","Rua Bruno Maida","Parque Industrial das Nações"],["15910-488","Rua Antonio Valente da Costa","Parque Industrial das Nações"],["15910-550","Rua Antonio Valente da Costa","Jardim Alvorada"],["15910-552","Rua José Emilio dos Santos","Jardim Alvorada"],["15910-554","Rua José Tarraga","Jardim Alvorada"],["15910-556","Rua Vitor Maida","Jardim Alvorada"],["15910-558","Rua Doutor Ulisses de Paula Eduardo","Jardim Alvorada"],["15910-560","Rua Luiz Tersigni","Jardim Alvorada"],["15910-562","Rua Wilson José Rodrigues","Jardim Alvorada"],["15910-564","Rua Evaristo Peloso","Jardim Alvorada"],["15910-566","Rua Elias Auada","Jardim Alvorada"],["15910-568","Avenida Nelly Bahdur Cano","Jardim Alvorada"],["15910-570","Travessa Antonio Sudano","Jardim Alvorada"],["15910-572","Rua Silvio Govoni","Jardim Alvorada"],["15910-574","Rua Anselmo Geraldini","Jardim Alvorada"],["15910-576","Rua Silvio Serafim","Jardim Alvorada"],["15910-578","Rua Luzia Barçanelli","Jardim Alvorada"],["15910-580","Rua Padre Nelson Antoninho","Jardim Alvorada"],["15910-582","Rua Padre Alfredo Aluisio","Jardim Alvorada"],["15910-584","Rua Atair Candido Trindade","Jardim Alvorada"],["15910-586","Travessa Aurelio Pelloso","Jardim Alvorada"],["15910-588","Rua Doutor Roberto da Rocha Leão","Jardim Alvorada"],["15910-590","Rua Horacio Barioni","Jardim Alvorada"],["15910-592","Rua Egidio Berganton","Jardim Alvorada"],["15910-594","Rua Antonio Nunes","Jardim Alvorada"],["15910-596","Travessa Placidio Lindolfo","Jardim Alvorada"],["15910-598","Rua Gervasio de Azevedo","Jardim Alvorada"],["15910-600","Rua José Elias Haddad","Jardim Alvorada"],["15910-602","Rua Said Thomas Buchalla","Jardim Alvorada"],["15910-604","Rua Wady Elias","Jardim Alvorada"],["15910-606","Estrada Municipal Octávio Faloppa","Jardim Alvorada"],["15910-608","Rua A","Jardim Alvorada"],["15910-610","Rua B","Jardim Alvorada"],["15910-620","Avenida 1","Jardim São Vitor"],["15910-622","Avenida 2","Jardim São Vitor"],["15910-624","Rua Elvio Zacarin","Jardim São Vitor"],["15910-626","Rua Marcolina Boare da Silva","Jardim São Vitor"],["15910-628","Rua 1","Jardim São Vitor"],["15910-630","Rua Nelson de Araújo","Jardim São Vitor"],["15910-632","Rua Francisco Mariano de Almeida","Jardim São Vitor"],["15910-634","Rua Vera Lúcia Cordeiro da Silva","Jardim São Vitor"],["15910-636","Rua Antônio José Bazzon","Jardim São Vitor"],["15910-638","Rua Lúcio César Morelli","Jardim São Vitor"],["15910-640","Rua Amélio Freschi","Jardim São Vitor"],["15910-642","Rua João Aparecido Vedoveli","Jardim São Vitor"],["15910-644","Rua Ana Cristina Marena de Avelar","Jardim São Vitor"],["15910-646","Rua João Umberto Seghessi","Jardim São Vitor"],["15910-648","Avenida José Orestes Morgado","Jardim São Vitor"],["15910-650","Rua Odila Biancardi Chopps","Jardim São Vitor"],["15910-652","Rua José Roberto Sala","Jardim São Vitor"],["15910-654","Rua Érica Lanfredi","Jardim São Vitor"],["15910-656","Rua Dona Laide Zaneli","Jardim São Vitor"],["15910-658","Rua Fabrício Schineider","Jardim São Vitor"],["15910-660","Rua Leonor de Souza Toledo","Jardim São Vitor"],["15910-662","Rua Antonio Ferreira Lima","Jardim São Vitor"],["15910-664","Rua Antonio Faustino Barbosa Filho","Jardim São Vitor"],["15912-000","Rua 07 de Setembro","Jardim Tangará"],["15912-002","Rua São Marcos","Jardim Tangará"],["15912-004","Rua São Francisco","Jardim Tangará"],["15912-006","Rua São Thiago","Jardim Tangará"],["15912-008","Rua Antonio Gonçalves Pires","Jardim Tangará"],["15912-010","Rua Dona Claudina","Jardim Tangará"],["15912-012","Rua Dona Rita","Jardim Tangará"],["15912-014","Rua Batista Daneluzzi","Jardim Tangará"],["15912-016","Rua Angelo Alario Pires","Jardim Tangará"],["15912-018","Rua Joaquim Ignacio Marcelino","Jardim Tangará"],["15912-020","Rua Antonio Grecco","Jardim Tangará"],["15912-022","Rua Dona Francisca","Jardim Tangará"],["15912-024","Rua Waldemar de Paula Eduardo","Jardim Tangará"],["15912-026","Rua Vernizio Cestari","Jardim Tangará"],["15912-028","Rua Deodoro de Arruda Campos","Jardim Tangará"],["15912-030","Rua Aurelio Caetano da Silva","Jardim Tangará"],["15912-032","Rua Abilio Pinto de Oliveira","Jardim Tangará"],["15912-034","Rua Sophia Pimentel de Lima","Jardim Tangará"],["15912-036","Rua Rosa Bonsegno Morgado","Jardim Tangará"],["15912-038","Rua Osmar Mattara","Jardim Tangará"],["15912-040","Rua Luis Gustavo Morgado Folador","Jardim Tangará"],["15912-042","Rua José Moacyr Follador","Jardim Tangará"],["15912-044","Rua Athos Folador","Jardim Tangará"],["15912-046","Rua Amelia Mazzieiro Freschi","Jardim Tangará"],["15912-048","Rua Antonieta Bonsegno","Jardim Tangará"],["15912-050","Rua José Ferrarine","Jardim Tangará"],["15912-052","Rua Felton Foladore","Jardim Tangará"],["15912-054","Rua Vicente Bonsegno","Jardim Tangará"],["15912-056","Rua Julia Simongini Chiquitelli","Jardim Tangará"],["15912-058","Rua Raul da Silva","Jardim Tangará"],["15912-060","Rua Eugenio Folador","Jardim Tangará"],["15912-062","Rua Roberto Lauer","Jardim Tangará"],["15912-070","Rua Roberto Lauer","Jardim Esperança"],["15912-072","Rua Domingos Gonçalves Damasceno","Jardim Esperança"],["15912-074","Rua Luiz Carlos Basílio","Jardim Esperança"],["15912-076","Rua da Paz","Jardim Esperança"],["15912-078","Rua Natal Piccolo","Jardim Esperança"],["15912-080","Rua Américo Salvaterra","Jardim Esperança"],["15912-082","Rua Marcelino Rossigalli","Jardim Esperança"],["15912-090","Rua Antonio Devazzio","Jardim Bom Retiro"],["15912-092","Rua Dona Francisca","Jardim Bom Retiro"],["15912-094","Rua da Paz","Jardim Bom Retiro"],["15912-096","Rua Luiz Carlos Basílio","Jardim Bom Retiro"],["15912-098","Rua Domingos Gonçalves Damasceno","Jardim Bom Retiro"],["15912-100","Rua Miquela Colatrelli Mori","Jardim Bom Retiro"],["15912-110","Rua Miquela Colatrelli Mori","Jardim Santa Rita"],["15912-112","Rua Antonio Gianello","Jardim Santa Rita"],["15912-114","Rua André Lozano","Jardim Santa Rita"],["15912-116","Rua Octavio Cotrim","Jardim Santa Rita"],["15912-118","Rua Aparecido Seraphim Ferraz","Jardim Santa Rita"],["15912-120","Rua Antônio Penharbel","Jardim Santa Rita"],["15912-122","Rua Dilter Antônio Arioli","Jardim Santa Rita"],["15912-124","Rua Aldo Maziero","Jardim Santa Rita"],["15912-126","Rua Antonio Colatrella","Jardim Santa Rita"],["15912-128","Rua Luiz Vital","Jardim Santa Rita"],["15912-130","Rua João de Araújo Borges","Jardim Santa Rita"],["15912-132","Rua da Paz","Jardim Santa Rita"],["15912-170","Rua Miguel Biscola","Residencial São Luiz"],["15912-172","Rua Antonio Morelli","Residencial São Luiz"],["15912-174","Rua Romeu Zangirólami","Residencial São Luiz"],["15912-176","Rua Melves Pivetta","Residencial São Luiz"],["15912-178","Rua José Augusto Pires","Residencial São Luiz"],["15912-180","Rua Rosa Rossigali Legramande","Residencial São Luiz"],["15912-182","Rua Emília Tedeschi Tavanelli","Residencial São Luiz"],["15912-184","Rua João Antonio Filho","Residencial São Luiz"],["15912-186","Rua Nelson Zaupa","Residencial São Luiz"],["15912-188","Rua Marlon Adauto Delavecchia","Residencial São Luiz"],["15912-190","Rua José Bertozzi Neto","Residencial São Luiz"],["15912-192","Rua Antonio Martins Leite","Residencial São Luiz"],["15912-194","Rua Innocencio Ferraz de Arruda","Residencial São Luiz"],["15912-196","Rua Miguel Meloni","Residencial São Luiz"],["15912-198","Rua Rogerio Vedovelli","Residencial São Luiz"],["15912-200","Rua João Pinto Thimotheo","Residencial São Luiz"],["15912-202","Rua Benedito Carlos","Residencial São Luiz"],["15912-204","Rua Ledenice Beline de Oliveira","Residencial São Luiz"],["15912-206","Rua Guiomar Freire de Andrade","Residencial São Luiz"],["15912-208","Rua Geraldo Martins","Residencial São Luiz"],["15912-210","Rua Manoel Navarro","Residencial São Luiz"],["15912-212","Rua Elizabete Maida Colatrella","Residencial São Luiz"],["15912-214","Rua Porcina Honoria de Araujo","Residencial São Luiz"],["15912-220","Rua José Maria Brandão","Residencial Parque das Flores"],["15912-222","Rua Lázaro Fenerick","Residencial Parque das Flores"],["15912-224","Rua Aracy Aparecida Ribeiro de Carvalho","Residencial Parque das Flores"],["15912-226","Rua Antônio Pinto Ferreira","Residencial Parque das Flores"],["15912-228","Rua Senhor Darcy Bernacci","Residencial Parque das Flores"],["15912-230","Rua Sargento Polícia Militar José Correia Lima","Residencial Parque das Flores"],["15912-232","Rua José Sebastião Ferreira","Residencial Parque das Flores"],["15912-234","Rua Apparecida Ianni Tanios","Residencial Parque das Flores"],["15912-236","Rua Olívio Fenerich","Residencial Parque das Flores"],["15912-238","Rua Jaime Junquetti","Residencial Parque das Flores"],["15912-240","Rua Alberto Barrilari","Residencial Parque das Flores"],["15912-242","Rua Paulo Inforçatti","Residencial Parque das Flores"],["15912-244","Avenida Luiz Cestari Netto","Residencial Parque das Flores"],["15912-246","Rua José Capanema","Residencial Parque das Flores"],["15912-248","Rua Antônio Aparecido Franciosi","Residencial Parque das Flores"],["15912-250","Rua Valdeci Gallo Júnior","Residencial Parque das Flores"],["15912-252","Rua Angelino Inforçatti","Residencial Parque das Flores"],["15912-254","Rua Geraldo Aleixo","Residencial Parque das Flores"],["15912-256","Rua João Neves","Residencial Parque das Flores"],["15912-258","Rua Guiomar Lourenço Moretti","Residencial Parque das Flores"],["15912-260","Rua Pedro David","Residencial Parque das Flores"],["15912-320","Rua Honorina Ascari Ulian","Residencial Santa Júlia"],["15912-322","Rua José Capanema","Residencial Santa Júlia"],["15912-324","Rua Jino Gambaroto","Residencial Santa Júlia"],["15912-326","Rua João Capelanes","Residencial Santa Júlia"],["15912-328","Rua Octavio Barbosa","Residencial Santa Júlia"],["15912-330","Rua Ruy Ramos","Residencial Santa Júlia"],["15912-332","Rua Júlia Cotovia Oliveira","Residencial Santa Júlia"],["15912-334","Rua Archanjo Antonio Michelin","Residencial Santa Júlia"],["15912-336","Rua Olívio Pressendo","Residencial Santa Júlia"],["15912-338","Rua Omildo Capellane","Residencial Santa Júlia"],["15912-340","Rua Guerino Carriero","Residencial Santa Júlia"],["15912-342","Rua Dionizio Francisco Mathias","Residencial Santa Júlia"],["15912-350","Rua Dionizio Francisco Mathias","Jardim Jaqueline"],["15912-352","Rua Geraldo Martins","Jardim Jaqueline"],["15912-354","Rua Guiomar Freire de Andrade","Jardim Jaqueline"],["15912-356","Rua Ledenice Beline de Oliveira","Jardim Jaqueline"],["15912-358","Rua Benedito Carlos","Jardim Jaqueline"],["15912-360","Rua João Pinto Thimótheo","Jardim Jaqueline"],["15912-362","Rua Rogério Vedovelli","Jardim Jaqueline"],["15912-364","Rua Miguel Meloni","Jardim Jaqueline"],["15912-366","Rua Innocencio Ferraz de Arruda","Jardim Jaqueline"],["15912-368","Rua Antonio Martins Leite","Jardim Jaqueline"],["15912-370","Rua José Bertozzi Neto","Jardim Jaqueline"],["15912-372","Rua Porcina Honoria de Araujo","Jardim Jaqueline"],["15912-374","Rua Atilio Marton","Jardim Jaqueline"],["15912-376","Rua Paulo Pressendo","Jardim Jaqueline"],["15912-378","Rua Nain Issa Geradi","Jardim Jaqueline"],["15912-380","Rua Osvaldo Ulian","Jardim Jaqueline"],["15912-382","Rua Raimundo Pinheiro","Jardim Jaqueline"],["15912-384","Rua Antônio Deróide","Jardim Jaqueline"],["15912-386","Rua Antônio Bonsegno","Jardim Jaqueline"],["15912-388","Rua Alcides Braz","Jardim Jaqueline"],["15912-390","Rua Augustinho Mestre","Jardim Jaqueline"],["15912-392","Rua Papa João Paulo II","Jardim Jaqueline"],["15912-394","Avenida Antonio Inforçatti","Jardim Jaqueline"],["15912-396","Rua Itagiba de Oliveira","Jardim Jaqueline"],["15912-400","Rua Itagiba de Oliveira","Jardim Canaã"],["15912-402","Rua Joaquim Aleixo","Jardim Canaã"],["15912-404","Rua Cabo-Polícia Militar Afonso Mario da Silva","Jardim Canaã"],["15912-406","Rua Americo Nicoletti","Jardim Canaã"],["15912-408","Rua Miguel Tavanelli","Jardim Canaã"],["15912-410","Rua Aprigio Ribeiro Guimarães","Jardim Canaã"],["15912-412","Rua Manoel Coelho Filho","Jardim Canaã"],["15912-414","Rua Manoel de Carvalho Filho","Jardim Canaã"],["15912-416","Rua João Pivetta","Jardim Canaã"],["15912-418","Avenida Antonio Inforçatti","Jardim Canaã"],["15912-420","Rua Augusto Abril","Jardim Canaã"],["15912-422","Rua José de Vazzi","Jardim Canaã"],["15912-424","Rua Marcelino Valerio Alves","Jardim Canaã"],["15912-426","Rua Professor Carlos Roberto Boverio","Jardim Canaã"],["15912-428","Rua José de Souza Wada","Jardim Canaã"],["15912-430","Rua Mário Vital dos Santos","Jardim Canaã"],["15912-432","Rua Anna Maria Cáprio","Jardim Canaã"],["15912-434","Rua Miguel Biscola","Jardim Canaã"],["15912-436","Rua João Alves de Araújo Júnior","Jardim Canaã"],["15912-440","Rua João Alves de Araújo Júnior","Estância Tropical"],["15912-442","Rua Miguel Biscola","Estância Tropical"],["15912-450","Rua Américo Guido Durigan","Parque Residencial Laranjeiras"],["15912-452","Rua José Pavanelli","Parque Residencial Laranjeiras"],["15912-454","Rua Antonio Branco","Parque Residencial Laranjeiras"],["15912-456","Rua João Pires","Parque Residencial Laranjeiras"],["15912-458","Rua Octavio Calegari","Parque Residencial Laranjeiras"],["15912-460","Rua Belmiro Barroso","Parque Residencial Laranjeiras"],["15912-462","Rua Guido Matioli","Parque Residencial Laranjeiras"],["15912-464","Rua Morikazo Takimoto","Parque Residencial Laranjeiras"],["15912-466","Rua Kyuitti Kamimura","Parque Residencial Laranjeiras"],["15912-468","Rua Kunitti Matsumura","Parque Residencial Laranjeiras"],["15912-470","Rua Norio Saito","Parque Residencial Laranjeiras"],["15912-472","Rua Sanzo Hamada","Parque Residencial Laranjeiras"],["15912-474","Rua Massami Murakami","Parque Residencial Laranjeiras"],["15912-476","Rua Tomás Yamada","Parque Residencial Laranjeiras"],["15912-478","Rua Fortunato Buzeto","Parque Residencial Laranjeiras"],["15912-480","Rua Sebastião Salvaterra","Parque Residencial Laranjeiras"],["15912-482","Rua Padre Thomaz Rodero Lopes","Parque Residencial Laranjeiras"],["15912-484","Avenida Antonio Inforçatti","Parque Residencial Laranjeiras"],["15912-490","Avenida Antonio Inforçatti","Jardim Centenário"],["15912-492","Rua Doutor Luis Arrobas Martins","Jardim Centenário"],["15912-494","Rua Octavio Piovesan","Jardim Centenário"],["15912-496","Rua Laert José Tarallo Mendes","Jardim Centenário"],["15912-498","Rua Paulo Victório Barrancos","Jardim Centenário"],["15912-500","Rua Santo Garbim","Jardim Centenário"],["15912-502","Rua Antonio Bernardes da Fonseca","Jardim Centenário"],["15912-504","Rua Carlos Lacerda","Jardim Centenário"],["15912-506","Rua Paschoal Bonsegno","Jardim Centenário"],["15912-508","Rua Gervazio da Silva","Jardim Centenário"],["15912-510","Rua Jorge Auada","Jardim Centenário"],["15912-512","Rua Mario Veneri","Jardim Centenário"],["15912-514","Rua Dib Kairalla","Jardim Centenário"],["15912-516","Rua José Kairalla","Jardim Centenário"],["15912-518","Rua Simão Kairalla","Jardim Centenário"],["15912-520","Rua Antonio Salim Kairalla","Jardim Centenário"],["15912-522","Rua Emilio Farhat","Jardim Centenário"],["15912-524","Rua Bichara Abuassi","Jardim Centenário"],["15912-526","Rua Clemente Vertuan","Jardim Centenário"],["15912-528","Rua Fernando Cavalete","Jardim Centenário"],["15912-530","Avenida Oliano Zucarato","Jardim Centenário"],["15912-532","Rua Alcides Della Vecchia","Jardim Centenário"],["15912-540","Rua Antonio Bernardes da Fonseca","Jardim Bela Vista do Mirante"],["15912-542","Rua Sebastião de Souza Branco","Jardim Bela Vista do Mirante"],["15912-544","Rua Eduardo Grecco","Jardim Bela Vista do Mirante"],["15912-546","Rua Anna Hernandes","Jardim Bela Vista do Mirante"],["15912-548","Rua Rosa Pieri Irochi","Jardim Bela Vista do Mirante"],["15912-550","Rua José Basílio","Jardim Bela Vista do Mirante"],["15912-552","Rua Júlia Erler Pavanelli","Jardim Bela Vista do Mirante"],["15912-554","Rua Marcos Chiquitelli","Jardim Bela Vista do Mirante"],["15912-556","Rua José Rodolfo Gerber","Jardim Bela Vista do Mirante"],["15912-558","Rua Amélia Puliero Delfino","Jardim Bela Vista do Mirante"],["15912-560","Rua João Veroneze","Jardim Bela Vista do Mirante"],["15912-562","Rua José Branco","Jardim Bela Vista do Mirante"],["15912-564","Rua Yoshio Tokimatsu","Jardim Bela Vista do Mirante"],["15912-566","Rua Jorge Abuassi","Jardim Bela Vista do Mirante"],["15912-568","Rua Professor Gilberto Morgado","Jardim Bela Vista do Mirante"],["15912-620","Rua Guiomar Freitas Geribelo","Vale dos Sonhos"],["15912-622","Avenida Doutor Julio Raposo do Amaral","Vale dos Sonhos"],["15912-624","Avenida Antonio Inforçatti","Vale dos Sonhos"],["15912-626","Rua Primo Meloni","Vale dos Sonhos"],["15912-628","Rua José Rodolfo Denadai","Vale dos Sonhos"],["15912-630","Rua Aldo Peloso","Vale dos Sonhos"],["15912-632","Rua Francisco Paulo Lépore","Vale dos Sonhos"],["15912-634","Rua José Della Vechia","Vale dos Sonhos"],["15912-636","Rua João Riemma","Vale dos Sonhos"],["15912-638","Rua Josephina Kairalla Bahdur","Vale dos Sonhos"],["15912-640","Rua Rodolpho Matiolli","Vale dos Sonhos"],["15912-642","Rua Professor Thyrso Jorge dos Santos Galasso","Vale dos Sonhos"],["15912-644","Rua Fernando José Freire de Andrade","Vale dos Sonhos"],["15912-646","Rua Aparecida Marchetti Guzzo","Vale dos Sonhos"],["15912-648","Rua Salvador Olivério","Vale dos Sonhos"],["15912-650","Rua Adílio Chaves","Vale dos Sonhos"],["15912-652","Rua Antônio Martinho","Vale dos Sonhos"],["15912-654","Rua Gino Victorio Rossi","Vale dos Sonhos"],["15912-660","Rua José Stechi","Jardim Imperial"],["15912-662","Avenida Antonio Inforçatti","Jardim Imperial"],["15912-664","Rua Francisco Tancredo Antonio","Jardim Imperial"],["15912-666","Rua Hermínio Lanfredi","Jardim Imperial"],["15912-668","Avenida Doutor Julio Raposo do Amaral","Jardim Imperial"],["15912-670","Rua Guiomar Freitas Geribelo","Jardim Imperial"],["15912-672","Rua Pedro Soares","Jardim Imperial"],["15912-674","Rua Diego Simão","Jardim Imperial"],["15912-676","Rua Luiz Gonzaga da Cunha","Jardim Imperial"],["15912-678","Rua Tadassi Takita","Jardim Imperial"],["15912-680","Rua Benvindo Pereira da Silva","Jardim Imperial"],["15912-682","Rua Andressa Canalli Cassoli","Jardim Imperial"],["15912-684","Rua Orestes Lanfredi","Jardim Imperial"],["15912-690","Rua Orestes Lanfredi","Residencial Monte Bello"],["15912-692","Rua Luiz Caetano","Residencial Monte Bello"],["15912-694","Rua Noé Jácomo","Residencial Monte Bello"],["15912-696","Rua Nelson Moratta","Residencial Monte Bello"],["15912-698","Rua Gilvanete Ramos de Oliveira","Residencial Monte Bello"],["15912-700","Rua Benedito Sanches","Residencial Monte Bello"],["15912-702","Rua José Florindo Tercini","Residencial Monte Bello"],["15912-704","Rua Dorival da Silva Queiróz","Residencial Monte Bello"],["15912-706","Rua Marciano de Vasconcellos Nogueira","Residencial Monte Bello"],["15912-708","Rua Dionizio Paganoti","Residencial Monte Bello"],["15912-710","Rua Manoel Aparecido Vrech","Residencial Monte Bello"],["15912-712","Rua Eliseu Fernandes de Mendonça","Residencial Monte Bello"],["15912-714","Rua Pedro Faustino Correia","Residencial Monte Bello"],["15912-716","Rua Januário Rodrigues Garcia","Residencial Monte Bello"],["15912-718","Rua Donato Sorgini","Residencial Monte Bello"],["15912-720","Avenida Antonio Inforçatti","Residencial Monte Bello"],["15912-722","Avenida Doutor Julio Raposo do Amaral","Residencial Monte Bello"],["15912-724","Rua Guiomar Freitas Geribelo","Residencial Monte Bello"],["15912-726","Rua Missionária Dorvalina Comim de Souza","Residencial Monte Bello"],["15912-730","Avenida BMA","Monte Alto"],["15914-000","Alameda João Garcia Garcia","Vila Candido Seixas"],["15914-002","Rua Herculano do Livramento","Vila Candido Seixas"],["15914-004","Rua Rui Barbosa","Vila Candido Seixas"],["15914-006","Rua Marechal Deodoro da Fonseca","Vila Candido Seixas"],["15914-008","Rua Adelino Buzinaro","Vila Candido Seixas"],["15914-010","Rua 21 de Abril","Vila Candido Seixas"],["15914-020","Rua Rui Barbosa","Jardim Paulista"],["15914-022","Rua 23 de Maio","Jardim Paulista"],["15914-024","Rua 09 de Julho","Jardim Paulista"],["15914-026","Rua 06 de Agosto","Jardim Paulista"],["15914-028","Rua 12 de Outubro","Jardim Paulista"],["15914-030","Rua 15 de Novembro","Jardim Paulista"],["15914-032","Rua 19 de Novembro","Jardim Paulista"],["15914-034","Rua Carlos Gomes","Jardim Paulista"],["15914-036","Rua Noel Rosa","Jardim Paulista"],["15914-038","Rua Francisco Alves","Jardim Paulista"],["15914-040","Rua Amapá","Jardim Paulista"],["15914-042","Rua Ceará","Jardim Paulista"],["15914-044","Rua Goiás","Jardim Paulista"],["15914-046","Rua Maranhão","Jardim Paulista"],["15914-048","Rua Pará","Jardim Paulista"],["15914-050","Rua Paraíba","Jardim Paulista"],["15914-052","Rua Pernambuco","Jardim Paulista"],["15914-054","Rua Rondônia","Jardim Paulista"],["15914-056","Rua Roraima","Jardim Paulista"],["15914-058","Avenida Ayrton Senna da Silva","Jardim Paulista"],["15914-060","Rua Alagoas","Jardim Paulista"],["15914-062","Rua Acre","Jardim Paulista"],["15914-070","Rua Edson Aparecido Apollaro","Residencial Vale Verde"],["15914-072","Rua Francesco Passa","Residencial Vale Verde"],["15914-074","Rua Ivone Schiola Hernandes","Residencial Vale Verde"],["15914-076","Rua Maria Aparecida Bedim Pereira","Residencial Vale Verde"],["15914-078","Rua Luiz Fenerich","Residencial Vale Verde"],["15914-080","Rua Tonico Salla","Residencial Vale Verde"],["15914-082","Rua Sérgio Piccolo","Residencial Vale Verde"],["15914-084","Rua Miguel Balduíno","Residencial Vale Verde"],["15914-090","Rua Edevaldo de Freitas","Jardim Vila Real"],["15914-092","Rua Manoel Pires","Jardim Vila Real"],["15914-094","Rua Roque Ramazote","Jardim Vila Real"],["15914-096","Rua Sylvio Abril","Jardim Vila Real"],["15914-100","Rua José Perina","Recreio Villa Real"],["15914-102","Rua Luiz Barato","Recreio Villa Real"],["15914-104","Rua José Gonçalves da Silva","Recreio Villa Real"],["15914-106","Rua Luiz Carlos Carcinoni","Recreio Villa Real"],["15914-108","Rua Luis Augusto Fenerick","Recreio Villa Real"],["15914-110","Rua Januario Colatreli","Recreio Villa Real"],["15914-112","Rua João Paulo Cotugno","Recreio Villa Real"],["15914-120","Avenida Ayrton Senna da Silva","Condomínio Primavera"],["15914-122","Rua Olivaldo Luiz Ferreira","Condomínio Primavera"],["15914-124","Avenida Central 1","Condomínio Primavera"],["15914-130","Avenida Ayrton Senna da Silva","Colinas do Campestre"],["15914-132","Avenida Alcides da Costa Gonçalves","Colinas do Campestre"],["15914-134","Rua João Quiles","Colinas do Campestre"],["15914-136","Rua Aline Ferreira de Menezes Pinhati","Colinas do Campestre"],["15914-138","Rua Percilia Pereira de Souza","Colinas do Campestre"],["15914-140","Rua Aparecida Darci Pires","Colinas do Campestre"],["15914-142","Rua Jair Collatrelli","Colinas do Campestre"],["15914-144","Rua Doutor Elias Bahdur","Colinas do Campestre"],["15914-146","Rua José Antonio Correa Lima","Colinas do Campestre"],["15914-148","Rua Maria Pereira Pisco","Colinas do Campestre"],["15914-150","Rua Manoel Pereira","Colinas do Campestre"],["15914-152","Rua Paulo Cesar Pereira","Colinas do Campestre"],["15914-154","Rua Roberto Barrilari","Colinas do Campestre"],["15914-160","Avenida Ayrton Senna da Silva","Jardim Santa Irene"],["15914-162","Alameda Jacarandá","Jardim Santa Irene"],["15914-164","Alameda Cabreúva","Jardim Santa Irene"],["15914-166","Alameda Cambará","Jardim Santa Irene"],["15914-168","Alameda Jequitibá","Jardim Santa Irene"],["15914-170","Avenida Ayrton Senna da Silva","Condomínio Laura Pizarro"],["15914-172","Alameda das Estrelas","Condomínio Laura Pizarro"],["15914-174","Alameda dos Ventos","Condomínio Laura Pizarro"],["15914-176","Alameda das Árvores","Condomínio Laura Pizarro"],["15914-178","Alameda da Lua","Condomínio Laura Pizarro"],["15914-180","Alameda do Sol Nascente","Condomínio Laura Pizarro"],["15914-182","Alameda da Terra","Condomínio Laura Pizarro"],["15914-184","Alameda Águas Claras","Condomínio Laura Pizarro"],["15914-186","Alameda do Fogo","Condomínio Laura Pizarro"],["15914-250","Rua Rui Barbosa","Vila Aero Clube"],["15914-252","Rua Luiz Antonio Carcinoni","Vila Aero Clube"],["15914-254","Rua Gustavo de Godoy","Vila Aero Clube"],["15914-256","Rua Oswaldo Peterossi","Vila Aero Clube"],["15914-258","Rua Luiz Cestari","Vila Aero Clube"],["15914-260","Rua Coronel Medeiros","Vila Aero Clube"],["15914-262","Rua Francisco Alves","Vila Aero Clube"],["15914-264","Rua Noel Rosa","Vila Aero Clube"],["15914-266","Rua Carlos Gomes","Vila Aero Clube"],["15914-268","Rua 19 de Novembro","Vila Aero Clube"],["15914-270","Rua 15 de Novembro","Vila Aero Clube"],["15914-272","Rua 12 de Outubro","Vila Aero Clube"],["15914-274","Rua 06 de Agosto","Vila Aero Clube"],["15914-276","Rua 09 de Julho","Vila Aero Clube"],["15914-278","Rua 23 de Maio","Vila Aero Clube"],["15914-280","Rua 1º de Maio","Vila Aero Clube"],["15914-282","Rua 21 de Abril","Vila Aero Clube"],["15914-284","Rua 31 de Março","Vila Aero Clube"],["15914-286","Rua 25 de Março","Vila Aero Clube"],["15914-288","Rua Adelino Buzinaro","Vila Aero Clube"],["15914-290","Rua Adelino Buzinaro","Vila São Luiz"],["15914-292","Rua Marechal Deodoro da Fonseca","Vila São Luiz"],["15914-294","Rua Rui Barbosa","Vila São Luiz"],["15914-296","Rua Gustavo de Godoy","Vila São Luiz"],["15914-298","Rua Luiz Cestari","Vila São Luiz"],["15914-300","Rua Coronel Medeiros","Vila São Luiz"],["15914-310","Rua Coronel Medeiros","Jardim dos Affonsos"],["15914-312","Rua Doutor Carlos Kiellander","Jardim dos Affonsos"],["15914-314","Rua Marechal Deodoro da Fonseca","Jardim dos Affonsos"],["15914-316","Rua Adelino Buzinaro","Jardim dos Affonsos"],["15914-318","Rua 25 de Março","Jardim dos Affonsos"],["15914-320","Rua 31 de Março","Jardim dos Affonsos"],["15914-322","Rua 21 de Abril","Jardim dos Affonsos"],["15914-324","Rua 1º de Maio","Jardim dos Affonsos"],["15914-330","Rua 1º de Maio","Jardim São Cristovão"],["15914-332","Rua das Margaridas","Jardim São Cristovão"],["15914-334","Rua 09 de Julho","Jardim São Cristovão"],["15914-336","Rua das Papoulas","Jardim São Cristovão"],["15914-338","Rua 06 de Agosto","Jardim São Cristovão"],["15914-340","Rua 12 de Outubro","Jardim São Cristovão"],["15914-342","Rua das Camélias","Jardim São Cristovão"],["15914-344","Rua 15 de Novembro","Jardim São Cristovão"],["15914-346","Rua 19 de Novembro","Jardim São Cristovão"],["15914-348","Rua Oswaldo Peterossi","Jardim São Cristovão"],["15914-350","Rua Luiz Cestari","Jardim São Cristovão"],["15914-352","Rua Coronel Medeiros","Jardim São Cristovão"],["15914-354","Rua Doutor Carlos Kiellander","Jardim São Cristovão"],["15914-360","Rua Doutor Carlos Kiellander","Jardim Califórnia"],["15914-362","Rua Antonio da Silva","Jardim Califórnia"],["15914-364","Rua dos Jasmins","Jardim Califórnia"],["15914-366","Rua dos Lirios","Jardim Califórnia"],["15914-368","Rua das Palmas","Jardim Califórnia"],["15914-370","Rua das Rosas","Jardim Califórnia"],["15914-372","Rua dos Ipês","Jardim Califórnia"],["15914-374","Rua das Camélias","Jardim Califórnia"],["15914-376","Rua das Primaveras","Jardim Califórnia"],["15914-378","Rua das Papoulas","Jardim Califórnia"],["15914-380","Rua das Magnólias","Jardim Califórnia"],["15914-382","Rua das Margaridas","Jardim Califórnia"],["15914-384","Rua das Hortensias","Jardim Califórnia"],["15914-386","Rua das Begônias","Jardim Califórnia"],["15914-388","Rua das Acácias","Jardim Califórnia"],["15914-390","Rua das Açucenas","Jardim Califórnia"],["15914-400","Rua das Acácias","Vila São José"],["15914-402","Rua das Açucenas","Vila São José"],["15914-404","Rua das Orquideas","Vila São José"],["15914-406","Rua Marechal Deodoro da Fonseca","Vila São José"],["15914-408","Rua Tenente Mendes Jr.","Vila São José"],["15914-410","Rua Jeremias de Paula Eduardo","Vila São José"],["15914-412","Rua Doutor Carlos Kielander","Vila São José"],["15914-414","Rua Antonio da Silva","Vila São José"],["15914-416","Travessa Santa Inês","Vila São José"],["15914-418","Rua dos Jasmins","Vila São José"],["15914-420","Rua dos Lirios","Vila São José"],["15914-430","Rua dos Lirios","Residencial Primavera"],["15914-432","Rua das Begônias","Residencial Primavera"],["15914-434","Rua das Hortensias","Residencial Primavera"],["15914-436","Rua das Margaridas","Residencial Primavera"],["15914-438","Rua das Magnólias","Residencial Primavera"],["15914-440","Rua das Papoulas","Residencial Primavera"],["15914-442","Rua das Primaveras","Residencial Primavera"],["15914-444","Rua dos Ipês","Residencial Primavera"],["15914-446","Rua das Palmas","Residencial Primavera"],["15914-448","Rua Castro Alves","Residencial Primavera"],["15914-450","Rua Castro Alves","Jardim Primavera"],["15914-452","Rua dos Ipês","Jardim Primavera"],["15914-454","Rua das Primaveras","Jardim Primavera"],["15914-456","Rua das Papoulas","Jardim Primavera"],["15914-458","Rua das Magnólias","Jardim Primavera"],["15914-460","Rua das Margaridas","Jardim Primavera"],["15914-462","Rua das Begônias","Jardim Primavera"],["15914-470","Rua das Begônias","Jardim Paraíso"],["15914-472","Rua das Acácias","Jardim Paraíso"],["15914-474","Rua das Açucenas","Jardim Paraíso"],["15914-476","Rua das Orquideas","Jardim Paraíso"],["15914-478","Avenida Marechal Deodoro da Fonseca","Jardim Paraíso"],["15914-480","Rua Tenente Mendes Jr.","Jardim Paraíso"],["15914-482","Rua Jeremias de Paula Eduardo","Jardim Paraíso"],["15914-484","Praça dos Trabalhadores","Jardim Paraíso"],["15914-486","Rua Vera Lucia Colatrello Maran","Jardim Paraíso"],["15914-488","Rua Cica","Jardim Paraíso"],["15914-490","Rua dos Lirios","Jardim Paraíso"],["15914-492","Rua Tiradentes","Jardim Paraíso"],["15914-494","Rua Castro Alves","Jardim Paraíso"],["15914-496","Rua Umuarama","Jardim Paraíso"],["15914-498","Rua Novo Mundo","Jardim Paraíso"],["15914-500","Rua 03 de Agosto","Jardim Paraíso"],["15914-502","Rua Mirante do Paraíso","Jardim Paraíso"],["15914-504","Rua da Fraternidade","Jardim Paraíso"],["15914-506","Rua Sertaneja","Jardim Paraíso"],["15914-510","Rua da Fraternidade","Jardim Pizarro"],["15914-512","Rua Sertaneja","Jardim Pizarro"],["15914-514","Rua José Nunes de Oliveira","Jardim Pizarro"],["15914-516","Alameda Venâncio Morgado","Jardim Pizarro"],["15914-518","Avenida Marcos Salvador","Jardim Pizarro"],["15914-520","Rodovia José Pizarro","Jardim Pizarro"],["15914-522","Rua Cica","Jardim Pizarro"],["15914-524","Rua José Domingos Miranda","Jardim Pizarro"],["15914-526","Rua Salvador Alves Ferreira","Jardim Pizarro"],["15914-528","Rua Marechal Deodoro da Fonseca","Jardim Pizarro"],["15914-530","Rua das Orquideas","Jardim Pizarro"],["15914-532","Rua das Açucenas","Jardim Pizarro"],["15914-534","Rua das Acácias","Jardim Pizarro"],["15914-540","Rua das Acácias","Jardim Novo Paraíso"],["15914-542","Alameda Venâncio Morgado","Jardim Novo Paraíso"],["15914-544","Alameda Giacomo Fumis","Jardim Novo Paraíso"],["15914-546","Rua Raymundo Fernandes","Jardim Novo Paraíso"],["15914-548","Alameda Manoel de Oliveira","Jardim Novo Paraíso"],["15914-550","Alameda Nicácio Badaro","Jardim Novo Paraíso"],["15914-552","Avenida Marcos Salvador","Jardim Novo Paraíso"],["15914-554","Rua João Coelho","Jardim Novo Paraíso"],["15914-556","Rua Marechal Deodoro da Fonseca","Jardim Novo Paraíso"],["15914-558","Rua José Rossi","Jardim Novo Paraíso"],["15914-560","Alameda Henrique Penhalbel","Jardim Novo Paraíso"],["15914-562","Alameda João Thiago de Camargo","Jardim Novo Paraíso"],["15914-564","Rua Santo Marchetti","Jardim Novo Paraíso"],["15914-566","Rua Miguel Hernandes","Jardim Novo Paraíso"],["15914-568","Alameda Nelson da Rocha Tavares","Jardim Novo Paraíso"],["15914-570","Rua Arthur Anselmo Daneluzzi","Jardim Novo Paraíso"],["15914-572","Alameda Laura Panizza Pizarro","Jardim Novo Paraíso"],["15914-574","Alameda Alexandre Quadri","Jardim Novo Paraíso"],["15914-576","Alameda Henrique Afonso André","Jardim Novo Paraíso"],["15914-578","Alameda Joaquim de Oliveira Filho","Jardim Novo Paraíso"],["15914-580","Rua José Sebastião Dal Santo","Jardim Novo Paraíso"],["15914-582","Rua Hernesto Bucchi","Jardim Novo Paraíso"],["15914-584","Alameda Domingos Frasca","Jardim Novo Paraíso"],["15914-586","Travessa Pedro Zechinelli","Jardim Novo Paraíso"],["15914-588","Alameda Francisco Bruno Sobrinho","Jardim Novo Paraíso"],["15914-590","Rua Edson Rubens Devasio","Jardim Novo Paraíso"],["15914-592","Alameda Aylton Ulian","Jardim Novo Paraíso"],["15914-594","Rua João Faria da Silva","Jardim Novo Paraíso"],["15914-596","Alameda Joao Hernandes","Jardim Novo Paraíso"],["15914-598","Avenida Fugita","Jardim Novo Paraíso"],["15914-600","Avenida Fugita","Chácara Recreio"],["15914-602","Rodovia SP 305","Chácara Recreio"],["15914-610","Rua Antonio Maria Terron","Residencial Barbizan"],["15914-612","Rua Antonio Colla","Residencial Barbizan"],["15914-614","Rua Vicente Coghi","Residencial Barbizan"],["15914-616","Rua José Francisco dos Santos","Residencial Barbizan"],["15914-618","Rua Yolanda Pholio Branco","Residencial Barbizan"],["15914-620","Rua Yolanda Lourenço Barbizan","Residencial Barbizan"],["15914-622","Rua Batillo Martinelli","Residencial Barbizan"],["15914-624","Rua Doutor Antonio Garcia dos Santos Medeiros","Residencial Barbizan"],["15914-626","Rua Precedio Barbizan","Residencial Barbizan"],["15914-628","Travessa Hernani Soares","Residencial Barbizan"],["15914-630","Rua Soeli Branco Carnacchioni","Residencial Barbizan"],["15914-632","Rua Santina Sandalo Ferreira","Residencial Barbizan"],["15914-634","Rua Salvador Salvaterra Filho","Residencial Barbizan"],["15914-636","Rua Francisco Frigo","Residencial Barbizan"],["15914-640","Alameda Quinta do Monte","Residencial Quinta do Monte"],["15914-642","Alameda das Árvores","Residencial Quinta do Monte"],["15914-644","Alameda das Pedras","Residencial Quinta do Monte"],["15914-646","Alameda da Colina","Residencial Quinta do Monte"],["15914-648","Alameda dos Pássaros","Residencial Quinta do Monte"],["15914-650","Alameda das Flores","Residencial Quinta do Monte"],["15914-652","Alameda das Águas","Residencial Quinta do Monte"],["15914-654","Viela 4","Residencial Quinta do Monte"],["15914-656","Viela 3","Residencial Quinta do Monte"],["15914-700","Rua Edson Rubens Devasio","Residencial Real Paraíso"],["15914-702","Rua Rodolfo Mori","Residencial Real Paraíso"],["15914-704","Rua Doutor Edmar Morgado","Residencial Real Paraíso"],["15914-706","Rua Juvenal Ferraz de Arruda","Residencial Real Paraíso"],["15914-708","Rua Antonio Colla","Residencial Real Paraíso"],["15914-710","Rua José Palma","Residencial Real Paraíso"],["15914-712","Rua Antonio Orlando Pugliesi","Residencial Real Paraíso"],["15914-714","Rua Vicente Coghi","Residencial Real Paraíso"],["15914-716","Rua Antonio Coghi","Residencial Real Paraíso"],["15914-718","Rua Doutor Manoel Rodolfo Miranda","Residencial Real Paraíso"],["15914-720","Rua Atilio Mársico","Residencial Real Paraíso"],["15914-722","Rua Allan Kardec","Residencial Real Paraíso"],["15914-724","Rua Jesus Fernandes","Residencial Real Paraíso"],["15914-726","Rua Silvio Sérgio do Amaral","Residencial Real Paraíso"],["15914-728","Rua Yolanda Phólio Branco","Residencial Real Paraíso"],["15914-730","Rua Benedicto Moreira","Residencial Real Paraíso"],["15914-732","Avenida Maria Deamo Tárraga","Residencial Real Paraíso"],["15914-734","Rua Francisco Penhalber","Residencial Real Paraíso"],["15914-736","Rua José Avelino de Lima Filho","Residencial Real Paraíso"],["15914-738","Rua Um","Residencial Real Paraíso"],["15914-740","Rua Um","Residencial Real Park"],["15914-742","Rua Silvio Sergio do Amaral","Residencial Real Park"],["15914-744","Rua Luiz Germano Garbin","Residencial Real Park"],["15914-746","Rua Allan Kardec","Residencial Real Park"],["15914-748","Rua Francisco Penhalber","Residencial Real Park"],["15914-750","Rua Domingos Mendes","Residencial Real Park"],["15914-752","Rua Evani Scardelato Mantovani","Residencial Real Park"],["15914-754","Rua Antonio Salvador","Residencial Real Park"],["15914-756","Rua Jacyra Correia de Oliveira Garbin","Residencial Real Park"],["15914-758","Rua Amélia Lezo Madeo","Residencial Real Park"],["15914-760","Rua Luciano Bahdur","Residencial Real Park"],["15914-762","Rua Nelson Marchetti","Residencial Real Park"],["15914-764","Rua Josephina Sparano Salvaterra","Residencial Real Park"],["15916-000","Avenida Engenheiro Willian Cestari","Loteamento do Trevo"],["15916-002","Rua Projetada 01","Loteamento do Trevo"],["15916-004","Rua Projetada 02","Loteamento do Trevo"],["15916-010","Rua Willian Cestari","Jardim Erina"],["15916-012","Rua Wilson Martinelli","Jardim Erina"],["15916-014","Rua Machado de Assis","Jardim Erina"],["15916-016","Rua General Osorio","Jardim Erina"],["15916-018","Rua Humberto de Campos","Jardim Erina"],["15916-020","Rua Libero Badaro","Jardim Erina"],["15916-022","Rua José Bonifacio","Jardim Erina"],["15916-024","Rua Prudente de Moraes","Jardim Erina"],["15916-026","Rua Estevão Ivok","Jardim Erina"],["15916-030","Avenida Perdiz","Residencial Santa Clara"],["15916-032","Rua Gaivota","Residencial Santa Clara"],["15916-034","Rua Juriti","Residencial Santa Clara"],["15916-036","Rua Alice da Silva Cestari","Residencial Santa Clara"],["15916-038","Rua Luiz Antonio Cestari","Residencial Santa Clara"],["15916-040","Rua Alcides Cestari","Residencial Santa Clara"],["15916-042","Rua Beija Flor","Residencial Santa Clara"],["15916-044","Rua Sabiá","Residencial Santa Clara"],["15916-046","Rua Guará","Residencial Santa Clara"],["15916-048","Rua Bem Te Vi","Residencial Santa Clara"],["15916-050","Rua Canário","Residencial Santa Clara"],["15916-052","Rua Uirapuru","Residencial Santa Clara"],["15916-054","Rua Rouxinol","Residencial Santa Clara"],["15916-056","Rua Andorinha","Residencial Santa Clara"],["15916-058","Rua Cardeal","Residencial Santa Clara"],["15916-100","Rua Alípio Antonio Francisco","Jardim Santa Lúcia"],["15916-110","Avenida Engenheiro Willian Cestari","Jardim Bela Vista"],["15916-112","Avenida Nilton da Silva","Jardim Bela Vista"],["15916-114","Rua João Colatrelli","Jardim Bela Vista"],["15916-116","Rua Benedito de Souza Lima","Jardim Bela Vista"],["15916-118","Rua José Oliver Filho","Jardim Bela Vista"],["15916-120","Rua Chico Mendes Seringueiro","Jardim Bela Vista"],["15916-122","Rua Gilberto Pastre","Jardim Bela Vista"],["15916-124","Rua Manoel de Carvalho Lima","Jardim Bela Vista"],["15916-126","Rua Joaquim Pedro Alves","Jardim Bela Vista"],["15916-128","Rua Madre Assunta Marchetti","Jardim Bela Vista"],["15916-130","Avenida Moyses Bahdur","Jardim Bela Vista"],["15916-132","Rua João Amantea","Jardim Bela Vista"],["15916-134","Rua Antônio Manzoti","Jardim Bela Vista"],["15916-136","Rua Walter Basílio","Jardim Bela Vista"],["15916-138","Rua Desiderio Bertani","Jardim Bela Vista"],["15916-140","Rua Aparecido de Andrade","Jardim Bela Vista"],["15916-142","Rua Maria Aparecida Avelar de Godoy","Jardim Bela Vista"],["15916-144","Avenida Jacyr Germano Garbim","Jardim Bela Vista"],["15916-146","Avenida Nadir de Andrade","Jardim Bela Vista"],["15916-148","Rua Guido Dalceno","Jardim Bela Vista"],["15916-150","Rua João Consoni","Jardim Bela Vista"],["15916-152","Rua Cristiano Carlos Ehmke","Jardim Bela Vista"],["15916-154","Rua Lourenço Maracini","Jardim Bela Vista"],["15916-156","Rua Pedro Penhalber Molina","Jardim Bela Vista"],["15916-158","Rua Vereador João Gil","Jardim Bela Vista"],["15916-160","Rua Joanete Callegari","Jardim Bela Vista"],["15916-162","Avenida João Ulian","Jardim Bela Vista"],["15916-164","Rua Guerino Navarro","Jardim Bela Vista"],["15916-166","Rua Frei Antonio de Sant'Ana Galvão","Jardim Bela Vista"],["15916-168","Rua Professora Maria José da Costa Siqueira","Jardim Bela Vista"],["15916-170","Rua João Esteves de Lima","Jardim Bela Vista"],["15916-172","Rua Rômulo Bellochi","Jardim Bela Vista"],["15916-174","Rua Orico Campos Negreiros Junior","Jardim Bela Vista"],["15916-176","Rua Artur Esteves de Lima","Jardim Bela Vista"],["15916-178","Rua João Paulo","Jardim Bela Vista"],["15916-180","Rua Tomeo Fugita","Jardim Bela Vista"],["15916-182","Avenida Issa Bahdur","Jardim Bela Vista"],["15916-184","Avenida Jorge Bahdur","Jardim Bela Vista"],["15916-186","Rua Paschoale Di Madeo","Jardim Bela Vista"],["15916-190","Rua Pedro Penhalber Molina","Parque dos Ipês"],["15916-192","Rua Maria Cristina Gonçalves Breda Sans","Parque dos Ipês"],["15916-194","Rua Sebastião Alves Domingues","Parque dos Ipês"],["15916-196","Rua Paschoale Di Madeo","Parque dos Ipês"],["15916-198","Rua Joaquim Bacalhau","Parque dos Ipês"],["15916-200","Rua José Garcia","Parque dos Ipês"],["15916-202","Rua José Renato Sartorreto Seconi","Parque dos Ipês"],["15916-204","Rua Abel Madeo","Parque dos Ipês"],["15916-206","Rua Edgard Parada","Parque dos Ipês"],["15916-208","Rua Aparecida Baesso Infante","Parque dos Ipês"],["15916-210","Rua Francisco Garbin","Parque dos Ipês"],["15916-212","Rua Apparicio Garbin","Parque dos Ipês"],["15916-214","Avenida Clemente Bacalini","Parque dos Ipês"],["15916-216","Rua Aparecido Bueno da Silva","Parque dos Ipês"],["15916-218","Rua Guiomar Palla Barossi","Parque dos Ipês"],["15916-220","Rua Kosacu Umeda","Parque dos Ipês"],["15916-222","Rua Climaldo Aparecido Sicheroli","Parque dos Ipês"],["15916-224","Rua Pedro Cetroni","Parque dos Ipês"],["15916-226","Rua Arnaldo Franco Moraes","Parque dos Ipês"],["15916-228","Rua José Emilio Farhat","Parque dos Ipês"],["15916-260","Rua Pedro Penhalber Molina","Jardim Amélia"],["15916-262","Rua Amélia Buzinaro","Jardim Amélia"],["15916-264","Rua Júlia Seixas Garcia","Jardim Amélia"],["15916-266","Rua João Alberto Aidar Filho","Jardim Amélia"],["15916-268","Rua Dorival Faveri","Jardim Amélia"],["15916-270","Rua Virginio Mussato","Jardim Amélia"],["15916-272","Rua Vereador Luiz Carrieri Filho","Jardim Amélia"],["15916-274","Rua Samuel Fusco","Jardim Amélia"],["15916-276","Rua Shirley Aureo Ferreira","Jardim Amélia"],["15916-278","Rua José Garcia Cavalaro","Jardim Amélia"],["15916-280","Rua Luiz Perez Galindo","Jardim Amélia"],["15916-290","Avenida Engenheiro Willian Cestari","Jardim Acapulco"],["15916-292","Rua Antonio Carlos Feraudo","Jardim Acapulco"],["15916-294","Rua Alcebíades Leva","Jardim Acapulco"],["15916-296","Rua Waldomiro Seconi","Jardim Acapulco"],["15916-298","Rua Ângelo Dalseno Sobrinho","Jardim Acapulco"],["15916-300","Rua Gibrahin Abrão","Jardim Acapulco"],["15916-302","Avenida Vereador Ivo Gonçalves","Jardim Acapulco"],["15916-304","Rua José Irineu Grecco","Jardim Acapulco"],["15916-306","Rua Doutora Ana Cristina Croti Boer","Jardim Acapulco"],["15916-308","Rua Gabriel Branco","Jardim Acapulco"],["15916-310","Rua Michel Bahdur","Jardim Acapulco"],["15916-312","Rua Laércio Vieira","Jardim Acapulco"],["15916-314","Rua Osvaldo José da Silva","Jardim Acapulco"],["15916-316","Rua Tony Penhalber","Jardim Acapulco"],["15916-318","Rua João Valente da Costa","Jardim Acapulco"],["15916-320","Rua Vereador Diogo Simão Filho","Jardim Acapulco"],["15916-322","Rua Vereador Onério Zago","Jardim Acapulco"],["15916-324","Rua Loecio Paggioli","Jardim Acapulco"],["15916-326","Rua Alexandre Barrilari","Jardim Acapulco"],["15916-328","Rua Jeronymo Antônio de Oliveira","Jardim Acapulco"],["15916-330","Rua Márcio Matsuo","Jardim Acapulco"],["15916-332","Rua Maria Aparecida Marcondes Cotrim","Jardim Acapulco"],["15916-340","Rua Agostinho Picoli","Monte Alto"],["15916-350","Avenida Engenheiro Willian Cestari","Jardim Vera Cruz"],["15916-352","Avenida Jaime Mantovani","Jardim Vera Cruz"],["15916-354","Rua Naim Elias Haddad","Jardim Vera Cruz"],["15916-356","Rua João Batista Vrech","Jardim Vera Cruz"],["15916-358","Rua Vereador Doutor Nelson Rossi","Jardim Vera Cruz"],["15916-360","Rua Anézio Panichelli","Jardim Vera Cruz"],["15916-362","Avenida Antonio Conde","Jardim Vera Cruz"],["15916-364","Rua Benedito Tercini","Jardim Vera Cruz"],["15916-366","Rua Jean Francesco de Vitto Paula","Jardim Vera Cruz"],["15916-368","Rua Ana de Souza Callegari","Jardim Vera Cruz"],["15916-370","Rua Ioshio Hamma","Jardim Vera Cruz"],["15916-372","Rua Antonio Buzeto","Jardim Vera Cruz"],["15916-374","Rua João Pereira Ferraz","Jardim Vera Cruz"],["15916-376","Rua Antonio Zochi","Jardim Vera Cruz"],["15916-378","Rua Delfino Augusto","Jardim Vera Cruz"],["15916-380","Rua Francisco Buck Ferreira","Jardim Vera Cruz"],["15916-382","Avenida Hermenegildo Ulian","Jardim Vera Cruz"],["15916-384","Rua Vicente Afonso André","Jardim Vera Cruz"],["15916-386","Rua Rosina Daneluzzi","Jardim Vera Cruz"],["15916-388","Rua Francisca Maria da Silva","Jardim Vera Cruz"],["15916-390","Rua Joaquim Fenerich","Jardim Vera Cruz"],["15916-392","Rua Francisco Roberto Pissutti","Jardim Vera Cruz"],["15916-400","Avenida Engenheiro Willian Cestari","Jardim das Oliveiras"],["15916-402","Rua Alcir Zander Rossi","Jardim das Oliveiras"],["15916-404","Rua Antonio Buzeto","Jardim das Oliveiras"],["15916-406","Rua Francisco Ferreira Alves","Jardim das Oliveiras"],["15916-408","Rua Angelo Magri","Jardim das Oliveiras"],["15916-410","Rua Professor Antonio Celso de Arruda Campos","Jardim das Oliveiras"],["15916-412","Rua Antonio Moretti","Jardim das Oliveiras"],["15916-414","Rua Áureo Cavaletti","Jardim das Oliveiras"],["15916-416","Rua André Felipe Klem Fernandes","Jardim das Oliveiras"],["15916-418","Rua Walter de Oliveira","Jardim das Oliveiras"],["15916-420","Rua Vereador Aparecido Luiz Pavanelli","Jardim das Oliveiras"],["15916-422","Rua Masatsuki Hori","Jardim das Oliveiras"],["15916-424","Rua Florinda de Lima e Silva","Jardim das Oliveiras"],["15916-426","Rua Baptista Pinto Ferreira","Jardim das Oliveiras"],["15916-428","Rua Valdemar Izildo Maria","Jardim das Oliveiras"],["15916-430","Rua Eunice Araújo Zaupa","Jardim das Oliveiras"],["15916-432","Rua Antonio Gonçalves dos Santos Filho","Jardim das Oliveiras"],["15916-434","Rua Persídio Meira","Jardim das Oliveiras"],["15916-436","Rua Andrea de Cássia Doná de Lima","Jardim das Oliveiras"],["15916-438","Rua João Marcos Rodrigues da Silva","Jardim das Oliveiras"],["15916-440","Rua José Collatelli","Jardim das Oliveiras"],["15916-442","Rua Maria de Lourdes Nardoci Poli","Jardim das Oliveiras"],["15916-444","Rua Maria de Lourdes Piovesana Fredi","Jardim das Oliveiras"],["15916-446","Rua Jayme Carvalho","Jardim das Oliveiras"],["15916-448","Rua Marcos Pierre Vitória","Jardim das Oliveiras"],["15916-450","Rua João Batista da Silva","Jardim das Oliveiras"],["15916-460","Rua João Pereira Ferraz","Conjunto Habitacional São Miguel"],["15916-462","Rua Luiz Geraldo Pereira","Conjunto Habitacional São Miguel"],["15916-464","Rua Antonio Zochi","Conjunto Habitacional São Miguel"],["15916-466","Rua Oswaldo Dalseno","Conjunto Habitacional São Miguel"],["15916-468","Rua Arlindo José Jorge da Silva","Conjunto Habitacional São Miguel"],["15916-470","Rua Maria Moreira Derique","Conjunto Habitacional São Miguel"],["15916-472","Rua 8","Conjunto Habitacional São Miguel"],["15916-474","Rua Vicente Gagliardi","Conjunto Habitacional São Miguel"],["15916-476","Rua Jefferson Luís Minjoni","Conjunto Habitacional São Miguel"],["15916-478","Rua Kazuko Hori","Conjunto Habitacional São Miguel"],["15916-480","Rua Arlindo José Jorge da Silva","Jardim Cidade Sonho"],["15916-482","Rua Hélia Leva Penharbel","Jardim Cidade Sonho"],["15916-484","Rua João Batista Vrech","Jardim Cidade Sonho"],["15916-486","Rua Kazuko Hori","Jardim Cidade Sonho"],["15916-488","Rua Luiz Geraldo Pereira","Jardim Cidade Sonho"],["15916-490","Rua Projetada 3","Jardim Cidade Sonho"],["15916-492","Rua Projetada 4","Jardim Cidade Sonho"],["15916-494","Rua William Leva","Jardim Cidade Sonho"],["15916-500","Rua Adaucto Tavanelli","Jardim Mediterraneo"],["15916-502","Rua Amélia Rossi Pagnan","Jardim Mediterraneo"],["15916-504","Rua Pastor Antônio La Corte Caetano","Jardim Mediterraneo"],["15916-506","Rua Arlindo José Jorge da Silva","Jardim Mediterraneo"],["15916-508","Rua Espedito Rodrigues","Jardim Mediterraneo"],["15916-510","Rua Hélia Leva Penharbel","Jardim Mediterraneo"],["15916-512","Rua João Pagnan","Jardim Mediterraneo"],["15916-514","Rua Kazuko Hori","Jardim Mediterraneo"],["15916-520","Avenida Hermenegildo Ulian","Jardim Eldorado"],["15916-522","Rua Yasuzi Oikawa","Jardim Eldorado"],["15916-524","Rua Francisco Buck Ferreira","Jardim Eldorado"],["15916-526","Rua Luiz Pires","Jardim Eldorado"],["15916-528","Rua João Camassuti","Jardim Eldorado"],["15916-530","Rua Adilson Camassuti","Jardim Eldorado"],["15916-532","Rua Armando Jacinto Faria","Jardim Eldorado"],["15916-534","Rua Doutor Angelo Penharbel Júnior","Jardim Eldorado"],["15916-536","Rua Israel Affonso de André","Jardim Eldorado"],["15916-538","Rua Adão Paulo","Jardim Eldorado"],["15916-540","Rua João Roberto Carcinoni","Jardim Eldorado"],["15916-550","Rua Yasuzi Oikawa","Residencial Jardim San Remo"],["15916-552","Rua Francisco Roberto Pissutti","Residencial Jardim San Remo"],["15916-554","Rua Rosina Daneluzzi","Residencial Jardim San Remo"],["15916-556","Rua Antônio Justino Leite","Residencial Jardim San Remo"],["15916-558","Rua Joaquim Fenerich","Residencial Jardim San Remo"],["15916-560","Rua Expedicionário Mário de Vicente","Residencial Jardim San Remo"],["15916-562","Rua Adelino Fernandes","Residencial Jardim San Remo"],["15916-564","Rua Melvi de Oliveira","Residencial Jardim San Remo"],["15916-566","Rua Raimundo Apolinário Cadete","Residencial Jardim San Remo"],["15916-568","Rua Santina de Natali Thimotheo","Residencial Jardim San Remo"],["15916-570","Rua Doutor José Henrique Frascá","Residencial Jardim San Remo"],["15916-572","Rua Antonio Vicente dos Santos","Residencial Jardim San Remo"],["15916-574","Rua Sdevio Freschi","Residencial Jardim San Remo"],["15916-576","Rua Issao Nagassake","Residencial Jardim San Remo"],["15917-500","Avenida Lindolfo Augusto da Costa","Ibitirama"],["15917-502","Praça Rita Messias Adão","Ibitirama"],["15917-899","Área Rural","Área Rural de Monte Alto"],["15918-000","Rua João Luiz Gonzaga","Aparecida de Monte Alto"],["15918-002","Rua José Faccioli","Aparecida de Monte Alto"],["15918-004","Rua Bento Manoel de Siqueira","Aparecida de Monte Alto"],["15918-006","Rua Eugenio José de Moraes","Aparecida de Monte Alto"],["15918-008","Rua Florentino Ravazzi","Aparecida de Monte Alto"],["15918-010","Rua Arcanjo Motta","Aparecida de Monte Alto"],["15918-012","Rua Egidio Caetano Soave","Aparecida de Monte Alto"],["15918-014","Rua Florentino Julio de Carvalho","Aparecida de Monte Alto"],["15918-016","Rua Boanesio Gonçalves de Oliveira","Aparecida de Monte Alto"],["15918-018","Rua Joaquim Inocencio Pereira","Aparecida de Monte Alto"],["15918-020","Rua México","Aparecida de Monte Alto"],["15918-022","Rua Paschoal Nacaratto","Aparecida de Monte Alto"],["15918-024","Rua Altino Pereira Martins","Aparecida de Monte Alto"],["15918-026","Rua Bento Fonseca","Aparecida de Monte Alto"],["15918-028","Rua Antonio Mussato","Aparecida de Monte Alto"],["15918-030","Rua Joaquim Manoel Pontes","Jardim Canadá (Aparecida de Monte Alto)"],["15918-899","Área Rural","Área Rural de Aparecida de Monte Alto"]];
// ── Novo Cliente (botão do topo) — a tela da RECEPÇÃO ────────────────────
// Quem cadastra é a recepção, e a recepção não identifica benefício: o campo
// é opcional. Nada de caso aqui — o caso só nasce com procuração gerada e
// contrato assinado (decisão do Paulo, F25). O cliente entra 🟡 em
// atendimento na lista Escritório, com o relato como primeira anotação, e a
// advogada assume pela ficha.
// F197 · O CADASTRO EM DUAS ETAPAS (pedido do Paulo, 12.10.2026). Etapa 1:
// nome, CPF (o único obrigatório), senha do Meu INSS e telefone, e as guias
// dos portais para baixar o dossiê. A ficha nasce aqui, porque a extensão só
// prende o dossiê a cliente que já existe pelo CPF. Etapa 2: o resto do
// cadastro, que confere o que o dossiê trouxe ou preenche o que falta; ao
// concluir, o cliente vai à lista Escritório com a menção a Amanda e Paulo.
let _ncl = {etapa:1, id:null};
const NCL_PORTAIS = [["Meu INSS","https://meu.inss.gov.br/#/"], ["e-Recursos","https://consultaprocessos.inss.gov.br/"], ["Emprega Brasil","https://servicos.mte.gov.br/spme-v2/#/login"],
  ["HC Ribeirão","https://appiris.hcrp.usp.br/apex/r/iris/nossohcribeirao/login"], ["CadÚnico","https://cadunico.dataprev.gov.br/#/home"], ["Redesim","https://consultacnpj.redesim.gov.br/minhas-empresas"]];
function renderNovoCliente(){
  tituloLista("➕ Novo Cliente");
  const e2 = _ncl.etapa===2 && _ncl.id;
  document.getElementById("sub-lista").textContent = e2
    ? "Etapa 2 de 2: confira o que o dossiê trouxe ou preencha o restante. Ao concluir, o cliente entra na lista Escritório e Amanda e Paulo são avisados."
    : "Etapa 1 de 2: só o CPF é obrigatório. Com a ficha criada, abra os portais e baixe o dossiê; sem a senha do gov.br, siga para a etapa 2.";
  const passos = `<div class="ncl-passos"><span class="${e2?"feito":"cur"}">1 · Identificação e dossiê</span><span class="${e2?"cur":""}">2 · Cadastro e atendimento</span></div>`;
  document.getElementById("conteudo-meio").innerHTML = e2 ? `
    <div class="caso ncl-larga">${passos}
      <div id="ncl-dossie" class="ncl-dossie meio-sub">Lendo o que já chegou do dossiê…</div>
      <div class="form-linha"><input id="ncl-nome" placeholder="Nome completo" style="flex:1;min-width:320px;font-size:16px">
        <input id="ncl-dn" type="date" title="data de nascimento" onchange="mostrarIdadeNovo()"><span id="ncl-idade" class="meio-sub"></span></div>
      <div class="form-linha">
        <select id="ncl-sexo" title="entra no cálculo da data da aposentadoria">
          <option value="">sexo…</option><option value="M">Masculino</option><option value="F">Feminino</option>
        </select>
        <span id="ncl-civprof" class="meio-sub" style="align-self:center" title="o estado civil e a profissão só se preenchem pelo dossiê">Estado civil e profissão vêm do dossiê.</span>
      </div>
      <div class="form-linha">
        <input id="ncl-rua" placeholder="Endereço — comece a digitar a rua (lista de Monte Alto)"
          list="lista-ruas" style="flex:1;min-width:240px" oninput="conferirRuaNovo()">
        <input id="ncl-num" placeholder="nº" style="width:72px">
        <input id="ncl-cidade" value="Monte Alto" title="a maioria é de Monte Alto, mas dá para trocar — a lista de ruas só vale para Monte Alto"
          style="width:150px" oninput="conferirRuaNovo()">
        <select id="ncl-uf" title="UF">${UFS.map(u=>`<option${u==="SP"?" selected":""}>${u}</option>`).join("")}</select>
      </div>
      <datalist id="lista-ruas">${CEPS_MONTE_ALTO.map(r=>`<option value="${esc(r[1])} — ${esc(r[2])}">`).join("")}</datalist>
      <p id="ncl-cep-recado" class="meio-sub" style="margin:0 0 6px"></p>
      <div class="form-linha">
        <input id="ncl-caso" placeholder="Benefício — só se a pessoa já souber dizer (opcional)" list="lista-beneficios" style="flex:1;min-width:240px">
      </div>
      <datalist id="lista-beneficios">${D.docs.map(d=>`<option value="${esc(d.beneficio)}">`).join("")}</datalist>
      <div class="form-linha">
        <textarea id="ncl-relato" rows="3" style="flex:1;min-width:240px;border:1px solid var(--borda);border-radius:8px;padding:8px;font:inherit;font-size:13px;color:var(--texto);resize:vertical"
          placeholder="O que a pessoa veio buscar, do jeito que ela contou — vira a primeira anotação do atendimento"></textarea>
      </div>
      ${/* F127 · sem dossiê, o CNIS em PDF ainda entra por aqui */""}
      <div class="form-linha" style="align-items:center">
        <input type="file" id="ncl-cnis" accept="application/pdf" style="display:none"
          onchange="document.getElementById('ncl-cnis-nome').textContent=this.files[0]?this.files[0].name:''">
        <button class="cad-mini btn-sec" onclick="document.getElementById('ncl-cnis').click()"
          title="o Extrato Previdenciário (CNIS) do Meu INSS, em PDF">Inserir<span class="sr-only"> o CNIS (PDF)</span></button>
        <span id="ncl-cnis-nome" class="meio-sub"></span>
        <span class="meio-sub">sem o dossiê, o extrato lido aqui fica guardado na ficha</span>
      </div>
      <div class="form-linha" style="justify-content:space-between"><button class="btn-mini btn-sec" onclick="_ncl.etapa=1;renderNovoCliente()">Voltar</button>
        <button onclick="criarCliente()" title="Concluir cadastro">Concluir<span class="sr-only"> cadastro</span></button></div>
      <p style="font-size:12px;color:var(--cinza);margin-top:8px">O cliente vai à lista Escritório e ${esc(quemAvisaClienteNovo().map(x=>x.nome.split(" ")[0]).join(", ")||"os advogados")} recebem a menção para abrir o atendimento.</p>
    </div>` : `
    <div class="caso ncl-larga">${passos}
      ${_ncl.nomeBusca ? `<p class="ncl-da-busca">Nome trazido da pesquisa: <b>${esc(_ncl.nomeBusca)}</b>. Na etapa 2, o nome do CNIS tem preferência.</p>` : ""}
      <div class="form-linha">
        <input id="ncl-cpf" placeholder="CPF (só números) *" maxlength="14" oninput="conferirCpfNovo()">
        <input id="ncl-senha" placeholder="Senha Meu INSS" autocomplete="off"
          title="fica guardada com registro de quem copia ou vê, como na ficha">
        <button type="button" class="btn-mini" onclick="nclSenhaPadrao()" title="preenche a senha padrão do escritório, guardada neste computador">Senha<span class="sr-only"> padrão</span></button>
        <input id="ncl-tel" placeholder="Telefone/WhatsApp" value="(16) " oninput="nclConferirTel()" title="o DDD 16 é o padrão do escritório; troque-o se o número for de outra região">
      </div>
      <p id="ncl-cpf-recado" class="meio-sub" style="margin:0 0 6px"></p>
      <p id="ncl-tel-recado" class="meio-sub" style="margin:0 0 6px;color:var(--vermelho,#c0392b)"></p>
      <div class="ncl-dossie">
        <b>Baixe o dossiê:</b> com o gov.br do segurado logado, clique para abrir cada portal numa guia nova e rode a extensão
        do dossiê (🔁 Rodar todos os portais). O dossiê traz CNIS, RAIS, CAGED, seguro-desemprego, pedidos, laudos, exames e CNPJs, e a etapa 2 vira só conferência.
        <div class="form-linha" style="margin-top:8px;flex-wrap:wrap"><button type="button" class="ncl-todos" onclick="nclTodosPortais()" title="Abrir as seis guias"><span aria-hidden="true">Portais</span><span class="sr-only">Abrir as seis guias</span></button>${NCL_PORTAIS.map(([r,u])=>
          `<a class="cad-mini ncl-portal" href="${u}" target="_blank" rel="noopener" onclick="return nclPortal()">Abrir ${r}</a>`).join("")}</div>
        <span class="meio-sub" id="ncl-ficha-recado">${_ncl.id ? "Ficha criada ✔ — o dossiê baixado agora se prende a ela." : "O primeiro portal aberto já cria a ficha pelo CPF, para o dossiê se prender a ela. Sem a senha do gov.br, siga direto para a etapa 2."}</span>
      </div>
      <div class="form-linha" style="justify-content:flex-end"><button onclick="nclEtapa1()" title="Gravar e seguir para a etapa 2"><span aria-hidden="true">Seguir</span><span class="sr-only">Gravar e seguir para a etapa 2</span></button></div>
    </div>`;
  if(e2) nclPreencher();
}
function irNovoCliente(){
  if(semCadastro()) return;   // F396
  document.querySelectorAll(".lista-item").forEach(i=>i.classList.remove("ativa"));
  visao="novocliente"; limparBusca(); fecharMenuCel(); fecharFicha(false); render();
}
// F222 · o ＋ Cliente da pesquisa: o Novo Cliente abre do começo com o CPF no
// campo ou com o nome guardado para a ficha (só nome e sobrenome, ao menos)
function novoClienteDaBusca(t){
  if(semCadastro()) return;   // F396
  const d = String(t||"").replace(/\D/g,""), cpf = d.length===11 && cpfValido(d) ? d : "";
  const nome = !cpf && termosBusca(t).length>=2 ? tituloOrgao(String(t).trim().replace(/\s+/g," ").toUpperCase()) : "";
  _ncl = {etapa:1, id:null, nomeBusca:nome};
  irNovoCliente();
  const i = document.getElementById("ncl-cpf"); if(!i) return;
  if(cpf){ i.value = cpf; conferirCpfNovo(); }
  i.focus();
}
// a etapa 2 abre com o que a ficha já tem: o que o dossiê leu e o que a recepção digitou
// o que o dossiê diz do cadastro: nome e nascimento do CNIS, estado civil da
// qualificação do INSS (pedido ou laudo) e, como profissão, a ocupação (CBO)
// da RAIS mais recente. Tudo vai ao formulário só como sugestão a conferir.
const CIVIL_INSS = [[/^solteir/,"solteiro"],[/^casad/,"casado"],[/^(uni|companheir)/,"uniao"],[/^vi[uú]v/,"viuvo"],[/^(divorciad|separad|desquitad)/,"divorciado"]];
function cadastroDoDossie(docs){
  const r = {}, de = f => docs.filter(d=>d.texto && f.test(d.fonte||""));
  for(const d of de(/^CNIS/)){
    r.nome = r.nome || ((d.texto.match(/Nome:\s*(.+?)\s*$/m)||[])[1]||"");
    r.nascimento = r.nascimento || ((d.texto.match(/Data de nascimento:?\s*(\d{2}\/\d{2}\/\d{4})/i)||[])[1]||"");
  }
  // o estado civil na mesma linha do rótulo: em branco no cadastro, a linha seguinte não conta
  for(const d of de(/^(Cadastro|Processos administrativos|Laudos)/)){
    const m = d.texto.match(/Estado Civil:?[ \t]+([A-ZÀ-Úa-zà-ú]+)/); if(!m) continue;
    const c = CIVIL_INSS.find(([re])=>re.test(dsa(m[1]))); if(c){ r.civil = c[1]; break; }
  }
  const rais = de(/^CTPS RAIS CAGED/).flatMap(d=>lerRaisTexto(d.texto)).filter(b=>b.cbo).sort((a,b)=>b.ano.localeCompare(a.ano));
  const cad = de(/^Cadastro/).find(d=>/dados brutos do portal/.test(d.texto));
  if(cad) r.sexo = lerCadastroTexto(cad.texto).sexo;
  if(rais[0]) r.profissao = tituloOrgao(rais[0].cbo.replace(/\s+(de|da|do|das|dos|e)$/i,""));
  return r;
}
// DADOS CADASTRAIS · o .txt que a extensão monta do Meu INSS (Cadastro · Dados
// cadastrais (CNIS).txt): texto curto, sem PDF, por isso é a primeira leitura
// do Novo Cliente. O JSON do pé (filiadoTO) é a fonte; o texto de cima, a reserva.
function lerCadastroTexto(txt){
  const [cima, bruto] = String(txt||"").split("--- dados brutos do portal ---");
  let f = {}; try{ f = (JSON.parse(bruto||"{}").filiadoTO)||{}; }catch(e){}
  const e = f.enderecoPrincipalTO || {}, lin = re => ((cima||"").match(re)||[])[1] || "";
  const sx = String(f.sexo || lin(/^Sexo:\s*(\S+)/m)).trim().toUpperCase();
  return { nome: f.nome || lin(/^Nome:\s*(.+?)\s*$/m),
    nascimento: f.dataNascimentoAsString || lin(/^Nascimento:\s*(\d{2}\/\d{2}\/\d{4})/m),
    sexo: /^F/.test(sx) ? "F" : /^M/.test(sx) ? "M" : "",
    logradouro: e.logradouro || "", bairro: e.bairro || "", cep: String(e.cep||"").replace(/\D/g,""),
    cidade: e.municipio || "", uf: e.siglaUf || e.uf || "" };
}
// F202 · na Identificação, o estado civil e a profissão que faltam saem das
// outras peças do dossiê (pedido, laudo, RAIS), já lidas pelo CRM; grava no clique
// F236 · a qualificação da petição inicial (o texto que a coleta do PJe, do e-SAJ e do eproc já extraiu) completa o cadastro
// vazio: só os campos em branco, e só no clique, no molde da leitura do dossiê (F199, F202). A ficha do JEF sem CPF ficava sem
// portal do cliente, sem dossiê e com a peça cheia de lacunas, e o dado estava nos autos
const EC_QUALIF = [[/solteir/i,"solteiro"],[/casad/i,"casado"],[/divorciad|separad/i,"divorciado"],[/vi[úu]v/i,"viuvo"],[/uni[ãa]o est[áa]vel|convivente/i,"uniao"]];
function lerQualificacao(txt){
  const t = String(txt||"").replace(/\s+/g, " ").slice(0, 4000), q = {};
  const cpf = t.match(/\bCPF\b[^0-9]{0,30}(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/i); if(cpf) q.cpf = cpf[1].replace(/\D/g, "");
  const dn = t.match(/nascid[oa]\s+(?:em|aos?)\s+(\d{2}\/\d{2}\/\d{4})/i); if(dn) q.dn = dn[1];
  // F236 · a idade pode vir entre os campos ("viúva, auxiliar de limpeza, 64 anos, residente…" ou "viúva, 64 anos, auxiliar…")
  const ec = t.match(/,\s*(solteir[oa]|casad[oa]|divorciad[oa]|separad[oa]|vi[úu]v[oa]|em uni[ãa]o est[áa]vel|convivente)\s*,\s*(?:\d{1,3}\s*anos(?: de idade)?\s*,\s*)?([^,]{3,40}?)\s*,\s*(?:\d{1,3}\s*anos(?: de idade)?\s*,\s*)?(?:portador|inscrit|nascid|residente|RG\b|CPF\b)/i);
  if(ec){ q.estado_civil = (EC_QUALIF.find(([rx])=>rx.test(ec[1]))||[])[1]; if(!/^(brasileir|portador|inscrit)|\d+\s*anos/i.test(ec[2])) q.profissao = ec[2].trim(); }
  const rg = t.match(/\bRG\b(?:\s*n[º°o.]*)?\s*([\d.\-xX]{5,15})\s*([A-Z]{2,6}\/[A-Z]{2})?/); if(rg){ q.rg = rg[1]; if(rg[2]) q.rg_orgao = rg[2]; }
  const end = t.match(/residente(?: e domiciliad[oa])?\s+(?:na|no|à|em)\s+([^,]{4,80}?),\s*(?:n[º°o.]*\s*)?(\d+[A-Za-z]?|s\/n)\s*,\s*([^,]{2,60}?),\s*([^,\/]{2,60}?)\/([A-Z]{2})\s*,?\s*CEP\s*(\d{2}\.?\d{3}-?\d{3})/i);
  if(end) Object.assign(q, {logradouro:end[1].trim(), numero:end[2], bairro:end[3].trim(), cidade:end[4].trim(), uf:end[5].toUpperCase(), cep:end[6].replace(/\D/g, "")});
  return q;
}
// o que a petição inicial mais recente traz para os campos ainda vazios (o CPF de outro cadastro fica de fora)
function qualifDaInicial(c){
  const a = (D.anexos||[]).filter(x=>x.cliente_id===c.id && x.texto && /peti[çc][ãa]o inicial/i.test(x.nome||""))
    .sort((p, q)=>String(q.criado_em||"").localeCompare(String(p.criado_em||"")))[0];
  if(!a) return null;
  const q = lerQualificacao(a.texto), v = civilDe(c), novo = {};
  if(q.cpf && !c.cpf && q.cpf.length===11 && !D.clientes.some(x=>x.id!==c.id && digitosCpf(x.cpf)===q.cpf)) novo.cpf = q.cpf;
  if(q.dn && !c.dn && dnIso(q.dn.replace(/\D/g, ""))) novo.dn = q.dn;
  for(const k of ["estado_civil","profissao","rg","rg_orgao"]) if(q[k] && !v[k]) novo[k] = q[k];
  if(q.logradouro && !c.endereco && !v.logradouro) for(const k of ["logradouro","numero","bairro","cidade","uf","cep"]) novo[k] = q[k];
  return Object.keys(novo).length ? {novo, anexo:a} : null;
}
function qualificacaoCaixa(c){
  const r = qualifDaInicial(c); if(!r) return "";
  const n = r.novo, rotEc = ((CAD_CAMPOS.estado_civil.ops.find(o=>o[0]===n.estado_civil)||[])[1]) || "";
  const partes = [n.cpf && `CPF ${fmtCpf(n.cpf)}`, n.dn && `nascimento ${n.dn}`, rotEc && `estado civil ${rotEc}`, n.profissao && `profissão ${n.profissao}`,
    n.rg && `RG ${n.rg}${n.rg_orgao ? ` ${n.rg_orgao}` : ""}`, n.logradouro && `endereço ${n.logradouro}, nº ${n.numero}, ${n.bairro}, ${n.cidade}/${n.uf}, CEP ${fmtCep(n.cep)}`].filter(Boolean);
  return `<p class="pa-nome-dif" style="background:color-mix(in srgb,var(--verde,#1f6f5c) 8%,transparent);border-color:color-mix(in srgb,var(--verde,#1f6f5c) 30%,transparent)">
    <b>Da petição inicial${r.anexo.criado_em ? ` de ${fmt(String(r.anexo.criado_em).slice(0,10))}` : ""}:</b> ${esc(partes.join("; "))}. Confira com o documento antes de usar.
    <button type="button" class="btn-mini" onclick="abrirAnexo('${r.anexo.id}')">ver</button>
    <button type="button" class="btn-mini" onclick="usarQualificacao('${c.id}')" title="Usar no cadastro">Usar<span class="sr-only"> no cadastro</span></button></p>`;
}
async function usarQualificacao(cliId){
  const c = D.cliPorId.get(cliId), r = c && qualifDaInicial(c); if(!r) return;
  const n = r.novo, corpo = {};
  for(const k of ["cpf","estado_civil","profissao","rg","rg_orgao"]) if(n[k]) corpo[k] = n[k];
  if(n.dn) corpo.dn = n.dn.replace(/\D/g, "");   // a ficha guarda DDMMAAAA
  try{ if(Object.keys(corpo).length){ await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify(corpo)}); Object.assign(c, corpo); } }
  catch(e){ return aviso(/duplicate|unique/i.test(String(e.message||e)) ? "Esse CPF já está em outro cadastro" : "Não consegui guardar — tente de novo"); }
  if(n.logradouro && !await gravarEnderecoCli(cliId, {logradouro:n.logradouro, numero:n.numero, complemento:"", bairro:n.bairro, cidade:n.cidade, uf:n.uf, cep:n.cep}))
    return aviso("Os dados pessoais foram guardados, mas o endereço não — tente de novo");
  reindexarCliente(c); aviso("Cadastro completado pela petição inicial ✔"); montarSidebar(); abrirFicha(cliId);
}
function civilDoDossieCaixa(c){
  const v = civilDe(c); if(v.estado_civil && v.profissao && v.sexo) return "";
  const r = cadastroDoDossie(docsDoDossie(c.id).map(a=>({fonte:String(a.nome||"").split(" · ")[0], texto:a.texto||""})));
  const civil = !v.estado_civil && r.civil, prof = !v.profissao && r.profissao, sexo = !v.sexo && r.sexo;
  if(!civil && !prof && !sexo) return "";
  const rot = ((CAD_CAMPOS.estado_civil.ops.find(o=>o[0]===civil)||[])[1]) || "";
  return `<p class="pa-nome-dif" style="background:color-mix(in srgb,var(--verde,#1f6f5c) 8%,transparent);border-color:color-mix(in srgb,var(--verde,#1f6f5c) 30%,transparent)">
    <b>Do dossiê:</b> ${esc([sexo && `sexo ${sexo==="F"?"feminino":"masculino"}`, civil && `estado civil ${rot}`, prof && `profissão ${prof}`].filter(Boolean).join(", "))}.
    <button type="button" class="btn-mini" onclick="usarCivilDoDossie('${c.id}')" title="Usar no cadastro">Usar<span class="sr-only"> no cadastro</span></button></p>`;
}
async function usarCivilDoDossie(cliId){
  const c = D.cliPorId.get(cliId); if(!c) return;
  const v = civilDe(c), r = cadastroDoDossie(docsDoDossie(cliId).map(a=>({fonte:String(a.nome||"").split(" · ")[0], texto:a.texto||""})));
  const corpo = {}; if(!v.sexo && r.sexo) corpo.sexo = r.sexo; if(!v.estado_civil && r.civil) corpo.estado_civil = r.civil; if(!v.profissao && r.profissao) corpo.profissao = r.profissao;
  if(!Object.keys(corpo).length) return;
  try{ await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify(corpo)}); }
  catch(e){ return aviso("Não consegui guardar — tente de novo"); }
  Object.assign(c, corpo); aviso("Cadastro completado pelo dossiê ✔"); repintarFicha();
}
// rua em caixa alta vira "Rua Sete de Setembro", e o número que veio colado na
// rua passa ao campo do número
function enderecoArrumado(rua, num){
  let r = tituloOrgao(String(rua||"").trim()), n = String(num||"").trim();
  const m = r.match(/^(.*?)[,\s]+(?:n[º°o.]*\s*)?(\d+[A-Za-z]?)$/);
  if(m && !n){ r = m[1].trim(); n = m[2]; }
  return [r, n];
}
async function nclPreencher(){
  const id = _ncl.id;
  const [c] = await api(`/rest/v1/clientes?select=*&id=eq.${id}`).catch(()=>[]) || [];
  if(_ncl.id!==id || !document.getElementById("ncl-nome")) return;
  const cli = c || D.cliPorId.get(id); if(!cli) return;
  if(c){ const v = D.cliPorId.get(id); if(v) Object.assign(v, c); }
  const cv = civilDe(cli), pre = (k, v) => { const e = document.getElementById(k); if(e && v && !e.value) e.value = v; };
  // F202 · a primeira leitura é a do Cadastro (.txt de 4 KB, sem PDF): nome,
  // nascimento, sexo e endereço. O resto do dossiê fica para a Identificação.
  if(await adotarDossie(id, cli.cpf)) cli.dossie = (D.cliPorId.get(id)||{}).dossie || cli.dossie;
  const docs = (await api(`/rest/v1/anexos?select=nome,caminho,texto&origem=eq.dossie&cliente_id=eq.${id}`).catch(()=>[]) || [])
    .map(a=>({fonte:String(a.nome||"").split(" · ")[0], arq:String(a.nome||"").split(" · ")[1]||"", caminho:a.caminho, texto:a.texto||""}));
  const dc = docs.find(x=>x.fonte==="Cadastro" && /\.txt$/i.test(x.arq));
  if(dc && !dc.texto) dc.texto = await fetch(await linkArquivo(dc.caminho, 60)).then(r=>r.ok ? r.text() : "").catch(()=>"");
  if(_ncl.id!==id || !document.getElementById("ncl-nome")) return;
  const cad = dc && dc.texto ? lerCadastroTexto(dc.texto) : {}, dz0 = cadastroDoDossie(docs);
  _ncl.cad = cad;
  const daBusca = !!_ncl.nomeBusca && cli.nome===_ncl.nomeBusca;
  const nomeFicha = cli.nome && !/^Cliente \d{3}\./.test(cli.nome) && !daBusca ? cli.nome : "";
  pre("ncl-nome", nomeFicha || tituloOrgao(cad.nome || dz0.nome || "") || (daBusca ? cli.nome : ""));
  pre("ncl-dn", dnIso(cli.dn) || dnIso(cad.nascimento) || dnIso(dz0.nascimento)); mostrarIdadeNovo();
  pre("ncl-sexo", cv.sexo || cad.sexo);
  // estado civil e profissão só pelo dossiê: não há campo para digitar
  _ncl.dz = {civil:dz0.civil||"", profissao:dz0.profissao||""};
  const rotCivil = ((CAD_CAMPOS.estado_civil.ops.find(o=>o[0]===dz0.civil)||[])[1]) || "";
  document.getElementById("ncl-civprof").textContent = rotCivil || dz0.profissao
    ? `Do dossiê: ${[rotCivil && `estado civil ${rotCivil}`, dz0.profissao && `profissão ${dz0.profissao}`].filter(Boolean).join(", ")}.`
    : "Estado civil e profissão vêm do dossiê; ele ainda não os trouxe.";
  const doCad = !cv.logradouro && cad.logradouro;
  const [rua, num] = doCad ? enderecoArrumado(cad.logradouro, "") : enderecoArrumado(cv.logradouro, cv.numero);
  const cid = doCad ? cad.cidade : cv.cidade, uf = doCad ? cad.uf : cv.uf;
  pre("ncl-rua", rua); pre("ncl-num", num); if(cid){ document.getElementById("ncl-cidade").value = tituloOrgao(cid); }
  if(uf) document.getElementById("ncl-uf").value = uf;
  const PORT = {meuinss:"Meu INSS", mte:"Emprega Brasil", recursos:"e-Recursos", hc:"HC Ribeirão", redesim:"Redesim", cadunico:"CadÚnico", transparencia:"Portal da Transparência"};
  const dz = cli.dossie || {}, ks = Object.keys(dz);
  const el = document.getElementById("ncl-dossie");
  if(el) el.innerHTML = ks.length
    ? `<b>Dossiê:</b> ${esc(ks.map(k=>`${PORT[k]||k} em ${fmtBarra(String((dz[k]||{}).em||"").slice(0,10))}`).join("; "))}. Confira os campos abaixo, que vieram da ficha. <button class="btn-mini" onclick="nclPreencher()" title="Conferir de novo">Conferir<span class="sr-only"> de novo</span></button>`
    : `<b>Dossiê:</b> nenhum portal baixado até agora; preencha o cadastro. Se o dossiê for baixado depois, ele se prende à ficha pelo CPF. <button class="btn-mini" onclick="nclPreencher()" title="Conferir de novo">Conferir<span class="sr-only"> de novo</span></button>`;
}
// F32 · o CPF é a CHAVE da organização: mesmo com o nome escrito errado, é
// ele que vincula o cliente. O dígito verificador (módulo 11, regra pública
// da Receita) barra o CPF digitado errado antes de sujar a base.
function cpfValido(d){
  d = String(d||"").replace(/\D/g,"");
  if(d.length!==11 || /^(\d)\1{10}$/.test(d)) return false;
  for(const n of [9,10]){
    let s=0; for(let i=0;i<n;i++) s += Number(d[i])*(n+1-i);
    const dv=(s*10)%11%10;
    if(dv!==Number(d[n])) return false;
  }
  return true;
}
// enquanto a recepção digita, a resposta aparece LOGO ABAIXO: CPF já
// cadastrado mostra o dono e o atalho para o cadastro (pedido do Paulo)
// F125 · digitou o CPF, o CRM diz de quem é — QUANDO ELE JÁ SABE. Não há
// consulta ao cadastro da Receita aqui, e inventar nome seria pior que pedir
// para digitar. O que existe é memória própria: ficha já cadastrada, e o nome
// que veio de um requerimento importado do PAT e ainda não virou ficha.
function nomeConhecidoPeloCpf(d){
  const c = D.clientes.find(x=>digitosCpf(x.cpf)===d);
  if(c) return {nome:c.nome, cliente:c, de:"ficha já cadastrada"};
  const p = (typeof planoPat!=="undefined" && planoPat)
    ? (planoPat.semCliente||[]).find(x=>digitosCpf(x.cpf)===d && x.nome) : null;
  if(p) return {nome:p.nome, pat:p, de:`requerimento ${p.protocolo} importado do PAT`};
  return null;
}
async function conferirCpfNovo(){
  const el=document.getElementById("ncl-cpf-recado"); if(!el) return;
  const d=((document.getElementById("ncl-cpf")||{}).value||"").replace(/\D/g,"");
  if(d.length<11){ el.innerHTML=""; return; }
  const achado = nomeConhecidoPeloCpf(d);
  // o nome entra sozinho no campo vazio, e o recado diz de onde ele veio
  if(achado && achado.pat){
    // a etapa 1 não pede nome: o do PAT vai à ficha, e a etapa 2 o mostra para conferir
    _ncl.nomePat = achado.nome;
    el.innerHTML=`<span style="color:var(--verde)">✓ <b>${esc(achado.nome)}</b> —
      nome trazido do ${esc(achado.de)}. Confira antes de cadastrar.</span>`;
    return;
  }
  const jaTem=achado ? achado.cliente
    : (await api(`/rest/v1/clientes?select=*&cpf=eq.${d}`).catch(()=>[]) || [])[0];
  if(jaTem && !D.cliPorId.has(jaTem.id)){ D.clientes.push(jaTem); D.cliPorId.set(jaTem.id, jaTem); }
  if(jaTem){
    const ks=(D.casosDoCliente.get(jaTem.id)||[]).filter(k=>k.fase!=="encerrado");
    el.innerHTML=`<span style="color:var(--laranja)">⚠ Este CPF já é de
      <b>${esc(jaTem.nome)}</b>${ks.length?` · ${ks.length} processo(s) em aberto`:""} —
      não cadastre de novo.</span>
      <button class="trilho-mais" onclick="abrirFicha('${jaTem.id}')" title="Abrir o cadastro"><span aria-hidden="true">Cadastro</span><span class="sr-only">Abrir o cadastro</span></button>`;
  } else if(!cpfValido(d)){
    el.innerHTML=`<span style="color:var(--laranja)">✗ CPF inválido — confira os números
      (ou apague e cadastre sem CPF, para completar depois).</span>`;
  } else {
    el.innerHTML=`<span style="color:var(--verde)">✓ CPF livre — nenhum cadastro com este número.</span>`;
  }
}
// a rua digitada contra a lista de CEPs: escolhida da lista ("Rua — Bairro")
// ou digitada por inteiro quando o nome só existe num bairro
function ruaNovoAchada(){
  // a lista de CEPs é a de MONTE ALTO: cliente de outra cidade não casa
  // com ela — o endereço grava como digitado, com a cidade informada
  const cid=((document.getElementById("ncl-cidade")||{}).value||"Monte Alto").trim();
  if(dsa(cid)!=="monte alto") return null;
  const t=((document.getElementById("ncl-rua")||{}).value||"").trim();
  if(!t) return null;
  const cheia=CEPS_MONTE_ALTO.find(r=>r[1]+" — "+r[2]===t);
  if(cheia) return cheia;
  const so=CEPS_MONTE_ALTO.filter(r=>dsa(r[1])===dsa(t));
  return so.length===1 ? so[0] : null;
}
function conferirRuaNovo(){
  const el=document.getElementById("ncl-cep-recado"); if(!el) return;
  const t=((document.getElementById("ncl-rua")||{}).value||"").trim();
  const cid=((document.getElementById("ncl-cidade")||{}).value||"").trim();
  const foraDaCidade=dsa(cid)!=="monte alto";
  const r=ruaNovoAchada();
  el.textContent = r ? `CEP ${r[0]} · ${r[2]} · Monte Alto/SP`
    : t ? (foraDaCidade
        ? `endereço de ${cid||"outra cidade"} — grava como digitado e o CEP se completa depois, na ficha`
        : "rua fora da lista de Monte Alto — grava como digitada e o CEP se completa depois, na ficha") : "";
  el.style.color = r ? "var(--verde)" : "var(--cinza-claro)";
}
// F28: cliente novo da recepção avisa os ADVOGADOS — a triagem começa com
// eles. Mesma escolha de ⚙️ do aviso de caso novo; quem cadastrou não se
// avisa. A menção nasce sem caso (ainda não existe), presa ao cliente.
// F219 · o mesmo aviso serve ao passo seguinte do atendimento (texto próprio)
async function avisarClienteNovo(cliId, textoDado){
  const c=D.cliPorId.get(cliId);
  const alvos=quemAvisaClienteNovo().filter(x=>x.id!==eu.id);
  const texto=textoDado||`Cliente novo na recepção: ${(c&&c.nome)||"cliente"} — abrir o atendimento (Primeiro atendimento e Análise de Direito)`;
  for(const co of alvos)
    await api(`/rest/v1/mencoes`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({de_id:eu.id, para_id:co.id, cliente_id:cliId, texto})})
      .catch(()=>api(`/rest/v1/mencoes`,{method:"POST",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({de_id:eu.id, para_id:co.id, texto})}).catch(()=>{}));
  return alvos.length;
}
// CPF que já está no sistema não vira cliente novo: cadastrar de novo
// espalharia o mesmo cliente em duas fichas e os andamentos ficariam
// divididos entre elas. A janela avisa e leva para a ficha que já existe.
function avisoCpfRepetido(cli, nomeDigitado){
  const ks=(D.casosDoCliente.get(cli.id)||[]);
  const ativos=ks.filter(k=>k.fase!=="encerrado");
  document.getElementById("modal").innerHTML=`
    <div class="modal-fundo">
      <div class="modal-cx">
        <div class="modal-cab">
          <div><strong>⚠ Este CPF já tem cadastro</strong>
            <div class="meio-sub">Cadastrar de novo criaria duas fichas do mesmo cliente, com os
              andamentos divididos entre elas. Abra a ficha que já existe e acrescente o caso novo lá.</div></div>
          <button class="btn-mini" onclick="fecharEscolha()" title="voltar ao cadastro">✕</button>
        </div>
        <div class="caso" style="margin:0 0 12px">
          <div class="rotulo-caso">Cadastro que já existe</div>
          <div class="titulo-caso">${esc(cli.nome)}</div>
          <div class="meio-sub">${fmtCpf(cli.cpf)}${cli.telefone?" · "+esc(cli.telefone):""} ·
            ${ativos.length} processo(s) em aberto${ks.length>ativos.length?` (e ${ks.length-ativos.length} encerrado(s))`:""}</div>
          ${nomeDigitado && dsa(nomeDigitado)!==dsa(cli.nome)
            ? `<div class="meio-sub" style="color:var(--laranja);margin-top:6px">Você digitou
                “${esc(nomeDigitado)}” — confira se é a mesma pessoa antes de seguir.</div>`:""}
        </div>
        <div class="form-linha" style="margin:0">
          <button onclick="fecharEscolha();abrirFicha('${cli.id}')" title="Abrir a ficha deste cliente"><span aria-hidden="true">Ficha</span><span class="sr-only">Abrir a ficha deste cliente</span></button>
          <button class="btn-mini" onclick="fecharEscolha()" title="Voltar e corrigir o CPF"><span aria-hidden="true">Corrigir</span><span class="sr-only">Voltar e corrigir o CPF</span></button>
        </div>
      </div>
    </div>`;
  document.getElementById("modal").style.display="block";
}
// a idade aparece já no cadastro: confere o ano digitado errado na hora
function mostrarIdadeNovo(){
  const v=document.getElementById("ncl-dn").value, el=document.getElementById("ncl-idade");
  if(!el) return;
  const i=v ? idadeDe(v.slice(8,10)+v.slice(5,7)+v.slice(0,4)) : null;
  el.textContent = i==null ? "" : `${i} anos`;
}
// etapa 1: grava a ficha com o que houver, para o dossiê se prender a ela pelo CPF
// abrir um portal cria a ficha antes, para a extensão prender o dossiê a ela pelo CPF
function nclPortal(){
  const cpf=((document.getElementById("ncl-cpf")||{}).value||"").replace(/\D/g,"");
  if(!_ncl.id && !cpfValido(cpf)){ aviso("Preencha um CPF válido antes de abrir os portais: é ele que prende o dossiê à ficha"); return false; }
  if(!_ncl.id) nclEtapa1(false);
  return true;
}
// um clique abre as seis guias; o navegador só deixa a primeira abrir sem a
// permissão de pop-up do CRM, e o recado diz como dar essa permissão uma vez
// a senha padrão não vai no código, porque o CRM é publicado em página pública:
// fica guardada no computador de quem a digitou uma vez.
// shortcut: guardada por navegador, e não no banco; troca-se com esquecer("crm_senha_padrao") no console.
// celular começa com 9 e tem nove dígitos depois do DDD
function telRecado(t){
  const n = String(t||"").replace(/\D/g,"").slice(2);
  return n.startsWith("9") && n.length!==9 ? `O número começa com 9, que é de celular, e tem ${n.length} ${n.length===1?"dígito":"dígitos"} depois do DDD; o celular tem 9.` : "";
}
function nclConferirTel(){ document.getElementById("ncl-tel-recado").textContent = telRecado(document.getElementById("ncl-tel").value); }
function nclSenhaPadrao(){
  const i = document.getElementById("ncl-senha"), r = document.getElementById("ncl-cpf-recado"), p = ler("crm_senha_padrao");
  if(p){ i.value = p; r.textContent = "Senha padrão preenchida."; return; }
  if(!i.value.trim()){ r.textContent = "Digite a senha padrão no campo e clique de novo: ela fica guardada neste computador."; i.focus(); return; }
  guardar("crm_senha_padrao", i.value.trim()); r.textContent = "Senha padrão guardada neste computador; o próximo clique já a preenche.";
}
function nclTodosPortais(){
  if(!nclPortal()) return;
  const abertas = NCL_PORTAIS.map(([, u])=>window.open(u, "_blank", "noopener")).filter(Boolean).length;
  const r = document.getElementById("ncl-ficha-recado");
  if(r && abertas < NCL_PORTAIS.length) r.innerHTML = `O navegador bloqueou ${NCL_PORTAIS.length - abertas} das ${NCL_PORTAIS.length} guias. Clique no ícone de pop-up bloqueado, no fim da barra de endereço, escolha <b>Sempre permitir</b> para o CRM e clique de novo em Abrir as seis guias.`;
}
async function nclEtapa1(seguir=true){
  if(_ncl.id){ if(seguir){ _ncl.etapa=2; renderNovoCliente(); } return; }
  const nome=_ncl.nomePat||_ncl.nomeBusca||"";
  const cpf=document.getElementById("ncl-cpf").value.replace(/\D/g,"");
  if(!cpf) return aviso("Preencha o CPF: é ele que prende o dossiê à ficha");
  // F32 · CPF digitado errado não entra: a base se organiza pelo CPF
  if(!cpfValido(cpf)) return aviso("CPF inválido — confira os números");
  // procura na memória e confirma no banco: outro colaborador pode ter
  // cadastrado o mesmo cliente enquanto esta tela estava aberta
  let jaTem = D.clientes.find(c=>digitosCpf(c.cpf)===cpf);
  if(!jaTem){
    const achados = await api(`/rest/v1/clientes?select=*&cpf=eq.${cpf}`).catch(()=>[]);
    if(achados && achados.length){ jaTem=achados[0]; D.clientes.push(jaTem); D.cliPorId.set(jaTem.id, jaTem); }
  }
  if(jaTem) return avisoCpfRepetido(jaTem, nome);
  // F225 · a agenda e a anotação rápida criam a ficha sem CPF: a mesma pessoa não ganha uma segunda
  const tel = document.getElementById("ncl-tel").value.trim();
  const pre = preCadastroDe(nome, tel);
  if(pre && await confirmar(`Já existe o pré-cadastro de ${pre.nome}${pre.telefone?`, telefone ${pre.telefone}`:""}, criado sem CPF (agenda ou anotação rápida).\n\nCompletar essa ficha com o CPF ${fmtCpf(cpf)}, em vez de criar outra?`)){
    const corpo = {cpf, ...(!pre.telefone && soDig(tel).length>2 ? {telefone:tel} : {})};
    try{ await api(`/rest/v1/clientes?id=eq.${pre.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify(corpo)}); }
    catch(e){ return aviso("Não consegui completar o pré-cadastro — tente de novo"); }
    Object.assign(pre, corpo); reindexarCliente(pre);
    const senhaP=document.getElementById("ncl-senha").value.trim();
    if(senhaP) await api(`/rest/v1/credenciais`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({cliente_id:pre.id, tipo:"meu_inss", valor:senhaP})}).catch(()=>aviso("A ficha gravou, mas a senha não — cadastre de novo pela ficha"));
    _ncl = {etapa: seguir ? 2 : 1, id:pre.id, nomeBusca:_ncl.nomeBusca};
    if(!seguir){ aviso("Pré-cadastro completado com o CPF ✔ — rode a extensão do dossiê", false); return; }
    aviso("Pré-cadastro completado com o CPF ✔ — agora a etapa 2", false);
    return renderNovoCliente();
  }
  const campos={atendimento:[{em:new Date().toISOString(), quem:(eu.nome||"").split(" ")[0], texto:"Cliente cadastrado na recepção."}]};
  const [cli]=await api(`/rest/v1/clientes`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify({nome: nome || `Cliente ${fmtCpf(cpf)}`, cpf, telefone:(t => t.replace(/\D/g,"").length > 2 ? t : null)(document.getElementById("ncl-tel").value.trim()), campos})});
  D.clientes.push(cli); D.cliPorId.set(cli.id, cli);
  // a senha do Meu INSS entra pelo MESMO caminho da ficha (credenciais,
  // com registro de quem copia ou vê)
  const senha=document.getElementById("ncl-senha").value.trim();
  if(senha) await api(`/rest/v1/credenciais`,{method:"POST",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({cliente_id:cli.id, tipo:"meu_inss", valor:senha})}).catch(()=>
      aviso("O cliente gravou, mas a senha não — cadastre de novo pela ficha"));
  _ncl = {etapa: seguir ? 2 : 1, id:cli.id, nomeBusca:_ncl.nomeBusca};
  if(!seguir){ const r=document.getElementById("ncl-ficha-recado"); if(r && !/bloqueou/.test(r.textContent)) r.textContent="Ficha criada ✔ — o dossiê baixado agora se prende a ela."; aviso("Ficha criada ✔ — rode a extensão do dossiê", false); return; }
  aviso("Ficha criada ✔ — agora a etapa 2", false);
  renderNovoCliente();
}
// a ficha sem CPF da mesma pessoa: o telefone (oito últimos dígitos) ou o nome igual
function preCadastroDe(nome, tel){
  const t8 = soDig(tel).slice(-8), nm = dsa(nome||"").replace(/\s+/g," ").trim();
  const sem = (D.clientes||[]).filter(c=>!digitosCpf(c.cpf));
  return (t8.length===8 && sem.find(c=>soDig(c.telefone).slice(-8)===t8))
    || (nm.split(" ").length>=2 && sem.find(c=>dsa(c.nome||"").replace(/\s+/g," ").trim()===nm)) || null;
}
// os avisos do cliente novo vão a Amanda e Paulo, além de quem a configuração indicar
function quemAvisaClienteNovo(){
  const ativos = equipeAtiva(), vistos = new Set(), out = [];
  for(const co of [...ativos.filter(c=>/^(amanda|paulo)\b/i.test(dsa(c.nome||""))), ...quemAvisaCasoNovo()])
    if(!vistos.has(co.id)){ vistos.add(co.id); out.push(co); }
  return out;
}
// etapa 2: completa a ficha, leva à lista Escritório e avisa Amanda e Paulo
async function criarCliente(){
  const id=_ncl.id, cli=id && D.cliPorId.get(id);
  if(!cli) return aviso("Comece pela etapa 1");
  const nome=document.getElementById("ncl-nome").value.trim();
  const dnIsoV=document.getElementById("ncl-dn").value;
  const especie=document.getElementById("ncl-caso").value.trim();
  const relato=((document.getElementById("ncl-relato")||{}).value||"").trim();
  const campos={...(cli.campos||{})};
  if(relato) campos.atendimento=[...(campos.atendimento||[]), {em:new Date().toISOString(), quem:(eu.nome||"").split(" ")[0], texto:relato}];
  const corpo={campos, sexo:document.getElementById("ncl-sexo").value||null};
  if((_ncl.dz||{}).civil) corpo.estado_civil = _ncl.dz.civil;
  if((_ncl.dz||{}).profissao) corpo.profissao = _ncl.dz.profissao;
  if(nome) corpo.nome=nome;
  if(dnIsoV) corpo.dn=fmt(dnIsoV).replace(/\./g,"");
  try{ await api(`/rest/v1/clientes?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"}, body:JSON.stringify(corpo)}); Object.assign(cli, corpo); }
  catch(e){ return aviso("Não consegui gravar a etapa 2 — tente de novo"); }
  // benefício conhecido vira PRÉ-CASO (F226: linha de casos na fase Escritório)
  if(especie) await gravarPrecasos(id, [...precasosDe(cli), {id:"pc_"+Date.now().toString(36), especie,
    natureza:"", marc:{}, honorarios:"", quem:eu.id, em:hoje()}]);
  // o endereço grava pelo MESMO caminho da ficha (colunas + espelho da
  // procuração); rua da lista traz CEP, bairro e Monte Alto/SP de brinde
  const rua=ruaNovoAchada(), ruaTxt=document.getElementById("ncl-rua").value.trim();
  const num=document.getElementById("ncl-num").value.trim();
  const mesmaRuaCad = !!(_ncl.cad && _ncl.cad.logradouro) && nomeIgual(enderecoArrumado(_ncl.cad.logradouro, "")[0], ruaTxt);
  const cidTxt=document.getElementById("ncl-cidade").value.trim();
  const ufTxt=document.getElementById("ncl-uf").value;
  if(rua||ruaTxt) await gravarEnderecoCli(id, {
    logradouro: rua?rua[1]:ruaTxt.split("—")[0].trim(), numero:num, complemento:"",
    // rua digitada fora da lista: bairro e CEP do Cadastro do Meu INSS, se é a mesma rua
    bairro: rua?rua[2]:(mesmaRuaCad ? tituloOrgao(_ncl.cad.bairro||"") : ""), cidade: rua?"Monte Alto":cidTxt, uf: rua?"SP":ufTxt,
    cep: rua?soDigitos(rua[0]):(mesmaRuaCad ? _ncl.cad.cep||"" : "")});
  const avisados=await avisarClienteNovo(id);
  // F127 · o CNIS escolhido no cadastro é lido agora, já com o cliente gravado
  const cnisArq=(document.getElementById("ncl-cnis")||{}).files; const cnis=cnisArq&&cnisArq[0];
  _ncl = {etapa:1, id:null};
  await carregar(); montarSidebar();
  if(cnis) await processarCnis(id, cnis);
  aviso(`Cadastro concluído ✔ — na lista Escritório${avisados?` · ${avisados} avisado(s) para a triagem`:""}`);
  visao="fase:escritorio"; render();
  subCad="triagem";
  await abrirFicha(id);
}

// ── visão 🤖 Claude (sugestões com aprovação humana) ─────────────────────
function renderClaude(){
  tituloLista("🤖 Claude");
  document.getElementById("sub-lista").textContent=
    "Sugestões geradas automaticamente pela rotina diária — nada vale sem a sua aprovação. Aceitar aplica na hora (exigência, andamento ou mensagem).";
  const ICONE={exigencia:"⚠",prazo:"⏰",pericia:"🩺",mensagem:"💬",proximo_passo:"👉"};
  document.getElementById("conteudo-meio").innerHTML = D.sugestoes.map(s=>{
    const k=s.caso_id&&D.casoPorId.get(s.caso_id), c=k&&D.cliPorId.get(k.cliente_id);
    return `<div class="sug">
      <div class="cab"><span>${ICONE[s.tipo]||"💡"}</span><strong>${esc(s.titulo)}</strong>
        ${c?`<button class="btn-mini" onclick="abrirFicha('${c.id}')">${esc(c.nome)}</button>`:""}
        <span class="chip neutro">${fmtTS(s.criado_em)}</span></div>
      <div class="texto">${esc(s.texto)}</div>
      <div class="acoes">
        <button class="aceitar" onclick="decidirSugestao('${s.id}','aceita')">✔ Aceitar</button>
        <button class="descartar" onclick="decidirSugestao('${s.id}','descartada')">✕ Descartar</button>
      </div></div>`;
  }).join("") || `<p class="meio-sub">Nenhuma sugestão pendente. A rotina roda todo dia útil de manhã.</p>`;
}
async function decidirSugestao(id, status){
  const s=D.sugestoes.find(x=>x.id===id);
  if(status==="aceita" && s){
    const dados=s.dados||{};
    if(dados.exigencia_prazo && s.caso_id)
      await patchCaso(s.caso_id, {exigencia_prazo:dados.exigencia_prazo,
          exigencia_descricao:dados.exigencia_descricao||s.texto.slice(0,300)});
    if(dados.andamento && s.caso_id){
      const claude=D.colaboradores.find(c=>c.inicial==="C");
      await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({caso_id:s.caso_id, autor_id:claude?claude.id:null, texto:dados.andamento})});
    }
    if(dados.mensagem) await copiar(dados.mensagem,"Mensagem copiada — cole no WhatsApp 💬");
  }
  await api(`/rest/v1/sugestoes?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({status, decidido_por:eu.id, decidido_em:new Date().toISOString()})});
  D.sugestoes=D.sugestoes.filter(x=>x.id!==id);
  aviso(status==="aceita"?"Sugestão aplicada ✔":"Descartada");
  montarSidebar(); render();
}

// ── 📥 Menções (caixa de entrada) ─────────────────────────────────────────
function renderMencoes(){
  tituloLista("📥 Menções");
  document.getElementById("sub-lista").textContent=
    "Pendências em que alguém citou você: @ num andamento, caso novo ou cliente novo da recepção aguardando o primeiro atendimento.";
  document.getElementById("conteudo-meio").innerHTML = D.mencoes.map(m=>{
    const de=D.colPorId.get(m.de_id), k=m.caso_id&&D.casoPorId.get(m.caso_id),
          c=(k&&D.cliPorId.get(k.cliente_id)) || (m.cliente_id&&D.cliPorId.get(m.cliente_id)) || null;
    return `<div class="mencao">
      <div class="cab">${de?`<span class="avatar mini" style="background:${de.cor}">${esc(de.inicial)}</span><strong>${esc(de.nome)}</strong>`:""}
        <span class="chip neutro">${fmtTS(m.criado_em)}</span>
        ${c?`<span class="chip fase">${esc(c.nome)}</span>`:""}</div>
      <div class="texto">${esc(m.texto)}</div>
      <div class="acoes">
        ${m.conversa_id?`<button class="btn-mini" onclick="abrirConversaDaMencao('${m.conversa_id}')" title="abrir conversa"><span aria-hidden="true">Conversa</span><span class="sr-only">abrir conversa</span></button>`:""}
        ${/* F220 · a menção leva ao lugar do trabalho: o caso citado ou o atendimento do cliente novo */""}
        ${!podeGravarCaso()?"":k?`<button class="btn-mini forte" onclick="abrirCasoDaMencao('${k.cliente_id}','${k.id}','${m.andamento_id||""}')" title="abrir o caso"><span aria-hidden="true">Abrir</span><span class="sr-only">abrir o caso</span></button>`
          : c && !(D.casosDoCliente.get(c.id)||[]).some(x=>x.fase!=="encerrado" && !ehPreCaso(x)) ? `<button class="btn-mini forte" onclick="abrirAtendimentoDe('${c.id}')" title="abrir o atendimento"><span aria-hidden="true">Atendimento</span><span class="sr-only">abrir o atendimento</span></button>` : ""}
        ${c?`<button class="btn-mini" onclick="abrirFicha('${c.id}')" title="abrir ficha"><span aria-hidden="true">Ficha</span><span class="sr-only">abrir ficha</span></button>`:""}
        ${botoesResposta(m)}
        <button class="btn-mini" onclick="lerMencao('${m.id}')">✔ resolvida</button>
      </div></div>`;
  }).join("") || "<p class='meio-sub'>Caixa vazia: nada pendente para você. 🎉</p>";
}
// F187 · o aviso de transferência (ou @ na nota) leva direto à conversa
function abrirConversaDaMencao(conversaId, acao, msgId){
  zapAberta = conversaId; zapPainelAberto = false; zapLerAoAbrir = conversaId;
  // F396 · o botão do aviso: Responder põe o cursor no campo, Ouvir toca o áudio (sem o gesto, o navegador pode barrar: fica o balão em destaque)
  zapDoAviso = acao ? {conversa: conversaId, acao, msgId} : null;
  visao = "whatsapp"; render();
}
let zapDoAviso = null;
function aplicarZapDoAviso(id){
  const a = zapDoAviso; if(!a || a.conversa!==id) return; zapDoAviso = null;
  if(a.acao==="responder"){ const t = document.getElementById("zap-txt"); if(t) t.focus(); return; }
  if(a.acao==="ouvir" && a.msgId){
    irParaMsg(a.msgId);
    const b = document.querySelector(`#zb-${CSS.escape(a.msgId)} .zp-play`); if(b) b.click();
  }
}
// F236 · o mesmo gesto fecha a menção: concluir a tarefa ou marcar o andamento como lido baixa a menção a mim dele
async function baixarMencoes(andIds){
  const ms = (D.mencoes||[]).filter(m=>m.andamento_id && andIds.includes(m.andamento_id) && m.para_id===eu.id);
  if(!ms.length) return;
  await api(`/rest/v1/mencoes?id=in.(${ms.map(m=>m.id).join(",")})`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({lida_em:new Date().toISOString()})}).catch(()=>{});
  const fora = new Set(ms.map(m=>m.id)); D.mencoes = D.mencoes.filter(m=>!fora.has(m.id));
}
// F292 · responder a menção num clique, como o "(ME): Ok." do To Do: a resposta vai à linha do tempo do caso, em
// resposta à anotação que citou, quem citou recebe o aviso, e a menção sai da caixa (Onda B do fluxo do To Do)
function botoesResposta(m){
  if(m.caso_id ? !podeGravarCaso() : !m.cliente_id) return "";   // F355 · o "Ok" e o "Feito" gravam no caso; F447 · a menção sem caso (cliente novo, balcão) responde a quem citou
  return ["Ok","Feito"].map(r=>`<button class="btn-mini menc-resp" onclick="event.stopPropagation();responderMencao('${m.id}','${r}.')" title="responder &quot;${r}.&quot; no caso e dar a menção por lida">${r}</button>`).join("");
}
async function responderMencao(id, txt){
  const m = (D.mencoes||[]).find(x=>x.id===id); if(!m) return;
  if(!m.caso_id){   // F447 · sem caso não há linha do tempo: a resposta vai a quem citou, presa à ficha
    if(!m.cliente_id) return;
    const de = D.colPorId.get(m.de_id), cli = D.cliPorId.get(m.cliente_id);
    if(de && de.id!==eu.id) await api(`/rest/v1/mencoes`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({de_id:eu.id, para_id:de.id, cliente_id:m.cliente_id,
        texto:`${(eu.nome||"").split(" ")[0]} respondeu "${txt}"${cli?` sobre ${cli.nome}`:""}`})}).catch(()=>{});
    await lerMencao(id).catch(()=>{});
    return aviso(`✔ Respondido: ${txt}`, false);
  }
  const de = D.colPorId.get(m.de_id), k = D.casoPorId.get(m.caso_id), cli = k && D.cliPorId.get(k.cliente_id);
  const texto = de && de.id!==eu.id ? `@${de.nome.split(" ")[0]} ${txt}` : txt;
  let and;
  try{ [and] = await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:m.caso_id, autor_id:eu.id, texto, ...(m.andamento_id?{responde_a:m.andamento_id}:{})})}) || []; }
  catch(e){ return aviso("A resposta não gravou — tente de novo"); }
  if(and && Array.isArray(D._andsFicha) && k && clienteAberto===k.cliente_id) D._andsFicha.unshift(and);
  if(de && de.id!==eu.id) api(`/rest/v1/mencoes`,{method:"POST",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({de_id:eu.id, para_id:de.id, caso_id:m.caso_id, ...(and?{andamento_id:and.id}:{}),
      texto:`${(eu.nome||"").split(" ")[0]} respondeu "${txt}"${cli?` sobre ${cli.nome}`:""}`})}).catch(()=>{});
  await lerMencao(id).catch(()=>{});
  aviso(`✔ Respondido: ${txt}`, false);
}
async function lerMencao(id){
  await api(`/rest/v1/mencoes?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({lida_em:new Date().toISOString()})});
  D.mencoes=D.mencoes.filter(m=>m.id!==id);
  montarSidebar(); render();
}
async function criarMencoes(texto, casoId, andamentoId, extras, conversaId){
  const ids=new Set((extras||[]).filter(id=>id!==eu.id));
  const casados=new Set();
  equipeAtiva().forEach(co=>{ if(co.id===eu.id) return;
    const bate = new RegExp("@"+co.nome.split(" ")[0]+"\\b","i").test(texto) ||
                 new RegExp("@"+co.inicial+"\\b").test(texto);
    if(bate){ ids.add(co.id); casados.add(co.nome.split(" ")[0].toLowerCase()); } });
  // F41 · @Fulano que não é ninguém da equipe não pode morrer calado: quem
  // escreveu acha que avisou e ninguém recebeu
  const perdidas=[...String(texto||"").matchAll(/(?<!\S)@(\p{L}{2,})/gu)]
    .map(m=>m[1]).filter(n=>!casados.has(dsa(n)) &&
      !equipeAtiva().some(co=>dsa(co.nome.split(" ")[0])===dsa(n)||co.inicial.toLowerCase()===n.toLowerCase()));
  if(perdidas.length) aviso(`⚠ @${perdidas[0]} não é ninguém da equipe — a menção não foi criada`);
  const alvos=D.colaboradores.filter(co=>ids.has(co.id));
  for(const co of alvos)
    await api(`/rest/v1/mencoes`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({de_id:eu.id, para_id:co.id, caso_id:casoId,
        andamento_id:andamentoId, texto, ...(conversaId?{conversa_id:conversaId}:{})})});
  if(alvos.length) aviso("📥 "+alvos.map(a=>a.nome).join(", ")+(alvos.length>1?" serão avisados":" será avisado"));
}

// F10 · CASO NOVO AVISA QUEM DECIDE
// Caso nasce e ninguém fica sabendo até abrir a lista. Quem decide estratégia
// precisa ver o caso novo no dia em que ele nasce, não na revisão de 90 dias.
//
// Quem recebe sai de ⚙️ Configurações. Sem escolha gravada, o padrão são os
// advogados ativos — que no escritório são exatamente Paulo, Marcos e Amanda.
// Ninguém se avisa a si mesmo, então quem cria o caso não recebe menção.
function quemAvisaCasoNovo(){
  const ativos = equipeAtiva();
  const escolhidos = String(cfgApp("avisar_caso_novo")||"").split(",").filter(Boolean);
  return escolhidos.length ? ativos.filter(c=>escolhidos.includes(c.id))
                           : ativos.filter(c=>c.cargo==="advogado");
}
async function avisarCasoNovo(casoId, cliId, comoNasceu){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const c = D.cliPorId.get(cliId);
  const alvos = quemAvisaCasoNovo().filter(x=>x.id!==eu.id);
  if(!alvos.length) return;
  const texto = `Caso novo: ${tituloCaso(k)} — ${(c&&c.nome)||"cliente"}`
    + (comoNasceu?` (${comoNasceu})`:"");
  for(const co of alvos)
    await api(`/rest/v1/mencoes`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({de_id:eu.id, para_id:co.id, caso_id:casoId, texto})}).catch(()=>{});
}

// ── 📄 Modelos de documentos (gerenciar) ──────────────────────────────────
function renderModelosDoc(){
  tituloLista("📄 Modelos de documentos");
  document.getElementById("sub-lista").textContent=
    "Os modelos-ouro do escritório. Use {nome}, {cpf}, {endereco}, {nb}, {processo}, {beneficio}, {data} — na ficha do cliente eles saem preenchidos. Cole aqui os textos do site interno.";
  document.getElementById("conteudo-meio").innerHTML =
    D.docModelos.map(m=>`<div class="modelo">
      <div class="cab"><strong>${esc(m.titulo)}</strong>
        <span class="chip neutro">${esc(m.categoria)}</span>
        <button class="btn-mini" onclick="editarModeloDoc('${m.id}')">✏ editar</button></div>
      <div class="previa">${esc(m.conteudo.slice(0,220))}${m.conteudo.length>220?"…":""}</div>
      <div id="ed-doc-${m.id}"></div>
    </div>`).join("")
    + `<div class="form-linha" style="margin-top:14px">
        <input id="nd-titulo" placeholder="título do novo modelo" style="min-width:220px">
        <input id="nd-cat" placeholder="categoria (geral ou benefício)" value="geral">
        <button onclick="novoModeloDoc()" title="Criar modelo">Criar<span class="sr-only"> modelo</span></button>
      </div>`;
}
function editarModeloDoc(id){
  const m=D.docModelos.find(x=>x.id===id), div=document.getElementById("ed-doc-"+id);
  if(div.innerHTML){ div.innerHTML=""; return; }
  div.innerHTML=`<textarea class="doc-edit" id="txt-doc-${id}" style="min-height:220px">${esc(m.conteudo)}</textarea>
    <div class="form-linha"><button onclick="salvarModeloDoc('${id}')" title="Salvar modelo">Salvar<span class="sr-only"> modelo</span></button></div>`;
}
async function salvarModeloDoc(id){
  const m=D.docModelos.find(x=>x.id===id);
  m.conteudo=document.getElementById("txt-doc-"+id).value;
  await api(`/rest/v1/modelos_documento?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({conteudo:m.conteudo})});
  aviso("Modelo salvo 📄"); renderModelosDoc();
}
async function novoModeloDoc(){
  const t=document.getElementById("nd-titulo").value.trim();
  if(!t) return;
  const [m]=await api(`/rest/v1/modelos_documento`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify({titulo:t, categoria:document.getElementById("nd-cat").value.trim()||"geral",
      conteudo:"[cole aqui o texto do modelo — use {nome}, {cpf}, {data}...]"})});
  D.docModelos.push(m); montarSidebar(); renderModelosDoc(); aviso("Modelo criado — clique em ✏ para colar o texto");
}

// ── 📌 Quadro Kanban (fases) ──────────────────────────────────────────────
const COLUNAS_QUADRO=[["escritorio","🙋 Escritório"],["inss","🌻 INSS"],
  ["conselho","🖥 Conselho"],["judicial","👪 Judicial"],["pagamento","💰 Pagamento"]];
function kcardCaso(k){
  const c=D.cliPorId.get(k.cliente_id);
  const quem=(D.atrDoCaso.get(k.id)||[]).map(id=>D.colPorId.get(id)).filter(Boolean);
  const dp = diasParado(k);
  return `<div class="kcard${dp!==null?" parado":""}" draggable="true" data-caso="${k.id}" data-casos="${k.id}" data-cli="${c?c.id:""}">
    <div class="nome">${esc(c?c.nome:k.titulo)}</div>
    <div class="meta">${k.beneficio?`<span class="chip ben">${esc(k.beneficio)}</span>`:""}${seloParado(k)}${k.trilha&&k.trilha.velha?`<span class="chip" title="um fato oficial mais novo contradiz a etapa">etapa desatualizada</span>`:""}
      ${chipExig(k)}${chipPrazo(k.prazo)}${quem.map(q=>`<span class="avatar mini" style="background:${q.cor}" title="${esc(q.nome)}">${esc(q.inicial)}</span>`).join("")}</div></div>`;
}
// O "Agrupar por" do Planner: o mesmo quadro, em colunas por fase, por responsável ou pelo prazo fatal, numa tela só.
// Por fase e por responsável o cartão se arrasta (muda a fase, ou passa o caso de uma pessoa para outra); pelo prazo,
// não, porque prazo fatal não se muda arrastando.
const AGRUPAR_QUADRO = [["fase","Fase"],["etapa","Etapa"],["responsavel","Responsável"],["prazo","Prazo fatal"]];
// F441 · o Quadro por etapa (do Trello): escolhida a fase, uma coluna por etapa do catálogo; arrastar declara a etapa
// (F119: a etapa continua declarada, agora em massa, sem abrir ficha)
const FASES_QUADRO_ETAPA = ["escritorio","inss","conselho","judicial","pagamento"];
const quadroFase = () => { const f = ler("crm_quadro_fase"); return FASES_QUADRO_ETAPA.includes(f) ? f : "inss"; };
const quadroLim = () => Math.max(0, Math.round(+(ler("crm_quadro_lim")||0)) || 0);
// F441 · caso parado: sem anotação da equipe há mais de 30 dias (o and30 só alcança 30 dias, daí o "mais de 30")
function diasParado(k){
  if(!D.and30 || ehPreCaso(k)) return null;
  const u = ultimoRegistro(k), n = u ? diasEntreIso(u, hoje()) : null;
  return !u ? 31 : n>30 ? n : null;
}
