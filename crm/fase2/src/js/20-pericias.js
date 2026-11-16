// ═══ Onda 5 · A CLÍNICA: a linha do tempo dos documentos médicos do dossiê ═══
// A data e o tipo saem do nome do arquivo, que o portal do hospital já traz
// ("21-JUN-2024 16h31m35 RELATÓRIO MÉDICO", "30-05-2026 TOMOGRAFIA…",
// "Internacao 11-05-2024 - 22-06-2024"); do texto saem a conclusão do exame,
// o diagnóstico principal da internação, a hipótese do relatório e o CID.
const RX_FONTE_CLINICA = /^HC\b|hospital|cl[íi]nica|m[ée]dic|exame|sa[úu]de|\bubs\b|\bupa\b/i;
// F235 · o relatório do médico que o cliente trouxe pode estar em outra pasta (o da PcD vinha em "Declaracao"): conta como
// documento médico pelo nome do arquivo; o laudo da perícia do INSS (pasta Laudos) segue fora
const ehDocMedico = a => { const [f, arq] = fonteDoDossie(a); return RX_FONTE_CLINICA.test(f) || (!/^Laudos/i.test(f) && /relat[óo]rio m[ée]dic|laudo m[ée]dic|atestado m[ée]dic/i.test(arq||"")); };
// a lista das doenças que dispensam a carência (art. 26, II, da Lei 8.213/91 e
// Portaria Interministerial MTP/MS 22/2022): o termo ou o CID é só um sinal,
// que se confere no documento
const RX_DOENCA_GRAVE = /neoplasia maligna|c[âa]ncer|carcinoma|sarcoma|linfoma|leucemia|mieloma|met[áa]stase|tuberculose|hansen[íi]ase|esclerose m[úu]ltipla|parkinson|cardiopatia grave|nefropatia grave|hepatopatia grave|cegueira|paralisia irrevers[íi]vel|espondilite anquilosante|espondiloartrose anquilosante|doen[çc]a de paget|oste[íi]te deformante|\baids\b|\bhiv\b|aliena[çc][ãa]o mental|acidente vascular (?:cerebral|encef[áa]lico)|abdome agudo/i;
const RX_CID_GRAVE = /^(C\d{2}|A1[5-9]|A30|G35|G20|B2[0-4]|M45|M88|H54\.?0)/;
// o PDF do hospital sai com parte do texto em fonte deslocada (o "H" vira "+",
// o "O" vira "2"): a palavra feita quase toda desses sinais volta somando 29 ao
// código de cada um. Data, telefone e número ficam como estão.
function desfazFonteHc(t){
  return String(t||"").replace(/\S{4,}/g, w=>{
    const cs = [...w].map(ch=>ch.charCodeAt(0));
    const sinais = cs.filter(n=>(n>=36 && n<=44) || (n>=59 && n<=61)).length, digitos = cs.filter(n=>n>=48 && n<=57).length;
    if(sinais < 2 || digitos/cs.length >= 0.5 || cs.filter(n=>n>=36 && n<=93).length/cs.length < 0.6) return w;
    // o espaço vira o código 3 e o hífen o 16: voltam pelo mesmo deslocamento
    const dec = cs.map(n=>String.fromCharCode((n>=1 && n<=31) || (n>=36 && n<=93) ? n+29 : n)).join("");
    // F235 · "G20)," (CID com parêntese) virava "dOMFI": a palavra decodificada tem de ser toda maiúscula, toda minúscula ou capitalizada
    const l = dec.replace(/[^A-Za-zÀ-ÿ]/g, "");
    return !l || l===l.toUpperCase() || l===l.toLowerCase() || (l[0]===l[0].toUpperCase() && l.slice(1)===l.slice(1).toLowerCase()) ? dec : w;
  });
}
const MES_ABREV = {JAN:1,FEV:2,FEB:2,MAR:3,ABR:4,APR:4,MAI:5,MAY:5,JUN:6,JUL:7,AGO:8,AUG:8,SET:9,SEP:9,OUT:10,OCT:10,NOV:11,DEZ:12,DEC:12};
function dataDoNomeClinico(nome){
  const m = String(nome||"").match(/(\d{2})-([A-Za-z]{3})-(\d{4})/), n = m && MES_ABREV[m[2].toUpperCase()];
  if(n) return `${m[3]}-${String(n).padStart(2,"0")}-${m[1]}`;
  const d = String(nome||"").match(/(\d{2})[-_.](\d{2})[-_.](\d{4})/);
  return d && +d[2]>=1 && +d[2]<=12 ? `${d[3]}-${d[2]}-${d[1]}` : "";
}
function itemClinico(a, txt){
  const [fonte, arq] = fonteDoDossie(a), nome = arq.replace(/\.pdf$/i, "");
  const t = /^HC\b/i.test(fonte) || /HOSPITAL DAS CL/i.test(txt||"") ? desfazFonteHc(txt) : String(txt||"");
  const tipo = /interna[çc]|\bAIH\b/i.test(`${nome} ${fonte}`) ? "Internação" : /relat[óo]rio|atestado|declara[çc]/i.test(nome) ? "Relatório"
    : /tomografia|resson|radiograf|raio|ultrass|ecograf|exame|eletroneuro|densitom|bi[óo]psia|anatomo|mamograf|endoscop|audiometr|campimetr|espirometr/i.test(`${nome} ${fonte}`) ? "Exame" : "Documento médico";
  // F235 · o relatório sem data no nome traz a data por extenso no fim ("Ribeirão Preto, 5 de outubro de 2026"), e não a da coleta
  const data = dataDoNomeClinico(nome) || isoBr((t.match(/Data de Realiza[çc][ãa]o:\s*(\d{2}\/\d{2}\/\d{4})/i)||[])[1]) || isoBr(dataPorExtenso(t.slice(-240))) || String(a.criado_em||"").slice(0, 10);
  const int = nome.match(/Interna[çc]ao\s+(\d{2})-(\d{2})-(\d{4})\s*-\s*(\d{2})-(\d{2})-(\d{4})/i);
  const titulo = int ? `internação de ${int[1]}/${int[2]}/${int[3]} a ${int[4]}/${int[5]}/${int[6]}`
    : nome.replace(/^\d{2}[-_.][A-Za-z0-9]{2,3}[-_.]\d{4}\s*(\d{2}h\d{2}m\d{2}\s*)?/, "").replace(/^\d{2}\s*-\s*/, "").trim() || nome;
  const concl = (t.match(/Conclus[ãa]o(?: do Laudo)?:\s*([\s\S]{0,400}?)(?:\n(?:Emissor|Revisor|ASSINATURA|Exame \()|$)/i)||[])[1];
  const princ = (t.match(/^PRINCIPAL\s+(.+)$/m)||[])[1];
  const hd = (t.match(/\bHD:\s*\n?((?:(?!CID\b)[^\n]*\n?){1,3})/)||[])[1];
  // F235 · o relatório da deficiência não tem "Conclusão" nem "HD": valem a linha do diagnóstico e a frase do que a pessoa não consegue fazer
  const diag = !concl && !princ && !hd ? (t.match(/Diagn[óo]stico:\s*([^\n]{5,240})/i)||[])[1] : null, limita = diag ? (t.replace(/\s+/g, " ").match(/[^.]*\bn[ãa]o consegue\b[^.]*\./i)||[])[0] : null;
  // F235 · o resumo leva o diagnóstico em frase e, inteiras, as frases que decidem (afastamento, definitivo, sequela,
  // sem condições de trabalhar); o corte em 160 letras sumia justo com o "afastamento de 90 dias"
  // F235 · sem conclusão nem HD, a linha do diagnóstico
  const base = fraseClinica(String(concl || (princ ? `diagnóstico principal: ${princ}` : hd ? `hipótese: ${hd}` : diag ? `diagnóstico: ${diag}` : ""))
    .replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim());
  // F235 · a frase que diz que o acidente foi no trabalho também entra (a internação do HC resumia sem ela)
  const chave = (t.replace(/\s+/g, " ").match(/[^.:]*\b(?:afastamento|afastad[oa]|sem condi[çc][õo]es|incapa\w*|definitiv\w*|permanente|sequela|reabilita\w*|consolidad\w*|quimioterapia|diagnosticad\w*|no trabalho|em ambiente de trabalho)\b[^.]*\./gi) || [])
    .map(s=>fraseClinica(s.trim())).filter(s=>s.length < 280 && !base.includes(s.slice(0, 30)));
  // F235 · e, inteira, a frase do que a pessoa não consegue fazer
  const resumo = [cortaFrase(base, 180), limita && cortaFrase(fraseClinica(limita.trim()), 240), ...chave.slice(0, limita ? 1 : 2)].filter(Boolean).join(" · ");
  const cids = [...new Set([...t.matchAll(/\bCID(?:-?10)?\s*[:=]?\s*([A-TV-Z]\d{2}(?:\.?\d)?)\b/gi)].map(m=>m[1].toUpperCase()))];
  const g = `${t} ${nome}`.match(RX_DOENCA_GRAVE), gc = cids.find(x=>RX_CID_GRAVE.test(x));
  return {data, tipo, titulo: fraseClinica(titulo), resumo, cids, grave: g ? g[0].toLowerCase() : gc ? `o CID ${gc}` : "", fonte, fatos: datasDoRelatorio(t)};
}
// F235 · o caixa-alta do HC ("SEQUELA DE LESAO DOS TENDOES") vira frase, e o CID fica em maiúscula
function fraseClinica(s){
  s = String(s||""); const l = s.replace(/[^A-Za-zÀ-ÿ]/g, ""), up = l.replace(/[^A-ZÀ-Þ]/g, "").length;
  if(!l || up / l.length < 0.6) return s;
  return s.toLowerCase().replace(/(^|[.:;·]\s*)([a-zà-ÿ])/g, (m, a, b)=>a + b.toUpperCase())
    .replace(/\b([a-tv-z])(\d{2}(?:\.\d)?)\b/g, (m, a, b)=>a.toUpperCase() + b).replace(/\bcid\b/g, "CID").replace(/\bavc\b/g, "AVC");
}
const cortaFrase = (s, n) => { s = String(s||""); if(s.length <= n) return s; const c = s.slice(0, n), p = Math.max(c.lastIndexOf(". "), c.lastIndexOf("; "));
  return (p > n * 0.5 ? c.slice(0, p + 1) : c.replace(/\s+\S*$/, "")) + "…"; };
// F235 · o que o relatório do médico diz em datas e nas palavras que decidem: o início e o fim do afastamento,
// desde quando não consegue trabalhar, o acidente (a data e se foi no trabalho), a sequela consolidada, se é
// definitivo, a reabilitação frustrada e quando a doença foi diagnosticada. Serve para pré-preencher a Análise de
// Direito, sempre como valor provável, com a fonte, para confirmar com a pessoa
function datasDoRelatorio(t){
  const s = String(t||"").replace(/\s+/g, " "), out = {}, D = "(\\d{2}\\/\\d{2}\\/\\d{4})";
  const iso = d => { const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(d||""); return m ? `${m[3]}-${m[2]}-${m[1]}` : ""; };
  let m = s.match(new RegExp(`afastamento(?: de (\\d{1,3}) dias)?,? de ${D} a ${D}`, "i"));
  if(m) out.afast = {ini:iso(m[2]), fim:iso(m[3]), dias: m[1] ? +m[1] : null};
  else if((m = s.match(new RegExp(`afastamento(?: de (\\d{1,3}) dias)?[^.]{0,30}?(?:a partir de|desde|iniciado em)\\s+${D}`, "i"))))
    out.afast = {ini:iso(m[2]), dias: m[1] ? +m[1] : null};
  if(out.afast && out.afast.dias && !out.afast.fim) out.afast.fim = new Date(Date.parse(out.afast.ini+"T12:00:00") + (out.afast.dias-1)*864e5).toISOString().slice(0,10);
  if(/sem condi[çc][õo]es de (?:trabalh|exercer)|incapa[cz]|afastad[oa] do trabalho/i.test(s)
    && (m = s.match(new RegExp(`(?:sem condi[çc][õo]es de (?:trabalh|exercer)\\w*|incapa\\w+|parou de trabalhar|em quimioterapia|internad[oa])[^.]{0,30}?(?:desde|a partir de)\\s+${D}`, "i"))))
    out.desde = iso(m[1]);
  if((m = s.match(new RegExp(`(?:acidente(?! vascular)|queda|trauma|atropelamento|colis[ãa]o|corte com|prensa)[^.]{0,90}?(?:em|no dia)\\s+${D}`, "i")))){
    const fora = /fora do trabalho|em casa|dom[ée]stic|tr[âa]nsito|motocicleta|\bmoto\b|bicicleta|carro|lazer|esporte/i.test(s);
    out.acid = {iso:iso(m[1]), trabalho: !/fora do trabalho/i.test(s) && /acidente (?:de|do) trabalho|no trabalho\b|de trajeto|t[íi]pico/i.test(s),
      casa: /em casa|dom[ée]stic/i.test(s), transito: /tr[âa]nsito|motocicleta|\bmoto\b|bicicleta|carro|atropel/i.test(s), fora};
  }
  if((m = s.match(/consolidad[ao](?: desde (?:(\d{2})\/)?(\d{2})\/(\d{4}))?/i))) out.consolidada = m[4] ? `${m[4]}-${m[3]}-${m[2] || "01"}` : true;
  if(/sequela|perda d[ae] (?:for[çc]a|pin[çc]a|movimento|flex|sensibilidade)|limita[çc][ãa]o (?:para|permanente)/i.test(s)) out.sequela = true;
  if(/reduz(?:ida)? a capacidade|maior esfor[çc]o/i.test(s)) out.reduz = true;
  if(/definitiv|incapacidade (?:total e )?permanente|irrevers[íi]vel|sem (?:perspectiva|possibilidade) de (?:melhora|reabilita|retorno)|n[ãa]o vai melhorar/i.test(s)) out.perm = true;
  if(/sem possibilidade de reabilita|reabilita[çc][ãa]o (?:frustrada|sem (?:sucesso|melhora))|ap[óo]s \d+ meses de reabilita/i.test(s)) out.reab = "frustrada";
  if((m = s.match(new RegExp(`diagnosticad[ao] em ${D}|data do diagn[óo]stico:?\\s*${D}`, "i")))) out.diag = iso(m[1] || m[2]);
  if((m = s.match(new RegExp(`(?:AVC|acidente vascular\\w*|infarto)[^.]{0,30}?em ${D}`, "i")))) out.evento = iso(m[1]);
  // F235 · quem faz sozinho as atividades do dia a dia não tem o acréscimo de 25 %; quem precisa de outra pessoa, tem
  if(/faz sozinh[ao]|independente para as atividades|sem ajuda de terceiros/i.test(s)) out.sozinho = true;
  if(/(?:precisa|necessita) de (?:ajuda|aux[íi]lio|cuidador)[^.]{0,20}(?:permanente|de terceiros|de outra pessoa|o tempo todo)|depende de terceiros|cuidador em tempo integral/i.test(s)) out.terceiro = true;
  if(/cong[êe]nit/i.test(s)) out.congenita = true;
  return out;
}
// F235 · as certidões e declarações que o cliente traz (óbito, prisão, nascimento, casamento): a data que decide o prazo
function lerCertidaoTexto(t){
  const s = String(t||"").replace(/\s+/g, " "), out = {}, D = "(\\d{2}\\/\\d{2}\\/\\d{4})";
  const iso = d => { const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(d||""); return m ? `${m[3]}-${m[2]}-${m[1]}` : ""; };
  let m;
  if(/CERTID[ÃA]O DE [ÓO]BITO/i.test(s) && (m = s.match(new RegExp(`(?:falecimento|[óo]bito|faleceu em)[^0-9]{0,30}${D}`, "i")))){
    out.obito = iso(m[1]); out.causa = ((s.match(/Causa da morte:\s*(.{3,140}?)(?:\s+(?:Estado civil|Filhos|Declarante|Local)\b|$)/i)||[])[1]||"").trim(); out.rot = "certidão de óbito";
    const campo = rot => ((s.match(new RegExp(`${rot}:\\s*(.{2,200}?)(?:\\s+(?:Estado civil|Filhos|Declarante|Data do registro|Local|Causa da morte|Segunda via|Observa[çc][õo]es|Averba[çc][õo]es)\\b|$)`, "i"))||[])[1]||"").trim();
    out.civil = campo("Estado civil"); out.declarante = campo("Declarante");
    // "BRUNA, 27 anos, e FELIPE, 24 anos": o nome e a idade de cada filho no óbito
    out.filhos = [...campo("Filhos").matchAll(/([A-ZÀ-Ý][A-ZÀ-Ý ]{1,60}?),\s*(\d{1,2})\s*anos?/g)].map(f=>({nome:f[1].trim(), idade:+f[2]})); }
  if(/recolhid[oa] (?:à|a) pris[ãa]o|RECOLHIMENTO PRISIONAL|atestado de c[áa]rcere|deu entrada nesta unidade|permanece recolhid/i.test(s)
    && (m = s.match(new RegExp(`(?:recolhid[oa] (?:à|a) pris[ãa]o|deu entrada nesta unidade|pres[oa] desde|custodiad[oa])[^0-9]{0,40}${D}`, "i")))){
    out.prisao = iso(m[1]); out.regime = ((s.match(/regime (fechado|semiaberto|aberto)/i)||[])[1]||(/preventiva|provis[óo]ri/i.test(s) ? "fechado" : "")).toLowerCase();
    out.rot = /DECLARA[ÇC][ÃA]O/i.test(s) && !/CERTID/i.test(s) ? "declaração da unidade prisional" : "certidão da prisão"; }
  if(/CERTID[ÃA]O DE NASCIMENTO/i.test(s) && (m = s.match(new RegExp(`(?:nascid[oa] em|data de nascimento:?|nasceu em)\\s*${D}`, "i")))){
    out.nascimento = iso(m[1]); out.registrado = ((s.match(/Registrad[oa]:\s*([^·]+?)\s*·/i)||[])[1]||"").trim(); out.rot = out.rot || "certidão de nascimento"; }
  if(/CERTID[ÃA]O DE CASAMENTO/i.test(s) && (m = s.match(new RegExp(`data do casamento:?\\s*${D}`, "i")))){ out.casamento = iso(m[1]); out.rot = out.rot || "certidão de casamento";
    out.contraentes = ((s.match(/Contraentes:\s*(.{5,200}?)(?:\s+Data do casamento|\s·|$)/i)||[])[1]||"").trim(); out.divorcio = /div[óo]rcio|separa[çc][ãa]o judicial/i.test(s); }
  return out;
}
// F235 · os papéis do trabalho rural ou da pesca que o dossiê traz (ITR, CCIR, notas de produtor, CAF, sindicato, RGP)
const RX_PAPEL_RURAL = /\bITR\b|\bCCIR\b|nota(s)? (fiscal |fiscais )?de produtor|produtor rural|\bCAF\b|\bDAP\b|sindicato dos trabalhadores rurais|escritura.*(rural|s[íi]tio|ch[áa]cara|fazenda)|lavrador|agricultor|\bRGP\b|pescador/i;
const papeisRurais = cliId => docsDoDossie(cliId).filter(a=>RX_PAPEL_RURAL.test(`${a.nome} ${String(a.texto||"").slice(0, 600)}`));
// F235 · o papel da roça com os anos que cobre. "Atividade" é o que registra a produção (notas, ITR, CCIR, CAF, DAP,
// sindicato) ou qualifica a própria pessoa como lavradora; a escritura dos pais, sem o nome dela, prova a terra e não
// marca o começo nem o fim. A data de nascimento escrita no papel não conta como ano do papel
function papeisRuraisComAno(c){
  const ws = dsa((c||{}).nome||"").split(/\s+/).filter(w=>w.length > 2), nomeado = t => ws.length > 1 && t.includes(ws[0]) && ws.slice(1).some(w=>t.includes(w));
  return papeisRurais((c||{}).id).map(a=>{
    const t0 = `${a.nome} ${String(a.texto||"").slice(0, 2000)}`.replace(/nascid[oa] em \d{2}\/\d{2}\/\d{4}/gi, ""), t = dsa(t0);
    const faixa = t0.match(/\b(19[3-9]\d|20[0-3]\d)\s+a\s+(19[3-9]\d|20[0-3]\d)\b/), anos = [...t0.matchAll(/\b(19[3-9]\d|20[0-3]\d)\b/g)].map(m=>+m[1]);
    if(!anos.length) return null;
    const datas = [...t0.matchAll(/(\d{2})\/(\d{2})\/((?:19|20)\d{2})/g)].map(m=>`${m[3]}-${m[2]}-${m[1]}`).sort();
    const producao = /notas? (fiscais )?de produtor|\bd?itr\b|\bccir\b|\bcaf\b|\bdap\b|sindicato|mao de obra:? familiar/.test(t);
    const rot = String(a.nome||"").split(" · ").pop().replace(/\.(pdf|txt)$/i, "");
    const rotLimpo = rot.replace(/\s*\(?\b(19|20)\d{2}\b(\s*a\s*\b(19|20)\d{2}\b)?\)?/g, "").replace(/\s+/g, " ").trim();
    return {a, rot, rotLimpo, ativ: producao || (nomeado(t) && /lavrador|agricultor|pescador|rural/.test(t)), proprio: nomeado(t),
      de: faixa ? +faixa[1] : Math.min(...anos), ate: faixa ? +faixa[2] : Math.max(...anos), data: !faixa && datas.length===1 ? datas[0] : ""};
  }).filter(Boolean);
}
// F235 · a roça que os papéis e o relato provam, proposta no quadro Tempos: segurado especial do primeiro papel de
// atividade (nunca antes dos 12 anos) ao último, ou em aberto quando a pessoa segue na roça; os meses de emprego do
// CNIS saem da linha. A prova de cada trecho são os papéis dele, com o ano. A confirmar com a autodeclaração
function linhasRuraisPropostas(x){
  const alvo = x.op ? /^(idade_rural|hibrida)$/.test(x.op) : (x.ops||[]).some(o=>/^(idade_rural|hibrida)$/.test(o.o||""));
  if(!alvo || !x.c) return [];
  const at = papeisRuraisComAno(x.c).filter(p=>p.ativ); if(!at.length) return [];
  const rel = relatoDe(x.c), d12 = x.dn ? somarAnos(x.dn, 12) : "0000-01-01";
  const ini0 = `${Math.min(...at.map(p=>p.de))}-01-01`, ini = ini0 > d12 ? ini0 : d12;
  const segue = /\b(trabalha|segue|continua|planta|cuida)\b[^.]{0,50}\b(ro[çc]a|s[íi]tio|lavoura|planta[çc][ãa]o)/i.test(rel);
  const ateRel = (rel.match(/ro[çc]a[^.]{0,60}?\bat[ée]\s+((?:19|20)\d{2})/i) || rel.match(/\bat[ée]\s+((?:19|20)\d{2})[^.]{0,40}ro[çc]a/i) || [])[1];
  const ult = at.slice().sort((p, q)=>p.ate - q.ate).pop();
  const fim = segue && !ateRel ? "" : ateRel ? `${ateRel}-12-31` : ult.data || `${ult.ate}-12-31`;
  if(fim && fim < ini) return [];
  // os meses de emprego (e de contribuinte na cidade) do CNIS não são de roça
  const fora = ((x.g||{}).vinculos||[]).filter(v=>v.tipo!=="Benefício" && v.inicio && !/Segurado Especial/i.test(v.tipo||""))
    .map(v=>[isoBr(v.inicio), isoBr(v.fim||"") || (v.ultRemun ? isoBr(fimDoMes(v.ultRemun)) : x.hoje)]).filter(([a])=>a).sort();
  let segs = [[ini, fim]];
  for(const [a, b] of fora) segs = segs.flatMap(([s, e])=>{ const ee = e || "9999-12-31"; if(b < s || a > ee) return [[s, e]];
    return [...(a > s ? [[s, diaAnterior(a)]] : []), ...(b < ee ? [[diaSeguinte(b), e]] : [])]; });
  const onde = (String(at.map(p=>p.a.texto||"").join(" ")).match(/S[íi]tio [A-ZÀ-Ý][a-zà-ú]+(?: [A-ZÀ-Ý][a-zà-ú]+)?/)||[])[0] || "roça";
  return segs.filter(([s, e])=>!e || e >= s).map(([s, e])=>{ const y0 = +s.slice(0, 4), y1 = e ? +e.slice(0, 4) : +x.hoje.slice(0, 4);
    const ps = at.filter(p=>p.de <= y1 && p.ate >= y0).map(p=>({p, a:Math.max(p.de, y0), b:Math.min(p.ate, y1)})).sort((u, v)=>u.a - v.a);
    const prova = ps.map(({p, a, b})=>`${a}${b > a ? ` a ${b}` : ""}: ${p.rotLimpo.charAt(0).toLowerCase()}${p.rotLimpo.slice(1)}${p.proprio ? "" : " (de familiar)"}`).join("; ");
    return {de:s, ate:e, onde, nat:"rural", det:"Segurado especial", prova: prova ? `${prova}; a confirmar com a autodeclaração` : "relato; falta papel deste período", auto:true, rural:true}; });
}
// F235 · a roça é de agora (papel de atividade dos últimos anos, ou o relato diz que segue nela) ou é antiga, a da híbrida
function rocaAtual(c){
  const ano = +hoje().slice(0, 4);
  return papeisRuraisComAno(c).some(p=>p.ativ && p.ate >= ano - 3) || /\b(trabalha|segue|continua|planta|cuida)\b[^.]{0,50}\b(ro[çc]a|s[íi]tio|lavoura|planta[çc][ãa]o)/i.test(relatoDe(c));
}
// F235 · a piracema da bacia do Paraná, de 01/11 ao fim de fevereiro (datas da SEMIL/SP; conferir o ato do defeso), e a janela do
// pedido: de 30 dias antes a 90 dias depois do início, ou até o fim do defeso mais curto (Resolução Codefat 1.027/2025, art. 15; conferir)
function piracemaDe(iso){
  const y = +String(iso||"").slice(0, 4); if(!y) return null;
  for(const a of [y - 1, y, y + 1]){
    const ini = `${a}-11-01`, fim = new Date(Date.UTC(a + 1, 2, 0)).toISOString().slice(0, 10), noventa = somaDias(ini, 90);
    const abre = somaDias(ini, -30), fecha = noventa < fim ? noventa : fim;
    // depoisDoAnterior: o dia seguinte ao fim do defeso anterior, que abre o período que tem de ser só de pesca
    if(iso <= fecha) return {ini, fim, abre, fecha, aberta: iso >= abre, parcelas: mesesEntreYm(ymDe(ini), ymDe(fim)), depoisDoAnterior: `${a}-03-01`};
  }
  return null;
}
// F235 · os papéis do pescador lidos: o RGP (desde quando, a homologação da prefeitura, onde pesca), o REAP entregue, os meses
// com nota de venda nos 12 antes do defeso e a identidade com biometria
function pescaDoDossie(c){
  const out = {rgp:null, reap:null, notas:null, cin:null}; if(!c) return out;
  for(const a of docsDoDossie(c.id).filter(a=>a.texto)){
    const t = String(a.texto), nm = dsa(a.nome||""), d = dsa(t), m = re => (t.match(re)||[])[1] || "";
    if(/registro geral da atividade pesqueira|\brgp\b/.test(nm) || /registro geral da atividade pesqueira/.test(d))
      out.rgp = {a, desde: isoBr(m(/primeiro registro:?\s*(\d{2}\/\d{2}\/\d{4})/i)), homolog: isoBr(m(/homologa[çc][ãa]o[^\d\n]{0,80}(\d{2}\/\d{2}\/\d{4})/i)),
        situacao: m(/situa[çc][ãa]o:?\s*([A-Za-zÀ-ú]+)/i).toLowerCase(), local: m(/local de pesca:?\s*([^\n]+?)(?:\s*·\s*esp[ée]cies|\n|$)/i).trim(), especies: m(/esp[ée]cies:?\s*([^\n·]+)/i).trim()};
    else if(/relatorio anual da atividade pesqueira|\breap\b/.test(`${nm} ${d}`)) out.reap = {a, ano: m(/ano-base:?\s*(\d{4})/i), entregue: isoBr(m(/entregue em\s*(\d{2}\/\d{2}\/\d{4})/i))};
    else if(/venda do pescado/.test(`${nm} ${d}`)){
      const pi = piracemaDe(hoje()), de = pi ? ymDe(somarMeses(pi.ini, -12)) : "0000-00", ate = pi ? ymDe(somarMeses(pi.ini, -1)) : "9999-99";
      out.notas = {a, de, ate, meses: [...new Set([...t.matchAll(/(\d{2})\/(\d{2})\/((?:19|20)\d{2})/g)].map(x=>`${x[3]}-${x[2]}`))].filter(k=>k >= de && k <= ate).sort()};
    }
    else if(/carteira de identidade nacional|\bcin\b/.test(`${nm} ${d}`) && /biometria/.test(d)) out.cin = {a, emitida: isoBr(m(/emitida em\s*(\d{2}\/\d{2}\/\d{4})/i))};
  }
  return out;
}
// F235 · cada papel da roça ou da pesca, lido para o atendimento: o tipo, de quando é, em nome de quem está e o que prova.
// O de familiar vale se o titular era segurado especial no período (IN 128, art. 116, § 3º, I); o sogro não é do grupo
// familiar (art. 109, § 1º, IV); os pais, para o filho solteiro (art. 109, § 1º, V); a escritura vale até a venda (art. 116, § 2º, III)
const ROT_PAPEL = [[/escritura/, "Escritura"], [/\bccir\b/, "CCIR"], [/\bd?itr\b/, "ITR"], [/venda do pescado/, "Notas de venda do pescado"],
  [/notas? (fiscais )?de produtor|bloco de notas/, "Notas de produtor"], [/registro geral da atividade pesqueira|\brgp\b/, "RGP"],
  [/relatorio anual da atividade pesqueira|\breap\b/, "REAP"], [/\bcaf\b|agricultura familiar/, "CAF"], [/\bdap\b|aptidao ao pronaf/, "DAP"],
  [/certidao de casamento/, "Certidão de casamento"], [/certidao de nascimento/, "Certidão de nascimento"], [/titulo (de )?eleit/, "Título de eleitor"],
  [/dispensa de incorporacao|reservista|alistamento militar/, "Certificado militar"], [/historico (da )?escol|boletim escolar/, "Histórico escolar"],
  [/cartao da gestante|caderneta da gestante/, "Cartão da gestante"], [/sindicato/, "Ficha do sindicato"], [/colonia de pescadores|associacao de pescadores/, "Carteira da colônia de pescadores"]];
function papeisDaRoca(c){
  if(!c) return [];
  const ws = dsa(c.nome||"").split(/\s+/).filter(w=>w.length > 2), nomeado = t => ws.length > 1 && t.includes(ws[0]) && ws.slice(1).some(w=>t.includes(w));
  const fz = familiaCadunico(c), conj = ((fz||{}).membros||[]).filter(m=>/c[oô]njuge|companheir/i.test(m.parentesco||"")).map(m=>dsa(m.nome||"").split(/\s+/)[0]).filter(w=>w.length > 2);
  const F = ehF(c), dele = F ? "dela" : "dele", trat = tratDe(c).toLowerCase(), outro = F ? "do marido" : "da esposa", dn = dnIso(c.dn), pz = pescaDoDossie(c);
  const parto = certidoesDoDossie(c.id).filter(ce=>ce.nascimento && ce.nascimento!==dn && ce.nascimento >= somarMeses(hoje(), -60)).map(ce=>ce.nascimento).sort().pop() || "";
  const deOutroQuadro = /^(CNIS|Cadastro|CTPS|CNPJ|Processos|Recursos|Cartas|Extrato|Laudos|HC |PPP|CAT|CTC|CadUnico|Transparencia)/i;
  return papeisRurais(c.id).filter(a=>!deOutroQuadro.test(fonteDoDossie(a)[0])).map(a=>{
    const arq = fonteDoDossie(a)[1], nm = dsa(arq), t0 = String(a.texto||""), t = dsa(t0);
    const rs = ROT_PAPEL.filter(([re])=>re.test(nm)).map(x=>x[1]), rs2 = rs.length ? rs : ROT_PAPEL.filter(([re])=>re.test(t)).map(x=>x[1]).slice(0, 1);
    const rot = rs2.includes("ITR") && rs2.includes("CCIR") ? "ITR e CCIR" : rs2[0] || cap1(arq.replace(/\.(pdf|txt)$/i, "").replace(/\s*\(.*$/, ""));
    const limpo = t0.replace(/nascid[oa] em \d{2}\/\d{2}\/\d{4}/gi, "").replace(/menstrua[çc][ãa]o:?\s*\d{2}\/\d{2}\/\d{4}/gi, "");
    const datas = [...limpo.matchAll(/(\d{2})\/(\d{2})\/((?:19|20)\d{2})/g)].map(x=>`${x[3]}-${x[2]}-${x[1]}`).sort();
    const fx = `${arq} ${limpo}`.match(/\b((?:19|20)\d{2})\s+a\s+((?:19|20)\d{2})\b/), anos = [...`${arq} ${limpo}`.matchAll(/\b((?:19|20)\d{2})\b/g)].map(x=>+x[1]);
    const de = fx ? +fx[1] : anos.length ? Math.min(...anos) : null, ate = fx ? +fx[2] : anos.length ? Math.max(...anos) : null;
    const data = fx ? "" : datas[0] || "", venda = isoBr((t0.match(/vendid[oa] em (\d{2}\/\d{2}\/\d{4})/i)||[])[1] || ""), nasc = isoBr((t0.match(/nascid[oa] em (\d{2}\/\d{2}\/\d{4})/i)||[])[1] || "");
    // a profissão escrita no papel que qualifica a pessoa (certidão, título, cartão, ficha); nota, ITR, CCIR e CAF provam a atividade por si
    const producao = /^(ITR|CCIR|ITR e CCIR|Notas de produtor|Notas de venda do pescado|CAF|DAP|RGP|REAP)$/.test(rot);
    const lar = /do lar|prendas domesticas/.test(t), prof = !lar && !producao && (t.match(F ? /\b(lavradora|agricultora|pescadora|produtora rural)\b/ : /\b(lavrador|agricultor|pescador|produtor rural)\b/)||[])[1];
    const reg = (t.match(/registrad[oa]:?\s*([^·\n]+)/)||[])[1] || "";
    const titular = rot==="Certidão de nascimento" && reg && nomeado(reg) ? "pais" : nomeado(t) ? "proprio" : /\bsogr/.test(`${nm} ${t}`) ? "sogro"
      : /\b(marido|esposa|conjuge|companheir)/.test(nm) || conj.some(n=>t.includes(n)) ? "conjuge" : /\b(pai|mae|pais)\b/.test(nm) ? "pais" : "outro";
    let est = "ok", txt = titular==="proprio" ? `no nome ${dele}${prof ? `, com a profissão de ${prof}` : ""}`
      : titular==="conjuge" ? `no nome ${outro}: vale para ${trat} se ${F ? "ele" : "ela"} era ${F ? "segurado" : "segurada"} especial no período, sem emprego (IN 128, art. 116, § 3º, I); confira o CNIS ${F ? "dele" : "dela"}`
      : titular==="pais" ? `dos pais: vale para o tempo em que ${trat} era ${F ? "solteira" : "solteiro"} e trabalhava com eles (IN 128, arts. 109, § 1º, V, e 116, § 3º, I)`
      : titular==="sogro" ? `no nome do sogro, que não é do grupo familiar (IN 128, art. 109, § 1º, IV): mostra que o sítio existe, mas não prova o trabalho ${dele}`
      : "no nome de outra pessoa: só vale o papel de quem é do grupo familiar (o cônjuge, os filhos solteiros, os pais de quem é solteiro)";
    if(/^(conjuge|sogro|outro)$/.test(titular)) est = "warn";
    if(rot==="Certidão de casamento" && lar && /lavrador|agricultor/.test(t)) txt += `; a profissão de lavrador ${outro} vale para ${trat}, e o "do lar" não tira o direito (IN 128, art. 116, § 3º, I)`;
    if(rot==="Escritura") txt += `; documento permanente: vale até a venda${venda ? `, feita em ${fmtBarra(venda)}` : ""} (IN 128, art. 116, § 2º, III)`;
    if(rot==="RGP" && pz.rgp){ const r = pz.rgp, h = r.homolog;
      txt = `registro de pescador${r.desde ? ` desde ${fmtBarra(r.desde)}` : ""}${r.situacao ? `, ${r.situacao}` : ""}${h ? `; homologado pela prefeitura em ${fmtBarra(h)}` : "; o papel não mostra a homologação da prefeitura"}${r.local ? `; pesca no ${r.local.replace(/\s*·\s*/g, ", em ")}` : ""}`;
      if(!h || somarAnos(h, 1) < hoje()) est = "warn"; }
    if(rot==="REAP" && pz.reap) txt = `relatório anual da pesca${pz.reap.ano ? ` de ${pz.reap.ano}` : ""}${pz.reap.entregue ? ` entregue em ${fmtBarra(pz.reap.entregue)}` : ", sem a data da entrega"}`;
    if(rot==="Notas de venda do pescado" && pz.notas){ const n = pz.notas.meses.length;
      txt = `nota de venda em ${plu(n, "mês", "meses")} dos 12 antes do defeso${n ? ` (${pz.notas.meses.map(k=>k.split("-").reverse().join("/")).join(", ")})` : ""}: o seguro-defeso pede 6`; est = n >= 6 ? "ok" : "warn"; }
    const pesca = /^(RGP|REAP|Notas de venda do pescado)$/.test(rot);
    if(rot==="Certidão de nascimento" && titular==="proprio" && nasc){ if(parto && nasc===parto) txt += "; é a certidão do bebê: mostra a profissão, mas não é papel de antes do parto"; }
    else if(parto && data && /^(proprio|conjuge)$/.test(titular) && !pesca){
      if(data >= parto){ est = "warn"; txt += `; é de ${fmtBarra(data)}, depois do parto (${fmtBarra(parto)}): não confirma o período antes dele`; }
      else txt += "; anterior ao parto"; }
    return {a, arq, rot, de, ate, data, titular, prof: !!(prof || producao || (lar && /lavrador|agricultor/.test(t))), est, txt,
      quando: fx ? `${de} a ${ate}` : data ? fmtBarra(data) : de ? (de===ate ? String(de) : `${de} a ${ate}`) : ""};
  });
}
// F235 · o emprego da cidade (ou o bico) de quem segue na roça ou na pesca: acima de 120 dias no ano tira a condição de segurado
// especial só daquele período (IN 128, arts. 112, IX, d, e 113, II, b), e a volta pede papel novo (art. 116, § 2º, V); abaixo, não
// tira. Para o seguro-defeso não há folga: emprego entre o fim do último defeso e o início do atual tira o direito daquele ano
function empregosNaRoca(c, g){
  const pz = pescaDoDossie(c), pi = piracemaDe(hoje()), at = papeisRuraisComAno(c).filter(p=>p.ativ);
  return ((g||{}).vinculos||[]).filter(v=>v.tipo!=="Benefício" && v.inicio && v.fim && !/Segurado Especial|Facultativ|Individual/i.test(v.tipo||"")).map(v=>{
    const a = isoBr(v.inicio), b = isoBr(v.fim); if(!a || !b) return null;
    const dias = {}; for(let y = +a.slice(0, 4); y <= +b.slice(0, 4); y++){ const i = a > `${y}-01-01` ? a : `${y}-01-01`, f = b < `${y}-12-31` ? b : `${y}-12-31`;
      dias[y] = Math.round((Date.parse(f+"T12:00:00") - Date.parse(i+"T12:00:00"))/864e5) + 1; }
    const altos = Object.entries(dias).filter(([, n])=>n > 120), onde = v.origem ? ` em ${tituloOrgao(v.origem)}` : "";
    const volta = at.filter(p=>p.de > +b.slice(0, 4)).sort((p, q)=>p.de - q.de)[0];
    const defeso = !!(pz.rgp && pi && b >= pi.depoisDoAnterior && a < pi.ini);
    const txt = `Emprego${onde}, de ${v.inicio} a ${v.fim} (${Object.entries(dias).map(([y, n])=>`${n} dias em ${y}`).join(", ")}): ` + (altos.length
      ? `passou de 120 dias no ano e tira a condição de segurado especial só nesse período, e não o resto da roça; a volta pede papel rural novo, de depois do emprego${volta ? `, e o dossiê tem: ${volta.rotLimpo.replace(/\s*\(.*?\)/g, "").toLowerCase()} de ${volta.de}` : ""}`
      : "abaixo de 120 dias no ano, não tira a condição de segurado especial para a aposentadoria")
      + (defeso ? `; para o seguro-defeso não há essa folga: emprego entre o fim do último defeso e o início deste (${fmtBarra(pi.ini)}) tira o direito deste ano` : "");
    return {v, txt, est: defeso ? "crit" : altos.length ? "warn" : "info", altos, defeso};
  }).filter(Boolean);
}
// F235 · a carteira de trabalho em papel (fotos ou cópia lida): um contrato por linha, com o empregador, a admissão e a saída
function lerCtpsTexto(t){
  const out = [], D = "(\\d{2}\\/\\d{2}\\/\\d{4})";
  for(const l of String(t||"").split("\n")){
    const m = l.match(new RegExp(`CONTRATO DE TRABALHO:?\\s*([^·\\n]+?)\\s*·.*?admiss[ãa]o:?\\s*${D}(?:.*?sa[íi]da:?\\s*${D})?`, "i"));
    if(m) out.push({empregador: m[1].trim(), admissao: m[2], saida: m[3] || ""});
  }
  return out;
}
const contratosDaCtps = cliId => docsDoDossie(cliId).filter(a=>/ctps|carteira de trabalho/i.test(a.nome||"") && a.texto)
  .flatMap(a=>(lidoDoAnexo(a, lerCtpsTexto, "ctps")||[]).map(k=>({...k, anexo:a})));
// F235 · o contrato da carteira do vínculo do CNIS: a mesma admissão ou todas as palavras do nome ("Metalúrgica" sozinha não casa Alfa com Gama)
function ctpsDoVinculo(cliId, v){
  const nm = s => dsa(s).replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w=>w.length > 3 && !/ltda|ficticia|ficticio/.test(w)), wv = nm(v.origem||"");
  const ks = contratosDaCtps(cliId);
  return ks.find(k=>v.inicio && k.admissao===v.inicio) || (wv.length ? ks.find(k=>{ const wk = nm(k.empregador); return wv.every(w=>wk.includes(w)); }) : null) || null;
}
// F235 · o emprego que só os papéis da época trazidos pelo cliente mostram (o holerite com a admissão, o aviso de dispensa com o fim),
// de empregador que não está no CNIS: o marco inicial e o final do início de prova da justificação administrativa (IN 128, art. 571, III)
function empregosDosPapeis(cliId){
  const c = D.cliPorId && D.cliPorId.get(cliId), vs = ((cnisDe(c||{})||{}).vinculos||[]).filter(v=>v.tipo!=="Benefício");
  const nm = s => dsa(s).replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w=>w.length > 3 && !/ltda|ficticia|ficticio|empresa/.test(w)), por = new Map();
  for(const a of docsDoDossie(cliId).filter(a=>a.texto && /trazid/i.test(a.nome||"") && !/ctps|carteira de trabalho|rescis|cnis|extrato|ppp|certid|laudo|relat|exame/i.test(a.nome||""))){
    const t = String(a.texto), emp = (t.match(/^\s*([A-ZÀ-Ý0-9][A-ZÀ-Ý0-9 .&'-]{3,}?(?:LTDA|S\.?A\.?|ME|EPP|EIRELI))\b/m)||[])[1]; if(!emp) continue;
    const we = nm(emp); if(!we.length || vs.some(v=>nm(v.origem||"").some(w=>we.includes(w)))) continue;
    const adm = (t.match(/admiss[ãa]o:?\s*(\d{2}\/\d{2}\/\d{4})/i)||[])[1];
    const fim = (t.match(/aviso pr[ée]vio[^\n]*?\d{2}\/\d{2}\/\d{4}\s*a\s*(\d{2}\/\d{2}\/\d{4})/i)||[])[1] || (t.match(/(?:dispensad[oa]|demitid[oa]|desligad[oa]|sa[íi]da:?)[^\n]{0,80}?(\d{2}\/\d{2}\/\d{4})/i)||[])[1];
    const k = we.join(" "), e = por.get(k) || {onde:tituloOrgao(emp), de:"", ate:"", docs:[], anexos:[]}; por.set(k, e);
    if(adm && (!e.de || isoBr(adm) < e.de)) e.de = isoBr(adm);
    if(fim && (!e.ate || isoBr(fim) > e.ate)) e.ate = isoBr(fim);
    e.docs.push(String(a.nome).split(" · ").pop().replace(/\.pdf$/i, "").replace(/\s*\(trazid[oa] pel[oa] client[ea]\)/i, "").trim()); e.anexos.push(a);
  }
  return [...por.values()].filter(e=>e.de && e.ate && e.ate > e.de).map(e=>({...e, docs:e.docs.join(" e "), meses:mesesEntreYm(ymDe(e.de), ymDe(e.ate))}));
}
// F235 · o que o INSS conta hoje e o que passa a contar com o acerto: o vínculo com pendência (PEXT) só entra depois de provado, e o
// contrato da carteira que falta no CNIS entra com a inclusão; os meses de alíquota reduzida contam na idade, e não no tempo
function contagemComAcerto(c, g, ct){
  if(!ct || !g) return null;
  const meses = v => { const a = ymDe(isoBr(v.inicio||"")), b = ymDe(isoBr(v.fim||"") || isoBr(fimDoMes(v.ultRemun||"")) || hoje()); return a && b && a <= b ? mesesEntreYm(a, b) : 0; };
  const vs = (g.vinculos||[]).filter(v=>v.tipo!=="Benefício" && vinculoPendente(v));
  const red = (g.vinculos||[]).filter(v=>v.tipo!=="Benefício" && (v.indicadores||[]).some(i=>/LC123|IREC-MEI|FBR/.test(String(i)))).reduce((n, v)=>n + meses(v), 0);
  // F302 · a contagem nova já sabe quais meses só vêm de pendência, sem contar duas vezes o mês coberto por outro vínculo
  const pext = ct.pendentes!=null ? ct.pendentes : vs.reduce((n, v)=>n + meses(v), 0), fora = ctpsForaDoCnis(c).filter(k=>k.admissao && k.saida);
  const mf = fora.reduce((n, k)=>n + mesesEntreYm(ymDe(isoBr(k.admissao)), ymDe(isoBr(k.saida))), 0);
  if(!pext && !mf) return null;
  const am = n => anosMeses(Math.floor(n/12), n%12), hojeN = ct.carencia - pext, comN = ct.carencia + mf;
  return {hoje:hojeN, com:comN, pext, mf, red,
    txt:`hoje o INSS conta ${plu(hojeN, "mês", "meses")} de contribuição (${am(hojeN)})${pext ? `, sem ${pext===1 ? "o mês" : `os ${pext} meses`} com pendência${vs.length ? ` (${vs.map(v=>`${tituloOrgao(v.origem||"")}, ${v.indicadores.filter(i=>RX_VIN_PEND.test(i)).join(", ")}`).join("; ")})` : ""}, que só ${pext===1 ? "entra" : "entram"} depois do acerto` : ""}; com o acerto${mf ? `, e a inclusão do que a carteira mostra (${fora.map(k=>tituloOrgao(k.empregador)).join(" e ")}, ${mf} meses)` : ""}, passam a ser ${comN} (${am(comN)})${red ? `; ${red} desses meses são de alíquota reduzida (MEI ou plano simplificado): contam na aposentadoria por idade, mas não na por tempo sem completar para 20 %` : ""}`};
}
// o contrato da carteira que o CNIS não tem (nem pelo nome, nem pela admissão)
function ctpsForaDoCnis(c){
  const vs = ((cnisDe(c)||{}).vinculos||[]).filter(v=>v.tipo!=="Benefício"), nm = s => dsa(s).replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w=>w.length > 3 && !/ltda|ficticia|ficticio/.test(w));
  return contratosDaCtps(c.id).filter(k=>{ const ws = nm(k.empregador);
    return !vs.some(v=>v.inicio===k.admissao || (ws.length && nm(v.origem||"").some(w=>ws.includes(w)))); });
}
// F235 · o requisito do acerto que compara a carteira com o CNIS (registrado depois do catálogo, no fim do script)
const REQ_CTPS = {id:"ctps_fora_cnis", rot:"A carteira de trabalho tem vínculo que não está no CNIS?", base:"IN 128/2022, art. 12, caput e § 2º, I (Anexo I-B), e art. 48, I e V", conf:"conferido", campos:[],
  mede:x=>{ if(!x.c) return {est:"info", txt:"sem a carteira no dossiê"};
    const fs = ctpsForaDoCnis(x.c); if(!contratosDaCtps(x.c.id).length) return {est:"info", txt:"a carteira de trabalho não está no dossiê: se houver vínculo fora do CNIS, peça a carteira e a rescisão"};
    if(!fs.length) return {est:"ok", txt:"os contratos da carteira estão todos no CNIS", fonte:"CTPS do cliente"};
    const meses = fs.reduce((n, k)=>n + (k.saida ? mesesEntreYm(ymDe(isoBr(k.admissao)), ymDe(isoBr(k.saida))) : 0), 0);
    return {est:"risco", txt:`${fs.map(k=>`${tituloOrgao(k.empregador)}, de ${k.admissao}${k.saida ? ` a ${k.saida}` : ""}`).join("; ")}: falta${fs.length > 1 ? "m" : ""} no CNIS (${plu(meses, "mês", "meses")}). Pedir a inclusão com a carteira e a rescisão, sem pedir benefício`, fonte:"CTPS do cliente"}; }};
// F235 · a CAT em papel que a família traz (cópia da empresa), que o leitor do Meu INSS não lê: a data, o tipo, o óbito,
// o empregador e a admissão
function catDoDossie(c){
  const a = docsDoDossie(c.id).find(a=>a.texto && /\bCAT\b|Comunica[çc][ãa]o de Acidente/i.test(`${a.nome} ${String(a.texto).slice(0, 300)}`) && /Data do acidente/i.test(a.texto));
  if(!a) return null;
  const t = String(a.texto).replace(/\s+/g, " "), pega = rx => ((t.match(rx)||[])[1]||"").trim();
  return {rot:String(a.nome||"").split(" · ").pop().replace(/\.pdf$/i, ""), anexo:a, data:isoBr(pega(/Data do acidente:\s*(\d{2}\/\d{2}\/\d{4})/i)),
    tipo:pega(/\bTipo:\s*(T[íi]pico|Trajeto|Doen[çc]a)/i), obito:/Houve [óo]bito:\s*Sim/i.test(t), admissao:isoBr(pega(/admitid[oa] em\s*(\d{2}\/\d{2}\/\d{4})/i)),
    empregador:pega(/Empregador:\s*([^·]+?)\s*·/i), emitente:pega(/Emitente:\s*([^·]+?)\s*·/i), registro:isoBr(pega(/CAT registrada em\s*(\d{2}\/\d{2}\/\d{4})/i))};
}
// F235 · a parte de quem pede cortada na pensão já concedida (a regra dos 4 meses), lida da carta, da comunicação de
// decisão ou da declaração de beneficiário
function cotaCortadaDe(c){
  const ws = dsa((c||{}).nome||"").split(/\s+/).filter(w=>w.length > 2); if(!c || !c.id || ws.length < 2) return null;
  const ordem = a => ["Cartas de concessao", "Processos administrativos", "Declaracao"].findIndex(p=>fonteDoDossie(a)[0].startsWith(p));
  for(const a of docsDoDossie(c.id).filter(a=>a.texto && ordem(a) >= 0).sort((p, q)=>ordem(p) - ordem(q))){
    const f = fonteDoDossie(a)[0], rot = /^Cartas/.test(f) ? "carta de concessão" : /^Processos/.test(f) ? "comunicação de decisão" : "declaração de beneficiário";
    for(const l of String(a.texto).split(/\n|(?<=\.)\s+(?=[A-ZÀ-Ý])/)){ const t = dsa(l), m = l.match(/(\d{1,2}) meses,?\s*at[ée]\s*(\d{2}\/\d{2}\/\d{4})/i);
      if(m && /cota/i.test(l) && t.includes(ws[0]) && ws.slice(1).some(w=>t.includes(w)))
        return {ate:isoBr(m[2]), meses:+m[1], rot, anexo:a, motivo:((l.match(/\(([^)]{5,120})\)/) || l.match(/porque ([^.(]{5,160})/) || [])[1]||"").trim()};
      const d = l.match(/cota pr[óo]pria cessada em (\d{2}\/\d{2}\/\d{4})/i);
      if(d && /requerente/i.test(l)) return {ate:isoBr(d[1]), meses:null, rot, anexo:a, motivo:""};
    } }
  return null;
}
function certidoesDoDossie(cliId){
  return docsDoDossie(cliId).filter(a=>a.texto && /certid|declara[çc][ãa]o d[oa] (?:CDP|unidade|pres[íi]dio)|pris[ãa]o|[óo]bito|nascimento|casamento|c[áa]rcere/i.test(a.nome||""))
    .map(a=>({...lidoDoAnexo(a, lerCertidaoTexto, "cert"), anexo:a})).filter(c=>c.rot);
}
function linhaClinica(cliId){
  return docsDoDossie(cliId)
    // F235 · o documento médico de qualquer pasta (ehDocMedico), e não só das pastas clínicas
    .filter(a=>ehDocMedico(a) && !/SABI - Sistema|Perícia Médica de Benefício|PROTOCOLO DE REQUERIMENTO/.test(a.texto||""))
    .map(a=>({...lidoDoAnexo(a, t=>itemClinico(a, t), "clin"), anexo:a}))
    .sort((x, y)=>String(y.data).localeCompare(String(x.data)));
}
// a área médica que os documentos pedem, para o agente da base que lê cada uma
const AREAS_CLINICAS = [
  [/^M(4\d|5[0-4])/, /coluna|lombar|cervical|h[ée]rnia de disco|discopatia|lombalgia|ci[áa]tic/i, "medico-coluna", "coluna"],
  [/^M75/, /ombro|manguito|supraespinh/i, "medico-ombro", "ombro"],
  [/^(G56|M65|M70|M77|S[56]\d)/, /punho|\bm[ãa]o\b|dedo|t[úu]nel do carpo|epicondil|tenossinov/i, "medico-membro-superior", "mão, punho e cotovelo"],
  [/^(M1[67]|M2[23]|M72|S[789]\d)/, /joelho|quadril|tornozelo|f[êe]mur|t[íi]bia|menisco/i, "medico-membro-inferior", "membro inferior"],
  [/^F([2-4]\d)/, /depress|ansiedade|bipolar|esquizo|p[âa]nico|psiqui/i, "medico-psiquiatra", "psiquiatria"],
  [/^(M0[56]|M15|M32|M79\.?7)/, /fibromialgia|artrite reumat|l[úu]pus/i, "medico-reumatologista", "reumatologia"],
  [/^H(1[6-9]|[2-5]\d|9[0-3])/, /vis[ãa]o|cegueira|glaucoma|catarata|surdez|perda auditiva|audiometria/i, "medico-sensorial", "visão e audição"],
  [/^(C\d{2}|A1[5-9]|A30|G35|G20|G4[05]|B2[0-4]|M45|M88|H54\.?0|I6\d|I2[0-5]|I50|N18|J4[34]|K74)/, RX_DOENCA_GRAVE, "medico-doencas-graves", "doenças graves"],
];
function areaClinica(itens){
  let melhor = null;
  for(const [rxCid, rxTxt, agente, rot] of AREAS_CLINICAS){
    // F235 · o CID pesa mais que a palavra: o AVC com "mão" no relatório não é da área de mão, punho e cotovelo
    const n = itens.filter(x=>x.cids.some(cd=>rxCid.test(cd)) || rxTxt.test(`${x.titulo} ${x.resumo}`)).length, s = n + itens.filter(x=>x.cids.some(cd=>rxCid.test(cd))).length;
    if(n && (!melhor || s > melhor.s)) melhor = {n, s, agente, rot};
  }
  return melhor;
}
// as fontes lidas do dossiê de um cliente; o anexo vai junto, para a origem
// aparecer ao lado do fato. A leitura se guarda pelo anexo e pelo tamanho do
// texto, porque a ficha repinta muitas vezes e o texto só muda numa coleta nova.
const _leituraCache = new Map();
function lidoDoAnexo(a, leitor, chave){
  const k = `${chave}:${a.id}:${(a.texto||"").length}`;
  if(!_leituraCache.has(k)) _leituraCache.set(k, leitor(a.texto));
  return _leituraCache.get(k);
}
function fontesDoDossie(cliId){
  const f = {cliId, caged:[], rais:[], laudos:[], cartas:[], extratos:[], processos:[], resumos:[], cats:[], ppps:[], seguros:[], cnpjs:[], redesim:null};
  // o mesmo laudo vem sozinho e dentro da cópia do processo; a mesma carta, em dois PDFs
  const visto = new Set(), novo = k => !visto.has(k) && visto.add(k);
  for(const a of docsDoDossie(cliId).filter(x=>x.texto)){
    const t = a.texto;
    if(/Relação de vínculos do trabalhador/i.test(t)) lidoDoAnexo(a, lerCagedTexto, "caged").forEach(x=>f.caged.push({...x, anexo:a}));
    if(/RELAÇÃO ANUAL DE INFORMAÇÕES SOCIAIS/i.test(t)) lidoDoAnexo(a, lerRaisTexto, "rais").forEach(x=>f.rais.push({...x, anexo:a}));
    if(/SABI - Sistema de Administração|Perícia Médica de Benefício de Incapacidade/i.test(t))
      lidoDoAnexo(a, lerLaudosTexto, "laudo").forEach(x=>{ if(novo(["laudo", x.exame, x.dii, x.dcb, x.resultado].join("|"))) f.laudos.push({...x, anexo:a}); });
    if(/CONCESSÃO|Carta de Concessão/.test(t)){ const x = lidoDoAnexo(a, lerCartaTexto, "carta"); if(x && novo("carta|"+x.nb)) f.cartas.push({...x, anexo:a}); }
    if(/Histórico de Créditos/i.test(t)) lidoDoAnexo(a, lerExtratoPagTexto, "hiscre").forEach(x=>f.extratos.push({...x, anexo:a}));
    if(/PROTOCOLO DE REQUERIMENTO/.test(t)){ const x = lidoDoAnexo(a, lerProcessoTexto, "pa"); if(x) f.processos.push({...x, anexo:a}); }
    if(/RESUMO DE DOCUMENTOS PARA C/i.test(t)){ const x = lidoDoAnexo(a, lerResumoInssTexto, "resumo"); if(x && novo(`resumo|${x.nb}|${x.der}`)) f.resumos.push({...x, anexo:a}); }
    if(/Comunica[çc][ãa]o de Acidente de Trabalho/i.test(t)){ const x = lidoDoAnexo(a, lerCatTexto, "cat"); if(x && novo(`cat|${x.numero||x.data}`)) f.cats.push({...x, anexo:a}); }
    if(/Perfil Profissiogr[áa]fico Previdenci[áa]rio/i.test(t)){ const x = lidoDoAnexo(a, lerPppTexto, "ppp"); if(x && x.riscos.length) f.ppps.push({...x, anexo:a}); }
    if(/^SEGURO-DESEMPREGO/.test(t)) lidoDoAnexo(a, lerSeguroDesempregoTexto, "sd").forEach(x=>{ if(novo("sd|"+x.numero)) f.seguros.push({...x, anexo:a}); });
    if(/^CNPJs VINCULADOS AO CPF/.test(t)){ const x = lidoDoAnexo(a, lerCnpjsTexto, "cnpj");
      if(x){ f.redesim = {consulta:x.consulta, anexo:a}; x.cnpjs.forEach(e=>{ if(novo("cnpj|"+soDig(e.cnpj))) f.cnpjs.push({...e, anexo:a}); }); } }
  }
  return f;
}
// Onda 1 · o vínculo que o CNIS deixou sem data de saída termina no ÚLTIMO
// DIA DO MÊS DA ÚLTIMA REMUNERAÇÃO (regra do escritório, 10.10.2026), para não
// correr até hoje; a ficha avisa que o fim foi presumido até o acerto. Com a
// última remuneração nos três meses anteriores à leitura, o vínculo está em
// curso (o empregador informa a remuneração no mês seguinte).
function vinculosSemSaida(g){
  const ref = (g && g.em) || hoje();
  const d = new Date(ref+"T12:00:00"); d.setMonth(d.getMonth()-3);
  const limite = `${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
  // leitura antiga sem a última remuneração no vínculo: vale a da análise
  const daAnalise = v => ((g.analise||{}).abertos||[]).find(a=>a.origem===v.origem && a.inicio===v.inicio) || {};
  // F235 · o cargo público (PRPPS) não se acerta no INSS, e o vínculo parado durante ou logo depois do auxílio-doença é o
  // contrato suspenso (ou o limbo): nenhum dos dois é erro do CNIS, e a tela nunca deve sugerir a baixa
  const incap = ((g && g.vinculos) || []).filter(v=>v.tipo==="Benefício" && /^(31|91|32|92)$/.test(String(v.especie||"")) && v.inicio);
  return ((g && g.vinculos) || []).filter(v=>v.aberto && v.tipo!=="Benefício" && TIPO_REMUN.test(v.tipo||""))
    .map(v=>{ const ultRemun = v.ultRemun || daAnalise(v).ultRemun || "";
      const servidor = (v.indicadores||[]).some(i=>/^PRPPS/.test(i)) || /regime pr[óo]prio/i.test(v.tipo||"");
      const ben = incap.find(b=>{ const ini = chaveComp(String(b.inicio).slice(3)), fim = b.fim ? isoBr(b.fim) : null;
        return (!ultRemun || chaveComp(ultRemun) <= ini) && (!fim || fim >= somarMeses(hoje(), -12)); });
      return {...v, ultRemun, fimPresumido: fimDoMes(ultRemun), emCurso: !!ultRemun && chaveComp(ultRemun) >= chaveComp(limite),
        servidor, suspenso: ben ? {especie:ben.especie, ativo:!ben.fim, fim:ben.fim||""} : null}; });
}
// a data que fecha o vínculo: o CAGED ou a RAIS do mesmo empregador (raiz do
// CNPJ) com a mesma admissão e um desligamento
function fechoDoVinculo(v, f){
  const r = raizCnpj(v.codigo); if(!r) return null;
  const mesmo = x => x.raiz===r && x.desligamento && (!v.inicio || !x.admissao || x.admissao===v.inicio);
  const c = f.caged.find(mesmo);
  if(c) return {data:c.desligamento, fonte:"CAGED", anexo:c.anexo, causa:""};
  const ra = f.rais.find(mesmo);
  if(ra) return {data:ra.desligamento, fonte:`RAIS de ${ra.ano}`, anexo:ra.anexo, causa:ra.causa};
  // F235 · a carteira de trabalho trazida também fecha o vínculo (o "nenhuma fonte do dossiê" negava a saída que ela mostra)
  const k = f.cliId && ctpsDoVinculo(f.cliId, v);
  if(k && k.saida) return {data:k.saida, fonte:"a carteira de trabalho", anexo:k.anexo, causa:""};
  return null;
}
// o quadro do vínculo sem saída, no passo do CNIS da triagem
function blocoAcertoVinculos(c){
  const vs = vinculosSemSaida(cnisDe(c)).filter(v=>!v.emCurso);
  if(!vs.length) return "";
  const f = fontesDoDossie(c.id);
  return `<div class="dossie-acerto">
    <b>Vínculos sem data de saída no CNIS</b>
    <p class="meio-sub">O CRM encerra cada um no último dia do mês da última remuneração, até o acerto.</p>
    <ul>${vs.map(v=>{ const fe = fechoDoVinculo(v, f);
      return `<li>${esc(v.origem||"empregador não lido")} · admissão ${esc(v.inicio||"?")} · ${
        v.fimPresumido ? `fim presumido em ${esc(v.fimPresumido)}` : "sem remuneração informada"} · ${
        fe ? `<span class="dossie-fecho">${esc(fe.fonte)} mostra desligamento em ${esc(fe.data)}</span>
          <button type="button" class="adr-link" onclick="abrirAnexo('${fe.anexo.id}')">ver</button>`
           : `<span class="meio-sub">nenhuma fonte do dossiê traz o desligamento</span>`}</li>`; }).join("")}</ul>
    <button type="button" class="tl-bt forte" onclick="abrirAcertoCnis('${c.id}')" title="Abrir atendimento de acerto de CNIS"><span aria-hidden="true">Acertar</span><span class="sr-only">Abrir atendimento de acerto de CNIS</span></button>
  </div>`;
}
// o serviço de acerto de CNIS: um atendimento (pré-caso CNIS) com a anotação
// do que falta e da prova que o dossiê já tem
async function abrirAcertoCnis(cliId){
  const c = D.cliPorId.get(cliId); if(!c) return;
  const vs = vinculosSemSaida(cnisDe(c)).filter(v=>!v.emCurso);
  if(!vs.length) return aviso("O CNIS lido não tem vínculo sem data de saída");
  const pcs = [...precasosDe(c)];
  let pc = pcs.find(p=>!p.so_lembrete && /^(CNIS|Acerto de CNIS)$/i.test(String(p.especie||"").trim()));
  const atend = (c.campos||{}).atendimento || [];
  if(pc && atend.some(n=>n.precaso_id===pc.id && /^Acerto de CNIS proposto pela leitura do dossiê/.test(n.texto||""))){
    aviso("O atendimento de acerto de CNIS já está aberto", false);
    return irSubCad("anotacoes");
  }
  if(!pc){ pc = {id:"pc_"+Date.now().toString(36), especie:"CNIS", natureza:"", marc:{}, honorarios:"", quem:eu.id, em:hoje()}; pcs.push(pc); }
  const f = fontesDoDossie(cliId);
  const texto = "Acerto de CNIS proposto pela leitura do dossiê. " + vs.map(v=>{ const fe = fechoDoVinculo(v, f);
    return `${v.origem||"Empregador"}, admissão em ${v.inicio||"?"}: o CNIS não tem data de saída (o CRM a presume em ${v.fimPresumido||"?"}); `
      + (fe ? `o ${fe.fonte} mostra desligamento em ${fe.data}${fe.causa?`, causa ${fe.causa}`:""}.`
            : "nenhuma fonte do dossiê traz o desligamento, e a prova sai da CTPS, do termo de rescisão ou do extrato analítico do FGTS."); }).join(" ");
  const nota = {id:crypto.randomUUID(), em:new Date().toISOString(), quem:(eu.nome||"").split(" ")[0],
    autor_id:eu.id, texto, origem:"app", precaso_id:pc.id};
  if(!await gravarPrecasos(cliId, pcs)) return;
  const campos = {...(c.campos||{}), atendimento:[...atend, nota]};
  try{
    await api(`/rest/v1/clientes?id=eq.${cliId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({campos})});
  }catch(e){ return aviso("Não consegui abrir o atendimento — tente de novo"); }
  c.campos = campos;
  aviso("Atendimento de acerto de CNIS aberto, com os vínculos e a prova do dossiê", false);
  irSubCad("anotacoes");
}
// Onda 1 · o CNIS e a declaração de benefícios do dossiê passam pelos
// leitores que o CRM já tem, uma vez por anexo, sem ninguém subir o PDF. O
// do dossiê só substitui o CNIS lido quando é mais novo; o CPF do documento é
// conferido com o da ficha antes de gravar.
async function pdfDoAnexo(a){
  const r = await fetch(await linkArquivo(a.caminho, 300));
  if(!r.ok) throw new Error("HTTP "+r.status);
  return r.blob();
}
let _lendoLeitores = null;
const _leitoresTentados = new Set();
async function lerLeitoresDoDossie(cliId){
  if(_lendoLeitores) return;
  const c = D.cliPorId.get(cliId); if(!c) return;
  const docs = docsDoDossie(cliId).slice().sort((a,b)=>String(b.criado_em||"").localeCompare(String(a.criado_em||"")));
  const arq = a => fonteDoDossie(a)[1];
  const cnis = docs.find(a=>/^CNIS$/i.test(fonteDoDossie(a)[0]) && /completo/i.test(arq(a)));
  const decl = docs.find(a=>/declara[çc][ãa]o de benefici/i.test(arq(a)));
  const pdf = triagemDe(c).pdf || {};
  const dia = a => String(a.criado_em||"").slice(0,10);
  const novo = (a, lido) => a && !_leitoresTentados.has(a.id) && (!lido || (lido.anexo_id!==a.id && dia(a) >= (lido.em||"")));
  const reler = cnis && !_leitoresTentados.has(cnis.id) && pdf.cnis && pdf.cnis.anexo_id===cnis.id && pdf.cnis.v!==CNIS_LEITOR_V;
  if(!novo(cnis, pdf.cnis) && !reler && !novo(decl, pdf.declaracao)) return;
  _lendoLeitores = cliId;
  try{
    if(novo(cnis, pdf.cnis) || reler){
      _leitoresTentados.add(cnis.id);
      try{
        const lido = lerCnisPdf(await itensDoPdf(await pdfDoAnexo(cnis)));
        const conf = conferePdfComCliente(lido, c);
        if(!(lido.indicadores.length || lido.filiado.nit || lido.ehExtrato)) console.warn("dossiê: CNIS não reconhecido", cnis.nome);
        else if(!conf.ok) aviso("CNIS do dossiê: " + conf.aviso, true);
        else await gravarCnisLido(cliId, lido, cnis, {dossie:true, releitura:reler});
      }catch(e){ console.warn("dossiê: CNIS não lido", e); }
    }
    const pdf2 = triagemDe(D.cliPorId.get(cliId)).pdf || {};
    if(novo(decl, pdf2.declaracao)){
      _leitoresTentados.add(decl.id);
      try{
        const lido = lerDeclaracaoPdf(await itensDoPdf(await pdfDoAnexo(decl)));
        const conf = conferePdfComCliente(lido, c);
        if(!(lido.beneficios.length || lido.cpf)) console.warn("dossiê: declaração não reconhecida", decl.nome);
        else if(!conf.ok) aviso("Declaração do dossiê: " + conf.aviso, true);
        else await gravarDeclaracaoLida(cliId, lido, {auto:true, anexo:decl});
      }catch(e){ console.warn("dossiê: declaração não lida", e); }
    }
  } finally { _lendoLeitores = null; }
}
// o NB lido da declaração de benefícios, quando o caso ainda não tem NB:
// sugestão, porque ninguém subiu o PDF à mão
function nbSugeridoDoDossie(c, ks){
  const dec = (triagemDe(c).pdf||{}).declaracao;
  if(!dec || !dec.auto || !(dec.beneficios||[]).length) return null;
  const k = (ks||[]).find(x=>x.fase!=="encerrado") || (ks||[])[0];
  if(!k || k.nb) return null;
  const ativos = dec.beneficios.filter(b=>!/CESSAD|SUSPENS|INDEFER/i.test(b.situacao||""));
  const alvo = ativos[0] || dec.beneficios[0];
  return alvo && alvo.nb ? {k, nb:alvo.nb, situacao:alvo.situacao||""} : null;
}
async function gravarNbDoDossie(casoId, nb){
  const k = D.casoPorId.get(casoId); if(!k) return;
  try{ await patchCaso(casoId, {nb}); }catch(e){ return aviso("Não consegui gravar o NB — tente de novo"); }
  k.nb = nb;
  try{ await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({caso_id:casoId, autor_id:eu.id, texto:`NB ${nb} gravado no caso, lido da declaração de benefícios do dossiê.`})}); }catch(e){}
  aviso(`NB ${nb} gravado no caso`, false); repintarFicha();
}
// Onda 2 · o caso de um documento: o do mesmo NB; sem NB no documento ou sem
// caso com ele, o caso aberto que ainda não tem NB
function casoDoNb(ks, nb){
  const d = soDig(nb);
  return (d && ks.find(k=>nbsDoCaso(k).some(x=>soDig(x)===d))) || ks.find(k=>k.fase!=="encerrado" && !nbsDoCaso(k).length) || null;
}
// a DCB mais nova que o dossiê conhece para o caso: a da decisão ou do laudo
// mais recente; o extrato de pagamento só quando nada mais a traz
function dcbDoDossie(f, k, ks){
  const outros = new Set(ks.filter(x=>x!==k).flatMap(x=>nbsDoCaso(x).map(soDig)));
  const meu = nb => { const d = soDig(nb); return nbsDoCaso(k).some(x=>soDig(x)===d) || (!nbsDoCaso(k).length && !outros.has(d)); };
  const c = [];
  f.laudos.forEach(l=>{ if(l.dcb && meu(l.nb)) c.push({dcb:l.dcb, em:l.exame, onde:`no laudo médico de ${l.exame}`, fonte:"Laudo médico", anexo:l.anexo}); });
  f.processos.forEach(p=>p.comunicacoes.forEach(d=>{ if(d.dcb && meu(d.nb||p.nb)) c.push({dcb:d.dcb, em:p.atualizado,
    onde:`na comunicação de decisão${p.entrada ? ` do pedido de ${p.entrada}` : ""}`, fonte:"Comunicação de decisão", anexo:p.anexo}); }));
  f.extratos.forEach(e=>{ if(e.dcb && meu(e.nb)) c.push({dcb:e.dcb, em:"", onde:"no extrato de pagamento", fonte:"Extrato de pagamento", anexo:e.anexo}); });
  return c.sort((a,b)=>isoBr(b.em).localeCompare(isoBr(a.em)) || isoBr(b.dcb).localeCompare(isoBr(a.dcb)))[0] || null;
}
// decadência da revisão (art. 103 da Lei 8.213/91): dez anos do dia 1º do mês
// seguinte ao da primeira prestação recebida. Sem o extrato que a mostra, conta
// do mês da concessão, que é o mais cedo possível; a data devolvida é o último
// dia em que a revisão ainda pode ser pedida.
function decadenciaDe(ca, extratos){
  // F235 · a mesma conta do requisito da revisão: 10 anos do 1º dia do mês seguinte ao primeiro pagamento; sem ele, a DIP (a mais cedo)
  const dip = isoBr(ca.dip||""), ddb = isoBr(ca.concessao||""), dib = isoBr(ca.dib||"");
  const p = primeiroPagamentoDe((extratos||[]).filter(x=>x.nb===ca.nb), dip || dib, ddb, (ca.anexo||{}).cliente_id, ca.nb);
  const [ref, base] = p ? [p.iso, `primeiro pagamento em ${fmtBarra(p.iso)}, no ${p.onde}`]
    : dip ? [dip, `contado da DIP, ${fmtBarra(dip)}, a conta mais segura sem o extrato do primeiro pagamento`]
    : ddb ? [ddb, `contado da concessão, ${fmtBarra(ddb)}, sem a DIP nem o primeiro pagamento`] : dib ? [dib, `contado da DIB, ${fmtBarra(dib)}, só estimativa`] : [];
  if(!ref) return null;
  const fim = r => somarAnos(somarMeses(r.slice(0, 7)+"-01", 1), 10), ate = fim(ref), cedo = p && dip && fim(dip) < ate ? fim(dip) : null;
  return {ate, cedo, base: base + (cedo ? `; pela DIP (${fmtBarra(dip)}) daria ${fmtBarra(cedo)}: para agir, use essa` : "")};
}
// as ações do quadro: cada uma grava no caso e deixa o andamento com a origem
async function andamentoDoDossie(casoId, texto){
  try{ await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({caso_id:casoId, autor_id:eu.id, texto})}); }catch(e){}
}
async function gravarDcbDoDossie(casoId, iso, onde){
  try{ await salvarDCB(casoId, iso); }catch(e){ return aviso("Não consegui gravar a DCB — tente de novo"); }
  await andamentoDoDossie(casoId, `DCB ${fmt(iso)} gravada no caso, lida ${onde} do dossiê.`);
}
async function marcarPrazoDoDossie(casoId, fatal, texto){
  await marcarTarefaComPrazo(casoId, fatal);
  await andamentoDoDossie(casoId, `⏰ Prazo fatal ${fmt(fatal)}: ${texto}, lido da cópia do processo do dossiê.`);
  repintarFicha();
}
// F235 · o desconto do extrato: o crédito líquido abaixo da renda mensal (em geral o imposto de renda; o informe confirma)
function descontoDoExtrato(e){
  const num = s => +String(s||"").replace(/\./g, "").replace(",", ".") || 0, mr = num(e.mr), cs = (e.creditos||[]).filter(x=>x.valor && x.comp);
  if(!mr || !cs.length) return null;
  // F235 · o crédito do mês da DIB é proporcional aos dias, e não desconto
  const dibM = String(e.dib||"").slice(3), k = x => chaveComp(x.comp), com = cs.filter(x=>num(x.valor) < mr - 0.5 && x.comp!==dibM).sort((a, b)=>k(a) < k(b) ? -1 : 1);
  if(!com.length) return null;
  const ult = com[com.length-1], parou = cs.filter(x=>num(x.valor) >= mr - 0.5 && k(x) > k(ult)).sort((a, b)=>k(a) < k(b) ? -1 : 1)[0];
  return {ult:ult.comp, parou: parou ? parou.comp : "", valor: mr - num(ult.valor), atual: !parou};
}
// F235 · o laudo "capaz" com a lesão consolidada é o começo do auxílio-acidente, e não o fim da conversa; o histórico que fala
// no trabalho prova o acidente do trabalho que saiu sem CAT
const RX_TRAB_DZ = /acidente (?:de|do) trabalho|no trabalho\b|em ambiente de trabalho|de trajeto/i;
const trabalhoNoDossie = (c, fd) => (fd.laudos||[]).some(l=>RX_TRAB_DZ.test(l.historia||"") && l.nexo!=="Sim")
  || linhaClinica(c.id).some(i=>RX_TRAB_DZ.test(`${i.titulo} ${i.resumo}`) && !/fora do trabalho/i.test(i.resumo||""));
