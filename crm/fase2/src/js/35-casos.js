// ── ⇄ fundir dois casos ──────────────────────────────────────────────────
// Pedido negado que virou recurso, recurso que virou ação judicial: é o
// MESMO caso em fases diferentes (o do Adalto: aposentadoria negada +
// recurso administrativo eram dois). A fusão move todo o histórico do caso
// incorporado para o destino — andamentos, perícias, tarefas, pagamentos,
// atribuições — e junta protocolos, nups, blocos do recurso e marcadores.
// Campo do destino preenchido à mão NUNCA é sobrescrito (só o vazio herda).
//
// O incorporado: se nasceu no CRM/PAT (sem tarefa no To Do), é removido; se
// veio do To Do, vira casca encerrada — apagar faria a sincronização
// recriá-lo do zero — e a tarefa dele PRECISA ser concluída no To Do,
// senão a próxima sincronização reabre a casca.
function janelaFundir(destinoId){
  fecharJanela();
  const d=D.casoPorId.get(destinoId); if(!d) return;
  const outros=(D.casosDoCliente.get(d.cliente_id)||[]).filter(x=>x.id!==destinoId);
  if(!outros.length) return aviso("Este cliente só tem um caso — não há o que fundir");
  const div=document.createElement("div"); div.id="janela";
  div.innerHTML=`<div class="jan-caixa">
    <h3>⇄ Fundir para dentro de: ${esc(tituloCaso(d))}</h3>
    <p class="meio-sub" style="margin-top:6px">Pedido → recurso → judicial é uma sequência só.
      Escolha o caso a incorporar: TODO o histórico dele passa para este — nada se apaga.</p>
    ${outros.map(o=>`<label style="display:block;margin:7px 0;cursor:pointer">
      <input type="radio" name="fd" value="${o.id}">
      <b>${esc(tituloCaso(o))}</b>
      <span class="meio-sub">${esc(listaDe(o)!=="—"?listaDe(o):(NOME_FASE[o.fase]||""))}${o.fase==="encerrado"?" · ✔ encerrado":""}</span>
    </label>`).join("")}
    <div class="form-linha" style="margin-top:10px">
      <button id="fd-ok">⇄ Fundir</button>
      <button class="btn-mini" id="fd-nao">cancelar</button>
    </div>
  </div>`;
  document.body.appendChild(div);
  document.getElementById("fd-ok").onclick=()=>{
    const sel=div.querySelector("input[name=fd]:checked");
    if(!sel) return aviso("Escolha o caso a incorporar");
    fecharJanela(); fundirCasos(sel.value, destinoId);
  };
  document.getElementById("fd-nao").onclick=fecharJanela;
}
// F221 · {quieto}: no lote, sem confirmar, sem recarregar e sem repintar; devolve o
// registro do que passou ao destino (ids por tabela), que é o que permite desfazer
async function fundirCasos(absorvidoId, destinoId, opts={}){
  const a=D.casoPorId.get(absorvidoId), d=D.casoPorId.get(destinoId);
  if(!a || !d || a.id===d.id) return null;
  await casoInteiro(a, d);   // F379
  if(!opts.quieto && !await confirmar(`Fundir "${tituloCaso(a)}" para dentro de "${tituloCaso(d)}"?\n\n`
    +`Todo o histórico passa para o destino. `
    +(a.todo_task_id
      ?"O caso incorporado fica como casca encerrada, e a sincronização do To Do não o reabre."
      :"O caso incorporado (criado no CRM) será removido."))) return null;
  const falhas=[];
  const t=async(rotulo,f)=>{ try{ await f(); }catch(e){ falhas.push(rotulo); } };
  const registro = {de:a.id, para:d.id, fase:a.fase, ids:{}};
  for(const tab of ["tarefas","pagamentos","andamento_tarefas","meu_dia","eventos","anexos"])
    registro.ids[tab] = ((await api(`/rest/v1/${tab}?caso_id=eq.${absorvidoId}&select=id`).catch(()=>[]))||[]).map(r=>r.id);
  // F843 · o andamento que o destino já tem (mesma origem e origem_id, ou a mesma mensagem: o banco não deixa repetir)
  // fica no incorporado. Um só repetido derrubava o lote inteiro e o histórico não saía da casca.
  const chAnd = x => [x.zap_mensagem_id && "zap|"+x.zap_mensagem_id, x.origem_id && x.origem+"|"+x.origem_id].filter(Boolean);
  const andsDe = id => todas("andamentos", `select=id,origem,origem_id,zap_mensagem_id&caso_id=eq.${id}`).catch(()=>[]);
  const jaTem = new Set((await andsDe(destinoId)).flatMap(chAnd));
  registro.ids.andamentos = (await andsDe(absorvidoId)).filter(x=>!chAnd(x).some(c=>jaTem.has(c))).map(x=>x.id);
  for(let i=0; i<registro.ids.andamentos.length; i+=80)
    await t("andamentos", ()=>api(`/rest/v1/andamentos?id=in.(${registro.ids.andamentos.slice(i, i+80).join(",")})`,{method:"PATCH",
      headers:{Prefer:"return=minimal"}, body:JSON.stringify({caso_id:destinoId})}));

  // filhos em lote (id preservado — a sincronização não duplica depois); F843 · os documentos vão junto
  for(const tab of ["tarefas","pagamentos","andamento_tarefas","meu_dia","anexos"])
    await t(tab, ()=>api(`/rest/v1/${tab}?caso_id=eq.${absorvidoId}`,{method:"PATCH",
      headers:{Prefer:"return=minimal"}, body:JSON.stringify({caso_id:destinoId})}));
  // eventos um a um: a trinca caso+tipo+data é única — o repetido no destino
  // é o MESMO agendamento, então a cópia do incorporado se apaga
  const evs=await api(`/rest/v1/eventos?caso_id=eq.${absorvidoId}&select=id`).catch(()=>[])||[];
  for(const e of evs)
    await t("evento", async()=>{
      try{ await api(`/rest/v1/eventos?id=eq.${e.id}`,{method:"PATCH",
        headers:{Prefer:"return=minimal"}, body:JSON.stringify({caso_id:destinoId})}); }
      catch(err){ /* F844 · o mesmo agendamento já está no destino: a cópia fica na casca, nada se apaga */ }
    });
  // atribuições: quem já está no destino não entra duas vezes
  const atrA=await api(`/rest/v1/atribuicoes?caso_id=eq.${absorvidoId}&select=colaborador_id`).catch(()=>[])||[];
  const atrD=new Set(D.atrDoCaso.get(destinoId)||[]);
  for(const r of atrA)
    if(!atrD.has(r.colaborador_id))   // F844 · quem já está no destino fica também na casca: nada se apaga
      await t("atribuição", ()=>api(`/rest/v1/atribuicoes?caso_id=eq.${absorvidoId}&colaborador_id=eq.${r.colaborador_id}`,
        {method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({caso_id:destinoId})}));

  // campos: o destino manda; só o vazio herda. Listas se somam.
  const corpo={};
  for(const f of ["nb","processo","especie","beneficio","der","dib","dii","dat","dcb",
                  "parceria","processo_link","situacao_inss","cadunico","resultado","gratuidade"])
    if(!d[f] && a[f]) corpo[f]=a[f];
  corpo.protocolos=[...new Set([...(d.protocolos||[]),...(a.protocolos||[])])];
  // F220 · os NBs e os processos do incorporado não se perdem quando o destino
  // já tem os seus, e o protocolo que só ele tinha ganha a marca que a
  // sincronização respeita (a tarefa do destino no To Do não o cita)
  const nbsNovos = nbsDoCaso(a).filter(n=>!nbsDoCaso(d).some(x=>soDig(x)===soDig(n)) && soDig(n)!==soDig(corpo.nb));
  if(nbsNovos.length) corpo.nbs=[...(Array.isArray(d.nbs)?d.nbs:[]), ...nbsNovos];
  const procsD = processosDoCaso(d), procsNovos = processosDoCaso(a).filter(p=>!procsD.some(x=>soDig(x.numero)===soDig(p.numero)));
  if(procsNovos.length) corpo.processos=[...procsD, ...procsNovos].map(p=>({numero:p.numero, nosso:p.nosso!==false, acompanhar:p.acompanhar!==false,
    ...(p.rotulo?{rotulo:p.rotulo}:{}), ...(p.papelFixo?{papel:p.papelFixo}:{}), ...(p.classe?{classe:p.classe}:{}), ...(p.orgao?{orgao:p.orgao}:{}), ...(p.ajuizado?{ajuizado:p.ajuizado}:{})}));
  if(a.datajud_multi) corpo.datajud_multi={...a.datajud_multi, ...(d.datajud_multi||{})};
  const nups=[...new Set([...nupsDoCaso(d),...nupsDoCaso(a)])];
  if(nups.length){ corpo.crps_nups=nups; corpo.crps_nup=null; }
  const blocos=[...blocosDoCaso(d)];
  for(const b of blocosDoCaso(a))
    if(!blocos.some(x=>soDig(x.nup)===soDig(b.nup))) blocos.push(b);
  if(blocos.length) corpo.crps=blocos;
  const marc=[...new Set([...(d.marcadores||[]),...(a.marcadores||[])])];
  if(marc.length) corpo.marcadores=marc;
  if(a.urgente && !d.urgente) corpo.urgente=true;
  if(a.importante && !d.importante) corpo.importante=true;
  if(!d.datajud && a.datajud) corpo.datajud=a.datajud;
  if(!d.trf3 && a.trf3) corpo.trf3=a.trf3;
  // as marcas de número levado ("mov:") e de fusão são do incorporado, não do destino
  const arqA = Object.fromEntries(Object.entries(a.arquivados||{}).filter(([ch])=>!/^mov:/.test(ch) && ch!=="fundido"));
  corpo.arquivados={...arqA,...(d.arquivados||{})};
  for(const p of protocolosDoCaso(a)) if(!protocolosDoCaso(d).includes(p)) corpo.arquivados[`add:prot:${p}`]={de:a.id, por:eu.id, em:new Date().toISOString()};
  // F221 · o que a fusão pôs no destino, para o desfazer tirar (campos herdados e itens somados às listas)
  const fora = (x, y) => (x||[]).filter(v=>!(y||[]).includes(v));
  registro.volta = {herdou:Object.keys(corpo).filter(f=>!["protocolos","nbs","processos","datajud_multi","crps_nups","crps_nup","crps","marcadores","arquivados"].includes(f)),
    prot:fora(protocolosDoCaso(a), protocolosDoCaso(d)), nbs:nbsNovos.map(soDig), proc:procsNovos.map(p=>soDig(p.numero)),
    dj:fora(Object.keys(a.datajud_multi||{}), Object.keys(d.datajud_multi||{})), nup:fora(nupsDoCaso(a), nupsDoCaso(d)).map(soDig),
    marc:fora(a.marcadores, d.marcadores), arq:fora(Object.keys(corpo.arquivados), Object.keys(d.arquivados||{}))};
  try{
    await patchCaso(destinoId, corpo);
  }catch(e){
    delete corpo.arquivados;   // banco sem a coluna (schema atrasado)
    await t("campos", ()=>patchCaso(destinoId, corpo));
  }
  await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({caso_id:destinoId, autor_id:eu.id,
      texto:`⇄ Fundido: "${tituloCaso(a)}" (${listaDe(a)!=="—"?listaDe(a):NOME_FASE[a.fase]||""}) foi incorporado a este caso — é a continuação do mesmo pedido.`})}).catch(()=>{});

  // o incorporado: apagar (nasceu no CRM) ou virar casca encerrada (To Do)
  if(a.todo_task_id){
    // F220 · a marca "fundido" faz a sincronização manter a casca encerrada
    const agora=new Date().toISOString();
    const cs={fase:"encerrado", encerrado_em:agora, encerrado_por:eu.id,
      arquivados:{...(a.arquivados||{}), fundido:{para:d.id, por:eu.id, em:agora}}};
    try{ await patchCaso(a.id, cs); }
    catch(e){ delete cs.encerrado_por;
      await t("casca", ()=>patchCaso(a.id, cs)); }
    await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({caso_id:a.id, autor_id:eu.id,
        texto:`⇄ Caso fundido com "${tituloCaso(d)}" — o histórico foi movido para lá. A sincronização mantém esta casca encerrada; a tarefa do To Do pode ser concluída quando convier.`})}).catch(()=>{});
  }else{
    await t("remover", ()=>api(`/rest/v1/casos?id=eq.${a.id}`,{method:"DELETE"}));
  }

  if(opts.quieto){
    Object.assign(d, corpo);
    if(a.todo_task_id) Object.assign(a, {fase:"encerrado", encerrado_em:new Date().toISOString(), arquivados:{...(a.arquivados||{}), fundido:{para:d.id, por:eu.id}}});
    const foram = new Set(registro.ids.andamentos);
    for(const x of (D._andsFicha||[])) if(foram.has(x.id)) x.caso_id = d.id;
    for(const x of (D.anexos||[])) if(x.caso_id===a.id) x.caso_id = d.id;
    return a.todo_task_id ? registro : null;
  }
  aviso(`⇄ Fundido em "${tituloCaso(d)}"${falhas.length?` (atenção: falhou em ${falhas.join(", ")})`:""}`);
  await carregar();
  montarSidebar(); casoSel=destinoId; abaAtiva=2;
  await abrirFicha(d.cliente_id);
  if(_orgReabrir===d.cliente_id) organizarCasos(d.cliente_id);
  return a.todo_task_id ? registro : null;
}
// F221 · desfaz uma fusão da organização automática: as linhas voltam ao caso
// de origem e a casca reabre na fase em que estava
async function desfazerFusao(r){
  if(!r || !r.de || !r.ids) return false;
  await casoInteiro(D.casoPorId.get(r.de), D.casoPorId.get(r.para));   // F379
  for(const [tab, ids] of Object.entries(r.ids))
    for(let i=0; i<ids.length; i+=80)
      await api(`/rest/v1/${tab}?id=in.(${ids.slice(i, i+80).join(",")})`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({caso_id:r.de})}).catch(()=>{});
  const a = D.casoPorId.get(r.de) || {};
  const arq = {...(a.arquivados||{})}; delete arq.fundido;
  await patchCaso(r.de, {fase:r.fase||"inss", encerrado_em:null, encerrado_por:null, arquivados:arq}).catch(()=>{});
  Object.assign(a, {fase:r.fase||"inss", encerrado_em:null, encerrado_por:null, arquivados:arq});
  // o destino devolve o que herdou: o campo só volta a vazio se ainda tem o valor que veio da fusão
  const k = D.casoPorId.get(r.para), v = r.volta;
  if(k && v){
    const c = {}, tira = (lista, chaves, f=x=>soDig(x)) => (Array.isArray(lista)?lista:[]).filter(x=>!chaves.includes(f(x)));
    for(const f of v.herdou||[]) if(JSON.stringify(k[f]??null)===JSON.stringify(a[f]??null)) c[f] = (f==="urgente"||f==="importante") ? false : null;
    if((v.prot||[]).length) c.protocolos = tira(k.protocolos, v.prot);
    if((v.nbs||[]).length) c.nbs = tira(k.nbs, v.nbs);
    if((v.proc||[]).length) c.processos = tira(k.processos, v.proc, p=>soDig(p.numero||p));
    if((v.nup||[]).length){ c.crps_nups = tira(k.crps_nups, v.nup); c.crps = tira(k.crps, v.nup, b=>soDig(b.nup)); }
    if((v.marc||[]).length) c.marcadores = tira(k.marcadores, v.marc, x=>x);
    if((v.dj||[]).length){ c.datajud_multi = {...(k.datajud_multi||{})}; for(const x of v.dj) delete c.datajud_multi[x]; }
    if((v.arq||[]).length){ c.arquivados = {...(k.arquivados||{})}; for(const x of v.arq) delete c.arquivados[x]; }
    if(Object.keys(c).length){ try{ await patchCaso(k.id, c); Object.assign(k, c); }catch(e){} }
  }
  await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({caso_id:r.de, autor_id:eu.id, texto:"↺ Fusão desfeita: o histórico voltou a este caso."})}).catch(()=>{});
  return true;
}

