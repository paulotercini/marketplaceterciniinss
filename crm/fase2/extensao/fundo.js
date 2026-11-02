import * as API from './crm-api.js';
import { sessaoCaida } from './sessao.js';

// O botão do popup fala com a aba certa. Nada acontece sem clique.
const ALVO = {
  pat: 'https://atendimento.inss.gov.br/tarefas',
  crps: 'https://consultaprocessos.inss.gov.br/',
  pje: 'https://pje1g.trf3.jus.br/pje/Painel/painel_usuario/advogado.seam',
  // sem hash o eproc manda para o painel (logado) ou para o login; o coletor
  // acha o link da Relação de Processos e vai até ela
  eproc: 'https://eproc1g.tjsp.jus.br/eproc/controlador.php?acao=painel_adv_listar',
  esaj: 'https://esaj.tjsp.jus.br/tarefas-adv/',
};
// o PJe tem dois graus em dois domínios e o eproc do TJSP são quatro hosts
// (1g, -ef, -crim, 2g): a aba decide qual deles se coleta
const DOMINIOS = {
  pat: ['https://atendimento.inss.gov.br/*'],
  crps: ['https://consultaprocessos.inss.gov.br/*'],
  pje: ['https://pje1g.trf3.jus.br/*', 'https://pje2g.trf3.jus.br/*'],
  eproc: ['https://*.tjsp.jus.br/eproc/*'],
  esaj: ['https://esaj.tjsp.jus.br/*'],
};
const ARQUIVOS = {
  pat: ['tela.js', 'comum.js', 'docs-regras.js', 'ponte-pat.js'],
  crps: ['tela.js', 'comum.js', 'docs-regras.js', 'crps.js'],
  pje: ['tela.js', 'comum.js', 'docs-regras.js', 'pje-regras.js', 'prazos-regras.js', 'pje.js'],
  eproc: ['tela.js', 'comum.js', 'docs-regras.js', 'eproc-regras.js', 'prazos-regras.js', 'eproc.js'],
  esaj: ['tela.js', 'comum.js', 'docs-regras.js', 'esaj-regras.js', 'prazos-regras.js', 'vendor/pdf-lib.min.js', 'esaj.js'],
};
const casa = (url, dominios) => dominios.some(d =>
  new RegExp('^' + d.replace(/[.]/g, '\\.').replace(/\*/g, '.*')).test(url || ''));
const pausa = ms => new Promise(r => setTimeout(r, ms));
// entre várias abas do mesmo portal, a do Painel/relação vem antes da de um
// processo aberto: o "atualizar tudo" quer o acervo, e mandar a aba do
// processo ao painel tirava a tela de quem estava lendo
const abaPreferida = abas => abas.slice().sort((a, b) =>
  (/\/Painel\/|painel_adv|tarefas-adv|consultaprocessos/.test(b.url || '') ? 1 : 0)
  - (/\/Painel\/|painel_adv|tarefas-adv|consultaprocessos/.test(a.url || '') ? 1 : 0))[0];
// aba recém-criada: espera o "complete" (teto 20s) em vez de 3,5s fixos —
// o PJe leva mais que isso e o coletor respondia "sem acervo"
async function esperarAba(tabId, tetoMs = 20000) {
  for (let t = 0; t < tetoMs; t += 500) {
    try { const a = await chrome.tabs.get(tabId); if (a.status === 'complete') break; } catch (e) { break; }
    await pausa(500);
  }
  await pausa(1500);
}

