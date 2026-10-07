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
    el.textContent = '📂 Dossiê · ' + texto;
  },

  // um PDF por vez: o SW grava em Downloads/Dossie/<Nome CPF>/<fonte>/ e no CRM
  async salvar(cliente, fonte, arquivo, u8) {
    const R = window.DOSSIE_REGRAS;
    const r = await chrome.runtime.sendMessage({ tipo: 'salvar', cpf: cliente.cpf, nome: cliente.nome,
      fonte, arquivo: R.nomeSeguro(arquivo).replace(/(\.pdf)?$/i, '.pdf'), b64: R.b64(u8) });
    if (!r || r.erro) throw new Error((r && r.erro) || 'a extensão não respondeu — recarregue a página (F5)');
    return r;
  },
};
