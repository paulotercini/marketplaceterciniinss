// e-RECURSOS (CRPS) — este roda inteiro no clique.
//
// Aqui não há captcha depois do login: a API de consulta responde com a
// sessão que você já abriu. Por isso este é o botão que faz tudo sozinho —
// pega no CRM os processos que precisam ser olhados, consulta um por um e
// entrega o resultado.
(() => {
  if (window !== window.top) return;      // só o quadro de cima coleta (a reinjeção vai a todos)
  if (window.__crmColetorNoAr) return;
  window.__crmColetorNoAr = true;

  const SISTEMAS = ['esisrec', 'recben'];
  // "dd/mm/aaaa[ hh:mm[:ss]]" → "aaaa-mm-ddThh:mm:ss" (comparável como texto); outro formato passa como veio
  const isoBr = v => { const m = String(v || '').match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\D+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
    return m ? `${m[3]}-${m[2]}-${m[1]}T${m[4] || '00'}:${m[5] || '00'}:${m[6] || '00'}` : String(v || ''); };

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
  // 1.30.0 · o portal tem duas bases (e-Sisrec e o RecBen, o sistema antigo) e
  // cada uma lista só os seus recursos: a lista é a UNIÃO das duas, e cada
  // NUP guarda a base que o listou, para a consulta ir direto a ela
  async function listaDoPortal() {
    for (const c of crachas()) {
      const de = new Map(), porSis = {};
      for (const sis of SISTEMAS) {
        try {
          const r = await fetch(`/api/v1/${sis}/`, { credentials: 'include',
            headers: c ? { Authorization: 'Bearer ' + c } : {} });
          if (r.ok) {
            const ns = nupsDaLista(await r.json());
            porSis[sis] = ns.length;
            for (const n of ns) if (!de.has(n)) de.set(n, sis);
          }
        } catch (e) { /* base que não lista: segue para a outra */ }
        await pausa(900);
      }
      if (de.size) return { nups: [...de.keys()], de, porSis, tok: c,
                            sis: SISTEMAS.filter(s => porSis[s]).join('+') };
    }
    return { nups: [], de: new Map(), porSis: {}, sis: null, tok: null };
  }

  // 1.34.0 · `cliente`: o login é o gov.br do próprio cliente (pedido do Paulo, 06.11.2026), para o
  // recurso fora da procuração. A fila é SÓ a lista que esse login enxerga: os NUPs dos outros
  // clientes dariam 401/403, e seis recusas seguidas abortavam a rodada antes de chegar aos dele.
  // duas rodadas na mesma aba dobram o ritmo de pedidos ao portal, que é o que as
  // pausas existem para evitar; a segunda chamada é recusada, não enfileirada
  let rodando = false;
  window.crmRodar = async (_desde, opts) => {
    if (rodando) { faixa('já há uma coleta em andamento nesta aba — aguarde a faixa terminar'); return { erro: 'já está rodando nesta aba' }; }
    rodando = true;
    try { return await rodarDeVerdade(opts); } finally { rodando = false; }
  };
  async function rodarDeVerdade(opts = {}) {
    const cliente = !!(opts && opts.cliente);
    try {
      faixa('pedindo ao portal a lista de todos os recursos…');
      const doPortal = await listaDoPortal();

      faixa('lendo os recursos do CRM…');
      const { nups, arquivados = [], fichas } = await CRM.nupsDoCrm();
      if (cliente && !doPortal.nups.length) {
        faixaErr('o portal não listou recurso nenhum para este login — confira se entrou com o gov.br do cliente');
        return { erro: 'sem recurso no login do cliente' };
      }

      // O CRM deixou de ser pré-requisito: se o portal listou, há o que
      // consultar mesmo que nenhuma ficha tenha NUP digitado. Só quando as
      // DUAS fontes vêm vazias é que não há trabalho — e aí a mensagem diz
      // qual das duas falhou, que é o que separa "não tenho recurso" de
      // "não estou enxergando".
      let modo = doPortal.tok;
      // 1.33.1 · o portal renova o ifs_auth na página durante a rodada longa (desde a 1.32 baixa
      // todos os documentos): o crachá fixado no início vencia por volta do 28º recurso (401).
      // Cada consulta relê o crachá do mesmo degrau da escada.
      const grau = () => crachas().indexOf(modo);
      let deg = -1;
      const cracha = () => (deg < 0 ? modo : (crachas()[deg] ?? modo));
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
      const st = await chrome.storage.local.get(['ultima_crps_full', 'crps_404', 'crps_403', 'crps_ultimo']);
      const fullEm = st.ultima_crps_full ? new Date(st.ultima_crps_full).getTime() : 0;
      const rapido = !cliente && !!fullEm && (Date.now() - fullEm) < 7 * 86400000;
      // A FILA agora nasce do PORTAL, não da digitação. O que o CRM conhece
      // entra junto (pode haver NUP guardado na ficha que o portal não lista
      // mais — recurso antigo, outro sistema), então a fila é a UNIÃO: nada
      // que era consultado antes deixa de ser.
      const todos = cliente ? doPortal.nups : [...new Set([...doPortal.nups, ...nups])];
      const conhecidos = new Set(nups);
      const novos = doPortal.nups.filter(n => !conhecidos.has(n));
      if (doPortal.nups.length)
        faixa(`o portal lista ${doPortal.nups.length} recurso(s) (`
            + SISTEMAS.map(s => `${s === 'recben' ? 'RecBen' : 'e-Sisrec'} ${doPortal.porSis[s] || 0}`).join(', ')
            + `); o CRM conhecia `
            + `${nups.length}${novos.length ? ` — ${novos.length} novo(s)` : ''}`);
      else
        faixa(`o portal não devolveu a lista — seguindo só com os ${nups.length} do CRM`);

      const arqSet = new Set(arquivados);
      // NUP que as DUAS bases disseram não existir (404) na rodada anterior e que o portal
      // continua sem listar: custava duas consultas e 5 s por rodada, para sempre. Fica
      // para a rodada completa semanal, como os 🗄
      const sem404 = new Set((Array.isArray(st.crps_404) ? st.crps_404 : []).filter(n => !doPortal.de.has(n)));
      // 1.39.0 · o NUP que as DUAS bases recusaram (403) também fica para a completa semanal:
      // não é do escritório, e custava duas consultas e 5 s por rodada
      const sem403 = new Set(Array.isArray(st.crps_403) ? st.crps_403 : []);
      const deFora = n => arqSet.has(n) || sem404.has(n) || sem403.has(n);
      // 1.39.0 · memória do último evento de cada recurso: o recurso nunca consultado vem
      // primeiro, depois o de movimento mais recente (o que mais provavelmente andou)
      const memo = (st.crps_ultimo && typeof st.crps_ultimo === 'object') ? { ...st.crps_ultimo } : {};
      const prio = ns => ns.map((n, k) => [n, k]).sort(([a, ka], [b, kb]) =>
        (!memo[a] !== !memo[b]) ? (memo[a] ? 1 : -1)
          : (String((memo[b] || {}).d || '').localeCompare(String((memo[a] || {}).d || '')) || ka - kb)).map(([n]) => n);
      // na rodada completa, os arquivados vão para o FIM da fila: se o portal parar no
      // meio, a interrupção atinge só eles (mesmas consultas, em outra ordem)
      // 1.39.1 · na completa, o NUP que o portal já recusou (403) ou não achou (404) vai
      // antes só dos arquivados: na frente, três recusados somavam seis 403 e abortavam a
      // rodada no recurso 3, e a completa abortada nunca renovava o ciclo semanal
      const fila = rapido ? prio(todos.filter(n => !deFora(n)))
        : [...prio(todos.filter(n => !deFora(n))),
           ...todos.filter(n => !arqSet.has(n) && deFora(n)), ...todos.filter(n => arqSet.has(n))];
      if (rapido && fila.length < todos.length)
        faixa(`modo rápido: ${todos.length - fila.length} recurso(s) arquivados 🗄 ou que o portal não acha ficam para a rodada completa semanal`);
      else if (!rapido && !cliente && todos.some(n => arqSet.has(n)))
        faixa(`rodada completa semanal: inclui ${todos.filter(n => arqSet.has(n)).length} arquivado(s) 🗄, por último`);

      const OUT = { versao: 1, quando: null, itens: {}, falhas: [],
                    // o que o portal lista hoje e o que disso o CRM não
                    // conhecia: é por aqui que recurso novo deixa de depender
                    // de alguém reparar nele
                    portal: { total: doPortal.nups.length, sistema: doPortal.sis,
                              por_sistema: doPortal.porSis, novos },
                    ...(cliente ? { login: 'cliente' } : {}) };
      let seguidas = 0, abortou = false, parou = '', docsFaltando = 0;
      const novos404 = [], novos403 = [];
      // 1.39.0 · entrega em etapas: o recurso que andou desde a última rodada (ou nunca lido)
      // vai ao CRM na hora; os outros, de 10 em 10. A entrega final leva o resto e o `portal`
      const cab = { versao: 1, ...(cliente ? { login: 'cliente' } : {}) };
      let pend = {}, lotes = 0, entregues = 0;
      const entregar = async its => {
        try { await CRM.enviar('crps', { ...cab, quando: new Date().toISOString(), itens: its, falhas: [], parcial: true });
              lotes++; entregues += Object.keys(its).length; return true; }
        catch (e) { Object.assign(pend, its); return false; }   // não entregou: vai na entrega final
      };
      // seis respostas ruins seguidas (recusa, rede caída, página que não é JSON): o portal
      // parou, e insistir na fila inteira só soma pedidos sem coletar nada
      const desistir = (i, motivo) => {
        parou = `o portal parou no recurso ${i + 1} de ${fila.length} (${motivo})`;
        faixaErr(`${parou} — o que foi lido vai ao CRM; clique de novo mais tarde`);
        abortou = true;
      };
      // [03.10.2026] cada recurso vive num sistema só: o que a lista do
      // portal indicou vem primeiro, e achado o recurso não se consulta o
      // outro — antes eram duas consultas (e duas pausas) por recurso
      deg = grau();
      const primeiro = SISTEMAS.find(s => doPortal.porSis[s]);
      for (let i = 0; i < fila.length; i++) {
        faixa(`recurso ${i + 1} de ${fila.length}…`);
        const lst = doPortal.de.get(fila[i]) || primeiro;
        const ordem = lst ? [lst, ...SISTEMAS.filter(s => s !== lst)] : SISTEMAS;
        let n404 = 0, n403 = 0;
        for (const sis of ordem) {
          try {
            const r = await consultar(sis, fila[i], cracha());
            if (r.ok) {
              const j = await r.json();
              // F184 · os documentos descem na hora, com o mesmo crachá da consulta;
              // desde a 1.32.0 todos, e não só acórdão e monocrática (cópia integral)
              const docs = ((j && j.eventos) || []).flatMap(ev => ev.documentos || [])
                .filter(d => d && d.path);
              // a pasta do recurso listada de uma vez (só o Supabase) poupa uma ida ao banco
              // por documento; se a listagem falhar, volta à conferência um a um
              let existentes = null;
              try { existentes = new Set((await CRM.pedir({ tipo: 'crm', acao: 'docs-existentes',
                prefixo: `crps/${fila[i]}/` })).nomes); } catch (e) {}
              await CRM.guardarDocs('crps', fila[i], docs, { todos: true, existentes,
                baixar: d => fetch('/api/v1' + String(d.path).split('?')[0], { credentials: 'include',
                  headers: Object.assign({ Accept: 'application/pdf' }, cracha() ? { Authorization: 'Bearer ' + cracha() } : {}) }) });
              // o documento que o portal recusou fica sem `caminho`: antes sumia sem registro
              const faltou = docs.filter(d => !d.caminho).length;
              if (faltou) { docsFaltando += faltou; OUT.falhas.push({ nup: fila[i], sis, docs_faltando: faltou }); }
              const evs = (j && j.eventos) || [];
              const dt = evs.map(ev => isoBr(ev && ev.data)).filter(Boolean).sort().pop() || '';
              const sig = `${dt}|${evs.length}|${docs.length}`;
              const andou = !memo[fila[i]] || memo[fila[i]].s !== sig;
              memo[fila[i]] = { d: dt, s: sig };
              const k = `${fila[i]}_${sis}`;
              if (andou && await entregar({ [k]: j })) {}
              else if (!andou) {
                pend[k] = j;
                if (Object.keys(pend).length >= 10) { const lote = pend; pend = {}; await entregar(lote); }
              }
              seguidas = 0; await pausa(2500); break;
            }
            else if (r.status === 403) {   // conta para desistir só no fim do recurso (abaixo)
              n403++;
              OUT.falhas.push({ nup: fila[i], sis, status: 403 });
            }
            else if (r.status !== 404) {
              OUT.falhas.push({ nup: fila[i], sis, status: r.status });
              if (++seguidas >= 6) { desistir(i, r.status); break; }
            }
            else n404++;
          } catch (e) {
            OUT.falhas.push({ nup: fila[i], sis, erro: String(e.message || e) });
            if (++seguidas >= 6) { desistir(i, 'sem resposta'); break; }
          }
          await pausa(2500);
        }
        if (abortou) break;
        if (n404 === ordem.length) novos404.push(fila[i]);
        if (n403 === ordem.length) {
          novos403.push(fila[i]);
          // 1.39.1 · o recurso recusado nas duas bases conta UMA vez, e o já sabido recusado
          // não conta: o portal parado recusa recursos que antes respondiam
          if (!sem403.has(fila[i]) && ++seguidas >= 6) { desistir(i, 403); break; }
        }
      }
      OUT.quando = new Date().toISOString();
      OUT.itens = pend;
      if (lotes) OUT.lotes = lotes;
      await CRM.enviar('crps', OUT);
      await chrome.storage.local.set({ crps_ultimo: memo });
      await chrome.storage.local.set({ ultima_crps: OUT.quando });
      // a rodada que consultou TODOS (inclusive arquivados) e chegou ao fim
      // é a que renova o ciclo semanal — abortada ou rápida não renova
      if (!rapido && !abortou && !cliente)
        await chrome.storage.local.set({ ultima_crps_full: OUT.quando });
      // a completa que chegou ao fim refaz a lista dos que o portal não acha; a rápida e a
      // abortada só acrescentam (o login do cliente não enxerga os outros: não conta)
      if (!cliente)
        await chrome.storage.local.set({
          crps_404: (rapido || abortou) ? [...new Set([...sem404, ...novos404])] : novos404,
          crps_403: (rapido || abortou) ? [...new Set([...sem403, ...novos403])] : novos403 });
      const n = entregues + Object.keys(OUT.itens).length;
      // a rodada que parou no meio não é anunciada como concluída: a faixa vermelha fica, e
      // o retorno leva `erro` (é por ele que o popup e o aviso do Chrome trocam ✔ por ⚠)
      if (abortou) return { ok: n, falhas: OUT.falhas.length, erro: parou };
      const resumo = `${n} consulta(s) entregues ao CRM${rapido ? ' (modo rápido)' : ''}${cliente ? ' (login do cliente)' : ''}`
        + `${novos.length ? ` · ${novos.length} recurso(s) que o CRM ainda não conhecia` : ''}`;
      if (OUT.falhas.length) {
        faixa(`⚠ rodada PARCIAL: ${resumo} · ${OUT.falhas.length} falha(s)`
          + `${docsFaltando ? ` · ${docsFaltando} documento(s) não desceram` : ''} — rode de novo mais tarde.`, '#B4530A');
        someFaixa(15000);
        return { ok: n, falhas: OUT.falhas.length, parcial: true };
      }
      faixaOk(`✔ ${resumo}.`);
      someFaixa();
      return { ok: n, falhas: 0 };
    } catch (e) { faixaErr(e.message); return { erro: e.message }; }
  }
})();
