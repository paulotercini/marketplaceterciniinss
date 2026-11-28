---
name: mandado-seguranca-previdenciario
description: "Hub do mandado de segurança previdenciário contra o INSS e o CRPS: quando impetrar em vez de ação ordinária, cenários de cabimento e roteiro da peça. Use SEMPRE que mencionar mandado de segurança previdenciário, MS previdenciário, MS contra INSS, MS contra CRPS, direito líquido e certo previdenciário, prova pré-constituída INSS, MS por omissão ou demora do INSS, MS cumprimento CRPS, MS reabertura PA, MS complementação contribuição, MS B94, MS auxílio-acidente, MS aposentadoria PCD, MS perícia biopsicossocial, art. 26 Lei 12.016, decadência MS ato omissivo, art. 23 Lei 12.016, Súmula 376 STJ, MS contra ato JEF, liminar MS previdenciário, PA extraviado, acordo do RE 1.171.152/STF, recurso intempestivo CRPS, autotutela INSS. O detalhe de cada tópico está nas base-ms-*; autoridade coatora e foro em ms-competencia-autoridade-coatora."
---

# Mandado de Segurança Previdenciário. Hub

## Função e roteamento

Esta skill responde quando e por que impetrar MS em vez de ação ordinária ou recurso, e lista os cenários de cabimento. O detalhe técnico de cada tópico fica em uma única skill.

| Tópico | Skill com o detalhe |
|---|---|
| Requisitos, direito líquido e certo, justificação administrativa | `base-ms-cabimento-direito-liquido-certo` |
| Autoridade coatora por fase do PA, foro, CEAB | `ms-competencia-autoridade-coatora` |
| Competência material no TRF3 (Vara Cível x Previdenciária), órgãos do CRPS | `base-ms-competencia-autoridade-coatora-inss-crps` |
| Decadência de 120 dias, omissão, demora, PGB | `base-ms-decadencia-omissao-demora` |
| Liminar (art. 7º, III), agravo, suspensão de segurança | `base-ms-liminar-art7-iii` |
| Cumprimento da ordem, multa, desobediência, MS para cumprir acórdão do CRPS | `base-ms-cumprimento-inss` |

Redação da peça em `peticao-previdenciaria`. A liminar entra sempre na peça de MS (política do escritório), ao contrário da ação de concessão no JEF ou no rito ordinário, em que a regra é não pedir tutela de urgência.

## Fundamento

CF, art. 5º, LXIX; Lei 12.016/2009, art. 1º. O MS é a via preferencial quando a questão é exclusivamente de direito ou quando a ilegalidade se prova por documento pré-constituído, sem dilação probatória.

## Cenários de cabimento

### 1. B94 indeferido por sequela fora do Anexo III com laudo administrativo favorável

O laudo do INSS reconhece acidente, nexo e redução da capacidade, mas o benefício é negado porque a sequela não consta do Anexo III do Decreto 3.048/99. A questão é de direito. O Anexo III é exemplificativo (Parecer 17/2013/CONJUR-MPS/CGU/AGU, aprovado pela Portaria MPS 264/2013) e o grau da lesão não impede a concessão (Tema 416/STJ). O MS evita perícia judicial que contrarie o laudo administrativo.

Viabilidade. O laudo do INSS deve reconhecer expressamente nexo e redução, e o motivo do indeferimento deve ser apenas o rol do Anexo III. Se o indeferimento for por ausência de nexo ou de redução, a questão é fática e o MS não cabe.

Precedentes regionais (persuasivos). TRF3, 7ª Turma, ApCiv 5013553-90.2021.4.03.6105, Rel. Des. Fed. Jean Marcos Ferreira, j. 17/05/2024; TRF4, AC 5059859-24.2021.4.04.7000, TRS/PR; TRF1, 9ª Turma, ApCiv 1009673-91.2021.4.01.3300, j. 15/12/2023. Mérito do B94 em `auxilio-acidente-b94` e `ntep-nexo-acidentario`.

