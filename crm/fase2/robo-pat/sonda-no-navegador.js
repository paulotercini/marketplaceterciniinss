// ─────────────────────────────────────────────────────────────────────────
// SONDA DO PAT/GERID — v2. Roda no SEU navegador, na SUA sessão.
//
// O QUE MUDOU DA v1: a v1 provou que a lista funciona e trouxe o formato
// dela. E, ao tentar o detalhe por conta própria, levou 401
// INSUFFICIENT_PERMISSIONS — que NÃO é erro de captcha, é erro de crachá.
// O portal manda um cabeçalho de autorização em cada chamada, e a minha
// tentativa foi só com o cookie. Ou seja: eu errei o teste, não o portal
// fechou a porta.
//
// Esta versão não adivinha. Ela olha COMO a própria página pede — que
// cabeçalhos usa — e depois ESCUTA o detalhe que a página busca quando você
// abre uma tarefa. Fim da adivinhação.
//
// O QUE ELA NÃO FAZ: não gera, não guarda e não reaproveita token de
// reCAPTCHA; não faz login sozinha; não roda em servidor. Quem consulta é
// você, clicando como sempre.
//
// O QUE ELA MANDA PARA MIM: só o formato. Do cabeçalho de autorização vai o
// NOME e o tipo ("Bearer"), nunca o valor. Do endereço, os números longos
// saem mascarados — na v1 a URL do teste levou o número do protocolo junto,
// e peneirar o corpo mandando o identificador no endereço é peneirar pela
// metade.
//
// COMO USAR
//   1. Entre no PAT/GERID e faça login no gov.br normalmente.
//   2. Tela de tarefas → F12 → aba "Console".
//      (Se pedir, digite  allow pasting  e Enter.)
//   3. Cole ISTO, Enter. Aparece "sonda v2 ligada".
//   4. Clique em "Buscar". Se der para escolher 500 por página, escolha.
//   5. AGORA CLIQUE NUMA TAREFA para abrir o detalhe dela. É este passo que
//      responde a pergunta que sobrou.
//   6. Volte ao Console e digite:  sondaPat.baixar()
//      Ele baixa "sonda_pat2.json". Confira e mande no chat.
// ─────────────────────────────────────────────────────────────────────────
(() => {
  const OUT = { versao: 2, quando: new Date().toString(), capturas: [], testes: [] };

  // ── a peneira ───────────────────────────────────────────────────────────
  // Cópia de peneira.js, que tem teste próprio. Se divergirem, o teste acusa.
  const INSTITUCIONAL = new Set([
    'nomeservico', 'siglaservico', 'descricaoservico', 'tiposervico', 'idservico',
    'nomeunidade', 'siglaunidade', 'unidaderesponsavel', 'unidadeprotocolo',
    'nomesituacao', 'descricaosituacao', 'situacao', 'situacaotarefa',
    'status', 'fase', 'canal', 'orgao', 'setor', 'tipotarefa',
  ]);
  const PESSOAL = /cpf|cnpj|nome|nasc|email|mail|telefone|celular|fone|endere|logra|bairro|munic|cep|rg\b|documento|arquivo|anexo|titulo|descri|coment|observ|justific|motivo|senha|token|assinat/i;
  const CODIGO = /^(?=.*[A-ZÇÃÕÁÉÍÓÚÂÊÔ])[A-ZÇÃÕÁÉÍÓÚÂÊÔ0-9_\- ]{2,40}$/;
  const DATA = /^\d{4}-\d{2}-\d{2}|^\d{2}\/\d{2}\/\d{4}/;

  function peneirar(v, chave = '', prof = 0) {
    if (v === null || v === undefined) return null;
    if (prof > 9) return '‹fundo›';
    if (Array.isArray(v))
      return v.length ? [`‹lista de ${v.length}›`, peneirar(v[0], chave, prof + 1)] : [];
    if (typeof v === 'object') {
      const o = {};
      for (const k of Object.keys(v)) o[k] = peneirar(v[k], k, prof + 1);
      return o;
    }
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return String(v).length <= 6 ? v : `‹num ${String(v).length} díg›`;
    const s = String(v);
    if (INSTITUCIONAL.has(String(chave).toLowerCase()))
      return s.length <= 60 ? s : `‹texto ${s.length}›`;
    if (PESSOAL.test(chave)) return `‹oculto ${s.length}›`;
    if (DATA.test(s))   return s;
    if (CODIGO.test(s)) return s;
    if (s.length <= 3)  return s;
    return `‹texto ${s.length}›`;
  }

  function mascararUrl(url) {
    return String(url || '').replace(/\d{6,}/g, d => `‹num ${d.length} díg›`);
  }

  // ── o crachá ────────────────────────────────────────────────────────────
  // O que interessa é COMO a página se identifica, não com o quê. Do
  // Authorization vai o tipo e o tamanho; o valor fica onde está.
  const cabecalhos = h => {
    const fora = {};
    const por = (k, v) => {
      const nome = String(k).toLowerCase();
      fora[nome] = /authorization|cookie|token|captcha/i.test(nome)
        ? `‹${String(v).split(' ')[0] || '?'} · ${String(v).length} car›`
        : String(v).slice(0, 60);
    };
    if (!h) return fora;
    if (typeof h.forEach === 'function' && !Array.isArray(h)) h.forEach((v, k) => por(k, v));
    else Object.entries(h).forEach(([k, v]) => por(k, v));
    return fora;
  };

  // do CORPO da consulta interessa só quais campos existem — e se o
  // tokenReCAPTCHA está lá (ele responde por que a lista precisa do clique)
  const corpoEnviado = body => {
    if (!body || typeof body !== 'string') return null;
    try {
      const j = JSON.parse(body);
      return { campos: Object.keys(j), temTokenReCAPTCHA: 'tokenReCAPTCHA' in j,
               formato: peneirar(j) };
    } catch (e) { return { bruto: `‹${body.length} car›` }; }
  };

  const guardar = (rotulo, url, metodo, req, status, corpo) => {
    let json = null;
    try { json = JSON.parse(corpo); } catch (e) {}
    if (rotulo === 'detalhe' && status === 200) urlDetalhe = String(url);
    OUT.capturas.push({ rotulo, metodo, url: mascararUrl(String(url).split('?')[0]),
      query: mascararUrl(String(url).split('?')[1] || ''),
      pedido: req, status, bytes: (corpo || '').length,
      formato: json ? peneirar(json) : '‹não era JSON›' });
    console.log(`📥 ${rotulo} — ${metodo} HTTP ${status}, ${(corpo || '').length} bytes`);
    return json;
  };

  // ── escuta ──────────────────────────────────────────────────────────────
  const ALVO = /\/apis\/(requerimentosPortalApi|tarefasApi)\//;
  const rotular = u => /\/consulta/.test(u) ? 'lista'
                     : /analise-documental/.test(u) ? 'analise-documental'
                     : /\/tarefa\/\d+/.test(u) ? 'detalhe' : 'outro';
  // Ficam FORA do OUT de propósito: são o crachá e o endereço cru do detalhe
  // (que termina no número do protocolo). Servem à prova aqui dentro e não
  // entram no arquivo que sai daqui.
  let cracha = null, urlDetalhe = null;

  const fetchOriginal = window.fetch;
  window.fetch = async function (...args) {
    const [ent, cfg = {}] = args;
    const url = (typeof ent === 'string' ? ent : ent && ent.url) || '';
    const r = await fetchOriginal.apply(this, args);
    if (ALVO.test(url)) {
      if (cfg.headers) cracha = cfg.headers;
      const req = { cabecalhos: cabecalhos(cfg.headers), corpo: corpoEnviado(cfg.body) };
      guardar(rotular(url), url, cfg.method || 'GET', req, r.status, await r.clone().text());
    }
    return r;
  };

  const abrirOriginal = XMLHttpRequest.prototype.open;
  const porOriginal = XMLHttpRequest.prototype.setRequestHeader;
  const enviarOriginal = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, url, ...resto) {
    this._pat = { metodo: m, url: String(url), hdr: {} };
    return abrirOriginal.call(this, m, url, ...resto);
  };
  XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
    if (this._pat) this._pat.hdr[k] = v;
    return porOriginal.call(this, k, v);
  };
  XMLHttpRequest.prototype.send = function (body) {
    if (this._pat && ALVO.test(this._pat.url)) {
      if (Object.keys(this._pat.hdr).length) cracha = this._pat.hdr;
      this.addEventListener('load', () => guardar(rotular(this._pat.url), this._pat.url,
        this._pat.metodo, { cabecalhos: cabecalhos(this._pat.hdr), corpo: corpoEnviado(body) },
        this.status, this.responseText));
    }
    return enviarOriginal.call(this, body);
  };

  // ── a prova ─────────────────────────────────────────────────────────────
  // Depois que a PÁGINA buscou o detalhe, refazemos a mesma chamada com o
  // mesmo crachá. Se der 200, um script na sua aba consegue buscar sozinho os
  // que mudaram — e o dia todo cabe num clique.
  window.sondaPat = {
    OUT,
    async provar() {
      if (!urlDetalhe || !cracha) {
        console.warn('⚠ abra UMA tarefa antes: é o detalhe dela que eu preciso ver'); return;
      }
      const r = await fetchOriginal(urlDetalhe, { credentials: 'include', headers: cracha });
      OUT.testes.push({ rotulo: 'detalhe repetido pelo script', status: r.status, deu: r.status === 200 });
      console.log(r.status === 200
        ? '✅ o script REFEZ o detalhe sozinho — dá para buscar os que mudaram'
        : `❌ o script levou HTTP ${r.status} — o detalhe fica no clique`);
      this.baixar();
    },
    baixar() {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(OUT, null, 2)], { type: 'application/json' }));
      a.download = 'sonda_pat2.json';
      a.click();
      console.log('%c✔ sonda_pat2.json baixado — confira e mande no chat.',
                  'color:#1E6F50;font-weight:700');
    },
  };

  console.log('%csonda v2 ligada.', 'color:#2B5FC7;font-weight:700');
  console.log('1) clique em "Buscar"   2) abra UMA tarefa   3) digite  sondaPat.provar()');
})();
