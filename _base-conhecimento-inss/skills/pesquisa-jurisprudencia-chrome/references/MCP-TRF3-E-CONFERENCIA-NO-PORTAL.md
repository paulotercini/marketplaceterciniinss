# MCP trf3 e a Conferência Obrigatória no Portal

Onda 144 (19/09/2026). Fluxo TESTADO de ponta a ponta nesta data, com busca real no MCP, obtenção de inteiro teor e conferência do mesmo acórdão no portal do TRF3. O que segue é o que funcionou, e não o que se supõe que funcione.

## O que o MCP é, e o que ele não é

O servidor `trf3` guarda uma base LOCAL montada a partir da Jurisprudência Unificada do CJF, com acórdãos previdenciários da 7ª à 10ª Turma, da 3ª Seção e das Turmas Recursais de SP e MS. Não tem monocráticas.

Ele é um LOCALIZADOR rápido, e nada mais. Três limitações vêm declaradas pelo próprio servidor e precisam ser tratadas como premissa.

Primeiro, o campo `resultado` é inferido por heurística sobre o dispositivo, e não é dado oficial. Segundo, "provido" não significa favorável ao segurado, porque o recorrente costuma ser o INSS, o que se confere em `polo_recorrente`. Terceiro, a base tem corte temporal e recorte previdenciário, de modo que ausência no MCP não é ausência no TRF3.

Nas Turmas Recursais o CJF entrega o texto SEM acentuação, e por isso a busca ali usa palavras sem acento, como `ruido`, `contribuicao` ou `Secao Judiciaria`.

## A regra

Todo julgado localizado no MCP nasce marcado **[NÃO CONFIRMADO]** e NÃO entra em peça, parecer ou relatório nessa condição. Ele só recebe **[CONFERIDO]** com data depois de aberto no portal do TRF3.

Não sendo encontrado no portal, o julgado NÃO entra na peça. Havendo divergência entre o MCP e o portal, prevalece o portal.

## A mecânica do portal, testada em 19/09/2026

O endereço é `https://web.trf3.jus.br/jurisprudencia/`, com as abas TRF3, Monocráticas e Turmas Recursais.

**A busca por número faz-se pela PESQUISA LIVRE, e não pelo campo de número.** O campo `numero` preenchido sozinho devolve "Ocorreu um Erro na Pesquisa. Pesquisa Incorreta", testado nesta data. O caminho que funciona é lançar o número CNJ completo, com pontuação, no campo de pesquisa livre.

Esse campo tem `id` `txtPesqLivre` e `name` `txtPesquisaLivre`, e a divergência entre os dois já derrubou automação antes. O formulário posta em `https://web.trf3.jus.br/jurisprudencia/Home/ResultadoTotais` e o resultado abre em `Home/ListaResumida`.

## O número CNJ devolve TODOS os acórdãos do processo

Registrado na conferência de 19/09/2026, nos processos 5248998-80.2020.4.03.9999 e 5003069-93.2024.4.03.6110, ambos reconferidos em 20/09/2026.

A busca pelo número CNJ não devolve um acórdão, devolve o PROCESSO inteiro. Um mesmo número traz o julgamento da apelação, o dos embargos de declaração, o do agravo interno e o que mais tenha sido julgado por colegiado naqueles autos.

**O julgado certo é o que tem a DATA DE JULGAMENTO igual à do registro do MCP.** Essa é a única chave confiável, e não a classe.

**Por que não serve a classe.** Nos dois processos conferidos, os dois resultados vieram com a MESMA classe. No 5248998-80.2020.4.03.9999, duas `ApelRemNec` da 8ª Turma, julgadas em 11/03/2026 e em 13/11/2025. No 5003069-93.2024.4.03.6110, duas `ApCiv`, julgadas em 29/06/2026 e em 02/03/2026. O TRF3 mantém a classe originária dos autos ainda quando o que se julga são embargos ou agravo interno, de modo que a classe não distingue um ato do outro.

### O risco que isso cria, e que é maior do que parecer o julgado errado

No processo 5003069-93.2024.4.03.6110, o acórdão de 02/03/2026 tem a ementa "QUESTÃO DE ORDEM. INCOMPATIBILIDADE ENTRE VOTOS. PROCLAMAÇÃO DE UNANIMIDADE. NULIDADE DO JULGAMENTO", e o de 29/06/2026 é o julgamento REFEITO, que deu provimento à apelação do INSS.

O portal guarda os dois, sem marca visível na lista de que o primeiro foi anulado. Quem escolher pela ordem em que aparecem, ou pela classe, pode citar em peça um julgamento declarado NULO pelo próprio tribunal. A Procuradoria derruba isso em uma linha, e o custo é a credibilidade da peça inteira.

### Roteiro, quando o número devolver mais de um resultado

Primeiro, conferir a data de julgamento de cada um contra a do MCP, e isolar o que bate.

Segundo, ler a ementa dos DEMAIS assim mesmo, procurando por anulação, nulidade do julgamento, questão de ordem, juízo de retratação ou efeitos infringentes. Achando qualquer um, entender a sequência antes de citar, porque a existência de julgamento posterior pode ter substituído o que se pretende usar.