// UMA fonte, numa aba: reaproveita a aba do portal se ela já estiver aberta
// (abrir uma segunda faria o portal recomeçar a sessão do zero). Com
// `ativar`, a aba ATIVA vem primeiro — no PJe, com um processo aberto na
// frente, o clique coleta o histórico completo DELE — e a aba vem para a
// frente. Sem `ativar` (o "atualizar tudo"), roda em segundo plano.
async function rodarFonte(fonte, { aba = null, ativar = true, extra = null, url = null } = {}) {
  const dominios = DOMINIOS[fonte];
  if (!aba && ativar && !url) {
    const [ativa] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (ativa && casa(ativa.url, dominios)) aba = ativa;
  }
  // `url`: abrir ESTE host, e não aproveitar a aba de outro host do mesmo portal
  if (!aba && !url) aba = abaPreferida(await chrome.tabs.query({ url: dominios }));
  const usar = aba || await chrome.tabs.create({ url: url || ALVO[fonte], active: ativar });
  if (aba) { if (ativar) await chrome.tabs.update(aba.id, { active: true }); }
  else await esperarAba(usar.id);                      // deixa a página carregar de verdade
  // quem tem acesso ao chrome.storage é este worker: a data da última coleta
  // vai como argumento, já pronta
  const { ultima_pat } = await chrome.storage.local.get(['ultima_pat']);
  // REINJETA antes de chamar. O carregamento automático do script na página
  // depende do navegador — e num deles simplesmente não aconteceu, sem erro
  // nenhum. Injetar aqui usa a permissão de domínio da extensão e não
  // depende disso. Os arquivos têm guarda de "já rodei": repetir é inócuo.
  const arquivos = ARQUIVOS[fonte];
  try {
    await chrome.scripting.executeScript(
      { target: { tabId: usar.id, allFrames: true }, files: arquivos });
  } catch (e) { console.warn('[CRM] reinjeção falhou:', e.message); }
  try {
    // allFrames porque o portal virou micro-frontend: a tela de tarefas pode
    // estar num quadro interno, e chamar só o de cima acharia a página vazia
    // F97 · `acervo`: o "atualizar tudo" quer o ACERVO do tribunal, mesmo que
    // a aba esteja parada num processo aberto — sem isto, a rodada entregava
    // o histórico de UM processo e o acervo daquele grau ficava sem coleta.
    // O clique manual na fonte (ativar) continua coletando o processo aberto.
    const res = await chrome.scripting.executeScript({
      target: { tabId: usar.id, allFrames: true },
      func: (desde, opts) => window.crmRodar ? window.crmRodar(desde, opts)
                                     : { erro: 'a página ainda não terminou de abrir — dê F5 e tente de novo' },
      args: [ultima_pat || null, { acervo: !ativar && !(extra && extra.completo), ...(extra || {}) }],
    });
    // a resposta que vale é a do QUADRO DE CIMA (frameId 0): os iframes do
    // painel devolvem "a página ainda não terminou de abrir" e, vindo antes na
    // lista, escondiam o "retomando" de cima — o "atualizar tudo" desistia
    // de esperar e a coleta ficava sem conclusão
    const topo = res.find(r => r && r.frameId === 0);
    if (topo && topo.result) return topo.result;
    const bons = res.map(r => r && r.result).filter(r => r && !r.erro);
    return bons[0] || (res[0] && res[0].result) || { erro: 'sem resposta da página' };
  } catch (e) { return { erro: String(e.message || e) }; }
}

chrome.runtime.onMessage.addListener((msg, _remetente, responder) => {
  if (msg.tipo !== 'rodar') return;
  rodarFonte(msg.fonte).then(responder);
  return true;                       // resposta assíncrona
});

