# Dossiê do banco — CRM Tercini

Retrato tirado em **15.08.2026**, do banco de produção, por conexão **somente de
leitura**: o script `crm/fase2/dossie_banco.py` só emite `GET` e `HEAD`, e conta
linhas com `limit=0` + `count=exact`, forma em que o banco devolve **o número no
cabeçalho e o corpo vazio**. Rodou de dentro do GitHub Actions, que é onde vivem
as credenciais (workflow `crm-dossie.yml`).

**Não há nenhum dado de cliente neste arquivo.** Nome, CPF, telefone, endereço,
senha e texto de andamento não passaram pelo processo em momento algum. Onde é
preciso mostrar um formato, o valor é **fictício** e está dito.

Origem de cada informação:

| Bloco | De onde veio |
|---|---|
| tabelas, colunas, tipo, nulidade, padrão, PK e FK | OpenAPI do PostgREST do projeto |
| total de linhas e preenchimento por coluna | contagens no banco de produção |
| índices e políticas de RLS | `crm/fase2/schema.sql`, `schema_por_em_dia.sql` e `schema_f9_cadastro.sql` (o que o repositório **declara**; a API não expõe o catálogo do Postgres) |
| quem escreve e quem lê | leitura do código: `app.html`, `migrar.py`, robôs, coletores e gatilhos |

**"Preenchida" não é o mesmo que "não nula".** Texto em branco não conta, e
jsonb que ficou no padrão (`[]` ou `{}`) também não — sem esse cuidado,
`clientes.telefones` apareceria com 100%, quando o que existe é a lista vazia
que o próprio `default` criou.

## O banco em números

| | |
|---|---|
| Tabelas expostas pela API | **43** |
| Colunas | **373** |
| Linhas somadas | **45.882** |
| Tabelas sem nenhuma linha | **11** |

| Tabela | Linhas | Colunas | Colunas em 0% |
|---|---:|---:|---:|
| `andamentos` | 20638 | 12 | 2 |
| `orgao_producao` | 7763 | 8 | 0 |
| `tarefas` | 7657 | 9 | 1 |
| `casos` | 3069 | 53 | 16 |
| `clientes` | 1890 | 29 | 17 |
| `eventos` | 1248 | 7 | 0 |
| `credenciais` | 1240 | 5 | 0 |
| `inss_fila` | 844 | 7 | 0 |
| `lembretes` | 419 | 12 | 4 |
| `andamentos_lidos` | 374 | 3 | 0 |
| `inss_calendario` | 260 | 4 | 0 |
| `sugestoes` | 204 | 10 | 2 |
| `coletas` | 75 | 5 | 0 |
| `atribuicoes` | 47 | 2 | 0 |
| `documentos_beneficio` | 22 | 5 | 0 |
| `lembrar_motivos` | 22 | 7 | 0 |
| `config_app` | 15 | 3 | 0 |
| `modelos_mensagem` | 13 | 4 | 0 |
| `frases_prontas` | 11 | 3 | 0 |
| `lista_pref` | 9 | 4 | 0 |
| `zap_bot_passos` | 9 | 6 | 0 |
| `checklist_modelo` | 8 | 3 | 0 |
| `credencial_vis` | 8 | 3 | 0 |
| `zap_avisos` | 8 | 9 | 0 |
| `colaboradores` | 6 | 10 | 1 |
| `aposentadorias` | 5 | 8 | 1 |
| `andamento_tarefas` | 4 | 8 | 1 |
| `mencoes` | 4 | 9 | 2 |
| `modelos_documento` | 4 | 4 | 0 |
| `vinculos` | 4 | 4 | 0 |
| `crps_segredo` | 1 | 3 | 0 |
| `meu_dia` | 1 | 5 | 1 |
| `anexos` | 0 | 9 | — |
| `conversas` | 0 | 11 | — |
| `integracao_token` | 0 | 3 | — |
| `leads` | 0 | 14 | — |
| `lembrete_avisos` | 0 | 6 | — |
| `pagamentos` | 0 | 10 | — |
| `rotinas` | 0 | 8 | — |
| `rotinas_feitas` | 0 | 4 | — |
| `zap_conversas` | 0 | 18 | — |
| `zap_mensagens` | 0 | 20 | — |
| `zap_transferencias` | 0 | 6 | — |

---

## O que salta aos olhos

1. **`pagamentos` está com zero linha** — e não é por falta de uso: as 2.621
   parcelas do To Do são recusadas a cada sincronização com o erro 42P10,
   porque o índice único de `todo_item_id` foi criado como PARCIAL e o
   PostgREST não consegue usá-lo no `ON CONFLICT`. A correção são três linhas
   (`crm/fase2/schema_conferencia.sql`, no fim). Enquanto isso, **nenhum
   honorário do To Do existe no banco**.
2. **`clientes.endereco` está em 0%** — de 1.890 clientes, nenhum tem endereço
   guardado. Nove dos dez modelos de documento usam endereço; hoje toda peça
   sairia com essa linha em branco.
3. **As colunas novas da F9 já existem no banco** (RG, estado civil, profissão,
   sexo, endereço em pedaços, nome da mãe, PIS/NIT, telefones em lista) e
   **todas estão zeradas**. O gargalo da F12 não é código, é preenchimento.
4. **`casos` tem 53 colunas, 16 delas em 0%.** É a tabela que mais acumulou
   campo que nasceu de uma ideia e nunca foi preenchido.
5. **11 tabelas estão vazias**, entre elas todo o módulo de WhatsApp dentro do
   CRM e a tela de Vendas.

---

## Tabela por tabela

Cada bloco traz a finalidade em uma linha, quem escreve, quem lê, as colunas com
tipo, nulidade, padrão, chave estrangeira e percentual preenchido, os índices e
as políticas de RLS. As colunas em **0%** aparecem destacadas logo abaixo da
tabela — são as candidatas a morte, para conferência humana antes de qualquer
`drop column`.


### `andamentos`

**A linha do tempo de cada caso: todo comentário datado, com autor e a origem (escritório, To Do, portal do INSS, CRPS, PJe, WhatsApp).**

- **Escreve:** app (CRM no navegador), sincronização do To Do, robô do CRPS, SMBot (WhatsApp)
- **Lê:** app (CRM no navegador), sincronização do To Do, robô do PAT/INSS, gatilho no banco
- **Linhas:** 20638
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** `andamentos_caso` em (caso_id, criado_em desc); `andamentos_fila` em (todo_sync) — parcial: `where origem = 'app'`; `andamentos_de_zap` único em (caso_id, zap_mensagem_id) — parcial: `where zap_mensagem_id is not null`; `andamentos_resposta` em (responde_a) — parcial: `where responde_a is not null`; `andamentos_origem_unica` único em (caso_id, origem, origem_id) — parcial: `where origem_id is not null`
- **Nota:** O app grava por dezenas de pontos (POST /rest/v1/andamentos), sempre com caso_id, autor_id, texto e — quando vem de robô — origem + origem_id (app.html:3428, 4342, 4445). sync_todo escreve na importação (migrar.py:241-250, com id determinístico UUID5 para não duplicar) e escrever_todo.py:204/215 marca `todo_sync:true` e apaga de vez os que o autor marcou `excluir` (escrever_todo.py:159 lê `excluir=eq.true`, linha 179 dá o DELETE). robo_crps insere comentários novos em robo-crps/robo.js:127 e robo-crps/ingerir.js:232. smbot insere pela zap_virar_andamento. gatilho_sql lê: o trigger `caso_tocado_ins` (schema.sql:1897) usa new.caso_id e new.criado_em para carimbar casos.revisado_em. `origem` aceita 'dou' (schema.sql:2177) mas o dou_rotina.py não fala com o Supabase — ele só cria tarefa no Microsoft To Do (dou_rotina.py:252-295), então nada nasce com essa origem hoje. Os andamentos com origem='pje' são escritos pelo APP (app.html:4342), não pela extensão.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | uuid | não | `gen_random_uuid()` | — | 100.0% (20638) |
| `autor_id` | uuid | sim | — | `colaboradores.id` | 89.9% (18561) |
| `caso_id` | uuid | não | — | `casos.id` | 100.0% (20638) |
| `criado_em` | timestamp with time zone | não | `now()` | — | 100.0% (20638) |
| `excluir` | boolean | não | `False` | — | 100.0% (20638) |
| `origem` | text | não | `app` | — | 100.0% (20638) |
| `origem_id` | text | sim | — | — | 7.5% (1549) |
| `publico` | boolean | não | `False` | — | 100.0% (20638) |
| `responde_a` | uuid | sim | — | `andamentos.id` | 0.0% (3) |
| `texto` | text | não | — | — | 100.0% (20638) |
| `todo_sync` | boolean | não | `False` | — | 100.0% (20638) |
| `zap_mensagem_id` | uuid | sim | — | `zap_mensagens.id` | 0.0% (0) |

> **Em 0%, candidatas a morte:** `responde_a`, `zap_mensagem_id`

### `orgao_producao`

**Velocidade de julgamento de cada gabinete/órgão (painel Justiça em Números do CNJ), usada para estimar quando o processo do cliente vai ser julgado.**

- **Escreve:** ninguém
- **Lê:** ninguém
- **Linhas:** 7763
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** só a chave primária
- **Nota:** ATENÇÃO — nenhum dos atores da lista escreve ou lê esta tabela; por isso 'ninguem' nos dois campos. Quem escreve de verdade é crm/cnj_producao.py:265 `_rest("POST", "/rest/v1/orgao_producao", linhas[i:i+500], prefer="resolution=merge-duplicates,return=minimal")`, com as linhas montadas em crm/cnj_producao.py:152-156. Quem lê de verdade é crm/trf3_ordem.py:343-346 `_todas("/rest/v1/orgao_producao?tribunal=eq.TRF3&select=orgao,grau,julgados_ano_anterior,julgados_ano_atual,dias_medios_julgamento&order=orgao")`. Os dois rodam no mesmo workflow que o datajud (.github/workflows/consultas-publicas.yml:56-68), mas são arquivos distintos de crm/datajud.py. O CRM (app.html) NÃO conhece esta tabela: o resultado chega ao advogado já digerido dentro de casos.trf3 (PATCH em crm/trf3_ordem.py:382). Colunas realmente vivas: `orgao` (casamento de gabinete, crm/cnj_producao.py:201/212 e crm/trf3_ordem.py:371), `julgados_ano_anterior` (crm/cnj_producao.py:168, crm/trf3_ordem.py:372), `julgados_ano_atual` (crm/cnj_producao.py:171, só como plano B quando não há ano fechado) e `dias_medios_julgamento` (crm/trf3_ordem.py:373). `tribunal` é usada apenas como filtro na URL (crm/trf3_ordem.py:343, fixo em TRF3), o valor nunca é lido em memória — e note que cnj_producao.py grava TODOS os tribunais onde há processo nosso (crm/cnj_producao.py:244), então a produção de tribunal que não seja o TRF3 é gravada e nunca consultada.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `grau` 🔑 | text | não | — | — | 100.0% (7763) |
| `orgao` 🔑 | text | não | — | — | 100.0% (7763) |
| `tribunal` 🔑 | text | não | — | — | 100.0% (7763) |
| `atualizado_em` | date | não | `CURRENT_DATE` | — | 100.0% (7763) |
| `conclusos_julgamento` | int32 | sim | — | — | 100.0% (7763) |
| `dias_medios_julgamento` | int32 | sim | — | — | 64.7% (5019) |
| `julgados_ano_anterior` | int32 | sim | — | — | 100.0% (7763) |
| `julgados_ano_atual` | int32 | sim | — | — | 100.0% (7763) |

### `tarefas`

**Os afazeres: o checklist de documentos de cada caso e as tarefas particulares de cada pessoa do escritório, com prazo e baixa.**

- **Escreve:** app (CRM no navegador), sincronização do To Do
- **Lê:** app (CRM no navegador)
- **Linhas:** 7657
- **RLS:** ligada
- **Políticas:** `tarefas_visiveis` — select para `authenticated`; `tarefas_escrita` — insert para `authenticated`; `tarefas_update` — update para `authenticated`; `tarefas_delete` — delete para `authenticated`
- **Índices:** `tarefas_prazo` em (prazo) — parcial: `where not concluida`
- **Nota:** Escritas do app: tarefa particular (app.html:5112 — titulo, prazo, particular_de), item de checklist do caso (10972, 11280, 11294, 12039, 12119, 13140 — caso_id + titulo) e a baixa (5084 e 10981 — concluida + concluida_em). sync_todo escreve na importação: tarefa da lista particular (migrar.py:151-158), item de checklist virando subtarefa (migrar.py:284-289) e os '📄 documentos solicitados' extraídos dos andamentos (migrar.py:381-386). ATENÇÃO — `cliente_id` (schema.sql:123) NÃO É ESCRITA NEM LIDA POR NINGUÉM: não existe nenhum body JSON com cliente_id em POST /rest/v1/tarefas no app.html, migrar.py não põe a chave em nenhuma das três construções de tarefa, e não há nenhum `t.cliente_id` em lugar nenhum. Toda tarefa se pendura em caso_id ou em particular_de. `particular_de` também é lida pelo próprio banco, na política de RLS que esconde a tarefa pessoal dos outros (schema.sql:1938-1941).

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | uuid | não | `gen_random_uuid()` | — | 100.0% (7657) |
| `caso_id` | uuid | sim | — | `casos.id` | 90.8% (6955) |
| `cliente_id` | uuid | sim | — | `clientes.id` | 0.0% (0) |
| `concluida` | boolean | não | `False` | — | 100.0% (7657) |
| `concluida_em` | timestamp with time zone | sim | — | — | 8.7% (665) |
| `criado_em` | timestamp with time zone | não | `now()` | — | 100.0% (7657) |
| `particular_de` | uuid | sim | — | `colaboradores.id` | 9.2% (702) |
| `prazo` | date | sim | — | — | 8.1% (618) |
| `titulo` | text | não | — | — | 100.0% (7657) |

> **Em 0%, candidatas a morte:** `cliente_id`

### `casos`

**Cada pedido ou processo do cliente: benefício, em que fase está (Escritório, INSS, Conselho, Judicial), números (NB, protocolo, CNJ, NUP do recurso), prazos, datas do benefício e o resultado final.**

