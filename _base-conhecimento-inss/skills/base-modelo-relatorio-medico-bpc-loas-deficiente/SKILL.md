---
name: base-modelo-relatorio-medico-bpc-loas-deficiente
description: "Modelo narrativo enxuto (1 folha) de relatório médico para BPC/LOAS da pessoa com deficiência, abordagem biopsicossocial, IFBrM, impedimento de longo prazo e sub-modelos por especialidade. Use SEMPRE que mencionar modelo relatório médico BPC, modelo laudo BPC LOAS, modelo laudo IFBrM, modelo laudo biopsicossocial, relatório ortopedista BPC, relatório psiquiatra BPC, relatório reumatologista BPC, relatório clínico geral BPC, relatório oftalmologista BPC, relatório cardiologista BPC, BPC criança, BPC menor 16 anos, impedimento longo prazo 2 anos, barreiras CIF, Portaria Conjunta 2/2014, Portaria 37/2026 IFBrM, Lei 15.157/2025, Lei 15.176/2025 fibromialgia, carta médico BPC. Cruza com base-validacao-formal-laudo-medico-checklist-ab, analise-bpc-loas, base-bpc-loas-requisitos, base-bpc-impedimento-longo-prazo, base-bpc-aposentadoria-pcd-procedimentos, base-bpc-renda-per-capita-miserabilidade, bpc-renda-grupo-familiar, peticao-previdenciaria."
---

# Modelo de Relatório Médico para BPC/LOAS Deficiente

## 1. Quando acionar esta skill

Acione SEMPRE que houver necessidade de gerar modelo de relatório médico para encaminhar a médico assistente, com finalidade de instruir requerimento administrativo ou ação judicial de BPC/LOAS (Benefício de Prestação Continuada, Lei 8.742/93 art. 20) para pessoa com deficiência.

A skill é fonte primária pró-segurado para produzir modelo narrativo enxuto (cabe em 1 folha) no estilo do escritório Paulo Roberto Tercini Filho, focado em.

Impedimento de longo prazo (mínimo 2 anos, art. 20 §10 da LOAS).

Avaliação biopsicossocial conforme Portaria Conjunta SPS/INSS/SNAS 2/2014.

IFBrM (Índice de Funcionalidade Brasileiro Modificado), Portaria 37/2026.

Barreiras enfrentadas (CIF).

Particularidades para menores de 16 anos.

## 2. Diferença fundamental do modelo BPC

Diferentemente da LC 142/2013 (que tem 7 domínios do IF-BrA e busca classificação por grau), o BPC usa.

IFBrM (Índice de Funcionalidade Brasileiro Modificado).

Domínios. Físico, Mental, Intelectual, Sensorial.

Avaliação biopsicossocial integrada (médica + social).

Foco em IMPEDIMENTO DE LONGO PRAZO (≥ 2 anos) que, em interação com barreiras, dificulta a participação plena e efetiva na sociedade em igualdade de condições.

O BPC NÃO depende de tempo de contribuição. Depende.

Deficiência (impedimento de longo prazo + barreiras).

Renda per capita ≤ 1/4 SM (regra geral, com flexibilizações).

Inscrição atualizada no CadÚnico.

## 3. Estrutura do modelo base

### 3.1. Cabeçalho

```
RELATÓRIO MÉDICO

Paciente: [NOME COMPLETO]
Data de nascimento: [DD/MM/AAAA] — Idade: [XX] anos
```

### 3.2. Diagnósticos

CID-10 ou CID-11. Dupla codificação para autismo (CID-11 6A02 + DSM-5-TR).

### 3.3. Histórico clínico

Parágrafo narrativo. Marco temporal. Tratamentos. Resposta.

### 3.4. Avaliação biopsicossocial e IFBrM (domínios)

CRÍTICO. Abordagem dos domínios do IFBrM.

Físico. Mobilidade, manuseio, esforço.

Mental. Saúde mental, comportamento.

Intelectual. Capacidade cognitiva, aprendizado.

Sensorial. Visão, audição.

### 3.5. Barreiras enfrentadas (CIF)

Físicas. Atitudinais. De comunicação. Tecnológicas. Geográficas.

### 3.6. Impedimento de longo prazo

