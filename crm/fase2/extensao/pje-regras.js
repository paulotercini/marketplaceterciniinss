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
  // o órgão julgador é o <div> sem classe logo depois do das partes
  const RE_ORGAO = /nome-parte">[^<]*<\/span><\/div>\s*<div>\s*([^<]+?)\s*<\/div>/;

  function lerLinhaAcervo(html) {
    const h = String(html || '');
    const numero = (h.match(RE_NUMERO) || [])[1] || null;
    if (!numero) return null;                 // linha sem processo não é linha
    const mov = h.match(RE_MOV);
    const link = h.match(RE_LINK);
    const dist = h.match(RE_DISTRIB);
    const org = (h.match(RE_ORGAO) || [])[1] || '';
    return {
      numero,
      classe: (h.match(RE_CLASSE) || [])[1] || null,
      partes: ((h.match(RE_PARTES) || [])[1] || '').trim() || null,
      orgao: org && !/^Distribuído em/.test(org) ? org : null,
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

  // ── a página do PROCESSO ABERTO (listProcessoCompletoAdvogado.seam) ──────
  // A "Cronologia" (form divTimeLine) é uma lista de grupos por dia — <div
  // class="media data"> com "03 ago. 2026" — seguidos dos itens do dia: <div
  // class="media interno tipo-M"> (movimento) ou tipo-D (juntada), cada um com
  // spans .texto-movimento, anexos "id - Nome do documento" e a hora num
  // <small class="pull-right">. Formato do HAR real de 11.08.2026.
  const MESES = { jan:'01', fev:'02', mar:'03', abr:'04', mai:'05', jun:'06',
                  jul:'07', ago:'08', set:'09', out:'10', nov:'11', dez:'12' };

  // o DOM serializado só guarda estas cinco entidades — acento vira letra
  function desHtml(s) {
    return String(s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'");
  }

  function dataInterna(txt) {              // "03 ago. 2026" -> "2026-08-03"
    const m = String(txt || '').match(/(\d{1,2})\s+([a-zç]{3})\.?\s+(?:de\s+)?(\d{4})/i);
    if (!m || !MESES[m[2].toLowerCase()]) return null;
    return `${m[3]}-${MESES[m[2].toLowerCase()]}-${m[1].padStart(2, '0')}`;
  }

  function lerTimelineHtml(html) {
    const itens = [];
    let dia = null;
    for (const peda of String(html || '').split(/<div class="media /)) {
      if (/^data"/.test(peda)) {
        dia = dataInterna((peda.match(/data-interna">\s*([^<]+?)\s*</) || [])[1]);
        continue;
      }
      const textos = [];
      for (const m of peda.matchAll(/texto-movimento">\s*([^<]+?)\s*</g))
        textos.push(desHtml(m[1]).replace(/\s+/g, ' '));
      const docs = [];
      const anexos = peda.slice(Math.max(0, peda.indexOf('class="anexos"')));
      for (const m of anexos.matchAll(/>\s*(\d{6,})\s*-\s*([^<]+?)\s*<\/span>/g))
        docs.push({ id: m[1], nome: desHtml(m[2]).replace(/\s+/g, ' ') });
      if (!textos.length && !docs.length) continue;
      itens.push({
        data: dia,
        hora: (peda.match(/pull-right">\s*(\d{2}:\d{2})/) || [])[1] || null,
        textos, docs,
      });
    }
    return itens;
  }

  // o topo da página: "RecInoCiv 5001168-60.2024.4.03.6314" no titulo-topo, e
  // o órgão julgador no painel "Mais detalhes"
  function lerCabecalhoProcesso(html) {
    const h = String(html || '');
    const topo = h.match(/titulo-topo[^>]*>\s*([A-Za-zÀ-ÿ]+)?\s*(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/);
    const numero = topo ? topo[2]
      : (h.match(/<title>\s*(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/) || [])[1] || null;
    if (!numero) return null;
    const org = h.match(/(?:Órgão|&Oacute;rg&atilde;o) julgador\s*<\/dt>\s*<dd>\s*([^<]+?)\s*</);
    return { numero, classe: (topo && topo[1]) || null,
             orgao: org ? desHtml(org[1]).replace(/\s+/g, ' ') : null };
  }

  const API = { lerLinhaAcervo, lerAcervoHtml, lerTimelineHtml, lerCabecalhoProcesso };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else raiz.PJE_REGRAS = raiz.PJE_REGRAS || API;
})(typeof window !== 'undefined' ? window : globalThis);
