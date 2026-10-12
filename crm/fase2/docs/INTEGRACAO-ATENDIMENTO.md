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

## 4. O card do lembrete, uma representação só

Recomendação: o card é o registro em `lembretes` (tipo `aposentadoria_futura`, origem `precaso`), que já existe e já tem os botões de ida e volta. A tabela `aposentadorias` continua como a régua da data do direito (o Meu Dia e o aviso de 3 meses saem dela), e o card a mostra. Os casos em fase `aposentadoria_futura` ficam como legado: nenhum caso novo nasce nessa fase; a lista "Aposentadorias futuras" da lateral passa a listar os lembretes, e os casos antigos dessa fase vão para a mesma lista até virarem casos de verdade. Sem isso o colaborador continua sem saber se o cliente está em um caso, em um lembrete ou nos dois.

O card mostra, na aba Lembretes e no Meu Dia, o nome, a espécie, a data do direito, a data do aviso, o responsável, o que fazer até lá (plano da análise e documentos pedidos pendentes) e três botões: "Gerar o caso" (já existe), "Reabrir a análise" (abre a Análise de Direito na análise registrada, `_adSel`) e "Mensagem ao cliente" (modelo já existe, `msgLembrete`).

Alternativa, caso o Paulo prefira: o card ser um caso em fase `aposentadoria_futura`, com as etapas que a fase já tem. Vantagem: andamentos, tarefas, anexos e etapas sem código novo, e "virar caso" é mudar a fase. Desvantagem: contraria a regra da casa de que o caso nasce com a procuração assinada, e mantém dois mundos (lembretes e casos) para a mesma coisa. Por isso a recomendação é o lembrete.

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

1. O card do lembrete é o registro em `lembretes` (recomendado) ou um caso em fase `aposentadoria_futura`.
2. O caso continua nascendo só com procuração e contrato gerados, ou a Análise de Direito pode criá-lo antes, com a assinatura como pendência.
3. "Arquivar" como terceira saída, com motivo, ou só lembrete e caso.
4. O documento gerado fica guardado como a folha impressa (HTML) ou é obrigatório PDF desde já.
5. O quadro "Para o cliente providenciar" segue o catálogo do site interno (recomendado) ou a lista do site institucional.
6. A mesa das Anotações é recolhida quando o pré-caso passa a ter etapas.

## 9. Ordem de implementação

| Onda | Entrega | Tamanho |
|---|---|---|
| 1 | `etapas` e `desfecho` no pré-caso; "Concluir e passar adiante" nas quatro telas; cabeçalho com quem e quando; `salvarAnalise` devolve espécie e id ao pré-caso | pequena |
| 2 | quadro "Desfecho" na Análise de Direito e em Documentos, chamando `lembrarApos`, o lembrete de origem `precaso` e `gerarCasoDoPre` | média |
| 3 | Documentos em seis quadros, com o catálogo filtrado pelos benefícios e cruzado com o dossiê; documentos gerados guardados em `anexos` | média |
| 4 | card do lembrete unificado, lista lateral e Meu Dia por papel; convivência com os casos antigos da fase | média |
| 5 | `build_site.py` gera as listas do site institucional a partir do catálogo; mesa antiga recolhida | pequena |
