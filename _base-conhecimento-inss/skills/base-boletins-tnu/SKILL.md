---
name: base-boletins-tnu
description: Acervo dos Boletins oficiais da TNU como fonte confiável de teses, com índice de 241 temas e 104 boletins (sessões de 18/02/2016 a 24/06/2026). Use SEMPRE que mencionar boletim da TNU, tese da TNU, tema TNU, PUIL, PEDILEF, representativo de controvérsia, questão de ordem da TNU, súmula da TNU, tese alterada em embargos, revisão de tese, sobrestamento de tema, e SEMPRE que a peça for para Turma Recursal ou TNU. Localiza em que boletim está cada tema, com data de sessão e processo, para leitura do inteiro teor na fonte. Traz a trava de homônimo de corte (Tema alto costuma ser do STF, não da TNU) e o alerta de tese alterada quando o mesmo tema aparece em mais de um boletim. Cruza com base-precedentes-catalogo-vinculantes, pesquisa-jurisprudencia-chrome, base-tnu-admissibilidade-manual, pedilef-cotejo-analitico-tnu e base-recursos-jef.
---

# Boletins da TNU — Fonte Confiável Organizada

## O que é este acervo

Publicação oficial da Turma Nacional de Uniformização, veiculada pelo Conselho da Justiça Federal, que traz o inteiro teor de decisões de cada sessão. É fonte confiável de primeira linha para tese de TNU, e por isso vale como base de citação em peça, observada a regra de transcrição literal.

Acervo do escritório na pasta `Boletins TNU`, 104 boletins processados, sessões de 18/02/2016 a 24/06/2026, com 241 temas indexados. A extração foi feita na Onda 105 (11/08/2026) pelo script `references/extrai_boletins_tnu.py`, que pode ser reexecutado a cada boletim novo.

## Por que isso importa nas Turmas Recursais

A tese da TNU é o que a Turma Recursal aplica. Em JEF, não cabe recurso especial (Súmula 203/STJ), e a via ao STJ é o PUIL do art. 14, § 4º, da Lei 10.259/2001. Na prática, a tese de TNU decide o caso do segurado, e o boletim é onde ela nasce com redação e data.

## Como usar, em três passos

Primeiro, localizar. Abrir `references/INDICE-TEMAS-TNU.md`, achar o tema e ver o boletim e a data da sessão.

Segundo, ler na fonte. Abrir o PDF do boletim na pasta e ler o inteiro teor da decisão, não só a tese.

Terceiro, transcrever literalmente na peça, com o número do tema, o processo, a data da sessão e o boletim de origem, marcando [CONFERIDO] com a data da conferência conforme a `pesquisa-jurisprudencia-chrome`.

## Índices disponíveis

`references/INDICE-TEMAS-TNU.md`, ordenado por número do tema, com todos os boletins em que ele aparece, a primeira data de sessão e o processo.

`references/INDICE-BOLETINS.md`, ordenado por boletim, com data da sessão, temas tratados e o nome do arquivo.

## Achados da extração (anotações de rigor)

Primeiro, TRAVA DE HOMÔNIMO DE CORTE. A varredura capturou um "Tema 1467" que NÃO é da TNU, é do STF. O Boletim 105 registra o SOBRESTAMENTO do Tema 387/TNU em razão da afetação do Tema 1467/STF. Números altos (acima de 400) foram excluídos do índice justamente porque a TNU não tem temas nessa faixa, e a menção costuma ser a tema de outra corte citado dentro do boletim. Esse é o mesmo risco já documentado na base para os Temas 18, 1207 e correlatos.

Segundo, ALERTA DE TESE ALTERADA. Tema que aparece em MAIS DE UM boletim é sinal de alteração, revisão, sobrestamento ou cancelamento. O caso exemplar é o Tema 223, cuja tese foi FIXADA em sessão de 20/11/2020 e ALTERADA em embargos na sessão de 25/02/2021 (Boletim 52), que registra as duas redações. Citar a redação antiga de tese alterada é erro fatal em peça. Sempre ler o boletim MAIS RECENTE em que o tema aparece.

Terceiro, DOIS FORMATOS DE BOLETIM. Os boletins antigos (até cerca do 20) trazem a tese inline junto ao processo, no padrão "REPRESENTATIVO DE CONTROVÉRSIA (TEMA 150) – <tese>". Os mais novos separam, listando "TEMA N. 212 – PUIL n. ..." no índice e a tese adiante, após a fórmula "a TNU fixou a seguinte tese". Isso importa quando se busca a tese dentro do PDF.

Quarto, PAREAMENTO AUTOMÁTICO NÃO É CONFIÁVEL. Quando o boletim traz vários temas e várias teses, a associação tema-tese por ordem no texto é heurística e falha. Por isso o índice NÃO afirma qual tese pertence a qual tema quando há mais de um, e manda abrir o boletim. Nenhuma tese deste acervo entra em peça sem leitura do inteiro teor.

Quinto, sessões cobertas. Uma única falha de extração em 105 arquivos, e um boletim sem data legível na primeira página. Ambos identificáveis pela ausência no `INDICE-BOLETINS.md`.

## Regra de citação em peça

Formato recomendado. "Tema N/TNU, fixado na sessão de DD/MM/AAAA (PUIL n. XXXXX), cuja tese é a seguinte, [transcrição literal]". Acrescentar o boletim de origem em nota quando útil ao cotejo.

Nunca citar tese de TNU de memória, de resumo de portal jurídico ou de post de rede social. O boletim está na pasta e a leitura leva um minuto.

Quando a tese constar do `base-precedentes-catalogo-vinculantes` com redação verificada, ela prevalece como fonte de transcrição, e o boletim serve de confirmação e de contexto (voto, fundamentos, caso concreto).

## Manutenção

A cada boletim novo, salvar o PDF na pasta `Boletins TNU` e reexecutar `references/extrai_boletins_tnu.py`, regenerando os dois índices. O script usa `pdftotext`, que se mostrou mais robusto que a leitura por biblioteca Python nos boletins antigos (16 arquivos falhavam na leitura por pypdf e abriram normalmente pelo pdftotext).

Tema novo com tese relevante para o escritório deve ser promovido ao `base-precedentes-catalogo-vinculantes` com redação literal, conforme a disciplina de alimentação do catálogo.

## Integração com outras skills

`base-precedentes-catalogo-vinculantes` é o destino das teses promovidas. `pesquisa-jurisprudencia-chrome` dá o protocolo de conferência e a base oficial do CJF para julgados recentes. `base-tnu-admissibilidade-manual` e `pedilef-cotejo-analitico-tnu` cuidam da admissibilidade e do cotejo quando o caso for de PUIL. `base-recursos-jef` e `base-tru-trf3-sumulas-jurisprudencia` completam o quadro do microssistema dos Juizados. O agente `verificador-precedentes` pode usar este acervo como fonte local antes de sair para a rede.
