// F144 · o menu da conta: sincronizar e configurações em cima; o resto que
// morava na faixa do usuário (som, ver como, recolher, visual, sair) embaixo
function montarConta(){
  const b = document.getElementById("btn-conta"), m = document.getElementById("menu-conta");
  if(!b || !m) return;
  const av = document.getElementById("conta-av");
  av.textContent = eu.inicial || (eu.nome||"?")[0]; av.style.background = eu.cor || "#1F5C5A";
  document.getElementById("conta-nome").textContent = (eu.nome||"").split(" ")[0];
  const t = cfgApp("todo_sync_em");
  const quando = !t ? "" : (min => min<1?"agora":min<60?`há ${min} min`:min<1440?`há ${Math.round(min/60)} h`:`em ${fmt(dataSP(t))}`)(
    Math.max(0, Math.round((Date.now()-new Date(t))/60000)));
  const op = (acao, rot, sub="") => `<button role="menuitem" data-conta="${acao}">${rot}${sub?`<small>${sub}</small>`:""}</button>`;
  m.innerHTML = (souAdmin() ? op("sync", syncRodando?"Sincronizando…":"Sincronizar", quando?`To Do ${quando}`:"To Do")
      + op("auditoria","Auditoria To Do", (r=>r?`${r.total} diferença(s) em ${fmtTS(r.em)}`:"")(resumoAuditoria()))
      + op("config","Configurações") + `<hr>` : "")
    + op("som", somLigado()?"Desligar o som":"Ligar o som")
    + op("mdvence", "Meu Dia com o que vence hoje", mdMostraVence()?"ligado":"desligado: só o que eu pus no dia")
    + (navigator.setAppBadge ? op("badge", "Número no ícone", (BADGE_OPCOES.find(([v])=>v===(ler("crm_badge")||"meudia"))||[])[1]) : "")
    + (souAdmin() ? op("vercomo", visaoColab()?"Voltar à minha visão":"Ver como colaborador")
        + op("niveis", "Níveis da equipe", transicao() ? `transição na onda ${ondaAtual()}` : "transição desligada") : "")   // F249
    + op("recolher","Recolher o menu") + `<hr>` + op("sair","Sair");
  const fechar = () => { m.hidden = true; b.setAttribute("aria-expanded","false"); };
  b.onclick = e => { e.stopPropagation(); m.hidden = !m.hidden; b.setAttribute("aria-expanded", String(!m.hidden)); };
  m.querySelectorAll("[data-conta]").forEach(x=>x.onclick=e=>{ e.stopPropagation(); fechar();
    ({ sync: ()=>sincronizarToDoAgora(),
       config: ()=>irPara("config"),
       auditoria: ()=>{ audLista=null; audLinhas=null; irPara("auditoria"); },
       som: ()=>document.getElementById("btn-som").click(),
       mdvence: ()=>{ guardar("crm_md_vence", mdMostraVence()?"0":"1"); montarConta(); montarSidebar(); render(); },
       badge: ()=>escolherBadge(),
       vercomo: ()=>alternarVerComo(),
       niveis: ()=>abrirTransicao(),
       recolher: ()=>document.getElementById("btn-lateral").click(),
       sair: ()=>sair() })[x.dataset.conta]();
  });
  if(!window.__contaFora){ window.__contaFora = true;
    document.addEventListener("click", e=>{ const mm=document.getElementById("menu-conta");
      if(mm && !mm.hidden && !e.target.closest(".v10-topo")) { mm.hidden=true; document.getElementById("btn-conta").setAttribute("aria-expanded","false"); } });
    document.addEventListener("keydown", e=>{ const mm=document.getElementById("menu-conta");
      if(e.key==="Escape" && mm && !mm.hidden){ mm.hidden=true; document.getElementById("btn-conta").focus(); } }); }
  document.getElementById("btn-v10-cli").onclick = () => document.getElementById("btn-novo-cli").click();
  document.getElementById("btn-v10-anotar").onclick = () => anotacaoRapida("");
}

// A etiqueta do menu recolhido: o nome da lista ao lado do ícone, na hora.
// Fora do trilho, porque dentro dele seria cortado pela rolagem.
let balaoMenu, balaoAlvo;
function etiquetaMenu(el){
  if(!el || !document.getElementById("app").classList.contains("mini-lateral")) return;
  const t = el.getAttribute("aria-label"); if(!t) return;
  if(!balaoMenu){ balaoMenu=document.createElement("div"); balaoMenu.id="balao-menu";
    document.body.appendChild(balaoMenu); }
  const r = el.getBoundingClientRect();
  balaoAlvo = el;
  balaoMenu.textContent = t;
  balaoMenu.style.left = (r.right+8)+"px";
  balaoMenu.style.top  = (r.top + r.height/2)+"px";
  balaoMenu.style.display = "block";
}
// rolar o trilho com o mouse parado não pode apagar a etiqueta: o ponteiro
// continua sobre um item, e nenhum novo `mouseenter` viria para trazê-la de
// volta. Ela acompanha o ícone.
function seguirEtiqueta(){ if(balaoAlvo) etiquetaMenu(balaoAlvo); }
function esconderEtiqueta(){ balaoAlvo=null; if(balaoMenu) balaoMenu.style.display="none"; }

