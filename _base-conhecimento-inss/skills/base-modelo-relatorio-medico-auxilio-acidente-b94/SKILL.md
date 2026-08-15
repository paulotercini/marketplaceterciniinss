---
name: base-modelo-relatorio-medico-auxilio-acidente-b94
description: "Modelo narrativo enxuto (1 folha) de relatório médico para auxílio-acidente B94, com sub-modelos por especialidade. Foco em SEQUELA consolidada e redução da capacidade laborativa. Use SEMPRE que mencionar modelo relatório médico B94, modelo laudo auxílio-acidente, modelo laudo sequela, modelo laudo consolidação lesões, relatório ortopedista B94, relatório psiquiatra B94, relatório reumatologista B94, relatório clínico geral B94, relatório oftalmologista B94, relatório cardiologista B94, sequela permanente, consolidação lesões, redução capacidade laborativa, Anexo III Decreto 3.048, Súmula 88 TNU, Súmula 89 TNU, Tema 416 STJ, nexo acidentário NTEP B94, carta médico B94, gerar relatório auxílio-acidente. Cruza com base-validacao-formal-laudo-medico-checklist-ab, base-auxilio-acidente-b94-pos-reforma, auxilio-acidente-b94, base-b94-anexo-iii-quadros, base-b94-sequela-minima-tema201, base-b94-nexo-acidentario-ntep, auditoria-laudo-pericial, ntep-nexo-acidentario, peticao-previdenciaria."
---

## NOTA DE AUDITORIA (11/07/2026, com errata da mesma data)

Conferencia em fonte oficial (CJF e STJ) sobre citacoes usadas nesta skill.

1. Sumulas 88 e 89 da TNU EXISTEM e estao VIGENTES (aprovadas na Sessao Ordinaria de 17/04/2024, DJeN 24/04/2024). Texto literal da Sumula 88/TNU. "A existencia de limitacao, ainda que leve, para o desempenho da atividade para o trabalho habitual enseja a concessao do beneficio de auxilio-acidente, em observancia a tese fixada sob o Tema 416 do Superior Tribunal de Justica." Texto literal da Sumula 89/TNU. "Nao ha direito a concessao de beneficio de auxilio-acidente quando, apos consolidacao das lesoes decorrentes de acidente de qualquer natureza, resultarem sequelas que nao reduzem a capacidade laborativa habitual nem sequer demandam dispendio de maior esforco na execucao da atividade habitual." Usar sempre estes textos, nao parafrasear.
2. Tema 201/TNU tem tese CONTRARIA ao contribuinte individual. "O contribuinte individual nao faz jus ao auxilio-acidente, diante de expressa exclusao legal." Nao usar como fundamento de sequela minima nem em favor da concessao. A tese de sequela minima e a Sumula 88/TNU c/c Tema 416/STJ.
3. Nao confundir com a Sumula 89/STJ ("A acao acidentaria prescinde do exaurimento da via administrativa"), valida no contexto acidentario estadual.

Quadro completo e errata em base-precedentes-catalogo-vinculantes/references/ATUALIZACAO-STATUS-2026-06.md.


# Modelo de Relatório Médico para Auxílio-Acidente (B94)

## 1. Quando acionar esta skill

Acione SEMPRE que houver necessidade de gerar modelo de relatório médico para encaminhar a médico assistente, com finalidade de instruir requerimento administrativo ou ação judicial de auxílio-acidente (B94, art. 86 da Lei 8.213/91).

A skill é fonte primária pró-segurado para produzir modelo narrativo enxuto (cabe em 1 folha) no estilo do escritório Paulo Roberto Tercini Filho, focado em SEQUELA consolidada e redução da capacidade laborativa.

## 2. Distinção fundamental do B94

O auxílio-acidente NÃO É benefício por incapacidade. É benefício indenizatório por SEQUELA permanente que reduz a capacidade laborativa para o trabalho habitualmente exercido.

