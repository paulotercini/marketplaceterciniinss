---
name: base-termo-inicial-dib-por-especie
description: "Skill base sobre Data de Início do Benefício (DIB) e Data de Início do Pagamento (DIP) por espécie no RGPS, com sistematização de regras e exceções pró-segurado. Use SEMPRE que mencionar DIB previdenciária, data de início de benefício, data de entrada de requerimento DER, art. 49 Lei 8.213, art. 74 Lei 8.213, DIB B31, DIB B32, DIB B91, DIB B92, DIB B94, DIB B21, DIB B25, DIB B41, DIB B42, DIB BPC, retroação DIB, DIB pensão por morte 90 dias, DIB pensão por morte 180 dias, marco temporal pensão, art. 76 Lei 8.213, art. 86 §2º Lei 8.213, Tema 862 STJ, Súmula 576 STJ, DIB auxílio-doença afastamento, art. 60 Lei 8.213, ouvidoria DIB, prazo 30 dias, prazo 90 dias, retroação ao óbito, DIB salário-maternidade, DIB BPC art. 37 LOAS, DIB aposentadoria por idade, DIB aposentadoria por tempo. Hub para defesa pró-segurado da DIB mais favorável em cada espécie. NÃO use para DIP isolada (cumprimento de sentença) nem decadência (skill própria). Cruza com peticao-previdenciaria, precedentes-previdenciarios e revisao-peticao."
---

# Termo Inicial. DIB por Espécie

## Quando acionar

Dúvida sobre a DIB aplicável: retroação ao afastamento, ao óbito, à incapacidade ou fixação na DER.

## Quadro por espécie (Lei 8.213/91, salvo indicação)

| Espécie | DIB | Fundamento |
|---|---|---|
| Aposentadoria por idade, empregado | Desligamento, se requerida até 90 dias depois; senão, DER | Art. 49, I |
| Aposentadoria por idade, demais segurados | DER | Art. 49, II |
| Aposentadoria por tempo de contribuição | Mesma regra do art. 49 | Art. 54 |
| Aposentadoria especial | Mesma regra do art. 49 | Art. 57, §2º |
| Auxílio por incapacidade temporária, empregado | 16º dia do afastamento | Art. 60, caput |
| Auxílio por incapacidade temporária, demais | Início da incapacidade | Art. 60, caput |
| Auxílio por incapacidade temporária requerido após 30 dias de afastamento | DER | Art. 60, §1º |
| Aposentadoria por incapacidade permanente | Dia seguinte à cessação do auxílio; sem auxílio prévio, 16º dia do afastamento (empregado) ou início da incapacidade (demais), ou DER se requerida após 30 dias | Art. 43, caput e §1º |
| Auxílio-acidente | Dia seguinte à cessação do auxílio por incapacidade | Art. 86, §2º; Tema 862 STJ |
| Pensão por morte | Óbito, se requerida em até 180 dias (filhos menores de 16) ou 90 dias (demais); depois, DER; morte presumida, decisão judicial | Art. 74 (Lei 13.846/2019) |
| Auxílio-reclusão | Regras da pensão, a partir da prisão | Art. 80 |
| Salário-maternidade | Entre 28 dias antes do parto e o parto | Art. 71 |
| BPC | DER, cumpridos os requisitos | Lei 8.742/93, art. 37 |

## Regras judiciais

- Sem requerimento administrativo prévio, na aposentadoria por invalidez concedida em juízo, a DIB é a citação (Tema 626 STJ; Súmula 576 STJ). A regra geral, porém, exige requerimento prévio (Tema 350 STF).
- Perícia judicial que mostra incapacidade já existente na DER: DIB na DER (Súmula 22 TNU, no benefício assistencial; mesma lógica nos benefícios por incapacidade).
- Requisitos completados após a DER: reafirmação (Tema 995 STJ; `reafirmacao-der`).
- Habilitação tardia na pensão: o art. 76 garante a cota a partir da habilitação, sem retroação em prejuízo de quem já recebe.

## Prova levada apenas a juízo (Tema 1124 STJ)

Quando a DIB depende de prova que não passou pelo INSS, aplica-se o Tema 1124 STJ, e a peça passa pelo agente `conferente-tema-1124`. As datas legais continuam valendo quando o requerimento apto foi formulado. Parte do TRF3 fixa a DIB na DER e os atrasados desde a citação; a peça pede que DIB e efeitos financeiros coincidam. Matriz em `tema-1124-instrucao-administrativa`.

## Juízo de Catanduva

O juízo fixa a DIB na DER como regra, no dia seguinte à cessação do auxílio-doença no auxílio-acidente, na citação quando o documento não instruiu o requerimento e no pedido de revisão na revisão. Detalhe em `base-juizo-catanduva/references/BLOCOS-ESPECIAL-PROCESSO.md`, seção 15, e em `base-juizo-catanduva/references/BLOCOS-BENEFICIOS.md`.

## MCPs da casa

Consulta obrigatória aos MCPs. Toda análise, peça ou orientação feita com esta skill parte de pesquisa prévia nos MCPs, antes da redação. O `normas` dá o dispositivo e o `norma_inss` do `iurisprudencia` dá a IN 128/2022; o `superiores` dá o tema e a decisão do STF e do STJ; o `iurisprudencia` e o `trf3` dão os acórdãos da TNU, do CRPS, do TRF3 e das Turmas Recursais de SP e MS sobre a mesma questão; o `acervo` dá o que o escritório já sustentou. As decisões localizadas servem de controle da tese. A resposta informa se elas confirmam ou contrariam o caminho adotado, e a divergência é enfrentada antes do protocolo. Norma, súmula, tema, enunciado ou acórdão não localizado no MCP nem lido na fonte oficial leva [NÃO CONFIRMADO] e fica fora da peça. A ordem de consulta, a cobertura de cada base e os catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) estão em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O reaproveitamento automático de texto do acervo de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Integração

`peticao-previdenciaria`, `pensao-por-morte`, `base-incapacidade-b31-temporaria`, `reafirmacao-der`, `tema-1124-instrucao-administrativa`, `precedentes-previdenciarios`, `revisao-peticao`, `base-portarias-dpmf-inss-hub`.