function laudoCapazConsolidado(ul, cid){
  const h = String(ul.historia||""), ane = /anexo iii/i.test(h); if(ul.resultado!=="capaz" || !/consolidad/i.test(h)) return "";
  return `Perícia de ${ul.exame||"data não lida"}: lesão consolidada; o perito disse capaz${ane ? " e fora do Anexo III" : ""}${cid}. Para o auxílio-acidente isso não impede: ele não exige incapacidade, basta a sequela reduzir a capacidade para o trabalho de sempre, em qualquer grau (Tema 416 STJ)${ane ? ", e o Anexo III é só exemplo (IN 128, art. 354, § 1º)" : ""}`;
}
function laudoTrabalho(ul){
  const h = String(ul.historia||""); if(!RX_TRAB_DZ.test(h) || ul.nexo==="Sim") return "";
  const fr = ((h.match(/[^.]*(?:acidente (?:de|do) trabalho|no trabalho\b|em ambiente de trabalho|de trajeto)[^.]*/i)||[])[0]||"").trim();
  return fr ? `; o histórico do laudo diz: "${fr}"${ul.nexo==="Não" ? ", mas o perito marcou nexo técnico Não" : ""}` : "";
}
// os fatos dos laudos, das cartas, do extrato e da comunicação de decisão
function itensDaOnda2(f, ks){
  const out = [], hj = hoje();
  const nbTxt = nb => nb ? ` do NB ${fmtNb(nb)}` : "";
  const minusc = t => t.charAt(0).toLowerCase() + t.slice(1);
  for(const p of f.processos){
    // a última comunicação da cópia, se contrária, abre o recurso. O prazo
    // conta da última atualização do pedido concluído, que é o mais cedo que a
    // ciência pode ter ocorrido; a "Data:" da comunicação é a da emissão da cópia
    const k = casoDoNb(ks, p.nb), d = p.comunicacoes[p.comunicacoes.length-1];
    if(!k || !d || !d.contra) continue;
    const conc = /^Conclu/i.test(p.status) ? p.atualizado : "";
    const fatal = conc ? contarPrazo(isoBr(conc), PRAZOS_CATALOGO.find(x=>x.id==="crps")) : "";
    if(fatal && (fatal<hj || k.prazo===fatal)) continue;
    const dec = `${p.servico || "Pedido"}${p.entrada ? ` de ${p.entrada}` : ""}${nbTxt(d.nb||p.nb)}: ${minusc(d.decisao.toLowerCase())}${d.motivo ? ", " + minusc(d.motivo) : ""}`;
    out.push({id:"recurso", alerta:!!fatal, anexo:p.anexo.id, fonte:"Comunicação de decisão", fatal,
      texto: fatal ? `Recurso ao CRPS até ${fmtBarra(fatal)} (${faltamTxt(fatal)}). ${dec}. Os 30 dias contam da conclusão do pedido (${conc}), a data mais cedo em que a decisão pode ter sido vista`
        : `${dec}. A cópia não traz a data da conclusão do pedido: confira no Meu INSS quando a decisão foi vista, para contar os 30 dias do recurso ao CRPS`,
      acao: fatal ? {rot:"Marcar prazo do recurso", js:`marcarPrazoDoDossie('${k.id}','${fatal}','${escJs(`recurso ao CRPS contra a decisão do pedido concluído em ${conc}`)}')`} : null});
  }
  // a DCB só entra no caso enquanto vale: a que já passou é assunto do recurso ou de pedido novo
  for(const k of ks.filter(k=>k.fase!=="encerrado" && ehIncapacidade(k))){
    const x = dcbDoDossie(f, k, ks), iso = x && isoBr(x.dcb);
    if(x && iso>=hj && iso!==k.dcb) out.push({id:"dcb", anexo:x.anexo.id, fonte:x.fonte,
      texto:`DCB em ${x.dcb}, fixada ${x.onde}; ${k.dcb ? `o caso está com ${fmtBarra(k.dcb)}` : "o caso ainda não tem DCB"}. A prorrogação pode ser pedida a partir de ${fmtBarra(somaDias(iso, -DIAS_PRORROG))}`,
      acao:{rot:"Gravar DCB no caso", js:`gravarDcbDoDossie('${k.id}','${iso}','${escJs(x.onde)}')`}});
  }
  for(const ca of f.cartas){
    const dec = decadenciaDe(ca, f.extratos); if(!dec) continue;
    const dias = diasAte(dec.cedo || dec.ate);
    out.push({id:"decadencia", alerta: dias>=0 && dias<=365, anexo:ca.anexo.id, fonte:"Carta de concessão",
      texto:`Carta de concessão${nbTxt(ca.nb)}${ca.especie?`, ${ca.especie.toLowerCase()}`:""}: DIB ${ca.dib||"não lida"}${ca.rmi?`, RMI R$ ${ca.rmi}`:""}. `
        + (dias<0 ? `A revisão do ato de concessão decaiu em ${fmtBarra(dec.ate)}` : `A revisão do ato de concessão pode ser pedida até ${fmtBarra(dec.ate)}`)
        + ` (art. 103 da Lei 8.213/91; ${dec.base})`});
  }
  const ul = f.laudos.slice().sort((a,b)=>isoBr(b.exame).localeCompare(isoBr(a.exame)))[0];
  if(ul){
    // F235 · a negativa posterior do mesmo NB (a prorrogação negada) tira o laudo do lado "a favor"
    const neg = f.processos.find(p=>{ const d = p.comunicacoes[p.comunicacoes.length-1]; return d && d.contra && soDig(d.nb||p.nb)===ul.nb && isoBr(p.entrada||"") >= isoBr(ul.exame||""); });
    const cid = ul.cid ? ` (CID ${ul.cid}${ul.cidDesc ? `, ${ul.cidDesc.toLowerCase()}` : ""})` : "";
    out.push({id:"laudo", anexo:ul.anexo.id, fonte: ul.sistema==="SABI" ? "Laudo do SABI" : "Laudo da Perícia Médica Federal",
      est: ul.resultado==="capaz" || neg ? "warn" : ul.resultado==="incapaz" ? "ok" : "info",
      texto: ul.resultado==="incapaz" ? `Na perícia de ${ul.exame||"data não lida"}, o INSS reconheceu a incapacidade${ul.dii ? ` desde ${ul.dii}` : ""}${cid}${ul.dcb ? (isoBr(ul.dcb) < hoje() ? `, só até ${ul.dcb}` : `, com fim marcado para ${ul.dcb}`) : ""}${neg ? `; depois negou a continuação${neg.atualizado ? ` em ${neg.atualizado}` : ""}` : ""}${laudoTrabalho(ul)}`
        : ul.resultado==="capaz" ? (laudoCapazConsolidado(ul, cid) || `Na perícia de ${ul.exame||"data não lida"}, o INSS não reconheceu a incapacidade${cid}`) : `Laudo do INSS de ${ul.exame||"data não lida"}: resultado não lido${cid}`});
  }
  return out;
}
// O QUE O DOSSIÊ JÁ DIZ: o quadro da Análise de Direito e da triagem. Cada
// linha traz o fato e o documento de origem; o botão é o que muda o caso.
function itensDoDossie(c, ks){
  ks = ks || [];
  const f = fontesDoDossie(c.id);
  const out = itensDaOnda2(f, ks);
  const vs = vinculosSemSaida(cnisDe(c)).filter(v=>!v.emCurso && !v.servidor && !v.suspenso);
  if(vs.length){
    const fechados = vs.filter(v=>fechoDoVinculo(v, f)).length;
    out.push({id:"vinculos", texto:`${vs.length} vínculo${vs.length>1?"s":""} sem data de saída no CNIS, encerrado${vs.length>1?"s":""} pelo CRM na última remuneração`
        + (fechados ? `; ${vs.map(v=>[v, fechoDoVinculo(v, f)]).filter(([, fe])=>fe).map(([v, fe])=>`${fe.fonte.replace(/^a /, "")} mostra a saída de ${tituloOrgao(v.origem||"")} em ${fe.data}`).join("; ")}` : "; nenhuma fonte do dossiê traz o desligamento"),
      fonte:"CNIS", acao:{rot:"Abrir atendimento de acerto de CNIS", js:`abrirAcertoCnis('${c.id}')`}});
  }
  const nb = nbSugeridoDoDossie(c, ks);
  if(nb) out.push({id:"nb", texto:`NB ${nb.nb}${nb.situacao?` (${nb.situacao.toLowerCase()})`:""} lido da declaração de benefícios; o caso ainda não tem NB`,
    fonte:"Declaração de benefícios", acao:{rot:"Gravar NB no caso", js:`gravarNbDoDossie('${nb.k.id}','${escJs(nb.nb)}')`}});
  // o prazo que corre primeiro; o que só informa por último
  const ORDEM = ["recurso", "dcb", "decadencia", "vinculos", "nb", "laudo"];
  return out.sort((a,b)=>(ORDEM.indexOf(a.id) + (a.id==="decadencia" && !a.alerta ? 3 : 0)) - (ORDEM.indexOf(b.id) + (b.id==="decadencia" && !b.alerta ? 3 : 0)));
}
function quadroDossie(c, ks){
  const its = itensDoDossie(c, ks);
  if(!its.length) return "";
  return `<section class="adr-card ad-q-dossie" aria-labelledby="adr-t-dossie">
    <h2 class="adr-h" id="adr-t-dossie">O que o dossiê já diz</h2>
    <ul class="dossie-fatos">${its.map(x=>`<li data-fato="${x.id}"${x.alerta?' class="alerta"':""}><span>${esc(x.texto)}</span>
      <span class="dossie-orig">${esc(x.fonte)}${x.anexo?` <button type="button" class="adr-link" onclick="abrirAnexo('${x.anexo}')">ver</button>`:""}</span>
      ${x.acao?`<button type="button" class="tl-bt" onclick="${x.acao.js}">${esc(x.acao.rot)}</button>`:""}</li>`).join("")}</ul>
    <button type="button" class="adr-link" onclick="irSubCad('mapa')" title="Abrir o mapa do dossiê"><span aria-hidden="true">Mapa</span><span class="sr-only">Abrir o mapa do dossiê</span></button>
  </section>`;
}
// ═══════════════════════════════════════════════════════════════════════
// ONDA 2b · O MAPA DO DOSSIÊ — o funil por espécie, em organograma
// ═══════════════════════════════════════════════════════════════════════
// Estudo "Mapa do dossiê: o funil por espécie" (10.10.2026). O mapa abre na
// família da espécie do caso (PONTOS_ESPECIE) e mostra só o que ela usa: os
// prazos abertos à frente, os pontos da família como ramos e, no pé,
// recolhido, o que a espécie não usa. A anotação de cada ramo é a nota do
// ponto na triagem, e por isso já aparece na Análise de Direito com o nome de
// quem escreveu. MAPA_FUNIL é a matriz do estudo (D decide, A ajuda; grupo
// fora das duas fica fora do mapa) e MAPA_PONTOS diz que grupo de fatos
// alimenta cada ponto.
const MAPA_FUNIL = {
  tempo:        {D:"idade contrib minimo vinculo", A:"beneficios processo ppp rural cadunico ctc cnpj"},
  rural:        {D:"idade contrib rural cnpj", A:"minimo vinculo beneficios processo"},
  especial:     {D:"idade contrib vinculo ppp", A:"minimo beneficios processo"},
  incapacidade: {D:"contrib minimo qualidade laudo medicos processo", A:"idade vinculo beneficios carta ppp cat rural cadunico cnpj"},
  b94:          {D:"qualidade beneficios laudo medicos processo cat", A:"contrib vinculo carta ppp rural cnpj"},
  pensao:       {D:"idade beneficios certidoes", A:"processo rural"},
  bpc:          {D:"idade beneficios cadunico laudo medicos", A:"contrib vinculo processo cnpj"},
  maternidade:  {D:"qualidade certidoes", A:"contrib minimo vinculo beneficios processo rural cadunico cnpj"},
  revisao:      {D:"contrib carta", A:"idade minimo vinculo beneficios processo ppp rural ctc"},
  cnis:         {D:"contrib minimo vinculo", A:"qualidade beneficios processo ppp rural cadunico ctc cnpj"},
  crps:         {D:"processo", A:"idade contrib minimo vinculo qualidade beneficios laudo medicos carta ppp cat rural certidoes cadunico ctc cnpj"},
};
// o CNPJ no CPF: descaracteriza o segurado especial e indica renda no BPC
const MAPA_PONTOS = {
  bpc_renda:"cadunico contrib vinculo cnpj", bpc_grupo:"cadunico certidoes", bpc_cadunico:"cadunico", bpc_avaliacao:"laudo medicos",
  crp_prazo:"processo", crp_motivo:"processo",
  esp_ppp:"ppp", esp_epi:"ppp", esp_ltcat:"ppp", esp_conversao:"idade contrib vinculo",
  inc_dii:"laudo medicos", inc_carencia:"contrib minimo", inc_qualidade:"qualidade vinculo", inc_pericia:"processo",
  b94_sequela:"laudo medicos", b94_nexo:"cat ppp", b94_acumulacao:"beneficios",
  rur_prova:"rural cnpj", rur_auto:"rural", rur_genero:"certidoes rural",
  dep_prova:"certidoes", dep_cota:"idade beneficios",
  apo_der:"idade contrib", apo_minimo:"minimo", apo_reciproca:"ctc",
  mat_qualidade:"qualidade vinculo certidoes", mat_carencia:"contrib", mat_rural:"rural",
  rev_decadencia:"carta", rev_tese:"beneficios", rev_calculo:"contrib",
  cni_indicador:"vinculo ctc", cni_prova:"vinculo",
};
// CONSULTA DO CNPJ · a base pública do CNPJ.ws, a mesma do site interno (aba
// CNPJ): a abertura, a situação com a data, o MEI e o CNAE, que a lista da
// Redesim não traz. Sai só o número do CNPJ, um por clique de quem atende (a
// base limita as consultas por minuto), e a resposta fica só nesta sessão.
const _cnpjWs = new Map();
async function consultarCnpjWs(cnpj){
  const d = soDig(cnpj);
  if(d.length!==14 || (_cnpjWs.get(d)||{}).carregando) return;
  _cnpjWs.set(d, {carregando:true}); repintarSeLivre();
  let x;
  try{
    const r = await fetch("https://publica.cnpj.ws/cnpj/"+d);
    x = r.status===429 ? {erro:"a base pública limitou as consultas; tente de novo em um minuto"}
      : r.status===404 ? {erro:"o CNPJ não está na base pública"}
      : !r.ok ? {erro:`a consulta falhou (HTTP ${r.status})`} : {dados: await r.json()};
  }catch(e){ x = {erro:"a base pública não respondeu"}; }
  _cnpjWs.set(d, x); repintarSeLivre();
}
// o que decide no previdenciário, na ordem: abertura, situação, MEI, atividade
function resumoCnpjWs(j){
  const e = j.estabelecimento||{}, s = j.simples||{}, at = e.atividade_principal||{};
  const mei = s.data_opcao_simei ? `MEI desde ${fmtBarra(s.data_opcao_simei)}${s.data_exclusao_simei ? `, excluído em ${fmtBarra(s.data_exclusao_simei)}` : ", sem exclusão"}`
    : (s.simei===true || /^sim$/i.test(s.simei||"")) ? "MEI" : "sem opção pelo MEI";
  return [e.data_inicio_atividade ? `aberto em ${fmtBarra(e.data_inicio_atividade)}` : "",
    e.situacao_cadastral ? `situação ${String(e.situacao_cadastral).toLowerCase()}${e.data_situacao_cadastral ? ` desde ${fmtBarra(e.data_situacao_cadastral)}` : ""}` : "",
    mei, (at.subclasse||at.id) ? `CNAE ${at.subclasse||at.id}${at.descricao ? ` (${at.descricao.toLowerCase()})` : ""}` : "",
    ((j.natureza_juridica||{}).descricao||"").toLowerCase()].filter(Boolean).join("; ");
}
// os fatos que o CRM já lê, cada um com o grupo da matriz e o estado:
// crit (prazo ou impedimento), warn (atenção), ok (cumprido), info
function fatosDoMapa(c, ks, fam){
  const GRUPO = {recurso:"processo", dcb:"processo", vinculos:"vinculo", nb:"beneficios", laudo:"laudo", decadencia:"carta"};
  const out = itensDoDossie(c, ks).map(x=>({...x, grupo:GRUPO[x.id]||"processo", prazo:x.id==="recurso",
    est: x.id==="recurso" ? (x.alerta?"crit":"warn") : x.id==="decadencia" ? (x.alerta?"crit":"info")
      : x.id==="laudo" ? (x.est || (/não reconhecida/.test(x.texto) ? "warn" : /reconhecida/.test(x.texto) ? "ok" : "info"))
      : x.id==="nb" ? "info" : "warn"}));
  const ul = fontesDoDossie(c.id).laudos.slice().sort((a,b)=>isoBr(b.exame).localeCompare(isoBr(a.exame)))[0];
  if(ul && ul.isencao==="Sim") out.push({grupo:"contrib", est:"ok", fonte:"Laudo médico", anexo:ul.anexo.id,
    texto:`O laudo médico de ${ul.exame} marca a isenção de carência`});
  const nasc = dnIso(c.dn), anos = idadeDe(c.dn);
  if(anos!=null) out.push({grupo:"idade", est:"info", fonte:"Ficha", texto:`${anos} anos, nascimento em ${fmtBarra(nasc)}`});
  const g = cnisDe(c), an = g && g.analise;
  if(an && (an.abaixo||[]).length) out.push({grupo:"minimo", est:"warn", fonte:"CNIS",
    texto:`${an.abaixo.length} competência${an.abaixo.length>1?"s":""} abaixo do mínimo (${an.abaixo.slice(0,3).map(x=>x.comp).join(", ")}${an.abaixo.length>3?" e outras":""}), fora da conta sem complementação`});
  const lei = p => triagemLeitura(p, c, ks);
  const ind = lei("indicadores");
  if(ind.estado==="atencao") out.push({grupo:"vinculo", est:"warn", fonte:"CNIS", texto:ind.txt});
  const ben = lei("beneficio");
  if(ben.estado) out.push({grupo:"beneficios", est: ben.estado==="atencao" ? "warn" : "ok", fonte:"CNIS", texto:ben.txt});
  const vin = lei("vinculo");
  if(vin.estado) out.push({grupo:"qualidade", est: vin.estado==="atencao" ? "warn" : "ok", fonte:"CNIS", texto:vin.txt});
  const fd = fontesDoDossie(c.id);
  const gr = g && (g.vinculos||[]).length ? calcularGraca(g.vinculos, contribSemPerda(g), !!(triagemDe(c).graca||{}).desempregado, an && an.abaixo, an && an.contagem && an.contagem.periodos, fd.seguros) : null;
  if(gr) out.push({grupo:"qualidade", est: gr.semLimite ? "ok" : gr.vencida ? "crit" : "ok", fonte:"CNIS",
    texto: gr.semLimite ? "Qualidade mantida sem limite de prazo, porque há benefício em manutenção"
      : `Qualidade mantida até ${fmtBarra(gr.mantidaAte)}, ${gr.vencida ? "perdida" : "com perda"} em ${fmtBarra(gr.perda)} (${gr.base} meses a partir de ${gr.ultima})`
        + (gr.complementar ? `; complementada a competência ${gr.complementar.comp}, iria até ${fmtBarra(gr.complementar.mantidaAte)}` : "")});
  const fs = fatoSeguro(gr, fd.seguros);
  if(fs) out.push({grupo:"qualidade", fonte:"Seguro-desemprego", ...fs});
  // F235 · as certidões que o cliente trouxe dão o sinal e o prazo: óbito (pensão), prisão (auxílio-reclusão), nascimento (salário-maternidade)
  const mais = (iso, d) => new Date(Date.parse(iso+"T12:00:00") + d*864e5).toISOString().slice(0,10), hj = hoje();
  // F235 · o prazo do cartão é o da Análise de Direito: 90 dias do fato (180 para o filho menor de 16); e só acende a pensão
  const prazoDep = (fato, oque) => { const lim = mais(fato, 90), lf = mais(fato, 180), nm = (typeof depFilhosDe==="function" ? depFilhosDe(c) : [])
      .filter(k=>{ const id = k.nasc ? idadeEm(k.nasc, fato) : k.idadeFato; return id!=null && id < 16 && fato >= "2019-01-18"; }).map(k=>k.curto || fraseClinica(k.nome).split(" ")[0]).join(" e ");
    if(lim >= hj) return {aberto:true, txt:`pedir até ${fmtBarra(lim)} (${faltamTxt(lim)}) para receber desde ${oque}${nm ? `; ${nm}, menor de 16: até ${fmtBarra(lf)}` : ""}`};
    if(nm && lf >= hj) return {aberto:true, txt:`para ${nm}, menor de 16, pedir até ${fmtBarra(lf)} (${faltamTxt(lf)}) para receber desde ${oque}; para quem pede, os 90 dias acabaram em ${fmtBarra(lim)}`};
    return {aberto:false, txt:`os 90 dias para receber desde ${oque} acabaram em ${fmtBarra(lim)}: paga desde o pedido`}; };
  for(const ce of certidoesDoDossie(c.id)){
    if(ce.obito){ const p = prazoDep(ce.obito, "o óbito");
      out.push({grupo:"certidoes", so:"pensao", est: p.aberto ? "crit" : "warn", fonte:"Certidão de óbito", anexo:ce.anexo.id, prazo:p.aberto,
        texto:`Pensão: óbito em ${fmtBarra(ce.obito)}${ce.causa ? ` (${ce.causa.toLowerCase()})` : ""}; ${p.txt}`}); }
    if(ce.prisao){ const p = prazoDep(ce.prisao, "a prisão");
      out.push({grupo:"certidoes", so:"pensao", est: p.aberto ? "crit" : "warn", fonte:cap1(ce.rot), anexo:ce.anexo.id, prazo:p.aberto,
        texto:`Auxílio-reclusão: preso desde ${fmtBarra(ce.prisao)}${ce.regime ? `, regime ${ce.regime}` : ""}; ${p.txt}`}); }
    if(ce.nascimento && ce.nascimento >= somarMeses(hj, -60) && ce.nascimento !== dnIso(c.dn))
      out.push({grupo:"certidoes", est:"ok", fonte:"Certidão de nascimento", anexo:ce.anexo.id,
        texto:`Certidão de nascimento${ce.registrado ? ` de ${fraseClinica(ce.registrado)}` : ""}: nasceu em ${fmtBarra(ce.nascimento)}; o salário-maternidade se pede até ${fmtBarra(somarMeses(ce.nascimento, 60))}`});
  }
  const ruralDocs = papeisRurais(c.id);
  if(ruralDocs.length) out.push({grupo:"rural", est:"warn", fonte:"Dossiê", anexo:ruralDocs[0].id,
    texto:`Papéis do trabalho rural ou da pesca no dossiê: ${ruralDocs.slice(0, 5).map(a=>String(a.nome||"").split(" · ").pop().replace(/\.pdf$/i, "")).join("; ")}${ruralDocs.length > 5 ? ` e mais ${ruralDocs.length - 5}` : ""}`});
  const srv = vinculosSemSaida(g).find(v=>v.servidor);
  if(srv) out.push({grupo:"ctc", est:"warn", fonte:"CNIS",
    texto:`Cargo público (regime próprio) desde ${srv.inicio}${srv.origem ? `, em ${tituloOrgao(srv.origem)}` : ""}: a certidão de tempo (CTC) leva para lá o tempo do INSS`});
  const cad = lei("cadunico");
  if(cad.cor==="ok" || cad.cor==="alerta") out.push({grupo:"cadunico", est: cad.cor==="ok" ? "ok" : "warn", fonte:"CRM", texto:cad.txt});
  const fz = familiaCadunico(c);      // F230 · a família que a extensão trouxe do Meu CadÚnico
  // F235 · "Cadastrado" é o estado normal; a renda por pessoa da ficha é a conta do CadÚnico, e não a do BPC
  if(fz) out.push({grupo:"cadunico", est: /ativ|cadastrad/i.test(fz.estado_cadastral||"") && !/exclu|cancel|sem registro/i.test(fz.estado_cadastral||"") ? "ok" : "warn", fonte:"CadÚnico",
    texto:`Família ${fz.numero_familiar||""}: ${fz.estado_cadastral||"estado não informado"} · ${plu((fz.membros||[]).length, "integrante", "integrantes")} · ${moeda(fz.renda_por_pessoa)} por pessoa na ficha (não é a conta do BPC)`});
  // onda 3 · a contagem do CNIS, o requisito da espécie e a contagem do INSS ao lado.
  // A carência de 180 só decide na aposentadoria programável; na incapacidade
  // ela se confere na DII, depois da última perda da qualidade (art. 27-A)
  const ct = an && an.contagem, chave = fam && fam.chave;
  if(ct){
    const exig = chave==="tempo" ? 180 : 0, falta = exig - ct.carencia;
    // F235 · quem tem papel da roça ou da pesca não completa a carência "contribuindo todo mês": a roça soma, e o segurado especial não paga carnê
    const contribui = an.agora && an.agora.tipo!=="sem", segEsp = ((g||{}).vinculos||[]).some(v=>/Segurado Especial/i.test(v.tipo||""));
    out.push({grupo:"contrib", est: exig ? (falta<=0 ? "ok" : "warn") : "info", fonte:"CNIS",
      texto:`Carência pelo CNIS: ${ct.carencia} contribuições`
        + (exig && falta > 0 ? (p => p ? ` (${ct.carencia + p.meses} com a JA de ${p.onde})` : "")(empregosDosPapeis(c.id)[0]) : "")   // F235 · os papéis da época
        + (exig ? (falta<=0 ? `, as ${exig} cumpridas` : `; faltam ${falta} para as ${exig}${ruralDocs.length ? (segEsp ? " na conta de quem paga; o segurado especial cumpre a carência com os meses de roça ou de pesca, sem carnê" : "; é a conta da cidade: os meses de roça não estão nela e somam na aposentadoria rural ou na híbrida") : contribui ? `, completas em ${competenciaMais(compHoje(), falta)} se contribuir todo mês` : ""}`) : "")
        + `; tempo de ${anosMeses(ct.anos, ct.meses)}, contado por competência`
        + (ct.foraMinimo ? `; ${ct.foraMinimo} ${ct.foraMinimo>1?"meses":"mês"} abaixo do mínimo fora da conta` : "")
        + ((cA => cA ? `; ${cA.txt}` : "")(contagemComAcerto(c, g, ct)))});   // F235 · com pendência ou carteira fora do CNIS, as duas contas
  }
  if(chave==="tempo" || chave==="rural"){
    const sexo = sexoDe(c), nasc = dnIso(c.dn);
    if(sexo && nasc){
      const req = chave==="rural" ? (sexo==="F" ? 55 : 60) : IDADE_APOS[sexo], em = somarAnos(nasc, req);
      out.push({grupo:"idade", est: em<=hoje() ? "ok" : "info", fonte:"Ficha",
        texto:`${em<=hoje() ? "Completou" : "Completa"} ${req} anos em ${fmtBarra(em)}, a idade da aposentadoria por idade${chave==="rural" ? " rural" : ""}`});
    }
  }
  // onda 4 · o que o CAGED e a RAIS têm e o CNIS não; o desemprego
  // involuntário da última dispensa; o ruído do PPP contra o limite da época; a CAT
  const vcn = (g && g.vinculos) || [];
  const noCnis = x => vcn.some(v=>raizCnpj(v.codigo)===x.raiz && (!x.admissao || !v.inicio || v.inicio===x.admissao));
  const semCnis = g ? fd.caged.filter(x=>x.raiz && !noCnis(x)) : [];
  if(semCnis.length) out.push({grupo:"vinculo", est:"warn", fonte:"CAGED", anexo:semCnis[0].anexo.id,
    texto:`O CAGED tem ${semCnis.length} vínculo${semCnis.length>1?"s":""} que o CNIS não traz: `
      + semCnis.slice(0, 3).map(x=>`${x.nome||x.cod} (${x.admissao}${x.desligamento?` a ${x.desligamento}`:""})`).join("; ") + (semCnis.length>3 ? " e outros" : "")});
  if(ct){
    const contado = k => (ct.periodos||[]).some(([a, b])=>k>=a && k<=b), sobra = new Map();
    // F235 · o mês coberto por benefício do INSS não é contribuição que falta (a RAIS repete o salário do afastamento)
    const emBen = k => beneficiosDoCnis(g).some(b=>b.de && ymDe(b.de) <= k && (!b.ate || ymDe(b.ate) >= k));
    // F235 · o mês antes da admissão e o de depois da saída não são do vínculo: o de depois, em regra, é a rescisão; nenhum dos dois é acerto do CNIS
    for(const r of fd.rais) for(const [mm, v] of Object.entries(r.remuneracoes||{})){
      const ym = `${r.ano}-${mm}`, adm = r.admissao ? ymDe(isoBr(r.admissao)) : "", des = r.desligamento ? ymDe(isoBr(r.desligamento)) : "";
      if(!(v>0) || contado(ym) || emBen(ym)) continue;
      const k = r.nome||r.cnpj; if(!sobra.has(k)) sobra.set(k, {anexo:r.anexo, ms:[], antes:[], resc:[], desl:""}); const s = sobra.get(k);
      s[adm && ym < adm ? "antes" : des && ym > des ? "resc" : "ms"].push(ym); if(r.desligamento) s.desl = r.desligamento; }
    const mmaa = ym => ym.split("-").reverse().join("/");
    for(const [nome, {anexo, ms, antes, resc, desl}] of sobra){ ms.sort(); antes.sort(); resc.sort();
      if(ms.length) out.push({grupo:"vinculo", est:"warn", fonte:"RAIS", anexo:anexo.id,
        texto:`A RAIS mostra remuneração de ${nome} em ${ms.length} ${ms.length>1?"meses":"mês"} que o CNIS não conta: ${ms.slice(0, 4).map(mmaa).join(", ")}${ms.length>4?" e outros":""}`});
      if(antes.length) out.push({grupo:"vinculo", est:"info", fonte:"RAIS", anexo:anexo.id,
        texto:`A RAIS mostra remuneração de ${nome} antes da admissão (${antes.slice(0, 4).map(mmaa).join(", ")}): confira antes de levar ao CNIS`});
      if(resc.length) out.push({grupo:"vinculo", est:"info", fonte:"RAIS", anexo:anexo.id,
        texto:`A RAIS de ${nome} tem pagamento em ${resc.map(mmaa).join(", ")}, depois da saída${desl ? ` (${desl})` : ""}: em regra é a rescisão, e não mês trabalhado; se foi trabalho, tiraria a prorrogação da graça pelo desemprego`}); }
  }
  const dem = fd.rais.filter(x=>x.desligamento).sort((a,b)=>isoBr(b.desligamento).localeCompare(isoBr(a.desligamento)))[0];
  const ultMes = ct && (ct.periodos||[]).length ? ct.periodos[ct.periodos.length-1][1] : "";
  if(dem && /^11\b/.test(dem.causa||"") && (!ultMes || chaveComp(competenciaMais(dem.desligamento.slice(3), 1)) >= ultMes)){
    const marcado = !!(triagemDe(c).graca||{}).desempregado || !!(gr && gr.seguro);
    out.push({grupo:"qualidade", est: marcado ? "ok" : "warn", fonte:`RAIS de ${dem.ano}`, anexo:dem.anexo.id,
      texto:`A RAIS de ${dem.ano} mostra dispensa sem justa causa por ${dem.nome||"empregador"} em ${dem.desligamento}: o desemprego involuntário estende a graça em 12 meses (art. 15, § 2º, da Lei 8.213/91)${gr && gr.seguro ? ", já provado pelo seguro-desemprego" : marcado ? ", já marcado na conta" : ""}`,
      acao: marcado ? null : {rot:"Marcar o desemprego na conta da graça", js:`marcarDesemprego('${c.id}',true)`}});
  }
  // a licença sem remuneração da RAIS: o CNIS conta o mês, e o INSS tem
  // descontado o período do tempo de contribuição (pedido do Paulo, 11.10.2026)
  for(const l of licencasDaRais(fd.rais)) out.push({grupo:"contrib", est:"warn", fonte:`RAIS de ${l.ano}`, anexo:l.anexo.id,
    texto:`A RAIS de ${l.ano} registra licença sem remuneração${l.nome ? ` na ${l.nome}` : ""}${l.de ? `, de ${l.de}${l.ate ? ` a ${l.ate}` : ""}` : ""}${l.dias ? ` (${l.dias} dias)` : ""}: o INSS tem descontado esse período do tempo de contribuição, e a contagem do CNIS ainda o inclui`});
  // F235 · o PPP traduzido: o nível, o limite de cada época, o trecho que conta e o que não conta como especial, o ganho
  // da conversão até 13/11/2019; o agente químico ou biológico diz o efeito do EPI; o vínculo com exposição informada
  // pelo empregador (IEAN) que o PPP não cobre inteiro diz o período que falta pedir
  const sxI = sexoDe(c)==="F" ? 1 : 0, lacs = lacunasPpp(g, fd.ppps);
  const ganho = ivs => { const d = ivs.reduce((t, [a, b])=>t + (a > EC103 ? 0 : durDias(durCal(a, b < EC103 ? b : EC103))), 0);
    return d * (FATOR_ESP[25][sxI] - 1) >= 90 ? `; até 13/11/2019, convertido (×${String(FATOR_ESP[25][sxI].toFixed(2)).replace(".", ",")}), rende cerca de ${tempoFmt(d * (FATOR_ESP[25][sxI] - 1))} a mais na aposentadoria por tempo` : ""; };
  for(const pp of fd.ppps) for(const r of pp.riscos){
    const per = `de ${r.ini||"data não lida"} a ${r.fim||"data não lida"}`, emp = pp.empresa||"empresa não lida";
    // F235 · o PPP que estava no pedido (a cópia o lista) e o que o cliente trouxe e o INSS nunca viu mudam os atrasados da revisão
    const noPedido = fd.processos.find(p=>/Perfil Profissiogr/i.test(String((p.anexo||{}).texto||"")) && dsa(String((p.anexo||{}).texto||"")).includes(dsa(String(pp.empresa||"#").split(" ")[0])));
    const naoEnq = fd.resumos.some(x=>/N[ÃA]O ENQUADRADO[^\n]*EPI/i.test(String((x.anexo||{}).texto||"")));
    const lac = lacs.find(l=>l.raiz && l.raiz===raizCnpj(pp.cnpj||""));
    const falta = lac ? `. O CNIS mostra exposição informada pelo empregador de ${fmtBarra(lac.de)} a ${fmtBarra(lac.ate)}: falta o PPP de ${ivsTxt(lac.falta)}, a pedir ao ${lac.onde}` : "";
    // a conclusão vem logo depois da empresa (o cartão da escolha corta em 110 letras); as frases de antes seguem no corpo
    const pre = v => `PPP de ${emp}, ${lac ? `falta o PPP de ${ivsTxt(lac.falta)}` : v}: `;
    const a0 = isoBr(r.ini||""), b0 = isoBr(r.fim||"") || hoje();
    if(r.db==null){ const epiTira = r.epi==="SIM" && b0 >= "1998-12-03";
      out.push({grupo:"ppp", est: falta || epiTira ? "warn" : "ok", fonte:"PPP", anexo:pp.anexo.id,
        texto:pre(epiTira ? "com EPI eficaz, o INSS não conta como especial" : "conta como especial") + `${r.fator} ${per}`
          + (epiTira ? ", com EPI declarado eficaz: desde 03/12/1998 o INSS não conta como especial, salvo prova de que o EPI não protegia" : ` (agente de 25 anos)${a0 ? ganho([[a0, b0]]) : ""}`) + falta}); continue; }
    const tr = a0 ? [["0000-01-01","1997-03-05",80],["1997-03-06","2003-11-18",90],["2003-11-19","9999-12-31",85]].filter(([p, q])=>a0 <= q && b0 >= p)
      .map(([p, q, lim])=>({de: a0 > p ? a0 : p, ate: b0 < q ? b0 : q, lim, acima: r.db > lim})) : [];
    const sim = tr.filter(x=>x.acima), nao = tr.filter(x=>!x.acima), db = String(r.db).replace(".", ","), lims = [...new Set(tr.map(x=>x.lim))].join(" e ");
    const trTxt = xs => xs.map(x=>`de ${fmtBarra(x.de)} a ${fmtBarra(x.ate)} (limite de ${x.lim})`).join(" e ");
    out.push({grupo:"ppp", est: !tr.length ? "info" : !nao.length && !falta ? "ok" : "warn", fonte:"PPP", anexo:pp.anexo.id,
      texto:pre(!tr.length ? "período não lido" : !nao.length ? "conta como especial" : !sim.length ? "não conta como especial" : "só em parte especial")
        + `ruído de ${db} dB(A) ${per}, `
        + (!nao.length ? (lims.includes(" e ") ? `acima dos limites de ${lims.replace(/ e (?=.* e )/g, ", ")} dB(A) das épocas` : `acima do limite de ${lims} dB(A) da época`) : !sim.length ? `abaixo do limite de ${lims} dB(A) da época` : "acima do limite da época só em parte do período")
        + (sim.length && r.epi==="SIM" ? "; o EPI declarado eficaz não afasta o ruído acima do limite (Tema 555 do STF)" : "")
        + (sim.length && nao.length ? `; não conta ${trTxt(nao)}; conta ${trTxt(sim)}` : "")
        + ganho(sim.map(x=>[x.de, x.ate])) + falta
        + (noPedido ? `; o INSS recebeu este PPP no pedido de ${noPedido.entrada||"concessão"}${naoEnq ? " e não enquadrou o período por causa do EPI" : ""}` : /trazid/i.test(pp.anexo.nome||"") ? "; trazido pelo cliente: o dossiê não mostra que o INSS o recebeu" : "")});
  }
  for(const ca of fd.cats) out.push({grupo:"cat", est:"info", fonte:"CAT", anexo:ca.anexo.id,
    // F235 · o fato e a pergunta que ele pede, com o CID com ponto; a regra do NTEP fica para o advogado, no fim
    texto:`CAT de ${ca.data||"data não lida"}: acidente ${(ca.tipo||"de tipo não lido").toLowerCase()}${ca.tipoCat ? ` (CAT ${ca.tipoCat.toLowerCase()})` : ""}`
      + `${ca.cidDesc ? `, ${ca.cidDesc.toLowerCase()}` : ""}${ca.cid ? ` (CID ${cidFmt(ca.cid)})` : ""}. Pergunte como foi e se ficou sequela`
      + `${ca.cnae ? `; o nexo pelo CNAE ${ca.cnae} se confere na Lista C do Anexo II do Decreto 3.048/99` : ""}`});
  // os CNPJs em nome do cliente (Redesim), com a consulta à base pública no clique
  for(const e of fd.cnpjs){
    const d = soDig(e.cnpj), ws = _cnpjWs.get(d) || {};
    out.push({grupo:"cnpj", est: /^ATIVA$/i.test(e.situacao) ? "warn" : "info", fonte:"Redesim", anexo:e.anexo.id,
      texto:`CNPJ ${e.cnpj}${e.razao ? `, ${e.razao}` : ""}: ${(e.situacao||"situação não lida").toLowerCase()}${e.local ? `, em ${e.local}` : ""}; o CPF é ${(e.vinculo||"vinculado").toLowerCase()}${e.qualificacao ? ` (${e.qualificacao.toLowerCase()})` : ""}`
        + (ws.dados ? `; ${resumoCnpjWs(ws.dados)}` : ws.erro ? `; ${ws.erro}` : ""),
      acao: ws.dados ? null : {rot: ws.carregando ? "Consultando…" : ws.erro ? "Consultar de novo" : "Consultar abertura, MEI e CNAE", js:`consultarCnpjWs('${d}')`}});
  }
  if(fd.redesim && !fd.cnpjs.length) out.push({grupo:"cnpj", est:"ok", fonte:"Redesim", anexo:fd.redesim.anexo.id,
    texto:`Nenhum CNPJ vinculado ao CPF na consulta à Redesim de ${fd.redesim.consulta || "data não lida"}`});
  // onda 5 · a clínica: a linha do tempo, o sinal de doença que dispensa a
  // carência, a área médica dos documentos e o relatório recente para a perícia.
  // A DII se ancora no registro mais antigo, que por isso fica fixo no topo e
  // não cai no corte de oito; o mais recente vem logo abaixo, e o resto depois
  const clin = linhaClinica(c.id);
  const datados = clin.filter(x=>x.data), antigo = datados[datados.length-1], recente = datados[0];
  const fixos = antigo ? (recente!==antigo ? [antigo, recente] : [antigo]) : [];
  const rotClin = x => x===antigo ? "Primeiro registro clínico em " : x===recente ? "Último registro clínico em " : "";
  [...fixos, ...clin.filter(x=>!fixos.includes(x))].slice(0, 8).forEach(x=>out.push({grupo:"medicos", est:"info", fonte:x.fonte, anexo:x.anexo.id,
    texto:`${rotClin(x)}${x.data ? fmtBarra(x.data) : "sem data"}, ${x.tipo.toLowerCase()}: ${x.titulo}${x.resumo ? `; ${x.resumo}` : ""}${x.cids.length ? `; CID ${x.cids.join(", ")}` : ""}`}));
  if(clin.length > 8) out.push({grupo:"medicos", est:"info", fonte:"Dossiê", texto:`E mais ${clin.length-8} documentos médicos, na lista do dossiê`});
  const grave = clin.find(x=>x.grave);
  if(grave) out.push({grupo:"contrib", est:"info", fonte:grave.fonte, anexo:grave.anexo.id,
    texto:`O ${grave.tipo.toLowerCase()} de ${grave.data ? fmtBarra(grave.data) : "data não lida"} menciona ${grave.grave}, da lista de doenças que dispensam a carência (art. 26, II, da Lei 8.213/91): conferir no documento${aposentadoriaAtiva(c) ? "; para quem já é aposentado, o que importa é a lista da isenção de imposto de renda (Lei 7.713/88, art. 6º, XIV), que também se confere" : ""}`});
  const area = clin.length ? areaClinica(clin) : null;
  if(area) out.push({grupo:"medicos", est:"info", fonte:"Dossiê", texto:`Os documentos médicos são da área de ${area.rot}; o pedido ao Claude leva o agente ${area.agente} da base`});
  if(["incapacidade", "b94", "bpc"].includes(chave)){
    const rel = clin.find(x=>x.tipo==="Relatório" && x.data), dias = rel ? -diasAte(rel.data) : null;
    out.push({grupo:"medicos", est: rel && dias<=90 ? "ok" : "warn", fonte: rel ? rel.fonte : "Dossiê", anexo: rel ? rel.anexo.id : undefined, neg: !rel,
      texto: !rel ? "Nenhum relatório médico no dossiê: pedir relatório atualizado para a perícia"
        : dias<=90 ? `Relatório médico recente, de ${fmtBarra(rel.data)}, para levar à perícia`
        : `O relatório médico mais recente é de ${fmtBarra(rel.data)}, com mais de 90 dias: pedir relatório atualizado para a perícia`});
  }
  for(const r of fd.resumos){
    const nosso = ct && r.der ? mesesContadosAte(ct.periodos, isoBr(r.der).slice(0, 7)) : null;
    const dif = nosso!=null && r.carencia!=null ? nosso - r.carencia : null, longe = dif!=null && Math.abs(dif) > 2;
    out.push({grupo:"contrib", est: longe ? "warn" : "info", fonte:"Contagem do INSS", anexo:r.anexo.id,
      texto:`Na DER de ${r.der || "data não lida"}, o INSS contou ${r.tempo ? `${r.tempo.anos} anos, ${r.tempo.meses} meses e ${r.tempo.dias} dias` : "tempo não lido"} e carência de ${r.carencia ?? "número não lido"}`
        + (longe ? `; o CNIS de hoje dá ${nosso} até a mesma data, ${Math.abs(dif)} ${dif>0 ? "a mais" : "a menos"}: conferir os períodos que ficaram fora` : "")
        + (r.naoEnquadrados ? `; ${r.naoEnquadrados} ${r.naoEnquadrados>1 ? "períodos especiais não enquadrados" : "período especial não enquadrado"}` : "")});
  }
  return out;
}
const _mapaLente = new Map(), _mapaAberto = new Map();
// F195 · cada ponto do mapa vai à Análise de Direito, salvo o que se tirar
const _mapaFora = new Map();
const mapaVai = (cliId, ramo) => !(_mapaFora.get(cliId)||new Set()).has(ramo);
function familiaDoMapa(c, ks){
  const ch = _mapaLente.get(c.id);
  return (ch && PONTOS_ESPECIE.find(f=>f.chave===ch)) || familiaDaTriagem(c, ks);
}
const MAPA_ORDEM = {crit:0, warn:1, pend:2, ok:3, info:4};
function ramosDoMapa(c, ks, fam){
  const f = MAPA_FUNIL[fam.chave] || {D:"", A:""};
  const usa = new Set(`${f.D} ${f.A}`.split(/\s+/).filter(Boolean));
  const fatos = fatosDoMapa(c, ks, fam).sort((a,b)=>MAPA_ORDEM[a.est]-MAPA_ORDEM[b.est]);
  const pior = fs => fs.length ? fs[0].est : "info";
  const t = triagemDe(c), usados = new Set(), ramos = [];
  const prazos = fatos.filter(x=>x.prazo);
  prazos.forEach(x=>usados.add(x));
  if(prazos.length) ramos.push({id:"prazos", rot:"Prazos", fatos:prazos, est:pior(prazos)});
  for(const [id, rot, dica] of fam.pontos){
    const gs = String(MAPA_PONTOS[id]||"").split(/\s+/);
    const fs = fatos.filter(x=>!x.prazo && gs.includes(x.grupo));
    fs.forEach(x=>usados.add(x));
    const resp = t[id] || {};
    // a resposta de quem atende vale sobre a leitura; sem ela, o fato que não
    // é só informação decide a cor, e o ponto sem fato fica a conferir
    const est = resp.estado==="ok" ? "ok" : resp.estado==="atencao" ? "warn"
      : fs.some(x=>x.est!=="info") ? pior(fs) : "pend";
    ramos.push({id, rot, dica, ponto:true, fatos:fs, est, resp});
  }
  const outros = fatos.filter(x=>!usados.has(x) && usa.has(x.grupo));
  if(outros.length) ramos.push({id:"outros", rot:"Outros fatos que a espécie usa", fatos:outros, est:pior(outros)});
  return {ramos, fora: fatos.filter(x=>!usados.has(x) && !usa.has(x.grupo))};
}
const curtoMapa = t => { const s = String(t||"").split("\n")[0]; return s.length>110 ? s.slice(0, 107).replace(/\s+\S*$/, "")+"…" : s; };
function fraseDoRamo(r){
  if(r.resp && (r.resp.estado==="ok" || r.resp.estado==="atencao"))
    return (r.resp.estado==="ok" ? "sem pendência" : "atenção") + (r.resp.nota ? `: ${curtoMapa(r.resp.nota)}` : ", conferido na triagem");
  return r.fatos.length ? curtoMapa(r.fatos[0].texto) : "a conferir";
}
// ══════════════════════════════════════════════════════════════════════════
// F196 · PAINEL DO PRIMEIRO ATENDIMENTO (o desenho aprovado em 12.10.2026)
// ══════════════════════════════════════════════════════════════════════════
// Os trabalhos possíveis à esquerda, a situação em seis blocos à direita,
// com a linha do tempo e o detalhe de cada bloco, fato a fato, com a fonte.
// Cada bloco vai à Análise de Direito, salvo o que se tirar; os trabalhos
// marcados viram a lista de trabalhos da análise. Só lê: nada se grava aqui.
const _paBloco = new Map(), _paForaBl = new Map(), _paEsc = new Map(), _paCartao = new Map();
const PA_BLOCOS = [
  ["qual", "Qualidade de segurado"], ["car", "Carência"], ["cnis", "CNIS"], ["rais", "RAIS e CAGED"],
  ["cnpj", "CNPJs do titular"], ["ped", "Pedidos ao INSS"], ["plan", "Planejamento prévio"], ["falta", "Não encontrado no dossiê"],
];
// F207 · blocos que só nascem quando o dossiê traz o documento deles
const PA_BLOCOS_EXTRA = [
  ["ben", "Benefícios", ["beneficios","carta"]], ["saude", "Documentação HCRP", ["medicos"]], ["esp", "PPP eletrônico e CAT", ["ppp","cat"]],
  ["cad", "CadÚnico", ["cadunico"]],
];
const blocosDoPA = d => [...PA_BLOCOS, ...PA_BLOCOS_EXTRA.filter(([b])=>d.grupos[b] && d.grupos[b].length)];
// o código da espécie que a análise abre para cada trabalho
const PA_COD = {bpc:"B87", incapacidade:"B31", b94:"B94", especial:"B46", tempo:"B42", rural:"B41", pensao:"B21", maternidade:"B80", cnis:"", crps:"", revisao:""};
// o trabalho só vira cartão quando o dossiê traz o fato que é dele, e não só idade ou qualidade
const PA_GATILHO = {bpc:"cadunico", incapacidade:"laudo medicos", b94:"cat laudo", especial:"ppp", rural:"rural",
  pensao:"certidoes", maternidade:"certidoes", revisao:"carta", cnis:"vinculo minimo ctc", crps:"processo", tempo:"contrib"};
