---
name: decadencia-revisao-previdenciaria
description: "Skill de decadência do art. 103 da Lei 8.213/91, prazos decadenciais autônomos e alerta de esgotamento de prazo. Use SEMPRE que mencionar decadência, art. 103, prazo decadencial, 10 anos para revisar, Tema 975/STJ, Tema 256/TNU, Tema 1370/STJ, IAC 11/TRF4, ADI 6096/STF, pedido de revisão administrativa, interrupção de decadência, prazos autônomos, revisão de benefício concedido há mais de 10 anos, perda do direito de revisão, ou análise de viabilidade de revisão com contagem de prazo. Use quando informar data de concessão (DIB, DER, primeiro pagamento) para verificar esgotamento. Use quando qualquer skill de petição ou auditoria envolver revisão de benefício já concedido. SEMPRE alertar quando prazo estiver a menos de 12 meses. Fonte primária sobre estratégia contra decadência."
---

# Decadência Revisional Previdenciária – Art. 103 da Lei 8.213/91

## Finalidade

Esta skill consolida as regras de decadência aplicáveis à revisão de benefícios previdenciários do RGPS, com ênfase na controvérsia entre prazos decadenciais autônomos (Tema 256/TNU e IAC 11/TRF4) versus prazo único (tendência do STJ), e estabelece procedimentos obrigatórios de alerta quando o prazo estiver próximo do esgotamento.

## ALERTA OBRIGATÓRIO DE PRAZO

### Quando emitir alerta

SEMPRE que o usuário informar dados de um caso concreto envolvendo revisão de benefício já concedido, a skill deve calcular automaticamente o prazo decadencial e emitir alerta visual conforme a seguinte classificação

**ALERTA VERMELHO – PRAZO CRÍTICO (menos de 6 meses para o esgotamento)**
Informar que o prazo decadencial está em situação crítica. Recomendar ajuizamento imediato e, simultaneamente, protocolo de pedido de revisão administrativa como cautela adicional. Indicar que qualquer atraso pode resultar em perda irreversível do direito.

**ALERTA LARANJA – PRAZO EM RISCO (entre 6 e 12 meses para o esgotamento)**
Informar que o prazo decadencial está em zona de risco. Recomendar providências urgentes para instrução documental e definição de estratégia (administrativa ou judicial). Não postergar decisão sobre judicialização.

**ALERTA AMARELO – PRAZO EM ATENÇÃO (entre 12 e 24 meses para o esgotamento)**
Informar que o prazo decadencial exige atenção. Recomendar início de instrução documental e análise de viabilidade revisional.

**SEM ALERTA (mais de 24 meses)**
Informar o prazo restante e prosseguir normalmente.

### Como calcular o prazo

O prazo decadencial de 10 anos conta do dia primeiro do mês seguinte ao do recebimento da primeira prestação (art. 103, caput, Lei 8.213/91, redação da Lei 10.839/2004, restaurada pela ADI 6096/STF).

Para benefícios concedidos antes de 28/06/1997, o prazo conta a partir de 01/08/1997 (Tema 313/STF, RE 626.489/SE).

Se houve pedido de revisão administrativa dentro dos 10 anos, verificar a situação do segundo prazo conforme a seção "Controvérsia sobre Prazos Autônomos" abaixo.

### Dados mínimos necessários para cálculo

- Data de concessão ou DIB (Data de Início do Benefício)
- Data do primeiro pagamento (se diferente da DIB)
- Se houve pedido de revisão administrativa, a data do protocolo
- Se houve decisão sobre o pedido de revisão, a data da ciência
- Data atual

Se o usuário não informar todos os dados, solicitar expressamente antes de prosseguir.

## REGRA GERAL – DECADÊNCIA DECENAL

O art. 103, caput, da Lei 8.213/91 estabelece prazo decadencial de 10 anos para revisão do ato de concessão de benefício previdenciário. A tese firmada pelo Tema 975/STJ (REsp 1.648.336/RS e REsp 1.644.191/RS, rel. Min. Herman Benjamin, j. 11/12/2019) ampliou a incidência da decadência mesmo para questões não apreciadas no ato originário de concessão.

### Tese do Tema 975/STJ

"Aplica-se o prazo decadencial de dez anos estabelecido no art. 103, caput, da Lei 8.213/1991 às hipóteses em que a questão controvertida não foi apreciada no ato administrativo de análise de concessão de benefício previdenciário."

### Consequências práticas do Tema 975

