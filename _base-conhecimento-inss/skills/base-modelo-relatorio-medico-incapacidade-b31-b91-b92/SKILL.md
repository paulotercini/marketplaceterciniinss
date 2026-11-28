---
name: base-modelo-relatorio-medico-incapacidade-b31-b91-b92
description: "Modelo narrativo enxuto (1 folha) de relatório médico para incapacidade B31, B32, B91 e B92, com sub-modelos por especialidade. Use SEMPRE que mencionar modelo relatório médico incapacidade, modelo laudo B31, modelo laudo B32, modelo laudo B91, modelo laudo B92, relatório auxílio-doença, relatório aposentadoria invalidez, relatório ortopedista incapacidade, relatório psiquiatra incapacidade, relatório reumatologista incapacidade, relatório clínico geral incapacidade, relatório oftalmologista incapacidade, relatório cardiologista incapacidade, DII, DID, prognóstico incapacidade, insuscetibilidade reabilitação, nexo acidentário, carta médico assistente, gerar relatório cliente. Cruza com base-validacao-formal-laudo-medico-checklist-ab, base-incapacidade-b31-temporaria, base-incapacidade-b32-permanente, base-incapacidade-acidentaria-b92, auditoria-laudo-pericial, analise-documental-incapacidade, peticao-previdenciaria."
---

# Modelo de Relatório Médico para Benefícios por Incapacidade (B31, B32, B91, B92)

## 1. Quando acionar esta skill

Acione SEMPRE que houver necessidade de gerar modelo de relatório médico para encaminhar a médico assistente, com finalidade de instruir requerimento administrativo ou ação judicial de:

Auxílio por incapacidade temporária, previdenciário (B31) ou acidentário (B91).

Aposentadoria por incapacidade permanente, previdenciária (B32) ou acidentária (B92).

As espécies seguem os códigos oficiais do INSS: B31 auxílio por incapacidade temporária previdenciário; B91 acidentário; B32 aposentadoria por incapacidade permanente previdenciária; B92 acidentária; B94 auxílio-acidente. O nome da pasta desta skill foi mantido para não quebrar referências.

A skill produz modelo narrativo de uma folha, no padrão do escritório, com variantes por especialidade médica.

## 2. Estilo do modelo

Narrativo em parágrafos corridos, sem lacunas para preencher, salvo variante específica.

Cabe em meia página, no máximo uma folha A4, e não cita artigo de lei.

Estrutura: cabeçalho, diagnósticos (CID-10), histórico clínico, avaliação funcional e prognóstico, local, data e assinatura.

Tom técnico, com ligação direta entre patologia, limitação e impossibilidade de exercer a atividade habitual.

## 3. Estrutura do modelo base

### 3.1. Cabeçalho

```
RELATÓRIO MÉDICO

Paciente: [nome completo]. CPF: [000.000.000-00]. Nascimento: [DD/MM/AAAA].
Profissão: [função e tarefas principais].
Data de emissão: [DD/MM/AAAA]
```

### 3.2. Diagnósticos

CID com o quarto dígito quando existir, com lado e origem (primária, pós-traumática, secundária). Em artrose, M15 poliartrose, M16 coxartrose, M17 gonartrose, M18 rizartrose, M19 outras artroses e M47 espondilose, e os códigos pós-traumáticos M16.4 e M16.5, M17.2 e M17.3, M18.2 e M18.3 e M19.1 já contam a história do acidente.

```
Diagnósticos (CID-10)

[CID]. [Nome técnico da patologia]
[CID]. [Nome técnico da patologia]
[CID]. [Nome técnico da patologia]
```

### 3.3. Histórico clínico

Parágrafo narrativo com: data do diagnóstico inicial (DID). Sintomatologia atual. Evolução. Tratamentos realizados. Resposta terapêutica. Comorbidades. Atividade laboral habitual e como a patologia a inviabiliza.

### 3.4. Avaliação funcional e prognóstico

Parágrafo narrativo com: domínios funcionais comprometidos (autocuidado, mobilidade, vida doméstica, vida laboral, vida social). Prognóstico (favorável, reservado, desfavorável). Resposta ao tratamento. Insuscetibilidade de reabilitação (permanente, B32 ou B92). Necessidade de assistência permanente (adicional de 25%).

### 3.5. Duas datas, sempre, DID e DII

DID, sempre, com o exame ou atendimento que a documenta. DII, com o marco documental. Se a DID for anterior à filiação ou ao reingresso, o relatório diz que a incapacidade começou com o agravamento do quadro e nomeia o marco, e a petição cita o art. 42, § 2º, e o art. 59, § 1º, da Lei 8.213/1991.

