# Dossiê da sincronização com o Microsoft To Do

Levantado em **15.08.2026**, lendo o código que está no ar (`crm/sync_todo.py`,
`crm/fase2/migrar.py`, `crm/fase2/escrever_todo.py`, `graph_client.py`,
`portal_common.py` e o workflow `.github/workflows/crm-sync.yml`) e conferindo
contra os registros das últimas execuções.

**Nenhum dado de cliente neste arquivo.** Onde é preciso mostrar um formato, o
exemplo é **fictício** e está dito.

---

## Em uma tela

```
Microsoft To Do (conta pessoal do escritório)
        │
        │  Graph API — GET, uma passada por lista, 50 tarefas por página,
        │  com $expand=checklistItems
        ▼
crm/sync_todo.py ────────────► crm/data/crm.json      (espelho bruto, no runner,
        │                       nunca commitado, some com a máquina)
        ▼
crm/fase2/migrar.py ─────────► Supabase               (upsert com id determinístico)
        │
        ▼
CRM no navegador (app.html)

                    ↑
       escrever_todo.py — o único caminho de volta.
       DESLIGADO por trava dupla (ver seção 1).
```

---

## 1. O fluxo é mesmo de mão única?

**Hoje, sim** — mas não porque o caminho de volta não exista: porque ele está
**desligado por trava dupla**.

`crm/fase2/escrever_todo.py` escreve no To Do e faz quatro coisas quando ligado:

| # | O que faz | Como |
|---|---|---|
| 1 | cria tarefa no To Do para caso nascido no app | `POST /me/todo/lists/{id}/tasks`, na lista que corresponde à fase (`FASE_LISTA`), e grava `todo_task_id` de volta no caso |
| 1b | move tarefa de lista quando alguém usa "Mover para…" | o Graph não tem "mover": ele **recria** na lista de destino (título, corpo, prazo, importância e checklist) e **apaga** a antiga |
| 1c | apaga do To Do o comentário que o autor apagou no app | monta o bloco `DD.MM.AAAA (X): texto`, remove essa string do corpo e regrava |
| 2 | replica andamentos escritos no app | pega `andamentos` com `origem='app'` e `todo_sync=false`, formata o bloco e **insere no topo** do corpo da tarefa; depois marca `todo_sync=true` |

**Quando é chamado.** Só no passo *"Banco -> To Do (DESLIGADO por padrão)"* do
workflow `crm-sync.yml`, e esse passo tem `if: vars.ESCREVER_TODO == '1'`. A
variável **não existe** no repositório, então o passo aparece como *skipped* em
toda execução — confirmado nos registros: `Banco -> To Do (DESLIGADO por
padrão) … skipped`.

**A segunda trava é por dentro do script**: a primeira coisa que o `main()` faz
é conferir `os.environ.get("ESCREVER_TODO") != "1"` e sair imprimindo
"escrita CRM -> To Do desligada". Ou seja, **nem rodando à mão na máquina do
escritório ele escreve** sem que alguém defina a variável de propósito.

Para religar: *Settings > Secrets and variables > Actions > Variables*, criar
`ESCREVER_TODO` com valor `1`.

**Nenhum outro script escreve no To Do.** `graph_client.py` tem as funções de
escrita (`create_task`, `update_task_body`, e o `_req` genérico faz POST, PATCH
e DELETE), mas quem as chama é só o `escrever_todo.py`. `sync_todo.py` usa
apenas `list_lists()` e `GET` paginado.

**Consequência prática, e ela é importante:** o que a equipe escreve no CRM
**não aparece** no To Do. Quem trabalha nos dois vê realidades diferentes.

---

## 2. Quais listas são lidas

`sync_todo.py` **lê todas as listas da conta** — não há filtro na leitura. A
seleção acontece depois, no `migrar.py`, pelo mapa `LISTA_FASE`:

