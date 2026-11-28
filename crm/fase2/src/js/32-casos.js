// ── recurso de consulta manual ────────────────────────────────────────────
// O e-Recursos só devolve o que está ligado ao CPF do procurador. Quando o
// recurso não está vinculado, o robô não vê nada e alguém precisa abrir o
// site e olhar. Isso hoje vira, no To Do, uma anotação "não houve andamento"
// por semana — vinte linhas dizendo que nada aconteceu, e ainda assim
// ninguém sabe se a consulta DESTA semana foi feita.
//
// Aqui a conferência não é andamento: a olhada que não achou nada vira
// carimbo (quem, quando) e se acumula numa linha só. Só o que ACONTECEU vira
// comentário na ficha.
const soDig = x => String(x||"").replace(/\D/g,"");
function quadroManual(b, k){
  const c = b.consulta||{}, resp = c.responsavel_id && D.colPorId.get(c.responsavel_id);
  const atrasada = !c.proxima || c.proxima <= hoje();
  const ult = (c.checagens||[])[0];
  const ultCol = ult && D.colPorId.get(ult.por);
  return `<div class="caso man-cx ${atrasada?"vence":""}">
    <div class="rotulo-caso">🔎 consulta manual · <span style="font-family:var(--f-mono,ui-monospace,Consolas,monospace)">${esc(b.nup||"")}</span></div>
    <p class="meio-sub" style="margin:4px 0 0">Este recurso não está vinculado ao CPF do procurador, então o
      robô não enxerga: quem confere no e-Recursos é ${resp?esc(resp.nome):"<b>ninguém ainda</b>"}.</p>
    <div class="man-linha">
      <span class="man-selo ${atrasada?"vence":""}">${atrasada?"⏰ conferir agora":`🗓 próxima em ${fmt(c.proxima)}`}</span>
      ${c.total?`<span class="meio-sub">conferido ${c.total}× · última em ${ult?fmtTS(ult.em):"—"}${ultCol?` (${esc(ultCol.inicial)})`:""}</span>`
               :`<span class="meio-sub">ainda não foi conferido nenhuma vez</span>`}
    </div>
    <div class="form-linha" style="margin-top:8px">
      <a class="btn-mini" target="_blank" rel="noopener" style="text-decoration:none"
         href="${linkERecursos(b.nup)}">🌐 abrir o e-Recursos</a>
      <button class="btn-mini" onclick="manualSemNovidade('${k.id}','${esc(b.nup||"")}')"
        title="registra que você olhou e nada mudou — não gera comentário"><span aria-hidden="true">✓ Inalterado</span><span class="sr-only">✓ conferido, sem novidade</span></button>
      <button class="btn-mini forte" onclick="manualComNovidade('${k.id}','${esc(b.nup||"")}')"
        title="houve movimentação — vira comentário na ficha"><span aria-hidden="true">✎ Andamento…</span><span class="sr-only">✎ teve andamento…</span></button>
      <button class="btn-mini" onclick="manualAjustar('${k.id}','${esc(b.nup||"")}')"
        title="quem confere e de quanto em quanto tempo"><span aria-hidden="true">⚙️ Configurar</span><span class="sr-only">⚙️ quem e quando</span></button>
    </div>
  </div>`;
}

// as mesmas regras do robo-crps/manual.js — os dois lados escrevem no mesmo
// pedaço de casos.crps, então precisam concordar sobre o formato
const CADENCIA_PADRAO = 7, HISTORICO_MAX = 12;
function maisDiasISO(iso, dias){
  const [a,m,d] = String(iso).slice(0,10).split("-").map(Number);
  return new Date(Date.UTC(a, m-1, d + Number(dias||0))).toISOString().slice(0,10);
}
function blocoDoNup(k, nup){
  return crpsBlocos(k).find(b=>soDig(b.nup)===soDig(nup)) || null;
}
async function crpsManual(casoId, nup){
  const k = D.casoPorId.get(casoId); if(!k) return;
  if(!Array.isArray(k.crps)) k.crps = crpsBlocos(k);
  let b = blocoDoNup(k, nup);
  if(!b){ b = {nup:String(nup), eventos:[]}; k.crps.push(b); }
  b.manual = true;
  b.consulta = Object.assign({responsavel_id:null, cada_dias:CADENCIA_PADRAO,
    proxima:hoje(), total:0, checagens:[]}, b.consulta||{});
  await gravarCrps(k);
  aviso("Marcado como consulta manual 🔎 — diga quem confere e de quanto em quanto tempo", false);
  abrirFicha(clienteAberto);
  manualAjustar(casoId, nup);
}
async function crpsAutomatico(casoId, nup){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const b = blocoDoNup(k, nup); if(!b) return;
  delete b.manual;                       // a consulta fica: é o registro do
  await gravarCrps(k);                   // trabalho que já foi feito à mão
  aviso("Voltou para o robô 🤖 — entra na próxima coleta", false);
  abrirFicha(clienteAberto);
}

// O botão que troca vinte anotações "não houve andamento" por uma linha só.
// Não gera comentário de propósito: conferir não é andamento.
async function manualSemNovidade(casoId, nup){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const b = blocoDoNup(k, nup); if(!b || !b.manual) return;
  const c = b.consulta || (b.consulta = {cada_dias:CADENCIA_PADRAO, total:0, checagens:[]});
  c.checagens = [{em:new Date().toISOString(), por:eu.id, novidade:false}, ...(c.checagens||[])].slice(0, HISTORICO_MAX);
  c.total = (c.total||0) + 1;
  // a próxima conta de HOJE, não da data que estava marcada: quem conferiu
  // com três dias de atraso não deve ser cobrado de novo amanhã
  c.proxima = maisDiasISO(hoje(), c.cada_dias||CADENCIA_PADRAO);
  await gravarCrps(k);
  plim();
  aviso(`Conferido ✔ — próxima em ${fmt(c.proxima)}`, false);
  abrirFicha(clienteAberto);
}

function manualComNovidade(casoId, nup){
  caixa(`<h3>✎ Teve andamento no recurso</h3>
    <p class="meio-sub">Isto vira comentário na ficha e acende o ⭐ do processo —
      é o que faz o caso aparecer na frente de todo mundo.</p>
    <textarea id="mn-txt" rows="3" placeholder="o que apareceu no e-Recursos?"
      style="width:100%;margin-top:8px;font:inherit;padding:8px;border:1px solid var(--borda);border-radius:8px"></textarea>
    <div class="form-linha" style="margin-top:8px">
      <button class="btn-rap" style="margin-left:auto"
        onclick="salvarManualNovidade('${casoId}','${esc(nup)}')" title="Registrar andamento">Registrar<span class="sr-only"> andamento</span></button>
    </div>`);
  setTimeout(()=>{const t=document.getElementById("mn-txt"); if(t) t.focus();}, 40);
}
async function salvarManualNovidade(casoId, nup){
  const t = document.getElementById("mn-txt");
  const txt = ((t&&t.value)||"").trim();
  if(!txt) return aviso("Escreva o que apareceu");
  const k = D.casoPorId.get(casoId); if(!k) return;
  const b = blocoDoNup(k, nup); if(!b) return;
  fecharCaixa();
  const c = b.consulta || (b.consulta = {cada_dias:CADENCIA_PADRAO, total:0, checagens:[]});
  c.checagens = [{em:new Date().toISOString(), por:eu.id, novidade:true}, ...(c.checagens||[])].slice(0, HISTORICO_MAX);
  c.total = (c.total||0) + 1;
  c.proxima = maisDiasISO(hoje(), c.cada_dias||CADENCIA_PADRAO);
  await gravarCrps(k);
  await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({caso_id:k.id, autor_id:eu.id,
      texto:`🔎 CRPS (consulta manual) — ${txt}`})}).catch(()=>{});
  plim();
  aviso("Andamento registrado", false);
  abrirFicha(clienteAberto);
}

function manualAjustar(casoId, nup){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const b = blocoDoNup(k, nup); if(!b) return;
  const c = b.consulta||{};
  caixa(`<h3>⚙️ Quem confere este recurso, e quando</h3>
    <p class="meio-sub">Vencendo, ele aparece no Meu Dia de quem for escolhido.</p>
    <div class="form-linha" style="margin-top:8px">${equipeAtiva().map(co=>
      `<button class="eq-ini ${c.responsavel_id===co.id?"on":""}" data-mnq="${co.id}"
        style="--cor-eq:${co.cor}" title="${esc(co.nome)}"
        onclick="document.querySelectorAll('[data-mnq]').forEach(b=>b.classList.remove('on'));this.classList.add('on')"
        >${esc(co.inicial)}</button>`).join("")}</div>
    <div class="form-linha" style="margin-top:10px;align-items:center">
      <span class="rotulo-rap">CONFERIR A CADA</span>
      ${[7,15,30].map(n=>`<button class="btn-rap mn-cad ${(c.cada_dias||7)===n?"on":""}" data-mnc="${n}"
        onclick="document.querySelectorAll('[data-mnc]').forEach(b=>b.classList.remove('on'));this.classList.add('on')"
        >${n} dias</button>`).join("")}
      <button class="btn-rap" style="margin-left:auto"
        onclick="salvarManualAjuste('${casoId}','${esc(nup)}')">Salvar</button>
    </div>`);
}
async function salvarManualAjuste(casoId, nup){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const b = blocoDoNup(k, nup); if(!b) return;
  const q = document.querySelector("[data-mnq].on"), cad = document.querySelector("[data-mnc].on");
  fecharCaixa();
  const c = b.consulta || (b.consulta = {total:0, checagens:[]});
  c.responsavel_id = q ? q.dataset.mnq : null;
  c.cada_dias = cad ? Number(cad.dataset.mnc) : CADENCIA_PADRAO;
  if(!c.proxima) c.proxima = hoje();
  await gravarCrps(k);
  aviso("Combinado ✔", false);
  abrirFicha(clienteAberto);
}

// abre a cópia do acórdão que mora no CRM (link assinado, curto)
async function abrirDecisao(caminho){
  const guia=window.open("", "_blank");           // abrir agora: o navegador
  try{                                            // bloqueia janela tardia
    const url=await linkArquivo(caminho);
    if(guia) guia.location=url; else window.location=url;
  }catch(e){ if(guia) guia.close(); aviso("Não consegui abrir a decisão"); }
}

// monta uma mensagem curta e clara para o cliente com a situação do(s) recurso(s)
// F236 · a frase sai da situação traduzida (a decisão com o resultado e o caminho, a sessão com a data nova), na
// língua do cliente, e nunca da notificação crua nem do número da subtarefa
function copiarCrps(casoId){
  const k = D.casoPorId.get(casoId), blocos = crpsBlocos(k); if(!blocos.length) return;
  const c = D.cliPorId.get(k.cliente_id);
  const nome = c ? (c.nome||"").split(/\s+/)[0] : "";
  const corpo = blocos.map(t=>`• ${fraseClienteCrps(k, t)}`).join("\n");
  const txt = `Olá${nome?", "+nome:""}! Sobre o seu recurso no INSS:\n\n${corpo}\n`
    + `\nQualquer novidade a gente avisa. 🤝`;
  copiar(txt, "Mensagem do recurso copiada");
}

