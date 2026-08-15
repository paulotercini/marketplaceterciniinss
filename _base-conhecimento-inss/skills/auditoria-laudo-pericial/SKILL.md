---
name: auditoria-laudo-pericial
description: "Skill para auditoria técnica de laudos periciais previdenciários. Use SEMPRE que enviar laudo pericial para análise, revisão, impugnação ou contestação. Use quando mencionar analisar laudo, revisar perícia, impugnar laudo, contestar perícia, problemas no laudo, contradições na perícia, laudo pericial, perícia médica, perito, quesitos, laudo do INSS, perícia judicial, parecer técnico contrário, ou análise crítica de laudos médicos em contexto previdenciário. Abrange laudos de incapacidade laboral (auxílio-doença, aposentadoria por invalidez, auxílio-acidente) e laudos de avaliação de deficiência (BPC/LOAS). Funciona com laudo isolado ou com cruzamento de documentos médicos. Teleperícia, laudo videoconferência, Portaria DPMF/INSS 19/2026, auditoria laudo remoto, cerceamento Teleperícia. Inclui o Modo 3 de impugnação dirigida em 9 blocos (Onda 84), acionado por impugnação em 9 blocos, roteiro de impugnação, dupla camada assistente técnico, quesitos cirúrgicos, quesitos suplementares, pedido de esclarecimentos ao perito, pedido de nova perícia, falhas metodológicas do laudo, padrão técnico exigido, estrutura da impugnação, risco da impugnação. Inclui o Modo 3-A (Onda 107), acionado por juiz indeferiu quesitos, quesitos do juízo suprem, esclarecimentos indeferidos, laudo insuficiente, cerceamento na perícia, diagnóstico não é incapacidade. NÃO use para criação de petições, consultas genéricas sobre perícia ou análise de documentos que não sejam laudos periciais."
---

# Skill de Auditoria Técnica de Laudos Periciais Previdenciários

## Visão Geral

Esta skill realiza auditoria técnico-jurídica de laudos periciais previdenciários, identificando contradições, omissões, falhas metodológicas e vícios que fundamentem a impugnação ou o pedido de nova perícia. O resultado é um relatório em .docx formatado no padrão do escritório.

## Fluxo de Trabalho

1. Leia este SKILL.md completamente
2. Leia `references/CHECKLIST.md` para obter o checklist completo de auditoria
3. Leia `references/FUNDAMENTOS.md` para obter os fundamentos normativos
4. Receba o laudo pericial (PDF ou texto colado na conversa)
5. Se houver documentos médicos particulares, receba-os também
6. Execute a auditoria conforme o checklist
7. Gere o relatório em .docx usando a skill `peticao-previdenciaria` para formatação

## Regras Críticas

### Proibição Absoluta de Dois-Pontos
NUNCA utilize dois-pontos para introduzir explicações, listas ou conclusões. Reestruture sempre em frases independentes ou conectadas por conjunções.

### Honestidade Radical
Se o laudo for tecnicamente sólido e não apresentar vícios relevantes, diga isso com clareza. Não force achados inexistentes. Indique se a melhor estratégia é produzir prova técnica complementar (parecer de assistente técnico) em vez de impugnar.

### Verificação de Fontes
Todos os fundamentos normativos citados devem ser verificados. Nunca invente artigos, enunciados, súmulas ou precedentes. Se não houver base normativa para determinada crítica, apresente-a como argumento técnico, não como exigência legal.

### Tom e Estilo
A análise deve ser contundente, técnica e persuasiva. Opiniões firmes sem hesitação. Parágrafos curtos. Organização lógica.

### Trava de Verificação — DII, Carência e Preexistência
Antes de formular QUALQUER argumento sobre DII, isenção de carência ou contradição com benefício anterior, executar obrigatoriamente três checagens na seguinte ordem. Primeira, contar as contribuições válidas até a data da DII fixada pelo perito e registrar o número exato. Segunda, se a doença é anterior à filiação, verificar se há prova de agravamento posterior à filiação antes de invocar qualquer exceção (art. 59, parágrafo único, Lei 8.213/91). Terceira, se houver benefício anterior concedido para a mesma condição, verificar o rito de concessão (análise documental ou perícia presencial) antes de alegar contradição. Somente após essas três checagens é permitido formular argumentos sobre DII, carência ou contradição com decisão anterior.

## Tipos de Laudo

### Laudo de Incapacidade Laboral
Utilizado em processos de auxílio-doença (B31), aposentadoria por invalidez (B32/B92) e auxílio-acidente (B36/B94). A análise foca na existência, grau, duração e data de início da incapacidade, na relação entre a patologia e a capacidade para a atividade habitual, e nas condições pessoais do segurado.