| Lista no To Do | Vira no CRM | Como aparece |
|---|---|---|
| `🗓 Tarefas com Prazo` | fase `outro` | lista 🗓 Tarefas com Prazo |
| `🙋 Escritório` | fase `escritorio` | lista 🙋 Escritório — **desde a 08.99, tarefa nova dessa lista não vira caso**: vira anotação no cadastro do cliente |
| `🌻 INSS` | fase `inss` | lista 🌻 INSS |
| `👪 Judicial` | fase `judicial` | lista 👪 Judicial |
| `🖥 Conselho de Recursos` | fase `conselho` | lista 🖥 Conselho de Recursos |
| `💡 Petições Iniciais` | fase `peticao_inicial` | lista 💡 Petições Iniciais |
| `🙏 Aposentadorias Futuras` | **não vira caso** | 🔔 Lembrete do cliente (seção 5) |
| `💵 Pagamentos` | **não vira caso** | aba 💰 Honorários da ficha; cada item do checklist é uma parcela |
| `Tarefas` (lista pessoal) | tarefa particular do Paulo | 📋 Minhas Tarefas, com `particular_de` |

Uma tarefa concluída no To Do entra com `fase = "encerrado"`, seja qual for a
lista de origem.

As demais listas da conta (foram **39 listas** na última leitura) só entram se a
tarefa tiver CPF no título — senão são contadas e descartadas (seção 4).

---

## 3. Como uma tarefa vira cliente, caso, andamento, lembrete e evento

### 3.1 Cliente

A chave é o **CPF**; sem CPF, o nome. `_cliente_key()` devolve `("cpf", …)` ou
`("nome", …)`, e o id do cliente é `uuid5` dessa chave — determinístico, é o que
faz duas tarefas do mesmo CPF caírem no mesmo cliente.

**Extração do CPF** (`cpf_from_task`), nesta ordem:

1. no **título**, qualquer sequência `\d[\d.\-]{9,}` que, sem pontuação, tenha
   exatamente 11 dígitos — é o padrão `Nome #000.000.000-00` (fictício);
2. se não houver, qualquer **item do checklist** com 11 dígitos.

**Extração da data de nascimento**, nesta ordem de confiança:

1. `dn_from_aniversario` — item do checklist cujo texto casa com
   `anivers|nascime`; aceita **qualquer ano** entre 1900 e o ano corrente (é o
   que permite menor de idade em caso de BPC);
2. `dn_from_items` — qualquer data `DD/MM/AAAA` no checklist com ano **entre
   1920 e 2012** (a faixa evita confundir com data de protocolo);
3. `dn_from_body` — a mesma varredura no corpo da tarefa.

Nome, DN e telefone seguem a regra do "primeiro que aparece vence", com uma
exceção: **nome de tarefa ativa e mais longo substitui** o já guardado (é assim
que "Fulana" vira "Fulana de Tal Pereira" quando a segunda tarefa traz o nome
completo). O nome sai do título com `#CPF` e etiquetas removidos.

### 3.2 Caso

Uma tarefa = um caso (`uid("caso", id_da_tarefa)`), exceto Aposentadorias
Futuras, Pagamentos e — desde a 08.99 — as tarefas novas do Escritório.

O que o caso leva junto:

- **benefício**: primeiro a etiqueta `#B31` do título (mapa `ESPECIES`, 13
  espécies); se não houver, uma varredura por 12 expressões (`revis[ãa]o`,
  `incapacidade tempor|aux[íi]lio[- ]doen`, `tempo de contribui`…) no título, no
  preâmbulo e nos primeiros 1.500 caracteres do corpo;
- **parceria**: as etiquetas de texto do título que não são espécie —
  `#Laís` vira parceria (exemplo fictício);
- **NB**: `NB:` seguido de dígitos no corpo;
- **processo**: número CNJ completo no corpo;
- **protocolos**: todos os `protocolo <dígitos>` achados nos blocos, guardados
  em lista — é por eles que a busca do app encontra o cliente;
- **prazo**, **importante** e **concluída** vêm direto dos campos do To Do.