O segurado não pode alegar que a matéria nunca foi submetida ao INSS para escapar da decadência. Mesmo tempo especial, tempo rural, melhor benefício ou qualquer outro elemento não analisado no ato de concessão está sujeito ao prazo decenal.

### Natureza do prazo

O STJ qualifica o prazo do art. 103 como decadencial stricto sensu. O Min. Herman Benjamin afirmou no Tema 975 que não se aplicam ao prazo decadencial as normas que impedem, suspendem ou interrompem a prescrição, salvo expressa determinação legal (art. 207 do Código Civil). Esta premissa é central para a controvérsia sobre prazos autônomos.

## EXCEÇÕES À DECADÊNCIA

### Concessão originária de benefício

Não existe prazo decadencial para a concessão inicial de benefício previdenciário (Tema 313/STF, RE 626.489/SE). Se o segurado nunca teve o benefício concedido (indeferimento, cancelamento ou cessação), o fundo de direito está preservado pela ADI 6096/STF (j. 13/10/2020, rel. Min. Edson Fachin, 6x5), que declarou inconstitucional o art. 24 da Lei 13.846/2019.

### Distinção entre revisão e concessão

Se a pretensão do segurado é a concessão de benefício diverso (por exemplo, converter aposentadoria por tempo de contribuição em aposentadoria especial), pode-se argumentar que se trata de concessão originária e não de revisão. Essa tese tem aceitação parcial e deve ser avaliada caso a caso.

### Revisões determinadas por lei

A decadência não se aplica a revisões impostas por determinação legal (ex. art. 26 da Lei 8.870/94). Esse entendimento constava expressamente da IN 45/2010 do INSS.

## CONTROVÉRSIA SOBRE PRAZOS AUTÔNOMOS – SITUAÇÃO CRÍTICA EM 2025-2026

### O que diz o Tema 256 da TNU (posição favorável ao segurado)

Tese firmada em 27/05/2021 (PEDILEF 5003556-15.2011.4.04.7008/PR, relator para acórdão Juiz Federal Fábio de Souza Silva)

Existem dois prazos decadenciais distintos e autônomos de 10 anos. O primeiro corre contra o ato original de concessão (contado do primeiro pagamento). O segundo corre contra o ato de indeferimento do pedido de revisão administrativa (contado da ciência da decisão administrativa). O segundo prazo somente aproveita às matérias efetivamente suscitadas no requerimento administrativo revisional.

### O IAC 11 do TRF4 reforçou a mesma tese

Julgado em 26/06/2024 pela 3ª Seção do TRF4 (processo 5031598-97.2021.4.04.0000/RS, relator para acórdão Des. Fed. Paulo Afonso Brum Vaz). Acrescentou que o prazo do segundo ato sequer começa a correr enquanto o INSS não decidir expressamente o pedido de revisão.

### A reação contrária do STJ (posição desfavorável ao segurado)

O STJ, por decisões monocráticas, vem negando a existência do segundo prazo autônomo. O precedente mais relevante é o REsp 2.199.944/RS (Min. Francisco Falcão, decisão monocrática de 17/03/2025), que afirmou que a tese dos prazos autônomos equivale a uma "verdadeira interrupção do prazo decadencial decorrente do pedido de revisão administrativa", incompatível com o art. 207 do Código Civil e com a lógica do Tema 975/STJ.

### O Tema Repetitivo 1370 do STJ (pendente – definirá a questão)

Afetado em 12/08/2025 pela 1ª Seção do STJ (REsp 2.178.138/SC e REsp 2.205.049/RS, rel. Min. Gurgel de Faria). Suspensão nacional de todos os recursos sobre a matéria. Questão submetida a julgamento, na literalidade

"Interpretação do art. 103, caput, I e II, da Lei n. 8.213/1991 à luz das redações introduzidas pela Lei n. 10.839/2004 e a Lei n. 13.846/2019, de modo a aferir a existência, ou não, de prazos de decadência distintos e autônomos para revisar (i) o ato de concessão e (ii) o ato de deferimento ou indeferimento de pedido administrativo de revisão de benefícios previdenciários."

O julgamento está previsto para 2026. Até março de 2026, não há decisão colegiada do STJ sobre a matéria. Todas as manifestações contrárias foram monocráticas.

### PUIL 3687/PR

Pedido de Uniformização de Interpretação de Lei interposto contra o acórdão paradigma do Tema 256 da TNU. Pendente de julgamento pela 1ª Seção do STJ. Pode ser parcialmente prejudicado pelo Tema 1370.

## ESTRATÉGIA DEFENSIVA OBRIGATÓRIA DO ESCRITÓRIO

### Regra de ouro para casos de revisão

