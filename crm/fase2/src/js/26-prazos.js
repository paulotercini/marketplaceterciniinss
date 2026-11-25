function subespeciesDe(cod){ return SUBESPECIES[cod] || (nomeDaEspecie(cod) ? [[cod, nomeDaEspecie(cod)]] : []); }
function nomeDaSubespecie(chave){
  for(const lista of Object.values(SUBESPECIES)){ const s = lista.find(([c])=>c===chave); if(s) return s[1]; }
  return null;
}
let espBusca = "";
// F128 · o catálogo é UM só, e serve ao caso e ao pré-caso das Anotações:
// espCtx guarda a escolha atual e quem recebe o clique
let espCtx = null;
function abrirCatalogoEspecies(titulo, atual, escolher){
  espBusca = ""; espCtx = {atual: atual||{}, escolher};
  caixa(`<h3 style="margin:0 0 8px">Espécie do caso <small class="meio-sub">· ${esc(titulo)}</small></h3>
    <input id="esp-busca" placeholder="procurar: tempo de contribuição, rural, pensão, B42…" style="width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--borda);border-radius:6px;font-size:13px"
      oninput="espBusca=this.value;pintarEspecies()">
    <div id="esp-lista" class="esp-lista"></div>
    <div class="form-linha" style="margin-top:10px;align-items:center;gap:8px">
      <input id="esp-livre" placeholder="outro pedido, à mão (ex.: Repetição de Indébito)" style="flex:1;min-width:220px"
        onkeydown="if(event.key==='Enter')espCtx.escolher(null,null,this.value)">
      <button class="btn-mini" onclick="espCtx.escolher(null,null,document.getElementById('esp-livre').value)" title="usar este nome"><span aria-hidden="true">Usar</span><span class="sr-only">usar este nome</span></button>
    </div>`);
  pintarEspecies();
  document.getElementById("esp-busca").focus();
}
function escolherEspecie(casoId){
  const k = D.casoPorId.get(casoId); if(!k) return;
  abrirCatalogoEspecies(tituloCaso(k), {cod:k.especie, chave:k.subespecie||k.especie},
    (cod, chave, livre)=>gravarEspecie(casoId, cod, chave, livre));
}
function pintarEspecies(){
  const at = (espCtx||{}).atual||{}, q = dsa(espBusca||"").trim();
  const bate = t => !q || dsa(t).includes(q);
  const html = FAMILIAS_ESPECIE.map(([fam, cods]) => {
    const itens = cods.flatMap(cod => subespeciesDe(cod).filter(([ch, nome]) => bate(`${cod} ${ch} ${nome}`)).map(([ch, nome]) => {
      const on = at.chave ? at.chave===ch : (at.cod===cod && ch===cod);
      return `<button class="esp-it ${on?"on":""} ${ch===cod?"":"sub"}" onclick="espCtx.escolher('${cod}','${ch}')">
        <span class="esp-cod-mini">${esc(cod)}</span>${esc(nome)}</button>`; }));
    return itens.length ? `<div class="esp-fam"><div class="esp-fam-rot">${esc(fam)}</div>${itens.join("")}</div>` : "";
  }).join("");
  document.getElementById("esp-lista").innerHTML = html || `<p class="meio-sub" style="padding:6px 2px">Nada com “${esc(espBusca)}”. Escreva o pedido à mão no campo abaixo.</p>`;
}
// o pré-caso das Anotações escolhe no MESMO catálogo do caso (pedido do
// Paulo, 20.09): guarda o nome (que o resto da mesa lê), o código e a
// subespécie, que descem para o caso quando ele for gerado
function escolherEspeciePre(cliId, pcId){
  const c = D.cliPorId.get(cliId); if(!c) return;
  const pc = precasosDe(c).find(p=>p.id===pcId); if(!pc) return;
  abrirCatalogoEspecies(pc.especie||"pré-caso", {cod:pc.cod, chave:pc.sub||pc.cod},
    async (cod, chave, livre)=>{
      let nome, corpo;
      if(cod){ nome = (chave && nomeDaSubespecie(chave)) || nomeDaEspecie(cod);
               corpo = {especie:nome, cod, sub:(chave && chave!==cod) ? chave : null}; }
      else{ nome = String(livre||"").trim(); if(!nome) return aviso("Escreva o nome do pedido");
            corpo = {especie:nome, cod:null, sub:null}; }
      fecharCaixa();
      mesaAberta.add("b1");
      const pcs = precasosDe(c).map(p=>p.id===pcId ? {...p, ...corpo, quem:p.quem||eu.id, em:p.em||hoje()} : p);
      if(await gravarPrecasos(cliId, pcs)){ aviso(`Espécie: ${nome} ✔`, false); repintarFicha(); }
    });
}
async function gravarEspecie(casoId, cod, chave, livre){
  const k = D.casoPorId.get(casoId); if(!k) return;
  let corpo;
  if(cod){
    const nome = (chave && nomeDaSubespecie(chave)) || nomeDaEspecie(cod);
    corpo = {especie:cod, subespecie:(chave && chave!==cod) ? chave : null, beneficio:nome};
  } else {
    const t = String(livre||"").trim(); if(!t) return aviso("Escreva o nome do pedido");
    corpo = {especie:null, subespecie:null, beneficio:t};
  }
  // F612 · trocou a espécie: o resumo antigo vai às versões e o quadro pede o novo
  const r = k.resumo, nova = corpo.especie || corpo.beneficio;
  if(r && r.texto && nova !== rsEspecie(k)) corpo.resumo = {versoes:[...(r.versoes||[]), {texto:r.texto, em:r.em, autor:r.autor}].slice(-10), recusou:r.recusou||[]};
  try{ await patchCaso(casoId, corpo); }
  catch(e){ return aviso(/42703|subespecie/.test(String(e.message||e)) ? "Rode o crm/fase2/schema_linha_caso.sql no Supabase — falta a coluna subespecie" : "Não gravou — tente de novo"); }
  Object.assign(k, corpo); fecharCaixa();
  aviso(`Espécie: ${tituloCaso(k)} ✔`, false);
  abrirFicha(clienteAberto);
}
// o que cada sigla quer dizer, para quem está aprendendo (fica no title)
const FATOS = {
  especie:    {rot:"Espécie",     tipo:"especie", dica:"o que define o TÍTULO do caso: espécie de benefício (B31, B41…) ou serviço do INSS (CNIS, REV, CTC…)"},
  nb:         {rot:"NB",          tipo:"texto",   dica:"número do benefício"},
  processo:   {rot:"Processo (CNJ)", tipo:"texto",
               dica:"número único do processo judicial — é ele que liga o caso ao DataJud (consulta diária) e ao coletor do PJe"},
  ajuizado_em:{rot:"Distribuído em", tipo:"data",
               dica:"data da distribuição (ajuizamento) — a coleta do PJe preenche sozinha pelo 'Distribuído em'"},
  classe_judicial:{rot:"Classe", tipo:"texto",
               dica:"classe do processo (MSCiv, PJEC, ProceComCiv…) — é ela que diz se é Mandado de Segurança e se corre no JEF ou no rito comum"},
  orgao_judicial:{rot:"Onde está", tipo:"texto",
               dica:"a localização atual: vara, JEF, Turma Recursal, gabinete — a coleta do PJe preenche sozinha pelo acervo"},
  // F58 · as datas do CRPS (pedido do Paulo): cada peça com o seu protocolo —
  // precisam das colunas do crm/fase2/schema_recursos_crps.sql
  ro_protocolado_em:{rot:"Recurso Ordinário protocolado em", tipo:"data",
               dica:"data do protocolo do Recurso Ordinário na Junta de Recursos"},
  ed_protocolado_em:{rot:"Embargos de Declaração em", tipo:"data",
               dica:"data do protocolo dos Embargos de Declaração no CRPS"},
  re_protocolado_em:{rot:"Recurso Especial protocolado em", tipo:"data",
               dica:"data do protocolo do Recurso Especial à Câmara de Julgamento"},
  der:        {rot:"DER",         tipo:"data",    dica:"Data de Entrada do Requerimento"},
  dib:        {rot:"DIB",         tipo:"data",    dica:"Data de Início do Benefício"},
  decisao_em: {rot:"Decisão em",  tipo:"data",    dica:"data em que a decisão foi proferida — conta o prazo de recurso"},
  dii:        {rot:"DII",         tipo:"data",    dica:"Data de Início da Incapacidade"},
  dat:        {rot:"DAT",         tipo:"data",    dica:"Data do Acidente de Trabalho"},
  dcb:        {rot:"DCB",         tipo:"data",    dica:"Data de Cessação do Benefício"},
  dcb_prorrogar_em:{rot:"Prorrogar a partir de", tipo:"data", dica:"o dia do lembrete para pedir a prorrogação. Vazio, o CRM lembra 15 dias antes da DCB, que é quando a prorrogação pode ser pedida; a data que você escrever aqui prevalece"},
  // F114 · as datas que cada espécie exige (schema_linha_caso.sql)
  obito_em:   {rot:"Óbito",       tipo:"data",
               dica:"data do óbito do instituidor — requerimento em até 90 dias retroage ao óbito, 180 dias para dependente menor de 16 anos (art. 74, I, da Lei 8.213/91)"},
  prisao_em:  {rot:"Prisão",      tipo:"data",
               dica:"data do recolhimento à prisão — é ela que define carência, teto de baixa renda e regime admitido no auxílio-reclusão"},
  parto_em:   {rot:"Parto",       tipo:"data",
               dica:"data do parto; na adoção ou guarda, a data da guarda judicial, que é a DIB do salário-maternidade"},
  did:        {rot:"DID",         tipo:"data",
               dica:"Data de Início da Deficiência ou da Doença — define o tempo computado por grau na aposentadoria PCD e sustenta a tese de doença preexistente agravada"},
  consolidacao_em:{rot:"Consolidação", tipo:"data",
               dica:"consolidação das lesões — é ela que separa o auxílio por incapacidade do auxílio-acidente"},
  cat_em:     {rot:"CAT",         tipo:"data",
               dica:"data de emissão da CAT, distinta da data do acidente; a CAT pode ser emitida pelo próprio segurado, pelo sindicato ou pelo médico (art. 22, §2º, da Lei 8.213/91)"},
  primeiro_pagamento_em:{rot:"1º pagamento", tipo:"data",
               dica:"data do primeiro pagamento do benefício revisado — a decadência do art. 103 conta do dia primeiro do mês seguinte a ela"},
  cadunico:   {rot:"CadÚnico",    tipo:"data",
               dica:"data da última atualização do CadÚnico — vale 2 anos e, sem ela, o BPC é bloqueado"},
  grau_deficiencia:{rot:"Grau",   tipo:"lista", opcoes:["leve","moderada","grave"],
               dica:"grau de deficiência da LC 142/2013 — grave 25 anos (homem) e 20 (mulher), moderada 29 e 24, leve 33 e 28"},
};
const ehAcidentario = k => /^B9[123]$|^B94$/.test(k.especie||"") || /acident/i.test(k.beneficio||"");

