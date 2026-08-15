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
      const { nups, arquivados = [], fichas } = await CRM.nupsDoCrm();
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

      // MODO RÁPIDO: recurso que o escritório marcou 🗄 no CRM não movimenta
      // mais — no dia a dia ele fica de fora da fila (cada consulta custa
      // ~5s), e uma rodada COMPLETA semanal confere todos mesmo assim.
      const st = await chrome.storage.local.get(['ultima_crps_full']);
      const fullEm = st.ultima_crps_full ? new Date(st.ultima_crps_full).getTime() : 0;
      const rapido = !!fullEm && (Date.now() - fullEm) < 7 * 86400000;
      const arqSet = new Set(arquivados);
      const fila = rapido ? nups.filter(n => !arqSet.has(n)) : nups;
      if (rapido && fila.length < nups.length)
        faixa(`modo rápido: ${nups.length - fila.length} recurso(s) arquivados 🗄 ficam para a rodada completa semanal`);

      const OUT = { versao: 1, quando: null, itens: {}, falhas: [] };
      let seguidas = 0, abortou = false;
      for (let i = 0; i < fila.length; i++) {
        faixa(`recurso ${i + 1} de ${fila.length}…`);
        for (const sis of SISTEMAS) {
          try {
            const r = await consultar(sis, fila[i], modo);
            if (r.ok) { OUT.itens[`${fila[i]}_${sis}`] = await r.json(); seguidas = 0; }
            else if (r.status !== 404) {
              OUT.falhas.push({ nup: fila[i], sis, status: r.status });
              if (++seguidas >= 6) { faixaErr(`o portal parou (${r.status}) — clique de novo mais tarde`); abortou = true; i = fila.length; break; }
            }
          } catch (e) { OUT.falhas.push({ nup: fila[i], sis, erro: String(e.message || e) }); }
          await pausa(2500);
        }
      }
      OUT.quando = new Date().toISOString();
      await CRM.enviar('crps', OUT);
      await chrome.storage.local.set({ ultima_crps: OUT.quando });
      // a rodada que consultou TODOS (inclusive arquivados) e chegou ao fim
      // é a que renova o ciclo semanal — abortada ou rápida não renova
      if (!rapido && !abortou)
        await chrome.storage.local.set({ ultima_crps_full: OUT.quando });
      faixaOk(`✔ ${Object.keys(OUT.itens).length} consulta(s) entregues ao CRM${rapido ? ' (modo rápido)' : ''}.`);
      someFaixa();
      return { ok: Object.keys(OUT.itens).length, falhas: OUT.falhas.length };
    } catch (e) { faixaErr(e.message); return { erro: e.message }; }
  };
})();
