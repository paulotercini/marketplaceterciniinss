# B91 Aposentadoria por Incapacidade Permanente — Fundamentos e Cenários

## 1. Fundamentos normativos

Lei 8.213/91, art. 42. Concede B91 ao segurado que, estando ou não em B31, for considerado incapaz e insuscetível de reabilitação para o exercício de atividade que lhe garanta a subsistência.

Lei 8.213/91, art. 42, §2º. Doença ou lesão anterior à filiação não impede o benefício quando a incapacidade decorrer de progressão ou agravamento. Interpretação pró-segurado.

Lei 8.213/91, art. 43. DIB do B91 a partir do dia imediato à cessação do B31, ou do laudo pericial quando houver requerimento direto sem B31 prévio.

Lei 8.213/91, art. 44. RMI do B91. Após a EC 103/2019, calculada pelo novo regime.

Lei 8.213/91, art. 45. Acréscimo de 25% ao valor do benefício para quem necessite de assistência permanente de outra pessoa (grande invalidez).

Lei 8.213/91, arts. 46 a 48. Regulam a recuperação da capacidade, o retorno ao trabalho e a cessação do B91, com regras de gradualidade no caso de recuperação parcial (art. 47).

EC 103/2019, art. 26, §3º, II. RMI do B91 não acidentário é de 60% da média, acrescidos de 2% por ano excedente a 20 anos para o homem e 15 anos para a mulher.

EC 103/2019, art. 26, §3º, III, combinado com §2º, II. RMI do B91 acidentário (por acidente de trabalho ou doença ocupacional) é de 100% da média.

Portaria Conjunta MPS/INSS 14/2026. Regulamenta a análise documental do B91 e cessação. Acionar `analise-documental-incapacidade`.

Lei 8.213/91, art. 25, I. Carência de 12 contribuições, salvo isenção pelo art. 26, II.

## 2. Cenários operacionais pró-segurado

### Cenário 1 — Segurado em B31 com quadro agravado

Segurado com B31 concedido há 2 anos, com quadro degenerativo progressivo. Laudo especializado atesta incapacidade total e definitiva. Conversão em B91 com DIB na data da consolidação do quadro irreversível.

### Cenário 2 — Segurada com neoplasia maligna metastática

Segurada com 8 contribuições e diagnóstico de câncer avançado com metástases. Isenção de carência pelo art. 26, II. Prognóstico desfavorável com incapacidade total. B91 direto.

### Cenário 3 — Acidente com incapacidade permanente

Segurado com 5 meses de contribuição sofre acidente com lesão medular e tetraplegia. Isenção de carência. B91 acidentário (B92) com RMI de 100% da média.

### Cenário 4 — Grande invalidez com necessidade de assistência permanente

Segurado com esclerose múltipla avançada, cadeirante, com necessidade de cuidador. Acréscimo de 25% pelo art. 45 da Lei 8.213/91, mesmo que ultrapasse o teto do RGPS.

### Cenário 5 — Cessação indevida após reavaliação

Segurado com B91 desde 2015 é cessado em 2026 por perícia do Programa Revisão, sem exame específico e com quadro mantido. Restabelecimento com pedido de implantação imediata.

### Cenário 6 — Reabilitação inviável

Segurado em programa de reabilitação profissional com parecer de inviabilidade. Conversão em B91 pelo art. 62, §2º, da Lei 8.213/91. Súmula 47 TNU para implantação.

### Cenário 7 — Doença preexistente com agravamento

Segurado com artrose lombar prévia à filiação, porém com agravamento por atividade laboral pesada. Art. 42, §2º, da Lei 8.213/91 e Tema 1083 STJ. B91 devido com eventual conversão em acidentário.

### Cenário 8 — Conversão retroativa com efeitos financeiros

Segurado com B31 mantido indevidamente quando já fazia jus ao B91. Pedido de conversão retroativa, com DIB do B91 na data da consolidação do quadro permanente, para assegurar efeitos financeiros corretos.

## 3. Documentos essenciais

Laudos médicos especializados atualizados com CID e prognóstico.
Exames de imagem (RM, TC, raios-X) e laboratoriais.
Histórico clínico consolidado com evolução temporal.
Relatórios de internação e cirurgias.
Prescrições medicamentosas contínuas.
Declaração de cuidador ou terapeuta para fins do art. 45.
CAT (Comunicação de Acidente de Trabalho) quando acidentário.
PPP e LTCAT quando houver nexo ocupacional.
Receituários e planos terapêuticos.
Laudos psiquiátricos, neurológicos ou de outras especialidades pertinentes.

## 4. Estratégia na reavaliação (Programa Revisão)

Manter documentação médica atualizada permanentemente. Comparecer à perícia com acompanhante e laudos recentes. Pedir cópia do parecer da reavaliação. Em cessação indevida, restabelecimento com tutela de urgência e perícia judicial.

## 5. Acréscimo de 25% (art. 45)

Pedir expressamente no requerimento administrativo ou na ação judicial. Provar a necessidade de assistência permanente com laudo médico e, quando possível, relatório social. O rol do Anexo I do Decreto 3.048/99 não é taxativo. Tema 982 STJ examina a extensão a outros benefícios, porém o acréscimo é intrínseco ao B91.

## 6. Caráter acidentário (B92)

Acionar `ntep-nexo-acidentario` para verificar NTEP ou nexo técnico individual. Acionar `base-incapacidade-acidentaria-b92` para a conversão com RMI integral de 100%. A diferença é expressiva, pois no B91 não acidentário a RMI pode ficar próxima do mínimo, enquanto no acidentário é de 100% da média.

## 7. Cruzamento com outras skills

Acionar `analise-documental-incapacidade` para detalhes da Portaria Conjunta 14/2026.
Acionar `auditoria-laudo-pericial` para revisão técnica de laudo.
Acionar `periodo-graca-qualidade-segurado` para qualidade na DII.
Acionar `ntep-nexo-acidentario` para caráter acidentário.
Acionar `base-incapacidade-b31-temporaria` para conversão B31 em B91.
Acionar `base-incapacidade-acidentaria-b92` para B91 acidentário.
Acionar `base-calculo-rmi-ec103` para cálculo da RMI pós-reforma.
Acionar `orientacao-cliente-pericia` para orientar o segurado.
Acionar `tema-1124-instrucao-administrativa` em documentação nova.

## 8. Alerta estratégico

Primeiro, RMI do B91 não acidentário pós-reforma é severamente reduzida. Para segurado com 21 anos de contribuição (homem), RMI apenas 62% da média. Imprescindível verificar caráter acidentário para RMI integral.

Segundo, acréscimo de 25% deve ser sempre pedido expressamente. Prova da assistência permanente é fundamental. Extensão a outros benefícios pendente no STJ (Tema 982).

Terceiro, cessação pelo Programa Revisão sem perícia específica é impugnável. Acumular prova médica contemporânea à reavaliação e restabelecer com tutela.

Quarto, no caso de doença preexistente, enfrentar com agravamento e progressão nos termos do art. 42 §2º e do Tema 1083 STJ.