// ATUALIZAR TUDO. Cinco portais, cinco cliques, cinco abas para ir atrás —
// virou um clique. As fontes que rodam sozinhas (e-Recursos, PJe, eproc,
// e-SAJ) partem juntas, cada uma na sua aba e em segundo plano, porque são
// sessões independentes; dentro de cada portal o coletor já é sequencial.
// O PAT vem PRIMEIRO e para a frente, porque o reCAPTCHA exige UM clique
// seu em "Buscar" — é o único passo humano que sobra, e ele acontece
// enquanto os outros quatro já estão rodando atrás.
//
// Coletor que recarrega a página para retomar (PJe, eproc) responde
// "retomando" antes de terminar: aí o fim é a data da última coleta mudar
// no storage, esperada até um teto.
const CHAVE_ULTIMA = { crps: 'ultima_crps', pje: 'ultima_pje', eproc: 'ultima_eproc', esaj: 'ultima_esaj' };
async function esperarConclusao(fonte, antes, tetoMs = 15 * 60000) {
  const chave = CHAVE_ULTIMA[fonte];
  for (let t = 0; t < tetoMs; t += 5000) {
    await pausa(5000);
    const st = await chrome.storage.local.get([chave]);
    if (st[chave] && st[chave] !== antes) return { ok: 'retomado' };
  }
  return { erro: 'não terminou no tempo — veja a faixa na aba' };
}
// cada fonte roda em segundo plano na sua aba; o que responde "retomando"
// termina quando a data da última coleta muda no storage
const rodadorDeFundo = (tarefas, antes) => (fonte, aba, rotulo, url) => tarefas.push((async () => {
  let r = await rodarFonte(fonte, { aba, ativar: false, url });
  if (r && r.erro === 'retomando') r = await esperarConclusao(fonte, antes[CHAVE_ULTIMA[fonte]]);
  return { rotulo, ...r };
})());
// PJe e eproc: uma rodada por host com aba aberta (1º e 2º grau; os hosts do
// eproc); sem aba nenhuma, abre a do 1º grau. 1.27 · o eproc da Fazenda
// Pública (eproc1g-ef) entra sempre: sem aba dele, a rodada a abre, porque
// ninguém lembrava de deixá-la aberta e o host nunca chegou ao CRM.
const SEMPRE = { eproc: ['https://eproc1g-ef.tjsp.jus.br/eproc/controlador.php?acao=painel_adv_listar'] };
async function alvosPorHost(fonte, nome) {
  const porHost = new Map();
  for (const a of await chrome.tabs.query({ url: DOMINIOS[fonte] })) {
    const h = new URL(a.url).host; if (!porHost.has(h)) porHost.set(h, []); porHost.get(h).push(a);
  }
  const alvos = [...porHost].map(([h, l]) => [abaPreferida(l), `${nome} ${h.split('.')[0]}`, null]);
  if (!alvos.length) alvos.push([null, nome, null]);
  for (const url of SEMPRE[fonte] || []) {
    const h = new URL(url).host;
    if (!porHost.has(h)) alvos.push([null, `${nome} ${h.split('.')[0]}`, url]);
  }
  return alvos;
}
// 1.28 · cada tribunal baixa as peças logo que o acervo DELE termina: o
// completar do PJe esperava o e-SAJ, o mais lento, sem precisar de nada dele
const COMPLETAR = { pje: () => completarPje(), eproc: () => completarEproc() };
async function acervoECompletar(fonte, antes) {
  const tarefas = [];
  const roda = rodadorDeFundo(tarefas, antes);
  for (const [aba, rotulo, url] of await alvosPorHost(fonte, fonte === 'pje' ? 'PJe' : 'eproc')) roda(fonte, aba, rotulo, url);
  const acervo = await Promise.all(tarefas);
  const c = await COMPLETAR[fonte]();
  return [...acervo, { ...c, rotulo: c.rotulo + ' completar' }];
}
const judicialAoMesmoTempo = antes =>
  Promise.all(['pje', 'eproc'].map(f => acervoECompletar(f, antes))).then(l => l.flat());
// 1.28 · sem os prazos dos tribunais (pedido do Paulo, 30.10.2026: não eram úteis)
async function rodarTudo() {
  const antes = await chrome.storage.local.get(Object.values(CHAVE_ULTIMA));
  const pat = await rodarFonte('pat', { ativar: true });   // prepara a tela e devolve na hora
  const tarefas = [];
  const roda = rodadorDeFundo(tarefas, antes);
  roda('crps', null, 'e-Recursos');
  roda('esaj', null, 'e-SAJ');
  tarefas.push(judicialAoMesmoTempo(antes));
  return { feitos: (await Promise.all(tarefas)).flat(), pat };
}

