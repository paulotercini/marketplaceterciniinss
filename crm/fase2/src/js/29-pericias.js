// F102 · as ações do caso (fundir / não é caso / encerrar / reabrir) servem
// ao cartão e à linha do caso — um lugar só para os quatro botões
function acoesDoCaso(k){
  return `${((D.casosDoCliente.get(k.cliente_id)||[]).length>1 && k.fase!=="encerrado")
      ?`<button class="btn-mini" onclick="janelaFundir('${k.id}')"
          title="pedido → recurso → judicial é uma sequência só: incorpora outro caso a este, com todo o histórico">⇄ fundir</button>`:""}
    ${k.fase!=="encerrado" && !ehPreCaso(k)
      ?`<button class="btn-mini" onclick="naoEhCaso('${k.id}')"
          title="cliente em negociação, ainda sem processo? Isto NÃO é caso: ele volta a pré-caso na lista 🙋 Escritório, com anotações, documentos e agenda — a tarefa no To Do não muda">↩ não é caso</button>`:""}
    ${k.fase==="encerrado"
    ? (co=>`<span class="chip fase" title="quem encerrou e quando">✔ encerrado${
        co?` por ${esc(co.nome.split(" ")[0])}`:""}${
        k.encerrado_em?` · ${fmtTS(k.encerrado_em)} ${horaSP(k.encerrado_em)}`:""}</span>
       <button class="btn-mini" onclick="reabrirCaso('${k.id}')"
         title="encerrou por erro ou o caso voltou a andar? Reabre na lista de origem, com registro de quem reabriu">↺ reabrir</button>`)(D.colPorId.get(k.encerrado_por))
    : `<button class="btn-mini" onclick="janelaEncerrar('${k.id}')"
         title="encerrar: resultado + honorários — fica registrado quem encerrou e quando">✔ Encerrar<span class="sr-only"> caso</span></button>`}`;
}
// F58 · o ➕ aberto sobrevive à repintura (mesma mecânica da mesa F55)
const maisAberto = new Set();
function maisDobra(id, aberto){ aberto ? maisAberto.add(id) : maisAberto.delete(id); }

// (o 🔁 por caso da 08.55 durou um dia: cliente com dois casos não dizia em
// qual morava o aviso. O aviso periódico agora é do CLIENTE, na aba 🔔
// Lembretes — sobra daquela versão só o somaMeses, que o módulo novo usa.)
function somaMeses(iso, m){
  const d=new Date(iso+"T12:00:00"); d.setMonth(d.getMonth()+m);
  return d.toISOString().slice(0,10);
}

// edição no lugar: o lápis vira campo, salva ao sair e volta a ser texto
function editarFato(casoId, campo, pref){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const f = FATOS[campo], cx = document.getElementById(`${pref||"fx"}-${campo}-${casoId}`);
  if(!cx) return;
  const v = k[campo] || "";
  cx.innerHTML = f.tipo==="data"
    ? `<input type="date" value="${esc(v)}" class="fx-inp">`
    : f.tipo==="especie"
      ? `<input class="fx-inp" list="lista-especies" value="${esc(v)}" placeholder="B31">`
      : f.tipo==="lista"
        ? `<select class="fx-inp"><option value="">—</option>${f.opcoes.map(o=>`<option value="${esc(o)}" ${o===v?"selected":""}>${esc(o)}</option>`).join("")}</select>`
        : `<input class="fx-inp" value="${esc(v)}" placeholder="${esc(f.rot)}">`;
  const inp = cx.querySelector("input,select");
  inp.focus(); if(inp.select) inp.select();
  let salvo = false;
  const guardar = async ()=>{
    if(salvo) return; salvo = true;
    let novo = (inp.value||"").trim() || null;
    if(f.tipo==="especie" && novo) novo = novo.toUpperCase().replace(/^(\d)/,"B$1");
    if(novo === (k[campo]||null)) return abrirFicha(clienteAberto);
    const corpo = {[campo]: novo};
    k[campo] = novo;
    // espécie definida arrasta o benefício junto quando ele está vazio ou é
    // o genérico da mesma família — o nome do caso conta a mesma história
    // que o campo (gravado, vale também para a busca e para o To Do)
    if(campo==="especie"){ corpo.subespecie = null; k.subespecie = null; }
    if(campo==="especie" && novo){
      const esp = nomeDaEspecie(novo);
      if(esp && beneficioGenerico(k, esp)){
        corpo.beneficio = esp; k.beneficio = esp;
      }
    }
    // DCB nova rearma o alarme e sugere a data de prorrogação (15 dias antes)
    if(campo==="dcb"){
      k.dcb_prorrogacao_pedida = false; corpo.dcb_prorrogacao_pedida = false;
      k.dcb_prorrogar_em = novo ? somaDias(novo, -DIAS_PRORROG) : null;
      corpo.dcb_prorrogar_em = k.dcb_prorrogar_em;
    }
    await patchCaso(casoId, corpo);
    aviso(novo?`${FATOS[campo].rot} guardado ✔`:`${FATOS[campo].rot} apagado`, false);
    abrirFicha(clienteAberto);
  };
  inp.onblur = guardar;
  if(inp.tagName==="SELECT") inp.onchange = guardar;
  inp.onkeydown = e=>{ if(e.key==="Enter"){e.preventDefault();guardar();}
                       if(e.key==="Escape"){salvo=true;abrirFicha(clienteAberto);} };
}

// F102 · a mesma janela dos outros números (era um prompt() do navegador)
function novoProtocolo(casoId){
  caixa(`<h3 style="margin:0 0 6px">＋ Protocolo do INSS</h3>
    <div class="form-linha"><input id="lc-prot-inp" placeholder="só os dígitos" inputmode="numeric" style="flex:1"
      onkeydown="if(event.key==='Enter')guardarProtocolo('${casoId}')">
      <button class="btn-mini forte" onclick="guardarProtocolo('${casoId}')">guardar</button></div>`);
  document.getElementById("lc-prot-inp").focus();
}
async function guardarProtocolo(casoId){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const v = ((document.getElementById("lc-prot-inp")||{}).value||"").replace(/\D/g,"");
  fecharCaixa();
  if(!v) return;
  const cp = corpoProtocolos(k, [v]);
  if(!cp) return aviso("Este protocolo já está no caso", false);
  await patchCaso(casoId, cp); Object.assign(k, cp);
  aviso("Protocolo guardado ✔", false); abrirFicha(clienteAberto);
}

