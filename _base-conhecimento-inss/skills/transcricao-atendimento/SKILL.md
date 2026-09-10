---
name: transcricao-atendimento
description: "Converte transcrição de atendimento (áudio, vídeo, WhatsApp ou anotação corrida) na anotação padronizada do escritório, pronta para gravar no Microsoft To Do. Use SEMPRE que receber transcrição de atendimento, gravação de consulta, áudio de cliente, conversa de WhatsApp com cliente, resumo de reunião com segurado, ou anotação bruta de atendimento a transcrever. Extrai os pontos-chave que o escritório de fato registra, identificados na análise de 4.114 tarefas reais do To Do. Entrega a anotação POR ITENS ROTULADOS, com HIPÓTESE, ÚLTIMO EVENTO, QUADRO, PENDÊNCIA, SOLICITADO, ORIENTADO, ATITUDE A SER TOMADA e VERIFICAR EM, sob linha datada no padrão DD.MM.AAAA (X), com cabeçalho estruturado quando houver processo ou DER. Sinaliza o que o cliente disse mas não foi confirmado, e o que ficou faltando perguntar. NÃO grava sozinha, entrega o texto para conferência antes de ir ao To Do. Cruza com triagem-caso-novo, processos-amanda-administrativo, atendimento-respostas-padrao e base-protocolo-operacional-escritorio."
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

Sempre em dois blocos, AMBOS por itens. Nada de parágrafo corrido, porque anotação em bloco cansa a leitura e esconde o que decide.

### Bloco 1, a anotação pronta para o To Do

Abre com a linha datada, no padrão real do escritório, e o conteúdo vem em ITENS ROTULADOS logo abaixo.

Data de abertura em DD.MM.AAAA com PONTOS, marcador de autoria entre parênteses. `(P)` Paulo, `(A)` Amanda, `(D)` André, `(I)` Ingrid, `(M)` Marcos, `(C)` Claude. A transcrição usa o marcador de QUEM ATENDEU, nunca `(C)`, que é reservado à conclusão produzida pelo Claude na forma da regra 1 do protocolo.

**Duas grafias de data, e elas não se misturam.** A data que CARIMBA a entrada, aquela que abre a linha ao lado do marcador de autoria, usa PONTOS no padrão `DD.MM.AAAA`. Toda data citada DENTRO do conteúdo dos itens usa BARRAS no padrão `DD/MM/AAAA`, e isso vale para `VERIFICAR EM`, `ÚLTIMO EVENTO`, `⚠️ PENDÊNCIA`, `SITUAÇÃO DO PROCESSO` e qualquer outro rótulo. A distinção não é estética, ela deixa o olho achar o carimbo da entrada em meio ao histórico sem ler o texto. O acervo do escritório já a pratica, com 17.272 aberturas em ponto contra 8.907 datas de conteúdo em barra, e o cabeçalho estruturado a confirma em `[DER]: DD/MM/AAAA`.

**Rótulos, todos extraídos do uso real do escritório.** Usar SOMENTE os que o caso alimentar. Rótulo sem conteúdo não entra.

| Rótulo | Quando usar |
|---|---|
| `HIPÓTESE` | Espécie provável do benefício. Abre a anotação, porque orienta a leitura do resto |
| `ÚLTIMO EVENTO` | O fato novo que motivou o atendimento, com data |
| `QUADRO` | Limitação funcional, com a expressão do cliente entre aspas |
| `SITUAÇÃO DO PROCESSO` | Havendo processo ou requerimento em curso |
| `⚠️ PENDÊNCIA` | Erro em documento, prazo em risco, obstáculo ao protocolo. Sempre com o alerta |
| `SOLICITADO` | Documento ou providência pedida ao cliente, item a item |
| `ORIENTADO` | O que foi explicado ou decidido com o cliente |
| `CONSIDERAÇÕES` | Avaliação do advogado que não cabe nos demais |
| `ATITUDE A SER TOMADA` | O que o escritório fará |
| `VERIFICAR EM` | Data de retorno em DD/MM/AAAA. OBRIGATÓRIO, fecha a anotação |

**Regras de forma.** Cada item com uma a duas linhas. Rótulo em caixa alta seguido de dois-pontos, exceção admitida à vedação geral porque campo estruturado não é prosa, e é assim que o escritório já escreve em `[DER]:` e `ENCAMINHAMENTO:`. Máximo de OITO itens, e o que exceder foi narrativa disfarçada. Data dentro de item sempre em DD/MM/AAAA.

```
09.09.2026 (P):
HIPÓTESE: B31 por incapacidade pós-cirúrgica.
ÚLTIMO EVENTO: Cirurgia de coluna lombar em 21/08/2026 com o Dr. André,
descompressão por cânula com liberação do nervo ciático.
QUADRO: Fica em pé "dois ou três minutos", dor que "queima como fogo",
não toma banho sozinha. Pregabalina, Lisador e codeína.
⚠️ PENDÊNCIA: Relatório traz a cirurgia como 21/09/2026, data futura e
errada. Protocolar assim gera indeferimento.
SOLICITADO: Relatório corrigido, aceito digital. Documento de identificação.
ORIENTADO: Não usaremos a carta pré-cirúrgica. Deficiência visual não gera
aposentadoria PCD agora, faltam os 15 anos na condição.
ATITUDE A SER TOMADA: Protocolar B31 com perícia em Monte Alto.
VERIFICAR EM: 18/09/2026.
```

Havendo processo ou requerimento em curso, o cabeçalho estruturado do escritório vem ANTES da linha datada.

```
[PROCESSO]: 
[SISTEMA]: MEUINSS ou PAT/GERID
[DER]: DD/MM/AAAA
[DISTRIBUIÇÃO]: DD/MM/AAAA
———————————————————————————
HISTÓRICO:
———————————————————————————
```

Regra de posição. Histórico em ordem DECRESCENTE, entrada nova no TOPO, entrada anterior intocada.

### Bloco 2, o controle interno

Não vai para o To Do. Também por itens, com rótulo em negrito e uma a duas linhas cada.

**Lista sugerida.** Qual lista recebe a tarefa e por quê. Escritório para atendimento em avaliação, INSS para requerimento, Judicial para processo, Conselho de Recursos para recurso, Aposentadorias Futuras sem direito atual, Tarefas com Prazo havendo prazo fatal.

**Hipótese e alternativas.** A principal e a sucessiva, cada uma em uma linha.

**Afirmado mas NÃO confirmado.** Um item por afirmação sem lastro documental, com o documento que resolve. Impede fala de cliente virar fato do caso.

**Faltou perguntar.** Um item por dado ausente, confrontado com os dados mínimos da `triagem-caso-novo`.

**Alertas.** Um item por alerta, cada um com o PRAZO e a consequência. Decadência do art. 103, prazo recursal, qualidade de segurado, Tema 1124, janela de quinze dias da prorrogação em B31, e janelas normativas com data de fechamento.

Alerta que tenha DATA DE FECHAMENTO vai em primeiro lugar e recebe destaque, porque é o único que pode inviabilizar a estratégia enquanto se conversa.

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