### 3.3 Andamento — os blocos `DD.MM.AAAA (X):`

`split_blocks()` quebra o corpo com a expressão

```
(?m)^\s*(\d{2})[./](\d{2})[./](\d{4})\s*[\(\):;.-]
```

Ou seja: **início de linha**, dia e mês com dois dígitos, ano com quatro,
separador `.` ou `/`, e logo depois um caractere de pontuação ou o parêntese do
autor. Cada bloco vai do fim do seu cabeçalho até o começo do próximo. Data
inválida (`31.02.2026`) é descartada. Os blocos saem ordenados do mais novo para
o mais antigo.

Depois, `autor_do_bloco()` lê a inicial: `^\s*\(?\s*([A-Za-z]{1,2})\s*\)\s*[:;,.–-]?`
— e **só aceita se a inicial estiver na tabela** `P, A, M, D, AD, I, C, L, G`.
Inicial desconhecida não vira autor: o bloco entra com autor `?` e vai para o
banco com `autor_id` nulo.

O texto que sobra vira `andamentos.texto`, com `criado_em` = data do bloco ao
meio-dia (`T12:00:00-03:00`) e `origem='todo'`.

**O que fica de fora**: o texto ANTES do primeiro bloco datado (o "preâmbulo")
não vira andamento — é usado só para achar telefone e benefício. Se a tarefa não
tem nenhum bloco datado, o corpo inteiro é preâmbulo e **nenhum andamento nasce**.

### 3.4 Evento (perícia, audiência, avaliação social)

A data solta no meio do texto é caçada por:

```
(per[íi]cia|audi[êe]ncia|avalia[çc][ãa]o social)[^\n]{0,120}?\b(\d{1,2})[./](\d{1,2})(?:[./](\d{4}))?(?:[^\n]{0,20}?\b(\d{1,2})[:hH](\d{2})?)?
```

Três cuidados que nasceram de erros reais:

1. **Ano ausente.** "perícia 12/08" usa o ano do bloco. Se a data resultante for
   anterior à data do bloco, o script só salta para o ano seguinte **quando a
   distância for de até 180 dias**. Foi assim que se matou a "perícia fantasma
   de 2027": uma perícia de 20/04 anotada em maio é a que **já houve** em abril,
   não a de abril do ano que vem.
2. **Hora impossível.** Um "45" perto da data (protocolo, sala, NB) chegava como
   hora. Agora só vale hora com `h ≤ 23` e `min ≤ 59`; fora disso o evento fica
   sem hora e o `migrar` aplica **09:00**.
3. **Status pelo calendário**: evento com data no passado entra como
   `realizada`; no futuro, `agendada`.

O evento é deduplicado no banco pela trinca **caso + tipo + data_hora**
(`eventos_dedupe`), não pelo id.

### 3.5 Checklist — o depósito de dados soltos

Cada item do checklist passa por `classificar_item_checklist()` e vira o que ele
é, não uma subtarefa:

| Classificação | Regra | Destino |
|---|---|---|
| `dado` | contém "anivers"/"nascime" | ignorado (a DN já foi lida) |
| `senha_padrao` | o item é exatamente "Padrão" | credencial Meu INSS com a senha do secret `SENHA_PADRAO_MEUINSS`; **sem o secret, é ignorado e contado** |
| `senha` | "senha … : valor" | credencial Meu INSS |
| `cpf` | CPF formatado, ou 11 dígitos quando o cliente ainda não tem | preenche o CPF do cliente |
| `telefone` | `(DD) 9NNNN-NNNN` **com separador obrigatório depois do DDD** | telefone do cliente |
| `protocolo` | só dígitos, 6+, diferente do CPF | entra na lista de protocolos do caso |
| `parceria` | `#Nome` ou "parceria: Nome" | parceria do caso |
| `nome` | 2 a 6 palavras só de letras, com ou sem "esposa/irmão/indicado por" na frente | **candidato** a vínculo familiar |
| `senha` (solta) | token de 6 a 20 caracteres com letra **e** número | credencial |
| `tarefa` | o resto | subtarefa do caso |

