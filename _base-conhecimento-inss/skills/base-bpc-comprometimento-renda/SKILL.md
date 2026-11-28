---
name: base-bpc-comprometimento-renda
description: "Comprometimento de renda no BPC/LOAS (idoso B88 e pessoa com deficiência B87): dedução de gastos com saúde e Centro-Dia da renda per capita pela Portaria Conjunta MDS/INSS 34/2025, art. 8º, §§4º a 7º, e Anexo I na redação da Portaria Conjunta MDS/INSS 45/2026. Cobre as cinco categorias (medicamentos, consultas e tratamentos médicos, fraldas, alimentação especial, Centro-Dia do SUAS), valores médios dedutíveis, condições do §5º (natureza contínua e não disponibilização ou negativa do SUS ou SUAS), prova do gasto efetivo pelos recibos dos doze meses anteriores (§7º), campos do requerimento (renda comprometida, uso contínuo, negativa do poder público) e estratégia pró-segurado. Use SEMPRE que mencionar BPC comprometimento de renda, fatores de comprometimento, dedução da renda per capita, valores dedutíveis BPC, R$ 56 medicamentos, R$ 110 consultas, R$ 120 fraldas, R$ 147 alimentação especial, R$ 40 Centro-Dia, Portaria 34/2025 art. 8º, Portaria 45/2026, art. 20-B LOAS, art. 20 §11-A LOAS, Lei 14.176/2021 BPC, negativa do poder público, uso contínuo medicamento, receita médica BPC, fraldas geriátricas dedução, Portaria Conjunta 3/2018 revogada. Use AUTOMATICAMENTE em análise ou petição de BPC quando a renda per capita superar 1/4 do salário mínimo e houver gastos de saúde. Cruza com base-bpc-loas-requisitos, base-bpc-renda-per-capita-miserabilidade, bpc-renda-grupo-familiar, analise-bpc-loas, peticao-previdenciaria e base-legislacao-fontes-primarias. NÃO use para impedimento de longo prazo (base-bpc-impedimento-longo-prazo) nem cadastro CadÚnico (base-cadastro-domiciliar-cadunico-in21-2026)."
---

# Comprometimento de Renda no BPC/LOAS

## Objetivo

Deduzir da renda familiar os gastos de saúde e de Centro-Dia que o SUS ou o SUAS não fornecem, para aferir a miserabilidade de famílias com renda nominal acima de 1/4 do salário mínimo. O critério judicial de miserabilidade está em `base-bpc-renda-per-capita-miserabilidade`; o grupo familiar, em `bpc-renda-grupo-familiar`.

## Base normativa

- CF, art. 203, V.
- LOAS, art. 20, §11 (Lei 13.146/2015): outros elementos de prova da miserabilidade.
- LOAS, art. 20, §11-A, e art. 20-B (Lei 14.176/2021): o regulamento pode ampliar o limite até 1/2 salário mínimo, considerando o grau da deficiência, a dependência de terceiros e o comprometimento do orçamento com gastos de saúde. A ampliação depende de regulamento e não opera automaticamente.
- Decreto 6.214/2007.
- Portaria Conjunta MDS/INSS 34/2025, art. 8º, §§4º a 7º, e Anexo I, na redação da Portaria Conjunta MDS/INSS 45/2026 (DOU de 30/09/2026, edição 185, seção 1, p. 43).
- A Portaria Conjunta 34/2025, art. 34, revogou as Portarias Conjuntas 3/2018 e 28/2024, entre outras. Citar apenas a Portaria 34/2025.
- Portaria Conjunta DIRBEN/PFE/INSS 94/2024: correspondência com o comprometimento de renda Não localizado; o texto consultado trata de ações civis públicas. Não citar sem leitura da fonte.

## Regras da Portaria Conjunta 34/2025

- **§4º. O que se deduz.** Exclusivamente gastos com tratamentos de saúde, médicos, fraldas, alimentos especiais e medicamentos do idoso ou da pessoa com deficiência não disponibilizados gratuitamente pelo SUS, ou com serviços não prestados pelo SUAS, de natureza contínua e necessários à preservação da saúde e da vida.
- **§5º. Condições.** Documentação médica que afirme a natureza contínua e prova da não disponibilização gratuita ou da negativa (SUS); ou documentação da necessidade e da não disponibilização do Centro-Dia (SUAS). A negativa do poder público é condição da dedução, e não fator de peso.
- **§6º. Valor.** Cada categoria é deduzida uma única vez pelo valor médio do Anexo I.
- **§7º. Gasto efetivo maior.** O interessado pode provar gasto superior com os recibos de cada um dos doze meses anteriores ao requerimento, ou do tempo de vida do requerente com menos de um ano.

## Valores do Anexo I