// 1.25 · CONFERÊNCIA DAS SESSÕES antes de rodar. Só as abas abertas: a aba
// que falta é aberta pela rodada, e sem ela não há o que tocar. PJe, eproc e
// e-SAJ são tocados no endereço da própria aba, como a vigia já faz a cada
// 4 min (o eproc derruba a sessão com endereço sem assinatura); o PAT vive de
// token, então vale o endereço da aba; o e-Recursos, o token da página.
const NOME = { pat: 'INSS (PAT)', crps: 'e-Recursos', pje: 'PJe', eproc: 'eproc', esaj: 'e-SAJ' };
async function sessoesCaidas() {
  const caidas = [];
  for (const fonte of Object.keys(DOMINIOS)) {
    const vistos = new Set();
    for (const aba of await chrome.tabs.query({ url: DOMINIOS[fonte] })) {
      const host = new URL(aba.url).host;
      if (vistos.has(host)) continue;
      vistos.add(host);
      let caiu = sessaoCaida(aba.url);
      try {
        if (!caiu && fonte === 'crps') {
          const [r] = await chrome.scripting.executeScript({ target: { tabId: aba.id },
            func: () => !localStorage.getItem('ifs_auth') });
          caiu = !!(r && r.result);
        } else if (!caiu && ['pje', 'eproc', 'esaj'].includes(fonte)) {
          const r = await fetch(aba.url, { credentials: 'include', cache: 'no-store' });
          caiu = sessaoCaida(r.url, await r.text());
        }
      } catch (e) { console.warn('[sessões]', fonte, e.message); }
      if (caiu) caidas.push({ rotulo: `${NOME[fonte]} ${host.split('.')[0]}`, tabId: aba.id, windowId: aba.windowId });
    }
  }
  return { caidas };
}
chrome.runtime.onMessage.addListener((msg, _remetente, responder) => {
  if (msg.tipo !== 'sessoes') return;
  sessoesCaidas().then(responder, e => responder({ caidas: [], erro: String(e.message || e) }));
  return true;
});

// 1.25 · AVISO DE CONCLUSÃO. A rodada longa termina com o popup fechado, e o
// resumo que ele mostraria se perdia. A notificação traz o resumo, e o clique
// abre o CRM no 📥 Importar (a aba do CRM, se aberta, é reaproveitada).
const CRM_IMPORTAR = 'https://paulotercini.github.io/marketplaceterciniinss/crm/?ir=patinss';
const ICONE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
function avisarFim(titulo, r) {
  const feitos = (r && r.feitos) || [];
  const erros = feitos.filter(f => f.erro).length;
  const linhas = r && r.erro ? [r.erro]
    : feitos.map(f => `${f.rotulo}: ${f.erro ? '⚠ ' + f.erro : '✔'}`);
  try {
    chrome.notifications.create('crm-fim-' + Date.now(), {
      type: 'basic', iconUrl: ICONE, requireInteraction: true,
      title: `${titulo}: ${r && r.erro ? 'falhou' : erros ? `${erros} com aviso` : 'concluído'}`,
      message: (linhas.join('\n') || 'nada a coletar').slice(0, 500),
      contextMessage: 'clique para abrir o 📥 Importar do CRM',
    });
  } catch (e) { console.warn('[aviso]', e.message); }
  return r;
}
chrome.notifications.onClicked.addListener(async id => {
  if (!id.startsWith('crm-fim-')) return;
  chrome.notifications.clear(id);
  const [aba] = await chrome.tabs.query({ url: 'https://paulotercini.github.io/marketplaceterciniinss/crm/*' });
  if (aba) {
    await chrome.tabs.update(aba.id, { url: CRM_IMPORTAR, active: true });
    await chrome.windows.update(aba.windowId, { focused: true });
  } else await chrome.tabs.create({ url: CRM_IMPORTAR });
});
// 1.25.1 · a rodada longa passa minutos só esperando a página (prazos do PJe,
// completar); sem chamada à API o Chrome encerra o worker no meio, sem erro e
// sem o aviso do fim (23.10.2026: parou depois do e-SAJ). O pulso o mantém vivo.
const comPulso = async f => {
  const p = setInterval(() => chrome.runtime.getPlatformInfo(() => {}), 20000);
  try { return await f(); } finally { clearInterval(p); }
};
const responderComAviso = (titulo, f, responder) => comPulso(f).then(
  r => responder(avisarFim(titulo, r)),
  e => responder(avisarFim(titulo, { erro: String(e.message || e) })));
chrome.runtime.onMessage.addListener((msg, _remetente, responder) => {
  if (msg.tipo !== 'rodar-tudo') return;
  responderComAviso('Atualizar tudo', rodarTudo, responder);
  return true;
});

