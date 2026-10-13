# Integração do atendimento · Identificação, Primeiro atendimento, Análise de Direito e Documentos, com desfecho em Lembrete ou Caso

Análise de projeto, pedida em 12.10.2026. Não altera o CRM; diz o que existe, o que falta, como ligar as partes e em que ordem fazer. As decisões que dependem do Paulo estão na seção 8.

## 1. Veredito

A ideia é viável e, em boa parte, já está construída em pedaços separados. O CRM tem o pré-caso (`clientes.campos.precasos[]`), que nasce no "+ atendimento", recebe espécie, natureza, marcadores e honorários, e termina de duas formas: vira lembrete (`so_lembrete`, com um registro em `lembretes` de tipo `aposentadoria_futura` e origem `precaso`, que a aba Lembretes mostra com os botões "voltar ao atendimento" e "Gerar o caso") ou vira caso (`gerarCasoDoPre`: cria o caso, leva as anotações como andamentos com data e autor originais, transforma os documentos pedidos em checklist e registra a decisão). O que falta não é um conceito novo, e sim o fio que una as quatro telas do modo atendimento a esse pré-caso, para que a Análise de Direito decida o desfecho e os Documentos o executem.

Três coisas impedem hoje que o fluxo seja "integrável e compreensível":

1. O desfecho vive na mesa antiga das Anotações (passos b1 a b4), e não no modo atendimento de quatro passos. Quem percorre Identificação, Primeiro atendimento e Análise de Direito chega a Documentos sem botão de "virar lembrete" nem de "gerar caso".
2. A Análise de Direito não devolve nada ao pré-caso. A espécie e a subespécie escolhidas, a data do direito do melhor cenário e os benefícios marcados ficam em `analises_direito` e em `campos.ad_modulos`, mas o pré-caso continua com a espécie que a recepção digitou, e o lembrete não sabe a data que a análise calculou.
3. A aposentadoria futura tem três representações: a tabela `aposentadorias` (data do direito e `lembrar_em`, o aviso de 3 meses do Meu Dia), a tabela `lembretes` (tipo `aposentadoria_futura`, origem `precaso`) e os casos em fase `aposentadoria_futura` (a lista "Aposentadorias futuras" da lateral, herdada do To Do, com etapas monitorando, documentação em dia e pronto para protocolar). O "card" tem de ser uma só dessas coisas.

## 2. O fio condutor: o pré-caso é o atendimento

Cada atendimento é um pré-caso, e cada tela do modo atendimento lê e grava nele. Hoje o pré-caso guarda `{id, especie, cod, sub, natureza, marc, honorarios, via, so_lembrete, quem, em}`. A proposta acrescenta o registro das etapas e do desfecho, sem tabela nova:

```
precaso = {
  id, em, quem,                      // como hoje
  especie, cod, sub, natureza, marc, honorarios, via,   // como hoje; a análise passa a preencher cod e sub
  etapas: {
    identificacao: {em, quem, completo: 0..100},        // a recepção fecha; completo = faltaParaDocs
    pa:            {em, quem, beneficios: {fam:[opções]}},   // o colaborador fecha; é o benefSel(c)
    analise:       {em, quem, analise_id},              // o Paulo fecha; aponta a análise registrada
    documentos:    {em, quem, gerados:[anexo_id], pedidos:[docs_pedidos.id]},
  },
  desfecho: {tipo: "lembrete" | "caso" | "arquivado", em, quem, ref},   // ref = lembrete.id ou caso.id
}
```

O que cada tela entrega e recebe:

