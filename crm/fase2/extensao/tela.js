// O aviso na própria página do portal, e a pausa entre chamadas.
//
// Este arquivo é injetado nos DOIS mundos (o da extensão e o da página),
// porque o coletor do PAT precisa morar no mundo da página. Cada mundo tem o
// seu `window`, então cada um tem a sua cópia destas funções — o que eles
// compartilham é o DOM, que é justamente o que a faixa usa.

function faixa(texto, cor = '#2B5FC7') {
  let f = document.getElementById('crm-faixa');
  if (!f) {
    f = document.createElement('div');
    f.id = 'crm-faixa';
    f.style.cssText = 'position:fixed;z-index:2147483647;left:50%;transform:translateX(-50%);' +
      'top:14px;padding:10px 18px;border-radius:10px;color:#fff;font:600 14px system-ui;' +
      'box-shadow:0 6px 24px rgba(0,0,0,.3);max-width:80vw;text-align:center';
    // no document_start o body ainda pode não existir
    (document.body || document.documentElement).appendChild(f);
  }
  f.style.background = cor;
  f.textContent = texto;
  return f;
}
const faixaOk  = t => faixa(t, '#1E6F50');
const faixaErr = t => faixa(t, '#B3261E');
const someFaixa = (ms = 12000) => setTimeout(() => {
  const f = document.getElementById('crm-faixa'); if (f) f.remove();
}, ms);

const pausa = ms => new Promise(r => setTimeout(r, ms));
