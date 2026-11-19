const FOLGA_INCREMENTAL = 2*60000, CARGA_CHEIA_A_CADA = 7*864e5;
const levar = async tabela => { const ks = Object.keys(tabela);
  const vs = await Promise.all(ks.map(k=>tabela[k]())); return Object.fromEntries(ks.map((k,i)=>[k,vs[i]])); };
const marcaDe = (linhas, antes=0) => linhas.reduce((m,l)=>{ const t=Date.parse(l.mudou_em); return t>m ? t : m; }, antes);
function marcasDaCarga(r){
  const m = Object.fromEntries(Object.keys(INCREMENTAIS).map(k=>[k, marcaDe(r[k]||[])]));
  // tabela vazia não tem carimbo: vale o mais novo das outras ("nada até agora")
  const teto = Math.max(0, ...Object.values(m));
  for(const k in m) if(!m[k]) m[k] = teto;
  return m;
}
function incrementalPronto(){
  return !!(D && D._bruto1 && D._marcas && Date.now() - (D._cheiaEm||0) < CARGA_CHEIA_A_CADA
    && Object.keys(INCREMENTAIS).every(k => D._marcas[k] > 0 && Array.isArray(D._bruto1[k])));
}
async function cargaIncremental(){
  const base = D._bruto1, marcas = D._marcas, ks = Object.keys(INCREMENTAIS);
  const desde = ms => new Date(ms - FOLGA_INCREMENTAL).toISOString();
  const pequenas = Object.fromEntries(Object.entries(CARGA_1).filter(([k])=>!INCREMENTAIS[k]));
  const [r, fora, ...novos] = await Promise.all([
    levar(pequenas),
    todas("apagados", `select=tabela,id&em=gte.${desde(Math.min(...ks.map(k=>marcas[k])))}`),
    ...ks.map(k => todas(INCREMENTAIS[k].t, `${INCREMENTAIS[k].sel}&mudou_em=gte.${desde(marcas[k])}`)),
  ]);
  let mudou = false;
  const novasMarcas = {};
  ks.forEach((k, i) => {
    const x = INCREMENTAIS[k], porId = new Map(base[k].map(l=>[l.id, l]));
    for(const l of novos[i]){
      const velho = porId.get(l.id);
      if(!velho || velho.mudou_em !== l.mudou_em) mudou = true;
      porId.set(l.id, l);
    }
    for(const a of fora) if(a.tabela === x.t && porId.delete(a.id)) mudou = true;
    let lista = [...porId.values()];
    if(x.fica) lista = lista.filter(x.fica);
    if(x.ord) lista.sort(x.ord);
    r[k] = lista;
    novasMarcas[k] = marcaDe(novos[i], marcas[k]);
  });
  if(!mudou) mudou = Object.keys(pequenas).some(k => JSON.stringify(r[k]) !== JSON.stringify(base[k]));
  return {r, marcas: novasMarcas, mudou};
}
let dadosDoCache = false;
// Devolve true quando montou dados novos. `leve` é a vigia da tela aberta:
// reaproveita a segunda leva e NUNCA faz carga completa (18 MB a cada 3 min
// consumiriam a cota do mês em poucos dias).
let cargasAndando = 0;
async function carregar(op={}){
  cargasAndando++;
  try{ return await carregarJa(op); } finally{ cargasAndando--; }
}
async function carregarJa(op){
  const d30 = new Date(); d30.setDate(d30.getDate()-30);
  window.__d30 = d30;
  const D0 = D;
  const inc = incrementalPronto() ? await cargaIncremental().catch(()=>null) : null;
  if(op.leve){
    // outra carga trocou D, a pessoa abriu uma ficha enquanto a consulta ia e
    // voltava, ou nada mudou: a vigia não mexe em D
    if(D !== D0 || cargasAndando > 1 || !inc || !inc.mudou || (op.livre && !op.livre())){
      // carimbo só anda com o dado dentro de D; sem mudança, pode andar
      if(inc && !inc.mudou && D === D0) D._marcas = inc.marcas;
      return false;
    }
  }
  const p2 = op.leve ? Promise.resolve(D._bruto2||{}) : levar(CARGA_2);
  p2.catch(()=>{});
  const r1 = inc ? inc.r : await levar(CARGA_1);
  // a mesma régua de ordem nas duas cargas, para a lista não trocar nomes de
  // lugar entre a carga completa (ordem do banco) e a incremental
  if(!inc) for(const [k, x] of Object.entries(INCREMENTAIS)) if(x.ord && Array.isArray(r1[k])) r1[k].sort(x.ord);
  const marcas = inc ? inc.marcas : marcasDaCarga(r1), cheiaEm = inc ? D._cheiaEm : Date.now();
  if(op.cedo){ montarD(r1); D._completo = false; dadosDoCache = false; op.cedo(); completarD(await p2); }
  else { montarD({...r1, ...(await p2)}); dadosDoCache = false; }
  D._marcas = marcas; D._cheiaEm = cheiaEm;
  D._completo = true;
  if(!op.leve) guardarSessao();
  return true;
}
// E1 · A TELA ABERTA SE ATUALIZA SOZINHA. A cada 3 min, com a aba à vista,
// busca só o que mudou (alguns KB) e repinta a lista: o que a sincronização
// trouxe do To Do e o que os colegas gravaram no CRM. Com ficha ou caixa
// aberta, ou com algo digitado e não gravado na tela, espera o ciclo seguinte.
const VIGIA_MS = 180000;
let vigiaLigada = false, vigiando = false;
const VISTAS_VIGIADAS = ["meudia","planejado","minhas","importante","recebimentos","checagem",
  "particulares","mencoes","novidades","calendario","quadro","tabela","periciasaviso","sugestoesdia","pessoas","quadro1","quadro2","quadro3","dashboard",
  "auditoria"];
