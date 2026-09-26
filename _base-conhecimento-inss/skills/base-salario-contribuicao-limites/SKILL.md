---
name: base-salario-contribuicao-limites
description: "Salário-de-contribuição, limites mínimo e máximo (teto), verbas integrantes e não integrantes, base de cálculo da contribuição previdenciária e reflexo no salário-de-benefício. Use SEMPRE que mencionar salário-de-contribuição, teto previdenciário, limite mínimo, art. 28 Lei 8.212, verbas integrantes, verbas não integrantes, adicional noturno, horas extras, comissões, gratificações, PLR, vale-transporte, vale-alimentação, abono, ajuda de custo, diárias, aviso prévio indenizado, férias indenizadas, terço de férias, licença-prêmio, adicional de insalubridade, adicional de periculosidade, base cálculo contribuição, limite 1/12 sobre 13º, Tema 20 STF, incidência RPPS, natureza remuneratória, indenizatória, Portaria 990/2022, Portaria 1.316/2025. Cruza com peticao-previdenciaria, cnis-acerto-indicadores, base-calculo-rmi-ec103, base-aposentadoria-direito-adquirido, base-planejamento-previdenciario e contribuicoes-complementacao-ec103."
---

# Salário-de-Contribuição e Limites

## Escopo

Skill pró-segurado sobre o salário-de-contribuição, base de cálculo da contribuição previdenciária, com os limites mínimo (salário-mínimo) e máximo (teto previdenciário), verbas integrantes e verbas não integrantes, efeitos no salário-de-benefício e discussões sobre natureza remuneratória ou indenizatória das parcelas.

## Marco normativo central

Lei 8.212/91, arts. 20, 22 e 28. Base da contribuição.

Lei 8.213/91. Salário-de-benefício.

Decreto 3.048/99, arts. 201, 214.

IN RFB 2.110/2022.

EC 103/2019. Alíquotas progressivas.

Portaria Interministerial anual. Teto e alíquotas.

Portaria DPMF/INSS 990/2022 (alterada pela Portaria 1.316/2025). Indicadores do CNIS, formulários RAC e regras operacionais.

## Limites

### Mínimo

Salário-mínimo vigente.

### Máximo (Teto)

Fixado por portaria anual. Em 2026, valor conforme portaria MPS e MTPS do exercício.

## Verbas integrantes

Salário-base, horas extras, adicional noturno, adicional de insalubridade, adicional de periculosidade, comissões, gratificações regulares, prêmios regulares, 13º (na parcela anual), abonos sem caráter indenizatório.

## Verbas não integrantes

Vale-transporte. Lei 7.418/1985, não integra.

Vale-alimentação pago por PAT ou acordo coletivo, não integra.

Aviso prévio indenizado (juízo controvertido).

Férias indenizadas e terço constitucional das indenizadas.

Licença-prêmio convertida em pecúnia.

PLR conforme Lei 10.101/2000.

Ajuda de custo, diárias até 50% do salário.

Abono único coletivo de caráter indenizatório.

## Espaço pró-segurado

Primeiro, planejamento para elevar o salário-de-contribuição até o teto para maximizar salário-de-benefício.

Segundo, requalificação de verbas indevidamente tributadas para aproveitar em cômputo.

Terceiro, discussão sobre natureza das verbas em repetitivos STJ (Tema 985, por exemplo).

Quarto, revisão preventiva de salário-de-contribuição errado no CNIS.

Quinto, o 13º salário integra o salário-de-contribuição para CUSTEIO (art. 28, §7º, Lei 8.212), mas NÃO integra o cálculo do salário de benefício desde a Lei 8.870/94 (art. 29, §3º, Lei 8.213) — não o utilize para elevar a média, salvo requisitos implementados antes de 16/04/1994.

## Regra pró-segurado

Primeiro, auditoria do CNIS.

Segundo, identificação de verbas não tributadas mas integrantes.

Terceiro, acionamento de RAC para correção.

Quarto, cálculo do SB correto.

Quinto, se necessário, ação de cômputo.

## MCPs da casa

Antes de redigir, consulte os três servidores locais do plugin, nesta ordem. Os três localizam e não conferem, e nenhum autoriza a marca [CONFERIDO].

Legislação. Todo dispositivo citado nesta skill se transcreve do MCP `normas`, por `obter_artigo` no identificador da norma e no número do artigo (exemplo, `lei-8213-1991` e `57`), lendo o campo `texto` e a última ocorrência de cada parágrafo. Para tese de direito adquirido, `redacao_na_data`, que responde por ano. A citação em peça exige a `fonte_oficial` que a resposta devolve. Detalhe em `base-legislacao-fontes-primarias`.

Jurisprudência do TRF3 e das Turmas Recursais. Localize pelo MCP `trf3`, com `buscar_acordaos_trf3` (consulta, `polo_recorrente`, `resultado`, `orgao_julgador` e datas) e `obter_acordao_trf3` no id devolvido. `resultado` e `polo_recorrente` são inferidos. O achado nasce [NÃO CONFIRMADO] e só entra na peça depois de aberto no portal do TRF3, na forma de `pesquisa-jurisprudencia-chrome`. TNU e CRPS ficam no MCP `iurisprudencia`.

Acervo do escritório. Consulte pelo MCP `acervo` o que o escritório já sustentou neste tema. Comece por `buscar_tese_acervo` com os termos centrais desta skill e, achando trecho útil, leia o argumento inteiro com `obter_trecho_acervo`. Para saber em que peças um precedente já foi usado, chame `precedentes_do_acervo` e leia o campo `corte` da resposta, porque o mesmo número de Tema existe em mais de uma corte. Detalhe em `base-acervo-escritorio`.

**Vedação.** O acervo existe para o advogado LER o que já sustentou. Reaproveitamento automático de texto de um cliente em peça de outro é VEDADO. O trecho é ponto de partida para redação nova, conferida contra os autos e contra a legislação vigente na data. O trecho é anonimizado, e o arquivo de origem não é.

## Integração com outras skills

Para cálculo da RMI, acionar `base-calculo-rmi-ec103`.
Para direito adquirido, acionar `base-aposentadoria-direito-adquirido`.
Para planejamento, acionar `base-planejamento-previdenciario`.
Para complementação, acionar `contribuicoes-complementacao-ec103`.
Para CNIS, acionar `cnis-acerto-indicadores`.

## Alertas

Primeiro, natureza da verba é discussão recorrente no STJ.

Segundo, teto pode mudar anualmente.

Terceiro, contribuições acima do teto não geram salário-de-benefício acima do teto.

Quarto, verbas pagas em rescisão têm natureza própria.

## Hub de portarias administrativas

Hub das Portarias DPMF/DIRBEN/INSS aplicáveis a este benefício. Acionar `base-portarias-dpmf-inss-hub` para identificar quais Portarias regem o procedimento administrativo, o cálculo, as ratificações e os recursos no caso concreto.

## Doutrina de apoio

Frederico Amado, salário-de-contribuição.

Hugo Goes, contribuições.

Marco Aurélio Serau Junior, base de cálculo.

Daniel Pulino, contribuições.

Jane Berwanger, cálculo.

IBDP, advocacia previdenciária.

## O que NÃO está nesta skill

Cálculo da RMI em `base-calculo-rmi-ec103`. Complementação EC 103 em `contribuicoes-complementacao-ec103`. CNIS em `cnis-acerto-indicadores`.
