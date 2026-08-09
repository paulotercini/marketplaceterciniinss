import * as API from './crm-api.js';

// O botão do popup fala com a aba certa. Nada acontece sem clique.
chrome.runtime.onMessage.addListener((msg, _remetente, responder) => {
  if (msg.tipo !== 'rodar') return;
  (async () => {
    const alvo = msg.fonte === 'pat'
      ? 'https://atendimento.inss.gov.br/tarefas'
      : 'https://consultaprocessos.inss.gov.br/';
    const dominio = new URL(alvo).origin + '/*';
    // reaproveita a aba do portal se ela já estiver aberta: abrir uma
    // segunda faria o portal recomeçar a sessão do zero
    const [aba] = await chrome.tabs.query({ url: dominio });
    const usar = aba || await chrome.tabs.create({ url: alvo, active: true });
    if (aba) await chrome.tabs.update(aba.id, { active: true });
    else await new Promise(r => setTimeout(r, 3500));   // deixa a página carregar
    // O coletor do PAT vive no mundo da página (é o único jeito de escutar o
    // fetch do portal); o do e-Recursos, no mundo isolado. Chamar no mundo
    // errado não acha a função e parece que a página não abriu.
    const mundo = msg.fonte === 'pat' ? 'MAIN' : 'ISOLATED';
    // quem tem acesso ao chrome.storage é este worker: a data da última coleta
    // vai como argumento, já pronta
    const { ultima_pat } = await chrome.storage.local.get(['ultima_pat']);
    try {
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: usar.id },
        world: mundo,
        func: desde => window.crmRodar ? window.crmRodar(desde)
                                       : { erro: 'a página ainda não terminou de abrir — dê F5 e tente de novo' },
        args: [ultima_pat || null],
      });
      responder(res.result || { erro: 'sem resposta da página' });
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
