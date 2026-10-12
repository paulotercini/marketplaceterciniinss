// DOSSIÊ · PORTAL EMPREGA BRASIL (servicos.mte.gov.br/spme-v2) — CTPS, RAIS e CAGED.
//
// Mapeado em 07.10.2026 no código do portal (static/js + config.json). Tudo
// passa pela API_CTPS da Dataprev, com o crachá que o portal guarda na aba
// (sessionStorage "access-token", JWT com o cpf) — o mesmo que ele usa:
//
//   GET  v4/trabalhador/{cpf}                    → { pis, dataNascimento, … }
//   GET  v4/trabalhador/{pis}/contratos          → [{ tipoCTPS DIGITAL|FISICA, empregador.matricula, vigencia, ocupacaoInicial }]
//   POST v4/trabalhador/exportar-ctps/cpf/{cpf}/nit/{pis}[/tipoCtps/DIGITAL]
//        { todosDadosPessoais: true, contratos: [...] }   → a CTPS em PDF ("Gerar PDF" com "Todos os dados")
//   POST v1/caged/relatorio/nit/{pis}/dataNascimento/{DDMMAAAA}       → extrato CAGED
//   POST v1/caged/relatorio/rais/nit/{pis}/dataNascimento/{DDMMAAAA}  → extrato RAIS
//
// SÓ PELO CÓDIGO: ainda não rodou numa sessão logada. O que divergir falha
// sozinho e o resumo da faixa diz o quê.
(() => {
  if (window !== window.top) return;
  const R = window.DOSSIE_REGRAS, D = window.DOSSIE;
  const API = 'https://mte.api.dataprev.gov.br/apis/ectpsservices/';
  const SD = 'https://mte.api.dataprev.gov.br/apis/sdservices-v2';     // seguro-desemprego e informe de rendimentos

  window.dossieRodar = async () => {
    const tok = sessionStorage.getItem('access-token');
    const quem = R.jwt(tok);
    const cpf = String((quem && (quem.cpf || quem.sub)) || '').replace(/\D/g, '');
    if (!tok || cpf.length !== 11) {
      D.faixa('não achei a sessão do Emprega Brasil — clique em "Entrar com gov.br", espere a página do trabalhador abrir e clique de novo', '#B3261E');
      return { erro: 'sem sessão' };
    }
    // Accept igual ao do portal (axios): só "application/json" → 406 nos PDFs
    const cab = { Accept: 'application/json, text/plain, */*', 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok };
    const pedir = async (caminho, opts) => {
      const r = await fetch(API + caminho, Object.assign({ headers: cab }, opts));
      await D.pausa(1500);
      return r;
    };

    D.faixa('lendo o cadastro do trabalhador…');
    const r0 = await pedir(`v4/trabalhador/${cpf}`);
    const cad = r0.ok ? await r0.json() : null;
    if (!cad || !cad.pis) { D.faixa(`o portal não devolveu o cadastro (HTTP ${r0.status}) — refaça o login`, '#B3261E'); return { erro: 'sem cadastro' }; }
    const st = await chrome.storage.local.get(['cliente']);
    // mesmo cliente do Meu INSS → mesma pasta; outro CPF → pasta própria com o nome do portal
    const cliente = st.cliente && st.cliente.cpf === cpf ? st.cliente : { cpf, nome: cad.nome || (quem && quem.name) || '' };
    const pis = String(cad.pis).replace(/\D/g, '');
    const dn = String(cad.dataNascimento || '').slice(0, 10).split('-');     // AAAA-MM-DD → DDMMAAAA
    const nasc = dn.length === 3 ? `${dn[2]}${dn[1]}${dn[0]}` : '';

    const ok = [], falhas = [], inexistentes = [];
    async function pdf(arquivo, caminho, corpo) {
      D.faixa(`${arquivo}…`);
      try {
        const r = await pedir(caminho, { method: 'POST', body: corpo ? JSON.stringify(corpo) : undefined });
        const buf = await r.arrayBuffer();
        const u8 = r.ok ? R.comoPdf(buf) : null;
        if (!u8) {
          const msg = R.mensagemDoPortal(buf);
          if (r.status === 404 || r.status === 204 || (r.ok && msg)) inexistentes.push(`${arquivo}${msg ? `: ${msg}` : ''}`);
          else falhas.push(`${arquivo}: ${r.ok ? 'o portal não devolveu PDF' : `HTTP ${r.status}`}${msg ? ` — ${msg}` : ''}`);
          return;
        }
        await D.salvar(cliente, 'CTPS RAIS CAGED', arquivo, u8);
        ok.push(arquivo);
      } catch (e) { falhas.push(`${arquivo}: ${e.message || e}`); }
    }

    // ── CTPS: Digital e "outros vínculos" (carteira física), todos os dados ──
    // O portal registra o acesso à CTPS antes de mostrá-la (sessionStorage
    // "acesso-ctps" marca que já foi feito); sem isso os contratos dão 422
    if (!sessionStorage.getItem('acesso-ctps')) {
      const ra = await pedir(`v4/trabalhador/${cpf}/registrar/acesso`, { method: 'POST',
        body: JSON.stringify({ cpf, plataforma: 'WEB', tokenDispositivo: tok }) });
      if (!ra.ok) falhas.push(`CTPS: o registro de acesso foi recusado (HTTP ${ra.status})`);
    }
    // contratos são pelo PIS, não pelo CPF (com o CPF o portal responde 422)
    const rc = await pedir(`v4/trabalhador/${pis}/contratos`);
    const contratos = rc.ok ? (await rc.json()) || [] : [];
    const corpo = lista => ({ todosDadosPessoais: true, contratos: lista.map(t => ({
      matriculaEmpregador: { tipo: (t.empregador && t.empregador.matricula && t.empregador.matricula.tipo) ?? null,
                             numero: (t.empregador && t.empregador.matricula && t.empregador.matricula.numero) ?? null },
      dataInicioVinculo: (t.vigencia && t.vigencia.inicio) ?? null,
      codigoOcupacaoInicial: (t.ocupacaoInicial && t.ocupacaoInicial.codigo) ?? 0 })) });
    const digitais = contratos.filter(t => t.tipoCTPS === 'DIGITAL');
    const fisicas = contratos.filter(t => t.tipoCTPS === 'FISICA');
    if (!rc.ok) falhas.push(`CTPS: a lista de contratos não abriu (HTTP ${rc.status})`);
    await pdf('CTPS Digital', `v4/trabalhador/exportar-ctps/cpf/${cpf}/nit/${pis}/tipoCtps/DIGITAL`, corpo(digitais));
    if (fisicas.length) await pdf('CTPS outros vinculos', `v4/trabalhador/exportar-ctps/cpf/${cpf}/nit/${pis}`, corpo(fisicas));

    // ── RAIS e CAGED ─────────────────────────────────────────────────────────
    await pdf('Extrato RAIS', `v1/caged/relatorio/rais/nit/${pis}/dataNascimento/${nasc}`);
    await pdf('Extrato CAGED', `v1/caged/relatorio/nit/${pis}/dataNascimento/${nasc}`);

    // ── SEGURO-DESEMPREGO: os requerimentos com as parcelas ──────────────────
    // Mapeado pelo código em 11.10.2026 (API sdservices-v2, a mesma tela
    // "Seguro-Desemprego"); ainda não rodou numa sessão logada. O portal só
    // dá JSON, não PDF: vai como .txt legível (data do requerimento, vínculo,
    // parcelas com data de pagamento) + o JSON cru embaixo. Importa para a
    // qualidade de segurado: o recebimento do SD estende o período de graça
    // (art. 15, §2º, Lei 8.213/91) quando há parcela recebida dentro da graça;
    // o prazo segue contado da última competência (IN 128, art. 184, §§ 2º e 5º).
    D.faixa('seguro-desemprego: requerimentos…');
    try {
      // sem as modalidades na URL o portal responde 400 (medido em 11.10.2026); é o
      // mesmo conjunto que a tela manda — todas, inclusive a de resgatado
      const modalidades = 'consultarRequerimentosModalidadeFormal=true&consultarRequerimentosModalidadeBolsa=true'
        + '&consultarRequerimentosModalidadeDomestico=true&consultarRequerimentosModalidadePescador=true&consultarRequerimentosModalidadeResgatado=true';
      const rs = await fetch(`${SD}/portal/requerimento/consultarRequerimentosPeloCpf/${cpf}?${modalidades}`, { headers: cab });
      await D.pausa(1500);
      const txt = rs.ok ? await rs.text() : '';
      let lista = [];
      try { const j = JSON.parse(txt || 'null'); lista = Array.isArray(j) ? j : (j && typeof j === 'object' ? (Object.values(j).find(Array.isArray) || []) : []); } catch (e) {}
      if (!rs.ok) falhas.push(`Seguro-desemprego: HTTP ${rs.status}${R.mensagemDoPortal(new TextEncoder().encode(txt)) ? ' — ' + R.mensagemDoPortal(new TextEncoder().encode(txt)) : ''}`);
      else if (!lista.length) inexistentes.push('Seguro-desemprego: nenhum requerimento');
      else {
        // a lista é só o cabeçalho (nº, data, empregador, admissão, dispensa): as
        // PARCELAS estão no detalhe, por modalidade (medido em 11.10.2026)
        const ROTA = { 0: 'formal', 1: 'domestico', 3: 'bolsa', 4: 'pescador' };
        for (const [i, req] of lista.entries()) {
          const cod = req.modalidade && typeof req.modalidade === 'object' ? req.modalidade.codigo : req.modalidade;
          const rota = ROTA[cod];
          const num = req.numeroRequerimento || req.numero;
          if (!rota || !num) continue;
          D.faixa(`seguro-desemprego: requerimento ${i + 1} de ${lista.length}…`);
          try {
            const rd = await fetch(`${SD}/requerimento/${rota}${rota === 'bolsa' ? '/obterpornumero' : ''}/${num}`, { headers: cab });
            await D.pausa(1500);
            if (rd.ok) Object.assign(req, { detalhe: await rd.json() });
            else req.detalhe_erro = `HTTP ${rd.status}`;
          } catch (e) { req.detalhe_erro = String(e.message || e); }
        }
        const texto = R.textoSeguroDesemprego(lista);
        await D.salvar(cliente, 'CTPS RAIS CAGED', 'Seguro-desemprego requerimentos e parcelas', new TextEncoder().encode(texto), 'text/plain');
        ok.push(`Seguro-desemprego (${lista.length} requerimento(s))`);
      }
    } catch (e) { falhas.push(`Seguro-desemprego: ${e.message || e}`); }

    // ── INFORME DE RENDIMENTOS dos benefícios do MTE (SD/abono), um PDF por ano
    try {
      const re = await fetch(`${SD}/informesrendimentos/v1/exercicios`, { headers: cab });
      await D.pausa(1500);
      const anos = re.ok ? [].concat(await re.json().catch(() => [])).map(a => String(typeof a === 'object' ? (a.ano || a.exercicio || a.valor || '') : a).replace(/\D/g, '')).filter(a => a.length === 4) : [];
      for (const ano of anos) {
        D.faixa(`informe de rendimentos ${ano}…`);
        const r = await fetch(`${SD}/informesrendimentos/v1/${cpf}/ano/${ano}`, { headers: cab });
        await D.pausa(1500);
        const buf = await r.arrayBuffer();
        const u8 = r.ok ? R.comoPdf(buf) : null;
        if (u8) { await D.salvar(cliente, 'CTPS RAIS CAGED', `Informe de rendimentos MTE ${ano}`, u8); ok.push(`Informe de rendimentos ${ano}`); }
        else if (r.status === 404 || r.status === 204 || (r.ok && !buf.byteLength)) inexistentes.push(`Informe de rendimentos ${ano}: sem informe`);
        else falhas.push(`Informe de rendimentos ${ano}: HTTP ${r.status}`);
      }
    } catch (e) { falhas.push(`Informe de rendimentos: ${e.message || e}`); }

    const avisoCrm = await D.resumo(cliente, 'mte', { baixados: ok, inexistentes, falhas });
    D.faixa(`${ok.length} documento(s) do Emprega Brasil · ${contratos.length} contrato(s) na CTPS`
      + (inexistentes.length ? `\n${inexistentes.length} não existem:\n• ${inexistentes.join('\n• ')}` : '')
      + (falhas.length ? `\n${falhas.length} falharam:\n• ${falhas.join('\n• ')}` : '') + avisoCrm,
      falhas.length ? '#9A6700' : '#1E6F50');
    return { ok: ok.length, falhas };
  };
})();