// Um recurso por caso. Quando o caso já tem um número, o segundo NÃO entra
// junto: nasce caso próprio. É o mesmo motivo do ✂️ — protocolo, prazo e
// decisão são de cada recurso, e empilhá-los faz a ficha mentir. Sem esta
// trava, a separação viraria faxina eterna.
// o mesmo campo existe em dois lugares — na aba 🖥 Recurso e em ➕ mais
// informações (é lá que o número é digitado quando a aba ainda nem existe),
// e os dois estão no DOM ao mesmo tempo: sem o id explícito, o
// getElementById pegava sempre o primeiro e o campo de baixo não gravava
async function salvarCrpsNup(casoId, elId, valor){
  const el = document.getElementById(elId || ("crps-nup-"+casoId));
  if(!el && valor==null) return;
  const v = String(valor!=null ? valor : (el.value||"")).replace(/\D/g,"");
  if(!v) return aviso("Digite o número do recurso");
  const k = D.casoPorId.get(casoId);
  const jaTem = crpsNups(k);
  if(jaTem.includes(v)) return aviso("Este recurso já está neste caso");
  // F99 · o segundo recurso ENTRA NO MESMO CASO (decisão do Paulo, 17.09):
  // a aba já mostra um recurso por vez, com menu, e o robô consulta todos os
  // números do caso. Caso próprio continua sendo uma escolha, não a regra.
  if(jaTem.length){
    const {modo} = await perguntarNovoCaso(k, v);
    if(modo==="separado") return criarCasoDoRecurso(k, v);
    if(modo!=="junto") return;
  }
  const nova = [...jaTem, v];
  k.crps_nups = nova; k.crps_nup = null;
  await patchCaso(casoId, {crps_nups:nova, crps_nup:null});
  await andarEtapa(casoId, "🖥 Conselho de Recursos", "recurso com número no e-Sisrec", "recurso protocolado");
  aviso(`Recurso ${jaTem.length?"acrescentado":"vinculado"} ✔ — o robô consulta na próxima rodada`, false);
  abrirFicha(clienteAberto);
}
function perguntarNovoCaso(k, nup){
  return new Promise(resolve=>{
    caixa(`<h3>➕ Mais um recurso neste caso</h3>
      <p class="meio-sub">Este caso já acompanha ${crpsNups(k).length===1?"o recurso":"os recursos"}
        <b style="font-family:var(--f-mono,ui-monospace,Consolas,monospace)">${crpsNups(k).map(n=>esc(formatarNup(n))).join(", ")}</b>.
        O <b style="font-family:var(--f-mono,ui-monospace,Consolas,monospace)">${esc(formatarNup(nup))}</b> pode entrar aqui mesmo, com
        andamento próprio na aba 🖥 Recurso, ou nascer em caso separado do mesmo cliente.</p>
      <div class="form-linha" style="margin-top:10px">
        <button class="btn-rap" onclick="fecharCaixa()">cancelar</button>
        <button class="btn-rap" id="pnc-sep" title="ficha própria, mesmo cliente e mesma fase">caso próprio</button>
        <button class="btn-mini forte" style="margin-left:auto" id="pnc-ok" title="acrescentar a este caso"><span aria-hidden="true">Acrescentar</span><span class="sr-only">acrescentar a este caso</span></button>
      </div>`);
    document.getElementById("pnc-ok").onclick = ()=>{ fecharCaixa(); resolve({modo:"junto"}); };
    document.getElementById("pnc-sep").onclick = ()=>{ fecharCaixa(); resolve({modo:"separado"}); };
    // fechar de qualquer outro jeito conta como desistir
    setTimeout(()=>{ const obs = setInterval(()=>{
      if(!document.getElementById("pnc-ok")){ clearInterval(obs); resolve({modo:null}); }
    }, 250); }, 300);
  });
}
async function criarCasoDoRecurso(k, nup){
  const corpo = {titulo: tituloDoRecurso(k, nup, crpsNups(k).length+1),
                 crps_nups:[nup], crps_nup:null, crps:[]};
  for(const c of CAMPOS_HERDADOS) if(k[c]!==undefined && k[c]!==null) corpo[c]=k[c];
  const [novo] = await api(`/rest/v1/casos`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify(corpo)}).catch(()=>[]);
  if(!novo) return aviso("Não consegui criar o caso");
  for(const cid of (D.atrDoCaso.get(k.id)||[]))
    await api(`/rest/v1/atribuicoes`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({caso_id:novo.id, colaborador_id:cid})}).catch(()=>{});
  await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({caso_id:novo.id, autor_id:eu.id,
      texto:`✂️ Caso aberto para o recurso ${formatarNup(nup)}.`})}).catch(()=>{});
  await carregar(); montarSidebar();
  plim();
  aviso("Caso criado para o novo recurso ✔", false);
  abrirFicha(clienteAberto);
}

// tira um número da lista (e o resultado dele, se já tinha sido consultado)
async function removerCrpsNup(casoId, nup){
  const k = D.casoPorId.get(casoId);
  const nova = crpsNups(k).filter(n=>n!==nup);
  const blocos = crpsBlocos(k).filter(b=>String(b.nup).replace(/\D/g,"")!==nup);
  k.crps_nups = nova; k.crps_nup = null; k.crps = blocos;
  await patchCaso(casoId, {crps_nups:nova, crps_nup:null, crps:blocos});
  aviso("Recurso removido", false);
  abrirFicha(clienteAberto);
}

// o quadro dos movimentos que a extensão colheu no painel do PJe — andamento
// oficial tanto quanto o DataJud, só que mais fresco (chega na hora da coleta)
// F184 · a decisão por trás do movimento: o arquivo e o dispositivo, à vista
function docsDoAndamentoHtml(andId){
  return (D.anexos||[]).filter(x=>x.andamento_id===andId).map(x=>{
    // o trecho "o que foi decidido" é de decisão e laudo; petição, contestação
    // e documento só ganham o botão (o fim de uma petição não é dispositivo)
    const decide = /senten[cç]|decis[aã]|despach|ac[oó]rd[aã]|monocr|laudo|julgad[oa] |homologa|DESPADEC|\bSENT\d|\bACOR\d|\bLAUDO\d|ato ordinat|\bATOORD\d/i.test(x.nome||"")   // F236 · e o ato ordinatório
                   && !/^\s*certid/i.test(x.nome||"");
    const disp = decide ? dispositivoDe(doTribunal(x) ? miolDoAto(x.texto) : x.texto) : "";
    return `<div style="margin:4px 0 6px;padding:6px 9px;border-left:3px solid #BFDCC2;background:#F5FAF6;border-radius:6px">
      <button class="btn-mini" onclick="abrirAnexo('${x.id}')" title="abre o documento guardado (link que vence)">📄 ver ${esc(x.nome||"documento")}</button>
      ${disp ? `<div class="meio-sub" style="margin-top:4px">⚖️ ${esc(disp)}</div>`
        : !x.texto && /pdf/.test(x.tipo||"") ? `<span class="meio-sub">digitalizado, sem texto — abra o PDF</span>` : ""}
    </div>`;
  }).join("");
}
// o movimento como se lê: sem "PJe (1º grau):", sem "— em 08.10.2026 14:23"
// e sem "— ProceComCiv 5000850-63.2023.4.03.6136", que a coleta repete em
// toda linha. A data e a hora do texto são as do movimento no tribunal e
// passam a datar a linha (a hora da coleta não diz nada ao leitor).
const RX_CNJ_FIM = /\s+—\s+(?:[A-Za-zÀ-ÿ]+\s+)?\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\s*$/;
const RX_EM_DATA = /\s+—\s+em\s+(\d{2})[./](\d{2})[./](\d{4})(?:\s+(\d{2}:\d{2}))?/;
function movPjeLimpo(a){
  const t = String((a && a.texto) || "");
  const sis = /^(?:PJe|eproc TJSP|e-SAJ TJSP)\s*\(([^)]+)\)\s*:\s*/.exec(t);
  let s = sis ? t.slice(sis[0].length) : t;
  const em = RX_EM_DATA.exec(s);
  const num = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/.exec(s.match(RX_CNJ_FIM)?.[0] || "");
  s = s.replace(RX_EM_DATA, "").replace(RX_CNJ_FIM, "").trim();
  const chave = /:(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/.exec(String((a && a.origem_id) || ""));
  const q = em ? `${em[3]}-${em[2]}-${em[1]}${em[4]?`T${em[4]}`:""}` : chave ? chave[1] : qSP(a && a.criado_em);
  return { texto: s || t, grau: sis ? sis[1].trim() : null, numero: num ? num[0] : null, q };
}
// O MESMO PADRÃO PARA TODA FONTE (pedido do Paulo, 10.10.2026): a linha diz
// só o que aconteceu. A fonte já está no rótulo; o número do protocolo só
// aparece quando o caso tem mais de um; a data do portal data a linha.
//   "INSS · Movimentação no protocolo 123 — situação: Em análise (portal atualizado em 2026-09-01T10:00:00)."
//     → "Situação: Em análise"
//   "🖥 CRPS · 01/10/2026 — 📥 Protocolo recebido no INSS" → "📥 Protocolo recebido no INSS"
function andLimpo(a, k){
  if(!a) return {texto:"", q:""};
  if(a.origem==="pje"){ const l = movPjeLimpo(a); return {texto:l.texto, q:l.q}; }
  let t = String(a.texto||""), q = qSP(a.criado_em);
  if(a.origem==="crps"){
    const m = /^🖥\s*CRPS\s*·\s*(\d{2})\/(\d{2})\/(\d{4})\s*—\s*/.exec(t);
    if(m){ t = t.slice(m[0].length); q = `${m[3]}-${m[2]}-${m[1]}`; }
    return {texto:t, q};
  }
  if(a.origem!=="pat") return {texto:t, q};
  t = limparHtmlPat(t.replace(/^(INSS|Escritório)\s*·\s*/, ""));
  const port = /\s*\(portal atualizado em (\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})[^)]*\)\.?/.exec(t);
  if(port){ q = `${port[1]}T${port[2]}`; t = t.replace(port[0], ""); }
  const varios = new Set(((k&&k.protocolos)||[]).map(x=>soDig(x)).filter(Boolean)).size > 1;
  t = t.replace(/^Movimentação no protocolo (\d+)\s*—\s*situação:\s*/i, (_, n) => varios ? `Protocolo ${n} · situação: ` : "Situação: ")
       .replace(/^Situação registrada:\s*/i, "Situação: ")
       .replace(/^Protocolo (\d+) juntado/i, (x, n) => varios ? x : "Protocolo juntado");
  return {texto:t.trim(), q};
}
function caixaPje(k, movs){
  if(!movs || !movs.length) return "";
  const limpos = movs.map(a=>({a, l:movPjeLimpo(a)})).sort((x,y)=>x.l.q<y.l.q?1:-1);
  // o número só aparece quando a coleta mistura processos (visão "todos")
  const varios = new Set(limpos.map(x=>soDig(x.l.numero||"")).filter(Boolean)).size > 1;
  // F45 · o mesmo esqueleto da conversa do Escritório
  // F71 · "⚠ não é deste caso": a saída para o movimento intruso (caso real:
  // andamento de um processo caiu na ficha de outro cliente)
  // etapa 3 · no tema a fonte já está no filtro: sem a caixa cinza e sem o rótulo repetido
  return `<div class="${temaV10()?"caixa-pje":"caso"}" style="margin-bottom:10px">
    <div class="rotulo-caso${temaV10()?" sr-so":""}">⚡ coletas do ${nomeDaColeta(movs)} (${movs.length})</div>
    ${tlOficial(limpos.map(({a, l})=>({
      q: l.q, texto: l.texto, and: a,
      // F146 · o sistema de cada movimento sai do número CNJ, não do rótulo da coleta;
      // o grau só aparece quando não é o 1º
      rot: sisCurtoDoMov(a) + (l.grau && !/^1/.test(l.grau) ? ` · ${l.grau}` : "")
        + (varios && l.numero ? ` · ${rotuloProcesso(k, processosDoCaso(k).find(x=>soDig(x.numero)===soDig(l.numero)) || {numero:l.numero})}` : ""),
      em: temaV10() ? iconeFonte({"PJe":"pje","e-SAJ":"esaj","eproc":"eproc"}[sisCurtoDoMov(a)]) : "⚖️",
      html: temaV10() ? "" : `${docsDoAndamentoHtml(a.id)}${seguimentoHtml((D._andsFicha||[]).filter(x=>x.responde_a===a.id), tarefasDe)}<span style="margin-left:6px;vertical-align:middle">${segBtnHtml(segRegistrar(k.id, a.texto||"", a.id))}
        <button class="btn-mini" onclick="pjeForaDoCaso('${a.id}','${k.id}')"
          title="movimento de outro processo que caiu aqui por engano — remove e aponta a causa"><span aria-hidden="true">⚠ Desvincular</span><span class="sr-only">⚠ não é deste caso</span></button></span>`
    })))}</div>`;
}
// F71 · remove o movimento intruso e DIAGNOSTICA: a coleta casa pelo número
// do processo gravado no caso — se o número do movimento estiver na ficha, é
// ELE que precisa sair (senão a próxima coleta traz o intruso de volta)
async function pjeForaDoCaso(andId, casoId){
  const a=(D._andsFicha||[]).find(x=>x.id===andId); if(!a) return;
  if(!await confirmar("Remover este movimento do caso?")) return;
  await api(`/rest/v1/andamentos?id=eq.${andId}`,{method:"DELETE"}).catch(()=>{});
  D._andsFicha=D._andsFicha.filter(x=>x.id!==andId);
  const k=D.casoPorId.get(casoId);
  const mNum=/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/.exec(a.texto||"");
  const naFicha = mNum && k && processosDoCaso(k).some(p=>soDig(p.numero)===soDig(mNum[0]));
  aviso(naFicha
    ? `⚠ Removido — mas o processo ${mNum[0]} está GRAVADO neste caso, e é por ele que a coleta cai aqui. Se não for deste caso, tire o número em ➕ mais informações → Processo, senão o movimento volta na próxima coleta.`
    : "Movimento removido do caso.");
  repintarFicha();
}

