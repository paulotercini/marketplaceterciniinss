// P3 · a linha do quadro de datas, usada pelo quadro do caso e pela aba Prazos do cliente
function linhaQuadro(x, filha, hj){
    const venceu=x.data<hj && !x.aConfirmar, logo=!venceu && somaDias(hj,7)>=x.data;   // F236 · a perícia a confirmar não "venceu"
    return `<li class="qd-linha${venceu?" qd-venceu":logo?" qd-logo":""}${filha?" qd-filha":""}${x.ehPrazo?" qd-prazo":""}${x.semMotivo?" qd-semmotivo":""}">
      ${filha?`<span class="qd-elo" title="decorrente do prazo acima">↳ lembrar</span>`:""}
      ${x.edita?`<input type="date" value="${x.data}" class="qd-data" ${x.edita}
        title="trocar a data grava na hora">`
        :`<span class="qd-data-fixa">${fmt(x.data)}</span>`}
      <span class="qd-rot${x.clique?" qd-link":""}" ${x.clique||""}
        ${x.clique?`title="clique para ver a anotação que criou esta data"`:""}>${
        venceu?`<b class="qd-cobra">venceu ${fmt(x.data)}</b> · `:""}${filha||x.cru?"":x.ico+" "}${x.cru?x.rot:esc(x.rot)}</span>
      ${x.avs||""}${x.acao}</li>`;
}
function grupoQuadro(x, hj){
  return !x.filhas||!x.filhas.length?linhaQuadro(x, false, hj)
    :`<li class="qd-grupo"><ul class="qd-lista-filhas">${linhaQuadro(x, false, hj)}${
      x.filhas.sort((a,b)=>a.data<b.data?-1:1).map(f=>linhaQuadro(f, true, hj)).join("")}</ul></li>`;
}
function quadroDatas(k){
  const cliId=k.cliente_id, hj=hoje();
  const {linhas, soltas}=linhasDeDatas(cliId);
  const grupo=x=>grupoQuadro(x, hj);
  const nPrazos=linhas.filter(x=>x.ehPrazo).length;
  return `<div class="qd" id="quadro-datas">
    <div class="rotulo-caso">${temaV10()?`Prazos e providências${linhas.length?` · ${nPrazos?`${nPrazos} prazo${nPrazos>1?"s":""}`:""}${nPrazos&&linhas.length>nPrazos?" e ":""}${linhas.length>nPrazos?`${linhas.length-nPrazos} lembrete${linhas.length-nPrazos>1?"s":""}`:""}`:""}`:`📅 Lembretes e datas${linhas.length?` (${linhas.length})`:""}`}</div>
    ${/* F61 · quadro é RESUMO (pedido do Paulo): as datas nascem nos lugares
         próprios — andamentos do escritório, aba Lembretes, Perícias */""}
    ${linhas.length?`<ul class="qd-lista">${soltas.map(grupo).join("")}</ul>`
      :`<p class="meio-sub" style="margin:2px 0 4px">${temaV10()?"Sem prazos ou providências em aberto. Registre um andamento com data para criar o lembrete.":"Nenhuma data marcada para este cliente."}</p>`}
  </div>`;
}
// P3 (prazos, 31.10.2026) · a aba Prazos da ficha: todas as datas do cliente numa tela, as do cliente primeiro (qualidade,
// decadência, contribuições, cards) e depois as de cada caso aberto, do caso mais urgente ao menos. Vencido conta à parte.
function prazosDoCliente(cliId){
  const {soltas} = linhasDeDatas(cliId), grupos = new Map();
  for(const x of soltas){ const g = x.casoId || ""; if(!grupos.has(g)) grupos.set(g, []); grupos.get(g).push(x); }
  const hj = hoje(), venc = soltas.filter(x=>x.data<hj && !x.aConfirmar).length;
  const lista = soltas.slice().sort((a, b)=>a.data<b.data?-1:a.data>b.data?1:(natDaLinha(a)==="fatal"?-1:0)-(natDaLinha(b)==="fatal"?-1:0));
  return {grupos, total: soltas.length, venc, lista};
}
// F453 · A ABA PRAZOS EM MÊS E LISTA (proposta C escolhida pelo Paulo em 08.11.2026, https://claude.ai/artifact/A2LoP3MwVs5STJyKYzzpHJ,
// ideias do Replit e do Base44). No alto, a faixa do próximo prazo fatal; depois a natureza (com Retorno à parte) e Por data
// ou Por caso; a lista à esquerda e o mês à direita (no celular, o mês no alto). O dia clicado filtra a lista; Limpar volta.
// O mês substitui a linha dos 30 dias (F382) e os três quadros de contagem (F326). A escolha vale na sessão.
let _pzVer = "data", _pzNat = "todos", _pzCli = [], _pzCliId = null, _pzDia = null, _pzMes = null;
function painelPrazosCliente(cliId){ if(cliId!==_pzCliId){ _pzDia = null; _pzMes = null; } return `<div class="pz-cli pzc" id="pz-cli">${pzConteudo(cliId)}</div>`; }
function pzPintar(cliId){ const el = document.getElementById("pz-cli"); if(el) el.innerHTML = pzConteudo(cliId || _pzCliId); }
function pzVer(v){ _pzVer = v; pzPintar(); }
function pzNat(v){ _pzNat = v; pzPintar(); }
function pzDia(d){ _pzDia = _pzDia===d ? null : d; pzPintar(); }
function pzMes(n){ const m = _pzMes || hoje().slice(0,7), d = new Date(m+"-15T12:00:00"); d.setMonth(d.getMonth()+n); _pzMes = d.toISOString().slice(0,7); pzPintar(); }
// o retorno do To Do e a volta à fila têm chip próprio (Retorno), embora a natureza seja lembrete
const ehRetornoPz = x => x.rotulo==="Retorno" || x.rotulo==="Volta à fila";
const natFiltroPz = x => ehRetornoPz(x) ? "retorno" : x._nat;
const corPz = x => ehRetornoPz(x) ? "ret" : x._nat==="fatal" ? "fatal" : x._nat==="compromisso" ? "comp" : "lemb";
const pillPz = x => ehRetornoPz(x) ? `<span class="pz-pill pz-pill-lembrete"><i aria-hidden="true"></i>${esc(x.rotulo)}</span>${pillTodo(x)}` : pillNat(x._nat) + pillTodo(x);
const MES_LONGO = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
function barraPz(ini, x, cls, fimLab){
  const hj = hoje();
  if(!ini || !(x.data>ini.data)) return "";
  const pct = Math.max(0, Math.min(100, Math.round(100*diasEntreIso(ini.data, hj)/diasEntreIso(ini.data, x.data))));
  return `<div class="${cls}-barra" role="progressbar" aria-label="tempo do prazo já passado" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i>${ini.data<=hj && hj<=x.data ? `<em style="left:${pct}%"><span>hoje</span></em>` : ""}</div>
    <div class="${cls}-bl"><span>${esc(ini.lab || `${ini.rot} · ${diaCurtoPz(ini.data)}`)}</span><span>${esc(fimLab || `Vence · ${diaCurtoPz(x.data)}`)}</span></div>`;
}
// a faixa do próximo prazo fatal (Base44, proposta B): o número grande à esquerda, o que é no meio, a barra fina e o Abrir
function pzHero(x){
  const f = x._f, k = x.casoId && D.casoPorId.get(x.casoId), qid = quemDaLinha(x, _pzCliId), i = _pzCli.indexOf(x);
  const venc = x.data<hoje(), ini = inicioDaLinha(x);
  const pct = ini && x.data>ini.data ? Math.max(0, Math.min(100, Math.round(100*diasEntreIso(ini.data, hoje())/diasEntreIso(ini.data, x.data)))) : null;
  const meta = [k ? casoCurtoPz(k) : "Do cliente", ini && ini.rot!=="Anotado" ? `${ini.rot==="Intimação" ? "Intimação" : ini.rot==="Contado de" ? "Contado de" : "Ciência em"} ${fmtBarra(ini.data)}`.replace(/^(Intimação|Contado de) /, "$1 em ").replace("Contado de em", "Contado de") : "",
    `${venc ? "Venceu" : "Vence"} em ${fmtBarra(x.data)}, ${DIA_EXT[new Date(x.data+"T12:00:00").getDay()]}`];
  return `<section class="pzc-hero pzc-u-${f.urg}" aria-label="${venc ? "Prazo fatal vencido" : "Próximo prazo fatal"}">
    <div class="pzc-hero-n">${f.pre && f.pre!=="vence" ? `<small>${esc(f.pre)}</small>` : ""}<b>${esc(String(f.n))}</b><span>${esc(f.un)}</span></div>
    <div class="pzc-hero-txt"><span class="pzc-sobre">${venc ? "Prazo fatal vencido" : "Próximo prazo fatal"}</span>
      <h2>${esc(x._titulo)}</h2>
      <p>${meta.filter(Boolean).map(s=>`<span>${esc(s)}</span>`).join("")}${qid ? avPz(qid) : ""}</p>
      ${pct!==null ? `<div class="pzc-trilho" title="${esc(`${diasEntreIso(ini.data, hoje())} de ${diasEntreIso(ini.data, x.data)} dias corridos`)}"><i style="width:${pct}%"></i></div>` : ""}</div>
    <button type="button" class="pzc-pri" onclick="abrirPainelPrazo(${i},'cli')" title="Abrir o prazo">Abrir</button>
  </section>`;
}
// Reagendar no grupo Vencidos: a mesma janela do Meu Dia (F442), com o retorno, a volta à fila e o lembrete da anotação
function pzReagendar(){
  const hj = hoje(), ts = D.tarefasFicha || [];
  _reagVenc = _pzCli.filter(x=>x.data<hj && !x.aConfirmar).map(x=>{
    const k = x.casoId && D.casoPorId.get(x.casoId);
    if(ehRetornoPz(x) && k) return {k, selo:x.rotulo, data:x.data};
    const tc = x.andId && x._nat!=="fatal" && ts.find(t=>t.andamento_id===x.andId && !t.concluida_em && t.natureza!=="fatal");
    return tc ? {tc, data:x.data} : {fatal:true};
  });
  reagendarVencidas();
}
function calendarioPz(){
  const hj = hoje(), m = _pzMes || hj.slice(0,7), [y, mm] = m.split("-").map(Number), ini = new Date(y, mm-1, 1, 12), off = ini.getDay();
  const nDias = new Date(y, mm, 0).getDate(), sem = Math.ceil((off + nDias)/7)*7;
  const por = new Map(); for(const x of _pzCli){ if(!x.aConfirmar){ if(!por.has(x.data)) por.set(x.data, []); por.get(x.data).push(x); } }
  let h = ["D","S","T","Q","Q","S","S"].map(s=>`<span class="pzm-sem" aria-hidden="true">${s}</span>`).join("");
  for(let j=0; j<sem; j++){
    const d = new Date(y, mm-1, 1-off+j, 12), iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const its = por.get(iso) || [], cls = ["pzm-d", d.getMonth()!==mm-1 ? "pzm-fora" : "", iso===hj ? "pzm-hoje" : "", _pzDia===iso ? "pzm-sel" : "", ehDiaUtil(iso) ? "" : "pzm-nu"].filter(Boolean).join(" ");
    h += `<button type="button" class="${cls}" onclick="pzDia('${iso}')" aria-pressed="${_pzDia===iso}" aria-label="${esc(`${diaLongoPz(iso)}${its.length ? `, ${its.length} ${its.length===1?"item":"itens"}` : ""}`)}"${its.length ? ` title="${esc(its.map(x=>x._titulo).join(" · "))}"` : ""}>${d.getDate()}<span class="pzm-pts">${its.slice(0,4).map(x=>`<i class="pzm-${corPz(x)}"></i>`).join("")}</span></button>`;
  }
  return `<aside class="pzm" aria-label="Mês"><div class="pzm-cab"><button type="button" class="pzm-nav" onclick="pzMes(-1)" aria-label="Mês anterior">‹</button><b>${MES_LONGO[mm-1][0].toUpperCase()+MES_LONGO[mm-1].slice(1)} de ${y}</b><button type="button" class="pzm-nav" onclick="pzMes(1)" aria-label="Mês seguinte">›</button></div>
    <div class="pzm-g">${h}</div>
    <div class="pzm-leg"><span><i class="pzm-fatal"></i>Prazo fatal</span><span><i class="pzm-comp"></i>Compromisso</span><span><i class="pzm-lemb"></i>Lembrete</span><span><i class="pzm-ret"></i>Retorno</span></div></aside>`;
}
function pzConteudo(cliId){
  const hj = hoje(), em = n => somaDias(hj, n);
  _pzCliId = cliId;
  _pzCli = prazosDoCliente(cliId).lista;
  _pzCli.forEach((x, i)=>prepPz(x, i, "cli"));
  if(painelPz && painelPz.fonte==="cli"){ const j = _pzCli.findIndex(x=>x.data===painelPz.data && (x.andId||"")===painelPz.andId && (x.rotulo||"")===painelPz.rotulo);
    if(j>=0) setTimeout(()=>abrirPainelPrazo(j, "cli")); }
  if(!_pzCli.length) return `<div class="pzc-vazio"><b>Sem prazos em aberto</b><span>O prazo fatal nasce da anotação com a chave Prazo fatal; o lembrete, da anotação com data.</span></div>`;
  const pend = x => x.data<hj && !x.aConfirmar;
  const nNat = v => _pzCli.filter(x=>v==="todos" || natFiltroPz(x)===v).length;
  if(!nNat(_pzNat)) _pzNat = "todos";
  const fatais = _pzCli.filter(x=>x._nat==="fatal" && !x.aConfirmar);
  const heroX = fatais.find(x=>x.data>=hj) || fatais.find(pend) || null;
  const ferr = `<div class="pzc-ferr">
    <div class="pzc-chips" role="group" aria-label="Filtrar pela natureza">${[["todos","Todos"],["fatal","Prazo fatal"],["compromisso","Compromisso"],["lembrete","Lembrete"],["retorno","Retorno"]].map(([v, r])=>
      `<button type="button" aria-pressed="${_pzNat===v}" class="pzc-chip${_pzNat===v?" on":""}" onclick="pzNat('${v}')"${!nNat(v) && v!=="todos" ? " disabled" : ""}>${r} <span>${nNat(v)}</span></button>`).join("")}</div>
    <div class="pzc-seg" role="group" aria-label="Agrupar os prazos">${[["data","Por data"],["caso","Por caso"]].map(([v, r])=>
      `<button type="button" aria-pressed="${_pzVer===v}" class="${_pzVer===v?"on":""}" onclick="pzVer('${v}')">${r}</button>`).join("")}</div>
  </div>`;
  const vis = _pzCli.filter(x=>(_pzNat==="todos" || natFiltroPz(x)===_pzNat) && (!_pzDia || x.data===_pzDia));
  const porData = _pzVer!=="caso" || celular();
  let grupos;
  if(porData){
    const G = [["Vencidos", pend, "venc"], ["A confirmar", x=>x.aConfirmar, "conf"], ["Hoje", x=>x.data===hj, "hoje"],
      ["Próximos 7 dias", x=>x.data>hj && x.data<=em(7), ""], ["Até 30 dias", x=>x.data>em(7) && x.data<=em(30), ""],
      ["Mais adiante", x=>x.data>em(30), ""]];
    const ja = new Set();
    grupos = G.map(([rot, f, tom])=>{ const g = vis.filter(x=>!ja.has(x) && f(x)); g.forEach(x=>ja.add(x)); return {rot, g, tom}; }).filter(o=>o.g.length);
  }else{
    const m = new Map(); for(const x of vis){ const c = x.casoId || ""; if(!m.has(c)) m.set(c, []); m.get(c).push(x); }
    grupos = [...m.keys()].sort((a, b)=>(a==="" ? -1 : b==="" ? 1 : 0) || (m.get(a)[0].data<m.get(b)[0].data ? -1 : 1)).map(c=>{
      const k = c && D.casoPorId.get(c);
      return {rot: k ? `${tituloCaso(k)} · ${NOME_FASE[faseEfetiva(k)] || k.fase || ""}` : "Do cliente", g: m.get(c), caso: c, k}; });
  }
  const linha = x => {
    const i = _pzCli.indexOf(x), f = x._f, k = x.casoId && D.casoPorId.get(x.casoId), qid = quemDaLinha(x, cliId), q = D.colPorId.get(qid), d = new Date(x.data+"T12:00:00");
    return `<li class="pzc-lin pzc-c-${corPz(x)} pzc-u-${f.urg}${pend(x) ? " pzc-venc" : ""}" data-nat="${x._nat}" data-data="${x.data}">
      <span class="pzc-dia" title="${esc(diaLongoPz(x.data))}"><b>${String(d.getDate()).padStart(2,"0")}</b><small>${MES_CURTO[d.getMonth()]}</small></span>
      <span class="pzc-o"><b class="pzc-t">${esc(x._titulo)}</b><span class="pzc-sub">${pillPz(x)}<span class="pzc-caso" title="${esc(k ? `${tituloCaso(k)} · ${NOME_FASE[faseEfetiva(k)]||""}` : "Do cliente")}">${esc(casoCurtoPz(k))}</span>${q ? `<span class="pzc-quem" title="${esc(q.nome)}">${avPz(qid)}</span>` : ""}</span></span>
      <span class="pzc-falta">${esc(f.txt)}</span>
      <button type="button" class="pzc-abrir" onclick="abrirPainelPrazo(${i},'cli')" aria-label="Abrir o prazo: ${esc(x._titulo)}">Abrir</button>
    </li>`;
  };
  const lista = (_pzDia ? `<div class="pzc-gt pzc-dia-sel"><span>Dia ${fmtBarra(_pzDia)}</span><button type="button" class="pzc-lk" onclick="pzDia(null)">Limpar</button></div>` : "")
    + (grupos.length ? grupos.map(o=>`<section class="pzc-g${o.tom ? ` pzc-g-${o.tom}` : ""}${porData ? "" : " pz-cli-g"}"${porData ? "" : ` data-caso="${o.caso||""}"`}>
      <h3 class="pzc-gt"><span>${esc(o.rot)}</span> <span class="pzc-gn">${o.g.length}</span>${o.tom==="venc" ? `<button type="button" class="pzc-lk" onclick="pzReagendar()" title="Leva retornos, voltas à fila e lembretes vencidos a outra data. O prazo fatal fica.">Reagendar</button>` : ""}${o.k ? `<button type="button" class="pzc-g-abrir" onclick="casoSel='${o.k.id}';abaAtiva=2;subAba='escritorio';repintarFicha()" title="Abrir o caso">Abrir<span class="sr-only"> o caso</span></button>` : ""}</h3>
      <ul class="pzc-lista">${o.g.map(linha).join("")}</ul></section>`).join("")
    : `<p class="pzc-nada">${_pzDia ? "Nenhum prazo neste dia." : "Nenhum prazo desta natureza."}</p>`);
  return `${heroX ? pzHero(heroX) : ""}${ferr}<div class="pzc-grade"><div class="pzc-col">${lista}</div>${calendarioPz()}</div>`;
}
// ══════════════════════════════════════════════════════════════════════════
// F104 · OS QUADROS DE PRAZO (tema v10). Um quadro por prazo, lado a lado,
// limpos: o tipo, a data e o "saber mais". Prazo processual em vermelho,
// lembrete em cinza. É a ANOTAÇÃO que comanda: o "saber mais" leva até o
// andamento que criou a data; quando a data não nasceu de anotação
// (exigência, DCB, recurso, perícia), abre a ficha dela com as ações.
// O prazo fatal sem anotação de origem NÃO vira quadro (pedido do Paulo).
// ══════════════════════════════════════════════════════════════════════════
let faixaAtual = [];
// F116 · as três naturezas da data, com os nomes que o escritório usa
const NAT_ROT = {fatal:"Prazo fatal", compromisso:"Compromisso", lembrete:"Lembrete"};
const natDaLinha = x => x.natureza || (x.ehPrazo ? "fatal" : "lembrete");
// F236 · o tipo da linha (o que é) e o resumo (o que fazer, o ato, a tarefa), para o cartão e para o resumo do topo
const tipoDaLinha = x => x.rotulo || (x.ico==="🩺" && !x.ehPrazo ? "Perícia" : x.ico==="📌" ? "Comentário fixo"
  : x.filha ? "Lembrar antes" : NAT_ROT[natDaLinha(x)]);
