---
name: orientacao-cliente-pericia
description: Skill de orientação ao cliente para perícia médica e avaliação biopsicossocial, judicial e administrativa. Use SEMPRE que mencionar orientar cliente para perícia, orientação pré-perícia, preparar segurado para perícia, como se portar na perícia, o que falar na perícia, o que levar na perícia, carta de orientação ao cliente, orientação para perícia judicial, perícia administrativa, Teleperícia, análise documental, avaliação biopsicossocial, IF-BrA, TCQ, perícia B31, B32, B91, B92, B94, BPC, LOAS, aposentadoria PCD, LC 142, auxílio-acidente, auxílio-doença, aposentadoria por invalidez, incapacidade permanente, perícia agendada no fórum, perícia agendada no INSS, orientar assistente social, demonstração para perícia, postura na perícia, o que não fazer na perícia. Acionar AUTOMATICAMENTE em agendamento de perícia judicial ou administrativa. NÃO use para auditoria de laudo (skill auditoria-laudo-pericial) nem para quesitos (skill peticao-previdenciaria).
---

# Skill de Orientação ao Cliente para Perícia Médica e Avaliação Biopsicossocial

## Visão Geral

Esta skill produz documento .docx de orientação ao cliente no padrão visual do escritório, entregável no WhatsApp ou impresso, com todas as informações que o segurado precisa para se preparar para perícia médica ou avaliação biopsicossocial. A orientação varia conforme a espécie do benefício e o rito (administrativo ou judicial), porque as perguntas, o foco do perito e o método de avaliação são distintos.

O documento não é genérico. É redigido para o cliente concreto, com dados do processo, histórico da doença, relação com a profissão e referência aos documentos médicos dos autos ou do processo administrativo.

## Princípio fundamental

O cliente na perícia é testemunha da própria condição. A perícia é o único momento em que o julgador vai ouvir, por intermédio do perito, o relato direto do segurado sobre como a doença ou sequela afeta sua vida e seu trabalho. Orientação deficiente ou ausente deixa essa oportunidade perdida e pode levar à derrota em casos tecnicamente fortes.

A honestidade radical é regra. Cliente orientado a simular ou exagerar será desmascarado. A técnica é ensinar o cliente a descrever a realidade da sua limitação em linguagem funcional, vinculada ao conceito jurídico do benefício pleiteado.

## Fluxo de trabalho

Passo 1. Identificar a espécie do benefício e o rito da perícia. A tabela abaixo direciona ao arquivo de referência correto.

| Situação | Arquivo de referência |
|---|---|
| B31 (auxílio por incapacidade temporária) judicial | `references/INCAPACIDADE.md` |
| B32 ou B91 (aposentadoria por incapacidade permanente; auxílio acidentário) judicial | `references/INCAPACIDADE.md` |
| B92 (aposentadoria por incapacidade acidentária) judicial | `references/INCAPACIDADE.md` |
| B94 (auxílio-acidente) judicial | `references/AUXILIO-ACIDENTE.md` |
| BPC/LOAS judicial (avaliação biopsicossocial por dois profissionais) | `references/BPC-LOAS.md` |
| Aposentadoria PCD pela LC 142/2013 (IF-BrA) judicial | `references/APOSENTADORIA-PCD.md` |
| Qualquer espécie em rito administrativo, incluindo Teleperícia e análise documental | `references/PERICIA-ADMINISTRATIVA.md` (ler em conjunto com a referência da espécie) |

Passo 2. Ler a referência aplicável em conjunto com esta SKILL.md. As referências complementam, não substituem as regras gerais.

Passo 3. Coletar do usuário ou dos documentos do caso as informações mínimas necessárias. Dados do processo (número, vara, cidade), dados da perícia (data, horário, local, nome do perito), CID e histórico da doença, profissão habitual e tarefas concretas, documentos médicos relevantes com referência por ID ou descrição, benefícios anteriores com NB e períodos.

Passo 4. Redigir o documento .docx seguindo o padrão do escritório (Bookman Old Style 12pt, espaçamento 1,5, justificado, cabeçalho timbrado, rodapé com endereço, fonte Bell MT no título do timbre). Estrutura do documento na seção abaixo.

Passo 5. Revisar o documento quanto à aderência à realidade do caso, linguagem acessível ao cliente e completude dos pontos críticos da referência aplicável.

## Estrutura padrão do documento de orientação

Toda orientação segue a estrutura abaixo. A numeração e o conteúdo de cada seção variam conforme a espécie, mas a ordem é sempre a mesma.