// ══════════════════════════════════════════════════════════════════════════
// F187 · COMPLETAR PROCESSOS (PJe e eproc): os documentos de TODOS os
// processos, e não só do que estiver aberto na tela.
// - eproc: o próprio coletor percorre a Relação de Processos por trás.
// - PJe: o documento só desce depois de aberto no visualizador, então não há
//   atalho: este worker abre cada processo (o endereço dos Autos Digitais vem
//   das coletas do acervo, só os que têm caso no CRM) numa JANELA DE TRABALHO,
//   roda ali a coleta do processo aberto e entrega em lotes de 5. A janela
//   fica normal (não minimizada): o Chrome freia página escondida, e a
//   rolagem da cronologia e os cliques param de andar.
// O que já está no CRM é pulado: só a primeira rodada é longa.
// ══════════════════════════════════════════════════════════════════════════
async function completarPje() {
  const lista = await API.acervoPje();
  if (!lista.length) return { rotulo: 'PJe', ok: 0, falhas: 0, erro: 'nada a completar: nenhum processo do PJe movimentou desde a última rodada (rode antes o ⚖️ PJe para o acervo ficar em dia)' };
  // o worker do MV3 dorme sem atividade: um pulso a cada 20 s o mantém
  const pulso = setInterval(() => chrome.runtime.getPlatformInfo(() => {}), 20000);
  const janela = await chrome.windows.create({ url: lista[0].url, focused: false, state: 'normal', width: 1200, height: 900 });
  const tabId = janela.tabs[0].id;
  const lote = [];
  let feitos = 0, falhas = 0, seguidas = 0, parou = null;
  const entregar = async () => {
    if (!lote.length) return;
    const l = lote.splice(0);
    await API.enviar('pje-processo', { versao: 1, fonte: 'pje-processo', sistema: 'pje', quando: new Date().toISOString(), qtd: l.length, lote: l });
  };
  try {
    for (let i = 0; i < lista.length; i++) {
      const p = lista[i];
      await chrome.storage.local.set({ completar_pje: { i: i + 1, total: lista.length, numero: p.numero, feitos, falhas, em: Date.now() } });
      try {
        if (i > 0) await chrome.tabs.update(tabId, { url: p.url });
        await esperarAba(tabId, 30000);
        await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files: ARQUIVOS.pje });
        const res = await chrome.scripting.executeScript({ target: { tabId },
          func: () => window.crmRodar ? window.crmRodar(null, { completo: true }) : { erro: 'o coletor não subiu' } });
        const r = res && res[0] && res[0].result;
        if (r && r.out) { lote.push(r.out); feitos++; seguidas = 0; }
        else { falhas++; seguidas++; console.warn('[CRM] PJe não completado:', p.numero, r && r.erro); }
        if (lote.length >= 5) await entregar();
      } catch (e) { falhas++; seguidas++; console.warn('[CRM] PJe não completado:', p.numero, e.message); }
      // 5 seguidas é a sessão do PJe vencida (horas de rodada), não azar: insistir
      // nos que faltam só gera falha. Para, e a rodada seguinte pula o que já foi
      if (seguidas >= 5) { parou = `parou no processo ${i + 1} de ${lista.length}: o PJe não abre mais os processos — entre de novo no PJe e clique outra vez (o que já foi guardado é pulado)`; break; }
    }
    await entregar();
  } finally {
    clearInterval(pulso);
    await chrome.storage.local.set({ completar_pje: { i: lista.length, total: lista.length, feitos, falhas, parou, fim: new Date().toISOString() } });
    try { await chrome.windows.remove(janela.id); } catch (e) {}
  }
  return parou ? { rotulo: 'PJe', erro: parou, ok: feitos, falhas } : { rotulo: 'PJe', ok: feitos, falhas };
}
// um host por vez: o completar percorre a relação e baixa peças, e dois
// hosts juntos dobram a carga na mesma sessão do TJSP
async function completarEproc() {
  const feitos = [];
  for (const [aba, rotulo, url] of await alvosPorHost('eproc', 'eproc'))
    feitos.push({ rotulo, ...(await rodarFonte('eproc', { aba, ativar: false, url, extra: { completo: true } })) });
  const erros = feitos.filter(f => f.erro);
  return feitos.length === 1 ? feitos[0]
    : { rotulo: 'eproc', ...(erros.length ? { erro: erros.map(f => `${f.rotulo}: ${f.erro}`).join('; ') } : { ok: feitos.length }) };
}

