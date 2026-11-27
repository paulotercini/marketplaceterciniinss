// A foto de perfil do WhatsApp é o que faz a lista parecer gente, e não
// planilha. Ela vive no balde privado, então a URL é assinada em LOTE — uma
// chamada para a lista inteira, e não uma por linha.
let zapFotos = new Map(), zapFotosEm = new Map();   // F471 · quando cada foto foi assinada
// F191 · a foto do perfil em tamanho grande, ao clicar
function verFotoGrande(u){
  if(!u) return;
  const d = document.createElement("div");
  d.className = "foto-grande"; d.setAttribute("role", "dialog"); d.setAttribute("aria-label", "foto do contato; clique ou Esc para fechar");
  d.innerHTML = `<img src="${esc(u)}" alt="foto do contato no WhatsApp">`;
  const fechar = () => { d.remove(); document.removeEventListener("keydown", esc_); };
  const esc_ = e => { if(e.key==="Escape") fechar(); };
  d.onclick = fechar; document.addEventListener("keydown", esc_);
  document.body.appendChild(d);
}
function fotoDoCliente(cliId){
  const zs = D.zapFicha||[];
  const z = zs.find(x=>x.cliente_id===cliId && !x.contato_nome && zapFotos.get(x.foto_url));
  if(z) return zapFotos.get(z.foto_url);
  // F340 · o telefone da ficha em que outra pessoa escreve (contato_nome) dá a foto dela, e não a do cliente
  const cli = D.cliPorId.get(cliId)||{}, t8 = String(cli.telefone||"").replace(/\D/g,"").slice(-8);
  if(t8.length===8 && zs.some(x=>x.cliente_id===cliId && x.contato_nome && String(x.telefone||"").replace(/\D/g,"").slice(-8)===t8)) return null;
  // F193 · sem conversa ainda: a foto que a ponte buscou ao cadastrar o telefone
  return zapFotos.get(cli.foto_url) || null;
}
function avatarZap(c){
  const u = zapFotos.get(c.foto_url);
  const ini = (nomeDaConversa(c)||"?").trim()[0].toUpperCase();
  // sem foto, a cor diz o estado: aberta (petróleo), não lida (azul-aço),
  // número sem cliente (âmbar), o resto em cinza
  const tom = zapAberta===c.id ? "t-on" : !c.cliente_id ? "t-sem" : c.nao_lidas ? "t-nova" : "t-neutro";
  return u ? `<img class="zap-av" src="${esc(u)}" alt="">`
           : `<span class="zap-av vazio ${tom}">${esc(c.cliente_id||c.lead_id||c.nome_perfil?ini:"?")}</span>`;
}
async function assinarFotosZap(cs){
  // F471 · o link assinado vale 1 hora: passados 50 minutos assina de novo, porque o CRM aberto o dia todo ficava sem fotos (400)
  const faltam = [...new Set(cs.map(c=>c.foto_url).filter(u=>u && !(zapFotos.has(u) && Date.now()-(zapFotosEm.get(u)||0) < 50*60e3)))];
  if(!faltam.length) return;
  try{
    const d = await api(`/storage/v1/object/sign/${BUCKET}`,{method:"POST",
      body:JSON.stringify({expiresIn:3600, paths:faltam})});
    (d||[]).forEach(x=>{ if(x.signedURL)
      { zapFotos.set(x.path, CONFIG.SUPABASE_URL.replace(/\/$/,"")+"/storage/v1"+x.signedURL); zapFotosEm.set(x.path, Date.now()); } });
  }catch(e){ /* sem foto a lista continua funcionando, com a inicial */ }
}

// F192 · quem CONVERSA nem sempre é o cliente (a mãe do Axel fala por ele):
// a conversa mostra quem fala; o cliente aparece ao lado ("mãe de Axel")
function nomeDaConversa(c){
  if(c.contato_nome) return c.contato_nome;
  const cli = c.cliente_id && D.cliPorId.get(c.cliente_id);
  if(cli) return cli.nome;
  const lead = c.lead_id && D.leads.find(l=>l.id===c.lead_id);
  return (lead && lead.nome) || c.nome_perfil || c.telefone || "desconhecido";
}

const clienteDaConversa = c => c && c.cliente_id && D.cliPorId.get(c.cliente_id);
// 27.11.2026 · ordem do Paulo (auditoria, item 9b): "Este telefone é de" na ficha (próprio, mãe, filho, cônjuge, outro
// com nome), gravado no telefone da lista (de, de_nome) e mostrado no cabeçalho da conversa
const TEL_DE = ["próprio","mãe","filho(a)","cônjuge","outro"];
const fim8 = n => String(n||"").replace(/\D/g,"").slice(-8);
function telDe(cli, tel){ const k = fim8(tel); const t = cli && k.length===8 && telefonesDe(cli).find(x=>fim8(x.numero)===k); return t && t.de ? t : null; }
const telDeTexto = t => !t ? "" : t.de==="próprio" ? "o próprio cliente" : [t.de==="outro" ? "outra pessoa" : t.de, t.de_nome].filter(Boolean).join(" · ");
// item 9a: a conversa sem ficha que fala de caso, benefício ou processo, ou cujo número já apareceu em anotação, é
// quase sempre cliente conhecido escrevendo de outro número; o alerta oferece o Vincular
const RE_ASSUNTO_CASO = /\b(processo|benef[ií]cio|aposentadori|aux[ií]lio|per[ií]cia|inss|bpc|loas|pens[aã]o|meu caso|requerimento|recurso)/i;
const falaDeCaso = msgs => (msgs||[]).some(m=>m.direcao==="entrada" && RE_ASSUNTO_CASO.test(m.texto||""));
const _zapNasNotas = new Map();   // os 8 dígitos → ids dos clientes cujas anotações citam o número (null enquanto busca)
function numeroNasNotas(tel){
  const k = fim8(tel); if(k.length!==8) return [];
  if(_zapNasNotas.has(k)) return _zapNasNotas.get(k) || [];
  _zapNasNotas.set(k, null);
  api(`/rest/v1/andamentos?select=caso_id&excluir=not.is.true&or=(texto.ilike.*${k}*,texto.ilike.*${k.slice(0,4)}-${k.slice(4)}*)&limit=20`).catch(()=>[]).then(r=>{
    _zapNasNotas.set(k, [...new Set((r||[]).map(a=>(D.casoPorId.get(a.caso_id)||{}).cliente_id).filter(Boolean))]);
    if(zapAberta) pintarConversa(); });
  return [];
}
function alertaSemFicha(c, msgs){
  if(!c || clienteDaConversa(c) || c.automatica) return "";
  const ids = numeroNasNotas(c.telefone), assunto = falaDeCaso(msgs);
  if(!ids.length && !assunto) return "";
  const nomes = ids.map(id=>D.cliPorId.get(id)).filter(Boolean);
  return `<p class="zt-pergunta zt-semficha" role="note"><b>Cliente conhecido sem ficha?</b> ${nomes.length
    ? `O número aparece em anotação de ${nomes.slice(0,2).map(x=>esc(x.nome)).join(" e ")}.` : "A conversa fala de caso, benefício ou processo."}
    <button class="zl-link" onclick="vincularConversa(${nomes.length ? `'${nomes[0].id}'` : ""})" title="Vincular a conversa à ficha do cliente">Vincular</button></p>`;
}
// o advogado responsável pelo cliente da conversa (F245), ao lado do nome (pedido do Paulo, 25.10.2026)
const advDaConversa = c => { const cli = clienteDaConversa(c); if(!cli) return "";
  return (D.colPorId.get((advogadoDoCliente(cli.id)||[])[0])||{}).nome || ""; };
// F338 · quem é o cliente, sempre à vista: quem escreve pode ser outra pessoa (pai, filho, advogado)
function clienteDaLinha(c){
  const cli = clienteDaConversa(c);
  if(!cli) return "Sem cliente vinculado";
  if(ehContato(cli)) return `${esc(rotContato(cli))}: <b>${esc(cli.nome)}</b>`; // F586 · não é cliente
  // o mesmo número pode ser de mais de um cliente (F191, F268): todos aparecem, o dono primeiro
  const outros = representadosDe(cli, String(c.telefone||"").replace(/\D/g,"").slice(-8)).map(r=>r.x.nome);
  const nomes = [cli.nome, ...outros], vis = nomes.slice(0, 2).map(n=>`<b>${esc(n)}</b>`).join(" e ");
  return `${nomes.length>1?"Clientes":"Cliente"}: ${vis}${nomes.length>2?` e mais ${nomes.length-2}`:""}${c.contato_nome?` · escreve ${c.contato_relacao?"o(a) "+esc(c.contato_relacao):"outra pessoa"}`:""}`;
}
// o nome do WhatsApp não é o do cliente e ninguém disse quem conversa: pergunta
function nomeDiferente(c){
  const cli = clienteDaConversa(c), p = dsa(c.nome_perfil||"").split(/\s+/)[0];
  return !!cli && !ehContato(cli) && !c.contato_nome && p.length>=3 && !dsa(cli.nome).split(/\s+/).includes(p);
}
function quemConversa(){
  const c = zapConvs.find(x=>x.id===zapAberta); const cli = clienteDaConversa(c); if(!c) return;
  const rels = ["mãe","pai","filho(a)","cônjuge","companheiro(a)","irmão(ã)","neto(a)","sobrinho(a)","advogado(a)","outro"];
  caixa(`<h3>Quem conversa nesta conversa?</h3>
    <p class="meio-sub">${cli?`O cliente é <b>${esc(cli.nome)}</b>. `:""}No WhatsApp o contato aparece como “${esc(c.nome_perfil||c.telefone||"")}”.</p>
    <label class="cfg-ck"><input type="radio" name="zq" value="cli" ${c.contato_nome?"":"checked"}> o próprio cliente</label>
    <label class="cfg-ck"><input type="radio" name="zq" value="outro" ${c.contato_nome?"checked":""}> outra pessoa, que fala pelo cliente</label>
    <div class="form-linha" style="margin-top:6px">
      <input id="zq-nome" placeholder="nome de quem conversa" value="${esc(c.contato_nome||c.nome_perfil||"")}" style="min-width:220px">
      <select id="zq-rel"><option value="">relação…</option>${rels.map(r=>`<option ${c.contato_relacao===r?"selected":""}>${r}</option>`).join("")}</select>
    </div>
    <div class="form-linha" style="margin-top:10px"><button class="btn-rap" id="zq-ok">Guardar</button></div>`);
  document.getElementById("zq-nome").oninput = () => { document.querySelector('[name=zq][value=outro]').checked = true; };
  document.getElementById("zq-rel").onchange = () => { document.querySelector('[name=zq][value=outro]').checked = true; };
  document.getElementById("zq-ok").onclick = async () => {
    const outro = document.querySelector('[name=zq]:checked').value==="outro";
    const nome = (document.getElementById("zq-nome").value||"").trim();
    if(outro && !nome) return aviso("Escreva o nome de quem conversa");
    const rel = document.getElementById("zq-rel").value || null;
    fecharCaixa();
    await mudarConversa(outro ? {contato_nome:nome, contato_relacao:rel}
                              : {contato_nome:null, contato_relacao:null});
    aviso(outro ? `Anotado: quem conversa é ${nome} ✔` : "Anotado: quem conversa é o próprio cliente ✔", false);
  };
}

// o contato sem cliente aparece com o nome do perfil do WhatsApp (às vezes um emoji); a equipe dá o nome (pedido do Paulo, 05.11.2026)
function nomearConversa(){
  const c = zapConvs.find(x=>x.id===zapAberta); if(!c) return;
  caixa(`<h3>Nome do contato</h3>
    <p class="meio-sub">No WhatsApp o contato aparece como “${esc(c.nome_perfil||c.telefone||"")}”. O nome vale só no CRM.</p>
    <div class="form-linha"><input id="zn-nome" value="${esc(c.contato_nome||"")}" placeholder="nome do contato" style="min-width:240px"></div>
    <div class="form-linha" style="margin-top:10px"><button class="btn-rap" id="zn-ok">Guardar</button></div>`);
  const i = document.getElementById("zn-nome"); i.focus();
  const ok = async () => { const nome = i.value.trim(); fecharCaixa();
    await mudarConversa({contato_nome:nome||null});
    aviso(nome ? `Nome do contato: ${nome} ✔` : "Nome do WhatsApp restaurado ✔", false); };
  document.getElementById("zn-ok").onclick = ok;
  i.onkeydown = e => { if(e.key==="Enter") ok(); };
}

const PREVIA_TIPO = {audio:"🎤 Áudio", imagem:"📷 Foto", video:"🎥 Vídeo", documento:"📄 Documento", figurinha:"Figurinha", localizacao:"📍 Localização", contato:"👤 Contato"};
const previaZap = t => { const k = /^\[(\w+)\]$/.exec(String(t||"").trim()); return k && PREVIA_TIPO[k[1]] || String(t||"").replace(/^\*([^*\n]{2,60}?):?\*:?\s*/, "$1: ").replace(/([*_~])(\S[^\n]*?\S|\S)\1/g, "$2"); };
function cartaoConversa(c){
  const at = c.atendente_id && D.colPorId.get(c.atendente_id);
  const cli = c.cliente_id && D.cliPorId.get(c.cliente_id);
  const s = setorDe(c), etq = etiquetasDe(c), r = retornoDe(c);
  // o cartão responde "quem, o quê, de que setor e se tem hora marcada"; o
  // resto das etiquetas fica a um passe de mouse
  return `<div class="zap-conv ${zapAberta===c.id?"on":""} ${c.nao_lidas?"nova":""}" data-zc="${c.id}">
    ${avatarZap(c)}
    <div class="zc-corpo">
      <div class="l1"><b>${esc(nomeDaConversa(c))}</b>
        <span class="hora">${c.ultima_em?quandoFalou(c.ultima_em):""}</span></div>
      <div class="l2"><span>${esc(previaZap(c.ultimo_texto).slice(0,80))}</span>${c.nao_lidas?`<span class="bolha" aria-label="${c.nao_lidas} não lidas">${c.nao_lidas}</span>`:""}</div>
      <div class="l3">
        ${at && at.id!==eu.id?(v=>`<span class="zc-at${v&&!v.resp&&!v.viu?" nao":""}" title="${v&&!v.resp?(v.viu?`${esc(at.nome)} abriu a conversa depois da última mensagem`:`${esc(at.nome)} ainda não abriu a conversa depois da última mensagem`):`atendida por ${esc(at.nome)}`}">com ${esc(at.nome.split(" ")[0])}${v&&!v.resp?(v.viu?" · viu":" · não viu"):""}</span>`)(vistoZap(c)):""}${(pl=>pl?`<span class="zc-at" title="plantão de ${esc(pl.nome)} enquanto ${esc(at?.nome||"o titular")} está offline">plantão ${esc(pl.nome.split(" ")[0])}</span>`:"")(plantaoZap(c))}
        ${advDaConversa(c)?`<span class="zc-adv" title="advogado responsável: ${esc(advDaConversa(c))}">${esc(advDaConversa(c).split(" ")[0])}</span>`:""}
        ${s?`<span class="zc-setor"><i style="background:${esc(s.cor)}"></i>${esc(s.nome)}</span>`:""}
        ${etq.slice(0,2).map(e=>`<span class="zc-etq" style="color:color-mix(in srgb, ${esc(e.cor)} 85%, #000)">${esc(e.texto)}</span>`).join("")}
        ${etq.length>2?`<span class="zc-etq" title="${esc(etq.slice(2).map(e=>e.texto).join(", "))}">+${etq.length-2}</span>`:""}
        ${!cli?"":c.contato_nome?`<span class="zc-cli">Cliente <b>${esc(cli.nome.split(" ").slice(0,2).join(" "))}</b>${c.contato_relacao?` · ${esc(c.contato_relacao)}`:""}</span>`:""}
        ${r?`<span class="zc-ret" title="${esc(r.nota||"")}">Retorno ${diaZap(r.quando)} ${horaSP(r.quando)}</span>`:""}
        ${c.bot_ativo?`<span>Robô</span>`:""}
      </div>
    </div></div>`;
}

