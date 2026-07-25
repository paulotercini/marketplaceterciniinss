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
