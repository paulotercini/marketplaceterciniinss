// eproc TJSP — coleta da RELAÇÃO DE PROCESSOS (todos os processos com o
// último evento de cada um) e, com um processo aberto, da lista de eventos
// completa. Mesmo contrato do coletor do PJe: roda na SUA sessão logada, no
// clique, e só entrega para a fila do CRM.
//
// O TJSP tem QUATRO eprocs, cada um num host, e o seletor de perfil do topo
// (SP / EF / CR / TJSP) pula de um para outro abrindo outra aba:
//   eproc1g.tjsp.jus.br        1º grau cível        (perfil SP)
//   eproc1g-ef.tjsp.jus.br     execução fiscal      (perfil EF)
//   eproc1g-crim.tjsp.jus.br   criminal             (perfil CR)
//   eproc2g.tjsp.jus.br        2º grau              (perfil TJSP)
// Cada aba coleta o SEU host. Conferido ao vivo em 14.09.2026: só o cível
// 1º grau tinha processos; os outros três respondiam "Nenhum registro".
//
// Ao contrário do PJe (JSF com estado), o eproc é HTML de formulário: a
// relação vem de um POST simples em frmProcessoLista, com hdnInfraPaginaAtual
// para a página. Por isso a coleta não clica em nada: refaz o POST por fetch
// na mesma sessão e lê o HTML com as regras puras de eproc-regras.js. A
// página é ISO-8859-1 — decodificar errado vira "SENTEN�A".
(() => {
  if (window !== window.top) return;      // a retomada navega a janela em que roda: só a de cima
  if (window.__crmColetorNoAr) return;
  window.__crmColetorNoAr = true;

  const REG = window.EPROC_REGRAS;
  const host = location.host;
  const grau = /eproc2g/.test(host) ? '2º grau' : '1º grau';
  const sistema = /-ef\./.test(host) ? 'eproc TJSP execução fiscal'
                : /-crim\./.test(host) ? 'eproc TJSP criminal'
                : /eproc2g/.test(host) ? 'eproc TJSP 2º grau' : 'eproc TJSP 1º grau';

  const formLista = () => document.getElementById('frmProcessoLista');
  const linkRelacao = () => document.querySelector('a[href*="acao=relatorio_processo_procurador_listar"]');
  const logado = () => !!document.getElementById('selInfraUnidades');

  async function baixar(url, opts) {
    const r = await fetch(url, { credentials: 'include', ...opts });
    if (!r.ok) throw new Error(`o eproc respondeu ${r.status}`);
    const buf = await r.arrayBuffer();
    const tipo = r.headers.get('content-type') || '';
    const cs = (tipo.match(/charset=([\w-]+)/i) || [])[1] || 'iso-8859-1';
    return new TextDecoder(cs).decode(buf);
  }

  // uma página da relação: o mesmo POST que o botão "Buscar" faz, sem os
  // baixados (processo baixado não movimenta) e com a página pedida
  async function paginaDaRelacao(n) {
    const f = formLista();
    const fd = new FormData(f);
    fd.delete('chkMostrarBaixados');
    fd.set('hdnInfraPaginaAtual', String(n));
    return baixar(f.action, { method: 'POST', body: new URLSearchParams(fd) });
  }

  async function coletarRelacao() {
    const mapa = new Map();
    let total = null;
    // ponytail: paginação nunca observada (o acervo cabe numa página); o laço
    // segue enquanto a página trouxer processo novo e o total não fechar
    for (let pag = 0; pag < 200; pag++) {
      const html = await paginaDaRelacao(pag);
      if (!logadoNoHtml(html)) throw new Error('a sessão do eproc caiu — faça login de novo e clique outra vez');
      if (total === null) total = REG.totalRegistros(html);
      let novos = 0;
      for (const p of REG.lerAcervoHtml(html)) if (!mapa.has(p.numero)) {
        // F95 · o endereço do processo, absoluto: é o que o CRM guarda e abre
        if (p.link_rel) { try { p.link = new URL(p.link_rel, location.href).href; } catch (e) {} }
        delete p.link_rel;
        mapa.set(p.numero, p); novos++;
      }
      faixa(`${sistema}: ${mapa.size}${total ? ' de ' + total : ''} processos lidos…`);
      if (!novos || (total !== null && mapa.size >= total)) break;
      await pausa(400);
    }
    return { processos: [...mapa.values()], total };
  }
  const logadoNoHtml = html => !/Sua sess[ãa]o foi encerrada|acao=login|externo_controlador/i.test(html.slice(0, 4000))
                              || /frmProcessoLista|selInfraUnidades/.test(html);

  // ── o PROCESSO ABERTO: todos os eventos, com data de cada um ─────────────
  async function coletarProcessoAberto() {
    const html = document.documentElement.outerHTML;
    const cab = REG.lerCabecalhoProcesso(html);
    if (!cab) { faixaErr('não achei o número do processo na capa'); return { erro: 'sem número' }; }
    const itens = REG.lerEventosHtml(html);
    if (!itens.length) { faixaErr('a lista de eventos estava vazia na tela'); return { erro: 'vazio' }; }
    const OUT = { versao: 1, fonte: 'pje-processo', sistema: 'eproc', tribunal: 'TJSP', grau, host,
                  quando: new Date().toISOString(), numero: cab.numero,
                  classe: cab.classe || null, orgao: cab.orgao || null,
                  link: location.href.split('#')[0], itens };
    await CRM.enviar('pje-processo', OUT);
    faixaOk(`✔ ${itens.length} eventos do processo ${cab.numero} entregues ao CRM — confira em 📥 Importar.`);
    someFaixa();
    return { ok: itens.length };
  }

  // fora da relação (painel, consulta...), o coletor vai até ela sozinho e
  // recomeça quando a página abrir — o sinal vive no sessionStorage
  const RETOMAR = 'crm_eproc_retomar';

  window.crmRodar = async (_desde, opts) => {
    try {
      if (!REG) { faixaErr('eproc-regras.js não subiu — recarregue a página (F5)'); return { erro: 'sem regras' }; }
      if (!logado()) { faixaErr('faça login no eproc (certificado ou senha) e clique de novo'); return { erro: 'sem login' }; }
      // F97 · o "atualizar tudo" (opts.acervo) quer a relação inteira, mesmo
      // com um processo aberto na aba; o clique manual coleta o processo
      if (document.getElementById('tblEventos') && /acao=processo_selecionar/.test(location.search)
          && !(opts && opts.acervo))
        return await coletarProcessoAberto();
      if (!formLista()) {
        const l = linkRelacao();
        if (!l) { faixaErr('abra a Relação de Processos (menu Relatórios) e clique de novo'); return { erro: 'fora da relação' }; }
        sessionStorage.setItem(RETOMAR, '1');
        faixa('abrindo a Relação de Processos…');
        location.href = l.href;
        return { erro: 'retomando' };
      }
      faixa(`${sistema}: lendo a relação de processos…`);
      const { processos, total } = await coletarRelacao();
      if (!processos.length) {
        faixaOk(total === 0 ? `${sistema}: nenhum processo ativo neste eproc — nada a entregar.`
                            : `${sistema}: nenhum processo lido — a relação estava vazia na tela?`);
        someFaixa();
        return { ok: 0 };
      }
      // MESMO formato do PJe (fonte pje-acervo): a tela 📥 Importar casa pelo
      // número e grava o último movimento; `sistema` diz de onde veio
      const OUT = { versao: 1, fonte: 'pje-acervo', sistema: 'eproc', tribunal: 'TJSP', grau, host,
                    quando: new Date().toISOString(), parcial: total !== null && processos.length < total,
                    processos };
      await CRM.enviar('pje', OUT);
      await chrome.storage.local.set({ ultima_eproc: OUT.quando, ['ultima_eproc_' + host]: OUT.quando });
      faixaOk(`✔ ${processos.length} processos do ${sistema} entregues ao CRM — confira em 📥 Importar.`);
      someFaixa();
      return { ok: processos.length };
    } catch (e) { faixaErr(e.message); return { erro: String(e.message || e) }; }
  };

  if (sessionStorage.getItem(RETOMAR) && formLista()) {
    sessionStorage.removeItem(RETOMAR);
    setTimeout(() => window.crmRodar && window.crmRodar(), 800);
  }
})();
