// F213 · os vínculos da RAIS e do CAGED juntos, um por empregador e admissão,
// com o que pede conferência: vínculo sem saída e licença sem remuneração
// F235 · com o CNIS (g), o vínculo que a RAIS deixa sem saída e o CNIS fecha não é ponto a conferir: a RAIS baixada pode ser de um ano só
function vinculosRaisCaged(fd, g){
  const m = new Map(), chave = (raiz, adm) => `${raiz}|${adm||""}`;
  // F235 · cada vínculo guarda a ocupação (CBO) da RAIS, para a tabela
  const pega = (raiz, adm, nome) => { const k = chave(raiz, adm); if(!m.has(k)) m.set(k, {nome, admissao:adm||"", desligamento:"", causa:"", cbo:"", fontes:new Set(), anos:[], alertas:[]}); return m.get(k); };
  for(const x of fd.caged||[]){ const v = pega(x.raiz, x.admissao, x.nome); v.fontes.add("CAGED"); if(x.desligamento) v.desligamento = x.desligamento; }
  // F235 · a ocupação (CBO) da RAIS vai à tabela
  for(const x of fd.rais||[]){ const v = pega(x.raiz, x.admissao, x.nome); v.fontes.add("RAIS"); v.anos.push(x.ano);
    // F235 · a ocupação mais recente do vínculo
    if(x.desligamento) v.desligamento = x.desligamento; if(x.causa) v.causa = x.causa; if(x.cbo) v.cbo = x.cbo; }
  for(const l of licencasDaRais(fd.rais)){ const v = [...m.values()].find(v=>v.nome===l.nome); if(v) v.alertas.push(`licença sem remuneração de ${l.de} a ${l.ate}`); }
  const ano = +hoje().slice(0,4);
  for(const v of m.values()) if(!v.desligamento){ const ult = Math.max(0, ...v.anos.map(Number));
    // F235 · a saída que o CNIS tem fecha o vínculo da RAIS
    const vc = g && (g.vinculos||[]).find(x=>x.tipo!=="Benefício" && x.inicio===v.admissao && x.fim); if(vc){ v.desligamento = vc.fim; v.fontes.add("CNIS"); continue; }
    if(!ult || ult < ano - 1) v.alertas.unshift(`sem data de saída${ult ? `; última RAIS de ${ult}` : ""}`); }
  return [...m.values()].sort((a,b)=>isoBr(b.admissao||"")>isoBr(a.admissao||"")?1:-1);
}
// F235 · a ocupação da RAIS (CBO) prova a função no período, inclusive onde falta o PPP
function tabelaRaisCaged(fd, g){
  const vs = vinculosRaisCaged(fd, g); if(!vs.length) return "";
  return `<table class="pa-tabela"><thead><tr><th>Empregador</th><th>Admissão</th><th>Saída</th><th>Ocupação</th><th>Fonte</th><th>A conferir</th></tr></thead><tbody>
    ${vs.map(v=>`<tr><td>${esc(tituloOrgao(v.nome||"") || "—")}</td><td class="mono">${esc(v.admissao||"—")}</td><td class="mono">${esc(v.desligamento||"—")}</td><td>${esc(v.cbo ? fraseClinica(v.cbo) : "—")}</td>
      <td>${esc([...v.fontes].join(" e "))}${v.anos.length ? ` <span class="meio-sub">(${esc(v.anos.sort().join(", "))})</span>` : ""}</td>
      <td class="${v.alertas.length?"alerta":""}">${esc(v.alertas.join("; ") || "—")}</td></tr>`).join("")}</tbody></table>`;
}
// F213 · o que o dossiê NÃO trouxe, para orientar: o que o portal disse que não
// existe e o que falta porque o portal não foi consultado ou não tinha nada
// F235 · o "não existe" do portal quer dizer coisas diferentes: o laudo é o da perícia do INSS, e o "não possui
// deficiência" só diz que a pessoa nunca passou pela avaliação do INSS
// F235 · a mesma tradução do "não possui deficiência" na Identificação, no Primeiro atendimento e em Documentos
const CERT_PCD_NAO = "Certificado de pessoa com deficiência do INSS: ainda não tem. Quer dizer só que nunca passou pela avaliação do INSS, e não que o INSS negou a deficiência; a avaliação é marcada depois do pedido";
const FALTA_DO_PORTAL = [
  [/^laudo/i, "Laudo da perícia do INSS: o Meu INSS informou que o benefício não tem (o relatório do médico do cliente é outro documento)"],
  [/defici/i, CERT_PCD_NAO],
  [/^CAT/i, "CAT: o Meu INSS não tem CAT registrada no CPF (a empresa pode não ter feito; o próprio segurado, a família ou o sindicato podem fazê-la)"],
  [/^PPP/i, "PPP eletrônico: o Meu INSS não tem (o PPP em papel, do empregador, pode existir)"],
  [/^CTC/i, "CTC: o Meu INSS não tem certidão emitida"],
];
// F235 · o fato negativo do portal explicado; na pensão e na reclusão a consulta é no CPF de quem pede: a CAT, o laudo e o PPP
// de quem morreu ou está preso não aparecem por ela (a CAT em papel que a família trouxe, sim, está no dossiê)
const depDoDossie = c => { const ce = certidoesDoDossie(c.id).find(ce=>ce.obito || ce.prisao); return ce ? (ce.obito ? "falecido" : "preso") : ""; };
function explicaFalta(x, dep, c){
  const a = String(x).split(/[:(]/)[0].trim(), f = FALTA_DO_PORTAL.reduce((t, [re, frase])=>re.test(a) ? frase : t, String(x));
  if(!dep || !/^(laudo|cat|ppp)/i.test(a)) return f;
  const de = dep==="falecido" ? "de quem morreu" : "de quem está preso";
  if(/^cat/i.test(a)) return `CAT: nenhuma no CPF de quem pede; a CAT ${de} não aparece pelo gov.br de quem pede${c && catDoDossie(c) ? ", e a cópia da empresa que a família trouxe está no dossiê" : dep==="falecido" ? ": se a empresa não fez, a família pode fazer (Lei 8.213, art. 22, § 2º)" : ""}`;
  return /^laudo/i.test(a) ? `Laudo da perícia do INSS: nenhum no CPF de quem pede; o laudo ${de} não aparece pelo gov.br de quem pede` : `PPP eletrônico: nenhum no CPF de quem pede; o PPP ${de} não aparece pelo gov.br de quem pede`;
}
function paFaltas(c, fd){
  const dz = c.dossie || {}, docs = docsDoDossie(c.id), tem = re => docs.some(a=>re.test(a.nome||"")), dep = depDoDossie(c);
  const g = cnisDe(c), temRpps = ((g||{}).vinculos||[]).some(v=>/RPPS|regime pr[óo]prio|servidor|prefeitura|munic[íi]pio|secretaria|governo do estado/i.test(`${v.tipo} ${v.origem}`));
  // F235 · o fato negativo do portal, uma linha por assunto (o PPP vinha duas vezes); a CTC só para quem teve regime próprio
  const vistos = new Set(), out = [];
  for(const x of Object.values(dz).flatMap(x=>(x&&x.inexistentes)||[])){
    const a = String(x).split(/[:(]/)[0].trim(), k = a.toLowerCase().replace(/\s+eletr[ôo]nico/, "").replace(/s$/, "");
    if(!a || vistos.has(k) || (/^CTC/i.test(a) && !temRpps)) continue;
    // F235 · com benefício concedido no dossiê, o pedido dele existiu: não está na lista do Meu INSS, e a cópia se pede por agendamento
    if(/^Processos administrativos/i.test(a) && (fd.cartas||[]).length){ const ca = fd.cartas[0]; vistos.add(k);
      out.push(`O pedido do benefício concedido (NB ${fmtNb(ca.nb)}${ca.der ? `, de ${ca.der.slice(-4)}` : ""}) não está na lista do Meu INSS: a cópia desse processo se pede por agendamento (serviço de cópia de processo), e mostra o que foi entregue ao INSS`); continue; }
    vistos.add(k); out.push(explicaFalta(x, dep, c));
  }
  // F235 · na pensão, na reclusão e no BPC do idoso o documento médico não decide: a linha não aparece; nos demais, só importa se houver doença
  if(!fd.laudos.length && !tem(/^HC Ribeirao|^Laudos/i) && !dep && !((idadeDe(c.dn)||0) >= 65 && familiaCadunico(c))) out.push("Nenhum laudo médico nem relatório médico no dossiê: só importa se o pedido envolver doença (aí, pedir ao cliente os documentos médicos atuais)");
  if(!dz.mte && !fd.rais.length && !fd.caged.length) out.push("Sem CTPS, RAIS e CAGED: o Emprega Brasil não foi consultado");
  if(!dz.hc && !tem(/^HC Ribeirao/i)) out.push("Sem prontuário do HC Ribeirão: o portal não foi consultado");
  if(!dz.redesim && !fd.redesim) out.push("Sem a consulta de CNPJs: a Redesim não foi consultada");
  if(!fd.ppps.length && !tem(/^PPP/i) && !vistos.has("ppp")) out.push("Nenhum PPP: se houve atividade especial, pedir ao empregador");
  if(!fd.processos.length && !tem(/^Processos administrativos/i)) out.push("Nenhuma cópia de pedido administrativo no dossiê");
  // o que falta de verdade para o pedido: o laudo da perícia que negou e o extrato do benefício
  for(const p of pedidosAoInss(c, fd).filter(p=>p.res==="indeferido" && p.chave.startsWith("pa:") && /incapacidade|prorroga|aux[íi]lio|per[íi]cia/i.test(p.especie||"")))
    if(!(fd.laudos||[]).some(l=>isoBr(l.exame||"") >= isoBr(p.der||"")))
      out.push(`Laudo da perícia que negou o pedido de ${p.der}: não está no dossiê. Peça a cópia do processo no Meu INSS antes do recurso`);
  for(const b of beneficiosDoCnis(g).filter(b=>b.nb && !(fd.extratos||[]).some(e=>e.nb===soDig(b.nb))).slice(0, 2))
    out.push(`Extrato de pagamento ${/^(aposentadoria|pens)/i.test(nomeBenef(b.especie)) ? "da" : "do"} ${nomeBenef(b.especie).toLowerCase()} (NB ${fmtNb(b.nb)}): não veio. Baixe no Meu INSS; mostra o valor e os meses pagos`);
  return out;
}
// a linha do tempo da qualidade: contribuições, seguro, qualidade, saúde e pedidos
function paLinhaDoTempo(c, d){
  const {ct, gr, fd, an} = d, hj = hoje();
  const comp = s => { const m = /^(\d{2})\/(\d{4})$/.exec(s||""); return m ? `${m[2]}-${m[1]}-01` : null; };
  const ym = s => s && /^\d{4}-\d{2}$/.test(s) ? s + "-01" : s;
  // F235 · a roça e a pesca pelos papéis, numa faixa própria: a linha do tempo começa no papel mais antigo (a híbrida soma a roça de 1976)
  const rocaTl = papeisRuraisComAno(c).filter(p=>p.ativ && p.de).sort((a, b)=>a.de - b.de), rocaSeg = [];
  for(const p of rocaTl){ const u = rocaSeg[rocaSeg.length-1]; if(u && p.de <= u.ate + 1){ u.ate = Math.max(u.ate, p.ate); u.ps.push(p.rotLimpo); } else rocaSeg.push({de:p.de, ate:p.ate, ps:[p.rotLimpo]}); }
  const ini = Math.max(Math.min(+(ct && ct.periodos[0] ? ct.periodos[0][0].slice(0,4) : hj.slice(0,4)), ...rocaSeg.map(s=>s.de)), +hj.slice(0,4) - 55);
  const t0 = Date.parse(`${ini}-01-01`), t1 = Date.parse(`${+hj.slice(0,4)+2}-01-01`);
  const pos = iso => Math.max(0, Math.min(100, (Date.parse(iso) - t0) / (t1 - t0) * 100));
  const bar = (a, b, cls, txt, tit) => { const l = pos(a), w = Math.max(0.6, pos(b) - l);
    return `<span class="pa-tl-bar ${cls}" style="left:${l}%;width:${w}%" ${tit?`title="${esc(tit)}"`:""}>${txt?esc(txt):""}</span>`; };
  const pto = (a, cls, txt) => `<span class="pa-tl-pto ${cls}" style="left:${pos(a)}%" ${txt?`title="${esc(txt)}"`:""}></span>`;
  const fimMes = s => { const d0 = new Date(Date.parse(ym(s))); d0.setMonth(d0.getMonth()+1); d0.setDate(0); return d0.toISOString().slice(0,10); };
  const contrib = (ct ? ct.periodos : []).map(([a, b])=>bar(ym(a), fimMes(b), "contrib", "", `${a} a ${b}`)).join("")
    + ((an && an.abaixo)||[]).map(x=>comp(x.comp) ? bar(comp(x.comp), fimMes(comp(x.comp).slice(0,7)), "abaixo", "", `${x.comp} abaixo do mínimo`) : "").join("")
    + licencasDaRais(fd.rais).map(l=>l.de && l.ate ? `<span class="pa-tl-lic" style="left:${pos(isoBr(l.de))}%;width:${Math.max(0.6, pos(isoBr(l.ate))-pos(isoBr(l.de)))}%" title="licença sem remuneração de ${esc(l.de)} a ${esc(l.ate)}"></span>` : "").join("");
  const parcelas = (fd.seguros||[]).flatMap(s=>s.parcelas.filter(parcelaRecebida)).map(p=>isoBr(p.pagamento)).filter(Boolean).sort();
  const seguro = parcelas.length ? bar(parcelas[0], parcelas[parcelas.length-1], "seguro", `${parcelas.length} parcelas`) : `<span class="pa-tl-vazio">nenhum no dossiê</span>`;
  const qual = !gr ? "" : gr.semLimite ? bar(hj.slice(0,4)+"-01-01", hj, "qual", "sem limite")
    : bar(comp(gr.ultima) || hj, gr.mantidaAte, "graca", "", `qualidade até ${fmtBarra(gr.mantidaAte)}`)
      + `<span class="pa-tl-rot" style="right:calc(${100 - pos(comp(gr.ultima) || hj)}% + 6px)">até ${String(gr.mantidaAte||"").slice(5,7)}/${String(gr.mantidaAte||"").slice(0,4)}</span>`
      + (gr.complementar ? bar(comp(gr.complementar.comp) || hj, gr.complementar.mantidaAte, "compl", `se complementada, até ${fmtBarra(gr.complementar.mantidaAte)}`) : "");
  const clin = linhaClinica(c.id).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.data||"")).slice(0, 12)
    .map(x=>pto(x.data, x.tipo==="Internação" ? "intern" : "clin", "")).join("");
  const peds = (fd.processos||[]).filter(p=>p.entrada).map(p=>pto(isoBr(p.entrada), /indefer/i.test(JSON.stringify(p.comunicacoes||"")) ? "indef" : "ped", curtoMapa(p.servico).slice(0, 34))).join("");
  // F235 · o carnê de 5 % sem validação e o de 11 % (na aposentadoria por tempo) só contam complementados; o cargo no regime próprio
  const vsTl = ((d.g||{}).vinculos||[]).filter(v=>v.tipo!=="Benefício" && v.inicio), comTl = re => vsTl.filter(v=>(v.indicadores||[]).some(i=>re.test(String(i))));
  const complTl = [...comTl(/^PREC-FBR/).map(v=>[v, "carnê de 5 % não validado"]), ...comTl(/LC123/).map(v=>[v, "carnê de 11 %: na aposentadoria por tempo, só com a diferença"])]
    .map(([v, t])=>bar(isoBr(v.inicio), isoBr(v.fim||"") || hj, "compl", "", `${v.inicio} a ${v.fim || "hoje"}: ${t}`)).join("");
  const cargoTl = comTl(/^PRPPS/).map(v=>bar(isoBr(v.inicio), isoBr(v.fim||"") || hj, "qual", "regime próprio", `cargo público desde ${v.inicio}: o que for trabalhado junto não vai na certidão`)).join("");
  const bensTl = beneficiosDoCnis(d.g).filter(b=>b.de).map(b=>bar(b.de, b.ate || hj, "benef", `B${b.especie}`,
    `${nomeBenef(b.especie)} de ${fmtBarra(b.de)}${b.ate ? ` a ${fmtBarra(b.ate)}` : ", recebendo"}`)).join("") || `<span class="pa-tl-vazio">nenhum no CNIS</span>`;
  const passo = (+hj.slice(0,4)+2-ini) > 24 ? 5 : (+hj.slice(0,4)+2-ini) > 8 ? 2 : 1;
  // F235 · o ano colado no "hoje" sai do eixo, para os dois rótulos não se sobreporem
  const anos = []; for(let y = ini; y <= +hj.slice(0,4)+1; y += passo) if(Math.abs(pos(`${y}-01-01`) - pos(hj)) > 3.5) anos.push(y);
  const linha = (rot, html) => `<div class="pa-tl-linha"><span class="pa-tl-nome">${rot}</span><div class="pa-tl-trilho">${html}</div></div>`;
  return `<figure class="pa-tl" aria-label="Linha do tempo da qualidade de segurado">
    <div class="pa-tl-linha pa-tl-eixo"><span class="pa-tl-nome"></span><div class="pa-tl-trilho">${anos.map(y=>`<span style="left:${pos(`${y}-01-01`)}%">${y}</span>`).join("")}
      <span class="pa-tl-hoje" style="left:${pos(hj)}%">hoje</span></div></div>
    ${rocaSeg.length ? linha("Roça e pesca", rocaSeg.map(s=>bar(`${s.de}-01-01`, `${s.ate}-12-31` < hj ? `${s.ate}-12-31` : hj, "roca", "", `papéis da roça ou da pesca, ${s.de}${s.ate > s.de ? ` a ${s.ate}` : ""}: ${s.ps.join("; ")}`)).join("")) : ""}
    ${linha("Contribuições", contrib + complTl)}${cargoTl ? linha("Cargo público", cargoTl) : ""}${linha("Benefícios", bensTl)}${linha("Seguro-desemprego", seguro)}${linha("Qualidade de segurado", qual)}
    ${linha("Saúde", clin || `<span class="pa-tl-vazio">nenhum no dossiê</span>`)}${linha("Pedidos ao INSS", peds || `<span class="pa-tl-vazio">nenhum no dossiê</span>`)}
    <span class="pa-tl-agora" style="left:calc(116px + (100% - 116px) * ${pos(hj)/100})" aria-hidden="true"></span>
    <figcaption><span><i class="pa-lg contrib"></i>Contribuição no CNIS</span><span><i class="pa-lg abaixo"></i>Abaixo do mínimo</span>
      <span><i class="pa-lg lic"></i>Licença sem remuneração, na RAIS</span><span><i class="pa-lg seguro"></i>Parcelas do seguro-desemprego</span>
      <span><i class="pa-lg benef"></i>Benefício do INSS</span><span><i class="pa-lg graca"></i>Qualidade e graça</span><span><i class="pa-lg compl"></i>Se complementada</span>
      <span><i class="pa-lg clin"></i>Registro clínico</span><span><i class="pa-lg ped"></i>Pedido ao INSS</span>${rocaSeg.length ? `<span><i class="pa-lg roca"></i>Papel da roça ou da pesca</span>` : ""}</figcaption>
  </figure>`;
}
// o nome do titular no CNIS: o gravado na leitura e, nas fichas lidas antes de
// ele ser gravado, o do texto do CNIS baixado pelo dossiê
function nomeDoCnis(c){
  const n = (cnisDe(c)||{}).nome; if(n) return n;
  const a = docsDoDossie(c.id).find(x=>/^CNIS\b/i.test(x.nome||"") && x.texto);
  const m = a && a.texto.match(/Nome:\s*(.+?)\s*$/m);
  return m ? m[1] : "";
}
const nomeIgual = (a, b) => { const n = s => dsa(s).replace(/[^a-z ]/g," ").replace(/\s+/g," ").trim(); return n(a)===n(b); };
async function usarNomeCnis(cliId){
  const c = D.cliPorId.get(cliId), v = c && nomeDoCnis(c).trim(); if(!v) return;
  try{ await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({nome:v})}); }
  catch(e){ return aviso("Não consegui guardar — tente de novo"); }
  c.nome = v; reindexarCliente(c); aviso("Nome atualizado pelo CNIS ✔");
  montarSidebar(); abrirFicha(cliId); irSubCad("pa");
}
// ═══════════════════════════════════════════════════════════════════════
// F214 · A EXPLORAÇÃO NA ANÁLISE DE DIREITO. O que o Primeiro atendimento
// leva (os blocos ligados) abre aqui com mais fundo: a qualidade de segurado
// em painel, com as perdas e os reingressos; o CNIS ao lado da RAIS e do
// CAGED, em vínculos e em remunerações; os CNPJs com a consulta e o inteiro
// teor. Embaixo, as considerações de quem analisa, que ficam à direita junto
// dos trabalhos possíveis.
// ═══════════════════════════════════════════════════════════════════════
const _adxAba = new Map(), _adxDiv = new Map(), _cnisComps = new Map(), _adxTab = new Map(), _adxHist = new Set();
// as competências do CNIS (com os indicadores) só existem no PDF: lidas uma vez, na sessão
async function carregarCnisComps(c){
  if(_cnisComps.has(c.id)) return;
  _cnisComps.set(c.id, {carregando:true});
  await new Promise(r=>setTimeout(r, 0));   // nunca repinta de dentro da pintura que a pediu
  const g = cnisDe(c), an = docsDoDossie(c.id).find(a=>/^CNIS · CNIS completo/i.test(a.nome||"")) || (g && g.caminho ? {caminho:g.caminho} : null);
  let vs = null;
  try{ if(an) vs = lerCnisPdf(await itensDoPdf(await pdfDoAnexo(an))).linhaDoTempo || []; }catch(e){ console.warn("CNIS: remunerações não lidas", e); }
  _cnisComps.set(c.id, {vs: vs || [], erro: !vs});
  if(clienteAberto===c.id) repintarSeLivre();
}
const _raiz = x => soDig(x).slice(0, 8);
// os vínculos dos três sistemas lado a lado, um por empregador e admissão
function vinculosComparados(c, fd){
  const g = cnisDe(c), m = new Map();
  const linha = (raiz, adm, nome) => { const k = `${raiz}|${adm}`; if(!m.has(k)) m.set(k, {raiz, adm, nome, cnis:null, rais:null, caged:null, lic:[]}); const r = m.get(k); if(!r.nome) r.nome = nome; return r; };
  for(const v of ((g && g.vinculos) || []).filter(v=>v.tipo!=="Benefício"))
    linha(_raiz(v.codigo) || v.origem, v.inicio || "", v.origem).cnis = v;
  for(const x of fd.rais||[]){ const r = linha(x.raiz || _raiz(x.cnpj), x.admissao || "", x.nome);
    r.rais = r.rais ? {...r.rais, desligamento: r.rais.desligamento || x.desligamento, anos:[...r.rais.anos, x.ano]} : {...x, anos:[x.ano]}; }
  for(const x of fd.caged||[]) linha(x.raiz, x.admissao || "", x.nome).caged = x;
  // a mesma admissão escrita só num sistema: junta pelo empregador quando há uma linha só dele
  const porRaiz = new Map(); for(const r of m.values()){ const l = porRaiz.get(r.raiz) || []; l.push(r); porRaiz.set(r.raiz, l); }
  for(const l of licencasDaRais(fd.rais)){ const r = [...m.values()].find(r=>r.nome===l.nome || (r.rais && r.rais.nome===l.nome)); if(r) r.lic.push(l); }
  return [...m.values()].map(r=>{
    const ini = [r.cnis && r.cnis.inicio, r.rais && r.rais.admissao, r.caged && r.caged.admissao].filter(Boolean);
    const fim = [r.cnis && (r.cnis.fim || ""), r.rais && (r.rais.desligamento || ""), r.caged && (r.caged.desligamento || "")].filter(x=>x!=null && x!==false);
    const sistemas = [r.cnis, r.rais, r.caged].filter(Boolean).length;
    r.div = sistemas < 2 || new Set(ini).size > 1 || new Set(fim).size > 1 || r.lic.length > 0;
    return r;
  }).sort((a,b)=>isoBr(b.adm||"").localeCompare(isoBr(a.adm||"")));
}
function tabelaVinculos(c, fd, soDiv){
  const vs = vinculosComparados(c, fd).filter(r=>!soDiv || r.div);
  const per = (a, b) => a ? `${esc(a)} a ${esc(b || "em aberto")}` : "—";
  return `<table class="pa-tabela adx-tab"><thead><tr><th>Empregador</th><th>CNIS</th><th>RAIS</th><th>CAGED</th><th>Indicadores</th><th>Licença sem remuneração</th></tr></thead><tbody>
    ${vs.map(r=>`<tr class="${r.div?"div":""}"><td>${esc(r.nome||"—")}</td>
      <td class="mono">${r.cnis ? per(r.cnis.inicio, r.cnis.fim) : `<span class="adx-sem">não consta</span>`}</td>
      <td class="mono">${r.rais ? per(r.rais.admissao, r.rais.desligamento) + ` <span class="meio-sub">(${esc(r.rais.anos.sort().join(", "))})</span>` : `<span class="adx-sem">não consta</span>`}</td>
      <td class="mono">${r.caged ? per(r.caged.admissao, r.caged.desligamento) : `<span class="adx-sem">não consta</span>`}</td>
      <td>${esc(((r.cnis||{}).indicadores||[]).join(", ") || "—")}</td>
      <td class="${r.lic.length?"adx-verm":""}">${r.lic.length ? esc(r.lic.map(l=>`${l.de} a ${l.ate} (${l.dias} dias)`).join("; ")) : "—"}</td></tr>`).join("")
      || `<tr><td colspan="6" class="meio-sub">${soDiv ? "Nenhum vínculo divergente." : "Nenhum vínculo lido."}</td></tr>`}</tbody></table>`;
}
// as remunerações mês a mês: CNIS e RAIS lado a lado, o maior em verde quando
// divergem, o abaixo do mínimo em vermelho e a falta de remuneração apontada
function remuneracoesComparadas(c, fd){
  const st = _cnisComps.get(c.id); if(!st || st.carregando) return null;
  const linhas = new Map(), k = (raiz, comp) => `${raiz}|${chaveComp(comp)}`;
  const pega = (raiz, comp, nome) => { const kk = k(raiz, comp); if(!linhas.has(kk)) linhas.set(kk, {raiz, comp, nome, cnis:null, rais:null, ind:[]}); return linhas.get(kk); };
  for(const v of (st.vs||[]).filter(v=>v.tipo!=="Benefício")) for(const cp of v.comps||[]){
    const l = pega(_raiz(v.codigo) || v.origem, cp.c, v.origem); l.cnis = cp.v; l.ind = cp.ind || []; }
  for(const r of fd.rais||[]) for(const [mm, val] of Object.entries(r.remuneracoes||{})){
    const l = pega(r.raiz || _raiz(r.cnpj), `${mm}/${r.ano}`, r.nome); l.rais = val; }
  return [...linhas.values()].filter(l=>chaveComp(l.comp) >= "1994-07").map(l=>{   // F215 · do Plano Real em diante
    const sm = salarioMinimo(l.comp);
    l.sem = (l.cnis==null || l.cnis===0) || (l.rais!=null && l.rais===0);
    l.div = (l.cnis!=null && l.rais!=null && Math.abs(l.cnis - l.rais) >= 0.01) || l.cnis==null || l.rais==null || l.ind.length > 0 || (sm && ((l.cnis!=null && l.cnis < sm) || (l.rais!=null && l.rais > 0 && l.rais < sm)));
    l.sm = sm; return l;
  }).sort((a,b)=>chaveComp(b.comp).localeCompare(chaveComp(a.comp)));
}
function tabelaRemuneracoes(c, fd, soDiv){
  const ls = remuneracoesComparadas(c, fd);
  if(!ls){ carregarCnisComps(c); return `<p class="meio-sub">Lendo as remunerações do CNIS…</p>`; }
  const st = _cnisComps.get(c.id);
  const val = (x, outro, sm) => x==null ? `<span class="adx-sem">sem remuneração</span>`
    : `<span class="${sm && x>0 && x<sm ? "adx-verm" : outro!=null && x>outro+0.009 ? "adx-verde" : ""}">${x.toLocaleString("pt-BR",{minimumFractionDigits:2})}</span>`;
  const vis = ls.filter(l=>!soDiv || l.div);
  return `${st.erro ? `<p class="meio-sub">O PDF do CNIS não pôde ser lido; aparecem só as remunerações da RAIS.</p>` : ""}
  <table class="pa-tabela adx-tab"><thead><tr><th>Competência</th><th>Empregador</th><th>CNIS</th><th>RAIS</th><th>Mínimo</th><th>Indicadores</th></tr></thead><tbody>
    ${vis.slice(0, 400).map(l=>`<tr class="${l.div?"div":""}"><td class="mono">${esc(l.comp)}</td><td>${esc(l.nome||"—")}</td>
      <td class="mono">${val(l.cnis, l.rais, l.sm)}</td><td class="mono">${val(l.rais, l.cnis, l.sm)}</td>
      <td class="mono meio-sub">${l.sm ? l.sm.toLocaleString("pt-BR",{minimumFractionDigits:2}) : "—"}</td><td>${esc(l.ind.join(", ") || "—")}</td></tr>`).join("")
      || `<tr><td colspan="6" class="meio-sub">${soDiv ? "Nenhuma competência divergente." : "Nenhuma remuneração lida."}</td></tr>`}</tbody></table>
  ${vis.length > 400 ? `<p class="meio-sub">Mostrando as 400 competências mais recentes de ${vis.length}.</p>` : ""}`;
}
// F216 · PEDIDOS AO INSS: protocolos, NBs e laudos médicos numa lista só. Cada
// pedido traz a espécie, a DER, o número e o resultado (deferido em verde,
// indeferido em vermelho); o laudo médico pericial vai junto do NB dele.
function pedidosAoInss(c, fd){
  const m = new Map(), novo = (k, nb) => ({chave:k, nb:nb||"", cod:"", especie:"", der:"", protocolo:"", res:"", desc:"", motivo:"", decisaoEm:"", fontes:new Set(), laudos:[], anexo:null});
  const pega = (nb, chave) => { const k = nb ? "nb:"+nb : chave; if(!m.has(k)) m.set(k, novo(k, nb)); return m.get(k); };
  // o benefício de um NB: a linha dele, ou o pedido concedido do mesmo NB (a concessão é o mesmo fato)
  const doNb = nb => m.get("nb:"+nb) || (p=>{ if(p) m.set("nb:"+nb, p); return p; })([...m.values()].find(x=>x.chave.startsWith("pa:") && x.nb===nb && x.res==="deferido")) || pega(nb, "");
  const resDe = t => /indefer|negad|não reconhec|nao reconhec/i.test(t||"") ? "indeferido" : /defer|concedid|ativo|cessad|reconhecid|mantid/i.test(t||"") ? "deferido" : "";
  // F235 · cada pedido do processo é uma linha: a prorrogação negada não se mistura com a concessão do mesmo NB
  for(const p of fd.processos||[]){
    const dec = (p.comunicacoes||[]).slice(-1)[0] || {};
    const x = pega("", "pa:"+(p.entrada||"")+p.servico); x.nb = x.nb || p.nb || dec.nb || "";
    x.especie = x.especie || p.servico || ""; x.der = x.der || p.entrada || ""; x.fontes.add("pedido administrativo"); x.anexo = x.anexo || (p.anexo||{}).id;
    const r = resDe(dec.decisao) || resDe(p.status); if(r) x.res = r;
    if(dec.decisao){ x.desc = dec.decisao + (dec.motivo ? `: ${dec.motivo}` : ""); x.motivo = dec.motivo || ""; } else if(p.status) x.desc = p.status;
    if(/^Conclu/i.test(p.status||"")) x.decisaoEm = p.atualizado || "";
  }
  // a carta é a concessão: junta-se ao pedido do mesmo NB e da mesma DER; sem ele, abre a linha do benefício
  for(const k of fd.cartas||[]){
    const mesmo = [...m.values()].find(x=>x.chave.startsWith("pa:") && x.nb===k.nb && x.der && x.der===k.der);
    const x = mesmo || pega(k.nb, "ct:"+k.nb); if(mesmo && k.nb) m.set("nb:"+k.nb, mesmo);
    x.especie = x.especie || k.especie; x.der = x.der || k.der; if(!x.res) x.res = "deferido"; x.fontes.add("carta de concessão"); x.anexo = x.anexo || (k.anexo||{}).id; }
  const pdf = triagemDe(c).pdf || {};
  for(const b of [...(((pdf.declaracao||{}).beneficios)||[]), ...((((pdf.cnis||{}).analise||{}).benefAtivos)||[])]){
    if(!b.nb) continue; const x = doNb(soDig(b.nb)); x.especie = x.especie || b.especie || ""; x.der = x.der || b.inicio || "";
    if(!x.res) x.res = resDe(b.situacao); x.fontes.add(b.situacao ? `benefício ${String(b.situacao).toLowerCase()}` : "benefício"); }
  for(const v of ((cnisDe(c)||{}).vinculos||[]).filter(v=>v.tipo==="Benefício" && v.nb)){
    const x = doNb(soDig(v.nb)); x.cod = x.cod || String(v.especie||""); x.especie = x.especie || [v.especie, v.origem].filter(Boolean).join(" - "); x.der = x.der || v.inicio || "";
    if(!x.res) x.res = resDe(v.situacao) || (v.inicio ? "deferido" : ""); x.fontes.add("CNIS"); }
  for(const l of fd.laudos||[]){
    const doPed = l.nb && [...new Set(m.values())].filter(x=>x.chave.startsWith("pa:") && x.nb===l.nb && x.der && isoBr(x.der) <= isoBr(l.exame||"")).sort((a, b)=>isoBr(a.der).localeCompare(isoBr(b.der))).pop();
    const x = doPed || (l.nb ? doNb(l.nb) : pega("", "ld:"+l.exame)); x.laudos.push(l); x.fontes.add("laudo médico pericial");
    if(!x.res && l.resultado) x.res = l.resultado==="incapaz" ? "deferido" : "indeferido"; }
  return [...new Set(m.values())].map(x=>({...x, fontes:[...x.fontes]})).sort((a,b)=>isoBr(b.der||"").localeCompare(isoBr(a.der||"")));
}
// F235 · os prazos que correm, lidos do dossiê: o recurso ao CRPS de cada decisão contrária ainda no prazo.
// Vale para a faixa do alto do atendimento e para o resumo dos pedidos, marcado ou não o prazo no caso.
function prazosDoDossie(c){
  const fd = fontesDoDossie(c.id), hj = hoje(), item = PRAZOS_CATALOGO.find(x=>x.id==="crps");
  return (fd.processos||[]).map(p=>{ const d = (p.comunicacoes||[]).slice(-1)[0];
    if(!d || !d.contra || !/^Conclu/i.test(p.status||"") || !p.atualizado) return null;
    const fatal = contarPrazo(isoBr(p.atualizado), item); if(!fatal || fatal < hj) return null;
    return {fatal, anexo:(p.anexo||{}).id, texto:`recurso ao CRPS até ${fmtBarra(fatal)} contra a negativa de ${p.atualizado}: ${String(p.servico||"pedido").replace(/^./, x=>x.toLowerCase())}${d.nb||p.nb ? ` (NB ${fmtNb(d.nb||p.nb)})` : ""}`};
  }).filter(Boolean).sort((a, b)=>a.fatal.localeCompare(b.fatal));
}
// "faltam 18 dias", "vence hoje"
function faltamTxt(iso){ const d = diasAte(iso); return d > 1 ? `faltam ${d} dias` : d===1 ? "falta 1 dia" : d===0 ? "vence hoje" : "venceu"; }
// "AUXILIO DOENCA PREVIDENCIARIO" → "Auxílio doença previdenciário": caixa normal, com os acentos das palavras comuns do INSS
const ACENTOS_INSS = {auxilio:"auxílio", doenca:"doença", previdenciario:"previdenciário", acidentario:"acidentário", temporaria:"temporária", contribuicao:"contribuição",
  pensao:"pensão", reclusao:"reclusão", deficiencia:"deficiência", beneficio:"benefício", salario:"salário", prestacao:"prestação", concessao:"concessão",
  prorrogacao:"prorrogação", revisao:"revisão", certidao:"certidão", especie:"espécie", servico:"serviço", continuada:"continuada", acidentaria:"acidentária"};
