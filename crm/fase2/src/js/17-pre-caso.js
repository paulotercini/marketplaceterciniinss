// o ⚡: a mesma leitura, mais livre (sem o verbo), e a data vira o lembrete do caso escolhido
function pintarCapturaAr(){
  const box = document.getElementById("ar-cap"), ta = document.getElementById("ar-texto"); if(!box || !ta) return;
  const cap = capturaDoTexto(ta.value, true);
  if(cap.estrela){ const ck = document.getElementById("ar-imp"); if(ck) ck.checked = true; }
  box.innerHTML = capChips(cap, "ar", cap.quem && cap.quem.id!==eu.id ? "tarefa" : "lembrete")
    + (cap.data && !((document.getElementById("ar-caso")||{}).value) ? ` <span class="meio-sub">o lembrete precisa do caso</span>` : "");
}
// F292 · prazoDespachar: a data lida no texto vira a volta à fila (Concluir por hoje), no lugar do lembrete
let prazoDetectado = null, prazoCancelado = false, prazoDespachar = false;
// concluir por hoje dispensa a tarefa: a chave Tarefa acesa (o padrão) se apaga, como no clique nela
function chipDespachar(){
  prazoDespachar = !prazoDespachar;
  if(prazoDespachar && tfNatureza==="compromisso" && document.getElementById("esc-pnl-tf")) tfNat("compromisso");
  pintarPrazoDoTexto(); pintarFrase();
}
function usarSugestao(el, k){
  if(el.dataset.acao==="exigencia") return abrirExigencia();
  const texto = el.textContent.trim();
  const inp=document.getElementById("and-texto");
  if(/__/.test(texto)) return montarPreenchimento(texto);
  const kk = k || D.casoPorId.get(casoSel) || {};
  // marca e desmarca, como no encaminhamento: um andamento pede duas coisas
  // de uma vez com frequência, e a segunda não pode apagar a primeira
  alternarFrase(inp, texto, [...ANOTACOES, ...sugestoes(kk).map(s=>s.texto)]);
  inp.focus();
  inp.style.height="auto"; inp.style.height=Math.min(inp.scrollHeight,220)+"px";
  prazoCancelado=false; pintarPrazoDoTexto(); pintarSugestoes(kk);
}

// ── Datas prováveis de aposentadoria ─────────────────────────────────────
// O cliente que hoje pede auxílio-doença vai se aposentar um dia, e o
// escritório que lembra disso três meses antes tem tempo de chamar, juntar
// documento e protocolar sem correria. Cada data vira um lembrete na agenda.
//
// A aposentadoria por IDADE o sistema calcula sozinho da data de nascimento:
// 62 anos para mulher, 65 para homem (EC 103/2019, com a transição da idade
// da mulher já concluída). Vem sempre marcada como automática — carência,
// regra de transição e direito adquirido não cabem numa conta de idade.
const IDADE_APOS = {F:62, M:65};
const ESPECIES_APOS = ["Idade","Tempo de Contribuição","Idade rural","Especial",
                       "Professor","Pessoa com deficiência","Invalidez"];
const MESES_AVISO = 3;                       // o lembrete cai 3 meses antes

// dn é DDMMAAAA (formato do To Do); devolve AAAA-MM-DD
function dnIso(dn){
  // a ficha guarda DDMMAAAA, mas há fichas gravadas em AAAA-MM-DD
  if(/^\d{4}-\d{2}-\d{2}/.test(dn||"")) return dn.slice(0,10);
  const d=(dn||"").replace(/\D/g,"");
  if(d.length!==8) return null;
  const iso=`${d.slice(4)}-${d.slice(2,4)}-${d.slice(0,2)}`;
  return isNaN(new Date(iso+"T12:00:00")) ? null : iso;
}
function somarAnos(iso, anos){
  const [a,m,d]=iso.split("-").map(Number);
  const dt=new Date(a+anos, m-1, d, 12);
  // 29/02 em ano não bissexto cai no dia 1º de março; puxar para 28/02
  if(dt.getMonth()!==m-1) dt.setDate(0);
  return dt.toLocaleDateString("sv");
}
function menosMeses(iso, meses){
  const [a,m,d]=iso.split("-").map(Number);
  const dt=new Date(a, m-1-meses, d, 12);
  if(dt.getDate()!==d) dt.setDate(0);        // 31 num mês de 30 dias
  return dt.toLocaleDateString("sv");
}
// lembrete em fim de semana não é lembrete: ninguém abre o sistema no
// sábado. Puxa para a sexta anterior — antecipar mantém a antecedência,
// adiar comeria o prazo que o aviso existe para dar.
function diaUtilAntes(iso){
  const dt=new Date(iso+"T12:00:00");
  const dow=dt.getDay();
  if(dow===6) dt.setDate(dt.getDate()-1);          // sábado -> sexta
  else if(dow===0) dt.setDate(dt.getDate()-2);     // domingo -> sexta
  return dt.toLocaleDateString("sv");
}
// a data do aviso de uma aposentadoria: três meses antes, em dia útil
function avisoApos(data){ return diaUtilAntes(menosMeses(data, MESES_AVISO)); }
// idade completa hoje, para mostrar junto do nascimento
function idadeDe(dn){ return idadeEm(dn, hoje()); }
// F128 · a idade numa data qualquer (a da análise de direito, por exemplo)
function idadeEm(dn, dataIso){
  const iso=dnIso(dn); if(!iso || !dataIso) return null;
  const [a,m,d]=iso.split("-").map(Number), h=String(dataIso).slice(0,10).split("-").map(Number);
  let anos=h[0]-a;
  if(h[1]<m || (h[1]===m && h[2]<d)) anos--;
  return anos>=0 && anos<130 ? anos : null;
}
// ── Homem ou mulher pelo primeiro nome ───────────────────────────────────
// O sistema decide sozinho, e a decisão vale para calcular a aposentadoria
// por idade. Em nome brasileiro a terminação resolve a maioria; o resto sai
// pelas listas abaixo. Continua sendo palpite: a caixa mostra que foi
// automático e um clique corrige — e o que o colaborador confirma passa a
// valer sobre qualquer regra.
const NOMES_M = new Set([
  // masculinos terminados em A, que a regra da terminação erraria
  "joca","juca","nicola","luca","noa","bandeira","dandara-nao",
  "jeova","jeremias","josias","zacarias","elias","tobias","matias","isaias",
  "cassia-nao","sena","lima","costa","silva","viana","rocha","cunha","barbosa",
  // terminados em E/consoante que a regra deixaria passar como dúvida
  "jose","luiz","luis","vicente","clemente","abel","daniel","gabriel","manuel",
  "miguel","rafael","ismael","israel","joel","nael","samuel","ariel","maciel",
  "valdir","nadir-nao","edir","alcir","altair","nivaldo","waldir","clair-nao",
  "cesar","valter","walter","wilder","alexandre","andre","felipe","henrique",
  "jorge","enrique","aristides","mendes","fernandes","moises","tales","jules",
  "everton","anderson","wilson","nelson","edson","jefferson","robson","adilson",
  "gerson","emerson","alisson","cleiton","gilson","claudio-nao",
]);
const NOMES_F = new Set([
  // femininos que NÃO terminam em A
  "beatriz","raquel","isabel","ester","esther","ines","ivete","solange","alice",
  "adriane","cristiane","luciane","josiane","rosiane","daiane","tatiane","viviane",
  "carmem","miriam","mirian","meire","nair","conceicao","assuncao","encarnacao",
  "doralice","eunice","berenice","clarice","marlene","marilene","darlene","irene",
  "helen","hellen","karen","karin","dulce","gorete","ivone","simone","edione",
  "cleide","neide","adelaide","judite","edite","mercedes","lourdes","noemi",
  "naomi","ruth","rute","judith","liz","ingrid","astrid","cris","bete","zilda-nao",
  "elizabeth","elisabeth","meire","nice","jaqueline","jacqueline","evelyn","marilyn",
  "kelly","shirley","wesley-nao","cleusa-nao","madalena-nao","nadir","clair","cassia",
  "dandara","zulmira-nao",
]);
const _limpaLista = st => new Set([...st].filter(n=>!n.endsWith("-nao")));
const M_NOMES = _limpaLista(NOMES_M), F_NOMES = _limpaLista(NOMES_F);
function palpiteSexo(nome){
  const partes = dsa((nome||"").trim()).split(/\s+/).filter(Boolean);
  const p = partes[0] || "";
  if(!p) return null;
  if(M_NOMES.has(p)) return "M";
  if(F_NOMES.has(p)) return "F";
  // nomes compostos: "Maria José" é mulher, "José Maria" é homem — quem manda
  // é o primeiro. Mas "Ana Paulo" não existe: se o primeiro não decidir,
  // o segundo ajuda.
  if(/a$/.test(p)) return "F";        // Maria, Ana, Silvana, Rita, Benedita
  if(/[oó]$/.test(p)) return "M";     // João, Pedro, Marcos, Benedito, Antônio
  if(/(ei|ey|eu)$/.test(p)) return "M";                    // Sidnei, Wesley, Mateu
  if(/(ete|ide|lde|ina|ine|isa|ise|elly|lyn|li|mi|ni|iany|any)$/.test(p)) return "F";  // Marli, Elaine, Ivanilde
  if(/(son|ton|ilson|inho|aldo|ardo|erto|ilto|imo|ir|or|ur|az|iz|is|es|os|el|ez)$/.test(p)) return "M";  // Marcos, Carlos
  // Nada de deduzir pelo segundo nome quando ele é sobrenome: Souza, Silva,
  // Costa, Rocha e Barbosa acabam em A e fariam todo Wesley virar mulher.
  const seg = partes[1] || "";
  if(F_NOMES.has(seg)) return "F";
  if(M_NOMES.has(seg)) return "M";
  return null;                        // raríssimo: aí sim a caixa pergunta
}
// Quem é o sexo deste cliente: o confirmado à mão manda; senão, o palpite
function sexoDe(cli){ return cli.sexo || palpiteSexo(cli.nome); }

