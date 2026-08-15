---
name: revisao-peticao
description: "Revisão automática de petições previdenciárias geradas pelo Claude. Executa AUTOMATICAMENTE após toda petição da skill peticao-previdenciaria. Audita em quatro camadas (formal, normativa, fática, argumentativa) contra documentos anexados, CNIS e legislação, com severidade Crítico/Importante/Menor. Hub de integração que aciona todas as skills relevantes. Use SEMPRE após peticao-previdenciaria gerar petição, recurso, embargos, agravo, MS ou peça processual. Use quando mencionar revisar petição, auditar petição, checar petição, revisão da peça, verificar petição, conferir petição. NÃO use para auditoria de laudos periciais, PPP ou sentenças/acórdãos."
---

# Skill de Revisão de Petições Previdenciárias

## Visão Geral

Esta skill funciona como o segundo advogado do escritório. Após cada petição gerada pela skill peticao-previdenciaria, executa uma auditoria completa da peça em quatro camadas, cruza com os documentos anexados e a legislação aplicável, e reporta os achados classificados por severidade.

A execução é AUTOMÁTICA e OBRIGATÓRIA após toda petição. Não depende de comando do usuário.

## Momento de Ativação

Imediatamente após a skill peticao-previdenciaria gerar o .docx e apresentá-lo ao usuário. A revisão ocorre no mesmo turno de resposta, logo após a entrega do documento. O fluxo completo é o seguinte.

1. peticao-previdenciaria gera o .docx
2. O arquivo é apresentado ao usuário
3. Esta skill é acionada automaticamente
4. O relatório de revisão é apresentado no corpo da conversa
5. Se houver achados, perguntar ao usuário se deseja correção automática

## Regra Zero — Verificação e Detecção de Alucinação

Esta verificação é transversal e prevalece sobre as quatro camadas. Aplica-se a toda citação de lei, jurisprudência, doutrina ou dado objetivo, como número de processo, data, nome de relator, número de tema e valor.

Nenhuma citação é tida como correta por presunção. Cada uma é tratada como suspeita até confirmação em fonte primária oficial. Havendo acesso a ferramenta de busca, verificar lei no portal oficial (Planalto e diários oficiais) e jurisprudência no sítio do tribunal de origem (STF, STJ, TNU, TRF3, TJSP). Não havendo acesso, marcar o item como não confirmado, a verificar em fonte oficial, e flagrar como CRÍTICO quando for fundamento central da peça.

É proibido confirmar citação a partir de memória do modelo. É proibido presumir a existência de tema, súmula ou dispositivo. Dado objetivo fabricado, como número de processo, relator ou data sem origem verificável, é achado CRÍTICO automático e impede o protocolo até correção.

## Quatro Camadas de Revisão

Antes de iniciar a revisão, ler o arquivo `references/CHECKLIST.md` que contém o checklist detalhado de cada camada.

### Camada 1 — Conformidade Formal

Verifica se a petição atende ao padrão visual e estrutural do escritório. Itens verificados incluem formatação, proibição de dois pontos, referência a documentos por ID, timbre, rodapé e estrutura da peça. A fonte autoritativa é a skill peticao-previdenciaria e seu arquivo references/FORMATTING.md.

### Camada 2 — Conformidade Normativa

Verifica se a fundamentação jurídica da petição está correta e completa. Aciona automaticamente as seguintes skills como hub de integração.

