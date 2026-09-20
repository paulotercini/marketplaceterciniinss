# Pesquisa no MCP `normas`, a base normativa local

Medido ao vivo em 20/09/2026, chamando as cinco ferramentas. O que está aqui saiu da resposta do servidor. **Número não entra nesta página nem em skill**, porque o corpus é reingerido. O tamanho, a idade e o que ficou de fora saem de `visao_geral_normas`, que é a primeira chamada de qualquer sessão.

## O que o servidor faz

Guarda a legislação previdenciária em base local, montada do corpus de `C:\Users\VAIO\INSS\base-legislacao`, que é texto compilado do Planalto e das páginas oficiais do INSS. Responde qual é o texto do artigo, qual era a redação em determinado ano, e onde a expressão aparece no corpus.

**Ele LOCALIZA e não confere.** Toda resposta traz `fonte_oficial`, `data_download`, `idade_dias` e `verificacao`, e a citação em peça exige a conferência na fonte. Nenhuma resposta dele autoriza `[CONFERIDO]`.

## A inferência vem em TODA resposta, não só na visão geral

Medido nas cinco ferramentas. O bloco `inferencia` acompanha `visao_geral_normas`, `obter_artigo`, `redacao_na_data` e `buscar_normas`, com seis campos fixos, `vigencia`, `ano`, `dispositivos`, `paragrafos_empilhados`, `literal` e `antes_de_citar`. O `redacao_na_data` acrescenta ainda um campo `aviso` próprio sobre a granularidade.

A regra de vigência vem declarada com a medição que a sustenta. A versão vigente é a última não revogada da pilha, regra medida em 63 dos 66 artigos com mais de uma redação na Lei 8.213 e em 69 dos 72 do Decreto 3.048 parte 1. Quem lê a resposta não precisa perguntar se é inferência, porque o servidor diz.

## A granularidade é anual, e o ano da alteração é o ano perigoso

**Pedir data completa não devolve erro, devolve o ANO.** Medido com `redacao_na_data` no art. 29 da Lei 8.213. Passando `1998-06-15`, a resposta traz `ano_consultado: 1998` e a redação original, correta. O servidor trunca em silêncio e declara a granularidade no campo `aviso`.

**O ano da própria alteração devolve resposta errada para a data pedida.** Passando `1999-01-10` no mesmo artigo, a resposta traz a redação da Lei 9.876, **de 26/11/1999**, que em janeiro daquele ano ainda não existia. Não é defeito escondido, é a granularidade anual funcionando como documentada, mas é a armadilha prática, porque o ano da alteração é justamente o mais consultado em tese de direito adquirido. Caindo a consulta no ano em que a norma alteradora entrou, a data exata se confere na norma alteradora, na fonte.

## O `texto` é fiel, o `dispositivos` não é

O campo `texto` do artigo é transcrição literal do arquivo, na ordem do compilado. O campo `dispositivos`, que separa parágrafo, inciso e alínea por rótulo, **quebra em artigo com referência cruzada interna**, e foi medido quebrando em três casos.

No art. 20 da LOAS, o `§ 3º-A` foi cortado em "ressalvadas as hipóteses previstas no" e o resto virou um dispositivo autônomo rotulado `§ 14º`, porque a remissão a "§ 14 deste artigo" foi lida como abertura de parágrafo novo. O mesmo aconteceu no `§ 4º` e no `§ 6º`. Os sufixos alfabéticos também se perdem, e `§ 2º-A`, `§ 6º-A`, `§ 11-A`, `§ 12-A` e `§ 12-B` aparecem como ocorrências do `§ 2º`, do `§ 6º`, do `§ 11º` e do `§ 12º`.

**Regra de conduta.** Para transcrever dispositivo em peça, lê-se o campo `texto`. O `dispositivos` serve para navegar, nunca para copiar.

## O empilhamento do parágrafo é a armadilha que mais custa

O compilado empilha também as redações do parágrafo e do inciso, e todas vêm dentro do `texto` do artigo, em ordem cronológica, sem marca de qual está em vigor. Só a ordem diz, e a última é a que vale.

Medido no art. 57 da Lei 8.213, o `§ 1º` aparece duas vezes, primeiro com os 85% mais 1% por grupo de doze contribuições, depois com os 100% da Lei 9.032/1995. Medido no art. 20 da LOAS, o `§ 3º` aparece quatro vezes, e a terceira é a do meio salário mínimo da Lei 13.981/2020, que não vale. Copiar a primeira ocorrência de um parágrafo é o erro mais fácil de cometer aqui, e o mais caro.

## O que a busca não alcança