function telaOcupada(){
  if(clienteAberto || buscaTxt) return true;
  if(!visao.startsWith("fase:") && !VISTAS_VIGIADAS.includes(visao)) return true;
  const m = document.getElementById("modal");
  if(m && m.style.display !== "none" && m.innerHTML) return true;
  const foco = document.activeElement;
  if(foco && foco.matches && foco.matches("input,textarea,select,[contenteditable]")) return true;
  // escrito e não gravado (o campo perdeu o foco, mas o texto está lá)
  return [...document.querySelectorAll("#conteudo-meio :is(input,textarea,select)")].some(el =>
    el.type==="checkbox"||el.type==="radio" ? el.checked!==el.defaultChecked
    : el.tagName==="SELECT" ? [...el.options].some(o=>o.selected!==o.defaultSelected)
    : el.type!=="hidden" && el.value!==el.defaultValue);
}
async function vigiarMudancas(){
  if(vigiando || cargasAndando || document.hidden || syncRodando || !D || !D._completo || !D._marcas
     || telaOcupada()) return;
  vigiando = true;
  try{ if(await carregar({leve:true, livre:()=>!telaOcupada()})){ montarSidebar(); render(); } }
  catch(e){}
  finally{ vigiando = false; }
}
// o que só telas secundárias usam: entra em D quando chegar, sem tocar no resto
const _analisesGravadas = new Map();
function completarD(r){
  D.and30 = r.and30||[]; D.novid = r.novid||[]; D.modelos = r.modelos||[]; D.sugestoes = r.sugestoes||[];
  D.leads = r.leads||[]; D.docs = r.docs||[]; D.ckls = r.ckls||[]; D.docModelos = r.docModelos||[];
  D.frases = r.frases||[]; D.lembrarMotivos = r.lembrarMotivos||[]; D.rotinas = r.rotinas||[];
  D.rotinasFeitas = r.rotinasFeitas||[];
  D.sinalizados = r.sinal||[];
  if(D.casoPorId) retraduzirCrps(D.novid);   // F236 · na 2ª leva, com os casos já montados
  D.mencoesEnv = r.mencEnv||[];   // F236
  // ⚖️ F48 — null preservado de propósito (tabela ausente ≠ tabela vazia)
  D.analises = r.anals===undefined ? [] : r.anals;
  // F244 · a análise registrada há pouco que a carga ainda não trouxe (a busca saiu antes da gravação) continua na memória:
  // sem isso o Desfecho voltava a "nenhuma análise registrada" e desligava o botão (o f219 esgotava o tempo no GitHub)
  if(Array.isArray(D.analises)) for(const [id, g] of _analisesGravadas){
    if(Date.now() - g.em > 120000 || D.analises.some(x=>x.id===id)) _analisesGravadas.delete(id); else D.analises.push(g.a); }
  D.analisesPorCliente = new Map();
  for(const a of (D.analises||[])){
    if(!D.analisesPorCliente.has(a.cliente_id)) D.analisesPorCliente.set(a.cliente_id,[]);
    D.analisesPorCliente.get(a.cliente_id).push(a);
  }
  D.inssCal = r.inssCal||[];
  // conta o que cobra ação: minha conversa com mensagem nova, ou conversa
  // aberta sem dono nenhum (para o gestor, toda; para o colaborador, F362, a que tem mensagem não lida). O resto não precisa de contador piscando.
  // F594 · a conversa que a IA conduz não conta como nova
  D.zapResumo = (r.zaps||[]).filter(z=>z.status!=="resolvida" && !comIaZap(z)
    && ((z.atendente_id===eu.id && z.nao_lidas>0) || (!z.atendente_id && (zapGestor() || z.nao_lidas>0)))).length;
  // só guarda o que é da segunda leva (a primeira já está em _bruto1)
  D._bruto2 = Object.fromEntries(Object.keys(CARGA_2).map(k=>[k, r[k]]));
}
function montarD(r){
  const {colaboradores, clientes, casos, atribuicoes, tarefas, eventos, pagamentos, meudia, mencoes, apos, listaPref, cfgs, tarefasAnd, lembs} = r;
  D = {colaboradores, clientes, casos, atribuicoes, tarefas, eventos, pagamentos, meudia, mencoes, apos, listaPref};
  D._bruto1 = {colaboradores, clientes, casos, atribuicoes, tarefas, eventos, pagamentos, meudia, mencoes, apos, listaPref, cfgs, tarefasAnd, lembs, qualid:r.qualid, seguidores:r.seguidores};
  D.seguidores = r.seguidores||[];   // F441
  D.lembretes = lembs||[];
  D.qualidade = r.qualid===undefined ? [] : r.qualid;   // F282 · null: rodar o schema_qualidade.sql
  D.eventos = semEventoRepetido(eventos||[]);   // F236 · "Perícia" e "Perícia médica" do mesmo dia são uma perícia só
  completarD(r);
  D.prefPorLista = new Map((listaPref||[]).map(x=>[x.chave,x]));
  D.config = new Map((cfgs||[]).map(x=>[x.chave,x.valor]));
  // a cor do colaborador entra crua em dezenas de style="background:..." —
  // sanear UMA vez aqui protege todos os pontos de render de uma vez
  for(const co of D.colaboradores||[])
    if(!/^#[0-9a-fA-F]{3,8}$/.test(co.cor||"")) co.cor="#8A9099";
  // tarefas por comentário, indexadas por caso: é o que pinta as listas
  D.tarefasPorCaso = new Map();
  (tarefasAnd||[]).forEach(t=>{ if(!D.tarefasPorCaso.has(t.caso_id)) D.tarefasPorCaso.set(t.caso_id,[]);
                                D.tarefasPorCaso.get(t.caso_id).push(t); });
  // F130 · o "#CPF" do título é coisa do To Do; no CRM não aparece nunca
  // F236 · o bloco do e-Recursos gravado com as regras velhas se relê, e o caso acompanha a decisão (normalizarCrps)
  casos.forEach(k=>{ k.titulo = semCpfTitulo(k.titulo); normalizarCrps(k); });
  clientes.forEach(c=>{ if(c.campos && Array.isArray(c.campos.atendimento))
    c.campos.atendimento = notasSemRepeticao(c.campos.atendimento); });   // F173
  D.cliPorId = new Map(clientes.map(c=>[c.id,c]));
  D.casoPorId = new Map(casos.map(c=>[c.id,c]));
  D.colPorId = new Map(colaboradores.map(c=>[c.id,c]));
  D.casosDoCliente = new Map();
  casos.forEach(k=>{ if(!D.casosDoCliente.has(k.cliente_id)) D.casosDoCliente.set(k.cliente_id,[]);
                     D.casosDoCliente.get(k.cliente_id).push(k); });
  separarCardsViraram();   // F236 · o card cujo pré-caso virou caso não entra nos lembretes vivos
  D.atrDoCaso = new Map();
  atribuicoes.forEach(a=>{ if(!D.atrDoCaso.has(a.caso_id)) D.atrDoCaso.set(a.caso_id,[]);
                           D.atrDoCaso.get(a.caso_id).push(a.colaborador_id); });
  // índice de pesquisa por cliente
  clientes.forEach(reindexarCliente);
  retraduzirCrps(D.novid);   // F236 · o texto do andamento do e-Recursos segue o bloco relido
}

// ── estrutura de navegação ────────────────────────────────────────────────
const FASES = [
  ["prazo","🗓 Tarefas com Prazo"], ["escritorio","🙋 Escritório"], ["inss","🌻 INSS"],
  ["judicial","👪 Judicial"], ["conselho","🖥 Conselho de Recursos"],
  ["peticao_inicial","💡 Petições Iniciais"],
  ["aposentadoria_futura","🙏 Aposentadorias Futuras"],
];
const NOME_FASE = {escritorio:"Escritório", inss:"INSS", conselho:"Conselho", judicial:"Judicial",
  pagamento:"Pagamento", aposentadoria_futura:"Apos. Futura",
  peticao_inicial:"Petições Iniciais", outro:"Outros", encerrado:"Encerrado"};

// cores por lista, como no To Do (fundo suave + título na cor da lista)
const TEMA = {
  "meudia":            ["#5c6bc0", "#eef0fa"],
  "mencoes":           ["#b4530a", "#fdf3e7"],
  "planejado":         ["#1e6f50", "#e9f5ef"],
  "minhas":            ["#00668c", "#e7f4fa"],
  "importante":        ["#d64570", "#fdeef3"],
  "particulares":      ["#5c53c9", "#f0effa"],
  "fase:prazo":        ["#5c53c9", "#eceafb"],
  "fase:escritorio":   ["#b4530a", "#fdf3e7"],
  "fase:inss":         ["#9a7b00", "#fdf9e2"],
  "fase:judicial":     ["#1e4fa3", "#e8f1fb"],
  "fase:conselho":     ["#00668c", "#e7f4fa"],
  "fase:aposentadoria_futura": ["#7a4dd8", "#f2ecfc"],
  "fase:peticao_inicial": ["#B08900", "#FBF6E3"],
  "claude":            ["#7a4dd8", "#f2ecfc"],
  "docmodelos":        ["#4a5568", "#f1f3f5"],
  "quadro":            ["#1e4fa3", "#f3f6fb"],
  "tabela":            ["#1e4fa3", "#f3f6fb"],
  "periciasaviso":     ["#7a4dd8", "#f2ecfc"],
  "sugestoesdia":      ["#1e6f50", "#e9f5ef"],
  "vendas":            ["#1e6f50", "#e9f5ef"],
  "parcerias":         ["#6d4c41", "#f4eeeb"],
  "marketing":         ["#d64570", "#fdeef3"],
  "recebimentos":      ["#1e6f50", "#e9f5ef"],
  "agenda":            ["#5c2e91", "#f1eafa"],
  "dashboard":         ["#1e4fa3", "#f3f6fb"],
  "novocliente":       ["#1e4fa3", "#f3f6fb"],
};
// fundos prontos: quatro papéis lisos e quatro com um degradê suave. Imagem
// muito carregada atrapalha a leitura da lista, então os prontos são calmos.
const FUNDOS_PRONTOS = [
  ["Padrão da lista", ""],
  ["Areia",   "#F5EFE3"], ["Menta",   "#E9F4EE"], ["Céu",     "#E8F0FA"],
  ["Lavanda", "#EFECF8"], ["Papel",   "#F4F4F2"], ["Argila",  "#F7EBE6"],
  ["Amanhecer", "linear-gradient(160deg,#FDF3E7 0%,#F6E7F2 100%)"],
  ["Sereno",    "linear-gradient(160deg,#E8F0FA 0%,#E9F4EE 100%)"],
];
function fundoDaLista(v){
  const p=(D.prefPorLista||new Map()).get(v);
  return (p && p.fundo) || null;
}
function aplicarTema(){
  // como no Microsoft To Do: cada lista pinta o fundo da área de trabalho
  // com a sua cor, bem clara. Quem passa o dia no sistema sabe em que lista
  // está pela cor, antes de ler o título — e é a familiaridade que a equipe
  // já tem. Os cartões continuam brancos, então o texto não perde contraste.
  const chave = buscaTxt?"dashboard":visao;
  const [cor, fundo] = TEMA[chave] || ["#234E9E", "#E8EAEE"];
  const meio = document.querySelector(".meio");
  const escolhido = fundoDaLista(chave);
  meio.style.backgroundImage = "";
  if(escolhido && /^(https?:|data:)/.test(escolhido)){       // imagem enviada
    meio.style.background = fundo;
    meio.style.backgroundImage = `url("${escolhido.replace(/["\\]/g,"")}")`;
    meio.style.backgroundSize = "cover";
    meio.style.backgroundPosition = "center";
    meio.style.backgroundAttachment = "local";
  } else {
    // padrão neutro (--fundo) para toda lista; só um fundo ESCOLHIDO pinta.
    // A cor por lista saiu do miolo — ela vive na pastilha do menu.
    meio.style.background = escolhido || "";
  }
  // título sempre azul-escuro (espec. 6.1); a cor da lista fica RESTRITA à
  // pastilha do item ativo do menu, via --cor-lista
  document.getElementById("titulo-lista").style.color = "";
  document.documentElement.style.setProperty("--cor-lista", cor);
}

function ativos(){ return D.casos.filter(k=>k.fase!=="encerrado"); }
// F236 · "DE QUEM É" TEM UMA REGRA SÓ, a do Atribuídas a mim: atribuído ao caso ou com
// tarefa aberta nele. Vale para o filtro por pessoa das listas e para as Novidades.
const ehDoColab = (k, col) => (D.atrDoCaso.get(k.id)||[]).includes(col) || (D.tarefasPorCaso.get(k.id)||[]).some(t=>t.colaborador_id===col);
// o cliente em atendimento (sem caso) é de quem abriu o pré-caso ou escreveu/recebeu a anotação
const doAtendimentoDe = (c, col) => ((c.campos||{}).precasos||[]).some(p=>p.quem===col)
  || ((c.campos||{}).atendimento||[]).some(n=>n.autor_id===col || n.atribuido===col || (n.atribuidos||[]).includes(col));
// F236 · QUEM RESPONDE PELO ITEM DA AGENDA: o que é do caso, os atribuídos; sem atribuído, o
// administrador. Antes, o item sem dono aparecia no Meu Dia de todos e não era de ninguém.
// 11.93 · a lista pessoal "☕ <Nome>" de um colaborador ativo é dele (decisão do Paulo, 31.10.2026: os casos do ☕ Marcos entram no Meu Dia e nos prazos dele)
// F615 · a lista "Marcos" do To Do, com ou sem emoji, é do colaborador ativo cujo nome começa por Marcos
function donoDaLista(k){ const m = k && (/^☕\s*(\S+)/.exec(listaDe(k)) || (listaMarcos(k) && [, "Marcos"])); if(!m) return null;
  const n = semAcento(m[1]).toLowerCase();
  return [...D.colPorId.values()].find(c=>c.ativo!==false && semAcento((c.nome||"").split(" ")[0]).toLowerCase()===n) || null; }
const donosDoCaso = k => { const a = (k && D.atrDoCaso.get(k.id))||[]; if(a.length) return a; const d = donoDaLista(k); return d ? [d.id] : [colAdmin().id]; };
function donosDoCliente(cliId){
  const a = [...new Set((D.casosDoCliente.get(cliId)||[]).filter(k=>k.fase!=="encerrado").flatMap(k=>D.atrDoCaso.get(k.id)||[]))];
  return a.length ? a : [colAdmin().id];
}
// o card de aposentadoria e o honorário vão ao advogado: o atribuído com cargo de advogado do caso
// (ou do caso mais recente do cliente); sem nenhum, o administrador
function advogadoDoCliente(cliId, k){
  // F245 · o advogado escolhido na ficha (abaixo do nome) vale primeiro
  const esc0 = ((D.cliPorId && D.cliPorId.get(cliId) || {}).campos || {}).advogado_id;
  if(esc0 && D.colPorId.get(esc0)) return [esc0];
  const ks = [k, ...(D.casosDoCliente.get(cliId)||[]).slice().sort((x,y)=>String(y.criado_em||"").localeCompare(String(x.criado_em||"")))].filter(Boolean);
  for(const x of ks){ const adv = (D.atrDoCaso.get(x.id)||[]).filter(id=>(D.colPorId.get(id)||{}).cargo==="advogado"); if(adv.length) return adv; }
  return [colAdmin().id];
}
// F236 · a lista pessoal do To Do (☕) vira caso na fase "outro" sem estar em lista nenhuma do
// escritório: não é agenda de ninguém (Tarefas com Prazo continua sendo)
const foraDoFluxo = k => k.fase==="outro" && listaDe(k)!=="🗓 Tarefas com Prazo" && !donoDaLista(k);
// F236 · o card de aposentadoria que virou caso (ou foi arquivado) não cobra mais nada: vale a marca
// do CRM e, enquanto o "Gerar o caso" não desliga o card, o caso aberto do mesmo benefício
function cardVivo(l){
  const crm = cardCrm(l), pc = crm.precaso_id && D.casoPorId.get(crm.precaso_id);
  if(crm.caso_id || ["caso","arquivado"].includes(crm.etapa) || (pc && !ehPreCaso(pc))) return false;
  const tit = dsa(l.titulo||"");
  return !(D.casosDoCliente.get(l.cliente_id)||[]).some(k=>k.fase!=="encerrado" && !ehPreCaso(k) && tit && dsa(k.beneficio||k.titulo||"")===tit);
}
// F236 · o próximo compromisso de cada caso, da mesma conta da agenda: é a data que a linha da lista
// mostra e a ordem "Data mais próxima" usa (vencido primeiro)
let _agPorCaso = null;
function agendaPorCaso(){
  if(!_agPorCaso){
    _agPorCaso = new Map();
    queueMicrotask(()=>{ _agPorCaso = null; });   // shortcut: vale a passada síncrona da tela; qualquer espera refaz a conta
    for(const i of itensAgenda(null)) if(i.k && !_agPorCaso.has(i.k.id)) _agPorCaso.set(i.k.id, i);
  }
  return _agPorCaso;
}
const dataQueCobra = ks => ks.map(k=>(agendaPorCaso().get(k.id)||{}).data || k.prazo).filter(Boolean).sort()[0] || "9999";
// chip de prazo estilo semáforo 🚦
function chipPrazo(prazo, motivo){
  if(!prazo) return "";
  const cls = prazo<hoje() ? "venc" : prazo===hoje() ? "hoje" : "ok";
  return `<span class="chip prazo ${cls}"${motivo?` title="${esc(motivo)}"`:""}>🗓 ${prazo===hoje()?"Hoje":fmt(prazo)}</span>`;
}
function diasAte(iso){ return Math.ceil((new Date(iso+"T12:00:00")-new Date(hoje()+"T12:00:00"))/864e5); }
function chipExig(k){
  if(!k.exigencia_prazo) return "";
  const d=diasAte(k.exigencia_prazo);
  return `<span class="chip exig-chip">⚠ exigência · ${d<0?`VENCIDA há ${-d}d`:d===0?"vence HOJE":`faltam ${d}d`}</span>`;
}
// preenche um modelo de mensagem com os dados do cliente/evento
function preencher(texto, cli, ev, prazoExig){
  const map={
    "{nome}": cli?cli.nome:"", "{primeiro_nome}": cli?cli.nome.split(" ")[0]:"",
    "{data}": ev?fmtTS(ev.data_hora):"", "{hora}": ev?horaSP(ev.data_hora):"",
    "{local}": ev?(ev.local||"(local a confirmar)"):"", "{prazo}": prazoExig?fmt(prazoExig):"",
  };
  return Object.entries(map).reduce((t,[k,v])=>t.split(k).join(v), texto);
}
function modeloPor(contexto){ return D.modelos.find(m=>m.contexto===contexto); }
// link "criar evento" do Google Agenda (sem precisar de conexão/conta Google no app)
function gcal(titulo, dataIso, horaIni, minutos, detalhes, local){
  const d1=new Date(dataIso+"T"+horaIni+":00");
  const d2=new Date(d1.getTime()+(minutos||60)*60000);
  const g=d=>d.toLocaleDateString("sv").replace(/-/g,"")+"T"+d.toTimeString().slice(0,8).replace(/:/g,"");
  const p=new URLSearchParams({action:"TEMPLATE", text:titulo, dates:g(d1)+"/"+g(d2),
    details:detalhes||"", location:local||"", ctz:"America/Sao_Paulo"});
  return "https://calendar.google.com/calendar/render?"+p;
}
// lista "efetiva" do caso: um mover pedido no app vale na hora,
// mesmo antes de o To Do acompanhar (escrever_todo faz o mover físico)
function listaDe(k){ return k.mover_para || k.origem_lista || "—"; }
// F615 · a matéria é do CASO (casos.area): fora da previdenciária o caso é genérico, só anotações,
// sem DER, NB, espécie, CRPS, Meu INSS, Resumo do Caso, prazos do INSS nem trilha (decisão do Paulo, 15.11.2026)
const AREAS = {previdenciaria:"Previdenciária", civil:"Cível", trabalhista:"Trabalhista", familia:"Família", criminal:"Criminal", tributaria:"Tributária"};
const areaDe = k => (k && AREAS[k.area] && k.area) || "previdenciaria";
const ehPrev = k => areaDe(k)==="previdenciaria";
const listaMarcos = k => !!k && semAcento(String(listaDe(k))).toLowerCase().replace(/[^a-z]/g, "")==="marcos";
// o caso da lista Marcos sem espécie ainda não disse a matéria: o cartão pede a escolha, e o banco não chuta
const areaAEscolher = k => ehPrev(k) && listaMarcos(k) && !k.especie && !k.beneficio;
// 🙋 ESCRITÓRIO NÃO É LISTA DE CASOS (08.99, pedido do Paulo). Quem está lá
// ainda não tem processo: é cliente em atendimento, atrás de documento. A
// lista passa a mostrar esses cadastros — a sincronização não cria mais caso
// para as tarefas dessa lista, e os casos antigos continuam aparecendo.
function clientesEmAtendimento(){
  return D.clientes.filter(c=>{
    const cp = c.campos||{};
    if(!(cp.atendimento||[]).length && !cp.especie && !(cp.docs_pedidos||[]).length
       && !(cp.precasos||[]).length) return false;
    return !(D.casosDoCliente.get(c.id)||[]).some(k=>k.fase!=="encerrado");
  }).sort((a,b)=>ultimaAnotacao(b).localeCompare(ultimaAnotacao(a)));
}
const ultimaAnotacao = c => ((c.campos||{}).atendimento||[])
  .map(n=>n.em||"").sort().slice(-1)[0] || "";

function casosDaFase(f){
  // Tarefas com Prazo é a LISTA FIXA do To Do (não "tudo que tem data") —
  // a agenda geral por data fica na visão Planejado.
  if(f==="prazo") return ativos().filter(k=>listaDe(k)==="🗓 Tarefas com Prazo");
  if(f==="marcos") return ativos().filter(listaMarcos);   // F660
  return ativos().filter(k=>k.fase===f);
}
// mover caso de lista, como o "Mover" do botão direito no To Do
const LISTAS_MOVER=[
  ["🗓 Tarefas com Prazo","outro"], ["🙋 Escritório","escritorio"], ["🌻 INSS","inss"],
  ["🖥 Conselho de Recursos","conselho"], ["👪 Judicial","judicial"],
  ["💡 Petições Iniciais","peticao_inicial"],
  ["🙏 Aposentadorias Futuras","aposentadoria_futura"], ["💵 Pagamentos","pagamento"],
];
function fecharMenuMover(){ const m=document.getElementById("menu-mover"); if(m) m.remove(); }
function menuMover(ev, cliId, linha){
  ev.preventDefault(); fecharMenuMover();
  const ks=(D.casosDoCliente.get(cliId)||[]).filter(k=>k.fase!=="encerrado");
  if(!ks.length) return;
  const m=document.createElement("div"); m.id="menu-mover";
  // o ☀️ saiu da linha (era mais um ícone competindo com o nome), mas o Meu
  // Dia continua: a ação mora aqui, no menu que o botão direito já abria
  const noDia = D.meudia.some(x=>x.colaborador_id===eu.id && ks.some(k=>k.id===x.caso_id));
  m.innerHTML = (linha ? `<div class="mm-it" data-selecionar>${_sel.has(chaveSel(linha)) ? "☐ Tirar da seleção" : "☑ Selecionar"}</div>` : "")   // F443
    + `<div class="mm-it destaque" data-dia="${ks[0].id}">${
      noDia?"☀️ Tirar do Meu Dia":"☀️ Adicionar ao Meu Dia"}</div>`
    + `<div class="mm-tit">Mover para…</div>` + ks.map(k=>
    (ks.length>1?`<div class="mm-caso">${esc(tituloCaso(k))}</div>`:"") +
    LISTAS_MOVER.map(([l])=>{
      const atual = listaDe(k)===l;
      return `<div class="mm-it ${atual?"atual":""}" data-mv="${k.id}|${l}">${l}${atual?" ✓":""}</div>`;
    }).join("")).join("");
  document.body.appendChild(m);
  const W=m.offsetWidth||240, H=m.offsetHeight||280;
  m.style.left=Math.min(ev.clientX, innerWidth-W-8)+"px";
  m.style.top =Math.min(ev.clientY, innerHeight-H-8)+"px";
  m.querySelectorAll("[data-mv]").forEach(it=>it.onclick=()=>{
    const [kid,l]=it.dataset.mv.split("|"); moverCaso(kid,l);
  });
  const bd = m.querySelector("[data-dia]");
  if(bd) bd.onclick=()=>{ fecharMenuMover(); alternarMeuDia(bd.dataset.dia); };
  const bs = m.querySelector("[data-selecionar]");
  if(bs) bs.onclick=()=>{ fecharMenuMover(); alternarSel(linha); };
  setTimeout(()=>document.addEventListener("click", fecharMenuMover, {once:true}));
}
// Meu Dia: liga e desliga. Saiu da linha da lista (era mais um ícone
// competindo com o nome) e vive no menu do botão direito, onde já mora o
// "Mover para…". A lista ☀️ Meu Dia continua a mesma.
async function alternarMeuDia(casoId){
  if(!casoId) return;
  const ja = D.meudia.find(m=>m.caso_id===casoId && m.colaborador_id===eu.id);
  try{
    if(ja){
      await api(`/rest/v1/meu_dia?id=eq.${ja.id}`,{method:"DELETE"});
      aviso("Retirado do seu Meu Dia");
    }else{
      await api(`/rest/v1/meu_dia`,{method:"POST",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({colaborador_id:eu.id, caso_id:casoId, dia:hoje()})});
      aviso("Adicionado ao seu Meu Dia ☀️");
    }
    D.meudia = await todas("meu_dia",`select=*&dia=eq.${hoje()}`);
    montarSidebar(); render();
  }catch(e){ aviso("Não consegui mexer no Meu Dia"); }
}

// ── DE DIAS ANTERIORES (as "sugestões" do To Do) ──────────────────────────
// O Meu Dia do To Do esvazia à meia-noite, mas o que ficou por fazer volta
// como sugestão, para trazer ao dia com um clique. Como lá, vale o ÚLTIMO dia
// em que EU usei o Meu Dia (até sete atrás): caso ainda aberto e fora do de hoje.
let meuDiaAntes = {dia: null, linhas: []};
function carregarMeuDiaAntes(){
  if(meuDiaAntes.dia===hoje()) return;
  meuDiaAntes = {dia: hoje(), linhas: []};
  todas("meu_dia",`select=caso_id,dia&colaborador_id=eq.${eu.id}&caso_id=not.is.null&dia=lt.${hoje()}&dia=gte.${somaDias(hoje(),-7)}`)
    .then(r=>{ meuDiaAntes.linhas = r||[]; if(visao==="meudia" && !clienteAberto) render(); }).catch(()=>{});
}
function casosDeDiasAnteriores(col){
  if(col && col!==eu.id) return [];
  carregarMeuDiaAntes();
  const jaHoje = new Set(D.meudia.filter(m=>m.colaborador_id===eu.id).map(m=>m.caso_id));
  const ultimo = meuDiaAntes.linhas.reduce((u,m)=>m.dia>u?m.dia:u, "");
  const ids = new Set(meuDiaAntes.linhas.filter(m=>m.dia===ultimo).map(m=>m.caso_id).filter(id=>!jaHoje.has(id)));
  return ativos().filter(k=>ids.has(k.id));
}
function secaoDiasAnteriores(col){
  const ks = casosDeDiasAnteriores(col); if(!ks.length) return "";
  return `<section class="pl-grupo"><h3 class="secao dica-tit" title="Do último dia em que você usou o Meu Dia, ainda aberto.">De dias anteriores <span class="pl-n">${ks.length}</span></h3>`
    + `<p class="meio-sub" style="display:flex;align-items:center;gap:10px;padding:8px 16px;margin:0"><button class="btn-mini" onclick="trazerParaHoje()" title="☀️ Trazer todos para hoje"><span aria-hidden="true">☀️ Hoje</span><span class="sr-only">☀️ Trazer todos para hoje</span></button></p>`
    + grupoClientes(ks).map(([c,g])=>cartaoCliente(c,g)).join("") + `</section>`;
}
async function trazerParaHoje(){
  const ks = casosDeDiasAnteriores(null); if(!ks.length) return;
  try{
    // um a um: o índice único do dia devolve 409 para o que outra aba já trouxe, e esse se ignora
    await Promise.all(ks.map(k=>api(`/rest/v1/meu_dia`,{method:"POST",headers:{Prefer:"return=minimal"},
      body:JSON.stringify({colaborador_id:eu.id, caso_id:k.id, dia:hoje()})}).catch(()=>{})));
    D.meudia = await todas("meu_dia",`select=*&dia=eq.${hoje()}`);
    aviso(`${ks.length} trazido${ks.length>1?"s":""} para o seu Meu Dia ☀️`);
  }catch(e){ aviso("Não consegui trazer para o Meu Dia"); }
  montarSidebar(); render();
}

async function moverCaso(casoId, lista){
  const k=D.casoPorId.get(casoId); if(!k || listaDe(k)===lista) return fecharMenuMover();
  const fase=(LISTAS_MOVER.find(([l])=>l===lista)||[])[1];
  const limpaEtapa = fase && fase!==k.fase && k.etapa && !etapasAceitas(fase).includes(k.etapa);
  k.mover_para=lista; if(fase) k.fase=fase; if(limpaEtapa) k.etapa=null;
  await patchCaso(casoId, {mover_para:lista, ...(fase?{fase}:{}), ...(limpaEtapa?{etapa:null}:{})});
  fecharMenuMover();
  aviso(`Movido para ${lista} — a sincronização do To Do não desfaz a mudança`);
  montarSidebar(); render();
}

// ══════════════════════════════════════════════════════════════════════════
// F117 · A ETAPA ANDA SOZINHA (pedido do Paulo, 18.09). Protocolar o recurso
// sempre foi seguido de arrastar o caso de 🌻 INSS para 🖥 Conselho de
// Recursos na mão. O gesto que registra a providência agora move o caso.
// Três travas, porque mover caso alheio é pior do que não mover. Só anda para
// FRENTE na trilha, nunca mexe em caso encerrado ou em pagamento, e a faixa
// fica oito segundos com o DESFAZER, que é a regra da volta da F35.
// ══════════════════════════════════════════════════════════════════════════
const ORDEM_ETAPA = ["escritorio","inss","conselho","judicial","pagamento"];
// ══════════════════════════════════════════════════════════════════════════
// F119 · A ETAPA, o passo DENTRO da fase (pedido do Paulo, 18.09). A fase diz
// em que trilho o caso corre, 🌻 INSS ou 👪 Judicial. A etapa diz onde ele
// está nesse trilho, aguardando perícia, em exigência, aguardando sentença.
// É o estado que o escritório DECLARA, e não o que o sistema deduz do último
// comentário — é por isso que ele serve para falar com o cliente.
// ══════════════════════════════════════════════════════════════════════════
// espelho no conector do Claude: ETAPAS em crm/fase2/mcp/index.ts (acrescentou aqui, acrescente lá)
const ETAPAS_POR_FASE = {
  escritorio: ["em atendimento","reunindo documentos","análise de direito","aguardando o cliente"],
  inss:       ["requerimento protocolado","aguardando perícia","perícia realizada","em exigência",
               "aguardando análise","decidido"],
  conselho:   ["recurso protocolado","aguardando distribuição","em diligência","em pauta","julgado"],
  judicial:   ["ação distribuída","aguardando citação","contestação apresentada","perícia designada",
               "perícia realizada","aguardando sentença","sentença publicada","em recurso"],
  peticao_inicial: ["a redigir","redigida","a protocolar"],
  pagamento:  ["aguardando implantação","benefício implantado","aguardando RPV","RPV expedida","recebido"],
  aposentadoria_futura: ["monitorando","documentação em dia","pronto para protocolar"],
};
// F236 · a etapa é a da fase verdadeira: no 🗓 Tarefas com Prazo (fase "outro") o caso continua sendo o que é
const etapasDaFase = k => (k && !ehPrev(k)) ? [] : ETAPAS_POR_FASE[k && faseEfetiva(k)] || [];   // F615 · sem etapas fora da previdenciária
function escolherEtapa(casoId){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const lista = etapasDaFase(k);
  if(!lista.length) return aviso("Esta lista não tem etapas");
  caixa(`<h3 style="margin:0 0 4px">Etapa do caso <small class="meio-sub">· ${esc(tituloCaso(k))}</small></h3>
    <p class="meio-sub" style="margin:0 0 10px">Onde o caso está dentro de ${esc(TRAMITA[k.fase]||k.fase)}. É esta palavra que responde ao cliente quando ele pergunta como está o processo.</p>
    <div class="esp-lista">${lista.map(e=>`<button class="esp-it ${k.etapa===e?"on":""}" onclick="gravarEtapa('${casoId}',${JSON.stringify(e).replace(/"/g,"&quot;")})">${esc(e)}</button>`).join("")}</div>
    <div class="form-linha" style="margin-top:10px;align-items:center">
      <input id="et-livre" placeholder="outra etapa, à mão" style="flex:1;min-width:200px" value="${esc(lista.includes(k.etapa)?"":(k.etapa||""))}"
        onkeydown="if(event.key==='Enter')gravarEtapa('${casoId}',this.value)">
      <button class="btn-mini" onclick="gravarEtapa('${casoId}',document.getElementById('et-livre').value)">usar</button>
      <button class="btn-rap" onclick="gravarEtapa('${casoId}','')" title="tirar a etapa"><span aria-hidden="true">Limpar</span><span class="sr-only">tirar a etapa</span></button>
    </div>`);
}
async function gravarEtapa(casoId, etapa){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const nova = (etapa||"").trim() || null;
  if(nova === (k.etapa||null)) return fecharCaixa();
  k.etapa = nova;
  const trG = trilhaSegueEtapa(k, nova);   // F183
  try{ await patchCaso(casoId, {etapa:nova, ...(trG?{trilha:trG}:{})}); if(trG) k.trilha = trG; }
  catch(e){ return aviso("Não gravou — rode o crm/fase2/schema_prazos.sql no Supabase"); }
  fecharCaixa(); aviso(nova?`Etapa: ${nova} ✔`:"Etapa retirada", false);
  montarSidebar(); render(); if(clienteAberto) repintarFicha();
}
// a etapa que a própria providência declara, sem mover o caso de lista
async function marcarEtapa(casoId, etapa){
  const k = D.casoPorId.get(casoId); if(!k || !etapa || k.etapa===etapa) return false;
  k.etapa = etapa;
  const trM = trilhaSegueEtapa(k, etapa);   // F183
  try{ await patchCaso(casoId, {etapa}); }catch(e){ return false; }
  if(trM) try{ await patchCaso(casoId, {trilha:trM}); k.trilha = trM; }catch(e){}
  return true;
}
async function andarEtapa(casoId, lista, motivo, etapa){
  const k = D.casoPorId.get(casoId); if(!k) return false;
  const fase = (LISTAS_MOVER.find(([l])=>l===lista)||[])[1];
  if(!fase || k.fase===fase) return etapa ? await marcarEtapa(casoId, etapa) : false;
  if(k.fase==="encerrado" || k.fase==="pagamento") return false;
  const de = ORDEM_ETAPA.indexOf(k.fase), para = ORDEM_ETAPA.indexOf(fase);
  if(de>=0 && para>=0 && para<de) return false;          // nunca volta sozinho
  const antes = {fase:k.fase, mover_para:k.mover_para||null, etapa:k.etapa||null};
  // F119 · etapa da fase antiga não faz sentido na nova
  const nova = etapa || null;
  k.fase = fase; k.mover_para = lista; k.etapa = nova;
  try{ await patchCaso(casoId, {fase, mover_para:lista, etapa:nova}); }
  catch(e){ Object.assign(k, antes); return false; }
  const trA = trilhaSegueEtapa(k, nova);   // F183
  if(trA) try{ await patchCaso(casoId, {trilha:trA}); k.trilha = trA; }catch(e){}
  montarSidebar(); render(); if(clienteAberto) repintarFicha();
  avisoDesfazer(`Caso movido para ${lista}${k.etapa?`, ${k.etapa}`:""} · ${motivo}`, async ()=>{
    Object.assign(k, antes);
    await patchCaso(casoId, antes);
    montarSidebar(); render(); if(clienteAberto) repintarFicha();
    aviso("O caso voltou para onde estava", false);
  });
  return true;
}

// ══════════════════════════════════════════════════════════════════════════
// F236 · A ETAPA PELOS FATOS OFICIAIS (teste dos clientes ativos, 17.10.2026).
// No banco, só 11 dos 628 casos abertos tinham etapa, e nenhuma acompanhava as
// coletas: "aguardando perícia" ficava depois do indeferimento e ia ao portal
// do cliente. Os fatos oficiais (situação, exigência e agendamento do PAT,
// movimentos do PJe/e-SAJ/eproc e do DataJud, eventos do e-Recursos) dizem em
// que etapa o caso parece estar, e a placa PROPÕE: "Sugestão: <etapa> (pelo
// <fato> de dd/mm) — Aceitar". A etapa continua sendo o que o escritório
// DECLARA (F119): nada grava sozinho; o clique grava pelo gravarEtapa ou pelo
// andarEtapa, com um andamento curto e o desfazer. A etapa que um fato mais
// novo contradiz aparece como "etapa desatualizada", e o portal não a publica
// (marca em casos.trilha.velha, gravada na coleta e ao abrir a ficha).
// ══════════════════════════════════════════════════════════════════════════
// a fase da etapa: no prazo fatal (fase "outro") vale a lista de onde o caso veio
function faseDaEtapa(k){
  if(!k) return null;
  const f = faseEfetiva(k);   // F236 · a mesma fase verdadeira dos prazos (lista de origem, depois os números do caso)
  return f && f!=="outro" ? f : null;
}
// no Judicial valem também as etapas da execução, que corre nos autos (a trilha já as tem)
const etapasAceitas = f => [...(ETAPAS_POR_FASE[f]||[]), ...(f==="judicial" ? ETAPAS_POR_FASE.pagamento : [])];
// a ordem das etapas; o mesmo grau = podem vir em qualquer ordem (a exigência antes ou depois da perícia)
const GRAU_ETAPA = {
  escritorio:{"em atendimento":0, "reunindo documentos":1, "análise de direito":1, "aguardando o cliente":1},
  inss:{"requerimento protocolado":0, "aguardando perícia":1, "perícia realizada":1, "em exigência":1, "aguardando análise":1, "decidido":2},
  conselho:{"recurso protocolado":0, "aguardando distribuição":1, "em diligência":2, "em pauta":2, "julgado":3},
  judicial:{"ação distribuída":0, "aguardando citação":1, "contestação apresentada":1, "perícia designada":1, "perícia realizada":2,
    "aguardando sentença":3, "sentença publicada":4, "em recurso":5, "aguardando implantação":6, "benefício implantado":7,
    "aguardando RPV":7, "RPV expedida":8, "recebido":9},
  peticao_inicial:{"a redigir":0, "redigida":1, "a protocolar":2},
  pagamento:{"aguardando implantação":0, "benefício implantado":1, "aguardando RPV":1, "RPV expedida":2, "recebido":3},
  aposentadoria_futura:{"monitorando":0, "documentação em dia":1, "pronto para protocolar":2}};
const grauEtapa = (f, e) => { const g = (GRAU_ETAPA[f]||{})[e]; return g==null ? -1 : g; };
const andsDoCaso = k => (D._andsFicha||[]).filter(a=>a && a.caso_id===k.id);
const dCurta = d => !d ? "" : d.slice(0,4)===hoje().slice(0,4) ? fmtBarra(d).slice(0,5) : fmtBarra(d);
const curto = t => t.length>48 ? t.slice(0,46).trim()+"…" : t;
// "pelo <fato> de dd/mm" (o fato da agenda já traz a data no texto)
const porDaProposta = p => p.comData ? p.por : `${p.por} de ${dCurta(p.data)}`;
// o movimento judicial que diz a etapa, do mais adiantado para o mais cedo (nao: o que anula a leitura)
const REGRAS_ETAPA_JUD = [
  {rx:/requisicao de pequeno valor|expedicao de (requisi|rpv|precat)|expedid[oa]s? (a |o )?(requisi|rpv|precat)|rpv expedid|precatorio expedid|requisitorio/,
   nao:/pagamento|pago|cancelad|levantad|deposit/, etapa:"RPV expedida", passos:["RPV ou precatório expedido"], mover:"pagamento"},
  {rx:/deposito (judicial )?(de|da|do) (rpv|requisi|precat)|comprovante de (deposito|pagamento|levantamento)|pagamento (de|da|do) (rpv|requisi|precat)|rpv paga|alvara|levantamento/, nao:/suspens/,
   etapa:"recebido", passos:["RPV paga","Levantamento"], mover:"pagamento"},
  {rx:/homolog\w* (de |dos |os |o )?calculo|calculos? homologad/, etapa:"aguardando RPV", passos:["Cálculos homologados"]},
  {rx:/juntada de calculo|calculos? (da contadoria|do inss|de liquida)|(a|para a) contadoria|cumprimento de sentenca/, nao:/prazo|intima/, etapa:"aguardando RPV",
   passos:["Cálculos (contadoria ou INSS)"]},
  {rx:/beneficio implantado|implantacao (do beneficio )?(cumprida|comprovada|realizada|efetivada)|comprovante de implantacao/, etapa:"benefício implantado",
   passos:["Implantação do benefício"]},
  {rx:/transitad[oa] em julgado|transito em julgado/, etapa:"aguardando implantação", passos:["Trânsito em julgado"]},
  {rx:/conhecido o recurso|negado provimento|negar provimento|dado provimento|dar provimento|provido em parte|nao-provido|nao provido|acordao/, nao:/embargos|prazo|intima/,
   etapa:"em recurso", passos:["Acórdão da Turma Recursal","Acórdão do TRF3","Acórdão do TJSP"]},
  {rx:/recurso inominado|apelacao|razoes recursais|interposicao de recurso|em grau de recurso|remessa (ao|para o) (tribunal|trf)|turma recursal|recebidos os autos/,
   nao:/prazo|intima/, etapa:"em recurso", passos:["Recurso inominado","Apelação","Apelação ou remessa necessária"]},
  {rx:/contrarrazoes/, nao:/prazo|intima/, etapa:"em recurso", passos:["Contrarrazões"]},
  {rx:/julgad[oa]s? (parcialmente )?(procedente|improcedente)|(im)?procedente o pedido|julgo (parcialmente )?(im)?procedente|extinto o processo|extincao do processo|homologad[oa] (o |a )?(acordo|transacao|desistencia)|homologo o acordo|sentenca (proferida|publicada|registrada)|^sentenca$|com resolucao do merito|^(im)?procedencia/,
   nao:/conclus|prazo|intima|embargos|ciencia/, etapa:"sentença publicada", passos:["Sentença"], g1:true},
  {rx:/conclusos? para (a )?sentenca|conclusos? para julgamento/, etapa:"aguardando sentença", passos:["Conclusos para sentença"], g2:"em recurso"},
  {rx:/laudo/, nao:/prazo|intima|esclarec|complement/, etapa:"perícia realizada", passos:["Laudo juntado"]},
  {rx:/pericia realizada|realizada (a )?pericia/, etapa:"perícia realizada", passos:["Perícia realizada"]},
  {rx:/designad[oa] (a )?pericia|pericia (medica |social |tecnica )?designada|designacao de pericia|nomead[oa] (o |a )?perit|nomeacao (do |de )?perit/,
   etapa:"perícia designada", passos:["Perícia médica designada","Perícia designada","Perícia técnica ou audiência","Nomeação do perito e quesitos"]},
  {rx:/replica/, nao:/prazo|intima/, etapa:"contestação apresentada", passos:["Réplica"]},
  {rx:/contestacao/, nao:/prazo|intima|decorrid|decurso|revelia/, etapa:"contestação apresentada", passos:["Citação e contestação"]},
  {rx:/citacao|cite-se/, nao:/decorrid|decurso/, etapa:"aguardando citação", passos:["Citação expedida"]},
  {rx:/distribuid[oa]|distribuicao/, nao:/redistribu|conclus/, etapa:"ação distribuída", passos:["Ação distribuída","Impetração"], g1:true, g2:"em recurso"},
];
function etapaDoMovimento(mov, g2){
  let melhor = null;
  for(const parte of String(mov||"").split(/\s+·\s+/)){
    const s = dsa(parte).trim(); if(!s || /^📎/.test(parte.trim())) continue;
    const i = REGRAS_ETAPA_JUD.findIndex(r => r.rx.test(s) && !(r.nao && r.nao.test(s)));
    if(i>=0 && (!melhor || i<melhor.i)) melhor = {i, r:REGRAS_ETAPA_JUD[i], parte:parte.trim()};
  }
  if(!melhor) return null;
  const r = melhor.r;
  if(g2 && r.g1 && !r.g2) return null;   // "julgado procedente" no 2º grau não é a sentença
  return g2 && r.g2 ? {etapa:r.g2, passos:[], mover:null, parte:melhor.parte} : {etapa:r.etapa, passos:r.passos, mover:r.mover||null, parte:melhor.parte};
}
// F236 · a anotação que diz que a exigência foi cumprida (o "✔ cumprida" grava "Exigência cumprida e protocolada em dd/mm/aaaa
// no INSS.") e a data da entrega: a escrita na nota ("protocolada em 15/10") ou o dia da anotação. A pergunta não é fato
const RX_EXIG_CUMPRIDA = /\bexig[êe]ncia\s+(?:foi\s+|já\s+)?(?:cumprida|respondida|atendida)\b|\bcumprimento\s+d[ae]\s+exig[êe]ncia\s+(?:protocolad|enviad|feit|realizad|registrad)|\bcumpri(?:mos|u)\s+a\s+exig[êe]ncia/i;
function entregaDaExigencia(a){
  const t = String((a && a.texto)||""), m0 = t.match(RX_EXIG_CUMPRIDA); if(!m0) return null;
  if(/^[^.!\n]*\?/.test(t.slice(m0.index))) return null;
  const dia = dataSP(a.criado_em); if(!dia) return null;
  const m = t.match(/(?:protocolad[ao]|entregue|cumprida|enviad[ao]|juntad[ao]|anexad[ao]|respondida)\s+(?:no INSS\s+)?em\s+(\d{2})[\/.](\d{2})(?:[\/.](\d{2,4}))?/i);
  if(m){ const ano = !m[3] ? dia.slice(0,4) : m[3].length===2 ? "20"+m[3] : m[3], iso = `${ano}-${m[2]}-${m[1]}`;
    if(/^\d{4}-\d{2}-\d{2}$/.test(iso) && iso<=dia) return iso; }
  return dia;
}
// os fatos do caso: {fase da trilha, etapa (ou null: só marca a trilha), passos da trilha, data, quando (ordem), por}
function fatosDaEtapa(k, ands){
  const fs = [], hj = hoje();
  const qSP = ts => `${dataSP(ts)}T${horaSP(ts)||"12:00"}`;
  const add = (fase, etapa, passos, data, quando, por, extra) => {
    if(data) fs.push({fase, etapa, passos:passos||[], data, quando:quando||`${data}T12:00`, por:por||"", ...(extra||{})}); };
  const meus = (ands||[]).filter(a => a && a.caso_id===k.id && !a.excluir);
  // ── INSS: o requerimento, a situação e a decisão no PAT
  if(k.der && ((k.protocolos||[]).length || k.nb)) add("inss","requerimento protocolado",["Requerimento protocolado"],k.der,`${k.der}T00:00`,"pelo requerimento protocolado");
  const comAnalise = TRILHAS[ritoDe(k,"inss")].e.some(x => lerEtapaTrilha(x).n==="Em análise");
  for(const a of meus){
    if(a.origem!=="pat") continue;
    const oid = String(a.origem_id||""), t = String(a.texto||"");
    let sit = oid.startsWith("situacao:") ? oid.split(":").slice(2).join(":")
      : oid.startsWith("importado:") ? (t.match(/situa[çc][ãa]o:\s*([^.—]+?)\s*\./i)||[])[1] : null;
    if(sit){
      sit = sit.trim(); const s = dsa(sit), q = qSP(a.criado_em), d = q.slice(0,10), por = `pela situação do PAT “${sit}”`;
      if(/conclu|deferid/.test(s)){ const res = /indeferid/.test(s) ? "indeferido" : /deferid/.test(s) ? "deferido" : null;
        add("inss","decidido",["Decisão"],d,q,por,{resultado:res}); }
      else if(/cumprimento de exig/.test(s)) add("inss","aguardando análise",["Em exigência","Exigência cumprida"],d,q,por);
      else if(/exig/.test(s)) add("inss","em exigência",["Em exigência"],d,q,por);
      else if(/analise/.test(s)) add("inss", comAnalise ? "aguardando análise" : "requerimento protocolado", ["Requerimento protocolado","Em análise"], d, q, por);
      continue;
    }
    // a comunicação da decisão sem a situação "Concluída - …"
    const m = /^\d+$/.test(oid) && dsa(t).match(/^inss\s*·\s*(?:o\s+)?(?:requerimento|beneficio|pedido)?(?:\s+de\s+\w+)?\s*(indeferid|concedid|deferid)/);
    if(m){ const d = dataSP(a.criado_em); add("inss","decidido",["Decisão"],d,`${d}T00:00`,"pela comunicação de decisão no PAT",{resultado:m[1]==="indeferid" ? "indeferido" : "deferido"}); }
  }
  // F236 · a exigência cumprida (o "✔ cumprida" ou a anotação da equipe) é fato "aguardando análise" na data da entrega. Sem
  // ele, a situação "Em exigência" do PAT seguia como o fato mais novo: a placa acusava "etapa desatualizada", propunha voltar
  // a "em exigência" e o portal mostrava exigência a quem já tinha entregado. Com perícia marcada à frente, só marca a trilha
  const pericFut = (D.eventos||[]).some(e=>e.caso_id===k.id && !/cancel|realiz/.test(e.status||"") && dataSP(e.data_hora)>=hj && ehPericiaInss(e));
  for(const a of meus){
    if(/^(pje|crps)$/.test(a.origem||"") || /^(situacao|importado):/.test(String(a.origem_id||""))) continue;
    const ent = entregaDaExigencia(a);
    if(ent) add("inss", pericFut ? null : "aguardando análise", ["Em exigência","Exigência cumprida"], ent, qSP(a.criado_em), "pela exigência cumprida");
  }
  // a marca do "✔ cumprida" no caso vale também nas coletas, que leem só os andamentos do PAT, do PJe e do CRPS
  const exc = (k.ronda||{}).exig_cumprida;
  if(exc) add("inss", pericFut ? null : "aguardando análise", ["Em exigência","Exigência cumprida"], exc, `${exc}T23:59`, "pela exigência cumprida");
  // F236 · a petição inicial: o caso em Petições Iniciais está "a redigir" até alguém dizer outra coisa (F119: só a sugestão),
  // e a tarefa da inicial concluída dá o passo seguinte: a de quem redige leva a "redigida"; a de quem revisa, a "a protocolar"
  if(faseDaEtapa(k)==="peticao_inicial"){
    const d0 = dataSP(k.criado_em) || hj;
    add("peticao_inicial","a redigir",["A redigir"],d0,`${d0}T00:00`,"pela fase Petições Iniciais, com a inicial ainda por protocolar",{comData:true});
    for(const t of (D.tarefasFicha||[])){
      if(t.caso_id!==k.id || !t.concluida_em) continue;
      const an = meus.find(x=>x.id===t.andamento_id), s = dsa((an && an.texto)||"");
      if(!/\binicial\b/.test(s) || !/redi[gj]|minut|elabor|revis/.test(s)) continue;
      const q = qSP(t.concluida_em), rev = t.papel==="revisa";
      add("peticao_inicial", rev ? "a protocolar" : "redigida", [rev ? "Revisão" : "Redigida"], q.slice(0,10), q, rev ? "pela revisão da inicial concluída" : "pela redação da inicial concluída");
    }
  }
  const ato = String(k.exigencia_descricao||"").match(/ato de (\d{2})\.(\d{2})\.(\d{4})/);
  if(k.exigencia_prazo && ato) add("inss","em exigência",["Em exigência"],`${ato[3]}-${ato[2]}-${ato[1]}`,`${ato[3]}-${ato[2]}-${ato[1]}T00:00`,"pela exigência anotada no caso");
  if(faseDaEtapa(k)==="inss" && k.decisao_em && (!k.der || k.decisao_em>=k.der))
    add("inss","decidido",["Decisão"],k.decisao_em,`${k.decisao_em}T00:00`,"pela decisão registrada no caso",{resultado:k.resultado||null});
  // ── a agenda: perícia e avaliação social (INSS ou juízo) e a sessão de julgamento do CRPS
  const jud0 = k.ajuizado_em || "9999-12-31";
  for(const e of (D.eventos||[])){
    if(e.caso_id!==k.id || e.status==="cancelada") continue;
    const tipo = String(e.tipo||""), dia = dataSP(e.data_hora); if(!dia) continue;
    const marcada = dia>=hj && e.status!=="realizada", reg = e.criado_em ? qSP(e.criado_em) : `${dia}T00:00`;
    if(/julgamento|sess[ãa]o/i.test(tipo)){
      if(marcada) add("conselho","em pauta",["Pautado"],reg.slice(0,10),reg,`pela sessão de julgamento marcada para ${fmtBarra(dia)}`,{comData:true});
      continue; }
    if(!/per[íi]cia|avalia[çc][ãa]o social/i.test(tipo) || /pr[ée]-?per[íi]cia|atendimento/i.test(tipo)) continue;
    const jud = /jef|juizado|justi[çc]a|vara|imesc|f[óo]rum|tribunal/i.test(e.local||"") || (!e.local && dia>=jud0);
    const soc = /social/i.test(tipo), feita = e.status==="realizada", oq = soc ? "avaliação social" : "perícia";
    const doPat = meus.some(a => a.origem==="pat" && String(a.origem_id||"").startsWith("evento:") && String(a.origem_id).endsWith(":"+dia));
    if(jud){
      // a perícia judicial marcada é o estado de agora: vale mais que a contestação juntada depois da designação
      if(marcada) add("judicial","perícia designada",["Perícia médica designada","Perícia designada","Perícia técnica ou audiência"],reg.slice(0,10),`${hj}T23:59`,`pela perícia judicial marcada para ${fmtBarra(dia)}`,{comData:true});
      else { add("judicial",null,["Perícia médica designada","Perícia designada"],reg.slice(0,10),reg,"");   // F236 · a designação tem a data dela
        add("judicial","perícia realizada",feita?["Perícia realizada"]:[],dia,qSP(e.data_hora),`pela perícia judicial de ${dCurta(dia)}${feita?"":", sem confirmação"}`,{comData:true}); }
    } else {
      const ag = soc ? ["Avaliação social agendada"] : ["Perícia agendada","Perícia médica agendada"];
      const fe = soc ? ["Avaliação social realizada"] : ["Perícia realizada","Perícia médica realizada"];
      if(marcada) add("inss","aguardando perícia",ag,reg.slice(0,10),reg,`pelo agendamento ${doPat?"no PAT ":""}de ${dCurta(reg.slice(0,10))}: ${oq} em ${fmtBarra(dia)}`,{comData:true});
      else { add("inss",null,ag,reg.slice(0,10),reg,"");   // F236 · o agendamento tem a data dele
        add("inss","perícia realizada",feita?fe:[],dia,qSP(e.data_hora),`pela ${oq} de ${dCurta(dia)}${feita?"":", sem confirmação de comparecimento"}`,{comData:true}); }
    }
  }
  // ── Conselho: o e-Recursos (pelo status cru, que não depende do rótulo da tradução)
  for(const b of crpsBlocos(k)) for(const e of (b.eventos||[])){
    const iso = CRPS.dataParaISO(e.data)||"", d = iso.slice(0,10); if(!d) continue;
    const s = dsa(e.bruto||e.resumo||""), ef = (et, ps, por, x) => add("conselho", et, ps, d, iso.slice(0,16), por, x);
    if(/cumprimento de acord|acordao cumprido|analise de acord/.test(s)) ef(null,["Cumprimento pelo INSS"]);
    else if(/conhecer d|nao conhecer|provimento|decisao monocratica/.test(s)) ef("julgado",["Acórdão da Junta","Acórdão da Câmara"],"pelo acórdão no e-Recursos");
    else if(/recurso especial/.test(s)) ef("recurso protocolado",["Recurso especial protocolado"],"pelo recurso especial protocolado no e-Recursos");
    else if(/recurso ordinario/.test(s)) ef("recurso protocolado",["Recurso ordinário protocolado"],"pelo recurso ordinário protocolado no e-Recursos");
    else if(/contrarrazoes/.test(s)) ef(null,["Contrarrazões do INSS","Contrarrazões"]);
    else if(/diligencia|parecer do perito|providencias complementares/.test(s)) ef("em diligência",["Diligência ou parecer médico"],"pela diligência no e-Recursos");
    else if(/sessao de julgamento|inclusao em pauta|data\/hora da sessao/.test(s) && !/retirad|cancelad/.test(s)) ef("em pauta",["Pautado"],"pela pauta no e-Recursos");
    else if(/aguardando distribuicao|para crps\b|(\d{5,}|crps) para \d+\S* ?(jr|caj)\b/.test(s)) ef("aguardando distribuição",["Encaminhado à Junta","Encaminhado à Câmara"],"pelo e-Recursos");   // F236 · sem repetir a etapa
    else if(/distribuido ao conselheiro|redistribuido/.test(s)) ef(null,["Distribuído ao relator"]);
    // F322 · o e-Recursos registra o recurso como "Requerimento protocolado - Tarefa: <número>", sem dizer a espécie
    else if(/^requerimento protocolado\s*-\s*tarefa/.test(s)) ef("recurso protocolado",["Recurso ordinário protocolado"],"pelo recurso protocolado no e-Recursos");
  }
  if(k.ro_protocolado_em) add("conselho","recurso protocolado",["Recurso ordinário protocolado"],k.ro_protocolado_em,null,"pelo recurso ordinário protocolado");
  if(k.re_protocolado_em) add("conselho","recurso protocolado",["Recurso especial protocolado"],k.re_protocolado_em,null,"pelo recurso especial protocolado");
  // ── Judicial: PJe, e-SAJ e eproc (sem o processo de outro advogado) e o DataJud
  const naoNossos = new Set(processosDoCaso(k).filter(p=>!p.nosso).map(p=>soDig(p.numero)));
  for(const a of meus){
    if(a.origem!=="pje" || /^prazo:/.test(String(a.origem_id||""))) continue;
    const m = String(a.texto||"").match(/^(PJe|e-SAJ TJSP|eproc TJSP)(?: \(([^)]*)\))?: ([\s\S]*?)(?: — em (\d{2})\.(\d{2})\.(\d{4})(?: (\d{2}:\d{2}))?)? — ([\s\S]*)$/);
    if(!m) continue;
    const num = soDig((m[8].match(/\d[\d.\-]{14,}\s*$/)||[""])[0]);
    if(num && naoNossos.has(num)) continue;
    const d = m[6] ? `${m[6]}-${m[5]}-${m[4]}` : dataSP(a.criado_em);
    const x = etapaDoMovimento(m[3], /2º|turma recursal|tribunal/i.test(m[2]||""));
    if(x) add("judicial", x.etapa, x.passos, d, `${d}T${m[7]||"12:00"}`, `pelo movimento “${curto(x.parte)}” do ${m[1]}`, {mover:x.mover});
  }
  const dj = k.datajud;
  if(dj && !naoNossos.has(soDig(dj.processo))){
    const insts = (dj.instancias||[]).length ? dj.instancias : [{grau:dj.grau, historico:dj.historico||dj.recentes||[]}];
    for(const it of insts) for(const h of (it.historico||[])){
      const d = String((h&&h.data)||"").slice(0,10); if(!d) continue;
      const x = etapaDoMovimento(`${h.nome||""}${h.complemento?` (${h.complemento})`:""}`, /G2|TR/.test(it.grau||""));
      if(x) add("judicial", x.etapa, x.passos, d, `${d}T00:00`, `pelo movimento “${curto(x.parte)}” do DataJud`, {mover:x.mover});
    }
  }
  if(k.ajuizado_em) add("judicial","ação distribuída",["Ação distribuída","Impetração"],k.ajuizado_em,`${k.ajuizado_em}T00:00`,"pela data do ajuizamento");
  return fs;
}
// a etapa que os fatos propõem: o fato mais novo da fase do caso. velha = contradiz a etapa marcada;
// mover = a fase que o fato pede (RPV → Pagamento). Só propõe: quem grava é o "Aceitar"
function propostaDeEtapa(k, ands){
  if(!k || k.fase==="encerrado" || ehPreCaso(k)) return null;
  const fase = faseDaEtapa(k); if(!fase || !GRAU_ETAPA[fase]) return null;
  const tf = (fase==="judicial" || fase==="pagamento") ? "judicial" : fase;
  const aceitas = etapasAceitas(fase), g = e => grauEtapa(fase, e);
  const fs = fatosDaEtapa(k, ands).filter(f => f.etapa && f.fase===tf && aceitas.includes(f.etapa))
    .sort((a,b) => a.quando<b.quando ? -1 : a.quando>b.quando ? 1 : g(a.etapa)-g(b.etapa));
  if(!fs.length) return null;
  let ult = fs[fs.length-1];
  if(ult.etapa==="decidido" && !ult.resultado){ const r = fs.filter(f=>f.etapa==="decidido" && f.resultado).pop(); if(r) ult = {...ult, resultado:r.resultado}; }
  const atual = k.etapa || null;
  if(ult.etapa===atual) return null;
  const fora = !!atual && !aceitas.includes(atual);
  if(atual && !fora){
    const apoio = fs.filter(f=>f.etapa===atual).pop();
    if(!(g(ult.etapa) > g(atual) || (apoio && apoio.quando < ult.quando))) return null;   // a equipe marcou depois ou adiante
  }
  return {...ult, mover:ult.mover && ult.mover!==fase ? ult.mover : null, velha:!!atual, fora};
}
// o resultado do INSS é o que o INSS decidiu: PAT, comunicação ou nota da decisão ANTES do recurso ou da ação
const RX_NOTA_DECISAO = /^\s*(?:\[decisao\]\s*)?(?:o\s+)?(?:inss\s*[·:\-]?\s*)?(?:o\s+)?(?:beneficio|requerimento|pedido)?\s*(indeferid[oa]|negad[oa]|concedid[oa]|deferid[oa])\b/;
function decisaoDoInss(k, ands){
  ands = ands || andsDoCaso(k);
  const fs = fatosDaEtapa(k, ands);
  const corte = fs.filter(f=>f.fase!=="inss" && f.fase!=="peticao_inicial").map(f=>f.data).sort()[0] || "9999-12-31";   // F236
  const dec = fs.filter(f=>f.fase==="inss" && f.etapa==="decidido" && f.data<=corte).sort((a,b)=>a.quando<b.quando?-1:a.quando>b.quando?1:0);
  const r = dec.filter(f=>f.resultado).pop();
  if(r) return {data:r.data, resultado:r.resultado};
  const notas = ands.filter(a=>a && a.caso_id===k.id && (a.origem==="todo"||a.origem==="app") && dataSP(a.criado_em)<=corte)
    .sort((a,b)=>String(b.criado_em).localeCompare(String(a.criado_em)));
  for(const a of notas){ const m = dsa(a.texto).match(RX_NOTA_DECISAO);
    if(!m) continue;
    // F236 · a data escrita na nota ("indeferido em 09.10.2026") vale mais que o dia da anotação, se não for depois dele
    const dm = String(a.texto||"").match(/\b(?:em|de)\s+(\d{2})[\/.](\d{2})[\/.](\d{4})\b/), dn = dataSP(a.criado_em), de = dm ? `${dm[3]}-${dm[2]}-${dm[1]}` : null;
    return {data: de && de<=dn ? de : dn, resultado:/^(indef|negad)/.test(m[1]) ? "indeferido" : "deferido"}; }
  if(dec.length) return {data:dec[dec.length-1].data, resultado:null};
  if(k.resultado && k.decisao_em && corte!=="9999-12-31" && k.decisao_em<corte) return {data:k.decisao_em, resultado:k.resultado};
  return null;
}
// F236 · "Aceitar": a etapa é o que o escritório DECLARA (F119); o clique grava pelo gravarEtapa (ou pelo
// andarEtapa, quando o fato pede outra fase, como a RPV expedida), com o andamento curto e o desfazer
async function aceitarEtapaProposta(casoId){
  const k = D.casoPorId.get(casoId); if(!k) return;
  const p = propostaDeEtapa(k, andsDoCaso(k));
  if(!p) return aviso("A etapa já está de acordo com os fatos oficiais");
  const antes = {etapa:k.etapa||null, trilha:k.trilha||null, resultado:k.resultado||null, decisao_em:k.decisao_em||null};
  let volta = null;
  if(p.mover){
    const lista = (LISTAS_MOVER.find(([,f])=>f===p.mover)||[])[0];
    if(!lista || !await andarEtapa(casoId, lista, porDaProposta(p), p.etapa))
      return aviso("O caso não foi movido — use o Mover para…");
    volta = _desfazer;   // o desfazer que o andarEtapa acabou de armar
  } else {
    await gravarEtapa(casoId, p.etapa);
    if((k.etapa||null)!==p.etapa) return;   // não gravou: o gravarEtapa já avisou
    // a decisão do INSS aceita leva o resultado e a data, como a janela Decisão
    if(p.etapa==="decidido" && p.fase==="inss"){
      const c = {};
      if(p.resultado && (!k.resultado || (k.decisao_em||"") < p.data)) c.resultado = p.resultado;
      if(!k.decisao_em || k.decisao_em < p.data) c.decisao_em = p.data;
      if(Object.keys(c).length) try{ await patchCaso(k.id, c); Object.assign(k, c); }catch(e){}
    }
  }
  let andId = null;
  try{
    const [a] = await api(`/rest/v1/andamentos`,{method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({caso_id:k.id, autor_id:eu.id, texto:`Etapa: ${rotuloProposta(p)} (${porDaProposta(p)})`, publico:false})}) || [];
    if(a){ andId = a.id; a.andamentos_lidos = [{colaborador_id:eu.id}];
      if(Array.isArray(D._andsFicha) && clienteAberto===k.cliente_id) D._andsFicha.unshift(a); }
  }catch(e){}
  const repinta = () => { montarSidebar(); render(); if(clienteAberto) (p.mover ? abrirFicha(clienteAberto) : repintarFicha()); };
  repinta();
  avisoDesfazer(`Etapa: ${rotuloProposta(p)} ✔ — registrado no caso`, async () => {
    if(volta) await volta();
    else { Object.assign(k, antes); await patchCaso(k.id, antes).catch(()=>{}); }
    if(andId){ await api(`/rest/v1/andamentos?id=eq.${andId}`,{method:"DELETE"}).catch(()=>{});
      if(Array.isArray(D._andsFicha)) D._andsFicha = D._andsFicha.filter(x=>x.id!==andId); }
    repinta(); aviso("A etapa voltou como estava", false);
  });
}
// a marca que o portal lê para não publicar a etapa desatualizada (casos.trilha.velha)
async function marcarEtapaVelha(k, quer){
  const t = {...trilhaDe(k)};
  if(quer) t.velha = {...quer, em:hoje()}; else delete t.velha;
  try{ await patchCaso(k.id, {trilha:t}); k.trilha = t; }catch(e){}
}
const _velhaVista = new Set();
function sincronizarEtapaVelha(k, p){
  const m = trilhaDe(k).velha || null;
  const quer = p && p.velha && !p.fora ? {etapa:k.etapa, proposta:p.etapa, data:p.data} : null;
  if(quer ? (m && m.etapa===quer.etapa && m.proposta===quer.proposta) : (!m || m.etapa!==k.etapa)) return;
  const ch = `${k.id}|${k.etapa}|${quer?quer.proposta:""}`;
  if(_velhaVista.has(ch)) return; _velhaVista.add(ch);
  setTimeout(() => marcarEtapaVelha(k, quer), 0);
}
// o aviso ao lado da etapa (placa do v10 e cartão do clássico): "Sugestão: <etapa> (pelo <fato> de dd/mm) Aceitar"
const rotuloProposta = p => `${p.mover?`${NOME_FASE[p.mover]||p.mover} · `:""}${p.etapa}${p.etapa==="decidido"&&p.resultado?` · ${p.resultado}`:""}`;
function sugestaoEtapa(k, p){
  return `<span class="lc-jan et-sug">Sugestão: <b>${esc(rotuloProposta(p))}</b> (${esc(porDaProposta(p))})
    <button class="et-aceitar" onclick="aceitarEtapaProposta('${k.id}')" title="grava esta etapa, registra no caso e pode ser desfeito">Aceitar</button></span>`;
}
function avisoEtapa(k){
  const p = propostaDeEtapa(k, andsDoCaso(k));
  if(k.etapa && !etapasAceitas(faseDaEtapa(k)).includes(k.etapa)){
    const cat = Object.values(ETAPAS_POR_FASE).some(l=>l.includes(k.etapa));
    return `<small class="lc-jan et-velha" title="${cat?"o portal do cliente não publica etapa de outra fase":"etapa escrita à mão: não vai ao portal do cliente"}">${cat?"etapa de outra fase":"etapa fora do catálogo"}</small>${
      p ? sugestaoEtapa(k, p) : `<button class="lc-jan et-aceitar" onclick="escolherEtapa('${k.id}')" title="escolher a etapa"><span aria-hidden="true">Escolher</span><span class="sr-only">escolher a etapa</span></button>`}`;
  }
  sincronizarEtapaVelha(k, p);
  if(!p) return "";
  return `${p.velha?`<small class="lc-jan et-velha" title="um fato oficial mais novo diz outra coisa; o portal do cliente não publica a etapa desatualizada">etapa desatualizada</small>`:""}${sugestaoEtapa(k, p)}`;
}
// F236 · a etapa gravada que os fatos desmentem: a proposta com o que a memória tem ou, fora da ficha (as listas não têm os
// andamentos), a marca que a coleta e a ficha gravam para o portal (casos.trilha.velha). Devolve a sugestão, ou null
function etapaDesmentida(k){
  if(!k || !k.etapa || k.fase==="encerrado" || ehPreCaso(k)) return null;
  if(!etapasAceitas(faseDaEtapa(k)).includes(k.etapa))
    return Object.values(ETAPAS_POR_FASE).some(l=>l.includes(k.etapa)) ? {sug:"", outra:true} : null;   // a escrita à mão fica como está
  const p = propostaDeEtapa(k, andsDoCaso(k)); if(p && p.velha) return {sug:rotuloProposta(p)};
  const m = trilhaDe(k).velha; return m && m.etapa===k.etapa ? {sug:m.proposta||""} : null;
}
const etapaEstaVelha = k => !!k.etapa && (!etapasAceitas(faseDaEtapa(k)).includes(k.etapa) || !!etapaDesmentida(k));
// F236 · o selo da etapa na linha das listas por fase: a desmentida diz "(desatualizada)", com a sugestão no title, como a placa
function seloEtapaLista(k){
  const d = etapaDesmentida(k);
  const c = COR_FASE[faseDaTrilha(k)], cor = c ? ` ag-etapa" style="--fc:${c.c};--ff:${c.f};--ft:${c.t}` : "";
  return `<span class="ag-tipo${d?" ag-velha":""}${cor}" title="${d ? `etapa do caso, desatualizada${d.sug ? `: os fatos dizem ${esc(d.sug)}` : ", de outra fase"} — abra o caso para aceitar a sugestão` : "etapa do caso"}">${esc(k.etapa)}${d ? " (desatualizada)" : ""}</span>`;
}
// F236 · o clássico também vê e muda a etapa, que é o que o cliente lê no portal
function linhaEtapaClassica(k){
  if(!etapasDaFase(k).length) return "";
  return `<dl class="fx-grade"><div class="fx" style="grid-column:1/-1"><dt title="onde o caso está dentro da fase; é o que o portal mostra ao cliente">Etapa</dt>
    <dd class="fx-etapa">${k.etapa?esc(k.etapa):`<span class="fx-vazio">a definir</span>`}<button class="lapis" title="mudar a etapa do caso" onclick="escolherEtapa('${k.id}')">✎</button>${avisoEtapa(k)}</dd></div></dl>`;
}
// F236 · depois de uma coleta: a etapa contrariada por um fato novo ganha a marca para o portal não a
// publicar. A etapa em si não muda: quem a declara é o escritório, pelo "Aceitar" da placa
async function marcarEtapasVelhas(ids){
  const alvos = [...new Set((ids||[]).filter(Boolean))].map(id=>D.casoPorId.get(id))
    .filter(k => k && k.etapa && k.fase!=="encerrado" && !ehPreCaso(k));
  if(!alvos.length) return 0;
  const ands = [];
  try{ for(let i=0; i<alvos.length; i+=60) ands.push(...await todas("andamentos",
      `select=id,caso_id,texto,origem,origem_id,criado_em&origem=in.(pat,pje,crps)&caso_id=in.(${alvos.slice(i,i+60).map(k=>k.id).join(",")})`)); }
  catch(e){ return 0; }
  let n = 0;
  for(const k of alvos){
    const p = propostaDeEtapa(k, ands), m = trilhaDe(k).velha;
    if(p && p.velha && !p.fora && !(m && m.etapa===k.etapa && m.proposta===p.etapa)){
      await marcarEtapaVelha(k, {etapa:k.etapa, proposta:p.etapa, data:p.data}); n++; }
  }
  return n;
}
function casosDoPlanoPat(pl){
  const ids = [...(pl.atualizar||[]), ...(pl.eventos||[]), ...(pl.comentarios||[]), ...(pl.atualizacoes||[])].map(x=>x.caso_id);
  for(const n of (pl.novos||[])){ const k = D.casos.find(x=>(x.protocolos||[]).some(y=>digitos(y)===digitos(n.protocolo))); if(k) ids.push(k.id); }
  return ids;
}
// as marcas da trilha na tela: as gravadas, as cumpridas pelos fatos oficiais (v, não gravadas) e a atual pela etapa do caso
function passoDaEtapa(k, ets, ms){
  const et = k.etapa || null;
  const iA = ms.findIndex(m => m.s==="a" && !m.v);
  if(iA>=0 && (!et || !PUB_TRILHA[ets[iA].n] || PUB_TRILHA[ets[iA].n]===et)) return iA;
  if(!et) return -1;
  const cand = ets.map((e,i)=>i).filter(i => PUB_TRILHA[ets[i].n]===et || ets[i].n.toLowerCase()===et.toLowerCase());
  if(!cand.length) return iA;
  // o passo atual é o primeiro da etapa ainda por cumprir depois do último cumprido (apelação feita → acórdão do TRF3)
  let ult = -1; cand.forEach((i,j) => { if(ms[i].s==="f") ult = j; });
  if(ult<0) return cand[0];
  const seguinte = cand.slice(ult+1).find(i => !ms[i].s && !ets[i].op);
  return seguinte!=null ? seguinte : cand[ult];
}
function marcasDaTrilha(k, ver, faseAt, rito, ets){
  const virt = {};
  for(const f of fatosDaEtapa(k, andsDoCaso(k))) if(f.fase===ver) for(const n of (f.passos||[]))
    if(!virt[n] || f.data < (virt[n].d||"9")) virt[n] = {s:"f", d:f.data, v:1, por:f.por||""};   // cumprida na data do primeiro fato
  // indeferido: a prorrogação, a DCB e a carta de concessão não houve
  if(ver==="inss" && (decisaoDoInss(k)||{}).resultado==="indeferido")
    for(const n of ["Pedido de prorrogação","DCB","Carta de concessão"]) virt[n] = {s:"n", v:1};
  const ms = ets.map(e => marcaTrilha(k, rito, e.n) || virt[e.n] || {});
  if(ver!==faseAt) return ms.map(m => m.s==="a" ? {...m, s:"f"} : m);
  let at = passoDaEtapa(k, ets, ms);
  // F236 · o destaque não fica atrás de passo já cumprido de etapa mais adiantada (a perícia agendada "agora" com a decisão
  // tomada, a sentença "agora" com a RPV expedida): enquanto ninguém aceita a sugestão, ele vai ao cumprido mais adiantado
  const fz = faseDaEtapa(k)==="pagamento" ? "judicial" : faseDaEtapa(k), g0 = k.etapa ? grauEtapa(fz, k.etapa) : -1;
  if(at>=0 && g0>=0){ let j = -1; ms.forEach((m,i)=>{ const w = PUB_TRILHA[ets[i].n]; if(i>at && m.s==="f" && w && grauEtapa(fz, w) > g0) j = i; }); if(j>at) at = j; }
  return ms.map((m,i) => i===at ? {...m, s:"a"} : m.s==="a" ? {...m, s:"f"} : m);
}
// uma etapa só na tela: a placa, o "Agora:" da trilha e a aba da fase leem a etapa do caso
function etapaAgora(k){
  if(k.etapa) return k.etapa;
  const f = faseDaTrilha(k); if(!f) return "";
  const r = ritoDe(k, f), e = TRILHAS[r].e.map(lerEtapaTrilha).find(x => (marcaTrilha(k, r, x.n)||{}).s==="a");
  return e ? e.n : "";
}

// o número do ☀️ na barra, como o To Do mostra: o que está marcado para HOJE
// — os adicionados ao dia, os casos que vencem hoje e as tarefas de hoje.
// Vencidas não entram: têm contador próprio dentro da tela, e somá-las aqui
// faria o número nunca zerar (zerar é justamente a recompensa do dia).
// F83 · o que já VENCEU e ainda cobra alguém: caso com prazo passado, tarefa
// de andamento com "lembrar em" passado, tarefa particular vencida. É o
// número que pinta o contador do Meu Dia de vermelho (tema v10).
function quantosVencidos(){
  const hj = hoje();
  // F236 · da pessoa, não do escritório; 11.92 · DAD-06: com o Meu Dia sem o que vence, o menu também não conta as vencidas
  if(temaV10()) return mdMostraVence() ? itensAgenda(eu.id).filter(i=>i.data<hj).length : 0;
  const tfVenc = k => (D.tarefasPorCaso.get(k.id)||[]).some(t=>!t.concluida_em && t.lembrar_em && t.lembrar_em<hj);
  const vencK = ativos().filter(k=>(k.prazo && k.prazo<hj) || tfVenc(k)).length;
  const tVenc = (D.tarefas||[]).filter(t=>!t.concluida && t.prazo && t.prazo<hj).length
    + docsPreCasoComData().filter(t=>t.prazo<hj).length;   // F93
  return vencK + tVenc;
}
function quantosNoMeuDia(){
  if(temaV10()){ const hj=hoje();
    // F236 · o que a tela da pessoa mostra: os itens dela de hoje e o que ELA pôs no dia
    return (mdMostraVence() ? itensAgenda(eu.id).filter(i=>i.data===hj).length : 0)
      + new Set((D.meudia||[]).filter(m=>m.colaborador_id===eu.id).map(m=>m.caso_id).filter(id=>D.casoPorId.get(id))).size; }
  const casosDia = (D.meudia||[]).filter(m=>m.caso_id)
    .map(m=>D.casoPorId.get(m.caso_id)).filter(Boolean);
  const tfHoje = k => (D.tarefasPorCaso.get(k.id)||[]).some(t=>t.lembrar_em===hoje());
  const hojeK = ativos().filter(k=>(k.prazo===hoje() || tfHoje(k)) && !casosDia.includes(k));
  const tHoje = (D.tarefas||[]).filter(t=>!t.concluida && t.prazo===hoje());
  const lembHoje = (D.lembretes||[]).filter(l=>l.ativo!==false && l.proximo_em && l.proximo_em<=hoje()).length;
  return casosDia.length + hojeK.length + tHoje.length + lembHoje;
}

// ── biblioteca de ícones SVG do menu (espec. 5.3) ─────────────────────────
// Emoji como ícone desalinhava e rendia diferente em cada máquina. Cada
// entrada é o MIOLO do svg (stroke 1.8, viewBox 24, currentColor); a chave é
// o emoji EXATO que os rótulos usam — assim os rótulos ("☀️ Meu Dia")
// continuam a fonte única de verdade e o rotu() troca só a apresentação.
const SVG_MENU = {
  "🔖":'<path d="M6.5 3.5h11v17L12 16.5l-5.5 4v-17Z"/>',   // F448 · visão salva
  "☀️":'<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M18.7 5.3 17 7M7 17l-1.7 1.7"/>',
  "📣":'<path d="M3 10v4l11 5V5L3 10Z"/><path d="M14 8.5c2.6.6 4.2 1.8 4.2 3.5s-1.6 2.9-4.2 3.5M7 15.5V19a1.5 1.5 0 0 0 3 0v-2.2"/>',
  "📥":'<path d="M3.5 13.5h5l1.5 2.5h4l1.5-2.5h5"/><path d="M5.5 5.5h13l2 8v5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-5l2-8Z"/>',
  "📅":'<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 2.8V6M16 2.8V6"/>',
  // Planejado tem o dia MARCADO; Calendário (📅) é a folha limpa. Recolhido,
  // o menu mostra só o ícone: dois calendários idênticos, um logo abaixo do
  // outro, obrigavam a esperar o balão do nome para saber onde clicar.
  "🗓️":'<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 2.8V6M16 2.8V6"/><rect x="7" y="12.5" width="4" height="4" rx="1" fill="currentColor" stroke="none"/>',
  "🗓":'<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.2 2"/>',
  "👤":'<circle cx="12" cy="8" r="3.6"/><path d="M5 20c.8-3.4 3.6-5.2 7-5.2s6.2 1.8 7 5.2"/>',
  "👥":'<circle cx="9" cy="8" r="3.2"/><path d="M3 19.5c.7-3 3-4.6 6-4.6s5.3 1.6 6 4.6"/><circle cx="16.5" cy="9" r="2.6"/><path d="M15.8 14.3c2.6.1 4.6 1.6 5.2 4.2"/>',
  "⭐":'<path d="m12 3.3 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.5l5.9-.8L12 3.3Z"/>',
  "📋":'<rect x="5" y="4.5" width="14" height="16" rx="2"/><path d="M9 4.5V3h6v1.5M9 10h6M9 13.5h6M9 17h4"/>',
  "🔁":'<path d="M17.5 6.5H8a4 4 0 0 0-4 4v.5M6.5 17.5H16a4 4 0 0 0 4-4V13"/><path d="m14.5 3.5 3 3-3 3M9.5 20.5l-3-3 3-3"/>',
  "🧹":'<rect x="3.5" y="4" width="17" height="4.5" rx="1"/><path d="M5.5 8.5V18a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8.5M10 12.5h4"/>',
  // Escritório é gente com a mão levantada (era a mesma maleta de 💼 Vendas)
  "🙋":'<circle cx="11" cy="7.5" r="3"/><path d="M4.5 20.5c.6-3.2 2.9-5 6.5-5s5.9 1.8 6.5 5"/><path d="M17.5 10.5V4.2M20 6.5l-2.5-2.3-2.5 2.3"/>',
  "🌻":'<path d="M4 9.5 12 4l8 5.5M5.5 9.5V19M18.5 9.5V19M9 12v7M15 12v7M3.5 19.5h17"/>',
  "🖥":'<path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01"/>',
  "👪":'<path d="M12 3.5v17M8 20.5h8M12 6H6.5L3 12.5h7L6.5 6M12 6h5.5L21 12.5h-7L17.5 6M3 12.5a3.5 3.5 0 0 0 7 0M14 12.5a3.5 3.5 0 0 0 7 0"/>',
  // Petições Iniciais é a lâmpada da peça que começa (era o mesmo documento
  // de 📄 Modelos — as duas listas aparecem juntas no trilho recolhido)
  "💡":'<path d="M9.3 17.5h5.4M10 20.5h4M12 3.5a5.5 5.5 0 0 0-3.2 10c.5.4.8 1 .8 1.6h4.8c0-.6.3-1.2.8-1.6A5.5 5.5 0 0 0 12 3.5Z"/>',
  "🙏":'<path d="M6.5 3.5h11M6.5 20.5h11M8 3.5v3.2a4 4 0 0 0 1.6 3.2L12 12l-2.4 2.1A4 4 0 0 0 8 17.3v3.2M16 3.5v3.2a4 4 0 0 1-1.6 3.2L12 12l2.4 2.1a4 4 0 0 1 1.6 3.2v3.2"/>',
  "🤖":'<path d="M12 3.5c.4 4.6 3.4 7.6 8 8-4.6.4-7.6 3.4-8 8-.4-4.6-3.4-7.6-8-8 4.6-.4 7.6-3.4 8-8Z"/>',
  "📄":'<path d="M13.5 3.5H7A1.8 1.8 0 0 0 5.2 5.3v13.4A1.8 1.8 0 0 0 7 20.5h10a1.8 1.8 0 0 0 1.8-1.8V8.8l-5.3-5.3Z"/><path d="M13.5 3.5V9h5.3M9 13.5h6M9 17h4"/>',
  "📌":'<path d="M9 3.5h6l-.8 6.2 2.8 3.3H7l2.8-3.3L9 3.5ZM12 13v7.5"/>',
  "💼":'<rect x="3.5" y="8" width="17" height="12" rx="2"/><path d="M9 8V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V8M3.5 13h17"/>',
  "💬":'<path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.4-1.1A8.5 8.5 0 1 0 12 3.5Z"/>',
  "🤝":'<circle cx="9" cy="8.5" r="3.2"/><path d="M3 19.5c.7-3 3-4.6 6-4.6s5.3 1.6 6 4.6"/><path d="M15.5 5.6a3.2 3.2 0 0 1 0 5.8M17.5 15.3c1.8.7 3 2.1 3.5 4.2"/>',
  "💰":'<circle cx="12" cy="12" r="8.5"/><path d="M12 6.5v11M14.8 8.7c-.6-.9-1.6-1.3-2.8-1.3-1.7 0-2.9.9-2.9 2.2 0 3.1 5.8 1.5 5.8 4.6 0 1.3-1.2 2.2-2.9 2.2-1.3 0-2.4-.5-3-1.5"/>',
  "🩺":'<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M12 7.5v9M7.5 12h9"/>',
  "📊":'<rect x="3.5" y="3.5" width="7.2" height="7.2" rx="1.5"/><rect x="13.3" y="3.5" width="7.2" height="7.2" rx="1.5"/><rect x="3.5" y="13.3" width="7.2" height="7.2" rx="1.5"/><rect x="13.3" y="13.3" width="7.2" height="7.2" rx="1.5"/>',
  "⚙️":'<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.7M12 18.5v2.7M2.8 12h2.7M18.5 12h2.7M5.5 5.5l1.9 1.9M16.6 16.6l1.9 1.9M18.5 5.5l-1.9 1.9M7.4 16.6l-1.9 1.9"/>',
  "➕":'<path d="M12 5v14M5 12h14"/>',
  "🔍":'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
};
const svgIc = (emoji, t=17) => SVG_MENU[emoji]
  ? `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${SVG_MENU[emoji]}</svg>`
  : null;

// título da lista (espec. 6.1): sempre azul-escuro, com o ícone SVG da lista
// à esquerda — a cor por lista fica só na pastilha do menu. O rótulo com
// emoji continua a fonte de verdade; aqui muda só a apresentação.
// F276 · a frase que explica a tela, embaixo do título, vira a dica do título (no passar do mouse): a tela abre só com o
// que se usa. Quando o subtítulo traz controles (o "Agrupar por" do Quadro), eles ficam e só a frase sai
function subtituloComoDica(){
  const sub = document.getElementById("sub-lista"), h = document.getElementById("titulo-lista"); if(!sub || !h) return;
  const ajustar = () => {
    const frase = !sub.children.length && sub.textContent.trim();
    sub.classList.toggle("sub-dica", !!frase); h.title = frase || ""; h.classList.toggle("dica-tit", !!frase);
    sub.querySelectorAll(":scope > span > .meio-sub").forEach(x=>{ h.title = x.textContent.trim(); h.classList.add("dica-tit"); x.hidden = true; });
  };
  new MutationObserver(ajustar).observe(sub, {childList:true, characterData:true, subtree:true}); ajustar();
}
// a mesma regra nas seções das telas do meio (as Configurações, sobretudo): o parágrafo de explicação logo abaixo de um título vira a dica
// dele. Fica à vista o que é conteúdo: o aviso de lista vazia ("Nenhum…", "Sem…", "Caixa vazia"), o que tem botão ou
// campo, a frase curta e o que está nas caixas de decisão (#modal), onde a explicação ajuda a escolher
const RX_VAZIO = /^(nenhum|nenhuma|sem |caixa vazia|ainda não)/i;
function frasesComoDica(raiz){
  // só nas telas do meio (Configurações e as visões): na ficha, o parágrafo abaixo do título costuma ser o dado do caso
  for(const x of (raiz||document).querySelectorAll("#conteudo-meio :is(h2,h3,h4,.secao) + p.meio-sub:not(.sub-dica)")){
    const h = x.previousElementSibling, t = x.textContent.trim().replace(/\s+/g, " ");
    if(x.closest("#modal") || t.length < 36 || RX_VAZIO.test(t) || x.querySelector("button,input,select,textarea,a,label")) continue;
    h.title = h.title ? `${h.title}\n${t}` : t; h.classList.add("dica-tit"); x.classList.add("sub-dica");
  }
}
function vigiarFrases(){
  let fila = 0;
  new MutationObserver(()=>{ if(!fila) fila = requestAnimationFrame(()=>{ fila = 0; frasesComoDica(); }); })
    .observe(document.body, {childList:true, subtree:true});
  frasesComoDica();
}
function iniciarDicas(){ subtituloComoDica(); vigiarFrases(); }
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", iniciarDicas); else iniciarDicas();
function tituloLista(rot){
  const h = document.getElementById("titulo-lista");
  // F144 · o que a agenda do v10 põe no topo sai ao trocar de tela
  const tx = document.getElementById("topo-extra"); if(tx) tx.innerHTML = "";
  const me = document.querySelector(".meio"); if(me) me.classList.remove("ag-v10","zap-v","lista-opc");
  document.getElementById("app")?.classList.remove("zap-conv-aberta");
  const i = rot.indexOf(" ");
  const ic = i>0 ? svgIc(rot.slice(0,i), 19) : null;
  if(ic) h.innerHTML = `<span class="ic" aria-hidden="true">${ic}</span><span class="h1-txt">${esc(rot.slice(i+1))}</span>`;
  else h.textContent = rot;
}

function montarSidebar(){
  const din = [
    ["meudia","☀️ Meu Dia", quantosNoMeuDia()],
    ["novidades","📣 Novidades", novidades().length],
    ["mencoes","📥 Menções", D.mencoes.length],
    // F124 · o mesmo que a tela mostra: caso, tarefa e lembrete com data
    ["planejado","🗓️ Planejado", quantosNoPlanejado()],
    // F151 · a ocupação da próxima quarta ("9/14"), quando a agenda está ligada
    ["agendaq","📅 Agenda", contadorAgenda()],
    ["minhas","👤 Atribuídas a mim", ativos().filter(k=>(D.atrDoCaso.get(k.id)||[]).includes(eu.id)
        || (D.tarefasPorCaso.get(k.id)||[]).some(t=>t.colaborador_id===eu.id)).length],
    ["importante","⭐ Importante", ativos().filter(k=>k.importante).length
        + tudoSinalizado().length],
    ["particulares","📋 Minhas Tarefas", "🔒"],
    ["rotinas","🔁 Organizacional", (D.rotinas||[]).filter(r=>r.ativo!==false).length],
    ["acervo","🧹 Cuidar do acervo", quantosNoAcervo()],
  ];
  // rótulo = "☀️ Meu Dia" -> ícone + texto separados (o texto some no menu recolhido)
  // ícone e texto em CÉLULAS SEPARADAS. Recolhido, só o ícone fica — e ele
  // precisa poder crescer sozinho. Aberto, a célula de largura fixa alinha
  // todos os rótulos na mesma coluna: emoji não têm a mesma largura, e sem
  // isso "Menções" e "Calendário" começavam em pontos diferentes.
  const rotu = rot => { const i=rot.indexOf(" ");
    const em=rot.slice(0,i);
    return `<span class="rotulo"><span class="ic" aria-hidden="true">${svgIc(em)||em}</span>`
         + `<span class="txt">${esc(rot.slice(i+1))}</span></span>`; };
  // o nome sem o emoji: é ele que o leitor de tela anuncia e que a etiqueta
  // do menu recolhido mostra
  const soTexto = rot => esc(rot.slice(rot.indexOf(" ")+1));
  // contador só quando há o que contar: uma coluna de zeros não informa nada,
  // e faz o número que importa (Menções 3) se perder no meio deles
  const nVenc = quantosVencidos();   // F83 · vencidas pintam o contador do Meu Dia
  document.getElementById("grupo-dinamicas").innerHTML = din.map(([id,rot,n])=>
    `<div class="lista-item" role="button" tabindex="0" data-v="${id}" aria-label="${soTexto(rot)}">${rotu(rot)}`+
    (n==="🔒"?`<span class="priv">🔒 só você</span>`
      // Meu Dia com vencidas e nada de hoje: o contador mostra as vencidas (em
      // vermelho no tema v10), porque prazo passado é o que mais cobra alguém
      :(id==="meudia"&&nVenc)?`<span class="cont venc" title="${nVenc} vencida${nVenc>1?"s":""}">${n||nVenc}</span>`
      :n?`<span class="cont">${n}</span>`:"")+`</div>`).join("");
  if(visaoColab()){
    // F131 · ordem do Paulo: Minhas Tarefas e Organizacional entram nas
    // Listas do escritório, antes das fases; Visões some inteira
    // F220 · as listas e as fases dependem do cargo (listasDoColab)
    const pode = listasDoColab();
    const fasesColab = ["escritorio","inss","conselho","judicial","peticao_inicial","aposentadoria_futura","marcos"].filter(f=>pode.includes("fase:"+f));
    // F187 · o WhatsApp mora em Visões (que some para o colaborador): aqui ele
    // entra nas listas, porque é onde o atendente trabalha
    document.getElementById("grupo-dinamicas").innerHTML = [...din, ["whatsapp","💬 WhatsApp", (D.zapResumo||0) || null],
        ["direito","⚖️ Análise de Direito", direitoAlcancado().length||null],
        ["clientes","👥 Clientes", (D.clientes||[]).filter(c=>c.nome && ehClienteDaLista(c)).length],
        ["contatos","📇 Contatos", (D.clientes||[]).filter(ehContato).length||null]]   // F250 · a lista de todos os clientes (nível 0)
      .filter(([id])=>pode.includes(id) && !["particulares","rotinas"].includes(id))
      .map(([id,rot,n])=>`<div class="lista-item" role="button" tabindex="0" data-v="${id}" aria-label="${soTexto(rot)}">${rotu(rot)}${
        (id==="meudia"&&nVenc)?`<span class="cont venc" title="${nVenc} vencida${nVenc>1?"s":""} · ${n||0} hoje">${n?`${nVenc} · ${n}`:nVenc}</span>`:n?`<span class="cont">${n}</span>`:""}</div>`).join("");   // F236 · vencidas · hoje, como a tela
    document.getElementById("grupo-fases").innerHTML =
      din.filter(([id])=>["particulares","rotinas"].includes(id) && !(soLeitura() && !pode.includes(id))).map(([id,rot,n])=>
        `<div class="lista-item" role="button" tabindex="0" data-v="${id}" aria-label="${soTexto(rot)}">${rotu(rot)}${n==="🔒"?`<span class="priv">🔒 só você</span>`:n?`<span class="cont">${n}</span>`:""}</div>`).join("")
      + fasesColab.map(f=>{ const rot=(FASES.find(x=>x[0]===f)||[f, f==="marcos" ? "☕ Marcos" : "🙏 Aposentadorias futuras"])[1];
          const n = f==="aposentadoria_futura" ? cardsApos().length : casosDaFase(f).length + (f==="escritorio"?clientesEmAtendimento().length:0);
          return `<div class="lista-item" role="button" tabindex="0" data-v="fase:${f}" aria-label="${soTexto(rot)}">${rotu(rot)}${n?`<span class="cont">${n}</span>`:""}</div>`
            + (f==="aposentadoria_futura" ? itemContrib(rotu) : ""); }).join("");
    document.getElementById("grupo-visoes").innerHTML = "";
    document.getElementById("grupo-visoes").parentElement.style.display = "none";
  } else {
  document.getElementById("grupo-visoes").parentElement.style.display = "";
  document.getElementById("grupo-fases").innerHTML = ordemDasFases().filter(([f])=>f!=="prazo").map(([f,rot])=>{   // F378 · Tarefas com Prazo é aba do Planejado
    const n = casosDaFase(f).length + (f==="escritorio"?clientesEmAtendimento().length:0);
    return `<div class="lista-item" role="button" tabindex="0" data-v="fase:${f}" aria-label="${soTexto(rot)}">${rotu(rot)}${n?`<span class="cont">${n}</span>`:""}</div>`
      + (f==="aposentadoria_futura" ? itemContrib(rotu) : "");
  }).join("")
  // F68 · os casos de acompanhamento MANUAL têm a lista própria de checagem
  + (m=>`<div class="lista-item" role="button" tabindex="0" data-v="checagem" aria-label="Checagem manual">${
      rotu("🔎 Checagem manual")}${m?`<span class="cont">${m}</span>`:""}</div>`)(
      ativos().filter(k=>k.acompanhamento==="manual").length);
  document.getElementById("grupo-visoes").innerHTML = [
    // ⚖️ F48 — o coração do escritório: o número é o que exige ação, clientes
    // cuja análise mais recente diz que o direito JÁ chegou
    ["direito","⚖️ Análise de Direito", direitoAlcancado().length||null],
    // a lista de todos os clientes (F250) também na visão do titular, e não só na do colaborador
    ["clientes","👥 Clientes", (D.clientes||[]).filter(c=>c.nome && ehClienteDaLista(c)).length],
    ["contatos","📇 Contatos", (D.clientes||[]).filter(ehContato).length||null],   // F586
    ["claude","🤖 Claude", D.sugestoes.length],
    ["docmodelos","📄 Modelos", D.docModelos.length],
    ["quadro","📌 Quadro", null],
    ["tabela","▦ Tabela", null],
    ["periciasaviso","🩺 Perícias", periciasDoAviso().length||null],   // F549
    ["sugestoesdia","💡 Sugestões do dia", null],   // F574
    // F132 · os Quadros 1, 2 e 3 saíram do menu: o "Agrupar por" do 📌 Quadro faz o mesmo numa tela só (F255)
    ["vendas","💼 Vendas", D.leads.filter(l=>!["fechado","perdido"].includes(l.etapa)).length],
    // o número que aparece é o que exige ação: não lida ou sem dono
    ["whatsapp","💬 WhatsApp", (D.zapResumo||0) || null],
    ["parcerias","🤝 Parcerias", ativos().filter(k=>k.parceria).length||null],
    ["marketing","📣 Marketing", null],
    // F236 · o número de 💰 Recebimentos é o dinheiro vencido (antes contava os casos da fase Pagamentos)
    ["recebimentos","💰 Recebimentos", (D.pagamentos||[]).filter(p=>p.status==="aberto" && p.vencimento && p.vencimento<hoje() && !pgSemValor(p) && !valorSuspeito(p)).length || null],
    ["dashboard","📊 Dashboard", null],
    ["patinss","📥 Importar do INSS", null],
    ...(souAdmin() ? [["config","⚙️ Configurações", null]] : []),
  ].map(([id,rot,n])=>`<div class="lista-item" role="button" tabindex="0" data-v="${id}" aria-label="${soTexto(rot)}">${rotu(rot)}${n?`<span class="cont">${n}</span>`:""}</div>`).join("");
  }
  // F144 · a barra do visual novo, como no mock do Paulo (27.09.2026): HOJE
  // com as quatro telas do dia, as seis listas do escritório e duas visões à
  // mostra; todo o resto mora em "Mais N visões", que abre no clique
  const gm = document.getElementById("grupo-mais");
  gm.innerHTML = "";
  if(temaV10() && !visaoColab()){
    const item = (id,rot,n,extra="") => `<div class="lista-item" role="button" tabindex="0" data-v="${id}" aria-label="${soTexto(rot)}">${rotu(rot)}${
      extra || (n?`<span class="cont">${n}</span>`:"")}</div>`;
    const nMd = quantosNoMeuDia();
    const dd = Object.fromEntries(din.map(x=>[x[0],x]));
    document.getElementById("grupo-dinamicas").innerHTML =
      item("meudia","☀️ Meu Dia",nMd, nVenc?`<span class="cont venc" title="${nVenc} vencida${nVenc>1?"s":""} · ${nMd} hoje">${nVenc}${nMd?` · ${nMd}`:""}</span>`:"")
      + item("mencoes","📥 Menções",D.mencoes.length)
      // F236 · as Novidades saem do "Mais": é por elas que os prazos e as perícias entram no escritório
      + ((ns, np)=>item("novidades","📣 Novidades", ns.length, np ? `<span class="cont venc" title="${np} pede${np>1?"m":""} ação (perícia, audiência ou julgamento a agendar) · ${ns.length} ao todo">${np} · ${ns.length}</span>` : ""))(novidades(), novidades().filter(a=>novPede(a)).length)   // F236 · o que pede ação à frente do total
      + item("planejado","🗓️ Planejado",dd.planejado[2])
      + item("agendaq","📅 Agenda",dd.agendaq[2])
      + item("minhas","👤 Atribuídas a mim",dd.minhas[2]);
    const visiveis = ["escritorio","inss","conselho","judicial","peticao_inicial","aposentadoria_futura"];
    const rotV = {};   // F236 · os nomes das listas são os mesmos para todos (os da barra do colaborador)
    const nFase = f => f==="aposentadoria_futura" ? cardsApos().length : casosDaFase(f).length + (f==="escritorio"?clientesEmAtendimento().length:0);   // F218
    document.getElementById("grupo-fases").innerHTML = ordemDasFases().filter(([f])=>visiveis.includes(f))
      .map(([f,rot])=>item("fase:"+f, rotV[f]||rot, nFase(f)) + (f==="aposentadoria_futura" ? itemContrib(rotu) : "")).join("");   // F602
    // o que já estava montado em Visões vai inteiro para o "Mais", menos as duas da vista
    const vis = document.getElementById("grupo-visoes");
    const tmp = document.createElement("div"); tmp.innerHTML = vis.innerHTML;
    const tira = id => { const el=tmp.querySelector(`[data-v="${id}"]`); if(el) el.remove(); return el; };
    tira("clientes"); tira("direito"); tira("agenda");
    const nDir = direitoAlcancado().length;
    // F236 · o Importar fica à vista de quem aplica, com o número de coletas esperando
    vis.innerHTML = item("clientes","👥 Clientes",(D.clientes||[]).filter(c=>c.nome && ehClienteDaLista(c)).length)   // à vista do titular, e não no "Mais"
      + item("direito","⚖️ Análise de Direito",nDir)
      ;   // F420 · o Importar saiu da vista e perdeu o contador: as coletas entram sozinhas e o que pede escolha vai às Novidades
    const mais = ["importante","particulares","rotinas","acervo"].map(id=>{ const x=dd[id];
        return item(id,x[1],x[2]==="🔒"?null:x[2], x[2]==="🔒"?`<span class="priv">🔒 só você</span>`:""); }).join("")
      + item("checagem","🔎 Checagem manual",ativos().filter(k=>k.acompanhamento==="manual").length)
      + tmp.innerHTML;
    const nMais = (mais.match(/class="lista-item"/g)||[]).length;
    const dentro = mais.includes(`data-v="${visao}"`);
    const aberto = dentro || ler("crm_mais_visoes")==="1";
    gm.innerHTML = `<button class="mais-visoes" id="btn-mais-visoes" aria-expanded="${aberto}" aria-label="${aberto?"Menos visões":`Mais ${nMais} visões`}"><span class="txt">${
      aberto?"Menos visões":`Mais ${nMais} visões`}</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${aberto?"m6 15 6-6 6 6":"m6 9 6 6 6-6"}"/></svg></button>`
      + `<div class="mais-lista"${aberto?"":" hidden"}>${mais}</div>`;
    document.getElementById("btn-mais-visoes").onclick=()=>{ guardar("crm_mais_visoes", aberto?"0":"1"); montarSidebar(); };
    document.getElementById("busca").placeholder = "Nome, CPF, processo";
  }
  if(temaV10()) montarConta();   // também na visão do colaborador (nível 0 e 1), senão o menu da conta não abre
  const bVer=document.getElementById("btn-vercomo");
  if(bVer){ bVer.style.display = souAdmin() ? "" : "none"; bVer.classList.toggle("on", visaoColab());
    bVer.textContent = visaoColab() ? "voltar" : "ver como colaborador"; }
  const bNv=document.getElementById("btn-niveis"); if(bNv) bNv.style.display = souAdmin() ? "" : "none";   // F249
  aplicarNivel();
  document.getElementById("u-papel").textContent = visaoColab() && souAdmin() ? "visão do colaborador"
    : (eu.papel === "admin" ? "administrador" : eu.setor || "equipe");
  const bSom=document.getElementById("btn-som");
  const sinoSvg = on => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10ZM10 19a2 2 0 0 0 4 0"/>${on?"":'<path d="M4.5 4.5 19.5 19.5"/>'}</svg>`;
  bSom.innerHTML = sinoSvg(somLigado());
  bSom.onclick=()=>{
    guardar("crm_som", somLigado()?"off":"on");
    bSom.innerHTML = sinoSvg(somLigado());
    if(somLigado()) plim();
    aviso(somLigado()?"Som ligado":"Som desligado", false);
  };
  // o cadastro já com ficha continua de onde parou; sem ficha, recomeça limpo
  document.getElementById("btn-novo-cli").onclick=()=>{ if(!_ncl.id) _ncl = {etapa:1, id:null}; irNovoCliente(); };
  { const vs = visoesSalvas(), g = document.getElementById("grupo-salvas");
    if(g){ g.parentElement.hidden = !vs.length;
      g.innerHTML = vs.map(v=>`<div class="lista-item${_salvaAtiva===v.id && visao===v.visao ? " salva-on" : ""}" role="button" tabindex="0" data-v="salva:${v.id}" data-salva="${v.id}" aria-label="${esc(v.nome)}"><span class="rotulo"><span class="ic" aria-hidden="true">${svgIc("🔖")}</span><span class="txt">${esc(v.nome)}</span></span></div>`).join(""); } }
  document.querySelectorAll(".lista-item").forEach(el=>{
    el.onclick=()=>{
      if(el.dataset.salva) return abrirVisaoSalva(el.dataset.salva);
      _salvaAtiva = null;
      document.querySelectorAll(".lista-item").forEach(i=>i.classList.remove("ativa"));
      el.classList.add("ativa");
      visao = el.dataset.v; zag.fora = false; limparBusca(); esconderEtiqueta();
      if(visao==="novocliente" && !_ncl.id) _ncl = {etapa:1, id:null};   // F222 · o nome de uma pesquisa antiga não vale aqui
      fecharMenuCel(); fecharFicha(false); render(); pintarAgendaZap();   // F377 · como o irPara: na Agenda o painel some
    };
    el.onmouseenter=()=>etiquetaMenu(el);
    el.onmouseleave=esconderEtiqueta;
  });
  // quando o To Do falou com o banco pela última vez (carimbo do migrar.py
  // no fim de cada rodada). E3 · o banco dispara a rodada a cada 10 min das
  // 07h00 às 20h50: nesse horário, mais de 25 min sem carimbo é âmbar (o
  // disparo parou, a rodada falhou ou o token do Graph venceu).
  const st = document.getElementById("sync-todo");
  if(st){
    const t = cfgApp("todo_sync_em");
    // F47 · disparo manual ao lado do carimbo — some enquanto roda
    // F130 · o disparo e o 🩺 usam o gh_token, que só o admin lê
    const btnSync = !souAdmin() ? "" : (syncRodando
      ? `<span class="txt" style="color:#9AA0B0">⏳ sincronizando…</span>`
      : `<button class="btn-mini" id="btn-sync-todo" onclick="sincronizarToDoAgora()"
          title="dispara agora a sincronização To Do → CRM (a mesma que roda sozinha a cada 10 minutos; leva ~2 min)">🔄 agora</button>`)
      + ` <button class="btn-mini" onclick="saudeSync()"
          title="as últimas rodadas da sincronização no GitHub: quais deram certo, quais falharam e em qual passo">🩺</button>`;
    if(!t) st.innerHTML = btnSync;
    else{
      const min = Math.max(0, Math.round((Date.now()-new Date(t))/60000));
      const rel = min<1 ? "agora" : min<60 ? `há ${min} min`
        : min<1440 ? `há ${Math.round(min/60)} h` : `em ${fmt(dataSP(t))}`;
      const disparo = problemaDisparo();
      st.innerHTML = `<span title="última sincronização completa To Do → CRM: ${esc(fmtTS(t))} às ${esc(horaSP(t))}" style="display:inline-flex;align-items:center;gap:6px">${svgIc("🔁",13)} To Do ${rel}</span>${disparo?` <span title="${esc(disparo)}">⚠</span>`:""} ${btnSync}`;
      st.style.color = syncAtrasada(min) || disparo ? "#E8A13D" : "";
    }
  }
  const at = document.querySelector(`.lista-item[data-v="${ehAbaPlan(visao) ? "planejado" : visao}"]`);   // F378 · as abas acendem o Planejado
  // são 26 destinos: recolhido, o trilho não cabe na tela e rola. Sem isto,
  // abrir uma lista do fim deixava o menu mostrando um trecho onde nada está
  // aceso — parecia que nenhuma lista estava selecionada.
  const atS = document.querySelector(".lista-item.salva-on");   // F448 · aberta pela visão salva, acende ela
  if(atS){ atS.classList.add("ativa"); atS.scrollIntoView({block:"nearest"}); }
  else if(at){ at.classList.add("ativa"); at.scrollIntoView({block:"nearest"}); }
  ligarArrasteListas();
}

