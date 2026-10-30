---
name: base-juizo-catanduva
description: "Perfil decisório e linguagem do juízo federal de Catanduva/SP (1ª Vara Federal e 1ª Vara Gabinete JEF), extraídos de 78 sentenças e decisões do CRM em 16/10/2026. Use SEMPRE que a peça for dirigida à Subseção Judiciária de Catanduva (Monte Alto, Vista Alegre do Alto, Pirangi, Catanduva e região), e sempre que for preciso escrever como o juízo escreve, prever como o juízo decide, redigir inicial, réplica, manifestação sobre laudo pericial, embargos de declaração, impugnação de cálculo ou alegações no JEF ou na Vara de Catanduva, ou consultar os blocos-modelo literais do juízo sobre incapacidade, auxílio-acidente, BPC, pensão por morte, auxílio-reclusão, aposentadoria por idade, qualidade de segurado, carência, coisa julgada, tempo especial, ruído, agentes biológicos e químicos, EPI, PPP, LTCAT, reafirmação da DER, revisões, gratuidade, prescrição, interesse de agir, termo inicial, acordo, cumprimento e honorários. Alimenta o agente juiz-catanduva."
---

# Juízo federal de Catanduva

## Escopo e origem

Onda 179, 16/10/2026. O titular determinou que a peça dirigida a Catanduva traga o que o juízo escreveria, com as palavras, a sequência e os critérios que ele usa ao sentenciar. A skill reúne o resultado da leitura integral de **78 sentenças e decisões** do juízo guardadas no CRM (tabela `anexos`, origem PJe), sem duplicatas, e substitui a premissa da Onda 176, extraída de nove decisões.

O corpus tem 53 documentos do JEF e 25 da Vara. Os resultados são 26 improcedências, 14 embargos de declaração rejeitados, 9 acordos homologados, 9 procedências, 7 procedências parciais, 4 extinções e 6 decisões de instrução e de cumprimento. **Nenhuma tutela de urgência foi concedida.**

Os arquivos se leem nesta ordem.

1. Este `SKILL.md`, com o perfil, as regras de redação e a tabela de precedentes.
2. `references/BLOCOS-BENEFICIOS.md`, com os blocos-modelo literais e o raciocínio do juízo em incapacidade, auxílio-acidente, BPC, pensão por morte, auxílio-reclusão, idade, qualidade de segurado, carência, coisa julgada e ausência à perícia.
3. `references/BLOCOS-ESPECIAL-PROCESSO.md`, com os blocos de tempo especial, ruído, agentes biológicos e químicos, EPI, PPP e LTCAT, categoria profissional, tempo de contribuição, reafirmação da DER, revisões e as questões processuais, mais o esqueleto completo da sentença do JEF e da Vara e o vocabulário com contagem.
4. `references/DESFECHOS.md` e `references/desfechos.jsonl` (19/10/2026), com o desfecho de 262 processos de Catanduva: 254 tirados dos acórdãos das Turmas Recursais e do TRF3 que julgaram recurso contra sentença do juízo, de todos os advogados, e 8 sentenças do Drive. Para cada processo há a matéria, o resultado e o motivo da sentença e o que a instância de recurso fez com ela. Use a tabela para a taxa de cada resultado por matéria e o `.jsonl` para achar o caso parecido (busque por `materia` e por palavra do motivo).

## Quem escreve

O juízo não tem uma única voz. O corpus traz três modelos de texto, e a peça fala a linguagem comum aos três, que é a linguagem da unidade.

**Modelo A, do titular.** Sentenças da Vara e parte do JEF, em prosa longa e na primeira pessoa ("Saliento", "Penso", "Discordo do entendimento", "Na minha visão"). Repete o pedido na fundamentação, fixa a questão por "cabe saber se o autor tem, ou não, direito" e analisa o PPP período a período. Fecha com "Custas ex lege. PRI.".

**Modelo B, das juízas federais substitutas.** Texto numerado ("I – Relatório", "II – Fundamentação", "II.1"), histórico normativo em alíneas, temas transcritos e abertura do caso por "Com as premissas acima, passo à análise do caso concreto". Aplica o item III do Tema 1090/STJ e a reafirmação da DER, que o modelo A não aplicou nos casos lidos.

**Modelo C, da assessoria do JEF.** Embargos, acordos, extinções e cumprimento, em fórmulas curtas e assinatura "data da assinatura eletrônica".

