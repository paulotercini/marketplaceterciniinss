// F98 · o cadastro a partir do requerimento: a ficha nasce com o que o PAT
// trouxe (nome, CPF, nascimento, nome da mãe, celular) e o plano é refeito —
// o protocolo sai de "sem cliente" e entra em "casos novos", pronto para o
// Aplicar. Mesmas travas do cadastro comum: CPF válido e sem repetição.
async function cadastrarDoPat(protocolo){
  const n = planoPat && (planoPat.semCliente||[]).find(x=>x.protocolo===protocolo);
  if(!n) return aviso("Não achei esse requerimento no plano");
  if(!n.nome) return aviso("O PAT não trouxe o nome — cadastre pelo ＋ Novo Cliente");
  const cpf = digitosCpf(n.cpf)||null;
  if(cpf && !cpfValido(cpf)) return aviso(`CPF ${fmtCpf(cpf)} inválido no PAT — cadastre pelo ＋ Novo Cliente e confira`);
  if(cpf){
    let jaTem = D.clientes.find(c=>digitosCpf(c.cpf)===cpf);
    if(!jaTem){
      const achados = await api(`/rest/v1/clientes?select=*&cpf=eq.${cpf}`).catch(()=>[]);
      if(achados && achados.length){ jaTem=achados[0]; D.clientes.push(jaTem); D.cliPorId.set(jaTem.id, jaTem); }
    }
    if(jaTem){ aviso(`${jaTem.nome} já tem ficha com esse CPF — o plano foi refeito`, false);
      return refazerPlanoPat(); }
  }
  const campos={atendimento:[{em:new Date().toISOString(), quem:(eu.nome||"").split(" ")[0],
    texto:`Cadastrado a partir do requerimento ${protocolo} do INSS (importação do PAT)${n.quem_protocolou?` — protocolado por ${n.quem_protocolou}`:""}.`}]};
  let cli;
  try{
    [cli]=await api(`/rest/v1/clientes`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({nome:n.nome, cpf, dn:n.dn||null, nome_mae:n.nome_mae||null,
        telefone:n.telefone||null, campos})})||[];
  }catch(e){ return aviso("Não consegui cadastrar: "+String(e.message||e).slice(0,100)); }
  if(!cli) return aviso("O banco não devolveu a ficha — tente de novo");
  D.clientes.push(cli); D.cliPorId.set(cli.id, cli);
  if(D.casosDoCliente && !D.casosDoCliente.has(cli.id)) D.casosDoCliente.set(cli.id, []);
  aviso(`✔ ${cli.nome} cadastrado — o requerimento ${protocolo} entrou em "casos novos"`, false);
  await refazerPlanoPat();
}
async function refazerPlanoPat(){
  if(!arquivoPat) return render();
  const id = planoPat && planoPat.coleta_id;
  planoPat = await montarPlanoPat(arquivoPat);
  if(id) planoPat.coleta_id = id;
  render();
}
function patIgnorados(){
  const v = cfgApp("pat_ignorar");
  if(Array.isArray(v)) return v;
  try{ return JSON.parse(v||"[]"); }catch(e){ return []; }
}
async function ignorarProtocolo(protocolo){
  const lista=[...new Set([...patIgnorados(), protocolo])];
  await guardarCfgApp("pat_ignorar", JSON.stringify(lista));
  if(planoPat){
    planoPat.possiveisDuplicados = planoPat.possiveisDuplicados.filter(x=>x.protocolo!==protocolo);
    planoPat.ignorados_de_vez = (planoPat.ignorados_de_vez||0)+1;
    if(planoPat.resumo){
      planoPat.resumo.possiveis_duplicados = planoPat.possiveisDuplicados.length;
      planoPat.resumo.provaveis = planoPat.possiveisDuplicados.filter(x=>x.provavel).length;
    }
  }
  aviso("🚫 Este protocolo não pergunta mais — desfaz-se no “limpar ignorados”", false);
  render();
}
async function limparIgnoradosPat(){
  await guardarCfgApp("pat_ignorar","[]");
  aviso("Lista de ignorados limpa — voltam a aparecer na próxima conferência", false);
  render();
}

