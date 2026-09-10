---
name: transcricao-atendimento
description: "Converte transcrição de atendimento (áudio, vídeo, WhatsApp ou anotação corrida) na anotação padronizada do escritório, pronta para o Microsoft To Do. Use SEMPRE que receber transcrição de atendimento, gravação de consulta, áudio de cliente, conversa de WhatsApp com cliente, resumo de reunião com segurado, ou anotação bruta a transcrever. Produz ANOTAÇÃO DECISÓRIA, não ata. Registra decisão, motivo relevante, prova necessária e próximo movimento, e corta toda frase que não move um desses quatro. Dois modos. Modo A corrido decisório para acompanhamento, em blocos de prosa abrindo pelo fato ou resultado. Modo B com FATOS, ANÁLISE e PROVIDÊNCIAS para consulta inicial, triagem e planejamento. Nos dois, ANÁLISE abre pela conclusão, FATOS não recebe juízo, e o fecho com data de retorno é obrigatório. Linha datada em DD.MM.AAAA (X), datas de conteúdo em DD/MM. Conclui por encerrar quando a prova não sustenta. NÃO grava sozinha. Cruza com triagem-caso-novo e atendimento-respostas-padrao."
---

# Transcrição de Atendimento

Converte o que foi FALADO em atendimento na anotação que o escritório efetivamente usa. A saída é texto pronto para colar no Microsoft To Do, nunca um resumo livre.

## Base empírica desta skill

O padrão abaixo NÃO foi inventado. Saiu da análise do backup de 4.114 tarefas do To Do do escritório, cruzada com a `triagem-caso-novo` e com o CRM. Os números aparecem em `references/PADRAO-EXTRAIDO-DO-TODO.md`.

O que a análise mostrou, em uma frase. O escritório registra DECISÃO e PRÓXIMO PASSO COM DATA, não narrativa.

## Regra de ouro, o teste dos quatro elementos

A anotação não existe para narrar o atendimento. Existe para deixar o caso OPERACIONALMENTE RETOMÁVEL, de modo que meses depois se saiba o que foi decidido, por quê, e o que precisa acontecer em seguida.

Daí a regra central. Registrar DECISÃO, MOTIVO RELEVANTE, PROVA NECESSÁRIA e PRÓXIMO MOVIMENTO. Frase que não altera nenhum dos quatro é dispensável.

**Teste de corte, obrigatório antes de entregar.** Passar frase a frase e perguntar qual dos quatro elementos ela move. Não movendo nenhum, cortar. Este teste vale mais que qualquer contagem de palavras, e é ele que decide a extensão final.

Faixa de referência, não camisa de força. Atendimento de rotina fica entre oitenta e cento e quarenta palavras. Consulta inicial ou de planejamento, com projeção de renda e comparação de cenários, sobe até duzentas e quarenta. Passou disso sem que cada frase mova um dos quatro elementos, virou ata.

## Ordem decisória, e não narrativa

A entrada abre pelo FATO OU RESULTADO relevante, ou pela CONCLUSÃO que muda a estratégia. Medido no acervo, 13,1% das entradas do titular abrem assim, contra 1,1% que abrem por "Trata-se de", proporção de doze para um.

`Benefício indeferido.` `Perícia agendada.` `Não trouxe o relatório médico.` `Verifiquei que já teve processo judicial com trânsito em julgado.`

Abertura pela hipótese, na forma "Trata-se de pedido de" ou "Caso de", cabe SOMENTE em atendimento inicial, e ali é legítima porque a hipótese é a própria conclusão do dia. Em atendimento de acompanhamento, abrir pelo fato novo.

Depois da abertura vem a leitura técnica, e ela registra a CONSEQUÊNCIA PRÁTICA, não a fundamentação. Descoberta a coisa julgada sobre períodos especiais, escreve-se que só resta a aposentadoria por idade, e não a teoria da coisa julgada.

## O que SEMPRE extrair

Oito grupos. Entram os que o atendimento alimentar, na ordem em que decidem.

**1. Situação atual do benefício ou do processo.** O fato ou resultado que abre a entrada.

**2. Conclusão técnica que muda a estratégia.** Só a consequência prática. Sem fundamentação extensa, que é da peça e do parecer, não do To Do.

**3. Obstáculo ou risco principal.** É aqui que se preserva o RACIOCÍNIO, e só aqui. Havendo escolha estratégica ou risco relevante, como o de revisão integral do benefício ao pedir revisão, registrar o motivo da decisão, porque sem ele a decisão fica irretomável.

**4. Documento ou prova que falta.** Não basta nomear o documento. Dizer o que ele precisa DEMONSTRAR.

