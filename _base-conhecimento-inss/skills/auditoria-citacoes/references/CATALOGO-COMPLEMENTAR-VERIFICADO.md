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
- Situação. vigente (tese fixada em 29/10/2020 e ajustada em embargos de declaração em 20/05/2021)
- Tese literal. "Ao autor que deseje litigar no âmbito de juizado especial federal cível, é lícito renunciar, de modo expresso e para fins de atribuição de valor à causa, ao montante que exceda os 60 salários mínimos previstos no artigo 3º, caput, da Lei 10.259/2001, aí incluídas, sendo o caso, até 12 prestações vincendas, nos termos do artigo 3º, § 2º, da referida lei, combinado com o artigo 292, §§ 1º e 2º, do Código de Processo Civil de 2015."
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
- Situação. vigente, RESTRITIVA, mitigada pela Lei 11.301/2006 e pela ADI 3772
- Tese literal. "Para efeito de aposentadoria especial de professores, não se computa o tempo de serviço prestado fora da sala de aula."
- Órgão e leading case. STF, DJ 11/12/2003.
- Fonte oficial. https://portal.stf.jus.br/jurisprudencia/sumariosumulas.asp?base=30&sumula=1498
- Conferido em. 25/07/2026

### ADI 3772
- Situação. julgada, procedente em parte com interpretação conforme, transitada em julgado
- Tese literal. "As funções de direção, coordenação e assessoramento pedagógico integram a carreira do magistério, desde que exercidos, em estabelecimentos de ensino básico, por professores de carreira, excluídos os especialistas em educação, fazendo jus aqueles que as desempenham ao regime especial de aposentadoria estabelecido nos arts. 40, § 5º, e 201, § 8º, da Constituição Federal."
- Órgão e leading case. STF, Plenário, Rel. Min. Ayres Britto, Red. p/ acórdão Min. Ricardo Lewandowski, j. 29/10/2008, DJE 27/03/2009.
- Fonte oficial. https://portal.stf.jus.br/processos/detalhe.asp?incidente=2541930
- Conferido em. 25/07/2026

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
- Situação. trânsito em julgado em 03/03/2020. RE 870.947, Rel. Min. Luiz Fux (juros e correção da Fazenda, art. 1º-F da Lei 9.494/97).
- Fonte oficial. https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=810
- Conferido em. 25/07/2026

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
