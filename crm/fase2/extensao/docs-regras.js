// F184 · OS DOCUMENTOS DOS ANDAMENTOS — regras puras, testáveis no node.
//
// O andamento diz QUE houve sentença; o documento diz O QUE foi decidido. Os
// coletores baixam, na sessão logada do usuário, só o que decide (sentença,
// decisão, despacho, acórdão, monocrática, laudo) e o sobem ao bucket privado
// "anexos" — o PAT é a exceção: lá vão todos os anexos (decisão do Paulo,
// 05.10.2026), e continuam internos como tudo que está no bucket.
//
// O CAMINHO É DETERMINÍSTICO: o mesmo documento do portal cai sempre no mesmo
// lugar. É o que deixa o coletor perguntar "já tenho?" antes de baixar, e é o
// que impede o mesmo PDF de entrar duas vezes por duas coletas.
(function (raiz) {
  'use strict';

  // nomes do PJe ("Sentença", "Decisão"), do eproc ("SENT1", "DESPADEC1",
  // "ACOR2", "LAUDO1") e do e-SAJ ("Julgada Procedente a Ação")
  const RE_DECIDE = /senten[cç]|decis[aã]|despach|ac[oó]rd[aã]|monocr[aá]tic|laudo|julgad[oa] (?:procedente|improcedente|parcial|extint|prejudicad)|homologa|DESPADEC|\bSENT\d|\bACOR\d|\bDEC\d|\bVOTO\d/i;
  // certidão não decide, mesmo falando de "julgado" (a do trânsito em julgado
  // entrou assim na primeira coleta ao vivo, 05.10.2026)
  const ehDecisao = nome => RE_DECIDE.test(String(nome || '')) && !/^\s*certid/i.test(String(nome || ''));

  // O QUE DESCE: tudo, menos o EXPEDIENTE (decisão do Paulo, 05.10.2026) —
  // inicial e documentos, contestação, réplica, manifestações, recursos,
  // pareceres, laudos e decisões. Certidão, ato ordinatório, intimação,
  // mandado, comprovante de protocolo e aviso ficam: muito arquivo, nada a ler.
  // Nomes do PJe ("Ato Ordinatório"), do eproc ("CERT1", "ATOORD1", "INTM1")
  // e do e-SAJ (o título da movimentação: "Certidão de Publicação Expedida")
  const RE_EXPEDIENTE = /^\s*(?:certid|ato ordinat|intima[cç]|mandado|comprovante de protocolo|aviso|expedi[cç][aã]o de|publica[cç][aã]o|remessa|recebimento(?! de of[ií]cio)|conclus[aã]o|decurso de prazo|movimento processual|depre\b|ci[eê]ncia de recebimento|juntada de (?:ar|aviso|mandado|certid))|^\s*(?:CERT|ATOORD|INTM|INTIM|MAND|AR)\d+\s*$/i;
  const vaiBaixar = nome => !RE_EXPEDIENTE.test(String(nome || ''));

  // o mesmo nomeSeguro do robo-crps/ingerir.js — o CRPS mantém o caminho de lá
  function nomeSeguro(s) {
    return String(s || 'documento').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^\w.\-]+/g, '_').replace(/_+/g, '_').slice(-80);
  }
  const digitos = s => String(s || '').replace(/\D/g, '');

  // pje | eproc | esaj | pat → <origem>/<processo só dígitos>/<id>
  // crps → crps/<nup>/<id>_<nome>, o caminho que o ingerir.js sempre usou
  function caminhoDoc(origem, processo, doc) {
    const proc = digitos(processo) || 'sem-numero';
    if (origem === 'crps') return `crps/${proc}/${nomeSeguro(doc.id || doc.nome)}_${nomeSeguro(doc.nome)}`;
    return `${origem}/${proc}/${nomeSeguro(doc.id)}`;
  }

  // o que o portal devolveu é documento ou é a tela de login/erro?
  // PDF pelos bytes mágicos; HTML só quando o servidor diz que é e não pede senha
  function tipoDoConteudo(bytes, contentType) {
    const b = bytes || [];
    if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'application/pdf';
    const ct = String(contentType || '').toLowerCase();
    if (/^image\/(png|jpe?g)/.test(ct)) return ct.split(';')[0];
    if (/text\/html/.test(ct)) {
      let s = '';
      for (let i = 0; i < Math.min(b.length, 6000); i++) s += String.fromCharCode(b[i]);
      if (/type=["']?password|kc-form-login|Sua sess[aã]o foi encerrada/i.test(s)) return null;
      // a tela do próprio sistema não é documento: o eproc, quando o link do
      // documento não vale mais (outro processo aberto na mesma sessão),
      // devolve o Painel do Advogado — e ele entrava 64 vezes como "documento"
      if (/<title>\s*::\s*eproc\b|Painel do Advogado|Consulta Processual - Detalhes/i.test(s)) return null;
      return b.length > 200 ? 'text/html' : null;
    }
    return null;
  }

  // A PÁGINA DO VISUALIZADOR NÃO É O DOCUMENTO (medido ao vivo, 05.10.2026):
  // o link do eproc devolve uma página com o documento num <iframe>, e o do
  // e-SAJ abre a "pasta digital", que pede o PDF por script a
  //   /pastadigital/getPDF.do?<parametros>
  // com um nó por página em `var requestScope = [...]`. Daqui sai o endereço
  // do documento de verdade, ou null quando a página já é o documento.
  function enderecoDoMiolo(html) {
    const h = String(html || '');
    const rs = h.match(/var requestScope\s*=\s*(\[[\s\S]*?\]);\s*var /);
    if (rs) {
      const nos = [];
      const andar = lista => { for (const x of lista || []) {
        if (x && x.data && x.data.parametros) nos.push(x.data.parametros);
        if (x && x.children) andar(x.children);
      } };
      try { andar(JSON.parse(rs[1])); } catch (e) { return null; }
      if (!nos.length) return null;
      // uma chamada só, da primeira à última página do documento
      const num = (p, k) => +((p.match(new RegExp('(?:^|&)' + k + '=(\\d+)')) || [])[1] || NaN);
      const ini = Math.min(...nos.map(p => num(p, 'numInicial')).filter(n => n >= 0));
      const fim = Math.max(...nos.map(p => num(p, 'numFinal')).filter(n => n >= 0));
      let p = nos[0];
      if (isFinite(ini)) p = p.replace(/(^|&)numInicial=\d+/, `$1numInicial=${ini}`);
      if (isFinite(fim)) p = p.replace(/(^|&)numFinal=\d+/, `$1numFinal=${fim}`);
      return '/pastadigital/getPDF.do?' + p;
    }
    const src = (h.match(/<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (src && !/^(about:|javascript:)|processando\.html/i.test(src)) return desEntidade(src);
    // o despacho/carta que o eproc gera em HTML não vem em iframe: a página
    // o carrega por script, $.ajax({ url: "...acessar_documento_implementacao..." })
    const ajax = (h.match(/url\s*:\s*["']([^"']*acao=acessar_documento_implementacao[^"']*)["']/i) || [])[1];
    if (ajax) return desEntidade(ajax);
    return null;
  }

  // o HTML do eproc vem em ISO-8859-1, e o CRM lê o que está no bucket como
  // UTF-8 (o Storage não guarda o charset): guarda-se já em UTF-8, com o
  // <meta> dizendo isso, senão "Justiça" vira "Justi�a"
  function charsetDoHtml(bytes, contentType) {
    const ct = (String(contentType || '').match(/charset=([\w-]+)/i) || [])[1];
    if (ct) return ct.toLowerCase();
    let s = '';
    for (let i = 0; i < Math.min((bytes || []).length, 3000); i++) s += String.fromCharCode(bytes[i]);
    return ((s.match(/<meta[^>]*charset\s*=\s*["']?([\w-]+)/i) || [])[1] || 'utf-8').toLowerCase();
  }
  const desEntidade = s => String(s).replace(/&amp;/g, '&');

  const API = { ehDecisao, vaiBaixar, caminhoDoc, tipoDoConteudo, nomeSeguro, enderecoDoMiolo, charsetDoHtml };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else raiz.DOCS_REGRAS = raiz.DOCS_REGRAS || API;
})(typeof window !== 'undefined' ? window : globalThis);
