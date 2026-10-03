---
name: base-dano-moral-previdenciario
description: "Skill base sobre dano moral em matéria previdenciária, cabimento, parâmetros e estratégia probatória pró-segurado. Use SEMPRE que mencionar dano moral previdenciário, indenização contra INSS, indeferimento abusivo, demora injustificada, suspensão indevida de benefício, cessação irregular, exigência abusiva, perícia humilhante, falso indício de fraude, atraso na implantação, descumprimento de tutela, tutela específica, fila do INSS, dignidade humana, art. 5º X CF, art. 37 §6º CF, art. 186 CC, art. 927 CC, dano moral in re ipsa, Tema 642 STJ, valor R$ 5.000 R$ 10.000 R$ 20.000, Súmula 387 STJ, danos morais previdenciários, ofensa ao mínimo existencial. Hub para responsabilização objetiva do INSS quando o ato administrativo ou a omissão extrapola o erro tolerável e atinge a dignidade do segurado. NÃO use para erro material em concessão sem ofensa moral. Cruza com peticao-previdenciaria e mandado-seguranca-previdenciario."
---

# Dano Moral Previdenciário

## 1. Quando acionar esta skill

Acione SEMPRE que houver indício de dano moral atribuível ao INSS, especialmente em casos de cessação indevida de benefício alimentar, demora abusiva na concessão, exigências injustificadas, perícia humilhante, falso indício de fraude e descumprimento reiterado de decisão judicial.

## 2. Marco normativo

A Constituição Federal no art. 5º X assegura indenização por dano moral. O art. 37 §6º estabelece responsabilidade objetiva do Estado. O art. 186 do Código Civil define o ato ilícito. O art. 927 estabelece o dever de indenizar. A Súmula 37 STJ admite cumulação de dano material e moral (a 387 STJ trata de dano estético + moral).

A jurisprudência admite dano moral quando o ato administrativo extrapola o erro tolerável e atinge a dignidade do segurado.

## 3. Eixos centrais pró-segurado

A cessação indevida de benefício alimentar gera dano moral in re ipsa quando o segurado é privado dos meios de subsistência por ato ilegal do INSS.

A demora abusiva na concessão (acima de 90 dias sem justificativa) caracteriza ofensa quando o segurado encontra-se em vulnerabilidade extrema.

A exigência reiterada de documentos já apresentados configura abuso administrativo, especialmente quando vem acompanhada de falso indício de fraude.

A perícia humilhante, com tratamento inadequado, exposição vexatória ou pré-julgamento, configura dano moral.

A responsabilidade do INSS é objetiva pelo art. 37 §6º CF, dispensando prova de culpa.

## 4. Fragilidades adversárias mais comuns

O INSS argumenta que mero indeferimento não gera dano moral. Refute com a distinção entre erro tolerável e ato abusivo.

O INSS alega ausência de comprovação do dano. Refute com dano moral in re ipsa.

O INSS sustenta valor simbólico. Refute com parâmetros de R$ 5.000 a R$ 20.000 conforme jurisprudência.

O INSS alega prescrição quinquenal. Refute com Súmula 85 STJ para parcelas e prazo prescricional para o dano.

## 5. Estratégia processual

A defesa pró-segurado pivota em pedido cumulado de implantação e indenização, com produção de prova documental do indeferimento abusivo, atestados médicos, declarações de testemunhas e relatório social. Combinar com `base-ms-cabimento-direito-liquido-certo` quando houver direito líquido e certo, e com `peticao-previdenciaria` para ação ordinária.

## 6. Documentos essenciais

Indeferimento ou cessação. Histórico de pedidos administrativos. CNIS. Carta de concessão. Atestados de doença. Relatório social. Comprovantes de despesas básicas. Quando perícia humilhante, prints de relatório e testemunhas.

## 7. Fontes

Consulte os arquivos `references/FUNDAMENTOS-E-CENARIOS.md` e `references/JURISPRUDENCIA-E-REFUTACAO.md`.

## Hub de portarias administrativas

Hub das Portarias DPMF/DIRBEN/INSS aplicáveis a este benefício. Acionar `base-portarias-dpmf-inss-hub` para identificar quais Portarias regem o procedimento administrativo, o cálculo, as ratificações e os recursos no caso concreto.

## MCPs da casa

Pesquisa obrigatória (Onda 169). Nenhuma norma, súmula, tema, enunciado ou acórdão citado nesta skill entra em peça, parecer ou orientação sem passar antes pelo MCP próprio, e nenhum MCP autoriza sozinho a marca [CONFERIDO]. O achado nasce [NÃO CONFIRMADO] e só sobe a [CONFERIDO] depois de lido na fonte oficial, na forma de `pesquisa-jurisprudencia-chrome`.

Legislação. O dispositivo se transcreve do MCP `normas`, por `obter_artigo` no identificador da norma e no número do artigo (exemplo, `lei-8213-1991` e `57`), lendo o campo `texto` e a última ocorrência de cada parágrafo, e a redação de outra época se lê por `redacao_na_data`. A IN 128/2022 se confere também pelo `norma_inss` do MCP `iurisprudencia`, que versiona parágrafo a parágrafo e já traz alterações ausentes da base local, como as da IN PRES/INSS 212/2026. Norma ausente das duas bases exige a fonte oficial a cada uso.

Jurisprudência. Tema, súmula e enunciado se conferem primeiro no catálogo `base-precedentes-catalogo-vinculantes` e no catálogo complementar da `auditoria-citacoes`, com atenção ao homônimo de outra corte. Enunciado do CRPS se lê em `enunciados_pleno_inss_crps`, na redação vigente e nas anteriores. Acórdão da TNU se localiza em `buscar_acordaos_tnu`. Acórdão do TRF3 e das Turmas Recursais se localiza em `buscar_acordaos_trf3`, na base local, e em `buscar_acordaos_trf3_jef`, consulta ao vivo. Ação civil pública que o INSS cumpre se lê no `norma_inss`, Portaria Conjunta 94/2024.

Acervo do escritório. O que o escritório já sustentou se lê no MCP `acervo`, por `buscar_tese_acervo`, `obter_trecho_acervo` e `precedentes_do_acervo`, cujo campo `corte` evita o homônimo. Detalhe em `base-acervo-escritorio`.

**Vedação.** O acervo existe para o advogado LER o que já sustentou. Reaproveitamento automático de texto de um cliente em peça de outro é VEDADO. O trecho é ponto de partida para redação nova, conferida contra os autos e contra a legislação vigente na data. O trecho é anonimizado, e o arquivo de origem não é.

Protocolo completo, coberturas e limites medidos em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs".
