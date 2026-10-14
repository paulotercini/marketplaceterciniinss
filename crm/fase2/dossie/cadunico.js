// DOSSIÊ · CADÚNICO (cadunico.dataprev.gov.br, app "Meu CadÚnico") — a ficha
// completa da família, o comprovante de cadastro, membros e renda.
//
// Mapeado em 13.10.2026 no código do portal (static/js + config/env.js):
//   crachá: localStorage "token" (Bearer) + cabeçalho CnasVersao (env.REACT_APP__VERSION)
//   GET pessoa/{cpf}/tipos-perfil                      → [{tipoPerfil{codigo}, numeroFamiliar, identificador…}]
//   GET pdf/{cpf}/{numeroFamiliar}/exportar-consulta-completa     → a FICHA COMPLETA (PDF)
//   GET pdf/{numeroFamiliar}/comprovante-cadastro/{identificador}/{cpf}?representanteLegal=false → comprovante
//   GET familia/{numeroFamiliar}/membros · renda/familia/{numeroFamiliar} · pessoa/{id}/dados-familia → JSON
// Base: https://cadunico.dataprev.gov.br/transacional/api + /transacional-api/v1/…
// Sem captcha nestas chamadas (o reCAPTCHA do portal é só do pré-cadastro).
// Ainda não rodou numa sessão logada: nome de campo que divergir cai no .txt cru.
(() => {
  if (window !== window.top) return;
  const R = window.DOSSIE_REGRAS, D = window.DOSSIE;
  const API = 'https://cadunico.dataprev.gov.br/transacional/api/transacional-api/v1/';

  window.dossieRodar = async () => {
    const tok = localStorage.getItem('token');
    if (!tok || !tok.trim()) { D.faixa('não achei a sessão do CadÚnico — entre com o gov.br e clique de novo', '#B3261E'); return { erro: 'sem sessão' }; }
    const jwt = R.jwt(tok) || {};
    const st = await chrome.storage.local.get(['cliente']);
    let cpf = String(jwt.sub || jwt.preferred_username || jwt.cpf || '').replace(/\D/g, '');     // gov.br: sub = CPF (13.10.2026)
    if (cpf.length !== 11) cpf = (st.cliente && st.cliente.cpf) || '';
    if (cpf.length !== 11) { D.faixa('não achei o CPF do cidadão — rode antes o dossiê no Meu INSS', '#B3261E'); return { erro: 'sem cpf' }; }
    const cliente = st.cliente && st.cliente.cpf === cpf ? st.cliente : { cpf, nome: jwt.name || jwt.nome || '' };
    // o cabeçalho CnasVersao é obrigatório (sem ele o perfil volta vazio, 13.10.2026).
    // A extensão não enxerga o window.env da página: lê a versão do config/env.js do portal
    let versao = '';
    try { versao = ((await (await fetch('/config/env.js?t=' + Date.now())).text()).match(/REACT_APP__VERSION:\s*'([^']+)'/) || [])[1] || ''; } catch (e) {}
    if (!versao) { D.faixa('não consegui ler a versão do CadÚnico (config/env.js) — tente de novo', '#B3261E'); return { erro: 'sem versão' }; }
    const cab = { Accept: 'application/json', 'Content-Type': 'application/json', CnasVersao: versao, Authorization: 'Bearer ' + tok };
    // o token vale 10 min e o próprio site o renova no localStorage (13.10.2026):
    // num 401, relê o token e tenta uma vez mais
    const pedir = async (caminho) => {
      let r = await fetch(API + caminho, { headers: cab });
      if (r.status === 401) {
        cab.Authorization = 'Bearer ' + (localStorage.getItem('token') || tok);
        await D.pausa(800);
        r = await fetch(API + caminho, { headers: cab });
      }
      await D.pausa(1200);
      return r;
    };
    const json = async caminho => { const r = await pedir(caminho); if (r.status === 204) return []; return r.ok ? r.json().catch(() => null) : null; };

    const ok = [], falhas = [], inexistentes = [];
    async function pdf(arquivo, caminho) {
      D.faixa(`CadÚnico: ${arquivo}…`);
      try {
        const r = await pedir(caminho);
        const buf = await r.arrayBuffer();
        const u8 = r.ok ? R.comoPdf(buf) : null;
        if (!u8) {
          const msg = R.mensagemDoPortal(buf);
          // 403 = o portal não dá este PDF para este perfil (quem não é o responsável
          // familiar, família antiga): é "não existe para este CPF", não falha técnica
          // e 200 vazio (segunda família do CPF, 13.10.2026) também é "não há PDF"
          if (r.status === 404 || r.status === 204 || r.status === 403 || (r.ok && (msg || !buf.byteLength)))
            inexistentes.push(`${arquivo}${msg ? `: ${msg}` : (r.status === 403 ? ': o portal não permite para este perfil (403)' : ': o portal não tem este PDF para esta família')}`);
          else falhas.push(`${arquivo}: ${r.ok ? `o portal não devolveu PDF (${new TextDecoder().decode(new Uint8Array(buf).slice(0, 120)).replace(/\s+/g, ' ')})` : `HTTP ${r.status}`}${msg ? ` — ${msg}` : ''}`);
          return;
        }
        const s = await D.salvar(cliente, 'CadUnico', arquivo, u8);
        ok.push(`${arquivo}${s.crm && s.crm !== 'ok' ? ` (CRM: ${s.crm})` : ''}`);
      } catch (e) { falhas.push(`${arquivo}: ${e.message || e}`); }
    }

    D.faixa('CadÚnico: lendo o perfil…');
    // o perfil decide tudo: 401 é o token de 10 min vencido (não "sem família")
    const rp = await pedir(`pessoa/${cpf}/tipos-perfil`);
    if (rp.status === 401 || rp.status === 403) {
      D.faixa('a sessão do CadÚnico venceu (o token dura 10 min) — saia, entre de novo com o gov.br e clique logo em seguida', '#B3261E');
      return { erro: 'sessão vencida' };
    }
    if (!rp.ok && rp.status !== 204) {
      D.faixa(`o CadÚnico não respondeu o perfil (HTTP ${rp.status}) — tente de novo em instantes`, '#B3261E');
      return { erro: `HTTP ${rp.status}` };
    }
    const perfis = [].concat(rp.status === 204 ? [] : (await rp.json().catch(() => [])) || []).filter(p => p && typeof p === 'object');
    if (!perfis.length) {
      inexistentes.push('CadÚnico: o CPF não tem família cadastrada');
      const avisoCrm = await D.resumo(cliente, 'cadunico', { baixados: ok, inexistentes, falhas });
      D.faixa(`0 documento(s) do CadÚnico\n• ${inexistentes[0]}` + avisoCrm, '#9A6700');
      return { ok: 0, falhas };
    }
    const vistos = new Set(), familias = [];
    for (const p of perfis) {
      const nf = String(p.numeroFamiliar || p.nuFamiliar || '').replace(/\D/g, '');
      if (!nf || vistos.has(nf)) continue;
      vistos.add(nf);
      const idPessoa = p.identificador || p.idPessoa || p.id || cpf;
      const rl = p.tipoPerfil && /REPRESENTANTE/i.test(String(p.tipoPerfil.codigo || p.tipoPerfil.descricao || ''));
      await pdf(`Ficha completa CadUnico familia ${nf}`, `pdf/${cpf}/${nf}/exportar-consulta-completa`);
      await pdf(`Comprovante de cadastro familia ${nf}`, `pdf/${nf}/comprovante-cadastro/${idPessoa}/${cpf}?representanteLegal=${rl ? 'true' : 'false'}`);
      // membros, renda, extrato de benefícios pagos (Bolsa Família/BPC/tarifa
      // social), renda CNIS de cada integrante, pendências e despesas → .txt
      // legível (o CRM lê texto direto); o resumo da família vai ao CRM
      try {
        D.faixa(`CadÚnico: integrantes, benefícios e renda da família ${nf}…`);
        const tp = (p.tipoPerfil && p.tipoPerfil.codigo) ?? 1;
        const fim = new Date().toISOString().slice(0, 7).replace('-', '');
        const membros = await json(`familia/${nf}/membros`), renda = await json(`renda/familia/${nf}`);
        const extra = {
          extrato: await json(`extrato/${nf}?tipoPerfil=${tp}&cpf=${cpf}&tipoConsulta=0&dataInicial=200401&dataFinal=${fim}`),
          tipos: await json(`extrato/tiposBeneficiosDisponiveis/${nf}?tipoPerfil=${tp}&cpf=${cpf}`),
          consignacoes: await json(`extrato/consignacoes/${nf}?tipoPerfil=${tp}&cpf=${cpf}`),
          pendencias: await json(`familia/${idPessoa}/pendencias-ocorrencias/${nf}`),
          info: await json(`familia/${nf}/informacoes-detalhadas`),
          rendas: {},
        };
        for (const i of ((membros && membros.integranteFamiliaDTOs) || [])) {
          const id = i.identificador; if (id == null) continue;
          extra.rendas[String(id)] = { renda: await json(`renda/pessoa/${id}?nuFamiliar=${nf}&nuCpf=${cpf}`), trabalho: await json(`renda/pessoa/trabalho-renda/${id}`) };
        }
        const t = R.textoCadunico(p, membros, renda, extra);
        familias.push(t.familia);
        await D.salvar(cliente, 'CadUnico', `CadUnico familia ${nf} integrantes e renda`, new TextEncoder().encode(t.texto), 'text/plain');
        ok.push(`integrantes e renda da família ${nf}`);
      } catch (e) { falhas.push(`dados da família ${nf}: ${e.message || e}`); }
    }
    const avisoCrm = await D.resumo(cliente, 'cadunico', { baixados: ok, inexistentes, falhas, familia: familias[0] || null, familias });
    // Portal da Transparência (sem login): cada integrante da família, pelo CPF/NIS que o CadÚnico deu
    const pessoas = familias.flatMap(f => f.membros || []).map(m => ({ nome: m.nome, cpf: m.cpf, nis: m.nis }));
    if (!pessoas.some(p => p.cpf === cpf)) pessoas.unshift({ nome: cliente.nome, cpf });
    D.faixa(`Portal da Transparência: consultando ${pessoas.length} integrante(s)…`);
    const tr = await chrome.runtime.sendMessage({ tipo: 'transparencia', cpf: cliente.cpf, nome: cliente.nome, pessoas }).catch(e => ({ aviso: `Portal da Transparência: ${e.message || e}` }));
    D.faixa(`${ok.length} documento(s) do CadÚnico · ${vistos.size} família(s)`
      + (inexistentes.length ? `\n${inexistentes.length} não existem:\n• ${inexistentes.join('\n• ')}` : '')
      + (falhas.length ? `\n${falhas.length} falharam:\n• ${falhas.join('\n• ')}` : '') + avisoCrm
      + `\n${(tr && tr.aviso) || 'Portal da Transparência: sem resposta'}`,
      falhas.length ? '#9A6700' : '#1E6F50');
    return { ok: ok.length, falhas };
  };
})();