// Cliente que JÁ tinha a idade antes desta data provavelmente já se
// aposentou por idade — anunciar isso como "provável" só polui a ficha. A
// data é do dia em que a carteira antiga foi varrida; para quem completar a
// idade daqui para frente, o aviso continua valendo.
const APOS_IDADE_CORTE = "2026-07-31";
function dataIdadeApos(cli){
  const nasc=dnIso(cli.dn); if(!nasc) return null;
  const sexo=sexoDe(cli); if(!sexo) return null;
  return somarAnos(nasc, IDADE_APOS[sexo]);
}
// true quando a idade já tinha chegado antes do corte: não é previsão, é passado
function idadeJaPassou(cli){
  const d=dataIdadeApos(cli);
  return !!d && d <= APOS_IDADE_CORTE;
}
function aposAutomatica(cli){
  // quem JÁ é aposentado não tem aposentadoria "provável": a Marcia (tempo
  // de contribuição) ficava no Meu Dia como se fosse aposentar por idade
  if(cli.aposentado===true) return null;
  const data=dataIdadeApos(cli); if(!data) return null;
  if(data <= APOS_IDADE_CORTE) return null;        // já passou: não é provável
  return {id:"auto", cliente_id:cli.id, data, especie:"Idade", automatica:true,
          sexoUsado:sexoDe(cli), suposto:!cli.sexo};
}
// as gravadas + a automática, salvo quando já existe uma "Idade" à mão
function aposDoCliente(cli){
  const manuais=(D.apos||[]).filter(a=>a.cliente_id===cli.id);
  const auto=aposAutomatica(cli);
  const lista=[...manuais];
  // teste 11.88, TRI-06: "Aposentadoria por idade" escrita à mão ou o card de Aposentadorias futuras também é a por idade
  const ehIdade = t => /\bidade\b/.test(dsa(t||"")) && !/hibrid|rural|deficien|pcd/.test(dsa(t||""));
  if(auto && !manuais.some(a=>ehIdade(a.especie)) && !lembretesDo(cli.id).some(l=>l.tipo==="aposentadoria_futura" && ehIdade(l.titulo)))
    lista.push(auto);
  return lista.sort((x,y)=>x.data<y.data?-1:1);
}
// todos os lembretes de aposentadoria do escritório, para a agenda.
// `lembrar_em` escolhido à mão MANDA no aviso: adiou, o item some do Meu Dia
// e só volta na data combinada — sem isso, "Aposentadorias a tratar" virava
// lista permanente de quem já foi tratado.
function lembretesApos(){
  const fora=new Set((D.apos||[]).filter(a=>dsa(a.especie)==="idade").map(a=>a.cliente_id));
  const itens=[];
  // marcado como já aposentado = fim do assunto: nem a data gravada à mão
  // lembra mais (o botão "não está" na ficha desfaz, se foi engano)
  // F236 · com a aposentadoria em caso aberto (o pedido já saiu), o aviso perde o objeto
  (D.apos||[]).forEach(a=>{ const c=D.cliPorId.get(a.cliente_id);
    if(c && c.aposentado!==true && !casoAposAtivo(c.id, true))
      itens.push({...a, cliente:c, aviso:a.lembrar_em||avisoApos(a.data)}); });
  (D.clientes||[]).forEach(c=>{
    if(fora.has(c.id) || casoAposAtivo(c.id, true)) return;
    const auto=aposAutomatica(c);
    if(auto) itens.push({...auto, cliente:c, aviso:avisoApos(auto.data)});
  });
  return itens;
}
// adiar o aviso. Na automática ainda não há linha no banco: grava uma
// (mesma data e espécie — o que o "ajustar" faria), já com o lembrete; a
// manual só recebe o lembrar_em. Materializada, a automática se cala sozinha
// (aposDoCliente descarta a auto quando existe "Idade" à mão).
async function lembrarApos(cliId, aposId, data, especie, quando){
  if(!quando) return;
  try{
    if(aposId && aposId!=="auto"){
      await api(`/rest/v1/aposentadorias?id=eq.${aposId}`,{method:"PATCH",
        headers:{Prefer:"return=minimal"}, body:JSON.stringify({lembrar_em:quando})});
      const a=(D.apos||[]).find(x=>x.id===aposId); if(a) a.lembrar_em=quando;
    }else{
      const [a]=await api(`/rest/v1/aposentadorias`,{method:"POST",
        headers:{Prefer:"return=representation"},
        body:JSON.stringify({cliente_id:cliId, data, especie, autor_id:eu.id,
                             lembrar_em:quando})});
      if(a) (D.apos=D.apos||[]).push(a);
    }
  }catch(e){ return aviso("Rode o crm/fase2/schema_por_em_dia.sql no Supabase — falta a coluna 'lembrar_em'"); }
  aviso(`🗓 Combinado — volta a lembrar em ${fmt(quando)}`, false);
  montarSidebar(); render();
  if(clienteAberto) abrirFicha(clienteAberto);
}
// no Meu Dia: o aviso que já chegou a hora. Sem isto o lembrete ficaria só
// no calendário, e calendário só ajuda quem lembra de abrir
// F123 · o aviso de aposentadoria É lembrete, e lembrete vencido entra na
// lista única do que vence hoje. Por isso esta função devolve só as LINHAS,
// sem título de seção própria: quem monta o título é o Meu Dia.
// [BUG 20.09.2026] devolve SEPARADO o que vence hoje e o que venceu antes. O
// aviso de aposentadoria nasce meses antes da data do direito, então quase
// todo ele está atrasado: jogado inteiro em "Vencem hoje", enchia a tela de
// gente que não vence nada hoje. Atrasado é atrasado, e mora no 🔴 vencidas.
function itensApos(){
  const chegou=lembretesApos().filter(a=>a.aviso<=hoje())
    .sort((x,y)=>x.data<y.data?-1:1);
  const linha = a=>`<div class="cartao" data-cli="${a.cliente.id}">
      <span class="check" style="border-color:var(--verde)"></span>
      <div class="info"><div class="nome">${esc(a.cliente.nome)}</div>
        <div class="meta"><span class="chip fase">${esc(a.especie)}</span>
          <span>${a.data<=hoje()?"✓ <b>já tem direito</b> desde":"direito em"} <b>${fmt(a.data)}</b></span>
          ${a.automatica?`<span class="chip neutro">automática — confira</span>`:""}
          ${a.cliente.telefone?`<a class="chip per" href="https://wa.me/55${a.cliente.telefone.replace(/\D/g,"")}"
             target="_blank" rel="noopener" onclick="event.stopPropagation()">💬 chamar</a>`:""}</div>
      </div>
      ${/* as duas saídas desta lista, ali mesmo: adiar (volta na data) ou
           dizer que a pessoa JÁ se aposentou (sai de vez — caso da Marcia,
           aposentada por tempo de contribuição antes da data projetada) */""}
      <button class="btn-mini" style="flex:none" title="já se aposentou (ex.: por tempo de contribuição) — sai desta lista de vez; desfaz-se na ficha"
        onclick="event.stopPropagation();marcarAposentado('${a.cliente.id}',1)"><span aria-hidden="true">✔ Aposentado</span><span class="sr-only">✔ já aposentado</span></button>
      <span class="lembrar-caixa" onclick="event.stopPropagation()"
        title="adiar: some daqui e volta na data escolhida">🗓 Lembrar em
        <input type="date" min="${hoje()}" value="${a.lembrar_em||""}"
          onchange="lembrarApos('${a.cliente.id}','${a.id}','${a.data}','${esc(a.especie)}',this.value)"></span>
      </div>`;
  return { hoje: chegou.filter(a=>a.aviso===hoje()).map(linha),
           antes: chegou.filter(a=>a.aviso<hoje()).map(linha) };
}
// ── LOAS idoso e o CadÚnico ──────────────────────────────────────────────
// O BPC do idoso (65 anos, para homem e mulher) exige CadÚnico em dia: ele
// vence a cada dois anos e o benefício é bloqueado sem atualização. O aviso
// precisa sobreviver ao encerramento do caso — encerrado aqui só quer dizer
// que o NOSSO trabalho acabou; o do cliente continua.
const CADUNICO_ANOS = 2;
const IDADE_LOAS_IDOSO = 65;
function ehLoas(k){ return /loas|bpc|assistencial|amparo social/i.test(
  (k.beneficio||"") + " " + (k.titulo||"")); }
function ehLoasIdoso(k, cli){
  if(!ehLoas(k)) return false;
  const i=idadeDe(cli && cli.dn);
  return i!=null && i>=IDADE_LOAS_IDOSO;
}
// P5 (prazos, 31.10.2026) · vale para todo BPC, do idoso e da pessoa com deficiência (Lei 8.742/93, art. 20, § 12: o
// CadÚnico é requisito da concessão, da manutenção e da revisão). Sem a data anotada no caso, vale a atualização que a
// extensão leu no Meu CadÚnico (dossie.cadunico.familia.atualizada_em)
function baseCadunico(k){
  if(!k) return null;
  if(k.cadunico) return k.cadunico;
  const fz = familiaCadunico(D.cliPorId.get(k.cliente_id)), at = fz && fz.atualizada_em;
  return at ? (isoBr(at) || (/^\d{4}-\d{2}-\d{2}/.test(String(at)) ? String(at).slice(0,10) : null)) : null;
}
function renovaCadunico(k){                       // a data em que vence
  const b = baseCadunico(k);
  return b ? somarAnos(b, CADUNICO_ANOS) : null;
}
// a renovação do CadÚnico de quem tem BPC, uma vez por cliente (o caso mais recente), quando não há lembrete dele
function cadunicoDoCliente(cliId){
  const ks = (D.casosDoCliente.get(cliId)||[]).filter(k=>ehLoas(k) && !ehPreCaso(k) && renovaCadunico(k));
  if(!ks.length || (D.lembretes||[]).some(l=>l.cliente_id===cliId && l.tipo==="cadunico" && l.ativo!==false)) return null;
  const k = ks.sort((a, b)=>String(b.criado_em||"").localeCompare(String(a.criado_em||"")))[0];
  return {k, ate:renovaCadunico(k), base:baseCadunico(k), doDossie:!k.cadunico};
}
function msgCadunico(cli, k){
  const venc=renovaCadunico(k);
  const nome=(cli.nome||"").split(/\s+/)[0];
  return `Olá, ${nome}! Aqui é do escritório Paulo R. Tercini Filho.\n\n`+
    `Seu benefício de BPC/LOAS exige o Cadastro Único (CadÚnico) atualizado a cada 2 anos. `+
    (venc ? `O seu vence em ${fmt(venc)}.\n\n` : `\n\n`)+
    `Procure o CRAS do seu bairro com RG, CPF, comprovante de residência e os documentos `+
    `de quem mora com você, e peça a ATUALIZAÇÃO CADASTRAL. Sem isso o INSS pode bloquear o pagamento.\n\n`+
    `Qualquer dúvida, fale com a gente. 🙏`;
}
function caixaCadunico(k, cli){
  if(!ehLoas(k)) return "";
  const venc=renovaCadunico(k);
  const dias=venc ? diasAte(venc) : null;
  const estado = !venc ? "sem" : dias<0 ? "venc" : dias<=90 ? "perto" : "ok";
  const tel=(cli.telefone||"").replace(/\D/g,"");
  return `<div class="cad-cx ${estado}">
    <div class="cad-cab"><strong>${ehLoasIdoso(k, cli) ? "🧓 BPC do idoso" : "BPC da pessoa com deficiência"}</strong>
      <span class="cad-sub">CadÚnico precisa ser renovado a cada ${CADUNICO_ANOS} anos</span></div>
    <div class="form-linha" style="align-items:center;margin:8px 0 0">
      <label class="cad-lb">Última atualização:
        <input type="date" value="${k.cadunico||""}" onchange="salvarCadunico('${k.id}',this.value)"></label>
      ${venc ? `<span class="cad-venc ${estado}">${
          dias<0 ? `⚠ venceu em ${fmt(venc)} (há ${-dias} dias)`
        : dias===0 ? `⚠ vence hoje`
        : `🗓 renovar até ${fmt(venc)} (${dias} dias)`}</span>`
        : `<span class="meio-sub">informe a data para o sistema lembrar</span>`}
      ${tel ? `<a class="btn-mini" target="_blank" rel="noopener" style="text-decoration:none"
        href="https://wa.me/55${tel}?text=${encodeURIComponent(msgCadunico(cli,k))}"
        title="abre o WhatsApp com a mensagem pronta">💬 avisar do CadÚnico</a>`
        : `<button class="btn-mini" onclick="copiarMsgCadunico('${cli.id}','${k.id}')" title="💬 copiar mensagem"><span aria-hidden="true">💬 Copiar</span><span class="sr-only">💬 copiar mensagem</span></button>`}
    </div>
  </div>`;
}
// F10 · o CadÚnico deixou de ser só uma data dentro do caso. Ele vira lembrete
// de verdade: entra na aba 🔔, na agenda e no calendário, repete a cada 24
// meses sozinho e guarda quem avisou o cliente e quando. O bloco calculado do
// Meu Dia continua existindo para os casos antigos, que ainda não têm linha.
async function sincronizarLembreteCadunico(k){
  const venc = renovaCadunico(k);
  const jah = (D.lembretes||[]).find(l=>l.origem_caso===k.id && l.tipo==="cadunico");
  try{
    if(!venc){                       // apagaram a data: o lembrete sai de cena
      if(jah && jah.ativo!==false){
        await api(`/rest/v1/lembretes?id=eq.${jah.id}`,{method:"PATCH",
          headers:{Prefer:"return=minimal"}, body:JSON.stringify({ativo:false})});
        jah.ativo = false;
      }
      return null;
    }
    if(jah){
      await api(`/rest/v1/lembretes?id=eq.${jah.id}`,{method:"PATCH",
        headers:{Prefer:"return=minimal"}, body:JSON.stringify({proximo_em:venc, ativo:true})});
      jah.proximo_em = venc; jah.ativo = true;
      return jah;
    }
    const [l] = await api(`/rest/v1/lembretes`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({cliente_id:k.cliente_id, tipo:"cadunico",
        titulo:"CadÚnico — atualizar no CRAS", intervalo_meses:CADUNICO_ANOS*12,
        proximo_em:venc, origem_caso:k.id, criado_por:eu.id})});
    if(l) (D.lembretes=D.lembretes||[]).push(l);
    return l;
  }catch(e){ return null; }        // banco atrasado: a data fica guardada mesmo assim
}
async function salvarCadunico(casoId, valor){
  const k=D.casoPorId.get(casoId); if(!k) return;
  k.cadunico = valor || null;
  try{
    await patchCaso(casoId, {cadunico:k.cadunico});
  }catch(e){ return aviso("Rode o schema.sql mais novo no Supabase para usar o CadÚnico"); }
  const l = await sincronizarLembreteCadunico(k);
  const v=renovaCadunico(k);
  aviso(v ? `CadÚnico guardado — ${l?"lembrete de 2 anos criado, renovar até":"renovar até"} ${fmt(v)}`
          : "Data do CadÚnico apagada");
  montarSidebar();
  if(clienteAberto) abrirFicha(clienteAberto);
}
function copiarMsgCadunico(cliId, casoId){
  const cli=D.cliPorId.get(cliId), k=D.casoPorId.get(casoId);
  if(cli&&k) copiar(msgCadunico(cli,k), "Mensagem do CadÚnico copiada 💬");
}