const semCaixa = s => cap1(String(s||"").toLowerCase().replace(/[a-zà-ú]+/g, w=>ACENTOS_INSS[w]||w));
const _pedSoIndef = new Set();
function painelPedidos(c, fd){
  const ps = pedidosAoInss(c, fd), so = _pedSoIndef.has(c.id), vis = ps.filter(p=>!so || p.res==="indeferido");
  if(!ps.length) return `<p class="meio-sub">O dossiê não traz pedido, NB nem laudo médico pericial.</p>`;
  const nInd = ps.filter(p=>p.res==="indeferido").length;
  return `<div class="adx-sec-cab"><span class="meio-sub">${ps.length} ${ps.length===1?"pedido":"pedidos"} · ${nInd} ${nInd===1?"indeferido":"indeferidos"}</span>
      <button type="button" class="adx-chave${so?" on":""}" role="switch" aria-checked="${so}" onclick="${so ? `_pedSoIndef.delete('${c.id}')` : `_pedSoIndef.add('${c.id}')`};repintarFicha()"><i></i>${so ? "Só os indeferidos" : "Todos os pedidos"}</button></div>
    <ul class="adx-peds">${vis.map(p=>`<li><i class="adx-res ${p.res||"nd"}" title="${p.res||"sem resultado no dossiê"}"></i>
      <div><b>${esc(p.especie || "Pedido sem espécie lida")}</b> <span class="meio-sub">${esc(p.res || "sem resultado no dossiê")}</span>
        <div class="mono adx-ped-dados">${p.der ? `DER ${esc(p.der)}` : "DER não lida"}${p.nb ? ` · NB ${esc(p.nb)}` : ""}</div>
        ${p.desc ? `<div class="adx-ped-desc">${esc(p.desc)}</div>` : ""}
        ${p.laudos.map(l=>`<div class="adx-ped-laudo">Laudo médico pericial${l.exame ? ` de ${esc(l.exame)}` : ""}: ${esc(l.resultado || "sem conclusão lida")}${l.dii ? ` · DII ${esc(l.dii)}` : ""}${l.dcb ? ` · DCB ${esc(l.dcb)}` : ""}${l.anexo ? ` · <button type="button" class="adr-link" onclick="abrirAnexo('${l.anexo.id}')">ver</button>` : ""}</div>`).join("")}
        <div class="meio-sub">${esc(p.fontes.join(", "))}${p.anexo ? ` · <button type="button" class="adr-link" onclick="abrirAnexo('${p.anexo}')">ver</button>` : ""}</div></div></li>`).join("")
      || `<li class="meio-sub">Nenhum indeferido.</li>`}</ul>`;
}
// F215 · as contribuições por categoria: facultativo de baixa renda (5 %),
// MEI (5 % do contribuinte individual) e facultativo ou individual a 11 %.
// Primeiro só os meses; a chave abre a tabela com valor e indicadores.
const CAT_CONTRIB = [
  ["baixa", "Facultativo de baixa renda (5 %)", (v, cp)=>/Facultativo/.test(v.tipo||"") && (cp.aliq===5 || (cp.ind||[]).some(i=>/FBR|BAIXA/i.test(i)))],
  ["mei", "MEI (5 %)", (v, cp)=>/MEI|Microempreendedor/i.test(v.origem||"") || (cp.ind||[]).some(i=>/MEI/.test(i)) || (/Contribuinte Individual/.test(v.tipo||"") && cp.aliq===5)],
  ["onze", "Facultativo ou individual a 11 %", (v, cp)=>/Facultativo|Contribuinte Individual/.test(v.tipo||"") && cp.aliq===11],
];
function contribuicoesPorCategoria(c){
  const st = _cnisComps.get(c.id); if(!st || st.carregando) return null;
  const out = Object.fromEntries(CAT_CONTRIB.map(([k])=>[k, []]));
  for(const v of (st.vs||[]).filter(v=>v.tipo!=="Benefício")) for(const cp of v.comps||[]){
    const cat = CAT_CONTRIB.find(([, , f])=>f(v, cp)); if(cat) out[cat[0]].push({...cp, tipo:v.tipo});
  }
  for(const k in out) out[k].sort((a,b)=>chaveComp(a.c).localeCompare(chaveComp(b.c)));
  return out;
}
// os meses em faixas: 01/2020 a 06/2020, 09/2020
function faixasDeMeses(cs){
  const ks = cs.map(x=>chaveComp(x.c)), out = [];
  const prox = k => { const [y, m] = k.split("-").map(Number); return m===12 ? `${y+1}-01` : `${y}-${String(m+1).padStart(2,"0")}`; };
  const br = k => k.split("-").reverse().join("/");
  for(let i = 0; i < ks.length; ){ let j = i; while(j+1 < ks.length && ks[j+1]===prox(ks[j])) j++;
    out.push(i===j ? br(ks[i]) : `${br(ks[i])} a ${br(ks[j])}`); i = j+1; }
  return out.join(", ");
}
function painelCategorias(c){
  const cat = contribuicoesPorCategoria(c);
  if(!cat){ carregarCnisComps(c); return ""; }
  return CAT_CONTRIB.filter(([k])=>cat[k].length).map(([k, rot])=>{ const cs = cat[k], tab = _adxTab.get(c.id+k);
    return `<section class="adx-sec"><div class="adx-sec-cab"><h3>${esc(rot)} · ${cs.length} ${cs.length===1?"mês":"meses"}</h3>
      <button type="button" class="adx-chave${tab?" on":""}" role="switch" aria-checked="${!!tab}" onclick="_adxTab.set('${c.id}${k}',${!tab});repintarFicha()"><i></i>${tab ? "Em tabela" : "Só os meses"}</button></div>
      ${tab ? `<table class="pa-tabela"><thead><tr><th>Competência</th><th>Salário de contribuição</th><th>Alíquota</th><th>Indicadores</th></tr></thead><tbody>
        ${cs.map(x=>`<tr><td class="mono">${esc(x.c)}</td><td class="mono${salarioMinimo(x.c) && x.v < salarioMinimo(x.c) ? " adx-verm" : ""}">${x.v.toLocaleString("pt-BR",{minimumFractionDigits:2})}</td>
          <td class="mono">${x.aliq!=null ? x.aliq+" %" : "—"}</td><td>${esc((x.ind||[]).join(", ") || "—")}</td></tr>`).join("")}</tbody></table>`
        : `<p class="adx-meses mono">${esc(faixasDeMeses(cs))}</p>`}</section>`; }).join("");
}
// a qualidade de segurado ao longo do tempo: cada período contribuído, a graça
// que veio depois, a perda e o reingresso. O último trecho é o da conta do CRM
// (calcularGraca); os anteriores são estimados pelo art. 15 da Lei 8.213/91.
function historiaQualidade(c, d){
  const ct = d.ct, gr = d.gr; if(!ct || !(ct.periodos||[]).length) return [];
  const ps = ct.periodos.map(([a, b])=>({a, b})), out = []; let acum = 0;
  const mes = (ym, n) => { const [y, m] = ym.split("-").map(Number), t = y*12 + (m-1) + n; return `${Math.floor(t/12)}-${String(t%12+1).padStart(2,"0")}`; };
  const meses = (a, b) => { const [y1, m1] = a.split("-").map(Number), [y2, m2] = b.split("-").map(Number); return (y2-y1)*12 + (m2-m1) + 1; };
  ps.forEach((p, i)=>{
    acum += meses(p.a, p.b);
    const prox = ps[i+1], g = acum > 120 ? 24 : 12, perda = `${mes(p.b, g + 2)}-16`;
    out.push({tipo:"contrib", de:p.a, ate:p.b, txt:`${meses(p.a, p.b)} meses de contribuição`});
    if(!prox){
      const ate = (gr && (gr.mantidaAte||"").slice(0,7)) || mes(p.b, g);
      out.push({tipo:"graca", de:mes(p.b, 1), ate, g, txt: gr && gr.semLimite ? "benefício em manutenção: qualidade sem limite" : `graça, qualidade mantida até ${gr ? fmtBarra(gr.mantidaAte) : ate}`});
      if(gr && gr.vencida && !gr.semLimite) out.push({tipo:"perda", de:(gr.perda||"").slice(0,7) || mes(ate, 1), ate:hoje().slice(0,7), txt:`sem qualidade desde ${fmtBarra(gr.perda)}`});
      return; }
    if(`${prox.a}-01` < perda){ out.push({tipo:"graca", de:mes(p.b, 1), ate:mes(prox.a, -1), txt:"sem perda: voltou a contribuir dentro da graça"}); }
    // F235 · o trecho de perda guarda a data da perda: antes dela, ainda é graça
    else { out.push({tipo:"perda", de:mes(p.b, 1), ate:mes(prox.a, -1), perdaEm:perda, txt:`graça de ${g} meses; perda estimada em ${fmtBarra(perda)}`});
      out.push({tipo:"reingresso", de:prox.a, ate:prox.a, txt:`reingresso em ${prox.a.split("-").reverse().join("/")}`}); acum = 0; }
  });
  return out;
}
function painelQualidade(c, d){
  const gr = d.gr, h = historiaQualidade(c, d);
  if(!gr && !h.length) return `<p class="meio-sub">O CNIS ainda não foi lido.</p>`;
  const aberto = _adxHist.has(c.id);
  const ultima = gr && gr.ultima ? gr.ultima : "—";
  const ate = !gr ? "—" : gr.semLimite ? "sem limite (benefício em manutenção)" : fmtBarra(gr.mantidaAte);
  const resumo = `<div class="adx-qual"><div><small>Última contribuição ou benefício</small><b class="mono">${esc(ultima)}</b></div>
      <div><small>Qualidade mantida até</small><b class="mono${gr && gr.vencida ? " adx-verm" : ""}">${esc(ate)}</b></div>
      ${gr && gr.vencida && !gr.semLimite ? `<div><small>Perda</small><b class="mono adx-verm">${esc(fmtBarra(gr.perda))}</b></div>` : ""}
      <button type="button" class="btn-mini" aria-expanded="${aberto}" onclick="${aberto ? `_adxHist.delete('${c.id}')` : `_adxHist.add('${c.id}')`};repintarFicha()">${aberto ? "Fechar o histórico" : "Ver todo o histórico"}</button></div>`;
  if(!aberto || !h.length) return resumo;
  const t0 = Date.parse(`${h[0].de}-01`), t1 = Math.max(Date.parse(hoje()), Date.parse(`${h[h.length-1].ate}-28`));
  const pos = ym => Math.max(0, Math.min(100, (Date.parse(`${ym}-01`) - t0) / (t1 - t0) * 100));
  const y0 = +h[0].de.slice(0,4), y1 = +hoje().slice(0,4), passo = Math.max(1, Math.ceil((y1 - y0) / 12)), anos = [];
  for(let y = y0; y <= y1; y += passo) anos.push(y);
  const nPerda = h.filter(x=>x.tipo==="perda").length, nRe = h.filter(x=>x.tipo==="reingresso").length;
  const ROT = {contrib:"Contribuição", graca:"Graça", perda:"Sem qualidade"};
  return resumo + `<div class="adx-kpis"><span><b>${nPerda}</b> ${nPerda===1?"perda":"perdas"} da qualidade</span><span><b>${nRe}</b> ${nRe===1?"reingresso":"reingressos"}</span></div>
    <figure class="adx-graf" aria-label="Qualidade de segurado ao longo do tempo">
      <div class="adx-graf-linha">${h.filter(x=>x.tipo!=="reingresso").map(x=>{ const w = Math.max(0.6, pos(x.ate) - pos(x.de));
        return `<span class="adx-bar ${x.tipo}" style="left:${pos(x.de)}%;width:${w}%" title="${esc(x.de.split("-").reverse().join("/"))} a ${esc(x.ate.split("-").reverse().join("/"))}: ${esc(x.txt)}">${w > 9 ? esc(ROT[x.tipo]) : ""}</span>`; }).join("")}
        ${h.filter(x=>x.tipo==="reingresso").map(x=>`<span class="adx-pino" style="left:${pos(x.de)}%" title="${esc(x.txt)}"><i>${esc(x.de.slice(5)+"/"+x.de.slice(0,4))}</i></span>`).join("")}
        <span class="adx-hoje" style="left:${pos(hoje().slice(0,7))}%"><i>hoje</i></span></div>
      <div class="adx-eixo">${anos.map(y=>`<span style="left:${pos(`${y}-01`)}%">${y}</span>`).join("")}</div>
      <figcaption class="adx-leg"><span><i class="adx-bar contrib"></i>Contribuição</span><span><i class="adx-bar graca"></i>Graça</span><span><i class="adx-bar perda"></i>Sem qualidade</span><span><i class="adx-pino-lg"></i>Reingresso</span></figcaption>
    </figure>
    <ol class="adx-hist">${h.map(x=>`<li class="${x.tipo}"><span class="mono">${esc(x.de.split("-").reverse().join("/"))}${x.ate!==x.de ? ` a ${esc(x.ate.split("-").reverse().join("/"))}` : ""}</span> ${esc(x.txt)}</li>`).join("")}</ol>
    <p class="meio-sub">Os trechos anteriores ao último são estimados pelo art. 15 da Lei 8.213/91 (12 meses, ou 24 com mais de 120 contribuições sem perda), sem o acréscimo do desemprego; o último segue a conta da Identificação.</p>`;
}
function painelCnpjs(c, fd){
  if(!(fd.cnpjs||[]).length) return `<p class="meio-sub">${fd.redesim ? "A Redesim não traz CNPJ no CPF." : "A Redesim não foi consultada."}</p>`;
  return `<ul class="adx-cnpjs">${fd.cnpjs.map(e=>{ const d = soDig(e.cnpj), w = _cnpjWs.get(d) || {};
    return `<li><b class="mono">${esc(e.cnpj)}</b> ${esc(e.razao||e.nome||"")}<div class="meio-sub">${esc([e.situacao, e.vinculo, e.qualificacao, e.local||e.municipio].filter(Boolean).join(" · "))}</div>
      ${w.dados ? `<div class="adx-ws">${esc(resumoCnpjWs(w.dados))}</div>` : w.erro ? `<div class="meio-sub">${esc(w.erro)}</div>` : ""}
      <span class="adx-acoes"><button type="button" class="btn-mini" ${w.carregando?"disabled":""} onclick="consultarCnpjWs('${d}')">${w.carregando ? "Consultando…" : "Consultar"}</button>
      ${e.anexo ? `<button type="button" class="btn-mini" onclick="abrirAnexo('${e.anexo.id}')" title="Inteiro teor"><span aria-hidden="true">Íntegra</span><span class="sr-only">Inteiro teor</span></button>` : ""}</span></li>`; }).join("")}</ul>`;
}
function exploracaoDireito(c, ks){
  if(!(docsDoDossie(c.id).length || cnisDe(c))) return "";
  const d = paDados(c, ks), vai = b => paVai(c.id, b), sec = [];
  const aba = _adxAba.get(c.id) || "vinculos", soDiv = _adxDiv.has(c.id) ? !!_adxDiv.get(c.id) : true;
  if(vai("qual")) sec.push(["Qualidade de segurado", painelQualidade(c, d) + `<div class="mq-pa"><div class="rotulo-caso">Manutenção da Qualidade de Segurado</div>${blocoManutencao(c, "pa")}</div>`]);   // F282
  if(vai("cnis") || vai("rais") || vai("car")) sec.push(["CNIS, RAIS e CAGED", `<div class="adx-abas" role="tablist">
      <button type="button" role="tab" aria-selected="${aba==="vinculos"}" class="${aba==="vinculos"?"on":""}" onclick="_adxAba.set('${c.id}','vinculos');repintarFicha()">Vínculos</button>
      <button type="button" role="tab" aria-selected="${aba==="remun"}" class="${aba==="remun"?"on":""}" onclick="_adxAba.set('${c.id}','remun');repintarFicha()">Remunerações</button>
      <button type="button" class="adx-chave${soDiv?" on":""}" role="switch" aria-checked="${soDiv}" onclick="_adxDiv.set('${c.id}',${!soDiv});repintarFicha()"><i></i>${soDiv ? "Mostrando só o divergente" : "Mostrando tudo"}</button></div>
    ${aba==="vinculos" ? tabelaVinculos(c, d.fd, soDiv) : tabelaRemuneracoes(c, d.fd, soDiv)}`]);
  if(vai("cnpj")) sec.push(["CNPJs do titular", painelCnpjs(c, d.fd)]);
  if(vai("ped")) sec.push(["Pedidos ao INSS", painelPedidos(c, d.fd)]);
  const cats = (vai("cnis") || vai("car")) ? painelCategorias(c) : "";
  const outros = blocosDoPA(d).filter(([b])=>vai(b) && !["qual","car","cnis","rais","cnpj","falta","ped"].includes(b) && d.grupos[b].length);
  for(const [b, rot] of outros) sec.push([rot, `<ul class="mapa-lista pa-fatos">${d.grupos[b].map(x=>`<li class="est-${x.est}"><i class="mapa-bola" aria-hidden="true"></i><span>${esc(x.texto)}</span>
    <span class="dossie-orig">${esc(x.fonte||"")}${x.anexo ? ` · <button type="button" class="adr-link" onclick="abrirAnexo('${x.anexo}')">ver</button>` : ""}</span></li>`).join("")}</ul>`]);
  if(!sec.length && !cats) return "";
  return sec.map(([t, h])=>`<section class="adx-sec"><h3>${esc(t)}</h3>${h}</section>`).join("") + cats;
}
// as considerações de quem analisa: gravadas na ficha (campos.consideracoes)
function consideracoesDe(c){ return ((c.campos||{}).consideracoes)||[]; }
async function addConsideracao(cliId){
  const c = D.cliPorId.get(cliId), el = document.getElementById("adx-cons"); if(!c || !el) return;
  const texto = el.value.trim(); if(!texto) return aviso("Escreva a consideração");
  const campos = {...(c.campos||{}), consideracoes:[...consideracoesDe(c), {em:new Date().toISOString(), quem:(eu.nome||"").split(" ")[0], texto}]};
  try{ await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({campos})}); }
  catch(e){ return aviso("Não consegui guardar — tente de novo"); }
  c.campos = campos; el.value = ""; repintarFicha();
}
function caixaConsideracoes(c){
  return `<section class="adx-sec"><h3>Minhas considerações</h3>
    <textarea id="adx-cons" rows="3" placeholder="O que a leitura dos documentos mostrou, o que conferir, o que pedir ao cliente…"
      style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid var(--borda);border-radius:8px;font:inherit;font-size:14px;line-height:1.5;resize:vertical;background:var(--branco,#fff)"></textarea>
    <div class="form-linha" style="justify-content:flex-end"><button type="button" class="adr-bt adr-primario" onclick="addConsideracao('${c.id}')" title="Adicionar consideração">Adicionar<span class="sr-only"> consideração</span></button></div></section>`;
}
function listaConsideracoes(c){
  const cs = consideracoesDe(c);
  return `<section class="adx-sec adx-lado-cons"><h3>Considerações</h3>${cs.length ? `<ol class="adx-hist">${cs.slice().reverse().map(x=>
    `<li><span class="mono">${esc(fmtBarra(String(x.em).slice(0,10)))}</span> <b>${esc(x.quem||"")}</b> ${esc(x.texto)}</li>`).join("")}</ol>` : `<p class="meio-sub">Nenhuma ainda.</p>`}</section>`;
}
// ══════════════════════════════════════════════════════════════════════════
// F217 · ANÁLISE POR BENEFÍCIO: o que se marca no Primeiro atendimento abre
// os quadros da Análise de Direito
// ══════════════════════════════════════════════════════════════════════════
// Cada família de PONTOS_ESPECIE ramifica em benefícios [opção, rótulo,
// espécie, subespécie, módulos]. O módulo é um quadro da Análise de Direito:
// o BPC do deficiente abre deficiência e renda, e não abre tempo especial nem
// rural; o auxílio-acidente abre acidente e nexo, e não abre tempo. Os números
// de requisito vêm da base de conhecimento (skills base-*), sem conferência em
// fonte oficial, e a tela diz isso. A escolha e o que se digita vivem na ficha
// (campos.ad_modulos) e entram, em cópia, em cada análise registrada.
const BENEF = {
  incapacidade: [["b31","Auxílio temporário · B31","B31","B31",["qualidade","carencia","incap"]],
                 ["b32","Aposentadoria permanente · B32","B32","B32",["qualidade","carencia","incap"]],
                 ["acid","Acidentário · B91/B92","B91","B91",["qualidade","incap","acid"]],
                 ["REST","Restabelecimento do auxílio cortado","REST","REST",["qualidade","carencia","incap"]]],
  b94: [["b94","Acidentário · B94","B94","B94",["qualidade","acid","incap"]],
        ["b36","Previdenciário · B36","B36","B36",["qualidade","acid","incap"]]],
  tempo: [["idade","Por idade urbana · B41","B41","B41",["idade","carencia","tempos"]],
          ["transicao","Tempo de contribuição e transição · B42","B42","B42",["tempos","carencia","idade","transicao"]],
          ["professor","Professor · B57","B57","B57",["tempos","carencia","idade","magisterio"]],
          ["pcd","PcD por tempo, LC 142 · B42","B42","B42.PCD",["tempos","carencia","defic"]],
          ["pcd_idade","PcD por idade, LC 142 · B41","B41","B41.PCD",["idade","tempos","carencia","defic"]]],
  especial: [["b46","Aposentadoria especial · B46","B46","B46",["tempos","especial","carencia"]],
             ["conv","Conversão de tempo especial","B46","B46.CONV",["tempos","especial"]]],
  rural: [["idade_rural","Por idade rural · B41","B41","B41.RURAL",["idade","rural","tempos"]],
          ["hibrida","Híbrida · B41","B41","B41.HIBRIDA",["idade","carencia","rural","tempos"]],
          ["SD","Seguro-defeso do pescador artesanal","SD","SD",["rural"]]],
  bpc: [["def","Pessoa com deficiência · B87","B87","B87",["defic","renda"]],
        ["idoso","Idoso · B88","B88","B88",["idade","renda"]]],
  pensao: [["morte","Pensão por morte · B21","B21","B21",["qualidade","dependentes"]],
           ["reclusao","Auxílio-reclusão · B25","B25","B25",["qualidade","carencia","dependentes"]],
           ["B93","Pensão por acidente do trabalho · B93","B93","B93",["qualidade","dependentes","acid"]]],
  maternidade: [["urb","Urbana · B80","B80","B80",["qualidade","maternidade"]],
                ["rur","Rural · B80","B80","B80.RURAL",["rural","maternidade"]]],
  revisao: [["rev","Revisão de benefício","REV","REV",["tempos","revisao"]],   // F235 · a revisão do especial abre o quadro Tempos
            ["IIR","Isenção de imposto de renda","IIR","IIR",["revisao"]]],
  cnis: [["acerto","Acerto de CNIS","CNIS","CNIS",["cnis_acerto"]],
         ["GPS","Regularizar contribuições (atrasadas e complementação)","GPS","GPS",["cnis_acerto"]],
         ["CTC","Certidão de tempo para o regime próprio (CTC)","CTC","CTC",["tempos"]]],
  crps: [["crps","Recurso ao CRPS","","",["crps"]],
         ["COPIA","Cópia do processo administrativo","COPIA","COPIA",["crps"]],
         ["JA","Justificação administrativa (testemunhas)","JA","JA",["crps"]]],
};
const BENEF_ORDEM = ["incapacidade","b94","tempo","especial","rural","bpc","pensao","maternidade","revisao","cnis","crps"];
const MOD_ORDEM = ["tempos","idade","carencia","qualidade","transicao","especial","magisterio","rural","defic","incap","acid","renda","dependentes","maternidade","revisao","cnis_acerto","crps"];
const SN = ["","Não","Sim"];
// os quadros: rótulo e os campos que o advogado informa (chave, rótulo, tipo, opções)
const MOD_AD = {
  tempos: {rot:"Tempos de contribuição", campos:[]},
  idade: {rot:"Idade", campos:[]},
  carencia: {rot:"Carência", campos:[["car_cumprida","Contribuições para carência","number"],["car_reingresso","Reingresso após perda da qualidade (art. 27-A)","select",SN]]},
  qualidade: {rot:"Qualidade de segurado", campos:[["qua_fato","Data do fato (DII, óbito, prisão, acidente)","date"],["qua_desemprego","Desemprego comprovado","select",SN]]},
  transicao: {rot:"Regras de transição da EC 103", campos:[]},
  especial: {rot:"Tempo especial", campos:[["esp_anos","Tempo exigido para o agente","select",["","15","20","25"]],["esp_ppp","PPP no dossiê ou com o cliente","select",SN],["esp_ltcat","LTCAT ou laudo de base","select",SN],["esp_epi","EPI declarado eficaz no PPP","select",SN],["esp_continua","Continua na atividade nociva (Tema 709)","select",SN]]},
  // F235 · educação infantil é nível, não função; o auxiliar que dava aula como a titular é função (IN 128, art. 214, VI)
  magisterio: {rot:"Magistério", campos:[["mag_funcao","Função predominante","select",["","Regência","Direção","Coordenação","Assessoramento pedagógico","Professor auxiliar que dava aula como a titular"]],["mag_nivel","Nível de ensino","select",["","Infantil","Fundamental","Médio","Superior"]],["mag_regime","Regime","select",["","RGPS","RPPS","Ambos"]]]},
  rural: {rot:"Trabalho rural", campos:[["rur_regime","Regime","select",["","Segurado especial","Empregado rural","Boia-fria ou diarista","CI rural"]],["rur_prova","Início de prova material","text"],["rur_auto","Autodeclaração feita","select",SN],["rur_imovel","Imóvel e área em módulos fiscais","text"],["rur_renda","Outra renda do grupo familiar","text"]]},
  defic: {rot:"Deficiência", campos:[["def_tipo","Tipo","select",["","Física","Mental","Intelectual","Sensorial","Múltipla"]],["def_did","Início da deficiência (DID)","date"],["def_grau","Grau (LC 142)","select",["","Leve","Moderada","Grave"]],["def_longo","Impedimento de longo prazo (2 anos)","select",SN],["def_cid","CID","text"],["def_laudo","Laudo com domínios e barreiras","select",SN]]},
  incap: {rot:"Incapacidade", campos:[["inc_dii","Início da incapacidade (DII)","date"],["inc_tipo","Tipo","select",["","Temporária","Permanente","Parcial"]],["inc_cid","CID","text"],["inc_pericia","Última perícia","date"],["inc_dcb","Data de fim (do benefício, ou do repouso no atestado)","date"],["inc_trat","Em tratamento","select",SN]]},
  acid: {rot:"Acidente e nexo", campos:[["aci_data","Data do acidente ou da doença","date"],["aci_cat","CAT emitida","select",SN],["aci_nexo","Nexo","select",["","CAT","NTEP","Perícia","Sem nexo"]],["aci_categoria","Categoria na data","select",["","Empregado","Avulso","Segurado especial","Contribuinte individual","Facultativo"]],["aci_sequela","Sequela consolidada","select",SN]]},
  renda: {rot:"Renda do grupo familiar", campos:[["ren_pessoas","Pessoas no grupo familiar","number"],["ren_total","Renda bruta mensal do grupo (R$)","number"],["ren_saude","Gastos com saúde, fralda e dieta (R$)","number"],["ren_cad","CadÚnico atualizado (até 24 meses)","select",SN],["ren_trabalha","Exerce atividade remunerada","select",SN]]},
  dependentes: {rot:"Dependentes", campos:[["dep_instituidor","Instituidor (nome, NB ou CPF)","text"],["dep_fato","Data do óbito ou da prisão","date"],["dep_classe","Dependente","select",["","Cônjuge","Companheiro(a)","Filho menor","Filho inválido ou com deficiência","Menor sob guarda","Pais","Irmão"]],["dep_nasc","Nascimento do dependente","date"],["dep_uniao","Casamento ou união desde","date"],["dep_contrib","Contribuições do instituidor","number"],["dep_prova","Prova da dependência","text"],["dep_regime","Regime da prisão","select",["","Fechado","Semiaberto","Aberto"],["reclusao"]],
    ["dep_media12","Média dos salários de contribuição dos 12 meses antes da prisão (R$)","number",null,["reclusao"]],["dep_teto","Limite da Portaria na data da prisão (R$)","number",null,["reclusao"]]]},
  maternidade: {rot:"Salário-maternidade", campos:[["mat_fato","Fato gerador","select",["","Parto","Adoção ou guarda","Aborto não criminoso","Natimorto"]],["mat_data","Data","date"],["mat_situacao","Situação da segurada","select",["","Empregada","CI ou facultativa","Desempregada em graça","Segurada especial"]]]},
  revisao: {rot:"Revisão", campos:[["rev_nb","NB","text"],["rev_dib","DIB","date"],["rev_primeiro","Primeiro pagamento","date"],["rev_tese","Tese","select",()=>["",...(SUBESPECIES.REV||[]).slice(1).map(x=>x[1].replace(/^Revisão (pelo |por |do |da )?/, ""))]]]},
  cnis_acerto: {rot:"Acerto de CNIS", campos:[["cn_vinculo","Vínculo ou período a acertar","text"],["cn_pendencia","Pendência ou indicador","text"],["cn_prova","Prova (CTPS, GPS, RAIS, reclamatória)","text"]]},
  crps: {rot:"Recurso ao CRPS", campos:[["crp_ciencia","Ciência da decisão","date"],["crp_motivo","Motivo exato do indeferimento","text"],["crp_enunciado","Enunciado do CRPS aplicável","text"]]},
};
const NAT_TEMPO = [["comum","Comum"],["rural","Rural"],["especial","Especial"],["defic","Com deficiência"],["magisterio","Magistério"],["rpps","RPPS (CTC)"],["militar","Militar"],["aprendiz","Aluno-aprendiz"]];
// o detalhe que cada natureza pede na linha: [rótulo, opções ou texto livre]
const NAT_DET = {rural:["Regime",["Segurado especial","Empregado rural","Boia-fria ou diarista","CI rural"]], especial:["Agente, PPP e EPI",null], defic:["Grau",["Leve","Moderada","Grave"]],
  // F235 · a função de cada linha do magistério, com o auxiliar e sem o nível misturado
  magisterio:["Função",["Regência","Direção","Coordenação","Assessoramento","Professor auxiliar"]], rpps:["CTC (número e data)",null], militar:["Documento",null], aprendiz:["Escola e certidão",null]};
