# Catálogo Complementar Verificado

Registro dos itens de jurisprudência CONFIRMADOS NA FONTE OFICIAL pela skill `auditoria-citacoes`, com redação literal e link. A entrada de um item aqui ENCERRA a quarentena daquele item de vez e o retira das varreduras futuras (o script `auditoria_citacoes.py` lê este arquivo e pula os IDs registrados).

## Regras de entrada (invioláveis)

Primeiro, só entra item confirmado em FONTE OFICIAL (portal do tribunal, DOU, CJF, Planalto). Fonte secundária não basta para registro aqui, por melhor que seja.

Segundo, a tese ou o dispositivo entram em REDAÇÃO LITERAL, copiada da fonte, nunca parafraseada.

Terceiro, todo item traz o link da fonte e a data da conferência.

Quarto, item DIVERGENTE ou NÃO LOCALIZADO jamais entra aqui. O lugar dele é o relatório da auditoria e a correção na skill de origem.

Quinto, o ID do item segue a normalização do script (exemplos, `TEMA 995/STJ`, `SUMULA 89/TNU`, `ENUNCIADO 17/CRPS`, `SUMULA VINCULANTE 22`, `PUIL 5000733`, `ADI 3931`). A linha de título de cada item é `### <ID>`, que é o que o script lê.

## Formato de item

```
### TEMA 999/XXX
- Situação. [vigente | cancelado | suspenso | com modulação]
- Tese literal. "[texto copiado da fonte oficial]"
- Órgão e leading case. [tribunal, processo, relator, data quando disponíveis]
- Fonte oficial. [URL]
- Conferido em. DD/MM/AAAA
```

## Itens verificados

### SUMULA 89/STJ
- Situação. vigente
- Tese literal. "A ação acidentária prescinde do exaurimento da via administrativa."
- Órgão e leading case. STJ, Terceira Seção, aprovada em 21/10/1993 (DJ 17/02/1995).
- Fonte oficial. https://arquivocidadao.stj.jus.br/index.php/precsum-sum89
- Conferido em. 25/07/2026

### SUMULA 111/STJ
- Situação. vigente (aplicabilidade sob o CPC/2015 reafirmada pelo Tema 1105/STJ, REsp 1.880.529, Primeira Seção, 16/03/2023)
- Tese literal. "Os honorários advocatícios, nas ações previdenciárias, não incidem sobre as prestações vencidas após a sentença." (redação de 2006)
- Órgão e leading case. STJ, Terceira Seção (redação alterada em 2006); reafirmação no Tema 1105, Rel. Min. Sérgio Kukina.
- Fonte oficial. https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/2023/16032023-Sumula-111-continua-a-regular-honorarios-em-acoes-previdenciarias-na-vigencia-do-CPC2015.aspx
- Conferido em. 25/07/2026

### TEMA 1030/STJ
- Situação. vigente (tese fixada em 28/10/2020 e ajustada em embargos de declaração, com data de 01/07/2021 no portal de repetitivos, relatório C2; auditoria 03/10/2026)
- Tese literal. "Ao autor que deseje litigar no âmbito de juizado especial federal cível, é lícito renunciar, de modo expresso e para fins de atribuição de valor à causa, ao montante que exceda os 60 salários mínimos previstos no artigo 3º, caput, da Lei 10.259/2001, aí incluídas, sendo o caso, até 12 prestações vincendas, nos termos do artigo 3º, § 2º, da referida lei, combinado com o artigo 292, §§ 1º e 2º, do Código de Processo Civil de 2015."
- Redação literal do portal de repetitivos, corrigida nos embargos de declaração e lida em 03/10/2026 (relatório C2; auditoria 03/10/2026). "Ao autor que deseje litigar no âmbito de Juizado Especial Federal Cível, é lícito renunciar, de modo expresso e para fins de atribuição de valor à causa, ao montante que exceda os 60 (sessenta) salários mínimos previstos no art. 3º, caput, da Lei 10.259/2001, aí incluídas, sendo o caso, até doze prestações vincendas, nos termos do art. 3º, § 2º, da referida lei, c/c o art. 292, §§ 1º e 2º, do CPC/2015." Trânsito em julgado em 20/09/2021. Fonte oficial, https://processo.stj.jus.br/repetitivos/temas_repetitivos/pesquisa.jsp?novaConsulta=true&tipo_pesquisa=T&cod_tema_inicial=1030&cod_tema_final=1030
- Órgão e leading case. STJ, Primeira Seção, REsp 1.807.665, Rel. Min. Sérgio Kukina.
- Fonte oficial. https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/20052021-Primeira-Secao-ajusta-tese-repetitiva-sobre-renuncia-de-valores-para-demandar-em-juizado-especial-federal.aspx
- Conferido em. 25/07/2026

### SUMULA 377/STJ
- Situação. vigente
- Tese literal. "O portador de visão monocular tem direito de concorrer, em concurso público, às vagas reservadas aos deficientes."
- Órgão e leading case. STJ, Terceira Seção, Rel. Min. Hamilton Carvalhido, julgada em 22/04/2009 (DJe 05/05/2009). Uso previdenciário na LC 142 é analógico e deve ser sinalizado como tal.
- Fonte oficial. https://www.stj.jus.br/docs_internet/revista/eletronica/stj-revista-sumulas-2013_34_capSumula377.pdf
- Conferido em. 25/07/2026

### SUMULA 552/STJ
- Situação. formalmente vigente, com cenário alterado pela Lei 14.768/2023 (surdez unilateral total reconhecida como deficiência auditiva)
- Tese literal. "O portador de surdez unilateral não se qualifica como pessoa com deficiência para o fim de disputar as vagas reservadas em concursos públicos."
- Órgão e leading case. STJ, Corte Especial, Rel. Min. Mauro Campbell Marques, aprovada em 04/11/2015.
- Fonte oficial. https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias-antigas/2015/2015-11-04_18-58_Corte-Especial-aprova-sumula-sobre-surdez-unilateral-em-concurso-publico.aspx
- Conferido em. 25/07/2026

### SUMULA 203/STJ
- Situação. vigente (redação atual desde 23/05/2002)
- Tese literal. "Não cabe recurso especial contra decisão proferida por órgão de segundo grau dos Juizados Especiais."
- Órgão e leading case. STJ, Corte Especial; alteração de redação no AgRg no Ag 400.076/BA, sessão de 23/05/2002.
- Fonte oficial. https://www.stj.jus.br/docs_internet/revista/eletronica/stj-revista-sumulas-2010_15_capSumula203alteradapdf.pdf
- Conferido em. 25/07/2026

### TEMA 125/TST
- Situação. vigente (mérito julgado em 25/04/2025; trânsito em julgado sem registro no documento oficial consultado)
- Tese literal. "Para fins de garantia provisória de emprego prevista no artigo 118 da Lei nº 8.213/1991, não é necessário o afastamento por período superior a 15 (quinze) dias ou a percepção de auxílio-doença acidentário, desde que reconhecido, após a cessação do contrato de trabalho, o nexo causal ou concausal entre a doença ocupacional e as atividades desempenhadas no curso da relação de emprego."
- Órgão e leading case. TST, Tribunal Pleno, IRR no RR-0020465-17.2022.5.04.0521, Rel. Min. Aloysio Silva Corrêa da Veiga, julgado em 25/04/2025.
- Fonte oficial. https://www.tst.jus.br/documents/10157/0/IRR125.pdf
- Conferido em. 25/07/2026

### RE 1171152
- Situação. acordo homologado e Tema 1066/STF cancelado (homologação monocrática em 09/12/2020; cancelamento do tema em 22/02/2021). Cláusula 14.3 fixou vigência de 24 meses com reavaliação; prorrogação formal posterior não localizada, ressalva a registrar em toda citação.
- Tese literal. Cláusula 1ª (prazos máximos por espécie). "Benefício assistencial à pessoa com deficiência: 90 dias; Benefício assistencial ao idoso: 90 dias; Aposentadorias, salvo por invalidez: 90 dias; Aposentadoria por invalidez comum e acidentária: 45 dias; Salário-maternidade: 30 dias; Pensão por morte: 60 dias; Auxílio-reclusão: 60 dias; Auxílio-doença comum e por acidente do trabalho: 45 dias; Auxílio-acidente: 60 dias." Cláusula 3.1 (perícia). Realização "no prazo máximo de até 45 (quarenta e cinco) dias após o seu agendamento", ampliável a 90 dias em unidades de difícil provimento.
- Órgão e leading case. STF, RE 1.171.152/SC, Rel. Min. Alexandre de Moraes (ex-Tema 1066 da repercussão geral). Termo assinado em 16/11/2020.
- Fonte oficial. https://www.gov.br/inss/pt-br/centrais-de-conteudo/publicacoes/outras/minuta-final-do-acordo.pdf
- Conferido em. 25/07/2026

### SUMULA 27/TNU
- Situação. vigente
- Tese literal. "A ausência de registro em órgão do Ministério do Trabalho não impede a comprovação do desemprego por outros meios admitidos em Direito."
- Órgão e leading case. TNU, PU 2004.72.95.005539-6/SC, DJ 22/06/2005.
- Fonte oficial. https://www.cjf.jus.br/phpdoc/virtus/sumula.php?nsul=27
- Conferido em. 25/07/2026

### SUMULA 42/TNU
- Situação. vigente
- Tese literal. "Não se conhece de incidente de uniformização que implique reexame de matéria de fato."
- Órgão e leading case. TNU, PEDILEF 2009.36.00.702049-4, j. 11/10/2011, DJ 03/11/2011.
- Fonte oficial. https://www.cjf.jus.br/phpdoc/virtus/sumula.php?nsul=42
- Conferido em. 25/07/2026

### SUMULA 43/TNU
- Situação. vigente
- Tese literal. "Não cabe incidente de uniformização que verse sobre matéria processual."
- Órgão e leading case. TNU, PEDILEF 0011212-30.2007.4.01.3000, j. 11/10/2011, DJ 03/11/2011.
- Fonte oficial. https://www.cjf.jus.br/phpdoc/virtus/sumula.php?nsul=43
- Conferido em. 25/07/2026

### SUMULA 47/TNU
- Situação. vigente
- Tese literal. "Uma vez reconhecida a incapacidade parcial para o trabalho, o juiz deve analisar as condições pessoais e sociais do segurado para a concessão de aposentadoria por invalidez."
- Órgão e leading case. TNU, PEDILEF 0023291-16.2009.4.01.3600, j. 29/02/2012, DOU 15/03/2012.
- Fonte oficial. https://www.cjf.jus.br/phpdoc/virtus/sumula.php?nsul=47
- Conferido em. 25/07/2026

### SUMULA 73/TNU
- Situação. vigente
- Tese literal. "O tempo de gozo de auxílio-doença ou de aposentadoria por invalidez não decorrentes de acidente de trabalho só pode ser computado como tempo de contribuição ou para fins de carência quando intercalado entre períodos nos quais houve recolhimento de contribuições para a previdência social."
- Órgão e leading case. TNU, PEDILEF 2009.72.57.000614-2, j. 20/02/2013, DOU 13/03/2013.
- Fonte oficial. https://www.cjf.jus.br/phpdoc/virtus/sumula.php?nsul=73
- Conferido em. 25/07/2026

### SUMULA 63/TNU
- Situação. vigente, redação ALTERADA em 18/09/2025 (DJeN 24/09/2025), restrita a fatos geradores até a MP 871/2019
- Tese literal. "Para os fatos geradores ocorridos até a entrada em vigor da MP nº 871/2019, a comprovação de união estável para efeito de concessão de pensão por morte prescinde de início de prova material."
- Órgão e leading case. TNU, alteração na Sessão Ordinária de 18/09/2025, precedente PEDILEF 0501240-21.2022.4.05.8503.
- Uso indevido corrigido em 03/10/2026: a base a citava em skills de BPC (base-bpc-loas-requisitos e base-bpc-impedimento-longo-prazo), mas o enunciado trata só da pensão por morte. Redação alterada reconferida na fonte oficial em 03/10/2026 (relatório C3; auditoria 03/10/2026).
- Fonte oficial. https://www.cjf.jus.br/phpdoc/virtus/sumula.php?nsul=63
- Conferido em. 25/07/2026

