---
name: base-aposentadoria-regra-permanente-ec103
description: "Regra permanente de aposentadoria programada da EC 103/2019, sob a ótica do segurado. Use SEMPRE que mencionar regra permanente EC 103, regra definitiva EC 103, art. 19 EC 103, aposentadoria programada, aposentadoria idade urbana pós-reforma, novo segurado após a reforma, filiação após 13/11/2019, primeiro emprego após 2019, idade mínima 62 65 permanente, 15 anos tempo contribuição mulher, 20 anos tempo contribuição homem, art. 201 §7º CF pós-EC 103, carência 180, RMI regra permanente, divisor mínimo 108, descarte art. 26 §6º. Aciona peticao-previdenciaria. Cruza com base-aposentadoria-transicao-ec103, base-calculo-rmi-ec103, aposentadoria-idade-hibrida e precedentes-previdenciarios."
---

# Regra Permanente da EC 103/2019 (Aposentadoria Programada)

## Escopo

Aposentadoria do art. 19 da EC 103 para quem se filiou ao RGPS a partir de 14/11/2019. Quem era filiado até 13/11/2019 dispõe das transições (arts. 15 a 18 e 20) e do direito adquirido; para ele a via residual por idade é o art. 18, e não o art. 19. Cenários e refutação em `references/`.

## Requisitos

- Idade: 65 anos (H) e 62 (M) (CF, art. 201, §7º, I; EC 103, art. 19, caput).
- Tempo de contribuição: 20 anos (H) e 15 (M) (art. 19, caput).
- Carência: 180 contribuições (Lei 8.213/91, art. 25, II).
- Trabalhador rural e segurado especial: 60 anos (H) e 55 (M), com 15 anos de atividade rural (CF, art. 201, §7º, II; Lei 8.213/91, art. 48, §§1º e 2º). Híbrida: art. 48, §3º (`aposentadoria-idade-hibrida`).

## Cálculo

- Média de 100% dos salários de contribuição desde 07/1994 ou desde o início das contribuições (EC 103, art. 26, caput), limitada ao teto (§1º).
- RMI: 60% da média + 2% por ano acima de 20 anos (H) ou 15 (M) (art. 26, §§2º e 5º). Sem fator previdenciário.
- Exclusão de contribuições que reduzam a média, mantido o tempo mínimo; o tempo excluído não serve para acréscimo nem para outro regime (art. 26, §6º).
- Divisor mínimo de 108 meses: apenas para quem se filiou até julho de 1994 (Lei 8.213/91, art. 135-A, incluído pela Lei 14.331/2022). Não alcança o filiado após a reforma.

Detalhe em `base-calculo-rmi-ec103`.

## Estratégia

1. Confirmar a data de filiação. Filiado até 13/11/2019: aplicar `base-aposentadoria-transicao-ec103` e `base-aposentadoria-direito-adquirido`.
2. Acertar o CNIS antes do requerimento (`base-cnis-acerto-indicadores`).
3. Avaliar indenização ou complementação de contribuições (`indenizacao-contribuicoes-atraso`, `contribuicoes-complementacao-ec103`).
4. Simular a RMI com e sem anos adicionais de contribuição e com a exclusão do §6º.

## MCPs da casa

Consulta obrigatória aos MCPs. Toda análise, peça ou orientação feita com esta skill parte de pesquisa prévia nos MCPs, antes da redação. O `normas` dá o dispositivo e o `norma_inss` do `iurisprudencia` dá a IN 128/2022; o `superiores` dá o tema e a decisão do STF e do STJ; o `iurisprudencia` e o `trf3` dão os acórdãos da TNU, do CRPS, do TRF3 e das Turmas Recursais de SP e MS sobre a mesma questão; o `acervo` dá o que o escritório já sustentou. As decisões localizadas servem de controle da tese. A resposta informa se elas confirmam ou contrariam o caminho adotado, e a divergência é enfrentada antes do protocolo. Norma, súmula, tema, enunciado ou acórdão não localizado no MCP nem lido na fonte oficial leva [NÃO CONFIRMADO] e fica fora da peça. A ordem de consulta, a cobertura de cada base e os catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) estão em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O reaproveitamento automático de texto do acervo de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Integração

- Peça: `peticao-previdenciaria`, bloco "Aposentadoria por idade urbana e programada" de `peticao-previdenciaria/references/REDACAO-POR-ESPECIE.md`.
- Qualidade de segurado: `periodo-graca-qualidade-segurado`. Rural: `segurado-especial-rural`. Facultativo baixa renda: `base-facultativo-baixa-renda`.
- Fungibilidade: `base-fungibilidade-previdenciaria`. Portarias: `base-portarias-dpmf-inss-hub`.
- Especial: `base-aposentadoria-especial-transicao-ec103`. Revisão de minuta: `revisao-peticao`.
