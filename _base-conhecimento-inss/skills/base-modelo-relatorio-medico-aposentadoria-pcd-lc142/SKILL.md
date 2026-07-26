---
name: base-modelo-relatorio-medico-aposentadoria-pcd-lc142
description: "Modelo narrativo enxuto (1 folha) de relatório médico para aposentadoria da pessoa com deficiência pela LC 142/2013, com abordagem dos 7 domínios do IF-BrA, DID retroativa, grau de deficiência e sub-modelos por especialidade. Use SEMPRE que mencionar modelo relatório médico aposentadoria PCD, modelo laudo LC 142, modelo laudo IF-BrA, relatório médico para aposentadoria PCD, relatório ortopedista PCD, relatório psiquiatra PCD, relatório reumatologista PCD, relatório clínico geral PCD, relatório oftalmologista PCD, relatório cardiologista PCD, DID retroativa LC 142, sete domínios IF-BrA, grau leve moderado grave, impedimento longo prazo, fibromialgia Lei 15.176/2025, autismo dupla codificação, surdez Lei 14.768/2023, carta médico aposentadoria PCD. Cruza com base-validacao-formal-laudo-medico-checklist-ab, aposentadoria-deficiencia, base-aposentadoria-pcd-lc142, base-pcd-if-bra-metodologia, base-pcd-did-retroativa, base-pcd-fibromialgia-lei15176, formacao-documentacao-did-pcd, peticao-previdenciaria."
---

# Modelo de Relatório Médico para Aposentadoria PCD (LC 142/2013)

## 1. Quando acionar esta skill

Acione SEMPRE que houver necessidade de gerar modelo de relatório médico para encaminhar a médico assistente, com finalidade de instruir requerimento administrativo ou ação judicial de aposentadoria da pessoa com deficiência pela LC 142/2013 (aposentadoria por tempo de contribuição ou aposentadoria por idade da PCD).

A skill é fonte primária pró-segurado para produzir modelo narrativo enxuto (cabe em 1 folha) no estilo do escritório Paulo Roberto Tercini Filho, focado em.

DID (data de início da deficiência) retroativa.

Abordagem dos 7 domínios do IF-BrA (sensorial; comunicação; mobilidade; cuidados pessoais; vida doméstica; educação, trabalho e vida econômica; socialização e vida comunitária).

Grau de deficiência (leve, moderada, grave) para aplicação dos multiplicadores.

Impedimento de longo prazo.

## 2. Diferença fundamental do modelo PCD

Diferentemente dos benefícios por incapacidade (B31/B91/B92), o foco do laudo para LC 142/2013 NÃO é a INCAPACIDADE para o trabalho, mas a DEFICIÊNCIA FUNCIONAL.

O segurado pode CONTINUAR trabalhando. A LC 142/2013 reconhece o direito a uma aposentadoria mais cedo em razão da deficiência.

O laudo deve abordar.

Funcionalidade conforme CIF (Classificação Internacional de Funcionalidade).

Sete domínios do IF-BrA (Portaria Interministerial AGU/MPS/MF/MP/PR nº 1, de 27/01/2014).

Barreiras enfrentadas (físicas, atitudinais, de comunicação, tecnológicas).

DID retroativa, com fixação por documentação pretérita ou método retrospectivo.

Grau de deficiência (leve, moderada, grave).

## 3. Estrutura do modelo base

### 3.1. Cabeçalho

```
RELATÓRIO MÉDICO

Paciente: [NOME COMPLETO]
Data de nascimento: [DD/MM/AAAA] — Idade: [XX] anos
```

### 3.2. Diagnósticos

CID-10 ou CID-11. Dupla codificação CID-11 + DSM-5-TR para autismo e transtornos mentais.

### 3.3. Histórico clínico

Parágrafo narrativo focado em FUNCIONALIDADE e EVOLUÇÃO. Marco temporal da deficiência (DID). Tratamentos. Barreiras enfrentadas.

### 3.4. Avaliação funcional (7 domínios do IF-BrA)

CRÍTICO. Abordagem expressa dos 7 domínios.

Sensorial. Visão, audição, demais sentidos.

Cognição. Memória, atenção, raciocínio.

Mobilidade. Deslocamento, transferências.

Interações. Relacionamento, comunicação.

Cuidados pessoais. Higiene, alimentação.

Vida doméstica. Tarefas domésticas.

Vida em sociedade. Educação, trabalho, recreação.

### 3.5. Data de início da deficiência (DID)

CRÍTICO para retroatividade do tempo computado.

Fixação por documentação pretérita (exames antigos, prontuários, atestados).

Justificativa técnica da retroatividade.

Presunção de continuidade (se aplicável).

### 3.6. Grau de deficiência

Indicar grau (leve, moderada, grave) com fundamentação técnica.

### 3.7. Impedimento de longo prazo

Texto fixando duração mínima de 2 anos (art. 2º da Lei 13.146/2015).

### 3.8. Encerramento

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

Ortopedista PCD. Deficiência física (limitação motora, amputação, lesão medular).

