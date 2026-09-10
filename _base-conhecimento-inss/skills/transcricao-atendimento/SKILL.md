---
name: transcricao-atendimento
description: "Converte transcrição de atendimento (áudio, vídeo, WhatsApp ou anotação corrida) na anotação padronizada do escritório, pronta para o Microsoft To Do. Use SEMPRE que receber transcrição de atendimento, gravação de consulta, áudio de cliente, conversa de WhatsApp com cliente, resumo de reunião com segurado, ou anotação bruta a transcrever. Extrai o que o escritório de fato registra, medido em 15.147 entradas reais do To Do. Entrega a anotação em BLOCOS TEMÁTICOS de prosa, um assunto por bloco, abrindo pela hipótese na forma "Trata-se de pedido de", verbo de relato para o que o cliente disse, primeira pessoa para o que o escritório fez, marca em CAIXA ALTA no bloco que trava o protocolo, entre 80 e 140 palavras, sob linha datada em DD.MM.AAAA (X) com datas de conteúdo em DD/MM. Sinaliza o não confirmado e o que faltou perguntar. NÃO grava sozinha. Cruza com triagem-caso-novo, processos-amanda-administrativo e atendimento-respostas-padrao."
---

# Transcrição de Atendimento

Converte o que foi FALADO em atendimento na anotação que o escritório efetivamente usa. A saída é texto pronto para colar no Microsoft To Do, nunca um resumo livre.

## Base empírica desta skill

O padrão abaixo NÃO foi inventado. Saiu da análise do backup de 4.114 tarefas do To Do do escritório, cruzada com a `triagem-caso-novo` e com o CRM. Os números aparecem em `references/PADRAO-EXTRAIDO-DO-TODO.md`.

O que a análise mostrou, em uma frase. O escritório registra DECISÃO e PRÓXIMO PASSO COM DATA, não narrativa.

## Regra de ouro

Anotação de atendimento não é ata. Se a linha não muda uma decisão, não define um prazo, não registra um fato do caso ou não pede um documento, ela NÃO entra.

Transcrição de trinta minutos vira, tipicamente, de oitenta a cento e quarenta palavras, distribuídas em quatro a oito blocos temáticos.

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

Sempre em dois blocos. O primeiro é a anotação, escrita em BLOCOS TEMÁTICOS de prosa, um assunto por bloco, separados por quebra de linha.

### Bloco 1, a anotação pronta para o To Do

Abre com a linha datada e o texto SEGUE NA MESMA LINHA, logo após o marcador.

Data de abertura em DD.MM.AAAA com PONTOS, marcador de autoria entre parênteses. `(P)` Paulo, `(A)` Amanda, `(D)` André, `(I)` Ingrid, `(M)` Marcos, `(C)` Claude. A transcrição usa o marcador de QUEM ATENDEU, nunca `(C)`, que é reservado à conclusão produzida pelo Claude na forma da regra 1 do protocolo.

**Duas grafias de data.** A data que CARIMBA a entrada usa PONTOS no padrão `DD.MM.AAAA`. Toda data citada DENTRO do texto usa BARRAS, abreviada para `DD/MM` quando o ano é o corrente. O acervo pratica isso com 17.272 aberturas em ponto contra 8.907 datas de conteúdo em barra.

**Extensão, medida no gênero certo.** As 482 entradas longas do acervo, que são as de atendimento, têm mediana de 83 palavras, percentil 90 em 131 e máximo de 226. Este é o alvo, e não a mediana de 10 palavras das notas de andamento processual, que são outro gênero. Atendimento de rotina cabe entre OITENTA e CENTO E QUARENTA palavras. Consulta longa de triagem ou de planejamento, com projeção de renda, comparação de cenários e definição de estratégia, sobe até DUZENTAS E QUARENTA, que é a faixa do exemplo canônico abaixo e do máximo real do acervo. Abaixo do piso some informação do caso, acima do teto vira ata.

**Blocos temáticos, não campos rotulados.** Cada assunto fecha em seu bloco e o bloco seguinte abre outro assunto. Quebra de linha entre eles. NÃO usar rótulo de campo em caixa alta seguido de dois-pontos, porque isso aparece em 0,1% das entradas do acervo e descaracteriza a anotação. A ordem dos blocos é a ordem de PRIORIDADE do que SEMPRE extrair, acima.

**A voz.**

Primeiro, abertura pela hipótese, na forma "Trata-se de pedido de", seguida do quadro que a sustenta, com o fato clínico ou jurídico e sua data.

Segundo, verbo de relato para o que veio do cliente. "Refere que", "Traz também", "Informa que". Marca a fronteira entre o que o cliente disse e o que o escritório apurou, e é o que a perícia depois vai confrontar.

Terceiro, primeira pessoa para o que o escritório fez. "Orientei", "Expliquei", "Solicitei", "Pedi". Presente em 9,1% das entradas longas do acervo.

Quarto, MARCA EM CAIXA ALTA abrindo o bloco que trava o protocolo ou faz perder prazo, seguida de ponto. `PROBLEMA NO DOCUMENTO.`, `ALERTA.`, `ATENÇÃO.`. Uma por anotação, no máximo duas, e o acervo já as usa.

Quinto, ênfase por caixa alta na palavra que vira a frase, e o acervo traz 118 casos de `NÃO` assim.

Sexto, aspas na fala do cliente que descreve limitação melhor que o termo técnico.

Sétimo, fecho em linha própria, "Verificar em DD/MM."

```
09.09.2026 (P): Trata-se de pedido de B31 por incapacidade pós-cirúrgica.
Cirurgia de coluna lombar em 21/08/2026 com o Dr. André, descompressão por
cânula com liberação do nervo ciático. Refere que só fica em pé "dois ou três
minutos", que "queima como fogo", não toma banho sozinha e depende do marido.
Em uso de pregabalina, Lisador e codeína. Médico indicou 6 meses de afastamento
e prevê 2 a 3 meses de recuperação.
PROBLEMA NO DOCUMENTO. O relatório do Dr. André, emitido em 03/09/2026, traz a
data da cirurgia como 21/09/2026, data futura e errada. O correto é 21/08/2026.
Protocolar assim gera indeferimento. Orientei a obter relatório corrigido, que
pode vir digital pelo celular.
Não usaremos a carta pré-cirúrgica anterior, e sim o relatório atual.
Traz também relatório oftalmológico com perda definitiva da visão do olho
esquerdo por insucesso cirúrgico, CID H54.4. Expliquei que a deficiência visual
sozinha NÃO gera aposentadoria PCD agora, porque faltam os 15 anos de
contribuição na condição de PCD, e que o caminho atual é a incapacidade.
Consulta de joelho com o Dr. Denis no fim de outubro.
Último benefício mantido até dezembro/2025, qualidade de segurada preservada.
Solicitei documento de identificação, pode ser a CNH. Orientei a não apresentar
a CNH na perícia.
Perícia será tentada em Monte Alto nesta primeira vez, porque cirurgia recente
dificulta a negativa.
Retorno com o Dr. André em 18/09 e nova consulta em 31/10.
Verificar em 18/09.
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

**Nota de honestidade sobre a base empírica.** Os traços quarto, quinto, sexto e sétimo estão medidos no acervo. Os traços primeiro, segundo e terceiro, na forma "Trata-se de" e "Refere que", aparecem em menos de 1% das entradas, porque o backup é quase todo NOTA DE ANDAMENTO e o gênero transcrição de atendimento completo mal existe nele. Nesse gênero a voz é a do titular do escritório, fixada no exemplo canônico acima, que é o padrão a replicar.

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