- **Escreve:** app (CRM no navegador), sincronização do To Do, robô do CRPS, consulta CNJ (DataJud), gatilho no banco
- **Lê:** app (CRM no navegador), sincronização do To Do, robô do PAT/INSS, robô do CRPS, consulta CNJ (DataJud), coletor do PJe, SMBot (WhatsApp)
- **Linhas:** 3069
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** `casos_cliente` em (cliente_id); `casos_fase` em (fase)
- **Nota:** Escritor concentrado: `patchCaso()` (app.html:1863) é a porta única de PATCH do app, com ~52 chamadas. Do lado de fora do app escrevem: sync_todo (migrar.py:220-231 — titulo, beneficio, parceria, protocolos, fase, nb, processo, prazo, importante, origem_lista, todo_task_id, encerrado_em) e escrever_todo.py:104/144/149 (todo_task_id, origem_lista, mover_para); robo_crps (crps em robo-crps/robo.js:252 e ingerir.js:240, `importante:true` em ingerir.js:240, crps_nups em importar_favoritos.js:165); datajud (datajud.py:450 — datajud e datajud_multi); gatilho_sql (revisado_em). ROBO_PAT E PJE NÃO ESCREVEM DIRETO: robo-pat/importar.js só monta o plano (o arquivo diz 'Este arquivo NÃO grava nada', linha 3) e a extensão do PJe só grava na tabela `coletas` (extensao/crm-api.js:99) — quem aplica os dois é o app (app.html:3422-3438 para o PAT, 4089/4292/4333 para o PJe). FORA DA LISTA DE ATORES: crm/trf3_ordem.py:382 escreve `casos.trf3` e crm/inss_fila.py:294 escreve `casos.inss_fila` (ambas lidas pelo app em 10742-10898 e 7905-7940). COLUNAS TOTALMENTE MORTAS (nem escritas nem lidas por ninguém): `todo_list_id` (schema.sql:65 — a única ocorrência no repositório inteiro), `ronda` (schema.sql:2093; o próprio comentário diz 'a tela não usa') e `lembrete_meses` (schema_por_em_dia.sql:171).

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | uuid | não | `gen_random_uuid()` | — | 100.0% (3069) |
| `ajuizado_em` | date | sim | — | — | 5.1% (155) |
| `arquivados` | jsonb | não | — | — | 0.0% (1) |
| `beneficio` | text | sim | — | — | 39.7% (1218) |
| `cadunico` | date | sim | — | — | 0.0% (0) |
| `classe_judicial` | text | sim | — | — | 5.1% (155) |
| `cliente_id` | uuid | não | — | `clientes.id` | 100.0% (3069) |
| `criado_em` | timestamp with time zone | não | `now()` | — | 100.0% (3069) |
| `crps` | jsonb | sim | — | — | 1.4% (42) |
| `crps_nup` | text | sim | — | — | 0.0% (1) |
| `crps_nups` | jsonb | não | — | — | 1.4% (42) |
| `dat` | date | sim | — | — | 0.0% (0) |
| `datajud` | jsonb | sim | — | — | 6.9% (213) |
| `datajud_multi` | jsonb | sim | — | — | 0.0% (0) |
| `dcb` | date | sim | — | — | 0.0% (0) |
| `dcb_prorrogacao_pedida` | boolean | não | `False` | — | 100.0% (3069) |
| `dcb_prorrogar_em` | date | sim | — | — | 0.0% (0) |
| `decisao_em` | date | sim | — | — | 0.0% (0) |
| `der` | date | sim | — | — | 3.8% (116) |
| `dib` | date | sim | — | — | 0.0% (0) |
| `dii` | date | sim | — | — | 0.0% (0) |
| `encerrado_em` | timestamp with time zone | sim | — | — | 76.3% (2342) |
| `encerrado_por` | uuid | sim | — | `colaboradores.id` | 0.1% (3) |
| `especie` | text | sim | — | — | 1.1% (34) |
| `exigencia_descricao` | text | sim | — | — | 0.0% (0) |
| `exigencia_prazo` | date | sim | — | — | 0.0% (0) |
| `fase` | text | não | `escritorio` | — | 100.0% (3069) |
| `importante` | boolean | não | `False` | — | 100.0% (3069) |
| `inss_fila` | jsonb | sim | — | — | 2.1% (64) |
| `lembrar_motivo` | text | sim | — | — | 0.1% (2) |
| `lembrete_meses` | int32 | sim | — | — | 0.0% (0) |
| `marcadores` | jsonb | não | — | — | 0.5% (15) |
| `mover_para` | text | sim | — | — | 0.0% (1) |
| `nb` | text | sim | — | — | 5.5% (168) |
| `orgao_judicial` | text | sim | — | — | 4.5% (138) |
| `origem_lista` | text | sim | — | — | 99.8% (3063) |
| `parceria` | text | sim | — | — | 7.1% (218) |
| `pje_link` | text | sim | — | — | 5.1% (155) |
| `prazo` | date | sim | — | — | 48.3% (1483) |
| `processo` | text | sim | — | — | 9.3% (284) |
| `processo_link` | text | sim | — | — | 3.8% (116) |
| `processos` | jsonb | não | — | — | 9.3% (284) |
| `protocolos` | jsonb | não | — | — | 12.9% (395) |
| `renda_acima_minimo` | boolean | não | `False` | — | 100.0% (3069) |
| `resultado` | text | sim | — | — | 0.1% (2) |
| `revisado_em` | date | sim | — | — | 64.5% (1978) |
| `ronda` | jsonb | não | — | — | 0.0% (0) |
| `situacao_inss` | text | sim | — | — | 3.8% (116) |
| `titulo` | text | não | — | — | 100.0% (3069) |
| `todo_list_id` | text | sim | — | — | 0.0% (0) |
| `todo_task_id` | text | sim | — | — | 99.0% (3037) |
| `trf3` | jsonb | sim | — | — | 5.5% (168) |
| `urgente` | boolean | não | `False` | — | 100.0% (3069) |

> **Em 0%, candidatas a morte:** `arquivados`, `cadunico`, `crps_nup`, `dat`, `datajud_multi`, `dcb`, `dcb_prorrogar_em`, `decisao_em`, `dib`, `dii`, `exigencia_descricao`, `exigencia_prazo`, `lembrete_meses`, `mover_para`, `ronda`, `todo_list_id`

### `clientes`

**O cadastro da pessoa atendida: nome, CPF, data de nascimento, telefones, endereço e os dados civis (RG, estado civil, profissão) que a procuração e o contrato precisam para sair prontos.**

- **Escreve:** app (CRM no navegador), sincronização do To Do
- **Lê:** app (CRM no navegador), sincronização do To Do, robô do CRPS, SMBot (WhatsApp), gatilho no banco
- **Linhas:** 1890
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** `clientes_nome` em (nome)
- **Nota:** Escritas do app: nome/cpf/telefone/dn/endereco (app.html:8971), sexo (8919), aposentado+aposentado_fonte+aposentado_em+aposentado_prova (8880), rg/rg_orgao/estado_civil/profissao/nome_mae/pis_nit (12193, via salvarCliCampo), telefones (12250) e o jsonb `campos` (12101, 12923, 12936, 12979, 13012, 13039, 13052). O sync_todo escreve nome/cpf/dn/telefone (crm/fase2/migrar.py:167-172) e o `campos` das tarefas de 🙋 Escritório (migrar.py:743). FORA DA LISTA DE ATORES: crm/fase2/detectar_aposentado.py:146 também grava aposentado/aposentado_fonte/aposentado_em/aposentado_prova. Leituras: smbot procura o cliente pelo telefone (schema.sql:320 `select id into v_cli from clientes where fone_chave(telefone)=v_chave`) e zap_gerar_avisos usa nome/telefone/dn para o parabéns de aniversário (schema.sql:1520-1524). ATENÇÃO: `indicado_por` (schema_por_em_dia.sql:313 / schema_f9_cadastro.sql:66) não é escrita NEM lida por nenhum código — coluna morta. Todo o endereço estruturado (logradouro/numero/complemento/bairro/cidade/uf/cep) só pode ser preenchido à mão no SQL: a tela nunca grava esses campos.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | uuid | não | `gen_random_uuid()` | — | 100.0% (1890) |
| `aposentado` | boolean | sim | — | — | 0.1% (1) |
| `aposentado_em` | date | sim | — | — | 0.1% (1) |
| `aposentado_fonte` | text | sim | — | — | 0.1% (1) |
| `aposentado_prova` | text | sim | — | — | 0.0% (0) |
| `bairro` | text | sim | — | — | 0.0% (0) |
| `campos` | jsonb | não | — | — | 0.1% (2) |
| `cep` | text | sim | — | — | 0.0% (0) |
| `cidade` | text | sim | — | — | 0.0% (0) |
| `complemento` | text | sim | — | — | 0.0% (0) |
| `cpf` | text | sim | — | — | 87.1% (1647) |
| `criado_em` | timestamp with time zone | não | `now()` | — | 100.0% (1890) |
| `dn` | text | sim | — | — | 42.3% (800) |
| `endereco` | text | sim | — | — | 0.0% (0) |
| `endereco_legado` | text | sim | — | — | 0.0% (0) |
| `estado_civil` | text | sim | — | — | 0.0% (0) |
| `indicado_por` | text | sim | — | — | 0.0% (0) |
| `logradouro` | text | sim | — | — | 0.0% (0) |
| `nome` | text | não | — | — | 100.0% (1890) |
| `nome_mae` | text | sim | — | — | 0.0% (0) |
| `numero` | text | sim | — | — | 0.0% (0) |
| `pis_nit` | text | sim | — | — | 0.0% (0) |
| `profissao` | text | sim | — | — | 0.0% (0) |
| `rg` | text | sim | — | — | 0.0% (0) |
| `rg_orgao` | text | sim | — | — | 0.0% (0) |
| `sexo` | text | sim | — | — | 0.5% (10) |
| `telefone` | text | sim | — | — | 29.2% (551) |
| `telefones` | jsonb | não | — | — | 29.2% (551) |
| `uf` | text | sim | — | — | 0.0% (0) |

> **Em 0%, candidatas a morte:** `aposentado_prova`, `bairro`, `cep`, `cidade`, `complemento`, `endereco`, `endereco_legado`, `estado_civil`, `indicado_por`, `logradouro`, `nome_mae`, `numero`, `pis_nit`, `profissao`, `rg`, `rg_orgao`, `uf`

### `eventos`

**A agenda do caso: perícia, audiência ou avaliação social — quando, onde, e se está marcada, já foi realizada ou foi cancelada.**

- **Escreve:** app (CRM no navegador), sincronização do To Do
- **Lê:** app (CRM no navegador), SMBot (WhatsApp)
- **Linhas:** 1248
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** `eventos_data` em (data_hora); `eventos_dedupe` único em (caso_id, tipo, data_hora)
- **Nota:** Todas as sete colunas (id, caso_id, tipo, data_hora, local, status, obs) são escritas e lidas. Escritas do app: agendamento manual (app.html:11556-11559), perícia detectada no texto do andamento (11108-11110, que é quem preenche `obs`), agendamento vindo da sugestão (4813, 4844), perícia importada do PAT (3461-3462), cancelar/comparecer via PATCH de `status` (11569, 11579) e o carimbo '📞 avisado' em `obs` (11626). sync_todo escreve na importação (migrar.py:302-308). Leituras: calendário e listas do app (6283, 7654-7656) e, do lado do banco, a função zap_gerar_avisos() monta o lembrete de perícia lendo eventos.data_hora/status/tipo/local (crm/fase2/schema.sql:1487-1493). O robô do PAT propõe perícias novas (robo-pat/importar.js:126-133, eventosNovos), mas quem grava é o app. Há índice único (caso_id, tipo, data_hora) em schema.sql:101 — é o que impede a mesma perícia entrar duas vezes.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | uuid | não | `gen_random_uuid()` | — | 100.0% (1248) |
| `caso_id` | uuid | não | — | `casos.id` | 100.0% (1248) |
| `data_hora` | timestamp with time zone | não | — | — | 100.0% (1248) |
| `local` | text | sim | — | — | 0.3% (4) |
| `obs` | text | sim | — | — | 99.6% (1243) |
| `status` | text | não | `agendada` | — | 100.0% (1248) |
| `tipo` | text | não | — | — | 100.0% (1248) |

### `credenciais`

**Cofre das senhas do cliente (Meu INSS, gov.br), guardadas fora da ficha para que o acesso possa ser registrado.**

- **Escreve:** app (CRM no navegador), sincronização do To Do
- **Lê:** app (CRM no navegador)
- **Linhas:** 1240
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** só a chave primária
- **Nota:** Leitura em duas etapas, de propósito: a ficha carrega só `id,tipo,cliente_id` (app.html:7178) para saber SE existe senha, e o `valor` só sai do banco quando alguém clica em copiar ou ver (app.html:13215 e 13221, `select=valor`), momento em que o app grava a auditoria em credencial_vis. `tipo` é lido em app.html:7538 `creds.find(cr=>cr.tipo==="meu_inss")`. Trocar a senha é criar linha nova e apagar a antiga (app.html:8993-8995), então não fica histórico. A sincronização do To Do (migrar.py:193 e 264) cria a senha extraída do checklist com id determinístico e sobe com `ignore-duplicates` (migrar.py:808), ou seja, nunca sobrescreve o que o app gravou.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | uuid | não | `gen_random_uuid()` | — | 100.0% (1240) |
| `cliente_id` | uuid | não | — | `clientes.id` | 100.0% (1240) |
| `criado_em` | timestamp with time zone | não | `now()` | — | 100.0% (1240) |
| `tipo` | text | não | — | — | 100.0% (1240) |
| `valor` | text | não | — | — | 100.0% (1240) |

### `inss_fila`

**Retrato mensal oficial da fila do INSS — quantos pedidos de cada serviço estão parados em cada estado e há quanto tempo — usado para dizer ao cliente quanto a análise costuma demorar.**

- **Escreve:** ninguém
- **Lê:** ninguém
- **Linhas:** 844
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** só a chave primária
- **Nota:** ATENÇÃO — a tabela inss_fila é ESCRITA por crm/inss_fila.py:275 (script mensal do workflow .github/workflows/inss-fila.yml, que NÃO está entre os atores da lista; por isso escritores ficou 'ninguem') e NUNCA É LIDA POR NINGUÉM: nenhuma coluna dela chega ao CRM. Todas as sete colunas são escrita-e-esquece. O que a ficha do cliente mostra (crm/fase2/app.html:7921-7933 e a mensagem copiada em app.html:7935-7943) vem de `casos.inss_fila`, uma coluna JSONB da tabela CASOS (declarada em crm/fase2/schema.sql:192) que o MESMO script grava caso a caso em crm/inss_fila.py:294 `_rest("PATCH", f"/rest/v1/casos?id=eq.{k['id']}", {"inss_fila": f})` — usando os dados que ainda estão na memória do processo (crm/inss_fila.py:288-292), sem passar pela tabela. Ou seja: a tabela é um arquivo morto do retrato mensal; se alguém apagá-la o CRM não muda em nada.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `servico` 🔑 | text | não | — | — | 100.0% (844) |
| `uf` 🔑 | text | não | — | — | 100.0% (844) |
| `atualizado_em` | date | não | `CURRENT_DATE` | — | 100.0% (844) |
| `dias_mediana` | int32 | sim | — | — | 100.0% (844) |
| `dias_p90` | int32 | sim | — | — | 100.0% (844) |
| `pendentes` | int32 | não | — | — | 100.0% (844) |
| `referencia` | date | não | — | — | 100.0% (844) |

### `lembretes`

**A obrigação periódica do cliente que não pertence a processo nenhum — pagar a GPS do INSS, renovar o CadÚnico, retomar contato daqui a X meses — com a data do próximo aviso.**

- **Escreve:** app (CRM no navegador), sincronização do To Do
- **Lê:** app (CRM no navegador), sincronização do To Do
- **Linhas:** 419
- **RLS:** ligada
- **Políticas:** `lembretes_autenticados` — all para `authenticated`
- **Índices:** `lembretes_do_cliente` em (cliente_id) — parcial: `where ativo`; `lembretes_vencendo` em (proximo_em) — parcial: `where ativo`
- **Nota:** App escreve em crm/fase2/app.html:8679-8682 (criarLembrete: cliente_id, tipo, titulo, detalhes, intervalo_meses, proximo_em, responsavel_id, criado_por), :8694-8695 (PATCH proximo_em ou ativo=false ao registrar o aviso), :8712 (PATCH proximo_em, adiar), :8721 (PATCH ativo=false, desligar), :8756 (PATCH detalhes, ao transferir anotação para andamento), :8790-8793 (casoViraLembrete, único ponto que grava origem_caso) e :13004-13008 (cronograma de GPS). Sincronização escreve em crm/fase2/migrar.py:200-213 (toda tarefa da lista '🙏 Aposentadorias Futuras' vira um lembrete com id determinístico) e faz upsert merge-duplicates em :823, atualizando só detalhes, proximo_em e ativo (crm/fase2/migrar.py:511-512). Sincronização também LÊ: crm/fase2/migrar.py:766-768 busca id, titulo, proximo_em, intervalo_meses, ativo, responsavel_id e origem_caso para não sobrescrever o que a equipe editou no app. App lê em crm/fase2/app.html:1922 (select=* com lembrete_avisos embutido), :2169 (contador do Meu Dia), :8577, :8597-8620 (painel), :8765 (blocoLembretes). ATENÇÃO: `origem_caso` é escrita SÓ pelo app (:8793) e lida SÓ pela sincronização (crm/fase2/migrar.py:777-779) — nunca aparece na tela. `criado_em` só tem o default now() e nunca é lida. Dentro do jsonb `detalhes`, a chave `cronograma` é gravada em :13007 e nunca renderizada (o painel em :8615 só mostra codigo, valor, dia e anotacoes).

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | uuid | não | `gen_random_uuid()` | — | 100.0% (419) |
| `ativo` | boolean | não | `True` | — | 100.0% (419) |
| `cliente_id` | uuid | não | — | `clientes.id` | 100.0% (419) |
| `criado_em` | timestamp with time zone | não | `now()` | — | 100.0% (419) |
| `criado_por` | uuid | sim | — | `colaboradores.id` | 0.0% (0) |
| `detalhes` | jsonb | não | — | — | 100.0% (419) |
| `intervalo_meses` | int32 | sim | — | — | 0.0% (0) |
| `origem_caso` | uuid | sim | — | — | 0.0% (0) |
| `proximo_em` | date | sim | — | — | 98.6% (413) |
| `responsavel_id` | uuid | sim | — | `colaboradores.id` | 0.0% (0) |
| `tipo` | text | não | `geral` | — | 100.0% (419) |
| `titulo` | text | não | — | — | 100.0% (419) |