// ── o e-Recursos (CRPS), traduzido ────────────────────────────────────────
// Cópia de robo-crps/traduzir.js + comentarioDoEvento de ingerir.js, os dois
// com teste próprio e 125 casos-ouro atrás — inclusive os erros reais já
// corrigidos (o falso "Ação judicial" por substring, o embargo rotulado ao
// contrário, o órgão lido do lugar errado).
//
// Vive dentro de um escopo fechado porque o `semAcento` daqui abaixa a caixa
// e o do PAT não: dois com o mesmo nome no mesmo arquivo, e o último a ser
// declarado ganha — em silêncio.
const CRPS = (() => {
// Tradutor dos eventos do e-Recursos (CRPS) para linguagem de escritório.
//
// A API do INSS devolve o histórico em "servidorês": "Conhecer do Recurso e
// dar-lhe provimento parcial, por unanimidade - Acórdão: 25ª JR/3080/2025".
// Aqui isso vira "✅ Recurso provido em parte (25ª Junta)", que qualquer
// colaborador entende de relance. As regras vêm dos eventos reais das fichas.
//
// Cada regra casa por trecho do status (minúsculo, sem acento) e devolve
// {tipo, icone, resumo}. A ordem importa: da mais específica para a mais geral.

function semAcento(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// alguns nomes de arquivo/eventos vêm com UTF-8 estragado (mojibake).
// não tentamos consertar tudo — só limpamos o que atrapalha a leitura.
function limpar(s) {
  return (s || '').replace(/\s+/g, ' ').trim();
}

// QUEM julgou — e, portanto, em que instância o recurso está.
//
// O CRPS tem dois andares. As Juntas de Recursos julgam o recurso ordinário
// (1ª instância); das Câmaras de Julgamento vem a decisão do recurso especial
// (2ª instância). Saber qual delas decidiu é o que diz se ainda cabe recurso
// especial ou se o caminho administrativo acabou — por isso não basta um
// número solto: guardamos o nome inteiro e a instância.
//
// Lê tanto a sigla do e-Recursos ("25ª JR/3080/2025", "2ª CAJ/1474/2026")
// quanto o cabeçalho do próprio acórdão ("ACORDAM os membros da 2ª Composição
// Adjunta da 10ª Junta de Recursos"). A composição adjunta é uma turma da
// mesma Junta: a instância não muda, então ela não entra no nome.
function orgaoJulgador(texto) {
  const t = String(texto || '');
  const caj = t.match(/(\d{1,2})\s*ª?\s*(?:CAJ\b|C[âa]mara\s+de\s+Julgamento)/i)
           || t.match(/(\d{1,2})\s*ª?\s*C[âa]mara\b/i);
  if (caj) return { nome: `${Number(caj[1])}ª Câmara de Julgamento`,
                    sigla: `${Number(caj[1])}ª CaJ`, instancia: 2 };
  // "1ª Composição Adjunta da 2ª Junta" — quem vale é a Junta, a última do par
  const jr = [...t.matchAll(/(\d{1,2})\s*ª?\s*(?:JR\b|Junta\s+de\s+Recursos)/ig)].pop();
  if (jr) return { nome: `${Number(jr[1])}ª Junta de Recursos`,
                   sigla: `${Number(jr[1])}ª JR`, instancia: 1 };
  if (/C[âa]maras?\s+de\s+Julgamento/i.test(t))
    return { nome: 'Câmaras de Julgamento', sigla: 'CaJ', instancia: 2 };
  if (/Junta\s+de\s+Recursos/i.test(t))
    return { nome: 'Junta de Recursos', sigla: 'JR', instancia: 1 };
  if (/\bCRPS\b/i.test(t) || /conselho de recursos/i.test(t))
    return { nome: 'CRPS', sigla: 'CRPS', instancia: 0 };
  return null;
}

// O MESMO dado, lido do PDF do acórdão. Aqui não dá para varrer o texto
// inteiro: um acórdão de Junta avisa que "cabe Recurso Especial às Câmaras de
// Julgamento", cita a Câmara que uniformizou a jurisprudência, e tem
// conselheiro chamado CUNHA CAMARA. Procurar "câmara" solto acharia todos
// esses. Então lemos só onde o órgão se identifica:
//   1. "ACORDAM os membros da <órgão>, em CONHECER..."   (o colegiado)
//   2. "O(a) Presidente do(a) <órgão>, HOMOLOGA..."      (monocrática)
//   3. o cabeçalho de cada página, entre o CRPS e o MINISTÉRIO
// Nessa ordem: a 1 e a 2 são a assinatura da decisão; a 3 é o timbre.
const ANCORAS = [
  /ACORDAM\s+os\s+membros\s+d[ao]s?\s+([\s\S]{0,110}?)\s*,?\s+em\s+(?:CONHECER|N[ÃA]O\s+CONHECER)/i,
  /Presidente\s+do\(a\)\s+([\s\S]{0,110}?)\s*,\s*HOMOLOGA/i,
  /CRPS\s+([\s\S]{0,90}?)\s*Data\/Hora:/i,
  /Data\/Hora:\s*\d{2}\/\d{2}\/\d{4}[\s\d:]*([\s\S]{0,90}?)\s*MINIST[ÉE]RIO/i,
];

// a versão curta, para caber no fim da linha do andamento ("(25ª Junta)")
function orgaoCurto(bruto) {
  const o = orgaoJulgador(bruto);
  if (!o) return '';
  return o.nome.replace(' de Recursos', '').replace(' de Julgamento', '');
}

// data da sessão embutida no texto ("... - 18/03/26 08:00" → "18/03/2026 08:00").
// F236 · na remarcação ("De: 21/10/26 09:00 - Para: 23/10/26 09:00") vale a data do "Para:", e não a primeira do
// texto, que é a antiga; o ano pode vir com 2 ou 4 dígitos
function dataSessao(bruto) {
  const para = /\bpara:?\s*(\d{2}\/\d{2}\/\d{2,4}\s+\d{2}:\d{2})/i.exec(bruto);
  return dataHora(para ? para[1] : bruto);
}
function dataSessaoDe(bruto) {
  const de = /\bde:?\s*(\d{2}\/\d{2}\/\d{2,4}\s+\d{2}:\d{2})/i.exec(bruto);
  return de ? dataHora(de[1]) : '';
}
function dataHora(s) {
  const m = String(s || '').match(/(\d{2})\/(\d{2})\/(\d{4}|\d{2})\s+(\d{2}:\d{2})/);
  return m ? `${m[1]}/${m[2]}/${m[3].length === 2 ? '20' + m[3] : m[3]} ${m[4]}` : '';
}
// os números que o e-Recursos põe no status: a subtarefa GET do cumprimento, a tarefa do Meu INSS
function numDe(b, rx) { const m = rx.exec(b || ''); return m ? m[1] : ''; }
// F236 · a regra que casa com o status cru (null quando nenhuma casa): a mesma busca para traduzir e para reler.
// A regra casa por trecho (m) ou, quando precisa de duas condições, por teste (t)
function regraDe(bruto) {
  const chave = semAcento(limpar(bruto));
  return REGRAS.find(r => r.t ? r.t(chave) : r.m.some(t => chave.includes(t))) || null;
}

const REGRAS = [
  // ── F236 · antes das decisões: o que traz "acórdão" ou "diligência" no texto e NÃO decide ───────────────
  // Converter o julgamento em diligência só manda instruir (diligência em mesa, Regimento do CRPS, art. 75,
  // § 2º, II): o status traz "Acórdão:" e caía no genérico, que regravava a data da decisão e rearmava o prazo
  { m: ['converter o julgamento em diligencia', 'convertido em diligencia', 'conversao em diligencia',
        'converter em diligencia', 'diligencia em mesa'],
    tipo: 'diligencia', icone: '🔎', f: b => `Julgamento convertido em diligência${sufOrgao(b)}` },
  // a diligência prévia do relator (art. 75, § 2º, I), as providências que o INSS abre para a parte responder
  // pelo Meu INSS e a volta à Junta
  { m: ['solicitacao de diligencia', 'diligencia solicitada', 'baixado em diligencia', 'baixa em diligencia'],
    tipo: 'diligencia', icone: '🔎', f: b => `Diligência pedida pelo relator${sufOrgao(b)}` },
  { m: ['providencias complementares'],
    tipo: 'diligencia', icone: '📋', f: b => {
      const n = numDe(b, /tarefa:?\s*(\d{6,})/i);
      return `Providências da diligência pedidas à parte pelo Meu INSS${n ? ` (tarefa ${n})` : ''}`;
    } },
  { m: ['diligencia cumprida', 'cumprimento de diligencia', 'retorno de diligencia', 'retorno da diligencia',
        'diligencia respondida'],
    tipo: 'andamento', icone: '↩️', f: () => 'Diligência respondida: o processo volta à Junta' },
  // o que só CITA o acórdão: o envio à APS para cumprir, o acórdão cumprido e o pedido de análise
  { m: ['cumprimento de acordao', 'cumprimento do acordao', 'cumprir o acordao', 'cumprir acordao'],
    tipo: 'cumprimento', icone: '📤', f: b => {
      const get = numDe(b, /GET[^:\d]*:?\s*(\d{6,})/i);
      return `Enviado ao INSS para cumprir o acórdão${/implanta/.test(semAcento(b)) ? ', com implantação do benefício' : ''}${get ? ` (subtarefa GET ${get})` : ''}`;
    } },
  { m: ['acordao cumprido', 'cumprido o acordao', 'acordao foi cumprido'],
    tipo: 'cumprimento', icone: '✔️', f: () => 'Acórdão cumprido pelo INSS' },
  { m: ['analise de acordao', 'analise do acordao'],
    tipo: 'andamento', icone: '🔎', f: () => 'O INSS pediu a análise do acórdão' },
  // CIÊNCIA, não andamento: a notificação eletrônica (a ciência é na consulta ou 5 dias depois da emissão,
  // Regimento do CRPS, art. 80, § 1º, I e II) e a carta da decisão; ficam traduzidas, mas não são a situação
  { m: ['notificacao efetuada', 'notificacao enviada'],
    tipo: 'ciencia', icone: '📨', f: b => {
      const d = dataHora(`${numDe(b, /no dia\s+(\d{2}\/\d{2}\/\d{2,4})/i)} 00:00`).slice(0, 10);
      return `Notificação eletrônica à parte${d ? ` em ${d}` : ''} (ciência na consulta ou 5 dias depois, art. 80, § 1º)`;
    } },
  { m: ['carta decisoria'],
    tipo: 'ciencia', icone: '✉️', f: () => 'Carta com a decisão enviada à parte' },

  // ── decisões (o que mais importa) ────────────────────────────────────────
  // EMBARGOS ANTES DE RECURSO. "Dar provimento" ao embargo NÃO é recurso
  // provido: às vezes o efeito é só integrativo ("mantendo-se a decisão
  // proferida no Acórdão objurgado"), às vezes é modificativo e concede o
  // benefício. O status do e-Recursos não distingue os dois — quem sabe é o
  // acórdão. Então o rótulo aponta para o acórdão em vez de arriscar um
  // "✅ Recurso PROVIDO" (parabéns por um recurso ainda perdido) ou um
  // "esclarece o acórdão" (que esconde uma aposentadoria concedida).
  // F236 · a interposição dos embargos é das partes (mais abaixo): aqui só o julgamento deles. O efeito
  // ("favoravel", "desfavoravel", "parcial", "embargos") é o que a importação grava no caso
  { t: c => !/^interposicao/.test(c)
      && ['conhecer do embargo', 'conhecer dos embargos', 'embargo do segurado', 'embargos de declaracao'].some(x => c.includes(x)),
    tipo: 'decisao', efeito: 'embargos', icone: '📝',
    f: b => /nao conhec/.test(semAcento(b)) ? `Embargos não conhecidos${sufOrgao(b)}`
      : /negar|improv|rejeit/.test(semAcento(b))
      ? `Embargos rejeitados${sufOrgao(b)}`
      : `Embargos acolhidos — confira o acórdão${sufOrgao(b)}` },
  { m: ['provimento parcial', 'parcial provimento', 'provimento em parte', 'provido em parte', 'provida em parte'],
    tipo: 'decisao', efeito: 'parcial', icone: '✅', f: b => `Recurso provido EM PARTE${sufOrgao(b)}` },
  // F236 · o e-Recursos escreve "negar-lhe provimento" (o acórdão, "nego" ou "negado provimento"): sem estas
  // formas a negativa caía no genérico e virava "Acórdão publicado"
  { m: ['negar provimento', 'negar-lhe provimento', 'negar-lhes provimento', 'nego provimento', 'negado provimento',
        'negou provimento', 'negaram provimento', 'desprovimento', 'desprovido', 'improvido', 'improceden'],
    tipo: 'decisao', efeito: 'desfavoravel', icone: '⛔', f: b => `Recurso negado${sufOrgao(b)}` },
  { m: ['nao conhecer', 'recurso nao conhecido'],
    tipo: 'decisao', efeito: 'desfavoravel', icone: '⛔', f: b => `Recurso negado — não conhecido${sufOrgao(b)}` },
  { m: ['dar provimento', 'dar-lhe provimento', 'dar-lhes provimento', 'dou provimento', 'deu provimento',
        'deram provimento', 'dado provimento'],
    tipo: 'decisao', efeito: 'favoravel', icone: '✅', f: b => `Recurso PROVIDO${sufOrgao(b)}` },
  { m: ['decisao monocratica'],
    tipo: 'decisao', icone: '⚖️', f: b => `Decisão monocrática${sufOrgao(b)}` },
  { m: ['acordao'],
    tipo: 'decisao', icone: '⚖️', f: b => `Acórdão publicado${sufOrgao(b)}` },

  // ── julgamento / pauta ───────────────────────────────────────────────────
  // F236 · a remarcação diz a data NOVA (a do "Para:") e o cancelamento não é inclusão em pauta: as duas vêm
  // antes da regra da sessão, que casava com "Sessão de Julgamento" e lia a primeira data do texto (a antiga)
  { t: c => /alterad[ao] a data|alteracao da data|remarcad|reagendad/.test(c) && /sessao|julgamento|pauta/.test(c),
    tipo: 'pauta', sessao: 'remarcada', icone: '🔁', f: b => {
      const d = dataSessao(b), de = dataSessaoDe(b);
      return d ? `Sessão de julgamento remarcada para ${d}${de && de !== d ? ` (era ${de})` : ''}` : 'Sessão de julgamento remarcada';
    } },
  { t: c => /cancel|exclu|adiad|desmarc/.test(c) && /pauta|sessao|julgamento/.test(c),
    tipo: 'pauta', sessao: 'cancelada', icone: '↩️', f: () => 'Sessão de julgamento cancelada: o processo saiu da pauta' },
  { m: ['para inclusao em pauta', 'apto para pauta', 'aguardando pauta'],
    tipo: 'andamento', icone: '🗂', f: () => 'Pronto para entrar em pauta' },
  { m: ['sessao de julgamento'],
    tipo: 'pauta', sessao: 'pauta', icone: '⚖️', f: b => {
      const d = dataSessao(b);
      return d ? `Pautado para julgamento em ${d}` : 'Incluído em pauta de julgamento';
    } },
  { m: ['retirado de pauta'],
    tipo: 'pauta', sessao: 'cancelada', icone: '↩️', f: () => 'Retirado de pauta pelo relator' },
  { m: ['aguardando distribuicao'],
    tipo: 'andamento', icone: '⏳', f: () => 'Aguardando distribuição ao relator' },
  // F236 · "redistribuído" contém "distribuído": a regra dele vem primeiro, senão nunca casava
  { m: ['redistribuido ao conselheiro'],
    tipo: 'andamento', icone: '👤', f: () => 'Redistribuído a outro relator' },
  { m: ['distribuido ao conselheiro'],
    tipo: 'andamento', icone: '👤', f: () => 'Distribuído ao conselheiro relator' },

  // ── movimentos das partes ────────────────────────────────────────────────
  { m: ['interposicao de recurso especial'],
    tipo: 'recurso', icone: '📄', f: () => 'Recurso especial protocolado' },
  { m: ['interposicao de incidente', 'embargos'],
    tipo: 'recurso', icone: '📄', f: () => 'Embargos protocolados' },
  { m: ['contrarrazoes'],
    tipo: 'andamento', icone: '📄', f: () => 'Contrarrazões do INSS juntadas' },
  { m: ['recurso ordinario'],
    tipo: 'recurso', icone: '📄', f: () => 'Recurso ordinário protocolado' },

  // ── perícia médica ───────────────────────────────────────────────────────
  { m: ['aguardando parecer do perito', 'solicitacao de parecer do perito'],
    tipo: 'pericia', icone: '🩺', f: () => 'Aguardando parecer do perito médico' },
  { m: ['informacoes obtidas pmf', 'tarefa cancelada pmf', 'tarefa concluida pmf'],
    tipo: 'pericia', icone: '🩺', f: () => 'Parecer médico concluído' },

  // ── tramitação interna ───────────────────────────────────────────────────
  { m: ['requerimento protocolado'],
    tipo: 'andamento', icone: '📥', f: () => 'Requerimento protocolado' },
  { m: ['protocolo recebido no inss', 'protocolo recebido'],
    tipo: 'andamento', icone: '📥', f: () => 'Protocolo recebido no INSS' },
  { m: ['juntada de informacoes previdenciarias'],
    tipo: 'andamento', icone: '📎', f: () => 'Juntada de informações previdenciárias (CNIS/benefícios)' },
  { m: ['juntada de documento', 'documento juntado', 'documento juntado'],
    tipo: 'andamento', icone: '📎', f: () => 'Documento juntado' },
  { m: ['documentacao do processo de origem', 'documentacao do sistema unico'],
    tipo: 'andamento', icone: '📎', f: () => 'Documentação do processo de origem juntada' },
  { m: ['motivo de indeferimento alterado'],
    tipo: 'andamento', icone: 'ℹ️', f: () => 'Motivo de indeferimento registrado' },
  { m: ['inclusao de parte'],
    tipo: 'andamento', icone: '👥', f: () => 'Inclusão de parte no processo' },
  { m: ['alteracao do endereco', 'alteracao da aps', 'alterar localizador',
        'alteracao de correspondencia'],
    tipo: 'ruido', icone: '·', f: () => 'Movimentação interna (cadastro/localizador)' },
  { m: ['encaminhamento automatico', 'criacao de subtarefa'],
    tipo: 'ruido', icone: '·', f: () => 'Encaminhamento automático interno' },
  { m: ['encaminhamento'],
    tipo: 'andamento', icone: '➡️', f: b => `Encaminhado${sufDestino(b)}` },
];

// "... - Acórdão: 25ª JR/3080/2025" → " (25ª Junta)"
function sufOrgao(b) { const o = orgaoCurto(b); return o ? ` (${o})` : ''; }
// "Encaminhamento - (21150521 para 25ª JR)" → " à 25ª Junta"
// F236 · vale o DESTINO, o que vem depois do "para": "(7ª JR para PMF)" foi à Perícia Médica Federal, e não à
// Junta de onde saiu; número sozinho é unidade do INSS (APS, CEAB)
function sufDestino(b) {
  const par = /\(([^()]*?)\s+para\s+([^()]+)\)/i.exec(b) || /()\bpara\s+([A-Za-zÀ-ú0-9ª\s]+?)\)?$/i.exec(b);
  const dest = par ? limpar(par[2]) : '';
  if (/\bPMF\b|per[ií]cia m[ée]dica/i.test(dest)) return ' à Perícia Médica Federal';
  if (/^CRPS\b/i.test(dest)) return ' ao CRPS';
  const o = orgaoCurto(dest || b);
  if (o) return ` à ${o}`;
  if (/^\d{5,}$/.test(dest)) return ` ao INSS (unidade ${dest})`;
  return dest ? ` (${dest})` : '';
}

// o nome do arquivo diz se ele é o que DECIDE — é por ele que o coletor sabe
// o que vale a pena baixar (acórdão e decisão monocrática, não o acervo todo)
const ehArquivoDeDecisao = nome => /ac[oó]rd[aã]o|monocr[aá]tic/i.test(nome || '');

// traduz UM evento cru {status, data, documentos} → objeto de andamento
function traduzirEvento(ev) {
  const bruto = limpar(ev.status || '');
  const regra = regraDe(bruto);
  const base = regra ? { tipo: regra.tipo, icone: regra.icone, resumo: regra.f(bruto) }
                     : { tipo: 'andamento', icone: '•', resumo: bruto };
  // guardamos a lista dos documentos (nome + caminho no e-Recursos). Antes só
  // ficava a contagem, e o acórdão se perdia: sem o caminho não há como buscá-lo.
  const arquivos = (ev.documentos || []).map(d => ({
    id: String(d.id || ''),
    nome: limpar(d.nome || ''),
    path: d.path || '',
    decide: ehArquivoDeDecisao(d.nome),
    // F184 · a extensão já baixou e guardou no bucket: vem o caminho pronto
    ...(d.caminho ? { storage: d.caminho } : {}),
  })).filter(a => a.id || a.path);
  return {
    data: ev.data || '',
    tipo: base.tipo,
    icone: base.icone,
    resumo: base.resumo,
    bruto,
    docs: arquivos.length,
    arquivos,
  };
}

// converte "DD/MM/AAAA HH:MM:SS" → ISO, para ordenar/comparar
function dataParaISO(br) {
  const m = (br || '').match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):?(\d{2})?)?/);
  if (!m) return '';
  const [, d, mo, y, h = '00', mi = '00', s = '00'] = m;
  return `${y}-${mo}-${d}T${h}:${mi}:${s}`;
}