| Tela | Quem | Recebe | Entrega | Fica gravado em |
|---|---|---|---|---|
| Identificação | recepção | dossiê, CNIS, PAT | cadastro completo para os documentos (`faltaParaDocs` = 0), CNIS lido, parceria | `clientes`, `clientes.campos.civil`, `anexos` |
| Primeiro atendimento | colaborador | situação (`paDados`), trabalhos com sinal | benefícios marcados (`benefSel`), blocos levados, nome do CNIS conferido | `campos.ad_modulos.beneficios`, `_paForaBl` (sessão) |
| Análise de Direito | Paulo | benefícios, blocos, dossiê, quadros por módulo | análise registrada (espécie, subespécie, cenários, melhor data, módulos), considerações, decisão do desfecho | `analises_direito`, `campos.consideracoes`, `campos.ad_modulos` |
| Documentos | colaborador | espécie da análise, cadastro, catálogo | documentos gerados e guardados, lista pedida ao cliente, guias; execução do desfecho | `anexos` (gerados), `campos.docs_pedidos`, `lembretes` ou `casos` |

Os "fecha a etapa" são um botão por tela, "Concluir e passar adiante", que grava `etapas.<tela> = {em, quem}` e avisa quem vem depois (a função `quemAvisaClienteNovo` já avisa Amanda e Paulo na criação do cliente; o mesmo mecanismo serve ao passo seguinte). O cabeçalho do modo atendimento (`cabecalhoAtendimento`) mostra os quatro passos com quem fechou e quando, em vez de "conferida" fixo.

```
 recepção            colaborador              Paulo                      colaborador
 ┌──────────────┐    ┌──────────────────┐    ┌──────────────────────┐    ┌────────────────────┐
 │ Identificação│───▶│ Primeiro atend.  │───▶│ Análise de Direito   │───▶│ Documentos         │
 │ cadastro,    │    │ situação,        │    │ quadros, cenários,   │    │ assinar, pedir,    │
 │ dossiê, CNIS │    │ benefícios       │    │ considerações,       │    │ guias, guardados;  │
 └──────────────┘    └──────────────────┘    │ DECISÃO do desfecho  │    │ EXECUÇÃO do desfecho│
                                             └──────────┬───────────┘    └─────────┬──────────┘
                                                        │                          │
                              direito hoje ou ato a praticar (recurso, revisão, acerto)
                                                        │                          ▼
                                                        │                   ┌─────────────┐
                                                        │                   │    CASO     │ fase inss / petição inicial
                                                        │                   └─────────────┘
                              direito em data futura (melhor cenário com data > hoje)
                                                        ▼
                                                 ┌──────────────┐  aviso 3 meses antes   ┌─────────────┐
                                                 │   LEMBRETE   │───────────────────────▶│    CASO     │
                                                 │ (card)       │  "Gerar o caso"        └─────────────┘
                                                 └──────────────┘
```

## 3. A Análise de Direito decide; os Documentos executam

Hoje o botão "Criar caso" está no topo da Análise de Direito (`modalCriarCaso`) e o lembrete nasce na mesa das Anotações. A proposta concentra a decisão num quadro fixo ao fim da Análise de Direito, "Desfecho desta análise", com três saídas e uma regra para cada:

| Saída | Quando se habilita | O que grava | O que acontece depois |
|---|---|---|---|
| Lembrete (aposentadoria futura) | o melhor cenário tem data futura (`cenMelhor`) ou o quadro Idade diz "atinge em" | `precaso.desfecho = lembrete`, `lembretes` (tipo `aposentadoria_futura`, origem `precaso`, `proximo_em` = aviso de 3 meses antes, `avisoApos`), `aposentadorias` (data do direito, espécie, `lembrar_em`) | o card aparece na aba Lembretes, no Meu Dia na data do aviso e na lista "Aposentadorias futuras"; "Gerar o caso" chama `gerarCasoDoLembrete` |
| Caso | há direito hoje, ou o ato não espera (recurso ao CRPS, revisão, acerto de CNIS, incapacidade) | `precaso.desfecho = caso`, `casos` (beneficio, especie, subespecie, fase pela via), andamentos das anotações, checklist dos documentos pedidos | a ficha abre em Documentos para gerar procuração e contrato; a regra da casa continua: o caso nasce quando sai a procuração e o contrato é assinado |
| Arquivar | sem direito e sem ato a praticar | `precaso.desfecho = arquivado`, com o motivo | a ficha fica na lista Escritório como "sem caso", e a análise fica guardada para a próxima consulta |

