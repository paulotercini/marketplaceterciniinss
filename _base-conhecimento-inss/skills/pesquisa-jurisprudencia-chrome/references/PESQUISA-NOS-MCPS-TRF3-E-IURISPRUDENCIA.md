# Como pesquisar nos MCPs trf3 e iurisprudencia

Testado em 19/09/2026 nas duas bases, com as consultas citadas abaixo. Complementa `MCP-TRF3-E-CONFERENCIA-NO-PORTAL.md`, que trata da conferência no portal do TRF3, e não a repete.

## Qual base para qual pergunta

O MCP `trf3` responde o que decidem a 7ª à 10ª Turma e a 3ª Seção do TRF3 e as Turmas Recursais de SP e MS, com a TRU3 dentro delas. O MCP `iurisprudencia` tem duas bases. A da TNU cobre de 18/01/2019 a 28/08/2026, com 9.550 acórdãos e 3.392 decisões monocráticas. A do CRPS cobre de 03/01/2022 a 15/09/2026, com 2.128.502 acórdãos das Juntas e das Câmaras.

A ordem segue a hierarquia da skill. Primeiro o vinculante no catálogo do escritório, depois a TNU, quando a matéria é de JEF, e o TRF3 e suas Turmas Recursais para o caso concreto da região. O CRPS entra quando a via é administrativa ou quando se quer saber como a Junta decide antes de recorrer. Toda pesquisa começa pela visão geral da base, porque ausência fora do período coberto não significa nada.

## Como montar a consulta

As duas bases ignoram acentuação e aceitam aspas para expressão exata e `-palavra` para excluir. Termo solto é procurado em qualquer ponto do inteiro teor, e por isso a consulta útil combina a expressão da tese entre aspas com o agente, o benefício ou o dispositivo. Na TNU, `"ruído" "EPI eficaz" "tema 555"` devolveu 44 acórdãos. A mesma ideia sem aspas, na comparação entre as fontes, trouxe entre os mais recentes julgados sobre segurado especial e sobre aposentadoria da pessoa com deficiência.

Nenhuma das duas tem operador OU. No `trf3`, a palavra "OR" digitada é procurada como texto, e `ruido OR EPI` devolveu 14 acórdãos que contêm a sílaba, contra 4.766 de `ruido EPI`. Quem precisa de alternativa faz duas buscas.

Número de processo se busca no próprio campo de consulta, com a pontuação do CNJ, nas duas bases. No `trf3`, `5248998-80.2020.4.03.9999` achou o acórdão. Na TNU, `0000926-36.2017.4.03.6314` devolveu os três julgados do processo, o PUIL não conhecido em 2024, os embargos em 2025 e o agravo interno em 2026.

## Particularidades do trf3

Os filtros são o acervo (`trf3` ou `recursais`), a classe pela sigla (`ApCiv`, `ApelRemNec`, `AI`, `RecInoCiv`, `PUILCiv`), o órgão por parte do nome, as datas de julgamento, o resultado inferido e o polo recorrente inferido. O filtro de relator procura o nome em três papéis, quem relatou, o titular do gabinete e o relator para acórdão, porque o CJF registra o juiz convocado e o portal mostra o titular.

Nas Turmas Recursais o texto chega do CJF sem os caracteres acentuados, e a busca ali usa a palavra sem acento. A TRU3 se filtra pelo órgão `Uniformiza`, porque o nome também vem sem acento. Sem consulta, a lista vem da data mais recente para a mais antiga. Com consulta, vem pela relevância, que pesa mais a ementa que o inteiro teor.

## Particularidades do iurisprudencia

Na TNU, para tese, filtra-se `tipo_documento` igual a `acordao`, porque a decisão monocrática é de admissibilidade e não entra na estatística. O campo `data_julgamento` vem vazio em boa parte dos julgados, e a data útil é a `data_referencia`. Julgado com `tem_inteiro_teor` falso traz só o extrato da ata, sem fundamentação, e não serve de paradigma.

No CRPS a busca expande sinônimo legal. `ruído EPI` também procurou "equipamento de proteção individual", e a resposta avisa em `termo_expandido_com`. Os filtros próprios são a espécie, o recurso ordinário ou especial, o objeto e a unidade julgadora. Para saber como um enunciado do Conselho Pleno é aplicado, usa-se `acordaos_por_precedente_inss_crps`, que lê a citação indexada, e não a busca por "enunciado 13", que traz qualquer menção solta. O texto vigente do enunciado e as redações anteriores saem de `enunciados_pleno_inss_crps`.

A comparação entre CRPS e TNU serve para uma primeira leitura de estratégia. O percentual responde pouco, porque as instâncias não são comparáveis e o recorrente muda caso a caso. O que responde são os julgados líderes, lidos no inteiro teor.

## Vários acórdãos no mesmo processo

O mesmo processo costuma ter mais de um acórdão, o da apelação ou do PUIL, o dos embargos, o do agravo interno e às vezes o da retratação depois de um tema repetitivo. O portal do TRF3 e a busca por número na TNU devolvem todos, e a base do `trf3` pode ter só alguns, conforme o período já coletado.

Na conferência, escolhe-se primeiro o acórdão cuja data de julgamento bate com a do registro do MCP, para confirmar que se trata do mesmo julgado. Em seguida se leem os demais acórdãos do processo, porque a tese completa raramente está num só. Os embargos rejeitados confirmam a tese sem acrescentar fundamento. Os embargos com efeito modificativo, o agravo interno provido e a retratação alteram o resultado, e o acórdão anterior deixa de valer sozinho.

Cita-se o acórdão que traz a razão de decidir, com a indicação dos posteriores que a mantiveram ou a modificaram. No teste de 19/09/2026, o MCP devolveu do processo 5248998-80.2020.4.03.9999 só os embargos do INSS rejeitados em 11/03/2026. O portal trouxe também o agravo interno de 13/11/2025, que manteve a decisão monocrática de reconhecimento da atividade especial, com a transcrição dela na ementa. A tese estava na monocrática confirmada pelo agravo interno, e não nos embargos. A monocrática fica no acervo próprio do portal, que o MCP não tem, e se abre ali quando for ela a carregar a fundamentação.

## Onde se confere

O `link_portal` que o `iurisprudencia` devolve aponta para `iurisprudencia.com.br`, que não é fonte oficial e não autoriza a marca [CONFERIDO]. O acórdão da TNU se confere na base oficial `https://eproctnu-jur.cjf.jus.br`, a mesma indicada na seção 4.4 da skill. O enunciado do CRPS se confere na página oficial do Conselho no gov.br. Para o acórdão do CRPS, a consulta pública oficial não foi localizada na base do escritório até 19/09/2026, e o julgado fica [NÃO CONFIRMADO] até que essa via seja definida. O acórdão do TRF3 se confere no portal, na forma da referência própria.

A base do `iurisprudencia` declara que não guarda dado pessoal. A do `trf3` guarda o inteiro teor com os nomes que aparecem no corpo do relatório, e por isso trecho copiado dela para peça ou relatório passa pela mesma cautela de sigilo aplicada a qualquer documento de terceiro.
