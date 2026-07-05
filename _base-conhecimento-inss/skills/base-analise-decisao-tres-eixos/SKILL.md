---
name: base-analise-decisao-tres-eixos
description: "Roteiro obrigatório de análise de toda decisão previdenciária em três eixos, orquestrador pró-segurado que dispara ao receber decisão. Use SEMPRE que receber ou mencionar sentença, acórdão, decisão administrativa, decisão do CRPS, decisão do INSS, indeferimento, decisão interlocutória, analisar decisão, o que fazer com a decisão, triagem de decisão, cabe recurso, cabe embargos, qual peça cabe, próximo passo após decisão. Conduz na ordem o eixo 1 de preliminares e prejudiciais (nulidade, cerceamento de defesa, prescrição, decadência, erro material), o eixo 2 de vícios de integração (omissão, obscuridade, contradição interna), e o eixo 3 de mérito. Encaminha para a skill correta em cada eixo. Cruza com base-cpc-embargos-declaracao, base-cpc-nulidades-cerceamento, base-cpc-fundamentacao-art489, decadencia-revisao-previdenciaria, base-recurso-crps-peca-enxuta, base-recursos-jef, base-rito-ordinario-trf, peticao-previdenciaria e revisao-peticao. NÃO use para redigir a peça final, apenas para triar a decisão."
---

# Análise de Decisão em Três Eixos

## Escopo

Skill orquestradora pró-segurado. Toda decisão recebida, sentença, acórdão, decisão do CRPS ou decisão administrativa do INSS, passa por este roteiro antes de qualquer peça. O roteiro impõe três eixos, na ordem, e encaminha para a skill certa em cada frente.

## Regra de ativação

Recebida uma decisão, rodar os três eixos na sequência, do primeiro ao terceiro. Nenhum eixo é pulado. A ordem existe porque preliminar e prejudicial precedem o mérito, e porque os vícios de integração se resolvem por embargos antes do recurso, com interrupção de prazo e prequestionamento.

## Eixo 1. Preliminares e prejudiciais

Verificar, antes de tudo, defeitos que derrubam ou reduzem a decisão sem discutir o mérito.

Primeiro, nulidade. Decisão sem fundamentação idônea, art. 489, §1º, do CPC. Acionar `base-cpc-fundamentacao-art489`.

Segundo, cerceamento de defesa. Indeferimento de prova necessária, julgamento antecipado indevido, decisão surpresa, art. 5º, LV, da CF e arts. 9º, 10, 369 e 370 do CPC. Acionar `base-cpc-nulidades-cerceamento`.

Terceiro, prescrição e decadência. Decadência do art. 103 da Lei 8.213/91, Tema 313/STF, e prescrição quinquenal, Súmula 85/STJ. Acionar `decadencia-revisao-previdenciaria`. Aqui a prescrição e a decadência podem favorecer o segurado quando alegadas pelo INSS de forma indevida, ou precisam ser afastadas quando opostas contra ele.

Quarto, erro material. Equívoco evidente de escrita, cálculo, data ou número, corrigível de ofício ou por embargos.

Achado no eixo 1, escolher a via, embargos para erro material e nulidade por omissão de fundamentação, ou recurso próprio para nulidade e cerceamento que exijam reforma.

## Eixo 2. Vícios de integração

Verificar omissão, obscuridade e contradição INTERNA ao próprio julgado. Presente o vício, a via é embargos de declaração, com disciplina dura de 1 a 2 vícios e 1 a 2 páginas. Acionar `base-cpc-embargos-declaracao`.

Regra crítica, a contradição que cabe em embargos é só a interna. Contradição com a prova, com a jurisprudência ou com a tese da parte é externa e vai para o recurso do eixo 3.

## Eixo 3. Mérito

Verificar o acerto do julgado quanto ao direito material. Discordância do resultado se combate com o recurso próprio da sede.

Primeiro, CRPS. Recurso ordinário à Junta ou recurso especial à Câmara. Acionar `base-recurso-crps-peca-enxuta` e `base-crps-panorama-geral`.

Segundo, JEF. Recurso inominado à Turma Recursal, depois PUIL. Acionar `base-recursos-jef`.

Terceiro, rito ordinário. Apelação ao TRF. Acionar `base-rito-ordinario-trf`.

Para a fundamentação do mérito, acionar `precedentes-previdenciarios` e o eixo probatório em `base-cpc-onus-prova-art373`.

## Sequência de decisão

Primeiro, existe vício do eixo 1 que anule ou reduza a decisão? Tratar.

Segundo, existe vício do eixo 2 que exija embargos? Opor embargos enxutos antes do recurso, para interromper prazo e prequestionar.

Terceiro, resta discordância de mérito? Interpor o recurso próprio dentro do prazo.

Uma decisão pode acionar mais de um eixo. Embargos e recurso não se confundem nem se substituem.

## Prazos, atenção

Primeiro, embargos, 5 dias no CRPS e no CPC.

Segundo, recurso ordinário no CRPS, 30 dias.

Terceiro, recurso inominado no JEF, 10 dias.

Quarto, apelação no rito ordinário, 15 dias úteis.

Embargos tempestivos interrompem o prazo do recurso seguinte.

## Integração com outras skills

Este roteiro é o ponto de entrada. Em cada eixo aciona a skill temática. Para redigir a peça escolhida, acionar `peticao-previdenciaria`. Para auditar a peça, acionar `revisao-peticao`.

## O que NÃO está nesta skill

A redação da peça final está nas skills de cada via. A disciplina de embargos está em `base-cpc-embargos-declaracao`. O mérito de cada benefício está nas skills temáticas correspondentes.
