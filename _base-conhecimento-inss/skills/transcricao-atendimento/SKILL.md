---
name: transcricao-atendimento
description: "Converte transcrição de atendimento (áudio, vídeo, WhatsApp ou anotação corrida) na anotação padronizada do escritório, pronta para gravar no Microsoft To Do. Use SEMPRE que receber transcrição de atendimento, gravação de consulta, áudio de cliente, conversa de WhatsApp com cliente, resumo de reunião com segurado, ou anotação bruta de atendimento a transcrever. Extrai os pontos-chave que o escritório de fato registra, identificados na análise de 4.114 tarefas reais do To Do. Entrega linha datada no padrão DD.MM.AAAA (X), cabeçalho estruturado quando houver processo ou DER, hipótese de benefício, prazo ou data de verificação obrigatória, e a lista de documentos solicitados. Sinaliza o que o cliente disse mas não foi confirmado, e o que ficou faltando perguntar. NÃO grava sozinha, entrega o texto para conferência antes de ir ao To Do. Cruza com triagem-caso-novo, processos-amanda-administrativo, atendimento-respostas-padrao e base-protocolo-operacional-escritorio."
---

# Transcrição de Atendimento

Converte o que foi FALADO em atendimento na anotação que o escritório efetivamente usa. A saída é texto pronto para colar no Microsoft To Do, nunca um resumo livre.

## Base empírica desta skill

O padrão abaixo NÃO foi inventado. Saiu da análise do backup de 4.114 tarefas do To Do do escritório, cruzada com a `triagem-caso-novo` e com o CRM. Os números aparecem em `references/PADRAO-EXTRAIDO-DO-TODO.md`.

O que a análise mostrou, em uma frase. O escritório registra DECISÃO e PRÓXIMO PASSO COM DATA, não narrativa.

## Regra de ouro

Anotação de atendimento não é ata. Se a linha não muda uma decisão, não define um prazo, não registra um fato do caso ou não pede um documento, ela NÃO entra.

Transcrição de trinta minutos vira, tipicamente, de cinco a doze linhas.

## O que SEMPRE extrair, na ordem

**1. Identificação do caso.** Nome do cliente e, havendo, o CPF, para casar com a tarefa `Nome #CPF`. Havendo processo, número. Havendo requerimento, NB e DER.

**2. Hipótese de benefício.** O escritório escreve assim, "trata-se de possível caso de auxílio-acidente". Nomear a espécie provável, ainda que provisória, porque é ela que orienta o próximo passo. Não havendo hipótese formada, dizer isso.

**3. Fatos do caso com valor jurídico.** Idade, tempo de contribuição aproximado, atividade exercida, origem da lesão ou da doença, data aproximada do início, tratamentos, existência de CAT, condição rural, agentes nocivos. Cada um só entra se o cliente TROUXE.

**4. A fala do cliente que descreve limitação.** Preservar a expressão do próprio cliente entre aspas quando ela descreve o problema melhor que o termo técnico. O padrão real do escritório faz isso, e é ouro para a peça e para o relatório médico, porque é linguagem de leigo que a perícia depois vai confrontar.

**5. O que foi orientado e o que foi solicitado.** Documento pedido, exame a fazer, providência do cliente. Listar item a item, porque essa lista vira a cobrança seguinte.

**6. Encaminhamento com DATA.** Fechamento obrigatório. O escritório usa "Verificar em DD/MM", "Aguardar até DD/MM" ou "Prazo é DD/MM". Anotação sem data de retorno é anotação que morre.

**7. Pendência de honorários ou contrato**, quando mencionada. Só o fato, sem valor negociado se o cliente não fechou.

## O que NUNCA entra

Cumprimento, conversa fiada, repetição do que o cliente falou três vezes.

Diagnóstico jurídico definitivo dado como certeza. Atendimento gera HIPÓTESE, e a certeza vem depois do CNIS e dos documentos.

Cálculo de tempo, RMI ou valor. Isso é do Prévius, regra 6 do protocolo.

Promessa de resultado ao cliente.