// F407 · a linha do prazo do assistente se chama pelo que a linha "⏳ Prazo:" diz, e não pela primeira frase da avaliação
const pzAssDaLinha = x => { const a = x.andId && (D._andsFicha||[]).find(b=>b.id===x.andId);
  return a && /^⏰ \[PRAZO /.test(a.texto||"") ? (pzDoAssistente(a.texto)||{}).desc || "" : ""; };
const resumoDaLinha = x => pzAssDaLinha(x) || x.resumo || (x.cru ? "" : cortaFrase(String(x.rot||"").replace(/^[⏰🔥\s]*\[PRAZO [0-9.]+\]\s*/u,"").replace(/\s+/g," ").trim(), 70));
// a linha da coluna é fina (F145): à vista vai o nome curto do que é; no tipo genérico (compromisso, lembrete, prazo
// fatal com motivo) vale mais o resumo, que diz o que fazer e de quem é. O nome inteiro fica no title e no "saber mais".
const RX_TIPO_GENERICO = /^(Compromisso|Lembrete|Lembrar antes|Prazo fatal|Tarefa|Documento pedido)$/;
const visivelDaLinha = x => { const t = tipoDaLinha(x), r = resumoDaLinha(x);
  return x.curto || (RX_TIPO_GENERICO.test(t) && r ? r : t); };
// ══════════════════════════════════════════════════════════════════════════
// F326 · A TELA PRAZOS (desenho aprovado pelo Paulo em 31.10.2026). O título, quanto falta, de onde vem, quem faz e
// de quando se conta são os mesmos na faixa do caso, na aba Prazos do cliente e na janela do prazo.
// ══════════════════════════════════════════════════════════════════════════
function tituloDaLinha(x){
  const nat = natDaLinha(x), tipo = tipoDaLinha(x), resumo = resumoDaLinha(x), vis = visivelDaLinha(x), kx = D.casoPorId.get(x.casoId),
        motivo = nat==="fatal" && kx && kx.prazo===x.data && kx.lembrar_motivo;
  // "Recurso ordinário à Junta de Recursos", e não "Recurso ordinário: à Junta de Recursos"
  const junta = (a, b) => /^(à|às|ao|aos|de|da|do|no|na|pelo|pela|para)\s/i.test(b) ? `${a} ${b}` : `${a}: ${b}`;
  const t = (RX_TIPO_GENERICO.test(resumo || vis) && motivo)
    || (RX_TIPO_GENERICO.test(tipo) ? (resumo || vis) : resumo && resumo!==vis ? junta(vis, resumo) : vis);
  // o prazo que veio do "Concluir em" do To Do sem descrição pede a descrição, em vez de repetir "Prazo fatal"
  return {titulo: x.semMotivo && !motivo && RX_TIPO_GENERICO.test(t) ? (x.todo ? "Prazo do Microsoft To Do" : "Prazo sem descrição") : t, motivo};
}
const DIA_EXT = ["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
const diaCurtoPz = iso => `${SIGLA_DIA[new Date(iso+"T12:00:00").getDay()]}., ${fmtBarra(iso).slice(0,5)}`;
const diaLongoPz = iso => `${DIA_EXT[new Date(iso+"T12:00:00").getDay()]}, ${fmtBarra(iso)}`;
const diaAnoPz = iso => `${SIGLA_DIA[new Date(iso+"T12:00:00").getDay()]}., ${fmtBarra(iso)}`;
const isoDoCarimbo = s => String(s||"").replace(/^(\d{2})\.(\d{2})\.(\d{4})$/, "$3-$2-$1");
// os dias úteis entre duas datas (negativo quando "ate" é antes de "de"), sem contar o primeiro dia
function uteisEntre(de, ate){
  const passo = ate>=de ? 1 : -1; let n = 0, d = de;
  for(let i=0; d!==ate && i<4000; i++){ d = somaDias(d, passo); if(ehDiaUtil(d)) n++; }
  return passo*n;
}
// quanto falta: o prazo fatal em dias úteis, o resto em dias corridos; urg dá a cor (venc, hoje, crit, perto, medio, normal)
function faltaPz(x){
  // a janela da prorrogação (até a véspera da DCB) conta como o prazo fatal que ela é, em dias úteis
  const hj = hoje(), d = diasAte(x.data), fatal = natDaLinha(x)==="fatal" || !!x.prorrogDe;
  const pl = (n, um, mais) => `${n} ${n===1?um:mais}`;
  if(x.aConfirmar) return {txt:"a confirmar", urg:"perto", pre:"", n:"?", un:"a confirmar"};
  if(d===0) return {txt:"vence hoje", urg:"hoje", pre:"vence", n:"hoje", un:fatal ? "é o último dia" : ""};
  if(fatal){
    const u = Math.abs(uteisEntre(hj, x.data));
    if(d<0){ const v = Math.max(1, u); return {txt:`venceu há ${pl(v,"dia útil","dias úteis")}`, urg:"venc", pre:"venceu há", n:v, un:v===1?"dia útil":"dias úteis"}; }
    if(!u) return {txt:`faltam ${pl(d,"dia corrido","dias corridos")}`, urg:"crit", pre:"", n:d, un:d===1?"dia corrido":"dias corridos"};
    return {txt:`${u===1?"falta":"faltam"} ${pl(u,"dia útil","dias úteis")}`, urg:u<=3?"crit":d<=7?"perto":d<=30?"medio":"normal", pre:"", n:u, un:u===1?"dia útil":"dias úteis"};
  }
  if(d<0) return {txt:`venceu há ${pl(-d,"dia","dias")}`, urg:"venc", pre:"venceu há", n:-d, un:-d===1?"dia":"dias"};
  return {txt:d===1?"amanhã":`em ${d} dias`, urg:d<=7?"perto":d<=30?"medio":"normal", pre:"", n:d, un:d===1?"dia":"dias"};
}
const desEsc = s => String(s||"").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,"&");
// de onde vem: o título e a explicação que a linha traz (o <small class="qd-de"> do quadro), em texto
function deOndeDaLinha(x){
  const rot = String(x.rot||""), limpa = s => desEsc(s.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
  return {tit: limpa(rot.replace(/<small[\s\S]*?<\/small>/g, "")),
    txt: [...rot.matchAll(/<small[^>]*>([\s\S]*?)<\/small>/g)].map(m=>limpa(m[1])).filter(Boolean).join(" ")};
}
// a linha de baixo de cada prazo na aba: quem anotou e quando, ou a explicação sem o nome do caso (que já está ao lado)
function metaDaLinha(x){
  if(x.andId){ const a = (D._andsFicha||[]).find(y=>y.id===x.andId);
    if(a){ const q = D.colPorId.get(a.autor_id); return `Anotado${q ? ` por ${q.nome.split(" ")[0]}` : ""} em ${diaCurtoPz(dataSP(a.criado_em))}`; } }
  let s = deOndeDaLinha(x).txt;
  const k = x.casoId && D.casoPorId.get(x.casoId), t = k ? " · " + tituloCaso(k) : "";
  if(t && s.endsWith(t)) s = s.slice(0, -t.length);
  return s;
}
// quem faz: o executor da tarefa da anotação (ou da tarefa decorrente), senão quem cuida do caso, senão o advogado
function quemDaLinha(x, cliId){
  const ts = D.tarefasFicha || [];
  for(const id of [x.andId, ...(x.filhas||[]).map(f=>f.andId)].filter(Boolean)){
    const t = ts.filter(y=>y.andamento_id===id && !y.concluida_em), ex = t.find(y=>y.papel!=="revisa") || t[0];
    if(ex) return ex.colaborador_id;
  }
  const k = x.casoId && D.casoPorId.get(x.casoId);
  // sem tarefa e sem atribuição no caso, responde o advogado responsável pelo cliente (e não o administrador)
  const atr = k ? ((D.atrDoCaso.get(k.id)||[])[0] || (donoDaLista(k)||{}).id) : null;
  return atr || advogadoDoCliente(cliId || (k && k.cliente_id) || clienteAberto, k)[0] || null;
}
// de quando o prazo conta: o início marcado, a decisão, a ciência, o "contado de" do carimbo ou o dia da anotação
function inicioDaLinha(x){
  if(x.inicio) return {data:x.inicio, rot:x.inicioRot || "Início"};
  const k = x.casoId && D.casoPorId.get(x.casoId);
  if(k && k.prazo===x.data && k.prazo_inicio) return {data:k.prazo_inicio, rot:"Começar"};
  const a = x.andId && (D._andsFicha||[]).find(y=>y.id===x.andId);
  if(a){ const m = /(?:intimação|contado|ciência) de (\d{2}\.\d{2}\.\d{4})/.exec(a.texto||"");
    return m ? {data:isoDoCarimbo(m[1]), rot:/intimação de/.test(m[0]) ? "Intimação" : "Contado de"} : {data:dataSP(a.criado_em), rot:"Anotado"}; }
  return null;
}
// a linha pronta para a janela do prazo (os campos que ela lê começam com "_")
function prepPz(x, i, fonte){
  const {titulo, motivo} = tituloDaLinha(x), f = faltaPz(x), cont = contagemPz(x);
  // o prazo do catálogo se chama pelo item ("Recurso ao CRPS"), e não pelo carimbo com a conta
  return Object.assign(x, {_nat: natDaLinha(x), _titulo: cont && x.ico!=="🗓" ? cont.rot : titulo.replace(/ — \d+ dias (?:úteis|corridos)\b.*$/, ""), _motivo: motivo, _f: f, _falta: f.txt, _quando: diaLongoPz(x.data),
    _ir: x.andId ? `qdIrParaAndamento('${x.casoId}','${x.andId}')` : x.semMotivo ? `explicarPrazo('${x.casoId}')` : `prazoSaberMais(${i}${fonte ? `,'${fonte}'` : ""})`});
}
const pillNat = nat => `<span class="pz-pill pz-pill-${nat}"><i aria-hidden="true"></i>${esc(NAT_ROT[nat]||"Lembrete")}</span>`;
const pillTodo = x => x && x.todo ? `<span class="pz-pill pz-pill-todo" title="Data do “Concluir em” da tarefa no Microsoft To Do">Microsoft To Do</span>` : "";
const avPz = id => { const c = D.colPorId.get(id); return c ? `<span class="pz-av" style="background:${c.cor}" aria-hidden="true">${esc(c.inicial)}</span>` : ""; };
// o caso numa etiqueta curta: a espécie (B31) e a fase; o nome inteiro fica no title
function casoCurtoPz(k){
  if(!k) return "Do cliente";
  const sig = (/\bB?(\d{2})\b/.exec(String(k.especie||""))||[])[1];
  return `${sig ? `B${sig}` : cortaFrase(tituloCaso(k), 18)} · ${NOME_FASE[faseEfetiva(k)] || k.fase || ""}`;
}
// F504 · o nome curto da linha: a natureza, e não o título (pedido do Paulo, 10.11.2026)
function natRotPz(x){
  if(ehRetornoPz(x)) return "Retorno";
  const nat = natDaLinha(x);
  if(nat==="fatal" || x.prorrogDe) return "Prazo fatal";
  if(x.ico==="🩺" && !/prorroga/i.test(x.rotulo||"")){
    const t = String(x.titulo||x.rotulo||x._titulo||"");
    if(/audi[êe]ncia/i.test(t)) return "Audiência";
    if(/avalia/i.test(t)) return "Avaliação social";
    if(/per[íi]cia/i.test(t)) return "Perícia médica";
    return "Compromisso";
  }
  if(nat==="compromisso") return (x.andId || x.tc || x.filha) ? "Tarefa" : "Compromisso";
  return "Lembrete";
}
function faixaPrazos(k){
  const {soltas} = linhasDeDatas(k.cliente_id), hj = hoje();
  const minhas = [];
  for(const x of soltas){
    // [BUG 20.09.2026] O PRAZO SEM DESCRIÇÃO SUMIA DA FICHA. Ele ficava de
    // fora porque não nasceu de anotação nossa — só que é exatamente esse o
    // caso da data que veio do "Concluir em" do To Do, que é como o escritório
    // marca prazo. O caso do Nelson dos Santos tinha 29/09 no To Do e a ficha
    // dizia "sem prazos ou lembretes em aberto". Agora ele aparece, em âmbar,
    // convidando a dizer do que é.
    if(x.casoId && x.casoId!==k.id) continue;
    // F236 · o lembrete do card de aposentadoria futura é do cliente, não deste caso: mora na aba Aposentadorias futuras
    if(x.lembTipo==="aposentadoria_futura") continue;
    minhas.push(x);
    // F326 · a tarefa da própria anotação no mesmo dia já está na janela do prazo (O que fazer): não repete a data
    for(const f of (x.filhas||[]).filter(f=>!(x.andId && f.andId===x.andId && f.data===x.data)).sort((a,b)=>a.data<b.data?-1:1)) minhas.push({...f, filha:true});
  }
  // F254 · do mais próximo para o mais distante, como o Planejado do To Do (decisão do Paulo, 24.10.2026,
  // que substitui a ordem decrescente da F145)
  minhas.sort((a,b)=>a.data<b.data?-1:a.data>b.data?1:0);
  faixaAtual = minhas;
  // F182 · F245 · a conferência em um clique; F276 · ela mora no "⋯" ao lado do título, para o quadro ficar só com as datas
  const conf = botoesConferir(k, "fp-conf");
  // P3 · as datas dos outros casos do cliente não entram aqui: um link leva à aba Prazos da ficha, onde ficam todas
  const fora = soltas.filter(x=>x.casoId && x.casoId!==k.id).length;
  // F333 · os outros casos do cliente vão ao pé do quadro, com quantos venceram, e levam à aba Prazos
  const nForaV = soltas.filter(x=>x.casoId && x.casoId!==k.id && x.data<hj && !x.aConfirmar).length;
  const outros = fora ? `<div class="fp3-out"><span>Outros casos do cliente: ${fora} ${fora===1?"data":"datas"}${nForaV ? `, <b>${nForaV} ${nForaV===1?"vencida":"vencidas"}</b>` : ""}</span><button type="button" class="btn-mini fp-outros" onclick="abaAtiva=5;repintarFicha()" title="ver as datas de todos os casos do cliente">Todos</button></div>` : "";
  const sug = sugestaoPrazoEtapa(k, soltas);
  const tit = `<div class="fp-cab"><h3 class="fp-tit">Prazos</h3>${minhas.length ? `<span class="fp5-n" aria-label="${minhas.length} ${minhas.length===1?"data":"datas"}">${minhas.length}</span>` : ""}${conf ? `<details class="tl-mais fp-menu"><summary class="tl-bt tl-bt-ic" aria-label="Conferir o caso" title="conferir o caso: sem novidade ou movimentou">${IC_SVG.mais}</summary><span class="tl-mais-menu" role="menu">${conf}</span></details>` : ""}</div>`;
  if(!minhas.length) return `<div class="faixa-prazos vazia" aria-label="Prazos e providências">${tit}
    ${sug || `<span class="meio-sub" title="Um andamento com data cria o lembrete; a anotação com ⏰ cria o prazo.">Sem prazos ou lembretes em aberto.</span>`}${outros}</div>`;
  // F236 · sem mexer na ordem (F145), o que não pode passar despercebido: o PRÓXIMO (a menor data de hoje em diante
  // entre o que pede ação; no empate, o prazo fatal) ganha o selo e o contorno, e o topo diz numa linha o próximo, a
  // perícia (quando não é ela o próximo), o próximo prazo fatal (quando é outro) e quantos venceram. A perícia que passou
  // sem confirmação não "venceu": pede o clique e conta à parte ("a confirmar"). No resumo, o prazo fatal da DCB é a
  // janela da prorrogação, que é o que o escritório faz; a DCB é o dia em que o benefício cessa
  const pend = x => x.data<hj && !x.aConfirmar;
  const ord = xs => xs.filter(x=>x.data>=hj).sort((a,b)=>a.data<b.data?-1:a.data>b.data?1:(natDaLinha(a)==="fatal"?-1:0)-(natDaLinha(b)==="fatal"?-1:0));
  const prox = ord(minhas.filter(x=>natDaLinha(x)!=="lembrete"))[0] || ord(minhas)[0] || null;
  const comProrrog = new Set(minhas.filter(x=>x.prorrogDe).map(x=>x.prorrogDe));
  const proxFatal = ord(minhas.filter(x=>(natDaLinha(x)==="fatal" && !comProrrog.has(x.dcbDe)) || x.prorrogDe))[0] || null;
  const nVenc = minhas.filter(pend).length, nConf = minhas.filter(x=>x.aConfirmar).length, proxEv = ord(minhas.filter(x=>x.ev))[0] || null;
  // F254 · A FAIXA COMO O PLANEJADO DO TO DO. O prazo fatal abre a faixa numa linha própria, que diz o que
  // fazer e quanto falta em DIAS ÚTEIS; o resto vem nos grupos do Planejado (Vencidas, Hoje, Amanhã, Próximos sete
  // dias, Mais tarde), cada linha com a bolinha da natureza. "Mais tarde" fica recolhido.
  // F275 · A LINHA SÓ COM A DATA E O "ABRIR" (pedido do Paulo, 24.10.2026: a ficha tem informação demais). O título,
  // o motivo, quem faz e o "cumpri" moram no painel; aqui ficam a bolinha da natureza, a data e o título no passar do mouse.
  // F326 · o título e o quanto falta vêm das mesmas funções da aba Prazos e da janela (tituloDaLinha, faltaPz, prepPz)
  // F333 · A TELA DO CASO INTEGRADA COM A ABA PRAZOS (proposta aprovada pelo Paulo, 31.10.2026): o próximo prazo fatal
  // abre o quadro com o que é, quanto falta, a barra e o "Cumpri o prazo"; as demais linhas dizem o que são e quanto falta
  // F504 · A LINHA DO LOVABLE (aprovada pelo Paulo, 10.11.2026): o dia em bloco, a natureza (Prazo fatal, Tarefa,
  // Lembrete, Compromisso, Audiência, Perícia médica, Avaliação social, Retorno), quanto falta e o Abrir. O título
  // inteiro fica no title e no texto para o leitor de tela; o detalhe mora na janela do prazo
  const linha = (x, destaque) => {
    const i = minhas.indexOf(x), nat = natDaLinha(x), tipo = tipoDaLinha(x);
    prepPz(x, i);
    const titulo = x._titulo, f = x._f, rot = natRotPz(x), venc = pend(x);
    const cls = `pz fp2-lin fp5-lin pz-${nat}${venc?" pz-venceu":""}${x.semMotivo?" pz-semmotivo":""}${x.aConfirmar?" pz-confirmar":""}${destaque?" fp2-fatal fp3-hero":""}`;
    const dados = `data-nat="${nat}" data-tipo="${esc(tipo)}" data-data="${x.data}" title="${esc(titulo)}"`;
    const [, mm, dd] = x.data.split("-");
    const chip = x.aConfirmar ? "a confirmar" : x.data===hj ? "hoje" : f.urg==="venc" ? f.txt : `${f.n} ${f.un}`;
    const verm = nat==="fatal" || x.prorrogDe || venc;
    const sobre = destaque ? (venc ? "Prazo fatal vencido" : "Próximo prazo fatal") : rot;
    // F621 · a inicial de quem faz, para saber de quem é a tarefa (pedido do Paulo, 16.11.2026)
    const cq = D.colPorId.get(quemDaLinha(x, k.cliente_id));
    const av = cq ? `<span class="pz-av fp5-av" style="background:${cq.cor}" title="${esc(cq.nome)}" aria-hidden="true">${esc(cq.inicial)}</span><span class="sr-only">Quem faz: ${esc(cq.nome)}</span>` : "";
    return `<div class="${cls}" ${dados}>
      <span class="fp5-dia fp2-data" aria-hidden="true"><b>${+dd}</b><small>${MES_CURTO[+mm-1]}</small></span>
      <span class="fp5-txt"><b class="fp3-tit" aria-hidden="true">${esc(rot)}</b><span class="sr-only">${esc(sobre)} ${esc(titulo)}, ${esc(f.txt)}, ${esc(diaCurtoPz(x.data))}</span></span>
      <span class="fp5-chip fp3-n${verm?" verm":""}" aria-hidden="true">${esc(chip)}</span>${av}
      <button type="button" class="fp2-mais pz-mais${destaque?" fp3-pri":""}" onclick="abrirPainelPrazo(${i})" aria-label="Abrir: ${esc(titulo)}">Abrir</button>
    </div>`;
  };
  // F335 · o prazo fatal vencido sem registro vem antes do próximo: é o que pede ação primeiro
  const destaque = minhas.filter(x=>natDaLinha(x)==="fatal" && pend(x))[0] || proxFatal || null;
  const em = n => somaDias(hj, n);
  const GRUPOS = [["Vencidas", pend, "venc"], ["A confirmar", x=>x.aConfirmar, "conf"], ["Hoje", x=>x.data===hj, "hoje"],
    ["Amanhã", x=>x.data===em(1), ""], ["Próximos sete dias", x=>x.data>em(1) && x.data<=em(7), ""], ["Mais tarde", x=>x.data>em(7), ""]];
  // F335 · UM PRAZO DE CADA VEZ (pedido do Paulo, 01.11.2026, como no To Do): à vista fica só o próximo (o prazo
  // fatal em destaque ou, sem ele, a primeira data que pede ação); as demais ficam em "Ver as outras N datas", fechado
  const soUm = destaque ? null : (prox || minhas.filter(pend)[0] || minhas[0]);
  // F504 · como no Lovable, duas linhas à vista: o destaque (ou a primeira que pede ação) e a vencida, senão a seguinte
  const um = destaque || soUm, dois = um && (minhas.filter(x=>x!==um && pend(x))[0] || ord(minhas.filter(x=>x!==um && natDaLinha(x)!=="lembrete"))[0] || ord(minhas.filter(x=>x!==um))[0]) || null;
  const ja = new Set([um, dois].filter(Boolean));
  const grupos = GRUPOS.map(([rot, f, tom])=>{ const g = minhas.filter(x=>!ja.has(x) && f(x)); g.forEach(x=>ja.add(x)); return [rot, g, tom]; })
    .filter(([,g])=>g.length);
  const cab = (rot, n) => `<h4 class="fp2-g">${rot} <span class="pl-n">${n}</span></h4>`;
  const nResto = grupos.reduce((n,[,g])=>n+g.length, 0), nRestoV = grupos.filter(([,,t])=>t==="venc").reduce((n,[,g])=>n+g.length, 0);
  const blocos = !nResto ? "" : `<details class="fp-resto"${_pzTodos.has(k.id)?" open":""} ontoggle="this.open?_pzTodos.add('${k.id}'):_pzTodos.delete('${k.id}')"><summary title="ver as outras datas">+${nResto} ${nResto===1?"data":"datas"}${nRestoV ? ` · <b class="fp-resto-v">${nRestoV} ${nRestoV===1?"vencida":"vencidas"}</b>` : ""}</summary>`
    + grupos.map(([rot, g, tom]) => `<section class="fp2-grupo"${tom?` data-tom="${tom}"`:""}>${cab(rot, g.length)}${g.map(x=>linha(x)).join("")}</section>`).join("") + `</details>`;
  const sem = destaque ? "" : `<p class="fp2-sem meio-sub">Sem prazo fatal em aberto neste caso.</p>`;
  const nv = minhas.length ? `<button type="button" class="tl-bt fp-nv" onclick="this.closest('.faixa-prazos').classList.add('nv-ver')" title="no nível 1 as datas ficam recolhidas"><span aria-hidden="true">Datas</span><span class="sr-only">ver as datas</span></button>` : "";   // F249
  if(painelPz && painelPz.casoId===k.id && painelPz.fonte!=="cli"){ const j = minhas.findIndex(x=>x.data===painelPz.data && (x.andId||"")===painelPz.andId);
    if(j>=0) setTimeout(()=>abrirPainelPrazo(j));
    else if(painelPz.andId){ const pz = painelPz; setTimeout(()=>abrirPainelTarefa(pz.casoId, pz.andId)); } }
  const barra = destaque ? (barraPz(inicioDaLinha(destaque), destaque, "fp3") || `<div class="fp3-bl"><span>Vence · ${esc(diaCurtoPz(destaque.data))}</span></div>`) : "";
  return `<div class="faixa-prazos fp2 fp5" aria-label="Prazos e providências">${tit}${nv}${destaque ? "" : (sug || sem)}<div class="fp5-linhas">${destaque ? linha(destaque, true) : (soUm ? linha(soUm) : "")}${dois ? linha(dois) : ""}</div>${barra}${blocos}${outros}</div>`;
}
// F333 · O PRAZO QUE NASCE DA ETAPA (decisão do Paulo, 31.10.2026, depois de comparar com Filevine, MyCase e Astrea):
// a etapa declarada que abre prazo oferece o item do catálogo, contado da decisão quando ela está no caso. Só oferece:
// o clique abre o campo de escrever com o prazo preenchido, e a pessoa confere a data de início antes de registrar
const PRAZO_DA_ETAPA = {inss:{"em exigência":"exig", decidido:"crps"}, conselho:{julgado:"crps"},
  judicial:{"contestação apresentada":"rep", "perícia designada":"ques", "perícia realizada":"laudo", "sentença publicada":"ap"}};
const PRAZO_ETAPA_JEF = {ques:"quesj", ap:"ri"};
const _pzEtapaFora = new Set();
function prazoDaEtapa(k){
  if(!ehPrev(k)) return null;
  const f = faseEfetiva(k), jef = (dadosJudiciais(k)||{}).rito==="JEF";
  let id = ((PRAZO_DA_ETAPA[f]||{})[k.etapa||""]) || "";
  if(!id || (id==="crps" && k.resultado==="deferido")) return null;
  if(jef && PRAZO_ETAPA_JEF[id]) id = PRAZO_ETAPA_JEF[id];
  // F415 · o B31 negado por análise documental com ciência a partir de 06/11/2026: primeiro a reanálise de 10 dias, e o
  // recurso de 30 ao lado (Portaria Conjunta 13/2026, arts. 8º-A e 9º, com a redação da Portaria Conjunta 54/2026)
  if(id==="crps" && f==="inss" && reanaliseAte(k)) id = "reanl";
  const item = PRAZOS_CATALOGO.find(x=>x.id===id); if(!item) return null;
  const de = f==="inss" && k.etapa==="decidido" && k.decisao_em ? k.decisao_em : hoje();
  const alt = id==="reanl" ? {item:PRAZOS_CATALOGO.find(x=>x.id==="crps"), fatal:recorrerAte(k)} : null;
  return {item, de, fatal: contarPrazo(de, item, k), jf: item.uteis && ehJusticaFederal(k), alt};
}
function sugestaoPrazoEtapa(k, soltas){
  const s = prazoDaEtapa(k);
  if(!s || s.fatal<hoje() || _pzEtapaFora.has(k.id+"|"+k.etapa)) return "";
  // o caso já tem prazo fatal em aberto (o "Recorrer até" do indeferido, por exemplo): a etapa não oferece outro
  // (a reanálise convive com o "Recorrer até": só some se já houver prazo fatal no mesmo dia)
  if((soltas||[]).some(x=>x.casoId===k.id && natDaLinha(x)==="fatal" && x.data>=hoje() && (s.item.id!=="reanl" || x.data===s.fatal))) return "";
  return `<div class="fp3-etapa" role="note"><span class="fp3-sobre">Pela etapa “${esc(k.etapa)}”</span>
    <b>${esc(s.item.rot)}</b><small>${esc(textoContagemPz(s.item.n, s.item.uteis, s.de, s.fatal, s.item.dec, s.jf))}</small>${s.alt && s.alt.fatal ? `
    <small class="fp3-alt">Ao lado: ${esc(s.alt.item.rot)} até ${fmtBarra(s.alt.fatal)}. Recorrer antes de ${fmtBarra(s.fatal)} sem pedir a reanálise a impede (art. 9º, § 1º).</small>` : ""}
    <div class="fp3-pe"><button type="button" class="fp3-pri" onclick="criarPrazoDaEtapa('${k.id}')" title="Criar o prazo desta etapa">Criar</button><button type="button" class="fp3-sec" onclick="_pzEtapaFora.add('${k.id}|'+${JSON.stringify(k.etapa).replace(/"/g,"&quot;")});repintarFicha()" title="Este prazo não se aplica ao caso">Dispensar</button></div></div>`;
}
function criarPrazoDaEtapa(casoId){
  const k = D.casoPorId.get(casoId), s = k && prazoDaEtapa(k); if(!s) return;
  if(subAba!=="escritorio") irSubAba("escritorio");
  setTimeout(()=>{
    const ck = document.getElementById("and-prazo-ck"), cat = document.getElementById("and-cat"), de = document.getElementById("and-de"), tx = document.getElementById("and-texto");
    if(!ck || !cat || !de) return aviso("Abra o caso no Escritório para criar o prazo");
    tx?.closest(".escrever")?.classList.add("esc-aberto");
    ck.checked = true; pzToggle(ck);
    cat.value = s.item.id; de.value = s.de; aplicarCatalogoPrazo("and"); pzxPintar();
    if(tx){ if(!tx.value.trim()) tx.value = `${s.item.rot}.`; tx.focus(); tx.scrollIntoView({block:"center"}); }
  });
}
// A DATA DE INÍCIO DO PLANNER no prazo fatal (casos.prazo_inicio): quando começar, além de quando vence. Só vale
// para o prazo fatal do próprio caso (casos.prazo); marca-se no painel de progresso (abrirPainelPrazo).
function marcarInicioPrazo(casoId){
  const k = D.casoPorId.get(casoId); if(!k || !k.prazo) return;
  const sug = n => diasUteisAntes(k.prazo, n);
  caixa(`<h3>Quando começar este prazo?</h3>
    <p class="meio-sub">O prazo fatal vence em ${fmtBarra(k.prazo)}. No dia de começar, ele entra no Meu Dia de quem cuida do caso.</p>
    <div class="form-linha">
      <button class="btn-rap" onclick="gravarInicioPrazo('${casoId}','${sug(5)}')">5 dias úteis antes</button>
      <button class="btn-rap" onclick="gravarInicioPrazo('${casoId}','${sug(10)}')">10 dias úteis antes</button>
      <input type="date" max="${k.prazo}" value="${k.prazo_inicio||""}" onchange="gravarInicioPrazo('${casoId}', this.value)">
      ${k.prazo_inicio?`<button class="btn-rap" onclick="gravarInicioPrazo('${casoId}', null)">sem início</button>`:""}
    </div>`);
}
async function gravarInicioPrazo(casoId, data){
  fecharCaixa();
  const k = D.casoPorId.get(casoId); if(!k) return;
  try{ await patchCaso(casoId, {prazo_inicio: data || null}); }
  catch(e){ return aviso(/prazo_inicio/.test(String(e.message||e))
    ? "⚠ O banco ainda não guarda o início: execute o schema_funcoes_todo.sql no Supabase" : "Não consegui gravar o início"); }
  k.prazo_inicio = data || null;
  aviso(data ? `Começar em ${fmtBarra(data)}` : "Prazo sem data de início", false);
  if(clienteAberto) abrirFicha(clienteAberto); else render();
}
// F257 · O PAINEL DE PROGRESSO DO PRAZO (o painel de detalhes do To Do). A faixa fica só com o prazo e o
// "abrir"; o painel, que entra pela direita sem escurecer a ficha, diz o que fazer, quanto falta (com a barra do
// início ao vencimento), quem está fazendo, as etapas, o início, a origem e o histórico. Fecha no ✕ ou no Esc,
// e continua aberto quando a ficha se repinta depois de uma ação feita dentro dele.
let painelPz = null, painelZapCli = null;   // o painel mostra um prazo (painelPz) ou a conversa de um cliente (painelZapCli)
// a tarefa aberta pela linha do tempo ou pelo Meu Dia: vira uma linha da faixa, com os mesmos campos da janela
function abrirPainelTarefa(casoId, andId){
  let i = (faixaAtual||[]).findIndex(x=>x.casoId===casoId && x.andId===andId);
  if(i<0){
    // F326 · a anotação do prazo sem tarefa aberta também abre: a data vem do carimbo
    const t = (D.tarefasPorCaso.get(casoId)||[]).find(x=>x.andamento_id===andId && !x.concluida_em);
    const a = (D._andsFicha||[]).find(x=>x.id===andId), m = /^[⏰🔥\s]*\[PRAZO ([0-9.]+)\]/u.exec(a && a.texto || "");
    if(!t && !m) return;
    const nat = m ? "fatal" : ["fatal","compromisso"].includes(t.natureza) ? t.natureza : "lembrete";
    faixaAtual.push({casoId, andId, data: m ? isoDoCarimbo(m[1]) : t.lembrar_em, natureza: nat, ehPrazo: nat==="fatal", rotulo: NAT_ROT[nat],
      resumo: cortaFrase(m ? tituloNotaPz(a) : fazerDaNota(a && a.texto) || "Tarefa", 90), tc: t || null,
      ...(m && ["vivo","vencido"].includes((estadoPrazoNota(a)||{}).est) ? {cumprir: `janelaPrazoCumprido('${casoId}','${andId}')`} : {})});
    i = faixaAtual.length - 1;
  }
  prepPz(faixaAtual[i], i);
  abrirPainelPrazo(i);
}
// "Comentar neste prazo": o comentário entra na linha do tempo como RESPOSTA à anotação que criou o prazo (o
// mesmo encadeamento do "feito"); sem anotação de origem, vira comentário do caso
async function comentarNoPrazo(casoId, andId){
  const el = document.getElementById("pp-com"), texto = (el && el.value || "").trim();
  if(!texto) return el && el.focus();
  if(!casoId) return aviso("Este prazo é do cliente, sem caso: anote no caso a que ele se refere");
  try{
    const [a] = await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id: casoId, autor_id: eu.id, texto, ...(andId ? {responde_a: andId} : {})})});
    if(a){ (D._andsFicha = D._andsFicha || []).unshift(a); await criarMencoes(texto, casoId, a.id, []).catch(()=>{}); }
    aviso("Comentário registrado no caso", false);
  }catch(e){ return aviso("Não consegui registrar o comentário"); }
  if(clienteAberto) abrirFicha(clienteAberto);
}
function fecharPainelPrazo(){
  setTimeout(armarVoltar, 0);   // F458
  painelPz = null; painelZapCli = null;
  // o conteúdo sai junto: o painel fechado não guarda a conversa ou o prazo de antes (que reaparecia por um instante)
  if(zapLadoRec) zapLadoRec.stop();
  if(zapLadoPend) descartarPendZap();
  const el = document.getElementById("painel-prazo"); if(el){ el.classList.remove("aberto","pp-prazo","pp-sobre"); el.innerHTML = ""; }
  const veu = document.getElementById("pp-veu"); if(veu) veu.remove();
  document.body.classList.remove("lado-aberto","zap-aberto","pz-largo");
  fecharPrazoEsq();
}
// F264 · com a conversa de WhatsApp aberta à direita, o prazo abre À ESQUERDA, no lugar de "Prazos e compromissos"
// (pedido do Paulo, 24.10.2026): uma janela de cada lado e a linha do tempo no meio. Fechar devolve a faixa.
function fecharPrazoEsq(){
  const el = document.getElementById("painel-prazo-esq"); if(el) el.remove();
  document.body.classList.remove("prazo-esq");
  if(!painelZapCli) return;
  painelPz = null;
}
// ══════════════════════════════════════════════════════════════════════════
// F326 · A JANELA DO PRAZO (desenho aprovado pelo Paulo, 31.10.2026). Abre da faixa do caso (fonte vazia) ou da aba
// Prazos do cliente (fonte "cli", por cima da aba, com o véu). Quanto falta em número grande, com a barra do início ao
// vencimento e o hoje; de onde vem (a anotação, o documento, a base); o que fazer (a tarefa de quem executa, com as
// etapas); o que está ligado (o lembrete antes, o papel pedido ao cliente); o histórico; o comentário. O principal é
// "Cumpri o prazo". A qualidade de segurado mostra como se chega à data e quem acompanha. No celular, tela cheia.
// ══════════════════════════════════════════════════════════════════════════
const linhaDoPz = (i, fonte) => (fonte==="cli" ? _pzCli : faixaAtual)[i];
const quandoPz = iso => { const h = horaLocal(iso); return h ? `${diaCurtoPz(dataSP(iso))}, ${h.slice(-5).replace(":","h")}` : ""; };
const DIA_NO = ["no domingo","na segunda-feira","na terça-feira","na quarta-feira","na quinta-feira","na sexta-feira","no sábado"];
const RX_PZ_CARIMBO = /^[⏰🔥\s]*\[PRAZO [0-9.]+\]\s*/u;
const RX_PZ_CONTAGEM = /^(.+?) — (\d+) dias (úteis|corridos) \(([^)]*)\), intimação de (\d{2}\.\d{2}\.\d{4})\.\s*/;
const semCarimboPz = t => String(t||"").replace(RX_PZ_CARIMBO, "").replace(RX_PZ_CONTAGEM, "").replace(/<[^>]*>/g, "").trim();
// o que fazer, na anotação: a primeira frase que começa por um verbo ("Recorrer ao CRPS…"), senão a primeira
function fazerDaNota(t){
  const fr = semCarimboPz(t).split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(Boolean);
  return (fr.find(s=>/^[A-ZÀ-Ú][a-zà-úç]+(?:ar|er|ir|or)\b/.test(s)) || fr[0] || "").replace(/\.$/, "");
}
// a conta do carimbo do catálogo: "São 30 dias corridos da ciência… o trigésimo dia cai no sábado, e o prazo passa…"
function contagemPz(x){
  const a = x.andId && (D._andsFicha||[]).find(y=>y.id===x.andId);
  const m = a && RX_PZ_CONTAGEM.exec(String(a.texto||"").replace(RX_PZ_CARIMBO, ""));
  if(!m) return null;
  const n = +m[2], uteis = m[3]==="úteis", de = isoDoCarimbo(m[5]), item = PRAZOS_CATALOGO.find(c=>c.rot===m[1]);
  return {rot: m[1], n, uteis, base: m[4], de, txt: textoContagemPz(n, uteis, de, x.data, item && item.dec)};
}
function textoContagemPz(n, uteis, de, data, dec, jf){
  const cru = somaDias(de, n);
  return uteis ? `São ${n} dias úteis da intimação de ${fmtBarra(de).slice(0,5)}, sem contar o dia da intimação, os fins de semana e os feriados${jf ? ", inclusive os da Justiça Federal (Lei 5.010/1966, art. 62)" : ""}.`
    : `São ${n} dias corridos da ciência, em ${fmtBarra(de).slice(0,5)}.${cru!==data ? ` O ${n}º dia cai ${DIA_NO[new Date(cru+"T12:00:00").getDay()]}, ${fmtBarra(cru).slice(0,5)}, e o prazo passa ${dec ? "ao último dia útil antes dele" : "ao primeiro dia útil"}.` : ""}`;
}
const IC_DOC_PZ = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>`;
const IC_OK_PZ = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5 10 17 19 7"/></svg>`;
const IC_X_PZ = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`;
function abrirPainelPrazo(i, fonte){
  setTimeout(armarVoltar, 0);   // F458
  const x = linhaDoPz(i, fonte); if(!x) return;
  if(!x._titulo) prepPz(x, i, fonte);
  const sobre = fonte==="cli";   // da aba Prazos: por cima, com o véu
  // no celular não há espaço para duas janelas: o prazo toma o lugar da conversa, como antes
  const esq = !sobre && painelZapCli && !celular() && document.querySelector(".caso-esq");
  painelPz = {casoId: x.casoId, data: x.data, andId: x.andId || "", fonte: fonte || "", rotulo: x.rotulo || ""};
  if(!esq){ painelZapCli = null; document.body.classList.remove("zap-aberto"); }
  const fechar = esq ? "fecharPrazoEsq()" : "fecharPainelPrazo()", src = fonte ? `,'${fonte}'` : "";
  const hj = hoje(), k = x.casoId && D.casoPorId.get(x.casoId), cliId = (k && k.cliente_id) || (sobre && _pzCliId) || clienteAberto;
  const c = D.cliPorId.get(cliId), nome = id => ((D.colPorId.get(id)||{}).nome||"alguém").split(" ")[0];
  const f = x._f || faltaPz(x), nat = x._nat || natDaLinha(x), venc = x.data<hj && !x.aConfirmar;
  const gq = x.rotulo==="Qualidade de segurado até" && c ? gracaDoCliente(c) : null;
  const abertas = (D.tarefasPorCaso.get(x.casoId)||[]).filter(t=>!t.concluida_em);
  const ts = x.andId ? abertas.filter(t=>t.andamento_id===x.andId) : x.tc ? [x.tc] : nat==="fatal" ? abertas.filter(t=>t.natureza==="fatal") : [];
  const exec = ts.filter(t=>t.papel!=="revisa"), rev = ts.filter(t=>t.papel==="revisa");
  const minha = exec.find(t=>t.colaborador_id===eu.id) || rev.find(t=>t.colaborador_id===eu.id);
  const a = x.andId && (D._andsFicha||[]).find(y=>y.id===x.andId), cont = contagemPz(x);
  const rot = t => `<h3 class="ppz-h">${t}</h3>`;
  // QUANTO FALTA: o número grande, a data por extenso, a barra do início ao vencimento e a conta do catálogo
  const ini = gq ? {data: `${gq.janela.ini.slice(3)}-${gq.janela.ini.slice(0,2)}-01`, lab: `Última contribuição · ${gq.ultima}`} : inicioDaLinha(x);
  const ultimo = gq ? "o último dia com a qualidade" : nat==="fatal" ? "o último dia do prazo" : nat==="compromisso" ? "o dia do compromisso" : "o dia do lembrete";
  const quanto = `<section class="ppz-sec ppz-quanto ppz-u-${f.urg}" aria-label="Quanto falta">
      <div class="ppz-q-lin"><div class="ppz-q-n">${f.pre && f.pre!=="vence" ? `<small>${esc(f.pre)}</small>` : ""}<b>${esc(String(f.n))}</b><span>${esc(f.un)}</span></div>
        <div class="ppz-q-d"><b>${esc(`${SIGLA_DIA[new Date(x.data+"T12:00:00").getDay()]}., ${fmtBarra(x.data)}`)}</b><span>${ultimo}</span></div></div>
      ${barraPz(ini, x, "ppz", gq ? `Mantida até · ${fmtBarra(gq.mantidaAte)}` : "")}
      ${cont ? `<p class="ppz-conta">${esc(cont.txt)}</p>` : ""}
    </section>`;
  // DE ONDE VEM: a anotação que criou o prazo (com quem e quando), ou a explicação da linha; o documento, se houver
  const doc = a && (D.anexos||[]).find(y=>y.andamento_id===a.id);
  const dw = deOndeDaLinha(x), autor = a && D.colPorId.get(a.autor_id);
  // F408 · a anotação vem inteira, no alto (pedido do Paulo, 05.11.2026); a data do To Do diz que é do To Do
  const deTit = a ? `Anotação de ${autor ? autor.nome.split(" ")[0] : "alguém"}, ${quandoPz(a.criado_em)}` : x.todo ? "“Concluir em” da tarefa no Microsoft To Do" : dw.tit;
  const deTxt = a ? semCarimboPz(a.texto) : x.todo ? "A data veio do Microsoft To Do. Adiada ou apagada lá, ela muda ou sai daqui na próxima sincronização." : dw.txt;
  const links = [doc ? `<button type="button" class="ppz-link" onclick="abrirAnexo('${doc.id}')" title="Ver o documento"><span aria-hidden="true">Documento</span><span class="sr-only">Ver o documento</span></button>` : "",
    a ? `<button type="button" class="ppz-link" onclick="${fechar};qdIrParaAndamento('${x.casoId}','${x.andId}')" title="Ver na linha do tempo"><span aria-hidden="true">Localizar</span><span class="sr-only">Ver na linha do tempo</span></button>`
      : x.semMotivo && !x._motivo ? `<button type="button" class="ppz-link" onclick="${fechar};explicarPrazo('${x.casoId}')" title="Dizer do que é este prazo"><span aria-hidden="true">Descrever</span><span class="sr-only">Dizer do que é este prazo</span></button>`
      : gq ? "" : `<button type="button" class="ppz-link" onclick="prazoSaberMais(${i}${src})">Detalhes</button>`].filter(Boolean).join("");
  const origem = gq ? "" : `<section class="ppz-sec" aria-labelledby="ppz-origem">${rot(`<span id="ppz-origem">${a ? "Anotação" : "De onde vem"}</span>`)}
      <div class="ppz-orig"><span class="ppz-orig-ic">${IC_DOC_PZ}</span><div class="ppz-orig-c"><b>${esc(deTit)}</b>${deTxt ? `<p class="${a ? "ppz-orig-int" : ""}">${esc(deTxt)}</p>` : ""}${a && x.todo ? `<small class="ppz-nota">A data é o “Concluir em” do Microsoft To Do.</small>` : ""}${links ? `<div class="ppz-links">${links}</div>` : ""}</div></div>
      ${cont ? `<p class="ppz-base">Base: ${esc(cont.base)}.</p>` : ""}
    </section>`;
  // COMO SE CHEGA A ESTA DATA (só a qualidade de segurado): a conta do art. 15 em passos
  const g = gq && cnisDe(c);
  const conta = gq ? `<section class="ppz-sec" aria-labelledby="ppz-conta">${rot('<span id="ppz-conta">Como se chega a esta data</span>')}
      <ol class="ppz-passos">
        <li><span>1</span><p>A última contribuição no CNIS é da competência ${esc(gq.ultima)}.</p></li>
        <li><span>2</span><p>A qualidade se mantém por ${gq.base} meses, até a competência ${esc(gq.fim||"")}. <small>Lei 8.213/91, art. 15.</small></p></li>
        <li><span>3</span><p>Mantida até ${esc(fmtBarra(gq.mantidaAte))}, a qualidade se perde em ${esc(fmtBarra(gq.perda))}. <small>Art. 15, § 4º.</small></p></li>
      </ol>
      ${(gq.premissas||[]).length ? `<p class="ppz-nota">${esc(gq.premissas.map(p=>p.charAt(0).toUpperCase()+p.slice(1)).join(". "))}.</p>` : ""}
    </section>` : "";
  // O QUE FAZER: a tarefa de quem executa (o estado anda num clique, só para quem a tem), as etapas e o "+ Etapa"
  const EST = ["Não iniciada", "Em andamento", "Concluída"];
  const cartao = t => {
    const ets = Array.isArray(t.etapas) ? t.etapas : [], nOk = ets.filter(e=>e.feito).length, minhaT = t.colaborador_id===eu.id;
    const rv = rev.filter(r=>r.colaborador_id!==t.colaborador_id).map(r=>nome(r.colaborador_id));
    const e = t.iniciada_em || nOk ? 1 : 0, prox = e ? `concluirDeVez('${t.id}')` : `alternarAndamento('${t.id}')`;
    return `<div class="ppz-tarefa"><div class="ppz-tf-cab">${avPz(t.colaborador_id)}
        <div class="ppz-tf-t"><b>${t.papel==="revisa" ? "Revisar: " : ""}${esc(cortaFrase(fazerDaNota(a && a.texto) || x._titulo, 90))}</b>
          <small>${esc([nome(t.colaborador_id), rv.length ? `revisão de ${rv.join(" e ")}` : "", t.atribuido_por && t.atribuido_por!==t.colaborador_id ? `pedida por ${nome(t.atribuido_por)}` : "", ets.length ? `${nOk} de ${ets.length} etapas` : ""].filter(Boolean).join(" · "))}</small></div>
        <button type="button" class="ppz-est ppz-est-${e}"${minhaT ? ` onclick="${prox}" title="passa a ${EST[e+1].toLowerCase()}"` : " disabled"} aria-label="Estado da tarefa de ${esc(nome(t.colaborador_id))}: ${EST[e]}">${EST[e]}</button></div>
    </div>`;
  };
  // sem tarefa de quem faz (o prazo já registrado), a revisão que ficou é o que há para fazer
  const fazerTs = exec.length ? exec : rev;
  const quem = !gq && !fazerTs.length ? (q => q ? `<p class="ppz-vazio">${avPz(q)}<span>Ninguém tem tarefa aberta para ${nat==="fatal" ? "este prazo" : "esta data"}. Quem cuida: <b>${esc(nome(q))}</b>.</span></p>` : `<p class="ppz-vazio"><span>Ninguém tem tarefa aberta para ${nat==="fatal" ? "este prazo" : "esta data"}.</span></p>`)(quemDaLinha(x, cliId)) : "";
  // a qualidade: o plano de contribuições ligado, que leva a qualidade adiante
  const plano = gq ? qualidadeDe(cliId).map(q=>({q, px: qualidadeProximos(q, 1)[0]})).filter(o=>o.px)[0] : null;
  const fazer = gq ? `<section class="ppz-sec" aria-labelledby="ppz-fazer">${rot('<span id="ppz-fazer">O que fazer</span>')}
      ${plano ? `<p class="ppz-p">Paga a contribuição a tempo, a qualidade continua. O plano de contribuições deste cliente:</p>
        ${ligadoPz("lembrete", `Contribuição a pagar · ${qualGuia(plano.q)}`, `vence ${diaCurtoPz(plano.px)}`, faltaPz({data: plano.px, natureza: "lembrete"}), `verQualidade('${cliId}')`)}`
        : `<p class="ppz-p">Um recolhimento a tempo ou um vínculo novo mantém a qualidade. Este cliente não tem plano de contribuições.</p>`}
    </section>` : `<section class="ppz-sec" aria-labelledby="ppz-fazer">${rot('<span id="ppz-fazer">O que fazer</span>')}${fazerTs.map(cartao).join("")}${quem}</section>`;
  // LIGADO A ESTE PRAZO: o "lembrar antes" e os papéis pedidos ao cliente no mesmo caso, ainda não entregues
  const lig = [];
  // as tarefas da própria anotação já estão em O que fazer; aqui ficam o lembrar antes e o que é de outra anotação
  for(const fl of (x.filhas||[]).filter(fl=>!(x.andId && fl.andId===x.andId))){ const tt = tituloDaLinha(fl).titulo;
    lig.push(ligadoPz(natDaLinha(fl), tt, `${NAT_ROT[natDaLinha(fl)]||"Lembrete"} · ${diaCurtoPz(fl.data)}`, faltaPz(fl), fl.andId ? `${fechar};qdIrParaAndamento('${fl.casoId||x.casoId}','${fl.andId}')` : "")); }
  if(x.casoId && c) for(const p of ((c.campos||{}).docs_pedidos||[]).filter(p=>p.caso_id===x.casoId))
    for(const it of (p.itens||[]).filter(it=>!it.entregue))
      lig.push(ligadoPz("doc", String(it.nome||it), `Pedido ao cliente${p.ate ? ` · entrega até ${diaCurtoPz(p.ate)}` : ""}`, p.ate ? faltaPz({data: p.ate, natureza: "lembrete"}) : null, `trouxeDocumentos('${cliId}')`));
  const ligado = lig.length ? `<section class="ppz-sec" aria-labelledby="ppz-ligado">${rot('<span id="ppz-ligado">Ligado a este prazo</span>')}${lig.join("")}</section>` : "";
  // QUEM ACOMPANHA (a qualidade): o advogado do cliente, que a recebe no Meu Dia 30 dias antes
  const adv = gq ? advogadoDoCliente(cliId, k)[0] : null;
  const acompanha = gq ? `<section class="ppz-sec" aria-labelledby="ppz-quem">${rot('<span id="ppz-quem">Quem acompanha</span>')}
      <div class="ppz-quemac">${adv ? avPz(adv) : ""}<div><b>${adv ? `${esc(nome(adv))}, responsável pelo cliente` : "O advogado do cliente"}</b>
        <small>Entra no Meu Dia em ${esc(fmtBarra(somaDias(gq.mantidaAte, -30)))}, 30 dias antes.</small></div></div></section>
    <section class="ppz-sec" aria-labelledby="ppz-fonte">${rot('<span id="ppz-fonte">Fonte</span>')}
      <p class="ppz-p">CNIS do dossiê, lido na triagem${g && g.em ? ` em ${esc(diaCurtoPz(String(g.em).slice(0,10)))}/${String(g.em).slice(0,4)}` : ""}. A data se refaz quando o CNIS muda.</p></section>` : "";
  // F408 · ACOMPANHAMENTO (pedido do Paulo, 05.11.2026): as etapas da tarefa como checklist e as anotações feitas
  // neste prazo, com a data, o mais recente primeiro; a etapa por fazer fica no alto. Na data do To Do sem anotação
  // própria, as anotações do escritório no caso
  const itens = [];
  for(const t of ts){
    const pode = t.colaborador_id===eu.id || t.atribuido_por===eu.id;
    (Array.isArray(t.etapas) ? t.etapas : []).forEach((et, j)=>itens.push({q: et.feito ? (et.em || t.criado_em || "") : "9", id: et.feito ? et.por : null,
      html: `<label class="pp-et${et.feito ? " ok" : ""}"><input type="checkbox"${et.feito ? " checked" : ""}${pode ? "" : " disabled"} onchange="marcarEtapaTarefa('${t.id}',${j},this.checked)"><span>${esc(et.t)}</span></label>`,
      meta: et.feito ? `Etapa feita` : `Etapa por fazer`}));
    if(t.criado_em) itens.push({q: t.criado_em, id: t.atribuido_por || t.colaborador_id, p: t.atribuido_por && t.atribuido_por!==t.colaborador_id
      ? `Pediu ${t.papel==="revisa" ? "a revisão" : "a tarefa"} a ${nome(t.colaborador_id)}.` : `Criou a tarefa.`});
    if(t.iniciada_em) itens.push({q: t.iniciada_em, id: t.colaborador_id, p: "Começou a tarefa."});
  }
  if(a) itens.push({q: a.criado_em, id: a.autor_id, p: `Anotou o prazo${x.data ? ` de ${fmtBarra(x.data).slice(0,5)}` : ""}.`});
  const resps = x.andId ? (D._andsFicha||[]).filter(y=>y.responde_a===x.andId && !y.excluir) : [];
  for(const r of resps) itens.push({q: r.criado_em, id: r.autor_id, p: String(r.texto||"").trim()});
  if(x.todo && !resps.length && x.casoId) (D._andsFicha||[]).filter(y=>y.caso_id===x.casoId && !y.excluir && !ehOficial(y) && y.id!==x.andId && !y.responde_a)
    .sort((p, q)=>String(q.criado_em).localeCompare(String(p.criado_em))).slice(0, 15)
    .forEach(y=>itens.push({q: y.criado_em, id: y.autor_id, p: semCarimboPz(y.texto)}));
  itens.sort((p, q)=>String(q.q).localeCompare(String(p.q)));
  const tEt = fazerTs.find(t=>t.colaborador_id===eu.id || t.atribuido_por===eu.id);
  const acompanha2 = gq ? "" : `<section class="ppz-sec ppz-acomp" aria-labelledby="ppz-hist">${rot('<span id="ppz-hist">Acompanhamento</span>')}
      ${x.casoId ? `<div class="ppz-com"><label for="pp-com" class="sr-only">Anotar neste prazo</label>
        <textarea id="pp-com" rows="2" placeholder="Anote o que foi feito ou o que falta"
          onkeydown="if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();comentarNoPrazo('${x.casoId}','${x.andId||""}')}"></textarea>
        <span class="ppz-com-bts">${tEt ? `<button type="button" class="pp-add" onclick="novaEtapaTarefa('${tEt.id}')">+ Etapa</button><button type="button" class="pp-add" onclick="modeloEtapas('${tEt.id}')" title="acrescentar as etapas de um modelo do escritório">Modelo</button>` : ""}<button type="button" class="ppz-bt pp-com-bt" onclick="comentarNoPrazo('${x.casoId}','${x.andId||""}')">Anotar</button></span></div>` : ""}
      ${itens.length ? `<ol class="ppz-hist ppz-ets">${itens.slice(0, 30).map(o=>`<li>${avPz(o.id) || `<span class="pz-av pz-av-sis" aria-hidden="true">·</span>`}<div>${o.html
        ? `${o.html}<small>${esc(o.meta)}${o.q!=="9" && o.q ? ` · ${o.id ? `${esc(nome(o.id))} · ` : ""}${esc(quandoPz(o.q))}` : ""}</small>`
        : `<small><b>${esc(o.id ? nome(o.id) : "Sistema")}</b> · ${esc(quandoPz(o.q))}</small><p>${esc(o.p)}</p>`}</div></li>`).join("")}</ol>` : `<p class="ppz-vazio"><span>Nada anotado neste prazo ainda.</span></p>`}
    </section>`;
  // F408 · NOVOS PRAZOS desta mesma tarefa: os prazos adicionais dados nas respostas à anotação
  const novos = [];
  for(const r of resps){
    const trs = (D.tarefasPorCaso.get(x.casoId)||[]).filter(t=>t.andamento_id===r.id && t.lembrar_em);
    const ds = trs.length ? trs.map(t=>({d: t.lembrar_em, t})) : [...String(r.texto||"").matchAll(/prazo adicional até (\d{2}\/\d{2}\/\d{4})/gi)].map(m=>({d: m[1].split("/").reverse().join("-")}));
    for(const o of ds) novos.push(ligadoPz(o.t && o.t.natureza==="fatal" ? "fatal" : "compromisso", cortaFrase(semCarimboPz(r.texto).replace(/\s*·\s*prazo adicional até.*$/i, "") || "Prazo adicional", 90),
      `${o.t && o.t.concluida_em ? "Concluído" : "Prazo adicional"} · ${diaCurtoPz(o.d)} · ${nome(r.autor_id)}`, o.t && o.t.concluida_em ? null : faltaPz({data: o.d, natureza: "compromisso"}), `${fechar};qdIrParaAndamento('${x.casoId}','${r.id}')`));
  }
  const novosPz = gq || !x.andId ? "" : `<section class="ppz-sec ppz-novos" aria-labelledby="ppz-novos">${rot('<span id="ppz-novos">Novos prazos desta tarefa</span>')}
      ${novos.join("") || `<p class="ppz-vazio"><span>Nenhum prazo novo dado nesta tarefa.</span></p>`}
      <div><button type="button" class="pp-add" onclick="${fechar};casoSel='${x.casoId}';abaAtiva=2;subAba='escritorio';respInline=null;abrirRespInline('${x.andId}', true)" title="Responder à anotação com um prazo adicional">+ Prazo</button></div>
    </section>`;
  // O PÉ: "Cumpri o prazo" (o prazo fatal do caso) ou "Concluir a minha tarefa"; as ações da linha; "Abrir o caso"; o ⋯
  const principal = x.cumprir ? `<button type="button" class="pp-pri" onclick="${fechar};${x.cumprir}" title="Registrar que o prazo foi cumprido">${IC_OK_PZ}Cumprido</button>`
    : minha && !gq ? `<button type="button" class="pp-pri" onclick="${fechar};concluirDeVez('${minha.id}')" title="Concluir a minha tarefa">${IC_OK_PZ}Concluir</button>` : "";
  // o ✔ feito e o ✎ escrever da linha repetiam o "Concluir a minha tarefa": com ele, o escrever vai ao ⋯
  // os demais botões da linha (✔ cumprida da exigência, Ouvidoria) ficam
  const acaoPe = x.cumprir ? "" : String(x.acao || "").replace(principal ? /<button\b[^>]*>(?:(?!<\/button>)[\s\S])*?(?:✔ feito|✎ escrever)<\/button>/g : /$^/, "")
    .replace(/onclick="/g, `onclick="${fechar};`).replace(/>\s*✔ feito\s*</g, ">Feito<").replace(/>\s*✎ escrever\s*</g, ">Escrever<");   // F427 · uma palavra, sem símbolo
  const abrirCaso = k && (sobre || celular()) ? `<button type="button" class="ppz-bt ppz-caso" onclick="${fechar};casoSel='${k.id}';abaAtiva=2;subAba='escritorio';repintarFicha()" title="Abrir o caso"><span aria-hidden="true">Caso</span><span class="sr-only">Abrir o caso</span></button>` : "";
  const extra = gq ? `<button type="button" class="ppz-bt" onclick="verQualidade('${cliId}')" title="Contribuições a pagar">Contribuições</button>${(cn => cn ? `<button type="button" class="ppz-bt" onclick="abrirAnexo('${cn.id}')" title="Abrir o CNIS">CNIS</button>` : "")(docsDoDossie(cliId).filter(d=>/CNIS completo/i.test(fonteDoDossie(d)[1])).sort((p, q)=>String(q.criado_em||"").localeCompare(String(p.criado_em||"")))[0])}` : "";
  const mais = menuMais([
    x.edita ? `<button class="tl-mais-it pp-sec-bt" role="menuitem" onclick="prazoSaberMais(${i}${src})" title="Corrigir a data">Corrigir</button>` : "",
    x.cumprir && k && k.prazo===x.data ? `<button class="tl-mais-it pp-sec-bt" role="menuitem" onclick="${fechar};naoSeAplica('${k.id}','${x.andId||""}')" title="O prazo não se aplica ao caso">Dispensar</button>` : "",
    minha && !gq && !x.cumprir ? `<button class="tl-mais-it pp-sec-bt" role="menuitem" onclick="${fechar};concluirTarefa('${minha.id}')" title="Concluir escrevendo o que foi feito">Anotar</button>` : "",
    minha && nat!=="fatal" ? `<button class="tl-mais-it pp-sec-bt" role="menuitem" onclick="${fechar};adiarTarefa('${minha.id}')">Adiar</button>` : "",
    abrirCaso && celular() ? abrirCaso.replace('class="ppz-bt ppz-caso"', 'class="tl-mais-it pp-sec-bt" role="menuitem"') : ""]);
  let el;
  if(esq){
    el = document.getElementById("painel-prazo-esq") || Object.assign(document.createElement("aside"), {id: "painel-prazo-esq"});
    if(el.parentNode!==esq) esq.prepend(el);
    document.body.classList.add("prazo-esq");
  }else{
    fecharPrazoEsq();
    el = document.getElementById("painel-prazo");
    if(!el){ el = document.createElement("aside"); el.id = "painel-prazo"; document.body.appendChild(el); }
  }
  el.setAttribute("aria-label", "Prazo: " + x._titulo);
  el.classList.add("pp-prazo"); el.classList.toggle("pp-sobre", sobre);
  el.innerHTML = `<header class="ppz-cab">
      <div class="ppz-cab-l"><button type="button" class="ppz-volta" onclick="${fechar}">‹ Prazos</button><span class="pp-cli">${esc([c && c.nome, k ? casoCurtoPz(k) : "Do cliente"].filter(Boolean).join(" · "))}</span>
        <button type="button" class="pp-x" onclick="${fechar}" aria-label="Fechar">${IC_X_PZ}</button></div>
      <div class="ppz-pills">${pillNat(nat)}${pillTodo(x)}${venc ? `<span class="pz-pill pz-pill-venc">Vencido sem registro</span>` : ""}</div>
      <h2>${esc(x._titulo)}</h2>
    </header>
    <div class="ppz-corpo">${gq ? `${quanto}${conta}${fazer}${acompanha}` : `${origem}${acompanha2}${novosPz}${quanto}${fazer}${ligado}`}</div>
    <footer class="ppz-pe">${principal}${acaoPe ? `<span class="ppz-acoes">${acaoPe}</span>` : ""}${extra}${celular() ? "" : abrirCaso}<span class="ppz-esp"></span>${mais.replace('class="tl-mais"', 'class="tl-mais pp-mais"')}</footer>`;
  if(esq) return;
  let veu = document.getElementById("pp-veu");
  if(sobre && !veu){ veu = document.createElement("div"); veu.id = "pp-veu"; veu.onclick = fecharPainelPrazo; document.body.appendChild(veu); }
  if(!sobre && veu) veu.remove();
  requestAnimationFrame(()=>{ el.classList.add("aberto"); if(!sobre) document.body.classList.add("lado-aberto","pz-largo");
    const h = el.querySelector("h2"); if(h && sobre){ h.tabIndex = -1; h.focus({preventScroll: true}); } });
}
// um item de "Ligado a este prazo": a bolinha da natureza, o título, a data e quanto falta, e o Abrir
function ligadoPz(nat, tit, meta, f, acao){
  return `<div class="ppz-lig"><span class="ppz-lig-b ppz-b-${nat}" aria-hidden="true"></span><div class="ppz-lig-c"><b>${esc(tit)}</b>
    <small>${esc(meta)}${f ? ` · <b class="ppz-u-${f.urg}">${esc(f.txt)}</b>` : ""}</small></div>${acao ? `<button type="button" class="ppz-link" onclick="${acao}">Abrir</button>` : ""}</div>`;
}
document.addEventListener("keydown", e=>{ if(e.key==="Escape" && painelPz && !document.querySelector("#modal:not([style*='none']) *"))
  document.getElementById("painel-prazo-esq") ? fecharPrazoEsq() : fecharPainelPrazo(); });