function composerCaso(k){
  // F45 · o compositor saiu do painelEscritorio para servir também ao Caso
  // completo (que virou a primeira tela): vê tudo E escreve dali — a
  // anotação nasce no escritório e aparece nas duas linhas do tempo.
  // F112 · as peças são as mesmas nos dois temas; muda só a montagem. No tema
  // v10 (pedido do Paulo, 17.09): tipos + Sugestões numa linha, o campo, e o
  // resto só aparece ao clicar no campo — prazo com Lembrar em ao lado, e
  // Atribuir para com as ferramentas e o Registrar à direita.
  const equipe = D.atrDoCaso.get(k.id) || [];
  // F236 · o caso encerrado com honorário em aberto aceita a anotação da cobrança sem reabrir
  const encerrado = k.fase==="encerrado" && !honAbertoNoCaso(k);
  const v10 = temaV10();
  // F21 · o tipo antes do texto. Vocabulário FECHADO (lição de Clio, Linear e
  // das Tabelas do CNJ). F105 · no tema cada tipo abre uma janela (POPS_ANOTACAO);
  // sem o tema, o esqueleto entra direto no texto, como sempre
  // F391 · no v10 o "Tipo" vai à barra das chaves e os dois gestos de um clique ao pé, ao lado do Registrar
  const umClique = encerrado ? "" : `<button class="tipo-ch tipo-sr" onclick="semRespostaMenu('${k.id}')" title="anota a tentativa e marca a próxima para 2 dias úteis">Sem resposta</button><button class="tipo-ch tipo-pc" onclick="pedirAoCliente('${k.id}')" title="Pedir ao cliente: o pedido entra no Trouxe documentos e baixa quando o papel chega">Pedir<span class="sr-only"> ao cliente</span></button>`;
  const chips = (v10
    // F274 · os oito tipos de anotação ficam num ⋯ "Tipo"; à vista, só Sem resposta e Pedir ao cliente
    ? `<details class="tl-mais mais-baixo tipo-mais"><summary class="tipo-ch" title="escolher o tipo de anotação: o campo ganha as lacunas para preencher">Tipo ▾</summary><span class="tl-mais-menu" role="menu">${
        Object.entries(POPS_ANOTACAO).map(([ch,P])=>
          `<button class="tipo-ch tl-mais-it" role="menuitem" data-tipoand="${ch}" onclick="this.closest('details').open=false;popAnotacao('${ch}')">${esc(P.rot)}</button>`).join("")}</span></details>`
    : TIPOS_ANOTACAO.map(([ch,rot])=>
          `<button class="tipo-ch" data-tipoand="${ch}" onclick="escolherTipoAnotacao('${ch}')">${esc(rot)}</button>`).join(""));
  // F247 · os dois gestos que mais se escreviam à mão, em um clique
  const area = `<textarea id="and-texto" rows="2" placeholder="Escrever no caso…" ${v10?"data-v12":"data-dica"}="Escreva o andamento…  a data pode vir no texto: “verificar em 24/08” — ou clique num tipo acima e preencha as lacunas"></textarea>`;
  // o id tf-box é a chave da TRAVA: é por ele que novoAndamento sabe que
  // precisa exigir responsável e data. Renomear sem manter o id já derrubou
  // a obrigatoriedade uma vez.
  const atribuir = `<button class="fx-av tf-ninguem" id="tf-ninguem" onclick="tfNinguem(this)"
          title="não atribuir a ninguém"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="m6 18 12-12"/></svg></button>
        ${equipeAtiva().map(co=>`<button class="fx-av tf-eq"
          data-tfp="${co.id}" style="--cor-eq:${co.cor}" title="${esc(co.nome)}"
          onclick="tfPessoa('${co.id}',this)">${esc(co.inicial)}</button>`).join("")}
        <button class="btn-rap tf-todos" id="tf-todos" onclick="tfTodos()"
          title="a equipe inteira: uma tarefa para cada colaborador ativo">👥 todos</button>
        ${seletorRevisor("tf-rev")}`;
  const lembrar = `<button class="btn-rap tf-dt" data-tfd="hoje" onclick="tfDia('hoje',this)">Hoje</button>
        <button class="btn-rap tf-dt" data-tfd="amanha" onclick="tfDia('amanha',this)">Amanhã</button>
        <button class="btn-rap tf-dt" data-tfd="7" onclick="tfDia('7',this)">+7 dias</button>
        ${/* a data some até ser pedida: só o botão fica, e ele abre o campo */""}
        <button class="btn-rap tf-dt" id="tf-escolher" onclick="tfEscolherData(this)" title="escolher a data no calendário">Escolher</button>
        <input type="date" class="tf-data" id="tf-data" style="display:none" onchange="tfDia(this.value,this)">
        <button class="btn-rap tf-dt" data-tfd="sem" onclick="tfDia('sem',this)" title="registrar sem data nenhuma">sem data</button>`;
  // F116 · a mesma data tem três naturezas. O prazo FATAL é o ⏰ da esquerda;
  // aqui se escolhe entre o COMPROMISSO, que é trabalho marcado para o dia, e
  // o LEMBRETE, que é só um aviso. A escolha ocupa o lugar do antigo rótulo.
  const natChips = `<span class="tf-nat">${["compromisso","lembrete"].map(n=>
          `<button class="btn-rap tf-nt ${tfNatureza===n?"on":""}" data-nat="${n}" onclick="tfNat('${n}',this)"
            title="${n==="compromisso"?"trabalho marcado para este dia, por exemplo escrever a petição"
                                      :"só um aviso neste dia, por exemplo voltar a olhar a aposentadoria futura"}">${n}</button>`).join("")}</span>`;
  const ferr = `<span class="esc-ferr">
          <input type="file" id="arq-inp" accept="image/*,application/pdf" capture="environment"
            style="display:none" onchange="anexar('${k.id}','${k.cliente_id}')">
          <button class="esc-ic" onclick="document.getElementById('arq-inp').click()"
            title="anexar: foto do documento ou arquivo"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11.5 12.2 19.3a4.6 4.6 0 0 1-6.5-6.5l8.3-8.3a3 3 0 0 1 4.3 4.3l-8.2 8.2a1.5 1.5 0 0 1-2.1-2.1l7.5-7.5"/></svg></button>
          <button class="esc-ic" onclick="menuArroba(event)" style="font-weight:800;font-size:13px"
            title="@ mencionar um colega: ele recebe esta anotação na caixa 📥 Menções">@</button>
          <button class="esc-ic" onclick="janelaDocsAnotacao()"
            title="solicitar documentos no meio do atendimento: marca na lista do benefício, entra na anotação e vira checklist — sem apagar o que você já digitou"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 3.5H7A1.8 1.8 0 0 0 5.2 5.3v13.4A1.8 1.8 0 0 0 7 20.5h10a1.8 1.8 0 0 0 1.8-1.8V8.8l-5.3-5.3Z"/><path d="M13.5 3.5V9h5.3M9 13.5h6M9 17h4"/></svg></button>
          <button class="esc-ic imp ${k.importante?"on":""}" onclick="toggleImp('${k.id}')" title="marcar o processo como importante"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3.3 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.5l5.9-.8L12 3.3Z"/></svg></button>
          <button class="esc-ic urg ${k.urgente?"on":""}" onclick="toggleUrg('${k.id}')" title="marcar o processo como urgente"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5c.4 2.6-1 4.1-2.3 5.6C8.4 10.6 7.5 12.1 7.5 14a4.5 4.5 0 0 0 9 0c0-1.6-.7-3-1.7-4.2-.2 1.1-.8 2-1.8 2.5.6-2.6-.1-5.6-1-8.8Z"/></svg></button>
          <button type="button" class="btn-rap esc-desc" id="and-descartar" hidden onclick="descartarEscrita('${k.id}')" title="Apagar o texto escrito e o rascunho guardado">Descartar</button>
          ${v10?"":`<button class="esc-reg" onclick="novoAndamento('${k.id}')">Registrar</button>`}
        </span>`;
  // F38 · a anotação que É prazo processual: marca, dá a data fatal, e o
  // caso move para 🗓 Tarefas com Prazo. F104 · prazo sem anotação de origem
  // não vira quadro: o convite a explicá-lo mora aqui, ao lado da data fatal
  const prazoRow = listaDe(k)!=="🗓 Tarefas com Prazo"
    ? `<label class="conta-ck" title="prazo fatal: o dia em que o direito morre. O caso vai para 🗓 Tarefas com Prazo, ordenado pela data fatal">
          <input type="checkbox" id="and-prazo-ck"
            onchange="document.getElementById('and-prazo-data').style.display=this.checked?'inline-block':'none';
              document.getElementById('and-prazo-mais').style.display=this.checked?'inline-flex':'none';
              if(this.checked&&prazoDetectado)document.getElementById('and-prazo-data').value=prazoDetectado;">
          ⏰ PRAZO FATAL</label>
        <input type="date" id="and-prazo-data" min="${hoje()}" style="display:none" title="a data fatal do prazo">
        <span id="and-prazo-mais" style="display:none">${catalogoPrazoHtml("and","and-prazo-data")}</span>`
    : `<span class="chip" style="background:#FDF3E7;color:#9C4607">⏰ em 🗓 Tarefas com Prazo${k.prazo?` · fatal ${fmt(k.prazo)}`:""}</span>
        ${/* F104 · prazo sem anotação de origem não vira quadro: o convite a
             explicá-lo mora aqui, ao lado da data fatal */""}
        ${(temaV10() && k.prazo && !origemDoPrazo(k))?`<button class="btn-mini" onclick="explicarPrazo('${k.id}')"
          title="este prazo não tem anotação dizendo do que é — escreva, e ele vira quadro de prazo"><span aria-hidden="true">✎ Explicar</span><span class="sr-only">✎ explicar o prazo</span></button>`:""}
        <button class="btn-mini" onclick="janelaPrazoCumprido('${k.id}')"
          title="cumpriu o prazo: devolve o caso à lista de onde veio (dá para trocar)"><span aria-hidden="true">✔ Cumprido</span><span class="sr-only">✔ prazo cumprido</span></button>`;
  const sugBt = `<button class="sug-abrir" id="sug-abrir" onclick="alternarSugestoes('${k.id}')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.3 17.5h5.4M10 20.5h4M12 3.5a5.5 5.5 0 0 0-3.2 10c.5.4.8 1 .8 1.6h4.8c0-.6.3-1.2.8-1.6A5.5 5.5 0 0 0 12 3.5Z"/></svg> ${v10?"Sugestões":"Sugestões de anotações"}</button>`;
  const caixas = `<div id="sug-box" class="sugestoes" style="display:none"></div>
      <div id="preenche-box" style="display:none;border:1px solid var(--borda);border-radius:8px;background:var(--branco);margin-top:6px;padding:10px"></div>
      <div id="exig-box" style="display:none;border:1px solid #f0c36d;border-radius:8px;background:#fffaf0;margin-top:6px;padding:10px">
        <strong style="font-size:13px">⚠ Registrar exigência do INSS</strong>
        <div class="form-linha" style="margin-top:6px">
          <input id="ex-desc" placeholder="o que o INSS exigiu?" style="flex:1;min-width:200px">
          <label style="font-size:12px;color:var(--cinza)">prazo final: <input type="date" id="ex-prazo"></label>
          <button onclick="novaExigencia()" title="Registrar exigência"><span aria-hidden="true">Exigência</span><span class="sr-only">Registrar exigência</span></button>
        </div>
      </div>`;
  // F182 · canvas "Casos e anotações": três chaves (Tarefa, Prazo fatal,
  // Lembrete), cada uma abre o seu quadro, e a frase "Ao registrar" diz antes
  // do clique o que vai nascer. Tarefa e Lembrete são as duas naturezas da
  // F116 (uma exclui a outra); desligadas as duas, a anotação vai sem tarefa.
  // teste 11.88, REC-06: no compositor de chaves a Tarefa nasce desligada, e a anotação simples grava sem clique a mais
  if(v10 && !tfTocado){ tfNatureza = null; tfQuem = []; tfData = null; }
  const tg = (nat, rot, dica) => `<button class="esc-tg tf-nt ${tfNatureza===nat?"on":""}" data-nat="${nat}"
          aria-pressed="${tfNatureza===nat}" onclick="tfNat('${nat}',this)" title="${dica}">${rot}</button>`;
  const prazoTg = listaDe(k)!=="🗓 Tarefas com Prazo"
    ? `<label class="esc-tg esc-tg-pz" title="prazo fatal: o dia em que o direito morre. O caso vai para 🗓 Tarefas com Prazo, ordenado pela data fatal">
          <input type="checkbox" id="and-prazo-ck" onchange="pzToggle(this)">Prazo<span class="sr-only"> fatal</span></label>`
    : prazoRow;
  const pessoas = `${equipeAtiva().map(co=>`<button class="esc-pill fx-av tf-eq"
          data-tfp="${co.id}" style="--cor-eq:${co.cor}" title="${esc(co.nome)}"
          onclick="tfPessoa('${co.id}',this)">${esc(co.nome.split(" ")[0])}</button>`).join("")}
        <button class="esc-pill tf-todos" id="tf-todos" onclick="tfTodos()" title="a equipe inteira: uma tarefa para cada colaborador ativo">todos</button>
        ${seletorRevisor("tf-rev")}`;
  const quando = [["hoje","Hoje"],["amanha","Amanhã"],["3","+3 dias"],["7","+7 dias"]].map(([q,r])=>
          `<button class="esc-pill btn-rap tf-dt" data-tfd="${q}" onclick="tfDia('${q}',this)">${r}</button>`).join("")
        + `<button class="esc-pill btn-rap tf-dt" id="tf-escolher" onclick="tfEscolherData(this)" title="escolher a data no calendário">Escolher</button>
        <input type="date" class="tf-data" id="tf-data" style="display:none" onchange="tfDia(this.value,this)">`;
  const escrever = v10
    ? `${encerrado ? "" : sugAnotBox(k)}<div class="escrever esc-v12">
      ${area}${encerrado ? "" : botaoGravarCaso(k)}
      <div class="esc-barra" id="tf-box">
        <div class="esc-linha esc-tgs">${chips}<span class="esc-sep" aria-hidden="true"></span>${tg("compromisso","Tarefa","trabalho marcado para alguém num dia")}${prazoTg}${tg("lembrete","Lembrete","só um aviso no dia, por padrão para você")}${ferr}<button class="esc-ic esc-mais-ic" aria-expanded="false" onclick="const l=this.parentNode;l.classList.toggle('ics');this.setAttribute('aria-expanded',l.classList.contains('ics'))" title="Mais: anexar, mencionar, documentos, importante">⋯<span class="sr-only"> mais</span></button></div>
        <div class="esc-pnl esc-pnl-tf" id="esc-pnl-tf"${tfNatureza?"":" hidden"}>
          <span class="rotulo-rap">Quem faz</span><span class="esc-pes">${pessoas}</span>
          <span class="rotulo-rap esc-quando">Quando</span><span class="esc-pes">${quando}</span>
          <span class="rotulo-rap">Repetir</span><span class="esc-pes"><select id="tf-rep" class="tf-rev tf-rep" title="a tarefa renasce sozinha ao ser concluída">${REPETIR_OPC.map(([c,r])=>`<option value="${c}">${r}</option>`).join("")}</select>
          <label class="tf-rep-apos" title="conta da conclusão, e não da data da tarefa"><input type="checkbox" id="tf-rep-apos"> depois de concluir</label></span></div>
        ${listaDe(k)!=="🗓 Tarefas com Prazo" ? painelPrazoEscrever(k) : ""}
        <div class="esc-linha esc-fim"><span class="esc-frase" id="esc-frase"></span>
          <div class="tipo-fila" id="tipo-fila">${umClique}${sugBt}<span class="esc-dica" aria-hidden="true">Tarefa · Prazo · Lembrete</span></div>
          <button class="esc-reg" onclick="novoAndamento('${k.id}')">Registrar</button></div>
      </div>
      <div id="and-prazo-chip"></div>
      ${caixas}
    </div>`
    : `${encerrado ? "" : sugAnotBox(k)}<div class="escrever">
      <div class="tipo-fila" id="tipo-fila">${chips}${umClique}</div>
      ${area}${encerrado ? "" : botaoGravarCaso(k)}
      <div class="esc-barra" id="tf-box">
        <span class="rotulo-rap">TAREFA PARA</span>${atribuir}
        <span class="tf-sep"></span>
        ${natChips}<span class="rotulo-rap">EM</span>${lembrar}
        ${ferr}
      </div>
      <div id="and-prazo-chip"></div>
      <div class="form-linha" style="margin-top:4px;align-items:center">${prazoRow}</div>
      ${sugBt}
      ${caixas}
    </div>`;
  return `${caixaCadunico(k, D.cliPorId.get(k.cliente_id))}
  <div class="caso-acoes">
    <div id="lembrar-box" style="display:none;border:1px solid #E9B44C;border-radius:8px;background:var(--branco);margin-top:8px;padding:10px"></div>
    ${encerrado ? `<p class="meio-sub" style="margin:2px 0 0">✔ Processo encerrado — comentários desativados. <button class="btn-mini" onclick="reabrirCaso('${k.id}')"
      title="reabre na lista de origem, com registro de quem reabriu">↺ Reabrir<span class="sr-only"> o caso</span></button> para voltar a comentar.</p>`
      : (k.fase==="encerrado" ? `<p class="meio-sub" style="margin:2px 0 4px">Caso encerrado com honorário em aberto: anote aqui a cobrança e a conversa sobre ela.</p>` : "") + escrever}
  </div>
  ${caixaArquivos(k)}
  ${/* os comentários do INSS têm aba própria (🌻) e os movimentos do PJe
       têm a aba ⚖️ CNJ; aqui fica só a conversa do escritório — misturados,
       ninguém achava nem uma coisa nem outra */""}
  `;
}
// F111 · no tema v10 o compositor mora FORA dos painéis (entre os quadros de
// prazo e o menu dos andamentos), e o menu fica entre onde se escreve e o que
// se lê. Fora do tema, cada painel segue trazendo o seu compositor.
const composerNoPainel = k => temaV10() ? "" : composerCaso(k);
function painelEscritorio(k, ands){
  return composerNoPainel(k) + `
  ${linhaDoTempo(ands.filter(a=>!ehComentarioPat(a) && a.origem!=="pje"))}`;
}
// F45 · UMA estrutura para toda linha do tempo oficial (INSS, Recurso, CNJ,
// PJe, Caso completo): dias em pílula, cartão com a FONTE e a hora, decisões
// destacadas — o mesmo esqueleto da conversa do Escritório. O conteúdo é
// registro oficial (sem vistos/tarefas: registro não se responde); os botões
// de cada aba entram prontos pelo campo html.
// item: {q:"AAAA-MM-DD[THH:MM]", em:emoji, rot:fonte, texto, forte, cls, html}
// ══════════════════════════════════════════════════════════════════════════
// F190 · O CARTÃO DO ANDAMENTO OFICIAL (canvas "Andamentos e documentos do
// caso", aprovado pelo Paulo em 10.10.2026). Um só desenho para INSS, CRPS,
// PJe, e-SAJ e eproc, em qualquer aba: cabeçalho com a fonte, o texto, o
// documento que veio com o movimento (Abrir · Ler com Claude), o prazo que o
// ato sugere e a barra. Na barra, o botão cheio é "Criar tarefa ou prazo" (a
// ação mais usada); ao lado, abrir no portal e mensagem ao cliente; no fim,
// ✓ lido, ⭐, ⚡ e o ⋯ com o que é raro (perícia, copiar, não é deste caso).
// ══════════════════════════════════════════════════════════════════════════
const ORIGENS_OFICIAIS = ["pat","pje","crps"];
const IC_SVG = {
  ok:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>`,
  mais:`<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>`,
  ir:`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>`,
  doc:`<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>`,
  claude:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>`,
  relogio:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  ciente:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M7 11v9H4v-9zM7 11l4-8a2 2 0 0 1 2 2v4h6a2 2 0 0 1 2 2.3l-1.4 7A2 2 0 0 1 17.6 20H7"/></svg>`,
};
const ehOficial = a => !!(a && ORIGENS_OFICIAIS.includes(a.origem));
// expedição, juntada, conclusão… — o que não pede leitura nem ação
const RX_ROTINA = /^(expedi[çc][ãa]o|juntada|conclus|remetid|recebid|certid|decorrid|ato ordinat|mandado|confirmada a intima|redistribu|arquivad|desarquivad|documento juntado|baixa definitiva)/i;
const RX_NAO_ROTINA = /acordo|c[áa]lculo|laudo|senten|decis|ac[óo]rd|per[ií]cia|audi[êe]n|contesta|alvar|rpv|precat|julg|tutela|liminar|prazo|intima|cita[çc]/i;
function ehRotina(x){
  const a = x && x.and;
  if(!a || a.origem!=="pje" || x.forte || a.importante || a.urgente) return false;
  const t = String(x.texto||"");
  if(!RX_ROTINA.test(t) || RX_NAO_ROTINA.test(t)) return false;
  if((D.anexos||[]).some(an=>an.andamento_id===a.id)) return false;
  if(prazoSugeridoHtml(a, -1)) return false;
  return !(D._andsFicha||[]).some(f=>f.responde_a===a.id && !f.excluir);
}
// o portal de onde o movimento veio, para abrir em um clique
function portalDoAndamento(a, k){
  k = k || {};
  if(a.origem==="pje"){ const l = linkPjeDoAndamento(a, k); return l ? {href:l, rot:nomeSistemaDoLink(l)} : null; }
  if(a.origem==="crps"){
    const n = nupNoTexto(a.texto) || soDig(String(a.origem_id||"").split("|")[0]) || crpsNups(k)[0];
    return {href:linkERecursos(n), rot:"e-SISREC"};
  }
  if(a.origem==="pat"){
    const prot = (String(a.origem_id||"").match(/:(\d{6,})/)||[])[1] || soDig((k.protocolos||[])[0]||"");
    const href = k.processo_link || (prot ? PAT_TAREFA+prot : null);
    return href ? {href, rot:"PAT"} : null;
  }
  return null;
}
// o prazo que o ato sugere (F159), só enquanto ninguém marcou prazo para ele
function prazoSugeridoHtml(a, segI){
  if(a.origem!=="pje" && a.origem!=="crps") return "";
  const sg = sugestaoDoAto(a); if(!sg) return "";
  if((D._andsFicha||[]).some(f=>f.responde_a===a.id && !f.excluir && /\[PRAZO /.test(f.texto||""))) return "";
  const mv = movimentoJudicial(a.texto);
  // F236 · o ato favorável não pede recurso nosso: o cartão diz isso e o que vigiar, sem "Criar prazo" (e não conta
  // como prazo sugerido nas contagens, que chamam com segI < 0)
  // F236 · e a vigia do recurso do INSS sai quando ele já recorreu (o movimento do recurso depois da sentença) ou quando a
  // data estimada passou: o cartão de mais de um ano não manda vigiar o que já veio
  if(sg.favoravel){
    if(segI<0) return "";
    const recI = mv && (D._andsFicha||[]).filter(y=>y.caso_id===a.caso_id && y.id!==a.id && y.origem==="pje").map(y=>movimentoJudicial(y.texto))
      .filter(m=>m && m.data>=mv.data && /recurso|apela/.test(dsa(m.ato||""))).sort((p,q)=>p.data.localeCompare(q.data))[0];
    const viva = sg.vigia && !recI && sg.vigia>=hoje();
    const passo = viva ? sg.passo : String(sg.passo||"").replace(/ e vigiar o recurso do INSS\./, ".").replace(recI ? / Conferir a implantação\./ : /^$/, "");
    return `<span class="tl-prazo-sug tl-prazo-fav">${IC_SVG.relogio}<span>${esc(passo)}${recI?` O INSS recorreu em ${fmt(recI.data)} (${esc(recI.ato)}).`:""}${
      sg.trib?` O expediente do ${esc(ROT_PRAZO[sg.trib.sistema]||"tribunal")}${sg.trib.ciencia_em?` (ciência em ${fmt(sg.trib.ciencia_em)})`:""} é só para ciência.`:""}${
      viva?` O INSS pode recorrer até <b>${fmt(sg.vigia)}</b> (estimado).`:""}</span></span>`;
  }
  // F236 · a peça já foi protocolada depois do movimento, ou a equipe decidiu não recorrer: nada a sugerir
  if(mv && (respondidoDepois(a, mv) || naoRecorrer(a, mv))) return "";
  const item = PRAZOS_CATALOGO.find(x=>x.id===sg.cat);
  const fatal = sg.prazo || (item ? contarPrazo(sg.de, item) : "");
  if(!fatal || fatal < hoje()) return "";
  // F236 · com o prazo do tribunal para o ato, a data é a dele (contada da ciência), e não a do catálogo contada do movimento
  const sis = sg.trib ? (ROT_PRAZO[sg.trib.sistema]||"tribunal") : "";
  const rot = sg.trib ? `${item ? item.rot : (sg.trib.ato||"Prazo")} — o prazo do ${sis}` : (item ? item.rot : "prazo citado no texto");
  const tit = sg.trib ? `o ${sis} deu ${sg.trib.dias||"?"} dias (${sg.trib.ato||"intimação"})${sg.trib.ciencia_em?`: ciência em ${fmt(sg.trib.ciencia_em)}`:""}, vence ${fmt(fatal)}`
    : `contado da data do movimento (${fmt(sg.de)}); confira a data da intimação ao criar`;
  return `<span class="tl-prazo-sug" title="${esc(tit)}">${IC_SVG.relogio}
    <span>Prazo sugerido: <b>${esc(rot)}</b> · vence <b>${fmt(fatal)}</b></span>
    <button class="tl-bt forte" onclick="abrirSeguimento(${segI})" title="Criar prazo"><span aria-hidden="true">Prazo</span><span class="sr-only">Criar prazo</span></button></span>`;
}
// uma linha de documento dentro do cartão: nome, páginas e leitura, Abrir e Ler com Claude
// F191 · documento com texto (lerId): o nome lê, como a linha do conteúdo
function docRow(nome, sub, abrirJs, claudeJs, lerId){
  const n = `<b>${esc(nome||"documento")}</b>`;
  return `<span class="tl-doc"><span class="tl-doc-ic">${IC_SVG.doc}</span>
      <span class="tl-doc-nome">${lerId?`<button type="button" class="tl-doc-ler" data-ato="anexo:${esc(lerId)}" onclick="lerAto('anexo:${escJs(lerId)}')">${n}</button>`:n}${sub?`<small>${esc(sub)}</small>`:""}</span>
      <span class="tl-doc-bts"><button class="tl-bt" onclick="${abrirJs}">Abrir</button>
      <button class="tl-bt" onclick="${claudeJs}">${IC_SVG.claude}<span aria-hidden="true">Claude</span><span class="sr-only">Ler com Claude</span></button></span></span>`;
}
// o documento que veio com o movimento, dentro do cartão
function docsDoCartao(a){
  return (D.anexos||[]).filter(x=>x.andamento_id===a.id).map(x=>{
    const decide = /senten[cç]|decis[aã]|despach|ac[oó]rd[aã]|monocr|laudo|julgad[oa] |homologa|DESPADEC|\bSENT\d|\bACOR\d|\bLAUDO\d|ato ordinat|\bATOORD\d/i.test(x.nome||"")   // F236 · e o ato ordinatório
                   && !/^\s*certid/i.test(x.nome||"");
    const disp = decide ? dispositivoDe(doTribunal(x) ? miolDoAto(x.texto) : x.texto) : "";
    const pi = Array.isArray(x.paginas_imagem) ? x.paginas_imagem : null;
    const leitura = !x.texto && /pdf|image/.test(x.tipo||"") ? "digitalizado" : pi && pi.length ? `${pi.length} pág. em imagem` : x.texto ? "com texto" : "";
    return docRow(x.nome, `${x.paginas?`${x.paginas} pág. · `:""}${leitura}`, `abrirAnexo('${escJs(x.id)}')`, `menuClaudeDocs('${escJs(a.caso_id)}',['anexo:${escJs(x.id)}'])`, x.texto ? x.id : null)
      + (disp ? `<span class="tl-disp">${esc(disp)}</span>` : "");
  }).join("");
}
// ══════════════════════════════════════════════════════════════════════════
// F191 · O CONTEÚDO DO MOVIMENTO (pedido do Paulo, 11.10.2026). "Expedida/
// certificada a intimação eletrônica", "Expedição de Outros documentos" e
// "Disponibilizado no DJ Eletrônico" dizem que houve comunicação, não o que se
// comunicou, e obrigavam a abrir o processo. O que se comunica é o ATO mais
// recente do mesmo processo: na cronologia real do PJe ele é juntado no mesmo
// minuto ou dias antes (medido nas coletas de 11.10.2026). O cartão ganha uma
// linha com esse ato; passar o mouse mostra o texto, clicar abre a leitura
// inteira. Nada se grava: tudo sai do que a ficha já carregou.
// ══════════════════════════════════════════════════════════════════════════
const RX_COMUNICA = /expedida\/certificada a intima|expedi[çc][ãa]o de|disponibilizad[oa] no d|publicad[oa] .{0,60}\bem \d{2}\/\d{2}\/\d{4}|certid[ãa]o de publica|remetid[oa] ao dje?\b|confirmada a intima|intima[çc][ãa]o eletr/i;
// é ato o documento ("Despacho", "DESPADEC1") ou o movimento ("Despacho
// Proferido" do e-SAJ, "Juntada de ato ordinatório" do PJe) que decide ou ordena
const RX_ATO = /senten[cç]|decis[aã]o|despach|ac[oó]rd[aã]o|monocr[aá]tic|julgad[oa] |homologad|ato ordinat|\b(?:concedid|deferid|indeferid|denegad|negad|extint|revogad|acolhid|rejeitad)[oa]|DESPADEC|\bSENT\d|\bACOR\d|\bDEC\d|\bVOTO\d|\bATOORD\d/i;
// "Conclusos para decisão", "Transitado em julgado", "Evoluída a classe para
// cumprimento de sentença" e as juntadas de parte citam o ato, mas não são ato
const RX_NAO_ATO = /^\s*(?:certid|conclus|transitad|evolu|remetid|recebid|redistribu|arquivad|desarquivad|decorrid|distribu|autuad|juntada de (?:peti|comprovante|certid|ar\b|aviso|mandado|documento|laudo|contesta|manifesta))/i;
const ehAto = s => RX_ATO.test(s||"") && !RX_NAO_ATO.test(s||"") && !RX_COMUNICA.test(s||"");
function tipoDoAto(s){
  const t = String(s||"");
  return /ato ordinat|ATOORD/i.test(t) ? "ato ordinatório" : /DESPADEC/i.test(t) ? "despacho ou decisão"
    : /despach/i.test(t) ? "despacho" : /monocr/i.test(t) ? "decisão monocrática" : /decis[aã]o|\bDEC\d/i.test(t) ? "decisão"
    : /ac[oó]rd[aã]o|\bACOR\d|\bVOTO\d/i.test(t) ? "acórdão" : /senten|\bSENT\d|julgad|homolog/i.test(t) ? "sentença" : "ato";
}
const casaTipo = (x, y) => x===y || x.includes(y) || y.includes(x);
const capital = s => String(s||"").charAt(0).toUpperCase() + String(s||"").slice(1);
// texto em UTF-8 lido como Latin-1 ("CÃVEL", "1Âª") volta ao acento.
// shortcut: só a faixa Latin-1; maiúscula vinda por Windows-1252 fica como veio
const consertarAcentos = s => /Ã[\u0080-¿]|Â[ -¿]/.test(s)
  ? s.replace(/Ã([\u0080-¿])/g, (_, c)=>String.fromCharCode(c.charCodeAt(0)+64)).replace(/Â([ -¿])/g, "$1") : s;
// o miolo do ato: sem o cabeçalho (tribunal, vara, partes, advogados) e sem o
// rodapé da assinatura, que são o que a leitura rápida não precisa
const RX_TITULO_ATO = /^(?:d\s?e\s?s\s?p\s?a\s?c\s?h\s?o|d\s?e\s?c\s?i\s?s\s?[ãa]\s?o|s\s?e\s?n\s?t\s?e\s?n\s?[çc]\s?a|ato ordinat[óo]rio|ac[óo]rd[ãa]o|despacho\s*\/\s*decis[ãa]o|termo de audi[êe]ncia)\b.{0,40}$/i;
const RX_PARTE_ATO = /^(?:autor|r[ée]u|impetrante|impetrad[oa]|recorrente|recorrid[oa]|requerente|requerid[oa]|exequente|executad[oa]|interessad[oa]|apelante|apelad[oa]|agravante|agravad[oa]|embargante|embargad[oa]|advogad[oa]|processo|classe|assunto|ju[ií]z)[^:\n]{0,40}:/i;
const RX_FIM_ATO = /data da assinatura eletr|^\(?assinad[oa] (?:eletr|digit)|^documento assinado|^n[úu]mero do documento/i;
const RX_MARGEM = /^(?:este documento [ée] c[óo]pia do original|para conferir o original|fls\.\s*\d+\s*$)/i;
function miolDoAto(texto){
  const ls = consertarAcentos(String(texto||"")).split(/\n+/).map(s=>s.trim()).filter(s=>s && !RX_MARGEM.test(s));
  const topo = ls.slice(0, 40);
  let ini = topo.findIndex(s=>RX_TITULO_ATO.test(s));
  if(ini<0) ini = topo.reduce((u, s, i)=>RX_PARTE_ATO.test(s) ? i : u, -1);
  let corpo = ls.slice(ini+1);
  while(corpo.length>1 && RX_PARTE_ATO.test(corpo[0])) corpo.shift();
  const fim = corpo.findIndex(s=>RX_FIM_ATO.test(s));
  if(fim>0) corpo = corpo.slice(0, fim);
  const t = corpo.join("\n").trim();
  return t.length>=20 ? t : ls.join("\n");
}
const doTribunal = x => /^(pje|eproc|esaj)\//.test((x && x.caminho) || "");
// o processo do movimento: o último número CNJ do texto (a classe do e-SAJ tem
// várias palavras, "Procedimento Comum Cível", e escapa do RX_CNJ_FIM)
const numDoMov = y => { const ns = String((y && y.texto) || "").match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/g); return ns ? soDig(ns[ns.length-1]) : ""; };
const RX_CLASSE_FIM = /\s+—\s+[^—]*\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\s*$/;
// os atos de um processo do caso: os documentos (com texto, quando veio) e os
// movimentos que são ato sem documento (o ato ordinatório que não desceu, o
// despacho do e-SAJ, cujo teor vem no próprio movimento)
function atosDoProcesso(casoId, dig){
  const ands = (D._andsFicha||[]).filter(y=>y.caso_id===casoId && y.origem==="pje" && !y.excluir);
  const porId = new Map(ands.map(y=>[y.id, y])), comDoc = new Set(), out = [];
  for(const x of (D.anexos||[])){
    if(x.caso_id!==casoId || !ehAto(x.nome)) continue;
    const y = x.andamento_id ? porId.get(x.andamento_id) : null;
    const seg = String(x.caminho||"").split("/");
    if((y ? numDoMov(y) : doTribunal(x) ? seg[1] : "") !== dig) continue;
    if(y) comDoc.add(y.id);
    // sem andamento, o documento só sabe o dia (gravarDocsDaColeta o data ao meio-dia)
    out.push({q: y ? movPjeLimpo(y).q : qSP(x.criado_em).slice(0,10), nome:x.nome,
              texto: doTribunal(x) ? miolDoAto(x.texto) : String(x.texto||"").trim(), anexo:x, and:y});
  }
  for(const y of ands){
    if(comDoc.has(y.id)) continue;
    if(numDoMov(y)!==dig) continue;
    const l = movPjeLimpo(y), i = l.texto.indexOf(" — "), titulo = i>0 ? l.texto.slice(0, i) : l.texto;
    const ato = titulo.split(" · ").map(s=>s.replace(/^📎\s*/, "")).find(ehAto);
    if(!ato) continue;
    const teor = i>0 ? l.texto.slice(i+3).replace(RX_CLASSE_FIM, "").trim() : "";
    out.push({q:l.q, nome:ato, texto: teor.length>=60 ? teor : "", and:y});
  }
  return out;
}
// o ato que o movimento de comunicação comunica: o mais recente do mesmo
// processo, até 30 dias antes; "Publicado Despacho em…" diz o tipo
function atoDoMovimento(a){
  if(!a || a.origem!=="pje" || (D.anexos||[]).some(x=>x.andamento_id===a.id)) return null;
  const l = movPjeLimpo(a), i = l.texto.indexOf(" — "), titulo = i>0 ? l.texto.slice(0, i) : l.texto;
  const segs = titulo.split(" · ").map(s=>s.replace(/^📎\s*/, ""));
  // o e-SAJ que já traz o teor no próprio movimento não precisa de nada
  if(!segs.some(s=>RX_COMUNICA.test(s)) || segs.some(ehAto) || /teor do ato/i.test(l.texto)) return null;
  const dig = numDoMov(a), dia = l.q.slice(0,10), hora = l.q.slice(11,16);
  if(!dig || !dia) return null;
  const pub = /publicad[oa]\s+(.+?)\s+em\s+\d{2}\/\d{2}\/\d{4}/i.exec(titulo);
  const tipo = pub ? tipoDoAto(pub[1]) : null, desde = somaDias(dia, -30);
  const cs = atosDoProcesso(a.caso_id, dig).filter(o=>{
    const d = o.q.slice(0,10), h = o.q.slice(11,16);
    if(!d || d<desde || d>dia || (d===dia && h && hora && h>hora)) return false;
    return !tipo || casaTipo(tipoDoAto(o.nome), tipo);
  }).sort((x,y)=>y.q.localeCompare(x.q));     // o mais novo; no dia, o que tem hora antes do que só tem a data
  const o = cs[0];
  if(!o || o.texto) return o || null;
  // o ato do dia sem texto e o documento do mesmo dia, sem andamento, costumam ser um só
  return cs.find(x=>x.texto && x.q.slice(0,10)===o.q.slice(0,10) && casaTipo(tipoDoAto(x.nome), tipoDoAto(o.nome))) || o;
}
function atoDoCartaoHtml(a){
  const o = atoDoMovimento(a); if(!o) return "";
  const rot = `${capital(tipoDoAto(o.nome))} de ${fmt(o.q.slice(0,10)).slice(0,5)}`;
  if(!o.texto) return `<span class="tl-ato sem">${IC_SVG.doc}<span>Conteúdo: <b>${esc(rot)}</b>, sem o texto no CRM</span></span>`;
  return `<button type="button" class="tl-ato" data-ato="and:${esc(a.id)}" onclick="lerAto('and:${escJs(a.id)}')">${IC_SVG.doc}<span>Conteúdo: <b>${esc(rot)}</b></span> <span class="tl-ato-ler">ler</span></button>`;
}
// "and:<andamento>" é o ato que o movimento comunica; "anexo:<id>", o próprio documento
function atoPelaChave(ch){
  const [tipo, id] = String(ch||"").split(":");
  if(tipo==="and") return atoDoMovimento((D._andsFicha||[]).find(x=>x.id===id));
  const x = (D.anexos||[]).find(y=>y.id===id); if(!x) return null;
  const y = x.andamento_id ? (D._andsFicha||[]).find(z=>z.id===x.andamento_id) : null;
  return {q: y && y.origem==="pje" ? movPjeLimpo(y).q : qSP(y ? y.criado_em : x.criado_em), nome:x.nome,
          texto: doTribunal(x) ? miolDoAto(x.texto) : String(x.texto||"").trim(), anexo:x, and:y};
}
// a prévia: o ato curto inteiro; o longo, pelo dispositivo, ou começo e fim
function previaDoAto(t){
  t = String(t||"").trim();
  if(t.length<=1000) return t;
  if(RE_DISPOSITIVO.some(re=>t.search(re)>=0)) return "[…] " + dispositivoDe(t);
  return `${t.slice(0, 520).trim()} […] ${t.slice(-380).trim()}`;
}
let _popAto = null, _popT = 0;
const _hoverFino = matchMedia("(hover:hover) and (pointer:fine)");
function mostrarPopAto(el){
  const o = atoPelaChave(el.dataset.ato); if(!o || !o.texto) return;
  if(!_popAto){ _popAto = document.createElement("div"); _popAto.id = "pop-ato"; _popAto.setAttribute("role", "tooltip"); }
  if(!_popAto.isConnected) document.body.appendChild(_popAto);
  _popAto.innerHTML = `<b class="pop-ato-tit">${esc(capital(tipoDoAto(o.nome)))} · ${esc(fmt(o.q.slice(0,10)))}</b>
    <span class="pop-ato-txt">${esc(previaDoAto(o.texto))}</span><small>Clique para ler o texto inteiro</small>`;
  _popAto.hidden = false;
  const r = el.getBoundingClientRect(), w = Math.min(460, innerWidth - 24);
  _popAto.style.width = w + "px";
  _popAto.style.left = Math.max(12, Math.min(r.left, innerWidth - w - 12)) + "px";
  const h = _popAto.offsetHeight;
  _popAto.style.top = (r.bottom + 8 + h <= innerHeight - 8 ? r.bottom + 8 : Math.max(8, r.top - 8 - h)) + "px";
  el.setAttribute("aria-describedby", "pop-ato");
}
function esconderPopAto(){ clearTimeout(_popT); if(_popAto) _popAto.hidden = true; }
// só onde há mouse: no toque, o clique já abre a leitura
document.addEventListener("pointerover", e=>{
  const el = e.target.closest && e.target.closest("[data-ato]");
  if(!el || !_hoverFino.matches) return;
  clearTimeout(_popT); _popT = setTimeout(()=>mostrarPopAto(el), 250);
});
document.addEventListener("pointerout", e=>{
  const el = e.target.closest && e.target.closest("[data-ato]");
  if(el && !el.contains(e.relatedTarget)) esconderPopAto();
});
// pelo teclado, o foco mostra a prévia como o mouse
document.addEventListener("focusin", e=>{
  const el = e.target.closest && e.target.closest("[data-ato]");
  if(el && el.matches(":focus-visible")) mostrarPopAto(el); else esconderPopAto();
});
document.addEventListener("keydown", e=>{ if(e.key==="Escape") esconderPopAto(); });
document.addEventListener("scroll", esconderPopAto, true);
// a leitura inteira, na caixa: o texto limpo, copiar, o original e o Claude
function lerAto(ch){
  esconderPopAto();
  const o = atoPelaChave(ch); if(!o || !o.texto) return;
  const x = o.anexo;
  caixa(`<div class="leitura-ato">
    <h3>${esc(capital(tipoDoAto(o.nome)))} · ${esc(fmt(o.q.slice(0,10)))}</h3>
    <p class="meio-sub">${esc(x ? x.nome : o.nome)}</p>
    <div class="leitura-txt" tabindex="0">${esc(o.texto)}</div>
    <div class="form-linha leitura-bts">
      <button class="tl-bt" onclick="copiar(document.querySelector('.leitura-txt').textContent,'Texto copiado')">Copiar</button>
      ${x ? `<button class="tl-bt" onclick="abrirAnexo('${escJs(x.id)}')" title="Abrir o original"><span aria-hidden="true">Original</span><span class="sr-only">Abrir o original</span></button>
      <button class="tl-bt" onclick="fecharCaixa();menuClaudeDocs('${escJs(x.caso_id)}',['anexo:${escJs(x.id)}'])">${IC_SVG.claude}<span aria-hidden="true">Claude</span><span class="sr-only">Ler com Claude</span></button>` : ""}
    </div></div>`);
}
// o que já se fez a partir do movimento, em pastilhas: "Tarefa · Amanda · até 13.10"
function feitoDoCartao(a){
  const fs = (D._andsFicha||[]).filter(x=>x.responde_a===a.id && !x.excluir);
  const out = [];
  for(const f of fs){
    const pz = /\[PRAZO (\d{2})\.(\d{2})\.(\d{4})\]\s*([^—.]*)/.exec(f.texto||"");
    if(pz) out.push(`<span class="tl-feito prazo">Prazo ${pz[1]}.${pz[2]}${pz[4].trim()?` · ${esc(pz[4].trim().slice(0,40))}`:""}</span>`);
    for(const tf of tarefasDe(f)){
      const c = D.colPorId.get(tf.colaborador_id) || {};
      out.push(`<span class="tl-feito${tf.concluida_em?" ok":""}">${tf.concluida_em?"Feita":"Tarefa"} · ${esc((c.nome||"?").split(" ")[0])} · ${tf.concluida_em?fmt(dataSP(tf.concluida_em)).slice(0,5):`até ${fmt(tf.lembrar_em).slice(0,5)}`}</span>`);
    }
    if(!pz && !tarefasDe(f).length) out.push(`<span class="tl-feito">Anotado · ${esc(((D.colPorId.get(f.autor_id)||{}).nome||"").split(" ")[0])}</span>`);
  }
  return out.length ? `<span class="tl-feitos">${out.join("")}</span>` : "";
}
// o ⋯ : o que é raro fica fora da vista, mas a um clique
function menuMais(itens){
  const vivos = itens.filter(Boolean); if(!vivos.length) return "";
  return `<details class="tl-mais"><summary class="tl-bt tl-bt-ic" aria-label="Mais ações" title="mais ações">${IC_SVG.mais}</summary>
    <span class="tl-mais-menu" role="menu">${vivos.join("")}</span></details>`;
}
document.addEventListener("click", e=>{
  document.querySelectorAll("details.tl-mais[open]").forEach(d=>{ if(!d.contains(e.target)) d.open=false; });
});
// Esc fecha o ⋯ e devolve o foco ao botão que o abriu
// (na captura e engolindo a tecla: o Esc da ficha não pode fechar o cliente junto)
document.addEventListener("keydown", e=>{
  if(e.key!=="Escape") return;
  const d = document.querySelector("details.tl-mais[open]"); if(!d) return;
  e.stopImmediatePropagation(); e.preventDefault();
  d.open = false; const sm = d.querySelector("summary"); if(sm) sm.focus();
}, true);
function msgAndamento(andId){
  const a = (D._andsFicha||[]).find(x=>x.id===andId); if(!a) return;
  const k = D.casoPorId.get(a.caso_id), l = andLimpo(a, k);
  // F236 · do movimento do CRPS não vai a linha "⚠", que é instrução da equipe (recurso especial, alçada); a
  // decisão vai explicada (resultado, prazo e caminhos), e não como o rótulo do e-Recursos
  if(a.origem==="crps"){
    const e = k && eventoDoAndCrps(a, k), pronta = e && (e.tipo==="decisao" ? msgDecisaoCrps(k, e) : e.tipo==="pauta" ? msgSessaoCrps(k) : "");
    if(pronta) return msgCliente(a.caso_id, "", "", "", pronta);
    l.texto = String(l.texto||"").split("\n⚠")[0].replace(/\s*\(ciência[^)]*\)/, "");
  }
  msgCliente(a.caso_id, {pat:"INSS", crps:"recurso no Conselho de Recursos", pje:"processo judicial"}[a.origem] || "processo", l.texto, (l.q||"").slice(0,10));
}
function msgCliente(casoId, fonte, texto, data, pronto){
  const k = D.casoPorId.get(casoId) || {}, c = D.cliPorId.get(k.cliente_id) || {};
  const txt = pronto || `Olá, ${(c.nome||"").split(" ")[0]}! Novidade no seu ${fonte}${data?` em ${fmt(data)}`:""}: ${String(texto||"").replace(/\.$/,"")}. Qualquer dúvida, estamos à disposição. Escritório Tercini.`;
  const tel = soDig(c.telefone||"");
  const wa = t => `https://wa.me/55${tel}?text=${encodeURIComponent(t)}`;
  caixa(`<h3 style="margin:0 0 6px">Mensagem ao cliente</h3>
    <p class="meio-sub" style="margin:0 0 8px">Confira e ajuste antes de enviar.</p>
    <label class="sr-so" for="msg-and">texto da mensagem</label>
    <textarea id="msg-and" rows="5" style="width:100%;font:inherit;padding:8px;border:1px solid var(--borda);border-radius:8px"
      ${tel?`oninput="document.getElementById('msg-wa').href='https://wa.me/55${tel}?text='+encodeURIComponent(this.value)"`:""}>${esc(txt)}</textarea>
    <div class="form-linha" style="margin-top:10px">
      <button class="tl-bt" onclick="fecharCaixa()">Cancelar</button>
      ${tel?`<a class="tl-bt tl-link" id="msg-wa" style="margin-left:auto" target="_blank" rel="noopener" href="${esc(wa(txt))}" aria-label="Abrir no WhatsApp">${iconeFonte("zap")} Abrir ${IC_SVG.ir}</a>`:""}
      <button class="tl-bt forte" ${tel?"":`style="margin-left:auto"`} onclick="copiar(document.getElementById('msg-and').value,'Mensagem copiada');fecharCaixa()">Copiar</button>
    </div>`);
  const ta = document.getElementById("msg-and"); if(ta) ta.focus();
}
// F190 · os espelhos sem linha de `andamentos` entram no mesmo cartão
// o link do processo no grau mais alto que a coleta já trouxe
const linkPjeMaisAlto = k => linkPjeDoCaso(k, Object.keys(linksPjeDoCaso(k)).filter(g=>linksPjeDoCaso(k)[g] && !g.includes("|")).sort().pop());
function oficCnj(k, txt, m, ch){
  const l = linkPjeMaisAlto(k);
  return { casoId:k.id, segTexto:txt, fonte:"processo judicial",
    portal: l ? {href:l, rot:nomeSistemaDoLink(l)} : null,
    antes: m.claro ? `<span class="tl-disp">${esc(m.claro)}</span>` : "",
    sinais: sinaisCnjHtml(k, ch, txt, m.data||"") };
}
function oficCrps(t, e, casoId, selo, guardados, alv){
  // F236 · a mensagem da decisão explicada; e, no movimento que marca a sessão que vale, o julgamento em destaque
  const ss = CRPS.sessaoDoStatus(e.bruto), sv = ss && ss.data ? sessaoCrps(D.casoPorId.get(casoId)) : null;
  return { casoId, segTexto:String(e.resumo||e.bruto||""), fonte:"recurso no Conselho de Recursos",
    msgJs:`msgCrpsEv('${escJs(casoId)}','${escJs(t.nup||"")}',${(t.eventos||[]).indexOf(e)})`,
    agendarJs: sv && ss.data===sv.data && sv.data>=hoje() && !evJaAgendado(casoId, sv.data) ? `agendarSessaoCrps('${escJs(casoId)}')` : "",
    portal: {href:linkERecursos(t.nup), rot:"e-SISREC"},
    antes: (selo||"") + (e.docs ? `<span class="meio-sub" style="display:block;margin-top:4px">${e.docs} documento${e.docs>1?"s":""} no e-SISREC</span>` : ""),
    docs: guardados.map(a => docRow(a.nome || (/monocr/i.test(a.nome||"")?"Decisão":"Acórdão"), /monocr/i.test(a.nome||"") ? "decisão monocrática" : "acórdão",
        `abrirDecisao('${escJs(a.storage)}')`, `menuClaudeDocs('${escJs(casoId)}',['crps:${escJs(a.storage)}'])`) + caixaResumo(casoId, t.nup, a)).join(""),
    sinais: `<span class="tl-sinais">
      <button class="tl-sinal imp ${e.importante?"on":""}" onclick="toggleSinalCrps(${alv},'importante')" aria-label="importante"
        title="${e.importante?"tirar o destaque desta movimentação":"destacar esta movimentação — acende o ⭐ do processo"}">${IC_ESTRELA}</button>
      <button class="tl-sinal urg ${e.urgente?"on":""}" onclick="toggleSinalCrps(${alv},'urgente')" aria-label="urgente"
        title="${e.urgente?"tirar a urgência desta movimentação":"marcar ESTA movimentação como urgente"}">${IC_RAIO}</button></span>` };
}
// o espelho no Caso completo: e-SISREC (o mesmo cartão da aba Recurso, com o
// acórdão), CNJ e perícia/audiência agendada
function oficDoItem(k, x){
  if(x.crpsT && x.crpsE){
    const t = x.crpsT, e = x.crpsE, guardados = (e.arquivos||[]).filter(a=>a.storage);
    const alv = `'${escJs(k.id)}','${escJs(t.nup||"")}',${(t.eventos||[]).indexOf(e)}`;
    return oficCrps(t, e, k.id, decideOCaso(e) ? seloOrgao(e, guardados[0], k) : "", guardados, alv);
  }
  if(/CNJ/.test(x.chip||"")) return {casoId:k.id, segTexto:x.texto, fonte:"processo judicial", portal:(l=>l?{href:l, rot:nomeSistemaDoLink(l)}:null)(linkPjeMaisAlto(k))};
  if(String(x.chip||"").startsWith("🩺")) return {casoId:k.id, segTexto:x.texto, fonte:/audi/i.test(x.texto||"")?"processo (audiência)":"processo (perícia)",
    portal: k.fase==="judicial" ? (l=>l?{href:l, rot:nomeSistemaDoLink(l)}:null)(linkPjeMaisAlto(k)) : null};
  return null;
}
// ══════════════════════════════════════════════════════════════════════════
// Integração, etapa 2 · A PERÍCIA NO MESMO CARTÃO DOS ANDAMENTOS. Selo 🩺,
// data, hora e local; na barra, a ação do momento cheia (avisar o cliente,
// depois preparar; passada a data, compareceu), o portal do processo e a
// mensagem de lembrete; no ⋯, Google Agenda, copiar e cancelar. Quando o
// laudo chega ao processo, o cartão mostra o laudo e o prazo que ele abre.
// ══════════════════════════════════════════════════════════════════════════
const RX_LAUDO = /\blaudo|parecer m[ée]dico conclu|avalia[çc][ãa]o social conclu/i;
// o laudo é da perícia válida mais recente antes dele (cancelada não tem laudo)
function laudoDaPericia(e){
  if(e.status==="cancelada") return null;
  const d = dataSP(e.data_hora);
  const vivas = (D.eventos||[]).filter(x=>x.caso_id===e.caso_id && x.status!=="cancelada");
  return (D._andsFicha||[]).filter(a=>a.caso_id===e.caso_id && !a.excluir && ehOficial(a)
      && RX_LAUDO.test(a.texto||"") && dataSP(a.criado_em)>=d
      && !vivas.some(x=>x.id!==e.id && dataSP(x.data_hora)>d && dataSP(x.data_hora)<=dataSP(a.criado_em)))
    .sort((x,y)=>String(x.criado_em).localeCompare(String(y.criado_em)))[0] || null;
}
// ══════════════════════════════════════════════════════════════════════════
// F236 · A PERÍCIA DEPOIS DA DATA. No banco, 100 perícias e 23 avaliações
// sociais seguiam "agendada" semanas depois da data: o "Compareceu" só trocava
// o status, sem andamento, e a aba Perícias sumia sem perícia futura. Agora a
// que passou pergunta "aconteceu?" no caso e na aba, com três respostas:
// Compareceu (andamento curto, a etapa "perícia realizada" pelo andarEtapa e a
// tarefa de conferir o resultado), Não compareceu (a tarefa de pedir nova data)
// e Remarcada (o evento novo). E a perícia que só o processo conhece (o PJe e o
// e-SAJ escrevem data, hora e local no movimento) é proposta para agendar.
// ══════════════════════════════════════════════════════════════════════════
// "Perícia" (To Do, à mão) e "Perícia médica" (PAT) são o mesmo tipo; "Julgamento" (CRPS) não é perícia
function tipoEv(t){ const s = String(t||"").trim(); return /^per[íi]cia\b/i.test(s) ? "Perícia" : (s || "Perícia"); }
function ehJulgamentoEv(e){ return tipoEv(e && e.tipo)==="Julgamento"; }
// o julgamento do CRPS e o atendimento de preparação (que o próprio cliente marcou) não pedem aviso nem roteiro
function pedeAviso(e){ return !ehJulgamentoEv(e) && !/^atendimento/i.test(String((e && e.tipo)||"")); }
// perícia e avaliação social (não o atendimento de preparação nem a audiência): andam a etapa e pedem o resultado
function ehPericiaEv(e){ const t = String((e && e.tipo)||""); return /per[íi]cia|avalia[çc][ãa]o social/i.test(t) && !/^atendimento/i.test(t); }
const palavraDoEv = t => /avalia/i.test(t||"") ? "avaliacao" : /audi/i.test(t||"") ? "audiencia" : /julg/i.test(t||"") ? "julgamento" : "pericia";
// a mesma perícia gravada duas vezes no mesmo dia do caso (To Do e PAT): a tela fica com a que diz mais
function semEventoRepetido(evs){
  const ch = e => `${e.caso_id}|${tipoEv(e.tipo)}|${dataSP(e.data_hora)}`;
  const nota = e => (e.status==="realizada"?4:0) + (/📞 avisado/.test(e.obs||"")?2:0) + (e.local?1:0);
  const fica = new Map();
  for(const e of evs) if(e.status!=="cancelada" && (!fica.has(ch(e)) || nota(e)>nota(fica.get(ch(e))))) fica.set(ch(e), e);
  return evs.filter(e=>e.status==="cancelada" || fica.get(ch(e))===e);
}
// o PAT escreve "Perícia médica": a "Perícia" do mesmo dia já conta para a importação não duplicar
function evsComSinonimo(evs){ return (evs||[]).flatMap(e=>tipoEv(e.tipo)==="Perícia" && e.tipo!=="Perícia médica" ? [e, {...e, tipo:"Perícia médica"}] : [e]); }
// F236 · AS ANOTAÇÕES DO CASO QUE A AGENDA LÊ FORA DA FICHA (o aviso ao cliente, a resposta ao prazo do tribunal, o
// mandado de segurança decidido). A ficha aberta (a última) tem todas; os outros casos vêm numa busca pequena, só das
// que falam de aviso, agendamento, protocolo ou impetração, na primeira vez que uma tela pede. Assim "avisado" dá o
// mesmo dentro e fora da ficha: antes a fila da recepção via ou não o aviso conforme a última ficha aberta. Sem a
// resposta da busca ainda: null (a tela repinta quando ela chega).
const _notasCaso = new Map(), _notasPede = new Set(); let _notasT = null;
const FILTRO_NOTAS_CASO = "or=(texto.ilike.*avis*,texto.ilike.*presen*,texto.ilike.*agend*,texto.ilike.*marcad*,texto.ilike.*design*,texto.ilike.*protocol*,texto.ilike.*junt*,texto.ilike.*apresent*,texto.ilike.*impetr*,texto.ilike.*mandado*)";
function notasDoCaso(casoId){
  const k = D.casoPorId && D.casoPorId.get(casoId);
  if(k && (D._ficha||{}).cliId===k.cliente_id && Array.isArray(D._andsFicha)){
    const ns = D._andsFicha.filter(a=>a.caso_id===casoId); _notasCaso.set(casoId, ns); return ns; }
  if(_notasCaso.has(casoId)) return _notasCaso.get(casoId);
  if(!_notasPede.has(casoId)){ _notasPede.add(casoId); if(!_notasT) _notasT = setTimeout(buscarNotasDosCasos, 0); }
  return null;
}
async function buscarNotasDosCasos(){
  _notasT = null;
  const ids = [..._notasPede]; let veio = false;
  for(let i=0; i<ids.length; i+=60){
    const lote = ids.slice(i, i+60);
    const r = await api(`/rest/v1/andamentos?select=id,caso_id,texto,autor_id,criado_em,origem,origem_id,excluir&caso_id=in.(${lote.join(",")})&${FILTRO_NOTAS_CASO}&order=criado_em.desc`).catch(()=>null);
    lote.forEach(id=>_notasPede.delete(id));
    if(!Array.isArray(r)) continue;   // falhou: a próxima pintura pede de novo
    const novos = lote.filter(id=>!_notasCaso.has(id));
    novos.forEach(id=>_notasCaso.set(id, []));
    for(const a of r) if(novos.includes(a.caso_id)) _notasCaso.get(a.caso_id).push(a);
    veio = true;
  }
  if(!veio) return;
  // repinta só a barra e as telas de agenda (como buscarTextosAgenda): a ficha aberta já lê as dela
  const agenda = ["planejado","meudia","calendario","minhas","importante","agenda","novidades"].includes(visao) || String(visao).startsWith("fase:");
  for(const f of [montarSidebar, ()=>{ if(agenda && !clienteAberto) render(); }]) try{ f(); }catch(e){ console.warn("[notas do caso]", e); }
}
// F236 · o aviso anotado vale se FEITO e DEPOIS do agendamento. Feito: "avisei", "avisamos a cliente", "cliente avisada",
// "confirmou presença"; a promessa ("avisamos quando marcar", "vamos avisar", "avisaremos", "será avisada") e a negação
// não contam (a nota da recepção "avisamos quando marcar a perícia", de antes do agendamento, dava a perícia por avisada).
// Depois do agendamento: do primeiro registro dele (a criação do evento; o comentário do PAT, o "📅 … agendada" da
// importação, o movimento ou a nota que cita a data com "agendada/marcada/designada"); sem registro, do evento anterior
// do mesmo tipo. Com data no texto, a desta perícia. As anotações vêm de notasDoCaso: a mesma regra dentro e fora da ficha.
const RX_AVISO_FEITO = /\bavisei\b|\bavisamos\b|\bavisad[oa]s?\b|\bconfirmou (a )?presenca\b/;
const RX_AVISO_PROMESSA = /\bavisamos\s+(quando|assim que|logo que|se|caso|depois)\b|\b(vamos|vou|vai|iremos|irei|precisamos|precisa|preciso|devemos|deve|favor|podemos|pode|ficou de|ficamos de)\s+(\S+\s+)?avis|\bavisaremos\b|\bavisara\b|\bser(a|ao)?\s+avisad|\bnao\b[^.]{0,30}\bavis/;
const avisoFeito = t => String(t||"").split(/[.;!?\n]+/).some(f=>RX_AVISO_FEITO.test(f) && !RX_AVISO_PROMESSA.test(f));
const RX_AGENDOU = /agendad|marcad|designad|remarcad|pautad/;
function avisoDoEvento(e){
  if(/📞 avisado/.test(e.obs||"")) return {quem:"", em:""};
  const notas = notasDoCaso(e.caso_id); if(!notas) return null;
  const d = dataSP(e.data_hora), pal = palavraDoEv(e.tipo), dm = new RegExp(`\\b${d.slice(8,10)}[./]${d.slice(5,7)}\\b`);
  const marcou = [e.criado_em, ...notas.filter(a=>!a.excluir && dm.test(a.texto||"") && RX_AGENDOU.test(dsa(a.texto||""))).map(a=>a.criado_em)]
    .filter(Boolean).map(x=>dataSP(x)).sort()[0] || "";
  // sem registro do agendamento, a janela começa no evento anterior do mesmo tipo (o atendimento de preparação no meio não conta)
  const desde = marcou || (D.eventos||[]).filter(x=>x.caso_id===e.caso_id && x.id!==e.id && x.status!=="cancelada" && dataSP(x.data_hora)<d && pedeAviso(x) && palavraDoEv(x.tipo)===pal)
    .map(x=>dataSP(x.data_hora)).sort().pop() || somaDias(d, -60);
  const a = notas.filter(a=>!a.excluir && !ehOficial(a)).find(a=>{
    const q = dataSP(a.criado_em), t = dsa(a.texto||"");
    if((marcou ? q<desde : q<=desde) || q>d || !t.includes(pal) || !avisoFeito(t)) return false;
    return !/\b\d{1,2}[./]\d{1,2}\b/.test(a.texto||"") || dm.test(a.texto||"");
  });
  if(!a) return null;
  const co = D.colPorId.get(a.autor_id);
  return {quem: co ? co.nome.split(" ")[0] : "", em: dataSP(a.criado_em)};
}
const evAvisado = e => !!avisoDoEvento(e);
// F236 · o "📞 Avisar" ainda aberto desta perícia (a tarefa que o agendar com aviso ou o seguimento criaram), para
// alguém: a fila da recepção não repete o aviso (era o mesmo aviso com dois donos). O texto da tarefa vem da ficha ou
// da busca da agenda; sem ele ainda, a busca é pedida e a perícia conta como sem aviso aberto
function avisoEmAberto(e){
  const d = dataSP(e.data_hora), dm = new RegExp(`\\b${d.slice(8,10)}[./]${d.slice(5,7)}\\b`), falta = [];
  const sim = (D.tarefasPorCaso.get(e.caso_id)||[]).some(t=>{
    if(t.concluida_em) return false;
    const tx = ((D._andsFicha||[]).find(a=>a.id===t.andamento_id)||{}).texto ?? textoDoAndamento(t.andamento_id);
    if(tx==null){ falta.push(t.andamento_id); return false; }
    return /^\s*📞\s*avisar\b/i.test(tx) && (!/\b\d{1,2}[./]\d{1,2}\b/.test(tx) || dm.test(tx));
  });
  if(falta.length) buscarTextosAgenda(falta);
  return sim;
}
// F236 · o "📞 Avisar" concluído (no Meu Dia, no quadro, na anotação) é o aviso feito: grava o mesmo "📞 avisado" do
// cartão no evento, que a agenda, a lista 🩺 e a fila da recepção leem. Devolve o que desfazer
async function avisoPelaTarefa(t){
  const tx = ((D._andsFicha||[]).find(a=>a.id===t.andamento_id)||{}).texto ?? textoDoAndamento(t.andamento_id)
    ?? (((await api(`/rest/v1/andamentos?id=eq.${t.andamento_id}&select=texto`).catch(()=>null))||[])[0]||{}).texto;
  const m = /^\s*📞\s*avisar\b[\s\S]*?\b(\d{2})[./](\d{2})[./](\d{4})\b/i.exec(tx||""); if(!m) return null;
  const d = `${m[3]}-${m[2]}-${m[1]}`;
  const e = (D.eventos||[]).find(x=>x.caso_id===t.caso_id && x.status==="agendada" && dataSP(x.data_hora)===d && pedeAviso(x));
  if(!e || /📞 avisado/.test(e.obs||"")) return null;
  const antes = e.obs || null, obs = (antes ? antes+" · " : "")+"📞 avisado";
  await api(`/rest/v1/eventos?id=eq.${e.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({obs})});
  e.obs = obs;
  return {e, antes};
}
async function desfazerAvisoDoEvento(av){
  await api(`/rest/v1/eventos?id=eq.${av.e.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({obs:av.antes})}).catch(()=>{});
  av.e.obs = av.antes;
}
// F236 · a prova de que a perícia aconteceu que a agenda enxerga sem abrir a ficha: o laudo ou a "perícia realizada" que
// o processo (PJe, CNJ) ou o PAT trouxe depois da data. Com ela, o Meu Dia não pede a confirmação (a ficha ainda pede)
function provaForaDaFicha(e, k){
  const d = dataSP(e.data_hora), rx = /\blaudo|per[ií]cia realizada|realizada a per[ií]cia/i;
  return (D.novid||[]).some(a=>a.caso_id===e.caso_id && dataSP(a.criado_em)>=d && rx.test(a.texto||""))
    || (k && k.datajud ? cnjInstancias(k).flatMap(i=>i.historico||[]) : []).some(m=>String((m&&m.data)||"").slice(0,10)>=d && rx.test((m&&m.nome)||""));
}
// F236 · o mandado de segurança por mora já decidido: a tarefa aberta de redigi-lo ou a ordem de impetrar numa anotação
function msDecidido(k){
  if((D.tarefas||[]).some(t=>t.caso_id===k.id && !t.concluida && /mandado de seguran|\bMS\b/i.test(t.titulo||""))) return true;
  return (notasDoCaso(k.id)||[]).some(a=>!a.excluir && !ehOficial(a)
    && /\b(pode|podemos|vamos|vou) impetrar\b|\bimpetre\b|\bimpetrar o (mandado|ms)\b|\bredigir o (mandado|ms)\b/.test(dsa(a.texto||"")));
}
// o laudo do PAT (ou da pasta do processo) chega como documento sem andamento: vale o que entrou depois da perícia
function laudoAnexoDaPericia(e){
  if(e.status==="cancelada") return null;
  const d = dataSP(e.data_hora), prox = (D.eventos||[]).filter(x=>x.caso_id===e.caso_id && x.id!==e.id && x.status!=="cancelada" && dataSP(x.data_hora)>d)
    .map(x=>dataSP(x.data_hora)).sort()[0] || "9999";
  return (D.anexos||[]).filter(a=>a.caso_id===e.caso_id && !a.andamento_id && /laudo/i.test(a.nome||"") && !/impugna|manifesta|quesito/i.test(a.nome||"") && dataSP(a.criado_em)>=d && dataSP(a.criado_em)<prox)
    .sort((x,y)=>String(x.criado_em).localeCompare(String(y.criado_em)))[0] || null;
}
// a conclusão e o CID do laudo do INSS, pelo leitor do dossiê; sem ele, o começo do texto
function resumoDoLaudo(x){
  const l = lerLaudosTexto(x.texto||"")[0];
  if(!l) return x.texto ? ` · ${String(x.texto).replace(/\s+/g," ").slice(0,140)}` : "";
  return [l.resultado==="capaz" ? "sem incapacidade (capaz)" : l.resultado==="incapaz" ? `incapaz${l.grau?`, ${l.grau.toLowerCase()}`:""}` : "",
    l.cid ? `CID ${l.cid}${l.cidDesc?` (${l.cidDesc})`:""}` : "", l.dcb ? `DCB ${l.dcb}` : ""].filter(Boolean).map(s=>` · ${s}`).join("");
}
// ══════════════════════════════════════════════════════════════════════════
// F832 · O LAUDO NO CARTÃO DA PERÍCIA JUDICIAL (ordem do Paulo, 27.11.2026, melhoria 6 da auditoria). O mesmo cartão
// junta o laudo, a manifestação ou impugnação e os quesitos complementares (anexos do caso, pelo nome que o botão
// dá), e liga o expediente do PJe aberto pelo laudo. O prazo do PJe segue como aviso; fatal é só o anotado no CRM.
// Situações: Aguardando laudo, Laudo juntado, Manifestação feita.
// ══════════════════════════════════════════════════════════════════════════
const ROT_DOC_PERICIA = {laudo:"Laudo pericial", manifestacao:"Manifestação sobre a perícia", quesitos:"Quesitos complementares"};
// o expediente do PJe que o laudo abriu: o ligado ao movimento do laudo; sem ele, o expedido até 7 dias depois do laudo,
// ou o que fala de laudo ou de perícia
function prazoDoLaudo(k, la, dL){
  const mv = la && movimentoJudicial(la.texto), p = mv && prazoTribunalDoAto(la, mv, true);
  if(p) return p;
  const de = x => x.expedido_em || x.ciencia_em || "";
  return (k.prazos_tribunal||[]).filter(x=>dataDoPrazo(x) && de(x)>=dL && (de(x)<=somaDias(dL, 7) || /laudo|per[íi]ci/i.test(`${x.ato||""} ${x.texto||""}`)))
    .sort((x,y)=>de(x).localeCompare(de(y)))[0] || null;
}
function laudoJudicial(e, k, la, lx, pzSug){
  const d0 = dataSP(e.data_hora), dL = la ? dataSP(la.criado_em) : lx ? dataSP(lx.criado_em) : null;
  const prox = (D.eventos||[]).filter(x=>x.caso_id===e.caso_id && x.id!==e.id && x.status!=="cancelada" && dataSP(x.data_hora)>d0).map(x=>dataSP(x.data_hora)).sort()[0] || "9999";
  const docs = re => (D.anexos||[]).filter(a=>a.caso_id===e.caso_id && re.test(a.nome||"") && dataSP(a.criado_em)>=d0 && dataSP(a.criado_em)<prox);
  const man = docs(/manifesta[çc][ãa]o sobre a per[íi]cia|impugna[çc][ãa]o ao laudo/i), ques = docs(/quesitos complementares/i);
  const pz = dL ? prazoDoLaudo(k, la, dL) : null, feita = man.length || !!(pz && respostaAoPrazo(k, pz));
  const sit = feita ? ["Manifestação feita","ok"] : dL ? ["Laudo juntado","venc"] : ["Aguardando laudo","prox"];
  const linha = a => docRow(a.nome, `juntado em ${fmt(dataSP(a.criado_em))}`, `abrirAnexo('${escJs(a.id)}')`, `menuClaudeDocs('${escJs(e.caso_id)}',['anexo:${escJs(a.id)}'])`, a.texto ? a.id : null);
  const dPz = pz && dataDoPrazo(pz), fatal = pz && pz.fim && k.prazo===pz.fim;
  const avisoPz = pz && !pzSug && !feita && pz.situacao!=="findo" ? `<span class="tl-prazo-sug per-prazo-pje">${IC_SVG.relogio}<span>Aviso do ${esc(ROT_PRAZO[pz.sistema]||"PJe")}: ${esc(pz.ato||"intimação")}${pz.dias?` (${pz.dias} dias)`:""} até <b>${fmt(dPz)}</b>${pz.fim?"":", ciência tácita"}. ${fatal ? "Anotado como prazo fatal no CRM." : "Vira prazo fatal só quando anotado no CRM."}</span>${pz.fim && !fatal ? `<button class="tl-bt forte" onclick="usarPrazoDoTribunal('${k.id}','${pz.fim}')" title="anotar o prazo do tribunal como prazo fatal do caso">Fatal</button>` : ""}</span>` : "";
  const bt = (tipo, rot, tit) => `<button class="tl-bt" onclick="anexarDaPericia('${e.id}','${tipo}')" title="${tit}">${rot}</button>`;
  return {chip:`<span class="per-est ${sit[1]}">${sit[0]}</span>`, html: man.map(linha).join("") + ques.map(linha).join("") + avisoPz,
    acoes: dL ? bt("manifestacao", "Manifestação", "juntar a manifestação ou a impugnação ao laudo") + bt("quesitos", "Quesitos", "juntar os quesitos complementares")
      : bt("laudo", "Laudo", "juntar o laudo pericial")};
}
function anexarDaPericia(evId, tipo){
  const e = (D.eventos||[]).find(x=>x.id===evId), k = e && D.casoPorId.get(e.caso_id); if(!k) return;
  const inp = document.createElement("input"); inp.type = "file"; inp.accept = "application/pdf,image/*";
  inp.onchange = () => { const f = inp.files && inp.files[0]; if(f) anexarArquivo(k.id, k.cliente_id, f, `${ROT_DOC_PERICIA[tipo]} · ${f.name}`); };
  inp.click();
}
// o que diz que a perícia aconteceu: uma anotação depois da data ("foi à perícia", "compareceu"), o movimento
// "perícia realizada" do processo (PJe ou CNJ) ou o laudo
function provaDoComparecimento(e, semLaudo){
  const d = dataSP(e.data_hora), k = D.casoPorId.get(e.caso_id) || {}, ate = somaDias(d, 45);
  const ands = (D._andsFicha||[]).filter(a=>a.caso_id===e.caso_id && !a.excluir && dataSP(a.criado_em)>=d && dataSP(a.criado_em)<=ate);
  const nota = ands.find(a=>{ const t = dsa(a.texto||"");
    return !ehOficial(a) && t.includes(palavraDoEv(e.tipo)) && /\b(compareceu|compareci|comparecemos|foi (a|na) (pericia|avaliacao|audiencia)|fez a (pericia|avaliacao)|realizou a (pericia|avaliacao)|(pericia|avaliacao social) (foi )?realizada|passou (na|pela) (pericia|avaliacao))\b/.test(t)
      && !/\bnao (compareceu|foi|fez)\b/.test(t); });
  if(nota){ const co = D.colPorId.get(nota.autor_id), tx = String(nota.texto||"").replace(/\s+/g," ");
    return `${co ? co.nome.split(" ")[0] : "a equipe"} anotou em ${fmtBarra(dataSP(nota.criado_em)).slice(0,5)}: “${tx.slice(0,110)}${tx.length>110?"…":""}”`; }
  const mov = ands.find(a=>ehOficial(a) && /per[ií]cia realizada|realizada a per[ií]cia/i.test(a.texto||""))
    || (k.datajud ? cnjInstancias(k).flatMap(i=>i.historico||[]) : []).find(m=>/per[ií]cia realizada/i.test(m.nome||"") && String(m.data||"").slice(0,10)>=d);
  if(mov) return `o processo registrou “perícia realizada” em ${fmtBarra(mov.criado_em ? dataSP(mov.criado_em) : String(mov.data).slice(0,10)).slice(0,5)}`;
  const la = !semLaudo && (laudoDaPericia(e) || laudoAnexoDaPericia(e));   // no cartão o laudo já aparece logo abaixo
  return la ? `o laudo chegou em ${fmtBarra(dataSP(la.criado_em)).slice(0,5)}` : "";
}
// a perícia que só o processo conhece: o movimento traz data, hora e local, e o caso não tem evento nesse dia
// (nem cancelado: a remarcada não volta a ser proposta). F236 · no e-Recursos, só a sessão que vale (eventoDoMovimento);
// semJulg: a aba Perícias conta só perícia e audiência ("Perícias · 2 a agendar" num BPC sem perícia eram duas pautas)
function periciasDoProcesso(ands, semJulg){
  const vistos = new Set(), out = [];
  for(const a of ands||[]){
    if(a.excluir || !ehOficial(a)) continue;
    const k = D.casoPorId.get(a.caso_id); if(!k || k.fase==="encerrado") continue;
    const ev = eventoDoMovimento(a); if(!ev || (semJulg && ev.tipo==="Julgamento")) continue;
    const ch = `${a.caso_id}|${ev.data}`;
    if(vistos.has(ch) || (D.eventos||[]).some(e=>e.caso_id===a.caso_id && dataSP(e.data_hora)===ev.data)) continue;
    vistos.add(ch); out.push({a, k, ev});
  }
  return out.sort((x,y)=>x.ev.data<y.ev.data?-1:1);
}
// "Designada perícia médica (30/10/2026 às 13:40 - ORTOPEDIA - Dr. … - sala de perícias…)": o resto é o local
function localNoTexto(t){
  const m = /\(\s*\d{2}\/\d{2}\/\d{2,4}\s+(?:às|as)\s+\d{1,2}[:h]\d{2}\s*[-–—]\s*([^)]{3,200})\)/i.exec(String(t||""));
  return m ? m[1].trim().slice(0,160) : null;
}
// quem cuida do que a perícia deixa: eu, se estou no caso; senão o primeiro atribuído
function quemDoCaso(k){ const atr = D.atrDoCaso.get(k.id)||[]; return atr.includes(eu.id) ? eu.id : (atr[0] || eu.id); }
// os quesitos são do advogado do caso
function advogadoDoCaso(k){
  const atr = (D.atrDoCaso.get(k.id)||[]).map(id=>D.colPorId.get(id)).filter(Boolean);
  return (atr.find(c=>c.cargo==="advogado" || c.papel==="admin") || {}).id || eu.id;
}
// o prazo do tribunal que manda apresentar quesitos e indicar assistente técnico (lido do ato, que vem pelo ato_id)
function textoDoAto(p, k){
  const doc = p.ato_id && (D.anexos||[]).find(a=>a.caso_id===k.id && String(a.caminho||"").split("/").pop()===String(p.ato_id));
  return (doc && doc.texto) || "";
}
const ehDeQuesitos = (p, k) => /quesit|assistente t[ée]cnic/i.test(`${p.ato||""} ${p.texto||""} ${textoDoAto(p, k)}`);
function prazoDeQuesitos(k){ return (k.prazos_tribunal||[]).find(p=>p.fim && p.situacao!=="findo" && ehDeQuesitos(p, k)) || null; }
// o quadro do prazo de quesitos diz de que é e quem cuida (a tarefa do roteiro, presa pelo carimbo [PRAZO])
function rotuloDeQuesitos(p, k){
  if(!p.fim || !ehDeQuesitos(p, k)) return {};
  const tf = (D.tarefasFicha||[]).find(t=>!t.concluida_em && t.caso_id===k.id
    && (((D._andsFicha||[]).find(a=>a.id===t.andamento_id)||{}).texto||"").includes(`[PRAZO ${fmt(p.fim)}]`));
  const co = tf && D.colPorId.get(tf.colaborador_id);
  const rotulo = `Quesitos · ${co ? co.nome.split(" ")[0] : "atribuir"}`;
  return {rotulo, curto:rotulo,
    avs: co ? `<span class="avatar mini" style="background:${co.cor}" title="responsável: ${esc(co.nome)}">${esc(co.inicial)}</span>` : ""};
}
// as três respostas da que passou (Julgamento: aconteceu ou remarcado)
function botoesDoPassado(e, pre=""){
  const b = (rot, fn, tit) => `<button class="btn-mini" onclick="${pre}fecharCaixa();${fn}('${e.id}')" title="${tit}">${rot}</button>`;
  return b(ehJulgamentoEv(e) ? "✔ aconteceu" : "✔ compareceu", "compareceuEvento", "registra no caso, marca a etapa e agenda a conferência do resultado")
    + (ehJulgamentoEv(e) ? "" : b("✕ não compareceu", "naoCompareceuEvento", "registra no caso e cria a tarefa de pedir nova data"))
    + b(`↻ remarcad${evFem(e.tipo)?"a":"o"}`, "remarcarEvento", "ganhou outra data: a de agora fica no histórico e nasce a nova");
}
// o cartão da perícia que o processo marcou e o CRM ainda não agendou
function cartaoDoProcesso({a, k, ev}){
  const portal = portalDoAndamento(a, k), local = localNoTexto(a.texto);
  return `<li class="tl-card tl-of tl-oficial tl-pericia" data-proc="${a.id}"><span class="texto"><span class="tl-cab"><span class="avatar mini tl-av av-fonte">${svgIc("🩺",12)||"🩺"}</span><b class="autor-nome">${esc(ev.tipo)}</b>
    <span class="tl-hora">${fmt(ev.data)} · ${ev.hora}</span><span class="per-est venc">no processo, sem agendamento</span></span>
    <span class="tl-corpo">${esc([local, tituloCaso(k)].filter(Boolean).join(" · "))}</span>
    <span class="tl-disp">Movimento de ${fmt((movimentoJudicial(a.texto)||{}).data||dataSP(a.criado_em))}: ${esc(andLimpo(a, k).texto.slice(0,160))}</span>
    <span class="tl-barra tl-barra-of"><button class="tl-bt forte" onclick="periciaRapida(${segRegistrar(a.caso_id, a.texto, a.id)})" title="agenda na aba Perícias, com o aviso ao cliente hoje e a véspera, e abre o roteiro">Agendar<span class="sr-only"> ${esc(tipoEv(ev.tipo).toLowerCase())} com aviso</span></button>${portal?`<a class="tl-bt tl-link" href="${urlOk(portal.href)}" target="_blank" rel="noopener">Abrir no ${esc(portal.rot)} ${IC_SVG.ir}</a>`:""}</span></span></li>`;
}
function portalDaPericia(k){
  if(k.fase==="judicial" || k.fase==="pagamento"){ const l = linkPjeMaisAlto(k); return l ? {href:l, rot:nomeSistemaDoLink(l)} : null; }
  const prot = soDig((k.protocolos||[])[0]||"");
  const href = k.processo_link || (prot ? PAT_TAREFA+prot : null);
  return href ? {href, rot:"PAT"} : null;
}
// "Preparar" abre o seguimento com o roteiro da perícia (F89) já calculado
function prepararPericia(evId){
  const e = D.eventos.find(x=>x.id===evId); if(!e) return;
  const t = `${e.tipo||"Perícia"} agendada para ${fmt(dataSP(e.data_hora)).replace(/\./g,"/")} ${horaSP(e.data_hora)==="00:00"?"(hora não informada)":"às "+horaSP(e.data_hora)}${e.local?` — ${e.local}`:""}`;
  segItens.push({casoId:e.caso_id, texto:t, andId:null, prep:true});
  abrirSeguimento(segItens.length-1);
}
function msgPericia(evId){
  const l = lembreteDoEvento(evId), e = D.eventos.find(x=>x.id===evId); if(!l || !e) return;
  msgCliente(e.caso_id, "", "", "", l.texto);
}
function cartaoPericia(e){
  const k = D.casoPorId.get(e.caso_id) || {}, c = D.cliPorId.get(k.cliente_id) || {};
  const d = dataSP(e.data_hora), futura = d >= hoje(), ag = e.status==="agendada", julg = ehJulgamentoEv(e);
  // F236 · o estado diz o que falta: avisar (ou quem avisou, mesmo anotado só no To Do), "aconteceu?" depois da
  // data, ou como terminou; o julgamento do CRPS não pede aviso nem preparação
  const av = ag && futura && pedeAviso(e) ? avisoDoEvento(e) : null, o = evFem(e.tipo) ? "a" : "o";
  const estado = e.status==="cancelada" ? (/não compareceu/.test(e.obs||"") ? ["não compareceu","venc"] : /remarcad/.test(e.obs||"") ? [`remarcad${o}`,"cinza"] : ["cancelada","cinza"])
    : e.status==="realizada" ? [julg ? "aconteceu" : "compareceu","ok"]
    : !futura ? ["aconteceu? confirme","venc"] : julg ? ["sessão marcada","prox"] : !pedeAviso(e) ? ["marcado","prox"]
    : av ? [`cliente avisado${av.quem?` · ${av.quem}${av.em?`, ${fmtBarra(av.em).slice(0,5)}`:""}`:""}`,"ok"] : ["avisar o cliente","prox"];
  const la = laudoDaPericia(e), lx = la ? null : laudoAnexoDaPericia(e);
  const pzSug = la ? prazoSugeridoHtml(la, segRegistrar(la.caso_id, la.texto, la.id)) : "";
  // F832 · a perícia judicial que passou: o laudo, a manifestação e os quesitos complementares no mesmo cartão
  const pj = ["judicial","pagamento"].includes(k.fase) && e.status!=="cancelada" && !futura && !julg ? laudoJudicial(e, k, la, lx, pzSug) : null;
  const cab = `<span class="tl-cab"><span class="avatar mini tl-av av-fonte">${svgIc("🩺",12)||"🩺"}</span><b class="autor-nome">${esc(e.tipo||"Perícia")}</b>
    <span class="tl-hora">${fmt(d)} · ${horaSP(e.data_hora)==="00:00"?"hora não informada":horaSP(e.data_hora)}</span><span class="per-est ${estado[1]}">${estado[0]}</span>${pj ? pj.chip : ""}</span>`;
  const prova = ag && !futura ? provaDoComparecimento(e, !!(la||lx)) : "";
  const corpo = `<span class="tl-corpo">${esc([e.local, tituloCaso(k)].filter(Boolean).join(" · "))}</span>`
    + (prova ? `<span class="tl-disp per-prova">${esc(capital(prova))}.</span>` : "");
  const laudo = la ? `<span class="tl-disp per-laudo"><b>Laudo juntado em ${fmt(dataSP(la.criado_em))}</b> · ${esc(andLimpo(la, k).texto.slice(0,140))}</span>`
      + docsDoCartao(la) + pzSug + feitoDoCartao(la)
    // F236 · o laudo do PAT chega como documento, sem andamento: a conclusão e o CID vêm à vista
    : lx ? `<span class="tl-disp per-laudo"><b>Laudo de ${fmt(dataSP(lx.criado_em))}</b>${esc(resumoDoLaudo(lx))}</span>`
      + docRow(lx.nome, `${lx.paginas?`${lx.paginas} pág. · `:""}${lx.texto?"com texto":lx.tipo?"digitalizado":"texto em leitura"}`, `abrirAnexo('${escJs(lx.id)}')`, `menuClaudeDocs('${escJs(e.caso_id)}',['anexo:${escJs(lx.id)}'])`, lx.texto ? lx.id : null) : "";
  const portal = portalDaPericia(k);
  const bt = (rot, js, forte, tit) => `<button class="tl-bt${forte?" forte":""}" onclick="${js}"${tit?` title="${esc(tit)}"`:""}>${rot}</button>`;
  let acoes = "";
  if(ag && futura && pedeAviso(e)) acoes = (av ? "" : bt("Avisar cliente", `janelaAvisado('${e.id}')`, true, "registrar que o cliente foi avisado e se marcou o atendimento de preparação"))
      + bt("Preparar", `prepararPericia('${e.id}')`, !!av, "roteiro da perícia: quesitos (na judicial), atendimento de preparação, lembrete da véspera e estudo do processo");
  else if(ag && !futura) acoes = bt(julg ? "Aconteceu" : "Compareceu", `compareceuEvento('${e.id}')`, true, julg ? "a sessão aconteceu" : "o cliente foi: registra no caso, marca a etapa e agenda a conferência do resultado")
      + (julg ? "" : bt("Não compareceu", `naoCompareceuEvento('${e.id}')`, false, "o cliente faltou: registra no caso e cria a tarefa de pedir nova data"))
      + bt(`Remarcad${o}`, `remarcarEvento('${e.id}')`, false, "ganhou outra data: a de agora fica no histórico e nasce a nova");
  if(pj) acoes += pj.acoes;
  if(e.status!=="cancelada"){
    if(portal) acoes += `<a class="tl-bt tl-link" href="${urlOk(portal.href)}" target="_blank" rel="noopener">Abrir no ${esc(portal.rot)} ${IC_SVG.ir}</a>`;
    if(ag && futura) acoes += bt("Mensagem ao cliente", `msgPericia('${e.id}')`, false, "o lembrete pronto, para conferir e enviar");
  }
  const menu = menuMais([
    ag && futura ? `<a class="tl-mais-it" role="menuitem" target="_blank" rel="noopener" href="${gcal((e.tipo||"Perícia")+" — "+esc(c.nome||""), d, horaSP(e.data_hora), 90, "", e.local||"")}">Google Agenda</a>` : "",
    ag && futura ? `<button class="tl-mais-it" role="menuitem" onclick="copiarLembrete('${e.id}')" title="Copiar o lembrete">Copiar<span class="sr-only"> o lembrete</span></button>` : "",
    ag ? `<button class="tl-mais-it perigo" role="menuitem" onclick="cancelarEvento('${e.id}')">Cancelar ${evFem(e.tipo)?"a":"o"} ${esc((e.tipo||"perícia").toLowerCase())}</button>` : ""]);
  const barra = (acoes||menu) ? `<span class="tl-barra tl-barra-of">${acoes}<span class="tl-barra-fim">${menu}</span></span>` : "";
  return `<li class="tl-card tl-of tl-oficial tl-pericia${e.status==="cancelada"?" per-cancelada":""}" data-ev="${e.id}"><span class="texto">${cab}${corpo}${laudo}${pj ? pj.html : ""}${barra}</span></li>`;
}
// o que o cartão oficial precisa saber, venha de uma linha de `andamentos`
// (PAT, PJe, e-SAJ, eproc, aviso do CRPS) ou de um espelho sem linha (evento
// do e-SISREC, histórico do CNJ), que chega pronto em x.ofic
function infoOficial(x){
  const a = x.and;
  if(a && ehOficial(a)){
    const k = D.casoPorId.get(a.caso_id) || {};
    const i = segRegistrar(a.caso_id, a.texto, a.id), ev = eventoDoMovimento(a);   // F236 · a pauta superada não propõe nada
    // F236 · a pauta do CRPS propõe o julgamento num clique, em destaque (o mesmo "Agendar … com aviso" do ⋯, que
    // também cria a tarefa de conferir o resultado); só no movimento que marca a sessão que vale, e só sem agenda
    const sv = a.origem==="crps" && ev && ev.tipo==="Julgamento" ? sessaoVigente(ev, a.caso_id) : null;
    const destaqueCrps = sv && sv.data===ev.data && sv.data>=hoje() && !evJaAgendado(a.caso_id, sv.data)
      ? `<button class="tl-bt forte" onclick="periciaRapida(${i})" title="cria o julgamento na agenda e a tarefa de conferir o resultado no dia útil seguinte">Agendar<span class="sr-only"> julgamento com aviso</span></button>` : "";
    // F236 · e, no mesmo cartão, a sustentação oral até 3 dias úteis antes da sessão (Regimento do CRPS, art. 81, III)
    const sc = sv && sv.data===ev.data ? sessaoCrps(k) : null;
    const sust = sc && sc.data===sv.data && sc.sustentacaoAte>=hoje() && !sustentacaoCriada(a.caso_id, sc.data)
      ? `<button class="tl-bt${destaqueCrps?"":" forte"}" onclick="propostaSustentacao('${a.caso_id}')" title="cria a tarefa de decidir e pedir a sustentação oral até a data limite; quem decide se pede é o escritório">＋ sustentação oral até ${fmtBarra(sc.sustentacaoAte).slice(0,5)}</button>` : "";
    // F236 · a perícia que o processo marcou e o CRM não agendou: "Agendar … com aviso" sai do ⋯ e é o botão principal
    const destaquePericia = ev && ev.tipo!=="Julgamento" && !(D.eventos||[]).some(e=>e.caso_id===a.caso_id && dataSP(e.data_hora)===ev.data)
      ? `<button class="tl-bt forte" onclick="periciaRapida(${i})" title="agenda na aba Perícias, com o aviso ao cliente hoje e a véspera, e abre o roteiro">Agendar<span class="sr-only"> ${esc(tipoEv(ev.tipo).toLowerCase())} com aviso</span></button>` : "";
    const destaque = (destaqueCrps + sust) || destaquePericia || botoesAcordo(a);   // F248
    return { i, lido: euLi(a), andId: a.id, portal: portalDoAndamento(a, k), destaque,
      msg: `msgAndamento('${a.id}')`, sinais: sinaisHtml(a),
      antes: atoDoCartaoHtml(a), docs: docsDoCartao(a), prazo: prazoSugeridoHtml(a, i), feito: feitoDoCartao(a),
      // F236 · com o botão principal à vista, o ⋯ não repete o "Agendar … com aviso"
      menu: [ ev && !destaque ? `<button class="tl-mais-it" role="menuitem" onclick="periciaRapida(${i})">Agendar<span class="sr-only"> ${esc(ev.tipo.toLowerCase())} com aviso</span></button>` : "",
              itemLevarAndamento(a),
              a.origem==="pje" ? `<button class="tl-mais-it perigo" role="menuitem" onclick="pjeForaDoCaso('${a.id}','${a.caso_id}')">Não é deste caso</button>` : "" ] };
  }
  // o e-SISREC e o CNJ não têm "lido" por pessoa: o cartão deles não leva o
  // selo de não lido nem o ✓ (lido = null); o aviso do CRPS que vira linha
  // de `andamentos` leva, pelo caminho de cima
  const o = x.ofic; if(!o) return null;
  // F236 · o cartão do bloco do e-Recursos com o andamento gêmeo (fatosDoCasoTodo): o lido e o seguimento são dele
  const g = x.gemeo || null;
  const i = segRegistrar(o.casoId, o.segTexto||x.texto||"", g ? g.id : null);
  return { i, lido: g ? euLi(g) : null, andId: g ? g.id : undefined, portal: o.portal||null, sinais: o.sinais||"", antes: o.antes||"", docs: o.docs||"", prazo: "", feito: "",
    destaque: o.agendarJs ? `<button class="tl-bt forte" onclick="${o.agendarJs}" title="cria o julgamento na agenda e a tarefa de conferir o resultado no dia útil seguinte">Agendar<span class="sr-only"> julgamento com aviso</span></button>` : "",
    msg: o.msgJs || `msgCliente(${esc(JSON.stringify(o.casoId))},${esc(JSON.stringify(o.fonte||"processo"))},${esc(JSON.stringify(x.texto||""))},${esc(JSON.stringify((x.q||"").slice(0,10)))})`, menu: o.menu||[] };
}
function cartaoTl(x){
  if(x.ev) return cartaoPericia(x.ev);
  // F288 · a hora 00:00 é a do movimento sem hora (e-SAJ, DataJud): não se mostra
  const d=(x.q||"").slice(0,10), hora=(h=>h==="00:00"?"":h)((x.q||"").length>=16 ? (x.q||"").slice(11,16) : "");
  const a = x.and, inf = x.corAv ? null : infoOficial(x);
  const cab = `<span class="tl-cab"><span class="avatar mini tl-av${x.corAv?"":" av-fonte"}"${x.corAv?` style="background:${x.corAv}"`:""}>${x.em||"·"}</span><b class="autor-nome">${esc(x.rot||"")}</b><span class="tl-hora">${d?`<span class="tl-dt">${fmt(d).slice(0,5)}${hora?" · ":""}</span>`:"—"}${hora}</span>${inf && inf.lido===false?`<span class="tl-novo">Novo · não lido</span>`:""}</span>`;
  const corpo = `<span class="tl-corpo">${x.forte?`<b>${esc(x.texto||"")}</b>`:esc(x.texto||"")}</span>`;
  const cls = `tl-card tl-of${x.corAv?"":" tl-oficial"} ${x.cls||""}${x.forte?" tudo-marco":""}${clsSinal(a)}`;
  if(!inf){
    const sin = sinaisHtml(a);
    return `<li class="${cls}"><span class="texto">${cab}${corpo}
      ${(x.html||sin)?`<span class="tl-barra tl-barra-of">${x.html||""}<span class="tl-barra-fim">${sin}</span></span>`:""}</span></li>`;
  }
  const barra = `<span class="tl-barra tl-barra-of">${inf.destaque||""}
      <button class="tl-bt${inf.destaque?"":" forte"}" onclick="abrirSeguimento(${inf.i})" title="anotar, atribuir a alguém com data ou marcar prazo processual a partir deste movimento"><span aria-hidden="true">Tarefa</span><span class="sr-only">Criar tarefa ou prazo</span></button>
      ${inf.portal?`<a class="tl-bt tl-link" href="${urlOk(inf.portal.href)}" target="_blank" rel="noopener" title="abrir no ${esc(inf.portal.rot)}">Abrir no ${esc(inf.portal.rot)} ${IC_SVG.ir}</a>`:""}
      <button class="tl-bt" onclick="${inf.msg}" title="mensagem pronta sobre este movimento">Mensagem<span class="sr-only"> ao cliente</span></button>
      <span class="tl-barra-fim">
        ${inf.lido===false?`<button class="tl-bt tl-bt-ic" onclick="liNaFicha('${inf.andId}')" aria-label="Marcar como lido" title="marcar como lido (sai das Novidades)">${IC_SVG.ok}</button>`:""}
        ${inf.sinais}
        ${menuMais([
          inf.menu[0]||"",
          `<button class="tl-mais-it" role="menuitem" onclick="copiar(${esc(JSON.stringify(x.texto||""))},'Texto copiado')" title="Copiar o texto">Copiar<span class="sr-only"> o texto</span></button>`,
          ...inf.menu.slice(1),
        ])}
      </span></span>`;
  return `<li class="${cls}"><span class="texto">${cab}${corpo}${inf.antes}${inf.docs}${inf.prazo}${inf.feito}${barra}</span></li>`;
}
function tlOficial(itens, vazio){
  if(!(itens||[]).length)
    return `<p class="meio-sub" style="padding:8px 12px">${vazio||"Sem movimentos."}</p>`;
  let corpo="", diaAtual=null, rotina=[];
  // F190 · movimentos de rotina do mesmo dia (expedição, juntada, conclusão)
  // dobram numa linha; dois ou mais, senão o cartão sai normal
  const soltarRotina = () => {
    if(rotina.length>1){
      const nl = rotina.filter(x=>x.and && !euLi(x.and)).length;
      corpo += `<li class="tl-rotina"><details><summary>+ ${rotina.length} movimentos de rotina (${esc([...new Set(rotina.map(x=>String(x.texto||"").split(/[ .,(]/)[0].toLowerCase()))].slice(0,3).join(", "))})${nl?` · ${nl} não lido${nl>1?"s":""}`:""}</summary>
        <ul class="tl-rotina-itens">${rotina.map(cartaoTl).join("")}</ul></details></li>`;
    } else corpo += rotina.map(cartaoTl).join("");
    rotina = [];
  };
  for(const x of itens){
    const d=(x.q||"").slice(0,10);
    if(temaV10() && ehRotina(x)){
      if(d && d!==diaAtual){ soltarRotina(); if(diaAtual!==null) corpo+=fecharDia(); corpo+=abrirDia(dataRelativa(d)); diaAtual=d; }
      rotina.push(x); continue;
    }
    if(temaV10()) soltarRotina();
    if(d && d!==diaAtual){ if(diaAtual!==null) corpo+=fecharDia(); corpo+=abrirDia(dataRelativa(d)); diaAtual=d; }
    const hora=(x.q||"").length>=16 ? (x.q||"").slice(11,16) : "";
    // F46 · registro do escritório leva o avatar COLORIDO do colaborador
    // (corAv), não o selo neutro de fonte — a autoria salta como na conversa
    // x.and = a linha de `andamentos` por trás do item, quando existe uma.
    // Espelho de jsonb (Recurso, CNJ) não tem — e sem linha não há o que marcar.
    // Tema v10: o andamento do processo vira o MESMO cartão da anotação do
    // escritório (pedido do Paulo, 10.10.2026), com duas diferenças de
    // propósito: o selo da fonte no lugar do avatar e fundo próprio, e sem
    // responder, editar ou apagar, porque reproduz o portal. A resposta da
    // equipe nasce pelo 📌 dar seguimento.
    if(temaV10()){ corpo+=cartaoTl(x); continue; }
    corpo+=`<li class="tl-of ${x.cls||""}${x.forte?" tudo-marco":""}${clsSinal(x.and)}">
      <span class="quando" title="${esc(x.rot||"")}"><span class="avatar mini${x.corAv?`" style="background:${x.corAv}`:` av-fonte`}">${x.em||"·"}</span><span class="q-dt">${d?fmt(d):"—"}</span></span>
      <span class="texto"><b class="autor-nome">${esc(x.rot||"")}</b>${hora?`<span class="tl-hora">${hora}</span>`:""}<br>${x.forte?`<b>${esc(x.texto||"")}</b>`:esc(x.texto||"")}</span>
      ${/* F138 · ✔ li, ⭐ e ⚡ numa coluna própria: colados no fim do texto,
           cada linha os punha numa altura e numa margem diferentes */""}
      <span class="tl-fim">${x.html||""}${sinaisHtml(x.and)}</span>
    </li>`;
  }
  if(temaV10()) soltarRotina();
  if(diaAtual!==null) corpo+=fecharDia();
  return `<ul class="timeline">${corpo}</ul>`;
}
// F110 · no tema v10 cada dia é um BLOCO: a data numa coluna à esquerda e os
// registros do dia ao lado — a unidade de leitura do escritório é o dia, como
// sempre foi no To Do ("DD.MM.AAAA (Autor):"). Fora do tema, o separador de
// dia segue sendo a linha central <li class="tl-dia">.
function abrirDia(rot){
  return temaV10()
    ? `<li class="dia-bloco"><div class="tl-dia"><span>${esc(rot)}</span></div><ul class="dia-itens">`
    : `<li class="tl-dia"><span>${esc(rot)}</span></li>`;
}
function fecharDia(){ return temaV10() ? `</ul></li>` : ""; }

