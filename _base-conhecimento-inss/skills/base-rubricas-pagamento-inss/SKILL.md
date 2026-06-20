---
name: base-rubricas-pagamento-inss
description: Catálogo consolidado das rubricas de pagamento de benefícios previdenciários e assistenciais do INSS conforme Anexo IX da Portaria DIRBEN/INSS 992/2022 (Livro III - Manutenção de Benefícios). Use SEMPRE que envolver pagamento de benefício, leitura ou análise de HISCRE (Histórico de Créditos), CONCAL (Memória de Cálculo), INFBEN (Informações do Benefício), folha de pagamento INSS, contracheque do segurado, extrato bancário do benefício, análise de descontos indevidos, conferência de RMI, cumprimento de sentença previdenciária, cálculo de atrasados, RPV, precatório, devolução de valores, complemento positivo, decisão judicial sobre valores, revisão de teto, revisão IRSM, revisão art. 29, revisão art. 26, revisão art. 201, revisão de pecúlio, revisão Súmula 9, revisão ORTN/OTN/BTN, revisão URV, ACP IRSM, ACP-MP242, indenização SASSE, indenização Seringueiros, indenização Talidomida, ex-combatente, salário-família, abono PIS/PASEP, pensão alimentícia, consignação, empréstimo bancário, RMC (Reserva de Margem Consignável), IR retido na fonte, contribuição previdenciária 13º, abatimento dependente IR, abatimento maior 65 anos IR, calamidade pública, salário-família débito, complemento acompanhante, dupla atividade, contribuição sindical CONTAG COBAP ANAPPS SINDIAPI SINDNAPI SINTAPI SINTRAAPI FETRAF UNIBRASIL UNIDOS CENTRAPE ASBAPI FNTF ASTRE FITF CNTT RIAAM ABAMSP CONAFER SINAB ABSP STFERJ SINDAPB ASSISTENCIA PATRONAL, RFFSA, CBTU, ECT, PSS, PA-Pensão Alimentícia, IPMF, CPMF, devolução CPMF, auxílio emergencial MP 875/2019, antecipação calamidade. Use também ao verificar competência específica, código de rubrica não identificado, devolução tributária, valor líquido corrigido, diferença entre MR normal e MR judicial. Cruza com cnis-acerto-indicadores, base-meu-inss-pat-gerid-fluxo, base-portarias-dpmf-inss-hub, execucao-cumprimento-previdenciario, impugnacao-cumprimento-concomitantes, tributacao-beneficios-previdenciarios, base-juros-correcao-monetaria, base-cumprimento-sentenca-rpv-precatorio, base-revisao-teto-buraco-negro-verde, base-revisao-irsm-fevereiro-1994, base-revisao-art29-melhor-beneficio, base-revisao-reajuste-ortn-otn, base-revisao-vida-toda-rvt, base-devolucao-valores-irrepetibilidade-tema979-tema1034, base-siglas-inss, peticao-previdenciaria, revisao-peticao. Postura exclusivamente pró-segurado. Identificação correta da rubrica é decisiva para impugnação de desconto indevido, conferência de cumprimento de sentença, identificação de complemento positivo não computado e visualização de revisões já implementadas. NÃO use para concessão isolada (cf. Portaria 991/2022), para cadastro CNIS (cf. Portaria 990/2022 e cnis-acerto-indicadores) nem para acumulação (cf. Portaria 994/2022).
---

# Rubricas de Pagamento de Benefícios do INSS - Catálogo Pró-Segurado

## OBJETIVO E POSTURA

Esta skill é o catálogo consolidado das rubricas de pagamento dos benefícios previdenciários e assistenciais do INSS, conforme Anexo IX da Portaria DIRBEN/INSS nº 992, de 28 de março de 2022 (Livro III - Manutenção de Benefícios).

Cada rubrica é um código numérico que aparece no HISCRE (Histórico de Créditos), no extrato do benefício e nos demonstrativos de pagamento. A identificação da rubrica permite ao advogado.

1. Conferir se o benefício está sendo pago corretamente.
2. Identificar descontos indevidos para impugnar.
3. Verificar se uma revisão judicial transitada em julgado já foi implementada.
4. Auditar cumprimento de sentença e cálculo de atrasados.
5. Confrontar a folha real com o pedido em RPV/Precatório.
6. Detectar consignações irregulares, empréstimos não autorizados, alterações de pensão alimentícia.

Postura exclusivamente pró-segurado. Qualquer rubrica de débito ou consignação merece auditoria. Qualquer rubrica de crédito pode estar faltando.

## ESTRUTURA DAS RUBRICAS

