// PJe TRF3 (pje1g/pje2g) — coleta do ACERVO: todos os processos com o último
// movimento de cada um. O pedido do Paulo é ciência de TUDO que movimentou,
// não só dos expedientes — e a aba Acervo já diz isso sem abrir processo.
//
// Como os outros coletores: roda na SUA sessão logada, no clique, e só
// entrega para a fila do CRM — quem decide o que vira andamento é a tela de
// importação. O PJe é JSF/RichFaces (a página conversa por postbacks com
// estado); reproduzir isso por fetch quebraria a cada detalhe de ViewState,
// então este coletor opera o DOM como um usuário paciente: seleciona o nó da
// árvore, espera a tabela assentar, vira as páginas do scroller e LÊ as
// linhas com as regras puras de pje-regras.js.
(() => {
  if (window.__crmColetorNoAr) return;
  window.__crmColetorNoAr = true;

  const REG = window.PJE_REGRAS;
  const grau = /pje1g/.test(location.host) ? '1º grau'
             : /pje2g/.test(location.host) ? '2º grau' : location.host;

  const tabela = () => document.getElementById('formAcervo:tbProcessos');

  // A CONVERSA DO PJe CAI QUANDO UM CLIQUE ATROPELA OUTRO. "A conversação
  // foi finalizada, tempo limite excedido ou outra requisição estava sendo
  // processada" é o JSF dizendo que recebeu um postback com outro em voo —
  // no 1º grau, com muitas páginas, era questão de tempo. Daqui em diante:
  // nenhum clique sai enquanto houver requisição ativa, e a página de erro
  // é detectada para ENTREGAR o que já foi lido em vez de perder a coleta.
  const RE_ERRO_JSF = /conversa[çc][ãa]o foi finalizada|tempo limite excedido|outra requisi[çc][ãa]o/i;
  // só conta se o aviso estiver DE FATO na tela — casca futura pode trazer a
  // mensagem pronta e escondida no DOM, e texto escondido não é erro
  function paginaMorreu() {
    if (!RE_ERRO_JSF.test((document.body || {}).textContent || '')) return false;
    for (const el of document.querySelectorAll('body *')) {
      if (el.children.length || !RE_ERRO_JSF.test(el.textContent || '')) continue;
      const r = el.getBoundingClientRect();
      if (r.width > 2 && r.height > 2 && getComputedStyle(el).visibility !== 'hidden') return true;
    }
    return false;
  }
  function emRequisicao() {
    for (const el of document.querySelectorAll(
      '[id$=":status.start"], [id$="_SP"], .rich-mpnl-mask-div'))
      if (el.offsetParent !== null && getComputedStyle(el).display !== 'none') return true;
    return false;
  }
  // espera de verdade: requisição nenhuma em voo, e só então libera o clique
  async function esperarLivre(teto = 40) {
    for (let i = 0; i < teto && emRequisicao(); i++) await pausa(300);
  }
  // A PROVA NEUTRA DE "TERMINOU": o DOM ficar `quieto` ms sem NENHUMA
  // mutação. A casca nova do painel quase não tem os indicadores _SP/status
  // do RichFaces antigo — esperar por eles era esperar por nada, o clique
  // seguinte colidia com a requisição em voo e a conversa caía já na
  // primeira página. Mutação de DOM não depende da casca.
  function esperarQuieto(quieto = 900, teto = 12000) {
    return new Promise(res => {
      let t = setTimeout(fim, quieto);
      const obs = new MutationObserver(() => { clearTimeout(t); t = setTimeout(fim, quieto); });
      const teimosia = setTimeout(fim, teto);
      function fim() { obs.disconnect(); clearTimeout(t); clearTimeout(teimosia); res(); }
      obs.observe(document.body, { childList: true, subtree: true, attributes: true });
    });
  }

  // espera a tabela do acervo TROCAR de conteúdo (ou existir) após um clique.
  // SÓ devolve false quando o ERRO DO PJe está visível na tela: jurisdição
  // de caixa VAZIA ("Não há itens aqui") não monta tabela nenhuma, a espera
  // estoura o tempo — e isso NÃO é conversa caída, é seguir para a próxima.
  // Confundir as duas coisas queimava as 3 retomadas na primeira jurisdição.
  async function assentar(antes, tentativas = 14) {
    for (let i = 0; i < tentativas; i++) {
      await pausa(700);
      if (paginaMorreu()) return false;
      const t = tabela();
      if (t && t.innerHTML !== antes && !emRequisicao()) {
        await esperarQuieto(700);      // a página sossega antes do próximo passo
        return true;
      }
    }
    await esperarQuieto(700);
    return !paginaMorreu();            // sem tabela ≠ morto; morto é erro NA TELA
  }

  function lerPaginaAtual(mapa) {
    const t = tabela();
    if (!t) return 0;
    let novos = 0;
    for (const p of REG.lerAcervoHtml(t.outerHTML)) {
      const antes = mapa.get(p.numero);
      const chave = x => (x.movimento ? x.movimento.data + ' ' + x.movimento.hora : '');
      if (!antes || chave(p) > chave(antes)) { mapa.set(p.numero, p); novos++; }
    }
    return novos;
  }

  // o botão » do scroller RichFaces; some (vira -dsbld) na última página
  function botaoProxima() {
    for (const el of document.querySelectorAll('[id^="formAcervo:tbProcessos:scPendentes"] .rich-datascr-button, .rich-datascr-button'))
      if (/»|>>|next/i.test(el.textContent + (el.getAttribute('onclick') || ''))
          && !/dsbld/.test(el.className)) return el;
    return null;
  }

  // MODO RÁPIDO (corte): se a última coleta completa deste grau foi há pouco,
  // não há por que reler o acervo inteiro — a página cujos movimentos são
  // TODOS anteriores ao corte encerra o nó. Três seguros: margem de 48h no
  // corte; coleta completa forçada a cada 7 dias; e a parada só vale enquanto
  // a tabela SE MOSTRAR ordenada do mais novo para o mais velho (cada página
  // conferida contra a anterior) — se a ordem quebrar, lê tudo como antes.
  async function coletarNoAtual(mapa, corte) {
    const chaveMov = p => p.movimento ? p.movimento.data + ' ' + p.movimento.hora : '';
    let ordenado = true, minAnterior = null;
    lerPaginaAtual(mapa);
    // caixa vazia não monta tabela — nada a paginar aqui, e clicar num
    // paginador que sobrou de outro nó só arrumaria confusão
    if (!tabela()) { faixa(`acervo ${grau}: caixa sem processos — seguindo…`); return true; }
    for (let pag = 0; pag < 60; pag++) {          // teto duro alto: o 1º grau tem muita página
      if (paginaMorreu()) return false;
      if (corte && ordenado && tabela()) {
        const ks = REG.lerAcervoHtml(tabela().outerHTML).map(chaveMov).filter(Boolean).sort();
        const maxAtual = ks[ks.length - 1] || '';
        if (minAnterior !== null && maxAtual && maxAtual > minAnterior) ordenado = false;
        else if (ks.length) {
          minAnterior = ks[0];
          if (maxAtual < corte) {                 // página inteira já vista na rodada anterior
            faixa(`acervo ${grau}: ${mapa.size} lidos — o resto deste nó é anterior à última coleta`);
            return true;
          }
        }
      }
      const prox = botaoProxima();
      if (!prox) break;
      await esperarLivre();                       // nunca clicar com requisição em voo
      await esperarQuieto(600);
      const antes = (tabela() || {}).innerHTML;
      prox.click();
      if (!await assentar(antes)) return false;   // conversa caiu no meio
      if (!lerPaginaAtual(mapa)) break;           // página repetida = fim de verdade
      faixa(`acervo ${grau}: ${mapa.size} processos lidos…`);
    }
    return true;
  }

  // os nós da árvore de jurisdições (TRF3, JEF...) — cada um recarrega a
  // tabela. Ficam de fora: nó com contador 0 na linha (Caixa de entrada
  // vazia) e o nó "Arquivo" (processo arquivado não movimenta — pedido do
  // Paulo). Cada clique poupado é um postback a menos para a conversa cair.
  const nosDaArvore = () =>
    [...document.querySelectorAll('a[id^="formAbaAcervo:trAc:"]')]
      .filter(a => /:jNd$/.test(a.id))
      .filter(a => !/arquivo/i.test(a.textContent || ''))
      .filter(a => {
        const linha = a.closest('tr,li,div');
        const m = linha && /(\d+)\s*$/.exec((linha.textContent || '').trim());
        return !(m && +m[1] === 0);
      });

  // RETOMADA AUTOMÁTICA. Conversa caída não se conserta sem recarregar a
  // página — e pedir "dê F5 e clique de novo" ao Paulo era empurrar o
  // trabalho de volta. Agora o coletor recarrega sozinho e recomeça (o
  // sinal vive no sessionStorage e sobrevive ao reload), com teto de 3
  // tentativas para não entrar em roda-viva num dia ruim do PJe.
  const RETOMAR = 'crm_pje_retomar';
  function agendarRetomada() {
    const n = +(sessionStorage.getItem(RETOMAR) || 0);
    if (n >= 3) return false;
    sessionStorage.setItem(RETOMAR, String(n + 1));
    return true;
  }
  function recarregarERetomar(msg) {
    faixa(msg + ' — recarrego a página e recomeço sozinho…');
    setTimeout(() => location.reload(), 900);
  }

  // ── o PROCESSO ABERTO: a cronologia inteira, não só o último movimento ──
  // A página de "Autos Digitais" carrega a lista aos poucos (rolagem infinita);
  // aqui rolamos até ela parar de crescer e lemos tudo com as regras puras.
  // Entrega como fonte 'pje-processo' — a tela de importação casa pelo número
  // e grava o histórico com a DATA DE CADA MOVIMENTO, sem inundar as Novidades.
  async function coletarProcessoAberto() {
    const cab = REG.lerCabecalhoProcesso(document.documentElement.outerHTML);
    if (!cab) { faixaErr('não achei o número do processo no topo — a página terminou de abrir?'); return { erro: 'sem número' }; }
    let tl = document.getElementById('divTimeLine');
    if (!tl) {
      const lk = document.querySelector('a[href="#divTimeLine"]');
      if (lk) { lk.click(); await pausa(1200); tl = document.getElementById('divTimeLine'); }
    }
    if (!tl) { faixaErr('não achei a Cronologia — abra essa aba na página e clique de novo'); return { erro: 'sem cronologia' }; }
    let antes = -1, quietos = 0, morreuNoMeio = false;
    for (let i = 0; i < 80 && quietos < 3; i++) {
      if (paginaMorreu()) { morreuNoMeio = true; break; }   // entrega o que carregou
      const n = tl.querySelectorAll('.media').length;
      if (n === antes) quietos++;
      else { quietos = 0; antes = n; faixa(`processo ${cab.numero}: ${n} itens da cronologia…`); }
      await esperarLivre();
      tl.scrollTop = tl.scrollHeight;
      const fim = tl.querySelector('.media:last-child');
      if (fim) fim.scrollIntoView({ block: 'end' });
      await pausa(900);
    }
    if (morreuNoMeio) faixa('⚠ o PJe derrubou a conversa durante a rolagem — entrego o que já carregou');
    const itens = REG.lerTimelineHtml(tl.outerHTML);
    if (!itens.length) { faixaErr('a cronologia estava vazia na tela'); return { erro: 'vazio' }; }
    const OUT = { versao: 1, fonte: 'pje-processo', grau, host: location.host,
                  quando: new Date().toISOString(), numero: cab.numero,
                  classe: cab.classe || null, orgao: cab.orgao || null,
                  link: location.href.split('#')[0], itens };
    await CRM.enviar('pje-processo', OUT);
    faixaOk(`✔ ${itens.length} itens do processo ${cab.numero} entregues ao CRM — confira em 📥 Importar.`);
    someFaixa();
    return { ok: itens.length };
  }

  window.crmRodar = async () => {
    try {
      if (!REG) { faixaErr('pje-regras.js não subiu — recarregue a página (F5)'); return { erro: 'sem regras' }; }
      // na janela de um processo aberto, o botão coleta o histórico COMPLETO dele
      if (/\/pje\/Processo\/ConsultaProcesso\/Detalhe\/listProcessoCompletoAdvogado\.seam/.test(location.pathname))
        return await coletarProcessoAberto();
      if (!/\/pje\/Painel\/painel_usuario\/advogado\.seam/.test(location.pathname)) {
        faixaErr('abra o Painel do Advogado do PJe (ou um processo) e clique de novo');
        return { erro: 'fora do painel' };
      }
      // conversa já caída ANTES de começar (sobrou de uma tentativa anterior):
      // recarregar é o único conserto — e agora é automático
      if (paginaMorreu()) {
        if (agendarRetomada()) { recarregarERetomar('a conversa do PJe está caída'); return { erro: 'retomando' }; }
        sessionStorage.removeItem(RETOMAR);
        faixaErr('o PJe derrubou a conversa 3 vezes seguidas — espere um minuto, dê F5 e clique de novo');
        return { erro: 'conversa caiu' };
      }
      // GARANTE A ABA ACERVO ABERTA. Na casca nova do painel (12.08.2026) a
      // árvore só nasce DEPOIS do clique na aba — e o clique tem de ir no
      // elemento que carrega o onclick (tabAcervo_shifted, conferido no HAR
      // do Paulo), não no td de fora, que não dispara nada. O fragmento que
      // chega por AJAX traz a MESMA árvore e a MESMA tabela de sempre.
      if (!tabela() && !nosDaArvore().length) {
        faixa('abrindo a aba Acervo…');
        const aba = document.getElementById('tabAcervo_shifted')
          || document.querySelector('#tabAcervo_cell table[onclick], td[id*="Acervo"] table[onclick]')
          || [...document.querySelectorAll('td[id*="Acervo"],a[id*="Acervo"],[id$="tabAcervo_lbl"]')]
              .find(el => /acervo/i.test(el.textContent || ''));
        if (aba) {
          aba.click();
          for (let i = 0; i < 30 && !tabela() && !nosDaArvore().length && !paginaMorreu(); i++)
            await pausa(700);
          await esperarQuieto(900);
        }
      }
      if (!tabela() && !nosDaArvore().length) {
        faixaErr('não consegui abrir a aba Acervo — se o painel mudou de novo, '
          + 'capture um HAR desta tela e avise o Claude');
        return { erro: 'sem acervo' };
      }

      // dois carimbos por grau: o da última rodada INTEIRA (qualquer modo —
      // é a base do corte, e cada rodada inteira cobre tudo desde a anterior
      // com 48h de sobra) e o da última rodada COMPLETA de verdade (sem
      // corte — é ela que vence em 7 dias e força a releitura total).
      const sufixo = /1º/.test(grau) ? '1g' : '2g';
      const chaveGrau = 'ultima_pje_' + sufixo, chaveFull = 'ultima_pje_full_' + sufixo;
      const st = await chrome.storage.local.get([chaveGrau, chaveFull]);
      const fullEm = st[chaveFull] ? new Date(st[chaveFull]).getTime() : 0;
      const baseEm = st[chaveGrau] ? new Date(st[chaveGrau]).getTime() : fullEm;
      const corte = (fullEm && Date.now() - fullEm < 7 * 86400000 && baseEm)
        ? new Date(baseEm - 48 * 3600000).toISOString().slice(0, 16).replace('T', ' ')
        : null;
      if (corte) faixa(`modo rápido: só o que movimentou desde ${corte.slice(8, 10)}/${corte.slice(5, 7)} — a cada 7 dias sai uma rodada completa`);

      const mapa = new Map();
      let inteira = true;                          // a conversa aguentou até o fim?
      const nos = nosDaArvore();
      if (nos.length) {
        for (let i = 0; i < nos.length; i++) {
          if (paginaMorreu()) { inteira = false; break; }
          faixa(`acervo ${grau}: jurisdição ${i + 1} de ${nos.length}…`);
          await esperarLivre();
          await esperarQuieto(600);
          const antes = (tabela() || {}).innerHTML || '';
          nos[i].click();
          if (!await assentar(antes)) { inteira = false; break; }
          if (!await coletarNoAtual(mapa, corte)) { inteira = false; break; }
          await pausa(500);                        // fôlego entre jurisdições
        }
      } else {
        inteira = await coletarNoAtual(mapa, corte);   // sem árvore: lê o que está posto
      }

      if (!mapa.size) {
        if (!inteira && agendarRetomada()) { recarregarERetomar('o PJe derrubou a conversa antes de ler qualquer processo'); return { erro: 'retomando' }; }
        if(!inteira) sessionStorage.removeItem(RETOMAR);
        faixaErr(inteira ? 'nenhum processo lido — o acervo estava vazio na tela?'
          : 'o PJe derrubou a conversa 3 vezes seguidas — espere um minuto, dê F5 e clique de novo');
        return { erro: inteira ? 'vazio' : 'conversa caiu' };
      }
      // MESMO PELA METADE, O LIDO É ENTREGUE: a dedupe do CRM ignora o
      // repetido, então a retomada completa o que faltou sem duplicar.
      const OUT = { versao: 1, fonte: 'pje-acervo', grau, host: location.host,
                    quando: new Date().toISOString(), parcial: !inteira,
                    processos: [...mapa.values()] };
      await CRM.enviar('pje', OUT);
      await chrome.storage.local.set({ ultima_pje: OUT.quando });
      if (inteira) {
        sessionStorage.removeItem(RETOMAR);        // rodada completa zera o contador
        // os carimbos só avançam quando ESTA rodada chegou ao fim — parcial
        // não pode fazer o modo rápido pular o que ficou sem ler
        await chrome.storage.local.set({ [chaveGrau]: OUT.quando,
          ...(corte ? {} : { [chaveFull]: OUT.quando }) });
        faixaOk(`✔ ${mapa.size} processos do ${grau} entregues ao CRM${corte ? ' (modo rápido)' : ''} — confira em 📥 Importar.`);
        someFaixa();
      } else if (agendarRetomada()) {
        recarregarERetomar(`entreguei os ${mapa.size} processos já lidos; o PJe caiu no meio`);
      } else {
        sessionStorage.removeItem(RETOMAR);
        faixaErr(`⚠ entreguei os ${mapa.size} processos lidos, mas o PJe caiu 3 vezes seguidas — `
          + 'espere um minuto, dê F5 e clique de novo para completar (nada duplica).');
      }
      return { ok: mapa.size, parcial: !inteira };
    } catch (e) { faixaErr(e.message); return { erro: String(e.message || e) }; }
  };

  // a outra ponta da retomada: a página recarregou por nossa conta — quando
  // ela assentar, a coleta recomeça sem ninguém clicar. Só no painel: se o
  // reload cair noutra tela, o sinal fica guardado para o próximo clique.
  if (sessionStorage.getItem(RETOMAR)
      && /\/pje\/Painel\/painel_usuario\/advogado\.seam/.test(location.pathname)) {
    const tent = +(sessionStorage.getItem(RETOMAR) || 1);
    faixa(`retomando a coleta do PJe (tentativa ${tent} de 3) — esperando a página ficar pronta…`);
    (async () => {
      // pronta = carregada, com a aba/árvore no DOM e o DOM sossegado —
      // recomeçar aos 3,5s numa casca ainda montando era o que queimava
      // as três tentativas sem sair da primeira página
      for (let i = 0; i < 60; i++) {
        if (document.readyState === 'complete'
            && (tabela() || nosDaArvore().length || document.getElementById('tabAcervo_shifted'))) break;
        await pausa(700);
      }
      await pausa(1500 + 2500 * tent);            // recuo progressivo entre tentativas
      await esperarQuieto(1000);
      if (window.crmRodar) window.crmRodar();
    })();
  }
})();