// ── Último toque pelo WhatsApp ────────────────────────────────────────────
// O webhook do SMBot avisa QUE a pessoa falou, não o que ela disse — o
// conteúdo fica no painel deles. O que o CRM precisa mostrar, então, é o
// "quando": ninguém deixa de responder porque a mensagem morreu num painel
// que só uma pessoa abre.
// A ponte (zap_conversas) traz a conversa inteira: aí a ficha mostra a última
// mensagem e leva direto à conversa. O SMBot fica como plano B.
function ultimoZap(){
  const p=(D.zapFicha||[])[0];
  if(p) return `<div class="zap-ping">💬 WhatsApp${p.ultima_em?` em ${fmtTS(p.ultima_em)} às ${horaSP(p.ultima_em)}`:""}`
    + (p.ultimo_texto?`: “${esc(p.ultimo_texto.slice(0,70))}${p.ultimo_texto.length>70?"…":""}”`:"")
    + (p.nao_lidas?` <span class="chip">${p.nao_lidas} não lida${p.nao_lidas>1?"s":""}</span>`:"")
    + ` <button class="btn-mini" onclick="verZapCliente(clienteAberto)" title="ler mensagens"><span aria-hidden="true">Mensagens</span><span class="sr-only">ler mensagens</span></button></div>`;
  const z=(D.convFicha||[])[0];
  if(!z) return "";
  const quando=`${fmtTS(z.criado_em)} às ${horaSP(z.criado_em)}`;
  return `<div class="zap-ping" title="${z.texto?"conteúdo registrado no CRM":"o conteúdo da conversa fica no painel do SMBot"}">`
    + `💬 falou pelo WhatsApp em ${quando}`
    + (z.texto?`: “${esc(z.texto.slice(0,70))}${z.texto.length>70?"…":""}”`:"")+`</div>`;
}

// ── Esteira de revisão: nenhum processo fica 90 dias sem um olhar ─────────
// A mineração das fichas mostrou mediana de 114 dias sem registro. A regra é
// simples: passou de N dias, entra na fila; a fila é servida em DOSES — cinco
// por dia comem qualquer acervo em poucas semanas, sem afogar ninguém.
// F236 · o último registro de alguém da equipe: o "revisado" ou a anotação dos últimos 30 dias (o que os
// robôs gravam, PAT, CRPS, PJe, não é revisão de ninguém)
let _ultReg = null;
function ultimoRegistro(k){
  if(!_ultReg){
    _ultReg = new Map();
    queueMicrotask(()=>{ _ultReg = null; });   // shortcut: vale a passada síncrona da tela
    for(const a of (D.and30||[])) if(a.autor_id && !ORIGENS_ROBO.includes(a.origem)){
      const d = dataSP(a.criado_em); if(!_ultReg.has(a.caso_id) || _ultReg.get(a.caso_id)<d) _ultReg.set(a.caso_id, d); }
  }
  return [k.revisado_em, _ultReg.get(k.id)].filter(Boolean).sort().pop() || null;
}
function blocoRevisao(){
  const dias = +(cfgApp("revisao_dias")||90), dose = +(cfgApp("revisao_dose")||5);
  const lim = (()=>{ const d=new Date(hoje()+"T12:00:00");
                     d.setDate(d.getDate()-dias); return d.toLocaleDateString("sv"); })();
  const fila = ativos().filter(k=>{ const u=ultimoRegistro(k); return !u || u<=lim; })
    .sort((a,b)=>(ultimoRegistro(a)||"0")<(ultimoRegistro(b)||"0")?-1:1);
  if(!fila.length) return "";
  const grupos = grupoClientes(fila);
  const doseG = grupos.slice(0, dose);
  return `<h3 class="secao">🔄 Revisão do acervo: a dose de hoje (${doseG.length} de ${grupos.length} na fila)</h3>
    <p class="meio-sub">Processos sem anotação da equipe nos últimos 30 dias e sem revisão nos últimos ${dias}, os mais parados primeiro.
       Abrir e comentar conta como revisão — ou marque que nada mudou.</p>
    ${doseG.map(([c,kk])=>`<div class="rev-par">${cartaoCliente(c,kk)}
      <div class="rev-acao"><span class="meio-sub">último registro da equipe:
        ${(u=>u?fmt(u):"nenhum nos últimos 30 dias")(ultimoRegistro(kk[0]))}</span>
        <button class="btn-mini" data-revks="${kk.map(k=>k.id).join(",")}">✔ revisado, nada mudou</button>
      </div></div>`).join("")}`;
}
async function marcarRevisado(ids){
  for(const id of ids){
    const [and]=await api(`/rest/v1/andamentos`,{method:"POST",
      headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:id, autor_id:eu.id,
        texto:"🔄 Revisão do acervo — sem novidade."})}).catch(()=>[]);
    if(and) await api(`/rest/v1/andamentos_lidos`,{method:"POST",
      headers:{Prefer:"return=minimal,resolution=merge-duplicates"},
      body:JSON.stringify({andamento_id:and.id, colaborador_id:eu.id})}).catch(()=>{});
    const k=D.casoPorId.get(id); if(k) k.revisado_em=hoje();
  }
  plim(); aviso("Revisado ✔ — o próximo da fila assume amanhã", false);
  render();
}

// A rede por baixo da rede: a obrigatoriedade garante que cada COMENTÁRIO
// fez uma escolha; esta lista garante que cada PROCESSO tenha um próximo
// passo. Ativo, sem tarefa aberta e sem lembrete = à deriva.
// quando o crachá do gov.br vence, o robô do CRPS para — um lembrete discreto
// no Meu Dia evita que os recursos fiquem dias sem atualizar sem ninguém notar.
function avisoCRPS(){
  if((cfgApp("crps_estado")||"")!=="vencido") return "";
  return `<div class="sem-acao" style="background:#FDECEA;border-color:#F5C6C0">
    <b>🖥 Recurso (CRPS): crachá vencido.</b> O robô parou de atualizar os recursos.
    <button class="btn-mini" onclick="visao='config';render()" title="renovar o crachá"><span aria-hidden="true">Renovar</span><span class="sr-only">renovar o crachá</span></button></div>`;
}
function blocoSemAcao(){
  const ks = ativos().filter(k=>!k.prazo && !k.exigencia_prazo
    && !(D.tarefasPorCaso.get(k.id)||[]).length);
  if(!ks.length) return "";
  const grupos = grupoClientes(ks);
  return `<details class="sem-acao"><summary>🧭 Sem próxima ação (${grupos.length} cliente${grupos.length>1?"s":""}):
      processos sem tarefa aberta e sem lembrete</summary>
    ${grupos.slice(0,10).map(([c,kk])=>cartaoCliente(c,kk)).join("")}
    ${grupos.length>10?`<p class="meio-sub">…e mais ${grupos.length-10}. Abra cada um e registre um comentário com tarefa.</p>`:""}
  </details>`;
}

// F9.3 · A FILA DO ENDEREÇO
// Cliente com processo em andamento e sem endereço nenhum. São 1.890
// cadastros zerados: sem uma fila, o preenchimento depende de alguém lembrar
// cliente a cliente, e toda procuração desses sai com a linha da rua em
// branco. Fica em Cuidar do acervo porque é exatamente isso, trabalho sem
// data que rende quando sobra tempo.
//
// De propósito FORA do contador da barra lateral (quantosNoAcervo): são
// centenas, o número não cairia tão cedo, e um selo permanente de três
// dígitos vira paisagem em uma semana.
function blocoSemEndereco(){
  const clis = [...new Set(ativos().map(k=>k.cliente_id))]
    .map(id=>D.cliPorId.get(id))
    .filter(c=>c && !enderecoLinha(c))
    .sort((a,b)=>(a.nome||"")<(b.nome||"")?-1:1);
  if(!clis.length) return "";
  const mostra = clis.slice(0,25);
  return `<details class="sem-acao neutro"><summary>Sem endereço no cadastro (${clis.length} cliente${
      clis.length>1?"s":""}): a procuração e o contrato desses saem com a linha da rua em branco</summary>
    <div class="form-linha" style="margin:8px 0 4px;align-items:center">
      <span class="meio-sub" style="flex:1">O botão abre a ficha com os sete campos já abertos.
        Com o CEP em mãos, são dois cliques e o número da casa.</span>
      <button class="btn-mini" onclick="janelaImportarEnderecos()"
        title="colar uma planilha de CPF e endereço e gravar em lote"><span aria-hidden="true">Importar</span><span class="sr-only">importar de uma planilha</span></button>
    </div>
    ${mostra.map(c=>`<div class="caso" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <span class="titulo-caso" style="cursor:pointer" onclick="abrirFicha('${c.id}')"
        title="abrir a ficha">${esc(c.nome)}</span>
      <span class="meio-sub">${c.cpf?fmtCpf(c.cpf):"sem CPF"}</span>
      <button class="btn-mini" style="margin-left:auto"
        onclick="preencherEnderecoDe('${c.id}')" title="preencher endereço"><span aria-hidden="true">Endereço</span><span class="sr-only">preencher endereço</span></button>
    </div>`).join("")}
    ${clis.length>mostra.length?`<p class="meio-sub">…e mais ${clis.length-mostra.length}.
      A lista encurta sozinha conforme os endereços entram.</p>`:""}
  </details>`;
}
// da fila direto para o campo: abre a ficha, vai para a Identificação e já
// deixa o editor do endereço aberto, com o cursor no CEP
async function preencherEnderecoDe(cliId){
  await abrirFicha(cliId);
  abaAtiva = 0; subCad = "identificacao";
  repintarFicha();
  editarEndereco(cliId);
}

