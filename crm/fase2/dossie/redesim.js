// DOSSIÊ · REDESIM "Minhas Empresas" — os CNPJs em que o CPF logado é sócio,
// titular ou responsável (consultacnpj.redesim.gov.br/minhas-empresas).
//
// Mapeado em 11.10.2026 no código do portal. A consulta por CPF
// (GET consultacnpj/api/cnpj/<serviço>/<cpf>?nomeUsuario=…) leva, além do
// crachá do gov.br (localStorage al-auth-token), um token de hCaptcha
// invisível que a página só gera quando UMA PESSOA clica em "PESQUISAR".
// A extensão não resolve nem reaproveita captcha: ela abre a tela, pede o
// clique, e quando a resposta chega a captura — mesmo desenho do PAT na
// extensão do CRM. O comprovante de inscrição de cada CNPJ também é
// protegido por captcha e fica de fora; a lista responde à pergunta que
// importa ("tem CNPJ no nome? desde quando? ativo?").
//
// Roda no mundo da PÁGINA (para enxergar o fetch); entrega ao mundo isolado
// (redesim-ponte.js) por postMessage, que grava e manda o resumo ao CRM.
(() => {
  if (window !== window.top || window.__dossieRedesim) return;
  window.__dossieRedesim = true;

  const faixa = (texto, cor) => {
    let el = document.getElementById('dossie-faixa');
    if (!el) {
      el = document.createElement('div');
      el.id = 'dossie-faixa';
      el.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483647;padding:12px 16px;'
        + 'border-radius:10px;font:600 14px system-ui;color:#fff;box-shadow:0 4px 16px rgba(0,0,0,.25);white-space:pre-line';
      document.body.appendChild(el);
    }
    el.style.background = cor || '#2B5FC7';
    el.textContent = '📂 Dossiê · ' + texto;
  };

  const dataBr = v => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v || ''); };
  const rot = v => (v && typeof v === 'object' && !Array.isArray(v)) ? (v.descricao || v.nome || v.codigo || JSON.stringify(v)) : (v == null ? '' : String(v));
  // campos como o portal devolveu em 11.10.2026 (CNPJ, NM_EMPRESARIAL, NM_FANTASIA,
  // CD_SITUACAO_CADASTRAL{descricao}, IN_ESTABELECIMENTO_MATRIZ{descricao}, NM_MUNICIPIO,
  // NM_SIGLA_UF, VINCULO, QUALIFICACAO, valorCapitalSocial); o que sobrar sai cru
  const cnpjFmt = v => String(v || '').replace(/\D/g, '').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') || '?';
  const CONHECIDOS = ['CNPJ', 'cnpj', 'NM_EMPRESARIAL', 'NM_FANTASIA', 'CD_SITUACAO_CADASTRAL', 'IN_ESTABELECIMENTO_MATRIZ',
    'NM_MUNICIPIO', 'NM_SIGLA_UF', 'CD_MUNICIPIO', 'VINCULO', 'vinculo', 'QUALIFICACAO', 'valorCapitalSocial'];
  function texto(cpf, nome, lista) {
    const out = [`CNPJs VINCULADOS AO CPF (Redesim · Minhas Empresas) — ${nome || ''}`.trim(), `Consulta em ${new Date().toLocaleDateString('pt-BR')}`, ''];
    if (!lista.length) out.push('Nenhum CNPJ vinculado a este CPF na data da consulta.');
    for (const e of lista) {
      out.push(`CNPJ ${cnpjFmt(e.CNPJ || e.cnpj)} · ${rot(e.NM_EMPRESARIAL || e.nomeEmpresarial || e.razaoSocial) || '?'}${e.NM_FANTASIA ? ` (fantasia: ${e.NM_FANTASIA})` : ''}`);
      out.push(`  Situação cadastral: ${rot(e.CD_SITUACAO_CADASTRAL) || '?'} · ${rot(e.IN_ESTABELECIMENTO_MATRIZ) || ''} · ${e.NM_MUNICIPIO || ''}/${e.NM_SIGLA_UF || ''}`);
      out.push(`  Vínculo do CPF: ${rot(e.VINCULO || e.vinculo) || '?'}${e.QUALIFICACAO ? ` · qualificação: ${e.QUALIFICACAO}` : ''}`);
      if (e.valorCapitalSocial) out.push(`  Capital social: ${e.valorCapitalSocial}`);
      for (const [k, v] of Object.entries(e)) {
        if (CONHECIDOS.includes(k) || v == null || v === '') continue;
        out.push(`  ${k}: ${Array.isArray(v) ? v.map(rot).join('; ') : (/^\d{4}-\d{2}-\d{2}/.test(String(v)) ? dataBr(v) : rot(v))}`);
      }
      out.push('');
    }
    out.push('', '--- dados brutos do portal ---', JSON.stringify(lista, null, 2));
    return out.join('\n');
  }

  // o gancho: a resposta da consulta por CPF passa por aqui
  const fetch0 = window.fetch;
  window.fetch = async function (url, opts) {
    const r = await fetch0.apply(this, arguments);
    try {
      const u = String(url && url.url || url);
      const m = u.match(/consultacnpj\/api\/cnpj\/([^/?]+)\/(\d{11})\?nomeUsuario=([^&]*)/);
      if (m) {
        const cpf = m[2], nome = decodeURIComponent(m[3] || '').replace(/\+/g, ' ');
        const j = await r.clone().json().catch(() => null);
        const lista = (j && Array.isArray(j.data)) ? j.data : [];
        if (!r.ok || (j && j.errors && j.errors.length)) {
          faixa(`o portal recusou a consulta (${r.status}${j && j.errors ? ': ' + j.errors.map(rot).join('; ') : ''}) — clique em PESQUISAR de novo`, '#B3261E');
        } else {
          faixa(`${lista.length} CNPJ(s) na lista — gravando…`);
          window.postMessage({ dossieRedesim: { cpf, nome, lista, texto: texto(cpf, nome, lista) } }, location.origin);
        }
      }
    } catch (e) { faixa('não consegui ler a resposta: ' + (e.message || e), '#B3261E'); }
    return r;
  };

  if (!/\/minhas-empresas/.test(location.pathname)) {
    faixa('abrindo "Minhas Empresas"…');
    location.href = '/minhas-empresas';
  } else {
    // filtros em TODOS / Todas / Todas UF (os selects são do React: valor pelo
    // setter nativo + change). Com "Escolha…" o portal consulta só um recorte.
    const setSel = (sel, pred) => {
      const o = [...sel.options].find(pred); if (!o) return;
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(sel, o.value);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const tentar = (n = 0) => {
      const sels = [...document.querySelectorAll('select')];
      if (!sels.length && n < 20) return setTimeout(() => tentar(n + 1), 500);
      for (const s of sels) {
        const t = s.innerText;
        if (/MEMBRO DO QUADRO/.test(t)) setSel(s, o => /^TODOS$/i.test(o.text.trim()));
        else if (/Baixada/.test(t)) setSel(s, o => /^Todas$/i.test(o.text.trim()));
        else if (/Domiciliadas/.test(t)) setSel(s, o => /Todas UF/i.test(o.text));
      }
      faixa('filtros em TODOS — agora clique em PESQUISAR (o portal pede o seu clique por causa do captcha); depois a lista é gravada sozinha', '#9A6700');
    };
    tentar();
  }
})();