### 2. INSS não cumpre acórdão do CRPS

Decisão definitiva do CRPS favorável e benefício não implantado. O INSS não pode escusar-se de cumprir decisão definitiva do CRPS (Decreto 3.048/99, art. 308, §2º; IN 128/2022, art. 581). Recurso intempestivo não tem efeito suspensivo (art. 308, caput) e pedido de revisão de acórdão não é recurso (art. 308, §1º). Roteiro, precedentes e o argumento da autotutela em `base-ms-cumprimento-inss`. O prazo de recurso do INSS é de 30 dias da ciência (Decreto 3.048/99, art. 305, §1º, II); conferir em `admissibilidade-barreiras-crps`.

### 3. Aposentadoria da pessoa com deficiência indeferida sem avaliação biopsicossocial

A avaliação por perícia médica e serviço social é obrigatória (LC 142/2013, arts. 4º e 5º; Portaria Interministerial SDH/MPS/MF/MOG/AGU 1, de 27/01/2014). Pedido. Anulação do indeferimento, reabertura do PA com as avaliações e averbação dos períodos e graus apurados. Precedente. TRF4, 6ª Turma, ApRemNec 5008662-92.2024.4.04.7107, j. 08/05/2025. Mérito em `aposentadoria-deficiencia`.

### 4. Indeferimento sem carta de exigência ou sem análise dos documentos

Constatada a falta de elemento necessário, o servidor deve emitir carta de exigências com prazo mínimo de 30 dias (IN 128/2022, art. 566). O indeferimento sem essa oportunidade viola o contraditório (CF, art. 5º, LV; Lei 9.784/99, arts. 2º e 3º). Pedido. Anulação e reabertura do PA com nova exigência. Precedente. TRF1, 1ª Turma, AMS 1004475-66.2022.4.01.3000, PJe 24/07/2024 (BPC). Em B31, B91 e B94, conferir as exigências documentais das Portarias de análise documental em `analise-documental-incapacidade`. Dever de instrução do INSS em `tema-1124-instrucao-administrativa`; vedação de formalismo em `lei-13460-usuario-servico-publico`.

### 5. Recusa de guia para complementação post mortem

O segurado faleceu com contribuições abaixo do mínimo (EC 103/2019, art. 29) e o INSS recusa a guia de complementação aos dependentes. A contribuição abaixo do mínimo não rompe a filiação, e contra dependente absolutamente incapaz não corre prescrição. O instrumento importa. A TNU fixa no JEF os efeitos financeiros a partir do pagamento da guia [NÃO CONFIRMADO, localizar o PEDILEF], enquanto MS ou rito ordinário permitem pedir efeitos desde o óbito quando o INSS obstou a guia. Cálculo e tese em `pensao-por-morte` e `contribuicoes-complementacao-ec103`.

### 6. Demora na análise do requerimento

O direito líquido e certo é à decisão conclusiva, não ao benefício. Não é preciso aguardar indeferimento. Prazos de referência do acordo homologado no RE 1.171.152/STF e demais parâmetros em `base-ms-decadencia-omissao-demora`. No TRF3, MS apenas para compelir a análise vai à Vara Federal Cível (`base-ms-competencia-autoridade-coatora-inss-crps`).

### 7. Revisão por autotutela de decisão do CRPS sem vício concreto

A autotutela (Súmulas 346 e 473 STF) exige vício que torne o ato ilegal e contraditório prévio. Reavaliação de prova ou de interpretação não autoriza desfazer o reconhecimento já feito pelo CRPS. Precedente. TRF4, 6ª Turma, AC 5001720-20.2024.4.04.7115, j. 17/09/2025. Ver `coisa-julgada-previdenciaria`.

### 8. MS contra decisão irrecorrível de admissibilidade do REsp na origem

