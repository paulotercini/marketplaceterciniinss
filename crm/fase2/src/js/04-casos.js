// F619 · a linha curta de cada quadro (INSS, CRPS, Judicial), calculada no banco por linha_curta(); a correção
// da equipe (casos.ronda.linha_curta.<aba>) vale enquanto a linha calculada for a mesma de quando se corrigiu
const _lc = new Map(), LC_ABA = {inss:"inss", crps:"crps", cnj:"judicial"};
function linhaCurtaDe(k){
  const m = _lc.get(k.id); if(m) return m;
  const novo = {d:{}}; _lc.set(k.id, novo);
  api(`/rest/v1/rpc/linha_curta`,{method:"POST", body:JSON.stringify({p_caso:k.id})})
    .then(r=>{ novo.d = r||{}; if(Object.keys(novo.d).length) repintarFicha(); }).catch(()=>{});
  return novo;
}
function lcDe(k, ch){
  const c = linhaCurtaDe(k).d[ch], cor = (((k.ronda||{}).linha_curta)||{})[ch];
  if(!c || !c.texto) return null;
  return cor && cor.original===c.texto ? {texto:cor.texto, nota:`corrigida por ${cor.por||"equipe"}`, c} : {texto:c.texto, nota:[c.data && dataBR(c.data), c.fonte].filter(Boolean).join(", "), c};
}
function lcHtml(k, aba){
  const ch = LC_ABA[aba], l = ch && lcDe(k, ch); if(!l) return "";
  return `<p class="db-lc" id="lc-${k.id}-${ch}"><span class="db-lc-t" title="${esc(l.texto + (l.nota ? ` (${l.nota})` : ""))}">${esc(l.texto)}</span>`
    + (podeGravarCaso() ? `<button type="button" class="db-lc-bt" onclick="corrigirLinhaCurta('${k.id}','${ch}')" title="Corrigir a linha curta">Corrigir</button>` : "") + `</p>`;
}
function corrigirLinhaCurta(casoId, ch){
  const k = D.casoPorId.get(casoId), l = k && lcDe(k, ch), el = document.getElementById(`lc-${casoId}-${ch}`);
  if(!l || !el || !podeGravarCaso()) return;
  el.innerHTML = `<input id="lc-ed-${casoId}-${ch}" aria-label="Linha curta" maxlength="200" value="${esc(l.texto)}"><button type="button" class="db-lc-bt" onclick="salvarLinhaCurta('${casoId}','${ch}')">Salvar</button><button type="button" class="db-lc-bt" onclick="repintarFicha()">Cancelar</button>`;
  const i = document.getElementById(`lc-ed-${casoId}-${ch}`); i.focus();
  i.onkeydown = e=>{ if(e.key==="Enter") salvarLinhaCurta(casoId, ch); else if(e.key==="Escape") repintarFicha(); };
}
async function salvarLinhaCurta(casoId, ch){
  const k = D.casoPorId.get(casoId), l = k && lcDe(k, ch), t = String((document.getElementById(`lc-ed-${casoId}-${ch}`)||{}).value||"").trim();
  if(!l || !t || t===l.texto) return repintarFicha();
  try{
    // a ronda inteira relida do banco antes de gravar: outro robô pode ter escrito nela
    const [r] = await api(`/rest/v1/casos?id=eq.${casoId}&select=ronda`) || [];
    const ronda = {...((r && r.ronda) || k.ronda || {})};
    ronda.linha_curta = {...(ronda.linha_curta||{}), [ch]:{texto:t, original:l.c.texto, por:(eu && eu.nome || "").split(" ")[0], em:new Date().toISOString()}};
    await patchCaso(casoId, {ronda}); k.ronda = ronda; aviso("Linha corrigida");
  }catch(e){ aviso("Não gravei a correção: " + (e.message||e)); }
  repintarFicha();
}
// F509 · as três últimas datas do processo no cartão Judicial (pedido do Paulo de 10.11.2026), sem o
// prefixo do sistema, a data e o número que o texto do andamento repete; no mesmo dia, um item por movimento
function movLimpo(t){
  return String(t||"").replace(/^\W*(?:PJe|e-SAJ|eproc)\b[^:]{0,30}:\s*/, "")
    .replace(/\s+—\s+em\s+\d{2}[\/.]\d{2}[\/.]\d{4}[\s\S]*$/, "")
    .replace(/\s+—\s+[^—]*\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\s*$/, "").trim();
}
// movimento de rotina: toda parte do texto é expediente, juntada, conclusão e afins (as mesmas regras de ehRotina)
function movDeRotina(a){
  return movLimpo(a.texto).split(" · ").every(t=>RX_ROTINA.test(t.trim()) && !RX_NAO_ROTINA.test(t));
}
// F529 · o estado do processo pelo último movimento do grau atual, desde a data dele (a etapa da trilha só
// quando nenhum movimento diz o estado); o órgão é o do mesmo grau, lido do cabeçalho do PJe
// F533 · decide o movimento MAIS NOVO que não seja ruído de cartório: o "Concluso para despacho" de setembro
// não vale quando depois dele veio prazo decorrido, ato ordinatório ou sentença (pedido do Paulo, 11.11.2026)
const EST_JUD = [
  [/conclusos?\s+(?:para|ao)\s+julgamento/i, "Concluso para julgamento"],
  [/conclusos?\s+com\s+embargos/i, "Concluso com embargos de declaração"],
  [/conclusos?\s+para\s+decis/i, "Concluso para decisão"],
  [/conclusos?\s+para\s+despacho/i, "Concluso para despacho"],
  [/conclusos?\s+para\s+senten/i, "Concluso para sentença"],
  [/inclus[ãa]o\s+em\s+pauta|inclu[íi]do\s+em\s+pauta|intima[çc][ãa]o\s+de\s+pauta/i, "Incluído em pauta"],
  [/deliberado\s+em\s+sess[ãa]o\s*-\s*julgado|julgado\s+em\s+sess/i, "Julgado em sessão"],
  [/remetidos?\s+os\s+autos\s*\(por\s+julgamento\s+definitivo/i, "Remetido à origem"],
  [/remetidos?\s+os\s+autos\s*\(em\s+grau\s+de\s+recurso\)\s+para\s+turmas?\s+recursa/i, "Remetido à Turma Recursal"],
  [/remetidos?\s+os\s+autos.*(?:tribunal|col[ée]gio\s+recursal)/i, "Remetido ao tribunal"],
  [/tr[âa]nsit\w*\s+em\s+julgado/i, "Trânsito em julgado"],
  [/baixa\s+definitiva/i, "Baixa definitiva"],
  [/arquivad\w*\s+definitiv|arquivo\s+geral/i, "Arquivado"],
  [/arquivad\w*\s+provisori/i, "Arquivado provisoriamente"],
  [/\bsuspens[oa]\b|sobrestad|suspens[ãa]o\s+do\s+processo/i, "Suspenso"],
  [/requisi[çc][ãa]o\s+de\s+pagamento.*paga|rpv\s+paga|precat[óo]rio\s+pago/i, "Requisição de pagamento paga"],
  [/(?:expedi\w*|requisi[çc][ãa]o)\s+.*(?:pequeno\s+valor|rpv|precat[óo]rio)/i, "Requisição de pagamento expedida"],
  [/cumprimento\s+de\s+senten[çc]a\s+inicia|execu[çc][ãa]o.*inicia/i, "Cumprimento de sentença iniciado"],
  [/ac[óo]rd[ãa]o/i, "Acórdão publicado"],
  [/senten[çc]a|julgad[oa]\s+(?:im)?procedente|extint[oa]|homologad/i, "Sentença proferida"],
  [/embargos\s+de\s+declara[çc][ãa]o/i, "Embargos de declaração"],
  [/tutela|liminar|decis[ãa]o/i, "Decisão proferida"],
  [/despacho/i, "Despacho proferido"],
  [/ato\s+ordinat/i, "Ato ordinatório"],
  [/decorrid\w*\s+(?:o\s+)?prazo/i, "Prazo decorrido"],
  [/laudo/i, "Laudo pericial juntado"],
  [/per[íi]cia\s+(?:agendada|designada|marcada)|designad\w*\s+per[íi]cia/i, "Perícia designada"],
  [/audi[êe]ncia/i, "Audiência designada"],
  [/contesta[çc][ãa]o/i, "Contestação apresentada"],
  [/recurso\s+inominado|apela[çc][ãa]o|contrarraz/i, "Recurso apresentado"],
  [/juntada\s+de\s+peti[çc][ãa]o/i, "Petição juntada"],
  [/distribu[íi]d|redistribu/i, "Distribuído"],
  [/recebidos?\s+os\s+autos/i, "Autos recebidos"],
  [/intima[çc][ãa]o|publicad/i, "Intimação publicada"],
];
// ruído de cartório e petição genérica da parte: não mudam o estado do processo
const RX_RUIDO_JUD = /^(?:juntada\s+de\s+peti[çc][ãa]o(?:\s+intercorrente)?\s*$|certid[ãa]o|juntada\s+de\s+certid|expedi[çc][ãa]o\s+de\s+(?:outros|informa)|expedid[ao]\/certificad|documento\s+juntado|confirmada\s+a\s+intima|mandado\s+(?:devolvido|expedido))/i;
function estadoJud(pg){
  for(const a of pg){
    const ps = movLimpo(a.texto).split(" · ").map(t=>t.trim()).filter(Boolean);
    const vivas = ps.filter(t=>!RX_RUIDO_JUD.test(t)); if(!vivas.length) continue;
    for(const [rx, nome] of EST_JUD) if(vivas.some(t=>rx.test(t))) return {n:nome, d:dataSP(dataDoDb(a))};
    const t = vivas[0].replace(/\s*-\s*ID de origem\s*\d+/i, "").replace(/\s+em\s+\d{2}\/\d{2}\/\d{4}.*$/, "").replace(/\s+—.*$/, "").trim();
    return {n: t.length > 60 ? t.slice(0, 57) + "…" : t, d:dataSP(dataDoDb(a))};
  }
  return null;
}
function orgaoJudCurto(s){
  s = String(s||"").replace(/^\/+/, "").trim();
  const m = /(\d+)\s*[ªa]\s*TR\b/i.exec(s);
  return m ? `${m[1]}ª Turma Recursal` : s;
}
function dbSituacaoJud(k, dig, par, g, pg){
  let e = estadoJud(pg||[]);
  if(!e){ try{ const r = ritoDe(k, "judicial"), ets = TRILHAS[r].e.map(lerEtapaTrilha), ms = marcasDaTrilha(k, "judicial", faseEfetiva(k), r, ets);
    let at = null, ult = null;
    ms.forEach((m,i)=>{ if(m.s==="a") at = {n:ets[i].n, d:m.d}; if(m.s==="f" && (!ult || (m.d||"")>=(ult.d||""))) ult = {n:ets[i].n, d:m.d}; });
    e = at || ult; }catch(x){} }
  const nome = (e && e.n) || (!par && !g && k.etapa) || "";
  const dets = (k.ronda||{}).detalhes||{};
  const det = (g ? dets[`${dig}|${g}`] : Object.entries(dets).filter(([c])=>c.split("|")[0]===dig).map(([, v])=>v)[0]) || {};
  const seg = g && g!=="1º grau", fed = dig.length===20 && dig[13]==="4" && dig.slice(14,16)==="03";
  let orgao = orgaoJudCurto(det[Object.keys(det).find(c=>/^[óo]rg[ãa]o julgador/i.test(c))]);
  if(!orgao) orgao = orgaoJudCurto(seg ? ((k.trf3||{}).orgao || (fed ? "" : "2º grau")) : (!par ? k.orgao_judicial || "" : ""));
  const onde = seg && fed ? ["TRF3", orgao].filter(Boolean).join(" · ") : orgao;
  const t = e && e.d ? tempoNaEtapa(k, e.d, "judicial") : null, dias = e && e.d ? diasEntreIso(e.d, hoje()) : null;
  const sit = nome || onde ? `<div class="db-situ">${onde ? `<span class="db-onde">${esc(onde)}</span>` : ""}${nome ? `<b class="db-est">${esc(nome)}</b>` : ""}${e && e.d ? `<span class="db-tempo">desde ${fmtBarra(e.d)}${dias!=null && dias>=0 ? ` · <span class="${t && t.longo ? "tarde" : ""}"${t ? ` title="${esc(t.por)}"` : ""}>${dias} ${dias===1?"dia":"dias"}</span>` : ""}</span>` : ""}</div>` : "";
  const f = !par && g!=="1º grau" && k.trf3 && k.trf3.ordem ? k.trf3 : null;
  const pct = f && f.total ? Math.max(0, Math.min(100, (f.total - f.ordem) / f.total * 100)) : 0;
  const fila = f ? `<div class="db-fila" title="posição na ordem de julgamento, painel público do TRF3${f.consultado_em ? `, consulta de ${fmtBarra(f.consultado_em)}` : ""}; a previsão é estimativa do escritório"><span>Fila: <b>${Number(f.ordem).toLocaleString(IDIOMA)}º</b>${f.total ? ` de ${Number(f.total).toLocaleString(IDIOMA)}` : ""}</span>${f.total ? `<i class="db-fbar" aria-hidden="true"><i style="width:${pct.toFixed(1)}%"></i></i>` : ""}${f.projecao && f.projecao.previsao ? `<span class="db-fprev">~${esc(mesAno(f.projecao.previsao))}</span>` : ""}</div>` : "";
  return sit + fila;
}
// os movimentos relevantes, só com as partes que não são rotina e sem o "ID de origem"
function dbRelevantes(vs){
  return `<ul class="db-rel">${vs.map(a=>{
    const ps = movLimpo(a.texto).split(" · ").map(t=>t.replace(/\s*-\s*ID de origem\s*\d+/i, "").trim()).filter(Boolean);
    const vivas = ps.filter(t=>!(RX_ROTINA.test(t) && !RX_NAO_ROTINA.test(t)));
    const txt = (vivas.length ? vivas : ps).join(" · "), m = /^(\S+)(\s[\s\S]*)?$/.exec(txt) || ["", txt, ""];
    return `<li><span class="d">${fmtBarra(dataSP(dataDoDb(a)))}${/T\d{2}:\d{2}/.test(dataDoDb(a)||"") ? ` ${horaSP(dataDoDb(a))}` : ""}</span><span class="t"><b>${esc(m[1])}</b>${esc(m[2]||"")}</span></li>`;
  }).join("")}</ul>`;
}
function dbMovsPje(pj, max=3){
  return dbListaDias(pj.map(a=>({d:dataSP(dataDoDb(a)), partes:movLimpo(a.texto).split(" · ")})), max);
}
// F497/F509 · os botões dos cartões do processo, na cor do quadro (--db-cor). No Judicial, Expedientes e
// Detalhes abrem logo abaixo do cartão (pedido do Paulo de 10.11.2026), e Baixar e Claude saíram da aba.
const _dbPainel = new Map();
function dbPainel(id, q){ _dbPainel.set(id, _dbPainel.get(id)===q ? "" : q); repintarFicha(); }
function dbBotoes(k, aba, dig, sis, fim=""){
  const ps = processosDaFase(k, aba); if(!ps.length) return fim ? `<div class="db-bts">${fim}</div>` : "";
  const i = Math.max(0, ps.findIndex(x=>x.d===dig)), x = ps[i];
  const exp = sis==="PJe" && expedientesDe(k, x.d).length;
  const ab = aba==="cnj" ? (_dbPainel.get(k.id)||"") : "";
  const b = (f, rot, frase, cls, on) => `<button type="button" class="db-bt${cls?" "+cls:""}${on?" on":""}" onclick="${f}" title="${esc(frase)}"${on!==undefined?` aria-expanded="${!!on}"`:""}><span aria-hidden="true">${rot}</span><span class="sr-only">${esc(frase)}</span></button>`;
  const tela = aba==="inss" ? "Ver a tela do requerimento no PAT" : aba==="crps" ? "Ver a tela do recurso no e-SISREC" : "";
  const det = aba==="cnj" ? b(`dbPainel('${k.id}','det')`, "Detalhes", "Ver os dados do cabeçalho do processo", "", ab==="det")
    : b(`irSubAba('${aba}')`, "Detalhes", `Abrir a aba ${ROT_FASE[aba]||"do processo"}`);
  const pn = ab==="exp" && exp ? dbExpedientes(k, x) : ab==="det" ? dbDetalhes(k, x) : "";
  return `<div class="db-bts">${b(`lerProcesso('${k.id}','${aba}',${i})`, "Ler", "Ler o processo inteiro", "pri")}${tela ? b(`telaDoProcesso('${k.id}','${aba}',${i})`, "Tela", tela) : ""}${exp ? b(`dbPainel('${k.id}','exp')`, "Expedientes", "Ver os expedientes do PJe", "", ab==="exp") : ""}${det}${b(`baixarProcesso('${k.id}','${aba}',${i})`, "Baixar", "Baixar os documentos do processo (.zip)")}${b(`claudeDoProcesso('${k.id}','${aba}',${i})`, "Claude", "Pedir ao Claude sobre o processo")}${fim}</div>${pn}`;
}
function dbExpedientes(k, x){
  const vs = expedientesDe(k, x.d);
  return `<div class="db-pn" role="region" aria-label="Expedientes de ${esc(x.id)}"><h4>Expedientes</h4>${vs.map(v=>`${vs.length>1?`<h5>${esc(v.grau||"")}</h5>`:""}<div class="db-pn-rol">${tabelaExpedientes(v, k, x.d)}</div>`).join("")}</div>`;
}
const DB_DET = [["Competência", /^compet/i], ["Órgão julgador Atual", /^[óo]rg[ãa]o julgador/i], ["Jurisdição", /^jurisdi/i], ["Autuação", /^autua/i],
  ["Valor da causa", /^valor da causa/i], ["Segredo de justiça?", /^segredo/i], ["Justiça gratuita?", /^justi[çc]a gratuita/i], ["Tutela/liminar?", /^tutela/i],
  ["Prioridade?", /^prioridade/i], ["Polo ativo", /^polo ativo/i], ["Polo passivo", /^polo passivo/i]];
function dbDetalhes(k, x){
  const vs = Object.entries((k.ronda||{}).detalhes||{}).filter(([c])=>c.split("|")[0]===x.d).map(([, v])=>v);
  const f = fmtNum("proc", x.d), linha = (r, v) => `<dt>${esc(r)}</dt><dd>${v}</dd>`;
  const num = linha("Número do Processo", `<button type="button" class="db-n" data-cop="${esc(f)}" data-cop-msg="Número copiado" title="Copiar">${esc(f)}</button>`);
  const corpo = vs.length ? vs.map(v=>{ const ks = Object.keys(v);
      return `${vs.length>1 && v.grau ? `<h5>${esc(v.grau)}</h5>` : ""}<dl class="db-det">${num}${DB_DET.map(([r, rx])=>{ const c = ks.find(q=>rx.test(q)); return c && v[c] ? linha(r, esc(v[c])) : ""; }).join("")}</dl>
        <p class="meio-sub">Lido do PJe em ${dtExp(String(v.em||"").slice(0,16))}</p>`; }).join("")
    : `<dl class="db-det">${num}${x.principal && k.orgao_judicial ? linha("Órgão julgador Atual", esc(k.orgao_judicial)) : ""}</dl>
       <p class="meio-sub">Os demais dados do cabeçalho chegam na próxima leitura do processo pela extensão.</p>`;
  return `<div class="db-pn" role="region" aria-label="Detalhes de ${esc(x.id)}"><h4>Detalhes do processo</h4>${corpo}</div>`;
}
function dashboardDoCaso(k, ands){
  return `<div class="db-dash">${dbDespacho(k, ands)}</div>`;
}
// F467: o Último andamento do portal fica abaixo das anotações do escritório (pedido do Paulo de 09.11.2026)
function dashboardPe(k, ands){
  const fase = faseEfetiva(k);
  let and = dbAndamento(k, ands, fase, false);
  // F499 · só o processo ativo; no Pagamento, o judicial que gerou a RPV (pedido do Paulo, 10.11.2026)
  if(!and && fase==="pagamento") and = dbAndamento(k, ands, "judicial", false);
  const par = trilhaParalela(k) && fase!=="judicial" ? dbAndamento(k, ands, "judicial", true) : "";
  return and || par ? `<div class="db-dash db-pe">${and}${par}</div>` : "";
}
// F499 · o Escritório à esquerda, com o campo de escrever acima e as anotações anteriores abrindo para baixo,
// e os cartões dos processos ativos (INSS, CRPS, Judicial) à direita (opção A ajustada, aprovada pelo Paulo em 10.11.2026)
function dashboardLado(k, ands, painel){
  const pe = dashboardPe(k, ands);
  return `<div class="db-grade"><div class="db-grade-in${pe ? " com-lado" : ""}"><div class="db-col-esq">${dashboardDoCaso(k, ands)}${composerCaso(k)}${quadroAnalises(k, ands)}${painel}</div>${pe ? `<div class="db-col-dir">${pe}</div>` : ""}</div></div>`;
}
// F571 · Análises da IA: as análises feitas nos Projetos do claude.ai chegam pelo conector (registrar_analise)
// e ficam abaixo dos andamentos do escritório; a do caso e as da ficha sem caso, a mais recente aberta.
const _anIa = new Map();
function analisesDoCliente(cliId){
  const m = _anIa.get(cliId); if(m && (m.carregando || Date.now()-m.em < 300000)) return m;
  const novo = {carregando:true, em:Date.now(), itens:[]}; _anIa.set(cliId, novo);
  api(`/rest/v1/analises_ia?select=id,caso_id,titulo,texto,projeto,feita_em,autor_id,criado_em&cliente_id=eq.${cliId}&order=feita_em.desc,criado_em.desc&limit=30`)
    .then(r=>{ novo.itens = r||[]; }).catch(()=>{ novo.itens = []; })
    .finally(()=>{ novo.carregando = false; novo.em = Date.now(); if(novo.itens.length) repintarFicha(); });
  return novo;
}
function quadroAnalises(k, ands){
  const m = analisesDoCliente(k.cliente_id);
  const its = m.itens.filter(a=>!a.caso_id || a.caso_id===k.id); if(!its.length) return "";
  const notaNova = (ands||[]).filter(a=>!ehOficial(a) && !ORIGENS_ROBO.includes(a.origem) && !a.excluir).map(a=>String(a.criado_em||"").slice(0,10)).sort().pop()||"";
  const um = (a, i) => {
    const au = (D.colPorId.get(a.autor_id)||{}).nome||"";
    const sub = [dataBR(a.feita_em), a.projeto, au ? `gravada por ${au.split(" ")[0]}` : ""].filter(Boolean).map(esc).join(" · ");
    const corpo = `<p class="an5-txt">${esc(a.texto)}</p>`;
    return i ? `<details class="an5-it"><summary><b>${esc(a.titulo)}</b> <span class="an5-sub">${sub}</span></summary>${corpo}</details>`
             : `<div class="an5-it"><b>${esc(a.titulo)}</b> <span class="an5-sub">${sub}</span>${notaNova > a.feita_em ? `<p class="an5-aviso">Há anotação do escritório posterior a esta análise.</p>` : ""}${corpo}</div>`;
  };
  return `<section class="an5" aria-label="Análises da IA"><div class="an5-cab"><b>Análises da IA</b><span class="an5-sub">${its.length}</span></div>${its.map(um).join("")}</section>`;
}
function ligarCartoes(){
  pintarCursor();                     // o cursor do teclado sobrevive ao render
  document.querySelectorAll(".cartao[data-cli]").forEach(el=>{
    // F150 · intenção de abrir: 100 ms parado em cima (ou o dedo encostou) já
    // busca a ficha, e o clique encontra os dados a caminho ou prontos
    el.onpointerenter=e=>{ if(e.pointerType==="mouse"){ clearTimeout(el._pre); el._pre=setTimeout(()=>preCarregarFicha(el.dataset.cli),100);
      clearTimeout(el._ult); if(el.dataset.casos) el._ult=setTimeout(()=>mostrarUltAnot(el),350); } };   // F438
    el.onpointerleave=()=>{ clearTimeout(el._pre); clearTimeout(el._ult); esconderUltAnot(); };
    el.onpointerdown=e=>{ el._toque = e.pointerType!=="mouse"; preCarregarFicha(el.dataset.cli); };
    el.onmousedown=e=>{ if(e.shiftKey) e.preventDefault(); };   // F443 · o Shift+clique não seleciona texto
    el.onclick=e=>{
      if(e.target.dataset.estrela!==undefined) return;
      if(e.shiftKey || (_sel.size && el._toque)){ e.preventDefault(); return alternarSel(el); }   // F443 · seleção múltipla
      clearTimeout(el._ult); esconderUltAnot();
      if(!e.ctrlKey && !e.metaKey && pcliLigado()) return abrirPainelCli(el);   // F647 · o clique na linha de qualquer lista abre o painel lateral (a extensão F455 saiu)
      if(el.dataset.casos && extLigada() && !e.ctrlKey && !e.metaKey) return alternarExt(el);   // F455 · a linha se estende
      abrirDaLinha(el);
    };
    el.oncontextmenu=e=>{ if(el._segurou) return e.preventDefault(); menuMover(e, el.dataset.cli, el); };   // botão direito = Mover para…
    // F137 · no celular não há botão direito (o iPhone nem dispara o
    // contextmenu): tocar e segurar meio segundo abre o mesmo menu
    el.ontouchstart=e=>{ const t=e.touches[0]; el._segurou=false; clearTimeout(el._seg);
      el._seg=setTimeout(()=>{ el._segurou=true;
        menuMover({preventDefault(){}, clientX:t.clientX, clientY:t.clientY}, el.dataset.cli, el); },500); };
    el.ontouchmove=()=>clearTimeout(el._seg);
    el.ontouchend=e=>{ clearTimeout(el._seg); if(el._segurou) e.preventDefault(); };   // sem o clique que abriria a ficha
  });
  ligarArrasteCartoes();
  pintarSel();
  reabrirExt();   // F455 · a extensão aberta atravessa o render, com o texto já escrito
  // ⭐/🔥 acendem NO LUGAR: o render() inteiro aqui jogava a lista de volta
  // ao topo — marcar o 60º cliente devolvia a tela ao 1º. Só a visão
  // ⭐ Importante re-renderiza (lá o cartão precisa entrar/sair da lista).
  document.querySelectorAll("[data-estrela]").forEach(b=>b.onclick=async e=>{
    e.stopPropagation();
    const k = D.casoPorId.get(b.dataset.estrela); if(!k) return;
    k.importante = !k.importante;
    await patchCaso(k.id, {importante:k.importante});
    b.classList.toggle("on", k.importante);
    montarSidebar();
    if(visao==="importante") render();
  });
  document.querySelectorAll("[data-estrela-t]").forEach(b=>b.onclick=async e=>{   // F464 · a tarefa pessoal
    e.stopPropagation();
    const t = (D.tarefas||[]).find(x=>x.id===b.dataset.estrelaT); if(!t) return;
    const v = !t.importante;
    try{ await api(`/rest/v1/tarefas?id=eq.${t.id}`,{method:"PATCH", headers:{Prefer:"return=minimal"}, body:JSON.stringify({importante:v})}); }
    catch(_){ return aviso("Não gravou — tente de novo"); }
    t.importante = v; b.classList.toggle("on", v);
  });
  document.querySelectorAll("[data-estrela-cli]").forEach(b=>b.onclick=async e=>{   // F464 · sem caso na linha
    e.stopPropagation();
    await estrelaFicha(b.dataset.estrelaCli);
    b.classList.toggle("on", ativos().some(x=>x.cliente_id===b.dataset.estrelaCli && x.importante));
  });
  document.querySelectorAll("[data-fogo]").forEach(b=>b.onclick=async e=>{
    e.stopPropagation();
    const k = D.casoPorId.get(b.dataset.fogo); if(!k) return;
    k.urgente = !k.urgente;
    await patchCaso(k.id, {urgente:k.urgente});
    b.classList.toggle("on", k.urgente);
    aviso(k.urgente?"🔥 Marcado como URGENTE":"Urgência removida");
  });
  document.querySelectorAll("[data-despachar]").forEach(b=>b.onclick=e=>despachar(b.dataset.despachar, e));
  document.querySelectorAll(".avatares[data-equipe]").forEach(a=>a.onclick=e=>{
    e.stopPropagation(); abrirFicha(a.dataset.equipe);   // a equipe fica no menu vertical da ficha
  });
}

let vistaAnimada="";
// F378 · as visões de data viram abas do Planejado (decisão do Paulo, 02.11.2026): a tela de cada aba é a de antes, com a
// barra das abas no alto e o nome Planejado
function render(){ renderBase(); if(!buscaTxt && ehAbaPlan(visao)) barraPlanejado(); filtroPessoaNoMais(); armarVoltar(); }
// F463 · no celular o filtro por pessoa mora no ⋯ da lista (pedido do Paulo, 09.11.2026): o do Meu Dia, do Planejado e do
// Dashboard (seg-colab do topo) e o das listas de fase, Minhas e Importante (os chips de inicial) saem do alto e viram a
// linha "Pessoa" do menu; os botões vão com os cliques já ligados, por isso roda depois de tudo pintado
function filtroPessoaNoMais(){
  if(!celular()) return;
  const el = document.getElementById("lista-opc"), mais = document.getElementById("topo-mais");
  if(!el || !mais || !mais.offsetParent) return;
  const seg = document.querySelector('#topo-extra .seg-colab[aria-label="Filtrar por pessoa"]');
  const chips = [...document.querySelectorAll("#conteudo-meio .filtros [data-fcol]")];
  if(!seg && !chips.length) return;
  const ln = document.createElement("div"); ln.className = "lo-ln lo-pessoa"; ln.innerHTML = "<span>Pessoa</span>";
  if(seg) ln.appendChild(seg);
  else { const g = document.createElement("div"); g.className = "seg-colab"; g.setAttribute("role", "group"); g.setAttribute("aria-label", "Filtrar por pessoa"); chips.forEach(b=>g.appendChild(b)); ln.appendChild(g); }
  el.prepend(ln);
}
function renderBase(){
  aplicarTema(); marcarBarraCel();
  if(visaoColab() && !listasDoColab().includes(visao) && !(souAdmin() && ["config","auditoria"].includes(visao))) visao = visaoInicialColab();   // F253 · as telas do administrador abrem em qualquer nível
  // o fade só quando a VISTA muda (trocar de lista, pesquisar) — render()
  // também roda em clique de chip/estrela e piscaria a cada toque
  const chaveVista=visao+"|"+(buscaTxt||"");
  if(chaveVista!==vistaAnimada){
    vistaAnimada=chaveVista;
    const mAn=document.getElementById("conteudo-meio");
    if(mAn){ mAn.classList.remove("anim-vista"); void mAn.offsetWidth; mAn.classList.add("anim-vista"); }
  }
  // "Ordenar" só faz sentido em lista de clientes; no calendário, no quadro
  // ou no dashboard era um controle morto ocupando o topo
  const LISTAS_ORDENAVEIS = ["minhas","importante","meudia","planejado"];   // F236 · 💰 Recebimentos tem ordem própria: o vencido mais antigo primeiro
  document.querySelector(".ordenar").style.display =
    (buscaTxt || visao.startsWith("fase:") || LISTAS_ORDENAVEIS.includes(visao)) ? "" : "none";
  pintarOpcLista();
  const h1=document.getElementById("titulo-lista"), sub=document.getElementById("sub-lista"),
        meio=document.getElementById("conteudo-meio");
  if(buscaTxt){
    tituloLista("🔍 Pesquisa");
    const achados = pesquisar(buscaTxt).slice(0,200), novo = saidaNovoCliente(buscaTxt, achados);
    sub.textContent=`${achados.length} cliente(s) encontrados`;
    meio.innerHTML = (achados.map(c=>cartaoCliente(c)).join("") || (novo ? "" : "<p class='meio-sub'>Nada encontrado.</p>")) + novo;
    return ligarCartoes();
  }
  if(visao==="direito") return renderDireito();
  if(visao==="dashboard") return renderDash();
  if(visao==="fase:aposentadoria_futura") return renderCardsApos();   // F218 · os cards, não os casos da fase
  if(visao==="agenda") return renderAgenda();
  if(visao==="clientes") return renderClientesTodos();   // F250
  if(visao==="contatos") return renderContatos();   // F586
  if(visao==="contribuicoes") return renderContribuicoes();   // F602
  if(visao==="calendario") return renderCalendario();
  if(visao==="particulares") return renderParticulares();
  if(visao==="meudia") return renderMeuDia();
  if(visao==="novocliente") return renderNovoCliente();
  if(visao==="claude") return renderClaude();
  if(visao==="mencoes") return renderMencoes();
  if(visao==="docmodelos") return renderModelosDoc();
  if(visao==="quadro") return renderQuadro();
  if(visao==="tabela") return renderTabela();
  if(visao==="periciasaviso") return renderPericiasAviso();   // F549
  if(visao==="sugestoesdia") return renderSugestoesDia();   // F574
  if(visao==="pessoas") return renderPessoas();
  if(/^quadro[123]$/.test(visao)) return renderQuadroN(+visao.slice(-1));
  if(visao==="vendas") return renderVendas();
  if(visao==="whatsapp") return renderWhats();
  if(visao==="novidades") return renderNovidades();
  if(visao==="acervo") return renderAcervo();
  if(visao==="patinss") return renderImportarPat();
  if(visao==="config") return souAdmin() ? renderConfig() : renderMeuDia();
  if(visao==="auditoria") return souAdmin() ? renderAuditoria() : renderMeuDia();
  if(visao==="parcerias") return renderParcerias();
  if(visao==="marketing") return renderMarketing();

  if(visao==="rotinas") return renderRotinas();
  if(visao==="planejado") return renderPlanejado();
  if(visao==="agendaq") return renderAgendaQuarta();
  if(visao==="recebimentos") return renderRecebimentos();   // F236 · o dinheiro, parcela por parcela, sem filtro por pessoa
  let casosSel, titulo, subt="Clique no cliente para abrir a ficha completa.";
  if(visao==="minhas"){ titulo="👤 Atribuídas a mim"; casosSel=ativos().filter(k=>
    (D.atrDoCaso.get(k.id)||[]).includes(eu.id)
    || (D.tarefasPorCaso.get(k.id)||[]).some(t=>t.colaborador_id===eu.id)); }
  else if(visao==="importante"){ titulo="⭐ Importante"; casosSel=ativos().filter(k=>k.importante);
    subt="As anotações marcadas ⭐/⚡, os processos importantes e, no topo, o que os portais trouxeram e ninguém leu ainda."; }
  else if(visao.startsWith("fase:")){ const f=visao.slice(5);
    titulo=(FASES.find(x=>x[0]===f)||[])[1] || NOME_FASE[f] || (f==="marcos" ? "☕ Marcos" : f); casosSel=casosDaFase(f);
    // F38 · Tarefas com Prazo ordena pela DATA FATAL: o mais urgente no topo,
    // sem data no fim — é o controle apertado que a lista existe para dar
    if(f==="prazo") casosSel.sort((a,b)=>String(a.prazo||"9999").localeCompare(String(b.prazo||"9999"))); }
  else if(visao==="checagem"){ titulo="🔎 Checagem manual";
    // F68 · quem nunca foi checado vem primeiro; depois, do checado há mais
    // tempo para o mais recente — a ordem É a fila de trabalho
    casosSel=ativos().filter(k=>k.acompanhamento==="manual")
      .sort((a,b)=>String(a.checado_em||"").localeCompare(String(b.checado_em||"")));
    subt="Casos marcados como acompanhamento MANUAL (ex.: E-SISREC com a senha do cliente). O ✓ no cartão do caso registra a checagem — nunca checados primeiro, depois os mais antigos."; }
  else { titulo=visao; casosSel=[]; }
  tituloLista(titulo); sub.textContent=subt;
  // F236 · as listas abrem na pessoa (decisão do Paulo, 17.10.2026); filtradas, dizem quantas mostram de quantas
  // e segue a regra única de "de quem é" (ehDoColab), com a conta do que ficou de fora
  const nTodos = casosSel.length;
  if(filtroColab) casosSel = casosSel.filter(k=>ehDoColab(k, filtroColab));
  const chipsCol = `<div class="filtros">`+[`<button class="fchip ${filtroColab===null?"on":""}" data-fcol="">Todos</button>`]
    .concat(equipeAtiva().map(x=>
      `<button class="fchip fchip-ini ${filtroColab===x.id?"on":""}" data-fcol="${x.id}" title="${esc(x.nome)}">`+
      `<span class="avatar mini" style="background:${x.cor}">${esc(x.inicial)}</span></button>`)).join("")
    +(filtroColab && visao!=="minhas" ? `<span class="meio-sub filtro-conta" style="align-self:center">mostrando ${casosSel.length} de ${nTodos}</span>` : "")
    +(visao==="importante" ? `<button class="fchip ${matrizImp?"on":""}" id="chip-matriz" aria-pressed="${matrizImp}" style="margin-left:auto">▦ Matriz importante × urgente</button>` : "")+`</div>`;
  // na lista INSS, os casos em exigência (prazo legal de 30 dias) vêm primeiro
  const emExig = casosSel.filter(emExigencia);
  if(visao==="fase:inss" && (emExig.length || soExigencia)){
    const resto = casosSel.filter(k=>!emExigencia(k));
    // quem tem prazo anotado vem primeiro, do mais apertado; depois os que o
    // INSS marcou e ainda não tiveram o prazo registrado aqui
    emExig.sort((a,b)=>(a.exigencia_prazo||"9999")<(b.exigencia_prazo||"9999")?-1:1);
    const chipExigencia = `<div class="filtros" style="margin-top:-4px">
      <button class="fchip ${soExigencia?"on":""}" id="chip-exig">⚠ Só exigências (${emExig.length})</button>
      ${emExig.some(k=>!k.exigencia_prazo)?`<span class="meio-sub" style="align-self:center">
        ${emExig.filter(k=>!k.exigencia_prazo).length} vieram do INSS sem prazo anotado — abra e registre a exigência</span>`:""}
    </div>`;
    meio.innerHTML = chipsCol + chipExigencia
      + `<h3 class="secao" style="color:var(--vermelho)">⚠ Em exigência — prazo de 30 dias (${emExig.length})</h3>`
      + (grupoClientes(emExig).map(([c,ks])=>cartaoCliente(c,ks)).join("")
         || "<p class='meio-sub'>Nenhuma exigência aberta. 👏</p>")
      + (soExigencia ? "" : `<h3 class="secao">Demais requerimentos (${resto.length})</h3>`
        + grupoClientes(resto).map(([c,ks])=>cartaoCliente(c,ks)).join(""));
    const ce = document.getElementById("chip-exig");
    if(ce) ce.onclick = () => { soExigencia = !soExigencia; render(); };
  } else {
    // ⭐ IMPORTANTE ABRE COM AS NOVIDADES. É a lista onde ele passa o dia; pôr
    // ali o que os portais trouxeram encurta o caminho entre a mudança
    // acontecer e alguém saber dela. Só as primeiras, com o resto a um clique
    // — a lista continua sendo a do que ELE marcou, não uma segunda caixa.
    // 🙋 Escritório: primeiro quem está em atendimento (cadastro sem caso), e
    // só depois os casos antigos que a lista ainda carrega
    // F236 · com o filtro por pessoa, o bloco mostra os atendimentos dela, em vez de sumir
    const emAtend = visao==="fase:escritorio" ? clientesEmAtendimento().filter(c=>!filtroColab || doAtendimentoDe(c, filtroColab)) : [];
    if(visao==="importante" && matrizImp) meio.innerHTML = chipsCol + matrizImportante(filtroColab); else
    meio.innerHTML = chipsCol + (visao==="importante" ? blocoSinalizados() + blocoNovidadesTopo() : "")
      + (emAtend.length?`<h3 class="secao">🟡 Em atendimento — buscando documentos (${emAtend.length})</h3>`
          + emAtend.map(c=>cartaoCliente(c,[])).join(""):"")
      + ((visao==="fase:escritorio" && casosSel.length)
          ?`<h3 class="secao">Pré-casos no escritório (${casosSel.length})</h3>`:"")
      + ((gs=>{ const agr = opcLista("agrupar");
          // F437 · o ⋯ agrupa por lista, responsável ou espécie; "Data" é a lista corrida de antes
          if(agr!=="data" && !(agr==="lista" && visao.startsWith("fase:"))) return emGrupos(gs, ([c,ks])=>chaveGrupo(agr, ks[0],
            (D.atrDoCaso.get(ks[0].id)||[]).map(id=>D.colPorId.get(id)).filter(Boolean)), ([c,ks])=>cartaoCliente(c,ks));
          return gs.map(([c,ks])=>cartaoCliente(c,ks)).join(""); })((gs=>{ if(visao==="fase:prazo" && opcLista("ordem")==="prazo") gs.sort((x,y)=>{
            const m=ks=>ks.map(k=>k.prazo).filter(Boolean).sort()[0]||"9999";
            return m(x[1]).localeCompare(m(y[1])); }); return gs; })(grupoClientes(casosSel)))
      || (emAtend.length?"":"<p class='meio-sub'>Nenhum cliente aqui.</p>"));
    if(visao==="importante"){
      const v = document.getElementById("ver-novidades");
      if(v) v.onclick = () => { visao="novidades"; render(); };
      document.querySelectorAll("[data-ler]").forEach(b=>b.onclick=e=>{
        e.stopPropagation(); marcarLidas([b.dataset.ler]); });
    }
  }
  document.querySelectorAll("[data-fcol]").forEach(b=>b.onclick=()=>{ filtroColab=b.dataset.fcol||null; render(); });
  const cm = document.getElementById("chip-matriz"); if(cm) cm.onclick = () => { matrizImp = !matrizImp; render(); };
  ligarCartoes();
  // F236 · a linha diz o próximo passo: o texto da tarefa vem do banco na primeira vez
  buscarTextosAgenda(casosSel.map(k=>(agendaPorCaso().get(k.id)||{}).andId).filter(Boolean));
}

// F295 · a matriz importante × urgente (Onda D do fluxo do To Do): a ⭐ e o ⚡ do caso em quatro quadros. O quarto
// (nem ⭐ nem ⚡) é o acervo inteiro, por isso só conta
let matrizImp = false;
function matrizImportante(col){
  const ks = ativos().filter(k=>(k.importante || k.urgente) && (!col || ehDoColab(k, col)));
  const q = (tit, sub, f, tom) => { const g = ks.filter(f);
    return `<section class="mz-q" data-tom="${tom}"><h3 class="secao">${tit} <span class="pl-n">${g.length}</span></h3><p class="meio-sub">${sub}</p>`
      + (grupoClientes(g).map(([c,x])=>cartaoCliente(c,x)).join("") || `<p class="meio-sub">Nenhum.</p>`) + `</section>`; };
  const resto = ativos().filter(k=>!k.importante && !k.urgente && (!col || ehDoColab(k, col))).length;
  return `<div class="mz-grade">`
    + q("⭐⚡ Importante e urgente", "Fazer hoje.", k=>k.importante && k.urgente, "venc")
    + q("⚡ Urgente, sem ⭐", "Resolver rápido ou passar a outra pessoa.", k=>k.urgente && !k.importante, "hoje")
    + q("⭐ Importante, sem urgência", "Marcar a data de volta.", k=>k.importante && !k.urgente, "")
    + `<section class="mz-q"><h3 class="secao">Nem ⭐ nem ⚡ <span class="pl-n">${resto}</span></h3><p class="meio-sub">Seguem nas listas pela data de volta.</p></section>`
    + `</div>`;
}

// ── Meu Dia (com filtro por colaborador) ──────────────────────────────────
function renderMeuDia(){
  if(temaV10()) return renderAgendaV10("meudia");
  tituloLista("☀️ Meu Dia");
  // como no To Do: saudação e a data por extenso — dá o contexto do dia sem
  // ninguém ter que procurar o calendário
  const h=agoraSP().getHours();   // saudação pelo relógio de Brasília
  const saud = h<12 ? "Bom dia" : h<18 ? "Boa tarde" : "Boa noite";
  const dia = new Date(hoje()+"T12:00:00").toLocaleDateString(IDIOMA,
    {weekday:"long", day:"numeric", month:"long"});
  document.getElementById("sub-lista").innerHTML =
    `<span class="md-saud">${saud}, ${esc((eu.nome||"").split(" ")[0])}</span> · ${dia}`;
  const filtroColab = filtroDia;   // F236 · o Meu Dia tem filtro próprio; as listas têm o delas
  const doDia = D.meudia.filter(m=>!filtroColab || m.colaborador_id===filtroColab);
  const casosDia = doDia.filter(m=>m.caso_id).map(m=>D.casoPorId.get(m.caso_id)).filter(Boolean);
  const doColab = k => !filtroColab || (D.atrDoCaso.get(k.id)||[]).includes(filtroColab);
  const tfDo = (k, teste) => (D.tarefasPorCaso.get(k.id)||[])
    .some(t=>(!filtroColab || t.colaborador_id===filtroColab) && teste(t.lembrar_em));
  const hojeK = ativos().filter(k=>(k.prazo===hoje() && doColab(k)) || tfDo(k, d=>d===hoje()))
    .filter(k=>!casosDia.includes(k));
  const vencK = ativos().filter(k=>(k.prazo && k.prazo<hoje() && doColab(k)) || tfDo(k, d=>d<hoje()))
    .filter(k=>!casosDia.includes(k));
  const tCol = t => !filtroColab || t.particular_de===filtroColab || !t.particular_de;
  const docsPc = docsPreCasoComData();   // F93 · pedidos do pré-caso com data
  const tHoje = [...D.tarefas.filter(t=>!t.concluida && t.prazo===hoje()), ...docsPc.filter(t=>t.prazo===hoje())].filter(tCol);
  const tVenc = [...D.tarefas.filter(t=>!t.concluida && t.prazo && t.prazo<hoje()), ...docsPc.filter(t=>t.prazo<hoje())].filter(tCol);
  const apos = itensApos(), lemb = itensLembretes();
  const nVenc = vencK.length + tVenc.length + apos.antes.length + lemb.antes.length;
  const chips = [`<button class="fchip ${filtroColab===null?"on":""}" data-f="">Todos</button>`]
    .concat(equipeAtiva().map(c=>
      `<button class="fchip fchip-ini ${filtroColab===c.id?"on":""}" data-f="${c.id}" title="${esc(c.nome)}">`+
      `<span class="avatar mini" style="background:${c.cor}">${esc(c.inicial)}</span></button>`))
    .concat([`<button class="fchip ${filtroVencidas?"on":""}" id="chip-vencidas" style="margin-left:auto">🔴 mostrar vencidas (${nVenc})</button>`]);
  // F123 · MEU DIA É O QUE VENCE HOJE, E NADA MAIS (decisão do Paulo,
  // 20.09.2026). Entram as três naturezas de data, prazo fatal, compromisso e
  // lembrete, numa LISTA SÓ. O aviso de aposentadoria e o lembrete do cliente
  // são lembrete como qualquer outro, então perderam a seção própria e entram
  // aqui dentro. A rotina do escritório, os recursos do CRPS para conferir à
  // mão e o CadÚnico saíram para 🧹 Cuidar do acervo: são conferência
  // periódica, não data que vence. Fica o aviso do crachá do CRPS, que não é
  // lista, é pane do robô.
  // e VENCE HOJE é só o de hoje: o aviso que já passou da data é atrasado, e
  // atrasado mora atrás do 🔴, senão a tela do dia vira a lista de tudo
  const nHoje = hojeK.length + tHoje.length + apos.hoje.length + lemb.hoje.length;
  document.getElementById("conteudo-meio").innerHTML =
    `<div class="filtros">${chips.join("")}</div>`
    + avisoCRPS()
    + `<h3 class="secao">☀️ Adicionados ao dia (${casosDia.length})</h3>`
    + (grupoClientes(casosDia).map(([c,ks])=>cartaoCliente(c,ks)).join("") || `<p class='meio-sub'>Nada adicionado — ${celular()?"toque e segure":"clique com o botão direito"} num cliente e escolha ☀️ Adicionar ao Meu Dia.</p>`)
    + secaoDiasAnteriores(filtroColab)
    + (!mdMostraVence() ? "" : `<h3 class="secao">🟡 Vencem hoje (${nHoje})</h3>`
    + (grupoClientes(hojeK).map(([c,ks])=>cartaoCliente(c,ks)).join("")
       + tHoje.map(t=>cartaoTarefa(t)).join("")
       + apos.hoje.join("") + lemb.hoje.join("") || "<p class='meio-sub'>Nada vence hoje. 🎉</p>"))
    + (filtroVencidas ? `<h3 class="secao">🔴 Vencidas (${nVenc})</h3>`
       + (grupoClientes(vencK).map(([c,ks])=>cartaoCliente(c,ks)).join("")
          + tVenc.map(t=>cartaoTarefa(t)).join("")
          + apos.antes.join("") + lemb.antes.join("") || "<p class='meio-sub'>Nenhuma vencida. 👏</p>") : "");
  document.querySelectorAll(".fchip[data-f]").forEach(b=>b.onclick=()=>{ filtroDia=b.dataset.f||null; render(); });
  document.getElementById("chip-vencidas").onclick=()=>{ filtroVencidas=!filtroVencidas; render(); };
  document.querySelectorAll("[data-revks]").forEach(b=>b.onclick=e=>{
    e.stopPropagation(); marcarRevisado(b.dataset.revks.split(",")); });
  ligarCartoes(); ligarTarefas(); ligarSecoes();
}

// F79 — as seções do Meu Dia recolhem: clicar no título (a flechinha mostra o
// estado) esconde as linhas até o próximo título; clicar de novo traz de
// volta. Genérico: vale para TODA <h3 class="secao"> do Meu Dia, inclusive as
// que ainda não existem. O contador do título continua visível recolhido.
function chaveSecao(h){
  return h.textContent.replace(/\(\d+\)/g,"")
    .replace(/[^\p{L}\p{N}]+/gu,"-").toLowerCase().replace(/^-+|-+$/g,"");
}
function ligarSecoes(){
  document.querySelectorAll("#conteudo-meio h3.secao").forEach(h=>{
    const ch=chaveSecao(h);
    if(!h.querySelector(".sec-seta")){
      const s=document.createElement("span");
      s.className="sec-seta"; s.textContent="▾"; h.prepend(s);
    }
    h.classList.add("sec-clic");
    const aplicar=()=>{
      const fechada=secRecolhida.has(ch);
      h.querySelector(".sec-seta").textContent=fechada?"▸":"▾";
      let el=h.nextElementSibling;
      while(el && !(el.tagName==="H3" && el.classList.contains("secao"))){
        el.style.display=fechada?"none":""; el=el.nextElementSibling;
      }
    };
    h.onclick=()=>{
      secRecolhida.has(ch) ? secRecolhida.delete(ch) : secRecolhida.add(ch);
      aplicar();
    };
    aplicar();
  });
}

// ── aplicar a coleta do e-Recursos ────────────────────────────────────────
// A extensão entrega o que o portal respondeu, cru. Aqui isso vira: o bloco
// `casos.crps` atualizado (que é o que a aba 🖥 Recurso mostra) e, para cada
// movimento NOVO, um andamento em 📣 Novidades.
//
// A chave é a "impressão digital" do evento — data + status cru —, a mesma
// que o robô de linha de comando usa. Sem ela, os mesmos movimentos virariam
// comentário de novo a cada rodada, porque o portal devolve sempre a lista
// inteira.
function planoCrps(coleta, D){
  const itens = (coleta && coleta.itens) || {};
  const porNup = new Map();
  for (const k of (D.casos||[]))
    for (const n of nupsDoCaso(k)) porNup.set(n, k);

  const plano = { blocos: [], andamentos: [], semCaso: [], resumo: {} };
  const jaVisto = new Map();
  for (const a of (D.novid||[]))
    if (a.origem === "crps" && a.origem_id) jaVisto.set(a.origem_id, true);

  for (const [chave, json] of Object.entries(itens)){
    if (!json || typeof json !== "object") continue;
    const nup = (chave.split("_")[0]||"").replace(/\D/g,"");
    const k = porNup.get(nup);
    const bloco = CRPS.traduzirProcesso(json);
    if (!k) {
      // F88 · NÚMERO SEM CASO NÃO É NÚMERO SEM DONO. O recurso traz o nome do
      // recorrente; era só ninguém estar olhando para ele. Quando o nome bate
      // com UM cliente que tem UM caso ativo sem NUP, o vínculo sai num
      // clique; quando não bate, a busca resolve à mão. Sem isso, 46 recursos
      // ficavam de fora de toda coleta, calados.
      const nome = (bloco.recorrentes||[])[0] || "";
      const cands = nome ? (D.clientes||[]).filter(x=>nomesBatemPje(x.nome, nome)) : [];
      const cli = cands.length===1 ? cands[0] : null;
      const alvos = cli ? (D.casosDoCliente.get(cli.id)||[])
        .filter(x=>x.fase!=="encerrado" && !nupsDoCaso(x).length) : [];
      plano.semCaso.push({ nup, status: bloco.status, nome,
        num_proc: bloco.num_proc || "", orgao: bloco.orgao_atual || "",
        sugestao: (cli && alvos.length===1)
          ? {caso_id:alvos[0].id, cliente_nome:cli.nome, caso_titulo:tituloCaso(alvos[0])} : null,
        sugestao_novo: (cli && !alvos.length) ? {cliente_id:cli.id, cliente_nome:cli.nome} : null });
      continue;
    }
    plano.blocos.push({ caso_id: k.id, nup, bloco });
    // F236 · o comentário sabe da alçada (decisão só médica da Junta é definitiva) e o andamento leva o efeito da
    // decisão e a sessão, que a importação grava no caso e na agenda
    const alcada = alcadaJunta(k);
    for (const e of bloco.eventos){
      if (CRPS.TIPOS_SILENCIOSOS.has(e.tipo)) continue;
      const id = `${nup}|${CRPS.chaveEvento(e)}`;
      if (jaVisto.has(id)) continue;
      jaVisto.set(id, true);
      plano.andamentos.push({ caso_id: k.id, nup, origem_id: id,
        quando: (CRPS.dataParaISO(e.data)||"").slice(0,10) || null,
        texto: CRPS.comentarioDoEvento(e, {alcada}), decisao: e.tipo === "decisao",
        efeito: CRPS.efeitoDecisao(e), instancia: (CRPS.orgaoJulgador(e.bruto||"")||{}).instancia || 0,
        sessao: CRPS.sessaoDoStatus(e.bruto) });
    }
  }
  // recurso marcado como "não é nosso" sai da conferência inteira
  const fora = new Set(crpsIgnorados());
  const ignorados = plano.semCaso.filter(x=>fora.has(x.nup)).length;
  plano.semCaso = plano.semCaso.filter(x=>!fora.has(x.nup));
  plano.resumo = { lidos: Object.keys(itens).length, casos: plano.blocos.length,
                   movimentos: plano.andamentos.length,
                   decisoes: plano.andamentos.filter(a=>a.decisao).length,
                   sem_caso: plano.semCaso.length, ignorados,
                   vinculaveis: plano.semCaso.filter(x=>x.sugestao).length };
  return plano;
}

// CONFERIR ANTES, TAMBÉM AQUI. A coleta do INSS já mostrava o plano e a do
// CRPS gravava direto — duas portas com regras diferentes para a mesma
// pergunta ("o que isto vai escrever nas fichas?"). Agora as duas param e
// mostram primeiro.
// ── ⚖️ a coleta do PJe (acervo do TRF3) ──────────────────────────────────
// A extensão lê a aba Acervo do painel do advogado: TODOS os processos, cada
// um com o último movimento — a ciência completa que o Paulo pediu, sem
// depender de expediente. Aqui a coleta vira plano: movimento que a ficha
// ainda não tem vira andamento origem='pje' (e 📣 Novidade); o resto é
// silêncio contado. Dedupe pela chave numero+data+hora em origem_id — cinco
// coletas por dia não duplicam nada.
let planoPjeAtual = null;
async function conferirPje(coletaId){
  if(!coletaId) return render();   // veio das Novidades, sem coleta: só redesenha
  try{
    const [c] = await api(`/rest/v1/coletas?select=*&id=eq.${coletaId}`) || [];
    if(!c) return aviso("Não achei essa coleta");
    const dados = c.dados || {};
    // a memória vem do banco na hora, como no PAT — lição da 08.58. Além da
    // chave exata, o MOMENTO (processo+data+hora) de tudo que já está gravado
    // — inclusive pelo histórico completo (hist:) — para o acervo não regravar
    // como novo um movimento que o histórico do processo já trouxe.
    // sem .catch: a memória que não veio não pode virar "tudo é novo"; a coleta espera a próxima rodada
    const bancoPje = await todas("andamentos",
      "select=origem_id,texto&origem=eq.pje&origem_id=not.is.null");
    const vistos = new Set(bancoPje.map(a=>a.origem_id));
    const momentos = momentosPje(bancoPje), ultimas = ultimasDatasPje(momentos);
    // F131 · o caso casa pelo número principal E pelos números anexos
    // (casos.processos, onde o cumprimento de sentença entra à mão)
    const porProcesso = new Map();
    // F189 · o mesmo número em vários casos (o processo de 2007 tinha 4, 3
    // encerrados): os encerrados entram primeiro e o aberto passa por cima
    const fechado = k => !!k.encerrado_em;
    for(const k of [...D.casos].sort((a,b)=>fechado(b)-fechado(a))){
      const dig = soDig(k.processo);
      if(dig) porProcesso.set(dig, k);
      for(const px of (Array.isArray(k.processos)?k.processos:[])){
        const d2 = soDig(px && (px.numero||px));
        if(d2 && (!porProcesso.has(d2) || fechado(porProcesso.get(d2)))) porProcesso.set(d2, k);
      }
    }
    const plano = { coleta_id: coletaId, grau: dados.grau||"", host: dados.host||"",
                    sistema: dados.sistema||"", andamentos: [], semCaso: [],
                    fichas: [], docs: [],
                    resumo: { lidos:(dados.processos||[]).length, movimentos:0,
                              sem_caso:0, sem_mudanca:0, vinculaveis:0, fichas:0, ignorados:0 } };
    // processos marcados como "não é caso nosso" (instrumental, de terceiro
    // — o do pai da Alicia, usado só para a certidão de cárcere) ficam fora
    const fora = new Set(pjeIgnorados());
    const paiDe = new Map();   // número do incidente → número do seu processo principal, nesta coleta
    for(const p of (dados.processos||[])) if(p.principal && soDig(p.numero)!==soDig(p.principal)) paiDe.set(soDig(p.numero), soDig(p.principal));
    for(const p of (dados.processos||[])){
      if(fora.has(soDig(p.numero))){ plano.resumo.ignorados++; continue; }
      // o incidente do e-SAJ (cumprimento, RPV, precatório) casa pelo seu
      // número ou pelo "Processo principal" que a ficha dele aponta
      // a RPV aponta para o cumprimento, e o cumprimento para o processo
      // principal: sobe a cadeia (dois degraus) até achar um número da ficha
      const k = porProcesso.get(soDig(p.numero)) || (p.principal ? porProcesso.get(soDig(p.principal)) : null)
        || (p.principal && paiDe.get(soDig(p.principal)) ? porProcesso.get(paiDe.get(soDig(p.principal))) : null);
      if(!k){
        // SEM NÚMERO NA FICHA ≠ SEM CLIENTE NO CRM: 142 dos processos do
        // acervo eram de clientes da casa com o campo "processo" vazio. O
        // nome da parte (o lado que não é o INSS) casa com a base — quando
        // bate com UM cliente que tem UM caso ativo sem número, o vínculo
        // sai daqui mesmo, num clique, e o processo passa a casar sozinho.
        // Nome que só bate de um jeito tolerante ("JOAO APARECIDO AGUILERA
        // AMBROSIO" vs "João Aparecido Ambrosio") também vale — desde que
        // bata com UM cliente só. E cliente certo SEM caso vago (o segundo
        // processo da mesma pessoa) ganha o "➕ criar caso" com o número.
        const nome = clienteDasPartes(p.partes);
        const cands = nome ? D.clientes.filter(x=>nomesBatemPje(x.nome, nome)) : [];
        const cli = cands.length===1 ? cands[0] : null;
        const alvos = cli ? (D.casosDoCliente.get(cli.id)||[])
          .filter(x=>x.fase!=="encerrado" && !soDig(x.processo)) : [];
        plano.semCaso.push({...p,
          sugestao: (cli && alvos.length===1)
            ? {caso_id:alvos[0].id, cliente_nome:cli.nome, caso_titulo:tituloCaso(alvos[0])} : null,
          sugestao_novo: (cli && !alvos.length)
            ? {cliente_id:cli.id, cliente_nome:cli.nome} : null});
        plano.resumo.sem_caso++;
        if(cli && alvos.length===1) plano.resumo.vinculaveis++;
        continue;
      }
      // F131 · no e-SAJ o cumprimento de sentença e as requisições (RPV,
      // precatório) chegam com o MESMO número e código próprio: o link da
      // ficha continua sendo o do processo principal, e o movimento de cada
      // incidente entra com o código na chave, para não colidir
      // [02.10.2026] no 2º grau, os embargos de declaração e o agravo interno
      // de uma apelação também são incidentes: mesmo número, código próprio
      const incidente = !!(p.codigo && (p.principal || /cumprimento|requisi|precat|rpv|incidente|impugna|habilita|embargos de declara|agravo interno/i.test((p.tipo||"")+" "+(p.classe||""))));
      // a coleta completa a ficha de graça: classe (MS? JEF? rito comum?) e
      // data do ajuizamento — só onde estiver vazio, nunca por cima. O link se
      // RENOVA a cada coleta (como o processo_link do PAT): a chave ca pode
      // mudar, e o link mais novo é o que abre. Incidente não mexe na ficha:
      // a classe, a data e o link dele não são os do caso (os embargos vinham
      // depois da apelação na mesma coleta e gravariam por cima dela)
      const campos={};
      if(!incidente){
        if(p.classe && !k.classe_judicial) campos.classe_judicial=p.classe;
        if(p.distribuido && !k.ajuizado_em) campos.ajuizado_em=p.distribuido;
        if(p.orgao && !k.orgao_judicial) campos.orgao_judicial=p.orgao;
        Object.assign(campos, camposLinkPje(k, dados.grau, linkPje(dados.host, p), p.numero));
      }
      if(Object.keys(campos).length){ plano.fichas.push({caso_id:k.id, campos}); plano.resumo.fichas++; }
      const movs = (Array.isArray(p.movimentos) && p.movimentos.length ? p.movimentos : [p.movimento]).filter(Boolean);
      // F186 · a PASTA DIGITAL do e-SAJ (extensão 1.15): todo documento do
      // processo, com a data em que entrou nos autos. Sem andamento a ligar
      // (a hora fica 00:00 de propósito): a data vai no próprio anexo
      for(const d of (p.pasta||[]))
        docsDoMovimento(plano.docs, k, dados.sistema||"esaj", [d], null, `${soDig(p.numero)}:${d.data||"s-d"}T00:00`);
      if(!movs.length){ plano.resumo.sem_mudanca++; continue; }
      const sufixo = incidente ? `:${p.codigo}` : "";
      // [02.10.2026] o e-SAJ entrega as cinco movimentações mais recentes
      // (extensão 1.12), e não só a última: entre duas rodadas o processo anda
      // mais de um passo, e o "Julgado virtualmente" dos embargos de um caso
      // ficou atrás do "Expedido Certidão". Entram as que o CRM não tem, da
      // última conhecida deste processo em diante; de processo que o CRM ainda
      // não acompanhava, as dos últimos 7 dias, para não despejar histórico
      // nas 📣 Novidades. A mais recente entra sempre, como antes.
      // ponytail: o 1º e o 2º grau do mesmo número dividem a chave sem código,
      // e a data mais nova dos dois vale para ambos; no pior caso volta a
      // entrar só a mais recente, como antes da 10.62
      const desde = ultimas.get(`${soDig(p.numero)}${sufixo}`)
        || new Date(Date.now()-7*864e5).toISOString().slice(0,10);
      let novos = 0;
      // F185 · o DOCUMENTO entra de toda movimentação coletada, e não só das
      // novas: a peça de um movimento já conhecido também tem que chegar
      // (22 de 23 PDFs do e-SAJ ficavam no bucket sem entrar no caso)
      for(const m of movs)
        docsDoMovimento(plano.docs, k, dados.sistema||"pje", m.docs,
          `mov:${soDig(p.numero)}${sufixo}:${m.data}T${m.hora}:${hashDjb(dsa(m.texto||""))}`,
          `${soDig(p.numero)}${sufixo}:${m.data}T${m.hora}`);
      for(const m of movs.filter((m, i) => i===0 || (m.data && m.data>=desde)).reverse()){
        // [24.09.2026] o e-SAJ não dá hora (vem 00:00) e o eproc nem sempre dá:
        // dois movimentos no mesmo dia caíam na MESMA chave e o segundo sumia
        // como "sem mudança" (o "Petição Juntada" de 23/09 atrás do "Mudança de
        // Magistrado"). A chave leva um resumo do texto, em toda fonte — no PJe
        // fecha também o caso de dois movimentos no mesmo minuto. O que já está
        // gravado com a chave antiga continua reconhecido pelo texto (momentos)
        const oid = `mov:${soDig(p.numero)}${sufixo}:${m.data}T${m.hora}:${hashDjb(dsa(m.texto||""))}`;
        const momento = `${soDig(p.numero)}${sufixo}:${m.data}T${m.hora}`;
        if(vistos.has(oid) || momentoConhecido(momentos, momento, m.texto)) continue;
        vistos.add(oid); marcarMomento(momentos, momento, m.texto);
        // criado_em fica em branco de propósito: o banco carimba AGORA e o
        // andamento entra na janela de 30 dias das 📣 Novidades — gravado com
        // a data do movimento, o que era mais velho nascia invisível. A data
        // verdadeira do movimento vai no texto.
        plano.andamentos.push({ caso_id:k.id, numero:p.numero, origem_id:oid,
          texto:`${prefixoPje(dados)}${dados.grau?` (${dados.grau})`:""}: ${m.texto} — em ${fmt(m.data)} ${m.hora} — ${p.classe||"processo"} ${p.numero}` });
        plano.resumo.movimentos++; novos++;
      }
      if(!novos) plano.resumo.sem_mudanca++;
    }
    planoPjeAtual = plano;
    await anotarSemCaso(dados, plano.semCaso, porProcesso, fora).catch(()=>{});
    renderColeta();
  }catch(e){
    // sem plano desta coleta, o aplicar não roda com o plano velho; a falha entra na conta da rodada
    if(planoPjeAtual && planoPjeAtual.coleta_id===coletaId) planoPjeAtual = null;
    falhasDaColeta++; aviso("Não consegui ler a coleta: "+e.message); }
}
// F288 · PROCESSO SEM CASO HÁ MAIS DE 7 DIAS. A extensão do e-SAJ (1.24) só
// baixa peças de processo com caso aberto, e o processo novo que a consulta
// por OAB acha antes do cadastro fica só na lista desta conferência, que some
// ao aplicar. A data em que cada número apareceu sem caso fica guardada em
// config_app.pje_sem_caso, e o 📥 Importar avisa passados 7 dias.
function pjeSemCaso(){
  const v = cfgApp("pje_sem_caso");
  if(v && typeof v==="object") return v;
  try{ return JSON.parse(v||"{}"); }catch(e){ return {}; }
}
async function anotarSemCaso(dados, semCaso, porProcesso, fora){
  const m = pjeSemCaso(), antes = JSON.stringify(m), agora = new Date().toISOString();
  for(const p of (dados.processos||[])){
    const d = soDig(p.numero);
    if(d && m[d] && (porProcesso.has(d) || fora.has(d))) delete m[d];
  }
  for(const p of semCaso){
    const d = soDig(p.numero);
    if(d && !m[d]) m[d] = { numero:p.numero, partes:(p.partes||"").slice(0,80), sistema:dados.sistema||"pje", desde:agora };
  }
  if(JSON.stringify(m)!==antes) await guardarCfgApp("pje_sem_caso", JSON.stringify(m));
}
// os anotados que continuam sem caso (o vínculo feito por outro caminho tira da lista sem nova coleta)
function semCasoAntigos(dias=7){
  const comCaso = new Set();
  for(const k of D.casos||[]){
    if(soDig(k.processo)) comCaso.add(soDig(k.processo));
    for(const px of (Array.isArray(k.processos)?k.processos:[])) if(soDig(px && (px.numero||px))) comCaso.add(soDig(px.numero||px));
  }
  const fora = new Set(pjeIgnorados()), corte = Date.now() - dias*86400000;
  return Object.entries(pjeSemCaso())
    .filter(([d,x]) => !comCaso.has(d) && !fora.has(d) && new Date(x.desde).getTime() < corte)
    .map(([,x]) => x).sort((a,b) => a.desde < b.desde ? -1 : 1);
}
function avisoSemCaso(){
  const l = semCasoAntigos(); if(!l.length) return "";
  return `<div class="exig aviso-sem-caso"><strong>⚠ ${l.length} processo(s) do acervo sem caso no CRM há mais de 7 dias.</strong>
    As peças dele não são baixadas até haver caso. Confira a coleta do tribunal para vincular, criar o caso ou ignorar.
    ${l.slice(0,30).map(x=>`<div class="meio-sub" style="margin-top:2px">${esc(x.numero)} — ${esc(x.partes||"")}
      · ${esc(x.sistema==="esaj"?"e-SAJ":x.sistema)} · sem caso desde ${esc(fmt(dataSP(x.desde)))}</div>`).join("")}
    ${l.length>30?`<div class="meio-sub">…e mais ${l.length-30}.</div>`:""}</div>`;
}
// casamento TOLERANTE de nome: um contido no outro, na ordem, ignorando
// caixa, acento e preposições. "joao aparecido ambrosio" está dentro de
// "joao aparecido aguilera ambrosio" — mesmo cliente, grafias diferentes.
// Exige ao menos 2 nomes em comum, e só vale quando UM cliente da base bate.
function nomesBatemPje(a, b){
  const T = s => dsa(s).split(/\s+/).filter(t=>t && !["da","de","do","das","dos","e"].includes(t));
  const x=T(a), y=T(b);
  if(!x.length || !y.length) return false;
  const [curto, longo] = x.length<=y.length ? [x,y] : [y,x];
  let i=0;
  for(const t of longo) if(i<curto.length && t===curto[i]) i++;
  return curto.length>=2 && i===curto.length;
}
// A MESMA fila serve ao PJe do TRF3 e ao eproc do TJSP: a extensão entrega os
// dois no formato do acervo do PJe (a tela casa pelo número), e `sistema`
// diz de onde veio — o rótulo e o prefixo do andamento seguem esse campo.
// Sem `sistema` (coletas antigas), é PJe.
function rotuloSistemaPje(d){
  const s = d && d.sistema;
  return s==="eproc" ? "🏛 eproc TJSP" : s==="esaj" ? "⚖️ e-SAJ TJSP" : "⚖️ PJe TRF3";
}
function prefixoPje(d){
  const s = d && d.sistema;
  return s==="eproc" ? "eproc TJSP" : s==="esaj" ? "e-SAJ TJSP" : "PJe";
}
// o endereço dos autos digitais que o próprio acervo carrega (id + chave ca)
// — é o "abrir no PJe" das Novidades e da ficha, aberto na sessão logada
function linkPje(host, p){
  if(p && p.link) return p.link;                 // o e-SAJ manda a ficha pronta
  return (host && p && p.id && p.ca)
    ? `https://${host}/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=${p.id}&ca=${p.ca}`
    : null;
}
// ══════════════════════════════════════════════════════════════════════════
// UM CASO, DOIS GRAUS, DOIS ENDEREÇOS
// ══════════════════════════════════════════════════════════════════════════
// O número do CNJ é o MESMO no 1º e no 2º grau — muda o host (pje1g/pje2g) e
// mudam o id e a chave `ca` internos. Como as duas coletas casam pelo mesmo
// número, as duas escreviam no mesmo `casos.pje_link`: a última a rodar (na
// prática o acervo do 1º grau, que tem muito mais processo) sobrescrevia a do
// 2º. O resultado era o defeito relatado — a novidade dizia "PJe (2º grau)" e
// o botão abria os autos do 1º.
// Agora cada grau guarda o seu endereço em `casos.pje_links` ({grau: link}), e
// quem abre um andamento vai para o grau DAQUELE andamento. `pje_link` fica
// como estava, valendo de retrato do mais recente e de saída para o banco que
// ainda não rodou o schema_por_em_dia.sql.
function linksPjeDoCaso(k){
  const m = (k && k.pje_links) || {};
  return (m && typeof m==="object" && !Array.isArray(m)) ? m : {};
}
function linkPjeDoCaso(k, grau){
  const m = linksPjeDoCaso(k);
  return (grau && m[grau]) || (k && k.pje_link) || null;
}
// o grau que o próprio texto do andamento carrega: ele nasce como
// "PJe (2º grau): ..." nas duas coletas (acervo e processo completo)
function grauDoAndamentoPje(a){
  const m = /^(?:PJe|eproc TJSP|e-SAJ TJSP)\s*\(([^)]+)\)/.exec((a && a.texto) || "");
  return m ? m[1].trim() : null;
}
// F95 · o sistema que o texto do andamento carrega ("eproc TJSP (1º grau):…")
// F146 · O NÚMERO CNJ DIZ O SISTEMA (regra do Paulo, 27.09.2026). No
// NNNNNNN-DD.AAAA.J.TR.OOOO, J.TR = 8.26 é a Justiça estadual de São Paulo
// (e-SAJ ou eproc) e 4.03 é a Justiça Federal da 3ª Região, que é sempre PJe.
// O número vence o rótulo da coleta, que chamava de PJe o que era e-SAJ.
function justicaDoNumeroCnj(numero){
  const d = soDig(numero);
  if(d.length!==20) return null;
  const jtr = d[13]+"."+d.slice(14,16);
  return jtr==="8.26" ? "estadual" : jtr==="4.03" ? "federal" : null;
}
function sistemaDoAndamentoPje(a){
  const txt = (a && a.texto) || "";
  const m = /^(PJe|eproc TJSP|e-SAJ TJSP)\s*\(/.exec(txt);
  const nums = txt.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/g);
  const just = nums ? justicaDoNumeroCnj(nums[nums.length-1]) : null;
  if(just==="federal") return "PJe";
  if(just==="estadual") return m && m[1]!=="PJe" ? m[1] : "e-SAJ TJSP";
  return m ? m[1] : null;
}
// o nome curto do sistema de um movimento colhido, e o nome da coleta inteira
const SIS_CURTO = {"PJe":"PJe", "e-SAJ TJSP":"e-SAJ", "eproc TJSP":"eproc"};
function sisCurtoDoMov(a){ return SIS_CURTO[sistemaDoAndamentoPje(a)] || "PJe"; }
function nomeDaColeta(movs){
  const s = [...new Set((movs||[]).map(sisCurtoDoMov))];
  return s.length ? s.join(" e ") : "PJe";
}
// o nome do sistema pelo endereço: "abrir no PJe" não pode abrir o eproc
function nomeSistemaDoLink(u){
  return /eproc/i.test(u||"") ? "eproc" : /esaj\.tjsp/i.test(u||"") ? "e-SAJ" : "PJe";
}
// e-SAJ sem link guardado: a consulta por número cai na ficha do processo (a
// mesma regra da extensão, esaj-regras.js). O eproc não tem esse atalho —
// o endereço dele leva um hash da sessão, e só chega pela coleta.
function linkEsajPorNumero(grau, numero){
  const n=String(numero||"").trim(), m=n.match(/^(\d{7}-\d{2})\.(\d{4})\.8\.26\.(\d{4})$/);
  if(!m) return null;
  const [,nd,ano,foro]=m;
  return grau==="2º grau"
    ? `https://esaj.tjsp.jus.br/cposg/search.do?conversationId=&paginaConsulta=1&cbPesquisa=NUMPROC&numeroDigitoAnoUnificado=${nd}.${ano}&foroNumeroUnificado=${foro}&dePesquisaNuUnificado=${n}&dePesquisaNuUnificado=UNIFICADO&dePesquisa=&tipoNuProcesso=UNIFICADO`
    : `https://esaj.tjsp.jus.br/cpopg/search.do?conversationId=&cbPesquisa=NUMPROC&numeroDigitoAnoUnificado=${nd}.${ano}&foroNumeroUnificado=${foro}&dadosConsulta.valorConsultaNuUnificado=${n}&dadosConsulta.valorConsultaNuUnificado=UNIFICADO&dadosConsulta.valorConsulta=&dadosConsulta.tipoNuProcesso=UNIFICADO`;
}
// o link certo para UM andamento do PJe / eproc / e-SAJ
function linkPjeDoAndamento(a, k){
  const grau = grauDoAndamentoPje(a), sis = sistemaDoAndamentoPje(a);
  // o link do grau é o do processo principal: andamento de outro processo do caso só abre pelo link do número dele
  const num = numDoAndPje(a), m = linksPjeDoCaso(k);
  const outro = num && soDig(k&&k.processo) && num!==soDig(k.processo) && processosDoCaso(k).length>1;
  const guardado = (num && grau && m[`${num}|${grau}`]) || (outro ? null : linkPjeDoCaso(k, grau));
  // o mapa de links é por grau, não por sistema: um processo migrado do e-SAJ
  // para o eproc tem os dois — o link guardado só vale se for do sistema
  // deste andamento
  const bate = !guardado ? false
    : sis==="eproc TJSP" ? /eproc/i.test(guardado)
    : sis==="e-SAJ TJSP" ? /esaj\.tjsp/i.test(guardado)
    : sis==="PJe" ? !/eproc|esaj\.tjsp/i.test(guardado) : true;
  if(guardado && bate) return guardado;
  if(sis!=="e-SAJ TJSP") return null;
  const noTexto = (String((a&&a.texto)||"").match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/)||[])[0];
  return linkEsajPorNumero(grau, noTexto || (k&&k.processo));
}
// na ficha, um botão POR GRAU: com o processo no 1º e no 2º, um botão só
// obrigava a adivinhar qual dos dois ele abria
function botoesPjeDoCaso(k, cls, extra){
  const m = linksPjeDoCaso(k);
  const graus = Object.keys(m).filter(g=>m[g] && !g.includes("|"));
  const bt = (href, rot, tit) => `<a class="${cls}" href="${urlOk(href)}" target="_blank"
    rel="noopener" title="${esc(tit)}"${extra||""}>${esc(rot)}</a>`;
  if(graus.length)
    return graus.sort().map(g=>bt(m[g], `🔗 ${nomeSistemaDoLink(m[g])} · ${g}`,
      `abrir os autos digitais do ${g} na sua sessão do ${nomeSistemaDoLink(m[g])}`)).join(" ");
  return k.pje_link ? bt(k.pje_link, `🔗 abrir no ${nomeSistemaDoLink(k.pje_link)}`,
    `abrir os autos digitais na sua sessão do ${nomeSistemaDoLink(k.pje_link)}`) : "";
}
// o que gravar na ficha quando uma coleta traz um link: o do grau dela entra
// no mapa, sem derrubar o do outro grau
// F223 · o caso com dois processos tinha um link por grau só: a novidade do
// processo de 2021 abria os autos do de 2026. O link passa a ser guardado
// também pelo número ("<20 dígitos>|<grau>"), e o de grau vale para o principal.
function camposLinkPje(k, grau, lk, num){
  if(!lk) return {};
  const m = linksPjeDoCaso(k), d = soDig(num), campos = {}, novo = {...m};
  const doPrincipal = !d || !soDig(k.processo) || d===soDig(k.processo) || processosDoCaso(k).length<2;
  if(doPrincipal && k.pje_link !== lk) campos.pje_link = lk;
  if(grau && doPrincipal) novo[grau] = lk;
  if(grau && d) novo[`${d}|${grau}`] = lk;
  if(JSON.stringify(novo)!==JSON.stringify(m)) campos.pje_links = novo;
  return campos;
}
function numDoAndPje(a){
  return (String((a&&a.origem_id)||"").match(/\d{20}/)||[])[0]
    || soDig((String((a&&a.texto)||"").match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/)||[])[0]||"");
}
// o lado da parte que não é órgão público = o cliente
function clienteDasPartes(partes){
  const lados = String(partes||"").split(/\s+[Xx]\s+/);
  const ehOrgao = s=>/INSS|INSTITUTO NACIONAL|UNI[AÃ]O|FAZENDA|CHEFE D|CAIXA ECON|GERENTE/i.test(s);
  const nome = (lados.find(l=>l.trim() && !ehOrgao(l))||"")
    .replace(/\s*e outros?\s*\(\d+\)\s*/i," ").trim();
  return nome || null;
}
// o vínculo em si, usado pela sugestão automática E pela escolha à mão:
// leva classe/ajuizamento/órgão/link junto; num banco sem as colunas novas,
// grava só o número em vez de falhar inteiro
async function vincularPjeNoCaso(p, k, nomeCli){
  const corpo={processo:p.numero,
    ...(p.classe && !k.classe_judicial?{classe_judicial:p.classe}:{}),
    ...(p.distribuido && !k.ajuizado_em?{ajuizado_em:p.distribuido}:{}),
    ...(p.orgao && !k.orgao_judicial?{orgao_judicial:p.orgao}:{}),
    ...camposLinkPje(k, (planoPjeAtual||{}).grau, linkPje((planoPjeAtual||{}).host, p), p.numero)};
  try{
    await patchCaso(k.id, corpo);
  }catch(e){
    await patchCaso(k.id, {processo:p.numero});
    delete corpo.classe_judicial; delete corpo.ajuizado_em; delete corpo.orgao_judicial;
    delete corpo.pje_link;
  }
  Object.assign(k, corpo);
  aviso(`⚖️ ${p.numero} vinculado ao caso de ${String(nomeCli||"").split(" ")[0]||"cliente"}`, false);
  conferirPje(planoPjeAtual.coleta_id);          // replaneja: agora ele casa
}
async function vincularProcessoPje(numero){
  const p=((planoPjeAtual||{}).semCaso||[]).find(x=>x.numero===numero);
  if(!p || !p.sugestao) return;
  const k=D.casoPorId.get(p.sugestao.caso_id);
  if(!k || soDig(k.processo)) return aviso("Esse caso já ganhou outro número — confira na ficha");
  await vincularPjeNoCaso(p, k, p.sugestao.cliente_nome);
}
// caso Judicial novo já com o número — o caminho do SEGUNDO processo do
// mesmo cliente (nada de pendurar dois processos numa ficha só) e o da
// escolha à mão quando o cliente não tem caso vago
async function criarCasoPjeParaCliente(p, c){
  if(!await confirmar(`Criar um caso Judicial novo para ${c.nome} com o processo ${p.numero}?`)) return;
  const base={cliente_id:c.id, titulo:c.nome,
    fase:"judicial", processo:p.numero, origem_lista:"👪 Judicial"};
  const extra={...(p.classe?{classe_judicial:p.classe}:{}),
               ...(p.distribuido?{ajuizado_em:p.distribuido}:{}),
               ...(p.orgao?{orgao_judicial:p.orgao}:{}),
               ...camposLinkPje({}, (planoPjeAtual||{}).grau, linkPje((planoPjeAtual||{}).host, p), p.numero)};
  let k;
  try{
    [k]=await api(`/rest/v1/casos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({...base, ...extra})}) || [];
  }catch(e){   // banco sem as colunas novas: nasce sem classe/ajuizamento
    [k]=await api(`/rest/v1/casos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify(base)}) || [];
  }
  if(k){
    D.casos.push(k); D.casoPorId.set(k.id,k);
    if(!D.casosDoCliente.has(c.id)) D.casosDoCliente.set(c.id,[]);
    D.casosDoCliente.get(c.id).push(k);
  }
  aviso(`➕ Caso criado para ${c.nome.split(" ")[0]} com o processo ${p.numero}`, false);
  conferirPje(planoPjeAtual.coleta_id);
}
async function criarCasoPje(numero){
  const p=((planoPjeAtual||{}).semCaso||[]).find(x=>x.numero===numero);
  if(!p || !p.sugestao_novo) return;
  const c=D.cliPorId.get(p.sugestao_novo.cliente_id); if(!c) return;
  await criarCasoPjeParaCliente(p, c);
}
// ── a ESCOLHA À MÃO ──────────────────────────────────────────────────────
// O casamento automático por nome só age quando bate com UM cliente — e o
// print do Paulo mostrou 50 processos de casos nossos parados por grafia
// diferente, homônimos ou cliente com mais de um caso vago. O 🔍 abre a
// busca: acha o cliente pelo nome do CRM, vincula ao caso certo (só os SEM
// número entram) ou cria um caso Judicial novo ali mesmo.
function escolherCasoPje(numero){
  const p=((planoPjeAtual||{}).semCaso||[]).find(x=>x.numero===numero);
  if(!p) return;
  caixa(`<h3 style="margin:0 0 2px">⚖️ ${esc(p.numero)}</h3>
    <p class="meio-sub" style="margin:0 0 8px">${esc((p.partes||"").slice(0,90))}</p>
    <input id="esc-pje-busca" placeholder="nome do cliente no CRM…" autocomplete="off"
      style="width:100%;padding:7px 10px;border:1px solid var(--borda);border-radius:8px;font-size:14px"
      oninput="filtrarEscolhaPje('${p.numero}')">
    <div id="esc-pje-lista" style="max-height:52vh;max-height:52dvh;overflow:auto;margin-top:8px"></div>`);
  const inp=document.getElementById("esc-pje-busca");
  // já entra filtrando pelos dois primeiros nomes da parte
  inp.value=(clienteDasPartes(p.partes)||"").split(/\s+/).slice(0,2).join(" ");
  filtrarEscolhaPje(p.numero);
  inp.focus(); inp.select();
}
function filtrarEscolhaPje(numero){
  const el=document.getElementById("esc-pje-lista"); if(!el) return;
  const q=dsa((document.getElementById("esc-pje-busca")||{}).value||"").trim();
  const cands=q.length<2?[]:D.clientes.filter(c=>dsa(c.nome).includes(q)).slice(0,12);
  el.innerHTML = !cands.length
    ? `<p class="meio-sub">${q.length<2?"digite ao menos 2 letras do nome":"nenhum cliente do CRM com esse nome — confira a grafia no cadastro"}</p>`
    : cands.map(c=>{
      const casos=(D.casosDoCliente.get(c.id)||[]).filter(x=>x.fase!=="encerrado");
      return `<div style="padding:7px 0;border-bottom:1px solid var(--borda)">
        <b>${esc(c.nome)}</b>
        ${casos.map(x=>{ const tem=soDig(x.processo);
          return `<div class="meio-sub" style="display:flex;gap:6px;align-items:center;margin-top:3px;flex-wrap:wrap">
            ${esc(tituloCaso(x))}${tem?` <small>· já tem o ${esc(x.processo)}</small>
              <button class="btn-mini" onclick="vincularIncidentePje('${numero}','${x.id}')"
                title="cumprimento de sentença, RPV, precatório: entra como número anexo deste caso, não como caso novo"><span aria-hidden="true">Incidente</span><span class="sr-only">incidente deste caso</span></button>`
              :` <button class="btn-mini" onclick="vincularEscolhidoPje('${numero}','${x.id}')" title="vincular aqui"><span aria-hidden="true">Vincular</span><span class="sr-only">vincular aqui</span></button>`}
          </div>`;}).join("") || `<div class="meio-sub" style="margin-top:3px">sem caso ativo</div>`}
        <button class="btn-mini" style="margin-top:5px"
          onclick="criarCasoEscolhidoPje('${numero}','${c.id}')">➕ caso Judicial novo p/ ${esc(c.nome.split(" ")[0])}</button>
      </div>`;}).join("")
  // cliente que ainda não existe: o Novo Cliente abre com o nome; volta-se depois ao Vincular
  if(q.length>=2) el.innerHTML += `<button class="btn-mini" style="margin-top:8px"
    onclick="fecharCaixa();novoClienteDaBusca(document.getElementById('esc-pje-busca')?.value||'')">➕ Cliente novo</button>`;
}
// Novidades › Sem caso no CRM › Vincular: abre a mesma escolha à mão, sem passar pelo Importar
function vincularDaNovidade(numero){
  const x = pjeSemCaso()[soDig(numero)]; if(!x) return;
  planoPjeAtual = {coleta_id:null, semCaso:[{numero:x.numero, partes:x.partes||"", sistema:x.sistema||"pje"}]};
  escolherCasoPje(x.numero);
}
async function vincularEscolhidoPje(numero, casoId){
  const p=((planoPjeAtual||{}).semCaso||[]).find(x=>x.numero===numero);
  const k=D.casoPorId.get(casoId);
  if(!p || !k) return;
  if(soDig(k.processo)) return aviso("Esse caso já tem número — escolha outro ou crie um caso novo");
  fecharCaixa();
  const cli=D.cliPorId.get(k.cliente_id)||{};
  await vincularPjeNoCaso(p, k, cli.nome);
}
// F132 · o incidente (cumprimento de sentença, RPV, precatório) NÃO é caso
// novo: entra como número anexo do caso que já tem o processo principal, com
// a classe como rótulo — e a coleta passa a casar sozinha pelos anexos
async function vincularIncidentePje(numero, casoId){
  const p=((planoPjeAtual||{}).semCaso||[]).find(x=>x.numero===numero);
  const k=D.casoPorId.get(casoId);
  if(!p || !k) return;
  const lista=processosDoCaso(k);
  if(lista.some(x=>soDig(x.numero)===soDig(p.numero))) return aviso("Esse número já está no caso");
  fecharCaixa();
  await salvarProcessos(casoId, [...lista, {numero:fmtProc(p.numero), nosso:true, acompanhar:true,
    rotulo:p.classe||p.tipo||"Incidente", principal:false}]);
  aviso(`⚖️ ${p.classe||"Incidente"} ${p.numero} anexado ao caso`, false);
  conferirPje(planoPjeAtual.coleta_id);
}
async function criarCasoEscolhidoPje(numero, cliId){
  const p=((planoPjeAtual||{}).semCaso||[]).find(x=>x.numero===numero);
  const c=D.cliPorId.get(cliId);
  if(!p || !c) return;
  fecharCaixa();
  await criarCasoPjeParaCliente(p, c);
}
async function vincularTodosPje(){
  const alvos=((planoPjeAtual||{}).semCaso||[]).filter(x=>x.sugestao);
  if(!alvos.length) return;
  if(!await confirmar(`Vincular ${alvos.length} processo(s) aos casos dos clientes de mesmo nome?\n\nSó entra onde o nome bate com UM cliente e ele tem UM caso ativo sem número.`)) return;
  let n=0;
  for(const p of alvos){
    const k=D.casoPorId.get(p.sugestao.caso_id);
    if(!k || soDig(k.processo)) continue;        // já levou o número de outro grau
    try{
      await patchCaso(k.id, {processo:p.numero});
      k.processo=p.numero; n++;
    }catch(e){}
  }
  aviso(`⚖️ ${n} processo(s) vinculados — replanejando`);
  conferirPje(planoPjeAtual.coleta_id);
}
function pjeIgnorados(){
  const v = cfgApp("pje_ignorar");
  if(Array.isArray(v)) return v;
  try{ return JSON.parse(v||"[]"); }catch(e){ return []; }
}
async function ignorarProcessoPje(numero){
  const lista=[...new Set([...pjeIgnorados(), soDig(numero)])];
  await guardarCfgApp("pje_ignorar", JSON.stringify(lista));
  aviso("🚫 Não pergunto mais por este processo — desfaz-se no “limpar ignorados”", false);
  if(planoPjeAtual) conferirPje(planoPjeAtual.coleta_id); else render();
}
async function limparIgnoradosPje(){
  await guardarCfgApp("pje_ignorar","[]");
  aviso("Ignorados do PJe limpos — voltam a aparecer na próxima conferência", false);
  if(planoPjeAtual) conferirPje(planoPjeAtual.coleta_id); else render();
}
// o MOMENTO de cada andamento do PJe já gravado (processo:dataThora), venha
// ele do acervo (mov:) ou do histórico completo (hist:) — é o que impede as
// duas fontes de gravarem o mesmo movimento duas vezes
// F96 · O MOMENTO SOZINHO NÃO BASTA. O PJe registra vários eventos no mesmo
// minuto (a distribuição é "Recebido pelo Distribuidor" + "Distribuído por
// sorteio" + a inicial com os anexos, tudo às 12:50), e o processo completo
// de um caso real mostrou "4 conhecidos, 0 novos" com a ficha guardando só
// dois. O momento agora carrega os TEXTOS já gravados nele, e o item só é
// conhecido quando o seu texto está entre eles.
function momentosPje(linhas){
  const m=new Map();
  for(const l of linhas||[]){
    const oid = typeof l==="string" ? l : (l&&l.origem_id);
    // o incidente do e-SAJ leva o código entre o número e a data (F131)
    const x=/^(?:mov|hist):(\d+(?::[A-Za-z0-9]+)?:\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/.exec(oid||"");
    if(!x) continue;
    if(!m.has(x[1])) m.set(x[1], []);
    if(l && typeof l==="object" && l.texto) m.get(x[1]).push(dsa(l.texto));
  }
  return m;
}
// o miolo do texto: a primeira parte antes do " · " (os anexos vêm depois)
const miolo = t => dsa(String(t||"").split(" · ")[0]).trim();
function momentoConhecido(momentos, momento, texto){
  if(!momento || !momentos.has(momento)) return false;
  const ts = momentos.get(momento), t = miolo(texto);
  if(!ts.length || !t) return true;      // gravado sem texto: vale o minuto, como antes
  return ts.some(x=>x.includes(t));
}
function marcarMomento(momentos, momento, texto){
  if(!momento) return;
  if(!momentos.has(momento)) momentos.set(momento, []);
  momentos.get(momento).push(dsa(texto||""));
}
function hashDjb(s){ let h=5381; for(let i=0;i<s.length;i++) h=((h*33)^s.charCodeAt(i))>>>0; return h.toString(36); }
// a data do movimento mais novo já gravado de cada processo (o número, ou
// número:código no incidente do e-SAJ), pelas chaves dos momentos, numa
// passada só: o acervo tem centenas de processos e o banco milhares de chaves
function ultimasDatasPje(momentos){
  const ult = new Map();
  for(const k of momentos.keys()){
    const x = /^(.*):(\d{4}-\d{2}-\d{2})T/.exec(k);
    if(x && !(ult.get(x[1]) >= x[2])) ult.set(x[1], x[2]);
  }
  return ult;
}