Temporária (B31 ou B91). Prazo de afastamento em dias.

Permanente (B32 ou B92). Insuscetibilidade de reabilitação.

Acidentária (B91 ou B92). Nexo com o trabalho ou o acidente, em uma frase, sem citar lei.

### 3.6. Encerramento

```
[Local], [UF], [data] de [mês] de [ano].

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

Em fibromialgia, aplicar o roteiro de individualização de `base-pcd-fibromialgia-lei15176/references/INDIVIDUALIZACAO-ACHADOS-RELATORIO-MEDICO.md`. O INSS raramente nega o diagnóstico e costuma negar a incapacidade, e o relatório genérico leva o perito a concluir por doença sem repercussão funcional. O relatório cobre seis eixos: dor por região e comportamento (com alodínia e hiperalgesia à palpação localizadas), fadiga medida em tarefa e tempo, sono não reparador com consequência diurna, cognição com exemplo de erro concreto na função real, humor com nexo funcional (nunca como causa alternativa que transforme o caso em psiquiátrico transitório) e resposta terapêutica com doses, tempo e intolerâncias. Instrumento validado (FIQR ou FSQ) aplicado, datado e transcrito por domínio, e não apenas pelo total. Cada eixo termina na tarefa concreta da ocupação declarada no CNIS, e a DII se ancora em marco documental.

Clínico Geral. Quadros multissistêmicos, comorbidades, doenças metabólicas, hipertensão, diabetes complicada.

Oftalmologista. Perda visual, retinopatia diabética, glaucoma, degeneração macular, baixa visão.

Cardiologista. Insuficiência cardíaca, pós-IAM, cardiopatia isquêmica grave, arritmias com dispositivos.

Neurologista. Doenças neurodegenerativas, sequelas de AVE, epilepsia refratária, doenças desmielinizantes.

Cirurgião. Pós-operatório em recuperação funcional, com repouso, restrição e recuperação incompleta.

Ver `references/MODELOS-POR-ESPECIALIDADE.md` para os sub-modelos narrativos.

Ver `references/ROTEIROS-PROBATORIOS-POR-ESPECIALIDADE.md` para os roteiros probatórios de ortopedia, psiquiatria, cardiologia, neurologia e pós-operatório: elementos clínicos a demonstrar, exame complementar típico, texto padrão para a petição com referência ao ID do documento e falha comum de cada especialidade.

## 6. Pontos críticos pró-segurado

### 6.1. Para B31

DII deve ser fixada com precisão. Período estimado deve ser razoável e fundamentado.

Evolução da doença deve ser indicada (estável, progressiva, regressiva).

Tratamentos atuais com posologia.

Evitar afirmações genéricas como "incapacitado". Detalhar quais atividades a patologia impede.

### 6.2. Para a permanente (B32 ou B92)

A insuscetibilidade de reabilitação deve constar de forma expressa.

Prognóstico desfavorável fundamentado.

Histórico de tratamentos prolongados sem melhora.

Se houver necessidade de auxílio de terceiros, indicar para fundamentar adicional 25% (art. 45 da Lei 8.213/91).

### 6.3. Para a acidentária (B91 ou B92)

O nexo causal com o trabalho deve constar de forma expressa.

Hipóteses da Lei 8.213/91: acidente típico (art. 19), doença profissional ou do trabalho (art. 20), situações equiparadas (art. 21) e nexo técnico epidemiológico (art. 21-A, Lista C do Anexo II do Decreto 3.048/99).

CAT (Comunicação de Acidente do Trabalho) referenciada quando emitida.

### 6.4. Artrose e doenças degenerativas (M15 a M19, M47, M50 a M54)

O indeferimento típico é "quadro compatível com a idade" ou "doença preexistente". O relatório responde com as duas datas, o grau radiológico datado (Kellgren-Lawrence I a IV), o tratamento esgotado e a limitação em verbos com medida ligada à profissão, e a mesma artrose que não impede o trabalho sentado impede o do pedreiro. Quando o esforço do trabalho agravou o quadro, o relatório diz isso em uma frase e a petição sustenta a concausa do art. 21, I. O art. 20, § 1º, "a", da Lei 8.213/1991 exclui a doença degenerativa do conceito de doença do trabalho, e o INSS usará esse dispositivo. A tese acidentária em artrose depende de demonstrar o agravamento pelo trabalho, e não a causa, e deve ser avaliada caso a caso antes de escolher a espécie e o foro.

## 7. Armadilhas a evitar

Laudo genérico, do tipo "paciente apresenta CID X.X e está incapacitado", não sustenta o pedido.

Falta de DII. Crítico para todos os benefícios.

Falta de DID. A DID omitida por medo da preexistência entrega ao INSS a tese sem a contraprova, e é a DID com a DII posterior que prova o agravamento.

Falta do quarto dígito do CID em artrose, sem lado e sem origem. Grau radiológico citado como se decidisse o caso. Profissão ausente do relatório. Citação de artigo de lei no corpo do relatório.

Prognóstico vago, como "prognóstico reservado" sem fundamentação. Solicitar detalhamento.

Funcionalidade não abordada. Na permanente, sem insuscetibilidade de reabilitação expressa, a perícia rejeita.

Nexo causal não abordado. Na acidentária, sem indicação expressa do nexo, a perícia indefere a tese acidentária.

## 8. Carta ao médico assistente

Modelo de carta de apresentação solicitando o relatório, com instruções específicas para cada caso, em `references/CARTA-AO-MEDICO.md`.

## 9. Cruzamento com a skill validadora

Após o médico preencher o relatório, validar formalmente com o Checklist A em `base-validacao-formal-laudo-medico-checklist-ab`.

Fluxo: acionar esta skill para gerar o modelo. Médico preenche. Acionar a skill validadora para auditar antes do protocolo.

## 10. Como o Claude entrega na prática

Ao acionar a skill em caso concreto, informe os dados abaixo, que ficam no documento do caso.

Nome do cliente.

Patologia principal e CID.

Especialidade do médico que vai assinar.

Tipo de benefício (B31, B91, B32 ou B92).

Claude gera o relatório personalizado em formato .docx pronto para ser entregue ao médico assistente.

### Requisitos obrigatórios x facultativos no Atestmed

O art. 2º da Portaria Conjunta MPS/INSS 13/2026 exige documento oficial com foto (caput) e documentação médica legível e sem rasuras, com os cinco incisos: identificação do requerente, data de emissão, diagnóstico por extenso ou código CID (alternativos), assinatura do emitente e identificação do emitente com registro no Conselho de Classe legível.

Prazo estimado em dias (art. 2º, §2º) e data de início do repouso (art. 2º, §1º c/c art. 4º, §1º) não são requisitos obrigatórios. São, respectivamente, elemento facultativo e lacuna suprida por norma. Recomenda-se obtê-los por estratégia, para reduzir o espaço do art. 4º, §3º, mas sua ausência não é causa normativa de indeferimento.

Detalhamento e uso pró-segurado da correção em `analise-documental-incapacidade`, seção sobre os requisitos do art. 2º.

## 11. Cruzamento com outras skills

`base-validacao-formal-laudo-medico-checklist-ab` para validação formal do Checklist A após preenchimento.

`base-incapacidade-b31-temporaria` para o regime do B31.

`base-incapacidade-b32-permanente` para o regime do B32.

`base-incapacidade-acidentaria-b92` para o regime do B91 ou do B92.

`auditoria-laudo-pericial` para auditoria do laudo da perícia oficial.

`analise-documental-incapacidade` para a análise documental do INSS.

`ntep-nexo-acidentario` para o NTEP em B91 ou B92.

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

## Médicos Conferentes, acionamento obrigatório

Antes de redigir o modelo para o médico assistente, despachar o médico da área com os documentos já existentes, porque é ele que diz o que falta demonstrar e, portanto, o que o relatório precisa conter.

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

Havendo mais de uma área nos documentos, despachar até TRÊS agentes, os das áreas que decidem o caso. Os pareceres voltam em uma página cada, em linguagem simples, e o que eles apontarem entra no conteúdo que o modelo pede ao assistente.

O parecer médico é instrumento INTERNO. Ele orienta a peça, alimenta quesitos e indica o que pedir ao médico assistente, e NÃO vai aos autos como prova nem substitui laudo de assistente nem assistente técnico habilitado.

## MCPs da casa

Pesquisa obrigatória. Norma, súmula, tema, enunciado ou acórdão citado nesta skill nasce [NÃO CONFIRMADO] e só entra em peça, parecer ou orientação depois de lido na fonte oficial, na forma de `pesquisa-jurisprudencia-chrome`. A ordem de consulta dos MCPs (`normas`, `superiores`, `trf3`, `iurisprudencia` e `acervo`) e dos catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) está em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O acervo serve à leitura do que o escritório já sustentou, e o reaproveitamento automático de texto de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.
