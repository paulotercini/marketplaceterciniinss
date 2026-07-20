---
name: base-modelo-relatorio-medico-incapacidade-b31-b91-b92
description: "Modelo narrativo enxuto (1 folha) de relatório médico para incapacidade B31, B91 e B92, com sub-modelos por especialidade. Use SEMPRE que mencionar modelo relatório médico incapacidade, modelo laudo B31, modelo laudo B91, modelo laudo B92, relatório auxílio-doença, relatório aposentadoria invalidez, relatório ortopedista incapacidade, relatório psiquiatra incapacidade, relatório reumatologista incapacidade, relatório clínico geral incapacidade, relatório oftalmologista incapacidade, relatório cardiologista incapacidade, DII, DID, prognóstico incapacidade, insuscetibilidade reabilitação, nexo acidentário, carta médico assistente, gerar relatório cliente. Cruza com base-validacao-formal-laudo-medico-checklist-ab, base-incapacidade-b31-temporaria, base-incapacidade-b91-permanente, base-incapacidade-acidentaria-b92, auditoria-laudo-pericial, analise-documental-incapacidade, peticao-previdenciaria."
---

# Modelo de Relatório Médico para Benefícios por Incapacidade (B31, B91, B92)

## 1. Quando acionar esta skill

Acione SEMPRE que houver necessidade de gerar modelo de relatório médico para encaminhar a médico assistente, com finalidade de instruir requerimento administrativo ou ação judicial de.

Auxílio por incapacidade temporária (B31, antigo auxílio-doença).

Aposentadoria por incapacidade permanente (B91, antiga aposentadoria por invalidez).

Aposentadoria por incapacidade permanente acidentária (B92).

A skill é fonte primária pró-segurado para produzir modelo narrativo enxuto (cabe em 1 folha) no estilo do escritório Paulo Roberto Tercini Filho, com variantes por especialidade médica.

## 2. Estilo do modelo

Narrativo em parágrafos corridos (não checklist com lacunas, salvo variante específica).

Cabe em uma folha A4.

Estrutura. Cabeçalho simples + Diagnósticos (CID-10) + Histórico clínico + Avaliação funcional/prognóstico + Local, data e assinatura.

Tom técnico fluído. Conexão direta entre patologia → limitação → impossibilidade laboral.

## 3. Estrutura do modelo base

### 3.1. Cabeçalho

```
RELATÓRIO MÉDICO

Paciente: [NOME COMPLETO]
Data de nascimento: [DD/MM/AAAA] — Idade: [XX] anos
```

### 3.2. Diagnósticos

```
Diagnósticos (CID-10)

[CID] — [Nome técnico da patologia]
[CID] — [Nome técnico da patologia]
[CID] — [Nome técnico da patologia]
```

### 3.3. Histórico clínico

Parágrafo narrativo descrevendo. Data do diagnóstico inicial (DID). Sintomatologia atual. Evolução. Tratamentos realizados. Resposta terapêutica. Comorbidades. Atividade laboral habitual e como a patologia a inviabiliza.

### 3.4. Avaliação funcional e prognóstico

Parágrafo narrativo abordando. Domínios funcionais comprometidos (autocuidado, mobilidade, vida doméstica, vida laboral, vida social). Prognóstico (favorável, reservado, desfavorável). Resposta ao tratamento. Insuscetibilidade de reabilitação (para B91). Necessidade de assistência permanente (para B91 com adicional 25%).

### 3.5. Data de início da incapacidade (DII) e duração estimada

Texto direto fixando.

DII (data de início da incapacidade). Com fundamentação documental.

DID (data de início da doença). Quando relevante.

Para B31. Período estimado de afastamento.

Para B91. Insuscetibilidade de reabilitação.

Para B92. Nexo causal com o trabalho (acidente, doença ocupacional, equiparação acidente).

### 3.6. Encerramento

```
[Local] — [UF], [data] de [mês] de [ano].

________________________________________
[Nome do Médico]
[Especialidade]
CRM [número]
```

## 4. Modelo base completo (texto pronto)

Ver `references/MODELO-BASE.md`.

## 5. Sub-modelos por especialidade

Cada especialidade tem foco técnico próprio.

Ortopedista. Lesões musculoesqueléticas, fraturas, hérnias discais, artroses, tendinopatias, bursites.

Psiquiatra. Transtornos depressivos, ansiosos, somatoformes, bipolar, psicose, autismo, TDAH adulto.

Reumatologista. Fibromialgia, artrite reumatoide, lúpus, espondilite anquilosante, osteoartrose.

Clínico Geral. Quadros multissistêmicos, comorbidades, doenças metabólicas, hipertensão, diabetes complicada.

Oftalmologista. Perda visual, retinopatia diabética, glaucoma, degeneração macular, baixa visão.

Cardiologista. Insuficiência cardíaca, pós-IAM, cardiopatia isquêmica grave, arritmias com dispositivos.

Neurologista. Doenças neurodegenerativas, sequelas de AVE, epilepsia refratária, doenças desmielinizantes.

Cirurgião. Pós-operatório em recuperação funcional, com repouso, restrição e recuperação incompleta.

Ver `references/MODELOS-POR-ESPECIALIDADE.md` para os sub-modelos narrativos.