const _pzTodos = new Set();   // F241 · os casos em que se abriram todas as datas, na sessão
function prazoSaberMais(i, fonte){
  const x = linhaDoPz(i, fonte); if(!x) return;
  caixa(`<h3 style="margin:0 0 6px">${esc(x._titulo || x.titulo || x.rotulo || (x.ehPrazo?"Prazo processual":x.ico==="🩺"?"Perícia":NAT_ROT[natDaLinha(x)]||"Lembrete"))} · ${fmtBarra(x.data)}</h3>
    <div style="font-size:13px;line-height:1.4;margin-bottom:10px">${x.cru?x.rot:esc(x.rot)}</div>
    <div class="form-linha" style="align-items:center;gap:8px;flex-wrap:wrap">
      ${x.edita?`<label class="meio-sub">data <input type="date" value="${x.data}" ${x.edita}></label>`:""}
      ${x.clique?`<button class="btn-mini" ${x.clique.replace(/^onclick="/,'onclick="fecharCaixa();')}>Abrir</button>`:""}
      ${x.acao||""}
      <button class="btn-rap" style="margin-left:auto" onclick="fecharCaixa()">fechar</button>
    </div>`);
}
// F59 · clicou na linha, aparece a ANOTAÇÃO que criou a data — tudo
// sincronizado: o lembrete gêmeo acha a nota pelo título; lembrete avulso
// mostra a própria ficha dele
function qdCaixaNota(c, n){
  const atrs=(n.atribuidos||[n.atribuido]).filter(Boolean)
    .map(id=>D.colPorId.get(id)).filter(Boolean);
  caixa(`<h3 style="margin:0 0 6px">📝 Anotação de ${n.em?fmt(n.em.slice(0,10)):"—"}</h3>
    <p style="white-space:pre-wrap;margin:0 0 8px">${n.quem?`<b>${esc(n.quem)}:</b> `:""}${esc(n.texto||"")}</p>
    <p class="meio-sub" style="margin:0 0 10px">${n.urgente?"🔥 urgente · ":""}${n.importante?"⭐ importante · ":""}${
      n.lembrar_em?`📅 lembrar em ${fmt(n.lembrar_em)} · `:""}${
      atrs.length?`atribuída a ${atrs.map(a=>esc(a.nome.split(" ")[0])).join(", ")}`:"sem atribuição"}</p>
    <div class="form-linha">
      <button class="btn-rap" onclick="fecharCaixa()">fechar</button>
      <button class="btn-mini" style="margin-left:auto"
        onclick="fecharCaixa();qdIrParaAnotacoes()" title="abrir nas Anotações"><span aria-hidden="true">Anotações</span><span class="sr-only">abrir nas Anotações</span></button>
    </div>`);
}
function qdIrParaAnotacoes(){
  const b=document.querySelector('.mt[data-vv="0"]'); if(b) b.click();
  irSubCad("anotacoes");
}
// F60 · o clique na tarefa leva ao PRÓPRIO andamento: aba Casos, sub-aba
// do Escritório, rolagem até o comentário e um brilho para o olho achar
function qdIrParaAndamento(casoId, andId){
  casoSel=casoId;
  const b=document.querySelector('.mt[data-vv="2"]'); if(b) b.click();
  irSubAba("escritorio");
  setTimeout(()=>{
    const v=document.getElementById(`visto-${andId}`);
    const alvo=v && (v.closest("li")||v.closest(".and-item,.mov-item,div"));
    if(alvo){ alvo.scrollIntoView({block:"center"});
      alvo.classList.add("qd-flash");
      setTimeout(()=>alvo.classList.remove("qd-flash"), 2600); }
  }, 700);
}
function qdVerNota(cliId, idx){
  const c=D.cliPorId.get(cliId); if(!c) return;
  const n=((c.campos||{}).atendimento||[])[idx];
  if(n) qdCaixaNota(c, n);
}
function qdVerLembrete(id){
  const l=(D.lembretes||[]).find(x=>x.id===id); if(!l) return;
  const c=D.cliPorId.get(l.cliente_id)||{};
  const nota=((c.campos||{}).atendimento||[])
    .find(n=>`Anotação: ${(n.texto||"").slice(0,60)}`===l.titulo);
  if(nota) return qdCaixaNota(c, nota);
  const resp=D.colPorId.get(l.responsavel_id), quem=D.colPorId.get(l.criado_por);
  caixa(`<h3 style="margin:0 0 6px">🔔 ${esc(l.titulo||"Lembrete")}</h3>
    <p class="meio-sub" style="margin:0 0 10px">para ${fmt(l.proximo_em)}${
      l.intervalo_meses?` · repete a cada ${l.intervalo_meses} mês(es)`:""}${
      resp?` · responsável: ${esc(resp.nome.split(" ")[0])}`:""}${
      quem?` · criado por ${esc(quem.nome.split(" ")[0])}`:""} —
      este lembrete não nasceu de anotação.</p>
    <div class="form-linha">
      <button class="btn-rap" onclick="fecharCaixa()">fechar</button>
      ${clienteAberto?`<button class="btn-mini" style="margin-left:auto"
        onclick="fecharCaixa();verAposFuturas(clienteAberto)" title="ver as Aposentadorias futuras"><span aria-hidden="true">Aposentadorias</span><span class="sr-only">ver as Aposentadorias futuras</span></button>`:""}
    </div>`);
}
async function qdMudarNota(cliId, idx, valor){
  const c=D.cliPorId.get(cliId); if(!c) return;
  const notas=[...((c.campos||{}).atendimento||[])]; if(!notas[idx]) return;
  if(!valor){ delete notas[idx].lembrar_em; } else notas[idx]={...notas[idx], lembrar_em:valor};
  c.campos={...(c.campos||{}), atendimento:notas};
  await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({campos:c.campos})}).catch(()=>aviso("Não gravou — tente de novo"));
  aviso(valor?`🗓 Anotação remarcada para ${fmt(valor)}`:"🗓 Data tirada da anotação", false);
  repintarFicha();
}
async function qdMudarPrazo(casoId, valor){
  const k=D.casoPorId.get(casoId); if(!k) return;
  const corpo={prazo:valor||null}, antes=k.prazo;
  // F236 · tirar o prazo (o ✔ feito do clássico) devolve o caso à fase de onde veio, como o ✔ cumprido do v10 e a
  // conclusão da tarefa (F64): sem isso o caso ficava preso em 🗓 Tarefas com Prazo, sem etapa nem recurso
  const fe = faseEfetiva(k);
  if(!valor && k.fase==="outro" && fe!=="outro"){
    corpo.fase = fe; corpo.mover_para = (LISTAS_MOVER.find(([,f])=>f===fe)||[])[0] || null;
    corpo.ronda = {...(k.ronda||{})}; delete corpo.ronda.prazo_de;
  }
  await api(`/rest/v1/casos?id=eq.${casoId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify(corpo)}).catch(()=>aviso("Não gravou — tente de novo"));
  Object.assign(k, corpo);
  if(!valor && antes) await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({caso_id:casoId, autor_id:eu.id, texto:`✔ [PRAZO CUMPRIDO] Prazo de ${fmt(antes)} dado por cumprido${corpo.mover_para?` — o caso voltou para ${corpo.mover_para}`:""}.`})}).catch(()=>{});
  aviso(valor?`⏰ Prazo fatal remarcado para ${fmt(valor)}`:`⏰ Prazo retirado${corpo.mover_para?` — o caso voltou para ${corpo.mover_para}`:""}`, false);
  if(corpo.fase){ montarSidebar(); if(clienteAberto) return abrirFicha(clienteAberto); }
  repintarFicha();
}