// ── UM CASO, VÁRIOS PROCESSOS ────────────────────────────────────────────
// O caso tem um ponto de partida (protocolo/NB) e dali ramifica: mandado de
// segurança, ação pelo rito comum, recurso. `casos.processos` é a lista;
// `casos.processo` é o principal (o que o DataJud consulta e a busca acha).
// Cada item pode ser marcado como NÃO NOSSO — processo que o cliente teve com
// outro advogado, que interessa acompanhar mas não é trabalho do escritório.
function processosDoCaso(k){
  const lista = Array.isArray(k.processos) ? k.processos.slice() : [];
  const norm = p => (typeof p === "string" ? {numero:p} : {...p});
  const out = lista.map(norm).filter(p=>soDig(p.numero));
  const prin = soDig(k.processo);
  if(prin && !out.some(p=>soDig(p.numero)===prin))
    out.unshift({numero:k.processo, nosso:true});
  return out.map(p=>{
    const principal = soDig(p.numero)===prin;
    // F156 · o PAPEL do processo no caso: ação (rito comum ou JEF), mandado de
    // segurança ou cumprimento de sentença. Quem escolhe é o escritório; sem
    // escolha, vale o que a classe do processo diz.
    const papelFixo = PAPEIS_PROCESSO[p.papel] ? p.papel : null;
    const classe = p.rotulo || (datajudDe(k, p.numero)||{}).classe || p.classe || (principal ? k.classe_judicial : "");
    return {
      numero: p.numero,
      rotulo: p.rotulo || "",
      nosso: p.nosso !== false,
      acompanhar: p.acompanhar !== false,
      principal,
      papelFixo,
      papel: papelFixo || papelDaClasse(classe),
      ...(p.classe?{classe:p.classe}:{}), ...(p.orgao?{orgao:p.orgao}:{}), ...(p.ajuizado?{ajuizado:p.ajuizado}:{}),
    };
  });
}
const PAPEIS_PROCESSO = {
  acao:        {curto:"Ação",        nome:"Ação",                    dica:"ação pelo rito comum ou no JEF"},
  ms:          {curto:"MS",          nome:"Mandado de segurança",    dica:"mandado de segurança"},
  cumprimento: {curto:"Cumprimento", nome:"Cumprimento de sentença", dica:"cumprimento de sentença, inclusive RPV e precatório"},
};
function papelDaClasse(txt){
  const b = dsa(txt);
  if(/mandado de seguranca|msciv/.test(b)) return "ms";
  if(/cumprimento|cumsen|execucao contra a fazenda|precatorio|requisicao de pequeno valor|\brpv\b/.test(b)) return "cumprimento";
  return "acao";
}
// o andamento oficial daquele número: o mapa por processo quando existe,
// senão o `datajud` de sempre (que é o do principal)
function datajudDe(k, numero){
  const d = k.datajud_multi || {};
  const achado = d[soDig(numero)];
  if(achado) return achado;
  return soDig(numero)===soDig(k.processo) ? (k.datajud||null) : null;
}
function rotuloProcesso(k, p){
  const t = datajudDe(k, p.numero) || {};
  const cls = p.papelFixo && p.papelFixo!=="acao" ? PAPEIS_PROCESSO[p.papelFixo].nome
    : (p.rotulo || t.classe || p.classe || (k.classe_judicial && p.principal ? k.classe_judicial : ""));
  return (cls ? classeCurta(cls)+" · " : "") + fmtProc(p.numero);
}
// "MSCiv" -> "Mandado de Segurança"; o resto fica como veio
function classeCurta(c){
  const s = String(c||"");
  if(/^MSCiv/i.test(s)) return "Mandado de Segurança";
  if(/^PJEC|JEC/i.test(s)) return "JEF";
  if(/ProceComCiv|Procedimento Comum/i.test(s)) return "Rito comum";
  if(/^ApCiv|Apela/i.test(s)) return "Apelação";
  if(/^RecInoCiv|Inomin/i.test(s)) return "Recurso inominado";
  return s;
}
const fmtProc = n => {
  const d = soDig(n);
  return d.length===20
    ? `${d.slice(0,7)}-${d.slice(7,9)}.${d.slice(9,13)}.${d.slice(13,14)}.${d.slice(14,16)}.${d.slice(16)}`
    : (n||"");
};
async function salvarProcessos(casoId, lista, principalNum){
  const k = D.casoPorId.get(casoId); if(!k) return false;
  await casoInteiro(k);   // F379
  // o principal é o que o DataJud consulta e a busca do CRM encontra. F156 ·
  // ele só muda quando alguém escolhe outro, ou quando deixa de ser nosso ou
  // de ser acompanhado; aí passa ao primeiro número nosso e acompanhado
  const apto = p => p.nosso!==false && p.acompanhar!==false;
  const atual = soDig(k.processo);
  const prin = (principalNum && lista.find(p=>soDig(p.numero)===soDig(principalNum)))
    || lista.find(p=>soDig(p.numero)===atual && apto(p))
    || lista.find(apto) || lista[0];
  const novo = prin ? prin.numero : null;
  const guardar = lista.map(p=>({numero:p.numero, nosso:p.nosso!==false, acompanhar:p.acompanhar!==false,
    ...(p.rotulo?{rotulo:p.rotulo}:{}), ...(p.papelFixo?{papel:p.papelFixo}:{}),
    ...(p.classe?{classe:p.classe}:{}), ...(p.orgao?{orgao:p.orgao}:{}), ...(p.ajuizado?{ajuizado:p.ajuizado}:{})}));
  const mudar = {processos:guardar, processo:novo};
  if(atual && soDig(novo)!==atual){
    // classe, órgão e ajuizamento da ficha são do principal: os do antigo
    // passam a morar no número dele, e os do novo vêm do número dele ou,
    // na falta, da próxima consulta do CNJ
    const velho = guardar.find(p=>soDig(p.numero)===atual);
    if(velho){
      if(k.classe_judicial) velho.classe = k.classe_judicial;
      if(k.orgao_judicial) velho.orgao = k.orgao_judicial;
      if(k.ajuizado_em) velho.ajuizado = k.ajuizado_em;
    }
    const nv = guardar.find(p=>soDig(p.numero)===soDig(novo)) || {};
    Object.assign(mudar, {classe_judicial:nv.classe||null, orgao_judicial:nv.orgao||null,
      ajuizado_em:nv.ajuizado||null, datajud:(k.datajud_multi||{})[soDig(novo)]||null});
  }
  const antes = {}; Object.keys(mudar).forEach(c=>antes[c]=k[c]);
  Object.assign(k, mudar);
  try{
    await patchCaso(casoId, mudar);
  }catch(e){
    Object.assign(k, antes);
    aviso("Rode o crm/fase2/schema_por_em_dia.sql no Supabase — falta a coluna 'processos'");
    return false;
  }
  repintarFicha();
  return true;
}
async function tornarPrincipal(casoId, numero){
  const k = D.casoPorId.get(casoId); if(!k) return;
  if(await salvarProcessos(casoId, processosDoCaso(k), numero))
    aviso(`${fmtProc(numero)} passou a ser o processo principal do caso`, false);
}
async function mudarPapelProcesso(casoId, numero, papel){
  const k = D.casoPorId.get(casoId); if(!k || !PAPEIS_PROCESSO[papel]) return;
  await salvarProcessos(casoId, processosDoCaso(k).map(p=>
    soDig(p.numero)===soDig(numero) ? {...p, papelFixo:papel} : p));
}
async function acrescentarProcesso(casoId, valor){
  const inp = document.getElementById("proc-novo-"+casoId) || {value:""};
  const n = String(valor!=null ? valor : (inp.value||"")).trim(); if(!soDig(n)) return;
  if(soDig(n).length!==20) return aviso("O número do processo (CNJ) tem 20 dígitos");
  const k = D.casoPorId.get(casoId); if(!k) return;
  const lista = processosDoCaso(k);
  if(lista.some(p=>soDig(p.numero)===soDig(n))) return aviso("Esse processo já está no caso");
  inp.value="";
  await salvarProcessos(casoId, [...lista, {numero:fmtProc(n), nosso:true, acompanhar:true}]);
  if(!await andarEtapa(casoId, "👪 Judicial", "processo acrescentado, o DataJud consulta na próxima rodada", "ação distribuída"))
    aviso("Processo acrescentado — o DataJud consulta na próxima rodada", false);
}
async function alternarNossoProcesso(casoId, numero){
  const k = D.casoPorId.get(casoId); if(!k) return;
  await salvarProcessos(casoId, processosDoCaso(k).map(p=>
    soDig(p.numero)===soDig(numero) ? {...p, nosso:!p.nosso} : p));
}
async function removerProcesso(casoId, numero){
  const k = D.casoPorId.get(casoId); if(!k) return;
  if(!await confirmar(`Tirar o processo ${fmtProc(numero)} deste caso?\n\nOs andamentos já gravados continuam no histórico.`)) return;
  await salvarProcessos(casoId, processosDoCaso(k).filter(p=>soDig(p.numero)!==soDig(numero)));
}
// o quadro de gerência, nos moldes do que a aba 🖥 Recurso já faz com os NUPs
function gerenciaProcessos(k){
  const ps = processosDoCaso(k);
  return `<div class="caso">
    <div class="rotulo-caso">processos judiciais deste caso (${ps.length})</div>
    ${ps.map(p=>`<div class="proc-item"><div class="proc-l1">
      <span class="chip neutro" style="font-family:var(--f-mono,ui-monospace,Consolas,monospace)">${esc(fmtProc(p.numero))}</span>
      ${p.principal?`<span class="chip ben" title="é por ele que o DataJud consulta e a busca encontra">principal</span>`
        : (p.nosso && p.acompanhar ? `<button class="btn-mini" onclick="tornarPrincipal('${k.id}','${esc(p.numero)}')"
             title="passar a ser o processo que o DataJud consulta e a busca encontra"><span aria-hidden="true">Principal</span><span class="sr-only">tornar principal</span></button>` : "")}
</div><div class="proc-l2">
      <span class="papel-proc" role="group" aria-label="papel do processo no caso"
        title="${p.papelFixo?"papel escolhido pelo escritório":"papel lido da classe do processo, até alguém escolher"}">${
        Object.entries(PAPEIS_PROCESSO).map(([v,x])=>`<button class="${p.papel===v?"on":""}" aria-pressed="${p.papel===v}"
          onclick="mudarPapelProcesso('${k.id}','${esc(p.numero)}','${v}')" title="${esc(x.dica)}">${x.curto}</button>`).join("")}</span>
      ${p.nosso
        ? `<button class="btn-mini" onclick="alternarNossoProcesso('${k.id}','${esc(p.numero)}')"
             title="marcar como processo que NÃO é do escritório — fica só para acompanhar">🔭 não é nosso</button>`
        : `<span class="chip neutro" title="processo do cliente com outro advogado — acompanhamos, não trabalhamos nele">🔭 só acompanho</span>
           <button class="btn-mini" onclick="alternarNossoProcesso('${k.id}','${esc(p.numero)}')">é nosso</button>`}
      <button class="btn-mini" onclick="removerProcesso('${k.id}','${esc(p.numero)}')" title="tirar este processo do caso">✕</button>
    </div>${(nb=>nb ? `<div class="proc-l3">${nb}</div>` : "")(chipNbNumero(k, "proc", soDig(p.numero)) + selLevarNumero(k, "proc", soDig(p.numero)))}</div>`).join("") || `<p class="meio-sub">Nenhum processo judicial neste caso.</p>`}
    <div class="form-linha" style="margin-top:8px">
      <input id="proc-novo-${k.id}" placeholder="＋ número do processo (CNJ), 20 dígitos" style="flex:1"
        onkeydown="if(event.key==='Enter')acrescentarProcesso('${k.id}')">
      <button class="btn-mini" onclick="acrescentarProcesso('${k.id}')">adicionar</button>
    </div>
    <p class="meio-sub" style="margin-top:6px">Um caso pode ter ação, mandado de segurança e
      cumprimento de sentença, cada um com seu andamento. Escolha o papel de cada número e qual deles é o
      principal. O que <b>não é do escritório</b> fica marcado 🔭 e continua sendo acompanhado.</p>
  </div>`;
}

// os movimentos do PJe DAQUELE processo: o texto da coleta traz o número no
// fim ("… — MSCiv 5000469-84.2025.4.03.6136"). O que não disser de qual
// processo é fica com o principal, que é de onde ele veio.
function pjeDoProcesso(ands, numero, ehPrincipal){
  const movs = andamentosPje(ands);
  const d = soDig(numero);
  const comNumero = movs.filter(a=>/\d{15,}/.test(soDig(a.texto||"")));
  const meus = movs.filter(a=>soDig(a.texto||"").includes(d));
  if(meus.length) return meus;
  return ehPrincipal ? movs.filter(a=>!comNumero.includes(a)) : [];
}

