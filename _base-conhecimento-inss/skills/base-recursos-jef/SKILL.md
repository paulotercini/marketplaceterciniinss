---
name: base-recursos-jef
description: "Recursos no Juizado Especial Federal previdenciário, recurso inominado, embargos de declaração, IUJEF, PUIL, TNU, habeas data e mandado de segurança contra ato de Turma Recursal. Use SEMPRE que mencionar recurso inominado, art. 41 Lei 9.099, art. 4º Lei 10.259, IUJEF, PUIL, TNU, pedido de uniformização, divergência entre Turmas Recursais, Súmula 203 STJ, Questão de Ordem TNU, art. 14 Lei 10.259, art. 15 Lei 10.259, embargos declaratórios, efeito modificativo, juízo de admissibilidade TNU, Tema TNU, representativo de controvérsia, PEDILEF, Súmula TNU, prequestionamento JEF, recurso extraordinário JEF, Súmula 640 STF, Súmula 43 TNU, Súmula 376 STJ, MS contra Turma Recursal, TRF3. Cruza com peticao-previdenciaria, revisao-peticao, precedentes-previdenciarios e base-jef-previdenciario."
---

# Recursos no JEF Previdenciário

## Escopo

Sistema recursal do JEF: recurso inominado, embargos de declaração, pedido de uniformização regional e nacional, provocação do STJ, recurso extraordinário e mandado de segurança. Cenários em `references/FUNDAMENTOS-E-CENARIOS.md`; refutação em `references/JURISPRUDENCIA-E-REFUTACAO.md`. Rito do JEF em `base-jef-previdenciario`.

## Marco normativo

Lei 10.259/2001: art. 5º (recurso apenas de sentença, salvo medida cautelar do art. 4º); art. 14 (uniformização); art. 15 (recurso extraordinário). Lei 9.099/1995, aplicável subsidiariamente: arts. 12-A (prazos em dias úteis), 41 a 43 (recurso inominado), 48 a 50 (embargos), 55 (honorários do recorrente vencido). Regimento Interno da TNU (Resolução CJF 586/2019) e regimentos das Turmas Recursais e da TRU da 3ª Região.

## Recursos cabíveis

Recurso inominado. Contra sentença, em 10 dias úteis (arts. 42 e 12-A da Lei 9.099/95), por advogado (art. 41, §2º). Preparo em 48 horas, salvo gratuidade (art. 42, §1º). Contrarrazões em 10 dias (§2º).

Recurso contra decisão sobre tutela ou medida cautelar. Arts. 4º e 5º da Lei 10.259/2001, à Turma Recursal.

Embargos de declaração. Contra sentença ou acórdão, em 5 dias, com interrupção do prazo recursal (arts. 48 a 50 da Lei 9.099/95). Disciplina em `base-cpc-embargos-declaracao`.

Pedido de uniformização regional. Divergência entre Turmas Recursais da mesma Região, em questão de direito material, julgada pela TRU (art. 14, §1º).

Pedido de uniformização nacional (PUIL ou PEDILEF). Divergência entre Turmas de Regiões diversas ou contrariedade a súmula ou jurisprudência dominante do STJ, julgada pela TNU (art. 14, §2º). Não cabe sobre matéria processual (Súmula 43 TNU; art. 14, V, "e", do RITNU), nem para reexame de prova (Súmula 42 TNU).

Provocação do STJ. Quando a TNU, em direito material, contrariar súmula ou jurisprudência dominante do STJ (art. 14, §4º). Não é recurso especial, porque o REsp não cabe contra acórdão de Turma Recursal (Súmula 203 STJ).

Recurso extraordinário. Contra acórdão de Turma Recursal ou da TNU em matéria constitucional (art. 102, III, da CF; Súmula 640 STF; art. 15 da Lei 10.259/2001).

Mandado de segurança. Contra ato de juizado especial, julgado pela Turma Recursal (Súmula 376 STJ), apenas quando inexistir recurso.

## Estratégia

Primeiro, recurso inominado com dialeticidade. Cada fundamento da sentença enfrentado (checklist em `execucao-cumprimento-previdenciario`, seção 3.4).

Segundo, embargos apenas por vício interno do julgado; inconformismo vai ao recurso.

