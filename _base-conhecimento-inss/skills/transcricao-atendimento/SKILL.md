---
name: transcricao-atendimento
description: "Converte transcrição de atendimento (áudio, vídeo, WhatsApp ou anotação corrida) na anotação padronizada do escritório, pronta para gravar no Microsoft To Do. Use SEMPRE que receber transcrição de atendimento, gravação de consulta, áudio de cliente, conversa de WhatsApp com cliente, resumo de reunião com segurado, ou anotação bruta de atendimento a transcrever. Extrai os pontos-chave que o escritório de fato registra, medidos em 15.147 entradas reais do To Do. Entrega a anotação em PROSA CORRIDA na voz do escritório, veredito na frente e ação embutida na frase, sob linha datada no padrão DD.MM.AAAA (X) com datas de conteúdo em DD/MM, teto de sessenta palavras, e cabeçalho estruturado quando houver processo ou DER. Sinaliza o que o cliente disse mas não foi confirmado, e o que ficou faltando perguntar. NÃO grava sozinha, entrega o texto para conferência antes de ir ao To Do. Cruza com triagem-caso-novo, processos-amanda-administrativo, atendimento-respostas-padrao e base-protocolo-operacional-escritorio."
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

Sempre em dois blocos. O primeiro é a anotação, e ela é PROSA CORRIDA, não formulário.

### Bloco 1, a anotação pronta para o To Do

Abre com a linha datada e o texto SEGUE NA MESMA LINHA, logo após o marcador.

Data de abertura em DD.MM.AAAA com PONTOS, marcador de autoria entre parênteses. `(P)` Paulo, `(A)` Amanda, `(D)` André, `(I)` Ingrid, `(M)` Marcos, `(C)` Claude. A transcrição usa o marcador de QUEM ATENDEU, nunca `(C)`, que é reservado à conclusão produzida pelo Claude na forma da regra 1 do protocolo.

**Duas grafias de data, e elas não se misturam.** A data que CARIMBA a entrada usa PONTOS no padrão `DD.MM.AAAA`. Toda data citada DENTRO do texto usa BARRAS, e o escritório abrevia para `DD/MM` quando o ano é o corrente. O acervo pratica isso com 17.272 aberturas em ponto contra 8.907 datas de conteúdo em barra, e o cabeçalho estruturado confirma em `[DER]: DD/MM/AAAA`.

**A voz, medida no acervo.** Rótulo em caixa alta aparece em 0,1% das 15.147 entradas datadas, e mesmo assim em bloco processual, não em atendimento. Formulário NÃO é o padrão da casa, e transformá-lo em regra descaracteriza a anotação. A mediana é de 10 palavras por entrada, a média 16, e o percentil 90 fica em 34. Atendimento de consulta inteira é naturalmente maior, e ainda assim o TETO é de sessenta palavras. Passou disso, virou ata.

**Os seis traços que dão a voz do escritório.**

Primeiro, veredito na frente. A entrada abre pelo que decide, e não pelo histórico. "A sentença foi de improcedência" antes de qualquer explicação.

Segundo, a ação vem embutida na frase, jamais em campo. Escreve-se "Vamos aguardar até 16/10", "acompanhar", "Tarefa encerrada", dentro do próprio texto.

Terceiro, fala direta com quem vai executar, em 5,4% das entradas. "Amanda, avisa a cliente que pode sacar", "Marcão, procura na agência". Havendo tarefa de colaborador, chamar pelo nome.

Quarto, número concreto inline, sem cerimônia. Valor, protocolo, NB e data entram no meio da frase.

Quinto, referência a anexo entre parênteses, na forma "(anexo)".

Sexto, dois marcadores na MESMA entrada quando um responde ao outro, em 14,1% dos casos. `(D): Trouxe os documentos hoje. (P): Amanda, junta no pedido dele.`

**O que fazer com o conteúdo.** A ordem do que SEMPRE extrair, acima, é ordem de PRIORIDADE do que entra, não roteiro de campos. Ela decide o que sobrevive ao corte, e o texto sai em frases encadeadas.

```
09.09.2026 (P): Caso de B31, operou a coluna lombar em 21/08 com o Dr. André,
descompressão por cânula. Fica em pé "dois ou três minutos", dor que "queima
como fogo", não toma banho sozinha, usa pregabalina e codeína. O relatório
está com a data da cirurgia errada, consta 21/09, e assim gera indeferimento.
Pediu o relatório corrigido, aceito digital, e o documento de identificação.
Não usaremos a carta pré-cirúrgica. Expliquei que a deficiência visual não
gera aposentadoria PCD agora, faltam os 15 anos na condição. Protocolar com
perícia em Monte Alto. Verificar em 18/09.
```

O alerta `⚠️` fica reservado ao que trava o protocolo ou faz perder prazo, e vai na frente da frase que o descreve, nunca como rótulo de campo.

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