### Laudo de Avaliação de Deficiência (BPC/LOAS)
Utilizado em processos de Benefício de Prestação Continuada. A avaliação segue o modelo biopsicossocial com base na Classificação Internacional de Funcionalidade (CIF), conforme a Lei 13.146/2015 e o Decreto 6.214/2007 (com alterações do Decreto 11.016/2022). A análise verifica se todos os domínios foram corretamente avaliados e se as barreiras ambientais e sociais foram consideradas.

## Modos de Operação

### Modo 1 – Varredura Técnica (laudo isolado)
Quando o usuário fornece apenas o laudo pericial, sem documentos médicos de confronto. A auditoria foca em contradições internas, omissões formais, falhas metodológicas e vícios de fundamentação.

### Modo 2 – Cruzamento Completo (laudo + documentos médicos)
Quando o usuário fornece o laudo pericial E documentos médicos particulares (atestados, laudos de especialistas, exames complementares, prontuários). A auditoria inclui tudo do Modo 1, acrescido do confronto entre as conclusões do perito e a prova documental médica.

### Modo 3 – Impugnação Dirigida em 9 Blocos (Onda 84)
Modo padrão sempre que o objetivo declarado for impugnar o laudo, pedir esclarecimentos, complementação ou nova perícia. Executa o roteiro operacional completo de `references/ROTEIRO-IMPUGNACAO-9-BLOCOS.md`, em dupla camada (assistente técnico conforme a natureza do laudo e advogado previdenciário do segurado), na ordem fixa. Falhas metodológicas com página exata, contradições internas no formato trecho A contra trecho B, confronto documental por ID, padrão técnico com norma nomeável por número, ano e órgão (sem certeza, "não localizado, verificar em fonte primária"), vícios jurídicos traduzidos para o CPC com marcação [CONFERIDO] ou [NÃO CONFIRMADO], verificações obrigatórias de carência, qualidade de segurado e DII, cinco a oito quesitos cirúrgicos vinculados às falhas, estrutura da peça com alternativa para cada negativa do juiz, e análise de risco com a resposta esperada do INSS. A saída segue as regras do roteiro (sem travessão, sem dois-pontos introduzindo lista, sem a estrutura "não é X, é Y", parágrafos de três a quatro linhas, linha final de auditoria anti-IA). Este modo se combina com o Modo 2 quando houver documentos médicos e com os critérios de Teleperícia quando o laudo for remoto.

### Modo 3-A – Quesitos Negados e Laudo Insuficiente (Onda 107)

Variante do Modo 3 para o cenário recorrente na Justiça Federal em que o juízo INDEFERE os quesitos antes da perícia, dizendo que os quesitos do Juízo suprem a extensão da prova, e depois indefere também os esclarecimentos e julga. Executa o arsenal de `references/QUESITOS-NEGADOS-E-LAUDO-INSUFICIENTE.md`, com seis argumentos ancorados no CPC (celeridade não substitui contraditório, incapacidade não é conceito exclusivamente médico, o perito não define a extensão do contraditório, o laudo judicial não tem presunção absoluta, diagnóstico não é avaliação de capacidade, e o conjunto probatório prevalece sobre conclusão isolada) e a escada processual de cinco degraus, do protesto no primeiro indeferimento ao prequestionamento.

Chave da variante. A distinção entre DIVERGÊNCIA de conclusão, que o juiz resolve pela livre convicção, e INSUFICIÊNCIA metodológica, que ele precisa sanar. A peça sustenta a segunda, nunca a primeira.

## Estrutura do Relatório de Auditoria

O relatório .docx deve seguir a formatação da skill `peticao-previdenciaria` (Bookman Old Style 12pt, justificado, espaçamento 1,5, cabeçalho timbrado) e conter as seguintes seções.

### Cabeçalho do Relatório
- Título centralizado, negrito: "RELATÓRIO DE AUDITORIA TÉCNICA – LAUDO PERICIAL"
- Abaixo: nome do segurado, número do processo, tipo de benefício, data da perícia

### 1. RESUMO DO LAUDO
Síntese objetiva contendo a patologia ou patologias identificadas pelo perito, a conclusão quanto à capacidade/incapacidade ou quanto à deficiência, a data de início fixada (DII/DID), o grau e a duração atribuídos, e eventuais observações relevantes do perito.

### 2. ACHADOS DA AUDITORIA
Organizados nas seguintes categorias (incluir apenas as categorias em que houver achados relevantes).

**2.1. Contradições Internas**
Inconsistências entre diferentes respostas do perito dentro do mesmo laudo.

**2.2. Omissões de Análise**
Documentos, patologias, exames ou alegações não analisados pelo perito.

**2.3. Falhas Metodológicas**
Inadequações no exame físico, na metodologia de avaliação ou no instrumental utilizado.