Terceiro, na uniformização, tese de direito material, paradigma válido e cotejo analítico (`pedilef-cotejo-analitico-tnu`). Antes de redigir PUIL ou PEDILEF, acionar `base-puil-pedilef-vedacao-materia-processual`: a TNU reafirmou a vedação à matéria processual no PUIL 1028473-09.2022.4.01.3600 (Rel. p/ acórdão Juiz Federal Ivanir Cesar Ireno Junior, D.E. 12/12/2025), aplicado em série a interesse de agir e legitimidade.

Quarto, prequestionamento explícito para TNU, STJ e STF.

## Alertas

Primeiro, prazo de 10 dias úteis no recurso inominado; o INSS não tem prazo em dobro (art. 9º da Lei 10.259/2001).

Segundo, recurso do segurado vencido gera honorários com exigibilidade suspensa pela gratuidade (art. 55 da Lei 9.099/95).

Terceiro, REsp direto contra Turma Recursal é inadmissível (Súmula 203 STJ).

## Hub de portarias administrativas

As Portarias DPMF, DIRBEN e INSS que regem procedimento, cálculo e recurso estão em `base-portarias-dpmf-inss-hub`.

## MCPs da casa

Pesquisa obrigatória. Norma, súmula, tema, enunciado ou acórdão citado nesta skill nasce [NÃO CONFIRMADO] e só entra em peça, parecer ou orientação depois de lido na fonte oficial, na forma de `pesquisa-jurisprudencia-chrome`. A ordem de consulta dos MCPs (`normas`, `superiores`, `trf3`, `iurisprudencia` e `acervo`) e dos catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) está em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O acervo serve à leitura do que o escritório já sustentou, e o reaproveitamento automático de texto de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Integração com outras skills

Redação em `peticao-previdenciaria`. Revisão em `revisao-peticao`. Precedentes em `precedentes-previdenciarios`. Rito em `base-jef-previdenciario`. Admissibilidade na TNU em `base-tnu-admissibilidade-manual` e `base-puil-pedilef-vedacao-materia-processual`. Execução em `base-cumprimento-sentenca-rpv-precatorio`. Fluxo em `ponte-workflow-recurso-sentenca`.

## Boletins da TNU como fonte de tese

A tese que a Turma Recursal aplica nasce no boletim oficial da TNU. O acervo do escritório está indexado na skill `base-boletins-tnu`, com 241 temas e 104 boletins (sessões de 18/02/2016 a 24/06/2026), permitindo localizar o boletim de cada tema e ler o inteiro teor antes de citar. Regra, tema que aparece em mais de um boletim teve tese alterada, revista ou sobrestada, e a leitura é sempre do boletim MAIS RECENTE.

## Preliminar de cerceamento por quesitos e esclarecimentos indeferidos

Preliminar frequente no recurso inominado previdenciário. Quesitos prévios indeferidos, laudo insuficiente, esclarecimentos indeferidos e sentença na sequência. Pedir a ANULAÇÃO com retorno à instrução e, sucessivamente, o julgamento do mérito pela prova existente.

Dois cuidados. Primeiro, o recurso se sustenta apenas se houve protesto no primeiro indeferimento e registro do prejuízo concreto no segundo, do contrário a Turma responde com preclusão ou ausência de prejuízo. Segundo, a via de uniformização é estreita, porque a Súmula 43 da TNU veda matéria processual em PUIL, de modo que a tese precisa ser revestida como direito material (`base-puil-pedilef-vedacao-materia-processual`). Roteiro em `auditoria-laudo-pericial/references/QUESITOS-NEGADOS-E-LAUDO-INSUFICIENTE.md`.

## Cadeia de cada pedido

Toda peça produzida com esta skill passa, antes da entrega, pela conferência individual de cada pedido, ligando pedido, fatos, provas por ID, cálculo ou critério e conclusão jurídica, com correção pontual e sem reescrever a peça. Protocolo em `base-revisao-peticao-aprofundada/references/CADEIA-DO-PEDIDO.md` e Fase 2-A da `peticao-previdenciaria`.

## Juízo de Catanduva

O recurso contra sentença do JEF de Catanduva parte dos critérios registrados na skill `base-juizo-catanduva`, porque eles indicam o fundamento que a sentença usou e o que faltou na prova.