function campoFato(k, campo){
  const f = FATOS[campo], v = k[campo];
  // F115 · o lembrete da prorrogação existe mesmo sem ninguém ter preenchido
  const mostra = !v ? (campo==="dcb_prorrogar_em" && prorrogarEm(k)
      ? `<span class="fx-vazio" title="lembrete automático, ${DIAS_PRORROG} dias antes da DCB">${fmt(prorrogarEm(k))} · automático</span>`
      : `<span class="fx-vazio">—</span>`)
    : f.tipo==="data" ? fmt(v)
    : f.tipo==="especie" ? `${esc(v)}${(e=>e?` <small>${esc(e[1])}</small>`:"")(ESPECIES.find(e=>e[0]===String(v).toUpperCase()))}`
    : esc(v);
  return `<div class="fx" data-fato="${campo}">
    <dt title="${esc(f.dica)}">${esc(f.rot)}</dt>
    <dd id="fx-${campo}-${k.id}">${mostra}
      <button class="lapis" title="alterar ${esc(f.rot)}" onclick="editarFato('${k.id}','${campo}')">✎</button></dd>
  </div>`;
}


// ── cópia fiel de regras/marcadores.js ────────────────────────────────────
// O app.html é arquivo único e não faz require; o teste marcadores.test.js
// compara o código-fonte das duas cópias e o catálogo inteiro.
const MARCADORES = [
  { slug: 'rural', rot: 'Rural', icone: '🌾', cor: '#7A8B2E',
    especies: ['B42', 'B41', 'B46'],
    dica: 'reconhecimento de tempo de atividade rural, para somar tempo/carência ou aumentar o valor',
    docs: [
      'Autodeclaração rural (formulário do INSS)',
      'Prova material do período rural (notas de produtor, ITR, contrato de parceria, escritura)',
      'Documentos de escola/igreja/sindicato com a qualificação de lavrador',
      'Indicar testemunhas do período rural (nome, telefone, período que conviveu)',
    ] },
  { slug: 'idade_rural', antigo: ['idaderural'], rot: 'Idade rural', icone: '🚜', cor: '#4E7A3A',
    especies: ['B41'],
    dica: 'aposentadoria por idade do segurado especial — 55 anos (mulher) / 60 (homem), sem contribuição',
    docs: [
      'Comprovar a atividade rural no período imediatamente anterior ao requerimento',
      'Autodeclaração rural homologada (sindicato, INCRA ou órgão indicado)',
      'Conferir se a idade reduzida já foi alcançada (55 mulher / 60 homem)',
    ] },
  { slug: 'especial', rot: 'Especial', icone: '⚗️', cor: '#1F6FB2',
    especies: ['B42', 'B41'],
    dica: 'reconhecimento de tempo especial para converter em comum ou aumentar o valor '
        + '(quando o pedido É a aposentadoria especial, a espécie B46 já diz isso)',
    docs: [
      'PPP — Perfil Profissiográfico Previdenciário de cada empresa',
      'LTCAT ou laudo técnico das condições ambientais',
      'CTPS e ficha de registro dos períodos alegados como especiais',
      'Conferir no PPP: agente nocivo, técnico responsável e período sem lacuna',
    ] },
  { slug: 'pcd', rot: 'Deficiência', icone: '♿', cor: '#7A5AA8',
    especies: ['B42', 'B41'],
    dica: 'aposentadoria da pessoa com deficiência (LC 142/2013)',
    docs: [
      'Laudos, exames e relatórios que comprovem a deficiência e desde quando',
      'Requerer a avaliação biopsicossocial (perícia médica + serviço social)',
    ],
    // a deficiência reduz o TEMPO por tempo de contribuição e a IDADE na
    // aposentadoria por idade: o que se levanta em cada uma não é o mesmo
    porEspecie: {
      B42: { dica: 'LC 142/2013 — o grau da deficiência reduz o tempo de contribuição exigido',
             docs: ['Levantar os períodos trabalhados COM a deficiência (é o que define o grau)'] },
      B41: { dica: 'LC 142/2013 — idade reduzida (55 mulher / 60 homem), com 15 anos de contribuição na condição de deficiente',
             docs: ['Conferir se a idade reduzida já foi alcançada (55 mulher / 60 homem)',
                    'Somar os anos de contribuição na condição de deficiente (mínimo 15)'] },
    } },

  // ── pensão por morte ────────────────────────────────────────────────────
  // O óbito acidentário não entra aqui: tem espécie própria (B93), e pela
  // regra 1 quem diz isso é o código do INSS. Os dois marcadores abaixo valem
  // para as duas espécies, porque um dependente inválido e uma união estável
  // a comprovar existem tanto na pensão comum quanto na acidentária.
  { slug: 'dependente_invalido', rot: 'Dependente inválido/PcD', icone: '🧑‍🦽', cor: '#8A5A2B',
    especies: ['B21', 'B93'],
    dica: 'dependente inválido ou com deficiência — a pensão não se sujeita ao prazo por idade',
    docs: [
      'Laudos e exames que comprovem a invalidez ou a deficiência do dependente',
      'Comprovar que a invalidez/deficiência é ANTERIOR ao óbito — é o que garante a vitaliciedade',
      'Requerer a perícia médica do INSS no dependente',
    ] },
  { slug: 'uniao_estavel', rot: 'União estável', icone: '💍', cor: '#B03A6E',
    especies: ['B21', 'B93'],
    dica: 'união estável a comprovar — não há certidão de casamento',
    docs: [
      'Início de prova material da união (conta conjunta, mesmo endereço, plano de saúde, IR, filhos em comum)',
      'Comprovar que a união existia NA DATA do óbito',
      'Indicar testemunhas da convivência (nome, telefone, desde quando conhecem o casal)',
    ] },
];

