// A PONTE ENTRE O COLETOR DO PAT E A EXTENSÃO.
//
// O coletor (pat.js) roda no MUNDO DA PÁGINA, e não no mundo isolado da
// extensão. Não é capricho: ele precisa escutar o `fetch`/`XMLHttpRequest` do
// próprio portal, e cada mundo tem o seu `window`. O gancho instalado no mundo
// isolado nunca via a lista — clicava-se em "Buscar", o portal respondia, e a
// extensão não reagia a nada. Foi exatamente o que aconteceu.
//
// Só que o mundo da página não tem `chrome.storage` nem como falar com o CRM.
// Daí esta ponte: ela vive no mundo isolado, ouve o que o coletor anuncia por
// postMessage e faz a parte que exige a extensão.

window.addEventListener('message', async ev => {
  const m = ev.data;
  if (ev.source !== window || !m || m.de !== 'crm-pat') return;

  if (m.tipo === 'entregar') {
    try {
      await CRM.enviar('pat', m.dados);
      await chrome.storage.local.set({ ultima_pat: m.quando });
      window.postMessage({ de: 'crm-ponte', tipo: 'entregue', quantos: m.quantos }, '*');
    } catch (e) {
      window.postMessage({ de: 'crm-ponte', tipo: 'falhou', erro: String(e.message || e) }, '*');
    }
  }
});
