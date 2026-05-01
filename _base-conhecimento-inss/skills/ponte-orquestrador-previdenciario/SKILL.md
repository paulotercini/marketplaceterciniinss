---
name: ponte-orquestrador-previdenciario
description: "Orquestrador pró-segurado que mapeia caso concreto em pipeline de skills (base-* + escritório) e devolve sequência executável. Use SEMPRE que mencionar pipeline previdenciário, roteiro de skills, orquestrar skills, ordem de execução, qual skill chamar primeiro, sequência base e escritório, integração base-conhecimento-inss, pipeline pró-segurado, fluxo de caso, plano de skills, mapa de skills do caso, qual o caminho, por onde começo, pipeline aposentadoria especial, pipeline incapacidade, pipeline BPC, pipeline pensão, pipeline revisão, pipeline CRPS, pipeline JEF, pipeline mandado de segurança, pipeline cumprimento de sentença. Hub orquestrador, complementar a triagem-caso-novo. Cruza com peticao-previdenciaria e revisao-peticao. NÃO use para análise normativa isolada (use as skills base-*) nem para auditoria documental específica (use auditoria-ppp, auditoria-laudo-pericial)."
---

# Orquestrador Previdenciário Pró-Segurado

## 1. Quando acionar

Acionar SEMPRE que o usuário pedir o roteiro de execução, o passo a passo do caso, a ordem das skills ou perguntar por onde começar. Acionar também quando uma skill-ponte (`ponte-workflow-*`) for invocada e precisar do pipeline detalhado.

## 2. Lógica de orquestração

A skill `triagem-caso-novo` decide qual benefício e qual estratégia processual. Esta skill assume que a triagem já foi feita ou faz triagem mínima e devolve a sequência exata de skills a acionar, em ordem cronológica de execução.

Cada pipeline cobre cinco fases. Fase 1, ingestão e auditoria documental. Fase 2, fundamentação normativa via skills base-*. Fase 3, definição de rito e competência. Fase 4, redação da peça. Fase 5, revisão automática.

## 3. Pipelines padrão por benefício

### 3.1 Aposentadoria especial

Fase 1. `auditoria-ppp` para o documento concreto, `cnis-acerto-indicadores` para os vínculos.
Fase 2. `base-especial-*` correspondente ao agente nocivo (ruído, EPI, químicos, biológicos, calor, frio, radiação, vibração, eletricidade, periculosidade motociclista, penosidade enfermagem, categoria pré-1995). Acionar também `base-especial-ppp-mudanca-layout-historico` quando o PPP atravessar mudanças de layout.
Fase 3. `base-aposentadoria-especial-transicao-ec103` ou `base-aposentadoria-direito-adquirido` para enquadramento temporal. `tempo-especial-peticoes-por-rito` para definição de rito.
Fase 4. `peticao-previdenciaria` para a peça final. Quando houver vícios sanáveis, `retificacao-ppp` antes do peticionamento. Em caso de demora administrativa, `mandado-seguranca-previdenciario`.
Fase 5. `revisao-peticao` automaticamente após a redação.

Skill-ponte dedicada. `ponte-workflow-aposentadoria-especial`.

### 3.2 Pensão por morte

Fase 1. `cnis-acerto-indicadores` para qualidade de segurado do falecido.
Fase 2. `base-pensao-por-morte-pos-reforma` e `base-pensao-por-morte-uniao-estavel-prova` quando houver companheiro. Acionar `documentos-comprobatorios-in128` para mapa de provas.
Fase 3. `base-jef-previdenciario` ou `base-rito-ordinario-trf` conforme alçada.
Fase 4. `pensao-por-morte` para teses específicas, `peticao-previdenciaria` para a peça.
Fase 5. `revisao-peticao`.

Skill-ponte dedicada. `ponte-workflow-pensao-por-morte`.

### 3.3 Benefícios por incapacidade (B31, B91, B92, B94)

Fase 1. `auditoria-laudo-pericial` quando houver laudo, `analise-documental-incapacidade` para análise documental, `cnis-acerto-indicadores` para qualidade de segurado.
Fase 2. `base-incapacidade-b31-temporaria`, `base-incapacidade-b91-permanente`, `base-incapacidade-acidentaria-b92`, `base-auxilio-acidente-b94-pos-reforma` ou `base-b94-*` específicas. `base-pericia-medica-federal-telepericia` quando houver Teleperícia.
Fase 3. `ntep-nexo-acidentario` quando houver nexo acidentário. `base-jef-previdenciario` para alçada do JEF.
Fase 4. `peticao-previdenciaria`. Em caso de cessação indevida, `mandado-seguranca-previdenciario`.
Fase 5. `revisao-peticao`.

### 3.4 BPC/LOAS e aposentadoria PCD

Fase 1. `analise-bpc-loas` para BPC, `aposentadoria-deficiencia` para LC 142/2013. `bpc-renda-grupo-familiar` para composição familiar. `formacao-documentacao-did-pcd` para fixação retroativa de DID.
Fase 2. `base-bpc-loas-requisitos`, `base-bpc-impedimento-longo-prazo`, `base-bpc-renda-per-capita-miserabilidade`, `base-aposentadoria-pcd-lc142`, `base-pcd-*` específicas (IF-BrA, fibromialgia, deficiência auditiva/visual).
Fase 3. `orientacao-cliente-pericia` antes de qualquer perícia agendada.
Fase 4. `peticao-previdenciaria`.
Fase 5. `revisao-peticao`.

