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
