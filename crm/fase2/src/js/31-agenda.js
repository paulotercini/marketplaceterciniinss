// a árvore é a aba; Detalhes leva à tela anterior, e a seta volta
function abaComProcessos(k, aba, andamentos){
  if(!processosDaFase(k, aba).length) return andamentos();
  if(vistaProc) return vistaProcessos(k, aba);
  return `<div class="sub-menu proc-vista" style="margin:0 0 10px;padding:0;width:100%"><button onclick="mudarVistaProc(true)" title="voltar à árvore do processo">‹ Árvore</button></div>` + andamentos();
}
function painelINSS(k, ands){
  const coms = comentariosPat(ands);
  // F103 · no tema, o compositor acompanha toda aba de andamentos: a
  // anotação nasce do mesmo lugar, esteja-se lendo o INSS, o Recurso ou o Judicial
  const comp0 = composerNoPainel(k) + avisoNumeroFora(k, "prot");
  // F185 · o submenu do INSS: os comentários e os anexos do requerimento
  const temDocs = docsDaOrigem(k, ["pat"]).length > 0;
  const telas = telasPat(k);
  const verDocs = fontePat==="docs" && temDocs, verTela = fontePat==="tela" && telas.length;
  const menu = temDocs || telas.length ? `<div class="sub-menu fontes" style="width:100%">
    <button class="${verDocs||verTela?"":"on"}" onclick="fontePat='';repintarFicha()">${temaV10()?"":"🌻 "}Comentários (${coms.length})</button>
    ${telas.length?`<button class="${verTela?"on":""}" onclick="fontePat='tela';repintarFicha()" title="o requerimento como o PAT mostra: situação, exigência, agendamentos, comentários e anexos">PAT</button>`:""}
    ${botaoDocs(k, ["pat"], verDocs, "fontePat='docs';repintarFicha()")}
  </div>` : "";
  if(verDocs) return comp0 + menu + painelDocumentos(k, ["pat"]);
  if(verTela) return comp0 + menu + telas.map(b=>telaPat(k, b)).join("");
  const comp = comp0 + menu;
  if(!coms.length)
    return comp + `<div class="caso">
      <div style="display:flex;align-items:center;gap:8px">
        <p class="meio-sub" style="flex:1">Sem comentários do INSS neste
        processo ainda. Eles chegam pela importação do PAT (coleta da extensão):
        quando o INSS escrever algo no processo, aparece aqui, igual ao site.</p>
        ${botaoFaseAba(k, "pat")}
        ${seloArquivo(k, "pat")}
      </div></div>`;
  // F45 · o mesmo esqueleto da conversa do Escritório
  const itens = coms.map(a=>{
    const m = /^(INSS|Escritório)\s*·\s*/.exec(a.texto||"");
    const doInss = !m || m[1]==="INSS";     // sem etiqueta gravada, é do INSS
    // limpar de novo na saída: comentário gravado antes da limpeza de entrada
    // ainda carrega "<p>" e "&aacute;" no banco
    const jaLi=(a.andamentos_lidos||[]).some(l=>l.colaborador_id===eu.id);
    const l = andLimpo(a, k);
    return { q: l.q, em: doInss?"🌻":"🏢", and: a,
      rot: doInss?"INSS":"Escritório (no portal)",
      texto: l.texto,
      // F190 · no tema o cartão oficial monta a barra sozinho
      html: temaV10() ? "" : `<span style="display:inline-flex;gap:4px;margin-left:6px;vertical-align:middle">
        ${jaLi?"":`<button class="btn-mini" onclick="liNaFicha('${a.id}')" title="marcar como lido (sai das 📣 Novidades)">✔ li</button>`}
        ${segBtnHtml(segRegistrar(k.id, a.texto, a.id))}</span>` };
  }).sort((x,y)=>x.q<y.q?1:-1);   // a data do portal pode não seguir a ordem da coleta
  return comp + `<div class="fatos" style="margin-bottom:12px">
    <div class="fatos-topo">
      <h3 style="font-size:14px">Comentários do processo no INSS</h3>
      <span style="margin-left:auto;display:inline-flex;gap:6px;align-items:center">${botaoFaseAba(k, "pat")}</span>
      ${seloArquivo(k, "pat")}
    </div>
    ${tlOficial(itens)}
    <div class="fatos-pe" style="justify-content:flex-end">
      <span class="meio-sub">coletado do PAT — o mesmo que aparece no site do INSS</span>
    </div>
  </div>`;
}

// ── 📖 Caso completo: todas as fontes numa linha do tempo só ─────────────
// O caso inteiro em ordem cronológica: o que o escritório escreveu, o que o
// INSS comentou, o que o recurso andou e o que o tribunal publicou — cada
// linha com a etiqueta de onde veio. É a resposta para "me conta esse caso":
// uma leitura de cima a baixo, sem pular de aba em aba.
//
// MARCO é o que muda o rumo: sentença, acórdão, trânsito em julgado, perícia
// marcada, alvará/RPV, concessão/indeferimento, exigência. Esses saltam da
// linha (faixa âmbar + ⭐) e têm filtro próprio — num caso com trezentos
// registros, os marcos são a história curta.
const RE_MARCO_TUDO = new RegExp("\\b(senten[çc]a|ac[óo]rd[ãa]o|monocr[áa]tic\\w*|"
  +"tr[âa]nsito em julgado|transitou em julgado|julgad[oa]|julgamento|"
  +"per[íi]cia|avalia[çc][ãa]o social|audi[êe]ncia|"
  +"alvar[áa]|precat[óo]rio|rpv|requisit[óo]ri\\w*|"
  +"deferid\\w*|indeferid\\w*|concedid\\w*|concess[ãa]o|implantad\\w*|"
  +"cessad\\w*|cessa[çc][ãa]o|exig[êe]ncia|recurso (?:provido|improvido|desprovido))\\b","i");
let tudoSoMarcos=false;
// F190 · os filtros do Caso completo: por fonte, o que pede ação e o que tem documento
let filtroTudo="tudo";
const FILTROS_TUDO = [["tudo","Tudo"],["escritorio","Escritório"],["inss","INSS"],["recurso","Recurso"],["judicial","Judicial"],["acao","Pede ação"],["prazo","Prazo sugerido"],["docs","Com documento"]];
const temPrazoSugerido = x => !!(x.and && ["pje","crps"].includes(x.and.origem) && prazoSugeridoHtml(x.and, -1));
function fonteFiltro(x){
  const c = x.chip||"";
  return /Escrit/.test(c) ? "escritorio" : /INSS/.test(c) ? "inss" : /Recurso/.test(c) ? "recurso" : /PJe|CNJ/.test(c) ? "judicial" : c.startsWith("🩺") ? "pericia" : "outro";
}
// o que pede ação: movimento dos portais não lido (menos a rotina), prazo
// sugerido sem prazo marcado, e o que alguém marcou importante ou urgente
function pedeAcao(x){
  if(x.ev) return x.ev.status==="agendada" && (!evAvisado(x.ev) || dataSP(x.ev.data_hora)<hoje());
  const a = x.and;
  // F236 · o movimento do e-Recursos só pede ação se é diligência, pauta ou decisão e o gêmeo ainda não foi lido
  if(!a) return !!(x.crpsE && (x.crpsE.importante || x.crpsE.urgente
    || (x.gemeo && !euLi(x.gemeo) && CRPS_PEDE_ACAO.has(x.crpsE.tipo))));
  if(a.importante || a.urgente) return true;
  if(!ehOficial(a)) return false;
  if(["pje","crps"].includes(a.origem) && prazoSugeridoHtml(a, -1)) return true;
  return !euLi(a) && !ehRotina(x);
}
function passaFiltro(x, f){
  if(f==="tudo") return true;
  const a = x.and;
  if(f==="acao") return pedeAcao(x);
  if(f==="prazo") return temPrazoSugerido(x);
  if(f==="docs") return !!(a && (D.anexos||[]).some(an=>an.andamento_id===a.id));
  const fo = fonteFiltro(x);
  // perícia e audiência entram tanto no INSS quanto no Judicial
  return fo===f || (fo==="pericia" && (f==="inss" || f==="judicial"));
}
// timestamp -> "AAAA-MM-DDTHH:MM" DE BRASÍLIA: o corte do ISO cru pegava a
// data UTC e todo registro feito depois das 21h aparecia (e era copiado para
// petição) com a data do dia seguinte; e a ordenação misturava formatos
const qSP = ts => ts ? dataSP(ts)+"T"+horaSP(ts) : "";
function fatosDoCasoTodo(k, ands){
  const itens=[];
  // F236 · o movimento do e-Recursos chega duas vezes: no bloco (com o acórdão e o resumo) e como andamento (com a
  // leitura e as tarefas). Fica UM cartão, o do bloco, que herda do andamento gêmeo o id, o lido e as respostas
  const doBloco = new Map(), gemeoDe = new Map();
  for(const b of crpsBlocos(k)) for(const e of (b.eventos||[]))
    if(e.tipo!=="ruido") doBloco.set(`${soDig(b.nup)}|${CRPS.chaveEvento(e)}`, e);
  for(const a of (ands||[]).filter(x=>!x.excluir)){
    if(a.origem==="pat"){
      const m=/^(INSS|Escritório)\s*·\s*/.exec(a.texto||""), l=andLimpo(a, k);
      itens.push({q:l.q, chip:"🌻 INSS", cor:"per", id:a.id, and:a,
        texto:l.texto + (m&&m[1]==="Escritório"?" (comentário nosso no portal)":"")});
    }else if(a.origem==="pje"){
      const l=andLimpo(a, k);
      itens.push({q:l.q, chip:"⚖️ PJe", cor:"neutro", id:a.id, and:a, texto:l.texto});
    }else if(a.origem==="crps"){
      const e = doBloco.get(String(a.origem_id||""));
      if(e){ gemeoDe.set(e, a); continue; }
      const l=andLimpo(a, k);
      itens.push({q:l.q, chip:"🖥 Recurso", cor:"fase", id:a.id, and:a, texto:l.texto});
    }else{
      // F46 · quem escreveu aparece com NOME e COR (avatar do colaborador),
      // não mais "P:" espremido no texto — a autoria vai nos campos próprios
      // F63 · id e responde_a viajam juntos: a conclusão de tarefa é RESPOSTA
      // e aqui também precisa ficar embaixo do pedido, não solta
      const co=D.colPorId.get(a.autor_id);
      itens.push({q:qSP(a.criado_em), chip:"🏢 Escritório", cor:"ben", id:a.id, and:a,
        pai:a.responde_a||null,
        quem:co?co.nome:null, avIni:co?co.inicial:null, avCor:co?co.cor:null,
        texto:(a.texto||"")});
    }
  }
  for(const b of crpsBlocos(k))
    for(const e of (b.eventos||[])){
      if(e.tipo==="ruido") continue;
      const g = gemeoDe.get(e);
      itens.push({q:isoCrps(e.data), chip:"🖥 Recurso", cor:"fase", crpsT:b, crpsE:e,
        forte:decideOCaso(e), texto:String(e.resumo||e.bruto||""), ...(g?{id:g.id, gemeo:g}:{})});
    }
  if(k.datajud && (k.datajud.ultimo || (k.datajud.instancias||[]).length))
    for(const inst of cnjInstancias(k))
      for(const m of (inst.historico||[]))
        itens.push({q:(m.data||"").slice(0,10), chip:"⚖️ CNJ", cor:"neutro",
          sis: inst.sistema || (k.datajud && k.datajud.sistema) || "",
          forte:!!m.decisao,
          texto:(m.nome||"")+(m.complemento?` — ${m.complemento}`:"")
            +(inst.rotulo&&cnjInstancias(k).length>1?` (${inst.rotulo})`:"")});
  // F66 · cancelada NÃO conta a história aqui: sai do Caso completo (a aba
  // Perícias continua guardando o histórico completo, canceladas incluídas)
  for(const e of D.eventos.filter(e=>e.caso_id===k.id && e.status!=="cancelada"))
    itens.push({q:qSP(e.data_hora), chip:"🩺 "+(e.tipo||"Perícia").split(" ")[0], cor:"per", ev:e,
      texto:`${e.tipo||"Perícia"} ${e.status==="agendada"?"marcada":e.status==="realizada"?"— compareceu ✔":e.status||""}${e.local?` — ${e.local}`:""}`});
  for(const x of itens)
    x.marco = !!x.forte || x.chip.startsWith("🩺") || RE_MARCO_TUDO.test(x.texto);
  // F63 · a resposta (responde_a) fica EMBAIXO do pai, recuada — como na
  // conversa do Escritório; solta só quando o pai não está na lista (órfã)
  const vivos=itens.filter(x=>x.q);
  const porId=new Map(vivos.filter(x=>x.id).map(x=>[x.id,x]));
  vivos.forEach(x=>{ if(x.pai && porId.has(x.pai)) x.resposta=true; });
  const raiz=vivos.filter(x=>!x.resposta).sort((a,b)=>a.q<b.q?1:-1);
  const saida=[];
  for(const r of raiz){
    saida.push(r);
    // as respostas do pai, da mais antiga para a mais nova (a leitura é
    // "o que foi pedido → o que foi feito")
    saida.push(...vivos.filter(f=>f.resposta && f.pai===r.id)
      .sort((a,b)=>a.q<b.q?-1:1));
  }
  return saida;
}