- **precedentes-previdenciarios** — Cada tema repetitivo, repercussão geral ou súmula citada na petição existe, está vigente e a tese transcrita confere com o original? Há temas aplicáveis ao caso que não foram citados?
- **Verificação de dispositivos legais** — Cada artigo, parágrafo, inciso ou alínea citado existe na norma indicada, está vigente e a redação atribuída confere com o texto oficial? Verificar revogações e alterações relevantes, em especial pela EC 103/2019 e reformas posteriores. Dispositivo inexistente, dispositivo revogado citado como vigente, ou conteúdo distorcido em relação à redação oficial é achado CRÍTICO. Numeração trocada, como citar art. 57 quando o correto é art. 58, ou citação de redação anterior sem indicar que é texto revogado, é achado IMPORTANTE
- **Fidelidade da citação jurisprudencial** — A transcrição entre aspas é idêntica ao texto original do acórdão, da ementa ou da tese firmada? Paráfrase apresentada entre aspas como se fosse literal é achado CRÍTICO. O número do tema, REsp, súmula ou enunciado corresponde exatamente à tese transcrita, sem troca de paradigma, e citar Tema 1124 com a tese de outro tema é CRÍTICO. A tese citada está vigente e não foi superada, revisada ou afetada por novo julgamento? O recorte da ementa não altera o sentido do julgado por supressão de trecho? A matéria fático-jurídica do precedente é pertinente ao caso concreto, sem aplicação de julgado sobre tema diverso?
- **regras-tutela-urgencia** — A política do escritório sobre tutela de urgência foi respeitada conforme o rito processual?
- **tema-1124-instrucao-administrativa** — Em petições de concessão ou revisão, a conformidade com o Tema 1124/STJ foi verificada? Há risco de extinção sem mérito?
- **decadencia-revisao-previdenciaria** — Em petições de revisão de benefício já concedido, o prazo decadencial foi verificado? Há alerta de esgotamento?
- **ms-competencia-autoridade-coatora** — Em mandados de segurança, a autoridade coatora e a competência territorial estão corretas?
- **documentos-comprobatorios-in128** — Os documentos referenciados na petição são os adequados conforme a IN 128/2022 para a categoria de segurado e espécie de direito?
- **auditoria-ppp** — Em petições de aposentadoria especial por ruído, quando o LAVG ou NE no PPP estiver entre 82 e 85 dB(A), verificar se a petição contém o cálculo do NEN pela jornada efetiva (NEN = NE + 10 × log₁₀(TE/480), fórmula da NHO-01 item 5.1.2). Verificar se a jornada efetiva considerou horas extras habituais comprovadas por contracheques. Verificar se a demonstração complementar pela lógica C/T da NR-15 Anexo 1 foi incluída. Verificar se a grandeza informada no PPP (NPS, LAVG, NEN) foi corretamente identificada antes da normalização. Se a petição normalizar um valor que já é NEN, flagrar como achado CRÍTICO (duplicação de normalização). Se o PPP mencionar "dosímetro" sem especificar a norma, verificar se a petição fundamenta a questão à luz do Tema 317/TNU
- **admissibilidade-relevacao-crps** — Em recursos ao CRPS, os pressupostos de admissibilidade foram atendidos?
- **lei-13460-usuario-servico-publico** — Quando a petição invoca a Lei 13.460/2017, o fundamento está corretamente articulado?
- **reafirmacao-der** — Em petições de concessão ou revisão de aposentadoria, verificar se há indicação de que os requisitos foram completados após a DER original. Se sim, verificar cumulativamente se (a) a petição contém concordância formal do segurado para reafirmação, (b) o cenário de reafirmação (durante PA, entre PA e ajuizamento, ou pós-ajuizamento) foi expressamente identificado, (c) os efeitos financeiros e juros foram fundamentados conforme o cenário correto, (d) o prequestionamento obrigatório está presente (Tema 995/STJ, Tema 334/STF, arts. 493/933 CPC, art. 577 IN 128, art. 176-D Decreto 3.048, distinção com desaposentação), (e) há pedido subsidiário de concessão do benefício mais vantajoso quando a reafirmação pode levar a espécie diversa. Ausência de concordância formal ou de identificação do cenário é achado CRÍTICO. Ausência de prequestionamento é achado IMPORTANTE.
- **analise-documental-incapacidade** — Em petições de B31, B91 ou B94, verificar se a petição considerou o regime de análise documental das Portarias Conjuntas MPS/INSS nº 13 e 15/2026. Verificações obrigatórias quando a espécie for B31/B91/B94 incluem (a) o interesse de agir está fundamentado a partir do indeferimento documental (a análise por verossimilhança não equivale a negativa de mérito após exame clínico), (b) os efeitos financeiros foram analisados à luz do Tema 1124 em relação à documentação apresentada na via administrativa, (c) se o segurado teve múltiplos indeferimentos, a posição do escritório sobre o art. 8º (garantia mínima, não barreira) foi utilizada quando pertinente, (d) se houve indeferimento de prorrogação com trava de 180 dias, a impugnação dessa trava foi incluída quando cabível, (e) em MS, a autoridade coatora e a tese específica contra o ponto impugnado (trava, recusa de perícia, tabela CID, recusa de protocolo) estão corretas conforme o arquivo VIAS-IMPUGNACAO.md da skill
- **especificacao-provas** — Em réplicas, verificar se a seção de provas segue a técnica da skill especificacao-provas (pedidos de prova específicos e direcionados, vinculados a fatos concretos por ID) em vez de genéricos "protesta por todas as provas em direito admitidas". Em réplicas, verificar adicionalmente se a peça segue a estrutura de delimitação de controvertidos/incontroversos (seção 1) antes de responder à contestação (seção 2)