// F235 · o "Falta" do quadro final: o que ainda não se sabe, dito para quem atende
const PA_FALTA_TXT = {inc_dii:"a data em que a doença começou e a data em que parou de trabalhar", inc_carencia:"as 12 contribuições, ou a doença que dispensa",
  inc_qualidade:"se era segurado quando ficou incapaz", inc_pericia:"o laudo da perícia do INSS (vem na cópia do processo)",
  b94_sequela:"o relatório que mostra a sequela e o que ela reduz", b94_nexo:"se o acidente foi no trabalho (B94) ou fora dele (no B36 qualquer acidente serve)",
  b94_acumulacao:"se já recebe outro benefício", bpc_renda:"a renda da família por pessoa", bpc_grupo:"quem mora na casa e entra na conta",
  bpc_cadunico:"o CadÚnico atualizado", bpc_avaliacao:"a avaliação médica e social do INSS", crp_prazo:"a data em que viu a decisão, para contar o prazo",
  crp_enunciado:"o enunciado do CRPS que decide o caso", crp_motivo:"o motivo exato da negativa", esp_ppp:"o PPP de cada período", esp_epi:"se o EPI era eficaz",
  esp_ltcat:"o laudo técnico (LTCAT) que sustenta o PPP", esp_conversao:"a regra para converter o tempo especial", rur_prova:"documento rural da época",
  rur_auto:"a autodeclaração rural", rur_teste:"testemunhas que viram o trabalho", rur_genero:"documento rural em nome do marido",
  dep_qualidade:"se quem morreu ou foi preso era segurado no dia (o CNIS dele não vem no dossiê de quem pede)", dep_prova:"a prova da união estável ou da dependência", dep_cota:"quanto tempo a pensão vai durar",
  apo_der:"a melhor data para pedir", apo_minimo:"os meses pagos abaixo do mínimo", apo_reciproca:"se já foi servidor público, militar ou aluno-aprendiz",
  mat_qualidade:"se era segurada na data do parto", mat_rural:"os 12 meses de trabalho rural antes do parto", rev_decadencia:"o prazo de 10 anos para revisar",
  rev_tese:"qual revisão pedir", rev_calculo:"o cálculo do ganho (a renda nova)",   // F235 · a revisão vai ao INSS, e não à ação cni_indicador:"cada pendência do CNIS", cni_anexo:"o formulário certo para corrigir o CNIS (RAC)",
  cni_prova:"a prova do vínculo que falta"};