// ══════════════════════════════════════════════════════════════════════════
// F82 · O CASO COMPLETO POR FASE (tema v10). A mesma lista do fatosDoCasoTodo,
// só que cortada nas datas em que o caso mudou de fase: o requerimento no
// INSS começa na DER, o recurso no protocolo do RO (ou no 1º evento do
// e-Sisrec), a ação judicial na distribuição, o encerramento em
// encerrado_em. Cada fase vira um <details>; só a ATUAL nasce aberta, as
// outras mostram o período e a contagem. Quem abrir uma antiga a mantém
// aberta nas repinturas (fasesAbertas). Sem tema, painelTudo segue plano.
// ══════════════════════════════════════════════════════════════════════════
function fasesDoCaso(k){
  const j = dadosJudiciais(k) || {};
  const primeiroCrps = crpsBlocos(k).flatMap(b=>b.eventos||[]).map(e=>isoCrps(e.data)).filter(Boolean).sort()[0];
  const cand = [
    {id:"inss", nome:"Requerimento no INSS", ini:k.der||""},
    {id:"conselho", nome:"Recurso no Conselho", ini:k.ro_protocolado_em || (primeiroCrps||"").slice(0,10)},
    // F86 · MS ao lado da fase nao e fase: os registros dele ficam na atual
    {id:"judicial", nome:"Ação judicial", ini:trilhaParalela(k) ? "" : (k.ajuizado_em || (j.ajuizado||""))},
    {id:"encerrado", nome:k.fase==="pagamento"?"Pagamento":"Encerrado", ini:(k.encerrado_em||"").slice(0,10)},
  ].filter(f=>f.ini).sort((a,b)=>a.ini<b.ini?-1:1);
  // a fase em que o caso ESTÁ sempre existe, mesmo sem data: começa no início do caso
  const atual = k.fase==="pagamento"||k.fase==="encerrado" ? "encerrado" : TRILHA.includes(k.fase) ? k.fase : "inss";
  if(!cand.some(f=>f.id===atual)) cand.push({id:atual, nome:{inss:"Requerimento no INSS",escritorio:"Requerimento no INSS",conselho:"Recurso no Conselho",judicial:"Ação judicial",encerrado:"Encerrado"}[atual]||NOME_FASE[k.fase]||"Fase atual", ini:(k.criado_em||"").slice(0,10)});
  cand.sort((a,b)=>a.ini<b.ini?-1:1);
  // a primeira fase engole tudo o que veio antes dela (a raiz do caso)
  if(cand.length) cand[0].ini = "0000";
  return cand.map((f,i)=>({...f, fim: cand[i+1] ? cand[i+1].ini : null, n:i+1}));
}
function casoCompletoPorFase(k, linhas, itens){
  const fases = fasesDoCaso(k);
  if(fases.length<2) return tlPorMes(linhas, k.id);
  const idx = new Map(); linhas.forEach((l,i)=>idx.set(l, itens[i]));
  const grupos = fases.map(f=>({f, ls:[]}));
  for(const l of linhas){
    const d=(l.q||"").slice(0,10);
    // a resposta vai para onde está o pai; item sem data cai na fase atual
    let g = grupos.slice().reverse().find(g=>d && d>=g.f.ini) || grupos[grupos.length-1];
    g.ls.push(l);
  }
  const ultima = grupos.length-1;
  return grupos.slice().reverse().map((g,ri)=>{
    const i = ultima-ri, atual = i===ultima, chave = `${k.id}:${g.f.id}`;
    const aberta = atual || fasesAbertas.has(chave);
    const per = g.f.ini==="0000" ? (g.f.fim?`até ${fmt(g.f.fim)}`:"") : `${g.f.fim?`${fmt(g.f.ini)} a ${fmt(g.f.fim)}`:`desde ${fmt(g.f.ini)}`}`;
    return `<details class="fase-b${atual?" atual":""}" ${aberta?"open":""} data-fase-chave="${esc(chave)}">
      <summary><span class="ar">▸</span><span class="nm">Fase ${g.f.n} · ${esc(g.f.nome)}</span><span class="per">${esc(per)}</span><span class="qt">${g.ls.length} registro${g.ls.length===1?"":"s"}</span></summary>
      <div class="fase-c">${g.ls.length?tlPorMes(g.ls, chave):`<p class="meio-sub" style="padding:8px 12px">Nenhum registro nesta fase.</p>`}</div>
    </details>`;
  }).join("");
}
function ligarFasesCaso(){
  document.querySelectorAll("details.fase-b[data-fase-chave]").forEach(d=>{
    d.ontoggle = ()=>{ const ch=d.dataset.faseChave; if(d.open) fasesAbertas.add(ch); else fasesAbertas.delete(ch); };
  });
  // F241 · o mês aberto ou fechado à mão continua assim na repintura
  document.querySelectorAll("details.mes-b[data-mes-chave]").forEach(d=>{
    d.ontoggle = ()=>{ _mesesAbertos.set(d.dataset.mesChave, d.open); };
  });
}
// F241 · o Caso completo por mês: com muitos registros, cada mês num bloco; ficam abertos o mês atual, o anterior e o
// mês mais recente do caso (o caso parado mostra o último movimento). Poucos registros ou um mês só: a lista de sempre
const _mesesAbertos = new Map();
const MES_NOME = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
function tlPorMes(linhas, chave){
  const mes = l => String(l.q||"").slice(0, 7);
  const grupos = []; for(const l of linhas){ const m = mes(l), g = grupos[grupos.length-1]; if(g && g.m===m) g.ls.push(l); else grupos.push({m, ls:[l]}); }
  if(linhas.length <= 12 || grupos.length < 2) return tlOficial(linhas);
  const hj = hoje().slice(0, 7), ant = somaDias(hoje().slice(0, 8) + "01", -1).slice(0, 7), maisNovo = grupos.map(g=>g.m).filter(Boolean).sort().pop();
  return grupos.map(g=>{
    const ch = `${chave}|${g.m}`, padrao = !g.m || g.m===hj || g.m===ant || g.m===maisNovo;
    const aberto = _mesesAbertos.has(ch) ? _mesesAbertos.get(ch) : padrao;
    const rot = g.m ? `${MES_NOME[+g.m.slice(5, 7) - 1]} de ${g.m.slice(0, 4)}` : "sem data";
    return `<details class="mes-b"${aberto ? " open" : ""} data-mes-chave="${esc(ch)}"><summary><span class="ar">▸</span><span class="nm">${esc(cap1(rot))}</span><span class="qt">${g.ls.length} registro${g.ls.length===1?"":"s"}</span></summary>
      <div class="mes-c">${tlOficial(g.ls)}</div></details>`;
  }).join("");
}
function painelTudo(k, ands){
  const itens=fatosDoCasoTodo(k, ands);
  // F45 · o Caso completo é a primeira tela — o compositor vem junto: vê
  // tudo E escreve dali (a anotação nasce no Escritório e aparece aqui)
  if(!itens.length)
    return composerNoPainel(k) + `<div class="caso"><p class="meio-sub">Ainda não há nada registrado
      neste caso — em nenhuma das fontes.</p></div>`;
  const marcos=itens.filter(x=>x.marco);
  const filtro = temaV10() ? filtroTudo : "tudo";
  const base=(tudoSoMarcos && marcos.length) ? marcos : itens;
  const mostra=base.filter(x=>passaFiltro(x, filtro));
  const naoLidos=itens.filter(x=>{ const a=x.and||x.gemeo; return a && ehOficial(a) && !euLi(a); }).length;   // F236 · o gêmeo do bloco conta
  // F190 · o painel "Pede ação": o que espera alguém, em números que filtram,
  // e o Claude sobre o caso. A ficha é estreita: fica no alto, não ao lado.
  const nAcao = itens.filter(pedeAcao).length;
  const nPrazo = itens.filter(temPrazoSugerido).length;
  const nDocNovo = itens.filter(x=>x.and && !euLi(x.and) && (D.anexos||[]).some(an=>an.andamento_id===x.and.id)).length;
  const temDocs = documentosDoCaso(k).length > 0;
  const painelAcao = temaV10() ? `<section class="cc-acao" aria-label="o que pede ação neste caso">
      <span class="cc-acao-tit">Pede ação</span>
      <button class="cc-acao-n${nAcao?"":" zero"}" onclick="filtroTudo='acao';repintarFicha()" ${nAcao?"":"disabled"}><b>${nAcao}</b> ${nAcao===1?"registro":"registros"}</button>
      <button class="cc-acao-n${nPrazo?" prazo":" zero"}" onclick="filtroTudo='prazo';repintarFicha()" ${nPrazo?"":"disabled"}><b>${nPrazo}</b> prazo${nPrazo===1?"":"s"} sugerido${nPrazo===1?"":"s"}</button>
      <button class="cc-acao-n${nDocNovo?"":" zero"}" onclick="filtroTudo='docs';repintarFicha()" ${nDocNovo?"":"disabled"}><b>${nDocNovo}</b> documento${nDocNovo===1?"":"s"} novo${nDocNovo===1?"":"s"}</button>
      <span class="cc-acao-fim">
        ${naoLidos?`<button class="tl-bt" onclick="liTudoNaFicha('${k.id}')" title="marcar como lidos todos os andamentos dos portais deste caso">Marcar ${naoLidos} como lido${naoLidos>1?"s":""}</button>`:""}
        <button class="tl-bt" onclick="${temDocs?`menuClaudeDocs('${k.id}',[])`:`menuClaude('${k.id}')`}">${IC_SVG.claude} Claude sobre o caso</button>
      </span></section>` : "";
  const chipsFiltro = temaV10() ? `${painelAcao}<div class="cc-filtros" role="group" aria-label="filtrar os registros">${FILTROS_TUDO.map(([f,r])=>{
      const n = base.filter(x=>passaFiltro(x, f)).length;
      return (f==="tudo"||n) ? `<button class="cc-filtro${filtro===f?" on":""}" aria-pressed="${filtro===f}" onclick="filtroTudo='${f}';repintarFicha()">${r} · ${n}</button>` : "";
    }).join("")}</div>` : "";
  // F45 · a MESMA estrutura da conversa do Escritório, com a fonte no lugar
  // do autor — o chip "🌻 INSS" vira selo + nome do cartão
  const linhas = mostra.map(x=>{
    const [em, ...resto] = String(x.chip||"· fonte").split(" ");
    const nosso = !!x.avIni;   // F46 · registro do escritório: avatar e nome do colaborador
    // F111 · quem escreveu aparece SEMPRE com a bolinha da sua cor, marco ou
    // não — é a mesma identidade dos Andamentos do Escritório; o marco fica
    // só na faixa âmbar (pedido do Paulo: "não aparece o P para identificar")
    const identidade = nosso && (temaV10() || !x.marco);   // fora do tema o marco segue com ⭐
    // F139 · no v10 o marco já é o ponto no trilho: a bolinha da fonte mostra
    // de onde veio (ícone desenhado), e a ⭐ fica só para o botão de importante
    // F141 · a bolinha da fonte mostra o símbolo do sistema de onde o registro
    // veio (PJe, e-SAJ, eproc, INSS, e-Sisrec, CNJ); a ⭐ fica só para importante
    const fk = fonteDoItem(x);
    const ofi = temaV10() && !x.and && !nosso ? oficDoItem(k, x) : null;   // uma vez por repintura
    return { q: x.q, em: identidade?esc(x.avIni):(iconeFonte(fk)||(temaV10()?(svgIc(em,12)||em):em)),
      // o DataJud diz em que sistema o processo corre: o nome dele vem primeiro
      rot: nosso?(x.quem?x.quem.split(" ")[0]:resto.join(" ")):(/CNJ/.test(x.chip||"")&&fk&&fk!=="cnj"
        ? `${FONTES_SIS[fk].n} · CNJ` : /PJe/.test(x.chip||"")&&fk ? FONTES_SIS[fk].n : (resto.join(" ")||em)),
      corAv: identidade?x.avCor:null, texto: x.texto, and: x.and, ev: temaV10() ? x.ev : null,
      forte: x.marco, cls: x.resposta?"tl-resposta":"",
      // F190 · o espelho do e-SISREC e do CNJ também vira cartão oficial
      ofic: ofi, gemeo: x.gemeo,   // F236 · o andamento gêmeo dá ao cartão do bloco o "Novo · não lido"
      html: (temaV10() && (x.and ? ehOficial(x.and) : !!ofi)) ? "" : `<span style="margin-left:6px;vertical-align:middle">${segBtnHtml(segRegistrar(k.id, x.texto, x.id||null))}</span>`
        // F86 · quem do escritório já leu o que o robô trouxe: o mesmo ✔ li da
        // aba INSS, agora também no Caso completo (só no tema v10)
        + ((temaV10() && x.and && x.and.origem && x.and.origem!=="app")
          ? (euLi(x.and)
            ? `<span class="tl-lido" title="você já leu">✔ lido</span>`
            : `<button class="btn-mini tl-li" onclick="liNaFicha('${x.and.id}')"
                 title="marcar como lido (sai das 📣 Novidades)">✔ li</button>`)
          : "") };
  });
  return composerNoPainel(k) + `<div class="fatos" style="margin-bottom:12px">
    <div class="fatos-topo">
      ${temaV10()
        ? `<h3 class="cc-conta">${mostra.length}${tudoSoMarcos&&marcos.length?` de ${itens.length}`:""} registros · todas as fontes</h3>`
        : `<h3 style="font-size:14px">📖 Caso completo — ${mostra.length}${tudoSoMarcos&&marcos.length?` de ${itens.length}`:""} registros, todas as fontes</h3>`}
      <span style="margin-left:auto;display:inline-flex;gap:6px">
        ${marcos.length?`<button class="btn-mini" onclick="tudoSoMarcos=!tudoSoMarcos;repintarFicha()"
          title="sentença, acórdão, trânsito, perícia, alvará…">${tudoSoMarcos?"ver tudo":`<i class="cc-ponto"></i> só os marcos (${marcos.length})`}</button>`:""}
        <button class="btn-mini" onclick="copiarCasoCompleto('${k.id}')"
          title="a linha do tempo inteira em texto — para colar numa petição, num e-mail ou numa IA"><span aria-hidden="true">Copiar</span><span class="sr-only">copiar em texto</span></button>
      </span>
    </div>
    ${chipsFiltro}
    ${!mostra.length ? `<p class="meio-sub" style="padding:8px 12px">Nada neste filtro.</p>` : temaV10() ? casoCompletoPorFase(k, linhas, mostra) : tlOficial(linhas)}
    <div class="fatos-pe" style="justify-content:flex-end">
      <span class="meio-sub">${temaV10()?`<i class="cc-ponto"></i> marco do caso`:"fundo âmbar = marco do caso"} · leitura, não edição — cada registro se corrige na aba de origem</span>
    </div>
  </div>`;
}
function copiarCasoCompleto(casoId){
  const k=D.casoPorId.get(casoId); if(!k) return;
  const c=D.cliPorId.get(k.cliente_id)||{};
  const itens=fatosDoCasoTodo(k, (D._andsFicha||[]).filter(a=>a.caso_id===k.id));
  const cab=[`CASO: ${tituloCaso(k)} — ${c.nome||""}`,
    k.especie?`Espécie: ${k.especie}`:"", k.nb?`NB: ${k.nb}`:"",
    k.processo?`Processo: ${k.processo}`:"",
    (k.protocolos||[]).length?`Protocolo(s): ${(k.protocolos||[]).join(", ")}`:"",
    k.der?`DER: ${fmt(k.der)}`:"", `Fase: ${NOME_FASE[k.fase]||k.fase}`,
  ].filter(Boolean).join("\n");
  const corpo=itens.map(x=>`${x.resposta?"      ↳ ":x.marco?"⭐ ":"   "}${fmt((x.q||"").slice(0,10))} [${x.chip.replace(/^\S+\s/,"")}${x.quem?` · ${x.quem}`:""}] ${x.texto}`).join("\n");
  copiar(`${cab}\n\n${corpo}`, "Caso completo copiado 📖 — cole onde precisar");
}

