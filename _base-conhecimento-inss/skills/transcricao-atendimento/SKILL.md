---
name: transcricao-atendimento
description: "Converte transcrição de atendimento (áudio, vídeo, WhatsApp ou anotação corrida) na anotação padronizada do escritório, pronta para o Microsoft To Do. Use SEMPRE que receber transcrição de atendimento, gravação de consulta, áudio de cliente, conversa de WhatsApp com cliente, resumo de reunião com segurado, ou anotação bruta a transcrever. Produz ANOTAÇÃO DECISÓRIA, não ata. Registra decisão, motivo relevante, prova necessária e próximo movimento, e corta toda frase que não move um desses quatro. Sai em até QUATRO BLOCOS rotulados e OPCIONAIS, FATOS, ANÁLISE, PROVIDÊNCIAS DO CLIENTE e PROVIDÊNCIAS DO ESCRITÓRIO, cada bloco em UMA LINHA CORRIDA sem quebra, sob linha datada em DD.MM.AAAA (X) com datas de conteúdo em DD/MM. Bloco sem conteúdo novo não entra. Fecha com data de retorno. Conclui por encerrar quando a prova não sustenta a tese. NÃO grava sozinha. Cruza com triagem-caso-novo, processos-amanda-administrativo e atendimento-respostas-padrao."
---

# Transcrição de Atendimento

Converte o que foi FALADO em atendimento na anotação que o escritório efetivamente usa. A saída é texto pronto para colar no Microsoft To Do, nunca um resumo livre.

## Regra de ouro, o teste dos quatro elementos

A anotação não existe para narrar o atendimento. Existe para deixar o caso OPERACIONALMENTE RETOMÁVEL, de modo que meses depois se saiba o que foi decidido, por quê, e o que precisa acontecer em seguida.

Daí a regra central. Registrar DECISÃO, MOTIVO RELEVANTE, PROVA NECESSÁRIA e PRÓXIMO MOVIMENTO. Frase que não altera nenhum dos quatro é dispensável.

**Teste de corte, obrigatório antes de entregar.** Passar frase a frase e perguntar qual dos quatro elementos ela move. Não movendo nenhum, cortar. Este teste decide a extensão, e não o contrário. Anotação de acompanhamento fica em duas linhas, consulta inicial de planejamento chega a doze, e ambas estão certas se cada frase passou no teste.

## Formato de saída

Quatro blocos rotulados, todos OPCIONAIS. Entra o bloco que tiver conteúdo novo, na ordem abaixo.

**Rótulo em caixa alta seguido de dois-pontos, e o conteúdo na MESMA LINHA.** Exceção admitida à vedação geral de dois-pontos, porque campo estruturado não é prosa.

**Cada bloco ocupa UMA LINHA CORRIDA, sem quebra interna.** A quebra de linha separa um bloco do outro, e nada mais. Texto quebrado artificialmente polui a leitura no To Do.

| Bloco | O que recebe |
|---|---|
| `FATOS` | Só o objetivo e apurado. Situação contributiva, benefício, processo, documentos existentes, datas, resultado de perícia, conteúdo relevante de PPP, CNIS e laudo, o que o cliente informou e os eventos já ocorridos |
| `ANÁLISE` | A leitura técnica e estratégica. Direito possível, impedimento, risco, documento decisivo, tese principal, alternativa subsidiária, motivo para aguardar ou não requerer, impacto de determinada prova |
| `PROVIDÊNCIAS DO CLIENTE` | Tudo que depende dele. Conseguir PPP, relatório médico, CTPS, comprovante, senha do Gov.br, comparecer à perícia, falar com o RH, localizar exame antigo, retornar informação |
| `PROVIDÊNCIAS DO ESCRITÓRIO` | Tudo que depende do escritório. Conferir CNIS, calcular, protocolar, cobrar empresa, juntar documentos, revisar PPP, recorrer, avisar o cliente, acompanhar resultado e a data de nova verificação |

### As cinco regras que fazem o formato funcionar

**Primeira, bloco vazio não entra.** Registro simples de acompanhamento tem dois blocos e acabou. Criar `ANÁLISE` sem conclusão nova, ou `PROVIDÊNCIAS DO CLIENTE` sem nada a pedir, é preencher formulário, não registrar caso.

**Segunda, `FATOS` não recebe juízo.** "Vínculo de 1999 provavelmente deverá ser excluído" é análise disfarçada de fato, e o "provavelmente" pertence ao bloco seguinte. Em `FATOS` vai o que se viu, em `ANÁLISE` o que se concluiu.

