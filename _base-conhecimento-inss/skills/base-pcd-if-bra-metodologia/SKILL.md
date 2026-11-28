---
name: base-pcd-if-bra-metodologia
description: "Metodologia do IF-BrA (Índice de Funcionalidade Brasileiro Aplicado) da aposentadoria da pessoa com deficiência da LC 142/2013: sete domínios, 41 atividades, pontuação 25 50 75 100 por atividade, método linguístico Fuzzy, faixas de grau leve, moderada e grave. Use SEMPRE que mencionar IF-BrA, Índice de Funcionalidade Brasileiro Aplicado, lógica fuzzy LC 142, sete domínios deficiência, sensorial comunicação mobilidade cuidados pessoais vida doméstica educação trabalho socialização, pontuação 25 50 75 100, domínios sensíveis, perguntas emblemáticas, replicação da menor pontuação, ausência de auxílio de terceiros, 41 atividades funcionais, quesitos fuzzy, impugnação por não aplicação do fuzzy, 5.739 6.354 7.584 pontos, deficiência leve moderada grave LC 142, Portaria Interministerial SDH/MPS/MF/MOG/AGU nº 1 de 27/01/2014, perícia biopsicossocial aposentadoria PCD, avaliação funcional INSS. Cruza com base-aposentadoria-pcd-lc142, aposentadoria-deficiencia, base-pcd-did-retroativa, base-pcd-conversao-tempo-especial-pcd, base-pcd-fibromialgia-lei15176 e formacao-documentacao-did-pcd. NÃO use para o BPC, cujo instrumento é a Portaria Conjunta 2/2015 (analise-bpc-loas)."
---

# Metodologia do IF-BrA na Aposentadoria PCD

## Escopo

Instrumento de avaliação médica e funcional da deficiência para a aposentadoria da LC 142/2013: estrutura, pontuação, método Fuzzy, faixas de grau e controle do laudo. O IF-BrA não se aplica ao BPC, cujo instrumento é o da Portaria Conjunta MDS/INSS 2/2015 (`analise-bpc-loas`). O IFBrM (Índice de Funcionalidade Brasileiro Modificado) é instrumento validado para uso unificado, sem adoção normativa vigente no INSS; não se confunde com o IF-BrA em citação formal.

## Marco normativo

LC 142/2013, arts. 4º (avaliação médica e funcional) e 5º (perícia própria do INSS, com instrumentos desenvolvidos para esse fim). Decreto 3.048/1999, arts. 70-A e 70-D (avaliação biopsicossocial, fixação da data provável de início e do grau, variação de grau por períodos), na redação dos Decretos 8.145/2013 e 10.410/2020. Portaria Interministerial SDH/MPS/MF/MOG/AGU nº 1, de 27/01/2014 (DOU de 30/01/2014), que aprova o IF-BrA e define impedimento de longo prazo como o que produz efeitos pelo prazo mínimo de 2 anos, contados de forma ininterrupta. A republicação de 2015 dessa portaria foi tornada sem efeito; citar sempre a data de 27/01/2014. Lei 13.146/2015, art. 2º, §1º.

## Estrutura do instrumento

Avaliação conjunta por perito médico e assistente social do INSS, cada um pontuando as mesmas 41 atividades, distribuídas em sete domínios: Sensorial; Comunicação; Mobilidade; Cuidados Pessoais; Vida Doméstica; Educação, Trabalho e Vida Econômica; Socialização e Vida Comunitária.

### Pontuação por atividade

A escala é atribuída a cada atividade, e não ao domínio, e reflete o desempenho no ambiente habitual, não a capacidade em situação ideal.

| Pontos | Nível de independência |
|---|---|
| 25 | Não realiza a atividade ou é totalmente dependente de terceiros |
| 50 | Realiza com auxílio de terceiros |
| 75 | Realiza de forma adaptada, diferente da habitual ou mais lentamente |
| 100 | Realiza de forma independente, sem adaptação, na velocidade habitual e com segurança |