// o retrato do processo judicial: é Mandado de Segurança? corre no JEF ou
// no rito comum? desde quando? A classe responde (MSCiv, PJEC, RecInoCiv,
// ProceComCiv, ApCiv…) — primeiro a gravada no caso (coleta do PJe ou mão),
// senão a que o DataJud consultou. A data idem: ajuizado_em ou o DataJud.
function dadosJudiciais(k){
  if(k.fase!=="judicial" && !k.processo && !k.classe_judicial) return null;
  const insts=(k.datajud && (k.datajud.instancias||[])) || [];
  const classe=k.classe_judicial || insts.map(i=>i.classe).find(Boolean)
    || (k.datajud||{}).classe || null;
  const ajuizado=k.ajuizado_em || insts.map(i=>i.ajuizado_em).find(Boolean) || null;
  const orgao=k.orgao_judicial || insts.map(i=>i.orgao).find(Boolean)
    || (k.datajud||{}).orgao_atual || null;
  if(!classe && !ajuizado && !orgao) return null;
  const b=dsa(classe||"");
  const ms=/mandado de seguranca|msciv/.test(b);
  const jef=/juizado|pjec|recinociv/.test(b);
  const comum=/procedimento comum|procecomciv|ordinari|apciv/.test(b);
  return {classe, ajuizado, orgao, ms, rito: jef?"JEF":(comum?"Rito comum":null)};
}
// prazo de recurso: 30 dias da decisão (o escritório adota a data em que ela
// foi proferida como a da ciência). Cai em fim de semana? vai para o dia útil.
// F192 · O PRAZO FATAL DO INSS E DO CRPS (decisão do Paulo, 11.10.2026).
// Nem o PAT nem o e-Recursos dizem o prazo ou a data da ciência: conta-se
// da DATA DO ATO no portal. Vence antes do prazo real, nunca depois.
// Exigência: o comentário mais novo do INSS que fala da exigência (sem ele,
// o mais novo; sem comentário, a última atualização do protocolo).
function atoDaExigencia(det){
  const coms = ((det&&det.comentarios)||[]).filter(c=>c && c.quando && c.do_inss!==false)
    .sort((a,b)=>String(b.quando).localeCompare(String(a.quando)));
  // teste 11.88, DAD-04: a convocação de perícia ("apresentar documentos na perícia") não é exigência
  const daPericia = x => /per(?:í|i|&iacute;|&#237;)cia|avalia\S{1,8}o social|comparec/i.test(x.texto||"");
  const c = coms.find(x=>/exig|apresent|anex|document/i.test(x.texto||"") && !daPericia(x)) || coms.find(x=>!daPericia(x));
  if(c) return {data:String(c.quando).slice(0,10), texto:c.texto||""};
  const ts = String((det&&det.atualizado_em)||"");
  const iso = (ts.match(/^\d{4}-\d{2}-\d{2}/)||[])[0]
    || ((m=>m?`${m[3]}-${m[2]}-${m[1]}`:null)(ts.match(/^(\d{2})\/(\d{2})\/(\d{4})/)));
  return iso ? {data:iso, texto:""} : null;
}
// F236 · 30 dias corridos contados da ciência (IN 128/2022, art. 566, caput; prorrogáveis por igual período a pedido,
// § 2º); o vencimento em dia sem expediente vai ao dia útil
const prazoDaExigencia = ato => ato ? proxDiaUtilAdm(somaDias(ato, 30)) : null;
// F220/F221 · os prazos de análise do acordo homologado no RE 1.171.152 (STF,
// Plenário, 08.02.2021), conferidos no acórdão: cláusula 1ª, aposentadorias
// 90 dias, aposentadoria por invalidez comum e acidentária 45, auxílio-doença
// comum e acidentário 45, auxílio-acidente 60, pensão 60, auxílio-reclusão 60,
// salário-maternidade 30, BPC 90; cláusula 2ª, o prazo corre do fim da
// instrução, que para incapacidade, auxílio-acidente e BPC é a perícia (e a
// avaliação social) e para os demais é o requerimento; cláusula 5ª, a
// exigência suspende a contagem, que recomeça no fim do prazo dado ou na
// entrega dos documentos, o que vier primeiro, com pelo menos 30 dias restantes.
// Exigência em aberto: a linha some (o prazo está parado); decidido, também.
const MORA_DIAS = {B41:90, B42:90, B46:90, B57:90, B21:60, B25:60, B80:30, B87:90, B88:90,
  B31:45, B91:45, B32:45, B92:45, B36:60, B94:60};
// 02.11.2026 · sem o B88: o BPC do idoso não passa por perícia nem por avaliação social (a avaliação do art. 20, § 6º, da
// Lei 8.742/1993 é da pessoa com deficiência), e exigir uma delas apagava o prazo de análise; ele conta do requerimento
const MORA_PERICIA = new Set(["B31","B91","B32","B92","B36","B94","B87"]);
const diasEntreIso = (a, b) => Math.round((new Date(b+"T12:00:00") - new Date(a+"T12:00:00"))/864e5);
// as exigências do caso já cumpridas, pelas anotações: quando parou e quando recomeçou
function suspensoesDoCaso(k){
  const ands = (D._andsFicha||[]).filter(a=>a.caso_id===k.id).sort((a,b)=>String(a.criado_em).localeCompare(String(b.criado_em)));
  const dataTxt = (t, rx) => { const m = String(t||"").match(rx); return m ? dataIso(m[1].replace(/\./g,"/")) : null; };
  const out = [];
  for(const a of ands){
    if(!/^\s*(\[EXIG[ÊE]NCIA\]|⚠ Exig[êe]ncia do INSS)/i.test(a.texto||"")) continue;
    const inicio = dataSP(a.criado_em), prazo = dataTxt(a.texto, /Prazo (?:para cumprir|final para cumprimento):\s*(\d{2}[\/.]\d{2}[\/.]\d{4})/i);
    const fim = ands.find(b=>dataSP(b.criado_em)>=inicio && b.id!==a.id && /cumprimento de exig[êe]ncia|exig[êe]ncia cumprida/i.test(b.texto||""));
    const entregue = fim ? (dataTxt(fim.texto, /protocolada em\s*(\d{2}[\/.]\d{2}[\/.]\d{4})/i) || dataSP(fim.criado_em)) : null;
    const reinicio = [prazo, entregue].filter(Boolean).sort()[0];
    if(reinicio && reinicio>=inicio) out.push({inicio, reinicio});
  }
  // F236 · a exigência que só o PAT registrou ("INSS: Em análise → Em exigência"), sem anotação da equipe: a pausa vai
  // da situação "Em exigência" à situação seguinte, à anotação do cumprimento ou ao fim dos 30 dias, o que vier primeiro
  // (IN 128/2022, art. 566, caput e § 9º; acordo do RE 1.171.152, cláusula 5ª). Antes, cumprida, a conta voltava à DER.
  const sit = a => a.origem==="pat" && /^situacao:/.test(a.origem_id||"") ? String(a.origem_id).split(":").slice(2).join(":") : "";
  for(const a of ands){
    if(!/^em exig/i.test(sit(a))) continue;
    const inicio = dataSP(a.criado_em);
    if(out.some(s=>s.inicio<=inicio && inicio<=s.reinicio)) continue;   // a anotação da equipe já conta esta exigência
    const fim = ands.find(b=>b!==a && dataSP(b.criado_em)>=inicio
      && ((sit(b) && !/^em exig/i.test(sit(b))) || /cumprimento de exig[êe]ncia|exig[êe]ncia cumprida/i.test(b.texto||"")));
    const reinicio = [proxDiaUtilAdm(somaDias(inicio, 30)), fim ? dataSP(fim.criado_em) : null].filter(Boolean).sort()[0];
    if(fim || reinicio<=hoje()) out.push({inicio, reinicio});
  }
  return out.sort((a,b)=>a.inicio.localeCompare(b.inicio));
}
// F236 · decidido o pedido, não há prazo de análise: o resultado ou a decisão gravados, a situação do PAT concluída
// ("Concluída - Deferida", "Concluída - Indeferida"), o benefício que já saiu (DIB) ou que ainda corre (DCB à frente)
// 02.11.2026 · o "Concluir em" do To Do fora do 🗓 Tarefas com Prazo é a data de voltar ao caso (retorno), e não prazo
// fatal: fatal é o caso na lista dos prazos (F38, onde o CRM também põe o prazo que registra, marcarTarefaComPrazo) ou o
// que tem a tarefa fatal da mesma data. A lista pessoal ☕ também é fase "outro", e lá a data é a do trabalho, e não fatal.
// Eram 207 de 219 datas futuras chamadas de "Prazo fatal" sem serem (02.11.2026)
// a anotação com o carimbo [PRAZO dd.mm.aaaa] da mesma data também faz do casos.prazo um prazo fatal
const prazoCarimbado = k => { const c = `[PRAZO ${fmt(k.prazo)}]`;
  return [D._andsFicha, D.and30].some(l=>(l||[]).some(a=>a.caso_id===k.id && !a.excluir && (a.texto||"").includes(c))); };
// F408 · a data é o "Concluir em" da tarefa do Microsoft To Do (a sincronização grava os dois iguais); a data que
// sai do To Do sai do CRM pela mesma sincronização (casos.todo_prazo, 31.10.2026)
const prazoDoTodo = k => !!(k && k.prazo && k.todo_prazo===k.prazo);
// F429 · decisão do Paulo (07.11.2026): o prazo fatal nasceu no CRM e é a anotação de prazo fatal do CRM que o faz; o
// "Concluir em" do To Do é retorno também no 🗓 Tarefas com Prazo, salvo com a tarefa fatal ou o carimbo da mesma data.
// F530 (11.11.2026): o carimbo só vem de quem registra o prazo fatal no CRM; o do assistente deixou de existir
const prazoEhRetorno = k => !!(k && k.prazo && (prazoDoTodo(k) || listaDe(k)!=="🗓 Tarefas com Prazo")
  && !(D.tarefasPorCaso.get(k.id)||[]).some(t=>t.natureza==="fatal" && !t.concluida_em && t.lembrar_em===k.prazo)
  && !prazoCarimbado(k));
const pedidoDecidido = k => !!(k.resultado || (k.decisao_em && (!k.der || k.decisao_em >= k.der)) || k.dib
  || (k.dcb && k.dcb >= hoje()) || /^(conclu|cancel|encerr)/i.test(String(k.situacao_inss||"").trim()));
// F236 · o que abre a contagem é a perícia médica ou a avaliação social do INSS; o atendimento de preparação do
// escritório ("Atendimento pré-perícia") e o estudo do processo não são perícia
const ehPericiaInss = e => /per[ií]cia|avalia[çc][ãa]o social/i.test(e.tipo||"") && !/atendimento|pr[ée][- ]?per[ií]cia|estudo/i.test(e.tipo||"");
// 31.10.2026 · a mora vencida já vista: a equipe marcou quando olhar de novo (o "Concluir em", o Concluir por hoje, o
// "Em análise · +7 d", o ✓ de checado ou um lembrete adiante). Até essa data o Meu Dia não a cobra todo dia
function moraVista(k, mora){
  const hj = hoje(), r = k.ronda||{};
  return (k.prazo && k.prazo > hj) || (r.despacho && dataSP(r.despacho.em) >= mora.data)
    || (k.checado_em && dataSP(k.checado_em) >= mora.data)
    || (D.tarefasPorCaso.get(k.id)||[]).some(t=>!t.concluida_em && t.lembrar_em && t.lembrar_em > hj);
}
function prazoMora(k){
  if(!k || !ehPrev(k) || faseEfetiva(k)!=="inss" || !k.der || k.exigencia_prazo || pedidoDecidido(k)) return null;
  // F236 · mandado de segurança por mora já impetrado: a demora está na Justiça e o prazo que vale é o da liminar
  if(processosDoCaso(k).some(p=>p.papel==="ms")) return null;
  const esp = String(k.especie||"").toUpperCase().slice(0,3), dias = MORA_DIAS[esp]; if(!dias) return null;
  let ini = k.der, tipo = "";
  if(MORA_PERICIA.has(esp)){
    const evs = (D.eventos||[]).filter(e=>e.caso_id===k.id && e.status!=="cancelada" && ehPericiaInss(e))
      .map(e=>({e, d:dataSP(e.data_hora)})).filter(x=>x.d && x.d>=k.der && x.d<=hoje()).sort((a,b)=>a.d.localeCompare(b.d));
    const feitas = evs.filter(x=>x.e.status==="realizada"), ultFeita = feitas.length ? feitas[feitas.length-1].d : "";
    // F236 · só a perícia FEITA abre a contagem: a "agendada" que já passou pede que alguém confirme, e até lá o prazo
    // fica parado (com a data que valeria se ela aconteceu)
    const pend = evs.filter(x=>x.e.status!=="realizada" && x.d>ultFeita).pop();
    if(pend) return {parado:true, pendente:pend.d, tipo:String(pend.e.tipo||"perícia").toLowerCase(), dias, seFeita:somaDias(pend.d, dias), vencido:false};
    // F236 · no BPC da pessoa com deficiência a instrução só acaba com as duas avaliações, a médica e a social (LOAS, art. 20, § 6º)
    if(esp==="B87" && !(feitas.some(x=>/social/i.test(x.e.tipo||"")) && feitas.some(x=>!/social/i.test(x.e.tipo||"")))) return null;
    const ult = feitas.pop(); if(!ult) return null;
    ini = ult.d; tipo = String(ult.e.tipo||"perícia").toLowerCase();
  }
  let base = ini, resta = dias;
  for(const s of suspensoesDoCaso(k)){
    if(s.inicio<base) continue;
    const usado = diasEntreIso(base, s.inicio); if(usado>=resta) break;   // venceu antes da exigência
    resta = Math.max(resta-usado, 30); base = s.reinicio;
  }
  const data = somaDias(base, resta);
  return data ? {data, dias, vencido: data < hoje(), desde:ini, pericia: ini!==k.der, tipo, suspenso: base!==ini} : null;
}
// F236 · a FASE VERDADEIRA do caso. "outro" é a lista 🗓 Tarefas com Prazo, o lugar de controle do prazo fatal (F38), e
// não uma fase: etapa, prazos, tramitação e fila seguem a lista de onde o caso veio (ronda.prazo_de, depois a origem);
// o caso que chegou do To Do já nessa lista diz a fase pelos números (processo, recurso, protocolo)
function faseEfetiva(k){
  if(!k || k.fase!=="outro") return k ? k.fase : "";
  const de = (k.ronda||{}).prazo_de || k.origem_lista || "";
  const f = (LISTAS_MOVER.find(([l])=>l===de)||[])[1];
  if(f && f!=="outro") return f;
  if(k.processo || (k.processos||[]).length) return "judicial";
  if(crpsNups(k).length || k.ro_protocolado_em || k.re_protocolado_em) return "conselho";
  if((k.protocolos||[]).length || k.der) return "inss";
  return "outro";
}
// F236 · a última DECISÃO de verdade do recurso no CRPS, lida do status cru do e-Recursos: o provimento, a negativa,
// o não conhecimento. "Encaminhar para cumprimento de acórdão", "Acórdão cumprido" e "Solicitação de análise de
// acórdão" não decidem nada. Alçada: o resumo do acórdão diz que é matéria médica, definitiva na Junta (Regimento
// Interno do CRPS, Portaria MPS 125/2026, art. 89, §§ 2º e 3º)
function ultimaDecisaoCrps(k){
  let ult = null;
  for(const b of crpsBlocos(k)) for(const e of (b.eventos||[])){
    const t = dsa(e.bruto||e.resumo||"");
    if(!/provimento|conhecer d|nao conhec|monocrat/.test(t) || /cumprimento|cumprid|analise de acordao/.test(t)) continue;
    const data = isoCrps(e.data);
    if(ult && data <= ult.data) continue;
    const res = (e.arquivos||[]).map(a=>((a.resumo||{}).linhas||[]).join(" ")).join(" ");
    const o = orgaoDaDecisao(e, (e.arquivos||[])[0]);
    ult = {data, parcial:/parcial|em parte/.test(t), instancia:o ? o.instancia : 0,
      favoravel:/\bdar(-lhe)? provimento|deu provimento/.test(t) && !/negar|nego|parcial|em parte|nao conhec/.test(t),
      alcada:/al[çc]ada|mat[ée]ria (exclusivamente )?m[ée]dica/i.test(res)};
  }
  return ult;
}
// F220 · os 30 dias são do recurso administrativo: só nas fases INSS e
// Conselho, e o prazo sai quando o recurso foi protocolado depois da decisão
// ou a última decisão foi favorável. No judicial vale o prazo do tribunal.
function recorrerAte(k){
  const fe = faseEfetiva(k);
  if(!k || !ehPrev(k) || !k.decisao_em || !["inss","conselho"].includes(fe) || k.resultado==="deferido") return null;
  // F236 · o PAT já diz que o pedido foi deferido: não há o que recorrer
  if(/deferid/i.test(k.situacao_inss||"") && !/indeferid/i.test(k.situacao_inss||"")) return null;
  const rec = [k.ro_protocolado_em, k.re_protocolado_em, k.ed_protocolado_em].filter(Boolean).sort().pop();
  if(rec && rec >= k.decisao_em) return null;
  // F236 · no Conselho, o recurso ganho não pede recurso nosso; o acórdão da Junta em matéria de alçada é definitivo
  // (art. 89, § 2º, do Regimento), e a decisão da Câmara encerra a via administrativa
  // F236 · e também quando a alçada da Junta é certa pelo próprio recurso (o parecer da Perícia Médica Federal ouvida em
  // matéria médica, art. 89, §§ 3º e 4º; alcadaJunta), mesmo sem o resumo do acórdão dizer "alçada"
  if(fe==="conselho"){ const u = ultimaDecisaoCrps(k); if(u && (u.favoravel || u.alcada || u.instancia===2 || (u.instancia!==2 && alcadaJunta(k)==="certa"))) return null; }
  // F415 · com a reanálise pedida, os 30 dias contam da ciência da decisão dela (Portaria Conjunta 13/2026, art. 9º, § 2º, II,
  // com a redação da Portaria Conjunta 54/2026): enquanto não decide, não há "Recorrer até"; deferida, não há o que recorrer
  const ra = fe==="inss" ? reanalisePedida(k) : null;
  if(ra && (ra.resultado==="deferido" || !ra.decidida_em)) return null;
  const d = somaDias(ra ? ra.decidida_em : k.decisao_em, 30);
  return d ? proxDiaUtilAdm(d) : null;
}
// ══════════════════════════════════════════════════════════════════════════
// F415 · A REANÁLISE DA ANÁLISE DOCUMENTAL (Portaria Conjunta MPS/INSS 54/2026, DOU de 06/11/2026, que altera a 13/2026).
// Negado o B31 por parecer técnico na análise documental (Atestmed), cabe pedir a reanálise em 10 dias da ciência, com
// documento novo, sem perder a DER (art. 8º-A); o recurso dentro desses 10 dias sem a reanálise a preclui (art. 9º, § 1º).
// Vale para a ciência a partir de 06/11/2026 (art. 2º). O CRM toma a decisao_em como a ciência, como no "Recorrer até".
// A reanálise mora em casos.ronda.reanalise = {pedida_em, decidida_em, resultado}.
// ══════════════════════════════════════════════════════════════════════════
const PC54_DESDE = "2026-11-06";
const RX_DOCUMENTAL = /an[áa]lise documental|atestmed/i;
function indefDocumental(k){
  if(!k || !k.decisao_em || k.resultado==="deferido" || !ehIncapacidade(k)) return false;
  if((k.ronda||{}).reanalise) return true;
  if(RX_DOCUMENTAL.test(k.situacao_inss||"") && /indefer|negad/i.test(k.situacao_inss||"")) return true;
  if(k.resultado!=="indeferido" && k.etapa!=="decidido") return false;
  return (D.anexos||[]).some(x=>x.caso_id===k.id && /comunica/i.test(x.nome||"") && RX_DOCUMENTAL.test(x.texto||"") && /indefer/i.test(x.texto||""));
}
const reanalisePedida = k => { const r = (k && k.ronda||{}).reanalise; return r && r.pedida_em ? r : null; };
// o último dia da reanálise, enquanto ela cabe: indeferimento documental com ciência na vigência, sem reanálise pedida
// e sem recurso protocolado depois da decisão (que a preclui)
function reanaliseAte(k){
  if(!ehPrev(k) || !indefDocumental(k) || k.decisao_em < PC54_DESDE || reanalisePedida(k)) return null;
  if([k.ro_protocolado_em, k.re_protocolado_em].some(d=>d && d >= k.decisao_em)) return null;
  return contarPrazo(k.decisao_em, PRAZOS_CATALOGO.find(x=>x.id==="reanl"), k);
}
// o recurso protocolado dentro dos 10 dias, sem a reanálise, a preclui (art. 9º, § 1º)
function reanalisePreclusa(k){
  if(!indefDocumental(k) || k.decisao_em < PC54_DESDE || reanalisePedida(k) || !k.ro_protocolado_em || k.ro_protocolado_em < k.decisao_em) return false;
  return k.ro_protocolado_em <= contarPrazo(k.decisao_em, PRAZOS_CATALOGO.find(x=>x.id==="reanl"), k);
}
async function gravarReanalise(casoId, muda){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const antes = k.ronda || null, ronda = {...(k.ronda||{}), reanalise:{...((k.ronda||{}).reanalise||{}), ...muda}};
  k.ronda = ronda;
  try{ await patchCaso(casoId, {ronda}); }catch(e){ k.ronda = antes; return aviso("Não gravou — tente de novo"); }
  repintarFicha();
  avisoDesfazer(muda.pedida_em ? "Reanálise pedida" : `Reanálise ${muda.resultado==="deferido" ? "deferida" : "mantida"}`, async ()=>{
    k.ronda = antes; await patchCaso(casoId, {ronda:antes}).catch(()=>{}); aviso("Desfeito"); repintarFicha(); });
}
function pedirReanalise(casoId){ gravarReanalise(casoId, {pedida_em:hoje()}); }
function decidirReanalise(casoId, resultado){ gravarReanalise(casoId, {decidida_em:hoje(), resultado}); }
// ══════════════════════════════════════════════════════════════════════════
// F418 · O CASO SUSPENSO POR TEMA DOS TRIBUNAIS SUPERIORES (pedido do Paulo,
// 06.11.2026). A suspensão mora em casos.ronda.suspensao = {trib, tema,
// assunto, desde, por, em}; o cartão do caso, o selo do cliente e a linha das
// listas a mostram, e o 🧹 Cuidar do acervo junta todos os suspensos por tema.
// ══════════════════════════════════════════════════════════════════════════
const TRIB_SUSP = ["STF", "STJ", "TNU", "TRF3"];
const suspensaoDe = k => k && k.fase!=="encerrado" && (k.ronda||{}).suspensao && (k.ronda.suspensao.tema || k.ronda.suspensao.trib) ? k.ronda.suspensao : null;
const rotSusp = s => `Tema ${s.tema||"?"}/${s.trib||"?"}`;
const tituloSusp = s => `suspenso pelo ${rotSusp(s)}${s.assunto ? ` (${s.assunto})` : ""}${s.desde ? ` desde ${fmtBarra(s.desde)}` : ""}`;
function suspenderCaso(casoId){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const cf = (k.ronda||{}).susp_conferir, s = suspensaoDe(k) || (cf ? {trib:cf.trib, desde:cf.data} : {});
  caixa(`<h3 style="margin:0 0 4px">Suspensão por tema <small class="meio-sub">· ${esc(tituloCaso(k))}</small></h3>
    <p class="meio-sub" style="margin:0 0 8px">O caso fica marcado no cartão, na ficha e nas listas, e entra em “Casos suspensos por tema” no 🧹 Cuidar do acervo.</p>
    <div class="form-linha" style="flex-wrap:wrap;gap:8px;align-items:center">
      <label class="meio-sub">Tribunal <select id="su-trib">${TRIB_SUSP.map(t=>`<option${(s.trib||"STJ")===t?" selected":""}>${t}</option>`).join("")}</select></label>
      <label class="meio-sub">Tema nº <input id="su-tema" inputmode="numeric" maxlength="6" size="6" value="${esc(s.tema||"")}"></label>
      <label class="meio-sub">desde <input type="date" id="su-desde" value="${esc(s.desde||hoje())}"></label></div>
    <label class="meio-sub" style="display:block;margin-top:8px">Assunto <input id="su-assunto" maxlength="120" style="width:100%" placeholder="revisão da vida toda" value="${esc(s.assunto||"")}"></label>
    <div class="form-linha" style="margin-top:10px;align-items:center;gap:8px">
      ${s.tema ? `<button class="btn-mini" onclick="retomarCaso('${casoId}')" title="Encerrar a suspensão e retomar o caso">Retomar<span class="sr-only"> o caso</span></button>` : ""}
      <button class="btn-rap" style="margin-left:auto" onclick="gravarSuspensao('${casoId}')" title="Gravar a suspensão">Gravar<span class="sr-only"> a suspensão</span></button></div>`);
  setTimeout(()=>{ const i = document.getElementById("su-tema"); if(i) i.focus(); }, 30);
}
async function gravarSuspensao(casoId){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const v = id => ((document.getElementById(id)||{}).value||"").trim();
  const tema = v("su-tema").replace(/\D/g, ""), trib = v("su-trib");
  if(!tema || !TRIB_SUSP.includes(trib)) return aviso("Informe o tribunal e o número do tema");
  const s = {trib, tema, assunto:v("su-assunto")||null, desde:v("su-desde")||hoje(), por:eu.id, em:new Date().toISOString()};
  const antes = k.ronda || null, ronda = {...(k.ronda||{}), suspensao:s};
  delete ronda.susp_conferir;
  try{ await patchCaso(casoId, {ronda}); }catch(e){ return aviso("Não gravou — tente de novo"); }
  k.ronda = ronda; fecharCaixa();
  anotarSuspensao(k, `[SUSPENSÃO] Processo ${tituloSusp(s)}.`);
  reindexarSusp(k); repintarSusp();
  avisoDesfazer(`Suspenso pelo ${rotSusp(s)}`, async ()=>{
    k.ronda = antes; await patchCaso(casoId, {ronda:antes}).catch(()=>{}); aviso("Desfeito"); reindexarSusp(k); repintarSusp(); });
}
async function retomarCaso(casoId, silencioso){
  const k = D.casoPorId.get(casoId); if(!k || !(k.ronda||{}).suspensao) return;
  const s = k.ronda.suspensao, antes = k.ronda, ronda = {...k.ronda}; delete ronda.suspensao;
  try{ await patchCaso(casoId, {ronda}); }catch(e){ if(!silencioso) aviso("Não gravou — tente de novo"); return false; }
  k.ronda = ronda;
  anotarSuspensao(k, `[SUSPENSÃO] Suspensão pelo ${rotSusp(s)} encerrada; o caso foi retomado.`);
  reindexarSusp(k);
  if(silencioso) return true;
  fecharCaixa(); repintarSusp();
  avisoDesfazer("Caso retomado", async ()=>{
    k.ronda = antes; await patchCaso(casoId, {ronda:antes}).catch(()=>{}); aviso("Desfeito"); reindexarSusp(k); repintarSusp(); });
  return true;
}
// o tema julgado retoma todos os casos dele de uma vez
async function retomarTema(trib, tema){
  const ks = (D.casos||[]).filter(k=>{ const s = suspensaoDe(k); return s && s.trib===trib && s.tema===tema; });
  if(!ks.length || !await confirmar(`Retomar os ${ks.length} caso(s) suspensos pelo Tema ${tema}/${trib}?`)) return;
  let n = 0; for(const k of ks) if(await retomarCaso(k.id, true)) n++;
  aviso(`${n} caso(s) retomado(s)`, false); render();
}
async function anotarSuspensao(k, texto){
  try{ const [and] = await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:k.id, autor_id:eu.id, texto})});
    if(and && Array.isArray(D._andsFicha) && k.cliente_id===clienteAberto) D._andsFicha.unshift(and); }catch(e){}
}
// F419 · a suspensão lida dos movimentos do PJe, do e-SAJ e do eproc (decisão do Paulo, 06.11.2026: grava
// sozinho, com desfazer). O último movimento de suspensão ou de levantamento manda: "suspenso por Recurso Especial
// Repetitivo 1124" marca o Tema 1124/STJ, "repercussão geral 1209" o STF, "(TNU - Tema - 317)" a TNU, e "Levantada a
// suspensão" retoma. A suspensão sem número de tema não grava: pede conferência no cartão (ronda.susp_conferir).
// Cada movimento manda uma vez só (ronda.susp_lida): o que a equipe corrigir depois não volta.
const RX_SUSP_LEV = /levantad[ao] a (suspens|causa suspensiva)|levantamento da suspens|dessobrest/i;
const RX_SUSP_NAO = /prazo|precat[óo]rio|efeito suspensivo|feriado|requisi[çc][ãa]o|^📎|juntada/i;
function leSuspensao(parte){
  const t = String(parte||"").trim();
  if(RX_SUSP_LEV.test(t)) return {tipo:"lev"};
  if(!/suspens|sobrest/i.test(t) || RX_SUSP_NAO.test(t)) return null;
  const tb = (/tema\s*-?\s*(STJ|STF|TNU)\b/i.exec(t)||[])[1];
  const trib = tb ? tb.toUpperCase() : /\bTNU\b/i.test(t) ? "TNU" : /repercuss/i.test(t) ? "STF" : /especial repetitivo/i.test(t) ? "STJ" : null;
  const tema = (/(?:tema\D{0,10}|repetitivo\s+|repercuss[ãa]o geral\s+(?:de n[úu]mero\s+)?)(\d{2,5})\b/i.exec(t)||[])[1];
  return tema && trib ? {tipo:"susp", trib, tema} : {tipo:"sem", trib};
}
// o levantamento mais novo encerra o que veio antes; depois dele, a suspensão com tema vale mais que a sem tema
// (o "Autos Suspensos ou Sobrestados" do 1º grau costuma só repetir a do tribunal)
function suspensaoDosMovimentos(k){
  const evs = [];
  for(const a of (D._andsFicha||[])){
    if(a.caso_id!==k.id || a.origem!=="pje") continue;
    const mv = movimentoJudicial(a.texto); if(!mv) continue;
    for(const parte of String(mv.ato).split(" · ")){
      const e = leSuspensao(parte);
      if(e) evs.push({...e, data:mv.data, id:"and:"+a.id, fonte:`${mv.fonte} de ${fmtBarra(mv.data)}`});
    }
  }
  if(!evs.length) return null;
  evs.sort((a, b)=>a.data.localeCompare(b.data));
  const iLev = evs.map(e=>e.tipo).lastIndexOf("lev"), depois = evs.slice(iLev+1);
  if(!depois.length) return evs[iLev];
  return depois.filter(e=>e.tipo==="susp").pop() || depois.pop();
}
async function adotarSuspensao(cliId){
  const feitos = [];
  for(const k of (D.casosDoCliente.get(cliId)||[])){
    if(k.fase==="encerrado" || ehPreCaso(k)) continue;
    const e = suspensaoDosMovimentos(k), r = k.ronda||{};
    if(!e || r.susp_lida===e.id) continue;
    const cur = suspensaoDe(k), ronda = {...r, susp_lida:e.id}, notas = [];
    delete ronda.susp_conferir;
    if(e.tipo==="susp" && !cur){
      ronda.suspensao = {trib:e.trib, tema:e.tema, assunto:null, desde:e.data, por:"auto", fonte:e.fonte, em:new Date().toISOString()};
      notas.push(`[SUSPENSÃO] Processo ${tituloSusp(ronda.suspensao)}, lido do movimento do ${e.fonte}.`);
    } else if(e.tipo==="lev" && cur && (!cur.desde || cur.desde <= e.data)){
      delete ronda.suspensao;
      notas.push(`[SUSPENSÃO] Suspensão pelo ${rotSusp(cur)} encerrada pelo movimento do ${e.fonte}; o caso foi retomado.`);
    } else if(e.tipo==="sem" && !cur) ronda.susp_conferir = {data:e.data, fonte:e.fonte, trib:e.trib||null};
    const antes = r;
    try{ await patchCaso(k.id, {ronda}); k.ronda = ronda; }catch(err){ console.warn("suspensão não gravou:", err); continue; }
    notas.forEach(t=>anotarSuspensao(k, t));
    if(notas.length || ronda.susp_conferir){ feitos.push({k, antes, notas:notas.length}); reindexarSusp(k); }
  }
  if(_loteSusp) _loteSusp.push(...feitos);
  const n = feitos.filter(x=>x.notas).length;
  if(feitos.length && clienteAberto===cliId){
    repintarFicha();
    if(n) avisoDesfazer(`⏸ Suspensão por tema lida do processo em ${n} caso(s)`, async ()=>{
      for(const x of feitos){ await patchCaso(x.k.id, {ronda:x.antes}).catch(()=>{}); x.k.ronda = x.antes; reindexarSusp(x.k); }
      aviso("Desfeito"); repintarFicha(); });
  }
  return feitos;
}
// a suspensão sem número de tema: o cartão pede conferência; "não" encerra o aviso, Suspender abre a janela
async function suspConferirNao(casoId){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const ronda = {...(k.ronda||{})}; delete ronda.susp_conferir;
  try{ await patchCaso(casoId, {ronda}); k.ronda = ronda; }catch(e){ return aviso("Não gravou — tente de novo"); }
  repintarSusp();
}
// o acervo de antes: a mesma leitura em todos os clientes de caso judicial aberto, com o desfazer do lote
let _loteSusp = null;
async function lerSuspensoesTodos(){
  const clis = [...new Set(D.casos.filter(k=>k.fase!=="encerrado" && !ehPreCaso(k) && (k.processo || (k.processos||[]).length)).map(k=>k.cliente_id))];
  if(!clis.length) return;
  if(clienteAberto) fecharFicha(false);
  _loteSusp = [];
  caixa(`<div class="org-lote" role="dialog" aria-labelledby="su-lote-t"><h3 id="su-lote-t">Suspensões pelos movimentos</h3>
    <p class="meio-sub" id="su-lote-st" aria-live="polite">Lendo 0 de ${clis.length} clientes…</p>
    <progress id="su-lote-pb" max="${clis.length}" value="0"></progress><div id="su-lote-res"></div></div>`);
  for(let i=0; i<clis.length; i++){
    if(!document.getElementById("su-lote-pb")) break;
    const dados = await dadosDoCliente(clis[i]);
    D._andsFicha = dados.ands; D.anexos = dados.anexos; _evCache = null;
    await adotarSuspensao(clis[i]).catch(e=>console.warn("suspensão do lote:", e));
    const pb = document.getElementById("su-lote-pb"), st = document.getElementById("su-lote-st");
    if(pb) pb.value = i+1; if(st) st.textContent = `Lendo ${i+1} de ${clis.length} clientes…`;
  }
  D._andsFicha = []; D.anexos = []; _evCache = null;
  const L = _loteSusp; _loteSusp = null;
  const st = document.getElementById("su-lote-st"), res = document.getElementById("su-lote-res");
  const susp = L.filter(x=>suspensaoDe(x.k) && !suspensaoDe({...x.k, ronda:x.antes})).length, ret = L.filter(x=>x.notas && !suspensaoDe(x.k)).length;
  const conf = L.filter(x=>(x.k.ronda||{}).susp_conferir).length;
  if(st) st.textContent = `${susp} caso(s) marcado(s) como suspensos, ${ret} retomado(s) e ${conf} a conferir no cartão do caso.`;
  if(res && L.length) res.innerHTML = `<button class="btn-mini" id="su-lote-desf" title="Desfazer o lote">Desfazer<span class="sr-only"> o lote</span></button>`;
  const b = document.getElementById("su-lote-desf");
  if(b) b.onclick = async () => { b.disabled = true;
    for(const x of L){ await patchCaso(x.k.id, {ronda:x.antes}).catch(()=>{}); x.k.ronda = x.antes; reindexarSusp(x.k); }
    if(st) st.textContent = "Desfeito."; b.remove(); };
  render();
}
async function abrirCasoSusp(cliId, casoId){ await abrirFicha(cliId); if(clienteAberto===cliId) irAoCaso(casoId); }
function reindexarSusp(k){ const c = D.cliPorId.get(k.cliente_id); if(c) reindexarCliente(c); }
function repintarSusp(){ if(clienteAberto) repintarFicha(); else if(typeof render==="function") render(); }
// o bloco do 🧹 Cuidar do acervo: um grupo por tema, com os casos e o Retomar do tema inteiro
function blocoSuspensos(){
  const grupos = new Map();
  for(const k of D.casos||[]){ const s = suspensaoDe(k); if(!s) continue;
    const ch = `${s.trib}|${s.tema}`; if(!grupos.has(ch)) grupos.set(ch, {s, ks:[]}); grupos.get(ch).ks.push(k); }
  const ler = `<button class="btn-mini" onclick="lerSuspensoesTodos()" title="Ler as suspensões e os levantamentos nos movimentos de todos os processos judiciais abertos"><span aria-hidden="true">Ler…</span><span class="sr-only">Ler as suspensões nos movimentos dos processos</span></button>`;
  // sem suspenso, uma linha só (sem .sem-acao, que é a fila do acervo e vem primeiro)
  if(!grupos.size) return `<div class="meio-sub form-linha" id="acervo-suspensos" style="align-items:center;gap:8px;margin:0 0 8px">⏸ Nenhum caso suspenso por tema. A ficha lê a suspensão nos movimentos ao abrir; para o acervo inteiro: ${ler}</div>`;
  const total = [...grupos.values()].reduce((n, g)=>n + g.ks.length, 0);
  const ord = [...grupos.values()].sort((a, b)=>b.ks.length - a.ks.length || (a.s.trib+a.s.tema).localeCompare(b.s.trib+b.s.tema));
  return `<details class="sem-acao neutro" id="acervo-suspensos"><summary>⏸ Casos suspensos por tema (${total} caso${total>1?"s":""} em ${grupos.size} tema${grupos.size>1?"s":""})</summary>
    <div class="form-linha" style="margin:6px 0">${ler}</div>
    ${ord.map(({s, ks})=>`<div class="susp-grupo">
      <div class="susp-cab"><b>${esc(rotSusp(s))}</b>${s.assunto ? ` <span class="meio-sub">${esc(s.assunto)}</span>` : ""} <span class="meio-sub">· ${ks.length} caso${ks.length>1?"s":""}</span>
        <button class="btn-mini" style="margin-left:auto" onclick="retomarTema('${escJs(s.trib)}','${escJs(s.tema)}')" title="Tema julgado: retomar todos os casos dele">Retomar<span class="sr-only"> todos os casos do tema</span></button></div>
      ${ks.map(k=>{ const c = D.cliPorId.get(k.cliente_id), sk = suspensaoDe(k);
        return `<div class="man-item"><button class="man-nome" onclick="abrirCasoSusp('${k.cliente_id}','${k.id}')">${esc(c ? c.nome : "cliente")}</button>
          <span class="meio-sub">${esc(tituloCaso(k))} · ${esc(NOME_FASE[k.fase]||k.fase||"")}${sk.desde ? ` · desde ${esc(fmtBarra(sk.desde))}` : ""}</span></div>`; }).join("")}
    </div>`).join("")}</details>`;
}
// ══════════════════════════════════════════════════════════════════════════
// F236 · O QUE AS DECISÕES DIZEM DE PRAZO. Leitores puros do que a ficha já
// carregou (andamentos, documentos com texto, prazos dos tribunais): o ato
// favorável não pede recurso nosso; o prazo do tribunal vale mais que o do
// catálogo; a DCB e a ordem com prazo que a decisão fixou viram datas do caso.
// ══════════════════════════════════════════════════════════════════════════
// a ciência tácita da intimação eletrônica: 10 dias corridos do envio, e o dia sem expediente passa ao seguinte
// (Lei 11.419/2006, art. 5º, § 3º)
const cienciaTacita = iso => { let d = somaDias(iso, 10); while(d && !ehDiaUtil(d)) d = somaDias(d, 1); return d; };
// o ato favorável ao cliente (o escritório é do autor ou do impetrante): liminar ou tutela deferida, segurança
// concedida, procedência total. O texto do movimento basta; o movimento genérico ("Sentença", "Decisão") se lê pelo
// dispositivo do documento que veio com ele.
const RX_FAV_ATO = /concedida a (medida )?liminar|liminar (deferida|concedida)|deferida a (medida )?liminar|concedida a (antecipa[çc][ãa]o de )?tutela|tutela (de urg[êe]ncia )?(deferida|concedida)|julgad[oa] procedente|concedida a seguran[çc]a|seguran[çc]a concedida/i;
const RX_FAV_NAO = /n[ãa]o[- ]concedida|indeferid|parcialmente|em parte|improcedente|revogad|cassad/i;
function atoFavoravel(a){
  if(!a || a.origem!=="pje") return null;
  const mv = movimentoJudicial(a.texto); if(!mv) return null;
  const tipoDe = t => /liminar/i.test(t) ? "liminar" : /tutela/i.test(t) ? "tutela" : /seguran/i.test(t) ? "segurança" : "sentença";
  let tipo = RX_FAV_ATO.test(mv.ato) && !RX_FAV_NAO.test(mv.ato) ? tipoDe(mv.ato) : "";
  if(!tipo) for(const x of (D.anexos||[])){
    if(x.andamento_id!==a.id || !x.texto || !/senten|decis/i.test(x.nome||"")) continue;
    const d = dsa(dispositivoDe(x.texto));
    if(/julgo procedente|defiro a (medida )?liminar|concedo a (medida )?liminar|concedo a seguranca|(defiro|concedo) a tutela/.test(d)
       && !/parcialmente procedente|procedente em parte|improcedente|indefiro a|nao concedo/.test(d)){ tipo = tipoDe(d); break; }
  }
  if(!tipo) return null;
  return tipo==="sentença"
    ? {tipo, txt:"sentença procedente", passo:"Sentença procedente: sem recurso nosso. Conferir a implantação e vigiar o recurso do INSS."}
    : {tipo, txt:`${tipo} ${tipo==="segurança"?"concedida":"deferida"}`, passo:`${tipo==="liminar"?"Liminar deferida":tipo==="tutela"?"Tutela deferida":"Segurança concedida"}: sem providência nossa. Conferir o cumprimento pelo INSS; quem pode recorrer é o INSS.`};
}
// o prazo que o tribunal deu ao ato do cartão: o expediente ligado ao documento do movimento (ato_id) ou, para o ato
// que pede resposta (laudo, sentença…), o expediente do mesmo processo expedido até 7 dias depois do movimento
function prazoTribunalDoAto(a, mv, porData){
  const k = D.casoPorId.get(a.caso_id); if(!k || !(k.prazos_tribunal||[]).length || !mv) return null;
  const dig = soDig(mv.numero), ps = k.prazos_tribunal.filter(p=>!dig || soDig(p.numero)===dig);
  const docs = (D.anexos||[]).filter(x=>x.andamento_id===a.id).map(x=>String(x.caminho||"").split("/").pop());
  return ps.find(p=>p.ato_id && docs.includes(String(p.ato_id)))
    || (porData ? ps.filter(p=>p.expedido_em && p.expedido_em>=mv.data && p.expedido_em<=somaDias(mv.data, 7))
        .sort((x,y)=>String(x.expedido_em).localeCompare(String(y.expedido_em)))[0] : null) || null;
}
// o prazo do tribunal cujo ato intimado é favorável: ciência, sem providência nossa
function atoFavoravelDoPrazo(k, p){
  if(!p || !p.ato_id) return null;
  const an = (D.anexos||[]).find(x=>x.caso_id===k.id && x.andamento_id && String(x.caminho||"").split("/").pop()===String(p.ato_id));
  return an ? atoFavoravel((D._andsFicha||[]).find(y=>y.id===an.andamento_id)) : null;
}
// a sugestão do cartão com o que o tribunal e o próprio ato dizem
function sugestaoDoAto(a){
  const sg = proximoPassoDoMovimento(a.texto), mv = movimentoJudicial(a.texto);
  const p = mv ? prazoTribunalDoAto(a, mv, !!sg) : null;
  const fav = mv ? atoFavoravel(a) : null;
  if(!sg && !(p && p.fim) && !fav) return null;
  const out = sg ? {...sg} : {de:mv.data, cat:null, passo:"", prazo:null};
  if(fav){
    Object.assign(out, {favoravel:true, cat:null, prazo:null, passo:fav.passo, trib:p});
    // o INSS recorre da sentença em 10 dias úteis no JEF, sem prazo em dobro (Lei 10.259/2001, art. 9º; Lei 9.099/1995,
    // arts. 42 e 12-A), e em 15 dias úteis em dobro no rito comum (CPC, arts. 1.003, § 5º, e 183), da ciência tácita dele
    if(fav.tipo==="sentença") out.vigia = contarPrazo(cienciaTacita(mv.data), {n: mv.jef ? 10 : 30, uteis:true}, D.casoPorId.get(a.caso_id));
    return out;
  }
  if(p && p.fim){ out.trib = p; out.prazo = p.fim; out.de = p.ciencia_em || out.de; }
  return out;
}
// a resposta já foi dada depois do movimento (a equipe anotou a peça protocolada), ou a equipe decidiu não recorrer
const RX_RESPONDIDO = /(manifesta[çc][ãa]o|impugna[çc][ãa]o|recurso|contrarraz[õo]es|r[ée]plica|embargos|peti[çc][ãa]o|apela[çc][ãa]o|quesitos)[^.\n]{0,80}(protocolad|juntad|apresentad)|(protocol|junt|apresent)(ei|amos)\b/i;
const notasDepois = (a, mv) => (D._andsFicha||[]).filter(y=>y.caso_id===a.caso_id && y.id!==a.id && !y.excluir
  && (y.origem==="app" || y.origem==="todo") && dataSP(y.criado_em)>=mv.data);
