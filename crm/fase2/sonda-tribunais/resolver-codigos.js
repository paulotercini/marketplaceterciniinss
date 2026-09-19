// RESOLVEDOR — 180 códigos do e-SAJ viram 180 números de processo.
//
// O PROBLEMA QUE ELE RESOLVE: seus favoritos guardam o acervo de verdade (180
// processos), mas 161 dos 209 links não trazem o número CNJ — só o
// `processo.codigo`, chave interna do e-SAJ. O número está do outro lado do
// link. A sonda da ficha já provou que está lá, em #numeroProcesso, junto com
// classe, assunto, foro, vara, juiz, situação e partes. Este script vai
// buscar, um por um, na SUA sessão já logada.
//
// COMO USAR (duas colagens, nesta ordem):
//   1. abra o e-SAJ LOGADO em qualquer página de https://esaj.tjsp.jus.br
//   2. F12 -> Console -> cole alvos-acervo.js  (define window.__alvos)
//   3. cole ESTE arquivo -> Enter
//   4. acompanhe o progresso; ao fim baixam DOIS arquivos
//
// PARAR NO MEIO: digite  __pararResolver = true  no console. Ele termina a
// requisição em curso, salva o que já colheu e baixa os arquivos. Nada se
// perde: o parcial fica em window.__acervoResolvido e uma segunda execução
// PULA o que já resolveu.
//
// OS DOIS ARQUIVOS, e por que são dois:
//   acervo-resolvido.cru.json — número, partes, nomes. É DADO. Fica na sua
//       máquina, está no .gitignore, NÃO vai para o chat.
//   acervo-resumo.json — só contagens e vocabulário do sistema (classe,
//       situação, ano). Mascarado. ESTE pode ser colado no chat.
//
// RITMO: uma requisição por vez, com pausa de ~1s e sorteio. 180 processos dão
// uns 4 minutos. Sequencial não é lentidão minha: disparar 180 requisições em
// paralelo contra o tribunal é abuso, e é o jeito mais rápido de a sessão
// levar bloqueio no meio do trabalho.
//
// O QUE ELE NÃO FAZ: não escreve no CRM, não altera nada no e-SAJ, não abre
// documento, não baixa peça. Só lê a capa e anota.
(async () => {
  'use strict';

  const PAUSA_MS = 900;        // base entre requisições
  const SORTEIO_MS = 600;      // + aleatório, para não virar um metrônomo
  const TENTATIVAS = 2;        // por alvo, antes de desistir e anotar o erro

  if (location.host !== 'esaj.tjsp.jus.br') {
    console.error('[resolvedor] cole isto numa aba do esaj.tjsp.jus.br (logado). Host atual:',
                  location.host);
    return;
  }
  if (!Array.isArray(window.__alvos) || !window.__alvos.length) {
    console.error('[resolvedor] window.__alvos vazio — cole alvos-acervo.js ANTES deste arquivo.');
    return;
  }

  const RE_CNJ = /(\d{7})-(\d{2})\.(\d{4})\.(\d)\.(\d{2})\.(\d{4})/;
  const RE_CNJ_G = new RegExp(RE_CNJ.source, 'g');
  const forma = t => String(t).replace(/[0-9]/g, '9')
                              .replace(/[A-ZÀ-Þ]/g, 'A')
                              .replace(/[a-zà-ÿ]/g, 'a');
  const txt = el => (el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : null);
  const espera = ms => new Promise(r => setTimeout(r, ms));

  // ── ler os bytes com a tabela certa ────────────────────────────────────
  // A primeira varredura trouxe "JosÃ©", "ConceiÃ§Ã£o", "Procedimento Comum
  // CÃ­vel" — 100% dos nomes acentuados corrompidos. Isso é UTF-8 lido como
  // ISO-8859-1, e a culpa é de `Response.text()`: ele obedece o charset do
  // cabeçalho, e o e-SAJ ANUNCIA ISO-8859-1 enquanto SERVE UTF-8. A sonda da
  // ficha não sofreu porque rodava dentro da página, já decodificada.
  //
  // Nome corrompido não é feiúra, é falha de função: nome é a única ponte
  // entre o processo e o cliente do CRM no 1º grau, e "JosÃ©" não casa com
  // "José" em nenhum cruzamento.
  //
  // UTF-8 E PONTO. Duas rodadas foram perdidas aqui, e a lição é sobre
  // engenharia, não sobre acentuação.
  //
  // Eu escrevi um fallback para ISO-8859-1 imaginando que "o acervo velho
  // pode ter página em outra tabela". Nunca vi uma. Mas o fallback disparou:
  // primeiro por UM byte inválido (guarda por presença de U+FFFD), depois por
  // proporção — nas 180 páginas, todas. O resultado ficou PIOR que o defeito
  // original, duas vezes seguidas.
  //
  // A prova de que os bytes são UTF-8: `prova_de_acento` voltou [67,195,173],
  // que é exatamente "C" + os bytes C3 AD ("í" em UTF-8) lidos como cp1252. E
  // desfazer esse caminho recuperou 904 nomes sem uma falha. Os bytes sempre
  // estiveram certos; quem errou foi a minha escolha de tabela.
  //
  // Então o ramo morre. Se algum dia aparecer página realmente em outra
  // codificação, ela vai sair visivelmente torta e `bytes_invalidos` vai
  // acusar — melhor um defeito que se vê do que um fallback que se engana
  // sozinho e estraga o que estava bom.
  function decodificar(buf) {
    const texto = new TextDecoder('utf-8').decode(buf);
    return {
      texto, codificacao: 'utf-8',
      bytes_invalidos: (texto.match(/�/g) || []).length,
    };
  }

  // ── os seletores, e de onde eles vieram ────────────────────────────────
  // Não são chute: saíram da sonda da ficha rodada em 06.09.2026 numa ficha
  // real do cpopg. O 2º grau (cposg) NUNCA foi sondado — os 17 alvos de 2G
  // entram aqui sabendo que podem não casar, e o que não casar é ANOTADO como
  // falha, não preenchido no escuro.
  const CAMPOS_1G = {
    numero: '#numeroProcesso',
    situacao: '#labelSituacaoProcesso',
    classe: '#classeProcesso',
    assunto: '#assuntoProcesso',
    foro: '#foroProcesso',
    vara: '#varaProcesso',
    juiz: '#juizProcesso',
    distribuicao: '#dataHoraDistribuicaoProcesso',
    controle: '#numeroControleProcesso',
    area: '#areaProcesso',
    valor: '#valorAcaoProcesso',
  };

  // ── decodificar entidade sem tabela de entidade ────────────────────────
  // A primeira versão arrancava as tags com regex e devolvia "&nbsp; Paulo
  // Roberto Tercini Filho &nbsp;" — entidade crua no nome, que nunca casaria
  // com o CRM. Em vez de manter uma tabela de entidades (que sempre falta
  // uma), jogo o pedaço num elemento e leio o textContent: quem decodifica é
  // o navegador, que sabe todas.
  const CAIXA = document.createElement('div');
  function semMarcacao(html) {
    CAIXA.innerHTML = html;
    return (CAIXA.textContent || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Nem todo prefixo antes de um nome é advogado. "RepreLeg:", "Curador:" e
  // "Def. Púb:" apareceram na primeira varredura DENTRO da lista de
  // advogados — e representante legal de menor não é advogado do processo.
  const RE_PAPEL = /^([A-Za-zÀ-ÿ.\s]{3,20}):\s*/;

  // A tabela de partes do e-SAJ é <tr><td>rótulo</td><td>NOME<br>Advogado: NOME</td></tr>.
  // Guardo tipo e nome porque é por AQUI que o processo vai casar com o
  // cliente do CRM — no e-SAJ 1º grau não há CPF na capa, então o nome é a
  // única ponte que existe.
  function extrairPartes(doc) {
    const tab = doc.querySelector('#tablePartesPrincipais') || doc.querySelector('#tableTodasPartes');
    if (!tab) return [];
    return [...tab.querySelectorAll('tr')].map(tr => {
      const tds = tr.querySelectorAll('td');
      if (tds.length < 2) return null;
      const linhas = (tds[1].innerHTML || '').split(/<br\s*\/?>/i)
        .map(semMarcacao).filter(Boolean);
      const advogados = [], outros = [];
      for (const l of linhas.slice(1)) {
        const m = RE_PAPEL.exec(l);
        const nome = m ? l.slice(m[0].length).trim() : l;
        if (!nome) continue;
        // sem prefixo, ou prefixo "Advogado/Advogada", é advogado; o resto é
        // outro papel e vai guardado COM o papel, não misturado
        if (!m || /^advogad[oa]$/i.test(m[1].trim())) advogados.push(nome);
        else outros.push({ papel: m[1].trim(), nome });
      }
      return { tipo: txt(tds[0]), nome: linhas[0] || null, advogados, outros };
    }).filter(Boolean);
  }

  function extrairFicha(doc, alvo) {
    const out = { seletores_falharam: [] };
    for (const [nome, sel] of Object.entries(CAMPOS_1G)) {
      const v = txt(doc.querySelector(sel));
      if (v === null || v === '') out.seletores_falharam.push(nome);
      out[nome] = v;
    }
    // rede de segurança: se #numeroProcesso não existir (é o caso esperado no
    // 2º grau, não sondado), pesco o CNJ do texto e MARCO que veio por regex —
    // para eu nunca confundir "li do seletor certo" com "achei no meio da página"
    out.via = 'seletor';
    if (!out.numero) {
      const m = (doc.body ? doc.body.textContent : '').match(RE_CNJ_G);
      if (m && m.length) { out.numero = m[0]; out.via = 'regex'; }
    }
    out.partes = extrairPartes(doc);
    // O e-SAJ pode devolver OUTRA capa se o código não for mais válido. A capa
    // certa cita o próprio código no HTML (links de incidentes, campos
    // ocultos). Sem esta conferência, 180 registros errados só apareceriam
    // muito depois — e caladamente.
    out.confere_codigo = (doc.body ? doc.body.innerHTML : '').includes(alvo.codigo);
    return out;
  }

  // ── o laço ─────────────────────────────────────────────────────────────
  window.__pararResolver = false;
  const feitos = window.__acervoResolvido instanceof Map
    ? window.__acervoResolvido : new Map();
  window.__acervoResolvido = feitos;

  const alvos = window.__alvos.filter(a => !feitos.has(a.codigo));
  console.log('%c[resolvedor]', 'color:#2B5FC7;font-weight:700',
              `${alvos.length} a resolver (${feitos.size} já feitos) · ~${
                Math.ceil(alvos.length * (PAUSA_MS + SORTEIO_MS / 2) / 60000)} min`);
  console.log('para parar: __pararResolver = true');

  let ok = 0, falhas = 0;
  for (let i = 0; i < alvos.length; i++) {
    if (window.__pararResolver) { console.warn('[resolvedor] parado a pedido.'); break; }
    const alvo = alvos[i];
    let reg = null;

    for (let t = 1; t <= TENTATIVAS && !reg; t++) {
      try {
        const r = await fetch(alvo.url, { credentials: 'include', redirect: 'follow' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const lido = decodificar(await r.arrayBuffer());
        const doc = new DOMParser().parseFromString(lido.texto, 'text/html');
        // sessão caída devolve 200 com tela de login: erro que se disfarça de
        // sucesso, e o pior de todos numa varredura longa
        const temSenha = !!doc.querySelector('input[type=password]');
        const f = extrairFicha(doc, alvo);
        if (!f.numero && temSenha) throw new Error('sessao-caiu');
        if (!f.numero) throw new Error('sem-numero');
        reg = { ...alvo, ...f, codificacao: lido.codificacao, erro: null };
      } catch (e) {
        if (t === TENTATIVAS) reg = { ...alvo, numero: null, erro: e.message };
        else await espera(1500);
      }
    }

    feitos.set(alvo.codigo, reg);
    reg.erro ? falhas++ : ok++;
    if (reg.erro === 'sessao-caiu') {
      console.error('[resolvedor] a sessão do e-SAJ caiu. Faça login de novo e rode outra vez — o que já foi colhido está guardado.');
      break;
    }
    if ((i + 1) % 10 === 0 || i === alvos.length - 1)
      console.log(`  ${i + 1}/${alvos.length} · ok ${ok} · falhas ${falhas}`);
    await espera(PAUSA_MS + Math.random() * SORTEIO_MS);
  }

  // ── entrega ────────────────────────────────────────────────────────────
  const todos = [...feitos.values()];

  // ISTO AQUI É A FRONTEIRA. Tudo o que esta função devolve sai da máquina;
  // tudo o que ela deixa de fora fica. Por isso ela é uma função com nome e
  // não um objeto montado no meio do laço: dá para trancá-la com teste, e o
  // teste é literalmente "nenhum nome, número, CPF ou rótulo atravessou".
  //
  // O que PODE sair: contagem, e vocabulário do sistema. "Procedimento Comum
  // Cível" e "Extinto" são palavras do e-SAJ, iguais para todo mundo — não
  // dizem nada sobre o seu cliente. O ano e o par justiça.tribunal saem do
  // próprio número CNJ, sem carregar o número.
  function montarResumo(totalAlvos, todos) {
    const conta = (lista, f) => lista.reduce((h, x) => {
      const k = f(x); if (k) h[k] = (h[k] || 0) + 1; return h;
    }, {});
    const anoDe = r => (String(r.numero).match(/\.(\d{4})\.\d\.\d{2}\./) || [])[1];
    const tribDe = r => {
      const m = /(\d{7})-(\d{2})\.(\d{4})\.(\d)\.(\d{2})\.(\d{4})/.exec(String(r.numero));
      return m ? m[4] + '.' + m[5] : null;
    };
    const bons = todos.filter(r => r.numero && !r.erro);
    return {
      relatorio: 'acervo-resolvido', versao: 1, quando: new Date().toISOString(),
      total_alvos: totalAlvos,
      resolvidos: bons.length,
      falharam: todos.length - bons.length,
      nao_tentados: totalAlvos - todos.length,
      integridade: {
        por_seletor: bons.filter(r => r.via === 'seletor').length,
        por_regex: bons.filter(r => r.via === 'regex').length,
        codigo_nao_confere: bons.filter(r => r.confere_codigo === false).length,
        campos_que_mais_falharam: conta(bons, r => (r.seletores_falharam || [])[0]),
      },
      erros: conta(todos.filter(r => r.erro), r => r.erro),
      por_codificacao: conta(bons, r => r.codificacao),
      // ── A PROVA DE ACENTO ────────────────────────────────────────────
      // Na rodada passada eu não soube dizer se o mojibake nasceu no
      // arquivo ou no caminho até o chat, e "conserto" no escuro só piorou.
      // Texto se corrompe em trânsito; NÚMERO não. Então mando o código de
      // cada caractere de uma classe processual — vocabulário do sistema,
      // não dado de cliente — e a leitura fica objetiva:
      //   105/237 ("í" em "Cível")      -> leitura CERTA
      //   195 seguido de 173 ("Ã" "­")  -> mojibake NO ARQUIVO
      // Se os números vierem certos e o texto ao lado vier torto, o estrago
      // é do caminho, não do robô — e não se mexe mais no decodificador.
      prova_de_acento: (() => {
        const r = bons.find(x => x.classe && /[^\x00-\x7F]/.test(x.classe));
        return r ? [...r.classe.slice(0, 30)].map(c => c.charCodeAt(0)) : null;
      })(),
      // 180 CÓDIGOS NÃO SÃO 180 PROCESSOS, e nenhum dos dois é 180 CASOS.
      // A primeira varredura mostrou: Jean Gustavo tem 4 códigos (principal,
      // cumprimento, RPV do principal, RPV dos honorários) para 2 números e
      // UM caso. E o e-SAJ já entrega a chave que junta tudo — o número de
      // controle, que o incidente herda do processo de origem. É a mesma
      // granularidade de `casos` no CRM, então é por aqui que o cruzamento
      // tem de ser contado; contar código infla o acervo.
      numeros_distintos: new Set(bons.map(r => r.numero)).size,
      casos_distintos: new Set(bons.map(r => r.controle).filter(Boolean)).size,
      sem_controle: bons.filter(r => !r.controle).length,
      por_grau: conta(bons, r => r.grau),
      por_tribunal: conta(bons, tribDe),
      por_ano: Object.fromEntries(Object.entries(conta(bons, anoDe)).sort()),
      por_classe: conta(bons, r => r.classe),
      por_situacao: conta(bons, r => r.situacao),
    };
  }

  const resumo = montarResumo(window.__alvos.length, todos);

  // ── entregar sem depender do download ──────────────────────────────────
  // Dois a.click() em sequência disparam o aviso "permitir vários downloads"
  // do Chrome, e se ele não for aceito o SEGUNDO arquivo simplesmente não
  // desce — sem erro, sem aviso no console. Foi o que aconteceu: o cru veio,
  // o resumo não. Dois consertos: uma pausa entre os dois cliques, e o resumo
  // impresso no console, porque ele é pequeno e é o único que precisa sair
  // daqui. Se o download falhar de novo, o texto está na tela para copiar.
  const baixar = (nome, obj) => {
    try {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }));
      a.download = nome; document.body.appendChild(a); a.click(); a.remove();
      return true;
    } catch (e) { console.warn('[resolvedor] download de', nome, 'falhou:', e.message); return false; }
  };
  baixar('acervo-resolvido.cru.json', todos);
  await espera(1200);
  baixar('acervo-resumo.json', resumo);

  console.log('%c[resolvedor] fim', 'color:#1E6F50;font-weight:700');
  console.table({
    alvos: resumo.total_alvos, resolvidos: resumo.resolvidos,
    falharam: resumo.falharam, nao_tentados: resumo.nao_tentados,
  });
  console.log('erros:', resumo.erros);
  console.log('por ano:', resumo.por_ano);
  console.log('por tribunal (J.TR):', resumo.por_tribunal);
  console.log('%cacervo-resumo.json é MASCARADO — pode colar no chat.', 'color:#1E6F50');
  console.log('%cacervo-resolvido.cru.json tem nome e número — FICA na máquina.', 'color:#B3261E');
  console.log('%c── se o download do resumo não vier, copie o texto abaixo ──',
              'color:#2B5FC7;font-weight:700');
  console.log(JSON.stringify(resumo, null, 2));
  console.log('%cou digite:  copy(__resumoAcervo)   — copia direto para a área de transferência',
              'color:#2B5FC7');
  window.__resumoAcervo = resumo;
  return resumo;
})();
