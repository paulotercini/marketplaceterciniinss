---
name: ponte-workflow-recurso-sentenca
description: "Workflow pró-segurado para atacar decisão contrária ao segurado, do diagnóstico à arquitetura do recurso por rito, costurando embargos, preliminares, mérito e precedentes conferidos até a peça. Use SEMPRE que mencionar workflow recurso, arquitetura da apelação, arquitetura do recurso, atacar sentença, destruir a fundamentação do juiz, recurso inominado, apelação, recurso ordinário ao CRPS, embargos de declaração, estrutura de tópicos de mérito, tom de inconformismo técnico, próximo passo após sentença contrária. Encadeia base-analise-decisao-tres-eixos, os eixos do CPC e a redação da peça. Cruza com base-analise-decisao-tres-eixos, base-cpc-embargos-declaracao, base-cpc-fundamentacao-art489, base-cpc-apelacao-efeitos-art1013, base-cpc-teoria-capitulos-sentenca, base-recursos-jef, base-rito-ordinario-trf, base-precedentes-catalogo-vinculantes, peticao-previdenciaria e revisao-peticao. NÃO use para contestação (use ponte-workflow-replica-contestacao) nem para mandado de segurança."
---

# Workflow Recurso contra Decisão

## 1. Quando acionar

Sempre que houver decisão contrária ao segurado a ser atacada, sentença, acórdão, decisão do CRPS ou decisão interlocutória gravosa. Pressupõe o mapa de ataque já produzido pela `base-analise-decisao-tres-eixos`. Se ainda não houver diagnóstico, rodar antes a `base-analise-decisao-tres-eixos`.

## 2. Pipeline executável

### Passo 1. Importar o mapa de ataque

Trazer da `base-analise-decisao-tres-eixos` os achados dos cinco passos da Fase 0, omissões, confronto fático-probatório, nulidades, ratio e contra-precedente. Confirmar a via de cada achado, embargos ou recurso, e o eixo correspondente.

### Passo 2. Definir rito e prazo

Identificar a sede. CRPS, recurso ordinário 30 dias ou recurso especial. JEF, recurso inominado 10 dias, depois PUIL e TNU. Rito ordinário, apelação 15 dias úteis. Registrar a data de ciência e o prazo fatal. Acionar `base-recurso-crps-peca-enxuta`, `base-recursos-jef` ou `base-rito-ordinario-trf` conforme a sede.

### Passo 3. Embargos antes do recurso

Quando houver omissão, obscuridade ou contradição interna, opor embargos de declaração enxutos, 1 a 2 vícios e 1 a 2 páginas, para interromper prazo e prequestionar. Acionar `base-cpc-embargos-declaracao`. Não confundir contradição interna com contradição externa, que vai para o recurso.

### Passo 4. Preliminares e prejudiciais do recurso

Montar o eixo 1. Nulidade por fundamentação inidônea, art. 489, §1º, acionar `base-cpc-fundamentacao-art489`. Cerceamento de defesa, acionar `base-cpc-nulidades-cerceamento`. Prescrição e decadência indevidas, acionar `decadencia-revisao-previdenciaria`. Em apelação, avaliar causa madura, art. 1.013, §3º, para julgamento direto do mérito, acionar `base-cpc-apelacao-efeitos-art1013`.

### Passo 5. Mérito, confronto fático-probatório

Transformar o Passo 2 da auditoria em tópicos de erro de julgamento. Cada tópico confronta a justificativa da decisão com a prova por ID e demonstra o erro de valoração ou o fato presumido contra o documento. Acionar `base-cpc-onus-prova-art373` e a skill base-* do benefício.

### Passo 6. Engenharia de precedentes

Para cada fundamento determinante da decisão, opor o precedente vinculante que o contraria, na ordem STF, STJ, TNU, Enunciado do CRPS e Súmula da TRU3. Acionar `base-precedentes-catalogo-vinculantes` e `precedentes-previdenciarios`. Conferir cada tese na fonte. Só entra citação [CONFERIDO].

### Passo 7. Recurso parcial e capítulos

Quando a decisão tiver capítulos autônomos, atacar só o capítulo gravoso e executar desde logo o incontroverso. Acionar `base-cpc-teoria-capitulos-sentenca`. Cuidar da vedação à reformatio in pejus quando o recurso for exclusivo do segurado.

### Passo 8. Arquitetura da peça

Montar a estrutura de tópicos na ordem, preliminares de nulidade, prejudiciais, mérito por erro de fato e por erro de direito, precedentes conferidos, pedido de reforma e, se cabível, causa madura. Tom de inconformismo técnico e firme, ancorado em prova por ID e norma, sem adjetivo inflado. Incluir o parágrafo de realidade quando a peça for de pessoa física, acionar `base-peticao-paragrafo-de-realidade`.

### Passo 9. Redação e revisão

Acionar `peticao-previdenciaria` para a peça e `base-peticao-previdenciaria-padrao-visual` para o padrão visual. Acionar `revisao-peticao` e `base-revisao-peticao-aprofundada` para a auditoria pós-redação, com atenção à dialeticidade, cada tópico do recurso deve enfrentar um fundamento específico da decisão.

## 3. Documentos essenciais

Decisão recorrida. Comprovante de ciência e cálculo do prazo. Peças e documentos dos autos citados por ID no mapa de ataque. Acórdão paradigma quando o recurso for especial ou de uniformização.

## 4. Pontos críticos pró-segurado

Prazo é a primeira barreira. Embargos tempestivos interrompem o prazo do recurso seguinte.

Dialeticidade. Recurso que não enfrenta a fundamentação específica da decisão não é conhecido. Cada tópico ataca um fundamento nominado.

Prequestionamento. Sem a matéria enfrentada na origem não sobe recurso à instância superior. Usar embargos com fim de prequestionamento, art. 1.025 do CPC.

Precedente inventado destrói a credibilidade da peça. Só citar [CONFERIDO], com conferência na fonte.

## 5. Postura

Pró-segurado integral. O recurso é a segunda chance real. Achar os buracos da decisão, omissão, erro de valoração e contrariedade a precedente, e converter cada buraco em tópico com prova por ID e norma. Não repetir a inicial.

## Hub de portarias administrativas

Hub das Portarias DPMF/DIRBEN/INSS aplicáveis. Acionar `base-portarias-dpmf-inss-hub` quando o recurso for administrativo ao CRPS e o caso envolver procedimento, cálculo ou ratificações regidos por portaria.