### SUMULA 86/TNU
- Situação. CANCELADA em 26/08/2021 (DOU 166, 01/09/2021)
- Tese literal. "Não cabe incidente de uniformização que tenha como objeto principal questão controvertida de natureza constitucional que ainda não tenha sido definida pelo Supremo Tribunal Federal em sua jurisprudência dominante." (cancelada no PEDILEF 0521830-35.2020.4.05.8100)
- Órgão e leading case. TNU, cancelamento na Sexta Sessão Ordinária de 26/08/2021.
- Fonte oficial. https://www.cjf.jus.br/phpdoc/virtus/sumula.php?nsul=86
- Conferido em. 25/07/2026

### SUMULA 87/TNU
- Situação. vigente, alcance restrito a período ANTERIOR a 03/12/1998
- Tese literal. "A eficácia do EPI não obsta o reconhecimento de atividade especial exercida antes de 03/12/1998, data de início da vigência da MP 1.729/98, convertida na Lei n. 9.732/98."
- Órgão e leading case. TNU, PEDILEF 0001487-69.2012.4.03.6303, j. 21/02/2019, DOU 26/02/2019.
- Fonte oficial. https://www.cjf.jus.br/phpdoc/virtus/sumula.php?nsul=87
- Conferido em. 25/07/2026

### QO 24/TNU
- Situação. vigente
- Tese literal. "Não se conhece de incidente de uniformização interposto contra acórdão que se encontra no mesmo sentido da orientação do Superior Tribunal de Justiça, externada em sede de incidente de uniformização ou de recursos repetitivos, representativos de controvérsia."
- Órgão e leading case. TNU, aprovada na 5ª Sessão Ordinária de 13-14/09/2010, DJ 15/10/2010.
- Fonte oficial. https://www.cjf.jus.br/phpdoc/virtus/questoesdeordem.php
- Conferido em. 25/07/2026

### QO 48/TNU
- Situação. vigente
- Tese literal. "Precedentes do Supremo Tribunal Federal não se prestam como paradigmas válidos, para fins de admissão do pedido nacional de uniformização de interpretação de lei federal previsto no art. 14, § 2º, da Lei nº 10.259/01."
- Órgão e leading case. TNU, aprovada na 5ª Sessão Ordinária de 14/06/2023, DJeN 07/08/2023, precedente 0006467-75.2016.4.03.6317.
- Fonte oficial. https://www.cjf.jus.br/phpdoc/virtus/questoesdeordem.php
- Conferido em. 25/07/2026

### TEMA 317/TNU
- Situação. julgado, trânsito em julgado em 11/02/2026 (julgamento original de 26/06/2024 anulado em 14/05/2025; rejulgado em 18/09/2025; ED em 09/12/2025)
- Tese literal. "A menção à dose, dosímetro ou dosimetria no PPP não é suficiente para se concluir pela observância das determinações da Norma de Higiene Ocupacional (NHO-01) da FUNDACENTRO e/ou da NR-15, nos termos do Tema 174 da TNU. É necessário menção expressa às referidas normas para indicar que as técnicas e metodologias utilizadas na aferição do ruído seguiram todos os seus preceitos."
- Órgão e leading case. TNU, PEDILEF 5000648-28.2020.4.02.5002/ES, Rel. Juiz Federal Nagibe de Melo Jorge Neto.
- Fonte oficial. https://www.cjf.jus.br/cjf/corregedoria-da-justica-federal/turma-nacional-de-uniformizacao/temas-representativos/tema-317
- Conferido em. 25/07/2026

### TEMA 300/TNU
- Situação. julgado em 07/12/2022; situação oficial "Em Revisão - Tema 1421/STF", sem suspensão nacional
- Tese literal. "Quando o empregador não autorizar o retorno do segurado, por considerá-lo incapacitado, mesmo após a cessação de benefício por incapacidade pelo INSS, a sua qualidade de segurado se mantém até o encerramento do vínculo de trabalho, que ocorrerá com a rescisão contratual, quando dará início a contagem do período de graça do art. 15, II, da Lei n. 8.213/1991."
- Órgão e leading case. TNU, PEDILEF 0513030-88.2020.4.05.8400/RN, Rel. Juiz Federal Gustavo Melo Barbosa (acórdão pelo Juiz Federal Fábio Cordeiro de Lima).
- Fonte oficial. https://www.cjf.jus.br/cjf/corregedoria-da-justica-federal/turma-nacional-de-uniformizacao/temas-representativos/tema-300
- Conferido em. 25/07/2026

### TEMA 365/TNU
- Situação. julgado em 12/11/2025 (acórdão publicado em 18/12/2025). ATENÇÃO, tese CONTRA o segurado
- Tese literal. "Não é possível o cômputo do período de gozo de benefício por incapacidade intercalado entre contribuições para fins de aferição das mais de 120 contribuições mensais exigidas para a prorrogação do período de graça, nos termos do art. 15, § 1º, da Lei nº 8.213/91."
- Órgão e leading case. TNU, PEDILEF 0500120-68.2021.4.05.8311/PE, Rel. Juíza Federal Lilian Oliveira da Costa Tourinho (acórdão pelo Juiz Federal Ivanir César Ireno Júnior).
- Fonte oficial. https://www.cjf.jus.br/cjf/corregedoria-da-justica-federal/turma-nacional-de-uniformizacao/temas-representativos/tema-365
- Conferido em. 25/07/2026

### SUMULA 85/STJ
- Situação. vigente
- Tese literal. "Nas relações jurídicas de trato sucessivo em que a Fazenda Pública figure como devedora, quando não tiver sido negado o próprio direito reclamado, a prescrição atinge apenas as prestações vencidas antes do quinquênio anterior a propositura da ação."
- Órgão e leading case. STJ, Corte Especial, j. 18/06/1993, DJ 02/07/1993.
- Fonte oficial. https://processo.stj.jus.br/SCON/sumstj/toc.jsp?sumula=85.num.
- Conferido em. 25/07/2026

### SUMULA 98/STJ
- Situação. vigente
- Tese literal. "Embargos de declaração manifestados com notório propósito de prequestionamento não tem caráter protelatório."
- Órgão e leading case. STJ, Corte Especial, j. 14/04/1994, DJ 25/04/1994.
- Fonte oficial. https://processo.stj.jus.br/SCON/sumstj/toc.jsp?sumula=98.num.
- Conferido em. 25/07/2026

### SUMULA 149/STJ
- Situação. vigente
- Tese literal. "A prova exclusivamente testemunhal não basta a comprovação da atividade rurícola, para efeito da obtenção de benefício previdenciário."
- Órgão e leading case. STJ, Terceira Seção, j. 07/12/1995, DJ 18/12/1995.
- Fonte oficial. https://www.stj.jus.br/docs_internet/revista/eletronica/stj-revista-sumulas-2010_10_capSumula149.pdf
- Conferido em. 25/07/2026

### SUMULA 507/STJ
- Situação. vigente
- Tese literal. "A acumulação de auxílio-acidente com aposentadoria pressupõe que a lesão incapacitante e a aposentadoria sejam anteriores a 11/11/1997, observado o critério do art. 23 da Lei n. 8.213/1991 para definição do momento da lesão nos casos de doença profissional ou do trabalho."
- Órgão e leading case. STJ, Primeira Seção, j. 26/03/2014, DJe 31/03/2014.
- Fonte oficial. https://scon.stj.jus.br/docs_internet/jurisprudencia/tematica/download/SU/Verbetes/VerbetesSTJ.pdf
- Conferido em. 25/07/2026

### SUMULA 577/STJ
- Situação. vigente
- Tese literal. "É possível reconhecer o tempo de serviço rural anterior ao documento mais antigo apresentado, desde que amparado em convincente prova testemunhal colhida sob o contraditório."
- Órgão e leading case. STJ, Primeira Seção, j. 22/06/2016, DJe 27/06/2016.
- Fonte oficial. https://scon.stj.jus.br/docs_internet/jurisprudencia/tematica/download/SU/Verbetes/VerbetesSTJ.pdf
- Conferido em. 25/07/2026

### TEMA 905/STJ
- Situação. vigente (para o período anterior à EC 113/2021, que unificou juros e correção pela SELIC a partir de 09/12/2021)
- Tese literal. "As condenações impostas à Fazenda Pública de natureza previdenciária sujeitam-se à incidência do INPC, para fins de correção monetária, no que se refere ao período posterior à vigência da Lei 11.430/2006, que incluiu o art. 41-A na Lei 8.213/91. Quanto aos juros de mora, incidem segundo a remuneração oficial da caderneta de poupança (art. 1º-F da Lei 9.494/97, com redação dada pela Lei n. 11.960/2009)." (item 3.2 da tese)
- Órgão e leading case. STJ, Primeira Seção, REsp 1.495.146/MG, Rel. Min. Mauro Campbell Marques, j. 22/02/2018, DJe 02/03/2018.
- Fonte oficial. https://processo.stj.jus.br/SCON/recrep/toc.jsp?LREF=REPETITIVOS&tema=%27905%27
- Conferido em. 25/07/2026

### TEMA 640/STJ
- Situação. vigente
- Tese literal. "Aplica-se o parágrafo único do artigo 34 do Estatuto do Idoso (Lei n. 10.741/03), por analogia, a pedido de benefício assistencial feito por pessoa com deficiência a fim de que benefício previdenciário recebido por idoso, no valor de um salário mínimo, não seja computado no cálculo da renda per capita prevista no artigo 20, § 3º, da Lei n. 8.742/93."
- Órgão e leading case. STJ, Primeira Seção, REsp 1.355.052/SP, Rel. Min. Benedito Gonçalves, j. 25/02/2015, DJe 05/11/2015.
- Fonte oficial. https://processo.stj.jus.br/SCON/recrep/toc.jsp?LREF=REPETITIVOS&tema=%27640%27
- Conferido em. 25/07/2026

### TEMA 732/STJ
- Situação. vigente. ATENÇÃO, a matéria pós-EC 103 está afetada no Tema 1271/STF, com suspensão nacional desde 21/01/2025
- Tese literal. "O menor sob guarda tem direito à concessão do benefício de pensão por morte do seu mantenedor, comprovada a sua dependência econômica, nos termos do art. 33, § 3º, do Estatuto da Criança e do Adolescente, ainda que o óbito do instituidor da pensão seja posterior à vigência da Medida Provisória 1.523/96, reeditada e convertida na Lei 9.528/97."
- Órgão e leading case. STJ, Primeira Seção, REsp 1.411.258/RS, Rel. Min. Napoleão Nunes Maia Filho, j. 11/10/2017, DJe 21/02/2018.
- Fonte oficial. https://processo.stj.jus.br/SCON/recrep/toc.jsp?LREF=REPETITIVOS&tema=%27732%27
- Conferido em. 25/07/2026

### SUMULA 269/STF
- Situação. vigente
- Tese literal. "O mandado de segurança não é substitutivo de ação de cobrança."
- Órgão e leading case. STF, Sessão Plenária de 13/12/1963.
- Fonte oficial. https://portal.stf.jus.br/jurisprudencia/sumariosumulas.asp?base=30&sumula=2468
- Conferido em. 25/07/2026

### SUMULA 271/STF
- Situação. vigente
- Tese literal. "Concessão de mandado de segurança não produz efeitos patrimoniais em relação a período pretérito, os quais devem ser reclamados administrativamente ou pela via judicial própria."
- Órgão e leading case. STF, Sessão Plenária de 13/12/1963.
- Fonte oficial. https://portal.stf.jus.br/jurisprudencia/sumariosumulas.asp?base=30&sumula=2471
- Conferido em. 25/07/2026