// F103 · TODOS OS PROCESSOS JUNTOS: a visão padrão do caso com mais de um
// processo judicial — coleta do PJe e histórico oficial de todos, em ordem
// de data, cada linha dizendo de qual processo é. Um por vez fica no sub-menu.
function painelCNJTodos(k, ands, cabec){
  const ps = processosDoCaso(k);
  const pjeMovs = andamentosPje(ands);
  const ofic = ps.map(p=>({p, t:datajudDe(k, p.numero)})).filter(x=>x.t && (x.t.ultimo || (x.t.instancias||[]).length));
  const temPje = pjeMovs.length>0, temOficial = ofic.length>0;
  const temDocs = docsDaOrigem(k, DOCS_JUDICIAIS).length > 0;
  const fonte = fonteCnj==="docs" && temDocs ? "docs" : temPje ? (fonteCnj==="oficial" && temOficial ? "oficial" : "pje") : "oficial";
  const menuFonte = (temPje || temOficial || temDocs) ? `<div class="sub-menu fontes" style="width:100%">
    ${temPje?`<button class="${fonte==="pje"?"on":""}" onclick="fonteCnj='pje';repintarFicha()">${temaV10()?"":"⚡ "}Coleta do ${nomeDaColeta(pjeMovs)} (${pjeMovs.length})</button>`:""}
    ${temOficial?`<button class="${fonte==="oficial"?"on":""}" onclick="fonteCnj='oficial';repintarFicha()">${temaV10()?"":"⚖️ "}Coleta oficial (CNJ)</button>`:""}
    ${botaoDocs(k, DOCS_JUDICIAIS, fonte==="docs", "fonteCnj='docs';repintarFicha()")}
  </div>` : "";
  if(fonte==="docs") return `${cabec}${menuFonte}${painelDocumentos(k, DOCS_JUDICIAIS)}${gerenciaProcessos(k)}`;
  if(fonte==="pje") return `${cabec}${menuFonte}${caixaPje(k, pjeMovs)}${gerenciaProcessos(k)}`;
  if(!temOficial) return `${cabec}${menuFonte}<div class="caso"><p class="meio-sub">Sem andamento oficial para estes processos na base do CNJ.</p></div>${gerenciaProcessos(k)}`;
  const itens = ofic.flatMap(({p, t}) => cnjInstancias(k, t).flatMap(inst => (inst.historico||[]).map(m => {
    const txt = (m.nome||"")+(m.complemento?` — ${m.complemento}`:"");
    const ch = chaveSinalCnj(inst.rotulo, m), s = sinalCnj(k, ch);
    return { q: m.data||"", em: "⚖️", forte: !!m.decisao, texto: txt,
      rot: `CNJ · ${rotuloProcesso(k, p)}${inst.rotulo&&cnjInstancias(k, t).length>1?` · ${inst.rotulo}`:""}`,
      cls: `${s.importante?"tl-imp":""}${s.urgente?" tl-urg":""}`,
      ofic: temaV10() ? oficCnj(k, txt, m, ch) : null,
      html: temaV10() ? "" : `${m.claro?`<span class="meio-sub" style="display:block">${esc(m.claro)}</span>`:""}
        <span style="margin-left:6px;vertical-align:middle">${segBtnHtml(segRegistrar(k.id, txt, null))}</span>
        ${sinaisCnjHtml(k, ch, txt, m.data||"")}` };
  })));
  itens.sort((a,b)=>a.q<b.q?1:-1);
  return `${cabec}${menuFonte}<div class="caso">
    <div class="rotulo-caso">histórico oficial · ${ps.length} processos juntos</div>
    ${tlOficial(itens, "Sem movimentos.")}
  </div>${gerenciaProcessos(k)}`;
}
function painelCNJ(k, ands){
  const ps = processosDoCaso(k);
  const comp = composerNoPainel(k) + avisoNumeroFora(k, "proc");
  // F103 · com mais de um processo e nenhum escolhido, a visão é a de todos
  const juntos = ps.length>1 && !ps.some(x=>soDig(x.numero)===soDig(procSel));
  // qual processo está sendo olhado: o escolhido, senão o principal
  const p = ps.find(x=>soDig(x.numero)===soDig(procSel)) || ps.find(x=>x.principal) || ps[0] || null;
  const numero = p ? p.numero : k.processo;
  const t = p ? datajudDe(k, numero) : k.datajud;
  // F54 · caso com UM processo na lista e nenhum "principal" marcado: esse um
  // É o principal de fato — a coleta do PJe sem número no texto casa com ele
  // (era o buraco que escondia a tela do PJe, relatado pelo Paulo)
  const pjeMovs = pjeDoProcesso(ands, numero, !p || p.principal || ps.length===1);
  const temPje = pjeMovs.length > 0;
  const temOficial = !!(t && (t.ultimo || (t.instancias||[]).length));
  // com mais de um processo, escolher vem ANTES de ler
  const menuProc = ps.length>1 ? `<div class="sub-menu instancias" style="width:100%">
    <button class="${juntos?"on":""}" onclick="procSel='';instSel=0;repintarFicha()" title="os andamentos de todos os processos, juntos">Todos os processos</button>
    ${ps.map(x=>`<button class="${!juntos&&soDig(x.numero)===soDig(numero)?"on":""}"
      onclick="procSel='${esc(x.numero)}';instSel=0;repintarFicha()"
      title="${x.nosso?"processo do escritório":"processo do cliente com outro advogado — só acompanhamos"}">
      ${x.nosso?"":"🔭 "}${esc(rotuloProcesso(k,x))}</button>`).join("")}
  </div>` : "";
  if(juntos) return comp + painelCNJTodos(k, ands, `<div class="form-linha" style="justify-content:flex-end;margin-bottom:6px">${botaoFaseAba(k, "cnj")}</div>` + menuProc);
  // duas fontes, dois botões — nunca mais uma lista embaixo da outra.
  // F71 · a Coleta do PJe vem PRIMEIRO e é a fonte padrão (pedido do Paulo);
  // o menu aparece sempre que houver qualquer fonte, no topo dos andamentos
  const temDocs = docsDaOrigem(k, DOCS_JUDICIAIS).length > 0;
  const fonte = fonteCnj==="docs" && temDocs ? "docs" : temPje ? (fonteCnj==="oficial" && temOficial ? "oficial" : "pje") : "oficial";
  const menuFonte = (temPje || temOficial || temDocs) ? `<div class="sub-menu fontes" style="width:100%">
    ${temPje?`<button class="${fonte==="pje"?"on":""}" onclick="fonteCnj='pje';repintarFicha()"
      title="o que a extensão trouxe do tribunal na sua sessão">${temaV10()?"":"⚡ "}Coleta do ${nomeDaColeta(pjeMovs)} (${pjeMovs.length})</button>`:""}
    ${temOficial?`<button class="${fonte==="oficial"?"on":""}" onclick="fonteCnj='oficial';repintarFicha()"
      title="consulta pública do CNJ (DataJud), atualizada todo dia útil">${temaV10()?"":"⚖️ "}Coleta oficial (CNJ)</button>`:""}
    ${botaoDocs(k, DOCS_JUDICIAIS, fonte==="docs", "fonteCnj='docs';repintarFicha()")}
    ${temaV10()?`<span class="fontes-fim">${botaoFaseAba(k, "cnj")}</span>`:""}
  </div>` : "";
  // etapa 3 · no tema, o "fase encerrada" mora na linha das fontes: uma linha a menos
  const barraFase = temaV10() && menuFonte ? "" : `<div class="form-linha" style="justify-content:flex-end;margin-bottom:6px">
    ${botaoFaseAba(k, "cnj")}</div>`;
  const cabec = barraFase + menuProc + menuFonte;
  const pjeBox = fonte==="pje" ? caixaPje(k, pjeMovs) : "";
  if(fonte==="docs")
    return comp + `${cabec}${painelDocumentos(k, DOCS_JUDICIAIS)}${gerenciaProcessos(k)}`;
  if(fonte==="pje")
    return comp + `${cabec}${pjeBox}${gerenciaProcessos(k)}`;
  // judicial sem número: a aba existe justamente para dizer o que falta
  if(!soDig(numero) && !temOficial)
    return comp + `${cabec}<div class="caso"><p class="meio-sub">Este caso ainda não tem o número do processo.
      Preencha <b>Processo (CNJ)</b> no quadro acima (lápis ✎) ou acrescente abaixo — com ele, o DataJud
      consulta todo dia útil e o coletor do PJe passa a casar o processo sozinho.</p></div>${gerenciaProcessos(k)}`;
  if(!temOficial)
    return comp + `${cabec}<div class="caso">${consultaPendente(k) || `<p class="meio-sub">Sem andamento oficial para este processo na base do CNJ.</p>`}</div>${gerenciaProcessos(k)}`;
  const insts = cnjInstancias(k, t);
  const i = Math.min(instSel, insts.length-1), inst = insts[i];
  const u = inst.ultimo || {};
  return comp + `${cabec}${previsaoBox(k)}
  ${insts.length>1?`<div class="sub-menu instancias">
    ${insts.map((x,n)=>`<button class="${n===i?"on":""}" onclick="instSel=${n};repintarFicha()">${esc(x.rotulo||"instância")}${arqInfo(k,chaveCnj(x,n))?" 🗄":""}
      <small>${x.ultimo&&x.ultimo.data?fmt(x.ultimo.data):"—"}</small></button>`).join("")}
  </div>`:""}
  <div class="caso" style="margin-bottom:10px">
    <div style="display:flex;align-items:center;gap:8px">
      <div class="rotulo-caso" style="flex:1">${esc(inst.rotulo||"")} · ${esc(tituloOrgao(inst.orgao)||"órgão julgador")}${inst.classe?` · ${esc(inst.classe)}`:""}</div>
      ${/* arquivar é DESTA instância: 1º grau baixado não arquiva o TRF3 —
           a aba só se marca quando todas as instâncias estiverem */""}
      ${seloArquivo(k, chaveCnj(inst, i))}
    </div>
    <div style="margin-top:6px;font-size:14px">
      <b>Último andamento:</b> ${esc(u.nome||"—")}${u.complemento?` (${esc(u.complemento)})`:""}
      em <b>${u.data?fmt(u.data):"—"}</b>
    </div>
    ${u.claro?`<div class="meio-sub" style="margin-top:2px">💡 ${esc(u.claro)}</div>`:""}
    ${inst.decisao?`<div style="margin-top:8px;padding:7px 10px;border-radius:8px;background:#EDF6EE;border:1px solid #BFDCC2;font-size:13px">
      ⚖️ <b>Última decisão:</b> ${esc(inst.decisao.nome||"")} em <b>${fmt(inst.decisao.data)}</b>
      ${inst.decisao.claro?`<div class="meio-sub" style="margin-top:2px">${esc(inst.decisao.claro)}</div>`:""}
    </div>`:""}
    <div class="form-linha" style="margin-top:8px">
      <button class="${temaV10()?"tl-bt":"btn-mini"}" onclick="copiarDatajud('${k.id}')" title="a situação do processo inteiro, pronta para o cliente">${temaV10()?"":"💬 "}<span aria-hidden="true">Situação</span><span class="sr-only">Copiar situação para o cliente</span></button>
      ${botoesPjeDoCaso(k, "btn-mini")}
      <span class="meio-sub">consulta de ${fmt(t.consultado_em)}${inst.ajuizado_em?` · ajuizado em ${fmt(inst.ajuizado_em)}`:""}</span>
    </div>
  </div>
  ${marcoCaso(k)}
  ${inssFilaCaso(k)}
  <div class="caso">
    <div class="rotulo-caso">histórico oficial ${inst.total_movimentos?`(${(inst.historico||[]).length} de ${inst.total_movimentos} movimentos)`:""}</div>
    ${/* F45 · o mesmo esqueleto da conversa do Escritório */""}
    ${tlOficial((inst.historico||[]).map(m=>{
      const txt = (m.nome||"")+(m.complemento?` — ${m.complemento}`:"");
      const ch = chaveSinalCnj(inst.rotulo, m), s = sinalCnj(k, ch);
      return {
      q: m.data||"", em: "⚖️", rot: "CNJ", forte: !!m.decisao, texto: txt,
      cls: `${s.importante?"tl-imp":""}${s.urgente?" tl-urg":""}`,
      ofic: temaV10() ? oficCnj(k, txt, m, ch) : null,
      html: temaV10() ? "" : `${m.claro?`<span class="meio-sub" style="display:block">${esc(m.claro)}</span>`:""}
        <span style="margin-left:6px;vertical-align:middle">${segBtnHtml(segRegistrar(k.id, txt, null))}</span>
        ${sinaisCnjHtml(k, ch, txt, m.data||"")}` };
    }), "Sem movimentos.")}
  </div>
  ${gerenciaProcessos(k)}`;
}

