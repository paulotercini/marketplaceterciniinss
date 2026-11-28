---
name: base-aposentadoria-pcd-lc142
description: "Resumo operacional da aposentadoria da pessoa com deficiência pela LC 142/2013, ótica pró-segurado. Use SEMPRE que mencionar LC 142, LC 142/2013, aposentadoria PCD, aposentadoria por tempo de contribuição PCD, aposentadoria por idade PCD, IF-BrA, IFBr, grau de deficiência, método Fuzzy, avaliação biopsicossocial LC 142, Portaria Interministerial SDH/MPS/MF/MOG/AGU nº 1, de 27/01/2014, domínios da deficiência PCD, pontuação IF-BrA, conversão tempo deficiência tempo comum, impedimento longo prazo LC 142, fibromialgia Lei 15.176/2025, CID M79.7, DID Data Início Deficiência, formação documentação DID, idade PCD 55 60, tempo PCD 20 24 28 25 29 33, reconhecimento retroativo deficiência, visão monocular, deficiência auditiva Lei 14.768/2023, fator previdenciário se mais vantajoso LC 142, art. 22 EC 103 cálculo, Portaria 991/2022 (reconhecimento), Portaria 992/2022 (manutenção). Análise detalhada em aposentadoria-deficiencia. Cruza com base-pcd-if-bra-metodologia, base-pcd-did-retroativa, base-pcd-conversao-tempo-especial-pcd, formacao-documentacao-did-pcd, peticao-previdenciaria e precedentes-previdenciarios."
---

# Aposentadoria da Pessoa com Deficiência. Resumo Operacional

## Escopo

Quadro de consulta rápida da aposentadoria PCD da LC 142/2013. A análise completa (conversões dos arts. 70-E e 70-F, laudo funcional, relatório e TEA) está em `aposentadoria-deficiencia`; o instrumento de avaliação, em `base-pcd-if-bra-metodologia`.

## Marco normativo

CF, art. 201, §1º, I. LC 142/2013, arts. 2º a 10. EC 103/2019, art. 22. Decreto 3.048/1999, arts. 70-A a 70-J. IN PRES/INSS 128/2022, arts. 306 e seguintes. Portaria Interministerial SDH/MPS/MF/MOG/AGU nº 1, de 27/01/2014 (IF-BrA). Lei 13.146/2015, art. 2º. Portarias DIRBEN/INSS 990, 991 e 992/2022 (CNIS, reconhecimento e manutenção), em `base-portarias-dpmf-inss-hub`.

## Requisitos

| Modalidade | Homem | Mulher |
|---|---|---|
| Grave (art. 3º, I) | 25 anos de contribuição | 20 anos |
| Moderada (art. 3º, II) | 29 anos | 24 anos |
| Leve (art. 3º, III) | 33 anos | 28 anos |
| Idade (art. 3º, IV) | 60 anos, com 15 anos como PCD | 55 anos, com 15 anos como PCD |

## Avaliação

Avaliação médica e funcional pelo IF-BrA, feita por perito médico e assistente social (LC 142, arts. 4º e 5º; Decreto 3.048/1999, art. 70-A). Sete domínios e 41 atividades, cada atividade pontuada 25, 50, 75 ou 100 por cada avaliador. Total de 2.050 a 8.200: grave até 5.739; moderada de 5.740 a 6.354; leve de 6.355 a 7.584; 7.585 ou mais é insuficiente. O Fuzzy replica a menor nota no domínio sensível e deve ser conferido em todo caso. No BPC o instrumento é outro (`analise-bpc-loas`).

## Cálculo

- Por tempo: 100% do salário de benefício (LC 142, art. 8º, I).
- Por idade: 70% mais 1% por grupo de 12 contribuições, até 30% (art. 8º, II).
- Fator previdenciário apenas se elevar a renda (art. 9º, I).
- O INSS usa a média de 100% dos salários desde 07/1994 (Decreto 3.048/1999, art. 70-J c/c art. 32).
- Tese pró-segurado: o art. 22 da EC 103/2019 preserva a LC 142 "inclusive quanto aos critérios de cálculo", e o art. 8º da LC 142 remete ao art. 29 da Lei 8.213/1991 (80% maiores salários). Jurisprudência firmada: Não localizado. Simular os dois cálculos.
- Opção pelo benefício mais vantajoso (art. 9º, V).

## DID e tempo anterior