// os eventos "ruído" existem no histórico, mas não valem uma notificação:
// encaminhamentos automáticos e troca de localizador não são novidade real.
const TIPOS_SILENCIOSOS = new Set(['ruido']);
// F236 · a SITUAÇÃO do recurso é o último movimento que diz alguma coisa: a notificação e a carta são ciência do
// que já se disse (e iam cruas ao cliente); o envio ao INSS para cumprir vem com o resultado que se cumpre
const TIPOS_SEM_SITUACAO = new Set(['ruido', 'ciencia']);
const qEv = e => dataParaISO(e.data) || '';
const diaBr = e => qEv(e).slice(0, 10).split('-').reverse().join('/');
function situacaoDe(eventos) {
  const evs = [...(eventos || [])].sort((a, b) => (qEv(a) < qEv(b) ? 1 : qEv(a) > qEv(b) ? -1 : 0));
  const rel = evs.find(e => !TIPOS_SEM_SITUACAO.has(e.tipo)) || evs[0] || null;
  if (!rel) return { status: '', ultimo_em: '' };
  const dec = rel.tipo === 'cumprimento' ? evs.find(e => e.tipo === 'decisao') : null;
  const status = dec
    ? `${dec.icone} ${dec.resumo}${diaBr(dec) ? ` em ${diaBr(dec)}` : ''} · ${rel.resumo}${diaBr(rel) ? ` desde ${diaBr(rel)}` : ''}`
    : rel.tipo === 'decisao' && diaBr(rel) ? `${rel.icone} ${rel.resumo} em ${diaBr(rel)}`
    : `${rel.icone} ${rel.resumo}`;
  return { status, ultimo_em: rel.data };
}

// traduz o processo INTEIRO (o JSON que a API devolve) para o bloco casos.crps
function traduzirProcesso(json, opts = {}) {
  const meuNome = semAcento(opts.procurador || 'paulo roberto tercini');
  const recorrentes = (json.recorrentes || []).map(r => limpar(r.nome))
    .filter(n => !semAcento(n).includes(meuNome));
  const eventos = (json.eventos || []).map(traduzirEvento);
  // o mais novo primeiro (a API já manda assim, mas garantimos)
  eventos.sort((a, b) => (dataParaISO(b.data) < dataParaISO(a.data) ? -1 : 1));
  const sit = situacaoDe(eventos);
  return {
    nup: limpar(json.proc || ''),
    num_proc: limpar(json.numProc || ''),
    orgao_atual: limpar(json.orgaoAtual || ''),
    // o cabeçalho da tela do e-SISREC (1.32.0): número do benefício, APS de origem e recorrido
    nb: limpar(json.nb || ''),
    aps_origem: limpar(json.apsOrigem || ''),
    recorrido: limpar(json.recorrido || ''),
    recorrentes,
    status: sit.status,
    ultimo_em: sit.ultimo_em,
    eventos,
  };
}