const POR_SLUG = new Map(MARCADORES.map(m => [m.slug, m]));

function doCatalogo(especie) {
  const e = String(especie || '').trim().toUpperCase();
  if (!e) return [];
  return MARCADORES.filter(m => m.especies.includes(e));
}

function marcadoresDe(k) {
  const bruto = k && k.marcadores;
  const lista = Array.isArray(bruto) ? bruto : (bruto ? [bruto] : []);
  const vistos = new Set();
  // a ordem é a do catálogo, não a de clique: assim "Rural + Especial" é
  // sempre escrito do mesmo jeito, e duas fichas iguais parecem iguais
  return MARCADORES.filter(m => {
    // `antigo` guarda o slug de uma versão anterior: renomear um marcador não
    // pode apagar a marcação que alguém já fez
    const nomes = [m.slug, ...(m.antigo || [])];
    const tem = lista.some(x => nomes.includes(String(x).trim().toLowerCase()));
    if (tem && !vistos.has(m.slug)) { vistos.add(m.slug); return true; }
    return false;
  }).map(m => m.slug);
}

function alternar(k, slug) {
  if (!POR_SLUG.has(slug)) return marcadoresDe(k);
  const atuais = marcadoresDe(k);
  const fora = atuais.includes(slug) ? atuais.filter(x => x !== slug) : [...atuais, slug];
  return marcadoresDe({ marcadores: fora });
}