Duas regras de ligação que faltam hoje:

1. `salvarAnalise` passa a escrever no pré-caso aberto a espécie, o código e a subespécie da análise (`detalhes.servico`), e o id da análise em `etapas.analise`. Com isso o caso gerado herda a espécie que o Paulo decidiu, e não a que a recepção digitou.
2. O lembrete criado da análise leva a data do melhor cenário e o plano de contribuições (`detalhes.plano`), que viram as linhas do card: "direito em dd/mm/aaaa", "manter o recolhimento como CI até lá", "trazer PPP da empresa X".

## 4. O card do lembrete é o registro em `lembretes` (decisão de 12.10.2026)

### 4.1 O acervo, medido no banco em 12.10.2026

| Medida | Valor |
|---|---|
| Lembretes de aposentadoria futura | **455**, dos quais **404 ativos**, em 448 clientes; todos vieram do To Do (`detalhes.todo_task_id`), nenhum criado no CRM |
| Vencidos (próximo contato no passado) | 22 ativos, o mais antigo com data de 29/01/2024 |
| A vencer em 90 dias | 42 |
| Entre 90 dias e um ano | 56 |
| Além de um ano | 278 (a data mais distante é 01/03/2047); 6 sem data |
| Responsável definido | nenhum |
| Anotações do To Do | todos os ativos as têm, em média 5 por card |
| Benefício no título | "Aposentadoria futura" genérico 191; tempo de contribuição 89; idade 60; acerto de CNIS 37; incapacidade temporária 24; especial 16; BPC 14; rural 12; revisão 8; pensão 2 |
| Cruzamento com o CRM | 0 clientes com Análise de Direito, 1 com pré-caso, 2 com dossiê, 24 com caso ativo em outra lista |
| Casos da antiga lista 🙏 Aposentadorias Futuras | 421, **todos encerrados** pela sincronização (o lembrete carrega a obrigação); a fase `aposentadoria_futura` não tem caso aberto, e a lista lateral "Aposentadorias futuras", que conta casos dessa fase, mostra zero |
| Tabela `aposentadorias` (a régua do direito e o aviso de 3 meses) | 5 linhas |

O acervo, portanto, já é a tabela `lembretes`, e está invisível como lista: cada card só aparece dentro da ficha, na aba Lembretes, ou no Meu Dia quando vence. Nenhum deles passou pela Análise de Direito.

### 4.2 O sincronismo com o To Do, a regra que não pode ser quebrada

A rodada `crm-sync.yml` (duas vezes por hora, `crm/sync_todo.py` e `crm/fase2/migrar.py`) lê a lista 🙏 Aposentadorias Futuras do To Do e grava um lembrete por tarefa, com id determinístico (`uid("lembrete", task_id)`), `titulo` = benefício, `proximo_em` = data de conclusão da tarefa, `ativo` = tarefa não concluída e `detalhes = {todo_task_id, beneficio, anotacoes[]}`. O merge é não destrutivo em `titulo`, `proximo_em`, `intervalo_meses`, `responsavel_id` e `ativo` (o que o CRM editou vence; só a conclusão no To Do desliga o card), mas **`detalhes` é substituído inteiro a cada rodada**, porque o upsert manda a coluna completa. O sentido inverso, banco → To Do (`escrever_todo.py`), está desligado por padrão.

Consequências para o projeto:

