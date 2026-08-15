---
name: base-analise-contestacao-inss
description: "Leitura forense da contestação do INSS para montar o mapa de ataque da réplica, ótica pró-segurado. Use SEMPRE que receber ou mencionar contestação do INSS, defesa da autarquia, contestação previdenciária, analisar contestação, auditar contestação, preliminares do INSS, falta de interesse de agir, ausência de prévio requerimento, impugnação específica, fato incontroverso, ônus da impugnação art. 341, mérito defensivo, réplica, próximo passo após contestação. Conduz cinco passos, preliminares, fatos incontroversos, mérito defensivo, impugnação à prova e mapa de ataque para a réplica. Cruza com base-cpc-onus-prova-art373, base-cpc-prova-documental-juntada, base-cpc-prescricao-decadencia-processual, tema-1124-instrucao-administrativa, coisa-julgada-previdenciaria, base-precedentes-catalogo-vinculantes, especificacao-provas, ponte-workflow-replica-contestacao, peticao-previdenciaria e revisao-peticao. NÃO use para decisão judicial (use base-analise-decisao-tres-eixos) nem para redigir a réplica final."
---

## NOTA DE COEXISTÊNCIA (unificação de linhas, Onda 67, 12/07/2026)

O plugin passou a conter duas famílias de skills sobre leitura de peças adversárias, vindas de linhas paralelas de trabalho unificadas na Onda 67. A família base-analise-contestacao-inss com ponte-workflow-replica-contestacao e ponte-workflow-recurso-sentenca, e a família base-auditoria-adversarial-contestacao-inss com base-auditoria-adversarial-decisao-judicial. Enquanto não houver racionalização definitiva pelo escritório, usar as duas de forma complementar e, em caso de conflito de orientação, prevalece a que tiver citação [CONFERIDO] em fonte primária. Não citar em peça nada que apenas uma delas afirme sem selo de conferência.


# Análise de Contestação do INSS

## Escopo

Skill pró-segurado de leitura forense da contestação do INSS. Toda contestação passa por auditoria adversária que separa o que virou incontroverso, o que é preliminar a repelir e o que é mérito defensivo a rebater ponto a ponto. O produto é o mapa de ataque da réplica, não a peça final.

## Regra de ativação

Recebida a contestação, rodar os cinco passos na ordem. A réplica não é automática. Ela é devida e estratégica quando o INSS arguiu preliminar (art. 351 do CPC), juntou documentos (art. 437, §1º) ou alegou fato impeditivo, modificativo ou extintivo (art. 350). Sem esses gatilhos, avaliar se a réplica agrega, para não reabrir o incontroverso.

## Passo 1. Preliminares a repelir

Mapear toda preliminar defensiva e preparar a repulsa de cada uma. As mais comuns do INSS.

Primeiro, falta de interesse de agir por ausência de prévio requerimento, Tema 350/STF e Tema 1124/STJ. Acionar `tema-1124-instrucao-administrativa` e `base-efeito-translativo-tema-1124-defesa`.

Segundo, prescrição e decadência, com exigência de contraditório prévio. Acionar `base-cpc-prescricao-decadencia-processual` e `decadencia-revisao-previdenciaria`.

Terceiro, coisa julgada e litispendência. Acionar `coisa-julgada-previdenciaria`.

Quarto, inépcia, ilegitimidade e incompetência, repelidas com a causa de pedir e os documentos da inicial.

## Passo 2. Fatos incontroversos

Aplicar o ônus da impugnação específica, art. 341 do CPC. Todo fato afirmado na inicial que a contestação não impugnou de forma específica presume-se verdadeiro. Listar cada fato admitido ou não enfrentado, ancorado no ID do documento que o prova. Esse rol vira o quadro de fatos incontroversos da peça e encolhe a controvérsia. Acionar `base-peticao-previdenciaria-padrao-visual` para o quadro.

## Passo 3. Mérito defensivo

Pegar cada tese de mérito do INSS, ausência de carência, perda da qualidade de segurado, EPI eficaz, ausência de nexo, ausência de incapacidade, tempo não comprovado, renda acima do critério, e cruzá-la com a prova dos autos por ID. Apontar onde a defesa contraria o documento ou parte de premissa falsa. Acionar a skill base-* do benefício e do tema, e `precedentes-previdenciarios` para o contraponto vinculante.

## Passo 4. Impugnação à prova e ônus

Onde o INSS impugna documento do segurado ou tenta deslocar o ônus para a parte hipossuficiente, opor o art. 373 e a distribuição dinâmica, lembrando que o INSS detém CNIS, PPP e dossiê. Acionar `base-cpc-onus-prova-art373`. Documento novo do INSS abre prazo de resposta, art. 437, §1º. Acionar `base-cpc-prova-documental-juntada`.

## Passo 5. Mapa de ataque para a réplica

Consolidar os achados. Para cada ponto, registrar a natureza (incontroverso, preliminar ou mérito), a via de resposta, o documento por ID e o precedente [CONFERIDO] que sustenta a réplica, e as provas a especificar. Esse mapa é a entrada da `ponte-workflow-replica-contestacao`.

## Disciplina antialucinação

Nenhum precedente entra na réplica sem conferência na fonte primária. Citação conferida entra como [CONFERIDO], não conferida entra como [NÃO CONFIRMADO] ou sai. Proibido inventar tese, súmula, enunciado, número de processo, data ou relator. Acionar `base-precedentes-catalogo-vinculantes` antes de citar.

## Postura

Pró-segurado integral. A réplica ataca a defesa adversária ponto a ponto, fixa o incontroverso a favor do segurado, repele as preliminares e desmonta o mérito defensivo com prova por ID e precedente conferido. Vedada a réplica genérica que apenas reitera a inicial.

## Integração com outras skills

A leitura produz o mapa de ataque. Para arquitetar a réplica, acionar `ponte-workflow-replica-contestacao`. Para especificar provas na sequência, acionar `especificacao-provas`. Para redigir, acionar `peticao-previdenciaria`. Para auditar, acionar `revisao-peticao`.

## O que NÃO está nesta skill

A leitura de decisão está em `base-analise-decisao-tres-eixos`. A redação da réplica está na `peticao-previdenciaria` e na `ponte-workflow-replica-contestacao`. O mérito de cada benefício está nas skills temáticas.