Dado sensível que o cliente pediu sigilo e que não afeta o caso.

## Formato de saída

Sempre em dois blocos.

### Bloco 1, a anotação pronta para o To Do

Uma linha datada, no padrão real do escritório. Data em DD.MM.AAAA, seguida do marcador de autoria entre parênteses e dois-pontos, e o conteúdo.

Marcadores da equipe, confirmados no CRM. `(P)` Paulo, `(A)` Amanda, `(D)` André, `(I)` Ingrid, `(M)` Marcos, `(C)` Claude.

A anotação da transcrição usa o marcador de QUEM ATENDEU, não `(C)`. O `(C)` é reservado para conclusão produzida pelo Claude, na forma da regra 1 do protocolo.

```
09.09.2026 (P): Trata-se de possível caso de auxílio-acidente. 44 anos,
16 anos de contribuição. Refere condição na clavícula, na expressão dela
"pendurada", com indicação de reconstrução de tendões e ligamentos.
Origem em queda, sem acompanhamento nem tratamento à época.
Solicitei documentos médicos antigos para fixar a data de início.
Aguardar retorno até 25/09.
```

Havendo processo ou requerimento em curso, acrescentar o cabeçalho estruturado que o escritório usa nas listas Judicial e INSS, e só então o histórico.

```
[PROCESSO]: 
[SISTEMA]: MEUINSS ou PAT/GERID
[DER]: DD/MM/AAAA
[DISTRIBUIÇÃO]: DD/MM/AAAA
———————————————————————————
HISTÓRICO:
———————————————————————————
```

Regra de posição. Histórico em ordem DECRESCENTE, entrada nova no TOPO. Nunca editar nem apagar entrada anterior.

### Bloco 2, o controle interno

Não vai para o To Do. Serve para o advogado decidir.

**Lista sugerida.** Qual das listas do escritório deve receber a tarefa, e por quê. Escritório para atendimento em avaliação, INSS para requerimento administrativo, Judicial para processo, Conselho de Recursos para recurso, Aposentadorias Futuras quando não há direito atual, Tarefas com Prazo quando houver prazo fatal.

**Hipótese de benefício e alternativas.** A principal e, havendo, a sucessiva.

**Afirmado mas NÃO confirmado.** Tudo que veio da boca do cliente e ainda não tem lastro documental. Esta seção existe para impedir que fala de cliente vire fato do caso.

**Faltou perguntar.** Confrontar o atendimento com os dados mínimos da `triagem-caso-novo`. Idade, sexo, atividade atual e anterior, situação contributiva, queixa principal, requerimento anterior e resultado, motivo do indeferimento, documentos disponíveis. Listar o que não foi coletado, para a próxima conversa.

**Alertas disparados.** Prazo decadencial do art. 103, prazo recursal, qualidade de segurado em risco, trava do Tema 1124 quando houver documento decisivo não apresentado ao INSS, janela de quinze dias para prorrogação em B31.

## Regras de execução

Não gravar no To Do sozinha. Entregar o texto e aguardar confirmação, porque entrada gravada não se apaga.

Antes de sugerir a lista, buscar TODAS as tarefas do cliente em TODAS as listas, na forma da regra 1. Havendo tarefa aberta, a anotação COMPLEMENTA a existente, e a skill diz em qual.

Dado de cliente não sai desta conversa. Nada de nome, CPF ou fato de atendimento em skill, memória ou reference.

Transcrição com trecho inaudível recebe `[inaudível]` no ponto exato, nunca preenchimento por inferência.

Divergência entre o que o cliente disse e o que o documento mostra vai para "Afirmado mas NÃO confirmado", e não se resolve na anotação.

## Cruzamentos

`triagem-caso-novo` para os dados mínimos e a classificação do benefício.
`base-protocolo-operacional-escritorio` para a regra 1 do To Do.
`processos-amanda-administrativo` para o encaminhamento e o semáforo de escalação.
`atendimento-respostas-padrao` quando o atendimento gerar resposta ao cliente.
`base-documentos-comprobatorios-in128` para transformar "solicitei documentos" em lista precisa por benefício.
