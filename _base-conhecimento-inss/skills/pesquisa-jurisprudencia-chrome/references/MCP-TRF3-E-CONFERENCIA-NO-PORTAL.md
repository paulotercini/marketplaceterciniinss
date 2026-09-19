# MCP trf3 e a Conferência Obrigatória no Portal

Onda 144 (19/09/2026). Fluxo TESTADO de ponta a ponta nesta data, com busca real no MCP, obtenção de inteiro teor e conferência do mesmo acórdão no portal do TRF3. O que segue é o que funcionou, e não o que se supõe que funcione.

## O que o MCP é, e o que ele não é

O servidor `trf3` guarda uma base LOCAL montada a partir da Jurisprudência Unificada do CJF, com acórdãos previdenciários da 7ª à 10ª Turma, da 3ª Seção e das Turmas Recursais de SP e MS. Não tem monocráticas.

Ele é um LOCALIZADOR rápido, e nada mais. Três limitações vêm declaradas pelo próprio servidor e precisam ser tratadas como premissa.

Primeiro, o campo `resultado` é inferido por heurística sobre o dispositivo, e não é dado oficial. Segundo, "provido" não significa favorável ao segurado, porque o recorrente costuma ser o INSS, o que se confere em `polo_recorrente`. Terceiro, a base tem corte temporal e recorte previdenciário, de modo que ausência no MCP não é ausência no TRF3.

Nas Turmas Recursais o CJF entrega o texto SEM acentuação, e por isso a busca ali usa palavras sem acento, como `ruido`, `contribuicao` ou `Secao Judiciaria`.

## A regra

Todo julgado localizado no MCP nasce marcado **[NÃO CONFERIDO]** e NÃO entra em peça, parecer ou relatório nessa condição. Ele só recebe **[CONFERIDO]** com data depois de aberto no portal do TRF3.

Não sendo encontrado no portal, o julgado NÃO entra na peça. Havendo divergência entre o MCP e o portal, prevalece o portal.

## A mecânica do portal, testada em 19/09/2026

O endereço é `https://web.trf3.jus.br/jurisprudencia/`, com as abas TRF3, Monocráticas e Turmas Recursais.

**A busca por número faz-se pela PESQUISA LIVRE, e não pelo campo de número.** O campo `numero` preenchido sozinho devolve "Ocorreu um Erro na Pesquisa. Pesquisa Incorreta", testado nesta data. O caminho que funciona é lançar o número CNJ completo, com pontuação, no campo de pesquisa livre.

Esse campo tem `id` `txtPesqLivre` e `name` `txtPesquisaLivre`, e a divergência entre os dois já derrubou automação antes. O formulário posta em `https://web.trf3.jus.br/jurisprudencia/Home/ResultadoTotais` e o resultado abre em `Home/ListaResumida`.

## O que se confere, campo a campo

Classe e sigla, órgão julgador, relator, data de julgamento, data de publicação no DJEN e o texto da ementa, todos confrontados com o registro do MCP.

**E, sobretudo, as PARTES.** Esse é o ganho concreto da conferência. O portal exibe apelante, apelado e o advogado, e o MCP não tem esse dado. É ali que se confirma quem de fato recorreu, em vez de confiar no `polo_recorrente` inferido. No teste, o portal mostrou "APELANTE: INSTITUTO NACIONAL DO SEGURO SOCIAL - INSS" e "APELADO: DORVAL JOSE DIAS", o que confirmou a inferência do MCP, mas a confirmação foi lida e não presumida.

Lê-se também o dispositivo no inteiro teor, porque o resultado do MCP é inferido, e porque é no dispositivo que se vê se o acórdão serve ao caso.

## A armadilha do relator

No teste, o MCP registrou a relatora como "JULIANA BLANCO WOJTOWICZ". O portal exibiu, no cabeçalho do acórdão, "RELATOR: ANA LUCIA IUCKER MEIRELLES DE OLIVEIRA", e no corpo "A EXMA. JUÍZA FEDERAL CONVOCADA JULIANA WOJTOWICZ (Relatora)". A lista do portal, por sua vez, identificou "Juíza Federal JULIANA BLANCO WOJTOWICZ".

São três formas para o mesmo julgado, e a explicação é que há relator titular e magistrada convocada que relatou. Citar apenas um dos nomes pode ser impreciso, e a conferência existe para que o advogado veja os dois e decida como citar.

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

Enquanto a carga não cobrir pelo menos um ano, comparação entre Turmas ou entre relatores NÃO tem valor, porque semanas não fazem amostra. A distribuição por órgão reflete a ordem da coleta, e não a realidade do tribunal. O `perfil_orgao_trf3` e o `perfil_relator_trf3` só entram em relatório depois que a base cobrir doze meses.
