# Padrão de Anotação Extraído do To Do do Escritório

Onda 125 (09/09/2026). Análise do backup `backup_microsoft_todo_20260711.json`, com 38 listas e 4.114 tarefas, cruzada com o CRM em `paulotercini.github.io/marketplaceterciniinss/crm` e com os dados mínimos da `triagem-caso-novo`.

Este arquivo registra PADRÕES e CONTAGENS. Nenhum dado de cliente foi transportado para cá.

## Volume por lista de atendimento

| Lista | Tarefas |
|---|---|
| 🙋 Escritório | 628 |
| 👪 Judicial | 421 |
| 🙏 Aposentadorias Futuras | 405 |
| 🖥 Conselho de Recursos | 404 |
| 🗓 Tarefas com Prazo | 245 |
| 🌻 INSS | 172 |

Nas cinco listas de atendimento há 1.884 notas com conteúdo e 2,66 milhões de caracteres, distribuídos em 27.872 linhas.

## Achado central, o registro é datado e assinado

**13.992 linhas começam com data** no formato `DD.MM.AAAA` ou `DD/MM/AAAA`. Este é o padrão dominante e não admite exceção.

**Marcadores de autoria**, contados no acervo inteiro.

| Marcador | Ocorrências | Pessoa |
|---|---|---|
| `(P):` | 10.043 | Paulo |
| `(A):` | 3.222 | Amanda |
| `(M):` | 2.561 | Marcos |
| `(D):` | 1.536 | André |
| `(I):` | 319 | Ingrid |
| `(C):` | 289 | Claude |
| `(L):` | 31 | ex-colaboradora, histórico |

A atribuição das letras foi confirmada no seletor de equipe do CRM.

Padrão de diálogo na mesma linha, frequente. `(A): Protocolados. (P): Ok, verificar se teve o pagamento em 10/07.` A resposta do sócio entra na MESMA linha da informação, não em linha nova.

## Cabeçalho estruturado

Usado nas listas Judicial e INSS, com 305 blocos `HISTÓRICO` e 760 linhas separadoras.

```
[PROCESSO]: 
[SISTEMA]: MEUINSS ou PAT/GERID
[DER]: DD/MM/AAAA
[DISTRIBUIÇÃO]: DD/MM/AAAA
———————————————————————————
HISTÓRICO:
———————————————————————————
```

Campos entre colchetes mais usados. `[ALERTA URGENTE]` 454, `[DER]` 307, `[SISTEMA]` 305, `[TAREFA]` 176, `[PROCESSO]` 127, `[DISTRIBUIÇÃO]` 127, `[LOCALIZACAO]` 69.

## Fechamento com data, o traço mais forte

| Expressão | Ocorrências |
|---|---|
| Verificar em/até | 1.031 |
| Aguardar até | 618 |
| Cobrar | 104 |
| Ligar para | 99 |
| Prazo é/até | 36 |

Somadas, mais de 1.600 anotações terminam marcando QUANDO voltar ao caso. É a assinatura operacional do escritório, e a skill a torna obrigatória.

## Vocabulário do caso, frequência nas notas de atendimento

| Termo | Ocorrências |
|---|---|
| perícia | 2.064 |
| DER | 1.778 |
| recurso | 1.513 |
| aposentadoria | 1.436 |
| RG | 1.130 |
| PPP | 896 |
| senha | 638 |
| auxílio | 576 |
| protocolo | 543 |
| laudo | 461 |
| endereço | 446 |
| prazo | 444 |
| exigência | 402 |
| especial | 400 |
| indeferi(mento) | 386 |
| RMI | 333 |
| CTPS | 326 |
| CNIS | 302 |
| procuração | 273 |
| CPF | 270 |

Leitura. Perícia, DER, recurso e aposentadoria dominam. RG, endereço, senha e procuração aparecem muito porque o atendimento também COLETA documento e acesso, e a skill trata isso como item a listar, não como narrativa.

## Rótulos de seção usados no corpo

