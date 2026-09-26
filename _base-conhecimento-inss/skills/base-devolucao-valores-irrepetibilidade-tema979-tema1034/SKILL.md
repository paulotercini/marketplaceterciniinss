---
name: base-devolucao-valores-irrepetibilidade-tema979-tema1034
description: "Skill base sobre irrepetibilidade de valores recebidos a título previdenciário, à luz dos Temas 979 e 1.034/STJ, da Súmula 34/AGU e da boa-fé objetiva. Use SEMPRE que mencionar devolução de valores recebidos, INSS quer cobrar, ressarcimento ao erário, irrepetibilidade, Tema 979 STJ, Tema 1.034 STJ, Súmula 34 AGU, boa-fé objetiva, verba alimentar, descontos no benefício, suspensão por dívida, antecipação de tutela revogada, sentença reformada, devolução em juízo, parcelas vencidas indevidas, alimentos por equiparação, REsp 1.401.560, REsp 1.734.974. Hub teórico para defesa do segurado contra cobrança regressiva pelo INSS, abrangendo benefícios cessados por reforma de tutela, indeferimento posterior, erro administrativo e fraude apurada com sentença. NÃO use para fraude com má-fé comprovada (devolução cabível) nem para cumprimento de sentença em fase executiva (skill própria). Cruza com execucao-cumprimento-previdenciario e peticao-previdenciaria."
---

# Devolução de Valores. Temas 979 e 1.034/STJ

## 1. Quando acionar esta skill

Acione SEMPRE que houver tentativa de cobrança regressiva pelo INSS após cessação de benefício, reforma de tutela antecipada, indeferimento posterior ou suspensão administrativa. A skill consolida o regime de irrepetibilidade construído pelo STJ em favor do segurado de boa-fé.

## 2. Marco normativo

Tema 979/STJ (tese real): pagamentos por erro administrativo material/operacional SÃO repetíveis, com desconto de até 30% do benefício, SALVO se o segurado comprovar boa-fé objetiva (impossibilidade de perceber o pagamento indevido). Modulação: processos distribuídos após 23/04/2021.

A natureza alimentar do benefício previdenciário é elemento central. Os valores são consumidos no sustento do segurado e família, não comportando devolução nas hipóteses ordinárias.

A Lei 8.213/91 no art. 115 lista hipóteses estritas de desconto, e o Decreto 3.048/99 nos arts. 154 a 157 detalha os procedimentos.

## 3. Eixos centrais pró-segurado

A regra geral é a irrepetibilidade dos valores recebidos pelo segurado de boa-fé. Decorre da natureza alimentar e da boa-fé objetiva.

A reforma de tutela antecipada AUTORIZA a devolução (Tema 692/STJ: devolução obrigatória, com desconto de até 30% do benefício). Exceção consolidada: benefício assistencial (BPC/LOAS), irrepetível. O antigo registro citava o Tema 1034, que é de plano de saúde.

No erro administrativo, a manutenção dos valores depende de o segurado DEMONSTRAR boa-fé objetiva (Tema 979/STJ) — não é automática.

A presunção de boa-fé do segurado é juris tantum. Cabe ao INSS provar má-fé.

A devolução, quando cabível, observa os limites do art. 115 da Lei 8.213 (limite de 30% do benefício mensal).

## 4. Fragilidades adversárias mais comuns

O INSS invocará o Tema 692/STJ (devolução na tutela revogada) — em regra, com razão. A defesa concentra-se nas exceções: benefício assistencial, coisa julgada anterior, ou erro administrativo com boa-fé objetiva (Tema 979).

O INSS pretende descontar 100% do benefício atual. Refute com art. 115 que limita a 30%.

O INSS alega presunção de má-fé. Refute com presunção juris tantum de boa-fé.

O INSS aplica desconto sem prévio contraditório. Refute com art. 5º LV CF e RE 594.296 (Tema 138 STF) e art. 69 da Lei 8.213/91.

## 5. Estratégia processual

A defesa pró-segurado pivota em mandado de segurança contra desconto sem contraditório, ação declaratória de inexigibilidade ou embargos à execução. Combinar com `peticao-previdenciaria`, `base-ms-cumprimento-inss` e `base-cpc-tutela-provisoria-previdenciaria`.

## 6. Documentos essenciais

Cessação ou reforma. Notificação de devolução. Histórico de pagamentos. Carta de concessão. Comprovação de gasto na subsistência. Quando reforma de tutela, sentença e acórdão.

## 7. Fontes

Consulte os arquivos `references/FUNDAMENTOS-E-CENARIOS.md` e `references/JURISPRUDENCIA-E-REFUTACAO.md`.

## Hub de portarias administrativas

Hub das Portarias DPMF/DIRBEN/INSS aplicáveis a este benefício. Acionar `base-portarias-dpmf-inss-hub` para identificar quais Portarias regem o procedimento administrativo, o cálculo, as ratificações e os recursos no caso concreto.

## MCPs da casa

Antes de redigir, consulte os três servidores locais do plugin, nesta ordem. Os três localizam e não conferem, e nenhum autoriza a marca [CONFERIDO].

Legislação. Todo dispositivo citado nesta skill se transcreve do MCP `normas`, por `obter_artigo` no identificador da norma e no número do artigo (exemplo, `lei-8213-1991` e `57`), lendo o campo `texto` e a última ocorrência de cada parágrafo. Para tese de direito adquirido, `redacao_na_data`, que responde por ano. A citação em peça exige a `fonte_oficial` que a resposta devolve. Detalhe em `base-legislacao-fontes-primarias`.

Jurisprudência do TRF3 e das Turmas Recursais. Localize pelo MCP `trf3`, com `buscar_acordaos_trf3` (consulta, `polo_recorrente`, `resultado`, `orgao_julgador` e datas) e `obter_acordao_trf3` no id devolvido. `resultado` e `polo_recorrente` são inferidos. O achado nasce [NÃO CONFIRMADO] e só entra na peça depois de aberto no portal do TRF3, na forma de `pesquisa-jurisprudencia-chrome`. TNU e CRPS ficam no MCP `iurisprudencia`.

Acervo do escritório. Consulte pelo MCP `acervo` o que o escritório já sustentou neste tema. Comece por `buscar_tese_acervo` com os termos centrais desta skill e, achando trecho útil, leia o argumento inteiro com `obter_trecho_acervo`. Para saber em que peças um precedente já foi usado, chame `precedentes_do_acervo` e leia o campo `corte` da resposta, porque o mesmo número de Tema existe em mais de uma corte. Detalhe em `base-acervo-escritorio`.

**Vedação.** O acervo existe para o advogado LER o que já sustentou. Reaproveitamento automático de texto de um cliente em peça de outro é VEDADO. O trecho é ponto de partida para redação nova, conferida contra os autos e contra a legislação vigente na data. O trecho é anonimizado, e o arquivo de origem não é.