const FAM_DO_PRAZO = {incapacidade:/incapacidade|aux[íi]lio[- ]doen|\bB?(31|32|91|92)\b/i, b94:/acidente|\bB?(94|36)\b/i,
  tempo:/aposentadoria (por )?(idade|tempo)|professor|\bB?(41|42|57)\b/i, especial:/especial|\bB?46\b/i, rural:/rural/i,
  bpc:/assistencial|\bBPC\b|LOAS|\bB?(87|88)\b/i, pensao:/pens[ãa]o|reclus|\bB?(21|25|93)\b/i, maternidade:/maternidade|\bB?80\b/i};
const PA_SELO = {opcao:["Opção: compare os valores","info"], imped:["Impedido","info"], risco:["Requisito em risco","crit"], crit:["Prazo correndo","crit"], warn:["Falta um dado","warn"], pend:["Falta um dado","warn"], ok:["Requisitos à vista","ok"], info:["A conferir","info"]};
const PA_IMPEDE = new Set(["incapacidade","tempo","especial","rural","b94","bpc"]);
const PA_IMPEDE_POR = {incapacidade:"não acumula com auxílio por incapacidade", tempo:"não acumula com outra aposentadoria",
  especial:"não acumula com outra aposentadoria", rural:"não acumula com outra aposentadoria", b94:"não acumula com auxílio-acidente", bpc:"não acumula com o BPC"};