1. Tudo o que o CRM gravar no card tem de ficar fora de `detalhes`. A proposta é uma coluna nova, `lembretes.crm jsonb` (`{etapa, data_direito, analise_id, precaso_id, plano, documentos}`), que a sincronização não envia e, por isso, preserva. Nenhuma linha do `migrar.py` muda.
2. O card continua nascendo do To Do enquanto a equipe usar a lista; o CRM passa a enriquecê-lo. Card criado no CRM (desfecho da análise) não tem `todo_task_id` e a sincronização não o toca.
3. Quando o card vira caso, o CRM desliga o lembrete (`ativo=false`, que o merge respeita) e a tarefa do To Do deve ser concluída à mão, ou pelo `escrever_todo.py` se for ligado. É a única ponte de volta que falta decidir.

### 4.2.1 O que o conteúdo mostrou (conferido em 12.10.2026)

Os cards do To Do já trazem a análise feita: 328 dos 356 ativos com anotação falam de direito ou aposentadoria, 190 escrevem a data provável no texto ("Aposentadoria possível em 29/05/2044", "só se aposenta por idade em 29/04/2039", "Aposenta em 05/2031 se continuar na Prefeitura"), e `proximo_em` é o lembrete marcado um a três meses antes dessa data (206 cards com lembrete além de três anos). O checklist, onde o Paulo anota a data provável, não chegava ao banco; desde a onda 1 chega em `detalhes.checklist`. Portanto, para o card que vem do To Do não se faz Análise de Direito: o card lê a data provável, e a etapa começa em Monitorando; a análise no CRM é opcional, quando o colaborador abre o atendimento pelo card.

### 4.3 As etapas do card

| Etapa | Entra quando | O que o card mostra | Sai quando |
|---|---|---|---|
| 1. Monitorando | nasce do To Do ou do desfecho da análise | benefício, próximo contato, anotações, botões de aviso e WhatsApp (já existem) | o colaborador abre o atendimento pelo card |
| 2. Em atendimento | "Abrir atendimento" no card cria o pré-caso ligado (`crm.precaso_id`) e leva à Identificação | o passo em que o atendimento está e quem está com ele | a Análise de Direito é registrada |
| 3. Analisado | `salvarAnalise` grava `crm.analise_id` e `crm.data_direito` (melhor cenário ou quadro Idade) e cria ou atualiza a linha de `aposentadorias` com `lembrar_em` = 3 meses antes | "direito em dd/mm/aaaa", o plano (contribuições a manter) e o que falta de documento | a data do aviso chega |
| 4. Pronto para protocolar | `lembrar_em` ≤ hoje (o Meu Dia já lista isso por `itensApos`) | o aviso, os documentos pendentes e o botão "Gerar o caso" | o caso nasce (`gerarCasoDoLembrete`) e o lembrete se desliga |
| Arquivado | sem direito, desistência ou cliente que não voltou | o motivo | nunca; fica no histórico |

As etapas vivem em `lembretes.crm.etapa`; a lista lateral "Aposentadorias futuras" passa a listar os lembretes ativos agrupados por etapa, em vez dos casos da fase vazia, e o Meu Dia ganha "cards vencidos" (22 hoje) e "a vencer em 90 dias" (42 hoje) como filas.

## 5. Documentos em quadros

A aba Documentos hoje tem um bloco de documentos para assinar (procurações, declarações, contrato por variante e termo), uma linha sobre o que a análise ainda não informou, o catálogo "Documentos para o INSS" com um seletor de benefício e checkboxes, e a Consulta externa. A reformulação em quadros, guiada pelos benefícios da análise:

