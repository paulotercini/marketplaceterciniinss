// e-RECURSOS (CRPS) — este roda inteiro no clique.
//
// Aqui não há captcha depois do login: a API de consulta responde com a
// sessão que você já abriu. Por isso este é o botão que faz tudo sozinho —
// pega no CRM os processos que precisam ser olhados, consulta um por um e
// entrega o resultado.
(() => {
  const SISTEMAS = ['esisrec', 'recben'];

  function crachas() {
    const fora = [null];
    const bruto = localStorage.getItem('ifs_auth');
    if (!bruto) return fora;
    fora.push(bruto);
    try {
      const j = JSON.parse(bruto);
      for (const k of ['access_token', 'accessToken', 'token', 'id_token', 'jwt'])
        if (typeof j[k] === 'string') fora.push(j[k]);
    } catch (e) {}
    return fora;
  }

  const consultar = (sis, nup, tok) => fetch(`/api/v1/${sis}/${nup}`, {
    credentials: 'include', headers: tok ? { Authorization: 'Bearer ' + tok } : {} });

  window.crmRodar = async () => {
    try {
      faixa('lendo os recursos do CRM…');
      const { nups, fichas } = await CRM.nupsDoCrm();
      if (!nups.length) {
        // as duas causas possíveis dizem coisas opostas, e o número de fichas
        // lidas separa uma da outra sem precisar de console
        faixaErr(fichas
          ? `li ${fichas} fichas do CRM e nenhuma tem número de recurso — na ficha, `
            + 'em "números de recurso deste caso", use o ＋ para informar o NUP'
          : 'o CRM não devolveu ficha nenhuma — abra ⚙ e entre com e-mail e senha');
        return { erro: 'sem nups', fichas };
      }

      // descobre como esta sessão se identifica, usando o primeiro processo
      let modo = null, achou = false;
      for (const c of crachas()) {
        for (const sis of SISTEMAS) {
          const r = await consultar(sis, nups[0], c);
          if (r.status === 200) { modo = c; achou = true; break; }
          await pausa(1200);
        }
        if (achou) break;
      }
      if (!achou) { faixaErr('a sessão do e-Recursos não respondeu — refaça o login'); return { erro: '401' }; }

      const OUT = { versao: 1, quando: null, itens: {}, falhas: [] };
      let seguidas = 0;
      for (let i = 0; i < nups.length; i++) {
        faixa(`recurso ${i + 1} de ${nups.length}…`);
        for (const sis of SISTEMAS) {
          try {
            const r = await consultar(sis, nups[i], modo);
            if (r.ok) { OUT.itens[`${nups[i]}_${sis}`] = await r.json(); seguidas = 0; }
            else if (r.status !== 404) {
              OUT.falhas.push({ nup: nups[i], sis, status: r.status });
              if (++seguidas >= 6) { faixaErr(`o portal parou (${r.status}) — clique de novo mais tarde`); i = nups.length; break; }
            }
          } catch (e) { OUT.falhas.push({ nup: nups[i], sis, erro: String(e.message || e) }); }
          await pausa(2500);
        }
      }
      OUT.quando = new Date().toISOString();
      await CRM.enviar('crps', OUT);
      await chrome.storage.local.set({ ultima_crps: OUT.quando });
      faixaOk(`✔ ${Object.keys(OUT.itens).length} consulta(s) entregues ao CRM.`);
      someFaixa();
      return { ok: Object.keys(OUT.itens).length, falhas: OUT.falhas.length };
    } catch (e) { faixaErr(e.message); return { erro: e.message }; }
  };
})();
