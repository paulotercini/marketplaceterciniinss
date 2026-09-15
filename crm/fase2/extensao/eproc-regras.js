// eproc TJSP (eproc1g, eproc1g-ef, eproc1g-crim, eproc2g) — as REGRAS de
// leitura, puras e testáveis no node.
//
// A "Relação de Processos" (acao=relatorio_processo_procurador_listar) é uma
// tabela HTML simples: uma <tr> por processo com as colunas Número, Classe,
// Autores, Réu(s), Localidade, Assunto, Último Evento, Data/Hora do último
// evento, Data/Hora de autuação e Valor da causa. A ordem das colunas vem do
// cabeçalho — é lida dele, não chutada. Formato conferido ao vivo em
// 14.09.2026 nos quatro hosts do TJSP.
//
// Saída no MESMO formato do pje-regras.js (numero, classe, partes, orgao,
// distribuido, movimento{data,hora,texto}): a tela 📥 Importar do CRM casa
// pelo número e não precisa saber de onde veio.
(function (raiz) {
  'use strict';

  const RE_CNJ = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;
  const RE_DATA_HORA = /(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}:\d{2})(?::\d{2})?)?/;

  // o DOM serializado só guarda estas entidades — acento vira letra
  function desHtml(s) {
    return String(s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }
  // texto de uma célula: <br> vira separador, o resto das tags some
  function texto(html) {
    return desHtml(String(html || '').replace(/<br\s*\/?>/gi, ' | ')
      .replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' '))
      .replace(/\s+/g, ' ').replace(/\s*\|\s*/g, ' | ').replace(/^(\s*\|\s*)+|(\s*\|\s*)+$/g, '').trim();
  }
  const celulas = tr => [...String(tr || '').matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1]);
  const dataIso = m => m ? `${m[3]}-${m[2]}-${m[1]}` : null;

  // as colunas pela ordem dos <th> do cabeçalho
  function colunas(html) {
    const cab = String(html || '').slice(0, Math.max(0, String(html || '').search(/<tr[^>]*class="infraTr(?:Clara|Escura)"/i)) || undefined);
    const ths = [...cab.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map(m => {
      const rot = m[1].match(/infraTdRotuloOrdenacao[^>]*>([\s\S]*?)<\/td>/i);
      return texto(rot ? rot[1] : m[1]);
    });
    const acha = re => ths.findIndex(t => re.test(t));
    return {
      numero: acha(/n[úu]mero/i), classe: acha(/^classe/i), autores: acha(/autor/i),
      reus: acha(/r[ée]u/i), local: acha(/localidade|[óo]rg[ãa]o/i), assunto: acha(/assunto/i),
      // "Data do Último Evento" contém "Último Evento": a coluna do evento é a
      // que NÃO fala em data, e a da data é a que fala
      evento: ths.findIndex(t => /[úu]ltimo evento/i.test(t) && !/data/i.test(t)),
      dataEvento: ths.findIndex(t => /data/i.test(t) && /evento/i.test(t)),
      autuacao: acha(/autua/i), valor: acha(/valor/i), n: ths.length,
    };
  }

  function lerLinhaAcervo(html, col) {
    const brutas = celulas(html);
    const c = brutas.map(texto);
    const iNum = col && col.numero >= 0 ? col.numero : c.findIndex(x => RE_CNJ.test(x));
    const numero = (String(c[iNum] || '').match(RE_CNJ) || [])[0] || null;
    if (!numero) return null;                                 // linha sem processo não é linha
    // F95 · o endereço do processo aberto está no próprio número da relação
    // (controlador.php?acao=processo_selecionar&…&hash=…). Relativo aqui; quem
    // conhece o host (eproc.js) completa. É o "abrir no eproc" das Novidades.
    const href = (String(brutas[iNum] || '').match(/<a[^>]+href="([^"]*processo_selecionar[^"]*)"/i) || [])[1];
    const link_rel = href ? desHtml(href) : null;
    const pega = k => (col && col[k] >= 0 ? c[col[k]] : '') || '';
    const sigla = String(c[iNum] || '').replace(RE_CNJ, '').replace(/\|/g, ' ').trim() || null;
    const mov = pega('evento'), dm = pega('dataEvento').match(RE_DATA_HORA);
    const aut = pega('autuacao').match(RE_DATA_HORA);
    const autores = pega('autores'), reus = pega('reus'), local = pega('local');
    return {
      numero,
      classe: pega('classe').replace(/\s*\|.*$/, '') || null,
      partes: [autores, reus].filter(Boolean).join(' X ') || null,
      orgao: [local, sigla].filter(Boolean).join(' · ') || null,
      sigla, assunto: pega('assunto') || null, valor: pega('valor') || null,
      distribuido: dataIso(aut),
      movimento: mov ? { data: dataIso(dm), hora: dm && dm[4] ? dm[4] : null, texto: mov } : null,
      id: null, ca: null, link_rel,
    };
  }

  // a página inteira. O cabeçalho da relação tem TABELAS ANINHADAS (as setas
  // de ordenação), então não se recorta "a tabela" por regex: recorta-se do
  // <table> que abre o cabeçalho "Número Processo" em diante e leem-se as
  // <tr class="infraTrClara|Escura"> — só a relação tem linhas assim, e linha
  // de dado não aninha nada. Dois registros do mesmo processo viram um — vale
  // o mais novo.
  function lerAcervoHtml(html) {
    const h = String(html || '');
    const iCab = h.search(/N(?:[úu]|&uacute;)mero Processo/i);
    if (iCab < 0) return [];
    const iTh = h.lastIndexOf('<th', iCab);
    const seg = h.slice(Math.max(0, h.lastIndexOf('<table', iTh < 0 ? iCab : iTh)));
    const col = colunas(seg);
    const vistos = new Map();
    const chave = x => (x.movimento ? (x.movimento.data || '') + ' ' + (x.movimento.hora || '') : '');
    for (const m of seg.matchAll(/<tr[^>]*class="infraTr(?:Clara|Escura)"[^>]*>[\s\S]*?<\/tr>/gi)) {
      const p = lerLinhaAcervo(m[0], col);
      if (!p) continue;
      const antes = vistos.get(p.numero);
      if (!antes || chave(p) > chave(antes)) vistos.set(p.numero, p);
    }
    return [...vistos.values()];
  }

  // "Lista de Processos (7 registros)" / "Nenhum registro encontrado"
  function totalRegistros(html) {
    const h = String(html || '');
    const m = h.match(/Lista de Processos\s*\((\d+)\s*registros?\)/i);
    if (m) return +m[1];
    return /Nenhum registro encontrado/i.test(h) ? 0 : null;
  }

  // ── o PROCESSO ABERTO (acao=processo_selecionar) ─────────────────────────
  // tblEventos: uma <tr id="trEvento73"> por evento com as células Evento,
  // Data/Hora, Descrição (label.infraEventoDescricao), Usuário e Documentos
  // (a.infraLinkDocumento, texto tipo "DESPADEC1").
  function lerEventosHtml(html) {
    const h = String(html || '');
    const t = (h.match(/<table[^>]*id="tblEventos"[^>]*>[\s\S]*?<\/table>/i) || [''])[0];
    const itens = [];
    for (const m of t.matchAll(/<tr[^>]*id="trEvento(\d+)"[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const c = celulas(m[2]);
      const dh = texto(c[1] || '').match(RE_DATA_HORA);
      const desc = (m[2].match(/infraEventoDescricao[^>]*>([\s\S]*?)<\/label>/i) || [])[1];
      const textos = [texto(desc || c[2] || '')].filter(Boolean);
      const docs = [...m[2].matchAll(/<a[^>]*infraLinkDocumento[^>]*>([\s\S]*?)<\/a>/gi)]
        .map(d => ({ id: m[1], nome: texto(d[1]) })).filter(d => d.nome);
      if (!textos.length && !docs.length) continue;
      itens.push({ evento: +m[1], data: dataIso(dh), hora: dh && dh[4] ? dh[4] : null, textos, docs });
    }
    return itens;
  }

  // a capa: spans txtNumProcesso, txtClasse, txtOrgaoJulgador, cada um com o
  // valor como texto direto. O do órgão carrega um onmouseover com HTML
  // dentro do atributo (o tooltip com telefone da vara) — o fim da tag é
  // achado pulando os atributos entre aspas, não pelo primeiro ">".
  function lerCabecalhoProcesso(html) {
    const h = String(html || '');
    // o eproc escreve o id ora com aspas duplas, ora simples, ora sem; e o
    // mesmo id aparece antes na busca do topo (um <input> vazio) — vale a
    // primeira ocorrência que tenha texto
    const g = id => {
      const alvo = new RegExp('\\sid=["\']?' + id + '["\']?(?=[\\s>/])', 'g');
      for (let m; (m = alvo.exec(h));) {
        const re = /(?:"[^"]*"|'[^']*'|[^>"'])*>/y;
        re.lastIndex = m.index;
        if (!re.exec(h)) continue;
        const t = texto(h.slice(re.lastIndex, re.lastIndex + 600).split('<')[0]);
        if (t) return t;
      }
      return '';
    };
    const numero = (g('txtNumProcesso').match(RE_CNJ) || [])[0]
      || (h.match(/<title>[\s\S]*?(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/) || [])[1] || null;
    if (!numero) return null;
    return { numero, classe: g('txtClasse') || null, orgao: g('txtOrgaoJulgador') || null,
             situacao: g('txtSituacao') || null };
  }

  const API = { lerLinhaAcervo, lerAcervoHtml, totalRegistros, lerEventosHtml, lerCabecalhoProcesso, colunas };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else raiz.EPROC_REGRAS = raiz.EPROC_REGRAS || API;
})(typeof window !== 'undefined' ? window : globalThis);
