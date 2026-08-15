---
name: retificacao-ppp
description: "Geração de solicitação de retificação de PPP dirigida à empresa empregadora. Use SEMPRE que mencionar retificação de PPP, correção de PPP, notificação para retificar PPP, solicitar retificação de PPP, PPP com erro, PPP com vício, corrigir campo do PPP, campo 15.3, campo 15.4, campo 15.5, campo 15.7, agente omitido no PPP, grandeza NEN ausente, data de nascimento errada PPP, técnica utilizada incorreta, NR-15 no campo 15.5, campo observações PPP, art. 279 IN 128, art. 281 IN 128, laudo extemporâneo PPP, Tema 132 TST retificação PPP, ou qualquer situação em que a auditoria de PPP (skill auditoria-ppp) identificar vícios que exigem retificação pela empresa. Acionar AUTOMATICAMENTE após a skill auditoria-ppp quando houver recomendação de retificação. Complementar a auditoria-ppp, peticao-previdenciaria, documentos-comprobatorios-in128 e tema-1124-instrucao-administrativa. NÃO use para petições judiciais, recursos ao CRPS ou mandados de segurança (usar peticao-previdenciaria)."
---

# Skill de Solicitação de Retificação de PPP

## Visão Geral

Esta skill gera solicitações formais de retificação de PPP dirigidas à empresa empregadora (ou sucessora), no padrão visual do escritório Advocacia Previdenciária Dr. Paulo Roberto Tercini Filho. O documento é um .docx timbrado, com cabeçalho (logo + dados do escritório), corpo formatado em Bookman Old Style 12pt e rodapé com endereço e telefones.

A solicitação de retificação é instrumento extrajudicial. Não é petição, recurso nem mandado de segurança. Quando a empresa se recusar a retificar, a via adequada é a ação trabalhista de obrigação de fazer (Tema 132/TST, imprescritível) ou a produção de prova pericial na ação previdenciária.

## Fluxo de Trabalho

1. Leia este SKILL.md completamente
2. Leia `references/TEMPLATE.js` para obter o código-base do template
3. Identifique os vícios a corrigir a partir da auditoria do PPP (skill auditoria-ppp)
4. Adapte o template ao caso concreto, selecionando os pedidos aplicáveis
5. Gere o .docx usando docx-js (npm package `docx`)
6. Valide o documento gerado

## Regras Críticas

### Proibição Absoluta de Dois-Pontos
NUNCA utilize dois-pontos para introduzir explicações, listas ou conclusões. Reestruture sempre em frases independentes ou conectadas por conjunções.

### Título do Documento
O título é sempre **SOLICITAÇÃO DE RETIFICAÇÃO DE PPP**, centralizado, negrito, Bookman Old Style 14pt (28 half-points). Nunca utilizar "Notificação Extrajudicial" como título.

### Tom
Direto, técnico, sem prolixidade. Cada pedido em seção numerada. Fundamentação legal concisa. Sem argumentação doutrinária.

### Formatação
- Fonte principal do corpo: **Bookman Old Style**, tamanho **12pt** (24 half-points)
- Alinhamento do corpo: **Justificado (both)**
- Espaçamento entre linhas: **1,5 linhas** (line: 360)
- Recuo de primeira linha nos parágrafos do corpo: **2 cm** (1134 twips)
- Página: **A4** (11906 x 16838 twips)
- Margens: superior 1701, direita 1134, inferior 1134, esquerda 1701

### Estrutura do Cabeçalho Timbrado (Header)
O header aparece apenas na primeira página e contém uma tabela de 2 colunas sem bordas visíveis.
- Coluna 1 (1668 twips): Logo do escritório (imagem JPEG, 870x781 EMU). Se a logo não estiver disponível como arquivo, omitir a tabela e usar apenas o texto centralizado.
- Coluna 2 (7620 twips): Texto centralizado com "ADVOCACIA PREVIDENCIÁRIA" em Bell MT, negrito, 24pt (48 half-points), seguido de "DR. PAULO ROBERTO TERCINI FILHO" e "OAB/SP 331.110" em Arial Unicode MS
- Abaixo da tabela: linha horizontal (border-bottom)

