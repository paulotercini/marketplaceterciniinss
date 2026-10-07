// DOSSIÊ · e-RECURSOS (CRPS) — todos os documentos de cada recurso.
//
// A mesma API e o mesmo crachá que o coletor do CRM usa (extensao/crps.js):
// GET /api/v1/{esisrec|recben}/        → a lista dos recursos
// GET /api/v1/{sis}/{nup}              → eventos[].documentos[] (nome, path)
// GET /api/v1{path}                    → o PDF
// Aqui não se filtra acórdão: desce tudo. Se a lista for do advogado (muitos
// clientes), fica só o recurso que traz o CPF do último dossiê do Meu INSS.
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
    const sessao = R.jwt(localStorage.getItem('ifs_auth')) || {};
    const cliente = st.cliente || { cpf: String(sessao.sub || '').replace(/\D/g, ''), nome: sessao.name || '' };

    D.faixa('pedindo a lista de recursos…');
    let achado = null;
    for (const tok of crachas()) {
      for (const sis of SISTEMAS) {
        try {
          const r = await fetch(`/api/v1/${sis}/`, { credentials: 'include', headers: cab(tok) });
          if (r.ok) {
            const l = R.nupsDaLista(await r.json(), cliente.cpf);
            if (l.nups.length) { achado = { tok, sis, ...l }; break; }
          }
        } catch (e) {}
        await D.pausa(900);
      }
      if (achado) break;
    }
    if (!achado) { D.faixa('o e-Recursos não devolveu recurso nenhum — refaça o login e clique de novo', '#B3261E'); return { erro: 'sem lista' }; }
    if (!achado.filtrouPorCpf && achado.nups.length > 5) {
      D.faixa(`a lista tem ${achado.nups.length} recursos e nenhum traz o CPF ${cliente.cpf || '(sem dossiê do Meu INSS)'} — `
        + 'rode antes o dossiê no Meu INSS do cliente, para eu saber de quem baixar', '#B3261E');
      return { erro: 'lista sem cpf' };
    }

    const ordem = [achado.sis, ...SISTEMAS.filter(s => s !== achado.sis)];
    let ok = 0; const falhas = [];
    for (const [i, nup] of achado.nups.entries()) {
      D.faixa(`recurso ${i + 1} de ${achado.nups.length}…`);
      let j = null;
      for (const sis of ordem) {
        const r = await fetch(`/api/v1/${sis}/${nup}`, { credentials: 'include', headers: cab(achado.tok) }).catch(() => null);
        await D.pausa(2500);
        if (r && r.ok) { j = await r.json(); break; }
      }
      if (!j) { falhas.push(`recurso ${nup}: não abriu`); continue; }
      const docs = ((j && j.eventos) || []).flatMap(ev => (ev.documentos || []).map(d => ({ ...d, data: ev.data || ev.dataEvento || '' })));
      for (const d of docs) {
        if (!d || !d.path) continue;
        const nome = `${String(d.data).slice(0, 10)} ${d.nome || 'documento'}`;
        try {
          const r = await fetch('/api/v1' + String(d.path).split('?')[0], { credentials: 'include',
            headers: cab(achado.tok, { Accept: 'application/pdf' }) });
          await D.pausa(1500);
          const u8 = r.ok ? R.comoPdf(await r.arrayBuffer()) : null;
          if (!u8) { falhas.push(`${nup} · ${nome}: ${r.ok ? 'não é PDF' : 'HTTP ' + r.status}`); continue; }
          await D.salvar(cliente, `Recursos/${nup}`, nome, u8);
          ok++;
        } catch (e) { falhas.push(`${nup} · ${nome}: ${e.message || e}`); }
      }
    }
    D.faixa(`${ok} documento(s) de ${achado.nups.length} recurso(s)`
      + (falhas.length ? `\n${falhas.length} não vieram:\n• ${falhas.slice(0, 8).join('\n• ')}` : ''),
      falhas.length ? '#9A6700' : '#1E6F50');
    return { ok, falhas };
  };
})();
