# Pesquisa no MCP `normas`, a base normativa local

## Estado desta referência

**Escrita em 20/09/2026 SEM execução própria do servidor.** O MCP `normas` não estava conectado na sessão do Cowork que redigiu esta página, e as cinco ferramentas não apareceram na lista de servidores. Os números e o comportamento abaixo foram MEDIDOS PELO TITULAR em 20/09/2026 e reproduzidos aqui com essa atribuição.

Regra de conduta enquanto isto não for reconferido. A primeira chamada de qualquer sessão é `visao_geral_normas`, e vale a resposta do servidor, não o que está escrito nesta página. Divergindo os dois, prevalece o servidor e esta referência se corrige.

## O que a base é

Base LOCAL montada do corpus de `C:\Users\VAIO\INSS\base-legislacao`, que é texto compilado do Planalto e das páginas oficiais do INSS. Medida pelo titular em 20/09/2026, tem 48 normas, 5.863 artigos vigentes e 6.728 versões, com texto baixado em 31/05/2026, o que dava 112 dias de idade naquela data.

O servidor LOCALIZA e não confere. A citação em peça exige a `fonte_oficial` que a própria resposta devolve, e nenhuma resposta dele autoriza a marca `[CONFERIDO]`.

## As três limitações que mudam a conduta

**1. A vigência é INFERIDA.** O texto compilado do Planalto empilha as redações de um mesmo dispositivo em sequência, e o tachado que no HTML distinguia a revogada da vigente se perdeu na conversão. O servidor toma como vigente a última versão não revogada da pilha, o que é inferência de ordem e não leitura de marca. Redação decisiva para a tese se confere na `fonte_oficial` antes de entrar na peça.

**2. O histórico tem granularidade de ANO, e o ano é o da norma alteradora.** O marcador do texto compilado diz `(Redação dada pela Lei nº 11.718, de 2008)` e em regra não traz dia nem mês. Pior, o ano é o do ato que alterou, não o do início da vigência, de modo que vacatio legis e conversão de medida provisória não aparecem. Por isso `redacao_na_data` responde por ano, e a pergunta "qual era a redação em 14/03/2009" não tem resposta segura nesta base.

**3. Os Anexos II, III e IV do Decreto 3.048/99 ficaram de fora,** porque são tabela e não texto articulado. A consequência prática é grande. **Busca por ruído, por agente químico ou por qualquer agente nocivo NÃO alcança o Decreto 3.048.** O substituto que está na base é o **Decreto 53.831/1964**, com o Quadro Anexo dos agentes nocivos pré-1995, e o Anexo IV se confere no arquivo do corpus ou na fonte oficial.

## Enunciado do CRPS não está aqui

O enunciado do Conselho Pleno do CRPS não entrou no `normas` e continua no MCP `iurisprudencia`, cujo `enunciados_pleno_inss_crps` devolve o texto vigente, as redações anteriores e a resolução que alterou cada uma, e cujo `acordaos_por_precedente_inss_crps` devolve os acórdãos que o aplicaram. Buscar enunciado no `normas` devolve nada, e isso não significa que o enunciado não exista.

## As cinco ferramentas

| Ferramenta | Para quê |
|---|---|
| `visao_geral_normas` | Primeira chamada. Identificador de cada norma, contagem de artigos, idade do texto em dias, arquivos que ficaram de fora e por quê, e o bloco de inferência |
| `obter_artigo` | A redação vigente de um artigo, com `fonte_oficial` e data do download |
| `redacao_na_data` | A redação de um artigo em determinado ano, com a ressalva da granularidade anual |
| `buscar_normas` | Busca textual no corpus, com filtro por norma |
| `verificar_atualizacao` | Compara o hash local com o texto atual da `fonte_oficial` |

## A idade do texto é critério, não curiosidade

O corpus foi baixado em 31/05/2026, e a Lei 8.213 já registra alteração de 2026 no próprio cabeçalho do arquivo. Antes de citar dispositivo de norma que muda com frequência, como a Lei 8.213, a Lei 8.212 e a IN 128/2022, roda-se `verificar_atualizacao`. Acusando divergência de hash, a redação se lê na `fonte_oficial` e não no banco.

O Planalto responde a cliente HTTP comum, medido em 19/09/2026. O `portalin.inss.gov.br` traz a IN 128 e as Portarias com carimbo de atualização na própria página. O `in.gov.br` exige navegador, e o que não for encontrado por lá se reporta como "não localizado", nunca como inexistente.

## Casos de exercício do escritório

Servem de teste de aceite quando o servidor voltar a estar disponível. Art. 57 da Lei 8.213, art. 20 da Lei 8.742/93, art. 68 do Decreto 3.048/99 e a redação do art. 29 da Lei 8.213 antes e depois da Lei 9.876/1999. O resultado de cada um se anota aqui, com a data da medição.