// F236 · a última leitura de cada portal, aplicada ou não: em vermelho a que passou de um dia útil
let ultimasColetas = null;
async function buscarUltimasColetas(){
  try{ ultimasColetas = await api(`/rest/v1/coletas?select=fonte,criado_em,host:dados->>host,grau:dados->>grau,sistema:dados->>sistema,login:dados->>login&order=criado_em.desc&limit=400`) || []; }
  catch(e){ ultimasColetas = []; }
}
function linhaUltimasColetas(){
  if(!ultimasColetas || !ultimasColetas.length) return "";
  const vistas = new Map();
  for(const c of ultimasColetas){
    const ch = c.fonte==="pje-processo" || (c.fonte==="crps" && c.login==="cliente") ? null : c.fonte==="pje" ? `pje:${c.host||""}:${c.grau||""}` : c.fonte==="prazos" ? `prazos:${c.sistema||""}:${c.host||""}` : c.fonte;
    if(ch && !vistas.has(ch)) vistas.set(ch, c);
  }
  let limite = somaDias(hoje(),-1); while(!ehDiaUtil(limite)) limite = somaDias(limite,-1);
  return `<p class="meio-sub ult-coletas">Última leitura de cada portal: ${[...vistas.values()].map(c=>{ const d = dataSP(c.criado_em), velha = d<limite;
    const nome = c.fonte==="pat" ? "🌻 INSS" : c.fonte==="pje" ? `${rotuloSistemaPje(c)}${c.grau?` · ${c.grau}`:""}` : c.fonte==="prazos" ? `⏰ Prazos · ${rotuloSistemaPje(c)}` : "🖥 Recursos";
    return `<span${velha?` style="color:var(--vermelho)" title="mais de um dia útil sem coleta: rode a extensão"`:""}>${esc(nome)} ${esc(fmt(d).slice(0,5))} ${esc(horaSP(c.criado_em))}</span>`; }).join(" · ")}</p>`;
}
function renderImportarPat(){
  tituloLista("📥 Importar do INSS");
  if(ultimasColetas===null) buscarUltimasColetas().then(()=>{ if(visao==="patinss" && !planoPat) renderImportarPat(); });
  document.getElementById("sub-lista").textContent =
    "O que o PAT/GERID tem, comparado com o que o CRM já sabe. Nada é gravado sem você mandar.";
  // Se a montagem da tela estourar, o padrão do navegador é deixar o quadro
  // em branco e escrever no console — e quem está usando vê "não aconteceu
  // nada". A coleta continua guardada na fila; o que falta é dizer o que
  // houve, com a mensagem do erro, aqui na tela.
  try{
    document.getElementById("conteudo-meio").innerHTML = telaImportarPat();
  }catch(e){
    console.error("tela de importação:", e);
    document.getElementById("conteudo-meio").innerHTML =
      `<div class="exig"><strong>A tela de importação quebrou:</strong> ${esc(e.message||String(e))}.
       Nada foi gravado, e a coleta continua na fila.</div>`;
  }
  ligarImportarPat();
  if(!coletasPendentes.length) buscarColetas().then(()=>{
    if(coletasPendentes.length && visao==="patinss"){
      document.getElementById("conteudo-meio").innerHTML = telaImportarPat();
      ligarImportarPat();
    }
  });
}
function telaImportarPat(){
  const r = planoPat && planoPat.resumo;
  const cx = n => `<div class="id-card"><strong style="font-size:20px">${n[1]}</strong>
    <div class="u-papel" style="text-transform:none">${n[0]}</div></div>`;
  return `<div class="pat-cx">
    <h3>📥 Importar do PAT/GERID</h3>
    <p class="meio-sub">Solte aqui o arquivo <code>pat_AAAA-MM-DD.json</code> que o coletor baixou.
      Nada é gravado até você conferir e mandar aplicar.</p>
    ${linhaUltimasColetas()}
    ${avisoSemCaso()}
    ${linhaEtapasDoImportar()}
    ${(()=>{ const {novas, velhas} = coletasPorFonte();
      if(!novas.length) return `<p class="meio-sub">Nenhuma coleta esperando. Use a extensão do navegador,
        ou solte um arquivo aqui embaixo.</p>`;
      return `<div class="id-grid" style="grid-template-columns:1fr;gap:6px;margin:10px 0">
      ${novas.map(c=>`<div class="id-card destaque" style="display:flex;align-items:center;gap:10px">
        <strong>${c.fonte==="pat"?"🌻 INSS":c.fonte==="pje"?`${rotuloSistemaPje(c)}${c.grau?` · ${esc(c.grau)}`:""}${c.parcial==="true"?` · lote de ${new Date(c.criado_em).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}`:""}`
          :c.fonte==="pje-processo"?`⚖️ Processo completo${c.numero?` ${esc(c.numero)}`:c.qtd?` — lote de ${esc(c.qtd)} processos`:""}`
          :c.fonte==="prazos"?`⏰ Prazos · ${rotuloSistemaPje(c)}${c.grau?` · ${esc(c.grau)}`:""}`:"🖥 Recursos"}</strong>
        <span class="u-papel" style="text-transform:none">chegou ${esc(dataRelativa(dataSP(c.criado_em)))} às ${esc(horaSP(c.criado_em))}</span>
        <button class="btn-mini" style="margin-left:auto" onclick="${
          c.fonte==="crps"?`conferirCrps('${c.id}')`:c.fonte==="pje"?`conferirPje('${c.id}')`
          :c.fonte==="pje-processo"?`conferirPjeProc('${c.id}')`
          :c.fonte==="prazos"?`aplicarPrazos('${c.id}')`:`usarColeta('${c.id}')`}">${c.fonte==="prazos"?"gravar":"conferir"}</button>
      </div>`).join("")}
      ${coletasDoLote().length>1?`<button class="btn-mini forte" onclick="aplicarTodasColetas()"
        title="conferir e aplicar, uma depois da outra, as coletas dos tribunais, dos recursos e dos prazos (o INSS continua no botão dele)">✔ conferir e aplicar todas (${coletasDoLote().length})</button>`:""}
      ${velhas.length?`<div class="meio-sub" style="display:flex;align-items:center;gap:8px">
        ${velhas.length} coleta(s) anterior(es) da mesma origem — a mais nova já contém o que elas tinham.
        <button class="btn-mini" onclick="descartarColetasVelhas()">descartar</button></div>`:""}
    </div>`; })()}
    <input type="file" id="pat-arq" accept="application/json" style="margin:10px 0">
    ${!planoCrpsAtual ? "" : (()=>{ const q = planoCrpsAtual.resumo; return `
      <h3 class="secao">🖥 Recursos — o que esta coleta vai escrever</h3>
      <div class="id-grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
        ${[["processos lidos", q.lidos], ["recursos atualizados", q.casos],
           ["movimentos novos", q.movimentos], ["com DECISÃO", q.decisoes],
           ["número sem caso no CRM", q.sem_caso]].map(n=>
          `<div class="id-card"><strong style="font-size:20px">${n[1]}</strong>
            <div class="u-papel" style="text-transform:none">${n[0]}</div></div>`).join("")}
      </div>
      ${q.decisoes?`<div class="exig"><strong>⚠ ${q.decisoes} decisão(ões).</strong>
        Cada uma abre prazo: da Junta, 30 dias para o Recurso Especial; de Câmara,
        acaba a via administrativa. O texto do andamento já diz qual é o caso.</div>`:""}
      ${q.sem_caso?`<div class="exig"><strong>${q.sem_caso} recurso(s)</strong> sem caso com esse NUP no CRM —
        enquanto não tiverem dono, os movimentos deles não entram.
        ${q.vinculaveis?`<div style="margin:6px 0">${q.vinculaveis} deles têm o nome do recorrente batendo
          com UM cliente do CRM que tem UM caso ativo sem NUP —
          <button class="btn-mini" onclick="vincularTodosCrps()">vincular os ${q.vinculaveis}</button>
          <span class="meio-sub">preenche o NUP do caso; nada além disso</span></div>`:""}
        ${planoCrpsAtual.semCaso.slice(0,60).map(x=>`<div class="meio-sub" style="margin-top:3px">
          <b>${esc(formatarNup(x.nup))}</b>${x.nome?` — ${esc(x.nome)}`:""}${x.num_proc?` <small>· NB ${esc(x.num_proc)}</small>`:""}
          ${x.sugestao?`<button class="btn-mini" onclick="vincularRecursoCrps('${x.nup}')"
            title="${esc(x.sugestao.caso_titulo||"")}">vincular ao caso de ${esc(x.sugestao.cliente_nome.split(" ")[0])}</button>`
            :x.sugestao_novo?`<button class="btn-mini" onclick="criarCasoCrpsPara('${x.nup}','${x.sugestao_novo.cliente_id}')"
              title="o cliente existe, mas os casos dele já têm NUP — este é outro recurso">➕ criar caso p/ ${esc(x.sugestao_novo.cliente_nome.split(" ")[0])}</button>`:""}
          <button class="btn-mini" onclick="escolherCasoCrps('${x.nup}')"
            title="busque o cliente e vincule ao caso certo (ou crie um novo)">🔍 escolher</button>
          <button class="btn-mini" onclick="ignorarRecursoCrps('${x.nup}')"
            title="não é recurso nosso — para de aparecer em toda coleta">🚫</button></div>`).join("")}
        ${q.sem_caso>60?`<div class="meio-sub">…e mais ${q.sem_caso-60}. Vincule estes e confira de novo — a lista encolhe.</div>`:""}</div>`:""}
      ${(q.ignorados||crpsIgnorados().length)?`<p class="meio-sub" style="margin-top:6px">🚫 ${crpsIgnorados().length} recurso(s)
        ignorados de vez${q.ignorados?` (${q.ignorados} escondidos nesta conferência)`:""} —
        <a href="#" onclick="event.preventDefault();limparIgnoradosCrps()">limpar e voltar a perguntar</a></p>`:""}
      ${planoCrpsAtual.andamentos.length?`<table class="tab">
        <tr><th>cliente</th><th>o que mudou</th></tr>
        ${planoCrpsAtual.andamentos.slice(0,40).map(a=>{
          const k = D.casoPorId.get(a.caso_id)||{}; const cl = D.cliPorId.get(k.cliente_id)||{};
          return `<tr><td>${esc(cl.nome||"—")}</td>
            <td style="white-space:pre-wrap">${esc(a.texto)}</td></tr>`;}).join("")}
      </table>`:"<p class='meio-sub'>Nenhum movimento novo — nada a escrever.</p>"}
      <button class="novo-cli" style="width:auto;margin:12px 0 0;padding:10px 20px"
        onclick="aplicarCrps('${planoCrpsAtual.coleta_id}')">Aplicar ${q.movimentos} movimento(s)</button>`; })()}
    ${!planoPjeAtual ? "" : (()=>{ const q = planoPjeAtual.resumo; return `
      <h3 class="secao">${rotuloSistemaPje(planoPjeAtual)}${planoPjeAtual.grau?` · ${esc(planoPjeAtual.grau)}`:""} — o que esta coleta vai escrever</h3>
      <div class="id-grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
        ${[["processos lidos", q.lidos], ["movimentos novos", q.movimentos],
           ["sem mudança", q.sem_mudanca], ["sem caso no CRM", q.sem_caso],
           ["fichas a completar (classe/ajuizamento/órgão)", q.fichas||0]].map(n=>
          `<div class="id-card"><strong style="font-size:20px">${n[1]}</strong>
            <div class="u-papel" style="text-transform:none">${n[0]}</div></div>`).join("")}
      </div>
      ${q.sem_caso?`<div class="exig"><strong>${q.sem_caso} processo(s)</strong> do acervo ainda não
        têm caso com esse número aqui.
        ${q.vinculaveis?`<div style="margin:6px 0">${q.vinculaveis} deles têm o nome da parte batendo
          com UM cliente do CRM que tem UM caso ativo sem número —
          <button class="btn-mini" onclick="vincularTodosPje()">vincular os ${q.vinculaveis}</button>
          <span class="meio-sub">preenche o campo "processo" do caso; nada além disso</span></div>`:""}
        ${planoPjeAtual.semCaso.slice(0,60).map(p=>`<div class="meio-sub" style="margin-top:2px">${esc(p.numero)} — ${esc((p.partes||"").slice(0,60))}
          ${p.sugestao?`<button class="btn-mini" onclick="vincularProcessoPje('${p.numero}')">vincular ao caso de ${esc(p.sugestao.cliente_nome.split(" ")[0])}</button>`
            :p.sugestao_novo?`<button class="btn-mini" onclick="criarCasoPje('${p.numero}')"
              title="o cliente existe, mas os casos dele já têm número — este é um segundo processo">➕ criar caso p/ ${esc(p.sugestao_novo.cliente_nome.split(" ")[0])}</button>`:""}
          <button class="btn-mini" onclick="escolherCasoPje('${p.numero}')"
            title="é caso nosso, mas o nome não casou sozinho — busque o cliente e vincule ao caso certo (ou crie um novo)">🔍 escolher</button>
          <button class="btn-mini" onclick="ignorarProcessoPje('${p.numero}')"
            title="não é caso nosso (instrumental, de terceiro — ex.: só para uma certidão) — para de aparecer em toda coleta">🚫</button></div>`).join("")}
        ${q.sem_caso>60?`<div class="meio-sub">…e mais ${q.sem_caso-60}. Vincule estes e confira de novo — a lista encolhe.</div>`:""}</div>`:""}
      ${(q.ignorados||pjeIgnorados().length)?`<p class="meio-sub" style="margin-top:6px">🚫 ${pjeIgnorados().length} processo(s)
        ignorados de vez${q.ignorados?` (${q.ignorados} escondidos nesta conferência)`:""} —
        <a href="#" onclick="event.preventDefault();limparIgnoradosPje()">limpar e voltar a perguntar</a></p>`:""}
      ${planoPjeAtual.andamentos.length?`<table class="tab">
        <tr><th>cliente</th><th>o que mudou</th></tr>
        ${planoPjeAtual.andamentos.slice(0,40).map(a=>{
          const k = D.casoPorId.get(a.caso_id)||{}; const cl = D.cliPorId.get(k.cliente_id)||{};
          return `<tr><td>${esc(cl.nome||"—")}</td>
            <td style="white-space:pre-wrap">${esc(a.texto)}</td></tr>`;}).join("")}
      </table>`:"<p class='meio-sub'>Nenhum movimento novo — tudo o que o acervo mostra a ficha já sabia.</p>"}
      <button class="novo-cli" style="width:auto;margin:12px 0 0;padding:10px 20px"
        onclick="aplicarPje('${planoPjeAtual.coleta_id}')">Aplicar ${q.movimentos} movimento(s)</button>`; })()}
    ${!planoPjeProcAtual ? "" : (()=>{ const q = planoPjeProcAtual.resumo, p = planoPjeProcAtual; return `
      <h3 class="secao">⚖️ Processo completo ${esc(p.numero)}${p.grau?` · ${esc(p.grau)}`:""} — a cronologia inteira</h3>
      ${p.caso_id && (p.semCaso||[]).length?`<p class="meio-sub">${p.semCaso.length} processo(s) deste lote sem caso no CRM ficam de fora: ${esc(p.semCaso.join(", "))}</p>`:""}
      ${!p.caso_id?`<div class="exig"><strong>${(p.semCaso||[]).length>1?"Nenhum desses processos tem caso no CRM.":"Esse número não tem caso no CRM."}</strong>
        Preencha o campo "Processo (CNJ)" na ficha do cliente (lápis ✎) — ou vincule pela
        coleta do acervo — e clique em conferir de novo.</div>`:`
      <div class="id-grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
        ${[["itens na cronologia", q.itens], ["movimentos novos", q.movimentos],
           ["a ficha já tinha", q.conhecidos], ["documentos citados", q.docs]].map(n=>
          `<div class="id-card"><strong style="font-size:20px">${n[1]}</strong>
            <div class="u-papel" style="text-transform:none">${n[0]}</div></div>`).join("")}
      </div>
      <p class="meio-sub">Cada movimento entra com a DATA em que aconteceu — o que é antigo
        vai direto para a história do caso, sem passar pelas 📣 Novidades.</p>
      ${p.andamentos.length?`<table class="tab">
        <tr><th>quando</th><th>o que aconteceu</th></tr>
        ${p.andamentos.slice(0,60).map(a=>`<tr><td style="white-space:nowrap">${
          a.quando?esc(fmt(a.quando.slice(0,10))):"—"}</td>
          <td style="white-space:pre-wrap">${esc(a.texto)}</td></tr>`).join("")}
        ${p.andamentos.length>60?`<tr><td colspan="2" class="meio-sub">…e mais ${p.andamentos.length-60}</td></tr>`:""}
      </table>`:"<p class='meio-sub'>Nenhum movimento novo — a ficha já tinha essa história toda.</p>"}
      <button class="novo-cli" style="width:auto;margin:12px 0 0;padding:10px 20px"
        onclick="aplicarPjeProc('${p.coleta_id}')">Gravar ${q.movimentos} movimento(s) na história do caso</button>`}`; })()}
    ${!r ? "" : `
      <div class="id-grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
        ${[["requerimentos lidos", r.lidos], ["casos a atualizar", r.atualizar],
           ["casos novos", r.novos], ["confira antes", r.possiveis_duplicados],
           ["sem cliente no CRM", r.sem_cliente],
           ["perícias a agendar", r.eventos], ["comentários do INSS", r.comentarios],
           ["movimentações p/ 📣", r.movimentacoes],
           ["em exigência", r.exigencias],
           ["apuração (urgente)", r.apuracoes], ["espécie a confirmar", r.a_confirmar]].map(cx).join("")}
      </div>
      ${r.possiveis_duplicados ? `<div class="exig">
        <strong>${r.possiveis_duplicados} requerimento(s) podem já estar no CRM.</strong>
        O protocolo casou em poucos porque o campo quase nunca foi preenchido à mão — não
        porque o caso não existe. Estes NÃO entram no botão acima: confira na tabela
        abaixo e escolha juntar ou criar.
        ${r.provaveis ? `<div style="margin-top:8px">${r.provaveis} deles têm o mesmo
          benefício ou a mesma espécie do caso que já existe — cada linha diz por quê.
          <button class="btn-mini" onclick="juntarProvaveis()">juntar os ${r.provaveis} prováveis</button>
          <span class="meio-sub">juntar só acrescenta o protocolo ao caso; não apaga nada</span>
        </div>` : ""}</div>` : ""}
      ${r.sem_cliente ? `<div class="exig"><strong>${r.sem_cliente} requerimento(s) sem cliente no CRM.</strong>
        São protocolos que existem no INSS e não têm ficha aqui — quase sempre quem
        protocolou sozinho pelo Meu INSS. Eles NÃO entram enquanto o cliente não tiver ficha.
        ${/* F98 · o cadastro sai daqui mesmo, com o que o PAT já sabe da pessoa;
             cadastrado, o requerimento passa para "casos novos" na hora */""}
        <table class="tab" style="margin-top:8px"><tr><th>quem</th><th>CPF</th><th>o que veio do INSS</th><th></th></tr>
        ${planoPat.semCliente.map(n=>`<tr>
          <td>${esc(n.nome||"(sem nome no PAT)")}${n.dn?` <span class="meio-sub">· nasc. ${esc(n.dn.replace(/^(\d{2})(\d{2})(\d{4})$/,"$1/$2/$3"))}</span>`:""}</td>
          <td style="font-family:var(--f-mono,ui-monospace,Consolas,monospace)">${esc(fmtCpf(n.cpf))}</td>
          <td>${esc(n.beneficio||n.tipo||"—")} ${n.especie?`<span class="chip">${esc(n.especie)}</span>`:""}
            <span class="meio-sub">protocolo ${esc(n.protocolo)}${n.quem_protocolou?` · ${esc(n.quem_protocolou)}`:""}</span>
            ${n.link?`<a href="${urlOk(n.link)}" target="_blank" rel="noopener">↗</a>`:""}</td>
          <td><button class="btn-mini forte" onclick="cadastrarDoPat('${n.protocolo}')"
            title="cria a ficha com nome, CPF, nascimento, nome da mãe e celular que o PAT trouxe — e o requerimento entra como caso novo"><span aria-hidden="true">＋ Cadastrar</span><span class="sr-only">＋ cadastrar cliente</span></button></td>
        </tr>`).join("")}</table></div>` : ""}
      ${r.apuracoes ? `<div class="exig"><strong>⚠ ${r.apuracoes} apuração de irregularidade.</strong>
        É o INSS revendo benefício que já paga — pode suspender, cancelar e cobrar o recebido.
        Entram marcados como urgentes.</div>` : ""}
      ${planoPat.erro ? `<div class="exig"><strong>Não vou gravar:</strong> ${esc(planoPat.erro)}</div>`
        : `<button class="novo-cli" style="width:auto;margin:12px 0 0;padding:10px 20px"
             onclick="aplicarPat()">Aplicar ${r.atualizar + r.novos + (r.movimentacoes||0)} mudança(s)</button>`}
      ${planoPat.possiveisDuplicados.length ? `<h3 class="secao">Confira antes de criar (${planoPat.possiveisDuplicados.length})</h3>
        <table class="tab"><tr><th>cliente</th><th>o que veio do INSS</th><th>o que já existe aqui</th><th>por quê</th><th></th></tr>
        ${planoPat.possiveisDuplicados.map(n=>`<tr><td>${esc(n.nome)}</td>
          <td>${esc(n.beneficio||"—")} ${n.especie?`<span class="chip">${esc(n.especie)}</span>`:""}
            <a href="${urlOk(n.link)}" target="_blank" rel="noopener">↗</a></td>
          <td>${esc(n.titulo_existente)}</td>
          <td>${n.provavel?`<span class="chip">provável</span> `:""}<span class="meio-sub">${esc(n.motivo||"")}</span></td>
          <td><button class="btn-mini" onclick="juntarAoCaso('${n.protocolo}')" title="é o mesmo — juntar"><span aria-hidden="true">Juntar</span><span class="sr-only">é o mesmo — juntar</span></button>
            <button class="btn-mini" onclick="criarMesmoAssim('${n.protocolo}')" title="é outro — criar"><span aria-hidden="true">Criar</span><span class="sr-only">é outro — criar</span></button>
            <button class="btn-mini" onclick="ignorarProtocolo('${n.protocolo}')"
              title="nem juntar, nem criar — parar de perguntar por este protocolo em toda importação">🚫 ignorar</button></td></tr>`).join("")}
        </table>` : ""}
      ${patIgnorados().length ? `<p class="meio-sub" style="margin-top:6px">🚫 ${patIgnorados().length} protocolo(s)
        ignorados de vez${planoPat.ignorados_de_vez?` (${planoPat.ignorados_de_vez} escondidos nesta conferência)`:""} —
        <a href="#" onclick="event.preventDefault();limparIgnoradosPat()">limpar e voltar a perguntar</a></p>` : ""}
      ${planoPat.novos.length ? `<h3 class="secao">Casos novos (${planoPat.novos.length})</h3>
        <table class="tab"><tr><th>cliente</th><th>o quê</th><th>lista</th><th>DER</th><th></th></tr>
        ${planoPat.novos.slice(0,60).map(n=>`<tr><td>${esc(n.nome)}</td>
          <td>${esc(n.beneficio||"—")} ${n.especie?`<span class="chip">${esc(n.especie)}</span>`:""}</td>
          <td>${esc(NOME_FASE[n.lista]||n.lista)}</td><td>${n.der?fmt(n.der):"—"}</td>
          <td><a href="${urlOk(n.link)}" target="_blank" rel="noopener">abrir no PAT ↗</a></td></tr>`).join("")}
        </table>` : ""}`}
  </div>`;
}
function ligarImportarPat(){
  const inp = document.getElementById("pat-arq"); if(!inp) return;
  inp.onchange = async () => {
    const f = inp.files && inp.files[0]; if(!f) return;
    try{
      arquivoPat = normalizarColeta(JSON.parse(await f.text()));
      planoPat = await montarPlanoPat(arquivoPat);
      render();
    }catch(e){ aviso("Não consegui ler o arquivo: "+e.message); }
  };
}
async function aplicarPat(){
  if(!planoPat || planoPat.erro) return;
  // erro FORA do laço (dado com forma inesperada, por exemplo) não pode sumir
  // no console: o laço já se protege item a item, e o que sobra é isto
  try{ await aplicarPatDeVerdade(); }
  catch(e){ console.error("aplicar do PAT:", e);
            aviso("A importação parou: " + (e.message||String(e))); }
}
async function aplicarPatDeVerdade(){
  // F229 · o plano preso aqui, como no PJe: outra coleta conferida no meio troca o planoPat global
  const plano = planoPat;
  // UM ERRO NÃO PODE PARAR O LOTE. A primeira versão abortava no primeiro
  // problema — num lote de cem, isso deixa metade gravada e ninguém sabe
  // qual metade. Agora cada item responde por si, e o que falhou aparece no
  // fim, com o motivo.
  const falhas = []; let feitos = 0;
  const tentar = async (rotulo, f) => { try{ await f(); feitos++; }
    catch(e){ falhas.push(`${rotulo}: ${String(e.message||e).slice(0,120)}`); } };

  for(const a of plano.atualizar) await tentar(a.protocolo, async () => {
    const k = D.casoPorId.get(a.caso_id); if(!k) return;
    const campos = { ...a.mudancas, situacao_inss: a.situacao, ...(corpoProtocolos(k, [a.protocolo])||{}) };
    await patchCaso(k.id, campos);
    Object.assign(k, campos);
    if(a.andamento)
      await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({caso_id:k.id, autor_id:eu.id, texto:a.andamento,
          origem:"pat", origem_id:`situacao:${a.protocolo}:${a.situacao}`})});
  });

  for(const novo of plano.novos) await tentar(novo.protocolo, async () => {
    // F590 · outra sessão (o robô, outra aba) pode ter criado o caso depois da última carga de D: confere no banco
    let [k] = await api(`/rest/v1/casos?select=*&cliente_id=eq.${novo.cliente_id}&encerrado_em=is.null&protocolos=cs.${encodeURIComponent(JSON.stringify([novo.protocolo]))}&limit=1`).catch(()=>null) || [];
    if(!k) [k] = await api(`/rest/v1/casos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({cliente_id:novo.cliente_id, titulo:novo.nome, fase:novo.lista,
        beneficio:novo.beneficio, especie:novo.especie, der:novo.der, ...(novo.datas||{}),
        protocolos:[novo.protocolo], marcadores:novo.marcadores,
        urgente:novo.urgente, processo_link:novo.link, situacao_inss:novo.situacao})}) || [];
    if(k && !D.casoPorId.has(k.id)){ D.casos.push(k); D.casoPorId.set(k.id,k); }
    // TODO CASO IMPORTADO CONSTA EM 📣 NOVIDADES — inclusive para dizer que
    // não há comentários novos: silêncio e "ninguém olhou" eram iguais.
    // origem_id fixo por protocolo: importar de novo não duplica (índice único).
    // F40: e o que a coleta já trouxe (comentários, agendamentos) entra AGORA,
    // não "na próxima importação".
    if(k){
      const r = await ingerirDetalheNoCaso(k.id, novo.protocolo).catch(()=>({coms:0,evs:0}));
      await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({caso_id:k.id, autor_id:eu.id, origem:"pat",
          origem_id:`importado:${novo.protocolo}`, publico:false,
          texto:`INSS · Caso importado do PAT — situação: ${novo.situacao||"—"}. ${resumoIngestao(r)}`})}).catch(()=>{});
    }
  });

  // OS COMENTÁRIOS DO INSS. É o que responde "o que mudou?" — sem eles a
  // importação avisa que algo aconteceu e não diz o quê. Nascem internos
  // (`publico:false`): nada disso atravessa para a ficha do cliente.
  for(const bl of plano.comentarios||[])
    for(const c of bl.comentarios) await tentar(`comentário ${bl.protocolo}`, () =>
      api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({caso_id:bl.caso_id, autor_id:eu.id, texto:c.texto,
          origem:"pat", origem_id:c.origem_id, publico:false,
          ...(c.quando?{criado_em:c.quando+"T12:00:00"}:{})})}));

  for(const bloco of plano.eventos)
    for(const ev of bloco.eventos) await tentar(`perícia ${bloco.protocolo}`, async () => {
      // a outra entrega da mesma rodada (detalhes e anexos) pode já ter gravado este evento: não é falha
      await api(`/rest/v1/eventos`,{method:"POST",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({caso_id:bloco.caso_id, tipo:ev.tipo, status:"agendada",
          data_hora:`${ev.data}T${ev.hora||"09:00"}:00-03:00`, local:ev.local})}).catch(e=>{ if(!ehRepetido(e)) throw e; });
      // F40: agendamento também É novidade — sem esta linha, o evento entrava
      // na aba 🩺 e a caixa 📣 ficava calada sobre ele
      await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({caso_id:bloco.caso_id, autor_id:eu.id, origem:"pat",
          origem_id:`evento:${bloco.protocolo}:${dsa(ev.tipo)}:${ev.data}`, publico:false,
          texto:textoEvNovidade(ev)})}).catch(()=>{});
    });

  // F44 · as movimentações "só última atualização" viram novidade em 📣 —
  // origem_id com o carimbo do portal: importar a mesma coleta duas vezes
  // não duplica (o plano já filtra pelo banco, e o índice único segura o resto)
  for(const at of (plano.atualizacoes||[])) await tentar(`movimentação ${at.protocolo}`, () =>
    api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({caso_id:at.caso_id, autor_id:eu.id, origem:"pat",
        origem_id:`atualizacao:${at.protocolo}:${String(at.ts).replace(/\D/g,"")}`, publico:false,
        texto:`INSS · Movimentação no protocolo ${at.protocolo}${at.situacao?` — situação: ${at.situacao}`:""} (portal atualizado em ${at.ts}).`})}));

  // F192 · exigência sem prazo anotado ganha o prazo contado da data do ato;
  // o prazo anotado à mão (ou o de uma importação anterior) não é tocado
  for(const det of ((arquivoPat&&arquivoPat.detalhes)||[])){
    if(!(det.em_exigencia || det.situacao==="Em exigência")) continue;
    const p = digitos(det.protocolo);
    const k = p && D.casos.find(x=>!x.exigencia_prazo && (x.protocolos||[]).some(y=>digitos(y)===p));
    const ato = k && atoDaExigencia(det);
    if(!ato) continue;
    const prazo = prazoDaExigencia(ato.data);
    // teste 11.88, DAD-04: o texto do PAT vem com HTML, o nome e o CPF do cliente; a placa e o conector leem esta coluna
    const nome = ((D.cliPorId.get(k.cliente_id)||{}).nome||"").trim();
    const txt = limparHtmlPat(ato.texto).replace(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g, "[CPF]")
      .replace(nome.length>4 ? new RegExp(nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi") : /$^/, "[cliente]");
    const desc = `${txt?txt.slice(0,240)+" · ":""}prazo estimado: 30 dias do ato de ${fmt(ato.data)} no PAT (a ciência não vem do portal)`;
    await tentar(`prazo da exigência ${p}`, async () => {
      await patchCaso(k.id, {exigencia_prazo:prazo, exigencia_descricao:desc});
      k.exigencia_prazo = prazo; k.exigencia_descricao = desc;
    });
  }

  // F184 · os anexos que a extensão guardou no bucket (todos, inclusive os
  // médicos — continuam internos) entram no caso do protocolo, com o texto
  let docsPat = 0;
  if(plano.coleta_id) try{
    const [c] = await api(`/rest/v1/coletas?select=dados,criado_em&id=eq.${plano.coleta_id}`) || [];
    const docs = [], telas = new Map();
    const linhas = new Map(((c&&c.dados&&c.dados.lista)||[]).map(t=>[soDig(t.protocolo), t]));
    for(const det of ((c&&c.dados&&c.dados.detalhes)||[])){
      const p = String(det.protocolo||"").replace(/\D/g,"");
      const k = p && D.casos.find(x=>(x.protocolos||[]).some(y=>String(y).replace(/\D/g,"")===p));
      if(!k) continue;
      docsDoMovimento(docs, k, "pat", det.arquivos, null);
      // F374 · a tela do PAT do protocolo, para a aba INSS
      if(det.status || det.comentarios) telas.set(k, {...(telas.get(k)||k.pat||{}), [p]: blocoPat(det, linhas.get(p), c.criado_em)});
    }
    for(const [k, pat] of telas) await tentar(`tela do PAT ${k.id}`, async () => { await patchCaso(k.id, {pat}); k.pat = pat; });
    docsPat = await gravarDocsDaColeta(docs);
  }catch(e){ falhas.push(`anexos do INSS: ${String(e.message||e).slice(0,120)}`); }

  // a coleta usada sai da fila: a mesma não pode ser oferecida duas vezes
  if(plano.coleta_id)
    await api(`/rest/v1/coletas?id=eq.${plano.coleta_id}`,{method:"PATCH",
      headers:{Prefer:"return=minimal"},
      body:JSON.stringify({aplicada_em:new Date().toISOString()})}).catch(()=>{});
  if(planoPat===plano) planoPat = null;
  await buscarColetas();
  await recarregarDaColeta();
  marcarEtapasVelhas(casosDoPlanoPat(plano)).catch(()=>{});   // F236 · só a marca para o portal
  if(!falhas.length) return aviso(`✔ ${feitos} gravação(ões)${docsPat?` · ${docsPat} anexo(s) do INSS (o texto é lido em seguida)`:""}`);
  aviso(recadoDeFalhas(feitos, falhas));
  console.warn("falhas da importação:", falhas);
}

// os possíveis duplicados só entram quando você manda, um por um
async function criarMesmoAssim(protocolo){
  const n = (planoPat.possiveisDuplicados||[]).find(x=>x.protocolo===protocolo); if(!n) return;
  try{
    const [k] = await api(`/rest/v1/casos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({cliente_id:n.cliente_id, titulo:n.nome, fase:n.lista,
        beneficio:n.beneficio, especie:n.especie, der:n.der, ...(n.datas||{}), protocolos:[n.protocolo],
        marcadores:n.marcadores, urgente:n.urgente, processo_link:n.link,
        situacao_inss:n.situacao})}) || [];
    if(k){ D.casos.push(k); D.casoPorId.set(k.id,k); }
    // F40: caso criado da conferência também recebe já o que a coleta trouxe
    if(k){
      const r = await ingerirDetalheNoCaso(k.id, n.protocolo).catch(()=>({coms:0,evs:0}));
      const [nv]=await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({caso_id:k.id, autor_id:eu.id, origem:"pat",
          origem_id:`importado:${n.protocolo}`, publico:false,
          texto:`INSS · Caso importado do PAT — situação: ${n.situacao||"—"}. ${resumoIngestao(r)}`})}).catch(()=>[])||[];
      novidadeNaMemoria([nv]);
    }
    planoPat.possiveisDuplicados = planoPat.possiveisDuplicados.filter(x=>x.protocolo!==protocolo);
    aviso("Caso criado"); render();
  }catch(e){ aviso("Não deu: "+e.message); }
}