A escala deriva da Medida de Independência Funcional (MIF), adaptada pela portaria. A referência a "escala de Genebra" é incorreta e não deve ser usada.

### Faixas de grau

A soma das pontuações do médico e do assistente social vai de 2.050 (41 x 2 x 25) a 8.200 (41 x 2 x 100).

| Grau | Pontuação total |
|---|---|
| Grave | até 5.739 |
| Moderada | 5.740 a 6.354 |
| Leve | 6.355 a 7.584 |
| Insuficiente para caracterizar deficiência | 7.585 ou mais |

Cada grau define o tempo de contribuição do art. 3º da LC 142/2013 (`base-aposentadoria-pcd-lc142`).

## Método linguístico Fuzzy

Verificação obrigatória em todo caso, antes de aceitar o resultado. A ordem é: pontuar as 41 atividades; verificar a incidência do Fuzzy; somar e classificar. Perito que soma direto omite etapa e produz resultado viciado.

**Hipóteses de incidência (basta uma).** Alguma atividade de domínio sensível do tipo de deficiência recebeu 25 ou 50, ou todas as atividades desse domínio receberam 75; a pessoa não dispõe de auxílio de terceiros sempre que necessário; resposta positiva à questão emblemática do tipo de deficiência.

**Consequência.** A menor pontuação atribuída a uma atividade do domínio sensível é replicada para todas as atividades desse domínio, de modo que a limitação mais grave não seja compensada por notas altas no mesmo domínio.

| Tipo de deficiência | Domínios sensíveis | Questão emblemática |
|---|---|---|
| Auditiva | Comunicação; Socialização e Vida Comunitária | A surdez ocorreu antes dos 6 anos? |
| Visual | Mobilidade; Vida Doméstica | A pessoa já não enxergava ao nascer? |
| Motora | Mobilidade; Cuidados Pessoais | Desloca-se exclusivamente em cadeira de rodas? |
| Intelectual, cognitiva ou mental | Vida Doméstica; Socialização e Vida Comunitária | Não pode ficar sozinho em segurança? |

A questão da deficiência intelectual é formulada pela negativa: a resposta afirmativa revela a impossibilidade de permanecer só com segurança e aciona o Fuzzy.

Checklist de sete pontos, oito quesitos e roteiro de impugnação em `references/METODO-FUZZY-APLICACAO-OBRIGATORIA.md`.

## Controle do laudo

Vícios recorrentes e fundamento da impugnação.

1. **Avaliação apenas médica.** A avaliação é médica e funcional (LC 142/2013, art. 4º; Decreto 3.048/1999, art. 70-A). Ausência do assistente social ou pontuação de uma única avaliação compromete o resultado.
2. **Pontuação genérica.** Cada atividade deve ser pontuada; domínio sem pontuação discriminada impede o controle.
3. **Capacidade em vez de desempenho.** A portaria manda pontuar o desempenho no ambiente habitual.
4. **Fuzzy omitido.** Demonstrar aritmeticamente o total e o grau antes e depois da replicação.
5. **Data de início e variação de grau.** O perito deve fixar a data provável de início e identificar os períodos em cada grau (Decreto 3.048/1999, art. 70-D, I e II). Omissão impede a conversão do art. 70-E (`base-pcd-did-retroativa`, `base-pcd-conversao-tempo-especial-pcd`).
6. **Barreiras ignoradas.** A matriz associa a pontuação de cada atividade às barreiras externas; laudo sem barreiras descumpre o art. 2º, §1º, da Lei 13.146/2015.

Em juízo, requerer esclarecimentos e complementação (CPC, art. 477, §2º) e, persistindo a falha, nova perícia (CPC, art. 480), conforme `base-cpc-prova-pericial-arts464-480`. Quesitos padronizados também em `base-modelo-relatorio-medico-aposentadoria-pcd-lc142`.