> **Em 0%, candidatas a morte:** `criado_por`, `intervalo_meses`, `origem_caso`, `responsavel_id`

### `andamentos_lidos`

**O "visto" da equipe: registra qual colaborador já leu cada comentário do processo, e quando, para nenhuma novidade do INSS/PJe passar sem alguém conferir.**

- **Escreve:** app (CRM no navegador)
- **Lê:** app (CRM no navegador)
- **Linhas:** 374
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** `lidos_por_and` em (andamento_id)
- **Nota:** Tabela 100% do app: escreve em 5 pontos (app.html:4975 marcar novidades em lote, 6885 conclusão de tarefa, 6940 visto manual, 8452, 11236 autor já leu o que escreveu) e apaga para desfazer o visto (app.html:6935 DELETE). É lida embutida no select dos andamentos, não sozinha: app.html:1900 `select=...,andamentos_lidos(colaborador_id)` alimenta a caixa 📣 Novidades e app.html:7176 `andamentos_lidos(colaborador_id,lido_em)` alimenta a ficha do cliente. Nenhum robô, nenhuma sincronização e nenhum gatilho SQL tocam nela. Todas as três colunas têm uso real.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `andamento_id` 🔑 | uuid | não | — | `andamentos.id` | 100.0% (374) |
| `colaborador_id` 🔑 | uuid | não | — | `colaboradores.id` | 100.0% (374) |
| `lido_em` | timestamp with time zone | não | `now()` | — | 100.0% (374) |

### `inss_calendario`

**Calendário oficial de pagamento do INSS (competências de dez/25 a dez/26): em que dia o dinheiro cai na conta conforme o final do NB e se o cliente recebe até ou acima de um salário mínimo.**

- **Escreve:** ninguém
- **Lê:** app (CRM no navegador)
- **Linhas:** 260
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** só a chave primária
- **Nota:** Tabela inteiramente somente-leitura para o código: a única chamada REST é o GET de carga em crm/fase2/app.html:1918 `todas("inss_calendario","select=*").catch(()=>[])`. As 260 linhas são digitadas à mão no SQL (crm/fase2/schema.sql:1567 em diante, `insert into inss_calendario (competencia, faixa, final, pagamento) values`), conferidas contra o PDF oficial pelo teste crm/fase2/testes/inss_calendario.sql. Todas as 4 colunas são lidas e nenhuma é escrita por ator nenhum. Nenhuma função ou trigger do schema.sql a consulta — a tabela aparece só na lista de RLS (schema.sql:1926). Comportamento de borda deliberado: se a tabela estiver vazia o app avisa 'tabela do INSS não cadastrada no banco — rode o schema.sql' (app.html:5965-5967) em vez de chutar data; e o bloco avisa quando o calendário está acabando (app.html:5983-5985). Para 2027 é preciso substituir o bloco de INSERT à mão.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `competencia` 🔑 | date | não | — | — | 100.0% (260) |
| `faixa` 🔑 | text | não | — | — | 100.0% (260) |
| `final` 🔑 | int32 | não | — | — | 100.0% (260) |
| `pagamento` | date | não | — | — | 100.0% (260) |

### `sugestoes`

**Fila de sugestões geradas automaticamente todo dia (exigência a marcar, prazo parado, lembrete de perícia pronto) que só produzem efeito depois que alguém do escritório clica em Aceitar.**

- **Escreve:** app (CRM no navegador)
- **Lê:** app (CRM no navegador)
- **Linhas:** 204
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** `sugestoes_pend` em (status) — parcial: `where status = 'pendente'`
- **Nota:** ATENÇÃO: quem CRIA as linhas não está entre os atores listados — é crm/fase2/claude_rotina.py:282 `_rest("POST", "/rest/v1/sugestoes?on_conflict=id", ...)`, rodando pelo workflow .github/workflows/crm-claude.yml. O `id` é determinístico (uuid5 em claude_rotina.py:43) justamente para a mesma sugestão não nascer duas vezes. O app só DECIDE (PATCH em app.html:5263) e lê (app.html:1904 no carregamento, render em app.html:5236-5247). `dados` é o campo que faz a sugestão "valer": app.html:5252-5261 lê `dados.exigencia_prazo`, `dados.exigencia_descricao`, `dados.andamento` e `dados.mensagem` para aplicar no caso. `status` só é usado como filtro no servidor (app.html:1904) — nunca é lido em JavaScript. Nenhum robô, To Do, DOU, PJe ou gatilho SQL grava aqui.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | uuid | não | `gen_random_uuid()` | — | 100.0% (204) |
| `caso_id` | uuid | sim | — | `casos.id` | 100.0% (204) |
| `criado_em` | timestamp with time zone | não | `now()` | — | 100.0% (204) |
| `dados` | jsonb | não | — | — | 14.7% (30) |
| `decidido_em` | timestamp with time zone | sim | — | — | 0.0% (0) |
| `decidido_por` | uuid | sim | — | `colaboradores.id` | 0.0% (0) |
| `status` | text | não | `pendente` | — | 100.0% (204) |
| `texto` | text | não | — | — | 100.0% (204) |
| `tipo` | text | não | — | — | 100.0% (204) |
| `titulo` | text | não | — | — | 100.0% (204) |

> **Em 0%, candidatas a morte:** `decidido_em`, `decidido_por`

### `coletas`

**Fila de entrega da extensão do navegador: cada raspagem bruta do PAT/Meu INSS, do e-Recursos ou do PJe fica aqui esperando alguém conferir na tela antes de virar andamento na ficha.**

