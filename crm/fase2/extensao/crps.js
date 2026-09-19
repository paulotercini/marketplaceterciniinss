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

  // ── A LISTA DE TODOS OS RECURSOS ────────────────────────────────────────
  // Até 04.09 a fila saía do CRM (casos.crps_nups), ou seja, do que alguém
  // tinha digitado na ficha: 46 recursos. Recurso novo no portal ficava
  // invisível até virar digitação — justo o trabalho que o robô existe para
  // poupar. Medido no navegador do Paulo naquele dia: a MESMA base, sem o NUP
  // no fim, devolve o acervo inteiro. Eram 92, o dobro.
  //
  //   GET /api/v1/esisrec/  →  [{ proc, numProc, nb, qtdRelacionados, … }]
  //
  // NÃO sei qual campo carrega o NUP, e chutar nome de campo é como esta
  // função nasceu errada da primeira vez. Então o número é reconhecido pelo
  // FORMATO — o mesmo critério de 15 a 25 dígitos que o crm-api.js usa para
  // ler os NUPs do CRM. Campo renomeado do lado do INSS não quebra isto.
  const nupsDaLista = (lista) => {
    const fora = new Set();
    for (const item of (Array.isArray(lista) ? lista : [])) {
      if (!item || typeof item !== 'object') continue;
      for (const v of Object.values(item)) {
        const d = String(v == null ? '' : v).replace(/\D/g, '');
        if (d.length >= 15 && d.length <= 25) fora.add(d);
      }
    }
    return [...fora];
  };

  // A lista serve TAMBÉM para descobrir o crachá — e é melhor sonda que a
  // consulta por processo, porque não exige que o CRM já conheça um NUP. Em
  // 04.09 o degrau vencedor foi o `ifs_auth` CRU (o valor guardado é o próprio
  // token, não um JSON com o token dentro), que é o segundo da escada.
  async function listaDoPortal() {
    for (const c of crachas()) {
      for (const sis of SISTEMAS) {
        try {
          const r = await fetch(`/api/v1/${sis}/`, { credentials: 'include',
            headers: c ? { Authorization: 'Bearer ' + c } : {} });
          if (r.ok) {
            const nups = nupsDaLista(await r.json());
            if (nups.length) return { nups, sis, tok: c };
          }
        } catch (e) { /* sistema que não lista: segue para o próximo */ }
        await pausa(900);
      }
    }
    return { nups: [], sis: null, tok: null };
  }

  window.crmRodar = async () => {
    try {
      faixa('pedindo ao portal a lista de todos os recursos…');
      const doPortal = await listaDoPortal();

      faixa('lendo os recursos do CRM…');
      const { nups, arquivados = [], fichas } = await CRM.nupsDoCrm();

      // O CRM deixou de ser pré-requisito: se o portal listou, há o que
      // consultar mesmo que nenhuma ficha tenha NUP digitado. Só quando as
      // DUAS fontes vêm vazias é que não há trabalho — e aí a mensagem diz
      // qual das duas falhou, que é o que separa "não tenho recurso" de
      // "não estou enxergando".
      let modo = doPortal.tok;
      if (!doPortal.nups.length) {
        if (!nups.length) {
          faixaErr(fichas
            ? `o portal não devolveu a lista e nenhuma das ${fichas} fichas do CRM tem `
              + 'número de recurso — refaça o login no gov.br e clique de novo'
            : 'o portal não devolveu a lista e o CRM não devolveu ficha nenhuma — '
              + 'abra ⚙ e entre com e-mail e senha');
          return { erro: 'sem nups', fichas };
        }
        // portal mudo, CRM com NUPs: volta ao jeito antigo de achar o crachá
        let achou = false;
        for (const c of crachas()) {
          for (const sis of SISTEMAS) {
            const r = await consultar(sis, nups[0], c);
            if (r.status === 200) { modo = c; achou = true; break; }
            await pausa(1200);
          }
          if (achou) break;
        }
        if (!achou) { faixaErr('a sessão do e-Recursos não respondeu — refaça o login'); return { erro: '401' }; }
      }

      // MODO RÁPIDO: recurso que o escritório marcou 🗄 no CRM não movimenta
      // mais — no dia a dia ele fica de fora da fila (cada consulta custa
      // ~5s), e uma rodada COMPLETA semanal confere todos mesmo assim.
      const st = await chrome.storage.local.get(['ultima_crps_full']);
      const fullEm = st.ultima_crps_full ? new Date(st.ultima_crps_full).getTime() : 0;
      const rapido = !!fullEm && (Date.now() - fullEm) < 7 * 86400000;
      // A FILA agora nasce do PORTAL, não da digitação. O que o CRM conhece
      // entra junto (pode haver NUP guardado na ficha que o portal não lista
      // mais — recurso antigo, outro sistema), então a fila é a UNIÃO: nada
      // que era consultado antes deixa de ser.
      const todos = [...new Set([...doPortal.nups, ...nups])];
      const conhecidos = new Set(nups);
      const novos = doPortal.nups.filter(n => !conhecidos.has(n));
      if (doPortal.nups.length)
        faixa(`o portal lista ${doPortal.nups.length} recurso(s); o CRM conhecia `
            + `${nups.length}${novos.length ? ` — ${novos.length} novo(s)` : ''}`);
      else
        faixa(`o portal não devolveu a lista — seguindo só com os ${nups.length} do CRM`);

      const arqSet = new Set(arquivados);
      const fila = rapido ? todos.filter(n => !arqSet.has(n)) : todos;
      if (rapido && fila.length < todos.length)
        faixa(`modo rápido: ${todos.length - fila.length} recurso(s) arquivados 🗄 ficam para a rodada completa semanal`);

      const OUT = { versao: 1, quando: null, itens: {}, falhas: [],
                    // o que o portal lista hoje e o que disso o CRM não
                    // conhecia: é por aqui que recurso novo deixa de depender
                    // de alguém reparar nele
                    portal: { total: doPortal.nups.length, sistema: doPortal.sis,
                              novos } };
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
      faixaOk(`✔ ${Object.keys(OUT.itens).length} consulta(s) entregues ao CRM${rapido ? ' (modo rápido)' : ''}`
        + `${novos.length ? ` · ${novos.length} recurso(s) que o CRM ainda não conhecia` : ''}.`);
      someFaixa();
      return { ok: Object.keys(OUT.itens).length, falhas: OUT.falhas.length };
    } catch (e) { faixaErr(e.message); return { erro: e.message }; }
  };
})();