O candidato a `nome` só vira vínculo se o nome **bater com outro cliente da
base** (segunda passada, `_norm` sem acento); se não bater, **volta a ser
subtarefa** — foi assim que se evitou criar cliente-fantasma a partir de um
nome escrito no checklist.

### 3.6 Parcela (lista 💵 Pagamentos)

Cada item do checklist vira uma linha de `pagamentos`, com `todo_item_id` como
chave de dedupe. Item marcado = **recebido** (`pago_em` = data em que foi
marcado, ou a data escrita no texto); item aberto = **a receber** (a data escrita
vira `vencimento`). Valor e data são lidos do próprio texto do item.

---

## 4. O que é descartado na leitura

| O que | Por quê |
|---|---|
| **Tarefa de lista não mapeada e sem CPF** | não há como saber de quem é. São contadas por lista e o total sai no registro da execução |
| **Bloco datado vazio depois de tirar a inicial** | não tem conteúdo |
| **Preâmbulo (texto antes do primeiro bloco datado)** | não tem data; serve só para achar telefone e benefício |
| **Corpo inteiro de tarefa sem nenhum bloco datado** | idem — a tarefa vira caso, mas sem andamento |
| **Data inválida** no cabeçalho do bloco (`31.02`) | `ValueError`, bloco pulado |
| **Inicial de autor fora da tabela** | o bloco entra, mas sem autor |
| **Hora fora de 0–23:0–59** | vira 09:00 |
| **Item "Padrão" sem o secret da senha** | contado e avisado no fim da execução |
| **Item de checklist vazio** | ignorado |
| **Eco do próprio CRM** | ver seção 7 |

Na última execução, **28 listas** foram puladas por não estarem mapeadas e não
terem CPF — são listas de trabalho interno (jurisprudência, vídeos, acessos,
leilões, operacional, listas pessoais de colaboradores). Somaram algumas
centenas de tarefas que **nunca chegaram ao CRM** e nem deveriam.

---

## 5. Aposentadorias Futuras — hoje é lembrete, não caso

Combinado na 08.90 e no ar desde então. A tarefa dessa lista **não cria caso**:

- vira **um lembrete** do cliente, id `uuid5("lembrete", id_da_tarefa)`;
- `tipo = "aposentadoria_futura"`, título = o benefício lido da tarefa;
- **`proximo_em` = o prazo da tarefa** no To Do;
- `ativo = false` quando a tarefa está concluída — **essa é a única coisa que o
  To Do consegue mudar** num lembrete já existente;
- os dados de cliente do checklist (senha, telefone, CPF) **continuam entrando**
  normalmente.

### O que acontece com as anotações dessas tarefas

Os blocos datados **não viram andamentos** (não há caso onde pendurar). Eles são
copiados para `lembretes.detalhes.anotacoes`, cada um com `data`, `inicial` e
`texto`, e aparecem na aba 🔔 Lembretes da ficha, sob o aviso *"o que for
andamento de verdade, transfira para um caso"*. Cada anotação tem um botão
**→ andamento** que a copia para a linha do tempo de um caso do cliente **com a
data original**; a anotação transferida fica marcada com "✔ no caso" e não é
oferecida de novo.

**O banco preserva a edição do app.** No reimporte, título, `proximo_em`,
`intervalo_meses` e responsável **do banco vencem** os do To Do — adiar ou
renomear no CRM não é desfeito na rodada seguinte. Só as anotações são
renovadas, e só a conclusão no To Do desliga o lembrete.

Havia **419 lembretes** no banco na última medição.

---

## 6. Frequência, gatilho e o que acontece quando falha

**Workflow:** `.github/workflows/crm-sync.yml`

- **De hora em hora, das 07h às 20h de Brasília, de segunda a sábado**
  (`cron: '0 10-23 * * 1-6'`, em UTC). Domingo não roda.