const telaVaziaZap = () =>
  `<div class="zap-vazio"><h4>Escolha uma conversa</h4>
     <p>${zapGestor()?`À esquerda estão as conversas do escritório. Pendentes é a fila de quem
        ainda não foi atendido: é por ali que se começa o dia.`
        :`À esquerda estão as suas conversas. Novas são as que têm mensagem que você ainda não leu, e Pendentes são as que ninguém atende: assuma pelo botão verde.`}</p></div>`;

async function carregarReacoes(){
  const ids = zapMsgs.map(m=>m.id), lotes = [];
  for(let i=0;i<ids.length;i+=150) lotes.push(ids.slice(i,i+150));
  // F339 · os lotes saem juntos: em fila, a conversa de 600 mensagens esperava 4 idas ao banco
  const rss = await Promise.all(lotes.map(l=>todas("zap_reacoes",`select=mensagem_id,de,emoji&mensagem_id=in.(${l.join(",")})`).catch(()=>[])));
  const mapa = new Map();
  rss.flat().filter(r=>r.emoji).forEach(r=>{ if(!mapa.has(r.mensagem_id)) mapa.set(r.mensagem_id,[]); mapa.get(r.mensagem_id).push(r); });
  zapReacoes = mapa;
}
// F339 · a conversa já aberta nesta sessão reabre na hora com o que se viu; o banco atualiza em seguida
const _zapCache = new Map();
// F483 · o clique no nome é ler; a mensagem que chega com a conversa já aberta fica nova até outro clique ou a resposta
let zapLerAoAbrir = null;
function lerConversaZap(c){
  if(!c) return;
  // F493 · quem atende, ao abrir, deixa marcado que viu (o gestor e quem transferiu sabem que chegou)
  const minha = eu && c.atendente_id===eu.id, corpo = {};
  if(c.nao_lidas) corpo.nao_lidas = 0;
  if(minha) corpo.atendente_viu_em = new Date().toISOString();
  if(!Object.keys(corpo).length) return;
  api(`/rest/v1/zap_conversas?id=eq.${c.id}`,{method:"PATCH",
    headers:{Prefer:"return=minimal"}, body:JSON.stringify(corpo)}).catch(()=>{});
  Object.assign(c, corpo);
}
// F493 · a conversa de outra pessoa com mensagem do cliente sem resposta: quem atende já abriu depois dela?
function vistoZap(c){
  const at = c.atendente_id && D.colPorId.get(c.atendente_id);
  if(!at || !c.ultima_entrada_em) return null;
  if(c.ultima_resposta_em && c.ultima_resposta_em >= c.ultima_entrada_em) return {at, resp:true};
  return {at, viu: !!c.atendente_viu_em && c.atendente_viu_em >= c.ultima_entrada_em};
}
async function abrirConversa(id, ler){
  const mesma = zapAberta===id;   // reabrir a mesma (depois de enviar, na recarga) guarda o que está escrito e a rolagem
  if(zapAberta!==id){ zapResponder = null; zapNota = false; }
  zapPainelAberto = false;
  zapAberta = id;
  const c = zapConvs.find(x=>x.id===id); if(!c) return;
  if(ler || zapLerAoAbrir===id){ zapLerAoAbrir = null; lerConversaZap(c); }   // F483 · a recarga de 6 s não lê
  const cache = _zapCache.get(id), naTela = !!document.getElementById("zap-dir");
  if(cache && naTela){ ({msgs:zapMsgs, reacoes:zapReacoes, transf:zapTransf, hist:zapHist} = cache); mesma ? pintarConversaGuardando() : pintarConversa(); }
  if(naTela) pintarListaZap();
  // as quatro leituras saem juntas: em fila, abrir a conversa esperava cada uma
  const [ms, tr, hi] = await Promise.all([
    todas("zap_mensagens",`select=*&conversa_id=eq.${id}&order=momento,seq`).catch(()=>[]),
    todas("zap_transferencias",
      `select=de_id,para_id,motivo,tipo,setor_id,por,em&conversa_id=eq.${id}&order=em.desc&limit=8`).catch(()=>[]),
    todas("zap_atendimentos",
      `select=numero,aberto_em,observacao&conversa_id=eq.${id}&encerrado_em=not.is.null&order=aberto_em.desc&limit=5`).catch(()=>[])]);
  if(zapAberta!==id) return;   // outra conversa foi aberta enquanto esta carregava
  zapMsgs = ms; zapTransf = tr; zapHist = hi;
  const ult = ms.filter(m=>m.direcao!=="interna").pop();   // F480 · acabou de responder: tira a bolinha sem esperar a lista
  if(c.nao_lidas && ult && ult.direcao==="saida" && !ult.por_bot){ c.nao_lidas = 0; pintarListaZap(); }
  await carregarReacoes();
  if(zapAberta!==id) return;
  _zapCache.set(id, {msgs:zapMsgs, reacoes:zapReacoes, transf:zapTransf, hist:zapHist});
  if(!document.getElementById("zap-dir")) return;   // saiu da tela do WhatsApp enquanto carregava
  if(cache || mesma) pintarConversaGuardando(); else pintarConversa();
  pintarAgendaZap();
  aplicarZapDoAviso(id);
}
async function recarregarMsgs(){
  if(!zapAberta) return;
  // F332 · apagada, editada e favorita também repintam; F359 · e o externo_id que a ponte grava depois do envio, que libera Editar e Apagar
  const sig = () => zapMsgs.map(m=>`${m.id}${m.externo_id?"e":""}${(m.texto||"").length}${m.apagada_em||""}${m.editada_em||""}${m.favorita_em||""}${(m.alterar||{}).status||""}`).join("|");
  const antes = sig();
  zapMsgs = await todas("zap_mensagens",`select=*&conversa_id=eq.${zapAberta}&order=momento,seq`).catch(()=>zapMsgs);
  const reacAntes = JSON.stringify([...zapReacoes]);
  await carregarReacoes();
  // a transcrição do áudio chega segundos depois: um texto novo também repinta
  if(sig()!==antes
     || JSON.stringify([...zapReacoes])!==reacAntes) pintarConversaGuardando();
  else atualizarVistos();
}
// só os selos de entrega mudaram: repintar tudo tiraria o texto de quem está
// escrevendo no meio da frase
function atualizarVistos(){
  zapMsgs.forEach(m=>{ const el=document.getElementById("zs-"+m.id);
                       if(el){ el.textContent = seloZap(m); el.dataset.st = m.direcao==="saida" ? m.status||"" : ""; } });
}

// repintar sem perder o que está sendo escrito (chegou mensagem no meio da frase)
// F583 · a conversa grande abre com as 150 mensagens mais recentes: desenhar milhares de balões de uma vez
// derrubava a aba do Chrome. O começo da janela é guardado pelo id, para a mensagem que chega não deslocar a leitura;
// "Mostrar anteriores", a busca, a citação, a favorita e a menção ampliam a janela até a mensagem procurada
const ZAP_JAN = 150; let _zapJan = {conv:null, de:null, vis:0};
function zapIni(){
  if(_zapJan.conv!==zapAberta) _zapJan = {conv:zapAberta, de:null, vis:0};
  let ini = _zapJan.de ? zapMsgs.findIndex(m=>m.id===_zapJan.de) : -1;
  if(ini < 0){ ini = Math.max(0, zapMsgs.length - ZAP_JAN); _zapJan.de = zapMsgs[ini]?.id ?? null; }
  const ach = zapPrimeiroAchado(); if(ach >= 0 && ach < ini) ini = ach;
  return _zapJan.vis = ini;
}
function zapPrimeiroAchado(){
  const t = semAcentoZap(zapBuscaConv && zapBuscaConv.q).trim();
  return t.length < 2 ? -1 : zapMsgs.findIndex(m=>semAcentoZap(m.texto).includes(t));
}
function zapMostrarDesde(i){ _zapJan.de = zapMsgs[Math.max(0,i)]?.id ?? null; pintarConversaGuardando(); }
function zapAnteriores(){
  const cx = document.getElementById("zap-msgs"), h = cx ? cx.scrollHeight - cx.scrollTop : 0;
  zapMostrarDesde(_zapJan.vis - ZAP_JAN);
  const c2 = document.getElementById("zap-msgs"); if(c2) c2.scrollTop = c2.scrollHeight - h;   // a leitura fica onde estava
}
function pintarConversaGuardando(){
  const t = document.getElementById("zap-txt"), txt = t ? t.value : "", foco = document.activeElement===t;
  // quem está lendo mais acima não é puxado para o fim (só quem já estava no fim acompanha o que chega)
  const cx = document.getElementById("zap-msgs"), y = cx ? cx.scrollTop : 0;
  const noFim = !cx || cx.scrollHeight - cx.scrollTop - cx.clientHeight < 80;
  // o áudio que está tocando atravessa a repintura (mensagem nova chegando) sem parar
  const tocando = [...document.querySelectorAll("#zap-msgs .zap-player")].filter(x=>x.querySelector("audio"));
  pintarConversa();
  for(const a of tocando){
    const b = [...document.querySelectorAll("#zap-msgs .zap-player")].find(x=>x.dataset.p===a.dataset.p);
    if(b) b.replaceWith(a);
  }
  const cx2 = document.getElementById("zap-msgs"); if(cx2 && !noFim) cx2.scrollTop = y;
  const t2 = document.getElementById("zap-txt");
  if(t2 && txt){ t2.value = txt; travaZap(); if(foco) t2.focus(); }
}
const SELO = {rascunho:"rascunho", agendada:"agendada", fila:"na fila", enviando:"enviando", enviada:"enviada", entregue:"entregue", lida:"lida", erro:"não enviou"};
const seloZap = m => m.direcao==="saida" ? (SELO[m.status]||"") : "";

// F310 · quem fala, telefone, advogado, robô, atendente, setor, etiquetas e retorno: no computador ficam no topo da
// conversa; no celular, no cartão "Conversa" da ficha que o nome abre, para o topo caber numa linha
function dadosDaConversaZap(c){
  const cli = clienteDaConversa(c), at = c.atendente_id && D.colPorId.get(c.atendente_id);
  const deOutro = !!at && at.id!==eu.id, s = setorDe(c), r = retornoDe(c);
  const igual = !!cli && !c.contato_nome && nomeDaConversa(c)===cli.nome && !representadosDe(cli, String(c.telefone||"").replace(/\D/g,"").slice(-8)).length;
  return { sub: `             <span class="zt-fala${igual?" zt-fala-igual":""}">${clienteDaLinha(c)}</span>
             <span class="mono">${esc(foneZap(c.telefone))}</span>
             ${(t=>t?`<span class="zt-telde">Este telefone é de: <b>${esc(t)}</b></span>`:"")(telDeTexto(telDe(cli, c.telefone)))}
             ${zapAgendHtml(c)}
             ${advDaConversa(c)?`<span>Adv. <b>${esc(advDaConversa(c))}</b></span>`:""}
             ${c.bot_ativo&&c.bot_passo?`<span class="zt-robo" title="o passo do robô nesta conversa">Robô: <b>${esc(rotPasso(c.bot_passo))}</b>${c.bot_desde?` desde ${diaZap(c.bot_desde)} ${horaSP(c.bot_desde)}`:""}</span>`:""}
             ${at?(v=>`<span>Atendendo: <b>${esc(at.nome)}</b>${at.id!==eu.id&&v&&!v.resp?(v.viu
                   ?` <span class="zt-viu">· viu às ${horaSP(c.atendente_viu_em)}</span>`
                   :` <span class="zt-viu nao">· ainda não abriu a mensagem das ${horaSP(c.ultima_entrada_em)}</span>`):""}</span>`)(vistoZap(c))
                 :`<span class="zt-ninguem">Atendendo: <b>ninguém</b></span>`}
             ${(pl=>pl?`<span class="zt-plantao">Plantão: <b>${esc(pl.nome)}</b></span>`:"")(plantaoZap(c))}
             ${deOutro && zapGestor()?`<button class="zl-link" onclick="assumirConversa()">Assumir (tirar de ${esc(at.nome)})</button>`:""}
           `,
    l2: `         <button class="zt-chip${s?"":" vazio"}" onclick="escolherSetor()" title="setor da conversa" ${s?`style="${tintaZap(esc(s.cor))}"`:""}>${s
           ?`<i style="background:${esc(s.cor)}"></i>${esc(s.nome)}`:"Escolher setor"}</button>
         ${etiquetasDe(c).map(e=>`<button class="zt-chip" style="${tintaZap(esc(e.cor))}" onclick="editarEtiquetas()">${esc(e.texto)}</button>`).join("")}
         <button class="zt-chip novo" onclick="editarEtiquetas()">+ etiqueta</button>
         ${r?`<button class="zt-ret" onclick="novoRetorno()" title="mudar o retorno">${zic("relogio",14)}Retorno ${diaZap(r.quando)}, ${horaSP(r.quando)}${r.nota?` · ${esc(r.nota)}`:""}</button>`:""}
`, igual };
}