// A previsão é informação NOSSA, não do tribunal: fica num quadrado à parte,
// com fundo próprio, para ninguém confundir com andamento oficial.
function previsaoBox(k){
  const t=k.trf3;
  if(!t || !t.ordem) return "";
  const p=t.projecao;
  const total=t.total?` de <b>${Number(t.total).toLocaleString(IDIOMA)}</b>`:"";
  return `<div class="previsao-box">
    <div class="rotulo-caso" style="color:#7A5A00">nossa estimativa — não é dado do tribunal</div>
    ${p?`<div style="font-size:15px;margin-top:2px">📈 <b>Previsão de julgamento: ~${esc(mesAno(p.previsao))}</b></div>`:""}
    <div style="font-size:13px;margin-top:3px">⚖️ Posição <b>${t.ordem}º</b>${total} na fila de ${esc(t.orgao||"")}${t.turma?` (${esc(t.turma)})`:""}${t.prioridade==="S"?` <span class="chip ben">⚡ prioridade</span>`:""}</div>
    ${p?`<div class="meio-sub" style="margin-top:2px">${p.metodo==="producao"
        ? `o órgão julgou ${Number(p.julgados_ano||0).toLocaleString(IDIOMA)} processos no último ano fechado (~${p.ritmo_mes}/mês, painel Justiça em Números do CNJ)`
        : `ritmo observado de ~${p.ritmo_mes} posições/mês nos últimos ${p.base_dias} dias`}</div>`:""}
    ${p&&p.dias_medios?`<div class="meio-sub">⏱️ tempo médio de julgamento neste órgão: ${p.dias_medios} dias (indicador oficial do CNJ)</div>`:""}
    <div class="form-linha" style="margin-top:6px">
      <button class="${temaV10()?"tl-bt":"btn-mini"}" onclick="copiarTrf3('${k.id}')" title="Copiar posição na fila">${temaV10()?"":"💬 "}<span aria-hidden="true">Fila</span><span class="sr-only">Copiar posição na fila</span></button>
      ${p?`<button class="btn-mini" onclick="copiarPrevisao('${k.id}')" title="📈 copiar previsão estimada"><span aria-hidden="true">📈 Previsão</span><span class="sr-only">📈 copiar previsão estimada</span></button>`:""}
    </div>
  </div>`;
}

// Marcos financeiros do processo (do mais adiantado para o menos): é o que o
// cliente mais pergunta — e, para nós, a hora de cobrar os honorários.
const MARCOS_ORDEM=[
  ["pago","💵","Pagamento registrado nos autos"],
  ["alvara","🏦","Alvará de levantamento expedido — o valor já pode ser sacado"],
  ["requisitorio","💰","Requisitório expedido (precatório/RPV) — pagamento requisitado"],
  ["transito","⚖️","Trânsito em julgado — não cabe mais recurso"]];
function marcoDoCaso(k){
  const mc=(k.datajud||{}).marcos||{};
  for(const [chave,ico,rotulo] of MARCOS_ORDEM){
    const m=mc[chave];
    if(m && m.data) return {chave,ico,rotulo,data:m.data,nome:m.nome};
  }
  return null;
}
function marcoCaso(k){
  const m=marcoDoCaso(k);
  if(!m) return "";
  // requisitório/alvará/pagamento em processo que ainda não está na fase de
  // honorários: lembrete visual de que há o que cobrar
  const cobrar = m.chave!=="transito" && k.fase!=="pagamento" && k.fase!=="encerrado";
  return `<div style="margin-top:8px;padding:8px 10px;border-radius:8px;background:#EDF6EE;border:1px solid #BFDCC2;font-size:13px">
    ${m.ico} <b>${esc(m.rotulo)}</b> em <b>${fmt(m.data)}</b>
    <span class="meio-sub">(movimento oficial “${esc(m.nome||"")}”)</span>
    ${cobrar?`<span class="chip urg" style="background:#FFF4D6;color:#8A6100;border-color:#E9B44C">💰 honorários a cobrar</span>`:""}
    <div style="margin-top:4px">
      <button class="${temaV10()?"tl-bt":"btn-mini"}" onclick="copiarMarco('${k.id}')" title="Copiar situação para o cliente">${temaV10()?"":"💬 "}<span aria-hidden="true">Situação</span><span class="sr-only">Copiar situação para o cliente</span></button>
      ${cobrar?`<button class="btn-mini" onclick="moverFase('${k.id}','pagamento')" title="💰 mover para Pagamentos"><span aria-hidden="true">💰 Pagamentos</span><span class="sr-only">💰 mover para Pagamentos</span></button>`:""}
    </div>
  </div>`;
}
function copiarMarco(casoId){
  const k=D.casoPorId.get(casoId); const m=marcoDoCaso(k); if(!m) return;
  const t=k.datajud||{};
  const dbr=i=>i?`${i.slice(8,10)}/${i.slice(5,7)}/${i.slice(0,4)}`:"";
  const TXT={pago:"o pagamento do débito foi registrado nos autos",
    alvara:"foi expedido o alvará de levantamento — o valor já pode ser sacado",
    requisitorio:"foi expedido o requisitório de pagamento (precatório/RPV)",
    transito:"o processo transitou em julgado, ou seja, não cabe mais recurso"};
  const msg=`No processo nº ${t.processo}, ${TXT[m.chave]}, em ${dbr(m.data)} `+
    `(movimento oficial “${m.nome||""}”). Fonte: base pública do CNJ (DataJud), `+
    `consulta de ${dbr(t.consultado_em)}.`;
  copiar(msg,"Mensagem do marco do processo copiada 💬");
}

function copiarDatajud(casoId){
  const k=D.casoPorId.get(casoId); const t=k&&k.datajud, u=t&&t.ultimo;
  if(!u||!u.data) return;
  const dbr=i=>i?`${i.slice(8,10)}/${i.slice(5,7)}/${i.slice(0,4)}`:"";
  const msg=`O processo nº ${t.processo} teve como último andamento oficial “${u.nome||"movimentação"}`+
    (u.complemento?` (${u.complemento})`:"")+`”, em ${dbr(u.data)}.`+
    (u.claro?` ${u.claro}`:"")+
    (t.orgao?` O processo está em ${tituloOrgao(t.orgao)}.`:"")+
    ` Fonte: base pública do CNJ (DataJud), consulta de ${dbr(t.consultado_em)}.`;
  copiar(msg,"Mensagem do andamento oficial copiada 💬");
}

// Previsão pelo ritmo REAL da fila deste processo (histórico das consultas).
// É estimativa nossa — a tela e a mensagem dizem isso com todas as letras.
const MESES_PT=["janeiro","fevereiro","março","abril","maio","junho","julho",
  "agosto","setembro","outubro","novembro","dezembro"];
function mesAno(iso){
  const d=new Date(iso+"T12:00:00");
  return `${MESES_PT[d.getMonth()]} de ${d.getFullYear()}`;
}
function projecaoTrf3(t){
  const p=t.projecao; if(!p) return "";
  const base = p.metodo==="producao"
    ? `o gabinete julgou ${Number(p.julgados_ano||0).toLocaleString(IDIOMA)} processos no último ano fechado (~${p.ritmo_mes}/mês, painel Justiça em Números do CNJ)`
    : `ritmo observado de ~${p.ritmo_mes} posições/mês nos últimos ${p.base_dias} dias`;
  const media = p.dias_medios
    ? `<div style="margin-top:2px">⏱️ <b>Tempo médio de julgamento neste órgão:</b> ${p.dias_medios} dias <span class="meio-sub">(indicador oficial do CNJ)</span></div>` : "";
  return `<div style="margin-top:4px">📈 <b>Previsão estimada:</b> ~${esc(mesAno(p.previsao))}
    <span class="meio-sub">(${esc(base)} — estimativa nossa, não é data designada pelo tribunal)</span></div>${media}`;
}
function copiarPrevisao(casoId){
  const k=D.casoPorId.get(casoId); const t=k&&k.trf3, p=t&&t.projecao; if(!p) return;
  let msg;
  if(p.metodo==="producao"){
    msg=`Segundo o painel Justiça em Números do CNJ, o órgão responsável julgou `+
      `${Number(p.julgados_ano||0).toLocaleString(IDIOMA)} processos no último ano fechado — cerca de `+
      `${p.ritmo_mes} por mês`+
      (p.dias_medios?`, e o tempo médio entre a distribuição e o julgamento nesse órgão é de ${p.dias_medios} dias`:"")+
      `. Na posição em que o processo está hoje, e mantido esse ritmo, a previsão ESTIMADA de `+
      `julgamento fica em torno de ${mesAno(p.previsao)}. Trata-se de estimativa feita a partir `+
      `de dados públicos do CNJ e do TRF3, e não de data designada pelo tribunal.`;
  } else {
    msg=`Nos últimos ${p.base_dias} dias o processo subiu na fila a um ritmo de cerca de `+
      `${p.ritmo_mes} posições por mês. Mantido esse ritmo, a previsão ESTIMADA de julgamento `+
      `fica em torno de ${mesAno(p.previsao)}. Trata-se de estimativa feita a partir do painel `+
      `público do TRF3, e não de data designada pelo tribunal.`;
  }
  copiar(msg,"Mensagem da previsão estimada copiada 📈");
}
function copiarTrf3(casoId){
  const k=D.casoPorId.get(casoId); const t=k&&k.trf3; if(!t||!t.ordem) return;
  const dbr=iso=>iso?`${iso.slice(8,10)}/${iso.slice(5,7)}/${iso.slice(0,4)}`:"";
  const msg=`O processo nº ${t.processo} aguarda julgamento no TRF3 e hoje ocupa a posição ${t.ordem}`+
    (t.total?` de uma fila de ${t.total} processos`:"")+
    ` na ordem de julgamento do órgão responsável — ${t.orgao||"órgão julgador"}`+
    (t.turma?` (${t.turma})`:"")+`.`+
    (t.fase_desde?` Está concluso para julgamento desde ${dbr(t.fase_desde)}.`:"")+
    (t.prioridade==="S"?" O processo tramita com prioridade.":"")+
    ` Fonte: painel público de estatísticas do TRF3 (consulta de ${dbr(t.consultado_em)}).`;
  copiar(msg,"Mensagem da ordem de julgamento copiada 💬");
}
// F373 · a ⭐ do canto da ficha (pedido do Paulo, 02.11.2026): um clique marca ou desmarca TODOS os casos
// abertos do cliente; acesa se algum está marcado. É a mesma casos.importante da lista ⭐ Importante, que a
// ponte_despacho.py espelha na tarefa do To Do. A ⭐ da anotação é outra e não muda.
function botaoEstrelaFicha(cliId){
  const ks = ativos().filter(k=>k.cliente_id===cliId);
  if(!ks.length || !podeGravarCaso()) return "";
  const on = ks.some(k=>k.importante);
  const t = on ? "Importante: desmarcar todos os casos deste cliente" : "Importante: marcar todos os casos deste cliente";
  return `<button class="det-imp ${on?"on":""}" onclick="estrelaFicha('${cliId}')" title="${t}" aria-label="${t}" aria-pressed="${on}">${IC_ESTRELA.replace(/width="13" height="13"/,'width="20" height="20"')}</button>`;
}
async function estrelaFicha(cliId){
  const ks = ativos().filter(k=>k.cliente_id===cliId); if(!ks.length) return;
  const v = !ks.some(k=>k.importante), muda = ks.filter(k=>!!k.importante!==v);
  try{ await api(`/rest/v1/casos?id=in.(${muda.map(k=>k.id).join(",")})`,{method:"PATCH",
    headers:{Prefer:"return=minimal"}, body:JSON.stringify({importante:v})}); }
  catch(e){ return aviso("Não gravou — tente de novo"); }
  muda.forEach(k=>k.importante=v);
  aviso(v ? `⭐ Importante${ks.length>1?` em ${ks.length} casos`:""}` : "Importante removido");
  montarSidebar(); if(clienteAberto===cliId) repintarFicha(); if(visao==="importante") render();
}
async function toggleImp(casoId){
  const k=D.casoPorId.get(casoId); if(!k) return;
  k.importante=!k.importante;
  await patchCaso(casoId, {importante:k.importante});
  aviso(k.importante?"⭐ Marcado como Importante":"Importante removido");
  montarSidebar(); if(clienteAberto) abrirFicha(clienteAberto);
}
// ══════════════════════════════════════════════════════════════════════════
// F245 · A CONFERÊNCIA EM UM CLIQUE E A MOVIMENTAÇÃO EM DOIS (pedido do Paulo, 19.10.2026)
// ══════════════════════════════════════════════════════════════════════════
// O gesto mais repetido do dia: conferir o pedido, escrever "Está em análise" e remarcar para a semana que vem.
// "Sem novidade" faz os três de uma vez, com desfazer; nunca sozinho (decisão do Paulo: o CRM não remarca por conta
// própria). "Movimentou" pergunta o que aconteceu e, no clique da resposta, grava a anotação com ⭐, acende a ⭐ do
// caso, declara a etapa e avisa o advogado responsável.
const CONF_FASE = {inss:["Em análise", "Está em análise.", 7], conselho:["Aguardando julgamento", "Aguardando julgamento no CRPS.", 15],
  judicial:["Sem movimentação", "Sem movimentação no processo.", 15], pagamento:["Aguardando pagamento", "Aguardando o pagamento.", 15]};
