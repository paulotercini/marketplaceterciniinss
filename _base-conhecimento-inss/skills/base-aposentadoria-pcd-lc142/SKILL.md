---
name: base-aposentadoria-pcd-lc142
description: "Aposentadoria da pessoa com deficiência pela LC 142/2013, ótica pró-segurado. Use SEMPRE que mencionar LC 142, LC 142/2013, aposentadoria PCD, aposentadoria por tempo de contribuição PCD, aposentadoria por idade PCD, IF-BrA, IFBr, grau de deficiência, método Fuzzy, avaliação biopsicossocial LC 142, Portaria Interministerial AGU/MPS/MF/MP/PR nº 1, de 27/01/2014, domínios da deficiência PCD, pontuação IF-BrA, conversão tempo deficiência tempo comum, impedimento longo prazo LC 142, fibromialgia como deficiência Lei 15.176/2025, CID M79.7, DID Data Início Deficiência, formação documentação DID, idade PCD 55 60, tempo PCD 20 25 28 30 33, reconhecimento retroativo deficiência, cegueira monocular Súmula 377, deficiência auditiva Lei 14.768/2023, fator vedado LC 142, Portaria 991/2022 (reconhecimento), Portaria 992/2022 (manutenção). Aciona aposentadoria-deficiencia. Cruza com aposentadoria-deficiencia, base-bpc-impedimento-longo-prazo, peticao-previdenciaria, formacao-documentacao-did-pcd e precedentes-previdenciarios."
---

# Aposentadoria da Pessoa com Deficiência. LC 142/2013

## Escopo

Skill temática pró-segurado. Focaliza a aposentadoria por tempo de contribuição e por idade da pessoa com deficiência na LC 142/2013. Trata da avaliação biopsicossocial com IF-BrA (Índice de Funcionalidade Brasileiro Aplicado), método Fuzzy, domínios, conversão de tempo especial, DID (Data de Início da Deficiência), fibromialgia pela Lei 15.176/2025 e particularidades da deficiência auditiva pela Lei 14.768/2023. Objetivo único é a defesa integral do segurado PCD.

## Marco normativo central

CF/88, art. 201, §1º. Previsão de aposentadoria diferenciada para PCD.

LC 142/2013, art. 2º. Conceito de pessoa com deficiência para fins de aposentadoria.

LC 142/2013, art. 3º. Requisitos por tempo de contribuição, variáveis conforme grau de deficiência.

LC 142/2013, art. 4º. Requisitos por idade.

LC 142/2013, art. 5º. Cálculo dos benefícios (salário de benefício pela média aritmética simples dos 80% maiores salários, sem fator previdenciário em regra).

LC 142/2013, art. 8º. Conversão de tempo de deficiência em tempo comum e vice-versa.

Decreto 8.145/2013. Regulamento.

Portaria Interministerial AGU/MPS/MF/MP/PR nº 1, de 27/01/2014. IF-BrA, domínios, método Fuzzy.

Lei 15.176/2025. Fibromialgia reconhecida como deficiência.

Lei 14.768/2023. Aperfeiçoamento da avaliação de deficiência auditiva.

Lei 13.146/2015 (Estatuto da PCD). Conceito biopsicossocial.

Súmula 45 TNU. Aproveitamento de tempo PCD, anterior à LC 142.

EC 103/2019, art. 22 (e §2º). Preserva a aposentadoria PCD fora da regra geral.

Portaria DPMF/INSS 990/2022 (alterada pela Portaria 1.316/2025). Indicadores do CNIS, formulários RAC e regras operacionais.

Portaria DPMF/INSS 991/2022. Procedimentos de concessão, revisão administrativa e instrução do benefício.

Portaria DPMF/INSS 992/2022. Manutenção de benefícios, folha de pagamento, descontos, suspensão e cessação (Livro III).

## Tempo de contribuição exigido

Deficiência grave. Homem 25 anos. Mulher 20 anos.

Deficiência moderada. Homem 29 anos. Mulher 24 anos.

Deficiência leve. Homem 33 anos. Mulher 28 anos.

## Aposentadoria por idade PCD

Homem 60 anos com 15 anos de contribuição na condição de PCD.

Mulher 55 anos com 15 anos de contribuição na condição de PCD.

## Avaliação biopsicossocial. IF-BrA e Fuzzy

Diferente do BPC. Aqui usa-se IF-BrA (não IFBrM). Aplica-se método Fuzzy para conversão da pontuação em grau.

Domínios IF-BrA (sete, conforme a Portaria Interministerial nº 1/2014): Primeiro, sensorial. Segundo, comunicação. Terceiro, mobilidade. Quarto, cuidados pessoais. Quinto, vida doméstica. Sexto, educação, trabalho e vida econômica (domínio único). Sétimo, socialização e vida comunitária.

Pontuação. Cada domínio é pontuado. O método Fuzzy combina as pontuações para classificar em grave, moderado ou leve.

Avaliação médica + avaliação social. Ambas obrigatórias.

## DID. Data de Início da Deficiência

Momento de maior disputa. Deve ser fixada com base em prognóstico e evidências médicas. Quando ausente documentação pretérita, pode-se reconstituir via skill `formacao-documentacao-did-pcd`.

Efeitos. Define o tempo de contribuição como PCD. Converte tempo posterior à DID. Tempo anterior à DID conta como tempo comum.

## Cálculo do benefício