// os requisitos numéricos da base de conhecimento, por opção: idade [H, F] e carência
const IDADE_EXIG = {idade:[65,62], hibrida:[65,62], idade_rural:[60,55], idoso:[65,65], pcd_idade:[60,55], professor:[60,57]};
// F220 · conferidos na IN 128 consolidada: 180 (art. 199, II), 12 (art. 196, I), 24 (art. 198, II), PcD por idade 60/55 (art. 311)
const CAR_EXIG = {idade:180, transicao:180, professor:180, pcd:180, pcd_idade:180, b46:180, hibrida:180, idade_rural:180, b31:12, b32:12, reclusao:24};
const SM_2026 = 1621;   // salário mínimo da base (bpc-renda-grupo-familiar); 1/4 = 405,25
const EC103 = "2019-11-13";
// o chip diz o benefício pelo nome: "Dependentes" escondia a pensão e o auxílio-reclusão
const BENEF_ROT = {pensao:"Pensão por morte e auxílio-reclusão", tempo:"Aposentadoria por idade ou tempo"};
const benefRot = fam => BENEF_ROT[fam] || (PONTOS_ESPECIE.find(f=>f.chave===fam)||{rot:fam}).rot;
const benefOpcao = (fam, o) => (BENEF[fam]||[]).find(x=>x[0]===o);
// F231 · a escolha da Análise de Direito (itens do Primeiro atendimento deixados de
// fora, benefícios, campos e tempos) mora na linha do pré-caso, na coluna casos.ad
// (schema_casos_ad.sql), e não mais no cliente: dois atendimentos do mesmo cliente
// não se misturam. No atendimento vale o pré-caso escolhido; fora dele, o caso que
// nasceu de um pré-caso (a linha leva o ad ao virar caso); sem nenhum dos dois, e no
// pré-caso ainda sem linha (o "legado" e o de campos.precasos), campos.ad_modulos.
// F236 · com dois casos nascidos de pré-caso, vale o aberto na ficha (antes, sempre o primeiro, que podia ser o outro)
const casoComAd = c => { const ks = (D.casosDoCliente.get(c.id)||[]).filter(k=>k.ad && !ehPreCaso(k) && k.fase!=="encerrado");
  return ks.find(k=>k.id===casoSel) || ks[0] || null; };
