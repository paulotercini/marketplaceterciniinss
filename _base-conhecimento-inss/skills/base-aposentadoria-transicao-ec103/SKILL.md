---
name: base-aposentadoria-transicao-ec103
description: "Regras de transição da EC 103/2019 para aposentadoria por tempo de contribuição, sob a ótica do segurado. Use SEMPRE que mencionar regra de transição EC 103, art. 15 EC 103, art. 16 EC 103, art. 17 EC 103, art. 20 EC 103, pontos progressivos, fórmula 86/96 progressiva, pedágio 50%, pedágio 100%, idade mínima progressiva, professor transição, art. 20 §1º EC 103, escolha da regra mais vantajosa, comparativo entre regras, melhor regra de transição, tempo de contribuição mínimo 35 30, carência 180, Tema 334 STF melhor benefício, direito de escolha, fator previdenciário nas transições. Aciona peticao-previdenciaria. Cruza com base-aposentadoria-direito-adquirido, base-aposentadoria-regra-permanente-ec103, base-calculo-rmi-ec103, reafirmacao-der e precedentes-previdenciarios."
---

# Regras de Transição da EC 103/2019 (Aposentadoria por Tempo)

## Escopo

Escolha da regra de transição mais vantajosa ao segurado filiado ao RGPS até 13/11/2019 (vigência da EC 103). Detalhe normativo, cenários e refutação em `references/FUNDAMENTOS-E-CENARIOS.md` e `references/JURISPRUDENCIA-E-REFUTACAO.md`.

## As quatro regras de transição por tempo de contribuição

| Regra | Requisitos | RMI |
|---|---|---|
| Pontos (art. 15) | 35 anos de contribuição (H) / 30 (M) e soma idade + tempo, apurada em dias (§2º) | 60% da média + 2% por ano acima de 20 (H) ou 15 (M) (art. 26, §§2º, I, e 5º) |
| Idade progressiva (art. 16) | 35/30 anos de contribuição e idade mínima progressiva | 60% + 2% (art. 26, §2º, I) |
| Pedágio 50% (art. 17) | mais de 33 (H) / 28 (M) anos de contribuição em 13/11/2019; 35/30 anos e período adicional de 50% do tempo que faltava em 13/11/2019; sem idade mínima | média × fator previdenciário (art. 17, parágrafo único) |
| Pedágio 100% (art. 20) | 60 anos (H) / 57 (M), 35/30 anos e período adicional igual ao tempo que faltava em 13/11/2019 | 100% da média (art. 26, §3º, I) |

Art. 18 (aposentadoria por idade de transição: 65 H / 62 M, com acréscimo de 6 meses por ano para a mulher a partir de 60 anos em 2019, e 15 anos de contribuição) é tratado em `aposentadoria-idade-hibrida`.

## Tabela anual de exigências (arts. 15, §1º, e 16, §1º)

| Ano | Pontos M / H | Idade M / H (art. 16) |
|---|---|---|
| 2019 | 86 / 96 | 56 / 61 |
| 2020 | 87 / 97 | 56a6m / 61a6m |
| 2021 | 88 / 98 | 57 / 62 |
| 2022 | 89 / 99 | 57a6m / 62a6m |
| 2023 | 90 / 100 | 58 / 63 |
| 2024 | 91 / 101 | 58a6m / 63a6m |
| 2025 | 92 / 102 | 59 / 64 |
| 2026 | 93 / 103 | 59a6m / 64a6m |
| 2027 | 94 / 104 | 60 / 65 (limite H) |
| 2028 | 95 / 105 (limite H) | 60a6m / 65 |
| 2029 | 96 / 105 | 61 / 65 |
| 2030 | 97 / 105 | 61a6m / 65 |
| 2031 | 98 / 105 | 62 (limite M) / 65 |
| 2032 | 99 / 105 | 62 / 65 |
| 2033 | 100 (limite M) / 105 | 62 / 65 |

Professor (art. 15, §3º; art. 16, §2º; art. 20, §1º): redução de 5 anos no tempo e na idade, com tabelas próprias em `base-professor-regra-transicao-pontos-ec103`, `base-professor-regra-transicao-idade-progressiva-ec103` e `base-professor-regra-transicao-pedagio-ec103`. O art. 17 não tem versão de professor.

## Estratégia

1. Apurar o tempo de contribuição em 13/11/2019 (define a elegibilidade ao art. 17 e o pedágio dos arts. 17 e 20) e em cada ano seguinte.
2. Simular as quatro transições, o direito adquirido (`base-aposentadoria-direito-adquirido`) e a regra permanente (`base-aposentadoria-regra-permanente-ec103`), com DIB, RMI e renda líquida de cada hipótese (`base-calculo-rmi-ec103`).
3. Escolher a regra de maior RMI ou de acesso mais próximo, conforme o interesse do segurado. A escolha é direito do segurado (Tema 334 STF; art. 122 da Lei 8.213/91).
4. Requerimento prematuro: reafirmação da DER (Tema 995 STJ; `reafirmacao-der`).
5. Tempo especial até 13/11/2019 converte-se em comum (art. 25, §2º, EC 103) e compõe o tempo da transição (`base-tempo-especial-conversao`).

## Alertas

- O INSS costuma conceder pela primeira regra satisfeita, sem comparativo. Exigir o comparativo em recurso administrativo ou ação judicial.
- Exceções à fórmula 60% + 2%: art. 20 (100% da média) e art. 17 (média × fator). Para perfis de salários altos e idade baixa, o fator do art. 17 pode reduzir a RMI abaixo da obtida no art. 15 ou 16.
- A exigência de pontos e de idade varia por ano-calendário. A DIB deve coincidir com o dia em que se completam os requisitos da regra eleita.

## MCPs da casa

Pesquisa obrigatória. Norma, súmula, tema, enunciado ou acórdão citado nesta skill nasce [NÃO CONFIRMADO] e só entra em peça, parecer ou orientação depois de lido na fonte oficial, na forma de `pesquisa-jurisprudencia-chrome`. A ordem de consulta dos MCPs (`normas`, `superiores`, `trf3`, `iurisprudencia` e `acervo`) e dos catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) está em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O acervo serve à leitura do que o escritório já sustentou, e o reaproveitamento automático de texto de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Integração

- Peça: `peticao-previdenciaria`, bloco "Aposentadoria pelas regras de transição" de `peticao-previdenciaria/references/REDACAO-POR-ESPECIE.md`.
- Especial de transição (art. 21): `base-aposentadoria-especial-transicao-ec103`.
- Fungibilidade: `base-fungibilidade-previdenciaria`. Portarias: `base-portarias-dpmf-inss-hub`. Período rural: `base-segurado-especial-autodeclaracao-arts-92-93-94`.
- Jurisprudência: `precedentes-previdenciarios`.
