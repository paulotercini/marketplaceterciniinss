// ── ⚖️ o PROCESSO COMPLETO (coleta 'pje-processo') ───────────────────────
// A janela do processo no PJe tem a cronologia INTEIRA — e a extensão agora
// entrega ela toda, para preencher o passado de um caso que acabou de chegar.
// História não é novidade: cada movimento é gravado com criado_em = a DATA DO
// PRÓPRIO MOVIMENTO, então o que é antigo nasce fora da janela de 30 dias das
// 📣 Novidades em vez de inundá-la — só o que de fato aconteceu neste mês
// aparece lá. A dedupe conversa com a do acervo pelos MOMENTOS (ver acima).
let planoPjeProcAtual = null;
// ══════════════════════════════════════════════════════════════════════════
// F184 · O CONTEÚDO DO ANDAMENTO. A extensão (1.13) baixa, na sessão logada,
// a sentença/decisão/despacho/acórdão/laudo e guarda no bucket privado; a
// coleta traz o `caminho`. Aqui ele vira linha em `anexos`, presa ao caso e ao
// andamento, com o TEXTO extraído — é o texto que responde "o que foi
// decidido?" sem abrir o portal. Documento de movimento já conhecido também
// entra: as coletas antigas não traziam documento nenhum.
// ══════════════════════════════════════════════════════════════════════════
// `momento` (processo:dataThora): o andamento gravado por coleta antiga tem
// outra chave (o texto mudou), e é pelo momento que ele é achado
function docsDoMovimento(lista, k, origem, docs, oid, momento){
  for(const d of (docs||[])) if(d && d.caminho)
    lista.push({caso_id:k.id, cliente_id:k.cliente_id||null, origem, caminho:d.caminho,
                nome:d.nome||"documento", andamento_oid:oid, momento:momento||null});
}
// o texto do documento guardado: PDF pelo pdf.js (linhas na ordem da folha),
// HTML pelo próprio navegador. PDF digitalizado devolve null — sem OCR.
async function textoDoDocumento(caminho, semErroDoPdf){
  const r = await fetch(await linkArquivo(caminho, 300));
  if(!r.ok) throw new Error("HTTP "+r.status);
  const tipo = (r.headers.get("content-type")||"").split(";")[0];
  const blob = await r.blob();
  // o Storage devolve HTML como text/plain: reconhece pelo conteúdo, e tira
  // script e estilo antes de ler (o despacho do PJe embute os dois)
  if(/^text\//.test(tipo)){
    const doc = new DOMParser().parseFromString(await blob.text(), "text/html");
    doc.querySelectorAll("script,style,noscript").forEach(x=>x.remove());
    const texto = ((doc.body&&doc.body.textContent)||"").replace(/\u0000/g,"").replace(/[ \t]+/g," ").replace(/\s*\n\s*/g,"\n").trim();
    return { tipo, tamanho:blob.size, texto: texto.length>=50 ? texto : null };
  }
  if(!/pdf/.test(tipo)) return { tipo, tamanho:blob.size, texto:null };
  let lido;
  try{ lido = await lerPdfPorPagina(blob); }
  // F590 · só o PDF que o pdf.js não abre; biblioteca ou worker que não carregou fica para a rodada seguinte
  catch(e){ if(!semErroDoPdf || !window.pdfjsLib || /^cdn$|worker/i.test(String(e&&e.message||""))) throw e; return { tipo, tamanho:blob.size, texto:null }; }
  // F189 · o Postgres recusa o caractere nulo (\u0000), que alguns PDFs do e-SAJ
  // trazem no texto: a gravação falhava inteira e 148 documentos ficaram fora
  lido.texto = lido.texto.replace(/\u0000/g, "");
  return { tipo, tamanho:blob.size, texto: lido.texto.length>=50 ? lido.texto : null,
           paginas: lido.paginas, paginas_imagem: lido.imagem };
}
// F188 · PÁGINA SEM CONTEÚDO. O PDF escaneado que o PJe carimba traz, em cada
// folha, a tarja "Assinado eletronicamente por… Num. 123 - Pág. 4" e o
// endereço de conferência; o do INSS, "Página 4 de 55". Isso é texto, mas não
// é o documento: tirado o carimbo, folha com menos de 150 letras é imagem.
function paginaSemConteudo(txt){
  const miolo = String(txt||"")
    .replace(/Assinado eletronicamente por:?[^\n]*/gi, " ")
    .replace(/Num\.?\s*\d+\s*-\s*P[áa]g\.?\s*\d+/gi, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/P[áa]gina\s+\d+\s+de\s+\d+/gi, " ")
    .replace(/(Este documento foi (gerado|assinado)|Documento assinado digitalmente|N[úu]mero do documento:?)[^\n]*/gi, " ")
    .replace(/\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}(:\d{2})?/g, " ");
  return (miolo.match(/[A-Za-zÀ-ÿ]/g)||[]).length < 150;
}
// o texto do PDF, página por página, e quais páginas são só imagem
async function lerPdfPorPagina(blob){
  const lib = await carregarPdfJs();
  const doc = await lib.getDocument({data:new Uint8Array(await blob.arrayBuffer()), isEvalSupported:false}).promise;
  const textos = [], imagem = [];
  // F193 · TETO POR DOCUMENTO (11.10.2026: a importação travou a aba por
  // horas num processo enorme). Lê no máximo 2 minutos por PDF e devolve a
  // vez à página a cada folha; o arquivo continua inteiro no bucket, só o
  // texto das folhas além do teto fica sem ler.
  const t0 = Date.now();
  for(let p=1; p<=doc.numPages; p++){
    if(Date.now()-t0 > 120000) break;
    await new Promise(r=>setTimeout(r,0));
    const pag = await doc.getPage(p);
    const vp = pag.getViewport({scale:1});
    const linhas = new Map();
    for(const i of (await pag.getTextContent()).items){
      const t = (i.str||"").trim(); if(!t) continue;
      const [x, y] = vp.convertToViewportPoint(i.transform[4], i.transform[5]);
      const ch = Math.round(y);
      if(!linhas.has(ch)) linhas.set(ch, []);
      linhas.get(ch).push({x, t});
    }
    const txt = [...linhas.entries()].sort((a,b)=>a[0]-b[0])
      .map(([,l])=>l.sort((a,b)=>a.x-b.x).map(i=>i.t).join(" ")).join("\n");
    textos.push(txt);
    if(paginaSemConteudo(txt)) imagem.push(p);
    try{ pag.cleanup(); }catch(e){}
  }
  const paginas = doc.numPages;
  try{ await doc.destroy(); }catch(e){}
  return { texto: textos.join("\n").trim(), paginas, imagem };
}
// a repetição que o índice único segura não é falha: é a memória funcionando
const ehRepetido = e => !!e && (e.status===409 || /23505/.test(String(e.message||e)));
const postar = (tabela, corpo) => api(`/rest/v1/${tabela}`,{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(corpo)});
// VÁRIAS LINHAS NUMA IDA AO BANCO (eram centenas de POST em fila por coleta). O índice único dos andamentos é
// parcial e não serve a on_conflict: o lote que o banco recusa (uma repetição basta) é refeito linha a linha por
// `um`, como era antes. Só linhas com as mesmas chaves vão juntas, porque o PostgREST exige isso na lista.
async function gravarEmLote(tabela, linhas, um){
  const res = {feitos:0, falhas:[]}, grupos = new Map();
  um = um || (l => postar(tabela, l));
  for(const l of linhas){ const ch = Object.keys(l).sort().join(","); grupos.set(ch, [...(grupos.get(ch)||[]), l]); }
  for(const g of grupos.values()) for(let i=0; i<g.length; i+=100){
    const parte = g.slice(i, i+100);
    try{
      if(parte.length<2) throw 0;
      await postar(tabela, parte); res.feitos += parte.length;
    }catch(e0){
      for(const l of parte){ try{ await um(l); res.feitos++; }catch(e){ res.falhas.push({linha:l, erro:e}); } }
    }
  }
  return res;
}
// F590 · O DOCUMENTO ENTRA SEM O TEXTO. Ler o PDF de cada peça dentro do aplicar prendia a coleta por minutos (a
// pasta digital do e-SAJ traz centenas) e, se a rodada caía, a coleta voltava inteira. Aqui só se grava a linha
// do anexo (tipo nulo = texto ainda não lido); o texto vem em lerTextosPendentes, depois de a coleta sair da fila.
async function gravarDocsDaColeta(docs){
  docs = docs||[];
  if(!docs.length) return 0;
  let n = 0;
  // o que já está em anexos: uma ida ao banco por pasta (pje/<processo>, pat/<protocolo>), e não uma por documento
  const pasta = c => String(c).slice(0, String(c).lastIndexOf("/")), ja = new Map(), semLista = new Set();
  for(const p of new Set(docs.map(d=>pasta(d.caminho)))){
    try{
      if(!p) throw 0;
      for(const a of await todas("anexos", `select=id,caso_id,caminho&caminho=like.${encodeURIComponent(p)}/*`)) ja.set(a.caminho, a);
    }catch(e){ semLista.add(p); }   // sem a lista da pasta, pergunta documento a documento, como antes
  }
  const ands = new Map(), novos = [];
  for(const d of docs){
    try{
      let a = ja.get(d.caminho);
      if(!a && semLista.has(pasta(d.caminho)))
        [a] = await api(`/rest/v1/anexos?select=id,caso_id&caminho=eq.${encodeURIComponent(d.caminho)}`) || [];
      if(a){
        // F228 · até o 11.08 o importador casava o processo com o primeiro caso do
        // número, mesmo encerrado, e o documento ficou preso lá: vem ao caso aberto
        // do mesmo cliente. Em outro caso ABERTO fica, porque foi levado de propósito (moverNumero)
        const dono = D.casos.find(x=>x.id===a.caso_id), alvo = D.casos.find(x=>x.id===d.caso_id);
        if(dono && alvo && dono.id!==alvo.id && dono.encerrado_em && !alvo.encerrado_em && dono.cliente_id===alvo.cliente_id){
          await api(`/rest/v1/anexos?id=eq.${a.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
            body:JSON.stringify({caso_id:alvo.id, cliente_id:alvo.cliente_id||null})});
          a.caso_id = alvo.id; n++;
        }
        continue;
      }
      // as peças do mesmo movimento perguntam pelo andamento uma vez só
      const ch = `${d.caso_id}|${d.andamento_oid||""}|${d.momento||""}`;
      if(!ands.has(ch)){
        let [an] = d.andamento_oid ? (await api(`/rest/v1/andamentos?select=id&caso_id=eq.${d.caso_id}&origem_id=eq.${encodeURIComponent(d.andamento_oid)}&limit=1`) || []) : [];
        // o e-SAJ não dá hora (00:00): vários movimentos no mesmo dia, e o momento
        // ligaria a peça ao primeiro deles — aí só vale a chave exata
        if(!an && d.momento && !/T00:00$/.test(d.momento))
          [an] = await api(`/rest/v1/andamentos?select=id&caso_id=eq.${d.caso_id}&origem=eq.pje&origem_id=like.${encodeURIComponent(`*:${d.momento}*`)}&order=criado_em.asc&limit=1`) || [];
        ands.set(ch, an||null);
      }
      const an = ands.get(ch);
      ja.set(d.caminho, {caso_id:d.caso_id});   // o mesmo arquivo em dois movimentos entra uma vez
      novos.push({caso_id:d.caso_id, cliente_id:d.cliente_id, autor_id:eu.id,
        nome:d.nome, caminho:d.caminho, tipo:null, tamanho:null,
        origem:d.origem, andamento_id:an?an.id:null, texto:null,
        // sem andamento (movimento antigo que nunca virou andamento), a data
        // do documento é a do movimento, lida do momento (processo:dataThora)
        ...(!an && /:(\d{4}-\d{2}-\d{2})T/.test(d.momento||"") ? {criado_em:`${d.momento.match(/:(\d{4}-\d{2}-\d{2})T/)[1]}T12:00:00-03:00`} : {})});
    }catch(e){ falhasDaColeta++; console.warn("documento da coleta não gravado:", d.caminho, e); }
  }
  const r = await gravarEmLote("anexos", novos);
  for(const f of r.falhas){ if(!ehRepetido(f.erro)) falhasDaColeta++; console.warn("documento da coleta não gravado:", f.linha.caminho, f.erro); }
  n += r.feitos;
  if(r.feitos){
    textosPendentes = true;
    // no Importar à mão não há rodada automática por trás: a leitura começa já, sem prender o clique
    if(!coletaSilenciosa) setTimeout(()=>lerTextosPendentes(Date.now()).catch(()=>{}), 0);
  }
  return n;
}
// F590 · A SEGUNDA PASSADA: o texto dos documentos que entraram sem ele (tipo nulo), um por vez (o pdf.js não roda
// em paralelo), com teto de documentos e de tempo, para caber na rodada do robô (cortada aos 10 minutos: 4 do teto,
// mais os 3 do documento começado no limite, mais a abertura do CRM e a carga do fim). O que
// sobra fica para a rodada seguinte. A leitura que falha ou passa de 3 minutos grava o tipo sem o texto, para o
// mesmo PDF não prender todas as rodadas; o arquivo que nem baixa fica para depois.
// shortcut: com o CRM fechado, a sobra só é lida na rodada da próxima coleta; se pesar, o workflow passa a contar os anexos sem tipo
const TEXTO_TETO = 150, TEXTO_ATE_MS = 4*60*1000;
let textosPendentes = true, lendoTextos = false;   // nasce ligado: a sobra de outra sessão é vista uma vez
async function lerTextosPendentes(inicio){
  if(lendoTextos) return;
  lendoTextos = true;
  try{
    const fila = await api(`/rest/v1/anexos?select=id,caminho&tipo=is.null&caminho=not.is.null&origem=in.(pje,esaj,eproc,pat)&order=criado_em.desc&limit=${TEXTO_TETO}`) || [];
    let lidos = 0, vistos = 0;
    for(const a of fila){
      if(Date.now() - inicio > TEXTO_ATE_MS) break;
      vistos++;
      let lido;
      try{
        lido = await Promise.race([textoDoDocumento(a.caminho, true),
          new Promise(ok=>setTimeout(()=>ok({tipo:"application/pdf", tamanho:null, texto:null}), 180000))]);
      }catch(e){
        console.warn("texto do documento:", a.caminho, e);
        // F590 · arquivo que não existe no bucket sai da fila; rede, 5xx e o 400 de sessão vencida do Storage ficam para depois
        const st = e.status || +(/^HTTP (\d+)/.exec(e.message||"")||[])[1];
        if(st!==404 && !(st===400 && /not.?found/i.test(e.message||""))) continue;
        lido = {tipo:"application/octet-stream", tamanho:null, texto:null};
      }
      const campos = {tipo:lido.tipo||"application/octet-stream", tamanho:lido.tamanho, texto:lido.texto,
        ...(lido.paginas ? {paginas:lido.paginas, paginas_imagem:lido.paginas_imagem||[]} : {})};
      try{
        await api(`/rest/v1/anexos?id=eq.${a.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"}, body:JSON.stringify(campos)});
        Object.assign((D.anexos||[]).find(x=>x.id===a.id)||{}, campos);
        lidos++;
      }catch(e){ console.warn("texto do documento não gravado:", a.caminho, e); }
    }
    // só continua nas próximas voltas enquanto anda: fila de arquivos que não baixam não vira laço
    textosPendentes = lidos>0 && (vistos<fila.length || fila.length===TEXTO_TETO);
    return lidos;
  }finally{ lendoTextos = false; }
}
// ponytail: o DISPOSITIVO por regex — do último "ante o exposto", "julgo",
// "nego provimento"… até ~700 caracteres; classificar o resultado
// (procedente/improcedente) fica com o MCP (ler_documento) sobre o mesmo texto
// o "ante o exposto" abre o dispositivo; sem ele, o próprio comando decisório
const RE_DISPOSITIVO = [/ante o exposto|diante do exposto|pelo exposto|isto posto|posto isso|em face do exposto/gi,
  /julgo (?:procedente|improcedente|parcialmente|extinto)|nego provimento|dou (?:parcial )?provimento|homologo|defiro|indefiro/gi];
function dispositivoDe(texto){
  const t = String(texto||"").replace(/\s+/g," ").trim();
  if(!t) return "";
  const ultimo = re => { const a=[...t.matchAll(re)]; return a.length ? a[a.length-1].index : -1; };
  let ini = ultimo(RE_DISPOSITIVO[0]);
  if(ini<0) ini = ultimo(RE_DISPOSITIVO[1]);
  if(ini<0) ini = Math.max(0, t.length-600);
  const trecho = t.slice(ini);
  return trecho.length>700 ? trecho.slice(0,700)+"…" : trecho;
}
async function conferirPjeProc(coletaId){
  try{
    const [c] = await api(`/rest/v1/coletas?select=*&id=eq.${coletaId}`) || [];
    if(!c) return aviso("Não achei essa coleta");
    const c0 = c.dados || {};
    // F187 · o LOTE da rodada "completar processos" (PJe e eproc): vários
    // processos abertos numa coleta só; o de um processo é um lote de um
    const lote = Array.isArray(c0.lote) ? c0.lote : [c0];
    // o caso pelo número principal OU por qualquer processo da lista da ficha
    const casaNum = (x, dig) => soDig(x.processo)===dig
      || (Array.isArray(x.processos) && x.processos.some(q=>soDig(q && (q.numero||q))===dig));
    // o caso aberto antes do encerrado com o mesmo número
    const casoDe = dig => D.casos.find(x=>!x.encerrado_em && casaNum(x, dig)) || D.casos.find(x=>casaNum(x, dig)) || null;
    const plano = { coleta_id: coletaId, numero: lote.length>1 ? `${lote.length} processos` : (c0.numero||"?"),
                    grau: lote.length>1 ? "" : (c0.grau||""), caso_id: null, semCaso: [],
                    fichas: [], andamentos: [], docs: [], exps: [],
                    resumo: { itens:0, movimentos:0, conhecidos:0, docs:0 }, criado_em: c.criado_em };
    // a coleta parada sem caso (o processo completo que espera o vínculo) não baixa a memória a cada minuto
    const comCaso = [...new Set(lote.map(d=>soDig(d.numero)).filter(dig=>dig && casoDe(dig)))];
    // só os andamentos dos processos do lote (eram todos os do PJe, a cada coleta). Sem .catch: a leitura
    // que falha não pode virar "tudo é novo" e regravar a história inteira
    const bancoPje = comCaso.length ? await todas("andamentos",
      `select=origem_id,texto&origem=eq.pje&or=(${comCaso.map(dig=>`origem_id.like.*${dig}*`).join(",")})`) : [];
    const vistos = new Set(bancoPje.map(a=>a.origem_id));
    const momentos = momentosPje(bancoPje);
    for(const dados of lote){
    const dig = soDig(dados.numero);
    const k = casoDe(dig);
    plano.resumo.itens += (dados.itens||[]).length;
    if(!k){ plano.semCaso.push(dados.numero); continue; }
    plano.caso_id = plano.caso_id || k.id;
    const campos={};
    if(dados.classe && !k.classe_judicial) campos.classe_judicial=dados.classe;
    if(dados.orgao && !k.orgao_judicial) campos.orgao_judicial=dados.orgao;
    Object.assign(campos, camposLinkPje(k, dados.grau, dados.link, dados.numero));
    if(Object.keys(campos).length){ plano.fichas.push({caso_id:k.id, campos}); }
    // F418 · a aba Expedientes do processo (extensão 1.35), só para mostrar: grava no aplicar
    if(Array.isArray(dados.expedientes)) plano.exps.push({caso_id:k.id, chave:`${dig}|${dados.grau||""}`,
      valor:{em:dados.quando||new Date().toISOString(), grau:dados.grau||"", host:dados.host||"", itens:dados.expedientes}});
    // F509 · o cabeçalho do processo (Mais detalhes e as partes do título, extensão 1.35.1) vai a casos.ronda.detalhes
    if(dados.detalhes && typeof dados.detalhes==="object") plano.exps.push({caso_id:k.id, campo:"detalhes", chave:`${dig}|${dados.grau||""}`,
      valor:{em:dados.quando||new Date().toISOString(), grau:dados.grau||"", ...dados.detalhes}});
    for(const it of (dados.itens||[])){
      const texto=[...(it.textos||[]), ...(it.docs||[]).map(d=>`📎 ${d.nome}`)].join(" · ");
      if(!texto) continue;
      plano.resumo.docs += (it.docs||[]).length;
      const oid=`hist:${dig}:${it.data||"s-d"}T${it.hora||"00:00"}:${hashDjb(texto)}`;
      const momento=it.data&&it.hora?`${dig}:${it.data}T${it.hora}`:null;
      docsDoMovimento(plano.docs, k, dados.sistema||"pje", it.docs, oid, momento);
      if(vistos.has(oid) || momentoConhecido(momentos, momento, texto)){ plano.resumo.conhecidos++; continue; }
      vistos.add(oid); marcarMomento(momentos, momento, texto);   // dentro da própria coleta também
      plano.andamentos.push({ caso_id:k.id, origem_id:oid,
        quando: it.data?`${it.data}T${it.hora||"12:00"}:00-03:00`:null,
        texto:`${prefixoPje(dados)}${dados.grau?` (${dados.grau})`:""}: ${texto}${
          it.data?` — em ${fmt(it.data)}${it.hora?" "+it.hora:""}`:""} — ${dados.classe||"processo"} ${dados.numero}` });
      plano.resumo.movimentos++;
    }
    }
    planoPjeProcAtual = plano;
    renderColeta();
  }catch(e){
    // sem plano desta coleta, o aplicar não roda com o plano velho; a falha entra na conta da rodada
    if(planoPjeProcAtual && planoPjeProcAtual.coleta_id===coletaId) planoPjeProcAtual = null;
    falhasDaColeta++; aviso("Não consegui ler a coleta: "+e.message); }
}
async function aplicarPjeProc(coletaId){
  if(!planoPjeProcAtual || planoPjeProcAtual.coleta_id!==coletaId) return;
  // o plano desta coleta, preso aqui: outro conferir que termine no meio troca o
  // planoPjeProcAtual global, e o aplicar gravava os movimentos da OUTRA coleta e marcava esta
  // como aplicada (16.10.2026: o PJe 1º grau perdeu 7 movimentos)
  const plano = planoPjeProcAtual;
  const falhas=[]; let feitos=0, fichas=0;
  for(const f of (plano.fichas||[])){
    try{
      await patchCaso(f.caso_id, f.campos);
      Object.assign(D.casoPorId.get(f.caso_id)||{}, f.campos); fichas++;
    }catch(e){}
  }
  // F418 · os expedientes vão a casos.ronda.expedientes, lidos do caso NA HORA (a ronda tem outros escritores)
  for(const ex of (plano.exps||[])){
    const k = D.casoPorId.get(ex.caso_id); if(!k) continue;
    const c = ex.campo||"expedientes", ronda = {...(k.ronda||{}), [c]:{...((k.ronda||{})[c]||{}), [ex.chave]:ex.valor}};
    try{ await patchCaso(k.id, {ronda}); k.ronda = ronda; fichas++; }catch(e){}
  }
  const f0 = falhasDaColeta;
  const r = await gravarEmLote("andamentos", plano.andamentos.map(a=>({caso_id:a.caso_id, autor_id:eu.id, origem:"pje",
      origem_id:a.origem_id, publico:false, texto:a.texto, ...(a.quando?{criado_em:a.quando}:{})})),
    // com a data do movimento; se o banco recusar o criado_em, sem ela
    async l => { try{ await postar("andamentos", l); }
      catch(e1){ if(!l.criado_em || ehRepetido(e1)) throw e1; const {criado_em, ...sem} = l; await postar("andamentos", sem); } });
  feitos = r.feitos;
  for(const f of r.falhas){ falhas.push(String(f.erro.message||f.erro).slice(0,90)); if(!ehRepetido(f.erro)) falhasDaColeta++; }
  const docsGravados = await gravarDocsDaColeta(plano.docs);
  // gravação que falhou (sem contar a repetição) em coleta recente: fica na fila e a rodada seguinte tenta de novo.
  // Passada 1 hora sai de qualquer jeito, para a coleta com defeito não rodar para sempre
  const ficou = falhasDaColeta>f0 && Date.now() - Date.parse(plano.criado_em||0) < 60*60*1000;
  if(!ficou) await api(`/rest/v1/coletas?id=eq.${coletaId}`,{method:"PATCH",
    headers:{Prefer:"return=minimal"},
    body:JSON.stringify({aplicada_em:new Date().toISOString()})}).catch(()=>{});
  if(planoPjeProcAtual===plano) planoPjeProcAtual = null;
  await buscarColetas();
  await recarregarDaColeta();
  marcarEtapasVelhas([...(plano.andamentos||[]), ...(plano.fichas||[])].map(a=>a.caso_id)).catch(()=>{});   // F236
  if(falhas.length){
    console.warn("falhas do histórico PJe:", falhas);
    aviso(`${feitos} gravados; ${falhas.length} falharam${ficou?" — a coleta ficou na fila para tentar de novo":""} — se o banco recusou a origem 'pje', rode o schema_por_em_dia.sql`);
  }else aviso(feitos||fichas||docsGravados
    ?`✔ histórico do processo na ficha: ${feitos} movimento(s)${docsGravados?`, ${docsGravados} documento(s) (o texto é lido em seguida)`:""}${fichas?`, ficha completada (classe/órgão)`:""} — o que é antigo NÃO passa pelas Novidades`
    :"Nada novo a gravar — a ficha já tinha essa história");
}
async function aplicarPje(coletaId){
  if(!planoPjeAtual || planoPjeAtual.coleta_id!==coletaId) return;
  // o plano desta coleta, preso aqui: outro conferir que termine no meio troca o
  // planoPjeAtual global, e o aplicar gravava os movimentos da OUTRA coleta e marcava esta
  // como aplicada (16.10.2026: o PJe 1º grau perdeu 7 movimentos)
  const plano = planoPjeAtual;
  const falhas=[]; let feitos=0;
  // completa as fichas (classe/ajuizamento) antes dos movimentos; banco sem
  // as colunas novas só pula esta parte, sem derrubar o resto
  let fichas=0, fichasFalha=0;
  for(const f of (plano.fichas||[])){
    try{
      await patchCaso(f.caso_id, f.campos);
      Object.assign(D.casoPorId.get(f.caso_id)||{}, f.campos); fichas++;
    }catch(e){ fichasFalha++; }
  }
  // falha silenciosa aqui era o "117 fichas a completar" voltando toda vez:
  // o banco sem as colunas novas recusava o PATCH e ninguém ficava sabendo
  if(fichasFalha) aviso(`⚠ ${fichasFalha} ficha(s) não gravaram (classe/ajuizamento/órgão/link) — rode o schema_por_em_dia.sql no Supabase`);
  const numDe = new Map(plano.andamentos.map(a=>[a.origem_id, a.numero]));
  const r = await gravarEmLote("andamentos", plano.andamentos.map(a=>({caso_id:a.caso_id, autor_id:eu.id, origem:"pje",
    origem_id:a.origem_id, publico:false, texto:a.texto})));
  feitos = r.feitos;
  for(const f of r.falhas){ falhas.push(`${numDe.get(f.linha.origem_id)}: ${String(f.erro.message||f.erro).slice(0,90)}`);
    if(!ehRepetido(f.erro)) falhasDaColeta++; }
  const docsGravados = await gravarDocsDaColeta(plano.docs);
  await api(`/rest/v1/coletas?id=eq.${coletaId}`,{method:"PATCH",
    headers:{Prefer:"return=minimal"},
    body:JSON.stringify({aplicada_em:new Date().toISOString()})}).catch(()=>{});
  if(planoPjeAtual===plano) planoPjeAtual = null;
  await buscarColetas();
  await recarregarDaColeta();
  marcarEtapasVelhas([...(plano.andamentos||[]), ...(plano.fichas||[])].map(a=>a.caso_id)).catch(()=>{});   // F236
  if(falhas.length){
    console.warn("falhas do PJe:", falhas);
    aviso(`${feitos} gravados; ${falhas.length} falharam — se o banco recusou a origem 'pje', rode o schema_por_em_dia.sql`);
  }else aviso(feitos||fichas
    ?`✔ ${feitos} movimento(s) do PJe${fichas?`; ${fichas} ficha(s) completadas (classe/ajuizamento/órgão)`:""} — veja em 📣 Novidades`
    :"Nada novo a gravar");
}

let planoCrpsAtual = null;
// O PLANO COM A MEMÓRIA COMPLETA — usado pelo conferir E pelo aplicar.
// A lição do PAT (08.58), duas vezes: o plano lia só D.novid (30 dias) e
// todo movimento mais velho parecia novo de novo. Corrigido no conferir, o
// APLICAR ainda replanejava por conta própria com o D cru — a tela dizia
// "0 movimentos novos" e o clique respondia "877 falharam" (a trava de
// duplicação segurando a regravação da história inteira). Uma memória, um
// helper, dois usuários.
async function planoCrpsComMemoria(dados){
  // sem .catch: a memória que não veio não pode virar "tudo é novo" (a história inteira regravada nas Novidades)
  const vistos = await todas("andamentos",
    "select=origem_id&origem=eq.crps&origem_id=not.is.null");
  return planoCrps(dados,
    {...D, novid:[...(D.novid||[]), ...vistos.map(v=>({origem:"crps", origem_id:v.origem_id}))]});
}

// ══════════════════════════════════════════════════════════════════════════
// F88 · DAR DONO AO RECURSO. Mesmo caminho que o acervo do PJe já tinha: o
// número que não casou com nenhum caso deixa de morrer numa contagem e passa
// a aparecer com o nome do recorrente e três saídas — vincular ao caso
// sugerido, escolher à mão, ou ignorar de vez. Vincular é acrescentar o NUP
// em casos.crps_nups; da coleta seguinte em diante ele entra sozinho, com
// todos os movimentos.
// ══════════════════════════════════════════════════════════════════════════
function crpsIgnorados(){
  const v = cfgApp("crps_ignorar");
  if(Array.isArray(v)) return v;
  try{ return JSON.parse(v||"[]"); }catch(e){ return []; }
}
async function ignorarRecursoCrps(nup){
  const lista=[...new Set([...crpsIgnorados(), String(nup).replace(/\D/g,"")])];
  await guardarCfgApp("crps_ignorar", JSON.stringify(lista));
  aviso("\ud83d\udeab N\u00e3o pergunto mais por este recurso \u2014 desfaz-se no \u201climpar ignorados\u201d", false);
  if(planoCrpsAtual) conferirCrps(planoCrpsAtual.coleta_id); else render();
}
async function limparIgnoradosCrps(){
  await guardarCfgApp("crps_ignorar","[]");
  aviso("Ignorados do Recurso limpos \u2014 voltam a aparecer na pr\u00f3xima confer\u00eancia", false);
  if(planoCrpsAtual) conferirCrps(planoCrpsAtual.coleta_id); else render();
}
// o vinculo em si: o NUP ENTRA na lista do caso, nunca substitui a que existe
async function nupNoCaso(nup, k, nomeCli){
  const nova=[...new Set([...(nupsDoCaso(k)), String(nup).replace(/\D/g,"")])];
  try{ await patchCaso(k.id, {crps_nups:nova}); }
  catch(e){ return aviso("N\u00e3o gravou: "+String(e.message||e).slice(0,110)); }
  k.crps_nups=nova;
  aviso("\ud83d\udda5 Recurso "+formatarNup(nup)+" vinculado ao caso de "+String(nomeCli||"").split(" ")[0], false);
  if(planoCrpsAtual) conferirCrps(planoCrpsAtual.coleta_id);
}
async function vincularRecursoCrps(nup){
  const x=((planoCrpsAtual||{}).semCaso||[]).find(y=>y.nup===nup);
  if(!x || !x.sugestao) return;
  const k=D.casoPorId.get(x.sugestao.caso_id);
  if(!k) return aviso("Esse caso saiu da lista \u2014 confira de novo");
  if(nupsDoCaso(k).length) return aviso("Esse caso j\u00e1 ganhou outro NUP \u2014 confira na ficha");
  await nupNoCaso(nup, k, x.sugestao.cliente_nome);
}
async function vincularTodosCrps(){
  const alvos=((planoCrpsAtual||{}).semCaso||[]).filter(x=>x.sugestao);
  if(!alvos.length) return;
  if(!await confirmar("Vincular "+alvos.length+" recurso(s) aos casos dos clientes de mesmo nome?\n\nS\u00f3 entra onde o nome bate com UM cliente e ele tem UM caso ativo sem NUP.")) return;
  let n=0;
  for(const x of alvos){
    const k=D.casoPorId.get(x.sugestao.caso_id);
    if(!k || nupsDoCaso(k).length) continue;
    const nova=[...new Set([...(nupsDoCaso(k)), x.nup])];
    try{ await patchCaso(k.id, {crps_nups:nova}); k.crps_nups=nova; n++; }catch(e){}
  }
  aviso("\ud83d\udda5 "+n+" recurso(s) vinculados \u2014 replanejando");
  conferirCrps(planoCrpsAtual.coleta_id);
}
function escolherCasoCrps(nup){
  const x=((planoCrpsAtual||{}).semCaso||[]).find(y=>y.nup===nup);
  if(!x) return;
  caixa(`<h3 style="margin:0 0 2px">\ud83d\udda5 ${esc(formatarNup(x.nup))}</h3>
    <p class="meio-sub" style="margin:0 0 8px">${esc(x.nome||"recorrente n\u00e3o informado")}${x.num_proc?` \u00b7 NB ${esc(x.num_proc)}`:""}${x.status?` \u00b7 ${esc(x.status)}`:""}</p>
    <input id="esc-crps-busca" placeholder="nome do cliente no CRM\u2026" autocomplete="off"
      style="width:100%;padding:7px 10px;border:1px solid var(--borda);border-radius:8px;font-size:14px"
      oninput="filtrarEscolhaCrps('${x.nup}')">
    <div id="esc-crps-lista" style="max-height:52vh;max-height:52dvh;overflow:auto;margin-top:8px"></div>`);
  const inp=document.getElementById("esc-crps-busca");
  inp.value=String(x.nome||"").split(/\s+/).slice(0,2).join(" ");
  filtrarEscolhaCrps(x.nup);
  inp.focus(); inp.select();
}
function filtrarEscolhaCrps(nup){
  const el=document.getElementById("esc-crps-lista"); if(!el) return;
  const q=dsa((document.getElementById("esc-crps-busca")||{}).value||"").trim();
  const cands=q.length<2?[]:D.clientes.filter(c=>dsa(c.nome).includes(q)).slice(0,12);
  el.innerHTML = !cands.length
    ? `<p class="meio-sub">${q.length<2?"digite ao menos 2 letras do nome":"nenhum cliente do CRM com esse nome \u2014 confira a grafia no cadastro"}</p>`
    : cands.map(c=>{
      const casos=(D.casosDoCliente.get(c.id)||[]).filter(x=>x.fase!=="encerrado");
      return `<div style="padding:7px 0;border-bottom:1px solid var(--borda)">
        <b>${esc(c.nome)}</b>
        ${casos.map(x=>{ const tem=nupsDoCaso(x);
          return `<div class="meio-sub" style="display:flex;gap:6px;align-items:center;margin-top:3px;flex-wrap:wrap">
            ${esc(tituloCaso(x))}${tem.length?` <small>\u00b7 j\u00e1 tem o ${esc(formatarNup(tem[0]))}</small>`
              :` <button class="btn-mini" onclick="vincularEscolhidoCrps('${nup}','${x.id}')" title="vincular aqui"><span aria-hidden="true">Vincular</span><span class="sr-only">vincular aqui</span></button>`}
          </div>`;}).join("") || `<div class="meio-sub" style="margin-top:3px">sem caso ativo</div>`}
        <button class="btn-mini" style="margin-top:5px"
          onclick="criarCasoCrpsPara('${nup}','${c.id}')">\u2795 caso no Conselho novo p/ ${esc(c.nome.split(" ")[0])}</button>
      </div>`;}).join("");
}
async function vincularEscolhidoCrps(nup, casoId){
  const k=D.casoPorId.get(casoId); if(!k) return;
  const c=D.cliPorId.get(k.cliente_id)||{nome:""};
  fecharCaixa();
  await nupNoCaso(nup, k, c.nome);
}
// caso novo ja com o NUP: o segundo recurso do mesmo cliente, ou o cliente
// cujos casos ativos ja estao todos numerados
async function criarCasoCrpsPara(nup, cliId){
  const x=((planoCrpsAtual||{}).semCaso||[]).find(y=>y.nup===nup);
  const c=D.cliPorId.get(cliId);
  if(!x || !c) return;
  if(!await confirmar("Criar um caso no Conselho de Recursos para "+c.nome+" com o recurso "+formatarNup(nup)+"?")) return;
  fecharCaixa();
  const base={cliente_id:c.id, titulo:c.nome,
    fase:"conselho", origem_lista:"\ud83d\udda5 Conselho de Recursos", crps_nups:[nup]};
  let k;
  try{
    [k]=await api("/rest/v1/casos",{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify(base)}) || [];
  }catch(e){ return aviso("N\u00e3o criou: "+String(e.message||e).slice(0,110)); }
  if(k){
    D.casos.push(k); D.casoPorId.set(k.id,k);
    if(!D.casosDoCliente.has(c.id)) D.casosDoCliente.set(c.id,[]);
    D.casosDoCliente.get(c.id).push(k);
  }
  aviso("\u2795 Caso criado para "+c.nome.split(" ")[0]+" com o recurso "+formatarNup(nup), false);
  conferirCrps(planoCrpsAtual.coleta_id);
}
async function conferirCrps(coletaId){
  try{
    const [c] = await api(`/rest/v1/coletas?select=*&id=eq.${coletaId}`) || [];
    if(!c) return aviso("Não achei essa coleta");
    planoCrpsAtual = await planoCrpsComMemoria(c.dados);
    planoCrpsAtual.coleta_id = coletaId;
    render();
  }catch(e){ aviso("Não consegui ler a coleta: "+e.message); }
}

// RECOLHER NÃO PODE APAGAR O QUE FOI ACRESCENTADO.
//
// O portal devolve a lista de movimentos e mais nada. O ACÓRDÃO guardado no
// CRM e o RESUMO da decisão não vêm de lá: o primeiro é o PDF que o robô
// baixou e gravou, o segundo é o que ele leu do PDF — e o que a equipe
// corrigiu à mão por cima. Trocar o bloco inteiro pelo que a consulta trouxe
// apagou os dois de uma vez, e a ficha do recurso ficou só com a linha do
// tempo. Foi o que aconteceu.
//
// Agora o bloco é FUNDIDO: o portal manda no que é dele (situação, órgão
// atual, movimentos novos) e o que foi acrescentado por fora permanece.
// Evento que sumiu da resposta também fica — perder histórico é pior que
// carregar uma linha a mais.
function fundirBlocoCrps(antigo, novo){
  if(!antigo) return novo;
  const marca = a => String(a.id || a.nome || "");
  const antes = new Map((antigo.eventos||[]).map(e => [CRPS.chaveEvento(e), e]));

  const eventos = (novo.eventos||[]).map(e => {
    const velho = antes.get(CRPS.chaveEvento(e));
    if(!velho) return e;
    const guardados = new Map((velho.arquivos||[]).map(a => [marca(a), a]));
    const arquivos = (e.arquivos||[]).map(a => {
      const v = guardados.get(marca(a));
      if(!v) return a;
      guardados.delete(marca(a));
      return { ...a, ...(v.storage?{storage:v.storage}:{}), ...(v.resumo?{resumo:v.resumo}:{}) };
    });
    // arquivo que o portal parou de listar, mas que já está guardado aqui
    for(const v of guardados.values()) arquivos.push(v);
    return { ...e, arquivos, ...(velho.resumo && !e.resumo ? {resumo:velho.resumo} : {}) };
  });
  const vistas = new Set(eventos.map(e => CRPS.chaveEvento(e)));
  for(const [ch, e] of antes) if(!vistas.has(ch)) eventos.push(e);

  return { ...antigo, ...novo, eventos };
}

async function aplicarCrps(coletaId){
  const [c] = await api(`/rest/v1/coletas?select=*&id=eq.${coletaId}`) || [];
  if(!c) return aviso("Não achei essa coleta");
  const p = await planoCrpsComMemoria(c.dados).catch(e=>{ aviso("Não consegui ler a memória dos recursos: "+e.message); throw e; });
  if(!p.resumo.lidos){
    // F598 · a entrega final da rodada em lotes pode vir sem item: os recursos já foram nos lotes
    if(!(c.dados||{}).lotes) return aviso("A coleta veio vazia");
    await api(`/rest/v1/coletas?id=eq.${coletaId}`,{method:"PATCH", headers:{Prefer:"return=minimal"},
      body:JSON.stringify({aplicada_em:new Date().toISOString()})}).catch(()=>{});
    planoCrpsAtual = null; await buscarColetas(); return;
  }
  const falhas = []; let feitos = 0;
  const tentar = async (rot, f) => { try{ await f(); feitos++; }
    catch(e){ falhas.push(`${rot}: ${String(e.message||e).slice(0,120)}`); } };

  // o bloco do recurso: é ele que a aba 🖥 Recurso lê
  for(const b of p.blocos) await tentar(b.nup, async () => {
    const k = D.casoPorId.get(b.caso_id); if(!k) return;
    const so = x => String(x||"").replace(/\D/g,"");
    const antigo = blocosDoCaso(k).find(x => so(x.nup) === b.nup);
    const outros = blocosDoCaso(k).filter(x => so(x.nup) !== b.nup);
    const novo = fundirBlocoCrps(antigo, b.bloco);
    // extensão 1.34 · lido pelo login do cliente, o recurso deixa de ser consulta manual
    if(c.dados && c.dados.login === "cliente" && (novo.eventos||[]).length) delete novo.manual;
    const crps = [...outros, novo];
    await patchCaso(k.id, {crps});
    k.crps = crps;
  });
  // e cada movimento novo, que é o que aparece em 📣 Novidades
  const nupDe = new Map(p.andamentos.map(a=>[a.origem_id, a.nup]));
  const lote = await gravarEmLote("andamentos", p.andamentos.map(a=>({caso_id:a.caso_id, autor_id:eu.id, texto:a.texto,
    origem:"crps", origem_id:a.origem_id, publico:false,
    ...(a.quando?{criado_em:a.quando+"T12:00:00"}:{})})));
  feitos += lote.feitos;
  for(const f of lote.falhas){ falhas.push(`mov ${nupDe.get(f.linha.origem_id)}: ${String(f.erro.message||f.erro).slice(0,120)}`);
    if(!ehRepetido(f.erro)) falhasDaColeta++; }
  // F192 · a decisão do CRPS conta o recurso (30 dias, art. 77 do Regimento)
  // da data do evento no e-Recursos; decisão mais nova substitui a anterior
  // F236 · e grava o efeito, como a janela Decisão: o provimento é resultado deferido (desliga o "Recorrer até"),
  // a negativa tira o deferido de antes; o que só cita o acórdão (cumprir, cumprido, análise) já não é decisão.
  // Na Câmara o provimento só é nosso se o recurso especial foi nosso
  for(const a of p.andamentos){
    const k = a.decisao && a.quando && D.casoPorId.get(a.caso_id);
    if(!k || a.quando <= (k.decisao_em||"")) continue;
    const muda = {decisao_em:a.quando};
    if(a.efeito==="favoravel" && (a.instancia!==2 || k.re_protocolado_em)) muda.resultado = "deferido";
    else if(["desfavoravel","parcial"].includes(a.efeito) && k.resultado==="deferido") muda.resultado = null;
    await tentar(`decisão ${a.nup}`, async () => { await patchCaso(k.id, muda); Object.assign(k, muda); });
  }
  // F236 · a sessão remarcada ou cancelada no e-Recursos leva junto o julgamento que JÁ estava na agenda e as
  // tarefas dele; julgamento novo não nasce aqui: a aba Recurso e o cartão da pauta o propõem num clique
  for(const a of p.andamentos.filter(x=>x.sessao && x.sessao.acao!=="pauta").sort((x,y)=>(x.quando||"")<(y.quando||"")?-1:1))
    await tentar(`sessão ${a.nup}`, () => sessaoNaAgenda(a.caso_id, a.sessao));

  await api(`/rest/v1/coletas?id=eq.${coletaId}`,{method:"PATCH",
    headers:{Prefer:"return=minimal"},
    body:JSON.stringify({aplicada_em:new Date().toISOString()})}).catch(()=>{});
  planoCrpsAtual = null;
  await buscarColetas(); await recarregarDaColeta();
  marcarEtapasVelhas([...p.blocos, ...p.andamentos].map(x=>x.caso_id)).catch(()=>{});   // F236 · só a marca para o portal
  const d = p.resumo.decisoes;
  // o número que importa é o de MOVIMENTOS: os blocos dos recursos são
  // atualizados sempre (merge não-destrutivo) e não são notícia
  aviso(falhas.length
    ? recadoDeFalhas(feitos, falhas)
    : `✔ ${p.resumo.movimentos} movimento(s) novo(s)${d?`, ${d} com decisão`:""}; ${p.blocos.length} recurso(s) com o quadro atualizado`);
  if(falhas.length) console.warn("falhas do CRPS:", falhas);
}

// ══════════════════════════════════════════════════════════════════════════
// F192 · OS PRAZOS DOS TRIBUNAIS. A extensão lê a tela de prazos de cada
// portal (PJe: Expedientes; eproc: prazo em aberto e decurso; e-SAJ:
// intimações) e o CRM guarda a lista no caso (`prazos_tribunal`), trocando a
// do mesmo sistema+host a cada coleta: o que sumiu da tela foi respondido.
// Não move caso de lista nem troca o prazo do escritório sozinho — o quadro
// mostra o prazo do tribunal e um clique o faz prazo fatal do caso.
// ══════════════════════════════════════════════════════════════════════════
const ROT_PRAZO = {pje:"PJe", eproc:"eproc", esaj:"e-SAJ"};
// a data que cobra ação: o fim do prazo; sem ele, a ciência tácita (10 dias
// da disponibilização, art. 5º, § 3º, da Lei 11.419/2006), quando o prazo começa
const dataDoPrazo = it => it.fim || (it.expedido_em ? somaDias(it.expedido_em, 10) : null);
async function aplicarPrazos(coletaId){
  const [c] = await api(`/rest/v1/coletas?select=*&id=eq.${coletaId}`) || [];
  if(!c) return aviso("Não achei essa coleta");
  const d = c.dados || {};
  const origem = `${d.sistema||""}:${d.host||""}`;
  const soDig = x => String(x||"").replace(/\D/g,"");
  const casaNum = (x, dig) => soDig(x.processo)===dig
    || (Array.isArray(x.processos) && x.processos.some(q=>soDig(q && (q.numero||q))===dig));
  const casoDe = dig => D.casos.find(x=>!x.encerrado_em && casaNum(x, dig)) || D.casos.find(x=>casaNum(x, dig)) || null;
  const porCaso = new Map(); let semCaso = 0;
  for(const it of (d.itens||[])){
    const k = casoDe(soDig(it.numero));
    if(!k){ semCaso++; continue; }
    if(!porCaso.has(k.id)) porCaso.set(k.id, []);
    porCaso.get(k.id).push({...it, sistema:d.sistema, origem, lido_em:d.quando||c.criado_em});
  }
  const falhas = []; let feitos = 0, novos = 0;
  // o caso que tinha prazo desta origem e não tem mais também é regravado (respondido)
  const alvos = D.casos.filter(k => porCaso.has(k.id) || (k.prazos_tribunal||[]).some(p=>p.origem===origem));
  const chave = p => `${p.numero}|${p.ato_id||p.ato}|${p.expedido_em||""}`;
  for(const k of alvos){
    const antes = (k.prazos_tribunal||[]).filter(p=>p.origem===origem);
    const agora = porCaso.get(k.id)||[];
    // coleta com jurisdição que o PJe não abriu (d.faltou): o que não veio
    // não foi respondido, só não foi lido — fica o que já estava
    const ficam = (d.faltou||[]).length ? antes.filter(a=>!agora.some(p=>chave(p)===chave(a))) : [];
    const lista = [...(k.prazos_tribunal||[]).filter(p=>p.origem!==origem), ...ficam, ...agora];
    try{
      await patchCaso(k.id, {prazos_tribunal:lista}); k.prazos_tribunal = lista; feitos++;
      // F304 · o prazo novo deixou de ser novidade em 📣: o Paulo controla o expediente à mão
      novos += agora.filter(p=>!antes.some(a=>chave(a)===chave(p))).length;
    }catch(e){ falhas.push(`${tituloCaso(k)}: ${String(e.message||e).slice(0,100)}`); }
  }
  await api(`/rest/v1/coletas?id=eq.${coletaId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({aplicada_em:new Date().toISOString()})}).catch(()=>{});
  await buscarColetas(); await recarregarDaColeta();
  aviso(falhas.length ? recadoDeFalhas(feitos, falhas)
    : `✔ ${(d.itens||[]).length} prazo(s) do ${ROT_PRAZO[d.sistema]||d.sistema}: ${novos} novo(s) em ${porCaso.size} caso(s)${semCaso?` · ${semCaso} sem caso no CRM`:""}${(d.faltou||[]).length?` · ⚠ o portal não abriu: ${d.faltou.join("; ")}`:""}`);
}

// O QUE DIZER QUANDO A GRAVAÇÃO FALHA.
//
// A mensagem do banco importa mais que a contagem. PGRST204 quer dizer coluna
// que não existe, e a correção está no SQL, não no app — mas "o banco está
// desatualizado" sozinho manda procurar agulha no palheiro: o schema tem
// dezenas de colunas e não dá para saber qual. O PostgREST diz o nome no
// próprio erro ("Could not find the 'der' column of 'casos'"); é só repassar.
function recadoDeFalhas(feitos, falhas){
  const falta = falhas.find(f=>/PGRST204|Could not find the/.test(f));
  if(!falta) return `${feitos} gravadas, ${falhas.length} falharam`;
  const q = falta.match(/'([^']+)' column of '([^']+)'/);
  return "O banco está desatualizado"
    + (q ? ` — falta a coluna ${q[2]}.${q[1]}` : "")
    + ". Rode o schema_por_em_dia.sql no Supabase e tente de novo.";
}

// ── marcar frases numa anotação ───────────────────────────────────────────
// Pedir duas coisas de uma vez é o caso comum — "pede o PPP" E "avisa o
// cliente". Vale para o encaminhamento e para o compositor da ficha (que é
// onde nascem as tarefas), então a regra é uma só, escrita uma vez:
//
//   · a frase já está no campo  → sai (desmarcar)
//   · a última linha é texto solto sendo digitado → a frase o completa
//   · nos demais casos → entra como mais um item
//
// Com mais de um item o texto vira lista com "•", para o colaborador ler dois
// pedidos e não uma frase emendada na outra. O que foi escrito à mão é uma
// linha como as outras e nunca se perde.
function semMarcador(l){ return String(l||"").replace(/^[•\-]\s*/,"").trim(); }
function emItens(linhas){
  const l = linhas.filter(Boolean);
  return l.length>1 ? l.map(x=>"• "+x).join("\n") : (l[0]||"");
}
function alternarFrase(inp, frase, conhecidas){
  const linhas = (inp.value||"").split("\n").map(semMarcador);
  const cheias = linhas.filter(Boolean);
  const i = cheias.findIndex(l=>dsa(l)===dsa(frase));
  if(i>=0) cheias.splice(i,1);
  else{
    const ultima = linhas.length ? linhas[linhas.length-1] : "";
    const digitando = ultima && !(conhecidas||[]).some(c=>dsa(c)===dsa(ultima));
    if(digitando) cheias[cheias.length-1] = frase;   // completa a linha em curso
    else cheias.push(frase);
  }
  inp.value = emItens(cheias);
  return i<0;                                       // true = entrou
}

// (F41) O fluxo ENCAMINHAR morreu aqui: a caixa nunca era renderizada e os
// botões nunca eram emitidos — o 📌 dar seguimento (F40) faz o mesmo, melhor.

// ── 📣 Novidades ──────────────────────────────────────────────────────────
// TUDO O QUE OS PORTAIS TROUXERAM, num lugar só, do mais novo para o mais
// velho. É a resposta para "quero ter conhecimento de todos os andamentos
// diários": em vez de caçar ficha por ficha o que mudou, a mudança vem até
// aqui e sai quando é lida.
//
// Só entra o que veio de fora (origem 'pat', 'crps' ou 'dou'). O que a
// equipe digitou já foi visto por quem digitou — misturar os dois faria a
// lista encher de coisa que ninguém precisa conferir.
//
// "Lido" é por pessoa, na tabela andamentos_lidos que já existia para os
// comentários da ficha. Marcar não apaga nada: o andamento continua na
// ficha do cliente para sempre, só sai desta caixa de entrada.
const ORIGENS_ROBO = ["pat","crps","dou","pje"];
const ROTULO_ORIGEM = {pat:"🌻 INSS", crps:"🖥 Recursos", dou:"📰 DOU", pje:"⚖️ PJe"};
// a origem "pje" junta PJe, e-SAJ e eproc: o rótulo segue o sistema do próprio andamento (F416)
function rotuloOrigem(a){
  return a.origem==="pje" ? "⚖️ "+sisCurtoDoMov(a) : (ROTULO_ORIGEM[a.origem]||a.origem);
}

function novidades(){
  const euLi = a => (a.andamentos_lidos||[]).some(l=>l.colaborador_id===eu.id);
  // F304 · o prazo do expediente o Paulo controla à mão e saiu das Novidades; a mudança repetida sai também
  const rep = repetidasDasNovidades();
  const ns = (D.novid||[]).filter(a=>!euLi(a) && !rep.has(a.id) && !/^⏰ Prazo no /.test(a.texto||""));
  // F236 · as novidades chegam a quem trabalha o caso: o administrador vê todas (é quem distribui);
  // os demais, as dos casos que são deles; a recepção, também as que pedem agendar e avisar o cliente
  if(souAdmin() && !visaoColab()) return ns;
  const recep = eu.cargo==="recepcao";
  return ns.filter(a=>{ const k = D.casoPorId.get(a.caso_id); return (k && ehDoColab(k, eu.id)) || (recep && !!eventoDaNovidade(a)); });
}
// F304 · A MESMA MUDANÇA UMA VEZ SÓ (pedido do Paulo de 30.10.2026). O acervo grava cada movimento
// sozinho e a leitura dos documentos grava o mesmo movimento junto dos que o PJe agrupa nele
// ("Disponibilizado no DJ Eletrônico em 29/10/2026 · Juntada de ato ordinatório · 📎 Ato Ordinatório");
// o e-SAJ repete o movimento em cada incidente do processo (a RPV 01 e a 02). A novidade cujas partes
// já estão todas noutra do mesmo caso e da mesma origem, lida ou não, sai da caixa; entre iguais fica a
// lida ou a mais antiga. A parte sem data própria só casa a até 3 dias, para não juntar duas petições
// iguais de semanas diferentes. Devolve repetida → a que fica.
const _partesNov = new Map(), _repNov = {sig:"", m:new Map()};
function partesDaNovidade(a){
  if(!_partesNov.has(a.id)){
    const t = String(a.texto||"");
    // PJe, e-SAJ e eproc: "Sistema (grau): parte · parte — em dd.mm.aaaa hh:mm — classe número"
    const m = a.origem==="pje" ? /^([^:]{0,60}):\s*([\s\S]*?)(?:\s+— em (\d{2})\.(\d{2})\.(\d{4})\b[\s\S]*)?$/.exec(t) : null;
    _partesNov.set(a.id, { fonte: m ? m[1] : "", dia: m && m[5] ? `${m[5]}-${m[4]}-${m[3]}` : dataSP(a.criado_em),
      ps: [...new Set((m ? m[2] : t).split(" · ").map(x=>dsa(x).replace(/\s+/g," ").trim()).filter(Boolean))] });
  }
  return _partesNov.get(a.id);
}
function repetidasDasNovidades(){
  const todas = D.novid||[];
  const euLi = a => (a.andamentos_lidos||[]).some(l=>l.colaborador_id===eu.id);
  const sig = `${todas.length}|${todas[0]&&todas[0].id}|${todas.filter(euLi).length}`;
  if(_repNov.sig===sig) return _repNov.m;
  const porCaso = new Map();
  for(const a of todas){ const g = `${a.caso_id}|${a.origem}`; if(!porCaso.has(g)) porCaso.set(g, []); porCaso.get(g).push(a); }
  const dist = (d1, d2) => Math.abs(new Date(d1) - new Date(d2)) / 864e5;
  // o sistema e o grau também ("eproc TJSP (1º grau)" ≠ "e-SAJ TJSP (1º grau)")
  const cobre = (x, y) => x.fonte===y.fonte && x.ps.every(p => y.ps.includes(p) && (/\d{2}\/\d{2}\/\d{4}/.test(p) || dist(x.dia, y.dia) <= 3));
  const antes = (y, x) => (y.criado_em||"") < (x.criado_em||"") || ((y.criado_em||"")===(x.criado_em||"") && String(y.id) < String(x.id));
  const m = new Map();
  for(const as of porCaso.values()){
    if(as.length < 2) continue;
    for(const x of as){
      if(euLi(x)) continue;
      const px = partesDaNovidade(x);
      if(!px.ps.length) continue;
      const y = as.find(y => {
        if(y===x) return false;
        const py = partesDaNovidade(y);
        if(!cobre(px, py)) return false;
        return py.ps.length > px.ps.length || euLi(y) || antes(y, x);
      });
      if(y) m.set(x.id, y.id);
    }
  }
  _repNov.sig = sig; _repNov.m = m;
  return m;
}
// F236 · a leitura da data de agendamento de cada novidade é feita uma vez por sessão (o texto não muda)
const _evNov = new Map();
// F236 · e, no e-Recursos, só a sessão que vale (eventoDoMovimento): a pauta superada pela remarcação não pede agenda
const eventoDaNovidade = a => { if(!_evNov.has(a.id)) _evNov.set(a.id, eventoNoTexto(a.texto)||null); return eventoDoMovimento(a, _evNov.get(a.id)); };
// F236 · a novidade que pede ação: prazo do tribunal, ou perícia, audiência e julgamento ainda sem agenda
function novPede(a){
  const ev = eventoDaNovidade(a);
  return ev && !evJaAgendado(a.caso_id, ev.data) ? "evento" : "";
}
// F236 · a sessão do julgamento sai do movimento de pauta mais recente do recurso, pelo texto cru do
// e-Recursos (na remarcação, a data nova vem por último: "De: … Para: …"); sem ele, do próprio aviso
function sessaoDoRecurso(k, txt){
  let ev = null, orgao = "";
  for(const b of crpsBlocos(k)) for(const e of (b.eventos||[]))
    if(/pauta/i.test(e.tipo||"") && (!ev || isoCrps(e.data) > isoCrps(ev.data))){ ev = e; orgao = b.orgao_atual || ""; }
  const fonte = ev ? (/\d{2}\/\d{2}\/\d{2}/.test(ev.bruto||"") ? ev.bruto : ev.resumo) : txt;
  const ms = [...String(fonte||"").matchAll(/(\d{2})\/(\d{2})\/(\d{4}|\d{2})(?!\d)(?:\s+(\d{2}:\d{2}))?/g)], m = ms[ms.length-1];
  return m ? {data:`${m[3].length===2?"20"+m[3]:m[3]}-${m[2]}-${m[1]}`, hora:m[4]||"", orgao} : null;
}
// F236 · o que, numa novidade, é decisão a conhecer e a decidir o passo seguinte (a exigência e a
// diligência já cobram pelo prazo registrado no caso; "conclusos para sentença" não é sentença)
const RX_NOV_DECISAO = /Conclu[íi]da - |indeferid|benef[íi]cio concedido|ac[óo]rd[ãa]o|recurso (n[ãa]o )?provido|julgad[oa] (im)?procedente|senten[çc]a|liminar|tutela|requisi[çc][ãa]o de pequeno valor|precat[óo]rio|laudo pericial/i;
// os links das novidades não lidas, um por destino (o mesmo cliente com três
// avisos abre UMA aba): PJe quando o aviso veio de lá, senão o link do PAT
function linksDasNovidades(){
  return [...new Set(novidades().map(a=>{
    const k = D.casoPorId.get(a.caso_id)||{};
    // cada origem abre no SEU portal: CRPS não herda o link do PAT — vai
    // para a consulta do e-Recursos (uma aba só, o Set deduplica)
    const l = a.origem==="pje" ? linkPjeDoAndamento(a, k)
      : a.origem==="crps" ? linkERecursos(nupNoTexto(a.texto) || crpsNups(k)[0])
      : k.processo_link;
    return (l && /^https?:\/\//i.test(l)) ? l : null;
  }).filter(Boolean))];
}
// 💬 SMBOT AO LADO DO NOME (pedido do Paulo): o painel do SMBot é um app
// Angular sem endereço por conversa — não existe link que caia direto no
// chat do cliente. O botão faz o melhor possível em UM clique: abre o
// painel e deixa o TELEFONE copiado — na busca do atendimento é só colar.
// O endereço pode ser trocado em config_app (chave smbot_url).
// F94 · o e-Recursos TEM endereço por processo: /e/p/<NUP com 17 dígitos>
// (é o endereço que os favoritos do robô guardam). A novidade do CRPS abre
// direto no recurso do cliente; só sem NUP conhecido cai na consulta geral.
// O NUP vem do próprio texto da novidade quando estiver lá; senão, do
// primeiro recurso do caso. Copiar continua: serve para colar na busca.
const E_RECURSOS = "https://consultaprocessos.inss.gov.br/";
function linkERecursos(nup){
  const n = String(nup||"").replace(/\D/g,"");
  return n.length===17 ? `${E_RECURSOS}e/p/${n}` : E_RECURSOS;
}
// o NUP como aparece no texto: "44233.139765/2025-37" ou só os 17 dígitos
function nupNoTexto(t){
  const m = String(t||"").match(/\d{5}\.?\d{6}\/?\d{4}-?\d{2}/);
  return m ? m[0].replace(/\D/g,"") : "";
}
function abrirERecursos(casoId, andId){
  const k=D.casoPorId.get(casoId)||{};
  const a=(D.novid||[]).find(x=>x.id===andId);
  const nup=nupNoTexto(a&&a.texto) || crpsNups(k)[0] || "";
  if(nup) copiar(formatarNup(nup), "NUP copiado 🖥");
  window.open(linkERecursos(nup), "_blank", "noopener");
}
function abrirSmbot(cliId){
  const c=D.cliPorId.get(cliId)||{};
  const tel=(c.telefone||"").replace(/\D/g,"");
  if(tel) copiar(tel, "Telefone copiado — cole na busca do SMBot 💬");
  window.open(cfgApp("smbot_url")||"https://www.smsolucoesdigital.com.br/", "_blank", "noopener");
}
// o costume do Paulo: viu a atualização, abre o processo. Este botão abre
// TODOS de uma vez — e quando o navegador barrar as abas extras (pop-up),
// diz exatamente onde clicar para liberar de vez.
async function abrirTodasNovidades(){
  const links = linksDasNovidades();
  if(!links.length) return aviso("Nenhuma novidade tem link para abrir");
  if(links.length>12 && !await confirmar(`Abrir ${links.length} abas de uma vez?`)) return;
  let abertas = 0;
  for(const l of links){ const w = window.open(l, "_blank", "noopener"); if(w) abertas++; }
  if(abertas < links.length)
    aviso(`Abri ${abertas} de ${links.length} — o navegador bloqueou o resto. Clique no aviso de pop-up na barra de endereço, permita para o CRM e clique de novo.`);
  else aviso(`↗ ${links.length} aba(s) abertas`, false);
}

// ── 📌 DAR SEGUIMENTO ─────────────────────────────────────────────────────
// O andamento que chega de fora (INSS, Recurso, CNJ, PJe) pede um de três
// destinos: só ler; virar compromisso (perícia/audiência → aba 🩺 + aviso
// 3 dias ÚTEIS antes para mandar mensagem ao cliente); ou virar tarefa de
// alguém (anotação + quem + quando). Um modal só resolve os três — e quando
// o texto traz perícia com data, ele abre já armado, pronto para confirmar.
function eventoNoTexto(texto){
  const t = dsa(texto||"");
  if(!/pericia|audienc|avaliacao social|comparecer|julgament/.test(t)) return null;
  // o texto do PAT traz DUAS datas ("solicitação: 12/08... agendada: 20/08
  // 12:00") — vale a que vem depois de agendada/comparecer/marcada. F40: o
  // ano pode vir com 2 dígitos ("24/08/26 14:20", como o portal escreve).
  // F71 · a data SEM palavra de agendamento por perto NÃO vale (o "Prazo:
  // 02/02/2027" de um movimento do PJe que cita perícia virava "Perícia
  // 02.02.2027" com o checkbox já ligado — a fantasma do caso real)
  const rx = /(\d{2})\/(\d{2})\/(\d{4}|\d{2})(?:\D{0,12}?(\d{1,2})[:h](\d{2}))?/g;
  const tx = String(texto||"");
  let melhor = null, m;
  while((m = rx.exec(tx))){
    const ano = m[3].length===2 ? "20"+m[3] : m[3];
    const data = `${ano}-${m[2]}-${m[1]}`;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(data) || data < hoje()) continue;
    const antes = dsa(tx.slice(Math.max(0, m.index-80), m.index));
    // F236 · "Pautado para julgamento em…", o rótulo do tradutor do e-Recursos, também marca a data
    const marcada = /agendad|comparec|marcad|designad|remarcad|pautad/.test(antes);
    const cand = { data, hora: m[4] ? `${m[4].padStart(2,"0")}:${m[5]}` : "09:00", marcada };
    if(!melhor || (cand.marcada && !melhor.marcada)) melhor = cand;
  }
  if(!melhor || !melhor.marcada) return null;
  return { data: melhor.data, hora: melhor.hora,
           tipo: /audienc/.test(t) ? "Audiência" : /julgament/.test(t) ? "Julgamento"
             : /avaliacao social/.test(t) ? "Avaliação social" : "Perícia" };
}
// "a perícia agendada" mas "o julgamento agendado": o artigo e a concordância
// saem da terminação do tipo (Julgamento/agendamento → masculino)
const evFem = tipo => !/o$/i.test(String(tipo||"").trim());
function diasUteisAntes(iso, n){
  const d = new Date(iso+"T12:00:00"); let c = 0;
  while(c < n){ d.setDate(d.getDate()-1); const w = d.getDay(); if(w!==0 && w!==6) c++; }
  const s = d.toLocaleDateString("sv");
  return s < hoje() ? hoje() : s;          // perícia depois de amanhã: avisa hoje
}
const evJaAgendado = (casoId, data) =>
  (D.eventos||[]).some(e=>e.caso_id===casoId && dataSP(e.data_hora)===data && e.status!=="cancelada");

// os itens registrados nos renders (o texto pode ter aspas e acento —
// índice em vez de interpolação no onclick). A lista só CRESCE: ficha e
// Novidades convivem lado a lado, e zerar num render invalidaria os
// botões 📌 ainda visíveis do outro painel.
let segItens = [];

// ══════════════════════════════════════════════════════════════════════════
// F89 · O ROTEIRO DA PERÍCIA. Toda perícia médica e toda avaliação social do
// escritório seguem o MESMO caminho, e ele estava na cabeça do Paulo, não no
// sistema: anotar o agendamento, tratar dos quesitos, marcar com o cliente um
// atendimento de preparação alguns dias antes (quem atende é quem agenda),
// avaliar se vale pedir documento médico novo, mandar a mensagem de lembrete
// na véspera, estudar o processo no dia anterior ao atendimento — e mover a
// conclusão do caso para esse dia de estudo, que é quando o caso volta a
// pedir alguém. Eram sete lembretes escritos à mão, um a um, em toda perícia.
// Agora nascem juntos, com as datas calculadas a partir da data da perícia, e
// cada passo pode ser desmarcado ou ter a data trocada.
//
// As datas do exemplo do Paulo (perícia 16/11 → atendimento 11/11 → estudo e
// conclusão 10/11) são exatamente as que a regra produz: 3 dias úteis antes
// para o atendimento, 1 dia útil antes dele para o estudo.
// ══════════════════════════════════════════════════════════════════════════
const ROT_QUEM_CHAVE = "pericia_quem_atendimento";
// quem costuma agendar o atendimento de preparação: o escritório escolhe uma
// vez e o CRM lembra — nada de nome fixo no código
function quemAtendimentoPadrao(){
  const id = cfgApp(ROT_QUEM_CHAVE);
  if(id && D.colPorId.get(id)) return id;
  const naoAdmin = equipeAtiva().find(c=>c.papel!=="admin" && c.id!==eu.id);
  return (naoAdmin||eu).id;
}
const optQuem = sel => equipeAtiva().map(co=>
  `<option value="${co.id}"${co.id===sel?" selected":""}>${esc(co.nome.split(" ")[0])}</option>`).join("");
function roteiroPericiaHtml(ev, textoOrigem, k){
  k = k || {};
  const atend = diasUteisAntes(ev.data, 3);
  const estudo = diasUteisAntes(atend, 1);
  const jaFeitos = /quesit/i.test(textoOrigem||"") && /apresentad|protocolad|juntad/i.test(textoOrigem||"");
  const med = ev.tipo!=="Audiência";
  // F236 · quesitos e assistente técnico são da perícia JUDICIAL; a perícia e a avaliação do INSS não têm.
  // O prazo vem do tribunal (o ato que manda apresentá-los) e a tarefa vai ao advogado do caso.
  const judicial = k.fase==="judicial" || /judicial|quesit|\bPJe\b|e-SAJ|eproc/i.test(textoOrigem||"");
  const pq = judicial ? prazoDeQuesitos(k) : null;
  // a véspera que alguém já marcou (o aviso do agendar, a ligação pedida numa anotação) não nasce de novo
  const temVesp = (D.tarefasPorCaso.get(k.id)||[]).some(t=>!t.concluida_em && t.lembrar_em && t.lembrar_em<=ev.data
    && /v[ée]spera/i.test(((D._andsFicha||[]).find(x=>x.id===t.andamento_id)||{}).texto||""));
  const quemAt = quemAtendimentoPadrao();
  const a = evFem(ev.tipo)?"a":"o";
  const tipo = esc(ev.tipo.toLowerCase());
  const linha = (id, rot, extra, marcado=true) => `<label class="rot-li"><input type="checkbox" id="${id}"${marcado?" checked":""}>
    <span class="rot-rot">${rot}</span><span class="rot-campos">${extra}</span></label>`;
  return `<details class="rot-box" open>
    <summary>📋 Roteiro d${a} ${tipo} — o que o escritório faz sempre</summary>
    <div class="rot-corpo">
      ${judicial?`<label class="rot-li"><input type="checkbox" id="rot-ques" checked>
        <span class="rot-rot">📝 Quesitos</span>
        <span class="rot-campos">
          <select id="rot-ques-tipo" onchange="rotSincronizar()">
            <option value="fazer"${jaFeitos?"":" selected"}>apresentar até</option>
            <option value="feito"${jaFeitos?" selected":""}>já apresentados (só registrar)</option>
          </select>
          <input type="date" id="rot-ques-data" value="${pq?diasUteisAntes(pq.fim,1):diasUteisAntes(ev.data,5)}"${jaFeitos?' style="display:none"':''}>
          <select id="rot-ques-quem">${optQuem(advogadoDoCaso(k))}</select>
          <span class="meio-sub">e o assistente técnico${pq?` · prazo do ${esc(ROT_PRAZO[pq.sistema]||pq.sistema||"tribunal")}: ${fmt(pq.fim)}`:""}</span>
        </span></label>`:""}
      ${linha("rot-atend", "📅 Atendimento de preparação",
        `<input type="date" id="rot-atend-data" value="${atend}" onchange="rotSincronizar()">
         <select id="rot-atend-quem" onchange="rotLembrarQuem()">${optQuem(quemAt)}</select>`)}
      ${med?linha("rot-docs", "📄 Documentos médicos novos",
        `<span class="meio-sub">pedir ao cliente até ${fmt(ev.data)}, cobrar no atendimento</span>`):""}
      ${linha("rot-vesp", "🗓 Mensagem de lembrete ao cliente",
        `<input type="date" id="rot-vesp-data" value="${diasUteisAntes(ev.data,3)}">
         <select id="rot-vesp-quem">${optQuem(quemAt)}</select>${temVesp?`<span class="meio-sub">já há uma véspera marcada no caso</span>`:""}`, !temVesp)}
      ${linha("rot-estudo", "📖 Estudar o processo",
        `<input type="date" id="rot-estudo-data" value="${estudo}" onchange="this.dataset.mao=1;rotSincronizar()">
         <select id="rot-estudo-quem">${optQuem(colAdmin().id)}</select>`)}
      ${linha("rot-concl", "⏰ Conclusão do caso",
        `<span class="meio-sub">passa para <b id="rot-concl-dia">${fmt(estudo)}</b>, o dia do estudo${k.prazo?` (o caso já tem prazo em ${fmt(k.prazo)})`:""}</span>`, judicial && !k.prazo)}
      <p class="meio-sub" style="margin:6px 0 0">As datas saem da data d${a} ${tipo}:
        atendimento 3 dias úteis antes, estudo 1 dia útil antes do atendimento. Troque à vontade —
        o estudo e a conclusão acompanham o atendimento.</p>
    </div>
  </details>`;
}
// mexeu no atendimento, o estudo e a conclusão vão junto: estudar é na
// véspera do atendimento, e a conclusão é o dia do estudo
function rotSincronizar(){
  const at=(document.getElementById("rot-atend-data")||{}).value;
  const est=document.getElementById("rot-estudo-data");
  if(at && est && !est.dataset.mao) est.value = diasUteisAntes(at, 1);
  const dia=document.getElementById("rot-concl-dia");
  if(dia && est) dia.textContent = est.value?fmt(est.value):"—";
  const tp=(document.getElementById("rot-ques-tipo")||{}).value;
  const qd=document.getElementById("rot-ques-data");
  if(qd) qd.style.display = tp==="feito" ? "none" : "";
}
async function rotLembrarQuem(){
  const v=(document.getElementById("rot-atend-quem")||{}).value;
  if(v) try{ await guardarCfgApp(ROT_QUEM_CHAVE, v); }catch(e){}
}
// ══════════════════════════════════════════════════════════════════════════
// F159 · O PRÓXIMO PASSO SAI DO PRÓPRIO MOVIMENTO. O andamento judicial
// (PJe, e-SAJ, eproc) chega com a data e o ato — "Sentença Tipo B", "Acórdão
// registrado", "Laudo juntado" — e o 📌 abria em branco, com "intimado em"
// no dia de hoje. Agora o movimento é lido: a data dele vira o "intimado em",
// o ato escolhe o prazo do catálogo e o passo vem escrito. Quem confirma é a
// pessoa; nada grava sozinho. Regras poucas e visíveis, de propósito.
function movimentoJudicial(texto){
  const t = String(texto||"");
  const m = /^(PJe|e-SAJ TJSP|eproc TJSP|CRPS)[^:]*:\s*([\s\S]*?)\s+—\s+em\s+(\d{2})\.(\d{2})\.(\d{4})/.exec(t);
  if(!m) return null;
  const num = (t.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/)||[])[0]||"";
  return { fonte:m[1], ato:m[2], data:`${m[5]}-${m[4]}-${m[3]}`, numero:num,
           jef:/\.4\.03\.63\d{2}$/.test(num), tjsp:/\.8\.26\./.test(num) };
}
function proximoPassoDoMovimento(texto){
  const mv = movimentoJudicial(texto); if(!mv) return null;
  const a = dsa(mv.ato), t = dsa(texto);
  // F236 · "Conclusos para sentença", "aguardando julgamento": a decisão ainda vai sair, nenhum prazo corre agora
  if(/conclus|aguard/.test(a)) return null;
  const direto = t.match(/prazo:?\s*(\d{2})\/(\d{2})\/(\d{4})/);
  const out = { de: mv.data, cat:null, passo:"", prazo: direto ? `${direto[3]}-${direto[2]}-${direto[1]}` : null };
  // "Deliberado em Sessão - Julgado - Mérito" é o acórdão no PJe do TRF3;
  // "Execução/Cumprimento de Sentença Iniciada" não é sentença (visto na base)
  if(/acordao|julgado virtualmente|julgamento virtual|resultado do julgamento|deliberado em sessao.*julgado|julgado - merito/.test(a)){
    out.cat="ed"; out.passo="Analisar o acórdão e decidir entre embargos de declaração e recurso."; }
  else if(/sentenca|julgad[oa] (im)?procedente/.test(a) && !/cumprimento|execucao/.test(a)){
    // F236 · procedência total: o pedido foi acolhido por inteiro e não há recurso nosso
    if(/julgad[oa] procedente/.test(a) && !/parcial|em parte|improcedente/.test(a)){
      out.favoravel=true; out.passo="Sentença procedente: sem recurso nosso. Conferir a implantação e vigiar o recurso do INSS."; }
    else { out.cat=mv.jef?"ri":"ap"; out.passo="Analisar a sentença e decidir sobre o recurso."; } }
  // F236 · a juntada das contrarrazões é a resposta (nossa ou do INSS), e não o pedido de apresentá-las
  else if(/contrarraz/.test(a) && !/juntad/.test(a)){ out.cat=mv.jef?"cri":"cap"; out.passo="Apresentar contrarrazões."; }
  else if(/laudo/.test(a)){ out.cat="laudo"; out.passo="Manifestar sobre o laudo pericial."; }
  else if(/contestacao/.test(a)){ out.cat="rep"; out.passo="Apresentar réplica à contestação."; }
  else if(/emend/.test(a)){ out.cat="emen"; out.passo="Emendar a inicial."; }
  else { const n=a.match(/prazo (?:de )?(\d+) (?:\(\w+\) )?dias/); if(n && ["5","10","15","30"].includes(n[1])) out.cat="u"+n[1]; }
  if(!out.cat && !out.prazo && !out.favoravel) return null;
  return out;
}
// F159 · o cabeçalho do movimento: o que já se fez a partir dele. Os filhos
// (responde_a) carregam o carimbo [PRAZO] e as tarefas; aqui viram uma linha.
function seguimentoHtml(filhos, tarefasDe){
  const fs=(filhos||[]).filter(x=>!x.excluir); if(!fs.length) return "";
  const partes=[];
  for(const f of fs){
    const pz=/\[PRAZO (\d{2})\.(\d{2})\.(\d{4})\]\s*([^—.]*)/.exec(f.texto||"");
    if(pz) partes.push(`⏰ ${pz[1]}.${pz[2]} ${esc(pz[4].trim().slice(0,40))}`.trim());
    for(const tf of (tarefasDe?tarefasDe(f):[])){
      const c=D.colPorId.get(tf.colaborador_id)||{};
      partes.push(`🗓 ${esc(c.inicial||"?")}${tf.papel==="revisa"?" revisa":""} ${fmt(tf.lembrar_em).slice(0,5)}${tf.concluida_em?" ✔":""}`);
    }
  }
  if(!partes.length) partes.push(`📌 ${fs.length} anotação(ões)`);
  return `<span class="seg-cab" title="seguimento já dado a este movimento">${partes.join(" · ")}</span>`;
}
function segRegistrar(casoId, texto, andId, deNovidade){
  segItens.push({casoId, texto:String(texto||""), andId:andId||null, deNovidade:!!deNovidade});
  return segItens.length-1;
}
// F107 · no tema o alfinete é um glifo de linha (o emoji vermelho pesava em
// toda linha da conversa); sem o tema segue o 📌 de sempre
const ICO_PIN = `<svg class="ico-pin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 17v5M9 3h6l-1 7 3 3H7l3-3-1-7Z"/></svg>`;
const segBtnHtml = (i, rot, cls) => `<button class="${cls||"btn-mini"}" onclick="abrirSeguimento(${i})"
  title="dar seguimento: anotar, atribuir a alguém com data, marcar prazo processual — e, se houver perícia/audiência/julgamento com data no texto, agendar">${rot||(temaV10()?ICO_PIN:"📌")}</button>`;

// F51 · o responsável padrão do escritório: o admin ativo (o Paulo) — é
// quem recebe, por padrão, a conferência do resultado de julgamento
const colAdmin = () => equipeAtiva().find(c=>c.papel==="admin") || eu;
// F130 · quem administra: edita a equipe, vê ⚙️ Configurações e o 🔄/🩺
const souAdmin = () => !!eu && eu.papel==="admin";
// F131 · a barra do colaborador é a do To Do: só as listas que a equipe já
// conhece. O admin vê a mesma barra ligando "ver como colaborador".
const visaoColab = () => !souAdmin() || ler("crm_ver_como")==="colab" || soIdentificacao();   // F249 · os níveis 0 e 1 também
// F187 · o atendente precisa do WhatsApp e das Menções (aviso de transferência e @)
const LISTAS_COLAB = ["meudia","mencoes","whatsapp","calendario","planejado","pessoas","agendaq","importante","particulares","rotinas",
  "fase:prazo","fase:escritorio","fase:inss","fase:conselho","fase:judicial","fase:peticao_inicial",
  "novocliente","contatos"];
// F220 · a barra por CARGO: o "Atribuídas a mim" é de todos (é por ele que a
// divisão de tarefas chega a quem faz); o advogado vê também as aposentadorias
// futuras, a Análise de Direito e as perícias; a recepção vê o que atende
// (cadastro, Escritório, agenda, perícias), sem as listas de processo
const LISTAS_POR_CARGO = {
  advogado: [...LISTAS_COLAB, "minhas", "fase:aposentadoria_futura", "contribuicoes", "direito", "agenda"],
  recepcao: ["meudia","mencoes","whatsapp","planejado","calendario","pessoas","agendaq","minhas","particulares","rotinas","fase:escritorio","fase:prazo","agenda","novocliente","contatos"],
};
// F660 · versão de leitura do colaborador: só as listas fixas, sem anotar nem mexer em prazo (o banco também recusa)
const soLeitura = () => !!eu && eu.papel==="colaborador" && eu.so_leitura===true;
const LISTAS_FIXAS = ["fase:escritorio","fase:inss","fase:conselho","fase:judicial","fase:peticao_inicial","fase:aposentadoria_futura","fase:marcos"];
const visaoInicialColab = () => soLeitura() ? "fase:escritorio" : soIdentificacao() ? "agendaq" : "meudia";
// F660 · na leitura, o que o colaborador já tinha continua (WhatsApp, Agenda), sem Meu Dia, Importante e Planejado, e com as listas fixas
const listasDoColab = () => soLeitura() ? [...new Set([..._listasDoColab().filter(x=>!["meudia","importante","planejado","fase:prazo"].includes(x)), ...LISTAS_FIXAS])] : _listasDoColab();
const _listasDoColab = () => soIdentificacao() ? ["agendaq", "clientes", "mencoes", ...(meuNivel()>=1||(eu&&eu.gestor_zap)?["whatsapp"]:[]), ...(podeCadastrar()?["novocliente"]:[])]   // F249 · primeiro acesso: só a 📅 Agenda do Google (e o Novo Cliente); 11.91 · REC-09: as 📥 Menções em todos os níveis; F355 · o nível 1 também o 💬 WhatsApp
  : LISTAS_POR_CARGO[(eu&&eu.cargo)||""] || [...LISTAS_COLAB, "minhas"];
// F355 · o nível 1 (WhatsApp) conversa e marca horário, mas não grava no caso: andamento, documento e tarefa são do nível 2
const podeGravarCaso = () => meuNivel()>=3;   // F396 · o nível 2 é cadastro e dossiê; a anotação passou ao 3
const soIdentificacao = () => meuNivel()<=2;   // os níveis 0 a 2 ficam na Identificação do cliente
const podeCadastrar = () => meuNivel()>=2;     // F396 · criar o cliente e mudar o cadastro, a partir do nível 2
function semCadastro(){ if(podeCadastrar()) return false; aviso("Criar o cliente e mudar o cadastro é do nível 2"); return true; }
function alternarVerComo(){
  guardar("crm_ver_como", visaoColab() ? "" : "colab");
  if(visaoColab() && !listasDoColab().includes(visao) && !(souAdmin() && ["config","auditoria"].includes(visao))) visao = visaoInicialColab();   // F253 · as telas do administrador abrem em qualquer nível
  montarSidebar(); render();
}
let segAberto = null;
function abrirSeguimento(i){
  const s = segItens[i]; if(!s) return;
  const k = D.casoPorId.get(s.casoId)||{}, c = D.cliPorId.get(k.cliente_id)||{};
  const ev = sessaoVigente(eventoNoTexto(s.texto), s.casoId);   // F236 · o julgamento vai à sessão que vale
  const jaAg = ev && evJaAgendado(s.casoId, ev.data);
  // F51 · julgamento (CRPS) não tem "preparação do cliente": o seguimento
  // certo é registrar o agendamento e conferir o RESULTADO no dia seguinte,
  // atribuído por padrão ao admin (pedido do Paulo)
  const ehJulg = ev && ev.tipo==="Julgamento";
  segAberto = {...s, ev, quem:new Set(ehJulg?[colAdmin().id]:[])};
  delete catPrazo.seg;   // F92 · o cálculo de um modal não vaza para o próximo
  const nome1 = (c.nome||"o cliente").split(" ")[0];
  caixa(`<h3 style="margin:0 0 2px">📌 Dar seguimento — ${esc(c.nome||"")}</h3>
    <p class="meio-sub" style="margin:0 0 8px;max-height:64px;overflow:hidden">“${esc(s.texto.slice(0,180))}${s.texto.length>180?"…":""}”</p>
    ${ev?`<label style="display:flex;gap:6px;align-items:center;font-size:13px;margin-bottom:8px;${jaAg?"color:var(--cinza)":""}">
      <input type="checkbox" id="seg-evt" ${jaAg?"disabled":"checked"}>
      🩺 agendar ${esc(ev.tipo)} de ${fmt(ev.data)} às ${ev.hora} na aba Perícias${jaAg?` — <b>já está agendad${evFem(ev.tipo)?"a":"o"}</b>`:""}
    </label>`:""}
    <textarea id="seg-txt" rows="2" style="width:100%;font:inherit;padding:8px;border:1px solid var(--borda);border-radius:8px"
      placeholder="anotação / o que precisa ser feito">${ev&&!jaAg?(ehJulg
        ?`⚖️ Julgamento agendado para ${fmt(ev.data)} às ${ev.hora}. Verificar o resultado no dia seguinte.`
        :`📞 Avisar ${esc(nome1)} que ${evFem(ev.tipo)?"a":"o"} ${esc(ev.tipo.toLowerCase())} foi agendad${evFem(ev.tipo)?"a":"o"} para ${fmt(ev.data)} às ${ev.hora} — oferecer atendimento de preparação antes.`):""}</textarea>
    <div class="form-linha" style="margin:8px 0 0;align-items:center;flex-wrap:wrap">
      <span class="cap-perg">Quem cuida disso?</span>
      ${equipeAtiva().map(co=>`<button class="btn-rap seg-quem${segAberto.quem.has(co.id)?" on":""}" data-col="${co.id}"
        style="padding:4px 10px${segAberto.quem.has(co.id)?";background:#E8F1FB":""}" title="${esc(co.nome)}">${esc(co.nome.split(" ")[0])}</button>`).join("")}
      <button class="btn-rap" id="seg-todos" style="padding:4px 10px" title="a equipe inteira">👥 todos</button>
      ${/* F160 · quem revisa, ao lado de quem faz: a mesma linha, porque é a
           mesma pergunta — e quem não tem revisor não precisa mexer */""}
      ${seletorRevisor("seg-rev")}
    </div>
    <div class="form-linha" style="margin:8px 0 0;align-items:center;flex-wrap:wrap">
      <span class="cap-perg">Lembrar quando?</span>
      <input type="date" id="seg-data" onchange="atualizarFraseSeg()" value="${ev?(ev.tipo==="Julgamento"?proxDiaUtil(somaDias(ev.data,1)):hoje()):""}">
      ${ev?`<button class="btn-mini" title="um dia útil depois de ${fmt(ev.data)} — para conferir o resultado"
        onclick="document.getElementById('seg-data').value='${proxDiaUtil(somaDias(ev.data,1))}'">dia seguinte</button>
      <button class="btn-mini" title="um dia útil antes de ${fmt(ev.data)}"
        onclick="document.getElementById('seg-data').value='${diasUteisAntes(ev.data,1)}'">véspera</button>
      <button class="btn-mini" onclick="document.getElementById('seg-data').value='${diasUteisAntes(ev.data,3)}'">3 dias úteis antes</button>`:""}
      <button class="btn-mini" onclick="document.getElementById('seg-data').value='${hoje()}'">hoje</button>
      <button class="btn-mini" onclick="document.getElementById('seg-data').value='${maisDias(1)}'">+1 dia útil</button>
      <button class="btn-mini" onclick="document.getElementById('seg-data').value='${maisDias(7)}'">+1 semana</button>
    </div>
    <div class="form-linha" style="margin:8px 0 0;align-items:center;flex-wrap:wrap">
      <span class="cap-perg">⏰ Prazo fatal?</span>
      <input type="date" id="seg-prazo" onchange="atualizarFraseSeg()">
      ${catalogoPrazoHtml("seg")}
      <span class="meio-sub" style="font-size:12px">só se for prazo processual — a anotação sai com
        “[PRAZO]” e o caso vai para 🗓 Tarefas com Prazo</span>
    </div>
    <p class="frase-viva" id="seg-frase" style="display:block;margin:8px 0 0"></p>
    ${(ev&&!ehJulg)?roteiroPericiaHtml(ev, s.texto, k):""}
    <div class="form-linha" style="margin-top:12px">
      <button class="btn-rap" onclick="fecharCaixa()">cancelar</button>
      <button style="margin-left:auto;padding:9px 18px;border:none;border-radius:8px;background:var(--azul);color:#fff;font-weight:600;cursor:pointer"
        onclick="salvarSeguimento()">Registrar</button>
    </div>`);
  document.querySelectorAll(".seg-quem").forEach(b=>b.onclick=()=>{
    const id=b.dataset.col;
    if(segAberto.quem.has(id)){ segAberto.quem.delete(id); b.classList.remove("on"); b.style.background=""; }
    else{ segAberto.quem.add(id); b.classList.add("on"); b.style.background="#E8F1FB"; }
    atualizarFraseSeg();
  });
  const bTodos=document.getElementById("seg-todos");
  if(bTodos) bTodos.onclick=()=>{
    const todos=equipeAtiva().map(c=>c.id);
    const liga = segAberto.quem.size!==todos.length;
    segAberto.quem = new Set(liga?todos:[]);
    document.querySelectorAll(".seg-quem").forEach(b=>{
      b.classList.toggle("on", liga); b.style.background = liga?"#E8F1FB":""; });
    atualizarFraseSeg();
  };
  // F159 · o movimento judicial sugere o passo, a data da intimação e o prazo
  // F236 · com o prazo que o tribunal deu ao mesmo ato (a data dele, contada da ciência), e sem prazo no ato favorável
  const sug = s.andId ? sugestaoDoAto((D._andsFicha||[]).find(x=>x.id===s.andId) || {id:s.andId, caso_id:s.casoId, texto:s.texto, origem:"pje"}) : null;
  if(sug){
    const ta=document.getElementById("seg-txt");
    if(ta && !ta.value && sug.passo) ta.value = sug.passo;
    const de=document.getElementById("seg-de"); if(de) de.value = sug.de;
    const cat=document.getElementById("seg-cat");
    if(sug.trib && sug.prazo){ const pz=document.getElementById("seg-prazo"); if(pz) pz.value = sug.prazo; }
    else if(sug.cat && cat){ cat.value = sug.cat; aplicarCatalogoPrazo("seg"); }
    else if(sug.prazo){ const pz=document.getElementById("seg-prazo"); if(pz) pz.value = sug.prazo; }
    const base=document.getElementById("seg-cat-base");
    if(base) base.insertAdjacentHTML("beforebegin",
      `<span class="meio-sub seg-sug">💡 sugerido pelo movimento de ${fmt(sug.de)}${sug.trib && sug.prazo?` (prazo do ${ROT_PRAZO[sug.trib.sistema]||"tribunal"}: ${sug.trib.ato||"intimação"}, vence ${fmt(sug.prazo)})`:sug.prazo?` (prazo citado no texto: ${fmt(sug.prazo)})`:""}${sug.favoravel?" (ato favorável: sem prazo nosso)":""} — confira antes de registrar</span>`);
  }
  atualizarFraseSeg();
  const ta=document.getElementById("seg-txt"); ta.focus();
}
