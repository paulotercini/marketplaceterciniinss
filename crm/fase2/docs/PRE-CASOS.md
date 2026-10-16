# Pré-casos dentro de Casos (planejamento, 14.10.2026)

## 1. Conclusão

O pré-caso passa a ser uma linha da tabela `casos`, na fase Escritório, marcada como pré-caso, e deixa de viver como lista solta em `clientes.campos.precasos`. Cada benefício que o cliente busca é um pré-caso próprio, e cada pré-caso termina por um de três caminhos, **Arquivar**, **Aposentadorias futuras** ou **Gerar caso**. Gerar o caso é mudar a fase da mesma linha, de modo que anotações, documentos, tarefas e agendamentos do atendimento acompanham o caso sem cópia.

## 2. O problema de hoje

Em 08.99 a lista 🙋 Escritório deixou de criar caso, e a sincronização passou a gravar as notas da tarefa em `clientes.campos.atendimento` (origem `todo`) e os itens do checklist em `docs_pedidos` (`migrar.py`, bloco `novos_escr`). Em 14.10.2026 o banco tinha 72 clientes com notas vindas do To Do nesse campo, 10 clientes com pré-caso em `campos.precasos` e 76 casos antigos ainda na fase Escritório.

O resultado é que o mesmo atendimento aparece em três lugares diferentes, a ficha (anotações do cliente), a aba 🔔 Lembretes (o card da aposentadoria futura) e a seção "Casos antigos desta lista". O pré-caso, por ser um item de JSON dentro do cadastro, não tem `caso_id`, e por isso não recebe andamento, documento, tarefa nem agendamento. Foi essa ausência que gerou a lacuna da agenda corrigida na F225, porque a perícia ou o atendimento marcado para quem ainda não tem caso não tinha onde se prender.

## 3. Onde o pré-caso mora

A linha nova em `casos` recebe `fase = 'escritorio'` e a coluna `pre_caso boolean not null default false` (migração `schema_pre_caso.sql`). A espécie vai em `beneficio`, e o objeto que antes morava em `campos.precasos` (natureza, marcadores, honorários, via, código, etapas do atendimento, desfecho e card ligado) vai inteiro em `casos.precaso jsonb`, com o mesmo `id` (`pc_…`) que anotações e cards já citam.

Essa escolha aproveita o que o CRM já faz por caso. A F221 já ordena o Escritório como a fase menos adiantada (`ORDEM_FASE_ORG`), o "Levar a outro caso…" já move anotação entre casos do mesmo cliente, e a agenda, os documentos e as tarefas já se prendem por `caso_id`. Nenhuma dessas rotinas precisa conhecer o pré-caso como objeto à parte.

A alternativa de manter `campos.precasos` e apenas desenhá-los na divisão de casos foi descartada, porque obrigaria a escrever, para o pré-caso, a mesma ligação de anotações, documentos e agenda que o caso já tem.

## 4. Ciclo de vida

**Nascimento.** O pré-caso nasce em quatro portas, o Novo Cliente com benefício informado (`criarCliente`), o "+ atendimento" da ficha, o botão novo "＋ Pré-caso" no Casos ▾ do cliente (outro benefício para quem já é cliente) e a sincronização, quando a tarefa do 🙋 Escritório chega para cliente sem pré-caso vivo. Sem espécie conhecida, ele nasce como "Em formação" e recebe a espécie na Análise de Direito (`salvarAnalise` já devolve a espécie ao pré-caso).

**Atendimento.** Os quatro passos atuais (Identificação, Primeiro atendimento, Análise de Direito e Documentos) passam a gravar no pré-caso escolhido, e não mais no "último vivo" (`preCasoAberto`). Com dois ou três pré-casos, o cabeçalho do modo atendimento mostra o seletor do pré-caso, para que a análise da aposentadoria não se misture com a do BPC do mesmo cliente.

**Três saídas.** O quadro Desfecho (`quadroDesfecho`) fica com três botões fixos, sempre na mesma ordem.

| Saída | O que grava | O que o colaborador vê |
|---|---|---|
| Arquivar | `fase = 'encerrado'`, `desfecho.tipo = 'arquivado'` e o motivo, com anotação | O pré-caso sai da lista e fica em "Encerrados" do cliente |
| Aposentadorias futuras | Card em `lembretes` (tipo `aposentadoria_futura`) com `crm.precaso_id`, e o pré-caso em `fase = 'encerrado'`, `desfecho.tipo = 'futura'` | O cliente aparece em 🙏 Aposentadorias futuras com a data provável do direito |
| Gerar caso | A mesma linha muda para a fase do protocolo (INSS, Petições iniciais ou Judicial) e `pre_caso = false` | O pré-caso vira caso sem perder nada do atendimento |

Quando o card de Aposentadorias futuras vence, o "Abrir atendimento" do card reabre o pré-caso de origem (`crm.precaso_id`), e não cria outro, para que a análise antiga sirva de ponto de partida. As conferências que já existem antes de gerar o caso, procuração e contrato (`docsGeradosDo`) e a via da incapacidade (`viaDoDesfecho`), continuam valendo.

## 5. Como aparece na tela

No Casos ▾ do cliente, os pré-casos vêm acima dos casos, em seção própria "Pré-casos no escritório", cada um com o chip amarelo, a espécie e o passo em que está ("Pré-caso · Aposentadoria por idade · Análise de Direito"). A visão do pré-caso tem a mesma estrutura da visão do caso, com as anotações do escritório, os documentos e a agenda, e acrescenta no topo a faixa dos quatro passos e os três botões de saída.

