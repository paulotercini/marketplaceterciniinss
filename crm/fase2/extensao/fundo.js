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
async function rodarFonte(fonte, { aba = null, ativar = true, extra = null, url = null, ctx = null } = {}) {
  const dominios = DOMINIOS[fonte];
  if (!aba && ativar && !url) {
    const [ativa] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (ativa && casa(ativa.url, dominios)) aba = ativa;
  }
  // `url`: abrir ESTE host, e não aproveitar a aba de outro host do mesmo portal
  if (!aba && !url) aba = abaPreferida(await chrome.tabs.query({ url: dominios }));
  const usar = aba || await chrome.tabs.create({ url: url || ALVO[fonte], active: ativar });
  if (ctx) ctx.tabId = usar.id;                        // quem espera o "retomando" precisa saber a aba
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
  rodarFonte(msg.fonte, msg.extra ? { extra: msg.extra } : {}).then(responder);
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
// as chaves que só avançam com a rodada INTEIRA daquele host: `ultima_pje`
// muda já na entrega parcial e é a mesma para o 1º e o 2º grau, e a espera
// de um grau terminava pelo carimbo do outro (`fim_pje_<host>` é opcional)
export const chavesDoHost = (fonte, host) =>
  fonte === 'pje' ? ['ultima_pje_' + (/pje2g/.test(host) ? '2g' : '1g'), 'fim_pje_' + host]
  : fonte === 'eproc' ? ['ultima_eproc_' + host] : [CHAVE_ULTIMA[fonte]];
// espera por CONDIÇÃO, e o teto só como rede: a retomada que desiste no portal
// (aba fechada, sessão caída, faixa vermelha) segurava a rodada por 15 min.
// A faixa verde também encerra: o eproc sem processos termina sem gravar data.
// shortcut: lê a cor da faixa da página; se tela.js mudar as cores, acompanhar
export async function esperarConclusao(chaves, antes, tabId = null, tetoMs = 15 * 60000, passo = 5000) {
  for (let t = 0; t < tetoMs; t += passo) {
    await pausa(passo);
    const st = await chrome.storage.local.get(chaves);
    if (chaves.some(k => st[k] && st[k] !== antes[k])) return { ok: 'retomado' };
    if (tabId == null) continue;
    let aba;
    try { aba = await chrome.tabs.get(tabId); } catch (e) { return { erro: 'a aba foi fechada no meio da coleta' }; }
    if (sessaoCaida(aba.url)) return { erro: 'a sessão caiu no meio da coleta — entre de novo no portal e clique outra vez' };
    try {
      const [r] = await chrome.scripting.executeScript({ target: { tabId }, func: () => {
        const f = document.getElementById('crm-faixa');
        return f && { cor: f.style.background, texto: f.textContent };
      } });
      const f = r && r.result;
      if (f && /179, 38, 30|B3261E/i.test(f.cor)) return { erro: f.texto };
      if (f && /30, 111, 80|1E6F50/i.test(f.cor)) return { ok: 'retomado' };
    } catch (e) {}                                     // página no meio da recarga: tenta de novo no passo seguinte
  }
  return { erro: 'não terminou no tempo — veja a faixa na aba' };
}
// cada fonte roda em segundo plano na sua aba; o que responde "retomando"
// termina quando a data da última coleta DAQUELE host muda no storage.
// `antes` ficou só pela assinatura: a data é lida aqui, na hora da chamada
const rodadorDeFundo = (tarefas, antes) => (fonte, aba, rotulo, url) => tarefas.push((async () => {
  const host = new URL((aba && aba.url) || url || ALVO[fonte]).host;
  const chaves = chavesDoHost(fonte, host);
  const lido = await chrome.storage.local.get(chaves);
  // a vigia não toca o painel do PJe enquanto o acervo deste host é lido
  const marca = fonte === 'pje' ? 'acervo_pje_' + host : null;
  if (marca) await chrome.storage.local.set({ [marca]: Date.now() });
  const ctx = {};
  try {
    let r = await rodarFonte(fonte, { aba, ativar: false, url, ctx });
    // PJe: a entrega parcial ainda vai recarregar e retomar (ou desistiu, e a faixa vermelha diz)
    if (r && (r.erro === 'retomando' || r.emCurso || (fonte === 'pje' && r.parcial))) r = await esperarConclusao(chaves, lido, ctx.tabId);
    return { rotulo, ...r };
  } finally { if (marca) await chrome.storage.local.remove(marca); }
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
  // o PAT não segura a largada das outras: a aba dele carrega enquanto elas já rodam
  const patP = rodarFonte('pat', { ativar: true }).catch(e => ({ erro: String(e.message || e) }));
  const tarefas = [];
  const roda = rodadorDeFundo(tarefas, antes);
  roda('crps', null, 'e-Recursos');
  roda('esaj', null, 'e-SAJ');
  tarefas.push(judicialAoMesmoTempo(antes));
  return { feitos: (await Promise.all(tarefas)).flat(), pat: await patP };
}

// 1.25 · CONFERÊNCIA DAS SESSÕES antes de rodar. Só as abas abertas: a aba
// que falta é aberta pela rodada, e sem ela não há o que tocar. PJe, eproc e
// e-SAJ são tocados no endereço da própria aba, como a vigia já faz a cada
// 4 min (o eproc derruba a sessão com endereço sem assinatura); o PAT vive de
// token, então vale o endereço da aba; o e-Recursos, o token da página.
const NOME = { pat: 'INSS (PAT)', crps: 'e-Recursos', pje: 'PJe', eproc: 'eproc', esaj: 'e-SAJ' };
async function sessoesCaidas() {
  const alvos = [];
  for (const fonte of Object.keys(DOMINIOS)) {
    const vistos = new Set();
    for (const aba of await chrome.tabs.query({ url: DOMINIOS[fonte] })) {
      const host = new URL(aba.url).host;
      if (vistos.has(host)) continue;
      vistos.add(host);
      alvos.push([fonte, host, aba]);
    }
  }
  // todas juntas e com tempo limite (15 s, o Painel do PJe é lento): uma aba
  // sem resposta travava o início da rodada. Tempo esgotado conta como não caída
  const caidas = await Promise.all(alvos.map(async ([fonte, host, aba]) => {
    let caiu = sessaoCaida(aba.url);
    try {
      if (!caiu && fonte === 'crps') {
        // o token pode existir e já não valer: só 401/403 da API diz que caiu
        const [r] = await chrome.scripting.executeScript({ target: { tabId: aba.id }, func: async () => {
          const t = localStorage.getItem('ifs_auth');
          if (!t) return true;
          try {
            const r = await fetch('/api/v1/esisrec/', { credentials: 'include',
              headers: { Authorization: 'Bearer ' + t }, signal: AbortSignal.timeout(15000) });
            return r.status === 401 || r.status === 403;
          } catch (e) { return false; }
        } });
        caiu = !!(r && r.result);
      } else if (!caiu && ['pje', 'eproc', 'esaj'].includes(fonte)) {
        const r = await fetch(aba.url, { credentials: 'include', cache: 'no-store', signal: AbortSignal.timeout(15000) });
        caiu = sessaoCaida(r.url, await r.text());
      }
    } catch (e) { console.warn('[sessões]', fonte, e.message); }
    return caiu && { rotulo: `${NOME[fonte]} ${host.split('.')[0]}`, tabId: aba.id, windowId: aba.windowId };
  }));
  return { caidas: caidas.filter(Boolean) };
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
  const erros = feitos.filter(f => f.erro || f.falhas || f.parcial).length;   // F590 · a rodada parcial não é "concluído"
  const linhas = r && r.erro ? [r.erro]
    : feitos.map(f => `${f.rotulo}: ${f.erro ? '⚠ ' + f.erro : f.falhas || f.parcial ? `⚠ parcial${f.falhas ? ` (${f.falhas} falharam)` : ''}` : '✔'}`);
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
// uma rodada por vez: o segundo clique punha duas coletas nas mesmas abas.
// Fica na memória do worker, que o pulso mantém vivo durante a rodada
let rodadaEmCurso = null;
const responderComAviso = (titulo, f, responder) => {
  if (rodadaEmCurso) return responder({ erro: `já há uma rodada em andamento (${rodadaEmCurso}) — espere o aviso do fim` });
  rodadaEmCurso = titulo;
  return comPulso(f).then(
    r => responder(avisarFim(titulo, r)),
    e => responder(avisarFim(titulo, { erro: String(e.message || e) })))
    .finally(() => { rodadaEmCurso = null; });
};
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
  const lote = [], doLote = [], falhos = [];
  let feitos = 0, falhas = 0, seguidas = 0, leu = 0, parou = null;
  // o lote só sai da fila DEPOIS de entregue (a falha no envio perdia 5
  // cronologias), e a tentativa só é gasta em processo lido e entregue
  // Sempre em pedaços de 5: o lote acumulado depois de uma queda do CRM não
  // estoura o tamanho do pedido. A recusa (4xx) não melhora com repetição:
  // o pedaço sai da fila como falha, senão travava todas as entregas seguintes;
  // só a falha de rede ou 5xx mantém o lote.
  const entregar = async tudo => {
    while (lote.length >= (tudo ? 1 : 5)) {
      const l = lote.slice(0, 5);
      try {
        await API.enviar('pje-processo', { versao: 1, fonte: 'pje-processo', sistema: 'pje', quando: new Date().toISOString(), qtd: l.length, lote: l });
      } catch (e) {
        if (!/o CRM recusou \(4(?!01|03)/.test(e.message || '')) throw e;   // F590 · login vencido do CRM mantém o lote
        lote.splice(0, l.length); falhos.push(...doLote.splice(0, l.length));
        feitos -= l.length; falhas += l.length;
        console.warn('[CRM] lote recusado pelo CRM, fora da fila:', e.message);
        continue;
      }
      lote.splice(0, l.length);
      await API.gastarTentativas(doLote.splice(0, l.length));
    }
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
          func: curto => window.crmRodar ? window.crmRodar(null, { completo: true, curto }) : { erro: 'o coletor não subiu' },
          args: [!!p.curto] });
        const r = res && res[0] && res[0].result;
        if (r && r.out) { lote.push(r.out); doLote.push(p); feitos++; leu++; seguidas = 0; }
        else { falhas++; seguidas++; falhos.push(p); console.warn('[CRM] PJe não completado:', p.numero, r && r.erro); }
      } catch (e) { falhas++; seguidas++; falhos.push(p); console.warn('[CRM] PJe não completado:', p.numero, e.message); }
      // falha na entrega não é o PJe caído: o lote fica e vai junto na próxima
      if (lote.length >= 5) try { await entregar(); } catch (e) { console.warn('[CRM] entrega adiada:', e.message); }
      // F590 · as 5 seguidas saem da conta de falhas: são a sessão caída, não o processo
      // 5 seguidas é a sessão do PJe vencida (horas de rodada), não azar: insistir
      // nos que faltam só gera falha. Para, e a rodada seguinte pula o que já foi
      if (seguidas >= 5) { falhos.splice(-5); parou = `parou no processo ${i + 1} de ${lista.length}: o PJe não abre mais os processos — entre de novo no PJe e clique outra vez (o que já foi guardado é pulado)`; break; }
    }
    try { await entregar(true); }
    catch (e) {
      feitos -= lote.length;
      parou = `${parou ? parou + '; ' : ''}${lote.length} processo(s) lidos não chegaram ao CRM (${e.message || e}) — clique de novo`;
    }
    // F590 · a falha também conta, senão o processo que não abre voltava para sempre; rodada sem nenhum lido é o PJe fora do ar, e não conta
    if (leu) await API.gastarTentativas(falhos.map(p => ({ pend: [p.falha] }))).catch(() => {});
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
  for (const [aba, rotulo, url] of await alvosPorHost('eproc', 'eproc')) {
    // "retomando" não é erro: espera este host acabar antes do seguinte. A
    // data é lida logo antes de cada host (um por vez, a chave única serve)
    const antes = await chrome.storage.local.get(['ultima_eproc_completo']);
    const ctx = {};
    let r = await rodarFonte('eproc', { aba, ativar: false, url, extra: { completo: true }, ctx });
    if (r && (r.erro === 'retomando' || r.emCurso)) r = await esperarConclusao(['ultima_eproc_completo'], antes, ctx.tabId);
    feitos.push({ rotulo, ...r });
  }
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
    for (const [host, url] of porHost) {
      // o acervo do PJe deste host está sendo lido: o toque atropelava a conversa
      // do JSF. Marca de mais de 15 min é de rodada que morreu no meio
      const marca = 'acervo_pje_' + host;
      if (fonte === 'pje' && Date.now() - ((await chrome.storage.local.get([marca]))[marca] || 0) < 15 * 60000) continue;
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