// 🖥 Recurso administrativo no CRPS (e-Recursos). O robô (robo-crps) preenche
// casos.crps; aqui a gente só mostra, no mesmo espírito do painel do CNJ:
// o oficial em quadro próprio, sem misturar com os andamentos do escritório.
// um caso pode ter VÁRIOS recursos (embargos, recurso especial). Estes dois
// ajudantes lêem tanto o formato novo (listas) quanto o antigo (um só).
function crpsNups(k){
  const arr = Array.isArray(k.crps_nups) ? k.crps_nups : [];
  const nups = arr.map(n=>String(n).replace(/\D/g,"")).filter(Boolean);
  const unico = (k.crps_nup||"").replace(/\D/g,"");
  if(unico && !nups.includes(unico)) nups.push(unico);
  return [...new Set(nups)];
}
function crpsBlocos(k){
  return Array.isArray(k.crps) ? k.crps : (k.crps ? [k.crps] : []);
}
function crpsTotalEventos(k){
  return crpsBlocos(k).reduce((s,b)=>s+((b.eventos||[]).length),0);
}

// o que merece negrito no recurso: só o que DECIDE — acórdão e decisão
// monocrática. O resto é tramitação, e negrito em tudo é o mesmo que negrito
// em nada.
// o tradutor já marca tipo:"decisao" no que sai de acórdão ou monocrática
// (provimento, negativa, não conhecer); o texto cru serve de reforço
// F236 · só o que o tradutor marcou como decisão: o envio para cumprir, o acórdão cumprido e a análise CITAM o
// acórdão, mas não decidem (o texto cru bastava e eles ganhavam negrito e selo); o texto ainda vale para o evento
// antigo, gravado sem tipo
const decideOCaso = e => e.tipo==="decisao"
  || (!e.tipo && /ac[óo]rd[ãa]o|monocr[áa]tic/i.test(`${e.resumo||""} ${e.bruto||""}`));