### Estrutura do Rodapé (Footer)
Aparece apenas na primeira página, centralizado.
- "Rua Rui Barbosa, nº. 663, Centro, Monte Alto – SP"
- "Tel: 16-3242-2908 – Cel: 16-98140-9271"

## Estrutura do Documento

### 1. Destinatário
Alinhamento esquerdo, sem recuo. Nome da empresa em negrito com "A/C" antes. CNPJ e endereço em linhas separadas abaixo.

### 2. Título
"SOLICITAÇÃO DE RETIFICAÇÃO DE PPP" — centralizado, negrito, 14pt.

### 3. Qualificação e Objeto
Parágrafo único com recuo de 2cm. Nome do segurado em NEGRITO, seguido de dados pessoais (nacionalidade, data de nascimento, RG, CPF, endereço), período do vínculo na empresa, referência ao PPP emitido (data de emissão em negrito), e fundamento legal genérico (§6º do art. 281 e art. 279 da IN 128/2022).

### 4. Pedidos Numerados
Cada pedido em subseção numerada (1, 2, 3...). Título do pedido em negrito com recuo de 2cm. Parágrafos de fundamentação com recuo de 2cm. Os pedidos devem ser selecionados conforme os vícios identificados na auditoria.

### 5. Fundamento Legal de Fechamento
Dois parágrafos fixos ao final dos pedidos.
- O art. 279 da IN 128/2022 dispõe que serão aceitos o LTCAT e os laudos emitidos em data anterior ou posterior ao período de exercício da atividade do segurado, desde que a empresa informe expressamente que não houve alteração no ambiente de trabalho.
- O §6º do art. 281 determina que o PPP deve ser atualizado quando solicitado pelo trabalhador.
- A pretensão de retificação e entrega do PPP é imprescritível (Tema 132/TST, IRR, j. 16/05/2025).

### 6. Local e Data
"Monte Alto – SP, ___ de _______________ de [ano]."

### 7. Assinaturas
Duas linhas centralizadas. Primeira para o advogado (PAULO ROBERTO TERCINI FILHO, OAB/SP 331.110). Segunda para o segurado (nome em negrito, CPF).

### 8. Recebimento
Alinhamento esquerdo. "Recebido por: _______________________" e "Data: ____/____/________".

## Catálogo de Pedidos

A skill mantém um catálogo de pedidos-tipo que devem ser selecionados conforme os vícios identificados pela auditoria de PPP. Cada pedido pode ser utilizado isoladamente ou combinado com outros.

### P1. Inclusão de agentes nocivos omitidos (campo 15.3)
Usar quando a auditoria identificar agentes presentes na atividade mas não declarados no PPP.
Fundamentar com a descrição das atividades da profissiografia (campo 14.2), o CNAE da empresa, e a natureza dos agentes omitidos (sílica cristalina, calor radiante, fumos metálicos, agentes químicos, etc.).
Se o agente for cancerígeno do Grupo 1 da LINACH, mencionar expressamente a avaliação qualitativa e a irrelevância do EPI.
Solicitar que a retificação seja feita ainda que com base em laudo extemporâneo (art. 279 IN 128/2022).

### P2. Identificação da grandeza NEN no campo 15.4
Usar quando o campo 15.4 registra valor de ruído em dB(A) sem identificar a grandeza (NEN, LAVG, NPS).
Fundamentar que a ausência da grandeza NEN impede a aceitação do PPP na via administrativa (Comunicado CRPS 99/2025).
Solicitar que o campo 15.4 passe a indicar expressamente "NEN" antes do valor numérico, quando a medição tiver sido por dosimetria.
Se a medição não tiver sido por dosimetria, solicitar nova avaliação ambiental com apuração do NEN pela NHO-01.

