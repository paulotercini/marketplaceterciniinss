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

  // espera a tabela do acervo TROCAR de conteúdo (ou existir) após um clique
  async function assentar(antes, tentativas = 24) {
    for (let i = 0; i < tentativas; i++) {
      await pausa(700);
      const t = tabela();
      if (t && t.innerHTML !== antes && !document.querySelector('.rich-mpnl-mask-div,[id$="_SP"]:not([style*="display: none"])'))
        return true;
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
    for (let pag = 0; pag < 40; pag++) {          // teto duro: acervo não tem 40 páginas
      const prox = botaoProxima();
      if (!prox) break;
      const antes = (tabela() || {}).innerHTML;
      prox.click();
      await assentar(antes);
      if (!lerPaginaAtual(mapa)) break;           // página repetida = fim de verdade
      faixa(`acervo ${grau}: ${mapa.size} processos lidos…`);
    }
  }

  // os nós da árvore de jurisdições (TRF3, JEF...) — cada um recarrega a tabela
  const nosDaArvore = () =>
    [...document.querySelectorAll('a[id^="formAbaAcervo:trAc:"]')]
      .filter(a => /:jNd$/.test(a.id));

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
    let antes = -1, quietos = 0;
    for (let i = 0; i < 80 && quietos < 3; i++) {
      const n = tl.querySelectorAll('.media').length;
      if (n === antes) quietos++;
      else { quietos = 0; antes = n; faixa(`processo ${cab.numero}: ${n} itens da cronologia…`); }
      tl.scrollTop = tl.scrollHeight;
      const fim = tl.querySelector('.media:last-child');
      if (fim) fim.scrollIntoView({ block: 'end' });
      await pausa(900);
    }
    const itens = REG.lerTimelineHtml(tl.outerHTML);
    if (!itens.length) { faixaErr('a cronologia estava vazia na tela'); return { erro: 'vazio' }; }
    const OUT = { versao: 1, fonte: 'pje-processo', grau, host: location.host,
                  quando: new Date().toISOString(), numero: cab.numero,
                  classe: cab.classe || null, orgao: cab.orgao || null, itens };
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
      const nos = nosDaArvore();
      if (nos.length) {
        for (let i = 0; i < nos.length; i++) {
          faixa(`acervo ${grau}: jurisdição ${i + 1} de ${nos.length}…`);
          const antes = (tabela() || {}).innerHTML || '';
          nos[i].click();
          await assentar(antes);
          await coletarNoAtual(mapa);
        }
      } else {
        await coletarNoAtual(mapa);                // sem árvore: lê o que está posto
      }

      if (!mapa.size) { faixaErr('nenhum processo lido — o acervo estava vazio na tela?'); return { erro: 'vazio' }; }
      const OUT = { versao: 1, fonte: 'pje-acervo', grau, host: location.host,
                    quando: new Date().toISOString(), processos: [...mapa.values()] };
      await CRM.enviar('pje', OUT);
      await chrome.storage.local.set({ ultima_pje: OUT.quando });
      faixaOk(`✔ ${mapa.size} processos do ${grau} entregues ao CRM — confira em 📥 Importar.`);
      someFaixa();
      return { ok: mapa.size };
    } catch (e) { faixaErr(e.message); return { erro: String(e.message || e) }; }
  };
})();