O agente `juiz-catanduva` simula a unidade e os seus modelos, nunca uma pessoa. Nenhum arquivo desta skill nomeia magistrado ou servidor.

## As medidas do juízo e as do escritório

| Tipo de decisão | Parágrafos da fundamentação | Palavras por parágrafo |
|---|---|---|
| Acordo homologado | 1 a 4 | 25 a 30 |
| Incapacidade improcedente no JEF | 7 a 12 | 60 a 75 |
| Procedência no JEF | 9 a 25 | 70 a 90 |
| Embargos de declaração | 5 a 16 | 50 a 60 |
| Sentença da Vara em tempo especial | 22 a 55 | 30 a 120, com blocos acima de 300 |

A frase do juízo tem cerca de 40 palavras. A peça mantém a frase de 15 a 30 palavras e o parágrafo de 30 a 55, com teto de 65, porque essas medidas vêm das preferências do titular e prevalecem. O parágrafo de caso concreto do juízo, de 50 a 70 palavras, confirma o teto.

## O que a peça adota do juízo

A peça adota a linguagem da unidade em seis pontos.

1. **Vocabulário técnico.** enquadramento especial, caracterização especial, viés especial do período, tempo comum majorado, fatores de risco, agentes prejudiciais, superior à tolerância normativa, profissiografia estampada no formulário, formulário de PPP, metodologia, de modo habitual e permanente, acentuado risco de contaminação, capacidade laborativa, ostentava a qualidade de segurado, perda da qualidade de segurado, período de graça, data de início da incapacidade, prestação assistencial, apontado como instituidor, requerimento administrativo indeferido, mediante a reafirmação da DER, efeitos financeiros, DIP. O juízo ainda escreve "auxílio-doença" e "aposentadoria por invalidez". A peça usa a denominação vigente e acrescenta a antiga entre parênteses na primeira menção, como "auxílio por incapacidade temporária (auxílio-doença)".
2. **A pergunta do juízo.** A seção controvertida formula a questão como o juízo a formula ao delimitar a causa: "Cabe saber, assim, se a Parte Autora tem, ou não, direito à [prestação], o que depende do enquadramento especial dos períodos de [datas]". A resposta vem na mesma seção.
3. **A sequência do bloco-modelo.** A seção de direito segue a ordem do bloco-modelo da matéria (requisitos legais, regime de prova da época, prova exigida, caso concreto, soma ou conclusão), para que o juiz encontre cada requisito no lugar em que ele próprio o examina. Os blocos estão nos dois arquivos de referência.
4. **Os conectores da unidade.** Assim, Desta forma, Como visto, Por outro lado, Além disso, Daí, Ou seja, No ponto, No caso concreto, Por fim. O mesmo conector não se repete em parágrafos seguidos.
5. **A remissão normativa acessória.** Transcreve-se em bloco apenas o dispositivo que o INSS contestou ou que decide o requisito controvertido, no máximo um por seção, pela regra da lei na medida (Onda 182). O dispositivo acessório pode vir na forma do juízo, entre parênteses e com "v.", como "(v. art. 15, § 2.º, da Lei n.º 8.213/91)".
6. **O fecho com número.** O juízo conclui pela soma, por exemplo "passa o autor a somar, na DER, tempo de contribuição de [x]". A seção da peça fecha com o mesmo número, e o demonstrativo vai em anexo.

## O que a peça não adota

A peça não adota a primeira pessoa do julgador, as fórmulas de relatório ("em apertada síntese", "em cujo bojo", "Junta documentos"), a conclusão curta seguida de explicação ("Explico."), os advérbios e adjetivos de intensidade ("inconteste", "deveras", "Muito pelo contrário"), a doutrina e a Súmula 32 da TNU, que o juízo ainda cita, mas está cancelada. Esses itens continuam vedados pelo `ESTILO-MODELO.md` e pelas preferências do titular.

## Como o juízo decide

Os critérios abaixo se repetem no corpus. Cada um traz a frase do juízo e o que a peça precisa trazer. O detalhe por matéria está nos arquivos de referência.