// dá a "impressão digital" de um evento, para o robô saber o que é NOVO
// entre uma varredura e outra (data + status cru bastam)
function chaveEvento(e) { return `${dataParaISO(e.data)}|${e.bruto}`; }

// Corrigimos uma REGRA e o rótulo errado já está gravado na ficha. Como cada
// evento guarda o `bruto` (o status cru do e-Recursos), dá para reetiquetar
// sem coletar tudo de novo. Mexe SÓ em tipo/ícone/resumo: os arquivos, o
// storage e os resumos dos acórdãos ficam exatamente como estavam.
function rerotular(bloco) {
  let mudou = 0;
  for (const e of (bloco.eventos || [])) {
    // F236 · status que nenhuma regra conhece guarda o rótulo gravado (o cru com "•" não é melhor que ele)
    if (!e.bruto || !regraDe(e.bruto)) continue;
    const novo = traduzirEvento({ status: e.bruto });
    if (e.tipo === novo.tipo && e.icone === novo.icone && e.resumo === novo.resumo) continue;
    e.tipo = novo.tipo; e.icone = novo.icone; e.resumo = novo.resumo;
    mudou++;
  }
  if (mudou) Object.assign(bloco, situacaoDe(bloco.eventos));
  return mudou;
}

// F236 · o efeito da decisão no caso: a favorável grava o resultado deferido; a contrária e a parcial armam o
// recurso; embargos e monocrática só datam a decisão. Sem o status cru, vale o rótulo gravado
function efeitoDecisao(e) {
  if (!e || e.tipo !== 'decisao') return null;
  const r = e.bruto ? regraDe(e.bruto) : null;
  if (r) return r.efeito || null;
  const s = String(e.resumo || '');
  return /^Embargos/i.test(s) ? 'embargos' : /em parte/i.test(s) ? 'parcial' : /\bprovid[oa]\b/i.test(s) ? 'favoravel'
    : /negad|n[ãa]o conhecid|improvid|desprovid/i.test(s) ? 'desfavoravel' : null;
}
// F236 · o que o movimento diz da sessão de julgamento: pauta (com a data), remarcada (a data nova e a antiga)
// ou cancelada. É daqui que saem o julgamento proposto para a agenda e o prazo da sustentação oral
function sessaoDoStatus(bruto) {
  const r = bruto ? regraDe(bruto) : null;
  if (!r || !r.sessao) return null;
  if (r.sessao === 'cancelada') return { acao: 'cancelada' };
  const iso = s => s ? `${s.slice(6, 10)}-${s.slice(3, 5)}-${s.slice(0, 2)}` : '';
  const d = dataSessao(limpar(bruto)), de = r.sessao === 'remarcada' ? dataSessaoDe(limpar(bruto)) : '';
  if (!d) return null;
  return { acao: r.sessao, data: iso(d), hora: d.slice(11, 16), ...(de ? { de: iso(de) } : {}) };
}

function comentarioDoEvento(e, ctx = {}) {
  const data = dataParaISO(e.data).slice(0, 10).split('-').reverse().join('/');
  const orgao = orgaoJulgador(e.bruto || '');
  // F236 · no encaminhamento a Junta do texto pode ser a ORIGEM ("7ª JR para PMF"): o destino já está no rótulo
  const onde = orgao && orgao.instancia && !/^Encaminhad/.test(e.resumo || '') ? ` · ${orgao.nome}` : '';
  const cabeca = `🖥 CRPS${data ? ` · ${data}` : ''} — ${e.icone} ${semSufixo(e.resumo)}${onde}`;
  if (e.tipo !== 'decisao') return cabeca;
  // F236 · o aviso do recurso especial é só da decisão CONTRÁRIA da Junta fora da alçada: ganho, o INSS cumpre;
  // matéria só médica, a decisão é definitiva (Regimento do CRPS, Portaria MPS 125/2026, art. 89, §§ 2º e 3º).
  // ctx.alcada: "certa", "provavel" ou nada (alcadaJunta, no CRM)
  const ef = efeitoDecisao(e);
  const passo = !orgao || !orgao.instancia
    ? 'Confira o acórdão na aba 🖥 Recurso (CRPS).'
    : orgao.instancia === 2
      ? `Decisão de Câmara: fim da via administrativa.${ef === 'favoravel' ? '' : ' Avaliar ação judicial.'}`
      : ef === 'favoravel' ? 'Recurso provido: o INSS deve cumprir o acórdão. Confira na aba 🖥 Recurso (CRPS).'
      : ef === 'embargos' ? 'Confira o acórdão dos embargos na aba 🖥 Recurso (CRPS).'
      : ctx.alcada === 'certa' ? 'Matéria médica, alçada da Junta (Regimento do CRPS, art. 89, § 3º): decisão definitiva, sem recurso especial. Avaliar ação judicial.'
      : ctx.alcada ? 'Se a decisão se funda só em matéria médica, é definitiva (alçada da Junta, Regimento do CRPS, art. 89, § 3º); senão, cabe Recurso Especial em 30 dias da ciência. Confira o acórdão na aba 🖥 Recurso (CRPS).'
      : 'Da Junta cabe Recurso Especial em 30 dias da ciência. Confira o acórdão na aba 🖥 Recurso (CRPS).';
  return `${cabeca}\n⚠ ${passo}`;
}

function semSufixo(s) {
  return String(s || '').replace(/\s*\((?:\d{1,2}ª\s*)?(?:Junta|Câmara|CRPS)[^)]*\)\s*$/, '');
}

  return { traduzirEvento, traduzirProcesso, dataParaISO, chaveEvento,
           orgaoJulgador, comentarioDoEvento, TIPOS_SILENCIOSOS,
           rerotular, situacaoDe, efeitoDecisao, sessaoDoStatus };
})();
// F74 · a data do evento do CRPS vem em dd/mm/aaaa (como a API manda) — quem
// consome para ORDENAR ou FORMATAR precisa do ISO. Passar a data crua ao
// fmt()/tlOficial saía "20./2.26/0" e pílula ", 20/2" (print do Paulo).
// Vive FORA do módulo (a cópia fiel tem teste que compara o fonte).
function isoCrps(d){
  const s = String(d||"");
  return /^\d{4}-/.test(s) ? s.slice(0,10) : (CRPS.dataParaISO(s)||"").slice(0,10);
}

// ── o que o PAT chama de serviço, e o que o CRM chama de benefício ────────
// Cópia de robo-pat/traduzir.js, que tem teste próprio. Só entra código de
// espécie que apareceu numa resposta real do portal: adivinhar pelo nome do
// serviço acerta nove e escreve B87 numa pensão no décimo, e espécie errada
// muda prazo de recurso, checklist e marcador.

const SERVICOS = {
  // ── pedido de benefício ────────────────────────────────────────────────
  TAIU:    { tipo: 'beneficio', especie: 'B41', nome: 'Aposentadoria por idade' },
  TAR:     { tipo: 'beneficio', especie: 'B41', nome: 'Aposentadoria por idade rural',
             marcadores: ['idade_rural'] },
  TAPDI:   { tipo: 'beneficio', especie: 'B41', nome: 'Aposentadoria por idade da pessoa com deficiência',
             marcadores: ['pcd'] },
  TATCMI:  { tipo: 'beneficio', especie: 'B42', nome: 'Aposentadoria por tempo de contribuição' },
  TAPDTC:  { tipo: 'beneficio', especie: 'B42', nome: 'Aposentadoria por tempo de contribuição da pessoa com deficiência',
             marcadores: ['pcd'] },
  TBSBAPD: { tipo: 'beneficio', especie: 'B87', nome: 'BPC/LOAS — deficiência' },
  TBAI:    { tipo: 'beneficio', especie: 'B88', nome: 'BPC/LOAS — idoso' },
  TPU:     { tipo: 'beneficio', especie: 'B21', nome: 'Pensão por morte' },
  // O auxílio-acidente tem duas espécies e o nome do serviço NÃO diz qual:
  // B36 é o previdenciário, B94 o acidentário. Escolher por conta própria
  // seria chutar num campo que muda a competência do processo — então a
  // espécie fica em aberto e o CRM pergunta.
  TAA:     { tipo: 'beneficio', especie: null, nome: 'Auxílio-acidente',
             aConfirmar: 'B36 (previdenciário) ou B94 (acidentário)' },

  // ── recurso: lista Conselho de Recursos, não INSS ───────────────────────
  // É o mesmo processo que o robô do CRPS já acompanha. Somados, são 83 dos
  // 184 — quase metade da carteira.
  TREC:    { tipo: 'recurso', nome: 'Recurso ordinário (inicial)' },
  RECESP:  { tipo: 'recurso', nome: 'Recurso especial ou incidente' },

  // ── revisão de benefício já concedido ──────────────────────────────────
  TREVISAO:  { tipo: 'revisao', nome: 'Revisão — entidade conveniada' },
  TAREFAREV: { tipo: 'revisao', nome: 'Revisão' },
  REVOFICIO: { tipo: 'revisao', nome: 'Revisão de ofício' },

  // ── dinheiro ───────────────────────────────────────────────────────────
  SEMNPG:  { tipo: 'pagamento', nome: 'Emissão de pagamento não recebido' },
  TSCC:    { tipo: 'pagamento', nome: 'Calcular complementação' },

  // ── serviço administrativo: não abre caso, acontece DENTRO de um ───────
  ATUVCPG: { tipo: 'servico', nome: 'Atualizar vínculos e remunerações (CNIS)' },
  TVALFBR: { tipo: 'servico', nome: 'Validar contribuição de facultativo baixa renda' },
  ATUACAD: { tipo: 'servico', nome: 'Atualizar cadastro e/ou benefício' },

  // ── APURAÇÃO DE IRREGULARIDADE ─────────────────────────────────────────
  // O INSS revendo um benefício que já paga. Pode terminar em suspensão,
  // cancelamento e cobrança do que foi recebido. São dois requerimentos na
  // carteira e são os dois mais urgentes dela — por isso `urgente`.
  MOBDGT:  { tipo: 'apuracao', nome: 'Apuração de irregularidade (MOB Digital)', urgente: true },
  CPCARCJ: { tipo: 'apuracao', nome: 'Encaminhamentos do processo de apuração (MOB)', urgente: true },
};