### SUMULA 359/STF
- Situação. vigente (redação alterada em 14/02/1973)
- Tese literal. "Ressalvada a revisão prevista em lei, os proventos da inatividade regulam-se pela lei vigente ao tempo em que o militar, ou o servidor civil, reuniu os requisitos necessários."
- Órgão e leading case. STF, Sessão Plenária de 13/12/1963, alteração em 14/02/1973.
- Fonte oficial. https://portal.stf.jus.br/jurisprudencia/sumariosumulas.asp?base=30&sumula=1580
- Conferido em. 25/07/2026

### SUMULA 726/STF
- Situação. vigente, RESTRITIVA, mitigada pela Lei 11.301/2006 e pela ADI 3772. O STF, no AI 595589 AgR (2ª Turma, Rel. Min. Joaquim Barbosa, j. 23/11/2010, DJe 07/12/2010), registrou que a ADI 3772 "superou a jurisprudência consolidada no verbete 726 da Súmula" (lido no portal de jurisprudência do STF) (auditoria 03/10/2026)
- Tese literal. "Para efeito de aposentadoria especial de professores, não se computa o tempo de serviço prestado fora da sala de aula."
- Órgão e leading case. STF, DJ 11/12/2003.
- Fonte oficial. https://portal.stf.jus.br/jurisprudencia/sumariosumulas.asp?base=30&sumula=1498
- Conferido em. 25/07/2026

### ADI 3772
- Situação. julgada, procedente em parte com interpretação conforme, transitada em julgado em 16/11/2009 (auditoria 03/10/2026)
- Tese literal. "As funções de direção, coordenação e assessoramento pedagógico integram a carreira do magistério, desde que exercidos, em estabelecimentos de ensino básico, por professores de carreira, excluídos os especialistas em educação, fazendo jus aqueles que as desempenham ao regime especial de aposentadoria estabelecido nos arts. 40, § 5º, e 201, § 8º, da Constituição Federal."
- Órgão e leading case. STF, Plenário, Rel. Min. Ayres Britto, Red. p/ acórdão Min. Ricardo Lewandowski, j. 29/10/2008, DJE 27/03/2009, republicado em 29/10/2009 após embargos de declaração (erro material na ementa). Objeto, art. 1º da Lei 11.301/2006, que acrescentou o § 2º ao art. 67 da Lei 9.394/1996 (auditoria 03/10/2026).
- Fonte oficial. https://portal.stf.jus.br/processos/detalhe.asp?incidente=2399227 (processo) e jurisprudencia.stf.jus.br, pesquisa "ADI 3772" ordenada por data de julgamento (ementa). O endereço antes registrado, incidente 2541930, é o da ADI 3931 (auditoria 03/10/2026).
- Conferido em. 03/10/2026

## Temas de repercussão geral do STF conferidos na página oficial do tema (rodada 2, 25/07/2026)

Nas páginas tema.asp do portal do STF constam título, descrição, leading case, relator e situação, sem o inteiro teor da tese de mérito. Registro abaixo com o TÍTULO OFICIAL literal; a transcrição da tese de mérito fica para promoção futura quando obtida do acórdão. Fonte, https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=NUMERO.

### TEMA 76/STF
- Situação. trânsito em julgado em 28/02/2011. RE 564.354, Rel. Min. Cármen Lúcia.
- Tese literal. Título oficial. "Teto da renda mensal dos benefícios previdenciários concedidos anteriormente à vigência das Emendas Constitucionais nos 20/98 e 41/2003."
- Fonte oficial. https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=76
- Conferido em. 25/07/2026

### TEMA 27/STF
- Situação. trânsito em julgado em 11/12/2013. RE 567.985, Rel. Min. Marco Aurélio (miserabilidade do BPC).
- Fonte oficial. https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=27
- Conferido em. 25/07/2026

### TEMA 312/STF
- Situação. trânsito em julgado em 13/02/2014. RE 580.963, Rel. Min. Gilmar Mendes.
- Tese literal. Título oficial. "Interpretação extensiva ao parágrafo único do art. 34 da Lei nº 10.741/2003 para fins do cálculo da renda familiar de que trata o art. 20, §3º, da Lei nº 8.742/93."
- Fonte oficial. https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=312
- Conferido em. 25/07/2026

### TEMA 334/STF
- Situação. trânsito em julgado em 23/09/2013. RE 630.501, Rel. Min. Ellen Gracie (melhor benefício).
- Fonte oficial. https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=334
- Conferido em. 25/07/2026

### TEMA 359/STF
- Situação. trânsito em julgado em 26/03/2021. RE 602.584, Rel. Min. Marco Aurélio (teto sobre soma de proventos e pensão).
- Fonte oficial. https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=359
- Conferido em. 25/07/2026

### TEMA 368/STF
- Situação. trânsito em julgado em 09/12/2014. RE 614.406 (IR sobre rendimentos recebidos acumuladamente; revisão do antigo tema 133).
- Fonte oficial. https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=368
- Conferido em. 25/07/2026

### TEMA 377/STF
- Situação. trânsito em julgado em 28/09/2018. RE 612.975, Rel. Min. Marco Aurélio (teto na acumulação de cargos).
- Fonte oficial. https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=377
- Conferido em. 25/07/2026

### TEMA 555/STF
- Situação. trânsito em julgado em 04/03/2015. ARE 664.335, Rel. Min. Luiz Fux (EPI e tempo especial).
- Fonte oficial. https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=555
- Conferido em. 25/07/2026

### TEMA 709/STF
- Situação. trânsito em julgado em 01/12/2021. RE 791.961, Rel. Min. Dias Toffoli (permanência na atividade nociva após aposentadoria especial).
- Fonte oficial. https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=709
- Conferido em. 25/07/2026

### TEMA 810/STF
- Situação. trânsito em julgado em 03/03/2020. RE 870.947, Rel. Min. Luiz Fux (juros e correção da Fazenda, art. 1º-F da Lei 9.494/97). Na rodada de 03/10/2026, texto confirmado na fonte oficial e usos restantes DIVERGENTES na base (relatório C1A). Embargos de declaração rejeitados em 03/10/2019, sem modulação; acórdão dos embargos em 03/02/2020.
- Tese literal. "1) O art. 1º-F da Lei nº 9.494/97, com a redação dada pela Lei nº 11.960/09, na parte em que disciplina os juros moratórios aplicáveis a condenações da Fazenda Pública, é inconstitucional ao incidir sobre débitos oriundos de relação jurídico-tributária, aos quais devem ser aplicados os mesmos juros de mora pelos quais a Fazenda Pública remunera seu crédito tributário, em respeito ao princípio constitucional da isonomia (CRFB, art. 5º, caput); quanto às condenações oriundas de relação jurídica não-tributária, a fixação dos juros moratórios segundo o índice de remuneração da caderneta de poupança é constitucional, permanecendo hígido, nesta extensão, o disposto no art. 1º-F da Lei nº 9.494/97 com a redação dada pela Lei nº 11.960/09; e 2) O art. 1º-F da Lei nº 9.494/97, com a redação dada pela Lei nº 11.960/09, na parte em que disciplina a atualização monetária das condenações impostas à Fazenda Pública segundo a remuneração oficial da caderneta de poupança, revela-se inconstitucional ao impor restrição desproporcional ao direito de propriedade (CRFB, art. 5º, XXII), uma vez que não se qualifica como medida adequada a capturar a variação de preços da economia, sendo inidônea a promover os fins a que se destina." (mérito em 20/09/2017; tese na página de andamento do tema, incidente 4723934). A tese não menciona o IPCA-E, que segue [NÃO CONFIRMADO] até a leitura do acórdão de mérito.
- Decisão dos embargos. "O Tribunal, por maioria, rejeitou todos os embargos de declaração e não modulou os efeitos da decisão anteriormente proferida, nos termos do voto do Ministro Alexandre de Moraes, Redator para o acórdão, vencidos os Ministros Luiz Fux (Relator), Roberto Barroso, Gilmar Mendes e Dias Toffoli (Presidente)." (trecho). Fonte oficial, https://portal.stf.jus.br/processos/abaDecisoes.asp?incidente=4723934
- Uso indevido corrigido em 03/10/2026: a base o apresentava como julgado com modulação de efeitos. Embargos rejeitados em 03/10/2019, sem modulação (auditoria 03/10/2026).
- Fonte oficial. https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=810
- Conferido em. 25/07/2026; reconferido em 03/10/2026 (auditoria 03/10/2026)

### TEMA 942/STF
- Situação. trânsito em julgado em 04/08/2021. RE 1.014.286, Rel. Min. Dias Toffoli (conversão de tempo especial de servidor).
- Fonte oficial. https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=942
- Conferido em. 25/07/2026

### TEMA 1271/STF
- Situação. MÉRITO PENDENTE. RG reconhecida em 18/09/2023 (acórdão publicado 22/09/2023). SUSPENSÃO NACIONAL desde 21/01/2025. Parecer da PGR pelo não provimento em 15/04/2026; conclusos ao relator em 16/04/2026. RE 1.442.021, Rel. Min. André Mendonça.
- Tese literal. Título oficial. "Exclusão da criança e do adolescente sob guarda do rol de beneficiários, na condição de dependentes, do segurado do Regime Geral de Previdência Social, implementada pelo art. 23 da Emenda Constitucional nº 103/2019."
- Fonte oficial. https://portal.stf.jus.br/jurisprudenciaRepercussao/verAndamentoProcesso.asp?incidente=6661561&numeroProcesso=1442021&classeProcesso=RE&numeroTema=1271
- Conferido em. 25/07/2026

### TEMA 18/STJ
- Situação. trânsito em julgado (16/08/2010), tese SUPERADA MATERIALMENTE pelos Temas 165 e 388 do STF. Não citar a favor do segurado. O NUGEPNAC anota na própria página a vinculação aos dois temas do STF.
- Tese literal. "A majoração do auxílio-acidente, estabelecida pela Lei 9.032/95 (lei nova mais benéfica), que alterou o § 1º, do art. 86, da Lei n.º 8.213/91, deve ser aplicada imediatamente, atingindo todos os segurados que estiverem na mesma situação, seja referente aos casos pendentes de concessão ou aos benefícios já concedidos."
- Órgão e leading case. STJ, Terceira Seção, REsp 1.096.244/SC, Rel. Min. Maria Thereza de Assis Moura, julgado em 22/04/2009, acórdão publicado em 08/05/2009.
- Fonte oficial. https://processo.stj.jus.br/repetitivos/temas_repetitivos/pesquisa.jsp?novaConsulta=true&tipo_pesquisa=T&cod_tema_inicial=18&cod_tema_final=18
- Conferido em. 25/07/2026

### TEMA 165/STF
- Situação. trânsito em julgado em 02/09/2009, repercussão geral com reafirmação de jurisprudência (RE 415.454 e RE 416.827, Plenário).
- Tese literal. O portal do tema não exibe tese redigida, por se tratar de reafirmação de jurisprudência. Título oficial, "Revisão da pensão por morte concedida antes do advento da Lei nº 9.032/95". A orientação reafirmada veda a revisão pela Lei 9.032/95 de pensão concedida antes de sua vigência. Transcrição de tese em peça deve usar o acórdão do RE 597.389.
- Órgão e leading case. STF, RE 597.389, repercussão geral reconhecida em 22/04/2009.
- Fonte oficial. https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=165
- Conferido em. 25/07/2026

### TEMA 388/STF
- Situação. trânsito em julgado em 20/06/2011, repercussão geral com reafirmação de jurisprudência.
- Tese literal. O portal do tema não exibe tese redigida, por se tratar de reafirmação de jurisprudência. Título oficial, "Revisão de auxílio-acidente concedido antes do advento da Lei nº 9.032/95". A orientação reafirmada veda a aplicação retroativa da majoração da Lei 9.032/95 ao auxílio-acidente concedido antes de sua vigência. Transcrição de tese em peça deve usar o acórdão do RE 613.033.
- Órgão e leading case. STF, RE 613.033/SP, Rel. Min. Dias Toffoli, repercussão geral em 15/04/2011.
- Fonte oficial. https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=388
- Conferido em. 25/07/2026

