// e-SAJ TJSP — o último movimento de TODOS os processos do escritório no
// TJSP, 1º e 2º grau. Mesmo contrato dos outros coletores: roda na SUA
// sessão logada, no clique, e só entrega para a fila do CRM.
//
// DE ONDE VEM A LISTA. O e-SAJ não tem relação de acervo, e a consulta por
// OAB (medida em 15.09.2026: 68 no 1º grau, 11 no 2º) só traz os processos em
// que a OAB está cadastrada na parte — o acervo real é bem maior. Então a
// lista-mãe é o CRM: todo número .8.26. das fichas abertas. A consulta por
// OAB entra como complemento, para descobrir processo que ainda não tem
// ficha. União das duas, sem repetição.
//
// COMO O e-SAJ SE DEIXA LER (conferido ao vivo em 15.09.2026):
//   1. a OAB do usuário logado vem de /tarefas-adv/api/usuario
//   2. a consulta por NÚMERO (cpopg/search.do, NUMPROC) cai direto na ficha
//      (show.do?processo.codigo=…) — e é a ficha que ARMA o pedido das
//      movimentações: carregarMovimentacoesAjax.do só responde para o processo
//      cuja ficha foi aberta na sessão. Logo, por processo são DOIS pedidos:
//      a ficha (que ainda dá situação e partes com nome) e o AJAX (as cinco
//      movimentações mais recentes)
//   3. o e-SAJ trava "múltiplas consultas simultâneas" por sessão: tudo aqui é
//      SEQUENCIAL, com pausa, e a trava vira espera e retomada
//
// MODO RÁPIDO: processo cuja ficha disse "Arquivado/Baixado/Encerrado" fica
// anotado no navegador e, por 7 dias, não é consultado de novo — é onde vai
// a maior parte do acervo antigo. Uma rodada completa semanal confere todos.
(() => {
  if (window !== window.top) return;      // só o quadro de cima coleta (a reinjeção vai a todos)
  if (window.__crmColetorNoAr) return;
  window.__crmColetorNoAr = true;

  const REG = window.ESAJ_REGRAS;
  const host = location.host;
  const espera = ms => new Promise(r => setTimeout(r, ms + Math.random() * 500));
  const ARQ = 'esaj_arquivados';                     // { numero: ISO da última conferência }

  async function baixar(url) {
    const r = await fetch(url, { credentials: 'include' });
    if (!r.ok) throw new Error(`o e-SAJ respondeu ${r.status}`);
    return { url: r.url, html: await r.text() };
  }
  // a trava de "múltiplas consultas simultâneas" não é erro, é esperar um
  // pouco e pedir de novo; login caído é erro de verdade
  async function baixarComPaciencia(url, rotulo) {
    for (let tent = 0; tent < 4; tent++) {
      const r = await baixar(url);
      if (REG.pedeLogin(r.html)) throw new Error('a sessão do e-SAJ caiu — faça login de novo e clique outra vez');
      if (!REG.bloqueado(r.html)) return r;
      faixa(`${rotulo}: o e-SAJ pediu calma (consultas simultâneas) — esperando…`);
      await espera(4000 * (tent + 1));
    }
    throw new Error('o e-SAJ seguiu travando "consultas simultâneas" — feche outras abas do e-SAJ e clique de novo');
  }

  // a extensão recarregada no meio da rodada deixa este código órfão: sem
  // chrome.storage nem mensagem ao CRM. Diz isso, em vez de "reading 'local'"
  function vivo() {
    if (!(globalThis.chrome && chrome.runtime && chrome.runtime.id))
      throw new Error('a extensão foi recarregada no meio da rodada — dê F5 nesta aba e clique de novo (os lotes já entregues ficaram no CRM)');
  }
  async function noNavegador(obj) { try { vivo(); await chrome.storage.local.set(obj); } catch (e) { console.warn('[CRM]', e.message); } }
  const paraEntrega = p => ({ numero: p.numero, classe: p.classe, partes: p.partes, orgao: p.orgao, assunto: p.assunto || null,
    distribuido: p.distribuido || null, situacao: p.situacao, codigo: p.codigo, link: p.link,
    principal: p.principal || null, tipo: p.tipo || null,
    movimento: p.movimento, movimentos: p.movimentos || null,
    pasta: p.pasta || null,                       // F186 · a pasta digital: sem ela o CRM não sabe de quem é cada PDF
    id: null, ca: null });

  async function oabLogada() {
    const r = await fetch('/tarefas-adv/api/usuario', { credentials: 'include' });
    if (!r.ok) return null;
    const j = await r.json().catch(() => null);
    const o = j && Array.isArray(j.oabs) && j.oabs[0];
    return (o && (o.stringOab || (o.nuOab && o.nuOab + (o.ufOab || 'SP')))) || null;
  }

  const GRAUS = {
    '1º grau': { lista: oab => `/cpopg/search.do?conversationId=&cbPesquisa=NUMOAB&dadosConsulta.valorConsulta=${oab}&cdForo=-1`,
                 movs: cod => `/cpopg/carregarMovimentacoesAjax.do?processo.codigo=${cod}` },
    '2º grau': { lista: oab => `/cposg/search.do?conversationId=&paginaConsulta=1&cbPesquisa=NUMOAB&dePesquisa=${oab}&localPesquisa.cdLocal=-1`,
                 movs: cod => `/cposg/carregarMovimentacoesAjax.do?cdProcesso=${cod}` },
  };

  // a consulta por OAB, todas as páginas — o complemento que descobre
  // processo sem ficha no CRM
  async function listaPorOab(grau, oab, mapa) {
    const rot = `e-SAJ ${grau}`;
    faixa(`${rot}: lendo a consulta por OAB…`);
    const base = GRAUS[grau].lista(oab);
    let { html } = await baixarComPaciencia(base, rot);
    const paginas = REG.totalPaginas(html);
    for (let pag = 1; pag <= paginas && pag <= 80; pag++) {
      if (pag > 1) {
        await espera(1200);
        html = (await baixarComPaciencia(base.replace(/&paginaConsulta=\d+/, '') + `&paginaConsulta=${pag}`, rot)).html;
      }
      let novos = 0;
      for (const p of REG.lerListaHtml(html)) if (!mapa.has(p.numero) && !mapa.has('cod:' + p.codigo) && ![...mapa.values()].some(x => x.numero === p.numero && x.grau === grau)) { mapa.set(p.numero, { ...p, grau, origem: 'oab' }); novos++; }
      if (pag > 1 && !novos) break;
    }
  }

  // um processo: a ficha (pelo link com código, ou pela consulta por número),
  // depois as movimentações. Devolve o registro pronto para o CRM.
  async function lerProcesso(p, rot) {
    const g = GRAUS[p.grau];
    const r = await baixarComPaciencia(p.link ? p.link.replace(/^https:\/\/[^/]+/, '') : REG.urlBuscaNumero(p.grau, p.numero), rot);
    let html = r.html, codigo = REG.codigoDaUrl(r.url) || p.codigo || null;
    // com código na URL a ficha foi aberta (mesmo que venha sem capa — em
    // segredo de justiça o e-SAJ pede senha, mas o AJAX das movimentações
    // responde assim mesmo, medido em 15.09.2026). Sem código, a consulta
    // por número devolveu LISTA (o número tem incidentes) ou nada (o número
    // não está neste grau): segue o link da linha certa
    if (!codigo) {
      const linha = REG.lerListaHtml(html).find(x => x.numero === p.numero);
      if (!linha) return { ...p, codigo, situacao: null, movimento: null, semFicha: true };
      await espera(900);
      const r2 = await baixarComPaciencia(linha.link.replace(/^https:\/\/[^/]+/, ''), rot);
      html = r2.html; codigo = REG.codigoDaUrl(r2.url) || linha.codigo;
    }
    const ficha = REG.lerFichaHtml(html) || {};
    const out = { ...p, codigo, numero: p.numero || ficha.numero || null,
      classe: p.classe || ficha.classe || null, orgao: p.orgao || ficha.orgao || null,
      partes: ficha.partes || p.partes || null, situacao: ficha.situacao || null,
      principal: ficha.principal || null, tipo: ficha.tipo || null,
      link: p.link || (codigo ? `https://${host}${p.grau === '2º grau' ? '/cposg' : '/cpopg'}/show.do?processo.codigo=${codigo}` : null),
      incidentes: REG.lerIncidentesFicha(html), movimento: null };
    if (!codigo || !out.numero) return { ...out, semFicha: true };   // sem número não há como o CRM casar
    await espera(900);
    const mv = REG.lerMovimentacoesHtml((await baixarComPaciencia(g.movs(codigo), rot)).html);
    // a mais recente primeiro; o e-SAJ não dá hora — 00:00 mantém estável a
    // chave "data+hora" da tela de importação. [02.10.2026] vão as CINCO que
    // o e-SAJ devolve, e não só a última: entre uma rodada e outra o processo
    // anda mais de um passo (os embargos de um caso tiveram "Julgado
    // virtualmente", "Acórdão registrado" e "Expedido Certidão" em dois dias),
    // e o CRM grava só as que ainda não conhece
    // F184 · a sentença/decisão destas cinco desce junto e vai com o caminho
    await CRM.guardarDocs('esaj', out.numero, mv.slice(0, 5).flatMap(m => m.docs || []));
    out.movimentos = mv.slice(0, 5).map(m => ({ data: m.data, hora: '00:00',
      texto: m.detalhe ? `${m.texto} — ${m.detalhe}` : m.texto,
      ...((m.docs || []).some(d => d.caminho) ? { docs: m.docs.filter(d => d.caminho) } : {}) }));
    out.movimento = out.movimentos[0] || null;
    try { out.pasta = await guardarPasta(out, rot); }
    catch (e) { console.warn('[CRM] pasta digital:', out.numero, e); }
    return out;
  }

  // F186 · A PASTA DIGITAL INTEIRA: a inicial de 2018, a contestação, o laudo
  // e a sentença, e não só as 5 movimentações recentes. A ficha já está
  // aberta na sessão (é o que arma a pasta). Página a página pelo getPDF, um
  // PDF por documento (pdf-lib, em vendor/); o que já está no CRM é pulado
  // antes de baixar, então só a primeira rodada é longa.
  async function guardarPasta(out, rot) {
    const base = out.grau === '2º grau' ? '/cposg' : '/cpopg';
    const r0 = await baixarComPaciencia(`${base}/abrirPastaDigital.do?processo.codigo=${out.codigo}`, rot);
    const url = REG.urlDaPasta(r0.html);
    if (!url) return null;
    await espera(600);
    const docs = REG.docsDaPasta((await baixarComPaciencia(url.replace(/^https:\/\/[^/]+/, ''), rot)).html);
    if (!docs.length) return null;
    let feitos = 0;
    const baixarDoc = async d => {
      ++feitos;
      const doc = await PDFLib.PDFDocument.create();
      for (const [i, p] of d.paginas.entries()) {
        // a faixa anda por PÁGINA: documento de 213 páginas parecia travado
        if (i % 5 === 0) faixa(`${rot} ${out.numero}: pasta digital — documento ${feitos} de ${docs.length} (${d.nome}, página ${i + 1} de ${d.paginas.length})…`);
        // página que o e-SAJ não devolve em 1 min derruba só este documento
        // (o guardarDocs segue para o próximo), em vez de prender a rodada para sempre
        const r = await fetch('/pastadigital/getPDF.do?' + p, { credentials: 'include', signal: AbortSignal.timeout(60000) });
        const b = new Uint8Array(await r.arrayBuffer());
        if (!r.ok || !DOCS_REGRAS.tipoDoConteudo(b, r.headers.get('content-type'))) return new Response(null, { status: 502 });
        const pg = await PDFLib.PDFDocument.load(b, { ignoreEncryption: true });
        for (const x of await doc.copyPages(pg, pg.getPageIndices())) doc.addPage(x);
        await espera(250);
      }
      return new Response(await doc.save(), { headers: { 'content-type': 'application/pdf' } });
    };
    let existentes = null;
    try { existentes = new Set((await CRM.pedir({ tipo: 'crm', acao: 'docs-existentes',
      prefixo: `esaj/${String(out.numero).replace(/\D/g, '')}/` })).nomes); } catch (e) {}
    await CRM.guardarDocs('esaj', out.numero, docs, { baixar: baixarDoc, existentes });
    return docs.filter(d => d.caminho).map(({ id, nome, data, hora, caminho }) => ({ id, nome, data, hora, caminho }));
  }

  // [02.10.2026] OS RECURSOS DENTRO DO RECURSO. No 2º grau, os embargos de
  // declaração e o agravo interno de uma apelação têm o MESMO número e código
  // próprio, e não aparecem na consulta por OAB nem nos favoritos: só na
  // consulta por número, na caixa "Selecione o processo", dentro do recurso
  // principal. Era por isso que o julgamento dos embargos de um caso não
  // chegava ao CRM: a extensão lia só a apelação. Para cada número com algo no
  // 2º grau, ou com o 1º grau "em grau de recurso", a consulta por número
  // lista todos os códigos, e o que a rodada ainda não leu entra nela.
  async function lerRecursosDoNumero(numero, vistos, lidos) {
    const rot = 'e-SAJ 2º grau';
    let falhas = 0;
    const r = await baixarComPaciencia(REG.urlBuscaNumero('2º grau', numero), rot);
    const direto = REG.codigoDaUrl(r.url);
    const codigos = direto ? [{ codigo: direto, classe: null }] : REG.lerSelecaoHtml(r.html);
    for (const s of codigos) {
      if (vistos.has('2º grau:' + s.codigo)) continue;
      await espera(900);
      try {
        const x = await lerProcesso({ numero, grau: '2º grau', origem: 'recurso', codigo: s.codigo,
          classe: s.classe || null, link: `https://${host}/cposg/show.do?processo.codigo=${s.codigo}` }, rot);
        if (x.semFicha) { falhas++; continue; }
        vistos.add('2º grau:' + (x.codigo || x.numero)); lidos.push(x);
      } catch (e) { falhas++; }
    }
    return falhas;
  }

  window.crmRodar = async () => {
    try {
      if (!REG) { faixaErr('esaj-regras.js não subiu — recarregue a página (F5)'); return { erro: 'sem regras' }; }
      const oab = await oabLogada();
      if (!oab) { faixaErr('faça login no e-SAJ (painel do advogado) e clique de novo'); return { erro: 'sem login' }; }

      // a lista-mãe: os favoritos do navegador (pastas "A a J", "I a Z"), que
      // é como o escritório acompanha os ativos do TJSP. Chave: o CÓDIGO, e
      // não o número — o cumprimento de sentença e as requisições de
      // pagamento (RPV, precatório) têm o MESMO número do processo e códigos
      // diferentes (…0000, …0001, …0002). Chavear pelo número engolia os
      // incidentes (caso da Izilda, 22.09.2026); cada favorito é um processo
      faixa('lendo os favoritos do e-SAJ…');
      const { favoritos } = await CRM.favoritosEsaj();
      const mapa = new Map();                       // chave: "cod:"+codigo, ou o numero sem código
      for (const f of favoritos) {
        const chave = 'cod:' + f.codigo;
        if (mapa.has(chave)) continue;
        mapa.set(chave, { numero: f.numero, grau: f.grau, origem: 'favorito', codigo: f.codigo,
          link: `https://${host}${f.grau === '2º grau' ? '/cposg' : '/cpopg'}/show.do?processo.codigo=${f.codigo}${f.foro ? '&processo.foro=' + f.foro : ''}` });
      }
      // mais os números do TJSP nas fichas abertas do CRM
      faixa('lendo os processos do TJSP no CRM…');
      const { numeros, fichas } = await CRM.processosTjsp();
      const temNumero = n => [...mapa.values()].some(x => x.numero === n);
      for (const n of numeros) if (!mapa.has(n) && !temNumero(n)) mapa.set(n, { numero: n, grau: '1º grau', origem: 'crm', codigo: null, link: null });
      // e o complemento: a consulta por OAB nos dois graus, que descobre o que
      // não tem favorito nem ficha
      const antesOab = mapa.size;
      for (const grau of Object.keys(GRAUS)) { await espera(1200); await listaPorOab(grau, oab, mapa); }
      if (!mapa.size) { faixaErr(`nenhum processo do TJSP — ${favoritos.length} favorito(s), ${fichas} ficha(s) no CRM e a consulta por OAB vazia`); return { erro: 'vazio' }; }
      const resumoFontes = `${favoritos.length} dos favoritos, ${numeros.length} do CRM, ${mapa.size - antesOab} só na OAB`;

      const st = await chrome.storage.local.get([ARQ, 'ultima_esaj_full']);
      const arq = st[ARQ] || {};
      const fullEm = st.ultima_esaj_full ? new Date(st.ultima_esaj_full).getTime() : 0;
      const rapido = !!fullEm && Date.now() - fullEm < 7 * 86400000;
      const corte = Date.now() - 7 * 86400000;
      // a anotação de arquivado é por código ou por número — o que a entrada tiver
      const todos = [...mapa.values()];
      const chaveArq = p => p.numero || 'cod:' + p.codigo;
      const fila = rapido ? todos.filter(p => !(arq[chaveArq(p)] && new Date(arq[chaveArq(p)]).getTime() > corte)) : todos;
      const pulados = todos.length - fila.length;
      faixa(`${todos.length} processos do TJSP (${resumoFontes})${pulados ? `; ${pulados} arquivados ficam para a rodada semanal` : ''}`);

      const lidos = [], lote = [], entregues = new Set();
      const entregar = async (lista, extra) => {
        vivo();
        const q = (extra && extra.quando) || new Date().toISOString();
        for (const grau of Object.keys(GRAUS)) {
          const processos = lista.filter(p => p.grau === grau).map(paraEntrega);
          if (processos.length)
            await CRM.enviar('pje', { versao: 1, fonte: 'pje-acervo', sistema: 'esaj', tribunal: 'TJSP', grau, host, oab, quando: q,
                                      parcial: !!(extra && (extra.parcial || extra.lote)), pulados: (extra && extra.pulados) || 0, processos });
        }
      };
      const vistos = new Set();                    // o mesmo processo pode vir de favorito E de ficha
      let falhas = 0;
      for (let i = 0; i < fila.length; i++) {
        const p = fila[i];
        faixa(`e-SAJ: ${i + 1} de ${fila.length} — ${p.numero || p.codigo}…`);
        await espera(900);
        try {
          const x = await lerProcesso(p, 'e-SAJ ' + p.grau);
          if (x.semFicha) { falhas++; continue; }
          if (REG.arquivado(x.situacao)) arq[chaveArq(p)] = new Date().toISOString(); else delete arq[chaveArq(p)];
          // o mesmo processo pode vir de favorito E de ficha; incidente com o
          // mesmo número e outro código é OUTRO registro
          const k = x.grau + ':' + (x.codigo || x.numero);
          if (vistos.has(k)) continue;
          vistos.add(k); lidos.push(x);
          // F186 · ENTREGA EM LOTES: a rodada com a pasta digital leva horas, e
          // tudo só ia ao CRM no fim — uma queda perdia a rodada inteira. A cada
          // 5 processos com pasta, o lote já vai (o CRM não duplica nada)
          if (x.pasta && x.pasta.length) {
            lote.push(x);
            if (lote.length >= 5) { const l = lote.splice(0); await entregar(l, { lote: true }); l.forEach(p => entregues.add(p)); }
          }
          // [03.10.2026] os incidentes que a ficha lista (cumprimento de
          // sentença, RPV) entram no fim da fila, se a rodada ainda não os
          // tem — antes só os favoritados eram lidos
          for (const inc of x.incidentes || [])
            if (!vistos.has(x.grau + ':' + inc.codigo) && !fila.some(f => f.codigo === inc.codigo))
              fila.push({ numero: x.numero, grau: x.grau, origem: 'incidente', codigo: inc.codigo, classe: inc.classe,
                link: `https://${host}${x.grau === '2º grau' ? '/cposg' : '/cpopg'}/show.do?processo.codigo=${inc.codigo}` });
        } catch (e) { falhas++; }
      }
      const comRecurso = [...new Set(lidos.filter(x => x.grau === '2º grau' || /grau de recurso/i.test(x.situacao || ''))
        .map(x => x.numero).filter(Boolean))];
      for (let i = 0; i < comRecurso.length; i++) {
        faixa(`e-SAJ 2º grau: recursos de ${i + 1} de ${comRecurso.length} — ${comRecurso[i]}…`);
        await espera(1200);
        try { falhas += await lerRecursosDoNumero(comRecurso[i], vistos, lidos); } catch (e) { falhas++; }
      }
      await noNavegador({ [ARQ]: arq });
      if (!lidos.length) { faixaErr(`nenhum processo lido (${falhas} falharam) — o e-SAJ está respondendo?`); return { erro: 'vazio' }; }

      // MESMO formato do PJe (fonte pje-acervo), uma coleta por grau: a tela
      // 📥 Importar casa pelo número; `sistema` diz de onde veio e `link`
      // abre a ficha no e-SAJ
      const quando = new Date().toISOString();
      // a pasta de quem já foi entregue num lote não viaja de novo
      await entregar(lidos.map(p => entregues.has(p) ? { ...p, pasta: null } : p), { parcial: falhas > 0, pulados, quando });
      await noNavegador({ ultima_esaj: quando, ...(rapido ? {} : { ultima_esaj_full: quando }) });
      faixaOk(`✔ ${lidos.length} processos do e-SAJ entregues ao CRM${falhas ? ` (${falhas} sem ficha ou sem resposta)` : ''}${rapido ? ' (modo rápido)' : ''} — confira em 📥 Importar.`);
      someFaixa(15000);
      return { ok: lidos.length, falhas };
    } catch (e) { faixaErr(e.message); return { erro: String(e.message || e) }; }
  };
})();
