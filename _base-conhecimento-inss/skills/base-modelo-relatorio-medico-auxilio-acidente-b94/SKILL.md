---
name: base-modelo-relatorio-medico-auxilio-acidente-b94
description: "Modelo narrativo enxuto (1 folha) de relatório médico para auxílio-acidente B94, com sub-modelos por especialidade. Foco em SEQUELA consolidada e redução da capacidade laborativa. Use SEMPRE que mencionar modelo relatório médico B94, modelo laudo auxílio-acidente, modelo laudo sequela, modelo laudo consolidação lesões, relatório ortopedista B94, relatório psiquiatra B94, relatório reumatologista B94, relatório clínico geral B94, relatório oftalmologista B94, relatório cardiologista B94, sequela permanente, consolidação lesões, redução capacidade laborativa, Anexo III Decreto 3.048, Súmula 88 TNU, Súmula 89 TNU, Tema 416 STJ, nexo acidentário NTEP B94, carta médico B94, gerar relatório auxílio-acidente. Cruza com base-validacao-formal-laudo-medico-checklist-ab, base-auxilio-acidente-b94-pos-reforma, auxilio-acidente-b94, base-b94-anexo-iii-quadros, base-b94-sequela-minima-sumula88-tnu, base-b94-nexo-acidentario-ntep, auditoria-laudo-pericial, ntep-nexo-acidentario, peticao-previdenciaria."
---

# Modelo de Relatório Médico para Auxílio-Acidente (B94)

Convenção de espécies (códigos INSS): B31 auxílio por incapacidade temporária previdenciário; B91 acidentário; B32 aposentadoria por incapacidade permanente previdenciária; B92 acidentária; B94 auxílio-acidente por acidente do trabalho (B36 quando decorre de acidente de qualquer natureza; a base usa B94 para ambos).

## 1. Quando acionar esta skill

Acione SEMPRE que houver necessidade de gerar modelo de relatório médico para encaminhar a médico assistente, com finalidade de instruir requerimento administrativo ou ação judicial de auxílio-acidente (B94, art. 86 da Lei 8.213/91).

A skill produz modelo narrativo enxuto (cabe em 1 folha), no estilo do escritório, focado em sequela consolidada e redução da capacidade laborativa.

## 2. Distinção fundamental do B94

O auxílio-acidente é benefício indenizatório por sequela permanente que reduz a capacidade para o trabalho habitual (art. 86, caput, da Lei 8.213/91). Não pressupõe incapacidade.

O segurado pode continuar trabalhando, e o salário recebido não prejudica o benefício (art. 86, §3º). A renda mensal é de 50% do salário de benefício (art. 86, §1º). Têm direito o empregado, o doméstico, o avulso e o segurado especial (art. 18, §1º); o contribuinte individual está excluído (Tema 201 TNU).

O relatório médico precisa demonstrar os quatro elementos a seguir.

Lesão CONSOLIDADA (sem possibilidade de recuperação ao estado anterior).

SEQUELA permanente.

REDUÇÃO da capacidade laborativa para o trabalho habitual.

Nexo entre a sequela e um acidente de qualquer natureza; na natureza acidentária, nexo com o trabalho (acidente típico, doença ocupacional ou situação equiparada).

## 3. Estrutura do modelo base

### 3.1. Cabeçalho

```
RELATÓRIO MÉDICO

Paciente: [NOME COMPLETO]
Data de nascimento: [DD/MM/AAAA]. Idade: [XX] anos
```

### 3.2. Diagnósticos

Listar CID-10 da sequela permanente. Pode incluir múltiplos CIDs (sequela principal + complicações biomecânicas).

### 3.3. Histórico clínico

Parágrafo narrativo. Evento causador (acidente, doença ocupacional). Tratamentos realizados. Consolidação documentada. Sequela permanente atual.

### 3.4. Avaliação funcional e sequelas permanentes

Parágrafo central. Demonstrar irreversibilidade. Material de síntese definitivo. Alteração biomecânica permanente. Redução da capacidade laborativa para a função habitual. Necessidade de adaptações no trabalho.

### 3.5. Nexo causal

Hipótese adicional obrigatória: acidente de qualquer natureza (art. 86, caput, da Lei 8.213/91). O nexo laboral é exigível apenas quando se pleiteia a natureza acidentária, com competência da Justiça Estadual.

Quando houver natureza acidentária, indicar expressamente uma das hipóteses abaixo.

Acidente típico (art. 19 Lei 8.213/91) com data e descrição.

Doença profissional ou do trabalho (art. 20), com o agente ou a condição de trabalho que a produziu (Listas A e B do Anexo II do Decreto 3.048/99).

