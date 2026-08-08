// ─────────────────────────────────────────────────────────────────────────
// COLETA NO NAVEGADOR (Plano principal da sonda)
//
// Por que assim: o gov.br detecta navegador automatizado no LOGIN e barra o
// captcha — não dá para furar por fora. Mas a API de consulta, DEPOIS de
// logado, não tem captcha. Então o login é feito por VOCÊ, na mão, no seu
// navegador de sempre, e este trecho pede os dados de dentro da página já
// logada. Nenhuma automação — por isso funciona.
//
// Como usar:
//   1. No Comet (ou qualquer navegador), entre em
//      https://consultaprocessos.inss.gov.br e faça login no gov.br normalmente.
//   2. Aperte F12 → aba "Console". (Se pedir, digite  allow pasting  e Enter.)
//   3. Troque os números de exemplo abaixo pelos SEUS processos, cole tudo no
//      Console e aperte Enter.
//   4. Ao final ele baixa "sonda_resultado.json" — mande esse arquivo no chat.
// ─────────────────────────────────────────────────────────────────────────
(async () => {
  // ↓↓↓ TROQUE pelos seus processos (link ou número), um por linha ↓↓↓
  const TEXTO = `
44234156897202017
44233469639202008
`;
  const nups = [...new Set((TEXTO.match(/\d{15,25}/g) || []))];
  if (!nups.length) { alert('Cole ao menos um número de processo no TEXTO.'); return; }

  // descobre o crachá do login, como o próprio site faz
  const bruto = localStorage.getItem('ifs_auth');
  const cands = [null];
  if (bruto) { cands.push(bruto); try { const j = JSON.parse(bruto);
    ['access_token','accessToken','token','id_token','jwt'].forEach(k => {
      if (typeof j[k] === 'string') cands.push(j[k]); }); } catch (e) {} }

  const pausa = ms => new Promise(r => setTimeout(r, ms));
  const out = { quando: new Date().toString(), navegador: navigator.userAgent, itens: {} };
  const consultar = async (sis, nup, tok) => {
    const r = await fetch(`/api/v1/${sis}/${nup}`, {
      credentials: 'include', headers: tok ? { Authorization: 'Bearer ' + tok } : {} });
    return { status: r.status, body: await r.text() };
  };

  // acha o modo de autenticação com o primeiro processo
  let modo, modoIdx = -1;
  for (let i = 0; i < cands.length && modoIdx < 0; i++)
    for (const sis of ['esisrec','recben']) {
      const r = await consultar(sis, nups[0], cands[i]);
      if (r.status === 200) { modo = cands[i]; modoIdx = i; break; }
      await pausa(1500);
    }
  out.autenticacao = ['cookie da sessao','localStorage cru','campo do JSON'][Math.min(modoIdx,2)] || 'nenhum deu 200';
  console.log('Autenticação:', out.autenticacao);

  // consulta cada processo nos dois sistemas, devagar
  for (const nup of nups)
    for (const sis of ['esisrec','recben']) {
      const r = await consultar(sis, nup, modo);
      out.itens[`${nup}_${sis}`] = r;
      console.log(nup, sis, 'HTTP', r.status, `(${(r.body||'').length} bytes)`);
      await pausa(4000);
    }

  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'sonda_resultado.json'; a.click();
  console.log('PRONTO! Baixou sonda_resultado.json — mande esse arquivo no chat.');
})();