// no Meu Dia: os recursos que o robô não enxerga e alguém tem de abrir no
// site. É o que hoje mora no To Do como "André, verificar semanalmente" — a
// diferença é que aqui a lista se refaz sozinha e some quando é conferida,
// em vez de acumular uma anotação "sem andamento" por semana.
function blocoCrpsManual(){
  const itens = [];
  (D.casos||[]).forEach(k=>{
    if(k.fase==="encerrado") return;
    for(const b of crpsBlocos(k)){
      if(!b.manual) continue;
      const c = b.consulta||{};
      if(filtroColab && c.responsavel_id !== filtroColab) continue;
      if(c.proxima && c.proxima > hoje()) continue;
      itens.push({k, b, c, cli:D.cliPorId.get(k.cliente_id)});
    }
  });
  if(!itens.length) return "";
  itens.sort((x,y)=>((x.c.proxima||"")<(y.c.proxima||"")?-1:1));
  return `<div class="caso man-dia">
    <div class="rotulo-caso">🔎 Consultar no e-Recursos (${itens.length})
      — recursos que o robô não enxerga</div>
    ${itens.map(({k,b,c,cli})=>{
      const co = c.responsavel_id && D.colPorId.get(c.responsavel_id);
      const atras = c.proxima && c.proxima < hoje();
      return `<div class="man-item">
        ${co?`<span class="avatar mini" style="background:${co.cor}" title="${esc(co.nome)}">${esc(co.inicial)}</span>`
            :`<span class="avatar mini" style="background:#a19f9d" title="sem responsável">?</span>`}
        <button class="man-nome" onclick="abrirFicha('${k.cliente_id}')">${esc(cli?cli.nome:"cliente")}</button>
        <span class="meio-sub" style="font-family:var(--f-mono,ui-monospace,Consolas,monospace)">${esc(b.nup||"")}</span>
        ${atras?`<span class="man-selo vence">⏰ desde ${fmt(c.proxima)}</span>`:""}
        ${c.total?`<span class="meio-sub">${c.total}× conferido</span>`:""}
        <span style="margin-left:auto;display:flex;gap:6px">
          <a class="btn-mini" target="_blank" rel="noopener" style="text-decoration:none"
             href="${linkERecursos(b.nup)}">🌐 abrir</a>
          <button class="btn-mini" onclick="manualSemNovidade('${k.id}','${esc(b.nup||"")}')" title="✓ sem novidade"><span aria-hidden="true">✓ Inalterado</span><span class="sr-only">✓ sem novidade</span></button>
          <button class="btn-mini forte" onclick="manualComNovidade('${k.id}','${esc(b.nup||"")}')" title="✎ teve andamento"><span aria-hidden="true">✎ Andamento</span><span class="sr-only">✎ teve andamento</span></button>
        </span>
      </div>`;}).join("")}
  </div>`;
}