const ESPECIE_POR_CODIGO = {
  AMP_SOCIAL_PORT_DEFICIENCIA: 'B87',
  AMP_SOCIAL_IDOSO:            'B88',
  APOSENTADORIA_POR_IDADE:     'B41',
  APOSENTADORIA_POR_TEMPO_DE_CONTRIBUICAO: 'B42',
  // apareceu na coleta completa e resolve o TAA quando o código vem: o
  // sufixo _PREVIDENCIARIO é a resposta que o nome do serviço não dava. O
  // acidentário (B94) ainda não apareceu — quando aparecer, entra aqui.
  AUXILIO_ACIDENTE_PREVIDENCIARIO: 'B36',
};

const CANAIS = {
  ENTIDADE_CONVENIADA: 'Protocolado pelo escritório (convênio OAB)',
  INTERNET:            'O cliente protocolou sozinho pelo Meu INSS',
  CENTRAL_135:         'Protocolado pela Central 135',
};

const SITUACOES = {
  PENDENTE: 'Em análise',
  EM_ANALISE: 'Em análise',
  CONCLUIDA: 'Concluído',
  CONCLUIDO: 'Concluído',
  CANCELADA: 'Cancelado',
  CANCELADO: 'Cancelado',
  EXIGENCIA: 'Em exigência',
  CUMPRIMENTO_DE_EXIGENCIA: 'Em exigência',
};

const limpo = s => String(s || '').trim().toUpperCase();

const semAcento = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const situacaoDe = s => SITUACOES[semAcento(limpo(s)).replace(/\s+/g, '_')]
  || String(s || '').trim() || null;

function especieDe(tarefa) {
  const t = tarefa || {};
  const s = SERVICOS[limpo(t.siglaServico)];
  // a sigla diz o TIPO e os marcadores; o código do INSS, quando vem, tem a
  // última palavra sobre a espécie
  const porCodigo = ESPECIE_POR_CODIGO[limpo(t.especieBeneficio)] || null;
  if (!s) {
    if (porCodigo)
      return { tipo: 'beneficio', especie: porCodigo, beneficio: null,
               marcadores: [], urgente: false, fonte: 'especieBeneficio' };
    // desconhecido não é erro: é trabalho para a próxima rodada. O nome do
    // serviço vai junto porque é ele que me diz o que a sigla quer dizer.
    return { tipo: null, especie: null, beneficio: null, marcadores: [], urgente: false,
             fonte: null,
             desconhecido: { especieBeneficio: t.especieBeneficio || null,
                             siglaServico: t.siglaServico || null,
                             nomeServico: t.nomeServico || null } };
  }
  return {
    tipo: s.tipo,
    especie: porCodigo || s.especie || null,
    beneficio: s.nome,
    marcadores: s.marcadores || [],
    urgente: !!s.urgente,
    a_confirmar: s.aConfirmar || null,
    fonte: porCodigo ? 'especieBeneficio' : 'siglaServico',
  };
}

function dataIso(br) {
  const m = String(br || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const iso = String(br || '').trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1] : null;
}

function eventosDe(det) {
  const d = det || {};
  const juntar = (lista, tipo) => (Array.isArray(lista) ? lista : []).map(a => ({
    tipo,
    data: dataIso(a.data),
    hora: (String(a.horario || '').match(/^\d{2}:\d{2}/) || [null])[0],
    local: a.nomeUnidade || null,
    situacao: limpo(a.situacaoAgendamento) || null,
    ativo: limpo(a.situacaoAgendamento) === 'AGENDADO',
  })).filter(e => e.data);
  return [...juntar(d.agendamentosPericia, 'Perícia médica'),
          ...juntar(d.agendamentosAvaliacaoSocial, 'Avaliação social')];
}

function comentariosDe(det) {
  return (Array.isArray((det || {}).comentarios) ? det.comentarios : [])
    .map(c => ({
      // sem `id` do portal, a chave é data+texto. Descartar o comentário
      // seria perder em silêncio justamente a mensagem do INSS — e um
      // duplicado eventual se resolve olhando; um sumiço, não.
      id: String(c.id || `${String(c.dataCriacao || '').slice(0, 10)}|`
                       + String(c.conteudo || '').trim().slice(0, 40)),
      texto: String(c.conteudo || '').trim(),
      quando: (String(c.dataCriacao || '').match(/^\d{4}-\d{2}-\d{2}/) || [null])[0],
      do_inss: !!c.incluidoPorServidor,
      visivel: c.visivel !== false,
    }))
    .filter(c => c.id && c.texto)
    .sort((a, b) => (b.quando || '').localeCompare(a.quando || ''));
}

function resumoDaLista(t) {
  return {
    protocolo: String((t || {}).protocolo || '').trim(),
    situacao: situacaoDe((t || {}).status),
    cpf: String((t || {}).cpfRequerente || '').replace(/\D/g, '').padStart(11, '0'),
    nome: (t || {}).nomeRequerente || null,          // F98 · para cadastrar quem não tem ficha
    servico: (t || {}).nomeServico || null,
    sigla: (t || {}).siglaServico || null,
    unidade: (t || {}).nomeUnidade || null,
    criado_em: (t || {}).dataCriacao || null,
    atualizado_em: (t || {}).dataUltimaAtualizacao || null,
    link: (t || {}).protocolo ? `https://atendimento.inss.gov.br/tarefas/detalhar_tarefa/${t.protocolo}` : null,
  };
}

// F98 · quem é o requerente, do jeito que o cadastro do CRM guarda: o PAT
// traz em `interessados` nome, CPF, nome da mãe, nascimento e celular —
// tudo que a ficha pede. É o que permite cadastrar quem não tem ficha na
// própria tela de importação, sem digitar nada de novo.
function requerenteDe(det) {
  const cpfReq = String((det || {}).cpfRequerente || '').replace(/\D/g, '');
  const lista = Array.isArray((det || {}).interessados) ? det.interessados : [];
  const i = lista.find(x => String((x || {}).cpf || '').replace(/\D/g, '') === cpfReq) || lista[0];
  if (!i) return null;
  const dn = (String(i.dataNascimento || '').match(/^(\d{4})-(\d{2})-(\d{2})/) || []);
  const cel = (i.contatos || []).find(c => c && c.valor && /CELULAR|TELEFONE/i.test(c.tipo || ''))
           || (i.contatos || []).find(c => c && c.valor);
  return {
    nome: String(i.nome || '').trim() || null,
    cpf: String(i.cpf || '').replace(/\D/g, '') || cpfReq || null,
    nome_mae: String(i.nomeMae || '').trim() || null,
    dn: dn.length ? `${dn[3]}${dn[2]}${dn[1]}` : null,     // DDMMAAAA, como o cadastro guarda
    telefone: cel ? String(cel.valor).trim() : null,
  };
}
function resumoDoDetalhe(d) {
  const det = d || {};
  const esp = especieDe(det);
  return {
    protocolo: String(det.protocolo || '').trim(),
    requerente: requerenteDe(det),
    situacao: situacaoDe(det.status),
    tipo: esp.tipo,
    especie: esp.especie,
    beneficio: esp.beneficio,
    marcadores: esp.marcadores,
    urgente: esp.urgente,
    especie_a_confirmar: esp.a_confirmar || null,
    servico: det.nomeServico || null,
    sigla: det.siglaServico || null,
    especie_codigo: det.especieBeneficio || null,
    der: (String(det.dataEntradaRequerimento || '').match(/^\d{4}-\d{2}-\d{2}/) || [null])[0],
    unidade: det.nomeUnidade || null,
    canal: det.tipoCanalAtendimento || null,
    quem_protocolou: CANAIS[limpo(det.tipoCanalAtendimento)] || null,
    // O ANEXO AQUI É SÓ CONTAGEM. F184 · a cópia agora vem por outro caminho:
    // a extensão guarda o arquivo no bucket privado (det.arquivos) e a
    // importação o põe no caso, interno. O COMENTÁRIO, NÃO — ele é a mensagem do
    // INSS sobre o processo ("apresentar PPP", "exigência cumprida"), e é
    // exatamente o que responde "o que mudou?". Sem ele, a importação avisa
    // que algo aconteceu e não diz o quê.
    //
    // Eles nascem internos: `publico` fica false, então nada disso atravessa
    // para a ficha do cliente no portal. A barreira continua onde deve estar.
    anexos: Array.isArray(det.anexos) ? det.anexos.length : 0,
    comentarios: comentariosDe(det),
    em_exigencia: !!det.podeCumprirExigencia || situacaoDe(det.status) === 'Em exigência',
    eventos: eventosDe(det),
    link: det.protocolo ? `https://atendimento.inss.gov.br/tarefas/detalhar_tarefa/${det.protocolo}` : null,
    desconhecido: esp.desconhecido || null,
  };
}

// ── importar do PAT/GERID (INSS) ──────────────────────────────────────────
// Cópia de robo-pat/importar.js, que tem teste próprio. Este bloco NÃO grava
// nada: compara o arquivo do coletor com o que o CRM já sabe e devolve um
// plano, que a tela mostra antes de tocar no banco. Importação de cem
// requerimentos que escreve primeiro e explica depois é como se descobre,
// três dias depois, que noventa casos duplicados nasceram na lista errada.

const LISTA_POR_TIPO = {
  beneficio: 'inss',
  revisao:   'inss',
  apuracao:  'inss',
  recurso:   'conselho',
};

const NAO_ABRE_CASO = new Set(['servico', 'pagamento']);

const digitos = s => String(s || '').replace(/\D/g, '');

function protocolosDe(k) {
  const p = (k || {}).protocolos;
  const lista = Array.isArray(p) ? p : (p ? [p] : []);
  return lista.map(x => digitos(x)).filter(Boolean);
}