// F575 · a queda do Chrome (STATUS_BREAKPOINT) vinha com toda repintura da conversa (enviar, Reabrir):
// o botão clicado em foco é destruído no próprio clique e cada vídeo era recriado a cada 6 s.
// Agora o foco sai antes, e o vídeo já carregado volta ao lugar, como o áudio que toca.
function pintarConversa(){
  const dir = document.getElementById("zap-dir"), ae = document.activeElement;
  if(dir && ae && dir.contains(ae) && ae.id!=="zap-txt" && ae.id!=="zap-bq") ae.blur();
  const vids = new Map([...(dir?dir.querySelectorAll("video[data-mini]"):[])].map(v=>[v.dataset.mini,v]));
  pintarConversaJa();
  for(const v of (dir?dir.querySelectorAll("video[data-mini]"):[])){ const a = vids.get(v.dataset.mini); if(a && a!==v) v.replaceWith(a); }
}
function pintarConversaJa(){
  const c = zapConvs.find(x=>x.id===zapAberta); if(!c) return;
  const cli = c.cliente_id && D.cliPorId.get(c.cliente_id);
  const at = c.atendente_id && D.colPorId.get(c.atendente_id);
  const tel = (c.telefone||"").replace(/\D/g,"");
  const fim = c.status==="resolvida", dz = dadosDaConversaZap(c);
  // F328 · a busca e o seletor de emojis atravessam a repintura (mensagem nova chegando)
  const bqAtivo = document.activeElement?.id==="zap-bq", emoAberto = !!document.querySelector(".ze-emo[open]");
  // F187 · conversa de outro atendente: o atendente só lê e anota (nota interna
  // com @nome chama quem atende); o gestor pode tirar para si
  const pode = podeAgirZap(c), deOutro = !!at && at.id!==eu.id;
  // F265 · atendimento compartilhado: quem não atende também responde ao cliente (o atendente é avisado); encerrar,
  // retorno e robô continuam de quem atende
  // F183 · duas linhas: quem é e o que se faz (Retorno, Transferir, Encerrar)
  // em cima; embaixo o que classifica a conversa. O que se usa pouco (fixar,
  // robô, abrir no aparelho) mora no "⋯"
  document.getElementById("zap-dir").innerHTML =
    `<div class="zap-topo">
       <div class="zt-l1">
         <button class="zt-voltar" onclick="voltarListaZap()" aria-label="Voltar às conversas">←</button>
         ${zapFotos.get(c.foto_url)?`<img class="zap-av zt-foto" src="${esc(zapFotos.get(c.foto_url))}" alt="foto do contato" title="clique para ampliar" onclick="verFotoGrande(this.src)">`:avatarZap(c)}
         <div class="zt-id">
           <div class="zt-nm"><h2 role="button" tabindex="0" title="ver a ficha" onclick="alternarFichaZap()" onkeydown="if(event.key==='Enter')alternarFichaZap()">${esc(nomeDaConversa(c))}</h2>
             ${cli?"":`<button class="zt-renomear" onclick="nomearConversa()" title="Alterar o nome do contato" aria-label="Alterar o nome do contato">✎</button>`}</div>
           <div class="zt-sub">
${dz.sub}             <button class="zt-curto zt-cli" onclick="${cli?"quemConversa()":"vincularConversa()"}" title="${cli?"corrigir quem escreve":"vincular a um cliente"}">${dz.igual?esc(foneZap(c.telefone)):clienteDaLinha(c)}</button>
           </div>
         </div>
         <div class="zt-acoes">
           ${!at&&!fim?`<button class="zt-btn zt-assumir" onclick="assumirConversa()" title="Assumir a conversa">${zic("ok")}<span>Assumir</span><span class="sr-only"> a conversa</span></button>`:""}
           ${cli?`<button class="zt-btn ic zt-info" onclick="alternarFichaZap()" title="Ficha do cliente" aria-label="Ficha do cliente"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg></button>`:""}
           <button class="zt-btn ic zt-lupa ${zapBuscaConv?"on":""}" onclick="abrirBuscaZap()" title="buscar nesta conversa" aria-label="Buscar na conversa">${zic("busca")}</button>
           ${cfgApp("zap_ia_equipe")==="sim"?`<button class="zt-btn" onclick="iaZap('resumo')" title="a IA resume a conversa para você (nada vai ao cliente)" aria-label="Resumo">✨<span class="lbl">Resumo</span></button>
           ${pode&&!fim?`<button class="zt-btn" onclick="iaZap('rascunho')" title="a IA escreve uma resposta no campo; confira antes de enviar" aria-label="Rascunho">✨<span class="lbl">Rascunho</span></button>`:""}`:""}
           ${fim||!pode?"":`<button class="zt-btn zt-trans" onclick="transferirConversa()" title="transferir para setor ou pessoa" aria-label="Transferir">${zic("seta")}<span class="lbl">Transferir</span></button>`}
           ${fim||pode||!deOutro?"":`<button class="zt-btn zt-trans" onclick="pedirTransferencia()" title="pedir a ${esc(at.nome)} e aos gestores que transfiram a conversa" aria-label="Pedir transferência">${zic("seta")}<span class="lbl">Pedir</span></button>`}
           <button class="zt-btn zt-desler" onclick="marcarNaoLida()" title="${c.nao_lidas?"Marcar como lida, sem responder":"Marcar como não lida"}" aria-label="${c.nao_lidas?"Marcar como lida":"Marcar como não lida"}">${zic("carta")}<span class="lbl">${c.nao_lidas?"Lida":"Desler"}</span></button>
           ${pode?`<button class="zt-btn pri zt-fim" aria-label="${fim?"Reabrir":"Encerrar"}" onclick="${fim?"reabrirConversa()":"encerrarConversa()"}">${fim?"Reabrir":`${zic("ok")}<span class="lbl">Encerrar</span>`}</button>`:""}
           <details class="zt-mais">
             <summary class="zt-btn ic" aria-label="Mais ações">${zic("mais")}</summary>
             <div class="zt-menu">
               <button class="zt-cel zt-lupa" onclick="this.closest('details').open=false;abrirBuscaZap()">Buscar<span class="sr-only"> na conversa</span></button>
               ${fim||!pode?"":`<button class="zt-cel zt-trans" onclick="this.closest('details').open=false;transferirConversa()">Transferir</button>`}
               ${fim||pode||!deOutro?"":`<button class="zt-cel zt-trans" onclick="this.closest('details').open=false;pedirTransferencia()">Pedir<span class="sr-only"> transferência</span></button>`}
               ${pode?`<button class="zt-cel zt-fim" onclick="this.closest('details').open=false;${fim?"reabrirConversa()":"encerrarConversa()"}">${fim?"Reabrir":"Encerrar"}</button>`:""}
               ${cli?`<button onclick="quemConversa()" title="dizer se quem escreve é o próprio cliente ou outra pessoa por ele">Identificar quem escreve</button>`:`<button onclick="vincularConversa()" title="Vincular a um cliente">Vincular<span class="sr-only"> a um cliente</span></button>
               <button onclick="this.closest('details').open=false;nomearConversa()" title="Alterar o nome do contato"><span aria-hidden="true">Renomear</span><span class="sr-only">Alterar o nome do contato</span></button>
               <button onclick="this.closest('details').open=false;contatoDaConversa()" title="Salvar este número como contato que não é cliente"><span aria-hidden="true">Contato</span><span class="sr-only">Salvar como contato que não é cliente</span></button>`}
               <button onclick="this.closest('details').open=false;verFavoritasZap()">Mensagens favoritas${zapMsgs.some(m=>m.favorita_em)?` (${zapMsgs.filter(m=>m.favorita_em).length})`:""}</button>
               <button onclick="this.closest('details').open=false;baixarConversaZap()" title="baixar a conversa em MD ou PDF, inteira ou desde uma data">Baixar<span class="sr-only"> a conversa</span></button>
               <button class="zt-cel zt-desler" onclick="marcarNaoLida()" title="${c.nao_lidas?"Marcar como lida, sem responder":"Marcar como não lida"}"><span aria-hidden="true">${c.nao_lidas?"Lida":"Desler"}</span><span class="sr-only">${c.nao_lidas?"Marcar como lida":"Marcar como não lida"}</span></button>
               <button onclick="silenciarZap()" title="sem aviso desta conversa por um tempo">${silenciadaZap(c.id)?`🔕 Silenciada até ${new Date(zapSilencio.get(c.id)).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}`:"🔕 Silenciar"}</button>
               <button onclick="alternarFixar()">${c.fixada?"Desafixar da lista":"Fixar no topo da lista"}</button>
               ${cfgApp("zap_cobertura")==="sim"?`<button onclick="semCoberturaZap(${!c.sem_cobertura})" title="Durante o Offline, o plantão recebe ou não esta conversa">${c.sem_cobertura?"Encaminhar ao plantão":"Não encaminhar ao plantão"}</button>`:""}
               ${pode?`<details class="zt-outras"><summary>Outras opções</summary>
                 ${(cfgApp("zap_bot_ligado")||"sim")==="sim"?`<button onclick="alternarBot()">${c.bot_ativo?"Calar o robô nesta conversa":"Religar o robô nesta conversa"}</button>
                 ${!fim&&(zapAux.passos||[]).length?`<button onclick="levarRobo()" title="Levar o robô a um passo…"><span aria-hidden="true">Robô…</span><span class="sr-only">Levar o robô a um passo…</span></button>`:""}`:""}
                 <button onclick="pedirHistoricoZap()" title="${esc(c.historico_resultado||"pede ao celular as mensagens que faltam nesta conversa")}">${c.historico_pedido&&!c.historico_feito?"Buscando o histórico no celular…":"Buscar histórico no celular"}</button>
                 ${cfgApp("zap_ia_plantao")==="sim"?`<button onclick="mudarConversa({ia_conversa:${!c.ia_conversa}})">${c.ia_conversa?"A IA deixa de conversar com este número":"A IA conversa com este número"}</button>
                 <button onclick="mudarConversa({sem_ia:${!c.sem_ia}})">${c.sem_ia?"A IA volta a responder esta conversa":"A IA não responde esta conversa"}</button>`:""}
               </details>`:""}
             </div>
           </details>
         </div>
       </div>
       ${alertaSemFicha(c, zapMsgs)}
       ${c.sem_ia&&cfgApp("zap_ia_plantao")==="sim"?`<p class="zt-pergunta">A IA não responde esta conversa.
          <button class="zl-link" onclick="mudarConversa({sem_ia:false})" title="Voltar a responder"><span aria-hidden="true">Retomar</span><span class="sr-only">Voltar a responder</span></button></p>`:""}
       ${c.automatica?`<p class="zt-pergunta">Mensagem automática de outra empresa: a conversa fica fora da fila e o robô não responde.
          <button class="zl-link" onclick="naoEhAutomatica()" title="Não é automática"><span aria-hidden="true">Humana</span><span class="sr-only">Não é automática</span></button></p>`:""}
       ${nomeDiferente(c)?`<p class="zt-pergunta">No WhatsApp o contato se chama “${esc(c.nome_perfil)}”, e o cliente é ${esc(cli.nome)}.
          É outra pessoa que fala por ele? <button class="zl-link" onclick="quemConversa()" title="Informar quem conversa"><span aria-hidden="true">Identificar</span><span class="sr-only">Informar quem conversa</span></button></p>`:""}
       <div class="zt-l2">${dz.l2}</div>
     </div>
     ${zapBuscaConv?`<div class="zap-busca" role="search">
        ${zic("busca")}<input id="zap-bq" type="search" placeholder="Buscar nesta conversa" aria-label="Buscar nesta conversa" value="${esc(zapBuscaConv.q)}" autocomplete="off">
        <span id="zap-bn" class="zb-n" aria-live="polite"></span>
        <button class="zb-nav" onclick="navBuscaZap(-1)" aria-label="Resultado anterior" title="mais antigo">${zic("baixo")}</button>
        <button class="zb-nav" onclick="navBuscaZap(1)" aria-label="Próximo resultado" title="mais recente">${zic("baixo")}</button>
        <button class="zb-nav" onclick="fecharBuscaZap()" aria-label="Fechar a busca">✕</button></div>`:""}
     <div class="zap-msgs" id="zap-msgs">${(ini=>(ini?`<button class="zap-ant" onclick="zapAnteriores()">Mostrar ${Math.min(ini,ZAP_JAN)} anteriores</button>`:"")+zapMsgs.slice(ini).map((m,j)=>{
        const i = ini + j;
        // a data entra entre as mensagens quando o dia muda, como no aparelho
        const d = dataSP(m.quando_wa||m.criado_em), ant = i && dataSP(zapMsgs[i-1].quando_wa||zapMsgs[i-1].criado_em);
        const dia = d!==ant ? `<div class="zap-dia">${(t=>t==="hoje"?"Hoje":t==="ontem"?"Ontem":dmaZap(d))(diaZap(m.quando_wa||m.criado_em))}</div>` : "";
        const a = i && zapMsgs[i-1];
        const seguida = !dia && a && a.direcao===m.direcao && (a.autor_id||"")===(m.autor_id||"") && !!a.por_bot===!!m.por_bot;
        return dia + bolhaZap(m,cli,seguida); }).join(""))(zapIni())
        || `<p class="meio-sub" style="padding:12px">Sem mensagens ainda.</p>`}</div>
     ${zapResponder?`<div class="zap-resp"><span>↩ respondendo</span>
        <span class="txt">${esc(textoCurto(zapMsgs.find(m=>m.id===zapResponder)))}</span>
        <button class="btn-mini" onclick="zapResponder=null;pintarConversaGuardando()">✕</button></div>`:""}
     ${zapAudio && zapAudio.conversa===c.id?`<div class="zap-audio-prev">
        <span>Áudio gravado — ouça antes de enviar</span>
        <audio controls src="${zapAudio.url}"></audio>
        <button class="btn-mini" onclick="descartarAudioZap();pintarConversaGuardando()">Descartar</button>
        <button class="btn-rap ze-enviar" onclick="enviarAudioZap()" title="Enviar áudio"><span aria-hidden="true">Enviar</span><span class="sr-only"> áudio</span></button></div>`:""}
     <div class="zap-escrever ${zapNota?"modo-nota":""} ${!zapNota&&precisaAssumir(c)?"ze-travado":""}">
       <div class="zap-sug" id="zap-sug" hidden></div>
       ${!zapNota&&eu&&eu.zap_offline_desde?`<p class="ze-offline" role="status">Você está offline: os clientes que você assumiu recebem a mensagem automática. Enviar continua permitido.
          <button class="btn-rap" onclick="gravarEstadoZap(false)" title="Voltar a ficar online">Online</button></p>`:""}
       ${cobrindoZap(c)&&!zapNota?`<p class="ze-cobre" role="status">Plantão: cobertura de ${esc((D.colaboradores||[]).find(k=>k.id===c.cobertura.titular)?.nome||"um colega")}, que está offline. Responda sem assumir; a conversa volta a ele quando ficar online.</p>`:""}
       ${precisaAssumir(c)?`<p class="ze-so-leitura ze-assumir-aviso">${at
          ? `Esta conversa está com ${esc(at.nome)}. Para responder, peça a transferência.
             <button class="btn-rap" onclick="pedirTransferencia()" title="Pedir a transferência da conversa">Pedir<span class="sr-only"> a transferência</span></button>`
          : `Para responder ao cliente, assuma a conversa.
             <button class="btn-rap zt-assumir" onclick="assumirConversa()" title="Assumir a conversa">Assumir<span class="sr-only"> a conversa</span></button>`}
          A nota interna continua livre.</p>`:""}
       ${!zapNota&&c.sugestao_ia&&c.sugestao_ia.texto?`<div class="ze-sug-ia${c.sugestao_ia.urgente?" urg":""}" role="status">
         <div class="ze-sug-cab">💡 Sugestão da assistente virtual${c.sugestao_ia.urgente?" · ⚠ urgente":""} <span>· não enviada</span></div>
         <div class="ze-sug-txt">${esc(c.sugestao_ia.texto)}</div>
         <div class="ze-sug-bts"><button class="btn-rap" onclick="usarSugestaoZap()" title="Levar a sugestão ao campo de escrever para conferir e alterar">Usar<span class="sr-only"> a sugestão no campo de escrever</span></button>
           <button class="btn-mini" onclick="descartarSugestaoZap()" title="Descartar a sugestão">Descartar<span class="sr-only"> a sugestão</span></button>
           <button class="btn-mini" onclick="iaSugestaoZap('outra')" title="Pedir outra sugestão, em sentido diverso desta">Outra<span class="sr-only"> sugestão</span></button>
           <button class="btn-mini" onclick="iaSugestaoZap('aprofundar')" title="Consulta completa: anotações, andamentos, prazos, perícias, agenda e mensagens">Aprofundar<span class="sr-only"> a sugestão</span></button>
           ${botaoProvidencia(c.sugestao_ia.providencia)}</div>
         ${(c.sugestao_ia.bases||[]).length?`<div class="ze-sug-base">Baseada em:<ul style="margin:2px 0 0 16px;padding:0">${c.sugestao_ia.bases.map(b=>`<li>${esc(b)}</li>`).join("")}</ul></div>`:""}
         ${(c.sugestao_ia.pendencias||[]).length?`<div class="ze-sug-base ze-sug-pend">Falta verificar:<ul style="margin:2px 0 0 16px;padding:0">${c.sugestao_ia.pendencias.map(b=>`<li>${esc(b)}</li>`).join("")}</ul></div>`:""}</div>`:""}
       <div class="ze-modos" role="tablist" aria-label="Para quem é o texto">
         <button role="tab" aria-selected="${!zapNota}" class="${zapNota?"":"on"}" onclick="${zapNota?"alternarNota()":""}" title="Responder ao cliente">Responder<span class="sr-only"> ao cliente</span></button>
         <button role="tab" aria-selected="${zapNota}" class="${zapNota?"on nota":""}" id="zap-btn-nota"
           onclick="${zapNota?"":"alternarNota()"}" title="fica na conversa, o cliente não vê">Nota interna</button>
       </div>
       ${desfazerZapHtml()}
       <div class="ze-linha ze-vazio">
         <details class="ze-mais so-cel-ze">
           <summary aria-label="Mais opções">+</summary>
           <div class="zt-menu">
             <button onclick="this.closest('details').open=false;ditarZap()" title="Ditar a mensagem; toque de novo no microfone do campo para parar">Ditar<span class="sr-only"> a mensagem</span></button>
             <button onclick="this.closest('details').open=false;corrigirZap()" title="Corrigir com a IA o que está escrito">Corrigir<span class="sr-only"> com a IA</span></button>
             ${zapNota?"":`${c.sugestao_ia&&c.sugestao_ia.texto?"":`<button onclick="this.closest('details').open=false;iaSugestaoZap('outra')" title="Pedir uma sugestão de resposta à IA">Sugerir<span class="sr-only"> resposta</span></button>
             <button onclick="this.closest('details').open=false;iaSugestaoZap('aprofundar')" title="Sugestão com consulta completa">Aprofundar<span class="sr-only"> a sugestão</span></button>`}
             <button onclick="this.closest('details').open=false;frasesZap()" title="Mensagens prontas"><span aria-hidden="true">Modelos</span><span class="sr-only">Mensagens prontas</span></button>
             <button onclick="this.closest('details').open=false;agendarZap()" title="Agendar o envio">Agendar<span class="sr-only"> o envio</span></button>`}
           </div></details>
         <div class="ze-caixa">
           <textarea id="zap-txt" rows="1" placeholder="${zapNota?"Nota para a equipe":"Mensagem"}" title="${zapNota
             ? "Anotação para a equipe, o cliente não vê. Avisa quem atende e o advogado do cliente; @nome avisa outra pessoa."
             : "Digite / para as mensagens prontas"}"></textarea>
           <div class="ze-ferr">
             <input type="file" id="zap-arq" hidden onchange="mandarArquivoZap()">
             <details class="ze-emo"${emoAberto?" open":""}><summary class="zap-icone" title="emojis" aria-label="Emojis">${zic("emoji")}</summary>
               <div class="ze-emo-grade" role="group" aria-label="Emojis">${EMOJIS_ESCREVER.map(e=>`<button type="button" onclick="emojiZap('${e}')">${e}</button>`).join("")}</div></details>
             <button class="zap-icone ze-so-pc${_ditado?" gravando":""}" id="zap-ditar" onclick="ditarZap()" title="ditar: fale a mensagem, toque de novo para parar e a IA a corrige no campo, sem enviar" aria-label="Ditar a mensagem">${zic("ditar")}</button>
             <button class="zap-icone ze-so-pc" id="zap-corrigir" onclick="corrigirZap()" title="corrigir com a IA o que está escrito, sem enviar" aria-label="Corrigir o texto com a IA">${zic("corrigir")}</button>
             ${zapNota?"":`<button class="zap-icone" onclick="document.getElementById('zap-arq').click()"
               title="mandar foto, PDF ou áudio" aria-label="Anexar arquivo">${zic("clipe")}</button>
             <button class="zap-icone ze-so-pc" onclick="frasesZap()" title="mensagens prontas (ou digite / no campo)" aria-label="Mensagens prontas">${zic("frases")}</button>
             <button class="zap-icone ze-so-pc" onclick="agendarZap()" title="agendar o envio para outro dia e hora" aria-label="Agendar envio">${zic("agenda")}</button>
             ${c.sugestao_ia&&c.sugestao_ia.texto?"":`<button class="zap-icone ze-so-pc" id="zap-sugerir" onclick="iaSugestaoZap('outra')" title="pedir uma sugestão de resposta à IA, sem enviar" aria-label="Pedir sugestão de resposta">${zic("ideia")}</button>
             <button class="zap-icone ze-so-pc" id="zap-aprofundar" onclick="iaSugestaoZap('aprofundar')" title="sugestão com consulta completa (anotações, andamentos, prazos, perícias, agenda e mensagens), sem enviar" aria-label="Pedir sugestão aprofundada">${zic("lupa2")}</button>`}`}
           </div>
         </div>
         <button class="ze-nota-cel so-cel-ze ${zapNota?"on":""}" aria-pressed="${zapNota}" onclick="alternarNota()"
           title="nota interna: fica na conversa, o cliente não vê">Nota</button>
         <span id="zap-falta" class="zap-falta" role="status" hidden></span>
         <button class="btn-rap ze-enviar" id="zap-enviar" aria-label="${zapNota?"Anotar":"Enviar"}" onclick="enviarZap()">${zapNota?"Anotar":"Enviar"}</button>
         ${zapNota?"":`<button class="zap-icone ze-mic" id="zap-rec" onclick="gravarAudioZap()" title="gravar áudio" aria-label="Gravar áudio">${zic("mic")}</button>`}
       </div>
     </div>`;
  pintarPainelZap(c);
  const t = document.getElementById("zap-txt");
  t.oninput = ()=>{ t.style.height="auto"; t.style.height=Math.min(t.scrollHeight,140)+"px"; sugerirFrases(); travaZap(); guardarRascZap(c.id, t.value); };
  travaZap();
  // F371 · o print colado (Ctrl+V) vai como foto, com o texto escrito de legenda
  t.onpaste = async e=>{
    if(zapNota) return;
    const it = [...((e.clipboardData && e.clipboardData.items) || [])].find(i=>i.kind==="file" && /^image\//.test(i.type));
    const f = it && it.getAsFile();
    if(!f) return;
    e.preventDefault();
    if(!(await confirmar("Enviar o print colado? O texto escrito vai como legenda."))) return;
    const ext = (f.type.split("/")[1]||"png").replace("jpeg","jpg");
    mandarArquivoZap(new File([f], `print-${Date.now()}.${ext}`, {type: f.type}), c.id);
  };
  // F332 · o texto não enviado espera na conversa, como no aplicativo
  if(!t.value && rascZap()[c.id]){ t.value = rascZap()[c.id]; travaZap(); }
  // Enter manda, Shift+Enter pula linha — é o que a mão da equipe já espera.
  // Com as sugestões do "/" abertas, Enter escolhe a primeira
  t.onkeydown = e=>{
    const sug = document.getElementById("zap-sug");
    if(sug && !sug.hidden && (e.key==="Enter" || e.key==="Tab")){ e.preventDefault(); const b=sug.querySelector("button"); if(b) b.click(); return; }
    if(sug && !sug.hidden && e.key==="Escape"){ sug.hidden = true; return; }
    if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); enviarZap(); }
  };
  document.getElementById("app").classList.add("zap-conv-aberta"); armarVoltar();
  const cx = document.getElementById("zap-msgs"); cx.scrollTop = cx.scrollHeight;
  carregarMinis(cx); carregarPrevias(cx);
  if(zapBuscaConv) ligarBuscaZap(bqAtivo);
  // F270 · como no WhatsApp: rolou para cima, aparece o botão que desce à última mensagem
  const desce = Object.assign(document.createElement("button"), {className:"zap-desce", hidden:true, textContent:"⌄",
    title:"ir para a última mensagem", onclick:()=>cx.scrollTo({top:cx.scrollHeight, behavior:"smooth"})});
  desce.setAttribute("aria-label", "Ir para a última mensagem");
  cx.after(desce);
  cx.onscroll = () => { desce.hidden = cx.scrollHeight - cx.scrollTop - cx.clientHeight < 200; };
}
// F271 · no celular a conversa ocupa a tela, como no WhatsApp; a seta volta à lista
// como no WhatsApp: a conversa fecha (abrir é ler) e volta à lista com a bolinha, para responder depois
async function marcarNaoLida(){
  const c = zapConvs.find(x=>x.id===zapAberta); if(!c) return;
  if(c.nao_lidas){   // F480 · a conversa nova sai sem resposta apenas por este botão
    try{ await api(`/rest/v1/zap_conversas?id=eq.${c.id}`,{method:"PATCH",
      headers:{Prefer:"return=minimal"}, body:JSON.stringify({nao_lidas:0})}); }
    catch(e){ return aviso(msgErro(e)); }
    c.nao_lidas = 0; pintarListaZap(); pintarConversaGuardando(); return aviso("Marcada como lida");
  }
  const n = Math.max(1, c.nao_lidas||0);
  try{ await api(`/rest/v1/zap_conversas?id=eq.${c.id}`,{method:"PATCH",
    headers:{Prefer:"return=minimal"}, body:JSON.stringify({nao_lidas:n})}); }
  catch(e){ return aviso(msgErro(e)); }
  c.nao_lidas = n; voltarListaZap(); aviso("Marcada como não lida");
}
function voltarListaZap(){
  zapAberta = null; zapResponder = null; zapBuscaConv = null;
  document.getElementById("app").classList.remove("zap-conv-aberta"); pintarAgendaZap();
  document.querySelector(".zap-tela")?.classList.remove("ficha-on");
  document.getElementById("zap-dir").innerHTML = telaVaziaZap(); pintarPainelZap(null); pintarListaZap();
}
function alternarFichaZap(){ const t = document.querySelector(".zap-tela"); if(t) t.classList.toggle("ficha-on"); }