1. **Interesse de agir.** Sem comprovante do indeferimento ou da DER, extingue. A peça junta o processo administrativo completo e limita o pedido ao que o INSS negou.
2. **Laudo pericial.** Acolhe o laudo por fórmula ("o laudo está muito bem fundamentado, e, assim, goza de inconteste credibilidade"; a perícia "equidistante dos interesses das partes" prevalece) e indefere quesito complementar "englobado nos quesitos já respondidos". A manifestação sobre o laudo pericial aponta vício formal, quesito não respondido ou contradição interna, com o trecho do laudo e o ID. O quesito complementar é novo. A divergência com relatório particular, sozinha, não altera o resultado.
3. **Incapacidade.** Confere a qualidade de segurado e a carência na DII fixada pelo perito, e não na DER. A peça demonstra os dois requisitos na DII provável e leva à perícia exames datados que permitam fixá-la. O pedido dos 25% exige quesito sobre a assistência permanente de terceiro.
4. **Qualidade de segurado.** Conta as contribuições uma a uma ("apenas 118 recolhimentos"), não conta o benefício intercalado para as 120 e exige, do contribuinte individual, prova positiva da cessação involuntária da atividade. CadÚnico e auxílio emergencial não bastaram.
5. **Prova testemunhal exclusiva.** Recusada em união estável, em tempo de serviço e em tempo de Prefeitura. A peça traz início de prova material contemporâneo.
6. **PPP e LTCAT.** "A prova do enquadramento especial das atividades laborais é procedida pela apresentação dos formulários de PPP". Erro do formulário se discute "entre o trabalhador e as empresas" na Justiça do Trabalho. Perícia técnica apenas com empresa inativa ou recusa documentada. O juízo deferiu ofício à empregadora para juntar o LTCAT, e a peça o requer já na inicial.
7. **Ruído.** Depois de 18/11/2003, exige NHO-01 ou NR-15 e nível normalizado. A menção apenas a "decibelímetro" foi recusada. O EPI não descaracteriza o ruído.
8. **Agentes biológicos e químicos.** Depois de 05/03/1997, o biológico exige "acentuado risco de contaminação" e contato direto, e o EPI anotado como eficaz o afasta. O químico exige contato habitual e permanente, e não eventual. A peça ataca o EPI por um dos itens do Tema 1090/STJ, com prova, na inicial, porque nos embargos o argumento foi rejeitado como rediscussão.
9. **Termo inicial.** Regra na DER. Documento ausente do processo administrativo desloca os efeitos para a citação, e o pedido de revisão fixa os efeitos da revisão. O juízo aplica essa lógica sem citar o Tema 1124/STJ. A prova vai ao INSS antes da ação.
10. **Gratuidade.** Na Vara, renda de cerca de R$ 4.000 no CNIS levou à revogação, com honorários de 10% sobre o valor da causa. A réplica que defende apenas "o padrão remuneratório" é censurada. A peça traz as despesas comprovadas, e o recurso eficaz é o agravo de instrumento.
11. **Embargos de declaração.** Rejeitados em todos os casos de inconformismo, como "caráter infringente, visando rediscutir o mérito da decisão". As correções vieram de erro material e de erro de fato documentado. Embargos apenas com o trecho da sentença ao lado do ponto omitido e o ID onde ele foi suscitado.
12. **Tutela e cumprimento.** A implantação ocorre após o trânsito, pela CEAB-DJ e pelo PREVJUD, e os cálculos vêm da Cecalc no JEF ou do INSS na Vara, com 5 dias úteis para impugnar. O pedido de tutela, quando o titular o decidir, traz fundamentação autônoma do perigo.
13. **Acordo.** Homologa nos termos da proposta. A cláusula de cálculo se lê antes de aceitar, porque a cláusula "que constam na Carta de Concessão" limitou uma revisão do Tema 1070/STJ.
14. **Revisão da vida toda.** Improcedente pelo Tema 1102/STF, com dispensa de honorários pela modulação.
15. **A data da sentença manda no precedente.** O juízo decide pelos temas julgados até a data em que sentencia. Pedido de suspensão nos autos não prova que o processo ficou suspenso. Sem a data, preveja pelos precedentes vigentes na última peça dos autos e dê a saída do tema novo como segunda leitura. No vigia, as sentenças lidas aplicaram o Tema 1031/STJ e enquadraram pela categoria (item 2.5.7) até 05/03/1997. O Tema 1209/STF [NÃO CONFIRMADO] só vale para a sentença posterior ao seu julgamento.
16. **Ruído depois de 18/11/2003: decide o que o PPP diz da técnica.** Se o PPP diz NHO-01, NR-15, dosimetria ou nível normalizado, o juízo reconhece ("metodologia que mede a exposição durante toda a jornada"). Se diz só "decibelímetro" ou medição pontual, nega. Quando o PPP está só em imagem, procure a técnica no que a inicial, a contestação e a réplica transcrevem dele; sem essa informação, dê as duas saídas. A recusa do INSS na via administrativa, sozinha, não prova falha de metodologia: numa sentença lida, o juízo reconheceu de 2003 a 2013 períodos que o INSS tinha recusado.
17. **Rediscussão do que se decidiu no cumprimento é coisa julgada, e não improcedência.** Na opção entre benefício judicial e administrativo (Tema 1018/STJ) já resolvida na execução, o juízo extinguiu pelo art. 485, V, e § 3º, do CPC, mesmo com pedido formalmente diverso ("não cabe rediscussão acerca do cumprimento de título executivo judicial já decidido de forma definitiva").
18. **Gratuidade no JEF não é previsível.** Com renda perto de R$ 4.000 e impugnação do INSS, uma sentença negou pelo critério de 40% do teto e outra concedeu. Dê as duas saídas e trate o ponto só como risco de preparo do recurso.
19. **O modelo B também escreve no JEF.** Restituição contra a União e incapacidade com subtítulos por tema e ementas transcritas vieram no modelo B. Não presuma o modelo A só porque o rito é o JEF.
20. **Pedido alternativo concedido sai "procedente".** Quando a inicial pede aposentadoria por incapacidade "ou" auxílio, e o juízo concede só o auxílio, o dispositivo diz "julgo procedente o pedido", e não "parcialmente procedente". O "parcialmente" fica para quando um pedido cumulado (outro período, outro benefício somado) é negado.