A skill aciona apenas as verificações pertinentes ao tipo de peça. Uma petição inicial no JEF não aciona a skill de admissibilidade do CRPS. Um recurso especial ao CRPS não aciona a skill de tutela de urgência.

### Camada 3 — Coerência Fática

Cruza o conteúdo da petição com os documentos anexados na conversa e o CNIS, quando disponível. Verifica se cada afirmação fática da petição encontra suporte documental, se há contradições entre o que a petição afirma e o que os documentos registram, se datas, vínculos, valores e períodos estão consistentes, e se há documentos relevantes que foram ignorados pela petição.

**Validação rigorosa da classificação de fatos incontroversos.** Quando a petição contiver tabela de fatos incontroversos (Componente 3 — undisputedFactsTable), verificar se cada fato classificado como "incontroverso" atende ao critério técnico processual. Incontroverso é exclusivamente o fato que a parte contrária não impugnou ou que decorre de documento objetivo irrefutável (CNIS, certidão oficial). Se o INSS negou expressamente o fato na decisão administrativa, na contestação ou em manifestação processual, aquele fato NÃO é incontroverso, e classificá-lo como tal configura imprecisão técnica grave. Flagear como CRÍTICO qualquer fato classificado como "incontroverso" na tabela que tenha sido expressamente negado pelo INSS na decisão administrativa ou contestação disponível no contexto. A correção é reclassificar o fato para "controvertido" (vermelho) e indicar o fundamento da impugnação pelo INSS. Incontroverso não é sinônimo de evidente, claro, público e notório ou "óbvio para o advogado". Confundir essas categorias compromete a credibilidade da peça e, em última análise, pode ser interpretado como falta de lealdade processual.

Esta camada depende da existência de documentos no contexto da conversa. Se nenhum documento foi anexado, a camada registra um achado de severidade IMPORTANTE alertando que a revisão fática ficou prejudicada por ausência de documentos de referência.

### Camada 4 — Qualidade Argumentativa

Avalia a força persuasiva e a técnica da argumentação. Os critérios de reprovação são os seguintes.

