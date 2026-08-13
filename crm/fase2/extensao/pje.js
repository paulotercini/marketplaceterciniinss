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
  const paginaMorreu = () => RE_ERRO_JSF.test((document.body || {}).innerText || '');
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

  // espera a tabela do acervo TROCAR de conteúdo (ou existir) após um clique
  async function assentar(antes, tentativas = 24) {
    for (let i = 0; i < tentativas; i++) {
      await pausa(700);
      if (paginaMorreu()) return false;
      const t = tabela();
      if (t && t.innerHTML !== antes && !emRequisicao()) {
        await pausa(400);              // o RichFaces respira antes do próximo passo
        return true;
      }
    }
    return !!tabela();
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

  async function coletarNoAtual(mapa) {
    lerPaginaAtual(mapa);
    for (let pag = 0; pag < 60; pag++) {          // teto duro alto: o 1º grau tem muita página
      if (paginaMorreu()) return false;
      const prox = botaoProxima();
      if (!prox) break;
      await esperarLivre();                       // nunca clicar com requisição em voo
      const antes = (tabela() || {}).innerHTML;
      prox.click();
      if (!await assentar(antes)) return false;   // conversa caiu no meio
      if (!lerPaginaAtual(mapa)) break;           // página repetida = fim de verdade
      faixa(`acervo ${grau}: ${mapa.size} processos lidos…`);
    }
    return true;
  }

  // os nós da árvore de jurisdições (TRF3, JEF...) — cada um recarrega a
  // tabela. Nó com contador 0 na linha (ex.: Caixa de entrada vazia) é
  // pulado: cada clique poupado é um postback a menos para a conversa cair.
  const nosDaArvore = () =>
    [...document.querySelectorAll('a[id^="formAbaAcervo:trAc:"]')]
      .filter(a => /:jNd$/.test(a.id))
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
      // garante a aba Acervo aberta
      if (!tabela()) {
        const aba = [...document.querySelectorAll('td[id*="Acervo"],a[id*="Acervo"],[id$="tabAcervo_lbl"]')]
          .find(el => /acervo/i.test(el.textContent || ''));
        if (aba) { aba.click(); await assentar(''); }
      }
      if (!tabela() && !nosDaArvore().length) {
        faixaErr('não achei a aba Acervo — abra-a e clique de novo');
        return { erro: 'sem acervo' };
      }

      const mapa = new Map();
      let inteira = true;                          // a conversa aguentou até o fim?
      const nos = nosDaArvore();
      if (nos.length) {
        for (let i = 0; i < nos.length; i++) {
          if (paginaMorreu()) { inteira = false; break; }
          faixa(`acervo ${grau}: jurisdição ${i + 1} de ${nos.length}…`);
          await esperarLivre();
          const antes = (tabela() || {}).innerHTML || '';
          nos[i].click();
          if (!await assentar(antes)) { inteira = false; break; }
          if (!await coletarNoAtual(mapa)) { inteira = false; break; }
          await pausa(500);                        // fôlego entre jurisdições
        }
      } else {
        inteira = await coletarNoAtual(mapa);      // sem árvore: lê o que está posto
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
        faixaOk(`✔ ${mapa.size} processos do ${grau} entregues ao CRM — confira em 📥 Importar.`);
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
    faixa(`retomando a coleta do PJe (tentativa ${sessionStorage.getItem(RETOMAR)} de 3) — aguarde a página abrir…`);
    setTimeout(() => { if (window.crmRodar) window.crmRodar(); }, 3500);
  }
})();