`ENCAMINHAMENTO` 143, `CONSIDERAÇÕES` 92, `ATUAL ANDAMENTO` 91, `LOCALIZAÇÃO` 90, `ATITUDE A SER TOMADA` 90, `ÚLTIMO EVENTO` 71, `SITUAÇÃO DO PROCESSO` 70, `OBS` 52, `REQUERIMENTO PROTOCOLADO` 41.

## Anatomia observada de um atendimento inicial

Sequência recorrente nas notas da lista Escritório, na ordem em que aparece.

1. Hipótese de benefício nomeada, no formato "trata-se de possível caso de X".
2. Idade e tempo de contribuição aproximado.
3. Descrição da limitação, com a EXPRESSÃO DO CLIENTE preservada entre aspas.
4. Origem do problema e histórico de tratamento, ou a ausência dele.
5. O que foi orientado e o que foi solicitado ao cliente.
6. Encaminhamento com data de verificação.

A ordem importa. A hipótese vem PRIMEIRO, porque é ela que orienta a leitura do resto.

## Regras derivadas, aplicadas na skill

Anotação registra decisão e próximo passo, não narrativa. Linha que não muda decisão, não define prazo, não registra fato do caso e não pede documento, não entra.

Toda anotação termina com data de retorno.

A expressão do cliente sobre a própria limitação se preserva, porque é linguagem de leigo que a perícia depois confronta e que alimenta o relatório médico.

Histórico em ordem decrescente, entrada nova no topo, entrada anterior intocada.

Hipótese de benefício é hipótese. Certeza vem do CNIS e dos documentos.

## Origem dos rótulos do formato por itens (Onda 126)

O formato de saída por ITENS não inventou vocabulário. Os rótulos vêm da contagem de uso real no acervo, na seção "Rótulos de seção usados no corpo" acima.

| Rótulo do formato | Origem no acervo |
|---|---|
| `ATITUDE A SER TOMADA` | 90 ocorrências, uso literal |
| `ENCAMINHAMENTO` | 143 ocorrências, uso literal |
| `CONSIDERAÇÕES` | 92 ocorrências, uso literal |
| `ÚLTIMO EVENTO` | 71 ocorrências, uso literal |
| `SITUAÇÃO DO PROCESSO` | 70 ocorrências, uso literal |
| `VERIFICAR EM` | 1.031 ocorrências de "Verificar em/até", convertidas em rótulo |
| `HIPÓTESE` | Derivado do padrão de abertura "trata-se de possível caso de X" |
| `QUADRO` | Derivado da descrição da limitação com a fala do cliente |
| `SOLICITADO` e `ORIENTADO` | Derivados do passo 5 da anatomia observada |
| `⚠️ PENDÊNCIA` | Derivado de `[ALERTA URGENTE]`, 454 ocorrências |

Por que a mudança. A primeira versão da skill produzia parágrafo corrido, fiel às notas mais antigas da lista Escritório. As notas das listas Judicial e INSS, porém, JÁ usam rótulos, e são as mais organizadas do acervo. O formato por itens generaliza a prática melhor do próprio escritório, e responde à diretriz de leitura por relance das Ondas 104 e 118.

Regra de forma. Uma a duas linhas por item, máximo de oito itens, rótulo sem conteúdo não entra. O que exceder oito itens é narrativa disfarçada de estrutura.

## Duas grafias de data no acervo (Onda 127, 09/09/2026)

Contagem sobre as 27.872 linhas de Notes do backup, separando o carimbo de abertura das datas citadas no corpo do texto.

| Posição | Com PONTO `DD.MM.AAAA` | Com BARRA `DD/MM/AAAA` |
|---|---|---|
| Abertura da linha, ao lado do marcador de autoria | **17.272** | 1.003 |
| Dentro do conteúdo dos itens | 895 | **8.907** |

A separação é praticada pelo escritório há anos, sem nunca ter sido escrita. Abertura em ponto, conteúdo em barra. A proporção de 17 para 1 na abertura e de 10 para 1 no conteúdo afasta a hipótese de coincidência.

Razão funcional. O carimbo de entrada precisa ser localizável de relance dentro de um histórico longo em ordem decrescente. Grafia distinta faz o olho separar o marco temporal da entrada das datas de fato, sem ler o texto.