| Quadro | Conteúdo | Fonte | Ação |
|---|---|---|---|
| 1. Para o cliente assinar | procuração judicial e administrativa, declaração de pobreza, contrato na variante da espécie, termo de representação, declaração de não recebimento; o par próprio do B31 | `DOCS_ESCRITORIO`, `CONTRATO_VARIANTES`, variante pela espécie da análise | gerar um ou todos; cada um gerado fica guardado (seção 5.2) |
| 2. Para o cliente providenciar | um subquadro por benefício marcado, com os itens-base marcados, os itens por atividade desmarcados e as observações | `documentos_beneficio` (espelho do site interno, 22 benefícios) | marcar, imprimir a lista, "solicitar" grava em `campos.docs_pedidos` do pré-caso (vira checklist quando o caso nascer) |
| 3. Já temos no dossiê | o que o catálogo pede e o dossiê já trouxe: CNIS, CTPS digital, RAIS, laudos, CAT, PPP, cartas, processos | `fontesDoDossie`, `clientes.dossie` | os itens aparecem marcados como "já temos" no quadro 2 e saem da lista impressa |
| 4. Guias e formulários do INSS | os anexos da IN 128 que o benefício usa (autodeclaração rural para o rural, RAC para o acerto, PPP para o especial, declaração de pensão para a pensão) | `ANEXOS_IN128`, filtrados por benefício | abrir o modelo; registrar que foi entregue |
| 5. Gerados e assinados | a lista do que foi gerado, por quem, quando, com lacunas; o PDF assinado anexado ao lado | `anexos` com origem `gerado` e `assinado` | reimprimir; anexar o assinado; é daqui que o caso nasce |
| 6. Desfecho | o que a Análise de Direito decidiu e o botão de executar | `precaso.desfecho` | "Criar o lembrete" ou "Gerar o caso" (habilitado quando o quadro 5 tem procuração e contrato) |

### 5.1 A fonte das listas

O CRM já carrega o catálogo do site interno (`advprevidenciaria.netlify.app`, "Documentos para Solicitar aos Clientes") na tabela `documentos_beneficio`, com `itens` (base), `extras` (por atividade) e `observacoes`, atualizada ao rodar o `schema.sql`. O site institucional (`site_content/*.json`, campo `documentos`) tem uma lista mais curta por página. A recomendação é uma fonte só, a tabela, e o `build_site.py` passar a gerar o campo `documentos` do site a partir dela, para que o site e o CRM nunca discordem.

A ligação entre o benefício marcado na análise (`BENEF`, opção) e o nome do catálogo é uma tabela de dez linhas: por idade urbana → "Apos. por Idade"; tempo e transição → "Apos. Tempo de Contribuição"; professor → "Apos. do Professor"; LC 142 → "Apos. Tempo — Pessoa com Deficiência" ou "Apos. Idade — Pessoa com Deficiência"; especial → "Apos. Especial"; rural e híbrida → "Rural" e "Apos. por Idade Híbrida"; BPC → "BPC/LOAS" e "BPC/LOAS — Idoso"; pensão → "Pensão por Morte"; reclusão → "Auxílio-Reclusão"; incapacidade → "Aux. Incapacidade Temporária", "Apos. por Incapacidade Permanente" e os acidentários; auxílio-acidente → "Aux. Acidente"; revisão → "Revisão"; acerto → "Acerto de CNIS"; maternidade → "Salário-Maternidade".

### 5.2 Documentos que ficam salvos

Hoje a geração abre a janela de impressão e, se há caso, registra um andamento; o texto gerado não fica em lugar nenhum. A proposta: ao gerar, o CRM grava a folha exata (o HTML impresso, com as lacunas que saíram em branco) no bucket privado `anexos`, em `gerados/<cpf>/<AAAA-MM-DD>-<documento>.html`, e uma linha em `anexos` com `origem='gerado'`, presa ao cliente (e ao caso, quando houver). O quadro 5 lista esses arquivos e permite reimprimir o mesmo texto meses depois. O PDF assinado entra pelo mesmo caminho, com `origem='assinado'`. Gerar PDF no navegador fica para depois: exigiria biblioteca externa, e o HTML guardado já cumpre "ficar salvo" e reimprime igual.

## 6. Meu Dia e as filas por papel

Com as etapas gravadas, o Meu Dia ganha três linhas que hoje não existem e que são a parte "compreensível" da integração: para a recepção, "cadastros incompletos com atendimento aberto" (`etapas.identificacao` sem fechar ou `faltaParaDocs` > 0); para o colaborador, "primeiros atendimentos a fazer" (identificação fechada e `etapas.pa` aberta) e "documentos a gerar" (desfecho decidido e `etapas.documentos` aberta); para o Paulo, "análises aguardando" (`etapas.pa` fechada e `etapas.analise` aberta). A lista Escritório da lateral passa a mostrar, no chip do cliente, a etapa em que o atendimento está.