// juntar o protocolo do PAT a um caso que já existe — o caminho certo quando
// o caso é o mesmo e só faltava o número anotado
// JUNTAR EM LOTE, SÓ OS PROVÁVEIS. Sessenta e cinco decisões na mão é
// trabalho que ninguém faz duas vezes, e a maioria é a mesma coisa escrita de
// dois jeitos. O lote age exatamente sobre o que a tabela marcou como
// provável, com o motivo à vista — os duvidosos continuam um a um.
//
// Juntar é acrescentar: o protocolo entra no caso que já existe, e campo
// preenchido à mão não é sobrescrito. Não apaga caso, não move de lista.
async function juntarProvaveis(){
  const alvos = (planoPat && planoPat.possiveisDuplicados || []).filter(x=>x.provavel);
  if(!alvos.length) return;
  let feitos = 0; const falhas = [];
  for(const n of alvos){
    try{ await juntarUm(n); feitos++; }
    catch(e){ falhas.push(`${n.protocolo}: ${String(e.message||e).slice(0,80)}`); }
  }
  render();
  aviso(falhas.length ? recadoDeFalhas(feitos, falhas) : `✔ ${feitos} protocolo(s) juntados`);
  if(falhas.length) console.warn("falhas ao juntar:", falhas);
}

// ── F40 · TUDO da importação passa por 📣 Novidades ──────────────────────
// A regra (pedido do Paulo, 17.08): nada do que chega de importação entra
// calado. Faltavam três portas: o "é o mesmo — juntar" e o "é outro — criar"
// deixavam os comentários e agendamentos do protocolo para "a próxima
// importação" (o julgamento agendado sumia até lá), e o agendamento gravava
// o evento na aba 🩺 sem linha em 📣.
function novidadeNaMemoria(rows){
  const novas = (rows||[]).filter(a=>a && a.id);
  for(const a of novas){ a.andamentos_lidos = a.andamentos_lidos||[]; (D.novid=D.novid||[]).unshift(a); }
  if(novas.length) montarSidebar();
}
// o texto da novidade de um agendamento, com concordância pelo tipo
const textoEvNovidade = ev =>
  `📅 ${ev.tipo} agendad${evFem(ev.tipo)?"a":"o"} no INSS para ${fmt(ev.data)}`+
  `${ev.hora?` às ${ev.hora}`:""}${ev.local?` — ${ev.local}`:""}.`;
// ingere AGORA os comentários e agendamentos que a coleta trouxe para um
// protocolo recém-ligado a um caso (juntado ou criado). O "já está na ficha"
// vem do banco na hora, como no plano da importação.
async function ingerirDetalheNoCaso(casoId, proto){
  const p = digitos(proto);
  const det = ((arquivoPat&&arquivoPat.detalhes)||[]).find(d=>digitos(d.protocolo)===p);
  if(!det) return {coms:0, evs:0};
  const [jaAnds, jaEvs] = await Promise.all([
    api(`/rest/v1/andamentos?caso_id=eq.${casoId}&origem_id=not.is.null&select=origem_id`).catch(()=>[]),
    api(`/rest/v1/eventos?caso_id=eq.${casoId}&select=tipo,data_hora`).catch(()=>[])]);
  const coms = comentariosNovos(det, jaAnds||[]);
  const evs  = eventosNovos(det, evsComSinonimo(jaEvs), hoje());   // F236 · "Perícia" = "Perícia médica"
  const novas=[];
  for(const c of coms){
    const [a]=await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:casoId, autor_id:eu.id, texto:c.texto, origem:"pat",
        origem_id:c.origem_id, publico:false,
        ...(c.quando?{criado_em:c.quando+"T12:00:00"}:{})})}).catch(()=>[])||[];
    if(a) novas.push(a);
  }
  for(const ev of evs){
    await api(`/rest/v1/eventos`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({caso_id:casoId, tipo:ev.tipo, status:"agendada",
        data_hora:`${ev.data}T${ev.hora||"09:00"}:00-03:00`, local:ev.local})}).catch(()=>{});
    const [a]=await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:casoId, autor_id:eu.id, origem:"pat",
        origem_id:`evento:${p}:${dsa(ev.tipo)}:${ev.data}`, publico:false,
        texto:textoEvNovidade(ev)})}).catch(()=>[])||[];
    if(a) novas.push(a);
  }
  novidadeNaMemoria(novas);
  return {coms:coms.length, evs:evs.length};
}
const resumoIngestao = r => (r.coms||r.evs)
  ? `${r.coms?`${r.coms} comentário(s)`:""}${r.coms&&r.evs?" e ":""}${r.evs?`${r.evs} agendamento(s)`:""} já entraram em 📣 Novidades.`
  : `Sem comentários do portal para este protocolo por enquanto.`;

