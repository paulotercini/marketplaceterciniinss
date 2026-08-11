import * as API from './crm-api.js';

// O botão do popup fala com a aba certa. Nada acontece sem clique.
chrome.runtime.onMessage.addListener((msg, _remetente, responder) => {
  if (msg.tipo !== 'rodar') return;
  (async () => {
    const alvo = msg.fonte === 'pat'
      ? 'https://atendimento.inss.gov.br/tarefas'
      : msg.fonte === 'pje'
        ? 'https://pje1g.trf3.jus.br/pje/Painel/painel_usuario/advogado.seam'
        : 'https://consultaprocessos.inss.gov.br/';
    // o PJe tem dois graus em dois domínios: usa a aba de PJe que estiver
    // aberta (1º ou 2º), qualquer uma — o coletor descobre o grau pelo host.
    // Rode uma vez com cada grau aberto para cobrir os dois.
    const dominios = msg.fonte === 'pje'
      ? ['https://pje1g.trf3.jus.br/*', 'https://pje2g.trf3.jus.br/*']
      : [new URL(alvo).origin + '/*'];
    // reaproveita a aba do portal se ela já estiver aberta: abrir uma
    // segunda faria o portal recomeçar a sessão do zero
    const [aba] = await chrome.tabs.query({ url: dominios });
    const usar = aba || await chrome.tabs.create({ url: alvo, active: true });
    if (aba) await chrome.tabs.update(aba.id, { active: true });
    else await new Promise(r => setTimeout(r, 3500));   // deixa a página carregar
    // quem tem acesso ao chrome.storage é este worker: a data da última coleta
    // vai como argumento, já pronta
    const { ultima_pat } = await chrome.storage.local.get(['ultima_pat']);
    // REINJETA antes de chamar. O carregamento automático do script na página
    // depende do navegador — e num deles simplesmente não aconteceu, sem erro
    // nenhum. Injetar aqui usa a permissão de domínio da extensão e não
    // depende disso. Os arquivos têm guarda de "já rodei": repetir é inócuo.
    const arquivos = msg.fonte === 'pat'
      ? ['tela.js', 'comum.js', 'ponte-pat.js']
      : msg.fonte === 'pje'
        ? ['tela.js', 'comum.js', 'pje-regras.js', 'pje.js']
        : ['tela.js', 'comum.js', 'crps.js'];
    try {
      await chrome.scripting.executeScript(
        { target: { tabId: usar.id, allFrames: true }, files: arquivos });
    } catch (e) { console.warn('[CRM] reinjeção falhou:', e.message); }
    try {
      // allFrames porque o portal virou micro-frontend: a tela de tarefas pode
      // estar num quadro interno, e chamar só o de cima acharia a página vazia
      const res = await chrome.scripting.executeScript({
        target: { tabId: usar.id, allFrames: true },
        func: desde => window.crmRodar ? window.crmRodar(desde)
                                       : { erro: 'a página ainda não terminou de abrir — dê F5 e tente de novo' },
        args: [ultima_pat || null],
      });
      const bons = res.map(r => r && r.result).filter(r => r && !r.erro);
      responder(bons[0] || (res[0] && res[0].result) || { erro: 'sem resposta da página' });
    } catch (e) { responder({ erro: String(e.message || e) }); }
  })();
  return true;                       // resposta assíncrona
});

// Conversa com o CRM: acontece AQUI, e não na página do portal. É aqui que
// valem as host_permissions da extensão e é aqui que fica o crachá.
chrome.runtime.onMessage.addListener((msg, _remetente, responder) => {
  if (msg.tipo !== 'crm') return;
  (async () => {
    try {
      if (msg.acao === 'nups')   return responder(await API.nups());
      if (msg.acao === 'diagnostico') return responder(await API.diagnostico());
      if (msg.acao === 'enviar') { await API.enviar(msg.fonte, msg.dados); return responder({ ok: true }); }
      if (msg.acao === 'entrar') return responder({ quem: await API.entrar(msg.email, msg.senha) });
      if (msg.acao === 'sair')   { await API.sair(); return responder({ ok: true }); }
      if (msg.acao === 'conferir') { await API.cracha(); return responder({ ok: true }); }
      responder({ erro: `não sei fazer "${msg.acao}"` });
    } catch (e) { responder({ erro: String(e.message || e) }); }
  })();
  return true;
});