| Categoria | Desde 30/09/2026 (Portaria 45/2026) | Redação original |
|---|---|---|
| SUS. Medicamentos | R$ 56,00 | R$ 45,00 |
| SUS. Consultas e tratamentos médicos | R$ 110,00 | R$ 90,00 |
| SUS. Fraldas | R$ 120,00 | R$ 99,00 |
| SUS. Alimentação especial | R$ 147,00 | R$ 121,00 |
| SUAS. Centro-Dia | R$ 40,00 | R$ 32,00 |
| Total | R$ 473,00 | R$ 387,00 |

Conferir os valores na fonte antes de cada peça.

## Categorias e prova

| Categoria | Abrange | Prova |
|---|---|---|
| Medicamentos | Prescrição de uso contínuo não fornecida pelo SUS | Receita vigente, notas fiscais, negativa ou indisponibilidade no SUS, declaração do CEAF no alto custo |
| Consultas e tratamentos | Consultas, fisioterapia, fonoaudiologia, terapia ocupacional, psicologia | Recibos, atestado de necessidade, fila ou indisponibilidade no SUS |
| Fraldas | Incontinência de idoso ou pessoa com deficiência | Atestado, notas fiscais, protocolo de pedido ao SUS e resposta |
| Alimentação especial | Dieta prescrita (doença celíaca, alergias, fórmulas especiais) | Prescrição, laudo que relacione doença e dieta, notas fiscais |
| Centro-Dia (SUAS) | Serviço de Proteção Especial para Idosos, Pessoas com Deficiência e suas famílias | Documento da necessidade e declaração do CRAS ou CREAS sobre a não disponibilização |

Órtese, prótese e suplemento não estão nominados; enquadrá-los como tratamento de saúde é tese. Cuidador particular e acolhimento institucional não integram a categoria do Centro-Dia; podem ser invocados na análise global da miserabilidade (art. 20, §11).

## Campos do requerimento

1. **Renda comprometida.** Marcar "sim" sempre que houver despesa real; o padrão "não" do sistema deve ser corrigido.
2. **Uso contínuo.** "Sim" para tratamento crônico, com receita que indique uso contínuo.
3. **Negativa do poder público.** Pedir o item ao SUS ou SUAS antes do requerimento e juntar o protocolo e a resposta. Silêncio prolongado deve ser documentado com o protocolo.
4. **Valor dedutível.** O sistema preenche o valor médio; havendo gasto maior, juntar os recibos do §7º.
5. **Concordância.** Não concordar com o valor médio quando o gasto efetivo for superior.

## Estratégia

1. Calcular a renda per capita nominal.
2. Identificar as categorias aplicáveis e as condições do §5º.
3. Reunir os recibos dos doze meses anteriores quando o gasto superar o valor médio.
4. Recalcular a renda após as deduções.
5. Abaixo de 1/4: presunção absoluta de miserabilidade (Tema 185 STJ). O Tema 122 TNU trata a presunção como relativa e é tese adversa.
6. Acima de 1/4: sustentar a análise concreta (Tema 27 STF e art. 20, §11), com estudo social e prova das despesas.
7. Indeferimento: recurso ao CRPS em 30 dias (Decreto 3.048/1999, art. 305, §1º) ou ação judicial.

Checklist operacional em `references/CHECKLIST-COMPROMETIMENTO-RENDA-BPC.md`.

## Integração

Requisitos em `base-bpc-loas-requisitos`; miserabilidade em `base-bpc-renda-per-capita-miserabilidade`; grupo familiar em `bpc-renda-grupo-familiar`; instrumento em `analise-bpc-loas`; Bolsa Família em `base-bpc-pbf-anuencia-in54-2026`; procedimentos em `base-bpc-aposentadoria-pcd-procedimentos`; recurso em `base-recurso-crps-peca-enxuta`; peça em `peticao-previdenciaria` e `base-peticao-previdenciaria-padrao-visual`; conferência literal em `base-legislacao-fontes-primarias`.

## MCPs da casa

Consulta obrigatória aos MCPs. Toda análise, peça ou orientação feita com esta skill parte de pesquisa prévia nos MCPs, antes da redação. O `normas` dá o dispositivo e o `norma_inss` do `iurisprudencia` dá a IN 128/2022; o `superiores` dá o tema e a decisão do STF e do STJ; o `iurisprudencia` e o `trf3` dão os acórdãos da TNU, do CRPS, do TRF3 e das Turmas Recursais de SP e MS sobre a mesma questão; o `acervo` dá o que o escritório já sustentou. As decisões localizadas servem de controle da tese. A resposta informa se elas confirmam ou contrariam o caminho adotado, e a divergência é enfrentada antes do protocolo. Norma, súmula, tema, enunciado ou acórdão não localizado no MCP nem lido na fonte oficial leva [NÃO CONFIRMADO] e fica fora da peça. A ordem de consulta, a cobertura de cada base e os catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) estão em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O reaproveitamento automático de texto do acervo de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.