### P3. Correção da técnica utilizada (campo 15.5)
Usar quando o campo 15.5 indicar NR-15 isoladamente para ruído em períodos posteriores a 18/11/2003, sem referência à NHO-01 nem ao NEN.
Fundamentar que a NR-15 é norma regulamentadora, não técnica de medição, e que a indicação isolada não identifica a grandeza apurada.
Solicitar a retificação para indicar a metodologia efetivamente utilizada (NHO-01 se dosimetria com Q=3, ou NR-15 com NEN se dosimetria com Q=5).

### P3-A. Remoção da referência à NR-15 quando já consta NHO-01/NHO-06
Usar quando o campo 15.5 indicar simultaneamente NHO-01 (ou NHO-06) e NR-15, gerando ambiguidade sobre parâmetros de medição.
Para ruído, fundamentar que a NHO-01 e a NR-15 possuem parâmetros conflitantes (Q=3/NLI=80 vs Q=5/NLI=85) e que a indicação simultânea gera ambiguidade.
Para calor, NÃO pedir a remoção da NR-15 Anexo 3, pois a NHO-06 e a NR-15 Anexo 3 são complementares (mesma grandeza IBUTG, sem parâmetros conflitantes).
Solicitar que o campo 15.5 passe a constar exclusivamente "NHO-01" para ruído.

### P4. Correção de dados cadastrais
Usar quando houver erro em campos administrativos (data de nascimento, nome, CPF, data de admissão, data de saída, CNPJ, etc.).
Indicar o campo errado, o valor incorreto e o valor correto, com referência ao documento comprobatório (CNH, CTPS, RG, PPP de outra empresa).

### P5. Declaração no campo Observações (art. 279 IN 128/2022)
Usar SEMPRE como pedido final em toda solicitação de retificação.
Solicitar que conste expressamente no campo Observações se houve ou não alteração no ambiente de trabalho ao longo do tempo.
Fundamentar com o art. 279 da IN 128/2022.

### P6. Correção do campo 15.4 por curva de atenuação do EPI
Usar quando o valor de intensidade/concentração no campo 15.4 já desconta a atenuação do EPI (ex. "96-17=79 dB(A)" ou valor implausível para a atividade).
Fundamentar com o Tema 555/STF (ARE 664.335). O PPP deve registrar o nível de exposição ao agente nocivo, não o nível residual após atenuação.
Solicitar que o campo 15.4 registre o valor bruto de exposição.

### P7. Correção do campo 15.7 (EPI eficaz) e campo 15.8 (CA)
Usar quando a empresa declarar EPI como eficaz (S) sem informar o número do CA no campo 15.8.
Fundamentar que a declaração de eficácia sem CA é inverificável.
Solicitar a inclusão do número do CA ou a retificação do campo 15.7 para "N".

## Regras de Seleção de Pedidos

A seleção dos pedidos deve seguir a lógica da auditoria de PPP. Não incluir pedidos desnecessários.

O pedido P5 (Declaração no campo Observações) deve ser incluído em TODA solicitação de retificação, como último pedido.

Os pedidos P2 e P3 são mutuamente exclusivos em muitos casos. Se o PPP indica apenas "NR-15" sem NEN (Cenário A do Comunicado CRPS 99/2025), usar P2 (inclusão do NEN) e P3 (correção da técnica). Se o PPP indica "NHO-01" junto com "NR-15" e o campo 15.4 já tem NEN, usar P3-A (remoção da NR-15).

O pedido P1 (inclusão de agentes) é estrategicamente o mais importante, pois agentes cancerígenos (sílica, benzeno, etc.) dispensam toda a discussão sobre metodologia de medição de ruído.

## Interação com Outras Skills

A skill auditoria-ppp é pré-requisito. A retificação só é gerada após a auditoria identificar vícios que exijam correção pela empresa.

Quando a empresa se recusar a retificar, acionar a skill peticao-previdenciaria para ação de obrigação de fazer ou para produção de prova pericial na ação previdenciária. O Tema 132/TST garante a imprescritibilidade da pretensão.

Quando a retificação obtida alterar o cenário probatório na via administrativa, acionar a skill tema-1124-instrucao-administrativa para verificar o impacto nos efeitos financeiros.