// ══════════════════════════════════════════════════════════════════════════
// F236 · O RECURSO NO CRPS LIDO PELO QUE OS MOVIMENTOS DIZEM. O bloco gravado com as regras velhas se relê pelo
// status cru, a decisão de verdade acerta o caso, e a alçada, a pauta, a diligência e o cumprimento viram avisos
// no quadro do recurso e propostas de um clique. Regimento Interno do CRPS (Portaria MPS 125/2026), conferido no
// MCP do CRPS em 17.10.2026: arts. 71, § 1º (prova até a pauta), 75 e 76 (diligência), 77 e 78 (prazos), 80, § 1º
// (ciência), 81 (sustentação oral), 85, § 2º, 86 (ação com o mesmo objeto), 89 (alçada) e 117 (cumprimento);
// Portaria DIRBEN/INSS 996/2022, art. 15 (30 dias do recebimento para o INSS cumprir); LOAS, art. 20, § 4º
// ══════════════════════════════════════════════════════════════════════════
const qCrps = e => CRPS.dataParaISO(e.data) || String(e.data||"");
// F613 · a decisão do CRPS continua sendo a situação até o recurso reabrir (recurso novo, pauta, perícia, diligência ou
// nova entrada no CRPS); o andamento de cumprimento depois dela ("Requerimento protocolado") não traz de volta a mora de 365 dias
const RX_ENTRADA_CRPS = /\bpara CRPS\b|\(CRPS para/i;
const crpsReaberto = (evs, dec) => evs.slice(0, evs.indexOf(dec)).some(e=>["recurso","pauta","pericia","diligencia"].includes(e.tipo) || RX_ENTRADA_CRPS.test(e.bruto||""));
const decisaoAtualCrps = (evs, dec) => !!dec && !crpsReaberto(evs, dec);
const entradaCrps = (t, dec) => (t.eventos||[]).filter(e=>RX_ENTRADA_CRPS.test(e.bruto||"") && (!dec || qCrps(e)>qCrps(dec))).sort(porDataDesc).pop();
const porDataDesc = (a, b) => qCrps(a)<qCrps(b) ? 1 : qCrps(a)>qCrps(b) ? -1 : 0;
const CRPS_PEDE_ACAO = new Set(["diligencia","pauta","decisao"]);
// prazo administrativo em dias corridos, prorrogado ao dia útil seguinte (Regimento do CRPS, art. 78, § 4º)
const prazoAdm = (de, n) => contarPrazo(de, {n, uteis:false});
// n dias úteis ANTES de uma data, pulando fim de semana e feriado (os nacionais e os de Configurações)
function uteisAntes(iso, n){ let d = iso, c = 0; while(c < n){ d = somaDias(d, -1); if(ehDiaUtil(d)) c++; } return d; }
// F292 · quantos dias úteis faltam de hoje (fora) até a data (dentro); para em 10, que é o que o aviso precisa
function uteisAte(iso){ let d = hoje(), c = 0; while(d < iso && c < 10){ d = somaDias(d, 1); if(ehDiaUtil(d)) c++; } return c; }

// o bloco gravado se relê (CRPS.rerotular só troca o que uma regra reconhece) e, só em memória, o caso acompanha
// a última decisão de verdade do recurso, como a importação nova grava: a data da decisão que o envio para cumprir
// regravou volta à do acórdão, e o provimento vale resultado deferido (o "Recorrer até" se desliga)
function normalizarCrps(k){
  const bl = crpsBlocos(k); if(!bl.length) return;
  for(const b of bl) if((b.eventos||[]).length) CRPS.rerotular(b);
  const evs = bl.flatMap(b=>b.eventos||[]);
  const dec = evs.filter(e=>e.tipo==="decisao" && isoCrps(e.data)).sort(porDataDesc)[0];
  if(!dec) return;
  const d = isoCrps(dec.data);
  if(k.decisao_em > d && !evs.some(e=>e.tipo==="decisao" && isoCrps(e.data)===k.decisao_em)
     && evs.some(e=>isoCrps(e.data)===k.decisao_em && /ac[óo]rd[ãa]o/i.test(e.bruto||""))) k.decisao_em = d;
  const nossa = (CRPS.orgaoJulgador(dec.bruto||"")||{}).instancia!==2 || !!k.re_protocolado_em;
  if(CRPS.efeitoDecisao(dec)==="favoravel" && nossa && k.resultado!=="deferido" && (!k.decisao_em || k.decisao_em<=d))
    k.resultado = "deferido";
}
// o andamento do e-Recursos e o evento do bloco que ele repete (origem_id = "<nup>|<data ISO>|<status cru>")
function eventoDoAndCrps(a, k){
  const s = String(a.origem_id||""), i = s.indexOf("|"); if(i<0) return null;
  const b = crpsBlocos(k).find(x=>soDig(x.nup)===soDig(s.slice(0, i)));
  return b ? (b.eventos||[]).find(e=>CRPS.chaveEvento(e)===s.slice(i+1)) || null : null;
}
// o texto gravado com a regra velha ("Acórdão publicado" de uma negativa, o aviso de recurso especial num recurso
// ganho) se reescreve, só na tela, pelo evento relido; o que não tem o cabeçalho do robô fica como está
function retraduzirCrps(ands){
  for(const a of (ands||[])){
    if(a.origem!=="crps" || !/^🖥\s*CRPS/.test(a.texto||"")) continue;
    const k = D.casoPorId && D.casoPorId.get(a.caso_id), e = k && eventoDoAndCrps(a, k);
    if(e) a.texto = CRPS.comentarioDoEvento(e, {alcada: alcadaJunta(k)});
  }
}
// ALÇADA DA JUNTA: matéria só médica acaba na Junta, o acórdão é definitivo e não cabe recurso especial (art. 89,
// §§ 2º e 3º): incapacidade, auxílio-acidente e o BPC da pessoa com deficiência pela deficiência. "certa" quando o
// acórdão se diz de alçada ou a Junta ouviu a Perícia Médica Federal (§ 4º); "provavel" pela espécie, salvo motivo
// que não é médico (qualidade de segurado, carência, renda), que leva ao recurso especial
function alcadaJunta(k){
  if(!k) return null;
  const evs = crpsBlocos(k).flatMap(b=>b.eventos||[]);
  const res = evs.flatMap(e=>(e.arquivos||[]).flatMap(a=>(a.resumo && a.resumo.linhas)||[])).join(" ");
  if(/n[ãa]o\s+(?:se\s+trata\s+de|[ée])\s+(?:mat[ée]ria\s+de\s+)?al[çc]ada/i.test(res)) return null;
  if(/al[çc]ada|mat[ée]ria (?:exclusivamente )?m[ée]dica/i.test(res)) return "certa";
  const esp = soDig(k.especie);
  if(!/^(31|32|36|87|91|92|94)$/.test(esp)
     && !(!esp && /incapacidade|aux[íi]lio[- ](?:doen|acidente)|invalidez/i.test(k.beneficio||""))) return null;
  const mot = (D._andsFicha||[]).filter(a=>a.caso_id===k.id && /indefer|cessa[çd]|n[ãa]o constat|negad/i.test(a.texto||""))
    .map(a=>a.texto).join(" ");
  if(/qualidade de segurad|car[êe]ncia|renda|contribui[çc]/i.test(mot)) return null;
  if(evs.some(e=>/perito|\bPMF\b|per[íi]cia m[ée]dica/i.test(e.bruto||""))) return "certa";
  if(esp==="87" && !/defici|impedimento|per[íi]cia|avalia[çc][ãa]o/i.test(mot)) return null;
  return "provavel";
}
// a sessão de julgamento que vale agora, de todos os recursos do caso: a última inclusão em pauta, com a data da
// remarcação que veio depois; cancelada, retirada, convertida em diligência ou já decidida, nenhuma.
// F236 · sessoesCrps dá a de CADA recurso: o movimento de pauta de um recurso não se mede pela sessão de outro
function sessoesCrps(k){
  const out = [];
  for(const b of crpsBlocos(k||{})){
    let s = null;
    for(const e of [...(b.eventos||[])].sort((x,y)=>porDataDesc(y, x))){
      const ss = CRPS.sessaoDoStatus(e.bruto);
      if(ss && ss.acao==="cancelada") s = null;
      else if(ss && ss.acao==="remarcada") s = {data:ss.data, hora:ss.hora, de:ss.de || (s && s.data) || null};
      else if(ss) s = {data:ss.data, hora:ss.hora, de:null};
      else if(s && (e.tipo==="decisao" || e.tipo==="diligencia")) s = null;
    }
    if(s){
      const o = CRPS.orgaoJulgador(b.orgao_atual||"");
      out.push({...s, nup:b.nup, orgao: o && o.instancia ? o.nome : ""});
    }
  }
  return out;
}
function sessaoCrps(k){
  const melhor = sessoesCrps(k).reduce((m, s)=>!m || s.data > m.data ? s : m, null);
  if(melhor) melhor.sustentacaoAte = uteisAntes(melhor.data, 3);
  return melhor;
}
// F236 · o que o movimento marca na agenda. No e-Recursos vale só a sessão que vale de um dos recursos do caso: a pauta
// remarcada, cancelada, convertida em diligência ou já julgada não se propõe mais (a lista 🩺, as Novidades, o agendar
// em lote, os Prazos e a aba Perícias propunham a sessão antiga ao lado da nova, e a antiga ficava como PRÓXIMO)
function eventoDoMovimento(a, ev = a && eventoNoTexto(a.texto)){
  if(!ev || !a || a.origem!=="crps" || ev.tipo!=="Julgamento") return ev || null;
  const k = D.casoPorId && D.casoPorId.get(a.caso_id); if(!k || !crpsBlocos(k).length) return ev;
  const sv = sessoesCrps(k).find(s=>s.data===ev.data);
  return sv ? {...ev, hora: sv.hora || ev.hora} : null;
}
// o movimento antigo da pauta traz a data de antes da remarcação: o julgamento se agenda na sessão que vale. Só a
// data que é de uma sessão do e-Recursos deste caso (a antiga ou a nova) anda; a do julgamento judicial fica
function sessaoVigente(ev, casoId){
  if(!ev || ev.tipo!=="Julgamento") return ev;
  const k = D.casoPorId.get(casoId) || {}, sv = sessaoCrps(k);
  const doCrps = crpsBlocos(k).some(b=>(b.eventos||[]).some(e=>{ const ss = CRPS.sessaoDoStatus(e.bruto); return ss && (ss.data===ev.data || ss.de===ev.data); }));
  return sv && doCrps && sv.data>=hoje() ? {...ev, data:sv.data, hora:sv.hora||ev.hora} : ev;
}
const textoConferirJulgamento = (data, hora) => `⚖️ Julgamento agendado para ${fmt(data)} às ${hora}. Verificar o resultado no dia seguinte.`;
const textoSustentacao = data => `🎙 Sustentação oral no julgamento de ${fmt(data)}: se as razões do recurso não a pediram, pedir pela Fala.BR até ${fmt(uteisAntes(data, 3))} (3 dias úteis antes da sessão, Regimento do CRPS, art. 81, III), com a procuração no recurso até a mesma data (§ 3º); oral, memoriais ou vídeo de até 8 minutos (§ 1º).`;
const sustentacaoCriada = (casoId, data) => (D._andsFicha||[]).some(a=>a.caso_id===casoId && !a.excluir
  && String(a.texto||"").startsWith(`🎙 Sustentação oral no julgamento de ${fmt(data)}`));
// a tarefa da sustentação oral, com a data limite do Regimento: é proposta, num clique, e quem decide se a pede é
// o escritório; vai para o admin, como a conferência do resultado (F51)
async function tarefaSustentacao(casoId, data, andId){
  const ate = uteisAntes(data, 3); if(ate < hoje()) return null;
  const [novo] = await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify({caso_id:casoId, autor_id:eu.id, origem:"app", publico:false, texto:textoSustentacao(data),
      ...(andId?{responde_a:andId}:{})})}) || [];
  if(novo) tarefaNaMemoria(await criarTarefa({andamento_id:novo.id, caso_id:casoId, colaborador_id:colAdmin().id,
    atribuido_por:eu.id, lembrar_em:ate}));
  return ate;
}
async function propostaSustentacao(casoId){
  const s = sessaoCrps(D.casoPorId.get(casoId)); if(!s) return;
  const ate = await tarefaSustentacao(casoId, s.data, null).catch(e=>{ aviso("Não criou: "+String(e.message||e).slice(0,90)); return null; });
  if(ate){ plim(); aviso(`🎙 Tarefa da sustentação oral até ${fmt(ate)}`, false); }
  if(clienteAberto) abrirFicha(clienteAberto);
}
// o clique do quadro do recurso e do cartão da pauta: agenda a sessão que vale pelo caminho de sempre
// (aplicarPericia: o julgamento na agenda e a tarefa de conferir o resultado no dia útil seguinte)
async function agendarSessaoCrps(casoId){
  const k = D.casoPorId.get(casoId), s = k && sessaoCrps(k);
  if(!s || s.data < hoje()) return aviso("Não há sessão futura no e-Recursos para agendar");
  const r = await aplicarPericia({casoId, texto:`Sessão de julgamento marcada para ${fmtBarra(s.data)} ${s.hora||"09:00"}`, andId:null,
      local: s.orgao ? `${s.orgao} — sessão de julgamento` : null})
    .catch(e=>{ aviso("Não consegui agendar: "+String(e.message||e).slice(0,90)); return null; });
  if(r==="já agendada") aviso("⚖️ O julgamento já está na agenda", false);
  else if(r){ plim(); aviso(`⚖️ Julgamento ${r}`, false); }
  montarSidebar(); if(clienteAberto) abrirFicha(clienteAberto); else render();
}
// a remarcação (De → Para) leva o julgamento que já estava na agenda para a data nova, com as tarefas que nasceram
// dele (conferir o resultado, sustentação oral); o cancelamento cancela o julgamento futuro. Sem nada agendado, não
// cria nada: o quadro do recurso propõe
async function sessaoNaAgenda(casoId, ss){
  const julgs = (D.eventos||[]).filter(e=>e.caso_id===casoId && e.status==="agendada" && /julgament/i.test(e.tipo||"") && dataSP(e.data_hora)>=hoje());
  const patchEv = (e, campos) => api(`/rest/v1/eventos?id=eq.${e.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify(campos)}).then(()=>Object.assign(e, campos));
  if(ss.acao==="cancelada"){ for(const e of julgs) await patchEv(e, {status:"cancelada"}); return; }
  const e = ss.de && ss.data>=hoje() && julgs.find(x=>dataSP(x.data_hora)===ss.de); if(!e) return;
  const hora = ss.hora || horaSP(e.data_hora);
  await patchEv(e, {data_hora:`${ss.data}T${hora}:00-03:00`});
  const ands = await api(`/rest/v1/andamentos?select=id,texto&caso_id=eq.${casoId}&texto=like.*${fmt(ss.de)}*`).catch(()=>[]) || [];
  for(const a of ands){
    const conf = /^⚖️ Julgamento agendado/.test(a.texto||""), sust = /^🎙 Sustentação oral/.test(a.texto||"");
    if(!conf && !sust) continue;
    const texto = `${conf ? textoConferirJulgamento(ss.data, hora) : textoSustentacao(ss.data)} (Sessão remarcada; era ${fmt(ss.de)}.)`;
    await api(`/rest/v1/andamentos?id=eq.${a.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({texto})});
    const dia = conf ? proxDiaUtil(somaDias(ss.data, 1)) : uteisAntes(ss.data, 3);
    for(const t of (D.tarefasPorCaso.get(casoId)||[]).filter(t=>t.andamento_id===a.id && !t.concluida_em))
      await api(`/rest/v1/andamento_tarefas?id=eq.${t.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({lembrar_em:dia})}).then(()=>{ t.lembrar_em = dia; });
  }
}
// o julgamento já na agenda em outra data que a da sessão que vale (remarcação de antes desta versão): um clique o
// leva para a data nova, com as tarefas
async function levarJulgamentoCrps(casoId, de){
  const s = sessaoCrps(D.casoPorId.get(casoId)); if(!s) return;
  await sessaoNaAgenda(casoId, {acao:"remarcada", data:s.data, hora:s.hora, de}).catch(e=>aviso("Não consegui: "+String(e.message||e).slice(0,90)));
  aviso(`⚖️ Julgamento levado para ${fmtBarra(s.data)}`, false);
  if(clienteAberto) abrirFicha(clienteAberto);
}

// O QUE O RECURSO PEDE AGORA, uma linha por assunto, embaixo da situação: o próximo passo de cada estado, os prazos
// do Regimento e os avisos (alçada, pauta e sustentação oral, diligência, cumprimento do acórdão, BPC acumulado)
function passosDoRecurso(k, t){
  const evs = (t.eventos||[]).filter(e=>!["ruido","ciencia"].includes(e.tipo)).sort(porDataDesc);
  const ult = evs[0]; if(!ult || !k || !k.cliente_id) return "";
  const L = [], dia = e => fmtBarra(isoCrps(e.data)), alc = alcadaJunta(k), v10 = temaV10();
  const dec = evs.find(e=>e.tipo==="decisao"), decAgora = decisaoAtualCrps(evs, dec);
  const s = decAgora ? null : sessaoCrps(k);
  const og = CRPS.orgaoJulgador(t.orgao_atual||""), org = og && og.instancia ? og.nome : "";   // "14ª JR" → "14ª Junta de Recursos"
  const esp = esc(k.especie || "Benefício por incapacidade");
  const pmf = evs.find(e=>e.tipo==="pericia");
  const aguardaPmf = pmf && /^Aguardando/.test(pmf.resumo||"")
    && !evs.slice(0, evs.indexOf(pmf)).some(e=>["decisao","pauta","diligencia"].includes(e.tipo));
  if(decAgora){
    const ef = CRPS.efeitoDecisao(dec), inst = (CRPS.orgaoJulgador(dec.bruto||"")||{}).instancia, dd = isoCrps(dec.data);
    if(inst===2) L.push(`Decisão de Câmara: fim da via administrativa${ef==="favoravel" ? "" : "; se contrária, o caminho é a ação judicial"}.`);
    else if(ef==="favoravel"){
      const cump = evs.find(e=>e.tipo==="cumprimento" && qCrps(e)>=qCrps(dec)), de = cump ? isoCrps(cump.data) : dd;
      if(cump && /cumprido/i.test(cump.resumo||"")) L.push(`O INSS informou o cumprimento do acórdão em ${dia(cump)}: conferir no Meu INSS a implantação e o pagamento dos atrasados.`);
      else L.push(`O INSS deve cumprir o acórdão em 30 dias do recebimento do processo (Portaria DIRBEN/INSS 996/2022, art. 15): até ${fmtBarra(prazoAdm(de, 30))}${cump ? "" : ", contados do acórdão enquanto o envio ao INSS não aparece"}; e no máximo em 60 dias da disponibilização do acórdão (Regimento do CRPS, art. 117, § 1º): até ${fmtBarra(prazoAdm(dd, 60))}. Vencido, cobrar pela Ouvidoria ou por mandado de segurança.`);
      L.push(alc==="certa" ? "Matéria de alçada da Junta: a decisão é definitiva, e o INSS também não recorre (art. 89, §§ 2º e 3º)."
        : "O INSS ainda pode recorrer à Câmara em 30 dias do recebimento (art. 77, § 2º), salvo matéria de alçada (art. 89, § 3º).");
    } else if(ef==="desfavoravel" || ef==="parcial"){
      if(alc==="certa") L.push("Matéria médica: a decisão da Junta é definitiva, sem recurso especial (alçada, Regimento do CRPS, art. 89, §§ 2º e 3º); o caminho é a ação judicial (JEF).");
      else {
        const ate = recorrerAte(k) || prazoAdm(dd, 30);
        L.push(`${alc ? `${esp}: se a decisão se fundou só em matéria médica, é definitiva (alçada, art. 89, § 3º) e o caminho é a ação no JEF; senão, cabe` : "Cabe"} recurso especial à Câmara de Julgamento em 30 dias da ciência (Regimento do CRPS, art. 77): até ${fmtBarra(ate)}, contados da decisão (a conta segura), ou ação judicial. Ajuizar com o mesmo objeto enquanto o recurso corre é desistir dele (art. 86).`);
        const not = (t.eventos||[]).filter(e=>e.tipo==="ciencia" && /^Notifica/.test(e.resumo||"") && qCrps(e)>=qCrps(dec)).sort(porDataDesc).pop();
        if(not) L.push(`Notificação eletrônica em ${dia(not)}: a ciência é na consulta ao processo ou 5 dias depois da emissão (art. 80, § 1º, I e II); contar da decisão não deixa o prazo passar.`);
      }
    } else if(ef==="embargos") L.push("Embargos julgados: confira no acórdão se o resultado mudou.");
  } else if(ult.tipo==="diligencia"){
    let i = 0; while(i<evs.length && evs[i].tipo==="diligencia") i++;
    L.push(`Em diligência desde ${dia(evs[i-1])}: ${esc(ult.resumo)}.${k.exigencia_prazo ? ` A resposta vai até ${fmtBarra(k.exigencia_prazo)} (o PAT trouxe o pedido como "Exigência do INSS").` : ""}`);
    // F236 · o que a Junta pediu, inteiro (o comentário do PAT; o campo da exigência guarda só o começo)
    if(k.exigencia_prazo && pedidoDaDiligencia(k)) L.push(`O que foi pedido: ${esc(pedidoDaDiligencia(k))}`);
    L.push("Sem resposta, o recurso é julgado com o que está nos autos (Regimento do CRPS, art. 85, § 2º) e não cabe nova diligência sobre o mesmo ponto (art. 75, § 12). O tempo em diligência não conta nos 365 dias para julgar (art. 77, § 6º); devolvida, a Junta julga em 60 dias do recebimento pelo conselheiro (art. 77, § 7º).");
    const f = D._ficha || {};
    if(f.cliId===k.cliente_id && !(f.creds||[]).some(x=>x.tipo==="meu_inss"))
      L.push("A resposta vai pelo Meu INSS e a ficha não tem a senha do gov.br: pedir à cliente junto com os papéis, ou protocolar pelo acesso do escritório.");
  } else if(s && s.data>=hoje()){
    const ag = evJaAgendado(k.id, s.data);
    const outro = !ag && (D.eventos||[]).find(e=>e.caso_id===k.id && e.status==="agendada" && /julgament/i.test(e.tipo||"") && dataSP(e.data_hora)>=hoje());
    const bt = (rot, js, forte, tit) => `<button class="${v10 ? `tl-bt${forte ? " forte" : ""}` : `btn-mini${forte ? " forte" : ""}`}" onclick="${js}" title="${esc(tit)}">${rot}</button>`;
    L.push(`Sessão de julgamento em ${fmtBarra(s.data)} às ${esc(s.hora||"")}${s.de ? ` (remarcada; era ${fmtBarra(s.de)})` : ""}${org ? `, ${esc(org)}` : ""}. ${ag ? "✔ Na agenda."
      : outro ? `A agenda tem o julgamento em ${fmtBarra(dataSP(outro.data_hora))}: ${bt(`Levar para ${fmtBarra(s.data)}`, `levarJulgamentoCrps('${k.id}','${dataSP(outro.data_hora)}')`, true, "muda a data do julgamento na agenda e as tarefas dele")}`
      : bt("Agendar julgamento com aviso", `agendarSessaoCrps('${k.id}')`, true, "cria o julgamento na agenda e a tarefa de conferir o resultado no dia útil seguinte")}`);
    L.push(s.sustentacaoAte>=hoje()
      ? `Sustentação oral: se as razões não a pediram, pedir pela Fala.BR até ${fmtBarra(s.sustentacaoAte)} (3 dias úteis antes da sessão, Regimento do CRPS, art. 81, III), com a procuração no recurso até a mesma data (§ 3º); oral, memoriais escritos ou vídeo de até 8 minutos (§ 1º). ${sustentacaoCriada(k.id, s.data) ? "✔ Tarefa criada." : bt("＋ tarefa da sustentação oral", `propostaSustentacao('${k.id}')`, false, "cria a tarefa de decidir e pedir a sustentação oral até a data limite; quem decide se faz é o escritório")}`
      : `O pedido de sustentação oral pela Fala.BR ia até ${fmtBarra(s.sustentacaoAte)} (3 dias úteis antes da sessão, art. 81, III).`);
    L.push("Incluído em pauta: prova documental e alegações só até a inclusão em pauta (Regimento do CRPS, art. 71, § 1º); daqui em diante, memoriais ou sustentação.");
  } else if(s) L.push(`A sessão de ${fmtBarra(s.data)} já passou: conferir o resultado no e-Recursos.`);
  else if(aguardaPmf){
    const ate = prazoAdm(isoCrps(pmf.data), 30);
    L.push(`Aguardando o parecer da Perícia Médica Federal desde ${dia(pmf)} (Regimento do CRPS, art. 89, § 4º), que vincula a Junta se fundamentado (§ 5º); o órgão tem 30 dias, prorrogáveis por igual prazo (art. 75, § 6º, I): até ${fmtBarra(ate)}${ate<hoje() ? ", e passou: sem resposta nem prorrogação, cabe a Ouvidoria (art. 76)" : ""}.`);
  } else {
    const r = ult.resumo||"";
    const prox = /^Aguardando distribuição/.test(r)
      ? `Próximo: a distribuição ao relator${org ? ` na ${esc(org)}` : ""}${alc ? "; por ser matéria médica, a Junta ouve antes a Perícia Médica Federal (art. 89, § 4º), cujo parecer fundamentado vincula (§ 5º)" : ""}. Nada a cumprir agora.`
      : /^(?:Re)?[Dd]istribuído/.test(r) ? "Com o relator: o próximo passo é a pauta ou uma diligência. Nada a cumprir agora."
      : /^Contrarrazões/.test(r) ? "Contrarrazões do INSS juntadas: são leitura e não abrem prazo para o escritório."
      : "";
    if(prox) L.push(prox);
    L.push(/^Pronto para entrar em pauta/.test(r)
      ? "Pronto para entrar em pauta: documento novo e alegações só até a inclusão em pauta (Regimento do CRPS, art. 71, § 1º); juntar agora o que faltar."
      : "Documento novo e alegações entram até a inclusão em pauta (Regimento do CRPS, art. 71, § 1º).");
  }
  if(!decAgora){
    const ent = entradaCrps(t, dec);
    if(ent){
      const lim = somaDias(isoCrps(ent.data), 365);
      L.push(`O CRPS tem 365 dias da entrada (${dia(ent)}) para julgar, sem contar o tempo em diligência (Regimento do CRPS, art. 77, §§ 5º e 6º): por volta de ${fmtBarra(lim)}${lim<hoje() ? ", e passou: cabe cobrar pela Ouvidoria ou mandado de segurança pela demora" : ""}.`);
    }
    if(alc) L.push(alc==="certa"
      ? "Matéria médica: o acórdão da Junta será definitivo, sem recurso especial (alçada exclusiva da Junta, Regimento do CRPS, art. 89, §§ 2º e 3º, I). Se negar, o caminho é a ação no JEF."
      : `${esp}: se a Junta decidir só a matéria médica, o acórdão será definitivo, sem recurso especial (alçada, Regimento do CRPS, art. 89, § 3º, I); se negar, o caminho é a ação no JEF.`);
  }
  if(/^B?8[78]\b/i.test(String(k.especie||""))){
    const outros = (D.casosDoCliente.get(k.cliente_id)||[]).filter(x=>x.id!==k.id && !["encerrado","aposentadoria_futura"].includes(x.fase)
      && !ehPreCaso(x) && x.especie && !/^B?8[78]\b/i.test(String(x.especie)));
    if(outros.length) L.push(`O BPC não se acumula com outro benefício da seguridade (LOAS, art. 20, § 4º): esta pessoa tem também ${outros.map(x=>`${esc(x.especie)} (${esc(NOME_FASE[x.fase]||x.fase)})`).join(" e ")}. Decidir com ela${s && s.data>=hoje() ? `, antes da sessão de ${fmtBarra(s.data)},` : ""} o que este recurso ainda busca; benefício judicial incompatível com a decisão do CRPS pode impedir o cumprimento dela (Regimento do CRPS, art. 117, § 4º).`);
  }
  return L.length ? `<ul class="crps-passos">${L.map(x=>`<li>${x}</li>`).join("")}</ul>` : "";
}

// a situação do recurso na língua do cliente (o "Copiar situação para o cliente" e a mensagem da decisão)
function fraseClienteCrps(k, t){
  const evs = (t.eventos||[]).filter(e=>!["ruido","ciencia"].includes(e.tipo)).sort(porDataDesc);
  const ult = evs[0], dec = evs.find(e=>e.tipo==="decisao");
  const og = CRPS.orgaoJulgador(t.orgao_atual||""), onde = og && og.instancia ? og.nome : t.orgao_atual ? tituloOrgao(t.orgao_atual) : "";
  if(!ult) return `${String(t.status||"em andamento").replace(/^\S+\s/,"")}${onde ? ` (${onde})` : ""}.`;
  if(dec && (ult===dec || ult.tipo==="cumprimento")) return fraseDecisaoCrps(k, dec, ult.tipo==="cumprimento" ? ult : null);
  const s = sessaoCrps(k);
  if(s && s.data>=hoje() && ult.tipo==="pauta") return `a sessão de julgamento do seu recurso está marcada para ${fmtBarra(s.data)}, às ${s.hora}${s.de ? ` (a data mudou; antes era ${fmtBarra(s.de)})` : ""}${s.orgao ? `, na ${s.orgao}` : ""}.`;
  if(ult.tipo==="diligencia") return `o julgador pediu mais documentos (diligência)${k.exigencia_prazo ? `, com prazo até ${fmtBarra(k.exigencia_prazo)}` : ""}; vamos combinar com você o que juntar.`;
  if(/^Aguardando distribuição/.test(ult.resumo||"")) return `o recurso está${onde ? ` na ${onde}` : ""} aguardando a distribuição ao relator; por ora não há nada a fazer.`;
  return `${String(ult.resumo||"").replace(/\.$/,"")}${onde ? ` (${onde})` : ""}.`;
}
// a decisão do CRPS explicada ao cliente: o resultado, quem decidiu, a data e o que vem (cumprir, recorrer, Justiça)
function fraseDecisaoCrps(k, dec, cump){
  const ef = CRPS.efeitoDecisao(dec), org = CRPS.orgaoJulgador(dec.bruto||"") || {}, d = fmtBarra(isoCrps(dec.data));
  const por = org.instancia ? `pela ${org.nome}` : "pelo Conselho de Recursos";
  if(ef==="favoravel") return cump && /cumprido/i.test(cump.resumo||"")
    ? `o seu recurso foi provido ${por} em ${d}, e o INSS informou que já cumpriu a decisão. Confira o benefício e os pagamentos; qualquer diferença, nos avise.`
    : `o seu recurso foi provido ${por} em ${d}: o INSS agora precisa cumprir a decisão${cump ? " (o processo já foi enviado a ele)" : ""}. Acompanhamos e avisamos quando o benefício for implantado ou reativado.`;
  if(ef==="parcial") return `o seu recurso foi provido em parte ${por} em ${d}. Vamos explicar o que foi concedido e o que ainda dá para pedir.`;
  if(ef==="desfavoravel"){
    const neg = `o seu recurso foi negado ${por} em ${d}.`;
    if(org.instancia===2) return `${neg} A via no INSS terminou; vamos conversar sobre levar o caso à Justiça.`;
    const alc = alcadaJunta(k), ate = recorrerAte(k) || prazoAdm(isoCrps(dec.data), 30);
    if(alc==="certa") return `${neg} Por ser matéria médica, essa decisão é definitiva no INSS; o caminho agora é uma ação na Justiça, e vamos conversar sobre ela.`;
    if(alc) return `${neg} Vamos avaliar com você o próximo passo: uma ação na Justiça ou, se couber, o recurso à Câmara de Julgamento até ${fmtBarra(ate)}.`;
    return `${neg} Ainda dá para recorrer à Câmara de Julgamento até ${fmtBarra(ate)} ou entrar com uma ação na Justiça; vamos conversar sobre o melhor caminho e os documentos que podem ajudar.`;
  }
  return `saiu a decisão do seu recurso (${d}): ${String(dec.resumo||"").replace(/\s+/g," ").replace(/\s*\((?:\d{1,2}ª\s*)?(?:Junta|Câmara|CRPS)[^)]*\)\s*$/,"")}. Vamos explicar o resultado.`;
}
function msgDecisaoCrps(k, e){
  const c = D.cliPorId.get(k.cliente_id) || {};
  return `Olá, ${(c.nome||"").split(" ")[0]}! Saiu o resultado do seu recurso no Conselho de Recursos: ${fraseDecisaoCrps(k, e, null)} Qualquer dúvida, estamos à disposição. Escritório Tercini.`;
}
// a pauta ao cliente diz a sessão que vale, mesmo do movimento antigo (a remarcação muda a data)
function msgSessaoCrps(k){
  const s = sessaoCrps(k), c = D.cliPorId.get(k.cliente_id) || {};
  return s && s.data>=hoje() ? `Olá, ${(c.nome||"").split(" ")[0]}! A sessão de julgamento do seu recurso no Conselho de Recursos está marcada para ${fmtBarra(s.data)}, às ${s.hora}${s.de ? ` (a data mudou; antes era ${fmtBarra(s.de)})` : ""}. Não é preciso comparecer; avisamos o resultado. Escritório Tercini.` : "";
}
// a "Mensagem ao cliente" do cartão do bloco: a decisão explicada, a sessão que vale; o resto, o movimento traduzido
function msgCrpsEv(casoId, nup, i){
  const k = D.casoPorId.get(casoId), b = k && crpsBlocos(k).find(x=>soDig(x.nup)===soDig(nup)), e = b && (b.eventos||[])[i];
  if(!e) return;
  if(e.tipo==="decisao") return msgCliente(casoId, "", "", "", msgDecisaoCrps(k, e));
  if(e.tipo==="pauta" && msgSessaoCrps(k)) return msgCliente(casoId, "", "", "", msgSessaoCrps(k));
  msgCliente(casoId, "recurso no Conselho de Recursos", String(e.resumo||e.bruto||"").replace(/\s*\((?:\d{1,2}ª\s*)?(?:Junta|Câmara|CRPS)[^)]*\)\s*$/,"").replace(/\s*\(ciência[^)]*\)/, ""), isoCrps(e.data));
}

// o quadro de UM recurso: apresentado como os andamentos do escritório —
// mesma zebra, mesma coluna de data à esquerda
// o resumo do que a decisão decidiu — o resumidor lê o PDF e escreve estas
// linhas. Fica embaixo do arquivo, em cor própria, e sempre diz que é
// automático: quem lê tem de saber que pode conferir no acórdão ao lado.
function caixaResumo(casoId, nup, a){
  const r = a.resumo, linhas = (r && r.linhas) || [];
  if(!linhas.length) return "";
  const marca = String(a.id || a.nome), ref = `'${casoId}','${esc(nup||"")}','${esc(marca)}'`;
  const quem = r.conferido_por && D.colPorId.get(r.conferido_por);
  const mao = r.origem === "curado";
  const selo = quem ? `✓ conferido por ${esc(quem.inicial||quem.nome||"")}`
    : mao ? "escrito à mão"
    : "resumo automático · confira no acórdão";
  return `<div class="crps-res${quem||mao?" ok":""}" id="res-${esc(marca)}">
    <div class="crps-res-cab">${selo}
      <span class="crps-res-pe">
        <button class="crps-res-bt" onclick="editarResumo(${ref})">corrigir</button>
        ${quem?"":`<button class="crps-res-bt" onclick="conferirResumo(${ref})">conferido</button>`}
      </span></div>
    <ul>${linhas.map(l=>`<li>${esc(l)}</li>`).join("")}</ul>
  </div>`;
}

// QUEM julgou. A Junta de Recursos é a 1ª instância do CRPS: perdeu ali,
// ainda cabe Recurso Especial às Câmaras em 30 dias. A Câmara de Julgamento é
// a 2ª: perdeu ali, a via administrativa acabou e o assunto vira ação
// judicial. Quem lê a ficha precisa saber disso sem abrir o acórdão.
//
// O marcar_orgao.js lê o PDF e grava a.orgao — é a fonte boa. Enquanto ele
// não roda, a sigla do próprio status do e-Recursos ("25ª JR/3080/2025")
// serve: mesma leitura do orgaoJulgador() do robô, na versão mínima.
function orgaoDaDecisao(e, a){
  if(a && a.orgao && a.orgao.instancia) return a.orgao;
  const t = String((e&&e.bruto)||"");
  const caj = t.match(/(\d{1,2})\s*ª?\s*(?:CAJ\b|C[âa]mara)/i);
  if(caj) return {nome:`${+caj[1]}ª Câmara de Julgamento`, instancia:2};
  const jr = t.match(/(\d{1,2})\s*ª?\s*(?:JR\b|Junta de Recursos)/i);
  if(jr) return {nome:`${+jr[1]}ª Junta de Recursos`, instancia:1};
  return null;
}
function seloOrgao(e, a, k){
  const o = orgaoDaDecisao(e, a);
  if(!o) return "";
  // F236 · o selo diz o que vale para ESTA decisão: ganha, o INSS cumpre; matéria só médica, é definitiva (alçada,
  // Regimento do CRPS, art. 89, § 3º); só a contrária da Junta fora da alçada ainda cabe recurso especial
  const ef = CRPS.efeitoDecisao(e), alc = o.instancia===1 && k ? alcadaJunta(k) : null;
  const inst = o.instancia===2 ? "2ª instância — fim da via administrativa"
    : ef==="favoravel" ? "1ª instância — decisão favorável: o INSS deve cumprir"
    : alc==="certa" ? "Junta, matéria de alçada — decisão definitiva, sem recurso especial (art. 89, § 3º)"
    : alc ? "1ª instância — se a decisão for só médica, é definitiva (alçada, art. 89, § 3º); senão, cabe recurso especial"
    : "1ª instância — cabe recurso especial";
  return `<span class="crps-org${o.instancia===2?" inst2":alc==="certa"?" alcada":""}" title="${esc(inst)}">⚖️ ${esc(o.nome)}
    <small>${o.instancia===2?"2ª inst.":alc==="certa"?"alçada":"1ª inst."}</small></span>`;
}

// acha o arquivo dentro do bloco do recurso — os dois lados (ficha e
// resumidor) casam pelo mesmo par (nup, id do arquivo)
function acharArquivoCrps(k, nup, marca){
  for(const b of crpsBlocos(k)){
    const so = x => String(x||"").replace(/\D/g,"");
    if(so(b.nup) !== so(nup)) continue;
    for(const e of (b.eventos||[]))
      for(const a of (e.arquivos||[]))
        if(String(a.id||a.nome) === String(marca)) return a;
  }
  return null;
}

// destacar a movimentação acende também o ⭐ do processo — é ele que faz o
// caso pular para a frente nas listas. Tirar o destaque não apaga o ⭐ do
// processo: quem decide que o assunto morreu é você, no botão do composer.
// O ⚡ urgente entra no MESMO lugar (dentro do evento, em casos.crps): o
// robo-crps/ingerir.js já reacende as marcas do evento a cada coleta, pela
// chaveEvento — é o mecanismo que o ⭐ usa desde sempre, e o ⚡ pega carona.
async function toggleSinalCrps(casoId, nup, i, campo){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const so = x => String(x||"").replace(/\D/g,"");
  const b = crpsBlocos(k).find(x=>so(x.nup)===so(nup)); if(!b) return;
  const e = (b.eventos||[])[i]; if(!e) return;
  e[campo] = !e[campo];
  await gravarCrps(k);   // F291 · a ⭐ do movimento não acende a do caso: essa é a fila de hoje, como no To Do
  aviso(e[campo] ? (campo==="urgente"?"Movimentação marcada como urgente ⚡":"Movimentação destacada ⭐")
                 : "Marca retirada", false);
  repintarTudo();
}

async function gravarCrps(k){
  await patchCaso(k.id, {crps:k.crps});
}

// conferir é a diferença entre "a máquina achou" e "o escritório assinou"
async function conferirResumo(casoId, nup, marca){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const a = acharArquivoCrps(k, nup, marca); if(!a||!a.resumo) return;
  a.resumo.conferido_por = eu.id;
  a.resumo.conferido_em = new Date().toISOString();
  await gravarCrps(k);
  aviso("Resumo conferido ✔", false);
  abrirFicha(clienteAberto);
}

// corrigido à mão vira "curado": o resumidor nunca mais toca nele
function editarResumo(casoId, nup, marca){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const a = acharArquivoCrps(k, nup, marca); if(!a||!a.resumo) return;
  const cx = document.getElementById(`res-${marca}`); if(!cx) return;
  const ul = cx.querySelector("ul"), pe = cx.querySelector(".crps-res-pe");
  ul.outerHTML = `<textarea id="res-ed">${esc((a.resumo.linhas||[]).join("\n"))}</textarea>`;
  pe.innerHTML = `<button class="crps-res-bt" onclick="salvarResumo(${`'${casoId}','${esc(nup||"")}','${esc(marca)}'`})">salvar</button>
    <button class="crps-res-bt" onclick="abrirFicha(clienteAberto)">cancelar</button>`;
  const t = document.getElementById("res-ed"); t.focus();
}

async function salvarResumo(casoId, nup, marca){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const a = acharArquivoCrps(k, nup, marca); if(!a||!a.resumo) return;
  const t = document.getElementById("res-ed"); if(!t) return;
  const linhas = t.value.split("\n").map(s=>s.trim()).filter(Boolean);
  if(!linhas.length) return aviso("Escreva ao menos uma linha");
  a.resumo = {linhas, origem:"curado", conferido_por:eu.id, conferido_em:new Date().toISOString()};
  await gravarCrps(k);
  aviso("Resumo corrigido ✔", false);
  abrirFicha(clienteAberto);
}

// F103 · um evento do recurso como item da linha do tempo — serve ao quadro
// de UM recurso e à visão de TODOS os recursos do caso juntos
function itemRecurso(t, e, casoId){
    const evs = t.eventos||[];
    const forte = decideOCaso(e);
    // acórdão guardado no CRM: abre sem depender do gov.br. Os demais anexos
    // continuam contando só como número — não vale copiar o acervo inteiro.
    const guardados = (e.arquivos||[]).filter(a=>a.storage);
    const selo = forte ? seloOrgao(e, guardados[0], D.casoPorId.get(casoId)) : "";
    // o tradutor já põe "(25ª Junta)" no fim do texto; com o selo ao lado
    // isso vira eco. Sai o parêntese, fica a etiqueta, que diz mais.
    const txt = String(e.resumo||e.bruto||"")
      .replace(/\s*\((?:\d{1,2}ª\s*)?(?:Junta|Câmara|CRPS)[^)]*\)\s*$/,"");
    // ⭐ por movimentação: o que o robô traz é muito, e nem tudo pede ação.
    const i = evs.indexOf(e);
    const alv = `'${casoId}','${esc(t.nup||"")}',${i}`;
    if(temaV10()) return { q: isoCrps(e.data), em: iconeFonte("crps")||"🖥", rot: "Recurso", texto: txt, forte,
      cls: `${e.importante?"crps-imp":""}${e.urgente?" tl-urg":""}`, ofic: oficCrps(t, e, casoId, selo, guardados, alv) };
    return { q: isoCrps(e.data), em: e.icone||"🖥", rot: "Recurso", texto: txt, forte,
      cls: `${e.importante?"crps-imp":""}${e.urgente?" tl-urg":""}`,
      html: ` ${selo}
        <span class="tl-sinais">
          <button class="tl-sinal imp ${e.importante?"on":""}" onclick="toggleSinalCrps(${alv},'importante')"
            title="${e.importante?"tirar o destaque desta movimentação"
                                 :"destacar esta movimentação — acende o ⭐ do processo"}">${IC_ESTRELA}</button>
          <button class="tl-sinal urg ${e.urgente?"on":""}" onclick="toggleSinalCrps(${alv},'urgente')"
            title="${e.urgente?"tirar a urgência desta movimentação":"marcar ESTA movimentação como urgente"}">${IC_RAIO}</button>
        </span>
        ${segBtnHtml(segRegistrar(casoId, String(e.resumo||e.bruto||""), null))}
        ${guardados.map(a=>`<button class="crps-pdf" title="${esc(a.nome)}"
          onclick="abrirDecisao('${esc(a.storage)}')">📄 abrir ${/monocr/i.test(a.nome)?"decisão":"acórdão"}</button>`).join("")}
        ${e.docs?`<span class="meio-sub">📎 ${e.docs} documento${e.docs>1?"s":""}</span>`:""}
        ${guardados.map(a=>caixaResumo(casoId, t.nup, a)).join("")}` };
}
function blocoRecurso(t, casoId){
  const evs = t.eventos||[], ruido = evs.filter(e=>e.tipo==="ruido");
  const cheios = evs.filter(e=>e.tipo!=="ruido");
  const k = D.casoPorId.get(casoId) || {id:casoId};
  // a decisão mais recente manda na Situação: é a instância em que o caso
  // está agora, e é dela que sai (ou não) o prazo do recurso especial
  const ultima = [...cheios].sort(porDataDesc).find(decideOCaso);
  // F45 · o mesmo esqueleto da conversa do Escritório; os botões próprios do
  // recurso (⭐ destaque, 📄 acórdão, resumo conferível) entram pelo html
  const linha = e => itemRecurso(t, e, casoId);
  // F236 · o número formatado e com copiar no alto; a situação na cor do resultado (verde provido, vermelho
  // negado) e, embaixo dela, o que o recurso pede agora (passosDoRecurso)
  const num = formatarNup(t.nup||"") || t.num_proc || "", st = t.status||"—";
  const cor = /^✅/.test(st) ? ` style="color:var(--verde)"` : /^⛔/.test(st) ? ` style="color:#b42318"` : "";
  return `<div class="fatos" style="margin-bottom:12px">
    <div class="fatos-topo">
      <h3 style="font-size:14px">e-Recursos · ${esc(num)}</h3>
      ${num?`<button class="btn-mini" onclick="copiar('${escJs(num)}','Número do recurso copiado')" title="copiar o número do recurso">copiar</button>`:""}
      ${/* arquivar é DESTE recurso: com dois nups no caso, cada quadro tem o
           seu selo, e a aba só se diz arquivada quando todos estiverem */""}
      ${seloArquivo(k, "crps:"+soDig(t.nup))}
    </div>
    <div class="fx-sit">
      <span class="fx-rot">Situação</span> <b${cor}>${esc(st)}</b>
      ${ultima?seloOrgao(ultima, (ultima.arquivos||[]).find(a=>a.storage), k):""}
      ${t.orgao_atual?`<div class="meio-sub" style="margin-top:3px">📍 onde está agora: ${esc(tituloOrgao(t.orgao_atual))}</div>`:""}
      ${passosDoRecurso(k, t)}
    </div>
    ${tlOficial(cheios.map(linha), "Sem andamentos.")}
    ${ruido.length?`<details class="crps-ruido"><summary>+ ${ruido.length} movimentação interna (encaminhamentos automáticos, cadastro)</summary>
      ${tlOficial(ruido.map(e=>temaV10() ? {...linha(e), ofic:null, html:""} : linha(e)))}</details>`:""}
    <div class="fatos-pe" style="justify-content:flex-end">
      <span class="meio-sub">consulta de ${t.consultado_em?fmt(dataSP(t.consultado_em)):"—"}</span>
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════════════════════════════
// OS NÚMEROS QUE ABREM AS ABAS (dentro do ➕ mais informações)
// ══════════════════════════════════════════════════════════════════════════
// 🖥 Recurso e ⚖️ CNJ só aparecem quando o caso tem o número — e antes de
// existirem não havia onde digitá-lo. Os dois campos moram aqui, na aba
// Andamentos do Escritório, que nunca some: digitou, a aba nasce.
function linhaNumerosDasAbas(k){
  const nups = crpsNups(k);
  return `<div class="fx-rec" style="display:block">
    <div class="meio-sub" style="margin-bottom:6px">Os números que abrem as abas deste caso.</div>

    <div class="form-linha" style="align-items:center">
      <span class="fx-rot" style="min-width:130px">🖥 Recurso (e-Sisrec)</span>
      ${nups.length
        ? nups.map(n=>`<span class="chip neutro" style="font-family:var(--f-mono,ui-monospace,Consolas,monospace)"
            title="copiar" onclick="copiar('${esc(n)}','Número do recurso copiado')">${esc(formatarNup(n))}</span>`).join(" ")
        : `<span class="fx-vazio">—</span>`}
    </div>
    <div class="form-linha" style="margin:4px 0 10px">
      <input id="crps-nup-mais-${k.id}" style="flex:1"
        placeholder="${nups.length?"＋ outro número de recurso":"número do recurso (ex.: 44233.139765/2025-37)"}"
        onkeydown="if(event.key==='Enter')salvarCrpsNup('${k.id}','crps-nup-mais-${k.id}')">
      <button class="btn-mini" onclick="salvarCrpsNup('${k.id}','crps-nup-mais-${k.id}')"
        title="grava o número e abre a aba 🖥 Recurso — o robô consulta na próxima rodada">adicionar</button>
    </div>

    <dl class="fx-grade" style="margin:0">${campoFato(k,"processo")}</dl>
    <div class="meio-sub" style="margin-top:4px">Com o número do processo judicial a aba
      <b>⚖️ Andamentos do CNJ</b> aparece, e a consulta diária passa a acompanhá-lo.</div>
  </div>`;
}