// ══════════════════════════════════════════════════════════════════════════
// F220 · ORGANIZAR OS CASOS DO CLIENTE. Cada lista do To Do virou um caso, e
// quem passou pelo INSS, pelo CRPS e pela Justiça ficou com o NB, o protocolo,
// o recurso e o processo espalhados por fichas diferentes (102 clientes com
// mais de um caso aberto em 13.10.2026). Cada caso deve juntar o pedido no
// INSS, o recurso no CRPS e o processo judicial do MESMO benefício. A janela
// mostra os números de cada caso, leva um número com os andamentos dele a
// outro caso e junta os casos que são o mesmo benefício. As sugestões saem
// dos próprios textos: petição, recurso e documento que citam o NB de outro
// caso, e o mesmo número gravado em dois casos. A marca fica em
// casos.arquivados ("mov:<tipo>:<dígitos>", "add:prot:<dígitos>", "fundido")
// e o migrar.py a respeita, para a sincronização do To Do não desfazer.
// ══════════════════════════════════════════════════════════════════════════
const TIPO_NUM = {nb:"NB", prot:"Protocolo INSS", nup:"Recurso CRPS", proc:"Processo judicial"};
let _orgReabrir = null;                       // cliente cujo organizador volta a abrir depois da ação
const _orgIgnorar = new Set();                // sugestões dispensadas nesta sessão
function protocolosDoCaso(k){ return [...new Set(((k&&k.protocolos)||[]).map(x=>soDig(x)).filter(Boolean))]; }
// o protocolo acrescentado no CRM leva a marca "add:prot", porque o upsert da
// sincronização reescreve casos.protocolos só com o que a tarefa do To Do cita
function corpoProtocolos(k, novos){
  const ja = protocolosDoCaso(k), add = [...new Set((novos||[]).map(soDig).filter(d=>d && !ja.includes(d)))];
  if(!add.length) return null;
  const arq = {...(k.arquivados||{})}, em = new Date().toISOString();
  for(const d of add){ arq[`add:prot:${d}`] = {por:eu.id, em}; delete arq[`mov:prot:${d}`]; }
  return {protocolos:[...(k.protocolos||[]), ...add], arquivados:arq};
}
function numerosDoCaso(k){
  return {nb:nbsDoCaso(k).map(soDig).filter(Boolean), prot:protocolosDoCaso(k), nup:crpsNups(k),
          proc:processosDoCaso(k).map(p=>soDig(p.numero)).filter(Boolean)};
}
const fmtNum = (tipo, d) => tipo==="nb" ? fmtNb(d) : tipo==="nup" ? formatarNup(d) : tipo==="proc" ? fmtProc(d) : d;
// o NB citado: "123.456.789-0", ou os 10 dígitos logo depois de "NB" ou "benefício"
const RX_NB_FMT = /(?<![\d.])(\d{3})\.(\d{3})\.(\d{3})-(\d)(?![\d-])/g;
const RX_NB_ROT = /\b(?:NB|benef[ií]cio(?:\s+previdenci[áa]rio)?)\s*(?:n[ºo°.]*\s*)?:?\s*(\d{10})(?!\d)/gi;
function nbsCitados(txt){
  const s = String(txt||""), out = new Set();
  for(const m of s.matchAll(RX_NB_FMT)) out.add(m.slice(1,5).join(""));
  for(const m of s.matchAll(RX_NB_ROT)) out.add(m[1]);
  return [...out];
}
const RX_NUP = /(?<!\d)(\d{5})\.?(\d{6})\/?(\d{4})-?(\d{2})(?!\d)/;
// ══════════════════════════════════════════════════════════════════════════
// F221 · O NB DE CADA NÚMERO. Processo, recurso e protocolo dizem de que
// benefício tratam pelos próprios documentos: a petição inicial e a decisão
// do processo (o arquivo traz o número do processo no caminho), o "Histórico
// de benefícios - SUB - NB:" que o INSS junta em cada recurso do e-Recursos e
// a comunicação do PAT. Documento que lista todos os benefícios da pessoa
// (dossiê previdenciário, CNIS, extrato, histórico de créditos) não conta,
// porque cita todos os NBs. Medido em 13.10.2026 nos 102 clientes de vários
// casos: 84 dos 105 processos com documento citam NB, e os 53 recursos com o
// histórico do SUB trazem um NB só cada um.
// ══════════════════════════════════════════════════════════════════════════
const RX_DOC_LISTA = /dossi[eê]|\bcnis\b|extrato|hiscre|hist[oó]rico de cr[eé]dito|infben|dados cadastrais|plenus|\bsabi\b|consulta (?:de|dos) benef/i;
const RX_SUB_NB = /SUB\s*-\s*NB\s*:?\s*(\d{10})(?!\d)/g;
function numDoAnexo(x){
  const c = String((x&&x.caminho)||"");
  let m = c.match(/^(?:pje|esaj|eproc)\/(\d{20})\//); if(m) return {tipo:"proc", d:m[1]};
  m = c.match(/^pat\/(\d{6,})\//); if(m) return {tipo:"prot", d:m[1]};
  m = RX_NUP.exec(`${c} ${(x&&x.nome)||""}`); return m ? {tipo:"nup", d:m.slice(1,5).join("")} : null;
}
// quanto o documento pesa para dizer o NB do número: a inicial nomeia o benefício pedido
function pesoDoDoc(nome){
  const n = String(nome||"");
  if(RX_DOC_LISTA.test(n)) return 0;
  if(/inicial/i.test(n)) return 5;
  if(/senten[cç]|ac[oó]rd[aã]|decis[aã]o|comunica[cç][aã]o de decis/i.test(n)) return 3;
  if(/contesta|recurso|raz[oõ]es|requerimento/i.test(n)) return 2;
  return 1;
}
let _evCache = null;   // a evidência do cliente aberto, refeita quando os números ou os textos mudam
function evidenciaNbs(ks){
  const chave = ks.map(k=>k.id+":"+Object.values(numerosDoCaso(k)).map(x=>x.join(",")).join("/")).join("|")
    + `#${(D.anexos||[]).length}#${(D._andsFicha||[]).length}`;
  if(_evCache && _evCache.chave===chave) return _evCache.ev;
  const ev = new Map();   // "tipo:dígitos" -> Map(nb -> {pts, fontes})
  const somar = (num, nb, pts, fonte) => {
    const ch = num.tipo+":"+num.d; if(!ev.has(ch)) ev.set(ch, new Map());
    const m = ev.get(ch), x = m.get(nb) || {pts:0, fontes:new Set()};
    x.pts += pts; if(x.fontes.size<4) x.fontes.add(fonte); m.set(nb, x);
  };
  for(const t of textosDoCliente(ks)){
    if(!t.num || !t.peso) continue;
    const sub = new Set([...String(t.txt||"").matchAll(RX_SUB_NB)].map(m=>m[1]));
    for(const nb of sub) somar(t.num, nb, 5, "histórico do benefício juntado no recurso");
    for(const nb of nbsCitados(t.txt)) if(!sub.has(nb)) somar(t.num, nb, t.peso, t.fonte);
  }
  _evCache = {chave, ev};
  return ev;
}
// o NB do número é o mais citado, quando ganha com folga; sem folga, fica a lista para a pessoa escolher
function nbDoNumero(ev, tipo, d){
  const m = ev.get(tipo+":"+d); if(!m || !m.size) return null;
  const r = [...m.entries()].map(([nb, x])=>({nb, pts:x.pts, fontes:[...x.fontes]})).sort((a,b)=>b.pts-a.pts);
  const seg = r[1] ? r[1].pts : 0;
  const conf = r[0].pts>=5 && r[0].pts>=2*seg ? "alta" : r[0].pts>=2 && r[0].pts>=1.5*seg ? "media" : null;
  return {nb: conf ? r[0].nb : null, conf, ranking:r};
}
// de onde vem cada texto do cliente: o caso e, quando se sabe, o número a que ele pertence
function textosDoCliente(ks){
  const ids = new Set(ks.map(k=>k.id)), out = [];
  const dono = (tipo, d) => ks.find(k=>numerosDoCaso(k)[tipo].includes(d));
  const numDoAnd = a => {
    const oid = String(a.origem_id||"");
    if(a.origem==="pje"){ const n = soDig(movPjeLimpo(a).numero) || (oid.match(/\d{20}/)||[])[0]; return n ? {tipo:"proc", d:n} : null; }
    if(a.origem==="crps"){ const n = (oid.match(/^(\d{17})\|/)||[])[1]; return n ? {tipo:"nup", d:n} : null; }
    if(a.origem==="pat"){ const n = (oid.match(/:(\d{6,})/)||[])[1]; return n ? {tipo:"prot", d:n} : null; }
    return null;
  };
  const ands = (D._andsFicha||[]).filter(a=>ids.has(a.caso_id)), porId = new Map(ands.map(a=>[a.id,a]));
  for(const a of ands) out.push({casoId:a.caso_id, num:numDoAnd(a), txt:a.texto, fonte:"andamento de "+fmtTS(a.criado_em), peso:1});
  for(const x of (D.anexos||[])){
    // o dossiê é do cliente; só conta o documento de um recurso (o NUP vem no caminho)
    if(x.origem==="dossie" && !RX_NUP.test(`${x.caminho||""} ${x.nome||""}`)) continue;
    const a = x.andamento_id && porId.get(x.andamento_id);
    // F221 · sem andamento (e-SAJ e PAT), o número vem do caminho do arquivo
    const num = (a && numDoAnd(a)) || numDoAnexo(x);
    const k = (a && D.casoPorId.get(a.caso_id)) || (x.caso_id && ids.has(x.caso_id) && D.casoPorId.get(x.caso_id)) || (num && dono(num.tipo, num.d));
    if(k) out.push({casoId:k.id, num, txt:`${x.nome||""} ${x.texto||""}`, fonte:"documento "+String(x.nome||"").slice(0,60), peso:pesoDoDoc(x.nome)});
  }
  for(const k of ks) for(const b of crpsBlocos(k))
    out.push({casoId:k.id, num:{tipo:"nup", d:soDig(b.nup)}, fonte:"recurso "+formatarNup(b.nup), peso:1,
      txt:(b.eventos||[]).map(e=>`${e.resumo||""} ${e.bruto||""}`).join(" ")});
  return out;
}
function casosParaOrganizar(cliId){
  return (D.casosDoCliente.get(cliId)||[]).filter(k=>k.fase!=="encerrado" && k.fase!=="pagamento");
}
function sugestoesOrganizar(cliId){
  const ks = casosParaOrganizar(cliId), nums = new Map(ks.map(k=>[k.id, numerosDoCaso(k)]));
  const sug = [], visto = new Set();
  const add = s => { if(!visto.has(s.chave) && !_orgIgnorar.has(s.chave)){ visto.add(s.chave); sug.push(s); } };
  // 1 · o mesmo número gravado em dois casos
  for(const tipo of Object.keys(TIPO_NUM)){
    const por = new Map();
    for(const k of ks) for(const d of nums.get(k.id)[tipo]) por.set(d, [...(por.get(d)||[]), k.id]);
    for(const [d, cs] of por) if(cs.length>1) add({chave:`dup:${tipo}:${d}`, tipo:"duplicado", num:{tipo, d}, casos:cs,
      txt:`${TIPO_NUM[tipo]} ${fmtNum(tipo, d)} está gravado em ${cs.length} casos`});
  }
  // 2 · F221 · o número cujo NB, pelos documentos dele, está em outro caso;
  // ou o caso sem NB cujo número diz de que NB trata
  const ev = evidenciaNbs(ks);
  for(const k of ks){ const n = nums.get(k.id);
    for(const tipo of ["prot","nup","proc"]) for(const d of n[tipo]){
      const r = nbDoNumero(ev, tipo, d); if(!r || !r.nb || n.nb.includes(r.nb)) continue;
      const donos = ks.filter(x=>nums.get(x.id).nb.includes(r.nb)), fonte = r.ranking[0].fontes[0]||"";
      if(donos.length===1)
        add({chave:`mov:${tipo}:${d}:${donos[0].id}`, tipo:"mover", num:{tipo, d}, de:k.id, para:donos[0].id, nb:r.nb, fonte,
          txt:`${TIPO_NUM[tipo]} ${fmtNum(tipo, d)} cita o NB ${fmtNb(r.nb)}, que está em outro caso`});
      else if(!donos.length && !n.nb.length)
        add({chave:`nb:${k.id}:${r.nb}`, tipo:"nb", para:k.id, nb:r.nb, fonte,
          txt:`O caso não tem NB, e ${TIPO_NUM[tipo].toLowerCase()} ${fmtNum(tipo, d)} trata do NB ${fmtNb(r.nb)}`});
    } }
  // 3 · a anotação do próprio caso (sem número) cita o NB de outro caso
  for(const t of textosDoCliente(ks)){
    if(t.num || !t.peso) continue;
    const n = nums.get(t.casoId); if(!n) continue;
    for(const nb of nbsCitados(t.txt)){
      if(n.nb.includes(nb)) continue;
      const donos = ks.filter(k=>nums.get(k.id).nb.includes(nb));
      if(donos.length===1)
        add({chave:`fun:${t.casoId}:${donos[0].id}`, tipo:"fundir", de:t.casoId, para:donos[0].id, nb, fonte:t.fonte,
          txt:`Um texto deste caso cita o NB ${fmtNb(nb)}, que está em outro caso`});
      else if(!donos.length && !n.nb.length)
        add({chave:`nb:${t.casoId}:${nb}`, tipo:"nb", para:t.casoId, nb, fonte:t.fonte,
          txt:`O caso não tem NB, e um texto dele cita o NB ${fmtNb(nb)}`});
    }
  }
  return sug;
}
const rotCurtoCaso = k => `${NOME_FASE[k.fase]||k.fase||""} · ${[k.especie, k.beneficio].filter(Boolean).join(" ") || tituloCaso(k)}`.slice(0, 70);
function organizarCasos(cliId){
  const c = D.cliPorId.get(cliId); if(!c) return;
  _orgReabrir = cliId;
  const ks = casosParaOrganizar(cliId);
  const outros = k => ks.filter(x=>x.id!==k.id);
  const opcoes = k => outros(k).map(x=>`<option value="${x.id}">${esc(rotCurtoCaso(x))}</option>`).join("");
  // F221 · a sugestão avulsa sobre número ou caso que o plano automático já
  // resolve não aparece: duas propostas para o mesmo número confundem
  const plano = planoOrganizar(cliId).passos;
  const nPlano = new Set(plano.filter(p=>p.acao==="mover").map(p=>`${p.tipo}:${p.d}`));
  const cPlano = new Set(plano.flatMap(p=>[p.de, p.para]).filter(Boolean));
  const sug = sugestoesOrganizar(cliId).filter(s=> s.tipo==="duplicado" ? !nPlano.has(`${s.num.tipo}:${s.num.d}`)
    : !(cPlano.has(s.de) || cPlano.has(s.para)));
  const bt = (rot, fn, prim) => `<button type="button" class="adr-bt${prim?" adr-primario":""}" onclick="${fn}">${rot}</button>`;
  const linhaSug = s => {
    const de = s.de && D.casoPorId.get(s.de), para = s.para && D.casoPorId.get(s.para);
    const acoes = s.tipo==="duplicado"
      ? s.casos.map(id=>{ const k = D.casoPorId.get(id); return bt(`Deixar só em ${esc(rotCurtoCaso(k))}`,
          `deixarSo('${s.num.tipo}','${s.num.d}','${id}','${s.casos.join(",")}')`); }).join("")
      : s.tipo==="mover" ? bt(`Levar ao caso ${esc(rotCurtoCaso(para))}`, `moverNumero('${s.num.tipo}','${s.num.d}','${s.de}','${s.para}')`, true)
          + bt("Juntar os dois casos", `juntarCasos('${s.de}','${s.para}')`) + bt(`Só anotar o NB ${fmtNb(s.nb)} aqui`, `anotarNbNoCaso('${s.de}','${s.nb}')`)
      : s.tipo==="fundir" ? bt(`Juntar ao caso ${esc(rotCurtoCaso(para))}`, `juntarCasos('${s.de}','${s.para}')`, true)
          + bt(`Só anotar o NB ${fmtNb(s.nb)} aqui`, `anotarNbNoCaso('${s.de}','${s.nb}')`)
      : bt(`Acrescentar o NB ${fmtNb(s.nb)}`, `anotarNbNoCaso('${s.para}','${s.nb}')`, true);
    return `<div class="org-s"><p><b>${esc(s.txt)}</b>${de && s.tipo!=="duplicado" ? ` <span class="meio-sub">· caso ${esc(rotCurtoCaso(de))}</span>` : ""}${
      s.fonte ? `<br><small class="meio-sub">fonte: ${esc(s.fonte)}</small>` : ""}</p>
      <div class="org-acoes">${acoes}<button type="button" class="adr-bt org-ign" onclick="_orgIgnorar.add('${escJs(s.chave)}');organizarCasos('${cliId}')" title="dispensar esta sugestão até recarregar o CRM">Ignorar</button></div></div>`;
  };
  const cartao = k => {
    const n = numerosDoCaso(k), tem = Object.values(n).some(x=>x.length);
    return `<article class="org-caso" data-caso="${k.id}">
      <header><b>${esc(tituloCaso(k))}</b><span class="chip neutro">${esc(listaDe(k)!=="—"?semEmoji(listaDe(k)):(NOME_FASE[k.fase]||k.fase))}</span>${k.etapa?`<span class="meio-sub">${esc(k.etapa)}</span>`:""}</header>
      ${tem ? `<dl class="org-nums">${Object.keys(TIPO_NUM).filter(t=>n[t].length).map(t=>`<div><dt>${TIPO_NUM[t]}</dt>${n[t].map(d=>`<dd>
          <span class="lc-num">${esc(fmtNum(t, d))}</span>${outros(k).length ? `<select aria-label="levar ${esc(TIPO_NUM[t])} ${esc(fmtNum(t,d))} a outro caso"
            onchange="if(this.value)moverNumero('${t}','${d}','${k.id}',this.value)"><option value="">levar a…</option>${opcoes(k)}</select>` : ""}</dd>`).join("")}</div>`).join("")}</dl>`
        : `<p class="meio-sub">Sem NB, protocolo, recurso ou processo. Se for o mesmo benefício de outro caso, junte-os.</p>`}
      <footer>${outros(k).length ? `<select aria-label="juntar este caso a outro" onchange="if(this.value)juntarCasos('${k.id}',this.value)"><option value="">juntar a…</option>${opcoes(k)}</select>` : ""}
        <button type="button" class="adr-bt" onclick="fecharCaixa();_orgReabrir=null;escolhido('${cliId}','${k.id}')" title="Abrir o caso">Abrir<span class="sr-only"> o caso</span></button></footer>
    </article>`;
  };
  const org = (c.campos||{}).casos_org;
  caixa(`<div class="org-casos" role="dialog" aria-labelledby="org-t">
    <h3 id="org-t">Organizar os casos de ${esc(c.nome)}</h3>
    <p class="meio-sub">Cada caso junta o pedido no INSS (protocolo e NB), o recurso no CRPS e o processo judicial do mesmo benefício.
      Leve cada número ao caso certo: ele leva junto os andamentos dele, e a sincronização do To Do não desfaz a mudança.
      Casos que são o mesmo benefício se juntam num só.</p>
    ${(kInc=>kInc ? faixaIncapacidade(kInc) : "")(ks.find(ehIncap))}
    ${planoHtml(cliId)}
    ${sug.length ? `<section class="org-sug" aria-label="O que os documentos indicam"><h4>O que mais os documentos indicam (${sug.length})</h4>${sug.map(linhaSug).join("")}</section>`
      : plano.length ? "" : `<p class="org-ok">Nenhum número repetido e nenhum documento citando o NB de outro caso.</p>`}
    <div class="org-grade">${ks.map(cartao).join("") || `<p class="meio-sub">Nenhum caso em andamento.</p>`}</div>
    <div class="adr-modal-bts">${org ? `<span class="meio-sub">marcado como organizado em ${fmt(String(org.em).slice(0,10))}</span>` : ""}
      ${bt("Pronto, os casos estão organizados", `casosOrganizados('${cliId}')`, true)}</div>
  </div>`);
}
// F221 · {quieto}: no lote (organização automática) não repinta nem avisa a cada número; devolve se levou
async function moverNumero(tipo, d, deId, paraId, opts={}){
  const de = D.casoPorId.get(deId), para = D.casoPorId.get(paraId);
  if(!de || !para || de.id===para.id || !TIPO_NUM[tipo]) return false;
  await casoInteiro(de, para);   // F379
  const agora = new Date().toISOString();
  const mDe = {...(de.arquivados||{}), [`mov:${tipo}:${d}`]:{para:paraId, por:eu.id, em:agora}}, mPara = {...(para.arquivados||{})};
  delete mPara[`mov:${tipo}:${d}`];             // voltou a este caso: a marca antiga sai
  const cDe = {arquivados:mDe}, cPara = {arquivados:mPara};
  const lista = v => Array.isArray(v) ? v : [];
  let ands = [];
  if(tipo==="nb"){
    const orig = nbsDoCaso(de).find(n=>soDig(n)===d) || d, resto = lista(de.nbs).filter(n=>soDig(n)!==d);
    if(soDig(de.nb)===d){ cDe.nb = resto[0]||null; cDe.nbs = resto.slice(1); } else cDe.nbs = resto;
    if(!nbsDoCaso(para).some(n=>soDig(n)===d)){ if(!para.nb) cPara.nb = orig; else cPara.nbs = [...lista(para.nbs), orig]; }
  } else if(tipo==="prot"){
    cDe.protocolos = (de.protocolos||[]).filter(p=>soDig(p)!==d); delete mDe[`add:prot:${d}`];
    cPara.protocolos = [...new Set([...(para.protocolos||[]), d])]; mPara[`add:prot:${d}`] = {de:deId, por:eu.id, em:agora};
    // F374 · a tela do PAT do protocolo vai junto
    if(de.pat && de.pat[d]){ const {[d]:tela, ...resto} = de.pat; cDe.pat = resto; cPara.pat = {...(para.pat||{}), [d]: tela}; }
    ands = (D._andsFicha||[]).filter(a=>a.caso_id===deId && a.origem==="pat" && String(a.origem_id||"").includes(":"+d));
  } else if(tipo==="nup"){
    const bloco = crpsBlocos(de).find(b=>soDig(b.nup)===d);
    Object.assign(cDe, {crps_nups:crpsNups(de).filter(n=>n!==d), crps_nup:null, crps:crpsBlocos(de).filter(b=>soDig(b.nup)!==d)});
    Object.assign(cPara, {crps_nups:[...new Set([...crpsNups(para), d])], crps_nup:null});
    if(bloco && !crpsBlocos(para).some(b=>soDig(b.nup)===d)) cPara.crps = [...crpsBlocos(para), bloco];
    if(mDe["crps:"+d]){ mPara["crps:"+d] = mDe["crps:"+d]; delete mDe["crps:"+d]; }
    ands = (D._andsFicha||[]).filter(a=>a.caso_id===deId && a.origem==="crps" && String(a.origem_id||"").startsWith(d+"|"));
  } else {
    const p = processosDoCaso(de).find(x=>soDig(x.numero)===d); if(!p) return false;
    const multi = {...(de.datajud_multi||{})}, dj = multi[d] || (soDig(de.processo)===d ? de.datajud : null);
    delete multi[d]; cDe.datajud_multi = multi;
    if(dj) cPara.datajud_multi = {...(para.datajud_multi||{}), [d]:dj};
    if(!para.processo && dj) cPara.datajud = dj;
    const pt = (de.prazos_tribunal||[]).filter(x=>soDig(x.numero)===d);
    if(pt.length){ cDe.prazos_tribunal = de.prazos_tribunal.filter(x=>soDig(x.numero)!==d); cPara.prazos_tribunal = [...(para.prazos_tribunal||[]), ...pt]; }
    ands = (D._andsFicha||[]).filter(a=>a.caso_id===deId && a.origem==="pje" && (String(a.origem_id||"").includes(d) || soDig(movPjeLimpo(a).numero)===d));
  }
  try{
    await patchCaso(deId, cDe); Object.assign(de, cDe);
    await patchCaso(paraId, cPara); Object.assign(para, cPara);
    if(tipo==="proc"){
      const p = processosDoCaso(de).find(x=>soDig(x.numero)===d);
      await salvarProcessos(deId, processosDoCaso(de).filter(x=>soDig(x.numero)!==d));
      if(!processosDoCaso(para).some(x=>soDig(x.numero)===d)) await salvarProcessos(paraId, [...processosDoCaso(para), {...p, principal:false}]);
    }
  }catch(e){ if(!opts.quieto) aviso("Não consegui levar o número — rode o crm/fase2/schema_por_em_dia.sql no Supabase se faltar coluna"); return false; }
  // os andamentos do número vão com ele, e os documentos e as tarefas desses andamentos também;
  // o que o caso de destino já tem (mesma origem, mesmo origem_id, que o banco não deixa repetir) fica no de origem
  const noDestino = new Set((D._andsFicha||[]).filter(a=>a.caso_id===paraId && a.origem_id).map(a=>a.origem+"|"+a.origem_id));
  const repetidos = ands.filter(a=>noDestino.has(a.origem+"|"+a.origem_id)).map(a=>a.id);
  // F844 · o repetido fica no caso de origem: nada se apaga (decisão do Paulo, 28.11.2026)
  const ids = ands.map(a=>a.id).filter(id=>!repetidos.includes(id));
  for(let i=0; i<ids.length; i+=80){
    const lote = ids.slice(i, i+80).join(",");
    await api(`/rest/v1/andamentos?id=in.(${lote})`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({caso_id:paraId})}).catch(()=>{});
    await api(`/rest/v1/anexos?andamento_id=in.(${lote})`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({caso_id:paraId})}).catch(()=>{});
    await api(`/rest/v1/andamento_tarefas?andamento_id=in.(${lote})`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({caso_id:paraId})}).catch(()=>{});
  }
  // F221 · os documentos do e-SAJ e do PAT não têm andamento: vão pelo número no caminho do arquivo
  const caminhos = tipo==="proc" ? ["pje","esaj","eproc"].map(o=>`caminho.like.${o}/${d}/*`) : tipo==="prot" ? [`caminho.like.pat/${d}/*`] : [];
  if(caminhos.length) await api(`/rest/v1/anexos?caso_id=eq.${deId}&or=(${caminhos.join(",")})`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({caso_id:paraId})}).catch(()=>{});
  // a memória acompanha o banco: o lote seguinte e a evidência leem o caso novo
  const movidos = new Set(ids);
  for(const a of (D._andsFicha||[])) if(movidos.has(a.id)) a.caso_id = paraId;
  for(const x of (D.anexos||[])) if((x.andamento_id && movidos.has(x.andamento_id)) || (x.caso_id===deId && caminhos.length && (numDoAnexo(x)||{}).d===d)) x.caso_id = paraId;
  // F225 · as perícias e audiências marcadas não dizem de que número são: vão junto quando o
  // caso de origem fica sem número nenhum, ou quando quem levou pediu (opts.eventos)
  const evs = eventosFuturos(deId);
  const semNumero = !Object.values(numerosDoCaso(de)).some(x=>x.length);
  let nEv = 0;
  if(evs.length && (opts.eventos===true || (opts.eventos!==false && semNumero))) nEv = await levarEventos(evs, paraId);
  const rot = `${TIPO_NUM[tipo]} ${fmtNum(tipo, d)}`;
  await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify([
    {caso_id:deId, autor_id:eu.id, texto:`⇄ ${rot} foi levado ao caso "${tituloCaso(para)}"${ids.length?`, com ${ids.length} andamento(s)`:""}${nEv?` e ${nEv} agendamento(s)`:""}.`},
    {caso_id:paraId, autor_id:eu.id, texto:`⇄ ${rot} veio do caso "${tituloCaso(de)}"${ids.length?`, com ${ids.length} andamento(s)`:""}.`}])}).catch(()=>{});
  if(opts.quieto) return true;
  aviso(`${rot} levado ao caso ${rotCurtoCaso(para)} ✔`, false);
  await abrirFicha(de.cliente_id);
  if(_orgReabrir===de.cliente_id) organizarCasos(de.cliente_id);
  return true;
}
// o NB citado entra no caso como mais um NB (o principal, se o caso não tiver)
async function anotarNbNoCaso(casoId, nb, opts={}){
  const k = D.casoPorId.get(casoId); if(!k || nbsDoCaso(k).some(n=>soDig(n)===soDig(nb))) return false;
  const corpo = k.nb ? {nbs:[...(Array.isArray(k.nbs)?k.nbs:[]), fmtNb(nb)]} : {nb:fmtNb(nb)};
  try{ await patchCaso(casoId, corpo); }catch(e){ if(!opts.quieto) aviso("Não gravou — rode o crm/fase2/schema_linha_caso.sql no Supabase"); return false; }
  Object.assign(k, corpo);
  if(opts.quieto) return true;
  aviso(`NB ${fmtNb(nb)} anotado no caso ✔`, false);
  await abrirFicha(k.cliente_id);
  if(_orgReabrir===k.cliente_id) organizarCasos(k.cliente_id);
  return true;
}
// F221 · o desfazer da anotação automática: o NB sai do caso (o principal passa ao seguinte)
async function tirarNbDoCaso(casoId, nb){
  const k = D.casoPorId.get(casoId); if(!k) return false;
  const resto = nbsDoCaso(k).filter(n=>soDig(n)!==soDig(nb));
  const corpo = {nb:resto[0]||null, nbs:resto.slice(1)};
  try{ await patchCaso(casoId, corpo); }catch(e){ return false; }
  Object.assign(k, corpo); return true;
}
// o número repetido fica só no caso escolhido: sai dos outros, um de cada vez
async function deixarSo(tipo, d, manterId, idsCsv){
  for(const id of idsCsv.split(",").filter(x=>x && x!==manterId)) await moverNumero(tipo, d, id, manterId);
}
// juntar = a fusão de sempre: o histórico do primeiro passa ao segundo
function juntarCasos(absorvidoId, destinoId){ fecharCaixa(); fundirCasos(absorvidoId, destinoId); }
async function casosOrganizados(cliId){
  const c = D.cliPorId.get(cliId); if(!c) return;
  c.campos = {...(c.campos||{}), casos_org:{em:new Date().toISOString(), por:eu.id}};
  try{ await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({campos:c.campos})}); }
  catch(e){ return aviso("Não gravou — tente de novo"); }
  _orgReabrir = null; fecharCaixa();
  aviso("Casos marcados como organizados ✔", false);
  if(visao==="acervo") render();
}
// no 🧹 Cuidar do acervo: quem tem mais de um caso aberto, com o número repetido primeiro
function blocoVariosCasos(){
  const linhas = clientesVariosCasos();
  if(!linhas.length) return "";
  const mostra = linhas.slice(0, 40);
  return `<details class="sem-acao neutro" id="acervo-varios"><summary>Clientes com mais de um caso aberto (${linhas.length}) — cada caso deve juntar NB, recurso e processo do mesmo benefício</summary>
    <p class="meio-sub" style="margin:8px 0 4px">Os de número repetido vêm primeiro. O botão abre a ficha com a janela de organizar; marcado como organizado, o cliente sai daqui até ganhar caso novo.</p>
    <div class="form-linha" style="margin:4px 0 8px"><button class="btn-mini forte" onclick="organizarTodos()"
      title="lê os documentos de cada cliente, monta o plano e mostra antes de aplicar"><span aria-hidden="true">Organizar…</span><span class="sr-only">Organizar todos pelos documentos…</span></button>
      <span class="meio-sub">o CRM lê os documentos de cada cliente, mostra o que faria e só aplica o que você marcar</span></div>
    ${mostra.map(({c, ks, rep, semNum})=>`<div class="caso" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <span class="titulo-caso" style="cursor:pointer" onclick="abrirFicha('${c.id}')" title="abrir a ficha">${esc(c.nome)}</span>
      <span class="meio-sub">${ks.length} casos · ${esc([...new Set(ks.map(k=>NOME_FASE[k.fase]||k.fase))].join(" + "))}</span>
      ${rep?`<span class="chip urg" title="o mesmo número gravado em mais de um caso">${rep} número${rep>1?"s":""} repetido${rep>1?"s":""}</span>`:""}
      ${semNum?`<span class="chip neutro">${semNum} sem número</span>`:""}
      <button class="btn-mini" style="margin-left:auto" onclick="abrirOrganizar('${c.id}')">organizar</button></div>`).join("")}
    ${linhas.length>mostra.length?`<p class="meio-sub">…e mais ${linhas.length-mostra.length}. A lista encurta conforme os clientes são organizados.</p>`:""}
  </details>`;
}
// F254 · os cadastros sem CPF, em três grupos: o que não parece cliente vem marcado; o Paulo confirma e eles saem da lista
// P2 (prazos, 31.10.2026) · os cards das Aposentadorias futuras que trazem o pagamento escrito no texto: um clique cria o
// plano de contribuições com a sugestão lida do texto, ou marca que o trecho não é pagamento (lembretes.crm.sem_plano)
function cardsComPagamento(){
  const comPlano = new Set((D.qualidade||[]).filter(q=>q.lembrete_id).map(q=>q.lembrete_id));
  return (D.lembretes||[]).filter(l=>l.ativo!==false && ehCardApos(l) && cardVivo(l) && !comPlano.has(l.id) && !cardCrm(l).sem_plano)
    .map(l=>({l, cli:D.cliPorId.get(l.cliente_id), tr:trechosDePagamento(l)})).filter(x=>x.cli && x.tr.length)
    .sort((a, b)=>dsa(a.cli.nome).localeCompare(dsa(b.cli.nome)));
}
function blocoCardsPagamento(){
  if(D.qualidade===null) return "";
  const xs = cardsComPagamento(); if(!xs.length) return "";
  return `<details class="sem-acao neutro" id="acervo-cardspg"><summary>Cards com pagamento a separar (${xs.length}) — o pagamento escrito no card vira plano de contribuições</summary>
    <p class="meio-sub" style="margin:8px 0 4px">O plano lembra o cliente pelo WhatsApp e entra nos Prazos e no Meu Dia. A sugestão vem do texto do card; confira antes de guardar.</p>
    ${xs.slice(0, 60).map(({l, cli, tr})=>`<div class="semcpf-it cardpg" data-lemb="${l.id}"><b class="semcpf-nome" style="cursor:pointer" onclick="abrirFicha('${cli.id}')">${esc(cli.nome)}</b>
      <span class="meio-sub">${esc(cortaFrase(tr.join(" · "), 220))}</span>
      <span><button class="btn-mini forte" onclick="planoDoCard('${l.id}')" title="Criar o plano"><span aria-hidden="true">Planejar</span><span class="sr-only">Criar o plano</span></button>
      <button class="btn-mini" onclick="cardSemPlano('${l.id}')">Não é pagamento</button></span></div>`).join("")}
    ${xs.length>60 ? `<p class="meio-sub">e mais ${xs.length-60}; os primeiros saem da lista ao serem resolvidos.</p>` : ""}
  </details>`;
}
function planoDoCard(lid){
  const l = (D.lembretes||[]).find(x=>x.id===lid); if(!l) return;
  const tr = trechosDePagamento(l)[0] || "", sg = sugestaoDoTrecho(trechosDePagamento(l).join(" "));
  formQualidade(l.cliente_id, "", "", {lembrete_id:lid, trecho:tr, q:{...(sg.codigo ? {codigo:sg.codigo} : {}), ...(sg.inicio ? {inicio:sg.inicio+"-01"} : {}), motivo:cortaFrase(tr, 200)}});
}
async function cardSemPlano(lid){
  if(await cardGravar(lid, c=>{ c.sem_plano = true; })){ aviso("O card saiu da fila", false); render(); }
}
function blocoSemCpf(){
  if(!souAdmin()) return "";
  const sem = (D.clientes||[]).filter(c=>c.nome && String(c.cpf||"").replace(/\D/g,"").length!==11 && !(c.campos||{}).e_cliente)
    .sort((a, b)=>dsa(a.nome).localeCompare(dsa(b.nome)));
  if(!sem.length) return "";
  const escondidos = sem.filter(c=>(c.campos||{}).nao_cliente), vivos = sem.filter(c=>!(c.campos||{}).nao_cliente);
  const g0 = vivos.filter(faltaCpf), resto = vivos.filter(c=>!faltaCpf(c));
  const g1 = resto.filter(naoPareceCliente), g2 = resto.filter(c=>!naoPareceCliente(c) && palavrasDoNome(c.nome).length<2),
        g3 = resto.filter(c=>!naoPareceCliente(c) && palavrasDoNome(c.nome).length>=2);
  const casos = c => (D.casosDoCliente.get(c.id)||[]);
  const linha = (c, marcado) => `<label class="semcpf-it"><input type="checkbox" class="semcpf-ck" value="${c.id}"${marcado?" checked":""}>
    <b class="semcpf-nome" style="cursor:pointer" onclick="event.preventDefault();abrirFicha('${c.id}')">${esc(c.nome)}</b>
    <span class="meio-sub">${casos(c).length} caso${casos(c).length===1?"":"s"}${casos(c).some(k=>k.fase!=="encerrado")?" · com caso aberto":""}</span></label>`;
  const grupo = (tit, sub, l, marcado, aberto) => l.length ? `<details class="semcpf-g"${aberto?" open":""}><summary><b>${tit} (${l.length})</b> <span class="meio-sub">${sub}</span></summary>
    ${l.map(c=>linha(c, marcado)).join("")}</details>` : "";
  return `<details class="sem-acao neutro" id="acervo-semcpf"><summary>Conferir cadastros sem CPF (${vivos.length}): o que não é cliente sai da lista Clientes</summary>
    <p class="meio-sub" style="margin:8px 0 4px">Nada é apagado: os marcados só saem da lista Clientes, com os casos e o histórico, e voltam pelo “É cliente” da ficha.</p>
    ${grupo("⚠ Falta CPF · lista Marcos", "a tarefa do To Do não tem #CPF: abra a ficha e acrescente o CPF", g0, false, true)}
    ${grupo("Não parecem clientes", "tarefas do To Do e contatos (Imprimir, iCloud, Pai…), já marcados", g1, true, true)}
    ${grupo("Só o primeiro nome", "confira na ficha antes de marcar", g2, false, false)}
    ${grupo("Pessoas sem CPF", "em geral clientes antigos: continuam na lista", g3, false, false)}
    <div class="form-linha" style="margin-top:8px"><button class="btn-mini forte" onclick="esconderSemCpf()" title="Tirar os marcados da lista Clientes"><span aria-hidden="true">Retirar</span><span class="sr-only">Tirar os marcados da lista Clientes</span></button>
      <span class="meio-sub">${escondidos.length ? `${escondidos.length} já fora da lista` : ""}</span></div>
  </details>`;
}
async function esconderSemCpf(){
  const ids = [...document.querySelectorAll("#acervo-semcpf .semcpf-ck:checked")].map(i=>i.value);
  if(!ids.length) return aviso("Marque ao menos um cadastro");
  let ok = 0;
  for(const id of ids){ const c = D.cliPorId.get(id); if(!c) continue;
    const campos = {...(c.campos||{}), nao_cliente:true}; delete campos.e_cliente;
    try{ await api(`/rest/v1/clientes?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({campos})}); c.campos = campos; ok++; }catch(e){} }
  aviso(`${ok} cadastro${ok===1?"":"s"} fora da lista Clientes${ok<ids.length?` · ${ids.length-ok} não gravaram, tente de novo`:""}`, false);
  montarSidebar(); render();
}
async function abrirOrganizar(cliId){ await abrirFicha(cliId); organizarCasos(cliId); }

// ══════════════════════════════════════════════════════════════════════════
// F221 · O PLANO DE ORGANIZAÇÃO. Cada número com NB conhecido (pelos próprios
// documentos, ou pelo único NB do caso em que está) junta-se aos outros
// números do mesmo NB no caso mais adiantado do benefício (Judicial, depois
// Conselho, INSS e Escritório): o NB vai junto, o caso que ficou sem número
// se junta ao destino, e o NB que nenhum caso tinha é anotado. O que os
// documentos não decidem (dois NBs sem folga, o NB contrário ao do caso, o
// mesmo NB em dois casos) fica em "precisa de você", com um botão por NB.
// Aplicado, o plano fica registrado em clientes.campos.org_auto e se desfaz.
// ══════════════════════════════════════════════════════════════════════════
const ORDEM_FASE_ORG = {judicial:5, conselho:4, peticao_inicial:4, inss:3, escritorio:2, outro:1};
function planoOrganizar(cliId){
  const passos = [], duvidas = [], juntados = new Set();   // F842 · casos que já se juntam pelo NB repetido
  const rev = k=>/revis/i.test(k.beneficio||""), sobra = (xs, ys) => xs.length && ys.length && xs.some(x=>!ys.includes(x));
  // F842 · só a tarefa do To Do se junta (vira casca, e a fusão se desfaz); nunca quando o caso ficaria com dois NUP
  // ou dois processos principais, nem revisão com concessão
  const podeJuntar = (k, n, dest, nd) => k.todo_task_id && n.nb.length===1 && !sobra(n.nup, nd.nup) && rev(k)===rev(dest)
    && !(soDig(k.processo) && soDig(dest.processo) && soDig(k.processo)!==soDig(dest.processo));
  // F844 · o caso em Pagamento é a fase final do mesmo benefício: o do mesmo NB se junta a ele (decisão do Paulo, 28.11.2026)
  const pgs = (D.casosDoCliente.get(cliId)||[]).filter(k=>k.fase==="pagamento").map(k=>[k, numerosDoCaso(k)]);
  for(const k of casosParaOrganizar(cliId)){
    const n = numerosDoCaso(k), alvo = pgs.filter(([, np])=>n.nb.length===1 && np.nb.includes(n.nb[0]));
    if(alvo.length!==1 || !podeJuntar(k, n, alvo[0][0], alvo[0][1])) continue;
    juntados.add(k.id);
    passos.push({acao:"juntar", de:k.id, para:alvo[0][0].id, txt:`Juntar o caso ${rotCurtoCaso(k)} ao caso ${rotCurtoCaso(alvo[0][0])}, em Pagamento: os dois têm o NB ${fmtNb(n.nb[0])}`, fonte:"o mesmo NB nos dois casos"});
  }
  const ks = casosParaOrganizar(cliId).filter(k=>!juntados.has(k.id));
  if(ks.length<2) return {passos, duvidas};
  const ev = evidenciaNbs(ks), nums = new Map(ks.map(k=>[k.id, numerosDoCaso(k)]));
  const itens = [];
  for(const k of ks){ const n = nums.get(k.id);
    for(const tipo of ["prot","nup","proc"]) for(const d of n[tipo]){
      const r = nbDoNumero(ev, tipo, d);
      if(r && r.nb){
        // o documento contradiz o NB do próprio caso, e nenhum outro caso tem o NB citado: decisão da pessoa
        const dono = ks.some(x=>nums.get(x.id).nb.includes(r.nb));
        if(n.nb.length && !n.nb.includes(r.nb) && !dono) duvidas.push({tipo, d, casoId:k.id, ranking:r.ranking.slice(0,3), contra:n.nb});
        else itens.push({tipo, d, casoId:k.id, nb:r.nb, fonte:r.ranking[0].fontes[0]||""});
      }
      else if(r && r.ranking.length && !(n.nb.length===1 && r.ranking.some(x=>x.nb===n.nb[0])))
        duvidas.push({tipo, d, casoId:k.id, ranking:r.ranking.slice(0,3)});
      else if(n.nb.length===1) itens.push({tipo, d, casoId:k.id, nb:n.nb[0], fonte:"o NB do próprio caso", doCaso:true});
    } }
  const grupos = new Map();
  for(const it of itens) grupos.set(it.nb, [...(grupos.get(it.nb)||[]), it]);
  const saem = new Map();   // caso -> {n, para:Set}: números que deixam o caso
  const sai = (casoId, para) => { const x = saem.get(casoId) || {n:0, para:new Set()}; x.n++; x.para.add(para); saem.set(casoId, x); };
  for(const [nb, g] of grupos){
    const donos = ks.filter(k=>nums.get(k.id).nb.includes(nb));
    if(donos.length>1){
      // F842 · o mesmo NB em dois casos do cliente é o mesmo benefício que mudou de fase: os outros se juntam ao mais
      // adiantado (decisão do Paulo, 27.11.2026). Só a tarefa do To Do se junta (vira casca, e a fusão se desfaz); nunca
      // quando o caso ficaria com dois NUP ou dois processos principais, nem revisão com concessão. O resto segue na sugestão "repetido".
      const ord = [...donos].sort((x,y)=>(ORDEM_FASE_ORG[y.fase]||0)-(ORDEM_FASE_ORG[x.fase]||0) || (x.todo_task_id?1:0)-(y.todo_task_id?1:0)
        || String(x.criado_em||"").localeCompare(String(y.criado_em||"")));
      const dest = ord[0], nd = nums.get(dest.id);
      for(const k of ord.slice(1)){
        const n = nums.get(k.id);
        if(!podeJuntar(k, n, dest, nd)) continue;
        juntados.add(k.id);
        passos.push({acao:"juntar", de:k.id, para:dest.id, txt:`Juntar o caso ${rotCurtoCaso(k)} ao caso ${rotCurtoCaso(dest)}: os dois têm o NB ${fmtNb(nb)}`, fonte:"o mesmo NB nos dois casos"});
      }
      continue;
    }
    const env = [...new Set([...g.map(x=>x.casoId), ...donos.map(k=>k.id)])].map(id=>D.casoPorId.get(id));
    if(env.length<2){
      const k = env[0];
      if(!donos.length && !nums.get(k.id).nb.length)
        passos.push({acao:"nb", para:k.id, nb, txt:`Anotar o NB ${fmtNb(nb)} no caso ${rotCurtoCaso(k)}`, fonte:g[0].fonte});
      continue;
    }
    env.sort((a,b)=>(ORDEM_FASE_ORG[b.fase]||0)-(ORDEM_FASE_ORG[a.fase]||0)
      || (donos.includes(b)?1:0)-(donos.includes(a)?1:0)
      || g.filter(x=>x.casoId===b.id).length-g.filter(x=>x.casoId===a.id).length
      || String(a.criado_em||"").localeCompare(String(b.criado_em||"")));
    const dest = env[0];
    if(!donos.length) passos.push({acao:"nb", para:dest.id, nb, txt:`Anotar o NB ${fmtNb(nb)} no caso ${rotCurtoCaso(dest)}`, fonte:g[0].fonte});
    else if(donos[0].id!==dest.id){
      passos.push({acao:"mover", tipo:"nb", d:nb, de:donos[0].id, para:dest.id, txt:`Levar o NB ${fmtNb(nb)} ao caso ${rotCurtoCaso(dest)}`, fonte:"o caso mais adiantado do benefício"});
      sai(donos[0].id, dest.id);
    }
    for(const it of g) if(it.casoId!==dest.id){
      passos.push({acao:"mover", tipo:it.tipo, d:it.d, de:it.casoId, para:dest.id,
        txt:`Levar ${TIPO_NUM[it.tipo]} ${fmtNum(it.tipo, it.d)} ao caso ${rotCurtoCaso(dest)} (NB ${fmtNb(nb)})`, fonte:it.fonte});
      sai(it.casoId, dest.id);
    }
  }
  // o caso que entrega todos os seus números a um só destino junta-se a ele
  // (só o que veio do To Do: a casca fica encerrada e a fusão se desfaz)
  for(const k of ks){
    const x = saem.get(k.id); if(!x || x.para.size!==1 || !k.todo_task_id || juntados.has(k.id)) continue;
    const total = Object.values(nums.get(k.id)).reduce((s,v)=>s+v.length, 0);
    const para = D.casoPorId.get([...x.para][0]);
    if(total && x.n>=total && para) passos.push({acao:"juntar", de:k.id, para:para.id,
      txt:`Juntar o caso ${rotCurtoCaso(k)} ao caso ${rotCurtoCaso(para)}, que fica com todos os números dele`, fonte:"o caso ficou sem número"});
  }
  const ordem = {nb:0, mover:1, juntar:2};
  passos.sort((a,b)=>ordem[a.acao]-ordem[b.acao] || (a.tipo==="nb"?-1:0)-(b.tipo==="nb"?-1:0));
  return {passos, duvidas};
}
async function aplicarPlano(cliId, passos, aoAndar){
  const feitos = [];
  for(const p of passos){
    let ok = false, reg = null;
    if(p.acao==="nb") ok = await anotarNbNoCaso(p.para, p.nb, {quieto:true});
    else if(p.acao==="mover") ok = await moverNumero(p.tipo, p.d, p.de, p.para, {quieto:true});
    else if(p.acao==="juntar"){ reg = await fundirCasos(p.de, p.para, {quieto:true}); ok = !!reg; }
    if(ok) feitos.push({acao:p.acao, tipo:p.tipo, d:p.d, nb:p.nb, de:p.de, para:p.para, ...(reg?{reg}:{})});
    if(aoAndar) aoAndar();
  }
  const c = D.cliPorId.get(cliId);
  if(feitos.length && c){
    const log = {em:new Date().toISOString(), por:eu.id, passos:feitos};
    c.campos = {...(c.campos||{}), org_auto:[...(((c.campos||{}).org_auto)||[]).slice(-2), log]};
    await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({campos:c.campos})}).catch(()=>{});
  }
  return feitos;
}
async function aplicarPlanoDoCliente(cliId){
  const {passos} = planoOrganizar(cliId); if(!passos.length) return;
  fecharCaixa(); aviso(`Organizando ${passos.length} passo(s)…`, false);
  const feitos = await aplicarPlano(cliId, passos);
  await carregar(); await abrirFicha(cliId);
  aviso(`${feitos.length} de ${passos.length} passo(s) aplicados ✔ — o Desfazer fica na janela de organizar`, false);
  organizarCasos(cliId);
}
async function desfazerOrganizacao(cliId){
  const c = D.cliPorId.get(cliId), logs = ((c&&c.campos)||{}).org_auto||[], log = logs[logs.length-1];
  if(!log) return;
  if(!await confirmar(`Desfazer a organização automática de ${fmtTS(log.em)} ${horaSP(log.em)}?\n\nOs ${log.passos.length} passos voltam atrás, do último ao primeiro.`)) return;
  fecharCaixa(); aviso("Desfazendo…", false);
  await abrirFicha(cliId);   // os andamentos do cliente, como estão agora
  for(const p of [...log.passos].reverse()){
    if(p.acao==="juntar"){ await desfazerFusao(p.reg); for(const x of (D._andsFicha||[])) if(((p.reg||{}).ids||{}).andamentos?.includes(x.id)) x.caso_id = p.de; }
    else if(p.acao==="mover") await moverNumero(p.tipo, p.d, p.para, p.de, {quieto:true});
    else if(p.acao==="nb") await tirarNbDoCaso(p.para, p.nb);
  }
  c.campos = {...c.campos, org_auto:logs.slice(0,-1)};
  await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({campos:c.campos})}).catch(()=>{});
  await carregar(); await abrirFicha(cliId);
  aviso("Organização desfeita ✔", false);
  organizarCasos(cliId);
}
// "é deste NB": a dúvida resolvida leva o número ao caso do NB, ou anota o NB no caso dele
async function resolverDuvida(tipo, d, casoId, nb){
  const ks = casosParaOrganizar((D.casoPorId.get(casoId)||{}).cliente_id);
  const dono = ks.find(k=>k.id!==casoId && nbsDoCaso(k).some(n=>soDig(n)===nb));
  if(dono) return levarNumero(tipo, d, casoId, dono.id);
  return anotarNbNoCaso(casoId, nb);
}
function planoHtml(cliId){
  const {passos, duvidas} = planoOrganizar(cliId);
  const c = D.cliPorId.get(cliId), log = (((c&&c.campos)||{}).org_auto||[]).slice(-1)[0];
  const linha = p => `<li><span>${esc(p.txt)}</span>${p.fonte?`<small class="meio-sub"> · ${esc(p.fonte)}</small>`:""}</li>`;
  const duv = x => { const k = D.casoPorId.get(x.casoId);
    return `<div class="org-s"><p><b>${esc(TIPO_NUM[x.tipo])} ${esc(fmtNum(x.tipo, x.d))}</b> <span class="meio-sub">· caso ${esc(rotCurtoCaso(k))}</span><br>
      <small class="meio-sub">${x.contra ? `o caso tem o NB ${x.contra.map(fmtNb).join(", ")}, e os documentos falam de outro` : "os documentos citam mais de um NB, sem folga entre eles"}</small></p>
      <div class="org-acoes">${x.ranking.map(r=>`<button type="button" class="adr-bt" onclick="resolverDuvida('${x.tipo}','${x.d}','${x.casoId}','${r.nb}')"
        title="${esc(r.fontes.join("; "))}">é do NB ${fmtNb(r.nb)} <small>(${r.pts})</small></button>`).join("")}</div></div>`; };
  return `${passos.length ? `<section class="org-plano" aria-label="O que o CRM organiza sozinho"><h4>O que o CRM organiza sozinho (${passos.length})</h4>
      <ol>${passos.map(linha).join("")}</ol>
      <div class="org-acoes"><button type="button" class="adr-bt adr-primario" onclick="aplicarPlanoDoCliente('${cliId}')">Aplicar os ${passos.length} passos</button>
        <span class="meio-sub">vai com os andamentos, os documentos e as tarefas de cada número, e se desfaz depois</span></div></section>` : ""}
    ${duvidas.length ? `<section class="org-sug org-duv" aria-label="Precisa de você"><h4>Precisa de você (${duvidas.length})</h4>${duvidas.map(duv).join("")}</section>` : ""}
    ${log ? `<p class="org-log">Organizado automaticamente em ${esc(fmtTS(log.em))} ${esc(horaSP(log.em))} (${log.passos.length} passos).
      <button type="button" class="adr-bt" onclick="desfazerOrganizacao('${cliId}')">Desfazer</button></p>` : ""}`;
}

// ── a organização em lote: todos os clientes de vários casos ─────────────
function clientesVariosCasos(){
  const por = new Map();
  for(const k of ativos()) por.set(k.cliente_id, [...(por.get(k.cliente_id)||[]), k]);
  const linhas = [];
  for(const [cid, todos] of por){
    // F844 · o caso em Pagamento conta quando divide o NB com outro caso do cliente (a fusão o tem como destino)
    const nbsPg = new Set(todos.filter(k=>k.fase==="pagamento").flatMap(k=>numerosDoCaso(k).nb));
    const comPg = todos.some(x=>x.fase!=="pagamento" && numerosDoCaso(x).nb.some(n=>nbsPg.has(n)));
    const ks = todos.filter(k=>k.fase!=="pagamento" || comPg);
    if(ks.length<2) continue;
    const c = D.cliPorId.get(cid); if(!c) continue;
    const org = (c.campos||{}).casos_org;
    if(org && !ks.some(k=>(k.criado_em||"")>org.em)) continue;   // organizado, e nenhum caso novo desde então
    const conta = {};
    for(const k of ks) for(const [t, ds] of Object.entries(numerosDoCaso(k))) for(const d of ds) conta[t+d] = (conta[t+d]||0)+1;
    const rep = Object.values(conta).filter(n=>n>1).length, semNum = ks.filter(k=>!Object.values(numerosDoCaso(k)).some(x=>x.length)).length;
    linhas.push({c, ks, rep, semNum});
  }
  return linhas.sort((a,b)=>b.rep-a.rep || b.semNum-a.semNum || b.ks.length-a.ks.length || (a.c.nome<b.c.nome?-1:1));
}
async function dadosDoCliente(cliId){
  const ids = (D.casosDoCliente.get(cliId)||[]).map(k=>k.id).join(",");
  const [ands, anexos] = await Promise.all([
    ids ? todas("andamentos", `select=id,caso_id,origem,origem_id,texto,criado_em,responde_a&caso_id=in.(${ids})`).catch(()=>[]) : [],
    todas("anexos", `select=id,caso_id,cliente_id,andamento_id,nome,caminho,origem,texto,criado_em&cliente_id=eq.${cliId}`).catch(()=>[])]);
  return {ands, anexos};
}
let _loteOrg = null;   // {planos:[{c, passos, duvidas, ands}], aplicando}
async function organizarTodos(){
  const linhas = clientesVariosCasos();
  if(!linhas.length) return aviso("Nenhum cliente com mais de um caso aberto para organizar");
  if(clienteAberto) fecharFicha(false);   // a ficha aberta não repinta com os dados de outro cliente
  _loteOrg = {planos:[], parar:false};
  caixa(`<div class="org-lote" role="dialog" aria-labelledby="org-lote-t">
    <h3 id="org-lote-t">Organizar os clientes de vários casos</h3>
    <p class="meio-sub" id="org-lote-st" aria-live="polite">Lendo os documentos de 0 de ${linhas.length} clientes…</p>
    <progress id="org-lote-pb" max="${linhas.length}" value="0"></progress>
    <div id="org-lote-res"></div></div>`);
  for(let i=0; i<linhas.length; i++){
    if(!document.getElementById("org-lote-pb")){ _loteOrg = null; D._andsFicha = []; D.anexos = []; _evCache = null; return; }   // fechou a janela: para
    const {c} = linhas[i];
    const dados = await dadosDoCliente(c.id);
    D._andsFicha = dados.ands; D.anexos = dados.anexos; _evCache = null;
    const pl = planoOrganizar(c.id);
    _loteOrg.planos.push({c, passos:pl.passos, duvidas:pl.duvidas, ands:dados.ands});
    const pb = document.getElementById("org-lote-pb"), st = document.getElementById("org-lote-st");
    if(pb) pb.value = i+1;
    if(st) st.textContent = `Lendo os documentos de ${i+1} de ${linhas.length} clientes…`;
  }
  D.anexos = []; _evCache = null;
  pintarLoteOrg();
}
function pintarLoteOrg(){
  const L = _loteOrg, res = document.getElementById("org-lote-res"); if(!L || !res) return;
  const com = L.planos.filter(p=>p.passos.length), soDuv = L.planos.filter(p=>!p.passos.length && p.duvidas.length);
  const semPista = L.planos.filter(p=>!p.passos.length && !p.duvidas.length);
  const total = com.reduce((s,p)=>s+p.passos.length, 0);
  const st = document.getElementById("org-lote-st");
  if(st) st.textContent = `${L.planos.length} clientes lidos: ${com.length} com organização pronta (${total} passos), ${soDuv.length} só com dúvidas e ${semPista.length} sem pista nos documentos.`;
  res.innerHTML = `${com.length ? `<section class="org-plano"><h4>Organização pronta</h4>
      <ul class="org-lote-lista">${com.map((p,i)=>`<li><label><input type="checkbox" class="org-lote-ck" data-i="${L.planos.indexOf(p)}" checked>
        <b>${esc(p.c.nome)}</b> <span class="meio-sub">${p.passos.length} passo(s)${p.duvidas.length?` · ${p.duvidas.length} dúvida(s)`:""}</span></label>
        <details><summary>ver os passos</summary><ol>${p.passos.map(x=>`<li>${esc(x.txt)}${x.fonte?` <small class="meio-sub">· ${esc(x.fonte)}</small>`:""}</li>`).join("")}</ol></details></li>`).join("")}</ul>
      <div class="org-acoes"><button type="button" class="adr-bt adr-primario" id="org-lote-ok" onclick="aplicarLoteOrg()" title="Aplicar nos clientes marcados">Aplicar<span class="sr-only"> nos clientes marcados</span></button>
        <span class="meio-sub">cada cliente ganha o Desfazer na janela de organizar dele</span></div></section>` : ""}
    ${soDuv.length ? `<section class="org-sug"><h4>Precisam de você (${soDuv.length})</h4>
      <ul class="org-lote-lista">${soDuv.map(p=>`<li><b>${esc(p.c.nome)}</b> <span class="meio-sub">${p.duvidas.length} número(s) com mais de um NB</span>
        <button type="button" class="adr-bt" onclick="fecharCaixa();abrirOrganizar('${p.c.id}')">organizar</button></li>`).join("")}</ul></section>` : ""}
    ${semPista.length ? `<details class="org-lote-sem"><summary>Sem pista nos documentos (${semPista.length})</summary>
      <p class="meio-sub">Nenhum documento destes casos cita NB. Abra e junte à mão o que for o mesmo benefício.</p>
      <ul class="org-lote-lista">${semPista.map(p=>`<li>${esc(p.c.nome)} <button type="button" class="adr-bt" onclick="fecharCaixa();abrirOrganizar('${p.c.id}')">organizar</button></li>`).join("")}</ul></details>` : ""}`;
}
async function aplicarLoteOrg(){
  const L = _loteOrg; if(!L || L.aplicando) return;
  const marcados = [...document.querySelectorAll(".org-lote-ck:checked")].map(x=>L.planos[+x.dataset.i]).filter(Boolean);
  if(!marcados.length) return aviso("Marque ao menos um cliente");
  const total = marcados.reduce((s,p)=>s+p.passos.length, 0);
  if(!await confirmar(`Aplicar ${total} passos em ${marcados.length} clientes?\n\nCada número leva junto os andamentos, os documentos e as tarefas dele. Cada cliente pode desfazer na janela de organizar.`)) return;
  L.aplicando = true;
  const bt = document.getElementById("org-lote-ok"); if(bt) bt.disabled = true;
  const st = document.getElementById("org-lote-st"), pb = document.getElementById("org-lote-pb");
  if(pb){ pb.max = total; pb.value = 0; }
  let feitos = 0, andou = 0;
  for(const p of marcados){
    D._andsFicha = p.ands; D.anexos = []; _evCache = null;
    const f = await aplicarPlano(p.c.id, p.passos, ()=>{ andou++; if(pb) pb.value = andou; if(st) st.textContent = `Aplicando ${andou} de ${total} passos…`; });
    feitos += f.length;
  }
  D._andsFicha = []; L.aplicando = false; _loteOrg = null;
  await carregar(); montarSidebar(); if(visao==="acervo") render();
  if(st) st.textContent = `${feitos} de ${total} passos aplicados em ${marcados.length} clientes ✔`;
  const res = document.getElementById("org-lote-res");
  if(res) res.innerHTML = `<p class="org-ok">Pronto. Os clientes com dúvida continuam na fila do Cuidar do acervo; o Desfazer de cada um fica na janela de organizar.</p>`;
}

// ══════════════════════════════════════════════════════════════════════════
// F322 · ETAPAS EM LOTE (pedido do Paulo, 31.10.2026; plano no Claude Doc "Etapas dos casos pelos andamentos").
// Roda a mesma proposta da placa (propostaDeEtapa, F236) em todos os casos abertos, com os andamentos do PAT, do
// PJe e do e-Recursos lidos de uma vez, e separa em quatro grupos: A pronto (grava de uma vez, decisão do Paulo),
// B a conferir (etapa contrariada ou fato duvidoso), C pede outra fase, D sem fato. A etapa vai ao portal do
// cliente; por isso só o grupo A grava em bloco, e só no clique (F119).
// ══════════════════════════════════════════════════════════════════════════
const LOTE_ET_FASES = new Set(["inss","conselho","judicial","pagamento","peticao_inicial"]);
const LOTE_ET_VELHO = 180;   // dias: o fato mais novo com mais tempo que isso descreve o passado
function casosDoLoteEtapa(){
  return D.casos.filter(k => k.fase!=="encerrado" && !ehPreCaso(k) && LOTE_ET_FASES.has(faseDaEtapa(k)));
}
// a dúvida que tira o caso do grupo A, ou ""
function duvidaDaProposta(k, p, hj){
  if(/sem confirma/.test(p.por||"")) return "perícia sem confirmação de comparecimento";
  const ult = crpsBlocos(k).flatMap(b=>b.eventos||[]).map(e=>({d:(CRPS.dataParaISO(e.data)||""), s:dsa(e.bruto||e.resumo||"")}))
    .sort((a,b)=>a.d<b.d?-1:1).pop();
  if(ult && /^arquiv/.test(ult.s.trim())) return "recurso arquivado no e-Recursos";
  const lim = new Date(hj+"T12:00:00"); lim.setDate(lim.getDate()-LOTE_ET_VELHO);
  if(p.data < lim.toLocaleDateString("sv")) return `fato de ${fmtBarra(p.data)}, sem nada mais novo`;
  return "";
}
// classifica um caso: {g:"A"|"B"|"C"|"D"|null, p, motivo}; null = a etapa já está de acordo
function grupoDaEtapa(k, ands, hj){
  const p = propostaDeEtapa(k, ands);
  if(!p) return {g: k.etapa ? null : "D", p:null, motivo: k.etapa ? "" : "nenhum andamento oficial reconhecido"};
  // o caso com duas frentes (recurso no CRPS ou pedido no INSS e mandado de segurança no Judicial): a proposta lê só os
  // fatos da fase do caso, e a mudança de fase com MS em paralelo vai à conferência, para não encerrar a outra frente
  const ms = processosDoCaso(k).some(x=>x.papel==="ms");
  if(p.mover) return {g: ms ? "B" : "C", p, motivo: ms ? "mandado de segurança em paralelo: conferir qual frente o fato encerra"
    : `o fato pede a fase ${NOME_FASE[p.mover]||p.mover}`};
  if(p.velha || p.fora) return {g:"B", p, motivo: p.fora ? "etapa atual de outra fase" : `etapa atual “${k.etapa}” contrariada`};
  const d = duvidaDaProposta(k, p, hj);
  return d ? {g:"B", p, motivo:d} : {g:"A", p, motivo:""};
}
let _loteEt = null;   // {itens:[{k, g, p, motivo}], ands:Map(caso_id → andamentos), gravados:[{k, antes, andId}]}
async function etapasEmLote(){
  if(!souAdmin()) return aviso("Apenas o administrador roda as etapas em lote");
  const ks = casosDoLoteEtapa();
  if(clienteAberto) fecharFicha(false);
  _loteEt = {itens:[], ands:new Map(), gravados:[]};
  caixa(`<div class="org-lote et-lote" role="dialog" aria-labelledby="et-lote-t">
    <h3 id="et-lote-t">Etapas dos casos pelos andamentos</h3>
    <p class="meio-sub" id="et-lote-st" aria-live="polite">Lendo os andamentos de 0 de ${ks.length} casos…</p>
    <progress id="et-lote-pb" max="${ks.length}" value="0"></progress>
    <div id="et-lote-res"></div></div>`);
  // os andamentos oficiais e as anotações de exigência, de 80 em 80 casos (a URL do in.() tem limite)
  for(let i=0; i<ks.length; i+=80){
    if(!document.getElementById("et-lote-pb")){ _loteEt = null; return; }   // fechou a janela: para
    const ids = ks.slice(i, i+80).map(k=>k.id).join(",");
    const r = await todas("andamentos", `select=id,caso_id,origem,origem_id,texto,criado_em,excluir&caso_id=in.(${ids})`
      + `&or=(origem.in.(pat,pje,crps),texto.ilike.*exig*)`).catch(()=>null);
    if(r===null){ _loteEt = null; return aviso("Não foi possível ler os andamentos; tente de novo"); }
    for(const a of r){ const l = _loteEt.ands.get(a.caso_id); l ? l.push(a) : _loteEt.ands.set(a.caso_id, [a]); }
    const pb = document.getElementById("et-lote-pb"), st = document.getElementById("et-lote-st");
    if(pb) pb.value = Math.min(i+80, ks.length);
    if(st) st.textContent = `Lendo os andamentos de ${Math.min(i+80, ks.length)} de ${ks.length} casos…`;
  }
  const hj = hoje();
  for(const k of ks){
    const x = grupoDaEtapa(k, _loteEt.ands.get(k.id)||[], hj);
    if(x.g) _loteEt.itens.push({k, ...x});
  }
  pintarLoteEtapa();
}
const nomeDoCasoLote = k => { const c = D.cliPorId.get(k.cliente_id); return (c && c.nome) || k.titulo || "(sem nome)"; };
function linhaLoteEtapa(it, i, ck){
  const k = it.k, fase = NOME_FASE[faseDaEtapa(k)] || faseDaEtapa(k);
  return `<li>${ck?`<label><input type="checkbox" class="et-lote-ck" data-i="${i}" checked> `:""}<b>${esc(nomeDoCasoLote(k))}</b>
    <span class="meio-sub">${esc(fase)}${k.especie?` · ${esc(k.especie)}`:""}</span>${ck?"</label>":""}
    ${it.p ? `<span class="et-lote-de">${k.etapa?`${esc(k.etapa)} → `:""}<b>${esc(rotuloProposta(it.p))}</b> <small class="meio-sub">(${esc(porDaProposta(it.p))})</small></span>` : ""}
    ${it.motivo?`<small class="meio-sub et-lote-mot">${esc(it.motivo)}</small>`:""}
    ${ck?"":acoesLoteEtapa(it, i)}</li>`;
}
// F322 · E3: cada grupo resolve na própria janela. B aceita a proposta, C move de fase com a etapa, D escolhe à mão
function acoesLoteEtapa(it, i){
  const abrir = `<button type="button" class="adr-bt" onclick="fecharCaixa();abrirFicha('${it.k.cliente_id}')">abrir</button>`;
  if(it.feito) return `<span class="et-lote-feito">✔ ${esc(it.feito)}</span> ${abrir}`;
  if(it.g==="B") return `<button type="button" class="adr-bt adr-primario" onclick="aceitarDoLote(${i})">${it.p.mover?"Mover e gravar":"Aceitar"}</button> ${abrir}`;
  if(it.g==="C") return `<button type="button" class="adr-bt adr-primario" onclick="aceitarDoLote(${i})" title="Mover e gravar">Mover<span class="sr-only"> e gravar</span></button> ${abrir}`;
  if(it.g==="D"){ const ops = etapasDaFase(it.k);
    return `<select class="et-lote-sel" id="et-lote-sel-${i}" aria-label="etapa de ${esc(nomeDoCasoLote(it.k))}"><option value="">escolher a etapa…</option>${
      ops.map(e=>`<option>${esc(e)}</option>`).join("")}</select>
      <button type="button" class="adr-bt" onclick="gravarEtapaDoLote(${i})">Gravar</button> ${abrir}`; }
  return abrir;
}
async function aceitarDoLote(i){
  const L = _loteEt, it = L && L.itens[i]; if(!it || it.feito) return;
  if(it.g==="B" && !it.p.mover){
    try{ L.gravados.push(await gravarPropostaEtapa(it.k, it.p)); it.feito = `gravado: ${rotuloProposta(it.p)}`; }
    catch(e){ return aviso("Não gravou; tente de novo"); }
  } else {
    // a mudança de fase passa pelo Aceitar da placa (andarEtapa), que lê os andamentos do caso
    const antes = D._andsFicha; D._andsFicha = L.ands.get(it.k.id) || [];
    try{ await aceitarEtapaProposta(it.k.id); } finally { D._andsFicha = antes; }
    if((it.k.etapa||null)!==it.p.etapa) return;   // não andou: o próprio Aceitar já avisou
    it.feito = `movido: ${rotuloProposta(it.p)}`;
  }
  pintarLoteEtapa();
}
async function gravarEtapaDoLote(i){
  const L = _loteEt, it = L && L.itens[i]; if(!it || it.feito) return;
  const etapa = (document.getElementById(`et-lote-sel-${i}`)||{}).value; if(!etapa) return aviso("Escolha a etapa");
  const k = it.k, antes = {etapa:k.etapa||null, trilha:k.trilha||null, resultado:k.resultado||null, decisao_em:k.decisao_em||null};
  const c = {etapa}, tr = trilhaSegueEtapa(k, etapa); if(tr) c.trilha = tr;
  try{ await patchCaso(k.id, c); Object.assign(k, c); }catch(e){ return aviso("Não gravou; tente de novo"); }
  L.gravados.push({k, antes, andId:null});
  it.feito = `gravado: ${etapa}`;
  montarSidebar(); pintarLoteEtapa();
}
function pintarLoteEtapa(){
  const L = _loteEt, res = document.getElementById("et-lote-res"); if(!L || !res) return;
  const por = g => L.itens.map((it,i)=>[it,i]).filter(([it])=>it.g===g);
  const feitos = L.itens.filter(it=>it.feito).length;
  const A = por("A"), B = por("B"), C = por("C"), Dd = por("D");
  const st = document.getElementById("et-lote-st");
  if(st) st.textContent = `${L.itens.length} casos sem a etapa de acordo com os fatos: ${A.length} prontos, ${B.length} a conferir, ${C.length} pedem outra fase e ${Dd.length} sem fato oficial${feitos?` (${feitos} já resolvidos aqui)`:""}.`;
  const lista = (xs, ck) => `<ul class="org-lote-lista">${xs.map(([it,i])=>linhaLoteEtapa(it, i, ck)).join("")}</ul>`;
  res.innerHTML = `${A.length ? `<section class="org-plano"><h4>A · Prontos para gravar (${A.length})</h4>
      <p class="meio-sub">Caso sem etapa, fato oficial da mesma fase, sem dúvida. Cada caso ganha o andamento curto "Etapa: …".</p>
      ${lista(A, true)}
      <div class="org-acoes"><button type="button" class="adr-bt adr-primario" id="et-lote-ok" onclick="gravarLoteEtapa()" title="Gravar as etapas marcadas">Gravar<span class="sr-only"> as etapas marcadas</span></button>
        <span class="meio-sub">a etapa gravada vai ao portal do cliente na próxima geração das fichas</span></div></section>` : ""}
    ${B.length ? `<details class="org-sug" open><summary><b>B · A conferir (${B.length})</b></summary>
      <p class="meio-sub">A etapa atual que um fato mais novo contradiz, a perícia sem confirmação, o recurso arquivado e o fato antigo. Aceite aqui o que estiver certo ou abra a ficha para conferir.</p>${lista(B)}</details>` : ""}
    ${C.length ? `<details class="org-sug"><summary><b>C · Pedem outra fase (${C.length})</b></summary>
      <p class="meio-sub">Trânsito, cálculos, RPV ou levantamento: o caso deve ir a outra lista. "Mover e gravar" leva o caso à lista com a etapa.</p>${lista(C)}</details>` : ""}
    ${Dd.length ? `<details class="org-lote-sem"><summary>D · Sem fato oficial (${Dd.length})</summary>
      <p class="meio-sub">Nenhum andamento do PAT, do e-Recursos ou dos tribunais diz a etapa. Escolha aqui; no Pagamento, "benefício implantado" responde se o benefício já foi implantado.</p>${lista(Dd)}</details>` : ""}
    ${!L.itens.length ? `<p class="org-ok">Todos os casos abertos estão com a etapa de acordo com os fatos ✔</p>` : ""}`;
}
// grava a proposta num caso, sem repintar: etapa (com a trilha), resultado e data da decisão do INSS, e o andamento curto
async function gravarPropostaEtapa(k, p){
  const antes = {etapa:k.etapa||null, trilha:k.trilha||null, resultado:k.resultado||null, decisao_em:k.decisao_em||null};
  const c = {etapa:p.etapa};
  const tr = trilhaSegueEtapa(k, p.etapa); if(tr) c.trilha = tr;
  if(p.etapa==="decidido" && p.fase==="inss"){
    if(p.resultado && (!k.resultado || (k.decisao_em||"") < p.data)) c.resultado = p.resultado;
    if(!k.decisao_em || k.decisao_em < p.data) c.decisao_em = p.data;
  }
  await patchCaso(k.id, c); Object.assign(k, c);
  let andId = null;
  try{
    const [a] = await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:k.id, autor_id:eu.id, texto:`Etapa: ${rotuloProposta(p)} (${porDaProposta(p)})`, publico:false})}) || [];
    if(a) andId = a.id;
  }catch(e){}
  return {k, antes, andId};
}
async function gravarLoteEtapa(){
  const L = _loteEt; if(!L || L.gravando) return;
  const marc = [...document.querySelectorAll(".et-lote-ck:checked")].map(x=>L.itens[+x.dataset.i]).filter(it=>it && it.g==="A");
  if(!marc.length) return aviso("Marque ao menos um caso");
  if(!await confirmar(`Gravar a etapa de ${marc.length} casos?\n\nCada caso ganha o andamento "Etapa: …" com o fato que a sustenta, e a etapa vai ao portal do cliente. O lote pode ser desfeito nesta janela.`)) return;
  L.gravando = true;
  const bt = document.getElementById("et-lote-ok"); if(bt) bt.disabled = true;
  const st = document.getElementById("et-lote-st"), pb = document.getElementById("et-lote-pb");
  if(pb){ pb.max = marc.length; pb.value = 0; }
  let falhas = 0;
  for(const it of marc){
    try{ L.gravados.push(await gravarPropostaEtapa(it.k, it.p)); it.g = "feito"; }catch(e){ falhas++; }
    if(pb) pb.value = L.gravados.length + falhas;
    if(st) st.textContent = `Gravando ${L.gravados.length + falhas} de ${marc.length} etapas…`;
  }
  L.gravando = false;
  montarSidebar(); if(visao==="acervo") render();
  pintarLoteEtapa();
  if(st) st.textContent = `${L.gravados.length} etapas gravadas${falhas?`, ${falhas} não gravaram`:""} ✔ ${st.textContent}`;
  const res = document.getElementById("et-lote-res");
  if(res && L.gravados.length) res.insertAdjacentHTML("afterbegin", `<p class="org-ok">${L.gravados.length} etapas gravadas.
    <button type="button" class="adr-bt" id="et-lote-desf" onclick="desfazerLoteEtapa()" title="Desfazer o lote">Desfazer<span class="sr-only"> o lote</span></button></p>`);
}
async function desfazerLoteEtapa(){
  const L = _loteEt; if(!L || !L.gravados.length) return;
  if(!await confirmar(`Devolver as ${L.gravados.length} etapas gravadas ao que eram e apagar os andamentos "Etapa: …"?`)) return;
  for(const g of L.gravados){
    Object.assign(g.k, g.antes); await patchCaso(g.k.id, g.antes).catch(()=>{});
    if(g.andId) await api(`/rest/v1/andamentos?id=eq.${g.andId}`,{method:"DELETE"}).catch(()=>{});
  }
  const n = L.gravados.length; L.gravados = [];
  L.itens.forEach(it=>{ if(it.g==="feito") it.g = "A"; if(it.feito && !/^movido/.test(it.feito)) it.feito = ""; });
  montarSidebar(); if(visao==="acervo") render(); pintarLoteEtapa();
  aviso(`${n} etapas voltaram como estavam`, false);
}
// F322 · E4: no 📥 Importar, depois de aplicar as coletas, as etapas que elas sugerem gravam pela mesma janela
function linhaEtapasDoImportar(){
  if(!souAdmin()) return "";
  const sem = casosDoLoteEtapa().filter(k=>!k.etapa).length;
  return `<p class="meio-sub et-importar">Depois de aplicar as coletas: <button class="btn-mini forte" onclick="etapasEmLote()"
    title="as coletas aplicadas propõem a etapa de cada caso; o grupo A grava de uma vez"><span aria-hidden="true">Etapas…</span><span class="sr-only">Etapas sugeridas…</span></button>
    ${sem?`${sem} caso(s) aberto(s) ainda sem etapa`:"todos os casos abertos têm etapa; a janela mostra as que os fatos novos contradizem"}</p>`;
}
// no 🧹 Cuidar do acervo: quantos casos abertos ainda não têm etapa
function blocoEtapasLote(){
  if(!souAdmin()) return "";
  const ks = casosDoLoteEtapa(), sem = ks.filter(k=>!k.etapa).length;
  return `<details class="sem-acao neutro" id="acervo-etapas"><summary>Etapas dos casos (${sem} de ${ks.length} casos abertos sem etapa)</summary>
    <div class="form-linha" style="margin:8px 0"><button class="btn-mini forte" onclick="etapasEmLote()"
      title="lê os andamentos do PAT, do e-Recursos e dos tribunais e mostra a etapa de cada caso antes de gravar"><span aria-hidden="true">Etapas…</span><span class="sr-only">Etapas em lote…</span></button>
      <span class="meio-sub">o CRM propõe a etapa pelos andamentos oficiais e grava apenas o que você marcar</span></div></details>`;
}

// ── o repasse em um clique: número e anotação vão ao caso certo ─────────
async function levarNumero(tipo, d, deId, paraId){
  const para = D.casoPorId.get(paraId), de = D.casoPorId.get(deId); if(!para || !de || !TIPO_NUM[tipo]) return;
  if(!await confirmar(`Levar ${TIPO_NUM[tipo]} ${fmtNum(tipo, d)} ao caso ${rotCurtoCaso(para)}?\n\nVão junto os andamentos, os documentos e as tarefas dele, e a sincronização do To Do não desfaz a mudança.`)) return;
  // o caso de origem que guarda outros números pode ter perícia de qualquer um deles: a pessoa decide
  const evs = eventosFuturos(deId), outros = Object.entries(numerosDoCaso(de)).some(([t, xs])=>xs.some(x=>!(t===tipo && x===d)));
  let eventos = "auto";
  if(evs.length && outros) eventos = await confirmar(`O caso de origem tem ${evs.length} agendamento(s) marcado(s):\n\n${evs.map(e=>`${e.tipo} em ${fmtTS(e.data_hora)}`).join("\n")}\n\nSão deste número e vão junto?`);
  await moverNumero(tipo, d, deId, paraId, {eventos});
}
// as perícias, avaliações e audiências ainda por acontecer de um caso
function eventosFuturos(casoId){
  const hj = hoje();
  return (D.eventos||[]).filter(e=>e.caso_id===casoId && e.status!=="cancelada" && dataSP(e.data_hora)>=hj);
}
// leva os agendamentos ao outro caso; o que o destino já tem (mesmo tipo e hora) é o mesmo agendamento e sai da origem
async function levarEventos(evs, paraId){
  let n = 0;
  for(const e of evs){
    try{ await api(`/rest/v1/eventos?id=eq.${e.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({caso_id:paraId})}); e.caso_id = paraId; n++; }
    catch(err){ await api(`/rest/v1/eventos?id=eq.${e.id}`,{method:"DELETE"}).catch(()=>{}); D.eventos = (D.eventos||[]).filter(x=>x.id!==e.id); }
  }
  return n;
}
function selLevarNumero(k, tipo, d){
  const outros = casosParaOrganizar(k.cliente_id).filter(x=>x.id!==k.id); if(!outros.length) return "";
  return `<select class="sel-levar" aria-label="levar ${esc(TIPO_NUM[tipo])} ${esc(fmtNum(tipo, d))} a outro caso do cliente"
    onchange="const v=this.value;this.value='';if(v)levarNumero('${tipo}','${d}','${k.id}',v)"><option value="">levar a outro caso…</option>${
    outros.map(x=>`<option value="${x.id}">${esc(rotCurtoCaso(x))}</option>`).join("")}</select>`;
}
// o NB de que o número trata, pelos documentos; de outro caso, com o botão que o leva até lá
function nbForaDoCaso(k, tipo, d){
  const ks = casosParaOrganizar(k.cliente_id); if(ks.length<2 || !ks.some(x=>x.id===k.id)) return null;
  const r = nbDoNumero(evidenciaNbs(ks), tipo, d); if(!r) return null;
  const meu = r.nb && nbsDoCaso(k).some(n=>soDig(n)===r.nb);
  return {r, dono: r.nb && !meu ? ks.find(x=>x.id!==k.id && nbsDoCaso(x).some(n=>soDig(n)===r.nb)) || null : null};
}
function chipNbNumero(k, tipo, d){
  const x = nbForaDoCaso(k, tipo, d); if(!x) return "";
  const {r, dono} = x;
  if(!r.nb) return `<span class="chip neutro nb-num" title="${esc(r.ranking.map(x=>`NB ${fmtNb(x.nb)}: ${x.pts}`).join(" · "))}">os documentos citam ${r.ranking.length} NBs</span>`;
  return `<span class="chip ${dono?"urg":"neutro"} nb-num" title="pelos documentos: ${esc(r.ranking[0].fontes.join("; "))}">NB ${fmtNb(r.nb)}${dono?" · de outro caso":""}</span>${
    dono ? `<button class="btn-mini" onclick="levarNumero('${tipo}','${d}','${k.id}','${dono.id}')" title="${esc(rotCurtoCaso(dono))}"><span aria-hidden="true">Levar</span><span class="sr-only">levar ao caso do NB</span></button>` : ""}`;
}
// no topo da aba: o número deste caso cujos documentos tratam do NB de outro caso
function avisoNumeroFora(k, tipo){
  return (numerosDoCaso(k)[tipo]||[]).map(d=>({d, x:nbForaDoCaso(k, tipo, d)})).filter(o=>o.x && o.x.dono)
    .map(({d, x})=>`<div class="num-fora" role="note"><span>${esc(TIPO_NUM[tipo])} ${esc(fmtNum(tipo, d))} trata do NB ${esc(fmtNb(x.r.nb))}, que está no caso ${esc(rotCurtoCaso(x.dono))}.</span>
      <button class="btn-mini forte" onclick="levarNumero('${tipo}','${d}','${k.id}','${x.dono.id}')" title="Levar ao caso do NB">Levar<span class="sr-only"> ao caso do NB</span></button></div>`).join("");
}
function itemLevarAndamento(a){
  const k = a && D.casoPorId.get(a.caso_id);
  if(!k || !casosParaOrganizar(k.cliente_id).some(x=>x.id!==k.id)) return "";
  return `<button class="tl-mais-it" role="menuitem" onclick="moverAndamento('${a.id}')" title="Levar a outro caso…"><span aria-hidden="true">Levar…</span><span class="sr-only">Levar a outro caso…</span></button>`;
}
function moverAndamento(andId){
  const a = (D._andsFicha||[]).find(x=>x.id===andId); if(!a) return;
  const k = D.casoPorId.get(a.caso_id); if(!k) return;
  const outros = casosParaOrganizar(k.cliente_id).filter(x=>x.id!==k.id);
  if(!outros.length) return aviso("O cliente não tem outro caso aberto");
  caixa(`<div class="adr-modal" role="dialog" aria-labelledby="mv-and-t"><h3 id="mv-and-t">Levar esta anotação a outro caso</h3>
    <p class="meio-sub" style="margin:0">Vão junto os documentos, as tarefas e as respostas dela. O caso de agora registra para onde ela foi.</p>
    <div class="esp-lista">${outros.map(x=>`<button type="button" class="esp-it" onclick="fecharCaixa();levarAndamento('${andId}','${x.id}')">${esc(rotCurtoCaso(x))}</button>`).join("")}</div></div>`);
}
async function levarAndamento(andId, paraId){
  const a = (D._andsFicha||[]).find(x=>x.id===andId), para = D.casoPorId.get(paraId); if(!a || !para) return;
  const deId = a.caso_id, ids = [a.id, ...(D._andsFicha||[]).filter(x=>x.responde_a===a.id).map(x=>x.id)].join(",");
  const mudar = {method:"PATCH", headers:{Prefer:"return=minimal"}, body:JSON.stringify({caso_id:paraId})};
  try{ await api(`/rest/v1/andamentos?id=in.(${ids})`, mudar); }
  catch(e){ return aviso("Não consegui levar a anotação — o outro caso já tem este mesmo andamento?"); }
  await api(`/rest/v1/anexos?andamento_id=in.(${ids})`, mudar).catch(()=>{});
  await api(`/rest/v1/andamento_tarefas?andamento_id=in.(${ids})`, mudar).catch(()=>{});
  await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({caso_id:deId, autor_id:eu.id,
    texto:`⇄ A anotação de ${fmtTS(a.criado_em)} foi levada ao caso "${tituloCaso(para)}".`})}).catch(()=>{});
  for(const x of (D._andsFicha||[])) if(ids.split(",").includes(x.id)) x.caso_id = paraId;
  aviso(`Anotação levada ao caso ${rotCurtoCaso(para)} ✔`, false);
  casoSel = paraId; await abrirFicha(para.cliente_id);
}