// ── a linha do tempo do escritório ────────────────────────────────────────
// A conclusão de uma tarefa nasce como RESPOSTA do comentário que a pediu
// (andamentos.responde_a), não como comentário solto. Num processo com três
// tarefas abertas, um "✔ Cumpri a exigência" perdido no topo não dizia de
// qual delas era. Aqui a resposta fica embaixo do pedido, recuada: lê-se
// "o que foi pedido → o que foi feito" de uma vez só.
// ══════════════════════════════════════════════════════════════════════════
// F21 · ANOTAÇÃO COM TIPO — o vocabulário fechado do escritório
// ══════════════════════════════════════════════════════════════════════════
// Pesquisa de 16.08.2026 sobre Clio, MyCase, Notion, Linear, Obsidian, Astrea,
// ADVBOX e as Tabelas Unificadas do CNJ. O que todos os bons fazem igual:
//   · a anotação humana é um EVENTO DATADO COM TIPO, de vocabulário FECHADO
//     (Clio: activity categories da firma; CNJ: tabela de movimentos;
//     Linear: um eixo com valores fechados) — tag livre apodrece;
//   · autor e hora são CARIMBADOS, nunca digitados (Notion: Created by);
//   · andamento capturado de máquina nunca se mistura com anotação de gente
//     sem marcar a origem (Astrea, ADVBOX) — aqui já é assim, pelas sub-abas;
//   · o texto livre não se codifica: o template dá o ESQUELETO e a pessoa
//     preenche (Notion/Linear), o que separa "conversei com a cliente" de uma
//     anotação com valor probatório seis meses depois.
//
// O tipo entra como prefixo [TIPO] no próprio texto: viaja para o To Do
// legível, a pesquisa acha, e nenhuma coluna nova é preciso. Sem tipo, o
// comentário continua livre — tipo é atalho, não obrigação. E não existe o
// tipo "OUTROS": ele viraria o dreno onde tudo cai.
const TIPOS_ANOTACAO = [
  ["exigencia","Exigência","laranja",
   "[EXIGÊNCIA] O que o INSS exigiu: \nPrazo para cumprir: \nDocumento que falta: \nQuem vai cumprir: "],
  ["pericia","Perícia","per",
   "[PERÍCIA] Resultado: \nO que o perito considerou: \nO que contraria o laudo assistente: \nPróximo passo: "],
  ["prova","Prova","verde",
   "[PROVA] O que chegou: \nPeríodo que cobre: \nOnde foi guardada: "],
  ["contato","Contato","neutro",
   "[CONTATO] Canal: \nO que foi dito ao cliente: \nCompromisso assumido: "],
  ["decisao","Decisão","ben",
   "[DECISÃO] O que o escritório decidiu: \nPor quê: "],
  ["protocolo","Protocolo","neutro",
   "[PROTOCOLO] Número: \nO que foi protocolado: \nDER: "],
];
const RX_TIPO_ANOT = /^\[(EXIGÊNCIA|PERÍCIA|PROVA|CONTATO|DECISÃO|PROTOCOLO|DOCUMENTOS|PETIÇÃO|OUVIDORIA)\]\s*/;
const COR_TIPO_ANOT = {"EXIGÊNCIA":"laranja","PERÍCIA":"per","PROVA":"verde",
                       "CONTATO":"neutro","DECISÃO":"ben","PROTOCOLO":"neutro",
                       "DOCUMENTOS":"verde","PETIÇÃO":"ben","OUVIDORIA":"laranja"};