// F236 · a resposta é AFIRMADA: a pergunta ("apresentamos quesitos complementares?") e o plano ("vamos protocolar") não
// contam (a pergunta calava a sugestão do prazo do ato ordinatório)
const RX_RESPOSTA_NAO = /\b(vamos|vou|iremos|vai|precisa(mos)?|preciso|devemos|deve|favor|pode(mos)?|ainda nao|falta)\b/;
const respondeu = (t, peca) => String(t||"").split(/(?<=[.;!?\n])\s*/).some(f=>RX_RESPONDIDO.test(f) && !/\?/.test(f)
  && !RX_RESPOSTA_NAO.test(dsa(f)) && (!peca || peca.test(f)));
const respondidoDepois = (a, mv) => notasDepois(a, mv).some(y=>respondeu(y.texto));
// F236 · o prazo do tribunal já respondido: a equipe anotou a peça PROTOCOLADA (ou juntada) depois da ciência e dentro do
// prazo, e a peça é a do ato (da sentença e do acórdão, o recurso; dos demais, a manifestação, a impugnação, a petição,
// os quesitos). Sai dos pendentes no quadro, na agenda e no calendário, e fica como registro; sem a anotação, nada muda
function respostaAoPrazo(k, p){
  const desde = p && (p.ciencia_em || p.expedido_em);
  if(!k || !desde || !p.fim || p.situacao==="findo") return null;
  const peca = /senten|ac[óo]rd/i.test(p.ato||"") ? /recurs|apela|embargo/i
    : /manifesta|impugna|peti[çc]|quesit|contrarraz|r[ée]plica|recurs|embargo|resposta|cumpri/i;
  const a = (notasDoCaso(k.id)||[]).filter(a=>!a.excluir && (a.origem==="app" || a.origem==="todo")
    && dataSP(a.criado_em)>=desde && dataSP(a.criado_em)<=p.fim).find(a=>respondeu(a.texto, peca));
  if(!a) return null;
  const co = D.colPorId.get(a.autor_id);
  return {em: dataSP(a.criado_em), quem: co ? co.nome.split(" ")[0] : ""};
}
const naoRecorrer = (a, mv) => notasDepois(a, mv).some(y=>/n[ãa]o (vamos )?recorr|sem recurso nosso|n[ãa]o h[áa] interesse (em|de) recorrer/i.test(y.texto||""));
// a DCB que a decisão fixou: a sentença, o acórdão (o resumo do CRPS), a carta de concessão e o comentário do INSS
const RX_DCB_TXT = /(?:data d[ae] cessa[çc][ãa]o(?: do benef[íi]cio)?(?:\s*\(DCB\))?|DCB(?: fixada)?)\s*(?:em|para|:)?\s*(\d{2})[\/.](\d{2})[\/.](\d{4})/i;
function dcbDosAutos(k){
  const achados = [];
  // a DCB que a decisão FIXA é posterior a ela; a data anterior citada no texto é a cessação discutida, e não vale
  const ver = (texto, data, fonte, id) => { const m = RX_DCB_TXT.exec(String(texto||"").replace(/\s+/g," ")), dcb = m && `${m[3]}-${m[2]}-${m[1]}`;
    if(dcb && data && dcb > data) achados.push({dcb, data, fonte, id}); };
  for(const x of (D.anexos||[])){
    if(x.caso_id!==k.id || !x.texto || !/senten|ac[óo]rd|decis|carta de concess|comunica/i.test(x.nome||"")) continue;
    const quem = /senten/i.test(x.nome) ? "na sentença" : /ac[óo]rd/i.test(x.nome) ? "no acórdão" : /carta/i.test(x.nome) ? "na carta de concessão" : /comunica/i.test(x.nome) ? "na comunicação do INSS" : "na decisão";
    const a = x.andamento_id && (D._andsFicha||[]).find(y=>y.id===x.andamento_id), mv = a && movimentoJudicial(a.texto), d = (mv && mv.data) || dataSP(x.criado_em);
    ver(x.texto, d, `${quem} de ${fmt(d)}`, "anexo:"+x.id);
  }
  for(const b of crpsBlocos(k)) for(const e of (b.eventos||[])) for(const a of (e.arquivos||[]))
    if(a.resumo && (a.resumo.linhas||[]).length){ const d = isoCrps(e.data); ver(a.resumo.linhas.join(" "), d, `no acórdão de ${fmt(d)}`, `crps:${a.id||a.nome}`); }
  for(const a of (D._andsFicha||[])) if(a.caso_id===k.id && a.origem==="pat"){ const d = dataSP(a.criado_em); ver(a.texto, d, `no comentário do INSS de ${fmt(d)}`, "and:"+a.id); }
  return achados.sort((a,b)=>String(b.data).localeCompare(String(a.data)))[0] || null;
}
// F236 · a DCB que a decisão fixou vira a DCB do caso, com a fonte, para nascer o lembrete da prorrogação. Grava uma
// vez por fonte (ronda.dcb_lida): corrigida a DCB depois, a mesma fonte não volta a mandar. A DCB do caso mais nova
// que a decisão (a da prorrogação, a que a equipe corrigiu) vale mais que a lida.
async function adotarDcbDosAutos(cliId){
  let n = 0;
  for(const k of (D.casosDoCliente.get(cliId)||[])){
    if(k.fase==="encerrado" || !ehIncap(k)) continue;
    const a = dcbDosAutos(k); if(!a || a.dcb===k.dcb) continue;
    const lida = (k.ronda||{}).dcb_lida; if(lida && lida.id===a.id) continue;
    if(k.dcb && !(a.dcb > k.dcb && k.dcb <= a.data)) continue;
    const corpo = {dcb:a.dcb, dcb_prorrogacao_pedida:false, dcb_prorrogar_em:null,
      ronda:{...(k.ronda||{}), dcb_lida:{id:a.id, dcb:a.dcb, fonte:a.fonte, antes:k.dcb||null, em:hoje()}}};
    try{ await patchCaso(k.id, corpo); Object.assign(k, corpo); n++; }catch(e){ console.warn("DCB dos autos não gravou:", e); }
  }
  if(n && clienteAberto===cliId){ aviso("🩸 DCB lida da decisão e gravada no caso: o lembrete da prorrogação já está nos prazos", false); repintarFicha(); }
}
// ══ F321 · O QUADRO DO BENEFÍCIO PELOS DOCUMENTOS (onda 1, decisão do Paulo, 31.10.2026) ══
// O campo vazio da placa (NB, espécie, DER, DIB, DCB) se preenche sozinho pelo
// documento oficial, com a fonte em casos.ronda.fontes; o que difere do valor já
// gravado não troca nada e vira sugestão (ronda.sugere), com Aceitar e Manter.
// Fontes: o NB pela evidência dos documentos do número (F221), e a carta de
// concessão e o CNIS do dossiê, casados pelo NB do caso. A DCB da decisão segue
// em adotarDcbDosAutos.
const CAMPOS_QUADRO = ["nb","especie","der","dib","dcb"];
const espDoCnis = e => /^\d{1,2}$/.test(String(e||"")) ? "B"+String(e).padStart(2,"0") : "";
function candidatosDoQuadro(k, ks, f){
  const c = {}, por = (campo, v, fonte) => { if(v && !c[campo]) c[campo] = {v, fonte}; };
  // o NB: cada número do caso que aponta, com folga, o mesmo NB, e NB que não é de outro caso aberto
  const nums = numerosDoCaso(k), ev = evidenciaNbs(ks), achados = new Set();
  for(const tipo of Object.keys(nums)) for(const d of nums[tipo]){ const r = nbDoNumero(ev, tipo, d); if(r && r.conf==="alta") achados.add(r.nb); }
  const outros = new Set(ks.filter(x=>x!==k).flatMap(x=>nbsDoCaso(x).map(soDig)));
  if(achados.size===1){ const nb = [...achados][0]; if(!outros.has(soDig(nb))) por("nb", soDig(nb), "documentos do processo"); }
  const nbs = new Set([...nbsDoCaso(k), k.nb || (c.nb||{}).v].filter(Boolean).map(soDig));
  const j = datasDosJulgados(k);   // F321b · depois da carta e do CNIS, que falam do benefício implantado
  if(!nbs.size){ for(const campo of ["der","dib"]) if(j[campo]) por(campo, j[campo].v, j[campo].fonte); return c; }
  const meu = nb => nbs.has(soDig(nb));
  const carta = (f.cartas||[]).find(x=>meu(x.nb));
  if(carta){ por("der", isoBr(carta.der), "carta de concessão"); por("dib", isoBr(carta.dib), "carta de concessão"); }
  const b = beneficiosDoCnis(cnisDe(D.cliPorId.get(k.cliente_id)||{})).find(x=>meu(x.nb));
  if(b){ por("especie", espDoCnis(b.especie), "CNIS"); por("dib", b.de, "CNIS");
    if(!b.ativo && /^(31|91)$/.test(b.especie)) por("dcb", b.ate, "CNIS"); }
  for(const campo of ["der","dib"]) if(j[campo]) por(campo, j[campo].v, j[campo].fonte);
  // a DCB do laudo e da comunicação do dossiê fica no clique do Mapa e da Análise de Direito, que grava o andamento da origem
  return c;
}
// F321b (onda 2) · só a forma rotulada: "DER: 9/5/2017", "D.E.R. 22.11.2010", "em 6 de março de 2015 (DER)",
// "requerimento administrativo (27/06/2017)", "DIB: 09/05/2017". Datas diferentes no mesmo papel: nada (pode ser
// a reafirmação, ou a DER de outro pedido citado).
const _MES_JULG = {janeiro:1,fevereiro:2,"março":3,marco:3,abril:4,maio:5,junho:6,julho:7,agosto:8,setembro:9,outubro:10,novembro:11,dezembro:12};
const _DT_JULG = String.raw`(\d{1,2}[\/.]\d{1,2}[\/.](?:19|20)\d{2}|\d{1,2}º? de (?:janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro) de (?:19|20)\d{2})`;
const RX_JULG = {
  der: [new RegExp(String.raw`\b(?:DER|D\.E\.R\.?)\s*(?:[:\-–]|em|,)?\s*` + _DT_JULG, "g"),
        new RegExp(_DT_JULG + String.raw`\s*\(\s*DER\s*\)`, "g"),
        new RegExp(String.raw`requerimento administrativo\s*(?:\(|em\s+|,\s*)(?:NB[^)]{0,20}?,?\s*)?` + _DT_JULG, "gi")],
  dib: [new RegExp(String.raw`\bDIB\s*(?:[:\-–]|em)?\s*` + _DT_JULG, "g")],
};
function dataDoJulgado(t){
  let m = /^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/.exec(t);
  if(!m){ const x = /^(\d{1,2})º? de (\S+) de (\d{4})$/i.exec(t); if(!x) return null; m = [0, x[1], _MES_JULG[x[2].toLowerCase()], x[3]]; }
  const d = +m[1], mes = +m[2]; if(!mes || mes>12 || d<1 || d>31) return null;
  return `${m[3]}-${String(mes).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}
function lerDatasDoJulgado(texto){
  const t = String(texto||"").replace(/\s+/g," "), out = {};
  for(const campo of Object.keys(RX_JULG)){
    const vs = new Set();
    for(const rx of RX_JULG[campo]) for(const m of t.matchAll(rx)){ const v = dataDoJulgado(m[1]); if(v) vs.add(v); }
    if(vs.size===1) out[campo] = [...vs][0];
  }
  return out;
}
function datasDosJulgados(k){
  const docs = [];
  for(const x of (D.anexos||[])){
    if(x.caso_id!==k.id || !x.texto) continue;
    const ini = /inicial/i.test(x.nome||""), jul = /senten|ac[óo]rd/i.test(x.nome||"");
    if(!ini && !jul) continue;
    const a = x.andamento_id && (D._andsFicha||[]).find(y=>y.id===x.andamento_id), mv = a && movimentoJudicial(a.texto);
    const d = (mv && mv.data) || dataSP(x.criado_em), r = lerDatasDoJulgado(x.texto);
    if(ini) delete r.dib;   // a DIB da inicial é a pedida, e não a concedida
    const quem = ini ? "petição inicial" : /senten/i.test(x.nome) ? "sentença" : "acórdão";
    docs.push({d, ini, r, fonte:`${quem} de ${fmt(d)}`});
  }
  // o julgado mais novo manda; a inicial fica por último
  docs.sort((a,b)=>(a.ini-b.ini) || String(b.d).localeCompare(String(a.d)));
  const out = {};
  for(const x of docs) for(const campo of ["der","dib"]) if(x.r[campo] && !out[campo] && x.r[campo] <= (x.d||"9999")) out[campo] = {v:x.r[campo], fonte:x.fonte};
  return out;
}
// F530 · os "⏳ Prazo:" do assistente deixaram de virar prazo (decisão do Paulo de 11.11.2026)
async function adotarQuadro(cliId){
  const ks = (D.casosDoCliente.get(cliId)||[]).filter(k=>k.fase!=="encerrado" && !ehPreCaso(k));
  if(!ks.length) return 0;
  const f = fontesDoDossie(cliId), feitos = [];
  for(const k of ks){
    const r = k.ronda||{}, recusou = r.recusou||{}, fontes = {...(r.fontes||{})}, sugere = {...(r.sugere||{})}, corpo = {};
    for(const [campo, x] of Object.entries(candidatosDoQuadro(k, ks, f))){
      if(!k[campo]){ corpo[campo] = x.v; fontes[campo] = {...x, em:hoje()}; delete sugere[campo]; }
      else if(String(k[campo])!==String(x.v) && recusou[campo]!==x.v && !(sugere[campo] && sugere[campo].v===x.v)) sugere[campo] = x;
    }
    if(corpo.dcb){ corpo.dcb_prorrogacao_pedida = false; corpo.dcb_prorrogar_em = null; }
    const mudouSug = JSON.stringify(sugere)!==JSON.stringify(r.sugere||{});
    if(!Object.keys(corpo).length && !mudouSug) continue;
    const antes = Object.fromEntries([...Object.keys(corpo), "ronda"].map(c=>[c, k[c]===undefined ? null : k[c]]));
    corpo.ronda = {...r, fontes, sugere};
    try{ await patchCaso(k.id, corpo); Object.assign(k, corpo); feitos.push({k, antes, n:Object.keys(corpo).length-1}); }
    catch(e){ console.warn("quadro não gravou:", e); }
  }
  const n = feitos.reduce((t, x)=>t+x.n, 0);
  if(_loteQuadro) _loteQuadro.feitos.push(...feitos);
  if(n && clienteAberto===cliId){
    repintarFicha();
    avisoDesfazer(`${n} dado(s) do quadro do caso lido(s) dos documentos`, async ()=>{
      for(const x of feitos){ await patchCaso(x.k.id, x.antes).catch(()=>{}); Object.assign(x.k, x.antes); }
      aviso("Desfeito"); repintarFicha();
    });
  }
}
// F321c (onda 4) · o mesmo preenchimento em todos os clientes de caso aberto, no 🧹 Cuidar do acervo: lê os
// documentos de cada um (dadosDoCliente), grava o campo vazio e a sugestão como na ficha, e o desfazer volta tudo
let _loteQuadro = null;
function blocoQuadrosLote(){
  const n = new Set(D.casos.filter(k=>k.fase!=="encerrado" && !ehPreCaso(k)).map(k=>k.cliente_id)).size;
  if(!n) return "";
  return `<details class="sem-acao neutro" id="acervo-quadros"><summary>Quadro do benefício pelos documentos (${n} clientes com caso aberto)</summary>
    <p class="meio-sub" style="margin:8px 0 4px">Lê a carta de concessão, o CNIS, a sentença, o acórdão, a inicial e o NB dos documentos de cada cliente e grava a DER, a DIB, a DCB, o NB e a espécie que estiverem vazios, com a fonte. O valor diferente do gravado vira sugestão na placa do caso.</p>
    <div class="form-linha" style="margin:4px 0 8px"><button class="btn-mini forte" onclick="preencherQuadrosTodos()" title="Preencher os quadros pelos documentos…"><span aria-hidden="true">Preencher…</span><span class="sr-only">Preencher os quadros pelos documentos…</span></button></div></details>`;
}
async function preencherQuadrosTodos(){
  const clis = [...new Set(D.casos.filter(k=>k.fase!=="encerrado" && !ehPreCaso(k)).map(k=>k.cliente_id))];
  if(!clis.length) return;
  if(clienteAberto) fecharFicha(false);
  _loteQuadro = {feitos:[]};
  caixa(`<div class="org-lote" role="dialog" aria-labelledby="qd-lote-t"><h3 id="qd-lote-t">Quadro do benefício pelos documentos</h3>
    <p class="meio-sub" id="qd-lote-st" aria-live="polite">Lendo 0 de ${clis.length} clientes…</p>
    <progress id="qd-lote-pb" max="${clis.length}" value="0"></progress><div id="qd-lote-res"></div></div>`);
  for(let i=0; i<clis.length; i++){
    if(!document.getElementById("qd-lote-pb")) break;   // fechou a janela: para
    const dados = await dadosDoCliente(clis[i]);
    D._andsFicha = dados.ands; D.anexos = dados.anexos; _evCache = null;
    await adotarDcbDosAutos(clis[i]).catch(()=>{});
    await adotarQuadro(clis[i]).catch(e=>console.warn("quadro do lote:", e));
    const pb = document.getElementById("qd-lote-pb"), st = document.getElementById("qd-lote-st");
    if(pb) pb.value = i+1;
    if(st) st.textContent = `Lendo ${i+1} de ${clis.length} clientes…`;
  }
  D._andsFicha = []; D.anexos = []; _evCache = null;
  const L = _loteQuadro; _loteQuadro = null;
  const campos = L.feitos.reduce((t, x)=>t+x.n, 0), sug = D.casos.filter(k=>Object.keys((k.ronda||{}).sugere||{}).length).length;
  const st = document.getElementById("qd-lote-st"), res = document.getElementById("qd-lote-res");
  if(st) st.textContent = `${campos} dado(s) gravado(s) em ${L.feitos.filter(x=>x.n).length} caso(s). ${sug} caso(s) com sugestão a conferir na placa.`;
  if(res && L.feitos.length) res.innerHTML = `<button class="btn-mini" id="qd-lote-desf" title="Desfazer o lote">Desfazer<span class="sr-only"> o lote</span></button>`;
  const b = document.getElementById("qd-lote-desf");
  if(b) b.onclick = async () => { b.disabled = true;
    for(const x of L.feitos){ await patchCaso(x.k.id, x.antes).catch(()=>{}); Object.assign(x.k, x.antes); }
    if(st) st.textContent = "Desfeito."; b.remove(); };
}
const valQuadro = (campo, v) => !v ? "" : FATOS[campo] && FATOS[campo].tipo==="data" ? fmtBarra(v) : campo==="nb" ? fmtNb(v) : String(v);
// de onde veio o valor que está no campo, para o title da placa
const fonteQuadro = (k, campo) => { const x = ((k.ronda||{}).fontes||{})[campo]; return x && String(x.v)===String(k[campo]) ? ` · lido de: ${x.fonte}` : ""; };
function avisoQuadro(k){
  return Object.entries((k.ronda||{}).sugere||{}).filter(([c])=>FATOS[c]).map(([c, x])=>`<span class="lc-f lc-etapa-aviso lc-sug-q"><span class="et-sug">${
    x.v ? `${esc(FATOS[c].rot)} ${esc(valQuadro(c, x.v))}, pela ${esc(x.fonte)} (no caso: ${esc(valQuadro(c, k[c]))})`
        : `${esc(FATOS[c].rot)} ${esc(valQuadro(c, k[c]))}: ${esc(x.motivo||"a conferir")}`}
    <button type="button" class="btn-mini" onclick="quadroSugestao('${k.id}','${c}',1)">${x.v ? "Aceitar" : "Apagar"}</button>
    <button type="button" class="btn-mini" onclick="quadroSugestao('${k.id}','${c}',0)">Manter</button></span></span>`).join("");
}
async function quadroSugestao(casoId, campo, aceita){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const r = k.ronda||{}, x = (r.sugere||{})[campo]; if(!x) return;
  const sugere = {...r.sugere}; delete sugere[campo];
  const corpo = {ronda:{...r, sugere, recusou:{...(r.recusou||{}), ...(aceita ? {} : {[campo]: x.v||""})},
    fontes:{...(r.fontes||{}), ...(aceita && x.v ? {[campo]:{...x, em:hoje()}} : {})}}};
  if(aceita) corpo[campo] = x.v || null;
  const antes = Object.fromEntries(Object.keys(corpo).map(c=>[c, k[c]===undefined ? null : k[c]]));
  try{ await patchCaso(casoId, corpo); }catch(e){ return aviso("Não gravou — tente de novo"); }
  Object.assign(k, corpo); repintarFicha();
  avisoDesfazer(aceita ? `${FATOS[campo].rot} ${x.v ? "trocada" : "apagada"}` : `${FATOS[campo].rot} mantida`, async ()=>{
    await patchCaso(casoId, antes).catch(()=>{}); Object.assign(k, antes); aviso("Desfeito"); repintarFicha(); });
}
// F236 · a ordem ao INSS com prazo, lida da decisão: "implante o benefício no prazo de 30 (trinta) dias úteis, a contar
// da intimação" (tutela), "conclua a análise … no prazo de 30 (trinta) dias, contados da notificação" (liminar no MS).
// Conta da notificação certificada nos autos ou, sem ela, da ciência tácita do INSS; os dias corridos, conservadores,
// param no dia útil anterior. Some quando o INSS cumpre (o PAT conclui, a equipe anota a implantação).
const RX_ORDEM = /(implant\w*|restabele\w*|reativ\w*|conclu\w* a an[áa]lise|analise o (?:requerimento|pedido)|decida o (?:requerimento|pedido)|prof\w+ decis[ãa]o)[^.;]{0,200}?no prazo de (\d{1,3})\s*(?:\([^)]*\)\s*)?dias(\s+[úu]teis)?([^.;]{0,90})/i;
function ordemAoInss(k){
  let m0 = null;
  for(const x of (D.anexos||[])){
    if(x.caso_id!==k.id || !x.texto || !/senten|decis|ac[óo]rd/i.test(x.nome||"")) continue;
    const t = String(x.texto).replace(/\s+/g," "), m = RX_ORDEM.exec(t); if(!m) continue;
    const a = x.andamento_id && (D._andsFicha||[]).find(y=>y.id===x.andamento_id), mv = a && movimentoJudicial(a.texto);
    if(a && !atoFavoravel(a)) continue;
    const de = (mv && mv.data) || dataSP(x.criado_em);
    if(!m0 || de > m0.de) m0 = {de, n:+m[2], uteis:!!m[3], verbo:dsa(m[1]), resto:m[4]||"", nome:x.nome};
  }
  if(!m0) return null;
  const depois = (D._andsFicha||[]).filter(y=>y.caso_id===k.id && dataSP(y.criado_em)>=m0.de);
  if(depois.some(y=>(y.origem==="pat" && /conclu/i.test(dsa(y.origem_id||""))) || /implantad[oa]|implantou|reativad[oa]|reativou|cumpriu a (liminar|tutela|decis)/i.test(y.texto||""))) return null;
  let base = null, baseTxt = "";
  if(/notifica/i.test(m0.resto)){
    for(const y of (D.anexos||[]).filter(y=>y.caso_id===k.id && y.texto && /certid/i.test(y.nome||"") && dataSP(y.criado_em)>=m0.de)){
      const t = String(y.texto).replace(/\s+/g," ");
      if(!/notifiq|notificad|intimad/i.test(t)) continue;
      const d = /(\d{2})\/(\d{2})\/(\d{4})/.exec(t); if(d){ base = `${d[3]}-${d[2]}-${d[1]}`; baseTxt = `da notificação de ${fmt(base)}, certificada nos autos`; break; }
    }
  }
  if(!base){ base = cienciaTacita(m0.de); baseTxt = `da ciência tácita do INSS, estimada em ${fmt(base)} (10 dias corridos da expedição, Lei 11.419/2006, art. 5º, § 3º)`; }
  let data;
  if(m0.uteis) data = contarPrazo(base, {n:m0.n, uteis:true}, k);
  else { data = somaDias(base, m0.n); while(!ehDiaUtil(data)) data = somaDias(data, -1); }
  const implanta = /implant|restabele|reativ/.test(m0.verbo);
  return {data, rotulo: implanta ? "Implantação (tutela)" : "Ordem ao INSS (liminar)", curto: implanta ? "Conferir a implantação" : "INSS decide (liminar)",
    resumo:`${m0.n} dias${m0.uteis?" úteis":""} ${/notifica/i.test(baseTxt)?"da notificação":"da ciência tácita"}`,
    rot:`<b>${implanta ? `Conferir a implantação no Meu INSS até ${fmt(data)}` : `O INSS deve concluir a análise até ${fmt(data)}`}</b>
      <small class="qd-de">${m0.n} dias${m0.uteis?" úteis":" corridos (contagem conservadora: no dia útil anterior)"} ${baseTxt}, pela ordem ${/senten/i.test(m0.nome)?"da sentença":"da decisão"} de ${fmt(m0.de)}. Sem cumprimento, peticionar pela multa · ${esc(tituloCaso(k))}</small>`};
}
// F236 · o prazo da outra parte que pede vigia: o recurso do INSS contra a sentença favorável
function vigiaRecursoInss(k){
  if(faseEfetiva(k)!=="judicial") return null;
  const movs = (D._andsFicha||[]).filter(a=>a.caso_id===k.id && a.origem==="pje").map(a=>({a, mv:movimentoJudicial(a.texto)})).filter(x=>x.mv);
  const s = movs.filter(x=>/senten|julgad/.test(dsa(x.mv.ato)) && !/cumprimento|execu|conclus/.test(dsa(x.mv.ato)) && atoFavoravel(x.a))
    .sort((p,q)=>q.mv.data.localeCompare(p.mv.data))[0];
  if(!s) return null;
  // o recurso já veio, ou o processo andou (trânsito, baixa): nada a vigiar
  if(movs.some(x=>x.a!==s.a && x.mv.data>=s.mv.data && /recurso|apela|transit|baixa definitiva/.test(dsa(x.mv.ato)))) return null;
  const tac = cienciaTacita(s.mv.data);
  return {ate:contarPrazo(tac, {n: s.mv.jef ? 10 : 30, uteis:true}, k), tac, jef:s.mv.jef, de:s.mv.data};
}
// F236 · citado o INSS, a contestação dele vem em N dias úteis da ciência tácita: no JEF sem prazo em dobro (Lei
// 10.259/2001, art. 9º), fora dele em dobro (CPC, art. 183). O N é o do despacho; sem ele, nada se estima.
function contestacaoInss(k){
  if(faseEfetiva(k)!=="judicial") return null;
  const movs = (D._andsFicha||[]).filter(a=>a.caso_id===k.id && a.origem==="pje").map(a=>({a, mv:movimentoJudicial(a.texto)})).filter(x=>x.mv);
  const cit = movs.filter(x=>/citacao/.test(dsa(x.mv.ato)) && /expedid|certificad/.test(dsa(x.mv.ato))).sort((p,q)=>q.mv.data.localeCompare(p.mv.data))[0];
  if(!cit || movs.some(x=>x.mv.data>=cit.mv.data && /contesta/.test(dsa(x.mv.ato)))) return null;
  const m = (D.anexos||[]).filter(x=>x.caso_id===k.id && x.texto && /despach|decis/i.test(x.nome||""))
    .map(x=>/contesta[çc][ãa]o[^.]{0,80}?no prazo de (\d{1,3})/i.exec(String(x.texto).replace(/\s+/g," "))).find(Boolean);
  if(!m) return null;
  const tac = cienciaTacita(cit.mv.data), n = +m[1];
  return {ate:contarPrazo(tac, {n: cit.mv.jef ? n : n*2, uteis:true}, k), tac, n, jef:cit.mv.jef, de:cit.mv.data};
}
// F236 · o pedido deferido no INSS, pela situação do PAT ("Concluída - Deferida") ou pelo resultado gravado: a data
function concessaoNoInss(k){
  if(!["inss","pagamento"].includes(faseEfetiva(k)) || !/^B\d/i.test(k.especie||"")) return null;
  const a = (D._andsFicha||[]).filter(y=>y.caso_id===k.id && y.origem==="pat" && /^situacao:.*conclu[íi]da\s*-\s*deferid/i.test(dsa(y.origem_id||"")))
    .sort((p,q)=>String(q.criado_em).localeCompare(String(p.criado_em)))[0];
  return a ? dataSP(a.criado_em) : (k.resultado==="deferido" && k.decisao_em ? k.decisao_em : null);
}
// F236 · o pedido do checklist (tabela tarefas) dado por feito ou recebido direto da linha do prazo
async function concluirTarefaSolta(id){
  const t = (D.tarefas||[]).find(x=>x.id===id); if(!t) return;
  const em = new Date().toISOString();
  try{ await api(`/rest/v1/tarefas?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({concluida:true, concluida_em:em})}); }
  catch(e){ return aviso("Não gravou — tente de novo"); }
  t.concluida = true; t.concluida_em = em; fecharCaixa(); plim(); repintarFicha();
}
// F236 · o pedido de prorrogação do prazo da exigência por igual período (IN 128/2022, art. 566, § 2º), pronto para colar
async function copiarPedidoProrrogacaoExig(casoId){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const c = D.cliPorId.get(k.cliente_id)||{}, prot = (k.protocolos||[])[0];
  await copiar(`${c.nome||"O(A) requerente"}${prot?`, no requerimento ${prot}`:""}, requer a prorrogação, por igual período, do prazo para cumprir a exigência${k.exigencia_prazo?` que vence em ${fmt(k.exigencia_prazo)}`:""}, nos termos do art. 566, § 2º, da Instrução Normativa PRES/INSS nº 128/2022, porque os documentos pedidos dependem de terceiros e ainda não foram entregues: [diga aqui o motivo].`,
    "Pedido de prorrogação copiado 📋");
}
// F236 · o prazo do tribunal no lugar do prazo do caso: com outro prazo já marcado, pergunta antes (o carimbo [PRAZO]
// do prazo antigo deixaria de casar e os "lembrar antes" se soltariam)
async function usarPrazoDoTribunal(casoId, data){
  const k = D.casoPorId.get(casoId); if(!k) return;
  if(k.prazo && k.prazo!==data && !(await confirmar(`Trocar o prazo do caso de ${fmt(k.prazo)} por ${fmt(data)}, o do tribunal? O de ${fmt(k.prazo)} deixa de ser o prazo fatal do caso.`))) return;
  fecharCaixa(); await marcarTarefaComPrazo(casoId, data); repintarFicha();
}