1. **Título centralizado.** ORIENTAÇÃO PARA PERÍCIA MÉDICA JUDICIAL ou ORIENTAÇÃO PARA PERÍCIA MÉDICA ADMINISTRATIVA ou ORIENTAÇÃO PARA AVALIAÇÃO BIOPSICOSSOCIAL, conforme o caso.
2. **Destinatário.** Nome do cliente em itálico abaixo do título.
3. **Parágrafo introdutório.** Personalizado. Mencionar o benefício pleiteado e indicar que o documento deve ser lido alguns dias antes da perícia.
4. **Seção 1 — Dados da perícia.** Quadro com processo, vara, data, horário, perito, local, endereço e benefício pleiteado. Em perícia administrativa, substituir processo e vara por número do requerimento e agência do INSS.
5. **Seção 2 — O que levar.** Documento de identificação, laudos e exames originais com cópias, caixas de medicamentos, esta orientação impressa. Itens adicionais conforme a referência da espécie.
6. **Seção 3 — Como se apresentar.** Roupa, descanso, evitar álcool e medicamentos fora do prescrito.
7. **Seção 4 — Postura durante a perícia.** Duração média, tom, honestidade radical, colaboração, não discutir.
8. **Seção 5 — O que relatar sobre a doença/sequela/acidente.** Roteiro personalizado conforme a espécie, com datas, CID, histórico de tratamento e cirurgias.
9. **Seção 6 — O que relatar sobre as limitações.** Núcleo do documento. Conteúdo varia drasticamente conforme o benefício. Ver referência específica.
10. **Seção 7 — Demonstração física durante o exame.** O que mostrar espontaneamente, como permitir o exame, como comparar partes saudáveis e afetadas. Em BPC e aposentadoria PCD, há também seção sobre avaliação social.
11. **Seção 8 — Perguntas que o perito provavelmente vai fazer.** Lista de perguntas-padrão com respostas-modelo vinculadas ao conceito jurídico do benefício.
12. **Seção 9 — O que nunca fazer.** Lista negativa específica conforme o benefício.
13. **Seção 10 — Após a perícia.** Orientação para contato imediato com o advogado, relato detalhado, prazo de liberação do laudo.
14. **Fechamento.** Local, data por extenso, assinatura do Dr. Paulo Roberto Tercini Filho, OAB/SP 331.110.

## Regras gerais aplicáveis a todas as orientações

### Proibição absoluta de dois pontos
Não utilizar dois pontos em qualquer ponto do texto, salvo em citações literais ou em identificação de campo (ex. "Horário — 10h"). Frases com explicação devem usar ponto final e iniciar novo período.

### Linguagem acessível
O destinatário é o cliente, não o julgador. Usar frases curtas, palavras do cotidiano, exemplos da profissão real do cliente. Evitar jargão jurídico. Quando houver referência a conceito técnico (art. 86, Tema 416/STJ, IF-BrA), explicar em linguagem comum.

### Vinculação ao conceito jurídico do benefício
Cada benefício tem um requisito central distinto. A orientação deve levar o cliente a demonstrar exatamente esse requisito na perícia, em suas próprias palavras.

- B31/B91 — incapacidade temporária para o trabalho habitual. Cliente precisa demonstrar que atualmente não consegue desempenhar a atividade.
- B32/B92 — incapacidade total e permanente para qualquer atividade que garanta subsistência, considerando idade, escolaridade e condições pessoais. Cliente precisa demonstrar inviabilidade de reabilitação.
- B94 — sequela consolidada que reduz a capacidade para a atividade habitual. Cliente precisa demonstrar que trabalha com mais esforço, mais tempo, menos segurança ou menos destreza.
- BPC/LOAS — impedimento de longo prazo (mínimo 2 anos) que, em interação com barreiras, obstrui a participação plena e efetiva na sociedade em igualdade de condições. Cliente precisa demonstrar o impedimento e as barreiras concretas.
- Aposentadoria PCD (LC 142/2013) — deficiência grave, moderada ou leve, de longa duração, que gere restrições para o trabalho ao longo da carreira contributiva. Cliente precisa demonstrar desde quando tem a limitação e como ela afetou a vida laboral ao longo dos anos.

### Honestidade radical
Advertir expressamente contra simulação, exagero e minimização. Simulação é detectada e destrói o caso. Minimização por orgulho ou timidez é a causa mais comum de indeferimento. A verdade bem descrita é suficiente em casos tecnicamente consistentes.

