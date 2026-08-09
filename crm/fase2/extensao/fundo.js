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
    try {
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: usar.id },
        func: fonte => window.crmRodar ? window.crmRodar(fonte)
                                       : { erro: 'a página ainda não terminou de abrir' },
        args: [msg.fonte],
      });
      responder(res.result || { erro: 'sem resposta da página' });
    } catch (e) { responder({ erro: String(e.message || e) }); }
  })();
  return true;                       // resposta assíncrona
});
