// COLETOR DO EPROC — a relação de processos, numa colagem só.
//
// POR QUE ELE É DIFERENTE DO RESOLVEDOR DO e-SAJ: no e-SAJ a lista traz só o
// número, e todo o resto (classe, assunto, situação, partes) só existe dentro
// da ficha — foram 180 requisições ao tribunal para montar o acervo. Aqui o
// "Relatório de Processos" já traz tudo na própria linha: número, localizador,
// classe, autor, réu, comarca, assunto, último evento, data do evento, data de
// autuação e valor. Nenhuma ficha precisa ser aberta. Um robô que lê uma tela
// é melhor que um que faz 180 pedidos, e não é só por educação: é menos
// superfície para falhar no meio.
//
// AS COLUNAS SÃO LIDAS PELO CABEÇALHO, nunca pela posição. O relatório do
// eproc é configurável — dá para incluir e remover coluna — e um coletor
// posicional passa a gravar "comarca" no campo "assunto" no dia em que alguém
// mexer, sem erro nenhum na tela. Ler pelo <th> custa vinte linhas e não tem
// esse defeito.
//
// TODA coluna é capturada, inclusive as que eu não sei nomear: o que eu
// reconheço vira campo com nome canônico, o resto fica em `colunas` com o
// rótulo original. Assim nada se perde enquanto eu aprendo a tela.
//
// USO:
//   1. eproc LOGADO, menu Relatórios → Relatório de Processos, resultado à vista
//   2. AUMENTE "resultados por página" para o máximo antes de coletar — este
//      script lê a página à vista e NÃO navega (ele avisa se houver mais)
//   3. F12 → Console → cole este arquivo → Enter
//
// Baixa dois arquivos, na mesma regra das sondas: o CRU fica na máquina, o
// resumo MASCARADO pode ser colado no chat.
(() => {
  'use strict';

  const RE_CNJ = /(\d{7})-(\d{2})\.(\d{4})\.(\d)\.(\d{2})\.(\d{4})/;
  const digitos = s => String(s || '').replace(/\D/g, '');
  const limpo = s => String(s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

  // mesma máscara das sondas, com a lição do vazamento de CPF: passa cru só o
  // que dá para NOMEAR como data, hora ou número curto. Corrida de dígito —
  // CPF, CNPJ, NB, telefone — vira forma.
  const forma = t => String(t).replace(/[0-9]/g, '9')
                              .replace(/[A-ZÀ-Þ]/g, 'A').replace(/[a-zà-ÿ]/g, 'a');
  const RE_DATA = /^\d{1,2}\/\d{1,2}\/\d{2,4}(\s+\d{1,2}:\d{2}(:\d{2})?)?$/;
  const seguro = s => RE_DATA.test(s) || (/^[\d\s.,]+$/.test(s) && digitos(s).length <= 4);
  const cnjMascarado = n => {
    const m = RE_CNJ.exec(String(n));
    return m ? `9999999-99.${m[3]}.${m[4]}.${m[5]}.9999` : forma(n);
  };

  if (!/eproc/i.test(location.host)) {
    console.error('[coletor] cole isto numa aba do eproc logado. Host atual:', location.host);
    return;
  }

  // ── achar a tabela pelo dado, não pelo id ──────────────────────────────
  // O id da tabela muda entre telas do eproc; o que não muda é ela conter
  // números de processo. Mesmo princípio da sonda: procuro o processo, não o
  // seletor.
  const linhas = [...document.querySelectorAll('tr')].filter(tr =>
    RE_CNJ.test(tr.textContent || '') && tr.querySelectorAll('td').length >= 4);
  if (!linhas.length) {
    console.error('[coletor] nenhuma linha de processo nesta tela. Abra o Relatório de Processos com o resultado à vista.');
    return;
  }
  const tabela = linhas[0].closest('table');

  // ── o cabeçalho vira o mapa das colunas ────────────────────────────────
  const chave = s => limpo(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

  const ths = [...(tabela ? tabela.querySelectorAll('th') : [])].map(th => limpo(th.textContent));
  const cabecalho = ths.length ? ths : null;

  // rótulo do eproc -> nome canônico. Sem acerto, a coluna ainda é guardada
  // pelo rótulo original — nada se perde por eu não conhecer o nome.
  const CANON = [
    [/PROCESSO|NUMERO/, 'numero'],
    [/CLASSE/, 'classe'],
    [/AUTOR|POLO ATIVO|REQUERENTE|EXEQUENTE/, 'autor'],
    [/REU|RE$|POLO PASSIVO|REQUERIDO|EXECUTADO/, 'reu'],
    [/COMARCA|FORO|SECAO|LOCALIDADE/, 'comarca'],
    [/ASSUNTO/, 'assunto'],
    // ORDEM IMPORTA e um teste guarda isto: "Data do Último Evento" CONTÉM
    // "Último Evento". Com a regra do evento antes, ela engolia a coluna da
    // data — e como cada campo canônico só aceita a primeira coluna que casa,
    // a data se perdia inteira, sem erro nenhum na tela. Específica primeiro.
    [/DATA.*EVENTO|ULTIMA.*MOVIMENT/, 'data_evento'],
    [/AUTUA|DISTRIBUI/, 'data_autuacao'],
    [/ULTIMO EVENTO|EVENTO/, 'ultimo_evento'],
    [/VALOR/, 'valor'],
    [/JUIZ|MAGISTRAD|RELATOR/, 'juiz'],
    [/SITUACAO|STATUS/, 'situacao'],
    [/LOCALIZADOR/, 'localizador'],
    [/COMPETENCIA/, 'competencia'],
  ];
  const canonDe = rot => (CANON.find(([re]) => re.test(chave(rot))) || [])[1] || null;

  const mapa = {};
  if (cabecalho) cabecalho.forEach((rot, i) => { const c = canonDe(rot); if (c && mapa[c] === undefined) mapa[c] = i; });

  // ── ler as linhas ──────────────────────────────────────────────────────
  const registros = linhas.map(tr => {
    const tds = [...tr.querySelectorAll('td')];
    const textos = tds.map(td => limpo(td.textContent));

    // o número e o localizador dividem a mesma célula, separados por <br>:
    // "9999999-99.2025.8.26.9999" / "MATJCC01". Quebro pelo <br>, não pelo
    // texto corrido — colados eles viram uma string sem sentido.
    const cel = i => (i === undefined || !tds[i]) ? null : limpo(tds[i].textContent);
    const partesDe = i => (i === undefined || !tds[i]) ? []
      : (tds[i].innerHTML || '').split(/<br\s*\/?>/i).map(p => limpo(p.replace(/<[^>]+>/g, ''))).filter(Boolean);

    const numeroBruto = (tr.textContent.match(RE_CNJ) || [])[0] || null;
    const link = tr.querySelector('a[href*="num_processo"], a[href]');
    const href = link ? link.getAttribute('href') : null;

    // A rede de segurança também precisa ser confiável. Colhendo por
    // textContent, célula com <br> vem colada: o número saía como
    // "0002454-08.2025.8.26.0347MATJCC01" e três réus viravam
    // "KAMILLYROBERSONTAMIRES". Nos campos canônicos eu já quebro pelo <br>;
    // aqui fazia falta. Uma coluna que eu ainda não sei nomear é justamente a
    // que mais precisa chegar legível.
    const colunas = {};
    if (cabecalho) cabecalho.forEach((rot, i) => {
      const p = partesDe(i);
      if (p.length) colunas[rot] = p.join(' | ');
    });

    return {
      numero: numeroBruto,
      numero_digitos: digitos(numeroBruto),
      // o localizador é a 2ª linha da célula do número
      localizador: (partesDe(mapa.numero) || []).filter(p => !RE_CNJ.test(p))[0] || null,
      classe: cel(mapa.classe),
      autor: partesDe(mapa.autor),
      reu: partesDe(mapa.reu),
      comarca: cel(mapa.comarca),
      assunto: cel(mapa.assunto),
      ultimo_evento: cel(mapa.ultimo_evento),
      data_evento: cel(mapa.data_evento),
      data_autuacao: cel(mapa.data_autuacao),
      valor: cel(mapa.valor),
      situacao: cel(mapa.situacao),
      classe_cod: tr.getAttribute('data-classe') || null,
      competencia_cod: tr.getAttribute('data-competencia') || null,
      url: href ? new URL(href, location.href).href : null,
      colunas,
    };
  });

  // ── a página está inteira? ─────────────────────────────────────────────
  // Este coletor NÃO navega, de propósito: paginar sozinho é a parte que mais
  // erra e a que mais bate no servidor. Em vez disso ele mede e avisa — se a
  // tela declarar mais registros do que as linhas lidas, você aumenta
  // "resultados por página" e cola de novo.
  const txt = (document.body.textContent || '').replace(/\s+/g, ' ');
  const declarado = (txt.match(/(\d[\d.]*)\s*registros?/i) || [])[1];
  const totalDeclarado = declarado ? Number(declarado.replace(/\./g, '')) : null;
  const faltando = totalDeclarado !== null && totalDeclarado > registros.length;

  const conta = (lista, f) => lista.reduce((h, x) => {
    const k = f(x); if (k) h[k] = (h[k] || 0) + 1; return h;
  }, {});

  // o resumo carrega contagem e vocabulário do sistema — nunca nome de parte
  const resumo = {
    relatorio: 'eproc-relacao', versao: 1, quando: new Date().toISOString(),
    onde: { host: location.host, caminho: location.pathname, titulo: document.title },
    linhas_lidas: registros.length,
    total_declarado_na_tela: totalDeclarado,
    faltam_paginas: faltando,
    cabecalho_lido: cabecalho,
    colunas_reconhecidas: Object.keys(mapa),
    colunas_nao_reconhecidas: cabecalho
      ? cabecalho.filter(r => !canonDe(r)).filter(Boolean) : null,
    sem_numero: registros.filter(r => !r.numero).length,
    numeros_distintos: new Set(registros.map(r => r.numero_digitos).filter(Boolean)).size,
    por_ano: Object.fromEntries(Object.entries(
      conta(registros, r => (String(r.numero).match(/\.(\d{4})\./) || [])[1])).sort()),
    por_tribunal: conta(registros, r => {
      const m = RE_CNJ.exec(String(r.numero)); return m ? m[4] + '.' + m[5] : null;
    }),
    por_classe: conta(registros, r => r.classe),
    por_comarca: conta(registros, r => r.comarca),
    por_ultimo_evento: conta(registros, r => r.ultimo_evento),
    // prova de acento em número: texto se corrompe no caminho, inteiro não
    prova_de_acento: (() => {
      const r = registros.find(x => x.classe && /[^\x00-\x7F]/.test(x.classe));
      return r ? [...r.classe.slice(0, 30)].map(c => c.charCodeAt(0)) : null;
    })(),
    amostra_mascarada: registros.slice(0, 2).map(r => ({
      numero: cnjMascarado(r.numero), classe: r.classe, comarca: r.comarca,
      assunto: r.assunto, ultimo_evento: r.ultimo_evento,
      data_evento: seguro(r.data_evento || '') ? r.data_evento : forma(r.data_evento),
      autor: r.autor.map(forma), reu: r.reu.map(forma),
      valor: forma(r.valor || ''),
    })),
  };

  const baixar = (nome, obj) => {
    try {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }));
      a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { console.warn('[coletor] download de', nome, 'falhou:', e.message); }
  };
  baixar('eproc-relacao.cru.json', registros);
  setTimeout(() => baixar('eproc-resumo.json', resumo), 1200);

  console.log('%c[coletor eproc]', 'color:#2B5FC7;font-weight:700',
              registros.length + ' processos lidos');
  if (!cabecalho) console.warn('[coletor] não achei <th> — as colunas nomeadas podem ter falhado; tudo está em `colunas` mesmo assim.');
  if (faltando) console.warn('%c[coletor] A TELA DECLARA ' + totalDeclarado + ' REGISTROS e eu li ' + registros.length +
    '. Aumente "resultados por página" e cole de novo — este coletor não navega.',
    'color:#B3261E;font-weight:700');
  console.log('cabeçalho lido:', cabecalho);
  console.log('colunas reconhecidas:', Object.keys(mapa));
  if (resumo.colunas_nao_reconhecidas && resumo.colunas_nao_reconhecidas.length)
    console.log('colunas NÃO reconhecidas (guardadas em `colunas`):', resumo.colunas_nao_reconhecidas);
  console.table(resumo.por_classe);
  console.log('%c── se o download não vier, copie o resumo abaixo ──', 'color:#2B5FC7;font-weight:700');
  console.log(JSON.stringify(resumo, null, 2));
  console.log('%cou digite:  copy(__eprocResumo)', 'color:#2B5FC7');
  console.log('%ceproc-relacao.cru.json tem nome de parte — FICA na máquina.', 'color:#B3261E');
  window.__eprocRelacao = registros;
  window.__eprocResumo = resumo;
  return resumo;
})();