### PORTARIA CONJUNTA MDS/MPS/INSS 37/2026
- Situação. vigente desde a publicação (art. 3º). Altera a Portaria Conjunta MDS/INSS 2/2015 (avaliação social e médica da PCD para o BPC).
- Tese literal. Não se aplica (norma administrativa). Novo art. 8º, "A combinação de qualificadores finais resultantes da avaliação social e da avaliação médica será confrontada com a Tabela Conclusiva de Qualificadores - Anexo IV desta Portaria, para fins de reconhecimento ou não do direito ao benefício." Parágrafo único, "O benefício será indeferido quando as alterações de Funções e/ou Estruturas do Corpo puderem ser resolvidas em menos de 2 (dois) anos, consideradas as condições especificadas no inciso III do art. 7º." SEM dispositivo revogatório expresso, os antigos incisos do art. 8º caíram por substituição integral com (NR). Anexo IV NÃO alterado.
- Órgão e leading case. MDS, MPS e INSS. Assinam José Wellington Barroso de Araújo Dias, Wolney Queiroz Maciel e Gilberto Waller Júnior. DOU Edição 63, de 02/04/2026, Seção 1, p. 46.
- Fonte oficial. https://www.in.gov.br/web/dou/-/portaria-conjunta-mds/mps/inss-n-37-1-de-abril-de-2026-697116028
- Conferido em. 26/07/2026