// no Meu Dia: CadÚnico vencido ou vencendo nos próximos 90 dias, de todos os
// clientes — inclusive dos casos já encerrados
function blocoCadunico(){
  const itens=[];
  (D.casos||[]).forEach(k=>{
    const c=D.cliPorId.get(k.cliente_id);
    if(!c || !ehLoas(k)) return;
    const venc=renovaCadunico(k);
    if(!venc) return;
    // caso que já virou lembrete (F10) aparece pelo bloco dos lembretes; sem
    // este corte, o mesmo CadÚnico apareceria duas vezes no mesmo Meu Dia
    if((D.lembretes||[]).some(l=>l.origem_caso===k.id && l.tipo==="cadunico" && l.ativo!==false)) return;
    const d=diasAte(venc);
    if(d<=90) itens.push({c, k, venc, d});
  });
  if(!itens.length) return "";
  itens.sort((a,b)=>a.venc<b.venc?-1:1);
  return `<h3 class="secao" style="color:#A5187F">🧓 CadÚnico a renovar (${itens.length})</h3>` +
    itens.map(({c,k,venc,d})=>`<div class="cartao" data-cli="${c.id}">
      <span class="check" style="border-color:#A5187F"></span>
      <div class="info"><div class="nome">${esc(c.nome)}</div>
        <div class="meta"><span class="chip" style="background:#FBE9F5;color:#A5187F">LOAS idoso</span>
          <span style="color:${d<0?"var(--vermelho)":"#A5187F"};font-weight:600">${
            d<0?`venceu em ${fmt(venc)}`:d===0?"vence hoje":`renovar até ${fmt(venc)}`}</span>
          ${k.fase==="encerrado"?`<span class="chip neutro">caso encerrado</span>`:""}
          ${c.telefone?`<a class="chip per" target="_blank" rel="noopener" onclick="event.stopPropagation()"
             href="https://wa.me/55${c.telefone.replace(/\D/g,"")}?text=${encodeURIComponent(msgCadunico(c,k))}"
             >💬 avisar</a>`:""}</div>
      </div></div>`).join("");
}
// ── 🔔 Lembretes do cliente ──────────────────────────────────────────────
// A obrigação que não pertence a processo nenhum: pagar contribuição do
// INSS, renovar cadastro, retomar contato daqui a tantos meses. Vive no
// CLIENTE (aba própria, ao lado de Cadastro) porque pendurar num caso
// confundia: com dois casos, ninguém sabia em qual morava o aviso — e
// encerrar o caso "errado" matava o lembrete junto. Cada "✔ avisado" grava
// quem avisou, quando e por qual canal, e rearma sozinho.
const LEMBRETE_TIPOS=[
  ["contribuicao","💰 Contribuição do INSS"],
  ["cadunico","📄 CadÚnico"],
  ["aposentadoria","🎂 Aposentadoria a caminho"],
  ["aposentadoria_futura","🙏 Aposentadoria futura"],
  ["revisao","🔍 Revisão periódica"],
  ["geral","🔔 Lembrete"],
];
// os códigos de pagamento da GPS que o escritório usa — é o que faz a
// mensagem de WhatsApp sair completa, com código, valor e vencimento
const GPS_CATEGORIAS=[
  ["1007","Contribuinte individual — 20%"],
  ["1163","Contribuinte individual — plano simplificado 11%"],
  ["1406","Facultativo — 20%"],
  ["1473","Facultativo — plano simplificado 11%"],
  ["1929","Facultativo baixa renda — 5%"],
];
function lembretesDo(cliId){
  // F236 · o lembrete de cobrança é do honorário (aba Honorários, Meu Dia), e não um lembrete do cliente: não conta em
  // Aposentadorias futuras nem repete nos prazos do caso a linha 💰 do próprio honorário
  return (D.lembretes||[]).filter(l=>l.cliente_id===cliId && l.ativo!==false && (l.detalhes||{}).origem!=="cobranca");
}
// F56 · o "Concluir em" do To Do, sem burocracia nova: o CRM CALCULA quando
// este cliente volta à mesa — a menor data futura entre lembretes ativos,
// anotações com data (não resolvidas), prazos fatais e agendamentos — e
// também a cobrança mais antiga já VENCIDA (nota/lembrete/prazo; agendamento
// que passou já aconteceu, não é dívida). Uma data, exposta no topo.
function proximaDataDe(cliId){
  const c=D.cliPorId.get(cliId); if(!c) return {venceu:null, proxima:null};
  const hj=hoje(), tudo=[];
  ((c.campos||{}).atendimento||[]).forEach(n=>{
    if(n.lembrar_em && !n.resolvida)
      tudo.push({data:n.lembrar_em, tipo:"nota", rotulo:`Anotação: ${(n.texto||"").slice(0,46)}`});
  });
  lembretesDo(cliId).forEach(l=>{ if(l.proximo_em)
    tudo.push({data:l.proximo_em, tipo:"lembrete", rotulo:l.titulo||"Lembrete"}); });
  // F60 · a tarefa criada no composer do caso também conta para o "volta em"
  const idsK=new Set((((D.casosDoCliente&&D.casosDoCliente.get(cliId))||[])).map(x=>x.id));
  ((D.tarefasFicha)||[]).forEach(t=>{
    if(t.concluida_em || !t.lembrar_em || !idsK.has(t.caso_id)) return;
    const a=(D._andsFicha||[]).find(x=>x.id===t.andamento_id);
    tudo.push({data:t.lembrar_em, tipo:"tarefa",
      rotulo:a?`Tarefa: ${(a.texto||"").replace(/<[^>]*>/g,"").slice(0,40)}`:"Tarefa no caso"});
  });
  ((D.casosDoCliente&&D.casosDoCliente.get(cliId))||[]).forEach(k=>{
    if(k.fase==="encerrado") return;
    if(k.prazo) tudo.push({data:k.prazo, tipo:"prazo", rotulo:"PRAZO FATAL do caso"});
    (D.eventos||[]).filter(e=>e.caso_id===k.id && e.status!=="cancelada").forEach(e=>{
      const d=(e.data_hora||"").slice(0,10);
      if(d) tudo.push({data:d, tipo:"evento", rotulo:`${e.tipo||"Agendamento"} marcado`});
    });
  });
  // F236 · e as linhas de "Lembretes e datas" que ela não lia (exigência, prazo de análise, recurso, DCB, prazo do tribunal,
  // honorários, documento pedido): com o card fechado ela dizia "sem próxima data" com três datas logo abaixo
  try{ for(const x of linhasDeDatas(cliId).linhas) if(x.data && x.cru && x.rotulo && x.rotulo!=="Prazo fatal" && !x.titulo)
    tudo.push({data:x.data, tipo:x.ico==="💰" ? "honorarios" : "prazo", rotulo:[x.rotulo, x.resumo].filter(Boolean).join(" · ")}); }catch(e){}
  tudo.sort((a,b)=>a.data<b.data?-1:1);
  return {venceu: tudo.find(x=>x.data<hj && x.tipo!=="evento")||null,
          proxima: tudo.find(x=>x.data>=hj)||null};
}
// o clique da pílula leva para onde a data mora (aba pode não existir p/
// este cliente — cai no Cadastro, onde vivem as anotações)
function irParaData(tipo){
  const vv={nota:"0", lembrete:"9", prazo:"2", evento:"3", tarefa:"2", honorarios:"4"}[tipo]||"0";
  const b=document.querySelector(`.mt[data-vv="${vv}"]`)||document.querySelector('.mt[data-vv="0"]');
  if(b) b.click();
  if(tipo==="nota") irSubCad("anotacoes");
}
function rotuloTipoLembrete(t){
  return (LEMBRETE_TIPOS.find(([x])=>x===t)||[]) [1] || "🔔 Lembrete";
}
function msgLembrete(l, c){
  const nome=(c.nome||"").split(" ")[0];
  if(l.tipo==="contribuicao"){
    const d=l.detalhes||{};
    const cat=(GPS_CATEGORIAS.find(([cod])=>cod===d.codigo)||[])[1]||"";
    return `Olá, ${nome}! Passando para lembrar da sua contribuição do INSS`
      +(d.codigo?` (código de pagamento ${d.codigo}${cat?" — "+cat.toLowerCase():""})`:"")
      +(d.valor?`, no valor de R$ ${d.valor}`:"")
      +`, com vencimento até o dia ${d.dia||15}. O pagamento pode ser feito pelo `
      +`Meu INSS (meu.inss.gov.br) ou gerando a guia no SAL (sal.receita.economia.gov.br). `
      +`Qualquer dúvida, é só chamar!`;
  }
  // o CadÚnico já tinha uma mensagem escrita, com o CRAS e a lista de
  // documentos: o lembrete usa a mesma, e não uma segunda versão para manter
  if(l.tipo==="cadunico"){
    const k = D.casoPorId.get(l.origem_caso);
    if(k) return msgCadunico(c, k);
  }
  return `Olá, ${nome}! Lembrete do escritório: ${l.titulo}. Qualquer dúvida, é só chamar!`;
}
// ══════════════════════════════════════════════════════════════════════════
// F20 · PERÍODO DE GRAÇA — a conta, com as premissas à vista
// ══════════════════════════════════════════════════════════════════════════
// Qualidade de segurado é conclusão jurídica, não campo de documento. O que o
// CRM faz aqui é a ARITMÉTICA, mostrando de onde tirou cada número, para quem
// atende conferir ou corrigir. Nenhum passo da triagem é marcado por isto.
//
// Texto conferido no Planalto em 16.08.2026:
//   Lei 8.213/91, art. 15 — https://www.planalto.gov.br/ccivil_03/leis/l8213cons.htm
//     I  · sem limite de prazo, quem está em gozo de benefício, exceto do
//          auxílio-acidente
//     II · até 12 meses após a cessação das contribuições
//     VI · até 6 meses após a cessação das contribuições, o segurado
//          FACULTATIVO   ← é o que mais engana: metade do prazo
//     §1º · prorroga para até 24 meses com mais de 120 contribuições mensais
//           sem interrupção que acarrete a perda da qualidade de segurado
//     §2º · acrescido de 12 meses para o segurado desempregado
//   Decreto 3.048/99, art. 13, II — https://www.planalto.gov.br/ccivil_03/decreto/d3048.htm
//     conta "após a cessação de BENEFÍCIO POR INCAPACIDADE ou das
//     contribuições" — por isso o benefício do CNIS entra na conta
//   Decreto 3.048/99, art. 14 — a perda ocorre "no dia seguinte ao do
//     vencimento da contribuição do contribuinte individual relativa ao mês
//     imediatamente posterior ao término daqueles prazos"
//
// O DIA (conferido em 11.10.2026): o vencimento da contribuição do contribuinte
// individual é o dia 15 do mês seguinte ao da competência, prorrogado para o
// dia útil seguinte quando não há expediente bancário (Decreto 3.048/99, art.
// 216, II; Lei 8.212/91, art. 30, II). A perda é no dia seguinte a ele.
//   IN PRES/INSS 128/2022, art. 184: a graça corre da última competência com
//   salário de contribuição no mínimo (§ 2º), e os 24 meses pedem 120 NOVAS
//   contribuições depois de uma perda da qualidade (§ 4º)
const GRACA_FONTE = "Lei 8.213/91, art. 15, e Decreto 3.048/99, arts. 13, 14 e 216, II";
// o dia em que a qualidade se perde, para a competência-limite da graça
const diaBancario = iso => { const w = new Date(iso+"T12:00:00").getDay(); return w!==0 && w!==6 && !feriadosNacionais(+iso.slice(0,4)).has(iso); };
function perdaDaQualidade(fimComp){
  const c = competenciaMais(fimComp, 2);   // vence no mês seguinte ao da competência fim+1
  let d = `${c.slice(3)}-${c.slice(0,2)}-15`;
  while(!diaBancario(d)) d = somaDias(d, 1);
  return {mantidaAte: d, perda: somaDias(d, 1)};
}
// § 1º do art. 15 e IN 128, art. 184, § 4º: as contribuições seguidas, sem
// intervalo maior que a graça da época; o mês de benefício mantém a qualidade
// sem somar, e a perda zera a conta. `mes` é um Map "AAAA-MM" → {conta, fac}.
const _idxMes = k => { const [y, m] = k.split("-").map(Number); return y*12 + m; };
function percorrerMeses(a, b, f){
  if(!a || !b || b < a) return;
  for(let i = _idxMes(a), fim = _idxMes(b); i <= fim; i++) f(`${Math.floor((i-1)/12)}-${String((i-1)%12+1).padStart(2,"0")}`);
}
function contarSemPerda(mes){
  let n = 0, ant = null, antFac = false;
  for(const k of [...mes.keys()].sort()){
    const graca = antFac ? 6 : n > 120 ? 24 : 12;
    if(ant && _idxMes(k) - _idxMes(ant) - 1 > graca) n = 0;
    const x = mes.get(k);
    if(x.conta) n++;
    ant = k; antFac = x.conta && x.fac;
  }
  return n;
}
const _mesDeData = d => { const m = String(d||"").match(/(\d{2})\/(\d{4})$/); return m ? `${m[2]}-${m[1]}` : ""; };
// F235 · a pensão e o auxílio-reclusão são recebidos como dependente, e o BPC é assistencial: não mantêm a qualidade
// de quem os recebe nem entram na conta dele (art. 15, I, da Lei 8.213/91 fala do segurado em gozo de benefício)
const naoMantemQualidade = v => /^(21|23|25|87|88|93)$/.test(String(v.especie||"")) || /PENS[ÃA]O|RECLUS|AMPARO|ASSISTENCIAL/i.test(`${v.origem||""} ${v.especie||""}`);
function marcarBeneficios(mes, vs){
  for(const v of (vs||[]).filter(v=>v.tipo==="Benefício" && v.inicio && !naoMantemQualidade(v)))
    percorrerMeses(_mesDeData(v.inicio), v.fim ? _mesDeData(v.fim) : hoje().slice(0,7), k=>{ if(!mes.has(k)) mes.set(k, {conta:false, fac:false}); });
}
// da leitura do PDF, com cada competência e o tipo de filiado
function mesesDoCnisLido(linha, abaixo){
  const mes = new Map(), fora = new Set((abaixo||[]).map(x=>chaveComp(x.comp)));
  const marca = (k, fac) => { const x = mes.get(k); mes.set(k, {conta:true, fac: x && x.conta ? x.fac && fac : fac}); };
  for(const v of (linha||[]).filter(v=>v.tipo!=="Benefício")){
    const comps = (v.comps||[]).filter(x=>+String(x.c).slice(0,2)<=12).map(x=>chaveComp(x.c)).sort();
    if(TIPO_REMUN.test(v.tipo||"")) percorrerMeses(_mesDeData(v.inicio), v.fim ? _mesDeData(v.fim) : (comps[comps.length-1] || chaveComp(v.ultRemun||"")), k=>{ if(!fora.has(k)) marca(k, false); });
    else comps.forEach(k=>{ if(!fora.has(k)) marca(k, /Facultativo/.test(v.tipo||"")); });
  }
  marcarBeneficios(mes, linha);
  return mes;
}
// do CNIS gravado antes desta conta existir: os períodos da contagem
function mesesDoCnisGravado(g){
  const mes = new Map();
  for(const [a, b] of (((g.analise||{}).contagem||{}).periodos||[])) percorrerMeses(a, b, k=>mes.set(k, {conta:true, fac:false}));
  marcarBeneficios(mes, g.vinculos);
  return mes;
}
const contribSemPerda = g => g ? (g.contribSemPerda ?? contarSemPerda(mesesDoCnisGravado(g))) : 0;
function competenciaMais(comp, meses){
  const [m, a] = comp.split("/").map(Number);
  const t = (a*12 + (m-1)) + meses;
  return String((t%12)+1).padStart(2,"0") + "/" + Math.floor(t/12);
}
const compHoje = () => { const h = hoje(); return h.slice(5,7)+"/"+h.slice(0,4); };
const compMenor = (a,b) => (a.slice(3)+a.slice(0,2)) <= (b.slice(3)+b.slice(0,2));
// a conta. `vs` é a linha do tempo do CNIS; `nContribs`, as contribuições sem
// perda (contribSemPerda); `desempregado` é decisão de quem atende, porque a
// prova do desemprego não está no extrato; `abaixo`, as competências abaixo
// do mínimo, que não abrem a graça sem complementação; `contados`, os períodos
// da contagem ("AAAA-MM"), para o recuo não parar num mês sem contribuição;
// `seguros`, os requerimentos do seguro-desemprego lidos do dossiê
function calcularGraca(vs, nContribs, desempregado, abaixo, contados, seguros){
  const r = {premissas:[], fonte:GRACA_FONTE};
  if(!vs || !vs.length) return null;
  const emGozo = vs.some(v=>v.tipo==="Benefício" && !v.fim && v.inicio
    && !/INDEFER|CESSAD/i.test(v.situacao||"") && !/^(94|36|95)$/.test(String(v.especie||"")) && !/AUX[IÍ]LIO[ -]?ACIDENTE|SUPLEMENTAR/i.test(v.origem||"") && !naoMantemQualidade(v));   // F232 · art. 15, I: o auxílio-acidente fica fora; F235 · e o benefício de dependente ou assistencial
  if(emGozo){
    r.semLimite = true;
    r.premissas.push("há benefício em manutenção no extrato, e o art. 15, I mantém a qualidade sem limite de prazo enquanto durar");
    return r;
  }
  // F235 · o segurado especial com o período em aberto no CNIS (roça ou pesca) é segurado pela atividade, enquanto ela durar
  if(vs.some(v=>/segurado especial/i.test(v.tipo||"") && !v.fim && v.inicio)){
    r.semLimite = true; r.especial = true;
    r.premissas.push("segurado especial com período em aberto no CNIS: a qualidade vem da atividade rural ou da pesca, enquanto ela durar (Lei 8.213/91, art. 11, VII)");
    return r;
  }
  // a última competência "dentro": fim de vínculo, fim de benefício ou a
  // última remuneração de um vínculo ainda aberto, recuando a que ficou
  // abaixo do mínimo (IN 128, art. 184, § 2º)
  const fora = new Set((abaixo||[]).map(x=>x.comp)), cands = [];
  const contado = c => !(contados||[]).length || contados.some(([a, b])=>chaveComp(c)>=a && chaveComp(c)<=b);
  for(const v of vs){
    let c = v.fim ? v.fim.slice(3,5)+"/"+v.fim.slice(6) : v.ultRemun;
    if(!c) continue;
    if(v.tipo!=="Benefício" && fora.has(c)){
      const ini = v.inicio ? v.inicio.slice(3,5)+"/"+v.inicio.slice(6) : "";
      // recua mês a mês, dentro do vínculo, até o último mês contado (o
      // contribuinte individual pode ter lacuna antes da competência abaixo)
      for(let n = 0; c && (fora.has(c) || !contado(c)); n++)
        c = n > 600 || (ini && !compMenor(ini, competenciaMais(c, -1))) ? null : competenciaMais(c, -1);
    }
    if(c) cands.push({c, v});
  }
  if(!cands.length) return null;
  const ultima = cands.map(x=>x.c).reduce((a,b)=> compMenor(a,b) ? b : a);
  r.ultima = ultima;
  if(vs.some(v=>v.aberto && !v.fim && v.tipo!=="Benefício"))
    r.premissas.push("há vínculo sem data de saída no extrato: a conta o encerra no último dia do mês da última remuneração, até o acerto do CNIS");
  // qual foi o ÚLTIMO registro, e de que tipo: facultativo tem metade do prazo
  const doFim = cands.filter(x=>x.c===ultima).map(x=>x.v);
  const facultativo = doFim.length>0 && doFim.every(v=>v.tipo==="Facultativo");
  const porBeneficio = doFim.some(v=>v.tipo==="Benefício");
  r.base = facultativo ? 6 : 12;
  r.premissas.push(facultativo
    ? "o último registro é de contribuinte FACULTATIVO, e o art. 15, VI dá 6 meses, não 12"
    : porBeneficio
      ? "o último registro é a cessação de benefício, e o art. 13, II do Decreto 3.048/99 conta os 12 meses a partir dela"
      : "o último registro é vínculo ou contribuição, e o art. 15, II dá 12 meses");
  r.mais120 = nContribs > 120;
  if(r.mais120 && !facultativo){
    r.base = 24;
    r.premissas.push(`o extrato traz ${nContribs} contribuições seguidas, sem perda da qualidade, mais de 120, e o §1º prorroga para até 24 meses (IN 128, art. 184, § 4º)`);
  }else if(r.mais120 && facultativo){
    r.premissas.push(`o extrato traz ${nContribs} contribuições sem perda, mas o §1º prorroga o prazo do inciso II, e o facultativo está no inciso VI`);
  }
  // IN 128, art. 184, § 5º: o seguro-desemprego RECEBIDO dentro da graça prova
  // o desemprego e acresce 12 meses ao prazo do inciso II, que continua contado
  // da última competência (§ 2º), e não da última parcela
  const iniG = competenciaMais(ultima, 1);
  r.janela = {ini: iniG, ate: perdaDaQualidade(competenciaMais(ultima, r.base)).mantidaAte};
  r.facultativo = facultativo;
  const naGraca = p => { const d = isoBr(p.pagamento); return d >= `${iniG.slice(3)}-${iniG.slice(0,2)}-01` && d <= r.janela.ate; };
  const sd = facultativo ? null : (seguros||[]).map(s=>({...s, dentro: s.parcelas.filter(p=>parcelaRecebida(p) && naGraca(p))})).find(s=>s.dentro.length);
  if(sd){
    r.base += 12;
    r.seguro = sd;
    r.premissas.push(`mais 12 meses do §2º, pelo desemprego: o seguro-desemprego ${sd.dispensa ? `da dispensa de ${sd.dispensa}` : `requerido em ${sd.data}`} teve parcela recebida em ${sd.dentro[0].pagamento}, dentro da graça (IN 128, art. 184, § 5º)`);
  }else if(desempregado){
    r.base += 12;
    r.premissas.push("mais 12 meses do §2º, pelo desemprego — a prova é do escritório, não está no extrato");
  }
  r.fim = competenciaMais(ultima, r.base);
  Object.assign(r, perdaDaQualidade(r.fim));
  r.vencida = hoje() >= r.perda;
  r.desempregado = !!desempregado || !!sd;
  // a competência abaixo do mínimo depois da última válida: complementada,
  // ela leva a graça adiante (Decreto 3.048/99, art. 19-E, § 1º)
  const depois = [...fora].filter(c=>!compMenor(c, ultima)).sort((a,b)=>chaveComp(a).localeCompare(chaveComp(b))).pop();
  if(depois){
    const fimC = competenciaMais(depois, r.base);
    r.complementar = {comp: depois, fim: fimC, ...perdaDaQualidade(fimC)};
    r.premissas.push(`a competência ${depois} ficou abaixo do mínimo e só conta complementada; complementada, a qualidade vai até ${fmtBarra(r.complementar.mantidaAte)}`);
  }
  return r;
}

