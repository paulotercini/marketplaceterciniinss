// PJe TRF3 — as REGRAS de leitura do acervo, puras e testáveis no node.
//
// O painel do advogado (aba Acervo) lista cada processo com: classe + número
// CNJ, partes, órgão, "Distribuído em" e — o que interessa — "Último
// movimento: DD/MM/AAAA HH:MM - texto". É o suficiente para saber QUEM
// movimentou sem abrir processo nenhum, que é o pedido do Paulo. O link
// "Autos Digitais" carrega id&ca (a chave de acesso ao detalhe), guardados
// para a fase 2 (linha do tempo completa e PDFs).
//
// Regex sobre o HTML da LINHA (tr.outerHTML), não sobre o DOM: é o que deixa
// estas funções rodarem idênticas na página e nos testes do node. O formato
// veio de HAR real de 11.08.2026 (pje1g e pje2g).
(function (raiz) {
  'use strict';

  const RE_NUMERO = /copyToClipboard\(event,\s*'(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})'\)/;
  const RE_CLASSE = /text-bold">\s*([A-Za-zÀ-ÿ]+)\s+\d{7}-/;
  const RE_PARTES = /nome-parte">([^<]+)</;
  const RE_MOV = /Último movimento:\s*(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})\s*-\s*([^<]+)</;
  const RE_LINK = /listProcessoCompletoAdvogado\.seam\?id=(\d+)&(?:amp;)?ca=([0-9a-f]+)/;
  const RE_DISTRIB = /Distribuído em\s+(\d{2})\/(\d{2})\/(\d{4})/;

  function lerLinhaAcervo(html) {
    const h = String(html || '');
    const numero = (h.match(RE_NUMERO) || [])[1] || null;
    if (!numero) return null;                 // linha sem processo não é linha
    const mov = h.match(RE_MOV);
    const link = h.match(RE_LINK);
    const dist = h.match(RE_DISTRIB);
    return {
      numero,
      classe: (h.match(RE_CLASSE) || [])[1] || null,
      partes: ((h.match(RE_PARTES) || [])[1] || '').trim() || null,
      distribuido: dist ? `${dist[3]}-${dist[2]}-${dist[1]}` : null,
      movimento: mov ? {
        data: `${mov[3]}-${mov[2]}-${mov[1]}`,
        hora: mov[4],
        texto: mov[5].replace(/\s+/g, ' ').trim(),
      } : null,
      id: link ? link[1] : null,
      ca: link ? link[2] : null,
    };
  }

  // a página inteira (ou um fragmento AJAX): corta por <tr> e lê cada linha.
  // Duas linhas do mesmo processo (o acervo repete entre nós da árvore e
  // páginas) viram uma — vale a de movimento mais novo.
  function lerAcervoHtml(html) {
    const vistos = new Map();
    for (const peda of String(html || '').split(/<tr[\s>]/)) {
      const p = lerLinhaAcervo(peda);
      if (!p) continue;
      const antes = vistos.get(p.numero);
      const chave = x => (x.movimento ? x.movimento.data + ' ' + x.movimento.hora : '');
      if (!antes || chave(p) > chave(antes)) vistos.set(p.numero, p);
    }
    return [...vistos.values()];
  }

  const API = { lerLinhaAcervo, lerAcervoHtml };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else raiz.PJE_REGRAS = raiz.PJE_REGRAS || API;
})(typeof window !== 'undefined' ? window : globalThis);