**5. Providência já realizada.** O que o escritório fez, em primeira pessoa.

**6. Instrução dada ao cliente ou à equipe.** Chamar o colaborador pelo nome quando a tarefa é dele. Antes de ato crítico, como perícia, registrar o que o cliente deve levar e como deve comparecer, porque atendimento também é PREPARAÇÃO para o próximo ato.

**7. Próxima ação, com data.** Fechamento obrigatório, salvo encerramento. "Verificar em DD/MM", "Aguardar até DD/MM", "Relembrar em DD/MM", "Cobrar em DD/MM". Presente em 14,3% das entradas do titular, e é o elemento mais constante do sistema.

**8. Números decisivos**, em atendimento inicial ou de planejamento. Idade, tempo apurado, data provável de aposentadoria, valor aproximado do benefício e a diferença econômica entre alternativas, quando ela interfere na escolha. Sem número, o cenário não se retoma.

## A tese que não se força

O escritório conduz o caso por DECISÃO PROGRESSIVA. Identifica o benefício possível, procura o obstáculo dominante, pede a prova, aguarda e reavalia. Não tenta resolver tudo no primeiro contato.

Sendo a prova insuficiente, a anotação conclui por ENCERRAR, e isso é resultado legítimo, não fracasso. `Tarefa encerrada` aparece em 2,6% das entradas do titular.

`O PPP não favorece para pedir a revisão. Tarefa encerrada.`
`Tem algo relacionado a depressão. Não tem carência. Nada a ser feito.`

Encerrando, NÃO inventar data de retorno. Anotação encerrada dispensa o fechamento do grupo 7.

## O que NUNCA entra

Cumprimento, conversa fiada, repetição do que o cliente falou três vezes.

Diagnóstico jurídico definitivo dado como certeza. Atendimento gera HIPÓTESE, e a certeza vem depois do CNIS e dos documentos.

Cálculo de tempo, RMI ou valor. Isso é do Prévius, regra 6 do protocolo.

Promessa de resultado ao cliente.

Dado sensível que o cliente pediu sigilo e que não afeta o caso.

Explicação repetida ao cliente. O que foi explicado entra uma vez, como instrução, e não como transcrição do diálogo.

Detalhe pessoal que não altera requisito, prova ou estratégia. Família, planos de vida, conversa de circunstância. Por mais que ocupem metade do atendimento, não movem nenhum dos quatro elementos.

Ato burocrático já refletido no andamento do processo ou do requerimento. Se o sistema mostra, a anotação não precisa repetir. Nada mudando, `Não retornou. Aguardar até DD/MM.` basta.

## Dois modos, escolhidos pelo gênero do atendimento

**Modo A, corrido decisório.** Padrão do dia a dia, para acompanhamento, retorno, cobrança e cumprimento de exigência. Blocos temáticos de prosa em ordem decisória, abrindo pelo fato ou resultado. É o que o acervo pratica.

**Modo B, FATOS, ANÁLISE e PROVIDÊNCIAS.** Para consulta inicial, triagem e planejamento, onde entra muito dado novo de uma vez e há comparação de cenários. Três rótulos, nunca mais que três. Cabe porque nesse gênero a separação entre o que foi apurado, o que se concluiu e o que se vai fazer é justamente o que se retoma meses depois.

Regra de escolha. Havendo cenários a comparar ou apuração inicial de vida contributiva, Modo B. Havendo um fato novo em caso já conhecido, Modo A. Na dúvida, Modo A, porque é o dominante.

**Três exigências que valem nos dois modos.**

Primeira, ANÁLISE abre pela CONCLUSÃO, não pelo raciocínio. Escreve-se qual caminho é o melhor e só então por quê. Conclusão enterrada no meio do bloco obriga a reler tudo.

Segunda, FATOS recebe só o apurado, e nunca juízo. "Vínculo de 1999 provavelmente deverá ser excluído" é análise disfarçada de fato, e o lugar dela é o bloco seguinte.

Terceira, o fecho com data de retorno é obrigatório também no Modo B, em linha própria depois de PROVIDÊNCIAS. É o elemento mais constante do sistema, presente em 14,3% das entradas, e o Modo B tende a esquecê-lo porque PROVIDÊNCIAS já parece um fechamento. Não é. Providência sem data não é cobrada.

