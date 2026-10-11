# Como pesquisar nos MCPs trf3 e iurisprudencia

Testado em 19/09/2026 nas duas bases, com as consultas citadas abaixo. Complementa `MCP-TRF3-E-CONFERENCIA-NO-PORTAL.md`, que trata da conferência no portal do TRF3, e não a repete.

## Ordem de consulta entre os MCPs superiores e trf3 (11/10/2026)

Os dois servidores funcionam interligados, e a ordem é fixa. O TRF3 só se pesquisa depois de saber o que o STF e o STJ decidiram.

**Primeiro passo, no `superiores`.** Antes de qualquer pesquisa no TRF3, verifique se o STF ou o STJ já decidiu a matéria. Rode `buscar_temas` com a expressão da tese e `previdenciario=true`, e depois `obter_tema` no tema encontrado, para ler a tese literal, a situação, o leading case e o tema vinculado do outro tribunal. Não havendo tema, procure em `buscar_decisoes_superiores` os acórdãos do STJ sobre a matéria. Não havendo tema nem acórdão, registre "Não localizado" nos tribunais superiores, e só então vá ao TRF3 e à TNU.

**Segundo passo, no `trf3`, que só começa depois do primeiro.** Havendo tema ou julgado superior, a pergunta passa a ser como o TRF3 e as Turmas Recursais o interpretam e aplicam. Busque nos acervos `trf3` e `recursais` pelo número do tema nas duas grafias, porque os acórdãos escrevem das duas formas e a busca não tem operador OU. No Tema 1124 do STJ, por exemplo, "tema 1124" e "tema 1.124" trazem conjuntos diferentes. Combine o número com a expressão da tese para reduzir o volume. Classifique o que o TRF3 faz com o tema, se aplica, se faz distinção, se sobrestá o processo à espera do julgamento ou se decide contra a tese. Siga a regra de escolher o acórdão pela data de julgamento e de revisitar os demais acórdãos do mesmo processo. Confira o `polo_recorrente`, porque "provido" não quer dizer favorável ao segurado.

**Resultado.** O relatório de pesquisa apresenta, nesta ordem, a tese do tribunal superior, com a situação e o `link_oficial`, e depois a leitura que o TRF3 e as Turmas Recursais fazem dela, com dois ou três acórdãos representativos. Se o TRF3 decide contra a tese vinculante, isso aparece como argumento de reforma, com fundamento no art. 927 do CPC, e não como jurisprudência a seguir. Nada vai para a peça sem a conferência do tema no `link_oficial` e do acórdão do TRF3 no portal.

## Qual base para qual pergunta

O MCP `trf3` responde o que decidem a 7ª à 10ª Turma e a 3ª Seção do TRF3 e as Turmas Recursais de SP e MS, com a TRU3 dentro delas. O MCP `iurisprudencia` tem duas bases. A da TNU cobre de 18/01/2019 a 28/08/2026, com 9.550 acórdãos e 3.392 decisões monocráticas. A do CRPS cobre de 03/01/2022 a 15/09/2026, com 2.128.502 acórdãos das Juntas e das Câmaras.

A ordem segue a hierarquia da skill. Primeiro o vinculante no catálogo do escritório, depois a TNU, quando a matéria é de JEF, e o TRF3 e suas Turmas Recursais para o caso concreto da região. O CRPS entra quando a via é administrativa ou quando se quer saber como a Junta decide antes de recorrer. Toda pesquisa começa pela visão geral da base, porque ausência fora do período coberto não significa nada.

## Como montar a consulta

As duas bases ignoram acentuação e aceitam aspas para expressão exata e `-palavra` para excluir. Termo solto é procurado em qualquer ponto do inteiro teor, e por isso a consulta útil combina a expressão da tese entre aspas com o agente, o benefício ou o dispositivo. Na TNU, `"ruído" "EPI eficaz" "tema 555"` devolveu 44 acórdãos. A mesma ideia sem aspas, na comparação entre as fontes, trouxe entre os mais recentes julgados sobre segurado especial e sobre aposentadoria da pessoa com deficiência.

Nenhuma das duas tem operador OU. No `trf3`, a palavra "OR" digitada é procurada como texto, e `ruido OR EPI` devolveu 14 acórdãos que contêm a sílaba, contra 4.766 de `ruido EPI`. Quem precisa de alternativa faz duas buscas.

Número de processo se busca no próprio campo de consulta, com a pontuação do CNJ, nas duas bases. No `trf3`, `5248998-80.2020.4.03.9999` achou o acórdão. Na TNU, `0000926-36.2017.4.03.6314` devolveu os três julgados do processo, o PUIL não conhecido em 2024, os embargos em 2025 e o agravo interno em 2026.

## Particularidades do trf3

Os filtros são o acervo (`trf3`, `recursais` ou `sumulas`, este com as Súmulas do TRF3, sem resultado nem polo), a classe pela sigla (`ApCiv`, `ApelRemNec`, `AI`, `RecInoCiv`, `PUILCiv`), o órgão por parte do nome, as datas de julgamento, o resultado inferido e o polo recorrente inferido. O filtro de relator procura o nome em três papéis, quem relatou, o titular do gabinete e o relator para acórdão, porque o CJF registra o juiz convocado e o portal mostra o titular.

Nas Turmas Recursais o CJF apaga a letra acentuada, e não só o acento, de modo que "ruído" chega como "rudo". A busca do MCP `trf3` já procura as duas formas, e por isso a palavra se digita normalmente, com acento. Digitar sem acento, como `ruido`, não acha o texto mutilado. A TRU3 se filtra pelo órgão `Uniformiza`, porque o nome também chega mutilado. Consulta com mais de 10.000 resultados volta com o aviso `consulta_pesada` e sem ordenação por relevância. Nesse caso, acrescente termo ou filtro (órgão, acervo, datas) antes de ler a lista. Sem consulta, a lista vem da data mais recente para a mais antiga. Com consulta, vem pela relevância, que pesa mais a ementa que o inteiro teor. A TRU3 está na base, filtrada pelo órgão `Uniformiza`, e a contagem sai de `visao_geral_trf3`.

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
