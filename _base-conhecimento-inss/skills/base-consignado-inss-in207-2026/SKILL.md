---
name: base-consignado-inss-in207-2026
description: "Novas regras do crédito consignado INSS vigentes desde 19/05/2026 (IN 207/2026 e MP 1.355/2026): biometria facial obrigatória no Meu INSS, margem reduzida a 40% (35% para BPC), prazo máximo de 108 parcelas, carência de até 90 dias, vedação de contratação por telefone ou por terceiros. Use SEMPRE que mencionar consignado INSS, empréstimo consignado aposentado, empréstimo pensionista INSS, margem consignável INSS, biometria consignado, contratação consignado, crédito consignado benefício, cartão benefício INSS, cartão crédito consignado, desconto em folha INSS, IN 207 2026, MP 1355 2026, limite consignado, cancelamento consignado biometria, fraude consignado INSS, portabilidade consignado, prazo consignado 108 parcelas. Cruza com base-meu-inss-pat-gerid-fluxo, base-portarias-dpmf-inss-hub e base-dano-moral-previdenciario."
---

# Crédito Consignado INSS — Novas Regras IN 207/2026

## 1. Marco normativo

Instrução Normativa PRES/INSS nº 207, de 19 de maio de 2026, publicada no DOU Extra B, Seção 1, p. 2, em 19 de maio de 2026. A IN 207 altera a Instrução Normativa PRES/INSS nº 138, de 10 de novembro de 2022, que disciplina critérios e procedimentos operacionais relativos à consignação de descontos para pagamento de crédito consignado contraído nos benefícios pagos pelo INSS.

Medida Provisória nº 1.355/2026 (legislação de base sancionada no início de 2026) e legislação ordinária subsequente fundamentam as alterações de natureza legal das quais a IN 207 deriva os comandos operacionais.

Vigência: 19 de maio de 2026 (imediata à publicação).

## 2. Mudanças principais

### 2.1. Biometria facial obrigatória

A partir de 19 de maio de 2026, toda nova contratação de crédito consignado exige validação por reconhecimento facial do beneficiário, realizada exclusivamente pelo próprio segurado no aplicativo Meu INSS ou no site meu.inss.gov.br.

O prazo para realizar a biometria é de cinco dias corridos contados da data em que a proposta aparecer no Meu INSS do segurado. O descumprimento do prazo gera cancelamento automático da operação pelo sistema.

É vedada a contratação de consignado por telefone ou por intermédio de terceiros, independentemente de procuração. A proibição de intermediação tem por finalidade bloquear esquemas de fraude que levavam segurados a contrair empréstimos sem conhecimento ou consentimento pleno.

### 2.2. Nova margem consignável

A margem consignável máxima foi reduzida de 45% para 40% do valor do benefício, observado o seguinte detalhamento:
- Até 35% destinados a empréstimos, financiamentos e arrendamento;
- Até 5% destinados a cartão de crédito consignado;
- Até 5% destinados a cartão benefício;
- Limite global de 40%, vedando que a soma de todas as modalidades ultrapasse esse percentual.

Para beneficiários de BPC/LOAS, a margem consignável é de 35% do valor do benefício.

### 2.3. Prazo máximo de pagamento e carência

O prazo máximo de pagamento aumentou de 96 para 108 parcelas mensais (9 anos).

É permitida carência de até 90 dias antes do início das parcelas, contados da data de contratação.

### 2.4. Vedação de contratação por terceiros

A legislação proíbe expressamente a contratação de consignado por telefone ou por intermediário, mesmo com procuração. A biometria no Meu INSS é requisito intransferível.

## 3. Hipóteses de aplicação

O segurado quer contratar novo empréstimo consignado: verificar se o saldo disponível de margem (40% do benefício menos tudo que já está consignado) comporta a nova operação; orientar sobre a biometria dentro de 5 dias; alertar que ligações ou propostas de terceiros são ilegais.

O segurado relata desconto não autorizado em benefício: identificar o credor no PAT/Meu INSS; verificar se houve contratação indevida por terceiro (fraude); encaminhar denúncia ao INSS, Ouvidoria e, se fraude confirmada, registrar boletim de ocorrência.

O segurado informa que recebeu proposta de consignado por ligação telefônica: alertar que é prática ilegal desde 19/05/2026; se já assinou algo, orientar a contestar no Meu INSS e acionar Ouvidoria.

O segurado quer renegociar ou fazer portabilidade de consignado: as novas regras de margem se aplicam ao contrato novado; verificar se a nova parcela não excede o limite de 40%.

## 4. Riscos e armadilhas

Esquemas de fraude persistem mesmo após a vedação legal, com grupos criminosos tentando capturar biometria do segurado de forma enganosa. O advogado deve orientar o cliente a nunca compartilhar login do Gov.br e nunca realizar biometria a pedido de terceiro.

O prazo de 5 dias para biometria é fatal. Se o cliente demorar, o contrato é cancelado e o dinheiro não é liberado. Não há prorrogação automática.

A margem de 40% é global. Clientes que já têm contratos acima de 40% firmados antes da nova regra podem ter os contratos existentes preservados (direito adquirido contratual), mas novos contratos estarão limitados ao saldo disponível dentro do novo teto.

## 5. Estratégia administrativa

Para cliente com fraude de consignado: protocolar no Meu INSS serviço de "Comunicar Irregularidade no Benefício"; acionar Ouvidoria do INSS via Fala.BR; solicitar bloqueio imediato do desconto via PAT; registrar boletim de ocorrência para instruir eventual ação de dano moral.

Para cliente que não conseguiu fazer biometria no prazo: verificar se o contrato foi de fato cancelado no PAT; se cancelado e o cliente ainda deseja o empréstimo, iniciar nova solicitação com orientação expressa sobre o prazo de 5 dias.

## 6. Estratégia judicial

Fraude em consignado dá ensejo a ação de reparação de dano moral cumulada com restituição dos valores descontados indevidamente, com ré solidária entre a instituição financeira e, em alguns casos, o INSS (quando houve falha no sistema de proteção). JEF é competente para causas até 60 salários mínimos. Skill `base-dano-moral-previdenciario`.

Recusa do INSS em bloquear desconto fraudulento após protocolo regular pode ensejar mandado de segurança. Skill `base-ms-cabimento-direito-liquido-certo`.

## 7. Integração com outras skills do escritório

- `base-meu-inss-pat-gerid-fluxo` para acesso ao PAT e comunicação de irregularidade
- `base-portarias-dpmf-inss-hub` para o hub normativo geral do INSS
- `base-dano-moral-previdenciario` para ação reparatória em caso de fraude
- `base-ms-cabimento-direito-liquido-certo` para MS em caso de recusa de bloqueio

## 8. Link oficial da norma fonte

IN PRES/INSS nº 207/2026: https://www.in.gov.br/en/web/dou/-/instrucao-normativa-pres-inss-n.-207-de-19-de-maio-de-2026