// o miolo de juntar, sem aviso nem redesenho: serve ao clique e ao lote
async function juntarUm(n){
  const k = D.casoPorId.get(n.caso_id); if(!k) return;
  const campos = { ...(corpoProtocolos(k, [n.protocolo])||{}), situacao_inss:n.situacao,
    processo_link:n.link, ...(k.der||!n.der?{}:{der:n.der}), ...Object.fromEntries(Object.entries(n.datas||{}).filter(([c])=>!k[c])), ...(k.especie?{}:{especie:n.especie}) };
  await patchCaso(k.id, campos);
  Object.assign(k, campos);
  // F40: o que a coleta trouxe deste protocolo entra AGORA (e passa por 📣)
  const r = await ingerirDetalheNoCaso(k.id, n.protocolo).catch(()=>({coms:0,evs:0}));
  // o caso juntado também consta em 📣 Novidades — mesmo sem comentário novo,
  // "conferido e nada mudou" é informação. origem_id por protocolo: não duplica.
  const [nv]=await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify({caso_id:k.id, autor_id:eu.id, origem:"pat",
      origem_id:`importado:${n.protocolo}`, publico:false,
      texto:`INSS · Protocolo ${n.protocolo} juntado a este caso pela importação do PAT — situação: ${n.situacao||"—"}. ${resumoIngestao(r)}`})}).catch(()=>[])||[];
  novidadeNaMemoria([nv]);
  planoPat.possiveisDuplicados = planoPat.possiveisDuplicados.filter(x=>x.protocolo!==n.protocolo);
  if(planoPat.resumo){
    planoPat.resumo.possiveis_duplicados = planoPat.possiveisDuplicados.length;
    planoPat.resumo.provaveis = planoPat.possiveisDuplicados.filter(x=>x.provavel).length;
  }
}

async function juntarAoCaso(protocolo){
  const n = (planoPat.possiveisDuplicados||[]).find(x=>x.protocolo===protocolo); if(!n) return;
  try{
    await juntarUm(n);
    aviso("Protocolo juntado ao caso que já existia"); render();
  }catch(e){ aviso("Não deu: "+e.message); }
}


// ── coluna do meio ────────────────────────────────────────────────────────
// A LINHA MOSTRA O NOME E AS DATAS. Só isso.
//
// Benefício, espécie, marcadores e fase saíram: são o assunto do caso, e o
// lugar deles é a ficha. Aqui a pergunta é outra — "de quem eu preciso cuidar,
// e quando?". Tudo que não responde a isso é atravessador entre o olho e o
// nome.
//
// A REGRA DA DATA: ela sai SEMPRE dos casos que estão nesta lista, nunca do
// acervo inteiro do cliente. Quem tem um caso no INSS e outro no Judicial, ao
// ser visto na lista do INSS, mostra o lembrete DO INSS — o do Judicial não
// diz nada sobre o trabalho de agora, e ainda faria a lista parecer atrasada
// sem estar. Quem garante isso é o `ks`: o grupoClientes entrega só os casos
// da lista aberta, e nada aqui dentro olha para fora dele.
function cartaoCliente(cli, casosMostrar){
  const ks = casosMostrar || (D.casosDoCliente.get(cli.id)||[]).filter(k=>k.fase!=="encerrado");
  const resp = [...new Set(ks.flatMap(k=>D.atrDoCaso.get(k.id)||[]))].map(id=>D.colPorId.get(id)).filter(Boolean);
  const prazoMin = ks.map(k=>k.prazo).filter(Boolean).sort()[0];
  // o lembrete mais próximo pode vir do prazo do caso ou de uma TAREFA de
  // comentário — e quem tem esse lembrete na mão aparece ao lado da data
  const tAb = ks.flatMap(k=>D.tarefasPorCaso.get(k.id)||[]);
  let dataProx = prazoMin || null, quemProx = [];
  if(tAb.length){
    const dmin = tAb.map(t=>t.lembrar_em).sort()[0];
    if(!dataProx || dmin <= dataProx){
      dataProx = dmin;
      quemProx = [...new Set(tAb.filter(t=>t.lembrar_em===dmin).map(t=>t.colaborador_id))]
        .map(id=>D.colPorId.get(id)).filter(Boolean);
    }
  }
  // perícia e audiência são data marcada com hora e lugar: não se descobre
  // no dia, então vive na lista ao lado do lembrete
  const evFut = D.eventos
    .filter(e=>ks.some(k=>k.id===e.caso_id) && e.status==="agendada" && dataSP(e.data_hora)>=hoje())
    .sort((a,b)=>a.data_hora<b.data_hora?-1:1)[0];
  const imp = ks.some(k=>k.importante);
  const motivo = (ks.find(x=>x.prazo===dataProx)||{}).lembrar_motivo;
  const exig = ks.map(chipExig).filter(Boolean).join("");
  const dcb = ks.map(chipDcb).filter(Boolean).join("");
  // o porquê da data continua a um passe de mouse — sem ocupar a linha
  const dica = [dataProx?`lembrete em ${fmt(dataProx)}`:"", motivo,
                quemProx.length?`com ${quemProx.map(c=>c.nome).join(", ")}`:""]
               .filter(Boolean).join(" · ");
  // DE QUE LISTA o cliente vem — como o To Do escreve debaixo do nome. Só
  // nas visões que misturam listas (Meu Dia, Planejado, Importante, busca):
  // dentro de uma fase, repetir o nome dela em cada cartão seria eco. Quando
  // o cliente tem casos em mais de uma lista, mostra a do caso que deu a
  // data, e as demais ficam no title.
  const kData = ks.find(x=>x.prazo===dataProx) || ks[0];
  const listas = [...new Set(ks.map(k=>listaDe(k)).filter(x=>x&&x!=="—"))];
  const orig = (!String(visao).startsWith("fase:") && listas.length)
    ? (l=>{ const i=l.indexOf(" "), em=i>0?l.slice(0,i):"", ic=em&&svgIc(em,13);
        // F138 · o nome da lista é rótulo, não número: letra de texto e o
        // mesmo ícone desenhado do menu lateral no lugar do emoji
        return `<span class="orig" title="${esc(listas.join(" · "))}">${ic||""}${
          esc(ic?l.slice(i+1):l)}${listas.length>1?` +${listas.length-1}`:""}</span>`; })(
        kData&&listaDe(kData)!=="—"?listaDe(kData):listas[0])
    : "";
  // como no To Do: o nome em cima, e embaixo — miúdo e cinza — a data. Nada
  // de coluna de datas à esquerda: a lista que o escritório já usa todo dia
  // põe o prazo debaixo do título, e mudar isso custaria releitura sem ganho.
  // semáforo do prazo (espec. 6.3): vencido/hoje em vermelho, até 15 dias
  // em laranja, com folga em verde — o chip fraco no lugar da data solta
  const em15 = (()=>{ const d=new Date(hoje()+"T12:00:00"); d.setDate(d.getDate()+15);
                      return d.toLocaleDateString("sv"); })();
  const corPrazo = dataProx ? (dataProx<=hoje()?"vermelho":dataProx<=em15?"laranja":"verde") : "";
  // F138 · a DATA abre a linha: é ela que organiza o Planejado e o Meu Dia,
  // e no fim da linha era a primeira coisa que a coluna estreita cortava
  const meta = [
    dataProx?`<span class="chip ${corPrazo}"
        ${dica?`title="${esc(dica)}"`:""}>${esc(dataRelativa(dataProx))}</span>`:"",
    evFut?`<span class="dt ev" title="${esc(evFut.tipo)}${evFut.local?" — "+esc(evFut.local):""}">${
      esc(evFut.tipo.split(" ")[0])} ${(d=>d.slice(0,4)===hoje().slice(0,4)?fmt(d).slice(0,5):fmt(d))(dataSP(evFut.data_hora))} ${horaSP(evFut.data_hora)}</span>`:"",
    orig, exig, dcb,
    // cliente em atendimento (cadastro sem caso): a linha diz o que ele está
    // buscando, senão o cartão apareceria mudo na lista 🙋 Escritório
    (()=>{ if(ks.length) return "";
      const cp = cli.campos||{};
      const pcs = (cp.precasos||[]).filter(p=>!p.so_lembrete);
      if(!pcs.length && !(cp.atendimento||[]).length && !cp.especie && !(cp.docs_pedidos||[]).length) return "";
      const pend = (cp.docs_pedidos||[]).flatMap(p=>p.itens||[]).filter(i=>!i.entregue).length;
      // F93 · a data de entrega mais antiga entre os pendentes pinta o chip
      const ate = (cp.docs_pedidos||[]).filter(p=>p.ate && (p.itens||[]).some(i=>!i.entregue))
        .map(p=>p.ate).sort()[0];
      const rot = pcs.length ? (pcs[0].especie||"em formação")+(pcs.length>1?` +${pcs.length-1}`:"")
                : cp.especie ? cp.especie : "em atendimento";
      return `<span class="chip laranja" title="pré-caso em formação — ainda não virou caso">🟡 ${esc(rot)}</span>`
        + (pend?`<span class="dt${ate&&ate<hoje()?" venc":""}" title="documentos pedidos e ainda não entregues${ate?` — entrega até ${fmt(ate)}`:""}">📋 ${pend} doc(s)${
            ate?(ate<hoje()?` · venceu ${fmt(ate).slice(0,5)}`:` · até ${fmt(ate).slice(0,5)}`):""}</span>`:"");
    })(),
  ].filter(Boolean);
  // F147 · NO VISUAL NOVO, TODA LISTA USA A LINHA DA AGENDA (pedido do Paulo,
  // 27.09.2026): data, cliente com o que é, selos, quem está com o caso, a
  // estrela e o fogo, na mesma coluna do Planejado e do Meu Dia
  if(temaV10()){
    const hj = hoje();
    // F236 · a linha diz o próximo passo com a data: o item mais cedo da agenda destes casos (prazo,
    // tarefa, prazo do tribunal, recurso, exigência, perícia), e não só o prazo fatal
    const prox = ks.map(k=>agendaPorCaso().get(k.id)).filter(Boolean).sort((a,b)=>a.data<b.data?-1:a.data>b.data?1:0)[0];
    if(prox && (!dataProx || prox.data<=dataProx)){ dataProx = prox.data; quemProx = prox.quem||[]; }
    const pDia = prox && prox.data===dataProx ? prox : null;
    const kP = (pDia && pDia.k) || kData;
    const esp = kP ? [kP.especie, String(visao).startsWith("fase:") ? "" : NOME_FASE[kP.fase]].filter(Boolean).join(" · ") : "";
    const passo = pDia ? (pDia.resumo || (pDia.andId ? resumoAgenda(textoDoAndamento(pDia.andId), pDia.tc && D.colPorId.get(pDia.tc.colaborador_id)) : "")) : "";
    const resumo = passo || motivo || (kData ? tituloCaso(kData) : "")
      || (ks.length ? "" : ((cli.campos||{}).especie || "em atendimento"));
    // F236 · o cliente com outros casos abertos avisa na linha (os títulos no title), e o card de
    // aposentadoria com o direito já alcançado aparece em qualquer lista
    const outros = (D.casosDoCliente.get(cli.id)||[]).filter(x=>x.fase!=="encerrado" && !ehPreCaso(x) && !ks.includes(x));
    const card = cardsApos().find(l=>l.cliente_id===cli.id && cardVivo(l)), dDir = card && dataDireitoDoCard(card);
    // F236 · o prazo do tribunal mais próximo e a fila do TRF3 (com a data da consulta) ficam à vista mesmo
    // quando o próximo passo é outro
    const pTrib = ks.flatMap(k=>(k.prazos_tribunal||[]).map(p=>({d:dataDoPrazo(p), s:ROT_PRAZO[p.sistema]||p.sistema||"tribunal", k})))
      .filter(x=>x.d && x.d!==x.k.prazo).sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0)[0];
    const fila = ks.map(k=>k.fase==="judicial" && k.trf3 && k.trf3.ordem ? k.trf3 : null).filter(Boolean)[0];
    const selos = [
      pDia ? (pDia.fatal ? `<span class="ag-fatal">Prazo fatal</span>` : pDia.selo && !pDia.ev ? `<span class="${pDia.prazo?"ag-prazo":"ag-tipo"}">${esc(pDia.selo)}</span>` : "")
        : prazoMin && dataProx===prazoMin ? `<span class="ag-fatal">Prazo fatal</span>` : "",
      evFut && !(pDia && pDia.ev && pDia.ev.id===evFut.id) ? `<span class="ag-tipo" title="${esc(evFut.tipo)}${evFut.local?" — "+esc(evFut.local):""}">${esc(evFut.tipo.split(" ")[0])} ${fmtBarra(dataSP(evFut.data_hora)).slice(0,5)} ${horaSP(evFut.data_hora)}</span>` : "",
      pTrib && !(pDia && pDia.prazo && pDia.data===pTrib.d) ? `<span class="ag-prazo" title="prazo do tribunal">Prazo ${esc(pTrib.s)} ${pTrib.d.slice(8,10)}/${pTrib.d.slice(5,7)}</span>` : "",
      (s=>s ? `<span class="ag-tipo ag-susp" title="${esc(tituloSusp(s))}">⏸ ${esc(rotSusp(s))}</span>` : "")(ks.map(suspensaoDe).find(Boolean)),   // F417
      kP ? seloParado(kP) : "",   // F441 · caso parado
      kP && kP.etapa ? seloEtapaLista(kP) : "",   // F236 · a desatualizada avisa; F292 · em todas as listas, como o objetivo da tarefa no To Do
      fila ? `<span class="ag-tipo" title="posição na ordem de julgamento do TRF3, na data da consulta">Fila ${fila.ordem}º${fila.consultado_em?` em ${esc(fmtBarra(fila.consultado_em).slice(0,5))}`:""}</span>` : "",
      exig, dcb,
      outros.length ? `<span class="ag-tipo" title="${esc(outros.map(x=>`${tituloCaso(x)} · ${NOME_FASE[x.fase]||x.fase}`).join("\n"))}">+${outros.length} caso${outros.length>1?"s":""}</span>` : "",
      dDir && dDir.data<=hj ? `<span class="ag-prazo" title="card de Aposentadorias futuras com o direito já alcançado e sem caso: passe ao advogado">🙏 direito desde ${esc(fmt(dDir.data).slice(0,5))}</span>` : "",
      ks.length===1 && ehPreCaso(ks[0]) ? `<span class="ag-tipo pre-caso" title="pré-caso: ainda não virou caso">Pré-caso · ${esc(passoDoPreCaso(ks[0]))}</span>` : "",
      esp ? `<span class="ag-esp">${esc(esp)}</span>` : "",
    ].join("");
    const quem = [...quemProx, ...resp.filter(c=>!quemProx.includes(c))].slice(0,2);
    const dTxt = !dataProx ? "" : dataProx===hj ? "hoje" : `${dataProx.slice(8,10)}/${dataProx.slice(5,7)}${dataProx.slice(0,4)!==hj.slice(0,4)?"/"+dataProx.slice(2,4):""}`;
    return `<div class="cartao ag-linha${ks.some(k=>k.urgente)?" urg":""}" data-cli="${cli.id}" data-casos="${ks.map(k=>k.id).join(",")}"${ks.length===1 && ehPreCaso(ks[0]) ? ` data-pc="${esc((ks[0].precaso||{}).id||ks[0].id)}"` : ""}>
    <span class="ag-data${!dataProx?"":dataProx<hj?" venc":dataProx===hj?" hoje":""}"${dica?` title="${esc(dica)}"`:""}>${dTxt}</span>
    <div class="ag-txt"><b>${esc(cli.nome)}</b>${seloContato(cli)}${/* teste 11.88, TRI-03: na coluna estreita os selos somem e dois pré-casos
      do mesmo cliente ficavam iguais; a espécie do pré-caso vai junto do nome */ ks.length===1 && ehPreCaso(ks[0])
      ? `<span class="ag-pc-esp"> · ${esc(ks[0].beneficio || (ks[0].precaso||{}).especie || "benefício a definir")}</span>` : ""}${kP&&kP.especie?`<span class="ag-ben">${esc(kP.especie)}</span>`:""}${resumo?`<span class="ag-res">, ${esc(resumo)}</span>`:""}</div>
    <span class="ag-c-lista">${esc(kP ? NOME_FASE[kP.fase==="outro" ? faseEfetiva(kP) : kP.fase]||"" : "")}</span>
    <span class="ag-c-etapa">${kP && kP.etapa ? seloEtapaLista(kP) : ""}</span>
    <span class="ag-selos">${selos}</span>
    <span class="avatares" data-equipe="${cli.id}" title="atribuições — clique para editar">${quem.map(c=>
      `<span class="avatar mini" style="background:${c.cor}" title="${esc(c.nome)}">${esc(c.inicial)}</span>`).join("")}</span>
    <span class="ag-slot">${(k0=>k0 && !ehPreCaso(k0) ? botaoDespacho(k0) : "")(ks.find(k=>k.importante)||kP||ks[0])}</span>
    <span class="acoes">${ks[0]?`
      <button class="acao-card fogo ${ks.some(k=>k.urgente)?"on":""}" title="Urgente" data-fogo="${ks[0].id}"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c.6 3.2 4.5 5.4 4.5 10a4.5 4.5 0 0 1-9 0c0-2.3 1.2-3.7 2.2-4.8.4 1.6 1.2 2.6 2.3 2.8-.4-2.6-.6-5.4 0-8Z"/></svg></button>
      <button class="acao-card ${imp?"on":""}" title="Importante" data-estrela="${ks[0].id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z"/></svg></button>`:estrelaDaLinha(null, null, cli)}</span>
  </div>`;
  }
  // O círculo de "concluir" saiu. No To Do ele conclui a tarefa; aqui não
  // concluía nada — clicar nele só abria a ficha, como em qualquer ponto da
  // linha. Era um convite falso, e ocupava a primeira coisa que o olho
  // encontra. Sem ele, todos os nomes começam na mesma coluna.
  return `<div class="cartao" data-cli="${cli.id}">
    ${(k0=>k0 && !ehPreCaso(k0) ? botaoDespacho(k0) : "")(ks.find(k=>k.importante)||ks[0])}
    ${/* F22 · quem está com o caso, visível sem abrir: uma fita na borda
         esquerda com a cor de cada colaborador atribuído (até três). O
         avatar da direita continua; a fita é o que o olho varre na lista. */""}
    ${resp.length?`<span class="atr-fita" title="${esc(resp.map(c=>c.nome).join(", "))}">${
      resp.slice(0,3).map(c=>`<i style="background:${c.cor}"></i>`).join("")}</span>`:""}
    <div class="info">
      ${/* o 🔥 aparecia duas vezes na mesma linha: ao lado do nome e no botão
             de ação, que já fica aceso quando o caso é urgente */""}
      ${/* F147 · o #CPF saiu das listas (pedido do Paulo): a busca continua achando por ele */""}
      <div class="nome">${esc(cli.nome)}${seloContato(cli)}</div>
      ${meta.length?`<div class="meta">${meta.join('<span class="pt">·</span>')}</div>`:""}
    </div>
    ${quemProx.filter(c=>!resp.includes(c)).map(c=>`<span class="avatar mini quem-prazo" style="background:${c.cor}"
      title="${esc(c.nome)} — tarefa para ${fmt(dataProx)}">${esc(c.inicial)}</span>`).join("")}
    <div class="avatares" data-equipe="${cli.id}" title="atribuições — clique para editar">${resp.map(c=>`<span class="avatar mini" style="background:${c.cor}" title="${esc(c.nome)}">${esc(c.inicial)}</span>`).join("")||`<span class="avatar mini vazio">＋</span>`}</div>
    ${/* os três só aparecem no hover ou pelo teclado — quando estão LIGADOS
         ficam sempre visíveis, porque aí carregam informação */""}
    <span class="acoes">
      <button class="acao-card fogo ${ks.some(k=>k.urgente)?"on":""}" title="Urgente" data-fogo="${ks[0]?ks[0].id:""}"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5c.4 2.6-1 4.1-2.3 5.6C8.4 10.6 7.5 12.1 7.5 14a4.5 4.5 0 0 0 9 0c0-1.6-.7-3-1.7-4.2-.2 1.1-.8 2-1.8 2.5.6-2.6-.1-5.6-1-8.8Z"/></svg></button>
      ${/* o fill vem do CSS (.acao-card.on svg), não de um atributo: gravado
             no HTML ele congelava na primeira pintura, e clicar na estrela
             trocava a cor sem nunca preencher o desenho */""}
      <button class="acao-card ${imp?"on":""}" title="Importante" data-estrela="${ks[0]?ks[0].id:""}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m12 3.3 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.5l5.9-.8L12 3.3Z"/></svg></button>
    </span>
  </div>`;
}