**O Decreto 3.048 não responde por agente nocivo.** Medido, `buscar_normas("ruido")` devolveu dez resultados e nenhum do Decreto 3.048. Os Anexos II, III e IV ficaram fora da base por serem pseudo-tabela, com 832 linhas de pipe e apenas duas de separador, e a própria `visao_geral_normas` declara isso em `arquivos_fora_da_base`, com a consequência prática escrita.

**O desvio é o Decreto 53.831/1964**, que está na base com o Quadro Anexo. Mas o Quadro foi gravado DENTRO do texto do art. 6º, que é a cláusula de vigência, de modo que a busca por agente nocivo naquele decreto casa sempre no art. 6º e não no código do quadro. O mesmo vale para o Anexo I do Decreto 2.172, que caiu dentro do art. 265. Para ler o quadro, abre-se o artigo inteiro.

**Outros quatro arquivos ficaram de fora,** três por não terem frontmatter, logo sem fonte, data nem hash para citar a origem, e o anexo VI da Portaria PRES 1.851/2025 por não ter artigo nenhum.

## Normas sem histórico interno, por serem fotografia

A `visao_geral_normas` traz um bloco `comportamento_previsto` que declara o que parece falha e não é. A IN 128/2022 tem 674 artigos e zero marcador, porque é fotografia consolidada até a IN 170/2024, e os anexos I a XXIX não estão na base. As Portarias DIRBEN 990 a 996 são iguais. O Decreto 2.172/1997 tem 258 artigos e zero marcador porque é a redação de 1997 como publicada. Pedir histórico nessas normas devolve versão única, e isso é o esperado.

A CF/88 tem 139 números de artigo que existem no corpo permanente e no ADCT, e por isso a chave é sempre escopada pela `parte`, que aceita `principal`, `adct` e `anexo`.

## Verificação de atualização, e a correção de uma afirmação anterior

**O Planalto NÃO responde a cliente HTTP comum na máquina do escritório.** Medido com `verificar_atualizacao` na Lei 8.213, que devolveu estado `exige_navegador` com `ConnectionResetError WinError 10054`. A resposta traz a URL e o que conferir à mão, e nunca reporta a norma como inexistente. O cliente não é disfarçado e nenhum bloqueio é contornado.

Isto corrige o que esta referência afirmava na Onda 149, de que o Planalto responderia a cliente HTTP comum. Aquela medição foi da sonda do MCP trf3, feita no sandbox Linux do Cowork, e não vale para a máquina Windows onde o servidor roda.

Os seis estados são `primeira_leitura`, `igual`, `mudou`, `nao_localizado`, `sem_fonte` e `exige_navegador`. Medido em 20/09/2026, as normas da base estão todas com `verificacao` em "ainda não verificado".

## Enunciado do CRPS não está aqui

Continua no MCP `iurisprudencia`, cujo `enunciados_pleno_inss_crps` devolve o texto vigente, as redações anteriores e a resolução que alterou cada uma, e cujo `acordaos_por_precedente_inss_crps` devolve os acórdãos que o aplicaram. Não achar enunciado no `normas` não significa que ele não exista.

## Fluxo recomendado

1. `visao_geral_normas` uma vez na sessão, para pegar o identificador da norma, a idade do texto e o que ficou de fora.
2. `buscar_normas` para achar o artigo quando não se sabe o número, com `norma`, `tipo` e `parte` para apertar.
3. `obter_artigo` no identificador, lendo o campo `texto` e não o `dispositivos`.
4. Tendo o artigo mais de uma versão, conferir qual é a última ocorrência de cada parágrafo antes de transcrever.
5. `redacao_na_data` para tese de direito adquirido, sabendo que a resposta é por ano.
6. `verificar_atualizacao` antes de citar dispositivo de norma que muda com frequência, e vindo `exige_navegador`, abrir a URL no navegador.

## Casos de exercício, medidos em 20/09/2026

| Caso | O que devolveu |
|---|---|
| Art. 57 da Lei 8.213 | Caput na v2 da Lei 9.032/1995, com os §§ 1º, 3º, 4º e 6º empilhados em duas redações cada |
| Art. 20 da LOAS | Caput na v2 da Lei 12.435/2011, com o § 3º em quatro redações e o `dispositivos` quebrado por remissão |
| Art. 29 da Lei 8.213 em 1998 | Redação original, correta |
| Art. 29 da Lei 8.213 em 1999 | Redação da Lei 9.876, de 26/11/1999, ainda não vigente em janeiro daquele ano |
| Busca por ruído | Dez resultados, nenhum do Decreto 3.048, e o 53.831 casando no art. 6º |
| `verificar_atualizacao` na Lei 8.213 | `exige_navegador`, o Planalto recusa cliente HTTP comum nesta máquina |