Confirmação independente. O cabeçalho estruturado do escritório já emprega `[DER]: DD/MM/AAAA` e `[DISTRIBUIÇÃO]: DD/MM/AAAA`, ambos dados de conteúdo, ambos em barra.

Exemplos colhidos no próprio backup. Abertura `10.07.2026 (D):`, conteúdo `Verificar em 02/07`, `Prazo é 10/10` e `agenda horário para o dia 15/07`.

## A voz real da anotação (Onda 128, 09/09/2026) — CORREÇÃO da Onda 126

Medição sobre as **15.147 entradas datadas** com conteúdo na mesma linha.

**Rótulo em caixa alta aparece em 11 entradas, 0,1% do total.** As 143 ocorrências de `ENCAMINHAMENTO`, 92 de `CONSIDERAÇÕES` e 90 de `ATITUDE A SER TOMADA` contadas na Onda 125 estavam em linhas SEPARADAS de bloco processual estruturado, e não em anotação de atendimento. A Onda 126 leu essas contagens como se fossem o padrão da anotação e converteu a exceção em regra. Erro corrigido aqui.

**Extensão.** Mediana de 10 palavras por entrada, média de 16, percentil 90 em 34. O bloco por rótulos gerado na Onda 126 tinha 120 palavras, três vezes e meia o percentil 90.

**Traços medidos da voz.**

| Traço | Ocorrências | % |
|---|---|---|
| Verbo de ação no próprio texto, aguardar, acompanhar, verificar, cobrar, ligar, agendar | 3.745 | 24,7% |
| Dois ou mais marcadores de autoria na MESMA entrada, um respondendo ao outro | 2.142 | 14,1% |
| Fala direta com colaborador pelo nome, "Amanda,", "Marcão," | 816 | 5,4% |
| Menção a anexo | 584 | 3,9% |
| Protocolo ou NB inline | 362 | 2,4% |
| Encerramento explícito da tarefa | 221 | 1,5% |
| Valor em reais inline | 239 | 1,6% |

**Amostras que fixam a forma.**

`23.02.2026 (P): A sentença foi de improcedência. A única matéria tratada na revisão foi a RVT. Gratuidade deferida. Nada a ser feito. Tarefa encerrada.`

`14.01.2026 (P): Amanda, avisa a cliente que pode ir no Banco Itaú sacar os atrasados que serão R$12.406,97 a partir do dia 19/01. (...) Também agenda atendimento para o dia 21/01.`

`09.10.2025 (D): Trouxe esses dois documentos anexados hoje ao escritório. (P): Amanda, junta esses dois documentos no pedido de benefício dele. Depois pode alterar a tarefa para o dia 14/10 para o André verificar.`

Lição para a manutenção da base. Contagem de rótulo isolada não prova padrão de forma. Antes de converter um achado numérico em regra, conferir em QUE POSIÇÃO do texto o achado aparece.

## Dois gêneros distintos de entrada (Onda 129, 09/09/2026) — CORREÇÃO da Onda 128

A Onda 128 acertou ao derrubar os rótulos, e errou ao aplicar à transcrição de atendimento a estatística das notas de andamento. São gêneros diferentes.

**Gênero A, nota de andamento.** É o que domina o acervo. Mediana de 10 palavras. Registra um fato processual e o próximo passo. `A sentença foi de improcedência. Gratuidade deferida. Tarefa encerrada.`

**Gênero B, anotação de atendimento.** São as 482 entradas com 60 palavras ou mais. **Mediana de 83 palavras, percentil 90 em 131, máximo de 226.** O teto de 60 palavras fixado na Onda 128 ficava abaixo da própria mediana do gênero, e estrangulava o texto.

Alvo fixado para a transcrição de atendimento, **80 a 140 palavras em blocos temáticos**.

### Traços da voz, com o que o acervo sustenta e o que não sustenta

Medição sobre as 482 entradas longas.