function linhaAd(c){
  const pc = c && preCasoAberto(c), lin = pc && pc.caso_id && D.casoPorId.get(pc.caso_id);
  if(lin && (_atendAberto.has(c.id) || !casoComAd(c))) return lin;
  return c ? casoComAd(c) : null;
}
// a linha sem ad herda, em cópia, o do card anterior (mesmo lembrete) ou, se é o único
// pré-caso vivo, o que o cliente tinha em campos.ad_modulos antes da F231
function herdaAd(c, k, origem){
  const lid = (k.precaso||{}).lembrete_id;
  const irma = lid && (D.casosDoCliente.get(c.id)||[]).find(x=>x!==k && x.ad && (x.precaso||{}).lembrete_id===lid);
  if(irma) return structuredClone(irma.ad);
  const velho = (c.campos||{}).ad_modulos;
  if(!velho || preCasosVivos(c).length!==1) return null;
  if(origem) origem.cliente = true;
  return structuredClone(velho);
}
function admDe(c){
  const k = c && linhaAd(c), a = (k ? k.ad || herdaAd(c, k) : ((c||{}).campos||{}).ad_modulos) || {};
  return {fora:a.fora||[], valores:a.valores||{}, tempos:a.tempos||[], beneficios:a.beneficios, passos:a.passos||{}};   // F238 · o passo aberto de cada página
}
// a opção que a família abre sozinha: a idade e o dossiê decidem
function benefPadrao(c, fam){
  const id = idadeDe(c.dn), sx = sexoDe(c)==="F" ? "F" : "M";
  if(fam==="tempo") return id!=null && id >= IDADE_APOS[sx] ? "idade" : "transicao";
  if(fam==="bpc") return id!=null && id >= 65 ? "idoso" : "def";
  if(fam==="incapacidade") return "b31";
  return BENEF[fam][0][0];
}
// os benefícios marcados: o que a ficha guarda. F235: nada vem marcado sozinho (o sistema
// marcava até quatro famílias pelos sinais do dossiê); os sinais ficam como sugestão no quadro final
// F236 · o caso que a Análise e os Documentos seguem quando não há pré-caso vivo (a mesma escolha do benefSel): o aberto na
// ficha ou o primeiro em andamento. É dele a fase (Pagamentos não monta pedido novo), a DER e os prazos da entrega
function casoDaVez(c){
  if(!c || preCasoAberto(c)) return null;
  const ks = (D.casosDoCliente.get(c.id)||[]).filter(k=>!k.pre_caso && k.fase!=="encerrado");
  return ks.find(k=>k.id===casoSel) || ks[0] || null;
}
function benefSel(c){
  const g = admDe(c).beneficios; if(g) return g;
  const sel = Object.fromEntries([...(_paEsc.get(c.id)||[])].filter(k=>BENEF[k]).map(k=>[k, [benefPadrao(c, k)]]));
  if(Object.keys(sel).length) return sel;
  // F220 · sem escolha gravada e sem sinal do dossiê, vale o benefício que a
  // recepção registrou no pré-caso ou que a última análise decidiu
  const pc = preCasoAberto(c), a = analisesDaVez(c)[0], sv = a && (a.detalhes||{}).servico;
  // F236 · sem pré-caso, o caso em andamento (a espécie dele) responde antes da análise antiga, e o card de Aposentadorias
  // futuras depois dela: a análise do caso B31 abria "nenhum benefício escolhido" e Documentos pedia para marcar um
  const ksV = pc ? [] : (D.casosDoCliente.get(c.id)||[]).filter(k=>!k.pre_caso && k.fase!=="encerrado");
  const kv = ksV.find(k=>k.id===casoSel) || ksV[0], card = !pc && !kv && cardsApos().find(l=>l.cliente_id===c.id);
  const x = [pc && pc.sub, pc && pc.cod, pc && pc.especie, kv && kv.subespecie, kv && kv.especie, kv && kv.beneficio,
    sv && sv.sub, sv && sv.cod, (c.campos||{}).especie, card && especieDoCard(card)].map(opcaoDe).find(Boolean);
  return x ? {[x.fam]:[x.o]} : {};
}
// a opção de benefício de um código (B41, B41.RURAL) ou de um nome do catálogo ("Apos. por Idade")
function opcaoDe(x){
  if(!x) return null;
  const s = String(x), todas = BENEF_ORDEM.flatMap(fam=>BENEF[fam].map(op=>({fam, op})));
  const porSub = todas.find(({op})=>op[3]===s); if(porSub) return {fam:porSub.fam, o:porSub.op[0]};
  const nome = Object.entries(DOC_CAT).find(([, n])=>n===s), porNome = nome && todas.find(({op})=>op[0]===nome[0]);
  if(porNome) return {fam:porNome.fam, o:porNome.op[0]};
  const porCod = todas.find(({op})=>op[2] && op[2]===s);
  return porCod ? {fam:porCod.fam, o:porCod.op[0]} : null;
}
const opcoesSel = c => Object.entries(benefSel(c)).flatMap(([fam, os])=>os.map(o=>benefOpcao(fam, o)).filter(Boolean).map(([o, rot, cod, sub, mods])=>({fam, o, rot, cod, sub, mods})));
const modulosDe = c => { const ops = opcoesSel(c); return MOD_ORDEM.filter(m=>ops.some(o=>o.mods.includes(m))); };
// grava com atraso, para não disparar um PATCH por tecla: a memória muda na hora e o
// PATCH leva só o ad da linha (nunca a fase nem o precaso, que outros escritores mudam).
// Um timer por destino: editar o pré-caso A e passar ao B não cancela a gravação do A.
const _admTimer = new Map();
function admAgendar(chave, grava){
  clearTimeout((_admTimer.get(chave)||{}).t);
  _admTimer.set(chave, {grava, t: setTimeout(()=>{ _admTimer.delete(chave); grava(); }, 600)});
}
// grava já o que estiver esperando (antes de trocar de pré-caso, concluir, sair ou registrar)
async function admGravarAgora(){
  const ps = [..._admTimer.values()]; _admTimer.clear();
  for(const p of ps) clearTimeout(p.t);
  await Promise.all(ps.map(p=>p.grava()));
}
function admSalvar(cliId, muda){
  const c = D.cliPorId.get(cliId); if(!c) return;
  const k = linhaAd(c), o = {}, herdou = !!(k && !k.ad && herdaAd(c, k, o) && o.cliente);
  const adm = admDe(c); muda(adm);
  const falha = () => aviso("Não consegui guardar a análise por benefício — tente de novo");
  if(k){
    k.ad = adm;
    admAgendar(`k:${k.id}`, async ()=>{
      try{ await api(`/rest/v1/casos?id=eq.${k.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({ad:k.ad})}); }
      catch(e){ return falha(); }
      // herdou o do cliente: o velho sai de campos, para não passar a outro pré-caso
      if(herdou && (c.campos||{}).ad_modulos){ const {ad_modulos, ...resto} = c.campos; c.campos = resto;
        try{ await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({campos:c.campos})}); }catch(e){} }
    });
    return;
  }
  c.campos = {...(c.campos||{}), ad_modulos: adm};
  admAgendar(`c:${cliId}`, async ()=>{
    try{ await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({campos:c.campos})}); }
    catch(e){ falha(); }
  });
}
function benefFam(cliId, fam){
  const c = D.cliPorId.get(cliId); if(!c || !BENEF[fam]) return;
  const sel = {...benefSel(c)}, s = new Set(_paEsc.get(cliId)||[]);
  if(sel[fam]){ delete sel[fam]; s.delete(fam); } else { sel[fam] = [benefPadrao(c, fam)]; s.add(fam); }
  _paEsc.set(cliId, s);
  admSalvar(cliId, a=>{ a.beneficios = sel; }); benefRepintar(cliId);
}
function benefOpc(cliId, fam, o){
  const c = D.cliPorId.get(cliId); if(!c || !benefOpcao(fam, o)) return;
  const sel = {...benefSel(c)}, os = new Set(sel[fam]||[]); os.has(o) ? os.delete(o) : os.add(o);
  if(os.size) sel[fam] = [...os]; else delete sel[fam];
  const s = new Set(_paEsc.get(cliId)||[]); os.size ? s.add(fam) : s.delete(fam); _paEsc.set(cliId, s);
  admSalvar(cliId, a=>{ a.beneficios = sel; }); benefRepintar(cliId);
}
// F234 · na Análise de Direito, escolher benefício repinta só o quadrado e o painel (o formulário fica)
const benefRepintar = cliId => subCad==="direito" && document.getElementById("ad-quadrado") ? adRepintarBenef(cliId) : repintarFicha();
// a faixa de chips: a família, e sob ela as opções; vive no Primeiro atendimento e na Análise de Direito
function faixaBeneficios(c, d){
  const sel = benefSel(c), sinal = new Map(((d||{}).trabalhos||[]).map(t=>[t.f.chave, t]));
  const fams = BENEF_ORDEM.slice().sort((a, b)=>(sinal.has(b)?1:0)-(sinal.has(a)?1:0)), nSel = Object.keys(sel).length;
  const chip = fam => { const on = !!sel[fam], t = sinal.get(fam);
    return `<button type="button" class="ben-chip${on?" on":""}" aria-pressed="${on}" data-fam="${fam}" onclick="benefFam('${c.id}','${fam}')">${t ? `<i class="pa-bola ${t.est}" aria-hidden="true"></i>` : ""}${esc(benefRot(fam))}${on && sel[fam].length>1 ? ` <small>${sel[fam].length}</small>` : ""}</button>`; };
  const ramo = fam => `<div class="ben-ramo" data-fam="${fam}"><span class="ben-ramo-rot">${esc(benefRot(fam))}</span>${BENEF[fam].map(([o, rot, cod, sub, mods])=>{ const on = (sel[fam]||[]).includes(o);
    return `<button type="button" class="ben-opc${on?" on":""}" aria-pressed="${on}" data-opc="${fam}.${o}" title="abre: ${esc(mods.map(m=>MOD_AD[m].rot).join(", "))}" onclick="benefOpc('${c.id}','${fam}','${o}')">${esc(rot)}</button>`; }).join("")}</div>`;
  return `<section class="ben" aria-labelledby="ben-t-${c.id.slice(0,8)}"><div class="ben-cab"><h3 id="ben-t-${c.id.slice(0,8)}">Benefícios em análise</h3>
      <span class="meio-sub">${nSel ? `${nSel} ${nSel===1?"família":"famílias"} · na Análise de Direito, cada benefício abre os requisitos dele` : "marque o que entra na análise; cada benefício abre os requisitos dele"}</span></div>
    <div class="ben-chips">${fams.map(chip).join("")}</div>
    ${fams.filter(f=>sel[f]).map(ramo).join("")}
  </section>`;
}
// ── a contagem das linhas de tempo ───────────────────────────────────────
// Cada período vira anos, meses e dias pelo calendário (do início ao dia
// seguinte ao fim) e a soma carrega 30 dias no mês e 12 meses no ano, como o
// INSS soma. Para converter e comparar, o tempo vira dias (ano 365, mês 30).
// shortcut: ano de 365 dias e mês de 30 na soma; a conta oficial é a do Prévius
function durCal(de, ate){
  const a = de.split("-").map(Number), f = new Date(Date.parse(ate+"T12:00:00") + 86400000), b = [f.getUTCFullYear(), f.getUTCMonth()+1, f.getUTCDate()];
  let y = b[0]-a[0], m = b[1]-a[1], d = b[2]-a[2];
  if(d < 0){ m--; d += 30; } if(m < 0){ y--; m += 12; }
  return y < 0 ? null : {y, m, d};
}
// F235 · data a data (IN 128, art. 206, § 1º): os períodos somam anos, meses e dias, e 12 meses fazem 1 ano. O número segue
// na escala do ano de 365 dias, com o mês de 365/12: com o mês de 30, 12 meses davam 360 dias, e o tempo em 13/11/2019
// saía 5 a 10 dias menor que o do INSS (31a7m8d no lugar de 31a7m13d), e o pedágio não fechava com ele
const durDias = p => (p.y*12 + p.m) * 365/12 + p.d;
const fmtDur = p => `${p.y} ${p.y===1?"ano":"anos"}, ${p.m} ${p.m===1?"mês":"meses"} e ${p.d} ${p.d===1?"dia":"dias"}`;
// F235 · a volta na mesma escala: meses inteiros de 365/12 dias e os dias que sobram
function tempoFmt(dias){ const M = 365/12, s = Math.max(0, dias), n = Math.floor(s/M + 1e-9); return fmtDur({y: Math.floor(n/12), m: n%12, d: Math.round(s - n*M)}); }
const anosDe = dias => dias/365;
// os períodos sobrepostos contam uma vez (o tempo de contribuição é tempo de
// calendário): a união dos intervalos, em dias, por natureza e no total
const diaSeguinte = iso => new Date(Date.parse(iso+"T12:00:00") + 86400000).toISOString().slice(0,10);
const diaAnterior = iso => new Date(Date.parse(iso+"T12:00:00") - 86400000).toISOString().slice(0,10);
function fundirIvs(ivs){
  const s = ivs.filter(x=>x[0] && x[1] && x[1] >= x[0]).map(x=>[x[0], x[1]]).sort((p, q)=>p[0] < q[0] ? -1 : 1), out = [];
  for(const [de, ate] of s){ const u = out[out.length-1];
    if(u && de <= diaSeguinte(u[1])){ if(ate > u[1]) u[1] = ate; } else out.push([de, ate]); }
  return out;
}
function uniaoDias(ivs){ return fundirIvs(ivs).reduce((t, [a, b])=>t + durDias(durCal(a, b)), 0); }
// o pedaço de [de, ate] que nenhum intervalo de cob cobre
function semCobertura(de, ate, cob){
  let out = [[de, ate]];
  for(const [a, b] of cob) out = out.flatMap(([x, y])=> b < x || a > y ? [[x, y]]
    : [...(a > x ? [[x, diaAnterior(a)]] : []), ...(b < y ? [[diaSeguinte(b), y]] : [])]);
  return out;
}
// F232 · o especial converte pelo agente (15, 20 ou 25 anos) e pelo sexo, só até
// 13/11/2019 (EC 103, art. 25, § 2º); o período especial sobreposto conta uma vez, pelo
// agente de menor tempo (IN 128, art. 265, par. único).
// shortcut: fatores da redação revogada do art. 70 do RPS e da skill (selo "só na skill") até ler a tabela do art. 188-P, § 5º
const FATOR_ESP = {15:[2.33, 2.00], 20:[1.75, 1.50], 25:[1.40, 1.20]};
// os totais das linhas de tempo até uma data (padrão hoje): por natureza, em 13/11/2019,
// o especial puro e o acréscimo da conversão, e o total para tempo comum
function admTotaisDe(tempos, sx, ate){
  const i = sx==="F" ? 1 : 0, lim = ate || hoje();
  const tot = {porNat:{}, porNat2019:{}, comum:0, comum2019:0, especial:0, especial2019:0, convertido:0, bonus:0, linhas:0, semData:0, aberto:0};
  const ivs = [], ivs2019 = [], porNat = {}, porNat2019 = {}, espPor = {15:[], 20:[], 25:[]};
  for(const r of tempos||[]){
    if(!r.de || (r.ate && r.ate < r.de)){ if(r.de||r.ate||r.onde) tot.semData++; continue; }
    if(r.de > lim) continue;
    const fim = !r.ate || r.ate > lim ? lim : r.ate, nat = r.nat || "comum"; if(!durCal(r.de, fim)) continue;
    if(!r.ate) tot.aberto++;
    tot.linhas++; (porNat[nat] = porNat[nat] || []).push([r.de, fim]); ivs.push([r.de, fim]);
    if(r.de <= EC103){ const a19 = fim < EC103 ? fim : EC103; ivs2019.push([r.de, a19]); (porNat2019[nat] = porNat2019[nat] || []).push([r.de, a19]);
      if(nat==="especial") espPor[[15, 20].includes(+r.esp) ? +r.esp : 25].push([r.de, a19]); }
  }
  for(const [n, l] of Object.entries(porNat)) tot.porNat[n] = uniaoDias(l);
  for(const [n, l] of Object.entries(porNat2019)) tot.porNat2019[n] = uniaoDias(l);
  let cob = [];
  for(const anos of [15, 20, 25]){
    const proprios = fundirIvs(espPor[anos]).flatMap(([a, b])=>semCobertura(a, b, cob));
    tot.bonus += proprios.reduce((t, [a, b])=>t + durDias(durCal(a, b)), 0) * (FATOR_ESP[anos][i] - 1);
    cob = fundirIvs([...cob, ...espPor[anos]]);
  }
  tot.especial = tot.porNat.especial || 0; tot.especial2019 = tot.porNat2019.especial || 0; tot.convertido = tot.especial + tot.bonus;
  tot.comum = uniaoDias(ivs) + tot.bonus; tot.comum2019 = uniaoDias(ivs2019) + tot.bonus;
  return tot;
}
function admTotais(c, ate){ return admTotaisDe(admDe(c).tempos, sexoDe(c)==="F" ? "F" : "M", ate); }
// o contexto que todo quadro usa: sexo, idade, contagem do CNIS, graça, tempos
function admCtx(c, ks){
  const temDossie = !!(docsDoDossie(c.id).length || cnisDe(c)), d = temDossie ? paDados(c, ks) : null;
  const dn = dnIso(c.dn), idade = idadeDe(c.dn), sx = sexoDe(c)==="F" ? "F" : "M";
  return {d, dn, idade, sx, i: sx==="F" ? 1 : 0, ct: d && d.ct, gr: d && d.gr, fd: d ? d.fd : fontesDoDossie(c.id), v: admDe(c).valores, tempos: admDe(c).tempos, tot: admTotais(c), ops: opcoesSel(c)};
}
const admLi = (est, txt) => `<li class="est-${est}"><i class="mapa-bola" aria-hidden="true"></i><span>${txt}</span></li>`;
const admUl = ls => ls.length ? `<ul class="mapa-lista">${ls.join("")}</ul>` : "";
const admFalta = (tem, exig, unid) => tem >= exig ? ["ok", "cumprido"] : ["warn", `falta ${unid(exig - tem)}`];
const anosTxt = a => tempoFmt(a*365);
// cada quadro diz o que o dossiê e as linhas já respondem; o resto é campo
const ADM_CALC = {
  tempos(c, x){ const t = x.tot, nat = Object.entries(t.porNat);
    if(!t.linhas) return `<p class="meio-sub">Nenhum período ainda. Lance um por linha ou traga os vínculos do CNIS.</p>`;
    return `<div class="adm-tot">${nat.map(([n, d])=>`<div><small>${esc((NAT_TEMPO.find(z=>z[0]===n)||[n,n])[1])}</small><b>${tempoFmt(d)}</b></div>`).join("")}
      ${t.especial ? `<div><small>Especial convertido (×${x.sx==="F"?"1,20":"1,40"} até 13/11/2019)</small><b>${tempoFmt(t.convertido)}</b></div>` : ""}
      <div><small>Total para tempo comum</small><b>${tempoFmt(t.comum)}</b></div>
      <div><small>Em 13/11/2019</small><b>${tempoFmt(t.comum2019)}</b></div></div>
      ${x.ct ? `<p class="meio-sub">Pelo CNIS, por competência: ${anosMeses(x.ct.anos, x.ct.meses)}${x.ct.foraMinimo ? `, fora ${x.ct.foraMinimo} ${x.ct.foraMinimo===1?"competência":"competências"} abaixo do mínimo sem complementação (art. 29 da EC 103)` : ""}; as linhas contam o calendário do vínculo.</p>` : ""}
      ${t.aberto ? `<p class="meio-sub">${t.aberto===1?"Um período sem data de fim conta":`${t.aberto} períodos sem data de fim contam`} até hoje.</p>` : ""}
      ${t.semData ? `<p class="meio-sub">${t.semData===1?"Uma linha":`${t.semData} linhas`} sem data de início, fora da conta.</p>` : ""}`; },
  idade(c, x){ if(x.idade==null) return admUl([admLi("warn", `Sem data de nascimento na ficha: preencha na Identificação.`)]);
    const ls = [admLi("info", `Hoje: <b>${x.idade} anos</b> (${fmtBarra(x.dn)}, ${x.sx==="F"?"mulher":"homem"}).`)];
    for(const o of x.ops){ const e = IDADE_EXIG[o.o]; if(!e) continue; const ex = e[x.i];
      ls.push(admLi(x.idade >= ex ? "ok" : "warn", `${esc(o.rot)}: exige ${ex} anos${x.idade >= ex ? ", cumprida" : `, atinge em <b>${fmtBarra(somarAnos(x.dn, ex))}</b>`}.`)); }
    return admUl(ls); },
  carencia(c, x){ const cum = +x.v.car_cumprida || (x.ct ? x.ct.carencia : null), re = x.v.car_reingresso==="Sim", ls = [];
    ls.push(admLi(cum!=null ? "info" : "warn", cum!=null ? `Cumprida: <b>${cum}</b> ${cum===1?"contribuição":"contribuições"}${+x.v.car_cumprida ? "" : " (CNIS, contagem do CRM)"}.` : "O CNIS não foi lido: informe as contribuições."));
    for(const o of x.ops){ let ex = CAR_EXIG[o.o];
      if(["acid","b94","b36"].includes(o.o)) ls.push(admLi("ok", `${esc(o.rot)}: sem carência (art. 26, I e II, da Lei 8.213/91).`));
      else if(o.o==="urb") ls.push(admLi("info", `${esc(o.rot)}: 10 contribuições para CI e facultativa, inexigíveis pela ADI 2110 e pelo Enunciado 19 do CRPS; empregada e desempregada em graça não têm carência.`));
      else if(o.o==="morte") ls.push(admLi("info", `${esc(o.rot)}: sem carência (art. 195, III, da IN 128); 18 contribuições e 2 anos de casamento ou união só mudam a duração da cota.`));
      else if(o.o==="idade_rural") ls.push(admLi("info", `${esc(o.rot)}: 180 meses de atividade rural, com prova material do período (art. 199, II, da IN 128); as contribuições do CNIS não medem esse tempo.`));
      else if(o.o==="pcd_idade" || o.o==="idade" || o.o==="hibrida"){ const [est, txt] = cum!=null ? admFalta(cum, 180, n=>`${n} ${n===1?"contribuição":"contribuições"}`) : ["warn", "a conferir"];
        ls.push(admLi(est, `${esc(o.rot)}: exige <b>180</b> (art. 199, II, da IN 128; inscrito até 24/07/1991 segue a tabela do art. 142 da Lei 8.213/91), ${txt}.`)); }
      else if(ex){ if(re && (o.o==="b31"||o.o==="b32"||o.o==="reclusao")) ex = ex/2;
        const [est, txt] = cum!=null ? admFalta(cum, ex, n=>`${n} ${n===1?"contribuição":"contribuições"}`) : ["warn", "a conferir"];
        ls.push(admLi(est, `${esc(o.rot)}: exige <b>${ex}</b>${re && ex!==CAR_EXIG[o.o] ? " (metade, art. 27-A)" : ""}, ${txt}.`));
        if(o.o==="b31" || o.o==="b32") ls.push(admLi("info", "Sem carência no acidente de qualquer natureza, na doença profissional ou do trabalho e nas doenças da lista do art. 30, III, do RPS (art. 196, II, da IN 128)."));
        if(o.o==="reclusao") ls.push(admLi("info", "As 24 contribuições valem para a prisão a partir de 18/01/2019; antes, sem carência (art. 198 da IN 128).")); } }
    return admUl(ls); },
  qualidade(c, x){ const g = x.gr, ls = [];
    if(!g) ls.push(admLi("warn", "O CNIS não foi lido: a qualidade não foi calculada."));
    else ls.push(admLi(g.semLimite ? "ok" : g.vencida ? "crit" : "ok", g.semLimite ? "Benefício em manutenção: qualidade sem limite." : `${g.vencida ? "Perdida em" : "Mantida até"} <b>${fmtBarra(g.vencida ? g.perda : g.mantidaAte)}</b>${g.complementar ? `; complementada em ${g.complementar.comp}, iria até ${fmtBarra(g.complementar.mantidaAte)}` : ""}.`));
    if(x.v.qua_fato && g && !g.semLimite) ls.push(admLi(x.v.qua_fato <= g.mantidaAte ? "ok" : "crit", `Na data do fato (${fmtBarra(x.v.qua_fato)}) a qualidade ${x.v.qua_fato <= g.mantidaAte ? "estava mantida" : "já se perdera"}.`));
    if(x.v.qua_desemprego==="Sim") ls.push(admLi("info", "Desemprego comprovado acresce 12 meses à graça (art. 15, § 2º); o prazo conta da última competência."));
    return admUl(ls); },
  transicao(c, x){ if(x.idade==null) return admUl([admLi("warn", "Sem data de nascimento não há como medir as regras.")]);
    const t = anosDe(x.tot.comum), t19 = anosDe(x.tot.comum2019), T = [35,30][x.i], ano = +hoje().slice(0,4), id = (Date.parse(hoje()+"T12:00:00")-Date.parse(x.dn+"T12:00:00"))/86400000/365.25;
    const pts = Math.min([105,100][x.i], [96,86][x.i] + (ano-2019)), idProg = Math.min([65,62][x.i], [61,56][x.i] + 0.5*(ano-2019));
    const regra = (rot, ok, txt) => admLi(ok ? "ok" : "warn", `<b>${rot}</b>: ${txt}.`);
    const ft = n => n <= 0 ? "" : ` (faltam ${anosTxt(n)})`;
    return admUl([
      regra("Direito adquirido até 13/11/2019", t19 >= T, `${T} anos de tempo na data; tinha ${anosTxt(t19)}${ft(T - t19)}`),
      regra(`Pontos (art. 15), ${ano}`, t >= T && id + t >= pts, `${T} anos e ${pts} pontos; tem ${(id + t).toFixed(1).replace('.', ',')} pontos e ${anosTxt(t)} de tempo${ft(T - t)}`),
      regra(`Idade progressiva (art. 16), ${ano}`, t >= T && id >= idProg, `${T} anos e idade ${Math.floor(idProg)}a${idProg%1 ? "6m" : ""}; tem ${x.idade} anos e ${anosTxt(t)}${ft(T - t)}`),
      regra("Pedágio de 50 % (art. 17)", t19 > T-2 && t >= T + 0.5*Math.max(0, T - t19), t19 > T-2 ? `exige ${anosTxt(T + 0.5*Math.max(0, T - t19))}${ft(T + 0.5*Math.max(0, T - t19) - t)}; com fator previdenciário` : `só para quem tinha mais de ${T-2} anos em 13/11/2019; tinha ${anosTxt(t19)}`),
      regra("Pedágio de 100 % (art. 20)", id >= [60,57][x.i] && t >= T + Math.max(0, T - t19), `idade ${[60,57][x.i]} e ${anosTxt(T + Math.max(0, T - t19))} de tempo${ft(T + Math.max(0, T - t19) - t)}`),
      // F232 · o art. 19 é só de quem se filiou depois de 13/11/2019; quem se filiou antes sai por idade pelo art. 18, com 15 anos
      (fil => fil && fil > EC103
        ? regra("Regra permanente (art. 19)", id >= [65,62][x.i] && t >= [20,15][x.i], `idade ${[65,62][x.i]} e ${[20,15][x.i]} anos de tempo, com 180 de carência`)
        : regra("Por idade (art. 18)", id >= idadeArt18(ano, x.sx) && t >= 15, `idade ${String(idadeArt18(ano, x.sx)).replace(".5", " e 6 meses")} e 15 anos de tempo, com 180 de carência`))(x.v.apo_filiacao || filiacaoDe(cnisDe(c))),
    ]) + `<p class="meio-sub">Pontos e idade progressiva sobem a cada ano; a conta usa o tempo das linhas acima.</p>`; },
  especial(c, x){ const esp = anosDe(x.tot.especial), ex = +x.v.esp_anos || 25, pts = {15:66, 20:76, 25:86}[ex], tot = anosDe(x.tot.comum), ls = [];
    ls.push(admLi(...(esp >= ex ? ["ok", `Tempo especial: <b>${tempoFmt(x.tot.especial)}</b>, cumpridos os ${ex} anos.`] : ["warn", `Tempo especial: <b>${tempoFmt(x.tot.especial)}</b>; exige ${ex} anos, faltam ${anosTxt(ex - esp)}.`])));
    if(x.idade!=null) ls.push(admLi(x.idade + tot >= pts ? "ok" : "warn", `Transição por pontos (art. 21 da EC 103): ${pts} pontos; tem ${(x.idade + tot).toFixed(1).replace('.', ',')} (idade e tempo).`));
    ls.push(admLi("info", `IN 128: direito adquirido até 13/11/2019 sem idade (art. 261); filiado até 13/11/2019, ${pts} pontos (art. 262); filiado depois, idade de 55, 58 ou 60 anos (art. 260). A ADI 6309 declarou inconstitucional a idade mínima (STF, 6 a 5, julgada em 03/06/2026, acórdão publicado em 02/10/2026, segundo o IBDP; não conferido no portal do STF), e o art. 260 continua no texto consolidado da IN.`));
    ls.push(admLi("info", `PPP no dossiê: ${(x.fd.ppps||[]).length ? `${(x.fd.ppps||[]).length} ${(x.fd.ppps||[]).length===1?"vínculo":"vínculos"}` : "nenhum"}. A conversão em tempo comum vale só até 13/11/2019 (art. 269, § 2º).`));
    if(x.v.esp_epi==="Sim") ls.push(admLi("warn", "EPI eficaz não afasta o ruído acima do limite (Tema 555/STF); nos demais agentes, exigir a prova da eficácia real."));
    if(x.v.esp_continua==="Sim") ls.push(admLi("crit", "Permanecer na atividade nociva cessa o benefício (Tema 709/STF)."));
    return admUl(ls); },
  magisterio(c, x){ const pm = x.tot.porNat.magisterio || 0, m = anosDe(pm), ex = [30,25][x.i];
    return admUl([admLi(m >= ex ? "ok" : "warn", `Magistério nas linhas: <b>${tempoFmt(pm)}</b>; as transições exigem ${ex} anos, a regra permanente 25${m >= ex ? ", cumpridos" : `, faltam ${anosTxt(Math.max(0, ex - m))}`}.`),
      admLi("info", "Direção, coordenação e assessoramento pedagógico contam como magistério (Lei 11.301/2006), com prova; tempo fora do magistério entra só nos pontos.")]); },
  rural(c, x){ const r = x.tot.porNat.rural || 0, ls = [admLi(r ? "info" : "warn", r ? `Tempo rural nas linhas: <b>${tempoFmt(r)}</b>.` : "Nenhuma linha de natureza rural ainda.")];
    for(const o of x.ops){ if(o.o==="idade_rural") ls.push(admLi("info", "Exige 180 meses de atividade rural, contados por mês de atividade, e a prova material do período; a autodeclaração vem antes."));
      if(o.o==="hibrida") ls.push(admLi("info", "Soma tempo rural e urbano para os 180 meses; o rural anterior a 11/1991 entra sem contribuição.")); }
    if(x.v.rur_regime && !x.v.rur_prova) ls.push(admLi("warn", "Falta o início de prova material: prova só testemunhal não basta (Súmula 149/STJ)."));
    const cn = (x.fd.cnpjs||[]).length; if(cn) ls.push(admLi("warn", `A Redesim traz ${cn} ${cn===1?"CNPJ":"CNPJs"} no CPF: o INSS usa para descaracterizar o segurado especial.`));
    return admUl(ls); },
  defic(c, x){ const ls = [], g = x.v.def_grau, exig = {Grave:[25,20], Moderada:[29,24], Leve:[33,28]}[g];
    for(const o of x.ops){ if(o.o==="def") ls.push(admLi(x.v.def_longo==="Sim" ? "ok" : "warn", `${esc(o.rot)}: impedimento de longo prazo de 2 anos${x.v.def_longo==="Sim" ? ", informado" : ", a demonstrar no laudo"}; a avaliação é médica e social, pelo instrumento próprio do BPC (CIF), sem o grau da LC 142.`));
      if(o.o==="pcd"){ const t = anosDe(x.tot.comum); ls.push(admLi(exig ? (t >= exig[x.i] ? "ok" : "warn") : "warn", exig ? `LC 142, grau ${g.toLowerCase()}: ${exig[x.i]} anos de tempo como pessoa com deficiência; tem ${anosTxt(t)} nas linhas${t >= exig[x.i] ? "" : `, faltam ${anosTxt(exig[x.i] - t)}`}.` : "LC 142: escolha o grau para saber o tempo exigido (grave 25/20, moderada 29/24, leve 33/28 anos).")); }
      if(o.o==="pcd_idade"){ const t = anosDe(x.tot.porNat.defic || x.tot.comum), ok = t >= 15;
        ls.push(admLi(ok ? "ok" : "warn", `${esc(o.rot)}: 15 anos de contribuição na condição de pessoa com deficiência, qualquer grau (art. 311 da IN 128); tem ${anosTxt(t)} nas linhas${ok ? "" : `, faltam ${anosTxt(15 - t)}`}.`)); } }
    if(x.v.def_did) ls.push(admLi("info", `DID em ${fmtBarra(x.v.def_did)}: só o tempo a partir dela conta como tempo de pessoa com deficiência.`));
    return admUl(ls); },
  incap(c, x){ const ls = [], g = x.gr, n = x.d ? (x.d.grupos.saude||[]).length : 0;
    ls.push(admLi(n ? "info" : "warn", n ? `Documentação HCRP no dossiê: ${n} ${n===1?"item":"itens"}.` : "Sem documentação médica no dossiê."));
    if(x.v.inc_dii && g && !g.semLimite) ls.push(admLi(x.v.inc_dii <= g.mantidaAte ? "ok" : "crit", `DII em ${fmtBarra(x.v.inc_dii)}, ${x.v.inc_dii <= g.mantidaAte ? "dentro" : "fora"} da qualidade de segurado.`));
    if(x.v.inc_dcb) ls.push(admLi(x.v.inc_dcb >= hoje() ? "info" : "warn", `DCB em ${fmtBarra(x.v.inc_dcb)}${x.v.inc_dcb < hoje() ? ": o pedido de prorrogação cabe nos 15 dias anteriores; depois, novo requerimento" : ""}.`));
    return admUl(ls); },
  acid(c, x){ const cat = (x.fd.cats||[]).length, ls = [admLi(cat ? "ok" : "info", cat ? `CAT no dossiê: ${cat}.` : "Sem CAT no dossiê; o nexo pode vir do NTEP ou da perícia.")];
    for(const o of x.ops){ if(o.o==="b94"||o.o==="acid") ls.push(admLi(["Empregado","Avulso","Segurado especial"].includes(x.v.aci_categoria) ? "ok" : x.v.aci_categoria ? "crit" : "warn", `${esc(o.rot)}: só empregado, avulso e segurado especial têm a espécie acidentária${x.v.aci_categoria ? `; informado ${x.v.aci_categoria.toLowerCase()}` : ""}.`));
      if(o.o==="b94"||o.o==="b36") ls.push(admLi(x.v.aci_sequela==="Sim" ? "ok" : "warn", `${esc(o.rot)}: sequela consolidada com redução da capacidade (Anexo III do Decreto 3.048/99); 50 % do salário de benefício, sem carência.`)); }
    return admUl(ls); },
  renda(c, x){ const p = +x.v.ren_pessoas, t = +x.v.ren_total, s = +x.v.ren_saude||0, lim = SM_2026/4, ls = [];
    if(p && t>=0 && x.v.ren_total!==""){ const pc = t/p, pcs = Math.max(0, t - s)/p;
      ls.push(admLi(pc <= lim ? "ok" : pcs <= lim ? "warn" : "crit", `Renda per capita: <b>${moedaBR(pc)}</b>${s ? `, ${moedaBR(pcs)} descontados os gastos com saúde` : ""}; o limite é 1/4 do salário mínimo, ${moedaBR(lim)}${pc > lim ? "; acima disso, provar a miserabilidade pelo gasto" : ""}.`)); }
    else ls.push(admLi("warn", "Informe as pessoas do grupo e a renda bruta para medir o 1/4 do salário mínimo."));
    const cad = x.d ? (x.d.grupos.cad||[]).length : 0; ls.push(admLi(x.v.ren_cad==="Sim" || cad ? "ok" : "warn", cad ? `CadÚnico no dossiê: ${cad}.` : x.v.ren_cad==="Sim" ? "CadÚnico atualizado." : "CadÚnico atualizado nos últimos 24 meses é obrigatório."));
    if(x.v.ren_trabalha==="Sim") ls.push(admLi("warn", "Na concessão, a remuneração entra na renda do grupo (salvo estágio e aprendizagem); o art. 21-A da LOAS só suspende o BPC da pessoa com deficiência já concedido."));
    return admUl(ls); },
  dependentes(c, x){ const ls = [], f = x.v.dep_fato, cl = x.v.dep_classe;
    for(const o of x.ops){ if(o.o!=="reclusao") continue;
      ls.push(admLi(x.v.dep_regime==="Fechado" ? "ok" : x.v.dep_regime ? "crit" : "warn", "Auxílio-reclusão: regime fechado, baixa renda e 24 contribuições do instituidor (art. 383 da IN 128)."));
      const md = x.v.dep_media12, tt = +x.v.dep_teto;
      if(md!==undefined && md!=="" && tt) ls.push(admLi(+md <= tt ? "ok" : "crit", `Baixa renda: média de ${moedaBR(+md)} nos 12 meses antes da prisão, ${+md <= tt ? "dentro" : "acima"} do limite de ${moedaBR(tt)} da Portaria da data (art. 383, § 2º).`));
      else ls.push(admLi("warn", "Baixa renda: informe a média dos salários de contribuição dos 12 meses anteriores ao mês da prisão e o limite da Portaria vigente na data; sem salário de contribuição no período, é baixa renda (art. 383, §§ 2º e 5º).")); }
    if(f && /Cônjuge|Companheiro/.test(cl||"")){ const un = x.v.dep_uniao, ctb = +x.v.dep_contrib;
      const curta = (un && (new Date(f) - new Date(un))/86400000 < 730) || (x.v.dep_contrib!=="" && !isNaN(ctb) && ctb < 18);
      const id = x.v.dep_nasc ? idadeEm(x.v.dep_nasc, f) : null;
      const tab = f >= "2021-01-01" ? [[22,"3 anos"],[28,"6 anos"],[31,"10 anos"],[42,"15 anos"],[45,"20 anos"]] : [[21,"3 anos"],[27,"6 anos"],[30,"10 anos"],[41,"15 anos"],[44,"20 anos"]];
      const dur = id==null ? null : (tab.find(([lim])=>id < lim)||[0,"vitalícia"])[1];
      ls.push(admLi(curta ? "warn" : "info", curta ? "Cota de 4 meses: casamento ou união com menos de 2 anos, ou instituidor com menos de 18 contribuições (salvo óbito por acidente ou doença do trabalho)." : dur ? `Duração da cota pela idade na data do óbito (${id} anos): <b>${dur}</b>.` : "Informe o nascimento do dependente para a duração da cota."));
      if(cl==="Companheiro(a)" && f >= "2019-01-18") ls.push(admLi("warn", "União estável: início de prova material dos 24 meses anteriores ao óbito (art. 16, § 5º)."));
    }
    if(cl==="Pais" || cl==="Irmão") ls.push(admLi("warn", "Classe II e III: a dependência econômica se prova, não se presume."));
    return admUl(ls); },
  maternidade(c, x){ const ls = [], s = x.v.mat_situacao;
    ls.push(admLi("info", `${x.v.mat_fato==="Aborto não criminoso" ? "14 dias" : "120 dias"} de benefício${x.v.mat_data ? `, a contar de ${fmtBarra(x.v.mat_data)}` : ""}.`));
    if(s==="CI ou facultativa") ls.push(admLi("info", "As 10 contribuições de carência são inexigíveis (ADI 2110 e Enunciado 19 do CRPS); pedir e recorrer se o INSS exigir."));
    if(s==="Segurada especial") ls.push(admLi("info", "Exige 12 meses de atividade rural antes do parto, ainda que descontínuos, com documento anterior ao parto (Lei 8.213/91, art. 39, par. único)."));
    if(s==="Desempregada em graça") ls.push(admLi("info", "Cabe dentro do período de graça, pago pelo INSS."));
    return admUl(ls); },
  revisao(c, x){ const ls = [], p = x.v.rev_primeiro || x.v.rev_dib;
    if(p){ const d = new Date(p+"T12:00:00"); const ini = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth()+1, 1)); const lim = new Date(Date.UTC(ini.getUTCFullYear()+10, ini.getUTCMonth(), 1)).toISOString().slice(0,10);
      const meses = mesesAte(lim); ls.push(admLi(lim < hoje() ? "crit" : meses < 12 ? "crit" : "ok", `Decadência (art. 103 da Lei 8.213/91): 10 anos do 1º dia do mês seguinte ao primeiro pagamento, em <b>${fmtBarra(lim)}</b>${lim < hoje() ? ", já consumada" : meses < 12 ? `, faltam ${meses} meses` : ""}.`)); }
    else ls.push(admLi("warn", "Informe a DIB ou o primeiro pagamento para contar a decadência."));
    ls.push(admLi("info", "Atrasados: só as parcelas dos 5 anos anteriores ao pedido (prescrição quinquenal)."));
    return admUl(ls); },
  cnis_acerto(c, x){ const g = cnisDe(c), ind = g ? (g.indicadores||[]).length : 0;
    return admUl([admLi(g ? (ind ? "warn" : "ok") : "warn", g ? `${ind ? `${ind} ${ind===1?"indicador":"indicadores"} no CNIS` : "Nenhum indicador no CNIS"}; o acerto se pede pelo Meu INSS com o documento do vínculo.` : "O CNIS não foi lido.")]); },
  crps(c, x){ const ci = x.v.crp_ciencia; if(!ci) return admUl([admLi("warn", "Informe a ciência da decisão: o recurso tem 30 dias.")]);
    const lim = proxDiaUtil(new Date(Date.parse(ci+"T12:00:00") + 30*86400000).toISOString().slice(0,10));   // F232 · vence no 1º dia útil (Regimento, art. 78, § 4º)
    return admUl([admLi(lim < hoje() ? "crit" : "warn", `Recurso ordinário até <b>${fmtBarra(lim)}</b>${lim < hoje() ? ", prazo vencido" : ""}; a Junta decide por norma e por enunciado, e o recurso ataca o motivo escrito.`)]); },
};
const admCalcHtml = (m, c, x) => { try{ return ADM_CALC[m] ? ADM_CALC[m](c, x) : ""; }catch(e){ return `<p class="meio-sub">Não consegui calcular este quadro.</p>`; } };
function camposModulo(c, m){
  // F220 · o 5º elemento do campo diz de que opções ele é (o regime da prisão e a baixa renda são do auxílio-reclusão)
  const opsSel = opcoesSel(c).map(o=>o.o), v = admDe(c).valores, cs = MOD_AD[m].campos.filter(f=>!f[4] || f[4].some(o=>opsSel.includes(o))); if(!cs.length) return "";
  return `<div class="adm-campos">${cs.map(([k, rot, tipo, ops])=>`<label class="adm-campo"><span>${esc(rot)}</span>${tipo==="select"
    ? `<select data-adm="${k}" onchange="admCampo('${c.id}',this)">${(typeof ops==="function" ? ops() : ops).map(o=>`<option value="${esc(o)}" ${(v[k]||"")===o?"selected":""}>${esc(o||"—")}</option>`).join("")}</select>`
    : `<input type="${tipo}" data-adm="${k}" value="${esc(v[k]??"")}" ${tipo==="number"?'min="0" step="0.01"':""} onchange="admCampo('${c.id}',this)">`}</label>`).join("")}</div>`;
}
function admCampo(cliId, el){ const k = el.dataset.adm, val = el.value; admSalvar(cliId, a=>{ a.valores[k] = val; }); admRecalc(cliId); }
// recalcula só as linhas de cada quadro, para não repintar os campos em edição
function admRecalc(cliId){
  const c = D.cliPorId.get(cliId); if(!c) return;
  const x = admCtx(c, D.casosDoCliente.get(cliId)||[]);
  document.querySelectorAll(".adm-calc[data-mod]").forEach(e=>{ e.innerHTML = admCalcHtml(e.dataset.mod, c, x); });
  adRecalcBenef(cliId);   // F234
}
// ── a caixa dos tempos: uma linha por período, a natureza abre o detalhe ──
function detTempo(c, i, r){
  const d = NAT_DET[r.nat||"comum"]; if(!d) return `<span class="meio-sub">—</span>`;
  return d[1] ? `<select data-k="det" aria-label="${esc(d[0])}" onchange="admTempo('${c.id}',${i},this)"><option value="">${esc(d[0])}</option>${d[1].map(o=>`<option ${r.det===o?"selected":""}>${esc(o)}</option>`).join("")}</select>`
    : `<input data-k="det" value="${esc(r.det||"")}" placeholder="${esc(d[0])}" onchange="admTempo('${c.id}',${i},this)">`;
}
// F235 · sem linha lançada, o quadro Tempos nasce do CNIS com a natureza que o dossiê mostra: magistério pela RAIS
// (ocupação de professor no mesmo CNPJ, fora do ensino superior), especial pelo PPP (ruído acima do limite de cada
// época; agente biológico ou químico sem EPI eficaz) e com deficiência depois da DID. É proposta, marcada "do dossiê,
// a confirmar"; mexer numa linha grava todas. O cargo no regime próprio fica fora (é o destino da certidão)
function cortarTempos(segs, ini, fim, mud){
  const out = [];
  for(const s of segs){
    const a = s.de, b = s.ate || "9999-12-31";
    if(fim < a || ini > b || s.nat!=="comum"){ out.push(s); continue; }
    if(ini > a) out.push({...s, ate: diaAnterior(ini)});
    out.push({...s, ...mud, de: ini > a ? ini : a, ate: fim < b ? fim : s.ate});
    if(fim < b) out.push({...s, de: diaSeguinte(fim)});
  }
  return out;
}
function temposAutomaticos(x){
  const rur = linhasRuraisPropostas(x), g = x.g; if(!g) return rur;
  const rais = x.fd.rais || [], ppps = x.fd.ppps || [], did = x.v.def_did || null, out = [];
  const vs = (g.vinculos||[]).filter(v=>v.tipo!=="Benefício" && v.inicio && !(v.indicadores||[]).some(i=>/^PRPPS/.test(String(i))));
  const ultCi = vs.filter(v=>/individual|facultativ/i.test(v.tipo||"")).map(v=>isoBr(v.fim||"") || isoBr(fimDoMes(v.ultRemun||""))).filter(Boolean).sort().pop();
  // F235 · o vínculo sem saída fecha na saída da carteira de trabalho do dossiê ou, parado há mais de 3 meses, na última remuneração
  // (como a Identificação presume); antes corria até hoje e dava direito adquirido falso
  const semSaida = new Map(vinculosSemSaida(g).map(v=>[`${v.origem}|${v.inicio}`, v]));
  for(const v of vs){
    const de = isoBr(v.inicio); if(!de) continue;
    let ate = isoBr(v.fim||"") || (v.aberto ? "" : (v.ultRemun ? isoBr(fimDoMes(v.ultRemun)) : "")), fecho = "";
    if(!ate && v.aberto){ const s = semSaida.get(`${v.origem}|${v.inicio}`), k = x.c ? ctpsDoVinculo(x.c.id, v) : null;
      if(k && k.saida){ ate = isoBr(k.saida); fecho = `; a saída (${k.saida}) é da carteira de trabalho: o CNIS não tem a data`; }
      else if(s && !s.emCurso && !s.suspenso && !s.servidor && s.ultRemun){ ate = isoBr(fimDoMes(s.ultRemun)); fecho = `; fim presumido na última remuneração (${s.ultRemun}): o CNIS não tem a saída`; } }
    // quem segue pagando o carnê: a última linha de contribuinte segue aberta na projeção
    if(x.v.apo_segue==="Sim" && /individual|facultativ/i.test(v.tipo||"") && ate && ate===ultCi) ate = "";
    const raiz = raizCnpj(v.codigo||""), onde = v.origem ? tituloOrgao(v.origem) : String(v.tipo||"");
    const ind = (v.indicadores||[]).map(String);
    let segs = [{de, ate, onde, nat:"comum", prova: (ind.some(i=>/^PEXT/.test(i)) ? "CNIS, com pendência (PEXT): conta depois de provado" : ind.some(i=>/LC123|MEI|FBR/.test(i)) ? "CNIS, alíquota reduzida" : "CNIS") + fecho}];
    // F235 · "professor de nível superior do ensino fundamental" (CBO 2312) é educação básica: fora fica só o ensino superior (CBO 234)
    const prof = raiz ? rais.filter(r=>r.raiz===raiz && /professor|docente/i.test(r.cbo||"") && !/^\s*234|ensino superior|universit/i.test(r.cbo||"")) : [];
    if(prof.length) segs = segs.map(s=>({...s, nat:"magisterio", prova:`CNIS; RAIS ${prof.map(r=>r.ano).join(", ")}: ${fraseClinica(prof[0].cbo)}; confirme com a declaração da escola`}));
    else if(/escola|col[ée]gio|educa[çc]|ensino|creche/i.test(v.origem||"") && (rais.some(r=>/professor|docente/i.test(r.cbo||"")) || /professor/i.test(((x.c||{}).profissao)||""))){
      const outro = raiz && rais.find(r=>r.raiz===raiz && r.cbo);
      // F235 · a linha do auxiliar leva a marca "aux": a resposta "dava aula como a titular" a conta como magistério
      segs = outro ? segs.map(s=>({...s, ...(/auxiliar|monitor|assistente|atendente de creche|cuidador/i.test(outro.cbo) ? {aux:true} : {}), prova:`CNIS; RAIS: ${fraseClinica(outro.cbo)}. Só conta como magistério se dava aula nas mesmas condições da professora titular (IN 128, art. 214, VI): peça a declaração da escola`}))
        : segs.map(s=>({...s, nat:"magisterio", prova:"CNIS; o empregador é escola e a RAIS do período não veio: confirme a função com a declaração da escola"}));
    }
    // F235 · todos os PPPs da empresa: o de papel e o eletrônico do Meu INSS cobrem períodos diferentes (só o primeiro entrava)
    const pps = raiz ? ppps.filter(p=>raizCnpj(p.cnpj||"")===raiz) : [];
    if(!prof.length) for(const r of pps.flatMap(p=>p.riscos||[])){
      const ri = isoBr(r.ini||""); if(!ri) continue;
      const rf = isoBr(r.fim||"") || ate || x.hoje;
      if(r.db!=null){
        for(const [a, b, lim] of [["0000-01-01","1997-03-05",80],["1997-03-06","2003-11-18",90],["2003-11-19","9999-12-31",85]]){
          const i0 = ri > a ? ri : a, f0 = rf < b ? rf : b;
          if(i0 <= f0 && r.db > lim) segs = cortarTempos(segs, i0, f0, {nat:"especial", esp:"25", prova:`PPP: ruído de ${String(r.db).replace(".", ",")} dB, acima do limite da época (${lim} dB); confirme`});
        }
      } else if(/^[BQ]$/.test(r.tipo||"") && (!/^S(IM)?$/i.test(r.epi||"") || ri < "1998-12-03"))
        segs = cortarTempos(segs, ri, rf < "1998-12-02" || !/^S(IM)?$/i.test(r.epi||"") ? rf : "1998-12-02",
          {nat:"especial", esp:"25", prova:`PPP: ${String(r.fator||"agente").toLowerCase()}; confirme a exposição habitual`});
    }
    if(did) segs = segs.flatMap(s=>s.nat!=="comum" || (s.ate && s.ate < did) ? [s]
      : s.de >= did ? [{...s, nat:"defic", prova:`${s.prova}; depois da DID (${fmtBarra(did)})`}]
      : [{...s, ate: diaAnterior(did)}, {...s, de: did, nat:"defic", prova:`${s.prova}; depois da DID (${fmtBarra(did)})`}]);
    out.push(...segs.map(s=>({...s, auto:true})));
  }
  // F235 · o contrato da carteira que falta no CNIS e o emprego dos papéis da época entram na proposta, marcados com o que falta para contar
  if(x.c) for(const k of ctpsForaDoCnis(x.c)){ const de = isoBr(k.admissao||""), ate = isoBr(k.saida||"");
    if(de && ate) out.push({de, ate, onde:tituloOrgao(k.empregador), nat:"comum", prova:"carteira de trabalho, fora do CNIS: conta depois do acerto", auto:true}); }
  if(x.c) for(const p of empregosDosPapeis(x.c.id)) out.push({de:p.de, ate:p.ate, onde:p.onde, nat:"comum", prova:`${p.docs}, papéis da época: conta depois da justificação administrativa`, auto:true});
  out.push(...rur);
  return out.sort((a, b)=>a.de < b.de ? -1 : a.de > b.de ? 1 : 0);
}
// as linhas que o quadro mostra quando nada foi lançado (a mesma conta da Análise de Direito)
function temposAutoDe(c){
  try{ const x = reqCtx(c, D.casosDoCliente.get(c.id)||[], adBenefAberto(c) || ""); return x.temposAuto ? x.tempos : []; }catch(e){ return []; }
}
function caixaTempos(c, auto){
  const guard = admDe(c).tempos, prop = !guard.length && (auto || []).length ? auto : null;
  const rows = guard.length ? guard : prop || [{}];
  const campo = (i, k, r, tipo, ph) => `<input type="${tipo}" data-k="${k}" value="${esc(r[k]||"")}" ${ph?`placeholder="${ph}"`:""} onchange="admTempo('${c.id}',${i},this)">`;
  const linha = (r, i) => `<tr class="adm-tr" data-i="${i}">
    <td>${campo(i, "de", r, "date")}</td><td>${campo(i, "ate", r, "date")}</td>
    <td>${campo(i, "onde", r, "text", "empregador ou local")}</td>
    <td><select data-k="nat" aria-label="Natureza" onchange="admTempo('${c.id}',${i},this)">${NAT_TEMPO.map(([k, rot])=>`<option value="${k}" ${(r.nat||"comum")===k?"selected":""}>${rot}</option>`).join("")}</select></td>
    <td class="adm-det">${detTempo(c, i, r)}</td>
    <td>${campo(i, "prova", r, "text", "CNIS, CTPS, PPP, CTC…")}</td>
    <td><button type="button" class="adm-x" aria-label="Tirar este período" title="tirar" onclick="admTempoTirar('${c.id}',${i})">×</button></td></tr>`;
  const g = cnisDe(c);
  return `<div id="adm-tempos-box">${prop ? `<p class="adm-auto-aviso">Trazido do CNIS e do dossiê${prop.some(r=>r.nat==="magisterio") ? ", com o magistério pela RAIS" : ""}${prop.some(r=>r.nat==="especial") ? ", com o especial pelo PPP" : ""}${prop.some(r=>r.nat==="defic") ? ", com a deficiência desde a DID" : ""}${prop.some(r=>r.nat==="rural") ? ", com a roça pelos papéis rurais e pelo relato (confirme na autodeclaração)" : ""}. Confira a natureza de cada linha: mexer em qualquer uma grava todas.</p>` : ""}<table class="pa-tabela adm-tempos" id="adm-tempos"><thead><tr><th>De</th><th>Até</th><th>Onde</th><th>Natureza</th><th>Detalhe</th><th>Prova</th><th></th></tr></thead>
    <tbody>${rows.map(linha).join("")}</tbody></table>
    <div class="adm-tempos-bt"><button type="button" class="btn-mini adm-mais" onclick="admTempoMais('${c.id}')">+ tempo</button>
      ${g && (g.vinculos||[]).length ? `<button type="button" class="btn-mini" onclick="admTemposDoCnis('${c.id}')" title="Trazer do CNIS"><span aria-hidden="true">Importar</span><span class="sr-only">Trazer do CNIS</span></button>` : ""}
      <span class="meio-sub">períodos sobrepostos contam uma vez; contados de data a data, com o mês de 30 dias (IN 128, art. 206, § 1º); confira no Prévius antes de fixar a DER</span></div></div>`;
}
function admTemposPintar(cliId){ const c = D.cliPorId.get(cliId), el = document.getElementById("adm-tempos-box"); if(c && el) el.outerHTML = caixaTempos(c, temposAutoDe(c)); admRecalc(cliId); }
// F235 · a primeira mão no quadro grava a proposta do dossiê inteira, sem a marca "auto"
const admTemposDaProposta = (cliId, a) => { if(a.tempos.length) return; const c = D.cliPorId.get(cliId);
  a.tempos = temposAutoDe(c).map(({auto, ...r})=>r); };
function admTempo(cliId, i, el){
  const k = el.dataset.k, val = el.value;
  admSalvar(cliId, a=>{ admTemposDaProposta(cliId, a); while(a.tempos.length <= i) a.tempos.push({}); a.tempos[i] = {...a.tempos[i], [k]: val}; if(k==="nat") delete a.tempos[i].det; });
  if(k==="nat"){ const c = D.cliPorId.get(cliId), td = el.closest("tr").querySelector(".adm-det"); if(td) td.innerHTML = detTempo(c, i, admDe(c).tempos[i]); }
  admRecalc(cliId);
}
function admTempoMais(cliId){ admSalvar(cliId, a=>{ admTemposDaProposta(cliId, a); if(!a.tempos.length) a.tempos.push({}); a.tempos.push({}); }); admTemposPintar(cliId); }
function admTempoTirar(cliId, i){ admSalvar(cliId, a=>{ admTemposDaProposta(cliId, a); a.tempos.splice(i, 1); }); admTemposPintar(cliId); }
// os vínculos do CNIS viram linhas comuns, sem repetir os que já estão lá.
// O benefício que o CNIS lista como vínculo fica de fora (não é contribuição:
// no teste real de 12.10.2026 a aposentadoria em manutenção somou 16 anos), e
// o vínculo sem data de saída termina no mês da última remuneração, como a
// Identificação já presume (vinculosSemSaida), salvo se ainda está em curso.
function admTemposDoCnis(cliId){
  const c = D.cliPorId.get(cliId), g = c && cnisDe(c); if(!g) return;
  const prop = temposAutoDe(c).map(({auto, ...r})=>r);
  if(prop.length){ admSalvar(cliId, a=>{ const tem = new Set(a.tempos.map(r=>`${r.de}|${r.onde}|${r.nat}`)); for(const r of prop) if(!tem.has(`${r.de}|${r.onde}|${r.nat}`)) a.tempos.push(r); }); return admTemposPintar(cliId); }
  admSalvar(cliId, a=>{ const tem = new Set(a.tempos.map(r=>`${r.de}|${r.onde}`));
    for(const v of g.vinculos||[]){ if(/benef/i.test(v.tipo||"")) continue; const de = isoBr(v.inicio||""); if(!de) continue;
      let ate = isoBr(v.fim||"") || "", prova = "CNIS";
      const m = /^(\d{2})\/(\d{4})$/.exec(v.ultRemun||"");
      if(!ate && m && !v.aberto){ ate = new Date(Date.UTC(+m[2], +m[1], 0)).toISOString().slice(0,10); prova = "CNIS, fim presumido pela última remuneração"; }
      const r = {de, ate, onde: v.origem||"", nat:"comum", prova};
      if(!tem.has(`${r.de}|${r.onde}`)) a.tempos.push(r); }
    a.tempos = a.tempos.filter(r=>r.de||r.ate||r.onde); });
  admTemposPintar(cliId);
}
// a cópia que entra na análise registrada
function admSnapshot(c){
  const a = admDe(c), t = admTotais(c);
  if(!a.beneficios && !Object.keys(a.valores).length && !a.tempos.length) return null;
  return {beneficios: benefSel(c), valores: a.valores, tempos: a.tempos, totais: {comum: t.comum, comum2019: t.comum2019, especial: t.especial, convertido: t.convertido, porNat: t.porNat}};
}
// ══════════════════════════════════════════════════════════════════════════
// F232 · O MOTOR DE REQUISITOS (crm/fase2/docs/REQUISITOS-POR-BENEFICIO.md)
// ══════════════════════════════════════════════════════════════════════════
// Cada opção do BENEF tem a sua lista de requisitos, na ordem da conversa com o
// cliente: {id, rot (a pergunta em linguagem simples), base (o artigo), conf
// ("conferido" | "skill" | "divergente"), campos (chaves de CAMPO_AD que o requisito
// pede), mede(x) → {est, txt, fonte?, quando?, div?}}. O x é o contexto de UM
// benefício (reqCtx); mede é pura sobre x (nada de hoje(): x.hoje e x.der), e o teste
// monta x à mão (reqCtxTeste). "divergente" leva div:{inss, judicial} e nunca vira
// "ok" quando só a tese favorece; "opcao" é a acumulação que se resolve escolhendo.
const REQ_EST = {ok:["em ordem","ok"], falta:["falta","warn"], risco:["em risco","crit"], informar:["a informar","pend"],
  info:["informativo","info"], impedido:["impedido","crit"], opcao:["opção","info"], divergente:["divergente","warn"], provar:["a provar","warn"]};
const REQ_ORDEM = ["impedido","risco","falta","provar","divergente","informar","opcao","ok","info"];
const REQ_CONF = {conferido:"", skill:"a conferir na lei", divergente:"INSS e Justiça divergem"};
const REQ_BENEF = {}, REQ_EXTRA = {}, CAMPO_AD = {der:["Data do pedido (vazio = hoje)", "date"],
  apo_filiacao:["Primeira filiação ao RGPS (vem do CNIS; confirme)", "date"], apo_segue:["Vai pagar o INSS todo mês daqui em diante? (mostra a data em que alcança)", "select", SN],
  // F235 · a pergunta do professor auxiliar (IN 128, art. 214, VI)
  mag_auxiliar:["Como auxiliar, dava aula como a professora titular? (declaração da escola)", "select", ["","Sim","Não","Pedir a declaração"]]};
// extra: {resumo (a frase do benefício), quando(x) → a data do direito (ou null)}
function registrarReq(op, lista, campos, extra){ REQ_BENEF[op] = lista; Object.assign(CAMPO_AD, campos||{}); REQ_EXTRA[op] = extra||{}; }
for(const m of Object.values(MOD_AD)) for(const [k, rot, tipo, ops] of m.campos) if(!CAMPO_AD[k]) CAMPO_AD[k] = [rot, tipo, ops];
// ── datas ────────────────────────────────────────────────────────────────
const ymDe = iso => String(iso||"").slice(0,7);
const mesesEntreYm = (a, b) => { const [y1, m1] = a.split("-").map(Number), [y2, m2] = b.split("-").map(Number); return (y2-y1)*12 + (m2-m1) + 1; };
function somarMeses(iso, n){
  const [a, m, d] = iso.split("-").map(Number), t = new Date(Date.UTC(a, m-1+n, 1)), ult = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth()+1, 0)).getUTCDate();
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth()+1).padStart(2,"0")}-${String(Math.min(d, ult)).padStart(2,"0")}`;
}
// a data em que se completa uma idade com fração (64,5 = 64 anos e 6 meses)
const dataDaIdade = (dn, anos) => dn ? somarMeses(dn, Math.round(anos*12)) : null;
// anos com fração entre duas datas (o INSS apura idade e tempo em dias)
const anosEntre = (a, b) => (Date.parse(b+"T12:00:00") - Date.parse(a+"T12:00:00")) / 86400000 / 365.25;
const anoDe = iso => +String(iso).slice(0,4);
// a primeira data, a partir de "desde", em que teste(iso) vale (procura até 50 anos, de mês em mês, e acerta o dia)
function quandoCumpre(desde, teste){
  if(!desde) return null; if(teste(desde)) return desde;
  for(let k = 1; k <= 600; k++){ const d = somarMeses(desde, k);
    if(teste(d)){ for(let e = diaSeguinte(somarMeses(desde, k-1)); e < d; e = diaSeguinte(e)) if(teste(e)) return e; return d; } }
  return null;
}
// ── EC 103, pelo ano (os números de 2026 são só um caso da fórmula) ─────
// pontos (art. 15; professor § 3º), idade progressiva (art. 16; professor § 2º), idade da mulher no art. 18, § 1º
const pontosExig = (ano, sx, prof) => { const n = Math.max(0, ano - 2019);
  return prof ? (sx==="F" ? Math.min(92, 81+n) : Math.min(100, 91+n)) : (sx==="F" ? Math.min(100, 86+n) : Math.min(105, 96+n)); };
const idadeProgExig = (ano, sx, prof) => { const n = Math.max(0, ano - 2019) * 0.5;
  return prof ? (sx==="F" ? Math.min(57, 51+n) : Math.min(60, 56+n)) : (sx==="F" ? Math.min(62, 56+n) : Math.min(65, 61+n)); };
const idadeArt18 = (ano, sx) => sx==="F" ? Math.min(62, 60 + 0.5*Math.max(0, ano - 2019)) : 65;
// ── CNIS ────────────────────────────────────────────────────────────────
// a primeira filiação: o início mais antigo de vínculo ou contribuição (não de benefício)
function filiacaoDe(g){
  return ((g||{}).vinculos||[]).filter(v=>v.tipo!=="Benefício" && v.inicio).map(v=>isoBr(v.inicio)).filter(Boolean).sort()[0] || null;
}
function beneficiosDoCnis(g){
  return ((g||{}).vinculos||[]).filter(v=>v.tipo==="Benefício").map(v=>({especie:String(v.especie||""), origem:v.origem||"", nb:v.nb||"",
    de:isoBr(v.inicio||""), ate:isoBr(v.fim||""), situacao:v.situacao||"", ativo:!!v.aberto}));
}
// benefício por incapacidade (31, 32, 91, 92) entre períodos de contribuição: conta como
// carência (IN 128, art. 193) e como tempo (art. 216, IV)
function intercaladosDe(x){
  const ps = (x.ct||{}).periodos||[];
  return (x.benefCnis||[]).filter(b=>/^(31|32|91|92)$/.test(b.especie) && b.de && b.ate)
    .filter(b=>ps.some(([, fim])=>fim < ymDe(b.de)) && ps.some(([ini])=>ini > ymDe(b.ate)))
    .map(b=>({...b, meses: mesesEntreYm(ymDe(b.de), ymDe(b.ate))}));
}
// as contribuições contadas pelo CNIS até a competência da data, inclusive
const carenciaAte = (x, iso) => mesesContadosAte((x.ct||{}).periodos, ymDe(iso));
// os meses de benefício intercalado até a data
const intercaladoAte = (x, iso) => intercaladosDe(x).reduce((n, b)=> b.de > iso ? n : n + mesesEntreYm(ymDe(b.de), ymDe(b.ate < iso ? b.ate : iso)), 0);
// o último reingresso (a volta depois de perder a qualidade) até a data, "AAAA-MM", ou null
const reingressoAte = (x, iso) => (x.hist||[]).filter(h=>h.tipo==="reingresso" && h.de <= ymDe(iso)).map(h=>h.de).pop() || null;
// a qualidade de segurado numa data, pela história (contribuição e graça mantêm; perda não)
function qualidadeEm(x, iso){
  if(!iso) return {est:"informar", txt:"sem a data do fato"};
  const gr = x.gr || {}, h = x.hist || [];
  if(gr.semLimite) return {est:"ok", txt: gr.especial ? "segurado especial em atividade (período em aberto no CNIS)" : "benefício em manutenção: qualidade sem limite", fonte:"CNIS"};
  if(!h.length) return {est:"informar", txt:"o CNIS não foi lido"};
  const ym = ymDe(iso), ultG = [...h].reverse().find(s=>s.tipo==="graca");
  if(ym < h[0].de) return {est:"risco", txt:`antes da primeira contribuição (${h[0].de.split("-").reverse().join("/")})`, fonte:"CNIS"};
  const seg = h.find(s=>s.tipo!=="reingresso" && s.de <= ym && ym <= s.ate);
  if(seg && seg.tipo==="contrib") return {est:"ok", txt:"contribuía nessa data", fonte:"CNIS"};
  if(seg && seg.tipo==="graca"){
    if(seg===ultG && gr.mantidaAte && iso > gr.mantidaAte) return {est:"risco", txt:`a graça terminou em ${fmtBarra(gr.mantidaAte)}`, fonte:"CNIS"};
    // F235 · a data antes do benefício que estendeu a qualidade se mede pela graça do último mês pago
    // (a DII de 03/2024 dizia "mantida até 11/2027", a graça de hoje, depois do auxílio)
    const benDepois = seg===ultG && seg.g && (x.benefCnis||[]).filter(b=>b.de && ymDe(b.de) >= seg.de).sort((a, b)=>a.de < b.de ? -1 : 1)[0];
    if(benDepois && iso <= benDepois.de){
      const ult = somarMeses(seg.de+"-01", -1).slice(0,7).split("-").reverse().join("/"), lim = `${somarMeses(seg.de+"-01", seg.g + 1).slice(0,7)}-15`;
      return iso <= lim ? {est:"ok", txt:`em graça depois do último mês pago (${ult}): mantida até ${fmtBarra(lim)}`, fonte:"CNIS"}
        : {est:"risco", txt:`a graça do último mês pago (${ult}) terminou em ${fmtBarra(lim)}, antes do benefício de ${fmtBarra(benDepois.de)}`, fonte:"CNIS"};
    }
    return {est:"ok", txt: seg===ultG && gr.mantidaAte ? `em graça, mantida até ${fmtBarra(gr.mantidaAte)}` : "em graça", fonte:"CNIS"};
  }
  // F235 · o trecho de perda do histórico começa pela graça (o acidente de 2006, dois meses depois da saída, dava "sem qualidade")
  if(seg && seg.tipo==="perda") return seg.perdaEm && iso < seg.perdaEm ? {est:"ok", txt:`em graça, mantida até ${fmtBarra(diaAnterior(seg.perdaEm))}`, fonte:"CNIS"}
    : {est:"risco", txt:"sem qualidade de segurado nessa data", fonte:"CNIS"};
  if(gr.mantidaAte) return iso <= gr.mantidaAte ? {est:"ok", txt:`mantida até ${fmtBarra(gr.mantidaAte)}`, fonte:"CNIS"}
    : {est:"risco", txt:`perdida desde ${fmtBarra(gr.perda||gr.mantidaAte)}`, fonte:"CNIS"};
  return {est:"informar", txt:"não consegui medir a qualidade nessa data"};
}
// o salário mínimo do mês de uma data
const smEm = iso => salarioMinimo(`${String(iso).slice(5,7)}/${String(iso).slice(0,4)}`);
// ── o contexto de um benefício ──────────────────────────────────────────
function reqCtx(c, ks, op){
  // F236 · sem pré-caso, a análise do benefício do caso é do caso: a DER dele vale antes da data de hoje (o B41 de DER 16/10
  // era medido hoje), e o que houve com o pedido conta. Outro benefício marcado na análise segue medido como antes
  const k0 = casoDaVez(c), caso = k0 && (opcaoDe(k0.subespecie || k0.especie || k0.beneficio)||{}).o===op ? k0 : null;
  const b = admCtx(c, ks), g = cnisDe(c), v = b.v, h = hoje(), der = v.der || (caso && caso.der) || h;
  const x = {...b, c, op, caso, hoje:h, der, idade: b.dn ? idadeEm(b.dn, der) : null, g, an: g && g.analise,
    hist: b.d ? historiaQualidade(c, b.d) : [], filiacao: v.apo_filiacao || filiacaoDe(g), benefCnis: beneficiosDoCnis(g),
    apos: aposentadoriaAtiva(c), cad: familiaCadunico(c), transp: (c.dossie||{}).transparencia || null, levados: [],
    clin: linhaClinica(c.id), cert: certidoesDoDossie(c.id)};
  // F236 · a DII e a DCB que a equipe gravou no caso valem como respondidas (antes do que o dossiê sugere)
  if(caso && ((caso.dii && !x.v.inc_dii) || (caso.dcb && !x.v.inc_dcb))) x.v = {...x.v, ...(caso.dii && !x.v.inc_dii ? {inc_dii:caso.dii} : {}), ...(caso.dcb && !x.v.inc_dcb ? {inc_dcb:caso.dcb} : {})};
  aplicarPreDossie(x);
  if(!(x.tempos||[]).length){ const auto = temposAutomaticos(x); if(auto.length){ x.tempos = auto; x.temposAuto = true; } }
  x.tot = admTotaisDe(x.tempos, x.sx, x.der < h ? x.der : h);   // F235 · a data do pedido presumida (a do pedido negado, no recurso) também corta o tempo
  x.totEm = iso => admTotaisDe(x.tempos, x.sx, iso);
  return x;
}
// F235 · o mesmo contexto com outras respostas (a projeção "pagando todo mês", o plano de completar o mínimo): as linhas
// automáticas do quadro Tempos se refazem com o v novo, porque a última linha de carnê abre quando se segue pagando
function ctxComV(x, mud){
  const y = {...x, v:{...x.v, ...(mud||{})}};
  if(!x.temposAuto) return y;
  const t = temposAutomaticos(y), lim = x.der < x.hoje ? x.der : x.hoje;
  return {...y, tempos:t, tot:admTotaisDe(t, x.sx, lim), totEm: iso => admTotaisDe(t, x.sx, iso)};
}
// o mesmo contexto, montado à mão (teste e simulação): o que não vier fica vazio
function reqCtxTeste(p){
  p = p || {};
  const fd = {laudos:[], cats:[], ppps:[], cartas:[], processos:[], seguros:[], cnpjs:[], rais:[], caged:[], extratos:[], resumos:[], redesim:null};
  const x = {hoje:"2026-10-16", der:"2026-10-16", op:"", c:null, d:null, dn:null, idade:null, sx:"M", ct:null, gr:null, hist:[], filiacao:null,
    g:null, an:null, benefCnis:[], apos:null, cad:null, transp:null, levados:[], v:{}, tempos:[], ops:[], clin:[], cert:[], ...p, fd:{...fd, ...(p.fd||{})}};
  x.i = x.sx==="F" ? 1 : 0;
  aplicarPreDossie(x);
  if(x.dn && p.idade==null) x.idade = idadeEm(x.dn, x.der);
  x.tot = p.tot || admTotaisDe(x.tempos, x.sx, x.der < x.hoje ? x.der : x.hoje);
  x.totEm = iso => admTotaisDe(x.tempos, x.sx, iso);
  return x;
}
// mede cada requisito; o erro de um não derruba os outros
// F235 · o dossiê responde campos da Análise de Direito: o relatório do médico (as datas do afastamento e do acidente,
// a sequela, o definitivo) e as certidões (óbito, prisão, nascimento). O valor entra na conta como presumido, com a
// fonte; o campo mostra "Usando…; preencha só se for outro valor"; o que se digita vale mais. O laudo do INSS tem
// prioridade sobre o relatório, porque é o que o INSS usa
const _clinMais = (x, k) => (x.clin||[]).filter(i=>i.fatos && i.fatos[k]).sort((a, b)=>String(b.data).localeCompare(String(a.data)))[0];
const _clinFonte = i => `${String(i.tipo||"documento").toLowerCase()} de ${fmtBarra(i.data)}${i.fonte ? ` (${String(i.fonte).split("/")[0].replace(/Ribeirao/, "Ribeirão")})` : ""}`;
const _semLaudoCom = (x, k) => !(x.fd.laudos||[]).some(l=>l[k]);
const _certMais = (x, k) => (x.cert||[]).filter(c=>c[k]).sort((a, b)=>String(b[k]).localeCompare(String(a[k])))[0];
const PRE_DOSSIE = {
  // F300 · a data de pagamento de cada guia do CNIS completo responde à pergunta do carnê pago em atraso
  apo_ci_atraso: x => { if(!x.c) return null; const st = _cnisComps.get(x.c.id);
    if(!st){ carregarCnisComps(x.c); return null; }
    const a = ciPagasEmAtraso(st.vs); if(!a) return null;
    return a.length ? {val:faixasDeMeses(a), fonte:`CNIS completo: ${plu(a.length, "guia paga", "guias pagas")} depois do vencimento antes da primeira paga em dia`}
      : {val:"nenhuma", fonte:"CNIS completo: a primeira guia de CI ou facultativo foi paga até o vencimento"}; },
  inc_dii: x => { if(!_semLaudoCom(x, "dii")) return null; const a = _clinMais(x, "afast");
    if(a) return {val:a.fatos.afast.ini, fonte:`${_clinFonte(a)}: afastamento desde ${fmtBarra(a.fatos.afast.ini)}`};
    const d = _clinMais(x, "desde"); return d ? {val:d.fatos.desde, fonte:`${_clinFonte(d)}: sem condições de trabalhar desde ${fmtBarra(d.fatos.desde)}`} : null; },
  inc_dat: x => { const a = _clinMais(x, "afast");
    // F235 · o acidente no meio do expediente (a CAT diz depois de quantas horas): o dia conta como trabalhado, e o afastamento começa no dia seguinte
    const cat = (x.fd.cats||[]).filter(c=>c.data && c.apos && !/^0?0:00$/.test(c.apos)).map(c=>({...c, iso:isoBr(c.data)})).sort((p, q)=>p.iso < q.iso ? -1 : 1).pop();
    if(cat && (!a || a.fatos.afast.ini===cat.iso)) return {val:cat.iso, fonte:`CAT de ${cat.data}: o acidente foi depois de ${cat.apos} de trabalho, e o dia conta como trabalhado`};
    return a ? {val:diaAnterior(a.fatos.afast.ini), fonte:`${_clinFonte(a)}: afastamento a partir de ${fmtBarra(a.fatos.afast.ini)}`} : null; },
  inc_dcb: x => { if(!_semLaudoCom(x, "dcb") || (x.benefCnis||[]).some(b=>b.ativo && /^(31|91)$/.test(b.especie))) return null;
    const a = _clinMais(x, "afast"); return a && a.fatos.afast.fim ? {val:a.fatos.afast.fim, fonte:`${_clinFonte(a)}: afastamento até ${fmtBarra(a.fatos.afast.fim)}`} : null; },
  inc_tipo: x => { const p = _clinMais(x, "perm"); if(p) return {val:"Permanente", fonte:`${_clinFonte(p)}: diz que é definitivo`};
    const a = _clinMais(x, "afast"); return a ? {val:"Temporária", fonte:`${_clinFonte(a)}: afastamento com prazo`} : null; },
  // F235 · o acréscimo de 25 % pelo que o relatório diz das atividades do dia a dia, e o CID do relatório quando não há laudo do INSS
  inc_terceiro: x => { const t = _clinMais(x, "terceiro"); if(t) return {val:"Sim", fonte:`${_clinFonte(t)}: diz que precisa de outra pessoa`};
    const so = _clinMais(x, "sozinho"); return so ? {val:"Não", fonte:`${_clinFonte(so)}: diz que faz as atividades do dia a dia sem ajuda`} : null; },
  inc_cid: x => { if(!_semLaudoCom(x, "cid")) return null; const i = (x.clin||[]).filter(i=>i.tipo==="Relatório" && (i.cids||[]).length).sort((a, b)=>String(a.data).localeCompare(String(b.data))).pop();
    return i ? {val:i.cids[0], fonte:_clinFonte(i)} : null; },
  inc_reab: x => { const r = _clinMais(x, "reab"); return r ? {val:"Reabilitação frustrada", fonte:`${_clinFonte(r)}: reabilitação sem melhora`} : null; },
  inc_did: x => { if(!_semLaudoCom(x, "did")) return null; const d = _clinMais(x, "diag") || _clinMais(x, "evento");
    return d ? {val:d.fatos.diag || d.fatos.evento, fonte:`${_clinFonte(d)}: ${d.fatos.diag ? "diagnóstico" : "início do quadro"} em ${fmtBarra(d.fatos.diag || d.fatos.evento)}`} : null; },
  aci_data: x => { if((x.fd.cats||[]).some(c=>c.data)) return null; const a = _clinMais(x, "acid");
    return a ? {val:a.fatos.acid.iso, fonte:`${_clinFonte(a)}: acidente em ${fmtBarra(a.fatos.acid.iso)}`} : null; },
  aci_tipo: x => { const a = _clinMais(x, "acid"); if(!a) return null; const f = a.fatos.acid;
    const v = f.trabalho ? "Típico (no trabalho)" : f.casa ? "Acidente em casa" : f.transito ? "Trânsito fora do trabalho" : f.fora ? "Outro acidente" : "";
    return v ? {val:v, fonte:_clinFonte(a)} : null; },
  aci_consolidacao: x => { const a = _clinMais(x, "consolidada"), v = a && typeof a.fatos.consolidada==="string" ? a.fatos.consolidada : null;
    return v ? {val:v, fonte:`${_clinFonte(a)}: lesão consolidada`} : null; },
  aci_reducao: x => { const a = _clinMais(x, "reduz"); return a ? {val:"Sim", fonte:`${_clinFonte(a)}: diz que a sequela reduz a capacidade`} : null; },
  aci_docs: x => { const a = (x.clin||[]).find(i=>i.tipo==="Relatório" && i.fatos && i.fatos.acid && i.fatos.sequela);
    return a ? {val:"Sim", fonte:`${_clinFonte(a)}: traz o acidente e a sequela`} : null; },
  // F235 · a atividade da data do acidente: a ocupação (CBO) da RAIS daquele ano, e não a profissão de hoje
  aci_atividade: x => { const cat = (x.fd.cats||[]).find(c=>c.data), ac = _clinMais(x, "acid");
    const d = x.v.aci_data || (cat && isoBr(cat.data)) || (ac && ac.fatos.acid.iso) || ""; if(!d) return null;
    const rs = (x.fd.rais||[]).filter(r=>r.cbo && String(r.ano) <= d.slice(0, 4)).sort((a, b)=>String(a.ano) < String(b.ano) ? -1 : 1), r = rs.pop();
    return r ? {val:String(r.cbo).toLowerCase(), fonte:`da ocupação na RAIS de ${r.ano}${r.nome ? `, ${tituloOrgao(r.nome)}` : ""}`} : null; },
  // F235 · a DID provável: o documento mais antigo que diz congênita, o primeiro documento médico ou o evento (o AVC),
  // e na falta de documento, na PcD, a data do acidente que a recepção anotou (prová-la é o requisito da DID)
  def_did: x => { const c = (x.clin||[]).filter(i=>i.fatos && i.fatos.congenita).sort((a, b)=>String(a.data) < String(b.data) ? -1 : 1)[0];
    if(c && x.dn) return {val:x.dn, fonte:`${_clinFonte(c)}: diz congênita (desde o nascimento); a avaliação do INSS confirma`};
    const ev = _clinMais(x, "evento"), evD = ev && ev.fatos.evento, ant = (x.clin||[]).filter(i=>/^\d{4}-\d{2}-\d{2}$/.test(i.data||"")).sort((a, b)=>a.data < b.data ? -1 : 1)[0];
    if(ant && (!evD || ant.data <= evD)) return {val:ant.data, fonte:`${_clinFonte(ant)}, o documento médico mais antigo do dossiê: data provável; a avaliação do INSS fixa a DID`};
    if(evD) return {val:evD, fonte:`${_clinFonte(ev)}: diz que o quadro começou em ${fmtBarra(evD)}; data provável, e a avaliação do INSS fixa a DID`};
    const m = /^(pcd|pcd_idade)$/.test(x.op||"") && relatoDe(x.c).match(/(?:acidente(?! vascular)|\bAVC\b|derrame|amputa\w*|perdeu|ficou (?:cego|surd)\w*|les[ãa]o)[^.\n]{0,80}?(\d{2}\/\d{2}\/\d{4})/i);
    return m && isoBr(m[1]) ? {val:isoBr(m[1]), fonte:`relato da recepção (${fmtBarra(isoBr(m[1]))}): data provável, que só documento da época prova`} : null; },
  dep_fato: x => { const c = _certMais(x, "obito") || _certMais(x, "prisao"); if(!c) return null;
    return {val:c.obito || c.prisao, fonte:`da ${c.rot}`}; },
  // F235 · a preventiva conta como regime fechado, mas a tela diz o que é; a declaração do presídio não é a certidão judicial
  dep_regime: x => { const c = _certMais(x, "prisao"), prov = c && /preventiva|provis[óo]ri|tempor[áa]ri/i.test(String((c.anexo||{}).texto||""));
    return c && c.regime ? {val: prov ? "Provisória, preventiva ou temporária" : cap1(c.regime), fonte:`da ${c.rot}`} : null; },
  rec_certidao: x => { const c = _certMais(x, "prisao"); return c && c.rot!=="declaração da unidade prisional" ? {val:"Sim", fonte:`${c.rot} no dossiê`} : null; },
  mat_data: x => { const n = (x.cert||[]).filter(c=>c.nascimento && c.nascimento >= somarMeses(x.hoje, -60)).sort((a, b)=>a.nascimento < b.nascimento ? -1 : 1).pop();
    return n ? {val:n.nascimento, fonte:`da certidão de nascimento${n.registrado ? ` de ${fraseClinica(n.registrado)}` : ""}`} : null; },
  mat_fato: x => (x.cert||[]).some(c=>c.nascimento && c.nascimento >= somarMeses(x.hoje, -60)) ? {val:"Parto", fonte:"da certidão de nascimento"} : null,
  tra_aliq_comps: x => { const vs = ((x.g||{}).vinculos||[]).filter(v=>v.tipo!=="Benefício" && v.inicio && (v.indicadores||[]).some(i=>/LC123|IREC-MEI|FBR/.test(String(i))));
    if(!vs.length) return null;
    const faixa = v => `${String(v.inicio).slice(3)} a ${v.fim ? String(v.fim).slice(3) : (v.ultRemun || x.hoje.slice(5,7)+"/"+x.hoje.slice(0,4))}`;
    return {val: vs.map(faixa).join("; "), fonte:`CNIS: indicador de alíquota reduzida (${[...new Set(vs.flatMap(v=>(v.indicadores||[]).filter(i=>/LC123|MEI|FBR/.test(String(i)))))].join(", ")})`}; },
};