function autoAltura(t){ if(!t) return; t.style.height="auto";
  t.style.height=Math.min(t.scrollHeight, 220)+"px"; }
function escolherTipoAnotacao(chave){
  const inp = document.getElementById("and-texto"); if(!inp) return;
  const t = TIPOS_ANOTACAO.find(x=>x[0]===chave); if(!t) return;
  const molde = t[3].replace(/\\n/g, "\n");
  const rotEmCima = RX_TIPO_ANOT.exec(inp.value.trim());
  // clicar de novo no MESMO tipo tira o esqueleto, se ninguém escreveu nada
  const soMolde = TIPOS_ANOTACAO.some(x=>{
    const m = x[3].replace(/\\n/g, "\n");
    return inp.value.trim() === m.trim() || inp.value === m;
  });
  if(rotEmCima && soMolde && molde.startsWith("["+rotEmCima[1]+"]")){
    inp.value = ""; pintarTipoFila(); autoAltura(inp); inp.focus(); return;
  }
  if(!inp.value.trim() || soMolde){
    inp.value = molde;
  }else if(!RX_TIPO_ANOT.test(inp.value.trim())){
    // já tem texto escrito: só o rótulo entra na frente, sem apagar nada
    inp.value = molde.slice(0, molde.indexOf("]")+2) + inp.value;
  }else{
    // trocar o tipo de um texto já rotulado troca só o rótulo
    inp.value = molde.slice(0, molde.indexOf("]")+2) + inp.value.replace(RX_TIPO_ANOT, "");
  }
  pintarTipoFila(); autoAltura(inp);
  inp.focus();
  // o cursor vai para o fim da primeira lacuna, que é onde se começa a escrever
  const fim = inp.value.indexOf("\n");
  inp.setSelectionRange(fim<0?inp.value.length:fim, fim<0?inp.value.length:fim);
}
function pintarTipoFila(){
  const inp = document.getElementById("and-texto");
  const m = inp && RX_TIPO_ANOT.exec(inp.value.trim());
  document.querySelectorAll("#tipo-fila .tipo-ch").forEach(b=>{
    const t = TIPOS_ANOTACAO.find(x=>x[0]===b.dataset.tipoand);
    b.classList.toggle("on", !!(m && t && t[3].startsWith("["+m[1]+"]")));
  });
}
// ══════════════════════════════════════════════════════════════════════════
// F105 · O TIPO ABRE UMA JANELA (tema v10). Campos curtos + observação livre
// viram um comentário padronizado no compositor; a pessoa completa (tarefa
// para / lembrar em) e registra. Os tipos e a ordem vieram das 23 mil
// anotações do To Do lidas em 17.09.2026: trouxe documentos, exigência,
// perícia, protocolo, petição, decisão, contato e ouvidoria. O que já era
// automático no Registrar (protocolo → ficha, perícia → agenda, DCB) continua
// valendo, porque o texto sai no formato que o Registrar reconhece.
// ══════════════════════════════════════════════════════════════════════════
const linhasDe = s => String(s||"").split(/\n|;/).map(x=>x.trim()).filter(Boolean);
const POPS_ANOTACAO = {
  documentos:{rot:"Trouxe documentos", cor:"verde", campos:[
      {id:"docs", rot:"Documentos trazidos (um por linha)", tipo:"textarea", ph:"CTPS\nCarnês 2019 a 2021", req:true, larga:true},
      {id:"drive", rot:"Anexei no Drive do cliente", tipo:"check", larga:true,
       dica:"o PDF vai na pasta do cliente com o nome “Nome do documento + data”, ex.: CTPS 17-09-2026.pdf"}],
    texto:v=>`[DOCUMENTOS] Trouxe: ${linhasDe(v.docs).join("; ")}.${v.drive?" Anexado no Drive (PDF “documento + data”).":""}`},
  exigencia:{rot:"Exigência", cor:"laranja", campos:[
      {id:"oque", rot:"O que o INSS exigiu", tipo:"text", req:true, larga:true},
      {id:"prazo", rot:"Prazo para cumprir", tipo:"date", req:true},
      {id:"doc", rot:"Documento que falta", tipo:"text"},
      {id:"quem", rot:"Quem vai cumprir", tipo:"equipe"}],
    texto:v=>`[EXIGÊNCIA] O que o INSS exigiu: ${v.oque}\nPrazo para cumprir: ${fmtBarra(v.prazo)}\nDocumento que falta: ${v.doc||"—"}\nQuem vai cumprir: ${v.quem||"—"}`,
    // a exigência é PRAZO do caso: entra nos quadros vermelhos e na lista ⚠
    efeito:async(k,v)=>{ k.exigencia_prazo=v.prazo; k.exigencia_descricao=v.oque;
      await patchCaso(k.id,{exigencia_prazo:v.prazo, exigencia_descricao:v.oque});
      await marcarEtapa(k.id, "em exigência"); }},
  pericia:{rot:"Perícia", cor:"per", campos:[
      {id:"tipo", rot:"Tipo", tipo:"select", opts:["Perícia médica","Avaliação social","Perícia judicial","Audiência"]},
      {id:"data", rot:"Data", tipo:"date", req:true},
      {id:"hora", rot:"Hora", tipo:"time"},
      {id:"local", rot:"Local", tipo:"text", ph:"APS Monte Alto · fórum · sala"}],
    // no formato que o Registrar já lê: vira agendamento na aba Perícias
    texto:v=>`${v.tipo} agendada para ${fmtBarra(v.data)}${v.hora?` às ${v.hora}`:""}${v.local?` em ${v.local}`:""}.`,
    efeito:async(k,v)=>{ await marcarEtapa(k.id, k.fase==="judicial" ? "perícia designada" : "aguardando perícia"); }},
  protocolo:{rot:"Protocolo", cor:"neutro", campos:[
      {id:"num", rot:"Número do protocolo", tipo:"text", ph:"só os dígitos", req:true},
      {id:"oque", rot:"O que foi protocolado", tipo:"text", ph:"requerimento de …"},
      {id:"der", rot:"DER", tipo:"date"}],
    // "Protocolo … 1234567890" é o que o Registrar guarda na ficha (linha do caso)
    texto:v=>`[PROTOCOLO] Número: ${soDig(v.num)}\nO que foi protocolado: ${v.oque||"—"}\nDER: ${v.der?fmtBarra(v.der):"—"}`,
    efeito:async(k,v)=>{ if(v.der && !k.der){ k.der=v.der; await patchCaso(k.id,{der:v.der}); }
      // F220 · protocolado o requerimento, o caso sai do Escritório e vai ao INSS
      if(k.fase==="escritorio") await andarEtapa(k.id, "🌻 INSS", `requerimento protocolado${v.der?` em ${fmtBarra(v.der)}`:""}`, "requerimento protocolado");
      else if(k.fase==="inss" && !k.etapa) await marcarEtapa(k.id, "requerimento protocolado"); }},
  peticao:{rot:"Petição", cor:"ben", campos:[
      {id:"onde", rot:"Onde", tipo:"select", opts:["INSS","CRPS","Judicial"]},
      {id:"qual", rot:"Petição", tipo:"select", dependeDe:"onde", optsPor:{
        INSS:["Requerimento","Cumprimento de exigência","Pedido de revisão","Recurso","Outra"],
        CRPS:["Recurso Ordinário","Recurso Especial","Embargos de Declaração","Contrarrazões","Outra"],
        Judicial:["Petição Inicial","Manifestação do Laudo","Réplica","Apelação","Embargos de Declaração","Cumprimento de sentença","Outra"]}},
      {id:"data", rot:"Protocolada em", tipo:"date", padrao:"hoje", req:true}],
    texto:v=>`[PETIÇÃO] ${v.qual} — ${v.onde}, protocolada em ${fmtBarra(v.data)}.`,
    // as datas do recurso (RO, RE, ED) e do ajuizamento moram no caso
    efeito:async(k,v)=>{
      const campo = v.onde==="CRPS" ? {"Recurso Ordinário":"ro_protocolado_em","Recurso Especial":"re_protocolado_em","Embargos de Declaração":"ed_protocolado_em"}[v.qual]
        : (v.onde==="Judicial" && v.qual==="Petição Inicial" && !k.ajuizado_em) ? "ajuizado_em" : null;
      if(campo){ k[campo]=v.data; await patchCaso(k.id,{[campo]:v.data}); }
      // F117 · protocolou, o caso anda de etapa sozinho (com desfazer)
      if(v.onde==="CRPS")
        await andarEtapa(k.id, "🖥 Conselho de Recursos", `${v.qual} protocolado em ${fmtBarra(v.data)}`, "recurso protocolado");
      else if(v.onde==="Judicial" && v.qual==="Petição Inicial")
        await andarEtapa(k.id, "👪 Judicial", `ação distribuída em ${fmtBarra(v.data)}`, "ação distribuída");
      else if(v.onde==="INSS" && v.qual==="Requerimento")
        await andarEtapa(k.id, "🌻 INSS", `requerimento protocolado em ${fmtBarra(v.data)}`, "requerimento protocolado");
      else if(v.onde==="INSS" && v.qual==="Cumprimento de exigência"){
        // F220 · cumprida a exigência, o prazo dela sai dos quadros
        if(k.exigencia_prazo){ k.exigencia_prazo=null; k.exigencia_descricao=null;
          await patchCaso(k.id,{exigencia_prazo:null, exigencia_descricao:null}); }
        await marcarEtapa(k.id, "aguardando análise"); } }},
  decisao:{rot:"Decisão", cor:"ben", campos:[
      {id:"res", rot:"Resultado", tipo:"select", opts:["Benefício concedido","Benefício indeferido","Recurso provido","Recurso improvido","Sentença procedente","Sentença improcedente","Parcialmente procedente","Outra"]},
      {id:"data", rot:"Data da decisão", tipo:"date", req:true},
      {id:"motivo", rot:"Motivo / fundamento", tipo:"text", larga:true}],
    texto:v=>`[DECISÃO] ${v.res} em ${fmtBarra(v.data)}.${v.motivo?` Motivo: ${v.motivo}`:""}`,
    // decisão contrária arma o "Recorrer até" (30 dias) nos quadros de prazo
    // F220 · a decisão encerra a exigência e grava o resultado; a favorável
    // desliga o "Recorrer até" que a contrária anterior tinha armado
    efeito:async(k,v)=>{
      const contra = /indeferid|improvid|improcedente|parcial/i.test(v.res), favor = /concedido|provido|procedente/i.test(v.res) && !contra;
      // a contrária não grava "indeferido" no resultado: ele é o desfecho do
      // caso e entra na taxa de êxito do painel, e o caso ainda vai recorrer
      const muda = {};
      if(contra){ muda.decisao_em = v.data; if(k.resultado==="deferido") muda.resultado = null; }
      else if(favor){ muda.decisao_em = v.data; muda.resultado = "deferido"; }
      if(k.exigencia_prazo){ muda.exigencia_prazo = null; muda.exigencia_descricao = null; }
      if(Object.keys(muda).length){ Object.assign(k, muda); await patchCaso(k.id, muda); }
      await marcarEtapa(k.id, k.fase==="judicial" ? "sentença publicada" : k.fase==="conselho" ? "julgado" : "decidido"); }},
  contato:{rot:"Contato", cor:"neutro", campos:[
      {id:"canal", rot:"Canal", tipo:"select", opts:["WhatsApp","Telefone","Presencial","E-mail"]},
      {id:"dito", rot:"O que foi dito ao cliente", tipo:"text", larga:true},
      {id:"comp", rot:"Compromisso assumido", tipo:"text", larga:true}],
    texto:v=>`[CONTATO] Canal: ${v.canal}\nO que foi dito ao cliente: ${v.dito||"—"}\nCompromisso assumido: ${v.comp||"—"}`},
  ouvidoria:{rot:"Ouvidoria", cor:"laranja", campos:[
      {id:"acao", rot:"O que houve", tipo:"select", opts:["Fiz reclamação na ouvidoria","Resposta da ouvidoria"]},
      {id:"num", rot:"Nº da manifestação", tipo:"text"},
      {id:"sobre", rot:"Sobre o quê / o que respondeu", tipo:"text", larga:true}],
    texto:v=>`[OUVIDORIA] ${v.acao}${v.num?` — manifestação nº ${v.num}`:""}.${v.sobre?` ${v.sobre}`:""}`},
};
