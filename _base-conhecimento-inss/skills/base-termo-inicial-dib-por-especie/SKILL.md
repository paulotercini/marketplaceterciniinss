---
name: base-termo-inicial-dib-por-especie
description: "Skill base sobre Data de Início do Benefício (DIB) e Data de Início do Pagamento (DIP) por espécie no RGPS, com sistematização de regras e exceções pró-segurado. Use SEMPRE que mencionar DIB previdenciária, data de início de benefício, data de entrada de requerimento DER, art. 49 Lei 8.213, art. 74 Lei 8.213, DIB B31, DIB B32, DIB B91, DIB B92, DIB B94, DIB B21, DIB B25, DIB B41, DIB B42, DIB BPC, retroação DIB, DIB pensão por morte 90 dias, DIB pensão por morte 180 dias, marco temporal pensão, art. 76 Lei 8.213, DIB auxílio-doença afastamento, art. 60 Lei 8.213, ouvidoria DIB, prazo 30 dias, prazo 90 dias, retroação ao óbito, DIB salário-maternidade, DIB BPC art. 21 LOAS, DIB aposentadoria por idade, DIB aposentadoria por tempo. Hub para defesa pró-segurado da DIB mais favorável em cada espécie. NÃO use para DIP isolada (cumprimento de sentença) nem decadência (skill própria). Cruza com peticao-previdenciaria, precedentes-previdenciarios e revisao-peticao."
---

# Termo Inicial. DIB por Espécie

## 1. Quando acionar esta skill

Acione SEMPRE que houver dúvida sobre a DIB aplicável, especialmente em situações de retroação, fixação ao DER, ao afastamento, ao óbito ou à incapacidade. A skill consolida o regime mais favorável ao segurado em cada espécie.

## 2. Marco normativo

A Lei 8.213/91 disciplina a DIB em diversos artigos. O art. 49 trata da aposentadoria. O art. 60 trata do auxílio-doença. O art. 74 trata da pensão por morte. O art. 76 trata da DIB excepcional. O art. 80 trata do auxílio-reclusão. A Lei 8.742/93, no art. 21, trata do BPC. As Leis 13.846/2019 e 13.183/2015 alteraram pontos relevantes. A IN INSS 128/2022 detalha o procedimento.

## 3. Eixos centrais pró-segurado

A DIB do auxílio-doença empregado é o décimo sexto dia do afastamento, se requerido em até 30 dias. Após 30 dias, é a DER (art. 60 §1º).

A DIB do auxílio-doença não empregado é a DER ou a data do afastamento se DER em até 30 dias.

A DIB da aposentadoria por idade, tempo de contribuição e especial é a DER (art. 49).

A DIB da pensão por morte é a data do óbito quando requerida em até 180 dias (filhos menores de 16 anos) ou em até 90 dias (demais dependentes), art. 74, I, redação da Lei 13.846/2019; após os prazos, a DIB é a DER.

A DIB do BPC é a DER (art. 21 LOAS).

A DIB do auxílio-acidente é o dia seguinte à cessação do auxílio-doença (art. 86).

## 4. Fragilidades adversárias mais comuns

O INSS aplica DER quando deveria aplicar afastamento. Refute com art. 60 §1º.

O INSS recusa retroação ao óbito em pensão por morte. Refute com art. 74.

O INSS aplica DIB tardia em BPC. Refute com art. 21 LOAS.

O INSS desconsidera afastamento em auxílio-doença. Refute com prova médica.

## 5. Estratégia processual

A defesa pró-segurado pivota em pedido expresso de DIB favorável, prova do afastamento ou óbito, e fundamentação no art. específico. Combinar com `peticao-previdenciaria`, `pensao-por-morte` e `base-incapacidade-b31-temporaria`.

## 5-A. Prova levada a juízo e o Tema 1124 (Onda 178)

Quando a DIB pedida depende de prova que não passou pelo INSS, a regra da espécie não basta para fixar a data. Vale o Tema 1124/STJ, e a peça passa pelo agente `conferente-tema-1124`. As datas legais dos arts. 49, 54, 57, § 2º, 60, 74 e 80 da Lei 8.213/91 continuam valendo quando o requerimento apto foi formulado dentro das hipóteses legais. Parte do TRF3 fixa a DIB na DER e os atrasados desde a citação, e por isso a peça pede que a DIB e os efeitos financeiros coincidam. Matriz em `tema-1124-instrucao-administrativa`.

## 6. Documentos essenciais

DER. Prova de afastamento. Atestado médico. Certidão de óbito. CTPS. CNIS.

## 7. Fontes

Consulte os arquivos `references/FUNDAMENTOS-E-CENARIOS.md` e `references/JURISPRUDENCIA-E-REFUTACAO.md`.

## Hub de portarias administrativas

As Portarias DPMF, DIRBEN e INSS que regem procedimento, cálculo e recurso estão em `base-portarias-dpmf-inss-hub`.

## MCPs da casa

Pesquisa obrigatória. Norma, súmula, tema, enunciado ou acórdão citado nesta skill nasce [NÃO CONFIRMADO] e só entra em peça, parecer ou orientação depois de lido na fonte oficial, na forma de `pesquisa-jurisprudencia-chrome`. A ordem de consulta dos MCPs (`normas`, `superiores`, `trf3`, `iurisprudencia` e `acervo`) e dos catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) está em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O acervo serve à leitura do que o escritório já sustentou, e o reaproveitamento automático de texto de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Juízo de Catanduva (Onda 179)

O juízo fixa a DIB na DER como regra, no dia seguinte à cessação do auxílio-doença no auxílio-acidente, na citação quando o documento não instruiu o requerimento e no pedido de revisão na revisão. Detalhe em `base-juizo-catanduva/references/BLOCOS-ESPECIAL-PROCESSO.md`, seção 15, e em `base-juizo-catanduva/references/BLOCOS-BENEFICIOS.md`.