### Frase-chave memorizável
Em todas as orientações, incluir uma frase-chave que o cliente deve memorizar. A frase sintetiza o conceito do benefício em linguagem comum. Exemplo para B94. Consigo trabalhar, mas demoro mais, me canso mais, preciso de mais cuidado com segurança e não tenho mais a mesma destreza. Cada referência traz frases-chave específicas.

### Contato após a perícia
Toda orientação deve instruir o cliente a entrar em contato imediatamente após a perícia, antes mesmo de sair do estacionamento do Fórum ou da agência do INSS, para relatar o que aconteceu. Esse relato será a base da eventual impugnação ao laudo.

### Adequação à capacidade cognitiva e cultural do cliente
Cliente com baixa escolaridade ou dificuldade de leitura precisa de versão simplificada, com fontes maiores e frases ainda mais curtas. Quando for o caso, oferecer ao advogado leitura assistida da orientação com o cliente antes da perícia.

## Formato do documento final

Gerar em .docx usando docx-js. Padrão de formatação é o seguinte.

- Fonte Bookman Old Style 12pt no corpo
- Espaçamento entre linhas 1,5
- Alinhamento justificado no corpo
- Cabeçalho timbrado na primeira página (ou em todas, a critério) com "ADVOCACIA PREVIDENCIÁRIA" em Bell MT negrito 20pt, "DR. PAULO ROBERTO TERCINI FILHO" em Bookman Old Style negrito 11pt e "OAB/SP 331.110" também em negrito
- Rodapé com "Rua Rui Barbosa, nº 663, Centro, Monte Alto – SP" e "Tel: 16-3242-2908 – Cel: 16-98140-9271"
- Margens A4 de 3 cm
- Quadro de dados da perícia na seção 1, com duas colunas (rótulo em azul-claro, valor)
- Listas com marcador • via LevelFormat.BULLET (nunca caractere manual)
- Título centralizado em maiúsculas, negrito, 15pt

## Verificação final antes de entregar

1. O documento tem os dados exatos do caso (número do processo, data, horário, nome do perito, endereço)?
2. A espécie correta do benefício foi identificada e a referência correta foi usada?
3. A orientação está personalizada à profissão e ao histórico clínico do cliente?
4. A frase-chave memorizável está presente e corresponde ao conceito jurídico do benefício?
5. As armadilhas específicas da espécie estão sinalizadas na seção 9?
6. O documento tem instrução clara de contato após a perícia?
7. Em caso de Teleperícia, análise documental ou avaliação biopsicossocial por dois profissionais, as peculiaridades estão descritas?
8. Não há dois pontos fora de citações literais ou identificação de campo?

## Referências

Ler obrigatoriamente o arquivo aplicável antes de redigir a orientação.

- `references/INCAPACIDADE.md` — Orientação para B31, B32, B91 e B92 em perícia judicial
- `references/AUXILIO-ACIDENTE.md` — Orientação para B94 em perícia judicial
- `references/BPC-LOAS.md` — Orientação para avaliação biopsicossocial em BPC/LOAS (administrativa e judicial)
- `references/APOSENTADORIA-PCD.md` — Orientação para aposentadoria PCD pela LC 142/2013 (administrativa e judicial), com IF-BrA
- `references/PERICIA-ADMINISTRATIVA.md` — Peculiaridades da perícia administrativa, Teleperícia e análise documental (ler em conjunto com a referência da espécie)

## Skills correlatas

Esta skill se integra com as seguintes skills do escritório.

- `peticao-previdenciaria` para redação de quesitos que serão apresentados antes da perícia judicial
- `auditoria-laudo-pericial` para auditar o laudo após a perícia, com base no relato do cliente coletado conforme a seção 10
- `analise-documental-incapacidade` quando a perícia administrativa ocorrer no regime das Portarias Conjuntas MPS/INSS 13, 14 e 15 de 2026
- `aposentadoria-deficiencia` em casos de aposentadoria PCD pela LC 142/2013
- `analise-bpc-loas` em casos de BPC/LOAS
- `auxilio-acidente-b94` em casos de B94

## Estudo pré-perícia do advogado (Onda 92)

Antes do documento entregável desta skill, o advogado conduz reunião de preparação com o cliente. O roteiro INTERNO dessa reunião é gerado pela skill `estudo-pre-pericia`, em tópicos curtos para leitura em voz alta, com o ponto decisivo da perícia do caso concreto. As duas peças convivem, o estudo guia a reunião e não é entregue ao cliente, esta orientação fica com o cliente depois dela. Os references desta skill servem de fonte de conteúdo ao estudo, sem duplicação.
