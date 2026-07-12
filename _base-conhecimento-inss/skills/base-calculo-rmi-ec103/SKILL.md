---
name: base-calculo-rmi-ec103
description: "Cálculo da RMI pós EC 103/2019, ótica exclusiva do segurado. Use SEMPRE que mencionar cálculo RMI EC 103, art. 26 EC 103, média 100% PBC, 60% mais 2% ano excedente, divisor mínimo art. 26 §6º, renda mensal inicial pós-reforma, salário-de-benefício pós EC 103, RMI pedágio 100%, RMI 100% média, fator previdenciário afastado regra nova, Tema 1102 STF e modulação, revisão da vida toda, afastar regra 80% maiores, art. 29 Lei 8.213, RMI auxílios, pensão por morte pós-reforma, cálculo B31 B91 B92 B94 pós-reforma, benefícios acima do teto, Tema 1070 STJ concomitantes, Tema 862 STJ auxílio-acidente, Súmula 557 STJ teto. Postura pró-segurado, Portaria 990/2022, Portaria 1.316/2025, Portaria 991/2022 (Livro II - cálculo do reconhecimento), IN 128/2022. Cruza com peticao-previdenciaria, precedentes-previdenciarios, revisao-peticao, base-aposentadoria-transicao-ec103, base-aposentadoria-regra-permanente-ec103, impugnacao-cumprimento-concomitantes e base-legislacao-fontes-primarias."
---

# Cálculo da RMI Pós EC 103/2019

## Escopo

Skill temática pró-segurado do acervo do escritório Paulo Roberto Tercini Filho. Orienta o cálculo da Renda Mensal Inicial (RMI) dos benefícios concedidos sob as regras da EC 103/2019 e a fiscalização crítica da RMI apurada pelo INSS, com foco exclusivo na maximização do valor devido ao segurado.

## Marco normativo central

EC 103/2019, art. 26. Fixa a nova fórmula de cálculo. Média aritmética simples dos salários de contribuição desde julho de 1994 ou desde a filiação se posterior. Aplica-se 60% da média mais 2% por ano que exceder 20 anos (homem) ou 15 anos (mulher) de contribuição.

EC 103/2019, art. 26, §6º. Faculdade PRÓ-SEGURADO de excluir do cálculo as contribuições que reduzam o benefício, mantido o tempo mínimo. O divisor mínimo de 108 contribuições é o art. 135-A da Lei 8.213/91 (Lei 14.331/2022).

EC 103/2019, art. 26, §2º. A RMI não pode ser inferior ao salário mínimo nem superior ao teto do RGPS.

Constituição Federal, art. 201, §2º. Irredutibilidade do valor do benefício e do teto constitucional.

Lei 8.213/91, art. 29 (para benefícios pré-reforma) e art. 29-C (professor pré-reforma).

Portaria DPMF/INSS 990/2022 (alterada pela Portaria 1.316/2025). Indicadores do CNIS, formulários RAC e regras operacionais.

Portaria DPMF/INSS 992/2022. Manutenção de benefícios, folha de pagamento, descontos, suspensão e cessação (Livro III).

## Regra permanente e pedágio 100%

Na regra permanente e nas transições por pontos e idade progressiva, aplica-se o art. 26 da EC 103 (60% + 2% por ano excedente a 20/15). O pedágio de 50% (art. 17) NÃO segue essa regra: a RMI é a média de 100% dos salários multiplicada pelo fator previdenciário; o pedágio de 100% (art. 20) garante 100% da média.

No pedágio de 100% (art. 20), aplica-se integralidade. A RMI corresponde a 100% da média aritmética simples das contribuições.

## Benefícios por incapacidade pós-reforma

B31 (auxílio por incapacidade temporária) pós-reforma. 91% da média.

B91 (aposentadoria por incapacidade permanente) pós-reforma. 60% da média mais 2% por ano excedente a 20 (homem) ou 15 (mulher), exceto quando decorrer de acidente de trabalho, quando a RMI é 100% da média (art. 26 §3º II EC 103).

B92 (aposentadoria por incapacidade permanente acidentária). 100% da média. Manter auditoria de NTEP para conversão B31 para B91 acidentária. Acionar `ntep-nexo-acidentario`.

B94 (auxílio-acidente) pós-reforma. Permanece em 50% do salário-de-benefício, conforme art. 86 da Lei 8.213/91 e regulamentação específica. Acionar `auxilio-acidente-b94`.

## Pensão por morte pós-reforma

Art. 23 da EC 103. RMI da pensão é de 50% do valor da aposentadoria do segurado falecido mais 10% por dependente, limitada a 100%. Afasta a regra anterior de 100% fixo.