const RX_CONFERENCIA = /^(est[áa] em an[áa]lise|aguardando julgamento|sem movimenta[çc][ãa]o|aguardando o pagamento|conferi: o benef[íi]cio ainda n[ãa]o foi implantado)/i;
// F247 · concedido e ainda fora do Pagamento: o que se confere toda semana é a implantação
const aguardaImplantacao = k => !!k && k.resultado==="deferido" && ["inss","conselho","judicial"].includes(faseEfetiva(k)) && !/implantad/i.test(k.etapa||"") && !(k.ronda||{}).implantado;
const confDaFase = k => { const f = faseEfetiva(k), x = CONF_FASE[f] || CONF_FASE.inss;
  return aguardaImplantacao(k) ? {f, rot:"Não implantado", txt:"Conferi: o benefício ainda não foi implantado.", dias:7, impl:true}
    : {f, rot:x[0], txt:x[1], dias:x[2]}; };
const movOps = k => { const c = confDaFase(k); let ops = MOV_FASE[c.f] || MOV_FASE.inss;
  // F415 · a reanálise da análise documental: pedida enquanto cabe; decidida enquanto pedida
  const rp = c.f==="inss" && reanalisePedida(k);
  if(c.f==="inss" && reanaliseAte(k)) ops = [["Reanálise pedida", null, "reanl_ped"], ...ops];
  else if(rp && !rp.decidida_em) ops = [["Reanálise mantida", "decidido", "reanl_ind"], ["Reanálise deferida", "decidido", "reanl_def"], ...ops];
  return c.impl ? [["Benefício implantado", "benefício implantado", "impl"], ...ops.filter(o=>!/implantado/i.test(o[0]))] : ops; };
// o caso que se confere: em andamento no INSS, no Conselho, no Judicial ou no Pagamento
const conferivel = k => !!k && !ehPreCaso(k) && !!CONF_FASE[faseEfetiva(k)];
function botoesConferir(k, cls){
  if(!conferivel(k)) return "";
  const c = confDaFase(k);
  return `<span class="conf-bts ${cls||""}"><button type="button" class="tl-bt conf-sem" onclick="semNovidade('${k.id}',0,event)"
      title="anota “${esc(c.txt)}” e marca de novo para daqui a ${c.dias} dias; dá para desfazer">${esc(c.rot)} · +${c.dias} d</button><button type="button" class="tl-bt conf-mais" aria-label="outro intervalo"
      title="outro intervalo" onclick="semNovidadeMenu('${k.id}',event)">▾</button><button type="button" class="tl-bt conf-mov" onclick="movimentou('${k.id}',event)"
      title="aconteceu algo: escolha o quê; vira anotação com ⭐ e avisa o advogado responsável">Movimentou</button></span>`;
}
function semNovidadeMenu(casoId, ev){
  if(ev) ev.stopPropagation();
  const k = D.casoPorId.get(casoId); if(!k) return;
  const c = confDaFase(k);
  caixa(`<h3 style="margin:0 0 8px">${esc(c.rot)}: voltar a conferir em</h3>
    <div class="conf-dias">${[3, 7, 15, 30].map(n=>`<button type="button" class="esp-it${n===c.dias?" on":""}" onclick="fecharCaixa();semNovidade('${casoId}',${n})">${n} dias</button>`).join("")}</div>`);
}
async function semNovidade(casoId, dias, ev){
  if(ev) ev.stopPropagation();
  const k = D.casoPorId.get(casoId); if(!k) return;
  const c = confDaFase(k), quando = proxDiaUtil(somaDias(hoje(), dias || c.dias)), hj = hoje();
  const texto = `${c.txt} Conferir de novo em ${fmtBarra(quando)}.`;
  let and = null;
  try{ [and] = await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
    body:JSON.stringify({caso_id:casoId, autor_id:eu.id, texto})}); }
  catch(e){ return aviso("Não gravou a conferência — tente de novo"); }
  if(!and) return;
  api(`/rest/v1/andamentos_lidos`,{method:"POST",headers:{Prefer:"return=minimal,resolution=merge-duplicates"},
    body:JSON.stringify({andamento_id:and.id, colaborador_id:eu.id})}).catch(()=>{});
  if(Array.isArray(D._andsFicha) && clienteAberto===k.cliente_id) D._andsFicha.unshift(and);
  // a conferência que vencia (o lembrete de conferir, de hoje ou de antes) sai; a data volta daqui a N dias
  const velhas = (D.tarefasPorCaso.get(casoId)||[]).filter(t=>!t.concluida_em && t.natureza==="lembrete" && t.lembrar_em && t.lembrar_em<=hj);
  const agora = new Date().toISOString();
  let falha = "";   // vai na faixa do desfazer, que apagaria um aviso solto
  for(const t of velhas){ t.concluida_em = agora;
    try{ await api(`/rest/v1/andamento_tarefas?id=eq.${t.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({concluida_em:agora})}); }
    catch(e){ t.concluida_em = null; falha = ". Não foi possível gravar a conclusão do lembrete anterior: "+msgErro(e); } }
  // o "Concluir em" do To Do (casos.prazo) vencido é a própria data de conferir: anda junto. Ele não é apagado, porque
  // o To Do só preenche o vazio e devolveria a data velha
  const prazoAntes = k.prazo; let tf = null;
  if(k.prazo && k.prazo<=hj){ k.prazo = quando;
    try{ await patchCaso(casoId, {prazo:quando}); }
    catch(e){ k.prazo = prazoAntes; falha = ". Não foi possível gravar a nova data de conferência: "+msgErro(e); } }
  else { try{ [tf] = await api(`/rest/v1/andamento_tarefas`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({andamento_id:and.id, caso_id:casoId, colaborador_id:eu.id, atribuido_por:eu.id, lembrar_em:quando, natureza:"lembrete"})});
    tarefaNaMemoria(tf); }catch(e){ falha = ". Não foi possível gravar o lembrete da nova conferência: "+msgErro(e); } }
  const repinta = () => { montarSidebar(); render(); if(clienteAberto===k.cliente_id) repintarFicha(); };
  repinta();
  avisoDesfazer(`${c.rot} · conferir de novo em ${fmtBarra(quando)}${falha}`, async ()=>{
    await api(`/rest/v1/andamentos?id=eq.${and.id}`,{method:"DELETE"}).catch(()=>{});
    if(Array.isArray(D._andsFicha)) D._andsFicha = D._andsFicha.filter(a=>a.id!==and.id);
    for(const t of velhas){ t.concluida_em = null;
      api(`/rest/v1/andamento_tarefas?id=eq.${t.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({concluida_em:null})}).catch(()=>{}); }
    if(tf){ api(`/rest/v1/andamento_tarefas?id=eq.${tf.id}`,{method:"DELETE"}).catch(()=>{});
      D.tarefasPorCaso.set(casoId, (D.tarefasPorCaso.get(casoId)||[]).filter(t=>t.id!==tf.id)); }
    if(prazoAntes!==k.prazo){ k.prazo = prazoAntes; await patchCaso(casoId, {prazo:prazoAntes}).catch(()=>{}); }
    repinta(); aviso("Conferência desfeita", false);
  });
}
// ══════════════════════════════════════════════════════════════════════════
// F291 · CONCLUIR POR HOJE (Onda A do fluxo do To Do, pedido do Paulo de 29.10.2026)
// ══════════════════════════════════════════════════════════════════════════
// No To Do, a ⭐ Importante é a fila do dia. Atendido o cliente, o Paulo marca quando ele volta
// ("Concluir em", casos.prazo), tira do Meu Dia, apaga a estrela e, às vezes, passa a outra pessoa:
// quatro a seis cliques. Aqui é um gesto: o círculo da linha ou o botão do caso. A ⭐ do caso só a
// pessoa acende (decisão do Paulo, 29.10.2026). A ponte (crm/fase2/ponte_despacho.py) leva a data e a
// estrela apagada ao To Do antes da sincronização, que de outro modo devolveria a estrela.
function botaoDespacho(k){
  return `<button class="desp-circ" data-despachar="${k.id}" title="Concluir por hoje: escolher quando volta e tirar do Meu Dia" aria-label="Concluir por hoje"></button>`;
}
function proxSegunda(base){
  const b = base || hoje(), d = new Date(b + "T12:00:00");
  return somaDias(b, ((8 - d.getDay()) % 7) || 7);
}
const DESP_DATAS = [["Amanhã", ()=>somaDias(hoje(),1)], ["Próxima semana", ()=>proxSegunda()], ["Em 15 dias", ()=>somaDias(hoje(),15)],
  ["Em 1 mês", ()=>somaMeses(hoje(),1)], ["Em 6 meses", ()=>somaMeses(hoje(),6)]];
