// DOSSIÊ · e-RECURSOS (CRPS) — todos os documentos de cada recurso.
//
// A mesma API e o mesmo crachá que o coletor do CRM usa (extensao/crps.js):
// GET /api/v1/{esisrec|recben}/        → a lista dos recursos
// GET /api/v1/{sis}/{nup}              → eventos[].documentos[] (nome, path)
// GET /api/v1{path}                    → o PDF
// Aqui não se filtra acórdão: desce tudo. Se a lista for do advogado (muitos
// clientes), fica só o recurso que traz o CPF do último dossiê do Meu INSS.
// O cliente guardado só vale com o CPF dele na lista ou na sessão (R.clienteDoRecurso):
// sem isso os recursos de um iam para a ficha do cliente anterior.
(() => {
  if (window !== window.top) return;
  const R = window.DOSSIE_REGRAS, D = window.DOSSIE;
  const SISTEMAS = ['esisrec', 'recben'];

  // a escada de crachás do crps.js: sem cabeçalho, o ifs_auth cru, o token dentro dele
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
  const cab = (tok, extra) => Object.assign({}, extra, tok ? { Authorization: 'Bearer ' + tok } : {});

  window.dossieRodar = async () => {
    const st = await chrome.storage.local.get(['cliente']);
    const jwt = R.jwt(localStorage.getItem('ifs_auth')) || {};
    const sessao = { cpf: String(jwt.sub || '').replace(/\D/g, ''), nome: jwt.name || '' };
    // provisório (quem decide é a lista): o guardado só quando é a própria sessão, porque
    // "não há processos para você" fala de quem está logado, e não do cliente anterior
    let cliente = st.cliente && st.cliente.cpf === sessao.cpf ? st.cliente : sessao;

    D.faixa('pedindo a lista de recursos…');
    let achado = null, vazia = false, semDono = 0;
    for (const [degrau, tok] of crachas().entries()) {
      for (const sis of SISTEMAS) {
        try {
          const r = await fetch(`/api/v1/${sis}/`, { credentials: 'include', headers: cab(tok) });
          if (r.ok) {
            const lista = await r.json();
            if (tok && Array.isArray(lista) && !lista.length) vazia = true;   // logado e a lista veio vazia
            const l = R.clienteDoRecurso(lista, st.cliente, sessao);
            if (l.cliente && l.nups.length) { cliente = l.cliente; achado = { degrau, sis, ...l }; break; }
            semDono = Math.max(semDono, l.nups.length);
          }
        } catch (e) {}
        await D.pausa(900);
      }
      if (achado) break;
    }
    // lista sem o CPF do cliente guardado nem o da sessão: não se adivinha de quem é,
    // qualquer que seja o tamanho (até 5 recursos passavam e iam à ficha do cliente anterior)
    if (!achado && semDono) {
      D.faixa(`a lista tem ${semDono} recurso(s) e nenhum traz o CPF ${(st.cliente && st.cliente.cpf) || sessao.cpf || '(sem dossiê do Meu INSS)'} — `
        + 'rode antes o dossiê no Meu INSS do cliente, para eu saber de quem baixar', '#B3261E');
      return { erro: 'lista sem cpf' };
    }
    // "Não foram encontrados processos para você." é fato negativo (sem recurso), e não falha de login
    if (!achado && (vazia || /n[aã]o foram encontrados processos/i.test(document.body.innerText || ''))) {
      const inexistentes = ['e-Recursos: o segurado não tem recurso ao CRPS'];
      // F590: sem CPF da sessão o fato negativo não vai a ficha nenhuma (cpf vazio casaria com ficha errada)
      const avisoCrm = cliente.cpf ? await D.resumo(cliente, 'recursos', { baixados: [], inexistentes, falhas: [] })
        : '\n(resumo no CRM: sem CPF da sessão; rode antes o Meu INSS do cliente)';
      D.faixa(`0 documento(s) do e-Recursos\n• ${inexistentes[0]}` + avisoCrm, '#9A6700');
      return { ok: 0, falhas: [] };
    }
    if (!achado) { D.faixa('o e-Recursos não devolveu recurso nenhum — refaça o login e clique de novo', '#B3261E'); return { erro: 'sem lista' }; }

    const ordem = [achado.sis, ...SISTEMAS.filter(s => s !== achado.sis)];
    const ok = [], falhas = [];
    // o ifs_auth gira no meio da rodada: cada pedido relê o MESMO degrau da escada;
    // as pausas (2,5 s e 1,5 s) correm junto com a gravação (R.filaDePedidos)
    const tok = () => crachas()[achado.degrau];
    const pedir = R.filaDePedidos(D.pausa);
    for (const [i, nup] of achado.nups.entries()) {
      D.faixa(`recurso ${i + 1} de ${achado.nups.length}…`);
      let j = null;
      for (const sis of ordem) {
        const r = await pedir(2500, () => fetch(`/api/v1/${sis}/${nup}`, { credentials: 'include', headers: cab(tok()) }).catch(() => null));
        if (r && r.ok) { j = await r.json(); break; }
      }
      if (!j) { falhas.push(`recurso ${nup}: não abriu`); continue; }
      const docs = ((j && j.eventos) || []).flatMap(ev => (ev.documentos || []).map(d => ({ ...d, data: ev.data || ev.dataEvento || '' })));
      for (const d of docs) {
        if (!d || !d.path || pedir.caiu) continue;
        const nome = `${String(d.data).slice(0, 10)} ${d.nome || 'documento'}`;
        try {
          const r = await pedir(1500, () => fetch('/api/v1' + String(d.path).split('?')[0], { credentials: 'include',
            headers: cab(tok(), { Accept: 'application/pdf' }) }), false);   // 401 do documento pode ser recusa dele, e não da sessão
          const u8 = r.ok ? R.comoPdf(await r.arrayBuffer()) : null;
          if (!u8) { falhas.push(`${nup} · ${nome}: ${r.ok ? 'não é PDF' : 'HTTP ' + r.status}`); continue; }
          await D.salvar(cliente, `Recursos/${nup}`, nome, u8);
          ok.push(`${nup} · ${nome}`);
        } catch (e) { falhas.push(`${nup} · ${nome}: ${e.message || e}`); }
      }
    }
    if (pedir.caiu) falhas.push(R.SESSAO_CAIU);
    const avisoCrm = await D.resumo(cliente, 'recursos', { baixados: ok, inexistentes: [], falhas });
    D.faixa(`${ok.length} documento(s) de ${achado.nups.length} recurso(s)`
      + (falhas.length ? `\n${falhas.length} não vieram:\n• ${falhas.slice(0, 8).join('\n• ')}` : '') + avisoCrm,
      falhas.length ? '#9A6700' : '#1E6F50');
    return { ok: ok.length, falhas };
  };
})();