## Refutação a argumentos típicos do INSS

- **Restrição clínica isolada.** O grau resulta da pontuação funcional, não do diagnóstico.
- **Estabilização do quadro.** Estabilidade clínica não eleva a pontuação se o desempenho nas atividades continua limitado; doença crônica com recidivas exige análise do histórico.
- **Deficiência apenas a partir da DER.** A deficiência anterior pode ser reconhecida com prova documental contemporânea (LC 142/2013, art. 6º, §§1º e 2º; Decreto 3.048/1999, art. 70-D, §1º), vedada a prova exclusivamente testemunhal.
- **Fibromialgia como condição subjetiva.** A Lei 14.705/2023, art. 1º-C, incluído pela Lei 15.176/2025, condiciona a equiparação à pessoa com deficiência à avaliação biopsicossocial; o IF-BrA é essa avaliação para a LC 142/2013 (`base-pcd-fibromialgia-lei15176`).

## Cenários

- **Visão monocular.** Deficiência sensorial visual por lei (Lei 14.126/2021); o grau depende da pontuação, com Mobilidade e Vida Doméstica como domínios sensíveis.
- **Surdez bilateral desde a infância.** Questão emblemática positiva; replicação em Comunicação e Socialização (Lei 14.768/2023 para o conceito de deficiência auditiva).
- **Paraplegia com cadeira de rodas.** Questão emblemática positiva; Mobilidade e Cuidados Pessoais replicados; grau grave esperado.
- **Deficiência intelectual ou TEA.** "Não pode ficar sozinho em segurança" afirmativo; Vida Doméstica e Socialização replicados.

## Integração

Aposentadoria PCD e cálculo em `base-aposentadoria-pcd-lc142`; data de início retroativa em `base-pcd-did-retroativa`; conversão em `base-pcd-conversao-tempo-especial-pcd`; deficiência sensorial em `base-pcd-deficiencia-auditiva-visual`; fibromialgia em `base-pcd-fibromialgia-lei15176`; prova documental em `formacao-documentacao-did-pcd`; auditoria do laudo em `auditoria-laudo-pericial`.

## Hub de portarias administrativas

As Portarias DPMF, DIRBEN e INSS que regem procedimento, cálculo e recurso estão em `base-portarias-dpmf-inss-hub`.

## MCPs da casa

Consulta obrigatória aos MCPs. Toda análise, peça ou orientação feita com esta skill parte de pesquisa prévia nos MCPs, antes da redação. O `normas` dá o dispositivo e o `norma_inss` do `iurisprudencia` dá a IN 128/2022; o `superiores` dá o tema e a decisão do STF e do STJ; o `iurisprudencia` e o `trf3` dão os acórdãos da TNU, do CRPS, do TRF3 e das Turmas Recursais de SP e MS sobre a mesma questão; o `acervo` dá o que o escritório já sustentou. As decisões localizadas servem de controle da tese. A resposta informa se elas confirmam ou contrariam o caminho adotado, e a divergência é enfrentada antes do protocolo. Norma, súmula, tema, enunciado ou acórdão não localizado no MCP nem lido na fonte oficial leva [NÃO CONFIRMADO] e fica fora da peça. A ordem de consulta, a cobertura de cada base e os catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) estão em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O reaproveitamento automático de texto do acervo de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Lei Brasileira de Inclusão como fundamento obrigatório

Acionar sempre `base-lbi-inclusao-barreiras-lei13146`. Percorrer as seis barreiras do art. 3º, IV, da Lei 13.146/2015, com fato concreto e documento por ID, e cobrar os quatro incisos do art. 2º, §1º, na avaliação e no relatório. O conceito convencional de deficiência tem estatura de emenda constitucional (Decreto Legislativo 186/2008 e Decreto 6.949/2009) e não pode ser restringido por ato infralegal.