function rotuloDoPedido(k) {
  const base = String((k && k.beneficio) || '').trim();
  const marcas = marcadoresDe(k).map(s => POR_SLUG.get(s).rot);
  if (!marcas.length) return base;
  return base ? `${base} · ${marcas.join(' + ')}` : marcas.join(' + ');
}

function docsDosMarcadores(k, jaTem = []) {
  const tidos = new Set(jaTem.map(x => String(x).trim().toLowerCase()));
  const e = String((k && k.especie) || '').trim().toUpperCase();
  const fora = [];
  for (const slug of marcadoresDe(k)) {
    const m = POR_SLUG.get(slug);
    const extras = (m.porEspecie && m.porEspecie[e] && m.porEspecie[e].docs) || [];
    for (const d of [...m.docs, ...extras]) {
      const chave = d.trim().toLowerCase();
      if (tidos.has(chave)) continue;
      tidos.add(chave);
      fora.push(d);
    }
  }
  return fora;
}

function dicaDoMarcador(slug, especie) {
  const m = POR_SLUG.get(slug);
  if (!m) return '';
  const e = String(especie || '').trim().toUpperCase();
  return (m.porEspecie && m.porEspecie[e] && m.porEspecie[e].dica) || m.dica;
}

function pedidosIguais(a, b) {
  const eA = String((a && a.especie) || '').trim().toUpperCase();
  const eB = String((b && b.especie) || '').trim().toUpperCase();
  if (!eA || eA !== eB) return false;
  const mA = marcadoresDe(a), mB = marcadoresDe(b);
  return mA.length === mB.length && mA.every((x, i) => x === mB[i]);
}
// ── fim da cópia ──────────────────────────────────────────────────────────