Desprovido o agravo interno contra a negativa de seguimento pelo art. 1.030, I, "b", do CPC, o STJ admite MS julgado pela própria Corte local, nunca pelo STJ (CF, art. 105, I, "b"; Súmula 41 STJ), com direito líquido e certo ou teratologia demonstrável de plano (RMS 75.406/SP, 2ª Turma, j. 03/03/2026). O MS contra ato judicial é excepcional e não admite reexame de prova (AgInt no RMS 73.532/MG). Roteiro em `base-resp-relevancia-questao-federal`.

## MS ou ação ordinária

Prefira o MS quando. A questão é apenas de direito; a prova documental basta; há risco de perícia judicial desfavorável (B94); o ato é omissivo (demora, descumprimento do CRPS); o instrumento altera o resultado financeiro (complementação post mortem); a urgência exige liminar.

Não impetre quando. O direito depende de perícia ou testemunha; os fatos são controvertidos (nexo contestado); o fato não está documentado; passaram 120 dias de ato comissivo (Lei 12.016/2009, art. 23).

Limites que orientam a estratégia. O MS não substitui ação de cobrança e não gera efeitos patrimoniais pretéritos (Súmulas 269 e 271 STF); não há honorários de sucumbência (art. 25; Súmula 105 STJ; Súmula 512 STF). Detalhe em `base-ms-cabimento-direito-liquido-certo`.

## Técnica, em resumo

Prova pré-constituída. Cópia integral do PA, decisão administrativa, laudos do INSS, CNIS, protocolos e print do Meu INSS com a fase do processo. Documento em poder de repartição que se recusa a fornecê-lo, o juiz ordena a exibição em 10 dias (art. 6º, §1º), e, se a recusa for da própria autoridade coatora, a ordem vai na notificação (art. 6º, §2º). Se o PA foi extraviado, cabe requisição judicial do procedimento administrativo (CPC, art. 438, II).

MS contra ato de juiz do JEF. Competência da Turma Recursal (Súmula 376 STJ). MS contra o INSS nunca tramita no JEF (Lei 10.259/2001, art. 3º, §1º, I).

## Alertas antes de impetrar

Confirmar que não há componente fático que exija prova. Contar os 120 dias, salvo omissão continuada. Verificar no Meu INSS a fase do PA para indicar a autoridade correta. No B94 com laudo favorável, registrar ao cliente por que o MS é preferível. No cumprimento de acórdão do CRPS, conferir a tempestividade de eventual recurso do INSS.

## Extensão

Referência preferencial de 5 páginas e 4 seções, sem caráter de limite. A peça tem a extensão que cada pedido exige, e sai apenas a repetição. Antes de escrever, nomear em uma frase o ponto que decide; o dado que o prova acompanha cada pedido. Regra 10 do protocolo e `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## MCPs da casa

Consulta obrigatória aos MCPs. Toda análise, peça ou orientação feita com esta skill parte de pesquisa prévia nos MCPs, antes da redação. O `normas` dá o dispositivo e o `norma_inss` do `iurisprudencia` dá a IN 128/2022; o `superiores` dá o tema e a decisão do STF e do STJ; o `iurisprudencia` e o `trf3` dão os acórdãos da TNU, do CRPS, do TRF3 e das Turmas Recursais de SP e MS sobre a mesma questão; o `acervo` dá o que o escritório já sustentou. As decisões localizadas servem de controle da tese. A resposta informa se elas confirmam ou contrariam o caminho adotado, e a divergência é enfrentada antes do protocolo. Norma, súmula, tema, enunciado ou acórdão não localizado no MCP nem lido na fonte oficial leva [NÃO CONFIRMADO] e fica fora da peça. A ordem de consulta, a cobertura de cada base e os catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) estão em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O reaproveitamento automático de texto do acervo de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Cadeia de cada pedido

Toda peça produzida com esta skill passa, antes da entrega, pela conferência individual de cada pedido, ligando pedido, fatos, provas por ID, cálculo ou critério e conclusão jurídica, com correção pontual e sem reescrever a peça. Protocolo em `base-revisao-peticao-aprofundada/references/CADEIA-DO-PEDIDO.md` e Fase 2-A da `peticao-previdenciaria`.