A perícia fixa a data provável de início da deficiência e os períodos de cada grau (Decreto 3.048/1999, art. 70-D, I e II). O tempo anterior à LC 142 conta como PCD com prova documental; a prova exclusivamente testemunhal é vedada (LC 142, art. 6º, §§1º e 2º; art. 70-D, §1º). Ver `base-pcd-did-retroativa` e `formacao-documentacao-did-pcd`.

## Conversões

- Variação de grau ou período sem deficiência: ajuste proporcional pela tabela do art. 70-E, com o grau preponderante definindo a tabela (LC 142, art. 7º).
- Tempo especial: conversão para a aposentadoria PCD pelo art. 70-F, §1º, para períodos até 13/11/2019 (IN 128/2022, art. 310, §1º).
- Vedações: acumular, no mesmo período, as reduções da LC 142 e da atividade especial (LC 142, art. 10); converter tempo PCD para a aposentadoria especial (art. 70-F, §2º).

Tabelas em `aposentadoria-deficiencia` e `base-pcd-conversao-tempo-especial-pcd`.

## Leis específicas

- **Fibromialgia.** Lei 14.705/2023, art. 1º-C (Lei 15.176/2025): equiparação condicionada à avaliação biopsicossocial. Ver `base-pcd-fibromialgia-lei15176`.
- **Deficiência auditiva.** Lei 14.768/2023, art. 1º: perda unilateral total ou bilateral parcial ou total, aferida na forma da lei.
- **Visão monocular.** Lei 14.126/2021: deficiência sensorial do tipo visual; o grau depende do IF-BrA. A Súmula 377 STJ trata de vagas em concurso.
- **TEA.** Lei 12.764/2012, art. 1º, §2º. Ver `aposentadoria-deficiencia`.

Detalhe sensorial em `base-pcd-deficiencia-auditiva-visual`.

## Roteiro pró-segurado

1. Fixar a DID com documentação contemporânea.
2. Reunir a prova médica pretérita ou reconstruí-la (`formacao-documentacao-did-pcd`).
3. Preparar o segurado para a avaliação (`orientacao-cliente-pericia`).
4. Conferir o laudo atividade por atividade, inclusive o Fuzzy e as barreiras.
5. Simular conversões e o cálculo pela tese do art. 22 da EC 103.
6. Em recurso, impugnar a pontuação domínio a domínio.
7. Em revisão de aposentadoria comum para PCD, observar a decadência do art. 103 da Lei 8.213/1991.
8. Mandado de segurança tramita na Vara Federal comum, nunca no JEF (Lei 10.259/2001, art. 3º, §1º, I).

## Refutação a argumentos típicos do INSS

- **DID posterior à filiação.** Prova documental contemporânea e art. 70-D, I.
- **Grau subestimado.** Impugnação atividade por atividade, assistente técnico e laudos complementares.
- **Tempo anterior a 2013.** LC 142, art. 6º, §1º.
- **Fibromialgia não é deficiência.** Lei 14.705/2023, art. 1º-C: cabe a avaliação biopsicossocial, e não a recusa prévia.
- **Fator previdenciário.** Incide apenas se mais vantajoso (art. 9º, I).
- **Recusa da conversão de tempo comum.** Art. 70-E, linhas "De 30" e "De 35".

## Fungibilidade

Relação com outros benefícios cabíveis em `base-fungibilidade-previdenciaria`.

## Lei Brasileira de Inclusão como fundamento obrigatório

Acionar sempre `base-lbi-inclusao-barreiras-lei13146`. Percorrer as seis barreiras do art. 3º, IV, da Lei 13.146/2015, com fato concreto e documento por ID, e cobrar os quatro incisos do art. 2º, §1º, na avaliação e no relatório.

## Redação da peça

Seguir o bloco "Aposentadoria da pessoa com deficiência" de `peticao-previdenciaria/references/REDACAO-POR-ESPECIE.md`.

## O que não está nesta skill

BPC em `base-bpc-loas-requisitos`, `base-bpc-renda-per-capita-miserabilidade` e `base-bpc-impedimento-longo-prazo`. Procedimentos administrativos em `base-bpc-aposentadoria-pcd-procedimentos`.

## MCPs da casa

Pesquisa obrigatória. Norma, súmula, tema, enunciado ou acórdão citado nesta skill nasce [NÃO CONFIRMADO] e só entra em peça, parecer ou orientação depois de lido na fonte oficial, na forma de `pesquisa-jurisprudencia-chrome`. A ordem de consulta dos MCPs (`normas`, `superiores`, `trf3`, `iurisprudencia` e `acervo`) e dos catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) está em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O acervo serve à leitura do que o escritório já sustentou, e o reaproveitamento automático de texto de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.