let _desp = null;
function despachar(casoId, ev, lote){
  if(ev){ ev.stopPropagation(); if(ev.preventDefault) ev.preventDefault(); }
  const k = lote ? null : D.casoPorId.get(casoId); if(!k && !lote) return;   // F443 · lote = quantos casos selecionados
  const cli = k ? D.cliPorId.get(k.cliente_id) || {} : {};
  // a data que já existe e está adiante vem escolhida: o despacho só confirma
  const ja = k && k.prazo && k.prazo > hoje() ? k.prazo : null;
  _desp = {casoId, data:ja, para:null, lote:lote||null};
  const eq = equipeAtiva().filter(c=>c.id!==eu.id);
  caixa(`<h3 style="margin:0 0 4px">✔ Concluir por hoje <small class="meio-sub">· ${k ? `${esc(cli.nome||"")} · ${esc(tituloCaso(k))}` : `${lote} ${lote===1?"caso":"casos"}`}</small></h3>
    <p class="meio-sub" style="margin:0 0 10px">Quando o cliente volta à fila? Ele sai do seu Meu Dia.</p>
    <div class="desp-datas">${DESP_DATAS.map(([r,f])=>{ const d=f();
      return `<button type="button" class="btn-mini${d===ja?" on":""}" data-dd="${d}" onclick="despData(this.dataset.dd,this)">${r}<small>${fmtBarra(d).slice(0,5)}</small></button>`; }).join("")}
      <input type="date" id="desp-data" aria-label="escolher a data" value="${ja && !DESP_DATAS.some(([,f])=>f()===ja) ? ja : ""}" onchange="despData(this.value,this)"></div>
    ${eq.length ? `<div class="desp-quem"><span class="meio-sub">Passar a (opcional):</span>${eq.map(c=>
      `<button type="button" class="btn-mini" data-p="${c.id}" onclick="despPara(this.dataset.p,this)">${esc(c.nome.split(" ")[0])}</button>`).join("")}</div>` : ""}
    <textarea id="desp-nota" rows="2" oninput="despNota(this.value)" placeholder="anotação (opcional): o que foi feito e o que se espera; &quot;aguardar até 30/11&quot; já escolhe a data"></textarea>
    <div class="form-linha"><button class="btn-rap" onclick="fecharCaixa()">cancelar</button>
      <button class="btn-mini" id="desp-ok" style="margin-left:auto" onclick="gravarDespacho()" title="✔ Concluir por hoje">✔ Concluir<span class="sr-only"> por hoje</span></button></div>`);
}
function despData(v, el){
  if(!_desp) return;
  _desp.data = v || null; if(el) _desp.manual = true;
  document.querySelectorAll(".desp-datas .btn-mini.on").forEach(b=>b.classList.remove("on"));
  if(el && el.classList.contains("btn-mini")){ el.classList.add("on"); const i=document.getElementById("desp-data"); if(i) i.value=""; }
}
function despPara(id, el){
  if(!_desp) return;
  _desp.para = _desp.para===id ? null : id;
  document.querySelectorAll(".desp-quem .btn-mini").forEach(b=>b.classList.toggle("on", b.dataset.p===_desp.para));
}
async function gravarDespacho(){
  const s = _desp; if(!s) return;
  const k = D.casoPorId.get(s.casoId); if(!k && !s.lote) return;
  if(!s.data) return aviso("Escolha quando o cliente volta à fila");
  if(s.data <= hoje()) return aviso("A volta precisa ser depois de hoje");
  const nota = ((document.getElementById("desp-nota")||{}).value||"").trim();
  fecharCaixa(); _desp = null;
  if(s.lote) return gravarLote(s, nota);
  return aplicarDespacho(k, s, nota);
}
// F292 · a data escrita na anotação do despacho ("aguardar até 30/11") escolhe a volta, como no To Do
function despNota(txt){
  if(!_desp || _desp.manual) return;
  const a = dataDoTexto(txt); if(!a || a.iso <= hoje()) return;
  despData(a.iso, null); _desp.manual = false;
  const i = document.getElementById("desp-data"); if(i) i.value = DESP_DATAS.some(([,f])=>f()===a.iso) ? "" : a.iso;
  document.querySelectorAll(".desp-datas .btn-mini").forEach(b=>b.classList.toggle("on", b.dataset.dd===a.iso));
}
// s = {data, para}; nota = texto da anotação a gravar (vazio quando a anotação já foi gravada)
// o prazo fatal aberto mais cedo do caso: a tarefa fatal pendente ou o casos.prazo que não é volta à fila
function fatalAbertoDe(k){
  const ds = (D.tarefasPorCaso.get(k.id)||[]).filter(t=>t.natureza==="fatal" && !t.concluida_em && t.lembrar_em).map(t=>t.lembrar_em);
  if(k.prazo && (k.ronda||{}).despacho?.prazo!==k.prazo && !prazoEhRetorno(k)) ds.push(k.prazo);
  return ds.filter(d=>d>=hoje()).sort()[0] || null;
}
async function aplicarDespacho(k, s, nota, lote){
  const fat = fatalAbertoDe(k);
  if(!lote && fat && s.data > fat && !await confirmar(`O prazo fatal deste caso vence em ${fmtBarra(fat)}, antes da volta à fila em ${fmtBarra(s.data)}. Concluir por hoje assim mesmo?`)) return;
  const cli = D.cliPorId.get(k.cliente_id) || {};
  const antes = {prazo:k.prazo||null, ronda:k.ronda||{}};
  const ronda = {...(k.ronda||{}), despacho:{em:new Date().toISOString(), por:eu.id, prazo:s.data, ...(s.para?{para:s.para}:{})}};
  const muda = {prazo:s.data, ronda};   // F373 · a ⭐ fica (decisão do Paulo, 02.11.2026)
  try{ await patchCaso(k.id, muda); }catch(e){ return lote ? null : aviso("Não gravou — tente de novo"); }
  Object.assign(k, muda);
  const dias = (D.meudia||[]).filter(x=>x.caso_id===k.id && x.colaborador_id===eu.id);
  for(const x of dias) api(`/rest/v1/meu_dia?id=eq.${x.id}`,{method:"DELETE"}).catch(()=>{});
  D.meudia = (D.meudia||[]).filter(x=>!dias.includes(x));
  let and = null;
  if(nota) try{
    [and] = await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:k.id, autor_id:eu.id, texto:nota})}) || [];
    if(and && Array.isArray(D._andsFicha) && clienteAberto===k.cliente_id) D._andsFicha.unshift(and);
    if(and && /@\p{L}/u.test(nota)) criarMencoes(nota, k.id, and.id).catch(()=>{});
  }catch(e){ aviso("A anotação não gravou — o resto foi feito"); }
  // passar a outra pessoa: como trocar o "Atribuído a" do To Do, ela entra e quem passou sai
  const atrAntes = [...(D.atrDoCaso.get(k.id)||[])];
  let passou = null;
  if(s.para && s.para!==eu.id){
    passou = D.colPorId.get(s.para);
    if(!atrAntes.includes(s.para)) try{ await api(`/rest/v1/atribuicoes`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({caso_id:k.id, colaborador_id:s.para})}); }catch(e){ if(e.status!==409) passou = null; }
    if(passou && atrAntes.includes(eu.id))
      await api(`/rest/v1/atribuicoes?caso_id=eq.${k.id}&colaborador_id=eq.${eu.id}`,{method:"DELETE"}).catch(()=>{});
    if(passou){
      D.atrDoCaso.set(k.id, [...new Set([...atrAntes.filter(x=>x!==eu.id), s.para])]);
      api(`/rest/v1/mencoes`,{method:"POST",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({de_id:eu.id, para_id:s.para, caso_id:k.id, ...(and?{andamento_id:and.id}:{}),
          texto:`👤 ${(eu.nome||"").split(" ")[0]} passou a você o cliente ${cli.nome||""}, para ${fmtBarra(s.data)}${nota?`: ${nota.slice(0,140)}`:""}`})}).catch(()=>{});
    }
  }
  const repinta = () => { montarSidebar(); render(); if(clienteAberto===k.cliente_id) repintarFicha(); };
  const desfaz = async calado=>{
    const volta = {prazo:antes.prazo, ronda:antes.ronda};
    await patchCaso(k.id, volta).catch(()=>{}); Object.assign(k, volta);
    for(const x of dias){ try{ const [m] = await api(`/rest/v1/meu_dia`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({colaborador_id:eu.id, caso_id:k.id, dia:x.dia||hoje()})}) || []; if(m) D.meudia.push(m); }catch(e){} }
    if(and){ await api(`/rest/v1/andamentos?id=eq.${and.id}`,{method:"DELETE"}).catch(()=>{});
      if(Array.isArray(D._andsFicha)) D._andsFicha = D._andsFicha.filter(a=>a.id!==and.id); }
    if(passou){
      if(!atrAntes.includes(s.para)) await api(`/rest/v1/atribuicoes?caso_id=eq.${k.id}&colaborador_id=eq.${s.para}`,{method:"DELETE"}).catch(()=>{});
      if(atrAntes.includes(eu.id)) await api(`/rest/v1/atribuicoes`,{method:"POST",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({caso_id:k.id, colaborador_id:eu.id})}).catch(()=>{});
      D.atrDoCaso.set(k.id, atrAntes);
    }
    if(!calado){ repinta(); aviso("Desfeito: o cliente voltou à fila", false); }
  };
  if(lote) return desfaz;   // F443 · o lote repinta e desfaz de uma vez
  repinta();
  avisoDesfazer(`✔ ${cli.nome||"Cliente"} volta em ${fmtBarra(s.data)}${passou?` · com ${passou.nome.split(" ")[0]}`:""}`, ()=>desfaz());
}
// ══════════════════════════════════════════════════════════════════════════
// F293 · PAPEL E PORTAL (Onda C do fluxo do To Do, pedido do Paulo de 29.10.2026)
// ══════════════════════════════════════════════════════════════════════════
// No vídeo, o Paulo gera o "Pedido para Médico Assistente", passa à Meissa "imprime e deixa na pasta" e o cliente
// retira no balcão. Aqui é um gesto: escolher o papel (modelo ou documento já gerado), quem imprime e até quando.
// O pedido vira anotação no caso, tarefa de quem imprime (no Meu Dia dela) e item "para entregar" na ficha
// (campos.entregar), que a recepção baixa com "Entregue" quando o cliente retira.
const entregarDe = c => (((c||{}).campos||{}).entregar)||[];
function modelosDoCliente(c, ks){
  return (D.docModelos||[]).filter(m=>m.categoria==="geral" || ks.some(k=>k.beneficio && dsa(m.categoria)===dsa(k.beneficio)));
}
let _sep = null;
function separarParaCliente(cliId){
  const c = D.cliPorId.get(cliId); if(!c) return;
  const k = casoDoDoc(cliId);
  if(!k) return aviso("Este cliente não tem caso nem atendimento aberto para registrar o pedido");
  const ks = (D.casosDoCliente.get(cliId)||[]).filter(x=>x.fase!=="encerrado");
  const mods = modelosDoCliente(c, ks);
  const ger = (D.anexos||[]).filter(a=>a.cliente_id===cliId && /^(gerado|assinado)$/.test(a.origem||"")).slice(0, 8);
  const eq = equipeAtiva();
  const rec = eq.filter(x=>x.cargo==="recepcao"), est = eq.filter(x=>x.cargo==="estagiario");
  _sep = {cliId, casoId:k.id, para:((rec[0]||est[0])||{}).id||null, ate:hoje()};
  caixa(`<h3 style="margin:0 0 4px">Imprimir e separar para o cliente <small class="meio-sub">· ${esc(c.nome)}</small></h3>
    <p class="meio-sub" style="margin:0 0 8px">Quem imprime recebe a tarefa no Meu Dia, e a ficha mostra o que está na pasta até o cliente retirar.</p>
    ${mods.length ? `<p class="cap-perg" style="margin:6px 0 2px">Modelo, preenchido com os dados do cliente</p>
      ${mods.map(m=>`<label class="sep-op"><input type="checkbox" class="sep-mod" value="${m.id}"> ${esc(m.titulo)}</label>`).join("")}` : ""}
    ${ger.length ? `<p class="cap-perg" style="margin:8px 0 2px">Já gerado ou assinado</p>
      ${ger.map(a=>`<label class="sep-op"><input type="checkbox" class="sep-an" value="${a.id}"> ${esc(String(a.nome||"documento").replace(/^(Gerado|Assinado) · /,""))} <small class="meio-sub">${esc(fmtBarra(dataSP(a.criado_em||new Date().toISOString())))}</small></label>`).join("")}` : ""}
    <div class="form-linha" style="margin-top:6px"><input id="sep-outro" placeholder="outro papel (escreva o nome)" style="flex:1"></div>
    <div class="desp-quem" style="margin-top:12px"><span class="meio-sub">Quem imprime:</span>${eq.map(x=>
      `<button type="button" class="btn-mini${x.id===_sep.para?" on":""}" data-p="${x.id}" onclick="sepPara(this.dataset.p)">${esc(x.nome.split(" ")[0])}</button>`).join("")}</div>
    <div class="desp-datas"><span class="meio-sub">Na pasta até:</span>
      ${[["Hoje",hoje()],["Amanhã",somaDias(hoje(),1)]].map(([r,d])=>`<button type="button" class="btn-mini${d===_sep.ate?" on":""}" data-dd="${d}" onclick="sepAte(this.dataset.dd)">${r}</button>`).join("")}
      <input type="date" id="sep-ate" aria-label="escolher a data" min="${hoje()}" onchange="sepAte(this.value)"></div>
    <div class="form-linha"><button class="btn-rap" onclick="fecharCaixa()">cancelar</button>
      <button class="btn-mini" id="sep-ok" style="margin-left:auto" onclick="gravarSeparar()" title="Separar para o cliente">Separar<span class="sr-only"> para o cliente</span></button></div>`);
}
function sepPara(id){
  if(!_sep) return; _sep.para = _sep.para===id ? null : id;
  document.querySelectorAll(".desp-quem .btn-mini").forEach(b=>b.classList.toggle("on", b.dataset.p===_sep.para));
}
function sepAte(v){
  if(!_sep || !v) return; _sep.ate = v;
  document.querySelectorAll(".desp-datas .btn-mini").forEach(b=>b.classList.toggle("on", b.dataset.dd===v));
}
async function gravarSeparar(){
  const s = _sep; if(!s) return;
  const c = D.cliPorId.get(s.cliId), k = D.casoPorId.get(s.casoId); if(!c || !k) return;
  const mods = [...document.querySelectorAll(".sep-mod:checked")].map(x=>(D.docModelos||[]).find(m=>m.id===x.value)).filter(Boolean);
  const ans = [...document.querySelectorAll(".sep-an:checked")].map(x=>(D.anexos||[]).find(a=>a.id===x.value)).filter(Boolean);
  const outro = ((document.getElementById("sep-outro")||{}).value||"").trim();
  if(!mods.length && !ans.length && !outro) return aviso("Escolha o papel a separar");
  if(!s.para) return aviso("Escolha quem imprime");
  fecharCaixa(); _sep = null;
  // o modelo vira documento guardado (gerados/), para quem imprime abrir em Documentos sem gerar de novo
  const novos = [];
  for(const m of mods){
    const corpo = preencherDoc(m.conteudo, c, k), caminho = `gerados/${c.id}/${hoje()}-${nomeSeguro(m.titulo).slice(0,60)}-${Date.now()}.html`;
    const html = htmlImpressao(`${m.titulo} — ${c.nome}`, `<pre style="white-space:pre-wrap;font:inherit">${esc(corpo)}</pre>`);
    try{
      const blob = new Blob([html],{type:"text/html"});
      await subirArquivo(caminho, blob);
      const [an] = await api(`/rest/v1/anexos`,{method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({caso_id:k.id, cliente_id:c.id, autor_id:eu.id, origem:"gerado", nome:`Gerado · ${m.titulo}`, caminho, tipo:"text/html", tamanho:blob.size})}) || [];
      if(an){ (D.anexos=D.anexos||[]).unshift(an); novos.push(an); }
    }catch(e){ aviso(`O modelo ${m.titulo} não ficou guardado — imprima pela aba de mensagens`); }
  }
  const docs = [...mods.map(m=>m.titulo), ...ans.map(a=>String(a.nome||"documento").replace(/^(Gerado|Assinado) · /,"")), ...(outro?[outro]:[])];
  const quem = D.colPorId.get(s.para), nomeQuem = quem ? quem.nome.split(" ")[0] : "";
  const texto = `🖨 Separar para ${c.nome.split(" ")[0]} retirar no balcão: ${docs.join("; ")}. @${nomeQuem} imprime e deixa na pasta até ${fmtBarra(s.ate)}.`;
  let and, tf;
  try{
    [and] = await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:k.id, autor_id:eu.id, texto})}) || [];
    [tf] = await api(`/rest/v1/andamento_tarefas`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({andamento_id:and.id, caso_id:k.id, colaborador_id:s.para, atribuido_por:eu.id, lembrar_em:s.ate, natureza:"compromisso"})}) || [];
    tarefaNaMemoria(tf);
  }catch(e){ return aviso("Não gravou — tente de novo"); }
  if(and && Array.isArray(D._andsFicha) && clienteAberto===c.id) D._andsFicha.unshift(and);
  if(s.para!==eu.id) criarMencoes(texto, k.id, and.id).catch(()=>{});
  const item = {id:"en_"+Date.now().toString(36), docs, anexos:[...novos, ...ans].map(a=>a.id), caso_id:k.id, and_id:and.id, tf_id:tf&&tf.id, para:s.para, ate:s.ate, em:hoje(), por:eu.id};
  const camposAntes = c.campos;
  c.campos = {...(c.campos||{}), entregar:[...entregarDe(c), item]};
  try{ await api(`/rest/v1/clientes?id=eq.${c.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({campos:c.campos})}); }
  catch(e){ c.campos = camposAntes; if(clienteAberto===c.id) repintarFicha();
    return aviso("A anotação e a tarefa foram criadas, mas não foi possível gravar os papéis na pasta do cliente: "+msgErro(e)); }
  aviso(`🖨 Separado: ${nomeQuem} imprime até ${fmtBarra(s.ate)}`, false);
  if(clienteAberto===c.id) repintarFicha();
}
// a ficha avisa o que está na pasta: quem atende o cliente no balcão vê e entrega
function chipEntregar(c){
  const n = entregarDe(c).length; if(!n) return "";
  return `<button type="button" class="chip-entregar" onclick="entregarAoCliente('${c.id}')" title="papéis separados na pasta para o cliente retirar">🖨 ${n} para entregar</button>`;
}
function entregarAoCliente(cliId){
  const c = D.cliPorId.get(cliId); if(!c) return;
  const lst = entregarDe(c);
  caixa(`<h3 style="margin:0 0 8px">Para entregar ao cliente <small class="meio-sub">· ${esc(c.nome)}</small></h3>
    ${lst.map((x, i)=>{ const q = D.colPorId.get(x.para);
      return `<div class="sep-ent"><div><b>${esc(x.docs.join("; "))}</b><br><small class="meio-sub">separado em ${esc(fmtBarra(x.em))}${q?`, ${esc(q.nome.split(" ")[0])} imprime até ${esc(fmtBarra(x.ate))}`:""}</small>
        ${(x.anexos||[]).map(id=>(D.anexos||[]).find(a=>a.id===id)).filter(Boolean).map(a=>`<button type="button" class="btn-mini" onclick="abrirAnexo('${a.id}')" title="abrir para imprimir"><span aria-hidden="true">Imprimir</span><span class="sr-only">abrir para imprimir</span></button>`).join("")}</div>
        <button type="button" class="btn-mini forte" onclick="marcarEntregue('${cliId}',${i})">✔ Entregue</button></div>`; }).join("") || `<p class="meio-sub">Nada separado.</p>`}
    <div class="form-linha"><button class="btn-rap" onclick="fecharCaixa()">fechar</button></div>`);
}
async function marcarEntregue(cliId, i){
  const c = D.cliPorId.get(cliId), lst = [...entregarDe(c)], x = lst[i]; if(!x) return;
  lst.splice(i, 1);
  c.campos = {...(c.campos||{}), entregar:lst.length ? lst : undefined};
  try{ await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({campos:c.campos})}); }
  catch(e){ return aviso("Não gravou — tente de novo"); }
  if(x.tf_id) api(`/rest/v1/andamento_tarefas?id=eq.${x.tf_id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({concluida_em:new Date().toISOString()})}).catch(()=>{});
  const t = x.tf_id && (D.tarefasPorCaso.get(x.caso_id)||[]).find(y=>y.id===x.tf_id); if(t) t.concluida_em = new Date().toISOString();
  if(x.caso_id && D.casoPorId.get(x.caso_id)) try{
    const [and] = await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:x.caso_id, autor_id:eu.id, texto:`✔ Entregue no balcão: ${x.docs.join("; ")}.`, responde_a:x.and_id||null})}) || [];
    if(and && Array.isArray(D._andsFicha) && clienteAberto===cliId) D._andsFicha.unshift(and);
  }catch(e){}
  if(lst.length) entregarAoCliente(cliId); else fecharCaixa();
  aviso("✔ Entregue ao cliente", false);
  if(clienteAberto===cliId) repintarFicha();
}
// F293 · o parente que também é cliente fica à vista no alto da ficha (no To Do, "Filho da Fulana #CPF" nas etapas),
// e avisa o que ele tem marcado nos próximos 7 dias, para aproveitar a mesma visita
function chipsParentes(c){
  const hj = hoje(), ate = somaDias(hj, 7);
  return vincsDoCliente(c).map(v=>{
    const o = D.cliPorId.get(v.cliente_id===c.id ? v.ligado_a : v.cliente_id); if(!o) return "";
    const tem = itensAgenda(null).filter(i=>i.cli && i.cli.id===o.id && i.data<=ate && !i.antes)
      .map(i=>`${i.data<hj?"vencido":i.data===hj?"hoje":fmtBarra(i.data).slice(0,5)}: ${i.selo?i.selo+", ":""}${i.resumo||""}`);
    const n = entregarDe(o).length; if(n) tem.push(`${n} papel(éis) para entregar no balcão`);
    return `<button type="button" class="chip-parente${tem.length?" tem":""}" onclick="abrirFicha('${o.id}')"
      title="${esc(`${o.nome}${v.relacao?` (${v.relacao})`:""} também é cliente${tem.length?`. Aproveite a visita:\n• ${tem.slice(0,4).join("\n• ")}`:""}`)}">👪 ${esc(o.nome.split(" ")[0])}${v.relacao?` · ${esc(v.relacao)}`:""}${tem.length?` · também tem ${tem.length}`:""}</button>`;
  }).join("");
}
// F293 · a consulta do dia no Meu INSS: o CPF vai à área de transferência e o portal abre no login do gov.br;
// a senha copia no 📋 ao lado. Com a extensão do dossiê, "Só o extrato de pagamento" baixa um documento só
// F396 · o dossiê antes de todo atendimento (primeiro ou retorno): as duas guias do gov.br que a extensão percorre
// primeiro, com o CPF já copiado; a extensão grava no cliente pelo CPF, e o Atualizar relê a ficha
// F425 · o balcão do atendimento presencial (pedido do Paulo de 07.11.2026): a janela do Dossiê guia a recepção em
// três passos, para o cliente novo agendado e para quem já é cliente: 1 · CPF (sem ele, o CPF se preenche aqui, ou
// fica registrado que o cliente não sabe), 2 · senha do gov.br (copiar, Entrou, Errada ou Sem gov.br), 3 · dossiê e
// Atualizar; o Pronto avisa os advogados com o estado. A conferência da senha fica em clientes.campos.gov = {em, quem, sem}.
const URL_EMPREGA = "https://servicos.mte.gov.br/spme-v2/#/login";
const credInssDe = c => (((D._ficha||{}).cliId===c.id && (D._ficha||{}).creds)||[]).find(x=>x.tipo==="meu_inss");
const govTxt = g => g ? `${g.sem ? "Sem gov.br" : "Senha conferida"} em ${fmtBarra(String(g.em).slice(0,10))} por ${g.quem}` : "";
async function gravarCamposBalcao(c, mudar){
  const campos = mudar({...(c.campos||{})});
  await api(`/rest/v1/clientes?id=eq.${c.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({campos})});
  c.campos = campos;
}
const notaBalcao = texto => ({em:new Date().toISOString(), quem:(eu.nome||"").split(" ")[0], autor_id:eu.id, texto});
function dossieDoAtendimento(cliId, abrir=true){
  const c = D.cliPorId.get(cliId); if(!c) return; if(semCadastro()) return;
  if(!c.cpf) return caixa(`<h3 style="margin:0 0 6px">Chegada de ${esc(c.nome||"")}</h3>
    <p class="meio-sub" style="margin:0 0 8px">1 · O dossiê se prende à ficha pelo CPF. Peça o CPF ao cliente ou um documento com ele.</p>
    <div class="form-linha"><input id="bal-cpf" placeholder="CPF (só números)" maxlength="14" inputmode="numeric" style="width:170px"
      onkeydown="if(event.key==='Enter')balcaoCpf('${c.id}')">
      <button class="btn-rap forte" onclick="balcaoCpf('${c.id}')" title="Guardar o CPF">Guardar<span class="sr-only"> o CPF</span></button>
      <button class="btn-rap" onclick="balcaoSemCpf('${c.id}')" title="O cliente não sabe o CPF">Sem<span class="sr-only"> CPF: o cliente não sabe</span></button></div>
    <div id="bal-msg" class="meio-sub"></div>`);
  if(abrir){
    copiar(c.cpf, "CPF copiado: cole no gov.br");
    var abertas = [MEU_INSS, URL_EMPREGA].map(u=>window.open(u, "_blank", "noopener")).filter(Boolean).length;
  }
  const cr = credInssDe(c), g = (c.campos||{}).gov;
  caixa(`<h3 style="margin:0 0 6px">Dossiê de ${esc(c.nome||"")}</h3>
    ${abrir && abertas<2 ? `<p class="meio-sub" style="color:#a3291c">O navegador bloqueou ${2-abertas} guia(s). Clique no ícone de pop-up bloqueado, escolha <b>Sempre permitir</b> e clique de novo em Dossiê.</p>` : ""}
    <p style="margin:0 0 4px"><b>1 · Senha do gov.br</b> ${g ? `<span class="meio-sub bal-gov">${esc(govTxt(g))}</span>` : ""}</p>
    <div class="form-linha" style="margin:0 0 4px">
      <button class="btn-rap" onclick="copiar('${c.cpf}','CPF copiado')" title="Copiar o CPF">CPF</button>
      ${cr ? `<button class="btn-rap" onclick="copiarCred('${cr.id}')" title="Copiar a senha do Meu INSS">Senha</button>`
        : `<input id="bal-senha" placeholder="senha que o cliente informar" autocomplete="off" style="width:200px"><button class="btn-rap" onclick="balcaoSenha('${c.id}')" title="Guardar a senha">Guardar<span class="sr-only"> a senha</span></button>`}
      <button class="btn-rap" onclick="balcaoGov('${c.id}','ok')" title="A senha entrou no gov.br">Entrou</button>
      <button class="btn-rap" onclick="balcaoGov('${c.id}','errada')" title="A senha não entrou">Errada</button>
      <button class="btn-rap" onclick="balcaoGov('${c.id}','sem')" title="O cliente não tem ou não lembra a conta gov.br">Sem<span class="sr-only"> gov.br</span></button></div>
    <div id="bal-msg" class="meio-sub" style="margin:0 0 8px"></div>
    <p style="margin:0 0 4px"><b>2 · Dossiê</b></p>
    <ol class="dz-passos" style="margin:0 0 10px;padding-left:20px;line-height:1.6">
      <li>Na guia do <b>Meu INSS</b>, entre com o gov.br do cliente (o CPF já está copiado).</li>
      <li>Na guia do <b>Emprega Brasil</b>, clique em Entrar com gov.br e espere abrir a área do trabalhador.</li>
      <li>Clique no ícone da extensão do dossiê e em <b>Rodar todos os portais</b>. Espere a faixa azul dizer que terminou.</li>
      <li>Volte aqui e clique em <b>Atualizar</b>: o cadastro se completa com o que o CNIS trouxe.</li></ol>
    <p style="margin:0 0 4px"><b>3 · Identificação e aviso</b> <span class="meio-sub">complete o que a ficha marcar em vermelho e avise o advogado.</span></p>
    <div class="form-linha">${abrir ? "" : `<button class="btn-rap" onclick="dossieDoAtendimento('${c.id}')" title="Abrir o Meu INSS e o Emprega Brasil">Portais</button>`}
      <button class="btn-rap" onclick="fecharCaixa();atualizarDossie('${c.id}')" title="Atualizar a ficha com o dossiê">Atualizar<span class="sr-only"> a ficha com o dossiê</span></button>
      <button class="btn-rap forte" onclick="balcaoPronto('${c.id}')" title="Avisar os advogados que o cliente está pronto para o atendimento">Pronto<span class="sr-only"> para o advogado</span></button></div>`);
}
