// DOSSIÊ · o que os dois coletores (Meu INSS e e-Recursos) usam na página:
// a faixa de progresso, a pausa entre chamadas e a entrega de cada PDF ao
// service worker, que grava na pasta e no CRM.
//
// Injetado a cada clique: tudo com guarda no `window`.
window.DOSSIE = window.DOSSIE || {
  pausa: ms => new Promise(r => setTimeout(r, ms)),

  faixa(texto, cor) {
    let el = document.getElementById('dossie-faixa');
    if (!el) {
      el = document.createElement('div');
      el.id = 'dossie-faixa';
      el.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483647;padding:12px 16px;'
        + 'border-radius:10px;font:600 14px system-ui;color:#fff;box-shadow:0 4px 16px rgba(0,0,0,.25);white-space:pre-line';
      document.body.appendChild(el);
    }
    el.style.background = cor || '#2B5FC7';
    // a faixa final fica na tela de propósito (é a prova de que rodou): diz que acabou
    const fim = cor === '#1E6F50' ? '✔ CONCLUÍDO · ' : cor === '#9A6700' ? '✔ CONCLUÍDO COM RESSALVAS · ' : '';
    el.textContent = '📂 Dossiê · ' + fim + texto;
  },

  // no fim da rodada: o resumo do portal vai para clientes.dossie no CRM;
  // devolve o aviso a pôr na faixa quando não gravou (sem login, cliente fora do CRM)
  async resumo(cliente, portal, { baixados, inexistentes, falhas, cadastro, familia, familias }) {
    const r = await chrome.runtime.sendMessage({ tipo: 'resumo', cpf: cliente.cpf, portal, baixados, inexistentes, falhas,
      cadastro: cadastro || undefined, familia: familia || undefined, familias: familias || undefined });
    return r && r.crm && r.crm !== 'ok' ? `\n(resumo no CRM: ${r.crm})` : '';
  },

  // um PDF por vez: o SW grava na pasta do cliente e no CRM
  // `mime` text/plain grava .txt (o CRM lê texto direto, sem OCR): é como o
  // seguro-desemprego, que o portal só dá em JSON, chega legível à ficha
  async salvar(cliente, fonte, arquivo, u8, mime = 'application/pdf') {
    const R = window.DOSSIE_REGRAS;
    const ext = mime === 'text/plain' ? '.txt' : '.pdf';
    const r = await chrome.runtime.sendMessage({ tipo: 'salvar', cpf: cliente.cpf, nome: cliente.nome, mime,
      fonte, arquivo: R.nomeSeguro(arquivo).replace(/(\.pdf|\.txt)?$/i, '') + ext, b64: R.b64(u8) });
    if (!r || r.erro) throw new Error((r && r.erro) || 'a extensão não respondeu — recarregue a página (F5)');
    return r;
  },
};
