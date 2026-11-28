---
name: auxilio-reclusao-previdenciario
description: "Hub operacional do auxílio-reclusão (B25), estratégia, peças e precedentes. Use SEMPRE que redigir petição, recurso ou parecer de auxílio-reclusão e quando mencionar Tema 1162 STJ, Tema 896 STJ, Tema 357 TNU, Tema 310 TNU, Tema 89 STF, flexibilização critério renda, média 12 salários prisão, divisor fixo 12, desempregado preso renda zero, baixa renda preso, dependentes de preso, Tema 1421 STJ, repetitivo DIB menor 16 anos reclusão, 180 dias, REsp 2240220, REsp 2256869, IRDR 35 TRF4. Para os REQUISITOS legais pós-reforma (carência de 24, teto de baixa renda, certidão judicial, cessação, progressão de regime, tempus regit actum), ver base-auxilio-reclusao-pos-reforma. Acionar com peticao-previdenciaria, precedentes-previdenciarios, ms-competencia-autoridade-coatora, periodo-graca-qualidade-segurado, triagem-caso-novo. NÃO use para pensão por morte, salário-maternidade ou incapacidade."
---

# Auxílio-Reclusão. Precedentes e Estratégia

Requisitos legais, regime pela data da prisão, regras da IN 128/2022 (arts. 381 a 392) e cessação ficam em `base-auxilio-reclusao-pos-reforma`. Esta skill concentra os precedentes, o cálculo da baixa renda, a estratégia e a triagem. Detalhe dos julgamentos em `references/PRECEDENTES-AUXILIO-RECLUSAO.md`.

## Precedentes

- Tema 1162 STJ (REsp 1.958.361/SP, 1.971.856/SP e 1.971.857/SP, j. 12/11/2025): (i) antes da MP 871/2019, flexibiliza-se o critério econômico quando a renda excede o limite em percentual ínfimo; (ii) depois, a flexibilização é vedada, salvo se o Executivo não corrigir o limite pelos índices do RGPS. A tese (ii) vale para prisões desde 27/11/2024, sem devolução do que foi pago por decisão anterior.
- Tema 896 STJ: antes da MP 871/2019, o desempregado preso tem renda zero, e não o último salário de contribuição.
- Tema 357 TNU (PUIL 5000345-04.2021.4.04.7013/PR, j. 04/12/2024): o benefício de prisão anterior a 18/01/2019 permanece na progressão para o semiaberto, inclusive com monitoramento eletrônico.
- Tema 310 TNU: depois da MP 871/2019, o divisor da média é o número de salários de contribuição existentes nos 12 meses.
- AREsp 2.819.695/RS (STJ, 1ª Turma, j. 16/12/2025): divisor fixo de 12 [NÃO CONFIRMADO].
- Tema 89 STF: o parâmetro é a renda do segurado preso, não a dos dependentes.
- Tema 1017 STF: a controvérsia sobre os critérios legais de aferição da renda é infraconstitucional.
- Tema 1421 STJ (REsp 2.240.220/PR e 2.256.869/SP, j. 10/06/2026), adverso: o requerimento do filho menor de 16 anos feito após 180 dias da prisão, na vigência da MP 871/2019, não retroage ao recolhimento. Origem no IRDR 35 TRF4.

## Cálculo da baixa renda (prisão desde 18/01/2019)

1. Levantar o CNIS dos 12 meses anteriores ao mês da prisão.
2. Excluir as competências abaixo do limite mínimo (IN 128/2022, art. 383, §7º).
3. Calcular a média com o divisor do Tema 310 TNU (salários existentes) e com o divisor fixo de 12. Com meses sem contribuição, o divisor 12 sempre dá média igual ou menor.
4. No JEF, o Tema 310 TNU vincula as Turmas Recursais; o divisor 12 entra como tese de reforma. No rito ordinário, sustentar o divisor 12 com o precedente do STJ, depois de conferido.
5. Sem nenhum salário de contribuição no período, baixa renda (art. 383, §5º).
6. Comparar com o limite da portaria do ano da prisão e verificar se o limite foi corrigido pelos índices do RGPS (exceção da tese ii do Tema 1162).

## Estratégia

- Requerimento administrativo prévio (Tema 350 STF; `tema-1124-instrucao-administrativa`).
- Filho menor de 16 anos: protocolar em até 180 dias da prisão. A tese de que o prazo não corre contra o absolutamente incapaz (Código Civil, art. 198, I) é controvertida desde a Lei 13.846/2019, e o Juízo de Catanduva a rejeita (blocos em `base-juizo-catanduva/references/BLOCOS-BENEFICIOS.md`).
- Cessação por progressão em prisão anterior a 18/01/2019: restabelecimento pelo Tema 357 TNU e pelo art. 383, §4º, da IN 128/2022; prescrição só das parcelas.
- Regime semiaberto sem trabalho externo em prisão desde 18/01/2019: tese de equivalência material ao fechado, minoritária (TRF6, ApCiv 1012773-27.2023.4.06.9999 [NÃO CONFIRMADO]).
- Vias: CRPS; JEF até 60 salários mínimos; rito ordinário acima disso. Mandado de segurança só na Vara Federal, nunca no JEF, para cessação ilegal ou omissão sem dilação probatória (`mandado-seguranca-previdenciario`, `ms-competencia-autoridade-coatora`).

## Checklist de triagem

1. Data da prisão e regime normativo.
2. Regime prisional, inclusive prisão provisória, domiciliar ou monitoramento em regime fechado.
3. Qualidade de segurado na prisão (`periodo-graca-qualidade-segurado`).
4. Carência de 24 contribuições, se a prisão é desde 18/01/2019.
5. Baixa renda pelo roteiro acima, ou último salário e Tema 896 se anterior.
6. Limite da portaria do ano e excedente.
7. Dependentes e classe (art. 16).
8. Prazo do requerimento e DIB.
9. Certidão judicial e atestado de permanência.
10. Via processual.

## MCPs da casa

Consulta obrigatória aos MCPs. Toda análise, peça ou orientação feita com esta skill parte de pesquisa prévia nos MCPs, antes da redação. O `normas` dá o dispositivo e o `norma_inss` do `iurisprudencia` dá a IN 128/2022; o `superiores` dá o tema e a decisão do STF e do STJ; o `iurisprudencia` e o `trf3` dão os acórdãos da TNU, do CRPS, do TRF3 e das Turmas Recursais de SP e MS sobre a mesma questão; o `acervo` dá o que o escritório já sustentou. As decisões localizadas servem de controle da tese. A resposta informa se elas confirmam ou contrariam o caminho adotado, e a divergência é enfrentada antes do protocolo. Norma, súmula, tema, enunciado ou acórdão não localizado no MCP nem lido na fonte oficial leva [NÃO CONFIRMADO] e fica fora da peça. A ordem de consulta, a cobertura de cada base e os catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) estão em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O reaproveitamento automático de texto do acervo de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Integração

Requisitos: `base-auxilio-reclusao-pos-reforma`. Peça: `peticao-previdenciaria`. Precedentes: `precedentes-previdenciarios`. CNIS: `base-cnis-acerto-indicadores`. Contribuições abaixo do mínimo: `contribuicoes-complementacao-ec103`. Documentos: `base-documentos-comprobatorios-in128`. Canais: `inss-canais-atendimento`. Óbito do recluso: `pensao-por-morte`.