// 1.23 · PJe E eproc NUM CLIQUE: o acervo e a relação primeiro, para as
// coletas já irem ao 📥 Importar e a conferência começar; depois o completar,
// que escolhe o que baixar pelo último movimento que o acervo acabou de trazer
async function rodarJudicial() {
  const antes = await chrome.storage.local.get(Object.values(CHAVE_ULTIMA));
  return { feitos: await judicialAoMesmoTempo(antes) };
}
chrome.runtime.onMessage.addListener((msg, _remetente, responder) => {
  if (msg.tipo !== 'rodar-judicial') return;
  responderComAviso('PJe e eproc', rodarJudicial, responder);
  return true;
});

chrome.runtime.onMessage.addListener((msg, _remetente, responder) => {
  if (msg.tipo !== 'rodar-completo') return;
  responderComAviso('Completar processos', async () => ({ feitos: await Promise.all([completarEproc(), completarPje()]) }), responder);
  return true;
});

// Conversa com o CRM: acontece AQUI, e não na página do portal. É aqui que
// valem as host_permissions da extensão e é aqui que fica o crachá.
chrome.runtime.onMessage.addListener((msg, _remetente, responder) => {
  if (msg.tipo !== 'crm') return;
  (async () => {
    try {
      if (msg.acao === 'nups')   return responder(await API.nups());
      if (msg.acao === 'diagnostico') return responder(await API.diagnostico());
      if (msg.acao === 'processos-tjsp') return responder(await API.processosTjsp());
      if (msg.acao === 'favoritos-esaj') return responder(await favoritosEsaj());
      if (msg.acao === 'enviar') { await API.enviar(msg.fonte, msg.dados); return responder({ ok: true }); }
      if (msg.acao === 'doc-existe') return responder({ existe: await API.docExiste(msg.caminho) });
      if (msg.acao === 'docs-existentes') return responder(await API.docsExistentes(msg.prefixo));
      if (msg.acao === 'acesso-storage') return responder(await API.acessoStorage());
      if (msg.acao === 'guardar-doc') return responder(await API.guardarDoc(msg.caminho, msg.tipoDoc, msg.b64));
      if (msg.acao === 'entrar') return responder({ quem: await API.entrar(msg.email, msg.senha) });
      if (msg.acao === 'sair')   { await API.sair(); return responder({ ok: true }); }
      if (msg.acao === 'conferir') { await API.cracha(); return responder({ ok: true }); }
      responder({ erro: `não sei fazer "${msg.acao}"` });
    } catch (e) { responder({ erro: String(e.message || e) }); }
  })();
  return true;
});

// OS FAVORITOS DO NAVEGADOR SÃO A LISTA VIVA DO e-SAJ. O Paulo acompanha os
// processos ativos do TJSP pelos favoritos, nas pastas "A a J" e "I a Z"
// (91 links em 05.09.2026, 80 códigos distintos) — e processo novo entra
// quando ele salva o favorito, que já é o hábito. Então a extensão lê essas
// pastas direto (permissão "bookmarks"), em vez de pedir exportação ou
// cadastro de link. Vale toda pasta com nome no padrão "X a Y"; as outras
// ("Processos / Parte 1…3") guardam o acervo antigo, quase todo extinto.
async function favoritosEsaj() {
  const RE_PASTA = /^[a-z]\s+a\s+[a-z]$/i;
  const RE_CNJ = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;
  const fora = [];
  const anda = (no, dentro, caminho) => {
    const pasta = no.title || '';
    const aqui = dentro || (!no.url && RE_PASTA.test(pasta.trim()));
    if (no.url && aqui) {
      const m = no.url.match(/esaj\.tjsp\.jus\.br\/(cpopg|cposg)\/show\.do\?.*?processo\.codigo=([A-Za-z0-9]+)/);
      if (m) fora.push({
        codigo: m[2], grau: m[1] === 'cposg' ? '2º grau' : '1º grau',
        foro: (no.url.match(/processo\.foro=(\d+)/) || [])[1] || null,
        numero: ((no.title || '') + ' ' + no.url).match(RE_CNJ)?.[0] || null,
        titulo: no.title || '', pasta: caminho,
      });
    }
    for (const f of (no.children || [])) anda(f, aqui, caminho ? caminho + ' / ' + pasta : pasta);
  };
  for (const raiz of await chrome.bookmarks.getTree()) anda(raiz, false, '');
  return { favoritos: fora };
}

