// ─────────────────────────────────────────────────────────────────────────
// SONDA DO PAT/GERID — roda no SEU navegador, na SUA sessão
//
// O QUE ELA NÃO FAZ: não gera, não guarda e não reaproveita token de
// reCAPTCHA; não faz login sozinha; não roda em servidor. O reCAPTCHA é uma
// defesa contra robô e a gente não passa por cima dela — a consulta é feita
// por VOCÊ, clicando em "Buscar" como sempre. A sonda só ESCUTA a resposta
// que a página já recebeu.
//
// PARA QUE SERVE: responder duas perguntas que decidem o projeto inteiro.
//
//   1. Qual é o formato exato da lista de requerimentos?
//   2. O DETALHE de um requerimento abre sem um novo reCAPTCHA?
//
// A segunda é a que importa. Se o detalhe abrir só com a sessão, um clique
// seu por dia traz a carteira inteira com exigências e perícias. Se exigir
// captcha novo, a lista ainda diz QUAIS mudaram — e você abre só esses, que
// é o que já faz hoje, mas sem procurar.
//
// O QUE ELA MANDA PARA MIM: só o FORMATO. Nome, CPF, data de nascimento,
// endereço, nome de arquivo e texto de comentário saem trocados por
// "‹oculto›". Códigos (PENDENTE, AGENDADO), datas e números de contagem
// ficam, porque é deles que preciso. Confira o arquivo antes de mandar.
//
// COMO USAR
//   1. Entre no PAT/GERID e faça login no gov.br normalmente.
//   2. Vá para a tela de tarefas. Aperte F12 → aba "Console".
//      (Se pedir, digite  allow pasting  e Enter.)
//   3. Cole ISTO no Console e aperte Enter. Vai aparecer "sonda ligada".
//   4. AGORA clique em "Buscar" na tela, como sempre. Se der para escolher
//      500 por página, escolha.
//   5. A sonda avisa no Console quando terminar e baixa "sonda_pat.json".
//      Mande esse arquivo no chat.
// ─────────────────────────────────────────────────────────────────────────
(() => {
  const OUT = { quando: new Date().toString(), url: location.href, capturas: [], testes: [] };

  // ── a peneira ───────────────────────────────────────────────────────────
  // Some com o conteúdo e guarda o formato. A regra é por NOME do campo
  // (qualquer coisa que cheire a pessoa) e por FORMATO do valor (o que não
  // for código, data ou número curto é tratado como texto livre e sai).
  const PESSOAL = /cpf|cnpj|nome|nasc|email|mail|telefone|celular|fone|endere|logra|bairro|munic|cep|rg\b|documento|arquivo|anexo|titulo|descri|coment|observ|justific|motivo|senha|token|assinat/i;
  const CODIGO = /^(?=.*[A-ZÇÃÕÁÉÍÓÚÂÊÔ])[A-ZÇÃÕÁÉÍÓÚÂÊÔ0-9_\- ]{2,40}$/;          // PENDENTE, CUMPRIMENTO_DE_EXIGENCIA
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
    if (PESSOAL.test(chave)) return `‹oculto ${s.length}›`;
    if (DATA.test(s))   return s;
    if (CODIGO.test(s)) return s;
    if (s.length <= 3)  return s;
    return `‹texto ${s.length}›`;
  }

  const guardar = (rotulo, url, status, corpo) => {
    let json = null;
    try { json = JSON.parse(corpo); } catch (e) {}
    const reg = { rotulo, url: url.split('?')[0], query: (url.split('?')[1] || ''),
                  status, bytes: (corpo || '').length,
                  formato: json ? peneirar(json) : '‹não era JSON›' };
    OUT.capturas.push(reg);
    console.log(`📥 ${rotulo} — HTTP ${status}, ${reg.bytes} bytes`);
    return json;
  };

  // ── escuta o que a página pede ──────────────────────────────────────────
  // Sem mexer no que ela manda: só olha a resposta de passagem.
  const ALVO = /\/apis\/(requerimentosPortalApi|tarefasApi)\//;
  let primeiraConsulta = null;

  const fetchOriginal = window.fetch;
  window.fetch = async function (...args) {
    const r = await fetchOriginal.apply(this, args);
    const url = (typeof args[0] === 'string' ? args[0] : args[0] && args[0].url) || '';
    if (ALVO.test(url)) {
      const corpo = await r.clone().text();
      const j = guardar(url.includes('/consulta') ? 'lista' : 'outro', url, r.status, corpo);
      if (!primeiraConsulta && url.includes('/consulta')) { primeiraConsulta = j; verificar(j); }
    }
    return r;
  };

  const abrirOriginal = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (m, url, ...resto) {
    this.addEventListener('load', () => {
      if (ALVO.test(url || '')) {
        const j = guardar(String(url).includes('/consulta') ? 'lista' : 'outro',
                          String(url), this.status, this.responseText);
        if (!primeiraConsulta && String(url).includes('/consulta')) { primeiraConsulta = j; verificar(j); }
      }
    });
    return abrirOriginal.call(this, m, url, ...resto);
  };

  // ── A PERGUNTA QUE DECIDE TUDO ──────────────────────────────────────────
  // O detalhe abre só com a sessão, ou pede reCAPTCHA novo? Um GET, num
  // protocolo só, o mesmo que a tela faria se você clicasse na linha.
  async function verificar(lista) {
    const proto = acharProtocolo(lista);
    if (!proto) { console.warn('⚠ não achei um protocolo na resposta — o teste do detalhe não rodou'); baixar(); return; }
    console.log('🔎 testando o detalhe de UM protocolo…');
    const rotas = [
      ['detalhe',            `/apis/requerimentosPortalApi/requerimento/ec/tarefa/${proto}`],
      ['analise-documental', `/apis/tarefasApi/tarefas/${proto}/analise-documental`],
    ];
    for (const [rotulo, caminho] of rotas) {
      try {
        const r = await fetchOriginal(caminho, { credentials: 'include' });
        const corpo = await r.text();
        guardar(rotulo, caminho, r.status, corpo);
        OUT.testes.push({ rotulo, status: r.status,
          semCaptcha: r.status === 200,
          pista: /captcha/i.test(corpo) ? 'a resposta fala em captcha' : '' });
        console.log(r.status === 200
          ? `✅ ${rotulo}: abriu SEM captcha novo`
          : `❌ ${rotulo}: HTTP ${r.status} — provavelmente exige captcha`);
      } catch (e) {
        OUT.testes.push({ rotulo, erro: String(e.message || e) });
        console.log(`❌ ${rotulo}: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 3000));   // devagar, um de cada vez
    }
    baixar();
  }

  // protocolo: uma sequência longa de dígitos em qualquer canto da resposta
  function acharProtocolo(j) {
    const visto = [];
    (function anda(v) {
      if (!v || visto.length) return;
      if (typeof v === 'string' && /^\d{10,25}$/.test(v)) { visto.push(v); return; }
      if (typeof v === 'number' && String(v).length >= 10) { visto.push(String(v)); return; }
      if (Array.isArray(v)) v.forEach(anda);
      else if (typeof v === 'object') Object.entries(v).forEach(([k, x]) => {
        if (/protocolo|nup/i.test(k) && (typeof x === 'string' || typeof x === 'number')) visto.push(String(x));
        else anda(x);
      });
    })(j);
    return visto[0];
  }

  function baixar() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(OUT, null, 2)], { type: 'application/json' }));
    a.download = 'sonda_pat.json';
    a.click();
    console.log('%c✔ sonda_pat.json baixado — confira e mande no chat.',
                'color:#1E6F50;font-weight:700');
    console.log('Resumo dos testes:', OUT.testes);
  }

  window.sondaPat = { OUT, baixar };
  console.log('%csonda ligada. Agora clique em "Buscar" na tela (500 por página, se der).',
              'color:#2B5FC7;font-weight:700');
})();