// F183 · o cliente ao lado da conversa: o que se pergunta enquanto se
// responde ("qual é o caso, em que pé está, quando é a próxima data"). Só
// leitura — mexer no caso continua sendo na ficha, a um clique
// F354 · o que o painel mostra além do que já está na memória: a senha do Meu INSS e o último
// andamento de cada caso aberto, buscados uma vez por cliente na sessão (pedido do Paulo, 01.11.2026)
const _zpExtra = new Map();
async function carregarExtraZap(cli, ks){
  _zpExtra.set(cli.id, {carregando:true});
  const ids = ks.map(k=>k.id).join(",");
  const [creds, ands] = await Promise.all([
    api(`/rest/v1/credenciais?select=id,valor&cliente_id=eq.${cli.id}&tipo=eq.meu_inss&limit=1`).catch(()=>[]),
    ids ? api(`/rest/v1/andamentos?select=caso_id,texto,criado_em,autor_id&caso_id=in.(${ids})&order=criado_em.desc&limit=60`).catch(()=>[]) : []]);
  const cr = (creds||[])[0], ult = new Map();
  for(const a of ands||[]) if(!ult.has(a.caso_id)) ult.set(a.caso_id, a);
  _zpExtra.set(cli.id, {senha: cr ? cr.valor : null, credId: cr ? cr.id : null, ult});
  if(cr) api(`/rest/v1/credencial_vis`,{method:"POST",headers:{Prefer:"return=minimal"},   // ver fica registrado, como no "ver" da ficha
    body:JSON.stringify({credencial_id:cr.id, colaborador_id:eu.id})}).catch(()=>{});
  const aberta = zapConvs.find(x=>x.id===zapAberta);
  if(aberta && aberta.cliente_id===cli.id) pintarPainelZap(aberta);
}
function ultimoAndZap(a){
  if(!a) return "";
  const quem = a.autor_id ? ((D.colPorId.get(a.autor_id)||{}).nome||"").split(" ")[0] : "portal";
  const t = String(a.texto||"").replace(/^(PJe|eproc TJSP|e-SAJ TJSP)\s*\([^)]*\)\s*:?\s*/,"").split("\n")[0].trim();
  return `<div class="zp-ult"><span>Último andamento · ${dmaZap(dataSP(a.criado_em)).slice(0,5)}${quem?` · ${esc(quem)}`:""}</span>
    ${esc(t.length>110 ? t.slice(0,110)+"…" : t)}</div>`;
}
function pintarPainelZap(c){
  const el = document.getElementById("zap-painel"); if(!el) return;
  const cli = c && c.cliente_id && D.cliPorId.get(c.cliente_id);
  const hist = zapHist.length ? `<section class="zp-card"><h4>Atendimentos anteriores</h4>
      ${zapHist.map(a=>`<div class="zp-kv"><span class="mono">${a.numero}</span>
        <span>${diaZap(a.aberto_em)}${a.observacao?` · ${esc(a.observacao)}`:""}</span></div>`).join("")}</section>` : "";
  const nm = id => id ? ((D.colPorId.get(id)||{}).nome || "alguém") : null;
  const transf = zapTransf.length ? `<section class="zp-card"><h4>Transferências</h4>
      ${zapTransf.map(t=>{
        const st = t.setor_id && (zapAux.setores.find(x=>x.id===t.setor_id)||{}).nome;
        const quem = t.tipo==="robo" ? "Robô" : (nm(t.por) || "Claude");
        const txt = t.tipo==="assumiu" ? `${quem} assumiu${t.de_id?` (estava com ${nm(t.de_id)})`:""}`
                  : `${quem} → ${nm(t.para_id) || (st?`setor ${st}`:"pendente")}${t.para_id&&st?` (${st})`:""}`;
        return `<div class="zp-kv"><span>${diaZap(t.em)} ${horaSP(t.em)}</span><span>${esc(txt)}${t.motivo?` · ${esc(t.motivo)}`:""}</span></div>`;
      }).join("")}</section>` : "";
  if(!c){ el.innerHTML = ""; return; }
  const dz = c.id===zapAberta ? dadosDaConversaZap(c) : null;
  const conv = dz ? `<section class="zp-card zp-conv-cel"><h4>Conversa</h4><div class="zt-sub">${dz.sub}</div>
      <div class="zt-l2">${dz.l2}</div></section>` : "";
  if(!cli){
    const sug = sugestoesVinculo(c);
    el.innerHTML = `${conv}<section class="zp-card"><h3>Sem cliente vinculado</h3>
        <p class="zp-sub">Este número não está na ficha de nenhum cliente. Vincule para ver o caso aqui.</p>
        ${sug.length?`<h4>Será um destes? (pelo nome do contato)</h4>${sug.map(x=>`<div class="zp-kv"><span>${esc(x.nome)}</span>
          <button class="zl-link" onclick="vincularConversa('${x.id}')">vincular</button></div>`).join("")}`:""}
        <button class="zt-btn" style="margin-top:8px" onclick="vincularConversa()" title="Vincular a um ou mais clientes">Vincular<span class="sr-only"> a um ou mais clientes</span></button></section>${transf}${hist}`;
    return;
  }
  const ks = (D.casosDoCliente.get(cli.id)||[]).filter(k=>k.fase!=="encerrado");
  const chave = String(c.telefone||"").replace(/\D/g,"").slice(-8);
  const outros = telefonesDe(cli).filter(t=>String(t.numero||"").replace(/\D/g,"").slice(-8)!==chave);
  const nasc = cli.dn ? dnIso(cli.dn) : null, idade = nasc ? idadeDe(cli.dn) : null;
  const ex = _zpExtra.get(cli.id); if(!ex) carregarExtraZap(cli, ks);
  const adv = D.colPorId.get((advogadoDoCliente(cli.id)||[])[0]);
  // F358 · leitura rápida (pedido do Paulo, 01.11.2026): a ficha, os casos numerados com Abrir e as datas dos prazos
  const caso = (k, n) => `<section class="zp-card zp-caso"><h4>Caso ${n}</h4>
      <div class="zp-tit">${esc(k.beneficio||k.titulo||"Caso")}${ehPreCaso(k)?` <span class="zp-sub">(pré-caso)</span>`:""}</div>
      <button class="zl-link" onclick="casoComZap('${cli.id}','${k.id}')" title="Abrir o caso com o WhatsApp ao lado"><span aria-hidden="true">Abrir</span><span class="sr-only">Abrir o caso com o WhatsApp ao lado</span></button>
    </section>`;
  _zpPrazos = (()=>{ try{ return prazosDoCliente(cli.id).lista; }catch{ return []; } })();
  const reps = representadosDe(cli, chave);
  const repCard = ({x, por}) => {
    const kx = (D.casosDoCliente.get(x.id)||[]).filter(k=>k.fase!=="encerrado");
    return `<section class="zp-card zp-rep">
      <div class="zp-cab"><h3>${esc(x.nome)}</h3><button class="zl-link" onclick="fichaComZap('${x.id}')" title="Abrir ficha"><span aria-hidden="true">Ficha</span><span class="sr-only">Abrir ficha</span></button></div>
      ${x.cpf?`<div class="zp-kv"><span>CPF</span><span class="mono">${esc(cpfMascarado(x.cpf))}</span></div>`:""}
      ${por?`<div class="zp-kv"><span>Vínculo</span><span>${esc(por)}</span></div>`:""}
      ${kx.length ? kx.slice(0,3).map(k=>`<div class="zp-kv"><span>${esc(k.beneficio||k.titulo||"Caso")}</span><span>${esc(k.etapa||listaDe(k).replace(/^\S+\s/, ""))}</span></div>`).join("")
        : `<p class="zp-sub">Nenhum caso aberto.</p>`}
    </section>`;
  };
  el.innerHTML = `${conv}<section class="zp-card">
      <div class="zp-cab"><h3>Ficha do cliente</h3><button class="zl-link" onclick="fichaComZap('${cli.id}')" title="Abrir a Identificação com o WhatsApp ao lado"><span aria-hidden="true">Ficha</span><span class="sr-only">Abrir a Identificação com o WhatsApp ao lado</span></button></div>
      <div class="zp-kv"><span>Nome</span><button class="zl-link zp-nome" onclick="fichaComZap('${cli.id}')" title="Abrir a Identificação com o WhatsApp ao lado">${esc(cli.nome)}</button></div>
      <div class="zp-kv"><span>CPF</span>${cli.cpf?`<span class="mono cop" data-cop="${esc(cli.cpf)}" data-cop-msg="CPF copiado" title="clique para copiar">${fmtCpf(cli.cpf)}</span>`:"<span>sem CPF</span>"}</div>
      <div class="zp-kv"><span>Meu INSS</span>${!ex || ex.carregando ? `<span class="zp-sub">…</span>`
        : ex.senha ? `<span class="mono cop" data-cop="${esc(ex.senha)}" data-cop-msg="Senha copiada" title="clique para copiar">${esc(ex.senha)}</span>`
        : `<span class="zp-sub">sem senha</span>`}</div>
      ${adv?`<div class="zp-kv"><span>Advogado</span><span>${esc(adv.nome||"")}</span></div>`:""}
      ${nasc?`<div class="zp-kv"><span>Nascimento</span><span>${dmaZap(nasc)}${idade!=null?` · ${idade} anos`:""}</span></div>`:""}
      ${outros.length?`<div class="zp-kv"><span>Outros números</span><span>${outros.map(t=>esc(foneZap(t.numero))+(t.obs&&t.obs!=="principal"?` · ${esc(t.obs)}`:"")).join("<br>")}</span></div>`:""}
    </section>
    ${ks.map((k, n)=>caso(k, n+1)).join("")}
    ${reps.length ? `<h4 class="zp-rep-tit">Clientes que ${esc(String(cli.nome||"").split(" ")[0])} representa (${reps.length})</h4>${reps.map(repCard).join("")}` : ""}
    ${_zpPrazos.length?`<section class="zp-card zp-prazos"><h4>Prazos</h4>
      ${_zpPrazos.slice(0,8).map((x, i)=>`<button class="zp-pz ${x.data<hoje()?"venc":"prox"}" onclick="prazoComZap('${cli.id}',${i})" title="${esc(x.curto||x.rotulo||"Prazo")}">${dmaZap(x.data)}</button>`).join("")}
    </section>`:""}
    ${ks.length&&_zpPrazos.length?"":`<p class="zp-sub zp-vazio">${!ks.length&&!_zpPrazos.length?"Sem caso nem prazo em aberto.":!ks.length?"Sem caso aberto.":"Sem prazo em aberto."}</p>`}`;
}
// F358 · os atalhos do painel levam à ficha, ao caso ou ao prazo e deixam a conversa ao lado
let _zpPrazos = [];
async function casoComZap(cliId, casoId){
  const k = D.casoPorId.get(casoId);
  if(k && ehPreCaso(k) && podeAtender()) { await abrirAtendimentoDe(cliId, casoId); return zapAoLado(cliId); }
  await abrirFicha(cliId); if(clienteAberto!==cliId) return;
  document.getElementById("modal").style.display = "none";
  casoSel = casoId; abaAtiva = soIdentificacao() ? 0 : 2; subAba = "escritorio"; repintarFicha();
  await zapAoLado(cliId);
}
async function prazoComZap(cliId, i){
  const x = _zpPrazos[i]; if(!x) return;
  if(x.casoId) await casoComZap(cliId, x.casoId); else await fichaComZap(cliId);
  // a janela do prazo abre pelo quadro Prazos do caso, que fica à esquerda da conversa
  const j = (faixaAtual||[]).findIndex(y=>y.data===x.data && (y.andId||"")===(x.andId||"") && (y.rotulo||"")===(x.rotulo||""));
  if(j>=0) return abrirPainelPrazo(j);
  // a data sem caso (qualidade, decadência, contribuição) mora na aba Prazos do cliente
  if(!soIdentificacao() && clienteAberto===cliId){ abaAtiva = 5; repintarFicha(); }
}
async function concluirTarefaZap(id){
  if(!podeGravarCaso()) return;   // F355 · o nível 1 conversa, mas não grava no caso
  const t = (D.tarefas||[]).find(x=>x.id===id); if(!t) return;
  t.concluida = true; t.concluida_em = new Date().toISOString();
  await api(`/rest/v1/tarefas?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({concluida:true, concluida_em:t.concluida_em})});
  plim(); pintarPainelZap(zapConvs.find(x=>x.id===zapAberta));
}
function novaTarefaZap(){
  if(!podeGravarCaso()) return;   // F355 · o nível 1 conversa, mas não grava no caso
  const c = zapConvs.find(x=>x.id===zapAberta), cli = c && c.cliente_id && D.cliPorId.get(c.cliente_id); if(!cli) return;
  const ks = (D.casosDoCliente.get(cli.id)||[]).filter(k=>k.fase!=="encerrado");
  caixa(`<h3>Nova tarefa de ${esc(cli.nome)}</h3>
    <input id="zt-tit" style="width:100%" placeholder="O que fazer (entende 'amanhã', 'sexta', 'dia 15')">
    <div class="form-linha" style="margin-top:8px"><input type="date" id="zt-prazo">
      ${ks.length>1?`<select id="zt-caso">${ks.map(k=>`<option value="${k.id}">${esc(k.beneficio||k.titulo||"caso")}</option>`).join("")}</select>`:""}</div>
    <div class="form-linha" style="margin-top:10px"><button class="btn-rap" id="zt-ok" title="Criar tarefa"><span aria-hidden="true">Tarefa</span><span class="sr-only">Criar tarefa</span></button></div>`);
  const ti = document.getElementById("zt-tit"); ti.focus();
  const criar = async()=>{
    if(!ti.value.trim()) return;
    const nat = dataNatural(ti.value.trim()), pz = document.getElementById("zt-prazo").value;
    const sel = document.getElementById("zt-caso");
    let linha;
    try{ [linha] = await api(`/rest/v1/tarefas`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({titulo:nat.titulo, prazo:pz||nat.prazo||null, cliente_id:cli.id,
        caso_id: sel ? sel.value : (ks[0]||{}).id || null})}); }
    catch(e){ return aviso("Não consegui criar a tarefa: "+msgErro(e)); }
    D.tarefas.push(linha); fecharCaixa(); aviso("Tarefa criada ✔");
    pintarPainelZap(c);
  };
  document.getElementById("zt-ok").onclick = criar;
  ti.onkeydown = e=>{ if(e.key==="Enter") criar(); };
}
// F187 · Painel da equipe (só o gestor), como o do SMBot: totais, por setor e
// por atendente. Clicar num número filtra a lista à esquerda.
async function abrirPainelZap(silencioso){
  let d;
  try{ d = await api(`/rest/v1/rpc/zap_painel`,{method:"POST", body:"{}"}); }
  catch(e){ if(!silencioso) aviso(msgErro(e)); return; }
  zapPainelAberto = true; zapAberta = null;
  pintarPainelZap(null);
  const t = d.totais || {};
  const num = (v, attrs) => `<button class="zg-num" ${attrs}>${v||0}</button>`;
  const cartao = (rot, v, attrs) => `<div class="zg-cartao"><span>${rot}</span>${attrs?num(v, attrs):`<b>${v||0}</b>`}</div>`;
  document.getElementById("zap-dir").innerHTML = `<div class="zg">
    <div class="zg-cab"><h2>Painel da equipe</h2><span class="meio-sub">atualiza sozinho a cada poucos segundos</span></div>
    <div class="zg-cartoes">
      ${cartao("Online agora", t.online)}
      ${cartao("Com mensagem nova", t.novas, 'data-zgf="todas" data-zgn="1"')}
      ${cartao("Em atendimento", t.ativos, 'data-zgf="todas"')}
      ${cartao("Pendentes (sem dono)", t.pendentes, 'data-zgf="sem"')}
      ${cartao("Retornos marcados", t.retornos, 'data-zgf="retornos"')}
      ${cartao("Encerrados hoje", t.encerrados_hoje)}
    </div>
    <h3 class="zg-tit">Por setor</h3>
    <table class="zg-tab"><thead><tr><th>Setor</th><th>Novas</th><th>Ativos</th><th>Pendentes</th><th>Retornos</th></tr></thead><tbody>
      ${(d.setores||[]).map(x=>`<tr><td><i class="zg-bola" style="background:${esc(x.cor)}"></i>${esc(x.nome)}</td>
        <td>${num(x.novas, `data-zgf="todas" data-zgn="1" data-zgs="${x.id}"`)}</td>
        <td>${num(x.ativos, `data-zgf="todas" data-zgs="${x.id}"`)}</td>
        <td>${num(x.pendentes, `data-zgf="sem" data-zgs="${x.id}"`)}</td>
        <td>${num(x.retornos, `data-zgf="retornos" data-zgs="${x.id}"`)}</td></tr>`).join("")}
    </tbody></table>
    <h3 class="zg-tit">Por atendente</h3>
    <table class="zg-tab"><thead><tr><th>Atendente</th><th>Novas</th><th>Ativos</th><th>Retornos</th><th>Encerrados hoje</th><th>1ª resposta (média hoje)</th></tr></thead><tbody>
      ${(d.atendentes||[]).map(x=>`<tr><td><i class="zg-bola ${x.online?"on":""}" title="${x.online?"online":"fora"}"></i>${esc(x.nome)}</td>
        <td>${num(x.novas, `data-zgf="todas" data-zgn="1" data-zga="${x.id}"`)}</td>
        <td>${num(x.ativos, `data-zgf="todas" data-zga="${x.id}"`)}</td>
        <td>${num(x.retornos, `data-zgf="retornos" data-zga="${x.id}"`)}</td>
        <td>${x.encerrados_hoje||0}</td>
        <td>${x.resposta_min!=null?`${String(x.resposta_min).replace(".",",")} min`:"—"}</td></tr>`).join("")}
    </tbody></table>
    <p class="meio-sub">Bola verde: com o CRM aberto agora. A 1ª resposta conta, em cada vez que o cliente volta a
       escrever hoje, quanto tempo até alguém da equipe responder.</p></div>`;
  document.querySelectorAll("[data-zgf]").forEach(b=>b.onclick=()=>{
    zapFiltro = b.dataset.zgf;
    zapChips.setor = b.dataset.zgs || ""; zapChips.atendente = b.dataset.zga || "";
    zapChips.naoLidas = !!b.dataset.zgn;
    pintarListaZap();
  });
  pintarListaZap();
}

// o "⋯" é um <details>: fecha ao clicar fora, como qualquer menu
document.addEventListener("click", e=>{
  document.querySelectorAll(".zt-mais[open]").forEach(d=>{ if(!d.contains(e.target)) d.open = false; });
});

// F328 · o link do texto vira link, e o primeiro ganha a prévia do site (título, descrição e imagem), como no
// aplicativo. A página do site se lê pela Edge Function `link_previa`; a resposta fica na memória da sessão
const RX_LINK_ZAP = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const limpaLink = u => u.replace(/[.,;:!?)\]]+$/, "");
const hrefLink = u => /^www\./i.test(u) ? "https://"+u : u;
function linksZap(t){
  let out = "", i = 0;
  for(const m of String(t).matchAll(RX_LINK_ZAP)){
    const u = limpaLink(m[0]);
    out += fmtZap(esc(t.slice(i, m.index))) + `<a href="${esc(hrefLink(u))}" target="_blank" rel="noopener noreferrer">${esc(u)}</a>`;
    i = m.index + u.length;
  }
  return out + fmtZap(esc(t.slice(i)));
}
// F422 · a formatação do WhatsApp (*negrito*, _itálico_, ~riscado~) e a assinatura da equipe ("*Dr. Paulo Tercini:*" na
// primeira linha) em negrito no alto do balão, sem os asteriscos; o link não passa por aqui
const FMT_ZAP = [[/\*/, "b"], [/_/, "i"], [/~/, "s"]];
const fmtZap = h => FMT_ZAP.reduce((x, [m, tag]) => x.replace(new RegExp(`(^|[\\s(>])${m.source}(?=\\S)([^\\n]*?\\S)${m.source}(?=$|[\\s.,;:!?)<])`, "g"), `$1<${tag}>$2</${tag}>`), h);
const TIPOS_ZAP_PT = { buttons: "mensagem com botões", template: "modelo de empresa", list: "lista de opções",
  interactive: "mensagem interativa", pollCreation: "enquete", pollCreationV3: "enquete", event: "evento", order: "pedido",
  product: "produto", groupInvite: "convite de grupo", requestPayment: "pedido de pagamento" };
// F631 · textos técnicos já gravados pela ponte, mostrados de forma legível
function textoZapLegivel(t){
  return String(t??"").replace(/\[mensagem de tipo callLogMess?sage, veja no celular\]/g, "📞 Chamada de voz")
    .replace(/\[mensagem de tipo ([^,\]]+), veja no celular\]/g, "[mensagem que o CRM não exibe ($1); veja no celular]")
    // F632 · o nome técnico do tipo vira português (as novas já chegam com o texto; estas foram gravadas antes)
    .replace(/\(([a-zA-Z]+?)(Message)?\); veja no celular\]/g, (x, k) => TIPOS_ZAP_PT[k] ? `(${TIPOS_ZAP_PT[k]}); veja no celular]` : x)
    .replace(/\[mídia não baixada\]/g, "[mídia não disponível no CRM; veja no celular]");
}
function textoZap(t){
  t = textoZapLegivel(t);
  const a = /^\*([^*\n]{2,60}?):?\*:?[ \t]*\n/.exec(String(t));
  return a ? `<span class="zap-sig">${esc(a[1].replace(/:$/, ""))}</span>${linksZap(t.slice(a[0].length))}` : linksZap(t);
}
const _previa = new Map();
function previaHtml(u){
  const p = _previa.get(u);
  if(p && p.erro) return "";
  if(!p || p.carregando) return `<a class="zap-link carregando" data-link="${esc(u)}" href="${esc(hrefLink(u))}" target="_blank" rel="noopener noreferrer"><span class="zl-site">${esc(u.replace(/^(https?:\/\/)?(www\.)?/i,"").split("/")[0])}</span></a>`;
  if(!p.titulo && !p.imagem) return "";
  return `<a class="zap-link" href="${esc(hrefLink(u))}" target="_blank" rel="noopener noreferrer">
    ${p.imagem?`<img src="${esc(p.imagem)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`:""}
    <span class="zl-txt">${p.titulo?`<b>${esc(p.titulo)}</b>`:""}${p.descricao?`<span>${esc(p.descricao)}</span>`:""}<span class="zl-site">${esc(p.site||"")}</span></span></a>`;
}
async function carregarPrevias(raiz){
  for(const a of (raiz||document).querySelectorAll(".zap-link.carregando[data-link]")){
    const u = a.dataset.link;
    if(_previa.has(u)) continue;
    _previa.set(u, {carregando:true});
    let r; try{ r = await api("/functions/v1/link_previa", {method:"POST", body:JSON.stringify({url: hrefLink(u)})}); }catch(e){ r = {erro: msgErro(e)}; }
    _previa.set(u, r && !r.erro ? r : {erro: (r&&r.erro)||"sem prévia"});
    document.querySelectorAll(`.zap-link.carregando[data-link="${CSS.escape(u)}"]`).forEach(x=>{
      const novo = previaHtml(u); if(novo) x.outerHTML = novo; else x.remove(); });
  }
}

// F328 · buscar nesta conversa, como a lupa do aplicativo: acende os balões que têm o texto, do mais recente
// ao mais antigo (↑ volta, ↓ avança), e Esc fecha. Procura sem acento e sem diferença de maiúsculas
let zapBuscaConv = null;
const semAcentoZap = s => String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
function abrirBuscaZap(){
  if(zapBuscaConv) return fecharBuscaZap();
  zapBuscaConv = {q:"", i:-1}; pintarConversaGuardando();
  document.getElementById("zap-bq")?.focus();
}
function fecharBuscaZap(){ zapBuscaConv = null; pintarConversaGuardando(); }
function ligarBuscaZap(foco){
  const q = document.getElementById("zap-bq"); if(!q) return;
  q.oninput = ()=>{ zapBuscaConv.q = q.value; zapBuscaConv.i = -1;
    const ach = zapPrimeiroAchado(); if(ach >= 0 && ach < _zapJan.vis) pintarConversaGuardando();   // F583 · o achado antigo entra na janela
    marcarBuscaZap(true); };
  q.onkeydown = e=>{
    if(e.key==="Escape"){ e.preventDefault(); fecharBuscaZap(); }
    else if(e.key==="Enter"){ e.preventDefault(); navBuscaZap(e.shiftKey?1:-1); }
  };
  if(foco){ q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  marcarBuscaZap(false);
}
function achadosZap(){
  const t = semAcentoZap(zapBuscaConv && zapBuscaConv.q).trim();
  const todos = [...document.querySelectorAll("#zap-msgs .zap-b")];
  todos.forEach(b=>b.classList.remove("achou","achou-atual"));
  return t.length < 2 ? [] : todos.filter(b=>semAcentoZap(b.querySelector(".txt")?.textContent).includes(t));
}
function marcarBuscaZap(rolar){
  const ach = achadosZap(), n = document.getElementById("zap-bn");
  if(!zapBuscaConv) return;
  if(zapBuscaConv.i < 0 || zapBuscaConv.i >= ach.length) zapBuscaConv.i = ach.length - 1;
  ach.forEach(b=>b.classList.add("achou"));
  const atual = ach[zapBuscaConv.i];
  if(atual){ atual.classList.add("achou-atual"); if(rolar) atual.scrollIntoView({block:"center"}); }
  if(n) n.textContent = semAcentoZap(zapBuscaConv.q).trim().length < 2 ? "" : ach.length ? `${zapBuscaConv.i+1} de ${ach.length}` : "nenhuma";
}
function navBuscaZap(d){
  if(!zapBuscaConv) return;
  const total = achadosZap().length; if(!total) return marcarBuscaZap(false);
  zapBuscaConv.i = Math.min(total-1, Math.max(0, zapBuscaConv.i + d)); marcarBuscaZap(true);
}

// F328 · o seletor de emojis do campo de escrever: o emoji entra onde está o cursor
const EMOJIS_ESCREVER = ["😀","😃","😄","😊","🙂","😉","😍","🥰","😘","😂","🤣","😅","😢","😭","😮","😔","😕","🙁","😟","🤔",
  "🙏","👍","👎","👏","🙌","👋","🤝","💪","✌️","👌","❤️","💚","💙","🌹","🎉","🎂","✅","☑️","❌","⚠️","📄","📎","📅","⏰","📞","🏥","⚖️","💰"];
// F479 · ditar e corrigir com a IA (pedido do Paulo de 09.11.2026): o texto volta ao campo de escrever e nunca é
// enviado sem o Enviar. O ditado é o do navegador (Web Speech); parado, o texto vai à correção.
let _ditado = null;
function ditarZap(){
  const bt = document.getElementById("zap-ditar"), t = document.getElementById("zap-txt"); if(!t) return;
  if(_ditado){ try{ _ditado.stop(); }catch(e){} return; }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return aviso("Este navegador não faz ditado. Use o microfone do teclado do celular e depois Corrigir.");
  const r = new SR(), antes = t.value.trim(), conv = zapAberta; let dito = "";
  r.lang = "pt-BR"; r.continuous = true; r.interimResults = true;
  r.onresult = e => { let fim = "", parcial = "";
    for(const x of e.results) (x.isFinal ? (fim += x[0].transcript + " ") : (parcial += x[0].transcript));
    dito = fim.trim(); const campo = document.getElementById("zap-txt");
    if(campo && zapAberta===conv){ campo.value = [antes, (fim + parcial).trim()].filter(Boolean).join(" "); travaZap(); } };
  r.onerror = e => { if(e.error==="not-allowed") aviso("O navegador não liberou o microfone para o ditado"); };
  r.onend = () => { _ditado = null; const b = document.getElementById("zap-ditar"); if(b) b.classList.remove("gravando");
    if(dito && zapAberta===conv) corrigirZap(); };
  _ditado = r; bt && bt.classList.add("gravando");
  try{ r.start(); aviso("Ditando… toque de novo no botão para parar", false); }
  catch(e){ _ditado = null; bt && bt.classList.remove("gravando"); aviso("Não consegui iniciar o ditado"); }
}
async function corrigirZap(){
  const t = document.getElementById("zap-txt"), conv = zapAberta; if(!t || !conv) return;
  const antes = t.value, texto = antes.trim();
  if(!texto) return aviso("Escreva ou dite a mensagem para a IA corrigir");
  const bt = document.getElementById("zap-corrigir"); bt && bt.classList.add("gravando");
  aviso("Corrigindo o texto…", false);
  let r; try{ r = await api("/functions/v1/zap_assistente",{method:"POST", body:JSON.stringify({acao:"corrigir", conversa_id:conv, texto, nota:!!zapNota})}); }
  catch(e){ r = {erro: msgErro(e)}; }
  finally{ const b = document.getElementById("zap-corrigir"); b && b.classList.remove("gravando"); }
  if(!r || !r.texto) return aviso("A IA não corrigiu: " + ((r&&r.erro) || "sem resposta"));
  const c = document.getElementById("zap-txt");
  if(!c || zapAberta!==conv) return;
  if(c.value !== antes) return aviso("O texto mudou enquanto a IA corrigia; nada foi trocado");
  c.value = r.texto; c.dispatchEvent(new Event("input")); focarCampoZap();
  // F553 · o Desfazer fica acima do campo de escrever, e não no aviso que cobria o texto
  clearTimeout(_zapDesf?.timer);
  _zapDesf = {conv, antes, timer: setTimeout(() => { _zapDesf = null; document.querySelector(".ze-desf")?.remove(); }, 15000)};
  pintarDesfazerZap();
}
let _zapDesf = null;
function desfazerZapHtml(){
  return _zapDesf && _zapDesf.conv===zapAberta && !zapNota ? `<p class="ze-desf" role="status">Texto corrigido pela IA. Confira antes de enviar.
    <button class="btn-mini" onclick="desfazerCorrecaoZap()" title="Voltar ao texto de antes da correção">Desfazer<span class="sr-only"> a correção</span></button></p>` : "";
}
function pintarDesfazerZap(){
  document.querySelector(".ze-desf")?.remove();
  const l = document.getElementById("zap-txt")?.closest(".ze-linha"), h = desfazerZapHtml();
  if(l && h) l.insertAdjacentHTML("beforebegin", h);
}
function desfazerCorrecaoZap(){
  const f = _zapDesf; if(!f) return;
  clearTimeout(f.timer); _zapDesf = null; document.querySelector(".ze-desf")?.remove();
  const d = document.getElementById("zap-txt"); if(d && zapAberta===f.conv){ d.value = f.antes; d.dispatchEvent(new Event("input")); focarCampoZap(); }
}
function emojiZap(e, campo){
  const t = document.getElementById(campo||"zap-txt"); if(!t) return;
  const a = t.selectionStart ?? t.value.length, b = t.selectionEnd ?? a;
  t.value = t.value.slice(0,a) + e + t.value.slice(b);
  t.selectionStart = t.selectionEnd = a + e.length;
  if(!document.querySelector(".app.celular")) t.focus();
  t.oninput && t.oninput();
  (d => d && d.removeAttribute("open"))(t.closest("footer")?.querySelector(".ze-emo[open]"));
}

function bolhaZap(m, cli, seguida){
  const quem = m.por_bot ? "🤖 robô"
            : m.autor_id ? (D.colPorId.get(m.autor_id)||{}).nome || "escritório" : "";
  if(m.direcao==="interna") return `<div class="zap-b interna">
    <div class="txt"><b>Nota interna${quem?` · ${esc(quem)}`:""}:</b> ${esc(m.texto||"")}</div>
    <div class="pe">${horaSP(m.criado_em)}
      ${cli&&podeGravarCaso()?`<button class="virar" onclick="virarAndamento('${m.id}')"
        title="registrar no histórico de um processo">↪ andamento</button>`:""}</div></div>`;
  const corpo = m.midia_url && m.tipo==="audio"
    ? playerZap(m.midia_url)
      + (m.texto?`<div>🎤 ${esc(m.texto)}</div>`:"")
    : m.midia_url && (m.tipo==="imagem"||m.tipo==="figurinha")
    ? miniZap(m.midia_url, `verMidiaZap('${m.id}')`, m.tipo==="figurinha") + (m.texto?`<div>${esc(m.texto)}</div>`:"")
    : m.midia_url && m.tipo==="video"
    ? vidZap(m.midia_url) + (m.texto?`<div>${esc(m.texto)}</div>`:"")
    : m.midia_url
    ? `<button class="zap-anexo" onclick="verMidiaZap('${m.id}')">📎 ${esc(m.midia_nome||m.tipo)}</button>`
      + (m.texto?`<div>${m.tipo==="audio"?"🎤 ":""}${esc(m.texto)}</div>`:"")
    : m.tipo==="contato" ? contatoZap(m.texto)
    : m.texto ? textoZap(m.texto)
    : m.tipo==="audio" ? `<span class="meio-sub">🎤 áudio antigo, não baixado — só no celular</span>` : esc(`[${m.tipo}]`);
  // F332 · apagada no WhatsApp: a equipe continua vendo o que foi escrito, riscado
  const apag = m.apagada_em ? `<div class="zap-apag">${zic("proibido",13)}${m.direcao==="entrada"?"O cliente apagou esta mensagem":m.alterar&&m.alterar.acao==="apagar"?`Apagada por ${esc((D.colPorId.get(m.alterar.por)||{}).nome||"escritório")}`:"Apagada no celular"} em ${diaZap(m.apagada_em)}, ${horaSP(m.apagada_em)}</div>` : "";
  const lk = !m.apagada_em && !m.midia_url && m.texto ? (m.texto.match(RX_LINK_ZAP)||[])[0] : null;
  // a citada pode estar no CRM (responde_a) ou só ter o id do WhatsApp
  const citada = m.responde_a ? zapMsgs.find(x=>x.id===m.responde_a)
               : m.responde_externo ? zapMsgs.find(x=>x.externo_id===m.responde_externo) : null;
  const reac = zapReacoes.get(m.id)||[];
  return `<div class="zap-b ${m.direcao} ${m.por_bot?"bot":""} ${m.status==="erro"?"ruim":""} ${m.apagada_em?"apagada":""}
      ${m.status==="rascunho"?"rascunho":""} ${m.status==="agendada"?"agendada":""} ${seguida?"seguida":""}" id="zb-${m.id}">
    ${quem?`<div class="autor">${esc(m.aviso_chave?"aviso automático":quem)}${m.encaminhada_de?" · ↪ encaminhada":""}</div>`:""}
    ${m.encaminhada?`<div class="zap-enc">↪ ${m.encaminhada>=4?"Encaminhada com frequência":"Encaminhada"}</div>`:""}
    ${citada?`<div class="zap-cit" onclick="irParaMsg('${citada.id}')">${esc(textoCurto(citada))}</div>`
      : m.responde_a||m.responde_externo?`<div class="zap-cit">mensagem citada (antiga)</div>`:""}
    ${m.status==="agendada"?`<div class="zap-ag">${zic("agenda",14)}Agendada para ${diaZap(m.enviar_em)}, ${horaSP(m.enviar_em)}
        <button class="zl-link" onclick="cancelarAgendada('${m.id}')">cancelar</button></div>`:""}
    ${lk?previaHtml(limpaLink(lk)):""}
    ${apag}<div class="txt">${corpo}</div>
    ${m.status==="rascunho"?`<div class="zap-rev">
        <span>escrito pelo sistema — confira antes de mandar</span>
        <button class="btn-mini" onclick="soltarRascunho('${m.id}')">enviar</button>
        <button class="btn-mini" onclick="descartarRascunho('${m.id}')">descartar</button>
      </div>`:""}
    <div class="pe">
      ${m.externo_id||m.direcao==="entrada"?`<span class="zap-acoes">
        <button onclick="responderMsg('${m.id}')" title="responder citando">↩</button>
        <button onclick="reagirMsg('${m.id}')" title="reagir">😀</button>
        <button onclick="encaminharMsg('${m.id}')" title="encaminhar para outra conversa">↪</button>
        <button onclick="favoritarMsg('${m.id}')" title="${m.favorita_em?"tirar dos favoritos":"favoritar"}" aria-label="${m.favorita_em?"Tirar dos favoritos":"Favoritar"}">${m.favorita_em?"★":"☆"}</button>
        ${podeAlterarZap(m,"apagar")?`<button onclick="menuBalaoZap('${m.id}')" title="mais: editar, apagar para todos" aria-label="Mais">⋯</button>`:""}</span>`:""}
      ${m.favorita_em?`<span class="zap-fav" title="favorita${m.favorita_por?" de "+esc((D.colPorId.get(m.favorita_por)||{}).nome||""):""}" aria-label="Favorita">★</span>`:""}
      ${m.editada_em?`<span class="zap-edit" title="${esc("Antes: "+(m.texto_antes||""))}">Editada</span>`:""}
      ${horaSP(m.quando_wa||m.criado_em)}
      <span id="zs-${m.id}" data-st="${m.direcao==="saida"?esc(m.status||""):""}">${seloZap(m)}</span>
      ${m.status==="erro"?`<span title="${esc(m.erro||"")}">não enviou</span>`:""}
      ${m.status==="erro"&&/^confirmacao:/.test(m.aviso_chave||"")?`<button class="btn-mini" onclick="reenviarConfZap('${m.id}')" title="mandar esta confirmação a outro número">Reenviar</button>`:""}
      ${m.alterar&&m.alterar.status==="fila"?`<span>${m.alterar.acao==="apagar"?"apagando…":"editando…"}</span>`:""}
      ${m.alterar&&m.alterar.status==="erro"?`<span title="${esc(m.alterar.erro||"")}">${m.alterar.acao==="apagar"?"não apagou":"não editou"}</span>`:""}
      ${cli&&podeGravarCaso()?`<button class="virar" onclick="virarAndamento('${m.id}')"
         title="registrar no histórico de um processo">↪ andamento</button>`:""}
      ${cli&&podeGravarCaso()&&m.direcao==="entrada"&&m.midia_url&&/^(imagem|documento)$/.test(m.tipo)&&cfgApp("zap_ia_equipe")==="sim"?`<button class="virar" onclick="identificarDocZap('${m.id}')"
         title="a IA diz que documento é e a qual caso vai; você confere e junta"><span aria-hidden="true">✨ Juntar</span><span class="sr-only">✨ juntar ao caso</span></button>`:""}
    </div></div>`
    + (reac.length?`<span class="zap-reac ${m.direcao==="saida"?"saida":""}" title="${esc(reac.map(r=>(r.de==="cliente"?"cliente":"escritório")+" "+r.emoji).join(" · "))}">${reac.map(r=>esc(r.emoji)).join("")}</span>`:"");
}
// F555 · cartão de contato recebido: a ponte grava "👤 Nome · 5516…" (uma linha por contato); daqui se conversa, salva, copia e liga
function contatoZap(txt){
  const linhas = String(txt||"").split("\n").filter(l=>l.trim());
  if(!linhas.length) return esc("[contato]");
  return linhas.map(l=>{
    const [nome, ...nums] = l.replace(/^👤\s*/,"").split(" · ");
    const num = (nums[0]||"").replace(/\D/g,"");
    if(!num) return `<div class="zap-ct"><b>👤 ${esc(nome||"Contato")}</b><span class="meio-sub">Número não veio; veja no celular.</span></div>`;
    const ficha = clientesDoTelefone(num)[0];
    return `<div class="zap-ct" data-ct-num="${num}" data-ct-nome="${esc(nome||"")}">
      <b>👤 ${esc(nome||"Contato")}</b><span>${esc(foneZap(num))}${ficha?` · ficha de ${esc(ficha.nome)}`:""}</span>
      <span class="zap-ct-bts">
        <button class="btn-mini" onclick="contatoAcao(this,'conv')" title="Conversar com este número no WhatsApp do CRM">Conversar</button>
        <button class="btn-mini" onclick="contatoAcao(this,'salvar')" title="${ficha?"Abrir a ficha deste número":"Salvar: cadastrar como cliente ou abrir conversa"}">${ficha?"Ficha":"Salvar"}</button>
        <button class="btn-mini" onclick="contatoAcao(this,'copiar')" title="Copiar o número">Copiar</button>
        <a class="btn-mini" href="tel:+${num}" title="Ligar para este número">Ligar</a>
      </span></div>`;
  }).join("");
}
function contatoAcao(bt, acao){
  const ct = bt.closest(".zap-ct"), num = ct.dataset.ctNum, nome = ct.dataset.ctNome;
  if(acao==="conv") return zapDoNumero(num);
  if(acao==="copiar") return navigator.clipboard.writeText(foneZap(num)).then(()=>aviso("Número copiado"), ()=>aviso("Não foi possível copiar", true));
  const ficha = clientesDoTelefone(num);
  if(ficha.length===1) return fichaComZap(ficha[0].id);
  novoContatoZap();   // reaproveita a conferência do ＋: ficha existente, Conversar ou Cliente
  document.getElementById("znc-tel").value = "+"+num;   // com o 55 inteiro: o número formatado perde o DDI na conferência
  document.getElementById("znc-nome").value = nome;
  conferirContatoZap();
}
// F332 · rascunho por conversa, só neste navegador (localStorage pode faltar: segue sem)
function rascZap(){ try{ return JSON.parse(localStorage.getItem("crm_zap_rasc")||"{}"); }catch(e){ return {}; } }
function guardarRascZap(id, txt){
  try{ const r = rascZap(); if(txt && txt.trim()) r[id] = txt; else delete r[id];
       localStorage.setItem("crm_zap_rasc", JSON.stringify(r)); }catch(e){}
}
// F332 · a estrela do WhatsApp: favorita para a equipe toda, com quem marcou
async function favoritarMsg(id){
  const m = zapMsgs.find(x=>x.id===id); if(!m) return;
  const corpo = m.favorita_em ? {favorita_em:null, favorita_por:null} : {favorita_em:new Date().toISOString(), favorita_por:eu.id};
  try{ await api(`/rest/v1/zap_mensagens?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"}, body:JSON.stringify(corpo)}); }
  catch(e){ return aviso(msgErro(e), true); }
  Object.assign(m, corpo); pintarConversaGuardando();
  aviso(corpo.favorita_em ? "★ Mensagem favoritada" : "Mensagem tirada dos favoritos");
}
function verFavoritasZap(){
  const fs = zapMsgs.filter(m=>m.favorita_em);
  caixa(`<h3>★ Mensagens favoritas</h3>${fs.length ? `<div class="zap-favs">${fs.map(m=>`<button class="zap-fav-it" onclick="fecharCaixa();irParaMsg('${m.id}')">
      <span class="meio-sub">${m.direcao==="entrada"?"Cliente":"Escritório"} · ${diaZap(m.quando_wa||m.criado_em)}, ${horaSP(m.quando_wa||m.criado_em)}</span>
      <span>${esc(textoCurto(m))}</span></button>`).join("")}</div>`
    : `<p class="meio-sub">Nenhuma mensagem favorita nesta conversa. Segure o balão (ou passe o mouse) e toque em ★ para guardar uma.</p>`}`);
}
// F585 · baixar a conversa inteira, ou desde uma data, em MD ou PDF (o PDF sai pela impressão do navegador)
function baixarConversaZap(){
  caixa(`<h3>Baixar a conversa</h3>
    <p class="meio-sub">Sem data, sai a conversa inteira. Áudio, foto e documento aparecem pelo nome, com a transcrição ou a legenda.</p>
    <label class="meio-sub">Desde <input type="date" id="zbx-desde"></label>
    <label class="meio-sub" style="display:block;margin:8px 0"><input type="checkbox" id="zbx-notas"> Incluir as notas internas</label>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="btn-mini pri" onclick="baixarZapComo('md')" title="Baixar em Markdown (.md)">MD</button>
      <button class="btn-mini" onclick="baixarZapComo('pdf')" title="Abrir para salvar em PDF">PDF</button>
    </div>`);
}
const dataBrZap = ts => dataSP(ts).split("-").reverse().join("/");
function linhasConversaZap(c, desde, notas){
  const ini = desde ? new Date(desde+"T00:00:00-03:00") : null;
  return zapMsgs.filter(m => !["rascunho","agendada"].includes(m.status)
      && (notas || m.direcao!=="interna")
      && (!ini || new Date(m.quando_wa||m.criado_em) >= ini))
    .map(m => {
      const d = m.quando_wa||m.criado_em;
      const quem = m.direcao==="entrada" ? nomeDaConversa(c)
        : m.direcao==="interna" ? `Nota interna · ${(D.colPorId.get(m.autor_id)||{}).nome||"escritório"}`
        : m.por_bot ? "Robô" : m.aviso_chave ? "Aviso automático"
        : (D.colPorId.get(m.autor_id)||{}).nome || "Escritório";
      const tipo = {audio:"Áudio", imagem:"Foto", video:"Vídeo", documento:"Documento", figurinha:"Figurinha", localizacao:"Localização"}[m.tipo];
      const anexo = tipo ? `[${tipo}${m.midia_nome?": "+m.midia_nome:""}]` : "";
      const obs = [m.encaminhada||m.encaminhada_de ? "↪ Encaminhada" : "", m.editada_em ? "editada" : "",
                   m.apagada_em ? `apagada em ${dataBrZap(m.apagada_em)}` : "", m.status==="erro" ? "não enviada" : ""].filter(Boolean);
      return {quando:`${dataBrZap(d)} ${horaSP(d)}`, quem, texto:[anexo, m.texto||""].filter(Boolean).join(" "), obs};
    });
}
function baixarZapComo(fmt){
  const c = zapConvs.find(x=>x.id===zapAberta); if(!c) return;
  const desde = document.getElementById("zbx-desde").value, notas = document.getElementById("zbx-notas").checked;
  const ls = linhasConversaZap(c, desde, notas);
  if(!ls.length){ aviso("Nenhuma mensagem nesse período"); return; }
  const nome = nomeDaConversa(c), tit = `Conversa no WhatsApp com ${nome}${c.telefone?` (${foneZap(c.telefone)})`:""}`;
  const sub = `${desde ? `Desde ${desde.split("-").reverse().join("/")}` : "Conversa inteira"} · ${ls.length} mensagens · baixada em ${dataBrZap(new Date().toISOString())} ${horaSP(new Date().toISOString())}`;
  if(fmt==="md"){
    const md = `# ${tit}\n\n${sub}\n\n` + ls.map(l => `**${l.quando} · ${l.quem}**${l.obs.length?` _(${l.obs.join(", ")})_`:""}\n\n${l.texto.replace(/\n/g,"  \n")||"(sem texto)"}\n`).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([md], {type:"text/markdown;charset=utf-8"}));
    a.download = `conversa-${nome.normalize("NFD").replace(/[^\w]+/g,"-").replace(/^-|-$/g,"").toLowerCase()}-${new Date().toISOString().slice(0,10)}.md`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
    fecharCaixa(); return;
  }
  const guia = window.open("", "_blank"); if(!guia){ aviso("O navegador bloqueou a janela; permita pop-ups"); return; }
  guia.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(tit)}</title><style>
    body{font:11pt/1.45 Arial,sans-serif;margin:24px;color:#111} h1{font-size:15pt;margin:0 0 4px} .sub{color:#555;margin:0 0 16px}
    .m{margin:0 0 10px;page-break-inside:avoid} .q{font-weight:bold} .o{color:#666;font-style:italic} .t{white-space:pre-wrap}
    @page{size:A4;margin:16mm}</style></head><body><h1>${esc(tit)}</h1><p class="sub">${esc(sub)}</p>
    ${ls.map(l=>`<div class="m"><div><span class="q">${esc(l.quando)} · ${esc(l.quem)}</span>${l.obs.length?` <span class="o">(${esc(l.obs.join(", "))})</span>`:""}</div><div class="t">${esc(l.texto)||"(sem texto)"}</div></div>`).join("")}
    <script>window.print()<\/script></body></html>`);
  guia.document.close(); fecharCaixa();
}
const textoCurto = m => !m ? "" : ((m.tipo&&m.tipo!=="texto"?"["+m.tipo+"] ":"") + (m.texto||"")).replace(/\s+/g," ").slice(0,90);
function irParaMsg(id){ let el=document.getElementById("zb-"+id);
  if(!el){ const i = zapMsgs.findIndex(m=>m.id==id); if(i>=0){ zapMostrarDesde(Math.min(i, _zapJan.vis) - 5); el = document.getElementById("zb-"+id); } }
  if(el){ el.scrollIntoView({block:"center"}); el.style.outline="2px solid #4a9b6f"; setTimeout(()=>el.style.outline="",1500); } }

// Rascunho é aviso automático que a regra mandou conferir antes. Soltar é
// virar pedido de envio; descartar apaga — e a chave única impede que o
// gerador o refaça, então descartar quer dizer "esse cliente não recebe".
async function soltarRascunho(id){
  await api(`/rest/v1/zap_mensagens?id=eq.${id}`,{method:"PATCH",
    headers:{Prefer:"return=minimal"}, body:JSON.stringify({status:"fila", autor_id:eu.id})});
  aviso("Aviso liberado para envio ✔");
  await abrirConversa(zapAberta);
}
async function descartarRascunho(id){
  if(!await confirmar("Descartar este aviso? O cliente não vai recebê-lo.")) return;
  await api(`/rest/v1/zap_mensagens?id=eq.${id}`,{method:"DELETE",
    headers:{Prefer:"return=minimal"}});
  await abrirConversa(zapAberta);
}

function alternarNota(){
  zapNota = !zapNota;
  const t = document.getElementById("zap-txt"), guarda = t ? t.value : "";
  pintarConversa();
  const t2 = document.getElementById("zap-txt");
  if(t2){ t2.value = guarda; travaZap(); t2.focus(); }
}

// F269 · a foto aparece em miniatura no balão, como no WhatsApp; o clique abre o original.
// O link assinado vale 1 hora e fica guardado 50 minutos, porque a conversa repinta a cada 6 s
const _miniUrl = new Map();
// F363 · a figurinha aparece no balão, menor e sem corte, como no WhatsApp
const miniZap = (caminho, abrir, fig) => `<img class="zap-mini${fig?" zap-fig":""}" data-mini="${esc(caminho)}" alt="${fig?"figurinha":"foto"}" onclick="${abrir}">`;
// F366 · o vídeo toca no próprio balão, com o mesmo link assinado da foto
const vidZap = caminho => `<video class="zap-mini zap-vid" data-mini="${esc(caminho)}" controls preload="none" playsinline></video>`;
async function carregarMinis(raiz){
  for(const im of (raiz||document).querySelectorAll(".zap-mini[data-mini]:not([src])")){
    const k = im.dataset.mini, g = _miniUrl.get(k);
    try{
      if(!g || g.ate < Date.now()) _miniUrl.set(k, {u: await linkArquivo(k, 3600), ate: Date.now() + 50*60e3});
      im.src = _miniUrl.get(k).u;
    }catch(e){ im.replaceWith(Object.assign(document.createElement("span"), {className:"meio-sub", textContent:im.tagName==="VIDEO"?"🎬 vídeo (não carregou)":"📷 foto (não carregou)"})); }
  }
}
async function verMidiaZap(id){
  const m = zapMsgs.find(x=>x.id===id); if(!m||!m.midia_url) return;
  const guia = window.open("","_blank");
  try{ const u = await linkArquivo(m.midia_url);
       if(guia) guia.location=u; else window.location=u; }
  catch(e){ if(guia) guia.close(); aviso("Não consegui abrir o arquivo"); }
}

// F422af · a sugestão da IA na conversa assumida fica acima do campo; Usar a leva ao campo, para alterar antes de enviar
async function descartarSugestaoZap(fica){
  const c = zapConvs.find(x=>x.id===zapAberta); if(!c || !c.sugestao_ia) return;
  const ant = c.sugestao_ia; c.sugestao_ia = null;
  try{ await api(`/rest/v1/zap_conversas?id=eq.${c.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({sugestao_ia:null})}); }
  catch(e){ c.sugestao_ia = ant; aviso(msgErro(e)); }
  // F574 · o Descartar da mensagem de iniciativa fica registrado, para a rotina das 05:00 aprender; o Usar vira "enviada" no envio
  // F582 · o descarte fica registrado para a IA aprender o que a equipe não quer
  if(!fica) retornoSugestao(c.id, ant, null, "descartada");
  if(!fica && ant.sugestao_id) api(`/rest/v1/sugestoes_rotina?id=eq.${ant.sugestao_id}&estado=eq.aberta`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({estado:"descartada", decidido_em:new Date().toISOString(), decidido_por:eu.id})}).catch(()=>{});
  if(!fica) pintarConversaGuardando();
}