| Traço | Ocorrências | % | Situação |
|---|---|---|---|
| Primeira pessoa do advogado, "Orientei", "Expliquei", "Solicitei" | 44 | 9,1% | Sustentado |
| Fecho com data de retorno | 34 | 7,1% | Sustentado |
| Aspas na fala do cliente | 15 | 3,1% | Sustentado |
| Marca em caixa alta abrindo bloco, `ALERTA.`, `ATENÇÃO.` | 6 | 1,2% | Sustentado, e `ALERTA` aparece 473 vezes no acervo inteiro |
| Ênfase por caixa alta na palavra, `NÃO` | 118 no acervo | — | Sustentado |
| Abertura "Trata-se de" | 1 | 0,2% | NÃO sustentado pelo acervo |
| Verbo de relato, "Refere que" | 4 | 0,8% | NÃO sustentado pelo acervo |

**Por que os dois últimos entram mesmo assim.** O backup é quase inteiramente nota de andamento, e o gênero transcrição de atendimento completo mal existe nele, porque é justamente o que a skill está criando. Nesse gênero a voz é a do titular do escritório, e o exemplo canônico da SKILL.md é o padrão a replicar. O registro fica aqui para que ninguém, em auditoria futura, conclua que esses dois traços foram extraídos do acervo. Eles não foram.

**Lição de método.** Antes de aplicar uma estatística a um formato, verificar se a amostra pertence ao mesmo GÊNERO do texto que se quer produzir. Mediana de corpus heterogêneo não descreve nenhum dos seus gêneros.

## Estrutura decisória e os dois modos (Onda 131, 09/09/2026)

Análise do titular sobre o próprio padrão, conferida no acervo. Confirmada nos pontos verificáveis.

### A ordem é decisória, e a Onda 129 estava errada

Medição sobre as 7.893 entradas com marcador `(P)`.

| Forma de abertura | Ocorrências | % |
|---|---|---|
| Fato ou resultado, "Benefício indeferido", "Perícia agendada", "Não trouxe", "Verifiquei que" | 1.036 | 13,1% |
| "Trata-se de" ou "O cliente" | 90 | 1,1% |

Proporção de doze para um. A Onda 129 fixou "Trata-se de pedido de" como abertura canônica, e o acervo diz o contrário. Corrigido. A fórmula fica reservada ao atendimento INICIAL, onde a hipótese é a própria conclusão do dia.

### Demais traços conferidos

| Traço | Ocorrências | % das entradas (P) |
|---|---|---|
| Próxima ação com data, verificar, aguardar, relembrar, cobrar | 1.125 | 14,3% |
| Primeira pessoa, instrução dada | 663 | 8,4% |
| `Tarefa encerrada` | 203 | 2,6% |
| Preparação para ato crítico, perícia | 83 | 1,1% |
| `Nada a ser feito` | 18 | 0,2% |

### A regra central

Registrar DECISÃO, MOTIVO RELEVANTE, PROVA NECESSÁRIA e PRÓXIMO MOVIMENTO. Frase que não move um dos quatro é dispensável. Este teste substitui a contagem de palavras como critério de corte, e a faixa de extensão passa a ser referência, não regra.

### Dois modos, porque são dois gêneros

Modo A, corrido decisório, para acompanhamento. É o dominante no acervo.

Modo B, com FATOS, ANÁLISE e PROVIDÊNCIAS, para consulta inicial, triagem e planejamento. Proposto pelo titular em 09/09/2026. Os rótulos `FATOS` e `PEDIDOS` já aparecem 8 vezes cada no acervo, em bloco de parecer.

Três correções aplicadas ao modelo proposto. ANÁLISE abre pela CONCLUSÃO e não pelo raciocínio. FATOS recebe só o apurado, sem juízo, porque "vínculo provavelmente deverá ser excluído" é análise disfarçada de fato. E o fecho com data de retorno é obrigatório também no Modo B, que tende a omiti-lo porque PROVIDÊNCIAS parece fechamento e não é.

### Cortes acrescentados

Explicação repetida ao cliente, detalhe pessoal que não altera requisito ou estratégia, e ato burocrático já refletido no andamento. Nada mudando, `Não retornou. Aguardar até DD/MM.` basta.
