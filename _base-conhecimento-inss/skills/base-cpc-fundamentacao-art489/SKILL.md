---
name: base-cpc-fundamentacao-art489
description: "Fundamentação das decisões pelo art. 489, §1º, do CPC, nulidade por decisão não fundamentada e negativa de prestação jurisdicional, ótica pró-segurado. Use SEMPRE que mencionar art. 489 CPC, art. 489 §1º, decisão não fundamentada, ausência de fundamentação, motivação deficiente, negativa de prestação jurisdicional, art. 93 IX CF, decisão genérica, decisão que não enfrenta argumento, art. 489 §1º IV argumentos capazes de infirmar, art. 489 §1º V precedente sem fundamentos determinantes, art. 489 §1º VI distinção ou superação, conceito jurídico indeterminado sem explicar, fundamentação per relationem, nulidade da sentença, nulidade do acórdão, omissão de fundamentação, embargos por omissão de fundamento. Base para arguir nulidade e omissão. Cruza com base-analise-decisao-tres-eixos, base-cpc-embargos-declaracao, base-cpc-nulidades-cerceamento, base-tnu-admissibilidade-manual, precedentes-previdenciarios, peticao-previdenciaria e revisao-peticao. NÃO use para ônus da prova nem para mérito do benefício."
---

# Fundamentação das Decisões. Art. 489, §1º, do CPC

## Escopo

Skill pró-segurado sobre o dever de fundamentação e a nulidade da decisão que o descumpre. Toda decisão judicial e, por simetria de devido processo, a decisão administrativa, deve enfrentar os fundamentos relevantes. A decisão que não fundamenta é nula.

## Marco normativo central

CF, art. 93, IX. Fundamentação obrigatória sob pena de nulidade.

CPC, art. 11. Todos os julgamentos serão fundamentados.

CPC, art. 489. Elementos essenciais da sentença, relatório, fundamentos e dispositivo.

CPC, art. 489, §1º. Rol do que NÃO se considera decisão fundamentada.

CPC, art. 1.022, parágrafo único, II. É omissa a decisão que incorre nas condutas do art. 489, §1º, o que abre embargos.

## Os seis incisos do art. 489, §1º

Não é fundamentada a decisão que.

Primeiro, inciso I. Apenas indica, reproduz ou parafraseia ato normativo sem explicar sua relação com a causa.

Segundo, inciso II. Emprega conceito jurídico indeterminado sem explicar o motivo concreto de sua incidência.

Terceiro, inciso III. Invoca motivos que se prestariam a justificar qualquer outra decisão.

Quarto, inciso IV. Não enfrenta todos os argumentos deduzidos capazes de, em tese, infirmar a conclusão adotada. Este é o inciso mais poderoso no previdenciário.

Quinto, inciso V. Invoca precedente ou súmula sem identificar seus fundamentos determinantes nem demonstrar que o caso se ajusta.

Sexto, inciso VI. Deixa de seguir enunciado, súmula ou precedente invocado pela parte sem demonstrar distinção ou superação.

## Estratégia pró-segurado

Primeiro, decisão que ignora argumento decisivo do segurado é omissa, inciso IV. Cabe embargos de declaração para forçar o enfrentamento, com prequestionamento. Acionar `base-cpc-embargos-declaracao`.

Segundo, decisão que aplica Tema ou Súmula contra o segurado sem cotejo do caso viola os incisos V e VI. Atacar por embargos e, se mantida, por recurso, apontando a nulidade.

Terceiro, decisão genérica que serviria a qualquer caso viola o inciso III. Arguir nulidade no eixo 1 de `base-analise-decisao-tres-eixos`.

Quarto, a nulidade por falta de fundamentação é matéria de ordem pública, alegável em qualquer recurso e reconhecível de ofício.

## Alertas

Primeiro, não confundir decisão contrária com decisão não fundamentada. Julgar contra o segurado, com razões idôneas, é mérito, não nulidade.

Segundo, o juiz não precisa rebater cada frase, apenas os argumentos capazes de mudar o resultado.

Terceiro, no CRPS, a fundamentação deficiente da decisão administrativa também autoriza embargos, art. 92 do RICRPS.

## MCPs da casa

Antes de redigir, consulte os três servidores locais do plugin, nesta ordem. Os três localizam e não conferem, e nenhum autoriza a marca [CONFERIDO].

Legislação. Todo dispositivo citado nesta skill se transcreve do MCP `normas`, por `obter_artigo` no identificador da norma e no número do artigo (exemplo, `lei-8213-1991` e `57`), lendo o campo `texto` e a última ocorrência de cada parágrafo. Para tese de direito adquirido, `redacao_na_data`, que responde por ano. A citação em peça exige a `fonte_oficial` que a resposta devolve. Detalhe em `base-legislacao-fontes-primarias`.

Jurisprudência do TRF3 e das Turmas Recursais. Localize pelo MCP `trf3`, com `buscar_acordaos_trf3` (consulta, `polo_recorrente`, `resultado`, `orgao_julgador` e datas) e `obter_acordao_trf3` no id devolvido. `resultado` e `polo_recorrente` são inferidos. O achado nasce [NÃO CONFIRMADO] e só entra na peça depois de aberto no portal do TRF3, na forma de `pesquisa-jurisprudencia-chrome`. TNU e CRPS ficam no MCP `iurisprudencia`.

Acervo do escritório. Consulte pelo MCP `acervo` o que o escritório já sustentou neste tema. Comece por `buscar_tese_acervo` com os termos centrais desta skill e, achando trecho útil, leia o argumento inteiro com `obter_trecho_acervo`. Para saber em que peças um precedente já foi usado, chame `precedentes_do_acervo` e leia o campo `corte` da resposta, porque o mesmo número de Tema existe em mais de uma corte. Detalhe em `base-acervo-escritorio`.

**Vedação.** O acervo existe para o advogado LER o que já sustentou. Reaproveitamento automático de texto de um cliente em peça de outro é VEDADO. O trecho é ponto de partida para redação nova, conferida contra os autos e contra a legislação vigente na data. O trecho é anonimizado, e o arquivo de origem não é.

## Integração com outras skills

Acionada pelo eixo 1 de `base-analise-decisao-tres-eixos`.
Para transformar a omissão de fundamento em embargos, acionar `base-cpc-embargos-declaracao`.
Para cerceamento e outras nulidades, acionar `base-cpc-nulidades-cerceamento`.
Para prequestionamento na TNU, acionar `base-tnu-admissibilidade-manual`.
Para os precedentes indevidamente aplicados, acionar `precedentes-previdenciarios`.

## O que NÃO está nesta skill

Ônus da prova está em `base-cpc-onus-prova-art373`. Cerceamento por prova está em `base-cpc-nulidades-cerceamento`. Mérito do benefício está nas skills temáticas.

## Redação da peça neste tema

Ao transpor esta matéria para peça, seguir o bloco "técnica 6 (demonstrar por que a omissão altera o resultado)" de `peticao-previdenciaria/references/REDACAO-POR-ESPECIE.md`, que traz os pares de redação genérica e precisa fixados pelo titular. A fórmula é afirmar o fato, localizar a prova por ID, explicar a relevância e formular a consequência, em parágrafos de três a quatro linhas e sem adjetivo de intensidade.