As rubricas são numeradas com 11 dígitos. Os três últimos identificam o tipo. A taxonomia natural segue cinco blocos.

| Bloco | Faixa | Natureza |
|-------|-------|----------|
| 100 | 101 a 160 | CRÉDITOS (rendimentos, abonos, complementos) |
| 200 | 201 a 253 | DÉBITOS (descontos, tributação, consignações) |
| 300 | 301 a 329 | DIFERENÇAS, ABATIMENTOS E ESPECIAIS |
| CP | 333 a 379 | COMPLEMENTOS POSITIVOS DE REVISÕES |
| 900 | 901 a 933 | VALORES TOTAIS E CONSIGNAÇÕES POR ENTIDADE |

Detalhamento exaustivo de cada rubrica em `references/CATALOGO-COMPLETO-RUBRICAS.md`.

## BLOCO 100 - CRÉDITOS PRINCIPAIS (pró-segurado de leitura imediata)

### Renda mensal e abonos básicos

- **101.** VALOR TOTAL DE MR DO PERÍODO. Mensalidade reajustada bruta.
- **102.** COMPLEMENTO DA MENSALIDADE REAJUSTADA. Diferença para alcançar a MR devida.
- **103.** ABONO DO GOVERNO FEDERAL.
- **104.** VALOR DO DÉCIMO-TERCEIRO SALÁRIO.
- **105.** SALÁRIO FAMILIA.
- **107.** COMPLEMENTO POSITIVO. CRÍTICO. Diferença paga retroativa por revisão administrativa.

### Revisões previdenciárias (sinalizam direitos preservados ou implementados)

- **106.** PARCELA DE DIFERENÇA DE REVISÃO DA RMI.
- **116.** VALOR DA PARCELA REF. A REVISÃO ART. 201 CF.
- **117.** VALOR DA PARCELA REF. A REVISÃO ART. 26.
- **132.** CP - DIFERENÇA ARTIGO 201 OU 58.
- **142.** CP DE REVISÃO DE PECÚLIO.
- **143.** CP-COMPLEMENTO REVISÃO IRSM LEI 10.999/04.
- **144.** CP-PARCELA DA REVISÃO IRSM LEI 10.999/04.
- **147.** CP - DIFERENÇA REVISÃO ORTN/OTN/BTN.
- **148.** CP-DIFERENÇA REV.JUD.PENSÃO-100% APBASE.
- **149.** CP-PARC. REV. IRSM DEP. PENSÃO CESSADA.
- **150.** CP-PARC. REV.IRSM HERD. DEP. PENSÃO CESS.
- **151.** CP-RESÍDUO INFORM NA CONCESSÃO DA PENSÃO.
- **152.** CP - REVISÃO DE SÚMULA 9.
- **153.** CP - REVISÃO JUDICIAL - ÍNDICE RESIDUAL.
- **156.** CP - REVISÃO TETO.
- **157.** CP - REVISÃO TETO CESSADOS.
- **158.** CP - REVISÃO TETO HERDEIROS.

### Especiais e indenizatórias

- **111.** PARCELA DE GRATIFIC. DE EX-COMBATENTE.
- **115.** ABONO ANUAL DE EX-COMBATENTE - 14º SAL.
- **118.** COMPLEMENTO DE ACOMPANHANTE.
- **119.** OUTRAS VANTAGENS.
- **120.** PLANSFER - RFFSA/CBTU. Plano de Seguridade dos Ferroviários.
- **122.** REVISÃO DE PECÚLIO.
- **133.** PARCELA DUPLA ATIVIDADE. CRÍTICA. Revisão de aposentadoria com cômputo de atividade exercida após.
- **135.** GRATIFICAÇÃO DE QUALID. E PRODUTIV.
- **136.** REATIVAÇÃO DE COTA DE SALÁRIO FAMÍLIA.
- **141.** CP DE PECÚLIO.
- **145.** ADICIONAL TALIDOMIDA.
- **146.** INDENIZAÇÃO AÇÃO JUDICIAL 970060590-6.
- **154.** ANTECIPAÇÃO RENDA CALAM. CONF. DECRETO.
- **155.** INDENIZAÇÃO TALIDOMIDA - LEI 12.190/2010.

### Correção monetária complementar

- **110.** CORREÇÃO MONETÁRIA.
- **159.** CORREÇÃO MONETÁRIA COMPLEMENTAR DE RENDA.
- **160.** CORREÇÃO MONET. COMPLEMENTAR DE 13º SAL.

### Sub-bloco IPMF/CPMF e Saldos IR (devolução)