// a aposentadoria em manutenção, pela declaração de benefícios ou pelo CNIS lido
function aposentadoriaAtiva(c){
  const pdf = triagemDe(c).pdf || {}, ativo = b => !/CESSAD|INDEFER|SUSPENS|ENCERRAD/i.test(b.situacao||"");
  const todos = [...(((pdf.declaracao||{}).beneficios)||[]), ...((((pdf.cnis||{}).analise||{}).benefAtivos)||[]),
    ...beneficiosDoCnis(cnisDe(c)).filter(b=>b.ativo).map(b=>({especie:`${b.especie} - ${nomeBenef(b.especie)}`, nb:b.nb, situacao:b.situacao}))];
  const b = todos.find(b=>ativo(b) && /aposentadoria|\bB?(4[1-6]|57)\b/i.test(String(b.especie||"")));
  return b ? {especie: /aposentadoria/i.test(b.especie) ? String(b.especie).replace(/^\d+\s*-\s*/,"") : "Aposentadoria", nb: b.nb||""} : null;
}
// F233 · paDados e quadrosDoPA leem o dossiê inteiro (fatosDoMapa varre todos os textos) e
// a ficha os chama várias vezes por pintura: guardam o resultado enquanto os dados não mudam
function assinaturaPA(c, ks){
  const g = cnisDe(c) || {}, t = triagemDe(c);
  return [c.id, c.dn, c.sexo, (ks||[]).map(k=>k.id+k.fase+(k.nb||"")+(k.dcb||"")+(k.atualizado_em||"")).join(), Object.keys(t).map(k=>(t[k]||{}).em||(t[k]||{}).estado||"").join(), docsDoDossie(c.id).map(a=>`${a.id}:${a.paginas??""}:${(a.texto||"").length}`).join(),
    (D.anexos||[]).filter(a=>a.cliente_id===c.id && a.origem==="previus").map(a=>`${a.id}:${(a.texto||"").length}`).join(),
    Object.values(c.dossie||{}).map(x=>x&&x.em).join(), g.em, (t.graca||{}).desempregado, _mapaLente.get(c.id)||"", (aposDoCliente(c)||[]).map(a=>a.data).join(),
    [..._cnpjWs.values()].map(w=>(w.dados?1:0)+(w.erro?2:0)+(w.carregando?4:0)).join(""), hoje()].join("|");
}
const _paMemo = new Map();
function memoPA(tipo, c, ks, calc){
  const k = `${tipo}|${c.id}`, sig = assinaturaPA(c, ks), m = _paMemo.get(k);
  if(m && m.sig===sig) return m.v;
  const v = calc(); _paMemo.set(k, {sig, v}); return v;
}
function paDados(c, ks){ return memoPA("d", c, ks, ()=>paDadosCalc(c, ks)); }
const _paTopo = t => t.selo==="crit" ? 3 : t.f.chave==="maternidade" ? 2 : t.f.chave==="rural" ? 1 : 0;
function paDadosCalc(c, ks){
  const fam = familiaDoMapa(c, ks);
  const fatos = fatosDoMapa(c, ks, fam || PONTOS_ESPECIE[0]);
  const g = cnisDe(c), an = g && g.analise, ct = an && an.contagem, fd = fontesDoDossie(c.id);
  const gr = g && (g.vinculos||[]).length ? calcularGraca(g.vinculos, contribSemPerda(g), !!(triagemDe(c).graca||{}).desempregado, an && an.abaixo, ct && ct.periodos, fd.seguros) : null;
  const deRais = x => /^RAIS/.test(x.fonte||"");
  const grupos = {
    qual: fatos.filter(x=>x.grupo==="qualidade"),
    car: fatos.filter(x=>x.grupo==="contrib" && !deRais(x)),
    cnis: fatos.filter(x=>(x.grupo==="vinculo" || x.grupo==="minimo") && !deRais(x)),
    rais: fatos.filter(x=>deRais(x) || /^CAGED/.test(x.fonte||"")),
    falta: paFaltas(c, fd).map(t=>({grupo:"falta", est:"warn", texto:t, fonte:"dossiê"})),
    cnpj: fatos.filter(x=>x.grupo==="cnpj"),
    ped: fatos.filter(x=>["processo","beneficios","carta","laudo"].includes(x.grupo)),
    plan: fatos.filter(x=>x.grupo==="idade"),
    ...Object.fromEntries(PA_BLOCOS_EXTRA.map(([b,,gs])=>[b, fatos.filter(x=>gs.includes(x.grupo))])),
  };
  const ap = (aposDoCliente(c)||[]).filter(a=>a.data).sort((a,b)=>a.data<b.data?-1:1)[0];
  if(ap) grupos.plan.push({grupo:"idade", est:"info", fonte:"Aposentadorias futuras", texto:`${ap.especie||"Aposentadoria"} prevista para ${fmtBarra(ap.data)}`});
  const pior = fs => fs.reduce((p, x)=>MAPA_ORDEM[x.est] < MAPA_ORDEM[p] ? x.est : p, "info");
  const ativos = grupos.cnpj.filter(x=>!/^Nenhum/.test(x.texto));
  const BL = {
    qual: [!gr ? "—" : gr.semLimite ? "sem limite" : `até ${fmtBarra(gr.mantidaAte)}`, true,
      !gr ? "o CNIS não foi lido" : gr.semLimite ? "benefício em manutenção" : gr.complementar ? `complementada ${gr.complementar.comp}, iria até ${fmtBarra(gr.complementar.mantidaAte)}` : gr.vencida ? `perdida em ${fmtBarra(gr.perda)}` : `perda em ${fmtBarra(gr.perda)}`,
      !gr ? "pend" : gr.vencida && !gr.complementar ? "crit" : gr.vencida ? "warn" : "ok"],
    car: [ct ? `${ct.carencia} de 180` : "—", true, ct ? `${anosMeses(ct.anos, ct.meses)} de tempo pelo CNIS` : "o CNIS não foi lido", ct ? pior(grupos.car) : "pend"],
    cnis: [(n=>n ? `${n} ${n===1?"ponto":"pontos"}` : "sem pendência")(grupos.cnis.filter(x=>x.est!=="info"&&x.est!=="ok").length), false,
      grupos.cnis.length ? curtoMapa(grupos.cnis[0].texto) : "nenhum indicador lido", pior(grupos.cnis)],
    rais: (vs=>{ const al = vs.filter(v=>v.alertas.length).length;
      return [vs.length ? `${vs.length} ${vs.length===1?"vínculo":"vínculos"}` : "—", false,
        !vs.length ? "o Emprega Brasil não trouxe RAIS nem CAGED" : al ? `${al} com ponto a conferir (vínculo em aberto ou licença)` : "nenhum vínculo em aberto nem licença",
        !vs.length ? "pend" : al ? "warn" : "ok"]; })(vinculosRaisCaged(fd)),
    falta: [(n=>n ? `${n} ${n===1?"item":"itens"}` : "nada")(grupos.falta.length), false,
      grupos.falta.length ? curtoMapa(grupos.falta[0].texto) : "o dossiê tem os documentos de cada portal", grupos.falta.length ? "warn" : "ok"],
    cnpj: [ativos.length ? `${ativos.length} ${ativos.length===1?"CNPJ":"CNPJs"}` : "nenhum", false,
      ativos.length ? curtoMapa(ativos[0].texto) : grupos.cnpj.length ? "a Redesim não traz CNPJ no CPF" : "a Redesim não foi consultada", ativos.length ? "warn" : "info"],
    ped: (ps=>{ const ni = ps.filter(p=>p.res==="indeferido").length, pr = grupos.ped.find(x=>x.prazo);
      return [ps.length ? `${ps.length} ${ps.length===1?"pedido":"pedidos"}` : "nenhum", false,
        pr ? curtoMapa(pr.texto) : ps.length ? `${ni} ${ni===1?"indeferido":"indeferidos"}, ${ps.length-ni} ${ps.length-ni===1?"outro":"outros"}` : "nenhum pedido no dossiê",
        pr ? pior(grupos.ped) : ni ? "warn" : ps.length ? "ok" : "info"]; })(pedidosAoInss(c, fd)),
    plan: [ap ? fmtBarra(ap.data) : "—", true, ap ? (ap.especie||"aposentadoria") : "sem aposentadoria prevista em Aposentadorias futuras", "info"],
    ...Object.fromEntries(PA_BLOCOS_EXTRA.map(([b])=>[b, [(n=>`${n} ${n===1?"registro":"registros"}`)(grupos[b].length), false,
      grupos[b].length ? curtoMapa(grupos[b][0].texto) : "", grupos[b].length ? pior(grupos[b]) : "info"]])),
  };
  // F207 · quem já recebe aposentadoria não acumula outra nem auxílio por
  // incapacidade (art. 124, I e II, da Lei 8.213/91), nem auxílio-acidente (art. 86, § 2º) ou BPC
  const apos = aposentadoriaAtiva(c);
  // os trabalhos: cada espécie em que o dossiê tem fato num ponto da triagem
  const trabalhos = PONTOS_ESPECIE.map(f=>{
    const {ramos} = ramosDoMapa(c, ks, f), comFato = ramos.filter(r=>r.ponto && r.fatos.length);
    const gat = String(PA_GATILHO[f.chave]||"").split(" ");
    // F235 · o recurso ao CRPS nasce do prazo correndo: o fato do prazo fica no ramo "Prazos", fora dos pontos da espécie
    if(f.chave==="crps" && !comFato.length){ const pr = ramos.find(r=>r.id==="prazos" && r.fatos.length); if(pr) comFato.push(pr); }
    // F235 · aposentado com PPP de período especial: o trabalho é a revisão (outra aposentadoria não cabe), mesmo com o prazo longe
    const revPpp = f.chave==="revisao" && apos && (fd.ppps||[]).length && (fd.cartas||[]).length;
    if(!comFato.length || (f.chave!==(fam||{}).chave && !revPpp && !ramos.some(r=>r.fatos.some(x=>gat.includes(x.grupo) && x.est!=="info" && !x.neg && (!x.so || x.so===f.chave))))) return null;
    // F235 · o CadÚnico sozinho não faz o BPC: precisa de 65 anos (ou perto deles) ou de documento médico
    if(f.chave==="bpc" && f.chave!==(fam||{}).chave && !((idadeDe(c.dn)||0) >= 64 || linhaClinica(c.id).length)) return null;
    // F235 · sem nenhuma contribuição no CNIS, a aposentadoria não é sinal do dossiê (a criança, a viúva que nunca pagou)
    if(f.chave==="tempo" && f.chave!==(fam||{}).chave && ct && !ct.carencia) return null;
    // F235 · quem trabalha registrado, sem afastamento nem benefício, e tem a deficiência documentada vai à PcD, e não à perícia de incapacidade
    if(f.chave==="incapacidade" && f.chave!==(fam||{}).chave && sinalPcd(c) && !(fd.laudos||[]).length && !beneficiosDoCnis(g).some(b=>b.ativo)
      && !linhaClinica(c.id).some(i=>i.fatos && (i.fatos.afast || i.fatos.desde))
      && ((g||{}).vinculos||[]).some(v=>v.tipo!=="Benefício" && !v.fim && v.ultRemun && chaveComp(v.ultRemun) >= somarMeses(hoje(), -4).slice(0, 7))) return null;
    // F235 · o prazo é do benefício do pedido: o recurso do auxílio-doença não corre na aposentadoria nem no BPC
    // F235 · a certidão de nascimento do bebê é do salário-maternidade: o cartão da pensão pede óbito ou prisão
    // F235 · o fato da certidão de óbito ou da prisão mora no ramo "Prazos", que não é ponto: procura em todos os ramos
    if(f.chave==="pensao" && f.chave!==(fam||{}).chave && !ramos.some(r=>r.fatos.some(x=>x.grupo==="certidoes" && x.fonte!=="Certidão de nascimento"))) return null;
    const doPrazo = r => r.id!=="prazos" || f.chave==="crps" || r.fatos.some(x=>(FAM_DO_PRAZO[f.chave]||/$^/).test(x.texto||""));
    const rs = ramos.filter(doPrazo);
    const est = rs.some(r=>r.est==="crit") ? "crit" : rs.some(r=>r.est==="warn"||r.est==="pend") ? "warn" : "ok";
    // o fato do cartão é o do gatilho da espécie (o CadÚnico no BPC, o laudo na incapacidade), e não o pior do dossiê
    // F235 · o fato do cartão pode ser o do prazo (a certidão de óbito ou da prisão), e não só o de um ponto
    const fatoGat = ramos.flatMap(r=>r.fatos).find(x=>gat.includes(x.grupo) && x.est!=="info" && !x.neg && (!x.so || x.so===f.chave));
    let forte = fatoGat ? {fatos:[fatoGat]} : comFato.filter(doPrazo).concat(comFato).sort((a,b)=>MAPA_ORDEM[a.est]-MAPA_ORDEM[b.est])[0];
    // F235 · o cartão da revisão diz o motivo (o especial do PPP, e o EPI quando o INSS o usou) e até quando se pede
    if(revPpp){ const pp = fd.ppps[0], rs0 = (pp.riscos||[]).filter(r=>r.ini), a0 = rs0.map(r=>r.ini.slice(-4)).sort()[0], a1 = rs0.map(r=>(r.fim||"").slice(-4)).filter(Boolean).sort().pop();
      const dc = fd.cartas.map(ca=>decadenciaDe(ca, fd.extratos)).filter(Boolean)[0], epi = fd.resumos.some(x=>/N[ÃA]O ENQUADRADO[^\n]*EPI/i.test(String((x.anexo||{}).texto||"")));
      const ag = rs0.some(r=>r.db!=null) ? "o ruído" : "o agente nocivo", per = a0 ? ` (${a0}${a1 && a1!==a0 ? ` a ${a1}` : ""})` : "", emp = tituloOrgao(pp.empresa||"empresa");
      forte = {fatos:[{texto:`${epi ? `O INSS não contou ${ag} da ${emp}${per} por causa do EPI` : `O PPP da ${emp}${per} soma tempo especial`}${dc ? `; prazo até ${fmtBarra(dc.cedo || dc.ate)}` : ""}`}]}; }
    // F235 · "faltam as 12 contribuições" a quem tem 200, e "o laudo da perícia" a quem nunca pediu ao INSS, eram falta falsa
    const pediuInc = (fd.processos||[]).some(p=>/incapacidade|prorroga|aux[íi]lio/i.test(p.servico||""));
    // F235 · o laudo da perícia que já está no dossiê não é falta; com a carta lida, o prazo da revisão é conhecido
    const falta = rs.filter(r=>r.ponto && r.est==="pend")
      .filter(r=>!(r.id==="inc_carencia" && ct && ct.carencia >= 12) && !(r.id==="inc_pericia" && (!pediuInc || (fd.laudos||[]).length)) && !(r.id==="b94_nexo" && (fd.cats||[]).length) && !(r.id==="rev_decadencia" && (fd.cartas||[]).length)
        && !(r.id==="apo_reciproca" && empregosDosPapeis(c.id).length) && !(/^crp_(prazo|motivo)$/.test(r.id) && rs.some(q=>q.id==="prazos" && q.fatos.length)))
      // F235 · no salário-maternidade a carência não falta (não existe); a roça só falta a quem tem papel rural; testemunha não se
      // pede ao INSS, que não faz entrevista rural (Portaria DIRBEN 990/2022, art. 89)
      .filter(r=>!/^(mat_carencia|rur_teste)$/.test(r.id) && !(r.id==="mat_rural" && !papeisRurais(c.id).length))
      .map(r=>PA_FALTA_TXT[r.id] || r.rot);
    const prazo = (rs.find(r=>r.id==="prazos")||{fatos:[]}).fatos[0];
    // F233 · impedimento só na vedação absoluta; o BPC e o auxílio-acidente com outro benefício são opção (escolhe-se o melhor)
    const outroAtivo = f.chave==="bpc" ? (apos || ((an && an.benefAtivos)||[])[0]) : f.chave==="b94" && !apos ? ((an && an.benefAtivos)||[]).find(b=>/^(94|36)\b|acidente/i.test(String(b.especie||""))) : null;
    if(outroAtivo) return {f, est:"info", selo:"opcao", forte, falta:[], prazo:null, ramos, impedido:`Já recebe ${String(outroAtivo.especie||"benefício").replace(/^\d+\s*-\s*/,"").toLowerCase()}${outroAtivo.nb ? ` (NB ${outroAtivo.nb})` : ""}: não acumula; compare os valores e escolha o melhor.`};
    // F235 · sem nenhuma contribuição, ou sem qualidade há mais de 2 anos, o benefício por incapacidade não cabe (a isenção de carência não supre a qualidade)
    if(f.chave==="incapacidade" && g && (!ct || !ct.carencia))
      return {f, est:"info", selo:"imped", forte, falta:[], prazo:null, ramos, impedido:"Nunca contribuiu ao INSS: sem qualidade de segurado, o benefício por incapacidade não cabe (a doença que dispensa a carência não supre a qualidade). Veja o BPC."};
    if(f.chave==="incapacidade" && gr && gr.vencida && !gr.semLimite && gr.perda < somarMeses(hoje(), -24))
      return {f, est:"info", selo:"imped", forte, falta:[], prazo:null, ramos, impedido:`Sem qualidade de segurado desde ${fmtBarra(gr.perda)}: só cabe se a incapacidade começou antes disso, e há documento que o prove.`};
    // F235 · sem qualidade no dia em que ficou incapaz (a DII do laudo ou do relatório depois da perda): é esse o risco principal, e não a idade do relatório
    if(f.chave==="incapacidade" && gr && gr.vencida && !gr.semLimite){ const ds = [...(fd.laudos||[]).map(l=>isoBr(l.dii||"")), ...linhaClinica(c.id).map(i=>(i.fatos||{}).desde || ((i.fatos||{}).afast||{}).ini)].filter(Boolean).sort();
      if(ds[0] && ds[0] >= gr.perda) return {f, est:"crit", selo:"risco", forte:{fatos:[{texto:`Sem qualidade no dia em que ficou incapaz (${fmtBarra(ds[0])}): a cobertura acabou em ${fmtBarra(gr.mantidaAte)}`, est:"crit"}]}, falta, prazo, ramos}; }
    // F235 · a aposentadoria por invalidez comum de quem se acidentou no trabalho não impede: é a troca para a acidentária (32 para 92)
    if(f.chave==="incapacidade" && apos && /invalidez|incapacidade permanente/i.test(apos.especie) && !(fd.cats||[]).length && trabalhoNoDossie(c, fd))
      return {f, est:"warn", selo:"warn", forte:{fatos:[{texto:"Aposentadoria por invalidez comum, mas o dossiê mostra acidente no trabalho: pode virar acidentária (100 % da média)", est:"warn"}]}, falta:["a CAT, que o próprio segurado pode registrar"], prazo:null, ramos};
    // F235 · o auxílio-acidente é só do empregado, do doméstico, do avulso e do segurado especial (Lei 8.213, art. 18, § 1º):
    // quem contribuía como individual ou facultativo na data do acidente não tem
    if(f.chave==="b94" && g){ const fimV = v => isoBr(v.fim||"") || (/^\d{2}\/\d{4}$/.test(v.fim||"") ? isoBr(fimDoMes(v.fim)) : "") || (v.ultRemun ? isoBr(fimDoMes(v.ultRemun)) : "9999-12-31");
      const bi = beneficiosDoCnis(g).filter(b=>/^(31|91|32|92)$/.test(String(b.especie)) && b.de).sort((a, b)=>a.de < b.de ? 1 : -1)[0], dAc = isoBr(((fd.cats||[])[0]||{}).data||"") || (bi && bi.de) || null;
      const vs0 = dAc ? (g.vinculos||[]).filter(v=>v.tipo!=="Benefício" && v.inicio && (isoBr(v.inicio) || chaveComp(String(v.inicio).slice(-7))+"-01") <= dAc) : [];
      const cobre = vs0.filter(v=>fimV(v) >= somarMeses(dAc, -1)), u = cobre.slice().sort((a, b)=>fimV(a) < fimV(b) ? 1 : -1)[0];
      if(u && /individual|facultativ/i.test(u.tipo||"") && !cobre.some(v=>/empregad|avulso|dom[ée]stic|especial/i.test(v.tipo||"")))
        return {f, est:"info", selo:"imped", forte, falta:[], prazo:null, ramos, impedido:`Na data do acidente (${fmtBarra(dAc)}) contribuía como ${String(u.tipo).toLowerCase()}: o auxílio-acidente é só do empregado, do doméstico, do avulso e do segurado especial (Lei 8.213, art. 18, § 1º).`}; }
    if(apos && PA_IMPEDE.has(f.chave))
      return {f, est:"info", selo:"imped", forte, falta:[], prazo:null, ramos, impedido:`Já recebe ${apos.especie.toLowerCase()}${apos.nb ? ` (NB ${apos.nb})` : ""}: ${PA_IMPEDE_POR[f.chave]}.${f.chave==="especial" && (fd.ppps||[]).length ? " Este PPP serve para revisar a aposentadoria já concedida (veja Revisão), e não para pedir outra." : ""}`};
    return {f, est, selo: est==="crit" && !prazo ? "risco" : est, forte, falta, prazo, ramos};
  // F235 · depois do prazo correndo, o motivo da visita que o dossiê mostra: o bebê (salário-maternidade) e os papéis da roça ou da pesca
  }).filter(Boolean).sort((a,b)=>(a.selo==="imped"?1:0)-(b.selo==="imped"?1:0) || _paTopo(b) - _paTopo(a) || MAPA_ORDEM[a.est]-MAPA_ORDEM[b.est]);
  // F235 · o catálogo da espécie ajusta os cartões (o serviço do pré-caso fala pelos seus requisitos)
  for(const f of PA_TRAB_AJUSTE) try{ f(c, ks, trabalhos, {g, an, ct, gr, fd}); }catch(e){}
  return {fam, fatos, grupos, BL, gr, ct, fd, g, an, trabalhos};
}