### SUMULA 15/STJ
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório E3, lote 8). O relatório não registra cancelamento.
- Tese literal. "Compete à Justiça Estadual processar e julgar os litígios decorrentes de acidente do trabalho"
- Órgão e leading case. STJ. Órgão e data não registrados no relatório E3.
- Fonte oficial. https://www.stj.jus.br/docs_internet/VerbetesSTJ_asc.txt
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 44/STJ
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório E3, lote 8, texto lido na fonte oficial). O relatório não registra cancelamento.
- Tese literal. "A definição, em ato regulamentar, de grau mínimo de disacusia, não exclui, por si só, a concessão do benefício previdenciário"
- Órgão e leading case. STJ. Órgão e data não registrados no relatório E3.
- Fonte oficial. https://www.stj.jus.br/docs_internet/VerbetesSTJ_asc.txt
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 45/STJ
- Situação. texto confirmado na fonte oficial (relatório E3, lote 8). O relatório marcou DIVERGENTE só o uso em cpc-apelacao-efeitos SKILL.md:56, que inverte o efeito da súmula.
- Tese literal. "…é defeso, ao Tribunal, agravar a condenação imposta à Fazenda Pública" (trecho final, como transcrito no relatório E3). Copiar a redação literal da fonte antes de citar em peça.
- Órgão e leading case. STJ. Órgão e data não registrados no relatório E3.
- Fonte oficial. https://www.stj.jus.br/docs_internet/VerbetesSTJ_asc.txt
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 96/TCU
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório E3, lote 2).
- Tese literal. Não transcrita no relatório E3, que traz só esta síntese: Conta-se como tempo de serviço público o de aluno-aprendiz em Escola Pública Profissional, com retribuição pecuniária à conta do Orçamento. Copiar a redação literal da fonte antes de citar em peça.
- Órgão e leading case. TCU. Data não registrada no relatório E3.
- Fonte oficial. https://pesquisa.apps.tcu.gov.br/resultado/sumula/*/NUMERO:96/sinonimos=true (consulta pela REST do TCU)
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### TEMA 132/TST
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório E3, lote 1).
- Tese literal. "A pretensão de retificação e entrega do Perfil Profissiográfico Previdenciário - PPP é imprescritível"
- Órgão e leading case. TST, Tema 132 de recursos repetitivos. Processo e data não registrados no relatório E3.
- Fonte oficial. https://portal.trt3.jus.br/internet/jurisprudencia/incidentes-suscitados-irr-iac-arginc-tst/downloads/tema-132-reafirm-acordao-publicado.pdf
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 598/STJ
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório E3, lote 2).
- Tese literal. Não transcrita no relatório E3, que traz só esta síntese: Dispensa laudo médico oficial para a isenção judicial de IR por doença grave, se demonstrada por outros meios de prova. Copiar a redação literal da fonte antes de citar em peça.
- Órgão e leading case. STJ, Primeira Seção, 08/11/2017.
- Fonte oficial. https://www.stj.jus.br/internet_docs/biblioteca/clippinglegislacao/Sumula_598_2017_primeira_secao.pdf
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 105/STJ
- Situação. vigente, sem cancelamento (relatório E3, lote 2, CONFIRMADO_FONTE_OFICIAL).
- Tese literal. "Na ação de mandado de segurança não se admite condenação em honorários advocatícios"
- Órgão e leading case. STJ, julgada em 26/05/1994.
- Fonte oficial. https://arquivocidadao.stj.jus.br/index.php/sumula-105
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### TEMA 1076/STJ
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório E3, lote 2).
- Tese literal. Não transcrita no relatório E3, que traz só esta síntese: Honorários por equidade só se o proveito econômico for inestimável ou irrisório ou o valor da causa muito baixo; vedada se elevados. Copiar a redação literal da fonte antes de citar em peça.
- Órgão e leading case. STJ, REsp 1.850.512/SP, julgado em 16/03/2022.
- Fonte oficial. https://www.stj.jus.br/docs_internet/informativos/PDF/Inf0730.pdf
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### TEMA 1178/STJ
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório E3, lote 1). Tese fixada no segundo semestre de 2025, segundo a notícia oficial.
- Tese literal. "É vedado o uso de critérios objetivos para o indeferimento imediato da gratuidade…" (trecho inicial, como transcrito no relatório E3). Copiar a redação literal da fonte antes de citar em peça.
- Órgão e leading case. STJ, recurso repetitivo. Processo não registrado no relatório E3.
- Fonte oficial. https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/2026/28012026-STJ-julgou-42-temas-repetitivos-no-segundo-semestre-de-2025--veja-as-teses-fixadas.aspx
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 37/STJ
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório E3, lote 6). O relatório não registra cancelamento.
- Tese literal. "São cumuláveis as indenizações por dano material e dano moral oriundos do mesmo fato"
- Órgão e leading case. STJ. Órgão e data não registrados no relatório E3.
- Fonte oficial. scon.stj.jus.br/SCON/sumstj (Súmula 37)
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### TEMA 988/STJ
- Situação. CONFIRMADO_FONTE_OFICIAL (auditoria de 03/10/2026, rodada R2, página oficial dos repetitivos do STJ).
- Tese literal. Não transcrita nesta rodada, que registra só esta síntese: o rol do art. 1.015 do CPC é de taxatividade mitigada, e o agravo de instrumento cabe fora dele quando demonstrada a urgência. Copiar a redação literal da fonte antes de citar em peça.
- Órgão e leading case. STJ, Corte Especial, REsp 1.696.396/MT e REsp 1.704.520/MT, julgados em 05/12/2018.
- Fonte oficial. https://processo.stj.jus.br/repetitivos/temas_repetitivos/
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### TEMA 955/STJ
- Situação. CONFIRMADO_FONTE_OFICIAL (auditoria de 03/10/2026, rodada R2, página oficial dos repetitivos do STJ). Tema de previdência complementar, não do RGPS; não confundir com o Tema 995/STJ (reafirmação da DER).
- Tese literal. Não transcrita nesta rodada, que registra só esta síntese: os reflexos de horas extras reconhecidas pela Justiça do Trabalho não integram a complementação de aposentadoria já concedida. Copiar a redação literal da fonte antes de citar em peça.
- Órgão e leading case. STJ, Segunda Seção, REsp 1.312.736/RS. Data não registrada nesta rodada.
- Fonte oficial. https://processo.stj.jus.br/repetitivos/temas_repetitivos/
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 512/STF
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C1A).
- Tese literal. "Não cabe condenação em honorários de advogado na ação de mandado de segurança."
- Órgão e leading case. STF. Data não registrada no relatório C1A.
- Fonte oficial. https://jurisprudencia.stf.jus.br/pages/search/seq-sumula512/false
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 405/STF
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C1A).
- Tese literal. "Denegado o mandado de segurança pela sentença, ou no julgamento do agravo, dela interposto, fica sem efeito a liminar concedida, retroagindo os efeitos da decisão contrária."
- Órgão e leading case. STF. Data não registrada no relatório C1A.
- Fonte oficial. https://jurisprudencia.stf.jus.br/pages/search/seq-sumula405/false
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 283/STF
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C1A). Na base, o uso no pedido de uniformização é por analogia declarada.
- Tese literal. "É inadmissível o recurso extraordinário, quando a decisão recorrida assenta em mais de um fundamento suficiente e o recurso não abrange todos êles."
- Órgão e leading case. STF. Data não registrada no relatório C1A.
- Fonte oficial. https://jurisprudencia.stf.jus.br/pages/search/seq-sumula283/false
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 284/STF
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C1A). O enunciado trata só do recurso extraordinário.
- Tese literal. "É inadmissível o recurso extraordinário, quando a deficiência na sua fundamentação não permitir a exata compreensão da controvérsia."
- Órgão e leading case. STF. Data não registrada no relatório C1A.
- Fonte oficial. https://jurisprudencia.stf.jus.br/pages/search/seq-sumula284/false
- Uso indevido corrigido em 03/10/2026: a base lhe atribuía aplicação mais rigorosa no JEF, que não decorre do enunciado.
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 688/STF
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C1A). É a fonte para a incidência da contribuição sobre o 13º salário, que a base atribuía ao Tema 20/STF.
- Tese literal. "É legítima a incidência da contribuição previdenciária sobre o 13º salário."
- Órgão e leading case. STF. Data não registrada no relatório C1A.
- Fonte oficial. https://jurisprudencia.stf.jus.br/pages/search/seq-sumula688/false
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 729/STF
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C1A).
- Tese literal. "A decisão na Ação Direta de Constitucionalidade 4 não se aplica à antecipação de tutela em causa de natureza previdenciária."
- Órgão e leading case. STF. Data não registrada no relatório C1A.
- Fonte oficial. https://portal.stf.jus.br/jurisprudencia/sumariosumulas.asp?base=30&sumula=2705
- Uso indevido corrigido em 03/10/2026: a base lhe atribuía modulação, que o enunciado não contém.
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 689/STF
- Situação. texto confirmado na fonte oficial; uso DIVERGENTE na base (relatório C1A). A divergência estava em três passagens.
- Tese literal. "O segurado pode ajuizar ação contra a instituição previdenciária perante o juízo federal do seu domicílio ou nas varas federais da Capital do Estado-Membro."
- Órgão e leading case. STF. Data não registrada no relatório C1A.
- Fonte oficial. https://jurisprudencia.stf.jus.br/pages/search/seq-sumula689/false
- Uso indevido corrigido em 03/10/2026: a base a citava para a competência do local do ato e para o foro do Distrito Federal, que decorre do art. 109, § 2º, da CF.
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 267/STF
- Situação. texto confirmado na fonte oficial; uso DIVERGENTE na base (relatório C1A).
- Tese literal. "Não cabe mandado de segurança contra ato judicial passível de recurso ou correição."
- Órgão e leading case. STF. Data não registrada no relatório C1A.
- Fonte oficial. https://jurisprudencia.stf.jus.br/pages/search/seq-sumula267/false
- Uso indevido corrigido em 03/10/2026: a base lhe acrescentava a ressalva "exceto em hipóteses extremas", que não consta do enunciado.
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 640/STF
- Situação. texto confirmado na fonte oficial; uso DIVERGENTE na base (relatório C1A).
- Tese literal. "É cabível recurso extraordinário contra decisão proferida por juiz de primeiro grau nas causas de alçada, ou por turma recursal de juizado especial cível e criminal."
- Órgão e leading case. STF. Data não registrada no relatório C1A.
- Fonte oficial. https://jurisprudencia.stf.jus.br/pages/search/seq-sumula640/false
- Uso indevido corrigido em 03/10/2026: a base a estendia ao acórdão da TNU, que o enunciado não menciona.
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 14/STF
- Situação. texto confirmado na fonte oficial; uso DIVERGENTE na base (relatório C1A). O portal remete à Súmula 683.
- Tese literal. "Não é admissível, por ato administrativo, restringir, em razão da idade, inscrição em concurso para cargo público."
- Órgão e leading case. STF. Data não registrada no relatório C1A.
- Fonte oficial. https://jurisprudencia.stf.jus.br/pages/search/seq-sumula14/false
- Uso indevido corrigido em 03/10/2026: a base lhe atribuía texto inventado sobre óbice infralegal a recurso.
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### TEMA 138/STF
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C1A). Trânsito em julgado em 23/02/2012.
- Tese literal. "Ao Estado é facultada a revogação de atos que repute ilegalmente praticados; porém, se de tais atos já tiverem decorrido efeitos concretos, seu desfazimento deve ser precedido de regular processo administrativo."
- Órgão e leading case. STF, RE 594.296, Rel. Min. Dias Toffoli, mérito em 21/09/2011.
- Fonte oficial. https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=138 (tese na página de andamento do tema, incidente 2644122)
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### TEMA 1390/STF
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C1A). Repercussão geral reconhecida, sem tese, mérito pendente.
- Tese literal. Não há tese firmada. Assunto, segundo o relatório C1A: art. 201, § 16, da CF, empregado público aos 75 anos.
- Órgão e leading case. STF, RE 1.519.008, Rel. Min. Gilmar Mendes.
- Fonte oficial. https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=1390
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### TEMA 1373/STF
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C1A).
- Tese literal. "O ajuizamento de ação para o reconhecimento de isenção de imposto de renda por doença grave e para a repetição do indébito tributário não exige prévio requerimento administrativo."
- Órgão e leading case. STF, RE 1.525.407/CE.
- Fonte oficial. https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=1373 (tese na página de andamento do tema, incidente 7093152)
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### TEMA 384/STF
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C1A). Trânsito em julgado em 21/09/2018.
- Tese literal. "Nos casos autorizados constitucionalmente de acumulação de cargos, empregos e funções, a incidência do art. 37, inciso XI, da Constituição Federal pressupõe consideração de cada um dos vínculos formalizados, afastada a observância do teto remuneratório quanto ao somatório dos ganhos do agente público. (A mesma tese foi fixada para o Tema 377)"
- Órgão e leading case. STF, RE 602.043/MT, Rel. Min. Marco Aurélio, mérito em 27/04/2017.
- Fonte oficial. https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=384 (tese na página de andamento do tema, incidente 2694206)
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### TEMA 1435/STF
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C1A). Repercussão geral reconhecida (acórdão de 17/10/2025), sem tese, mérito pendente.
- Tese literal. Não há tese firmada. Assunto, segundo o relatório C1A: licença-maternidade a um dos homens de união homoafetiva, servidor municipal.
- Órgão e leading case. STF, ARE 1.498.231, Rel. Min. Edson Fachin.
- Fonte oficial. https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=1435
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### TEMA 374/STF
- Situação. CONFIRMADO_FONTE_OFICIAL, uso com ressalva (relatório C1A). Trânsito em julgado em 08/12/2016.
- Tese literal. "A regra prevista no § 2º do art. 109 da Constituição Federal também se aplica às ações movidas em face de autarquias federais."
- Órgão e leading case. STF, RE 627.709, Rel. Min. Ricardo Lewandowski, mérito em 20/08/2014.
- Fonte oficial. https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=374 (tese na página de andamento do tema, incidente 3924696)
- Uso indevido corrigido em 03/10/2026: a base o aplicava ao mandado de segurança ("impetrante") e mandava acompanhá-lo como pendente. A tese trata de ações contra autarquias federais; a extensão ao mandado de segurança é argumento [NÃO CONFIRMADO].
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### TEMA 782/STF
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C1A). Trânsito em julgado em 26/08/2016. É o tema que a base chamava de Tema 161/STF.
- Tese literal. "Os prazos da licença adotante não podem ser inferiores aos prazos da licença gestante, o mesmo valendo para as respectivas prorrogações. Em relação à licença adotante, não é possível fixar prazos diversos em função da idade da criança adotada."
- Órgão e leading case. STF, RE 778.889, Rel. Min. Luís Roberto Barroso, mérito em 10/03/2016. O tema trata de servidoras (licença estatutária); a aplicação ao salário-maternidade do RGPS é por analogia.
- Fonte oficial. https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=782 (tese na página de andamento do tema, incidente 4482209)
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### TEMA 960/STF
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C1A). Repercussão geral negada (matéria infraconstitucional), trânsito em julgado em 26/09/2017.
- Tese literal. "É constitucional a incidência do fator previdenciário ao benefício de aposentadoria por tempo de contribuição de professor, quando reunidos os requisitos para concessão após a edição da Lei n°. 9.876/1999." (tese registrada no portal)
- Órgão e leading case. STF, RE 1.029.608, Rel. Min. Edson Fachin.
- Fonte oficial. https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=960 (tese na página de andamento do tema, incidente 5140916)
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### TEMA 28/STF
- Situação. texto confirmado na fonte oficial; uso DIVERGENTE na base (relatório C1A). Trânsito em julgado em 19/08/2020.
- Tese literal. "Surge constitucional expedição de precatório ou requisição de pequeno valor para pagamento da parte incontroversa e autônoma do pronunciamento judicial transitada em julgado observada a importância total executada para efeitos de dimensionamento como obrigação de pequeno valor."
- Órgão e leading case. STF, RE 1.205.530/SP, Rel. Min. Marco Aurélio, Plenário Virtual, mérito em 08/06/2020, acórdão em 01/07/2020.
- Fonte oficial. https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=28 (tese na página de andamento do tema, incidente 5684509)
- Uso indevido corrigido em 03/10/2026: a base o tratava como cumprimento ou execução provisória. A tese cuida da parte incontroversa e autônoma já transitada em julgado.
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### TEMA 627/STF
- Situação. texto confirmado na fonte oficial; uso DIVERGENTE na base (relatório C1A). Trânsito em julgado em 21/04/2023.
- Tese literal. "Em se tratando de cargos constitucionalmente acumuláveis, descabe aplicar a vedação de acumulação de aposentadorias e pensões contida na parte final do artigo 11 da Emenda Constitucional 20/98, porquanto destinada apenas aos casos de que trata, ou seja, aos reingressos no serviço público por meio de concurso público antes da publicação da referida emenda e que envolvam cargos inacumuláveis."
- Órgão e leading case. STF, RE 658.999/SC, Rel. Min. Dias Toffoli, Plenário Virtual, mérito em 17/12/2022, acórdão em 22/03/2023.
- Fonte oficial. https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=627 (tese na página de andamento do tema, incidente 4147805)
- Uso indevido corrigido em 03/10/2026: a base datava o julgamento de 14/05/2014 e generalizava a tese para qualquer acumulação de cargos. A tese é restrita ao art. 11 da EC 20/98; o uso na acumulação do art. 24 da EC 103/2019 é por analogia.
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### TEMA 1091/STF
- Situação. texto confirmado na fonte oficial; uso DIVERGENTE na base (relatório C1A). Reafirmação de jurisprudência, trânsito em julgado em 27/06/2020.
- Tese literal. "É constitucional o fator previdenciário previsto no art. 29, caput, incisos e parágrafos, da Lei nº 8.213/91, com a redação dada pelo art. 2º da Lei nº 9.876/99."
- Órgão e leading case. STF, RE 1.221.630/SC, repercussão geral em 05/06/2020, acórdão em 19/06/2020. A descrição oficial pergunta também se o fator incide nos proventos de professor.
- Fonte oficial. https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=1091 (tese na página de andamento do tema, incidente 5732688)
- Uso indevido corrigido em 03/10/2026: a base o rotulava "Professor e magistério" e mandava acompanhá-lo como pendente.
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### ADI 1721
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C1B). Julgada procedente em 11/10/2006.
- Tese literal. Não transcrita no relatório C1B, que traz só esta síntese: inconstitucional o § 2º do art. 453 da CLT (aposentadoria espontânea). Copiar a redação literal da fonte antes de citar em peça.
- Órgão e leading case. STF, Rel. Min. Ayres Britto.
- Fonte oficial. https://portal.stf.jus.br/processos/detalhe.asp?incidente=1689611
- Uso indevido corrigido em 03/10/2026: a base a citava para o art. 57, § 8º, da Lei 8.213/91, que a ação não trata.
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### ADI 2110
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C1B). Julgamento em 21/03/2024, ata publicada em 05/04/2024, acórdão em 24/05/2024, trânsito em julgado em 25/10/2024. O registro do portal não mostra modulação para a carência; o inteiro teor não foi lido.
- Tese literal. Dispositivo, "(a) julgou parcialmente procedente o pedido constante da ADI 2.110, para declarar a inconstitucionalidade da exigência de carência para a fruição de salário-maternidade, prevista no art. 25, inc. III, da Lei nº 8.213/1991, na redação dada pelo art. 2º da Lei nº 9.876/1999".
- Órgão e leading case. STF, Rel. Min. Nunes Marques, vencido neste ponto.
- Fonte oficial. https://portal.stf.jus.br/processos/detalhe.asp?incidente=1795150
- Uso indevido corrigido em 03/10/2026: a base fixava em 05/04/2024 o início da inexigibilidade da carência do salário-maternidade. Essa é a data da ata, que marca o corte da irrepetibilidade na Revisão da Vida Toda.
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### ADI 2111
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C1B). Julgada improcedente em 21/03/2024. Embargos (ED-ED) julgados em 10/04/2025 e publicados em 12/06/2025, com modulação. Quartos embargos não conhecidos em 22/06/2026. Trânsito em julgado em 09/07/2026.
- Tese literal. "A declaração de constitucionalidade do art. 3º da Lei 9.876/1999 impõe que o dispositivo legal seja observado de forma cogente pelos demais órgãos do Poder Judiciário e pela administração pública, em sua interpretação textual, que não permite exceção. O segurado do INSS que se enquadre no dispositivo não pode optar pela regra definitiva prevista no artigo 29, incisos I e II, da Lei nº 8.213/91, independentemente de lhe ser mais favorável." Modulação, da ementa dos ED-ED, "a irrepetibilidade dos valores percebidos a maior pelos segurados e pensionistas do INSS em virtude de decisões judiciais, definitivas ou provisórias, prolatadas até a data da publicação da ata de julgamento do mérito das ADIs 2.110 e 2.111, ou seja, até 5.4.2024" e "a inexigibilidade de honorários advocatícios de sucumbência, custas e perícias contábeis dos postulantes de ações judiciais lastreadas na tese jurídica denominada Revisão da Vida Toda".
- Órgão e leading case. STF, Rel. Min. Nunes Marques.
- Fonte oficial. https://portal.stf.jus.br/processos/detalhe.asp?incidente=1795149
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### ADI 3931
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C1B). Julgada improcedente por maioria em 20/04/2020, trânsito em julgado em 13/08/2020.
- Tese literal. Não transcrita no relatório C1B, que traz só esta síntese: constitucional o art. 21-A da Lei 8.213/91 (NTEP). Esse objeto vem de ementa posterior do STF que cita a ação. Copiar a redação literal da fonte antes de citar em peça.
- Órgão e leading case. STF, Rel. Min. Cármen Lúcia.
- Fonte oficial. https://portal.stf.jus.br/processos/detalhe.asp?incidente=2541930
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### ADI 6096
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C1B). Julgada em 13/10/2020, por 6 votos a 5. Embargos rejeitados em 14/06/2021.
- Tese literal. Não transcrita no relatório C1B, que traz só esta síntese: inconstitucional o art. 24 da Lei 13.846/2019, na parte em que deu nova redação ao art. 103 da Lei 8.213/91. Copiar a redação literal da fonte antes de citar em peça.
- Órgão e leading case. STF, Rel. Min. Edson Fachin. Vencidos Marco Aurélio, Dias Toffoli, Gilmar Mendes, Luís Roberto Barroso e Luiz Fux.
- Fonte oficial. https://portal.stf.jus.br/processos/detalhe.asp?incidente=5647251
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### ADI 6309
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C1B). Julgamento presencial em 03/06/2026, ata publicada em 11/06/2026, acórdão publicado em 02/10/2026. O registro do portal não traz tese nem modulação, e o inteiro teor não foi lido. A data de 12/07/2026 que aparece em títulos da base é a do registro na base, não a do julgamento.
- Tese literal. Dispositivo, "O Tribunal, por maioria, julgou parcialmente procedente a ação direta, declarando-se a inconstitucionalidade apenas do art. 19, § 1º, I, alíneas a, b e c, da EC nº 103/2019".
- Órgão e leading case. STF, Rel. Min. Luís Roberto Barroso (vencido em parte), redator do acórdão Min. André Mendonça. Autora, CNTI.
- Fonte oficial. https://portal.stf.jus.br/processos/detalhe.asp?incidente=5848987
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### ADI 6970
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C1B). Julgada em 16/08/2022, por unanimidade, trânsito em julgado em 21/09/2022.
- Tese literal. Não transcrita no relatório C1B, que traz só esta síntese: cautelar convertida em julgamento de mérito, pedido improcedente, constitucional a Lei 14.128/2021. Copiar a redação literal da fonte antes de citar em peça.
- Órgão e leading case. STF, Rel. Min. Cármen Lúcia, sessão virtual de 05 a 15/08/2022.
- Fonte oficial. https://portal.stf.jus.br/processos/detalhe.asp?incidente=6242600
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### ADI 7051
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C1B). Julgamento registrado em 26/06/2023 (sessão virtual encerrada em 23/06/2023), improcedente por maioria. Embargos rejeitados em 02/10/2023. Trânsito em julgado em 26/10/2023.
- Tese literal. "sessão virtual encerrada em 23/06/2023"
- Órgão e leading case. STF, Rel. Min. Luís Roberto Barroso. Vencidos parcialmente Edson Fachin e Rosa Weber.
- Fonte oficial. https://portal.stf.jus.br/processos/detalhe.asp?incidente=6320471
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### ADPF 690
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C1B). Julgada procedente em parte em 15/03/2021, por unanimidade.
- Tese literal. Não transcrita no relatório C1B, que traz só esta síntese: o Ministério da Saúde deve manter a divulgação diária integral dos dados da Covid-19. Copiar a redação literal da fonte antes de citar em peça.
- Órgão e leading case. STF, Rel. Min. Alexandre de Moraes.
- Fonte oficial. https://portal.stf.jus.br/processos/detalhe.asp?incidente=5931727
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 555/STJ
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C2). Vigente. Matéria tributária; a base só a menciona em notas de retirada.
- Tese literal. "Quando não houver declaração do débito, o prazo decadencial quinquenal para o Fisco constituir o crédito tributário conta-se exclusivamente na forma do art. 173, I, do CTN, nos casos em que a legislação atribui ao sujeito passivo o dever de antecipar o pagamento sem prévio exame da autoridade administrativa."
- Órgão e leading case. STJ, Primeira Seção, 09/12/2015, DJe 15/12/2015.
- Fonte oficial. https://scon.stj.jus.br/SCON/sumstj/toc.jsp?tipo=sumula+ou+su
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 148/STJ
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C2). Vigente. A afirmação de que revogou a Súmula 71 do TFR não está no enunciado e não foi conferida.
- Tese literal. "Os débitos relativos a benefício previdenciário, vencidos e cobrados em juízo após a vigência da Lei nr. 6.899/81, devem ser corrigidos monetariamente na forma prevista nesse diploma legal."
- Órgão e leading case. STJ, Terceira Seção, 07/12/1995, DJ 18/12/1995.
- Fonte oficial. https://scon.stj.jus.br/SCON/sumstj/toc.jsp?tipo=sumula+ou+su
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 168/STJ
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C2). Vigente.
- Tese literal. "Não cabem embargos de divergência, quando a jurisprudência do Tribunal se firmou no mesmo sentido do acórdão embargado."
- Órgão e leading case. STJ, Corte Especial, 16/10/1996, DJ 22/10/1996.
- Fonte oficial. https://scon.stj.jus.br/SCON/sumstj/toc.jsp?tipo=sumula+ou+su
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 278/STJ
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C2). Vigente. Súmula de contrato de seguro (Direito Civil); o uso previdenciário é por analogia.
- Tese literal. "O termo inicial do prazo prescricional, na ação de indenização, é a data em que o segurado teve ciência inequívoca da incapacidade laboral."
- Órgão e leading case. STJ, Segunda Seção, 14/05/2003, DJ 16/06/2003.
- Fonte oficial. https://scon.stj.jus.br/SCON/sumstj/toc.jsp?tipo=sumula+ou+su
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 416/STJ
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C2). Vigente.
- Tese literal. "É devida a pensão por morte aos dependentes do segurado que, apesar de ter perdido essa qualidade, preencheu os requisitos legais para a obtenção de aposentadoria até a data do seu óbito."
- Órgão e leading case. STJ, Terceira Seção, 09/12/2009, DJe 16/12/2009.
- Fonte oficial. https://scon.stj.jus.br/SCON/sumstj/toc.jsp?tipo=sumula+ou+su
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 204/STJ
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C2). Vigente.
- Tese literal. "Os juros de mora nas ações relativas a benefícios previdenciários incidem a partir da citação válida."
- Órgão e leading case. STJ, Terceira Seção, 11/03/1998, DJ 18/03/1998.
- Fonte oficial. https://scon.stj.jus.br/SCON/sumstj/toc.jsp?tipo=sumula+ou+su
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 212/STJ
- Situação. CANCELADA pela Primeira Seção em 14/09/2022, no Projeto de Súmula 375 (DJe 19/09/2022). Cancelamento confirmado na fonte oficial; uso DIVERGENTE na base (relatório C2). A nota oficial não registra a ADI 4.296 como causa do cancelamento.
- Tese literal. Redação de 11/05/2005, "A compensação de créditos tributários não pode ser deferida em ação cautelar ou por medida liminar cautelar ou antecipatória." Nota oficial, "A Primeira Seção, na sessão de 14/09/2022, ao apreciar o Projeto de Súmula n. 375, determinou o CANCELAMENTO da Súmula 212 do STJ (DJe 19/09/2022)."
- Órgão e leading case. STJ, Primeira Seção.
- Fonte oficial. https://scon.stj.jus.br/SCON/sumstj/toc.jsp?inde=(sumula+adj+cancelada).emen,inde.
- Uso indevido corrigido em 03/10/2026: a base a tratava como vigente.
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 213/STJ
- Situação. texto confirmado na fonte oficial; uso DIVERGENTE na base (relatório C2). Vigente. Matéria tributária.
- Tese literal. "O mandado de segurança constitui ação adequada para a declaração do direito à compensação tributária."
- Órgão e leading case. STJ, Primeira Seção, 23/09/1998, DJ 02/10/1998.
- Fonte oficial. https://scon.stj.jus.br/SCON/sumstj/toc.jsp?tipo=sumula+ou+su
- Uso indevido corrigido em 03/10/2026: a base dizia que o mandado de segurança é instrumento de compensação tributária. A súmula trata da declaração do direito à compensação.
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 7/STJ
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C2). Vigente.
- Tese literal. "A pretensão de simples reexame de prova não enseja recurso especial."
- Órgão e leading case. STJ, Corte Especial, 28/06/1990, DJ 03/07/1990.
- Fonte oficial. https://scon.stj.jus.br/SCON/sumstj/toc.jsp?tipo=sumula+ou+su
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 340/STJ
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C2). Vigente.
- Tese literal. "A lei aplicável à concessão de pensão previdenciária por morte é aquela vigente na data do óbito do segurado."
- Órgão e leading case. STJ, Terceira Seção, 27/06/2007, DJ 13/08/2007.
- Fonte oficial. https://scon.stj.jus.br/SCON/sumstj/toc.jsp?tipo=sumula+ou+su
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 272/STJ
- Situação. texto confirmado na fonte oficial; uso DIVERGENTE na base (relatório C2). Vigente.
- Tese literal. "O trabalhador rural, na condição de segurado especial, sujeito à contribuição obrigatória sobre a produção rural comercializada, somente faz jus à aposentadoria por tempo de serviço, se recolher contribuições facultativas."
- Órgão e leading case. STJ, Terceira Seção, 11/09/2002, DJ 19/09/2002.
- Fonte oficial. https://scon.stj.jus.br/SCON/sumstj/toc.jsp?tipo=sumula+ou+su
- Uso indevido corrigido em 03/10/2026: a base lhe atribuía a dispensa de indenização do tempo rural anterior a 11/1991 e a vedação de carência sem indenização. A súmula exige contribuições facultativas e nada diz sobre o tempo anterior a 1991.
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 387/STJ
- Situação. texto confirmado na fonte oficial; uso DIVERGENTE na base (relatório C2). Vigente.
- Tese literal. "É lícita a cumulação das indenizações de dano estético e dano moral."
- Órgão e leading case. STJ, Segunda Seção, 26/08/2009, DJe 01/09/2009.
- Fonte oficial. https://scon.stj.jus.br/SCON/sumstj/toc.jsp?tipo=sumula+ou+su
- Uso indevido corrigido em 03/10/2026: a base lhe atribuía a cumulação de danos morais e materiais, que é matéria da Súmula 37/STJ.
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 206/STJ
- Situação. texto confirmado na fonte oficial; uso DIVERGENTE na base (relatório C2). Vigente.
- Tese literal. "A existência de vara privativa, instituída por lei estadual, não altera a competência territorial resultante das leis de processo."
- Órgão e leading case. STJ, Corte Especial, 01/04/1998, DJ 16/04/1998.
- Fonte oficial. https://scon.stj.jus.br/SCON/sumstj/toc.jsp?tipo=sumula+ou+su
- Uso indevido corrigido em 03/10/2026: a base a citava para a competência do local do benefício.
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 326/STJ
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C2). Vigente.
- Tese literal. "Na ação de indenização por dano moral, a condenação em montante inferior ao postulado na inicial não implica sucumbência recíproca."
- Órgão e leading case. STJ, Corte Especial, 22/05/2006, DJ 07/06/2006.
- Fonte oficial. https://scon.stj.jus.br/SCON/sumstj/toc.jsp?tipo=sumula+ou+su
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 345/STJ
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C2). Vigente. Restrita à execução individual de sentença proferida em ação coletiva.
- Tese literal. "São devidos honorários advocatícios pela Fazenda Pública nas execuções individuais de sentença proferida em ações coletivas, ainda que não embargadas."
- Órgão e leading case. STJ, Corte Especial, 07/11/2007, DJ 28/11/2007.
- Fonte oficial. https://scon.stj.jus.br/SCON/sumstj/toc.jsp?tipo=sumula+ou+su
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 376/STJ
- Situação. texto confirmado na fonte oficial; uso DIVERGENTE na base (relatório C2). Vigente.
- Tese literal. "Compete a turma recursal processar e julgar o mandado de segurança contra ato de juizado especial."
- Órgão e leading case. STJ, Corte Especial, 18/03/2009, DJe 30/03/2009.
- Fonte oficial. https://scon.stj.jus.br/SCON/sumstj/toc.jsp?tipo=sumula+ou+su
- Uso indevido corrigido em 03/10/2026: a base a citava para alçada, para a competência da Justiça Federal ou do JEF em demandas previdenciárias e para o foro do domicílio.
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 557/STJ
- Situação. texto confirmado na fonte oficial; uso DIVERGENTE na base (relatório C2). Vigente.
- Tese literal. "A renda mensal inicial (RMI) alusiva ao benefício de aposentadoria por invalidez precedido de auxílio-doença será apurada na forma do art. 36, § 7º, do Decreto n. 3.048/1999, observando-se, porém, os critérios previstos no art. 29, § 5º, da Lei n. 8.213/1991, quando intercalados períodos de afastamento e de atividade laboral."
- Órgão e leading case. STJ, Primeira Seção, 09/12/2015, DJe 15/12/2015.
- Fonte oficial. https://scon.stj.jus.br/SCON/sumstj/toc.jsp?tipo=sumula+ou+su
- Uso indevido corrigido em 03/10/2026: a base a citava para a revisão pelo teto, matéria do Tema 76/STF.
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 628/STJ
- Situação. texto confirmado na fonte oficial; uso DIVERGENTE na base (relatório C2). Vigente.
- Tese literal. "A teoria da encampação é aplicada no mandado de segurança quando presentes, cumulativamente, os seguintes requisitos: a) existência de vínculo hierárquico entre a autoridade que prestou informações e a que ordenou a prática do ato impugnado; b) manifestação a respeito do mérito nas informações prestadas; e c) ausência de modificação de competência estabelecida na Constituição Federal."
- Órgão e leading case. STJ, Primeira Seção, 12/12/2018, DJe 17/12/2018.
- Fonte oficial. https://scon.stj.jus.br/SCON/sumstj/toc.jsp?tipo=sumula+ou+su
- Uso indevido corrigido em 03/10/2026: a base a citava para arquivamento de processo administrativo.
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 362/STJ
- Situação. texto confirmado na fonte oficial; uso DIVERGENTE na base (relatório C2). Vigente.
- Tese literal. "A correção monetária do valor da indenização do dano moral incide desde a data do arbitramento."
- Órgão e leading case. STJ, Corte Especial, 15/10/2008, DJe 03/11/2008.
- Fonte oficial. https://scon.stj.jus.br/SCON/sumstj/toc.jsp?tipo=sumula+ou+su
- Uso indevido corrigido em 03/10/2026: a base a citava para juros sobre honorários.
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 378/STJ
- Situação. texto confirmado na fonte oficial; uso DIVERGENTE na base (relatório C2). Vigente. Súmula de servidor público civil, sem relação com matéria acidentária.
- Tese literal. "Reconhecido o desvio de função, o servidor faz jus às diferenças salariais decorrentes."
- Órgão e leading case. STJ, Terceira Seção, 22/04/2009, DJe 05/05/2009.
- Fonte oficial. https://scon.stj.jus.br/SCON/sumstj/toc.jsp?tipo=sumula+ou+su
- Uso indevido corrigido em 03/10/2026: a base a citava em matéria acidentária (base-incapacidade-acidentaria-b92), onde hoje consta o NTEP (art. 21-A da Lei 8.213/91).
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### TEMA 1352/STJ
- Situação. texto confirmado na fonte oficial; uso DIVERGENTE na base (relatório V4). Tema AFETADO, sem tese firmada, afetação em 09/06/2025. A suspensão alcança só recursos especiais e agravos em recurso especial.
- Tese literal. Não há tese firmada. Questão, segundo o relatório V4: se a prorrogação do período de graça por mais de 120 contribuições pode ser reutilizada.
- Órgão e leading case. STJ, Primeira Seção, Rel. Min. Paulo Sérgio Domingues, REsp 2.189.004/SP e REsp 2.188.858/SP, entre outros.
- Fonte oficial. https://processo.stj.jus.br/repetitivos/temas_repetitivos/pesquisa.jsp?novaConsulta=true&tipo_pesquisa=T&cod_tema_inicial=1352&cod_tema_final=1352
- Uso indevido corrigido em 03/10/2026: a base o citava como tese sobre carência no reingresso.
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### TEMA 995/STJ
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório V4). Trânsito em julgado. Não confundir com o Tema 955/STJ (previdência complementar).
- Tese literal. Não transcrita no relatório V4, que traz só esta síntese: reafirmação da DER até a entrega da prestação jurisdicional nas instâncias ordinárias, nos termos dos arts. 493 e 933 do CPC, observada a causa de pedir. Copiar a redação literal da fonte antes de citar em peça.
- Órgão e leading case. STJ, Primeira Seção, REsp 1.727.063/SP, REsp 1.727.064/SP e REsp 1.727.069/SP, Rel. Min. Mauro Campbell Marques, acórdão publicado em 02/12/2019. O acórdão dos embargos do INSS não foi lido.
- Fonte oficial. https://processo.stj.jus.br/repetitivos/temas_repetitivos/pesquisa.jsp?novaConsulta=true&tipo_pesquisa=T&cod_tema_inicial=995&cod_tema_final=995
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 45/TNU
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C3).
- Tese literal. "Incide correção monetária sobre o salário-maternidade desde a época do parto, independentemente da data do requerimento administrativo"
- Órgão e leading case. TNU, DOU 14/12/2011.
- Fonte oficial. https://www.cjf.jus.br/phpdoc/virtus/listaSumulas.php
- Uso indevido corrigido em 03/10/2026: a base a citava em matéria de pessoa com deficiência e de LC 142/2013.
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 75/TNU
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C3).
- Tese literal. Não transcrita no relatório C3, que traz só esta síntese: a CTPS sem defeito formal tem presunção relativa de veracidade e prova tempo de serviço, ainda que o vínculo não conste do CNIS. Copiar a redação literal da fonte antes de citar em peça.
- Órgão e leading case. TNU, DOU 13/06/2013.
- Fonte oficial. https://www.cjf.jus.br/phpdoc/virtus/listaSumulas.php
- Uso indevido corrigido em 03/10/2026: a base lhe atribuía presunção de recolhimento das contribuições.
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 77/TNU
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C3).
- Tese literal. "O julgador não é obrigado a analisar as condições pessoais e sociais quando não reconhecer a incapacidade do requerente para a sua atividade habitual"
- Órgão e leading case. TNU, DOU 06/09/2013.
- Fonte oficial. https://www.cjf.jus.br/phpdoc/virtus/listaSumulas.php
- Uso indevido corrigido em 03/10/2026: a base lhe atribuía a regra de que o INSS não pode desconsiderar a perícia judicial.
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 79/TNU
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C3).
- Tese literal. Não transcrita no relatório C3, que traz só esta síntese: as condições socioeconômicas do requerente do benefício assistencial provam-se por laudo de assistente social, por auto de constatação ou, inviabilizados estes, por prova testemunhal. Copiar a redação literal da fonte antes de citar em peça.
- Órgão e leading case. TNU, data não registrada no relatório C3.
- Fonte oficial. https://www.cjf.jus.br/phpdoc/virtus/listaSumulas.php
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 80/TNU
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C3). A glosa "vedando indeferimento por perícia médica isolada", que aparece na base, não consta do enunciado.
- Tese literal. Não transcrita no relatório C3, que traz só esta síntese: após a Lei 12.470/2011, o BPC exige avaliação social ou outras providências aptas a revelar a condição vivida no meio social. Copiar a redação literal da fonte antes de citar em peça.
- Órgão e leading case. TNU, DOU 24/04/2015.
- Fonte oficial. https://www.cjf.jus.br/phpdoc/virtus/listaSumulas.php
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 52/TNU
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C3).
- Tese literal. Não transcrita no relatório C3, que traz só esta síntese: para a pensão por morte, é incabível regularizar contribuições de contribuinte individual após o óbito, salvo as arrecadadas por empresa tomadora de serviços. Copiar a redação literal da fonte antes de citar em peça.
- Órgão e leading case. TNU, DOU 18/04/2012.
- Fonte oficial. https://www.cjf.jus.br/phpdoc/virtus/listaSumulas.php
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 14/TNU
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C3).
- Tese literal. "Para a concessão de aposentadoria rural por idade, não se exige que o início de prova material corresponda a todo o período equivalente à carência do benefício"
- Órgão e leading case. TNU, DJ 24/05/2004.
- Fonte oficial. https://www.cjf.jus.br/phpdoc/virtus/listaSumulas.php
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 49/TNU
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C3).
- Tese literal. Não transcrita no relatório C3, que traz só esta síntese: para reconhecer condição especial de trabalho antes de 29/04/1995, a exposição a agentes nocivos não precisa ocorrer de forma permanente. Copiar a redação literal da fonte antes de citar em peça.
- Órgão e leading case. TNU, DOU 15/03/2012.
- Fonte oficial. https://www.cjf.jus.br/phpdoc/virtus/listaSumulas.php
- Uso indevido corrigido em 03/10/2026: a base a citava para a periculosidade do motociclista (NR-16, Anexo V), fora do período anterior a 29/04/1995.
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 30/TNU
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C3).
- Tese literal. Não transcrita no relatório C3, que traz só esta síntese: imóvel superior ao módulo rural não afasta, por si só, a qualificação de segurado especial, se provada a exploração em regime de economia familiar. Copiar a redação literal da fonte antes de citar em peça.
- Órgão e leading case. TNU, DJ 13/02/2006.
- Fonte oficial. https://www.cjf.jus.br/phpdoc/virtus/listaSumulas.php
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 53/TNU
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C3).
- Tese literal. Não transcrita no relatório C3, que traz só esta síntese: não há direito a auxílio-doença ou a aposentadoria por invalidez quando a incapacidade é preexistente ao reingresso no RGPS. Copiar a redação literal da fonte antes de citar em peça.
- Órgão e leading case. TNU, DOU 07/05/2012.
- Fonte oficial. https://www.cjf.jus.br/phpdoc/virtus/listaSumulas.php
- Uso indevido corrigido em 03/10/2026: a base a citava para recesso forense.
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### SUMULA 34/TNU
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C3).
- Tese literal. Trecho, como transcrito no relatório C3, "o início de prova material deve ser contemporâneo à época dos fatos a provar", no tempo de labor rural. Copiar a redação literal integral da fonte antes de citar em peça.
- Órgão e leading case. TNU, DJ 04/08/2006.
- Fonte oficial. https://www.cjf.jus.br/phpdoc/virtus/listaSumulas.php
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### ENUNCIADO 24/FONAJEF
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C3). Lista completa do CJF (arquivo de 17/02/2016); revisões posteriores a 2016 não conferidas.
- Tese literal. "Reconhecida a incompetência do Juizado Especial Federal, é cabível a extinção do processo, sem julgamento de mérito" (nova redação, V FONAJEF).
- Órgão e leading case. FONAJEF, nova redação aprovada no V FONAJEF.
- Fonte oficial. https://www.cjf.jus.br/cjf/corregedoria-da-justica-federal/corregedoria-geral-da-justica-federal/enunciados-fonajef/lista-completa-dos-enunciados-do-fonajef.pdf
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### ENUNCIADO 44/FONAJEF
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C3). Lista completa do CJF (arquivo de 17/02/2016); revisões posteriores a 2016 não conferidas.
- Tese literal. "Não cabe ação rescisória no Juizado Especial Federal". O enunciado acrescenta que o art. 59 da Lei 9.099/95 se aplica também aos JEFs (síntese do relatório C3).
- Órgão e leading case. FONAJEF. Ano de aprovação não registrado no arquivo.
- Fonte oficial. https://www.cjf.jus.br/cjf/corregedoria-da-justica-federal/corregedoria-geral-da-justica-federal/enunciados-fonajef/lista-completa-dos-enunciados-do-fonajef.pdf
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### ENUNCIADO 71/FONAJEF
- Situação. CONFIRMADO_FONTE_OFICIAL (relatório C3). Lista completa do CJF (arquivo de 17/02/2016); revisões posteriores a 2016 não conferidas.
- Tese literal. Não transcrita no relatório C3, que traz só esta síntese: na execução, a parte autora deve ser instada a renunciar ao valor excedente à alçada do JEF para receber por RPV, sem aproveitar a renúncia inicial feita para definir a competência. Copiar a redação literal da fonte antes de citar em peça.
- Órgão e leading case. FONAJEF.
- Fonte oficial. https://www.cjf.jus.br/cjf/corregedoria-da-justica-federal/corregedoria-geral-da-justica-federal/enunciados-fonajef/lista-completa-dos-enunciados-do-fonajef.pdf
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### ENUNCIADO 91/FONAJEF
- Situação. texto confirmado na fonte oficial; uso DIVERGENTE na base (relatório C3). Lista completa do CJF (arquivo de 17/02/2016); revisões posteriores a 2016 não conferidas. Tese adversa, invocável pelo INSS contra perícia complexa ou onerosa no JEF.
- Tese literal. "Os Juizados Especiais Federais são incompetentes para julgar causas que demandem perícias complexas ou onerosas que não se enquadrem no conceito de exame técnico"
- Órgão e leading case. FONAJEF.
- Fonte oficial. https://www.cjf.jus.br/cjf/corregedoria-da-justica-federal/corregedoria-geral-da-justica-federal/enunciados-fonajef/lista-completa-dos-enunciados-do-fonajef.pdf
- Uso indevido corrigido em 03/10/2026: a base o lia como autorização da prova técnica simplificada. O amparo dessa prova é o Enunciado 225/FONAJEF, hoje só em fonte secundária.
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### ENUNCIADO 95/FONAJEF
- Situação. texto confirmado na fonte oficial; uso DIVERGENTE na base (relatório C3). Lista completa do CJF (arquivo de 17/02/2016); revisões posteriores a 2016 não conferidas.
- Tese literal. "Para a propositura de ação relativa a expurgos inflacionários sobre saldos de poupança deverá a parte autora providenciar documento que mencione o número da conta bancária"
- Órgão e leading case. FONAJEF.
- Fonte oficial. https://www.cjf.jus.br/cjf/corregedoria-da-justica-federal/corregedoria-geral-da-justica-federal/enunciados-fonajef/lista-completa-dos-enunciados-do-fonajef.pdf
- Uso indevido corrigido em 03/10/2026: a base o lia como regra de prova nova em recurso.
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

