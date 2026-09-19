// SONDA DA FICHA — um processo só, aberto pelo seu favorito.
//
// Por que ela existe: os favoritos guardam 180 processos do e-SAJ, mas 161
// dos 209 links NÃO trazem o número CNJ — só o `processo.codigo`, que é a
// chave interna do e-SAJ. O número está do OUTRO lado do link, na ficha. Se
// esta página entregar o número, os 180 códigos viram 180 números sem você
// digitar nenhum; se não entregar, digitar à mão volta a ser a opção.
//
// A PERGUNTA QUE ELA RESPONDE, e nenhuma outra:
//   1. a sessão está de pé, ou isto aqui é tela de login/erro?
//   2. veio CAPTCHA? (106 dos seus links carregam uuidCaptcha — sinal amarelo)
//   3. o número CNJ está na página? em QUAL seletor?
//   4. que outros campos a ficha entrega de graça (classe, foro, vara,
//      situação, partes) — o que o robô colhe sem custo nenhum a mais
//
// O QUE ELA NÃO FAZ: não clica, não navega, não abre outro processo, não
// escreve no CRM. Lê a tela que VOCÊ abriu, uma vez.
//
// COMO MASCARA: numa LISTA dá para separar rótulo de dado pela repetição
// entre linhas. Numa FICHA não há linhas para comparar, então a regra muda:
// é rótulo o texto que termina em ':' ou mora em elemento de rótulo
// (label, th, dt, class~=label); todo o resto é dado e vira forma
// ('João da Silva' -> 'Aaaa aa Aaaaa'). Data e número solto ficam, porque
// são formato, não identidade. O CNJ guarda só ano.justiça.tribunal.
// Nome de classe, id e caminho CSS ficam CRUS — é exatamente o que eu preciso
// aprender, e não identifica ninguém.
//
// USO:
//   1. abra UM favorito de processo (qualquer um da pasta A a J / I a Z)
//   2. F12 → Console → cole este arquivo inteiro → Enter
//   3. baixa sonda-ficha.json e imprime o veredito
(() => {
  'use strict';

  const RE_CNJ = /(\d{7})-(\d{2})\.(\d{4})\.(\d)\.(\d{2})\.(\d{4})/;
  const RE_CNJ_G = new RegExp(RE_CNJ.source, 'g');
  const cnjDe = t => String(t || '').match(RE_CNJ_G) || [];

  const forma = t => String(t).replace(/[0-9]/g, '9')
                              .replace(/[A-ZÀ-Þ]/g, 'A')
                              .replace(/[a-zà-ÿ]/g, 'a');

  const cnjMascarado = n => {
    const m = RE_CNJ.exec(String(n));
    return m ? `9999999-99.${m[3]}.${m[4]}.${m[5]}.9999` : forma(n);
  };

  // ── o caminho até o elemento ───────────────────────────────────────────
  // É ISTO que o robô vai usar. Prefiro #id quando existe (o e-SAJ é generoso
  // com id) e paro ali, porque id já é seletor completo. Sem id, subo até 5
  // níveis juntando tag.classe — o bastante para o seletor ser estável sem
  // virar aquele caminho quilométrico que quebra na primeira reforma da tela.
  function caminhoCss(el) {
    const partes = [];
    for (let e = el, i = 0; e && e.nodeType === 1 && i < 5; e = e.parentElement, i++) {
      if (e.id) { partes.unshift('#' + e.id); break; }
      const cls = (typeof e.className === 'string' ? e.className : '')
        .trim().split(/\s+/).filter(Boolean).slice(0, 2);
      partes.unshift(e.tagName.toLowerCase() + (cls.length ? '.' + cls.join('.') : ''));
    }
    return partes.join(' > ');
  }

  // rótulo fica, dado vira forma — a regra da ficha
  const ehRotulo = (el, s) => /:$/.test(s)
    || /^(LABEL|TH|DT)$/.test(el.tagName)
    || /label|rotulo|titulo/i.test(typeof el.className === 'string' ? el.className : '');

  // ── o que é formato, e o que só PARECE formato ─────────────────────────
  // Aqui mora o defeito que vazou CPF de duas partes numa sondagem real. A
  // regra antiga era "só dígito e pontuação = formato, deixa passar" — e
  // 258.266.798-67 é só dígito e pontuação. Também são: CNPJ, NB, RG, número
  // de controle, telefone. Deixar passar corrida longa de dígito é entregar
  // identidade achando que se está entregando forma.
  //
  // A regra nova é pela POSITIVA: passa cru só o que eu consigo NOMEAR como
  // data, hora ou número curto (até 4 dígitos — ano, número de vara, contador
  // de página). Todo o resto vira forma. A sonda não perde nada com isso: o
  // que ela precisa é do esqueleto, e 999.999.999-99 mostra o esqueleto igual.
  const RE_DATA = /^\d{1,2}\/\d{1,2}\/\d{2,4}(\s+(às\s+)?\d{1,2}:\d{2}(:\d{2})?)?$/;
  const RE_HORA = /^\d{1,2}:\d{2}(:\d{2})?$/;
  function ehFormatoSeguro(s) {
    if (RE_DATA.test(s) || RE_HORA.test(s)) return true;
    return /^[\d\s.,]+$/.test(s) && s.replace(/\D/g, '').length <= 4;
  }

  // ORDEM IMPORTA, e custou um teste vermelho: o CNJ é conferido ANTES de
  // qualquer atalho numérico. Um número de processo também é só dígito, ponto
  // e hífen, e na ficha ele mora sozinho num elemento (<span id="numeroProcesso">
  // no e-SAJ, <span id="txtNumProcesso"> no eproc) — o caso mais provável.
  function mascararTexto(s, el) {
    if (!s) return s;
    if (ehRotulo(el, s)) return s;
    const numeros = cnjDe(s);
    if (numeros.length) {                              // CNJ: só o meio fica
      let saida = s;
      for (const n of numeros) saida = saida.split(n).join(cnjMascarado(n));
      return saida.replace(/(?!9999999-99\.\d{4}\.\d\.\d{2}\.9999)[A-Za-zÀ-ÿ]{2,}/g, forma);
    }
    if (ehFormatoSeguro(s)) return s;
    return forma(s);
  }

  const textoMascarado = (el, limite = 120) => {
    const it = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const pedacos = []; let n;
    while ((n = it.nextNode())) {
      const s = (n.nodeValue || '').trim();
      if (s) pedacos.push(mascararTexto(s, n.parentElement || el));
    }
    return pedacos.join(' ').replace(/\s+/g, ' ').slice(0, limite);
  };

  const sinaisDe = pal => {
    const txt = (document.body.textContent || '').toLowerCase();
    return pal.filter(p => txt.includes(p));
  };

  // ── 1. a sessão está de pé? ────────────────────────────────────────────
  // Falha silenciosa é o pior desfecho possível: o robô varre 180 links e
  // traz 180 telas de login sem reclamar. Então isto é medido ANTES do resto.
  const temSenha = !!document.querySelector('input[type=password]');
  const acesso = {
    parece_login: temSenha || /identifica|entrar|login|autentic/i.test(document.title || ''),
    palavras_de_bloqueio: sinaisDe(['não foi possível', 'nao foi possivel',
                                    'indisponível', 'sem permissão', 'acesso negado',
                                    'sessão expirada', 'sessao expirada']),
    captcha: {
      // três provas independentes: elemento, palavra na tela, e o parâmetro
      // que os seus próprios favoritos carregam
      tem_elemento: !!document.querySelector(
        '[id*=captcha i],[class*=captcha i],[name*=captcha i],iframe[src*=recaptcha]'),
      palavras_na_tela: sinaisDe(['captcha', 'não sou um robô', 'nao sou um robo',
                                  'digite os caracteres', 'código da imagem']),
      uuid_na_url: /uuidCaptcha/i.test(location.search),
    },
  };
  acesso.parece_erro = acesso.palavras_de_bloqueio.length > 0;

  // ── 2. o número ────────────────────────────────────────────────────────
  // Procuro o elemento MAIS INTERNO que contém um CNJ: o pai também contém,
  // mas é o filho que dá o seletor curto e estável.
  const comCnj = [...document.querySelectorAll('*')].filter(el =>
    RE_CNJ.test(el.textContent || '') &&
    ![...el.children].some(f => RE_CNJ.test(f.textContent || '')));
  const numeros = [...new Set(cnjDe(document.body.textContent))];
  const alvo = comCnj[0] || null;

  const codigoUrl = new URLSearchParams(location.search).get('processo.codigo');
  const numero = {
    achou: numeros.length > 0,
    quantos_distintos: numeros.length,
    mascarado: numeros[0] ? cnjMascarado(numeros[0]) : null,
    todos_mascarados: numeros.slice(0, 6).map(cnjMascarado),
    caminho_css: alvo ? caminhoCss(alvo) : null,
    seletor_sugerido: alvo && alvo.id ? '#' + alvo.id : (alvo ? caminhoCss(alvo) : null),
    tag: alvo ? alvo.tagName.toLowerCase() : null,
    // se o e-SAJ redirecionar, o robô estaria colhendo ficha trocada — defeito
    // que só apareceria depois de 180 registros errados. Guardo a FORMA do
    // código pedido para conferir que a tela é a que foi pedida.
    codigo_na_url: codigoUrl ? forma(codigoUrl) : null,
  };

  // ── 3. o que mais a ficha entrega ──────────────────────────────────────
  // O e-SAJ é generoso com id ("numeroProcesso", "classeProcesso", "foroProcesso").
  // Em vez de eu chutar quais existem, colho TODO id que cheire a dado de
  // processo e mostro o que tem dentro, mascarado. A lista que voltar é o
  // cardápio do robô — colher classe e foro sai de graça na mesma visita.
  const ids = [...document.querySelectorAll('[id]')]
    .filter(el => /processo|parte|movimenta|situacao|situação|classe|assunto|foro|vara|juiz|distribui|area|valor/i.test(el.id))
    .filter(el => (el.textContent || '').trim())
    .slice(0, 40)
    .map(el => ({
      id: el.id,
      tag: el.tagName.toLowerCase(),
      caminho_css: caminhoCss(el),
      texto: textoMascarado(el, 100),
    }));

  // rótulos com ':' e o desenho clássico de ficha — o plano B caso os id
  // sumam numa reforma da tela
  const rotulos = [...document.querySelectorAll('label,th,dt,span,div')]
    .filter(el => !el.children.length)
    .map(el => (el.textContent || '').trim())
    .filter(t => /:$/.test(t) && t.length < 40)
    .slice(0, 25);

  const rel = {
    sonda: 'ficha-processo', versao: 1, quando: new Date().toISOString(),
    onde: {
      host: location.host,
      caminho: location.pathname,
      titulo: document.title || null,
      // só os NOMES dos parâmetros; os valores são chave de acesso
      parametros_da_url: [...new URLSearchParams(location.search).keys()],
    },
    acesso,
    numero,
    campos_por_id: ids,
    rotulos_com_dois_pontos: [...new Set(rotulos)],
    situacao: {
      palavras_na_tela: sinaisDe(['arquivad', 'baixa definitiva', 'extinto',
                                  'trânsito em julgado', 'transito em julgado',
                                  'em andamento', 'ativo', 'suspenso', 'sobrestad',
                                  'segredo de justiça', 'segredo de justica']),
      observacao: 'se "arquivado"/"extinto" aparece aqui, o robô separa ativo de morto sem custo extra',
    },
    // o cabeçalho inteiro, mascarado: se os id não servirem, a regex nasce daqui
    amostra_cabecalho: alvo && alvo.closest('div,table,section')
      ? (() => {
          const c = alvo.closest('div,table,section').cloneNode(true);
          const it = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
          const ts = []; let n; while ((n = it.nextNode())) ts.push(n);
          for (const t of ts) {
            const s = (t.nodeValue || '').trim();
            if (s) t.nodeValue = t.nodeValue.replace(s, mascararTexto(s, t.parentElement || c));
          }
          for (const e of [c, ...c.querySelectorAll('*')])
            for (const a of [...e.attributes || []])
              if (!/^(class|id|type|name)$/i.test(a.name))
                e.setAttribute(a.name, String(a.value).replace(/[A-Za-z0-9]{6,}/g, forma));
          return c.outerHTML.slice(0, 3000);
        })()
      : null,
  };

  // ── veredito ───────────────────────────────────────────────────────────
  // A prova que vale é a COLHEITA, não o sintoma. Na primeira sondagem real
  // os dois sintomas mentiram juntos: o e-SAJ mantém a caixa "Identificar-se"
  // (com input[type=password]) no cabeçalho de TODA página, inclusive das que
  // serviu logado; e a palavra "captcha" aparece no texto só porque
  // uuidCaptcha viaja na URL do próprio favorito. Resultado: uma ficha que
  // veio inteira — número, classe, foro, vara, partes, movimentações — foi
  // carimbada BLOQUEADO. Sintoma não decide; colheita decide.
  const colheu = numero.achou && ids.length >= 3;
  const bloqueado = !colheu && (acesso.parece_login || acesso.captcha.tem_elemento
                    || acesso.captcha.palavras_na_tela.length > 0);
  rel.veredito = colheu
    ? 'PASSA — número e campos vieram. Dá para resolver os códigos sem digitar nenhum.'
    : bloqueado
      ? 'BLOQUEADO — login ou captcha na frente, e nada foi colhido.'
      : 'SEM NÚMERO — a sessão abriu, mas não há CNJ nesta tela. Ver amostra_cabecalho antes de decidir.';

  const nome = 'sonda-ficha.json';
  const txt = JSON.stringify(rel, null, 2);
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' }));
    a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  } catch (e) { console.warn('[sonda] download falhou, use o objeto abaixo:', e.message); }

  console.log('%c[sonda da ficha]', 'color:#2B5FC7;font-weight:700',
              `${location.host}${location.pathname}`);
  console.log('%c' + rel.veredito, 'font-weight:700;color:' + (bloqueado ? '#B3261E' : '#1E6F50'));
  console.log('acesso:', rel.acesso);
  console.log('número:', rel.numero);
  console.table(rel.campos_por_id);
  console.log('rótulos com ":" —', rel.rotulos_com_dois_pontos);
  console.log('situação — palavras na tela:', rel.situacao.palavras_na_tela);
  console.log('%crelatório MASCARADO salvo em ' + nome + ' — pode colar no chat.',
              'color:#1E6F50');
  window.__sondaFicha = rel;
  return rel;
})();