function indexar(D) {
  const porProtocolo = new Map();
  for (const k of (D.casos || []))
    for (const p of protocolosDe(k)) if (!porProtocolo.has(p)) porProtocolo.set(p, k);
  const porCpf = new Map();
  for (const c of (D.clientes || [])) {
    const cpf = digitos(c.cpf);
    if (cpf && !porCpf.has(cpf)) porCpf.set(cpf, c);
  }
  return { porProtocolo, porCpf };
}

function casosParecidos(D, clienteId, lista, especie) {
  return (D.casos || []).filter(k =>
    k.cliente_id === clienteId && k.fase !== 'encerrado' && k.fase === lista &&
    (!especie || !k.especie || String(k.especie).toUpperCase() === String(especie).toUpperCase()));
}
const casoParecido = (D, clienteId, lista, especie) =>
  casosParecidos(D, clienteId, lista, especie)[0];
const tituloDoCaso = k => (k || {}).beneficio || (k || {}).titulo || 'caso sem nome';

// SEPARAR O ÓBVIO DO DUVIDOSO. Sessenta e cinco decisões na mão é trabalho
// que ninguém faz duas vezes — e a maioria delas é "Aposentadoria por tempo
// de contribuição" contra "Apos. Tempo de Contribuição", ou seja, a mesma
// coisa escrita de dois jeitos. O que muda é só a certeza, e ela pode ser
// dita: o item ganha `provavel` e o MOTIVO, para a decisão continuar sendo
// sua com o argumento na frente.
const ABREV = { apos: 'aposentadoria', aposent: 'aposentadoria', aux: 'auxilio',
                ben: 'beneficio', pens: 'pensao', def: 'deficiencia',
                incap: 'incapacidade', contrib: 'contribuicao' };
const VAZIAS = new Set(['por', 'com', 'para', 'sem', 'pessoa', 'requerimento', 'concessao']);

function palavrasDoBeneficio(t) {
  return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim().split(' ')
    .map(p => ABREV[p] || p)
    .filter(p => p.length > 2 && !VAZIAS.has(p));
}
// duas palavras significativas em comum, ou tudo o que o nome mais curto tem
function mesmoBeneficio(a, b) {
  const A = new Set(palavrasDoBeneficio(a)), B = new Set(palavrasDoBeneficio(b));
  if (!A.size || !B.size) return false;
  const comuns = [...A].filter(p => B.has(p)).length;
  return comuns >= 2 || comuns === Math.min(A.size, B.size);
}

function porQueParecido(item, k, quantos) {
  // Recurso e revisão NÃO têm benefício próprio: o nome que veio do portal é
  // o tipo do pedido ("Recurso ordinário"), não o que se pede. Comparar texto
  // aqui casaria "Recurso ESPECIAL" com "Aposentadoria ESPECIAL", que é
  // parecença de palavra e não de caso. O que vale é a contagem.
  if (item.tipo === 'recurso' || item.tipo === 'revisao')
    return quantos === 1
      ? { provavel: true,  motivo: 'é o único caso do cliente nesta lista' }
      : { provavel: false, motivo: `o cliente tem ${quantos} casos nesta lista` };
  if (item.especie && k.especie &&
      String(item.especie).toUpperCase() === String(k.especie).toUpperCase())
    return { provavel: true, motivo: `mesma espécie (${item.especie})` };
  if (mesmoBeneficio(item.beneficio, k.beneficio || k.titulo))
    return { provavel: true, motivo: 'mesmo benefício, escrito de outro jeito' };
  return { provavel: false, motivo: 'o benefício não bate com o que já existe' };
}

// O que muda num caso que JÁ existe. Só campo vazio é preenchido: o que o
// escritório escreveu à mão vale mais que o que o portal devolve, e
// sobrescrever DER conferida por DER do sistema é perder trabalho humano.
// A exceção é a situação, que é justamente o que se quer atualizado.
// O PROTOCOLO DO RECURSO NÃO TEM DER. A "data de entrada" da tarefa do
// recurso é a data do recurso: gravada como DER, ela pôs a data do recurso no
// lugar da DER do pedido em 74 casos do Conselho (31.10.2026). Ela vai ao
// protocolo do recurso ordinário ou do especial, e a DER fica para o pedido.
function datasDoProtocolo(det) {
  if (!det.der) return {};
  if (det.tipo !== 'recurso') return { der: det.der };
  const especial = /RECESP/i.test(det.sigla || '') || /especial|incidente/i.test(det.servico || '');
  return { [especial ? 're_protocolado_em' : 'ro_protocolado_em']: det.der };
}
function mudancasDoCaso(k, det) {
  const m = {};
  for (const [c, v] of Object.entries(datasDoProtocolo(det))) if (!k[c]) m[c] = v;
  if (det.especie && !k.especie) m.especie = det.especie;
  if (det.beneficio && !k.beneficio) m.beneficio = det.beneficio;
  if (det.link && k.processo_link !== det.link) m.processo_link = det.link;
  if (det.urgente && !k.urgente) m.urgente = true;
  // marcadores SOMAM, nunca trocam: quem marcou à mão não perde a marcação
  const tinha = Array.isArray(k.marcadores) ? k.marcadores : [];
  const faltam = (det.marcadores || []).filter(x => !tinha.includes(x));
  if (faltam.length) m.marcadores = [...tinha, ...faltam];
  return m;
}

function eventosNovos(det, jaTem, hoje) {
  const existe = new Set((jaTem || []).map(e =>
    `${e.tipo}|${String(e.data_hora || '').slice(0, 10)}`));
  return (det.eventos || [])
    .filter(e => e.ativo && e.data && e.data >= hoje)
    .filter(e => !existe.has(`${e.tipo}|${e.data}`))
    .map(e => ({ tipo: e.tipo, data: e.data, hora: e.hora || null, local: e.local || null }));
}

function andamentoDaMudanca(k, det) {
  const antes = k.situacao_inss || null;
  if (!det.situacao || det.situacao === antes) return null;
  // F44 · a primeira situação também consta em 📣 (pedido do Paulo: TODA
  // movimentação do portal aparece em Novidades — antes, o primeiro import
  // da situação entrava calado)
  if (!antes) return `INSS · Situação registrada: ${det.situacao}`;
  return `INSS: ${antes} → ${det.situacao}`;
}

// O PAT devolve o comentário em HTML ("<p>an&aacute;lise</p>"): na ficha isso
// virava tag e entidade cruas. Vira texto simples AQUI, na entrada — e a tela
// aplica de novo na saída, para o que já foi gravado sujo. Sem DOM de
// propósito: a mesma função roda no navegador e nos testes do node.
// (cópia fiel de robo-pat/importar.js, como as demais funções desta seção)
const ENTIDADES_PAT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  nbsp: ' ', aacute: 'á', agrave: 'à', atilde: 'ã', acirc: 'â', eacute: 'é',
  ecirc: 'ê', iacute: 'í', oacute: 'ó', otilde: 'õ', ocirc: 'ô', uacute: 'ú',
  uuml: 'ü', ccedil: 'ç', Aacute: 'Á', Agrave: 'À', Atilde: 'Ã', Acirc: 'Â',
  Eacute: 'É', Ecirc: 'Ê', Iacute: 'Í', Oacute: 'Ó', Otilde: 'Õ', Ocirc: 'Ô',
  Uacute: 'Ú', Ccedil: 'Ç', ordm: 'º', ordf: 'ª', sect: '§', deg: '°' };
function limparHtmlPat(t) {
  return String(t || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-zA-Z]+);/g, (m, n) => ENTIDADES_PAT[n] || m)
    .replace(/\s+/g, ' ').trim();
}

function comentariosNovos(det, jaTem) {
  const vistos = new Set((jaTem || []).map(a => String(a.origem_id || '')));
  return (det.comentarios || [])
    .filter(c => c.id && !vistos.has(String(c.id)))
    .map(c => ({
      origem_id: String(c.id),
      quando: c.quando,
      // quem escreveu vem na frente: é a diferença entre o INSS pedindo algo
      // e o escritório respondendo, e ela muda o que se faz a seguir
      texto: `${c.do_inss ? 'INSS' : 'Escritório'} · ${limparHtmlPat(c.texto)}`,
    }));
}