### ENUNCIADO 63/FONAJEF
- Situação. texto confirmado na fonte oficial; uso DIVERGENTE na base (relatório C3). Lista completa do CJF (arquivo de 17/02/2016); revisões posteriores a 2016 não conferidas.
- Tese literal. "Cabe multa ao ente público pelo atraso ou não cumprimento de decisões judiciais com base no artigo 461 do CPC"
- Órgão e leading case. FONAJEF.
- Fonte oficial. https://www.cjf.jus.br/cjf/corregedoria-da-justica-federal/corregedoria-geral-da-justica-federal/enunciados-fonajef/lista-completa-dos-enunciados-do-fonajef.pdf
- Uso indevido corrigido em 03/10/2026: a base o usava para admitir ação rescisória no JEF, que o Enunciado 44/FONAJEF veda.
- Conferido em. 03/10/2026 (auditoria 03/10/2026)

Fonte secundária, não conta como conferido (auditoria 03/10/2026). Ficam sem título ### para que o script não os registre como conferidos. O texto foi lido fora do portal oficial e precisa ser confirmado na fonte oficial antes de citar em peça.
- ENUNCIADO 225/FONAJEF. Situação. PROVAVEL_FONTE_SECUNDARIA (relatório C3). Não lido em portal oficial, porque a lista do CJF só vai até o Enunciado 110. Texto lido na página da AJUFE, que organiza o FONAJEF. Confirmar na fonte oficial antes de citar em peça. Tese literal. Texto da página da AJUFE, "A prova técnica simplificada é legítima para análise de pedidos de benefícios previdenciários e assistenciais". Órgão e leading case. XVIII FONAJEF. Fonte secundária. https://www.ajufe.org.br/foruns/fonajef/enunciados-fonajef/enunciados-xviii-fonajef/enunciado-n-225. Lido em 03/10/2026.
- SUMULA 160/TFR. Situação. PROVAVEL_FONTE_SECUNDARIA (relatório C3). Texto lido só na LegJur, que declara pendente a conferência com a fonte oficial. Confirmar na fonte oficial antes de citar em peça. Tese literal. Trecho, como transcrito no relatório C3, "A suspeita de fraude ... não enseja, de plano, a sua suspensão ou cancelamento, mas dependerá de apuração em procedimento administrativo". Órgão e leading case. TFR. Data não registrada no relatório C3. Fonte secundária. https://www.legjur.com/sumula/tfr/160. Uso indevido corrigido em 03/10/2026: a base dizia que a súmula admite dano moral. Ela exige apuração em procedimento administrativo antes da suspensão ou do cancelamento por suspeita de fraude. Lido em 03/10/2026.
- SUMULA 260/TFR. Situação. PROVAVEL_FONTE_SECUNDARIA (relatório C3). Texto lido só na LegJur, que declara pendente a conferência com a fonte oficial. Confirmar na fonte oficial antes de citar em peça. A expressão "anteriores à CF/88", que aparece na base, é glosa e não texto da súmula. Tese literal. Trecho, como transcrito no relatório C3, "No primeiro reajuste do benefício previdenciário deve-se aplicar o índice integral do aumento verificado, independentemente do mês da concessão ...". Órgão e leading case. TFR. Data não registrada no relatório C3. Fonte secundária. https://www.legjur.com/sumula/tfr/260. Lido em 03/10/2026.
- SUMULA 71/TFR. Situação. PROVAVEL_FONTE_SECUNDARIA (relatório C3). Texto lido só na LegJur, que declara pendente a conferência com a fonte oficial. Confirmar na fonte oficial antes de citar em peça. A LegJur a lista como em vigor; a revogação pela Súmula 148/STJ, afirmada na base, não foi verificada. Tese literal. "A correção monetária incide sobre as prestações de benefícios previdenciários em atraso, observado o critério do salário mínimo vigente na época da liquidação da obrigação". Órgão e leading case. TFR. Data não registrada no relatório C3. Fonte secundária. https://www.legjur.com/sumula/tfr/71. Lido em 03/10/2026.
- SUMULA 45/TFR. Situação. PROVAVEL_FONTE_SECUNDARIA (relatório C3). Texto lido só na LegJur, que declara pendente a conferência com a fonte oficial. Confirmar na fonte oficial antes de citar em peça. Tese literal. "As multas fiscais, sejam moratórias ou punitivas, estão sujeitas à correção monetária". Órgão e leading case. TFR. Data não registrada no relatório C3. Fonte secundária. https://www.legjur.com/sumula/tfr/45. Uso indevido corrigido em 03/10/2026: a base a citava para o cômputo do tempo de serviço militar. Lido em 03/10/2026.