// F185 · o submenu do Recurso, no mesmo padrão do Judicial e do INSS: os
// andamentos do recurso e os acórdãos/monocráticas guardados no CRM
function menuDocsCrps(k){
  const tela = crpsBlocos(k).some(b=>(b.eventos||[]).length);
  if(!tela && !docsDaOrigem(k, ["crps"]).length) return "";
  const ver = fonteCrps==="docs", es = fonteCrps==="esisrec";
  return `<div class="sub-menu fontes" style="width:100%">
    <button class="${ver||es?"":"on"}" onclick="fonteCrps='';repintarFicha()">${temaV10()?"":"⚖️ "}Andamentos do recurso</button>
    ${tela?`<button class="${es?"on":""}" onclick="fonteCrps='esisrec';repintarFicha()" title="o recurso como a tela do e-SISREC: cabeçalho, todas as movimentações e os documentos">e-SISREC</button>`:""}
    ${botaoDocs(k, ["crps"], ver, "fonteCrps='docs';repintarFicha()")}
  </div>`;
}
// 1.32.0 · a tela do e-SISREC no CRM: o cabeçalho do processo e a tabela Data · Status · Documentos com TODAS as
// movimentações, o status como o portal escreve (bruto) e cada documento guardado abrindo pelo CRM
// os documentos do recurso em árvore. O e-SISREC não dá tipo ao documento (muitos são
// "temporario.pdf"), por isso a árvore segue a tramitação: as decisões à parte e, nas demais,
// a instância lida do texto do movimento e uma pasta por movimento (data · status)
const INST_ESISREC = [["Câmara de Julgamento", /\bCAJ\b|c[aâ]mara|recurso especial|embargo/i],
  ["Cumprimento", /cumpri|devolv\w* ao inss|para (o )?inss|baixa/i], ["Junta de Recursos", /\bJR\b|junta|recurso ordin|distribu|conselheiro|sess[aã]o|pauta/i]];