// Vigia (1.17.0; PJe, eproc e e-Recursos na 1.17.2): enquanto houver aba do portal aberta, toca o portal
// a cada 4 min para a sessão não cair por inatividade. Sem aba, nada — a
// sessão não fica viva à toa. `fetch` do worker, e não injeção na aba, porque
// com host_permissions o Chrome manda os cookies mesmo com a aba descartada
// pelo Economia de memória. shortcut: o PAT vive de token bearer, não só de
// cookie; se o teste mostrar que ele cai mesmo assim, tocar a API de dentro
// da página com o `cracha` que pat-pagina.js já captura.
const VIGIA = {
  pat: 'https://atendimento.inss.gov.br/tarefas',
  esaj: 'https://esaj.tjsp.jus.br/esaj/portal.do',
};
const armarVigia = () => chrome.alarms.create('vigia', { periodInMinutes: 4 });
chrome.runtime.onInstalled.addListener(armarVigia);
chrome.runtime.onStartup.addListener(armarVigia);
chrome.alarms.onAlarm.addListener(async a => {
  if (a.name !== 'vigia') return;
  for (const fonte of Object.keys(VIGIA)) {
    if (!(await chrome.tabs.query({ url: DOMINIOS[fonte] })).length) continue;
    try { await fetch(VIGIA[fonte], { credentials: 'include', cache: 'no-store' }); }
    catch (e) { console.warn('[vigia]', fonte, e.message); }
  }
  // F189 · PJe e eproc: o toque é no ENDEREÇO DA PRÓPRIA ABA (um por host). O
  // eproc encerra a sessão com link sem assinatura (hash), e endereço fixo não
  // tem hash; o da aba aberta tem, e é desta sessão. Durante o "completar
  // processos" o PJe fica de fora: a janela de trabalho já o mantém ativo, e um
  // pedido no meio atropela a conversa do JSF.
  const { completar_pje } = await chrome.storage.local.get(['completar_pje']);
  // rodada que morreu no meio não tem `fim`: só conta como rodando com progresso há menos de 15 min
  const pjeRodando = completar_pje && !completar_pje.fim && Date.now() - (completar_pje.em || 0) < 15 * 60000;
  for (const fonte of ['pje', 'eproc']) {
    if (fonte === 'pje' && pjeRodando) continue;
    const porHost = new Map();
    for (const t of await chrome.tabs.query({ url: DOMINIOS[fonte] }))
      if (t.url && !porHost.has(new URL(t.url).host)) porHost.set(new URL(t.url).host, t.url);
    for (const url of porHost.values()) {
      try { await fetch(url, { credentials: 'include', cache: 'no-store' }); }
      catch (e) { console.warn('[vigia]', fonte, e.message); }
    }
  }
  // e-Recursos: o login é um token na página (ifs_auth), não cookie — o toque
  // sai de dentro da aba, na mesma API da coleta (o crachá cru, como em crps.js).
  // shortcut: se o token vencer por tempo máximo, nenhum toque o renova
  const [crps] = await chrome.tabs.query({ url: DOMINIOS.crps });
  if (crps) {
    try {
      await chrome.scripting.executeScript({ target: { tabId: crps.id }, func: async () => {
        const t = localStorage.getItem('ifs_auth');
        if (t) await fetch('/api/v1/esisrec/', { credentials: 'include', headers: { Authorization: 'Bearer ' + t } });
      } });
    } catch (e) { console.warn('[vigia] crps', e.message); }
  }
});
