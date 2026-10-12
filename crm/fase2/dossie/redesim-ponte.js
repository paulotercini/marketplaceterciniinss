// DOSSIÊ · a ponte do redesim.js (mundo da página) com a extensão: recebe a
// lista de CNPJs (.txt) e o PDF da consulta e grava na pasta do cliente +
// resumo no CRM. O PDF vem por último (a extensão clica em "Gerar PDF" quando
// a lista aparece), por isso é ele que fecha a rodada e manda o resumo.
(() => {
  if (window !== window.top || window.__dossieRedesimPonte) return;
  window.__dossieRedesimPonte = true;
  const D = window.DOSSIE;
  let cliente = null, nLista = null;
  const baixados = [], falhas = [], inexistentes = [];
  async function quem(cpf, nome) {
    if (cliente) return cliente;
    const st = await chrome.storage.local.get(['cliente']);
    cliente = (cpf && st.cliente && st.cliente.cpf === cpf) ? st.cliente : (cpf ? { cpf, nome } : st.cliente || null);
    return cliente;
  }
  window.addEventListener('message', async ev => {
    if (ev.source !== window || !ev.data) return;
    if (ev.data.dossieRedesim) {
      const { cpf, nome, lista, texto } = ev.data.dossieRedesim;
      const c = await quem(cpf, nome);
      nLista = lista.length;
      try {
        await D.salvar(c, 'CNPJ', 'CNPJs vinculados ao CPF (Redesim)', new TextEncoder().encode(texto), 'text/plain');
        baixados.push(`CNPJs vinculados — lista (${lista.length})`);
        if (!lista.length) inexistentes.push('CNPJ: nenhum CNPJ vinculado ao CPF');
      } catch (e) { falhas.push(`CNPJ (lista): ${e.message || e}`); }
      D.faixa(`${lista.length} CNPJ(s) na lista — gerando o PDF da consulta…`);
    }
    if (ev.data.dossieRedesimPdf) {
      const c = await quem();
      if (!c) { D.faixa('não sei de quem é este CNPJ: rode antes o dossiê no Meu INSS do cliente', '#B3261E'); return; }
      try {
        await D.salvar(c, 'CNPJ', 'CNPJs vinculados ao CPF (Redesim)', new Uint8Array(ev.data.dossieRedesimPdf.buf));
        baixados.push('CNPJs vinculados — PDF da consulta');
      } catch (e) { falhas.push(`CNPJ (PDF): ${e.message || e}`); }
      const avisoCrm = await D.resumo(c, 'redesim', { baixados, inexistentes, falhas });
      D.faixa(`${nLista == null ? '' : nLista + ' CNPJ(s) vinculado(s) ao CPF — '}lista e PDF gravados em CNPJ\\`
        + (falhas.length ? `\n${falhas.length} falharam:\n• ${falhas.join('\n• ')}` : '') + avisoCrm,
        falhas.length ? '#9A6700' : '#1E6F50');
    }
  });
})();