**2.4. Vícios de Fundamentação**
Conclusões sem justificativa técnica, especialmente quanto à DII, ao grau de incapacidade e à possibilidade de reabilitação.

**2.5. Desconsideração de Condições Pessoais**
Omissão da análise de idade, escolaridade, histórico laboral e viabilidade real de reinserção no mercado de trabalho (Súmula 47 da TNU).

**2.6. Divergência com Prova Documental** (apenas no Modo 2)
Confronto entre as conclusões do perito e os documentos médicos particulares do segurado.

### 3. FUNDAMENTOS PARA IMPUGNAÇÃO
Para cada achado relevante, o fundamento normativo ou técnico que sustenta a crítica. Artigos de lei, resoluções do CFM, enunciados do CRPS, súmulas da TNU, temas do STJ e do STF, conforme aplicáveis.

### 4. CONCLUSÃO E ESTRATÉGIA RECOMENDADA
Avaliação global do laudo e recomendação objetiva entre as seguintes opções (ou combinação delas).

- **Impugnação ao laudo** com pedido de nova perícia, indicando os pontos específicos que devem ser esclarecidos
- **Pedido de complementação** com quesitos suplementares direcionados aos vícios identificados
- **Apresentação de parecer de assistente técnico** quando a divergência é fundamentalmente médica e exige contraposição técnica
- **Aproveitamento do laudo** quando contém elementos favoráveis que a sentença/decisão não considerou adequadamente
- **Valoração do laudo como favorável** quando, apesar da conclusão formal, os dados clínicos descritos sustentam a tese do segurado

### 5. QUESITOS SUPLEMENTARES SUGERIDOS (quando aplicável)
Lista de quesitos direcionados às falhas identificadas, redigidos de forma a expor as inconsistências do laudo sem revelar a estratégia ao perito.

## Auditoria de laudo produzido por Teleperícia (Portaria DPMF/INSS 19/2026)

Quando o laudo for produzido por videoconferência no SAT Remoto (vigência a partir de 13/04/2026), aplicar os seguintes critérios adicionais de auditoria.

1. Verificar se o método remoto era compatível com o quadro clínico. Quadros que exigem palpação, mensuração de amplitude articular, ausculta, avaliação de força muscular ou observação de marcha são incompatíveis com videoconferência.
2. Verificar se o laudo registra que houve exame físico ou apenas observação visual via câmera. Se o laudo afirmar exame físico, é falso por impossibilidade material.
3. Verificar se houve registro de falha técnica durante a transmissão.
4. Verificar se o tempo de duração da Teleperícia é compatível com a complexidade do quadro.
5. Verificar se o perito teve acesso a todos os documentos digitalizados antes do início da videoconferência.
6. Verificar se há registro do Termo de Consentimento Livre e Esclarecido para Teleavaliação.
7. Verificar se o segurado teve oportunidade de recusar o método remoto.

A presença de qualquer desses vícios fundamenta impugnação por cerceamento de defesa, pedido de nova avaliação presencial e, em juízo, perícia judicial presencial.

## Referências

Antes de realizar a auditoria, leia obrigatoriamente o seguinte arquivo.

- `references/ROTEIRO-IMPUGNACAO-9-BLOCOS.md` – Roteiro operacional completo do Modo 3, com os 9 blocos, as regras de saída e a linha final de auditoria anti-IA (Onda 84)

Nota de manutenção (auditoria 25/07/2026). Os arquivos CHECKLIST.md e FUNDAMENTOS.md antes listados aqui nunca existiram na pasta references e a menção foi removida. A base normativa por tipo de vício vive nas skills `base-cpc-prova-pericial-arts464-480` (dispositivos do CPC), `base-validacao-formal-laudo-medico-checklist-ab` (regime CFM e checklists A e B) e `base-pericia-medica-federal-telepericia` (PMF e Teleperícia), que devem ser consultadas em conjunto.

## Método Fuzzy, verificação obrigatória (Onda 106)

Em TODO caso de aposentadoria PCD, por tempo de contribuição ou por idade, verificar se o Modelo Linguístico Fuzzy era aplicável e se foi aplicado. Três gatilhos, bastando um. Atividade do domínio sensível com 25 ou 50, ou todas com 75. Ausência de auxílio de terceiros sempre que necessário. Resposta positiva à pergunta emblemática do tipo de deficiência. Presente o gatilho, a menor pontuação do domínio sensível se replica para todas as atividades daquele domínio, o que muda a soma e pode mudar o GRAU (e com ele o multiplicador de conversão e o próprio direito).

A omissão é erro técnico frequente e atacável. Checklist, quesitos prontos e roteiro de impugnação em `base-pcd-if-bra-metodologia/references/METODO-FUZZY-APLICACAO-OBRIGATORIA.md`.