Situação equiparada a acidente do trabalho (art. 21), inclusive o acidente de trajeto (art. 21, IV, "d").

NTEP automático (art. 21-A e Lista C do Anexo II do Decreto 3.048/99).

CAT (Comunicação de Acidente do Trabalho), se emitida, com referência.

### 3.6. Encerramento

```
[Local], [UF], [data].

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

Ver também o reference cruzado `base-modelo-relatorio-medico-incapacidade-b31-b91-b92/references/ROTEIROS-PROBATORIOS-POR-ESPECIALIDADE.md`. Os roteiros de ortopedia, cardiologia e neurologia podem ser reaproveitados no B94, adaptando o foco para SEQUELA CONSOLIDADA e redução da capacidade laborativa, e não para incapacidade em curso.

## 6. Pontos críticos pró-segurado

### 6.1. Consolidação da lesão

Documentar expressamente que a lesão está CONSOLIDADA. Sem perspectiva de recuperação ao estado anterior. Material de síntese definitivo (se houver).

### 6.2. Sequela permanente

Descrever objetivamente a sequela. Encurtamento de membro, perda de movimento articular em graus, déficit funcional documentado, perda visual com acuidade, déficit auditivo com audiometria.

### 6.3. Redução da capacidade laborativa

Conectar a sequela à atividade laboral HABITUAL do segurado. Demonstrar que a sequela exige maior esforço, adaptações, restrição de algumas atividades.

Não é preciso demonstrar incapacidade. Basta a redução da capacidade.

### 6.4. Anexo III do Decreto 3.048/99 é exemplificativo

O art. 104, caput, do Decreto 3.048/99 remete às situações do Anexo III "a exemplo", e o art. 354, §1º, da IN 128/2022 declara o Anexo meramente exemplificativo. Mesmo que a sequela não esteja prevista no Anexo III, cabe B94 se há redução da capacidade laborativa.

Cruzamento com `base-b94-anexo-iii-quadros`.

### 6.5. Sequela mínima

Súmula 88 TNU: "A existência de limitação, ainda que leve, para o desempenho da atividade para o trabalho habitual enseja a concessão do benefício de auxílio-acidente, em observância a tese fixada sob o Tema 416 do Superior Tribunal de Justiça." O Tema 416 STJ afasta a relevância do grau da lesão.

Súmula 89 TNU (adversa): "Não há direito a concessão de benefício de auxílio-acidente quando, após consolidação das lesões decorrentes de acidente de qualquer natureza, resultarem sequelas que não reduzem a capacidade laborativa habitual nem sequer demandam dispêndio de maior esforço na execução da atividade habitual." Por isso o relatório descreve a limitação ou o maior esforço na atividade habitual.

Cruzamento com `base-b94-sequela-minima-sumula88-tnu`.

### 6.6. Nexo acidentário

Indicar expressamente o nexo (típico, ocupacional, equiparado).

NTEP automático quando aplicável.

CAT como prova material.

Cruzamento com `base-b94-nexo-acidentario-ntep` e `ntep-nexo-acidentario`.

## 7. Armadilhas a evitar

Laudo de "incapacidade". O B94 exige redução da capacidade, e não incapacidade. O relatório não deve ser redigido como se fosse para B31 ou B91.

Laudo sem consolidação. Se a lesão ainda está em tratamento sem consolidação, é B31 ou B91, não B94. Documentar a consolidação.

Laudo sem nexo. Sem afirmação expressa do nexo entre a sequela e o acidente, a perícia nega o benefício; sem nexo com o trabalho, nega a natureza acidentária.

Laudo sem descrição funcional da sequela. "Paciente apresenta sequela de fratura" é insuficiente. Descrever a sequela funcional.

Laudo sem correlação com a atividade laboral. Sequela genérica sem demonstração de como afeta o trabalho habitual.

Confusão entre acidente e relação de trabalho. O B94 exige acidente de qualquer natureza, inclusive fora do trabalho; o nexo laboral importa apenas para a natureza acidentária e a competência estadual. Doença degenerativa sem evento traumático e sem nexo ocupacional não gera B94.

CID sem o código da sequela. Usar o código pós-traumático com quarto dígito (M17.2 ou M17.3 gonartrose pós-traumática, M16.4 ou M16.5 coxartrose pós-traumática, M19.1 artrose pós-traumática de outra articulação, T93 e T92 sequelas de lesões dos membros), ao lado do código da lesão original.

Data e mecanismo do acidente ausentes. Informar a data, o mecanismo e o documento que registra o evento (CAT, boletim de atendimento de urgência, prontuário).

## 8. Carta ao médico assistente

Em `references/CARTA-AO-MEDICO.md` (instruções específicas para B94).

## 9. Cruzamento com a skill validadora

Após o médico preencher, validar com `base-validacao-formal-laudo-medico-checklist-ab` (Checklist A com adaptações para B94).

## 10. Como o Claude entrega na prática

Ao acionar a skill em caso concreto, informe os dados abaixo, que ficam no documento do caso.

Nome do cliente.

Tipo de sequela e CID.

Especialidade do médico que vai assinar.

Atividade laboral habitual do segurado.

Existência ou não de CAT emitida.

Claude gera o relatório personalizado em formato .docx pronto para entrega ao médico assistente.

## 11. Cruzamento com outras skills

`base-validacao-formal-laudo-medico-checklist-ab` para validação formal.

`base-auxilio-acidente-b94-pos-reforma` para o regime do B94.

`auxilio-acidente-b94` para B94 em geral.

`base-b94-anexo-iii-quadros` para o Anexo III exemplificativo.

`base-b94-sequela-minima-sumula88-tnu` para sequela mínima.

`base-b94-nexo-acidentario-ntep` para o NTEP em B94.

`base-b94-integracao-salario-beneficio-art31` para integração ao salário-de-benefício de aposentadoria (art. 31 da Lei 8.213/91).

`base-b94-cessacao-acumulacao-vedacao` para cessação e acumulação.

`auditoria-laudo-pericial` para auditoria de laudo.

`ntep-nexo-acidentario` para nexo acidentário.

`peticao-previdenciaria` para a petição.

## 12. O que NÃO está nesta skill

Modelo para incapacidade B31/B32/B91/B92 está em `base-modelo-relatorio-medico-incapacidade-b31-b91-b92`.

Modelo para aposentadoria PCD está em `base-modelo-relatorio-medico-aposentadoria-pcd-lc142`.

Modelo para BPC/LOAS está em `base-modelo-relatorio-medico-bpc-loas-deficiente`.

## 13. Fontes

Consulte os arquivos `references/MODELO-BASE.md` e `references/MODELOS-POR-ESPECIALIDADE.md`.

## Médicos Conferentes, acionamento obrigatório

Antes de redigir o modelo, despachar o médico da área com os documentos, porque no B94 o que decide é a sequela consolidada e a redução funcional, e é o médico quem identifica o que precisa estar descrito.

| Se os documentos tratarem de | Despachar ao agente |
|---|---|
| Coluna, lombar, cervical, hérnia de disco, ciática, estenose, artrodese, CID M40 a M54 | `base-conhecimento-inss:medico-coluna` |
| Joelho, menisco, ligamento cruzado, artrose de joelho, prótese, quadril, tornozelo, fascite plantar | `base-conhecimento-inss:medico-membro-inferior` |
| Ombro, manguito rotador, supraespinhal, bursite, capsulite, CID M75 | `base-conhecimento-inss:medico-ombro` |
| Punho, mão, dedo, amputação, túnel do carpo, tenossinovite, epicondilite, LER e DORT | `base-conhecimento-inss:medico-membro-superior` |
| Depressão, ansiedade, bipolar, esquizofrenia, TEPT, burnout, CAPS, CID F20 a F48 | `base-conhecimento-inss:medico-psiquiatra` |
| Fibromialgia, artrite reumatoide, lúpus, espondilite, artrose difusa, osteoporose | `base-conhecimento-inss:medico-reumatologista` |
| Visão monocular, cegueira, glaucoma, retinopatia, surdez, audiometria, PAIR, implante coclear | `base-conhecimento-inss:medico-sensorial` |
| Câncer, infarto, insuficiência cardíaca, AVC, epilepsia, Parkinson, DPOC, insuficiência renal, HIV | `base-conhecimento-inss:medico-doencas-graves` |

Havendo mais de uma área nos documentos, despachar até TRÊS agentes, os das áreas que decidem o caso. Os pareceres voltam em uma página cada, em linguagem simples, e o que eles apontarem entra no conteúdo que o modelo pede ao assistente, sobretudo na descrição da sequela.

O parecer médico é instrumento INTERNO. Ele orienta a peça, alimenta quesitos e indica o que pedir ao médico assistente, e NÃO vai aos autos como prova nem substitui laudo de assistente nem assistente técnico habilitado.

## MCPs da casa

Pesquisa obrigatória. Norma, súmula, tema, enunciado ou acórdão citado nesta skill nasce [NÃO CONFIRMADO] e só entra em peça, parecer ou orientação depois de lido na fonte oficial, na forma de `pesquisa-jurisprudencia-chrome`. A ordem de consulta dos MCPs (`normas`, `superiores`, `trf3`, `iurisprudencia` e `acervo`) e dos catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) está em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O acervo serve à leitura do que o escritório já sustentou, e o reaproveitamento automático de texto de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.
