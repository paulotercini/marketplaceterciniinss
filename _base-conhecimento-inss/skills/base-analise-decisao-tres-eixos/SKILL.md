---
name: base-analise-decisao-tres-eixos
description: "Roteiro obrigatório de análise de toda decisão previdenciária, com auditoria forense da decisão contra os autos antes da triagem em três eixos, orquestrador pró-segurado que dispara ao receber decisão. Use SEMPRE que receber ou mencionar sentença, acórdão, decisão administrativa, decisão do CRPS, decisão do INSS, indeferimento, analisar decisão, auditar decisão, mapa de omissões, confronto fático-probatório, erro de valoração da prova, ratio decidendi do juiz, contra-precedente, cerceamento, qual peça cabe, próximo passo após decisão. Conduz a Fase 0 de auditoria em cinco passos e os eixos 1 de preliminares e prejudiciais, 2 de vícios de integração e 3 de mérito. Cruza com base-cpc-embargos-declaracao, base-cpc-nulidades-cerceamento, base-cpc-fundamentacao-art489, decadencia-revisao-previdenciaria, base-precedentes-catalogo-vinculantes, ponte-workflow-recurso-sentenca, peticao-previdenciaria e revisao-peticao. NÃO use para redigir a peça final, apenas para triar e mapear o ataque à decisão."
---

# Análise de Decisão em Três Eixos

## Escopo

Skill orquestradora pró-segurado. Toda decisão recebida, sentença, acórdão, decisão do CRPS ou decisão administrativa do INSS, passa primeiro por uma auditoria forense contra os autos e depois pela triagem em três eixos. O produto é o mapa de ataque à decisão, não a peça final.

## Regra de ativação

Recebida uma decisão, rodar a Fase 0 de auditoria e, na sequência, os três eixos, do primeiro ao terceiro. Nenhum passo é pulado. A ordem existe porque preliminar e prejudicial precedem o mérito, e porque os vícios de integração se resolvem por embargos antes do recurso, com interrupção de prazo e prequestionamento.

## Fase 0. Auditoria forense da decisão contra os autos

Antes de decidir qual peça cabe, ler a decisão como revisor adversário e cruzar cada fundamento com o que está provado nos autos. Cinco passos.

### Passo 1. Mapa de omissões

Atuar como desembargador revisor. Listar toda tese, todo pedido e toda prova documental que a decisão deixou de enfrentar, cada item ancorado no ID da peça ou do documento nos autos. Omissão de fundamento relevante viola o art. 489, §1º, IV, do CPC e configura negativa de prestação jurisdicional. A omissão interna ao julgado vai para embargos, eixo 2. A recusa de análise que persiste alimenta o recurso de mérito, eixo 3. Acionar `base-cpc-fundamentacao-art489`.

### Passo 2. Confronto fático-probatório

Pegar cada justificativa que a decisão usou para negar o direito e cruzá-la com a prova dos autos por ID. Apontar onde houve erro de valoração da prova, fato presumido contra o que está documentado, ou inversão indevida do ônus. Esse é erro de julgamento sobre o fato e vai para o recurso de mérito, eixo 3. Acionar `base-cpc-onus-prova-art373`.

### Passo 3. Filtro de nulidade

Auditar a condução do processo descrita no relatório e no dispositivo. Verificar cerceamento de defesa, indeferimento de prova necessária, julgamento antecipado indevido, decisão surpresa e falta de intimação, art. 5º, LV, da CF e arts. 9º, 10, 369 e 370 do CPC. Presente o vício, a via é a preliminar de nulidade, eixo 1. Acionar `base-cpc-nulidades-cerceamento`.

### Passo 4. Ratio e contra-precedente

Isolar o fundamento determinante da decisão, a ratio decidendi, em uma frase. Em seguida, localizar o precedente vinculante que o contraria, na ordem STF, STJ, TNU, Enunciado do CRPS e Súmula da TRU3. Acionar `base-precedentes-catalogo-vinculantes` e conferir a tese na fonte antes de citar. Só entra na peça citação marcada [CONFERIDO]. Sem confirmação, marcar [NÃO CONFIRMADO] ou remover. Nunca inventar tese, número de tema ou relator.

### Passo 5. Mapa de ataque rito-consciente