- Também dá para disparar à mão (`workflow_dispatch`).
- `concurrency: crm-sync` com `cancel-in-progress: false` — duas rodadas nunca
  se atropelam; a segunda espera.
- Teto de 30 minutos por execução.

**Os passos, na ordem:**

1. confere se os secrets do Supabase existem — sem eles, avisa e pula tudo;
2. escreve `graph_tokens.json` a partir do secret `GRAPH_REFRESH_TOKEN` — **se
   esse secret estiver vazio, a execução falha na hora**, porque sem ele não há
   como ler o To Do;
3. `graph_refresh.py` renova o token de acesso (dura cerca de uma hora);
4. *Banco -> To Do* — **skipped**, como explicado na seção 1;
5. `crm/sync_todo.py` — a varredura completa das listas;
6. `crm/fase2/migrar.py` — espelho para o banco.

**Quando falha:**

| Falha | O que acontece |
|---|---|
| rede, SSL, 429 ou 5xx na Graph | `graph_client._req` tenta **5 vezes** com espera dobrando (1, 2, 4, 8s) antes de desistir |
| uma linha recusada pelo banco (23505, 23514…) | o lote é **partido ao meio** até sobrar a linha culpada; o resto entra; no fim a rodada termina **com erro**, e as culpadas aparecem nomeadas |
| **falta de coluna ou de índice** (42P10, 42703, PGRST204) | a tabela inteira é pulada de uma vez, com `::warning::` — o resto da rodada termina normalmente. Foi essa correção que impediu o dia inteiro sem sincronizar por causa das parcelas |
| qualquer erro no meio | `crm/data/crm.json` fica só no runner efêmero e morre com ele — **nunca vira artefato nem commit** |

O carimbo `todo_sync_em` é gravado em `config_app` **mesmo quando alguma tabela
foi pulada** — foi assim que o CRM parou de dizer "sem sincronizar" num dia em
que clientes, casos e andamentos tinham entrado normalmente.

---

## 7. Idempotência: rodar duas vezes duplica alguma coisa?

**Não.** A garantia tem quatro camadas:

1. **Ids determinísticos.** Todo id nasce de `uuid5` com um namespace fixo:
   - cliente = `uuid5("cliente", "cpf"|"nome", chave)`
   - caso = `uuid5("caso", id_da_tarefa_no_todo)`
   - andamento = `uuid5("andamento", caso, data, md5(texto))`
   - subtarefa = `uuid5("subtarefa", caso, md5(texto))`
   - lembrete = `uuid5("lembrete", id_da_tarefa)`
   Mesma entrada, mesmo id — o upsert atualiza a mesma linha.
2. **Conflito declarado por tabela**: `casos` e `clientes` por `id` com
   *merge*; `andamentos` por `id` **ignorando duplicado**; `eventos` pela trinca
   caso+tipo+data_hora; `pagamentos` por `todo_item_id`; `vinculos` pelo par
   cliente+ligado.
3. **Anti-eco.** Antes de subir, o `migrar` busca os andamentos que o app criou
   (`origem='app'`) e descarta do lote qualquer bloco com o mesmo
   **caso + dia + md5 do texto**. Sem isso, quando a escrita de volta estivesse
   ligada, o texto replicado voltaria como bloco novo a cada rodada.
4. **Remapeamento.** Caso criado no app ganha tarefa no To Do depois; na
   importação seguinte ele chegaria com id determinístico diferente e
   duplicaria. `remapear_casos()` troca o id importado pelo que já existe no
   banco, corrigindo as referências de andamentos, eventos e tarefas.

**O que o reimporte NÃO desfaz** (o banco vence o To Do):

- `processo` e `NB` que a coleta do PJe ou a equipe preencheu — se o To Do vier
  vazio, o valor do banco é preservado (79 preservados na última rodada);
