// e-SAJ TJSP (esaj.tjsp.jus.br, 1º e 2º grau) — as REGRAS de leitura, puras
// e testáveis no node.
//
// O e-SAJ não tem "relação de processos" no painel do advogado, mas tem a
// CONSULTA POR OAB (cpopg = 1º grau, cposg = 2º grau): ela lista todo processo
// em que a OAB está cadastrada, 25 por página, e cada linha traz o número, o
// código interno (a chave do link da ficha), classe, assunto, partes e a
// distribuição. O último movimento NÃO vem na lista — vem de um GET por
// processo em carregarMovimentacoesAjax.do, que devolve as cinco mais
// recentes. Formato conferido ao vivo em 15.09.2026.
//
// Saída no MESMO formato do pje-regras.js (numero, classe, partes, orgao,
// distribuido, movimento{data,hora,texto}), mais `codigo` e `link`: a tela
// 📥 Importar do CRM casa pelo número e não precisa saber de onde veio.
(function (raiz) {
  'use strict';

  const RE_CNJ = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;
  const RE_DATA = /(\d{2})\/(\d{2})\/(\d{4})/;

  // o e-SAJ escreve acento como entidade (&ccedil;&atilde;o) — decodifica as
  // nomeadas do latim-1 e as numéricas; o resto fica como veio
  const ACENTO = { acute: '́', grave: '̀', circ: '̂', tilde: '̃', uml: '̈', ring: '̊' };
  function desHtml(s) {
    return String(s || '')
      .replace(/&([aeiouAEIOUyYnN])(acute|grave|circ|tilde|uml|ring);/g, (m, l, a) => (l + ACENTO[a]).normalize('NFC'))
      .replace(/&([cC])cedil;/g, (m, c) => (c + '̧').normalize('NFC'))
      .replace(/&ordf;/g, 'ª').replace(/&ordm;/g, 'º').replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n))
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
      .replace(/&amp;/g, '&');
  }
  function texto(html) {
    return desHtml(String(html || '').replace(/<br\s*\/?>/gi, ' | ')
      .replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' '))
      .replace(/\s+/g, ' ').replace(/\s*\|\s*/g, ' | ').replace(/^(\s*\|\s*)+|(\s*\|\s*)+$/g, '').trim();
  }
  const dataIso = m => m ? `${m[3]}-${m[2]}-${m[1]}` : null;
  // o conteúdo do primeiro elemento com esta classe (sem elemento aninhado da mesma tag)
  function porClasse(html, classe, tag) {
    const re = new RegExp('<' + tag + '[^>]*class="[^"]*\\b' + classe + '\\b[^"]*"[^>]*>([^]*?)</' + tag + '>', 'i');
    return (String(html || '').match(re) || [])[1] || '';
  }

  // ── a lista da consulta por OAB ──────────────────────────────────────────
  // Cada processo começa em <div class="nuProcesso …"> e vai até o próximo.
  // 1º grau: nomeParte / assuntoPrincipalProcesso / dataLocalDistribuicaoProcesso;
  // 2º grau: nomeParticipante / assuntoProcesso / dataLocalDistribuicao.
  function lerLinhaLista(bloco) {
    const b = String(bloco || '');
    const numero = (texto(porClasse(b, 'linkProcesso', 'a')).match(RE_CNJ) || [])[0] || null;
    if (!numero) return null;
    const href = desHtml((b.match(/<a[^>]*class="[^"]*\blinkProcesso\b[^"]*"[^>]*href="([^"]*)"/i)
                       || b.match(/<a[^>]*href="([^"]*)"[^>]*class="[^"]*\blinkProcesso\b/i) || [])[1] || '');
    const codigo = (href.match(/processo\.codigo=([A-Za-z0-9]+)/) || [])[1] || null;
    const foro = (href.match(/processo\.foro=(\d+)/) || [])[1] || null;
    const grau = /\/cposg\//.test(href) ? '2º grau' : /\/cpopg\//.test(href) ? '1º grau' : null;
    // partes: cada rótulo "Exequente(a):" seguido do nome
    const partes = [];
    const reParte = /tipoDeParticipacao\b[^"]*"[^>]*>([\s\S]*?)<\/label>\s*<div[^>]*class="[^"]*\bnome(?:Parte|Participante)\b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    // a consulta por OAB mostra a participação da PRÓPRIA OAB ("Advogado(a):
    // Paulo…"), que não é parte e não serve para casar cliente — cai fora
    for (const m of b.matchAll(reParte)) {
      const tipo = texto(m[1]).replace(/:$/, '');
      const nome = texto(m[2]).replace(/\s*\|\s*OAB\s+[\dA-Z\/.-]+.*$/i, '').replace(/\s*\|.*$/, '');
      if (nome && !/advogad/i.test(tipo)) partes.push(`${tipo} ${nome}`);
    }
    const dist = texto(porClasse(b, 'dataLocalDistribuicao(?:Processo)?', 'div'));
    const dm = dist.match(RE_DATA);
    const orgao = dist.replace(RE_DATA, '').replace(/^\s*-\s*/, '').trim() || null;
    const base = grau === '2º grau' ? '/cposg/show.do' : '/cpopg/show.do';
    return {
      numero, codigo, grau,
      classe: texto(porClasse(b, 'classeProcesso', 'div')) || null,
      assunto: texto(porClasse(b, 'assunto(?:Principal)?Processo', 'div')) || null,
      partes: partes.join(' X ') || null,
      orgao, distribuido: dataIso(dm),
      link: codigo ? `https://esaj.tjsp.jus.br${base}?processo.codigo=${codigo}${foro ? '&processo.foro=' + foro : ''}` : null,
      movimento: null, id: null, ca: null,
    };
  }

  function lerListaHtml(html) {
    const h = String(html || '');
    const vistos = new Map();
    for (const p of h.split(/(?=<div[^>]*class="[^"]*\bnuProcesso\b)/)) {
      if (!/\bnuProcesso\b/.test(p)) continue;
      const x = lerLinhaLista(p);
      if (x && !vistos.has(x.numero)) vistos.set(x.numero, x);
    }
    return [...vistos.values()];
  }

  // "68 Processos encontrados" / "Não existem informações disponíveis" / a
  // trava de "múltiplas consultas simultâneas" — que não é vazio, é ESPERAR
  function totalRegistros(html) {
    const h = String(html || '');
    const m = h.match(/(\d+)\s+Processos?\s+encontrados?/i);
    if (m) return +m[1];
    return /N[ãa]o existem informa[çc][õo]es|Nenhum processo/i.test(h) ? 0 : null;
  }
  const bloqueado = html => /m[úu]ltiplas consultas simult[âa]neas/i.test(String(html || ''));
  const pedeLogin = html => /j_spring_security|sajcas\/login|Fazer login|identificacao\.do/i.test(String(html || '').slice(0, 20000));
  function totalPaginas(html) {
    let n = 1;
    for (const m of String(html || '').matchAll(/paginaConsulta=(\d+)/g)) n = Math.max(n, +m[1]);
    return n;
  }

  // ── as movimentações (carregarMovimentacoesAjax.do) ─────────────────────
  // 1º grau: <tr class="fundoClaro containerMovimentacao"> com td.dataMovimentacao
  // e td.descricaoMovimentacao (título, <br>, <span>detalhe</span>);
  // 2º grau: tr.movimentacaoProcesso com td.dataMovimentacaoProcesso e
  // td.descricaoMovimentacaoProcesso. A mais recente vem primeiro.
  function lerMovimentacoesHtml(html) {
    const itens = [];
    for (const m of String(html || '').matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const tr = m[1];
      const data = texto(porClasse(tr, 'dataMovimentacao(?:Processo)?', 'td')).match(RE_DATA);
      const desc = porClasse(tr, 'descricaoMovimentacao(?:Processo)?', 'td');
      if (!data || !desc) continue;
      const detalhe = texto((desc.match(/<span[^>]*>([\s\S]*?)<\/span>/i) || [])[1] || '');
      const titulo = texto(desc.replace(/<span[\s\S]*?<\/span>/gi, '').replace(/<a[^>]*>\s*<img[^>]*>\s*<\/a>/gi, ''));
      if (!titulo && !detalhe) continue;
      itens.push({ data: dataIso(data), hora: null, texto: titulo, detalhe: detalhe || null });
    }
    return itens;
  }

  // ── a FICHA (show.do) ────────────────────────────────────────────────────
  // É ela que arma o carregarMovimentacoesAjax.do (sem abrir a ficha na
  // sessão, o AJAX devolve uma página genérica sem movimento nenhum) — e, já
  // que é aberta, entrega de graça o que a lista por OAB não tem: a situação
  // (Suspenso, Baixado, Encerrado…) e as PARTES com nome, em
  // #tablePartesPrincipais (span.tipoDeParticipacao + td.nomeParteEAdvogado,
  // com o advogado depois do <br>).
  // a ficha do processo principal tem id=numeroProcesso; a de INCIDENTE
  // (cumprimento de sentença, requisição de pagamento) não tem: o cabeçalho
  // é span.unj-label ("Incidente" / "Execução de Sentença") + span.unj-larger
  // ("Requisição de Pequeno Valor (0000035-73.2026.8.26.0381) (02)"), e o
  // "Processo principal" vem em a.processoPrinc (conferido ao vivo em 22.09.2026)
  const ehFicha = html => /id=["']?(?:numeroProcesso|containerDadosPrincipaisProcesso)\b/.test(String(html || ''));
  const codigoDaUrl = url => (String(url || '').match(/processo\.codigo=([A-Za-z0-9]+)/) || [])[1] || null;
  function lerFichaHtml(html) {
    const h = String(html || '');
    if (!ehFicha(h)) return null;
    const idTexto = id => texto((h.match(new RegExp('id=["\']?' + id + '["\']?[^>]*>([^]*?)</(?:span|div)>', 'i')) || [])[1] || '');
    const larger = texto(porClasse(h, 'unj-larger', 'span'));
    const numero = (idTexto('numeroProcesso').match(RE_CNJ) || larger.match(RE_CNJ) || [])[0] || null;
    const situacao = idTexto('labelSituacaoProcesso') || idTexto('situacaoProcesso') || null;
    const principal = (texto(porClasse(h, 'processoPrinc', 'a')).match(RE_CNJ) || [])[0] || null;
    const tipo = texto((h.match(/<span[^>]*class="[^"]*\bunj-label\b[^"]*"[^>]*>([^<]*)<\/span>\s*<div[^>]*>\s*<span[^>]*class="[^"]*\bunj-larger\b/i) || [])[1] || '') || null;
    // "Requisição de Pequeno Valor (0000035-73.2026.8.26.0381) (02)" → "Requisição de Pequeno Valor (02)"
    const classeLarger = larger.replace(/\s*\(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\)/, '').trim() || null;
    const partes = [];
    const tabela = (h.match(/id=["']?tablePartesPrincipais["']?[^>]*>([^]*?)<\/table>/i) || [])[1] || '';
    for (const m of tabela.matchAll(/tipoDeParticipacao\b[^>]*>([^]*?)<\/span>[^]*?nomeParteEAdvogado\b[^>]*>([^]*?)<\/td>/gi)) {
      const tipo = texto(m[1]).replace(/:$/, '');
      const nome = texto(m[2]).split(' | ')[0].trim();          // o que vem antes do <br> é a parte; depois, o advogado
      if (nome && !/advogad/i.test(tipo)) partes.push(`${tipo} ${nome}`);
    }
    return {
      numero, situacao, principal, tipo,
      classe: idTexto('classeProcesso') || classeLarger,
      orgao: idTexto('varaProcesso') || idTexto('orgaoJulgadorProcesso') || idTexto('secaoProcesso') || null,
      foro: idTexto('foroProcesso') || null,
      partes: partes.join(' X ') || null,
    };
  }
  // processo que não movimenta mais: a situação diz, e o modo rápido pula
  const arquivado = s => /arquivad|baixad|encerrad|extint|cancelad/i.test(String(s || ''));

  // a consulta por NÚMERO: no 1º grau cai direto na ficha (show.do); o mesmo
  // número no 2º grau é o recurso, quando existe
  function urlBuscaNumero(grau, numero) {
    const n = String(numero || '');
    const nd = n.slice(0, 10), ano = n.slice(11, 15), foro = n.slice(-4);
    return grau === '2º grau'
      ? `/cposg/search.do?conversationId=&paginaConsulta=1&cbPesquisa=NUMPROC&numeroDigitoAnoUnificado=${nd}.${ano}&foroNumeroUnificado=${foro}&dePesquisaNuUnificado=${n}&dePesquisaNuUnificado=UNIFICADO&dePesquisa=&tipoNuProcesso=UNIFICADO`
      : `/cpopg/search.do?conversationId=&cbPesquisa=NUMPROC&numeroDigitoAnoUnificado=${nd}.${ano}&foroNumeroUnificado=${foro}&dadosConsulta.valorConsultaNuUnificado=${n}&dadosConsulta.valorConsultaNuUnificado=UNIFICADO&dadosConsulta.valorConsulta=&dadosConsulta.tipoNuProcesso=UNIFICADO`;
  }

  const API = { lerLinhaLista, lerListaHtml, totalRegistros, totalPaginas, bloqueado, pedeLogin, lerMovimentacoesHtml,
                ehFicha, codigoDaUrl, lerFichaHtml, arquivado, urlBuscaNumero };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else raiz.ESAJ_REGRAS = raiz.ESAJ_REGRAS || API;
})(typeof window !== 'undefined' ? window : globalThis);