- **108.** DIFERENÇA DE IMPOSTO DE RENDA - CRÉDITO.
- **112.** DIFERENÇA I.R. SOBRE 13º SAL. - CRÉDITO.
- **114.** COMPLEMENTO A TÍTULO DE IPMF.
- **121.** COMPLEMENTO A TÍTULO DE CPMF.

### CP por motivo administrativo (Complemento Positivo - blocos 123-139)

Códigos 123 a 139 são Complementos Positivos administrativos para correções pontuais. CRÍTICA atenção para 125 (CP-DECISÃO JUDICIAL).

## BLOCO 200 - DÉBITOS (auditoria pró-segurado prioritária)

### Tributação (IR e Contribuição Previdenciária)

- **201.** IMPOSTO DE RENDA RETIDO NA FONTE. Conferir isenção doença grave (art. 6º XIV Lei 7.713/88, Súmula 627 STJ).
- **204.** IMPOSTO DE RENDA NO EXTERIOR.
- **205.** DIFERENÇA DE IMPOSTO DE RENDA - DÉBITO.
- **207.** DESCONTO DE I.R. SOBRE 13º SALÁRIO.
- **208.** CONTRIBUIÇÃO PREVIDENCIÁRIA SOBRE 13. SAL.
- **209.** DIFERENÇA DE I.R. SOBRE 13º SAL - DÉBITO.
- **211.** DESCONTO DE I.R. SOBRE 14º SALÁRIO (ex-combatente).
- **212.** CONTRIBUIÇÃO PREVID. SOBRE 14º SALÁRIO.

### INSS desconto

- **206.** DESCONTO DO I.N.S.S.

### Pensão alimentícia (auditoria de cumprimento de decisão judicial)

- **202.** PENSÃO ALIMENTÍCIA - DÉBITO.
- **210.** PENSÃO ALIMENTÍCIA SOBRE 13º SALÁRIO.
- **213.** PENSÃO ALIMENTÍCIA SOBRE 14º SALÁRIO.

### Consignações genéricas

- **203.** CONSIGNAÇÃO. Genérica.
- **214.** CONSIGNAÇÃO SOBRE 13º SAL.
- **215.** AJUSTE DO ARREDONDAMENTO DE CRÉDITOS.

### Empréstimo bancário (auditoria de regularidade)

- **216.** CONSIGNADO - EMPRÉSTIMO BANCÁRIO.
- **217.** EMPRÉSTIMO SOBRE A RMC. Reserva de Margem Consignável - geralmente cartão consignado.

### Décimo terceiro débitos e ajustes

- **218.** 13º SALARIO PAGO COMPETÊNCIAS ANTERIORES.
- **236.** DÉCIMO TERCEIRO SALÁRIO - DÉBITO.
- **251.** DÉCIMO TERCEIRO SALÁRIO PAGO A MAIOR.

### Salário-família e acompanhante débitos

- **237.** SALÁRIO FAMILIA - DÉBITO.
- **238.** COMPLEMENTO DE ACOMPANHANTE - DÉBITO.

### Acumulação (auditar Tema 1070 e art. 24 EC 103)

- **252.** DESC. ACUMULAÇÃO DE BENEF. JÁ CONCEDIDO.
- **253.** DESC. ACUM. BENEF. JÁ CONCEDIDO - 13º SAL.

### Calamidade e devolução

- **231.** DESC ANTECIP RENDA CALAM. CONF. DECRETO.
- **232.** DESCONTO VALORES RECEBIDOS NA RUBR. 146.
- **233.** DESC PA REV TETO.

### Devolução de CPMF

- **227.** DEVOLUÇÃO DE CPMF.

### Contribuição sindical/associativa (auditoria de filiação)

Rubricas **219 a 250** identificam contribuições sindicais e associativas. Lista completa em `references/CATALOGO-COMPLETO-RUBRICAS.md`. Atenção. Filiação não autorizada pelo segurado é IMPUGNÁVEL.

## BLOCO 300 - DIFERENÇAS E ABATIMENTOS

### Diferença paga pela União (ex-combatente, casos especiais)

- **301.** DIFERENÇA PAGA PELA UNIÃO.

### Abatimentos do IR (favoráveis ao segurado)

- **302.** ABATIMENTO IMPOSTO RENDA POR DEPENDENTE.
- **303.** ABATIMENTO A BENEFICIÁRIO MAIOR 65 ANOS.
- **304.** DESCONTO POR DEPENDENTE SOBRE 13º SALÁRIO.
- **305.** DESCONTO MAIOR 65 ANOS - I.R. 13º SALÁRIO.
- **308.** DESCONTO POR DEPENDENTE SOBRE 14º SALÁRIO.
- **309.** DESCONTO MAIOR 65 ANOS - I.R. 14º SALÁRIO.