O segurado pode CONTINUAR trabalhando. O B94 paga 50% do salário-de-benefício como compensação pela redução da capacidade.

Por isso o relatório médico precisa demonstrar.

Lesão CONSOLIDADA (sem possibilidade de recuperação ao estado anterior).

SEQUELA permanente.

REDUÇÃO da capacidade laborativa para o trabalho habitual.

Nexo causal com acidente (típico, doença ocupacional ou doença equiparada).

## 3. Estrutura do modelo base

### 3.1. Cabeçalho

```
RELATÓRIO MÉDICO

Paciente: [NOME COMPLETO]
Data de nascimento: [DD/MM/AAAA] — Idade: [XX] anos
```

### 3.2. Diagnósticos

Listar CID-10 da sequela permanente. Pode incluir múltiplos CIDs (sequela principal + complicações biomecânicas).

### 3.3. Histórico clínico

Parágrafo narrativo. Evento causador (acidente, doença ocupacional). Tratamentos realizados. Consolidação documentada. Sequela permanente atual.

### 3.4. Avaliação funcional e sequelas permanentes

Parágrafo central. Demonstrar irreversibilidade. Material de síntese definitivo. Alteração biomecânica permanente. Redução da capacidade laborativa para a função habitual. Necessidade de adaptações no trabalho.

### 3.5. Nexo causal

Hipótese adicional obrigatória: acidente de QUALQUER natureza (art. 86, caput, Lei 8.213/91; Tema 416 STJ) — o nexo laboral só é exigível quando se pleiteia a natureza acidentária/competência estadual.

Indicar expressamente.

Acidente típico (art. 19 Lei 8.213/91) com data e descrição.

Doença ocupacional (art. 20) com correlação CID-CNAE.

Doença equiparada acidente (art. 21).

NTEP automático (art. 21-A + Lista B do Anexo II do Decreto 3.048/99).

CAT (Comunicação de Acidente do Trabalho), se emitida, com referência.

### 3.6. Encerramento

```
[Local] — [UF], [data].

________________________________________
[Nome do Médico]
[Especialidade]
CRM [número]
```

## 4. Modelo base completo

Ver `references/MODELO-BASE.md`.

## 5. Sub-modelos por especialidade

Ortopedista. Sequela motora, encurtamento, perda de mobilidade articular, fratura consolidada com material de síntese, amputação.

Psiquiatra. Sequela mental por traumatismo cranioencefálico, transtorno de estresse pós-traumático crônico, sequela cognitiva.

Reumatologista. Sequela articular pós-doença ocupacional (LER/DORT consolidada).

Clínico Geral. Sequela multissistêmica por politraumatismo, sequela respiratória pós-pneumoconiose, sequela renal pós-intoxicação.

Oftalmologista. Sequela visual permanente (perda parcial ou total da visão), descolamento de retina consolidado, cegueira monocular pós-trauma.

Cardiologista. Sequela cardíaca pós-IAM ocupacional, miocardiopatia pós-exposição a químicos.

Ver `references/MODELOS-POR-ESPECIALIDADE.md` para os sub-modelos narrativos.

Ver também o reference cruzado `base-modelo-relatorio-medico-incapacidade-b31-b91-b92/references/ROTEIROS-PROBATORIOS-POR-ESPECIALIDADE.md` (Onda 68). Os roteiros de ortopedia, cardiologia e neurologia podem ser reaproveitados no B94, adaptando o foco para SEQUELA CONSOLIDADA e redução da capacidade laborativa, e não para incapacidade em curso.

## 6. Pontos críticos pró-segurado

### 6.1. Consolidação da lesão

Documentar expressamente que a lesão está CONSOLIDADA. Sem perspectiva de recuperação ao estado anterior. Material de síntese definitivo (se houver).

### 6.2. Sequela permanente

Descrever objetivamente a sequela. Encurtamento de membro, perda de movimento articular em graus, déficit funcional documentado, perda visual com acuidade, déficit auditivo com audiometria.