// A linha que responde "o que estou pedindo aqui?" sem abrir nada. Clicar
// liga e desliga — e ligar acrescenta ao checklist os documentos daquele
// pedido, que é onde a marcação deixa de ser enfeite e vira trabalho feito.

// F87 · NATUREZA DO PEDIDO. A espécie diz QUAL benefício; a natureza diz o
// que se pede sobre ele: conceder pela primeira vez, revisar o que já foi
// concedido, ou acertar o cadastro/CNIS que sustenta o pedido. Muda a peça,
// o prazo decadencial e o modo de cobrar honorários, e o escritório filtra a
// carteira por isso. Pede a coluna casos.natureza (schema_natureza.sql).
const NATUREZAS = [["concessao","Concess\u00e3o"],["revisao","Revis\u00e3o"],["acerto","Acerto de cadastro"]];
const rotNatureza = v => (NATUREZAS.find(([sl])=>sl===v)||[])[1] || "";
function linhaNatureza(k){
  if(!String(k.especie||"").trim()) return "";
  return `<div class="marc-linha nat-linha">
    <span class="marc-rot">NATUREZA DO PEDIDO</span>
    ${NATUREZAS.map(([slug,rot])=>`<button class="marc nat ${k.natureza===slug?"on":""}"
      title="${esc(rot)} \u2014 ${k.natureza===slug?"clique para tirar":"clique para marcar"}"
      onclick="definirNatureza('${k.id}','${slug}')">${esc(rot)}</button>`).join("")}
  </div>`;
}
async function definirNatureza(casoId, slug){
  const k=D.casoPorId.get(casoId); if(!k) return;
  const antes=k.natureza||null, nova=(antes===slug)?null:slug;
  k.natureza=nova;
  try{ await patchCaso(k.id, {natureza:nova}); }
  catch(e){
    k.natureza=antes; abrirFicha(clienteAberto);
    return aviso(/42703|natureza/.test(String(e.message||e))
      ? "A coluna natureza ainda n\u00e3o existe no banco \u2014 rode crm/fase2/schema_natureza.sql no Supabase"
      : "N\u00e3o gravou: "+String(e.message||e).slice(0,90));
  }
  aviso(nova?`Natureza: ${rotNatureza(nova)}`:"Natureza retirada", false);
  repintarFicha();
}
function linhaMarcadores(k){
  const ativos = marcadoresDe(k);
  const cabem = doCatalogo(k.especie);
  // marcador que não cabe nesta espécie mas está gravado (a espécie mudou
  // depois): continua aparecendo, senão sumiria sem ninguém ver
  const mostrar = [...cabem, ...MARCADORES.filter(m=>ativos.includes(m.slug) && !cabem.includes(m))];
  // sem espécie não há o que marcar: quem manda nos marcadores é ela. Em vez
  // de seis botões que não dizem por que estão ali, o convite de preenchê-la.
  if(!String(k.especie||"").trim())
    return `<div class="marc-linha"><span class="meio-sub">Defina a
      <b>espécie</b> no topo do cartão (B41, B42…) para marcar o que está sendo pedido.</span></div>`;
  // F70 · espécie sem marcador NÃO ganha frase explicativa: silêncio limpo
  if(!mostrar.length) return "";
  return `<div class="marc-linha">
    ${mostrar.map(m=>{
      const on = ativos.includes(m.slug);
      return `<button class="marc ${on?"on":""}" style="--marc:${m.cor}"
        title="${esc(dicaDoMarcador(m.slug, k.especie))}${on?" — clique para tirar":" — clique para marcar"}"
        onclick="alternarMarcador('${k.id}','${m.slug}')">${m.icone} ${esc(m.rot)}</button>`;
    }).join("")}
  </div>${avisoPedidoIgual(k)}`;
}
// Nem toda espécie tem o que marcar (B31, B57, B46…) — nesses casos a linha
// simplesmente NÃO aparece (F70: a frase explicativa saiu a pedido do Paulo).
// O mesmo cliente PODE ter dois pedidos da mesma espécie: um B42 por
// deficiência e outro B42 por tempo especial são pedidos diferentes, com
// protocolo e decisão próprios. O que não faz sentido é o MESMO pedido
// cadastrado duas vezes — e é só disso que este aviso fala.
function avisoPedidoIgual(k){
  const irmaos = (D.casosDoCliente.get(k.cliente_id)||[])
    .filter(x=>x.id!==k.id && x.fase!=="encerrado" && pedidosIguais(k,x));
  if(!irmaos.length) return "";
  return `<div class="marc-igual">⚠ Este cliente tem outro caso ativo com o
    <b>mesmo pedido</b> (${esc(k.especie)}${marcadoresDe(k).length?" · "+marcadoresDe(k).map(s=>POR_SLUG.get(s).rot).join(" + "):""}).
    Se forem pedidos diferentes, marque o que muda entre eles; se for o mesmo, encerre um.</div>`;
}
async function alternarMarcador(casoId, slug){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const antes = marcadoresDe(k);
  const nova = alternar(k, slug);
  k.marcadores = nova;
  // O BOTÃO MORTO. Este `await` não tinha rede de proteção: quando o banco
  // recusava — e recusava sempre, enquanto a coluna `marcadores` não existir
  // lá — a função abortava aqui. Sem aviso, sem redesenho, sem nada. Clicar
  // não mudava um pixel, e a única leitura possível era "está quebrado".
  try{
    await patchCaso(k.id, {marcadores:nova});
  }catch(e){
    k.marcadores = antes;                       // não fica marcado o que não gravou
    abrirFicha(clienteAberto);
    // 42703 é o "column does not exist" do PostgreSQL: dizer isso com todas as
    // letras poupa a caçada, porque a correção não está no app, está no banco
    aviso(/42703|marcadores/.test(e.message)
      ? "O banco ainda não tem a coluna dos marcadores — rode o schema.sql no Supabase."
      : "Não consegui gravar o marcador. Tente de novo.");
    return;
  }
  // ligou um marcador novo: os documentos dele entram no checklist. Desligar
  // NÃO apaga item nenhum — pode já ter sido conferido, e apagar trabalho
  // conferido por causa de um clique errado seria pior que sobrar item.
  let novos = 0;
  if(nova.length > antes.length){
    const jaTem = subtarefasDe(k.id).map(t=>t.titulo);
    for(const titulo of docsDosMarcadores({marcadores:[slug]}, jaTem)){
      const [t] = await api(`/rest/v1/tarefas`,{method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({caso_id:k.id, titulo})}).catch(()=>[]);
      if(t){ D.tarefas.push(t); novos++; }
    }
  }
  aviso(novos?`Marcado ✔ — ${novos} item(ns) no checklist 📋`
             :(nova.includes(slug)?"Marcado ✔":"Desmarcado"), false);
  abrirFicha(clienteAberto);
}