Consolidar os achados em um mapa. Para cada achado, registrar o eixo, a via (embargos ou recurso), o dispositivo ou precedente que o sustenta e o rito do caso (CRPS, JEF ou ordinário). Esse mapa é a entrada da `ponte-workflow-recurso-sentenca`, que arquiteta o recurso.

## Eixo 1. Preliminares e prejudiciais

Verificar defeitos que derrubam ou reduzem a decisão sem discutir o mérito.

Primeiro, nulidade por fundamentação inidônea, art. 489, §1º, do CPC. Acionar `base-cpc-fundamentacao-art489`.

Segundo, cerceamento de defesa, art. 5º, LV, da CF e arts. 9º, 10, 369 e 370 do CPC. Acionar `base-cpc-nulidades-cerceamento`.

Terceiro, prescrição e decadência, decadência do art. 103 da Lei 8.213/91 e prescrição quinquenal, Súmula 85/STJ. Acionar `decadencia-revisao-previdenciaria`. A prescrição e a decadência favorecem o segurado quando o INSS as alega de forma indevida, e precisam ser afastadas quando opostas contra ele.

Quarto, erro material, equívoco evidente de escrita, cálculo, data ou número, corrigível de ofício ou por embargos.

## Eixo 2. Vícios de integração

Verificar omissão, obscuridade e contradição INTERNA ao próprio julgado. Presente o vício, a via é embargos de declaração, com disciplina dura de 1 a 2 vícios e 1 a 2 páginas. Acionar `base-cpc-embargos-declaracao`.

Regra crítica, a contradição que cabe em embargos é só a interna. Contradição com a prova, com a jurisprudência ou com a tese da parte é externa e vai para o recurso do eixo 3.

## Eixo 3. Mérito

Verificar o acerto do julgado quanto ao direito material e à valoração dos fatos. Discordância do resultado se combate com o recurso próprio da sede.

Primeiro, CRPS, recurso ordinário à Junta ou recurso especial à Câmara. Acionar `base-recurso-crps-peca-enxuta` e `base-crps-panorama-geral`.

Segundo, JEF, recurso inominado à Turma Recursal, depois PUIL. Acionar `base-recursos-jef`.

Terceiro, rito ordinário, apelação ao TRF, com atenção à causa madura do art. 1.013, §3º. Acionar `base-rito-ordinario-trf` e `base-cpc-apelacao-efeitos-art1013`.

Para a fundamentação, acionar `precedentes-previdenciarios` e o eixo probatório do Passo 2.

## Sequência de decisão

Primeiro, rodar a Fase 0 e montar o mapa de ataque.

Segundo, existe vício do eixo 1 que anule ou reduza a decisão? Tratar.

Terceiro, existe vício do eixo 2 que exija embargos? Opor embargos enxutos antes do recurso, para interromper prazo e prequestionar.

Quarto, resta discordância de mérito? Interpor o recurso próprio dentro do prazo.

Uma decisão pode acionar mais de um eixo. Embargos e recurso não se confundem nem se substituem.

## Prazos, atenção

Primeiro, embargos, 5 dias no CRPS e no CPC.

Segundo, recurso ordinário no CRPS, 30 dias.

Terceiro, recurso inominado no JEF, 10 dias.

Quarto, apelação no rito ordinário, 15 dias úteis.

Embargos tempestivos interrompem o prazo do recurso seguinte.

## Disciplina antialucinação

Nenhum precedente entra na peça sem conferência na fonte primária, na ordem da hierarquia. Citação conferida entra como [CONFERIDO]. Citação não conferida entra como [NÃO CONFIRMADO] ou sai. Proibido inventar tese, súmula, enunciado, número de processo, data ou relator. Acionar `base-precedentes-catalogo-vinculantes` antes de qualquer citação.

## Integração com outras skills

Este roteiro é o ponto de entrada. A Fase 0 produz o mapa de ataque. Para arquitetar o recurso por rito, acionar `ponte-workflow-recurso-sentenca`. Para redigir a peça escolhida, acionar `peticao-previdenciaria`. Para auditar a peça, acionar `revisao-peticao`.

## O que NÃO está nesta skill

A redação da peça final está nas skills de cada via e na `peticao-previdenciaria`. A arquitetura do recurso está na `ponte-workflow-recurso-sentenca`. A disciplina de embargos está em `base-cpc-embargos-declaracao`. O mérito de cada benefício está nas skills temáticas correspondentes.