- **Fundamentação principiológica sem ancoragem fática** — Invocar dignidade da pessoa humana, princípio da proteção ou in dubio pro misero sem conectar ao fato concreto do caso
- **Pedidos sem correspondência com os fatos narrados** — Pedido de benefício ou providência que não decorre logicamente da narrativa fática ou da fundamentação jurídica apresentada
- **Argumentação repetitiva** — Mesmo fundamento jurídico ou fático apresentado mais de uma vez com palavras diferentes, inflando a peça sem agregar valor argumentativo
- **Ausência de confronto direto entre prova documental e tese** — A petição sustenta uma tese mas não aponta especificamente qual documento (por ID) a comprova, ou a tese é apresentada em abstrato sem vincular à prova
- **Argumentação genérica detectada (Regra Tipografia Jurídica)** — Flagear como IMPORTANTE qualquer frase que contenha superlativos ou adjetivos sem elemento verificável (data, valor, número de documento, referência a laudo). Anti-patterns a detectar incluem "extrema necessidade", "gravidade ímpar", "profundo abalo", "severas dificuldades", "situação desesperadora", "honra abalada", "estado gravíssimo" e variações. A correção é substituir pelo fato concreto e mensurável com referência ao documento comprobatório
- **Excesso de jurisprudência (Regra do limite de uma página)** — Flagear como MENOR quando a seção de jurisprudência ocupar mais de uma página da petição. A técnica correta é transcrever apenas o precedente-chave e listar os demais sem transcrição de ementa. Se houver dois ou mais precedentes transcritos por extenso com ementas completas, flagear como IMPORTANTE
- **Urgência sinalizada por formatação em vez de fato (Regra do "mostre, não diga")** — Flagear como IMPORTANTE qualquer uso de "URGENTE" em caixa alta, cor diferente, sublinhado ou destaque visual na peça processual. A urgência deve ser demonstrada factualmente, não sinalizada por formatação. Nos sistemas eletrônicos, cores e destaques não aceleram a análise. O printscreen de impacto deve mostrar o documento que prova o prejuízo, não servir de adorno
- **Títulos burocráticos genéricos** — Flagear como MENOR quando os títulos das seções forem genéricos como "DO DIREITO" ou "DA INCAPACIDADE" sem antecipação persuasiva do argumento. A correção é reformular o título para antecipar a conclusão (ex. "DA INCAPACIDADE TOTAL E PERMANENTE COMPROVADA DESDE MARÇO DE 2024")
- **Réplica com estrutura de "contestação da contestação"** — Flagear como IMPORTANTE quando a réplica responder ponto a ponto a cada linha da contestação em vez de seguir a estrutura de delimitação de pontos controvertidos/incontroversos + réplica compartimentalizada. Verificar se a réplica contém tabela de delimitação de fatos
- **Memorial com mais de duas páginas** — Flagear como CRÍTICO quando o memorial extraprocessual exceder duas páginas. A regra é que memoriais longos não serão lidos. A correção é aplicar o framework EVO (Essencial, Visual, Organizado) e condensar para no máximo duas páginas
- **Excesso de destaques por página (Regra Von Restorff)** — Flagear como MENOR quando uma página da petição contiver mais de 3 trechos em negrito fora de títulos e citações. Quem destaca tudo não destaca nada. O contraste entre texto regular e texto enfatizado é o que gera hierarquia visual. Quando tudo é negrito, o efeito é neutralizado e o julgador perde a orientação sobre o que é relevante. A faixa ideal é entre 2 e 3 negritos por página (excluindo títulos de seção e nomes próprios em caixa alta por regra do escritório). Abaixo de 2 por página, sugerir que elementos-chave estão subaproveitados. A correção é manter negrito apenas para fatos-chave, elementos de prova e argumentos centrais, removendo ênfase de conectivos, artigos de lei e expressões rotineiras. NUNCA usar caixa alta, sublinhado ou marca-texto como destaque no corpo do texto. Negrito pontual vinculado a prova é a única forma de ênfase admitida
- **Latim desnecessário (Regra da Clareza)** — Flagear como MENOR o uso de expressões latinas que não estejam consolidadas na legislação processual ou na prática forense corrente. Termos proibidos incluem "ad argumentandum tantum", "ab initio", "quantum debeatur", "data maxima venia", "permissa venia", "ex positis", "in casu" e variações pedantes sem função técnica. Termos permitidos são aqueles com uso técnico consolidado, como "periculum in mora", "fumus boni iuris", "per capita", "in dubio pro misero" (quando vinculado a fundamento concreto), "habeas corpus", "mandamus" e similares previstos em lei ou em uso corrente nos tribunais. A correção é substituir o latim pelo equivalente em português. "Ad argumentandum tantum" vira "ainda que assim não se entenda" ou construção equivalente. "Data venia" é eliminado sem substituição
- **Teste do leigo aplicado à parte fática** — Flagear como IMPORTANTE quando a seção de fatos ("DOS FATOS") contiver parágrafos com linguagem excessivamente técnica, referências normativas densas ou construções que exijam formação jurídica para compreensão da narrativa fática. A parte fática deve ser compreensível por qualquer pessoa. O direito é técnico, mas a maior parte de uma petição é fática, e fatos devem ser compreendidos por qualquer pessoa. O teste conceitual é imaginar um leigo lendo a seção de fatos em voz alta e perguntando "do que se trata o caso e o que está sendo pedido?". Se a resposta não for imediata e clara, a seção precisa ser reescrita. Não se aplica às seções "DO DIREITO" ou "DOS EFEITOS FINANCEIROS", que são naturalmente técnicas. A correção é reescrever os parágrafos fáticos em linguagem direta, com frases curtas, cronologia clara e referência a documentos por ID