// A data como o To Do escreve: "Hoje", "Amanhã", e o resto com o dia da
// semana na frente ("sex, 07.08"). Dizer o dia da semana poupa a conta de
// cabeça que todo mundo faz para saber se dá tempo.
const SIGLA_DIA = ["dom","seg","ter","qua","qui","sex","sáb"];
function diaDaSemana(iso){
  const d = new Date(iso + "T12:00:00");
  return isNaN(d) ? "" : SIGLA_DIA[d.getDay()];
}
function dataRelativa(iso){
  if(!iso) return "";
  // maisDias() pula para o próximo dia ÚTIL — na sexta, "amanhã" viraria
  // segunda e a etiqueta mentiria. Aqui a conta é de calendário mesmo.
  const dia = n => { const d = new Date(hoje()+"T12:00:00"); d.setDate(d.getDate()+n);
                     return d.toLocaleDateString("sv"); };
  if(iso === hoje()) return "Hoje";
  if(iso === dia(1)) return "Amanhã";
  if(iso === dia(-1)) return "Ontem";
  // F236 · com o ano quando não é o deste ano: numa linha do tempo de dois anos, "sex, 10.10" de 2025 parecia posterior à RPV de outubro
  return `${diaDaSemana(iso)}, ${iso.slice(0,4)===hoje().slice(0,4) ? fmt(iso).slice(0,5) : fmt(iso)}`;
}

// EM EXIGÊNCIA POR DOIS CAMINHOS. `exigencia_prazo` é o que o escritório
// anota à mão, com a data-limite. `situacao_inss` é o que o PAT devolve —
// e chega antes, porque vem do sistema deles. Olhar só o primeiro deixava
// de fora justamente as exigências recém-descobertas pela importação, que
// são as que ainda ninguém viu.
const emExigencia = k => !!(k && (k.exigencia_prazo || k.situacao_inss === "Em exigência"));
let soExigencia = false;                 // o filtro da lista INSS

function grupoClientes(casosSel){
  const porCli = new Map();
  // F226 · cada pré-caso é um cartão próprio (D1 do docs/PRE-CASOS.md): o mesmo
  // cliente buscando dois benefícios aparece duas vezes no 🙋 Escritório
  casosSel.forEach(k=>{ const ch = ehPreCaso(k) ? k.id : k.cliente_id;
                        if(!porCli.has(ch)) porCli.set(ch,[]);
                        porCli.get(ch).push(k); });
  let pares = [...porCli].map(([,ks])=>[D.cliPorId.get(ks[0].cliente_id),ks]).filter(p=>p[0]);
  const ord = document.getElementById("ordem").value;
  if(ord==="alfa") pares.sort((a,b)=>a[0].nome.localeCompare(b[0].nome,"pt"));
  else if(ord==="imp") pares.sort((a,b)=>{ const pa=dataQueCobra(a[1]), pb=dataQueCobra(b[1]);
    return (b[1].some(k=>k.importante)?1:0)-(a[1].some(k=>k.importante)?1:0) || (pa<pb?-1:pa>pb?1:0); });
  // F236 · "Data mais próxima" é a data que cobra, da mesma conta da agenda (prazo fatal, tarefa,
  // prazo do tribunal, recurso, exigência, perícia), e não só o prazo fatal do caso
  else pares.sort((a,b)=>{ const pa=dataQueCobra(a[1]), pb=dataQueCobra(b[1]); return pa<pb?-1:pa>pb?1:0; });
  // 🔥 urgentes sempre no topo, independente da ordenação escolhida
  pares.sort((a,b)=>(b[1].some(k=>k.urgente)?1:0)-(a[1].some(k=>k.urgente)?1:0));
  return pares;
}