// ══════════════════════════════════════════════════════════════════════════
// F12 · RAIZ E RAMOS — de onde o caso partiu e no que ele se ramificou
// ══════════════════════════════════════════════════════════════════════════
// O caso tem UM ponto de partida (o requerimento no INSS, com protocolo ou
// NB) e dali ramifica: recurso no Conselho, ação judicial, mandado de
// segurança. Os números já estavam todos guardados, cada um numa sub-aba
// diferente, e ninguém via a árvore inteira de uma vez. O caso do Silvio,
// com mandado de segurança e ação ordinária ao mesmo tempo, é exatamente o
// que essa tela responde.
//
// Cada ramo diz três coisas: o número, se é NOSSO ou de outro advogado, e se
// está sendo ACOMPANHADO pelos robôs. Processo de terceiro que interessa
// olhar existe (o do ex-advogado, o do litisconsorte), e ele não pode se
// misturar com o trabalho do escritório.
function alternarAcompanhar(casoId, numero){
  const k=D.casoPorId.get(casoId); if(!k) return;
  const lista=processosDoCaso(k).map(p=>
    soDig(p.numero)===soDig(numero) ? {...p, acompanhar:!p.acompanhar} : p);
  salvarProcessos(casoId, lista);
}
function ramoRecurso(k, nup, i){
  const b=(crpsBlocos(k)||[]).find(x=>soDig(x.nup)===soDig(nup)) || {};
  const dec=(b.eventos||[]).filter(e=>decideOCaso(e)).slice(-1)[0];
  return `<div class="ramo" onclick="irSubAba('crps')" title="abrir a sub-aba Recurso (CRPS)">
    <span class="ramo-tipo">Recurso</span>
    <span class="ramo-num">${esc(formatarNup(nup))}</span>
    ${b.situacao?`<span class="chip neutro">${esc(b.situacao)}</span>`:""}
    ${/* F74 · dataParaISO sem o prefixo CRPS. não existia: este chip quebrava
         o render inteiro quando o recurso tinha decisão (ReferenceError) */""}
    ${dec?`<span class="chip ben" title="${esc(dec.status||"")}">decidido${dec.data?" em "+esc(fmt(isoCrps(dec.data))||""):""}</span>`:""}
  </div>`;
}
function ramoProcesso(k, p){
  const dj=datajudDe(k, p.numero) || {};
  return `<div class="ramo${p.nosso?"":" alheio"}">
    <span class="ramo-tipo">${p.nosso?"Processo":"Processo de terceiro"}</span>
    <span class="ramo-num" onclick="irSubAba('cnj')" style="cursor:pointer"
      title="abrir a sub-aba Andamentos do CNJ">${esc(fmtProc(p.numero))}</span>
    ${p.principal?`<span class="chip ben">principal</span>`:""}
    ${p.papel!=="acao"?`<span class="chip neutro">${esc(PAPEIS_PROCESSO[p.papel].nome)}</span>`
      : dj.classe?`<span class="chip neutro">${esc(classeCurta(dj.classe)||dj.classe)}</span>`:""}
    <button class="chip ${p.acompanhar?"verde":"neutro"}" style="border:0;cursor:pointer"
      onclick="event.stopPropagation();alternarAcompanhar('${k.id}','${esc(p.numero)}')"
      title="${p.acompanhar?"os robôs consultam este número todo dia útil — clique para parar"
                          :"ninguém consulta este número — clique para o robô passar a acompanhar"}"
      >${p.acompanhar?"acompanhado":"não acompanhado"}</button>
  </div>`;
}
function trilhaProcessual(k){
  const prots=(k.protocolos||[]), nups=crpsNups(k), procs=processosDoCaso(k);
  if(!prots.length && !k.nb && !nups.length && !procs.length) return "";
  const raiz=[];
  if(k.nb) raiz.push(`<span class="chip neutro" title="número do benefício">NB ${esc(k.nb)}</span>`);
  prots.forEach(pr=>raiz.push(`<span class="chip neutro" style="cursor:pointer"
    title="copiar o protocolo" onclick="copiar('${esc(pr)}','Protocolo copiado')">protocolo ${esc(pr)}</span>`));
  if(k.der) raiz.push(`<span class="chip neutro">DER ${fmt(k.der)}</span>`);
  const ramos=[...nups.map((n,i)=>ramoRecurso(k,n,i)), ...procs.map(p=>ramoProcesso(k,p))];
  return `<div class="trilha-proc">
    <div class="trilha-rot">De onde partiu</div>
    <div class="trilha-raiz">${raiz.length?raiz.join(" ")
      :`<span class="meio-sub">sem protocolo nem NB anotado — o pedido no INSS é a raiz deste caso</span>`}</div>
    ${ramos.length?`<div class="trilha-rot">No que ramificou (${ramos.length})</div>
      <div class="trilha-ramos">${ramos.join("")}</div>`
    :`<div class="trilha-rot">No que ramificou</div>
      <div class="meio-sub" style="padding-left:14px">nenhum recurso nem processo vinculado ainda</div>`}
  </div>`;
}
// F68 · ACOMPANHAMENTO Manual ou Automático — a pergunta que separa os casos
// que o portal/robô vigia sozinho dos que alguém precisa abrir de tempos em
// tempos (INSS sem coleta, E-SISREC com a senha do cliente). O ✓ registra a
// checagem: cinza = ninguém checou; verde = checado, e o título diz quem e
// quando. Os manuais ganham a lista própria 🔎 Checagem manual na barra.
async function mudarAcomp(casoId, modo){
  const k=D.casoPorId.get(casoId); if(!k) return;
  try{ await patchCaso(casoId, {acompanhamento:modo}); }
  catch(e){ return aviso("Não gravou — rode o schema_acompanhamento.sql no Supabase"); }
  k.acompanhamento=modo;
  montarSidebar(); repintarFicha();
}
async function checarAcomp(casoId){
  const k=D.casoPorId.get(casoId); if(!k) return;
  const corpo={checado_em:new Date().toISOString(), checado_por:eu.id};
  try{ await patchCaso(casoId, corpo); }
  catch(e){ return aviso("Não gravou — rode o schema_acompanhamento.sql no Supabase"); }
  Object.assign(k, corpo);
  aviso("✔ Checagem registrada", false);
  repintarFicha();
}
function linhaAcomp(k){
  const quem = k.checado_por && D.colPorId.get(k.checado_por);
  const tit = k.checado_em
    ? `checado por ${quem?quem.nome:"?"} em ${fmt(dataSP(k.checado_em))} às ${horaSP(k.checado_em)}`
    : "ninguém checou ainda — clique quando fizer a checagem manual";
  // F69 · sem rótulo: os dois chips falam por si (cinza; o escolhido acende)
  return `<div class="fx fx-acomp"
      title="quem vigia este caso: nós (manual) ou o portal/robô (automático)">
    <dd><button class="chip-acomp ${k.acompanhamento==="manual"?"on":""}"
        onclick="mudarAcomp('${k.id}','manual')"
        title="precisamos checar de tempos em tempos (ex.: E-SISREC com a senha do cliente) — entra na lista 🔎 Checagem manual">Manual</button>
      <button class="chip-acomp ${k.acompanhamento==="automatico"?"on":""}"
        onclick="mudarAcomp('${k.id}','automatico')"
        title="o portal/robô acompanha sozinho — não precisa de checagem">Automático</button>
      <button class="acomp-check ${k.checado_em?"ok":""}" onclick="checarAcomp('${k.id}')"
        title="${esc(tit)}">✓</button></dd></div>`;
}

// ══════════════════════════════════════════════════════════════════════════
// F81 · A RÉGUA POR FASE (tema v10). Uma linha horizontal acima do trabalho:
// à esquerda as ÂNCORAS do pedido (DER e NB, que valem em toda fase); no
// meio ONDE ESTÁ, com o número vivo da fase atual (protocolo no INSS, NUP do
// e-Sisrec no Conselho, número CNJ no judicial); à direita, dobrados, os
// números das fases anteriores. Só desenha com o tema ligado; com o tema
// desligado o cartão de fatos segue mostrando tudo como sempre.
// ══════════════════════════════════════════════════════════════════════════
function temaV10(){ return document.documentElement.getAttribute("data-tema")==="v10"; }

// ══════════════════════════════════════════════════════════════════════════
// F86 · TRILHA PARALELA. O mandado de segurança impetrado enquanto o recurso
// dorme no Conselho NÃO é a fase seguinte do caso: é uma segunda trilha,
// viva ao mesmo tempo, e instrumental — existe para destravar a principal.
// Tratá-lo como fase nova (o que a F81/F82 faziam) empurrava o recurso para
// "fase anterior" e criava uma "Fase 3" que não aconteceu. A certidão do
// paralelismo é a classe do processo (MSCiv) num caso de fase administrativa.
// ══════════════════════════════════════════════════════════════════════════
function trilhaParalela(k){
  if(!k || faseEfetiva(k)==="judicial" || k.fase==="encerrado") return null;
  const j = dadosJudiciais(k);
  const ps = processosDoCaso(k);
  // F156 · o MS é o número marcado (ou lido) como mandado de segurança
  const ms = ps.find(x=>x.papel==="ms");
  if(ms && !ms.principal) return {numero:ms.numero, classe:ms.classe||"Mandado de segurança",
    orgao:ms.orgao||null, desde:ms.ajuizado||null};
  if(!j || !(j.ms || (ms && ms.principal))) return null;
  const p = ps.find(x=>x.principal) || ps[0];
  if(!p) return null;
  return {numero:p.numero, classe:j.classe, orgao:j.orgao, desde:j.ajuizado||k.ajuizado_em||null};
}
// ══════════════════════════════════════════════════════════════════════════
// F102 · A LINHA DO CASO (tema v10). Uma linha só, na placa cinza, com o
// essencial: espécie e benefício, DER, onde tramita e quem vigia. Os números
// (NB, e-Sisrec, judicial) abrem no ➕ da direita; protocolos, a escolha
// Manual/Automática, o comentário fixo e as ações do caso abrem num segundo
// ➕, onde também mora o cartão de fatos inteiro, dobrado — nada sumiu.
// Todo número copia no clique (.cop, F101). Substitui a régua F81.
// ══════════════════════════════════════════════════════════════════════════
const lcAberto = new Map();                  // casoId -> 0 fechado · 1 números · 2 gestão
const lcNivel = id => lcAberto.get(id) || 0;
function lcAbrir(id, n){ lcAberto.set(id, n); repintarFicha(); }
const fmtBarra = iso => iso ? `${iso.slice(8,10)}/${iso.slice(5,7)}/${iso.slice(0,4)}` : "";
const fmtNb = v => { const d = soDig(v); return d.length===10 ? `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}` : String(v||""); };
function nbsDoCaso(k){
  return [...new Set([k.nb, ...(Array.isArray(k.nbs)?k.nbs:[])].map(x=>String(x||"").trim()).filter(Boolean))];
}
