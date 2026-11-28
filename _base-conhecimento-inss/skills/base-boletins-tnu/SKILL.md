---
name: base-boletins-tnu
description: "Acervo dos Boletins oficiais da TNU como fonte de teses, com índice de 241 temas e 104 boletins (sessões de 18/02/2016 a 24/06/2026). Use SEMPRE que mencionar boletim da TNU, tese da TNU, tema TNU, PUIL, PEDILEF, representativo de controvérsia, questão de ordem da TNU, súmula da TNU, tese alterada em embargos, revisão de tese, sobrestamento de tema, e SEMPRE que a peça for para Turma Recursal ou TNU. Localiza em que boletim está cada tema, com data de sessão e processo, para leitura do inteiro teor na fonte. Traz a trava de homônimo de corte (tema de número alto costuma ser do STF) e o alerta de tese alterada quando o mesmo tema aparece em mais de um boletim. Cruza com base-precedentes-catalogo-vinculantes, pesquisa-jurisprudencia-chrome, base-tnu-admissibilidade-manual, pedilef-cotejo-analitico-tnu e base-recursos-jef."
---

# Boletins da TNU

## O acervo

O Boletim da TNU é publicação oficial do Conselho da Justiça Federal com as decisões de cada sessão. Serve de fonte de tese da TNU, com transcrição literal.

O escritório guarda 104 boletins na pasta `Boletins TNU`, sessões de 18/02/2016 a 24/06/2026, com 241 temas indexados pelo script `references/extrai_boletins_tnu.py` (extração de 11/08/2026), que se reexecuta a cada boletim novo. O MCP `iurisprudencia` (ferramentas `*_tnu`) complementa o acervo com os acórdãos da TNU.

## Por que importa

No JEF não cabe recurso especial (Súmula 203 STJ), e a via ao STJ é o pedido de uniformização do art. 14, §4º, da Lei 10.259/2001. A tese da TNU orienta as Turmas Recursais, e o boletim registra sua redação e data.

## Uso em três passos

1. Localizar o tema em `references/INDICE-TEMAS-TNU.md` (boletim e data da sessão) ou o boletim em `references/INDICE-BOLETINS.md`.
2. Abrir o PDF e ler o inteiro teor, não apenas a tese.
3. Transcrever na peça com número do tema, processo, data da sessão e boletim, marcando [CONFERIDO] com a data, na forma de `pesquisa-jurisprudencia-chrome`.

## Cautelas da extração

Homônimo de corte. Tema de número acima de 400 citado em boletim costuma ser de outra corte. Exemplo, o Boletim 105 registra o sobrestamento do Tema 387 TNU pela afetação do Tema 1.467 STF. Esses números foram excluídos do índice.

Tese alterada. Tema presente em mais de um boletim indica alteração, revisão, sobrestamento ou cancelamento. Exemplo, o Tema 223 teve tese fixada em 20/11/2020 e alterada em embargos em 25/02/2021 (Boletim 52). Ler sempre o boletim mais recente do tema.

Formatos. Até cerca do Boletim 20, a tese vem junto ao processo ("REPRESENTATIVO DE CONTROVÉRSIA (TEMA 150)"). Nos posteriores, o índice lista "TEMA N. ... PUIL n. ..." e a tese vem após a fórmula "a TNU fixou a seguinte tese".

Pareamento. A associação automática entre tema e tese falha em boletim com vários temas. O índice não atribui tese a tema nesses casos; abrir o boletim.

Cobertura. Houve uma falha de extração em 105 arquivos e um boletim sem data legível; ambos não constam de `INDICE-BOLETINS.md`.

## Regra de citação

Formato. "Tema N TNU, fixado na sessão de DD/MM/AAAA (PUIL n. XXXXX), com a seguinte tese, [transcrição literal]". O boletim de origem vai em nota quando útil ao cotejo.

Nunca citar tese da TNU de memória, de portal jurídico ou de rede social. Quando a tese constar do `base-precedentes-catalogo-vinculantes` com redação verificada, ela prevalece, e o boletim serve de confirmação e contexto.

## Manutenção

Salvar cada boletim novo na pasta e reexecutar o script, que regenera os dois índices. O script usa `pdftotext`, mais robusto que o pypdf nos boletins antigos. Tese relevante para o escritório deve ser promovida ao `base-precedentes-catalogo-vinculantes` com redação literal.

## MCPs da casa

Consulta obrigatória aos MCPs. Toda análise, peça ou orientação feita com esta skill parte de pesquisa prévia nos MCPs, antes da redação. O `normas` dá o dispositivo e o `norma_inss` do `iurisprudencia` dá a IN 128/2022; o `superiores` dá o tema e a decisão do STF e do STJ; o `iurisprudencia` e o `trf3` dão os acórdãos da TNU, do CRPS, do TRF3 e das Turmas Recursais de SP e MS sobre a mesma questão; o `acervo` dá o que o escritório já sustentou. As decisões localizadas servem de controle da tese. A resposta informa se elas confirmam ou contrariam o caminho adotado, e a divergência é enfrentada antes do protocolo. Norma, súmula, tema, enunciado ou acórdão não localizado no MCP nem lido na fonte oficial leva [NÃO CONFIRMADO] e fica fora da peça. A ordem de consulta, a cobertura de cada base e os catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) estão em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O reaproveitamento automático de texto do acervo de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Integração com outras skills

`base-precedentes-catalogo-vinculantes` recebe as teses promovidas. `pesquisa-jurisprudencia-chrome` dá o protocolo de conferência. `base-tnu-admissibilidade-manual` e `pedilef-cotejo-analitico-tnu` tratam da admissibilidade e do cotejo. `base-recursos-jef` e `base-tru-trf3-sumulas-jurisprudencia` completam o microssistema dos Juizados. O agente `verificador-precedentes` pode usar este acervo como fonte local.