**Terceira, `ANÁLISE` abre pela CONCLUSÃO.** Qual o melhor caminho, e só então por quê. Conclusão enterrada no meio do bloco obriga a reler tudo. E registra-se a CONSEQUÊNCIA PRÁTICA, não a fundamentação. Descoberta a coisa julgada sobre períodos especiais, escreve-se que só resta a aposentadoria por idade, não a teoria da coisa julgada, que é da peça e do parecer.

**Quarta, a separação entre as duas providências é a razão de ser do formato.** Ela não vem de frequência no acervo, vem de projeto. Anotação como "PPP incompleto, pedir correção, aguardar até 29/03" empacota conclusão, tarefa do cliente e tarefa interna numa frase só, e obriga quem retoma a desempacotar. Separadas, a equipe lê o bloco que é dela sem varrer o resto.

**Quinta, a data de retorno é obrigatória**, salvo encerramento. Fecha `PROVIDÊNCIAS DO ESCRITÓRIO`, porque controlar prazo é tarefa interna. "Verificar em DD/MM", "Aguardar até DD/MM", "Relembrar em DD/MM", "Cobrar em DD/MM". Presente em 14,3% das entradas do titular, é o elemento mais constante do sistema. Anotação sem data de retorno é anotação que morre.

### A linha de abertura

Data em DD.MM.AAAA com PONTOS, marcador de autoria entre parênteses. `(P)` Paulo, `(A)` Amanda, `(D)` André, `(I)` Ingrid, `(M)` Marcos, `(C)` Claude. A transcrição usa o marcador de QUEM ATENDEU, nunca `(C)`, que é reservado à conclusão produzida pelo Claude na forma da regra 1 do protocolo.

**Duas grafias de data.** O carimbo da entrada usa PONTOS em `DD.MM.AAAA`. Toda data citada DENTRO do texto usa BARRAS, abreviada para `DD/MM` quando o ano é o corrente. O acervo pratica isso com 17.272 aberturas em ponto contra 8.907 datas de conteúdo em barra.

**Ordem do histórico, DECRESCENTE.** Entrada nova no TOPO, entrada anterior intocada.

### Registro completo, consulta inicial

```
09.09.2026 (P):
FATOS: 43 anos e 3 meses, 26 anos e 7 meses de contribuição e 23 anos e 10 meses de atividade especial na projeção atual. Vínculos antigos sem data de saída e um vínculo de 1999 em duplicidade. Tem a CTPS física. PPP eletrônico a partir de 2023 aponta ruído de 94 dB. Informa hérnia de disco com episódios de limitação funcional.
ANÁLISE: O melhor caminho tende a ser a aposentadoria da pessoa com deficiência, projetada em R$ 5.800,00 e sem exigir afastamento do trabalho, desde que haja prova antiga e atual da deficiência leve. A data de início da deficiência decide a contagem. A especial fica como alternativa, projetada em R$ 4.500,00, faltando 1 ano e 1 mês para os 25 anos, com requerimento possível em outubro de 2027 se o PPP confirmar os períodos anteriores.
PROVIDÊNCIAS DO CLIENTE: Solicitar o PPP no RH. Trazer a CTPS física. Procurar exames antigos da coluna, tomografia ou ressonância, e não localizando, refazer o exame e passar em ortopedista para relatório que detalhe as limitações.
PROVIDÊNCIAS DO ESCRITÓRIO: Conferir e corrigir os vínculos do CNIS pela CTPS. Revisar a contagem quando chegarem o PPP e os documentos médicos, e só então definir a via. Verificar em 09/10.
```

### Registro simples, acompanhamento

```
09.09.2026 (P):
FATOS: Cliente ainda não apresentou o PPP.
PROVIDÊNCIAS DO ESCRITÓRIO: Aguardar até 23/09.
```

### Cabeçalho estruturado

Havendo processo ou requerimento em curso, vem ANTES da linha datada.

```
[PROCESSO]: 
[SISTEMA]: MEUINSS ou PAT/GERID
[DER]: DD/MM/AAAA
[DISTRIBUIÇÃO]: DD/MM/AAAA
———————————————————————————
HISTÓRICO:
———————————————————————————
```

## A voz dentro dos blocos

Primeiro, primeira pessoa para o que o escritório fez ou decidiu. "Orientei", "Expliquei", "Solicitei", "Verifiquei". Presente em 8,4% das entradas do titular.

Segundo, chamar o colaborador pelo nome quando a tarefa é dele, dentro de `PROVIDÊNCIAS DO ESCRITÓRIO`. "Amanda, junta os documentos no pedido dele."

Terceiro, ênfase por CAIXA ALTA na palavra que vira a frase, e o acervo traz 118 casos de `NÃO` assim.