- **Escreve:** coletor do PJe, app (CRM no navegador)
- **Lê:** app (CRM no navegador)
- **Linhas:** 75
- **RLS:** ligada
- **Políticas:** `coletas_autenticados` — all para `authenticated`; `coletas_autenticados` — all para `authenticated`
- **Índices:** `coletas_pendentes` em (fonte, criado_em desc) — parcial: `where aplicada_em is null`
- **Nota:** Nenhuma coluna morta — as cinco têm uso real dos dois lados. ESCRITA: a extensão (crm/fase2/extensao/**, o ator 'pje' da lista) posta em crm/fase2/extensao/crm-api.js:97-104 `enviar(fonte, dados)` -> `POST /rest/v1/coletas` com `{fonte, dados}`, chamada com quatro valores de fonte: 'pat' (crm/fase2/extensao/ponte-pat.js:39), 'crps' (crm/fase2/extensao/crps.js:80), 'pje' (crm/fase2/extensao/pje.js:301) e 'pje-processo' (crm/fase2/extensao/pje.js:208). O app só escreve `aplicada_em`, para tirar a coleta da fila: crm/fase2/app.html:3147 (descartar as antigas), 3467 (após aplicar o PAT), 4312, 4348 e 4450. LEITURA: só o app — crm/fase2/app.html:3126-3127 `select=id,fonte,criado_em,numero:dados->>numero&aplicada_em=is.null` monta a fila; `fonte` e `criado_em` viram o cartão em app.html:3249-3253; `dados` é lido inteiro ao conferir (app.html:3155 usarColeta, 3972, 4250, 4378, 4425); `aplicada_em` é o filtro de pendência. OBSERVAÇÃO IMPORTANTE: os diretórios crm/fase2/robo-pat/** e crm/fase2/robo-crps/** NÃO tocam nesta tabela — são caminho de arquivo local, paralelo. RLS restrita a autenticados (crm/fase2/schema.sql:2159) de propósito: uma coleta do PAT carrega nome, protocolo e comentário de dezenas de clientes.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | uuid | não | `gen_random_uuid()` | — | 100.0% (75) |
| `aplicada_em` | timestamp with time zone | sim | — | — | 100.0% (75) |
| `criado_em` | timestamp with time zone | não | `now()` | — | 100.0% (75) |
| `dados` | jsonb | não | — | — | 100.0% (75) |
| `fonte` | text | não | — | — | 100.0% (75) |

### `atribuicoes`

**Quem cuida de cada caso — a mesma causa pode ter mais de um advogado ou estagiário responsável.**

- **Escreve:** app (CRM no navegador)
- **Lê:** app (CRM no navegador), SMBot (WhatsApp)
- **Linhas:** 47
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** só a chave primária
- **Nota:** Tabela de duas colunas, ambas chave primária (crm/fase2/schema.sql:135-139), e as duas são escritas e lidas. Escreve só o app: ao criar cliente/caso novo (app.html:5210, 5471, 6671, 10248, 10494), ao marcar/desmarcar responsável na ficha (7480 POST, 7487 DELETE) e ao fundir dois casos (11937). Lê o app no carregamento (app.html:1890 `todas("atribuicoes","select=*")`, indexado em D.atrDoCaso na linha 1948) e a função de WhatsApp zap_escolher_atendente(), que procura quem já cuida daquele cliente antes de entregar a conversa (crm/fase2/schema.sql:1086-1088 — `exists (select 1 from atribuicoes a join casos k on k.id = a.caso_id where a.colaborador_id = co.id ...)`). O sync_todo NÃO escreve aqui: a lista 'ordem' do subir_rest (crm/fase2/migrar.py:806-820) não inclui atribuicoes — quem veio do To Do nasce sem responsável, e alguém precisa marcar na tela.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `caso_id` 🔑 | uuid | não | — | `casos.id` | 100.0% (47) |
| `colaborador_id` 🔑 | uuid | não | — | `colaboradores.id` | 100.0% (47) |

### `documentos_beneficio`

**Catálogo de quais documentos o cliente precisa providenciar em cada benefício — vira a carta impressa que o cliente leva e o checklist do caso.**

- **Escreve:** app (CRM no navegador)
- **Lê:** app (CRM no navegador)
- **Linhas:** 22
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** só a chave primária
- **Nota:** Só duas colunas são realmente editáveis pelo CRM: `itens` e `observacoes`, pelo botão 'Salvar lista' (app.html:13197-13203). Consequência prática: o bloco 'Conforme a atividade do cliente' (coluna `extras`, que é a maior parte do catálogo — vínculos CLT, períodos rurais, PPP, CNIS etc.) APARECE na tela (app.html:12006 e 12887) mas não tem como ser alterado pelo app; só rodando SQL. Não há POST em lugar nenhum: benefício novo no catálogo também só entra por SQL. Leituras: impressão da carta (app.html:13158-13161), mensagem de WhatsApp (app.html:5849-5857), janela 'Solicitar documentos' na anotação (app.html:13102-13104), quadro do atendimento (app.html:12811-12813) e os datalists de benefício (app.html:5137, 5420, 7332, 7350, 7625). Nenhum robô (migrar/escrever_todo/robo-pat/robo-crps/datajud/dou/extensão) e nenhuma função SQL toca nesta tabela.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | uuid | não | `gen_random_uuid()` | — | 100.0% (22) |
| `beneficio` | text | não | — | — | 100.0% (22) |
| `extras` | text | sim | — | — | 100.0% (22) |
| `itens` | text | não | — | — | 100.0% (22) |
| `observacoes` | text | sim | — | — | 100.0% (22) |

### `lembrar_motivos`

**Lista editável dos motivos prontos do 'Lembrar em' / sugestões de andamento, minerada do histórico do To Do e filtrada por lista (INSS, Judicial, Conselho...).**

- **Escreve:** app (CRM no navegador)
- **Lê:** app (CRM no navegador)
- **Linhas:** 22
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** só a chave primária
- **Nota:** Escrita completa pelo app na caixa '✎ Sugestões de andamento': POST cria (app.html:11440-11441, `{texto,grupo,listas,ordem}` com ordem = max+1 calculado em app.html:11439), PATCH edita (app.html:11434-11435, `{texto,grupo,listas}`) e o ✕ faz exclusão lógica (app.html:11451-11452, `body:JSON.stringify({ativo:false})`). Duas assimetrias reais: (a) `ativo` só é escrito como FALSE — não há caminho no CRM para reativar um motivo removido, isso exige SQL (leitura em app.html:11341 `return ms.filter(m=>m.ativo!==false)`); (b) `ordem` é escrita só na criação, nunca no PATCH de edição — reordenar a lista também é SQL (lida em app.html:11439 e no `order=ordem` da carga, app.html:1911). `grupo` (app.html:11375, 11395), `texto` (app.html:8018, 11383) e `listas` (app.html:8017 `.filter(m=>!(m.listas||[]).length || (m.listas||[]).includes(k.fase))`, app.html:11424) são lidos e escritos normalmente. Se a tabela não existir, o app cai numa lista de reserva no código (MOTIVOS_PADRAO, app.html:11334-11337).

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | uuid | não | `gen_random_uuid()` | — | 100.0% (22) |
| `ativo` | boolean | não | `True` | — | 100.0% (22) |
| `grupo` | text | não | `🙋 Cliente` | — | 100.0% (22) |
| `listas` | jsonb | não | — | — | 68.2% (15) |
| `ordem` | int32 | não | `0` | — | 100.0% (22) |
| `seed` | text | sim | — | — | 95.5% (21) |
| `texto` | text | não | — | — | 100.0% (22) |

### `config_app`

**Ajustes que valem para todo o escritório e moram no banco em vez de em cada computador — endereço do painel do WhatsApp, horário e interruptores do robô de atendimento, e os carimbos de quando cada integração rodou pela última vez.**

- **Escreve:** app (CRM no navegador), sincronização do To Do, robô do CRPS, gatilho no banco, SMBot (WhatsApp)
- **Lê:** app (CRM no navegador), SMBot (WhatsApp)
- **Linhas:** 15
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** só a chave primária
- **Nota:** É o mural compartilhado do sistema, daí os cinco escritores. app grava qualquer ajuste da tela de Configurações (crm/fase2/app.html:1877-1879, função guardarCfgApp, upsert merge-duplicates) e lê tudo pelo cfgApp() de app.html:1875 (smbot_url em 4678, pat_ignorar em 3186, pje_ignorar em 4212, revisao_dias/revisao_dose em 8429, zap_* em 6015-6067, crps_estado em 6151). sync_todo grava o carimbo 'todo_sync_em' ao fim da importação (crm/fase2/migrar.py:920-923), lido no rodapé do menu em app.html:2309. robo_crps grava 'crps_estado'/'crps_visto_em' (crm/fase2/robo-crps/robo.js:56-59) e 'crps_sync_em' (crm/fase2/robo-crps/ingerir.js:245-247), lidos em app.html:6122 e 6151 — o robô só escreve, nunca lê. gatilho_sql grava por dentro da função crps_guardar_cracha (crm/fase2/schema.sql:2010 'crps_estado' e 2012 'crps_cracha_em'). smbot lê os interruptores do robô de WhatsApp nas funções zap_* (schema.sql:1235 `zap_bot_ligado`, 1243 `zap_pausa_bot`, 1474 `zap_avisos_ligado`, 1212-1214 horário e dias úteis). A escrita atribuída a smbot é literalmente de crm/fase2/ponte/ponte.js:60-63 (grava zap_status, zap_visto_em, zap_qr, lidos em app.html:5530/5551/6110) — a ponte não está na lista de atores da pergunta, mas é o processo do lado WhatsApp que alimenta as funções smbot_*/zap_*.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `chave` 🔑 | text | não | — | — | 100.0% (15) |
| `atualizado` | timestamp with time zone | não | `now()` | — | 100.0% (15) |
| `valor` | text | sim | — | — | 100.0% (15) |

### `modelos_mensagem`

**Mensagens prontas para mandar ao cliente pelo WhatsApp (lembrete de perícia, protocolo, deferimento, pedido de documentos), já com nome, data, hora e local preenchidos.**

- **Escreve:** app (CRM no navegador)
- **Lê:** app (CRM no navegador)
- **Linhas:** 13
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** só a chave primária
- **Nota:** Escrita só por POST (app.html:12084-12085, corpo `{titulo, texto, contexto}` — botão 'Salvar modelo' da aba Mensagens); não existe PATCH nem DELETE, então corrigir o texto de um modelo já criado só por SQL. Leituras no app: aba 5 da ficha do cliente (app.html:7785-7793), o ⚡ do WhatsApp agrupado por `contexto` (app.html:5817-5828) e o lembrete de perícia/audiência (app.html:11732-11733, via modeloPor(contexto) em app.html:2061). ATENÇÃO — leitor fora da lista de atores: crm/fase2/claude_rotina.py:265 `"modelos": {m["contexto"]: m["texto"] for m in g("/rest/v1/modelos_mensagem?select=contexto,texto")}` (a rotina diária de sugestões). BUG DE ORDEM NO SCHEMA: crm/fase2/schema.sql:658 faz `insert into modelos_mensagem (...)` 65 linhas ANTES do `create table if not exists modelos_mensagem` (schema.sql:723) — num banco virgem esse primeiro bloco de 7 mensagens falha; ele só funciona porque a tabela já existe nos bancos atuais. As funções smbot_*/zap_* não usam esta tabela: os avisos automáticos do WhatsApp têm texto próprio em zap_avisos (schema.sql:1443 e zap_gerar_avisos em schema.sql:1469-1540).

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | uuid | não | `gen_random_uuid()` | — | 100.0% (13) |
| `contexto` | text | não | `geral` | — | 100.0% (13) |
| `texto` | text | não | — | — | 100.0% (13) |
| `titulo` | text | não | — | — | 100.0% (13) |

### `frases_prontas`

**Frases de uso interno que a equipe repete ao escrever andamentos, oferecidas como sugestão embaixo do campo de anotação.**

- **Escreve:** app (CRM no navegador)
- **Lê:** app (CRM no navegador)
- **Linhas:** 11
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** só a chave primária
- **Nota:** A coluna `categoria` é morta: o schema criou e classificou os 11 seeds em 4 grupos (schema.sql:648-653) mas a tela nunca agrupou nada — as frases entram numa lista chapada junto com os motivos do Lembrar (app.html:8016-8019), ordenada só por texto (`order=texto` em app.html:1910). Toda frase criada pelo app nasce com categoria NULL. `texto` é a única coluna viva: lida em app.html:8019, escrita em app.html:11543-11544 (com try/catch para o 409 do unique). Não há PATCH nem DELETE — frase errada só sai por SQL. A coluna `id` é devolvida pelo select=* e guardada em D.frases (app.html:11545) mas nunca é usada.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | uuid | não | `gen_random_uuid()` | — | 100.0% (11) |
| `categoria` | text | sim | — | — | 100.0% (11) |
| `texto` | text | não | — | — | 100.0% (11) |

### `lista_pref`

**Guarda como cada lista do menu aparece para o escritório inteiro: a cor de fundo e a posição na barra lateral.**

- **Escreve:** app (CRM no navegador)
- **Lê:** app (CRM no navegador)
- **Linhas:** 9
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** só a chave primária
- **Nota:** Tabela exclusiva do app — nenhum robô e nenhum script Python a toca. `chave` é a visão ('meudia', 'fase:inss'…), escrita nos dois POST e lida como chave do mapa em app.html:1927 `D.prefPorLista = new Map((listaPref||[]).map(x=>[x.chave,x]))`. `fundo` é escrito em app.html:6494 e lido em app.html:2010 `return (p && p.fundo) || null`. `ordem` é escrito em app.html:6623 e lido em app.html:6614. Detalhe frágil: app.html:6623 reenvia o `fundo` atual junto com a ordem justamente porque o upsert por merge apagaria o fundo se ele não fosse repetido.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `chave` 🔑 | text | não | — | — | 100.0% (9) |
| `atualizado` | timestamp with time zone | não | `now()` | — | 100.0% (9) |
| `fundo` | text | sim | — | — | 22.2% (2) |
| `ordem` | int32 | sim | — | — | 77.8% (7) |

### `zap_bot_passos`

**O roteiro do robô de atendimento: o texto de cada passo do menu do WhatsApp, o que cada resposta do cliente aciona e em que ponto a conversa é entregue a uma pessoa do setor certo.**

- **Escreve:** app (CRM no navegador)
- **Lê:** app (CRM no navegador), gatilho no banco
- **Linhas:** 9
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** só a chave primária
- **Nota:** O app é o único escritor e mexe em exatamente dois campos: ativo e texto (app.html:6235-6236 `linha("data-bp-ativo","zap_bot_passos","ativo",...)` e `linha("data-bp-txt","zap_bot_passos","texto",...)`). Ou seja: pela tela dá para reescrever o que o robô fala e desligar um passo, mas mudar as teclas/palavras-chave do menu (opcoes) ou para qual setor o passo entrega (entrega_setor) exige SQL na mão. Quem lê no dia a dia é o gatilho: zap_bot() é função de trigger disparada por cada mensagem que entra (schema.sql:1226 e o trigger em 1302-1303), e usa também o passo 'fora_horario' (schema.sql:1253). Nenhuma coluna é escrita-e-nunca-lida. sync_todo, robo_pat, robo_crps, datajud, dou e pje não citam a tabela.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `chave` 🔑 | text | não | — | — | 100.0% (9) |
| `ativo` | boolean | não | `True` | — | 100.0% (9) |
| `entrega_setor` | text | sim | — | — | 77.8% (7) |
| `opcoes` | jsonb | não | — | — | 11.1% (1) |
| `ordem` | int32 | não | `0` | — | 100.0% (9) |
| `texto` | text | não | — | — | 100.0% (9) |

### `checklist_modelo`

**Roteiro-padrão de etapas por benefício — o caso novo já nasce com essas subtarefas no checklist.**

- **Escreve:** ninguém
- **Lê:** app (CRM no navegador)
- **Linhas:** 8
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** só a chave primária
- **Nota:** Tabela 100% somente-leitura para o código: no repositório inteiro há exatamente UMA chamada REST a ela, o GET de carga em crm/fase2/app.html:1908 `todas("checklist_modelo","select=*")`. Nenhum POST, nenhum PATCH, nenhum DELETE, em nenhum arquivo. As 8 linhas existentes vêm do seed manual em crm/fase2/schema.sql:844-853 (`on conflict (beneficio) do nothing`), logo mexer no roteiro de um benefício exige SQL. A coluna `id` (schema.sql:839) é carregada pelo select=* mas nunca é usada por nenhuma linha de código — nem lida nem escrita.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | uuid | não | `gen_random_uuid()` | — | 100.0% (8) |
| `beneficio` | text | não | — | — | 100.0% (8) |
| `itens` | text | não | — | — | 100.0% (8) |

### `credencial_vis`

**Livro de quem no escritório abriu ou copiou a senha de cada cliente, e quando.**

- **Escreve:** app (CRM no navegador)
- **Lê:** ninguém
- **Linhas:** 8
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** só a chave primária
- **Nota:** A tabela inteira é só escrita. O sistema promete ao cliente que o acesso à senha "fica registrado" (crm/fase2/app.html:7546 title="fica registrado quem copiou") e o registro é gravado de verdade, mas NENHUMA tela mostra esse histórico e nenhum robô o consulta — hoje só se descobre quem viu a senha de alguém abrindo o SQL Editor do Supabase. Além disso o POST é disparado sem `await` (app.html:13217 e 13223), então uma falha de rede perde o registro em silêncio: a senha aparece na tela do mesmo jeito.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `colaborador_id` | uuid | não | — | `colaboradores.id` | 100.0% (8) |
| `credencial_id` | uuid | não | — | `credenciais.id` | 100.0% (8) |
| `visto_em` | timestamp with time zone | não | `now()` | — | 100.0% (8) |

### `zap_avisos`

**O catálogo de lembretes automáticos ao cliente (perícia, audiência, CadÚnico, DCB e aniversário): quantos dias antes avisar, com que texto, e se a mensagem precisa ser conferida antes de sair.**

- **Escreve:** app (CRM no navegador)
- **Lê:** app (CRM no navegador), SMBot (WhatsApp)
- **Linhas:** 8
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** só a chave primária
- **Nota:** Nenhuma coluna é escrita-e-nunca-lida: até descricao, que o gerador ignora, é mostrada na tela de configurações (app.html:6080). O app é o único escritor e edita cinco campos, um a um, por PATCH: ativo, descricao, revisar, dias_antes e texto (app.html:6230-6234, via a função `linha(...)` de 6220-6229). Não existe POST nem DELETE — criar ou apagar uma regra de aviso é serviço de SQL na mão. Quem lê para valer é o smbot: zap_gerar_avisos (schema.sql:1469-1540) varre as quatro origens e enfileira em zap_mensagens como 'fila' ou, quando revisar=true, como 'rascunho' (schema.sql:1529). Quem chama essa função de hora em hora é a ponte (ponte.js:314 `rpc("zap_gerar_avisos", {})`), ator fora da lista. sync_todo, robo_pat, robo_crps, datajud, dou e pje não citam a tabela.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `chave` 🔑 | text | não | — | — | 100.0% (8) |
| `ativo` | boolean | não | `True` | — | 100.0% (8) |
| `descricao` | text | não | — | — | 100.0% (8) |
| `dias_antes` | int32 | não | — | — | 100.0% (8) |
| `ordem` | int32 | não | `0` | — | 100.0% (8) |
| `revisar` | boolean | não | `False` | — | 100.0% (8) |
| `sobre` | text | não | — | — | 100.0% (8) |
| `texto` | text | não | — | — | 100.0% (8) |
| `tipo_ev` | text | sim | — | — | 62.5% (5) |

### `colaboradores`

**Cadastro das pessoas do escritório — quem pode entrar no sistema, com que inicial e cor aparece nos processos, qual o cargo/setor e quem recebe conversa do WhatsApp.**

- **Escreve:** app (CRM no navegador)
- **Lê:** app (CRM no navegador), sincronização do To Do, robô do CRPS, SMBot (WhatsApp)
- **Linhas:** 6
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** só a chave primária
- **Nota:** Nenhum ator cria nem desativa colaborador: não existe POST em /rest/v1/colaboradores em lugar nenhum do repositório. O app só edita três interruptores da tela de Configurações (app.html:6167 atende_zap, 6176 cargo, 6183 setor), e essas três colunas também são lidas (app.html:6025/6031/6036 e schema.sql:1102 `co.setor = p_setor`), então nenhuma coluna é só-escrita. Admitir alguém no sistema é sempre um UPDATE manual no SQL Editor. A coluna `id` é gerada pelo banco (gen_random_uuid) e lida por todos como chave de autor/atribuição.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | uuid | não | `gen_random_uuid()` | — | 100.0% (6) |
| `atende_zap` | boolean | não | `False` | — | 100.0% (6) |
| `ativo` | boolean | não | `True` | — | 100.0% (6) |
| `auth_id` | uuid | sim | — | — | 16.7% (1) |
| `cargo` | text | sim | — | — | 100.0% (6) |
| `cor` | text | não | `#2564cf` | — | 100.0% (6) |
| `inicial` | text | não | — | — | 100.0% (6) |
| `nome` | text | não | — | — | 100.0% (6) |
| `papel` | text | não | `colaborador` | — | 100.0% (6) |
| `setor` | text | sim | — | — | 0.0% (0) |

> **Em 0%, candidatas a morte:** `setor`

### `aposentadorias`

**As datas em que cada cliente passa a ter direito de se aposentar (e de qual espécie), para o escritório avisá-lo antes de a data chegar.**

- **Escreve:** app (CRM no navegador)
- **Lê:** app (CRM no navegador)
- **Linhas:** 5
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** `apos_por_cliente` em (cliente_id, data); `apos_por_data` em (data)
- **Nota:** Único ator: o app. Escreve em crm/fase2/app.html:8306-8309 (POST com lembrar_em, ao adiar uma aposentadoria automática), :8302-8304 (PATCH lembrar_em) e :8905-8906 (POST salvarApos); apaga em :8912. Lê em crm/fase2/app.html:1914 (`select=*&order=data`), :8269, :8280-8286 (lembretesApos), :8814 e :8836-8846 (render da ficha). Nem migrar.py, nem detectar_aposentado.py, nem os robôs tocam nesta tabela (`rg aposentadorias` fora de app.html/schema só devolve o site institucional e a base de conhecimento) — detectar_aposentado.py escreve em `clientes.aposentado`, não aqui. COLUNA MORTA: `observacao` (crm/fase2/schema.sql:245) não é escrita nem lida — `rg observacao crm/fase2/app.html` = zero linhas. `criado_em` (crm/fase2/schema.sql:247) só tem o default now() e nunca é lida. `id` vem do default e é lido (:8842, :8850).

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | uuid | não | `gen_random_uuid()` | — | 100.0% (5) |
| `autor_id` | uuid | sim | — | `colaboradores.id` | 100.0% (5) |
| `cliente_id` | uuid | não | — | `clientes.id` | 100.0% (5) |
| `criado_em` | timestamp with time zone | não | `now()` | — | 100.0% (5) |
| `data` | date | não | — | — | 100.0% (5) |
| `especie` | text | não | — | — | 100.0% (5) |
| `lembrar_em` | date | sim | — | — | 100.0% (5) |
| `observacao` | text | sim | — | — | 0.0% (0) |

> **Em 0%, candidatas a morte:** `observacao`

### `andamento_tarefas`

**A tarefa pendurada num comentário do processo: para quem ela é, para que dia, e quando foi dada por concluída.**

- **Escreve:** app (CRM no navegador)
- **Lê:** app (CRM no navegador), gatilho no banco, SMBot (WhatsApp)
- **Linhas:** 4
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** `atarefas_minhas` em (colaborador_id, lembrar_em) — parcial: `where concluida_em is null`; `atarefas_caso` em (caso_id, lembrar_em) — parcial: `where concluida_em is null`
- **Nota:** Escrita só pelo app, em 8 pontos, todos com o mesmo corpo {andamento_id, caso_id, colaborador_id, atribuido_por, lembrar_em}: crm/fase2/app.html:4611 (encaminhar comentário), :4806 (caixa de segmento), :4823 (véspera de perícia), :4856, :6821 (o ＋ do comentário), :6898 (repetir a tarefa), :11225 (tarefa junto com o comentário novo) e :11682 (corrente de conferência do dinheiro). Baixa por PATCH concluida_em em :6874, :11633 e :11697; adiamento por PATCH lembrar_em em :6924; caso_id remendado na fusão em :11921. Leitores: (1) app — crm/fase2/app.html:1919 (`select=*&concluida_em=is.null`), :1936 (índice D.tarefasPorCaso), :7182 (as da ficha), :6759 e :6764-6776 (os chips de tarefa no comentário: colaborador_id, lembrar_em, concluida_em), :3564-3570, :3872, :5026, :6341; (2) gatilho_sql — o trigger `atarefa_avisar` em crm/fase2/schema.sql:1863-1879 lê new.atribuido_por, new.colaborador_id, new.andamento_id, new.caso_id e new.lembrar_em para criar a menção do destinatário; (3) smbot — a função `zap_escolher_atendente` em crm/fase2/schema.sql:1091-1093 lê colaborador_id, caso_id e concluida_em para mandar a conversa de WhatsApp para quem tem tarefa aberta do cliente. PONTO DE ATENÇÃO: `atribuido_por` é escrita pelo app nas 8 linhas acima e NUNCA é lida pelo app (`rg atribuido_por crm/fase2/app.html` devolve só escritas) — o único leitor é o gatilho SQL de crm/fase2/schema.sql:1868/1873, que a usa para o texto da menção; o 'P → A' que o comentário do schema promete (crm/fase2/schema.sql:1849) não aparece em tela nenhuma. `criado_em` (crm/fase2/schema.sql:1853) só tem o default now() e nunca é lida por ninguém.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | uuid | não | `gen_random_uuid()` | — | 100.0% (4) |
| `andamento_id` | uuid | não | — | `andamentos.id` | 100.0% (4) |
| `atribuido_por` | uuid | sim | — | `colaboradores.id` | 100.0% (4) |
| `caso_id` | uuid | não | — | `casos.id` | 100.0% (4) |
| `colaborador_id` | uuid | não | — | `colaboradores.id` | 100.0% (4) |
| `concluida_em` | timestamp with time zone | sim | — | — | 0.0% (0) |
| `criado_em` | timestamp with time zone | não | `now()` | — | 100.0% (4) |
| `lembrar_em` | date | não | — | — | 100.0% (4) |

> **Em 0%, candidatas a morte:** `concluida_em`

### `mencoes`

**Caixa de entrada pessoal de cada colaborador: avisa que alguém o citou com @ num comentário, delegou uma tarefa a ele, ou que tem cliente esperando resposta no WhatsApp.**

- **Escreve:** app (CRM no navegador), SMBot (WhatsApp), gatilho no banco
- **Lê:** app (CRM no navegador)
- **Linhas:** 4
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** `mencoes_caixa` em (para_id) — parcial: `where lida_em is null`
- **Nota:** Três origens distintas escrevem: o app quando o texto tem @Nome (app.html:5302, função criarMencoes); o gatilho SQL atarefa_avisar quando alguém atribui tarefa a outra pessoa (crm/fase2/schema.sql:1872, disparado pelo trigger de schema.sql:1878); e a função zap_entregar quando o WhatsApp cai no colo de um atendente (schema.sql:1134). Quem lê é só o app, e só as suas: app.html:1905 `para_id=eq.${eu.id}&lida_em=is.null`. Baixa em dois lugares: botão "resolvida" (app.html:5290) e marcar o comentário como lido, que resolve a menção junto (app.html:6948). CONSEQUÊNCIA PRÁTICA de conversa_id nunca ser lido: a menção vinda do WhatsApp chega sem `caso_id`, então o cartão em app.html:5285 não desenha o botão "abrir ficha" e não existe caminho na tela para abrir a conversa — só resta marcar como resolvida.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | uuid | não | `gen_random_uuid()` | — | 100.0% (4) |
| `andamento_id` | uuid | sim | — | `andamentos.id` | 100.0% (4) |
| `caso_id` | uuid | sim | — | `casos.id` | 100.0% (4) |
| `conversa_id` | uuid | sim | — | `zap_conversas.id` | 0.0% (0) |
| `criado_em` | timestamp with time zone | não | `now()` | — | 100.0% (4) |
| `de_id` | uuid | sim | — | `colaboradores.id` | 100.0% (4) |
| `lida_em` | timestamp with time zone | sim | — | — | 0.0% (0) |
| `para_id` | uuid | não | — | `colaboradores.id` | 100.0% (4) |
| `texto` | text | não | — | — | 100.0% (4) |

> **Em 0%, candidatas a morte:** `conversa_id`, `lida_em`

### `modelos_documento`

**Os modelos-ouro de documentos do escritório (procuração, contrato de honorários, hipossuficiência, autodeclaração rural), que saem impressos já preenchidos com os dados do cliente.**

- **Escreve:** app (CRM no navegador)
- **Lê:** app (CRM no navegador)
- **Linhas:** 4
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** só a chave primária
- **Nota:** Única tabela deste grupo com ciclo completo dentro do app: POST cria (app.html:5343-5345, corpo `{titulo, categoria, conteudo}`) e PATCH edita (app.html:5336-5337, corpo `{conteudo}`). Atenção: o PATCH só grava `conteudo` — depois de criado, título e categoria de um modelo não têm como ser corrigidos pelo CRM, só por SQL. Leituras: lista de modelos (app.html:5314-5318), botões de impressão na aba Mensagens da ficha, filtrados por `categoria` (app.html:7796-7797), e a geração do documento preenchido (app.html:13071-13074, com preencherDoc trocando {nome},{cpf},{endereco},{nb},{processo},{beneficio},{data} em app.html:13059-13068). Seed de 4 modelos em schema.sql:865-874. Nenhum robô nem função SQL toca nela.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | uuid | não | `gen_random_uuid()` | — | 100.0% (4) |
| `categoria` | text | não | `geral` | — | 100.0% (4) |
| `conteudo` | text | não | — | — | 100.0% (4) |
| `titulo` | text | não | — | — | 100.0% (4) |

### `vinculos`

**Liga um cliente a outro (esposa, irmão, quem indicou) — é o antigo checklist de parentes e amigos do To Do.**

- **Escreve:** app (CRM no navegador), sincronização do To Do
- **Lê:** app (CRM no navegador)
- **Linhas:** 4
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** `vinculos_ligado` em (ligado_a)
- **Nota:** As quatro colunas são escritas e lidas. O app grava cliente_id, ligado_a e relacao (crm/fase2/app.html:7860 `body:JSON.stringify({cliente_id:cliId, ligado_a:achados[0].id, relacao:rel})`) e a sincronização grava as mesmas mais o id determinístico (crm/fase2/migrar.py:318-319 `vinculos[vid] = {"id": vid, "cliente_id": cid, "ligado_a": outro, "relacao": relacao}`, subindo com `ignore-duplicates` na chave cliente_id,ligado_a — migrar.py:809). A leitura é a busca da ficha em app.html:7179 `select=*&or=(cliente_id.eq.${cliId},ligado_a.eq.${cliId})`, consumida em app.html:7570 (decide qual dos dois lados é "o outro"), app.html:7572 (mostra `v.relacao`) e app.html:7573/7865 (usa `v.id` para desvincular). O vínculo é gravado num sentido só, e por isso os dois lados do `or=` são obrigatórios — apagar esse `or` faria o parente sumir da ficha de metade dos clientes.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | uuid | não | `gen_random_uuid()` | — | 100.0% (4) |
| `cliente_id` | uuid | não | — | `clientes.id` | 100.0% (4) |
| `ligado_a` | uuid | não | — | `clientes.id` | 100.0% (4) |
| `relacao` | text | sim | — | — | 100.0% (4) |

### `crps_segredo`

**Cofre do "crachá" de login do gov.br que o robô usa para consultar os recursos no Conselho — fica num lugar que nem a tela do sistema consegue ler de volta.**

- **Escreve:** app (CRM no navegador), gatilho no banco
- **Lê:** robô do CRPS
- **Linhas:** 1
- **RLS:** ligada
- **Políticas:** nenhuma declarada
- **Índices:** só a chave primária
- **Nota:** Única tabela do conjunto onde o app escreve sem poder ler de volta: crm/fase2/schema.sql:1998 `alter table crps_segredo enable row level security;   -- ninguém lê pela API`, sem policy nenhuma. O app grava só através da RPC security definer (crm/fase2/app.html:6199 `api("/rest/v1/rpc/crps_guardar_cracha", ... {p_cracha:t})` → crm/fase2/schema.sql:2001-2013) e quem lê é o robô do CRPS com a service_role (crm/fase2/robo-crps/robo.js:141). O que a tela mostra sobre o crachá não é o crachá: é o semáforo 'crps_estado' (sem_cracha | ok | vencido) guardado no config_app e lido em crm/fase2/app.html:6151. A coluna `id` é fixa em 1 (schema.sql:1996 `constraint crps_segredo_unico check (id = 1)`), escrita pela função e usada como filtro pelo robô — a tabela guarda um crachá só, do escritório inteiro.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | int32 | não | `1` | — | 100.0% (1) |
| `atualizado_em` | timestamp with time zone | não | `now()` | — | 100.0% (1) |
| `cracha` | text | não | — | — | 100.0% (1) |

### `meu_dia`

**O 'para hoje' de cada pessoa: os casos que o colaborador puxou à mão para o dia dele, um registro por pessoa por dia.**

- **Escreve:** app (CRM no navegador)
- **Lê:** app (CRM no navegador)
- **Linhas:** 1
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** `meu_dia_unico` único em (colaborador_id, dia, coalesce(caso_id, '00000000-0000-0000-0000-000000000000') — parcial: `, coalesce(tarefa_id, '00000000-0000-0000-0000-000000000000'))`
- **Nota:** Único ator: o app. Escrita em crm/fase2/app.html:2140-2141 (`POST /rest/v1/meu_dia` com `{colaborador_id:eu.id, caso_id:casoId, dia:hoje()}`), apagada em :2137 (`DELETE /rest/v1/meu_dia?id=eq.${ja.id}`) e o caso_id é remendado na fusão de casos em :11921-11923. Leitura em crm/fase2/app.html:1894 (`select=*&dia=eq.<hoje>`), :2109, :2134, :2164 e :3869 — todas usam só `caso_id` e `colaborador_id`. COLUNA MORTA: `tarefa_id` (crm/fase2/schema.sql:146) não é escrita nem lida por ninguém — `rg tarefa_id` no repo só devolve o próprio schema (linhas 146, 148, 153) e um .md antigo; a ideia de pôr uma tarefa solta no Meu Dia nunca foi implementada, embora o CHECK de crm/fase2/schema.sql:148 a aceite. `dia` é escrita (:2141) e usada apenas como filtro da consulta (:1894, :2144) — nenhum JavaScript lê o valor dela. `id` vem do default gen_random_uuid() e é lido só para montar o DELETE (:2137).

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | uuid | não | `gen_random_uuid()` | — | 100.0% (1) |
| `caso_id` | uuid | sim | — | `casos.id` | 100.0% (1) |
| `colaborador_id` | uuid | não | — | `colaboradores.id` | 100.0% (1) |
| `dia` | date | não | `((now() AT TIME ZONE 'America/Sao_Paulo'::text))` | — | 100.0% (1) |
| `tarefa_id` | uuid | sim | — | `tarefas.id` | 0.0% (0) |

> **Em 0%, candidatas a morte:** `tarefa_id`

### `anexos`

**Índice dos documentos do cliente (laudo, CNIS, RG, CTPS) guardados no cofre de arquivos: em qual processo estão, quem enviou e quando.**

- **Escreve:** app (CRM no navegador)
- **Lê:** app (CRM no navegador)
- **Linhas:** 0
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** `anexos_por_caso` em (caso_id, criado_em desc); `anexos_por_cliente` em (cliente_id, criado_em desc)
- **Nota:** Atenção à ambiguidade do nome: existe a TABELA anexos e existe o BALDE (bucket) 'anexos' do Storage. Os robôs mexem no balde, não na tabela — crm/fase2/robo-crps/ingerir.js:25 `const BALDE = process.env.BUCKET || 'anexos'` e crm/fase2/ponte/ponte.js:31 idem; o acórdão que o robô do CRPS baixa vai para o balde e é preso ao andamento/caso, sem criar linha aqui. `grep -rn "rest/v1/anexos"` só encontra crm/fase2/app.html:9017 (POST) e crm/fase2/app.html:9035 (DELETE). Nenhuma coluna é só-escrita nem só-lida: o POST manda caso_id, cliente_id, autor_id, nome, caminho, tipo e tamanho (app.html:9018-9019) e a ficha usa cliente_id como filtro (app.html:7180), caso_id para separar por processo (app.html:9043), autor_id para o nome de quem anexou (app.html:9047), tipo para o ícone (app.html:9050), nome/criado_em/tamanho na linha do arquivo (app.html:9050-9051) e caminho para pedir a URL assinada (app.html:1736-1738, função abrirAnexo). `criado_em` vem do default now() (schema.sql:222) e é lido em app.html:9051 e usado na ordenação em app.html:7180.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | uuid | não | `gen_random_uuid()` | — | — (tabela vazia) |
| `autor_id` | uuid | sim | — | `colaboradores.id` | — (tabela vazia) |
| `caminho` | text | não | — | — | — (tabela vazia) |
| `caso_id` | uuid | sim | — | `casos.id` | — (tabela vazia) |
| `cliente_id` | uuid | sim | — | `clientes.id` | — (tabela vazia) |
| `criado_em` | timestamp with time zone | não | `now()` | — | — (tabela vazia) |
| `nome` | text | não | — | — | — (tabela vazia) |
| `tamanho` | int64 | sim | — | — | — (tabela vazia) |
| `tipo` | text | sim | — | — | — (tabela vazia) |

### `conversas`

**Histórico das mensagens de WhatsApp que chegam pelo SMBot — na prática, o registro de que o cliente procurou o escritório e quando.**

- **Escreve:** SMBot (WhatsApp)
- **Lê:** app (CRM no navegador), SMBot (WhatsApp)
- **Linhas:** 0
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** `conversas_fone` em (telefone, criado_em desc); `conversas_cliente` em (cliente_id, criado_em desc)
- **Nota:** NÃO confundir com zap_conversas (a ponte de WhatsApp própria do escritório, crm/fase2/schema.sql:906 e crm/fase2/ponte/**), que é outra tabela e não entra aqui. ESCRITA: só as funções SQL do SMBot — smbot_entrada (crm/fase2/schema.sql:340) e smbot_contato, esta com dois caminhos, com texto (schema.sql:452) e sem texto, registrando só a passagem no máximo a cada 10 minutos (schema.sql:462). LEITURA: o app em crm/fase2/app.html:7181, uma consulta por cliente ao abrir a ficha, cujo resultado alimenta a tarja "💬 falou pelo WhatsApp em ..." (app.html:8415-8422, colada na ficha em app.html:12390); e a própria smbot_contato, que lê `telefone` e `criado_em` em crm/fase2/schema.sql:459-461 para não gravar dez linhas iguais. `cliente_id` é usada só como filtro (app.html:7181) e é escrita em todos os inserts. COLUNAS TOTALMENTE MORTAS: `anexo_nome` e `anexo_url` (crm/fase2/schema.sql:888-889) não são escritas nem lidas por absolutamente nada no repositório — a promessa do comentário de crm/fase2/schema.sql:877 ("mensagens com anexo geram sugestão de andamento") nunca foi implementada. Somando: das 11 colunas, 4 são escritas e ignoradas, 2 não existem na prática, e só criado_em, texto, cliente_id e telefone fazem algum trabalho.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | uuid | não | `gen_random_uuid()` | — | — (tabela vazia) |
| `anexo_nome` | text | sim | — | — | — (tabela vazia) |
| `anexo_url` | text | sim | — | — | — (tabela vazia) |
| `atendente` | text | sim | — | — | — (tabela vazia) |
| `cliente_id` | uuid | sim | — | `clientes.id` | — (tabela vazia) |
| `criado_em` | timestamp with time zone | não | `now()` | — | — (tabela vazia) |
| `de_cliente` | boolean | não | `True` | — | — (tabela vazia) |
| `externo_id` | text | sim | — | — | — (tabela vazia) |
| `plataforma` | text | sim | — | — | — (tabela vazia) |
| `telefone` | text | sim | — | — | — (tabela vazia) |
| `texto` | text | sim | — | — | — (tabela vazia) |

### `integracao_token`

**Guarda o segredo que o atendimento de WhatsApp (SMBot) precisa apresentar para registrar um contato — é a única chave dessa integração, e trocá-la não mexe em mais nada.**

- **Escreve:** ninguém
- **Lê:** SMBot (WhatsApp)
- **Linhas:** 0
- **RLS:** ligada
- **Políticas:** nenhuma declarada
- **Índices:** só a chave primária
- **Nota:** Tabela 100% preenchida à mão: nenhum código de produção faz insert nem update. E é de propósito — crm/fase2/schema.sql:288 `alter table integracao_token enable row level security;   -- ninguém lê pela API` liga RLS sem criar policy nenhuma, então nem o app nem os robôs conseguem ler ou gravar pela API; só as funções security definer smbot_entrada e smbot_contato enxergam o token, e apenas para comparar com o que o webhook mandou (no corpo ou no cabeçalho `x-smbot-token`, schema.sql:413-414). A coluna `criado_em` (schema.sql:286, default now()) não é escrita nem lida por ninguém — nenhuma tela mostra a idade do token.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `nome` 🔑 | text | não | — | — | — (tabela vazia) |
| `criado_em` | timestamp with time zone | não | `now()` | — | — (tabela vazia) |
| `token` | text | não | — | — | — (tabela vazia) |

### `leads`

**Funil de vendas do escritório: cada prospecto que ainda não é cliente, da primeira conversa até virar contrato ou ser dado como perdido.**

- **Escreve:** app (CRM no navegador), SMBot (WhatsApp)
- **Lê:** app (CRM no navegador), SMBot (WhatsApp)
- **Linhas:** 0
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** `leads_etapa` em (etapa)
- **Nota:** O app cria (app.html:5458), arrasta entre etapas (app.html:5448) e marca o lead como convertido (app.html:5474 `{cliente_id:cli.id}` dentro de leadParaCliente). O SMBot cria lead sozinho quando um número desconhecido fala no WhatsApp (crm/fase2/schema.sql:329 e 443) e incrementa o contador (schema.sql:469). A função zap_abrir só LÊ (schema.sql:1023-1025) para ligar a conversa do WhatsApp ao prospecto. Colunas com uso real dos dois lados: nome, telefone, beneficio_interesse (app.html:5427 e 5470), origem (5428), etapa (5423/5445), cliente_id (5432-5433, 5587), ultimo_contato e contatos (ambas escritas só por schema.sql:469 e lidas em app.html:5429). Resumo: quatro das treze colunas (obs, motivo_perda, responsavel_id, atualizado_em) são gravadas e jogadas fora — o motivo da perda, em especial, é pedido ao usuário num prompt e nunca mais aparece.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | uuid | não | `gen_random_uuid()` | — | — (tabela vazia) |
| `atualizado_em` | timestamp with time zone | não | `now()` | — | — (tabela vazia) |
| `beneficio_interesse` | text | sim | — | — | — (tabela vazia) |
| `cliente_id` | uuid | sim | — | `clientes.id` | — (tabela vazia) |
| `contatos` | int32 | não | `0` | — | — (tabela vazia) |
| `criado_em` | timestamp with time zone | não | `now()` | — | — (tabela vazia) |
| `etapa` | text | não | `novo` | — | — (tabela vazia) |
| `motivo_perda` | text | sim | — | — | — (tabela vazia) |
| `nome` | text | não | — | — | — (tabela vazia) |
| `obs` | text | sim | — | — | — (tabela vazia) |
| `origem` | text | sim | — | — | — (tabela vazia) |
| `responsavel_id` | uuid | sim | — | `colaboradores.id` | — (tabela vazia) |
| `telefone` | text | sim | — | — | — (tabela vazia) |
| `ultimo_contato` | timestamp with time zone | sim | — | — | — (tabela vazia) |

### `lembrete_avisos`

**O histórico de 'já avisamos': quem falou com o cliente sobre aquele lembrete, quando e por qual canal — a resposta para "já avisamos a dona Marcela este mês?".**

- **Escreve:** app (CRM no navegador)
- **Lê:** app (CRM no navegador)
- **Linhas:** 0
- **RLS:** ligada
- **Políticas:** `lembrete_avisos_autenticados` — all para `authenticated`
- **Índices:** `avisos_do_lembrete` em (lembrete_id, em desc)
- **Nota:** Único ator: o app, e num único ponto de escrita — crm/fase2/app.html:8691-8692 (`POST /rest/v1/lembrete_avisos` com lembrete_id, colaborador_id, canal). Não há UPDATE nem DELETE em lugar nenhum: é um livro-caixa que só cresce. Leitura sempre por tabela embutida no carregamento do lembrete: crm/fase2/app.html:1922 (`select=*,lembrete_avisos(colaborador_id,em,canal)`), consumida em :8602-8603 e :8624. COLUNA MORTA: `obs` (crm/fase2/schema_por_em_dia.sql:212) não é escrita nem lida por ninguém. `id` (default gen_random_uuid, :207) também nunca é lida — nem para montar URL, porque a linha nunca é editada. `lembrete_id` é escrita (:8692) e nenhum JavaScript lê o valor dela, mas ela NÃO é supérflua: é a chave que o PostgREST usa para embutir os avisos dentro do lembrete em :1922.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | uuid | não | `gen_random_uuid()` | — | — (tabela vazia) |
| `canal` | text | sim | — | — | — (tabela vazia) |
| `colaborador_id` | uuid | sim | — | `colaboradores.id` | — (tabela vazia) |
| `em` | timestamp with time zone | não | `now()` | — | — (tabela vazia) |
| `lembrete_id` | uuid | não | — | `lembretes.id` | — (tabela vazia) |
| `obs` | text | sim | — | — | — (tabela vazia) |

### `pagamentos`

**Cada parcela de dinheiro do cliente — honorários, RPV, precatório, acordo — com o que já entrou, o que ainda vai vencer, e a corrente de quem recebeu e quem conferiu.**

- **Escreve:** app (CRM no navegador), sincronização do To Do
- **Lê:** app (CRM no navegador)
- **Linhas:** 0
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** `pagamentos_caso` em (caso_id); `pagamentos_todo_item` único em (todo_item_id); `pagamentos_cliente` em (cliente_id)
- **Nota:** Escrita pelo app em 5 pontos: crm/fase2/app.html:11720 (POST novoPgto: caso_id, cliente_id, descricao, valor, status, pago_em, vencimento, conferencias), :11845 (POST de honorários ao encerrar o caso — este NÃO manda cliente_id), :7498 (PATCH status/pago_em/conferencias no '💵 recebi'), :7507 (PATCH conferencias no '✔ conferi'), :7707 (PATCH caso_id ao escolher o benefício). Escrita pela sincronização em crm/fase2/migrar.py:439-458 (cada item do checklist da lista '💵 Pagamentos' vira uma parcela). Leitura só no app: crm/fase2/app.html:1893 (select=*), :3790 (quem está devendo), :6708 (dashboard, soma de `valor` dos abertos), :7210 (parcelas da ficha, por cliente_id ou caso_id), :7746-7752 (render: pago_em, vencimento, descricao, valor, conferencias, status). `conferencias` é do app e só do app — migrar.py nunca a envia (comentário em crm/fase2/migrar.py:815-817: 'conferências do app ficam intactas'). A sincronização NUNCA lê pagamentos do banco (os únicos _rest_todas de migrar.py são casos, clientes, lembretes e andamentos: linhas 588, 688, 766, 798, 886). `id` vem do default gen_random_uuid() (crm/fase2/schema.sql:104) — ninguém o escreve, o app o lê.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | uuid | não | `gen_random_uuid()` | — | — (tabela vazia) |
| `caso_id` | uuid | sim | — | `casos.id` | — (tabela vazia) |
| `cliente_id` | uuid | sim | — | `clientes.id` | — (tabela vazia) |
| `conferencias` | jsonb | não | — | — | — (tabela vazia) |
| `descricao` | text | não | — | — | — (tabela vazia) |
| `pago_em` | date | sim | — | — | — (tabela vazia) |
| `status` | text | não | `aberto` | — | — (tabela vazia) |
| `todo_item_id` | text | sim | — | — | — (tabela vazia) |
| `valor` | numeric | sim | — | — | — (tabela vazia) |
| `vencimento` | date | sim | — | — | — (tabela vazia) |

### `rotinas`

**Catálogo das tarefas fixas do escritório que se repetem (todo dia, dias úteis, um dia da semana ou um dia do mês) e que não pertencem a nenhum cliente.**

- **Escreve:** app (CRM no navegador)
- **Lê:** app (CRM no navegador)
- **Linhas:** 0
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** `rotinas_resp` em (responsavel_id) — parcial: `where ativo`
- **Nota:** Tabela exclusiva do app, sem robô nem gatilho. Todas as demais colunas têm uso real: titulo (app.html:6998 e 7035), detalhe (6999 e 7036), responsavel_id (6987 filtro por colaborador, 6995 e 7032 avatar), dias_semana e dia_mes (app.html:6967-6972 decidem se a rotina vence hoje, 6982-6984 escrevem a frase "dias úteis"/"todo dia 5"), ativo (filtro em app.html:1912 e 7030, contador na sidebar em 2241). Apagar uma rotina é lógico, nunca DELETE: app.html:7090 faz PATCH `{ativo:false}`, e por isso o histórico de rotinas_feitas não se perde.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | uuid | não | `gen_random_uuid()` | — | — (tabela vazia) |
| `ativo` | boolean | não | `True` | — | — (tabela vazia) |
| `criada_em` | timestamp with time zone | não | `now()` | — | — (tabela vazia) |
| `detalhe` | text | sim | — | — | — (tabela vazia) |
| `dia_mes` | int32 | sim | — | — | — (tabela vazia) |
| `dias_semana` | jsonb | não | — | — | — (tabela vazia) |
| `responsavel_id` | uuid | sim | — | `colaboradores.id` | — (tabela vazia) |
| `titulo` | text | não | — | — | — (tabela vazia) |

### `rotinas_feitas`

**O "já fiz" do dia: uma linha por rotina concluída em cada data — é o que faz a tarefa sumir do Meu Dia hoje e voltar no próximo dia programado.**

- **Escreve:** app (CRM no navegador)
- **Lê:** app (CRM no navegador)
- **Linhas:** 0
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** só a chave primária
- **Nota:** O comentário do schema (crm/fase2/schema.sql:569) promete "também o histórico de quem fez o quê" — esse histórico é gravado mas nunca consultado: colaborador_id e feito_em morrem no banco. Além disso o app só carrega o dia de hoje (app.html:1913 `select=*&dia=eq.${hoje()}`), então nem haveria como montar histórico sem uma consulta nova. Desmarcar é DELETE de verdade (app.html:7011), com a linha do dia sumindo. O POST usa `resolution=merge-duplicates` (app.html:7014) porque a chave primária é (rotina_id, dia).

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `dia` 🔑 | date | não | — | — | — (tabela vazia) |
| `rotina_id` 🔑 | uuid | não | — | `rotinas.id` | — (tabela vazia) |
| `colaborador_id` | uuid | sim | — | `colaboradores.id` | — (tabela vazia) |
| `feito_em` | timestamp with time zone | não | `now()` | — | — (tabela vazia) |

### `zap_conversas`

**A caixa de entrada do WhatsApp do escritório: uma linha por número de telefone, dizendo quem é a pessoa, quem do escritório está atendendo e se a conversa está aberta, pendente ou resolvida.**

- **Escreve:** app (CRM no navegador), SMBot (WhatsApp), gatilho no banco
- **Lê:** app (CRM no navegador), SMBot (WhatsApp), gatilho no banco
- **Linhas:** 0
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** `zap_conversas_chave` único em (chave); `zap_conversas_fila` em (status, ultima_em desc); `zap_conversas_cli` em (cliente_id)
- **Nota:** O escritor/leitor mais movimentado NÃO está na lista de atores: é a ponte do WhatsApp (crm/fase2/ponte/ponte.js), serviço Node que lê telefone (ponte.js:253 `select=telefone`) para saber para quem mandar e grava a foto de perfil (ponte.js:299-301 PATCH `{foto_url: caminho}`); foto_url é lida pelo app em assinarFotosZap (app.html:5574). Detalhe por ator: app escreve só nao_lidas=0 ao abrir (app.html:5619-5620) e atendente_id/bot_ativo/status por mudarConversa (app.html:5862-5871), e lê tudo (select=* em app.html:5512 + o resumo do badge em app.html:1917/1941); smbot escreve por zap_abrir (schema.sql:1014-1029), zap_transferir (1042) e zap_entregar (1126-1129); gatilho_sql escreve por zap_toque (983-991: ultima_em, ultimo_texto, nao_lidas, status), zap_bot (1259/1278/1293: bot_passo, bot_erros) e zap_humano_assumiu (1310-1312: bot_ativo, atendente_id). lead_id só serve para achar o nome do prospecto (app.html:5587). sync_todo, robo_pat, robo_crps, datajud, dou e pje não citam esta tabela em lugar nenhum.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | uuid | não | `gen_random_uuid()` | — | — (tabela vazia) |
| `atendente_id` | uuid | sim | — | `colaboradores.id` | — (tabela vazia) |
| `bot_ativo` | boolean | não | `True` | — | — (tabela vazia) |
| `bot_erros` | int32 | não | `0` | — | — (tabela vazia) |
| `bot_passo` | text | sim | — | — | — (tabela vazia) |
| `chave` | text | sim | — | — | — (tabela vazia) |
| `cliente_id` | uuid | sim | — | `clientes.id` | — (tabela vazia) |
| `criado_em` | timestamp with time zone | não | `now()` | — | — (tabela vazia) |
| `fixada` | boolean | não | `False` | — | — (tabela vazia) |
| `foto_url` | text | sim | — | — | — (tabela vazia) |
| `lead_id` | uuid | sim | — | `leads.id` | — (tabela vazia) |
| `nao_lidas` | int32 | não | `0` | — | — (tabela vazia) |
| `nome_perfil` | text | sim | — | — | — (tabela vazia) |
| `setor` | text | sim | — | — | — (tabela vazia) |
| `status` | text | não | `aberta` | — | — (tabela vazia) |
| `telefone` | text | não | — | — | — (tabela vazia) |
| `ultima_em` | timestamp with time zone | sim | — | — | — (tabela vazia) |
| `ultimo_texto` | text | sim | — | — | — (tabela vazia) |

### `zap_mensagens`

**O histórico da conversa em si: cada mensagem que entrou, saiu ou ficou como nota interna da equipe, com foto/áudio/documento anexado e o estado do envio (fila, enviada, entregue, lida ou erro).**

- **Escreve:** app (CRM no navegador), gatilho no banco, SMBot (WhatsApp)
- **Lê:** app (CRM no navegador), gatilho no banco, SMBot (WhatsApp)
- **Linhas:** 0
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** `zap_msg_conversa` em (conversa_id, seq); `zap_msg_fila` em (seq) — parcial: `where status = 'fila'`; `zap_msg_aviso_unico` único em (aviso_chave, aviso_ref) — parcial: `where aviso_chave is not null`
- **Nota:** Quem realmente fala com o WhatsApp é a ponte (crm/fase2/ponte/ponte.js), que não está na lista de atores: ela INSERE o que chega (ponte.js:196), pega a fila (ponte.js:233 `status=eq.fila`), marca enviando/enviada/erro (ponte.js:246, 266, 274) e atualiza entregue/lida pelo externo_id (ponte.js:157). Por ator: app grava mensagem e nota interna (app.html:5748-5753 POST com direcao/status 'interna' ou 'fila'), anexo (5787-5790), libera rascunho (5714-5715 PATCH `{status:'fila', autor_id:eu.id}`) e descarta rascunho (5721 DELETE); gatilho_sql grava as falas do robô (schema.sql:1251, 1257, 1281, 1291) e lê a última fala do bot (1244); smbot grava os avisos automáticos (zap_gerar_avisos, 1531) e lê a mensagem para virar andamento (zap_virar_andamento, schema.sql:1345). Colunas que só a ponte usa nas duas pontas (logo não entram em nenhuma das duas listas acima): externo_id (ponte.js:175 grava, 157 usa como chave de busca), tentativas (ponte.js:234 lê, 276 grava) e midia_mime (ponte.js:213 lê, 189 grava). erro é escrita pela ponte (ponte.js:276) e lida pelo app (app.html:5704). sync_todo, robo_pat, robo_crps, datajud, dou e pje não citam a tabela.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | uuid | não | `gen_random_uuid()` | — | — (tabela vazia) |
| `autor_id` | uuid | sim | — | `colaboradores.id` | — (tabela vazia) |
| `aviso_chave` | text | sim | — | — | — (tabela vazia) |
| `aviso_ref` | uuid | sim | — | — | — (tabela vazia) |
| `conversa_id` | uuid | não | — | `zap_conversas.id` | — (tabela vazia) |
| `criado_em` | timestamp with time zone | não | `now()` | — | — (tabela vazia) |
| `direcao` | text | não | — | — | — (tabela vazia) |
| `enviada_em` | timestamp with time zone | sim | — | — | — (tabela vazia) |
| `erro` | text | sim | — | — | — (tabela vazia) |
| `externo_id` | text | sim | — | — | — (tabela vazia) |
| `midia_mime` | text | sim | — | — | — (tabela vazia) |
| `midia_nome` | text | sim | — | — | — (tabela vazia) |
| `midia_url` | text | sim | — | — | — (tabela vazia) |
| `por_bot` | boolean | não | `False` | — | — (tabela vazia) |
| `quando_wa` | timestamp with time zone | sim | — | — | — (tabela vazia) |
| `seq` | int64 | não | — | — | — (tabela vazia) |
| `status` | text | não | `enviada` | — | — (tabela vazia) |
| `tentativas` | int32 | não | `0` | — | — (tabela vazia) |
| `texto` | text | sim | — | — | — (tabela vazia) |
| `tipo` | text | não | `texto` | — | — (tabela vazia) |

### `zap_transferencias`

**O livro de passagem de bastão do WhatsApp: registra que a conversa saiu das mãos de um colaborador para outro, quando e por quê.**

- **Escreve:** SMBot (WhatsApp)
- **Lê:** ninguém
- **Linhas:** 0
- **RLS:** ligada
- **Políticas:** `autenticados` — todas as operações para `authenticated` (`using true`)
- **Índices:** `zap_transf_conversa` em (conversa_id, em desc)
- **Nota:** Tabela 100% de escrita: hoje ela grava e ninguém consulta — nenhum relatório, nenhuma tela, nenhuma auditoria. Os únicos SELECTs existentes estão nos testes (crm/fase2/testes/zap.sql:118 e crm/fase2/testes/zap_bot.sql:187), que não são atores do sistema. Quem dispara a gravação é o app, mas indiretamente, pelo RPC (app.html:5884 `POST /rest/v1/rpc/zap_transferir`) — o app nunca faz INSERT direto. Atenção a um buraco de rastro: a distribuição AUTOMÁTICA do robô (zap_entregar, schema.sql:1119-1140) troca o atendente_id da conversa e cria uma menção, mas NÃO grava linha aqui; só a transferência feita à mão por um colaborador deixa rastro.

| Coluna | Tipo | Nulo | Padrão | FK | Preenchida |
|---|---|---|---|---|---|
| `id` 🔑 | uuid | não | `gen_random_uuid()` | — | — (tabela vazia) |
| `conversa_id` | uuid | não | — | `zap_conversas.id` | — (tabela vazia) |
| `de_id` | uuid | sim | — | `colaboradores.id` | — (tabela vazia) |
| `em` | timestamp with time zone | não | `now()` | — | — (tabela vazia) |
| `motivo` | text | sim | — | — | — (tabela vazia) |
| `para_id` | uuid | sim | — | `colaboradores.id` | — (tabela vazia) |

---

## A) Tabelas que existem no schema mas estão vazias ou ninguém lê

Vazia não quer dizer inútil: parte destas é estrutura pronta esperando o
recurso ser ligado. A coluna "o que fazer" separa as duas coisas.

| Tabela | Linhas | Por que está vazia | Detalhe |
|---|---:|---|---|
| `anexos` | 0 | recurso pronto, nunca ligado | o upload existe na tela; nenhum arquivo foi enviado até hoje |
| `conversas` | 0 | substituída na prática | o histórico de WhatsApp passou a viver no painel do SMBot |
| `integracao_token` | 0 | por desenho | RLS ligada e nenhuma política: a API não lê nem escreve; é cofre de token |
| `leads` | 0 | recurso pronto, nunca ligado | a tela de Vendas existe e nenhum lead foi cadastrado |
| `lembrete_avisos` | 0 | recurso ligado, ainda sem uso | há 419 lembretes vivos, mas ninguém registrou um aviso ainda — o histórico começa no primeiro clique |
| `pagamentos` | 0 | **vazia por defeito, não por desuso** | as 2.621 parcelas do To Do são recusadas a cada rodada com 42P10 — falta o índice único NÃO PARCIAL de `todo_item_id`. Última tentativa: sincronização de 15.08, 14h18 UTC |
| `rotinas` | 0 | recurso pronto, nunca ligado | as rotinas internas continuam no To Do, não aqui |
| `rotinas_feitas` | 0 | depende de `rotinas` | sem rotina cadastrada, não há o que marcar como feita |
| `zap_conversas` | 0 | recurso pronto, nunca ligado | o atendimento de WhatsApp dentro do CRM não foi ativado |
| `zap_mensagens` | 0 | depende de `zap_conversas` | sem conversa, não há mensagem |
| `zap_transferencias` | 0 | depende de `zap_conversas` | sem conversa, não há transferência entre atendentes |

Tabelas **com dado, mas que nenhum código escreve** (foram semeadas por SQL e vivem de leitura):
- `checklist_modelo` — 8 linha(s); Roteiro-padrão de etapas por benefício — o caso novo já nasce com essas subtarefas no checklist.
- `inss_calendario` — 260 linha(s); Calendário oficial de pagamento do INSS (competências de dez/25 a dez/26): em que dia o dinheiro cai na conta conforme o final do NB e se o cliente recebe até ou acima de um salário mínimo.
- `inss_fila` — 844 linha(s); Retrato mensal oficial da fila do INSS — quantos pedidos de cada serviço estão parados em cada estado e há quanto tempo — usado para dizer ao cliente quanto a análise costuma demorar.
- `orgao_producao` — 7763 linha(s); Velocidade de julgamento de cada gabinete/órgão (painel Justiça em Números do CNJ), usada para estimar quando o processo do cliente vai ser julgado.

---

## B) Colunas que o app grava e nunca lê, e o contrário

**Como foi apurado.** Primeiro, uma leitura do código levantou 100
candidatas. Depois, cada uma passou por uma verificação mecânica: buscar TODA
menção ao nome da coluna **nos arquivos que falam daquela tabela** e classificar
cada menção como escrita (`coluna:` num corpo de POST/PATCH, atribuição) ou
leitura (`.coluna`, `select=`, filtro `coluna=eq.`, uso em template).

O recorte por tabela importa: procurar o nome solto pelo repositório inteiro
salva colunas mortas por homonímia — a palavra `cidade` aparece no gerador do
portal (a cidade da perícia) e `uf` aparece no importador da fila do INSS, e
nenhuma das duas diz coisa alguma sobre `clientes.cidade`.

Sobreviveu quem continuou sem nenhuma menção do lado negado: **44 de
100**. As outras 56 caíram e estão no fim da seção — saber o
que NÃO é candidato também vale.

**Cuidado com a palavra "nunca escrita".** Não quer dizer vazia: `criado_em`
com `default now()`, sequências e gatilhos do banco preenchem sozinhos. Quer
dizer que **nenhum código do escritório escreve ali** — e isso muda o que
significa apagar a coluna.


### Gravadas e nunca lidas (31)

O sistema escreve e ninguém consulta. São as que mais pesam: custam gravação toda vez e não devolvem nada. Antes de apagar, olhe se a coluna não é o registro de auditoria de algo (quem fez, quando) que um dia será cobrado.

| Coluna | Quem mexe | Preenchida | Onde se procurou | Evidência |
|---|---|---|---|---|
| `andamentos.publico` | app (sempre explicitamente false) e o default do banco | 100.0% (20638) | 8 arquivo(s) que citam a tabela | escrita em crm/fase2/app.html:3445, 3456, 3526, 4298, 4344, 4447, 4609, 4800, 4820, 4853 (`publico:f |
| `andamentos.zap_mensagem_id` | smbot — a função zap_virar_andamento() | 0.0% (0) | 8 arquivo(s) que citam a tabela | crm/fase2/schema.sql:1358 — `insert into andamentos (caso_id, autor_id, texto, origem, zap_mensagem_ |
| `clientes.endereco_legado` | a migração SQL, uma vez só | 0.0% (0) | 8 arquivo(s) que citam a tabela | crm/fase2/schema_f9_cadastro.sql:47-51 — `update clientes set endereco_legado = endereco where ...`; |
| `config_app.atualizado` | a ponte do WhatsApp (crm/fase2/ponte/ponte.js), e só ela | 100.0% (15) | 5 arquivo(s) que citam a tabela | crm/fase2/ponte/ponte.js:63 `body: JSON.stringify({ chave, valor: String(valor), atualizado: agora() |
| `conversas.atendente` | smbot (só smbot_entrada) | — (tabela vazia) | 1 arquivo(s) que citam a tabela | crm/fase2/schema.sql:341/343 `insert into conversas (..., atendente, texto) values (..., p_atendente |
| `conversas.externo_id` | smbot | — (tabela vazia) | 1 arquivo(s) que citam a tabela | crm/fase2/schema.sql:342 (p_externo_id) e schema.sql:453/463 (v_ext). Serve exclusivamente ao `on co |
| `conversas.plataforma` | smbot | — (tabela vazia) | 1 arquivo(s) que citam a tabela | Gravada fixa como 'whatsapp' em crm/fase2/schema.sql:342, 453 e 463. Nunca lida: o select do app (cr |
| `credencial_vis.credencial_id` | app | 100.0% (8) | 1 arquivo(s) que citam a tabela | crm/fase2/app.html:13218 `body:JSON.stringify({credencial_id:id,colaborador_id:eu.id})` (função copi |
| `credencial_vis.visto_em` | ninguém explicitamente — só o default `now()` do banco | 100.0% (8) | 1 arquivo(s) que citam a tabela | crm/fase2/schema.sql:43 `visto_em timestamptz not null default now()`; o POST de crm/fase2/app.html: |
| `crps_segredo.atualizado_em` | gatilho_sql (a função crps_guardar_cracha, disparada pelo app) | 100.0% (1) | 1 arquivo(s) que citam a tabela | crm/fase2/schema.sql:2008-2009 `values (1, p_cracha, now()) on conflict (id) do update set cracha =  |
| `inss_fila.atualizado_em` | crm/inss_fila.py | 100.0% (844) | 1 arquivo(s) que citam a tabela | crm/inss_fila.py:272 `"atualizado_em": hoje`, gravada em crm/inss_fila.py:275. Nunca lida por nada. |
| `inss_fila.dias_p90` | crm/inss_fila.py | 100.0% (844) | 1 arquivo(s) que citam a tabela | crm/inss_fila.py:221 `"dias_p90": pond("dias_p90")`, gravada em crm/inss_fila.py:275. A leitura em c |
| `inss_fila.servico` | crm/inss_fila.py (fora da lista de atores; workflow .github/workflows/inss-fila.yml) | 100.0% (844) | 1 arquivo(s) que citam a tabela | crm/inss_fila.py:271-276 `linhas = [{"servico": s, "uf": uf, **v, "atualizado_em": hoje} ...]` segui |
| `inss_fila.uf` | crm/inss_fila.py | 100.0% (844) | 1 arquivo(s) que citam a tabela | crm/inss_fila.py:272, mesma montagem de `linhas`, gravada em crm/inss_fila.py:275. Sem leitura da ta |
| `leads.atualizado_em` | app e smbot | — (tabela vazia) | 1 arquivo(s) que citam a tabela | crm/fase2/app.html:5450 `atualizado_em:new Date().toISOString()` ao arrastar entre etapas, e crm/fas |
| `lembrar_motivos.seed` | ninguém em tempo de execução — só o seed manual de crm/fase2/schema.sql | 95.5% (21) | 1 arquivo(s) que citam a tabela | crm/fase2/schema.sql:696 `insert into lembrar_motivos (grupo, texto, listas, ordem, seed) values` e  |
| `lembretes.criado_por` | app | 0.0% (0) | 2 arquivo(s) que citam a tabela | crm/fase2/app.html:8682 — `responsavel_id:v("lb-resp")//null, criado_por:eu.id})});` (criarLembrete) |
| `lista_pref.atualizado` | ninguém explicitamente — só o default `now()` do banco, e só na primeira gravação de cada chave | 100.0% (9) | 1 arquivo(s) que citam a tabela | crm/fase2/schema.sql:492 `atualizado timestamptz not null default now()`. Os dois POST do app mandam |
| `orgao_producao.conclusos_julgamento` | crm/cnj_producao.py | 100.0% (7763) | 2 arquivo(s) que citam a tabela | crm/cnj_producao.py:155 `"conclusos_julgamento": int(cj) if cj is not None else None,` (gravado no P |
| `rotinas_feitas.feito_em` | ninguém (só o `default now()` do banco) | — (tabela vazia) | 1 arquivo(s) que citam a tabela | Definida em crm/fase2/schema.sql:575 `feito_em timestamptz not null default now()`. A string `feito_ |
| `sugestoes.decidido_em` | app | 0.0% (0) | 2 arquivo(s) que citam a tabela | crm/fase2/app.html:5264, mesmo corpo do PATCH. Única outra ocorrência no repositório é crm/fase2/sch |
| `sugestoes.decidido_por` | app | 0.0% (0) | 2 arquivo(s) que citam a tabela | crm/fase2/app.html:5264 `body:JSON.stringify({status, decidido_por:eu.id, decidido_em:new Date().toI |
| `zap_conversas.fixada` | ninguem (só o default do CREATE TABLE) | — (tabela vazia) | 3 arquivo(s) que citam a tabela | crm/fase2/schema.sql:920 — `fixada boolean not null default false`. É a ÚNICA ocorrência da palavra  |
| `zap_mensagens.aviso_ref` | smbot (zap_gerar_avisos) | — (tabela vazia) | 2 arquivo(s) que citam a tabela | crm/fase2/schema.sql:1531-1533 — `insert into zap_mensagens (... aviso_chave, aviso_ref) values (v_c |
| `zap_mensagens.enviada_em` | ponte (crm/fase2/ponte/ponte.js) — ator fora da lista | — (tabela vazia) | 2 arquivo(s) que citam a tabela | crm/fase2/ponte/ponte.js:268 — `body: JSON.stringify({ status: "enviada", enviada_em: agora(), ...}) |
| `zap_transferencias.conversa_id` | smbot (zap_transferir) | — (tabela vazia) | **nenhum arquivo fora do banco cita esta tabela** | crm/fase2/schema.sql:1043-1044 — `insert into zap_transferencias (conversa_id, de_id, para_id, motiv |
| `zap_transferencias.de_id` | smbot (zap_transferir) | — (tabela vazia) | **nenhum arquivo fora do banco cita esta tabela** | crm/fase2/schema.sql:1040-1044 — `select atendente_id into v_de from zap_conversas where id = p_conv |
| `zap_transferencias.em` | banco (default now()) | — (tabela vazia) | **nenhum arquivo fora do banco cita esta tabela** | crm/fase2/schema.sql:970 — `em timestamptz not null default now()`. Só é usada pelo índice schema.sq |
| `zap_transferencias.id` | banco (default gen_random_uuid()) | — (tabela vazia) | **nenhum arquivo fora do banco cita esta tabela** | crm/fase2/schema.sql:965 — `id uuid primary key default gen_random_uuid()`; nenhuma consulta busca p |
| `zap_transferencias.motivo` | smbot (zap_transferir), com o texto digitado no app | — (tabela vazia) | **nenhum arquivo fora do banco cita esta tabela** | app.html:5885 — `body:JSON.stringify({p_conversa:zapAberta, p_para:b.dataset.zt, p_motivo:motivo//nu |
| `zap_transferencias.para_id` | smbot (zap_transferir) | — (tabela vazia) | **nenhum arquivo fora do banco cita esta tabela** | crm/fase2/schema.sql:1043-1044 (mesmo insert). Nenhum consumidor: quem quer saber quem atende hoje l |

### Lidas e nunca escritas pelo código (13)

A tela mostra, mas nada no sistema preenche: ou o dado entra à mão pelo SQL (catálogo semeado), ou é campo de recurso que nunca foi ligado.

| Coluna | Quem mexe | Preenchida | Onde se procurou | Evidência |
|---|---|---|---|---|
| `clientes.bairro` | app (documentos do escritório e o alerta do que falta para assinar) | 0.0% (0) | 8 arquivo(s) que citam a tabela | crm/fase2/app.html:12707 — `"<BAIRRO>": v.bairro//lac` (v = civilDe(c)); e app.html:12430 na lista d |
| `clientes.cep` | app (campo <CEP> dos modelos) | 0.0% (0) | 8 arquivo(s) que citam a tabela | crm/fase2/app.html:12708 — `"<CEP>": v.cep//lac`; sem nenhuma escrita |
| `clientes.cidade` | app (preenchimento da procuração/contrato) | 0.0% (0) | 8 arquivo(s) que citam a tabela | crm/fase2/app.html:12707 — `"<CIDADE>": v.cidade//lac`; e app.html:12430. Nenhuma escrita: só a colu |
| `clientes.logradouro` | app (civilDe copia o valor) e a migração SQL, que testa se ele está vazio | 0.0% (0) | 8 arquivo(s) que citam a tabela | crm/fase2/app.html:12417 — `for(const ch of [...,"logradouro","numero","complemento",...]) if(c[ch]) |
| `clientes.uf` | app (campo <ESTADO> dos modelos) | 0.0% (0) | 8 arquivo(s) que citam a tabela | crm/fase2/app.html:12708 — `"<ESTADO>": v.uf//"São Paulo"`; sem nenhum body JSON com `uf` em app.htm |
| `colaboradores.papel` | app | 100.0% (6) | 6 arquivo(s) que citam a tabela | crm/fase2/app.html:1846 `(eu.papel === "admin" ? "administrador" : eu.setor // "equipe")`. Nenhum PA |
| `integracao_token.nome` | smbot | — (tabela vazia) | **nenhum arquivo fora do banco cita esta tabela** | crm/fase2/schema.sql:311 e crm/fase2/schema.sql:415 — sempre no filtro `where nome='smbot'`. Também  |
| `integracao_token.token` | smbot | — (tabela vazia) | **nenhum arquivo fora do banco cita esta tabela** | crm/fase2/schema.sql:311 `if p_token is null or p_token <> (select token from integracao_token where |
| `rotinas.criada_em` | app | — (tabela vazia) | 1 arquivo(s) que citam a tabela | Usada apenas como critério de ordem em crm/fase2/app.html:1912 `todas("rotinas","select=*&ativo=is.t |
| `zap_avisos.sobre` | smbot (zap_gerar_avisos) | 100.0% (8) | 1 arquivo(s) que citam a tabela | crm/fase2/schema.sql:1485 `join eventos e on a.sobre='evento'`, 1499 `a.sobre='cadunico'`, 1509 `a.s |
| `zap_avisos.tipo_ev` | smbot (zap_gerar_avisos) | 62.5% (5) | 1 arquivo(s) que citam a tabela | crm/fase2/schema.sql:1486 — `and (a.tipo_ev is null or e.tipo = a.tipo_ev)`, ou seja, é o que separa |
| `zap_bot_passos.entrega_setor` | gatilho_sql (zap_bot) e app | 77.8% (7) | 1 arquivo(s) que citam a tabela | crm/fase2/schema.sql:1294-1295 — `if p.entrega_setor is not null then perform zap_entregar(new.conve |
| `zap_mensagens.seq` | app e ponte | — (tabela vazia) | 2 arquivo(s) que citam a tabela | app.html:5615 `select=*&conversa_id=eq.${id}&order=seq` e ponte.js:235 `&order=seq&limit=5`. É `bigi |

### Alegações derrubadas na verificação

Foram apresentadas como candidatas e **não são** — há uso de verdade:

- `andamentos_lidos.lido_em` — crm/fase2/app.html:6944: if(a) (a.andamentos_lidos=lidosDe(a)).push({colaborador_id:eu.id, lido_em:agora});
- `aposentadorias.autor_id` — crm/fase2/app.html:1895: todas("andamentos",`select=autor_id,criado_em,caso_id&criado_em=gte.${d30.toISOString()}`),
- `casos.criado_em` — crm/fase2/claude_rotina.py:79: recentes = g(f"/rest/v1/andamentos?criado_em=gte.{corte}"
- `casos.crps_nup` — crm/fase2/app.html:10167: crps_nup: null,
- `casos.revisado_em` — crm/fase2/app.html:8455: const k=D.casoPorId.get(id); if(k) k.revisado_em=hoje();
- `checklist_modelo.beneficio` — crm/fase2/app.html:2740: return { tipo: 'beneficio', especie: porCodigo, beneficio: null,
- `checklist_modelo.itens` — crm/fase2/app.html:3924: const itens = (coleta && coleta.itens) // {};
- `clientes.complemento` — crm/fase2/app.html:10732: ${segBtnHtml(segRegistrar(k.id, (m.nome//"")+(m.complemento?" — "+m.complemento:""), null))}
- `clientes.criado_em` — crm/fase2/claude_rotina.py:79: recentes = g(f"/rest/v1/andamentos?criado_em=gte.{corte}"
- `clientes.numero` — crm/fase2/app.html:3127: `/rest/v1/coletas?select=id,fonte,criado_em,numero:dados->>numero&aplicada_em=is.null&order=criado_em.desc`) /
- `colaboradores.ativo` — crm/fase2/migrar.py:213: "ativo": not t["concluida"],
- `colaboradores.auth_id` — crm/fase2/app.html:1830: const meus = await api(`/rest/v1/colaboradores?auth_id=eq.${sessao.user.id}&select=*`);
- `colaboradores.cor` — crm/fase2/app.html:1932: if(!/^#[0-9a-fA-F]{3,8}$/.test(co.cor//"")) co.cor="#8A9099";
- `colaboradores.inicial` — crm/sync_todo.py:179: "inicial": inicial or "?",
- `colaboradores.nome` — crm/sync_todo.py:144: nome = re.sub(r"#\s*[\d.\-]{11,}", "", titulo or "")
- `conversas.criado_em` — crm/fase2/app.html:1895: todas("andamentos",`select=autor_id,criado_em,caso_id&criado_em=gte.${d30.toISOString()}`),
- `conversas.de_cliente` — crm/fase2/app.html:7181: todas("conversas",`select=criado_em,texto,de_cliente&cliente_id=eq.${cliId}&order=criado_em.desc`).catch(()=>[
- `credenciais.criado_em` — crm/fase2/migrar.py:704: "id": a["id"], "em": a["criado_em"], "texto": a["texto"],
- `credencial_vis.colaborador_id` — crm/fase2/app.html:1900: todas("andamentos",`select=id,caso_id,texto,origem,criado_em,andamentos_lidos(colaborador_id)`
- `documentos_beneficio.beneficio` — crm/fase2/app.html:2740: return { tipo: 'beneficio', especie: porCodigo, beneficio: null,
- `documentos_beneficio.extras` — crm/fase2/app.html:3792: const extras=[];
- `documentos_beneficio.id` — crm/fase2/app.html:1413: <div class="login" id="tela-login">
- `frases_prontas.categoria` — crm/fase2/app.html:5316: <span class="chip neutro">${esc(m.categoria)}</span>
- `inss_calendario.competencia` — crm/fase2/app.html:5956: const ultimaCompetencia = () => (D.inssCal//[]).reduce((m,x)=>x.competencia>m?x.competencia:m,"");
- `inss_calendario.faixa` — crm/fase2/app.html:5947: const faixa = acima ? "acima" : "ate";
- `inss_calendario.final` — crm/fase2/app.html:9614: <label style="font-size:12px;color:var(--cinza)">prazo final: <input type="date" id="ex-prazo"></label>
- `inss_calendario.pagamento` — crm/fase2/app.html:1970: pagamento:"Pagamento", aposentadoria_futura:"Apos. Futura",
- `inss_fila.dias_mediana` — crm/inss_fila.py:238: f"mais de {f['dias_mediana']} dias. É a régua da fila naquele "
- `inss_fila.pendentes` — crm/inss_fila.py:215: total = sum(l["pendentes"] for l in linhas)
- `inss_fila.referencia` — crm/inss_fila.py:221: "dias_p90": pond("dias_p90"), "referencia": linhas[0]["referencia"],
- `leads.criado_em` — crm/fase2/app.html:1895: todas("andamentos",`select=autor_id,criado_em,caso_id&criado_em=gte.${d30.toISOString()}`),
- `leads.motivo_perda` — crm/fase2/app.html:5447: if(l.etapa==="perdido") l.motivo_perda=prompt("Motivo da perda (opcional):")//null;
- `leads.obs` — crm/fase2/app.html:6283: <span>${esc([e.local,e.obs].filter(Boolean).join(" · "))} · ${esc(nomeStatusEvento(e.status))}</span></div>
- `leads.responsavel_id` — crm/fase2/app.html:6987: .filter(r=>!filtroColab // r.responsavel_id===filtroColab // !r.responsavel_id);
- `lembrar_motivos.id` — crm/fase2/app.html:1413: <div class="login" id="tela-login">
- `lembrete_avisos.em` — crm/fase2/app.html:2250: const em=rot.slice(0,i);
- `mencoes.conversa_id` — crm/fase2/app.html:5615: zapMsgs = await todas("zap_mensagens",`select=*&conversa_id=eq.${id}&order=seq`).catch(()=>[]);
- `mencoes.criado_em` — crm/fase2/app.html:1895: todas("andamentos",`select=autor_id,criado_em,caso_id&criado_em=gte.${d30.toISOString()}`),
- `modelos_documento.id` — crm/fase2/app.html:1413: <div class="login" id="tela-login">
- `modelos_mensagem.id` — crm/fase2/claude_rotina.py:91: "id": uid("exig", caso["id"], a["criado_em"][:10]),
- `orgao_producao.atualizado_em` — crm/cnj_producao.py:262: l["atualizado_em"] = hoje
- `orgao_producao.grau` — crm/trf3_ordem.py:344: "&select=orgao,grau,julgados_ano_anterior,"
- `pagamentos.todo_item_id` — crm/fase2/migrar.py:238: pagamentos[pg["todo_item_id"]] = pg
- `rotinas_feitas.colaborador_id` — crm/fase2/app.html:1900: todas("andamentos",`select=id,caso_id,texto,origem,criado_em,andamentos_lidos(colaborador_id)`
- `sugestoes.criado_em` — crm/fase2/claude_rotina.py:79: recentes = g(f"/rest/v1/andamentos?criado_em=gte.{corte}"
- `sugestoes.tipo` — crm/fase2/claude_rotina.py:131: ctx = "audiencia" if "audi" in _sem_acento(e["tipo"]).lower() else "pericia"
- `tarefas.criado_em` — crm/fase2/migrar.py:704: "id": a["id"], "em": a["criado_em"], "texto": a["texto"],
- `zap_avisos.chave` — crm/fase2/app.html:2017: const chave = buscaTxt?"dashboard":visao;
- `zap_avisos.ordem` — crm/fase2/app.html:2417: // Nessa ordem: a 1 e a 2 são a assinatura da decisão; a 3 é o timbre.
- `zap_bot_passos.chave` — crm/fase2/app.html:2017: const chave = buscaTxt?"dashboard":visao;
- `zap_bot_passos.opcoes` — crm/fase2/app.html:1687: async function api(caminho, opcoes={}, tentativa=0){
- `zap_bot_passos.ordem` — crm/fase2/app.html:2417: // Nessa ordem: a 1 e a 2 são a assinatura da decisão; a 3 é o timbre.
- `zap_conversas.chave` — crm/fase2/app.html:2017: const chave = buscaTxt?"dashboard":visao;
- `zap_conversas.criado_em` — crm/fase2/app.html:1895: todas("andamentos",`select=autor_id,criado_em,caso_id&criado_em=gte.${d30.toISOString()}`),
- `zap_conversas.setor` — crm/fase2/app.html:1846: (eu.papel === "admin" ? "administrador" : eu.setor // "equipe");
- `zap_mensagens.criado_em` — crm/fase2/app.html:1895: todas("andamentos",`select=autor_id,criado_em,caso_id&criado_em=gte.${d30.toISOString()}`),

---

## C) `clientes` hoje, campo a campo — e o que a F9 pede

A tabela tem **29 colunas** e **1890 linhas**. Abaixo, o
que existe HOJE no banco, com o quanto está preenchido, para comparar com a
lista da F9.

| Campo | Tipo | Preenchida | Pedido pela F9 | Observação |
|---|---|---|---|---|
| `aposentado` | boolean | 0.1% (1) | — | existe e está pela metade |
| `aposentado_em` | date | 0.1% (1) | — | existe e está pela metade |
| `aposentado_fonte` | text | 0.1% (1) | — | existe e está pela metade |
| `aposentado_prova` | text | 0.0% (0) | — | existe e está zerada |
| `bairro` | text | 0.0% (0) | **sim** — bairro | existe e está zerada |
| `campos` | jsonb | 0.1% (2) | — | existe e está pela metade |
| `cep` | text | 0.0% (0) | **sim** — CEP | existe e está zerada |
| `cidade` | text | 0.0% (0) | **sim** — cidade | existe e está zerada |
| `complemento` | text | 0.0% (0) | **sim** — complemento | existe e está zerada |
| `cpf` | text | 87.1% (1647) | — |  |
| `criado_em` | timestamp with time zone | 100.0% (1890) | — |  |
| `dn` | text | 42.3% (800) | — | existe e está pela metade |
| `endereco` | text | 0.0% (0) | — | existe e está zerada |
| `endereco_legado` | text | 0.0% (0) | — | existe e está zerada |
| `estado_civil` | text | 0.0% (0) | **sim** — estado civil | existe e está zerada |
| `id` | uuid | 100.0% (1890) | — |  |
| `indicado_por` | text | 0.0% (0) | — | existe e está zerada |
| `logradouro` | text | 0.0% (0) | **sim** — logradouro | existe e está zerada |
| `nome` | text | 100.0% (1890) | — |  |
| `nome_mae` | text | 0.0% (0) | **sim** — nome da mãe | existe e está zerada |
| `numero` | text | 0.0% (0) | **sim** — número | existe e está zerada |
| `pis_nit` | text | 0.0% (0) | **sim** — PIS/NIT | existe e está zerada |
| `profissao` | text | 0.0% (0) | **sim** — profissão | existe e está zerada |
| `rg` | text | 0.0% (0) | **sim** — RG | existe e está zerada |
| `rg_orgao` | text | 0.0% (0) | **sim** — órgão emissor do RG | existe e está zerada |
| `sexo` | text | 0.5% (10) | **sim** — sexo | existe e está pela metade |
| `telefone` | text | 29.2% (551) | — | existe e está pela metade |
| `telefones` | jsonb | 29.2% (551) | **sim** — telefones em lista | existe e está pela metade |
| `uf` | text | 0.0% (0) | **sim** — estado (UF) | existe e está zerada |

### O veredicto da comparação

**Todas as 15 colunas que a F9 pede já existem no banco**.
A migração (`crm/fase2/schema_f9_cadastro.sql`) já rodou: o que falta não é
estrutura, é **conteúdo**.

Situação de cada campo da F9:

- **Zeradas (13):** `bairro`, `cep`, `cidade`, `complemento`, `estado_civil`, `logradouro`, `nome_mae`, `numero`, `pis_nit`, `profissao`, `rg`, `rg_orgao`, `uf`
- `telefones`: 29.2% preenchida
- `sexo`: 0.5% preenchida

### O achado que muda a F9.2

`clientes.endereco` — o campo de endereço em texto livre, que a F9.2 iria
migrar para o formato estruturado — está **0.0% (0)**. Não
há endereço nenhum guardado hoje: nem no campo antigo, nem nos novos.

Duas consequências práticas:

1. **Não há legado para migrar.** A parte da F9.2 que trata do "endereço em
   formato antigo, revisar" não tem sobre o que rodar. `endereco_legado`
   também está em 0%, pelo mesmo motivo.
2. **A procuração não sai para ninguém hoje.** Os modelos usam `<ENDERECO>`,
   `<BAIRRO>`, `<CIDADE>`, `<ESTADO>` e `<CEP>` em 9 dos 10 documentos. Com
   todos em 0%, toda peça gerada agora sai com a linha de endereço em branco.

O caminho mais curto para a F12 (geração de documentos) não é código: é o
preenchimento do endereço e do RG dos clientes que estão em atendimento agora.