Texto fixando duração mínima de 2 anos (art. 20 §10 da LOAS).

Para PCD permanente irrecuperável, citar Lei 15.157/2025 (dispensa de reavaliação).

### 3.7. Particularidades para menores de 16 anos

Quando aplicável. Avaliação adaptada à faixa etária. Marco do desenvolvimento. Portaria 37/2026.

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

Ortopedista BPC. Deficiência física para BPC.

Psiquiatra BPC. Deficiência mental, intelectual, autismo (com particularidades para criança).

Reumatologista BPC. Fibromialgia (Lei 15.176/2025) e doenças autoimunes.

Clínico Geral BPC. Deficiência multissistêmica.

Oftalmologista BPC. Deficiência visual.

Cardiologista BPC. Cardiopatias com limitação grave.

Ver `references/MODELOS-POR-ESPECIALIDADE.md`.

## 6. Pontos críticos pró-segurado

### 6.1. Impedimento de longo prazo

OBRIGATÓRIO afirmar duração mínima de 2 anos. Citar art. 20 §10 da LOAS.

Para PCD permanente irrecuperável, citar Lei 15.157/2025 (dispensa de reavaliação bienal).

### 6.2. Abordagem biopsicossocial

Não é apenas médica. Deve mencionar barreiras CIF (físicas, atitudinais, de comunicação, tecnológicas, geográficas).

### 6.3. IFBrM (domínios físico, mental, intelectual, sensorial)

Abordagem de todos os domínios pertinentes.

### 6.4. Particularidades para menores de 16 anos

Portaria 37/2026. Avaliação adaptada à faixa etária.

Marcos do desenvolvimento conforme idade.

Necessidades específicas (escolarização, terapia ocupacional, fonoaudiologia).

### 6.5. Fibromialgia (Lei 15.176/2025)

Reconhecida como deficiência para fins de BPC.

CID M79.7. Critérios ACR 2010.

### 6.6. Autismo

Dupla codificação CID-11 6A02 + DSM-5-TR.

Nível de suporte (1, 2, 3).

## 7. Armadilhas a evitar

Laudo de "incapacidade laboral". BPC é para PCD, mesmo sem capacidade laboral originária (caso de criança e idoso).

Falta de "impedimento de longo prazo". MATA O PEDIDO.

Domínios IFBrM não abordados. Avaliação biopsicossocial defeituosa.

Falta de barreiras. A deficiência é interação entre impedimento e barreiras.

Para criança. Falta de avaliação adaptada à faixa etária.

## 8. Cruzamento com a skill validadora

Após o médico preencher, validar com `base-validacao-formal-laudo-medico-checklist-ab` (Checklist B).

## 9. Cruzamento com outras skills

`base-validacao-formal-laudo-medico-checklist-ab` para validação formal (Checklist B).

`analise-bpc-loas` para análise técnica do BPC.

`base-bpc-loas-requisitos` para requisitos estruturais.

`base-bpc-impedimento-longo-prazo` para o impedimento de longo prazo.

`base-bpc-aposentadoria-pcd-procedimentos` para procedimentos.

`base-bpc-renda-per-capita-miserabilidade` para a renda.

`bpc-renda-grupo-familiar` para o grupo familiar.

`base-bpc-pbf-anuencia-in54-2026` para a relação BPC-PBF.

`base-cadastro-domiciliar-cadunico-in21-2026` para o Cadastro Domiciliar.

`base-pcd-fibromialgia-lei15176` para fibromialgia.

`base-pcd-deficiencia-auditiva-visual` para deficiências sensoriais.

`peticao-previdenciaria` para a petição.

## 10. O que NÃO está nesta skill

Modelo para incapacidade B31/B91/B92 está em `base-modelo-relatorio-medico-incapacidade-b31-b91-b92`.

Modelo para B94 está em `base-modelo-relatorio-medico-auxilio-acidente-b94`.

Modelo para aposentadoria PCD (LC 142/2013) está em `base-modelo-relatorio-medico-aposentadoria-pcd-lc142`.

## 11. Fontes

Consulte `references/MODELO-BASE.md` e `references/MODELOS-POR-ESPECIALIDADE.md`.
