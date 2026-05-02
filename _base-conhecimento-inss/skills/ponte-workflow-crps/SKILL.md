---
name: ponte-workflow-crps
description: "Workflow pró-segurado de recurso ao CRPS (Junta de Recursos e Câmara de Julgamento), costurando admissibilidade, instrução, mérito vinculante e produção da peça recursal no padrão CRPS. Use SEMPRE que mencionar workflow CRPS, pipeline CRPS, recurso ordinário CRPS, recurso especial CRPS, JR Junta de Recursos, CAJ Câmara de Julgamento, embargos CRPS, agravo CRPS, sustentação oral Fala.BR, PUJ Conselho Pleno, art. 89 art. 90 art. 91, Portaria 462/2026 admissibilidade. Cruza com admissibilidade-barreiras-crps, incidentes-instrucao-crps, recursos-superiores-crps, peticao-previdenciaria. NÃO use para mandado de segurança, ação judicial originária ou recursos no JEF."
---

# Workflow CRPS

## 1. Quando acionar

Sempre que houver decisão administrativa do INSS recorrível ao CRPS. Inclui recurso ordinário (parte segurada contra decisão do servidor, parte INSS contra decisão da APS), recurso especial às Câmaras de Julgamento, embargos, revisão de acórdão, agravo, PUJ ao Conselho Pleno e Reclamação.

## 2. Pipeline executável

### Passo 1. Triagem do ato recorrido

Identificar o ato. Indeferimento administrativo, cessação, revisão de ofício, decisão da JR (para recurso especial), acórdão da CAJ (para PUJ).

Localizar protocolo, data de ciência, prazo recursal.

### Passo 2. Admissibilidade primeiro

Acionar `admissibilidade-barreiras-crps` antes de qualquer mérito. Verificar tempestividade, legitimidade, interesse recursal, perda de objeto, renúncia tácita art. 86, ação judicial simultânea (art. 87), tríplice identidade.

Quando houver risco de não conhecimento, planejar relevação de intempestividade ou fungibilidade entre recursos.

### Passo 3. Estratégia de competência

Recurso contra decisão de servidor da APS ou da CEAB vai para JR. Recurso contra acórdão de JR vai para CAJ por recurso especial limitado a divergência ou nulidade.

Acionar `base-crps-panorama-geral` para mapa do regimento.

### Passo 4. Fundamentação normativa do mérito

Acionar a skill base-* específica do benefício e do tema controvertido.

Aposentadoria especial. Skills `base-especial-*` correspondentes.
Incapacidade. Skills `base-incapacidade-*` ou `base-auxilio-acidente-b94-*`.
BPC. Skills `base-bpc-*`.
Pensão. Skills `base-pensao-*`.
Revisões. Skills `base-revisao-*`.
Aposentadorias. Skills `base-aposentadoria-*`, `base-calculo-rmi-ec103`.

### Passo 5. Precedentes vinculantes

Acionar `precedentes-previdenciarios` para identificar súmulas, temas repetitivos, repercussão geral e enunciados do CRPS aplicáveis. Indicar expressamente os pareceres vinculantes (art. 108 do RICRPS) quando houver.

Quando o tema envolver normas vinculantes do CRPS (art. 114 RICRPS), citar resolução ou enunciado.

### Passo 6. Incidentes processuais

Quando houver omissão, contradição ou obscuridade em acórdão da JR, planejar embargos pelo art. 92.

Quando houver vício insanável de procedimento, planejar revisão de acórdão pelo art. 93 ou agravo pelo art. 116.

Acionar `incidentes-instrucao-crps`.

### Passo 7. Sustentação oral e diligências

Quando relevante, requerer sustentação oral via Fala.BR. Avaliar pedido de diligência para juntada de documentos novos. Acionar `incidentes-instrucao-crps`.

### Passo 8. Recurso especial e PUJ

Quando o caso comportar recurso especial à CAJ, acionar `recursos-superiores-crps`. Identificar paradigma e divergência.

Quando houver divergência entre Câmaras, planejar PUJ ao Conselho Pleno. Acionar `recursos-superiores-crps`.

### Passo 9. Verificações obrigatórias

Tema 1124/STJ via `tema-1124-instrucao-administrativa` para evitar recurso sobre matéria não levada à instrução administrativa.

Decadência de revisão via `decadencia-revisao-previdenciaria`.

Documentos comprobatórios via `documentos-comprobatorios-in128` para juntada complementar.

CNIS via `cnis-acerto-indicadores` para divergências cadastrais que sustentem o recurso.

### Passo 10. Redação da peça e revisão

Acionar `peticao-previdenciaria` no padrão CRPS (recuo 5cm, fonte Bookman Old Style 12pt, espaçamento 1,5, argumentação densa). Acionar `revisao-peticao`.

## 3. Documentos essenciais

Decisão recorrida (cópia). Comprovante de ciência. Procuração com poderes específicos para CRPS. CNIS atualizado. Documentação que fundamenta o pedido. Acórdão paradigma quando for recurso especial.

## 4. Pontos críticos pró-segurado

Tempestividade é a primeira barreira. Recurso intempestivo não conhecido pode ser superado por relevação fundamentada (art. 112 da Lei 8.213/91 e jurisprudência do CRPS).

Renúncia tácita por ação judicial simultânea pode ser evitada com desistência da ação ou esclarecimento da diversidade de causas de pedir.

Pareceres vinculantes do CRPS (art. 108) e enunciados (CRPS 1 a 18) podem ser favoráveis ou desfavoráveis. Mapear antes de recorrer.

Decisões monocráticas (art. 110) podem ser convertidas em colegiadas mediante agravo.

Diligência prévia ou em mesa pode reverter decisão. Acionar `incidentes-instrucao-crps` para planejar.

## 5. Postura

Pró-segurado integral. CRPS é a última via administrativa antes do Judiciário e merece esforço argumentativo denso. Esgotar fundamentação normativa, citar precedentes vinculantes do CRPS e dos tribunais superiores, usar incidentes processuais como ferramenta ofensiva e não recuar diante de não conhecimento mal fundamentado.

## Hub de portarias administrativas

Hub das Portarias DPMF/DIRBEN/INSS aplicáveis a este benefício. Acionar `base-portarias-dpmf-inss-hub` para identificar quais Portarias regem o procedimento administrativo, o cálculo, as ratificações e os recursos no caso concreto.