let arvEsisrecData = true;   // a árvore pela data dos movimentos (padrão, pedido do Paulo) ou pela tramitação
function arvoreEsisrec(t, doc){
  const pasta = (r, n, sub) => `<li><details><summary>📁 ${esc(r)} (${n})</summary><ul class="pat-arv">${sub}</ul></details></li>`;
  const modo = `<span class="sub-menu fontes" style="margin-left:8px;display:inline-flex">
    <button class="${arvEsisrecData?"":"on"}" onclick="arvEsisrecData=false;repintarFicha()" title="agrupar pela instância: decisões, INSS, Junta, Câmara e cumprimento">Tramitação</button>
    <button class="${arvEsisrecData?"on":""}" onclick="arvEsisrecData=true;repintarFicha()" title="uma pasta por movimento, do mais recente ao mais antigo, com a decisão em destaque">Data</button></span>`;
  if(arvEsisrecData){
    const ramos = [...(t.eventos||[])].sort(porDataDesc).filter(e=>(e.arquivos||[]).length).map(e=>{
      const rot = `${String(e.data||"").slice(0,10)} · ${e.bruto||e.resumo||""}`, sub = e.arquivos.map(x=>`<li>${doc(x)}</li>`).join("");
      return e.tipo==="decisao" || e.arquivos.some(a=>a.decide)
        ? `<li><details><summary><b>📁 ${esc(rot)} (${e.arquivos.length})</b> <span class="meio-sub">decisão</span></summary><ul class="pat-arv">${sub}</ul></details></li>`
        : pasta(rot, e.arquivos.length, sub); }).join("");
    return ramos ? `<h4 style="font-size:13px;margin:8px 0 4px">Documentos${modo}</h4><ul class="pat-arv pat-raiz">${ramos}</ul>
      <h4 style="font-size:13px;margin:10px 0 4px">Movimentações</h4>` : "";
  }
  const dec = [], inst = new Map([["Protocolo e INSS", []], ["Junta de Recursos", []], ["Câmara de Julgamento", []], ["Cumprimento", []]]);
  [...(t.eventos||[])].sort((a,b)=>-porDataDesc(a,b)).forEach(e=>{
    const st = e.bruto||e.resumo||"", rot = `${String(e.data||"").slice(0,10)} · ${st}`;
    const resto = (e.arquivos||[]).filter(a=>{ if(a.decide || e.tipo==="decisao"){ dec.push(`<li>${doc(a)} <span class="meio-sub">${esc(rot)}</span></li>`); return false; } return true; });
    if(!resto.length) return;
    const g = (INST_ESISREC.find(([,rx])=>rx.test(st))||["Protocolo e INSS"])[0];
    inst.get(g).push([rot, resto]); });
  const ramos = (dec.length ? pasta("Decisões (acórdãos e monocráticas)", dec.length, dec.join("")) : "")
    + [...inst].filter(([,l])=>l.length).map(([r,l])=>pasta(r, l.reduce((n,[,a])=>n+a.length,0),
        l.map(([rot,a])=>pasta(rot, a.length, a.map(x=>`<li>${doc(x)}</li>`).join(""))).join(""))).join("");
  return ramos ? `<h4 style="font-size:13px;margin:8px 0 4px">Documentos${modo}</h4><ul class="pat-arv pat-raiz">${ramos}</ul>
    <h4 style="font-size:13px;margin:10px 0 4px">Movimentações</h4>` : "";
}
function telaEsisrec(t){
  const cab = [["Processo", t.num_proc || formatarNup(t.nup||"")], ["NB", t.nb], ["Recorrente(s)", (t.recorrentes||[]).join("; ")],
    ["Recorrido", t.recorrido], ["APS de origem", t.aps_origem], ["Órgão atual", t.orgao_atual]].filter(x=>x[1]);
  const evs = [...(t.eventos||[])].sort(porDataDesc);
  const doc = a => a.storage
    ? `<button class="btn-mini" onclick="abrirDecisao('${escJs(a.storage)}')" title="abrir o documento guardado no CRM">📄 ${esc(a.nome||"documento")}</button>`
    : `<span class="meio-sub" title="a extensão ainda não baixou este documento">${esc(a.nome||"documento")} (não baixado)</span>`;
  return `<div class="fatos" style="margin-bottom:12px">
    <div class="fatos-topo"><h3 style="font-size:14px">e-SISREC · ${esc(formatarNup(t.nup||"") || t.num_proc || "")}</h3></div>
    <table class="tab" style="margin-bottom:10px">${cab.map(([r,v])=>`<tr><th style="text-align:left;white-space:nowrap">${r}</th><td>${esc(v)}</td></tr>`).join("")}</table>
    ${arvoreEsisrec(t, doc)}
    <table class="tab tab-esisrec"><tr><th>Data</th><th>Status</th><th>Documentos</th></tr>
      ${evs.map(e=>`<tr><td style="white-space:nowrap">${esc(e.data||"")}</td><td>${esc(e.bruto||e.resumo||"")}</td>
        <td>${(e.arquivos||[]).map(doc).join("<br>")}</td></tr>`).join("")}
    </table>
  </div>`;
}
function painelCRPS(k){
  if(fonteCrps==="docs" && docsDaOrigem(k, ["crps"]).length)
    return `${composerNoPainel(k)}${avisoNumeroFora(k, "nup")}${menuDocsCrps(k)}${painelDocumentos(k, ["crps"])}`;
  if(fonteCrps==="esisrec" && crpsBlocos(k).some(b=>(b.eventos||[]).length))
    return `${composerNoPainel(k)}${avisoNumeroFora(k, "nup")}${menuDocsCrps(k)}${crpsBlocos(k).filter(b=>(b.eventos||[]).length).map(telaEsisrec).join("")}`;
  const nups = crpsNups(k), blocos = crpsBlocos(k);
  const manual = n => crpsBlocos(k).find(b=>soDig(b.nup)===soDig(n) && b.manual);
  // gerência dos números: lista com remover + campo para acrescentar
  const gerNups = `<div class="caso">
    <div class="rotulo-caso" style="display:flex;align-items:center;gap:8px">
      <span style="flex:1">números de recurso deste caso (${nups.length})</span>
      ${botaoFaseAba(k, "crps")}
    </div>
    ${nups.map(n=>`<div class="form-linha" style="margin-top:4px">
      <span class="chip neutro" style="font-family:var(--f-mono,ui-monospace,Consolas,monospace);cursor:pointer" title="copiar"
        onclick="copiar('${esc(formatarNup(n))}','Número do recurso copiado')">${esc(formatarNup(n))}</span>
      ${manual(n)
        ? `<button class="btn-mini" onclick="crpsAutomatico('${k.id}','${n}')"
             title="o INSS vinculou o processo — devolver ao robô"><span aria-hidden="true">🤖 Automático</span><span class="sr-only">🤖 voltar ao automático</span></button>`
        : `<button class="btn-mini" onclick="crpsManual('${k.id}','${n}')"
             title="o robô não enxerga este recurso — alguém consulta no site"><span aria-hidden="true">🔎 Consultar</span><span class="sr-only">🔎 consulta manual</span></button>`}
      <button class="btn-mini" onclick="removerCrpsNup('${k.id}','${n}')" title="tirar este número">✕</button>
      ${chipNbNumero(k, "nup", n)}${selLevarNumero(k, "nup", n)}
    </div>`).join("")}
    <div class="form-linha" style="margin-top:8px">
      <input id="crps-nup-${k.id}" placeholder="＋ número do recurso (ex.: 44233.139765/2025-37)" style="flex:1"
        onkeydown="if(event.key==='Enter')salvarCrpsNup('${k.id}')">
      <button class="btn-mini" onclick="salvarCrpsNup('${k.id}')">adicionar</button>
    </div></div>`;
  const comEventos = blocos.filter(b=>(b.eventos||[]).length);
  const manuais = blocos.filter(b=>b.manual);
  if(!comEventos.length && !manuais.length){
    return `${composerNoPainel(k)}${avisoNumeroFora(k, "nup")}${menuDocsCrps(k)}${avisoJuntos(k)}<div class="caso">
      <p class="meio-sub">${nups.length
        ? "Número guardado. O robô do CRPS vai consultar na próxima rodada e o histórico aparece aqui."
        : "Sem recurso vinculado. Cole o número do processo de recurso (o da URL do e-Recursos) para o robô acompanhar."}</p>
      ${estadoCRPS().cor==="#c62828"?`<p class="meio-sub" style="color:#c62828;margin-top:6px">⚠ O crachá do gov.br venceu — renove em ⚙️ Configurações para o robô voltar a consultar.</p>`:""}
    </div>${gerNups}`;
  }
  // F103 · com mais de um recurso, a visão padrão é a de TODOS JUNTOS, em
  // ordem de data, cada linha dizendo de qual recurso é; um por vez continua
  // a um clique no sub-menu (F99 mostrava só um por vez).
  const todos = [...manuais, ...comEventos];
  const juntos = todos.length>1 && !todos.some(b=>soDig(b.nup)===soDig(nupSel));
  const escolhido = juntos ? null : (todos.find(b=>soDig(b.nup)===soDig(nupSel)) || todos[0]);
  const menuNup = todos.length>1 ? `<div class="sub-menu instancias" style="width:100%">
    <button class="${juntos?"on":""}" onclick="nupSel='';repintarFicha()" title="os andamentos de todos os recursos, juntos">Todos os recursos</button>
    ${todos.map(b=>{
      const ult=(b.eventos||[]).find(e=>e.data);
      return `<button class="${escolhido&&soDig(b.nup)===soDig(escolhido.nup)?"on":""}"
        onclick="nupSel='${esc(b.nup)}';repintarFicha()">${esc(formatarNup(b.nup))}${arqInfo(k,"crps:"+soDig(b.nup))?" 🗄":""}
        <small>${b.manual?"consulta manual":ult&&ult.data?fmt(isoCrps(ult.data)):"—"}</small></button>`;
    }).join("")}
  </div>` : "";
  return `${composerNoPainel(k)}${avisoNumeroFora(k, "nup")}${menuDocsCrps(k)}${avisoJuntos(k)}${menuNup}
    ${comEventos.length?`<div class="form-linha" style="margin-bottom:8px">
      <button class="${temaV10()?"tl-bt":"btn-mini"}" onclick="copiarCrps('${k.id}')" title="a situação do processo inteiro, pronta para o cliente">${temaV10()?"":"💬 "}<span aria-hidden="true">Situação</span><span class="sr-only">Copiar situação para o cliente</span></button></div>`:""}
    ${juntos ? blocoRecursosJuntos(comEventos, k) + manuais.map(b=>quadroManual(b, k)).join("")
      : escolhido ? (escolhido.manual ? quadroManual(escolhido, k) : blocoRecurso(escolhido, k.id)) : ""}
    ${gerNups}`;
}
function blocoRecursosJuntos(blocos, k){
  const itens = blocos.flatMap(t => (t.eventos||[]).filter(e=>e.tipo!=="ruido")
    .map(e => ({...itemRecurso(t, e, k.id), rot:`Recurso ${formatarNup(t.nup)}`})));
  itens.sort((a,b)=>a.q<b.q?1:-1);
  return `<div class="fatos" style="margin-bottom:12px">
    <div class="fatos-topo"><h3 style="font-size:14px">e-Recursos · ${blocos.length} recursos juntos</h3></div>
    ${tlOficial(itens, "Sem andamentos.")}
  </div>`;
}


