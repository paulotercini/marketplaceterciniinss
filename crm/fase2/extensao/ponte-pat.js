// A PONTE DO PAT — roda no lado da extensão e dá as duas mãos.
//
// De um lado, injeta o coletor dentro da página (só lá ele enxerga o
// fetch/XHR do portal). Do outro, faz o que a página não pode: falar com o
// CRM, guardar a data da última coleta, desenhar a faixa.
//
// A injeção do coletor é por tag <script>, do jeito antigo: declarar o
// coletor no manifesto com "world": "MAIN" seria mais direto, mas um
// navegador que não conhece essa chave recusa o manifesto INTEIRO — e a
// extensão não carrega, sem uma linha no console para explicar.
//
// Este arquivo é reinjetado a cada clique no botão, então tudo tem guarda de
// "já rodei". É de propósito: assim o botão funciona mesmo quando o
// carregamento automático do script não acontece, seja qual for o motivo.

if (!window.__crmPontePat) {
  window.__crmPontePat = true;

  console.log('%c[CRM]', 'color:#2B5FC7;font-weight:700',
              'extensão no ar nesta página (ponte do PAT).');

  const s = document.createElement('script');
  s.src = chrome.runtime.getURL('pat-pagina.js');
  s.onload = () => s.remove();
  s.onerror = () => faixaErr('não consegui injetar o coletor nesta página');
  (document.head || document.documentElement).appendChild(s);

  window.addEventListener('message', async ev => {
    const m = ev.data;
    if (ev.source !== window || !m || m.de !== 'crm-pat') return;

    if (m.tipo === 'oi') {
      window.__crmColetorNoAr = true;
      console.log('%c[CRM]', 'color:#2B5FC7;font-weight:700', 'coletor confirmado dentro da página.');
    }
    if (m.tipo === 'faixa') { faixa(m.texto, m.cor); if (/✔/.test(m.texto)) someFaixa(); }
    if (m.tipo === 'entregar') {
      try {
        await guardarAnexosPat(m.dados.detalhes || [], m.cracha);
        await CRM.enviar('pat', m.dados);
        await chrome.storage.local.set({ ultima_pat: m.quando });
        window.postMessage({ de: 'crm-ponte', tipo: 'entregue', quantos: m.quantos }, '*');
      } catch (e) {
        window.postMessage({ de: 'crm-ponte', tipo: 'falhou', erro: String(e.message || e) }, '*');
      }
    }
  });
}

// F184 · TODOS OS ANEXOS DO REQUERIMENTO vão para o bucket privado (decisão do
// Paulo, 05.10.2026 — inclusive laudo médico: no CRM eles continuam internos,
// nunca atravessam para o portal do cliente). O portal devolve o arquivo em
// BASE64 no corpo (medido ao vivo: "JVBE…" = "%PDF"), por
//   GET /apis/arquivosPortalApi/tarefa/{protocolo}/anexo/{id}
// com o mesmo crachá da lista. Três segundos entre downloads: é o limite de
// velocidade do portal, o mesmo do detalhe. (`var`: este arquivo é
// reinjetado a cada clique, e `const` declarado duas vezes derruba o arquivo)
var TIPO_POR_EXT = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };
async function baixarAnexoPat(protocolo, d, cracha) {
  const tok = localStorage.getItem('ifs_auth');
  const r = await fetch(`/apis/arquivosPortalApi/tarefa/${protocolo}/anexo/${d.id}`, {
    credentials: 'include', headers: cracha || (tok ? { Authorization: 'Bearer ' + tok } : {}) });
  if (!r.ok) return r;
  let b64 = (await r.text()).trim();
  if (b64.startsWith('"')) b64 = JSON.parse(b64);
  const bin = Uint8Array.from(atob(b64.replace(/\s+/g, '')), c => c.charCodeAt(0));
  const ext = (String(d.nome).match(/\.(\w+)$/) || [])[1];
  return new Response(bin, { headers: { 'content-type': TIPO_POR_EXT[String(ext).toLowerCase()] || 'application/octet-stream' } });
}
async function guardarAnexosPat(detalhes, cracha) {
  let n = 0;
  for (const det of detalhes) {
    const p = String(det.protocolo || '').replace(/\D/g, '');
    const docs = (det.anexos || []).filter(a => a && a.id)
      .map(a => ({ id: String(a.id), nome: a.nomeArquivo || a.descricaoArquivo || 'anexo' }));
    if (!p || !docs.length) continue;
    faixa(`guardando os anexos do INSS no CRM (${n} até aqui)…`);
    n += await CRM.guardarDocs('pat', p, docs, { todos: true, pausaMs: 3000,
                                                 baixar: d => baixarAnexoPat(p, d, cracha) });
    det.arquivos = docs.filter(d => d.caminho);
  }
  return n;
}

// o botão do popup chama isto. Espera o coletor se anunciar — quando a
// injeção acabou de acontecer, ele leva um instante para subir.
window.crmRodar = async (desde) => {
  for (let i = 0; i < 25 && !window.__crmColetorNoAr; i++) await new Promise(r => setTimeout(r, 100));
  if (!window.__crmColetorNoAr)
    return { erro: 'o coletor não subiu nesta página — o portal pode estar bloqueando o script' };

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