Regra da LC 142. Média aritmética simples dos 80% maiores salários desde 07/1994. Sem fator previdenciário em regra. 100% da média (não 60% + 2% por ano excedente, regra geral do art. 26 da EC 103).

Exceção. Em aposentadoria por idade PCD, 70% da média + 1% por grupo de 12 contribuições adicionais (verificar regra vigente).

## Conversão de tempo

Tempo PCD pode ser convertido em tempo comum. Fatores variáveis conforme grau e gênero. A conversão inversa (comum em PCD) é vedada.

## Fibromialgia pela Lei 15.176/2025

Reconhecimento expresso como deficiência. Aplica-se IF-BrA para mensurar grau. Acionar `aposentadoria-deficiencia` complementarmente.

## Deficiência auditiva pela Lei 14.768/2023

Aperfeiçoa a avaliação. Surdez unilateral pode configurar deficiência (revisitar Súmula 552 STJ). Cegueira monocular equiparada por analogia (Súmula 377 STJ).

## Regra e estratégia pró-segurado

A regra geral é concessão com DID bem fixada e IF-BrA favorável.

Primeiro, mapear o momento da DID com documentação robusta.

Segundo, reunir toda documentação médica pretérita. Em ausência, acionar `formacao-documentacao-did-pcd`.

Terceiro, orientar o segurado para a avaliação (acionar `orientacao-cliente-pericia`).

Quarto, impugnar grau atribuído se subestimado.

Quinto, converter tempo com cuidado.

Sexto, em fibromialgia e deficiência auditiva, invocar leis específicas.

Sétimo, em recurso, impugnar pontuação domínio a domínio.

Oitavo, em MS, competência Federal ou JEF.

## Integração com outras skills

Detalhamento da aposentadoria PCD em `aposentadoria-deficiencia` (skill base do escritório).
Impedimento de longo prazo para BPC em `base-bpc-impedimento-longo-prazo`.
Formação de documentação DID em `formacao-documentacao-did-pcd`.
Orientação ao cliente em `orientacao-cliente-pericia`.
Deficiência auditiva em `deficiencia-auditiva-previdenciaria`.
Peça em `peticao-previdenciaria`.
Precedentes em `precedentes-previdenciarios`.

## Alertas

Primeiro, LC 142 é autônoma em relação à EC 103.

Segundo, fator previdenciário é vedado em regra.

Terceiro, DID é o grande campo de disputa.

Quarto, conversão inversa (comum em PCD) é vedada.

Quinto, fibromialgia é deficiência pela Lei 15.176/2025.

Sexto, deficiência auditiva pela Lei 14.768/2023.

Sétimo, cegueira monocular equiparada pela Súmula 377 STJ.

## Fungibilidade aplicável

Fungibilidade previdenciária. Acionar `base-fungibilidade-previdenciaria` para análise da relação entre este benefício e outros eventualmente cabíveis (REsp 2.246.096/MG, Tema 217 TNU, Tema 1018 STJ, Tema 995 STJ, vedação à conversão prejudicial).

## Hub de portarias administrativas

Hub das Portarias DPMF/DIRBEN/INSS aplicáveis a este benefício. Acionar `base-portarias-dpmf-inss-hub` para identificar quais Portarias regem o procedimento administrativo, o cálculo, as ratificações e os recursos no caso concreto.

## Doutrina de apoio

Frederico Amado sustenta leitura ampla.

Hugo Goes detalha requisitos.

Fábio Zambitte Ibrahim defende interpretação constitucional.

Wladimir Novaes Martinez analisa evolução.

Daniel Pulino aprofunda o conceito de deficiência.

Marco Aurélio Serau Junior analisa a proteção social.

O IBDP sustenta a proteção integral.

## O que NÃO está nesta skill

BPC está em `base-bpc-loas-requisitos`, `base-bpc-renda-per-capita-miserabilidade` e `base-bpc-impedimento-longo-prazo`. Procedimentos operacionais estão em `base-bpc-aposentadoria-pcd-procedimentos`. Aposentadorias comuns estão nas skills de Onda 3.

## Lei Brasileira de Inclusão como fundamento obrigatório (Onda 89)

Acionar SEMPRE `base-lbi-inclusao-barreiras-lei13146` neste tipo de caso. A Lei 13.146/2015 define, no art. 2º, que pessoa com deficiência é aquela com impedimento de longo prazo que, EM INTERAÇÃO COM UMA OU MAIS BARREIRAS, pode obstruir a participação plena e efetiva em igualdade de condições. Sem barreira demonstrada, o caso se reduz a diagnóstico, e diagnóstico isolado o INSS indefere.

Percorrer as SEIS barreiras do art. 3º, IV, uma a uma, registrando a que existir com fato concreto e documento por ID. Urbanística, arquitetônica, nos transportes, nas comunicações e na informação, atitudinal e tecnológica.

Cobrar os quatro incisos do art. 2º, § 1º, na avaliação e no relatório. Impedimentos nas funções e estruturas do corpo, fatores socioambientais, psicológicos e pessoais, limitação no desempenho de atividades e restrição de participação. Laudo que só descreve o corpo deixa de avaliar três quartos do que a lei manda avaliar.

O conceito tem base convencional com estatura de emenda constitucional (Decreto Legislativo 186/2008 e Decreto 6.949/2009), o que impede portaria, instrução normativa ou instrumento de avaliação de restringi-lo.
