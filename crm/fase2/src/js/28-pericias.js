const TRAMITA = {escritorio:"Escritório", inss:"INSS", conselho:"Conselho de Recursos", judicial:"Judicial",
  pagamento:"Pagamento", encerrado:"Encerrado", aposentadoria_futura:"Aposentadoria futura"};
const lcCop = (v, rot) => `<span class="cop lc-num" data-cop="${esc(v)}" data-cop-msg="${esc(rot)} copiado" title="clique para copiar">${esc(v)}</span>`;
function lcVerificacao(k){
  // F122 · no Judicial o acompanhamento é automático para todo caso (o robô lê o
  // andamento do processo), então dizer isso na linha só ocupa espaço. A escolha
  // e o registro continuam no segundo ➕, para o caso raro que exija vigia manual.
  if(faseEfetiva(k)==="judicial" || k.fase==="encerrado") return "";   // F236 · o encerrado não tem vigia
  const quem = k.checado_por && D.colPorId.get(k.checado_por);
  const tit = k.checado_em
    ? `verificado por ${quem?quem.nome:"?"} em ${fmt(dataSP(k.checado_em))} às ${horaSP(k.checado_em)}`
    : "ninguém verificou ainda";
  const modo = k.acompanhamento==="manual" ? `<b class="lc-manual">Manual</b>`
    : k.acompanhamento==="automatico" ? `<span class="lc-auto">Automática</span>`
    : `<span class="lc-vazio" title="ainda não se escolheu quem vigia este caso">a definir</span>`;
  return `<span class="lc-f lc-verif" onclick="lcAbrir('${k.id}',2)"
      title="quem vigia o caso: nós (manual) ou o portal/robô (automática). A escolha e o registro da verificação ficam no segundo ➕">
    <span class="lc-k">Verificação</span>${modo}
    <span class="lc-check ${k.checado_em?"ok":""}" title="${esc(tit)}">✓${k.checado_em?` ${fmtBarra(dataSP(k.checado_em))}`:""}</span></span>`;
}
function lcNumeros(k){
  const prev = ehPrev(k), nbs = prev ? nbsDoCaso(k) : [], nups = prev ? crpsNups(k) : [], procs = processosDoCaso(k);
  const par = trilhaParalela(k), j = dadosJudiciais(k);
  const linha = (rot, itens, add, tit) => `<div class="lc-linha"><span class="lc-k">${rot}</span>${itens.join("")}
    <button class="lc-add" onclick="${add}" title="${esc(tit)}" aria-label="${esc(tit)}">+</button></div>`;
  const partes = [];
  // F504 · a tramitação e o aviso da etapa saíram do quadro de detalhes e abrem aqui, no alto
  const fe = faseEfetiva(k), tram = (TRAMITA[fe] || NOME_FASE[fe] || fe || "") + (k.fase==="outro" && fe!=="outro" ? " · prazo correndo" : "");
  if(tram) partes.push(`<div class="lc-linha lc5-tram"><span class="lc-f"><span class="lc-k">Tramitação</span>${(a=>a
    ? (rotA=>a.replace('class="lc-acesso"', 'class="lc-tram lc-tram-link"').replace(/^(<(a|button)\b[^>]*>)[\s\S]*$/, (_, ab, tg)=>`${ab}<span class="lc-tram-n">${esc(tram)}</span> · abrir no ${esc(rotA)}${IC_SVG.ir}</${tg}>`))(a.replace(/<[^>]*>/g, "").replace("↗", "").trim())
    : `<span class="lc-tram">${esc(tram)}</span>`)(acessosDoCaso(k).atual[0])}</span></div>`);
  (a=>a && partes.push(`<div class="lc-linha lc5-tram"><span class="lc-f lc-etapa-aviso" title="etapa do caso: ${esc(k.etapa||"a definir")}">${a}</span></div>`))(etapasDaFase(k).length ? avisoEtapa(k) : "");
  // F162 · o NB principal se troca ali mesmo (o + só acrescenta outro)
  if(nbs.length) partes.push(linha("NB", [
      `<span id="lcnb-nb-${k.id}">${k.nb?lcCop(fmtNb(k.nb),"NB"):""}<button class="lapis" title="trocar ou apagar o NB principal" onclick="editarFato('${k.id}','nb','lcnb')">✎</button></span>`,
      ...nbs.filter(n=>n!==String(k.nb||"").trim()).map(n=>lcCop(fmtNb(n),"NB"))],
    `lcNovoNb('${k.id}')`, "acrescentar outro NB"));
  if(nups.length) partes.push(linha("E-SisREC", nups.map(n=>lcCop(formatarNup(n),"Número do recurso")), `lcNovoNup('${k.id}')`, "acrescentar outro recurso"));
  if(procs.length) partes.push(linha("Judicial", [
      ...procs.map(p=>`<span class="lc-f">${lcCop(fmtProc(p.numero),"Número do processo")}${
        (p.principal&&procs.length>1)?`<span class="lc-papel">principal</span>`:""}${
        p.nosso?"":`<span class="lc-papel">só acompanho</span>`}${
        (par&&soDig(par.numero)===soDig(p.numero))?`<span class="lc-papel ins" title="mandado de segurança que corre em paralelo, para destravar o recurso">MS · instrumental</span>`
        : p.papel==="ms"?`<span class="lc-papel ins" title="mandado de segurança">MS</span>`
        : p.papel==="cumprimento"?`<span class="lc-papel" title="cumprimento de sentença, RPV ou precatório">Cumprimento</span>`:""}</span>`),
      j&&j.rito?`<span class="lc-papel">${esc(j.rito)}</span>`:"",
      j&&j.orgao?`<span class="lc-vazio" title="${esc(tituloOrgao(j.orgao)||j.orgao)}">${esc(String(tituloOrgao(j.orgao)||j.orgao).split(" - ")[0])}</span>`:"",
      botoesPjeDoCaso(k, "btn-mini", ' style="text-decoration:none"')
    ], `lcNovoProc('${k.id}')`, "acrescentar outro processo"));
  const outros = acessosDoCaso(k).outros;
  if(outros.length) partes.push(`<div class="lc-linha"><span class="lc-k">Acessos</span>${outros.join("")}</div>`);
  const falta = [["NB","lcNovoNb",prev && !nbs.length],["E-SisREC","lcNovoNup",prev && !nups.length],["Judicial","lcNovoProc",!procs.length]].filter(x=>x[2]);
  if(falta.length) partes.push(`<div class="lc-linha"><span class="lc-k">Incluir</span>${
    falta.map(([r,f])=>`<button class="btn-mini" onclick="${f}('${k.id}')">+ ${r}</button>`).join("")}</div>`);
  // F220 · com mais de um caso aberto, o número que está no caso errado vai ao certo daqui
  if(casosParaOrganizar(k.cliente_id).length>1) partes.push(`<div class="lc-linha"><span class="lc-k">Outros casos</span>
    <button class="btn-mini" onclick="organizarCasos('${k.cliente_id}')" title="levar NB, protocolo, recurso e processo ao caso certo, ou juntar os casos que são o mesmo benefício"><span aria-hidden="true">⇄ Organizar</span><span class="sr-only">⇄ organizar os números dos casos</span></button></div>`);
  // F287 · aberto, o cartão se lê em seções com título, rótulo à esquerda e valor à direita (pedido do Paulo, 27.10.2026)
  const g2 = lcNivel(k.id)===2;
  return `<div class="lc-numeros" id="lc-numeros-${k.id}"><h4 class="lc-sec">Números do caso</h4>${partes.join("")}
    <button type="button" class="lc-mais lc-mais2" onclick="lcAbrir('${k.id}',${g2?1:2})" aria-expanded="${g2}"
      title="protocolos, verificação, comentário fixo e ações do caso">Gestão do caso${setaAlca(!g2)}</button></div>`;
}
const lcFichaAberta = new Set();
// F114 · todas as datas do caso, na ordem da leitura. A linha mostra as
// essenciais da espécie e gestão do caso guarda o resto.
const DATAS_SECUNDARIAS = ["der","dib","dii","dat","cat_em","dcb","dcb_prorrogar_em","did","grau_deficiencia",
  "consolidacao_em","obito_em","prisao_em","parto_em","cadunico","primeiro_pagamento_em","decisao_em","ajuizado_em"];