Quarto, aspas na fala do cliente SOMENTE quando ela descreve a limitação melhor que o termo técnico E a limitação altera a estratégia. Diagnóstico e sintoma que não mudam prova, via ou prazo ficam de fora, por mais vívidos que sejam.

Quinto, número concreto inline. Valor, protocolo, NB e tempo apurado entram no meio da frase, sem cerimônia.

Sexto, referência a anexo entre parênteses, na forma "(anexo)".

Sétimo, em atendimento inicial ou de planejamento, `FATOS` e `ANÁLISE` carregam os NÚMEROS DECISIVOS. Idade, tempo apurado, data provável de aposentadoria, valor aproximado do benefício e a diferença econômica entre alternativas quando ela interfere na escolha. Sem número, o cenário não se retoma.

## A tese que não se força

O escritório conduz o caso por DECISÃO PROGRESSIVA. Identifica o benefício possível, procura o obstáculo dominante, pede a prova, aguarda e reavalia. Não tenta resolver tudo no primeiro contato.

Sendo a prova insuficiente, a anotação conclui por ENCERRAR, e isso é resultado legítimo, não fracasso. `Tarefa encerrada` aparece em 2,6% das entradas do titular.

```
09.09.2026 (P):
FATOS: PPP recebido, sem registro de agente nocivo em nenhum período.
ANÁLISE: O PPP não favorece o pedido de revisão.
PROVIDÊNCIAS DO ESCRITÓRIO: Avisar o cliente. Tarefa encerrada.
```

Encerrando, NÃO inventar data de retorno.

## O que NUNCA entra

Cumprimento, conversa fiada, repetição do que o cliente falou três vezes.

Diagnóstico jurídico definitivo dado como certeza. Atendimento gera HIPÓTESE, e a certeza vem depois do CNIS e dos documentos.

Cálculo de tempo, RMI ou valor apresentado como definitivo. Isso é do Prévius, regra 6 do protocolo. Projeção de atendimento entra em `ANÁLISE` marcada como projeção.

Promessa de resultado ao cliente.

Dado sensível que o cliente pediu sigilo e que não afeta o caso.

Explicação repetida ao cliente. O que foi explicado entra uma vez, como orientação, e não como transcrição do diálogo.

Detalhe pessoal que não altera requisito, prova ou estratégia. Família, planos de vida, conversa de circunstância. Por mais que ocupem metade do atendimento, não movem nenhum dos quatro elementos.

Ato burocrático já refletido no andamento do processo ou do requerimento. Se o sistema mostra, a anotação não repete. Nada mudando, `FATOS: Não retornou.` e `PROVIDÊNCIAS DO ESCRITÓRIO: Aguardar até DD/MM.` bastam.

## Bloco 2, o controle interno

Não vai para o To Do. Segue a anotação, em itens curtos.

**Dito e não confirmado.** O que o cliente afirmou e ainda carece de documento. Distingue relato de prova, e evita que a peça seguinte trate um pelo outro.

**Projeção, não conferência.** Todo número que saiu de estimativa sem análise documento por documento, com o que falta conferir antes do protocolo.

**Faltou perguntar.** O que o atendimento deixou em aberto e será preciso no próximo contato. CPF e data de nascimento quando a tarefa ainda não existe, datas exatas de vínculo, existência de CAT, documentos que o cliente talvez tenha e não mencionou.

**Alerta de agenda.** Prazo, janela normativa ou perda de valor que dependa da data de retorno registrada.

## Base empírica

O padrão NÃO foi inventado. Saiu da análise do backup do To Do do escritório, com 15.147 entradas datadas, cruzada com a `triagem-caso-novo` e com o CRM. Os números e o histórico das correções estão em `references/PADRAO-EXTRAIDO-DO-TODO.md`.

Honestidade sobre a origem de cada regra. A ordem decisória, o fecho com data, a primeira pessoa, a ênfase por caixa alta e o encerramento por prova insuficiente estão MEDIDOS no acervo. A estrutura de quatro blocos rotulados é de PROJETO, definida pelo titular em 09/09/2026, e não decorre de frequência no backup, onde rótulo aparece em 0,1% das entradas. Ela entra porque resolve a retomada e a delegação, não porque o acervo a pratique.

## Cruzamentos

`base-protocolo-operacional-escritorio` para a regra 1, que rege a gravação no To Do.

`triagem-caso-novo` quando o atendimento for de caso novo e a anotação precisar da classificação do benefício.

`processos-amanda-administrativo` quando houver providência delegável.

`atendimento-respostas-padrao` quando o cliente trouxer consulta repetitiva com gatilho de escalação.