### Consignação no IR

- **310.** DESCONTO DE CONSIGNAÇÃO NO I.R.
- **312.** DESCONTO DE CONSIGNAÇÃO NO IR - 13º SAL.

### IR não recolhido por ordem judicial

- **313.** IR NÃO RECOLHIDO POR ORDEM JUDICIAL.
- **314.** IR NÃO RECOLHIDO POR ORDEM JUDIC. 13º SAL.

### Diferenças MR / URV / Judicial

- **315.** DIFERENÇA DA MR POR AÇÃO URV.
- **316.** SALDO DEVEDOR ARREDONDAMENTO DE CRÉDITOS.
- **317.** VALOR LÍQUIDO CORRIGIDO.
- **318.** DIFERENÇA ENTRE MR NORMAL E MR JUDICIAL. CRÍTICA. Sinaliza decisão judicial implementada.

### IR devolvido

- **319.** I.R DEVOLVIDO.
- **320.** I.R SOBRE DÉCIMO TERCEIRO DEVOLVIDO.

### Empréstimo bancário e RMC (auditoria de regularidade)

- **321.** EMPRÉSTIMO BANCÁRIO (RETENÇÃO).
- **322.** RESERVA DE MARGEM CONSIGNÁVEL (RMC).

### 13º antecipado e valores acumulados

- **323.** ADIANTAMENTO DE 13 COMPETÊNCIA ANTERIOR.
- **324.** DÉCIMO TERCEIRO DEVOLVIDO.
- **325.** VALOR ACUMULADO P.A. SOBRE 13 SALÁRIO.
- **326.** VALOR ACUM. CONTRIB. PREV. SOBRE 13 SAL.
- **327.** VALOR ACUM. CONSIGNACAO SOBRE 13 SALÁRIO.

### Auxílio emergencial e indenizações especiais

- **328.** AUX. EMERG. PECUNIÁRIO MP 875/2019.
- **329.** DIFERENÇAS TALIDOMIDA - LEI 13.638/2018.

## BLOCO CP 333-379 - COMPLEMENTOS POSITIVOS DE REVISÕES

Espelha o sub-bloco 123-139 e detalha revisões específicas. Atenção especial aos códigos.

- **335.** CP-DECISÃO JUDICIAL. PRINCIPAL TRACKER DE IMPLEMENTAÇÃO DE SENTENÇA.
- **365.** INDENIZAÇÃO TALIDOMIDA - LEI 12190/2010.
- **366, 367, 368.** CP-REVISÃO TETO (ativo, cessado, herdeiros).
- **369, 370, 371, 372.** CP-REVISÃO ARTIGO 29 (ativo, cessado, herdeiros, resíduo NB anterior).
- **373.** CP-ARTIGO 29 ACP-MP242.
- **374.** CP-ACP IRSM.
- **375.** CP-INDENIZ. SERINGUEIROS.
- **376.** CP-REVISÃO DE BENEFÍCIO EX-SASSE.
- **377.** DIFERENÇA DE RENDA POR ACUMULAÇÃO.
- **378.** DIFERENÇA DE 13º SALÁRIO POR ACUMULAÇÃO.
- **379.** REVISÃO DE B31 ANTECIPADO (TRAT. 94).

Detalhamento integral em `references/CATALOGO-COMPLETO-RUBRICAS.md`.

## BLOCO 900 - VALORES TOTAIS E CONSIGNAÇÕES POR ENTIDADE

### Valores totais (referência de auditoria)

- **901.** VALOR BRUTO TRIBUTÁVEL.
- **902.** VALOR PAGO DE MENSALIDADE REAJUSTADA.
- **922.** RENDA MENSAL PREVIDENCIÁRIA.

### Saldos de IR

- **903.** SALDO DE IMPOSTO DE RENDA - POSITIVO.
- **904.** SALDO DE IMPOSTO DE RENDA - NEGATIVO.

### Consignações por entidade (auditoria de regularidade)

Códigos 905 a 920 e 923 a 933 identificam consignações específicas (ASBAPI, COBAP, CONTAG, ASTRE, SINTAPI, CENTRAPE, débito INSS, empréstimo CEF, pool de seguro de vida, etc).

ATENÇÃO PRÓ-SEGURADO. Qualquer consignação sem autorização expressa do segurado é IMPUGNÁVEL. Solicitar a documentação que originou a consignação à entidade.

### Consignações judiciais

- **928.** CONSIG.93-DETERM. JUDIC./VAL. FIXO.
- **929.** CONSIG.94-DETERM. JUDIC./PERC. RM.