Terceiro, citando o acórdão de embargos ou de agravo interno, dizer isso na peça. "Acórdão dos embargos de declaração no ApCiv nº ..., j. em ..." é diferente de citar a apelação, e o julgador percebe a imprecisão.

Quarto, não havendo no portal nenhum julgado com a data que o MCP registra, tratar como divergência e NÃO citar, na forma da regra geral.

## O que se confere, campo a campo

Classe e sigla, órgão julgador, relator, data de julgamento, data de publicação no DJEN e o texto da ementa, todos confrontados com o registro do MCP.

**E, sobretudo, as PARTES.** Esse é o ganho concreto da conferência. O portal exibe apelante, apelado e o advogado, e o MCP não tem esse dado. É ali que se confirma quem de fato recorreu, em vez de confiar no `polo_recorrente` inferido. No teste, o portal mostrou "APELANTE: INSTITUTO NACIONAL DO SEGURO SOCIAL - INSS" e "APELADO: DORVAL JOSE DIAS", o que confirmou a inferência do MCP, mas a confirmação foi lida e não presumida.

Lê-se também o dispositivo no inteiro teor, porque o resultado do MCP é inferido, e porque é no dispositivo que se vê se o acórdão serve ao caso.

## A armadilha do relator

No teste, o MCP registrou a relatora como "JULIANA BLANCO WOJTOWICZ". O portal exibiu, no cabeçalho do acórdão, "RELATOR: ANA LUCIA IUCKER MEIRELLES DE OLIVEIRA", e no corpo "A EXMA. JUÍZA FEDERAL CONVOCADA JULIANA WOJTOWICZ (Relatora)". A lista do portal, por sua vez, identificou "Juíza Federal JULIANA BLANCO WOJTOWICZ".

São três formas para o mesmo julgado, e a explicação é que há relator titular e magistrada convocada que relatou. Citar apenas um dos nomes pode ser impreciso, e a conferência existe para que o advogado veja os dois e decida como citar.

Caso de 26/09/2026, ApCiv 5051091-92.2023.4.03.9999, 7ª Turma, j. 13/08/2026. O cabeçalho da ementa registra "RELATOR: JEAN MARCOS FERREIRA" e o voto registra a Juíza Federal Convocada Adriana Delboni Taricco como relatora. A divergência vem da fonte CJF, e o nome a citar se lê no portal, nunca no cabeçalho do MCP.

## A armadilha maior. A ementa do tribunal pode estar errada

O acórdão testado sustenta, na própria tese de julgamento, que a exceção do ruído decorre dos "STJ Temas 534, 694 e 1.083" e da "IN PRES/INSS nº 170/2024, art. 291, §2º".

Dois problemas. O **Tema 534 do STJ é eletricidade**, e não ruído nem rol exemplificativo, armadilha de homônimo já registrada na base desde a Onda 108. E a **IN PRES/INSS nº 170/2024 não foi localizada no DOU**, em busca pela expressão exata em 19/09/2026, sem restrição de data.

Não se afirma aqui que a IN inexiste, porque a busca do portal da Imprensa Nacional tem limitações conhecidas. Afirma-se o que foi apurado, que ela não foi localizada.

**Consequência prática, e esta é a regra que mais protege a peça.** Copiar ementa de acórdão importa os erros do acórdão. Toda citação de tema, súmula ou norma que vier dentro de uma ementa do TRF3 passa pelo `base-precedentes-catalogo-vinculantes` e pelo `verificador-precedentes` antes de ser reproduzida. Achado do tribunal não dispensa conferência, e a Procuradoria desmonta fundamento morto ainda que ele venha de acórdão.

O acórdão continua aproveitável pela RATIO, que é a exceção do ruído, ancorada corretamente no Tema 555 do STF. O que não se reproduz é a cadeia de citações que ele carrega.

## Roteiro operacional

Primeiro, `visao_geral_trf3` para saber o período coberto e a data da última coleta, porque fora da janela a ausência não significa nada.

Segundo, `buscar_acordaos_trf3` com a consulta, e os filtros de `acervo`, `orgao_julgador`, `polo_recorrente` e datas conforme o caso. A busca ignora acentuação, aceita aspas para expressão exata e `-palavra` para excluir.

Terceiro, `obter_acordao_trf3` pelo id devolvido na busca, atento ao campo `truncado`.

Quarto, abertura do portal pelo Claude in Chrome e conferência na forma acima.

Quinto, marcação `[CONFERIDO em DD/MM/AAAA]` e registro, no relatório, de qual via foi usada. Caindo o MCP, a pesquisa segue direto pelo Chrome e isso também se registra.

## Valor estatístico

A base cobre de outubro de 2021 em diante, e a data exata sai de `visao_geral_trf3`. Com mais de doze meses de cobertura, `perfil_orgao_trf3` e `perfil_relator_trf3` entram em relatório interno, sempre com três ressalvas escritas. O `resultado` é inferido por heurística sobre o dispositivo. O `polo_recorrente` é inferido, e provimento não é vitória do segurado. A base tem recorte previdenciário e corte temporal, e ausência aqui não é ausência no TRF3. Taxa não entra em peça. O que entra é o acórdão lido e conferido.