## Precedentes que o juízo cita

A conferência de 16/10/2026 não abriu as fontes oficiais, que estavam inacessíveis, e todos os itens seguem [NÃO CONFIRMADO] até a conferência no navegador pela `pesquisa-jurisprudencia-chrome`. A coluna "Situação" vem do catálogo `base-precedentes-catalogo-vinculantes`.

| Precedente | Uso pelo juízo | Situação no catálogo |
|---|---|---|
| Súmula 9 da TNU | EPI não descaracteriza o ruído | vigente |
| Súmula 32 da TNU | níveis de ruído | **cancelada**, não se cita |
| Súmula 68 da TNU | laudo extemporâneo | vigente |
| Súmula 87 da TNU | EPI antes de 03/12/1998 | vigente |
| Tema 174 da TNU | NHO-01 ou NR-15 e LTCAT | vigente, reforçado pelo Tema 317 da TNU |
| Tema 208 da TNU | responsável técnico do PPP | vigente, sem tese de representatividade de período |
| Tema 239 da TNU | desemprego do contribuinte individual | vigente |
| Tema 246 da TNU | DCB e prazo do benefício temporário | vigente |
| Tema 365 da TNU | benefício intercalado fora das 120 contribuições | vigente, **adverso** |
| Tema 862 do STJ | termo inicial do auxílio-acidente | vigente |
| Tema 1018 do STJ | opção pelo benefício mais vantajoso | vigente |
| Tema 1031 do STJ | vigilante | vigente |
| Tema 1070 do STJ | atividades concomitantes | vigente |
| Tema 1083 do STJ | ruído variável e NEN | vigente |
| Tema 1090 do STJ | EPI no PPP, ônus e dúvida | vigente |
| Tema 1125 do STF | benefício intercalado como carência | vigente, apenas carência |
| Tema 555 do STF | EPI e ruído | vigente |
| Tema 1102 do STF | revisão da vida toda | vigente, **adverso** |
| Tema 350 do STF | prévio requerimento | vigente |
| Enunciado 203 do FONAJEF | PPP na Justiça do Trabalho | **não localizado**, não se cita |
| Enunciado 52 dos JEFs da 3ª Região | gratuidade em 40% do teto | **não localizado**, não se cita |
| Res. CNJ 595/2024, art. 6º | prazo de cumprimento | o artigo delega o prazo ao comitê do art. 7º |
| Tema 1124 do STJ | prova apresentada apenas em juízo | vigente, não citado pelo juízo |

