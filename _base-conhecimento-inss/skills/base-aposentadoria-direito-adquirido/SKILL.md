---
name: base-aposentadoria-direito-adquirido
description: "Direito adquirido à aposentadoria pelas regras anteriores à EC 103/2019, na defesa do segurado. Use SEMPRE que mencionar direito adquirido aposentadoria, regras pré-reforma, art. 3º EC 103, Súmula 359 STF, RE 630.501, Tema 334 STF, melhor benefício, aposentadoria por tempo de contribuição 35 30, aposentadoria proporcional, EC 20 art. 9º, pedágio 20% integral, pedágio 40% proporcional, aposentadoria especial pré-reforma, requisitos até 13/11/2019, acervo contributivo pré-reforma, professor 30 25, art. 53 Lei 8.213, fator previdenciário, regra 85/95 progressiva art. 29-C Lei 13.183/2015, desaposentação Tema 503 STF, revisão da vida toda Tema 1102 STF. Cruza com peticao-previdenciaria, precedentes-previdenciarios, revisao-peticao e reafirmacao-der."
---

# Aposentadoria com Direito Adquirido (Requisitos até 13/11/2019)

## Escopo

Identificar e efetivar o direito à aposentadoria pelas regras anteriores à EC 103/2019 para quem reuniu os requisitos até 13/11/2019. Cenários e refutação em `references/`.

## Fundamento

- CF, art. 5º, XXXVI: a lei não prejudica o direito adquirido.
- EC 103, art. 3º: concessão assegurada, a qualquer tempo, a quem cumpriu os requisitos até a data de entrada em vigor da Emenda, observados os critérios da legislação vigente na data do cumprimento dos requisitos.
- Súmula 359 STF e Tema 334 STF: aplica-se a lei do tempo em que reunidos os requisitos e o quadro mais favorável.

## Hipóteses de direito adquirido em 13/11/2019

| Hipótese | Requisitos | RMI |
|---|---|---|
| Tempo de contribuição integral (CF, art. 201, §7º, I, redação da EC 20; Lei 8.213/91, art. 52 e seguintes) | 35 anos (H) / 30 (M), sem idade mínima | 100% do salário de benefício com fator previdenciário; sem fator se atingida a pontuação do art. 29-C |
| Regra 85/95 (Lei 8.213/91, art. 29-C) | 35/30 anos e 96/86 pontos de 31/12/2018 a 13/11/2019 (95/85 até 30/12/2018) | 100% sem fator |
| Professor (Lei 8.213/91, art. 56) | 30 anos (H) / 25 (M) de magistério na educação infantil, ensino fundamental ou médio | com fator; sem fator se a soma atingir a pontuação do art. 29-C com o bônus de 5 pontos (§3º) |
| Proporcional da EC 20 (art. 9º, §1º, revogado pela EC 103, aplicável por direito adquirido) | 53 anos (H) / 48 (M), 30/25 anos e pedágio de 40% do tempo que faltava em 16/12/1998 | 70% + 5% por ano acima da soma, até 100% |
| Tempo de serviço até 16/12/1998 (Lei 8.213/91, art. 53) | 30 anos (H) / 25 (M), sem idade | 70% + 6% por ano, até 100% aos 35/30 |
| Especial (Lei 8.213/91, art. 57) | 15, 20 ou 25 anos de atividade especial, sem idade mínima | 100% do salário de benefício, sem fator |
| Idade urbana (art. 48) | 65 (H) / 60 (M) e carência | 70% + 1% por grupo de 12 contribuições (art. 50) |
| Idade rural (art. 48, §§1º e 2º) | 60 (H) / 55 (M) e 15 anos de atividade rural | 1 salário mínimo ao segurado especial (art. 39, I) |

Salário de benefício pré-reforma: média dos 80% maiores salários de contribuição desde 07/1994 (Lei 8.213/91, art. 29, I e II; Lei 9.876/99, art. 3º, caput), com divisor mínimo de 60% do período decorrido entre 07/1994 e a DIB (art. 3º, §2º, Lei 9.876/99).

## Estratégia

1. Fechar o tempo de contribuição em 13/11/2019, com CNIS e PPP auditados (`auditoria-ppp`, `retificacao-ppp`).
2. Testar cada hipótese da tabela e calcular a RMI em cada data em que os requisitos já estavam reunidos (Tema 334 STF).
3. Comparar com as transições (`base-aposentadoria-transicao-ec103`) e escolher a de maior RMI. O direito adquirido não precisa ter sido exercido antes da reforma.
4. Benefício já concedido por regra menos vantajosa: revisão dentro do prazo do art. 103 da Lei 8.213/91 (Tema 966 STJ; `decadencia-revisao-previdenciaria`).

## Alertas

- O INSS aplica com frequência regra de transição a quem tinha direito adquirido. Impugnar pelo art. 3º da EC 103.
- Revisão da vida toda: tese superada. O STF declarou constitucional o art. 3º da Lei 9.876/99 (ADIs 2110 e 2111, 21/03/2024) e o Tema 1102 passou a ter tese adversa, com trânsito em 15/05/2026. Remanesce apenas a modulação (irrepetibilidade do recebido por decisão judicial prolatada até 05/04/2024 e dispensa de honorários, custas e perícias nas ações pendentes naquela data). Ver `base-revisao-vida-toda-rvt`.
- Desaposentação e reaposentação são vedadas (Tema 503 STF). A revisão por melhor benefício com requisitos anteriores à DIB não se confunde com elas.

## MCPs da casa

Pesquisa obrigatória. Norma, súmula, tema, enunciado ou acórdão citado nesta skill nasce [NÃO CONFIRMADO] e só entra em peça, parecer ou orientação depois de lido na fonte oficial, na forma de `pesquisa-jurisprudencia-chrome`. A ordem de consulta dos MCPs (`normas`, `superiores`, `trf3`, `iurisprudencia` e `acervo`) e dos catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) está em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O acervo serve à leitura do que o escritório já sustentou, e o reaproveitamento automático de texto de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Integração

- Peça: `peticao-previdenciaria`, bloco "Aposentadoria por tempo de contribuição com direito adquirido" de `peticao-previdenciaria/references/REDACAO-POR-ESPECIE.md`. Revisão de minuta: `revisao-peticao`.
- Reafirmação da DER: `reafirmacao-der`. Professor com tempo até 16/12/1998: `base-professor-direito-adquirido-ec20`.
- Fungibilidade: `base-fungibilidade-previdenciaria`. Portarias: `base-portarias-dpmf-inss-hub`. Rural: `base-segurado-especial-autodeclaracao-arts-92-93-94`.
- Especial de transição: `base-aposentadoria-especial-transicao-ec103`.