## 7. Riscos e limites

A mesa antiga das Anotações (passos b1 a b4, `mesaAberta`) e o modo atendimento fazem a mesma coisa por caminhos diferentes; manter os dois é a maior fonte de confusão. A proposta é recolher a mesa quando o pré-caso tiver `etapas`, deixando as Anotações só como anotações. Os casos antigos em fase `aposentadoria_futura` precisam de uma regra de convivência (seção 4). O Mapa do dossiê fica como está, como atalho da triagem. A gravação em `clientes.campos` cresce; se o volume pesar, as etapas podem subir para uma tabela `atendimentos` sem mudar as telas, porque todas leem por `precasosDe`.

## 8. O que depende do Paulo

1. Decidido em 12.10.2026: o card do lembrete é o registro em `lembretes`.
2. O caso continua nascendo só com procuração e contrato gerados, ou a Análise de Direito pode criá-lo antes, com a assinatura como pendência.
3. "Arquivar" como terceira saída, com motivo, ou só lembrete e caso.
4. O documento gerado fica guardado como a folha impressa (HTML) ou é obrigatório PDF desde já.
5. O quadro "Para o cliente providenciar" segue o catálogo do site interno (recomendado) ou a lista do site institucional.
6. A mesa das Anotações é recolhida quando o pré-caso passa a ter etapas.
7. Quando o card vira caso, a tarefa do To Do é concluída à mão ou o `escrever_todo.py` passa a ser ligado para isso.

## 9. Ordem de implementação

Começa pelo card, porque é onde o acervo está (404 ativos, nenhum analisado) e porque o card é a porta de entrada do atendimento para quem já é cliente.

| Onda | Entrega | Tamanho | Depende de |
|---|---|---|---|
| 1 · **entregue em 12.10.2026 (CRM 11.45, F218)** | `lembretes.crm` (schema aplicado), o checklist do To Do no card (`migrar.py`), o card com etapas e data provável na aba Lembretes, a lista lateral "Aposentadorias futuras" lendo `lembretes` por horizonte, "Abrir atendimento" (pré-caso ligado ao card), "Gerar o caso" e "Arquivar" | média | nada; a sincronização continua igual |
| 2 · **entregue em 13.10.2026 (CRM 11.47, F219)** | `etapas` e `desfecho` no pré-caso; "Concluir e passar adiante" nas quatro telas; cabeçalho com quem e quando; `salvarAnalise` devolve espécie, análise e data do direito ao pré-caso e ao card (`crm.analise_id`, `crm.data_direito`, linha de `aposentadorias`) | média | onda 1 |
| 3 · **entregue em 13.10.2026 (CRM 11.47, F219)** | quadro "Desfecho" na Análise de Direito e em Documentos: lembrete (card novo ou etapa 3 do card existente), caso (`gerarCasoDoPre`, desligando o card) ou arquivamento | média | onda 2 |
| 4 · **entregue em 13.10.2026 (CRM 11.47, F219)** | Documentos em seis quadros, catálogo filtrado pelos benefícios e cruzado com o dossiê, documentos gerados guardados em `anexos` | média | onda 2 |
| 5 · **entregue em 13.10.2026 (CRM 11.47, F219, e CRM 11.48, F220)**: mesa antiga recolhida, `crm/docs_catalogo.py` aplicado ao site (itens-base e os primeiros extras, até oito) e a ponte estreita `crm/fase2/ponte_cards.py`, que conclui no To Do só a tarefa do card decidido no CRM | `build_site.py` gera as listas do site institucional a partir do catálogo; mesa antiga recolhida; decisão sobre a ponte de volta ao To Do (`escrever_todo.py`) | pequena | ondas 3 e 4 |