// ── cópia fiel de robo-crps/separar.js ────────────────────────────────────
// O app.html é arquivo único e não faz require; o teste separar.test.js
// compara o código-fonte das duas cópias e quebra se elas divergirem.
const so = x => String(x || '').replace(/\D/g, '');
const CAMPOS_HERDADOS = [
  'cliente_id', 'beneficio', 'fase', 'especie', 'nb', 'parceria',
  'der', 'dib', 'dii', 'dat', 'urgente', 'origem_lista',
];

function nupsDoCaso(k) {
  const arr = Array.isArray(k.crps_nups) ? k.crps_nups : [];
  const lista = arr.map(so).filter(Boolean);
  const unico = so(k.crps_nup);
  if (unico && !lista.includes(unico)) lista.push(unico);
  return [...new Set(lista)];
}
function blocosDoCaso(k) {
  return Array.isArray(k.crps) ? k.crps : (k.crps ? [k.crps] : []);
}
function formatarNup(d) {
  const n = so(d);
  if (n.length !== 17) return String(d || '');
  return `${n.slice(0, 5)}.${n.slice(5, 11)}/${n.slice(11, 15)}-${n.slice(15)}`;
}
function tituloDoRecurso(k, nup, i) {
  const base = String(k.titulo || '').replace(/\s*—\s*recurso\s.*$/i, '').trim();
  return `${base} — recurso ${i}/${formatarNup(nup)}`;
}
function planoDeSeparacao(k) {
  const nups = nupsDoCaso(k);
  if (nups.length < 2) return { precisa: false, fica: null, novos: [] };
  const blocos = blocosDoCaso(k);
  const blocoDe = n => blocos.find(b => so(b.nup) === n) || null;

  const [primeiro, ...resto] = nups;
  const fica = {
    id: k.id,
    titulo: tituloDoRecurso(k, primeiro, 1),
    crps_nups: [primeiro],
    crps_nup: null,
    crps: blocoDe(primeiro) ? [blocoDe(primeiro)] : [],
  };
  const novos = resto.map((n, i) => {
    const novo = { nup: n, titulo: tituloDoRecurso(k, n, i + 2),
                   crps_nups: [n], crps_nup: null,
                   crps: blocoDe(n) ? [blocoDe(n)] : [] };
    for (const c of CAMPOS_HERDADOS) if (k[c] !== undefined && k[c] !== null) novo[c] = k[c];
    return novo;
  });
  return { precisa: true, fica, novos };
}
function conferirPlano(k, plano) {
  const antes = nupsDoCaso(k);
  const depois = [...(plano.fica ? plano.fica.crps_nups : []),
                  ...plano.novos.map(n => n.nup)];
  if (antes.length !== depois.length) return `sobrou/faltou recurso: ${antes.length} → ${depois.length}`;
  for (const n of antes) if (!depois.includes(n)) return `o recurso ${formatarNup(n)} ficaria sem caso`;
  const blocosAntes = blocosDoCaso(k).length;
  const blocosDepois = (plano.fica ? plano.fica.crps.length : 0)
    + plano.novos.reduce((s, x) => s + x.crps.length, 0);
  if (blocosAntes !== blocosDepois) return `o histórico de um recurso ficaria para trás (${blocosAntes} → ${blocosDepois})`;
  return null;
}
// ── fim da cópia ──────────────────────────────────────────────────────────

