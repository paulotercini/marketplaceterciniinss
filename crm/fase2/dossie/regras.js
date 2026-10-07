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

  const API = { nomeSeguro, slug, pastaCliente, jwt, comoPdf, mensagemDoPortal, b64, janela12Meses, nupsDaLista };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else raiz.DOSSIE_REGRAS = API;
})(typeof window !== 'undefined' ? window : globalThis);