## ESTRATÉGIA PRÓ-SEGURADO - CHECKLIST DE LEITURA DE HISCRE

### Passo 1 - Identificar a Mensalidade Reajustada

Localizar 101 (MR do período). Confrontar com a RMI atualizada.

### Passo 2 - Verificar Complementos Positivos

Localizar 107 ou códigos da faixa 123-139 ou 333-379. Identificar a origem (decisão judicial, revisão administrativa, etc).

### Passo 3 - Auditar Descontos

Listar todos os 2XX. Cada um precisa ter base legal e autorização do segurado (se consignação).

### Passo 4 - Conferir Revisões

Verificar se há rubricas das faixas 106, 116, 117, 132, 143-144, 147, 152, 153, 156-158, 366-374, 376. Cada uma sinaliza uma revisão implementada (administrativa ou judicial).

### Passo 5 - Conferir Acumulação

Se houver 252, 253, 377, 378, conferir compatibilidade com Tema 1070/STJ e art. 24 EC 103/2019.

### Passo 6 - Empréstimos e RMC

Verificar 216, 217, 321, 322. Pedir contrato de cada operação. Auditar fraude.

## ALERTAS CRÍTICOS PRÓ-SEGURADO

### Alerta 1 - Empréstimo consignado sem autorização

Lei 14.181/2021 reforça proteção. Banco Central regulamenta. RMC (cartão consignado) é alvo comum de fraude. PROVOCAR. Devolução em dobro (CDC).

### Alerta 2 - Consignação sindical sem filiação expressa

Filiação a sindicato/associação NÃO PRESUMIDA. ADI 5794/STF declarou inconstitucionalidade do desconto compulsório (após Reforma Trabalhista). PROVOCAR. Devolução administrativa ou judicial.

### Alerta 3 - IR retido sobre benefício isento (doença grave)

Rubrica 201 em isento (Lei 7.713/88 art. 6º XIV). PROVOCAR. Restituição administrativa ou repetição de indébito.

### Alerta 4 - Não implementação de decisão judicial

Decisão judicial transitada deve aparecer como CP 125 ou 335 (CP-DECISÃO JUDICIAL). Se ausente, MS por descumprimento de decisão judicial (cruzar com `mandado-seguranca-previdenciario` e `base-ms-cumprimento-inss`).

### Alerta 5 - Pensão alimentícia desatualizada

Rubricas 202, 210, 213. Se houve alteração judicial não implementada, MS ou ação de execução de alimentos.

### Alerta 6 - Revisão teto não implementada

Após decisão STF (RE 564.354 e RE 937.595, Tema 76), benefícios sob teto devem ter rubricas 156-158 ou 366-368. Ausência indica não implementação.

## FONTE NORMATIVA

Anexo IX da **Portaria DIRBEN/INSS nº 992, de 28 de março de 2022** (Livro III - Manutenção de Benefícios, Folha de Pagamento, Descontos, Suspensão e Cessação).

Atenção. A taxonomia segue a Portaria 992/2022 (manutenção). NÃO confundir com a Portaria 991/2022 (concessão e revisão administrativa).

Cruzar com `base-portarias-dpmf-inss-hub` para o panorama.

## CRUZAMENTO COM OUTRAS SKILLS

Esta skill é hub natural para análise de pagamento. Acionar AUTOMATICAMENTE em conjunto com.

- `cnis-acerto-indicadores`. Indicadores CNIS.
- `base-meu-inss-pat-gerid-fluxo`. Plataformas do INSS.
- `base-portarias-dpmf-inss-hub`. Hub Portarias 990-996/2022.
- `execucao-cumprimento-previdenciario`. Execução.
- `impugnacao-cumprimento-concomitantes`. Cumprimento de sentença com problema.
- `tributacao-beneficios-previdenciarios`. IR, RRA, isenção doença grave.
- `base-juros-correcao-monetaria`. Atualização.
- `base-cumprimento-sentenca-rpv-precatorio`. RPV e precatório.
- `base-revisao-teto-buraco-negro-verde`. Revisão de teto.
- `base-revisao-irsm-fevereiro-1994`. IRSM.
- `base-revisao-art29-melhor-beneficio`. Art. 29.
- `base-revisao-reajuste-ortn-otn`. ORTN/OTN.
- `base-devolucao-valores-irrepetibilidade-tema979-tema1034`. Devolução.
- `base-siglas-inss`. Glossário.
- `peticao-previdenciaria`. Geração de peça.
- `revisao-peticao`. Auditoria final.

Catálogo completo das 150+ rubricas em `references/CATALOGO-COMPLETO-RUBRICAS.md`.