Em todo caso de revisão de benefício previdenciário, adotar as seguintes condutas como padrão do escritório

**1. Calcular imediatamente o prazo decadencial** a partir da data do primeiro pagamento (ou de 01/08/1997 para benefícios anteriores à MP 1.523-9/1997). Emitir alerta conforme classificação acima.

**2. Se o prazo original de 10 anos ainda está vigente**, instruir o requerimento administrativo com toda a documentação disponível antes de ajuizar ação. Isso preserva a DER como marco dos efeitos financeiros e evita problemas com o Tema 1124/STJ.

**3. Se o prazo original de 10 anos está próximo do esgotamento (menos de 12 meses)**, providenciar SIMULTANEAMENTE

- Protocolo de pedido de revisão administrativa formal, por escrito, com toda a documentação, especificando claramente as matérias objeto da revisão
- Ajuizamento de ação judicial

O pedido administrativo visa criar o fato gerador do segundo prazo autônomo (caso o Tema 1370 preserve a tese da TNU). O ajuizamento simultâneo visa proteger o segurado caso o STJ negue o segundo prazo.

**4. Se o prazo original de 10 anos já se esgotou**, verificar obrigatoriamente

- Se houve pedido de revisão administrativa dentro dos 10 anos (se sim, quando e sobre quais matérias)
- Se o INSS decidiu o pedido de revisão (se sim, quando o segurado foi cientificado)
- Se é possível enquadrar a pretensão como concessão originária (e não revisão)
- Se há fundamento para afastar a decadência (ADI 6096, Tema 313/STF)

**5. Documentar tudo**. Guardar comprovante de protocolo do pedido de revisão administrativa com data, protocolo e objeto. Em caso de silêncio do INSS, registrar a ausência de resposta.

### Cautelas específicas sobre o Tema 1370

Enquanto o Tema 1370 não for julgado, o escritório deve

- Não confiar exclusivamente na tese dos prazos autônomos para postergar o ajuizamento de ação
- Tratar a tese como argumento subsidiário, não como garantia
- Alertar expressamente o cliente sobre a incerteza jurídica
- Em petições, fundamentar a viabilidade da revisão tanto pela tese dos prazos autônomos (Tema 256/TNU, IAC 11/TRF4) quanto por argumentos alternativos (concessão originária, matéria não apreciada, ADI 6096)

## INTERAÇÃO COM OUTRAS SKILLS

### Com a skill peticao-previdenciaria

Ao redigir petição de revisão de benefício, esta skill deve ser consultada ANTES para verificar se há decadência e emitir o alerta correspondente. Se houver risco de decadência, a petição deve conter fundamentação específica sobre o tema.

### Com a skill tema-1124-instrucao-administrativa

O Tema 1124/STJ impacta diretamente os efeitos financeiros da revisão. Se a revisão foi ajuizada com documentação não apresentada na via administrativa, os efeitos financeiros podem ser deslocados da DER para a citação. A conjugação dos Temas 1124 e 975 exige atenção redobrada.

### Com a skill auditoria-sentenca-acordao

Ao auditar sentenças ou acórdãos que reconheceram ou negaram decadência, verificar se a fundamentação está alinhada com o estado atual da controvérsia (especialmente a suspensão nacional pelo Tema 1370).

## QUADRO NORMATIVO DE REFERÊNCIA

| Fonte | Conteúdo | Status |
|---|---|---|
| Art. 103, caput, Lei 8.213/91 | Prazo decadencial de 10 anos para revisão | Vigente (redação Lei 10.839/2004, restaurada pela ADI 6096) |
| Art. 207, Código Civil | Decadência não se suspende nem se interrompe | Vigente |
| Tema 313/STF (RE 626.489) | Não há decadência para concessão inicial | Vigente |
| ADI 6096/STF | Inconstitucionalidade da decadência para indeferimento/cessação | Vigente |
| Tema 975/STJ | Decadência incide mesmo sobre matéria não apreciada | Vigente |
| Tema 256/TNU | Prazos autônomos para ato de concessão e ato de revisão | Em xeque pelo Tema 1370 |
| IAC 11/TRF4 | Prazos autônomos (alinhado ao Tema 256) | Em xeque pelo Tema 1370 |
| Tema 1370/STJ | Definirá existência ou não de prazos autônomos | Afetado em 12/08/2025, suspensão nacional, pendente |
| PUIL 3687/PR | Uniformização contra Tema 256 | Pendente |
| REsp 2.199.944 (Min. Falcão) | Nega prazos autônomos (monocrática) | Decisão de 17/03/2025 |