Psiquiatra PCD. Deficiência mental (transtornos crônicos), autismo, deficiência intelectual.

Reumatologista PCD. Fibromialgia (Lei 15.176/2025), doenças autoimunes crônicas.

Clínico Geral PCD. Deficiência multissistêmica (DM complicado, DRC, esclerose múltipla).

Oftalmologista PCD. Deficiência visual (cegueira, baixa visão, Súmula 377/STJ cegueira monocular).

Cardiologista PCD. Cardiopatias graves com limitação funcional permanente.

Ver `references/MODELOS-POR-ESPECIALIDADE.md` para os sub-modelos narrativos.

Ver também `base-modelo-relatorio-medico-incapacidade-b31-b91-b92/references/ROTEIROS-PROBATORIOS-POR-ESPECIALIDADE.md` (Onda 68). Os roteiros de ortopedia, psiquiatria e neurologia podem ser reaproveitados na aposentadoria PCD, sempre cruzados com os 7 domínios do IF-BrA e com a comprovação da Data de Início da Deficiência (DID).

## 6. Pontos críticos pró-segurado

### 6.1. NÃO é laudo de incapacidade

Erro comum. Médico redige laudo de "incapacidade", quando deveria abordar "funcionalidade".

CORRETO. Focar em IMPEDIMENTOS e BARREIRAS, não em incapacidade.

### 6.2. Abordagem expressa dos 7 domínios

JAMAIS deixar domínio sem abordagem. Cada um deve ter parágrafo descritivo.

### 6.3. DID retroativa fundamentada

Citar exames, prontuários, atestados antigos.

Em casos sem documentação pretérita, presunção de continuidade da deficiência (cruzamento com `formacao-documentacao-did-pcd`).

### 6.4. Grau de deficiência

Conforme metodologia do IF-BrA. Pontuação por domínio (25, 50, 75, 100).

Indicar grau final (leve, moderada, grave).

### 6.5. Particularidades por patologia

Autismo. Dupla codificação CID-11 6A02 + DSM-5-TR. Nível de suporte (1, 2, 3).

Fibromialgia. Lei 15.176/2025. CID M79.7. Critérios ACR 2010, com modificações de 2011 e 2016. Individualização OBRIGATÓRIA pelo roteiro de `base-pcd-fibromialgia-lei15176/references/INDIVIDUALIZACAO-ACHADOS-RELATORIO-MEDICO.md` (Onda 87), com os seis eixos (dor por região e comportamento, fadiga medida em tarefa, sono com consequência diurna, cognição com erro concreto, humor com nexo funcional, resposta terapêutica com doses e intolerâncias) TRADUZIDOS para os sete domínios do IF-BrA. A pontuação não vem do diagnóstico nem da lei, vem do detalhamento funcional. Aplicar FIQR ou FSQ (validados em português, sem preferência de instrumento no Guideline SBR 2026) e transcrever por domínio, com data. DID ancorada em documento pretérito conforme `base-pcd-did-retroativa`.

Surdez. Lei 14.768/2023. Audiometria com dB.

Cegueira monocular. Súmula 377/STJ.

## 7. Armadilhas a evitar

Laudo de "incapacidade". MATA O PEDIDO.

Falta de DID. Inviabiliza a retroatividade.

Domínios não abordados. IF-BrA defeituoso.

Falta de grau. INSS não tem como calcular o multiplicador.

Laudo apenas com diagnóstico sem descrição funcional. Insuficiente.

## 8. Carta ao médico assistente

Em `references/CARTA-AO-MEDICO.md`.

## 9. Cruzamento com a skill validadora

Após o médico preencher, validar com `base-validacao-formal-laudo-medico-checklist-ab` (Checklist B).

## 10. Cruzamento com outras skills

`base-validacao-formal-laudo-medico-checklist-ab` para validação formal (Checklist B).

`aposentadoria-deficiencia` para a aposentadoria PCD.

`base-aposentadoria-pcd-lc142` para o regime da LC 142.

`base-pcd-if-bra-metodologia` para o IF-BrA.

`base-pcd-did-retroativa` para a DID retroativa.

`base-pcd-fibromialgia-lei15176` para fibromialgia.

`base-pcd-deficiencia-auditiva-visual` para deficiências sensoriais.

`base-pcd-conversao-tempo-especial-pcd` para conversão de tempo.

`formacao-documentacao-did-pcd` para formação de documentação pretérita.

`direitos-pcd-previdenciarios` para direitos extraprevidenciários.

`peticao-previdenciaria` para a petição.

## 11. O que NÃO está nesta skill

Modelo para incapacidade B31/B91/B92 está em `base-modelo-relatorio-medico-incapacidade-b31-b91-b92`.

Modelo para auxílio-acidente B94 está em `base-modelo-relatorio-medico-auxilio-acidente-b94`.

Modelo para BPC/LOAS está em `base-modelo-relatorio-medico-bpc-loas-deficiente`.

## 12. Fontes

Consulte `references/MODELO-BASE.md` e `references/MODELOS-POR-ESPECIALIDADE.md`.