## Desfechos por matéria (262 processos)

A tabela completa está em `references/DESFECHOS.md`. Nas sentenças que chegaram ao recurso, houve 27 procedências, 62 parciais, 146 improcedências e 25 extinções. A amostra é só do que foi recorrido, então a improcedência pesa mais do que na pauta inteira. Mesmo assim, ela é o ponto de partida do juízo em quase todas as matérias.

| Matéria | Casos | Sentença mais comum | Reforma quando o autor recorre |
|---|---|---|---|
| Pensão por morte | 42 | improcedente (28) | 28% |
| Incapacidade | 41 | improcedente (24) | 31% |
| Tempo de contribuição | 40 | parcial (22) | 27% |
| Auxílio-acidente | 34 | improcedente (24) | 8% |
| Tempo especial | 32 | parcial (15) ou improcedente (15), nunca procedente | **71%** |
| Idade rural ou híbrida | 22 | improcedente (17) | 33% |
| BPC da pessoa com deficiência | 21 | improcedente (12) | 36% |
| Revisão | 19 | extinção (7) | 54% |

O que os recursos ensinam sobre o juízo:

1. **Tempo especial.** O juízo é mais restritivo do que as Turmas e o TRF3. As reformas reconhecem a categoria até 28/04/1995, o agente biológico com contato com pacientes, o agente cancerígeno por avaliação qualitativa e a lavanderia hospitalar. As Turmas mantêm a negativa quando o PPP falha no Tema 208/TNU, quando o ruído fica abaixo do limite e quando o hidrocarboneto é genérico. Preveja a sentença restritiva e diga, em linha própria, o que a Turma tende a reverter.
2. **Pensão por morte.** O juízo nega a união estável sem prova material robusta. A Turma reforma com início de prova contemporâneo e testemunhas coesas: termo de internação que qualifica como cônjuge, plano de saúde ou seguro em comum, conta no endereço comum, declaração de IR.
3. **Rural e híbrida.** A Turma reverte com documento em nome do pai, do marido ou do sogro em regime de economia familiar, e com o vínculo rural em CTPS anterior a 1991 contando como carência (Tema 1007/STJ).
4. **Incapacidade.** O laudo decide em primeiro grau. A Turma reforma pelas condições pessoais (idade, analfabetismo, trabalho braçal), quando a reabilitação é inviável, e pela isenção de carência por doença grave.
5. **Falta de prova vira extinção, e não improcedência, no recurso.** Na prova rural insuficiente (Tema 629/STJ) e na ausência à perícia do JEF (art. 51, I, da Lei 9.099/95), a Turma converte a improcedência em extinção sem mérito, o que permite ajuizar de novo.
6. **BPC.** Com impugnação específica da miserabilidade pelo INSS, a falta do estudo social anula a sentença (Tema 187/TNU).
7. **Auxílio-acidente.** A sentença quase nunca muda. O que muda é a DIB, que vai para o dia seguinte à cessação do auxílio-doença quando o perito situa a sequela no acidente.

## Prova cega de 18/10/2026

O agente `juiz-catanduva` recebeu os autos de 15 processos já sentenciados (3 procedentes, 4 parcialmente procedentes, 6 improcedentes e 2 extintos), só com as peças anteriores à sentença. Em cada um, leu uma cópia desta skill sem os trechos tirados daquele processo, e a previsão foi comparada com a sentença real.

| Medida | Acerto |
|---|---|
| Resultado (procedente, parcial, improcedente, extinção) | 13 de 15 (87%) |
| Termo inicial, onde houve condenação | 5 de 5 |
| Períodos reconhecidos, nas parciais de tempo especial | 3 de 4 |

Os dois erros de resultado viraram os critérios 15 e 17, e o erro de período virou o critério 16. A limpeza apagou o id do processo nas linhas que citavam outros documentos e deixou a descrição, então a prova foi quase cega. Com a skill inteira, sem a limpeza, o acerto de resultado foi de 14 de 15.

**Rodada 2 (19/10/2026), depois dos 262 desfechos.** Mesmos 15 casos, com limpeza mais rigorosa: saíram as linhas inteiras que descreviam o caso, os critérios 15 a 19 (nascidos destes casos) e o próprio processo da tabela de desfechos.

