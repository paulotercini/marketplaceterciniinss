---
name: base-dano-moral-previdenciario
description: "Skill base sobre dano moral em matéria previdenciária, cabimento, parâmetros e estratégia probatória pró-segurado. Use SEMPRE que mencionar dano moral previdenciário, indenização contra INSS, indeferimento abusivo, demora injustificada, suspensão indevida de benefício, cessação irregular, exigência abusiva, perícia humilhante, falso indício de fraude, atraso na implantação, descumprimento de tutela, tutela específica, fila do INSS, dignidade humana, art. 5º X CF, art. 37 §6º CF, art. 186 CC, art. 927 CC, dano moral in re ipsa, Tema 372 STJ, Tema 642 STJ, valor R$ 5.000 R$ 10.000 R$ 20.000, Súmula 387 STJ, danos morais previdenciários, ofensa ao mínimo existencial. Hub para responsabilização objetiva do INSS quando o ato administrativo ou a omissão extrapola o erro tolerável e atinge a dignidade do segurado. NÃO use para erro material em concessão sem ofensa moral. Cruza com peticao-previdenciaria e mandado-seguranca-previdenciario."
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

Antes de redigir, consulte os três servidores locais do plugin, nesta ordem. Os três localizam e não conferem, e nenhum autoriza a marca [CONFERIDO].

Legislação. Todo dispositivo citado nesta skill se transcreve do MCP `normas`, por `obter_artigo` no identificador da norma e no número do artigo (exemplo, `lei-8213-1991` e `57`), lendo o campo `texto` e a última ocorrência de cada parágrafo. Para tese de direito adquirido, `redacao_na_data`, que responde por ano. A citação em peça exige a `fonte_oficial` que a resposta devolve. Detalhe em `base-legislacao-fontes-primarias`.

Jurisprudência do TRF3 e das Turmas Recursais. Localize pelo MCP `trf3`, com `buscar_acordaos_trf3` (consulta, `polo_recorrente`, `resultado`, `orgao_julgador` e datas) e `obter_acordao_trf3` no id devolvido. `resultado` e `polo_recorrente` são inferidos. O achado nasce [NÃO CONFIRMADO] e só entra na peça depois de aberto no portal do TRF3, na forma de `pesquisa-jurisprudencia-chrome`. TNU e CRPS ficam no MCP `iurisprudencia`.

Acervo do escritório. Consulte pelo MCP `acervo` o que o escritório já sustentou neste tema. Comece por `buscar_tese_acervo` com os termos centrais desta skill e, achando trecho útil, leia o argumento inteiro com `obter_trecho_acervo`. Para saber em que peças um precedente já foi usado, chame `precedentes_do_acervo` e leia o campo `corte` da resposta, porque o mesmo número de Tema existe em mais de uma corte. Detalhe em `base-acervo-escritorio`.

**Vedação.** O acervo existe para o advogado LER o que já sustentou. Reaproveitamento automático de texto de um cliente em peça de outro é VEDADO. O trecho é ponto de partida para redação nova, conferida contra os autos e contra a legislação vigente na data. O trecho é anonimizado, e o arquivo de origem não é.