// ── um caso para cada recurso ─────────────────────────────────────────────
// Cada recurso administrativo tem protocolo próprio, prazo próprio e decisão
// própria. Empilhados numa ficha só, o CRM mente de três jeitos: a Situação
// do caso vira a de um recurso escolhido por acaso; o comentário do robô cai
// numa linha do tempo compartilhada e ninguém sabe de qual recurso é aquele
// "Recurso negado"; e encerrar o caso quando um acaba enterra os outros.
// F99 · vários recursos no mesmo caso é o normal (decisão do Paulo, 17.09):
// a aba mostra um por vez, com menu. Separar em casos fica como ferramenta,
// para quando os recursos seguirem vidas diferentes — não como cobrança.
function avisoJuntos(k){
  const n = crpsNups(k).length;
  if(n < 2) return "";
  return `<p class="meio-sub" style="margin:0 0 8px;display:flex;align-items:center;gap:8px">
    ${n} recursos neste caso — escolha qual ver no menu abaixo.
    <button class="btn-mini" onclick="separarRecursos('${k.id}')"
      title="dar a cada recurso uma ficha própria, com o histórico dele">✂️ separar em ${n} casos</button></p>`;
}
function separarRecursos(casoId){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const p = planoDeSeparacao(k);
  if(!p.precisa) return aviso("Este caso já tem um recurso só");
  const erro = conferirPlano(k, p);
  if(erro) return aviso("Não vou separar: " + erro);   // barreira antes de gravar
  const c = D.cliPorId.get(k.cliente_id);
  caixa(`<h3>✂️ Separar em ${p.novos.length+1} casos</h3>
    <p class="meio-sub">Cada recurso passa a ter ficha própria, com o histórico dele.
      Os comentários do escritório <b>ficam no caso atual</b> — um comentário pertence ao dia em que
      foi escrito, e adivinhar de qual recurso ele falava seria inventar.</p>
    <div class="sep-lista">
      <div class="sep-lin"><b>fica aqui</b> <span style="font-family:var(--f-mono,ui-monospace,Consolas,monospace)">${esc(formatarNup(p.fica.crps_nups[0]))}</span>
        <span class="meio-sub">${p.fica.crps.length?"com histórico":"ainda sem histórico"}</span></div>
      ${p.novos.map(n=>`<div class="sep-lin"><b>caso novo</b> <span style="font-family:var(--f-mono,ui-monospace,Consolas,monospace)">${esc(formatarNup(n.nup))}</span>
        <span class="meio-sub">${n.crps.length?"leva o histórico dele":"ainda sem histórico"}</span></div>`).join("")}
    </div>
    <p class="meio-sub" style="margin-top:8px">Cliente: <b>${esc(c?c.nome:"")}</b> ·
      os casos novos nascem na mesma fase (${esc(NOME_FASE[k.fase]||k.fase)}) e com o mesmo benefício.</p>
    <div class="form-linha" style="margin-top:8px">
      <button class="btn-rap" style="margin-left:auto" onclick="confirmarSeparacao('${casoId}')" title="✂️ Separar agora">✂️ Separar<span class="sr-only"> agora</span></button>
    </div>`);
}
async function confirmarSeparacao(casoId){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const p = planoDeSeparacao(k);
  const erro = conferirPlano(k, p);
  if(erro) return aviso("Não vou separar: " + erro);
  fecharCaixa();
  const nascidos = [];
  for(const n of p.novos){
    const {nup, ...corpo} = n;
    const [novo] = await api(`/rest/v1/casos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify(corpo)}).catch(()=>[]);
    if(!novo){ aviso("Não consegui criar um dos casos — nada foi mexido"); return; }
    nascidos.push({novo, nup});
    // quem cuidava do caso continua cuidando do irmão
    for(const cid of (D.atrDoCaso.get(k.id)||[]))
      await api(`/rest/v1/atribuicoes`,{method:"POST",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({caso_id:novo.id, colaborador_id:cid})}).catch(()=>{});
    await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({caso_id:novo.id, autor_id:eu.id,
        texto:`✂️ Caso aberto ao separar os recursos do cliente. Recurso ${formatarNup(nup)}. `
             +`O histórico anterior do escritório ficou no caso de origem.`})}).catch(()=>{});
  }
  // só depois de todos os novos existirem o original é encolhido: se algo
  // falhar no meio, nenhum recurso fica sem caso
  await patchCaso(k.id, {titulo:p.fica.titulo, crps_nups:p.fica.crps_nups,
                         crps_nup:null, crps:p.fica.crps});
  await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({caso_id:k.id, autor_id:eu.id,
      texto:`✂️ Recursos separados: ${nascidos.map(x=>formatarNup(x.nup)).join(", ")} `
           +`${nascidos.length>1?"passaram":"passou"} para caso próprio. Aqui fica ${formatarNup(p.fica.crps_nups[0])}.`})}).catch(()=>{});
  await carregar(); montarSidebar();
  plim();
  aviso(`Separado ✔ — ${nascidos.length} caso(s) novo(s)`, false);
  abrirFicha(clienteAberto);
}