## Classificação de Severidade

Cada achado recebe uma das três classificações abaixo.

**CRÍTICO** — Compromete a validade ou o resultado da peça se não for corrigido. Exemplos que se enquadram nesta categoria são erro de competência territorial ou material, precedente inexistente ou com tese incorreta, violação da política de tutela de urgência, ausência de verificação do Tema 1124 quando aplicável, autoridade coatora errada em mandado de segurança, contradição frontal entre afirmação da petição e documento anexado, e pedido incompatível com o rito processual.

**IMPORTANTE** — Enfraquece a peça ou gera risco processual, mas não a invalida. Exemplos são tema repetitivo aplicável não citado, documento relevante não referenciado por ID, prazo decadencial próximo do esgotamento sem alerta na peça, ausência de confronto entre prova e tese, e fundamentação principiológica sem ancoragem fática.

**MENOR** — Questão de estilo ou forma que não afeta o resultado, mas compromete o padrão do escritório. Exemplos são uso de dois pontos fora de citação literal, desvio de formatação (fonte, espaçamento, recuo), referência genérica a "documentos em anexo" ao invés de ID, e argumentação repetitiva sem agregar valor.

## Formato do Relatório

O relatório é entregue no corpo da conversa, logo após a apresentação do .docx. A estrutura do relatório segue o modelo abaixo.

**Título do relatório** — "REVISÃO AUTOMÁTICA DA PETIÇÃO"

**Resumo executivo** — Duas a três frases indicando o resultado geral. Quantos achados por nível de severidade. Se não houver achados críticos, indicar expressamente.

**Achados por camada** — Cada camada é apresentada na ordem (Formal → Normativa → Fática → Argumentativa). Dentro de cada camada, os achados são ordenados por severidade decrescente (Crítico → Importante → Menor). Cada achado indica a severidade entre colchetes, descreve o problema de forma concisa e aponta a localização na petição (seção, parágrafo ou trecho específico).

**Modelo de achado individual**

Cada achado usa negrito para destacar a severidade entre colchetes, a localização na petição e o termo central do problema. O negrito do relatório é independente da Regra Von Restorff, que governa apenas o negrito da petição. No relatório, o destaque serve à leitura rápida do advogado.

