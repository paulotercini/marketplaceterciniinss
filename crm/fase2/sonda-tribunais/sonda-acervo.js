// SONDA DO ACERVO — e-SAJ e eproc do TJSP, 1º e 2º grau.
//
// Por que uma sonda antes do robô: é a mesma regra que já nos salvou duas
// vezes. As regras do resumo do acórdão foram escritas contra um acórdão
// inventado e nenhuma sobreviveu ao texto real; o `pje-regras.js` só ficou de
// pé porque nasceu de HAR real de 11.08.2026. Aqui não é diferente — eu não
// conheço o HTML do e-SAJ nem do eproc, e chutar seletor é escrever regex
// contra uma página imaginária.
//
// O QUE ESTA SONDA RESPONDE (e que decide o robô):
//   1. em que sistema/grau estamos, e qual é o endereço de verdade
//   2. quantos processos a página lista, e quantos ela DIZ que existem
//   3. qual é a "linha" de um processo no HTML — a marca que o robô vai varrer
//   4. como é o link que abre os autos
//   5. dá para separar ativo de arquivado SEM abrir processo?
//   6. o acervo por ANO — o número que dimensiona a herança do e-SAJ
//
// O QUE ELA NÃO FAZ, DE PROPÓSITO:
//   - não clica, não pagina, não navega. Lê a tela que VOCÊ abriu.
//   - não escreve no CRM. Sonda não grava.
//   - não entrega nome de cliente. O relatório sai MASCARADO (veja abaixo).
//
// COMO MASCARA, e por que dá para confiar: o robô precisa da ESTRUTURA (tags,
// classes, rótulos, formato), não dos nomes. Então a sonda usa o fato de que
// rótulo se REPETE entre as linhas ("Último movimento:", "Distribuído em") e
// dado NÃO se repete (o nome do seu cliente aparece na linha dele e em mais
// nenhuma). Texto que aparece em duas ou mais linhas é rótulo e fica; texto
// único é dado e vira forma (letra vira 'a', dígito vira '9'). O número CNJ
// mantém só ano.justiça.tribunal — o que o robô usa para achar o tribunal.
//
// USO:
//   1. abra o e-SAJ (ou o eproc) LOGADO, na lista dos seus processos
//      — no e-SAJ é a consulta por OAB; no eproc é o painel do advogado
//   2. F12 → Console → cole este arquivo inteiro → Enter
//   3. baixa um sonda-acervo-<sistema>-<grau>.json e imprime o resumo
//   4. o JSON MASCARADO pode ser colado no chat; o cru fica na sua máquina
//
// Rode uma vez em cada tela: e-SAJ 1º, e-SAJ 2º, eproc 1º, eproc 2º.
(() => {
  'use strict';

  // ── o número CNJ é a âncora ────────────────────────────────────────────
  // Não procuro seletor: procuro processo. Toda listagem de acervo, em
  // qualquer sistema, mostra o número — e o número tem formato fixo por
  // resolução do CNJ. Achando os números, o resto do HTML se deixa mapear.
  // Duas cópias de propósito. A com /g serve para COLHER (match devolve a
  // lista inteira e zera o lastIndex sozinho); a sem /g serve para PERGUNTAR
  // (test com /g carrega lastIndex entre chamadas e, dentro de laço, passa a
  // pular linha sim, linha não — defeito silencioso, do pior tipo).
  const RE_CNJ = /(\d{7})-(\d{2})\.(\d{4})\.(\d)\.(\d{2})\.(\d{4})/;
  const RE_CNJ_G = new RegExp(RE_CNJ.source, 'g');
  const cnjDe = t => String(t || '').match(RE_CNJ_G) || [];
  const temCNJ = t => RE_CNJ.test(String(t || ''));

  // ── 1. onde estamos ────────────────────────────────────────────────────
  // O host vai CRU no relatório de propósito: o endereço do eproc do TJSP é
  // uma das coisas que eu não sei e preciso aprender com a sonda.
  function ondeEstamos() {
    const h = location.host, p = location.pathname;
    const sis = /esaj/i.test(h) ? 'e-SAJ' : /eproc/i.test(h) ? 'eproc' : 'desconhecido';
    // no e-SAJ o grau está no caminho: /cpopg = 1º grau, /cposg = 2º grau
    let grau = /cpopg/i.test(p) ? '1º grau' : /cposg/i.test(p) ? '2º grau' : null;
    if (!grau) grau = /1g|primeiro/i.test(h) ? '1º grau'
                    : /2g|segundo/i.test(h) ? '2º grau' : 'a descobrir';
    return { sistema: sis, grau, host: h, caminho: p, titulo: document.title || null };
  }

  // ── 2. as linhas ───────────────────────────────────────────────────────
  // Acho o elemento MAIS INTERNO que contém um número e subo até o ancestral
  // que representa a linha: <tr>/<li>, ou o ponto em que o pai já abraça um
  // número DIFERENTE (aí o pai é a tabela, não a linha). Funciona sem eu
  // saber uma classe sequer — e é justamente o ponto: a classe eu descubro
  // DEPOIS, olhando o que a sonda trouxer.
  function linhaDe(el) {
    let atual = el;
    for (let i = 0; i < 12 && atual && atual.parentElement; i++) {
      const pai = atual.parentElement;
      if (/^(TR|LI)$/.test(atual.tagName)) return atual;
      if (new Set(cnjDe(pai.textContent)).size > 1) return atual;
      atual = pai;
    }
    return atual;
  }

  function acharLinhas() {
    const dentro = [];
    for (const el of document.querySelectorAll('*')) {
      if (el.children.length && [...el.children].some(f => temCNJ(f.textContent))) continue;
      if (temCNJ(el.textContent)) dentro.push(el);
    }
    const linhas = [], vistas = new Set();
    for (const el of dentro) {
      const l = linhaDe(el);
      if (!l || vistas.has(l)) continue;
      vistas.add(l); linhas.push(l);
    }
    return linhas;
  }

  // assinatura da linha: é o que vira seletor no robô
  const assinatura = el => !el ? null
    : el.tagName.toLowerCase()
      + (el.className && typeof el.className === 'string'
         ? '.' + el.className.trim().split(/\s+/).slice(0, 4).join('.') : '');

  // ── 3. mascarar ────────────────────────────────────────────────────────
  // forma preservada, conteúdo apagado: 'João da Silva' -> 'aaaa aa aaaaa'
  const forma = t => String(t).replace(/[0-9]/g, '9')
                              .replace(/[A-ZÀ-Þ]/g, 'A')
                              .replace(/[a-zà-ÿ]/g, 'a');

  // o CNJ guarda ano.justiça.tribunal — sem isso eu não sei nem que tribunal é
  const cnjMascarado = n => {
    const m = String(n).match(/(\d{7})-(\d{2})\.(\d{4})\.(\d)\.(\d{2})\.(\d{4})/);
    return m ? `9999999-99.${m[3]}.${m[4]}.${m[5]}.9999` : forma(n);
  };

  // Conta em quantas LINHAS cada texto aparece. Duas ou mais = rótulo do
  // sistema, e rótulo é exatamente o que o robô procura. Uma só = dado.
  function frequencias(linhas) {
    const f = new Map();
    for (const l of linhas) {
      const nesta = new Set();
      const it = document.createTreeWalker(l, NodeFilter.SHOW_TEXT);
      let n; while ((n = it.nextNode())) {
        const t = (n.nodeValue || '').trim();
        if (t) nesta.add(t);
      }
      for (const t of nesta) f.set(t, (f.get(t) || 0) + 1);
    }
    return f;
  }

  // Atributo: nome e formato ficam (o robô lê por eles); corrida longa de
  // caractere vira forma — é ali que mora id de processo e chave de acesso.
  const attrMascarado = v => String(v).replace(/[A-Za-z0-9]{6,}/g, s => forma(s));

  function mascararLinha(el, freq) {
    const c = el.cloneNode(true);
    const it = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    const textos = []; let n;
    while ((n = it.nextNode())) textos.push(n);
    for (const t of textos) {
      const bruto = t.nodeValue || '', s = bruto.trim();
      if (!s) continue;
      if ((freq.get(s) || 0) >= 2) continue;                 // rótulo: fica
      let saida = s;
      const nums = cnjDe(s);
      if (nums.length) {                                      // CNJ: meio fica
        for (const num of nums) saida = saida.split(num).join(cnjMascarado(num));
        // o resto do texto ao redor do número ainda é dado
        saida = saida.replace(/(?!9999999-99\.\d{4}\.\d\.\d{2}\.9999)[A-Za-zÀ-ÿ]{2,}/g, forma);
      } else if (/^[\d\/\.\-:\s]+$/.test(s)) {
        continue;                                             // data/hora: fica
      } else {
        saida = forma(s);
      }
      t.nodeValue = bruto.replace(s, saida);
    }
    for (const e of [c, ...c.querySelectorAll('*')])
      for (const a of [...e.attributes || []])
        if (!/^(class|id|type|name)$/i.test(a.name)) e.setAttribute(a.name, attrMascarado(a.value));
    return c.outerHTML;
  }

  // ── 4. o que a página DIZ que existe ───────────────────────────────────
  // "Resultados 1 a 25 de 1.243" é o número que dimensiona a herança do
  // e-SAJ. Sem ele eu não sei se o robô varre 3 páginas ou 300.
  function totalDeclarado() {
    const txt = (document.body.textContent || '').replace(/\s+/g, ' ');
    const achados = [];
    for (const re of [/(?:resultados?|registros?|processos?)[^.\d]{0,20}(\d[\d.]*)/gi,
                      /\bde\s+(\d[\d.]{2,})\b/gi]) {
      let m; while ((m = re.exec(txt))) achados.push(m[0].trim());
      if (achados.length >= 4) break;
    }
    return [...new Set(achados)].slice(0, 6);
  }

  const sinaisDe = pal => {
    const txt = (document.body.textContent || '').toLowerCase();
    return pal.filter(p => txt.includes(p));
  };

  // ── 5. acervo por ano ──────────────────────────────────────────────────
  // O ano sai do próprio número, sem campo nenhum. É a resposta mais barata
  // para "quanto disso é processo velho do começo da carreira".
  function porAno(numeros) {
    const h = {};
    for (const n of numeros) {
      const a = (String(n).match(/\.(\d{4})\.\d\.\d{2}\./) || [])[1];
      if (a) h[a] = (h[a] || 0) + 1;
    }
    return Object.fromEntries(Object.entries(h).sort((x, y) => x[0].localeCompare(y[0])));
  }

  // ── roda ───────────────────────────────────────────────────────────────
  const onde = ondeEstamos();
  const linhas = acharLinhas();
  const numeros = [...new Set(cnjDe(document.body.innerHTML))];
  const freq = frequencias(linhas);

  const rel = {
    sonda: 'acervo-tribunais', versao: 1, quando: new Date().toISOString(),
    onde,
    contagem: {
      linhas_achadas: linhas.length,
      numeros_distintos: numeros.length,
      total_declarado_na_tela: totalDeclarado(),
    },
    // as três primeiras linhas MASCARADAS: é daqui que saem as regex
    linha: {
      assinatura: assinatura(linhas[0]),
      assinaturas_distintas: [...new Set(linhas.map(assinatura))].slice(0, 5),
      amostra_html: linhas.slice(0, 3).map(l => mascararLinha(l, freq)),
    },
    // rótulo repetido é âncora estável — o robô vai ancorar neles
    rotulos_repetidos: [...freq.entries()].filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1]).slice(0, 30).map(([t, n]) => ({ texto: t, em_linhas: n })),
    links: [...new Set(linhas.flatMap(l =>
      [...l.querySelectorAll('a[href]')].map(a => attrMascarado(a.getAttribute('href')))))].slice(0, 8),
    arquivamento: {
      palavras_na_tela: sinaisDe(['arquivad', 'baixa definitiva', 'extinto', 'trânsito em julgado',
                                  'em andamento', 'ativo', 'suspenso', 'sobrestad']),
      // se der para separar aqui, o robô nunca precisa abrir processo
      observacao: 'se alguma destas aparece POR LINHA, dá para filtrar sem abrir os autos',
    },
    paginacao: {
      palavras: sinaisDe(['próxima', 'proxima', 'anterior', 'página', 'pagina', 'ver mais', 'mais resultados']),
      controles: [...document.querySelectorAll('a,button,input[type=submit]')]
        .map(e => (e.textContent || e.value || '').trim())
        .filter(t => t && t.length < 24 && /pr[oó]x|anterior|p[aá]gina|\d+\s*$|mais/i.test(t))
        .slice(0, 12),
    },
    acervo_por_ano: porAno(numeros),
  };

  // ── entrega ────────────────────────────────────────────────────────────
  const nome = `sonda-acervo-${onde.sistema}-${onde.grau}`.replace(/[^\w.-]+/g, '-') + '.json';
  const txt = JSON.stringify(rel, null, 2);
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' }));
    a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  } catch (e) { console.warn('[sonda] download falhou, use o objeto abaixo:', e.message); }

  console.log('%c[sonda do acervo]', 'color:#2B5FC7;font-weight:700',
              `${onde.sistema} · ${onde.grau} · ${onde.host}`);
  console.table(rel.contagem);
  console.log('linhas com esta assinatura:', rel.linha.assinatura,
              '| assinaturas distintas:', rel.linha.assinaturas_distintas);
  console.log('acervo por ano:', rel.acervo_por_ano);
  console.log('arquivamento — palavras na tela:', rel.arquivamento.palavras_na_tela);
  console.log('paginação:', rel.paginacao.controles);
  console.log('%crelatório MASCARADO salvo em ' + nome + ' — pode colar no chat.',
              'color:#1E6F50');
  window.__sondaAcervo = rel;
  return rel;
})();