### 6.3. Redução da capacidade laborativa

CRÍTICO. Conectar a sequela à atividade laboral HABITUAL do segurado. Demonstrar que a sequela exige maior esforço, adaptações, restrição de algumas atividades.

NÃO precisa demonstrar incapacidade total. Basta REDUÇÃO da capacidade.

### 6.4. Anexo III do Decreto 3.048/99 é EXEMPLIFICATIVO

Súmula 88/TNU. Súmula 89/TNU. Tema 416/STJ.

Mesmo que a sequela não esteja literalmente prevista no Anexo III, cabe B94 se há redução da capacidade laborativa.

Cruzamento com `base-b94-anexo-iii-quadros`.

### 6.5. Sequela mínima

Tema 201/TNU. Sequela mínima admite B94 se há demonstração funcional.

Cruzamento com `base-b94-sequela-minima-tema201`.

### 6.6. Nexo acidentário

Indicar expressamente o nexo (típico, ocupacional, equiparado).

NTEP automático quando aplicável.

CAT como prova material.

Cruzamento com `base-b94-nexo-acidentario-ntep` e `ntep-nexo-acidentario`.

## 7. Armadilhas a evitar

Laudo de "incapacidade". B94 NÃO é incapacidade, é REDUÇÃO de capacidade. Médico não pode redigir como se fosse B31/B91.

Laudo sem consolidação. Se a lesão ainda está em tratamento sem consolidação, é B31, não B94. Documentar a consolidação.

Laudo sem nexo. Sem afirmação expressa do nexo causal, perícia indefere a tese acidentária.

Laudo sem descrição funcional da sequela. "Paciente apresenta sequela de fratura" é insuficiente. Descrever a sequela funcional.

Laudo sem correlação com a atividade laboral. Sequela genérica sem demonstração de como afeta o trabalho habitual.

## 8. Carta ao médico assistente

Em `references/CARTA-AO-MEDICO.md` (instruções específicas para B94).

## 9. Cruzamento com a skill validadora

Após o médico preencher, validar com `base-validacao-formal-laudo-medico-checklist-ab` (Checklist A com adaptações para B94).

## 10. Como o Claude entrega na prática

Quando você acionar a skill em caso concreto, indique.

Nome do cliente.

Tipo de sequela e CID.

Especialidade do médico que vai assinar.

Atividade laboral habitual do segurado.

Existência ou não de CAT emitida.

Eu gero o relatório personalizado em formato .docx pronto para entrega ao médico assistente.

## 11. Cruzamento com outras skills

`base-validacao-formal-laudo-medico-checklist-ab` para validação formal.

`base-auxilio-acidente-b94-pos-reforma` para o regime do B94.

`auxilio-acidente-b94` para B94 em geral.

`base-b94-anexo-iii-quadros` para o Anexo III exemplificativo.

`base-b94-sequela-minima-tema201` para sequela mínima.

`base-b94-nexo-acidentario-ntep` para o NTEP em B94.

`base-b94-integracao-salario-beneficio-tema862` para integração ao SB de aposentadoria (Tema 862/STJ).

`base-b94-cessacao-acumulacao-vedacao` para cessação e acumulação.

`auditoria-laudo-pericial` para auditoria de laudo.

`ntep-nexo-acidentario` para nexo acidentário.

`peticao-previdenciaria` para a petição.

## 12. O que NÃO está nesta skill

Modelo para incapacidade B31/B91/B92 está em `base-modelo-relatorio-medico-incapacidade-b31-b91-b92`.

Modelo para aposentadoria PCD está em `base-modelo-relatorio-medico-aposentadoria-pcd-lc142`.

Modelo para BPC/LOAS está em `base-modelo-relatorio-medico-bpc-loas-deficiente`.

## 13. Fontes

Consulte os arquivos `references/MODELO-BASE.md` e `references/MODELOS-POR-ESPECIALIDADE.md`.