// ══════════════════════════════════════════════════════════════════════════
// F221 · A LINHA DA INCAPACIDADE. O cliente de benefício por incapacidade
// acumula casos em sequência: o auxílio cessa, pede-se a prorrogação,
// recorre-se, ajuíza-se, e um benefício novo começa. A linha mostra, em ordem
// de data, um item por NB: o período (DIB e DCB), a situação, o caso e a fase
// em que está, os números que tratam dele (inclusive os que estão em outro
// caso, com o botão de levar) e o próximo passo que o CRM já calcula
// (prorrogação, recurso, prazo de análise, exigência e perícia).
// ══════════════════════════════════════════════════════════════════════════
const RX_ESP_INCAP = /^B?(31|32|91|92|94|36)\b/i;
const RX_BEN_INCAP = /incapacidade|aux[ií]lio[- ]doen[cç]a|invalidez|aux[ií]lio[- ]acidente|acident[áa]ri|doen[cç]a/i;
const ehIncap = k => RX_ESP_INCAP.test(String(k.especie||"").trim()) || RX_BEN_INCAP.test(k.beneficio||"");
const _incapAberta = new Set();   // clientes com a linha aberta, nesta sessão
function proximosDoCaso(k){
  if(!k || k.fase==="encerrado") return [];
  const out = [], hj = hoje(), fe = faseEfetiva(k);
  const pe = prorrogarEm(k), fim = k.dcb ? somaDias(k.dcb, -1) : null;
  // a DCB vencida só é aviso no pedido ao INSS: no recurso e na ação ela é o motivo do caso
  // F236 · a janela são os 15 dias que ANTECEDEM a DCB (IN 128/2022, art. 339, § 3º): aberta, o pedido vem antes de
  // tudo e vai até a véspera
  if(pe && k.dcb>=hj) out.push(pe>hj ? {data:pe, txt:`Pedir a prorrogação a partir de ${fmtBarra(pe)}`}
    : fim>=hj ? {data:fim, urgente:true, txt:`Pedir a prorrogação até ${fmtBarra(fim)} (DCB ${fmtBarra(k.dcb)})`}
    : {data:k.dcb, alerta:true, txt:`A janela da prorrogação fechou em ${fmtBarra(fim)}: a DCB é ${fmtBarra(k.dcb)}`});
  else if(pe && (fe==="inss" || fe==="escritorio")) out.push({data:k.dcb, alerta:true, txt:`A DCB de ${fmtBarra(k.dcb)} passou sem pedido de prorrogação registrado`});
  const rec = recorrerAte(k); if(rec) out.push({data:rec, txt:`Recorrer até ${fmtBarra(rec)}`});
  const mora = prazoMora(k);
  if(mora && mora.parado) out.push({data:hj, alerta:true, txt:`Confirme se a ${mora.tipo} de ${fmtBarra(mora.pendente)} aconteceu: o prazo de análise só corre depois dela`});
  else if(mora) out.push({data:mora.data, alerta:mora.vencido, txt: mora.vencido ? `Análise do INSS vencida em ${fmtBarra(mora.data)}: ${msDecidido(k) ? "o MS por mora já foi decidido" : "avalie o MS por mora"}` : `O INSS deve decidir até ${fmtBarra(mora.data)}`});
  // F236 · a ordem ao INSS com prazo (a tutela de implantação, a liminar do MS) também é o próximo passo do benefício
  const ordI = ordemAoInss(k);
  if(ordI && ordI.data>=hj) out.push({data:ordI.data, txt: ordI.curto==="Conferir a implantação" ? `Conferir a implantação até ${fmtBarra(ordI.data)}` : `O INSS deve concluir a análise até ${fmtBarra(ordI.data)} (liminar)`});
  if(k.exigencia_prazo) out.push({data:k.exigencia_prazo, txt:`Cumprir a exigência até ${fmtBarra(k.exigencia_prazo)}`});
  const per = (D.eventos||[]).filter(e=>e.caso_id===k.id && e.status!=="cancelada" && dataSP(e.data_hora)>=hj).sort((a,b)=>String(a.data_hora).localeCompare(String(b.data_hora)))[0];
  if(per) out.push({data:dataSP(per.data_hora), txt:`${per.tipo||"Perícia"} em ${fmtBarra(dataSP(per.data_hora))}`});
  return out.sort((a,b)=>(b.urgente?1:0)-(a.urgente?1:0) || String(a.data).localeCompare(String(b.data)));
}
function linhaIncapacidade(cliId){
  const c = D.cliPorId.get(cliId); if(!c) return [];
  const rows = new Map();
  const linha = (nb, chaveCaso) => { const ch = nb || "caso:"+chaveCaso;
    if(!rows.has(ch)) rows.set(ch, {nb, esp:"", ini:"", dcb:"", sit:"", casos:[], nums:[], fontes:new Set(), prox:[]});
    return rows.get(ch); };
  const isoDe = v => /^\d{4}-\d{2}-\d{2}/.test(String(v||"")) ? String(v).slice(0,10) : isoBr(v);
  const ks = casosParaOrganizar(cliId), ev = evidenciaNbs(ks);
  // o caso sem NB entra na linha do NB que os documentos dos números dele citam
  const nbPelosDocs = k => { const n = numerosDoCaso(k);
    for(const t of ["proc","nup","prot"]) for(const d of n[t]){ const r = nbDoNumero(ev, t, d); if(r && r.nb) return r.nb; }
    return ""; };
  for(const k of (D.casosDoCliente.get(cliId)||[]).filter(ehIncap)){
    const nbs = nbsDoCaso(k).map(soDig).filter(x=>x.length===10);
    for(const nb of (nbs.length ? nbs : [nbPelosDocs(k)])){
      const r = linha(nb, k.id);
      if(!r.casos.includes(k)) r.casos.push(k);
      r.esp = r.esp || String(k.especie||"").toUpperCase();
      r.ini = r.ini || k.dib || k.der || "";
      if(k.dcb && (!r.dcb || k.dcb>r.dcb)) r.dcb = k.dcb;
      r.fontes.add("caso");
    }
  }
  // o dossiê: os benefícios do CNIS, as cartas de concessão e os laudos médicos periciais
  for(const v of (((cnisDe(c)||{}).vinculos)||[]).filter(v=>v.tipo==="Benefício" && v.nb)){
    if(!RX_ESP_INCAP.test(String(v.especie||"")) && !RX_BEN_INCAP.test(String(v.origem||""))) continue;
    const r = linha(soDig(v.nb));
    r.esp = r.esp || ("B"+String(v.especie||"").replace(/\D/g,"").slice(0,2));
    r.ini = r.ini || isoDe(v.inicio); if(!r.dcb && v.fim) r.dcb = isoDe(v.fim);
    if(v.situacao) r.sitCnis = String(v.situacao).toLowerCase();
    r.fontes.add("CNIS");
  }
  const fd = docsDoDossie(cliId).length ? fontesDoDossie(cliId) : null;
  for(const x of ((fd||{}).cartas||[])){ const r = x.nb && rows.get(soDig(x.nb)); if(r){ r.ini = r.ini || isoDe(x.dib||x.der); r.fontes.add("carta de concessão"); } }
  for(const l of ((fd||{}).laudos||[])){ const r = l.nb && rows.get(soDig(l.nb)); if(r){ (r.laudos = r.laudos||[]).push(l); r.fontes.add("laudo médico pericial"); } }
  // os números que tratam de cada NB, pelos documentos, em qualquer caso aberto do cliente
  for(const k of ks){ const n = numerosDoCaso(k);
    for(const tipo of ["prot","nup","proc"]) for(const d of n[tipo]){
      const nb = ((nbDoNumero(ev, tipo, d)||{}).nb) || (n.nb.length===1 ? n.nb[0] : "");
      const r = nb && rows.get(nb); if(r) r.nums.push({tipo, d, caso:k});
    } }
  for(const r of rows.values()){
    const vivo = r.casos.filter(k=>k.fase!=="encerrado").sort((a,b)=>(ORDEM_FASE_ORG[b.fase]||0)-(ORDEM_FASE_ORG[a.fase]||0))[0];
    r.prox = vivo ? proximosDoCaso(vivo).slice(0,2) : [];
    r.sit = r.dcb ? (r.dcb>=hoje() ? "ativo" : "cessado")
      : r.casos.some(k=>k.resultado==="deferido") ? "concedido"
      : r.sitCnis || (vivo ? "em andamento" : r.casos.length ? "encerrado" : "");
    r.vivo = vivo || null;
  }
  return [...rows.values()].sort((a,b)=>(a.ini||"9999").localeCompare(b.ini||"9999"));
}
