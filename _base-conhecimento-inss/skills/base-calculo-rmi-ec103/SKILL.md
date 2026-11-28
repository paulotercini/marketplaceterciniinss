---
name: base-calculo-rmi-ec103
description: "Cálculo da RMI após a EC 103/2019, na defesa do segurado. Use SEMPRE que mencionar cálculo RMI EC 103, art. 26 EC 103, média 100% PBC, 60% mais 2% ano excedente, exclusão de contribuições art. 26 §6º, divisor mínimo 108 art. 135-A, renda mensal inicial pós-reforma, salário de benefício pós EC 103, RMI pedágio 100%, RMI pedágio 50% fator previdenciário, RMI 100% média, cálculo B31 B32 B91 B92 B94 pós-reforma, pensão por morte cota familiar, benefícios acima do teto, Tema 1070 STJ concomitantes, art. 31 Lei 8.213 integração auxílio-acidente, ADI 6309 especial, revisão da vida toda superada. Cruza com peticao-previdenciaria, base-aposentadoria-transicao-ec103, base-aposentadoria-regra-permanente-ec103, impugnacao-cumprimento-concomitantes e precedentes-previdenciarios."
---

# Cálculo da RMI após a EC 103/2019

## Escopo

Cálculo e conferência da RMI dos benefícios com requisitos reunidos a partir de 14/11/2019. Fórmula passo a passo, cenários e refutação em `references/`. Benefícios com direito adquirido seguem `base-aposentadoria-direito-adquirido`.

## Salário de benefício

- Média aritmética de 100% dos salários de contribuição desde 07/1994 ou desde o início das contribuições, se posterior (EC 103, art. 26, caput), corrigidos monetariamente (Lei 8.213/91, art. 29-B), limitada ao teto (§1º). Não há descarte automático dos 20% menores.
- Exclusão facultativa (art. 26, §6º): podem ser excluídas as contribuições que reduzam o valor, mantido o tempo mínimo; o tempo excluído não serve para o acréscimo de 2% nem para averbação em outro regime. Simular: excluir contribuição baixa eleva a média, mas pode reduzir o coeficiente.
- Divisor mínimo de 108 meses apenas para o filiado até julho de 1994, nas aposentadorias exceto a por incapacidade permanente (Lei 8.213/91, art. 135-A, Lei 14.331/2022).
- O 13º salário não integra o salário de benefício (Lei 8.213/91, art. 29, §3º, redação da Lei 8.870/94).
- Competência com contribuição abaixo do salário mínimo não conta sem complementação ou agrupamento (CF, art. 195, §14; EC 103, art. 29; `contribuicoes-complementacao-ec103`).
- Atividades concomitantes: soma das contribuições, respeitado o teto (Tema 1070 STJ; `base-revisao-atividades-concomitantes-tema1070`).
- Auxílio-acidente integra o salário de contribuição para a aposentadoria (Lei 8.213/91, art. 31).

## Coeficientes

| Benefício | RMI |
|---|---|
| Regra permanente (art. 19), pontos (art. 15), idade progressiva (art. 16), idade de transição (art. 18) | 60% + 2% por ano acima de 20 (H) ou 15 (M) (art. 26, §§2º e 5º) |
| Pedágio 50% (art. 17) | média × fator previdenciário (art. 17, parágrafo único) |
| Pedágio 100% (art. 20) | 100% da média (art. 26, §3º, I) |
| Especial (art. 19, §1º, I, e art. 21) | 60% + 2% por ano acima de 20, ou de 15 na especial de 15 anos e para a mulher (art. 26, §§2º, IV, e 5º) |
| B32 previdenciária | 60% + 2% (art. 26, §2º, III) |
| B92 (acidente de trabalho, doença profissional ou do trabalho) | 100% da média (art. 26, §3º, II) |
| B31 e B91 | 91% do salário de benefício, limitado à média dos 12 últimos salários de contribuição (Lei 8.213/91, arts. 61 e 29, §10) |
| B94 | 50% do salário de benefício (Lei 8.213/91, art. 86, §1º) |
| Pensão por morte | cota familiar de 50% da aposentadoria do instituidor ou da que teria por incapacidade permanente, + 10 pontos por dependente, até 100% (EC 103, art. 23); 100% até o teto havendo dependente inválido ou com deficiência intelectual, mental ou grave (§2º) |

Piso de um salário mínimo (CF, art. 201, §2º), salvo B94, e teto do RGPS.

## ADI 6309 (alerta que muda a aplicação)

O STF declarou constitucional o art. 26, §2º, IV, da EC 103 (cálculo da especial) e inconstitucional a idade mínima do art. 19, §1º, I, "a" a "c" (ADI 6309, Plenário, j. 03/06/2026, acórdão no DJe de 02/10/2026, conforme registro da base em 04/10/2026). Não sustentar a inconstitucionalidade do cálculo da especial. Efeitos sobre o acesso em `base-aposentadoria-especial-transicao-ec103`.

## Estratégia

1. Obter CNIS e carta de concessão com memória de cálculo (Meu INSS).
2. Calcular de forma independente cada regra cabível e escolher a de maior RMI (Tema 334 STF).
3. Conferir: competências omitidas, concomitância, remunerações habituais (horas extras, comissões), exclusão do §6º, coeficiente pelo tempo total (inclusive especial convertido até 13/11/2019 e tempo reconhecido em juízo).
4. Incapacidade: verificar o nexo acidentário, que eleva a B32 de 60% + 2% para 100% (`ntep-nexo-acidentario`, `auditoria-laudo-pericial`).
5. Revisão: prazo decadencial de 10 anos (Lei 8.213/91, art. 103; `decadencia-revisao-previdenciaria`).

## MCPs da casa

Pesquisa obrigatória. Norma, súmula, tema, enunciado ou acórdão citado nesta skill nasce [NÃO CONFIRMADO] e só entra em peça, parecer ou orientação depois de lido na fonte oficial, na forma de `pesquisa-jurisprudencia-chrome`. A ordem de consulta dos MCPs (`normas`, `superiores`, `trf3`, `iurisprudencia` e `acervo`) e dos catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) está em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O acervo serve à leitura do que o escritório já sustentou, e o reaproveitamento automático de texto de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Integração

- Peça: `peticao-previdenciaria`. Revisão de minuta: `revisao-peticao`.
- CNIS: `base-cnis-acerto-indicadores`. Execução: `impugnacao-cumprimento-concomitantes`.
- Pensão: `pensao-por-morte`. Auxílio-acidente: `auxilio-acidente-b94`.
- Portarias: `base-portarias-dpmf-inss-hub`.