// F574 · a anotação sugerida (rotina das 05:00 ou mensagem da equipe no WhatsApp) fica acima do campo de escrever, fora do histórico.
// Nada grava no caso sem o clique: Usar leva o texto ao campo, Agendar cria o evento, Descartar fecha.
const _sugAnot = new Map();   // caso_id → {em, itens}
function sugAnotBox(k){ setTimeout(()=>pintarSugAnot(k.id), 0); return `<div class="sug-anot" id="sug-anot" data-caso="${k.id}"></div>`; }
async function pintarSugAnot(casoId, forcar){
  let g = _sugAnot.get(casoId);
  if(forcar || !g || Date.now()-g.em > 60e3){
    try{ g = {em: Date.now(), itens: await api(`/rest/v1/sugestoes_rotina?select=id,texto,motivo,evento,origem,criado_em&caso_id=eq.${casoId}&tipo=eq.anotacao&estado=eq.aberta&origem=neq.colaborador&order=criado_em.desc&limit=3`)}; }
    catch(_){ g = {em: Date.now(), itens: []}; }
    _sugAnot.set(casoId, g);
  }
  const el = document.getElementById("sug-anot"); if(!el || el.dataset.caso!==casoId) return;
  el.innerHTML = (g.itens||[]).map(s=>{
    const ev = s.evento && s.evento.data ? s.evento : null;
    return `<div class="ze-sug-ia sug-anot-it" data-sug="${s.id}">
      <div class="ze-sug-cab">💡 Anotação sugerida${s.origem==="whatsapp" ? " · da mensagem enviada ao cliente" : " · rotina das 05:00"}${s.motivo ? ` · <span class="meio-sub">${esc(s.motivo)}</span>` : ""}</div>
      <div class="ze-sug-txt" style="white-space:pre-wrap">${esc(s.texto)}</div>
      <div class="ze-sug-bts"><button type="button" class="btn-mini" onclick="usarSugAnot('${casoId}','${s.id}')">Usar</button>${ev ? `<button type="button" class="btn-mini" title="${esc((ev.tipo||"Evento")+" em "+fmt(ev.data)+(ev.hora?" às "+ev.hora:""))}" onclick="agendarSugAnot('${casoId}','${s.id}')">Agendar</button>` : ""}<button type="button" class="btn-mini" onclick="decidirSugAnot('${casoId}','${s.id}','descartada')">Descartar</button></div></div>`;
  }).join("");
}
async function decidirSugAnot(casoId, id, estado){
  const g = _sugAnot.get(casoId); if(g) g.itens = g.itens.filter(s=>s.id!==id);
  try{ await api(`/rest/v1/sugestoes_rotina?id=eq.${id}&estado=eq.aberta`,{method:"PATCH",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({estado, decidido_em:new Date().toISOString(), decidido_por:eu.id})}); }
  catch(e){ aviso(msgErro(e)); }
  pintarSugAnot(casoId);
}
function usarSugAnot(casoId, id){
  const s = ((_sugAnot.get(casoId)||{}).itens||[]).find(x=>x.id===id); if(!s) return;
  const t = document.getElementById("and-texto");
  if(t){ t.value = t.value.trim() ? t.value.trimEnd()+"\n"+s.texto : s.texto; t.dispatchEvent(new Event("input",{bubbles:true})); t.focus(); }
  decidirSugAnot(casoId, id, "usada");
}
async function agendarSugAnot(casoId, id){
  const s = ((_sugAnot.get(casoId)||{}).itens||[]).find(x=>x.id===id); const ev = s && s.evento; if(!ev || !ev.data) return;
  try{
    const [evn] = await api(`/rest/v1/eventos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:casoId, tipo:ev.tipo||"Perícia", status:"agendada", data_hora:`${ev.data}T${ev.hora||"09:00"}:00-03:00`, local:ev.local||null, obs:String(s.texto||"").slice(0,160)})})||[];
    if(evn) D.eventos.push(evn);
    aviso(`${ev.tipo||"Evento"} agendado em ${fmt(ev.data)}`);
    montarSidebar();
  }catch(e){ return aviso("Não agendei: "+msgErro(e)); }
}

// F574 · Sugestões do dia: as mensagens de iniciativa que a rotina das 05:00 escreveu. Enviar põe na fila da ponte; nada sai sem o clique.
async function renderSugestoesDia(){
  tituloLista("💡 Sugestões do dia");
  const meio = document.getElementById("conteudo-meio");
  meio.innerHTML = `<p class="meio-sub">Carregando…</p>`;
  let itens = [], ia = [], colab = [];
  try{ [itens, colab, ia] = await Promise.all([
    api(`/rest/v1/sugestoes_rotina?select=id,texto,motivo,conversa_id,cliente_id,caso_id,criado_em&tipo=eq.mensagem&estado=eq.aberta&order=criado_em.asc&limit=100`),
    // F588 · o que o colaborador Claude deixou em pré-gravação (sem a coluna "dados", antes da migração, vem vazio)
    api(`/rest/v1/sugestoes_rotina?select=id,tipo,texto,texto_final,motivo,dados,estado,cliente_id,caso_id,criado_em,decidido_em&origem=eq.colaborador&order=criado_em.desc&limit=500`).catch(()=>[]),
    // F587 · as sugestões da IA que ficaram acima do campo de escrever sem Usar nem Descartar (a de iniciativa já está na lista acima)
    api(`/rest/v1/zap_conversas?select=id,cliente_id,lead_id,contato_nome,nome_perfil,telefone,sugestao_ia&sugestao_ia=not.is.null&order=ultima_em.desc&limit=100`).catch(()=>[])]); }
  catch(e){ meio.innerHTML = `<p class="meio-sub">Não carreguei: ${esc(msgErro(e))}</p>`; return; }
  ia = (ia||[]).filter(c=>c.sugestao_ia && c.sugestao_ia.texto && !c.sugestao_ia.sugestao_id);
  if(visao!=="sugestoesdia") return;
  const pode = souAdmin() || zapGestor();
  document.getElementById("sub-lista").innerHTML = `<span class="meio-sub">${itens.length+ia.length+colabAbertas(colab).length} para conferir</span>`;
  const chave = (k, rot) => `<label class="meio-sub" style="margin-right:12px"><input type="checkbox" data-cfg="${k}" ${cfgApp(k)==="sim"?"checked":""}> ${rot}</label>`;
  meio.innerHTML = `${souAdmin() ? `<div style="margin:0 0 12px">${chave("zap_iniciativa_ligada","Rotina das 05:00 sugere mensagens")}${chave("zap_anotacao_ligada","Sugerir anotação após mensagem da equipe")}</div>` : ""}
    ${itens.length && pode ? `<button type="button" class="btn-mini proc-pri" id="sug-todas">Enviar todas</button>` : ""}
    ${itens.length ? itens.map(s=>{ const c = D.cliPorId ? D.cliPorId.get(s.cliente_id) : (D.clientes||[]).find(x=>x.id===s.cliente_id);
      return `<div class="cartao sug-dia" data-sug="${s.id}" style="display:block;padding:10px;margin:8px 0">
        <div><strong>${esc(c ? c.nome : "Cliente")}</strong>${s.motivo ? ` · <span class="meio-sub">${esc(s.motivo)}</span>` : ""}</div>
        <textarea class="sug-dia-txt" rows="4" style="width:100%;margin:6px 0" ${s.conversa_id?"":"disabled"}>${esc(s.texto)}</textarea>
        <div>${s.conversa_id ? `<button type="button" class="btn-mini" data-ac="enviar">Enviar</button>` : `<span class="meio-sub">Sem conversa do WhatsApp</span>`}
          <button type="button" class="btn-mini" data-ac="descartar">Descartar</button>${c ? ` <button type="button" class="btn-mini" data-ac="ficha">Ficha</button>` : ""}</div></div>`; }).join("")
      : `<p class="meio-sub">Nenhuma mensagem sugerida em aberto.</p>`}
    ${ia.length ? `<h3 class="secao">Sugestões da IA pendentes · ${ia.length}</h3>` + ia.map(c=>`<div class="cartao sug-ia" data-conv="${c.id}" style="display:block;padding:10px;margin:8px 0">
        <div><strong>${esc(nomeDaConversa(c))}</strong> · <span class="meio-sub">${c.sugestao_ia.urgente?"⚠ urgente · ":""}sugerida ${esc(c.sugestao_ia.em ? dataBR(String(c.sugestao_ia.em).slice(0,10)) : "")}</span></div>
        <p style="white-space:pre-wrap;margin:6px 0">${esc(c.sugestao_ia.texto)}</p>
        <div><button type="button" class="btn-mini" data-ac="abrir" title="Abrir a conversa, onde a sugestão tem Usar">Abrir</button>
          <button type="button" class="btn-mini" data-ac="ia-descartar">Descartar</button></div></div>`).join("") : ""}
    ${secaoColab(colab)}`;
  meio.onchange = async ev=>{ const k = ev.target.dataset && ev.target.dataset.cfg; if(!k) return;
    try{ await guardarCfgApp(k, ev.target.checked ? "sim" : "nao"); aviso("Gravado"); }catch(e){ ev.target.checked = !ev.target.checked; aviso(msgErro(e)); } };
  const enviar = async (s, txt) => {
    await api(`/rest/v1/zap_mensagens`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({conversa_id:s.conversa_id, direcao:"saida", autor_id:eu.id, texto:txt, status:"fila"})});
    // o gatilho do envio já marca "enviada" com o texto final; o PATCH cobre a conversa que mudou de sugestão
    await api(`/rest/v1/sugestoes_rotina?id=eq.${s.id}&estado=eq.aberta`,{method:"PATCH",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({estado:"enviada", texto_final:txt, decidido_em:new Date().toISOString(), decidido_por:eu.id})});
  };
  meio.onclick = async ev=>{
    const b = ev.target.closest("button"); if(!b) return;
    if(b.id==="sug-todas"){
      const cards = [...meio.querySelectorAll(".sug-dia")].filter(x=>!x.querySelector(".sug-dia-txt").disabled);
      if(!confirm(`Enviar ${cards.length} mensagem(ns) aos clientes?`)) return;
      let n = 0; for(const el of cards){ const s = itens.find(x=>x.id===el.dataset.sug); const t = el.querySelector(".sug-dia-txt").value.trim(); if(!t) continue;
        try{ await enviar(s, t); n++; }catch(e){ aviso(msgErro(e)); } }
      aviso(`${n} enviada(s)`); return renderSugestoesDia();
    }
    if(b.closest(".sug-colab, .colab-regras")) return cliqueColab(b, colab);
    const ci = b.closest(".sug-ia");
    if(ci){ const c = ia.find(x=>x.id===ci.dataset.conv); if(!c) return;
      if(b.dataset.ac==="abrir") return zapNaTela(c.id);
      try{ await api(`/rest/v1/zap_conversas?id=eq.${c.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({sugestao_ia:null})}); }
      catch(e){ return aviso(msgErro(e)); }
      retornoSugestao(c.id, c.sugestao_ia, null, "descartada");
      const z = zapConvs.find(x=>x.id===c.id); if(z) z.sugestao_ia = null;
      return ci.remove(); }
    const el = b.closest(".sug-dia"); if(!el) return; const s = itens.find(x=>x.id===el.dataset.sug);
    if(b.dataset.ac==="ficha") return abrirFicha(s.cliente_id);
    try{
      if(b.dataset.ac==="enviar"){ const t = el.querySelector(".sug-dia-txt").value.trim(); if(!t) return; await enviar(s, t); aviso("Enviada"); }
      if(b.dataset.ac==="descartar") await api(`/rest/v1/sugestoes_rotina?id=eq.${s.id}&estado=eq.aberta`,{method:"PATCH",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({estado:"descartada", decidido_em:new Date().toISOString(), decidido_por:eu.id})});
    }catch(e){ return aviso(msgErro(e)); }
    el.remove();
  };
}

// F635 · confirmação que não saiu (número sem WhatsApp): reenvia ao WhatsApp da ficha, ou ao número digitado
async function reenviarConfZap(id){
  const c = zapConvs.find(x=>x.id===zapAberta), cli = clienteDaConversa(c);
  const zap = (cli && (cli.telefones||[]).find(t=>t.zap)) || {};
  const tel = prompt("Reenviar a confirmação para qual número?", zap.numero || (cli&&cli.telefone) || "");
  if(!tel) return;
  try{
    const r = await api(`/rest/v1/rpc/zap_conf_reenviar`,{method:"POST", body:JSON.stringify({p_msg:id, p_telefone:tel})});
    aviso(r==="ja" ? "Esse número já recebeu a confirmação." : "Confirmação reenviada.");
  }catch(e){ aviso("Não reenviou: "+(e.message||e)); }
}