A lista 🙋 Escritório da barra lateral mostra um cartão por pré-caso vivo, e não mais um por cliente (`clientesEmAtendimento`), com o passo e os documentos pendentes. A seção "Casos antigos desta lista" desaparece depois da migração do item 8, porque esses casos passam a ser pré-casos comuns.

A aba 🔔 Lembretes da ficha passa a se chamar 🙏 Aposentadorias futuras, assim como o botão do Desfecho e os textos que falam em "lembrete" para esse fim. Em 14.10.2026 havia 404 cards ativos, todos do tipo `aposentadoria_futura`, e um único lembrete `geral`, inativo, de modo que a troca do nome não esconde outro uso da aba. O nome repete o da lista do To Do, e o colaborador reconhece ali a mesma carteira.

## 6. Sincronia com o To Do

A tarefa do 🙋 Escritório continua sendo uma por cliente, e o CRM pode ter mais de um pré-caso para esse cliente. O `migrar.py` deixa de gravar as notas em `campos.atendimento` e passa a inseri-las como andamentos do pré-caso vivo do cliente, criando o pré-caso "Em formação" quando não houver nenhum. Com mais de um pré-caso vivo, a nota vai ao mais recente, e o "Levar a outro caso…" da F221 corrige o destino em um clique.

Gerar o caso no CRM muda a fase antes de a tarefa ser movida no To Do. Para a sincronização não devolver a linha ao Escritório na rodada seguinte, o caso gerado recebe a marca de `respeitar_movidos` (a mesma do `mover_para`), que mantém a fase do CRM até o To Do alcançá-la.

Na saída para Aposentadorias futuras, o card nasce no CRM, e a tarefa do To Do continua no 🙋 Escritório. A ponte estreita (`ponte_cards.py`) hoje só conclui tarefa, e por isso a passagem da tarefa para a lista 🙏 Aposentadorias Futuras depende da decisão D2 do item 10. O `escrever_todo.py` continua travado.

## 7. Efeitos em outras partes do CRM

Os contadores da barra, as Novidades, o quadro de prazos e o 🧹 Cuidar do acervo contam casos ativos, e precisam excluir `pre_caso = true` onde a contagem trata de processo. O `recorrerAte` e o `prazoMora` já não correm na fase Escritório, e o pré-caso não tem NB, protocolo nem processo, de modo que a organização por documentos da F221 não o move.

O portal público lê a etapa do caso pelo catálogo `ETAPAS_PUBLICAS` (F119), e os passos do atendimento não entram nesse catálogo, de modo que nada do pré-caso chega ao cliente. A agenda de quarta passa a prender o atendimento marcado ao pré-caso, o que encerra a lacuna do pré-cadastro tratada na F225.

## 8. Migração dos dados

A migração roda uma vez, em script com `--simular` antes de `--aplicar`. Os 10 clientes com `campos.precasos` ganham uma linha de pré-caso por item, com as etapas e o desfecho copiados. Os 76 casos na fase Escritório recebem `pre_caso = true`, e os 72 clientes com notas do To Do em `campos.atendimento` têm essas notas inseridas como andamentos do pré-caso correspondente, com o `origem_id` da nota para impedir duplicidade.

O campo `campos.precasos` fica como leitura por uma versão, e é apagado depois de conferida a migração. Os cards de `lembretes` que já têm `crm.precaso_id` com o identificador antigo (`pc_…`) são atualizados para o `id` da nova linha.

## 9. Ondas de implementação

A onda 1 (F226, feita em 15.10.2026) cria o esquema, a migração e a leitura do pré-caso como caso, com o Casos ▾ e a lista 🙋 Escritório desenhados a partir de `casos`. `precasosDe` e `gravarPrecasos` passaram a ler e gravar as linhas, de modo que todo o atendimento existente (etapas, Desfecho, card, honorários) funciona sem mudança; o "↩ não é caso" devolve a linha a pré-caso sem apagar nada, e gerar o caso muda a fase da mesma linha, com `mover_para` quando ela veio do To Do. A onda 2 (F227, feita em 15.10.2026) leva os quatro passos e o Desfecho de três saídas ao pré-caso escolhido, com o seletor no modo atendimento e a troca do nome Lembretes para Aposentadorias futuras.

A onda 3 altera o `migrar.py` para gravar as notas do 🙋 Escritório como andamentos do pré-caso e aplica `respeitar_movidos` ao caso gerado, com caso-ouro em `tests/test_crm_fase2.py`. A onda 4 ajusta contadores, Novidades e Cuidar do acervo, e cada onda leva um teste com pontuação em `testes/cadastro/` (banco simulado), no padrão da F220.

## 10. Decisões do Paulo (15.10.2026)

**D1.** O cliente com dois pré-casos aparece na lista 🙋 Escritório em **dois cartões**, porque cada benefício anda em ritmo próprio.

**D2.** Na saída para Aposentadorias futuras, **a ponte move a tarefa do To Do** para a lista 🙏 Aposentadorias Futuras, para a carteira ficar igual nos dois sistemas.

**D3.** Os 76 casos antigos da fase Escritório **viram pré-casos**.

**D4.** **Qualquer colaborador** pode gerar o caso a partir do pré-caso.