// F438 · pedido do Paulo de 08.11.2026: o clique da linha continua abrindo a ficha, e o mouse parado em cima mostra a
// última anotação da equipe nos casos da linha. O texto não vem na carga inicial: busca-se no primeiro hover e guarda-se
const _ultAnot = new Map();
function ultAnotDe(ids){
  const ch = ids;
  if(!_ultAnot.has(ch)) _ultAnot.set(ch, api(`/rest/v1/andamentos?select=texto,criado_em,autor_id&caso_id=in.(${ids})&origem=not.in.(${[...new Set([...ORIGENS_ROBO, ...ORIGENS_OFICIAIS])].join(",")})&excluir=not.is.true&order=criado_em.desc&limit=1`)
    .then(r=>(r||[])[0]||null).catch(()=>{ _ultAnot.delete(ch); return null; }));
  return _ultAnot.get(ch);
}
async function mostrarUltAnot(el){
  const a = await ultAnotDe(el.dataset.casos);
  if(!el.matches(":hover") || !document.body.contains(el)) return;
  let p = document.getElementById("ult-anot");
  if(!p){ p = document.createElement("div"); p.id = "ult-anot"; p.setAttribute("role","tooltip"); document.body.appendChild(p); }
  const de = a && D.colPorId.get(a.autor_id);
  p.innerHTML = a ? `<div class="ua-cab">Última anotação · ${esc(de?de.nome.split(" ")[0]:"equipe")}, ${esc(fmtBarra(dataSP(a.criado_em)))}</div><div class="ua-txt">${esc((a.texto||"").slice(0,1000))}</div>`
    : `<div class="ua-cab">Sem anotação da equipe nestes casos.</div>`;
  const r = el.getBoundingClientRect(), alto = p.offsetHeight || 140, baixo = r.bottom + 6 + alto < innerHeight;
  p.style.left = Math.max(8, Math.min(r.left + 40, innerWidth - 448)) + "px";
  p.style.top = (baixo ? r.bottom + 6 : Math.max(8, r.top - 6 - alto)) + "px";
  p.classList.add("on");
}
const esconderUltAnot = () => { const p = document.getElementById("ult-anot"); if(p) p.classList.remove("on"); };
// F455 · A LINHA QUE SE ESTENDE (artefato v6 aprovado pelo Paulo em 08.11.2026, https://claude.ai/artifact/NhCc6NThwFdMz6GeBXBsL8)
// O clique na linha das listas abre, logo abaixo do nome, a última anotação da equipe, o CPF, a senha do Meu INSS e o
// WhatsApp para copiar e abrir, e Abrir, Anotar, Reagendar e Concluir; o segundo clique recolhe. Ctrl+clique abre a ficha.
// Cada mudança tem Desfazer de 30 s. No navegador automatizado a linha abre a ficha, como as provas antigas esperam,
// salvo com crm_ext_linha = 1.
const extLigada = () => podeGravarCaso() && (!navigator.webdriver || (()=>{ try{ return localStorage.getItem("crm_ext_linha")==="1"; }catch(e){ return false; } })());
const abrirDaLinha = el => el.dataset.pc ? abrirAtendimentoDe(el.dataset.cli, el.dataset.pc) : abrirFicha(el.dataset.cli);   // F227 · o pré-caso abre o atendimento
let _ext = null;   // {ch, painel, txt}: a extensão aberta, para reabrir depois do render
function itemDaLinha(el){
  const it = el.dataset.sel && _agIt.get(el.dataset.sel);
  if(it && it.k) return it;
  // a linha das listas do escritório (cartaoCliente) não tem item: vale o caso da data
  const ks = (el.dataset.casos||"").split(",").map(id=>D.casoPorId.get(id)).filter(Boolean);
  return itemDoCaso(ks.find(x=>x.prazo) || ks[0]);
}
function fecharExt(){
  document.querySelectorAll(".ag-ext").forEach(x=>x.remove());
  document.querySelectorAll(".cartao.ext-on").forEach(x=>{ x.classList.remove("ext-on"); x.removeAttribute("aria-expanded"); });
}
function alternarExt(el){
  const aberta = el.classList.contains("ext-on");
  fecharExt(); _ext = null;
  if(aberta) return;
  const it = itemDaLinha(el); if(!it) return abrirDaLinha(el);
  _ext = {ch:chaveSel(el), painel:"", txt:""};
  montarExt(el, it);
}
function reabrirExt(){
  if(!_ext) return;
  const el = [...document.querySelectorAll(".cartao[data-cli]")].find(x=>chaveSel(x)===_ext.ch);
  const it = el && itemDaLinha(el);
  if(!it){ _ext = null; return; }
  montarExt(el, it);
}
function montarExt(el, it){
  const {k, cli} = it, x = document.createElement("div");
  const atr = D.atrDoCaso.get(k.id)||[], resp = atr.map(id=>D.colPorId.get(id)).filter(Boolean);
  x.className = "ag-ext"; x._it = it; x._el = el; x._atual = atr[0] || "";
  x.innerHTML = `<div class="ae-topo"><span class="ae-quem"><span class="ae-resp">${resp.length ? "Com "+esc(resp.map(c=>c.nome.split(" ")[0]).join(", ")) : "Sem responsável"}</span>${
      it.selo==="Retorno" && prazoDoTodo(k) ? `<span class="ae-todo">Prazo do Microsoft To Do · última anotação do caso</span>` : ""}</span>
    <span class="ae-cop">${cli && cli.cpf ? `<span class="cop" data-cop="${esc(cli.cpf)}" data-cop-msg="CPF copiado" title="Copiar o CPF">CPF ${esc(fmtCpf(cli.cpf))}</span>` : ""}
      <button type="button" class="ae-mini" data-ae="senha" title="Copiar a senha do Meu INSS"><span class="ae-rot">Meu </span>INSS <span class="ae-senha">…</span></button>
      <button type="button" class="ae-mini ae-zap" data-ae="zap" title="Abrir a conversa do WhatsApp ao lado">${iconeFonte("zap")}<span class="sr-only">WhatsApp</span></button></span></div>
    <div class="ae-txt">Carregando a última anotação…</div>
    <div class="ae-acoes">${[["abrir","Abrir","Abrir a ficha do cliente"],["anotar","Anotar","Escrever no caso, reagendar e atribuir"],["reagendar","Reagendar","Mudar a data"],["concluir","Concluir","Concluir a tarefa e tirar o prazo"]]
      .map(([a,r,t])=>`<button type="button" class="btn-mini" data-ae="${a}" title="${t}">${r}</button>`).join("")}</div>
    <div class="ae-painel" hidden></div>`;
  el.after(x); el.classList.add("ext-on"); el.setAttribute("aria-expanded","true");
  // F459 · a senha do Meu INSS à vista (o ver fica registrado, como no painel do WhatsApp da F354)
  if(cli) senhaMeuInss(cli.id).then(cr=>{ const sp = x.querySelector(".ae-senha"); if(sp) sp.textContent = cr ? cr.valor : "sem senha"; });
  ultAnotDe(el.dataset.casos).then(a=>{
    const t = x.querySelector(".ae-txt"); if(!t) return;
    const tx = a ? (a.texto||"") : ""; x._texto = tx;
    // F459 · só a data e o texto (pedido do Paulo, 08.11.2026); F462 · com quem escreveu (Paulo, 09.11.2026)
    const au = a && a.autor_id && D.colPorId.get(a.autor_id);
    t.innerHTML = a ? `<span class="ae-cab">${esc(fmtBarra(dataSP(a.criado_em)))}${au ? " · "+esc(au.nome.split(" ")[0]) : ""}</span>${esc(tx.slice(0,1000))}${tx.length>1000 ? "…" : ""}`
      : `<span class="ae-cab">Sem anotação da equipe neste caso.</span>`;
    // o corte vem dos 1.000 caracteres ou das 14 linhas; o botão fica fora do texto cortado
    x.querySelector(".ae-mais")?.remove();
    if(a && (tx.length>1000 || t.scrollHeight>t.clientHeight+2)) t.insertAdjacentHTML("afterend", `<button type="button" class="ae-mais" data-ae="mais" title="Mostrar a anotação inteira">Ver mais</button>`);
  });
  x.onclick = e=>{ const b = e.target.closest("[data-ae]"); if(!b) return; e.stopPropagation(); acaoExt(x, b.dataset.ae, b); };
  if(_ext && _ext.painel) painelExt(x, _ext.painel, _ext.txt);
}
async function acaoExt(x, a, b){
  const it = x._it, k = it.k, cli = it.cli || D.cliPorId.get(k.cliente_id) || {};
  if(a==="abrir"){ _ext = null; fecharExt(); return abrirDaLinha(x._el); }
  if(a==="zap"){
    _ext = null; fecharExt();
    // F459 · no celular vai direto à conversa do número do WhatsApp do cliente (a ficha ao lado não cabe)
    const tel = celular() && cli.id && (telefonesDe(cli).find(t=>t.zap) || telefonesDe(cli)[0]);
    return tel ? zapDoNumero(tel.numero) : fichaComZap(cli.id);
  }
  if(a==="senha"){ const cr = await senhaMeuInss(cli.id); return cr ? copiar(cr.valor, "Senha copiada 📋") : aviso("Sem senha do Meu INSS na ficha"); }
  if(a==="mais"){ const t = x.querySelector(".ae-txt"), c = t.querySelector(".ae-cab"); t.classList.add("todo"); t.innerHTML = (c?c.outerHTML:"") + esc(x._texto||""); x.querySelector(".ae-mais")?.remove(); return; }
  if(a==="cancelar"){ if(_ext) _ext.painel = ""; x.querySelector(".ae-painel").hidden = true; x.querySelector(".ae-acoes").hidden = false; return; }
  if(a==="anotar" || a==="reagendar" || a==="concluir") return painelExt(x, a, "");
  if(a==="anotar-ok") return extAnotar(x);
  if(a==="concluir-ok") return extConcluir(x);
  if(b.dataset.data) return extReagendar(x, b.dataset.data);
}
// F459 · a senha do Meu INSS do cliente, uma busca por cliente na sessão; o ver fica registrado em credencial_vis
const _senhaInss = new Map();
function senhaMeuInss(cliId){
  if(!cliId) return Promise.resolve(null);
  if(!_senhaInss.has(cliId)) _senhaInss.set(cliId, api(`/rest/v1/credenciais?select=id,valor&cliente_id=eq.${cliId}&tipo=eq.meu_inss&limit=1`).then(r=>{
    const cr = (r||[])[0] || null;
    if(cr) api(`/rest/v1/credencial_vis`,{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({credencial_id:cr.id, colaborador_id:eu.id})}).catch(()=>{});
    return cr;
  }).catch(()=>{ _senhaInss.delete(cliId); return null; }));
  return _senhaInss.get(cliId);
}
const umMes = d => { const x = new Date(d+"T12:00:00"); x.setMonth(x.getMonth()+1); return x.toLocaleDateString("sv"); };
// F584: a mini agenda do Reagendar, do Prorrogar e do Adiar: o mês à vista, um clique escolhe o dia (antes de min fica desligado)
const MCAL_MES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
function mcalMiolo(min, mes, sel){
  const [a, m] = mes.split("-").map(Number), ini = new Date(a, m-1, 1).getDay(), fim = new Date(a, m, 0).getDate(), hj = hoje();
  const nav = (d, r, t) => `<button type="button" class="mcal-nav" data-nav="${d}" aria-label="${t}"><span aria-hidden="true">${r}</span></button>`;
  let h = `<div class="mcal-cab">${nav(-1,"‹","mês anterior")}<b>${MCAL_MES[m-1]} ${a}</b>${nav(1,"›","mês seguinte")}</div><div class="mcal-g">`
    + ["D","S","T","Q","Q","S","S"].map(d=>`<i aria-hidden="true">${d}</i>`).join("") + "<span></span>".repeat(ini);
  for(let d = 1; d <= fim; d++){
    const iso = `${mes}-${String(d).padStart(2,"0")}`, c = [iso===hj&&"hj", !ehDiaUtil(iso)&&"nu", iso===sel&&"sel"].filter(Boolean).join(" ");
    h += `<button type="button" data-d="${iso}"${c?` class="${c}"`:""}${iso<min?" disabled":""} aria-label="${fmtBarra(iso)}">${d}</button>`;
  }
  return h + "</div>";
}
function miniCal(min, sel){
  const mes = (sel && sel >= min ? sel : min).slice(0, 7);
  return `<div class="mcal" role="group" aria-label="Escolher a data" data-min="${min}" data-mes="${mes}">${mcalMiolo(min, mes, sel||"")}</div>`;
}
function ligarMiniCal(el, escolher){
  if(!el) return;
  el.onclick = e => {
    const b = e.target.closest("button"); if(!b || b.disabled) return;
    e.stopPropagation();
    if(b.dataset.d) return escolher(b.dataset.d);
    const d = new Date(el.dataset.mes + "-15T12:00:00"); d.setMonth(d.getMonth() + Number(b.dataset.nav));
    el.dataset.mes = d.toISOString().slice(0, 7);
    el.innerHTML = mcalMiolo(el.dataset.min, el.dataset.mes, "");
  };
}
function painelExt(x, qual, txt){
  const it = x._it, mov = reagendavel(it), p = x.querySelector(".ae-painel");
  if(_ext) Object.assign(_ext, {painel:qual, txt});
  const fim = r => `<div class="ae-fim"><button type="button" class="ae-canc" data-ae="cancelar">Cancelar</button>${r}</div>`;
  const nota = ph => `<textarea class="ae-nota" rows="3" placeholder="${ph}" aria-label="${ph}">${esc(txt||"")}</textarea>`;
  const naoMove = "Prazo fatal, perícia e exigência não mudam de data aqui: o registro é feito no caso.";
  if(qual==="anotar"){
    const atual = x._atual;
    p.innerHTML = nota("Escrever no caso…") + `<div class="ae-lin">
      <label>Reagendar <input type="date" class="ae-data" value="${esc(it.data||"")}" min="${hoje()}"${mov?"":` disabled title="${naoMove}"`}></label>
      <label>Atribuir a <select class="ae-para">${atual?"":`<option value="">Sem responsável</option>`}${equipeAtiva().map(c=>`<option value="${c.id}"${c.id===atual?" selected":""}>${esc(c.nome.split(" ")[0])}</option>`).join("")}</select></label></div>`
      + fim(`<button type="button" class="btn-mini forte" data-ae="anotar-ok">Anotar</button>`);
    // a data escrita na anotação vira a data do Reagendar, enquanto a pessoa não a escolher à mão
    const ta = p.querySelector(".ae-nota"), dt = p.querySelector(".ae-data");
    dt.oninput = ()=>{ dt._mao = true; };
    ta.oninput = ()=>{ if(_ext) _ext.txt = ta.value; const d = mov && !dt._mao && dataDoTexto(ta.value, true); if(d) dt.value = d.iso; };
  } else if(qual==="reagendar"){
    const op = [["Amanhã", proxDiaUtil(somaDias(hoje(),1))], ["Próxima semana", proxSegunda()], ["Em 15 dias", proxDiaUtil(somaDias(hoje(),15))], ["Em 1 mês", proxDiaUtil(umMes(hoje()))]];
    p.innerHTML = mov ? `<div class="ae-dias">${op.map(([r,d])=>`<button type="button" class="esp-it" data-ae="dia" data-data="${d}" title="${fmtBarra(d)}">${r}</button>`).join("")}
      </div>${miniCal(hoje(), it.data)}` + fim("")
      : `<p class="ae-aviso">${naoMove}</p>` + fim(`<button type="button" class="btn-mini forte" data-ae="abrir">Abrir</button>`);
    ligarMiniCal(p.querySelector(".mcal"), d => extReagendar(x, d));
  } else {
    p.innerHTML = nota(it.fatal && !it.tc ? "O que foi feito (o prazo fica cumprido)" : "O que foi feito (opcional)")
      + fim(`<button type="button" class="btn-mini forte" data-ae="concluir-ok">Concluir</button>`);
    const ta = p.querySelector(".ae-nota"); ta.oninput = ()=>{ if(_ext) _ext.txt = ta.value; };
  }
  x.querySelector(".ae-acoes").hidden = true; p.hidden = false;
  const f = p.querySelector("textarea, .esp-it"); if(f && !txt) f.focus();
}
function repintaExt(k){ _ext = null; montarSidebar(); render(); if(clienteAberto===k.cliente_id) repintarFicha(); }
async function notaNoCaso(k, texto){
  const [and] = await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify({caso_id:k.id, autor_id:eu.id, texto})});
  if(!and) throw new Error("sem resposta");
  api(`/rest/v1/andamentos_lidos`,{method:"POST",headers:{Prefer:"return=minimal,resolution=merge-duplicates"},
    body:JSON.stringify({andamento_id:and.id, colaborador_id:eu.id})}).catch(()=>{});
  if(Array.isArray(D._andsFicha)) D._andsFicha.unshift(and);
  if(/@\p{L}/u.test(texto)) criarMencoes(texto, k.id, and.id).catch(()=>{});
  _ultAnot.clear();
  return async ()=>{ await api(`/rest/v1/andamentos?id=eq.${and.id}`,{method:"DELETE"}).catch(()=>{});
    if(Array.isArray(D._andsFicha)) D._andsFicha = D._andsFicha.filter(a=>a.id!==and.id); _ultAnot.clear(); };
}
async function extAnotar(x){
  const it = x._it, k = it.k, q = s => x.querySelector(s);
  const nota = q(".ae-nota").value.trim(), data = q(".ae-data").value, para = q(".ae-para").value;
  const mudaData = !!data && data!==(it.data||"") && reagendavel(it), mudaPara = !!para && para!==x._atual;
  if(!nota && !mudaData && !mudaPara) return aviso("Escreva a anotação, ou mude a data ou a pessoa");
  const undos = [], feito = [];
  try{
    if(nota){ undos.push(await notaNoCaso(k, nota)); feito.push("Anotado"); }
    if(mudaData){ const m = moverData(it, data); await m.p; undos.push(m.undo); feito.push(`reagendado para ${fmtBarra(data)}`); }
    if(mudaPara){ const u = await passarComDesfazer(k, para, x._atual); if(u){ undos.push(u); feito.push(`atribuído a ${D.colPorId.get(para).nome.split(" ")[0]}`);
      if(para!==eu.id) api(`/rest/v1/mencoes`,{method:"POST",headers:{Prefer:"return=minimal"}, body:JSON.stringify({de_id:eu.id, para_id:para, caso_id:k.id,
        texto:`👤 ${(eu.nome||"").split(" ")[0]} atribuiu a você o cliente ${(it.cli||{}).nome||""}${nota?`: ${nota.slice(0,140)}`:""}`})}).catch(()=>{}); } }
  }catch(e){ aviso("⚠ Não gravou tudo: "+String(e.message||e).slice(0,80)); }
  repintaExt(k);
  if(undos.length) avisoDesfazer(feito.join(" · "), async ()=>{ for(const u of undos.reverse()) await u(); repintaExt(k); aviso("Desfeito", false); }, 30000);
}
async function extReagendar(x, data){
  const it = x._it, k = it.k;
  if(!reagendavel(it)) return;
  const m = moverData(it, data);
  try{ await m.p; }catch(e){ await m.undo(); return aviso("Não gravou: tente de novo"); }
  repintaExt(k);
  avisoDesfazer(`Reagendado para ${fmtBarra(data)}`, async ()=>{ await m.undo(); repintaExt(k); aviso("Reagendamento desfeito", false); }, 30000);
}
async function extConcluir(x){
  const it = x._it, k = it.k, txt = x.querySelector(".ae-nota").value.trim();
  _ext = null;
  if(it.tc) return concluirDeVez(it.tc.id, txt);
  if(it.fatal) return registrarCumprimento(k.id, {texto:txt, andId:it.andId});
  if(it.t && !it.t.virtual){   // a tarefa pessoal
    const t = it.t, muda = c => api(`/rest/v1/tarefas?id=eq.${t.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({concluida:c, concluida_em:c?new Date().toISOString():null})});
    try{ await muda(true); }catch(e){ return aviso("Não gravou: tente de novo"); }
    t.concluida = true; plim(); repintaExt(k);
    return avisoDesfazer("Concluída", async ()=>{ await muda(false); t.concluida = false; repintaExt(k); aviso("Conclusão desfeita", false); }, 30000);
  }
  if(it.selo==="Retorno" || it.selo==="Volta à fila"){
    // concluir o retorno tira a data do caso; o despacho marcado "concluido" leva a data apagada ao To Do (ponte_despacho.py)
    const antes = {prazo:k.prazo||null, ronda:k.ronda||{}};
    const muda = {prazo:null, ronda:{...(k.ronda||{}), despacho:{em:new Date().toISOString(), por:eu.id, prazo:null, concluido:true}}};
    let undoNota = null;
    try{ await patchCaso(k.id, muda); Object.assign(k, muda); undoNota = await notaNoCaso(k, "✔ " + (txt || "Concluído")); }
    catch(e){ aviso("⚠ Não gravou tudo: "+String(e.message||e).slice(0,80)); }
    plim(); repintaExt(k);
    return avisoDesfazer("Concluído · sem data", async ()=>{ await patchCaso(k.id, antes).catch(()=>{}); Object.assign(k, antes);
      if(undoNota) await undoNota(); repintaExt(k); aviso("Conclusão desfeita", false); }, 30000);
  }
  const chk = x._el.querySelector(".ag-slot .check");   // perícia, aviso, rotina: o concluir que a linha já tem
  if(chk){ fecharExt(); return chk.click(); }
  aviso("Esta linha se conclui no caso"); fecharExt(); abrirDaLinha(x._el);
}

// ══════════════════════════════════════════════════════════════════════════
// F466 · O DASHBOARD DO CASO (ditado pelo Paulo em 09.11.2026). Abaixo das fases e acima do campo de escrever:
// o Último despacho da equipe, com Anotar, Reagendar e Concluir (a mesma identidade da extensão da linha, F455),
// e o Último andamento do portal da fase (INSS, CRPS ou Judicial; dois cartões com mandado de segurança em
// paralelo). Protocolo, NB, DER, NUP e processo só aparecem ao abrir "Ver anotações anteriores".
function itemDoCaso(k){
  if(!k) return null;
  const fatal = !!k.prazo && fatalAbertoDe(k)===k.prazo;
  return {k, cli:D.cliPorId.get(k.cliente_id), data:k.prazo||"", fatal, quem:[],
    selo: fatal ? "" : k.prazo && (k.ronda||{}).despacho?.prazo===k.prazo ? "Volta à fila" : "Retorno"};
}
// no navegador automatizado as provas antigas esperam a linha do tempo à vista; a nova liga com crm_dash_caso=1
const dashLigado = () => temaV10() && (!navigator.webdriver || (()=>{ try{ return localStorage.getItem("crm_dash_caso")==="1"; }catch(e){ return false; } })());
const _dbAnt = new Map();   // caso id → "Ver anotações anteriores" aberto
function dbVerAnt(id){ _dbAnt.set(id, !_dbAnt.get(id)); repintarFicha(); }
function dbClique(e, x, id){
  const b = e.target.closest("[data-ae]"); if(!b) return;
  e.stopPropagation();
  const k = D.casoPorId.get(id); if(!k) return;
  _ext = null;
  if(!x._it){ x._it = itemDoCaso(k); x._el = x; x._atual = (D.atrDoCaso.get(k.id)||[])[0] || ""; }
  const a = b.dataset.ae;
  if(a==="responder") return dbResponder(k, b.dataset.and);
  return acaoExt(x, a, b);
}
// F621 · Responder: com tarefa ou prazo da anotação, abre a janela lateral (que tem o Concluir);
// sem tarefa, abre a resposta presa à anotação (pedido do Paulo, 16.11.2026)
function dbResponder(k, andId){
  const ids = new Set([andId, ...(D._andsFicha||[]).filter(y=>y.responde_a===andId).map(y=>y.id)]);
  const i = faixaAtual.findIndex(x=>x.casoId===k.id && x.andId && ids.has(x.andId));
  if(i>=0) return abrirPainelPrazo(i);
  _dbAnt.set(k.id, true); abrirRespInline(andId);
}
// o ícone do AdvPrev (o mesmo da tela de início), ao lado de docs/crm/index.html (F467, pedido do Paulo de 09.11.2026)
const DB_LOGO_ADV = `<img src="icone-192.png" alt="">`;
function dbQuando(iso){
  if(!iso) return "";
  const d = dataSP(iso), n = diasEntreIso(d, hoje());
  return `${fmtBarra(d)} ${horaSP(iso)} · ${n<=0 ? "hoje" : n===1 ? "ontem" : `há ${n} dias`}`;
}
function dbLead(txt){
  const m = String(txt||"").match(/^(.{3,60}?[.:])\s+([\s\S]*)$/);
  return m ? `<b>${esc(m[1])}</b> ${esc(m[2])}` : esc(txt||"");
}
function dbAnteriores(k, n, rot, aberto, verOnclick){
  const t = `${aberto ? "Ocultar" : "Ver"} ${rot} anteriores${n>0 ? ` (${n})` : ""}`;
  return `<button type="button" class="db-ant" aria-expanded="${aberto}" onclick="${verOnclick}">${t}</button>`;
}
function dbNumeros(k){
  const nums = numerosDoCaso(k);
  const rows = [["Protocolo", nums.prot, "prot"], ["NB", nums.nb, "nb"], ["DER", k.der ? [k.der] : [], "der"], ["NUP", nums.nup, "nup"], ["Processo", nums.proc, "proc"]];
  const h = rows.flatMap(([r, ds, t]) => (ds||[]).map(d => { const f = t==="der" ? fmtBarra(d) : fmtNum(t, d);
    return `<span class="db-num">${r} <button type="button" class="db-n" data-cop="${esc(f)}" data-cop-msg="${r} copiado" title="Copiar">${esc(f)}</button></span>`; }));
  return h.length ? `<div class="db-lista">${h.join("")}</div>` : "";
}
function dbDespacho(k, ands){
  const notas = (ands||[]).filter(a=>!a.excluir && !ehReacao(a) && !ehOficial(a) && !ORIGENS_ROBO.includes(a.origem))
    .sort((a,b)=>(a.criado_em||"")<(b.criado_em||"")?1:-1);
  const nota = notas.find(a=>!a.responde_a), resp = nota && notas.find(a=>a.responde_a===nota.id);
  const au = nota && D.colPorId.get(nota.autor_id), aberto = !!_dbAnt.get(k.id);
  const corpo = nota
    ? `<div class="db-corpo"><span class="db-quem" style="background:${esc((au||{}).cor||"#6B7070")}" aria-hidden="true">${esc((au||{}).inicial||"?")}</span><div>
        <div class="db-autor">${esc((au||{}).nome||"Equipe")}</div>
        <p class="db-txt">${esc(String(nota.texto||"").slice(0,1000))}</p>
        ${resp ? `<div class="db-resp">${esc(((D.colPorId.get(resp.autor_id)||{}).nome||"").split(" ")[0])}: ${esc(String(resp.texto||"").slice(0,400))}</div>` : ""}</div></div>`
    : `<p class="db-vazio">Sem anotação da equipe neste caso.</p>`;
  // Prorrogar só com data a mover, o retorno ou a volta à fila (F473, pedido do Paulo de 09.11.2026); sem ela, só o Anotar
  const prorroga = !!k.prazo && reagendavel(itemDoCaso(k));
  // F546 · "Ver anotações anteriores" no canto direito da linha do Anotar (pedido do Paulo de 12.11.2026)
  const ant = dbAnteriores(k, Math.max(0, notas.filter(a=>!a.responde_a).length-1), "anotações", aberto, `dbVerAnt('${k.id}')`);
  const acoes = podeGravarCaso() ? `<div class="ae-acoes db-acoes">
      <button type="button" class="btn-mini pri" data-ae="anotar">Anotar</button>
      ${nota ? `<button type="button" class="btn-mini" data-ae="responder" data-and="${nota.id}" title="Responder a esta anotação ou seguir a tarefa dela">Responder</button>` : ""}
      ${prorroga ? `<button type="button" class="btn-mini" data-ae="reagendar" title="Mudar a data do retorno">Prorrogar</button>` : ""}${ant}</div><div class="ae-painel" hidden></div>`
    : `<div class="ae-acoes db-acoes">${ant}</div>`;
  return `<section class="db db-desp" aria-label="Último andamento no Escritório" onclick="dbClique(event,this,'${k.id}')">
    <div class="db-cab"><span class="db-logo" aria-hidden="true">${DB_LOGO_ADV}</span><h3>Último andamento no Escritório</h3><span class="db-when">${nota ? dbQuando(nota.criado_em) : ""}</span></div>
    ${corpo}${acoes}${aberto ? dbNumeros(k) : ""}</section>`;
}
// F492 · a data do andamento, e não a da importação: o PJe guarda a do movimento
// no origem_id (mov:<num>:2025-03-05T15:33) e o PAT a do portal (atualizacao:<prot>:20251014225036)
function dataDoDb(a){
  const m = String((a&&a.origem_id)||"").match(/^atualizacao:[^:]*:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00` : dataDoMovimento(a);
}
// F511 · "Ver andamentos anteriores" abre a lista logo abaixo do cartão, e não a aba (pedido do Paulo de 10.11.2026)
const _dbAndAnt = new Map();   // "caso|aba" → aberto
function dbVerAnd(id, aba){ const c = `${id}|${aba}`; _dbAndAnt.set(c, !_dbAndAnt.get(c)); repintarFicha(); }
function dbListaDias(itens, max, desc){
  const dias = new Map();
  for(const x of itens){ if(!dias.has(x.d)){ if(max && dias.size===max) break; dias.set(x.d, []); } dias.get(x.d).push(x); }
  let usados = 0;
  const lis = [...dias].map(([d, xs]) => { usados += xs.length;
    const partes = [...new Set((desc ? xs : [...xs].reverse()).flatMap(x=>x.partes).map(t=>String(t||"").trim()).filter(Boolean))];
    const dia = `<b class="db-dia">${fmtBarra(d)}:</b>`;
    return partes.length===1 ? `<li>${dia} ${esc(partes[0])}</li>` : `<li>${dia}<ul>${partes.map(t=>`<li>${esc(t)}</li>`).join("")}</ul></li>`; });
  return {html: `<ul class="db-mov db-movs">${lis.join("")}</ul>`, usados};
}
function dbAndamento(k, ands, fase, par){
  let it = null;
  if(fase==="inss"){
    const pats = (ands||[]).filter(a=>!a.excluir && a.origem==="pat").sort((a,b)=>dataDoDb(a)<dataDoDb(b)?1:-1);
    const a = pats[0]; if(!a) return "";
    const sit = pats.map(x=>String(x.origem_id||"")).find(o=>o.startsWith("situacao:"));
    const prot = protocolosDe(k)[0];
    // F546 · os comentários do PAT (INSS e escritório), o mais recente à vista e os anteriores no botão
    // (pedido do Paulo de 12.11.2026); sem comentário, o último registro do PAT, como antes
    const coms = pats.filter(x=>!/^(?:situacao|importado|evento|atualizacao):/.test(String(x.origem_id||"")));
    const vs = coms.length ? coms : pats, c = vs[0];
    const m = /^(INSS|Escrit[óo]rio)\s*·\s*([\s\S]*)$/.exec(String(c.texto||""));
    it = {cls:"", nome:"Meu INSS", onde:"INSS", logo:iconeFonte("inss"), iso:dataDoDb(c),
      txt: m ? `<b>${m[1]==="INSS" ? "Comentário do INSS" : "Comentário do escritório"}:</b> ${esc(m[2].slice(0,1000))}` : dbLead(c.texto),
      sub:sit ? sit.split(":").slice(2).join(":") : especieDoCaso(k),
      abrir: prot ? `abrirMeuInss('${escJs(prot)}')` : "", n:vs.length-1, aba:"inss", rot:coms.length ? "comentários" : "andamentos",
      ant:()=>dbListaDias(vs.slice(1).map(x=>({d:dataSP(dataDoDb(x)), partes:[x.texto]}))).html, bts:f=>dbBotoes(k, "inss", (String(a.origem_id||"").match(/:(\d{6,})/)||[])[1]||soDig(prot||""), "", f)};
  } else if(fase==="conselho"){
    // F547 · os três últimos andamentos como estão na tela do e-SISREC (o status cru), do mais novo
    // ao mais antigo, agrupados por dia como no cartão do PJe (pedido do Paulo de 12.11.2026)
    const ts = e => { const d = String(e.data||""); return /^\d{4}-/.test(d) ? d : (CRPS.dataParaISO(d)||""); };
    const evs = crpsBlocos(k).flatMap(b=>(b.eventos||[]).map(e=>({e, nup:b.nup, t:ts(e)}))).sort((a,b)=>a.t<b.t?1:a.t>b.t?-1:0);
    const x = evs[0]; if(!x) return "";
    const lin = y=>({d:isoCrps(y.e.data)||"", partes:[y.e.bruto||y.e.resumo||""]});
    const tres = evs.slice(0,3), doc = tres.flatMap(y=>y.e.arquivos||[]).find(a=>a.storage);
    it = {cls:"crps", nome:"e-Recursos", onde:"CRPS", logo:iconeFonte("crps"), iso:isoCrps(x.e.data)+"T12:00:00", soData:true,
      lista: dbListaDias(tres.map(lin), 0, true).html, txt:"", sub:"",
      doc: doc ? `<button type="button" class="db-doc" onclick="abrirDecisao('${escJs(doc.storage)}')">${esc(doc.nome||"Documento")}</button>` : "",
      abrir: x.nup ? `window.open('${escJs(linkERecursos(x.nup))}','_blank','noopener')` : "", n:evs.length-3, aba:"crps", rot:"andamentos",
      ant:()=>dbListaDias(evs.slice(3).map(lin), 0, true).html, bts:f=>dbBotoes(k, "crps", soDig(x.nup||""), "", f)};
  } else if(fase==="judicial"){
    let pj = andamentosPje(ands).sort((a,b)=>dataDoDb(a)<dataDoDb(b)?1:-1); const a = pj[0]; if(!a) return "";
    const num = numDoAndPje(a), dig = num ? soDig(num) : "";
    if(dig) pj = pj.filter(x=>soDig(numDoAndPje(x)||"")===dig);
    const sis = sisCurtoDoMov(a), href = linkPjeDoAndamento(a, k) || linkPjeDoCaso(k);
    // F523 · proposta A (escolha do Paulo de 11.11.2026): a situação, a fila do TRF3 e só os dois movimentos relevantes.
    // F529 · tudo do grau do último movimento: o processo na Turma Recursal não mostra o órgão nem os movimentos do 1º grau
    const g = grauDoAndamentoPje(a), pg = g ? pj.filter(x=>grauDoAndamentoPje(x)===g) : pj;
    const rel = pg.filter(x=>!movDeRotina(x)).slice(0, 2), vistos = rel.length ? rel : pg.slice(0, 1);
    const resto = pj.filter(x=>!vistos.includes(x)), desde = dataDoDb(vistos[vistos.length-1]);
    const rot = pg.filter(x=>movDeRotina(x) && dataDoDb(x)>=desde).length;
    it = {cls:"jud", nome:sis, onde:sis, logo:iconeFonte({"PJe":"pje","e-SAJ":"esaj","eproc":"eproc"}[sis]||"pje"), iso:dataDoDb(a), sub:"",
      lista: dbSituacaoJud(k, dig, par, g, pg) + dbRelevantes(vistos) + (rot ? `<p class="db-rot">+${rot} ${rot===1?"movimento":"movimentos"} de rotina</p>` : ""),
      href, n:resto.length, aba:"cnj", rot:"andamentos", ant:()=>dbMovsPje(resto, 0).html, bts:f=>dbBotoes(k, "cnj", dig, sis, f)};
  } else return "";
  const logo = it.href ? `<a class="db-logo" href="${esc(it.href)}" target="_blank" rel="noopener" aria-label="Abrir no ${esc(it.nome)}" title="${esc(it.nome)}">${it.logo}</a>`
    : it.abrir ? `<button type="button" class="db-logo" onclick="${it.abrir}" aria-label="Abrir no ${esc(it.nome)}" title="${esc(it.nome)}">${it.logo}</button>`
    : `<span class="db-logo" aria-hidden="true">${it.logo}</span>`;
  const abre = it.n>0 && !!_dbAndAnt.get(`${k.id}|${it.aba}`);
  const quando = it.soData ? `${fmtBarra(dataSP(it.iso))} · ${(n=>n<=0?"hoje":n===1?"ontem":`há ${n} dias`)(diasEntreIso(dataSP(it.iso), hoje()))}` : dbQuando(it.iso);
  return `<section class="db db-and ${it.cls}" aria-label="Último andamento no ${esc(it.onde)}">
    <div class="db-cab">${logo}<h3>Último andamento no ${esc(it.onde)}</h3><span class="db-when">${quando}</span>${par ? `<span class="db-par">Em paralelo · mandado de segurança</span>` : ""}</div>${lcHtml(k, it.aba)}
    ${it.lista || `<p class="db-mov">${it.txt}${it.sub ? `<span class="db-sub">${esc(it.sub)}</span>` : ""}</p>`}${it.doc||""}${it.bts(dbAnteriores(k, Math.max(0, it.n), it.rot, abre, it.n>0 ? `dbVerAnd('${k.id}','${it.aba}')` : `irSubAba('${it.aba}')`))}
    ${abre ? `<div class="db-pn" role="region" aria-label="${it.rot==="comentários" ? "Comentários" : "Andamentos"} anteriores no ${esc(it.onde)}"><h4>${it.rot==="comentários" ? "Comentários" : "Andamentos"} anteriores</h4>${it.ant()}</div>` : ""}</section>`;
}
// F645 · O PAINEL LATERAL DO CLIENTE (protótipo "Painel do Cliente Tercini", pedido do Paulo de 18.11.2026). O clique no
// NOME do cliente nas listas abre à direita, sem sair da lista: nome (copia), espécie e lista, Abrir ficha; CPF, senha do
// Meu INSS, telefone com WhatsApp, parceria e parentesco; a tarefa com Hoje, Amanhã, Próx. segunda, +7 e +30 dias e o
// mês à vista (um clique reagenda, só no CRM: o To Do segue somente leitura); anexos; anotação; última anotação.
// O clique no resto da linha continua estendendo a linha (F455) e o Ctrl+clique abre a ficha.
let _pcli = null;   // {el, cliId, casos, sel}
// no navegador automatizado as provas antigas esperam a linha estendida; o painel liga com crm_painel_cli = 1
const pcliLigado = () => !navigator.webdriver || (()=>{ try{ return localStorage.getItem("crm_painel_cli")==="1"; }catch(e){ return false; } })();
function abrirPainelCli(el){
  fecharExt(); _ext = null; clearTimeout(el._ult); esconderUltAnot();
  _pcli = {el, cliId:el.dataset.cli, casos:el.dataset.casos||"", sel:el.dataset.sel||""};
  pcliMontar();
}
function fecharPainelCli(){ _pcli = null; document.body.classList.remove("pcli-aberto"); document.getElementById("pcli")?.remove(); document.querySelectorAll(".cartao.pcli-on").forEach(x=>x.classList.remove("pcli-on")); }
async function pcliMontar(){
  if(!_pcli) return;
  // a linha pode ter sido redesenhada depois de uma ação: procura a mesma de novo
  const el = [...document.querySelectorAll(".cartao[data-cli]")].find(x=>x.dataset.cli===_pcli.cliId && (x.dataset.sel||"")===_pcli.sel && (x.dataset.casos||"")===_pcli.casos) || _pcli.el;
  _pcli.el = el;
  const cli = D.cliPorId.get(_pcli.cliId); if(!cli) return fecharPainelCli();
  const it = document.body.contains(el) ? itemDaLinha(el) : itemDoCaso(_pcli.casos.split(",").map(id=>D.casoPorId.get(id)).find(Boolean));
  const k = it && it.k, ks = _pcli.casos.split(",").map(id=>D.casoPorId.get(id)).filter(Boolean);
  document.querySelectorAll(".cartao.pcli-on").forEach(x=>x.classList.remove("pcli-on")); el.classList.add("pcli-on");
  let p = document.getElementById("pcli");
  if(!p){ p = document.createElement("aside"); p.id = "pcli"; p.setAttribute("aria-label","Painel do cliente"); document.body.appendChild(p); }
  document.body.classList.add("pcli-aberto");
  const tel = telefonesDe(cli).find(t=>t.zap) || telefonesDe(cli)[0];
  const atr = k ? (D.atrDoCaso.get(k.id)||[]) : [], resp = (it && it.tc ? [it.tc.colaborador_id] : atr).map(id=>D.colPorId.get(id)).filter(Boolean);
  const venc = it && it.data && it.data < hoje(), mov = it && reagendavel(it);
  const lista = k ? (listaDe(k)!=="—" ? listaDe(k).replace(/^\S+\s/,"") : NOME_FASE[k.fase]||"") : "";
  const dado = (rot, val, extra="") => `<div class="pcl-d"><span class="pcl-r">${rot}</span><span class="pcl-v">${val}</span>${extra}</div>`;
  const tipo = !it ? "" : it.fatal ? "Prazo fatal" : it.selo==="Volta à fila" ? "Retorno" : it.selo || "Retorno";
  const op = [["Hoje", hoje()], ["Amanhã", proxDiaUtil(somaDias(hoje(),1))]];
  p.innerHTML = `<div class="pcl-topo"><button type="button" class="pcl-x" data-pc="fechar" aria-label="Fechar o painel">×</button></div>
    <section class="pcl-cx pcl-cab"><div class="pcl-nl"><button type="button" class="pcl-nome" data-pc="nome" title="Copiar o nome">${esc(cli.nome)}</button>
      <button type="button" class="btn-mini forte" data-pc="ficha">Abrir ficha</button></div>
      <div class="pcl-tags">${k && k.especie ? `<span class="pcl-tag">${esc(k.especie)}</span>` : ""}${lista ? `<span class="pcl-tag pcl-lis">${esc(lista)}</span>` : ""}</div>
      <div class="pcl-dados">
      ${dado("CPF", cli.cpf ? `<span class="pcl-cop" data-cop="${esc(cli.cpf)}" data-cop-msg="CPF copiado" title="Copiar o CPF">${esc(fmtCpf(cli.cpf))}</span>` : "sem CPF")}
      ${dado("Senha do Meu INSS", `<span class="pcl-senha">••••••</span>`, `<button type="button" class="pcl-ic" data-pc="senha" aria-label="Mostrar a senha do Meu INSS" title="Mostrar a senha">👁</button>`)}
      ${dado("Telefone", tel ? esc(tel.numero) : "sem telefone", tel ? `<button type="button" class="pcl-ic pcl-zap" data-pc="zap" title="Abrir o WhatsApp">${iconeFonte("zap")}<span class="sr-only">WhatsApp</span></button>` : "")}
      ${dado("Parceria", esc(parceriaDe(cli, ks) || "Sem parceria"))}
      <div class="pcl-d pcl-larga"><span class="pcl-r">Parentesco</span><span class="pcl-v pcl-par">…</span></div></div></section>
    ${it ? `<section class="pcl-cx"><h3>Prazo${tipo ? `<span class="pcl-tipo${it.fatal ? " fatal" : ""}">${esc(tipo)}</span>` : ""}</h3>
      <p class="pcl-venc${venc ? " venc" : ""}">${it.data ? esc(fmtBarra(it.data)) : "Sem data"}</p>
      ${mov ? `<div class="pcl-dias">${op.map(([r,d])=>`<button type="button" class="esp-it" data-pc="dia" data-data="${d}" title="${fmtBarra(d)}">${r}</button>`).join("")}</div>${miniCal(hoje(), it.data)}` : ""}</section>` : ""}
    ${k ? `<section class="pcl-cx"><h3>Atribuição</h3><div class="pcl-seg" role="group" aria-label="Atribuir a">${equipeAtiva().map(c=>`<button type="button" data-pc="para" data-id="${c.id}"${c.id===atr[0] ? ` class="on" aria-pressed="true"` : ` aria-pressed="false"`}>${esc(c.nome.split(" ")[0])}</button>`).join("")}</div></section>
    <section class="pcl-cx"><h3>Anotações</h3><textarea class="ae-nota" rows="3" placeholder="Escrever no caso…" aria-label="Escrever no caso"></textarea>
      <div class="pcl-fim"><button type="button" class="btn-mini forte" data-pc="anotar">Anotar</button></div>
      <div class="pcl-ult">Carregando…</div>
      <button type="button" class="ae-mais" data-pc="ant">Ver anotações anteriores</button><div class="pcl-ant"></div></section>` : ""}`;
  Object.assign(p, {_it:it, _el:el, _atual:atr[0]||""});
  ligarMiniCal(p.querySelector(".mcal"), d => pcliReagendar(p, d));
  p.onclick = e => { const b = e.target.closest("[data-pc]"); if(b){ e.stopPropagation(); pcliAcao(p, b, cli); } };
  const cid = cli.id;
  api(`/rest/v1/vinculos?select=*&or=(cliente_id.eq.${cid},ligado_a.eq.${cid})`).catch(()=>[]).then(v=>{
    const s = _pcli && _pcli.cliId===cid && p.querySelector(".pcl-par"); if(s) s.textContent = parentesTexto(cli, v||[]) || "Sem parente cadastrado"; });

  if(_pcli.casos) ultAnotDe(_pcli.casos).then(a=>{
    const t = _pcli && _pcli.cliId===cid && p.querySelector(".pcl-ult"); if(!t) return;
    const au = a && a.autor_id && D.colPorId.get(a.autor_id);
    t.innerHTML = a ? `<span class="ae-cab">${esc(fmtBarra(dataSP(a.criado_em)))}${au ? " · "+esc(au.nome.split(" ")[0]) : ""}</span>${esc((a.texto||"").slice(0,1000))}` : "Sem anotação da equipe neste caso.";
  });
}
async function pcliAcao(p, b, cli){
  const a = b.dataset.pc;
  if(a==="fechar") return fecharPainelCli();
  if(a==="nome") return copiar(cli.nome, "Nome copiado");
  if(a==="ant"){ const box = p.querySelector(".pcl-ant"); if(box.innerHTML){ box.innerHTML = ""; b.textContent = "Ver anotações anteriores"; return; }
    b.textContent = "Ocultar anotações anteriores"; box.textContent = "Carregando…";
    const r = await api(`/rest/v1/andamentos?select=texto,criado_em,autor_id&caso_id=in.(${_pcli.casos})&origem=not.in.(${[...new Set([...ORIGENS_ROBO, ...ORIGENS_OFICIAIS])].join(",")})&excluir=not.is.true&order=criado_em.desc&offset=1&limit=50`).catch(()=>null);
    if(!box.isConnected) return;
    box.innerHTML = r==null ? "Não carregou: tente de novo" : r.length ? r.map(x=>{ const au = x.autor_id && D.colPorId.get(x.autor_id);
      return `<div class="pcl-ult"><span class="ae-cab">${esc(fmtBarra(dataSP(x.criado_em)))}${au ? " · "+esc(au.nome.split(" ")[0]) : ""}</span>${esc(x.texto||"")}</div>`; }).join("") : "Sem anotações anteriores.";
    return; }
  if(a==="ficha"){ const el = p._el; fecharPainelCli(); return document.body.contains(el) ? abrirDaLinha(el) : abrirFicha(cli.id); }
  if(a==="senha"){ const cr = await senhaMeuInss(cli.id), s = p.querySelector(".pcl-senha"); if(!cr) return aviso("Sem senha do Meu INSS na ficha");
    if(s.dataset.vis){ return copiar(cr.valor, "Senha copiada 📋"); } s.textContent = cr.valor; s.dataset.vis = 1; b.title = "Copiar a senha"; return; }
  if(a==="zap"){ const tel = celular() && (telefonesDe(cli).find(t=>t.zap) || telefonesDe(cli)[0]); fecharPainelCli(); return tel ? zapDoNumero(tel.numero) : fichaComZap(cli.id); }
  if(a==="dia") return pcliReagendar(p, b.dataset.data);
  if(a==="para"){ const k = p._it && p._it.k, de = p._atual, para = b.dataset.id; if(!k || para===de) return;
    const u = await passarComDesfazer(k, para, de).catch(()=>null); if(!u) return aviso("Não gravou: tente de novo");
    repintaExt(k); pcliMontar(); return avisoDesfazer(`Atribuído a ${D.colPorId.get(para).nome.split(" ")[0]}`, async ()=>{ await u(); repintaExt(k); pcliMontar(); }, 30000); }
  if(a==="anotar"){
    const ta = p.querySelector(".ae-nota"), txt = ta.value.trim(), k = p._it && p._it.k; if(!txt || !k) return aviso("Escreva a anotação");
    let undo; try{ undo = await notaNoCaso(k, txt); }catch(e){ return aviso("Não gravou: tente de novo"); }
    ta.value = ""; repintaExt(k); pcliMontar();
    avisoDesfazer("Anotado", async ()=>{ await undo(); repintaExt(k); pcliMontar(); aviso("Anotação desfeita", false); }, 30000);
  }
}
async function pcliReagendar(p, d){ await extReagendar(p, d); pcliMontar(); }
document.addEventListener("keydown", e=>{ if(e.key==="Escape" && _pcli && !document.querySelector("#modal[style*='block']")) fecharPainelCli(); });