function lcNovaData(casoId){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const faltam = DATAS_SECUNDARIAS.filter(c=>!k[c]);
  if(!faltam.length) return aviso("Todas as datas do caso já estão preenchidas");
  caixa(`<h3 style="margin:0 0 6px">＋ Data do caso</h3>
    <p class="meio-sub" style="margin:0 0 8px">A espécie escolhida já traz na linha as datas que decidem este pedido. Aqui entram as demais.</p>
    <div class="form-linha" style="align-items:center">
      <select id="lc-dt-campo" style="flex:1;min-width:180px">${faltam.map(c=>`<option value="${c}">${esc(FATOS[c].rot)}</option>`).join("")}</select>
      <input type="date" id="lc-dt-valor">
      <button class="btn-mini forte" onclick="lcGuardarData('${casoId}')">guardar</button>
    </div>
    <p class="meio-sub" id="lc-dt-dica" style="margin:8px 0 0">${esc(FATOS[faltam[0]].dica)}</p>`);
  const sel = document.getElementById("lc-dt-campo");
  sel.onchange = () => {
    const f = FATOS[sel.value];
    document.getElementById("lc-dt-dica").textContent = f.dica;
    document.getElementById("lc-dt-valor").style.display = f.tipo==="data" ? "" : "none";
  };
  document.getElementById("lc-dt-valor").focus();
}
async function lcGuardarData(casoId){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const campo = document.getElementById("lc-dt-campo").value;
  const valor = document.getElementById("lc-dt-valor").value || null;
  if(!valor) return aviso("Escolha a data");
  const corpo = {[campo]: valor};
  if(campo==="dcb"){ corpo.dcb_prorrogacao_pedida = false; corpo.dcb_prorrogar_em = somaDias(valor,-DIAS_PRORROG); }
  try{ await patchCaso(casoId, corpo); }
  catch(e){ return aviso("Não gravou — rode o crm/fase2/schema_linha_caso.sql no Supabase"); }
  Object.assign(k, corpo); fecharCaixa();
  aviso(`${FATOS[campo].rot} guardada ✔`, false); repintarFicha();
}
function lcGestao(k){
  const prots = (k.protocolos||[]).map(String).filter(Boolean);
  const fx = k.fixo || {};
  const quem = k.checado_por && D.colPorId.get(k.checado_por);
  return `<div class="lc-gestao" id="lc-gestao-${k.id}">
    <div class="lc-linha"><span class="lc-k">Protocolos</span>${prots.length?prots.map(p=>lcCop(p,"Protocolo")).join(""):`<span class="lc-vazio">nenhum</span>`}
      <button class="lc-add" onclick="novoProtocolo('${k.id}')" title="inserir protocolo do INSS" aria-label="inserir protocolo do INSS">+</button></div>
    <div class="lc-linha"><span class="lc-k">Verificação</span>
      <button class="chip-acomp ${k.acompanhamento==="manual"?"on":""}" onclick="mudarAcomp('${k.id}','manual')"
        title="precisamos checar de tempos em tempos (ex.: E-SISREC com a senha do cliente) — entra na lista 🔎 Checagem manual">Manual</button>
      <button class="chip-acomp ${k.acompanhamento==="automatico"?"on":""}" onclick="mudarAcomp('${k.id}','automatico')"
        title="o portal/robô acompanha sozinho — não precisa de checagem">Automática</button>
      <button class="btn-mini" onclick="checarAcomp('${k.id}')" title="registra que você verificou o caso agora"><span aria-hidden="true">✓ Verificado</span><span class="sr-only">✓ verifiquei agora</span></button>
      <span class="lc-vazio">${k.checado_em?`última: ${quem?esc(quem.nome.split(" ")[0]):"?"} · ${fmtBarra(dataSP(k.checado_em))}`:"ninguém verificou ainda"}</span></div>
    ${(faseEfetiva(k)==="judicial"||k.fase==="pagamento")?`<div class="lc-linha"><span class="lc-k">Gratuidade</span>
      <button class="chip-acomp ${k.gratuidade==="concedida"?"on":""}" onclick="mudarGratuidade('${k.id}','concedida')" title="a justiça gratuita foi deferida">Concedida</button>
      <button class="chip-acomp ${k.gratuidade==="negada"?"on":""}" onclick="mudarGratuidade('${k.id}','negada')" title="indeferida ou não pedida: a linha do caso passa a mostrar Sem gratuidade, em vermelho">Não concedida</button>
      <span class="lc-vazio">${k.gratuidade?"clique de novo para limpar":"não informada"}</span></div>`:""}
    <div class="lc-linha"><span class="lc-k">Comentário fixo</span>${fx.texto
      ? `<span class="lc-fixo-txt">${esc(fx.texto)}</span>${fx.lembrar_em?`<span class="lc-papel">lembrar ${fmtBarra(fx.lembrar_em)}</span>`:""}
         <button class="btn-mini" onclick="lcEditarFixo('${k.id}')">✎ editar</button>`
      : `<button class="lc-add" onclick="lcEditarFixo('${k.id}')" title="fixar um comentário em destaque acima dos prazos" aria-label="fixar um comentário">+</button>`}</div>
    ${/* F114 · as datas secundárias moram aqui, fora da linha. Aparecem as
         preenchidas; as vazias entram pelo ＋, que só oferece o que falta. */""}
    <div class="lc-linha"><span class="lc-k">Datas</span>${(()=>{
      const naLinha = new Set(camposEssenciais(k).map(soCampo));
      const tem = DATAS_SECUNDARIAS.filter(c=>c!=="der" && !naLinha.has(c) && k[c]);
      return (tem.length ? tem.map(c=>lcCampo(k,c)).join("") : `<span class="lc-vazio">só as da linha do caso</span>`);
    })()}
      <button class="lc-add" onclick="lcNovaData('${k.id}')" title="informar outra data do caso" aria-label="informar outra data do caso">+</button></div>
    <div class="lc-linha"><span class="lc-k">Ações</span>${acoesDoCaso(k)}</div>
    <details class="lc-ficha" ${lcFichaAberta.has(k.id)?"open":""} ontoggle="this.open?lcFichaAberta.add('${k.id}'):lcFichaAberta.delete('${k.id}')">
      <summary>Ficha completa do caso — natureza, datas, incapacidade, documentos solicitados</summary>
      ${blocoFatos(k)}
    </details>
  </div>`;
}
// ══════════════════════════════════════════════════════════════════════════
// F114 · O ESSENCIAL DE CADA ESPÉCIE NA LINHA DO CASO (pedido do Paulo,
// 17.09). A linha mostra o que decide AQUELE pedido e só isso. Incapacidade
// temporária pede DCB; aposentadoria da pessoa com deficiência pede DID e
// grau; pensão pede a data do óbito; auxílio-reclusão, a data da prisão. O
// resto das datas desce para gestão do caso, onde nada se perde.
// A regra é herdada: a ESPÉCIE traz a lista base e a SUBESPÉCIE acrescenta.
// "B42.PCD.ESP" resolve como B42 mais B42.PCD, nunca como regra nova.
// Acima de todas elas, DIB e DCB preenchidas aparecem na linha em QUALQUER
// espécie: benefício que já saiu e cessação marcada não se escondem atrás
// de um clique (pedido do Paulo, 18.09).
// Levantamento em crm/fase2/REGRAS-POR-ESPECIE.md, com a fonte de cada item.
// ══════════════════════════════════════════════════════════════════════════
// O campo com "?" na frente só aparece PREENCHIDO. Serve para o dado que
// nasce depois, como a DIB, que não existe enquanto o pedido está em pé.
const ESSENCIAL = {
  // incapacidade · a DII fixa qualidade e carência, a DCB comanda a prorrogação
  B31:["dii","dcb"], "B31.PREEX":["did"],
  B91:["dat","dii","dcb"],
  B32:["dii"], "B32.CONV":["dcb"],
  B92:["dat","dii"],
  B52:["dii","dcb"], B04:["dii"],
  // auxílio-acidente · a consolidação separa do B31 e a DCB do B31 fixa a DIB
  B36:["consolidacao_em","dcb"],
  B94:["dat","consolidacao_em","dcb"],
  B26:["dii"],
  // aposentadorias · quem decide é a DER, já na linha, e a DIB quando sai
  B41:[], "B41.PCD":["did","grau_deficiencia"],
  B42:[], "B42.PCD":["did","grau_deficiencia"],
  B46:[], B57:[],
  // dependentes · a data do evento é que abre a janela de retroação
  B21:["obito_em"], "B21.INVAL":["did"],
  B01:["obito_em"], B93:["obito_em","dat"],
  B25:["prisao_em"],
  // maternidade e assistenciais
  B80:["parto_em"],
  B87:["did","cadunico"], B88:["cadunico"],
  // revisões e serviços · o 1º pagamento é que conta a decadência do art. 103
  REV:["primeiro_pagamento_em","dib"],
  REST:["dcb"],
  IIR:["did"],
};
// vale para TODA espécie, inclusive a que não tem lista própria: benefício
// que já saiu mostra a DIB, e cessação marcada mostra a DCB — sem abrir
// gestão do caso (pedido do Paulo, 18.09).
const ESSENCIAL_SEMPRE = ["?dib","?dcb"];
const soCampo = t => String(t).replace(/^\?/,"");
function camposEssenciais(k){
  const toks = [];
  const juntar = lista => { for(const t of (lista||[])){
    const i = toks.findIndex(x=>soCampo(x)===soCampo(t));
    if(i<0) toks.push(t);
    else if(t[0]!=="?") toks[i] = t;   // o "sempre à vista" vence o "só preenchido"
  }};
  const p = String(k.subespecie || k.especie || "").split(".");
  for(let i=1;i<=p.length;i++) juntar(ESSENCIAL[p.slice(0,i).join(".")]);
  juntar(ESSENCIAL_SEMPRE);
  // F236 · pedido negado e sem DIB: não há benefício nem cessação a informar; a DCB só aparece se alguém a preencher
  if(!k.dib && !k.dcb && (k.resultado==="indeferido" || /indeferid/i.test(k.situacao_inss||"") || (faseDaEtapa(k)==="inss" && (decisaoDoInss(k)||{}).resultado==="indeferido")))
    return toks.map(t => soCampo(t)==="dcb" ? "?dcb" : t);
  if(k.fase==="encerrado") return toks.map(t => t[0]==="?" ? t : "?"+t);   // F236 · encerrado: só o que tem valor
  return toks;
}
// o aviso que a própria data calcula — aparece só quando muda a conduta
function lcJanela(k, campo){
  if(campo==="dcb" && k.dcb && !k.dcb_prorrogacao_pedida && k.fase!=="encerrado"){
    const d = diasAte(k.dcb);
    // F236 · no recurso e na ação, a DCB passada é a cessação discutida: dado do caso, e não alarme
    if(d<0 && dcbPassadaForaDoInss(k)) return `<small class="lc-jan" title="a cessação que o recurso ou a ação discute">cessou em ${fmtBarra(k.dcb).slice(0,5)}</small>`;
    if(d<0) return `<small class="lc-jan venc" title="o benefício já cessou e a prorrogação não foi pedida">cessou há ${-d} d</small>`;
    return `<small class="lc-jan ${d<=15?"venc":""}" title="${d<=15?"a prorrogação se pede nos últimos 15 dias do benefício":"a prorrogação se pede nos últimos 15 dias do benefício, não antes"}">em ${d} d</small>`;
  }
  if((campo==="obito_em" || campo==="prisao_em") && k[campo]){
    const ondeDib = campo==="obito_em" ? "no óbito" : "na prisão";
    const t = `requerimento em até 90 dias retroage ${ondeDib}, e em até 180 dias para dependente menor de 16 anos (art. 74, I, da Lei 8.213/91)`;
    const lim = somaDias(k[campo], 90);
    if(k.der) return k.der <= lim
      ? `<small class="lc-jan ok" title="${esc(t)}">DIB ${ondeDib}</small>`
      : `<small class="lc-jan venc" title="${esc(t)}">DER fora dos 90 d, DIB na DER</small>`;
    const d = diasAte(lim);
    return d<0 ? `<small class="lc-jan venc" title="${esc(t)}">os 90 d venceram há ${-d} d</small>`
               : `<small class="lc-jan ${d<=30?"venc":""}" title="${esc(t)}">90 d até ${fmtBarra(lim)}</small>`;
  }
  if(campo==="cadunico" && k.cadunico){
    const d = diasAte(somaDias(k.cadunico, 730));
    return d<0 ? `<small class="lc-jan venc" title="o CadÚnico vence em 2 anos e o benefício é bloqueado sem atualização">venceu há ${-d} d</small>`
      : `<small class="lc-jan ${d<=60?"venc":""}" title="o CadÚnico vale 2 anos">vence em ${d} d</small>`;
  }
  if(campo==="primeiro_pagamento_em" && k.primeiro_pagamento_em){
    const lim = somaDias(k.primeiro_pagamento_em, 3653), d = diasAte(lim);
    const t = "a decadência do art. 103 conta do dia primeiro do mês seguinte ao primeiro pagamento; a ação não a interrompe (Tema 975/STJ)";
    return d<0 ? `<small class="lc-jan venc" title="${esc(t)}">decaiu há ${-Math.round(d/30)} meses</small>`
      : `<small class="lc-jan ${d<=365?"venc":""}" title="${esc(t)}">decai em ${fmtBarra(lim)}</small>`;
  }
  return "";
}
// um campo do caso na linha, com o valor, o aviso e a canetinha. O prefixo
// "lc" mantém os ids fora do caminho do cartão de fatos, que usa "fx".
function lcCampo(k, token){
  const so = String(token)[0]==="?", campo = soCampo(token);
  const f = FATOS[campo]; if(!f) return "";
  const v = k[campo];
  if(so && !v) return "";              // o dado que só existe depois, como a DIB
  const mostra = !v ? `<span class="lc-vazio">a informar</span>`
    : f.tipo==="data" ? `<span class="cop lc-num" data-cop="${fmtBarra(v)}" data-cop-msg="${esc(f.rot)} copiada" title="clique para copiar">${fmtBarra(v)}</span>`
    : `<b class="lc-manual">${esc(v)}</b>`;
  return `<span class="lc-f" title="${esc(f.dica + fonteQuadro(k, campo))}"><span class="lc-k">${esc(f.rot)}</span>
    <span id="lc-${campo}-${k.id}">${mostra}</span>${lcJanela(k, campo)}
    <button class="lapis" title="alterar ${esc(f.rot)}" onclick="editarFato('${k.id}','${campo}','lc')">✎</button></span>`;
}
// F121 · a posição na fila de julgamento, só o número, na linha do caso
// [BUG 20.09.2026] RECURSO PARADO HÁ ANOS ficava aberto no Conselho sem dizer
// nada. Quando o NUP órfão do e-Sisrec vira caso, ninguém confere a idade do
// recurso: o de uma cliente não tem movimento desde 14/02/2021
// e estava lá, ativo, na lista. O CRM não sabe se acabou, mas sabe dizer há
// quanto tempo não anda — e isso basta para o caso ser revisto.
const MESES_PARADO = 6;
function ultimoEventoCrps(k){
  let maior = "";
  for(const b of crpsBlocos(k)) for(const e of (b.eventos || [])){
    const d = String(e.data || "").slice(0, 10);       // dd/mm/aaaa
    const iso = /^\d{2}\/\d{2}\/\d{4}$/.test(d) ? `${d.slice(6)}-${d.slice(3,5)}-${d.slice(0,2)}` : "";
    if(iso > maior) maior = iso;
  }
  return maior || null;
}
function recursoParado(k){
  if(faseEfetiva(k) !== "conselho") return "";
  const u = ultimoEventoCrps(k);
  if(!u || u >= somaMeses(hoje(), -MESES_PARADO)) return "";
  const dica = `o recurso não tem movimento no e-Sisrec desde ${fmtBarra(u)}. `
    + "Confira se já foi decidido: caso encerrado no Conselho não deveria seguir nesta lista.";
  return `<span class="lc-f" title="${esc(dica)}">
    <span class="lc-k">Recurso</span><b class="lc-parado">parado desde ${fmtBarra(u)}</b></span>`;
}
// O painel cobre a 3ª Região inteira, vara e JEF de primeiro grau inclusive, e
// a fila de cada um é fila de julgamento do seu órgão. Por isso a posição vale
// para todos, e a dica nomeia o órgão em vez de afirmar segundo grau.
function filaTrf3(k){
  const t = k.trf3;
  if(!t || !t.ordem || faseEfetiva(k)!=="judicial") return "";
  const tot = t.total ? ` de ${Number(t.total).toLocaleString(IDIOMA)}` : "";
  const dica = `posição na ordem de julgamento de ${t.orgao||"o órgão julgador"}${t.turma?` (${t.turma})`:""}`
    + `${t.consultado_em?`, consulta de ${fmtBarra(t.consultado_em)}`:""}`
    + ". Painel público do TRF3. Clique para copiar a mensagem pronta ao cliente.";
  return `<span class="lc-f" title="${esc(dica)}" onclick="copiarTrf3('${k.id}')" style="cursor:copy">
    <span class="lc-k">Fila</span><b class="lc-fila">${t.ordem}º</b><small class="lc-jan">${esc(tot)}</small>
    ${/* F236 · a posição anda: a data da consulta e a previsão viajam com o número, na tela e não só no title */""}
    ${t.consultado_em?`<small class="lc-jan">em ${esc(fmtBarra(t.consultado_em).slice(0,5))}</small>`:""}
    ${t.projecao&&t.projecao.previsao?`<small class="lc-jan" title="estimativa nossa pelo ritmo do órgão, não é data do tribunal">previsão ~${esc(mesAno(t.projecao.previsao))}</small>`:""}
    ${t.prioridade==="S"?`<small class="lc-jan ok" title="o processo tramita com prioridade">prioridade</small>`:""}</span>`;
}
// ── ACESSOS DO CASO (pedido do Paulo, 10.10.2026) ──────────────────────
// Um clique leva ao portal onde o caso está. Fica à vista só o da fase atual
// (INSS: PAT, ou Meu INSS quando o pedido não está no PAT; Conselho:
// e-SISREC; Judicial: o grau mais alto do processo). Os demais aparecem no +
// da linha do caso. O PAT abre pela tarefa do protocolo; o Meu INSS não tem
// endereço por pedido conhecido, por isso abre a página inicial e deixa o
// protocolo copiado. O eproc só tem link quando a coleta o trouxe (o endereço
// leva o hash da sessão).
const PAT_TAREFA = "https://atendimento.inss.gov.br/tarefas/detalhar_tarefa/";
const MEU_INSS = "https://meu.inss.gov.br/";
function abrirMeuInss(prot){
  if(prot) copiar(prot, "Protocolo copiado — cole na consulta de pedidos do Meu INSS");
  window.open(MEU_INSS, "_blank", "noopener");
}
function acessosDoCaso(k){
  // F301 · o símbolo do sistema (INSS, e-SISREC, PJe, e-SAJ, eproc) antes do nome
  const ic = rot => iconeFonte(/^PAT|INSS/.test(rot) ? "inss" : /SISREC/.test(rot) ? "crps" : /e-SAJ/.test(rot) ? "esaj" : /eproc/.test(rot) ? "eproc" : /PJe/.test(rot) ? "pje" : "");
  const a = (href, rot, tit) => `<a class="lc-acesso" href="${urlOk(href)}" target="_blank" rel="noopener" title="${esc(tit)}">${ic(rot)} ${esc(rot)} ↗</a>`;
  const prots = (k.protocolos||[]).map(x=>soDig(x)).filter(Boolean);
  const inss = [];
  if(k.processo_link) inss.push(a(k.processo_link, "PAT", "abrir a tarefa no PAT"));
  else if(prots.length) inss.push(`<button class="lc-acesso" onclick="abrirMeuInss('${prots[0]}')"
      title="o pedido não está no PAT: abre o Meu INSS e copia o protocolo ${prots[0]}">${iconeFonte("inss")} Meu INSS ↗</button>`);
  // protocolo com tarefa no PAT, além do que já tem link
  prots.filter(x=>!String(k.processo_link||"").endsWith(x)).slice(0, k.processo_link?3:0)
    .forEach(x=>inss.push(a(PAT_TAREFA+x, `PAT ${x}`, `abrir a tarefa ${x} no PAT`)));
  const conselho = crpsNups(k).map(n=>a(linkERecursos(n), crpsNups(k).length>1?`e-SISREC ${formatarNup(n)}`:"e-SISREC",
    `abrir o recurso ${formatarNup(n)} no e-SISREC`));
  // judicial: um por grau, o mais alto primeiro
  const m = linksPjeDoCaso(k), graus = Object.keys(m).filter(g=>m[g] && !g.includes("|")).sort().reverse();
  let jud = graus.map(g=>a(m[g], `${nomeSistemaDoLink(m[g])} · ${g}`, `abrir os autos do ${g} na sua sessão do ${nomeSistemaDoLink(m[g])}`));
  if(!jud.length && k.pje_link) jud = [a(k.pje_link, nomeSistemaDoLink(k.pje_link), "abrir os autos digitais")];
  if(!jud.length && justicaDoNumeroCnj(k.processo)==="estadual"){
    const l = linkEsajPorNumero("1º grau", k.processo);
    if(l) jud = [a(l, "e-SAJ · 1º grau", "abrir a consulta do processo no e-SAJ")];
  }
  const fe = faseEfetiva(k);   // F236
  const ordem = !ehPrev(k) ? [jud]     // F615 · fora da previdenciária não há Meu INSS, PAT nem e-SISREC
    : fe==="inss" ? [inss, conselho, jud]
    : fe==="conselho" ? [conselho, inss, jud]
    : (fe==="judicial" || fe==="pagamento") ? [jud, conselho, inss] : [[], inss, conselho, jud];
  const [atual, ...resto] = ordem;
  // no Judicial só o grau mais alto fica à vista; o outro grau vai para o +
  return { atual: atual.slice(0,1), outros: [...atual.slice(1), ...resto.flat()] };
}
// a gratuidade só fala quando foi negada (pedido do Paulo, 10.10.2026)
const semGratuidade = k => (faseEfetiva(k)==="judicial" || k.fase==="pagamento") && k.gratuidade==="negada";
async function mudarGratuidade(casoId, v){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const novo = k.gratuidade===v ? null : v;
  try{ await patchCaso(casoId, {gratuidade: novo}); }
  catch(e){ return aviso("Não gravou — rode o crm/fase2/schema_gratuidade.sql no Supabase"); }
  k.gratuidade = novo; repintarFicha();
}
// F236 · o título da tarefa do To Do quando não é só o nome do cliente ("Renegociar empréstimo do banco")
function tituloProprio(k){
  const t = semCpfTitulo(k.titulo||"").replace(/\s*#\s*[A-Z]?\d{2,3}(\.[A-Z.]+)?\s*$/i,"").trim(), c = D.cliPorId.get(k.cliente_id);
  return t && dsa(t)!==dsa((c||{}).nome||"") ? t : "";
}
// a lista do To Do de onde o caso da fase "outro" veio, e a do prazo fatal
function listaDoOutro(k){
  const l = listaDe(k), de = (k.ronda||{}).prazo_de;
  return l==="—" ? "Outros" : de && de!==l ? `${l} · veio de ${de}` : l;
}
// F504 · O QUADRO DO CASO (protótipo do Lovable aprovado pelo Paulo, 10.11.2026): o cabeçalho na cor de onde o
// caso está agora (a mesma tinta dos cartões do Dashboard, F486) e, no canto direito, o nome do lugar
const LC_FASE = {escritorio:["#0E5C58","Escritório"], inss:["#4F78B0","INSS"], conselho:["#8A5A1E","CRPS"],
  judicial:["#6B3FA0","Judicial"], pagamento:["#6B3FA0","Pagamento"], encerrado:["#6B7070","Encerrado"]};
function lcLugar(k){
  if(k.fase==="encerrado") return LC_FASE.encerrado;
  const fe = faseEfetiva(k), dica = k.fase==="outro" ? listaDoOutro(k) : "";
  // o caso da fase "outro" diz o lugar verdadeiro (F236) e a lista do To Do fica no title
  return LC_FASE[fe] ? [...LC_FASE[fe], dica] : [LC_FASE.escritorio[0], dica || NOME_FASE[fe] || fe || "Escritório", ""];
}
// F615 · o cartão do caso não previdenciário: processo, vara, partes e valor da causa. Vara, valor e
// polos vêm do cabeçalho do PJe (casos.ronda.detalhes, F509) e de orgao_judicial; as partes à mão em ronda.partes
function detalhesPje(k){
  const dig = soDig(k.processo||""), ds = Object.entries((k.ronda||{}).detalhes||{});
  return ((ds.find(([c])=>c.split("|")[0]===dig) || ds[0] || [])[1]) || {};
}
function lcGradeArea(k){
  const d = detalhesPje(k), dv = rx => d[Object.keys(d).find(c=>rx.test(c))] || "";
  const vara = orgaoJudCurto(dv(/^[óo]rg[ãa]o julgador/i) || k.orgao_judicial || "");
  const polos = [dv(/^polo ativo/i), dv(/^polo passivo/i)].filter(Boolean).join(" × ");
  const partes = (k.ronda||{}).partes || polos, valor = dv(/^valor da causa/i);
  const f = (rot, v, cls="") => `<span class="lc-f${cls}"><span class="lc-k">${rot}</span>${v || `<span class="lc-vazio">não informado</span>`}</span>`;
  return [f("Processo", k.processo ? lcCop(fmtProc(k.processo), "Número do processo") : ""),
    f("Vara", vara ? esc(vara) : ""),
    `<span class="lc-f lc-partes"><span class="lc-k">Partes</span>${partes ? `<b class="lc-manual">${esc(partes)}</b>` : `<span class="lc-vazio">não informadas</span>`}<button class="lapis" title="escrever as partes" onclick="editarPartes('${k.id}')">✎</button></span>`,
    f("Valor da causa", valor ? esc(valor) : "")].join("");
}
async function gravarRonda(k, ronda, msg){
  const antes = k.ronda || null;
  try{ await patchCaso(k.id, {ronda}); }catch(e){ return aviso("Não gravou — tente de novo"); }
  k.ronda = ronda; fecharCaixa(); repintarSusp();
  avisoDesfazer(msg, async ()=>{ k.ronda = antes; await patchCaso(k.id, {ronda:antes}).catch(()=>{}); aviso("Desfeito"); repintarSusp(); });
}
function editarPartes(casoId){
  const k = D.casoPorId.get(casoId); if(!k) return;
  caixa(`<h3 style="margin:0 0 8px">Partes do processo</h3>
    <input id="lc-partes-in" maxlength="300" style="width:100%" placeholder="Autor × Réu" value="${esc((k.ronda||{}).partes||"")}">
    <div class="form-linha" style="margin-top:10px"><button class="btn-rap" style="margin-left:auto" onclick="gravarPartes('${casoId}')" title="Gravar as partes">Gravar<span class="sr-only"> as partes</span></button></div>`);
  setTimeout(()=>{ const i = document.getElementById("lc-partes-in"); if(i) i.focus(); }, 30);
}
function gravarPartes(casoId){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const v = ((document.getElementById("lc-partes-in")||{}).value||"").trim(), ronda = {...(k.ronda||{})};
  if(v) ronda.partes = v; else delete ronda.partes;
  return gravarRonda(k, ronda, "Partes gravadas");
}
function escolherArea(casoId){
  const k = D.casoPorId.get(casoId); if(!k) return;
  caixa(`<h3 style="margin:0 0 4px">Matéria do caso <small class="meio-sub">· ${esc(tituloProprio(k) || tituloCaso(k))}</small></h3>
    <p class="meio-sub" style="margin:0 0 8px">Fora da previdenciária o caso fica só com as anotações e os prazos anotados à mão: sem DER, NB, espécie, Meu INSS, CRPS, Resumo do caso nem etapas do INSS.</p>
    <div class="form-linha" style="flex-wrap:wrap;gap:6px">${Object.entries(AREAS).map(([a, r])=>
      `<button class="btn-mini${areaDe(k)===a?" on":""}" data-area="${a}" onclick="gravarArea('${casoId}','${a}')" aria-pressed="${areaDe(k)===a}">${esc(r)}</button>`).join("")}</div>`);
}
async function gravarArea(casoId, area){
  const k = D.casoPorId.get(casoId); if(!k || !AREAS[area]) return;
  const antes = areaDe(k); if(antes===area){ fecharCaixa(); return; }
  try{ await patchCaso(casoId, {area}); }catch(e){ return aviso("Não gravou — tente de novo"); }
  k.area = area; fecharCaixa(); repintarSusp();
  avisoDesfazer(`Matéria: ${AREAS[area]}`, async ()=>{ k.area = antes; await patchCaso(casoId, {area:antes}).catch(()=>{}); aviso("Desfeito"); repintarSusp(); });
}
function linhaCaso(k){
  const n = lcNivel(k.id), prev = ehPrev(k);
  const [cor, lugar, dica] = lcLugar(k);
  const pr = /^(inss|conselho)$/.test(faseEfetiva(k)) ? (k.protocolos||[]).map(String).filter(Boolean)[0] : "";
  const chips = [
    k.natureza?`<span class="chip nat-chip" title="natureza do pedido">${esc(rotNatureza(k.natureza))}</span>`:"",
    (s=>s?`<button type="button" class="chip lc-susp" onclick="suspenderCaso('${k.id}')" title="${esc(tituloSusp(s))}: clique para alterar ou retomar">⏸ Suspenso · ${esc(rotSusp(s))}</button>`:"")(suspensaoDe(k)),
    (c=>c && !suspensaoDe(k) && k.fase!=="encerrado" ? `<span class="chip lc-susp lc-susp-conf" title="o movimento do ${esc(c.fonte)} fala em suspensão, mas não traz o número do tema">⏸ Suspensão sem tema · <button type="button" class="btn-mini" onclick="suspenderCaso('${k.id}')" title="Informar o tema da suspensão">Suspender<span class="sr-only"> informando o tema</span></button> <button type="button" class="btn-mini" onclick="suspConferirNao('${k.id}')" title="O caso não está suspenso por tema">Não<span class="sr-only"> está suspenso por tema</span></button></span>` : "")((k.ronda||{}).susp_conferir),
    semGratuidade(k)?`<span class="chip lc-sem-grat" title="a gratuidade da justiça não foi concedida neste processo: custas e honorários de sucumbência podem ser cobrados">Sem gratuidade</span>`:"",
    prev ? `<span class="lc5-fase">Fase atual: <b>${esc(lugar)}</b></span>${k.etapa ? `<span class="lc5-etapa" role="button" tabindex="0" onclick="escolherEtapa('${k.id}')" title="etapa do caso: clique para mudar">${seloEtapaLista(k)}</span>` : ""}` : "",   // F666 · o quadro de etapas saiu do caso; a fase e a etapa ficam aqui
].filter(Boolean).join("");
  return `<section class="linha-caso lc5" data-n="${n}" aria-label="O caso" style="--lc-cor:${cor}">
    <div class="lc-topo">
      <div class="lc5-cab">
        ${!prev ? `<div class="lc-sobre-l"><span class="lc-sobre lc5-esp lc5-area" title="matéria do caso">${esc(AREAS[areaDe(k)])}</span>
        <button class="lapis" title="trocar a matéria deste caso" aria-label="trocar a matéria deste caso" onclick="escolherArea('${k.id}')">✎</button></div>`
        : areaAEscolher(k) ? `<div class="lc-sobre-l"><button type="button" class="lc-sobre lc5-esp lc5-area-esc" onclick="escolherArea('${k.id}')" title="caso da lista do Dr. Marcos sem espécie: escolher a matéria">Matéria?<span class="sr-only"> escolher a matéria do caso</span></button></div>`
        : `<div class="lc-sobre-l">${k.especie ? `<span class="lc-sobre lc5-esp" title="espécie do INSS">${esc(k.especie)}</span>` : `<span class="lc-sobre lc5-esp lc5-esp-vazia" title="espécie não definida">?</span>`}
        <button class="lapis" title="trocar a espécie ou o pedido deste caso" aria-label="trocar a espécie ou o pedido deste caso" onclick="escolherEspecie('${k.id}')">✎</button></div>`}
        <div class="lc-cab"><b class="lc-ben ${(k.especie||k.beneficio||tituloProprio(k))?"":"lc-vazio"}" title="${esc(k.especie?`${k.especie} · `:"")}${esc((k.especie||k.beneficio) ? tituloCaso(k) : tituloProprio(k) || tituloCaso(k))}. Clique na canetinha para trocar">${
          !prev ? esc(tituloProprio(k) || `Caso ${AREAS[areaDe(k)].toLowerCase()}`) : (k.especie||k.beneficio) ? esc(tituloCaso(k)) : tituloProprio(k) ? esc(tituloProprio(k)) : "definir o pedido"}</b></div>
        <span class="lc5-lugar" title="${esc(dica ? `lista: ${dica}` : "onde o caso está agora")}">${esc(lugar)}</span>
        
        ${menuMais([
          `<button class="tl-mais-it lc-claude" role="menuitem" onclick="menuClaude('${k.id}')" title="pedir ao Claude sobre este caso (abre o Claude com o pedido escrito)"><span aria-hidden="true">✦ Claude</span><span class="sr-only">✦ Pedir ao Claude</span></button>`,
          k.fase!=="encerrado" && !ehPreCaso(k) ? `<button class="tl-mais-it desp-bt" role="menuitem" onclick="despachar('${k.id}',event)" title="Concluir por hoje: escolher quando o cliente volta à fila e tirar do Meu Dia; se quiser, passar a outra pessoa">✔ Concluir<span class="sr-only"> por hoje</span></button>` : "",
          k.fase!=="encerrado" && !ehPreCaso(k) && !suspensaoDe(k) ? `<button class="tl-mais-it lc-suspender" role="menuitem" onclick="suspenderCaso('${k.id}')" title="marcar o caso como suspenso por tema do STF, do STJ, da TNU ou do TRF3">⏸ Suspender<span class="sr-only"> por tema</span></button>` : "",
          `<button class="tl-mais-it lc-area" role="menuitem" onclick="escolherArea('${k.id}')" title="trocar a matéria do caso (previdenciária, cível, trabalhista, família, criminal, tributária)">Matéria<span class="sr-only"> do caso</span></button>`,
          `<button class="tl-mais-it lc-seguir" role="menuitem" onclick="seguirCaso('${k.id}')" title="${sigoCaso(k.id) ? "deixar de receber as anotações e os movimentos deste caso nas Menções" : "receber nas Menções cada anotação e cada movimento oficial deste caso, sem ser responsável"}">${sigoCaso(k.id) ? `Seguindo<span class="sr-only">: deixar de seguir</span>` : `Seguir<span class="sr-only"> o caso</span>`}</button>`,
          `<button class="tl-mais-it lc-apagadas" role="menuitem" onclick="verApagadas('${k.id}')" title="ver as anotações e os prazos apagados deste caso, com quem apagou e quando">Apagadas<span class="sr-only"> anotações</span></button>`,
          k.fixo && k.fixo.texto ? "" : `<button class="tl-mais-it fixar-caso" role="menuitem" onclick="lcEditarFixo('${k.id}')" title="fixar um comentário que aparece em destaque ao abrir o caso">${ICO_PIN} Fixar<span class="sr-only"> comentário</span></button>`,
        ]).replace('class="tl-mais"', 'class="tl-mais mais-baixo lc-menu"')}
      </div>
      ${chips ? `<div class="lc5-chips">${chips}</div>` : ""}
      ${/* F504 · a grade de detalhes: datas na fonte do CRM, NB e protocolo na fonte de código; o toque no número copia */""}
      <div class="lc-placa lc5-grade">
      ${!prev ? lcGradeArea(k) : `${k.fase==="encerrado" && !k.der ? "" : `<span class="lc-f"><span class="lc-k">DER</span>${k.der
        ? `<span class="cop lc-num" data-cop="${fmtBarra(k.der)}" data-cop-msg="DER copiada" title="clique para copiar${esc(fonteQuadro(k,"der"))}">${fmtBarra(k.der)}</span>`
        : `<span class="lc-vazio">não informada</span>`}<button class="lapis" title="alterar a DER" onclick="editarFato('${k.id}','der')">✎</button></span>`}
      ${camposEssenciais(k).map(c=>lcCampo(k,c)).join("")}
      ${k.nb && !camposEssenciais(k).some(c=>soCampo(c)==="nb") ? `<span class="lc-f lc-nb"><span class="lc-k">NB</span>${lcCop(fmtNb(k.nb),"NB")}</span>` : ""}
      ${pr ? `<span class="lc-f lc-prot"><span class="lc-k">Protocolo</span>${lcCop(pr,"Protocolo")}</span>` : ""}
      ${filaTrf3(k)}
      ${recursoParado(k)}
      ${avisoQuadro(k)}`}
      </div>
      <button type="button" class="lc-mais lc-mais-pe lc-dobra" onclick="lcAbrir('${k.id}',${n?0:1})" aria-expanded="${n?"true":"false"}"
        title="${n?"fechar":"tramitação, etapa, números do caso (NB, e-Sisrec, processo judicial) e a gestão do caso"}"><span>Números do caso e gestão</span>${setaAlca(!n)}</button>
    </div>
    ${n>=1?lcNumeros(k):""}
    ${n>=2?lcGestao(k):""}
  </section>`;
}
// ══════════════════════════════════════════════════════════════════════════
// F183 · A JORNADA E A TRILHA DO RITO (canvas "Trilha de etapas", 06.10.2026)
// ══════════════════════════════════════════════════════════════════════════
// No alto do caso, de ponta a ponta: a JORNADA (Escritório vermelho, INSS
// amarelo, Conselho azul, Judicial verde) e, abaixo, a TRILHA da fase com as
// etapas do rito daquele caso. Cada etapa é marcada por si (cumprida com data,
// atual, não houve), e não pela posição: no JEF de incapacidade e no
// acidentário a perícia vem antes da contestação, e a trilha diz isso.
// A execução (trânsito ao levantamento) fica em roxo dentro da judicial.
// As marcas moram em casos.trilha = {rito, m:{"<rito>:<etapa>":{s,d,x}}};
// a etapa ATUAL também grava casos.etapa com a palavra antiga equivalente
// (PUB_TRILHA), que é a que o portal e o resto do CRM já entendem.
// Etapa: "Grupo|Nome" abre grupo; "*" na frente = só se houver; "#" = execução.
// F545 · as fases seguem as cores dos quadros do caso (LC_FASE): Escritório verde, INSS azul, Conselho marrom, Judicial e Pagamento roxo
// (F504). Nenhuma fase usa vermelho
// nem âmbar, que no CRM querem dizer prazo fatal e prazo perto.
const COR_FASE = {
  escritorio:{n:"Escritório", c:"#0E5C58", f:"#E6F0EF", t:"#0B4744"},
  inss:      {n:"INSS",       c:"#4F78B0", f:"#E9F0F8", t:"#2B4C7A"},
  conselho:  {n:"Conselho",   c:"#8A5A1E", f:"#F5EEE4", t:"#6B4517"},
  judicial:  {n:"Judicial",   c:"#6B3FA0", f:"#F0EAF7", t:"#4E2D78"}};
const COR_EXEC = {c:"#6B3FA0", f:"#F0EAF7", t:"#4E2D78"};
const DOCS_AGUARDO = ["relatório médico","PPP e LTCAT da empresa","prontuário médico","documento do RH ou empregador",
  "cópia do processo administrativo","CTPS e carnês","documentos pessoais","acesso gov.br"];
const EXEC_TRILHA = ["#Execução|Trânsito em julgado","#Implantação do benefício","#Cálculos (contadoria ou INSS)",
  "#Manifestação sobre os cálculos","#*Impugnação do INSS","#Cálculos homologados","#RPV ou precatório expedido",
  "#RPV paga","#Levantamento","#Honorários recebidos"];
const TRILHAS = {
  escritorio:{fase:"escritorio", nome:"Atendimento", e:["Primeiro contato","Atendimento presencial","Triagem",
    "Análise de direito","Aguardando documentos","Documentos completos","Contrato e procurações assinados","Pronto para protocolar"]},
  peticao:{fase:"escritorio", nome:"Petição inicial", e:["A redigir","Redigida","Revisão","A protocolar"]},
  futura:{fase:"escritorio", nome:"Aposentadoria futura", e:["Monitorando","*Contribuição orientada","Documentação em dia","Pronto para protocolar"]},
  inss_apos:{fase:"inss", nome:"Aposentadorias e pensão", e:["Requerimento protocolado","Em análise","*Em exigência",
    "*Exigência cumprida","*Justificação administrativa","Decisão","Carta de concessão"]},
  inss_inc:{fase:"inss", nome:"Incapacidade", e:["Requerimento protocolado","*Análise documental (Atestmed)","*Reanálise documental","Perícia agendada",
    "Perícia realizada","Decisão","*Pedido de prorrogação","DCB"]},
  inss_b94:{fase:"inss", nome:"Auxílio-acidente", e:["Requerimento protocolado","*Em exigência","Perícia agendada",
    "Perícia realizada","Decisão","Carta de concessão"]},
  inss_bpc:{fase:"inss", nome:"BPC e aposentadoria PCD", e:["Requerimento protocolado","CadÚnico conferido",
    "Avaliação social agendada","Avaliação social realizada","Perícia médica agendada","Perícia médica realizada","*Em exigência","Decisão"]},
  crps_junta:{fase:"conselho", nome:"Junta de Recursos", e:["Recurso ordinário protocolado","*Contrarrazões do INSS",
    "Encaminhado à Junta","Distribuído ao relator","*Diligência ou parecer médico","Pautado","Acórdão da Junta","*Embargos de declaração"]},
  crps_camara:{fase:"conselho", nome:"Câmara de Julgamento", e:["Recurso especial protocolado","*Contrarrazões",
    "Encaminhado à Câmara","Distribuído ao relator","Pautado","Acórdão da Câmara","*Embargos de declaração","Cumprimento pelo INSS"]},
  // F236 · a citação expedida ("aguardando citação") é passo próprio, antes ou depois da perícia, e os conclusos para sentença também
  jef_inc:{fase:"judicial", nome:"JEF · incapacidade e BPC", e:["Ajuizamento|Ação distribuída","*Instrução|Citação expedida","Perícia médica designada",
    "Perícia realizada","Laudo juntado","Manifestação sobre o laudo","*Avaliação social","Citação e contestação","*Proposta de acordo",
    "*Conclusos para sentença","Sentença|Sentença","*Embargos de declaração","Recurso|Recurso inominado","Contrarrazões","Acórdão da Turma Recursal",
    "*Pedido de uniformização", ...EXEC_TRILHA]},
  jef_apos:{fase:"judicial", nome:"JEF · aposentadorias", e:["Ajuizamento|Ação distribuída","*Instrução|Citação expedida","Citação e contestação","Réplica",
    "*Audiência e testemunhas","*Cálculo da contadoria","*Conclusos para sentença","Sentença|Sentença","*Embargos de declaração","Recurso|Recurso inominado",
    "Contrarrazões","Acórdão da Turma Recursal","*Pedido de uniformização", ...EXEC_TRILHA]},
  vara:{fase:"judicial", nome:"Vara Federal · rito comum", e:["Ajuizamento|Ação distribuída","*Instrução|Citação expedida","Citação e contestação","Réplica",
    "Especificação de provas","*Perícia técnica ou audiência","*Alegações finais","*Conclusos para sentença","Sentença|Sentença","*Embargos de declaração",
    "Recurso|Apelação","Contrarrazões","Acórdão do TRF3","*Recurso especial ou extraordinário", ...EXEC_TRILHA]},
  acid:{fase:"judicial", nome:"Acidentário · TJSP", e:["Ajuizamento|Ação distribuída","Instrução|Nomeação do perito e quesitos",
    "Perícia designada","Perícia realizada","Laudo juntado","*Manifestação sobre o laudo","*Esclarecimentos do perito","*Citação expedida",
    "Citação e contestação","Réplica","*Conclusos para sentença","Sentença|Sentença","Recurso|Apelação ou remessa necessária","Acórdão do TJSP","*Recurso especial ou extraordinário", ...EXEC_TRILHA]},
  delegada:{fase:"judicial", nome:"Competência delegada · TJSP", e:["Ajuizamento|Ação distribuída","*Instrução|Citação expedida","Citação e contestação","Réplica",
    "Especificação de provas","*Perícia técnica ou audiência","*Alegações finais","*Conclusos para sentença","Sentença|Sentença","*Embargos de declaração",
    "Recurso|Apelação","Contrarrazões","Acórdão do TRF3","*Recurso especial ou extraordinário", ...EXEC_TRILHA]},
  ms:{fase:"judicial", nome:"Mandado de segurança", e:["Ajuizamento|Impetração","Liminar|Decisão da liminar",
    "Instrução|Informações da autoridade","Parecer do MPF","Sentença|Sentença","Fim|Ordem cumprida pelo INSS",
    "*Remessa necessária ao TRF3","Trânsito em julgado"]},
};
// a palavra antiga (casos.etapa) de cada etapa, para o portal e os filtros
const PUB_TRILHA = {"Primeiro contato":"em atendimento","Atendimento presencial":"em atendimento","Triagem":"em atendimento",
  "Análise de direito":"análise de direito","Aguardando documentos":"reunindo documentos","Documentos completos":"reunindo documentos",
  "Contrato e procurações assinados":"aguardando o cliente","A redigir":"a redigir","Redigida":"redigida","Revisão":"redigida",
  "A protocolar":"a protocolar","Monitorando":"monitorando","Documentação em dia":"documentação em dia",
  "Pronto para protocolar":"pronto para protocolar","Requerimento protocolado":"requerimento protocolado",
  "Em análise":"aguardando análise","Em exigência":"em exigência","Exigência cumprida":"aguardando análise",
  "Perícia agendada":"aguardando perícia","Perícia médica agendada":"aguardando perícia","Avaliação social agendada":"aguardando perícia",
  "Perícia realizada":"perícia realizada","Perícia médica realizada":"perícia realizada","Avaliação social realizada":"perícia realizada",
  "Decisão":"decidido","Carta de concessão":"decidido","Recurso ordinário protocolado":"recurso protocolado",
  "Recurso especial protocolado":"recurso protocolado","Encaminhado à Junta":"aguardando distribuição",
  "Encaminhado à Câmara":"aguardando distribuição","Diligência ou parecer médico":"em diligência","Pautado":"em pauta",
  "Acórdão da Junta":"julgado","Acórdão da Câmara":"julgado","Ação distribuída":"ação distribuída",
  "Impetração":"ação distribuída","Citação e contestação":"contestação apresentada","Perícia médica designada":"perícia designada",
  "Perícia designada":"perícia designada","Laudo juntado":"perícia realizada","Sentença":"sentença publicada",
  "Recurso inominado":"em recurso","Apelação":"em recurso","Apelação ou remessa necessária":"em recurso",
  "Acórdão da Turma Recursal":"em recurso","Acórdão do TRF3":"em recurso","Acórdão do TJSP":"em recurso",
  "Implantação do benefício":"aguardando implantação","Cálculos (contadoria ou INSS)":"aguardando RPV",
  "RPV ou precatório expedido":"RPV expedida","RPV paga":"recebido",
  // F236 · os passos sem palavra mantinham a etapa velha quando marcados como atuais
  "Citação expedida":"aguardando citação","Réplica":"contestação apresentada","Especificação de provas":"contestação apresentada",
  "Nomeação do perito e quesitos":"perícia designada","Perícia técnica ou audiência":"perícia designada",
  "Esclarecimentos do perito":"perícia realizada","Manifestação sobre o laudo":"perícia realizada","Avaliação social":"perícia realizada",
  "Alegações finais":"aguardando sentença","Conclusos para sentença":"aguardando sentença","Parecer do MPF":"aguardando sentença",
  "Pedido de uniformização":"em recurso","Recurso especial ou extraordinário":"em recurso","Remessa necessária ao TRF3":"em recurso",
  "Trânsito em julgado":"aguardando implantação","Manifestação sobre os cálculos":"aguardando RPV","Impugnação do INSS":"aguardando RPV",
  "Cálculos homologados":"aguardando RPV","Levantamento":"recebido","Honorários recebidos":"recebido",
  "Análise documental (Atestmed)":"aguardando análise","Reanálise documental":"aguardando análise","Justificação administrativa":"aguardando análise",
  "Contrarrazões do INSS":"recurso protocolado","Cumprimento pelo INSS":"julgado","Contribuição orientada":"monitorando"};
const lerEtapaTrilha = x => { const ex = x.startsWith("#"); x = ex ? x.slice(1) : x;
  const op = x.startsWith("*"); x = op ? x.slice(1) : x;
  const [g, n] = x.includes("|") ? x.split("|") : ["", x];
  return {g, n, op, ex}; };
const FASE_TRILHA = {escritorio:"escritorio", peticao_inicial:"escritorio", aposentadoria_futura:"escritorio",
  inss:"inss", conselho:"conselho", judicial:"judicial", pagamento:"judicial"};
function faseDaTrilha(k){
  if(!ehPrev(k)) return null;      // F615 · o caso não previdenciário não tem trilha de etapas
  // F189 · lista sem processo previdenciário (tarefas pessoais) não tem trilha,
  // nem Pagamentos sem processo: a trilha inventada ali só confundia
  const temPrev = k.processo || (k.protocolos||[]).length || k.especie || k.beneficio;
  if(k.fase==="outro" && !temPrev) return null;
  if(k.fase==="pagamento" && !k.processo) return null;
  if(k.fase==="outro"){ const de=(k.ronda||{}).prazo_de||k.origem_lista||"";
    return /INSS/.test(de)?"inss":/Conselho/.test(de)?"conselho":/Judicial|Peti/.test(de)?"judicial":"escritorio"; }
  return FASE_TRILHA[k.fase] || null;
}
// o rito que o caso pede, pela fase, pela espécie e pelo número do processo
function ritoPadrao(k, fase){
  const esp = k.especie || "", inc = /^B(31|32|91|92|87|88)$/.test(esp);
  if(fase==="escritorio") return k.fase==="peticao_inicial" ? "peticao" : k.fase==="aposentadoria_futura" ? "futura" : "escritorio";
  if(fase==="inss") return /^B(31|32|91|92)$/.test(esp) ? "inss_inc" : esp==="B94" ? "inss_b94"
    : /^B(87|88)$/.test(esp) ? "inss_bpc" : "inss_apos";
  if(fase==="conselho") return k.re_protocolado_em ? "crps_camara" : "crps_junta";
  const proc = String(k.processo||""), procs = (()=>{ try{ return processosDoCaso(k)||[]; }catch(e){ return []; } })();
  if(procs.length && procs.every(p=>p.papel==="ms")) return "ms";
  if(/\.8\.26\./.test(proc) || (esp==="B94" && !/\.4\.03\./.test(proc) && /\.8\./.test(proc))) return "acid";
  if(/\.4\.03\.61/.test(proc)) return "vara";
  return (inc || esp==="B94") ? "jef_inc" : "jef_apos";
}
const trilhaDe = k => (k.trilha && typeof k.trilha==="object") ? k.trilha : {};
// F189 · o rito que a rotina crm/conducao.py tirou dos dados, com motivo e confiança
const ritoDados = (k, fase) => { const x = ((k.conducao||{}).ritos||{})[fase];
  return x && TRILHAS[x.r] && TRILHAS[x.r].fase===fase ? x : null; };
const ritoManual = (k, fase) => { const r = (trilhaDe(k).ritos||{})[fase];
  return TRILHAS[r] && TRILHAS[r].fase===fase ? r : null; };
function ritoDe(k, fase){
  return ritoManual(k, fase) || (ritoDados(k, fase)||{}).r || ritoPadrao(k, fase);
}
const marcaTrilha = (k, rito, nome) => (trilhaDe(k).m||{})[rito+":"+nome] || null;
let trVer = {}, trSel = {}, trAbre = {}, trAjuda = false, trFut = {}, trTempo = {};   // fase em vista, etapa aberta, grupos abertos, legenda
function jornadaFases(k){
  const atual = faseDaTrilha(k), ordem = ["escritorio","inss","conselho","judicial"], ia = ordem.indexOf(atual);
  const marcou = (trilhaDe(k).fases)||{};
  // F220 · o recurso protocolado e a ação ajuizada também dizem que a fase houve, sem o número
  const houve = {escritorio:true, inss:!!((k.protocolos||[]).length || k.nb || k.der),
    conselho:!!((k.crps_nups||[]).length || k.ro_protocolado_em || k.re_protocolado_em),
    // F236 · o processo de outro advogado (🔭 só acompanho) não diz que a fase judicial houve
    judicial:!!(processosDoCaso(k).some(p=>p.nosso) || k.ajuizado_em)};
  // F236 · a fase depois da atual que já houve (o INSS de quem está na petição inicial, o MS paralelo) não está "a vir"
  // F236 · na petição inicial, o Conselho que não houve não está "a vir": a via escolhida foi a ação
  const pulou = f => f==="conselho" && k.fase==="peticao_inicial";
  return ordem.map((f,i)=>({f, st: i===ia ? "a" : i<ia ? (marcou[f] || (houve[f] ? "f" : "n")) : (marcou[f] || (houve[f] ? "f" : pulou(f) ? "n" : "v"))}));
}
// o que a fase concluída diz: a última etapa cumprida e a data
function resumoFase(k, f){
  // F236 · o resultado do INSS é o do INSS: casos.resultado é a última decisão, que pode ser do juízo ou da Junta
  if(f==="inss"){ const d = decisaoDoInss(k); if(d) return `${dCurta(d.data)} · ${d.resultado==="deferido" ? "concedido" : d.resultado || "decidido"}`; }
  if(f==="judicial" && faseDaTrilha(k)!=="judicial" && (trilhaParalela(k) || processosDoCaso(k).some(x=>x.nosso && x.papel==="ms"))) return "MS em curso";
  // F236 · o Escritório do caso que nasceu de um pré-caso diz o último passo do atendimento, com a data e quem o fechou
  if(f==="escritorio" && k.precaso && k.precaso.etapas){ const NOMES = {identificacao:"identificação", pa:"primeiro atendimento", analise:"análise", documentos:"documentos"};
    const u = Object.entries(k.precaso.etapas).filter(([n, e])=>NOMES[n] && e && e.em).sort((a, b)=>String(a[1].em).localeCompare(String(b[1].em))).pop();
    if(u){ const q = ((D.colPorId.get(u[1].quem)||{}).nome||"").split(" ")[0]; return `${dCurta(String(u[1].em).slice(0,10))} · ${NOMES[u[0]]}${q ? ` (${q})` : ""}`; } }
  const rito = ritoDe(k, f), ets = TRILHAS[rito].e.map(lerEtapaTrilha), MK = marcasDaTrilha(k, f, null, rito, ets);
  let ult = null;
  ets.forEach((e,i)=>{ const m = MK[i]; if(m && (m.s==="f"||m.s==="a") && (!ult || (m.d||"")>=(ult.m.d||""))) ult = {e, m}; });
  // a data vem na frente: é ela que some primeiro quando a aba aperta
  return ult ? `${ult.m.d?`${dCurta(ult.m.d)} · `:""}${ult.e.n.toLowerCase()}` : "concluída";
}
// F327 · o title da etapa diz quando e por qual fonte ela foi cumprida (pedido do Paulo, 31.10.2026)
function tituloEtapa(e, m){
  if(m.s==="f") return `${e.n} · cumprida${m.d?` em ${fmtBarra(m.d)}`:""}${m.por ? ` ${m.por}` : m.v ? " pelos fatos oficiais" : " (marcada pela equipe)"}`;
  if(m.s==="a") return `${e.n} · etapa atual${m.d?` desde ${fmtBarra(m.d)}`:""}${m.por?` ${m.por}`:""}`;
  if(m.s==="n") return `${e.n} · não houve`;
  return e.op ? `${e.n} · só se houver` : `${e.n} · a vir`;
}
// F327 · há quanto tempo o caso está na etapa e se passou do prazo: o prazo de análise do INSS (RE 1.171.152) quando
// corre; fora dele, o tempo habitual da fase, que é estimativa do escritório (shortcut: valores fixos, ajustar com o uso)
const ETAPA_HABITUAL = {inss:90, conselho:180, judicial:180, pagamento:60};
function tempoNaEtapa(k, desde, fase){
  if(!desde) return null;
  const dias = diasEntreIso(desde, hoje()); if(!(dias>=0)) return null;
  const mora = fase==="inss" ? prazoMora(k) : null;
  if(mora && mora.vencido) return {dias, longo:true, por:`prazo de análise do INSS vencido em ${fmtBarra(mora.data)}`};
  const lim = ETAPA_HABITUAL[fase];
  return {dias, longo: !mora && !!lim && dias>lim, por: mora ? `prazo de análise até ${fmtBarra(mora.data)}` : lim ? `tempo habitual da fase: até ${lim} dias (estimativa)` : ""};
}
// os grupos da trilha (Ajuizamento, Instrução...); trilha sem grupo = um só
function gruposTrilha(ets){
  const gs = [];
  ets.forEach((e,i)=>{ if(e.g || !gs.length) gs.push({g:e.g, ex:e.ex, ix:[]}); gs[gs.length-1].ix.push(i); });
  return gs;
}
// F383 (12.41) · o histórico vertical das etapas (proposta aprovada pelo Paulo em 02.11.2026): cada etapa cumprida diz a fonte
function fonteEtapa(m){
  if(m.s!=="f" && m.s!=="a") return "";
  const t = m.por || (m.v ? "pelos fatos oficiais" : m.s==="f" ? "marcada pela equipe" : "");
  return t ? `<span class="tr-fonte">${esc(t)}</span>` : "";
}
// F383 (12.41) · o mandado de segurança em curso ao lado do recurso ganha uma linha própria abaixo do resumo
function linhaParalela(k, faseAt){
  const p = trilhaParalela(k); if(!p) return "";
  let ult = null;
  try{ const r = ritoDe(k, "judicial"), ets = TRILHAS[r].e.map(lerEtapaTrilha), ms = marcasDaTrilha(k, "judicial", faseAt, r, ets);
    ms.forEach((m,i)=>{ if(m.s==="f" && (!ult || (m.d||"")>=(ult.d||""))) ult = {n:ets[i].n, d:m.d}; }); }catch(e){}
  const desde = (ult && ult.d) || p.desde, dias = desde ? diasEntreIso(desde, hoje()) : null, C = COR_FASE.judicial;
  return `<button type="button" class="tr-par" style="--tc:${C.c};--tt:${C.t}" onclick="trVerFase('${k.id}','judicial')" title="ver as etapas do processo judicial">
    <small>Em paralelo · Judicial</small> <span>${esc(p.classe || "Mandado de segurança")}${ult ? `: <b>${esc(ult.n.toLowerCase())}</b>` : ""}${desde ? ` desde ${dCurta(desde)}${dias>=0 ? ` (há ${dias} ${dias===1?"dia":"dias"})` : ""}` : ""}</span></button>`;
}
// F386 · as etapas numa linha do tempo, por meses (variação C do protótipo do Lovable, escolha do Paulo de 03.11.2026): uma
// faixa por fase que houve, uma barra por etapa datada, da data dela à da etapa seguinte (a atual vai até hoje) e a linha de hoje
function ganttEtapas(k, faseAt){
  const h = hoje(), lanes = [];
  for(const {f, st} of jornadaFases(k)){
    if(st==="v") continue;
    let ets = [], ms = [];
    try{ const r = ritoDe(k, f); ets = TRILHAS[r].e.map(lerEtapaTrilha); ms = marcasDaTrilha(k, f, faseAt, r, ets); }catch(e){}
    const ds = ets.map((e,i)=>({n:e.n, m:ms[i]||{}})).filter(x=>x.m.d && (x.m.s==="f" || x.m.s==="a")).sort((a,b)=>a.m.d<b.m.d ? -1 : 1);
    lanes.push({f, st, ds});
  }
  const todas = lanes.flatMap(l=>l.ds.map(x=>x.m.d));
  if(!todas.length) return `<p class="meio-sub tr-gt-vazio">Nenhuma etapa com data para pôr na linha do tempo.</p>`;
  const ini = todas.reduce((a,b)=>a<b ? a : b).slice(0,7)+"-01", fim = somarMeses(h.slice(0,7)+"-01", 1), tot = Math.max(1, diasEntreIso(ini, fim));
  const pos = d => Math.max(0, Math.min(100, 100*diasEntreIso(ini, d)/tot));
  // o fim da última etapa de uma fase encerrada é o começo da fase seguinte que tem data
  const proxIni = f => { const l = lanes.slice(lanes.findIndex(x=>x.f===f)+1).find(x=>x.ds.length); return l ? l.ds[0].m.d : h; };
  const meses = []; for(let m = ini; m < fim; m = somarMeses(m, 1)) meses.push(m);
  const passo = Math.max(1, Math.ceil(meses.length/8));
  const MES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  const regua = meses.map((m, n)=>n % passo ? "" : `<span style="left:${pos(m)}%">${MES[+m.slice(5,7)-1]}/${m.slice(2,4)}</span>`).join("");
  const faixa = l => { const C = COR_FASE[l.f];
    const barras = l.ds.map((x, j)=>{ const cur = x.m.s==="a" && l.f===faseAt, de = x.m.d, ate = l.ds[j+1] ? l.ds[j+1].m.d : cur ? h : proxIni(l.f);
      const n = Math.max(0, diasEntreIso(de, ate)), w = Math.max(pos(ate) - pos(de), 0.8);
      const t = `${x.n}: desde ${fmtBarra(de)}, ${cur ? "há " : ""}${n} ${n===1 ? "dia" : "dias"}${x.m.por ? `, ${x.m.por}` : ""}`;
      return `<i class="tr-gt-b${cur ? " tr-gt-at" : ""}" style="left:${pos(de)}%;width:${w}%" title="${esc(t)}"><span>${w > 9 ? esc(x.n) : ""}</span><b class="sr-only">${esc(t)}</b></i>`; }).join("");
    return `<div class="tr-gt-l tr-gt-${l.st}" style="--tc:${C.c};--tt:${C.t}"><span class="tr-gt-n">${esc(C.n)}${l.st==="n" ? "<small>não houve</small>" : ""}</span><div class="tr-gt-t">${barras}</div></div>`; };
  return `<div class="tr-gt" role="group" aria-label="Etapas do caso por meses"><div class="tr-gt-r"><span class="tr-gt-n"></span><div class="tr-gt-m">${regua}</div></div>
    <div class="tr-gt-c">${lanes.map(faixa).join("")}<div class="tr-gt-hoje" style="left:calc(110px + (100% - 110px) * ${pos(h)/100})"><span>hoje</span></div></div></div>`;
}
function faixaTrilha(k){
  const faseAt = faseDaTrilha(k); if(!faseAt) return "";
  const ver = trVer[k.id] || faseAt, C = COR_FASE[ver], rito = ritoDe(k, ver), T = TRILHAS[rito];
  // fase que já passou: a etapa que ficou "atual" nela foi a última cumprida
  // F236 · as marcas: as gravadas, as cumpridas pelos fatos oficiais (sem gravar) e a atual pela etapa do caso
  const ets = T.e.map(lerEtapaTrilha), MK = marcasDaTrilha(k, ver, faseAt, rito, ets), mk = e => MK[ets.indexOf(e)] || {};
  const selK = k.id+":"+rito, sel = trSel[selK];
  // F236 · uma etapa só na tela: a aba da fase, o "Agora:" e a placa leem a etapa do caso
  const agora = etapaAgora(k);
  const fases = jornadaFases(k), stVer = (fases.find(x=>x.f===ver)||{}).st;
  // F243 · a aba da fase atual diz a etapa (o "Agora:" de antes), se ela está desatualizada e o passo por vir
  const MK0 = f => f===ver ? MK : null;
  const abas = fases.map(({f,st})=>{
    const c = COR_FASE[f], txt = st==="a" ? (agora || "em curso") : st==="f" ? resumoFase(k, f) : st==="n" ? "não houve" : "a vir";
    const mkA = st==="a" ? MK0(f) : null, aguarda = mkA ? (i=>i>=0 && !mkA[i].d ? ` · aguardando ${esc(ets[i].n)}` : "")(mkA.findIndex(m=>m.s==="a")) : "";
    const stHtml = st==="a" && !celular() ? `<span class="jn-atual">atual</span>` : st==="a" ? `<span class="tr-agora"><b>${esc(agora||"a definir")}</b>${etapaDesmentida(k) ? ` <small class="et-velha" title="um fato oficial mais novo diz outra coisa: veja a sugestão na placa">(desatualizada)</small>` : ""}${aguarda}</span>` : esc(txt);
    const par = st!=="a" && f==="judicial" && !!trilhaParalela(k);   // F323 · o MS ao lado do recurso não é passado
    const and = !celular() && abaDoCaso.id===k.id && ABA_DA_FASE[f]===abaDoCaso.aba;   // F404 · o cartão dos andamentos abertos
    return `<button role="tab" aria-selected="${ver===f}" class="jn-b jn-${st}${par?" jn-par":""}${ver===f?" jn-ver":""}${and?" jn-and":""}" style="--fc:${c.c};--ff:${c.f};--ft:${c.t}"
      onclick="trVerFase('${k.id}','${f}')" title="${esc(`${c.n}: ${String(txt)}`)}"><span class="jn-nome"><i></i><span class="jn-txt">${c.n}</span></span><span class="jn-st">${stHtml}</span></button>`; }).join("");
  const alt = Object.entries(TRILHAS).filter(([,t])=>t.fase===ver);
  // o tipo de processo é uma escolha rara: um seletor, e não cinco pílulas
  const dd = ritoManual(k, ver) ? null : ritoDados(k, ver);
  const porQue = ritoManual(k, ver) ? "escolhido pela equipe" : dd ? `pelos dados: ${dd.por}` : "pela espécie";
  const confirma = dd && dd.c==="baixa" ? `<span class="tr-prov" title="sem sinal firme nos dados: ${esc(dd.por)}">provável
    <button class="tr-bt" onclick="trRito('${k.id}','${ver}','${rito}')">confirmar</button></span>` : "";
  const chips = alt.length>1 ? `${confirma}<label class="tr-ritos" title="${esc(porQue)}">tipo <select onchange="trRito('${k.id}','${ver}',this.value)" aria-label="Tipo de processo">${alt.map(([id,t])=>
    `<option value="${id}" ${id===rito?"selected":""}>${esc(t.nome)}</option>`).join("")}</select></label>` : "";
  // fase passada: dá para dizer que não houve (ou que houve)
  const houveBt = (stVer==="f"||stVer==="n") ? `<button class="tr-houve" onclick="trFaseHouve('${k.id}','${ver}','${stVer==="n"?"f":"n"}')">${stVer==="n"?"esta fase houve":"esta fase não houve"}</button>` : "";
  // F323 · a próxima etapa (a primeira depois da atual que não foi cumprida nem pulada) ganha o contorno e a palavra "próxima"
  const iAt = ets.findIndex(e=>mk(e).s==="a");
  const pxI = iAt<0 ? -1 : ets.findIndex((e,j)=>j>iAt && !["f","n"].includes(mk(e).s) && !(e.op && !mk(e).s));
  // F383 (12.41) · no histórico vertical, as etapas depois da próxima ficam escondidas até "Mostrar as etapas seguintes"
  const corte = pxI>=0 ? pxI : iAt, futura = (i, m) => iAt>=0 && i>corte && !["f","n","a"].includes(m.s) && i!==sel;
  // F386 · quantos dias durou cada etapa (protótipo do Lovable): da data dela à da próxima etapa datada; a atual, até hoje
  const datadas = ets.map((e,i)=>({i, m:MK[i]||{}})).filter(x=>x.m.d && (x.m.s==="f" || x.m.s==="a"));
  const durDe = i => { const j = datadas.findIndex(x=>x.i===i); if(j<0) return "";
    const fim = datadas[j+1] ? datadas[j+1].m.d : datadas[j].m.s==="a" ? hoje() : null; if(!fim || fim<datadas[j].m.d) return "";
    const n = diasEntreIso(datadas[j].m.d, fim), cur = datadas[j].m.s==="a";
    return `<span class="tr-dur">${cur ? "há " : ""}${n} ${n===1 ? "dia" : "dias"}</span>`; };
  // os grupos cumpridos (e a execução ainda não começada) ficam recolhidos
  const itens = [];
  for(const G of gruposTrilha(ets)){
    const ms = G.ix.map(i=>({i, e:ets[i], m:mk(ets[i])}));
    const feito = ms.length>1 && ms.some(x=>x.m.s==="f") && ms.every(x=>x.m.s==="f" || x.m.s==="n" || (x.e.op && !x.m.s));
    const execVazia = G.ex && ms.every(x=>!x.m.s);
    const chave = k.id+":"+rito+":"+G.g;
    if(G.g && (feito || execVazia) && !trAbre[chave] && !ms.some(x=>x.i===sel)){
      const n = ms.filter(x=>x.m.s==="f").length, tot = ms.filter(x=>!x.e.op || x.m.s==="f").length;
      itens.push(`<li style="--tc:${(G.ex?COR_EXEC:C).c};--tt:${(G.ex?COR_EXEC:C).t}"${futura(G.ix[0], {}) ? ` class="tr-fut"` : ""}><span class="tr-g${G.ex?" tr-g-ex":""}">${esc(G.g)}</span>
        <button class="tr-et tr-grp ${feito?"tr-sf":"tr-sv"}" aria-expanded="false" onclick="trGrupo('${chave}')"
          title="mostrar as etapas de ${esc(G.g)}"><span class="tr-b"></span><span class="tr-nm">${feito?`${n} de ${tot} cumpridas`:`${ms.length} etapas · a vir`}</span><span class="tr-d">mostrar ›</span></button></li>`);
      continue;
    }
    ms.forEach(({i,e,m},n)=>{
      const cor = e.ex ? COR_EXEC : C;
      const rot = n===0 && G.g ? `<span class="tr-g${e.ex?" tr-g-ex":""}">${esc(G.g)}${(feito||execVazia)&&trAbre[chave]?` <a href="#" onclick="trGrupo('${chave}');return false" class="tr-rec">recolher</a>`:""}</span>` : `<span class="tr-g"></span>`;
      itens.push(`<li style="--tc:${cor.c};--tt:${cor.t}"${e.ex?" data-ex":""}${futura(i, m) ? ` class="tr-fut"` : ""}>${rot}
        <button class="tr-et tr-s${m.s||(e.op?"o":"v")}${i===sel?" tr-sel":""}${i===pxI?" tr-px":""}" data-tri="${i}" onclick="trEscolher('${k.id}','${rito}',${i})" aria-pressed="${i===sel}"
          title="${esc(tituloEtapa(e, m))}"><span class="tr-b"></span><span class="tr-nm">${esc(e.n)}</span>${m.x?`<span class="tr-x">${esc(m.x)}</span>`:""}${fonteEtapa(m)}<span class="tr-d">${esc(m.d?fmtBarra(m.d):m.s==="a"?"aguardando":i===pxI?"próxima":"")}</span>${durDe(i)}</button></li>`);
    });
  }
  let pnl = "";
  if(sel!=null && ets[sel]){
    const es = ets[sel], ms = mk(es), q = `'${k.id}','${rito}',${sel}`;
    const est = ms.s==="f" ? `cumprida${ms.d?` em ${fmtBarra(ms.d)}`:""}${ms.v?" (pelos fatos oficiais)":""}` : ms.s==="a" ? "etapa atual"
      : ms.s==="n" ? `não houve${ms.v?" (pedido indeferido)":""}` : es.op ? "só se houver" : "a vir";
    const docSel = es.n==="Aguardando documentos" ? `<label class="tr-doc"><select aria-label="Qual documento falta" onchange="trDetalhe(${q},this.value)">
      <option value="">qual documento?</option>${DOCS_AGUARDO.map(d=>`<option ${ms.x===d?"selected":""}>${esc(d)}</option>`).join("")}</select></label>` : "";
    pnl = `<div class="tr-pnl" role="group" aria-label="Marcar a etapa ${esc(es.n)}"><span class="tr-pnl-info"><b>${esc(es.n)}</b> · ${est}</span>${docSel}<span class="tr-acoes">
      ${ms.s!=="f"?`<button class="tr-bt" onclick="trMarcar(${q},'f')">Cumprida hoje</button>`:""}
      ${ms.s!=="a" && ver===faseAt?`<button class="tr-bt forte" onclick="trMarcar(${q},'a')">É a etapa atual</button>`:""}
      ${ms.s!=="n"?`<button class="tr-bt tr-bt-n" onclick="trMarcar(${q},'n')">Não houve</button>`:""}
      ${ms.s && !ms.v?`<button class="tr-bt" onclick="trMarcar(${q},'')">Desmarcar</button>`:""}
      <button class="tr-x-bt" aria-label="fechar" title="fechar" onclick="trEscolher('${k.id}','${rito}',null)">✕</button></span></div>`;
  }
  const leg = trAjuda ? `<div class="tr-leg" id="tr-leg"><span><i class="tr-lf"></i>cumprida</span><span><i class="tr-la"></i>atual</span><span><i class="tr-lv"></i>a vir</span>
      <span><i class="tr-lo"></i>só se houver</span><span><i class="tr-ln"></i><s>não houve</s></span>${ver==="judicial"?`<span><i class="tr-lx"></i>execução</span>`:""}
      <span>A data vem da anotação que cumpriu a etapa. Grupos cumpridos ficam recolhidos; clique para abrir.</span></div>` : "";
  // F243 · a faixa compacta (pedido do Paulo, 18.10.2026): as fases numa linha e as etapas logo abaixo; o nome da trilha, o
  // tipo de processo, a legenda e "esta fase não houve" ficam no "?", que ganha um ponto quando o tipo pede confirmação
  // F320 · as etapas recolhidas (plano de interface limpa, 31.10.2026): no computador a faixa nasce com as fases e uma linha
  // só, com a etapa, desde quando, a barra de progresso e o próximo passo; "ver as etapas" abre a trilha inteira
  // a inicial minúscula só na palavra comum ("Acórdão do TRF3" fica "acórdão do TRF3"; "INSS" fica)
  const minusc1 = t => /^[A-ZÀ-Ú][a-zà-ú]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t;
  const cel = celular(), aberta = cel || etapasAbertas() || sel!=null || trAjuda;
  const resumo = cel ? "" : (()=>{
    const vis = ets.map((e,i)=>({e, i, m:MK[i]||{}})).filter(x=>!x.e.op || x.m.s);
    const ia = vis.findIndex(x=>x.m.s==="a"), at = ia>=0 ? vis[ia] : null;
    const prox = ia>=0 ? vis.slice(ia+1).find(x=>x.m.s!=="f" && x.m.s!=="n") : null;
    const seg = vis.map((x,j)=>`<i class="${x.m.s==="f"?"f":x.m.s==="a"?"a":x.m.s==="n"?"n":""}"></i>`).join("");
    const t = at && ver===faseAt ? tempoNaEtapa(k, at.m.d, faseDaEtapa(k)==="pagamento" ? "pagamento" : ver) : null;
    return `<div class="tr-resumo${t && t.longo ? " tr-resumo-longo" : ""}"${ver===faseAt?"":" hidden"}><span class="tr-agora"><small>Etapa</small> <b>${esc(agora||"a definir")}</b>${at && !at.m.d ? `<span class="tr-aguarda"> aguardando ${esc(minusc1(at.e.n))}</span>` : ""}${etapaDesmentida(k) ? ` <small class="et-velha" title="um fato oficial mais novo diz outra coisa: veja a sugestão na placa">(desatualizada)</small>` : ""}</span>
      ${at ? (()=>{
        const ha = t ? ` <span class="tr-ha${t.longo?" tr-longo":""}" title="${esc(t.por)}">(há ${t.dias} ${t.dias===1?"dia":"dias"})</span>` : "";
        return `<span class="tr-pos">${at.m.d ? `desde ${dCurta(at.m.d)}${ha} · ` : ""}${ia+1} de ${vis.length}</span>`; })() : ""}
      <span class="tr-prog" aria-hidden="true">${seg}</span>
      ${prox ? `<span class="tr-prox">Próximo: ${esc(minusc1(prox.e.n))}</span>` : ""}</div>${ver===faseAt ? linhaParalela(k, faseAt) : ""}`; })();
  return `<section class="tr-faixa tr tr-compacta${aberta?" tr-aberta":" tr-fechada"}${trFut[k.id]?" tr-fut-ver":""}" style="--tc:${C.c};--tt:${C.t};--tf:${C.f}" aria-label="Jornada e trilha do caso">
    <div class="jn-l" role="tablist" aria-label="Fases do caso">${abas}${cel ? "" : `<button type="button" class="jn-tudo${abaDoCaso.id===k.id && abaDoCaso.aba==="tudo" ? " on" : ""}" aria-pressed="${abaDoCaso.id===k.id && abaDoCaso.aba==="tudo"}" title="Caso Completo: todas as fontes juntas, em ordem cronológica" onclick="irSubAba('tudo')">Tudo<span class="sr-only"> (Caso Completo)</span></button>`}<button class="tr-ajuda${confirma ? " tr-ajuda-pend" : ""}" aria-expanded="${trAjuda}" aria-controls="tr-leg"
      title="${esc(`${T.nome}: o tipo de processo e o que cada marca quer dizer`)}" onclick="trAjuda=!trAjuda;trRepintar()">?</button>
</div>
    ${resumo}
    <div class="tr-corpo"${aberta?"":" hidden"}>
      ${trAjuda ? `<div class="tr-cab"><h3>${esc(T.nome)}</h3>${ver===faseAt ? "" : `<span class="meio-sub">${stVer==="v"?"fase ainda não alcançada":"fase anterior"}</span>`}
        ${houveBt}${chips}</div>` : ""}
      ${leg}
      ${trTempo[k.id] ? ganttEtapas(k, faseAt) : ""}<div class="tr-rol-box"${trTempo[k.id] ? " hidden" : ""}><button class="tr-seta tr-seta-esq" aria-label="etapas anteriores" tabindex="-1" onclick="trRolar(-1)">‹</button>
        <div class="tr-rol" onscroll="trSombra(this)"><ol class="tr-l" style="--n:${itens.length}">${itens.join("")}</ol></div>
        <button class="tr-seta tr-seta-dir" aria-label="próximas etapas" tabindex="-1" onclick="trRolar(1)">›</button></div>
      <button type="button" class="tr-tempo-bt" aria-pressed="${!!trTempo[k.id]}" onclick="trTempo['${k.id}']=!trTempo['${k.id}'];trRepintar()" title="${trTempo[k.id] ? "voltar à lista das etapas" : "ver as etapas de todas as fases numa linha do tempo, por meses"}">${trTempo[k.id] ? "Lista" : "Meses"}</button>
      ${trTempo[k.id] ? "" : (n => n ? `<button type="button" class="tr-fut-bt" aria-expanded="${!!trFut[k.id]}" onclick="trFut['${k.id}']=!trFut['${k.id}'];trRepintar()">${trFut[k.id] ? "Esconder as etapas seguintes" : `Mostrar as etapas seguintes (${n})`}</button>` : "")(itens.filter(x=>x.includes(' class="tr-fut"')).length)}
      ${pnl}
    </div></section>`;
}
// F286 · a alça de recolher (pedido do Paulo, 26.10.2026): no meio da borda de baixo, recolhe o quadro inteiro (as fases,
// as etapas e a linha da incapacidade) e o devolve; a escolha fica guardada neste computador
// F299 · no celular a trilha nasce recolhida e só abre no toque (pedido do Paulo, 30.10.2026); a escolha tem chave própria
const trOculta = () => celular() ? ler("crm_trilha_oculta_cel")!=="0" : ler("crm_trilha_oculta")==="1";
function trAlternar(fechar){
  if(celular()) guardar("crm_trilha_oculta_cel", fechar ? "" : "0"); else guardar("crm_trilha_oculta", fechar ? "1" : "");
  trRepintar();
}
const setaAlca = baixo => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${baixo ? "M6 9l6 6 6-6" : "M6 15l6-6 6 6"}"/></svg>`;
function alcaTrilha(fechada){
  const seta = setaAlca(fechada);
  return `<button type="button" class="tr-alca" aria-expanded="${!fechada}" title="${fechada ? "mostrar as fases e as etapas do caso" : "recolher as fases e as etapas"}"
    aria-label="${fechada ? "mostrar as fases e as etapas do caso" : "recolher as fases e as etapas"}" onclick="trAlternar(${fechada ? 0 : 1})">${seta}${fechada ? "<span>Fases e etapas</span>" : ""}</button>`;
}
const etapasAbertas = () => ler("crm_etapas")==="1";
function etapasAlternar(abrir){ guardar("crm_etapas", abrir ? "1" : ""); if(!abrir){ trAjuda = false; trSel = {}; } trRepintar(); }
// F666 · o caso guarda só as fases (Escritório, INSS, CRPS, Judicial, Tudo) como navegação; as etapas saíram da tela
function faixaSoFases(k){
  const t = faixaTrilha(k), i = t ? t.indexOf('class="jn-l"') : -1; if(i<0) return "";
  return t.slice(0, t.indexOf("</div>", i) + 6).replace('class="tr-faixa ', 'class="tr-so-fases tr-faixa ').replace(/<button class="tr-ajuda[\s\S]*?<\/button>/, "") + "</section>";
}
function faixaTrilhaComAlca(k){
  const t = faixaTrilha(k);
  if(!t) return faixaIncapacidade(k);
  if(!celular()){ const ab = /tr-aberta/.test(t.slice(0, 200));
    return t.replace(/<\/section>\s*$/, `${faixaIncapacidade(k)}<button type="button" class="tr-alca tr-alca-et" aria-expanded="${ab}" onclick="etapasAlternar(${ab?0:1})">${setaAlca(!ab)}<span>${ab ? "recolher etapas" : "ver as etapas"}</span></button></section>`); }
  if(trOculta()) return `<div class="tr-recolhida">${alcaTrilha(true)}</div>`;
  return t.replace(/<\/section>\s*$/, `${faixaIncapacidade(k)}${alcaTrilha(false)}</section>`);
}
// repinta sem perder a rolagem da ficha e põe a etapa atual no meio da trilha
function trRepintar(){
  const rol = document.querySelector(".det-rolagem"), y = rol ? rol.scrollTop : 0;
  const tr = document.querySelector(".tr-rol"), x = tr ? tr.scrollLeft : null;
  repintarFicha();
  const rol2 = document.querySelector(".det-rolagem"); if(rol2) rol2.scrollTop = y;
  trCentrar(x);
}
function trCentrar(x){
  const tr = document.querySelector(".tr-rol"); if(!tr) return;
  if(x!=null) tr.scrollLeft = x;
  else { const a = tr.querySelector(".tr-sel") || tr.querySelector(".tr-sa") || [...tr.querySelectorAll(".tr-sf")].pop();   // F236
    if(a){ const sb = tr.style.scrollBehavior; tr.style.scrollBehavior = "auto";
      tr.scrollLeft = a.offsetLeft - tr.clientWidth/2 + a.offsetWidth/2; tr.style.scrollBehavior = sb; } }
  trSombra(tr);
}
// a borda esmaecida diz que a trilha continua para o lado
function trSombra(tr){
  const box = tr && tr.parentElement; if(!box) return;
  box.classList.toggle("tr-mais-esq", tr.scrollLeft > 4);
  box.classList.toggle("tr-mais-dir", tr.scrollLeft + tr.clientWidth < tr.scrollWidth - 4);
}
function trRolar(dir){ const tr = document.querySelector(".tr-rol"); if(tr) tr.scrollBy({left: dir*tr.clientWidth*0.7}); }
function trVerFase(casoId, f){
  trVer[casoId] = f;
  // F405 · no computador o cartão da fase também abre os andamentos dela: Escritório volta às anotações
  if(!celular() && ABA_DA_FASE[f]){ subAba = abaPedida[casoId] = ABA_DA_FASE[f]; guardar("crm_subaba", subAba); }
  trRepintar(); trCentrar();
}
const ABA_DA_FASE = {escritorio:"escritorio", inss:"inss", conselho:"crps", judicial:"cnj"};
let abaPedida = {}, abaDoCaso = {};
// F405 · a seta recolhe a coluna dos prazos e do cartão do caso; fica guardada neste computador
const esqOculta = () => ler("crm_caso_esq")==="0";
function esqAlternar(){ guardar("crm_caso_esq", esqOculta() ? "" : "0"); trRepintar(); }
const dirOculta = () => ler("crm_caso_dir")==="0";
function dirAlternar(){ guardar("crm_caso_dir", dirOculta() ? "" : "0"); trRepintar(); }
function trEscolher(casoId, rito, i){
  const c = casoId+":"+rito; trSel[c] = (i==null || trSel[c]===i) ? null : i; trRepintar();
  if(trSel[c]!=null) document.querySelector(`.tr-et[data-tri="${i}"]`)?.focus({preventScroll:true});
}
function trGrupo(chave){ trAbre[chave] = !trAbre[chave]; trRepintar(); }
// setas percorrem as etapas; Esc fecha o quadro da etapa
document.addEventListener("keydown", e=>{
  const b = e.target && e.target.closest && e.target.closest(".tr-l .tr-et");
  // Esc fecha só o quadro da etapa: sem o stop, o Esc da ficha a fechava junto
  if(e.key==="Escape" && document.querySelector(".tr-pnl")){ e.preventDefault(); e.stopImmediatePropagation(); document.querySelector(".tr-x-bt")?.click(); return; }
  if(!b || !["ArrowRight","ArrowLeft","ArrowUp","ArrowDown","Home","End"].includes(e.key)) return;
  // F383 (12.41) · na lista vertical a mais nova fica no alto: a seta para cima avança, a para baixo volta
  const todos = [...b.closest(".tr-l").querySelectorAll(".tr-et")].filter(x=>x.offsetParent), i = todos.indexOf(b);
  const j = e.key==="Home" ? 0 : e.key==="End" ? todos.length-1 : Math.max(0, Math.min(todos.length-1, i + (["ArrowRight","ArrowUp"].includes(e.key)?1:-1)));
  e.preventDefault(); todos[j].focus(); todos[j].scrollIntoView({block:"nearest", inline:"nearest"});
}, true);   // captura: roda antes do Esc que fecha a ficha
async function trFaseHouve(casoId, f, st){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const t = {...trilhaDe(k)}; t.fases = {...(t.fases||{}), [f]:st};
  if(await trGravar(k, t)) trRepintar();
}
async function trGravar(k, t, etapa){
  const antes = {trilha:k.trilha, etapa:k.etapa};
  k.trilha = t; if(etapa!==undefined) k.etapa = etapa;
  try{ await patchCaso(k.id, {trilha:t, ...(etapa!==undefined?{etapa}:{})}); }
  catch(e){ Object.assign(k, antes); aviso("Não gravou — rode o crm/fase2/schema_trilha.sql no Supabase"); return false; }
  return true;
}
async function trRito(casoId, fase, rito){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const t = {...trilhaDe(k)}; t.ritos = {...(t.ritos||{}), [fase]:rito};
  if(await trGravar(k, t)){ trRepintar(); trCentrar(); }
}
// marca uma etapa: f cumprida (hoje), a atual (a antiga atual vira cumprida),
// n não houve, '' desmarca. A atual leva casos.etapa junto.
function trilhaComMarca(k, rito, nome, st, d){
  const t = {...trilhaDe(k)}, m = {...(t.m||{})}, chave = rito+":"+nome, hj = d || hoje();
  if(st==="a") for(const c of Object.keys(m)) if(c.startsWith(rito+":") && m[c].s==="a") m[c] = {...m[c], s:"f", d:m[c].d||hj};
  if(st) m[chave] = {...(m[chave]||{}), s:st, ...(st==="f"||st==="a" ? {d:(m[chave]||{}).d||hj} : {})};
  else delete m[chave];
  t.m = m; return t;
}
async function trMarcar(casoId, rito, i, st){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const e = lerEtapaTrilha(TRILHAS[rito].e[i]);
  const antes = {trilha:k.trilha||null, etapa:k.etapa||null};
  const t = trilhaComMarca(k, rito, e.n, st);
  const etapa = st==="a" ? (PUB_TRILHA[e.n] || k.etapa || null) : undefined;
  if(await trGravar(k, t, etapa)){
    trSel[casoId+":"+rito] = null;
    if(st==="a"){ montarSidebar(); render(); }
    trRepintar();
    avisoDesfazer(st==="a"?`Etapa atual: ${e.n}`:st==="f"?`${e.n}: cumprida`:st==="n"?`${e.n}: não houve`:`${e.n}: desmarcada`, async()=>{
      if(await trGravar(k, antes.trilha, antes.etapa)){ montarSidebar(); render(); trRepintar(); } });
  }
}
async function trDetalhe(casoId, rito, i, x){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const e = lerEtapaTrilha(TRILHAS[rito].e[i]), t = {...trilhaDe(k)}, m = {...(t.m||{})}, c = rito+":"+e.n;
  m[c] = {...(m[c]||{s:"a", d:hoje()}), x:x||undefined}; t.m = m;
  if(await trGravar(k, t)) trRepintar();
}
// a etapa que a providência declara (marcarEtapa/gravarEtapa, palavra antiga)
// acende a etapa equivalente da trilha, com a data de hoje: é a data da anotação
function trilhaSegueEtapa(k, etapa){
  const fase = faseDaTrilha(k); if(!fase || !etapa) return null;
  const rito = ritoDe(k, fase), alvo = TRILHAS[rito].e.map(lerEtapaTrilha)
    .find(e=>(PUB_TRILHA[e.n]===etapa || e.n.toLowerCase()===String(etapa).toLowerCase()) && (marcaTrilha(k,rito,e.n)||{}).s!=="f");
  return alvo ? trilhaComMarca(k, rito, alvo.n, "a") : null;
}
// F182 · "Nas outras abas": o que o caso tem nas demais divisões da ficha,
// com o dado que importa e o atalho. Só entra a linha que tem o que mostrar.
// integração, etapa 3 · a faixa do caso: no alto da Análise, das Perícias e
// dos Honorários, diz de que caso a parte está falando e leva até ele
function faixaDoCaso(ks){
  const vivos = (ks||[]).filter(k=>k.fase!=="encerrado");
  if(!vivos.length) return "";
  return `<nav class="faixa-caso" aria-label="${vivos.length>1?"Casos":"Caso"} do cliente"><span class="fc-rot">${vivos.length>1?"Casos":"Caso"}</span>
    ${vivos.map(k=>`<button type="button" class="fc-caso" onclick="irAoCaso('${k.id}')" title="abrir o caso">
      ${k.especie?`<span class="fc-esp">${esc(k.especie)}</span>`:""}<span class="fc-tit">${esc(tituloCaso(k))}</span>
      <span class="fc-fase">${esc(NOME_FASE[k.fase]||k.fase||"")}${k.etapa?` · ${esc(k.etapa)}${etapaEstaVelha(k)?" (desatualizada)":""}`:""}</span></button>`).join("")}</nav>`;
}
function irAoCaso(id){ casoSel=id; abaAtiva=2; repintarFicha(); }
// F236 · a análise do caso: a que se ligou a ele ao gerar (detalhes.caso_id), a do Desfecho, a da etapa ou a do pré-caso
function analiseDoCaso(k){
  const pc = (k && k.precaso) || {}, as = analisesDe(k && k.cliente_id);
  const aid = (pc.desfecho||{}).analise_id || ((pc.etapas||{}).analise||{}).analise_id;
  return as.find(a=>(a.detalhes||{}).caso_id===k.id) || (aid && as.find(a=>a.id===aid)) || (pc.id && as.find(a=>(a.detalhes||{}).precaso_id===pc.id)) || null;
}
const rotDaOpcao = op => ((BENEF_ORDEM.flatMap(f=>BENEF[f]||[]).find(x=>x[0]===op))||[,op])[1];
// os requisitos que a análise gravou (detalhes.modulos.requisitos), com o nome de cada um no catálogo e o estado
function reqGravadosHtml(d){
  const rs = ((d||{}).modulos||{}).requisitos||[]; if(!rs.length) return "";
  const cat = REQ_BENEF[d.beneficio]||[];
  return `<ul class="da-req">${rs.map(r=>{ const def = cat.find(x=>x.id===r.id), [rotE, cls] = REQ_EST[r.est] || [r.est||"", "info"];
    return `<li><i class="pa-bola ${cls}" aria-hidden="true"></i><span><b>${esc(def ? def.rot.replace(/\s*\([^)]*\)/g, "") : r.id)}</b> ${esc(rotE)}${r.txt ? `: ${esc(semCodigo(r.txt))}` : ""}</span></li>`; }).join("")}</ul>`;
}
const rotFora = f => { const [p, v=""] = String(f).split(/:(.*)/); return p==="cnis.ind" ? `indicador ${v} do CNIS` : p==="falta" ? `falta de ${v.toUpperCase()}`
  : p==="rais.lic" ? (v==="nenhuma" ? "licença sem remuneração na RAIS (nenhuma)" : `licença da RAIS ${v}`) : p==="cnpj" ? `CNPJ ${v}` : (v || p); };
// F236 · o caso que nasceu de um pré-caso mostra o que o atendimento decidiu: o Desfecho (benefício, via, data do direito e a
// linha de cada benefício), a análise registrada com os requisitos, os itens levados do Primeiro atendimento e a volta à análise
function quadroDoAtendimento(k, recolher){
  const pc = k && k.precaso; if(!pc || k.pre_caso) return "";
  const df = pc.desfecho||{}, a = analiseDoCaso(k);
  if(!df.tipo && !a) return "";
  const quem = id => ((D.colPorId.get(id)||{}).nome||"").split(" ")[0];
  const d = (a && a.detalhes)||{}, m = a && cenMelhor(a), ad = k.ad||{};
  const dataDir = df.data_direito || d.data_direito || (m && m.data) || (d.modulos||{}).quando || null;
  const via = (df.via || pc.via)==="jud" ? "via judicial" : (df.via || pc.via)==="adm" ? "via administrativa" : "";
  const escolhidos = Object.entries(ad.beneficios || (d.modulos||{}).beneficios || {}).flatMap(([f, os])=>(os||[]).map(o=>(benefOpcao(f, o)||[,o])[1]));
  const lev = d.levados||[], fora = ad.fora||[];
  const ets = [["identificacao","Identificação"],["pa","Primeiro atendimento"],["analise","Análise"],["documentos","Documentos"]]
    .filter(([x])=>(pc.etapas||{})[x]).map(([x, r])=>{ const e = pc.etapas[x]; return `${r} ${fmtBarra(String(e.em||"").slice(0,10)).slice(0,5)}${quem(e.quem) ? ` (${esc(quem(e.quem))})` : ""}`; });
  const corpo = `
    <p class="meio-sub">${df.tipo==="caso" && df.em ? `virou caso em ${fmtBarra(String(df.em).slice(0,10))}${quem(df.quem) ? ` por ${esc(quem(df.quem))}` : ""}` : "nasceu de um pré-caso"}${pc.lembrete_id ? " · veio de um card de Aposentadorias futuras" : ""}</p>
    <p><b>Desfecho:</b> ${esc([df.beneficio || k.beneficio || "", via, rotNatureza(k.natureza || pc.natureza)].filter(Boolean).join(" · "))}${dataDir ? ` · direito ${dataDir <= hoje() ? "desde" : "em"} <b>${fmtBarra(dataDir)}</b>` : ""}</p>
    ${(df.linhas||[]).length ? `<ul class="desf-linhas">${df.linhas.map(l=>`<li class="desf-${l.acao||"falta"}"><b>${esc(l.rot)}:</b> ${esc(l.txt)}</li>`).join("")}</ul>` : ""}
    ${(()=>{ // F236 · o custo da demora: direito antes do pedido, e a aposentadoria paga desde o pedido (Lei 8.213/91, arts. 49 e 54)
      if(!dataDir || !k.der || dataDir >= k.der || !(ESP_APOS.test(k.especie||"") || /^apos/i.test(k.beneficio||""))) return "";
      const dias = diasEntreIso(dataDir, k.der), v = (m && +m.valor) || smEm(k.der) || 0;
      return `<p class="meio-sub"><b>Custo da demora:</b> direito desde ${fmtBarra(dataDir)}, pedido em ${fmtBarra(k.der)}: ${dias} dias sem benefício${v ? `, cerca de ${moedaBR(Math.round(v/30*dias))}` : ""} (a aposentadoria paga desde o pedido, salvo o empregado que pede em até 90 dias do desligamento: Lei 8.213/91, arts. 49 e 54).</p>`; })()}
    ${escolhidos.length ? `<p><b>Benefício escolhido:</b> ${esc(escolhidos.join("; "))}</p>` : ""}
    ${pc.honorarios || pc.hon ? `<p><b>Honorários combinados:</b> ${esc(pc.honorarios || resumoHon(pc.hon))}</p>` : ""}
    ${a ? `<p><b>Análise de Direito de ${fmtBarra(a.data_analise)}</b>${quem(a.autor_id) ? ` (${esc(quem(a.autor_id))})` : ""}${m && m.regra ? `: ${esc(m.regra)}${m.data ? ` em ${fmtBarra(m.data)}` : ""}${m.valor ? `, ${moedaBR(m.valor)}` : ""}` : ""}</p>${reqGravadosHtml(d)}`
      : `<p class="meio-sub">Nenhuma análise registrada no atendimento.</p>`}
    ${lev.length ? `<details><summary>Levados do Primeiro atendimento (${lev.length})</summary><ul>${lev.map(x=>`<li>${esc(x.txt)}${x.fonte ? ` <small>· ${esc(x.fonte)}</small>` : ""}</li>`).join("")}</ul></details>` : ""}
    ${fora.length ? `<p class="meio-sub">Deixados de fora no Primeiro atendimento: ${esc(fora.map(rotFora).join("; "))}.</p>` : ""}
    ${ets.length ? `<p class="meio-sub">Passos: ${ets.join(" · ")}${pc.cidade ? ` · cidade: ${esc(pc.cidade)}` : ""}</p>` : ""}
    ${a ? `<p><button type="button" class="btn-mini" onclick="abrirAnaliseDoCaso('${k.cliente_id}','${a.id}')" title="Abrir a análise"><span aria-hidden="true">Análise</span><span class="sr-only">Abrir a análise</span></button></p>` : ""}`;
  // F236 · no clássico (o visual padrão) o quadro vem recolhido, com o desfecho à vista: ele fica acima do campo de escrever
  return recolher ? `<details class="do-atend da-rec"><summary><b>Do atendimento</b> · ${esc([df.beneficio || k.beneficio || "", via, rotNatureza(k.natureza || pc.natureza)].filter(Boolean).join(" · "))}${dataDir ? ` · direito ${dataDir <= hoje() ? "desde" : "em"} ${fmtBarra(dataDir)}` : ""}</summary>${corpo}</details>`
    : `<section class="do-atend" aria-labelledby="da-t-${k.id}"><h3 id="da-t-${k.id}">Do atendimento</h3>${corpo}</section>`;
}
function abrirAnaliseDoCaso(cliId, aid){
  _adSel.set(cliId, aid); adVisivel.add(cliId); _atendAberto.delete(cliId);
  abaAtiva = 0; irSubCad("direito");
}
function irOutraAba(qual){
  if(qual==="pericias") abaAtiva=3;
  else if(qual==="honorarios") abaAtiva=4;
  else { abaAtiva=0; subCad=qual; guardar("crm_subcad", qual); }
  repintarFicha();
}
function painelOutrasAbas(k){
  const linhas = linhasOutrasAbas(k);
  if(!linhas.length) return "";
  return `<section class="outras-abas" aria-label="Nas outras abas"><h3>Nas outras abas</h3>
    ${linhas.map(([q,aba,txt,cor])=>`<button class="oa-linha" onclick="irOutraAba('${q}')">
      <span class="oa-ponto" style="background:${cor}"></span>
      <span class="oa-txt" title="${esc(txt)}"><small>${aba}</small><span class="fp2-sr">${esc(txt)}</span><span aria-hidden="true">${esc(String(txt).split(" · ")[0].split(": ")[0])}</span></span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>`).join("")}
  </section>`;
}
// F320 · o aviso de cada aba vira um ponto ao lado do nome dela no menu da ficha (plano de interface limpa, 31.10.2026):
// "Cadastro ● 8 dados faltam"; o vermelho vence o âmbar, e o azul (a data do direito) só entra no title
const ABA_DA_LINHA = {identificacao:"cad", direito:"cad", documentos:"cad", pericias:"per", honorarios:"hon"};
function pontoAba(k, qual){
  if(!k || !temaV10()) return "";
  let ls; try{ ls = linhasOutrasAbas(k).filter(l=>ABA_DA_LINHA[l[0]]===qual); }catch(e){ return ""; }
  const alerta = ls.filter(l=>l[3]!=="var(--azul)" && l[3]!=="var(--prox)" && l[3]!=="var(--cinza)");
  const vm = alerta.find(l=>l[3]==="var(--venc)"), x = vm || alerta[0];
  if(!x) return "";
  const curto = String(x[2]).split(" · ")[0].split(": ")[0].replace(/ às peças$/, "");
  return ` <span class="mt-ponto" style="--pc:${x[3]}" title="${esc(ls.map(l=>`${l[1]}: ${l[2]}`).join("\n"))}"><i aria-hidden="true"></i>${esc(curto)}</span>`;
}
function linhasOutrasAbas(k){
  const c = D.cliPorId.get(k.cliente_id); if(!c) return [];
  const hj = hoje(), ks = D.casosDoCliente.get(c.id)||[k], linhas = [];
  // F236 · o cadastro que falta às peças (a mesma régua da Identificação), o que deixa de existir sem CPF e nascimento, a senha
  // do Meu INSS no caso que corre lá e o estado civil que a certidão de óbito da pensão desmente
  let linhaCad = null;
  { const lac = faltaParaDocs(c), semId = [!c.cpf && "CPF", !c.dn && "nascimento"].filter(Boolean), f = sexoDe(c)==="F";
    const semSenha = ["inss","conselho"].includes(k.fase) && !((((D._ficha||{}).cliId===c.id) && (D._ficha||{}).creds)||[]).some(x=>x.tipo==="meu_inss");
    const viuva = /^B(21|93)$/.test(k.especie||"") && k.obito_em && /^casad/i.test(valCli(c, "estado_civil"));
    const partes = [lac.length ? `${plu(lac.length, "dado falta", "dados faltam")} às peças: ${lac.slice(0, 4).join(", ")}${lac.length > 4 ? "…" : ""}` : "",
      semId.length ? `sem ${semId.join(" e ")}, não há portal do cliente${!c.cpf ? " nem dossiê" : ""}` : "",
      semSenha ? "sem a senha do Meu INSS" : "",
      viuva ? `o cadastro diz ${f ? "casada" : "casado"}, mas pelo óbito de ${fmtBarra(k.obito_em)} é ${f ? "viúva" : "viúvo"}: corrija antes da procuração e das declarações` : "",
      lac.length && qualifDaInicial(c) ? "a petição inicial traz os dados: use na Identificação" : "",
      // F236 · sem o CNIS no CRM, qualidade, carência e tempo ficam "a informar"
      /^(inss|conselho|judicial|peticao_inicial)$/.test(faseEfetiva(k)||k.fase) && !(faseDaEtapa(k)==="judicial" && grauEtapa("judicial", k.etapa||"") >= 4)
        && !cnisDe(c) && !docsDoDossie(c.id).some(a=>/^CNIS · /.test(a.nome||"")) ? "o CNIS não está no CRM" : ""].filter(Boolean);   // depois da sentença, não pesa
    if(partes.length) linhaCad = ["identificacao","Cadastro", partes.join(" · "), "var(--venc)"]; }
  const ev = (D.eventos||[]).filter(e=>ks.some(x=>x.id===e.caso_id) && e.status!=="cancelada" && dataSP(e.data_hora)>=hj)
    .sort((a,b)=>a.data_hora<b.data_hora?-1:1)[0];
  // F236 · a que passou sem confirmação vem antes; o texto diz o tipo (julgamento não é perícia) e o caso, se for outro
  const evc = (D.eventos||[]).filter(e=>ks.some(x=>x.id===e.caso_id && x.fase!=="encerrado") && e.status==="agendada" && dataSP(e.data_hora)<hj)
    .sort((a,b)=>a.data_hora<b.data_hora?1:-1)[0];
  const deOutroCaso = e => e.caso_id!==k.id ? ` · ${tituloCaso(D.casoPorId.get(e.caso_id)||{})}` : "";   // F236 · (deOutro é dos honorários)
  if(evc) linhas.push(["pericias","Perícias",`${tipoEv(evc.tipo)} de ${fmtBarra(dataSP(evc.data_hora)).slice(0,5)} · aconteceu? confirme${deOutroCaso(evc)}`,"var(--venc)"]);
  if(ev) linhas.push(["pericias","Perícias",`${tipoEv(ev.tipo)} ${fmtBarra(dataSP(ev.data_hora)).slice(0,5)} às ${horaSP(ev.data_hora)}${ev.local?` · ${ev.local}`:""}${deOutroCaso(ev)}`,"#B7791F"]);
  // F236 · a análise do caso (a que se ligou a ele no gerar) vale mais que a última do cliente, e a data do direito aparece
  const an = analiseDoCaso(k) || analisesDe(c.id).slice().sort((a,b)=>(a.data_analise||"")<(b.data_analise||"")?1:-1)[0];
  if(an){
    const m = cenMelhor(an), dd = (an.detalhes||{}).data_direito || (m&&m.data) || ((an.detalhes||{}).modulos||{}).quando;
    linhas.push(["direito","Análise de Direito", dd ? (dd<=hj?`direito desde ${fmtBarra(dd)}`:`atinge o direito em ${fmtBarra(dd)}`)
      : `análise de ${fmtBarra(an.data_analise)}`, "var(--azul)"]);
  }
  // F236 · documento (📄) e tarefa são coisas diferentes: cada um na sua linha, com a data mais próxima; o clique leva às
  // Pendências do caso, no alto de Documentos, onde o item está à vista
  const tsK = (D.tarefas||[]).filter(t=>t.caso_id===k.id && !t.concluida), ehDoc = t => /^📄/.test(t.titulo||"");
  const docs = tsK.some(ehDoc) ? tsK.filter(ehDoc).map(t=>({nome:t.titulo.replace(/^📄\s*/, ""), ate:t.prazo||null})) : docsPendentes(c.id);
  const outrasK = tsK.filter(t=>!ehDoc(t)).map(t=>({nome:t.titulo, ate:t.prazo||null}));
  const ate = xs => (d=>d ? ` · até ${fmtBarra(d).slice(0,5)}` : "")(xs.map(x=>x.ate).filter(Boolean).sort()[0]);
  // F236 · o pedido com data mostra a data (a mais próxima); a cor diz o estado: vencido ou sem data em vermelho
  const ateDoc = docs.map(d=>d.ate).filter(Boolean).sort()[0];
  if(docs.length) linhas.push(["documentos","Documentos",
    `${docs.length} ${docs.length===1?"pendente":"pendentes"}${ate(docs)} · ${docs.slice(0,2).map(d=>d.nome).join(", ")}`, !ateDoc || ateDoc<hj ? "var(--venc)" : "#B7791F"]);
  if(outrasK.length) linhas.push(["documentos","Tarefas do caso",
    `${outrasK.length} ${outrasK.length===1?"aberta":"abertas"}${ate(outrasK)} · ${outrasK.slice(0,2).map(d=>d.nome).join(", ")}`, "var(--prox)"]);
  // F236 · os honorários DESTE caso, pelo estado: o vencido em vermelho (o mais antigo e a próxima), o a vencer em âmbar;
  // o de outro caso só entra vencido, dizendo de qual; a parcela sem caso pede o vínculo; a concessão propõe o contrato
  const abCli = (D.pagamentos||[]).filter(p=>p.status==="aberto" && !valorSuspeito(p) && (p.cliente_id===c.id || ks.some(x=>x.id===p.caso_id)));
  const somaV = l => l.reduce((t,p)=>t+(+p.valor||0), 0), valTxt = p => pgSemValor(p) ? "a calcular" : moedaBR(p.valor);
  const meus = abCli.filter(p=>casoDoPgto(p)===k.id);
  const vencP = meus.filter(p=>p.vencimento && p.vencimento<hj && !pgSemValor(p)).sort((a,b)=>a.vencimento<b.vencimento?-1:1);
  const futP = meus.filter(p=>p.vencimento && p.vencimento>=hj).sort((a,b)=>a.vencimento<b.vencimento?-1:1);
  if(vencP.length) linhas.push(["honorarios","Honorários", `${moedaBR(somaV(vencP))} vencido${vencP.length>1?"s":""} há ${-diasAte(vencP[0].vencimento)} d · ${origemPgto(vencP[0])}${futP[0]?` · próxima ${valTxt(futP[0])} em ${dCurta(futP[0].vencimento)}`:""}`, "var(--venc)"]);
  else if(futP.length) linhas.push(["honorarios","Honorários", `próximo vencimento ${dCurta(futP[0].vencimento)} · ${valTxt(futP[0])}`, "#B7791F"]);
  else if(meus.length) linhas.push(["honorarios","Honorários", `${meus.length} a receber sem data · ${meus.some(pgSemValor)?"a calcular":moedaBR(somaV(meus))}`, "var(--cinza)"]);
  const deOutro = abCli.filter(p=>{ const o = casoDoPgto(p); return o && o!==k.id && p.vencimento && p.vencimento<hj && !pgSemValor(p); });
  if(deOutro.length){ const ko = D.casoPorId.get(casoDoPgto(deOutro[0]));
    linhas.push(["honorarios","Honorários de outro caso", `${moedaBR(somaV(deOutro))} vencido · ${ko?`${tituloCaso(ko)}${ko.fase==="encerrado"?" (encerrado)":""}`:""}`, "var(--venc)"]); }
  const soltos = abCli.filter(p=>!casoDoPgto(p));
  if(soltos.length) linhas.push(["honorarios","Honorários sem caso", `${soltos.length} parcela${soltos.length>1?"s":""} sem caso: diga de qual benefício é`, "#B7791F"]);
  const pr = propostaHonorarios(c, k), lanc = pr ? pr.itens.filter(x=>!x.condic) : [];
  // F236 · a data com o ano quando não é deste ano, e a sentença que ainda está em recurso é previsão, e não lançamento
  const sobRec = !!(pr && pr.motivo.em && /senten/.test(pr.motivo.rot||"") && (k.etapa==="em recurso"
    || fatosDaEtapa(k, andsDoCaso(k)).some(f=>f.fase==="judicial" && f.etapa==="em recurso" && f.data>pr.motivo.em)));
  if(lanc.length) linhas.push(["honorarios","Honorários a lançar", `${lanc.length} pelo contrato${(t=>t?` · ${lanc.some(x=>x.valor && /^≈/.test(x.nota||""))?"≈ ":""}${moedaBR(t)}`:"")(somaV(lanc))} · ${pr.motivo.rot}${pr.motivo.em?` em ${dCurta(pr.motivo.em)}`:""}${sobRec?" · previsão: a sentença está em recurso":""}`, "#B7791F"]);
  if(linhaCad) linhas.push(linhaCad);   // F236 · por último: o que é do caso vem antes do cadastro
  return linhas;
}
function lcNovoNb(casoId){
  caixa(`<h3 style="margin:0 0 6px">＋ NB</h3>
    <div class="form-linha"><input id="lc-nb-inp" placeholder="216.197.676-6" style="flex:1"
      onkeydown="if(event.key==='Enter')lcGuardarNb('${casoId}')">
      <button class="btn-mini forte" onclick="lcGuardarNb('${casoId}')">guardar</button></div>`);
  document.getElementById("lc-nb-inp").focus();
}
async function lcGuardarNb(casoId){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const v = (document.getElementById("lc-nb-inp").value||"").trim(); if(!v) return;
  if(nbsDoCaso(k).some(n=>soDig(n)===soDig(v))) return aviso("Este NB já está no caso");
  const corpo = k.nb ? {nbs:[...(Array.isArray(k.nbs)?k.nbs:[]), v]} : {nb:v};
  try{ await patchCaso(casoId, corpo); }
  catch(e){ return aviso("Não gravou — rode o crm/fase2/schema_linha_caso.sql no Supabase"); }
  Object.assign(k, corpo); fecharCaixa(); aviso("NB guardado ✔", false); repintarFicha();
}
function lcNovoNup(casoId){
  caixa(`<h3 style="margin:0 0 6px">＋ Recurso (e-Sisrec)</h3>
    <div class="form-linha"><input id="lc-nup-inp" placeholder="44236.386953/2023-61" style="flex:1"
      onkeydown="if(event.key==='Enter')lcGuardarNup('${casoId}')">
      <button class="btn-mini forte" onclick="lcGuardarNup('${casoId}')">guardar</button></div>`);
  document.getElementById("lc-nup-inp").focus();
}
function lcGuardarNup(casoId){
  const v = (document.getElementById("lc-nup-inp").value||"").trim();
  fecharCaixa(); return salvarCrpsNup(casoId, null, v);
}
function lcNovoProc(casoId){
  caixa(`<h3 style="margin:0 0 6px">＋ Processo judicial</h3>
    <div class="form-linha"><input id="lc-proc-inp" placeholder="número CNJ, 20 dígitos" style="flex:1"
      onkeydown="if(event.key==='Enter')lcGuardarProc('${casoId}')">
      <button class="btn-mini forte" onclick="lcGuardarProc('${casoId}')">guardar</button></div>`);
  document.getElementById("lc-proc-inp").focus();
}
function lcGuardarProc(casoId){
  const v = (document.getElementById("lc-proc-inp").value||"").trim();
  fecharCaixa(); return acrescentarProcesso(casoId, v);
}
function lcEditarFixo(casoId){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const fx = k.fixo || {};
  caixa(`<h3 style="margin:0 0 6px">Comentário fixo do caso</h3>
    <p class="meio-sub" style="margin:0 0 8px">Fica em destaque acima dos prazos enquanto estiver preenchido. Apague o texto para tirar.</p>
    <textarea id="lc-fx-texto" rows="3" style="width:100%;box-sizing:border-box">${esc(fx.texto||"")}</textarea>
    <div class="form-linha" style="margin-top:8px;align-items:center">
      <label class="meio-sub" title="na data escolhida o comentário entra nos prazos e providências, como lembrete">lembrar em
        <input type="date" id="lc-fx-data" value="${esc(fx.lembrar_em||"")}"></label>
      <button class="btn-rap" onclick="fecharCaixa()">cancelar</button>
      <button class="btn-mini forte" style="margin-left:auto" onclick="lcGuardarFixo('${k.id}')">guardar</button>
    </div>`);
  document.getElementById("lc-fx-texto").focus();
}
async function lcGuardarFixo(casoId){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const texto = (document.getElementById("lc-fx-texto").value||"").trim();
  const lembrar_em = document.getElementById("lc-fx-data").value || null;
  const fixo = texto ? {texto, lembrar_em, por:eu.id, em:new Date().toISOString()} : null;
  try{ await patchCaso(casoId, {fixo}); }
  catch(e){ return aviso("Não gravou — rode o crm/fase2/schema_linha_caso.sql no Supabase"); }
  k.fixo = fixo; fecharCaixa();
  aviso(fixo?"Comentário fixado no caso":"Comentário fixo retirado", false);
  repintarFicha();
}
// o comentário fixo em destaque, acima dos prazos — só existe preenchido
function faixaFixo(k){
  const fx = k.fixo; if(!fx || !fx.texto) return "";
  const quem = fx.por && D.colPorId.get(fx.por);
  return `<div class="fixo-caso" onclick="lcEditarFixo('${k.id}')" title="comentário fixo do caso — clique para editar">
    <span class="fixo-ico">${ICO_PIN}</span><span class="fixo-txt">${esc(fx.texto)}</span>
    <small class="fixo-de">${quem?esc(quem.nome.split(" ")[0]):""}${fx.em?` · ${fmt(dataSP(fx.em))}`:""}${fx.lembrar_em?` · lembrar ${fmtBarra(fx.lembrar_em)}`:""}</small>
  </div>`;
}
function blocoFatos(k){
  const incap = ehIncapacidade(k) || /^B(31|32|91|92|94|36)$/.test(k.especie||"") || k.dcb || k.dii;
  const rec = recorrerAte(k), dRec = rec ? diasAte(rec) : null;
  const prots = (k.protocolos||[]);
  const st = subtarefasDe(k.id), feitas = st.filter(t=>t.concluida).length;
  const procs = processosDoCaso(k);
  // F58 · o cartão na ordem do Paulo: espécie → o essencial DA FASE → a
  // janela de datas → "mais informações" (o resto, dobrado) → responsável →
  // e as ações (fundir / não é caso / encerrar) POR ÚLTIMO. Poucas
  // informações à vista; nada sumiu — o que saiu da frente mora no ➕.
  const linhaProt = `<div class="fx"><dt title="protocolo do requerimento no INSS">Protocolo</dt>
        <dd>${prots.length?prots.map(p=>`<span class="fx-prot" title="copiar" onclick="copiar('${p}','Protocolo copiado')">${esc(p)}</span>`).join(" "):`<span class="fx-vazio">—</span>`}
        <button class="lapis" title="acrescentar protocolo" onclick="novoProtocolo('${k.id}')">✎</button></dd></div>`;
  const linhaRec = rec?`<div class="fx fx-prazo ${dRec<0?"passou":dRec<=10?"perto":""}">
        <dt title="30 dias contados da decisão">Recorrer até</dt>
        <dd>${fmt(rec)} <small>${dRec<0?`venceu há ${-dRec} d`:dRec===0?"é hoje":`faltam ${dRec} d`}</small></dd></div>`:"";
  const fase = faseEfetiva(k);   // F236 · no 🗓 Tarefas com Prazo o cartão continua o da fase do caso
  // F69 · o ➕ virou botão (o details saiu): aberto sobrevive à repintura
  // pela mesma mecânica maisAberto/maisDobra do F58
  const botaoMais = k2 => `<button class="fx-mais-bt"
    title="etapas anteriores, números e datas que não precisam ficar à vista"
    onclick="maisDobra('${k2.id}',${maisAberto.has(k2.id)?"false":"true"});repintarFicha()">${
    maisAberto.has(k2.id)?"➖ menos informações":"➕ mais informações"}</button>`;
  // o essencial de cada fase (o resto vai para o ➕ mais informações)
  let miolo="", noMais=[];
  if(fase==="judicial"){
    miolo = `<dl class="fx-grade">
      ${campoFato(k,"ajuizado_em")}
      ${campoFato(k,"orgao_judicial")}
    </dl>
    ${procs.length?`<div class="fx-procs">${procs.map(p=>`<span class="fx-prot" title="abrir a sub-aba Andamentos do CNJ"
        onclick="irSubAba('cnj')">${esc(fmtProc(p.numero))}</span>${p.principal?`<span class="chip ben">principal</span>`:""}${
        p.papel!=="acao"?`<span class="chip neutro">${esc(PAPEIS_PROCESSO[p.papel].curto)}</span>`:""}`).join(" ")}</div>`
      :`<dl class="fx-grade">${campoFato(k,"processo")}</dl>`}`;
    noMais = ["nb","dib","der","decisao_em","classe_judicial", ...(procs.length?["processo"]:[])];
  } else if(fase==="conselho"){
    const temRO=!!k.ro_protocolado_em, temED=!!k.ed_protocolado_em;
    miolo = `${linhaAcomp(k)}
    <dl class="fx-grade">
      ${campoFato(k,"ro_protocolado_em")}${reanalisePreclusa(k) ? `<p class="fx-nota meio-sub">O recurso veio dentro dos 10 dias sem a reanálise: a reanálise ficou preclusa (Portaria Conjunta 13/2026, art. 9º, § 1º, com a redação da Portaria Conjunta 54/2026).</p>` : ""}
      ${(temRO||temED)?campoFato(k,"ed_protocolado_em"):""}
      ${(temED||k.re_protocolado_em)?campoFato(k,"re_protocolado_em"):""}
    </dl>`;
    noMais = ["nb","der","dib","decisao_em",
      ...(k.ajuizado_em?["ajuizado_em"]:[]),
      ...(k.classe_judicial?["classe_judicial"]:[]), ...(k.orgao_judicial?["orgao_judicial"]:[])];
  } else {
    // INSS, Escritório, Pagamento e afins: a vida administrativa.
    // F69/F70 · o protocolo mora DENTRO do mais; o ➕ fica LOGO ABAIXO da
    // DER (a vaga ao lado da DER ficou reservada para o dado relevante do
    // INSS que o Paulo ainda vai escolher)
    miolo = `${fase==="inss"?linhaAcomp(k):""}${linhaMarcadores(k)}
    <dl class="fx-grade">${campoFato(k,"der")}</dl>
    <div class="fx-mais-linha">${botaoMais(k)}</div>`;
    noMais = ["nb","dib","decisao_em",
      ...(k.ajuizado_em?["ajuizado_em"]:[]),
      ...(k.classe_judicial?["classe_judicial"]:[]), ...(k.orgao_judicial?["orgao_judicial"]:[])];
  }
  // F69 · o corpo do "mais informações" (era o <details>): mesmo conteúdo,
  // agora renderizado onde a fase pede — INSS logo após a DER, judicial e
  // conselho depois do quadro de datas
  const blocoMais = () => `<div class="fx-mais-corpo">
      ${trilhaProcessual(k)}
      ${(()=>{
        if(k.fase!=="conselho" && k.fase!=="judicial") return "";
        const pos=TRILHA.indexOf(k.fase);
        const cands=(D.casosDoCliente.get(k.cliente_id)||[]).filter(x=>x.id!==k.id &&
          (x.fase==="encerrado" || (TRILHA.indexOf(x.fase)>=0 && TRILHA.indexOf(x.fase)<pos)));
        if(cands.length!==1) return "";
        const o=cands[0];
        return `<div class="fx-rec"><span class="fx-rot">⇄</span>
          <span class="meio-sub">Este ${k.fase==="conselho"?"recurso":"processo judicial"} parece a
            continuação de <b>${esc(tituloCaso(o))}</b>
            (${esc(listaDe(o)!=="—"?listaDe(o):(NOME_FASE[o.fase]||""))}${o.fase==="encerrado"?" · ✔ encerrado":""}) —
            o mesmo pedido, em fases diferentes.</span>
          <button class="btn-mini" onclick="fundirCasos('${o.id}','${k.id}')" title="⇄ fundir os dois neste"><span aria-hidden="true">⇄ Fundir</span><span class="sr-only">⇄ fundir os dois neste</span></button>
        </div>`;})()}
      ${(fase==="judicial"||fase==="conselho")?linhaMarcadores(k):""}
      <dl class="fx-grade">
        ${noMais.map(cp=>campoFato(k,cp)).join("")}
        ${linhaProt}
      </dl>
      ${/* É AQUI que as abas nascem. 🖥 Recurso e ⚖️ CNJ só aparecem quando o
           caso tem o número — e o número se digita neste ponto, na aba
           Andamentos do Escritório, que existe sempre. */""}
      ${linhaNumerosDasAbas(k)}
      ${k.fase==="aposentadoria_futura"?`<div class="fx-rec">
        <span class="fx-rot">🔔</span>
        <button class="btn-mini" onclick="casoViraLembrete('${k.id}')" title="transformar em lembrete do cliente"><span aria-hidden="true">Lembrete</span><span class="sr-only">transformar em lembrete do cliente</span></button>
        <span class="meio-sub">este caso é um "avisar de tempos em tempos"? O lugar disso agora é a
          aba 🙏 Aposentadorias futuras — o botão cria o card e encerra o caso.</span>
      </div>`:""}
    </div>`;
  return `<section class="fatos fatos-processo">
    <div class="fatos-topo">
      <h3>${esc(tituloCaso(k))}</h3>
      ${/* F69 · a espécie mora NA FRENTE do nome (só o B+número), com o ✎
           abrindo a lista das espécies cabíveis — o quadro ESPÉCIE saiu */""}
      <span class="esp-cod" id="fx-especie-${k.id}">${k.especie
        ?esc(String(k.especie).toUpperCase())
        :`<span class="fx-vazio">espécie?</span>`}<button class="lapis"
        title="alterar a espécie — a lista mostra as espécies cabíveis"
        onclick="editarFato('${k.id}','especie')">✎</button></span>
      ${k.natureza?`<span class="chip nat-chip" title="natureza do pedido">${esc(rotNatureza(k.natureza))}</span>`:""}
      ${chipRevisao(k, D.cliPorId.get(k.cliente_id))}
      <span class="chip ben" title="a lista deste caso (a mesma do To Do)">${
        esc(listaDe(k)!=="—"?listaDe(k):(NOME_FASE[k.fase]||""))}</span>
      ${(j=>!j?"":`${j.ms?`<span class="chip per" title="classe: ${esc(j.classe||"")}">⚡ Mandado de Segurança</span>`:""}${
        j.rito?`<span class="chip neutro" title="classe: ${esc(j.classe||"")} — a localização atual">${j.rito==="JEF"?"🏛 JEF":"📜 Rito comum"}</span>`:""}${
        j.orgao?`<span class="chip neutro" title="órgão julgador: ${esc(tituloOrgao(j.orgao)||j.orgao)}">📍 ${esc((tituloOrgao(j.orgao)||j.orgao).split(" - ")[0])}</span>`:""}`)(dadosJudiciais(k))}
      ${botoesPjeDoCaso(k, "chip neutro", ' style="text-decoration:none"')}
      ${!k.beneficio?`<input id="ben-${k.id}" list="lista-beneficios" placeholder="qual é o benefício?"
        style="padding:4px 8px;border:1px solid var(--borda);border-radius:6px;font-size:13px">
        <button class="btn-mini" onclick="salvarBeneficio('${k.id}')">definir</button>`:""}
      ${chipExig(k)}
      ${k.parceria?`<span class="chip ben">🤝 ${esc(k.parceria)}</span>`:""}
      ${k.exigencia_prazo?`<button class="btn-mini" onclick="copiarMsgExigencia('${k.id}')" title="💬 msg ao cliente"><span aria-hidden="true">💬 Mensagem</span><span class="sr-only">💬 msg ao cliente</span></button>
        <button class="btn-mini" onclick="cumprirExigencia('${k.id}')">✔ cumprida</button>`:""}
    </div>
    ${linhaNatureza(k)}
    ${temaV10()?"":linhaEtapaClassica(k)}
    ${miolo}
    ${linhaRec?`<dl class="fx-grade">${linhaRec}</dl>`:""}
    ${(fase!=="judicial"&&fase!=="conselho"&&maisAberto.has(k.id))?blocoMais():""}
    ${incap?`<div class="fx-incap">
      <div class="fx-incap-rot">Benefício por incapacidade</div>
      <dl class="fx-grade">
        ${campoFato(k,"dii")}
        ${ehAcidentario(k)?campoFato(k,"dat"):""}
        ${!k.dcb && camposEssenciais(k).includes("?dcb") ? "" : campoFato(k,"dcb")}${/* F236 · negado: só se alguém a preencher */""}
        ${k.dcb?campoFato(k,"dcb_prorrogar_em"):""}
      </dl>
      ${k.dcb?`<div class="fx-prorrog">
        <label class="cfg-ck"><input type="checkbox" ${k.dcb_prorrogacao_pedida?"checked":""}
          onchange="salvarProrrog('${k.id}',this.checked)"> prorrogação já pedida</label>
        ${chipDcb(k)||`<span class="chip prazo ok">✔ alarme desligado</span>`}
      </div>`:""}
    </div>`:""}
    ${temaV10()?"":quadroDatas(k)}
    ${(fase==="judicial"||fase==="conselho")
      ?`<div class="fx-mais-linha">${botaoMais(k)}</div>${maisAberto.has(k.id)?blocoMais():""}`:""}
    ${/* F69 · a linha do Responsável SAIU do cartão (pedido do Paulo: a
         atribuição de caso gerava confusão) — fica só o checklist */""}
    <div class="fatos-pe">
      <button class="fx-docs" onclick="var d=document.getElementById('docs-${k.id}');d.classList.toggle('aberto')">
        📎 Documentos solicitados <b>${feitas} / ${st.length}</b></button>
    </div>
    <div class="fx-docs-lista" id="docs-${k.id}">${checklistCaso(k)}</div>
    ${/* F58 · as ações moram POR ÚLTIMO (pedido do Paulo): decidir o destino
         do caso é a última coisa da leitura, não a primeira */""}
    <div class="fatos-topo" style="border-top:1px dashed var(--borda);padding-top:8px;margin-top:8px">
      <span style="margin-left:auto;display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap">${acoesDoCaso(k)}</span>
    </div>
  </section>`;
}
// F670 · linha do tempo do caso (protótipo do Base44 aprovado pelo Paulo, 21.11.2026): total desde o 1º contato e a barra
// das fases na cor de cada uma, com o ano em que começou. Tudo lido do que já está gravado; nada se digita aqui.
function linhaTempoCaso(k){
  if(!ehPrev(k) || ehPreCaso(k)) return "";
  const ano = s => (/^\d{4}/.exec(String(s||""))||[""])[0];
  const fs = jornadaFases(k), st = f => (fs.find(x=>x.f===f)||{}).st;
  const pg = (D.pagamentos||[]).filter(p=>p.caso_id===k.id);
  const pago = pg.filter(p=>p.status!=="aberto" && p.pago_em).map(p=>p.pago_em).sort();
  const impl = !!k.dib || /^(pagamento|encerrado)$/.test(k.fase||"");
  const cli = D.cliPorId.get(k.cliente_id) || {}, ini = [cli.criado_em, k.criado_em].filter(Boolean).sort()[0];
  const segs = [
    ["escritorio", st("escritorio"), ano(ini), 2],
    ["inss", st("inss"), ano(k.der), 1.6],
    ["conselho", st("conselho"), ano(k.ro_protocolado_em), 1],
    ["judicial", st("judicial"), ano(k.ajuizado_em), 2.4],
    ["implantacao", impl ? "f" : "v", ano(k.dib), 1],
    ["honorarios", pg.length && pago.length===pg.length ? "f" : pago.length ? "a" : "v", ano(pago[0]), 1.4]];
  const COR = {implantacao:["#6B3FA0","Implantação"], honorarios:["#0E5C58","Honorários"]};
  const bar = segs.filter(([,s])=>s!=="n").map(([f,s,a,fl])=>{
    const [c, n] = COR[f] || [COR_FASE[f].c, f==="conselho" ? "CRPS" : COR_FASE[f].n], fut = s==="v";
    return `<div class="ltc-s${fut?" ltc-v":""}${s==="a"?" ltc-a":""}" style="flex:${fl};--c:${fut?"#B7BCC2":c}" title="${esc(n)}${a&&!fut?` · desde ${a}`:""}">
      <span class="ltc-y">${fut?"":esc(a)}</span><span class="ltc-r"></span><span class="ltc-n">${esc(n)}</span></div>`; }).join("");
  let tot = "";
  if(ini){ const d0 = new Date(ini), h = new Date(), m = (h.getFullYear()-d0.getFullYear())*12 + h.getMonth()-d0.getMonth() - (h.getDate()<d0.getDate()?1:0);
    const a = Math.floor(m/12), r = m%12;
    tot = [a ? `${a} ${a>1?"anos":"ano"}` : "", r ? `${r} ${r>1?"meses":"mês"}` : ""].filter(Boolean).join(" e ") || "menos de um mês"; }
  return `<section class="ltc" aria-label="Linha do tempo do caso">${tot ? `<div class="ltc-k">Total desde o 1º contato</div><div class="ltc-t">${tot}</div>` : ""}<div class="ltc-bar">${bar}</div></section>`;
}