Atenção crítica. A cota familiar de 50% gera RMI final entre 60% e 100% conforme o número de dependentes. Em caso de dependente único, a RMI é de 60%, o que pode ser inferior ao valor que a família dependia. Estratégia de inclusão de todos os dependentes elegíveis (filhos menores, dependentes inválidos) é fundamental.

## Cenários operacionais pró-segurado

Primeiro, segurado com 35 anos de contribuição na regra dos pontos (art. 15). RMI = 60% + 2% × 15 (anos excedentes a 20) = 90% da média.

Segundo, segurada com 30 anos de contribuição na regra de idade progressiva. RMI = 60% + 2% × 15 (anos excedentes a 15) = 90% da média.

Terceiro, segurado com 36 anos no pedágio de 50%: RMI = média × fator previdenciário (art. 17, parágrafo único) — simular o fator; não se aplica o 60% + 2%.

Quarto, segurado no pedágio de 100%. RMI = 100% da média, vantagem tangível em perfis de alta remuneração.

Quinto, aposentadoria por incapacidade permanente (B91) sem caráter acidentário. RMI = 60% + 2% por ano excedente. Verificar possibilidade de conversão para B92 acidentária, elevando para 100%. Acionar `auditoria-laudo-pericial` e `ntep-nexo-acidentario`.

Sexto, pensão por morte com 3 dependentes. RMI = 50% + 10% × 3 = 80% do valor da aposentadoria do falecido (ou do valor que ele receberia se fosse se aposentar por incapacidade na data do óbito).

## Regra e estratégia

Verificar salários de contribuição mais altos em momentos específicos (horas extras habituais, comissões) — atenção: o 13º salário NÃO integra o salário de benefício desde a Lei 8.870/94 (art. 29, §3º).

Afastar descarte indevido dos 80% maiores salários. A regra da Lei 9.876/99 de descarte dos 20% menores foi afastada pela EC 103 para benefícios pós-reforma. A fórmula é 100% das contribuições, o que pode ser mais vantajoso para perfis com muitos salários altos.

Atenção ao divisor mínimo do art. 26 §6º. O divisor é 100% das competências desde julho de 1994 ou da filiação, o que pode gerar média inferior se houve muitas contribuições em valores baixos. Em revisões, a análise do divisor é crítica.

## Integração com outras skills

Ao redigir peça, acione `peticao-previdenciaria`.
Ao comparar regras, acione `base-aposentadoria-transicao-ec103` e `base-aposentadoria-regra-permanente-ec103`.
Ao verificar CNIS, acione `cnis-acerto-indicadores`.
Ao auditar cumprimento de sentença, acione `impugnacao-cumprimento-concomitantes`.
Ao buscar jurisprudência, acione `precedentes-previdenciarios`.
Ao revisar peça, acione `revisao-peticao`.

## Alertas

Primeiro, cálculos de RMI exigem CNIS completo. Sem CNIS, não há como apurar valor correto. Solicitar sempre a Carta de Concessão com demonstrativo de cálculo pelo Meu INSS.

Segundo, benefícios acima do teto do RGPS sofrem limitação. A RMI é calculada normalmente mas o valor mensal é reduzido ao teto. Em revisões, cuidado com o teto vigente à época da DIB.

Terceiro, contribuições abaixo do mínimo após EC 103 exigem complementação, nos termos do §14 do art. 195 da CF com redação da EC 103. Acionar `contribuicoes-complementacao-ec103`.

## Hub de portarias administrativas

Hub das Portarias DPMF/DIRBEN/INSS aplicáveis a este benefício. Acionar `base-portarias-dpmf-inss-hub` para identificar quais Portarias regem o procedimento administrativo, o cálculo, as ratificações e os recursos no caso concreto.

## Doutrina de apoio

Frederico Amado, em Direito Previdenciário, sustenta a análise crítica do cálculo pós-reforma e defende o afastamento da regra dos 80% maiores.

Hugo Goes, em Manual, detalha a nova fórmula e adverte para a necessidade de simulação detalhada em cada caso.

Fábio Zambitte Ibrahim, em Curso, critica a redução do percentual base de 70% para 60% e defende o aproveitamento integral do tempo excedente.

Wladimir Novaes Martinez analisa a cota familiar da pensão por morte e defende a inclusão ampla de dependentes elegíveis.

O IBDP sustenta institucionalmente o direito do segurado à transparência no cálculo e à revisão quando detectada fragilidade na média.

## O que NÃO está nesta skill

Não estão aqui o direito adquirido pré-reforma, as regras de transição ou a regra permanente, que são objeto de skills específicas. Não está aqui a revisão da vida toda em benefícios concedidos antes de 13 de novembro de 2019, objeto de skill própria. Não estão aqui as peculiaridades do benefício assistencial BPC, sem RMI pela fórmula do art. 26 EC 103.