// o seguro-desemprego ao lado da qualidade: o que prova, ou por que não prova
function fatoSeguro(gr, seguros){
  const quem = s => s.dispensa ? `da dispensa de ${s.dispensa}${s.empregador ? ` por ${s.empregador}` : ""}` : `requerido em ${s.data || "data não lida"}`;
  const de = ps => `${ps.length} parcela${ps.length>1?"s":""} recebida${ps.length>1?"s":""}, de ${ps[0].pagamento} a ${ps[ps.length-1].pagamento}`;
  const s = gr && gr.seguro;
  if(s) return {est:"ok", anexo:s.anexo.id, texto:`Seguro-desemprego ${quem(s)}: ${de(s.dentro)}, dentro da graça; prova o desemprego e acresce 12 meses (art. 15, § 2º, da Lei 8.213/91, e IN 128, art. 184, § 5º)`};
  const u = (seguros||[]).slice().sort((a,b)=>isoBr(b.data||b.dispensa).localeCompare(isoBr(a.data||a.dispensa)))[0];
  if(!u) return null;
  const rec = u.parcelas.filter(parcelaRecebida);
  const conta = !gr || gr.semLimite ? ""
    : gr.facultativo ? "; o último registro é de facultativo, e o § 5º do art. 184 da IN 128 acresce só o prazo do inciso II"
    : rec.length ? `; fora da graça desta conta, que corre de ${gr.janela.ini} a ${fmtBarra(gr.janela.ate)}, e não acresce os 12 meses` : "; não prova o desemprego";
  return {est:"info", anexo:u.anexo.id, texto:`Seguro-desemprego ${quem(u)}: ${rec.length ? de(rec) : `nenhuma parcela recebida${u.situacao ? `, situação ${u.situacao.toLowerCase()}` : ""}`}${conta}`};
}
// ── o bloco de contas, no pé da aba de Lembretes ────────────────────────
// "Questões pertinentes do site interno", pedido do Paulo. Só entra o que
// muda decisão de prazo, porque esta aba é sobre data que chega. A conta
// aparece quando o CNIS já foi lido na Triagem; antes disso, só o caminho.
function blocoContas(c){
  const g = ((triagemDe(c).pdf||{}).cnis||{});
  const vs = g.vinculos || [];
  const desemp = !!(triagemDe(c).graca||{}).desempregado, seguros = fontesDoDossie(c.id).seguros;
  const r = vs.length ? calcularGraca(vs, contribSemPerda(g), desemp, (g.analise||{}).abaixo, ((g.analise||{}).contagem||{}).periodos, seguros) : null;
  const fs = fatoSeguro(r, seguros);
  const sdLinha = fs ? `<div class="conta-linha sd"><span>${esc(fs.texto)}</span>
      <button type="button" class="adr-link" onclick="abrirAnexo('${fs.anexo}')">ver</button></div>` : "";
  const cabeca = `<div class="cad-tit"><span class="cad-ic">${CAD_IC.doc}</span>Contas deste cliente
      <span class="cad-tit-sub">o que decide prazo, calculado do CNIS que você já leu</span></div>`;
  if(!r) return `<div class="cad-cartao conta-cx">${cabeca}
    <p class="cad-nota" style="margin:0">Leia o CNIS na aba <b>Cadastro → Triagem</b> e a qualidade de
      segurado é calculada aqui, com as premissas à vista.</p>${sdLinha}</div>`;
  const corpo = r.semLimite
    ? `<div class="conta-linha ok"><b>Qualidade mantida sem limite de prazo</b>
        <span>há benefício em manutenção</span></div>`
    : `<div class="conta-linha ${r.vencida?"alerta":"ok"}">
        <b>Qualidade mantida até ${fmtBarra(r.mantidaAte)}</b>
        <span>${r.vencida?"perdida":"perda"} em ${fmtBarra(r.perda)} · ${r.base} meses a partir de ${esc(r.ultima)}, até a competência ${esc(r.fim)}</span></div>`;
  return `<div class="cad-cartao conta-cx">${cabeca}
    ${corpo}${sdLinha}
    <ul class="conta-prem">${(r.premissas||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
    <div class="conta-acao">
      ${r.seguro ? "" : `<label class="conta-ck"><input type="checkbox" ${desemp?"checked":""}
        onchange="marcarDesemprego('${c.id}',this.checked)">
        segurado desempregado (§2º, mais 12 meses — a prova é do escritório)</label>`}
      <a class="tri-ferr" href="https://advprevidenciaria.netlify.app/" target="_blank" rel="noopener">
        Contribuições e qualidade de segurado ↗</a>
    </div>
    <p class="cad-nota" style="margin:8px 0 0">Fonte: ${esc(GRACA_FONTE)}, conferidos no Planalto.
      A perda ocorre no dia seguinte ao vencimento da contribuição do contribuinte individual
      do mês seguinte ao fim do prazo (art. 14 do Decreto 3.048/99), dia 15 ou o dia útil seguinte.
      Conta de apoio: quem conclui é você.</p>
  </div>`;
}
async function marcarDesemprego(cliId, ligado){
  const c = D.cliPorId.get(cliId); if(!c) return;
  const t = {...triagemDe(c)};
  t.graca = {...(t.graca||{}), desempregado: !!ligado, em: hoje(), quem: eu.id};
  if(!await salvarTriagem(cliId, t)) return aviso("Não consegui guardar");
  repintarFicha();
}

// ══════════════════════════════════════════════════════════════════════════
// F218 · O CARD DA APOSENTADORIA FUTURA (onda 1 da integração do atendimento)
// ══════════════════════════════════════════════════════════════════════════
// O acervo (404 cards ativos em 12.10.2026) nasce do To Do e já traz a
// análise feita: a data provável da aposentadoria no checklist e o próximo
// lembrete na data da tarefa. A sincronização substitui `detalhes` a cada
// rodada, e por isso o que o CRM grava no card vive na coluna `crm`
// (schema_lembretes_crm.sql): etapa, data do direito confirmada, pré-caso e
// análise ligados, motivo do arquivamento. A data provável vem, nesta
// ordem, do que o CRM gravou, do checklist do To Do e da anotação mais
// recente que fala em aposentar numa data.
// F219 · os marcos da base (base-aposentadoria-futura-pipeline): D-90 avisa (aposentadorias.lembrar_em),
// D-60 pede documentos (lembretes.proximo_em → etapa Documentação) e D-0 protocola (Pronto só com a
// data do direito alcançada). "Faleceu" manda avaliar a pensão aos dependentes.
const APOS_ETAPAS = [["monitorando","Monitorando"],["atendimento","Em atendimento"],["analisado","Analisado"],["documentacao","Documentação"],["pronto","Pronto para protocolar"],["caso","Virou caso"],["arquivado","Arquivado"]];
const APOS_MOTIVOS = ["Sem direito","Desistiu","Não voltou","Já aposentado","Faleceu","Outro"];
const DIAS_DOCUMENTACAO = 60;
const avisoDocs = data => diaUtilAntes(maisDiasISO(data, -DIAS_DOCUMENTACAO));
const cardCrm = l => (l && l.crm && typeof l.crm==="object") ? l.crm : {};
const ehCardApos = l => !!l && l.tipo==="aposentadoria_futura";
const cardsApos = () => (D.lembretes||[]).filter(l=>ehCardApos(l) && l.ativo!==false);
const rotEtapaCard = e => (APOS_ETAPAS.find(x=>x[0]===e)||[e,e])[1];
// dd/mm/aaaa ou mm/aaaa, de 2013 em diante, em ISO; a data de nascimento fica de fora
function dataFuturaNoTexto(s){
  let m = /(\d{2})\/(\d{2})\/(20[1-6]\d)/.exec(s||"");
  if(m && +m[3] >= 2013 && +m[2] >= 1 && +m[2] <= 12) return `${m[3]}-${m[2]}-${m[1]}`;
  m = /(?:^|[^\d\/])(\d{2})\/(20[1-6]\d)(?!\d)/.exec(s||"");
  if(m && +m[2] >= 2013 && +m[1] >= 1 && +m[1] <= 12) return `${m[2]}-${m[1]}-01`;
  return null;
}
function dataDireitoDoCard(l){
  const crm = cardCrm(l);
  if(crm.data_direito) return {data: crm.data_direito, fonte: crm.data_fonte || "informada no CRM", crm: true};
  const d = l.detalhes||{};
  const itens = (d.checklist||[]).filter(i=>!/anivers|nascim/i.test(i.texto||"")).map(i=>({i, data: dataFuturaNoTexto(i.texto)})).filter(x=>x.data);
  const pref = itens.find(x=>/aposent|direito|idade|tempo|data|regra|pontos|ped[áa]gio/i.test(x.i.texto)) || itens[0];
  if(pref) return {data: pref.data, fonte: "checklist do To Do"};
  for(const a of (d.anotacoes||[]).slice().sort((p, q)=>(q.data||"") < (p.data||"") ? -1 : 1)){
    const m = /(aposent\w*|direito|ped[áa]gio|pontos|regra|idade)[^.;\n]{0,80}?(\d{2}\/\d{2}\/20[1-6]\d|(?:^|[^\d\/])\d{2}\/20[1-6]\d(?!\d))/i.exec(a.texto||"");
    // a aposentadoria planejada vem depois da anotação; data anterior é outro fato (um benefício que já saiu, por exemplo)
    if(m){ const data = dataFuturaNoTexto(m[2]); if(data && data > String(a.data||"")) return {data, fonte: `anotação de ${fmt(a.data)}`}; }
  }
  return null;
}
function etapaDoCard(l){
  const crm = cardCrm(l), e = crm.etapa;
  if(e==="caso" || e==="arquivado") return e;
  if(casoDoCard(l)) return "caso";   // F236 · o pré-caso ligado virou caso, ainda que o card não tenha sido gravado
  if(e && !["monitorando","analisado","documentacao","pronto"].includes(e)) return e;   // atendimento, caso e arquivado são gravados
  // F219 · as etapas de data são derivadas: Pronto só com o direito alcançado (D-0), Documentação quando o lembrete venceu (D-60)
  const dd = dataDireitoDoCard(l), h = hoje();
  if(dd && dd.data <= h) return "pronto";
  if(l.proximo_em && l.proximo_em <= h) return "documentacao";
  if(e) return e;
  if(crm.analise_id) return "analisado";
  if(crm.precaso_id) return "atendimento";
  return "monitorando";
}
function horizonteDoCard(l){
  const h = hoje(), p = l.proximo_em; if(!p) return "sem";
  return p < h ? "vencido" : p <= maisDiasISO(h, 90) ? "90" : p <= maisDiasISO(h, 365) ? "ano" : "depois";
}
const especieDoCard = l => /^aposentadoria futura$/i.test(String(l.titulo||"").trim()) ? "" : String(l.titulo||"").trim();
// F236 · o caso que nasceu do card: o gravado (crm.caso_id) ou a linha do pré-caso ligado que virou caso. Antes da F236 o
// "Gerar o caso" saía sem desligar o card (o pré-caso já era linha de casos e a conta de linhas novas dava zero)
function casoDoCard(l){
  const crm = cardCrm(l), k0 = crm.caso_id && D.casoPorId.get(crm.caso_id);
  if(k0) return k0;
  return (D.casosDoCliente.get(l.cliente_id)||[]).find(k=>!k.pre_caso && k.precaso
    && ((k.precaso.lembrete_id && k.precaso.lembrete_id===l.id) || (crm.precaso_id && k.precaso.id===crm.precaso_id))) || null;
}
// F236 · a aposentadoria já está em caso aberto (o pedido saiu): o alarme do card se cala; o aviso de época (3 meses antes)
// se cala quando o caso nasceu do atendimento (do pré-caso, que é o caminho do card)
const ESP_APOS = /^B(41|42|46|57)$/;
const casoAposAtivo = (cliId, doAtendimento) => (D.casosDoCliente.get(cliId)||[]).find(k=>!k.pre_caso && k.fase!=="encerrado" && (!doAtendimento || k.precaso)
  && (ESP_APOS.test(k.especie||"") || /^apos(entadoria)?\.? (por idade|por tempo|tempo|especial|do professor|da pessoa com defici)/i.test(k.beneficio||""))) || null;
