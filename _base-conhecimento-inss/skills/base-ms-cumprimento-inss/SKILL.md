---
name: base-ms-cumprimento-inss
description: "Cumprimento da ordem em mandado de segurança previdenciário (implantação, restabelecimento, multa diária, crime de desobediência do art. 26 da Lei 12.016/2009, efeitos patrimoniais das Súmulas 269 e 271 STF) e MS para obrigar o INSS a cumprir acórdão do CRPS. Use SEMPRE que mencionar cumprimento de MS previdenciário, implantação por MS, ordem judicial INSS, multa diária em MS, astreintes em MS, art. 26 Lei 12.016, crime de desobediência INSS, Súmula 269 STF, Súmula 271 STF, efeitos patrimoniais MS, execução provisória MS, MS para cumprimento de acórdão do CRPS, INSS não implanta decisão do CRPS, revisão de acórdão sem efeito suspensivo, recurso intempestivo do INSS, art. 308 Decreto 3.048/99, art. 581 IN 128/2022, TRF4 RemNec 5000463-92.2026.4.04.7113, demora de cumprimento INSS. Cruza com mandado-seguranca-previdenciario, ms-competencia-autoridade-coatora, base-ms-cabimento-direito-liquido-certo e execucao-cumprimento-previdenciario."
---

# Cumprimento da Ordem em MS Previdenciário

## Escopo

Duas situações distintas. A primeira é o cumprimento da liminar ou da sentença concessiva. A segunda é o MS impetrado para obrigar o INSS a cumprir acórdão do CRPS, cujo roteiro completo está em `references/MS-CUMPRIMENTO-ACORDAO-CRPS.md`.

## Cumprimento da ordem judicial

Concedida a segurança, o juiz transmite o inteiro teor da sentença à autoridade coatora e à pessoa jurídica (Lei 12.016/2009, art. 13). A sentença concessiva pode ser executada provisoriamente, salvo nas hipóteses em que a liminar seria vedada (art. 14, §3º); como o art. 7º, §2º, foi declarado inconstitucional (ADI 4.296), a ressalva não alcança benefício previdenciário. A remessa necessária (art. 14, §1º) não suspende a ordem.

Prazo de implantação. O acordo homologado no RE 1.171.152/STF recomenda 15 dias para tutela de urgência, 25 dias para benefícios por incapacidade e assistenciais, 45 dias para aposentadorias, pensões e outros auxílios, e 90 dias para revisões, CTC e averbação. São parâmetros para pedir prazo certo ao juízo; o acordo teve prazo inicial de 24 meses, e sua manutenção deve ser conferida antes de citá-lo.

Multa diária. Cabe contra o INSS para a obrigação de fazer (CPC, arts. 497 e 537, aplicados subsidiariamente), com valor e periodicidade fixados pelo juízo e revisáveis.

Crime de desobediência. O descumprimento de decisão em MS, liminar ou sentença, constitui crime de desobediência (Lei 12.016/2009, art. 26; CP, art. 330), sem prejuízo de sanções administrativas e da Lei 1.079/1950. Reservar o pedido de ofício ao MPF para a omissão reiterada após intimação pessoal da autoridade.

Cumprimento parcial ou divergente. Peticionar nos autos com prova do erro (carta de concessão, HISCRE) e pedir nova intimação sob multa.

## Efeitos patrimoniais

O MS não substitui ação de cobrança (Súmula 269 STF) e não produz efeitos patrimoniais quanto a período pretérito (Súmula 271 STF). As parcelas vencidas desde a impetração são pagas no próprio MS (administrativamente ou por requisição, conforme o caso); as anteriores, por requerimento administrativo ou ação ordinária autônoma. Honorários de sucumbência não cabem (art. 25; Súmula 105 STJ; Súmula 512 STF).

## MS para cumprir acórdão do CRPS

O INSS não pode deixar de cumprir decisão definitiva do CRPS, reduzir ou ampliar seu alcance (Decreto 3.048/99, art. 308, §2º; IN 128/2022, art. 581). Apenas recurso tempestivo contra decisão de Junta ou Câmara tem efeito suspensivo (art. 308, caput), e pedido de revisão de acórdão não é recurso (art. 308, §1º). As únicas exceções ao cumprimento são o benefício mais vantajoso com opção expressa do interessado e a ação judicial transitada em julgado sobre o mesmo objeto (IN 128/2022, art. 581, §4º).

Precedente central (persuasivo). TRF4, 5ª Turma, RemNec 5000463-92.2026.4.04.7113/RS, Rel. Juíza Federal Graziela Soares, unânime, j. 15/07/2026, com a tese de que a demora injustificada em cumprir decisão do CRPS viola direito líquido e certo quando o recurso da autarquia é intempestivo e sem efeito suspensivo.

A numeração do dispositivo regimental da revisão de acórdão varia entre versões do Regimento Interno do CRPS. Ancorar no art. 308, §1º, do Decreto 3.048/99 até conferir o artigo vigente.

## Alertas

Indicar no pedido de cumprimento a unidade correta do INSS (CEAB-DJ ou gerência que detém o processo).

Revogada a liminar, os valores recebidos são devolvidos (Tema 692/STJ, desconto limitado a 30% do benefício). Registrar o risco ao cliente por escrito.

## Integração

Cabimento em `base-ms-cabimento-direito-liquido-certo`. Autoridade em `ms-competencia-autoridade-coatora`. Hub em `mandado-seguranca-previdenciario`. Cumprimento em ação ordinária em `execucao-cumprimento-previdenciario`. Fundamentos e refutação em `references/FUNDAMENTOS-E-CENARIOS.md` e `references/JURISPRUDENCIA-E-REFUTACAO.md`.

## MCPs da casa

Consulta obrigatória aos MCPs. Toda análise, peça ou orientação feita com esta skill parte de pesquisa prévia nos MCPs, antes da redação. O `normas` dá o dispositivo e o `norma_inss` do `iurisprudencia` dá a IN 128/2022; o `superiores` dá o tema e a decisão do STF e do STJ; o `iurisprudencia` e o `trf3` dão os acórdãos da TNU, do CRPS, do TRF3 e das Turmas Recursais de SP e MS sobre a mesma questão; o `acervo` dá o que o escritório já sustentou. As decisões localizadas servem de controle da tese. A resposta informa se elas confirmam ou contrariam o caminho adotado, e a divergência é enfrentada antes do protocolo. Norma, súmula, tema, enunciado ou acórdão não localizado no MCP nem lido na fonte oficial leva [NÃO CONFIRMADO] e fica fora da peça. A ordem de consulta, a cobertura de cada base e os catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) estão em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O reaproveitamento automático de texto do acervo de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.