| Medida | Rodada 1 | Rodada 2 |
|---|---|---|
| Resultado | 13 de 15 | 12 de 15 (80%) |
| Termo inicial | 5 de 5 | 4 de 5 |
| Períodos, nas parciais de tempo especial | 3 de 4 | 2 de 4 |

A queda vem da limpeza mais dura, e não dos dados novos. Dois dos três erros (vigia e Tema 1018) são exatamente os que os critérios 15 e 17 corrigem, e eles estavam fora da prova. O terceiro virou o critério 20. Os dois erros de período mostraram que o critério 16 estava torto nos dois sentidos e foi reescrito. O ganho dos desfechos apareceu fora do placar: todos os 15 pareceres passaram a citar casos parecidos com o resultado no recurso, e os de tempo especial anteciparam a reforma pela Turma. Com 15 casos, um acerto a mais ou a menos é ruído. A medida que vale daqui em diante é a prospectiva.

Para a próxima prova, guarde 10 sentenças novas fora do corpus antes de qualquer atualização desta skill. Melhor ainda, rode o agente antes da sentença, registre a previsão no andamento do caso e confira quando ela sair.

## Repetir o estudo

O corpus se reconstrói no Supabase do CRM com a consulta abaixo, e o estudo se repete a cada semestre, com a contagem por modelo e por resultado.

```sql
with c as (select distinct on (md5(texto)) id, nome, texto from anexos
  where origem='pje' and (nome ilike 'Senten%' or (nome ilike 'Decis%' and nome not ilike '%Monocr%'))
  and substr(texto,1,800) ilike '%Catanduva%' and length(texto)>600)
select id, nome, length(texto) from c order by id;
```

## MCPs da casa

Pesquisa obrigatória (Onda 169). Nenhuma norma, súmula, tema, enunciado ou acórdão citado nesta skill entra em peça, parecer ou orientação sem passar antes pelo MCP próprio, e nenhum MCP autoriza sozinho a marca [CONFERIDO]. O achado nasce [NÃO CONFIRMADO] e só sobe a [CONFERIDO] depois de lido na fonte oficial, na forma de `pesquisa-jurisprudencia-chrome`.

Legislação. O dispositivo se transcreve do MCP `normas`, por `obter_artigo` no identificador da norma e no número do artigo (exemplo, `lei-8213-1991` e `57`), lendo o campo `texto` e a última ocorrência de cada parágrafo, e a redação de outra época se lê por `redacao_na_data`. A IN 128/2022 se confere também pelo `norma_inss` do MCP `iurisprudencia`, que versiona parágrafo a parágrafo e já traz alterações ausentes da base local, como as da IN PRES/INSS 212/2026. Norma ausente das duas bases exige a fonte oficial a cada uso.

Jurisprudência. Tema, súmula e enunciado se conferem primeiro no catálogo `base-precedentes-catalogo-vinculantes` e no catálogo complementar da `auditoria-citacoes`, com atenção ao homônimo de outra corte. Enunciado do CRPS se lê em `enunciados_pleno_inss_crps`, na redação vigente e nas anteriores. Acórdão da TNU se localiza em `buscar_acordaos_tnu`. Acórdão do TRF3 e das Turmas Recursais se localiza em `buscar_acordaos_trf3`, na base local, e em `buscar_acordaos_trf3_jef`, consulta ao vivo. Ação civil pública que o INSS cumpre se lê no `norma_inss`, Portaria Conjunta 94/2024.

Acervo do escritório. O que o escritório já sustentou se lê no MCP `acervo`, por `buscar_tese_acervo`, `obter_trecho_acervo` e `precedentes_do_acervo`, cujo campo `corte` evita o homônimo. Detalhe em `base-acervo-escritorio`.

**Vedação.** O acervo existe para o advogado LER o que já sustentou. Reaproveitamento automático de texto de um cliente em peça de outro é VEDADO. O trecho é ponto de partida para redação nova, conferida contra os autos e contra a legislação vigente na data. O trecho é anonimizado, e o arquivo de origem não é.

Protocolo completo, coberturas e limites medidos em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs".

Entrega no chat (Onda 171). O achado chega ao titular pela corrente e pelo órgão, sem número de processo, relator ou data, em até três parágrafos e com no máximo três dados concretos. A lista completa, com a marcação de cada item, vai em planilha anexa e na peça, na forma de `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

