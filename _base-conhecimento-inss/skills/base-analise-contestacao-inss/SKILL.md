---
name: base-analise-contestacao-inss
description: "Leitura forense da contestação do INSS para montar o mapa da réplica, ótica pró-segurado. Use SEMPRE que receber ou mencionar contestação do INSS, defesa da autarquia, contestação previdenciária, analisar contestação, auditar contestação, preliminares do INSS, falta de interesse de agir, ausência de prévio requerimento, impugnação específica, fato incontroverso, ônus da impugnação art. 341, mérito defensivo, réplica, próximo passo após contestação. Conduz cinco passos, preliminares, fatos incontroversos, mérito defensivo, impugnação à prova e mapa da réplica. Cruza com base-cpc-onus-prova-art373, base-cpc-prova-documental-juntada, base-cpc-prescricao-decadencia-processual, tema-1124-instrucao-administrativa, coisa-julgada-previdenciaria, base-precedentes-catalogo-vinculantes, especificacao-provas, ponte-workflow-replica-contestacao, peticao-previdenciaria e base-revisao-peticao-aprofundada. NÃO use para decisão judicial (use base-analise-decisao-tres-eixos) nem para redigir a réplica final."
---

# Análise de Contestação do INSS

## Escopo

Leitura forense da contestação do INSS, pelo segurado. Separa o que virou incontroverso, o que é preliminar a repelir e o que é mérito defensivo a rebater ponto a ponto. O produto é o mapa da réplica, e não a peça final.

Divisão com `base-auditoria-adversarial-contestacao-inss`. Esta skill classifica a defesa (preliminar, fato incontroverso, mérito, prova) e monta o mapa. Aquela examina a lógica de cada argumento (falácia, alegação sem prova, contradição interna, distinção do precedente colado) e alimenta o Passo 3. Contestação com precedente citado ou defesa padronizada passa pelas duas.

## Regra de ativação

Recebida a contestação, rodar os cinco passos na ordem. A réplica não é automática. Ela é devida e estratégica quando o INSS arguiu preliminar (art. 351 do CPC), juntou documentos (art. 437, §1º) ou alegou fato impeditivo, modificativo ou extintivo (art. 350). Sem esses gatilhos, avaliar se a réplica agrega, para não reabrir o incontroverso.

## Passo 1. Preliminares a repelir

Mapear toda preliminar defensiva e preparar a repulsa de cada uma. As mais comuns do INSS.

Primeiro, falta de interesse de agir. A ausência de prévio requerimento administrativo se resolve pelo Tema 350/STF (RE 631.240). O requerimento inapto ("indeferimento forçado") e a prova nova levada apenas a juízo se resolvem pelo Tema 1124/STJ, itens 1.1 a 1.6, que também fixa o termo inicial (itens 2.1 a 2.3). Acionar `tema-1124-instrucao-administrativa` e `base-efeito-translativo-tema-1124-defesa`.

Segundo, prescrição e decadência, com exigência de contraditório prévio. Acionar `base-cpc-prescricao-decadencia-processual` e `decadencia-revisao-previdenciaria`.

Terceiro, coisa julgada e litispendência. Acionar `coisa-julgada-previdenciaria`.

Quarto, inépcia, ilegitimidade e incompetência, repelidas com a causa de pedir e os documentos da inicial.

## Passo 2. Fatos incontroversos

Aplicar o ônus da impugnação específica, art. 341 do CPC. Todo fato afirmado na inicial que a contestação não impugnou de forma específica presume-se verdadeiro. O INSS costuma opor a exceção do inciso I (fato sobre o qual não se admite confissão, por se tratar de direito indisponível), e por isso cada fato admitido ou não enfrentado se lista ancorado no ID do documento que o prova, que o sustenta independentemente da presunção. Esse rol vira o quadro de fatos incontroversos da peça e encolhe a controvérsia. Acionar `base-peticao-previdenciaria-padrao-visual` para o quadro.

## Passo 3. Mérito defensivo

Pegar cada tese de mérito do INSS, ausência de carência, perda da qualidade de segurado, EPI eficaz, ausência de nexo, ausência de incapacidade, tempo não comprovado, renda acima do critério, e cruzá-la com a prova dos autos por ID. Apontar onde a defesa contraria o documento ou parte de premissa falsa. Acionar a skill base-* do benefício e do tema, e `precedentes-previdenciarios` para o contraponto vinculante.

## Passo 4. Impugnação à prova e ônus

Onde o INSS impugna documento do segurado ou tenta deslocar o ônus para a parte hipossuficiente, opor o art. 373 e a distribuição dinâmica, lembrando que o INSS detém CNIS, PPP e dossiê. Acionar `base-cpc-onus-prova-art373`. Sobre o documento juntado com a contestação, o autor se manifesta na réplica (art. 437, caput, do CPC), e sobre o juntado depois, em 15 dias (art. 437, § 1º). Acionar `base-cpc-prova-documental-juntada`.

## Passo 5. Mapa da réplica

Consolidar os achados no mapa da réplica, que as skills `ponte-*` chamam de mapa de ataque. Para cada ponto, registrar a natureza (incontroverso, preliminar ou mérito), a via de resposta, o documento por ID e o precedente [CONFERIDO] que sustenta a réplica, e as provas a especificar. Esse mapa é a entrada da `ponte-workflow-replica-contestacao`.

## Disciplina antialucinação

Nenhum precedente entra na réplica sem conferência na fonte primária. Citação conferida entra como [CONFERIDO], não conferida entra como [NÃO CONFIRMADO] ou sai. Proibido inventar tese, súmula, enunciado, número de processo, data ou relator. Acionar `base-precedentes-catalogo-vinculantes` antes de citar.

## Postura

Pró-segurado integral. A réplica ataca a defesa adversária ponto a ponto, fixa o incontroverso a favor do segurado, repele as preliminares e desmonta o mérito defensivo com prova por ID e precedente conferido. Vedada a réplica genérica que apenas reitera a inicial.

## Extensão

O mapa da réplica tem teto de 2 páginas, com as preliminares primeiro e cada fato incontroverso em uma linha. O teto se declara antes de redigir e se afere no arquivo gerado, e o mapa que estoura volta para o corte com a lista do que saiu. Antes de escrever, nomear em uma frase o ponto que decide, e apenas o dado que o prova entra. Regra 10 do protocolo e `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## MCPs da casa

Pesquisa obrigatória. Norma, súmula, tema, enunciado ou acórdão citado nesta skill nasce [NÃO CONFIRMADO] e só entra em peça, parecer ou orientação depois de lido na fonte oficial, na forma de `pesquisa-jurisprudencia-chrome`. A ordem de consulta dos MCPs (`normas`, `superiores`, `trf3`, `iurisprudencia` e `acervo`) e dos catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) está em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O acervo serve à leitura do que o escritório já sustentou, e o reaproveitamento automático de texto de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Integração com outras skills

A leitura produz o mapa da réplica. Para arquitetar a réplica, acionar `ponte-workflow-replica-contestacao`. Para especificar provas na sequência, acionar `especificacao-provas`. Para redigir, acionar `peticao-previdenciaria`. Para auditar, acionar `base-revisao-peticao-aprofundada`.

## O que NÃO está nesta skill

A leitura de decisão está em `base-analise-decisao-tres-eixos`. A redação da réplica está na `peticao-previdenciaria` e na `ponte-workflow-replica-contestacao`. O mérito de cada benefício está nas skills temáticas.
