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
      return b.length > 200 ? 'text/html' : null;
    }
    return null;
  }

  const API = { ehDecisao, caminhoDoc, tipoDoConteudo, nomeSeguro };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else raiz.DOCS_REGRAS = raiz.DOCS_REGRAS || API;
})(typeof window !== 'undefined' ? window : globalThis);
