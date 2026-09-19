import * as API from './crm-api.js';

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
  pat: ['tela.js', 'comum.js', 'ponte-pat.js'],
  crps: ['tela.js', 'comum.js', 'crps.js'],
  pje: ['tela.js', 'comum.js', 'pje-regras.js', 'pje.js'],
  eproc: ['tela.js', 'comum.js', 'eproc-regras.js', 'eproc.js'],
  esaj: ['tela.js', 'comum.js', 'esaj-regras.js', 'esaj.js'],
};
const casa = (url, dominios) => dominios.some(d =>
  new RegExp('^' + d.replace(/[.]/g, '\\.').replace(/\*/g, '.*')).test(url || ''));
const pausa = ms => new Promise(r => setTimeout(r, ms));

// UMA fonte, numa aba: reaproveita a aba do portal se ela já estiver aberta
// (abrir uma segunda faria o portal recomeçar a sessão do zero). Com
// `ativar`, a aba ATIVA vem primeiro — no PJe, com um processo aberto na
// frente, o clique coleta o histórico completo DELE — e a aba vem para a
// frente. Sem `ativar` (o "atualizar tudo"), roda em segundo plano.
async function rodarFonte(fonte, { aba = null, ativar = true } = {}) {
  const dominios = DOMINIOS[fonte];
  if (!aba && ativar) {
    const [ativa] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (ativa && casa(ativa.url, dominios)) aba = ativa;
  }
  if (!aba) [aba] = await chrome.tabs.query({ url: dominios });
  const usar = aba || await chrome.tabs.create({ url: ALVO[fonte], active: ativar });
  if (aba) { if (ativar) await chrome.tabs.update(aba.id, { active: true }); }
  else await pausa(3500);                              // deixa a página carregar
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
      args: [ultima_pat || null, { acervo: !ativar }],
    });
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
async function rodarTudo() {
  const antes = await chrome.storage.local.get(Object.values(CHAVE_ULTIMA));
  const pat = await rodarFonte('pat', { ativar: true });   // prepara a tela e devolve na hora
  const tarefas = [];
  const roda = (fonte, aba, rotulo) => tarefas.push((async () => {
    let r = await rodarFonte(fonte, { aba, ativar: false });
    if (r && r.erro === 'retomando') r = await esperarConclusao(fonte, antes[CHAVE_ULTIMA[fonte]]);
    return { rotulo, ...r };
  })());
  roda('crps', null, 'e-Recursos');
  roda('esaj', null, 'e-SAJ');
  // PJe e eproc: uma rodada por aba aberta (1º e 2º grau; os hosts do eproc);
  // sem aba nenhuma, abre a do 1º grau
  for (const fonte of ['pje', 'eproc']) {
    const abas = await chrome.tabs.query({ url: DOMINIOS[fonte] });
    const porHost = new Map();
    for (const a of abas) { const h = new URL(a.url).host; if (!porHost.has(h)) porHost.set(h, a); }
    if (!porHost.size) roda(fonte, null, fonte === 'pje' ? 'PJe' : 'eproc');
    for (const [h, a] of porHost) roda(fonte, a, `${fonte === 'pje' ? 'PJe' : 'eproc'} ${h.split('.')[0]}`);
  }
  const feitos = await Promise.all(tarefas);
  return { feitos, pat };
}
chrome.runtime.onMessage.addListener((msg, _remetente, responder) => {
  if (msg.tipo !== 'rodar-tudo') return;
  rodarTudo().then(responder, e => responder({ erro: String(e.message || e) }));
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