Piloto da onda 1: os 42 cards que vencem em 90 dias, que são os que precisam de análise primeiro.

## 10. O que a F219 decidiu (13.10.2026), com base na pesquisa `pesquisa-formularios-dossie-pipeline.md`

As etapas do card passaram a ser monitorando, em atendimento, analisado, documentação, pronto para protocolar, virou caso e arquivado. Documentação entra quando o lembrete do card vence, e o lembrete criado pela análise cai 60 dias antes da data do direito (D-60), enquanto o aviso de 3 meses (`aposentadorias.lembrar_em`) continua sendo o D-90. Pronto para protocolar entra só quando a data do direito chega (D-0), porque a base manda protocolar no dia do requisito. O motivo Faleceu foi acrescentado ao arquivamento, com aviso para avaliar a pensão aos dependentes, e o card novo nasce com `intervalo_meses = 6`.

O Desfecho sugere o caso quando a data do direito já passou ou quando o ato não espera (revisão, acerto de CNIS, recurso, incapacidade, auxílio-acidente, pensão, reclusão, maternidade, BPC), e sugere o lembrete quando a data é futura; a escolha continua do advogado. A regra de que o caso nasce com procuração e contrato não mudou. A folha gerada fica guardada como HTML (`anexos.origem = 'gerado'`), o assinado entra com `origem = 'assinado'`, e a mesa antiga das Anotações recolhe documentos, análise e decisão quando alguma etapa foi concluída pelo modo atendimento.

Ficaram para decisão: aplicar ao site institucional a lista do catálogo (`python3 crm/docs_catalogo.py --aplicar` deixaria o site só com os itens-base, mais curtos que os de hoje), a ponte de volta ao To Do, a validade do comprovante de residência (90 ou 180 dias), o prazo do MS por mora (60 ou 90 dias) e os anexos IV, V, VIII, XXII, XXIV e XXVII, que estão na Consulta sem lastro na base.

## 11. O que a F220 decidiu (13.10.2026)

As cinco pendências da F219 foram resolvidas assim. O site institucional passou a ler as listas do catálogo, com os itens-base e os primeiros extras até oito por página, sem o detalhe depois do travessão e sem as linhas de cabeçalho. A ponte de volta ao To Do ficou estreita: o `ponte_cards.py` conclui na lista 🙏 Aposentadorias Futuras apenas a tarefa do card que virou caso ou foi arquivado, com uma linha datada no topo do corpo, no máximo 30 por rodada, e desliga com a variável `PONTE_CARDS=0`; o `escrever_todo.py` continua travado.

O comprovante de residência deixou de ter prazo de validade no CRM, porque o art. 32, § 2º, III, da IN 128 admite o endereço por declaração do requerente; a conta em nome do cliente fica indicada para a ação judicial. O prazo do mandado de segurança por mora segue o acordo homologado no RE 1.171.152, por espécie (aposentadorias e BPC 90 dias, pensão por morte e auxílio-reclusão 60, salário-maternidade 30), contado da DER; enquanto houver exigência aberta o prazo não aparece, e a contagem não desconta o tempo da exigência, simplificação que fica por conferir. Os benefícios por incapacidade não têm prazo no CRM, porque o relatório oficial consultado não os traz. Os anexos da Consulta passaram a trazer o artigo da IN 128 que os institui (arts. 12, 69, 105, 115, 281, 527, 534 e 669), e os anexos I-A, I-F e XXVII ficaram sem artigo, porque a IN não os cita.

O teste por persona (`testes/cadastro/f220.js`, relatório em `TESTE-PERSONAS-F220.md`) acrescentou o organizador dos casos do cliente, com as marcas que a sincronização respeita, a conversa da equipe dentro da tela de atendimento, a barra lateral por cargo e a correção das matérias de PcD por idade, carência, aposentadoria especial e auxílio-reclusão.