// F236 · o card com o direito alcançado e sem pedido: a aposentadoria começa no dia do pedido (Lei 8.213/91, art. 49, II,
// e art. 54; o empregado que sai do emprego tem 90 dias, art. 49, I, a), então cada mês sem protocolo é um mês sem benefício.
// Vale da data do direito até o caso nascer, em qualquer etapa do card (o "Em atendimento" escondia a pressa)
function alarmeDireito(l, c){
  if(!ehCardApos(l) || l.ativo===false || ["caso","arquivado"].includes(etapaDoCard(l)) || casoAposAtivo(l.cliente_id)) return null;
  const dd = dataDireitoDoCard(l); if(!dd || dd.data > hoje()) return null;
  const crm = cardCrm(l), a = (crm.analise_id && (D.analises||[]).find(x=>x.id===crm.analise_id)) || analisesDe(l.cliente_id)[0];
  const m = a && cenMelhor(a), valor = (m && +m.valor) || SM_2026, dias = Math.max(0, -diasAte(dd.data));
  return {desde:dd.data, fonte:dd.fonte, dias, valor, porDia:valor/30, perdido:Math.round(valor/30*dias), estimado:!(m && +m.valor), analise:a||null};
}
function alarmeCardHtml(l, c, al){
  const pcLig = cardCrm(l).precaso_id && precasosDe(c).find(p=>p.id===cardCrm(l).precaso_id && !p.so_lembrete);
  const semSenha = !(((D._ficha||{}).cliId===c.id && (D._ficha||{}).creds)||[]).some(x=>x.tipo==="meu_inss");
  const falta = [...faltaParaDocs(c), ...(semSenha ? ["senha do Meu INSS (ou o pedido pelo 135)"] : [])];
  return `<div class="card-alarme" role="alert">
    <b>⏰ Direito alcançado ${al.dias ? `há ${plu(al.dias, "dia", "dias")}` : "hoje"} (desde ${fmtBarra(al.desde)}): protocolar já.</b>
    <p>A aposentadoria começa no dia do pedido (Lei 8.213/91, arts. 49 e 54; quem é empregado e sai do emprego tem 90 dias): cada mês sem pedir são ${moedaBR(al.valor)} a menos${al.estimado ? " (estimado no salário mínimo)" : al.analise ? ` (valor da análise de ${fmt(al.analise.data_analise)})` : ""}, ${moedaBR(al.porDia)} por dia${al.dias ? `; desde ${fmtBarra(al.desde)} já são cerca de ${moedaBR(al.perdido)}` : ""}.</p>
    <p><b>Próximo passo, hoje (${fmtBarra(hoje())}):</b> ligar para ${esc((c.nome||"").split(" ")[0])}, abrir o atendimento por este card e protocolar no mesmo dia; a data do pedido é a que conta, e o documento que faltar o INSS pede por exigência.${falta.length ? ` Para protocolar, falta: ${esc(falta.join(", "))}.` : ""}</p>
    <span class="card-acoes"><button class="btn-mini forte" onclick="abrirAtendimentoDoCard('${c.id}','${l.id}')" title="abre o atendimento ligado a este card, na Identificação em tela cheia">${pcLig ? "Continuar o atendimento" : "Abrir atendimento"}</button>
      <button class="btn-mini" onclick="passarAoAdvogado('${c.id}','${l.id}')" title="menção ao advogado e tarefa para hoje">Passar<span class="sr-only"> ao advogado</span></button></span>
  </div>`;
}
// F236 · o recado do direito alcançado tem destinatário: menção ao advogado e tarefa para hoje (quem atende no balcão passa
// adiante sem esperar), e o card ganha o responsável quando ainda não tem
function passarAoAdvogado(cliId, lid){
  const c = D.cliPorId.get(cliId), l = (D.lembretes||[]).find(x=>x.id===lid); if(!c || !l) return;
  const al = alarmeDireito(l, c), advs = equipeAtiva().filter(x=>x.papel==="admin" || x.cargo==="advogado"), lista = advs.length ? advs : equipeAtiva();
  const pad = l.responsavel_id || ((advs.find(x=>x.papel==="admin") || lista[0] || {}).id) || "";
  const txt = `direito à ${(especieDoCard(l) || "aposentadoria").toLowerCase()} desde ${al ? fmtBarra(al.desde) : "a data do card"}${al && al.dias ? ` (há ${plu(al.dias, "dia", "dias")})` : ""}, sem pedido: ligar hoje e protocolar.`;
  caixa(`<div class="adr-modal" role="dialog" aria-labelledby="pa-adv-t"><h3 id="pa-adv-t">Passar ao advogado</h3>
    <label class="adr-campo"><span>Para</span><select id="pa-adv-quem">${lista.map(x=>`<option value="${x.id}" ${x.id===pad?"selected":""}>${esc(x.nome)}</option>`).join("")}</select></label>
    <label class="adr-campo"><span>Recado</span><textarea id="pa-adv-txt" rows="3">${esc(txt)}</textarea></label>
    <div class="adr-modal-bts"><button type="button" class="adr-bt" onclick="fecharCaixa()">Cancelar</button>
      <button type="button" class="adr-bt adr-primario" onclick="passarAoAdvogadoGravar('${cliId}','${lid}')" title="Passar, com tarefa para hoje">Passar<span class="sr-only">, com tarefa para hoje</span></button></div></div>`);
}
async function passarAoAdvogadoGravar(cliId, lid){
  const para = (document.getElementById("pa-adv-quem")||{}).value, txt = ((document.getElementById("pa-adv-txt")||{}).value||"").trim();
  if(!para || !txt) return aviso("Escolha quem recebe e escreva o recado");
  const c = D.cliPorId.get(cliId), l = (D.lembretes||[]).find(x=>x.id===lid); if(!c) return;
  try{
    const corpo = {de_id:eu.id, para_id:para, cliente_id:cliId, texto:`${c.nome}: ${txt}`.slice(0, 400)};
    await api(`/rest/v1/mencoes`,{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(corpo)})
      .catch(()=>{ delete corpo.cliente_id; return api(`/rest/v1/mencoes`,{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(corpo)}); });
    const [tf] = await api(`/rest/v1/tarefas`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({cliente_id:cliId, caso_id:null, titulo:`⏰ ${c.nome}: ${txt}`.slice(0, 200), prazo:hoje()})}) || [];
    if(tf) D.tarefas.push(tf);
    if(l && !l.responsavel_id){
      await api(`/rest/v1/lembretes?id=eq.${lid}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({responsavel_id:para})});
      l.responsavel_id = para;
    }
  }catch(e){ return aviso("Não consegui passar o recado — tente de novo"); }
  fecharCaixa();
  aviso(`Recado passado a ${((D.colPorId.get(para)||{}).nome||"").split(" ")[0]}, com tarefa para hoje ✔`, false);
  montarSidebar(); repintarFicha();
}
// F236 · o caso nasceu: o card ligado ao pré-caso (o do To Do, pelo "Abrir atendimento" ou pelo "Gerar o caso", e o que o
// Desfecho mandou a Aposentadorias futuras) vira "Virou caso" e se desliga; a ponte conclui a tarefa no To Do
async function fecharCardsDoCaso(cliId, k, pc){
  for(const l of (D.lembretes||[]).filter(x=>x.cliente_id===cliId && x.ativo!==false)){
    const crm = cardCrm(l), d = l.detalhes||{};
    if(!(l.id===pc.lembrete_id || (crm.precaso_id && crm.precaso_id===pc.id) || (d.origem==="precaso" && d.precaso_id===pc.id))) continue;
    if(ehCardApos(l)) await cardGravar(l.id, x=>{ x.etapa = "caso"; x.caso_id = k.id; x.precaso_id = pc.id; x.em = hoje(); x.quem = eu.id; }, {ativo:false});
    else { await api(`/rest/v1/lembretes?id=eq.${l.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({ativo:false})}).catch(()=>{}); l.ativo = false; }
  }
  separarCardsViraram();
}
// F236 · o card cujo pré-caso já virou caso sai dos lembretes vivos (Meu Dia, Planejado, contadores e os prazos do caso o
// liam como vencido) e espera em D._cardsViraram a ficha do cliente gravar o fechamento (a ponte conclui a tarefa no To Do)
function separarCardsViraram(){
  const mortos = (D.lembretes||[]).filter(l=>ehCardApos(l) && l.ativo!==false && casoDoCard(l));
  D._cardsViraram = [...(D._cardsViraram||[]).filter(l=>l.ativo!==false && !mortos.includes(l)), ...mortos];
  D.lembretes = (D.lembretes||[]).filter(l=>l.ativo!==false && !mortos.includes(l));
}
// F236 · o caso gerado antes da F236 não levou a natureza nem os marcadores do atendimento às colunas (o clássico mostrava
// "Natureza do pedido" sem nada marcado): ao abrir a ficha, descem a natureza do pré-caso (ou concessão, como dizia o
// [DECISÃO]) e os marcadores; uma tentativa por caso na sessão (banco sem a coluna não insiste)
const _natReparada = new Set();
async function repararCasosDoAtendimento(cliId){
  const MARC_CASO = {rural:"rural", especial:"especial", deficiencia:"pcd"};
  let mudou = false;
  for(const k of (D.casosDoCliente.get(cliId)||[])){
    const pc = k.precaso; if(!pc || k.pre_caso || k.natureza || (pc.desfecho||{}).tipo!=="caso" || _natReparada.has(k.id)) continue;
    _natReparada.add(k.id);
    const corpo = {natureza: pc.natureza || "concessao"}, mc = Object.entries(pc.marc||{}).filter(([m, v])=>v && MARC_CASO[m]).map(([m])=>MARC_CASO[m]);
    if(mc.length && !marcadoresDe(k).length) corpo.marcadores = mc;
    try{ await patchCaso(k.id, corpo); Object.assign(k, corpo); mudou = true; }catch(e){}
  }
  if(mudou && clienteAberto===cliId) repintarFicha();
}
// F236 · o card que ficou vivo depois de o pré-caso virar caso (o defeito de antes da F236): fecha ao abrir a ficha
async function repararCardsDoCliente(cliId){
  const vivos = [...(D.lembretes||[]), ...(D._cardsViraram||[])].filter(l=>l.cliente_id===cliId && ehCardApos(l) && l.ativo!==false && cardCrm(l).etapa!=="caso" && casoDoCard(l));
  for(const l of vivos){ const k = casoDoCard(l);
    await cardGravar(l.id, x=>{ x.etapa = "caso"; x.caso_id = k.id; if((k.precaso||{}).id) x.precaso_id = k.precaso.id; x.em = hoje(); x.quem = eu.id; }, {ativo:false}); }
  if(!vivos.length) return;
  separarCardsViraram();
  montarSidebar(); if(clienteAberto===cliId) repintarFicha();
}
// F236 · o card cujo pré-caso já virou caso abre o caso, e não um pré-caso novo (cada clique criava mais um caso)
async function abrirCasoDoCard(l){
  const k = casoDoCard(l); if(!k) return false;
  await repararCardsDoCliente(l.cliente_id);
  if(clienteAberto!==l.cliente_id) await abrirFicha(l.cliente_id);
  const m = document.getElementById("modal"); if(m) m.style.display = "none";
  casoSel = k.id; abaAtiva = 2; subAba = "escritorio"; repintarFicha();
  aviso("Este card já virou caso — abri o caso", false);
  return true;
}
// grava só a coluna crm (e o que vier em extra): detalhes é do To Do
async function cardGravar(lid, muda, extra){
  const l = [...(D.lembretes||[]), ...(D._cardsViraram||[])].find(x=>x.id===lid); if(!l) return false;   // F236
  const crm = {...cardCrm(l)}; muda(crm);
  try{ await api(`/rest/v1/lembretes?id=eq.${lid}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({crm, ...(extra||{})})}); }
  catch(e){ aviso(/\bcrm\b|42703|PGRST204/.test(String(e.message||e)) ? "Rode o crm/fase2/schema_lembretes_crm.sql no Supabase — falta a coluna 'crm' em lembretes" : "Não consegui guardar o card — tente de novo"); return false; }
  l.crm = crm; Object.assign(l, extra||{}); return true;
}
async function cardDataDireito(lid, v){
  if(!v) return;
  if(await cardGravar(lid, c=>{ c.data_direito = v; c.data_fonte = "informada no CRM"; })){ aviso(`Direito provável em ${fmt(v)} ✔`, false); if(clienteAberto) repintarFicha(); else render(); }
}
// P6 (prazos, 31.10.2026) · a revisão do card: o "Rever em" do CRM (crm.rever_em) adia o lembrete vencido sem esperar o To Do,
// cuja data (proximo_em) a sincronização regrava; vale a mais adiante das duas
const proxDoCard = l => [l.proximo_em, cardCrm(l).rever_em].filter(Boolean).sort().pop() || null;
async function cardReverEm(lid, v){
  if(!v) return;
  if(await cardGravar(lid, c=>{ c.rever_em = v; })){ aviso(`Card a rever em ${fmt(v)} ✔`, false); render(); }
}
// a fila do 🧹 Cuidar do acervo: o card vivo com o lembrete vencido (e o direito ainda não alcançado) ou sem data nenhuma
function cardsARever(){
  const hj = hoje();
  return (D.lembretes||[]).filter(l=>l.ativo!==false && ehCardApos(l) && cardVivo(l)).map(l=>{
    const dd = dataDireitoDoCard(l), px = proxDoCard(l);
    const motivo = !px && !dd ? "sem data" : px && px<hj && !(dd && dd.data<=hj) ? "vencido" : "";
    return {l, cli:D.cliPorId.get(l.cliente_id), dd, px, motivo};
  }).filter(x=>x.cli && x.motivo).sort((a, b)=>(a.px||"") < (b.px||"") ? -1 : 1);
}
// F602 · o 🧹 Cuidar do acervo diz o que a ponte do pré-caso fez e o que pede o Paulo
function cfgJson(chave){ try{ return JSON.parse(cfgApp(chave)||"null"); }catch(e){ return null; } }
function blocoMovimentosTodo(){
  const xs = (cfgJson("todo_movimentos")||[]).slice(0, 40); if(!xs.length) return "";
  const falhas = xs.filter(m=>m.ok===false).length;
  return `<details class="sem-acao neutro" id="acervo-movtodo"><summary>Pré-casos levados ao To Do (${xs.length})${falhas ? ` · ${falhas} com falha` : ""}</summary>
    <p class="meio-sub" style="margin:8px 0 4px">O que o CRM moveu no Microsoft To Do, o mais recente primeiro. A falha não se repete sozinha: confira a tarefa no To Do.</p>
    ${xs.map(m=>{ const cli = D.cliPorId.get(m.cliente_id);
      return `<div class="semcpf-it movtodo${m.ok===false ? " falha" : ""}"><b class="semcpf-nome" style="cursor:pointer" onclick="abrirFicha('${m.cliente_id}')">${esc(cli ? cli.nome : "Cliente")}</b>
        <span class="meio-sub"${m.ok===false ? ' style="color:#b42318;font-weight:600"' : ""}>${esc(m.de||"")} → ${esc(m.para==="concluir" ? "Arquivo (concluída)" : m.para||"")} · ${fmt(String(m.em||"").slice(0,10))}${m.ok===false ? ` · falhou (${esc(m.erro||"erro")})` : ""}</span></div>`; }).join("")}
  </details>`;
}
function blocoPrecasoPares(){
  const cfg = cfgJson("precaso_pares")||{}, esc0 = cfg.escolhas||{};
  const xs = (cfg.pares||[]).filter(p=>!esc0[p.nova]); if(!xs.length) return "";
  return `<details class="sem-acao" id="acervo-pcpares" open><summary>Pré-casos a identificar (${xs.length}) · Precisa de você</summary>
    <p class="meio-sub" style="margin:8px 0 4px">A tarefa do To Do pode ser de mais de um pré-caso do mesmo cliente. Escolha qual é; ela só entra no CRM depois da escolha, na próxima sincronização.</p>
    ${xs.map(p=>{ const cli = D.cliPorId.get(p.cliente_id);
      return `<div class="semcpf-it pcpar" data-nova="${esc(p.nova)}"><b class="semcpf-nome" style="cursor:pointer" onclick="abrirFicha('${p.cliente_id}')">${esc(cli ? cli.nome : (p.titulo||"Cliente"))}</b>
        <span class="meio-sub">${esc(p.lista||"")}</span>
        <span>${(p.candidatos||[]).map(id=>{ const k = D.casoPorId && D.casoPorId.get(id);
          return `<button class="btn-mini" data-par="${id}" onclick="escolherPar('${esc(p.nova)}','${id}')">${esc(k ? (k.beneficio||"sem espécie") : "pré-caso")}</button>`; }).join(" ")}
        <button class="btn-mini" data-par="novo" onclick="escolherPar('${esc(p.nova)}','novo')">Novo</button></span></div>`; }).join("")}
  </details>`;
}
async function escolherPar(nova, alvo){
  const cfg = cfgJson("precaso_pares")||{};
  cfg.escolhas = Object.assign({}, cfg.escolhas, {[nova]: alvo});
  try{ await guardarCfgApp("precaso_pares", JSON.stringify(cfg)); }catch(e){ return aviso("Não gravei a escolha"); }
  aviso(alvo==="novo" ? "Será um pré-caso novo, na próxima sincronização" : "Escolha gravada; a tarefa entra na próxima sincronização");
  render();
}
function blocoPrecasoLote(){
  const l = cfgJson("precaso_lote"); if(!l || !(l.ids||[]).length) return "";
  const n = l.ids.length;
  return `<details class="sem-acao neutro" id="acervo-pclote"${l.desfeito ? "" : " open"}><summary>Pré-casos do To Do (${n}) · ${fmt(String(l.em||"").slice(0,10))}</summary>
    <p class="meio-sub" style="margin:8px 0 4px">${n} tarefa(s) do 🙋 Escritório viraram pré-casos Ativos na primeira sincronização.
    ${l.apagados ? "O lote foi desfeito: as anotações voltaram ao cadastro." : l.desfeito ? "Desfeito: as linhas saem na próxima sincronização." : "O Desfazer tira os pré-casos e devolve as anotações ao cadastro."}</p>
    ${l.desfeito ? "" : `<button class="btn-mini" id="pclote-desfazer" onclick="desfazerLotePrecaso()">Desfazer</button>`}
  </details>`;
}
async function desfazerLotePrecaso(){
  const l = cfgJson("precaso_lote"); if(!l || l.desfeito) return;
  if(!confirm(`Desfazer os ${(l.ids||[]).length} pré-casos do To Do? As anotações voltam ao cadastro na próxima sincronização.`)) return;
  l.desfeito = true; l.desfeito_por = eu.id; l.desfeito_em = new Date().toISOString();
  try{ await guardarCfgApp("precaso_lote", JSON.stringify(l)); }catch(e){ return aviso("Não gravei o Desfazer"); }
  aviso("Lote desfeito; os pré-casos saem na próxima sincronização"); render();
}
function blocoCardsRever(){
  const xs = cardsARever(); if(!xs.length) return "";
  return `<details class="sem-acao neutro" id="acervo-cardsrever"><summary>Aposentadorias futuras a rever (${xs.length}) — o lembrete venceu ou o card não tem data</summary>
    <p class="meio-sub" style="margin:8px 0 4px">Dê a nova data de revisão, a data provável do direito ou arquive. O card que já alcançou o direito não está aqui: ele cobra no Meu Dia até virar caso.</p>
    ${xs.map(({l, cli, dd, px, motivo})=>`<div class="semcpf-it cardrever" data-lemb="${l.id}"><b class="semcpf-nome" style="cursor:pointer" onclick="abrirFicha('${cli.id}')">${esc(cli.nome)}</b>
      <span class="meio-sub">${esc(cortaFrase(l.titulo||"", 80))} · ${motivo==="sem data" ? "sem data" : `lembrete venceu em ${fmt(px)}`}${dd ? ` · direito provável em ${fmt(dd.data)}` : ""}</span>
      <span><label class="meio-sub">rever em <input type="date" min="${hoje()}" onchange="cardReverEm('${l.id}',this.value)"></label>
      <label class="meio-sub">direito em <input type="date" value="${dd ? dd.data : ""}" onchange="cardDataDireito('${l.id}',this.value)"></label>
      <select class="card-arquivar" aria-label="Arquivar o card" onchange="if(this.value){arquivarCard('${l.id}',this.value)}"><option value="">Arquivar…</option>${APOS_MOTIVOS.map(m=>`<option>${m}</option>`).join("")}</select></span></div>`).join("")}
  </details>`;
}