function planoDeImportacao(pat, D, hoje) {
  const hj = hoje || new Date().toISOString().slice(0, 10);
  const { porProtocolo, porCpf } = indexar(D);
  const porProtocoloPat = new Map((pat.lista || []).map(t => [digitos(t.protocolo), t]));
  const evDoCaso = new Map();
  for (const e of (D.eventos || [])) {
    if (!evDoCaso.has(e.caso_id)) evDoCaso.set(e.caso_id, []);
    evDoCaso.get(e.caso_id).push(e);
  }

  const andDoCaso = new Map();
  for (const a of (D.andamentos || [])) {
    if (!a.origem_id) continue;
    if (!andDoCaso.has(a.caso_id)) andDoCaso.set(a.caso_id, []);
    andDoCaso.get(a.caso_id).push(a);
  }

  const plano = { atualizar: [], novos: [], possiveisDuplicados: [], semCliente: [],
                  ignorados: [], eventos: [], comentarios: [], atualizacoes: [], resumo: {} };

  for (const det of (pat.detalhes || [])) {
    const proto = digitos(det.protocolo);
    const daLista = porProtocoloPat.get(proto) || {};
    const cpf = digitos(daLista.cpf);
    const k = porProtocolo.get(proto);
    const item = { protocolo: proto, cpf, tipo: det.tipo, situacao: det.situacao,
                   beneficio: det.beneficio, especie: det.especie, der: det.tipo === 'recurso' ? null : det.der,
                   datas: datasDoProtocolo(det),
                   link: det.link, marcadores: det.marcadores || [],
                   urgente: !!det.urgente, a_confirmar: det.especie_a_confirmar || null,
                   quem_protocolou: det.quem_protocolou || null };

    if (k) {
      const mud = mudancasDoCaso(k, det);
      const and = andamentoDaMudanca(k, det);
      const evs = eventosNovos(det, evDoCaso.get(k.id), hj);
      if (evs.length) plano.eventos.push({ caso_id: k.id, protocolo: proto, eventos: evs });
      const coms = comentariosNovos(det, andDoCaso.get(k.id));
      if (coms.length) plano.comentarios.push({ caso_id: k.id, protocolo: proto, comentarios: coms });
      // F44 · TODA movimentação consta em 📣: o protocolo cuja "última
      // atualização" avançou no portal SEM mudar situação, comentário ou
      // agendamento entrava calado. Agora vira a sua própria novidade,
      // deduplicada pelo carimbo do portal (importar de novo não repete).
      const ts = String(det.atualizado_em || daLista.atualizado_em || "").trim();
      const chaveAt = ts ? `atualizacao:${proto}:${ts.replace(/\D/g, "")}` : null;
      const jaVisto = chaveAt && (andDoCaso.get(k.id) || [])
        .some(a => String(a.origem_id || "") === chaveAt);
      // só suprime quando OUTRA novidade já vai contar a história (mudança de
      // situação, comentário, agendamento) — backfill silencioso de campo não
      // conta: ele não gera linha nenhuma em 📣
      const teveOutra = and || coms.length || evs.length;
      if (chaveAt && !jaVisto && !teveOutra)
        plano.atualizacoes.push({ caso_id: k.id, protocolo: proto, ts,
          situacao: det.situacao || daLista.situacao || null,
          servico: det.beneficio || daLista.servico || null });
      if (Object.keys(mud).length || and || coms.length)
        plano.atualizar.push({ ...item, caso_id: k.id, mudancas: mud, andamento: and,
                               novos_comentarios: coms.length });
      continue;
    }

    // sem caso: serviço e pagamento não abrem um novo
    if (NAO_ABRE_CASO.has(det.tipo)) { plano.ignorados.push(item); continue; }

    const cli = porCpf.get(cpf);
    const lista = LISTA_POR_TIPO[det.tipo] || 'inss';
    if (!cli) {
      // F98 · quem é, para o cadastro sair num clique: o detalhe traz a
      // pessoa inteira; a lista, ao menos o nome
      const r = det.requerente || {};
      plano.semCliente.push({ ...item, lista, nome: r.nome || daLista.nome || null,
        dn: r.dn || null, nome_mae: r.nome_mae || null, telefone: r.telefone || null });
      continue;
    }
    // O PROTOCOLO CASOU EM POUCOS PORQUE O CAMPO QUASE NUNCA FOI PREENCHIDO,
    // não porque o caso não existe. Criar sem olhar duplicaria a ficha de
    // quem já está no CRM — e ninguém desfaz setenta duplicatas na mão.
    const candidatos = casosParecidos(D, cli.id, lista, det.especie);
    const parecido = candidatos[0];
    if (parecido) {
      const j = porQueParecido(item, parecido, candidatos.length);
      plano.possiveisDuplicados.push({ ...item, cliente_id: cli.id, nome: cli.nome, lista,
        caso_id: parecido.id, titulo_existente: tituloDoCaso(parecido),
        provavel: j.provavel, motivo: j.motivo });
    }
    else plano.novos.push({ ...item, cliente_id: cli.id, nome: cli.nome, lista });
  }

  // os prováveis primeiro: é a ordem em que se decide, e o botão de juntar
  // em lote age exatamente sobre esse bloco de cima
  plano.possiveisDuplicados.sort((a, b) => (b.provavel ? 1 : 0) - (a.provavel ? 1 : 0));

  const porTipo = l => l.reduce((m, x) => (m[x.tipo] = (m[x.tipo] || 0) + 1, m), {});
  plano.resumo = {
    lidos: (pat.detalhes || []).length,
    atualizar: plano.atualizar.length,
    novos: plano.novos.length,
    possiveis_duplicados: plano.possiveisDuplicados.length,
    provaveis: plano.possiveisDuplicados.filter(x => x.provavel).length,
    sem_cliente: plano.semCliente.length,
    ignorados: plano.ignorados.length,
    eventos: plano.eventos.reduce((n, e) => n + e.eventos.length, 0),
    comentarios: plano.comentarios.reduce((n, c) => n + c.comentarios.length, 0),
    movimentacoes: plano.atualizacoes.length,
    exigencias: (pat.detalhes || []).filter(d => d.situacao === 'Em exigência').length,
    apuracoes: (pat.detalhes || []).filter(d => d.urgente).length,
    a_confirmar: (pat.detalhes || []).filter(d => d.especie_a_confirmar).length,
    novos_por_tipo: porTipo(plano.novos),
  };
  return plano;
}

function conferirPlanoPat(pat, plano) {
  const lidos = (pat.detalhes || []).length;
  const soma = plano.atualizar.length + plano.novos.length + plano.possiveisDuplicados.length
             + plano.semCliente.length + plano.ignorados.length;
  if (soma > lidos) return `o plano fala de ${soma} requerimentos e só ${lidos} foram lidos`;
  for (const n of plano.novos.concat(plano.semCliente)) {
    const esperada = LISTA_POR_TIPO[n.tipo];
    if (esperada && n.lista !== esperada)
      return `${n.protocolo} (${n.tipo}) iria para "${n.lista}" em vez de "${esperada}"`;
    if (NAO_ABRE_CASO.has(n.tipo)) return `${n.protocolo} é ${n.tipo} e não pode abrir caso`;
  }
  for (const a of plano.atualizar)
    if (a.mudancas.especie && a.mudancas.especie !== a.especie)
      return `${a.protocolo} gravaria espécie diferente da lida`;
  return null;
}

// o plano na tela, antes de qualquer gravação
let planoPat = null, arquivoPat = null;
// A COLETA DA EXTENSÃO CHEGA CRUA. O arquivo do coletor antigo já vinha
// traduzido; a extensão entrega o que o portal respondeu, sem interpretar —
// é ela que não decide nada. A tradução acontece aqui, com o mesmo
// traduzir.js que o coletor usava.
function normalizarColeta(bruto){
  const b = bruto || {};
  if (Array.isArray(b.detalhes) && b.detalhes.some(d => 'tipo' in d)) return b;  // já traduzido
  const detalhes = (b.detalhes || []).map(d => ('tipo' in d) ? d : resumoDoDetalhe(d));
  // O REQUERIMENTO SEM DETALHE TAMBÉM ENTRA. O plano só lia `detalhes`, e a
  // extensão até a 1.28.0 não buscava o detalhe do concluído: a janela com
  // três decisões chegava como "0 requerimentos". Sem detalhe, a linha da
  // lista basta para situação, serviço, espécie e o caso certo (30.10.2026).
  const com = new Set(detalhes.map(d => digitos(d.protocolo)));
  for (const t of (b.lista || [])) {
    if (('situacao' in t) || com.has(digitos(t.protocolo))) continue;
    const d = resumoDoDetalhe(t);
    if (!d.protocolo) continue;
    delete d.desconhecido;
    com.add(digitos(d.protocolo)); detalhes.push(d);
  }
  return {
    ...b,
    lista: (b.lista || []).map(t => ('situacao' in t) ? t : resumoDaLista(t)),
    detalhes,
  };
}

let coletasPendentes = [];
async function buscarColetas(){
  try{
    coletasPendentes = await api(
      `/rest/v1/coletas?select=id,fonte,criado_em,numero:dados->>numero,host:dados->>host,grau:dados->>grau,sistema:dados->>sistema,parcial:dados->>parcial,qtd:dados->>qtd,login:dados->>login,etapa:dados->>etapa&aplicada_em=is.null&order=criado_em.desc`) || [];
  }catch(e){ coletasPendentes = []; }   // sem a tabela, a tela do arquivo continua
}
// SÓ A MAIS NOVA DE CADA PORTAL INTERESSA. Cada clique no botão da extensão
// entrega uma coleta, e uma tarde de testes deixou onze na fila — todas do
// INSS, todas com quase o mesmo conteúdo. A mais nova é a que vale (o portal
// devolve sempre a lista inteira); as outras só atrapalham a leitura.
function coletasPorFonte(){
  const nova = {}, velhas = [];       // a busca já vem em ordem decrescente
  for(const c of coletasPendentes){
    // processo completo: cada PROCESSO é uma fila própria — a coleta de um
    // não engole a de outro (só a repetição do mesmo número é "velha")
    // acervo judicial: cada HOST+GRAU é uma fila própria — o 1º e o 2º grau
    // do PJe, os quatro eprocs e os dois graus do e-SAJ (mesmo host) chegam
    // todos como fonte "pje", e a coleta de um não pode engolir a de outro
    // como se fosse repetição
    // F187 · o LOTE (entrega parcial de uma rodada longa: a pasta digital do
    // e-SAJ, o "completar processos") é fila própria — cada lote tem
    // processos diferentes, e tratá-lo como repetição escondia 5 de 6
    const chave = c.fonte==="pje-processo" ? `${c.fonte}:${c.numero||c.id}`
                : c.fonte==="pje" && c.parcial==="true" ? `${c.fonte}:lote:${c.id}`
                : c.fonte==="pje" ? `${c.fonte}:${c.host||""}:${c.grau||""}`
                : c.fonte==="prazos" ? `prazos:${c.sistema||""}:${c.host||""}`
                // o e-Recursos com o login do cliente traz só os recursos dele: não é repetição da rodada geral
                : c.fonte==="crps" && c.login==="cliente" ? `crps:cliente:${c.id}`
                // F598 · o lote do e-Recursos (o recurso que andou, entregue logo depois de lido) é fila própria
                : c.fonte==="crps" && c.parcial==="true" ? `crps:lote:${c.id}`
                // o INSS chega em duas entregas por rodada: a 'detalhes' (sem arquivos) é repetição quando há
                // entrega mais nova, e nunca engole a 'anexos' mais antiga, que traz os arquivos
                : c.fonte==="pat" && c.etapa==="detalhes" && !nova.pat ? "pat:detalhes" : c.fonte;
    if(!nova[chave]) nova[chave] = c; else velhas.push(c);
  }
  return { novas: Object.values(nova), velhas };
}
async function descartarColetasVelhas(){
  const { velhas } = coletasPorFonte(); if(!velhas.length) return;
  // sai da fila sem sumir do banco: fica com data de aplicação, como as usadas
  await api(`/rest/v1/coletas?id=in.(${velhas.map(c=>c.id).join(",")})`,{method:"PATCH",
    headers:{Prefer:"return=minimal"},
    body:JSON.stringify({aplicada_em:new Date().toISOString()})}).catch(()=>{});
  await buscarColetas(); render();
  aviso(`${velhas.length} coleta(s) antiga(s) fora da fila`);
}
// F229 · CONFERIR E APLICAR TODAS DE UMA VEZ: o mesmo conferir + aplicar de
// cada coleta dos tribunais, dos recursos e dos prazos, uma depois da outra.
// O INSS fica de fora, porque cria casos e pede a conferência dos "confira
// antes"; o processo completo sem caso no CRM fica na fila, como no clique.
// shortcut: cada aplicar recarrega o CRM inteiro; se a fila passar de dezenas, recarregar só no fim
const LOTE_FONTES = { pje:["conferirPje","aplicarPje"], "pje-processo":["conferirPjeProc","aplicarPjeProc"],
  crps:[null,"aplicarCrps"], prazos:[null,"aplicarPrazos"] };