```
[CRÍTICO] Competência territorial incorreta. A petição dirige a peça à Subseção de Catanduva, mas o domicílio do autor indicado na qualificação é Ribeirão Preto, que pertence à Subseção de Ribeirão Preto.

[IMPORTANTE] Tema 1.124/STJ não verificado. A petição é de concessão de aposentadoria especial e não há menção ao prévio requerimento administrativo nem análise dos efeitos financeiros conforme o Tema 1.124.

[MENOR] Dois pontos em trecho não citacional. Na seção "2. DO DIREITO", terceiro parágrafo, há uso de dois pontos para introduzir explicação.
```

**Quando não houver achados** — Registrar "Nenhum achado identificado. A petição está em conformidade com os padrões do escritório e com a legislação aplicável." Não é necessário perguntar sobre correção automática neste caso.

## Fluxo Pós-Revisão

Se houver achados de qualquer severidade, perguntar ao usuário da seguinte forma.

"Foram identificados [N] achados ([X] críticos, [Y] importantes, [Z] menores). Deseja que eu gere uma versão corrigida automaticamente?"

Aguardar resposta do usuário. Se o usuário autorizar, gerar nova versão do .docx aplicando todas as correções e apresentar o arquivo corrigido. Se o usuário recusar ou quiser corrigir apenas itens específicos, aguardar instruções.

## Regras de Integração com Outras Skills

A revisão não substitui a análise individual de cada skill. A revisão funciona como verificação de que as skills foram corretamente aplicadas durante a geração da petição. Se a revisão identificar que uma skill relevante não foi consultada (por exemplo, precedentes aplicáveis não foram verificados), o achado deve indicar expressamente qual skill deveria ter sido acionada.

A revisão não realiza cálculos previdenciários. Se identificar valores ou cálculos na petição, verifica apenas a consistência com os dados do CNIS e dos documentos anexados, sem refazer o cálculo.

## Adaptação por Rito Processual

A profundidade da revisão se adapta ao rito.

- **JEF** — Revisão enxuta. Na camada de qualidade argumentativa, tolerar peças mais curtas e diretas. Flagrar excesso de fundamentação como achado MENOR.
- **Rito ordinário federal** — Revisão completa. Exigir esgotamento dos fundamentos normativos.
- **CRPS** — Revisão completa com verificações específicas de admissibilidade e particularidades do processo administrativo. O recuo segue o valor definido na skill peticao-previdenciaria, sem número fixo nesta skill.
- **Mandado de segurança** — Revisão completa com verificação obrigatória de autoridade coatora, competência e presença de pedido liminar.
- **Réplica** — Verificar se segue a estrutura de delimitação de pontos controvertidos/incontroversos (seção 1) + réplica compartimentalizada (seção 2) + reconsideração de tutela quando aplicável (seção 3) + pedidos de prova direcionados (seção 4). Flagrar como IMPORTANTE se a réplica responder ponto a ponto a cada argumento da contestação sem delimitação prévia. Verificar se a tabela de fatos contém as colunas "Fato alegado", "Impugnação pelo INSS" e "Situação processual".
- **Memorial** — Verificar limite de duas páginas (CRÍTICO se exceder). Verificar se segue framework EVO (Essencial, Visual, Organizado). Verificar se contém apenas os elementos essenciais: questão central, fundamento para reforma, provas e resultados, pedido final. Flagrar como IMPORTANTE se o memorial reproduzir a fundamentação da petição ou recurso em vez de sintetizar.
- **Petição administrativa de cumprimento de exigência (B31/B91/B94)** — Verificar se a petição mapeia cada inciso do art. 2º das Portarias 13 ou 15/2026 ao documento correspondente, se utiliza a distinção "documentação médica" vs "documento médico", e se a conclusão requer expressamente o prosseguimento da análise (B31/B91) ou o agendamento de perícia presencial (B94). Consultar seções 14 e 15 da skill analise-documental-incapacidade.

## Referências

Antes de iniciar qualquer revisão, ler o checklist detalhado em `references/CHECKLIST.md`.
