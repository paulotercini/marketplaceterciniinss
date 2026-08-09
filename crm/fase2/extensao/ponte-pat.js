// A PONTE DO PAT — roda no mundo da extensão e dá as duas mãos.
//
// De um lado, injeta o coletor dentro da página (só lá ele enxerga o
// fetch/XHR do portal). Do outro, faz o que a página não pode: falar com o
// CRM, guardar a data da última coleta, desenhar a faixa.
//
// A injeção é por tag <script>, do jeito antigo. Declarar o coletor no
// manifesto com "world": "MAIN" seria mais direto, mas exige um Chrome
// recente — e um Chrome que não conhece essa chave recusa o manifesto
// INTEIRO. A extensão não carrega, e não sobra uma linha no console para
// explicar. Aconteceu; não repito.

console.log('%c[CRM]', 'color:#2B5FC7;font-weight:700',
            'extensão no ar nesta página (ponte do PAT).');

let coletorNoAr = false;

(function injetar() {
  const s = document.createElement('script');
  s.src = chrome.runtime.getURL('pat-pagina.js');
  s.onload = () => s.remove();
  s.onerror = () => faixaErr('não consegui injetar o coletor nesta página');
  (document.head || document.documentElement).appendChild(s);
})();

// Se o coletor não se anunciar, quem avisa é a ponte. Sem isto, o portal
// bloqueando o script seria mais um silêncio — e silêncio já custou caro
// demais nesta história.
setTimeout(() => {
  if (coletorNoAr) return;
  console.warn('[CRM] o coletor não subiu: o portal bloqueou o script injetado.');
  faixaErr('o portal bloqueou o coletor da extensão nesta página');
}, 3000);

window.addEventListener('message', async ev => {
  const m = ev.data;
  if (ev.source !== window || !m || m.de !== 'crm-pat') return;

  if (m.tipo === 'oi') {
    coletorNoAr = true;
    console.log('%c[CRM]', 'color:#2B5FC7;font-weight:700', 'coletor confirmado dentro da página.');
  }
  if (m.tipo === 'faixa') { faixa(m.texto, m.cor); if (/✔/.test(m.texto)) someFaixa(); }
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

// o botão do popup chama isto. A resposta do coletor volta por recado, então
// a espera é curta e com prazo: melhor dizer "não respondeu" do que travar.
window.crmRodar = async (desde) => {
  if (!coletorNoAr) return { erro: 'o coletor não subiu nesta página — dê F5 e tente de novo' };
  const resposta = new Promise(resolve => {
    const ouvir = ev => {
      if (ev.source !== window || !ev.data || ev.data.de !== 'crm-pat') return;
      if (ev.data.tipo !== 'pronto') return;
      window.removeEventListener('message', ouvir);
      resolve({ esperando: ev.data.esperando, jaTinha: ev.data.jaTinha });
    };
    window.addEventListener('message', ouvir);
    setTimeout(() => { window.removeEventListener('message', ouvir);
                       resolve({ erro: 'o coletor não respondeu' }); }, 4000);
  });
  window.postMessage({ de: 'crm-ponte', tipo: 'rodar', desde }, '*');
  return resposta;
};