const coletasDoLote = () => coletasPorFonte().novas.filter(c => LOTE_FONTES[c.fonte]);
let aplicandoTodas = false;
let falhasDaColeta = 0;   // gravações que falharam na rodada automática (sem contar a repetição): o robô as relata
async function aplicarTodasColetas(auto){
  const lista = coletasDoLote();
  if(aplicandoTodas || !lista.length) return;
  if(!auto && !confirm(`Conferir e aplicar ${lista.length} coleta(s) dos tribunais, recursos e prazos, uma depois da outra?`)) return;
  aplicandoTodas = true;
  try{
    for(const [i, c] of lista.entries()){
      aviso(`Importando ${i+1} de ${lista.length}…`, false, true);
      const [conferir, aplicar] = LOTE_FONTES[c.fonte].map(f => f && window[f]);
      try{
        if(conferir) await conferir(c.id);
        if(c.fonte==="pje-processo" && !(planoPjeProcAtual && planoPjeProcAtual.coleta_id===c.id && planoPjeProcAtual.caso_id)){
          planoPjeProcAtual = null; continue; }
        await aplicar(c.id);
      }catch(e){ falhasDaColeta++; console.warn("aplicar todas:", c.id, e); }
    }
  }finally{ aplicandoTodas = false; }
  await buscarColetas(); renderColeta();
  const resta = coletasPendentes.filter(c => lista.some(x => x.id===c.id)).length;
  if(auto && resta===lista.length) return;
  aviso(`✔ ${lista.length-resta} coleta(s) aplicada(s)${resta?`; ${resta} ficaram na fila para conferir uma a uma (sem caso no CRM ou com falha)`:""}`);
}
// Pedido do Paulo (06.11.2026): o Importar era um clique a mais. As coletas que só acrescentam ao caso que
// já existe pelo número (tribunais, e-Recursos, prazos) entram sozinhas no CRM aberto do administrador,
// ao abrir e a cada 5 minutos. Decisão do Paulo (mesmo dia): o INSS também, criando os casos novos; o que
// pede escolha (possível duplicado, requerimento sem ficha, processo sem caso) vai às 📣 Novidades.
// A trava em config_app impede duas aberturas do CRM de aplicarem a mesma fila.
// shortcut: trava por carimbo, sem transação; duas aberturas no mesmo segundo ainda podem coincidir
const AUTO_COLETAS_MS = 60*1000, AUTO_TRAVA_MS = 10*60*1000;
// F482 · pedido do Paulo (09.11.2026): a importação piscava a tela e tirava o que ele fazia (a conversa, o texto
// digitado), porque cada coleta recarregava e repintava o CRM. Em segundo plano, nada se repinta durante a rodada; no
// fim, a tela livre recarrega uma vez, e a ocupada (ficha, WhatsApp, campo com texto, janela) fica como está e a vigia
// (E1) traz o que mudou quando ela se liberar.
function renderColeta(){ if(!coletaSilenciosa) render(); }
async function recarregarDaColeta(){ if(coletaSilenciosa) return; await carregar(); montarSidebar(); render(); }
async function autoAplicarColetas(){
  if(!souAdmin() || aplicandoTodas || document.hidden || coletaSilenciosa) return;
  await buscarColetas();
  const velhas = coletasPorFonte().velhas.filter(c => LOTE_FONTES[c.fonte] || c.fonte==="pat");
  // o INSS pode ter mais de uma na fila (as duas entregas da rodada): todas, da mais antiga à mais nova
  const pats = coletasPorFonte().novas.filter(c => c.fonte==="pat").reverse();
  // sem devolver a contagem dos textos: o robô lê o retorno como estado e tomava "3" por falha
  if(!coletasDoLote().length && !velhas.length && !pats.length){ if(textosPendentes) await lerTextosPendentes(Date.now()).catch(()=>{}); return; }
  const [t] = await api(`/rest/v1/config_app?select=valor&chave=eq.coletas_auto_em`).catch(()=>null) || [];
  // "travado" e não "ok": o robô do servidor precisa saber que esta rodada não aplicou nada
  if(t && Date.now() - Date.parse(t.valor) < AUTO_TRAVA_MS) return "travado";
  await guardarCfgApp("coletas_auto_em", new Date().toISOString());
  coletaSilenciosa = true; falhasDaColeta = 0;
  const inicio = Date.now();
  try{
    if(velhas.length) await api(`/rest/v1/coletas?id=in.(${velhas.map(c=>c.id).join(",")})`,{method:"PATCH",
      headers:{Prefer:"return=minimal"}, body:JSON.stringify({aplicada_em:new Date().toISOString()})}).catch(()=>{});
    await buscarColetas();
    await aplicarTodasColetas(true);
    for(const pat of pats){
      planoPat = null;   // o plano da coleta anterior não pode servir a esta se a leitura falhar
      await usarColeta(pat.id);
      const pl = planoPat;
      if(pl && !pl.erro && pl.coleta_id===pat.id){
        const itens = [...(pl.possiveisDuplicados||[]).map(n=>({protocolo:n.protocolo, nome:n.nome, beneficio:n.beneficio, tipo:"dup",
            motivo:`já tem caso: ${n.titulo_existente||""}${n.motivo?` · ${n.motivo}`:""}`})),
          ...(pl.semCliente||[]).map(n=>({protocolo:n.protocolo, nome:n.nome, beneficio:n.beneficio, tipo:"sem", motivo:"requerimento sem ficha no CRM"}))];
        await guardarCfgApp("pat_sem_caso", JSON.stringify({coleta_id:pat.id, em:new Date().toISOString(), itens}));
        await aplicarPatDeVerdade();
      }
    }
    // o texto dos documentos por último, com a fila já aplicada e dentro da mesma trava
    await lerTextosPendentes(inicio).catch(e => console.warn("texto dos documentos:", e));
  }finally{
    coletaSilenciosa = false;
    await guardarCfgApp("coletas_auto_em", new Date(0).toISOString()).catch(()=>{});
  }
  // F485 · pedido do Paulo (09.11.2026, "ainda continua piscando"): o fim da rodada também não repinta. Os dados entram em D
  // calados (carga leve, sem trocar D com ficha ou campo em uso) e a tela os mostra no próximo clique; o menu atualiza os números.
  await carregar({leve:true, livre:()=>!telaOcupada()}).catch(()=>{});
  montarSidebar();
  if(falhasDaColeta) return `${falhasDaColeta} falha(s)`;
}
async function usarColeta(id){
  try{
    const [c] = await api(`/rest/v1/coletas?select=*&id=eq.${id}`) || [];
    if(!c) return aviso("Não achei essa coleta");
    arquivoPat = normalizarColeta(c.dados);
    planoPat = await montarPlanoPat(arquivoPat);
    planoPat.coleta_id = id;
    renderColeta();
  }catch(e){ aviso("Não consegui ler a coleta: "+e.message); }
}

// O "JÁ ESTÁ NA FICHA" TEM DE VIR DO BANCO NA HORA DE CONFERIR. O D global
// não carrega os andamentos do PAT (seria puxar a ficha inteira do
// escritório em toda abertura do CRM) — e o plano recebia D.andamentos
// VAZIO: a peneira dos comentários não peneirava nada, toda importação
// dizia "20 comentários novos" e listava os mesmos casos de novo, todo dia.
// Uma consulta leve (só caso_id + origem_id, paginada) devolve a memória.
async function montarPlanoPat(arquivo){
  const pats = await todas("andamentos",
    "select=caso_id,origem_id&origem=eq.pat&origem_id=not.is.null").catch(()=>[]);
  // F236 · o evento "Perícia" (To Do, à mão) conta como a "Perícia médica" do PAT: a mesma perícia não entra duas vezes
  const plano = planoDeImportacao(arquivo, {...D, andamentos:pats, eventos:evsComSinonimo(D.eventos)}, hoje());
  // e os "confira antes" que a equipe mandou ignorar de vez param de
  // perguntar — a decisão mora em config_app, compartilhada por todos
  const fora = new Set(patIgnorados());
  const antes = plano.possiveisDuplicados.length;
  plano.possiveisDuplicados = plano.possiveisDuplicados.filter(x=>!fora.has(x.protocolo));
  plano.ignorados_de_vez = antes - plano.possiveisDuplicados.length;
  plano.resumo.possiveis_duplicados = plano.possiveisDuplicados.length;
  plano.resumo.provaveis = plano.possiveisDuplicados.filter(x=>x.provavel).length;
  plano.erro = conferirPlanoPat(arquivo, plano);
  return plano;
}