// ══════════════════════════════════════════════════════════════════════════
// 📅 F57 · O QUADRO DE DATAS DO CASO — pedido do Paulo: a pílula única (F56)
// não bastou; ele quer TODOS os lembretes à vista em cima dos dados do caso,
// fáceis de ler e de ALTERAR ali mesmo. Uma linha por data, com o input de
// data aberto (troca = grava) e a ação de resolver do fluxo oficial.
// ══════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════
// F85 · DE QUE É ESTE PRAZO. O prazo fatal nasce com o carimbo
// "⏰ [PRAZO dd.mm.aaaa]" no comentário que o criou (composer com o ⏰). É esse
// carimbo que liga a data ao MOTIVO — e o motivo é o que faltava na linha:
// "PRAZO FATAL — Aux. Acidente" não diz o que precisa ser feito. Aqui a
// origem é encontrada, o texto dela vira o rótulo e o clique leva ao próprio
// comentário. Prazo sem origem (veio do "Concluir em" do To Do, ou foi
// digitado na data) fica marcado como tal, com o convite a explicar.
// ══════════════════════════════════════════════════════════════════════════
function origemDoPrazo(k){
  if(!k || !k.prazo) return null;
  const carimbo = `[PRAZO ${fmt(k.prazo)}]`;
  const dos = (D._andsFicha||[]).filter(x=>x.caso_id===k.id && !x.excluir)
    .sort((x,y)=>(x.criado_em||"")<(y.criado_em||"")?1:-1);
  // [24.09.2026] o prazo que veio do "Concluir em" do To Do não tem carimbo,
  // mas quase sempre tem a anotação que o motivou ("Verificar em 25/09"): a
  // nota mais recente que cita a data, com ou sem ano, é a origem
  const [aa, mm, dd] = String(k.prazo).slice(0,10).split("-");
  const reData = new RegExp(`\\b${dd}[./]${mm}(?:[./]${aa})?\\b(?![./]\\d)`);
  const citam = dos.filter(x=>reData.test(x.texto||"") && !/^(PJe|e-SAJ|eproc|CRPS)/.test(x.texto||""));
  // F236 · entre as notas que citam a data, a que pediu o trabalho (criou tarefas) explica o prazo melhor que a
  // última que só o repete (a ligação do cliente que lembra a data)
  const a = dos.find(x=>(x.texto||"").includes(carimbo))
         || citam.find(x=>(D.tarefasFicha||[]).some(t=>t.andamento_id===x.id)) || citam[0];
  if(!a) return null;
  const co = D.colPorId.get(a.autor_id);
  return {id:a.id, quem:co?co.nome.split(" ")[0]:"", em:dataSP(a.criado_em),
    texto:(a.texto||"").replace(/^[⏰🔥\s]*\[PRAZO [0-9.]+\]\s*/u,"").replace(/<[^>]*>/g,"").trim()};
}
// F427 · a frase do carimbo [PRAZO] diz do que é o prazo na agenda (sem o carimbo e sem o autor do To Do)
const fraseDoTodo = t => cortaFrase(String(t||"").replace(/<[^>]*>/g," ").replace(/^[⏰🔥\s]*\[PRAZO [0-9.]+\]\s*/u,"")
  .replace(/^\(\p{L}{1,12}\)\s*:\s*/u,"").replace(/\s+/g," ").trim().split(/(?<=[.;!?])\s/)[0].replace(/[.;]$/,""), 70);