Homônimos do STJ a evitar (auditoria 03/10/2026). Ficam sem título ### para que o script não os registre como conferidos. Cada número existe no STJ, mas trata de outro assunto e não serve como precedente previdenciário.
- TEMA 394/STJ. Depósito judicial e IRPJ, matéria tributária (REsp 1.168.038/SP).
- TEMA 96/STJ. Constituição do crédito tributário pela declaração do contribuinte (REsp 1.101.728/SP).
- TEMA 415/STJ. Entrega de carnês de IPTU e privilégio postal (REsp 1.141.300/MG).
- TEMA 339/STJ. Liberação de veículo retido, matéria da Súmula 510/STJ.
- TEMA 1340/STJ. Home care em plano de saúde, afetado e sem tese.
- TEMA 1009/STJ. Devolução de valores recebidos por servidor público por erro administrativo (REsp 1.769.306/AL); no RGPS, a matéria é do Tema 979/STJ.
- TEMA 1036/STJ. Apreensão de instrumento de infração ambiental (Lei 9.605/1998, art. 25, § 4º; REsp 1.814.945/CE).

Homônimos do STF a evitar (auditoria 03/10/2026). Ficam sem título ### pela mesma razão. Cada número foi lido na fonte oficial em 03/10/2026 (relatórios C1A e C1B), classificado DIVERGENTE no uso da base, e trata do assunto indicado, não do que a base lhe atribuía.
- TEMA 20/STF. RE 565.160, mérito em 29/03/2017, trânsito em julgado em 31/08/2017. Assunto real, alcance de folha de salários: "A contribuição social a cargo do empregador incide sobre ganhos habituais do empregado, quer anteriores ou posteriores à Emenda Constitucional nº 20/1998." Não usar para a incidência da contribuição sobre o 13º salário, que é da Súmula 688/STF. Fonte oficial, https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=20.
- TEMA 1054/STF. RE 1.182.189, Rel. Min. Edson Fachin, mérito em 25/04/2023 (Plenário Virtual), trânsito em julgado em 05/08/2023. Assunto real: "O Conselho Federal e os Conselhos Seccionais da Ordem dos Advogados do Brasil não estão obrigados a prestar contas ao Tribunal de Contas da União nem a qualquer outra entidade externa." Não usar para tempo no RPPS e direito adquirido. Fonte oficial, https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=1054.
- TEMA 161/STF. RE 598.099/MS, Rel. Min. Gilmar Mendes, mérito em 10/08/2011, trânsito em julgado em 01/03/2013. Assunto real: "O candidato aprovado em concurso público dentro do número de vagas previsto no edital possui direito subjetivo à nomeação." Não usar para licença adotante ou salário-maternidade, matéria do Tema 782/STF (RE 778.889). Fonte oficial, https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=161.
- ADI 4827. Lei 7.372/2012 de Alagoas, efetivo da Polícia Militar; procedente em parte em 27/09/2019; Rel. Min. Alexandre de Moraes. Não usar para aposentadoria especial; a base a citava em duplicidade com o Tema 709/STF. Fonte oficial, https://portal.stf.jus.br/processos/detalhe.asp?incidente=4281129.
- ADI 5751. Taxa judiciária de Sergipe, ação do Conselho Federal da OAB; improcedente em 21/06/2021; Rel. Min. Luís Roberto Barroso. Tese, em síntese do relatório C1B: o valor da causa pode ser base de cálculo se a lei fixar limites máximos. Não usar para BPC. Fonte oficial, https://portal.stf.jus.br/processos/detalhe.asp?incidente=5231964.
- ADI 5760. Art. 16-A da Lei 7.573/1986, que excluía os marítimos embarcados do cálculo da cota de pessoas com deficiência do art. 93 da Lei 8.213/91; procedente, por unanimidade, em 13/09/2019; Rel. Min. Alexandre de Moraes. Não usar para aposentadoria da pessoa com deficiência. Fonte oficial, https://portal.stf.jus.br/processos/detalhe.asp?incidente=5247635.
- ADI 5794. Facultatividade da contribuição sindical instituída pela Reforma Trabalhista, declarada constitucional; ações julgadas improcedentes em 29/06/2018; Rel. Min. Edson Fachin, redator Min. Luiz Fux. Não usar com o sentido oposto ao julgado, que a base lhe dava em base-rubricas-pagamento-inss. Fonte oficial, https://portal.stf.jus.br/processos/detalhe.asp?incidente=5288954.
- ADI 6038. Lei 7.800/2016 de Alagoas, sobre ensino fundamental e médio, declarada inconstitucional por inteiro; procedente por maioria em 25/08/2020; Rel. Min. Luís Roberto Barroso. Não usar para duração do processo. Fonte oficial, https://portal.stf.jus.br/processos/detalhe.asp?incidente=5576085.
- ADI 6387. MP 954/2020, dados de telefonia ao IBGE; cautelar referendada em 07/05/2020 e ação prejudicada em 19/11/2020; Rel. Min. Rosa Weber. Não usar para LGPD no setor público. Fonte oficial, https://portal.stf.jus.br/processos/detalhe.asp?incidente=5895165.
- ADI 7765. Arts. 43 e 44 da Lei 14.973/2024, informações sobre benefícios fiscais, ação da CNI; improcedente em 20/10/2025, trânsito em julgado em 30/10/2025; Rel. Min. Dias Toffoli. Não usar para o Decreto 12.534/2025. Fonte oficial, https://portal.stf.jus.br/processos/detalhe.asp?incidente=7116040.
