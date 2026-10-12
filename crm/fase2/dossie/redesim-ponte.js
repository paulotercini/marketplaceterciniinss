// DOSSIÊ · a ponte do redesim.js (mundo da página) com a extensão: recebe a
// lista de CNPJs e grava como .txt na pasta do cliente + resumo no CRM.
(() => {
  if (window !== window.top || window.__dossieRedesimPonte) return;
  window.__dossieRedesimPonte = true;
  const D = window.DOSSIE;
  window.addEventListener('message', async ev => {
    if (ev.source !== window || !ev.data || !ev.data.dossieRedesim) return;
    const { cpf, nome, lista, texto } = ev.data.dossieRedesim;
    const st = await chrome.storage.local.get(['cliente']);
    const cliente = st.cliente && st.cliente.cpf === cpf ? st.cliente : { cpf, nome };
    const falhas = [], inexistentes = [], baixados = [];
    try {
      await D.salvar(cliente, 'CNPJ', 'CNPJs vinculados ao CPF (Redesim)', new TextEncoder().encode(texto), 'text/plain');
      baixados.push(`CNPJs vinculados (${lista.length})`);
      if (!lista.length) inexistentes.push('CNPJ: nenhum CNPJ vinculado ao CPF');
    } catch (e) { falhas.push(`CNPJ: ${e.message || e}`); }
    const avisoCrm = await D.resumo(cliente, 'redesim', { baixados, inexistentes, falhas });
    D.faixa(`${lista.length} CNPJ(s) vinculado(s) ao CPF — lista gravada em CNPJ\\`
      + (falhas.length ? `\n${falhas.length} falharam:\n• ${falhas.join('\n• ')}` : '') + avisoCrm,
      falhas.length ? '#9A6700' : '#1E6F50');
  });
})();