Ver `references/ROTEIROS-PROBATORIOS-POR-ESPECIALIDADE.md` (Onda 68) para roteiros probatórios enxutos com. elementos clínicos que devem ser demonstrados (não apenas alegados) em ortopedia, psiquiatria, cardiologia, neurologia e cirurgia/pós-operatório. Ancoragem em exame complementar típico de cada especialidade. Texto padrão para a petição, com referência a ID de documentos. Alerta contra o vício comum de cada especialidade. Mitigação de risco processual e distinguishing.

## 6. Pontos críticos pró-segurado

### 6.1. Para B31

DII deve ser fixada com precisão. Período estimado deve ser razoável e fundamentado.

Evolução da doença deve ser indicada (estável, progressiva, regressiva).

Tratamentos atuais com posologia.

Evitar afirmações genéricas como "incapacitado". Detalhar QUAIS atividades a patologia inviabiliza.

### 6.2. Para B91

Insuscetibilidade de reabilitação é OBRIGATÓRIA.

Prognóstico desfavorável fundamentado.

Histórico de tratamentos prolongados sem melhora.

Se houver necessidade de auxílio de terceiros, indicar para fundamentar adicional 25% (art. 45 da Lei 8.213/91).

### 6.3. Para B92

Nexo causal com o trabalho é OBRIGATÓRIO.

Hipóteses. Acidente típico (art. 19). Doença profissional/ocupacional (art. 20). Equiparação acidente (art. 21). NTEP automático (art. 21-A, Lista B do Anexo II do Decreto 3.048/99).

CAT (Comunicação de Acidente do Trabalho) referenciada quando emitida.

## 7. Armadilhas a evitar

Laudo genérico. "Paciente apresenta CID X.X e está incapacitado". INSUFICIENTE.

Falta de DII. Crítico para todos os benefícios.

Falta de DID. Crítico para B91 com adicional 25% e para casos de doença preexistente (art. 42 §2º Lei 8.213/91 — agravamento).

Prognóstico vago. "Prognóstico reservado" sem fundamentação. Solicitar detalhamento.

Funcionalidade não abordada. Para B91, sem insuscetibilidade de reabilitação expressa, perícia rejeita.

Nexo causal não abordado. Para B92, sem indicação expressa do nexo, perícia indefere a tese acidentária.

## 8. Carta ao médico assistente

Modelo de carta de apresentação solicitando o relatório, com instruções específicas para cada caso, em `references/CARTA-AO-MEDICO.md`.

## 9. Cruzamento com a skill validadora

Após o médico preencher o relatório, validar formalmente com o Checklist A em `base-validacao-formal-laudo-medico-checklist-ab`.

Fluxo. Acionar esta skill para gerar o modelo. Médico preenche. Acionar a skill validadora para auditar antes do protocolo.

## 10. Como o Claude entrega na prática

Quando você acionar a skill em caso concreto, indique.

Nome do cliente.

Patologia principal e CID.

Especialidade do médico que vai assinar.

Tipo de benefício (B31, B91 ou B92).

Eu gero o relatório personalizado em formato .docx pronto para ser entregue ao médico assistente.

### Requisitos obrigatórios x facultativos no Atestmed (Onda 72)

O art. 2º da Portaria Conjunta MPS/INSS 13/2026, conferido no DOU de 24/03/2026, exige documento oficial com foto (caput) e documentação médica legível e sem rasuras contendo cinco incisos. Identificação do requerente, data de emissão, diagnóstico por extenso OU código CID (alternativos), assinatura do emitente e identificação do emitente com registro no Conselho de Classe legível.

Prazo estimado em dias (art. 2º, §2º) e data de início do repouso (art. 2º, §1º c/c art. 4º, §1º) NÃO são requisitos obrigatórios. São, respectivamente, elemento facultativo e lacuna suprida por norma. Recomenda-se obtê-los por estratégia, para reduzir o espaço do art. 4º, §3º, mas sua ausência não é causa normativa de indeferimento.

Detalhamento e uso pró-segurado da correção em `analise-documental-incapacidade`, seção Requisitos REAIS do art. 2º.

## 11. Cruzamento com outras skills

`base-validacao-formal-laudo-medico-checklist-ab` para validação formal do Checklist A após preenchimento.

`base-incapacidade-b31-temporaria` para o regime do B31.

`base-incapacidade-b91-permanente` para o regime do B91.

`base-incapacidade-acidentaria-b92` para o regime do B92.

`auditoria-laudo-pericial` para auditoria do laudo da perícia oficial.

`analise-documental-incapacidade` para a análise documental do INSS.

`ntep-nexo-acidentario` para o NTEP em B92.

`base-pericia-medica-federal-telepericia` para a perícia oficial.

`peticao-previdenciaria` para a petição.

`formacao-documentacao-did-pcd` para casos em que falta documentação pretérita.

## 12. O que NÃO está nesta skill

Modelo de relatório para auxílio-acidente (B94) está em `base-modelo-relatorio-medico-auxilio-acidente-b94`.

Modelo de relatório para aposentadoria PCD (LC 142/2013) está em `base-modelo-relatorio-medico-aposentadoria-pcd-lc142`.

Modelo de relatório para BPC/LOAS está em `base-modelo-relatorio-medico-bpc-loas-deficiente`.

Validação formal do laudo está em `base-validacao-formal-laudo-medico-checklist-ab`.

## 13. Fontes

Consulte os arquivos `references/MODELO-BASE.md` e `references/MODELOS-POR-ESPECIALIDADE.md`.