```
09.09.2026 (P):
FATOS: 43 anos e 3 meses, 26 anos e 7 meses de contribuição, 23 anos e 10
meses de atividade especial na projeção atual. Vínculos antigos sem data de
saída e um vínculo de 1999 em duplicidade. Tem a CTPS física. PPP eletrônico
a partir de 2023 aponta ruído de 94 dB. Refere hérnia de disco com episódios
de limitação funcional.
ANÁLISE: O melhor caminho tende a ser a aposentadoria da pessoa com
deficiência, projetada em R$ 5.800,00 e sem exigir afastamento do trabalho,
desde que haja prova antiga e atual da deficiência leve. A data de início da
deficiência decide a contagem. A especial fica como alternativa, projetada em
R$ 4.500,00, faltando 1 ano e 1 mês para os 25 anos, com requerimento
possível em outubro de 2027 se o PPP confirmar os períodos anteriores.
PROVIDÊNCIAS: Solicitar PPP no RH. Conferir e corrigir os vínculos do CNIS
pela CTPS. Buscar exames antigos da coluna, tomografia ou ressonância, e não
havendo, refazer e passar em ortopedista para relatório que detalhe as
limitações. Revisar a contagem quando chegarem PPP e documentos médicos, e só
então definir a via.
Verificar em 09/10.
```

## Formato de saída

Sempre em dois blocos. O primeiro é a anotação, escrita em BLOCOS TEMÁTICOS de prosa, um assunto por bloco, separados por quebra de linha.

### Bloco 1, a anotação pronta para o To Do

Abre com a linha datada e o texto SEGUE NA MESMA LINHA, logo após o marcador.

Data de abertura em DD.MM.AAAA com PONTOS, marcador de autoria entre parênteses. `(P)` Paulo, `(A)` Amanda, `(D)` André, `(I)` Ingrid, `(M)` Marcos, `(C)` Claude. A transcrição usa o marcador de QUEM ATENDEU, nunca `(C)`, que é reservado à conclusão produzida pelo Claude na forma da regra 1 do protocolo.

**Duas grafias de data.** A data que CARIMBA a entrada usa PONTOS no padrão `DD.MM.AAAA`. Toda data citada DENTRO do texto usa BARRAS, abreviada para `DD/MM` quando o ano é o corrente. O acervo pratica isso com 17.272 aberturas em ponto contra 8.907 datas de conteúdo em barra.

**Extensão, medida no gênero certo.** As 482 entradas longas do acervo, que são as de atendimento, têm mediana de 83 palavras, percentil 90 em 131 e máximo de 226. Este é o alvo, e não a mediana de 10 palavras das notas de andamento processual, que são outro gênero. Atendimento de rotina cabe entre OITENTA e CENTO E QUARENTA palavras. Consulta longa de triagem ou de planejamento, com projeção de renda, comparação de cenários e definição de estratégia, sobe até DUZENTAS E QUARENTA, que é a faixa do exemplo canônico abaixo e do máximo real do acervo. Abaixo do piso some informação do caso, acima do teto vira ata.

**Blocos temáticos, não campos rotulados.** Cada assunto fecha em seu bloco e o bloco seguinte abre outro assunto. Quebra de linha entre eles. NÃO usar rótulo de campo em caixa alta seguido de dois-pontos, porque isso aparece em 0,1% das entradas do acervo e descaracteriza a anotação. A ordem dos blocos é a ordem de PRIORIDADE do que SEMPRE extrair, acima.

**A voz.**

Primeiro, abertura pelo FATO OU RESULTADO, ou pela conclusão que muda a estratégia, na forma da seção Ordem decisória. Só em atendimento inicial cabe abrir pela hipótese, com "Trata-se de pedido de" ou "Caso de", porque ali a hipótese é a conclusão do dia.

Segundo, verbo de relato para o que veio do cliente. "Refere que", "Traz também", "Informa que". Marca a fronteira entre o que o cliente disse e o que o escritório apurou, e é o que a perícia depois vai confrontar.

Terceiro, primeira pessoa para o que o escritório fez. "Orientei", "Expliquei", "Solicitei", "Pedi". Presente em 9,1% das entradas longas do acervo.

Quarto, MARCA EM CAIXA ALTA abrindo o bloco que trava o protocolo ou faz perder prazo, seguida de ponto. `PROBLEMA NO DOCUMENTO.`, `ALERTA.`, `ATENÇÃO.`. Uma por anotação, no máximo duas, e o acervo já as usa.

Quinto, ênfase por caixa alta na palavra que vira a frase, e o acervo traz 118 casos de `NÃO` assim.

Sexto, aspas na fala do cliente, e SOMENTE quando ela descreve a limitação melhor que o termo técnico e a limitação altera a estratégia. Diagnóstico e sintoma que não mudam a prova, a via ou o prazo ficam de fora, por mais vívidos que sejam.

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
