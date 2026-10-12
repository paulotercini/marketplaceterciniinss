// DOSSIÊ · regras puras (testáveis no node): nome de pasta e de arquivo,
// leitura do crachá do gov.br e o reconhecimento do PDF na resposta.
//
// Os portais do INSS devolvem o mesmo PDF de três jeitos: os bytes crus
// (CNIS, declaração, carta), uma string base64 dentro de JSON (a cópia do
// processo, `consolidadorservices/pap`) ou um JSON de erro com status 200.
// `comoPdf` resolve os três: devolve os bytes do PDF ou null.
(function (raiz) {

  const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

  // nome que o Windows e o Storage aceitam: sem / \ : * ? " < > | e sem espaço sobrando
  const nomeSeguro = s => String(s || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, 120) || 'documento';

  // chave do Storage do Supabase: só ASCII, sem espaço
  const slug = s => semAcento(nomeSeguro(s)).replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-').replace(/^-|-$/g, '') || 'documento';

  const pastaCliente = (nome, cpf) => `Dossie/${nomeSeguro(`${nome || 'Cliente'} ${cpf || ''}`)}`;

  // payload do JWT (gov.br/Meu INSS): base64url, UTF-8
  function jwt(tok) {
    try {
      const b = String(tok || '').split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const bin = atob(b + '='.repeat((4 - b.length % 4) % 4));
      return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
    } catch (e) { return null; }
  }

  const ehPdf = u8 => u8 && u8.length > 4 && u8[0] === 0x25 && u8[1] === 0x50 && u8[2] === 0x44 && u8[3] === 0x46;

  function comoPdf(buf) {
    const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf || []);
    if (ehPdf(u8)) return u8;
    let t = new TextDecoder().decode(u8).trim();
    if (/^["{][\s\S]*["}]$/.test(t)) { try { t = JSON.parse(t); } catch (e) {} }
    // {arquivo: "<base64>"} e afins: o campo de texto mais longo é o PDF
    if (t && typeof t === 'object')
      t = Object.values(t).filter(v => typeof v === 'string').sort((a, b) => b.length - a.length)[0] || '';
    t = String(t).replace(/^data:[^,]*,/, '');
    if (!/^[A-Za-z0-9+/=\s]+$/.test(t)) return null;
    try {
      const bin = Uint8Array.from(atob(t.replace(/\s/g, '')), c => c.charCodeAt(0));
      return ehPdf(bin) ? bin : null;
    } catch (e) { return null; }
  }

  // a frase que o INSS manda no lugar do PDF ({"mensagem": "..."}, {"result": "..."}…), curta
  function mensagemDoPortal(buf) {
    try {
      const j = JSON.parse(new TextDecoder().decode(buf instanceof Uint8Array ? buf : new Uint8Array(buf || [])));
      const m = typeof j === 'string' ? '' : ['mensagem', 'message', 'result', 'erro', 'error', 'descricao']
        .map(k => j && j[k]).find(v => typeof v === 'string' && v.trim());
      return m ? m.trim().slice(0, 140) : '';
    } catch (e) { return ''; }
  }

  // bytes → base64 em blocos (String.fromCharCode(...u8) estoura a pilha em PDF grande)
  function b64(u8) {
    let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  }

  // extrato de pagamento: os últimos 12 meses, do dia 1 de 11 meses atrás ao fim do mês corrente
  function janela12Meses(hoje) {
    const d = hoje || new Date();
    const ini = new Date(d.getFullYear(), d.getMonth() - 11, 1);
    const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const f = x => `${String(x.getDate()).padStart(2, '0')}-${String(x.getMonth() + 1).padStart(2, '0')}-${x.getFullYear()}`;
    return [f(ini), f(fim)];
  }

  // NUP do e-Recursos reconhecido pelo FORMATO (15 a 25 dígitos), como no crps.js
  // do CRM: nome de campo do INSS muda, formato não. Com `cpf`, fica só o item
  // que traz esse CPF em algum campo — quando a lista é do advogado, não do cliente.
  function nupsDaLista(lista, cpf) {
    const itens = (Array.isArray(lista) ? lista : []).filter(x => x && typeof x === 'object');
    const comCpf = cpf ? itens.filter(x => Object.values(x).some(v => String(v == null ? '' : v).replace(/\D/g, '') === cpf)) : [];
    const fora = new Set();
    for (const item of (comCpf.length ? comCpf : itens))
      for (const v of Object.values(item)) {
        const d = String(v == null ? '' : v).replace(/\D/g, '');
        if (d.length >= 15 && d.length <= 25) fora.add(d);
      }
    return { nups: [...fora], filtrouPorCpf: comCpf.length > 0 };
  }

  // HC Ribeirão: exame de imagem e de método (laudo), não exame de sangue/laboratório.
  // ponytail: lista por palavra; exame que não casar fica de fora — some aqui o nome que faltar
  const IMAGEM = /RADIOGRAF|\bRX\b|RAIO[\s-]?X|TOMOGRAF|RESSON[AÂ]NCIA|\bRNM\b|ULTRA[\s-]?SSON|ULTRA[\s-]?SON|ECOGRAF|ECOCARDIO|DOPPLER|DUPLEX|MAMOGRAF|DENSITOMETR|CINTILOGRAF|\bPET\b|ANGIO|ARTERIOGRAF|FLEBOGRAF|UROGRAF|FLUOROSCOP|ESOFAGOGRAF|ENEMA|ENDOSCOP|COLONOSCOP|BRONCOSCOP|NEUROMIOGRAF|ELETROCARDIO|ELETROENCEFALO|\bECG\b|\bEEG\b|HOLTER|\bMAPA\b|ERGOMETR|AUDIOMETR|IMITANCIOMETR|ESPIROMETR|POLISSONOGRAF|CAMPIMETR|RETINOGRAF|BIOPSIA|ANATOMO/i;
  const ehExameDeImagem = nome => IMAGEM.test(semAcento(nome || ''));

  // Seguro-desemprego: o JSON do portal vira texto que uma pessoa e o CRM leem.
  // Nome de campo do MTE pode mudar: cada linha pega o primeiro campo que
  // existir; o JSON cru vai embaixo para nada se perder.
  const dataBr = v => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v || '-'); };
  const campo = (o, ...ks) => { for (const k of ks) if (o && o[k] != null && o[k] !== '') return o[k]; return ''; };
  function textoSeguroDesemprego(lista) {
    const linhas = ['SEGURO-DESEMPREGO — requerimentos (Portal Emprega Brasil, MTE)', ''];
    // objeto {codigo, descricao} (modalidade, tipoInscricao, situação) → a descrição
    const rot = v => (v && typeof v === 'object') ? (v.descricao || v.nome || v.codigo || '') : (v == null ? '' : v);
    for (const r of lista) {
      const d = r.detalhe || {};
      linhas.push(`Requerimento ${campo(r, 'numeroRequerimento', 'numero', 'codigo') || '?'} · modalidade ${rot(campo(r, 'modalidade', 'tipo')) || '?'}`
        + `${rot(campo(d, 'situacao', 'situacaoRequerimento', 'status')) ? ` · situação ${rot(campo(d, 'situacao', 'situacaoRequerimento', 'status'))}` : ''}`);
      linhas.push(`  Data do requerimento: ${dataBr(campo(r, 'dataRequerimento', 'dataCadastro', 'data'))}`);
      if (campo(r, 'razaoSocial', 'dataAdmissao', 'dataDispensa'))
        linhas.push(`  Empregador: ${campo(r, 'razaoSocial') || '?'} (${rot(r.tipoInscricao) || ''} ${campo(r, 'inscricao', 'numeroInscricao') || ''}) · admissão ${dataBr(r.dataAdmissao)} · dispensa ${dataBr(campo(r, 'dataDispensa', 'dataDemissao'))}`);
      if (r.dataInicioSuspensao || r.dataFimSuspensao)
        linhas.push(`  Suspensão do contrato: ${dataBr(r.dataInicioSuspensao)} a ${dataBr(r.dataFimSuspensao)}`);
      const v = [].concat(campo(d, 'vinculos', 'vinculo') || campo(r, 'vinculos') || []);
      for (const x of v) linhas.push(`  Vínculo: ${campo(x, 'nomeEmpregador', 'empregador', 'razaoSocial') || '?'} · admissão ${dataBr(campo(x, 'dataAdmissao', 'admissao'))} · demissão ${dataBr(campo(x, 'dataDemissao', 'dataDesligamento', 'dataDispensa', 'demissao'))}`);
      const p = [].concat(campo(d, 'parcelas') || campo(r, 'parcelas') || []);
      for (const x of p) linhas.push(`  Parcela ${campo(x, 'numeroParcela', 'numero', 'parcela') || '?'}: liberação ${dataBr(campo(x, 'dataLiberacao'))} · pagamento ${dataBr(campo(x, 'dataPagamento', 'dataEmissao'))} · valor ${campo(x, 'valorParcela', 'valor') || '-'} · ${rot(campo(x, 'situacaoParcela', 'situacao')) || ''}`);
      if (!p.length) linhas.push(r.detalhe_erro ? `  (parcelas: o portal não devolveu o detalhe — ${r.detalhe_erro})` : '  (sem parcelas informadas)');
      linhas.push('');
    }
    linhas.push('', '--- dados brutos do portal ---', JSON.stringify(lista, null, 2));
    return linhas.join('\n');
  }

  const API = { nomeSeguro, slug, pastaCliente, jwt, comoPdf, mensagemDoPortal, ehExameDeImagem, textoSeguroDesemprego, b64, janela12Meses, nupsDaLista };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else raiz.DOSSIE_REGRAS = API;
})(typeof window !== 'undefined' ? window : globalThis);
