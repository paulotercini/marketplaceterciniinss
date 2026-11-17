// O aviso na própria página do portal, e a pausa entre chamadas.
//
// Tudo aqui é pendurado no `window` com guarda de "já existe". Este arquivo
// pode ser injetado DUAS vezes na mesma página — uma pelo carregamento
// automático, outra pelo botão, que reinjeta por garantia — e um `const`
// declarado de novo derruba o arquivo inteiro com "Identifier has already
// been declared". A guarda é o que torna a reinjeção inofensiva.

window.faixa = window.faixa || function (texto, cor = '#2B5FC7') {
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
};
window.faixaOk  = window.faixaOk  || (t => faixa(t, '#1E6F50'));
window.faixaErr = window.faixaErr || (t => faixa(t, '#B3261E'));
window.someFaixa = window.someFaixa || ((ms = 12000) => setTimeout(() => {
  const f = document.getElementById('crm-faixa'); if (f) f.remove();
}, ms));
// F621 · aba em segundo plano há mais de 5 min: o Chrome acorda os timers da
// página 1 vez por minuto, e a pausa de 700 ms virava 60 s. O relógio do fundo
// (service worker) não sofre esse freio; vale o que acordar primeiro. A duração não muda.
window.pausa = window.pausa || (ms => new Promise(r => {
  let feito = false; const fim = () => { if (!feito) { feito = true; r(); } };
  setTimeout(fim, ms);
  try { chrome.runtime.sendMessage({ tipo: 'dormir', ms }, () => { void chrome.runtime.lastError; fim(); }); } catch (_) {}
}));