// escrever de que é o prazo = criar o comentário de origem que faltava: o
// mesmo carimbo do composer, então a linha passa a ter motivo e link
function explicarPrazo(casoId){
  const k=D.casoPorId.get(casoId); if(!k || !k.prazo) return;
  caixa(`<h3 style="margin:0 0 4px">Descrição do prazo de ${fmt(k.prazo)}</h3>
    <p class="meio-sub" style="margin:0 0 8px">${esc(tituloCaso(k))} — registre a providência a ser cumprida
      até essa data. Vira andamento no caso e passa a identificar o prazo.</p>
    <div class="form-linha">${["Protocolar o recurso","Cumprir a exigência","Apresentar contrarrazões",
      "Juntar documento","Manifestar sobre o laudo"].map(t=>
      `<button class="btn-rap" onclick="document.getElementById('ep-txt').value=this.textContent">${t}</button>`).join("")}</div>
    <textarea id="ep-txt" rows="2" placeholder="ou escreva…"
      style="width:100%;margin-top:8px;font:inherit;padding:8px;border:1px solid var(--borda);border-radius:8px"></textarea>
    <div class="form-linha" style="margin-top:8px">
      <button class="btn-rap" onclick="fecharCaixa()">cancelar</button>
      <button class="btn-mini forte" style="margin-left:auto" onclick="salvarExplicacaoPrazo('${casoId}')">Guardar</button>
    </div>`);
}
async function salvarExplicacaoPrazo(casoId){
  const k=D.casoPorId.get(casoId); if(!k) return;
  const txt=((document.getElementById("ep-txt")||{}).value||"").trim();
  if(!txt) return aviso("Escreva do que é o prazo");
  fecharCaixa();
  try{
    await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({caso_id:casoId, autor_id:eu.id, texto:`⏰ [PRAZO ${fmt(k.prazo)}] ${txt}`})});
  }catch(e){ return aviso("Não gravou: "+String(e.message||e).slice(0,90)); }
  aviso("⏰ Motivo do prazo registrado");
  if(clienteAberto) abrirFicha(clienteAberto);
}
// F236 · o laudo que o prazo do tribunal manda manifestar: o ato do expediente (ato_id) fala do laudo, e o laudo é o
// documento juntado no processo até o dia do ato; a conclusão vem do próprio laudo
function laudoDoPrazo(p, k){
  // F236 · só o ato que manda MANIFESTAR sobre o laudo: a sentença ou o acórdão que cita o laudo abre prazo de recurso,
  // e o rótulo "Manifestar sobre o laudo" no prazo do recurso inominado faria perder o recurso
  const ato = `${p.ato||""} ${p.texto||""}`, doc = String(textoDoAto(p, k)||"");
  if(/\bsenten[çc]a\b|\bjulgo\b|\bac[óo]rd[ãa]o\b/i.test(`${ato} ${doc.slice(0, 400)}`)) return null;
  if(!/manifest\w*[^.]{0,80}laudo|laudo[^.]{0,80}manifest/i.test(`${ato} ${doc}`)) return null;
  const ate = somaDias(p.expedido_em || p.ciencia_em || p.fim || hoje(), 1);
  return (D.anexos||[]).filter(a=>a.caso_id===k.id && /laudo/i.test(a.nome||"") && dataSP(a.criado_em)<=ate)
    .sort((x,y)=>String(y.criado_em).localeCompare(String(x.criado_em)))[0] || null;
}
const conclusaoDoLaudo = t => { const m = /conclus[ãa]o\s*:?\s*([^\n]{20,400})/i.exec(String(t||"")); return m ? cortaFrase(m[1].replace(/\s+/g," ").trim(), 260) : ""; };
// F236 · a frase do texto que cita a data (dd/mm ou dd.mm); sem ela, o começo do texto
function fraseDaData(txt, iso){
  const s = String(txt||"").replace(/^[⏰🔥\s]*\[PRAZO [0-9.]+\]\s*/u,"").replace(/\s+/g," ").trim();
  const dm = iso ? new RegExp(`\\b${iso.slice(8,10)}[./]${iso.slice(5,7)}\\b`) : null;
  return (dm && s.split(/(?<=[.;!?])\s/).find(f=>dm.test(f))) || s;
}
// F236 · a conta do prazo de análise parado pela perícia que passou sem confirmação
const notaParado = (par, x) => `O prazo de análise do INSS só corre da perícia feita${/^B87/i.test(x.especie||"")?" e, no BPC da pessoa com deficiência, das duas avaliações, a médica e a social (LOAS, art. 20, § 6º)":""}. Feita em ${fmt(par.pendente)}, o INSS decide até ${fmt(par.seFeita)} (${par.dias} dias, acordo homologado no RE 1.171.152).`;
// F236 · a janela da prorrogação aberta pede o relatório atualizado do cliente e o pedido até a véspera da DCB (IN 128/2022,
// art. 339, § 3º): um clique cria a tarefa para quem cuida do caso, outro abre a mensagem pronta ao cliente
async function tarefaProrrogacao(casoId){
  const k = D.casoPorId.get(casoId); if(!k || !k.dcb) return;
  const ate = somaDias(k.dcb, -1), quem = donosDoCaso(k)[0];
  try{
    const [novo] = await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:casoId, autor_id:eu.id, origem:"app", publico:false,
        texto:`🩺 Pedir a prorrogação do benefício até ${fmt(ate)} (a DCB é ${fmt(k.dcb)}): pedir ao cliente o relatório médico atualizado e protocolar pelo Meu INSS ou pela Central 135 (IN 128/2022, art. 339, § 3º).`})}) || [];
    if(novo) await criarTarefasDe(novo.id, casoId, [quem], "", hoje());
    plim(); aviso(`🩺 Tarefa da prorrogação para ${((D.colPorId.get(quem)||{}).nome||"").split(" ")[0]}, até ${fmt(ate)}`, false);
  }catch(e){ aviso("Não criou: "+String(e.message||e).slice(0,90)); }
  if(clienteAberto) abrirFicha(clienteAberto);
}
function msgProrrogacao(casoId){
  const k = D.casoPorId.get(casoId), c = k && D.cliPorId.get(k.cliente_id); if(!k || !k.dcb) return;
  msgCliente(casoId, "", "", "", `Olá, ${((c||{}).nome||"").split(" ")[0]}! O seu benefício está marcado para terminar em ${fmtBarra(k.dcb)}. Se você ainda não tem condições de voltar ao trabalho, precisamos pedir a prorrogação até ${fmtBarra(somaDias(k.dcb, -1))}. Para isso, mande por aqui ou traga ao escritório um relatório médico atualizado, com o CID, o tratamento e o tempo de afastamento que o médico indica. Qualquer dúvida, estamos à disposição. Escritório Tercini.`);
}
// F236 · o pedido inteiro da diligência do CRPS: o comentário do PAT mais recente que a trouxe (o campo da exigência
// guarda só o começo, com a nota interna do prazo estimado)
function pedidoDaDiligencia(k){
  const a = (D._andsFicha||[]).filter(a=>a.caso_id===k.id && a.origem==="pat" && !a.excluir && /dilig[êe]ncia/i.test(a.texto||""))
    .sort((x,y)=>String(y.criado_em).localeCompare(String(x.criado_em)))[0];
  return a ? String(a.texto||"").replace(/^\s*(INSS|Escritório)\s*·\s*/,"").replace(/\s+/g," ").trim()
    : String(k.exigencia_descricao||"").replace(/\s*·\s*prazo estimado:[\s\S]*$/i,"").replace(/\s+/g," ").trim();
}
// F236 · a diligência do CRPS pede duas tarefas, propostas num clique para quem cuida do caso: pedir os papéis à cliente
// até a metade do prazo e protocolar a resposta pelo Meu INSS até o fim dele (sem resposta, o recurso é julgado com o
// que está nos autos, Regimento do CRPS, art. 85, § 2º)
async function tarefasDaDiligencia(casoId){
  const k = D.casoPorId.get(casoId); if(!k || !k.exigencia_prazo) return;
  const fim = k.exigencia_prazo, hj = hoje(), meio = proxDiaUtil(somaDias(hj, Math.max(0, Math.round(diasAte(fim)/2))));
  const entrega = meio < fim ? meio : hj, quem = donosDoCaso(k)[0], nup = crpsNups(k)[0];
  const tarefa = crpsBlocos(k).flatMap(b=>b.eventos||[]).sort(porDataDesc).map(e=>(/tarefa:?\s*(\d{6,})/i.exec(e.bruto||"")||[])[1]).find(Boolean);
  const criar = async (texto, dia) => { const [novo] = await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify({caso_id:casoId, autor_id:eu.id, origem:"app", publico:false, texto})}) || [];
    if(novo) await criarTarefasDe(novo.id, casoId, [quem], "", dia); };
  try{
    await criar(`📄 Diligência do CRPS${nup?` (recurso ${formatarNup(nup)})`:""}: pedir à cliente, para entregar até ${fmt(entrega)}, o que a Junta pediu — ${cortaFrase(pedidoDaDiligencia(k), 600)}`, entrega);
    await criar(`⚠ Diligência do CRPS: protocolar a resposta pelo Meu INSS${tarefa?` na tarefa ${tarefa}`:""} até ${fmt(fim)} (sem resposta, o recurso é julgado com o que está nos autos, Regimento do CRPS, art. 85, § 2º).`, fim);
    plim(); aviso(`📄 Tarefas da diligência para ${((D.colPorId.get(quem)||{}).nome||"").split(" ")[0]}: pedir até ${fmt(entrega)} e protocolar até ${fmt(fim)}`, false);
  }catch(e){ aviso("Não criou: "+String(e.message||e).slice(0,90)); }
  if(clienteAberto) abrirFicha(clienteAberto);
}
// F104 · a COLETA das datas do cliente, separada do desenho: o quadro (tema
// desligado) e os quadros horizontais da linha do caso (tema v10) leem a
// mesma lista. Cada linha: {data, ico, rot, casoId?, andId?, ehPrazo?, filhas}
// P1 (prazos, 31.10.2026) · as datas que custam o direito e não tinham linha: o mandado de segurança contra o
// indeferimento do INSS, a perda da qualidade de segurado e a decadência da revisão. Todas lidas do que a ficha já tem.
// O mandado de segurança: 120 dias da ciência (Lei 12.016/2009, art. 23), contados da decisão, o dia mais cedo em que a
// ciência pode ter ocorrido; enquanto cabe o recurso e nada decidiu pelo mandado de segurança
function msAte(k){
  if(!k || !ehPrev(k) || faseEfetiva(k)!=="inss" || !recorrerAte(k) || msDecidido(k)) return null;
  const d = somaDias(k.decisao_em, 120);
  return d && d>=hoje() ? d : null;
}
// a qualidade de segurado pelo CNIS lido na triagem (Lei 8.213/91, art. 15); null sem CNIS, com benefício em
// manutenção ou já perdida. Guardada por cliente enquanto o CNIS e o dia não mudam (o Meu Dia lê todos os clientes)
const _gracaMemo = new Map();
function gracaDoCliente(c){
  const g = c && cnisDe(c); if(!g || !(g.vinculos||[]).length) return null;
  const m = _gracaMemo.get(c.id), hj = hoje();
  if(m && m.g===g && m.hj===hj) return m.r;
  const an = g.analise, fd = fontesDoDossie(c.id);
  let gr = null;
  try{ gr = calcularGraca(g.vinculos, contribSemPerda(g), !!(triagemDe(c).graca||{}).desempregado, an && an.abaixo, an && an.contagem && an.contagem.periodos, fd.seguros); }catch(e){}
  const r = gr && !gr.semLimite && !gr.vencida && gr.perda && gr.mantidaAte ? gr : null;
  _gracaMemo.set(c.id, {g, hj, r});
  return r;
}
// a decadência da revisão de cada carta de concessão do dossiê (art. 103 da Lei 8.213/91), nos dois anos que antecedem o fim
function decadenciasDoCliente(cliId){
  const f = fontesDoDossie(cliId), hj = hoje(), out = [];
  for(const ca of f.cartas){
    const dec = decadenciaDe(ca, f.extratos); if(!dec) continue;
    const ate = dec.cedo || dec.ate;
    if(ate>=hj && diasAte(ate)<=730) out.push({ca, dec, ate});
  }
  return out;
}
function linhasDeDatas(cliId){
  const c=D.cliPorId.get(cliId)||{}, hj=hoje();
  const linhas=[];
  const lembs=lembretesDo(cliId);
  // P1 · a perda da qualidade e a decadência da revisão são do cliente: sem caso, valem em todos
  const gq = gracaDoCliente(c);
  if(gq) linhas.push({data:gq.mantidaAte, ico:"🛡", natureza:"lembrete", cru:true, rotulo:"Qualidade de segurado até", curto:"Qualidade de segurado até",
    resumo:`perde em ${fmtBarra(gq.perda).slice(0,5)}`,
    rot:`<b>A qualidade de segurado se mantém até ${fmt(gq.mantidaAte)} e se perde em ${fmt(gq.perda)}</b>
         <small class="qd-de">${gq.base} meses a partir de ${esc(gq.ultima||"")} (Lei 8.213/91, art. 15), pelo CNIS lido na triagem. Um recolhimento a tempo ou um vínculo novo mantém a qualidade</small>`,
    edita:"", acao:""});
  // P2 · o próximo pagamento de cada plano de contribuições
  for(const q of qualidadeDe(cliId)){
    const px = qualidadeProximos(q, 1)[0]; if(!px) continue;
    linhas.push({data:px, ico:"🧾", natureza:"lembrete", cru:true, rotulo:"Contribuição a pagar", curto:"Contribuição: pagar até",
      resumo:`${qualGuia(q)}${q.valor ? ` · ${qualValor(q.valor)}` : ""}`,
      rot:`<b>Pagar até ${fmt(px)}: ${esc(qualGuia(q))}${q.valor ? `, ${esc(qualValor(q.valor))}` : ""}</b>
           <small class="qd-de">${esc(qualFim(q))}${q.motivo ? ` · ${esc(q.motivo)}` : ""}${q.aviso_zap ? " · o WhatsApp lembra o cliente no primeiro dia útil do mês" : ""}</small>`,
      edita:"", acao:`<button class="btn-mini" onclick="verQualidade('${cliId}')">Abrir</button>`});
  }
  // P5 · a renovação do CadÚnico do BPC, a 180 dias ou vencida
  const cu = cadunicoDoCliente(cliId);
  if(cu && diasAte(cu.ate)<=180) linhas.push({data:cu.ate, ico:"🏠", natureza:"lembrete", cru:true, rotulo:"CadÚnico até", curto:"CadÚnico: atualizar até",
    resumo:"atualizar no CRAS",
    rot:`<b>Atualizar o CadÚnico no CRAS até ${fmt(cu.ate)}</b> <small class="qd-de">última atualização em ${fmt(cu.base)}${cu.doDossie ? ", lida no Meu CadÚnico pela extensão" : ""}; sem ela o INSS bloqueia o BPC (Lei 8.742/93, art. 20, § 12)</small>`,
    edita:"", acao:""});
  // F601 · o prazo que corre no pré-caso vivo (recurso ao CRPS, óbito, prisão) aparece aqui com o rótulo "Pré-caso"
  try{ const pv = c.id && pcDaFicha(c).lista.find(p=>!p.so_lembrete);
    if(pv){ let pz = prazosDoDossie(c); if(!pz.length){ const r = prazoDoRelato(c); if(r) pz = [r]; }
      for(const ce of certidoesDoDossie(c.id)){ const f = ce.obito || ce.prisao; if(!f || f < "2019-01-18") continue; const lim = somaDias(f, 90);
        if(lim >= hj) pz.push({fatal:lim, texto:`pedir ${ce.obito ? "a pensão por morte" : "o auxílio-reclusão"} até ${fmtBarra(lim)} (90 dias ${ce.obito ? "do óbito" : "da prisão"})`}); }
      for(const p of pz) linhas.push({data:p.fatal, ico:"🙋", natureza:"lembrete", cru:true, rotulo:"Pré-caso", curto:"Pré-caso",
        resumo:p.texto, rot:`<b>Pré-caso: ${esc(p.texto)}</b>`, edita:"",
        acao:`<button class="btn-mini" onclick="abrirAtendimentoDe('${cliId}','${pv.id}')">Abrir</button>`}); }
    // F606 · a data de retorno de cada pré-caso vivo, gravada só no CRM
    for(const p of (c.id ? pcDaFicha(c).lista : [])){ const r = p.retorno||{}; if(!r.data) continue;
      linhas.push({data:r.data, ico:"🙋", natureza:"lembrete", cru:true, rotulo:"Retorno do pré-caso", curto:"Retorno do pré-caso",
        resumo:r.motivo||"retorno do pré-caso", rot:`<b>Retorno do pré-caso${r.motivo?`: ${esc(r.motivo)}`:""}</b>`, edita:"",
        acao:p.id!=="legado"&&!p.so_lembrete?`<button class="btn-mini" onclick="abrirAtendimentoDe('${cliId}','${p.id}')">Abrir</button>`:""}); }
  }catch(e){}
  const ksCli = (D.casosDoCliente.get(cliId))||[];
  try{ for(const {ca, dec, ate} of decadenciasDoCliente(cliId)){
    const d = soDig(ca.nb), kd = d ? ksCli.find(k=>k.fase!=="encerrado" && nbsDoCaso(k).some(x=>soDig(x)===d)) : null;
    linhas.push({data:ate, ico:"📜", natureza:"lembrete", casoId:kd ? kd.id : undefined, cru:true, rotulo:"Revisão até", curto:"Revisão: decadência",
      resumo: ca.nb ? `NB ${fmtNb(ca.nb)}` : "carta de concessão",
      rot:`<b>A revisão do ato de concessão${ca.nb?` do NB ${esc(fmtNb(ca.nb))}`:""} pode ser pedida até ${fmt(ate)}</b>
           <small class="qd-de">Dez anos do dia 1º do mês seguinte ao primeiro pagamento (Lei 8.213/91, art. 103); ${esc(dec.base)}</small>`,
      edita:"", acao:""});
  } }catch(e){}
  // anotações datadas não resolvidas — pulando a que já virou lembrete
  // (salvarNotaAtendimento2 cria o gêmeo com título "Anotação: {60}")
  // F59 · o responsável vira a bolinha colorida com a inicial (identificação
  // num relance), e a linha é CLICÁVEL: abre a anotação que criou a data
  const bolinha=co=>co?`<span class="avatar mini" style="background:${co.cor}"
    title="responsável: ${esc(co.nome)}">${esc(co.inicial)}</span>`:"";
  (((c.campos||{}).atendimento)||[]).forEach((n,idx)=>{
    if(!n.lembrar_em || n.resolvida) return;
    if(lembs.some(l=>l.titulo===`Anotação: ${(n.texto||"").slice(0,60)}`)) return;
    const donos=(n.atribuidos||[n.atribuido]).filter(Boolean)
      .map(id=>D.colPorId.get(id)).filter(Boolean);
    linhas.push({data:n.lembrar_em, ico:"📝", natureza:"lembrete", rot:(n.texto||"").slice(0,70),
      textoCru:(n.texto||""),
      avs:donos.map(bolinha).join(""),
      clique:`onclick="qdVerNota('${cliId}',${idx})"`,
      edita:`onchange="qdMudarNota('${cliId}',${idx},this.value)"`,
      acao:`<button class="btn-mini" onclick="resolverNotaAtendimento('${cliId}',${idx})"
        title="marca a anotação como resolvida">✔ feito</button>`});
  });
  lembs.forEach(l=>{ if(!l.proximo_em) return;
    linhas.push({data:l.proximo_em, ico:"🔔", natureza:"lembrete", lembTipo:l.tipo||"",
      rot:`${l.titulo||"Lembrete"}${l.intervalo_meses?` · repete a cada ${l.intervalo_meses} mês(es)`:""}`,
      avs:bolinha(D.colPorId.get(l.responsavel_id)),
      clique:`onclick="qdVerLembrete('${l.id}')"`,
      edita:`onchange="adiarLembrete('${l.id}',this.value)"`,
      acao:`<button class="btn-mini" onclick="lembreteAvisado('${l.id}','manual')"
        title="registra o aviso — único desliga, recorrente avança">✔ feito</button>`});
  });
  // F60 · a data escrita no COMPOSER do caso (tarefa de andamento — o
  // "verificar em 24/08" e o 📌) também mora aqui: com o responsável na
  // bolinha e o clique levando ao PRÓPRIO andamento que a criou
  const idsCasos=new Set(((D.casosDoCliente.get(cliId))||[]).map(x=>x.id));
  ((D.tarefasFicha)||[]).forEach(t=>{
    if(t.concluida_em || !t.lembrar_em || !idsCasos.has(t.caso_id)) return;
    const a=(D._andsFicha||[]).find(x=>x.id===t.andamento_id);
    const texto=a?(a.texto||"").replace(/<[^>]*>/g,""):"";
    const co=D.colPorId.get(t.colaborador_id);
    // F326 · a revisão que fica depois do prazo registrado (cumprido ou não) já não é prazo fatal: é compromisso
    const pzFim = t.papel==="revisa" && a && ["cumprido","nao","nsa"].includes((estadoPrazoNota(a)||{}).est);
    linhas.push({data:t.lembrar_em, ico:"🗓", natureza:pzFim ? "compromisso" : (t.natureza||"compromisso"),
      rot:(texto?texto.slice(0,70):"Tarefa do andamento")+(t.papel==="revisa"?" (revisão)":""),
      // F236 · o cartão diz o que fazer e quem faz: o pedido feito à pessoa ("@André, ligue na véspera…", pelo mesmo
      // resumoAgenda da agenda) e não o começo da anotação; na revisão, que é revisão, e do quê (o pedido feito a quem
      // executa, quando a anotação não chama o revisor)
      // F427 · sem o nome de quem faz no começo (a bolinha e a coluna já o dizem; "Paulo: …" lia como autoria) e sem o
      // "· prazo adicional até …" da resposta, que repetia a data; a revisão começa por "Revisar:"
      resumo:`${t.papel==="revisa"?"Revisar: ":""}${(s=>(q=>t.papel==="revisa"?q:q.charAt(0).toUpperCase()+q.slice(1))(cortaFrase(t.papel==="revisa"?s.replace(/^revis[ae]\s+/i,""):s, 70)))(String(resumoAgenda(texto.replace(/\s*·\s*prazo adicional até \d{2}\/\d{2}\/\d{4}/gi, ""),
        t.papel==="revisa" && co && !new RegExp(`@${dsa(co.nome.split(" ")[0])}\\b`).test(dsa(texto))
          ? (D.colPorId.get(((D.tarefasFicha||[]).find(y=>y.andamento_id===t.andamento_id && y.papel!=="revisa")||{}).colaborador_id) || co) : co)||""))||"tarefa do andamento"}`,
      textoCru:texto, casoId:t.caso_id, andId:t.andamento_id,
      avs:bolinha(co),
      clique:`onclick="qdIrParaAndamento('${t.caso_id}','${t.andamento_id}')"`,
      edita:`onchange="mudarLembrar('${t.id}',this.value)"`,
      // F62 · dois jeitos de concluir, como no próprio andamento: o ✔ rápido
      // (com desfazer) e o ✎ que abre a janela de escrever o que foi feito
      acao:`<button class="btn-mini" onclick="concluirDeVez('${t.id}')"
        title="concluir agora — dá para desfazer logo depois">✔ feito</button>
      <button class="btn-mini" onclick="concluirTarefa('${t.id}')"
        title="concluir escrevendo o que foi feito, com protocolo e repetição">✎ escrever</button>`});
  });
  // F236 · o pedido com data de entrega (o checklist do caso, tabela tarefas) também é compromisso do caso: a CTPS até
  // 19/10, o relatório até 23/10. Antes ele só aparecia como "1 pendente", sem data.
  (D.tarefas||[]).forEach(t=>{
    if(t.concluida || !t.prazo || !idsCasos.has(t.caso_id) || t.particular_de) return;
    const k=D.casoPorId.get(t.caso_id); if(!k || k.fase==="encerrado") return;
    const doc=/^📄/.test(t.titulo||""), nome=semEmoji(t.titulo||"").trim();
    linhas.push({data:t.prazo, ico:doc?"📄":"🗓", natureza:"compromisso", casoId:t.caso_id, cru:true,
      rotulo:doc?"Documento pedido":"Tarefa", resumo:cortaFrase(nome, 70),
      rot:`<b>${esc(nome)}</b> <small class="qd-de">${doc?"Pedido ao cliente: entrega até esta data":"Tarefa do caso"} · ${esc(tituloCaso(k))}</small>`,
      edita:`onchange="gravarPrazoDoc('${t.id}',this.value)"`,
      acao:`<button class="btn-mini" onclick="concluirTarefaSolta('${t.id}')">✔ ${doc?"recebido":"feito"}</button>`});
  });
  ((D.casosDoCliente.get(cliId))||[]).forEach(x=>{
    if(x.fase==="encerrado") return;
    // F236 · as datas que cobram ação valem nos DOIS visuais. O clássico, o padrão da equipe, não via a exigência, o
    // recurso, o prazo de análise, a DCB e a prorrogação, os honorários e o comentário fixo (moravam só no tema v10, F84),
    // e o "Recorrer até" ficava no ➕. Cada linha diz do que é (rotulo e resumo) e de onde veio (o rot, no "saber mais").
    const fe=faseEfetiva(x), tit=esc(tituloCaso(x));
    const rec=recorrerAte(x);
    // F236 · o prazo do tribunal já respondido (a peça protocolada anotada depois da ciência) vira registro (resp)
    const tribs=(x.prazos_tribunal||[]).map(p=>({p, dt:dataDoPrazo(p), fav:atoFavoravelDoPrazo(x, p)})).filter(t=>t.dt)
      .map(t=>({...t, resp: !t.fav && respostaAoPrazo(x, t.p)}));
    // o "Concluir em" do To Do com a data de um prazo que o CRM já conhece é ESSE prazo: uma linha só
    const igualA = !x.prazo ? "" : rec===x.prazo ? "rec" : x.exigencia_prazo===x.prazo ? "exig"
      : tribs.some(t=>t.p.fim===x.prazo && !t.fav && !t.resp) ? "trib" : "";
    const og = x.prazo ? origemDoPrazo(x) : null;
    const cumprir = !x.prazo ? "" : temaV10() ? `janelaPrazoCumprido('${x.id}'${og ? `,'${og.id}'` : ""})` : `qdMudarPrazo('${x.id}','')`;
    const btCumprir = !x.prazo ? "" : temaV10()
      ? `<button class="btn-mini" onclick="janelaPrazoCumprido('${x.id}')"
          title="cumpriu: escreve o que foi feito no caso, tira o prazo daqui e devolve o caso à lista de onde veio">✔ cumprido</button>`
      : `<button class="btn-mini" onclick="qdMudarPrazo('${x.id}','')"
          title="prazo cumprido — a data sai do caso e o caso volta à lista de onde veio">✔ feito</button>`;
    const tambem = l => { l.resumo = `${l.resumo?`${l.resumo} · `:""}também no To Do`;
      l.rot += ` <small class="qd-de">É também o “Concluir em” do To Do (${fmt(x.prazo)}).</small>`;
      l.acao = `${l.acao||""}${btCumprir}`; l.cumprir = cumprir; };
    if(x.exigencia_prazo){
      const desc=String(x.exigencia_descricao||""), estimado=/prazo estimado/i.test(desc);
      const dilig = fe==="conselho" || /dilig[êe]ncia/i.test(desc);
      const o=desc.replace(/\s*·\s*prazo estimado:[\s\S]*$/i,"").replace(/\s+/g," ").trim();
      const nup = dilig ? crpsNups(x)[0] : "", rotulo = dilig ? "Diligência do CRPS" : "Exigência do INSS";
      const l={data:x.exigencia_prazo, ico:"⚠", ehPrazo:true, natureza:"fatal", casoId:x.id, cru:true, rotulo,
        // F236 · a diligência do CRPS segue o Regimento, e não a IN 128: o prazo é contínuo e conta da ciência (art. 78);
        // contado do ato no PAT é a conta segura (sem "estimado"); sem resposta, julga-se com o que está nos autos (art.
        // 85, § 2º) e não cabe nova diligência sobre o mesmo ponto (art. 75, § 12). As duas tarefas, num clique
        resumo:`${estimado && !dilig?"estimado · ":""}${cortaFrase(o, 70)}`,
        rot:`<b>${rotulo}${nup?` · recurso ${esc(formatarNup(nup))}`:""}${o?` — ${esc(cortaFrase(dilig ? pedidoDaDiligencia(x) : o, dilig ? 600 : 220))}`:""}</b>
             <small class="qd-de">${dilig ? "Prazo da tarefa no Meu INSS, contado do ato no PAT: é a conta segura, porque os prazos do CRPS são contínuos e correm da ciência (Regimento do CRPS, art. 78), e uma ciência presumida posterior (art. 80, § 1º, II) pode deixar o prazo passar. Sem resposta, o recurso é julgado com o que está nos autos (art. 85, § 2º) e não cabe nova diligência sobre o mesmo ponto (art. 75, § 12)" : `${estimado?"Data estimada: 30 dias do ato no PAT, porque a ciência não vem do portal; o prazo conta da ciência (IN 128/2022, art. 566, caput): confira-a no Meu INSS. ":""}Prorrogável por igual período, a pedido justificado (art. 566, § 2º); enquanto a exigência está aberta, o prazo de análise do INSS fica suspenso (art. 566, § 9º)`} · ${tit}</small>`, edita:"",
        acao:`<button class="btn-mini" onclick="copiarMsgExigencia('${x.id}')" title="mensagem pronta ao cliente sobre a ${dilig?"diligência":"exigência"}"><span aria-hidden="true">💬 Mensagem</span><span class="sr-only">💬 msg ao cliente</span></button>
              ${dilig ? ((D._andsFicha||[]).some(a=>a.caso_id===x.id && !a.excluir && /^📄 Diligência do CRPS/.test(a.texto||"")) ? ""
                : `<button class="btn-mini" onclick="fecharCaixa();tarefasDaDiligencia('${x.id}')" title="cria para quem cuida do caso as tarefas de pedir os papéis à cliente e de protocolar a resposta"><span aria-hidden="true">＋ Diligência</span><span class="sr-only">＋ tarefas da diligência</span></button>`)
                : `<button class="btn-mini" onclick="copiarPedidoProrrogacaoExig('${x.id}')" title="texto do pedido de prorrogação do prazo por igual período (IN 128/2022, art. 566, § 2º)"><span aria-hidden="true">📋 Prorrogação</span><span class="sr-only">📋 pedido de prorrogação</span></button>`}
              <button class="btn-mini" onclick="cumprirExigencia('${x.id}')" title="registra a exigência como cumprida">✔ cumprida</button>`};
      if(igualA==="exig") tambem(l);
      linhas.push(l);
    }
    // F220 · o prazo de análise do INSS pelo acordo do RE 1.171.152. F236 · parado enquanto a perícia que passou não é
    // confirmada: a pergunta vai na linha do próprio evento (abaixo), com a conta de quando o INSS decide se ela aconteceu
    // (eram duas linhas da mesma confirmação, e o evento ainda contava como vencido). Vencido com o mandado de segurança
    // já decidido, a linha não manda mais avaliá-lo
    const mora=prazoMora(x), parado = mora && mora.parado ? mora : null, ms = !!(mora && mora.vencido && msDecidido(x));
    const linhaParado = () => ({data:hj, ico:"⌛", natureza:"compromisso", casoId:x.id, cru:true, rotulo:"Prazo de análise parado", curto:"Confirmar a perícia",
      resumo:`${parado.tipo} de ${fmtBarra(parado.pendente).slice(0,5)}`,
      rot:`<b>Prazo de análise parado: confirme se a ${esc(parado.tipo)} de ${fmt(parado.pendente)} aconteceu</b>
           <small class="qd-de">${notaParado(parado, x)} Marque Compareceu ou Não compareceu na aba Perícias · ${tit}</small>`, edita:"", acao:""});
    // F623 · Concluir tira a linha enquanto a data do prazo for a mesma; prazo recalculado volta a aparecer
    const moraFora = mora && ((x.ronda||{}).mora_fora||{}).data===mora.data;
    if(mora && !parado && !moraFora) linhas.push({data:mora.data, ico:"⌛", natureza:"compromisso", casoId:x.id, cru:true,
      rotulo:mora.vencido?"Prazo de análise do INSS vencido":"Prazo de análise do INSS", curto:mora.vencido?"Análise do INSS vencida":"INSS decide até",
      resumo:mora.vencido?(ms?"MS decidido: acompanhe a impetração":"avalie o mandado de segurança por mora"):`${mora.dias} dias ${mora.pericia?`da ${mora.tipo}`:"da DER"}${mora.suspenso?", descontada a exigência":""}`,
      rot:`<b>${mora.vencido?`O INSS passou do prazo de análise — ${ms?"o mandado de segurança por mora já foi decidido: acompanhe a impetração":"avalie o mandado de segurança por mora"}`:"Prazo do INSS para decidir o pedido"}</b>
           <small class="qd-de">${mora.dias} dias ${mora.pericia?`da ${esc(mora.tipo)} de ${fmt(mora.desde)}`:`da DER de ${fmt(x.der)}`}${mora.suspenso?", descontada a pausa da exigência (IN 128/2022, art. 566, § 9º)":""}, pelo acordo homologado no RE 1.171.152 (confira a vigência do acordo antes de citá-lo); reforço: Lei 9.784/1999, art. 49 (decidir em até 30 dias depois de concluída a instrução) · ${tit}</small>`, edita:"", acao: (mora.vencido && !ms ? botaoOuvidoria(x) : "") + botaoMoraFora(x, mora.data), ouv: mora.vencido && !ms ? botaoOuvidoria(x) : ""});   // F248 · também no cartão, num clique
    if(rec){
      const rotulo = fe==="conselho" ? "Recurso especial" : "Recurso ordinário";
      const l={data:rec, ico:"⚖️", ehPrazo:true, natureza:"fatal", casoId:x.id, cru:true, rotulo,
        resumo: fe==="conselho" ? "à Câmara de Julgamento" : "à Junta de Recursos",
        rot:`<b>Recorrer até ${fmt(rec)}</b> <small class="qd-de">${rotulo} ${fe==="conselho"?"à Câmara de Julgamento":"à Junta de Recursos do CRPS"} · 30 dias da decisão de ${fmt(x.decisao_em)}, levados ao dia útil (conte da ciência, se ela veio depois) · ${tit}</small>`,
        edita:"", acao:""};
      if(igualA==="rec") tambem(l);
      linhas.push(l);
    }
    // F415 · a reanálise da análise documental (Portaria Conjunta 13/2026, art. 8º-A, com a redação da Portaria Conjunta 54/2026)
    const rea = reanaliseAte(x), rp = reanalisePedida(x);
    if(rea) linhas.push({data:rea, ico:"⚖️", ehPrazo:true, natureza:"fatal", casoId:x.id, cru:true, rotulo:"Reanálise documental", curto:"Reanálise até",
      resumo:"10 dias da ciência, com relatório médico novo",
      rot:`<b>Pedir a reanálise da análise documental até ${fmt(rea)}</b> <small class="qd-de">10 dias corridos da decisão de ${fmt(x.decisao_em)} (conte da ciência, se ela veio depois), com documento médico novo; mantém a DER. Recorrer antes disso sem pedir a reanálise a impede (Portaria Conjunta 13/2026, arts. 8º-A e 9º, § 1º, com a redação da Portaria Conjunta 54/2026) · ${tit}</small>`,
      edita:"", acao:`<button type="button" class="tl-bt" onclick="pedirReanalise('${x.id}')" title="registra a reanálise pedida hoje: o recurso passa a contar da decisão dela">Pedida</button>`});
    else if(rp && !rp.decidida_em && fe==="inss") linhas.push({data:hj, ico:"⌛", natureza:"compromisso", casoId:x.id, cru:true, rotulo:"Reanálise documental pedida", curto:"Reanálise pedida",
      resumo:`desde ${fmtBarra(rp.pedida_em)}; o recurso conta da decisão dela`,
      rot:`<b>Reanálise pedida em ${fmt(rp.pedida_em)}, aguardando a Perícia Médica Federal</b> <small class="qd-de">O recurso ao CRPS conta 30 dias da ciência da decisão da reanálise (art. 9º, § 2º, II). A Portaria não fixa prazo para decidir: a demora abre o mandado de segurança por mora · ${tit}</small>`,
      edita:"", acao:`<button type="button" class="tl-bt" onclick="decidirReanalise('${x.id}','indeferido')" title="a reanálise manteve o indeferimento hoje: o recurso conta 30 dias daqui">Mantida</button><button type="button" class="tl-bt" onclick="decidirReanalise('${x.id}','deferido')" title="a reanálise concedeu o benefício: não há recurso">Deferida</button>`});
    // P1 · o mandado de segurança contra o indeferimento, ao lado do recurso: o escritório escolhe a via, e a data corre
    const msd = msAte(x);
    if(msd) linhas.push({data:msd, ico:"⚖️", natureza:"compromisso", casoId:x.id, cru:true, rotulo:"Mandado de segurança até", curto:"MS: 120 dias",
      resumo:"contados da decisão; confirme a ciência",
      rot:`<b>Mandado de segurança contra o indeferimento até ${fmt(msd)}</b>
           <small class="qd-de">120 dias da ciência do ato (Lei 12.016/2009, art. 23), contados aqui da decisão de ${fmt(x.decisao_em)}, o dia mais cedo; a ciência posterior adia a data · ${tit}</small>`,
      edita:"", acao:""});
    // F236 · a sustentação oral da sessão que vale: se as razões não a pediram, até 3 dias úteis antes da sessão (Regimento
    // do CRPS, art. 81, III), com a procuração no recurso até a mesma data (§ 3º). Proposta num clique (a tarefa vai ao
    // administrador, que decide se pede); criada a tarefa, é ela que ocupa a linha
    const sv = fe==="conselho" ? sessaoCrps(x) : null;
    if(sv && sv.data>=hj && sv.sustentacaoAte>=hj && !sustentacaoCriada(x.id, sv.data)) linhas.push({data:sv.sustentacaoAte, ico:"🎙", natureza:"compromisso", casoId:x.id, cru:true,
      rotulo:"Sustentação oral", curto:"Sustentação oral", resumo:`pedir pela Fala.BR · sessão ${fmtBarra(sv.data).slice(0,5)}`,
      rot:`<b>Sustentação oral no julgamento de ${fmt(sv.data)}: pedir até ${fmt(sv.sustentacaoAte)}</b>
           <small class="qd-de">Se as razões do recurso não a pediram, o pedido vai pela Fala.BR até 3 dias úteis antes da sessão (Regimento do CRPS, art. 81, III), com a procuração no recurso até a mesma data (§ 3º); oral, memoriais escritos ou vídeo de até 8 minutos (§ 1º). Quem decide se pede é o escritório · ${tit}</small>`,
      edita:"", acao:`<button class="btn-mini" onclick="fecharCaixa();propostaSustentacao('${x.id}')" title="cria a tarefa de decidir e pedir a sustentação oral até a data limite; quem decide se pede é o escritório"><span aria-hidden="true">＋ Sustentação</span><span class="sr-only">＋ tarefa da sustentação oral</span></button>`});
    if(fe==="conselho") for(const t of crpsBlocos(x)){
      const evs = (t.eventos||[]).filter(e=>!["ruido","ciencia"].includes(e.tipo)).sort(porDataDesc), ult = evs[0]; if(!ult) continue;
      const dec = evs.find(e=>e.tipo==="decisao"), decAgora = decisaoAtualCrps(evs, dec);
      const deNup = t.nup ? ` · recurso ${esc(formatarNup(t.nup))}` : "";
      if(decAgora && CRPS.efeitoDecisao(dec)==="favoravel" && (CRPS.orgaoJulgador(dec.bruto||"")||{}).instancia!==2){
        const cump = evs.find(e=>e.tipo==="cumprimento" && qCrps(e)>=qCrps(dec)), dd = isoCrps(dec.data);
        if(cump && /cumprido/i.test(cump.resumo||"")) continue;
        const ate = prazoAdm(cump ? isoCrps(cump.data) : dd, 30), teto = prazoAdm(dd, 60);
        linhas.push({data:ate, ico:"🏛", natureza:"compromisso", casoId:x.id, cru:true, rotulo:"INSS cumpre o acórdão", curto:"INSS cumpre o acórdão",
          resumo:`no máximo até ${fmtBarra(teto).slice(0,5)}`,
          rot:`<b>O INSS deve cumprir o acórdão até ${fmt(ate)} (no máximo até ${fmt(teto)})</b>
               <small class="qd-de">30 dias do recebimento do processo (Portaria DIRBEN/INSS 996/2022, art. 15)${cump?"":", contados do acórdão enquanto o envio ao INSS não aparece"}; no máximo 60 dias da disponibilização do acórdão (Regimento do CRPS, art. 117, § 1º). Confira no Meu INSS a implantação e os atrasados; vencido, cobre pela Ouvidoria ou por mandado de segurança${deNup} · ${tit}</small>`, edita:"", acao:""});
      } else if(!decAgora){
        const pmf = evs.find(e=>e.tipo==="pericia");
        if(pmf && /^Aguardando/.test(pmf.resumo||"") && !evs.slice(0, evs.indexOf(pmf)).some(e=>["decisao","pauta","diligencia"].includes(e.tipo))){
          const ate = prazoAdm(isoCrps(pmf.data), 30);
          linhas.push({data:ate, ico:"🏛", natureza:"lembrete", casoId:x.id, cru:true, rotulo:"Parecer da PMF", curto:"Parecer da PMF até",
            resumo:"30 dias, prorrogáveis por mais 30",
            rot:`<b>A Perícia Médica Federal tem até ${fmt(ate)} para o parecer</b>
                 <small class="qd-de">30 dias, prorrogáveis por igual prazo (Regimento do CRPS, art. 75, § 6º, I); sem resposta nem prorrogação, cabe a Ouvidoria (art. 76)${deNup} · ${tit}</small>`, edita:"", acao:""});
        }
        const ent = entradaCrps(t, dec);
        if(ent){ const lim = somaDias(isoCrps(ent.data), 365);
          linhas.push({data:lim, ico:"🏛", natureza:"lembrete", casoId:x.id, cru:true, rotulo:"CRPS julga até", curto:"CRPS julga até",
            resumo:"365 dias da entrada, sem a diligência",
            rot:`<b>O CRPS tem até por volta de ${fmt(lim)} para julgar o recurso</b>
                 <small class="qd-de">365 dias da entrada no CRPS em ${fmt(isoCrps(ent.data))}, sem contar o tempo em diligência (Regimento do CRPS, art. 77, §§ 5º e 6º)${lim<hj?"; passou: cabe cobrar pela Ouvidoria ou por mandado de segurança pela demora":""}${deNup} · ${tit}</small>`, edita:"", acao:""});
        }
      }
    }
    // F118 · a DCB é PRAZO FATAL e tem quadro próprio (pedido do Paulo,
    // 18.09): o dia em que o benefício cessa fica à vista ao lado do dia em
    // que ainda dá para pedir a prorrogação
    // F236 · a janela são os 15 dias que ANTECEDEM a DCB (IN 128/2022, art. 339, § 3º): o último dia é a véspera, e com ela
    // aberta o "Pedir a prorrogação" fica no alto, como prazo fatal; fora do INSS, a DCB que já passou é o objeto do
    // recurso ou da ação, e não alarme
    const pe=prorrogarEm(x), fimJan=x.dcb?somaDias(x.dcb,-1):null, janela=!!pe && pe<=hj && fimJan>=hj;
    const lida=(x.ronda||{}).dcb_lida, deAutos=lida && lida.dcb===x.dcb ? lida.fonte||"" : "";
    // F236 · o cartão diz que o benefício cessa ("DCB: cessa" ficou seco); no resumo do quadro, o prazo fatal dela é a
    // janela da prorrogação (dcbDe × prorrogDe), que é o que o escritório faz
    if(x.dcb && !x.dcb_prorrogacao_pedida && !dcbPassadaForaDoInss(x)) linhas.push({data:x.dcb, ico:"🩸", ehPrazo:true, natureza:"fatal", casoId:x.id, cru:true, rotulo:"DCB, o benefício cessa", curto:"Benefício cessa (DCB)", dcbDe:x.id,
      resumo:deAutos?`fixada ${deAutos}`:"",
      rot:`<b>DCB, o benefício cessa${janela?` — peça a prorrogação até ${fmt(fimJan)}, a véspera`:""}</b>
           <small class="qd-de">Sem prorrogação pedida nos 15 dias que antecedem a DCB (IN 128/2022, art. 339, § 3º), o pagamento para${deAutos?` · DCB fixada ${esc(deAutos)}`:""} · ${tit}</small>`,
      edita:"", acao:`<button class="btn-mini" onclick="salvarProrrog('${x.id}',true)" title="a prorrogação já foi pedida — desliga o alarme"><span aria-hidden="true">✔ Pedida</span><span class="sr-only">✔ prorrogação pedida</span></button>`});
    // F236 · com a janela aberta: quem cuida (a bolinha), a tarefa num clique (pedir o relatório e protocolar até a véspera) e a
    // mensagem pronta ao cliente; o resumo não repete a data que o cartão já mostra
    const tfPr = janela && (D._andsFicha||[]).some(a=>a.caso_id===x.id && !a.excluir && String(a.texto||"").startsWith(`🩺 Pedir a prorrogação do benefício até ${fmt(fimJan)}`));
    if(pe && (pe>hj || janela)) linhas.push({data:janela?fimJan:pe, ico:"🩺", ehPrazo:janela, natureza:janela?"fatal":"compromisso", casoId:x.id, cru:true, rotulo:"Pedir a prorrogação", curto:janela?"Pedir a prorrogação já":"Pedir a prorrogação", prorrogDe:x.id,
      resumo:janela?`DCB ${fmtBarra(x.dcb).slice(0,5)}`:`de ${fmtBarra(pe).slice(0,5)} a ${fmtBarra(fimJan).slice(0,5)}`,
      avs: janela ? bolinha(D.colPorId.get(donosDoCaso(x)[0])) : "",
      rot:`<b>Pedir a prorrogação${janela?` já — até ${fmt(fimJan)}`:` a partir de ${fmt(pe)}`}</b>
           <small class="qd-de">Cessação marcada para ${fmt(x.dcb)}${x.dcb_prorrogar_em?"":` · lembrete automático, ${DIAS_PRORROG} dias antes`}; o pedido se faz nos 15 dias que antecedem a DCB, pelo Meu INSS ou pela Central 135, com relatório médico atualizado · ${tit}</small>`,
      edita:"", acao:`${janela && !tfPr ? `<button class="btn-mini" onclick="fecharCaixa();tarefaProrrogacao('${x.id}')" title="cria para quem cuida do caso a tarefa de pedir ao cliente o relatório atualizado e protocolar até a véspera da DCB"><span aria-hidden="true">＋ Prorrogação</span><span class="sr-only">＋ tarefa da prorrogação</span></button>` : ""}${janela ? `<button class="btn-mini" onclick="fecharCaixa();msgProrrogacao('${x.id}')" title="mensagem pronta ao cliente: o relatório atualizado e o prazo"><span aria-hidden="true">💬 Mensagem</span><span class="sr-only">💬 msg ao cliente</span></button>` : ""}<button class="btn-mini" onclick="salvarProrrog('${x.id}',true)" title="a prorrogação já foi pedida — desliga o alarme"><span aria-hidden="true">✔ Pedida</span><span class="sr-only">✔ prorrogação pedida</span></button>`});
    // F236 · concedido o benefício, o 1º pagamento tem prazo de 45 dias (BPC: Decreto 6.214/2007, Anexo, art. 20, e LOAS,
    // art. 37; os previdenciários: Decreto 3.048/1999, art. 174); some quando o 1º pagamento é anotado no caso
    const conc = !x.primeiro_pagamento_em && concessaoNoInss(x), ate1 = conc ? somaDias(conc, 45) : "";
    if(ate1 && ate1>=somaDias(hj,-10)) linhas.push({data:ate1, ico:"💳", natureza:"compromisso", casoId:x.id, cru:true, rotulo:"1º pagamento",
      resumo:"confira o extrato de pagamento",
      rot:`<b>1º pagamento até ${fmt(ate1)}</b>
           <small class="qd-de">45 dias da concessão em ${fmt(conc)} (${/^B8[78]/i.test(x.especie||"")?"Decreto 6.214/2007, Anexo, art. 20; LOAS, art. 37":"Decreto 3.048/1999, art. 174"}). Confira o extrato de pagamento no Meu INSS; passado o dia sem crédito, cobre o INSS (135 ou Ouvidoria): o atraso se paga corrigido · ${tit}</small>`, edita:"", acao:""});
    // F236 · a ordem ao INSS com prazo (tutela de implantação, liminar do mandado de segurança) e o que vigiar da outra parte
    const ord = ordemAoInss(x);
    if(ord && ord.data>=somaDias(hj,-30)) linhas.push({data:ord.data, ico:"🏛", natureza:"compromisso", casoId:x.id, cru:true, rotulo:ord.rotulo, curto:ord.curto, resumo:ord.resumo, rot:ord.rot, edita:"", acao:""});
    const vg = vigiaRecursoInss(x);
    if(vg && vg.ate>=hj) linhas.push({data:vg.ate, ico:"👁", natureza:"lembrete", casoId:x.id, cru:true, rotulo:"Recurso do INSS", curto:"INSS pode recorrer",
      resumo:"da sentença, estimado",
      rot:`<b>O INSS pode recorrer da sentença até ${fmt(vg.ate)} (estimado)</b>
           <small class="qd-de">${vg.jef?"10 dias úteis, sem prazo em dobro no JEF (Lei 9.099/1995, arts. 42 e 12-A; Lei 10.259/2001, art. 9º)":"15 dias úteis em dobro (CPC, arts. 1.003, § 5º, e 183)"}, da ciência tácita estimada em ${fmt(vg.tac)} (Lei 11.419/2006, art. 5º, § 3º). Se recorrer, contrarrazões em ${vg.jef?"10":"15"} dias; o recurso não suspende a tutela · ${tit}</small>`, edita:"", acao:""});
    const ct = contestacaoInss(x);
    if(ct && ct.ate>=somaDias(hj,-10)) linhas.push({data:ct.ate, ico:"👁", natureza:"lembrete", casoId:x.id, cru:true, rotulo:"Contestação do INSS", curto:"INSS contesta até",
      resumo:"prazo dele, estimado",
      rot:`<b>O INSS contesta até ${fmt(ct.ate)} (estimado)</b>
           <small class="qd-de">${ct.n} dias úteis${ct.jef?", sem prazo em dobro no JEF (Lei 10.259/2001, art. 9º)":" em dobro (CPC, art. 183)"}, da ciência tácita da citação estimada em ${fmt(ct.tac)} (Lei 11.419/2006, art. 5º, § 3º). Prazo da outra parte: confira a contestação e a proposta de acordo no dia útil seguinte · ${tit}</small>`, edita:"", acao:""});
    // F531 · a previsão de pagamento da RPV, calculada pelo CRM, saiu (decisão do Paulo, 11.11.2026: só o To Do dá data)
    // F236 · o honorário saiu daqui: é compromisso do caso DELE, logo abaixo, também no encerrado e no visual clássico
    // F102 · o comentário fixo com data lembra na data
    if(x.fixo && x.fixo.texto && x.fixo.lembrar_em) linhas.push({data:x.fixo.lembrar_em, ico:"📌", natureza:"lembrete", casoId:x.id, cru:true,
      resumo:cortaFrase(x.fixo.texto, 70),
      rot:`<b>${esc(x.fixo.texto.slice(0,110))}</b> <small class="qd-de">Comentário fixo · ${tit}</small>`,
      clique:`onclick="lcEditarFixo('${x.id}')"`, edita:"", acao:""});
    // F192 · o prazo do tribunal: vencido sem resposta fica vermelho; o que
    // não bate com o prazo fatal do caso oferece virar o prazo do caso
    // F236 · o prazo de um ato FAVORÁVEL (liminar ou tutela deferida, sentença procedente) é só ciência: cinza, sem o
    // "é o prazo do caso", que levava o caso a 🗓 Tarefas com Prazo por um recurso que não se fará
    for(const {p, dt, fav, resp} of tribs){
      const noControle = p.fim && x.prazo===p.fim, sis = ROT_PRAZO[p.sistema]||p.sistema;
      // F236 · respondido: a peça protocolada anotada depois da ciência; sai dos pendentes e fica como registro
      const l = resp ? {data:dt, ico:"✔", natureza:"lembrete", casoId:x.id, cru:true, rotulo:`Respondido no ${sis}`, curto:`${sis}: respondido`,
          resumo:`em ${fmtBarra(resp.em).slice(0,5)}${resp.quem?` · ${resp.quem}`:""}`,
          rot:`<b>Respondido em ${fmt(resp.em)} — ${esc(p.ato||"intimação")}${p.dias?` · ${p.dias} dias`:""}</b>
               <small class="qd-de">A equipe anotou a peça protocolada${resp.quem?` (${esc(resp.quem)})`:""} depois da ciência${p.ciencia_em?` de ${fmt(p.ciencia_em)}`:""}, dentro do prazo, que ia até ${fmt(p.fim)}; confira a juntada no processo · Prazo do ${esc(sis)} · ${esc(p.numero)}</small>`, edita:"", acao:""}
        : fav ? {data:dt, ico:"🔔", natureza:"lembrete", casoId:x.id, cru:true, rotulo:"Ciência (decisão favorável)", curto:"Ciência: favorável",
          resumo:fav.txt,
          rot:`<b>Ciência: ${esc(fav.txt)} — sem providência nossa</b>
               <small class="qd-de">Prazo do ${esc(sis)} · ${esc(p.ato||"intimação")}${p.dias?` · ${p.dias} dias`:""}${p.ciencia_em?` · ciência em ${fmt(p.ciencia_em)}`:""}${p.fim?` · vence ${fmt(p.fim)}`:""}. A decisão é favorável: quem pode recorrer é o INSS (fora do JEF, em dobro, CPC, art. 183); vigie o recurso dele · ${esc(p.numero)}</small>`, edita:"", acao:""}
        // F531 · decisão do Paulo (11.11.2026): o expediente do tribunal é aviso, nunca prazo fatal; o prazo vem do To Do
        : (lau => ({data:dt, ico:"🔔", natureza:"lembrete", casoId:x.id, cru:true,
          rotulo:`Aviso do ${sis}`, curto: lau ? "Manifestar sobre o laudo" : `${sis}: ${p.ato||"intimação"}`, laudo: lau,
          resumo:`${p.situacao==="findo"?"venceu sem resposta":p.fim?"":"ciência tácita"}${p.dias?`${p.situacao==="findo"||!p.fim?" · ":""}${p.dias} dias`:""}`,
          rot:`<b>${p.situacao==="findo"?"Venceu sem resposta — ":p.fim?"":"Ciência tácita — "}${esc(p.ato||"intimação")}${p.dias?` · ${p.dias} dias`:""}</b>
               <small class="qd-de">Prazo do ${esc(sis)} · ${esc(p.numero)}${p.texto?` · ${esc(p.texto.slice(0,120))}`:""} · lido em ${fmt(String(p.lido_em||"").slice(0,10))}${noControle?" · ✔ é o prazo do caso":""}</small>`,
          edita:"", acao:"", ...rotuloDeQuesitos(p, x)}))(laudoDoPrazo(p, x));   // F236 · quesitos: de que é e quem cuida
      // F236 · o prazo de manifestar sobre o laudo diz do que é e traz o laudo: a data, a conclusão e o botão de abrir
      if(l.laudo){ const lau = l.laudo, cc = conclusaoDoLaudo(lau.texto);
        l.resumo = `${sis}${p.dias?` · ${p.dias} dias`:""}`;
        l.rot += `<small class="qd-de">Laudo juntado em ${fmt(dataSP(lau.criado_em))}${cc?`: ${esc(cc)}`:""}</small>`;
        l.acao = `${l.acao||""}<button class="btn-mini" onclick="fecharCaixa();abrirAnexo('${lau.id}')" title="abre o laudo juntado no processo"><span aria-hidden="true">Laudo</span><span class="sr-only">abrir o laudo</span></button>`; }
      if(!fav && !resp && igualA==="trib" && p.fim===x.prazo && !l.tambem){ tambem(l); l.tambem=true; }
      linhas.push(l);
    }
    // F85 · o rótulo diz DE QUE é o prazo (o comentário que o criou), e o clique leva até ele. Sem origem, o "Concluir
    // em" do To Do (que é como o escritório marca prazo) fica no quadro em âmbar, perguntando do que é. F236 · o clássico
    // passa a mostrar o motivo e a pergunta também (antes só "PRAZO FATAL — nome do caso"); o mesmo dia de um prazo que
    // o CRM já conhece (recurso, exigência, tribunal) não repete a linha: vai junto dele (acima, "também no To Do")
    // F291 · a data do "Concluir por hoje" é a volta do cliente à fila, e não prazo fatal
    const desp = x.prazo && ((x.ronda||{}).despacho||{}).prazo===x.prazo ? x.ronda.despacho : null;
    if(desp){
      const por = D.colPorId.get(desp.por);
      linhas.push({data:x.prazo, ico:"↩", natureza:"lembrete", casoId:x.id, cru:true, rotulo:"Volta à fila", resumo:`concluído por hoje${por?` por ${por.nome.split(" ")[0]}`:""}`,
        rot:`<b>Volta à fila: ${tit}</b>
                  <small class="qd-de">Concluído por hoje${por?` por ${esc(por.nome.split(" ")[0])}`:""} em ${fmt(String(desp.em||"").slice(0,10))}</small>`,
        edita:`onchange="qdMudarPrazo('${x.id}',this.value)"`});
    }
    // 02.11.2026 · o "Concluir em" do To Do fora do 🗓 Tarefas com Prazo é retorno, e não prazo fatal (prazoEhRetorno)
    else if(x.prazo && !igualA && prazoEhRetorno(x)){
      linhas.push({data:x.prazo, ico:"↩", natureza:"lembrete", casoId:x.id, cru:true, rotulo:"Prazo do Microsoft To Do", todo:prazoDoTodo(x),
        resumo:og?cortaFrase(fraseDaData(og.texto, x.prazo), 70):"", andId:og?og.id:null,
        rot:`<b>Retorno: ${og ? esc(og.texto.slice(0,110))+(og.texto.length>110?"…":"") : tit}</b>
                  <small class="qd-de">Data de voltar ao caso, o “Concluir em” do To Do${og?` · anotado por ${esc(og.quem)} em ${fmt(og.em)}`:""}</small>`,
        clique:og?`onclick="qdIrParaAndamento('${x.id}','${og.id}')"`:"",
        edita:`onchange="qdMudarPrazo('${x.id}',this.value)"`});
    }
    else if(x.prazo && !igualA){
      const txtOg = og ? `${esc(og.texto.slice(0,110))}${og.texto.length>110?"…":""}` : "";
      // F236 · o resumo é a frase da anotação que fala desta data ("protocolamos até 23/10"), e não o começo dela
      linhas.push({data:x.prazo, ico:"⏰", ehPrazo:true, natureza:"fatal", casoId:x.id, cru:true, rotulo:"Prazo fatal", todo:prazoDoTodo(x),
        resumo:og?cortaFrase(fraseDaData(og.texto, x.prazo), 70):"",
        andId:og?og.id:null, semMotivo:!og,
        rot:og ? `<b>PRAZO FATAL: ${txtOg}</b>
                  <small class="qd-de">Prazo fatal${prazoDoTodo(x)?" do Microsoft To Do":""} · ${tit} · registrado por ${esc(og.quem)} em ${fmt(og.em)}</small>`
          : `<b>PRAZO FATAL: ${tit}</b>
                  <small class="qd-de qd-semmotivo">Sem descrição: clique para descrever este prazo</small>`,
        clique:og?`onclick="qdIrParaAndamento('${x.id}','${og.id}')"`:`onclick="explicarPrazo('${x.id}')"`,
        edita:`onchange="qdMudarPrazo('${x.id}',this.value)"`,
        acao:btCumprir, cumprir});
    }
    // F236 · o evento diz o tipo (julgamento não é perícia) e o que falta: avisar o cliente (ou quem já avisou),
    // e, passada a data sem confirmação, "aconteceu?" com as três respostas; a perícia que só o processo conhece
    // (data, hora e local no movimento, sem evento na agenda) entra como "agendar?"
    (D.eventos||[]).filter(e=>e.caso_id===x.id && e.status!=="cancelada").forEach(e=>{
      const d=dataSP(e.data_hora), passou=d<hj, t=tipoEv(e.tipo), julg=ehJulgamentoEv(e), semAv=!pedeAviso(e);
      if(passou && e.status!=="agendada") return;
      const av = !passou && !semAv && avisoDoEvento(e);
      // o rótulo é curto porque o quadro da coluna corta no vigésimo caractere; o resto vai no "saber mais"
      // (curto e resumo são os campos que o quadro da frente prazos lê: o nome à vista e o detalhe ao lado)
      const rotulo = passou ? (julg ? "Aconteceu?" : "Compareceu?") : semAv ? t : `${t.replace(/^Avaliação social$/,"Avaliação")} · ${av?"avisado":"avisar"}`;
      // F236 · a que passou é UMA linha "a confirmar": não venceu (fora da conta dos vencidos) e, quando o prazo de análise
      // está parado por ela, diz até quando o INSS decide se ela aconteceu. A futura do INSS diz o prazo que vai correr
      const par = passou && parado && parado.pendente===d && ehPericiaInss(e) ? parado : null;
      if(par) par.usado = true;
      const conf = julg ? "Confirmar o julgamento" : /^avalia/i.test(t) ? "Confirmar a avaliação" : /^audi/i.test(t) ? "Confirmar a audiência"
        : /^per[íi]cia/i.test(t) ? "Confirmar a perícia" : `Confirmar: ${t.toLowerCase()}`;
      const espM = String(x.especie||"").toUpperCase().slice(0,3), diasM = !passou && fe==="inss" && ehPericiaInss(e) && MORA_PERICIA.has(espM) ? MORA_DIAS[espM] : 0;
      linhas.push({data:d, ico:"🩺", natureza:"compromisso", casoId:x.id, cru:true, titulo:t, rotulo, curto:passou?conf:rotulo, ev:!passou && !/^atendimento/i.test(e.tipo||""), aConfirmar:passou,
        resumo: passou ? `${t.toLowerCase()} de ${fmtBarra(d).slice(0,5)}${par?` · feita, o INSS decide até ${fmtBarra(par.seFeita).slice(0,5)}`:""}` : `${horaSP(e.data_hora)}${e.local?` · ${e.local}`:""}`,
        rot:`<b>${esc(t)} ${passou?`de ${fmt(d)} — aconteceu? Confirme`:`em ${fmt(d)} às ${horaSP(e.data_hora)}`}</b>
             <small class="qd-de">${esc([e.local, passou ? provaDoComparecimento(e) : semAv ? "" : av ? `cliente avisado${av.quem?` por ${av.quem}`:""}${av.em?` em ${fmt(av.em)}`:""}` : "o cliente ainda não foi avisado", tituloCaso(x)].filter(Boolean).join(" · "))}</small>${
             par ? `<small class="qd-de">${notaParado(par, x)} Responda aqui mesmo (Compareceu, Não compareceu ou Remarcada) ou na aba Perícias.</small>`
             : diasM ? `<small class="qd-de">Feita a ${esc(t.toLowerCase())}, o INSS tem ${diasM} dias para decidir: até ${fmt(somaDias(d, diasM))} (acordo homologado no RE 1.171.152); o prazo só corre da perícia feita.</small>` : ""}`,
        clique:`onclick="abaAtiva=3;repintarFicha()"`, edita:"",
        acao: passou ? botoesDoPassado(e) : semAv ? ""
          : `${av?"":`<button class="btn-mini" onclick="fecharCaixa();janelaAvisado('${e.id}')" title="registrar que o cliente foi avisado">📞 avisado</button>`}<button class="btn-mini" onclick="fecharCaixa();prepararPericia('${e.id}')" title="o roteiro da perícia">preparar</button>`});
    });
    if(parado && !parado.usado) linhas.push(linhaParado());   // a pergunta sem o evento na tela (não deveria acontecer)
    periciasDoProcesso((D._andsFicha||[]).filter(a=>a.caso_id===x.id)).forEach(({a, ev})=>linhas.push({data:ev.data, ico:"🩺", natureza:"compromisso", casoId:x.id, cru:true,
      rotulo:`${ev.tipo} a agendar`, curto:`${ev.tipo} a agendar`, resumo:`${fmtBarra(ev.data).slice(0,5)} às ${ev.hora}`, titulo:`${ev.tipo} do processo`,
      rot:`<b>${esc(ev.tipo)} do processo em ${fmtBarra(ev.data).slice(0,5)} às ${ev.hora} — agendar?</b>
           <small class="qd-de">${esc([localNoTexto(a.texto), `movimento de ${fmt((movimentoJudicial(a.texto)||{}).data||dataSP(a.criado_em))}, ainda sem evento na agenda nem aviso ao cliente`, tituloCaso(x)].filter(Boolean).join(" · "))}</small>`,
      clique:`onclick="abaAtiva=3;repintarFicha()"`, edita:"",
      acao:`<button class="btn-mini" onclick="fecharCaixa();periciaRapida(${segRegistrar(x.id, a.texto, a.id)})" title="agenda na aba 🩺, com o aviso ao cliente hoje e a véspera, e abre o roteiro"><span aria-hidden="true">🩺 Agendar</span><span class="sr-only">🩺 agendar com aviso</span></button>`}));
  });
  // F236 · o honorário em aberto com vencimento é compromisso do caso DELE, mesmo encerrado (o caso que fechou com
  // parcela vencida a mostra), e nos dois visuais; a parcela sem caso de quem tem dois ou mais casos fica só na aba
  // Honorários, que pede o vínculo (antes ela virava compromisso do único caso aberto, de outro benefício)
  const idsCli = new Set(((D.casosDoCliente.get(cliId))||[]).map(y=>y.id));
  (D.pagamentos||[]).filter(pg=>pg.status==="aberto" && pg.vencimento && !valorSuspeito(pg) && (pg.cliente_id===cliId || idsCli.has(pg.caso_id)))
    .forEach(pg=>{
      const x = D.casoPorId.get(casoDoPgto(pg)); if(!x) return;
      const venceu = pg.vencimento<hj;
      linhas.push({data:pg.vencimento, ico:"💰", natureza:"compromisso", casoId:x.id, cru:true, rotulo:venceu?"Honorários a cobrar":"Honorários",
        rot:`<b>Honorários${venceu?" a cobrar":""} · ${pgSemValor(pg)?"a calcular":moedaBR(pg.valor)}</b> <small class="qd-de">${esc(origemPgto(pg))} · ${esc(tituloCaso(x))}${x.fase==="encerrado"?" (encerrado)":""}</small>`,
        clique:`onclick="abaAtiva=4;repintarFicha()"`, edita:"",
        acao: venceu && cobravel(pg) ? `<button class="btn-mini" onclick="abrirCobranca('${pg.id}')" title="mensagem de cobrança pronta">💬 cobrar</button>` : ""});
    });
  // F62 · o prazo fatal ADOTA o lembrete decorrente (pedido do Paulo: a
  // anotação com prazo cria duas datas — lembrar antes + data fatal — e as
  // duas soltas bagunçavam; agora ficam num grupo só, a filha aninhada na
  // mãe). A filiação é pelo carimbo "[PRAZO dd.mm.aaaa]" no texto da
  // tarefa/nota, casando com a data e o caso do prazo.
  linhas.filter(x=>x.ehPrazo).forEach(mae=>{
    mae.filhas=linhas.filter(f=>!f.ehPrazo && !f.adotada && f.textoCru &&
      f.textoCru.includes(`[PRAZO ${fmt(mae.data)}]`) &&
      (!f.casoId || f.casoId===mae.casoId));
    mae.filhas.forEach(f=>{ f.adotada=true;
      f.rot=f.rot.replace(/^[⏰🔥\s]*\[PRAZO [0-9.]+\]\s*/u,""); });
  });
  const soltas=linhas.filter(x=>!x.adotada);
  // o grupo ordena pela PRIMEIRA ação necessária (a menor data dele)
  const chave=x=>x.filhas&&x.filhas.length?[...x.filhas.map(f=>f.data),x.data].sort()[0]:x.data;
  soltas.sort((a,b)=>chave(a)<chave(b)?-1:1);
  // F84 · no tema, o que é PRAZO sobe para o topo do quadro, antes dos lembretes
  if(temaV10()) soltas.sort((a,b)=>(b.ehPrazo?1:0)-(a.ehPrazo?1:0) || (chave(a)<chave(b)?-1:1));
  return {linhas, soltas};
}