### 3.5 Revisões estruturantes

Fase 1. `decadencia-revisao-previdenciaria` SEMPRE em primeiro lugar para verificar prazo decadencial. `cnis-acerto-indicadores` para divergências de cálculo.
Fase 2. `base-revisao-vida-toda-rvt`, `base-revisao-teto-buraco-negro-verde`, `base-revisao-irsm-fevereiro-1994`, `base-revisao-art29-melhor-beneficio`, `base-revisao-reajuste-ortn-otn`, `base-revisao-atividades-concomitantes-tema1070`. `base-calculo-rmi-ec103` para revisão de RMI.
Fase 3. `tema-1124-instrucao-administrativa` para verificar prévio pedido administrativo.
Fase 4. `peticao-previdenciaria`. Em cumprimento deficiente, `impugnacao-cumprimento-concomitantes`.
Fase 5. `revisao-peticao`.

### 3.6 Recursos administrativos no CRPS

Fase 1. `admissibilidade-barreiras-crps` para tempestividade e barreiras.
Fase 2. Skill base-* do mérito específico. `base-crps-panorama-geral` para visão geral.
Fase 3. `incidentes-instrucao-crps` para embargos, agravo, sustentação oral. `recursos-superiores-crps` para recurso especial e PUJ.
Fase 4. `peticao-previdenciaria` no padrão CRPS.
Fase 5. `revisao-peticao`.

Skill-ponte dedicada. `ponte-workflow-crps`.

### 3.7 Mandado de segurança

Fase 1. `ms-competencia-autoridade-coatora` para definir competência.
Fase 2. `base-ms-cabimento-direito-liquido-certo`, `base-ms-decadencia-omissao-demora`, `base-ms-liminar-art7-iii`. Skill base-* do mérito.
Fase 3. `mandado-seguranca-previdenciario` para técnica processual.
Fase 4. `peticao-previdenciaria`.
Fase 5. `revisao-peticao`.

### 3.8 Cumprimento de sentença

Fase 1. `cnis-acerto-indicadores` para cotejo do CNIS com a planilha do INSS.
Fase 2. `base-cumprimento-sentenca-rpv-precatorio`, `base-juros-correcao-monetaria`, `base-cpc-honorarios-sucumbencia-previdenciaria`. `base-revisao-atividades-concomitantes-tema1070` quando o cumprimento for de revisão pelo Tema 1.070.
Fase 3. `execucao-cumprimento-previdenciario` para técnica processual. `tributacao-beneficios-previdenciarios` para IR sobre atrasados. `honorarios-contrato-previdenciario` para destaque.
Fase 4. `peticao-previdenciaria`. Em descumprimento, `impugnacao-cumprimento-concomitantes`.
Fase 5. `revisao-peticao`.

Skill-ponte dedicada. `ponte-workflow-cumprimento-sentenca`.

### 3.9 Reabilitação profissional

Fase 1. Diagnóstico documental do PRP em curso ou cessado.
Fase 2. `base-reabilitacao-profissional-portaria-1310-1333` para regime atual. `base-reabilitacao-profissional` para visão geral.
Fase 3. `mandado-seguranca-previdenciario` quando houver cessação prematura ou suspensão indevida.
Fase 4. `peticao-previdenciaria` ou peça administrativa via `requerimento-administrativo-inss`.
Fase 5. `revisao-peticao`.

Skill-ponte dedicada. `ponte-workflow-reabilitacao-profissional`.

## 4. Verificações automáticas obrigatórias

Antes de fechar o pipeline, verificar.

Tema 1124/STJ via `tema-1124-instrucao-administrativa` em qualquer concessão ou revisão.
Decadência via `decadencia-revisao-previdenciaria` em qualquer revisão de benefício concedido.
Competência territorial e material via `ms-competencia-autoridade-coatora` em mandado de segurança.
Tempestividade recursal via `admissibilidade-barreiras-crps` em qualquer recurso ao CRPS.
Período de graça e qualidade de segurado via `periodo-graca-qualidade-segurado` em qualquer benefício.
Reafirmação da DER via `reafirmacao-der` em qualquer concessão com dúvida sobre melhor DIB.

## 5. Saída esperada

A saída desta skill deve ser uma listagem numerada de skills a executar, na ordem correta, com indicação clara de qual skill base-* fundamenta normativamente cada fase e qual skill do escritório executa operacionalmente cada fase.

Exemplo. Caso de aposentadoria especial por ruído com PPP do cliente.

Pipeline. (1) `auditoria-ppp` no documento. (2) `base-especial-ruido` para fundamento. (3) `defesa-probatoria-especial` para EPI e standard probatório. (4) `tempo-especial-peticoes-por-rito` para rito. (5) `peticao-previdenciaria` para peça. (6) `revisao-peticao` para auditoria final.

## 6. Postura

Postura exclusivamente pró-segurado. Toda a orquestração deve identificar fragilidades da posição adversária e converter conhecimento normativo em vantagem processual concreta para o segurado.