- título, data, intervalo e responsável dos lembretes;
- conferências de pagamento feitas no app;
- itens de checklist concluídos no CRM.

**Uma coisa muda a cada rodada, de propósito:** um bloco **editado** no To Do
tem md5 diferente e entra como andamento **novo**, ao lado do antigo. Corrigir
um texto no To Do não corrige o que já entrou.

---

## 8. O que ainda vive só no To Do

- **As 28 listas não mapeadas** — jurisprudência, modelos de escrita, vídeos
  explicativos, acessos, leilões, operacional, listas pessoais de colaboradores.
  Nada disso tem cliente e nada disso chega ao CRM.
- **O checklist que não é dado nem tarefa** das Aposentadorias Futuras: dessas
  tarefas só entram senha, telefone e CPF; o resto do checklist fica lá.
- **O preâmbulo de toda tarefa** — o texto antes do primeiro bloco datado.
- **Anexos e imagens** das tarefas: o Graph os expõe, e nada os lê.
- **Subtarefas com data própria**: o item do checklist não tem prazo no To Do,
  então a subtarefa nasce sem prazo no CRM.
- **Categorias e lembretes nativos do To Do** (o "lembrar-me" do aplicativo):
  não são lidos.
- **Tudo que a equipe escreveu no CRM** — enquanto `escrever_todo.py` estiver
  desligado, o To Do não recebe nada de volta.

---

## 9. Números da última sincronização

Execução de **15.08.2026, 14h16 UTC** (11h16 de Brasília), concluída com
sucesso em 1 minuto e 30 segundos.

### Leitura do To Do (`sync_todo.py`)

| | |
|---|---|
| Listas varridas | **39** |
| Tarefas lidas | **4.304** |
| Clientes distintos (por CPF) | **1.656** |
| Blocos datados lidos como andamento | **18.273** |
| Perícias/audiências achadas no texto | **1.184** |

### Depois do mapeamento (`migrar.py`)

| Tabela | Linhas mapeadas | Linhas enviadas |
|---|---:|---:|
| clientes | 1.885 | 1.885 |
| casos | 2.545 | 2.545 |
| andamentos | 15.674 | 15.673 |
| eventos | 973 | 973 |
| tarefas | 5.073 | 5.073 |
| credenciais | 1.239 | 1.239 |
| lembretes | 419 | 419 |
| vínculos | 2 | 2 |
| documentos solicitados (📄) | — | 37 |
| **pagamentos** | **2.621** | **0** |

Três diferenças merecem explicação:

- **18.273 blocos lidos → 15.674 andamentos mapeados.** A diferença são os
  blocos das tarefas que não viram caso (Aposentadorias Futuras, cujas anotações
  vão para o lembrete) e os das listas descartadas.
- **15.674 mapeados → 15.673 enviados.** Um bloco foi barrado pelo anti-eco: era
  eco de um andamento escrito no app.
- **2.621 parcelas mapeadas → 0 enviadas.** É o defeito aberto: o banco recusa a
  tabela inteira com 42P10 porque o índice único de `todo_item_id` foi criado
  como **parcial**, e o PostgREST monta `ON CONFLICT (todo_item_id)` sem o
  predicado. **Nenhum honorário do To Do existe no CRM até hoje.** A correção
  são três linhas, no fim de `crm/fase2/schema_conferencia.sql`.

### Contas que não fecham na primeira leitura, e por quê

**1.656 clientes na leitura, 1.885 no mapeamento.** Não é erro: o
`sync_todo.py` conta **só quem tem CPF**; o `migrar.py` também cria cliente para
tarefa **sem CPF**, usando o nome como chave. Os 229 a mais são clientes
identificados só pelo nome — e são exatamente os candidatos a virar duplicata no
dia em que o CPF aparecer numa tarefa nova.

**4.304 tarefas lidas, 2.545 casos.** A diferença são as tarefas das listas
descartadas, as das Aposentadorias Futuras (que viraram lembrete), as de
Pagamentos e as tarefas particulares.
